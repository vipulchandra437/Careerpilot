import type { Config } from "tailwindcss";

// Design tokens ported 1:1 from the Career Pilot design system
// (frontend/src/styles.css): near-black canvas, layered surfaces, pale steel
// primary, warm bone accents. Dark-only — there is no light theme.
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#08090b",
        surface: "#111318",
        elevated: "#191d24",
        panel: "#21262f",
        editor: "#0c0e12",
        fg: "#f0ebe3",
        muted: "#9a9389",
        faint: "#6b6560",
        primary: {
          DEFAULT: "#b7c5ce",
          fg: "#0a0c0f",
        },
        bone: "#e8e0d4",
        stone: "#c6bbad",
        border: "rgba(240, 235, 227, 0.11)",
        "border-strong": "rgba(240, 235, 227, 0.2)",
        success: "#8fa89a",
        warning: "#c4a78a",
        danger: "#c47b72",
        ring: "#b7c5ce",
      },
      fontFamily: {
        display: ["Fraunces", "Iowan Old Style", "Georgia", "serif"],
        sans: ["Figtree", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "Menlo", "monospace"],
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "20px",
        xl: "28px",
        "2xl": "36px",
      },
      boxShadow: {
        soft: "0 18px 48px rgba(0, 0, 0, 0.48)",
      },
    },
  },
  plugins: [],
};
export default config;