"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell, { useAppContext, clearProfileCache } from "@/components/AppShell";

interface ReferralData {
  slug: string;
  commissionRate: number;
  totalEarned: number;
}

interface Referee {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  joinedAt: string;
}

interface Commission {
  id: string;
  amount: number;
  paymentAmount: number;
  createdAt: string;
  refereeName: string;
}

function planColor(plan: string) {
  switch (plan) {
    case "pro": return "#E11D48";
    case "plus": return "#6366f1";
    case "essential": return "#10b981";
    case "trial": return "#f59e0b";
    case "gifted": return "#ec4899";
    case "cancelled": return "#6b7280";
    default: return "#6b7280";
  }
}

function ReferralsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();
  const { profile, userId } = useAppContext();

  const [loading, setLoading] = useState(true);
  const [isPartner, setIsPartner] = useState(false);
  const [partnerData, setPartnerData] = useState<ReferralData | null>(null);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"overview" | "referees" | "earnings">("overview");

  // Activation state
  const [accessCode, setAccessCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState("");

  const loadData = useCallback(async () => {
    if (isDemo || !userId) { setLoading(false); return; }

    // Check if user is a referral partner
    const { data: partner } = await supabase
      .from("referral_partners")
      .select("referral_slug, commission_rate, total_earned")
      .eq("user_id", userId)
      .single();

    if (partner) {
      setIsPartner(true);
      setPartnerData({
        slug: partner.referral_slug,
        commissionRate: partner.commission_rate,
        totalEarned: partner.total_earned || 0,
      });

      // Load referees
      const { data: referralRows } = await supabase
        .from("referrals")
        .select("id, referee_id, status, created_at")
        .eq("referrer_id", userId)
        .order("created_at", { ascending: false });

      if (referralRows && referralRows.length > 0) {
        const refereeIds = referralRows.map(r => r.referee_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email, plan")
          .in("id", refereeIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        setReferees(referralRows.map(r => {
          const p = profileMap.get(r.referee_id);
          return {
            id: r.id,
            name: p?.name || "Unknown",
            email: p?.email || "",
            plan: p?.plan || "trial",
            status: r.status,
            joinedAt: r.created_at,
          };
        }));
      }

      // Load commissions
      const { data: commissionRows } = await supabase
        .from("referral_commissions")
        .select("id, amount, payment_amount, created_at, referral_id")
        .eq("referrer_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (commissionRows && commissionRows.length > 0) {
        // Map commissions to referee names
        const referralIds = commissionRows.map(c => c.referral_id);
        const { data: refRows } = await supabase
          .from("referrals")
          .select("id, referee_id")
          .in("id", referralIds);

        const refMap = new Map(refRows?.map(r => [r.id, r.referee_id]) || []);

        const { data: cProfiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", Array.from(new Set(refRows?.map(r => r.referee_id) || [])));

        const nameMap = new Map(cProfiles?.map(p => [p.id, p.name]) || []);

        setCommissions(commissionRows.map(c => ({
          id: c.id,
          amount: c.amount,
          paymentAmount: c.payment_amount,
          createdAt: c.created_at,
          refereeName: nameMap.get(refMap.get(c.referral_id) || "") || "Unknown",
        })));
      }
    }

    setLoading(false);
  }, [userId, isDemo]);

  useEffect(() => { loadData(); }, [loadData]);

  async function activatePartner() {
    setActivationError("");
    if (!accessCode.trim()) { setActivationError("Please enter an access code."); return; }
    setActivating(true);

    try {
      const res = await fetch("/api/referral/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: accessCode.trim(), userId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setActivationError(data.error || "Failed to activate.");
        setActivating(false);
        return;
      }

      // Success — reload
      clearProfileCache();
      setIsPartner(true);
      setPartnerData({ slug: data.slug, commissionRate: 0.5, totalEarned: 0 });
      setAccessCode("");
    } catch {
      setActivationError("Something went wrong. Try again.");
    }
    setActivating(false);
  }

  async function copyLink() {
    if (!partnerData) return;
    const link = `https://study-hq.co.uk/?ref=${partnerData.slug}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = link;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) return null;

  // Not a partner yet — show activation form
  if (!isPartner) {
    return (
      <AppShell>
        <div className="page active">
          <div className="ref-activate-wrap">
            <div className="ref-activate-card">
              <div className="ref-activate-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h1>Referral Programme</h1>
              <p>Earn <strong>50% commission</strong> on every payment from people you refer to Study-HQ. This programme is invite-only.</p>

              <div className="ref-activate-form">
                <div className="field">
                  <label>Access code</label>
                  <input
                    type="text"
                    placeholder="Enter your access code"
                    value={accessCode}
                    onChange={e => setAccessCode(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === "Enter") activatePartner(); }}
                    style={{ textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}
                  />
                </div>
                {activationError && (
                  <p style={{ color: "var(--red)", fontSize: 13 }}>{activationError}</p>
                )}
                <button
                  className="btn btn-grad"
                  onClick={activatePartner}
                  disabled={activating}
                  style={{ width: "100%" }}
                >
                  {activating ? "Activating..." : "Activate partner account"}
                </button>
              </div>

              <div className="ref-activate-footer">
                <p>Don&apos;t have a code? This programme is currently invite-only. Contact us if you&apos;re interested in becoming a partner.</p>
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // Partner dashboard
  const referralLink = `https://study-hq.co.uk/?ref=${partnerData?.slug}`;
  const activeReferees = referees.filter(r => ["active"].includes(r.status)).length;
  const pendingReferees = referees.filter(r => r.status === "pending").length;
  const thisMonthEarnings = commissions
    .filter(c => new Date(c.createdAt).getMonth() === new Date().getMonth() && new Date(c.createdAt).getFullYear() === new Date().getFullYear())
    .reduce((sum, c) => sum + c.amount, 0);

  return (
    <AppShell>
      <div className="page active">
        <div className="ref-header">
          <div>
            <h1 className="page-title">Referral Dashboard</h1>
            <p className="page-sub">Earn 50% commission on every payment from your referrals.</p>
          </div>
        </div>

        {/* Referral link card */}
        <div className="ref-link-card">
          <div className="ref-link-label">Your referral link</div>
          <div className="ref-link-row">
            <div className="ref-link-display">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              <span>{referralLink}</span>
            </div>
            <button className={`btn btn-grad btn-sm${copied ? " copied" : ""}`} onClick={copyLink} style={{ whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6 }}>
              {copied ? (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
              ) : (
                <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy link</>
              )}
            </button>
          </div>
          <p className="ref-link-hint">Share this link with friends. When they sign up and subscribe, you earn 50% of their monthly payment.</p>
        </div>

        {/* Stats */}
        <div className="ref-stats-grid">
          <div className="ref-stat-card">
            <div className="ref-stat-value">{referees.length}</div>
            <div className="ref-stat-label">Total referrals</div>
          </div>
          <div className="ref-stat-card">
            <div className="ref-stat-value">{activeReferees}</div>
            <div className="ref-stat-label">Active (paying)</div>
          </div>
          <div className="ref-stat-card">
            <div className="ref-stat-value">{pendingReferees}</div>
            <div className="ref-stat-label">Pending</div>
          </div>
          <div className="ref-stat-card ref-stat-highlight">
            <div className="ref-stat-value">&pound;{(partnerData?.totalEarned || 0).toFixed(2)}</div>
            <div className="ref-stat-label">Total earned</div>
          </div>
          <div className="ref-stat-card">
            <div className="ref-stat-value">&pound;{thisMonthEarnings.toFixed(2)}</div>
            <div className="ref-stat-label">This month</div>
          </div>
          <div className="ref-stat-card">
            <div className="ref-stat-value">50%</div>
            <div className="ref-stat-label">Commission rate</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="ref-tabs">
          <button className={`ref-tab${tab === "overview" ? " active" : ""}`} onClick={() => setTab("overview")}>How it works</button>
          <button className={`ref-tab${tab === "referees" ? " active" : ""}`} onClick={() => setTab("referees")}>My referrals ({referees.length})</button>
          <button className={`ref-tab${tab === "earnings" ? " active" : ""}`} onClick={() => setTab("earnings")}>Earnings ({commissions.length})</button>
        </div>

        {/* How it works */}
        {tab === "overview" && (
          <div className="ref-how-grid">
            <div className="ref-how-card">
              <div className="ref-how-step">1</div>
              <h3>Share your link</h3>
              <p>Send your unique referral link to friends, classmates, or your social media followers.</p>
            </div>
            <div className="ref-how-card">
              <div className="ref-how-step">2</div>
              <h3>They sign up</h3>
              <p>When someone clicks your link and creates a Study-HQ account, they&apos;re tracked as your referral.</p>
            </div>
            <div className="ref-how-card">
              <div className="ref-how-step">3</div>
              <h3>They subscribe</h3>
              <p>Once they choose a plan and start paying, your commission kicks in automatically.</p>
            </div>
            <div className="ref-how-card">
              <div className="ref-how-step ref-how-step-highlight">4</div>
              <h3>You earn 50%</h3>
              <p>You receive 50% of their monthly subscription payment for as long as they stay subscribed.</p>
            </div>
          </div>
        )}

        {/* Referees list */}
        {tab === "referees" && (
          <div className="card">
            {referees.length === 0 ? (
              <div className="empty" style={{ padding: 40 }}>
                <p style={{ marginBottom: 8, fontWeight: 600 }}>No referrals yet</p>
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Share your referral link to start earning commissions.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Plan</th><th>Status</th><th>Joined</th></tr>
                  </thead>
                  <tbody>
                    {referees.map(r => (
                      <tr key={r.id}>
                        <td><strong>{r.name}</strong></td>
                        <td style={{ color: "var(--text-muted)" }}>{r.email}</td>
                        <td><span className="admin-plan-pill" style={{ background: planColor(r.plan) }}>{r.plan}</span></td>
                        <td>
                          <span className={`ref-status ref-status-${r.status}`}>
                            {r.status === "active" ? "Paying" : r.status === "pending" ? "Pending" : "Cancelled"}
                          </span>
                        </td>
                        <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{new Date(r.joinedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Earnings */}
        {tab === "earnings" && (
          <div className="card">
            {commissions.length === 0 ? (
              <div className="empty" style={{ padding: 40 }}>
                <p style={{ marginBottom: 8, fontWeight: 600 }}>No earnings yet</p>
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Commissions appear here when your referrals make payments.</p>
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Date</th><th>Referee</th><th>Payment</th><th>Your commission</th></tr>
                  </thead>
                  <tbody>
                    {commissions.map(c => (
                      <tr key={c.id}>
                        <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                        <td><strong>{c.refereeName}</strong></td>
                        <td>&pound;{c.paymentAmount.toFixed(2)}</td>
                        <td style={{ fontWeight: 700, color: "var(--emerald)" }}>&pound;{c.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function ReferralsPage() {
  return <Suspense><ReferralsInner /></Suspense>;
}
