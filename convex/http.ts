import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { TRY_LIMIT_REACHED } from "./tryQuota";

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

http.route({
  path: "/web-try/quota",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }),
});

http.route({
  path: "/web-try/quota",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const ipHash = await hashIp(getClientIp(request));
    const quota = await ctx.runQuery(internal.tryQuota.getQuotaForIp, { ipHash });
    return jsonResponse(request, quota);
  }),
});

http.route({
  path: "/web-try/consume",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }),
});

http.route({
  path: "/web-try/consume",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const ipHash = await hashIp(getClientIp(request));
    try {
      const result = await ctx.runMutation(internal.tryQuota.consumeTryForIp, { ipHash });
      return jsonResponse(request, result);
    } catch (error) {
      if (error instanceof Error && error.message === TRY_LIMIT_REACHED) {
        return jsonResponse(request, { error: TRY_LIMIT_REACHED }, 429);
      }
      throw error;
    }
  }),
});

http.route({
  path: "/web-try/upload-url",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, request) => {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }),
});

http.route({
  path: "/web-try/upload-url",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const ipHash = await hashIp(getClientIp(request));
    const quota = await ctx.runQuery(internal.tryQuota.getQuotaForIp, { ipHash });
    if (quota.remaining === 0) {
      return jsonResponse(request, { error: TRY_LIMIT_REACHED }, 429);
    }
    const uploadUrl = await ctx.storage.generateUploadUrl();
    return jsonResponse(request, { uploadUrl });
  }),
});

export default http;
