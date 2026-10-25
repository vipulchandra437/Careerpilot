/**
 * /hero — Stage 2 marketing placeholder.
 *
 * Hosts the existing decorative ParticleHeroCanvas behind a simple headline
 * and two placeholder buttons. This route touches nothing on the dashboard,
 * the frontend SPA, auth, API routes, or routing configuration.
 *
 * WHY inline styles (not Tailwind classes): the root Next.js layout imports no
 * CSS bundle — there is no @tailwind directive wired into the root app — so
 * utility classes are inert at runtime. Every visual property that must paint
 * is inlined.
 */
import type { CSSProperties } from "react";
import ParticleHeroCanvas from "@/components/ui/particle-hero-canvas";

// Palette — matches the canvas (warm bronze + taupe on ivory).
const IVORY = "#f6f0e6";
const BRONZE = "#c68615";
const TAUPE_DARK = "#8b7a70";
const TAUPE_LIGHT = "#b8a89e";

// Primary action — bronze ground, ivory text. Decorative placeholder link only.
const primaryBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderRadius: 12,
  padding: "12px 22px",
  fontWeight: 600,
  fontSize: 16,
  textDecoration: "none",
  backgroundColor: BRONZE,
  color: IVORY,
  border: "none",
  cursor: "pointer",
};

// Secondary action — ivory ground, taupe border + text. Placeholder link only.
const secondaryBtn: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderRadius: 12,
  padding: "12px 22px",
  fontWeight: 600,
  fontSize: 16,
  textDecoration: "none",
  backgroundColor: IVORY,
  color: TAUPE_DARK,
  border: `2px solid ${TAUPE_LIGHT}`,
  cursor: "pointer",
};

export default function HeroPage() {
  return (
    <main
      style={{
        position: "relative",
        minHeight: "100vh",
        width: "100%",
        backgroundColor: IVORY,
        overflow: "hidden",
      }}
    >
      {/*
        Decorative canvas — fills the hero and sits behind the content (z-index 0).
        The canvas element itself is `pointer-events:none`, so clicks/moves pass
        straight through it. The component's container captures pointer moves
        for the (purely decorative) cursor repulsion; the content layer above is
        higher z-index and therefore always clickable.
      */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <ParticleHeroCanvas className="h-full w-full" />
      </div>

      {/*
        Content layer — always above the canvas, always interactive. Centered
        vertically on desktop; flows to top on short viewports.
      */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          margin: "0 auto",
          maxWidth: 820,
          width: "100%",
          padding: "0 24px",
          textAlign: "center",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 48,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            fontFamily: "Fraunces, 'Iowan Old Style', Georgia, serif",
            color: TAUPE_DARK,
          }}
        >
          Shape Your Career Story
        </h1>

        <p
          style={{
            marginTop: 16,
            fontSize: 18,
            lineHeight: 1.5,
            color: TAUPE_LIGHT,
            fontFamily: "Figtree, 'Segoe UI', system-ui, sans-serif",
          }}
        >
          AI mock interviews and resume feedback tailored to CS students.
        </p>

        <div
          style={{
            marginTop: 32,
            display: "flex",
            gap: 16,
            justifyContent: "center",
          }}
        >
          <a href="#get-ready" style={primaryBtn}>
            Get ready
          </a>
          <a href="#how-it-works" style={secondaryBtn}>
            How it works
          </a>
        </div>
      </div>
    </main>
  );
}
