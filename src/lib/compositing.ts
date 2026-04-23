import type { PlacementParams } from "./placement";

export async function captureWithDog(
  video: HTMLVideoElement,
  dogBlob: Blob,
  placement: PlacementParams
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // 1. Draw the video frame
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // 2. Load dog image from blob
  const dogImg = new Image();
  const dogUrl = URL.createObjectURL(dogBlob);
  await new Promise<void>((resolve, reject) => {
    dogImg.onload = () => resolve();
    dogImg.onerror = reject;
    dogImg.src = dogUrl;
  });
  URL.revokeObjectURL(dogUrl);

  // 3. Compute pixel dimensions from placement fractions
  const dogW = placement.sizeFraction * canvas.width;
  const dogH = dogW; // square, for circular crop
  const dogX = placement.xFraction * canvas.width;
  const dogY = placement.yFraction * canvas.height;

  // 4. Draw dog with rotation around its center, circular clip, and drop shadow
  ctx.save();
  ctx.translate(dogX + dogW / 2, dogY + dogH / 2);
  ctx.rotate((placement.rotateDeg * Math.PI) / 180);

  // Circular clip
  ctx.beginPath();
  ctx.arc(0, 0, dogW / 2, 0, Math.PI * 2);
  ctx.clip();

  // Drop shadow (drawn before the image)
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = Math.round(dogW * 0.08);
  ctx.shadowOffsetY = Math.round(dogW * 0.04);

  ctx.drawImage(dogImg, -dogW / 2, -dogH / 2, dogW, dogH);
  ctx.restore();

  // 5. Export as JPEG blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("canvas.toBlob returned null")),
      "image/jpeg",
      0.92
    );
  });
}
