"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AnimatedNumber from "@/components/AnimatedNumber";

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
  age: number | null;
  is_admin: boolean;
  avatar_url: string | null;
  last_active?: string | null;
}

interface AssignmentRow { id: string; user_id: string; created_at: string; }
interface SessionRow { id: string; user_id: string; duration: number; created_at: string; }
interface NoteRow { id: string; user_id: string; created_at: string; }
interface DeckRow { id: string; user_id: string; created_at: string; }
interface GradeRow { id: string; user_id: string; created_at: string; }

type Tab = "overview" | "analytics" | "users" | "crm" | "activity" | "referrals";

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

function formatDate(d: string) {
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

/* ── Mini bar chart (pure CSS) ── */
function MiniBarChart({ data, color, label }: { data: { label: string; value: number }[]; color: string; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="admin-chart-wrap">
      <div className="admin-chart-label">{label}</div>
      <div className="admin-chart-bars">
        {data.map((d, i) => (
          <div key={i} className="admin-chart-bar-col">
            <div className="admin-chart-bar-value">
              <AnimatedNumber value={d.value} delay={200 + i * 60} duration={900} />
            </div>
            <div
              className="admin-chart-bar bar-animated"
              style={{
                height: `${Math.max((d.value / max) * 120, 4)}px`,
                background: color,
                animationDelay: `${200 + i * 60}ms`,
              }}
            />
            <div className="admin-chart-bar-label">{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Metric card ── */
function MetricCard({ label, value, sub, color, delay = 0 }: { label: string; value: string | number; sub?: string; color?: string; delay?: number }) {
  // Animate only if value is a plain number (not formatted with currency/percent)
  const isPlainNumber = typeof value === "number";
  return (
    <div className="admin-stat-card">
      <div className="admin-stat-label">{label}</div>
      <div className="admin-stat-value" style={color ? { color } : {}}>
        {isPlainNumber ? <AnimatedNumber value={value as number} delay={delay} /> : value}
      </div>
      {sub && <div className="admin-stat-sub">{sub}</div>}
    </div>
  );
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

  // Content data for analytics
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [decks, setDecks] = useState<DeckRow[]>([]);
  const [grades, setGrades] = useState<GradeRow[]>([]);

  // CRM state
  const [crmSearch, setCrmSearch] = useState("");
  const [crmFilter, setCrmFilter] = useState<"all" | "at-risk" | "engaged" | "new" | "churned">("all");
  const [crmNotes, setCrmNotes] = useState<Record<string, string>>({});
  const [crmNoteDraft, setCrmNoteDraft] = useState("");
  const [crmSelectedUser, setCrmSelectedUser] = useState<UserRow | null>(null);

  // Referral state
  const [refCodes, setRefCodes] = useState<{ id: string; code: string; label: string; claimed_by: string | null; claimed_at: string | null; created_at: string }[]>([]);
  const [refPartners, setRefPartners] = useState<{ user_id: string; referral_slug: string; total_earned: number; name: string; email: string; referral_count: number }[]>([]);
  const [newCodeLabel, setNewCodeLabel] = useState("");

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/"); return; }

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
      .select("id, name, email, university, plan, billing, trial_ends_at, created_at, course, year_of_study, age, is_admin, avatar_url")
      .order("created_at", { ascending: false });

    if (allUsers) setUsers(allUsers);

    // Fetch content data for analytics
    const [assignRes, sessRes, noteRes, deckRes, gradeRes] = await Promise.all([
      supabase.from("assignments").select("id, user_id, created_at"),
      supabase.from("study_sessions").select("id, user_id, duration, created_at"),
      supabase.from("notes").select("id, user_id, created_at"),
      supabase.from("decks").select("id, user_id, created_at"),
      supabase.from("grades").select("id, user_id, created_at"),
    ]);
    if (assignRes.data) setAssignments(assignRes.data);
    if (sessRes.data) setSessions(sessRes.data);
    if (noteRes.data) setNotes(noteRes.data);
    if (deckRes.data) setDecks(deckRes.data);
    if (gradeRes.data) setGrades(gradeRes.data);

    // Load CRM notes from localStorage
    try {
      const saved = localStorage.getItem("admin_crm_notes");
      if (saved) setCrmNotes(JSON.parse(saved));
    } catch {}

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
    const { data } = await supabase
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

  function saveCrmNote(userId: string, note: string) {
    const updated = { ...crmNotes, [userId]: note };
    setCrmNotes(updated);
    try { localStorage.setItem("admin_crm_notes", JSON.stringify(updated)); } catch {}
    setActionMsg("Note saved");
    setTimeout(() => setActionMsg(""), 2000);
  }

  /* ── computed stats ── */
  const totalUsers = users.length;
  const activePaid = users.filter(u => ["essential", "plus", "pro"].includes(u.plan)).length;
  const activeTrials = users.filter(u => u.plan === "trial").length;
  const giftedUsers = users.filter(u => u.plan === "gifted").length;
  const cancelledUsers = users.filter(u => u.plan === "cancelled").length;

  const prices: Record<string, number> = { essential: 7.99, plus: 11.99, pro: 15.99 };
  const mrr = users.reduce((sum, u) => sum + (prices[u.plan] || 0), 0);
  const arr = mrr * 12;

  const planCounts: Record<string, number> = {};
  users.forEach(u => { planCounts[u.plan] = (planCounts[u.plan] || 0) + 1; });

  const recentSignups = [...users].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

  // Filtered users for user tab
  const filtered = users.filter(u => {
    const matchesSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesPlan = planFilter === "all" || u.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  /* ── Analytics computations ── */
  const analyticsData = useMemo(() => {
    // Signups over last 30 days (grouped by day)
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 86400000;
    const sevenDaysAgo = now - 7 * 86400000;

    // Daily signups for chart (last 14 days)
    const dailySignups: { label: string; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date(now - i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const count = users.filter(u => {
        const t = new Date(u.created_at).getTime();
        return t >= dayStart.getTime() && t < dayEnd.getTime();
      }).length;
      dailySignups.push({
        label: dayStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        value: count,
      });
    }

    // Weekly signups (last 8 weeks)
    const weeklySignups: { label: string; value: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now - (i + 1) * 7 * 86400000);
      const weekEnd = new Date(now - i * 7 * 86400000);
      const count = users.filter(u => {
        const t = new Date(u.created_at).getTime();
        return t >= weekStart.getTime() && t < weekEnd.getTime();
      }).length;
      weeklySignups.push({
        label: `W${8 - i}`,
        value: count,
      });
    }

    // University breakdown
    const uniCounts: Record<string, number> = {};
    users.forEach(u => {
      const uni = u.university || "Unknown";
      uniCounts[uni] = (uniCounts[uni] || 0) + 1;
    });
    const topUnis = Object.entries(uniCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Conversion rates
    const trialUsers = users.filter(u => u.plan === "trial" || ["essential", "plus", "pro", "cancelled"].includes(u.plan));
    const convertedUsers = users.filter(u => ["essential", "plus", "pro"].includes(u.plan));
    const conversionRate = trialUsers.length > 0 ? ((convertedUsers.length / trialUsers.length) * 100) : 0;

    // Churn
    const churnRate = totalUsers > 0 ? ((cancelledUsers / totalUsers) * 100) : 0;

    // Users gained this week vs last week
    const thisWeekSignups = users.filter(u => new Date(u.created_at).getTime() > sevenDaysAgo).length;
    const lastWeekSignups = users.filter(u => {
      const t = new Date(u.created_at).getTime();
      return t > sevenDaysAgo - 7 * 86400000 && t <= sevenDaysAgo;
    }).length;
    const weekOverWeekGrowth = lastWeekSignups > 0 ? (((thisWeekSignups - lastWeekSignups) / lastWeekSignups) * 100) : thisWeekSignups > 0 ? 100 : 0;

    // Content metrics
    const totalAssignments = assignments.length;
    const totalSessions = sessions.length;
    const totalStudyMins = sessions.reduce((s, sess) => s + (sess.duration || 0), 0);
    const totalNotes = notes.length;
    const totalDecks = decks.length;
    const totalGrades = grades.length;

    // Engagement: users who created content in last 7 days
    const activeContentUsers = new Set<string>();
    [...assignments, ...notes, ...decks, ...grades].forEach(item => {
      if (new Date(item.created_at).getTime() > sevenDaysAgo) activeContentUsers.add(item.user_id);
    });
    sessions.forEach(s => {
      if (new Date(s.created_at).getTime() > sevenDaysAgo) activeContentUsers.add(s.user_id);
    });
    const engagementRate = totalUsers > 0 ? ((activeContentUsers.size / totalUsers) * 100) : 0;

    // Content per user
    const contentPerUser = totalUsers > 0 ? ((totalAssignments + totalNotes + totalDecks + totalGrades) / totalUsers) : 0;

    // Revenue by plan
    const revenueByPlan = Object.entries(planCounts)
      .filter(([p]) => prices[p])
      .map(([p, count]) => ({ plan: p, revenue: count * (prices[p] || 0), count }));

    // Year of study breakdown
    const yearCounts: Record<string, number> = {};
    users.forEach(u => {
      const yr = u.year_of_study || "Not set";
      yearCounts[yr] = (yearCounts[yr] || 0) + 1;
    });

    return {
      dailySignups, weeklySignups, topUnis, conversionRate, churnRate,
      thisWeekSignups, lastWeekSignups, weekOverWeekGrowth,
      totalAssignments, totalSessions, totalStudyMins, totalNotes, totalDecks, totalGrades,
      engagementRate, contentPerUser, activeContentUsers: activeContentUsers.size,
      revenueByPlan, yearCounts,
    };
  }, [users, assignments, sessions, notes, decks, grades, totalUsers, cancelledUsers, planCounts, prices]);

  /* ── CRM computations ── */
  const crmData = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 86400000;

    // Build engagement score per user
    const userEngagement = new Map<string, { score: number; lastActivity: number; contentCount: number; sessionCount: number; lifecycle: string }>();

    users.forEach(u => {
      const userId = u.id;
      const userAssignments = assignments.filter(a => a.user_id === userId);
      const userSessions = sessions.filter(s => s.user_id === userId);
      const userNotes = notes.filter(n => n.user_id === userId);
      const userDecks = decks.filter(d => d.user_id === userId);
      const userGrades = grades.filter(g => g.user_id === userId);

      const allDates = [
        ...userAssignments.map(a => new Date(a.created_at).getTime()),
        ...userSessions.map(s => new Date(s.created_at).getTime()),
        ...userNotes.map(n => new Date(n.created_at).getTime()),
        ...userDecks.map(d => new Date(d.created_at).getTime()),
        ...userGrades.map(g => new Date(g.created_at).getTime()),
      ];
      const lastActivity = allDates.length > 0 ? Math.max(...allDates) : new Date(u.created_at).getTime();
      const contentCount = userAssignments.length + userNotes.length + userDecks.length + userGrades.length;
      const sessionCount = userSessions.length;
      const recentActivity = allDates.filter(d => d > sevenDaysAgo).length;

      // Score: 0-100
      let score = 0;
      score += Math.min(contentCount * 5, 30); // up to 30 for content
      score += Math.min(sessionCount * 3, 20); // up to 20 for sessions
      score += Math.min(recentActivity * 10, 30); // up to 30 for recent activity
      if (["essential", "plus", "pro", "gifted"].includes(u.plan)) score += 20; // paying users

      // Lifecycle
      const daysSinceSignup = (Date.now() - new Date(u.created_at).getTime()) / 86400000;
      const daysSinceActive = (Date.now() - lastActivity) / 86400000;
      let lifecycle = "active";
      if (daysSinceSignup < 7) lifecycle = "new";
      else if (u.plan === "cancelled") lifecycle = "churned";
      else if (daysSinceActive > 14 && u.plan === "trial") lifecycle = "at-risk";
      else if (daysSinceActive > 30) lifecycle = "at-risk";
      else if (score >= 50) lifecycle = "engaged";

      userEngagement.set(userId, { score: Math.min(score, 100), lastActivity, contentCount, sessionCount, lifecycle });
    });

    return userEngagement;
  }, [users, assignments, sessions, notes, decks, grades]);

  // CRM filtered users
  const crmFilteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !crmSearch || u.name.toLowerCase().includes(crmSearch.toLowerCase()) || u.email.toLowerCase().includes(crmSearch.toLowerCase());
      if (!matchesSearch) return false;
      if (crmFilter === "all") return true;
      const eng = crmData.get(u.id);
      return eng?.lifecycle === crmFilter;
    }).sort((a, b) => {
      // Sort by engagement score descending
      const scoreA = crmData.get(a.id)?.score || 0;
      const scoreB = crmData.get(b.id)?.score || 0;
      return scoreB - scoreA;
    });
  }, [users, crmSearch, crmFilter, crmData]);

  if (loading) return (
    <div className="admin-loading">
      <div className="admin-loading-spinner" />
      <p>Loading admin portal...</p>
    </div>
  );

  if (!authorized) return null;

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
          <button className={`admin-nav-item${tab === "analytics" ? " active" : ""}`} onClick={() => { setTab("analytics"); setSelectedUser(null); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Analytics
          </button>
          <button className={`admin-nav-item${tab === "users" ? " active" : ""}`} onClick={() => { setTab("users"); setSelectedUser(null); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Users
          </button>
          <button className={`admin-nav-item${tab === "crm" ? " active" : ""}`} onClick={() => { setTab("crm"); setCrmSelectedUser(null); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            CRM
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
        {actionMsg && <div className="admin-toast">{actionMsg}</div>}

        {/* ── Overview Tab ── */}
        {tab === "overview" && (
          <div className="admin-content">
            <h1 className="admin-page-title">Overview</h1>

            <div className="admin-stat-grid">
              <MetricCard label="Total Users" value={totalUsers} />
              <MetricCard label="Active Paid" value={activePaid} color="#10b981" />
              <MetricCard label="MRR" value={`\u00A3${mrr.toFixed(2)}`} sub={`ARR: \u00A3${arr.toFixed(0)}`} color="#E11D48" />
              <MetricCard label="Active Trials" value={activeTrials} color="#f59e0b" />
              <MetricCard label="Gifted" value={giftedUsers} color="#ec4899" />
              <MetricCard label="Cancelled" value={cancelledUsers} color="#6b7280" />
              <MetricCard label="Conversion Rate" value={`${analyticsData.conversionRate.toFixed(1)}%`} sub="Trial to paid" color="#6366f1" />
              <MetricCard label="This Week" value={`+${analyticsData.thisWeekSignups}`} sub={`${analyticsData.weekOverWeekGrowth >= 0 ? "+" : ""}${analyticsData.weekOverWeekGrowth.toFixed(0)}% vs last week`} color="#10b981" />
            </div>

            {/* Plan distribution */}
            <div className="admin-section">
              <h2 className="admin-section-title">Plan Distribution</h2>
              <div className="admin-plan-bars">
                {Object.entries(planCounts).sort((a, b) => b[1] - a[1]).map(([plan, count]) => (
                  <div key={plan} className="admin-plan-bar-row">
                    <div className="admin-plan-bar-label">
                      <span className="admin-plan-pill" style={{ background: planColor(plan) }}>{plan}</span>
                      <span>{count} user{count !== 1 ? "s" : ""} ({((count / totalUsers) * 100).toFixed(0)}%)</span>
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
                    <tr><th>Name</th><th>Email</th><th>University</th><th>Plan</th><th>Signed up</th></tr>
                  </thead>
                  <tbody>
                    {recentSignups.map(u => (
                      <tr key={u.id} className="admin-row-clickable" onClick={() => { setSelectedUser(u); setTab("users"); }}>
                        <td><strong>{u.name || "\u2014"}</strong></td>
                        <td>{u.email}</td>
                        <td>{u.university || "\u2014"}</td>
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

        {/* ── Analytics Tab ── */}
        {tab === "analytics" && (
          <div className="admin-content">
            <h1 className="admin-page-title">Analytics</h1>
            <p style={{ color: "var(--text-muted)", marginBottom: 28 }}>Growth, engagement, and revenue metrics.</p>

            {/* Growth metrics */}
            <div className="admin-stat-grid">
              <MetricCard label="Signups (7d)" value={analyticsData.thisWeekSignups} sub={`${analyticsData.weekOverWeekGrowth >= 0 ? "\u2191" : "\u2193"} ${Math.abs(analyticsData.weekOverWeekGrowth).toFixed(0)}% WoW`} color="#10b981" />
              <MetricCard label="Conversion Rate" value={`${analyticsData.conversionRate.toFixed(1)}%`} sub="Trial \u2192 Paid" color="#6366f1" />
              <MetricCard label="Churn Rate" value={`${analyticsData.churnRate.toFixed(1)}%`} sub="Cancelled / Total" color={analyticsData.churnRate > 10 ? "#ef4444" : "#10b981"} />
              <MetricCard label="Engagement (7d)" value={`${analyticsData.engagementRate.toFixed(0)}%`} sub={`${analyticsData.activeContentUsers} active users`} color="#f59e0b" />
              <MetricCard label="MRR" value={`\u00A3${mrr.toFixed(2)}`} color="#E11D48" />
              <MetricCard label="ARR" value={`\u00A3${arr.toFixed(0)}`} color="#E11D48" />
            </div>

            {/* Signup chart */}
            <div className="admin-section">
              <h2 className="admin-section-title">Daily Signups (14 days)</h2>
              <MiniBarChart data={analyticsData.dailySignups} color="#6366f1" label="" />
            </div>

            <div className="admin-section">
              <h2 className="admin-section-title">Weekly Signups (8 weeks)</h2>
              <MiniBarChart data={analyticsData.weeklySignups} color="#10b981" label="" />
            </div>

            {/* Revenue breakdown */}
            <div className="admin-section">
              <h2 className="admin-section-title">Revenue by Plan</h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>Plan</th><th>Users</th><th>Price</th><th>Monthly Revenue</th><th>% of MRR</th></tr>
                  </thead>
                  <tbody>
                    {analyticsData.revenueByPlan.map(r => (
                      <tr key={r.plan}>
                        <td><span className="admin-plan-pill" style={{ background: planColor(r.plan) }}>{r.plan}</span></td>
                        <td>{r.count}</td>
                        <td>&pound;{(prices[r.plan] || 0).toFixed(2)}</td>
                        <td style={{ fontWeight: 700 }}>&pound;{r.revenue.toFixed(2)}</td>
                        <td>{mrr > 0 ? ((r.revenue / mrr) * 100).toFixed(0) : 0}%</td>
                      </tr>
                    ))}
                    {analyticsData.revenueByPlan.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No paying users yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Content metrics */}
            <div className="admin-section">
              <h2 className="admin-section-title">Platform Content</h2>
              <div className="admin-stat-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
                <MetricCard label="Assignments" value={analyticsData.totalAssignments} />
                <MetricCard label="Study Sessions" value={analyticsData.totalSessions} />
                <MetricCard label="Study Minutes" value={analyticsData.totalStudyMins.toLocaleString()} />
                <MetricCard label="Notes" value={analyticsData.totalNotes} />
                <MetricCard label="Flashcard Decks" value={analyticsData.totalDecks} />
                <MetricCard label="Grades" value={analyticsData.totalGrades} />
                <MetricCard label="Content / User" value={analyticsData.contentPerUser.toFixed(1)} />
              </div>
            </div>

            {/* University breakdown */}
            <div className="admin-section">
              <h2 className="admin-section-title">Top Universities</h2>
              <div className="admin-plan-bars">
                {analyticsData.topUnis.map(([uni, count]) => (
                  <div key={uni} className="admin-plan-bar-row">
                    <div className="admin-plan-bar-label">
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{uni}</span>
                      <span>{count} user{count !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="admin-plan-bar-track">
                      <div className="admin-plan-bar-fill" style={{ width: `${(count / totalUsers) * 100}%`, background: "#6366f1" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Year of study breakdown */}
            <div className="admin-section">
              <h2 className="admin-section-title">Year of Study</h2>
              <div className="admin-plan-bars">
                {Object.entries(analyticsData.yearCounts).sort((a, b) => b[1] - a[1]).map(([year, count]) => (
                  <div key={year} className="admin-plan-bar-row">
                    <div className="admin-plan-bar-label">
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{year}</span>
                      <span>{count}</span>
                    </div>
                    <div className="admin-plan-bar-track">
                      <div className="admin-plan-bar-fill" style={{ width: `${(count / totalUsers) * 100}%`, background: "#f59e0b" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Users Tab ── */}
        {tab === "users" && !selectedUser && (
          <div className="admin-content">
            <h1 className="admin-page-title">Users <span className="admin-count">{filtered.length}</span></h1>

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

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>University</th><th>Plan</th><th>Billing</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {filtered.map(u => (
                    <tr key={u.id} className="admin-row-clickable" onClick={() => setSelectedUser(u)}>
                      <td>
                        <strong>{u.name || "\u2014"}</strong>
                        {u.is_admin && <span className="admin-badge-sm">Admin</span>}
                      </td>
                      <td>{u.email}</td>
                      <td>{u.university || "\u2014"}</td>
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
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  selectedUser.name ? selectedUser.name.charAt(0).toUpperCase() : "?"
                )}
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
                <div className="admin-detail-row"><span>Age</span><span>{selectedUser.age || "Not set"}</span></div>
                <div className="admin-detail-row"><span>Joined</span><span>{formatDate(selectedUser.created_at)}</span></div>
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
                <h3>Engagement</h3>
                {(() => {
                  const eng = crmData.get(selectedUser.id);
                  if (!eng) return <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No data</p>;
                  return (
                    <>
                      <div className="admin-detail-row">
                        <span>Score</span>
                        <span style={{ fontWeight: 700, color: eng.score >= 50 ? "#10b981" : eng.score >= 25 ? "#f59e0b" : "#ef4444" }}>{eng.score}/100</span>
                      </div>
                      <div className="admin-detail-row"><span>Content items</span><span>{eng.contentCount}</span></div>
                      <div className="admin-detail-row"><span>Study sessions</span><span>{eng.sessionCount}</span></div>
                      <div className="admin-detail-row">
                        <span>Last active</span>
                        <span>{timeAgo(new Date(eng.lastActivity).toISOString())}</span>
                      </div>
                      <div className="admin-detail-row">
                        <span>Lifecycle</span>
                        <span className={`admin-lifecycle-pill ${eng.lifecycle}`}>{eng.lifecycle}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="admin-detail-card">
                <h3>Actions</h3>
                <div className="admin-action-buttons">
                  <button className="admin-action-btn" onClick={() => toggleAdmin(selectedUser.id, selectedUser.is_admin)}>
                    {selectedUser.is_admin ? "Remove admin access" : "Make admin"}
                  </button>
                  <button className="admin-action-btn" onClick={() => { setCrmSelectedUser(selectedUser as UserRow); setTab("crm"); }}>
                    View in CRM
                  </button>
                  <button className="admin-action-btn danger" onClick={() => deleteUser(selectedUser.id)}>
                    Delete user permanently
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CRM Tab ── */}
        {tab === "crm" && !crmSelectedUser && (
          <div className="admin-content">
            <h1 className="admin-page-title">Customer Relationships</h1>
            <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>Track user lifecycle, engagement, and notes.</p>

            {/* CRM Summary */}
            <div className="admin-stat-grid" style={{ marginBottom: 24 }}>
              <MetricCard label="New (7d)" value={users.filter(u => crmData.get(u.id)?.lifecycle === "new").length} color="#3b82f6" />
              <MetricCard label="Engaged" value={users.filter(u => crmData.get(u.id)?.lifecycle === "engaged").length} color="#10b981" />
              <MetricCard label="At Risk" value={users.filter(u => crmData.get(u.id)?.lifecycle === "at-risk").length} color="#f59e0b" />
              <MetricCard label="Churned" value={users.filter(u => crmData.get(u.id)?.lifecycle === "churned").length} color="#ef4444" />
            </div>

            {/* Filters */}
            <div className="admin-filters">
              <input
                type="text"
                className="admin-search"
                placeholder="Search users..."
                value={crmSearch}
                onChange={e => setCrmSearch(e.target.value)}
              />
              <div className="admin-filter-pills">
                {(["all", "new", "engaged", "at-risk", "churned"] as const).map(f => (
                  <button
                    key={f}
                    className={`admin-filter-pill${crmFilter === f ? " active" : ""}`}
                    onClick={() => setCrmFilter(f)}
                  >
                    {f === "all" ? "All" : f === "at-risk" ? "At Risk" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* CRM table */}
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>User</th><th>Plan</th><th>Score</th><th>Lifecycle</th><th>Content</th><th>Last Active</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  {crmFilteredUsers.map(u => {
                    const eng = crmData.get(u.id);
                    const hasNote = !!crmNotes[u.id];
                    return (
                      <tr key={u.id} className="admin-row-clickable" onClick={() => setCrmSelectedUser(u)}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className="admin-crm-avatar">
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                              ) : (
                                <span>{u.name ? u.name.charAt(0).toUpperCase() : "?"}</span>
                              )}
                            </div>
                            <div>
                              <strong>{u.name || "\u2014"}</strong>
                              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className="admin-plan-pill" style={{ background: planColor(u.plan) }}>{u.plan}</span></td>
                        <td>
                          <div className="admin-score-bar">
                            <div className="admin-score-fill" style={{
                              width: `${eng?.score || 0}%`,
                              background: (eng?.score || 0) >= 50 ? "#10b981" : (eng?.score || 0) >= 25 ? "#f59e0b" : "#ef4444"
                            }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{eng?.score || 0}</span>
                        </td>
                        <td><span className={`admin-lifecycle-pill ${eng?.lifecycle || "active"}`}>{eng?.lifecycle || "active"}</span></td>
                        <td>{eng?.contentCount || 0}</td>
                        <td>{eng ? timeAgo(new Date(eng.lastActivity).toISOString()) : "\u2014"}</td>
                        <td>{hasNote ? <span style={{ color: "var(--emerald)" }}>&#x2713;</span> : "\u2014"}</td>
                      </tr>
                    );
                  })}
                  {crmFilteredUsers.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>No users match this filter</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CRM User Detail ── */}
        {tab === "crm" && crmSelectedUser && (
          <div className="admin-content">
            <button className="admin-back" onClick={() => setCrmSelectedUser(null)}>&#8592; All customers</button>

            <div className="admin-user-header">
              <div className="admin-user-avatar">
                {crmSelectedUser.avatar_url ? (
                  <img src={crmSelectedUser.avatar_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                ) : (
                  crmSelectedUser.name ? crmSelectedUser.name.charAt(0).toUpperCase() : "?"
                )}
              </div>
              <div>
                <h1 className="admin-page-title" style={{ marginBottom: 4 }}>
                  {crmSelectedUser.name || "Unnamed"}
                  {(() => {
                    const eng = crmData.get(crmSelectedUser.id);
                    return eng ? <span className={`admin-lifecycle-pill ${eng.lifecycle}`} style={{ marginLeft: 12 }}>{eng.lifecycle}</span> : null;
                  })()}
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{crmSelectedUser.email}</p>
              </div>
            </div>

            <div className="admin-detail-grid">
              {/* Overview */}
              <div className="admin-detail-card">
                <h3>Customer Overview</h3>
                <div className="admin-detail-row"><span>Plan</span><span className="admin-plan-pill" style={{ background: planColor(crmSelectedUser.plan) }}>{crmSelectedUser.plan}</span></div>
                <div className="admin-detail-row"><span>University</span><span>{crmSelectedUser.university || "Not set"}</span></div>
                <div className="admin-detail-row"><span>Course</span><span>{crmSelectedUser.course || "Not set"}</span></div>
                <div className="admin-detail-row"><span>Year</span><span>{crmSelectedUser.year_of_study || "Not set"}</span></div>
                <div className="admin-detail-row"><span>Age</span><span>{crmSelectedUser.age || "Not set"}</span></div>
                <div className="admin-detail-row"><span>Joined</span><span>{formatDate(crmSelectedUser.created_at)}</span></div>
                <div className="admin-detail-row"><span>Billing</span><span>{crmSelectedUser.billing}</span></div>
                {crmSelectedUser.trial_ends_at && (
                  <div className="admin-detail-row"><span>Trial ends</span><span>{formatDate(crmSelectedUser.trial_ends_at)}</span></div>
                )}
              </div>

              {/* Engagement */}
              <div className="admin-detail-card">
                <h3>Engagement Metrics</h3>
                {(() => {
                  const eng = crmData.get(crmSelectedUser.id);
                  if (!eng) return <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No data</p>;
                  const scoreColor = eng.score >= 50 ? "#10b981" : eng.score >= 25 ? "#f59e0b" : "#ef4444";
                  return (
                    <>
                      <div style={{ textAlign: "center", marginBottom: 20 }}>
                        <div style={{
                          width: 80, height: 80, borderRadius: "50%", margin: "0 auto 8px",
                          border: `4px solid ${scoreColor}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 28, fontWeight: 800, color: scoreColor,
                        }}>
                          {eng.score}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Engagement Score</div>
                      </div>
                      <div className="admin-detail-row"><span>Content created</span><span style={{ fontWeight: 700 }}>{eng.contentCount}</span></div>
                      <div className="admin-detail-row"><span>Study sessions</span><span style={{ fontWeight: 700 }}>{eng.sessionCount}</span></div>
                      <div className="admin-detail-row"><span>Last active</span><span>{timeAgo(new Date(eng.lastActivity).toISOString())}</span></div>
                      <div className="admin-detail-row">
                        <span>Risk level</span>
                        <span style={{
                          fontWeight: 700,
                          color: eng.lifecycle === "at-risk" || eng.lifecycle === "churned" ? "#ef4444" : "#10b981"
                        }}>
                          {eng.lifecycle === "at-risk" ? "High" : eng.lifecycle === "churned" ? "Churned" : eng.lifecycle === "new" ? "New user" : "Low"}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Notes */}
              <div className="admin-detail-card">
                <h3>Admin Notes</h3>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>Private notes about this customer (saved locally).</p>
                <textarea
                  className="admin-crm-textarea"
                  placeholder="Add notes about this customer..."
                  value={crmNoteDraft || crmNotes[crmSelectedUser.id] || ""}
                  onChange={e => setCrmNoteDraft(e.target.value)}
                  rows={5}
                />
                <button
                  className="btn btn-grad"
                  style={{ marginTop: 10 }}
                  onClick={() => {
                    saveCrmNote(crmSelectedUser.id, crmNoteDraft || crmNotes[crmSelectedUser.id] || "");
                    setCrmNoteDraft("");
                  }}
                >
                  Save note
                </button>
              </div>

              {/* Quick actions */}
              <div className="admin-detail-card">
                <h3>Quick Actions</h3>
                <div className="admin-action-buttons">
                  <button className="admin-action-btn" onClick={() => {
                    setSelectedUser(crmSelectedUser as UserRow);
                    setTab("users");
                  }}>
                    View full profile
                  </button>
                  <button className="admin-action-btn" onClick={() => {
                    const newPlan = crmSelectedUser.plan === "trial" ? "essential" : crmSelectedUser.plan === "essential" ? "plus" : "pro";
                    changePlan(crmSelectedUser.id, newPlan);
                    setCrmSelectedUser({ ...crmSelectedUser, plan: newPlan });
                  }}>
                    Upgrade plan
                  </button>
                  <button className="admin-action-btn" onClick={() => {
                    changePlan(crmSelectedUser.id, "gifted");
                    setCrmSelectedUser({ ...crmSelectedUser, plan: "gifted" });
                  }}>
                    Gift Pro access
                  </button>
                  <button className="admin-action-btn" onClick={() => toggleAdmin(crmSelectedUser.id, crmSelectedUser.is_admin)}>
                    {crmSelectedUser.is_admin ? "Remove admin" : "Make admin"}
                  </button>
                  <a className="admin-action-btn" href={`mailto:${crmSelectedUser.email}`} style={{ textAlign: "center", textDecoration: "none" }}>
                    Email user
                  </a>
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
                          <td style={{ color: "var(--text-muted)" }}>{c.label || "\u2014"}</td>
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
