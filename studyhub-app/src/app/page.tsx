export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #FFE4E6 0%, #FFF1F2 50%, #FEF3F2 100%)",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #F0E9E5",
          borderRadius: "20px",
          boxShadow:
            "0 12px 32px rgba(20, 14, 16, 0.08), 0 4px 8px rgba(20, 14, 16, 0.04)",
          padding: "48px 44px",
          maxWidth: "440px",
          width: "100%",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top gradient bar — matches prototype */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "5px",
            background: "linear-gradient(135deg, #E11D48 0%, #FB7185 100%)",
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            width: "72px",
            height: "72px",
            background: "linear-gradient(135deg, #E11D48 0%, #FB7185 100%)",
            borderRadius: "20px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "24px",
            boxShadow: "0 10px 30px -8px rgba(225, 29, 72, 0.45)",
          }}
        >
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
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
        </div>

        <h1
          style={{
            fontFamily: "'Iowan Old Style', Palatino, Georgia, serif",
            fontSize: "32px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#1A1416",
            marginBottom: "8px",
          }}
        >
          Study
          <span
            style={{
              background:
                "linear-gradient(135deg, #E11D48 0%, #FB7185 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Hub
          </span>
        </h1>

        <p
          style={{
            color: "#78716C",
            fontSize: "15px",
            marginBottom: "4px",
          }}
        >
          Your AI-powered academic companion
        </p>

        <p
          style={{
            color: "#E11D48",
            fontSize: "12px",
            fontStyle: "italic",
            fontWeight: 500,
            marginBottom: "32px",
            letterSpacing: "0.01em",
          }}
        >
          Designed by students, for students.
        </p>

        <p
          style={{
            color: "#78716C",
            fontSize: "14px",
            lineHeight: 1.6,
          }}
        >
          Coming soon. This is a deployment test for Phase 1.
        </p>
      </div>
    </div>
  );
}
