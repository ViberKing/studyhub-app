import type { Metadata, Viewport } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: {
    default: "Study-HQ | AI-Powered Study Platform for UK Students",
    template: "%s | Study-HQ",
  },
  description:
    "The all-in-one academic platform for UK university students. Flashcards, grade calculator, study timer, AI research assistant, essay planner, and more. Free 7-day trial.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://study-hq.co.uk"),
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://study-hq.co.uk",
    siteName: "Study-HQ",
    title: "Study-HQ | AI-Powered Study Platform for UK Students",
    description:
      "The all-in-one academic platform for UK university students. Flashcards, grade calculator, study timer, AI research assistant, essay planner, and more.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Study-HQ — Everything you need to ace university",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Study-HQ | AI-Powered Study Platform for UK Students",
    description:
      "The all-in-one academic platform for UK university students. Free 7-day trial.",
    images: ["/og-image.png"],
  },
  keywords: [
    "study app", "university", "UK students", "flashcards", "grade calculator",
    "study timer", "pomodoro", "essay planner", "citations", "AI research",
    "student discounts", "academic planner", "study tools",
  ],
  authors: [{ name: "Study-HQ" }],
  creator: "Study-HQ",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Study-HQ",
  },
};

export const viewport: Viewport = {
  themeColor: "#E11D48",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
      </head>
      <body>
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
