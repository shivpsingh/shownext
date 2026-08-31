"use client";

import { motion } from "framer-motion";
import type { ScreenAnalysis } from "../lib/webTry";

type CardMode = "next" | "question" | "status";

function deriveMode(analysis: ScreenAnalysis): CardMode {
  if (analysis.needsClarification) return "question";
  if (!analysis.label.trim() && !analysis.box) return "status";
  return "next";
}

const EYEBROW: Record<CardMode, string> = {
  next: "NEXT",
  question: "QUESTION",
  status: "STATUS",
};

export function AIActionCard({ analysis }: { analysis: ScreenAnalysis }) {
  const mode = deriveMode(analysis);

  return (
    <motion.div
      className={`ai-action-card ai-action-card--${mode}`}
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="ai-action-card__eyebrow">{EYEBROW[mode]}</span>
      <p className="ai-action-card__instruction">{analysis.instruction}</p>
      {analysis.warning ? (
        <p className="ai-action-card__warning">{analysis.warning}</p>
      ) : null}
    </motion.div>
  );
}
