import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: unknown[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

/**
 * Formats a kickoff timestamp into the viewer's local date & time,
 * e.g. "Thu, Jun 11 · 7:00 PM"
 */
export function formatMatchDateTime(epochMs: number): string {
  const date = new Date(epochMs);
  const datePart = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const timePart = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

export function formatMatchTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatMatchDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

/**
 * Returns a short countdown string like "in 2d 4h" or "in 45m" for a future timestamp.
 */
export function formatCountdown(epochMs: number): string {
  const diff = epochMs - Date.now();
  if (diff <= 0) return "Starting now";
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `in ${days}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
  return `in ${minutes}m`;
}
