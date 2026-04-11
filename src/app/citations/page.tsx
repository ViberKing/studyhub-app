"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import { useGate } from "@/components/GateModal";

interface Citation { id: number; text: string; }

function val(id: string) { return (document.getElementById(id) as HTMLInputElement)?.value?.trim() ?? ""; }

function CitationsInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();
  const { gate } = useGate();

  const [citations, setCitations] = useState<Citation[]>([]);
  const [format, setFormat] = useState("APA");
  const [sourceType, setSourceType] = useState("Book");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCitations = useCallback(async () => {
    if (isDemo) {
      setCitations([
        { id: 1, text: "Plato (380 BC) The Republic. Penguin Classics." },
        { id: 2, text: "Mearsheimer, J. (2001) The Tragedy of Great Power Politics. W.W. Norton." },
      ]);
      setLoading(false); return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from("citations").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false });
    if (data) setCitations(data);
    setLoading(false);
  }, [isDemo]);

  useEffect(() => { fetchCitations(); }, [fetchCitations]);

  function generateCitation() {
    if (!gate("core")) return;
    const a = val("cAuthor"), y = val("cYear"), t = val("cTitle");
    if (!a || !y || !t) { setOutput(""); setCopied(false); setFormError("Author, year, and title are required."); return; }
    let cite = "";
    if (sourceType === "Book") {
      const p = val("cPub");
      if (format === "APA") cite = `${a} (${y}). ${t}. ${p}.`;
      else if (format === "MLA") cite = `${a}. ${t}. ${p}, ${y}.`;
      else cite = `${a} (${y}) ${t}. ${p}.`;
    } else if (sourceType === "Journal") {
      const j = val("cJournal"), v = val("cVol"), pg = val("cPages");
      if (format === "APA") cite = `${a} (${y}). ${t}. ${j}, ${v}, ${pg}.`;
      else if (format === "MLA") cite = `${a}. "${t}." ${j} ${v} (${y}): ${pg}.`;
      else cite = `${a} (${y}) '${t}', ${j}, ${v}, pp. ${pg}.`;
    } else {
      const u = val("cUrl");
      if (format === "APA") cite = `${a} (${y}). ${t}. ${u}`;
      else if (format === "MLA") cite = `${a}. "${t}." Web, ${y}, ${u}.`;
      else cite = `${a} (${y}) ${t}. Available at: ${u}`;
    }
    setFormError("");
    setOutput(cite);
  }

  async function saveCitation(text: string) {
    if (!gate("core")) return;
    if (isDemo) { setCitations([{ id: Date.now(), text }, ...citations]); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("citations").insert({ user_id: session.user.id, text });
    fetchCitations();
  }

  async function delCitation(id: number) {
    if (!gate("core")) return;
    if (!confirm("Delete this saved citation?")) return;
    if (isDemo) { setCitations(citations.filter(c => c.id !== id)); return; }
    await supabase.from("citations").delete().eq("id", id);
    fetchCitations();
  }

  if (loading) return null;

  const f = (label: string, id: string) => (
    <div className="field"><label>{label}</label><input id={id} /></div>
  );

  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Citation generator</h1>
        <p className="page-sub">APA, MLA and Harvard formats.</p>
        <div className="card mb">
          <div className="grid grid-2">
            <div className="field"><label>Format</label>
              <select value={format} onChange={e => setFormat(e.target.value)}><option>APA</option><option>MLA</option><option>Harvard</option></select>
            </div>
            <div className="field"><label>Source type</label>
              <select value={sourceType} onChange={e => setSourceType(e.target.value)}><option>Book</option><option>Journal</option><option>Website</option></select>
            </div>
          </div>
          {f("Author", "cAuthor")}{f("Year", "cYear")}{f("Title", "cTitle")}
          {sourceType === "Book" && f("Publisher", "cPub")}
          {sourceType === "Journal" && <>{f("Journal", "cJournal")}{f("Volume", "cVol")}{f("Pages", "cPages")}</>}
          {sourceType === "Website" && f("URL", "cUrl")}
          {formError && <p style={{ fontSize: 13, color: "var(--red)", marginBottom: 8 }}>{formError}</p>}
          <button className="btn" onClick={generateCitation}>Generate citation</button>
        </div>
        {output && (
          <div className="card">
            <p style={{ fontSize: 13 }}>{output}</p>
            <div className="row mt">
              <button className="btn btn-sm" onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>Copy</button>
              {copied && <span style={{ fontSize: 13, color: "var(--emerald)", fontWeight: 500 }}>Copied!</span>}
              <button className="btn btn-ghost btn-sm" onClick={() => saveCitation(output)}>Save</button>
            </div>
          </div>
        )}
        <h3 className="section-title">Saved citations</h3>
        {citations.length ? citations.map(c => (
          <div key={c.id} className="card mb">
            <p style={{ fontSize: 13 }}>{c.text}</p>
            <button className="btn btn-danger btn-sm mt" onClick={() => delCitation(c.id)}>Delete</button>
          </div>
        )) : <div className="empty">No saved citations.</div>}
      </div>
    </AppShell>
  );
}

export default function CitationsPage() { return <Suspense><CitationsInner /></Suspense>; }
