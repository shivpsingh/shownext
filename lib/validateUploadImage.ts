"use client";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ACCEPT_ATTRIBUTE = ALLOWED_IMAGE_TYPES.join(",");

const MAX_BYTES = 4 * 1024 * 1024;
const MAX_LONG_EDGE = 8192;
const MIN_SHORT_EDGE = 32;
const MAX_PIXELS = 25_000_000;

export type ImageValidationResult =
  | { ok: true; width: number; height: number }
  | { ok: false; message: string };

async function decodeDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      const { width, height } = bitmap;
      bitmap.close?.();
      return { width, height };
    } catch {
      return null;
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<{ width: number; height: number } | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => resolve(null);
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function validateUploadImage(file: File): Promise<ImageValidationResult> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { ok: false, message: "Choose a JPEG, PNG, or WebP photo." };
  }

  if (file.size > MAX_BYTES) {
    return { ok: false, message: "Choose a photo under 4 MB." };
  }

  const dimensions = await decodeDimensions(file);
  if (!dimensions) {
    return { ok: false, message: "That file is not a readable image. Choose a JPEG, PNG, or WebP photo." };
  }

  const { width, height } = dimensions;
  const longEdge = Math.max(width, height);
  const shortEdge = Math.min(width, height);

  if (shortEdge < MIN_SHORT_EDGE) {
    return { ok: false, message: "That image is too small to read. Choose a full screenshot." };
  }

  if (longEdge > MAX_LONG_EDGE || width * height > MAX_PIXELS) {
    return { ok: false, message: "That image is too large. Choose a normal phone screenshot." };
  }

  return { ok: true, width, height };
}
