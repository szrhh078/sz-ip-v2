import { useEffect, useMemo } from "react";
import { Pin } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ViewModeToggle } from "@/components/common/ViewModeToggle";
import { ChannelGrid } from "@/components/channel/ChannelGrid";
import { useChannelStore } from "@/store/channelStore";
import { useUserStore } from "@/store/userStore";
import { useAllChannels } from "@/hooks/useAllChannels";

export function PinnedPage() {
  const { isLoading, loadChannels } = useChannelStore();
  const { channels } = useAllChannels();
  const { pinned, viewMode, setViewMode } = useUserStore();

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const pinnedChannels = useMemo(() => channels.filter((c) => pinned.includes(c.id)), [channels, pinned]);

  return (
    <div>
      <PageHeader
        title="Pinned Channels"
        subtitle={`${pinnedChannels.length} channel${pinnedChannels.length !== 1 ? "s" : ""} pinned for quick access`}
        icon={<Pin className="h-5 w-5 text-white fill-white" />}
        action={<ViewModeToggle value={viewMode} onChange={setViewMode} />}
      />
      <div className="px-4 sm:px-6 lg:px-8">
        <ChannelGrid
          channels={pinnedChannels}
          viewMode={viewMode}
          isLoading={isLoading && channels.length === 0}
          emptyMessage="No pinned channels yet — tap the pin icon on any channel to pin it here"
        />
      </div>
    </div>
  );
}
