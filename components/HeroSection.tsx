"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Id } from "../convex/_generated/dataModel";
import { useAnalyzeScreen } from "../lib/useAnalyzeScreen";
import { scrollToWaitlist } from "../lib/scrollToWaitlist";
import { isUnsafeGoal, sensitiveActionResult } from "../lib/sensitiveAction";
import {
  TRY_LIMIT_REACHED,
  DAILY_CAPACITY_REACHED,
  IP_RATE_LIMITED,
  useWebTryQuota,
} from "../lib/useWebTryQuota";
import { api } from "../convex/_generated/api";
import { useMutation } from "convex/react";
import { getBrowserId } from "../lib/browserId";
import {
  getDeviceType,
  type DemoMode,
  type ScreenAnalysis,
  type StepFeedbackPayload,
  type WebTryPhase,
} from "../lib/webTry";
import { PhoneDemo } from "./PhoneDemo";
import { WebTryExperience, type WebTryErrorVariant } from "./WebTryExperience";

const fadeEase = [0.22, 1, 0.36, 1] as const;

const CAPTURE_TYPE = "screenshot";

type HeroSectionViewProps = {
  demoMode: DemoMode;
  webTryPhase: WebTryPhase;
  previewUrl: string | null;
  analysis: ScreenAnalysis | null;
  errorMessage: string | null;
  clarificationInput: string;
  userContext: string;
  onClarificationInputChange: (value: string) => void;
  onUserContextChange: (value: string) => void;
  onClarificationSubmit: () => void;
  feedbackSubmitted: boolean;
  onFeedbackSubmit: (payload: StepFeedbackPayload) => void;
  onStartWebTry: () => void;
  onExitWebTry: () => void;
  onPhotoReady: (blob: Blob) => void;
  onRetake: () => void;
  onAnalyze: () => void;
  tryRemaining?: number;
  tryLimit?: number;
  quotaReady?: boolean;
  errorVariant?: WebTryErrorVariant;
  onJoinWaitlist?: () => void;
};

