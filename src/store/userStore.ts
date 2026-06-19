import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Channel, ViewMode, WatchHistoryEntry } from "@/types";

interface UserStore {
  favorites: string[]; // channel ids
  pinned: string[]; // channel ids
  history: WatchHistoryEntry[];
  continueWatching: WatchHistoryEntry[];
  recentSearches: string[];
  viewMode: ViewMode;
  familyMode: boolean;
  hasOnboarded: boolean;

  toggleFavorite: (channel: Channel) => void;
  isFavorite: (channelId: string) => boolean;

  togglePinned: (channelId: string) => void;
  isPinned: (channelId: string) => boolean;

  addToHistory: (channel: Channel, duration?: number) => void;
  clearHistory: () => void;

  updateContinueWatching: (channel: Channel) => void;

  addSearchTerm: (term: string) => void;
  clearSearchHistory: () => void;

  setViewMode: (mode: ViewMode) => void;
  setFamilyMode: (enabled: boolean) => void;
  setOnboarded: (val: boolean) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      pinned: [],
      history: [],
      continueWatching: [],
      recentSearches: [],
      viewMode: "grid",
      familyMode: false,
      hasOnboarded: false,

      toggleFavorite: (channel) => {
        set((state) => {
          const exists = state.favorites.includes(channel.id);
          return {
            favorites: exists
              ? state.favorites.filter((id) => id !== channel.id)
              : [...state.favorites, channel.id],
          };
        });
      },
      isFavorite: (channelId) => get().favorites.includes(channelId),

      togglePinned: (channelId) => {
        set((state) => {
          const exists = state.pinned.includes(channelId);
          return {
            pinned: exists ? state.pinned.filter((id) => id !== channelId) : [...state.pinned, channelId],
          };
        });
      },
      isPinned: (channelId) => get().pinned.includes(channelId),

      addToHistory: (channel, duration = 0) => {
        set((state) => {
          const filtered = state.history.filter((h) => h.channelId !== channel.id);
          const entry: WatchHistoryEntry = {
            channelId: channel.id,
            channelName: channel.name,
            channelLogo: channel.logo,
            group: channel.group,
            watchedAt: Date.now(),
            duration,
          };
          return { history: [entry, ...filtered].slice(0, 100) };
        });
      },
      clearHistory: () => set({ history: [], continueWatching: [] }),

      updateContinueWatching: (channel) => {
        set((state) => {
          const filtered = state.continueWatching.filter((c) => c.channelId !== channel.id);
          const entry: WatchHistoryEntry = {
            channelId: channel.id,
            channelName: channel.name,
            channelLogo: channel.logo,
            group: channel.group,
            watchedAt: Date.now(),
            duration: 0,
          };
          return { continueWatching: [entry, ...filtered].slice(0, 20) };
        });
      },

      addSearchTerm: (term) => {
        const trimmed = term.trim();
        if (!trimmed) return;
        set((state) => {
          const filtered = state.recentSearches.filter((t) => t.toLowerCase() !== trimmed.toLowerCase());
          return { recentSearches: [trimmed, ...filtered].slice(0, 10) };
        });
      },
      clearSearchHistory: () => set({ recentSearches: [] }),

      setViewMode: (mode) => set({ viewMode: mode }),
      setFamilyMode: (enabled) => set({ familyMode: enabled }),
      setOnboarded: (val) => set({ hasOnboarded: val }),
    }),
    {
      name: "shahriar-tv-user-data",
    }
  )
);
