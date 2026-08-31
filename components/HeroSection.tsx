"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Id } from "../convex/_generated/dataModel";
import { useAnalyzeScreen } from "../lib/useAnalyzeScreen";
import { scrollToWaitlist } from "../lib/scrollToWaitlist";
import { TRY_LIMIT_REACHED, useWebTryQuota } from "../lib/useWebTryQuota";
import type { DemoMode, ScreenAnalysis, WebTryPhase } from "../lib/webTry";
import { PhoneDemo } from "./PhoneDemo";
import { WebTryExperience } from "./WebTryExperience";

const fadeEase = [0.22, 1, 0.36, 1] as const;

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
  onStartWebTry: () => void;
  onExitWebTry: () => void;
  onPhotoReady: (blob: Blob) => void;
  onRetake: () => void;
  onAnalyze: () => void;
  tryRemaining?: number;
  tryLimit?: number;
  limitExhausted?: boolean;
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
  onStartWebTry,
  onExitWebTry,
  onPhotoReady,
  onRetake,
  onAnalyze,
  tryRemaining,
  tryLimit,
  limitExhausted,
  onJoinWaitlist,
}: HeroSectionViewProps) {
  const webTryActive = demoMode === "webTry";
  const showFullPage = webTryActive && webTryPhase !== "idle";
  const atTryLimit = tryRemaining === 0;
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
              {tryRemaining !== undefined && tryLimit !== undefined && tryRemaining > 0 ? (
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
            limitExhausted={limitExhausted}
            onClose={onExitWebTry}
            onPhotoReady={onPhotoReady}
            onRetake={onRetake}
            onAnalyze={onAnalyze}
            onClarificationInputChange={onClarificationInputChange}
            onUserContextChange={onUserContextChange}
            onClarificationSubmit={onClarificationSubmit}
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
    setErrorMessage(null);
    setWebTryPhase("camera");
  }, [clearPreview]);

  return {
    demoMode,
    webTryPhase,
    analysis,
    storageId,
    clarificationCount,
    errorMessage,
    clarificationInput,
    userContext,
    previewBlob,
    previewUrl,
    setWebTryPhase,
    setAnalysis,
    setStorageId,
    setClarificationCount,
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
  const { uploadAndAnalyze, analyzeExisting, maxClarificationRounds } = useAnalyzeScreen();
  const { remaining, limit, refresh } = useWebTryQuota();
  const [limitExhausted, setLimitExhausted] = useState(false);

  const handleJoinWaitlist = useCallback(() => {
    session.resetWebTry();
    scrollToWaitlist();
  }, [session]);

  const handleStartWebTry = useCallback(async () => {
    try {
      const quota = await refresh();
      if (quota.remaining <= 0) {
        scrollToWaitlist();
        return;
      }
    } catch {
      // If quota check fails, still allow trying — analyze will enforce server-side.
    }
    setLimitExhausted(false);
    session.startWebTry();
  }, [refresh, session]);

  const handleAnalyze = async () => {
    if (!session.previewBlob) return;

    session.setWebTryPhase("uploading");
    session.setErrorMessage(null);
    setLimitExhausted(false);

    try {
      session.setWebTryPhase("analyzing");
      const result = await uploadAndAnalyze(
        session.previewBlob,
        session.userContext.trim() || undefined,
        "screenshot",
      );
      session.setStorageId(result.storageId);
      session.setAnalysis(result.analysis);
      session.setWebTryPhase(result.analysis.needsClarification ? "clarification" : "result");
      void refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Analysis failed.";
      if (message === TRY_LIMIT_REACHED) {
        setLimitExhausted(true);
        session.setErrorMessage("You've used your free tries for now.");
      } else {
        session.setErrorMessage(message);
      }
      session.setWebTryPhase("error");
      void refresh();
    }
  };

  const handleClarificationSubmit = async () => {
    if (!session.storageId || !session.clarificationInput.trim()) return;
    if (session.clarificationCount >= maxClarificationRounds) return;

    session.setWebTryPhase("analyzing");
    session.setErrorMessage(null);

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
      onStartWebTry={() => void handleStartWebTry()}
      onExitWebTry={session.resetWebTry}
      onPhotoReady={session.handlePhotoReady}
      onRetake={session.handleRetake}
      onAnalyze={() => void handleAnalyze()}
      tryRemaining={remaining}
      tryLimit={limit}
      limitExhausted={limitExhausted}
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
