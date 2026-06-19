import { create } from "zustand";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { firestoreDb, isFirebaseConfigured } from "@/lib/firebase";
import type { DeviceType } from "@/lib/analytics";

const ONLINE_WINDOW_MS = 60_000;

interface PresenceDoc {
  sessionId: string;
  channelId: string | null;
  channelName: string | null;
  device: DeviceType;
  country: string;
  lastSeen: number;
}

interface ChannelStatDoc {
  channelId: string;
  channelName: string;
  totalViews: number;
}

interface AnalyticsStore {
  isLoaded: boolean;
  presence: PresenceDoc[];
  topViewedChannels: ChannelStatDoc[];

  // Derived getters (computed on read, not stored, so they're always
  // consistent with the 60s "online" window at the moment of the call)
  onlineCount: () => number;
  channelViewerCounts: () => { channelId: string; channelName: string; count: number }[];
  deviceBreakdown: () => { device: DeviceType; count: number }[];
  countryBreakdown: () => { country: string; count: number }[];

  init: () => () => void; // returns unsubscribe
}

export const useAnalyticsStore = create<AnalyticsStore>((set, get) => ({
  isLoaded: false,
  presence: [],
  topViewedChannels: [],

  onlineCount: () => {
    const cutoff = Date.now() - ONLINE_WINDOW_MS;
    return get().presence.filter((p) => p.lastSeen > cutoff).length;
  },

  channelViewerCounts: () => {
    const cutoff = Date.now() - ONLINE_WINDOW_MS;
    const counts = new Map<string, { channelId: string; channelName: string; count: number }>();
    get().presence.forEach((p) => {
      if (!p.channelId || p.lastSeen <= cutoff) return;
      const existing = counts.get(p.channelId);
      if (existing) existing.count++;
      else counts.set(p.channelId, { channelId: p.channelId, channelName: p.channelName || p.channelId, count: 1 });
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count);
  },

  deviceBreakdown: () => {
    const cutoff = Date.now() - ONLINE_WINDOW_MS;
    const counts = new Map<DeviceType, number>();
    get().presence.forEach((p) => {
      if (p.lastSeen <= cutoff) return;
      counts.set(p.device, (counts.get(p.device) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count);
  },

  countryBreakdown: () => {
    const cutoff = Date.now() - ONLINE_WINDOW_MS;
    const counts = new Map<string, number>();
    get().presence.forEach((p) => {
      if (p.lastSeen <= cutoff) return;
      counts.set(p.country, (counts.get(p.country) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);
  },

  init: () => {
    if (!isFirebaseConfigured) {
      set({ isLoaded: true });
      return () => {};
    }

    const unsubPresence = onSnapshot(
      collection(firestoreDb, "presence"),
      (snap) => {
        const docs: PresenceDoc[] = snap.docs.map((d) => d.data() as PresenceDoc);
        set({ presence: docs, isLoaded: true });
      },
      (err) => {
        console.warn("[Analytics] presence subscription failed:", err);
        set({ isLoaded: true });
      }
    );

    const topQuery = query(collection(firestoreDb, "channelStats"), orderBy("totalViews", "desc"), limit(10));
    const unsubStats = onSnapshot(
      topQuery,
      (snap) => {
        set({ topViewedChannels: snap.docs.map((d) => d.data() as ChannelStatDoc) });
      },
      (err) => {
        console.warn("[Analytics] channelStats subscription failed:", err);
      }
    );

    return () => {
      unsubPresence();
      unsubStats();
    };
  },
}));
