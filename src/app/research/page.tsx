"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";

interface Source { id: number; title: string; author: string; results: Record<string, string>; }
interface Project { id: number; module: string; brief: string; sources: Source[]; created_at: string; }

const placeholders: Record<string, string> = {
  hard: "AI processing not available offline. Connect Claude API to generate a detailed summary.",
  soft: "AI processing not available offline. Connect Claude API for a 3-4 sentence overview.",
  cards: "AI processing not available offline. Connect Claude API to auto-generate flashcards.",
  pages: "AI processing not available offline. Connect Claude API to identify key pages.",
};

function ResearchInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();

  const [integrityAgreed, setIntegrityAgreed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [resModule, setResModule] = useState("");
  const [resBrief, setResBrief] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (isDemo) {
        setIntegrityAgreed(true);
        setProjects([{ id: 1, module: "PH1011", brief: "Discuss Plato's critique of democracy.", sources: [], created_at: new Date().toISOString() }]);
        setLoading(false); return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from("profiles").select("integrity_agreed").eq("id", session.user.id).single();
      if (profile?.integrity_agreed) setIntegrityAgreed(true);
      else setShowModal(true);
      const { data: proj } = await supabase.from("research_projects").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
      if (proj) setProjects(proj);
      // Load unsaved sources
      const { data: src } = await supabase.from("research_sources").select("*").eq("user_id", session.user.id).eq("is_unsaved", true);
      if (src) setSources(src.map(s => ({ id: s.id, title: s.title, author: s.author, results: { hard: s.result_hard || "", soft: s.result_soft || "", cards: s.result_cards || "", pages: s.result_pages || "" } })));
      setLoading(false);
    }
    load();
  }, []);

  async function agreeIntegrity() {
    const checks = Array.from(document.querySelectorAll<HTMLInputElement>(".agreeChk"));
    if (!checks.every(c => c.checked)) { alert("Please tick all five boxes."); return; }
    setIntegrityAgreed(true);
    setShowModal(false);
    if (!isDemo) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await supabase.from("profiles").update({ integrity_agreed: true }).eq("id", session.user.id);
    }
  }

  function addSourceManual() {
    const title = prompt("Source title:");
    if (!title) return;
    const author = prompt("Author(s):") || "";
    const newSource = { id: Date.now(), title, author, results: {} };
    setSources([...sources, newSource]);
    if (!isDemo) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) supabase.from("research_sources").insert({ user_id: session.user.id, title, author, is_unsaved: true });
      });
    }
  }

  function processSource(id: number, kind: string) {
    setSources(sources.map(s => s.id === id ? { ...s, results: { ...s.results, [kind]: placeholders[kind] } } : s));
  }

  function delSource(id: number) {
    if (!confirm("Remove this source?")) return;
    setSources(sources.filter(s => s.id !== id));
    if (!isDemo) supabase.from("research_sources").delete().eq("id", id);
  }

  async function saveProject() {
    if (!resModule.trim() || !resBrief.trim()) { alert("Enter module and brief first."); return; }
    setProjects([{ id: Date.now(), module: resModule, brief: resBrief, sources: [...sources], created_at: new Date().toISOString() }, ...projects]);
    setSources([]);
    setResModule(""); setResBrief("");
    alert("Project saved.");
  }

  if (loading) return null;

  const sumClasses: Record<string, string> = { hard: "sum-hard", soft: "sum-soft", cards: "sum-cards", pages: "sum-pages" };
  const sumLabels: Record<string, string> = { hard: "Hard summary", soft: "Soft summary", cards: "Flashcards", pages: "Key pages" };

  return (
    <AppShell>
      {/* Integrity modal */}
      {showModal && (
        <div className="modal-bg open" style={{ display: "flex" }}>
          <div className="modal">
            <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Close">×</button>
            <h2>Academic integrity agreement</h2>
            <p className="modal-sub">Please read carefully before using the Research Assistant.</p>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginTop: 14, fontFamily: "-apple-system,system-ui,sans-serif" }}>Permitted uses</h3>
            <ul className="integrity-list">
              <li><span className="ok">✓</span> Organising your reading materials</li>
              <li><span className="ok">✓</span> Understanding complex texts</li>
              <li><span className="ok">✓</span> Creating study materials from sources you&apos;ve read</li>
              <li><span className="ok">✓</span> Finding relevant sections to read in detail</li>
              <li><span className="ok">✓</span> Literature review preparation</li>
            </ul>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginTop: 14, fontFamily: "-apple-system,system-ui,sans-serif" }}>Prohibited uses</h3>
            <ul className="integrity-list">
              <li><span className="no">✗</span> Using summaries instead of reading the actual sources</li>
              <li><span className="no">✗</span> Copying summaries directly into essays</li>
              <li><span className="no">✗</span> Paraphrasing AI summaries as your own writing</li>
              <li><span className="no">✗</span> Submitting work without reading the originals</li>
              <li><span className="no">✗</span> Failing to cite sources properly</li>
            </ul>
            <h3 style={{ fontSize: 13, fontWeight: 600, marginTop: 14, fontFamily: "-apple-system,system-ui,sans-serif" }}>Declaration</h3>
            <div className="check-row"><input type="checkbox" className="agreeChk" /> I understand academic integrity policies.</div>
            <div className="check-row"><input type="checkbox" className="agreeChk" /> I will use summaries only to guide my reading.</div>
            <div className="check-row"><input type="checkbox" className="agreeChk" /> All submitted work will be my own original writing.</div>
            <div className="check-row"><input type="checkbox" className="agreeChk" /> I will properly cite all sources in my essays.</div>
            <div className="check-row"><input type="checkbox" className="agreeChk" /> I will read the actual sources, not rely on summaries alone.</div>
            <button className="btn btn-grad btn-block mt" onClick={agreeIntegrity}>I agree — continue to Research Assistant</button>
          </div>
        </div>
      )}

      <div className="page active">
        <h1 className="page-title">Research assistant</h1>
        <p className="page-sub">Organise sources, summarise readings, and generate study materials — ethically.</p>
        <div className="integrity-banner">
          <div style={{ fontSize: 18 }}>⚠</div>
          <div><b>This tool helps you understand sources, not replace reading them.</b> All summaries are study aids — your essays must be your own original writing.</div>
        </div>
        <div className="card mb">
          <h3>Step 1 — Essay brief</h3>
          <div className="field"><label>Module / subject</label><input value={resModule} onChange={e => setResModule(e.target.value)} placeholder="e.g. International Relations" /></div>
          <div className="field" style={{ marginBottom: 0 }}><label>Essay question / brief</label><textarea value={resBrief} onChange={e => setResBrief(e.target.value)} placeholder="Paste your essay question here..." maxLength={5000} /></div>
        </div>
        <div className="card mb">
          <h3>Step 2 — Add sources</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 14 }}>Add sources you&apos;ve been assigned, or have AI help find relevant articles.</p>
          <div className="row">
            <button className="btn" onClick={addSourceManual}>Add source manually</button>
            <button className="btn btn-ghost" onClick={() => alert("Google Scholar search requires the Anthropic API.")}>Search Google Scholar</button>
            <button className="btn btn-ghost" onClick={() => alert("PDF upload requires the Anthropic API.")}>Upload PDF</button>
          </div>
        </div>
        <div className="card mb">
          <h3>Step 3 — Process sources</h3>
          {sources.length ? sources.map(s => (
            <div key={s.id} className="card mb">
              <div className="row between">
                <div><b>{s.title}</b><br /><small>{s.author}</small></div>
                <button className="btn btn-danger btn-sm" onClick={() => delSource(s.id)}>Remove</button>
              </div>
              <div className="row mt">
                <button className="btn btn-sm" onClick={() => processSource(s.id, "hard")}>Hard summary</button>
                <button className="btn btn-ghost btn-sm" onClick={() => processSource(s.id, "soft")}>Soft summary</button>
                <button className="btn btn-ghost btn-sm" onClick={() => processSource(s.id, "cards")}>Flashcards</button>
                <button className="btn btn-ghost btn-sm" onClick={() => processSource(s.id, "pages")}>Key pages</button>
              </div>
              {Object.entries(s.results).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className={`summary-box ${sumClasses[k]}`}><b>{sumLabels[k]}:</b><br />{v}</div>
              ))}
            </div>
          )) : <div className="empty">No sources yet. Add one above.</div>}
        </div>
        <button className="btn btn-grad" onClick={saveProject}>Save research project</button>
        <h3 className="section-title">Saved projects</h3>
        {projects.length ? projects.map(p => (
          <div key={p.id} className="card mb">
            <b>{p.module}</b><br />
            <small>{p.brief.slice(0, 120)}{p.brief.length > 120 ? "..." : ""}</small><br />
            <small>{p.sources.length} sources · {new Date(p.created_at).toLocaleDateString()}</small>
          </div>
        )) : <div className="empty">No saved projects yet.</div>}
      </div>
    </AppShell>
  );
}

export default function ResearchPage() { return <Suspense><ResearchInner /></Suspense>; }
