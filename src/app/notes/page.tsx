"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import { useGate } from "@/components/GateModal";

interface Note { id: number; title: string; content: string; module: string; created_at: string; }

function NotesInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();
  const { gate } = useGate();

  const [notes, setNotes] = useState<Note[]>([]);
  const [nTitle, setNTitle] = useState("");
  const [nModule, setNModule] = useState("");
  const [nContent, setNContent] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (isDemo) {
      setNotes([
        { id: 1, title: "Lecture 3 — Plato", content: "Key points:\n- Theory of Forms\n- Critique of democracy\n- Role of philosopher kings", module: "PH1011", created_at: new Date().toISOString() },
        { id: 2, title: "IR seminar prep", content: "Read Mearsheimer ch 1-2. Focus on offensive realism vs defensive realism.", module: "IR2001", created_at: new Date().toISOString() },
      ]);
      setLoading(false); return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from("notes").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
    if (data) setNotes(data);
    setLoading(false);
  }, [isDemo]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  async function addNote() {
    if (!gate("core")) return;
    setError("");
    if (!nTitle.trim() || !nContent.trim()) { setError("Title and content required."); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("notes").insert({ user_id: session.user.id, title: nTitle.trim(), content: nContent.trim(), module: nModule.trim() });
    setNTitle(""); setNModule(""); setNContent("");
    fetchNotes();
  }

  async function delNote(id: number) {
    if (!gate("core")) return;
    if (!confirm("Delete this note?")) return;
    await supabase.from("notes").delete().eq("id", id);
    fetchNotes();
  }

  if (loading) return null;

  const filtered = notes.filter(n => !search || (n.module || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Notes</h1>
        <p className="page-sub">Quick study notes per module.</p>
        <div className="card mb">
          <div className="field"><label>Title</label><input value={nTitle} onChange={e => setNTitle(e.target.value)} placeholder="Note title" /></div>
          <div className="field"><label>Module</label><input value={nModule} onChange={e => setNModule(e.target.value)} placeholder="Module code" /></div>
          <div className="field" style={{ marginBottom: 12 }}><label>Content</label><textarea value={nContent} onChange={e => setNContent(e.target.value)} placeholder="Your notes..." maxLength={10000} /></div>
          {error && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button className="btn btn-grad" onClick={addNote}>Save note</button>
        </div>
        <div className="field mb"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by module..." /></div>
        {filtered.length ? filtered.map(n => (
          <div key={n.id} className="card mb">
            <div className="row between"><b>{n.title}</b><button className="btn btn-danger btn-sm" onClick={() => delNote(n.id)}>Delete</button></div>
            <small>{n.module} · {new Date(n.created_at).toLocaleDateString()}</small>
            <p style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 13 }}>{n.content}</p>
          </div>
        )) : <div className="empty">No notes yet.</div>}
      </div>
    </AppShell>
  );
}

export default function NotesPage() { return <Suspense><NotesInner /></Suspense>; }
