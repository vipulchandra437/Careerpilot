import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "CareerPilot",
    template: "%s · CareerPilot",
  },
  description:
    "AI career prep for CS students — resume analysis, mock interviews, readiness score.",
  // Tell browsers to use the frontend's favicon
  icons: {
    icon: "/favicon.svg",
  },
};

// Minimal root layout - the actual UI comes from the frontend
// This layout is only used for API routes and server-side rendering
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // In production, this will be rewritten to the frontend's index.html
  // In development, API routes are served from /api/*
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Figtree:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}