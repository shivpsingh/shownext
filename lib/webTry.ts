export type DemoMode = "apk" | "webTry";

export type WebTryPhase =
  | "idle"
  | "camera"
  | "preview"
  | "uploading"
  | "analyzing"
  | "result"
  | "clarification"
  | "error";

export type TargetBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ScreenAnalysis = {
  screenSummary: string;
  label: string;
  instruction: string;
  box: TargetBox | null;
  confidence: number;
  needsClarification: boolean;
  warning?: string;
};

export function resolveTargetRing(
  a: Pick<ScreenAnalysis, "label" | "instruction" | "box">,
): TargetBox | null {
  if (!a.label.trim() || !a.box) return null;
  return a.box;
}

export const MAX_CLARIFICATION_ROUNDS = 2;

export type FeedbackOutcome = "worked" | "failed";

export const FAILURE_REASONS = [
  { id: "wrong-button", label: "Wrong button" },
  { id: "wrong-screen", label: "Wrong screen" },
  { id: "unclear-wording", label: "Unclear wording" },
  { id: "other", label: "Something else" },
] as const;

export type FailureReasonId = (typeof FAILURE_REASONS)[number]["id"];

export const FAILURE_REASON_IDS: readonly string[] = FAILURE_REASONS.map((r) => r.id);

export const MAX_CORRECTION_LENGTH = 500;

export type DeviceType = "mobile" | "tablet" | "desktop";

export function getDeviceType(): DeviceType {
  if (typeof window === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    return "tablet";
  }
  if (/Mobi|iPhone|iPod|Android|IEMobile|Opera Mini/i.test(ua)) return "mobile";
  // iPadOS 13+ reports a desktop UA; the touch point count gives it away.
  if (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua)) return "tablet";
  return window.innerWidth < 768 ? "mobile" : "desktop";
}

export type StepFeedbackPayload = {
  outcome: FeedbackOutcome;
  failureReason?: FailureReasonId;
  userCorrection?: string;
  consent: boolean;
};
