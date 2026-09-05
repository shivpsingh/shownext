import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  waitlistEntries: defineTable({
    email: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  browserQuota: defineTable({
    browserId: v.string(),
    tryCount: v.number(),
    updatedAt: v.number(),
  }).index("by_browserId", ["browserId"]),

  dailyAnalytics: defineTable({
    dateKey: v.string(),
    totalCount: v.number(),
    updatedAt: v.number(),
  }).index("by_dateKey", ["dateKey"]),

  ipRateLimit: defineTable({
    ipHash: v.string(),
    windowStart: v.number(),
    requestCount: v.number(),
  }).index("by_ipHash", ["ipHash"]),

  tryQuota: defineTable({
    ipHash: v.string(),
    tryCount: v.number(),
    updatedAt: v.number(),
  }).index("by_ipHash", ["ipHash"]),

  tryNonces: defineTable({
    nonce: v.string(),
    ipHash: v.string(),
    // Optional for rows issued before discard authorization existed.
    browserId: v.optional(v.string()),
    used: v.boolean(),
    expiresAt: v.number(),
  }).index("by_nonce", ["nonce"]),

  trySessions: defineTable({
    storageId: v.id("_storage"),
    ipHash: v.string(),
    // Optional for rows written before discard authorization existed.
    browserId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_storageId", ["storageId"])
    .index("by_createdAt", ["createdAt"]),

  learningRecords: defineTable({
    browserId: v.string(),
    // Identity key for the answer this record grades. The blob it points at is
    // kept only when imageRetained is true; otherwise it is deleted as usual and
    // this becomes a dangling reference.
    storageId: v.id("_storage"),
    imageRetained: v.boolean(),
    // The visitor's typed goal. Consent-gated, same as the image.
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
    outcome: v.union(v.literal("worked"), v.literal("failed")),
    failureReason: v.optional(v.string()),
    userCorrection: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_storageId", ["storageId"])
    .index("by_createdAt", ["createdAt"])
    .index("by_outcome", ["outcome"]),
});
