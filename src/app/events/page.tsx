"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell, { useAppContext } from "@/components/AppShell";
import UniSelector from "@/components/UniSelector";
import { universities, getUniversity, type University } from "@/lib/universities";

/* ── Per-university curated events ── */
interface EventItem {
  name: string;
  venue: string;
  date: string;
  price: string;
  category: string;
  url: string;
  color: string;
}

const uniEvents: Record<string, EventItem[]> = {
  "st-andrews": [
    { name: "Friday Night at 601", venue: "Club 601, Students' Association", date: "Every Friday", price: "\u00A35\u2013\u00A38", category: "nightlife", url: "https://fixr.co/venue/club-601-st-andrews-students-association-6365", color: "#6c5ce7" },
    { name: "Raisin Weekend", venue: "Students' Association", date: "November", price: "Varies", category: "society", url: "https://www.yourunion.net/events/", color: "#f59e0b" },
    { name: "Music Society Concert", venue: "Younger Hall", date: "Monthly", price: "\u00A33\u2013\u00A310", category: "arts", url: "https://www.yourunion.net/activities/music/", color: "#10b981" },
    { name: "Sports Ball", venue: "Kinkell Byre", date: "March", price: "\u00A330\u2013\u00A345", category: "sports", url: "https://www.yourunion.net/events/", color: "#ef4444" },
    { name: "Ceilidh Night", venue: "Lower College Hall", date: "Bi-monthly", price: "\u00A35", category: "society", url: "https://www.yourunion.net/events/", color: "#6366f1" },
    { name: "Comedy Night", venue: "The Byre Theatre", date: "Monthly", price: "\u00A37\u2013\u00A312", category: "arts", url: "https://byretheatre.com/whats-on/", color: "#ec4899" },
    { name: "Pub Quiz", venue: "The Rule", date: "Every Wednesday", price: "Free", category: "nightlife", url: "https://fixr.co/venue/the-rule-st-andrews-844855", color: "#14b8a6" },
    { name: "Charity Run 5K", venue: "West Sands Beach", date: "April", price: "\u00A310", category: "sports", url: "https://www.eventbrite.com/d/united-kingdom--st-andrews/charity-run/", color: "#f97316" },
  ],
  "edinburgh": [
    { name: "Big Cheese", venue: "Potterrow, Edinburgh Uni", date: "Every Friday", price: "\u00A35", category: "nightlife", url: "https://fixr.co/venue/potterrow-edinburgh-698855", color: "#6c5ce7" },
    { name: "Festival Fringe", venue: "Various venues", date: "August", price: "Varies", category: "arts", url: "https://www.edfringe.com/", color: "#f59e0b" },
    { name: "Meadows 5K", venue: "The Meadows", date: "Weekly", price: "Free", category: "sports", url: "https://www.parkrun.org.uk/edinburgh/", color: "#10b981" },
    { name: "Jazz Night", venue: "Teviot Row House", date: "Monthly", price: "\u00A33\u2013\u00A37", category: "arts", url: "https://fixr.co/organiser/edinburgh-university-students-association/events", color: "#ec4899" },
  ],
  "glasgow": [
    { name: "QMU Night Out", venue: "QMU, University of Glasgow", date: "Every Friday", price: "\u00A34\u2013\u00A38", category: "nightlife", url: "https://fixr.co/venue/queen-margaret-union-glasgow-698877", color: "#6c5ce7" },
    { name: "Kelvingrove Nights", venue: "Kelvingrove Museum", date: "Monthly", price: "Free", category: "arts", url: "https://www.glasgowlife.org.uk/museums/venues/kelvingrove-art-gallery-and-museum", color: "#f59e0b" },
    { name: "GUU Debates", venue: "Glasgow University Union", date: "Weekly", price: "Free", category: "society", url: "https://www.guu.co.uk/", color: "#10b981" },
  ],
  // Default events shown for universities without specific curated events
  _default: [],
};

