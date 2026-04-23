"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { DogPhoto } from "@/lib/db";
import type { PlacementParams } from "@/lib/placement";
import { randomPlacement } from "@/lib/placement";
import { captureWithDog } from "@/lib/compositing";
import DogOverlay from "./DogOverlay";

interface Props {
  dogPhotos: DogPhoto[];
  onCapture: (blob: Blob) => void;
  onOpenSettings: () => void;
}

interface GestureState {
  type: "none" | "drag" | "pinch";
  // drag: start touch position + placement at gesture start
  startTouchX: number;
  startTouchY: number;
  startXFraction: number;
  startYFraction: number;
  // pinch: initial two-finger distance + size at gesture start
  startDistance: number;
  startSizeFraction: number;
}

function touchDistance(t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }) {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

export default function Viewfinder({ dogPhotos, onCapture, onOpenSettings }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fallbackImgRef = useRef<HTMLImageElement | null>(null);

  const [placement, setPlacement] = useState<PlacementParams>(() =>
    randomPlacement(dogPhotos.length)
  );
  // Mirror placement into a ref so gesture closures always see current value
  const placementRef = useRef(placement);
  useEffect(() => { placementRef.current = placement; }, [placement]);

  const [animKey, setAnimKey] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [fallbackFile, setFallbackFile] = useState<File | null>(null);
  const [showHint, setShowHint] = useState(true);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  const gestureRef = useRef<GestureState>({
    type: "none",
    startTouchX: 0, startTouchY: 0,
    startXFraction: 0, startYFraction: 0,
    startDistance: 0, startSizeFraction: 0,
  });

  // Hide the gesture hint after a few seconds
  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 3500);
    return () => clearTimeout(t);
  }, []);

  // ── Camera ──────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraError(true);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [startCamera]);

  // ── Gesture handling ─────────────────────────────────────────────────────
  // Attach touchmove as non-passive so we can preventDefault (blocks page scroll/zoom)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchMove(e: TouchEvent) {
      const g = gestureRef.current;
      if (g.type === "none") return;
      e.preventDefault();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const sz = placementRef.current.sizeFraction;

      if (g.type === "drag" && e.touches.length >= 1) {
        const dx = (e.touches[0].clientX - g.startTouchX) / rect.width;
        const dy = (e.touches[0].clientY - g.startTouchY) / rect.height;
        const newX = Math.max(0.01, Math.min(0.99 - sz, g.startXFraction + dx));
        const newY = Math.max(0.01, Math.min(0.99 - sz, g.startYFraction + dy));
        setPlacement((prev) => ({ ...prev, xFraction: newX, yFraction: newY }));
      } else if (g.type === "pinch" && e.touches.length >= 2) {
        const newDist = touchDistance(e.touches[0], e.touches[1]);
        const scale = newDist / g.startDistance;
        const newSize = Math.max(0.08, Math.min(0.75, g.startSizeFraction * scale));

        // Move dog to track the pinch midpoint too
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const dx = (midX - g.startTouchX) / rect.width;
        const dy = (midY - g.startTouchY) / rect.height;
        const newX = Math.max(0.01, Math.min(0.99 - newSize, g.startXFraction + dx));
        const newY = Math.max(0.01, Math.min(0.99 - newSize, g.startYFraction + dy));
        setPlacement((prev) => ({ ...prev, sizeFraction: newSize, xFraction: newX, yFraction: newY }));
      }
    }

    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    // Don't intercept touches on control buttons
    if ((e.target as HTMLElement).closest("button")) return;
    setShowHint(false);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const p = placementRef.current;

    if (e.touches.length === 1) {
      gestureRef.current = {
        type: "drag",
        startTouchX: e.touches[0].clientX,
        startTouchY: e.touches[0].clientY,
        startXFraction: p.xFraction,
        startYFraction: p.yFraction,
        startDistance: 0,
        startSizeFraction: p.sizeFraction,
      };
    } else if (e.touches.length === 2) {
      gestureRef.current = {
        type: "pinch",
        startTouchX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        startTouchY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        startXFraction: p.xFraction,
        startYFraction: p.yFraction,
        startDistance: touchDistance(e.touches[0], e.touches[1]),
        startSizeFraction: p.sizeFraction,
      };
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length === 0) {
      gestureRef.current.type = "none";
    } else if (e.touches.length === 1 && gestureRef.current.type === "pinch") {
      // Dropped from pinch back to single finger — resume as drag
      const p = placementRef.current;
      gestureRef.current = {
        ...gestureRef.current,
        type: "drag",
        startTouchX: e.touches[0].clientX,
        startTouchY: e.touches[0].clientY,
        startXFraction: p.xFraction,
        startYFraction: p.yFraction,
      };
    }
  }

  // ── Shutter ──────────────────────────────────────────────────────────────
  function surprise() {
    setPlacement(randomPlacement(dogPhotos.length));
    setAnimKey((k) => k + 1);
  }

  async function handleShutter() {
    if (capturing) return;
    setCapturing(true);
    try {
      const dog = dogPhotos[placement.dogPhotoIndex];
      const dogBlob = dog.processedBlob ?? dog.blob;
      let blob: Blob;

      if (cameraError && fallbackImgRef.current) {
        blob = await captureWithDog(fallbackImgRef.current, dogBlob, placement);
      } else if (videoRef.current) {
        blob = await captureWithDog(videoRef.current, dogBlob, placement);
      } else {
        return;
      }

      setPlacement(randomPlacement(dogPhotos.length));
      setAnimKey((k) => k + 1);
      onCapture(blob);
    } catch (err) {
      console.error("Capture failed:", err);
    } finally {
      setCapturing(false);
    }
  }

  async function handleFallbackFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFallbackFile(file);
    // Pre-load into an img element so captureWithDog can use it
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await new Promise((res) => { img.onload = res; });
    fallbackImgRef.current = img;
  }

  const currentDog = dogPhotos[placement.dogPhotoIndex];

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black overflow-hidden select-none"
      style={{ height: "100dvh", touchAction: "none" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Camera feed or fallback */}
      {!cameraError ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white gap-4 p-6">
          <p className="text-slate-300 text-center">
            {fallbackFile
              ? "Photo loaded — drag your dog around, then hit the shutter."
              : "Camera access unavailable. Pick a photo to photobomb instead."}
          </p>
          {fallbackFile && (
            <img
              src={URL.createObjectURL(fallbackFile)}
              alt="Selected"
              className="max-h-48 rounded-xl object-cover"
            />
          )}
          <input
            ref={fallbackInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFallbackFile}
          />
          <button
            onClick={() => fallbackInputRef.current?.click()}
            className="px-6 py-3 bg-white text-slate-900 rounded-full font-semibold"
          >
            {fallbackFile ? "Pick different photo" : "Take / choose photo"}
          </button>
        </div>
      )}

      {/* Dog overlay */}
      {currentDog && (
        <DogOverlay
          dogBlob={currentDog.processedBlob ?? currentDog.blob}
          placement={placement}
          animationKey={animKey}
        />
      )}

      {/* Gesture hint — fades away after a few seconds */}
      {showHint && (
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none"
          style={{ animation: "fadeOut 3.5s ease forwards" }}
        >
          <div className="bg-black/50 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full">
            drag dog · pinch to resize
          </div>
        </div>
      )}

      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex justify-end p-4"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <button
          onClick={onOpenSettings}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
          aria-label="Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Bottom controls */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={surprise}
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-2xl"
          aria-label="Randomize position"
          title="Surprise me"
        >
          🎲
        </button>

        <button
          onClick={handleShutter}
          disabled={capturing || (cameraError && !fallbackFile)}
          className="w-20 h-20 rounded-full bg-white border-4 border-white/50 active:scale-95 transition-transform disabled:opacity-40 flex items-center justify-center"
          aria-label="Take photo"
        >
          {capturing && (
            <div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          )}
        </button>

        <div className="w-12" />
      </div>
    </div>
  );
}
