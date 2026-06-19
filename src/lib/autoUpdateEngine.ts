import { useChannelStore } from "@/store/channelStore";
import { idbSetMeta, idbGetMeta, idbCleanup, idbCacheLogo } from "@/lib/indexedDbCache";

/**
 * Auto Update Engine
 * ──────────────────────────────────────────────────────────────────────────
 * Background sync that runs every 6 hours (as requested) for:
 *   - Channel/playlist sync (delegates to existing channelStore.loadChannels)
 *   - EPG sync (placeholder hook — wires in if/when an EPG source is added,
 *     does not invent fake data)
 *   - Logo refresh (re-fetches and caches channel logos in IndexedDB so the
 *     app keeps working offline and logos don't need re-downloading)
 *   - IndexedDB cleanup (purges stale cache entries)
 *
 * This supplements (does not replace) the existing 30-minute
 * startAutoRefresh()/stopAutoRefresh() in channelStore.ts, which stays in
 * place for fast token-expiry recovery. This engine handles the slower,
 * heavier 6-hour full-sync cycle.
 */

const SIX_HOURS_MS = 1000 * 60 * 60 * 6;
const META_KEY_LAST_FULL_SYNC = "last-full-sync";
const META_KEY_LAST_LOGO_REFRESH = "last-logo-refresh";

let updateEngineTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

async function syncChannels(): Promise<void> {
  console.log("[AutoUpdateEngine] Syncing channels/playlists...");
  const store = useChannelStore.getState();
  if (!store.isLoading) {
    await store.loadChannels(true);
  }
}

async function syncEpg(): Promise<void> {
  // Placeholder hook: no EPG source is currently wired into the app.
  // When one is added, plug the fetch+parse call in here. Left as a
  // documented no-op rather than fabricating data.
  console.log("[AutoUpdateEngine] EPG sync skipped — no EPG source configured");
}

async function refreshLogos(): Promise<void> {
  console.log("[AutoUpdateEngine] Refreshing channel logos...");
  const channels = useChannelStore.getState().channels;
  const withLogos = channels.filter((c) => c.logo).slice(0, 200); // cap per cycle to stay light

  let refreshed = 0;
  for (const ch of withLogos) {
    try {
      const res = await fetch(ch.logo, { mode: "cors" }).catch(() => fetch(ch.logo, { mode: "no-cors" }));
      if (res && res.ok) {
        const blob = await res.blob();
        await idbCacheLogo(ch.logo, blob);
        refreshed++;
      }
    } catch {
      // Logo fetch failures are non-critical — skip silently
    }
    // Yield occasionally to avoid hammering the network/main thread
    if (refreshed % 20 === 0) await new Promise((r) => setTimeout(r, 50));
  }
  console.log(`[AutoUpdateEngine] Refreshed ${refreshed}/${withLogos.length} logos`);
  await idbSetMeta(META_KEY_LAST_LOGO_REFRESH, Date.now());
}

async function runFullSyncCycle(): Promise<void> {
  if (isRunning) {
    console.log("[AutoUpdateEngine] Sync already in progress, skipping overlapping run");
    return;
  }
  isRunning = true;
  console.log("[AutoUpdateEngine] ── Starting 6-hour sync cycle ──");

  try {
    await syncChannels();
    await syncEpg();
    await refreshLogos();
    await idbCleanup();
    await idbSetMeta(META_KEY_LAST_FULL_SYNC, Date.now());
    console.log("[AutoUpdateEngine] ── Sync cycle complete ──");
  } catch (err) {
    console.error("[AutoUpdateEngine] Sync cycle failed:", err);
  } finally {
    isRunning = false;
  }
}

/**
 * Starts the 6-hour background update engine. Safe to call multiple times
 * (no-ops if already running). Also runs an immediate check on startup —
 * if the last full sync was more than 6 hours ago (or never happened),
 * it kicks off a sync right away instead of waiting for the next interval.
 */
export async function startAutoUpdateEngine(): Promise<void> {
  if (updateEngineTimer) return;

  const lastSync = await idbGetMeta<number>(META_KEY_LAST_FULL_SYNC);
  if (!lastSync || Date.now() - lastSync > SIX_HOURS_MS) {
    console.log("[AutoUpdateEngine] Stale or missing last sync — running initial sync");
    // Don't block app startup; run in background
    runFullSyncCycle();
  }

  updateEngineTimer = setInterval(runFullSyncCycle, SIX_HOURS_MS);
  console.log("[AutoUpdateEngine] Started — sync every 6 hours");
}

export function stopAutoUpdateEngine(): void {
  if (updateEngineTimer) {
    clearInterval(updateEngineTimer);
    updateEngineTimer = null;
  }
}

/** Manual trigger, e.g. from an admin "Force Full Sync" button */
export async function triggerManualSync(): Promise<void> {
  await runFullSyncCycle();
}

export async function getLastSyncTime(): Promise<number | undefined> {
  return idbGetMeta<number>(META_KEY_LAST_FULL_SYNC);
}
