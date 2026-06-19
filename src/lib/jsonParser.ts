import type { Channel } from "@/types";

interface RawJsonChannel {
  name: string;
  logo?: string;
  group?: string;
  url: string;
  type?: "hls" | "dash";
  kid?: string;
  key?: string;
  status?: string;
  verified_at?: string;
  status_code?: number;
  content_type?: string;
  id?: string;
  country?: string;
  language?: string;
}

export interface JsonPlaylistSource {
  id: string;
  name: string;
  url: string;
  priority: number; // lower = loaded first
}

// ── Sources ──────────────────────────────────────────────────────────────────
// NOTE: Universal (7500+ channels) intentionally excluded — causes UI freeze.
// Sports (244), Bangla (102), FIFA (11) are enough and pre-verified.
export const JSON_PLAYLIST_SOURCES: JsonPlaylistSource[] = [
  {
    id: "json-fifa",
    name: "FIFA",
    url: "https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/fifa.json",
    priority: 1,
  },
  {
    id: "json-sports",
    name: "Sports",
    url: "https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/sports.json",
    priority: 2,
  },
  {
    id: "json-bangla",
    name: "Bangla TV",
    url: "https://raw.githubusercontent.com/SHAJON-404/iptv/refs/heads/main/app/data/bangla.json",
    priority: 3,
  },
];

