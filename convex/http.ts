import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  TRY_LIMIT_REACHED,
  DAILY_CAPACITY_REACHED,
  IP_RATE_LIMITED,
} from "./tryQuota";

const http = httpRouter();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

async function hashIp(ip: string): Promise<string> {
  const salt = process.env.IP_HASH_SALT ?? "shownext-dev-salt";
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  const allowed =
    !origin ||
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:") ||
    origin.includes("vercel.app") ||
    origin.includes("shownext");

  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(request),
    },
  });
}

// ── OPTIONS preflight ────────────────────────────────────

for (const path of ["/web-try/quota", "/web-try/consume", "/web-try/upload-url"]) {
  http.route({
    path,
    method: "OPTIONS",
    handler: httpAction(async (_ctx, request) => {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }),
  });
}

// ── GET /web-try/quota?browserId=xxx ─────────────────────

http.route({
  path: "/web-try/quota",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const browserId = url.searchParams.get("browserId") ?? "";

    if (!browserId) {
      return jsonResponse(request, { limit: 5, used: 0, remaining: 5, reason: null });
    }

    const quota = await ctx.runQuery(internal.tryQuota.getQuota, { browserId });
    return jsonResponse(request, quota);
  }),
});

// ── POST /web-try/consume { browserId } ──────────────────

http.route({
  path: "/web-try/consume",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const ipHash = await hashIp(getClientIp(request));
    let browserId = "";

    try {
      const body = (await request.json()) as { browserId?: string };
      browserId = body.browserId ?? "";
    } catch {
      // empty body is fine, browserId will be ""
    }

    if (!browserId) {
      return jsonResponse(request, { error: "browserId is required" }, 400);
    }

    try {
      const result = await ctx.runMutation(internal.tryQuota.consumeTry, {
        browserId,
        ipHash,
      });
      return jsonResponse(request, result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes(DAILY_CAPACITY_REACHED)) {
        return jsonResponse(request, { error: DAILY_CAPACITY_REACHED }, 429);
      }
      if (msg.includes(IP_RATE_LIMITED)) {
        return jsonResponse(request, { error: IP_RATE_LIMITED }, 429);
      }
      if (msg.includes(TRY_LIMIT_REACHED)) {
        return jsonResponse(request, { error: TRY_LIMIT_REACHED }, 429);
      }
      throw error;
    }
  }),
});

// ── POST /web-try/upload-url { browserId } ───────────────

http.route({
  path: "/web-try/upload-url",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    let browserId = "";
    try {
      const body = (await request.json()) as { browserId?: string };
      browserId = body.browserId ?? "";
    } catch {
      // empty body
    }

    if (!browserId) {
      return jsonResponse(request, { error: "browserId is required" }, 400);
    }

    const quota = await ctx.runQuery(internal.tryQuota.getQuota, { browserId });
    if (quota.remaining === 0) {
      const errorCode = quota.reason === "daily_capacity"
        ? DAILY_CAPACITY_REACHED
        : TRY_LIMIT_REACHED;
      return jsonResponse(request, { error: errorCode }, 429);
    }

    const uploadUrl = await ctx.storage.generateUploadUrl();
    return jsonResponse(request, { uploadUrl });
  }),
});

export default http;
