"use client";

import { Suspense, useState } from "react";
import { useGate } from "@/components/GateModal";
import AppShell from "@/components/AppShell";

/* ── PEEA guidance per section ── */
interface ParagraphGuide {
  label: string;
  point: string;
  evidence: string;
  explain: string;
  analysis: string;
}

interface SectionDef {
  name: string;
  weight: number;
  overview: string;
  type: "intro" | "body" | "counter" | "conclusion" | "other";
  paragraphs?: ParagraphGuide[];
  tips?: string[];
}

const essayTemplates: Record<string, { label: string; sections: SectionDef[] }> = {
  argumentative: {
    label: "Argumentative",
    sections: [
      {
        name: "Introduction", weight: 0.10, type: "intro",
        overview: "Hook the reader, provide context, and state your thesis clearly.",
        tips: [
          "Open with a strong hook — a surprising fact, bold claim, or relevant quote",
          "Give 2-3 sentences of context so the reader understands the debate",
          "End with a clear thesis statement — this is your argument in one sentence",
          "Briefly outline the structure of your essay (signposting)",
        ],
      },
      {
        name: "Body paragraphs", weight: 0.60, type: "body",
        overview: "Develop 3-4 main arguments using the PEEA structure. Each paragraph should make ONE clear point supported by evidence.",
        paragraphs: [
          {
            label: "Paragraph 1 — Strongest argument",
            point: "Start with your most compelling argument. State the point clearly in your opening sentence (topic sentence).",
            evidence: "Support with specific evidence: quotes, statistics, examples, or references to scholarly sources. Always cite properly.",
            explain: "Explain HOW the evidence supports your point. Don't assume it's obvious — spell out the connection.",
            analysis: "Analyse the significance. Why does this matter? How does it support your thesis? Link back to the essay question.",
          },
          {
            label: "Paragraph 2 — Supporting argument",
            point: "Introduce your second argument. It should build on or complement the first, not repeat it.",
            evidence: "Use different types of evidence from paragraph 1 if possible (e.g. if you used a quote before, try a statistic here).",
            explain: "Explain the link between evidence and point. Use phrases like 'This demonstrates that...' or 'This suggests...'",
            analysis: "Show how this argument strengthens your overall thesis. Consider connecting it to your first point.",
          },
          {
            label: "Paragraph 3 — Further development",
            point: "A third distinct argument, or a deeper exploration of a key aspect of your thesis.",
            evidence: "Draw from a different source or perspective. Show breadth of reading.",
            explain: "Make the reasoning explicit. Your marker shouldn't have to guess why this evidence matters.",
            analysis: "Consider the wider implications. How does this connect to broader themes in the field?",
          },
          {
            label: "Paragraph 4 (optional) — Nuance or case study",
            point: "Add a specific case study, real-world example, or nuanced sub-argument that deepens your analysis.",
            evidence: "Concrete, specific evidence works best here — a particular event, study, or data point.",
            explain: "Show how this specific example illustrates the broader argument you've been building.",
            analysis: "Use this to demonstrate sophisticated thinking — acknowledge complexity while maintaining your argument.",
          },
        ],
      },
      {
        name: "Counter-arguments", weight: 0.15, type: "counter",
        overview: "Acknowledge opposing views and explain why your argument is still stronger.",
        tips: [
          "Present the strongest counter-argument fairly — don't use a straw man",
          "Use phrases like 'Critics may argue that...' or 'An alternative view suggests...'",
          "Refute it with evidence or logical reasoning",
          "Show why your position is more convincing despite the objection",
          "This section shows intellectual maturity — markers love it",
        ],
      },
      {
        name: "Conclusion", weight: 0.15, type: "conclusion",
        overview: "Restate your thesis, summarise key arguments, and leave the reader with a strong final impression.",
        tips: [
          "Restate your thesis in different words — don't just copy/paste from the intro",
          "Briefly recap your 3-4 main arguments (one sentence each)",
          "Do NOT introduce new evidence or arguments here",
          "End with a broader implication, a call to action, or an open question",
          "The last sentence should be memorable — it's what the marker reads last",
        ],
      },
    ],
  },

  litreview: {
    label: "Literature review",
    sections: [
      {
        name: "Introduction", weight: 0.10, type: "intro",
        overview: "Introduce the topic, explain scope, and state your review's purpose.",
        tips: [
          "Define the topic and explain why it's important",
          "State the scope — what time period, which debates, what disciplines?",
          "Explain how the review is organised (thematically, chronologically, methodologically)",
        ],
      },
      {
        name: "Thematic sections", weight: 0.65, type: "body",
        overview: "Group sources by theme (not one-by-one). Each section should synthesise multiple sources around a central idea.",
        paragraphs: [
          {
            label: "Theme 1 — Major strand of literature",
            point: "Identify the first key theme or debate in the literature. What do most scholars agree on?",
            evidence: "Reference 3-5 key sources. Use phrases like 'Smith (2019) argues...' and 'This is supported by Jones (2020)...'",
            explain: "Explain how these sources relate to each other. Do they agree? Build on each other?",
            analysis: "Evaluate the strength of this body of work. Are there methodological issues? What's convincing?",
          },
          {
            label: "Theme 2 — Contrasting perspectives",
            point: "Introduce a different perspective or debate within the literature.",
            evidence: "Cite sources that challenge or complement Theme 1. Show you've read widely.",
            explain: "Explain where and why scholars disagree. What are the key points of contention?",
            analysis: "Assess which side has stronger evidence. Identify what's missing from both perspectives.",
          },
          {
            label: "Theme 3 — Emerging trends or recent developments",
            point: "What's new in the field? Identify recent shifts in thinking or methodology.",
            evidence: "Prioritise recent publications (last 5 years) and show how the field is evolving.",
            explain: "Connect new developments to the established literature from Themes 1 and 2.",
            analysis: "Identify gaps — what hasn't been studied yet? This sets up your own research contribution.",
          },
        ],
      },
      {
        name: "Gaps & future directions", weight: 0.15, type: "other",
        overview: "Identify what's missing from the literature and what needs further study.",
        tips: [
          "Be specific about gaps — 'No study has examined X in the context of Y'",
          "Suggest methodological improvements",
          "If this is for a dissertation, explain how YOUR research fills a gap",
        ],
      },
      {
        name: "Conclusion", weight: 0.10, type: "conclusion",
        overview: "Summarise the state of the literature and its implications.",
        tips: [
          "Recap the main themes and key findings",
          "Restate the most significant gaps",
          "End with the significance of the topic going forward",
        ],
      },
    ],
  },

  compare: {
    label: "Compare & contrast",
    sections: [
      {
        name: "Introduction", weight: 0.10, type: "intro",
        overview: "Introduce both subjects and explain the basis for comparison.",
        tips: [
          "Clearly identify what you're comparing and why",
          "State your thesis — is one better? Are they complementary? What does comparison reveal?",
          "Signpost whether you'll use block structure (A then B) or point-by-point",
        ],
      },
      {
        name: "Comparative analysis", weight: 0.70, type: "body",
        overview: "Compare subjects across 3-4 key dimensions. Don't just describe — always analyse what the comparison reveals.",
        paragraphs: [
          {
            label: "Dimension 1 — Most important similarity or difference",
            point: "Identify the most significant point of comparison between the two subjects.",
            evidence: "Provide specific evidence from BOTH subjects. Use direct comparisons.",
            explain: "Explain what this similarity/difference tells us. Why does it matter?",
            analysis: "Analyse the deeper significance. What does this reveal about the broader topic?",
          },
          {
            label: "Dimension 2 — Second key comparison",
            point: "Move to the next most important dimension of comparison.",
            evidence: "Again, evidence from both sides. Use parallel structure for clarity.",
            explain: "Make the comparison explicit — don't leave the reader to figure it out.",
            analysis: "Build on Dimension 1. How do these comparisons together support your thesis?",
          },
          {
            label: "Dimension 3 — Deeper or more nuanced comparison",
            point: "A more subtle or complex point of comparison that shows sophisticated thinking.",
            evidence: "This is where more detailed or specific evidence strengthens your argument.",
            explain: "Connect all three dimensions together.",
            analysis: "What does the overall comparison reveal? This should strongly support your thesis.",
          },
        ],
      },
      {
        name: "Conclusion", weight: 0.20, type: "conclusion",
        overview: "What does the comparison reveal overall? Restate thesis and broader implications.",
        tips: [
          "Don't just summarise — state what we LEARN from the comparison",
          "Restate your thesis in light of the evidence presented",
          "Consider broader implications or applications",
        ],
      },
    ],
  },

  general: {
    label: "General essay",
    sections: [
      {
        name: "Introduction", weight: 0.15, type: "intro",
        overview: "Engage the reader, provide context, and state your main argument or purpose.",
        tips: [
          "Open with something engaging — a question, quote, or bold statement",
          "Provide enough context for the reader to understand your topic",
          "End the introduction with a clear thesis or purpose statement",
          "Briefly outline what the essay will cover",
        ],
      },
      {
        name: "Body paragraphs", weight: 0.70, type: "body",
        overview: "Develop your argument across 3-4 paragraphs. Each should make one clear point using PEEA structure.",
        paragraphs: [
          {
            label: "Paragraph 1 — Main point",
            point: "State your first and strongest point clearly. Your opening sentence should tell the reader exactly what this paragraph argues.",
            evidence: "Support with a specific quote, statistic, example, or reference. Always cite your sources.",
            explain: "Explain how the evidence supports your point. Don't assume the connection is obvious.",
            analysis: "Analyse the significance — why does this matter? How does it answer the essay question?",
          },
          {
            label: "Paragraph 2 — Development",
            point: "Build on your first point with a second, complementary argument.",
            evidence: "Use a different type of evidence to show range (e.g. a case study, contrasting source).",
            explain: "Clearly connect evidence to argument. Use linking phrases.",
            analysis: "Show how this deepens or extends your argument. Connect to paragraph 1.",
          },
          {
            label: "Paragraph 3 — Further exploration",
            point: "A third angle, deeper dive, or alternative perspective that enriches your argument.",
            evidence: "Draw from a different source or discipline to show breadth.",
            explain: "Make the reasoning chain explicit and logical.",
            analysis: "Consider counter-arguments briefly. Show you've thought critically about the topic.",
          },
        ],
      },
      {
        name: "Conclusion", weight: 0.15, type: "conclusion",
        overview: "Summarise your key arguments and leave a lasting impression.",
        tips: [
          "Restate your thesis in new words",
          "Summarise each body paragraph in one sentence",
          "Don't introduce new evidence",
          "End with a thought-provoking final sentence",
        ],
      },
    ],
  },

  reflective: {
    label: "Reflective",
    sections: [
      {
        name: "Description", weight: 0.20, type: "other",
        overview: "Describe the experience objectively. What happened?",
        tips: ["Set the scene — when, where, who was involved", "Be specific but concise", "Stick to facts, save feelings for the next section"],
      },
      {
        name: "Reflection & analysis", weight: 0.55, type: "body",
        overview: "Reflect on your feelings, evaluate what happened, and analyse why using PEEA structure.",
        paragraphs: [
          {
            label: "Feelings & reactions",
            point: "How did you feel during and after the experience?",
            evidence: "Describe specific moments that triggered these feelings.",
            explain: "Why did you react this way? Connect to your values or expectations.",
            analysis: "What do these reactions reveal about your assumptions or development?",
          },
          {
            label: "Evaluation — What went well",
            point: "Identify what was positive about the experience.",
            evidence: "Give specific examples of what worked.",
            explain: "Why did these aspects go well?",
            analysis: "Link to relevant theory (e.g. Gibbs, Kolb) if your course requires it.",
          },
          {
            label: "Evaluation — What could improve",
            point: "Honestly assess what didn't go well or could be better.",
            evidence: "Specific moments or outcomes that fell short.",
            explain: "Why did these aspects not work? What factors were at play?",
            analysis: "What does this teach you? How does theory help explain it?",
          },
        ],
      },
      {
        name: "Action plan", weight: 0.25, type: "conclusion",
        overview: "What will you do differently next time? Be specific and actionable.",
        tips: [
          "Set 2-3 specific, measurable goals",
          "Explain HOW you'll achieve each one",
          "Reference what you learned from the analysis section",
          "Show growth mindset — frame challenges as learning opportunities",
        ],
      },
    ],
  },

  case: {
    label: "Case study",
    sections: [
      {
        name: "Introduction", weight: 0.10, type: "intro",
        overview: "Present the case, explain why it's worth studying, and state your research question.",
        tips: ["Clearly identify the case (who, what, where, when)", "Explain its significance", "State what you aim to discover or argue"],
      },
      {
        name: "Background & context", weight: 0.15, type: "other",
        overview: "Provide essential context the reader needs to understand the case.",
        tips: ["Historical background", "Key actors and stakeholders", "Relevant policies, events, or conditions", "Keep it focused — only include context that's directly relevant"],
      },
      {
        name: "Analysis", weight: 0.50, type: "body",
        overview: "Apply theory to the case across 3-4 analytical paragraphs using PEEA structure.",
        paragraphs: [
          {
            label: "Analytical lens 1 — Primary theory/framework",
            point: "Apply your main theoretical framework to the case. What does it reveal?",
            evidence: "Specific details from the case that illustrate the theory in action.",
            explain: "Show HOW the theory applies — don't just describe, analyse.",
            analysis: "Does the case support or challenge the theory? What are the implications?",
          },
          {
            label: "Analytical lens 2 — Secondary perspective",
            point: "Apply a second theory or look at a different aspect of the case.",
            evidence: "Different case details that this lens highlights.",
            explain: "How does this perspective add to or challenge the first analysis?",
            analysis: "What new understanding does this give us? Build a layered analysis.",
          },
          {
            label: "Analytical lens 3 — Synthesis",
            point: "Bring the analyses together. What does the combined picture tell us?",
            evidence: "Key evidence from the case that ties everything together.",
            explain: "Show how multiple theoretical perspectives create a richer understanding.",
            analysis: "What are the broader lessons? How does this case inform the wider field?",
          },
        ],
      },
      {
        name: "Findings & conclusion", weight: 0.25, type: "conclusion",
        overview: "Summarise what the analysis reveals and discuss implications.",
        tips: [
          "State your key findings clearly",
          "Answer your research question from the introduction",
          "Discuss practical implications or recommendations",
          "Acknowledge limitations of your analysis",
          "Suggest areas for further research",
        ],
      },
    ],
  },

  research: {
    label: "Research paper",
    sections: [
      {
        name: "Abstract", weight: 0.05, type: "other",
        overview: "A 150-250 word summary of the entire paper.",
        tips: ["One sentence each: background, aim, method, key finding, conclusion", "Write this LAST even though it appears first"],
      },
      {
        name: "Introduction", weight: 0.10, type: "intro",
        overview: "Introduce the topic, identify the gap, and state your research question.",
        tips: ["Broad context → narrow focus → your specific question", "Explain why this research matters", "State your hypothesis if applicable"],
      },
      {
        name: "Literature review", weight: 0.20, type: "body",
        overview: "Review existing research organised by theme, building to the gap your study addresses.",
        paragraphs: [
          {
            label: "Theme 1 — Established knowledge",
            point: "What is well-established in the field?",
            evidence: "Key studies and their findings. Cite 3-5 sources per theme.",
            explain: "How do these studies relate to each other and your topic?",
            analysis: "What consensus exists? What methods have been used?",
          },
          {
            label: "Theme 2 — Debates and gaps",
            point: "Where do scholars disagree? What hasn't been studied?",
            evidence: "Contrasting findings, methodological debates, missing perspectives.",
            explain: "Why do these gaps matter?",
            analysis: "How does YOUR study address these gaps? This justifies your research.",
          },
        ],
      },
      {
        name: "Methodology", weight: 0.15, type: "other",
        overview: "Explain how you conducted your research.",
        tips: ["Research design (qualitative, quantitative, mixed)", "Data collection methods", "Sample and sampling strategy", "Analysis approach", "Ethical considerations"],
      },
      {
        name: "Results & discussion", weight: 0.35, type: "body",
        overview: "Present findings and discuss their significance.",
        paragraphs: [
          {
            label: "Key finding 1",
            point: "State your most important finding clearly.",
            evidence: "Present the data — statistics, quotes, observations.",
            explain: "What does this finding mean in the context of your research question?",
            analysis: "How does it relate to existing literature? Does it support or challenge previous studies?",
          },
          {
            label: "Key finding 2",
            point: "Your second significant finding.",
            evidence: "Supporting data and evidence.",
            explain: "Interpretation and meaning.",
            analysis: "Implications and connections to the broader field.",
          },
        ],
      },
      {
        name: "Conclusion", weight: 0.15, type: "conclusion",
        overview: "Summarise findings, acknowledge limitations, suggest future research.",
        tips: ["Answer your research question directly", "State 2-3 key contributions", "Be honest about limitations", "Suggest 2-3 directions for future research"],
      },
    ],
  },
};

