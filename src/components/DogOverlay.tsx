"use client";

import { useEffect, useRef, useState } from "react";
import type { PlacementParams } from "@/lib/placement";

interface Props {
  dogBlob: Blob;
  placement: PlacementParams;
  animationKey: number; // increment to re-trigger entrance animation
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

  return (
    <img
      key={animationKey}
      src={src}
      alt="Dog photobomb"
      className="dog-overlay"
      style={{
        position: "absolute",
        left: `${placement.xFraction * 100}%`,
        top: `${placement.yFraction * 100}%`,
        width: `${placement.sizeFraction * 100}%`,
        aspectRatio: "1",
        objectFit: "cover",
        borderRadius: "50%",
        transform: `rotate(${placement.rotateDeg}deg)`,
        filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.7))",
        pointerEvents: "none",
        animation: "dogBomb 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        border: "3px solid rgba(255,255,255,0.85)",
        zIndex: 10,
      }}
    />
  );
}
