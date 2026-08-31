import { v } from "convex/values";
import { mutation } from "./_generated/server";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export const join = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
      throw new Error("Enter a valid email address.");
    }

    const existing = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) return { ok: true };

    await ctx.db.insert("waitlistEntries", {
      email,
      createdAt: Date.now(),
    });

    return { ok: true };
  },
});
