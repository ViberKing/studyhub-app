"use client";

import { useEffect, useState } from "react";
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

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();

  useEffect(() => {
    if (isDemo) {
      setProfile({ name: "Demo Student", mood: "Good", plan: "plus", trial_ends_at: null, integrity_agreed: true });
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/"); return; }
      setUserId(session.user.id);
      const { data } = await supabase.from("profiles").select("name, mood, plan, trial_ends_at, integrity_agreed").eq("id", session.user.id).single();
      if (data) setProfile(data);
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  return (
    <div className={`app active${isDemo ? " demo-mode" : ""}`}>
      <Sidebar />
      <div className="main-col">
        <Header userName={profile?.name || "User"} isDemo={isDemo} />
        <main className="main">
          {children}
        </main>
      </div>
    </div>
  );
}
