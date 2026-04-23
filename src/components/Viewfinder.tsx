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

export default function Viewfinder({ dogPhotos, onCapture, onOpenSettings }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [placement, setPlacement] = useState<PlacementParams>(() =>
    randomPlacement(dogPhotos.length)
  );
  const [animKey, setAnimKey] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [fallbackFile, setFallbackFile] = useState<File | null>(null);
  const fallbackInputRef = useRef<HTMLInputElement>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError(true);
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  function surprise() {
    setPlacement(randomPlacement(dogPhotos.length));
    setAnimKey((k) => k + 1);
  }

  async function handleShutter() {
    if (capturing) return;
    setCapturing(true);
    try {
      const dog = dogPhotos[placement.dogPhotoIndex];
      let blob: Blob;

      if (cameraError && fallbackFile) {
        // Fallback: composite onto the selected file image
        const img = new Image();
        const fileUrl = URL.createObjectURL(fallbackFile);
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = rej;
          img.src = fileUrl;
        });
        URL.revokeObjectURL(fileUrl);

        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        // We'll re-use captureWithDog logic but need a video-like object
        // Instead, just composite manually
        const dogImg = new Image();
        const dogUrl = URL.createObjectURL(dog.blob);
        await new Promise<void>((res, rej) => {
          dogImg.onload = () => res();
          dogImg.onerror = rej;
          dogImg.src = dogUrl;
        });
        URL.revokeObjectURL(dogUrl);

        const dogW = placement.sizeFraction * canvas.width;
        const dogH = dogW;
        const dogX = placement.xFraction * canvas.width;
        const dogY = placement.yFraction * canvas.height;
        ctx.save();
        ctx.translate(dogX + dogW / 2, dogY + dogH / 2);
        ctx.rotate((placement.rotateDeg * Math.PI) / 180);
        ctx.beginPath();
        ctx.arc(0, 0, dogW / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = Math.round(dogW * 0.08);
        ctx.shadowOffsetY = Math.round(dogW * 0.04);
        ctx.drawImage(dogImg, -dogW / 2, -dogH / 2, dogW, dogH);
        ctx.restore();

        blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob(
            (b) => (b ? res(b) : rej(new Error("toBlob failed"))),
            "image/jpeg",
            0.92
          )
        );
      } else if (videoRef.current) {
        blob = await captureWithDog(videoRef.current, dog.blob, placement);
      } else {
        return;
      }

      // Pre-generate next placement
      setPlacement(randomPlacement(dogPhotos.length));
      setAnimKey((k) => k + 1);
      onCapture(blob);
    } catch (err) {
      console.error("Capture failed:", err);
    } finally {
      setCapturing(false);
    }
  }

  // Fallback: user picks a photo from camera roll instead
  async function handleFallbackFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFallbackFile(file);
  }

  const currentDog = dogPhotos[placement.dogPhotoIndex];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-dvh bg-black overflow-hidden"
      style={{ height: "100dvh" }}
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
            Camera access unavailable.{" "}
            {fallbackFile ? "Photo loaded! Hit the shutter." : "Pick a photo to photobomb instead."}
          </p>
          {fallbackFile && (
            <img
              src={URL.createObjectURL(fallbackFile)}
              alt="Selected"
              className="max-h-64 rounded-xl object-cover"
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
          dogBlob={currentDog.blob}
          placement={placement}
          animationKey={animKey}
        />
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex justify-end p-4 pt-safe">
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
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8 pb-8"
        style={{ paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}
      >
        {/* Surprise button */}
        <button
          onClick={surprise}
          className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-2xl"
          aria-label="Randomize dog position"
          title="Surprise me"
        >
          🎲
        </button>

        {/* Shutter */}
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

        {/* Spacer */}
        <div className="w-12" />
      </div>
    </div>
  );
}
