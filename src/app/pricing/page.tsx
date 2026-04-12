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

  /* If user has Pro or Gifted, show a simple confirmation instead of pricing */
  if (userPlan === "pro" || isGifted) {
    return (
      <AppShell>
        <div className="page active">
          <div style={{
            maxWidth: 520, margin: "60px auto", textAlign: "center", padding: "48px 32px",
            background: "var(--surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)",
            boxShadow: "var(--shadow)",
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: 20, margin: "0 auto 24px",
              background: "linear-gradient(135deg, var(--red), #f97316)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="36" height="36" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h1 style={{ fontSize: 28, marginBottom: 8, letterSpacing: "-0.02em" }}>You&apos;re on the Pro plan</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
              {isGifted
                ? "You have full Pro access — no subscription or billing required. Enjoy every feature Study-HQ has to offer."
                : "You have access to every feature Study-HQ has to offer. Thank you for your support!"}
            </p>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28,
              textAlign: "left", padding: "20px 24px",
              background: "var(--bg)", borderRadius: "var(--radius)", border: "1px solid var(--border)",
            }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Plan</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Pro {isGifted && <span style={{ color: "var(--emerald)", fontWeight: 600 }}>(Gifted)</span>}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Status</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--emerald)" }}>Active</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Billing</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{isGifted ? "None — free access" : `£15.99/month`}</div>
              {profile?.is_admin && <>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Role</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#3b82f6" }}>Admin</div>
              </>}
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-grad" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </button>
              {profile?.is_admin && (
                <button className="btn btn-ghost" onClick={() => router.push("/admin")}>
                  Open Admin Portal
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => router.push("/settings")}>
                Account Settings
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Choose your plan</h1>
        <p className="page-sub">Start with a 7-day free trial. Cancel anytime.</p>

        {/* Current plan banner for paid users */}
        {userLevel > 0 && (
          <div style={{
            padding: "16px 24px", marginBottom: 24, borderRadius: "var(--radius-lg)",
            background: "var(--surface)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 12,
          }}>
            <span className={`tier-pill tier-${userPlan}`}>{userPlan.charAt(0).toUpperCase() + userPlan.slice(1)}</span>
            <span style={{ fontSize: 14, color: "var(--text-muted)" }}>Your current plan</span>
          </div>
        )}

        <div className="billing-toggle">
          <button className={billing === "monthly" ? "active" : ""} onClick={() => setBilling("monthly")}>Monthly</button>
          <button className={billing === "annual" ? "active" : ""} onClick={() => setBilling("annual")}>Annual <span className="save-tag">Save up to £33</span></button>
        </div>

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
            {userPlan === "essential" ? (
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
            {userPlan === "plus" ? (
              <div className="btn btn-block btn-grad" style={{ opacity: 0.7, cursor: "default", textAlign: "center" }}>Current plan</div>
            ) : userLevel > 2 ? (
              <div className="btn btn-block btn-ghost" style={{ opacity: 0.5, cursor: "default", textAlign: "center" }}>Included</div>
            ) : (
              <button className="btn btn-block btn-grad" onClick={() => startTrial("Plus")} disabled={loading}>{loading ? "Loading..." : "Start free trial"}</button>
            )}
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
            <button className="btn btn-block btn-ghost" onClick={() => startTrial("Pro")} disabled={loading}>{loading ? "Loading..." : "Start free trial"}</button>
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
