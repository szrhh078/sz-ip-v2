import { useEffect, useMemo } from "react";
import { Trophy, Globe2, Star, History, PlayCircle, Pin, Flame, Tv } from "lucide-react";
import { HeroBanner } from "@/components/home/HeroBanner";
import { UpcomingMatchesRow } from "@/components/home/UpcomingMatchesRow";
import { ChannelCarousel } from "@/components/channel/ChannelCarousel";
import { useChannelStore } from "@/store/channelStore";
import { useUserStore } from "@/store/userStore";
import { useAllChannels } from "@/hooks/useAllChannels";
import { useWorldCupSchedule } from "@/hooks/useWorldCupSchedule";

export function HomePage() {
  const { isLoading, loadChannels, error } = useChannelStore();
  const { channels } = useAllChannels();
  const { favorites, history, continueWatching, pinned } = useUserStore();
  const { liveMatches, upcomingMatches, isLoading: scheduleLoading } = useWorldCupSchedule();

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const banglaChannels = useMemo(() => channels.filter((c) => c.source === "Bangla TV"), [channels]);
  const sportsChannels = useMemo(() => channels.filter((c) => c.source === "Sports"), [channels]);
  const fifaChannels = useMemo(() => channels.filter((c) => c.source === "FIFA"), [channels]);

  const trending = useMemo(() => {
    // Pseudo-trending: shuffle deterministically based on a fixed seed for stability
    return [...channels].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 16);
  }, [channels]);

  const favoriteChannels = useMemo(
    () => channels.filter((c) => favorites.includes(c.id)),
    [channels, favorites]
  );

  const pinnedChannels = useMemo(() => channels.filter((c) => pinned.includes(c.id)), [channels, pinned]);

  const continueWatchingChannels = useMemo(() => {
    return continueWatching
      .map((entry) => channels.find((c) => c.id === entry.channelId))
      .filter((c): c is NonNullable<typeof c> => !!c);
  }, [continueWatching, channels]);

  const recentChannels = useMemo(() => {
    return history
      .map((entry) => channels.find((c) => c.id === entry.channelId))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .slice(0, 16);
  }, [history, channels]);

  return (
    <div className="space-y-10 pb-10">
      <HeroBanner channels={channels.length > 0 ? [...channels].reverse().slice(0, 8) : []} />

      <UpcomingMatchesRow
        liveMatches={liveMatches}
        upcomingMatches={upcomingMatches}
        isLoading={scheduleLoading && liveMatches.length === 0 && upcomingMatches.length === 0}
      />

      {error && (
        <div className="mx-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300 sm:mx-6 lg:mx-8">
          {error}
        </div>
      )}

      <div className="space-y-10">
        {continueWatchingChannels.length > 0 && (
          <ChannelCarousel
            title="Continue Watching"
            channels={continueWatchingChannels}
            icon={<PlayCircle className="h-5 w-5 text-brand-500" />}
          />
        )}

        {pinnedChannels.length > 0 && (
          <ChannelCarousel
            title="Pinned Channels"
            channels={pinnedChannels}
            icon={<Pin className="h-5 w-5 text-accent-gold" />}
          />
        )}

        <ChannelCarousel
          title="Featured Live Channels"
          channels={channels.slice(0, 16)}
          isLoading={isLoading && channels.length === 0}
          viewAllHref="/live"
          icon={<Tv className="h-5 w-5 text-brand-500" />}
        />

        <ChannelCarousel
          title="Trending Now"
          channels={trending}
          isLoading={isLoading && channels.length === 0}
          icon={<Flame className="h-5 w-5 text-orange-400" />}
        />

        {recentChannels.length > 0 && (
          <ChannelCarousel
            title="Recently Watched"
            channels={recentChannels}
            icon={<History className="h-5 w-5 text-cyan-400" />}
          />
        )}

        {favoriteChannels.length > 0 && (
          <ChannelCarousel
            title="Your Favorites"
            channels={favoriteChannels}
            viewAllHref="/favorites"
            icon={<Star className="h-5 w-5 text-amber-400" />}
          />
        )}

        <ChannelCarousel
          title="Sports"
          channels={sportsChannels.slice(0, 16)}
          isLoading={isLoading && channels.length === 0}
          viewAllHref="/category/sports"
          icon={<Trophy className="h-5 w-5 text-emerald-400" />}
        />

        <ChannelCarousel
          title="FIFA"
          channels={fifaChannels.slice(0, 16)}
          isLoading={isLoading && channels.length === 0}
          viewAllHref="/category/fifa"
          icon={<Trophy className="h-5 w-5 text-blue-400" />}
        />

        <ChannelCarousel
          title="Bangla TV"
          channels={banglaChannels.slice(0, 16)}
          isLoading={isLoading && channels.length === 0}
          viewAllHref="/category/bangla"
          icon={<Globe2 className="h-5 w-5 text-violet-400" />}
        />
      </div>
    </div>
  );
}
