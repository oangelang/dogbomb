import type { PlacementParams } from "./placement";

export async function captureWithDog(
  video: HTMLVideoElement,
  dogBlob: Blob, // original JPEG or background-removed PNG
  placement: PlacementParams
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  // 1. Draw the video frame
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // 2. Load dog image
  const dogImg = new Image();
  const dogUrl = URL.createObjectURL(dogBlob);
  await new Promise<void>((resolve, reject) => {
    dogImg.onload = () => resolve();
    dogImg.onerror = reject;
    dogImg.src = dogUrl;
  });
  URL.revokeObjectURL(dogUrl);

  // 3. Compute pixel bounds from placement fractions
  const dogW = placement.sizeFraction * canvas.width;
  // Maintain the natural aspect ratio of the dog image
  const dogH = (dogW / dogImg.naturalWidth) * dogImg.naturalHeight;
  const dogX = placement.xFraction * canvas.width;
  const dogY = placement.yFraction * canvas.height;

  // 4. Draw dog with rotation around its center
  ctx.save();
  ctx.translate(dogX + dogW / 2, dogY + dogH / 2);
  ctx.rotate((placement.rotateDeg * Math.PI) / 180);

  const hasTransparency = dogBlob.type === "image/png";

  if (!hasTransparency) {
    // Fallback for unprocessed originals: circular clip + drop shadow
    ctx.beginPath();
    ctx.arc(0, 0, dogW / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = Math.round(dogW * 0.07);
    ctx.shadowOffsetY = Math.round(dogW * 0.04);
    ctx.drawImage(dogImg, -dogW / 2, -dogH / 2, dogW, dogH);
  } else {
    // Background-removed PNG: draw naturally — transparency handles the cutout shape
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = Math.round(dogW * 0.07);
    ctx.shadowOffsetY = Math.round(dogW * 0.04);
    ctx.drawImage(dogImg, -dogW / 2, -dogH / 2, dogW, dogH);
  }

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
