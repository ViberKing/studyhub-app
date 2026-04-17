"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import PageGuide from "@/components/PageGuide";
import { useGate } from "@/components/GateModal";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  context: string;
  createdAt: number;
}

const STORAGE_KEY = "ai_tutor_conversations";

const SUGGESTED_PROMPTS = [
  { label: "Explain a concept", text: "Can you explain [concept] to me like I'm learning it for the first time?" },
  { label: "Quiz me", text: "Quiz me on [topic]. Ask me 5 questions one at a time and give feedback on each answer." },
  { label: "Exam prep", text: "Help me prepare for my [module] exam. What are the key topics I should focus on?" },
  { label: "Break down a question", text: "Help me understand what this essay question is really asking: [paste question]" },
  { label: "Review my work", text: "I've written this paragraph. Can you give me feedback on how to improve it? [paste paragraph]" },
  { label: "Study plan", text: "I have an exam in [X] weeks on [module]. Help me build a revision plan." },
];

function AITutorInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const { gate } = useGate();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showContextEditor, setShowContextEditor] = useState(false);
  const [contextDraft, setContextDraft] = useState("");
  const [loaded, setLoaded] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Conversation[];
        setConversations(parsed);
        if (parsed.length > 0) setActiveId(parsed[0].id);
      }
    } catch {}
    setLoaded(true);
  }, []);

  // Persist conversations
  useEffect(() => {
    if (loaded) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); } catch {}
    }
  }, [conversations, loaded]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, conversations]);

  const activeConv = conversations.find(c => c.id === activeId) || null;

  const createConversation = useCallback((initialTitle = "New conversation") => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: initialTitle,
      messages: [],
      context: "",
      createdAt: Date.now(),
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveId(newConv.id);
    return newConv;
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const next = prev.filter(c => c.id !== id);
      if (activeId === id) setActiveId(next[0]?.id || null);
      return next;
    });
  }, [activeId]);

  const renameConversation = useCallback((id: string, title: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
  }, []);

  const updateContext = useCallback((id: string, context: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, context } : c));
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;

    // Gate AI usage (Plus+ feature, same as research)
    if (!gate("research")) return;

    setError(null);
    setSending(true);

    // Create conversation if none active
    let conv = activeConv;
    if (!conv) {
      conv = {
        id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: text.slice(0, 40) + (text.length > 40 ? "..." : ""),
        messages: [],
        context: "",
        createdAt: Date.now(),
      };
      setConversations(prev => [conv!, ...prev]);
      setActiveId(conv.id);
    }

    const newUserMsg: Message = { role: "user", content: text };
    const updatedMessages = [...conv.messages, newUserMsg];

    // Update title if it's the first message
    const newTitle = conv.messages.length === 0
      ? text.slice(0, 40) + (text.length > 40 ? "..." : "")
      : conv.title;

    // Optimistic update
    setConversations(prev => prev.map(c =>
      c.id === conv!.id ? { ...c, messages: updatedMessages, title: newTitle } : c
    ));
    setInput("");

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          context: conv.context || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get response");

      const assistantMsg: Message = { role: "assistant", content: data.reply };
      setConversations(prev => prev.map(c =>
        c.id === conv!.id ? { ...c, messages: [...updatedMessages, assistantMsg] } : c
      ));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      // Remove the optimistic user message on error
      setConversations(prev => prev.map(c =>
        c.id === conv!.id ? { ...c, messages: conv!.messages } : c
      ));
    } finally {
      setSending(false);
    }
  }, [activeConv, sending, gate]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  }, [input, sendMessage]);

  const handleSuggestedPrompt = useCallback((text: string) => {
    setInput(text);
  }, []);

  const openContextEditor = useCallback(() => {
    setContextDraft(activeConv?.context || "");
    setShowContextEditor(true);
  }, [activeConv]);

  const saveContext = useCallback(() => {
    if (activeConv) updateContext(activeConv.id, contextDraft);
    setShowContextEditor(false);
  }, [activeConv, contextDraft, updateContext]);

  if (!loaded) return null;

  return (
    <AppShell>
      <div className="page active" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
          <div>
            <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              AI Tutor
              <span className="ai-tutor-badge">
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l2.39 4.84L20 8l-3.88 3.78L17.24 18 12 15.27 6.76 18l1.12-6.22L4 8l5.61-1.16L12 2z"/>
                </svg>
                Powered by Claude
              </span>
            </h1>
            <p className="page-sub">Your personal university-level tutor. Ask anything — get clear explanations, quizzes, and feedback.</p>
          </div>
        </div>

        <PageGuide
          id="ai-tutor"
          title="How to use the AI Tutor"
          steps={[
            "Ask any question about your coursework — the tutor explains concepts, quizzes you, reviews your work, and helps with exam prep.",
            "Add context (paste your lecture notes or topic list) so answers are tailored to your module.",
            "Start new conversations per topic/module — each one remembers your chat history.",
            "It won't do your work for you — it helps you understand the material so you can do it yourself.",
          ]}
        />

        {/* Chat container */}
        <div className="ai-tutor-container">
          {/* Sidebar: conversation list */}
          <div className="ai-tutor-sidebar">
            <button
              className="btn btn-grad"
              onClick={() => createConversation()}
              style={{ width: "100%", marginBottom: 12, fontSize: 13 }}
            >
              + New chat
            </button>
            {conversations.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-subtle)", textAlign: "center", padding: 16 }}>
                No conversations yet
              </div>
            ) : (
              <div className="ai-tutor-conv-list">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    className={`ai-tutor-conv-item${conv.id === activeId ? " active" : ""}`}
                    onClick={() => setActiveId(conv.id)}
                  >
                    <span className="ai-tutor-conv-title">{conv.title}</span>
                    <button
                      className="ai-tutor-conv-del"
                      onClick={(e) => { e.stopPropagation(); if (confirm("Delete this conversation?")) deleteConversation(conv.id); }}
                      title="Delete"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Main: chat area */}
          <div className="ai-tutor-main">
            {!activeConv || activeConv.messages.length === 0 ? (
              <div className="ai-tutor-welcome">
                <div className="ai-tutor-welcome-icon">
                  <svg width="48" height="48" fill="none" stroke="url(#tgrad)" strokeWidth="1.8" viewBox="0 0 24 24">
                    <defs>
                      <linearGradient id="tgrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#E11D48"/>
                        <stop offset="100%" stopColor="#FB7185"/>
                      </linearGradient>
                    </defs>
                    <path d="M12 2l2.39 4.84L20 8l-3.88 3.78L17.24 18 12 15.27 6.76 18l1.12-6.22L4 8l5.61-1.16L12 2z"/>
                  </svg>
                </div>
                <h2>Hi! I&apos;m your AI Tutor.</h2>
                <p>I can explain concepts, quiz you, review your work, and help you prep for exams. What do you want to study today?</p>
                <div className="ai-tutor-prompts">
                  {SUGGESTED_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      className="ai-tutor-prompt-pill"
                      onClick={() => handleSuggestedPrompt(p.text)}
                    >
                      <span className="ai-tutor-prompt-label">{p.label}</span>
                      <span className="ai-tutor-prompt-text">{p.text.replace(/\[.*?\]/g, "...")}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Context button + title */}
                <div className="ai-tutor-chat-header">
                  <input
                    className="ai-tutor-title-input"
                    value={activeConv.title}
                    onChange={(e) => renameConversation(activeConv.id, e.target.value)}
                    placeholder="Conversation title"
                  />
                  <button className="btn btn-ghost" onClick={openContextEditor} style={{ fontSize: 12 }}>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ marginRight: 4, verticalAlign: "middle" }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    {activeConv.context ? "Edit context" : "Add context"}
                  </button>
                </div>

                <div className="ai-tutor-messages">
                  {activeConv.messages.map((m, i) => (
                    <div key={i} className={`ai-tutor-msg ${m.role}`}>
                      <div className="ai-tutor-msg-avatar">
                        {m.role === "user" ? "You" : "AI"}
                      </div>
                      <div className="ai-tutor-msg-body">
                        {m.content.split("\n").map((line, li) => (
                          <p key={li} style={{ margin: li > 0 ? "8px 0 0" : 0 }}>{line || "\u00A0"}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="ai-tutor-msg assistant">
                      <div className="ai-tutor-msg-avatar">AI</div>
                      <div className="ai-tutor-msg-body">
                        <div className="ai-tutor-typing">
                          <span></span><span></span><span></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </>
            )}

            {error && (
              <div className="ai-tutor-error">
                {error}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="ai-tutor-input-wrap">
              <textarea
                className="ai-tutor-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isDemo ? "AI Tutor is disabled in demo — sign up to use" : "Ask your tutor anything..."}
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                disabled={sending}
              />
              <button
                type="submit"
                className="btn btn-grad"
                disabled={!input.trim() || sending}
                style={{ alignSelf: "flex-end" }}
              >
                {sending ? "Thinking..." : "Send"}
              </button>
            </form>
          </div>
        </div>

        {/* Context editor modal */}
        {showContextEditor && (
          <div className="modal-bg open" onClick={() => setShowContextEditor(false)}>
            <div className="modal" style={{ maxWidth: 600, width: "100%" }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ marginBottom: 8 }}>Add study context</h3>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>
                Paste your lecture notes, topic list, or any material you want the tutor to reference. It will use this as background when answering your questions.
              </p>
              <textarea
                value={contextDraft}
                onChange={(e) => setContextDraft(e.target.value)}
                placeholder="e.g. Week 1 lecture: Introduction to microeconomics — supply and demand, elasticity, market equilibrium..."
                style={{
                  width: "100%",
                  minHeight: 220,
                  padding: 12,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: 13,
                  fontFamily: "inherit",
                  resize: "vertical",
                  background: "var(--bg)",
                  color: "var(--text)",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{contextDraft.length} characters</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-ghost" onClick={() => setShowContextEditor(false)}>Cancel</button>
                  <button className="btn btn-grad" onClick={saveContext}>Save context</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AITutorPage() {
  return <Suspense><AITutorInner /></Suspense>;
}
