import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2, Volume2, VolumeX, Play, Pause, GripVertical } from "lucide-react";
import { useHlsPlayer } from "@/hooks/useHlsPlayer";
import { usePlayerUIStore } from "@/store/playerStore";

export function MiniPlayer() {
  const channel = usePlayerUIStore((s) => s.miniPlayerChannel);
  const setMiniPlayer = usePlayerUIStore((s) => s.setMiniPlayerChannel);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const [showControls, setShowControls] = useState(false);

  const { state, actions } = useHlsPlayer(
    videoRef,
    channel
      ? {
          streamUrl: channel.url,
          streamType: channel.streamType || "hls",
          drmKid: channel.drmKid,
          drmKey: channel.drmKey,
        }
      : null
  );

  return (
    <AnimatePresence>
      {channel && (
        <motion.div
          initial={{ opacity: 0, y: 80, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 80, scale: 0.85 }}
          transition={{ type: "spring", damping: 24, stiffness: 260 }}
          drag
          // Allow drag anywhere within the viewport
          dragConstraints={{
            top: -window.innerHeight + 180,
            left: -window.innerWidth + 280,
            right: 0,
            bottom: 0,
          }}
          dragElastic={0.15}
          dragMomentum={false}
          className="fixed bottom-20 right-4 z-[60] w-72 overflow-hidden rounded-2xl shadow-2xl lg:bottom-8"
          style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}
        >
          {/* Drag handle */}
          <div className="flex items-center justify-between bg-surface-200 px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              {channel.logo && (
                <img src={channel.logo} alt="" className="h-5 w-5 rounded object-contain" />
              )}
              <p className="truncate text-xs font-semibold text-white">{channel.name}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <GripVertical className="h-4 w-4 text-white/30 cursor-grab active:cursor-grabbing" />
              <button
                onClick={() => {
                  navigate(`/watch/${channel.id}`);
                  setMiniPlayer(null);
                }}
                className="rounded p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Expand"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setMiniPlayer(null)}
                className="rounded p-1 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Video */}
          <div
            className="relative aspect-video bg-black cursor-pointer"
            onClick={() => setShowControls((p) => !p)}
          >
            <video
              ref={videoRef}
              className="h-full w-full object-contain"
              playsInline
              autoPlay
              muted={state.isMuted}
            />

            {/* Always-visible bottom controls (not hover-dependent) */}
            <AnimatePresence>
              {showControls && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent p-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={actions.toggleMute}
                      className="rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors"
                    >
                      {state.isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </button>

                    <button
                      onClick={actions.togglePlay}
                      className="flex h-10 w-10 items-center justify-center rounded-full gradient-brand text-white shadow-lg"
                    >
                      {state.isPlaying
                        ? <Pause className="h-5 w-5 fill-white" />
                        : <Play className="h-5 w-5 fill-white ml-0.5" />
                      }
                    </button>

                    <button
                      onClick={() => {
                        navigate(`/watch/${channel.id}`);
                        setMiniPlayer(null);
                      }}
                      className="rounded-full bg-black/60 p-2 text-white hover:bg-black/80 transition-colors"
                    >
                      <Maximize2 className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tap hint */}
            {!showControls && (
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[9px] font-medium text-white/70">TAP FOR CONTROLS</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
