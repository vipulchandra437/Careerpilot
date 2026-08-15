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
