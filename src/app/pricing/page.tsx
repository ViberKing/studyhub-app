"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell from "@/components/AppShell";

const prices = {
  monthly: { essential: "7.99", plus: "11.99", pro: "15.99", sub: "per month" },
  annual: { essential: "79", plus: "119", pro: "159", sub: "per year (save up to £32)" },
};

function PricingInner() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();
  const p = prices[billing];

  async function startTrial(tier: string) {
    if (isDemo) {
      alert("You're in demo mode. Sign up for a real account to subscribe.");
      return;
    }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tier.toLowerCase(), billing, userId: session.user.id, email: session.user.email }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Error: " + (data.error || "Unknown error"));
    } catch {
      alert("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Choose your plan</h1>
        <p className="page-sub">Start with a 7-day free trial. No credit card required.</p>

        <div className="billing-toggle">
          <button className={billing === "monthly" ? "active" : ""} onClick={() => setBilling("monthly")}>Monthly</button>
          <button className={billing === "annual" ? "active" : ""} onClick={() => setBilling("annual")}>Annual <span className="save-tag">Save up to £40</span></button>
        </div>

        <div className="pricing-grid">
          <div className="tier">
            <h3>Essential</h3>
            <p className="tier-desc">For everyday study</p>
            <div className="price">£{p.essential}</div>
            <div className="price-sub">{p.sub}</div>
            <ul>
              <li>All core study tools</li><li>Assignments tracker</li><li>Pomodoro study timer</li>
              <li>Flashcard decks</li><li>Grade calculator</li><li>Citation generator</li><li>Up to 5 modules</li>
            </ul>
            <button className="btn btn-block btn-ghost" onClick={() => startTrial("Essential")}>Start free trial</button>
          </div>

          <div className="tier popular">
            <div className="pop-badge">Most popular</div>
            <h3>Plus</h3>
            <p className="tier-desc">For serious students</p>
            <div className="price">£{p.plus}</div>
            <div className="price-sub">{p.sub}</div>
            <ul>
              <li>Everything in Essential</li><li>AI Research Assistant</li><li>Essay structure builder</li>
              <li>Unlimited modules</li><li>Advanced analytics</li><li>PDF source uploads</li><li>Priority support</li>
            </ul>
            <button className="btn btn-block btn-grad" onClick={() => startTrial("Plus")}>Start free trial</button>
          </div>

          <div className="tier">
            <h3>Pro</h3>
            <p className="tier-desc">For dissertation season</p>
            <div className="price">£{p.pro}</div>
            <div className="price-sub">{p.sub}</div>
            <ul>
              <li>Everything in Plus</li><li>Study group collaboration</li><li>Export all your data</li>
              <li>1-on-1 onboarding session</li><li>Early access to new features</li><li>Dedicated success manager</li>
            </ul>
            <button className="btn btn-block btn-ghost" onClick={() => startTrial("Pro")}>Start free trial</button>
          </div>
        </div>

        <div className="card">
          <h3>All plans include</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
            ✓ 7-day free trial · ✓ Cancel anytime · ✓ Student-friendly pricing · ✓ Used by students at St Andrews and beyond.<br />
            Built by students who actually use it themselves.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

export default function PricingPage() { return <Suspense><PricingInner /></Suspense>; }
