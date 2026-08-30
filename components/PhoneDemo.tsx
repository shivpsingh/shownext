"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type ViewName = "home" | "downloads";

function StatusBar() {
  return (
    <header className="status-bar" aria-label="Status bar">
      <div className="status-left">
        <span className="notify-icon" title="Notifications" aria-label="Notifications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 22a2.5 2.5 0 002.45-2h-4.9A2.5 2.5 0 0012 22z" fill="currentColor" />
            <path d="M18 16V11a6 6 0 10-12 0v5l-2 2v1h16v-1l-2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <div className="status-right">
        <span className="status-icon signal" title="Signal">
          <span /><span /><span /><span />
        </span>
        <span className="status-icon wifi" title="Wi-Fi">
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden="true">
            <path d="M8 10.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1Z" fill="currentColor" />
            <path d="M5 7.5c1.66-1.66 4.34-1.66 6 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M2.5 5c2.76-2.76 7.24-2.76 10 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M0 2c3.59-3.59 9.41-3.59 13 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </span>
        <span className="status-icon battery" title="Battery">
          <svg width="22" height="11" viewBox="0 0 22 11" fill="none" aria-hidden="true">
            <rect x="0.5" y="0.5" width="18" height="10" rx="2" stroke="currentColor" />
            <rect x="19" y="3.2" width="2.5" height="4.6" rx="0.8" fill="currentColor" />
            <rect x="2" y="2" width="12" height="7" rx="1.2" fill="currentColor" />
          </svg>
        </span>
        <span className="status-time">9:41</span>
      </div>
    </header>
  );
}

function AppIcon({ children }: { children: ReactNode }) {
  return (
    <div className="app-icon">
      <svg viewBox="0 0 54 54" aria-hidden="true">
        {children}
      </svg>
    </div>
  );
}

