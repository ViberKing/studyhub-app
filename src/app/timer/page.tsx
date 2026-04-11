"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import { useGate } from "@/components/GateModal";

interface Session { id: number; minutes: number; module: string; notes: string; recorded_at: string; }

function TimerInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();
  const { gate } = useGate();

  const [remaining, setRemaining] = useState(25 * 60);
  const [total, setTotal] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [tModule, setTModule] = useState("");
  const [tNotes, setTNotes] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionComplete, setSessionComplete] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSessions = useCallback(async () => {
    if (isDemo) {
      setSessions([
        { id: 1, minutes: 50, module: "PH1011", notes: "Plato reading", recorded_at: new Date().toISOString() },
        { id: 2, minutes: 25, module: "IR2001", notes: "", recorded_at: new Date().toISOString() },
      ]);
      setLoading(false); return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from("study_sessions").select("id, minutes, module, notes, recorded_at").eq("user_id", session.user.id).order("recorded_at", { ascending: false }).limit(20);
    if (data) setSessions(data);
    setLoading(false);
  }, [isDemo]);

  useEffect(() => { fetchSessions(); return () => { if (intervalRef.current) clearInterval(intervalRef.current); }; }, [fetchSessions]);

  function setPreset(min: number) {
    if (running) return;
    setRemaining(min * 60);
    setTotal(min * 60);
  }

  function start() {
    if (!gate("core")) return;
    if (running) return;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setRunning(false);
          logSession();
          setSessionComplete(true);
          setTimeout(() => setSessionComplete(false), 5000);
          return total;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function pause() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setRunning(false);
  }

  function reset() {
    pause();
    setRemaining(total);
  }

  async function logSession() {
    if (!gate("core")) return;
    if (total <= 0) return;
    const min = total / 60;
    if (isDemo) {
      setSessions(prev => [{ id: Date.now(), minutes: min, module: tModule || "General", notes: tNotes, recorded_at: new Date().toISOString() }, ...prev]);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("study_sessions").insert({ user_id: session.user.id, minutes: min, module: tModule.trim() || "General", notes: tNotes.trim() });
    fetchSessions();
  }

  if (loading) return null;

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const display = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  const today = new Date().toDateString();
  const todaySess = sessions.filter(s => new Date(s.recorded_at).toDateString() === today);
  const weekAgo = Date.now() - 7 * 86400000;
  const weekSess = sessions.filter(s => new Date(s.recorded_at).getTime() > weekAgo);

  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Study timer</h1>
        <p className="page-sub">Pomodoro-style focus sessions.</p>
        <div className="timer-card mb">
          <div className="timer-display">{display}</div>
          <div className="timer-row">
            <button className="btn-ghost btn btn-sm" onClick={() => setPreset(25)}>25 min</button>
            <button className="btn-ghost btn btn-sm" onClick={() => setPreset(50)}>50 min</button>
            <button className="btn-ghost btn btn-sm" onClick={() => setPreset(90)}>90 min</button>
          </div>
          <div className="timer-row">
            <button className="btn" onClick={start}>Start</button>
            <button className="btn-ghost btn" onClick={pause}>Pause</button>
            <button className="btn-ghost btn" onClick={reset}>Reset</button>
          </div>
        </div>
        {sessionComplete && <div className="card mb" style={{ background: "var(--emerald)", color: "#fff", textAlign: "center", fontWeight: 600, padding: "14px 20px", borderRadius: 10 }}>Session complete! Great work!</div>}
        <div className="card mb">
          <div className="grid grid-2">
            <div className="field" style={{ marginBottom: 0 }}><label>Module</label><input value={tModule} onChange={e => setTModule(e.target.value)} placeholder="What are you studying?" /></div>
            <div className="field" style={{ marginBottom: 0 }}><label>Notes</label><input value={tNotes} onChange={e => setTNotes(e.target.value)} placeholder="Optional notes" /></div>
          </div>
        </div>
        <h3 className="section-title">Today</h3>
        <div className="grid grid-3">
          <div className="stat-card"><div className="lbl">Sessions today</div><div className="val">{todaySess.length}</div></div>
          <div className="stat-card"><div className="lbl">Minutes today</div><div className="val">{todaySess.reduce((s, x) => s + x.minutes, 0)}</div></div>
          <div className="stat-card"><div className="lbl">Minutes this week</div><div className="val">{weekSess.reduce((s, x) => s + x.minutes, 0)}</div></div>
        </div>
        <h3 className="section-title">Session history</h3>
        {sessions.length ? sessions.slice(0, 10).map(s => (
          <div key={s.id} className="card mb">
            <b>{s.minutes} min</b> · {s.module}<br />
            <small>{new Date(s.recorded_at).toLocaleString()}{s.notes ? ` · ${s.notes}` : ""}</small>
          </div>
        )) : <div className="empty">No sessions yet.</div>}
      </div>
    </AppShell>
  );
}

export default function TimerPage() { return <Suspense><TimerInner /></Suspense>; }
