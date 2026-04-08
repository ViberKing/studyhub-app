"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Sign in fields
  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");

  // Sign up fields
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  // Forgot password
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");

  const router = useRouter();
  const supabase = createClient();

  // Auto-redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
      else setCheckingSession(false);
    });
  }, []);

  if (checkingSession) return null;

  async function handleSignIn() {
    setError("");
    if (!signinEmail || !signinPassword) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: signinEmail,
      password: signinPassword,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.replace("/dashboard");
  }

  async function handleSignUp() {
    setError("");
    if (!signupName || !signupEmail || !signupPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (signupPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (signupPassword !== signupConfirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: { data: { name: signupName } },
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.replace("/dashboard");
  }

  async function handleForgotPassword() {
    setForgotMsg("");
    if (!forgotEmail) { setForgotMsg("Enter your email address."); return; }
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      forgotEmail,
      { redirectTo: `${window.location.origin}/reset-password` }
    );
    if (err) { setForgotMsg(err.message); return; }
    setForgotMsg("Check your email for a password reset link.");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (showForgot) handleForgotPassword();
      else if (authMode === "signin") handleSignIn();
      else handleSignUp();
    }
  }

  function enterDemoMode() {
    router.push("/dashboard?demo=true");
  }

  return (
    <div className="login-wrap">
      <div className="login-card" onKeyDown={handleKeyDown}>
        <div className="login-logo">
          <svg width="32" height="32" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>

        <h1>
          Welcome to Study
          <span style={{ background: "var(--grad)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Hub</span>
        </h1>
        <p className="sub">Your AI-powered academic companion</p>
        <p className="tag">Designed by students, for students.</p>

        {error && (
          <p style={{ color: "var(--red)", fontSize: "13px", marginBottom: "14px", textAlign: "left" }}>{error}</p>
        )}

        {showForgot ? (
          <div>
            <div className="field">
              <label>Email address</label>
              <input type="email" placeholder="you@example.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
            </div>
            {forgotMsg && (
              <p style={{ fontSize: "13px", marginBottom: "14px", color: forgotMsg.includes("Check") ? "var(--emerald)" : "var(--red)" }}>{forgotMsg}</p>
            )}
            <button type="button" className="btn btn-grad btn-block" onClick={handleForgotPassword}>Send reset link</button>
            <button type="button" className="login-link" onClick={() => { setShowForgot(false); setForgotMsg(""); }}>Back to sign in</button>
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button className={`auth-tab${authMode === "signin" ? " active" : ""}`} onClick={() => { setAuthMode("signin"); setError(""); }}>Sign in</button>
              <button className={`auth-tab${authMode === "signup" ? " active" : ""}`} onClick={() => { setAuthMode("signup"); setError(""); }}>Create account</button>
            </div>

            {authMode === "signin" && (
              <div>
                <div className="field">
                  <label>Email address</label>
                  <input type="email" placeholder="you@example.com" value={signinEmail} onChange={(e) => setSigninEmail(e.target.value)} />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input type="password" placeholder="••••••••" value={signinPassword} onChange={(e) => setSigninPassword(e.target.value)} />
                </div>
                <button type="button" className="btn btn-grad btn-block" onClick={handleSignIn} disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </button>
                <button type="button" className="login-link" onClick={() => setShowForgot(true)}>Forgot password?</button>
              </div>
            )}

            {authMode === "signup" && (
              <div>
                <div className="field">
                  <label>Full name</label>
                  <input type="text" placeholder="Your name" value={signupName} onChange={(e) => setSignupName(e.target.value)} />
                </div>
                <div className="field">
                  <label>Email address</label>
                  <input type="email" placeholder="you@example.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input type="password" placeholder="At least 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} />
                </div>
                <div className="field">
                  <label>Confirm password</label>
                  <input type="password" placeholder="Re-enter password" value={signupConfirm} onChange={(e) => setSignupConfirm(e.target.value)} />
                </div>
                <button type="button" className="btn btn-grad btn-block" onClick={handleSignUp} disabled={loading}>
                  {loading ? "Creating account…" : "Start 7-day free trial"}
                </button>
              </div>
            )}

            <div className="login-divider">or</div>

            <button type="button" className="demo-cool" onClick={enterDemoMode}>
              <span className="demo-sparkle">✦</span>
              <span>Try the live demo</span>
              <span className="demo-arrow">→</span>
            </button>

            <button type="button" className="login-link" onClick={enterDemoMode}>View pricing</button>

            <p className="small-print">7-day free trial · No credit card required · Cancel anytime</p>
          </>
        )}
      </div>
    </div>
  );
}
