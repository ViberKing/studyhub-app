"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import { useGate } from "@/components/GateModal";
import PageGuide from "@/components/PageGuide";

interface Assignment { id: number; title: string; module: string; due: string; type: string; priority: string; weight: number; status: string; done: boolean; }

function daysUntil(date: string) { return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000); }

function addDays(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split("T")[0]; }

const demoAssignments: Assignment[] = [
  { id: 1, title: "Plato's Republic essay", module: "PH1011", due: addDays(2), type: "Essay", priority: "High", weight: 30, status: "In Progress", done: false },
  { id: 2, title: "IR theory presentation", module: "IR2001", due: addDays(5), type: "Presentation", priority: "Medium", weight: 20, status: "Not Started", done: false },
  { id: 3, title: "Statistics problem set 4", module: "PS2002", due: addDays(8), type: "Other", priority: "Medium", weight: 10, status: "Not Started", done: false },
  { id: 4, title: "Cold War literature review", module: "HI3010", due: addDays(14), type: "Essay", priority: "High", weight: 40, status: "In Progress", done: false },
  { id: 5, title: "Microeconomics midterm", module: "EC1001", due: addDays(-3), type: "Exam", priority: "High", weight: 25, status: "Completed", done: true },
];

function AssignmentsInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();
  const { gate } = useGate();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filter, setFilter] = useState("all");
  const [aTitle, setATitle] = useState("");
  const [aModule, setAModule] = useState("");
  const [aDue, setADue] = useState("");
  const [aType, setAType] = useState("Essay");
  const [aPriority, setAPriority] = useState("Medium");
  const [aWeight, setAWeight] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchAssignments = useCallback(async () => {
    if (isDemo) { setAssignments(demoAssignments); setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from("assignments").select("*").eq("user_id", session.user.id).order("due");
    if (data) setAssignments(data);
    setLoading(false);
  }, [isDemo]);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  async function addAssignment() {
    setError("");
    if (!gate("core")) return;
    if (!aTitle.trim() || !aDue) { setError("Title and due date required."); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("assignments").insert({ user_id: session.user.id, title: aTitle.trim(), module: aModule.trim(), due: aDue, type: aType, priority: aPriority, weight: parseFloat(aWeight) || 0 });
    setATitle(""); setAModule(""); setADue(""); setAWeight("");
    fetchAssignments();
  }

  async function updateStatus(id: number, status: string) {
    if (!gate("core")) return;
    const done = status === "Completed";
    await supabase.from("assignments").update({ status, done }).eq("id", id);
    fetchAssignments();
  }

  async function delAssignment(id: number) {
    if (!gate("core")) return;
    if (!confirm("Delete this assignment?")) return;
    await supabase.from("assignments").delete().eq("id", id);
    fetchAssignments();
  }

  if (loading) return null;

  let list = assignments.slice();
  if (filter === "active") list = list.filter(a => !a.done);
  if (filter === "done") list = list.filter(a => a.done);
  list.sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());

  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Assignments</h1>
        <p className="page-sub">Track everything you have to hand in.</p>
        <PageGuide
          id="assignments"
          title="How to use Assignments"
          steps={[
            "Add an assignment by filling in the title, module, due date, and weighting.",
            "Each card shows the status, due date, and grade weighting at a glance.",
            "Mark assignments as complete or delete them once submitted.",
            "A completed page will show all your modules' assignments with clear due dates and progress.",
          ]}
        />
        <div className="card mb">
          <h3>Add assignment</h3>
          <div className="grid grid-2">
            <div className="field"><label>Title</label><input value={aTitle} onChange={e => setATitle(e.target.value)} placeholder="Essay title" /></div>
            <div className="field"><label>Module</label><input value={aModule} onChange={e => setAModule(e.target.value)} placeholder="e.g. PH1011" /></div>
            <div className="field"><label>Due date</label><input type="date" value={aDue} onChange={e => setADue(e.target.value)} /></div>
            <div className="field"><label>Type</label>
              <select value={aType} onChange={e => setAType(e.target.value)}><option>Essay</option><option>Exam</option><option>Lab report</option><option>Presentation</option><option>Other</option></select>
            </div>
            <div className="field"><label>Priority</label>
              <select value={aPriority} onChange={e => setAPriority(e.target.value)}><option>Low</option><option>Medium</option><option>High</option></select>
            </div>
            <div className="field"><label>Weight (%)</label><input type="number" value={aWeight} onChange={e => setAWeight(e.target.value)} placeholder="e.g. 30" min={0} max={100} /></div>
          </div>
          {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button className="btn btn-grad" onClick={addAssignment}>Add assignment</button>
        </div>
        <div className="row mb">
          {["all", "active", "done"].map(f => (
            <button key={f} className={`btn btn-ghost btn-sm${filter === f ? "" : ""}`} onClick={() => setFilter(f)} style={filter === f ? { background: "var(--rose-50)", borderColor: "var(--rose-200)", color: "var(--red)" } : {}}>
              {f === "all" ? "All" : f === "active" ? "Active" : "Completed"}
            </button>
          ))}
        </div>
        {list.length ? list.map(a => {
          const d = daysUntil(a.due);
          const cls = a.done ? "badge-gray" : d < 3 ? "badge-red" : d < 7 ? "badge-amber" : "badge-green";
          return (
            <div key={a.id} className="card mb">
              <div className="row between">
                <div>
                  <b>{a.title}</b> <span className={`badge ${cls}`}>{a.done ? "Done" : `${d} days`}</span>
                  <br /><small>{a.module} · {a.type} · {a.weight}% · {a.priority} priority · due {a.due}</small>
                </div>
                <div className="row">
                  <select value={a.status} onChange={e => updateStatus(a.id, e.target.value)} style={{ padding: "6px 10px", border: "1.5px solid var(--border-strong)", borderRadius: 8, background: "white" }}>
                    <option>Not Started</option><option>In Progress</option><option>Completed</option>
                  </select>
                  <button className="btn btn-danger btn-sm" onClick={() => delAssignment(a.id)}>Delete</button>
                </div>
              </div>
            </div>
          );
        }) : <div className="empty">No assignments yet.</div>}
      </div>
    </AppShell>
  );
}

export default function AssignmentsPage() { return <Suspense><AssignmentsInner /></Suspense>; }
