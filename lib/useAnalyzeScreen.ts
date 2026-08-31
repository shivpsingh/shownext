"use client";

import { useAction, useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { MAX_CLARIFICATION_ROUNDS, type ScreenAnalysis } from "../lib/webTry";

export function useAnalyzeScreen() {
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const analyzeScreen = useAction(api.analyze.analyzeScreen);

  const uploadAndAnalyze = useCallback(
    async (blob: Blob, context?: string) => {
      const uploadUrl = await generateUploadUrl();
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

      const trimmedContext = context?.trim();
      const analysis = (await analyzeScreen({
        storageId: payload.storageId,
        ...(trimmedContext ? { clarification: trimmedContext } : {}),
      })) as ScreenAnalysis;
      return { analysis, storageId: payload.storageId };
    },
    [analyzeScreen, generateUploadUrl],
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
