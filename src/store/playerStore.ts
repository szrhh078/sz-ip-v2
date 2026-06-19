import { create } from "zustand";
import type { Channel } from "@/types";

interface PlayerUIStore {
  miniPlayerChannel: Channel | null;
  isTheaterMode: boolean;
  /**
   * True while the player is in "immersive" fullscreen (either real
   * Fullscreen API or the iOS Safari CSS pseudo-fullscreen fallback).
   * Layout.tsx reads this to hide the Header/BottomNav chrome so video
   * gets the full screen — independent of which fullscreen mechanism the
   * browser actually used.
   */
  isImmersiveFullscreen: boolean;

  setMiniPlayerChannel: (channel: Channel | null) => void;
  setTheaterMode: (val: boolean) => void;
  setImmersiveFullscreen: (val: boolean) => void;
}

export const usePlayerUIStore = create<PlayerUIStore>((set) => ({
  miniPlayerChannel: null,
  isTheaterMode: false,
  isImmersiveFullscreen: false,

  setMiniPlayerChannel: (channel) => set({ miniPlayerChannel: channel }),
  setTheaterMode: (val) => set({ isTheaterMode: val }),
  setImmersiveFullscreen: (val) => set({ isImmersiveFullscreen: val }),
}));
