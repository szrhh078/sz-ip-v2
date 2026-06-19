import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Channel } from "@/types";

interface CustomChannelsStore {
  customChannels: Channel[];
  addChannel: (channel: Omit<Channel, "id" | "isLive"> & { id?: string }) => Channel;
  updateChannel: (id: string, patch: Partial<Channel>) => void;
  removeChannel: (id: string) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .substring(0, 40);
}

export const useCustomChannelsStore = create<CustomChannelsStore>()(
  persist(
    (set, get) => ({
      customChannels: [],

      addChannel: (input) => {
        const id = `custom-${Date.now()}-${slugify(input.name)}`;
        const channel: Channel = {
          id,
          name: input.name,
          url: input.url,
          logo: input.logo || "",
          group: input.group || "Custom",
          source: input.source || "Custom",
          isLive: true,
          country: input.country,
          language: input.language,
        };
        set({ customChannels: [channel, ...get().customChannels] });
        return channel;
      },

      updateChannel: (id, patch) => {
        set({
          customChannels: get().customChannels.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        });
      },

      removeChannel: (id) => {
        set({ customChannels: get().customChannels.filter((c) => c.id !== id) });
      },
    }),
    {
      name: "shahriar-tv-custom-channels",
    }
  )
);
