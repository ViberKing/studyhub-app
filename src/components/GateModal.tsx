"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "./AppShell";

/* ─── Tier hierarchy ─── */
const TIER_LEVEL: Record<string, number> = {
  trial: 0, essential: 1, plus: 2, pro: 3, gifted: 3,
};

/* ─── Feature → minimum tier ─── */
export type Feature =
  | "core"        // assignments, flashcards, timer, grades, citations, calendar, notes
  | "research"    // AI research assistant
  | "essay"       // Essay builder
  | "analytics"   // Advanced analytics
  | "modules+"    // Unlimited modules (essential = 5 max)
  | "groups"      // Study group collaboration
  | "export"      // Data export
  | "community";  // Feed, messages

const FEATURE_TIER: Record<Feature, number> = {
  "core": 1,        // Essential+
  "community": 1,   // Essential+
  "research": 2,    // Plus+
  "essay": 2,       // Plus+
  "analytics": 2,   // Plus+
  "modules+": 2,    // Plus+
  "groups": 3,      // Pro only
  "export": 3,      // Pro only
};

const FEATURE_LABELS: Record<Feature, string> = {
  "core": "this feature",
  "research": "the AI Research Assistant",
  "essay": "the Essay Builder",
  "analytics": "Advanced Analytics",
  "modules+": "unlimited modules",
  "groups": "Study Groups",
  "export": "data export",
  "community": "the Uni Feed",
};

const TIER_NAMES: Record<number, string> = { 1: "Essential", 2: "Plus", 3: "Pro" };

/* ─── Gate modal state ─── */
interface GateState {
  open: boolean;
  mode: "demo" | "upgrade";
  featureLabel: string;
  requiredTier: string;
}

interface GateContextType {
  gate: (feature?: Feature) => boolean;
  gateState: GateState;
  closeGate: () => void;
}

const GateContext = createContext<GateContextType>({
  gate: () => true,
  gateState: { open: false, mode: "demo", featureLabel: "", requiredTier: "" },
  closeGate: () => {},
});

export function useGate() { return useContext(GateContext); }

/* ─── Provider ─── */
export function GateProvider({ children }: { children: React.ReactNode }) {
  const { isDemo, profile } = useAppContext();
  const [gateState, setGateState] = useState<GateState>({
    open: false, mode: "demo", featureLabel: "", requiredTier: "",
  });

  const gate = useCallback((feature: Feature = "core"): boolean => {
    // Demo mode — always block
    if (isDemo) {
      setGateState({
        open: true,
        mode: "demo",
        featureLabel: FEATURE_LABELS[feature] || "this feature",
        requiredTier: "",
      });
      return false;
    }

    // Live user — check tier
    const plan = profile?.plan || "trial";
    const userLevel = TIER_LEVEL[plan] ?? 0;
    const requiredLevel = FEATURE_TIER[feature] ?? 1;

    if (userLevel >= requiredLevel) return true;

    // User's tier is too low
    setGateState({
      open: true,
      mode: "upgrade",
      featureLabel: FEATURE_LABELS[feature] || "this feature",
      requiredTier: TIER_NAMES[requiredLevel] || "Plus",
    });
    return false;
  }, [isDemo, profile]);

  const closeGate = useCallback(() => {
    setGateState(s => ({ ...s, open: false }));
  }, []);

  /* ─── Global click interceptor for demo mode ─── */
  useEffect(() => {
    if (!isDemo) return;

    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;

      // Allow internal Next.js links (no protocol or starts with /)
      if (href.startsWith("/") || href.startsWith("#")) return;
      // Allow mailto: links (sharing is fine)
      if (href.startsWith("mailto:")) return;

      // Block all external links in demo mode
      e.preventDefault();
      e.stopPropagation();
      setGateState({
        open: true,
        mode: "demo",
        featureLabel: "this feature",
        requiredTier: "",
      });
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isDemo]);

  return (
    <GateContext.Provider value={{ gate, gateState, closeGate }}>
      {children}
      {gateState.open && <GateModalUI />}
    </GateContext.Provider>
  );
}

/* ─── Modal UI ─── */
function GateModalUI() {
  const { gateState, closeGate } = useGate();
  const router = useRouter();
  const { isDemo } = useAppContext();

  const isUpgrade = gateState.mode === "upgrade";

  return (
    <div className="gate-overlay" onClick={closeGate}>
      <div className="gate-card" onClick={e => e.stopPropagation()}>
        {/* Glow effect */}
        <div className="gate-glow" />

        {/* Icon */}
        <div className="gate-icon-wrap">
          {isUpgrade ? (
            <svg width="32" height="32" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          ) : (
            <svg width="32" height="32" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          )}
        </div>

        {/* Text */}
        <h2 className="gate-title">
          {isUpgrade ? `Upgrade to ${gateState.requiredTier}` : "Create an account"}
        </h2>
        <p className="gate-desc">
          {isUpgrade
            ? `${gateState.featureLabel} is available on the ${gateState.requiredTier} plan and above. Upgrade to unlock it.`
            : `You're viewing a demo of Study-HQ. Sign up with a free 7-day trial to use ${gateState.featureLabel} and all our study tools.`
          }
        </p>

        {/* Feature bullets */}
        <div className="gate-features">
          {isUpgrade ? (
            <>
              <div className="gate-feature-item"><span className="gate-check">&#x2713;</span> Unlock {gateState.featureLabel}</div>
              <div className="gate-feature-item"><span className="gate-check">&#x2713;</span> All {gateState.requiredTier} features included</div>
              <div className="gate-feature-item"><span className="gate-check">&#x2713;</span> Cancel anytime</div>
            </>
          ) : (
            <>
              <div className="gate-feature-item"><span className="gate-check">&#x2713;</span> 7-day free trial</div>
              <div className="gate-feature-item"><span className="gate-check">&#x2713;</span> No credit card required</div>
              <div className="gate-feature-item"><span className="gate-check">&#x2713;</span> Access all study tools</div>
            </>
          )}
        </div>

        {/* Actions */}
        <button
          className="gate-primary-btn"
          onClick={() => {
            closeGate();
            if (isDemo) {
              router.push("/");
            } else {
              router.push("/pricing");
            }
          }}
        >
          {isUpgrade ? `View ${gateState.requiredTier} plan` : "Start free trial"}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
        <button className="gate-dismiss-btn" onClick={closeGate}>
          {isDemo ? "Keep browsing demo" : "Maybe later"}
        </button>
      </div>
    </div>
  );
}
