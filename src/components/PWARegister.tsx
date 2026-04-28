"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type BannerMode = "native" | "ios" | "mac-safari" | "android-other" | "desktop-other" | null;

export default function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<BannerMode>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Check if user previously dismissed
    if (localStorage.getItem("pwa-install-dismissed")) return;

    const ua = navigator.userAgent;

    // Detect iOS (iPhone, iPad, iPod)
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isiOS) {
      setMode("ios");
      return;
    }

    // Detect macOS Safari (Safari but NOT Chrome/Firefox/Edge on Mac)
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|Edg/.test(ua);
    const isMac = /Macintosh|MacIntel/.test(ua);
    if (isSafari && isMac) {
      setMode("mac-safari");
      return;
    }

    // For Chrome, Edge, Samsung etc. — listen for the native install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode("native");
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Fallback — if the native prompt hasn't fired after 3s, show generic install instructions
    // (covers Firefox, older browsers, browsers that haven't met engagement criteria yet)
    const fallbackTimer = setTimeout(() => {
      setMode((current) => {
        if (current) return current; // already set
        const isAndroid = /Android/.test(ua);
        return isAndroid ? "android-other" : "desktop-other";
      });
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(fallbackTimer);
    };
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setMode(null);
      }
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setMode(null);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "1");
  }

  if (!mode || dismissed) return null;

  /* Share icon for iOS */
  const shareIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "-2px", margin: "0 2px" }}>
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
    </svg>
  );

  return (
    <div className="pwa-install-banner">
      <div className="pwa-install-icon">
        <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      </div>
      <div className="pwa-install-text">
        <strong>Install Study-HQ</strong>
        {mode === "ios" && (
          <span>Tap {shareIcon} then <strong>&quot;Add to Home Screen&quot;</strong></span>
        )}
        {mode === "mac-safari" && (
          <span>Click <strong>File → Add to Dock</strong> to install</span>
        )}
        {mode === "native" && (
          <span>Add to your home screen for the best experience</span>
        )}
        {mode === "android-other" && (
          <span>Tap the menu (⋮) then <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to home screen&quot;</strong></span>
        )}
        {mode === "desktop-other" && (
          <span>Click the install icon in your browser&apos;s address bar to add Study-HQ</span>
        )}
      </div>
      <div className="pwa-install-actions">
        {mode === "native" && (
          <button className="pwa-install-btn" onClick={handleInstall}>
            Install
          </button>
        )}
        <button className="pwa-dismiss-btn" onClick={handleDismiss} aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}
