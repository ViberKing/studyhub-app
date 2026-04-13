import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Study-HQ — Everything you need to ace university";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0f0a0d 0%, #1a0e14 50%, #1f0f18 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        {/* Logo area */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "18px",
              background: "linear-gradient(135deg, #E11D48, #FB7185)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <span style={{ fontSize: "42px", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>Study-HQ</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: "52px",
            fontWeight: 800,
            color: "#fff",
            textAlign: "center",
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
            marginBottom: "20px",
          }}
        >
          Everything you need to{" "}
          <span style={{ color: "#FB7185" }}>ace university</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "22px",
            color: "rgba(255,255,255,0.55)",
            textAlign: "center",
            maxWidth: "700px",
          }}
        >
          AI-powered study tools for UK university students. Flashcards, grade calculator, essay planner, and more.
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "40px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {["Flashcards", "Grade Calculator", "Study Timer", "AI Research", "Essay Planner", "Citations"].map((f) => (
            <div
              key={f}
              style={{
                padding: "8px 20px",
                background: "rgba(225, 29, 72, 0.15)",
                border: "1px solid rgba(225, 29, 72, 0.3)",
                borderRadius: "999px",
                color: "#FB7185",
                fontSize: "16px",
                fontWeight: 600,
              }}
            >
              {f}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
