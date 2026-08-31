"use client";

import { useAction } from "convex/react";
import { useCallback } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { getConvexSiteUrl } from "./convexSite";
import { TRY_LIMIT_REACHED } from "./useWebTryQuota";
import { MAX_CLARIFICATION_ROUNDS, type ScreenAnalysis } from "../lib/webTry";

async function fetchSiteEndpoint<T>(path: string, method = "POST"): Promise<T> {
  const siteUrl = getConvexSiteUrl();
  if (!siteUrl) throw new Error("Convex is not configured.");
  const res = await fetch(`${siteUrl}${path}`, { method });
  if (res.status === 429) {
    const body = (await res.json()) as { error?: string };
    throw new Error(body.error ?? TRY_LIMIT_REACHED);
  }
  if (!res.ok) throw new Error(`Request to ${path} failed.`);
  return (await res.json()) as T;
}

export function useAnalyzeScreen() {
  const analyzeScreen = useAction(api.analyze.analyzeScreen);

  const uploadAndAnalyze = useCallback(
    async (blob: Blob, context?: string, captureType?: string) => {
      const { uploadUrl } = await fetchSiteEndpoint<{ uploadUrl: string }>("/web-try/upload-url");
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type || "image/jpeg" },
        body: blob,
      });

      if (!uploadResponse.ok) {
        throw new Error("Could not upload the photo.");
      }

      const payload = (await uploadResponse.json()) as { storageId?: Id<"_storage"> };
      if (!payload.storageId) {
        throw new Error("Upload did not return a storage id.");
      }

      const { nonce } = await fetchSiteEndpoint<{ nonce: string }>("/web-try/consume");
      const trimmedContext = context?.trim();
      const vw = typeof window !== "undefined" ? window.innerWidth : undefined;
      const vh = typeof window !== "undefined" ? window.innerHeight : undefined;
      const analysis = (await analyzeScreen({
        storageId: payload.storageId,
        nonce,
        ...(trimmedContext ? { clarification: trimmedContext } : {}),
        ...(captureType ? { captureType } : {}),
        ...(vw ? { viewportWidth: vw } : {}),
        ...(vh ? { viewportHeight: vh } : {}),
      })) as ScreenAnalysis;
      return { analysis, storageId: payload.storageId };
    },
    [analyzeScreen],
  );

  const analyzeExisting = useCallback(
    async (storageId: Id<"_storage">, clarification: string) => {
      const analysis = (await analyzeScreen({ storageId, clarification })) as ScreenAnalysis;
      return { analysis, storageId };
    },
    [analyzeScreen],
  );

  return { uploadAndAnalyze, analyzeExisting, maxClarificationRounds: MAX_CLARIFICATION_ROUNDS };
}