const categories = ["all", "nightlife", "society", "sports", "arts", "other"] as const;
const categoryLabels: Record<string, string> = { all: "All", nightlife: "Nightlife", society: "Society", sports: "Sports", arts: "Arts", other: "Other" };

function EventsInner() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const { profile } = useAppContext();

  const profileUni = profile?.university || "st-andrews";
  const [selectedUni, setSelectedUni] = useState(profileUni);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const uni = getUniversity(selectedUni);
  const events = uniEvents[selectedUni] || uniEvents._default;
  const filtered = activeCategory === "all" ? events : events.filter(e => e.category === activeCategory);

  const fixrUrl = uni?.fixrSlug ? `https://fixr.co/cities/${uni.fixrSlug}` : null;
  const eventbriteUrl = uni ? `https://www.eventbrite.com/d/united-kingdom--${uni.eventbriteSlug}/events/` : null;

  return (
    <AppShell>
      <div className="page active">
        {/* Hero */}
        <div className="hero">
          <div className="hero-content">
            <h1>Events near {uni?.city || "you"}</h1>
            <p>Discover what&apos;s happening around town — from club nights to society events.</p>
          </div>
        </div>

        {/* University selector */}
        <div style={{ marginBottom: 20 }}>
          <UniSelector
            value={selectedUni}
            onChange={(u: University) => { setSelectedUni(u.id); setActiveCategory("all"); }}
          />
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

        {/* Featured Events (if curated events exist for this uni) */}
        {events.length > 0 && (
          <>
            <h3 className="section-title">Featured Events</h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
              marginBottom: 32,
            }}>
              {filtered.map((event, i) => (
                <a
                  key={i}
                  href={event.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      background: "var(--surface)",
                      borderRadius: "var(--radius-lg)",
                      border: "1px solid var(--border)",
                      overflow: "hidden",
                      boxShadow: "var(--shadow-sm)",
                      transition: "transform .15s, box-shadow .15s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-lg)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm)"; }}
                  >
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
                      <div
                        className="btn btn-grad"
                        style={{ display: "block", textAlign: "center", fontSize: 13, padding: "10px 0" }}
                      >
                        View Event
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}

        {filtered.length === 0 && events.length > 0 && (
          <div className="empty" style={{ padding: 32, marginBottom: 24 }}>No events in this category yet.</div>
        )}

        {events.length === 0 && (
          <div className="empty" style={{ padding: 32, marginBottom: 24, textAlign: "center" }}>
            <p style={{ marginBottom: 8 }}>We don&apos;t have curated events for {uni?.name || "this university"} yet.</p>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Browse events in {uni?.city || "your area"} using the links below.</p>
          </div>
        )}

        {/* Browse more links */}
        <h3 className="section-title">Browse more events in {uni?.city || "your area"}</h3>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}>
          {fixrUrl && (
            <a
              href={fixrUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "20px 24px",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)", textDecoration: "none", color: "var(--text)",
                boxShadow: "var(--shadow-xs)", transition: "box-shadow .15s, transform .15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow-xs)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "linear-gradient(135deg, #6c5ce7, #a29bfe)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0,
              }}>Fx</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Browse on Fixr</div>
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Find events in {uni?.city}</div>
              </div>
            </a>
          )}
          {eventbriteUrl && (
            <a
              href={eventbriteUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "20px 24px",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)", textDecoration: "none", color: "var(--text)",
                boxShadow: "var(--shadow-xs)", transition: "box-shadow .15s, transform .15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow-xs)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "linear-gradient(135deg, #f05537, #f7a072)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0,
              }}>Eb</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Browse on Eventbrite</div>
                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Discover events in {uni?.city}</div>
              </div>
            </a>
          )}
          <a
            href={`https://www.studentbeans.com/student-discount/uk`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 14, padding: "20px 24px",
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", textDecoration: "none", color: "var(--text)",
              boxShadow: "var(--shadow-xs)", transition: "box-shadow .15s, transform .15s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow-xs)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"; }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "linear-gradient(135deg, #00dc6e, #00b85c)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0,
            }}>SB</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Student Beans Events</div>
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Student events & experiences</div>
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
