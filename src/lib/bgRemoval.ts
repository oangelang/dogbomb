"use client";

import { removeBackground } from "@imgly/background-removal";

/**
 * Removes the background from a dog photo, returning a transparent PNG blob.
 * Falls back to the original blob if removal fails.
 */
export async function removeDogBackground(
  blob: Blob,
  onProgress?: (pct: number) => void
): Promise<Blob> {
  try {
    const result = await removeBackground(blob, {
      output: {
        format: "image/png",
        quality: 0.85,
      },
      progress: onProgress
        ? (_key: string, current: number, total: number) => {
            if (total > 0) onProgress(current / total);
          }
        : undefined,
    });
    return result;
  } catch (err) {
    console.warn("Background removal failed, keeping original:", err);
    return blob; // graceful fallback
  }
}
