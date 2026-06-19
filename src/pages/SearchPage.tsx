import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Search as SearchIcon, X, Clock, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChannelGrid } from "@/components/channel/ChannelGrid";
import { ViewModeToggle } from "@/components/common/ViewModeToggle";
import { useChannelStore } from "@/store/channelStore";
import { useUserStore } from "@/store/userStore";
import { useChannelSearch } from "@/hooks/useChannelSearch";
import { useAllChannels } from "@/hooks/useAllChannels";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { loadChannels } = useChannelStore();
  const { channels } = useAllChannels();
  const { viewMode, setViewMode, recentSearches, addSearchTerm, clearSearchHistory } = useUserStore();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadChannels();
    inputRef.current?.focus();
  }, [loadChannels]);

  useEffect(() => {
    // Intentional: keep the input in sync with the ?q= URL param (e.g. back/
    // forward navigation, or a link with a prefilled query). Not a hot path.
    const q = searchParams.get("q") || "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(q);
  }, [searchParams]);

  const { results, debouncedQuery } = useChannelSearch(channels, query);

  const popularGroups = useMemoGroups(channels);

  const handleSearch = (term: string) => {
    setQuery(term);
    setSearchParams(term ? { q: term } : {});
    if (term.trim()) addSearchTerm(term);
  };

  return (
    <div className="px-4 pt-6 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-2xl">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search for channels, categories, sports..."
          className="h-14 rounded-2xl pl-12 pr-12 text-base"
        />
        {query && (
          <button
            onClick={() => handleSearch("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!debouncedQuery && (
        <div className="mx-auto mt-8 max-w-2xl space-y-8">
          {recentSearches.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-sm font-bold text-white/80">
                  <Clock className="h-4 w-4" /> Recent Searches
                </h2>
                <button onClick={clearSearchHistory} className="text-xs text-white/40 hover:text-white">
                  Clear
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSearch(term)}
                    className="rounded-full bg-surface-200 px-3 py-1.5 text-sm text-white/70 hover:bg-surface-300 hover:text-white transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-white/80">
              <TrendingUp className="h-4 w-4" /> Browse by Category
            </h2>
            <div className="flex flex-wrap gap-2">
              {popularGroups.map((g) => (
                <Button key={g} variant="secondary" size="sm" onClick={() => handleSearch(g)}>
                  {g}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {debouncedQuery && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-white/50">
              {results.length} result{results.length !== 1 ? "s" : ""} for "{debouncedQuery}"
            </p>
            <ViewModeToggle value={viewMode} onChange={setViewMode} />
          </div>
          <ChannelGrid channels={results} viewMode={viewMode} emptyMessage={`No channels found for "${debouncedQuery}"`} />
        </motion.div>
      )}
    </div>
  );
}

function useMemoGroups(channels: { group: string }[]) {
  return useMemo(() => {
    const counts = new Map<string, number>();
    channels.forEach((c) => counts.set(c.group, (counts.get(c.group) || 0) + 1));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([g]) => g);
  }, [channels]);
}
