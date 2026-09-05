// Mirrors UNSAFE_GOAL_PATTERNS in the Android decision engine
// (shownext-app/.../decision/ShowNextDecisionEngine.kt). Keep the two in sync.
// Word boundaries matter here: a bare "pin" substring also matches "spin".
const UNSAFE_PATTERNS: readonly RegExp[] = [
  /\bpasswords?\b/,
  /\bpasscode\b/,
  /\botps?\b/,
  /\bone[- ]time code\b/,
  /\bverification code\b/,
  /\bsecurity code\b/,
  /\bpin\b/,
  /\bupi\b/,
  /\bpayments?\b/,
  /\bpay\b/,
  /\bsend money\b/,
  /\btransfer money\b/,
  /\bdelete\b[^.]*\baccount\b/,
  /\bfactory reset\b/,
  /\bbypass\b[^.]*\b(security|lock|warning)\b/,
  /\bignore\b[^.]*\b(security|warning)\b/,
  /\binstall\b[^.]*\bapk\b/,
  /\bgrant\b[^.]*\bpermissions?\b/,
];

export const SENSITIVE_ACTION_WARNING =
  "For your safety I cannot guide payments, passwords, OTPs, PINs, account deletion, or security changes. Please ask someone you trust to help with this step.";

const SENSITIVE_ACTION_INSTRUCTION = "I cannot help with this step.";

// Renders as a STATUS card with no target ring: empty label and box=null.
export function sensitiveActionResult(): {
  screenSummary: string;
  label: string;
  instruction: string;
  box: null;
  confidence: number;
  needsClarification: boolean;
  warning: string;
} {
  return {
    screenSummary: "",
    label: "",
    instruction: SENSITIVE_ACTION_INSTRUCTION,
    box: null,
    confidence: 0,
    needsClarification: false,
    warning: SENSITIVE_ACTION_WARNING,
  };
}

export function isUnsafeGoal(goal: string | undefined | null): boolean {
  if (!goal) return false;
  const value = goal.toLowerCase();
  return UNSAFE_PATTERNS.some((pattern) => pattern.test(value));
}
