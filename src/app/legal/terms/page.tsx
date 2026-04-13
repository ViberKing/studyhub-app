import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsOfService() {
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
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginBottom: 40 }}>Last updated: 13 April 2026</p>

        <div className="legal-content" style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 1.8 }}>
          <Section title="1. Agreement">
            <p>By creating an account on Study-HQ (study-hq.co.uk), you agree to these Terms of Service. If you do not agree, do not use the service.</p>
          </Section>

          <Section title="2. The service">
            <p>Study-HQ is an academic productivity platform providing study tools including flashcards, a grade calculator, study timer, note-taking, citation generator, AI research assistant, essay structure planner, calendar, and student lifestyle features.</p>
          </Section>

          <Section title="3. Eligibility">
            <p>Study-HQ is intended for university students aged 16 and over. By using the service, you confirm that you meet this requirement.</p>
          </Section>

          <Section title="4. Accounts">
            <ul>
              <li>You must provide accurate information when creating your account.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You must not share your account or allow others to access it.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
            </ul>
          </Section>

          <Section title="5. Subscriptions and payments">
            <ul>
              <li>Study-HQ offers a free 7-day trial for new users.</li>
              <li>After the trial, a paid subscription is required to continue using the service.</li>
              <li>Subscriptions are available on monthly or annual billing cycles.</li>
              <li>Payments are processed securely by Stripe. We do not store your card details.</li>
              <li>Subscriptions renew automatically unless cancelled before the renewal date.</li>
              <li>You can cancel your subscription at any time from your account settings. Access continues until the end of the current billing period.</li>
              <li>Refunds are handled on a case-by-case basis. Contact support@study-hq.co.uk for refund requests.</li>
            </ul>
          </Section>

          <Section title="6. Acceptable use">
            <p>You agree not to:</p>
            <ul>
              <li>Use the service for any unlawful purpose.</li>
              <li>Upload content that is offensive, harmful, or infringes on others&apos; rights.</li>
              <li>Attempt to gain unauthorised access to the service or other users&apos; accounts.</li>
              <li>Use the AI research assistant to generate content intended to be submitted as your own academic work (plagiarism).</li>
              <li>Abuse, overload, or interfere with the service.</li>
              <li>Reverse engineer, decompile, or attempt to extract the source code.</li>
            </ul>
          </Section>

          <Section title="7. AI features disclaimer">
            <p>The AI research assistant is designed to help you understand sources and generate study aids. It is not a substitute for reading original material or doing your own academic work. All AI-generated content should be treated as a study aid only. Study-HQ is not responsible for the accuracy of AI-generated content or for any academic consequences arising from its misuse.</p>
          </Section>

          <Section title="8. Your content">
            <ul>
              <li>You retain ownership of all content you create on Study-HQ (notes, flashcards, assignments, etc.).</li>
              <li>You grant us a limited licence to store and display your content as needed to provide the service.</li>
              <li>You can export or delete your content at any time via Settings.</li>
            </ul>
          </Section>

          <Section title="9. Availability">
            <p>We aim for high availability but do not guarantee uninterrupted service. We may perform maintenance or updates that temporarily affect access. We are not liable for any loss resulting from service downtime.</p>
          </Section>

          <Section title="10. Limitation of liability">
            <p>Study-HQ is provided &quot;as is&quot;. To the maximum extent permitted by law:</p>
            <ul>
              <li>We are not liable for any indirect, incidental, or consequential damages.</li>
              <li>Our total liability shall not exceed the amount you have paid us in the 12 months preceding the claim.</li>
              <li>We are not responsible for academic outcomes, grades, or university decisions.</li>
            </ul>
          </Section>

          <Section title="11. Changes to terms">
            <p>We may update these terms from time to time. We will notify users of material changes via email or in-app notification. Continued use of the service after changes take effect constitutes acceptance of the updated terms.</p>
          </Section>

          <Section title="12. Governing law">
            <p>These terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the English courts.</p>
          </Section>

          <Section title="13. Contact">
            <p>For questions about these terms, contact us at <strong>support@study-hq.co.uk</strong>.</p>
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
