"use client";

import { useRef, useState } from "react";
import { saveDogPhotos, updateDogPhotoProcessed } from "@/lib/db";
import { removeDogBackground } from "@/lib/bgRemoval";

interface Props {
  onComplete: () => void;
}

interface ProcessingState {
  current: number;
  total: number;
  pct: number; // 0–1 within the current photo
}

export default function Onboarding({ onComplete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [processing, setProcessing] = useState<ProcessingState | null>(null);
  const [error, setError] = useState("");

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    // Show previews immediately
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...urls]);
    setError("");

    // 1. Save originals first so photos are usable right away
    let ids: number[];
    try {
      ids = await saveDogPhotos(files);
    } catch {
      setError("Couldn't save photos. Please try again.");
      return;
    }

    // 2. Background-remove each photo in sequence (model downloads on first call)
    for (let i = 0; i < files.length; i++) {
      setProcessing({ current: i + 1, total: files.length, pct: 0 });
      const processedBlob = await removeDogBackground(
        files[i],
        (pct) => setProcessing((s) => s ? { ...s, pct } : s)
      );
      await updateDogPhotoProcessed(ids[i], processedBlob);
    }

    setProcessing(null);
  }

  const isProcessing = processing !== null;

  return (
    <div className="min-h-dvh bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
      <div className="max-w-sm w-full flex flex-col items-center gap-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-7xl mb-4">🐾</div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">DogBomb</h1>
          <p className="text-slate-300 text-lg leading-snug">
            Your dog is about to become famous in every photo you take.
          </p>
        </div>

        {/* Dog photo previews */}
        {previews.length > 0 && (
          <div className="w-full">
            <p className="text-slate-400 text-sm mb-3 text-center">
              {previews.length} dog photo{previews.length > 1 ? "s" : ""} selected
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {previews.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Dog ${i + 1}`}
                  className="w-20 h-20 rounded-xl object-cover border-2 border-white/20"
                />
              ))}
            </div>
          </div>
        )}

        {/* Processing progress */}
        {isProcessing && (
          <div className="w-full">
            <div className="flex justify-between text-sm text-slate-300 mb-2">
              <span>Cutting out your dog… ({processing.current}/{processing.total})</span>
              <span>{Math.round(processing.pct * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-200"
                style={{
                  width: `${
                    ((processing.current - 1 + processing.pct) /
                      processing.total) *
                    100
                  }%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              First run downloads the AI model (~30 MB). Future dogs are instant.
            </p>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />

        {/* Add photos button */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isProcessing}
          className="w-full py-4 px-6 rounded-2xl border-2 border-dashed border-slate-500 text-slate-300 hover:border-white hover:text-white transition-colors text-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {previews.length > 0 ? "Add more dog photos" : "Choose dog photos from your camera roll"}
        </button>

        {/* Continue button — available once photos are saved (even while processing) */}
        {previews.length > 0 && (
          <button
            onClick={onComplete}
            disabled={isProcessing}
            className="w-full py-4 px-6 rounded-2xl bg-white text-slate-900 font-semibold text-lg hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? "Processing…" : "Start photobombing →"}
          </button>
        )}

        <p className="text-slate-500 text-xs text-center">
          Photos stay on your device. Manage them in Settings.
        </p>
      </div>
    </div>
  );
}
