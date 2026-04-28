"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Step = "email" | "code" | "password";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setMsg("");
    if (!email.trim()) { setMsg("Enter your email."); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) { setMsg(error.message); return; }
    setMsg("");
    setStep("code");
  }

  async function verifyCode() {
    setMsg("");
    if (code.length < 6) { setMsg("Enter the 6-digit code from the email."); return; }
    setLoading(true);
    // Supabase recovery emails include both a link and a 6-digit code.
    // verifyOtp with type: 'recovery' exchanges the code for a session.
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: "recovery",
    });
    setLoading(false);
    if (error) { setMsg("Code is incorrect or expired. Try resending it."); return; }
    setMsg("");
    setStep("password");
  }

  async function setPassword() {
    setMsg("");
    if (newPwd.length < 6) { setMsg("Password must be at least 6 characters."); return; }
    if (newPwd !== confirm) { setMsg("Passwords don't match."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setLoading(false);
    if (error) { setMsg(error.message); return; }
    // Already signed in via the OTP — go straight to dashboard
    router.replace("/dashboard");
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (step === "email") sendCode();
    else if (step === "code") verifyCode();
    else setPassword();
  }

  return (
    <div className="onboard-wrap" style={{ justifyContent: "center" }}>
      <div className="onboard-right">
        <div className="onboard-form-wrap" onKeyDown={handleKey}>
          <div className="onboard-form-header">
            <h1>Reset password</h1>
            <p>
              {step === "email" && "Enter your email and we'll send you a 6-digit code."}
              {step === "code" && `Enter the 6-digit code we sent to ${email}.`}
              {step === "password" && "Set your new password."}
            </p>
          </div>

          {msg && <p className="onboard-msg error">{msg}</p>}

          {step === "email" && (
            <>
              <div className="onboard-field">
                <label>Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="button" className="onboard-btn-primary" onClick={sendCode} disabled={loading}>
                {loading ? "Sending..." : "Send code"}
              </button>
              <button type="button" className="onboard-btn-link" onClick={() => router.push("/")}>
                Back to sign in
              </button>
            </>
          )}

          {step === "code" && (
            <>
              <div className="onboard-field">
                <label>6-digit code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  autoFocus
                  style={{ letterSpacing: "0.4em", fontSize: 18, textAlign: "center" }}
                />
                <small style={{ display: "block", marginTop: 8, color: "var(--text-muted)" }}>
                  Check your inbox (and spam folder) for the code.
                </small>
              </div>
              <button type="button" className="onboard-btn-primary" onClick={verifyCode} disabled={loading}>
                {loading ? "Verifying..." : "Verify code"}
              </button>
              <button type="button" className="onboard-btn-link" onClick={() => { setStep("email"); setCode(""); setMsg(""); }}>
                Use a different email
              </button>
              <button
                type="button"
                className="onboard-btn-link"
                onClick={() => { setMsg(""); sendCode(); }}
                disabled={loading}
              >
                Resend code
              </button>
            </>
          )}

          {step === "password" && (
            <>
              <div className="onboard-field">
                <label>New password</label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="onboard-field">
                <label>Confirm password</label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <button type="button" className="onboard-btn-primary" onClick={setPassword} disabled={loading}>
                {loading ? "Saving..." : "Set password and sign in"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
