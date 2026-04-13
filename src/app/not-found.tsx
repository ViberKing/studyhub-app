import Link from "next/link";

export default function NotFound() {
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
          fontSize: 80,
          fontWeight: 900,
          letterSpacing: "-0.04em",
          background: "linear-gradient(135deg, #E11D48, #FB7185)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1,
          marginBottom: 16,
        }}>
          404
        </div>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          color: "#fff",
          marginBottom: 12,
          letterSpacing: "-0.02em",
        }}>
          Page not found
        </h1>
        <p style={{
          fontSize: 15,
          color: "rgba(255,255,255,0.55)",
          lineHeight: 1.6,
          marginBottom: 32,
        }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/dashboard"
            style={{
              padding: "12px 28px",
              background: "linear-gradient(135deg, #E11D48, #BE123C)",
              color: "#fff",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
              transition: "transform 0.15s",
            }}
          >
            Go to Dashboard
          </Link>
          <Link
            href="/"
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
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
