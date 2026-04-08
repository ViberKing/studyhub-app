"use client";

import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

function DashboardInner() {
  const [profile, setProfile] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();

  useEffect(() => {
    if (isDemo) { setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/"); return; }
      const { data } = await supabase.from("profiles").select("name").eq("id", session.user.id).single();
      if (data) setProfile(data);
      setLoading(false);
    });
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) return null;

  const displayName = isDemo ? "Demo Student" : profile?.name || "User";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "40px", fontFamily: "-apple-system, system-ui, sans-serif" }}>
      <div style={{ maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ fontFamily: "'Iowan Old Style', Georgia, serif", fontSize: 28, marginBottom: 8 }}>
          Hello, {displayName.split(" ")[0]} 👋
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
          {isDemo ? "You're in demo mode." : "You're signed in. Dashboard coming in Phase 4."}
        </p>
        {!isDemo ? (
          <button className="btn" onClick={handleSignOut}>Sign out</button>
        ) : (
          <button className="btn" onClick={() => router.replace("/")}>Exit demo</button>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  );
}
