import {
  doc,
  setDoc,
  deleteDoc,
  increment,
  serverTimestamp,
  collection,
} from "firebase/firestore";
import { firestoreDb, isFirebaseConfigured } from "@/lib/firebase";

/**
 * Lightweight, no-backend analytics for the 5 metrics that actually matter
 * for an IPTV site (per your own scoping note): online users, channel
 * viewer count, most viewed channels, device analytics, country analytics.
 *
 * Honest limitations (read this before wiring up a dashboard around it):
 *
 * 1. "Online users" is heartbeat-based, not true real-time presence.
 *    Firestore has no onDisconnect() (that's a Realtime Database feature).
 *    Each open tab writes a heartbeat doc every ~20s; a session counts as
 *    "online" if its heartbeat is <60s old. Closing a tab is detected
 *    best-effort via `visibilitychange`/`pagehide` (not guaranteed to fire
 *    on a crash or force-quit), so there's up to ~60s of lag either way.
 *    This is the same tradeoff most small apps make without a dedicated
 *    realtime backend — fine for "how many people are watching right now,
 *    roughly," not fine for billing or SLAs.
 *
 * 2. "Country" comes from a free, keyless IP-geolocation API (geojs.io),
 *    called once per browser session and cached in sessionStorage. It's
 *    approximate (IP-based, not GPS), can be blocked by ad-blockers/VPNs,
 *    and is a third-party dependency outside your control. For
 *    production-grade accuracy you'd resolve geo server-side instead.
 *
 * 3. This data is currently written to PUBLIC Firestore collections
 *    (`presence`, `channelStats`) with open create/update rules, the same
 *    trust model your existing `siteSettings` collection uses. See the
 *    `firestore.rules` file added alongside this change — you still need
 *    to paste those rules into the Firebase console (or deploy via the
 *    Firebase CLI) for this to be properly locked down; nothing here can
 *    do that step for you.
 */

const HEARTBEAT_COLLECTION = "presence";
const STATS_COLLECTION = "channelStats";
const SESSION_KEY = "stv_session_id";
const COUNTRY_CACHE_KEY = "stv_country_cache";

export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // sessionStorage unavailable (private mode edge cases) — fall back to
    // an in-memory id that resets per page load; heartbeats still work.
    return `mem-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export type DeviceType = "mobile" | "tablet" | "desktop" | "tv";

export function getDeviceType(): DeviceType {
  const ua = navigator.userAgent || "";
  if (/smart-?tv|smarttv|googletv|appletv|hbbtv|netcast|viera|aft[a-z]/i.test(ua)) return "tv";
  if (/tablet|ipad|playbook|silk/i.test(ua) && !/mobile/i.test(ua)) return "tablet";
  if (/mobi|android.*mobile|iphone|ipod|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}

async function fetchCountry(): Promise<string> {
  try {
    const cached = sessionStorage.getItem(COUNTRY_CACHE_KEY);
    if (cached) return cached;
  } catch {
    // ignore, fall through to network fetch
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    // geojs.io — free, keyless, CORS-enabled IP geolocation. No SLA; if it's
    // ever down/blocked we fall back to "Unknown" rather than breaking the app.
    const res = await fetch("https://get.geojs.io/v1/ip/geo.json", { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error("geo lookup failed");
    const data = await res.json();
    const country = (data?.country as string) || "Unknown";
    try {
      sessionStorage.setItem(COUNTRY_CACHE_KEY, country);
    } catch {
      // ignore
    }
    return country;
  } catch {
    return "Unknown";
  }
}

let cachedCountryPromise: Promise<string> | null = null;
function getCountry(): Promise<string> {
  if (!cachedCountryPromise) cachedCountryPromise = fetchCountry();
  return cachedCountryPromise;
}

/**
 * Upserts this session's heartbeat doc. Call on an interval (~20s) while
 * the app is open, and once immediately when the watched channel changes.
 */
export async function reportHeartbeat(channelId: string | null, channelName: string | null) {
  if (!isFirebaseConfigured) return;
  try {
    const [country] = await Promise.all([getCountry()]);
    const sessionId = getSessionId();
    await setDoc(
      doc(firestoreDb, HEARTBEAT_COLLECTION, sessionId),
      {
        sessionId,
        channelId: channelId || null,
        channelName: channelName || null,
        device: getDeviceType(),
        country,
        lastSeen: Date.now(),
        // serverTimestamp kept alongside the client timestamp above —
        // `lastSeen` (client time) is what we query/sort on so the "online
        // in the last 60s" check still works even if a client's clock is
        // off relative to itself across writes; serverUpdatedAt is just a
        // sanity-check field for the admin dashboard.
        serverUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    // Analytics must never break playback or navigation.
    console.warn("[Analytics] heartbeat failed:", err);
  }
}

/** Best-effort cleanup when a tab actually closes. Not guaranteed to fire. */
export async function clearHeartbeat() {
  if (!isFirebaseConfigured) return;
  try {
    await deleteDoc(doc(firestoreDb, HEARTBEAT_COLLECTION, getSessionId()));
  } catch {
    // ignore — the doc will simply age out of the "online" window
  }
}

const reportedThisSession = new Set<string>();

/**
 * Increments the all-time view counter for a channel. Called once per
 * watch session (debounced via an in-memory Set) from WatchPage, not on
 * every re-render.
 */
export async function incrementChannelView(channelId: string, channelName: string) {
  if (!isFirebaseConfigured || !channelId) return;
  if (reportedThisSession.has(channelId)) return;
  reportedThisSession.add(channelId);
  try {
    await setDoc(
      doc(collection(firestoreDb, STATS_COLLECTION), channelId),
      { channelId, channelName, totalViews: increment(1), lastViewedAt: Date.now() },
      { merge: true }
    );
  } catch (err) {
    console.warn("[Analytics] view increment failed:", err);
  }
}
