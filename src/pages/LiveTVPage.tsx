import { useEffect, useState, useMemo } from "react";
import { Tv } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ViewModeToggle } from "@/components/common/ViewModeToggle";
import { GroupFilter } from "@/components/common/GroupFilter";
import { ChannelGrid } from "@/components/channel/ChannelGrid";
import { useChannelStore } from "@/store/channelStore";
import { useUserStore } from "@/store/userStore";
import { useAllChannels } from "@/hooks/useAllChannels";

export function LiveTVPage() {
  const { isLoading, loadChannels } = useChannelStore();
  const { channels, groups } = useAllChannels();
  const { viewMode, setViewMode } = useUserStore();
  const [activeGroup, setActiveGroup] = useState("All");

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const filtered = useMemo(() => {
    if (activeGroup === "All") return channels;
    return channels.filter((c) => c.group === activeGroup);
  }, [channels, activeGroup]);

  return (
    <div>
      <PageHeader
        title="Live TV"
        subtitle={`${channels.length} channels available`}
        icon={<Tv className="h-5 w-5 text-white" />}
        action={<ViewModeToggle value={viewMode} onChange={setViewMode} />}
      />
      <div className="mb-4">
        <GroupFilter groups={groups} active={activeGroup} onChange={setActiveGroup} />
      </div>
      <div className="px-4 sm:px-6 lg:px-8">
        <ChannelGrid channels={filtered} viewMode={viewMode} isLoading={isLoading && channels.length === 0} />
      </div>
    </div>
  );
}
