import { useEffect, useMemo } from "react";
import { Heart } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ViewModeToggle } from "@/components/common/ViewModeToggle";
import { ChannelGrid } from "@/components/channel/ChannelGrid";
import { useChannelStore } from "@/store/channelStore";
import { useUserStore } from "@/store/userStore";
import { useAllChannels } from "@/hooks/useAllChannels";

export function FavoritesPage() {
  const { isLoading, loadChannels } = useChannelStore();
  const { channels } = useAllChannels();
  const { favorites, viewMode, setViewMode } = useUserStore();

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const favoriteChannels = useMemo(
    () => channels.filter((c) => favorites.includes(c.id)),
    [channels, favorites]
  );

  return (
    <div>
      <PageHeader
        title="Favorites"
        subtitle={`${favoriteChannels.length} channel${favoriteChannels.length !== 1 ? "s" : ""} saved`}
        icon={<Heart className="h-5 w-5 text-white fill-white" />}
        action={<ViewModeToggle value={viewMode} onChange={setViewMode} />}
      />
      <div className="px-4 sm:px-6 lg:px-8">
        <ChannelGrid
          channels={favoriteChannels}
          viewMode={viewMode}
          isLoading={isLoading && channels.length === 0}
          emptyMessage="No favorite channels yet — tap the heart icon on any channel to add it here"
        />
      </div>
    </div>
  );
}
