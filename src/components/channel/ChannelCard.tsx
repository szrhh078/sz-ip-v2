import { memo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Play, Heart, Pin, Tv2 } from "lucide-react";
import type { Channel } from "@/types";
import { Badge } from "@/components/ui/badge";
import { useUserStore } from "@/store/userStore";
import { cn } from "@/lib/utils";

interface ChannelCardProps {
  channel: Channel;
  index?: number;
  variant?: "grid" | "list" | "compact";
}

function ChannelCardBase({ channel, index = 0, variant = "grid" }: ChannelCardProps) {
  const [imgError, setImgError] = useState(false);
  const isFavorite = useUserStore((s) => s.isFavorite(channel.id));
  const isPinned = useUserStore((s) => s.isPinned(channel.id));
  const toggleFavorite = useUserStore((s) => s.toggleFavorite);
  const togglePinned = useUserStore((s) => s.togglePinned);

  const showLogo = channel.logo && !imgError;

  if (variant === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(index * 0.02, 0.3) }}
      >
        <Link
          to={`/watch/${channel.id}`}
          className="group flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-white/5 focus-ring"
        >
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface-300 flex items-center justify-center">
            {showLogo ? (
              <img
                src={channel.logo}
                alt={channel.name}
                loading="lazy"
                className="h-full w-full object-contain p-1"
                onError={() => setImgError(true)}
              />
            ) : (
              <Tv2 className="h-6 w-6 text-white/30" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white">{channel.name}</p>
            <p className="truncate text-xs text-white/50">{channel.group}</p>
          </div>
          <Badge variant="live" className="shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-white" /> LIVE
          </Badge>
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite(channel);
            }}
            className="shrink-0 rounded-full p-2 text-white/40 hover:text-brand-400 hover:bg-white/10 transition-colors focus-ring"
            aria-label="Toggle favorite"
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-brand-500 text-brand-500")} />
          </button>
        </Link>
      </motion.div>
    );
  }

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: Math.min(index * 0.015, 0.3) }}
      >
        <Link
          to={`/watch/${channel.id}`}
          className="group flex flex-col items-center gap-2 rounded-xl p-2 transition-colors hover:bg-white/5 focus-ring"
        >
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-surface-300 flex items-center justify-center border border-white/5 group-hover:border-brand-500/30 transition-colors">
            {showLogo ? (
              <img
                src={channel.logo}
                alt={channel.name}
                loading="lazy"
                className="h-full w-full object-contain p-2"
                onError={() => setImgError(true)}
              />
            ) : (
              <Tv2 className="h-8 w-8 text-white/30" />
            )}
            <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse-glow" />
          </div>
          <p className="w-full truncate text-center text-xs font-medium text-white/80">{channel.name}</p>
        </Link>
      </motion.div>
    );
  }

  // grid (default)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.4), duration: 0.4 }}
      whileHover={{ y: -4 }}
      className="group relative"
    >
      <Link to={`/watch/${channel.id}`} className="block focus-ring rounded-xl">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-surface-300 border border-white/5 group-hover:border-brand-500/40 transition-all duration-300 shadow-lg group-hover:shadow-brand-600/20">
          {showLogo ? (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-200 to-surface-400 p-6">
              <img
                src={channel.logo}
                alt={channel.name}
                loading="lazy"
                className="max-h-full max-w-full object-contain drop-shadow-lg"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-200 to-surface-400">
              <Tv2 className="h-10 w-10 text-white/20" />
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-full gradient-brand shadow-lg shadow-brand-600/40">
              <Play className="h-5 w-5 fill-white text-white ml-0.5" />
            </div>
          </div>

          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <Badge variant="live">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> LIVE
            </Badge>
            {channel.streamType === "dash" && (
              <span className="rounded-full bg-blue-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white">DASH</span>
            )}
            {channel.verified && (
              <span className="rounded-full bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white">✓</span>
            )}
          </div>

          {isPinned && (
            <div className="absolute top-2 right-2 rounded-full bg-accent-gold/90 p-1">
              <Pin className="h-3 w-3 text-black fill-black" />
            </div>
          )}
        </div>
      </Link>

      <div className="mt-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{channel.name}</p>
          <p className="truncate text-xs text-white/45">{channel.group}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={(e) => {
              e.preventDefault();
              togglePinned(channel.id);
            }}
            className="rounded-full p-1.5 text-white/40 hover:text-accent-gold hover:bg-white/10 transition-colors focus-ring"
            aria-label="Pin channel"
          >
            <Pin className={cn("h-3.5 w-3.5", isPinned && "fill-accent-gold text-accent-gold")} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite(channel);
            }}
            className="rounded-full p-1.5 text-white/40 hover:text-brand-400 hover:bg-white/10 transition-colors focus-ring"
            aria-label="Toggle favorite"
          >
            <Heart className={cn("h-3.5 w-3.5", isFavorite && "fill-brand-500 text-brand-500")} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export const ChannelCard = memo(ChannelCardBase);
