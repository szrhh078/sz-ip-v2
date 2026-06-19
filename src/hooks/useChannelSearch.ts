import { useMemo, useState, useEffect } from "react";
import type { Channel } from "@/types";

export function useChannelSearch(channels: Channel[], query: string, group?: string | null) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    let list = channels;

    if (group && group !== "All") {
      list = list.filter((c) => c.group === group);
    }

    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return list;

    // Score-based search: exact start match > contains
    const scored = list
      .map((c) => {
        const name = c.name.toLowerCase();
        let score = -1;
        if (name === q) score = 100;
        else if (name.startsWith(q)) score = 75;
        else if (name.includes(q)) score = 50;
        else if (c.group.toLowerCase().includes(q)) score = 25;
        return { channel: c, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map((item) => item.channel);
  }, [channels, debouncedQuery, group]);

  return { results, debouncedQuery };
}
