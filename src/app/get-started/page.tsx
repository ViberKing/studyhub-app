"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
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
  {
    id: "profile",
    icon: "👤",
    title: "Set up your profile",
    desc: "Add your name, profile picture, and choose your university so everything is personalised to you.",
    href: "/settings",
    linkLabel: "Go to Settings",
  },
  {
    id: "modules",
    icon: "📚",
    title: "Add your modules",
    desc: "Enter the modules you're studying this semester — they'll appear across assignments, grades, and notes.",
    href: "/modules",
    linkLabel: "Go to Modules",
  },
  {
    id: "assignments",
    icon: "📝",
    title: "Add your assignments",
    desc: "Enter all upcoming essays, exams, and coursework with due dates and weightings so you never miss a deadline.",
    href: "/assignments",
    linkLabel: "Go to Assignments",
  },
  {
    id: "grades",
    icon: "📊",
    title: "Set up the grade calculator",
    desc: "Add your module components and any marks you've already received to see your predicted classification.",
    href: "/grades",
    linkLabel: "Go to Grades",
  },
  {
    id: "calendar",
    icon: "📅",
    title: "Check your calendar",
    desc: "Your assignments auto-populate here. Add any extra events like society meetups or personal reminders.",
    href: "/calendar",
    linkLabel: "Go to Calendar",
  },
  {
    id: "flashcards",
    icon: "🃏",
    title: "Create your first flashcard deck",
    desc: "Pick a topic you're revising and add 10–20 cards. Then try Learn mode for spaced repetition.",
    href: "/flashcards",
    linkLabel: "Go to Flashcards",
  },
  {
    id: "notes",
    icon: "📒",
    title: "Write your first note",
    desc: "Jot down key points from a recent lecture or reading — you can tag it by module to stay organised.",
    href: "/notes",
    linkLabel: "Go to Notes",
  },
  {
    id: "timer",
    icon: "⏱",
    title: "Run a study session",
    desc: "Try a 25-minute Pomodoro focus session. Completed sessions feed into your dashboard stats and streaks.",
    href: "/timer",
    linkLabel: "Go to Timer",
  },
  {
    id: "citations",
    icon: "📎",
    title: "Save a citation",
    desc: "Add a source you're using for an essay — pick Harvard, APA, or MLA and generate a formatted reference.",
    href: "/citations",
    linkLabel: "Go to Citations",
  },
  {
    id: "essay",
    icon: "✍️",
    title: "Plan an essay",
    desc: "Start structuring an upcoming essay using the PEEA paragraph builder — Point, Evidence, Explanation, Analysis.",
    href: "/essay",
    linkLabel: "Go to Essay Builder",
  },
  {
    id: "discounts",
    icon: "🎉",
    title: "Browse student discounts",
    desc: "Check out verified deals from Spotify, Amazon, ASOS, and more. Sign up to UniDays and Student Beans too.",
    href: "/discounts",
    linkLabel: "Go to Discounts",
  },
];

function GetStartedInner() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  // Load checked state from localStorage (or Supabase profile in future)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("onboarding_checked");
      if (stored) setChecked(JSON.parse(stored));
    } catch {}
    setLoaded(true);
  }, []);

  const toggle = useCallback((id: string) => {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("onboarding_checked", JSON.stringify(next));
      return next;
    });
  }, []);

  const completedCount = Object.values(checked).filter(Boolean).length;
  const totalCount = checklist.length;
  const pct = Math.round((completedCount / totalCount) * 100);

  if (!loaded) return null;

  return (
    <AppShell>
      <div className="page active">
        {/* Hero */}
        <div className="hero">
          <div className="hero-content">
            <h1>Get started</h1>
            <p>Complete these steps to get the most out of Study-HQ from day one.</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="gs-progress-wrap">
          <div className="gs-progress-header">
            <span className="gs-progress-label">
              {completedCount === totalCount
                ? "You're all set!"
                : `${completedCount} of ${totalCount} complete`}
            </span>
            <span className="gs-progress-pct">{pct}%</span>
          </div>
          <div className="gs-progress-track">
            <div
              className="gs-progress-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
          {completedCount === totalCount && (
            <p className="gs-complete-msg">
              Nice work! Your Study-HQ is fully set up. Head to your{" "}
              <Link href="/dashboard" style={{ color: "var(--red)", fontWeight: 600, textDecoration: "underline" }}>Dashboard</Link>{" "}
              to see everything in action.
            </p>
          )}
        </div>

        {/* Checklist */}
        <div className="gs-checklist">
          {checklist.map((item, i) => {
            const done = !!checked[item.id];
            return (
              <div key={item.id} className={`gs-item${done ? " done" : ""}`}>
                <button
                  className={`gs-check${done ? " checked" : ""}`}
                  onClick={() => toggle(item.id)}
                  aria-label={done ? `Uncheck ${item.title}` : `Check ${item.title}`}
                >
                  {done ? (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
                      <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span className="gs-check-num">{i + 1}</span>
                  )}
                </button>
                <div className="gs-item-body">
                  <div className="gs-item-header">
                    <span className="gs-item-icon">{item.icon}</span>
                    <span className={`gs-item-title${done ? " done" : ""}`}>{item.title}</span>
                  </div>
                  <p className="gs-item-desc">{item.desc}</p>
                  <Link href={`${item.href}${isDemo ? "?demo=true" : ""}`} className="gs-item-link">
                    {item.linkLabel} <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

export default function GetStartedPage() {
  return <Suspense><GetStartedInner /></Suspense>;
}
