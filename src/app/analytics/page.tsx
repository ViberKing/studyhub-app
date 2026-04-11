"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";

function AnalyticsInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();
  const [sessions, setSessions] = useState<{ minutes: number; module: string; recorded_at: string }[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (isDemo) {
        const now = new Date();
        const minus = (n: number) => { const d = new Date(now); d.setDate(d.getDate() - n); return d.toISOString(); };
        setSessions([
          { minutes: 50, module: "PH1011", recorded_at: minus(0) },
          { minutes: 25, module: "IR2001", recorded_at: minus(0) },
          { minutes: 90, module: "HI3010", recorded_at: minus(1) },
          { minutes: 50, module: "PH1011", recorded_at: minus(1) },
          { minutes: 25, module: "PS2002", recorded_at: minus(2) },
          { minutes: 50, module: "EC1001", recorded_at: minus(2) },
          { minutes: 90, module: "EC1001", recorded_at: minus(3) },
          { minutes: 25, module: "PH1011", recorded_at: minus(4) },
          { minutes: 50, module: "IR2001", recorded_at: minus(5) },
          { minutes: 25, module: "HI3010", recorded_at: minus(6) },
        ]);
        setDoneCount(1);
        setLoading(false); return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const [sessRes, assignRes] = await Promise.all([
        supabase.from("study_sessions").select("minutes, module, recorded_at").eq("user_id", session.user.id),
        supabase.from("assignments").select("id").eq("user_id", session.user.id).eq("done", true),
      ]);
      if (sessRes.data) setSessions(sessRes.data);
      setDoneCount(assignRes.data?.length || 0);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  if (loading) return null;

  const totalMin = sessions.reduce((s, x) => s + x.minutes, 0);
  const avgMin = sessions.length ? Math.round(totalMin / sessions.length) : 0;

  // Last 7 days chart
  const days: { label: string; min: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toDateString();
    const min = sessions.filter(s => new Date(s.recorded_at).toDateString() === ds).reduce((s, x) => s + x.minutes, 0);
    days.push({ label: d.toLocaleDateString(undefined, { weekday: "short" }), min });
  }
  const maxMin = Math.max(...days.map(d => d.min), 1);

  // By module
  const byMod: Record<string, number> = {};
  sessions.forEach(s => { byMod[s.module] = (byMod[s.module] || 0) + s.minutes; });
  const maxMod = Math.max(...Object.values(byMod), 1);

  let insight = "Log some study sessions to see insights here.";
  if (sessions.length > 3) {
    insight = avgMin > 45 ? `Strong focus — your average session is ${avgMin} minutes.` : `Your average session is ${avgMin} minutes. Try 25-minute Pomodoros.`;
  }

  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Analytics</h1>
        <p className="page-sub">Insights from your study sessions.</p>
        <div className="grid grid-4 mb">
          <div className="stat-card"><div className="lbl">Total study hours</div><div className="val">{(totalMin / 60).toFixed(1)}</div></div>
          <div className="stat-card"><div className="lbl">Total sessions</div><div className="val">{sessions.length}</div></div>
          <div className="stat-card"><div className="lbl">Assignments done</div><div className="val">{doneCount}</div></div>
          <div className="stat-card"><div className="lbl">Avg session (min)</div><div className="val">{avgMin}</div></div>
        </div>
        <div className="card mb">
          <h3>Study minutes — last 7 days</h3>
          <div className="chart-bars">
            {days.map((d, i) => (
              <div key={i} className="bar" style={{ height: `${(d.min / maxMin) * 100}%` }} title={`${d.min} min`}>
                <span>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card mb">
          <h3>Minutes per module</h3>
          {Object.keys(byMod).length ? Object.entries(byMod).map(([mod, min]) => (
            <div key={mod} style={{ marginBottom: 12 }}>
              <div className="row between"><small>{mod}</small><small>{min} min</small></div>
              <div className="progress-bar"><div className="progress-fill" style={{ width: `${(min / maxMod) * 100}%` }} /></div>
            </div>
          )) : <div className="empty">No session data yet.</div>}
        </div>
        <div className="card">
          <h3>Insight</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6 }}>{insight}</p>
        </div>
      </div>
    </AppShell>
  );
}

export default function AnalyticsPage() { return <Suspense><AnalyticsInner /></Suspense>; }
