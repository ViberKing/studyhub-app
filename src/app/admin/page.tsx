"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

/* ── types ── */
interface UserRow {
  id: string;
  name: string;
  email: string;
  university: string;
  plan: string;
  billing: string;
  trial_ends_at: string | null;
  created_at: string;
  course: string;
  year_of_study: string;
  is_admin: boolean;
}

type Tab = "overview" | "users" | "activity" | "referrals";

/* ── helpers ── */
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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

export default function AdminPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [actionMsg, setActionMsg] = useState("");

  // Referral state
  const [refCodes, setRefCodes] = useState<{ id: string; code: string; label: string; claimed_by: string | null; claimed_at: string | null; created_at: string }[]>([]);
  const [refPartners, setRefPartners] = useState<{ user_id: string; referral_slug: string; total_earned: number; name: string; email: string; referral_count: number }[]>([]);
  const [newCodeLabel, setNewCodeLabel] = useState("");

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/"); return; }

    // Check admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single();

    if (!profile?.is_admin) { router.replace("/dashboard"); return; }
    setAuthorized(true);

    // Fetch all users
    const { data: allUsers } = await supabase
      .from("profiles")
      .select("id, name, email, university, plan, billing, trial_ends_at, created_at, course, year_of_study, is_admin")
      .order("created_at", { ascending: false });

    if (allUsers) setUsers(allUsers);

    // Fetch referral data
    const { data: codes } = await supabase
      .from("referral_access_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (codes) setRefCodes(codes);

    const { data: partners } = await supabase
      .from("referral_partners")
      .select("user_id, referral_slug, total_earned")
      .order("activated_at", { ascending: false });

    if (partners && allUsers) {
      // Enrich with user info and referral counts
      const userMap = new Map(allUsers.map(u => [u.id, u]));
      const { data: referralCounts } = await supabase
        .from("referrals")
        .select("referrer_id");

      const countMap = new Map<string, number>();
      referralCounts?.forEach(r => {
        countMap.set(r.referrer_id, (countMap.get(r.referrer_id) || 0) + 1);
      });

      setRefPartners(partners.map(p => ({
        ...p,
        name: userMap.get(p.user_id)?.name || "Unknown",
        email: userMap.get(p.user_id)?.email || "",
        referral_count: countMap.get(p.user_id) || 0,
      })));
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── admin actions ── */
  async function changePlan(userId: string, newPlan: string) {
    await supabase.from("profiles").update({ plan: newPlan }).eq("id", userId);
    setActionMsg(`Plan changed to ${newPlan}`);
    setUsers(users.map(u => u.id === userId ? { ...u, plan: newPlan } : u));
    if (selectedUser?.id === userId) setSelectedUser({ ...selectedUser, plan: newPlan });
    setTimeout(() => setActionMsg(""), 3000);
  }

  async function toggleAdmin(userId: string, current: boolean) {
    await supabase.from("profiles").update({ is_admin: !current }).eq("id", userId);
    setUsers(users.map(u => u.id === userId ? { ...u, is_admin: !current } : u));
    if (selectedUser?.id === userId) setSelectedUser({ ...selectedUser, is_admin: !current });
    setActionMsg(!current ? "Admin access granted" : "Admin access removed");
    setTimeout(() => setActionMsg(""), 3000);
  }

  async function generateRefCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    const { data, error } = await supabase
      .from("referral_access_codes")
      .insert({ code, label: newCodeLabel.trim() || null })
      .select()
      .single();
    if (data) {
      setRefCodes([data, ...refCodes]);
      setNewCodeLabel("");
      setActionMsg(`Access code created: ${code}`);
      setTimeout(() => setActionMsg(""), 5000);
    } else {
      setActionMsg("Failed to create code");
      setTimeout(() => setActionMsg(""), 3000);
    }
  }

  async function deleteRefCode(id: string) {
    await supabase.from("referral_access_codes").delete().eq("id", id);
    setRefCodes(refCodes.filter(c => c.id !== id));
    setActionMsg("Code deleted");
    setTimeout(() => setActionMsg(""), 3000);
  }

  async function deleteUser(userId: string) {
    if (!confirm(`Permanently delete this user and all their data?`)) return;
    await supabase.from("profiles").delete().eq("id", userId);
    setUsers(users.filter(u => u.id !== userId));
    setSelectedUser(null);
    setActionMsg("User deleted");
    setTimeout(() => setActionMsg(""), 3000);
  }

  if (loading) return (
    <div className="admin-loading">
      <div className="admin-loading-spinner" />
      <p>Loading admin portal...</p>
    </div>
  );

  if (!authorized) return null;

  /* ── computed stats ── */
  const totalUsers = users.length;
  const activePaid = users.filter(u => ["essential", "plus", "pro"].includes(u.plan)).length;
  const activeTrials = users.filter(u => u.plan === "trial").length;
  const giftedUsers = users.filter(u => u.plan === "gifted").length;
  const cancelledUsers = users.filter(u => u.plan === "cancelled").length;

  const prices: Record<string, number> = { essential: 7.99, plus: 11.99, pro: 15.99 };
  const mrr = users.reduce((sum, u) => sum + (prices[u.plan] || 0), 0);

  const planCounts: Record<string, number> = {};
  users.forEach(u => { planCounts[u.plan] = (planCounts[u.plan] || 0) + 1; });

  const recentSignups = [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

  // Filtered users for user tab
  const filtered = users.filter(u => {
    const matchesSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "all" || u.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  return (
    <div className="admin-shell">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="admin-logo">
          <svg width="22" height="22" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <span>Study-HQ Admin</span>
        </div>

        <nav className="admin-nav">
          <button className={`admin-nav-item${tab === "overview" ? " active" : ""}`} onClick={() => { setTab("overview"); setSelectedUser(null); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Overview
          </button>
          <button className={`admin-nav-item${tab === "users" ? " active" : ""}`} onClick={() => { setTab("users"); setSelectedUser(null); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Users
          </button>
          <button className={`admin-nav-item${tab === "activity" ? " active" : ""}`} onClick={() => { setTab("activity"); setSelectedUser(null); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            Activity
          </button>
          <button className={`admin-nav-item${tab === "referrals" ? " active" : ""}`} onClick={() => { setTab("referrals"); setSelectedUser(null); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Referrals
          </button>
        </nav>

        <div className="admin-nav-bottom">
          <button className="admin-nav-item" onClick={() => router.push("/dashboard")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back to app
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="admin-main">
        {/* Action toast */}
        {actionMsg && (
          <div className="admin-toast">{actionMsg}</div>
        )}

        {/* ── Overview Tab ── */}
        {tab === "overview" && (
          <div className="admin-content">
            <h1 className="admin-page-title">Overview</h1>

            {/* Stat cards */}
            <div className="admin-stat-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-label">Total Users</div>
                <div className="admin-stat-value">{totalUsers}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Active Paid</div>
                <div className="admin-stat-value">{activePaid}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">MRR</div>
                <div className="admin-stat-value">&pound;{mrr.toFixed(2)}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Active Trials</div>
                <div className="admin-stat-value">{activeTrials}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Gifted</div>
                <div className="admin-stat-value">{giftedUsers}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Cancelled</div>
                <div className="admin-stat-value">{cancelledUsers}</div>
              </div>
            </div>

            {/* Plan distribution */}
            <div className="admin-section">
              <h2 className="admin-section-title">Plan Distribution</h2>
              <div className="admin-plan-bars">
                {Object.entries(planCounts).sort((a, b) => b[1] - a[1]).map(([plan, count]) => (
                  <div key={plan} className="admin-plan-bar-row">
                    <div className="admin-plan-bar-label">
                      <span className="admin-plan-pill" style={{ background: planColor(plan) }}>{plan}</span>
                      <span>{count} user{count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="admin-plan-bar-track">
                      <div className="admin-plan-bar-fill" style={{ width: `${(count / totalUsers) * 100}%`, background: planColor(plan) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent signups */}
            <div className="admin-section">
              <h2 className="admin-section-title">Recent Signups</h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Plan</th><th>Signed up</th></tr>
                  </thead>
                  <tbody>
                    {recentSignups.map(u => (
                      <tr key={u.id} className="admin-row-clickable" onClick={() => { setSelectedUser(u); setTab("users"); }}>
                        <td><strong>{u.name || "—"}</strong></td>
                        <td>{u.email}</td>
                        <td><span className="admin-plan-pill" style={{ background: planColor(u.plan) }}>{u.plan}</span></td>
                        <td>{timeAgo(u.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Users Tab ── */}
        {tab === "users" && !selectedUser && (
          <div className="admin-content">
            <h1 className="admin-page-title">Users <span className="admin-count">{filtered.length}</span></h1>

            {/* Filters */}
            <div className="admin-filters">
              <input
                type="text"
                className="admin-search"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <select className="admin-select" value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
                <option value="all">All plans</option>
                <option value="trial">Trial</option>
                <option value="essential">Essential</option>
                <option value="plus">Plus</option>
                <option value="pro">Pro</option>
                <option value="gifted">Gifted</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* User table */}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>University</th><th>Plan</th><th>Billing</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} className="admin-row-clickable" onClick={() => setSelectedUser(u)}>
                      <td>
                        <strong>{u.name || "—"}</strong>
                        {u.is_admin && <span className="admin-badge-sm">Admin</span>}
                      </td>
                      <td>{u.email}</td>
                      <td>{u.university || "—"}</td>
                      <td><span className="admin-plan-pill" style={{ background: planColor(u.plan) }}>{u.plan}</span></td>
                      <td>{u.billing}</td>
                      <td>{timeAgo(u.created_at)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── User Detail ── */}
        {tab === "users" && selectedUser && (
          <div className="admin-content">
            <button className="admin-back" onClick={() => setSelectedUser(null)}>&#8592; All users</button>

            <div className="admin-user-header">
              <div className="admin-user-avatar">
                {selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : "?"}
              </div>
              <div>
                <h1 className="admin-page-title" style={{ marginBottom: 4 }}>
                  {selectedUser.name || "Unnamed"}
                  {selectedUser.is_admin && <span className="admin-badge-sm" style={{ marginLeft: 10 }}>Admin</span>}
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{selectedUser.email}</p>
              </div>
            </div>

            <div className="admin-detail-grid">
              <div className="admin-detail-card">
                <h3>Profile</h3>
                <div className="admin-detail-row"><span>University</span><span>{selectedUser.university || "Not set"}</span></div>
                <div className="admin-detail-row"><span>Course</span><span>{selectedUser.course || "Not set"}</span></div>
                <div className="admin-detail-row"><span>Year</span><span>{selectedUser.year_of_study || "Not set"}</span></div>
                <div className="admin-detail-row"><span>Joined</span><span>{new Date(selectedUser.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span></div>
              </div>

              <div className="admin-detail-card">
                <h3>Subscription</h3>
                <div className="admin-detail-row">
                  <span>Plan</span>
                  <span className="admin-plan-pill" style={{ background: planColor(selectedUser.plan) }}>{selectedUser.plan}</span>
                </div>
                <div className="admin-detail-row"><span>Billing</span><span>{selectedUser.billing}</span></div>
                {selectedUser.trial_ends_at && (
                  <div className="admin-detail-row"><span>Trial ends</span><span>{new Date(selectedUser.trial_ends_at).toLocaleDateString("en-GB")}</span></div>
                )}

                <div className="admin-action-group">
                  <label className="admin-label">Change plan</label>
                  <div className="admin-action-row">
                    {["trial", "essential", "plus", "pro", "gifted", "cancelled"].map(p => (
                      <button
                        key={p}
                        className={`admin-plan-btn${selectedUser.plan === p ? " active" : ""}`}
                        style={{ borderColor: planColor(p), color: selectedUser.plan === p ? "#fff" : planColor(p), background: selectedUser.plan === p ? planColor(p) : "transparent" }}
                        onClick={() => changePlan(selectedUser.id, p)}
                        disabled={selectedUser.plan === p}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="admin-detail-card">
                <h3>Actions</h3>
                <div className="admin-action-buttons">
                  <button className="admin-action-btn" onClick={() => toggleAdmin(selectedUser.id, selectedUser.is_admin)}>
                    {selectedUser.is_admin ? "Remove admin access" : "Make admin"}
                  </button>
                  <button className="admin-action-btn danger" onClick={() => deleteUser(selectedUser.id)}>
                    Delete user permanently
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Referrals Tab ── */}
        {tab === "referrals" && (
          <div className="admin-content">
            <h1 className="admin-page-title">Referral Programme</h1>
            <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>Manage access codes and view referral partners.</p>

            {/* Generate code */}
            <div className="admin-section">
              <h2 className="admin-section-title">Generate Access Code</h2>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 20 }}>
                <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                  <label>Label (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. For Jack, Instagram campaign"
                    value={newCodeLabel}
                    onChange={e => setNewCodeLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") generateRefCode(); }}
                  />
                </div>
                <button className="btn btn-grad" onClick={generateRefCode} style={{ height: 42, whiteSpace: "nowrap" }}>
                  Generate code
                </button>
              </div>
            </div>

            {/* Existing codes */}
            <div className="admin-section">
              <h2 className="admin-section-title">Access Codes ({refCodes.length})</h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Code</th><th>Label</th><th>Status</th><th>Created</th><th></th></tr>
                  </thead>
                  <tbody>
                    {refCodes.map(c => {
                      const claimer = c.claimed_by ? users.find(u => u.id === c.claimed_by) : null;
                      return (
                        <tr key={c.id}>
                          <td><code style={{ background: "var(--bg)", padding: "4px 10px", borderRadius: 6, fontWeight: 700, fontSize: 14, letterSpacing: "0.08em" }}>{c.code}</code></td>
                          <td style={{ color: "var(--text-muted)" }}>{c.label || "—"}</td>
                          <td>
                            {c.claimed_by ? (
                              <span style={{ color: "var(--emerald)", fontSize: 13, fontWeight: 600 }}>Claimed by {claimer?.name || claimer?.email || "unknown"}</span>
                            ) : (
                              <span style={{ color: "var(--amber)", fontSize: 13, fontWeight: 600 }}>Available</span>
                            )}
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: 13 }}>{new Date(c.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</td>
                          <td>
                            {!c.claimed_by && (
                              <button className="btn btn-danger btn-sm" onClick={() => deleteRefCode(c.id)} style={{ padding: "4px 10px", fontSize: 12 }}>Delete</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {refCodes.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No access codes yet. Generate one above.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Partners */}
            <div className="admin-section">
              <h2 className="admin-section-title">Active Partners ({refPartners.length})</h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Partner</th><th>Email</th><th>Slug</th><th>Referrals</th><th>Total earned</th></tr>
                  </thead>
                  <tbody>
                    {refPartners.map(p => (
                      <tr key={p.user_id}>
                        <td><strong>{p.name}</strong></td>
                        <td style={{ color: "var(--text-muted)" }}>{p.email}</td>
                        <td><code style={{ background: "var(--bg)", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>{p.referral_slug}</code></td>
                        <td>{p.referral_count}</td>
                        <td style={{ fontWeight: 700, color: "var(--emerald)" }}>&pound;{p.total_earned.toFixed(2)}</td>
                      </tr>
                    ))}
                    {refPartners.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No active partners yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Activity Tab ── */}
        {tab === "activity" && (
          <div className="admin-content">
            <h1 className="admin-page-title">Activity</h1>
            <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>Recent account activity across Study-HQ.</p>

            <div className="admin-activity-list">
              {recentSignups.map(u => {
                const isNew = (Date.now() - new Date(u.created_at).getTime()) < 86400000 * 7;
                return (
                  <div key={u.id} className="admin-activity-item">
                    <div className={`admin-activity-dot${isNew ? " new" : ""}`} />
                    <div className="admin-activity-content">
                      <div><strong>{u.name || "Unknown"}</strong> signed up</div>
                      <div className="admin-activity-meta">
                        {u.email} &middot; <span className="admin-plan-pill" style={{ background: planColor(u.plan) }}>{u.plan}</span> &middot; {timeAgo(u.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
              {users.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No activity yet.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
