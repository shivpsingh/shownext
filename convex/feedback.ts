import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { isUnsafeGoal } from "../lib/sensitiveAction";
import { FAILURE_REASON_IDS, MAX_CORRECTION_LENGTH } from "../lib/webTry";

// One structured learning record per answer. The image and the visitor's typed
// goal are written only when they tick the consent box; without it the row still
// captures what the model said and whether it worked, and the screenshot is
// deleted on the usual schedule.
export const submitFeedback = mutation({
  args: {
    storageId: v.id("_storage"),
    browserId: v.string(),
    consent: v.boolean(),
    outcome: v.union(v.literal("worked"), v.literal("failed")),
    failureReason: v.optional(v.string()),
    userCorrection: v.optional(v.string()),
    userGoal: v.optional(v.string()),
    screenSummary: v.string(),
    label: v.string(),
    instruction: v.string(),
    box: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
        width: v.number(),
        height: v.number(),
      }),
    ),
    confidence: v.number(),
    clarificationRound: v.number(),
    deviceType: v.string(),
    captureType: v.optional(v.string()),
    viewportWidth: v.optional(v.number()),
    viewportHeight: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Same ownership rule as discardSession: only the browser that uploaded the
    // screenshot may attach a record to it.
    const session = await ctx.db
      .query("trySessions")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .unique();

    if (!session || session.browserId !== args.browserId) return;

    const failureReason =
      args.outcome === "failed" &&
      args.failureReason &&
      FAILURE_REASON_IDS.includes(args.failureReason)
        ? args.failureReason
        : undefined;

    // The client filters these too, but that check can be bypassed.
    const correction = args.userCorrection?.trim().slice(0, MAX_CORRECTION_LENGTH);
    const userCorrection =
      correction && !isUnsafeGoal(correction) ? correction : undefined;

    const goal = args.userGoal?.trim();
    const userGoal = args.consent && goal && !isUnsafeGoal(goal) ? goal : undefined;

    const record = {
      browserId: args.browserId,
      storageId: args.storageId,
      imageRetained: args.consent,
      ...(userGoal ? { userGoal } : {}),
      screenSummary: args.screenSummary,
      label: args.label,
      instruction: args.instruction,
      ...(args.box ? { box: args.box } : {}),
      confidence: args.confidence,
      clarificationRound: args.clarificationRound,
      deviceType: args.deviceType,
      ...(args.captureType ? { captureType: args.captureType } : {}),
      ...(args.viewportWidth ? { viewportWidth: args.viewportWidth } : {}),
      ...(args.viewportHeight ? { viewportHeight: args.viewportHeight } : {}),
      outcome: args.outcome,
      ...(failureReason ? { failureReason } : {}),
      ...(userCorrection ? { userCorrection } : {}),
      createdAt: Date.now(),
    };

    // A visitor who changes their answer replaces the row rather than adding one.
    const existing = await ctx.db
      .query("learningRecords")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .unique();

    if (existing) {
      await ctx.db.replace(existing._id, record);
      return;
    }

    await ctx.db.insert("learningRecords", record);
  },
});
