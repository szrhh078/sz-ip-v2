import type { Channel } from "@/types";

/**
 * M3U Converter System
 * ──────────────────────────────────────────────────────────────────────────
 * Converts the app's in-memory Channel[] (sourced from JSON or M3U, merged,
 * deduplicated) back into valid M3U playlist text. Supports exporting:
 *   - the full merged catalogue
 *   - a single category/group
 *   - a single country
 * This does not modify any existing playlist fetching/parsing — it is a
 * pure, additive export utility.
 */

function escapeAttr(value: string): string {
  return value.replace(/"/g, "'");
}

function channelToExtinf(channel: Channel): string {
  const attrs: string[] = [];
  if (channel.tvgId) attrs.push(`tvg-id="${escapeAttr(channel.tvgId)}"`);
  if (channel.tvgName) attrs.push(`tvg-name="${escapeAttr(channel.tvgName)}"`);
  if (channel.logo) attrs.push(`tvg-logo="${escapeAttr(channel.logo)}"`);
  attrs.push(`group-title="${escapeAttr(channel.group)}"`);
  if (channel.language) attrs.push(`tvg-language="${escapeAttr(channel.language)}"`);
  if (channel.country) attrs.push(`tvg-country="${escapeAttr(channel.country)}"`);

  const attrString = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
  return `#EXTINF:-1${attrString},${channel.name}`;
}

/**
 * Build a full M3U playlist string from a list of channels.
 */
export function channelsToM3U(channels: Channel[], playlistName = "SZ IPTV Export"): string {
  const lines: string[] = [`#EXTM3U x-tvg-url="" name="${escapeAttr(playlistName)}"`];

  for (const ch of channels) {
    lines.push(channelToExtinf(ch));
    lines.push(ch.url);
  }

  return lines.join("\n") + "\n";
}

/**
 * Export the full merged catalogue (all sources combined) as M3U text.
 */
export function exportAllChannelsAsM3U(channels: Channel[]): string {
  return channelsToM3U(channels, "SZ IPTV - Full Merged Playlist");
}

/**
 * Export only channels belonging to one category/group as M3U text.
 */
export function exportCategoryAsM3U(channels: Channel[], category: string): string {
  const filtered = channels.filter((c) => c.group.toLowerCase() === category.toLowerCase());
  return channelsToM3U(filtered, `SZ IPTV - ${category}`);
}

/**
 * Export only channels belonging to one country as M3U text.
 */
export function exportCountryAsM3U(channels: Channel[], country: string): string {
  const filtered = channels.filter((c) => (c.country || "").toLowerCase() === country.toLowerCase());
  return channelsToM3U(filtered, `SZ IPTV - ${country}`);
}

/**
 * Export only channels from one playlist source as M3U text
 * (useful for re-publishing a single source after merge/dedupe).
 */
export function exportSourceAsM3U(channels: Channel[], source: string): string {
  const filtered = channels.filter((c) => c.source === source);
  return channelsToM3U(filtered, `SZ IPTV - ${source}`);
}

/**
 * Triggers a browser download of the given M3U text as a .m3u file.
 */
export function downloadM3U(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/x-mpegurl;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".m3u") ? filename : `${filename}.m3u`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Convenience: get the distinct list of countries present across channels
 * (for building a "country export" picker in the admin UI).
 */
export function getDistinctCountries(channels: Channel[]): string[] {
  const set = new Set<string>();
  for (const c of channels) {
    if (c.country) set.add(c.country);
  }
  return Array.from(set).sort();
}
