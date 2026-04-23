import type { PlacementParams } from "./placement";

type ImageSource = HTMLVideoElement | HTMLImageElement;

function getSourceSize(source: ImageSource): { w: number; h: number } {
  if (source instanceof HTMLVideoElement) {
    return { w: source.videoWidth, h: source.videoHeight };
  }
  return { w: source.naturalWidth, h: source.naturalHeight };
}

export async function captureWithDog(
  source: ImageSource,
  dogBlob: Blob,
  placement: PlacementParams
): Promise<Blob> {
  const { w, h } = getSourceSize(source);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // 1. Draw the source (video frame or image)
  ctx.drawImage(source, 0, 0, w, h);

  // 2. Load dog image
  const dogImg = new Image();
  const dogUrl = URL.createObjectURL(dogBlob);
  await new Promise<void>((resolve, reject) => {
    dogImg.onload = () => resolve();
    dogImg.onerror = reject;
    dogImg.src = dogUrl;
  });
  URL.revokeObjectURL(dogUrl);

  // 3. Compute pixel bounds — maintain natural aspect ratio of dog image
  const dogW = placement.sizeFraction * w;
  const dogH = (dogW / dogImg.naturalWidth) * dogImg.naturalHeight;
  const dogX = placement.xFraction * w;
  const dogY = placement.yFraction * h;

  // 4. Draw dog with rotation around center
  ctx.save();
  ctx.translate(dogX + dogW / 2, dogY + dogH / 2);
  ctx.rotate((placement.rotateDeg * Math.PI) / 180);

  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = Math.round(dogW * 0.07);
  ctx.shadowOffsetY = Math.round(dogW * 0.04);

  const hasTransparency = dogBlob.type === "image/png";
  if (!hasTransparency) {
    // Fallback for unprocessed originals: circular clip
    ctx.beginPath();
    ctx.arc(0, 0, dogW / 2, 0, Math.PI * 2);
    ctx.clip();
  }

  ctx.drawImage(dogImg, -dogW / 2, -dogH / 2, dogW, dogH);
  ctx.restore();

  // 5. Export as JPEG
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("canvas.toBlob returned null")),
      "image/jpeg",
      0.92
    );
  });
}
