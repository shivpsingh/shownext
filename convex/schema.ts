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
    used: v.boolean(),
    expiresAt: v.number(),
  }).index("by_nonce", ["nonce"]),

  trySessions: defineTable({
    storageId: v.id("_storage"),
    ipHash: v.string(),
    createdAt: v.number(),
  }).index("by_storageId", ["storageId"]),
});
