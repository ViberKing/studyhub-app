"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#0f0a0d",
      padding: 24,
    }}>
      <div style={{
        maxWidth: 440,
        textAlign: "center",
      }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: "rgba(225, 29, 72, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 24px",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: "#fff",
          marginBottom: 12,
          letterSpacing: "-0.02em",
        }}>
          Something went wrong
        </h1>
        <p style={{
          fontSize: 15,
          color: "rgba(255,255,255,0.55)",
          lineHeight: 1.6,
          marginBottom: 32,
        }}>
          An unexpected error occurred. Please try again or go back to the dashboard.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={reset}
            style={{
              padding: "12px 28px",
              background: "linear-gradient(135deg, #E11D48, #BE123C)",
              color: "#fff",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <a
            href="/dashboard"
            style={{
              padding: "12px 28px",
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.7)",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
