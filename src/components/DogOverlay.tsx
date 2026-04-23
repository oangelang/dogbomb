"use client";

import { useEffect, useRef, useState } from "react";
import type { PlacementParams } from "@/lib/placement";

interface Props {
  dogBlob: Blob;          // original or background-removed PNG
  placement: PlacementParams;
  animationKey: number;   // increment to re-trigger entrance animation
}

export default function DogOverlay({ dogBlob, placement, animationKey }: Props) {
  const [src, setSrc] = useState<string>("");
  const prevUrl = useRef<string>("");

  useEffect(() => {
    const url = URL.createObjectURL(dogBlob);
    setSrc(url);
    const old = prevUrl.current;
    prevUrl.current = url;
    return () => {
      URL.revokeObjectURL(old);
    };
  }, [dogBlob]);

  if (!src) return null;

  const hasTransparency = dogBlob.type === "image/png";

  return (
    <img
      key={animationKey}
      src={src}
      alt="Dog photobomb"
      style={{
        position: "absolute",
        left: `${placement.xFraction * 100}%`,
        top: `${placement.yFraction * 100}%`,
        width: `${placement.sizeFraction * 100}%`,
        height: "auto",
        objectFit: "contain",
        // Circular clip only as fallback for unprocessed originals
        borderRadius: hasTransparency ? "0" : "50%",
        transform: `rotate(${placement.rotateDeg}deg)`,
        transformOrigin: "center center",
        filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.65))",
        pointerEvents: "none",
        animation: "dogBomb 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        zIndex: 10,
      }}
    />
  );
}
