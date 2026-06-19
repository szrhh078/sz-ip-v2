import { useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Pin, Share2, Tv2 } from "lucide-react";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { ChannelGrid } from "@/components/channel/ChannelGrid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useChannelStore } from "@/store/channelStore";
import { useUserStore } from "@/store/userStore";
import { usePlayerUIStore } from "@/store/playerStore";
import { useAllChannels } from "@/hooks/useAllChannels";
import { incrementChannelView } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function WatchPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const navigate = useNavigate();
  const { channels } = useAllChannels();
  const loadChannels = useChannelStore((s) => s.loadChannels);
  const isFavorite = useUserStore((s) => s.isFavorite(channelId || ""));
  const isPinned = useUserStore((s) => s.isPinned(channelId || ""));
  const toggleFavorite = useUserStore((s) => s.toggleFavorite);
  const togglePinned = useUserStore((s) => s.togglePinned);
  const addToHistory = useUserStore((s) => s.addToHistory);
  const updateContinueWatching = useUserStore((s) => s.updateContinueWatching);
  const isTheater = usePlayerUIStore((s) => s.isTheaterMode);
  const watchStartRef = useRef<number>(0);

  useEffect(() => {
    if (channels.length === 0) loadChannels();
  }, [channels.length, loadChannels]);

  const channel = useMemo(() => channels.find((c) => c.id === channelId), [channels, channelId]);

  const relatedChannels = useMemo(() => {
    if (!channel) return [];
    return channels.filter((c) => c.group === channel.group && c.id !== channel.id).slice(0, 12);
  }, [channels, channel]);

  const groupChannels = useMemo(() => {
    if (!channel) return [];
    return channels.filter((c) => c.group === channel.group);
  }, [channels, channel]);

  useEffect(() => {
    if (!channel) return;
    watchStartRef.current = Date.now();
    addToHistory(channel);
    updateContinueWatching(channel);
    incrementChannelView(channel.id, channel.name);

    return () => {
      const duration = Math.floor((Date.now() - watchStartRef.current) / 1000);
      if (duration > 5) addToHistory(channel, duration);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel?.id]);

  const handleNext = () => {
    if (!channel || groupChannels.length === 0) return;
    const idx = groupChannels.findIndex((c) => c.id === channel.id);
    const next = groupChannels[(idx + 1) % groupChannels.length];
    navigate(`/watch/${next.id}`);
  };

  const handlePrev = () => {
    if (!channel || groupChannels.length === 0) return;
    const idx = groupChannels.findIndex((c) => c.id === channel.id);
    const prev = groupChannels[(idx - 1 + groupChannels.length) % groupChannels.length];
    navigate(`/watch/${prev.id}`);
  };

  const handleShare = async () => {
    if (!channel) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: channel.name, url });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  if (channels.length === 0) {
    return (
      <div className="flex h-[60dvh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <p className="text-white/60">Loading channels...</p>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex h-[60dvh] flex-col items-center justify-center gap-4 text-center px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-300">
          <Tv2 className="h-8 w-8 text-white/30" />
        </div>
        <div>
          <p className="text-lg font-semibold text-white">Channel not found</p>
          <p className="mt-1 text-sm text-white/50">This channel may have been removed or the link is invalid.</p>
        </div>
        <Button onClick={() => navigate("/")} variant="brand">
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto max-w-screen-2xl px-0 sm:px-6 lg:px-8", isTheater && "max-w-none")}>
      <div className={cn("grid gap-6", !isTheater && "lg:grid-cols-[1fr_360px] pt-0 sm:pt-4")}>
        <div className="space-y-4">
          <VideoPlayer channel={channel} onNextChannel={handleNext} onPrevChannel={handlePrev} />

          {!isTheater && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 sm:px-0"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {channel.logo && (
                    <div className="h-14 w-14 shrink-0 rounded-xl bg-surface-300 p-2 flex items-center justify-center">
                      <img src={channel.logo} alt="" className="h-full w-full object-contain" />
                    </div>
                  )}
                  <div>
                    <h1 className="font-display text-xl font-bold text-white sm:text-2xl">{channel.name}</h1>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant="live">
                        <span className="h-1.5 w-1.5 rounded-full bg-white" /> LIVE
                      </Badge>
                      <Badge variant="outline">{channel.group}</Badge>
                      {channel.streamType === "dash" && (
                        <Badge variant="outline">DASH</Badge>
                      )}
                      {channel.verified && (
                        <Badge variant="success">✓ Verified</Badge>
                      )}
                      {channel.country && <Badge variant="outline">{channel.country}</Badge>}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" size="icon" onClick={() => togglePinned(channel.id)} aria-label="Pin">
                    <Pin className={cn("h-4 w-4", isPinned && "fill-accent-gold text-accent-gold")} />
                  </Button>
                  <Button variant="secondary" size="icon" onClick={() => toggleFavorite(channel)} aria-label="Favorite">
                    <Heart className={cn("h-4 w-4", isFavorite && "fill-brand-500 text-brand-500")} />
                  </Button>
                  <Button variant="secondary" size="icon" onClick={handleShare} aria-label="Share">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <p className="mt-4 text-sm text-white/60">
                You're watching {channel.name} live in HD. Streamed from the {channel.group} collection on Shahriar
                TV. Use keyboard shortcuts: Space to play/pause, M to mute, F for fullscreen, P for picture-in-picture,
                and arrow keys to switch channels.
              </p>
            </motion.div>
          )}
        </div>

        {!isTheater && (
          <div className="px-4 sm:px-0">
            <h2 className="mb-3 font-display text-lg font-bold text-white">More from {channel.group}</h2>
            <div className="max-h-[600px] overflow-y-auto pr-1">
              <ChannelGrid channels={relatedChannels} viewMode="list" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
