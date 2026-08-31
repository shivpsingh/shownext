"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const PROMPT = `You are ShowNext, an assistant for non-technical Android users. Analyze the screenshot and return exactly one safe next action using only visible information. Do not invent controls or provide multiple steps. If uncertain, ask one short clarification question. Do not recommend approving payments, entering OTPs, passwords, PINs, deleting accounts, factory resets, bypassing security warnings, installing unknown APKs, or suspicious permissions.

Return valid JSON with these fields: screenSummary, label, instruction, box, confidence, needsClarification, warning.

CRITICAL — label, instruction, and box must all refer to the SAME single UI element:
- label: the exact visible text on that control (e.g. "Continue", "Install", "Allow").
- instruction: one plain sentence that quotes that same label (e.g. "Tap 'Continue' at the bottom of the screen."). Do not include location hints like "Look main screen".
- box: an object {x, y, width, height} with normalized coordinates from 0 to 1 relative to the full screenshot image, tightly bounding that same control whose text you wrote in label. If you cannot confidently locate that exact control, set box to null — never guess, never box a different element.

Never return a box for one control while naming a different control in label or instruction.`;

type TargetBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type AnalysisResult = {
  screenSummary: string;
  label: string;
  instruction: string;
  box: TargetBox | null;
  confidence: number;
  needsClarification: boolean;
  warning?: string;
};

function parseTargetBox(raw: unknown): TargetBox | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return null;

  const box = raw as Record<string, unknown>;
  const x = box.x;
  const y = box.y;
  const width = box.width;
  const height = box.height;

  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    return null;
  }

  if ([x, y, width, height].some((value) => value < 0 || value > 1)) {
    return null;
  }

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { x, y, width, height };
}

function parseAnalysis(raw: unknown): AnalysisResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("Analyzer returned invalid JSON.");
  }

  const value = "analysis" in raw && raw.analysis && typeof raw.analysis === "object" ? raw.analysis : raw;
  if (!value || typeof value !== "object") {
    throw new Error("Analyzer returned invalid JSON.");
  }

  const record = value as Record<string, unknown>;
  const screenSummary = record.screenSummary;
  const label = typeof record.label === "string" ? record.label : "";
  const instruction = typeof record.instruction === "string" ? record.instruction : "";

  if (typeof screenSummary !== "string" || !instruction) {
    throw new Error("Analyzer response is missing required fields.");
  }

  const warning =
    typeof record.warning === "string" && record.warning.trim() && record.warning !== "null"
      ? record.warning
      : undefined;

  return {
    screenSummary,
    label,
    instruction,
    box: parseTargetBox(record.box),
    confidence: typeof record.confidence === "number" ? record.confidence : 0,
    needsClarification: Boolean(record.needsClarification),
    warning,
  };
}

export const analyzeScreen = action({
  args: {
    storageId: v.id("_storage"),
    clarification: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<AnalysisResult> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured on the Convex deployment.");
    }

    const blob = await ctx.storage.get(args.storageId);
    if (!blob) {
      throw new Error("Image not found.");
    }

    const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
    const context = args.clarification?.trim()
      ? args.clarification.trim()
      : "The user is asking what to do next on this Android screen.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${PROMPT}\n\nContext: ${context}` },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with HTTP ${response.status}.`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned an empty response.");
    }

    const cleaned = content.replace(/```json|```/g, "").trim();
    return parseAnalysis(JSON.parse(cleaned));
  },
});
