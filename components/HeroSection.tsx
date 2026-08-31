"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Id } from "../convex/_generated/dataModel";
import { useAnalyzeScreen } from "../lib/useAnalyzeScreen";
import type { DemoMode, ScreenAnalysis, WebTryPhase } from "../lib/webTry";
import { LogoMark } from "./LogoMark";
import { PhoneDemo } from "./PhoneDemo";
import { WebTryExperience } from "./WebTryExperience";

const fadeEase = [0.22, 1, 0.36, 1] as const;

type HeroSectionViewProps = {
  demoMode: DemoMode;
  webTryPhase: WebTryPhase;
  cameraPulse: boolean;
  previewUrl: string | null;
  analysis: ScreenAnalysis | null;
  errorMessage: string | null;
  clarificationInput: string;
  onClarificationInputChange: (value: string) => void;
  onClarificationSubmit: () => void;
  onStartWebTry: () => void;
  onExitWebTry: () => void;
  onCenteringComplete: () => void;
  onPhotoReady: (blob: Blob) => void;
  onRetake: () => void;
  onAnalyze: () => void;
};

function HeroSectionView({
  demoMode,
  webTryPhase,
  cameraPulse,
  previewUrl,
  analysis,
  errorMessage,
  clarificationInput,
  onClarificationInputChange,
  onClarificationSubmit,
  onStartWebTry,
  onExitWebTry,
  onCenteringComplete,
  onPhotoReady,
  onRetake,
  onAnalyze,
}: HeroSectionViewProps) {
  const webTryActive = demoMode === "webTry";
  const showFullPage = webTryActive && !["idle", "centering", "handoff"].includes(webTryPhase);
  const showPhone = webTryActive && (webTryPhase === "centering" || webTryPhase === "handoff");
  const isHandoff = webTryPhase === "handoff";

  return (
    <section className={`hero-stage ${webTryActive ? "hero-stage--web-try" : ""}`} id="top">
      <div className="stage shell">
        <motion.div
          className={`hero-copy ${webTryActive ? "hero-copy--dimmed" : ""}`}
          animate={{ opacity: showFullPage ? 0 : webTryActive ? 0.45 : 1 }}
          transition={{ duration: 0.35 }}
        >
          <motion.div className="hero-brand" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: fadeEase }}>
            <LogoMark className="wordmark-mark" size={44} />
            <span className="hero-brand__name">ShowNext</span>
          </motion.div>
          <motion.p className="hero-tagline" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: fadeEase, delay: 0.1 }}>
            A calm guide on their screen — one clear next tap when they&apos;re stuck, and you&apos;re not there to help.
          </motion.p>
          {!webTryActive && (
            <motion.button
              className="hero-cta"
              type="button"
              onClick={onStartWebTry}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: fadeEase, delay: 0.18 }}
            >
              Try now from web
            </motion.button>
          )}
        </motion.div>

        <AnimatePresence>
          {(!webTryActive || showPhone) && (
            <motion.div
              key="phone"
              layout
              className={`phone-stage ${showPhone ? "phone-stage--centered" : ""} ${isHandoff ? "phone-stage--handoff" : ""}`}
              initial={{ opacity: 0, y: 28 }}
              animate={
                isHandoff
                  ? { opacity: 0, scale: 0.16, y: 52 }
                  : { opacity: 1, scale: 1, y: 0, x: 0 }
              }
              exit={{ opacity: 0, scale: 0.2 }}
              transition={{
                layout: { duration: 1.45, ease: [0.22, 1, 0.36, 1] },
                opacity: isHandoff
                  ? { duration: 0.55, ease: "easeOut", delay: 0.65 }
                  : { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
                scale: { duration: isHandoff ? 1.15 : 1.45, ease: [0.22, 1, 0.36, 1] },
                y: { duration: isHandoff ? 1.15 : 1.45, ease: [0.22, 1, 0.36, 1] },
              }}
            >
              <PhoneDemo
                demoMode={demoMode}
                webTryPhase={webTryPhase}
                cameraPulse={cameraPulse}
                onCenteringComplete={onCenteringComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isHandoff && (
            <motion.div
              className="web-try-handoff-logo"
              initial={{ opacity: 0, scale: 0.22 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.08 }}
              transition={{ duration: 0.85, delay: 0.55, ease: fadeEase }}
            >
              <LogoMark size={56} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showFullPage && (
          <WebTryExperience
            phase={webTryPhase}
            previewUrl={previewUrl}
            analysis={analysis}
            errorMessage={errorMessage}
            clarificationInput={clarificationInput}
            onClose={onExitWebTry}
            onPhotoReady={onPhotoReady}
            onRetake={onRetake}
            onAnalyze={onAnalyze}
            onClarificationInputChange={onClarificationInputChange}
            onClarificationSubmit={onClarificationSubmit}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function useWebTrySession() {
  const [demoMode, setDemoMode] = useState<DemoMode>("apk");
  const [webTryPhase, setWebTryPhase] = useState<WebTryPhase>("idle");
  const [cameraPulse, setCameraPulse] = useState(false);
  const [analysis, setAnalysis] = useState<ScreenAnalysis | null>(null);
  const [storageId, setStorageId] = useState<Id<"_storage"> | null>(null);
  const [clarificationCount, setClarificationCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clarificationInput, setClarificationInput] = useState("");
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
    setCameraPulse(false);
    setClarificationInput("");
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
    setWebTryPhase("centering");
    setAnalysis(null);
    setStorageId(null);
    setClarificationCount(0);
    setErrorMessage(null);
    setClarificationInput("");
    clearPreview();
    document.body.classList.add("web-try-active");
  }, [clearPreview]);

  const handleCenteringComplete = useCallback(() => {
    setCameraPulse(true);
    setWebTryPhase("handoff");

    window.setTimeout(() => setCameraPulse(false), 1400);
    window.setTimeout(() => setWebTryPhase("camera"), 1200);
  }, []);

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
    cameraPulse,
    analysis,
    storageId,
    clarificationCount,
    errorMessage,
    clarificationInput,
    previewBlob,
    previewUrl,
    setWebTryPhase,
    setAnalysis,
    setStorageId,
    setClarificationCount,
    setErrorMessage,
    setClarificationInput,
    resetWebTry,
    startWebTry,
    handleCenteringComplete,
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
      cameraPulse={session.cameraPulse}
      previewUrl={session.previewUrl}
      analysis={session.analysis}
      errorMessage={session.errorMessage}
      clarificationInput={session.clarificationInput}
      onClarificationInputChange={session.setClarificationInput}
      onClarificationSubmit={() => undefined}
      onStartWebTry={session.startWebTry}
      onExitWebTry={session.resetWebTry}
      onCenteringComplete={session.handleCenteringComplete}
      onPhotoReady={session.handlePhotoReady}
      onRetake={session.handleRetake}
      onAnalyze={handleAnalyze}
    />
  );
}

function HeroSectionConnected() {
  const session = useWebTrySession();
  const { uploadAndAnalyze, analyzeExisting, maxClarificationRounds } = useAnalyzeScreen();

  const handleAnalyze = async () => {
    if (!session.previewBlob) return;

    session.setWebTryPhase("uploading");
    session.setErrorMessage(null);

    try {
      session.setWebTryPhase("analyzing");
      const result = await uploadAndAnalyze(session.previewBlob);
      session.setStorageId(result.storageId);
      session.setAnalysis(result.analysis);
      session.setWebTryPhase(result.analysis.needsClarification ? "clarification" : "result");
    } catch (error) {
      session.setErrorMessage(error instanceof Error ? error.message : "Analysis failed.");
      session.setWebTryPhase("error");
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
      cameraPulse={session.cameraPulse}
      previewUrl={session.previewUrl}
      analysis={session.analysis}
      errorMessage={session.errorMessage}
      clarificationInput={session.clarificationInput}
      onClarificationInputChange={session.setClarificationInput}
      onClarificationSubmit={() => void handleClarificationSubmit()}
      onStartWebTry={session.startWebTry}
      onExitWebTry={session.resetWebTry}
      onCenteringComplete={session.handleCenteringComplete}
      onPhotoReady={session.handlePhotoReady}
      onRetake={session.handleRetake}
      onAnalyze={() => void handleAnalyze()}
    />
  );
}

export function HeroSection() {
  if (process.env.NEXT_PUBLIC_CONVEX_URL) {
    return <HeroSectionConnected />;
  }

  return <HeroSectionLocal />;
}
