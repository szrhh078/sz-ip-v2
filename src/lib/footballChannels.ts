import type { Channel } from "@/types";

/**
 * Strictly matches FIFA/World Cup channels only —
 * the dedicated FIFA source channels, plus CAZE TV and BTV variants
 * from Sports that actually carry World Cup coverage.
 * Does NOT include general football/Premier League/LaLiga channels.
 */
export function isFifaChannel(channel: Channel): boolean {
  const name = channel.name.toLowerCase();

  // Everything from the FIFA playlist source
  if (channel.source === "FIFA") return true;

  // CAZE TV — official FIFA partner broadcaster
  if (/caze\s*tv/i.test(name)) return true;

  // BTV variants — Bangladeshi state broadcaster showing World Cup
  if (/\bbtv\b/i.test(name)) return true;

  // Somoy TV — Bangladeshi channel with World Cup rights
  if (/somoy\s*tv/i.test(name)) return true;

  return false;
}

/**
 * Returns FIFA/World Cup channels sorted: FIFA source first, then CAZE TV, then BTV.
 */
export function getFootballChannels(channels: Channel[]): Channel[] {
  return channels
    .filter(isFifaChannel)
    .sort((a, b) => {
      if (a.source === "FIFA" && b.source !== "FIFA") return -1;
      if (a.source !== "FIFA" && b.source === "FIFA") return 1;
      return a.name.localeCompare(b.name);
    });
}
