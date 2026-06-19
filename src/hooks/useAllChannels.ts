import { useMemo } from "react";
import { useChannelStore } from "@/store/channelStore";
import { useCustomChannelsStore } from "@/store/customChannelsStore";
import type { Channel } from "@/types";

const SOURCE_ORDER: Record<string, number> = {
  "FIFA": 0,
  "Custom": 1,
  "Sports": 2,
  "Bangla TV": 3,
  "Universal": 4,
};

function sortChannels(channels: Channel[]): Channel[] {
  return [...channels].sort((a, b) => {
    const aOrder = SOURCE_ORDER[a.source] ?? 99;
    const bOrder = SOURCE_ORDER[b.source] ?? 99;
    return aOrder - bOrder;
  });
}

export function useAllChannels(): { channels: Channel[]; groups: string[] } {
  const playlistChannels = useChannelStore((s) => s.channels);
  const customChannels = useCustomChannelsStore((s) => s.customChannels);

  const channels = useMemo(() => {
    const merged = [...customChannels, ...playlistChannels];
    return sortChannels(merged);
  }, [playlistChannels, customChannels]);

  const groups = useMemo(() => {
    const set = new Set<string>();
    channels.forEach((c) => set.add(c.group));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [channels]);

  return { channels, groups };
}
