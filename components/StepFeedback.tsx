"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import {
  FAILURE_REASONS,
  MAX_CORRECTION_LENGTH,
  type FailureReasonId,
  type StepFeedbackPayload,
} from "../lib/webTry";

type StepFeedbackProps = {
  submitted: boolean;
  onSubmit: (payload: StepFeedbackPayload) => void;
};

export function StepFeedback({ submitted, onSubmit }: StepFeedbackProps) {
  const [failing, setFailing] = useState(false);
  const [reason, setReason] = useState<FailureReasonId | null>(null);
  const [correction, setCorrection] = useState("");
  const [consent, setConsent] = useState(false);

  if (submitted) {
    return (
      <p className="web-try-feedback__thanks" role="status" aria-live="polite">
        Thanks — that helps ShowNext get better.
      </p>
    );
  }

  return (
    <motion.div
      className="web-try-feedback"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
    >
      <p className="web-try-feedback__question" id="webTryFeedbackQuestion">
        Did this step work?
      </p>

      <div className="web-try-feedback__choices" role="group" aria-labelledby="webTryFeedbackQuestion">
        <button
          className="web-try-feedback__choice"
          type="button"
          onClick={() => onSubmit({ outcome: "worked", consent })}
        >
          Yes
        </button>
        <button
          className={`web-try-feedback__choice ${failing ? "web-try-feedback__choice--active" : ""}`}
          type="button"
          aria-expanded={failing}
          onClick={() => setFailing(true)}
        >
          No
        </button>
      </div>

      <AnimatePresence initial={false}>
        {failing ? (
          <motion.div
            className="web-try-feedback__detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="web-try-feedback__label">What went wrong?</p>
            <div className="web-try-feedback__chips">
              {FAILURE_REASONS.map((option) => (
                <button
                  key={option.id}
                  className={`web-try-feedback__chip ${reason === option.id ? "web-try-feedback__chip--active" : ""}`}
                  type="button"
                  aria-pressed={reason === option.id}
                  onClick={() => setReason(reason === option.id ? null : option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <label className="web-try-feedback__label" htmlFor="webTryCorrection">
              What should it have said? (optional)
            </label>
            <textarea
              id="webTryCorrection"
              className="web-try-feedback__correction"
              value={correction}
              maxLength={MAX_CORRECTION_LENGTH}
              rows={2}
              onChange={(event) => setCorrection(event.target.value)}
              placeholder="Tap Settings, not the menu"
            />

            <button
              className="hero-cta web-try-feedback__submit"
              type="button"
              onClick={() =>
                onSubmit({
                  outcome: "failed",
                  consent,
                  ...(reason ? { failureReason: reason } : {}),
                  ...(correction.trim() ? { userCorrection: correction.trim() } : {}),
                })
              }
            >
              Send feedback
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <label className="web-try-feedback__consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>
          Save my screenshot and question so ShowNext can learn from this.
          Otherwise they are deleted as usual.
        </span>
      </label>
    </motion.div>
  );
}
