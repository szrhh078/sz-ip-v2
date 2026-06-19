import { useEffect, useState, useMemo } from "react";
import { Grid3x3 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ViewModeToggle } from "@/components/common/ViewModeToggle";
import { GroupFilter } from "@/components/common/GroupFilter";
import { ChannelGrid } from "@/components/channel/ChannelGrid";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useChannelStore } from "@/store/channelStore";
import { useUserStore } from "@/store/userStore";
import { useChannelSearch } from "@/hooks/useChannelSearch";
import { useAllChannels } from "@/hooks/useAllChannels";

export function ChannelsPage() {
  const { isLoading, loadChannels } = useChannelStore();
  const { channels, groups } = useAllChannels();
  const { viewMode, setViewMode } = useUserStore();
  const [activeGroup, setActiveGroup] = useState("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const { results } = useChannelSearch(channels, query, activeGroup);

  const sourceGroups = useMemo(() => {
    return groups;
  }, [groups]);

  return (
    <div>
      <PageHeader
        title="All Channels"
        subtitle={`Browse all ${channels.length} channels organized by category`}
        icon={<Grid3x3 className="h-5 w-5 text-white" />}
        action={<ViewModeToggle value={viewMode} onChange={setViewMode} />}
      />

      <div className="mb-4 px-4 sm:px-6 lg:px-8">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter channels by name..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="mb-4">
        <GroupFilter groups={sourceGroups} active={activeGroup} onChange={setActiveGroup} />
      </div>

      <div className="px-4 sm:px-6 lg:px-8">
        <ChannelGrid channels={results} viewMode={viewMode} isLoading={isLoading && channels.length === 0} />
      </div>
    </div>
  );
}
