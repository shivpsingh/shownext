"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { TRY_NONCE_INVALID } from "./tryQuota";
import { overlayGrid, cellToBox } from "./gridOverlay";

const PROMPT = `You are ShowNext, an assistant for non-technical Android users. Analyze the screenshot and return exactly one safe next action using only visible information. Do not invent controls or provide multiple steps. If uncertain, ask one short clarification question. Do not recommend approving payments, entering OTPs, passwords, PINs, deleting accounts, factory resets, bypassing security warnings, installing unknown APKs, or suspicious permissions.

The screenshot has a labeled grid overlay with cells A1–H5 (rows A–H, columns 1–5). Each cell has a visible label in its center.

Return valid JSON with these fields: screenSummary, label, instruction, cell, confidence, needsClarification, warning.

CRITICAL — label, instruction, and cell must all refer to the SAME single UI element:
- label: the exact visible text on that control (e.g. "Continue", "Install", "Allow").
- instruction: one plain sentence that quotes that same label (e.g. "Tap 'Continue' at the bottom of the screen."). Do not include location hints like "Look main screen".
- cell: the grid cell label (e.g. "D3") whose area contains the center of that control. If you cannot confidently identify the cell, set cell to null.

Never return a cell for one control while naming a different control in label or instruction.`;

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
    box: typeof record.cell === "string" ? cellToBox(record.cell) : null,
    confidence: typeof record.confidence === "number" ? record.confidence : 0,
    needsClarification: Boolean(record.needsClarification),
    warning,
  };
}

export const analyzeScreen = action({
  args: {
    storageId: v.id("_storage"),
    clarification: v.optional(v.string()),
    nonce: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<AnalysisResult> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured on the Convex deployment.");
    }

    const authorized = await ctx.runQuery(internal.tryQuota.isStorageAuthorized, {
      storageId: args.storageId,
    });

    if (authorized) {
      // Clarification on an already-authorized photo — no new try consumed.
    } else if (args.nonce) {
      await ctx.runMutation(internal.tryQuota.redeemNonce, {
        nonce: args.nonce,
        storageId: args.storageId,
      });
    } else {
      throw new Error(TRY_NONCE_INVALID);
    }

    const blob = await ctx.storage.get(args.storageId);
    if (!blob) {
      throw new Error("Image not found.");
    }

    const rawBuffer = Buffer.from(await blob.arrayBuffer());
    const griddedBuffer = await overlayGrid(rawBuffer);
    const base64 = griddedBuffer.toString("base64");
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