export function PhoneDemo() {
  const [view, setView] = useState<ViewName>("home");
  const [guideOpen, setGuideOpen] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [installStarted, setInstallStarted] = useState(false);
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

  const showArrow = guideOpen && view === "downloads" && !installStarted;

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

  return (
    <motion.div
      className="phone-wrap"
      initial={{ opacity: 0, y: 28, rotate: 2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
    >
      <motion.div
        className="phone"
        role="application"
        aria-label="ShowNext phone demonstration"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="power-btn" aria-hidden="true" />
        <div className="screen-shell">
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
                      <span className="date">Sat, Aug 29 · 72°F</span>
                      <h1>Good afternoon</h1>
                    </div>
                  </div>

                  <div className="home-bottom">
                    <div className="app-grid">
                      <button className="app downloads" type="button" onClick={() => setView("downloads")}>
                        <AppIcon>
                          <circle cx="27" cy="27" r="27" fill="#4285F4" />
                          <path d="M27 16v14m0 0-5-5m5 5 5-5M18 34h18" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
                        </AppIcon>
                        <div className="app-label">Downloads</div>
                      </button>
                      <button className="app store" type="button">
                        <AppIcon>
                          <circle cx="27" cy="27" r="27" fill="#fff" />
                          <path d="M14 14l10 26 3-12 13-3L14 14z" fill="#4285F4" />
                          <path d="M24 28l3 12 13-3-10-26-3 12z" fill="#34A853" />
                          <path d="M14 14l10 26 3-12-13-3H14z" fill="#FBBC04" />
                          <path d="M14 14h10l13 3-10 26-3-12L14 14z" fill="#EA4335" />
                        </AppIcon>
                        <div className="app-label">Play Store</div>
                      </button>
                      <button className="app messages" type="button">
                        <AppIcon>
                          <circle cx="27" cy="27" r="27" fill="#fff" />
                          <path d="M14 18h26a3 3 0 013 3v11a3 3 0 01-3 3H22l-6 5v-5h-2a3 3 0 01-3-3V21a3 3 0 013-3z" fill="#1A73E8" />
                        </AppIcon>
                        <div className="app-label">Messages</div>
                      </button>
                      <button className="app photos" type="button">
                        <AppIcon>
                          <circle cx="27" cy="27" r="27" fill="#fff" />
                          <path d="M27 14a13 13 0 100 26 13 13 0 000-26z" fill="#FBBC04" />
                          <path d="M27 14a13 13 0 010 26V14z" fill="#EA4335" />
                          <path d="M27 14a13 13 0 0113 13H27V14z" fill="#34A853" />
                          <path d="M27 40a13 13 0 01-13-13h13v13z" fill="#4285F4" />
                        </AppIcon>
                        <div className="app-label">Photos</div>
                      </button>
                      <button className="app files" type="button">
                        <AppIcon>
                          <circle cx="27" cy="27" r="27" fill="#fff" />
                          <path d="M17 16h14l4 4v18a3 3 0 01-3 3H17a3 3 0 01-3-3V19a3 3 0 013-3z" fill="#5F6368" />
                          <path d="M31 16v4h4" stroke="#fff" strokeWidth="1.5" />
                          <path d="M20 26h14M20 31h14" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                        </AppIcon>
                        <div className="app-label">Files</div>
                      </button>
                      <button className="app settings" type="button">
                        <AppIcon>
                          <circle cx="27" cy="27" r="27" fill="#fff" />
                          <path d="M27 21a6 6 0 100 12 6 6 0 000-12z" fill="#5F6368" />
                          <path d="M34 27h3M17 27h3M27 17v3M27 34v3M31.2 19.8l2.1-2.1M20.7 30.3l2.1-2.1M31.2 34.2l2.1 2.1M20.7 23.7l2.1 2.1" stroke="#5F6368" strokeWidth="2" strokeLinecap="round" />
                        </AppIcon>
                        <div className="app-label">Settings</div>
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

                    <div className="dock" aria-label="Dock">
                      <button className="app phone-app" type="button" aria-label="Phone">
                        <AppIcon>
                          <circle cx="27" cy="27" r="27" fill="#34A853" />
                          <path d="M22 18l3 5-2.5 2a10 10 0 004.5 4.5l2-2.5 5 3c.5.3 1.1.2 1.4-.3 1-1.4 2.4-3.2 2.4-5.4 0-4.4-3.6-8-8-8-2.2 0-4 1.4-5.4 2.4-.5.3-.6.9-.3 1.4z" fill="#fff" />
                        </AppIcon>
                      </button>
                      <button className="app dock-messages" type="button" aria-label="Messages">
                        <AppIcon>
                          <circle cx="27" cy="27" r="27" fill="#fff" />
                          <path d="M14 18h26a3 3 0 013 3v11a3 3 0 01-3 3H22l-6 5v-5h-2a3 3 0 01-3-3V21a3 3 0 013-3z" fill="#1A73E8" />
                        </AppIcon>
                      </button>
                      <button className="app camera-app" type="button" aria-label="Camera">
                        <AppIcon>
                          <circle cx="27" cy="27" r="27" fill="#747775" />
                          <path d="M18 21l2.5-3.5h13L36 21h2a3 3 0 013 3v12a3 3 0 01-3 3H16a3 3 0 01-3-3V24a3 3 0 013-3h2z" fill="#fff" />
                          <circle cx="27" cy="29" r="5.5" fill="#747775" stroke="#fff" strokeWidth="2" />
                        </AppIcon>
                      </button>
                      <button className="app gallery-app" type="button" aria-label="Gallery">
                        <AppIcon>
                          <circle cx="27" cy="27" r="27" fill="#fff" />
                          <path d="M27 14a13 13 0 100 26 13 13 0 000-26z" fill="#FBBC04" />
                          <path d="M27 14a13 13 0 010 26V14z" fill="#EA4335" />
                          <path d="M27 14a13 13 0 0113 13H27V14z" fill="#34A853" />
                          <path d="M27 40a13 13 0 01-13-13h13v13z" fill="#4285F4" />
                        </AppIcon>
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
              ✦
            </motion.button>

            <AnimatePresence>
              {showArrow && (
                <motion.svg
                  className="guide-arrow visible"
                  viewBox="0 0 64 42"
                  aria-hidden="true"
                  initial={{ opacity: 0, pathLength: 0 }}
                  animate={{ opacity: 1, pathLength: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <motion.path d="M6 6 C 22 6, 30 24, 48 34" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45 }} />
                  <path d="M48 34 L42 30" />
                  <path d="M48 34 L44 40" />
                </motion.svg>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {guideOpen && (
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
                  <span className="guide-label">ShowNext</span>
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
      </motion.div>
    </motion.div>
  );
}
