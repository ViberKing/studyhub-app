"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useGate } from "@/components/GateModal";
import AppShell from "@/components/AppShell";

// Demo data matching prototype
const demoData = {
  assignments: [
    { id: 1, title: "Plato's Republic essay", module: "PH1011", due: "", priority: "High", weight: 30, status: "In Progress", done: false },
    { id: 2, title: "IR theory presentation", module: "IR2001", due: "", priority: "Medium", weight: 20, status: "Not Started", done: false },
    { id: 5, title: "Microeconomics midterm", module: "EC1001", due: "", priority: "High", weight: 25, status: "Completed", done: true },
  ],
  sessions: [
    { min: 50, module: "PH1011", at: new Date().toISOString() },
    { min: 25, module: "IR2001", at: new Date().toISOString() },
  ],
  projectCount: 1,
  deckCount: 2,
  mood: "Good",
};

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function addDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();
  const { gate } = useGate();

  const [profile, setProfile] = useState<{ name: string; mood: string | null } | null>(null);
  const [assignments, setAssignments] = useState<{ id: number; title: string; module: string; due: string; done: boolean }[]>([]);
  const [todayMin, setTodayMin] = useState(0);
  const [todaySess, setTodaySess] = useState(0);
  const [projectCount, setProjectCount] = useState(0);
  const [deckCount, setDeckCount] = useState(0);
  const [mood, setMoodState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemo) {
      // Set demo dates relative to today
      const demo = { ...demoData };
      demo.assignments = [
        { ...demoData.assignments[0], due: addDays(2) },
        { ...demoData.assignments[1], due: addDays(5) },
        { ...demoData.assignments[2], due: addDays(-3) },
      ];
      setProfile({ name: "Demo Student", mood: "Good" });
      setAssignments(demo.assignments);
      setTodayMin(75);
      setTodaySess(2);
      setProjectCount(1);
      setDeckCount(2);
      setMoodState("Good");
      setLoading(false);
      return;
    }

    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      const uid = session.user.id;

      const [profileRes, assignRes, sessRes, projRes, deckRes] = await Promise.all([
        supabase.from("profiles").select("name, mood").eq("id", uid).single(),
        supabase.from("assignments").select("id, title, module, due, done").eq("user_id", uid),
        supabase.from("study_sessions").select("minutes, recorded_at").eq("user_id", uid),
        supabase.from("research_projects").select("id").eq("user_id", uid),
        supabase.from("decks").select("id").eq("user_id", uid),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setMoodState(profileRes.data.mood);
      }
      if (assignRes.data) setAssignments(assignRes.data);

      const today = new Date().toDateString();
      const todaySessions = (sessRes.data || []).filter(s => new Date(s.recorded_at).toDateString() === today);
      setTodayMin(todaySessions.reduce((sum, s) => sum + s.minutes, 0));
      setTodaySess(todaySessions.length);
      setProjectCount(projRes.data?.length || 0);
      setDeckCount(deckRes.data?.length || 0);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  const setMood = useCallback(async (m: string) => {
    if (!gate("core")) return;
    setMoodState(m);
    if (isDemo) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from("profiles").update({ mood: m }).eq("id", session.user.id);
    }
  }, [isDemo]);

  if (loading) return null;

  const firstName = (profile?.name || "User").split(" ")[0];
  const hour = new Date().getHours();
  const heroSub = hour < 12 ? "Good morning. Let's make today count." : hour < 17 ? "Keep the momentum going." : "Good evening. One more focus session?";
  const dueThisWeek = assignments.filter(a => !a.done && daysUntil(a.due) <= 7 && daysUntil(a.due) >= 0).length;
  const upcoming = assignments.filter(a => !a.done).sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime()).slice(0, 4);
  const todayStr = new Date().toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const moods = ["Great", "Good", "OK", "Stressed", "Tired"];

  return (
    <AppShell>
      <div className="page active">
        {/* Hero */}
        <div className="hero">
          <div className="hero-content">
            <h1>Hello, {firstName} 👋</h1>
            <p>{heroSub}</p>
            <div className="hero-meta">
              <div><strong>{todayStr}</strong>Today</div>
              <div><strong>{dueThisWeek}</strong>Due this week</div>
              <div><strong>{todaySess}</strong>Sessions today</div>
            </div>
          </div>
        </div>

        {/* Bento stats */}
        <div className="bento">
          <div className="bento-stat">
            <div className="icon i-rose">●</div>
            <div className="lbl">Assignments due</div>
            <div className="val">{dueThisWeek}</div>
            <div className="sub">in next 7 days</div>
          </div>
          <div className="bento-stat">
            <div className="icon i-sky">◷</div>
            <div className="lbl">Study minutes today</div>
            <div className="val">{todayMin}</div>
            <div className="sub">logged sessions</div>
          </div>
          <div className="bento-stat">
            <div className="icon i-violet">★</div>
            <div className="lbl">Research projects</div>
            <div className="val">{projectCount}</div>
            <div className="sub">total saved</div>
          </div>
          <div className="bento-stat">
            <div className="icon i-amber">▤</div>
            <div className="lbl">Flashcard decks</div>
            <div className="val">{deckCount}</div>
            <div className="sub">total decks</div>
          </div>
        </div>

        {/* Deadlines + Mood */}
        <div className="dash-grid">
          <div className="card">
            <h3>Upcoming deadlines</h3>
            {upcoming.length ? upcoming.map(a => {
              const d = daysUntil(a.due);
              const cls = d < 3 ? "badge-red" : d < 7 ? "badge-amber" : "badge-green";
              return (
                <div key={a.id} className="deadline-item">
                  <div><b>{a.title}</b><br /><small>{a.module} · {a.due}</small></div>
                  <span className={`badge ${cls}`}>{d}d</span>
                </div>
              );
            }) : (
              <div className="empty" style={{ padding: 24 }}>No upcoming deadlines.</div>
            )}
          </div>
          <div className="card">
            <h3>How are you feeling?</h3>
            <div className="mood-row">
              {moods.map(m => (
                <button key={m} className={`mood-btn${mood === m ? " active" : ""}`} onClick={() => setMood(m)}>{m}</button>
              ))}
            </div>
            <small style={{ display: "block", marginTop: 12 }}>{mood ? `Today: ${mood}` : "Tap how you feel."}</small>
          </div>
        </div>

        {/* Quick actions */}
        <h3 className="section-title">Quick actions</h3>
        <div className="action-grid">
          <button className="action-tile" onClick={() => router.push(`/timer${isDemo ? "?demo=true" : ""}`)}>
            <div className="icon">◷</div>
            <div><div className="name">Start timer</div><div className="desc">Focus session</div></div>
          </button>
          <button className="action-tile t-sky" onClick={() => router.push(`/assignments${isDemo ? "?demo=true" : ""}`)}>
            <div className="icon">✓</div>
            <div><div className="name">Add assignment</div><div className="desc">Track a deadline</div></div>
          </button>
          <button className="action-tile t-violet" onClick={() => router.push(`/research${isDemo ? "?demo=true" : ""}`)}>
            <div className="icon">★</div>
            <div><div className="name">Research</div><div className="desc">Organise sources</div></div>
          </button>
          <button className="action-tile t-amber" onClick={() => router.push(`/flashcards${isDemo ? "?demo=true" : ""}`)}>
            <div className="icon">▤</div>
            <div><div className="name">Flashcards</div><div className="desc">Review a deck</div></div>
          </button>
        </div>
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  return <Suspense><DashboardInner /></Suspense>;
}
