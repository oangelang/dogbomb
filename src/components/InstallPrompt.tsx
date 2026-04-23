"use client";

import { useEffect, useState } from "react";

export default function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Show only on iOS Safari when NOT already in standalone mode
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = localStorage.getItem("install-prompt-dismissed");

    if (isIos && !isStandalone && !dismissed) {
      // Delay a bit so it doesn't immediately appear
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  function dismiss() {
    localStorage.setItem("install-prompt-dismissed", "1");
    setShow(false);
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 bg-slate-800 text-white rounded-2xl p-4 shadow-2xl flex items-start gap-3">
      <span className="text-2xl flex-shrink-0">📱</span>
      <div className="flex-1 text-sm">
        <p className="font-semibold mb-1">Add to Home Screen</p>
        <p className="text-slate-300 text-xs leading-snug">
          Tap the Share button <span className="font-mono">⬆</span> then{" "}
          <strong>Add to Home Screen</strong> for the full camera experience.
        </p>
      </div>
      <button
        onClick={dismiss}
        className="text-slate-400 hover:text-white flex-shrink-0 text-lg leading-none"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
