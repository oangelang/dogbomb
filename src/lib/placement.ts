export interface PlacementParams {
  xFraction: number;    // left edge as fraction of container width — always in [0, 1-sizeFraction]
  yFraction: number;    // top edge as fraction of container height — always in [0, 1-sizeFraction]
  sizeFraction: number; // dog width as fraction of container width (0.18–0.32)
  rotateDeg: number;    // -12 to +12
  dogPhotoIndex: number;
}

type Zone =
  | "bottom-left"
  | "bottom-right"
  | "bottom-center"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "center";

export function randomPlacement(dogPhotoCount: number): PlacementParams {
  const dogPhotoIndex = Math.floor(Math.random() * dogPhotoCount);
  const sizeFraction = 0.18 + Math.random() * 0.14; // 18–32% of width
  const rotateDeg = (Math.random() - 0.5) * 24;     // -12 to +12

  // Always keep the dog fully inside the frame.
  // The dog occupies [xFraction, xFraction + sizeFraction] × [yFraction, yFraction + sizeFraction].
  // So xFraction must be in [edge, 1 - sizeFraction - edge].
  const edge = 0.03; // 3% breathing room from the frame border
  const minX = edge;
  const maxX = 1 - sizeFraction - edge;
  const minY = edge;
  const maxY = 1 - sizeFraction - edge;

  // Weighted zone selection — bottom corners dominate (most photobomb-like)
  const zones: Zone[] = [
    "bottom-left", "bottom-left",
    "bottom-right", "bottom-right",
    "bottom-center",
    "left", "right",
    "top-left", "top-right",
    "center",
  ];
  const zone = zones[Math.floor(Math.random() * zones.length)];

  // Small jitter within each zone so repeated placements don't land identically
  const jitter = () => (Math.random() - 0.5) * 0.06;

  let xFraction: number;
  let yFraction: number;

  switch (zone) {
    case "bottom-left":
      xFraction = minX + jitter();
      yFraction = maxY + jitter();
      break;
    case "bottom-right":
      xFraction = maxX + jitter();
      yFraction = maxY + jitter();
      break;
    case "bottom-center":
      xFraction = (minX + maxX) / 2 + jitter();
      yFraction = maxY + jitter();
      break;
    case "left":
      xFraction = minX + jitter();
      yFraction = minY + Math.random() * (maxY - minY);
      break;
    case "right":
      xFraction = maxX + jitter();
      yFraction = minY + Math.random() * (maxY - minY);
      break;
    case "top-left":
      xFraction = minX + jitter();
      yFraction = minY + jitter();
      break;
    case "top-right":
      xFraction = maxX + jitter();
      yFraction = minY + jitter();
      break;
    case "center":
    default:
      xFraction = (minX + maxX) / 2 + jitter();
      yFraction = (minY + maxY) / 2 + jitter();
      break;
  }

  // Hard clamp — ensures we never exceed bounds regardless of jitter
  xFraction = Math.max(minX, Math.min(maxX, xFraction));
  yFraction = Math.max(minY, Math.min(maxY, yFraction));

  return { xFraction, yFraction, sizeFraction, rotateDeg, dogPhotoIndex };
}
