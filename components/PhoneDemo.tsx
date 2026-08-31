"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { DemoMode } from "../lib/webTry";
import { AppIconImage } from "./phoneAppIcons";
import { LogoMark } from "./LogoMark";

type ViewName = "home" | "downloads";

type PhoneDemoProps = {
  demoMode?: DemoMode;
};

function GuideLabel() {
  return (
    <span className="guide-label">
      <LogoMark className="guide-label__mark" size={16} />
      ShowNext
    </span>
  );
}

function getTimeGreeting(date: Date) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatPhoneDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function StatusBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      setTime(
        new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        }),
      );
    };

    updateTime();
    const intervalId = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <header className="status-bar" aria-label="Status bar">
      <div className="status-left">
        <span className="status-time" aria-live="polite">
          {time}
        </span>
        <span className="notify-icon" title="Notifications" aria-label="Notifications">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 22a2.5 2.5 0 002.45-2h-4.9A2.5 2.5 0 0012 22z" fill="currentColor" />
            <path d="M18 16V11a6 6 0 10-12 0v5l-2 2v1h16v-1l-2-2z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <div className="status-right">
        <span className="status-icon wifi" title="Wi-Fi">
          <svg
            width="20"
            height="14"
            viewBox="0 -2 24 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M1 8.5 3.5 11c4.14-4.14 10.86-4.14 15 0l2.5-2.5C15.5 2.5 8.5 2.5 1 8.5Zm8 7.5 3-3c-1.65-1.65-4.35-1.65-6 0l3 3ZM5 12.5 7 14.5c2.76-2.76 7.24-2.76 10 0l2-2C14.5 9 9.5 9 5 12.5Z" />
          </svg>
        </span>
        <span className="status-icon signal" title="Signal">
          <span /><span /><span /><span />
        </span>
        <span className="status-icon battery" title="Battery">
          <svg width="22" height="11" viewBox="0 0 22 11" fill="none" aria-hidden="true">
            <rect x="0.5" y="0.5" width="18" height="10" rx="2" stroke="currentColor" />
            <rect x="19" y="3.2" width="2.5" height="4.6" rx="0.8" fill="currentColor" />
            <rect x="2" y="2" width="12" height="7" rx="1.2" fill="currentColor" />
          </svg>
        </span>
      </div>
    </header>
  );
}

