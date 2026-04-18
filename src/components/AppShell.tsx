"use client";

import { Suspense, useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { GateProvider } from "./GateModal";
import OnboardingModal from "./OnboardingModal";
import PageTransition from "./PageTransition";

interface Profile {
  name: string;
  mood: string | null;
  plan: string;
  trial_ends_at: string | null;
  integrity_agreed: boolean;
  university: string;
  course: string;
  year_of_study: string;
  age: number | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_referral_partner: boolean;
}

interface AppContextType {
  profile: Profile | null;
  userId: string | null;
  isDemo: boolean;
}

const AppContext = createContext<AppContextType>({ profile: null, userId: null, isDemo: false });
export function useAppContext() { return useContext(AppContext); }

// Simple in-memory cache so profile isn't re-fetched on every nav
let cachedProfile: Profile | null = null;
let cachedUserId: string | null = null;

/* Pages that are always accessible regardless of plan */
const FREE_PAGES = ["/settings", "/pricing", "/referrals", "/get-started"];

/* Plan hierarchy (matches GateModal) */
const PLAN_LEVEL: Record<string, number> = {
  trial: 0, essential: 1, plus: 2, pro: 3, gifted: 3,
};

/* Pages that require a specific plan level to access */
const PAGE_MIN_TIER: Record<string, number> = {
  "/research": 2,      // Plus+
  "/essay": 2,         // Plus+
  "/ai-tutor": 2,      // Plus+
  "/analytics": 2,     // Plus+
  "/groups": 3,        // Pro
};

const TIER_NAMES: Record<number, string> = { 1: "Essential", 2: "Plus", 3: "Pro" };

function AppShellInner({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(cachedProfile);
  const [userId, setUserId] = useState<string | null>(cachedUserId);
  const [loading, setLoading] = useState(!cachedProfile);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"trial" | "expired" | "cancelled">("trial");
  const [planGateTier, setPlanGateTier] = useState<string | null>(null); // If set, current page requires this tier
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();

  // Clear cache when returning from Stripe checkout so fresh plan is fetched
  const isPostCheckout = searchParams.get("checkout") === "success";
  useEffect(() => {
    if (isPostCheckout) {
      cachedProfile = null;
      cachedUserId = null;
    }
  }, [isPostCheckout]);

  useEffect(() => {
    if (isDemo) {
      const demoProfile: Profile = {
        name: "Demo Student", mood: "Good", plan: "plus",
        trial_ends_at: null, integrity_agreed: true,
        university: "st-andrews", course: "International Relations",
        year_of_study: "2nd Year", age: 20, avatar_url: null, is_admin: false, is_referral_partner: false,
      };
      setProfile(demoProfile);
      setLoading(false);
      return;
    }
    if (cachedProfile && !isPostCheckout) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/"); return; }
      cachedUserId = session.user.id;
      setUserId(session.user.id);

      async function fetchProfile() {
        const { data } = await supabase
          .from("profiles")
          .select("name, mood, plan, trial_ends_at, integrity_agreed, university, course, year_of_study, age, avatar_url, is_admin, is_referral_partner")
          .eq("id", session!.user.id)
          .single();
        return data;
      }

      let data = await fetchProfile();

      // After Stripe checkout, the webhook may not have fired yet.
      // Retry a few times to wait for the plan to update from "trial".
      if (isPostCheckout && data?.plan === "trial") {
        for (let i = 0; i < 5; i++) {
          await new Promise(r => setTimeout(r, 1500));
          data = await fetchProfile();
          if (data?.plan !== "trial") break;
        }
      }

      if (data) { cachedProfile = data; setProfile(data); }
      setLoading(false);
    });
  }, [isDemo, isPostCheckout]);

  // Paywall check — STRICT WHITELIST
  // Only users with an active paid plan (essential, plus, pro, gifted) can access non-free pages.
  // Everyone else — trial, cancelled, null, unknown — is paywalled straight to /pricing.
  useEffect(() => {
    if (isDemo) { setShowPaywall(false); setPlanGateTier(null); return; }

    const isFreePage = FREE_PAGES.includes(pathname);
    if (isFreePage) { setShowPaywall(false); setPlanGateTier(null); return; }

    // No profile loaded yet or profile missing → paywall (safer default)
    if (!profile) {
      setPaywallReason("trial");
      setShowPaywall(true);
      setPlanGateTier(null);
      return;
    }

    const plan = profile.plan || "trial";

    // ONLY these plans can access the app
    const PAID_PLANS = ["essential", "plus", "pro", "gifted"];

    if (PAID_PLANS.includes(plan)) {
      setShowPaywall(false);
      // Check per-page tier requirement
      const requiredTier = PAGE_MIN_TIER[pathname];
      if (requiredTier) {
        const userLevel = PLAN_LEVEL[plan] ?? 0;
        if (userLevel < requiredTier) {
          setPlanGateTier(TIER_NAMES[requiredTier] || "Plus");
          return;
        }
      }
      setPlanGateTier(null);
      return;
    }

    // Cancelled — separate message
    if (plan === "cancelled") {
      setPaywallReason("cancelled");
      setShowPaywall(true);
      return;
    }

    // Everything else (trial, null, anything unexpected) → trial paywall
    setPaywallReason("trial");
    setShowPaywall(true);
  }, [profile, pathname, isDemo]);

  // Is the user on an actively paid plan? (for OnboardingModal visibility)
  const isPaidUser = !!profile && ["essential", "plus", "pro", "gifted"].includes(profile.plan || "");

  if (loading) return null;

  // Paywall overlay
  if (showPaywall) {
    return (
      <div className={`app active${isDemo ? " demo-mode" : ""}`}>
        <Sidebar />
        <div className="main-col">
          <Header userName={profile?.name || "User"} isDemo={isDemo} avatarUrl={profile?.avatar_url || null} />
          <main className="main">
            <div className="page active">
              <div className="paywall-overlay">
                <div className="paywall-card">
                  <div className="paywall-icon">
                    <svg width="48" height="48" fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      {paywallReason === "trial" ? (
                        <>
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </>
                      ) : (
                        <>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </>
                      )}
                    </svg>
                  </div>
                  <h2>{paywallReason === "trial" ? "Choose your plan to get started" : paywallReason === "cancelled" ? "Your subscription has been cancelled" : "Your free trial has ended"}</h2>
                  <p>{paywallReason === "trial" ? "Select a plan to start your 7-day free trial and unlock all Study-HQ features." : "Choose a plan to continue using Study-HQ and access all your study tools."}</p>
                  <button className="btn btn-grad btn-lg" onClick={() => router.push("/pricing")} style={{ width: "100%", marginBottom: 12 }}>
                    {paywallReason === "trial" ? "Choose a plan" : "View plans"}
                  </button>
                  <button className="btn btn-ghost" onClick={() => router.push("/settings")} style={{ width: "100%" }}>
                    Go to settings
                  </button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Plan-level gate — user has a paid plan but it's not high enough for this page
  if (planGateTier) {
    return (
      <AppContext.Provider value={{ profile, userId, isDemo }}>
        <GateProvider>
          <div className={`app active${isDemo ? " demo-mode" : ""}`}>
            <Sidebar />
            <div className="main-col">
              <Header userName={profile?.name || "User"} isDemo={isDemo} avatarUrl={profile?.avatar_url || null} />
              <main className="main">
                <div className="page active">
                  <div className="paywall-overlay">
                    <div className="paywall-card">
                      <div className="paywall-icon">
                        <svg width="48" height="48" fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                        </svg>
                      </div>
                      <h2>Upgrade to {planGateTier} to unlock this</h2>
                      <p>This feature is available on the {planGateTier} plan. Upgrade to unlock it alongside everything else on that tier.</p>
                      <button className="btn btn-grad btn-lg" onClick={() => router.push("/pricing")} style={{ width: "100%", marginBottom: 12 }}>
                        View {planGateTier} plan
                      </button>
                      <button className="btn btn-ghost" onClick={() => router.push("/dashboard")} style={{ width: "100%" }}>
                        Back to dashboard
                      </button>
                    </div>
                  </div>
                </div>
              </main>
            </div>
          </div>
        </GateProvider>
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={{ profile, userId, isDemo }}>
      <GateProvider>
        <div className={`app active${isDemo ? " demo-mode" : ""}`}>
          <Sidebar />
          <div className="main-col">
            <Header userName={profile?.name || "User"} isDemo={isDemo} avatarUrl={profile?.avatar_url || null} />
            <main className="main">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
          {!isDemo && isPaidUser && <OnboardingModal />}
        </div>
      </GateProvider>
    </AppContext.Provider>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return <Suspense><AppShellInner>{children}</AppShellInner></Suspense>;
}

// Call this on sign out to clear the cache
export function clearProfileCache() {
  cachedProfile = null;
  cachedUserId = null;
}
