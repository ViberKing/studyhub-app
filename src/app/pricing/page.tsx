"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell, { useAppContext } from "@/components/AppShell";

const prices = {
  monthly: { essential: "7.99", plus: "11.99", pro: "15.99", sub: "per month" },
  annual: { essential: "79", plus: "119", pro: "159", sub: "per year (save up to £33)" },
};

const TIER_LEVEL: Record<string, number> = { trial: 0, cancelled: 0, essential: 1, plus: 2, pro: 3, gifted: 3 };

function PricingInner() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const searchParams = useSearchParams();
  const router = useRouter();
  const isDemo = searchParams.get("demo") === "true";
  const { profile } = useAppContext();
  const supabase = createClient();
  const p = prices[billing];

  const userPlan = profile?.plan || "trial";
  const userLevel = TIER_LEVEL[userPlan] ?? 0;
  const isGifted = userPlan === "gifted";

  async function startTrial(tier: string) {
    if (isDemo) return;
    setCheckoutError("");
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
      else setCheckoutError(data.error || "Something went wrong. Please try again.");
    } catch {
      setCheckoutError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Choose your plan</h1>
        <p className="page-sub">Start with a 7-day free trial. Cancel anytime.</p>

        {/* Current plan banner for gifted/paid users */}
        {isGifted && (
          <div style={{
            padding: "16px 24px", marginBottom: 24, borderRadius: "var(--radius-lg)",
            background: "linear-gradient(135deg, #10b98115, #10b98108)",
            border: "1px solid #10b98130", display: "flex", alignItems: "center", gap: 12,
          }}>
            <span className="tier-pill tier-pro">Pro</span>
            <span style={{ fontSize: 14, color: "var(--text)" }}>
              You have <strong>full Pro access</strong> — no subscription needed.
              {profile?.is_admin && <> You&apos;re also an <strong>admin</strong>. <a onClick={() => router.push("/admin")} style={{ color: "var(--red)", cursor: "pointer", fontWeight: 600 }}>Open Admin Portal</a></>}
            </span>
          </div>
        )}
        {!isGifted && userLevel > 0 && (
          <div style={{
            padding: "16px 24px", marginBottom: 24, borderRadius: "var(--radius-lg)",
            background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12,
          }}>
            <span className={`tier-pill tier-${userPlan}`}>{userPlan.charAt(0).toUpperCase() + userPlan.slice(1)}</span>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>Your current plan</span>
          </div>
        )}

        {!isGifted && (
          <div className="billing-toggle">
            <button className={billing === "monthly" ? "active" : ""} onClick={() => setBilling("monthly")}>Monthly</button>
            <button className={billing === "annual" ? "active" : ""} onClick={() => setBilling("annual")}>Annual <span className="save-tag">Save up to £33</span></button>
          </div>
        )}

        {checkoutError && <p style={{ color: "var(--red)", fontSize: 13, textAlign: "center", marginBottom: 12 }}>{checkoutError}</p>}

        <div className="pricing-grid">
          <div className={`tier${userPlan === "essential" ? " current" : ""}`}>
            <h3>Essential</h3>
            <p className="tier-desc">For everyday study</p>
            <div className="price">£{p.essential}</div>
            <div className="price-sub">{p.sub}</div>
            <ul>
              <li>All core study tools</li><li>Assignments tracker</li><li>Pomodoro study timer</li>
              <li>Flashcard decks</li><li>Grade calculator</li><li>Citation generator</li><li>Up to 5 modules</li>
            </ul>
            {isGifted ? (
              <div className="btn btn-block btn-ghost" style={{ opacity: 0.5, cursor: "default", textAlign: "center" }}>Included in your plan</div>
            ) : userPlan === "essential" ? (
              <div className="btn btn-block btn-grad" style={{ opacity: 0.7, cursor: "default", textAlign: "center" }}>Current plan</div>
            ) : userLevel > 1 ? (
              <div className="btn btn-block btn-ghost" style={{ opacity: 0.5, cursor: "default", textAlign: "center" }}>Included</div>
            ) : (
              <button className="btn btn-block btn-ghost" onClick={() => startTrial("Essential")} disabled={loading}>{loading ? "Loading..." : "Start free trial"}</button>
            )}
          </div>

          <div className={`tier popular${userPlan === "plus" ? " current" : ""}`}>
            <div className="pop-badge">Most popular</div>
            <h3>Plus</h3>
            <p className="tier-desc">For serious students</p>
            <div className="price">£{p.plus}</div>
            <div className="price-sub">{p.sub}</div>
            <ul>
              <li>Everything in Essential</li><li>AI Research Assistant</li><li>Essay structure builder</li>
              <li>Unlimited modules</li><li>Advanced analytics</li><li>PDF source uploads</li><li>Priority support</li>
            </ul>
            {isGifted ? (
              <div className="btn btn-block btn-ghost" style={{ opacity: 0.5, cursor: "default", textAlign: "center" }}>Included in your plan</div>
            ) : userPlan === "plus" ? (
              <div className="btn btn-block btn-grad" style={{ opacity: 0.7, cursor: "default", textAlign: "center" }}>Current plan</div>
            ) : userLevel > 2 ? (
              <div className="btn btn-block btn-ghost" style={{ opacity: 0.5, cursor: "default", textAlign: "center" }}>Included</div>
            ) : (
              <button className="btn btn-block btn-grad" onClick={() => startTrial("Plus")} disabled={loading}>{loading ? "Loading..." : "Start free trial"}</button>
            )}
          </div>

          <div className={`tier${userPlan === "pro" || isGifted ? " current" : ""}`}>
            <h3>Pro</h3>
            <p className="tier-desc">For dissertation season</p>
            <div className="price">£{p.pro}</div>
            <div className="price-sub">{p.sub}</div>
            <ul>
              <li>Everything in Plus</li><li>Study group collaboration</li><li>Export all your data</li>
              <li>1-on-1 onboarding session</li><li>Early access to new features</li><li>Dedicated success manager</li>
            </ul>
            {isGifted ? (
              <div className="btn btn-block btn-grad" style={{ opacity: 0.7, cursor: "default", textAlign: "center" }}>Your plan</div>
            ) : userPlan === "pro" ? (
              <div className="btn btn-block btn-grad" style={{ opacity: 0.7, cursor: "default", textAlign: "center" }}>Current plan</div>
            ) : (
              <button className="btn btn-block btn-ghost" onClick={() => startTrial("Pro")} disabled={loading}>{loading ? "Loading..." : "Start free trial"}</button>
            )}
          </div>
        </div>

        <div className="card">
          <h3>All plans include</h3>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
            ✓ 7-day free trial · ✓ Cancel anytime · ✓ Student-friendly pricing · ✓ Used by students at universities across the UK.<br />
            Built by students who actually use it themselves.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

export default function PricingPage() { return <Suspense><PricingInner /></Suspense>; }
