"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import { useGate } from "@/components/GateModal";

interface Module { id: number; name: string; code: string; lecturer: string; credits: number; }

const demoModules: Module[] = [
  { id: 1, name: "Introduction to Philosophy", code: "PH1011", lecturer: "Dr Hamilton", credits: 30 },
  { id: 2, name: "International Relations Theory", code: "IR2001", lecturer: "Prof Walsh", credits: 30 },
  { id: 3, name: "Cold War History", code: "HI3010", lecturer: "Dr MacKenzie", credits: 30 },
];

function ModulesInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();
  const { gate } = useGate();

  const [modules, setModules] = useState<Module[]>([]);
  const [mName, setMName] = useState("");
  const [mCode, setMCode] = useState("");
  const [mLect, setMLect] = useState("");
  const [mCredits, setMCredits] = useState("30");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [eName, setEName] = useState("");
  const [eCode, setECode] = useState("");
  const [eLect, setELect] = useState("");
  const [eCredits, setECredits] = useState("30");

  const fetchModules = useCallback(async () => {
    if (isDemo) { setModules(demoModules); setLoading(false); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const { data } = await supabase.from("modules").select("*").eq("user_id", session.user.id).order("created_at");
    if (data) setModules(data);
    setLoading(false);
  }, [isDemo]);

  useEffect(() => { fetchModules(); }, [fetchModules]);

  async function addModule() {
    if (!gate("core")) return;
    setError("");
    if (!mName.trim()) { setError("Name required."); return; }

    if (isDemo) {
      const fresh: Module = {
        id: Date.now(),
        name: mName.trim(),
        code: mCode.trim(),
        lecturer: mLect.trim(),
        credits: parseInt(mCredits) || 30,
      };
      setModules(prev => [...prev, fresh]);
      setMName(""); setMCode(""); setMLect("");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error: err } = await supabase.from("modules").insert({
      user_id: session.user.id,
      name: mName.trim(),
      code: mCode.trim(),
      lecturer: mLect.trim(),
      credits: parseInt(mCredits) || 30,
    });
    if (err) { setError(err.message); return; }
    setMName(""); setMCode(""); setMLect("");
    fetchModules();
  }

  function startEdit(m: Module) {
    setEditingId(m.id);
    setEName(m.name);
    setECode(m.code);
    setELect(m.lecturer);
    setECredits(String(m.credits));
  }

  function cancelEdit() {
    setEditingId(null);
    setEName(""); setECode(""); setELect(""); setECredits("30");
  }

  async function saveEdit(id: number) {
    if (!gate("core")) return;
    if (!eName.trim()) { setError("Name required."); return; }
    setError("");

    const patch = {
      name: eName.trim(),
      code: eCode.trim(),
      lecturer: eLect.trim(),
      credits: parseInt(eCredits) || 30,
    };

    if (isDemo) {
      setModules(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m));
      cancelEdit();
      return;
    }

    const { error: err } = await supabase.from("modules").update(patch).eq("id", id);
    if (err) { setError(err.message); return; }
    cancelEdit();
    fetchModules();
  }

  async function delModule(id: number) {
    if (!gate("core")) return;
    if (!confirm("Delete this module?")) return;
    if (isDemo) { setModules(prev => prev.filter(m => m.id !== id)); return; }
    await supabase.from("modules").delete().eq("id", id);
    fetchModules();
  }

  if (loading) return null;

  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Modules</h1>
        <p className="page-sub">Your courses this semester.</p>
        <div className="card mb">
          <h3>Add module</h3>
          <div className="grid grid-2">
            <div className="field"><label>Name</label><input value={mName} onChange={e => setMName(e.target.value)} placeholder="e.g. Introduction to Philosophy" /></div>
            <div className="field"><label>Code</label><input value={mCode} onChange={e => setMCode(e.target.value)} placeholder="e.g. PH1011" /></div>
            <div className="field"><label>Lecturer</label><input value={mLect} onChange={e => setMLect(e.target.value)} placeholder="Module coordinator" /></div>
            <div className="field"><label>Credits</label><input type="number" value={mCredits} onChange={e => setMCredits(e.target.value)} min={0} max={120} /></div>
          </div>
          {error && !editingId && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button className="btn btn-grad" onClick={addModule}>Add module</button>
        </div>
        {modules.length ? modules.map(m => (
          <div key={m.id} className="card mb">
            {editingId === m.id ? (
              <>
                <div className="grid grid-2">
                  <div className="field"><label>Name</label><input value={eName} onChange={e => setEName(e.target.value)} /></div>
                  <div className="field"><label>Code</label><input value={eCode} onChange={e => setECode(e.target.value)} /></div>
                  <div className="field"><label>Lecturer</label><input value={eLect} onChange={e => setELect(e.target.value)} /></div>
                  <div className="field"><label>Credits</label><input type="number" value={eCredits} onChange={e => setECredits(e.target.value)} min={0} max={120} /></div>
                </div>
                {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-grad btn-sm" onClick={() => saveEdit(m.id)}>Save</button>
                  <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>
                </div>
              </>
            ) : (
              <div className="row between">
                <div>
                  <b>{m.name}</b>
                  <br />
                  <small>{m.code || "No code"} {m.lecturer ? `· ${m.lecturer}` : ""} · {m.credits} credits</small>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn btn-sm" onClick={() => startEdit(m)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => delModule(m.id)}>Delete</button>
                </div>
              </div>
            )}
          </div>
        )) : <div className="empty">No modules yet.</div>}
      </div>
    </AppShell>
  );
}

export default function ModulesPage() { return <Suspense><ModulesInner /></Suspense>; }
