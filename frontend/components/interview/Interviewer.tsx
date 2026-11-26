"use client";

import type { InterviewType } from "@/lib/interview/questions";

export type InterviewerState = "idle" | "talking" | "listening" | "thinking";

interface Props {
  type: InterviewType;
  state: InterviewerState;
  className?: string;
}

const characters: Record<InterviewType, { name: string; hair: string; shirt: string; accent: string }> = {
  hr: { name: "Maya", hair: "#a78bfa", shirt: "#4f46e5", accent: "#c4b5fd" },
  technical: { name: "Dev", hair: "#334155", shirt: "#0e7490", accent: "#67e8f9" },
  mixed: { name: "Sam", hair: "#2dd4bf", shirt: "#7c3aed", accent: "#5eead4" },
};

/** Cartoon interviewer. The mouth only animates while the interviewer talks. */
export function Interviewer({ type, state, className }: Props) {
  const character = characters[type];
  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={`${character.name} is ${state}`}
      className={className}
    >
      <rect x="10" y="10" width="180" height="180" rx="40" fill="#111827" />
      <circle cx="100" cy="88" r="52" fill="#f4c9a8" />
      {type === "hr" ? (
        <path d="M48 88c0-38 24-58 52-58s52 20 52 58c-10-16-20-24-30-28-16 12-38 14-56 8-8 6-14 12-18 20z" fill={character.hair} />
      ) : type === "technical" ? (
        <path d="M48 84c2-34 24-54 52-54s50 20 52 54c-14-12-30-16-52-16s-38 4-52 16z" fill={character.hair} />
      ) : (
        <path d="M46 78c0-30 24-48 54-48s54 18 54 48c-18-10-36-14-54-14s-36 4-54 14z" fill={character.hair} />
      )}
      <circle cx="80" cy="88" r="5" fill="#0f172a" />
      <circle cx="120" cy="88" r="5" fill="#0f172a" />
      {type === "technical" ? (
        <g fill="none" stroke={character.accent} strokeWidth="3">
          <circle cx="80" cy="88" r="14" />
          <circle cx="120" cy="88" r="14" />
          <path d="M94 88h12" />
        </g>
      ) : null}
      <ellipse
        cx="100"
        cy="116"
        rx={state === "talking" ? 12 : 8}
        ry={state === "talking" ? 8 : 2.5}
        fill="#7f1d1d"
        className={state === "talking" ? "animate-mouth motion-reduce:animate-none" : ""}
        style={{ transformOrigin: "100px 116px" }}
      />
      <path d="M46 190c0-30 24-48 54-48s54 18 54 48z" fill={character.shirt} />
      {state === "thinking" ? (
        <text x="100" y="52" textAnchor="middle" fill={character.accent} fontSize="24">…</text>
      ) : null}
      <text x="100" y="186" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">
        {character.name}
      </text>
    </svg>
  );
}
