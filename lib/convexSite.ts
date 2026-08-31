export function getConvexCloudUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  return url || null;
}

export function getConvexSiteUrl(): string | null {
  const url = getConvexCloudUrl();
  if (!url) return null;
  if (url.includes("127.0.0.1") || url.includes("localhost")) {
    return url.replace(/\/$/, "");
  }
  return url.replace(".convex.cloud", ".convex.site").replace(/\/$/, "");
}

export function isLocalConvexUrl(): boolean {
  const url = getConvexCloudUrl() ?? "";
  return url.includes("127.0.0.1") || url.includes("localhost");
}