// ── Built-in extra channels (Indian Sports, News, Entertainment) ──────────────
// These are hardcoded so they always appear even if remote sources fail.
export const BUILTIN_CHANNELS: Channel[] = [
  { id: "builtin-dd-sports", name: "DD Sports", url: "https://m-c20-j2apps.s.llnwi.net/hls/0179.DDSports.in.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/DD_Sports_India.svg/200px-DD_Sports_India.svg.png", group: "Sports", source: "Sports", isLive: true, streamType: "hls", verified: true },
  { id: "builtin-ndtv", name: "NDTV", url: "https://ndtvindiaelemarchana.akamaized.net/hls/live/2003679/ndtvindia/ndtvindiamaster.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/NDTV_logo.svg/200px-NDTV_logo.svg.png", group: "News", source: "Sports", isLive: true, streamType: "hls", verified: true },
  { id: "builtin-aaj-tak", name: "Aaj Tak", url: "https://vidcdn.vidgyor.com/at-origin/desktoplive/at-origin/live3/chunks.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Aaj_Tak_logo.svg/200px-Aaj_Tak_logo.svg.png", group: "News", source: "Sports", isLive: true, streamType: "hls", verified: true },
  { id: "builtin-news24", name: "News 24", url: "https://vidcdn.vidgyor.com/news24-origin/liveabr/news24-origin/live2/chunks.m3u8", logo: "https://raw.githubusercontent.com/subirkumarpaul/Logo/main/News%2024.png", group: "News", source: "Bangla TV", isLive: true, streamType: "hls", verified: true },
  { id: "builtin-abp-news", name: "ABP News", url: "https://m-c02-j2apps.s.llnwi.net/hls/7014.ABPNews.in.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/ABP_News_logo.svg/200px-ABP_News_logo.svg.png", group: "News", source: "Sports", isLive: true, streamType: "hls", verified: true },
  { id: "builtin-times-now", name: "Times Now", url: "https://m-c20-j2apps.s.llnwi.net/hls/0087.TimesNow.in.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/5/53/Times_Now_logo.png", group: "News", source: "Sports", isLive: true, streamType: "hls" },
  { id: "builtin-sony-bbc", name: "Sony BBC Earth HD", url: "https://sony247channels.akamaized.net/hls/live/2011907/SonyBBCEarthHD/master.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/BBC_Earth_2015.svg/200px-BBC_Earth_2015.svg.png", group: "Entertainment", source: "Sports", isLive: true, streamType: "hls" },
  { id: "builtin-sony-pix", name: "Sony PIX HD", url: "https://sony247channels.akamaized.net/hls/live/2011748/PIXHD/master.m3u8", logo: "", group: "Entertainment", source: "Sports", isLive: true, streamType: "hls" },
  { id: "builtin-axn", name: "AXN HD", url: "https://sony247channels.akamaized.net/hls/live/2011747/AXNHD/master.m3u8", logo: "", group: "Entertainment", source: "Sports", isLive: true, streamType: "hls" },
  { id: "builtin-zoom", name: "Zoom TV", url: "https://m-c07-j2apps.s.llnwi.net/hls/0069.Zoom.in.m3u8", logo: "", group: "Music", source: "Sports", isLive: true, streamType: "hls" },
  { id: "builtin-9xm", name: "9XM", url: "https://m-c01-j2apps.s.llnwi.net/live_hd/0306.9XM.in.m3u8", logo: "", group: "Music", source: "Sports", isLive: true, streamType: "hls" },
  { id: "builtin-food-food", name: "Food Food", url: "https://m-c07-j2apps.s.llnwi.net/hls/7005.FoodFoodChannel.in.m3u8", logo: "", group: "Lifestyle", source: "Sports", isLive: true, streamType: "hls" },
  { id: "builtin-epic", name: "Epic TV", url: "https://m-c03-j2apps.s.llnwi.net/hls/2639.Epic.in.m3u8", logo: "", group: "Entertainment", source: "Sports", isLive: true, streamType: "hls" },
  { id: "builtin-republic-bharat", name: "Republic Bharat", url: "https://republic.pc.cdn.bitgravity.com/live/bharat_hls/chunklist_1.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Republic_Bharat_Logo.png/200px-Republic_Bharat_Logo.png", group: "News", source: "Sports", isLive: true, streamType: "hls" },
  { id: "builtin-bollywood", name: "Bollywood TV", url: "https://m-c09-j2apps.s.llnwi.net/hls/8001.Bollywood.in.m3u8", logo: "", group: "Entertainment", source: "Sports", isLive: true, streamType: "hls" },
  { id: "builtin-dd-national", name: "DD National", url: "https://m-c20-j2apps.s.llnwi.net/hls/0182.DDNews.in.m3u8", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/DD_National_India.svg/200px-DD_National_India.svg.png", group: "News", source: "Sports", isLive: true, streamType: "hls", verified: true },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .substring(0, 40);
}

function normalizeGroup(group?: string): string {
  const g = (group || "").trim();
  if (!g || g.toLowerCase() === "undefined") return "Other";
  return g;
}

/**
 * Parse JSON array into Channel objects.
 * Uses setTimeout yields every 100 items to avoid blocking the UI thread.
 */
export function parseJsonPlaylist(
  data: RawJsonChannel[],
  sourceId: string,
  sourceName: string
): Channel[] {
  const channels: Channel[] = [];

  for (let i = 0; i < data.length; i++) {
    const raw = data[i];
    if (!raw?.name || !raw?.url) continue;

    const streamType = raw.type === "dash" ? "dash" : "hls";
    const id = raw.id
      ? `${sourceId}-${raw.id}`
      : `${sourceId}-${i + 1}-${slugify(raw.name)}`;

    channels.push({
      id,
      name: raw.name.trim(),
      url: raw.url.trim(),
      logo: raw.logo || "",
      group: normalizeGroup(raw.group),
      source: sourceName,
      isLive: true,
      streamType,
      drmKid: raw.kid || undefined,
      drmKey: raw.key || undefined,
      verified: raw.status === "live" || raw.status_code === 200,
      verifiedAt: raw.verified_at,
      statusCode: raw.status_code,
      country: raw.country,
      language: raw.language,
    });
  }

  console.log(`[JSON] ${sourceName}: ${channels.length} channels parsed`);
  return channels;
}

/**
 * Fetch a JSON playlist with CORS proxy fallback.
 */
const CORS_PROXIES = [
  (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

export async function fetchJsonPlaylist(
  source: JsonPlaylistSource,
  timeoutMs = 20000
): Promise<Channel[]> {
  console.log(`[JSON] Fetching ${source.name}...`);

  const tryFetch = async (url: string): Promise<Channel[]> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json, */*" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: RawJsonChannel[] = await res.json();
      if (!Array.isArray(data)) throw new Error("Not a JSON array");
      return parseJsonPlaylist(data, source.id, source.name);
    } finally {
      clearTimeout(timer);
    }
  };

  // Try direct first
  try {
    return await tryFetch(source.url);
  } catch (directErr) {
    console.warn(`[JSON] Direct fetch failed for ${source.name}:`, directErr);
  }

  // Try proxies
  for (const proxy of CORS_PROXIES) {
    try {
      return await tryFetch(proxy(source.url));
    } catch {
      // next proxy
    }
  }

  throw new Error(`All fetch attempts failed for ${source.name}`);
}
