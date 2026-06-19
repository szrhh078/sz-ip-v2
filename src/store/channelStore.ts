import { create } from "zustand";
import type { Channel, PlaylistSource } from "@/types";
import { parseM3U, deduplicateChannels } from "@/lib/m3uParser";
import { fetchPlaylistText } from "@/lib/playlistFetcher";
import { fetchJsonPlaylist, JSON_PLAYLIST_SOURCES, BUILTIN_CHANNELS } from "@/lib/jsonParser";

// M3U sources — only small focused playlists (no 7500-ch universal)
export const M3U_PLAYLIST_SOURCES = [
  {
    id: "m3u-fifa",
    name: "FIFA",
    url: "https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/fifa.m3u",
  },
  {
    id: "m3u-sports",
    name: "Sports",
    url: "https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/sports.m3u",
  },
  {
    id: "m3u-bangla",
    name: "Bangla TV",
    url: "https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/bangla.m3u",
  },
];

export const PLAYLIST_SOURCES = [
  ...JSON_PLAYLIST_SOURCES.map((s) => ({ ...s, type: "json" as const })),
  ...M3U_PLAYLIST_SOURCES.map((s) => ({ ...s, type: "m3u" as const })),
];

// Bump cache version since we changed sources
const CACHE_KEY = "shahriar-tv-channel-cache-v5";
const CACHE_TTL = 1000 * 60 * 30; // 30 min

interface ChannelCache {
  channels: Channel[];
  sources: PlaylistSource[];
  cachedAt: number;
}

interface ChannelStore {
  channels: Channel[];
  groups: string[];
  sources: PlaylistSource[];
  isLoading: boolean;
  loadingProgress: number; // 0-100
  error: string | null;
  lastLoaded: number | null;

  loadChannels: (force?: boolean) => Promise<void>;
  refreshSource: (sourceId: string) => Promise<void>;
  getChannelById: (id: string) => Channel | undefined;
  getChannelsByGroup: (group: string) => Channel[];
}

function loadCache(): ChannelCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ChannelCache) : null;
  } catch {
    return null;
  }
}

function saveCache(data: ChannelCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Quota exceeded — clear and retry with smaller data
    try {
      localStorage.removeItem(CACHE_KEY);
      // Save only first 500 channels if too large
      const small = { ...data, channels: data.channels.slice(0, 500) };
      localStorage.setItem(CACHE_KEY, JSON.stringify(small));
    } catch {
      console.warn("[ChannelStore] localStorage quota exceeded");
    }
  }
}

