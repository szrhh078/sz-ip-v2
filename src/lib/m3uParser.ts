import type { Channel } from "@/types";

/**
 * Parses raw M3U / M3U8 playlist text into a list of Channel objects.
 * Handles #EXTINF attributes: tvg-id, tvg-name, tvg-logo, group-title, tvg-language, tvg-country
 */
export function parseM3U(content: string, sourceId: string, sourceLabel: string): Channel[] {
  const channels: Channel[] = [];
  const lines = content.split(/\r?\n/);

  let current: Partial<Channel> | null = null;
  let idCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      const info = line.substring(line.indexOf(":") + 1);

      // Extract attributes using regex
      const tvgId = extractAttr(info, "tvg-id");
      const tvgName = extractAttr(info, "tvg-name");
      const tvgLogo = extractAttr(info, "tvg-logo");
      const groupTitle = extractAttr(info, "group-title");
      const tvgLanguage = extractAttr(info, "tvg-language");
      const tvgCountry = extractAttr(info, "tvg-country");

      // Channel name is after the last comma
      const commaIdx = info.lastIndexOf(",");
      const name = commaIdx >= 0 ? info.substring(commaIdx + 1).trim() : "Unknown Channel";

      current = {
        name: name || tvgName || "Unknown Channel",
        tvgId: tvgId || undefined,
        tvgName: tvgName || undefined,
        logo: tvgLogo || "",
        group: groupTitle || "Uncategorized",
        language: tvgLanguage || undefined,
        country: tvgCountry || undefined,
        source: sourceLabel,
      };
    } else if (line.startsWith("#EXTGRP")) {
      if (current) {
        current.group = line.substring(line.indexOf(":") + 1).trim();
      }
    } else if (line.startsWith("#")) {
      // skip other directives (#EXTM3U, #EXTVLCOPT, etc.)
      continue;
    } else {
      // This is a URL line
      if (current) {
        idCounter++;
        const id = `${sourceId}-${idCounter}-${slugify(current.name || "channel")}`;
        channels.push({
          id,
          name: current.name || "Unknown Channel",
          url: line,
          logo: current.logo || "",
          group: normalizeGroup(current.group || "Uncategorized"),
          source: current.source || sourceLabel,
          tvgId: current.tvgId,
          tvgName: current.tvgName,
          isLive: true,
          country: current.country,
          language: current.language,
        });
        current = null;
      }
    }
  }

  return channels;
}

function extractAttr(line: string, attr: string): string | null {
  const regex = new RegExp(`${attr}="([^"]*)"`, "i");
  const match = line.match(regex);
  return match ? match[1] : null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .substring(0, 40);
}

function normalizeGroup(group: string): string {
  const trimmed = group.trim();
  if (!trimmed || trimmed.toLowerCase() === "undefined") return "Other";
  return trimmed;
}

/**
 * Deduplicate channels by name+url combination
 */
export function deduplicateChannels(channels: Channel[]): Channel[] {
  const seen = new Set<string>();
  return channels.filter((ch) => {
    const key = `${ch.name}::${ch.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Group channels by their `group` field
 */
export function groupChannels(channels: Channel[]): Map<string, Channel[]> {
  const map = new Map<string, Channel[]>();
  for (const ch of channels) {
    const arr = map.get(ch.group) || [];
    arr.push(ch);
    map.set(ch.group, arr);
  }
  return map;
}
