export type DemoMode = "apk" | "webTry";

export type WebTryPhase =
  | "idle"
  | "centering"
  | "handoff"
  | "camera"
  | "preview"
  | "uploading"
  | "analyzing"
  | "result"
  | "clarification"
  | "error";

export type ScreenAnalysis = {
  screenSummary: string;
  nextStep: string;
  location?: string;
  confidence: number;
  needsClarification: boolean;
  warning?: string;
};

export const MAX_CLARIFICATION_ROUNDS = 2;
