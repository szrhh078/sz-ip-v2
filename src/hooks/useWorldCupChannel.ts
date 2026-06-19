import { useMemo } from "react";
import type { Channel } from "@/types";
import { getFootballChannels } from "@/lib/footballChannels";

/**
 * Picks the best available channel for watching World Cup coverage —
 * prefers FIFA+ feeds and FIFA-source channels, falling back to any
 * football/World Cup-relevant channel from Sports.
 */
export function useWorldCupChannel(channels: Channel[]): Channel | undefined {
  return useMemo(() => {
    const matches = getFootballChannels(channels);

    // Prefer a FIFA+ branded feed if available (most likely to carry World Cup matches)
    const fifaPlus = matches.find((c) => /fifa\+/i.test(c.name));
    if (fifaPlus) return fifaPlus;

    return matches[0];
  }, [channels]);
}
