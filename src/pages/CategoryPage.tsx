import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Globe2, Trophy, Tv } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ViewModeToggle } from "@/components/common/ViewModeToggle";
import { GroupFilter } from "@/components/common/GroupFilter";
import { ChannelGrid } from "@/components/channel/ChannelGrid";
import { useChannelStore } from "@/store/channelStore";
import { useUserStore } from "@/store/userStore";
import { useAllChannels } from "@/hooks/useAllChannels";
import { getFootballChannels } from "@/lib/footballChannels";

const CATEGORY_META: Record<string, { label: string; sourceName: string; icon: React.ReactNode; description: string }> = {
  bangla: {
    label: "Bangla TV",
    sourceName: "Bangla TV",
    icon: <Globe2 className="h-5 w-5 text-white" />,
    description: "Live Bangladeshi & regional Bangla news, entertainment, and cultural channels",
  },
  sports: {
    label: "Sports",
    sourceName: "Sports",
    icon: <Trophy className="h-5 w-5 text-white" />,
    description: "Live sports coverage from around the world",
  },
  fifa: {
    label: "FIFA",
    sourceName: "FIFA",
    icon: <Trophy className="h-5 w-5 text-white" />,
    description: "FIFA, World Cup, and football channels from FIFA and Sports collections",
  },
  custom: {
    label: "Custom Channels",
    sourceName: "Custom",
    icon: <Tv className="h-5 w-5 text-white" />,
    description: "Channels added manually by the admin",
  },
};

export function CategoryPage() {
  const { category } = useParams<{ category: string }>();
  const { isLoading, loadChannels } = useChannelStore();
  const { channels } = useAllChannels();
  const { viewMode, setViewMode } = useUserStore();
  const [activeGroup, setActiveGroup] = useState("All");

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const meta = (category && CATEGORY_META[category]) || {
    label: category || "Category",
    sourceName: category || "",
    icon: <Tv className="h-5 w-5 text-white" />,
    description: "Browse channels in this category",
  };

  const sourceChannels = useMemo(() => {
    if (category === "fifa") return getFootballChannels(channels);
    return channels.filter((c) => c.source === meta.sourceName);
  }, [channels, meta.sourceName, category]);

  const subGroups = useMemo(() => {
    const set = new Set<string>();
    sourceChannels.forEach((c) => set.add(c.group));
    return Array.from(set).sort();
  }, [sourceChannels]);

  const filtered = useMemo(() => {
    if (activeGroup === "All") return sourceChannels;
    return sourceChannels.filter((c) => c.group === activeGroup);
  }, [sourceChannels, activeGroup]);

  useEffect(() => {
    // Intentional: reset the group filter whenever the category route param
    // changes. Not a hot path.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveGroup("All");
  }, [category]);

  return (
    <div>
      <PageHeader
        title={meta.label}
        subtitle={`${sourceChannels.length} channels — ${meta.description}`}
        icon={meta.icon}
        action={<ViewModeToggle value={viewMode} onChange={setViewMode} />}
      />

      {subGroups.length > 1 && (
        <div className="mb-4">
          <GroupFilter groups={subGroups} active={activeGroup} onChange={setActiveGroup} />
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8">
        <ChannelGrid
          channels={filtered}
          viewMode={viewMode}
          isLoading={isLoading && channels.length === 0}
          emptyMessage={`No channels found in ${meta.label}`}
        />
      </div>
    </div>
  );
}
