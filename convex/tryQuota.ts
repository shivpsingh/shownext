import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const TRY_LIMIT_REACHED = "TRY_LIMIT_REACHED";
export const TRY_NONCE_INVALID = "TRY_NONCE_INVALID";

const NONCE_TTL_MS = 5 * 60 * 1000;

export function getTryLimit(): number {
  const raw = process.env.WEB_TRY_LIMIT;
  if (!raw) return 2;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 2;
  return parsed;
}

export const getQuotaForIp = internalQuery({
  args: { ipHash: v.string() },
  handler: async (ctx, args) => {
    const limit = getTryLimit();
    const row = await ctx.db
      .query("tryQuota")
      .withIndex("by_ipHash", (q) => q.eq("ipHash", args.ipHash))
      .unique();
    const used = row?.tryCount ?? 0;
    return {
      limit,
      used,
      remaining: Math.max(0, limit - used),
    };
  },
});

export const consumeTryForIp = internalMutation({
  args: { ipHash: v.string() },
  handler: async (ctx, args) => {
    const limit = getTryLimit();
    const now = Date.now();
    const row = await ctx.db
      .query("tryQuota")
      .withIndex("by_ipHash", (q) => q.eq("ipHash", args.ipHash))
      .unique();

    const used = row?.tryCount ?? 0;
    if (used >= limit) {
      throw new Error(TRY_LIMIT_REACHED);
    }

    if (row) {
      await ctx.db.patch(row._id, { tryCount: used + 1, updatedAt: now });
    } else {
      await ctx.db.insert("tryQuota", { ipHash: args.ipHash, tryCount: 1, updatedAt: now });
    }

    const nonce = crypto.randomUUID();
    await ctx.db.insert("tryNonces", {
      nonce,
      ipHash: args.ipHash,
      used: false,
      expiresAt: now + NONCE_TTL_MS,
    });

    return { nonce };
  },
});

export const redeemNonce = internalMutation({
  args: {
    nonce: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const nonceRow = await ctx.db
      .query("tryNonces")
      .withIndex("by_nonce", (q) => q.eq("nonce", args.nonce))
      .unique();

    if (!nonceRow || nonceRow.used || nonceRow.expiresAt <= Date.now()) {
      throw new Error(TRY_NONCE_INVALID);
    }

    await ctx.db.patch(nonceRow._id, { used: true });

    const existingSession = await ctx.db
      .query("trySessions")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .unique();

    if (!existingSession) {
      await ctx.db.insert("trySessions", {
        storageId: args.storageId,
        ipHash: nonceRow.ipHash,
        createdAt: Date.now(),
      });
    }
  },
});

export const isStorageAuthorized = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("trySessions")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .unique();
    return session !== null;
  },
});
