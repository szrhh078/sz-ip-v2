import { useEffect, useRef, useState, useCallback } from "react";
import type Hls from "hls.js";
import type { PlayerState } from "@/types";
import { usePlayerSettingsStore } from "@/store/playerSettingsStore";

/**
 * Multi-Player Engine Handler
 * ──────────────────────────────────────────────────────────────────────────
 * True cascading fallback chain (per stream attempt), in priority order:
 *   1. HLS.js     — primary for .m3u8 / hls streamType
 *   2. Shaka       — DASH primary, and HLS/DASH fallback if a higher engine
 *                    fails fatally
 *   3. mpegts.js   — handles raw MPEG-TS / HTTP-FLV streams that neither
 *                    HLS.js nor Shaka can parse (common with some IPTV
 *                    sources that serve a transport stream directly rather
 *                    than an HLS playlist or DASH manifest)
 *   4. Native      — final fallback: native <video> (Safari's built-in HLS,
 *                    or anything the browser can play unassisted)
 *
 * Engine selection respects the user's "Preferred Engine" / "Enable
 * Fallback Chain" settings (playerSettingsStore): a non-"auto" preference
 * is tried first (if compatible with the stream type), and disabling the
 * fallback chain means we surface an error after the first attempt instead
 * of cascading. Settings are read once per stream load — changing them
 * mid-playback takes effect on the next channel switch / retry, not by
 * tearing down an already-working stream.
 *
 * Across every fallback switch we explicitly preserve playback position
 * (when the new engine's seekable range still covers it — live edges move,
 * so this is best-effort), mute state, and volume. Fullscreen state is
 * untouched by any of this because we only ever swap the source on the
 * existing <video> element inside its existing container — we never need
 * to re-request fullscreen.
 */

const INITIAL_STATE: PlayerState = {
  isPlaying: false,
  isMuted: false,
  volume: 1,
  isFullscreen: false,
  isPiP: false,
  isTheater: false,
  quality: "auto",
  qualities: [],
  buffering: true,
  error: null,
  reconnectAttempts: 0,
  bufferHealth: 0,
  networkQuality: "unknown",
};

const MAX_RECONNECT = 5;
const STALL_CHECK_INTERVAL_MS = 4000;
const STALL_TICKS_BEFORE_RECOVERY = 3; // ~12s of zero progress while "playing"

export type PlayerEngine = "hls.js" | "shaka" | "mpegts" | "native";

interface UseHlsPlayerOptions {
  streamUrl: string | null;
  streamType?: "hls" | "dash";
  drmKid?: string;
  drmKey?: string;
}

interface EngineSettingsSnapshot {
  preferredEngine: string;
  enableFallbackChain: boolean;
  lowLatencyMode: boolean;
  bufferSize: "low" | "auto" | "high";
  autoPlay: boolean;
}

function buildEngineChain(isDash: boolean, settings: EngineSettingsSnapshot): PlayerEngine[] {
  const compatible: PlayerEngine[] = isDash ? ["shaka", "native"] : ["hls.js", "shaka", "mpegts", "native"];
  let chain = compatible;

  const preferred = settings.preferredEngine as PlayerEngine | "auto";
  if (preferred !== "auto" && compatible.includes(preferred)) {
    chain = [preferred, ...compatible.filter((e) => e !== preferred)];
  }

  return settings.enableFallbackChain ? chain : [chain[0]];
}

