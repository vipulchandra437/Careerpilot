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
      <body>{children}</body>
    </html>
  );
}
