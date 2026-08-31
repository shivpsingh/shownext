"use client";

import { useCallback, useEffect, useState } from "react";
import { getConvexSiteUrl } from "./convexSite";

export const TRY_LIMIT_REACHED = "TRY_LIMIT_REACHED";

export type TryQuota = {
  remaining: number;
  limit: number;
  used: number;
};

export function useWebTryQuota() {
  const [quota, setQuota] = useState<TryQuota>({ remaining: 2, limit: 2, used: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<TryQuota> => {
    const siteUrl = getConvexSiteUrl();
    if (!siteUrl) {
      const fallback: TryQuota = { remaining: 2, limit: 2, used: 0 };
      setQuota(fallback);
      return fallback;
    }

    const response = await fetch(`${siteUrl}/web-try/quota`);
    if (!response.ok) {
      throw new Error("Could not load try quota.");
    }

    const data = (await response.json()) as TryQuota;
    setQuota(data);
    return data;
  }, []);

  const consumeTry = useCallback(async (): Promise<string> => {
    const siteUrl = getConvexSiteUrl();
    if (!siteUrl) {
      throw new Error("Convex is not configured.");
    }

    const response = await fetch(`${siteUrl}/web-try/consume`, { method: "POST" });
    if (response.status === 429) {
      const body = (await response.json()) as { error?: string };
      throw new Error(body.error ?? TRY_LIMIT_REACHED);
    }

    if (!response.ok) {
      throw new Error("Could not consume try.");
    }

    const data = (await response.json()) as { nonce: string };
    return data.nonce;
  }, []);

  useEffect(() => {
    void refresh()
      .catch(() => setQuota({ remaining: 2, limit: 2, used: 0 }))
      .finally(() => setLoading(false));
  }, [refresh]);

  return { ...quota, loading, refresh, consumeTry };
}
