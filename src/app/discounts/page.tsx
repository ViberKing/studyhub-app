"use client";

import { Suspense, useState } from "react";
import AppShell from "@/components/AppShell";

const discounts = [
  { brand: "Amazon Prime", offer: "6 months free then 50% off", desc: "Prime Student gives you free delivery, Prime Video, and more.", category: "tech", url: "https://www.amazon.co.uk/studentoffer", color: "#f59e0b" },
  { brand: "Spotify", offer: "Free for 1 month, then \u00A35.99/mo", desc: "Spotify Premium Student includes Hulu and SHOWTIME.", category: "streaming", url: "https://www.spotify.com/uk/student/", color: "#1DB954" },
  { brand: "Apple Music", offer: "Free for 1 month, then \u00A35.99/mo", desc: "Apple Music student plan with Apple TV+ included.", category: "streaming", url: "https://music.apple.com/subscribe/student", color: "#fc3c44" },
  { brand: "ASOS", offer: "10% off everything", desc: "Verify via UniDays or Student Beans to unlock.", category: "fashion", url: "https://www.asos.com/student-discount/", color: "#2d2d2d" },
  { brand: "Nike", offer: "10% student discount", desc: "Verify through UniDays for 10% off online orders.", category: "fashion", url: "https://www.nike.com/gb/student-discount", color: "#111" },
  { brand: "16-25 Railcard", offer: "\u2153 off rail fares", desc: "Save a third on train tickets across Great Britain. \u00A330/year.", category: "transport", url: "https://www.16-25railcard.co.uk/", color: "#822380" },
  { brand: "Microsoft 365", offer: "Free with .ac.uk email", desc: "Word, Excel, PowerPoint, and 1TB OneDrive \u2014 completely free.", category: "tech", url: "https://www.microsoft.com/en-gb/education/products/office", color: "#0078D4" },
  { brand: "GitHub Student Pack", offer: "Free developer tools", desc: "Copilot, domains, cloud credits, and 100+ tools \u2014 all free.", category: "tech", url: "https://education.github.com/pack", color: "#24292e" },
  { brand: "PureGym", offer: "Student memberships from \u00A318/mo", desc: "Discounted gym membership for students at most locations.", category: "health", url: "https://www.puregym.com/students/", color: "#FFD100" },
  { brand: "McDonald's", offer: "Deals via Student Beans", desc: "Exclusive meal deals and freebies through the Student Beans app.", category: "food", url: "https://www.studentbeans.com/student-discount/uk/mcdonald-s", color: "#FFC72C" },
  { brand: "Domino's", offer: "35% off online orders", desc: "Student discount codes available via Student Beans.", category: "food", url: "https://www.studentbeans.com/student-discount/uk/domino-s-pizza", color: "#006491" },
  { brand: "Deliveroo", offer: "25% off first order", desc: "Student deals available via Deliveroo Plus student plan.", category: "food", url: "https://www.studentbeans.com/student-discount/uk/deliveroo", color: "#00CCBC" },
  { brand: "Nando's", offer: "20% off with Student Beans", desc: "Verify via Student Beans for 20% off your order.", category: "food", url: "https://www.studentbeans.com/student-discount/uk/nando-s", color: "#C8102E" },
  { brand: "Dr. Martens", offer: "10% off", desc: "Student discount through Student Beans verification.", category: "fashion", url: "https://www.studentbeans.com/student-discount/uk/dr-martens", color: "#FFE800" },
  { brand: "Three Mobile", offer: "Discounted SIM-only plans", desc: "Student-exclusive phone plans \u2014 verify via UniDays.", category: "tech", url: "https://www.myunidays.com/GB/en-GB/partners/three/access/online", color: "#FF5A00" },
  { brand: "NOW", offer: "Student plans from \u00A35.99/mo", desc: "Cinema, Entertainment, or Sports passes at student prices.", category: "streaming", url: "https://www.studentbeans.com/student-discount/uk/now-tv", color: "#16D6C0" },
];

const platforms = [
  { name: "UniDays", desc: "The #1 student discount platform. Verify with your university email to unlock hundreds of deals.", url: "https://www.myunidays.com/", color: "#6c5ce7" },
  { name: "Student Beans", desc: "Another major platform with exclusive deals on food, fashion, tech, and more.", url: "https://www.studentbeans.com/", color: "#00dc6e" },
  { name: "TOTUM", desc: "The official NUS student card. \u00A314.99/year for in-store and online discounts nationwide.", url: "https://www.totum.com/", color: "#e91e63" },
];

const categories = ["all", "food", "tech", "fashion", "streaming", "transport", "health", "other"] as const;
const categoryLabels: Record<string, string> = { all: "All", food: "Food & Drink", tech: "Tech", fashion: "Fashion", streaming: "Streaming", transport: "Transport", health: "Health", other: "Other" };

function DiscountsInner() {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = activeCategory === "all" ? discounts : discounts.filter(d => d.category === activeCategory);

  return (
    <AppShell>
      <div className="page active">
        {/* Hero */}
        <div className="hero">
          <div className="hero-content">
            <h1>Student Discounts</h1>
            <p>Save money while you study.</p>
          </div>
        </div>

        {/* Affiliate disclosure */}
        <div style={{
          padding: "12px 20px",
          background: "var(--amber-soft)",
          border: "1px solid #f59e0b33",
          borderRadius: "var(--radius)",
          fontSize: 13,
          color: "var(--text-muted)",
          marginBottom: 24,
          lineHeight: 1.5,
        }}>
          Some links may be affiliate links. We may earn a small commission at no extra cost to you.
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

        {/* Discount cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
          marginBottom: 32,
        }}>
          {filtered.map((deal, i) => (
            <div
              key={i}
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
              {/* Color strip */}
              <div style={{ height: 6, background: deal.color }} />
              <div style={{ padding: "20px 20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: `${deal.color}18`,
                    border: `1.5px solid ${deal.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: deal.color === "#111" || deal.color === "#24292e" || deal.color === "#2d2d2d" ? "var(--text)" : deal.color,
                    fontWeight: 800, fontSize: 14, flexShrink: 0,
                  }}>
                    {deal.brand.charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 15, marginBottom: 2, letterSpacing: "-0.01em" }}>{deal.brand}</h4>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--red)" }}>{deal.offer}</div>
                  </div>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>{deal.desc}</p>
                <a
                  href={deal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-grad"
                  style={{ display: "block", textAlign: "center", fontSize: 13, padding: "10px 0", textDecoration: "none" }}
                >
                  Get Deal
                </a>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="empty" style={{ padding: 32, marginBottom: 24 }}>No discounts in this category yet.</div>
        )}

        {/* Platforms to Sign Up For */}
        <h3 className="section-title">Platforms to Sign Up For</h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>
          Register on these platforms to unlock even more student deals.
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}>
          {platforms.map(platform => (
            <a
              key={platform.name}
              href={platform.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                padding: "20px 24px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                textDecoration: "none",
                color: "var(--text)",
                boxShadow: "var(--shadow-xs)",
                transition: "box-shadow .15s, transform .15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.boxShadow = "var(--shadow-xs)"; (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)"; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: platform.color,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0,
              }}>{platform.name.charAt(0)}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{platform.name}</div>
                <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5 }}>{platform.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

export default function DiscountsPage() {
  return <Suspense><DiscountsInner /></Suspense>;
}
