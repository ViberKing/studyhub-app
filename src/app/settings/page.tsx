"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import AppShell, { clearProfileCache } from "@/components/AppShell";
import UniSelector from "@/components/UniSelector";
import { type University } from "@/lib/universities";
import { useGate } from "@/components/GateModal";

function SettingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const supabase = createClient();
  const { gate } = useGate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [university, setUniversity] = useState("st-andrews");
  const [course, setCourse] = useState("");
  const [yearOfStudy, setYearOfStudy] = useState("");
  const [age, setAge] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [plan, setPlan] = useState("trial");
  const [billing, setBilling] = useState("monthly");
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [msg, setMsg] = useState("");
  const [pwdMsg, setPwdMsg] = useState("");
  const [exportMsg, setExportMsg] = useState("");
  const [deleteMsg, setDeleteMsg] = useState("");
  const [avatarMsg, setAvatarMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDemo) {
      router.push("/dashboard?demo=true");
      return;
    }
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/"); return; }
      setEmail(session.user.email || "");
      const { data } = await supabase.from("profiles")
        .select("name, plan, billing, trial_ends_at, university, course, year_of_study, age, avatar_url")
        .eq("id", session.user.id).single();
      if (data) {
        setName(data.name);
        setPlan(data.plan);
        setBilling(data.billing);
        setTrialEndsAt(data.trial_ends_at);
        setUniversity(data.university || "st-andrews");
        setCourse(data.course || "");
        setYearOfStudy(data.year_of_study || "");
        setAge(data.age ? String(data.age) : "");
        setAvatarUrl(data.avatar_url || null);
      }
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDemo]);

  async function saveProfile() {
    setMsg("");
    if (!name.trim()) { setMsg("Name is required."); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setMsg("Not signed in."); return; }

    const { error } = await supabase.from("profiles").update({
      name: name.trim(),
      university,
      course: course.trim(),
      year_of_study: yearOfStudy,
      age: age ? parseInt(age) : null,
    }).eq("id", session.user.id);

    if (error) {
      setMsg("Save failed: " + error.message);
      return;
    }

    // Clear cached profile so header/sidebar reflect the change
    clearProfileCache();

    // Re-read the profile so the form shows the persisted values (not just local state)
    const { data: refreshed } = await supabase
      .from("profiles")
      .select("name, university, course, year_of_study, age, avatar_url")
      .eq("id", session.user.id)
      .single();
    if (refreshed) {
      setName(refreshed.name || "");
      setUniversity(refreshed.university || "st-andrews");
      setCourse(refreshed.course || "");
      setYearOfStudy(refreshed.year_of_study || "");
      setAge(refreshed.age ? String(refreshed.age) : "");
    }

    setMsg("Profile updated.");
    setTimeout(() => setMsg(""), 3000);
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setAvatarMsg("Image must be under 2MB."); return; }
    setUploading(true);
    setAvatarMsg("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUploading(false); return; }

    const fileExt = file.name.split(".").pop();
    const filePath = `${session.user.id}/avatar.${fileExt}`;

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setAvatarMsg("Upload failed. Please try again.");
      setUploading(false);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);

    // Add cache-busting query param
    const url = `${publicUrl}?t=${Date.now()}`;

    // Update profile
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", session.user.id);
    setAvatarUrl(url);
    clearProfileCache();
    setAvatarMsg("Photo updated!");
    setUploading(false);
  }

  async function removeAvatar() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", session.user.id);
    setAvatarUrl(null);
    clearProfileCache();
    setAvatarMsg("Photo removed.");
  }

  async function changePassword() {
    setPwdMsg("");
    if (!newPwd) { setPwdMsg("Please enter a new password."); return; }
    if (newPwd.length < 6) { setPwdMsg("New password must be at least 6 characters."); return; }
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    if (error) { setPwdMsg(error.message); return; }
    setNewPwd("");
    setPwdMsg("Password updated successfully.");
  }

  async function handleDeleteAccount() {
    if (!confirm("Permanently delete your account and all your data? This cannot be undone.")) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("profiles").delete().eq("id", session.user.id);
    if (error) { setDeleteMsg("Failed to delete account. Please try again."); return; }
    await supabase.auth.signOut();
    router.replace("/");
  }

  async function handleExport() {
    if (!gate("export")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const uid = session.user.id;
      const [a, s, d, g, c, n, m, p] = await Promise.all([
        supabase.from("assignments").select("*").eq("user_id", uid),
        supabase.from("study_sessions").select("*").eq("user_id", uid),
        supabase.from("decks").select("*").eq("user_id", uid),
        supabase.from("grades").select("*").eq("user_id", uid),
        supabase.from("citations").select("*").eq("user_id", uid),
        supabase.from("notes").select("*").eq("user_id", uid),
        supabase.from("modules").select("*").eq("user_id", uid),
        supabase.from("research_projects").select("*").eq("user_id", uid),
      ]);
      const blob = new Blob([JSON.stringify({ assignments: a.data, sessions: s.data, decks: d.data, grades: g.data, citations: c.data, notes: n.data, modules: m.data, projects: p.data }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `study-hq-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setExportMsg("Export failed. Please try again.");
    }
  }

  if (loading) return null;

  const daysLeft = trialEndsAt ? Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86400000) : 0;
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
  const prices: Record<string, number> = { essential: 7.99, plus: 11.99, pro: 15.99 };
  const initial = name ? name.charAt(0).toUpperCase() : "U";

  return (
    <AppShell>
      <div className="page active">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Manage your account, plan, and data.</p>

        {/* Profile picture */}
        <div className="setting-card">
          <h3>Profile picture</h3>
          <p className="setting-desc">Upload a photo so other students can recognise you.</p>
          <div className="avatar-upload-row">
            <div className="avatar-preview">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="avatar-upload-actions">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/png,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={handleAvatarUpload}
              />
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload photo"}
              </button>
              {avatarUrl && (
                <button className="btn btn-danger btn-sm" onClick={removeAvatar}>Remove</button>
              )}
            </div>
          </div>
          {avatarMsg && <p style={{ fontSize: 13, color: avatarMsg.includes("failed") || avatarMsg.includes("under") ? "var(--red)" : "var(--emerald)", marginTop: 8 }}>{avatarMsg}</p>}
          <small style={{ color: "var(--text-subtle)", display: "block", marginTop: 8 }}>Max 2MB. JPG, PNG, WebP, or GIF.</small>
        </div>

        {/* Profile info */}
        <div className="setting-card">
          <h3>Profile</h3>
          <p className="setting-desc">Your details as they appear throughout Study-HQ.</p>
          <div className="field"><label>Full name</label><input type="text" value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="field"><label>Email address</label><input type="email" value={email} disabled style={{ opacity: 0.6, cursor: "not-allowed" }} /><small>Email cannot be changed.</small></div>
          <div className="field">
            <label>University</label>
            <UniSelector value={university} onChange={(uni: University) => setUniversity(uni.id)} />
          </div>
          <div className="field"><label>Course / Subject</label><input type="text" value={course} onChange={e => setCourse(e.target.value)} placeholder="e.g. International Relations" /></div>
          <div className="grid grid-2">
            <div className="field">
              <label>Year of study</label>
              <select value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)}>
                <option value="">Select...</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
                <option value="5th Year">5th Year</option>
                <option value="Masters">Masters</option>
                <option value="PhD">PhD</option>
              </select>
            </div>
            <div className="field">
              <label>Age</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 20" min={16} max={99} />
            </div>
          </div>
          {msg && <p style={{ fontSize: 13, color: msg.includes("updated") ? "var(--emerald)" : "var(--red)", marginBottom: 12 }}>{msg}</p>}
          <button className="btn btn-grad" onClick={saveProfile}>Save changes</button>
        </div>

        {/* Plan & billing */}
        <div className="setting-card">
          <h3>Plan &amp; billing</h3>
          <p className="setting-desc">Your current Study-HQ subscription.</p>
          {plan === "trial" ? (
            <div className="plan-status-card">
              {daysLeft > 0 ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 14 }}>
                    <div className="trial-days-big">{daysLeft}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>days left in your free trial</div>
                      <small>Choose a plan to keep using Study-HQ after your trial ends.</small>
                    </div>
                  </div>
                  <button className="btn btn-grad" onClick={() => router.push("/pricing")}>Choose a plan</button>
                </>
              ) : (
                <>
                  <div className="badge badge-red" style={{ marginBottom: 12 }}>Trial expired</div>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>Your free trial has ended. Choose a plan to continue.</p>
                  <button className="btn btn-grad" onClick={() => router.push("/pricing")}>Choose a plan</button>
                </>
              )}
            </div>
          ) : plan === "cancelled" ? (
            <div className="plan-status-card cancelled">
              <div className="badge badge-gray" style={{ marginBottom: 12 }}>Cancelled</div>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>Your subscription has been cancelled. Reactivate anytime.</p>
              <button className="btn btn-grad" onClick={() => router.push("/pricing")}>Reactivate</button>
            </div>
          ) : plan === "gifted" ? (
            <div className="plan-status-card">
              <div className="row" style={{ gap: 8, alignItems: "center", marginBottom: 14 }}>
                <span className="tier-pill tier-pro">Pro</span>
                <span className="badge badge-green">Gifted</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>You have full Pro access — no billing required. Enjoy Study-HQ!</p>
            </div>
          ) : (
            <div className="plan-status-card">
              <div className="row between" style={{ marginBottom: 14 }}>
                <div>
                  <div className="row" style={{ gap: 8, alignItems: "center" }}>
                    <span className={`tier-pill tier-${plan}`}>{planLabel}</span>
                    <span className="badge badge-green">Active</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>&pound;{(prices[plan] || 0).toFixed(2)}/month &middot; billed {billing}</div>
                </div>
              </div>
              <div className="row">
                <button className="btn btn-ghost" onClick={() => router.push("/pricing")}>Change plan</button>
                <button className="btn btn-danger" disabled title="Subscription management coming soon" style={{ opacity: 0.5, cursor: "not-allowed" }}>Cancel subscription</button>
              </div>
            </div>
          )}
        </div>

        <div className="setting-card">
          <h3>Security</h3>
          <p className="setting-desc">Change your password to keep your account secure.</p>
          <div className="field"><label>New password</label><input type="password" placeholder="At least 6 characters" value={newPwd} onChange={e => setNewPwd(e.target.value)} /></div>
          {pwdMsg && <p style={{ fontSize: 13, color: pwdMsg.includes("success") ? "var(--emerald)" : "var(--red)", marginBottom: 12 }}>{pwdMsg}</p>}
          <button className="btn btn-grad" onClick={changePassword}>Update password</button>
        </div>

        <div className="setting-card">
          <h3>Your data</h3>
          <p className="setting-desc">Export everything as JSON or permanently delete your account.</p>
          {(exportMsg || deleteMsg) && <p style={{ fontSize: 13, color: "var(--red)", marginBottom: 12 }}>{exportMsg || deleteMsg}</p>}
          <div className="row">
            <button className="btn btn-ghost" onClick={handleExport}>Download my data</button>
            <button className="btn btn-danger" onClick={handleDeleteAccount}>Delete account</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function SettingsPage() {
  return <Suspense><SettingsInner /></Suspense>;
}
