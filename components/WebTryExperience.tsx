"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ScreenAnalysis, WebTryPhase } from "../lib/webTry";
import { LogoMark } from "./LogoMark";

type WebTryExperienceProps = {
  phase: WebTryPhase;
  previewUrl: string | null;
  analysis: ScreenAnalysis | null;
  errorMessage: string | null;
  clarificationInput: string;
  onClose: () => void;
  onPhotoReady: (blob: Blob) => void;
  onRetake: () => void;
  onAnalyze: () => void;
  onClarificationInputChange: (value: string) => void;
  onClarificationSubmit: () => void;
};

async function blobFromCanvas(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("Could not capture photo."));
    }, "image/jpeg", quality);
  });
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
  onClose,
  onPhotoReady,
  onRetake,
  onAnalyze,
  onClarificationInputChange,
  onClarificationSubmit,
}: WebTryExperienceProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [startingCamera, setStartingCamera] = useState(false);

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
    if (file.size > 4 * 1024 * 1024) {
      setCameraError("Choose a photo under 4 MB.");
      return;
    }

    stopStream();
    setCameraError(null);
    onPhotoReady(file);
  };

  if (!FULL_PAGE_PHASES.includes(phase)) return null;

  const splitView = ["uploading", "analyzing", "result", "clarification", "error"].includes(phase);
  const showPreview = phase === "preview" && previewUrl;

  return (
    <motion.div
      className="web-try-page"
      role="dialog"
      aria-modal="true"
      aria-label="Try ShowNext from the web"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
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

      <div className={`web-try-page__body shell ${splitView ? "web-try-page__body--split" : ""}`}>
        {splitView && previewUrl ? (
          <>
            <motion.div
              className="web-try-page__photo"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Captured screen" />
            </motion.div>
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
                  <p className="web-try-page__lede">One-time analysis — nothing is saved after this session.</p>
                </>
              )}

              {phase === "analyzing" && (
                <>
                  <p className="web-try-page__eyebrow">Analyzing</p>
                  <h2>Finding the next tap…</h2>
                  <p className="web-try-page__lede">Looking at what is visible on the screen.</p>
                  <div className="web-try-spinner" aria-hidden="true" />
                </>
              )}

              {phase === "result" && analysis && (
                <>
                  <p className="web-try-page__eyebrow">Your next step</p>
                  <h2>{analysis.screenSummary}</h2>
                  {analysis.warning && <p className="web-try-page__warning">{analysis.warning}</p>}
                  <div className="web-try-page__step">
                    {analysis.nextStep}
                    {analysis.location ? <> Look {analysis.location}.</> : null}
                  </div>
                </>
              )}

              {phase === "clarification" && analysis && (
                <>
                  <p className="web-try-page__eyebrow">Quick question</p>
                  <h2>{analysis.nextStep}</h2>
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
                  <p className="web-try-page__eyebrow">Something went wrong</p>
                  <h2>Could not analyze that screen</h2>
                  <p className="web-try-page__lede">{errorMessage ?? "Try again with a clearer photo."}</p>
                  <button className="hero-cta" type="button" onClick={onRetake}>
                    Try another photo
                  </button>
                </>
              )}
            </motion.div>
          </>
        ) : (
          <div className="web-try-page__capture">
            <div className="web-try-page__intro">
              <p className="web-try-page__eyebrow">Try from the web</p>
              <h2>Photograph the stuck screen</h2>
              <p className="web-try-page__lede">
                Point your camera at the phone or tablet. The photo is analyzed once and not saved.
              </p>
            </div>

            {cameraError && <p className="web-try-page__error">{cameraError}</p>}

            <div className="web-try-page__frame">
              {showPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="web-try-page__preview" src={previewUrl} alt="Captured screen preview" />
              ) : (
                <>
                  <video ref={videoRef} className="web-try-page__video" playsInline muted aria-label="Camera preview" />
                  {startingCamera && <p className="web-try-page__hint">Starting camera…</p>}
                </>
              )}
            </div>

            <div className="web-try-page__actions">
              {showPreview ? (
                <>
                  <button className="hero-cta" type="button" onClick={onAnalyze}>
                    Analyze
                  </button>
                  <button className="web-try-page__secondary" type="button" onClick={onRetake}>
                    Retake
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="hero-cta"
                    type="button"
                    onClick={() => void takePhoto()}
                    disabled={startingCamera || Boolean(cameraError)}
                  >
                    Take photo
                  </button>
                  <button className="web-try-page__secondary" type="button" onClick={() => fileInputRef.current?.click()}>
                    Upload photo instead
                  </button>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              className="sr-only"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => void handleFileChange(event)}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
