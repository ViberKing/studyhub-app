"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWARegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Check if user previously dismissed
    if (localStorage.getItem("pwa-install-dismissed")) return;

    // Detect iOS (no beforeinstallprompt on Safari)
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (isiOS) {
      setIsIOS(true);
      setShowBanner(true);
      return;
    }

    // Listen for the install prompt event (Chrome, Edge, Samsung, etc.)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "1");
  }

  if (!showBanner || dismissed) return null;

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
        {isIOS ? (
          <span>Tap <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", verticalAlign: "-2px", margin: "0 2px" }}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> then <strong>&quot;Add to Home Screen&quot;</strong></span>
        ) : (
          <span>Add to your home screen for the best experience</span>
        )}
      </div>
      <div className="pwa-install-actions">
        {!isIOS && (
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