export function useHlsPlayer(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  urlOrOptions: string | null | UseHlsPlayerOptions
) {
  const opts: UseHlsPlayerOptions =
    typeof urlOrOptions === "string" || urlOrOptions === null
      ? { streamUrl: urlOrOptions }
      : urlOrOptions;

  const { streamUrl, streamType = "hls", drmKid, drmKey } = opts;

  const hlsRef = useRef<Hls | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shakaRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mpegtsRef = useRef<any>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTime = useRef(0);
  const savedMuted = useRef(false);
  const savedVolume = useRef(1);

  const [state, setState] = useState<PlayerState>(INITIAL_STATE);
  const [engine, setEngine] = useState<PlayerEngine | null>(null);

  const update = useCallback((patch: Partial<PlayerState>) => {
    setState((p) => ({ ...p, ...patch }));
  }, []);

  // ── Main effect: set up the engine chain when stream URL or type changes ──
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setState((p) => ({ ...INITIAL_STATE, volume: p.volume, isMuted: p.isMuted }));

    const settings: EngineSettingsSnapshot = usePlayerSettingsStore.getState();
    const isDash = streamType === "dash" || streamUrl.endsWith(".mpd");
    const chain = buildEngineChain(isDash, settings);
    let chainIndex = 0;
    let destroyed = false;

    const cleanupEngines = () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (shakaRef.current) {
        shakaRef.current.destroy().catch(() => {});
        shakaRef.current = null;
      }
      if (mpegtsRef.current) {
        try {
          mpegtsRef.current.destroy();
        } catch {
          // already torn down
        }
        mpegtsRef.current = null;
      }
    };

    const capturePlaybackState = () => {
      const v = videoRef.current;
      if (!v) return;
      if (Number.isFinite(v.currentTime) && v.currentTime > 0) savedTime.current = v.currentTime;
      savedMuted.current = v.muted;
      savedVolume.current = v.volume;
    };

    const restorePlaybackState = () => {
      const v = videoRef.current;
      if (!v) return;
      v.muted = savedMuted.current;
      v.volume = savedVolume.current;
      if (savedTime.current <= 0) return;
      try {
        if (v.seekable && v.seekable.length > 0) {
          const liveEdge = v.seekable.end(v.seekable.length - 1);
          const target = Math.min(savedTime.current, Math.max(0, liveEdge - 0.5));
          if (target > 0) v.currentTime = target;
        }
      } catch {
        // Live edge moved past the saved position, or seeking unsupported on
        // this engine/stream — playback continues from wherever it starts.
      }
    };

    const advance = () => {
      if (destroyed) return;
      chainIndex++;
      if (chainIndex >= chain.length) {
        update({
          error: "Stream unavailable on all playback engines — channel may be offline or geo-restricted.",
          buffering: false,
        });
        return;
      }
      console.warn(`[MultiPlayer] Falling back to next engine: ${chain[chainIndex]}`);
      capturePlaybackState();
      cleanupEngines();
      setEngine(chain[chainIndex]);
      runEngine(chain[chainIndex]);
    };

    const runEngine = (eng: PlayerEngine) => {
      switch (eng) {
        case "hls.js":
          initHlsPlayer(video, streamUrl, hlsRef, reconnectTimer, update, settings, advance, restorePlaybackState);
          break;
        case "shaka":
          initShakaPlayer(video, streamUrl, drmKid, drmKey, shakaRef, update, advance, restorePlaybackState);
          break;
        case "mpegts":
          initMpegtsPlayer(video, streamUrl, mpegtsRef, update, settings, advance, restorePlaybackState);
          break;
        case "native":
          initNativePlayer(video, streamUrl, update, settings.autoPlay, advance, restorePlaybackState);
          break;
      }
    };

    cleanupEngines();
    video.src = "";
    setEngine(chain[0]);
    runEngine(chain[0]);

    return () => {
      destroyed = true;
      cleanupEngines();
      video.src = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl, streamType]);

  // ── Sync video events → state ─────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlers: [string, () => void][] = [
      ["play", () => update({ isPlaying: true })],
      ["pause", () => update({ isPlaying: false })],
      ["waiting", () => update({ buffering: true })],
      ["playing", () => update({ buffering: false })],
      ["volumechange", () => update({ volume: video.volume, isMuted: video.muted })],
      ["enterpictureinpicture", () => update({ isPiP: true })],
      ["leavepictureinpicture", () => update({ isPiP: false })],
    ];

    handlers.forEach(([evt, fn]) => video.addEventListener(evt, fn));
    return () => handlers.forEach(([evt, fn]) => video.removeEventListener(evt, fn));
  }, [videoRef, update]);

  // ── Fullscreen change listener ─────────────────────────────────────────────
  useEffect(() => {
    const onFs = () => update({ isFullscreen: !!document.fullscreenElement });
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [update]);

  // ── Buffer health monitor (seconds buffered ahead of playback position) ───
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const id = setInterval(() => {
      try {
        const buffered = video.buffered;
        let ahead = 0;
        for (let i = 0; i < buffered.length; i++) {
          if (video.currentTime >= buffered.start(i) && video.currentTime <= buffered.end(i)) {
            ahead = buffered.end(i) - video.currentTime;
            break;
          }
        }
        update({ bufferHealth: Math.max(0, Math.round(ahead * 10) / 10) });
      } catch {
        // ignore — buffered/currentTime can throw briefly during engine swaps
      }
    }, 2000);
    return () => clearInterval(id);
  }, [videoRef, update]);

  // ── Network quality detection (best-effort, Chromium/Android only) ───────
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (!conn) return;
    const classify = () => {
      const type = conn.effectiveType as string | undefined;
      let quality: PlayerState["networkQuality"] = "unknown";
      if (type === "slow-2g" || type === "2g") quality = "slow";
      else if (type === "3g") quality = "medium";
      else if (type === "4g") quality = "fast";
      update({ networkQuality: quality });
    };
    classify();
    conn.addEventListener?.("change", classify);
    return () => conn.removeEventListener?.("change", classify);
  }, [update]);

  // ── Controls ───────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, [videoRef]);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (v) v.muted = !v.muted;
  }, [videoRef]);

  const setVolume = useCallback((vol: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = Math.max(0, Math.min(1, vol));
    if (vol > 0 && v.muted) v.muted = false;
  }, [videoRef]);

  const toggleFullscreen = useCallback((containerEl?: HTMLElement | null) => {
    const target = containerEl || videoRef.current;
    if (!target) return;
    if (!document.fullscreenElement) {
      target.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [videoRef]);

  const togglePiP = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await v.requestPictureInPicture();
      }
    } catch {
      // Unsupported or blocked
    }
  }, [videoRef]);

  const setQuality = useCallback((quality: string) => {
    const hls = hlsRef.current;
    if (!hls) return;
    if (quality === "auto") {
      hls.currentLevel = -1;
      update({ quality: "auto" });
    } else {
      const idx = hls.levels.findIndex((l) => (l.height ? `${l.height}p` : "") === quality);
      if (idx >= 0) {
        hls.currentLevel = idx;
        update({ quality });
      }
    }
  }, [update]);

  const retry = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    update({ error: null, reconnectAttempts: 0, buffering: true });

    if (hlsRef.current) {
      hlsRef.current.stopLoad();
      hlsRef.current.startLoad();
    } else if (shakaRef.current && streamUrl) {
      shakaRef.current.load(streamUrl).catch(() => {
        update({ error: "Failed to reload stream", buffering: false });
      });
    } else if (mpegtsRef.current) {
      try {
        mpegtsRef.current.unload();
        mpegtsRef.current.load();
      } catch {
        update({ error: "Failed to reload stream", buffering: false });
      }
    } else if (streamUrl) {
      video.src = streamUrl;
      video.load();
      video.play().catch(() => {});
    }
  }, [streamUrl, update, videoRef]);

  // ── Stall watchdog: auto-recover a "dead" stream with no progress ─────────
  // (currentTime frozen + not enough buffered data) without any user
  // interaction, complementing each engine's own internal retry logic.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;
    let lastTime = -1;
    let stuckTicks = 0;

    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v || v.paused || v.ended || state.error) {
        stuckTicks = 0;
        lastTime = v?.currentTime ?? -1;
        return;
      }
      if (v.currentTime === lastTime && v.readyState < 3) {
        stuckTicks++;
      } else {
        stuckTicks = 0;
      }
      lastTime = v.currentTime;

      if (stuckTicks >= STALL_TICKS_BEFORE_RECOVERY) {
        stuckTicks = 0;
        console.warn("[MultiPlayer] Stream stalled with no progress — auto-recovering");
        retry();
      }
    }, STALL_CHECK_INTERVAL_MS);

    return () => clearInterval(id);
  }, [streamUrl, videoRef, retry, state.error]);

  return {
    state,
    engine,
    actions: { togglePlay, toggleMute, setVolume, toggleFullscreen, togglePiP, setQuality, retry },
  };
}

