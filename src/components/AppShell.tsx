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
const FREE_PAGES = ["/settings", "/pricing"];

function AppShellInner({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(cachedProfile);
  const [userId, setUserId] = useState<string | null>(cachedUserId);
  const [loading, setLoading] = useState(!cachedProfile);
  const [showPaywall, setShowPaywall] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();

  useEffect(() => {
    if (isDemo) {
      const demoProfile: Profile = {
        name: "Demo Student", mood: "Good", plan: "plus",
        trial_ends_at: null, integrity_agreed: true,
        university: "st-andrews", course: "International Relations",
        year_of_study: "2nd Year", age: 20, avatar_url: null,
      };
      setProfile(demoProfile);
      setLoading(false);
      return;
    }
    if (cachedProfile) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/"); return; }
      cachedUserId = session.user.id;
      setUserId(session.user.id);
      const { data } = await supabase
        .from("profiles")
        .select("name, mood, plan, trial_ends_at, integrity_agreed, university, course, year_of_study, age, avatar_url")
        .eq("id", session.user.id)
        .single();
      if (data) { cachedProfile = data; setProfile(data); }
      setLoading(false);
    });
  }, [isDemo]);

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

    // Trial — check if expired
    if (plan === "trial" && trial_ends_at) {
      const expired = new Date(trial_ends_at).getTime() < Date.now();
      setShowPaywall(expired);
      return;
    }

    // Cancelled — always paywalled
    if (plan === "cancelled") {
      setShowPaywall(true);
      return;
    }

    setShowPaywall(false);
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
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <h2>Your free trial has ended</h2>
                  <p>Choose a plan to continue using Study-HQ and access all your study tools.</p>
                  <button className="btn btn-grad btn-lg" onClick={() => router.push("/pricing")} style={{ width: "100%", marginBottom: 12 }}>
                    View plans
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
