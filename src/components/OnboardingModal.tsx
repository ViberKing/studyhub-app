"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface CheckItem {
  id: string;
  icon: string;
  title: string;
  desc: string;
  href: string;
  linkLabel: string;
}

const checklist: CheckItem[] = [
  { id: "profile", icon: "👤", title: "Set up your profile", desc: "Add your name, photo, and university.", href: "/settings", linkLabel: "Settings" },
  { id: "modules", icon: "📚", title: "Add your modules", desc: "Enter the modules you're studying this semester.", href: "/modules", linkLabel: "Modules" },
  { id: "assignments", icon: "📝", title: "Add your assignments", desc: "Enter essays, exams, and coursework with due dates.", href: "/assignments", linkLabel: "Assignments" },
  { id: "grades", icon: "📊", title: "Set up grade calculator", desc: "Add module components and any marks you've received.", href: "/grades", linkLabel: "Grades" },
  { id: "calendar", icon: "📅", title: "Check your calendar", desc: "Assignments auto-populate — add extra events too.", href: "/calendar", linkLabel: "Calendar" },
  { id: "flashcards", icon: "🃏", title: "Create a flashcard deck", desc: "Pick a topic and add 10–20 cards to get started.", href: "/flashcards", linkLabel: "Flashcards" },
  { id: "notes", icon: "📒", title: "Write your first note", desc: "Jot down key points from a lecture or reading.", href: "/notes", linkLabel: "Notes" },
  { id: "timer", icon: "⏱", title: "Run a study session", desc: "Try a 25-minute Pomodoro focus session.", href: "/timer", linkLabel: "Timer" },
  { id: "citations", icon: "📎", title: "Save a citation", desc: "Generate a formatted reference in Harvard, APA, or MLA.", href: "/citations", linkLabel: "Citations" },
  { id: "essay", icon: "✍️", title: "Plan an essay", desc: "Structure an essay with the PEEA paragraph builder.", href: "/essay", linkLabel: "Essay Builder" },
  { id: "discounts", icon: "🎉", title: "Browse student discounts", desc: "Check verified deals from Spotify, Amazon, ASOS, and more.", href: "/discounts", linkLabel: "Discounts" },
];

const STORAGE_KEY = "onboarding_checked";
const DISMISSED_KEY = "onboarding_dismissed";

export default function OnboardingModal() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setChecked(JSON.parse(stored));
      // Show automatically if not dismissed before
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (!dismissed) setVisible(true);
    } catch {}
    setLoaded(true);
  }, []);

  const toggle = useCallback((id: string) => {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  }, []);

  const reopen = useCallback(() => {
    setVisible(true);
    localStorage.removeItem(DISMISSED_KEY);
  }, []);

  const completedCount = Object.values(checked).filter(Boolean).length;
  const totalCount = checklist.length;
  const pct = Math.round((completedCount / totalCount) * 100);

  if (!loaded) return null;

  // Floating button to reopen when modal is dismissed
  if (!visible) {
    return (
      <button className="ob-fab" onClick={reopen} title="Open setup checklist">
        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        <span className="ob-fab-badge">{completedCount}/{totalCount}</span>
      </button>
    );
  }

  return (
    <div className="ob-overlay" onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <div className="ob-modal">
        {/* Header */}
        <div className="ob-header">
          <div>
            <h2 className="ob-title">Welcome to Study-HQ!</h2>
            <p className="ob-subtitle">Complete these steps to get set up and ready to study.</p>
          </div>
          <button className="ob-close" onClick={dismiss} title="Close">&times;</button>
        </div>

        {/* Progress */}
        <div className="ob-progress">
          <div className="ob-progress-info">
            <span>{completedCount === totalCount ? "You're all set!" : `${completedCount} of ${totalCount} complete`}</span>
            <span className="ob-progress-pct">{pct}%</span>
          </div>
          <div className="ob-progress-track">
            <div className="ob-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Checklist */}
        <div className="ob-list">
          {checklist.map((item, i) => {
            const done = !!checked[item.id];
            return (
              <div key={item.id} className={`ob-row${done ? " done" : ""}`}>
                <button
                  className={`ob-tick${done ? " checked" : ""}`}
                  onClick={() => toggle(item.id)}
                >
                  {done ? (
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </button>
                <span className="ob-row-icon">{item.icon}</span>
                <div className="ob-row-text">
                  <span className={`ob-row-title${done ? " done" : ""}`}>{item.title}</span>
                  <span className="ob-row-desc">{item.desc}</span>
                </div>
                <Link href={item.href} className="ob-row-link" onClick={dismiss}>
                  Go &rarr;
                </Link>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {completedCount === totalCount ? (
          <div className="ob-footer-done">
            <p>Nice work — you&apos;re all set up!</p>
            <button className="btn btn-grad" onClick={dismiss} style={{ width: "100%" }}>Go to Dashboard</button>
          </div>
        ) : (
          <button className="ob-dismiss" onClick={dismiss}>I&apos;ll do this later</button>
        )}
      </div>
    </div>
  );
}