// ─── HLS.js setup (Tier 1) ──────────────────────────────────────────────────
// Lazy-imported, same as Shaka/mpegts.js below — hls.js is ~150kB gzipped,
// and statically importing it would mean every page load (including pages
// with no video at all, since MiniPlayer is always mounted) downloads it
// up front. Loading it on first actual use keeps the initial bundle small.
async function initHlsPlayer(
  video: HTMLVideoElement,
  url: string,
  hlsRef: React.MutableRefObject<Hls | null>,
  reconnectTimer: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  update: (p: Partial<PlayerState>) => void,
  settings: EngineSettingsSnapshot,
  onExhausted: () => void,
  onReady: () => void
) {
  const { default: HlsImpl } = await import("hls.js");

  if (!HlsImpl.isSupported()) {
    onExhausted(); // not "exhausted" exactly, but signals the caller to advance()
    return;
  }

  const bufferConfig =
    settings.bufferSize === "low"
      ? { maxBufferLength: 10, maxMaxBufferLength: 20 }
      : settings.bufferSize === "high"
      ? { maxBufferLength: 60, maxMaxBufferLength: 120 }
      : { maxBufferLength: 30, maxMaxBufferLength: 60 };

  const hls = new HlsImpl({
    ...bufferConfig,
    liveSyncDurationCount: settings.lowLatencyMode ? 1 : 3,
    enableWorker: true,
    lowLatencyMode: settings.lowLatencyMode,
    fragLoadingMaxRetry: 4,
    fragLoadingRetryDelay: 1000,
    manifestLoadingMaxRetry: 4,
    manifestLoadingRetryDelay: 1000,
    levelLoadingMaxRetry: 4,
    levelLoadingRetryDelay: 1000,
    xhrSetup: (xhr) => { xhr.withCredentials = false; },
  });

  hlsRef.current = hls;
  hls.loadSource(url);
  hls.attachMedia(video);

  let reconnectAttempts = 0;

  const attemptReconnect = () => {
    if (reconnectAttempts >= MAX_RECONNECT) {
      onExhausted();
      return;
    }
    reconnectAttempts++;
    const delay = Math.min(2000 * reconnectAttempts, 10000);
    reconnectTimer.current = setTimeout(() => {
      try { hls.stopLoad(); hls.startLoad(); } catch { /* destroyed */ }
    }, delay);
    update({ reconnectAttempts, buffering: true, error: null });
  };

  hls.on(HlsImpl.Events.MANIFEST_PARSED, (_e, data) => {
    const levels = data.levels.map((lvl, idx) => ({
      id: idx,
      label: lvl.height ? `${lvl.height}p` : `Level ${idx}`,
      bitrate: lvl.bitrate,
    }));
    update({ qualities: levels, buffering: false, reconnectAttempts: 0, error: null });
    onReady();
    if (settings.autoPlay) video.play().catch(() => {});
    reconnectAttempts = 0;
  });

  hls.on(HlsImpl.Events.LEVEL_SWITCHED, (_e, data) => {
    const level = hls.levels[data.level];
    if (level) update({ quality: level.height ? `${level.height}p` : "auto" });
  });

  hls.on(HlsImpl.Events.BUFFER_APPENDING, () => update({ buffering: false }));

  hls.on(HlsImpl.Events.ERROR, (_e, data) => {
    console.warn("[HLS Error]", data.type, data.details, data.fatal);
    if (data.fatal) {
      if (data.type === HlsImpl.ErrorTypes.NETWORK_ERROR) {
        update({ buffering: true });
        attemptReconnect();
      } else if (data.type === HlsImpl.ErrorTypes.MEDIA_ERROR) {
        try { hls.recoverMediaError(); } catch { attemptReconnect(); }
      } else {
        attemptReconnect();
      }
    }
  });
}