export function PhoneDemo({ demoMode = "apk" }: PhoneDemoProps) {
  const [view, setView] = useState<ViewName>("home");
  const [guideOpen, setGuideOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [installStarted, setInstallStarted] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const guideCopy =
    view === "home"
      ? "Open Downloads to find the ShowNext APK."
      : installStarted
        ? "That's the small use case — help, right on the phone."
        : downloaded
          ? "You're almost there."
          : "I'll point you to the next tap.";

  const guideStep =
    view === "home" ? (
      <>Tap the <strong>Downloads</strong> app on your home screen.</>
    ) : installStarted ? (
      <>Installation started. ShowNext will guide your parent on their next screen.</>
    ) : downloaded ? (
      <>Tap <strong>Open when ready</strong> to install ShowNext.</>
    ) : (
      <>Tap <strong>Download APK</strong>, then wait for it to finish.</>
    );

  const startDownload = useCallback(() => {
    if (downloading || downloaded) return;
    setDownloading(true);
    setProgress(0);
    timerRef.current = setInterval(() => {
      setProgress((current) => {
        const next = current + 8;
        if (next >= 100) {
          if (timerRef.current) clearInterval(timerRef.current);
          setDownloading(false);
          setDownloaded(true);
          return 100;
        }
        return next;
      });
    }, 120);
  }, [downloaded, downloading]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const intervalId = window.setInterval(tick, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const webTryActive = demoMode === "webTry";

  return (
    <motion.div
      className={`phone-wrap${webTryActive ? "" : " phone-wrap--floating"}`}
      id="try-demo"
      initial={{ opacity: 0, y: 28, rotate: 2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
    >
      <div className="phone-float">
        <div
          className="phone"
          role="application"
          aria-label="ShowNext phone demonstration"
        >
        <div className="power-btn" aria-hidden="true" />
        <div className={`screen-shell ${view === "downloads" ? "screen-shell--downloads" : ""}`}>
          <div className="camera-hole" aria-hidden="true" />
          <StatusBar />

          <div className={`screen-content ${view === "downloads" ? "screen-content--downloads" : ""}`}>
            <AnimatePresence mode="wait">
              {view === "home" ? (
                <motion.section
                  key="home"
                  className="view view--home active"
                  aria-label="Home screen"
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 24 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <div className="home-main">
                    <div className="at-a-glance">
                      <span className="date">{now ? formatPhoneDate(now) : "\u00A0"}</span>
                      <h1>{now ? getTimeGreeting(now) : "\u00A0"}</h1>
                    </div>
                  </div>

                  <div className="home-bottom">
                    <div className="home-apps home-apps--top" aria-label="Apps">
                      <button className="app downloads" type="button" aria-label="Downloads" onClick={() => setView("downloads")}>
                        <AppIconImage name="downloads" />
                      </button>
                      <button className="app store" type="button" aria-label="Play Store">
                        <AppIconImage name="play-store" />
                      </button>
                      <button className="app files" type="button" aria-label="Files">
                        <AppIconImage name="files" />
                      </button>
                      <button className="app settings" type="button" aria-label="Settings">
                        <AppIconImage name="settings" />
                      </button>
                    </div>

                    <div className="search-pill" aria-hidden="true">
                      <svg className="g-logo" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Search apps, web, and more
                    </div>

                    <div className="home-apps home-apps--bottom" aria-label="Dock">
                      <button className="app phone-app" type="button" aria-label="Contact">
                        <AppIconImage name="phone" />
                      </button>
                      <button className="app dock-messages" type="button" aria-label="Messages">
                        <AppIconImage name="messages" />
                      </button>
                      <button className="app photos" type="button" aria-label="Photos">
                        <AppIconImage name="photos" />
                      </button>
                      <button className="app camera-app" type="button" aria-label="Camera">
                        <AppIconImage name="camera" />
                      </button>
                    </div>
                  </div>
                </motion.section>
              ) : (
                <motion.section
                  key="downloads"
                  className="view view--downloads active"
                  aria-label="Downloads screen"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <div className="screen-header">
                    <button className="back-btn" type="button" aria-label="Back" onClick={() => setView("home")}>
                      ←
                    </button>
                    <h2>Downloads</h2>
                  </div>
                  <div className="download-card">
                    <div className="apk-icon">SN</div>
                    <div className="download-meta">
                      <h3>ShowNext.apk</h3>
                      <p>Early Android build · 18.4 MB · Tap download, then open the file to install.</p>
                    </div>
                  </div>
                  <div className="download-actions">
                    <button className="primary-btn" type="button" onClick={startDownload} disabled={downloading || downloaded}>
                      Download APK
                    </button>
                    <button className="ghost-btn" type="button" disabled={!downloaded} onClick={() => setInstallStarted(true)}>
                      Open when ready
                    </button>
                  </div>
                  <AnimatePresence>
                    {(downloading || downloaded) && (
                      <motion.div
                        className="download-progress visible"
                        aria-live="polite"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                      >
                        {downloaded ? "ShowNext.apk downloaded. You can open it now." : "Downloading ShowNext.apk…"}
                        <div className="progress-bar">
                          <motion.span animate={{ width: `${progress}%` }} transition={{ duration: 0.12, ease: "linear" }} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.section>
              )}
            </AnimatePresence>

            {!webTryActive && (
              <motion.button
                className={`shownext-bubble ${view === "downloads" ? "shownext-bubble--downloads" : ""}`}
                type="button"
                aria-label="Open ShowNext help"
                title="ShowNext"
                onClick={() => setGuideOpen((open) => !open)}
                animate={guideOpen ? { scale: 1.08 } : { scale: [1, 1.06, 1] }}
                transition={guideOpen ? { duration: 0.2 } : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                whileTap={{ scale: 0.94 }}
              >
                <LogoMark className="shownext-bubble__icon" size={52} />
              </motion.button>
            )}

            <AnimatePresence>
              {!webTryActive && guideOpen && (
                <motion.div
                  className={`guide-panel open ${view === "downloads" ? "guide-panel--downloads" : ""}`}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="guideTitle"
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                >
                  <GuideLabel />
                  <h3 id="guideTitle">Need help installing the app?</h3>
                  <p>{guideCopy}</p>
                  <div className="guide-step">{guideStep}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="nav-bar" aria-hidden="true">
            <span />
          </div>
        </div>
        </div>
      </div>
    </motion.div>
  );
}
