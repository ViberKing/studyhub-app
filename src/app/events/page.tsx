"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";

const events = [
  { id: 1, name: "Friday Night at 601", venue: "Club 601, Students' Association", date: "Every Friday", price: "\u00A35\u2013\u00A38", category: "nightlife", url: "https://fixr.co/venue/club-601-st-andrews-students-association-6365", color: "#6c5ce7" },
  { id: 2, name: "Raisin Weekend", venue: "St Andrews Students' Association", date: "November 2026", price: "Varies", category: "society", url: "https://fixr.co/cities/st-andrews", color: "#f59e0b" },
  { id: 3, name: "Music Society Concert", venue: "Younger Hall", date: "Monthly", price: "\u00A33\u2013\u00A310", category: "arts", url: "https://fixr.co/organiser/stamusicsociety/events", color: "#10b981" },
  { id: 4, name: "Sports Ball", venue: "Kinkell Byre", date: "March 2026", price: "\u00A330\u2013\u00A345", category: "sports", url: "https://fixr.co/cities/st-andrews", color: "#ef4444" },
  { id: 5, name: "Ceilidh Night", venue: "Lower College Hall", date: "Bi-monthly", price: "\u00A35", category: "society", url: "https://fixr.co/cities/st-andrews", color: "#6366f1" },
  { id: 6, name: "Comedy Night", venue: "The Byre Theatre", date: "Monthly", price: "\u00A37\u2013\u00A312", category: "arts", url: "https://fixr.co/cities/st-andrews", color: "#ec4899" },
  { id: 7, name: "Pub Quiz", venue: "The Rule", date: "Every Wednesday", price: "Free", category: "nightlife", url: "https://fixr.co/cities/st-andrews", color: "#14b8a6" },
  { id: 8, name: "Charity Run 5K", venue: "West Sands Beach", date: "April 2026", price: "\u00A310", category: "sports", url: "https://fixr.co/cities/st-andrews", color: "#f97316" },
];

const categories = ["all", "nightlife", "society", "sports", "arts", "other"] as const;
const categoryLabels: Record<string, string> = { all: "All", nightlife: "Nightlife", society: "Society", sports: "Sports", arts: "Arts", other: "Other" };

function EventsInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  void isDemo; // Events are public — same data in demo and regular mode

  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = activeCategory === "all" ? events : events.filter(e => e.category === activeCategory);

  return (
    <AppShell>
      <div className="page active">
        {/* Hero */}
        <div className="hero">
          <div className="hero-content">
            <h1>Events near St Andrews</h1>
            <p>Discover what&apos;s happening around town — from club nights to society events.</p>
          </div>
        </div>

        {/* Category filter */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "8px 18px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                border: "1.5px solid",
                borderColor: activeCategory === cat ? "var(--red)" : "var(--border-strong)",
                background: activeCategory === cat ? "var(--red)" : "var(--surface)",
                color: activeCategory === cat ? "#fff" : "var(--text-muted)",
                transition: "all .15s",
              }}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>

        {/* Featured Events */}
        <h3 className="section-title">Featured Events</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
          marginBottom: 32,
        }}>
          {filtered.map(event => (
            <div
              key={event.id}
              style={{
                background: "var(--surface)",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border)",
                overflow: "hidden",
                boxShadow: "var(--shadow-sm)",
                transition: "transform .15s, box-shadow .15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-lg)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm)"; }}
            >
              {/* Color strip / gradient placeholder for event image */}
              <div style={{
                height: 8,
                background: `linear-gradient(135deg, ${event.color}, ${event.color}99)`,
              }} />
              <div style={{
                height: 100,
                background: `linear-gradient(135deg, ${event.color}22, ${event.color}11)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={event.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/>
                </svg>
              </div>
              <div style={{ padding: "16px 20px 20px" }}>
                <h4 style={{ fontSize: 16, marginBottom: 4, letterSpacing: "-0.01em" }}>{event.name}</h4>
                <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 8 }}>{event.venue}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontSize: 12, color: "var(--text-subtle)" }}>{event.date}</span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: event.color,
                    background: `${event.color}15`,
                    padding: "3px 10px",
                    borderRadius: 12,
                  }}>{event.price}</span>
                </div>
                <a
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-grad"
                  style={{ display: "block", textAlign: "center", fontSize: 13, padding: "10px 0", textDecoration: "none" }}
                >
                  Get Tickets
                </a>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="empty" style={{ padding: 32, marginBottom: 24 }}>No events in this category yet.</div>
        )}

        {/* Browse more links */}
        <h3 className="section-title">Browse more events</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}>
          <a
            href="https://fixr.co/cities/st-andrews"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "20px 24px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
              color: "var(--text)",
              boxShadow: "var(--shadow-xs)",
              transition: "box-shadow .15s",
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}>Fx</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Browse More on Fixr</div>
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Find all St Andrews events on Fixr</div>
            </div>
          </a>
          <a
            href="https://www.eventbrite.com/d/united-kingdom--st-andrews/events/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "20px 24px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
              color: "var(--text)",
              boxShadow: "var(--shadow-xs)",
              transition: "box-shadow .15s",
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, #f05537, #f7a072)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}>Eb</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Browse on Eventbrite</div>
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Discover events on Eventbrite</div>
            </div>
          </a>
        </div>
      </div>
    </AppShell>
  );
}

export default function EventsPage() {
  return <Suspense><EventsInner /></Suspense>;
}
