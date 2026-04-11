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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // User arrived via reset link — they can now set a new password
      }
    });
    return () => subscription.unsubscribe();
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
    <div className="onboard-wrap" style={{ justifyContent: "center" }}>
      <div className="onboard-right">
        <div className="onboard-form-wrap">
          <div className="onboard-form-header">
            <h1>Reset password</h1>
            <p>Enter your new password below.</p>
          </div>
          {msg && <p className={`onboard-msg error`}>{msg}</p>}
          <div className="onboard-field">
            <label>New password</label>
            <input type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="onboard-field">
            <label>Confirm password</label>
            <input type="password" placeholder="Re-enter password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <button type="button" className="onboard-btn-primary" onClick={handleReset} disabled={loading}>
            {loading ? "Updating…" : "Update password"}
          </button>
          <button type="button" className="onboard-btn-link" onClick={() => router.push("/")}>
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  );
}
