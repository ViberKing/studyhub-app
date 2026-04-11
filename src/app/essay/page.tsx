"use client";

import { Suspense, useState } from "react";
import { useGate } from "@/components/GateModal";
import AppShell from "@/components/AppShell";

const essayTemplates: Record<string, [string, number, string][]> = {
  argumentative: [["Introduction", 0.1, "State your thesis clearly."], ["Background / context", 0.15, "Necessary context for the debate."], ["Argument 1", 0.2, "Your strongest argument with evidence."], ["Argument 2", 0.2, "Second key argument, building on the first."], ["Counter-arguments", 0.2, "Acknowledge and refute opposing views."], ["Conclusion", 0.15, "Restate thesis and end strongly."]],
  litreview: [["Introduction", 0.1, "Introduce the topic and scope."], ["Theoretical framework", 0.15, "Key theories and concepts."], ["Thematic discussion", 0.5, "Group sources by theme and synthesise."], ["Gaps in literature", 0.15, "What hasn't been studied?"], ["Conclusion", 0.1, "Summarise findings."]],
  compare: [["Introduction", 0.1, "Introduce subjects and basis for comparison."], ["Subject A", 0.3, "Detailed treatment of first subject."], ["Subject B", 0.3, "Detailed treatment of second subject."], ["Comparison & analysis", 0.2, "Direct comparison and what it reveals."], ["Conclusion", 0.1, "What we learn."]],
  case: [["Introduction", 0.1, "Present the case."], ["Background", 0.2, "Context and history."], ["Analysis", 0.4, "Apply theory to the case."], ["Findings", 0.2, "What the analysis reveals."], ["Conclusion", 0.1, "Implications and recommendations."]],
  reflective: [["Description", 0.25, "What happened?"], ["Feelings", 0.15, "How did you feel?"], ["Evaluation", 0.2, "What was good and bad?"], ["Analysis", 0.2, "Why did it happen this way?"], ["Conclusion & action plan", 0.2, "What will you do differently?"]],
  research: [["Abstract", 0.05, "Brief summary."], ["Introduction", 0.1, "Research question."], ["Literature review", 0.2, "What others found."], ["Methodology", 0.15, "How you researched."], ["Results", 0.2, "What you found."], ["Discussion", 0.2, "What it means."], ["Conclusion", 0.1, "Final thoughts."]],
  general: [["Introduction", 0.15, "Hook and state your purpose."], ["Body", 0.7, "Develop ideas with evidence."], ["Conclusion", 0.15, "Summarise and leave an impression."]],
};

function EssayInner() {
  const { gate } = useGate();
  const [essayType, setEssayType] = useState("argumentative");
  const [wordCount, setWordCount] = useState(2000);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);

  function toggleCheck(key: string) {
    setChecks({ ...checks, [key]: !checks[key] });
  }

  function copyStructure() {
    if (!gate("essay")) return;
    const tpl = essayTemplates[essayType];
    const text = tpl.map(s => `${s[0]} (~${Math.round(wordCount * s[1])} words)\n${s[2]}\n`).join("\n");
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function printStructure() {
    if (!gate("essay")) return;
    const tpl = essayTemplates[essayType];
    const sections = tpl.map(s => `<div style="margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid #ddd;"><h3 style="margin:0 0 4px;">${s[0]}</h3><p style="margin:0 0 6px;color:#666;font-size:13px;">~${Math.round(wordCount * s[1])} words</p><p style="margin:0;">${s[2]}</p></div>`).join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Essay structure</title><style>body{font-family:Georgia,serif;max-width:640px;margin:40px auto;padding:0 20px;color:#222;}h3{font-family:-apple-system,sans-serif;}p{line-height:1.6;}</style></head><body><h1>Essay structure</h1><p style="color:#666;margin-bottom:24px;">Total: ~${wordCount} words</p>${sections}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 200);
  }

  const tpl = essayTemplates[essayType];

  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Essay structure builder</h1>
        <p className="page-sub">Plan your essay section by section.</p>
        <div className="card mb">
          <div className="grid grid-2">
            <div className="field"><label>Essay type</label>
              <select value={essayType} onChange={e => setEssayType(e.target.value)}>
                <option value="argumentative">Argumentative</option>
                <option value="litreview">Literature review</option>
                <option value="compare">Compare &amp; contrast</option>
                <option value="case">Case study</option>
                <option value="reflective">Reflective</option>
                <option value="research">Research paper</option>
                <option value="general">General</option>
              </select>
            </div>
            <div className="field"><label>Total word count</label><input type="number" value={wordCount} onChange={e => setWordCount(parseInt(e.target.value) || 2000)} min={500} max={20000} /></div>
          </div>
        </div>
        {tpl.map((s, i) => {
          const words = Math.round(wordCount * s[1]);
          const key = essayType + i;
          return (
            <div key={key} className="card mb">
              <div className="row between">
                <div><h3 style={{ marginBottom: 2 }}>{s[0]}</h3><small>~{words} words</small></div>
                <label style={{ fontSize: 13 }}><input type="checkbox" checked={!!checks[key]} onChange={() => toggleCheck(key)} style={{ accentColor: "var(--red)" }} /> Drafted</label>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>{s[2]}</p>
            </div>
          );
        })}
        <div className="mt row">
          <button className="btn btn-ghost" onClick={printStructure}>Print structure</button>
          <button className="btn btn-ghost" onClick={copyStructure}>Copy to clipboard</button>
          {copied && <span style={{ fontSize: 13, color: "var(--emerald)", fontWeight: 500 }}>Copied!</span>}
        </div>
      </div>
    </AppShell>
  );
}

export default function EssayPage() { return <Suspense><EssayInner /></Suspense>; }