// Sort by channel count descending for group filter
function deriveGroups(channels: Channel[]): string[] {
  const counts = new Map<string, number>();
  for (const c of channels) {
    counts.set(c.group, (counts.get(c.group) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);
}

// FIFA channels always first, then verified HLS, then rest
function sortChannels(channels: Channel[]): Channel[] {
  return [...channels].sort((a, b) => {
    const aFifa = a.source === "FIFA" || a.group === "FIFA";
    const bFifa = b.source === "FIFA" || b.group === "FIFA";
    if (aFifa && !bFifa) return -1;
    if (!aFifa && bFifa) return 1;

    // Within FIFA: HLS before DASH
    if (aFifa && bFifa) {
      const aHls = (a.streamType || "hls") === "hls";
      const bHls = (b.streamType || "hls") === "hls";
      if (aHls && !bHls) return -1;
      if (!aHls && bHls) return 1;
    }

    // Verified before unverified
    if (a.verified && !b.verified) return -1;
    if (!a.verified && b.verified) return 1;
    return 0;
  });
}

// Merge JSON (primary) + M3U (supplement), deduplicate by URL
function mergeChannels(jsonChs: Channel[], m3uChs: Channel[]): Channel[] {
  const jsonUrls = new Set(jsonChs.map((c) => c.url.toLowerCase().trim()));
  const uniqueM3u = m3uChs.filter((c) => !jsonUrls.has(c.url.toLowerCase().trim()));
  return deduplicateChannels([...jsonChs, ...uniqueM3u]);
}

// Yield to browser between heavy tasks to avoid UI freeze
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export const useChannelStore = create<ChannelStore>((set, get) => ({
  channels: [],
  groups: [],
  sources: PLAYLIST_SOURCES.map((s) => ({
    id: s.id,
    name: `${s.name} (${s.type.toUpperCase()})`,
    url: s.url,
    channelCount: 0,
    lastUpdated: 0,
    status: "idle" as const,
  })),
  isLoading: false,
  loadingProgress: 0,
  error: null,
  lastLoaded: null,

  loadChannels: async (force = false) => {
    if (get().isLoading) return;

    // Always show cached data immediately (no blank screen)
    const cache = loadCache();
    if (cache && cache.channels.length > 0) {
      set({
        channels: cache.channels,
        groups: deriveGroups(cache.channels),
        sources: cache.sources,
        lastLoaded: cache.cachedAt,
      });
      if (!force && Date.now() - cache.cachedAt < CACHE_TTL) {
        console.log("[ChannelStore] Cache fresh, skipping fetch");
        return;
      }
    }

    set({ isLoading: true, error: null, loadingProgress: 0 });

    const updatedSources: PlaylistSource[] = [];
    let allJsonChannels: Channel[] = [];
    let allM3uChannels: Channel[] = [];
    const total = JSON_PLAYLIST_SOURCES.length + M3U_PLAYLIST_SOURCES.length;
    let done = 0;

    const updateProgress = () => {
      done++;
      set({ loadingProgress: Math.round((done / total) * 100) });
    };

    // ── Load JSON sources (priority order, non-blocking) ──────────────────────
    const sortedJsonSources = [...JSON_PLAYLIST_SOURCES].sort((a, b) => a.priority - b.priority);

    for (const src of sortedJsonSources) {
      try {
        const channels = await fetchJsonPlaylist(src);
        allJsonChannels = [...allJsonChannels, ...channels];
        updatedSources.push({
          id: src.id,
          name: `${src.name} (JSON)`,
          url: src.url,
          channelCount: channels.length,
          lastUpdated: Date.now(),
          status: "ok",
        });

        // Yield after each source so UI stays responsive
        await yieldToMain();

        // Update store progressively so channels appear as they load
        const merged = sortChannels(mergeChannels(allJsonChannels, allM3uChannels));
        set({
          channels: merged,
          groups: deriveGroups(merged),
        });
      } catch (err) {
        console.error(`[ChannelStore] JSON ${src.name} failed:`, err);
        updatedSources.push({
          id: src.id,
          name: `${src.name} (JSON)`,
          url: src.url,
          channelCount: 0,
          lastUpdated: Date.now(),
          status: "error",
          error: err instanceof Error ? err.message : "Failed",
        });
      }
      updateProgress();
      await yieldToMain();
    }

    // ── Load M3U sources (supplement, run after JSON) ─────────────────────────
    const m3uResults = await Promise.allSettled(
      M3U_PLAYLIST_SOURCES.map(async (src) => {
        const text = await fetchPlaylistText(src.url);
        return { src, parsed: parseM3U(text, src.id, src.name) };
      })
    );

    for (const result of m3uResults) {
      if (result.status === "fulfilled") {
        const { src, parsed } = result.value;
        allM3uChannels = [...allM3uChannels, ...parsed];
        console.log(`[ChannelStore] M3U ${src.name}: ${parsed.length} channels`);
      }
      updateProgress();
      await yieldToMain();
    }

    // ── Final merge, sort, save ───────────────────────────────────────────────
    // Always include built-in channels even if remote sources fail
    const finalChannels = sortChannels(
      mergeChannels([...BUILTIN_CHANNELS, ...allJsonChannels], allM3uChannels)
    );
    console.log(`[ChannelStore] ✓ Total unique channels: ${finalChannels.length}`);

    if (finalChannels.length === 0) {
      set({
        isLoading: false,
        loadingProgress: 100,
        error: "Could not load channels. Check your connection and try again.",
      });
      return;
    }

    const cacheData: ChannelCache = {
      channels: finalChannels,
      sources: updatedSources,
      cachedAt: Date.now(),
    };
    saveCache(cacheData);

    set({
      channels: finalChannels,
      groups: deriveGroups(finalChannels),
      sources: updatedSources,
      isLoading: false,
      loadingProgress: 100,
      error: null,
      lastLoaded: Date.now(),
    });
  },

  refreshSource: async (sourceId: string) => {
    set((state) => ({
      sources: state.sources.map((s) =>
        s.id === sourceId ? { ...s, status: "loading" as const } : s
      ),
    }));

    try {
      const jsonSrc = JSON_PLAYLIST_SOURCES.find((s) => s.id === sourceId);
      if (jsonSrc) {
        const parsed = await fetchJsonPlaylist(jsonSrc);
        set((state) => {
          const others = state.channels.filter((c) => !c.id.startsWith(sourceId));
          const merged = sortChannels(mergeChannels(parsed, others));
          const sources = state.sources.map((s) =>
            s.id === sourceId
              ? { ...s, channelCount: parsed.length, lastUpdated: Date.now(), status: "ok" as const, error: undefined }
              : s
          );
          saveCache({ channels: merged, sources, cachedAt: Date.now() });
          return { channels: merged, groups: deriveGroups(merged), sources, lastLoaded: Date.now() };
        });
        return;
      }

      const m3uSrc = M3U_PLAYLIST_SOURCES.find((s) => s.id === sourceId);
      if (m3uSrc) {
        const text = await fetchPlaylistText(m3uSrc.url);
        const parsed = parseM3U(text, m3uSrc.id, m3uSrc.name);
        set((state) => {
          const others = state.channels.filter((c) => !c.id.startsWith(sourceId));
          const merged = sortChannels(deduplicateChannels([...others, ...parsed]));
          const sources = state.sources.map((s) =>
            s.id === sourceId
              ? { ...s, channelCount: parsed.length, lastUpdated: Date.now(), status: "ok" as const, error: undefined }
              : s
          );
          saveCache({ channels: merged, sources, cachedAt: Date.now() });
          return { channels: merged, groups: deriveGroups(merged), sources, lastLoaded: Date.now() };
        });
      }
    } catch (err) {
      set((state) => ({
        sources: state.sources.map((s) =>
          s.id === sourceId
            ? { ...s, status: "error" as const, error: err instanceof Error ? err.message : "Failed" }
            : s
        ),
      }));
    }
  },

  getChannelById: (id) => get().channels.find((c) => c.id === id),
  getChannelsByGroup: (group) => get().channels.filter((c) => c.group === group),
}));

// Auto-refresh every 30 min for token-expiry sources
let autoRefreshTimer: ReturnType<typeof setInterval> | null = null;

export function startAutoRefresh() {
  if (autoRefreshTimer) return;
  autoRefreshTimer = setInterval(() => {
    const store = useChannelStore.getState();
    if (!store.isLoading) store.loadChannels(true);
  }, 1000 * 60 * 30);
}

export function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}
