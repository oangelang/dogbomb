export interface PlacementParams {
  xFraction: number; // left edge as fraction of container width (can be negative = peeking)
  yFraction: number; // top edge as fraction of container height
  sizeFraction: number; // dog width as fraction of container width (0.20–0.35)
  rotateDeg: number; // -15 to +15
  dogPhotoIndex: number; // index into loaded dog photos array
}

type EdgeZone =
  | "bottom-left"
  | "bottom-right"
  | "bottom-center"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "float";

export function randomPlacement(dogPhotoCount: number): PlacementParams {
  const dogPhotoIndex = Math.floor(Math.random() * dogPhotoCount);
  const sizeFraction = 0.2 + Math.random() * 0.15; // 20–35% of width
  const rotateDeg = (Math.random() - 0.5) * 30; // -15 to +15

  // Photobomb zones — corners weighted 2x, most natural for sneaking in
  const zones: EdgeZone[] = [
    "bottom-left",
    "bottom-left",
    "bottom-right",
    "bottom-right",
    "bottom-center",
    "left",
    "right",
    "top-left",
    "top-right",
    "float",
  ];
  const zone = zones[Math.floor(Math.random() * zones.length)];

  // peek: fraction of dog that's visible (30–60%)
  const peek = 0.3 + Math.random() * 0.3;

  let xFraction: number;
  let yFraction: number;

  switch (zone) {
    case "bottom-left":
      xFraction = -sizeFraction * (1 - peek);
      yFraction = 1 - sizeFraction * peek * 0.7;
      break;
    case "bottom-right":
      xFraction = 1 - sizeFraction * peek;
      yFraction = 1 - sizeFraction * peek * 0.7;
      break;
    case "bottom-center":
      xFraction = 0.5 - sizeFraction / 2;
      yFraction = 1 - sizeFraction * peek * 0.6;
      break;
    case "left":
      xFraction = -sizeFraction * (1 - peek);
      yFraction = 0.3 + Math.random() * 0.4;
      break;
    case "right":
      xFraction = 1 - sizeFraction * peek;
      yFraction = 0.3 + Math.random() * 0.4;
      break;
    case "top-left":
      xFraction = -sizeFraction * (1 - peek);
      yFraction = -sizeFraction * (1 - peek) * 0.5;
      break;
    case "top-right":
      xFraction = 1 - sizeFraction * peek;
      yFraction = -sizeFraction * (1 - peek) * 0.5;
      break;
    case "float":
    default:
      xFraction = 0.1 + Math.random() * 0.6;
      yFraction = 0.1 + Math.random() * 0.6;
      break;
  }

  return { xFraction, yFraction, sizeFraction, rotateDeg, dogPhotoIndex };
}
