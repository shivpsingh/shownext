import { v } from "convex/values";
import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const TRY_LIMIT_REACHED = "TRY_LIMIT_REACHED";
export const DAILY_CAPACITY_REACHED = "DAILY_CAPACITY_REACHED";
export const IP_RATE_LIMITED = "IP_RATE_LIMITED";
export const TRY_NONCE_INVALID = "TRY_NONCE_INVALID";

const BROWSER_LIMIT = 5;
const MAX_ANALYSES_PER_DAY = 50;
const IP_HOURLY_LIMIT = 20;
const IP_WINDOW_MS = 60 * 60 * 1000;
const NONCE_TTL_MS = 5 * 60 * 1000;
const RETENTION_MS = 60 * 60 * 1000;
const SWEEP_BATCH = 200;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Queries ──────────────────────────────────────────────

export const getQuota = internalQuery({
  args: { browserId: v.string() },
  handler: async (ctx, args) => {
    const dateKey = todayKey();
    const dailyRow = await ctx.db
      .query("dailyAnalytics")
      .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
      .unique();
    const dailyUsed = dailyRow?.totalCount ?? 0;

    if (dailyUsed >= MAX_ANALYSES_PER_DAY) {
      return {
        limit: BROWSER_LIMIT,
        used: BROWSER_LIMIT,
        remaining: 0,
        reason: "daily_capacity" as const,
      };
    }

    const browserRow = await ctx.db
      .query("browserQuota")
      .withIndex("by_browserId", (q) => q.eq("browserId", args.browserId))
      .unique();
    const used = browserRow?.tryCount ?? 0;
    const remaining = Math.max(0, BROWSER_LIMIT - used);

    return {
      limit: BROWSER_LIMIT,
      used,
      remaining,
      reason: remaining === 0 ? ("browser_limit" as const) : (null as null),
    };
  },
});

export const getDailyCount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const dateKey = todayKey();
    const row = await ctx.db
      .query("dailyAnalytics")
      .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
      .unique();
    return { count: row?.totalCount ?? 0, ceiling: MAX_ANALYSES_PER_DAY };
  },
});

// ── Mutations ────────────────────────────────────────────

export const consumeTry = internalMutation({
  args: { browserId: v.string(), ipHash: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const dateKey = todayKey();

    // 1. Global daily ceiling
    const dailyRow = await ctx.db
      .query("dailyAnalytics")
      .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
      .unique();
    const dailyUsed = dailyRow?.totalCount ?? 0;
    if (dailyUsed >= MAX_ANALYSES_PER_DAY) {
      throw new Error(DAILY_CAPACITY_REACHED);
    }

    // 2. IP hourly rate limit
    const ipRow = await ctx.db
      .query("ipRateLimit")
      .withIndex("by_ipHash", (q) => q.eq("ipHash", args.ipHash))
      .unique();

    if (ipRow) {
      const windowExpired = now - ipRow.windowStart > IP_WINDOW_MS;
      if (windowExpired) {
        await ctx.db.patch(ipRow._id, { windowStart: now, requestCount: 1 });
      } else {
        if (ipRow.requestCount >= IP_HOURLY_LIMIT) {
          throw new Error(IP_RATE_LIMITED);
        }
        await ctx.db.patch(ipRow._id, { requestCount: ipRow.requestCount + 1 });
      }
    } else {
      await ctx.db.insert("ipRateLimit", {
        ipHash: args.ipHash,
        windowStart: now,
        requestCount: 1,
      });
    }

    // 3. Browser allowance
    const browserRow = await ctx.db
      .query("browserQuota")
      .withIndex("by_browserId", (q) => q.eq("browserId", args.browserId))
      .unique();
    const browserUsed = browserRow?.tryCount ?? 0;
    if (browserUsed >= BROWSER_LIMIT) {
      throw new Error(TRY_LIMIT_REACHED);
    }

    // All checks passed — increment counters
    if (browserRow) {
      await ctx.db.patch(browserRow._id, { tryCount: browserUsed + 1, updatedAt: now });
    } else {
      await ctx.db.insert("browserQuota", {
        browserId: args.browserId,
        tryCount: 1,
        updatedAt: now,
      });
    }

    if (dailyRow) {
      await ctx.db.patch(dailyRow._id, { totalCount: dailyUsed + 1, updatedAt: now });
    } else {
      await ctx.db.insert("dailyAnalytics", {
        dateKey,
        totalCount: 1,
        updatedAt: now,
      });
    }

    // Issue nonce. browserId rides along so the session it creates has an owner
    // that /web-try/discard can authorize against.
    const nonce = crypto.randomUUID();
    await ctx.db.insert("tryNonces", {
      nonce,
      ipHash: args.ipHash,
      browserId: args.browserId,
      used: false,
      expiresAt: now + NONCE_TTL_MS,
    });

    return { nonce };
  },
});

// ── Nonce / session (unchanged) ──────────────────────────

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
        ...(nonceRow.browserId ? { browserId: nonceRow.browserId } : {}),
        createdAt: Date.now(),
      });
    }
  },
});

// True when the visitor consented to keep this screenshot as a learning record,
// which exempts it from both deletion paths below.
async function isImageRetained(
  ctx: { db: MutationCtx["db"] },
  storageId: Id<"_storage">,
): Promise<boolean> {
  const record = await ctx.db
    .query("learningRecords")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .unique();
  return record?.imageRetained === true;
}

// Deletes the uploaded screenshot once the visitor closes the demo. Only the
// browser that created the session may delete it.
export const discardSession = internalMutation({
  args: { storageId: v.id("_storage"), browserId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("trySessions")
      .withIndex("by_storageId", (q) => q.eq("storageId", args.storageId))
      .unique();

    if (!session || session.browserId !== args.browserId) return;

    if (!(await isImageRetained(ctx, args.storageId))) {
      await ctx.storage.delete(args.storageId);
    }
    await ctx.db.delete(session._id);
  },
});

// Hourly cleanup. Sweeps storage as well as sessions: the client uploads before
// calling /web-try/consume, so a failure in between leaves a blob with no
// session row that a session-only sweep would never find.
export const sweepExpiredSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - RETENTION_MS;

    const staleSessions = await ctx.db
      .query("trySessions")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(SWEEP_BATCH);

    for (const session of staleSessions) {
      if (!(await isImageRetained(ctx, session.storageId))) {
        await ctx.storage.delete(session.storageId);
      }
      await ctx.db.delete(session._id);
    }

    const oldFiles = await ctx.db.system.query("_storage").order("asc").take(SWEEP_BATCH);

    for (const file of oldFiles) {
      if (file._creationTime >= cutoff) break;

      const session = await ctx.db
        .query("trySessions")
        .withIndex("by_storageId", (q) => q.eq("storageId", file._id))
        .unique();

      // The stale-session loop above already removed the session row for
      // retained images, so the retention check has to be repeated here.
      if (!session && !(await isImageRetained(ctx, file._id))) {
        await ctx.storage.delete(file._id);
      }
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

// Legacy — kept for old tryQuota rows; not used for new flow
export const getQuotaForIp = internalQuery({
  args: { ipHash: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("tryQuota")
      .withIndex("by_ipHash", (q) => q.eq("ipHash", args.ipHash))
      .unique();
    const used = row?.tryCount ?? 0;
    return { limit: BROWSER_LIMIT, used, remaining: Math.max(0, BROWSER_LIMIT - used) };
  },
});
