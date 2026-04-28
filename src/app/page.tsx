"use client";

import { Suspense, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

const features = [
  { icon: "📅", title: "Smart Calendar", desc: "Track deadlines, exams & study sessions in one beautiful view" },
  { icon: "🃏", title: "5 Flashcard Modes", desc: "Learn, match, test & review — powered by spaced repetition" },
  { icon: "📝", title: "Essay Builder", desc: "Structure, write & polish your essays with built-in tools" },
  { icon: "⏱", title: "Study Timer", desc: "Pomodoro-style focus sessions with session tracking" },
  { icon: "📊", title: "Analytics", desc: "Visualise your study habits and track your progress" },
  { icon: "🎉", title: "Events & Discounts", desc: "Find local events and save with student deals" },
];

const stats = [
  { value: "15+", label: "Study tools" },
  { value: "5", label: "Flashcard modes" },
  { value: "Free", label: "7-day trial" },
  { value: "∞", label: "Potential" },
];

function LoginPageInner() {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeFeature, setActiveFeature] = useState(0);

  const [signinEmail, setSigninEmail] = useState("");
  const [signinPassword, setSigninPassword] = useState("");

  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Capture referral slug from URL (?ref=slug)
  const refSlug = searchParams.get("ref") || "";

  useEffect(() => {
    // Store referral slug in sessionStorage so it persists through signup
    if (refSlug) sessionStorage.setItem("ref_slug", refSlug);
  }, [refSlug]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
      else setCheckingSession(false);
    });
  }, []);

  // Auto-rotate features
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  if (checkingSession) return null;

  async function handleSignIn() {
    setError("");
    if (!signinEmail || !signinPassword) { setError("Please enter your email and password."); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: signinEmail, password: signinPassword });
    setLoading(false);
    if (err) { setError(err.message); return; }
    router.replace("/dashboard");
  }

  async function handleSignUp() {
    setError("");
    if (!signupName || !signupEmail || !signupPassword) { setError("Please fill in all fields."); return; }
    if (signupPassword.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (signupPassword !== signupConfirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    const { data: signUpData, error: err } = await supabase.auth.signUp({ email: signupEmail, password: signupPassword, options: { data: { name: signupName } } });
    setLoading(false);
    if (err) { setError(err.message); return; }

    // Track referral if user came via a referral link
    const storedRef = sessionStorage.getItem("ref_slug") || refSlug;
    if (storedRef && signUpData?.user?.id) {
      try {
        // Look up referral partner by slug
        const { data: partner } = await supabase
          .from("referral_partners")
          .select("user_id")
          .eq("referral_slug", storedRef)
          .single();

        if (partner) {
          // Set referred_by on the new user's profile
          await supabase.from("profiles").update({ referred_by: partner.user_id }).eq("id", signUpData.user.id);
          // Create referral record
          await supabase.from("referrals").insert({
            referrer_id: partner.user_id,
            referee_id: signUpData.user.id,
            status: "pending",
          });
        }
        sessionStorage.removeItem("ref_slug");
      } catch { /* silently fail — referral tracking is not critical */ }
    }

    router.replace("/pricing");
  }

  async function handleForgotPassword() {
    setForgotMsg(""); setForgotSuccess(false);
    if (!forgotEmail) { setForgotMsg("Enter your email address."); return; }
    const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail, { redirectTo: `${window.location.origin}/reset-password` });
    if (err) { setForgotMsg(err.message); return; }
    setForgotSuccess(true);
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

  function enterDemoMode() { router.push("/dashboard?demo=true"); }

  return (
    <div className="onboard-wrap">
      {/* Referral banner */}
      {refSlug && (
        <div className="referral-banner">
          <span>You&apos;ve been referred by a friend — welcome to Study-HQ!</span>
        </div>
      )}

      {/* Left: Feature Showcase */}
      <div className="onboard-left">
        <div className="onboard-left-content">
          {/* Floating orbs */}
          <div className="onboard-orb onboard-orb-1" />
          <div className="onboard-orb onboard-orb-2" />
          <div className="onboard-orb onboard-orb-3" />

          <div className="onboard-brand">
            <div className="onboard-logo">
              <svg width="24" height="24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <span className="onboard-brand-text">Study-HQ</span>
          </div>

          <h1 className="onboard-headline">
            Everything you need to <span className="onboard-gradient-text">ace university</span>
          </h1>
          <p className="onboard-tagline">
            The all-in-one academic platform designed by students, for students.
          </p>

          {/* Feature carousel */}
          <div className="onboard-features">
            {features.map((f, i) => (
              <div
                key={i}
                className={`onboard-feature-card${i === activeFeature ? " active" : ""}`}
                onClick={() => setActiveFeature(i)}
              >
                <span className="onboard-feature-icon">{f.icon}</span>
                <div>
                  <div className="onboard-feature-title">{f.title}</div>
                  <div className="onboard-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stats bar */}
          <div className="onboard-stats">
            {stats.map((s, i) => (
              <div key={i} className="onboard-stat">
                <div className="onboard-stat-value">{s.value}</div>
                <div className="onboard-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Auth Form */}
      <div className="onboard-right">
        <div className="onboard-form-wrap" onKeyDown={handleKeyDown}>
          <div className="onboard-form-header">
            <h2>{showForgot ? "Reset password" : authMode === "signin" ? "Welcome back" : "Get started free"}</h2>
            <p>{showForgot ? "We'll send you a reset link" : authMode === "signin" ? "Sign in to your Study-HQ account" : "Start your 7-day free trial today"}</p>
          </div>

          {error && (
            <div className="onboard-error">
              <span>!</span> {error}
            </div>
          )}

          {showForgot ? (
            <div className="onboard-form-fields">
              <div className="onboard-field">
                <label>Email address</label>
                <input type="email" placeholder="you@example.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
              </div>
              {forgotMsg && (
                <p className={`onboard-msg ${forgotSuccess ? "success" : "error"}`}>{forgotMsg}</p>
              )}
              <button type="button" className="onboard-btn-primary" onClick={handleForgotPassword}>Send reset link</button>
              <button type="button" className="onboard-btn-link" onClick={() => { setShowForgot(false); setForgotMsg(""); setForgotSuccess(false); }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="onboard-tabs">
                <button className={`onboard-tab${authMode === "signin" ? " active" : ""}`} onClick={() => { setAuthMode("signin"); setError(""); }}>Sign in</button>
                <button className={`onboard-tab${authMode === "signup" ? " active" : ""}`} onClick={() => { setAuthMode("signup"); setError(""); }}>Create account</button>
              </div>

              <div className="onboard-form-fields">
                {authMode === "signin" ? (
                  <>
                    <div className="onboard-field">
                      <label>Email address</label>
                      <input type="email" placeholder="you@example.com" value={signinEmail} onChange={(e) => setSigninEmail(e.target.value)} />
                    </div>
                    <div className="onboard-field">
                      <label>Password</label>
                      <input type="password" placeholder="Enter your password" value={signinPassword} onChange={(e) => setSigninPassword(e.target.value)} />
                    </div>
                    <div style={{ textAlign: "right", marginTop: -4, marginBottom: 4 }}>
                      <button type="button" className="onboard-btn-link" style={{ marginTop: 0, fontSize: 12 }} onClick={() => router.push("/forgot-password")}>Forgot password?</button>
                    </div>
                    <button type="button" className="onboard-btn-primary" onClick={handleSignIn} disabled={loading}>
                      {loading ? "Signing in..." : "Sign in"}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="onboard-field">
                      <label>Full name</label>
                      <input type="text" placeholder="Your name" value={signupName} onChange={(e) => setSignupName(e.target.value)} />
                    </div>
                    <div className="onboard-field">
                      <label>Email address</label>
                      <input type="email" placeholder="you@example.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
                    </div>
                    <div className="onboard-field">
                      <label>Password</label>
                      <input type="password" placeholder="At least 6 characters" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} />
                    </div>
                    <div className="onboard-field">
                      <label>Confirm password</label>
                      <input type="password" placeholder="Re-enter password" value={signupConfirm} onChange={(e) => setSignupConfirm(e.target.value)} />
                    </div>
                    <button type="button" className="onboard-btn-primary" onClick={handleSignUp} disabled={loading}>
                      {loading ? "Creating account..." : "Start 7-day free trial"}
                    </button>
                  </>
                )}
              </div>

              <div className="onboard-divider"><span>or</span></div>

              <button type="button" className="onboard-demo-btn" onClick={enterDemoMode}>
                <span className="demo-sparkle">&#x2726;</span>
                <span>Explore the live demo</span>
                <span className="demo-arrow">&rarr;</span>
              </button>

              <p className="onboard-footer-text">
                7-day free trial &middot; Cancel anytime &middot; Student-friendly pricing
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginPageInner /></Suspense>;
}
