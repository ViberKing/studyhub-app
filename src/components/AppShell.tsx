"use client";

import { Suspense, useEffect, useState, createContext, useContext } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { GateProvider } from "./GateModal";

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
const FREE_PAGES = ["/settings", "/pricing", "/referrals"];

function AppShellInner({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(cachedProfile);
  const [userId, setUserId] = useState<string | null>(cachedUserId);
  const [loading, setLoading] = useState(!cachedProfile);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"trial" | "expired" | "cancelled">("trial");
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

  // Paywall check — block access if trial expired or cancelled
  useEffect(() => {
    if (!profile || isDemo) { setShowPaywall(false); return; }
    const isFreePage = FREE_PAGES.includes(pathname);
    if (isFreePage) { setShowPaywall(false); return; }

    const { plan, trial_ends_at } = profile;

    // Active paid plans and gifted — always allowed
    if (["essential", "plus", "pro", "gifted"].includes(plan)) {
      setShowPaywall(false);
      return;
    }

    // Trial users must choose a plan via Stripe first
    if (plan === "trial") {
      setPaywallReason("trial");
      setShowPaywall(true);
      return;
    }

    // Cancelled — always paywalled
    if (plan === "cancelled") {
      setPaywallReason("cancelled");
      setShowPaywall(true);
      return;
    }

    setPaywallReason("expired");
    setShowPaywall(true);
  }, [profile, pathname, isDemo]);

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

  return (
    <AppContext.Provider value={{ profile, userId, isDemo }}>
      <GateProvider>
        <div className={`app active${isDemo ? " demo-mode" : ""}`}>
          <Sidebar />
          <div className="main-col">
            <Header userName={profile?.name || "User"} isDemo={isDemo} avatarUrl={profile?.avatar_url || null} />
            <main className="main">
              {children}
            </main>
          </div>
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
