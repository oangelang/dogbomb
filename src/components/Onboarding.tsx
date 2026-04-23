"use client";

import { useRef, useState } from "react";
import { saveDogPhotos } from "@/lib/db";

interface Props {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    // Show previews immediately
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...urls]);
    setError("");
    setSaving(true);

    try {
      await saveDogPhotos(files);
    } catch {
      setError("Couldn't save photos. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleContinue() {
    if (!previews.length) {
      inputRef.current?.click();
      return;
    }
    onComplete();
  }

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
              {previews.length} dog photo{previews.length > 1 ? "s" : ""} ready to photobomb
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {previews.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Dog ${i + 1}`}
                  className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
                />
              ))}
            </div>
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
          disabled={saving}
          className="w-full py-4 px-6 rounded-2xl border-2 border-dashed border-slate-500 text-slate-300 hover:border-white hover:text-white transition-colors text-center cursor-pointer disabled:opacity-50"
        >
          {saving ? "Saving..." : previews.length > 0 ? "Add more dog photos" : "Choose dog photos from your camera roll"}
        </button>

        {/* Continue button */}
        {previews.length > 0 && (
          <button
            onClick={handleContinue}
            className="w-full py-4 px-6 rounded-2xl bg-white text-slate-900 font-semibold text-lg hover:bg-slate-100 transition-colors"
          >
            Start photobombing →
          </button>
        )}

        <p className="text-slate-500 text-xs text-center">
          Photos are stored only on your device. You can manage them in Settings.
        </p>
      </div>
    </div>
  );
}
