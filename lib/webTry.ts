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
  const label = a.label.trim();
  if (!label || !a.box) return null;
  if (!a.instruction.includes(label)) return null;
  return a.box;
}

export const MAX_CLARIFICATION_ROUNDS = 2;
