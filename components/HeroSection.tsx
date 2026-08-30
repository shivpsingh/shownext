"use client";

import { motion } from "framer-motion";
import { PhoneDemo } from "./PhoneDemo";

const fadeEase = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  return (
    <section className="hero-stage" id="top">
      <div className="stage shell">
        <div className="hero-copy">
          <motion.div className="hero-brand" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: fadeEase }}>
            <span className="wordmark-mark" aria-hidden="true">
              ›
            </span>
            ShowNext
          </motion.div>
          <motion.p className="hero-tagline" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: fadeEase, delay: 0.1 }}>
            A calm guide on their screen — one clear next tap when they&apos;re stuck, and you&apos;re not there to help.
          </motion.p>
        </div>

        <PhoneDemo />
      </div>
    </section>
  );
}
