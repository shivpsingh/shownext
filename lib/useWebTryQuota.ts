"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserId } from "./browserId";
import { getConvexSiteUrl } from "./convexSite";

export const TRY_LIMIT_REACHED = "TRY_LIMIT_REACHED";
export const DAILY_CAPACITY_REACHED = "DAILY_CAPACITY_REACHED";
export const IP_RATE_LIMITED = "IP_RATE_LIMITED";

export type QuotaReason = "browser_limit" | "daily_capacity" | "ip_rate_limited" | null;

export type QuotaStatus = "loading" | "ready" | "unavailable";

export type TryQuota = {
  remaining: number;
  limit: number;
  used: number;
  reason: QuotaReason;
};

export type TryQuotaState = TryQuota & { status: QuotaStatus };

// Never assume an allowance the backend has not confirmed.
const UNKNOWN_QUOTA: TryQuotaState = {
  remaining: 0,
  limit: 0,
  used: 0,
  reason: null,
  status: "unavailable",
};

export function useWebTryQuota() {
  const [state, setState] = useState<TryQuotaState>({ ...UNKNOWN_QUOTA, status: "loading" });

  const refresh = useCallback(async (): Promise<TryQuotaState> => {
    const siteUrl = getConvexSiteUrl();
    const browserId = getBrowserId();
    if (!siteUrl || !browserId) {
      setState(UNKNOWN_QUOTA);
      return UNKNOWN_QUOTA;
    }

    try {
      const response = await fetch(
        `${siteUrl}/web-try/quota?browserId=${encodeURIComponent(browserId)}`,
      );
      if (!response.ok) {
        setState(UNKNOWN_QUOTA);
        return UNKNOWN_QUOTA;
      }
      const data = (await response.json()) as TryQuota;
      const next: TryQuotaState = { ...data, status: "ready" };
      setState(next);
      return next;
    } catch {
      setState(UNKNOWN_QUOTA);
      return UNKNOWN_QUOTA;
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
    void refresh();
  }, [refresh]);

  return { ...state, refresh, consumeTry };
}
