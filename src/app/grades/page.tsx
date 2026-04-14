"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell, { useAppContext } from "@/components/AppShell";
import UniSelector from "@/components/UniSelector";
import PageGuide from "@/components/PageGuide";
import { getUniversity, getGradingConfig, type University } from "@/lib/universities";
import { useGate } from "@/components/GateModal";

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
  const { profile } = useAppContext();
  const { gate } = useGate();

  const profileUni = profile?.university || "st-andrews";
  const [selectedUni, setSelectedUni] = useState(profileUni);

  const uni = getUniversity(selectedUni);
  const gradingConfig = getGradingConfig(uni?.gradingSystem || "percentage");

  const [grades, setGrades] = useState<Grade[]>([]);
  const [target, setTarget] = useState(gradingConfig.targets[0].value);
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

  // Reset target when grading system changes
  useEffect(() => {
    setTarget(gradingConfig.targets[0].value);
  }, [selectedUni]);

  async function addGrade() {
    if (!gate("core")) return;
    setError("");
    if (!gName.trim() || !gWeight) { setError("Name and weight required."); return; }
    const scoreVal = gScore === "" ? null : parseFloat(gScore);
    if (scoreVal !== null && (scoreVal < 0 || scoreVal > gradingConfig.maxScore)) {
      setError(`Score must be between 0 and ${gradingConfig.maxScore}.`);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("grades").insert({ user_id: session.user.id, name: gName.trim(), weight: parseFloat(gWeight), score: scoreVal });
    setGName(""); setGWeight(""); setGScore("");
    fetchGrades();
  }

  async function delGrade(id: number) {
    if (!gate("core")) return;
    if (!confirm("Delete this grade component?")) return;
    await supabase.from("grades").delete().eq("id", id);
    fetchGrades();
  }

  if (loading) return null;

  // Calculate
  const max = gradingConfig.maxScore;
  const done = grades.filter(g => g.score !== null);
  const pending = grades.filter(g => g.score === null);
  const doneWeight = done.reduce((s, g) => s + g.weight, 0);
  const pendingWeight = pending.reduce((s, g) => s + g.weight, 0);
  const earned = done.reduce((s, g) => s + (g.score || 0) * g.weight, 0);
  const current = doneWeight ? (earned / doneWeight).toFixed(1) + `/${max}` : "no scores yet";
  const targetNum = parseFloat(target);
  let needed = "\u2014";
  if (pendingWeight > 0) {
    const n = ((targetNum * (doneWeight + pendingWeight) - earned) / pendingWeight);
    if (n < 0) needed = "Already secured \u2713";
    else if (n > max) needed = "Not mathematically possible";
    else needed = n.toFixed(1) + `/${max}`;
  } else if (done.length > 0) needed = "No pending components";

  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Grade calculator</h1>
        <p className="page-sub">{uni?.name || "University"} &mdash; {gradingConfig.scaleLabel}.</p>
        <PageGuide
          id="grades"
          title="How to use the Grade Calculator"
          steps={[
            "Add your modules and enter the weighting for each assignment (e.g. 40% coursework, 60% exam).",
            "Enter your marks as you get them back — the calculator shows your module and overall average in real time.",
            "The grading scale matches your university automatically.",
            "When complete, you'll see your predicted degree classification based on all your entered grades.",
          ]}
        />

        {/* University selector */}
        <div style={{ marginBottom: 20 }}>
          <UniSelector
            value={selectedUni}
            onChange={(u: University) => setSelectedUni(u.id)}
            compact
          />
        </div>

        <div className="card mb">
          <h3>Add component</h3>
          <div className="grid grid-3">
            <div className="field"><label>Name</label><input value={gName} onChange={e => setGName(e.target.value)} placeholder="e.g. Mid-term essay" /></div>
            <div className="field"><label>Weight (%)</label><input type="number" value={gWeight} onChange={e => setGWeight(e.target.value)} min={0} max={100} /></div>
            <div className="field"><label>Score (0\u2013{max}, blank if pending)</label><input type="number" value={gScore} onChange={e => setGScore(e.target.value)} min={0} max={max} step={0.1} /></div>
          </div>
          {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button className="btn btn-grad" onClick={addGrade}>Add component</button>
        </div>
        <div className="card mb">
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Target grade</label>
            <select value={target} onChange={e => setTarget(e.target.value)}>
              {gradingConfig.targets.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          {grades.length > 0 && (
            <div>
              <p style={{ fontSize: 13 }}><b>Current weighted average:</b> {current}</p>
              <p style={{ fontSize: 13 }}><b>Required on remaining:</b> <span style={{ color: needed.includes("\u2713") ? "var(--emerald)" : needed.includes("Not") ? "var(--red)" : "inherit" }}>{needed}</span></p>
            </div>
          )}
        </div>
        {grades.map(g => (
          <div key={g.id} className="card mb">
            <div className="row between">
              <div><b>{g.name}</b><br /><small>{g.weight}% \u00B7 {g.score === null ? "pending" : `score ${g.score}`}</small></div>
              <button className="btn btn-danger btn-sm" onClick={() => delGrade(g.id)}>Delete</button>
            </div>
          </div>
        ))}
        {grades.length === 0 && <div className="empty">No components added.</div>}
        <div className="card mt">
          <h3>{gradingConfig.scaleLabel}</h3>
          <small>{gradingConfig.scaleSummary}</small>
        </div>
      </div>
    </AppShell>
  );
}

export default function GradesPage() { return <Suspense><GradesInner /></Suspense>; }
