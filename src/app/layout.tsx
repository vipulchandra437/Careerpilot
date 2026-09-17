import { ReticleDev } from './reticle-dev';
import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CareerPilot",
    template: "%s · CareerPilot",
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
    <html lang="en" className="dark">
      {/*
        WHY dark by default: per user request, the whole app renders in the dark
        theme defined in globals.css (.dark). The dashboard, login, register, and
        the Graphify journey map all inherit these tokens. The Graphify module
        adds its own .dark overrides for its hardcoded paper/amber accents.
      */}
      {/*
        WHY no next/font at all: next/font/google downloads font files at build
        time, which breaks offline/restricted-network builds, and `Geist` is not
        in Next 14's Google catalog anyway. The system-ui stack in globals.css
        (DESIGN.md-approved) needs zero downloads.
      */}
      <body className="antialiased">{process.env.NODE_ENV === 'development' ? <ReticleDev /> : null}{children}</body>
    </html>
  );
}
