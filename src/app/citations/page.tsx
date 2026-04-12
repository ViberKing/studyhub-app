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
    const a = val("cAuthor") || val("cDirector") || val("cOrg"), y = val("cYear"), t = val("cTitle");
    if (!a || !y || !t) { setOutput(""); setCopied(false); setFormError("Author/director, year, and title are required."); return; }
    let cite = "";

    if (sourceType === "Book") {
      const p = val("cPub");
      if (format === "APA") cite = `${a} (${y}). *${t}*. ${p}.`;
      else if (format === "MLA") cite = `${a}. *${t}*. ${p}, ${y}.`;
      else cite = `${a} (${y}) *${t}*. ${p}.`;

    } else if (sourceType === "Book chapter") {
      const ch = val("cChapter"), ed = val("cEditor"), p = val("cPub"), pg = val("cPages");
      if (format === "APA") cite = `${a} (${y}). ${ch}. In ${ed ? ed + " (Ed.), " : ""}*${t}* (pp. ${pg || "n.p."}). ${p}.`;
      else if (format === "MLA") cite = `${a}. "${ch}." *${t}*, edited by ${ed || "n.a."}, ${p}, ${y}, pp. ${pg || "n.p."}.`;
      else cite = `${a} (${y}) '${ch}', in ${ed ? ed + " (ed.) " : ""}*${t}*. ${p}, pp. ${pg || "n.p."}.`;

    } else if (sourceType === "Journal") {
      const j = val("cJournal"), v = val("cVol"), pg = val("cPages"), doi = val("cDoi");
      if (format === "APA") cite = `${a} (${y}). ${t}. *${j}*, ${v}, ${pg}.${doi ? ` https://doi.org/${doi}` : ""}`;
      else if (format === "MLA") cite = `${a}. "${t}." *${j}* ${v} (${y}): ${pg}.${doi ? ` doi:${doi}` : ""}`;
      else cite = `${a} (${y}) '${t}', *${j}*, ${v}, pp. ${pg}.${doi ? ` doi:${doi}` : ""}`;

    } else if (sourceType === "Website") {
      const u = val("cUrl"), acc = val("cAccessed");
      if (format === "APA") cite = `${a} (${y}). ${t}. ${u}`;
      else if (format === "MLA") cite = `${a}. "${t}." Web, ${y}, ${u}.${acc ? ` Accessed ${acc}.` : ""}`;
      else cite = `${a} (${y}) ${t}. Available at: ${u}${acc ? ` (Accessed: ${acc})` : ""}`;

    } else if (sourceType === "Film/documentary") {
      const dir = val("cDirector"), prod = val("cProduction");
      if (format === "APA") cite = `${dir || a} (Director). (${y}). *${t}* [Film]. ${prod}.`;
      else if (format === "MLA") cite = `*${t}*. Directed by ${dir || a}, ${prod}, ${y}.`;
      else cite = `${dir || a} (${y}) *${t}* [Film]. ${prod}.`;

    } else if (sourceType === "Report") {
      const org = val("cOrg"), rn = val("cReportNum"), u = val("cUrl");
      if (format === "APA") cite = `${a || org} (${y}). *${t}*${rn ? ` (Report No. ${rn})` : ""}. ${org !== a ? org + ". " : ""}${u || ""}`;
      else if (format === "MLA") cite = `${a || org}. *${t}*. ${org !== a ? org + ", " : ""}${y}.${u ? ` ${u}` : ""}`;
      else cite = `${a || org} (${y}) *${t}*${rn ? ` (Report No. ${rn})` : ""}. ${org !== a ? org + ". " : ""}${u ? `Available at: ${u}` : ""}`;
    }

    // Clean up double spaces and trailing dots
    cite = cite.replace(/\s{2,}/g, " ").replace(/\.\./g, ".").trim();
    setFormError("");
    setOutput(cite);
  }

  async function saveCitation(text: string) {
    if (!gate("core")) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("citations").insert({ user_id: session.user.id, text });
    fetchCitations();
  }

  async function delCitation(id: number) {
    if (!gate("core")) return;
    if (!confirm("Delete this saved citation?")) return;
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
        <p className="page-sub">APA, MLA and Harvard formats. Books, journals, websites, films, reports and more.</p>
        <div className="card mb">
          <div className="grid grid-2">
            <div className="field"><label>Format</label>
              <select value={format} onChange={e => setFormat(e.target.value)}><option>APA</option><option>MLA</option><option>Harvard</option></select>
            </div>
            <div className="field"><label>Source type</label>
              <select value={sourceType} onChange={e => setSourceType(e.target.value)}>
                <option>Book</option>
                <option>Book chapter</option>
                <option>Journal</option>
                <option>Website</option>
                <option>Film/documentary</option>
                <option>Report</option>
              </select>
            </div>
          </div>

          {sourceType === "Film/documentary" ? (
            <>
              {f("Director", "cDirector")}
              {f("Year", "cYear")}
              {f("Title", "cTitle")}
              {f("Production company", "cProduction")}
            </>
          ) : sourceType === "Report" ? (
            <>
              {f("Author (or organisation)", "cAuthor")}
              {f("Year", "cYear")}
              {f("Title", "cTitle")}
              {f("Organisation", "cOrg")}
              {f("Report number (optional)", "cReportNum")}
              {f("URL (optional)", "cUrl")}
            </>
          ) : (
            <>
              {f("Author", "cAuthor")}
              {f("Year", "cYear")}
              {f("Title", "cTitle")}
            </>
          )}

          {sourceType === "Book" && f("Publisher", "cPub")}
          {sourceType === "Book chapter" && (
            <>
              {f("Chapter title", "cChapter")}
              {f("Editor(s)", "cEditor")}
              {f("Publisher", "cPub")}
              {f("Pages", "cPages")}
            </>
          )}
          {sourceType === "Journal" && (
            <>
              {f("Journal name", "cJournal")}
              {f("Volume", "cVol")}
              {f("Pages", "cPages")}
              {f("DOI (optional)", "cDoi")}
            </>
          )}
          {sourceType === "Website" && (
            <>
              {f("URL", "cUrl")}
              {f("Date accessed (optional)", "cAccessed")}
            </>
          )}
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
