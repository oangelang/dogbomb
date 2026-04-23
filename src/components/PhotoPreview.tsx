"use client";

import { useEffect, useState } from "react";

interface Props {
  blob: Blob;
  onRetake: () => void;
}

export default function PhotoPreview({ blob, onRetake }: Props) {
  const [src, setSrc] = useState("");
  const [sharing, setSharing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  async function handleSave() {
    if (sharing) return;
    setSharing(true);
    setSaved(false);
    setIosHint(false);

    const file = new File([blob], "dogbomb.jpg", { type: "image/jpeg" });

    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Dog Photobomb!" });
        setSaved(true);
      } else {
        // Desktop / Android fallback: programmatic download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "dogbomb.jpg";
        a.click();
        URL.revokeObjectURL(url);
        setSaved(true);
      }
    } catch (err: unknown) {
      // User cancelled share — not an error
      if (err instanceof Error && err.name !== "AbortError") {
        // iOS Safari without file share support: instruct user to long-press
        setIosHint(true);
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <div
      className="min-h-dvh bg-black flex flex-col"
      style={{ height: "100dvh" }}
    >
      {/* Photo */}
      <div className="flex-1 relative overflow-hidden">
        {src && (
          <img
            src={src}
            alt="Your photobombed photo"
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}
        {iosHint && (
          <div className="absolute bottom-4 left-4 right-4 bg-black/80 rounded-xl p-3 text-white text-sm text-center">
            Press and hold the image to save it to your Photos
          </div>
        )}
      </div>

      {/* Controls */}
      <div
        className="flex items-center gap-4 px-6 py-5 bg-black"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={onRetake}
          className="flex-1 py-4 rounded-2xl bg-slate-800 text-white font-semibold text-base hover:bg-slate-700 transition-colors"
        >
          Retake
        </button>
        <button
          onClick={handleSave}
          disabled={sharing}
          className="flex-1 py-4 rounded-2xl bg-white text-slate-900 font-semibold text-base hover:bg-slate-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {sharing ? (
            <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          ) : saved ? (
            "Saved!"
          ) : (
            "Save photo"
          )}
        </button>
      </div>
    </div>
  );
}
