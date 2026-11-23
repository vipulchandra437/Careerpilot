import { ReticleDev } from './reticle-dev';
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Platform",
  description: "AI-assisted career development platform for CS students",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{process.env.NODE_ENV === 'development' ? <ReticleDev /> : null}{children}</body>
    </html>
  );
}
