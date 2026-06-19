import { openDB, type IDBPDatabase } from "idb";
import type { Channel } from "@/types";

/**
 * Centralized IndexedDB cache for SZ IPTV.
 * Replaces/extends the old localStorage-only cache with a higher-capacity,
 * non-blocking async store. localStorage is still used as a tiny "pointer"
 * cache for instant first-paint (see channelStore), this is the bulk store.
 */

const DB_NAME = "shahriar-tv-cache";
const DB_VERSION = 1;

export const STORES = {
  channels: "channels",
  epg: "epg",
  logos: "logos",
  meta: "meta",
} as const;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORES.channels)) {
          db.createObjectStore(STORES.channels, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(STORES.epg)) {
          db.createObjectStore(STORES.epg, { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains(STORES.logos)) {
          db.createObjectStore(STORES.logos, { keyPath: "url" });
        }
        if (!db.objectStoreNames.contains(STORES.meta)) {
          db.createObjectStore(STORES.meta, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

// ── Channel cache ─────────────────────────────────────────────────────────────
interface ChannelCacheEntry {
  key: string; // e.g. "all-channels"
  channels: Channel[];
  sourcesSnapshot: unknown;
  cachedAt: number;
}

export async function idbSaveChannels(key: string, channels: Channel[], sourcesSnapshot: unknown) {
  try {
    const db = await getDb();
    await db.put(STORES.channels, {
      key,
      channels,
      sourcesSnapshot,
      cachedAt: Date.now(),
    } satisfies ChannelCacheEntry);
  } catch (err) {
    console.warn("[IndexedDB] Failed to save channels:", err);
  }
}

export async function idbLoadChannels(key: string): Promise<ChannelCacheEntry | undefined> {
  try {
    const db = await getDb();
    return await db.get(STORES.channels, key);
  } catch (err) {
    console.warn("[IndexedDB] Failed to load channels:", err);
    return undefined;
  }
}

// ── EPG cache (electronic programme guide, per-channel schedule) ───────────────
export interface EpgEntry {
  channelId: string;
  programs: { title: string; start: number; end: number; description?: string }[];
  cachedAt: number;
}

export async function idbSaveEpg(channelId: string, programs: EpgEntry["programs"]) {
  try {
    const db = await getDb();
    await db.put(STORES.epg, { channelId, key: channelId, programs, cachedAt: Date.now() });
  } catch (err) {
    console.warn("[IndexedDB] Failed to save EPG:", err);
  }
}

export async function idbLoadEpg(channelId: string): Promise<EpgEntry | undefined> {
  try {
    const db = await getDb();
    return await db.get(STORES.epg, channelId);
  } catch {
    return undefined;
  }
}

// ── Logo cache (data URLs for offline logo display) ─────────────────────────────
export async function idbCacheLogo(url: string, blob: Blob) {
  try {
    const db = await getDb();
    await db.put(STORES.logos, { url, blob, cachedAt: Date.now() });
  } catch {
    // non-critical, ignore
  }
}

export async function idbGetCachedLogo(url: string): Promise<Blob | undefined> {
  try {
    const db = await getDb();
    const entry = await db.get(STORES.logos, url);
    return entry?.blob;
  } catch {
    return undefined;
  }
}

// ── Generic meta key-value (last sync times, etc.) ──────────────────────────────
export async function idbSetMeta(key: string, value: unknown) {
  try {
    const db = await getDb();
    await db.put(STORES.meta, { key, value, updatedAt: Date.now() });
  } catch {
    // ignore
  }
}

export async function idbGetMeta<T = unknown>(key: string): Promise<T | undefined> {
  try {
    const db = await getDb();
    const entry = await db.get(STORES.meta, key);
    return entry?.value as T | undefined;
  } catch {
    return undefined;
  }
}

// ── Auto cleanup: remove stale entries older than maxAge ────────────────────────
export async function idbCleanup(maxAgeMs = 1000 * 60 * 60 * 24 * 7) {
  try {
    const db = await getDb();
    const now = Date.now();

    for (const storeName of [STORES.epg, STORES.logos]) {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      let cursor = await store.openCursor();
      let removed = 0;
      while (cursor) {
        const val = cursor.value as { cachedAt?: number };
        if (val.cachedAt && now - val.cachedAt > maxAgeMs) {
          await cursor.delete();
          removed++;
        }
        cursor = await cursor.continue();
      }
      await tx.done;
      if (removed > 0) console.log(`[IndexedDB] Cleaned ${removed} stale entries from ${storeName}`);
    }
  } catch (err) {
    console.warn("[IndexedDB] Cleanup failed:", err);
  }
}
