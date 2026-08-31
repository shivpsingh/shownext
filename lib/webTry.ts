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
  nextStep: string;
  targetBox: TargetBox | null;
  confidence: number;
  needsClarification: boolean;
  warning?: string;
};

export const MAX_CLARIFICATION_ROUNDS = 2;
