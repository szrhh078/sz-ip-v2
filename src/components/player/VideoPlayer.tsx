import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  PictureInPicture2, Settings, RotateCcw, AlertTriangle,
  Loader2, X, Rows3, ChevronLeft, ChevronRight, Heart,
  SlidersHorizontal, Sun,
} from "lucide-react";
import type { Channel } from "@/types";
import { useHlsPlayer } from "@/hooks/useHlsPlayer";
import { useScreenOrientationLock } from "@/hooks/useScreenOrientationLock";
import { usePlayerUIStore } from "@/store/playerStore";
import { usePlayerSettingsStore } from "@/store/playerSettingsStore";
import { useUserStore } from "@/store/userStore";
import { Slider } from "@/components/ui/slider";
import { PlayerSettingsPanel } from "@/components/player/PlayerSettingsPanel";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface VideoPlayerProps {
  channel: Channel;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
}

const CONTROLS_TIMEOUT = 3500;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const SMART_FIT_ASPECT_TOLERANCE = 0.12; // 12% relative aspect-ratio diff -> "cover" is safe

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

type GestureMode = "none" | "pinch" | "drag-brightness" | "drag-volume";

export function VideoPlayer({ channel, onNextChannel, onPrevChannel }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef<number>(0);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafPending = useRef(false);
  const autoNextTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settings = usePlayerSettingsStore();
  const { state, engine, actions } = useHlsPlayer(videoRef, {
    streamUrl: channel.url,
    streamType: channel.streamType || "hls",
    drmKid: channel.drmKid,
    drmKey: channel.drmKey,
  });

  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [tapFeedback, setTapFeedback] = useState<"play" | "pause" | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gestureHint, setGestureHint] = useState<string | null>(null);

  // ── Fullscreen: real Fullscreen API where available, CSS pseudo-fullscreen
  // fallback for browsers that don't support requestFullscreen on arbitrary
  // elements (notably iPhone Safari — Apple only exposes native fullscreen
  // on <video> itself, which would replace our custom controls with the
  // OS player chrome, so we deliberately don't use that). ─────────────────
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const isImmersive = state.isFullscreen || pseudoFullscreen;
  const setImmersiveFullscreen = usePlayerUIStore((s) => s.setImmersiveFullscreen);

  // ── Smart fit mode: contain vs cover, computed from real aspect ratios ──
  const [smartFit, setSmartFit] = useState<"contain" | "cover">("contain");
  // ── Gesture state: pinch zoom + simulated brightness + volume swipe ─────
  const [pinchScale, setPinchScale] = useState(1);
  const [brightnessLevel, setBrightnessLevel] = useState(1); // 1 = normal, 0 = darkest
  const gestureRef = useRef<{
    mode: GestureMode;
    startX: number;
    startY: number;
    pinchStartDist: number;
    pinchStartScale: number;
    dragStartValue: number;
  }>({ mode: "none", startX: 0, startY: 0, pinchStartDist: 0, pinchStartScale: 1, dragStartValue: 1 });

  const isTheater = usePlayerUIStore((s) => s.isTheaterMode);
  const setTheater = usePlayerUIStore((s) => s.setTheaterMode);
  const setMiniPlayer = usePlayerUIStore((s) => s.setMiniPlayerChannel);
  const isFavorite = useUserStore((s) => s.isFavorite(channel.id));
  const toggleFavorite = useUserStore((s) => s.toggleFavorite);
  const orientationLock = useScreenOrientationLock();

  // ── Brief on-screen hint for gesture feedback ("+10s", "Volume 70%"...) ──
  const showHint = useCallback((text: string) => {
    setGestureHint(text);
    if (hintTimer.current) clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setGestureHint(null), 900);
  }, []);

  // ── Controls visibility ───────────────────────────────────────────────────
  const showControlsFor = useCallback((ms = CONTROLS_TIMEOUT) => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, ms);
  }, []);

  const keepControlsVisible = useCallback(() => {
    showControlsFor();
  }, [showControlsFor]);

  useEffect(() => {
    // showControls already defaults to true — no need to set it again here,
    // we just need to arm the initial auto-hide timer.
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, CONTROLS_TIMEOUT);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (hintTimer.current) clearTimeout(hintTimer.current);
      if (autoNextTimer.current) clearTimeout(autoNextTimer.current);
    };
  }, []);

  // When playback pauses, force controls visible. This is an intentional,
  // low-frequency UI sync (not a hot path), so we suppress the
  // set-state-in-effect advisory rather than fighting it with a render-time
  // ref-based pattern — this codebase's stricter `react-hooks/refs` rule
  // (added for React Compiler compatibility) forbids reading/writing refs
  // during render entirely, which rules out that alternative.
  useEffect(() => {
    if (!state.isPlaying) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowControls(true);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    }
  }, [state.isPlaying]);

  // ── Sync immersive (fullscreen) state to the global UI store so Layout
  // can hide the header/bottom nav, and lock body scroll for pseudo-fs. ────
  useEffect(() => {
    setImmersiveFullscreen(isImmersive);
    if (pseudoFullscreen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isImmersive, pseudoFullscreen, setImmersiveFullscreen]);

  useEffect(() => () => setImmersiveFullscreen(false), [setImmersiveFullscreen]);

  // ── Rotation lock: honors the Auto Rotate setting via the Screen
  // Orientation API where supported (Android Chrome/Firefox/Samsung
  // Internet). Unsupported on iOS Safari — Apple doesn't expose this API to
  // web apps at all, so there's no web-only fix for that platform; we just
  // don't pretend to lock there. ───────────────────────────────────────────
  useEffect(() => {
    if (!isImmersive) {
      orientationLock.unlock();
      return;
    }
    if (settings.autoRotate) {
      orientationLock.unlock();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const current = (window.screen.orientation as any)?.type as OrientationLockType | undefined;
      const fallback: OrientationLockType = window.innerWidth >= window.innerHeight ? "landscape-primary" : "portrait-primary";
      orientationLock.lock(current || fallback);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImmersive, settings.autoRotate]);

  // ── Fullscreen toggle: real API when available, CSS pseudo-fs fallback ──
  const handleToggleFullscreen = useCallback(() => {
    if (pseudoFullscreen) {
      setPseudoFullscreen(false);
      return;
    }
    if (state.isFullscreen) {
      actions.toggleFullscreen(containerRef.current);
      return;
    }
    const supportsRealFullscreen =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      !!(document.fullscreenEnabled || (document as any).webkitFullscreenEnabled) &&
      !!containerRef.current?.requestFullscreen;
    if (supportsRealFullscreen) {
      actions.toggleFullscreen(containerRef.current);
    } else {
      setPseudoFullscreen(true);
    }
  }, [pseudoFullscreen, state.isFullscreen, actions]);

  // ── Smart fit-mode: compare video's natural aspect ratio to the
  // container's so "Smart" can pick Cover (fills screen, minimal crop) vs
  // Contain (avoids cropping mismatched-aspect content like 4:3 in fullscreen)
  const recomputeSmartFit = useCallback(() => {
    const v = videoRef.current;
    const c = containerRef.current;
    if (!v || !c || !v.videoWidth || !v.videoHeight || !c.clientHeight) return;
    const videoRatio = v.videoWidth / v.videoHeight;
    const containerRatio = c.clientWidth / c.clientHeight;
    const diff = Math.abs(videoRatio - containerRatio) / containerRatio;
    setSmartFit(diff < SMART_FIT_ASPECT_TOLERANCE ? "cover" : "contain");
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.addEventListener("loadedmetadata", recomputeSmartFit);
    window.addEventListener("resize", recomputeSmartFit);
    return () => {
      v.removeEventListener("loadedmetadata", recomputeSmartFit);
      window.removeEventListener("resize", recomputeSmartFit);
    };
  }, [recomputeSmartFit]);

  useEffect(() => {
    recomputeSmartFit();
  }, [isImmersive, recomputeSmartFit]);

  const effectiveFit = settings.fitMode === "smart" ? smartFit : settings.fitMode;
  const objectFitClass =
    effectiveFit === "fill" ? "object-fill" : effectiveFit === "cover" ? "object-cover" : "object-contain";

  // ── Auto next channel on unrecoverable error ─────────────────────────────
  useEffect(() => {
    if (autoNextTimer.current) {
      clearTimeout(autoNextTimer.current);
      autoNextTimer.current = null;
    }
    if (state.error && settings.autoNextChannel && onNextChannel) {
      autoNextTimer.current = setTimeout(() => onNextChannel(), 4000);
    }
  }, [state.error, settings.autoNextChannel, onNextChannel]);

  // ── Seek helper used by gesture double-tap (guarded for live streams
  // with no DVR window — most IPTV is pure live with nothing to seek) ──────
  const seekBy = useCallback((deltaSeconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (!v.seekable || v.seekable.length === 0) {
        showHint(deltaSeconds > 0 ? "Live — nothing ahead to skip to" : "Live — no DVR buffer to rewind into");
        return;
      }
      const start = v.seekable.start(0);
      const end = v.seekable.end(v.seekable.length - 1);
      const target = clamp(v.currentTime + deltaSeconds, start, end);
      v.currentTime = target;
      showHint(deltaSeconds > 0 ? "+10s" : "-10s");
    } catch {
      showHint("Seeking unavailable on this stream");
    }
  }, [showHint]);

  // ── Touch/tap handling (mobile-first) ─────────────────────────────────────
  // Mouse (desktop): simple single tap = toggle controls, double click =
  // play/pause. Touch (mobile): same, PLUS — only while in fullscreen with
  // gestures enabled — double-tap left/right thirds to seek, pinch to zoom,
  // and vertical swipes on the left/right halves for brightness/volume.
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("[data-controls]")) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;
    lastTapRef.current = now;

    if (timeSinceLastTap < 300) {
      actions.togglePlay();
      const newState = videoRef.current?.paused ? "play" : "pause";
      setTapFeedback(newState);
      setTimeout(() => setTapFeedback(null), 700);
      showControlsFor(CONTROLS_TIMEOUT);
    } else if (showControls) {
      setShowControls(false);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    } else {
      showControlsFor();
    }
  }, [actions, showControls, showControlsFor]);

  // Native (non-passive) touch listeners — React's synthetic onTouchMove is
  // passive by default, so calling preventDefault() inside it silently does
  // nothing and the page would scroll/pinch-zoom underneath our gesture.
  // Attaching directly to the DOM node with {passive:false} is required for
  // pinch-zoom and swipe gestures to actually block page scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const inGestureMode = () => isImmersive && settings.gesturesEnabled;
    const scheduleStateUpdate = (fn: () => void) => {
      if (rafPending.current) return;
      rafPending.current = true;
      requestAnimationFrame(() => {
        rafPending.current = false;
        fn();
      });
    };

    const onTouchStart = (e: TouchEvent) => {
      const g = gestureRef.current;
      if (!inGestureMode()) {
        g.mode = "none";
        return;
      }
      if (e.touches.length === 2) {
        g.mode = "pinch";
        g.pinchStartDist = distance(
          { x: e.touches[0].clientX, y: e.touches[0].clientY },
          { x: e.touches[1].clientX, y: e.touches[1].clientY }
        );
        g.pinchStartScale = pinchScale;
      } else if (e.touches.length === 1) {
        g.mode = "none";
        g.startX = e.touches[0].clientX;
        g.startY = e.touches[0].clientY;
        const rect = el.getBoundingClientRect();
        const isLeftHalf = g.startX - rect.left < rect.width / 2;
        g.dragStartValue = isLeftHalf ? brightnessLevel : videoRef.current?.volume ?? 1;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const g = gestureRef.current;
      if (!inGestureMode()) return;

      if (g.mode === "pinch" && e.touches.length === 2) {
        e.preventDefault();
        const dist = distance(
          { x: e.touches[0].clientX, y: e.touches[0].clientY },
          { x: e.touches[1].clientX, y: e.touches[1].clientY }
        );
        const scale = clamp(g.pinchStartScale * (dist / Math.max(1, g.pinchStartDist)), ZOOM_MIN, ZOOM_MAX);
        scheduleStateUpdate(() => setPinchScale(scale));
        return;
      }

      if (e.touches.length === 1 && (g.mode === "none" || g.mode === "drag-brightness" || g.mode === "drag-volume")) {
        const dx = e.touches[0].clientX - g.startX;
        const dy = e.touches[0].clientY - g.startY;

        if (g.mode === "none") {
          if (Math.abs(dy) < 14 || Math.abs(dy) <= Math.abs(dx)) return; // not a vertical swipe (yet)
          const rect = el.getBoundingClientRect();
          g.mode = g.startX - rect.left < rect.width / 2 ? "drag-brightness" : "drag-volume";
        }

        e.preventDefault();
        const rect = el.getBoundingClientRect();
        const delta = -dy / Math.max(1, rect.height);
        const newVal = clamp(g.dragStartValue + delta, 0, 1);

        if (g.mode === "drag-brightness") {
          scheduleStateUpdate(() => setBrightnessLevel(newVal));
          showHint(`Brightness ${Math.round(newVal * 100)}%`);
        } else {
          actions.setVolume(newVal);
          showHint(`Volume ${Math.round(newVal * 100)}%`);
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("[data-controls]")) return;

      const g = gestureRef.current;
      const wasGesture = inGestureMode();

      if (wasGesture && g.mode === "pinch") {
        if (e.cancelable) e.preventDefault();
        g.mode = "none";
        return;
      }
      if (wasGesture && (g.mode === "drag-brightness" || g.mode === "drag-volume")) {
        if (e.cancelable) e.preventDefault();
        g.mode = "none";
        return;
      }

      // Plain tap — same double-tap/single-tap logic as desktop, plus
      // zone-aware seek and zoom-reset when actively in gesture mode.
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      lastTapRef.current = now;
      if (e.cancelable) e.preventDefault(); // suppress the synthetic click so it doesn't double-fire

      if (timeSinceLastTap < 300) {
        if (wasGesture && pinchScale > 1.05) {
          scheduleStateUpdate(() => setPinchScale(1));
          showHint("Zoom reset");
          showControlsFor();
          return;
        }
        if (wasGesture) {
          const rect = el.getBoundingClientRect();
          const x = e.changedTouches[0]?.clientX ?? 0;
          const zone = (x - rect.left) / rect.width;
          if (zone < 0.33) { seekBy(-10); showControlsFor(); return; }
          if (zone > 0.67) { seekBy(10); showControlsFor(); return; }
        }
        actions.togglePlay();
        const newState = videoRef.current?.paused ? "play" : "pause";
        setTapFeedback(newState);
        setTimeout(() => setTapFeedback(null), 700);
        showControlsFor(CONTROLS_TIMEOUT);
      } else {
        setShowControls((prev) => {
          if (prev && hideTimer.current) clearTimeout(hideTimer.current);
          return !prev;
        });
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [isImmersive, settings.gesturesEnabled, pinchScale, brightnessLevel, actions, seekBy, showHint, showControlsFor]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      switch (e.key.toLowerCase()) {
        case " ": case "k": e.preventDefault(); actions.togglePlay(); break;
        case "m": actions.toggleMute(); break;
        case "f": handleToggleFullscreen(); break;
        case "p": actions.togglePiP(); break;
        case "t": setTheater(!isTheater); break;
        case "arrowup": e.preventDefault(); actions.setVolume(state.volume + 0.1); break;
        case "arrowdown": e.preventDefault(); actions.setVolume(state.volume - 0.1); break;
        case "arrowright": onNextChannel?.(); break;
        case "arrowleft": onPrevChannel?.(); break;
        case "escape": if (isImmersive) handleToggleFullscreen(); break;
      }
      keepControlsVisible();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [actions, state, isTheater, setTheater, onNextChannel, onPrevChannel, keepControlsVisible, handleToggleFullscreen, isImmersive]);

  // Opening the settings dialog while in REAL fullscreen would render the
  // dialog's portal (which mounts to document.body) underneath the
  // fullscreen element's browser-level "top layer," making it invisible —
  // so we drop out of real fullscreen first. Pseudo-fullscreen (iOS) is
  // just fixed positioning, so the dialog still renders fine on top there.
  const openSettings = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    setSettingsOpen(true);
  }, []);

  const engineLabel = useMemo(() => {
    if (!engine) return null;
    return { "hls.js": "HLS.js", shaka: "Shaka", mpegts: "mpegts.js", native: "Native" }[engine];
  }, [engine]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full overflow-hidden bg-black select-none cursor-pointer",
        pseudoFullscreen
          ? "fixed inset-0 z-[200] h-[100dvh] w-screen"
          : isTheater ? "h-[80dvh]" : "aspect-video rounded-2xl",
        state.isFullscreen && "fullscreen-player"
      )}
      onMouseMove={keepControlsVisible}
      onClick={handleContainerClick}
    >
      {/* Video element — NO onClick here (handled by container). Object-fit
          is dynamic per the Fit Mode setting (Smart/Contain/Cover/Fill);
          transform handles pinch-zoom independently of object-fit. */}
      <video
        ref={videoRef}
        className={cn("h-full w-full transition-transform duration-150 ease-out", objectFitClass)}
        style={pinchScale !== 1 ? { transform: `scale(${pinchScale})` } : undefined}
        playsInline
        autoPlay={settings.autoPlay}
        muted={state.isMuted}
      />

      {/* Simulated brightness overlay — there is no web API to control real
          device screen brightness, so this darkens the video itself, which
          is the closest equivalent a browser can actually do. */}
      {brightnessLevel < 1 && (
        <div
          className="pointer-events-none absolute inset-0 bg-black"
          style={{ opacity: (1 - brightnessLevel) * 0.85 }}
        />
      )}

      {/* Gesture hint (seek / volume / brightness / zoom feedback) */}
      <AnimatePresence>
        {gestureHint && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-4 py-1.5 text-sm font-semibold text-white"
          >
            {gestureHint}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap feedback animation */}
      <AnimatePresence>
        {tapFeedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.3 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-black/50">
              {tapFeedback === "play"
                ? <Play className="h-10 w-10 text-white fill-white" />
                : <Pause className="h-10 w-10 text-white fill-white" />
              }
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buffering */}
      {state.buffering && !state.error && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/60">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
          </div>
        </div>
      )}

      {/* Error overlay */}
      {state.error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 px-6 text-center">
          <AlertTriangle className="h-14 w-14 text-amber-400" />
          <div>
            <p className="text-xl font-bold text-white">Stream Unavailable</p>
            <p className="mt-1 text-sm text-white/60 max-w-sm">{state.error}</p>
            {settings.autoNextChannel && onNextChannel && (
              <p className="mt-2 text-xs text-white/40">Auto-advancing to the next channel…</p>
            )}
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={(e) => { e.stopPropagation(); actions.retry(); }}
              data-controls
              className="flex items-center gap-2 rounded-xl gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg"
            >
              <RotateCcw className="h-4 w-4" /> Retry
            </button>
            {onNextChannel && (
              <button
                onClick={(e) => { e.stopPropagation(); onNextChannel(); }}
                data-controls
                className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold text-white"
              >
                <ChevronRight className="h-4 w-4" /> Next Channel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reconnecting */}
      {state.reconnectAttempts > 0 && !state.error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-xs font-semibold text-amber-300">
          <Loader2 className="h-3 w-3 animate-spin" />
          Reconnecting ({state.reconnectAttempts}/5)...
        </div>
      )}

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col justify-between"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)" }}
          >
            {/* ── Top bar (safe-area padded when in fullscreen, for notches) ── */}
            <div
              className="flex items-center justify-between p-3 sm:p-4"
              style={isImmersive ? { paddingTop: "max(0.75rem, env(safe-area-inset-top))" } : undefined}
              data-controls
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(-1); }}
                  className="rounded-full bg-black/40 p-2 text-white hover:bg-black/60 transition-colors"
                  aria-label="Back"
                >
                  <X className="h-5 w-5" />
                </button>
                {channel.logo && (
                  <img src={channel.logo} alt="" className="h-8 w-8 rounded-lg object-contain bg-white/10 p-1 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-bold text-white text-base leading-tight">{channel.name}</p>
                  <p className="truncate text-xs text-white/60">{channel.group}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0" data-controls>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(channel); }}
                  className={cn("rounded-full p-2 transition-colors", isFavorite ? "text-brand-400 bg-brand-500/20" : "text-white/70 hover:text-white bg-black/30")}
                >
                  <Heart className={cn("h-5 w-5", isFavorite && "fill-brand-400")} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setTheater(!isTheater); }}
                  className="hidden sm:flex rounded-full bg-black/30 p-2 text-white/70 hover:text-white transition-colors"
                >
                  <Rows3 className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* ── Center play/prev/next ─────────────────────────────────────── */}
            <div className="flex items-center justify-center gap-6 sm:gap-10" data-controls>
              {onPrevChannel && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPrevChannel(); }}
                  className="rounded-full bg-black/40 p-3 text-white hover:bg-black/60 transition-all hover:scale-110"
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); actions.togglePlay(); }}
                className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full gradient-brand text-white shadow-2xl shadow-brand-600/50 transition-all hover:scale-110 active:scale-95"
                aria-label={state.isPlaying ? "Pause" : "Play"}
              >
                {state.isPlaying
                  ? <Pause className="h-7 w-7 sm:h-9 sm:w-9 fill-white" />
                  : <Play className="h-7 w-7 sm:h-9 sm:w-9 fill-white ml-1" />
                }
              </button>

              {onNextChannel && (
                <button
                  onClick={(e) => { e.stopPropagation(); onNextChannel(); }}
                  className="rounded-full bg-black/40 p-3 text-white hover:bg-black/60 transition-all hover:scale-110"
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
              )}
            </div>

            {/* ── Bottom bar (safe-area padded when in fullscreen) ────────────── */}
            <div
              className="px-3 pb-3 sm:px-5 sm:pb-5 space-y-2"
              style={isImmersive ? { paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" } : undefined}
              data-controls
            >
              {/* LIVE badge + time */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 rounded-full bg-red-600/90 px-2.5 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  <span className="text-xs font-bold text-white">LIVE</span>
                </div>
                {channel.streamType === "dash" && (
                  <span className="rounded-full bg-blue-600/80 px-2 py-0.5 text-[10px] font-bold text-white">DASH</span>
                )}
                {channel.verified && (
                  <span className="rounded-full bg-emerald-600/80 px-2 py-0.5 text-[10px] font-bold text-white">✓ Verified</span>
                )}
                {engineLabel && (
                  <span
                    className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white/70"
                    title="Active playback engine — auto-updates on fallback"
                  >
                    {engineLabel}
                  </span>
                )}
              </div>

              {/* Controls row */}
              <div className="flex items-center gap-2">
                {/* Play/Pause small */}
                <button
                  onClick={(e) => { e.stopPropagation(); actions.togglePlay(); }}
                  className="text-white hover:text-brand-400 transition-colors p-1"
                >
                  {state.isPlaying
                    ? <Pause className="h-5 w-5 fill-white" />
                    : <Play className="h-5 w-5 fill-white" />
                  }
                </button>

                {/* Volume */}
                <div
                  className="flex items-center gap-2 group/vol"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); actions.toggleMute(); }}
                    className="text-white hover:text-brand-400 transition-colors p-1"
                  >
                    {state.isMuted || state.volume === 0
                      ? <VolumeX className="h-5 w-5" />
                      : <Volume2 className="h-5 w-5" />
                    }
                  </button>
                  <AnimatePresence>
                    {showVolumeSlider && (
                      <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 80, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Slider
                          value={[state.isMuted ? 0 : state.volume * 100]}
                          max={100}
                          step={1}
                          onValueChange={([v]) => actions.setVolume(v / 100)}
                          className="w-20"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {brightnessLevel < 1 && (
                  <Sun className="h-3.5 w-3.5 text-amber-300/70" aria-label="Brightness adjusted" />
                )}

                {/* Quality */}
                {state.qualities.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
                      >
                        <Settings className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{state.quality}</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Quality</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => actions.setQuality("auto")}>
                        Auto {state.quality === "auto" && "✓"}
                      </DropdownMenuItem>
                      {state.qualities
                        .slice().sort((a, b) => b.bitrate - a.bitrate)
                        .map((q) => (
                          <DropdownMenuItem key={q.id} onClick={() => actions.setQuality(q.label)}>
                            {q.label} {state.quality === q.label && "✓"}
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Player settings panel */}
                <button
                  onClick={(e) => { e.stopPropagation(); openSettings(); }}
                  className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20 transition-colors"
                  title="Player settings"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </button>

                {/* Mini player */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMiniPlayer(channel);
                    navigate("/");
                  }}
                  className="hidden sm:flex rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20 transition-colors"
                  title="Mini player"
                >
                  <PictureInPicture2 className="h-4 w-4 rotate-180" />
                </button>

                {/* PiP */}
                <button
                  onClick={(e) => { e.stopPropagation(); actions.togglePiP(); }}
                  className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20 transition-colors"
                  title="Picture in picture (P)"
                >
                  <PictureInPicture2 className="h-4 w-4" />
                </button>

                {/* Fullscreen */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleFullscreen(); }}
                  className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20 transition-colors"
                  title="Fullscreen (F)"
                >
                  {isImmersive
                    ? <Minimize className="h-4 w-4" />
                    : <Maximize className="h-4 w-4" />
                  }
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <PlayerSettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        activeEngine={engine}
        networkQuality={state.networkQuality}
        bufferHealth={state.bufferHealth}
        orientationLockSupported={orientationLock.isSupported}
      />
    </div>
  );
}
