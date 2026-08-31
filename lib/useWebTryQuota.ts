"use client";

import { useCallback, useEffect, useState } from "react";
import { getConvexSiteUrl } from "./convexSite";

export const TRY_LIMIT_REACHED = "TRY_LIMIT_REACHED";
export const DAILY_CAPACITY_REACHED = "DAILY_CAPACITY_REACHED";
export const IP_RATE_LIMITED = "IP_RATE_LIMITED";

export type QuotaReason = "browser_limit" | "daily_capacity" | "ip_rate_limited" | null;

export type TryQuota = {
  remaining: number;
  limit: number;
  used: number;
  reason: QuotaReason;
};

const STORAGE_KEY = "shownext_browser_id";

function getBrowserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

const DEFAULT_QUOTA: TryQuota = { remaining: 5, limit: 5, used: 0, reason: null };

export function useWebTryQuota() {
  const [quota, setQuota] = useState<TryQuota>(DEFAULT_QUOTA);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<TryQuota> => {
    const siteUrl = getConvexSiteUrl();
    const browserId = getBrowserId();
    if (!siteUrl || !browserId) {
      setQuota(DEFAULT_QUOTA);
      return DEFAULT_QUOTA;
    }

    try {
      const response = await fetch(
        `${siteUrl}/web-try/quota?browserId=${encodeURIComponent(browserId)}`,
      );
      if (!response.ok) {
        setQuota(DEFAULT_QUOTA);
        return DEFAULT_QUOTA;
      }
      const data = (await response.json()) as TryQuota;
      setQuota(data);
      return data;
    } catch {
      setQuota(DEFAULT_QUOTA);
      return DEFAULT_QUOTA;
    }
  }, []);

  const consumeTry = useCallback(async (): Promise<string> => {
    const siteUrl = getConvexSiteUrl();
    const browserId = getBrowserId();
    if (!siteUrl || !browserId) {
      throw new Error("Convex is not configured.");
    }

    const response = await fetch(`${siteUrl}/web-try/consume`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ browserId }),
    });

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
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  return { ...quota, loading, refresh, consumeTry };
}