function HeroSectionView({
  demoMode,
  webTryPhase,
  previewUrl,
  analysis,
  errorMessage,
  clarificationInput,
  userContext,
  onClarificationInputChange,
  onUserContextChange,
  onClarificationSubmit,
  feedbackSubmitted,
  onFeedbackSubmit,
  onStartWebTry,
  onExitWebTry,
  onPhotoReady,
  onRetake,
  onAnalyze,
  tryRemaining,
  tryLimit,
  quotaReady = false,
  errorVariant = "generic",
  onJoinWaitlist,
}: HeroSectionViewProps) {
  const webTryActive = demoMode === "webTry";
  const showFullPage = webTryActive && webTryPhase !== "idle";
  const atTryLimit = quotaReady && tryRemaining === 0;
  const ctaLabel = atTryLimit ? "Join the waitlist" : "Try now";

  return (
    <section className={`hero-stage ${webTryActive ? "hero-stage--web-try" : ""}`} id="top">
      <div className="stage shell">
        <motion.div
          className={`hero-copy ${webTryActive ? "hero-copy--dimmed" : ""}`}
          animate={{ opacity: showFullPage ? 0 : webTryActive ? 0.45 : 1 }}
          transition={{ duration: 0.35 }}
        >
          <motion.h1
            className="hero-headline"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: webTryActive ? 0 : 1, y: 0 }}
            transition={{ duration: 0.35, ease: fadeEase }}
          >
            Show your parent exactly what to tap.
          </motion.h1>
          <motion.p
            className="hero-tagline"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: webTryActive ? 0 : 1, y: 0 }}
            transition={{ duration: 0.35, ease: fadeEase, delay: webTryActive ? 0 : 0.1 }}
          >
            When they get stuck on their phone and you are not there.
          </motion.p>
          {!webTryActive && (
            <>
              <motion.button
                className="hero-cta"
                type="button"
                onClick={onStartWebTry}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: fadeEase, delay: 0.18 }}
              >
                {ctaLabel}
              </motion.button>
              {quotaReady && tryRemaining !== undefined && tryLimit !== undefined && tryRemaining > 0 ? (
                <motion.p
                  className="hero-note hero-try-quota"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35, delay: 0.24 }}
                >
                  {tryRemaining} of {tryLimit} free tries left
                </motion.p>
              ) : null}
            </>
          )}
        </motion.div>

        <motion.div
          className="phone-stage"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: showFullPage ? 0 : 1, y: 0 }}
          transition={{ duration: showFullPage ? 0.35 : 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <PhoneDemo demoMode={demoMode} />
        </motion.div>
      </div>

      <AnimatePresence>
        {showFullPage && (
          <WebTryExperience
            phase={webTryPhase}
            previewUrl={previewUrl}
            analysis={analysis}
            errorMessage={errorMessage}
            clarificationInput={clarificationInput}
            userContext={userContext}
            errorVariant={errorVariant}
            onClose={onExitWebTry}
            onPhotoReady={onPhotoReady}
            onRetake={onRetake}
            onAnalyze={onAnalyze}
            onClarificationInputChange={onClarificationInputChange}
            onUserContextChange={onUserContextChange}
            onClarificationSubmit={onClarificationSubmit}
            feedbackSubmitted={feedbackSubmitted}
            onFeedbackSubmit={onFeedbackSubmit}
            onJoinWaitlist={onJoinWaitlist}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function useWebTrySession() {
  const [demoMode, setDemoMode] = useState<DemoMode>("apk");
  const [webTryPhase, setWebTryPhase] = useState<WebTryPhase>("idle");
  const [analysis, setAnalysis] = useState<ScreenAnalysis | null>(null);
  const [storageId, setStorageId] = useState<Id<"_storage"> | null>(null);
  const [clarificationCount, setClarificationCount] = useState(0);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clarificationInput, setClarificationInput] = useState("");
  const [userContext, setUserContext] = useState("");
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const clearPreview = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    setPreviewBlob(null);
  }, []);

  const resetWebTry = useCallback(() => {
    setDemoMode("apk");
    setWebTryPhase("idle");
    setAnalysis(null);
    setStorageId(null);
    setClarificationCount(0);
    setFeedbackSubmitted(false);
    setErrorMessage(null);
    setClarificationInput("");
    setUserContext("");
    clearPreview();
    document.body.classList.remove("web-try-active");
  }, [clearPreview]);

  useEffect(() => {
    return () => {
      document.body.classList.remove("web-try-active");
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const startWebTry = useCallback(() => {
    setDemoMode("webTry");
    setWebTryPhase("camera");
    setAnalysis(null);
    setStorageId(null);
    setClarificationCount(0);
    setFeedbackSubmitted(false);
    setErrorMessage(null);
    setClarificationInput("");
    setUserContext("");
    clearPreview();
    document.body.classList.add("web-try-active");
  }, [clearPreview]);

  const handlePhotoReady = useCallback(
    (blob: Blob) => {
      clearPreview();
      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      setPreviewBlob(blob);
      setPreviewUrl(url);
      setWebTryPhase("preview");
    },
    [clearPreview],
  );

  const handleRetake = useCallback(() => {
    clearPreview();
    setAnalysis(null);
    setFeedbackSubmitted(false);
    setErrorMessage(null);
    setWebTryPhase("camera");
  }, [clearPreview]);

  return {
    demoMode,
    webTryPhase,
    analysis,
    storageId,
    clarificationCount,
    feedbackSubmitted,
    errorMessage,
    clarificationInput,
    userContext,
    previewBlob,
    previewUrl,
    setWebTryPhase,
    setAnalysis,
    setStorageId,
    setClarificationCount,
    setFeedbackSubmitted,
    setErrorMessage,
    setClarificationInput,
    setUserContext,
    resetWebTry,
    startWebTry,
    handlePhotoReady,
    handleRetake,
  };
}

function HeroSectionLocal() {
  const session = useWebTrySession();

  const handleAnalyze = () => {
    session.setErrorMessage("Add NEXT_PUBLIC_CONVEX_URL to .env.local and run npx convex dev to enable web try.");
    session.setWebTryPhase("error");
  };

  return (
    <HeroSectionView
      demoMode={session.demoMode}
      webTryPhase={session.webTryPhase}
      previewUrl={session.previewUrl}
      analysis={session.analysis}
      errorMessage={session.errorMessage}
      clarificationInput={session.clarificationInput}
      userContext={session.userContext}
      onClarificationInputChange={session.setClarificationInput}
      onUserContextChange={session.setUserContext}
      onClarificationSubmit={() => undefined}
      feedbackSubmitted={session.feedbackSubmitted}
      onFeedbackSubmit={() => undefined}
      onStartWebTry={session.startWebTry}
      onExitWebTry={session.resetWebTry}
      onPhotoReady={session.handlePhotoReady}
      onRetake={session.handleRetake}
      onAnalyze={handleAnalyze}
    />
  );
}

function HeroSectionConnected() {
  const session = useWebTrySession();
  const { uploadAndAnalyze, analyzeExisting, discardUpload, maxClarificationRounds } =
    useAnalyzeScreen();
  const { remaining, limit, status: quotaStatus, refresh } = useWebTryQuota();
  const submitFeedback = useMutation(api.feedback.submitFeedback);
  const [errorVariant, setErrorVariant] = useState<WebTryErrorVariant>("generic");
  // Discarding before an in-flight feedback write commits would delete a
  // screenshot the visitor just consented to keep.
  const feedbackPendingRef = useRef<Promise<unknown> | null>(null);

  // Closing the demo deletes the screenshot, which is what the upload copy promises.
  const handleExitWebTry = useCallback(() => {
    const storageId = session.storageId;
    const pending = feedbackPendingRef.current;
    if (storageId) {
      void (async () => {
        if (pending) await pending.catch(() => undefined);
        await discardUpload(storageId);
      })();
    }
    feedbackPendingRef.current = null;
    session.resetWebTry();
  }, [discardUpload, session]);

  const handleJoinWaitlist = useCallback(() => {
    handleExitWebTry();
    scrollToWaitlist();
  }, [handleExitWebTry]);

  const handleStartWebTry = useCallback(async () => {
    const quota = await refresh();

    if (quota.status === "unavailable") {
      setErrorVariant("unavailable");
      session.startWebTry();
      session.setErrorMessage(
        "The demo is unavailable right now. Join the waitlist and I will send you access.",
      );
      session.setWebTryPhase("error");
      return;
    }

    if (quota.remaining <= 0) {
      scrollToWaitlist();
      return;
    }

    setErrorVariant("generic");
    session.startWebTry();
  }, [refresh, session]);

  const handleAnalyze = async () => {
    if (!session.previewBlob) return;

    // Refuse before the screenshot leaves the device. Convex repeats the check,
    // since this one can be bypassed.
    if (isUnsafeGoal(session.userContext)) {
      session.setAnalysis(sensitiveActionResult());
      session.setErrorMessage(null);
      session.setWebTryPhase("result");
      return;
    }

    session.setWebTryPhase("uploading");
    session.setErrorMessage(null);
    session.setFeedbackSubmitted(false);
    setErrorVariant("generic");

    try {
      session.setWebTryPhase("analyzing");
      const result = await uploadAndAnalyze(
        session.previewBlob,
        session.userContext.trim() || undefined,
        CAPTURE_TYPE,
      );
      session.setStorageId(result.storageId);
      session.setAnalysis(result.analysis);
      session.setWebTryPhase(result.analysis.needsClarification ? "clarification" : "result");
      void refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis failed.";
      if (
        message === TRY_LIMIT_REACHED ||
        message === DAILY_CAPACITY_REACHED ||
        message === IP_RATE_LIMITED
      ) {
        setErrorVariant("limit");
        if (message === DAILY_CAPACITY_REACHED) {
          session.setErrorMessage(
            "Demo is at capacity for today. Join the waitlist and I will send you access.",
          );
        } else {
          session.setErrorMessage(
            "You have used your free tries. Join the waitlist and I will send you access.",
          );
        }
      } else {
        session.setErrorMessage(message);
      }
      session.setWebTryPhase("error");
      void refresh();
    }
  };

  const handleFeedbackSubmit = useCallback(
    (payload: StepFeedbackPayload) => {
      const { storageId, analysis } = session;
      if (!storageId || !analysis) return;

      // Optimistic: a failed write must never surface an error over a good answer.
      session.setFeedbackSubmitted(true);

      const goal = session.userContext.trim();
      const promise = submitFeedback({
        storageId,
        browserId: getBrowserId(),
        consent: payload.consent,
        outcome: payload.outcome,
        ...(payload.failureReason ? { failureReason: payload.failureReason } : {}),
        ...(payload.userCorrection ? { userCorrection: payload.userCorrection } : {}),
        ...(payload.consent && goal ? { userGoal: goal } : {}),
        screenSummary: analysis.screenSummary,
        label: analysis.label,
        instruction: analysis.instruction,
        ...(analysis.box ? { box: analysis.box } : {}),
        confidence: analysis.confidence,
        clarificationRound: session.clarificationCount,
        deviceType: getDeviceType(),
        captureType: CAPTURE_TYPE,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }).catch(() => undefined);

      feedbackPendingRef.current = promise;
    },
    [session, submitFeedback],
  );

  const handleClarificationSubmit = async () => {
    if (!session.storageId || !session.clarificationInput.trim()) return;
    if (session.clarificationCount >= maxClarificationRounds) return;

    if (isUnsafeGoal(session.clarificationInput)) {
      session.setAnalysis(sensitiveActionResult());
      session.setClarificationInput("");
      session.setWebTryPhase("result");
      return;
    }

    session.setWebTryPhase("analyzing");
    session.setErrorMessage(null);
    session.setFeedbackSubmitted(false);

    try {
      const result = await analyzeExisting(session.storageId, session.clarificationInput.trim());
      session.setClarificationCount((count) => count + 1);
      session.setAnalysis(result.analysis);
      session.setClarificationInput("");

      const canClarifyAgain = result.analysis.needsClarification && session.clarificationCount + 1 < maxClarificationRounds;
      session.setWebTryPhase(canClarifyAgain ? "clarification" : "result");
    } catch (error) {
      session.setErrorMessage(error instanceof Error ? error.message : "Analysis failed.");
      session.setWebTryPhase("error");
    }
  };

  return (
    <HeroSectionView
      demoMode={session.demoMode}
      webTryPhase={session.webTryPhase}
      previewUrl={session.previewUrl}
      analysis={session.analysis}
      errorMessage={session.errorMessage}
      clarificationInput={session.clarificationInput}
      userContext={session.userContext}
      onClarificationInputChange={session.setClarificationInput}
      onUserContextChange={session.setUserContext}
      onClarificationSubmit={() => void handleClarificationSubmit()}
      feedbackSubmitted={session.feedbackSubmitted}
      onFeedbackSubmit={handleFeedbackSubmit}
      onStartWebTry={() => void handleStartWebTry()}
      onExitWebTry={handleExitWebTry}
      onPhotoReady={session.handlePhotoReady}
      onRetake={session.handleRetake}
      onAnalyze={() => void handleAnalyze()}
      tryRemaining={remaining}
      tryLimit={limit}
      quotaReady={quotaStatus === "ready"}
      errorVariant={errorVariant}
      onJoinWaitlist={handleJoinWaitlist}
    />
  );
}

export function HeroSection() {
  if (process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <HeroSectionConnected />;
  }

  return <HeroSectionLocal />;
}
