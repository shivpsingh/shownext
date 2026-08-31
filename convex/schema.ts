import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  waitlistEntries: defineTable({
    email: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),
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
