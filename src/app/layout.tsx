import type { Metadata } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "Study-HQ",
  description:
    "Your AI-powered academic companion. Designed by students, for students.",
  manifest: "/manifest.json",
  themeColor: "#E11D48",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Study-HQ",
  },
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
      </head>
      <body>
        {children}
        <PWARegister />
      </body>
    </html>
  );
}
