"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useGate } from "@/components/GateModal";
import AppShell from "@/components/AppShell";
import PageGuide from "@/components/PageGuide";

interface Source { id: number; title: string; author: string; results: Record<string, string>; processing: Record<string, boolean>; }
interface Project { id: number; module: string; brief: string; sources: Source[]; created_at: string; }

function ResearchInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();
  const { gate } = useGate();

  const [integrityAgreed, setIntegrityAgreed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [resModule, setResModule] = useState("");
  const [resBrief, setResBrief] = useState("");
  const [loading, setLoading] = useState(true);
  const [savedMsg, setSavedMsg] = useState("");
  const [integrityError, setIntegrityError] = useState("");
  const [briefError, setBriefError] = useState("");

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
      if (src) setSources(src.map(s => ({ id: s.id, title: s.title, author: s.author, results: { hard: s.result_hard || "", soft: s.result_soft || "", cards: s.result_cards || "", pages: s.result_pages || "" }, processing: {} })));
      setLoading(false);
    }
    load();
  }, []);

  async function agreeIntegrity() {
    const checks = Array.from(document.querySelectorAll<HTMLInputElement>(".agreeChk"));
    if (!checks.every(c => c.checked)) { setIntegrityError("Please tick all five boxes."); return; }
    setIntegrityError("");
    setIntegrityAgreed(true);
    setShowModal(false);
    if (!isDemo) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) await supabase.from("profiles").update({ integrity_agreed: true }).eq("id", session.user.id);
    }
  }

  function addSourceManual() {
    if (!gate("research")) return;
    const title = prompt("Source title:");
    if (!title) return;
    const author = prompt("Author(s):") || "";
    const newSource: Source = { id: Date.now(), title, author, results: {}, processing: {} };
    setSources([...sources, newSource]);
    if (!isDemo) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) supabase.from("research_sources").insert({ user_id: session.user.id, title, author, is_unsaved: true });
      });
    }
  }

  async function processSource(id: number, kind: string) {
    if (!gate("research")) return;

    // Set processing state
    setSources(prev => prev.map(s => s.id === id ? { ...s, processing: { ...s.processing, [kind]: true } } : s));

    try {
      const source = sources.find(s => s.id === id);
      if (!source) return;

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title: source.title,
          author: source.author,
          brief: resBrief || resModule || "General research",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSources(prev => prev.map(s => s.id === id ? {
          ...s,
          results: { ...s.results, [kind]: `Error: ${data.error || "Failed to generate. Try again."}` },
          processing: { ...s.processing, [kind]: false },
        } : s));
        return;
      }

      setSources(prev => prev.map(s => s.id === id ? {
        ...s,
        results: { ...s.results, [kind]: data.result },
        processing: { ...s.processing, [kind]: false },
      } : s));
    } catch {
      setSources(prev => prev.map(s => s.id === id ? {
        ...s,
        results: { ...s.results, [kind]: "Error: Something went wrong. Please try again." },
        processing: { ...s.processing, [kind]: false },
      } : s));
    }
  }

  function delSource(id: number) {
    if (!gate("research")) return;
    if (!confirm("Remove this source?")) return;
    setSources(sources.filter(s => s.id !== id));
    if (!isDemo) supabase.from("research_sources").delete().eq("id", id);
  }

  async function saveProject() {
    if (!gate("research")) return;
    if (!resModule.trim() || !resBrief.trim()) { setBriefError("Enter module and brief first."); return; }
    setBriefError("");
    setProjects([{ id: Date.now(), module: resModule, brief: resBrief, sources: [...sources], created_at: new Date().toISOString() }, ...projects]);
    setSources([]);
    setResModule(""); setResBrief("");
    setSavedMsg("Project saved!");
    setTimeout(() => setSavedMsg(""), 3000);
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
            {integrityError && <p style={{ fontSize: 13, color: "var(--red)", marginBottom: 8 }}>{integrityError}</p>}
            <button className="btn btn-grad btn-block mt" onClick={agreeIntegrity}>I agree — continue to Research Assistant</button>
          </div>
        </div>
      )}

      <div className="page active">
        <h1 className="page-title">Research assistant</h1>
        <p className="page-sub">Organise sources, summarise readings, and generate study materials — ethically.</p>
        <PageGuide
          id="research"
          title="How to use the Research Assistant"
          steps={[
            "Paste a topic or question into the research box and hit Go — the AI finds relevant sources and summaries.",
            "Review the results, save useful sources, and generate flashcards or notes from them.",
            "Use it for understanding topics faster — not for copying. The integrity banner is a reminder to use it ethically.",
            "A completed research session gives you organised sources, key points, and ready-made study materials.",
          ]}
        />
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
            <button className="btn btn-ghost" disabled title="Coming soon" style={{ opacity: 0.5, cursor: "not-allowed" }}>Search Google Scholar</button>
            <button className="btn btn-ghost" disabled title="Coming soon" style={{ opacity: 0.5, cursor: "not-allowed" }}>Upload PDF</button>
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
              <div className="row mt" style={{ flexWrap: "wrap" }}>
                <button className="btn btn-sm" onClick={() => processSource(s.id, "hard")} disabled={!!s.processing?.hard}>
                  {s.processing?.hard ? "Generating..." : "Hard summary"}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => processSource(s.id, "soft")} disabled={!!s.processing?.soft}>
                  {s.processing?.soft ? "Generating..." : "Soft summary"}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => processSource(s.id, "cards")} disabled={!!s.processing?.cards}>
                  {s.processing?.cards ? "Generating..." : "Flashcards"}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => processSource(s.id, "pages")} disabled={!!s.processing?.pages}>
                  {s.processing?.pages ? "Generating..." : "Key pages"}
                </button>
              </div>
              {Object.entries(s.results).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className={`summary-box ${sumClasses[k]}`}><b>{sumLabels[k]}:</b><br /><span style={{ whiteSpace: "pre-wrap" }}>{v}</span></div>
              ))}
            </div>
          )) : <div className="empty">No sources yet. Add one above.</div>}
        </div>
        {briefError && <p style={{ fontSize: 13, color: "var(--red)", marginBottom: 8 }}>{briefError}</p>}
        <button className="btn btn-grad" onClick={saveProject}>Save research project</button>
        {savedMsg && <span style={{ marginLeft: 12, fontSize: 13, color: "var(--emerald)", fontWeight: 500 }}>{savedMsg}</span>}
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
