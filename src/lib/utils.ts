import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
})

export function formatDate(input: string | number | Date): string {
  const date = typeof input === "string" || typeof input === "number" ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return "—"
  return dateFormatter.format(date)
}

export function formatDateTime(input: string | number | Date): string {
  const date = typeof input === "string" || typeof input === "number" ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return "—"
  return dateTimeFormatter.format(date)
}

export function scoreColor(score: number) {
  if (score >= 85) return "var(--chart-1)";
  if (score >= 70) return "var(--chart-2)";
  if (score >= 50) return "var(--chart-3)";
  return "var(--chart-5)";
}
