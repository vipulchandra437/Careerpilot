import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "HireReady",
    template: "%s · HireReady",
  },
  description:
    "AI career prep for CS students — resume analysis, mock interviews, readiness score.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/*
        WHY no next/font at all: next/font/google downloads font files at build
        time, which breaks offline/restricted-network builds, and `Geist` is not
        in Next 14's Google catalog anyway. The system-ui stack in globals.css
        (DESIGN.md-approved) needs zero downloads.
      */}
      <body className="antialiased">{children}</body>
    </html>
  );
}
