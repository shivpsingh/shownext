"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  resolveTargetRing,
  type ScreenAnalysis,
  type StepFeedbackPayload,
  type WebTryPhase,
} from "../lib/webTry";
import { SENSITIVE_ACTION_WARNING } from "../lib/sensitiveAction";
import { ACCEPT_ATTRIBUTE, validateUploadImage } from "../lib/validateUploadImage";
import { LogoMark } from "./LogoMark";
import { AIActionCard } from "./AIActionCard";
import { StepFeedback } from "./StepFeedback";

export type WebTryErrorVariant = "generic" | "limit" | "unavailable";

type WebTryExperienceProps = {
  phase: WebTryPhase;
  previewUrl: string | null;
  analysis: ScreenAnalysis | null;
  errorMessage: string | null;
  clarificationInput: string;
  userContext: string;
  onClose: () => void;
  onPhotoReady: (blob: Blob) => void;
  onRetake: () => void;
  onAnalyze: () => void;
  onClarificationInputChange: (value: string) => void;
  onUserContextChange: (value: string) => void;
  onClarificationSubmit: () => void;
  feedbackSubmitted: boolean;
  onFeedbackSubmit: (payload: StepFeedbackPayload) => void;
  errorVariant?: WebTryErrorVariant;
  onJoinWaitlist?: () => void;
};

type SpeechRecognitionErrorEvent = {
  error: string;
  message?: string;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
};

type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: { transcript: string };
};

function getSpeechRecognition(): SpeechRecognitionInstance | null {
  if (typeof window === "undefined") return null;
  const win = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  const Ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function speechErrorMessage(error: string): string {
  switch (error) {
    case "not-allowed":
      return "Microphone access was blocked. Allow the mic in your browser settings to dictate.";
    case "no-speech":
      return "No speech detected. Try speaking again.";
    case "audio-capture":
      return "Could not access the microphone.";
    case "network":
      return "Dictation needs a network connection in this browser.";
    case "aborted":
      return "";
    default:
      return "Dictation stopped. Tap the mic to try again.";
  }
}

async function blobFromCanvas(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Could not capture photo."));
    }, "image/jpeg", quality);
  });
}

const ANALYZING_STATUS_LINES = [
  "Reading the screen",
  "Finding the buttons",
  "Working out the next tap",
] as const;

const STATUS_ROTATION_MS = 2500;
const LONG_WAIT_MS = 45000;

const ERROR_EYEBROW: Record<WebTryErrorVariant, string> = {
  generic: "Something went wrong",
  limit: "Demo limit reached",
  unavailable: "Demo unavailable",
};

const ERROR_HEADING: Record<WebTryErrorVariant, string> = {
  generic: "Could not analyze that screen",
  limit: "Join the waitlist for more",
  unavailable: "Join the waitlist for access",
};