/* ── PEEA colours ── */
const peeaColors = {
  point: { bg: "#EEF2FF", border: "#C7D2FE", color: "#4338CA", label: "Point" },
  evidence: { bg: "#ECFDF5", border: "#A7F3D0", color: "#047857", label: "Evidence" },
  explain: { bg: "#FFF7ED", border: "#FED7AA", color: "#C2410C", label: "Explain" },
  analysis: { bg: "#FDF2F8", border: "#FBCFE8", color: "#BE185D", label: "Analysis" },
};

function EssayInner() {
  const { gate } = useGate();
  const [essayType, setEssayType] = useState("argumentative");
  const [wordCount, setWordCount] = useState(2000);
  const [essayQuestion, setEssayQuestion] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiPlan, setAiPlan] = useState("");

  const template = essayTemplates[essayType];

  function toggleCheck(key: string) {
    setChecks({ ...checks, [key]: !checks[key] });
  }

  function toggleSection(key: string) {
    setExpandedSections({ ...expandedSections, [key]: !expandedSections[key] });
  }

  function copyStructure() {
    if (!gate("essay")) return;
    let text = `ESSAY STRUCTURE: ${template.label}\nWord count: ~${wordCount}\n`;
    if (essayQuestion) text += `Question: ${essayQuestion}\n`;
    text += "\n";

    template.sections.forEach(s => {
      const words = Math.round(wordCount * s.weight);
      text += `${"=".repeat(50)}\n${s.name.toUpperCase()} (~${words} words)\n${"=".repeat(50)}\n${s.overview}\n\n`;
      if (s.paragraphs) {
        s.paragraphs.forEach(p => {
          text += `--- ${p.label} ---\n`;
          text += `POINT: ${p.point}\nEVIDENCE: ${p.evidence}\nEXPLAIN: ${p.explain}\nANALYSIS: ${p.analysis}\n\n`;
        });
      }
      if (s.tips) {
        text += s.tips.map(t => `  - ${t}`).join("\n") + "\n\n";
      }
    });

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function generateAIPlan() {
    if (!gate("essay")) return;
    if (!essayQuestion.trim()) return;
    setGenerating(true);
    setAiPlan("");

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "essay_plan",
          title: essayQuestion,
          author: "",
          brief: `Essay type: ${template.label}. Word count: ${wordCount}. Question: ${essayQuestion}`,
        }),
      });
      const data = await res.json();
      if (data.result) setAiPlan(data.result);
      else setAiPlan("Could not generate plan. Try again.");
    } catch {
      setAiPlan("Something went wrong. Please try again.");
    }
    setGenerating(false);
  }

  const checkedCount = Object.values(checks).filter(Boolean).length;
  const totalSections = template.sections.reduce((sum, s) => sum + (s.paragraphs ? s.paragraphs.length : 1), 0);
  const progress = totalSections > 0 ? Math.round((checkedCount / totalSections) * 100) : 0;

  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Essay structure builder</h1>
        <p className="page-sub">Plan your essay section by section with PEEA paragraph guidance.</p>

        {/* Setup */}
        <div className="card mb">
          <div className="grid grid-2">
            <div className="field"><label>Essay type</label>
              <select value={essayType} onChange={e => { setEssayType(e.target.value); setChecks({}); setExpandedSections({}); setAiPlan(""); }}>
                {Object.entries(essayTemplates).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="field"><label>Total word count</label><input type="number" value={wordCount} onChange={e => setWordCount(parseInt(e.target.value) || 2000)} min={500} max={20000} /></div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Essay question <span style={{ color: "var(--text-subtle)", fontWeight: 400 }}>(optional — for AI plan generation)</span></label>
            <textarea
              value={essayQuestion}
              onChange={e => setEssayQuestion(e.target.value)}
              placeholder="Paste your essay question here for a tailored AI plan..."
              rows={2}
            />
          </div>
          {essayQuestion.trim() && (
            <button
              className="btn btn-grad mt"
              onClick={generateAIPlan}
              disabled={generating}
              style={{ marginTop: 12 }}
            >
              {generating ? "Generating plan..." : "Generate AI essay plan"}
            </button>
          )}
        </div>

        {/* AI Plan */}
        {aiPlan && (
          <div className="card mb" style={{ background: "linear-gradient(135deg, #FFF1F2, #FEF2F2)", border: "1px solid var(--rose-200)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>&#x2728;</span>
              <h3 style={{ margin: 0 }}>AI essay plan</h3>
            </div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.7, color: "var(--text)" }}>{aiPlan}</div>
          </div>
        )}

        {/* Progress bar */}
        <div className="essay-progress-bar">
          <div className="essay-progress-header">
            <span>Drafting progress</span>
            <span className="essay-progress-pct">{progress}%</span>
          </div>
          <div className="essay-progress-track">
            <div className="essay-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* PEEA Legend */}
        <div className="peea-legend">
          {Object.entries(peeaColors).map(([key, val]) => (
            <div key={key} className="peea-legend-item" style={{ background: val.bg, borderColor: val.border }}>
              <span style={{ color: val.color, fontWeight: 700, fontSize: 12 }}>{val.label}</span>
            </div>
          ))}
          <span style={{ fontSize: 12, color: "var(--text-subtle)", marginLeft: 4 }}>= PEEA paragraph structure</span>
        </div>

        {/* Sections */}
        {template.sections.map((section, si) => {
          const words = Math.round(wordCount * section.weight);
          const sectionKey = `${essayType}-${si}`;
          const isExpanded = expandedSections[sectionKey] !== false; // default expanded

          return (
            <div key={sectionKey} className="essay-section-card">
              {/* Section header */}
              <div
                className="essay-section-header"
                onClick={() => toggleSection(sectionKey)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === "Enter") toggleSection(sectionKey); }}
              >
                <div className="essay-section-header-left">
                  <span className={`essay-section-type essay-section-type-${section.type}`}>
                    {section.type === "intro" ? "INTRO" : section.type === "body" ? "BODY" : section.type === "counter" ? "COUNTER" : section.type === "conclusion" ? "CONCLUSION" : "SECTION"}
                  </span>
                  <h3>{section.name}</h3>
                  <span className="essay-section-words">~{words} words</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "transform .2s", transform: isExpanded ? "rotate(180deg)" : "none", flexShrink: 0, opacity: 0.4 }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              {isExpanded && (
                <div className="essay-section-content">
                  <p className="essay-section-overview">{section.overview}</p>

                  {/* Tips (for non-body sections) */}
                  {section.tips && (
                    <div className="essay-tips">
                      {section.tips.map((tip, ti) => (
                        <div key={ti} className="essay-tip">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--emerald)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          <span>{tip}</span>
                        </div>
                      ))}
                      {!section.paragraphs && (
                        <label className="essay-drafted-check">
                          <input type="checkbox" checked={!!checks[sectionKey]} onChange={() => toggleCheck(sectionKey)} />
                          <span>Mark as drafted</span>
                        </label>
                      )}
                    </div>
                  )}

                  {/* PEEA Paragraphs */}
                  {section.paragraphs && (
                    <div className="essay-paragraphs">
                      {section.paragraphs.map((para, pi) => {
                        const paraKey = `${sectionKey}-p${pi}`;
                        return (
                          <div key={paraKey} className="essay-paragraph-card">
                            <div className="essay-paragraph-header">
                              <h4>{para.label}</h4>
                              <label className="essay-drafted-check">
                                <input type="checkbox" checked={!!checks[paraKey]} onChange={() => toggleCheck(paraKey)} />
                                <span>Drafted</span>
                              </label>
                            </div>
                            <div className="peea-grid">
                              {(["point", "evidence", "explain", "analysis"] as const).map(key => {
                                const c = peeaColors[key];
                                return (
                                  <div key={key} className="peea-card" style={{ background: c.bg, borderColor: c.border }}>
                                    <div className="peea-card-label" style={{ color: c.color }}>{c.label}</div>
                                    <p>{para[key]}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Actions */}
        <div className="mt row" style={{ gap: 10 }}>
          <button className="btn btn-grad" onClick={copyStructure}>
            {copied ? "Copied!" : "Copy full structure"}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

export default function EssayPage() { return <Suspense><EssayInner /></Suspense>; }
