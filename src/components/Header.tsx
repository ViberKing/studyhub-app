"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { clearProfileCache } from "./AppShell";

const pageTitles: Record<string, string> = {
  dashboard: "Dashboard", research: "Research", assignments: "Assignments",
  essay: "Essay builder", timer: "Study timer", flashcards: "Flashcards",
  grades: "Grades", citations: "Citations", notes: "Notes",
  modules: "Modules", analytics: "Analytics", pricing: "Pricing",
  settings: "Settings",
};

export default function Header({ userName, isDemo }: { userName: string; isDemo: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const currentPage = pathname.split("/").pop() || "dashboard";
  const title = pageTitles[currentPage] || "StudyHub";
  const initial = userName ? userName.charAt(0).toUpperCase() : "U";

  async function handleSignOut() {
    clearProfileCache();
    if (isDemo) { router.replace("/"); return; }
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <>
      {isDemo && (
        <div className="top-banner demo" style={{ display: "flex" }}>
          <div>👋 You&apos;re in demo mode with sample data. Sign out to start a 7-day free trial with your own account.</div>
          <button onClick={() => router.replace("/")}>Exit demo</button>
        </div>
      )}
      <header className="header">
        <div style={{ display: "flex", alignItems: "center" }}>
          <div className="header-title">{title}</div>
        </div>
        <div className="header-user">
          <div className="user-chip">
            <div className="avatar">{initial}</div>
            <span className="user-chip-name">{userName}</span>
          </div>
          <button className="signout-btn" type="button" onClick={handleSignOut}>Sign out</button>
        </div>
      </header>
    </>
  );
}
