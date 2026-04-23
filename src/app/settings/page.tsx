"use client";

import { useEffect, useRef, useState } from "react";
import { getDogPhotos, deleteDogPhoto, saveDogPhotos, type DogPhoto } from "@/lib/db";
import Link from "next/link";

export default function SettingsPage() {
  const [photos, setPhotos] = useState<DogPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      setPhotos(await getDogPhotos());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    await deleteDogPhoto(id);
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setSaving(true);
    try {
      await saveDogPhotos(files);
      await load();
    } finally {
      setSaving(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      className="min-h-dvh bg-slate-900 text-white flex flex-col"
      style={{ height: "100dvh" }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-4 border-b border-slate-800"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <Link
          href="/"
          className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg hover:bg-slate-700 transition-colors"
          aria-label="Back"
        >
          ←
        </Link>
        <h1 className="text-lg font-semibold">Your Dog Photos</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-5xl mb-4">🐶</div>
            <p>No dog photos yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {photos.map((photo) => (
              <DogPhotoCard
                key={photo.id}
                photo={photo}
                onDelete={() => handleDelete(photo.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add button */}
      <div
        className="p-4 border-t border-slate-800"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleAdd}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={saving}
          className="w-full py-4 rounded-2xl bg-white text-slate-900 font-semibold text-base hover:bg-slate-100 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Add more dog photos"}
        </button>
      </div>
    </div>
  );
}

function DogPhotoCard({
  photo,
  onDelete,
}: {
  photo: DogPhoto;
  onDelete: () => void;
}) {
  const [src, setSrc] = useState("");

  useEffect(() => {
    const url = URL.createObjectURL(photo.blob);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [photo.blob]);

  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-800 group">
      {src && (
        <img src={src} alt="Dog photo" className="w-full h-full object-cover" />
      )}
      <button
        onClick={onDelete}
        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
        aria-label="Delete photo"
      >
        ✕
      </button>
    </div>
  );
}
