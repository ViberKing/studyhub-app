"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Supabase sends the user here with a session already set via the URL hash
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // User arrived via reset link — they can now set a new password
      }
    });
  }, []);

  async function handleReset() {
    setMsg("");
    if (password.length < 6) { setMsg("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setMsg("Passwords don't match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setMsg(error.message); return; }
    alert("Password updated! You can now sign in.");
    router.replace("/");
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Reset password</h1>
        <p className="sub" style={{ marginBottom: 24 }}>Enter your new password below.</p>
        {msg && <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 14 }}>{msg}</p>}
        <div className="field">
          <label>New password</label>
          <input type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="field">
          <label>Confirm password</label>
          <input type="password" placeholder="Re-enter password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <button type="button" className="btn btn-grad btn-block" onClick={handleReset} disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </button>
      </div>
    </div>
  );
}
