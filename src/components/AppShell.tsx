"use client";

import { Suspense, useEffect, useState, createContext, useContext } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface Profile {
  name: string;
  mood: string | null;
  plan: string;
  trial_ends_at: string | null;
  integrity_agreed: boolean;
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

function AppShellInner({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(cachedProfile);
  const [userId, setUserId] = useState<string | null>(cachedUserId);
  const [loading, setLoading] = useState(!cachedProfile);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();

  useEffect(() => {
    if (isDemo) {
      const demoProfile = { name: "Demo Student", mood: "Good", plan: "plus", trial_ends_at: null, integrity_agreed: true };
      setProfile(demoProfile);
      setLoading(false);
      return;
    }
    if (cachedProfile) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/"); return; }
      cachedUserId = session.user.id;
      setUserId(session.user.id);
      const { data } = await supabase.from("profiles").select("name, mood, plan, trial_ends_at, integrity_agreed").eq("id", session.user.id).single();
      if (data) { cachedProfile = data; setProfile(data); }
      setLoading(false);
    });
  }, [isDemo]);

  if (loading) return null;

  return (
    <AppContext.Provider value={{ profile, userId, isDemo }}>
      <div className={`app active${isDemo ? " demo-mode" : ""}`}>
        <Sidebar />
        <div className="main-col">
          <Header userName={profile?.name || "User"} isDemo={isDemo} />
          <main className="main">
            {children}
          </main>
        </div>
      </div>
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
