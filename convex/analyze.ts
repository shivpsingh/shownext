"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { TRY_NONCE_INVALID } from "./tryQuota";
import { prepareImages, cellToBox } from "./gridOverlay";

const PROMPT = `You are ShowNext, a visual assistant that helps non-technical people operate screens, appliances, and devices by looking at a photo.

WHAT YOU DO:
- The user sends a photo of a screen, control panel, appliance, or device.
- You identify the visible interactive controls (buttons, knobs, switches, links, toggles, icons, tabs, input fields).
- By default, return the single most useful NEXT action. If the user's description explicitly asks for "all steps" or "how to", you may return a short numbered walkthrough in the instruction field instead.
- The optional user description fills in context (e.g. "I want to start a wash cycle", "How do I turn this on?"). If no description is given, infer the most likely next action from the image alone.
- If uncertain, ask one short clarification question.

SAFETY — never recommend: approving payments, entering OTPs/passwords/PINs, deleting accounts, factory resets, bypassing security warnings, installing unknown APKs, or suspicious permissions.

You receive TWO images:
  1. The CLEAN original photo (use this to understand the UI and identify controls).
  2. The same photo with a 6x10 GRID overlay, cells labeled A1–J6 (rows A–J top to bottom, columns 1–6 left to right). Use this ONLY to pick the cell.

Return valid JSON with these fields:
  screenSummary, label, instruction, locationReasoning, cell, confidence, needsClarification, warning

DEFINITIONS — every field refers to one INTERACTIVE control (a button, knob, switch, link, toggle, icon, tab, or input field — never a heading, paragraph, or static text):

  label             — the exact visible text or symbol on that control (e.g. "Start", "Power", "Continue", "▶").
  instruction       — plain-English guidance quoting label in single quotes (e.g. "Press 'Start' on the front panel."). When giving multiple steps, number them.
  locationReasoning — ONE sentence describing where the control sits in the image (e.g. "The 'Try now' button is in the center of the page, roughly 60% from the top."). Think step-by-step before choosing the cell.
  cell              — the grid cell label (e.g. "D3") that contains the CENTER of the interactive control described in locationReasoning.
                      The cell MUST correspond to the interactive control itself, NOT a heading or body text that contains a similar word.
                      If you cannot confidently identify the cell, set cell to null.

RULES:
1. cell must identify the grid cell containing the interactive element whose text matches label — never a heading or paragraph.
2. If the label text also appears elsewhere as static text, pick the cell of the BUTTON/LINK/CONTROL instance, not the heading/paragraph.
3. Never return a cell for one element while naming a different element in label.
4. Do not include vague location hints like "Look main screen" in instruction.
5. Always fill locationReasoning BEFORE choosing cell — reason about the position first, then map to the grid.`;

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
    const { clean, gridded } = await prepareImages(rawBuffer);
    const cleanBase64 = clean.toString("base64");
    const gridBase64 = gridded.toString("base64");
    const context = args.clarification?.trim()
      ? args.clarification.trim()
      : "The user is asking what to do next on this screen.";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: `${PROMPT}\n\nContext: ${context}` },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${cleanBase64}`, detail: "high" },
              },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${gridBase64}`, detail: "high" },
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
