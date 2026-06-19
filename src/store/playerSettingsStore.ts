import { create } from "zustand";
import { persist } from "zustand/middleware";

export type FitMode = "smart" | "contain" | "cover" | "fill";
export type PreferredEngine = "auto" | "hls.js" | "shaka" | "mpegts" | "native";
export type BufferSize = "low" | "auto" | "high";

interface PlayerSettingsStore {
  // Playback
  autoPlay: boolean;
  autoRotate: boolean; // false = lock orientation, true = follow device rotation
  autoNextChannel: boolean; // jump to next channel in group on unrecoverable error

  // Video
  fitMode: FitMode;

  // Player / engine
  preferredEngine: PreferredEngine;
  enableFallbackChain: boolean;
  lowLatencyMode: boolean;

  // Performance
  hardwareAcceleration: boolean; // best-effort hint only, see comment in VideoPlayer
  bufferSize: BufferSize;

  // Gestures
  gesturesEnabled: boolean;

  setAutoPlay: (v: boolean) => void;
  setAutoRotate: (v: boolean) => void;
  setAutoNextChannel: (v: boolean) => void;
  setFitMode: (v: FitMode) => void;
  setPreferredEngine: (v: PreferredEngine) => void;
  setEnableFallbackChain: (v: boolean) => void;
  setLowLatencyMode: (v: boolean) => void;
  setHardwareAcceleration: (v: boolean) => void;
  setBufferSize: (v: BufferSize) => void;
  setGesturesEnabled: (v: boolean) => void;
}

/**
 * Global, persisted player preferences. Read by useHlsPlayer (engine/buffer/
 * latency behavior) and VideoPlayer (fit mode, rotation, gestures). Kept in
 * its own store (separate from playerStore.ts, which is transient per-session
 * UI state like mini player / theater mode) so user preferences survive reloads.
 */
export const usePlayerSettingsStore = create<PlayerSettingsStore>()(
  persist(
    (set) => ({
      autoPlay: true,
      autoRotate: false,
      autoNextChannel: false,

      fitMode: "smart",

      preferredEngine: "auto",
      enableFallbackChain: true,
      lowLatencyMode: false,

      hardwareAcceleration: true,
      bufferSize: "auto",

      gesturesEnabled: true,

      setAutoPlay: (v) => set({ autoPlay: v }),
      setAutoRotate: (v) => set({ autoRotate: v }),
      setAutoNextChannel: (v) => set({ autoNextChannel: v }),
      setFitMode: (v) => set({ fitMode: v }),
      setPreferredEngine: (v) => set({ preferredEngine: v }),
      setEnableFallbackChain: (v) => set({ enableFallbackChain: v }),
      setLowLatencyMode: (v) => set({ lowLatencyMode: v }),
      setHardwareAcceleration: (v) => set({ hardwareAcceleration: v }),
      setBufferSize: (v) => set({ bufferSize: v }),
      setGesturesEnabled: (v) => set({ gesturesEnabled: v }),
    }),
    { name: "shahriar-tv-player-settings" }
  )
);