// ─── Shaka Player setup (Tier 2 — DASH + ClearKey DRM, HLS fallback) ──────────
async function initShakaPlayer(
  video: HTMLVideoElement,
  url: string,
  drmKid: string | undefined,
  drmKey: string | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  shakaRef: React.MutableRefObject<any>,
  update: (p: Partial<PlayerState>) => void,
  onFailed: () => void,
  onReady: () => void
) {
  try {
    // Lazy-load shaka-player — Vite will code-split this automatically
    const shakaModule = await import("shaka-player");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const shaka: any = (shakaModule as any).default ?? shakaModule;

    if (typeof shaka?.polyfill?.installAll === "function") {
      shaka.polyfill.installAll();
    }

    const isSupported =
      typeof shaka?.Player?.isBrowserSupported === "function" ? shaka.Player.isBrowserSupported() : true;

    if (!isSupported) {
      onFailed();
      return;
    }

    const player = new shaka.Player(video);
    shakaRef.current = player;

    let hadError = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    player.addEventListener("error", (event: any) => {
      const code = event?.detail?.code ?? "?";
      const msg = event?.detail?.message ?? "Unknown error";
      console.error("[Shaka Error]", code, msg);
      hadError = true;
      onFailed();
    });

    if (drmKid && drmKey) {
      player.configure({ drm: { clearKeys: { [drmKid]: drmKey } } });
    }

    await player.load(url);
    if (!hadError) {
      update({ buffering: false, error: null });
      onReady();
      video.play().catch(() => {});
    }
  } catch (err) {
    console.error("[Shaka] Failed:", err instanceof Error ? err.message : String(err));
    onFailed();
  }
}

