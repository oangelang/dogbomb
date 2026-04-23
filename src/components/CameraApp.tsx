"use client";

import { useEffect, useState } from "react";
import { getDogPhotos, hasDogPhotos, type DogPhoto } from "@/lib/db";
import Onboarding from "./Onboarding";
import Viewfinder from "./Viewfinder";
import PhotoPreview from "./PhotoPreview";
import InstallPrompt from "./InstallPrompt";
import Link from "next/link";

type AppState = "loading" | "onboarding" | "camera" | "preview";

export default function CameraApp() {
  const [state, setState] = useState<AppState>("loading");
  const [dogPhotos, setDogPhotos] = useState<DogPhoto[]>([]);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const has = await hasDogPhotos();
        if (has) {
          const photos = await getDogPhotos();
          setDogPhotos(photos);
          setState("camera");
        } else {
          setState("onboarding");
        }
      } catch {
        setState("onboarding");
      }
    }
    init();
  }, []);

  async function handleOnboardingComplete() {
    const photos = await getDogPhotos();
    setDogPhotos(photos);
    setState("camera");
  }

  function handleCapture(blob: Blob) {
    setCapturedBlob(blob);
    setState("preview");
  }

  function handleRetake() {
    setCapturedBlob(null);
    setState("camera");
  }

  if (state === "loading") {
    return (
      <div className="min-h-dvh bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (state === "onboarding") {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (state === "preview" && capturedBlob) {
    return <PhotoPreview blob={capturedBlob} onRetake={handleRetake} />;
  }

  return (
    <>
      <Viewfinder
        dogPhotos={dogPhotos}
        onCapture={handleCapture}
        onOpenSettings={() => {
          window.location.href = "/settings";
        }}
      />
      <InstallPrompt />
    </>
  );
}
