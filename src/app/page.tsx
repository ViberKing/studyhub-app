"use client";

import { useState } from "react";

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  return (
    <div className="login-wrap">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <svg
            width="32"
            height="32"
            fill="none"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
        </div>

        <h1>
          Welcome to Study
          <span
            style={{
              background: "var(--grad)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Hub
          </span>
        </h1>
        <p className="sub">Your AI-powered academic companion</p>
        <p className="tag">Designed by students, for students.</p>

        {/* Auth tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab${authMode === "signin" ? " active" : ""}`}
            onClick={() => setAuthMode("signin")}
          >
            Sign in
          </button>
          <button
            className={`auth-tab${authMode === "signup" ? " active" : ""}`}
            onClick={() => setAuthMode("signup")}
          >
            Create account
          </button>
        </div>

        {/* Sign in form */}
        {authMode === "signin" && (
          <div>
            <div className="field">
              <label>Email address</label>
              <input type="email" placeholder="you@example.com" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder="••••••••" />
            </div>
            <button type="button" className="btn btn-grad btn-block">
              Sign in
            </button>
            <button type="button" className="login-link">
              Forgot password?
            </button>
          </div>
        )}

        {/* Sign up form */}
        {authMode === "signup" && (
          <div>
            <div className="field">
              <label>Full name</label>
              <input type="text" placeholder="Your name" />
            </div>
            <div className="field">
              <label>Email address</label>
              <input type="email" placeholder="you@example.com" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder="At least 6 characters" />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input type="password" placeholder="Re-enter password" />
            </div>
            <button type="button" className="btn btn-grad btn-block">
              Start 7-day free trial
            </button>
          </div>
        )}

        <div className="login-divider">or</div>

        <button type="button" className="demo-cool">
          <span className="demo-sparkle">✦</span>
          <span>Try the live demo</span>
          <span className="demo-arrow">→</span>
        </button>

        <button type="button" className="login-link">
          View pricing
        </button>

        <p className="small-print">
          7-day free trial · No credit card required · Cancel anytime
        </p>
      </div>
    </div>
  );
}
