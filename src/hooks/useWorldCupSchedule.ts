import { useState, useEffect, useCallback, useMemo } from "react";
import type { WorldCupMatch } from "@/types";
import { fetchWorldCupSchedule } from "@/lib/worldCupSchedule";

const CACHE_KEY = "shahriar-tv-worldcup-schedule-v2";
const CACHE_TTL = 1000 * 60 * 15; // 15 min — refresh often for live score updates
const MATCH_DURATION_MS = 2.5 * 60 * 60 * 1000; // 2.5 hours includes ET + stoppage

interface ScheduleCache {
  matches: WorldCupMatch[];
  cachedAt: number;
}

function loadCache(): ScheduleCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ScheduleCache;
  } catch {
    return null;
  }
}

function saveCache(data: ScheduleCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Best-effort cache write — quota exceeded or storage disabled is fine to ignore
  }
}

function recomputeStatuses(matches: WorldCupMatch[]): WorldCupMatch[] {
  const now = Date.now();
  return matches.map((m) => {
    const hasScore = !!m.score?.ft;
    let status: WorldCupMatch["status"];
    if (now >= m.kickoffUtc && now <= m.kickoffUtc + MATCH_DURATION_MS) {
      status = "live";
    } else if (now > m.kickoffUtc + MATCH_DURATION_MS) {
      status = "finished";
    } else {
      status = "upcoming";
    }
    // If source has confirmed score, always mark finished regardless of time
    if (hasScore && status !== "live") status = "finished";
    return { ...m, status };
  });
}

export function useWorldCupSchedule() {
  const [allMatches, setAllMatches] = useState<WorldCupMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoaded, setLastLoaded] = useState<number | null>(null);

  const load = useCallback(async (force = false) => {
    if (!force) {
      const cache = loadCache();
      if (cache) {
        setAllMatches(recomputeStatuses(cache.matches));
        setLastLoaded(cache.cachedAt);
        if (Date.now() - cache.cachedAt < CACHE_TTL) return;
      }
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchWorldCupSchedule();
      setAllMatches(data);
      setLastLoaded(Date.now());
      saveCache({ matches: data, cachedAt: Date.now() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedule");
      const cache = loadCache();
      if (cache) setAllMatches(recomputeStatuses(cache.matches));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Standard fetch-on-mount: load() internally sets loading/data/error
    // state from an async request, which is exactly what effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // Recompute statuses every minute as clock ticks
    const tick = setInterval(() => {
      setAllMatches((prev) => recomputeStatuses(prev));
    }, 60 * 1000);
    // Re-fetch full data every 15 minutes for fresh scores/URLs
    const refresh = setInterval(() => load(true), CACHE_TTL);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [load]);

  // Only show live + upcoming — finished matches auto-removed
  const visibleMatches = useMemo(
    () => allMatches
        .filter((m) => m.status !== "finished")
        .sort((a, b) => {
          // Live matches always first
          if (a.status === "live" && b.status !== "live") return -1;
          if (a.status !== "live" && b.status === "live") return 1;
          return a.kickoffUtc - b.kickoffUtc;
        }),
    [allMatches]
  );

  const liveMatches = useMemo(
    () => visibleMatches.filter((m) => m.status === "live"),
    [visibleMatches]
  );

  const upcomingMatches = useMemo(
    () => visibleMatches.filter((m) => m.status === "upcoming"),
    [visibleMatches]
  );

  const finishedMatches = useMemo(
    () => allMatches
        .filter((m) => m.status === "finished")
        .sort((a, b) => b.kickoffUtc - a.kickoffUtc),
    [allMatches]
  );

  return {
    matches: visibleMatches,       // live + upcoming only (auto-removes finished)
    allMatches,                    // full list including finished (for Results tab)
    liveMatches,
    upcomingMatches,
    finishedMatches,
    isLoading,
    error,
    lastLoaded,
    refresh: () => load(true),
  };
}
