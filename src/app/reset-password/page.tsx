"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Two ways to land here:
  //   1) From the magic-link in the recovery email — Supabase sets a session via URL hash
  //   2) From the in-app /forgot-password OTP flow — session already established
  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setHasSession(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setHasSession(true);
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleReset() {
    setMsg("");
    if (password.length < 6) { setMsg("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setMsg("Passwords don't match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setMsg(error.message); return; }
    setSuccess(true);
  }

  return (
    <div className="onboard-wrap" style={{ justifyContent: "center" }}>
      <div className="onboard-right">
        <div className="onboard-form-wrap">
          <div className="onboard-form-header">
            <h1>Reset password</h1>
            <p>{success ? "Your password has been updated." : "Enter your new password below."}</p>
          </div>
          {!hasSession && !success ? (
            <>
              <p className="onboard-msg error">
                This reset link is invalid or has expired. Use the 6-digit code instead — it&apos;s in the same email.
              </p>
              <button type="button" className="onboard-btn-primary" onClick={() => router.replace("/forgot-password")}>
                Use code instead
              </button>
              <button type="button" className="onboard-btn-link" onClick={() => router.push("/")}>
                Back to sign in
              </button>
            </>
          ) : success ? (
            <>
              <p className="onboard-msg" style={{ color: "var(--emerald)" }}>Password updated! You can now sign in.</p>
              <button type="button" className="onboard-btn-primary" onClick={() => router.replace("/dashboard")}>
                Continue to dashboard
              </button>
            </>
          ) : (
            <>
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
                {loading ? "Updating..." : "Update password"}
              </button>
              <button type="button" className="onboard-btn-link" onClick={() => router.push("/")}>
                Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
