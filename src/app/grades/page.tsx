"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";

interface Grade { id: number; name: string; weight: number; score: number | null; }

const demoGrades: Grade[] = [
  { id: 1, name: "Plato essay", weight: 30, score: 16.5 },
  { id: 2, name: "Midterm exam", weight: 25, score: 14 },
  { id: 3, name: "Final essay", weight: 30, score: null },
  { id: 4, name: "Participation", weight: 15, score: null },
];

function GradesInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();

  const [grades, setGrades] = useState<Grade[]>([]);
  const [target, setTarget] = useState("16.5");
  const [gName, setGName] = useState("");
  const [gWeight, setGWeight] = useState("");
  const [gScore, setGScore] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchGrades = useCallback(async () => {
    if (isDemo) { setGrades(demoGrades); setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from("grades").select("*").eq("user_id", session.user.id).order("created_at");
    if (data) setGrades(data);
    setLoading(false);
  }, [isDemo]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  async function addGrade() {
    setError("");
    if (!gName.trim() || !gWeight) { setError("Name and weight required."); return; }
    const scoreVal = gScore === "" ? null : parseFloat(gScore);
    if (isDemo) { setGrades([...grades, { id: Date.now(), name: gName, weight: parseFloat(gWeight), score: scoreVal }]); setGName(""); setGWeight(""); setGScore(""); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("grades").insert({ user_id: session.user.id, name: gName.trim(), weight: parseFloat(gWeight), score: scoreVal });
    setGName(""); setGWeight(""); setGScore("");
    fetchGrades();
  }

  async function delGrade(id: number) {
    if (!confirm("Delete this grade component?")) return;
    if (isDemo) { setGrades(grades.filter(g => g.id !== id)); return; }
    await supabase.from("grades").delete().eq("id", id);
    fetchGrades();
  }

  if (loading) return null;

  // Calculate
  const done = grades.filter(g => g.score !== null);
  const pending = grades.filter(g => g.score === null);
  const doneWeight = done.reduce((s, g) => s + g.weight, 0);
  const pendingWeight = pending.reduce((s, g) => s + g.weight, 0);
  const earned = done.reduce((s, g) => s + (g.score || 0) * g.weight, 0);
  const current = doneWeight ? (earned / doneWeight).toFixed(1) + "/20" : "no scores yet";
  const targetNum = parseFloat(target);
  let needed = "—";
  if (pendingWeight > 0) {
    const n = ((targetNum * (doneWeight + pendingWeight) - earned) / pendingWeight);
    if (n < 0) needed = "Already secured ✓";
    else if (n > 20) needed = "Not mathematically possible";
    else needed = n.toFixed(1) + "/20";
  } else if (done.length > 0) needed = "No pending components";

  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Grade calculator</h1>
        <p className="page-sub">St Andrews 20-point scale.</p>
        <div className="card mb">
          <h3>Add component</h3>
          <div className="grid grid-3">
            <div className="field"><label>Name</label><input value={gName} onChange={e => setGName(e.target.value)} placeholder="e.g. Mid-term essay" /></div>
            <div className="field"><label>Weight (%)</label><input type="number" value={gWeight} onChange={e => setGWeight(e.target.value)} min={0} max={100} /></div>
            <div className="field"><label>Score (0–20, blank if pending)</label><input type="number" value={gScore} onChange={e => setGScore(e.target.value)} min={0} max={20} step={0.1} /></div>
          </div>
          {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button className="btn btn-grad" onClick={addGrade}>Add component</button>
        </div>
        <div className="card mb">
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Target grade</label>
            <select value={target} onChange={e => setTarget(e.target.value)}>
              <option value="16.5">First (16.5+)</option>
              <option value="13.5">2:1 (13.5–16.4)</option>
              <option value="11">2:2 (11–13.4)</option>
              <option value="7">Third (7–10.9)</option>
            </select>
          </div>
          {grades.length > 0 && (
            <div>
              <p style={{ fontSize: 13 }}><b>Current weighted average:</b> {current}</p>
              <p style={{ fontSize: 13 }}><b>Required on remaining:</b> <span style={{ color: needed.includes("✓") ? "var(--emerald)" : needed.includes("Not") ? "var(--red)" : "inherit" }}>{needed}</span></p>
            </div>
          )}
        </div>
        {grades.map(g => (
          <div key={g.id} className="card mb">
            <div className="row between">
              <div><b>{g.name}</b><br /><small>{g.weight}% · {g.score === null ? "pending" : `score ${g.score}`}</small></div>
              <button className="btn btn-danger btn-sm" onClick={() => delGrade(g.id)}>Delete</button>
            </div>
          </div>
        ))}
        {grades.length === 0 && <div className="empty">No components added.</div>}
        <div className="card mt">
          <h3>St Andrews 20-point scale</h3>
          <small>16.5+ = First · 13.5–16.4 = 2:1 · 11–13.4 = 2:2 · 7–10.9 = Third · &lt;7 = Fail</small>
        </div>
      </div>
    </AppShell>
  );
}

export default function GradesPage() { return <Suspense><GradesInner /></Suspense>; }