function ResultScreenshot({
  previewUrl,
  analysis,
}: {
  previewUrl: string;
  analysis: ScreenAnalysis;
}) {
  const ring = resolveTargetRing(analysis);
  return (
    <div className="web-try-result-image">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={previewUrl} alt="Captured screen" />
      {ring ? (
        <div
          className="web-try-target-ring"
          style={{
            left: `${ring.x * 100}%`,
            top: `${ring.y * 100}%`,
            width: `${ring.width * 100}%`,
            height: `${ring.height * 100}%`,
          }}
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
const FULL_PAGE_PHASES: WebTryPhase[] = [
  "camera",
  "preview",
  "uploading",
  "analyzing",
  "result",
  "clarification",
  "error",
];

export function WebTryExperience({
  phase,
  previewUrl,
  analysis,
  errorMessage,
  clarificationInput,
  userContext,
  onClose,
  onPhotoReady,
  onRetake,
  onAnalyze,
  onClarificationInputChange,
  onUserContextChange,
  onClarificationSubmit,
  feedbackSubmitted,
  onFeedbackSubmit,
  errorVariant = "generic",
  onJoinWaitlist,
}: WebTryExperienceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const dictationBaseRef = useRef("");
  const onUserContextChangeRef = useRef(onUserContextChange);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [startingCamera, setStartingCamera] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [analyzingStatusIndex, setAnalyzingStatusIndex] = useState(0);
  const [analyzingLongWait, setAnalyzingLongWait] = useState(false);

  onUserContextChangeRef.current = onUserContextChange;

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera is not available in this browser.");
      return;
    }

    setStartingCamera(true);
    setCameraError(null);

    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
    } catch {
      setCameraError("Camera access was blocked. Upload a photo of the screen instead.");
    } finally {
      setStartingCamera(false);
    }
  }, [stopStream]);

  useEffect(() => {
    if (phase !== "analyzing") {
      setAnalyzingStatusIndex(0);
      setAnalyzingLongWait(false);
      return;
    }

    const rotationId = window.setInterval(() => {
      setAnalyzingStatusIndex((index) => (index + 1) % ANALYZING_STATUS_LINES.length);
    }, STATUS_ROTATION_MS);

    const longWaitId = window.setTimeout(() => {
      setAnalyzingLongWait(true);
    }, LONG_WAIT_MS);

    return () => {
      window.clearInterval(rotationId);
      window.clearTimeout(longWaitId);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "camera") {
      stopStream();
      return;
    }

    void startCamera();
    return () => {
      stopStream();
    };
  }, [phase, startCamera, stopStream]);

  useEffect(() => () => stopStream(), [stopStream]);

  useEffect(() => {
    const recognition = getSpeechRecognition();
    if (!recognition) return;

    setSpeechSupported(true);
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechError(null);
    };

    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";
        if (result.isFinal) {
          dictationBaseRef.current += transcript;
        } else {
          interimText += transcript;
        }
      }
      const combined = `${dictationBaseRef.current}${interimText}`.trim();
      onUserContextChangeRef.current(combined);
    };

    recognition.onend = () => setIsListening(false);

    recognition.onerror = (event) => {
      setIsListening(false);
      const message = speechErrorMessage(event.error);
      if (message) setSpeechError(message);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (phase !== "camera" && phase !== "preview") {
      stopListening();
    }
  }, [phase, stopListening]);

  const toggleListening = async () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setSpeechError("Dictation is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    setSpeechError(null);
    dictationBaseRef.current = userContext.trim() ? `${userContext.trim()} ` : "";

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch {
        setSpeechError("Microphone access was blocked. Allow the mic to dictate in English.");
        return;
      }
    }

    try {
      recognition.start();
    } catch {
      setSpeechError("Could not start dictation. Tap the mic to try again.");
      setIsListening(false);
    }
  };

  const takePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0);
    const blob = await blobFromCanvas(canvas);
    stopStream();
    onPhotoReady(blob);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validation = await validateUploadImage(file);
    if (!validation.ok) {
      setCameraError(validation.message);
      return;
    }

    stopStream();
    setCameraError(null);
    onPhotoReady(file);
  };

  if (!FULL_PAGE_PHASES.includes(phase)) return null;

  const splitView = ["uploading", "analyzing", "clarification", "error"].includes(phase);
  // An error can arrive before any photo exists, so the panel renders alone then.
  const panelView = splitView && (previewUrl || phase === "error");
  const twoColumn = splitView && Boolean(previewUrl);
  const resultView = phase === "result" && previewUrl && analysis;
  // A canned refusal carries no learning signal, and the goal behind it must
  // never be persisted, so the prompt is withheld for those answers.
  const showFeedback = Boolean(analysis) && analysis?.warning !== SENSITIVE_ACTION_WARNING;
  const showPreview = phase === "preview" && previewUrl;

  return (
    <motion.div
      className="web-try-page"
      role="dialog"
      aria-modal="true"
      aria-label="Try ShowNext from the web"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="web-try-page__header shell">
        <div className="web-try-page__brand">
          <LogoMark size={32} />
          <span>ShowNext</span>
        </div>
        <button className="web-try-page__close" type="button" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      <div
        className={`web-try-page__body shell ${twoColumn ? "web-try-page__body--split" : ""} ${resultView ? "web-try-page__body--result" : ""}`}
      >
        {resultView ? (
          <motion.div
            className="web-try-page__result-full"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="web-try-result__card-slot">
              <AIActionCard analysis={analysis} />
              {showFeedback ? (
                <StepFeedback submitted={feedbackSubmitted} onSubmit={onFeedbackSubmit} />
              ) : null}
            </div>
            <ResultScreenshot previewUrl={previewUrl} analysis={analysis} />
          </motion.div>
        ) : panelView ? (
          <>
            {previewUrl ? (
              <motion.div
                className="web-try-page__photo"
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Captured screen" />
              </motion.div>
            ) : null}
            <motion.div
              className="web-try-page__result"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
            >
              {phase === "uploading" && (
                <>
                  <p className="web-try-page__eyebrow">Uploading</p>
                  <h2>Sending your photo…</h2>
                  <p className="web-try-page__lede">
                    Used only for this try. Deleted when you close, or within an hour.
                  </p>
                </>
              )}

              {phase === "analyzing" && (
                <>
                  <p className="web-try-page__eyebrow">Analyzing</p>
                  <h2>Finding the next tap…</h2>
                  <p className="web-try-page__timing">Usually takes 10 to 30 seconds</p>
                  <p className="web-try-page__status" role="status" aria-live="polite">
                    {analyzingLongWait
                      ? "Still working, one moment"
                      : ANALYZING_STATUS_LINES[analyzingStatusIndex]}
                  </p>
                  <div className="web-try-spinner" aria-hidden="true" />
                </>
              )}

              {phase === "clarification" && analysis && (
                <>
                  <p className="web-try-page__eyebrow">Quick question</p>
                  <h2>{analysis.instruction}</h2>
                  <label className="web-try-clarify-label" htmlFor="webTryClarify">
                    Your answer
                  </label>
                  <input
                    id="webTryClarify"
                    className="web-try-clarify-input"
                    value={clarificationInput}
                    onChange={(event) => onClarificationInputChange(event.target.value)}
                    placeholder="Tell ShowNext what you are trying to do"
                  />
                  <button className="hero-cta web-try-clarify-submit" type="button" onClick={onClarificationSubmit}>
                    Continue
                  </button>
                </>
              )}

              {phase === "error" && (
                <>
                  <p className="web-try-page__eyebrow">{ERROR_EYEBROW[errorVariant]}</p>
                  <h2>{ERROR_HEADING[errorVariant]}</h2>
                  <p className="web-try-page__lede">
                    {errorMessage ?? "Try again with a clearer photo."}
                  </p>
                  {errorVariant !== "generic" ? (
                    <button className="hero-cta" type="button" onClick={onJoinWaitlist ?? onClose}>
                      Join the waitlist
                    </button>
                  ) : (
                    <button className="hero-cta" type="button" onClick={onRetake}>
                      Try another photo
                    </button>
                  )}
                </>
              )}
            </motion.div>
          </>
        ) : (
          <div className="web-try-page__capture">
            <div className="web-try-page__intro">
              <p className="web-try-page__eyebrow">Try from the web</p>
              <h2>Screenshot simulation</h2>
              <p className="web-try-page__lede">
                Upload a screenshot to preview the guidance.
              </p>
            </div>

            {cameraError && <p className="web-try-page__error">{cameraError}</p>}

            {showPreview ? (
              <div className="web-try-page__frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="web-try-page__preview" src={previewUrl} alt="Captured screen preview" />
              </div>
            ) : (
              <div className="web-try-page__input-card">
                <button
                  className="web-try-page__input-option"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Upload</span>
                </button>
                <div className="web-try-page__input-divider" />
                <button
                  className="web-try-page__input-option"
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Camera</span>
                </button>
              </div>
            )}

            <video ref={videoRef} className="sr-only" playsInline muted aria-hidden="true" />

            <div className="web-try-page__context">
              <div className="web-try-context-field">
                <textarea
                  id="webTryContext"
                  className="web-try-page__control web-try-context-input"
                  value={userContext}
                  onChange={(event) => {
                    if (isListening) stopListening();
                    setSpeechError(null);
                    onUserContextChange(event.target.value);
                  }}
                  placeholder="Describe what you want to do — e.g. 'Turn on the washing machine' or 'Go to settings'"
                  aria-label="Describe what you want to do (required)"
                  rows={3}
                />
                <button
                  className={`web-try-context-mic ${isListening ? "web-try-context-mic--active" : ""}`}
                  type="button"
                  onClick={() => void toggleListening()}
                  aria-label={
                    isListening
                      ? "Stop dictation"
                      : speechSupported
                        ? "Dictate in English"
                        : "Dictation not supported in this browser"
                  }
                  aria-pressed={isListening}
                  disabled={!speechSupported}
                  title={speechSupported ? "Speak in English" : "Use Chrome or Edge for dictation"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19 11a7 7 0 0 1-14 0M12 18v3"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              {isListening ? (
                <p className="web-try-context-status web-try-context-status--listening" role="status">
                  Listening… speak in English
                </p>
              ) : null}
              {speechError ? (
                <p className="web-try-context-status web-try-context-status--error" role="alert">
                  {speechError}
                </p>
              ) : null}
            </div>

            <div className="web-try-page__actions">
              {showPreview ? (
                <>
                  <button className="web-try-page__control web-try-page__primary" type="button" onClick={onAnalyze} disabled={!userContext.trim()}>
                    Analyze
                  </button>
                  <button className="web-try-page__control web-try-page__secondary" type="button" onClick={onRetake}>
                    Retake
                  </button>
                </>
              ) : (
                <button
                  className="web-try-page__control web-try-page__primary"
                  type="button"
                  onClick={onAnalyze}
                  disabled={!userContext.trim()}
                >
                  Go
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              onChange={(event) => void handleFileChange(event)}
            />
            <input
              ref={cameraInputRef}
              className="sr-only"
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              capture="environment"
              onChange={(event) => void handleFileChange(event)}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