// ─── mpegts.js setup (Tier 3 — raw MPEG-TS / HTTP-FLV) ────────────────────────
async function initMpegtsPlayer(
  video: HTMLVideoElement,
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mpegtsRef: React.MutableRefObject<any>,
  update: (p: Partial<PlayerState>) => void,
  settings: EngineSettingsSnapshot,
  onFailed: () => void,
  onReady: () => void
) {
  try {
    const mpegtsModule = await import("mpegts.js");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mpegts: any = (mpegtsModule as any).default ?? mpegtsModule;

    if (!mpegts.isSupported?.()) {
      onFailed();
      return;
    }

    const type = /\.flv(\?|$)/i.test(url) ? "flv" : "mpegts";
    const player = mpegts.createPlayer(
      { type, url, isLive: true },
      {
        enableWorker: true,
        liveBufferLatencyChasing: settings.lowLatencyMode,
        autoCleanupSourceBuffer: true,
      }
    );
    mpegtsRef.current = player;

    let hadError = false;
    player.on(mpegts.Events.ERROR, (errType: string, detail: string) => {
      console.warn("[mpegts.js Error]", errType, detail);
      hadError = true;
      onFailed();
    });

    player.on(mpegts.Events.LOADING_COMPLETE, () => update({ buffering: false }));

    player.attachMediaElement(video);
    player.load();
    if (!hadError) {
      update({ buffering: false, error: null });
      onReady();
      if (settings.autoPlay) video.play().catch(() => {});
    }
  } catch (err) {
    console.error("[mpegts.js] Failed:", err instanceof Error ? err.message : String(err));
    onFailed();
  }
}

// ─── Native <video> setup (Tier 4 — final fallback) ───────────────────────────
function initNativePlayer(
  video: HTMLVideoElement,
  url: string,
  update: (p: Partial<PlayerState>) => void,
  autoPlay: boolean,
  onFailed: () => void,
  onReady: () => void
) {
  const handleError = () => {
    video.removeEventListener("error", handleError);
    onFailed();
  };
  video.addEventListener("error", handleError, { once: true });

  try {
    video.src = url;
    video.load();
    update({ buffering: false, error: null });
    onReady();
    if (autoPlay) video.play().catch(() => {});
  } catch (err) {
    video.removeEventListener("error", handleError);
    console.error("[MultiPlayer] Native fallback threw:", err);
    onFailed();
  }
}
