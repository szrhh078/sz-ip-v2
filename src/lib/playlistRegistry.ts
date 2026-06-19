import type { Channel } from "@/types";
import { JSON_PLAYLIST_SOURCES, BUILTIN_CHANNELS, type JsonPlaylistSource } from "@/lib/jsonParser";
import { M3U_PLAYLIST_SOURCES } from "@/store/channelStore";

/**
 * Multi-Source Playlist Manager
 * ──────────────────────────────────────────────────────────────────────────
 * This is an additive registry layered on top of the EXISTING sources
 * (JSON_PLAYLIST_SOURCES, M3U_PLAYLIST_SOURCES, BUILTIN_CHANNELS — all
 * defined elsewhere and untouched). It never removes or replaces those.
 *
 * Use `registerExtraSource()` to add new playlist sources at runtime
 * (e.g. from admin panel "Add Source" UI) without touching the original
 * hardcoded lists. Every source — old or new — is tracked here with its
 * type and origin so duplicates can be detected and the admin dashboard
 * can show a unified source list.
 */

export type SourceKind = "json" | "m3u" | "builtin" | "custom-runtime";

export interface RegisteredSource {
  id: string;
  name: string;
  url: string;
  kind: SourceKind;
  /** "core" = shipped with the app, "extra" = added later without replacing core */
  origin: "core" | "extra";
}

// ── Core sources (existing, untouched) ──────────────────────────────────────
function buildCoreRegistry(): RegisteredSource[] {
  const jsonCore: RegisteredSource[] = JSON_PLAYLIST_SOURCES.map((s: JsonPlaylistSource) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    kind: "json" as const,
    origin: "core" as const,
  }));

  const m3uCore: RegisteredSource[] = M3U_PLAYLIST_SOURCES.map((s) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    kind: "m3u" as const,
    origin: "core" as const,
  }));

  const builtinCore: RegisteredSource = {
    id: "builtin-channels",
    name: "Built-in Channels",
    url: "(hardcoded in app)",
    kind: "builtin",
    origin: "core",
  };

  return [...jsonCore, ...m3uCore, builtinCore];
}

// ── Extra sources (runtime-registered, additive only) ───────────────────────
const EXTRA_SOURCES_KEY = "shahriar-tv-extra-sources";

function loadExtraSources(): RegisteredSource[] {
  try {
    const raw = localStorage.getItem(EXTRA_SOURCES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveExtraSources(sources: RegisteredSource[]) {
  try {
    localStorage.setItem(EXTRA_SOURCES_KEY, JSON.stringify(sources));
  } catch {
    console.warn("[PlaylistRegistry] Could not persist extra sources");
  }
}

/**
 * Register a new playlist source WITHOUT touching existing core sources.
 * Returns false if a source with the same id/url already exists (no-op,
 * prevents accidental duplicates).
 */
export function registerExtraSource(source: Omit<RegisteredSource, "origin">): boolean {
  const all = getAllRegisteredSources();
  const exists = all.some((s) => s.id === source.id || s.url === source.url);
  if (exists) {
    console.warn(`[PlaylistRegistry] Source already registered: ${source.name}`);
    return false;
  }

  const extras = loadExtraSources();
  extras.push({ ...source, origin: "extra" });
  saveExtraSources(extras);
  console.log(`[PlaylistRegistry] Registered new source: ${source.name} (${source.kind})`);
  return true;
}

export function unregisterExtraSource(id: string): void {
  const extras = loadExtraSources().filter((s) => s.id !== id);
  saveExtraSources(extras);
}

/** Full list: all core sources (unchanged) + all extra sources (additive) */
export function getAllRegisteredSources(): RegisteredSource[] {
  return [...buildCoreRegistry(), ...loadExtraSources()];
}

export function getExtraSources(): RegisteredSource[] {
  return loadExtraSources();
}

/**
 * Merge channel arrays from multiple sources, removing duplicates by URL.
 * Order matters: earlier arrays win in case of duplicate URLs (so core
 * sources should be passed first to keep their richer metadata).
 */
export function mergeAllChannelSources(...channelArrays: Channel[][]): Channel[] {
  const seen = new Set<string>();
  const result: Channel[] = [];

  for (const arr of channelArrays) {
    for (const ch of arr) {
      const key = ch.url.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(ch);
    }
  }

  return result;
}

/** Always-available built-in channels, exposed here for convenience/clarity */
export { BUILTIN_CHANNELS };
