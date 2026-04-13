import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: "100vh", background: "#0f0a0d" }}>
      {/* Header */}
      <header style={{
        padding: "20px 32px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "#fff", fontWeight: 700, fontSize: 16 }}>
          <svg width="20" height="20" fill="none" stroke="#FB7185" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          Study-HQ
        </Link>
        <Link href="/" style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textDecoration: "none" }}>Back to home</Link>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 40 }}>Last updated: 13 April 2026</p>

        <div className="legal-content" style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.8 }}>
          <Section title="1. Who we are">
            <p>Study-HQ (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates the website study-hq.co.uk and the Study-HQ application. We are committed to protecting the privacy of our users, particularly UK university students.</p>
          </Section>

          <Section title="2. Information we collect">
            <p>We collect the following data when you create an account and use our service:</p>
            <ul>
              <li><strong>Account information:</strong> name, email address, university, course, year of study, and age.</li>
              <li><strong>Profile data:</strong> profile picture (optional) stored securely via Supabase Storage.</li>
              <li><strong>Usage data:</strong> assignments, study sessions, notes, flashcard decks, grades, citations, and essay plans you create within the platform.</li>
              <li><strong>Payment data:</strong> processed securely by Stripe. We do not store your card details. We retain your Stripe customer ID for subscription management.</li>
              <li><strong>Technical data:</strong> browser type, device information, and IP address collected automatically for security and performance.</li>
            </ul>
          </Section>

          <Section title="3. How we use your information">
            <ul>
              <li>To provide and maintain the Study-HQ service.</li>
              <li>To manage your account and subscription.</li>
              <li>To personalise your experience (e.g. university-specific events, grading scales).</li>
              <li>To process payments via Stripe.</li>
              <li>To communicate important service updates.</li>
              <li>To improve our platform based on aggregated, anonymised usage patterns.</li>
            </ul>
          </Section>

          <Section title="4. Legal basis for processing (GDPR)">
            <ul>
              <li><strong>Contract:</strong> processing necessary to provide the service you signed up for.</li>
              <li><strong>Legitimate interests:</strong> improving our service, preventing fraud, and ensuring security.</li>
              <li><strong>Consent:</strong> where you have given explicit consent (e.g. optional marketing emails).</li>
            </ul>
          </Section>

          <Section title="5. Data sharing">
            <p>We do not sell your personal data. We share data only with:</p>
            <ul>
              <li><strong>Supabase:</strong> database and authentication provider (EU-hosted).</li>
              <li><strong>Stripe:</strong> payment processing (PCI DSS compliant).</li>
              <li><strong>Vercel:</strong> hosting provider.</li>
              <li><strong>Anthropic:</strong> AI features (research assistant). Only your prompts are sent; no personal data is included.</li>
            </ul>
          </Section>

          <Section title="6. Data retention">
            <p>We retain your data for as long as your account is active. If you delete your account, all your data is permanently removed from our systems within 30 days. Stripe may retain payment records as required by financial regulations.</p>
          </Section>

          <Section title="7. Your rights">
            <p>Under UK GDPR, you have the right to:</p>
            <ul>
              <li><strong>Access:</strong> request a copy of your data (available via Settings &gt; Download my data).</li>
              <li><strong>Rectification:</strong> correct inaccurate data via your Settings page.</li>
              <li><strong>Erasure:</strong> delete your account and all data (Settings &gt; Delete account).</li>
              <li><strong>Portability:</strong> export your data in JSON format.</li>
              <li><strong>Object:</strong> object to processing based on legitimate interests.</li>
            </ul>
            <p>To exercise any of these rights, contact us at <strong>support@study-hq.co.uk</strong>.</p>
          </Section>

          <Section title="8. Cookies">
            <p>We use essential cookies only for authentication and session management. We do not use advertising or tracking cookies. Third-party services (Supabase, Stripe) may set their own necessary cookies.</p>
          </Section>

          <Section title="9. Security">
            <p>We implement industry-standard security measures including encrypted connections (HTTPS), Row Level Security on our database, secure authentication via Supabase Auth, and PCI-compliant payment processing via Stripe.</p>
          </Section>

          <Section title="10. Children">
            <p>Study-HQ is designed for university students aged 16 and over. We do not knowingly collect data from children under 16.</p>
          </Section>

          <Section title="11. Changes to this policy">
            <p>We may update this policy from time to time. We will notify registered users of significant changes via email or in-app notification.</p>
          </Section>

          <Section title="12. Contact">
            <p>For privacy queries or to exercise your data rights, contact us at <strong>support@study-hq.co.uk</strong>.</p>
          </Section>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 12, letterSpacing: "-0.01em" }}>{title}</h2>
      {children}
      <style>{`
        .legal-content ul { padding-left: 20px; margin: 8px 0 16px; }
        .legal-content li { margin-bottom: 6px; }
        .legal-content p { margin-bottom: 12px; }
      `}</style>
    </section>
  );
}
