import { useMemo, useState } from "react";
import { Trophy, RefreshCw, Radio, Clock, CheckCircle2, Tv2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/common/PageHeader";
import { MatchCard } from "@/components/schedule/MatchCard";
import { Button } from "@/components/ui/button";
import { useWorldCupSchedule } from "@/hooks/useWorldCupSchedule";
import { useAllChannels } from "@/hooks/useAllChannels";
import { getFootballChannels } from "@/lib/footballChannels";
import { formatMatchDate, formatTimeAgo } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Tab = "upcoming" | "live" | "results";

export function SchedulePage() {
  const {
    matches,          // live + upcoming
    liveMatches,
    upcomingMatches,
    finishedMatches,
    isLoading,
    error,
    lastLoaded,
    refresh,
  } = useWorldCupSchedule();

  const { channels } = useAllChannels();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [groupFilter, setGroupFilter] = useState("All");

  // FIFA/football channels to show in sidebar — no "Watch on" in match cards
  const fifaChannels = useMemo(() => getFootballChannels(channels).slice(0, 8), [channels]);

  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => { if (m.group) set.add(m.group); });
    finishedMatches.forEach((m) => { if (m.group) set.add(m.group); });
    return Array.from(set).sort();
  }, [matches, finishedMatches]);

  const activeList = useMemo(() => {
    let list = tab === "live" ? liveMatches
      : tab === "results" ? finishedMatches
      : upcomingMatches;
    if (groupFilter !== "All") list = list.filter((m) => m.group === groupFilter);
    return list;
  }, [tab, liveMatches, upcomingMatches, finishedMatches, groupFilter]);

  // Group by date
  const byDate = useMemo(() => {
    const map = new Map<string, typeof activeList>();
    for (const m of activeList) {
      const key = formatMatchDate(m.kickoffUtc);
      const arr = map.get(key) || [];
      arr.push(m);
      map.set(key, arr);
    }
    return map;
  }, [activeList]);

  return (
    <div>
      <PageHeader
        title="World Cup 2026 Schedule"
        subtitle="FIFA World Cup 2026 · Finished matches auto-removed · All times in your local timezone"
        icon={<Trophy className="h-5 w-5 text-white" />}
        action={
          <Button variant="secondary" size="sm" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} /> Refresh
          </Button>
        }
      />

      <div className="px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
            {error} — showing cached data
          </div>
        )}

        {liveMatches.length > 0 && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-brand-500/30 bg-brand-500/10 px-4 py-2.5 text-sm font-semibold text-brand-300">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            {liveMatches.length} match{liveMatches.length !== 1 ? "es" : ""} LIVE right now
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            {/* Tabs */}
            <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar pb-1">
              <TabButton active={tab === "upcoming"} onClick={() => setTab("upcoming")} icon={<Clock className="h-4 w-4" />}>
                Upcoming ({upcomingMatches.length})
              </TabButton>
              <TabButton active={tab === "live"} onClick={() => setTab("live")} icon={<Radio className="h-4 w-4" />}>
                Live ({liveMatches.length})
              </TabButton>
              <TabButton active={tab === "results"} onClick={() => setTab("results")} icon={<CheckCircle2 className="h-4 w-4" />}>
                Results ({finishedMatches.length})
              </TabButton>
            </div>

            {/* Group filter */}
            {groupOptions.length > 0 && (
              <div className="mb-5 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {["All", ...groupOptions].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGroupFilter(g)}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors focus-ring",
                      groupFilter === g
                        ? "gradient-brand text-white shadow-lg shadow-brand-600/30"
                        : "bg-surface-200 text-white/60 hover:bg-surface-300 hover:text-white"
                    )}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}

            {/* Match list */}
            {activeList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-300">
                  <Trophy className="h-8 w-8 text-white/30" />
                </div>
                <p className="text-lg font-semibold text-white/70">
                  {tab === "live" ? "No matches live right now" : tab === "upcoming" ? "No upcoming matches" : "No results yet"}
                </p>
                <p className="mt-1 text-sm text-white/40">
                  {tab === "live" ? "Check the Upcoming tab for next fixtures" : "All finished matches have been removed"}
                </p>
              </div>
            ) : (
              <div className="space-y-8 pb-10">
                {Array.from(byDate.entries()).map(([date, dateMatches], i) => (
                  <motion.div
                    key={date}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white/50">{date}</h2>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {dateMatches.map((m) => (
                        <MatchCard
                          key={m.num ?? `${m.team1}-${m.team2}-${m.date}`}
                          match={m}
                        />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {lastLoaded && (
              <p className="pb-4 text-xs text-white/30">
                Last updated {formatTimeAgo(lastLoaded)} · openfootball/worldcup.json (CC0) · Auto-refreshes every 15 min
              </p>
            )}
          </div>

          {/* FIFA channels sidebar */}
          <div className="hidden lg:block">
            <div className="sticky top-20 rounded-2xl glass p-4">
              <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-white/60">
                <Tv2 className="h-4 w-4" /> Watch Live
              </h3>
              <p className="mb-3 text-xs text-white/40">Tune in to these FIFA & football channels to catch the matches live.</p>
              <div className="space-y-2">
                {fifaChannels.map((ch) => (
                  <Link
                    key={ch.id}
                    to={`/watch/${ch.id}`}
                    className="flex items-center gap-3 rounded-xl bg-surface-200 p-2.5 hover:bg-surface-300 transition-colors group"
                  >
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-surface-400 flex items-center justify-center">
                      {ch.logo ? (
                        <img src={ch.logo} alt="" className="h-full w-full object-contain p-1" />
                      ) : (
                        <Tv2 className="h-4 w-4 text-white/30" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-white group-hover:text-brand-300 transition-colors">{ch.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase text-red-400">Live</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                to="/category/fifa"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-brand-500/30 py-2 text-xs font-semibold text-brand-400 hover:bg-brand-500/10 transition-colors"
              >
                View all FIFA channels →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active, onClick, icon, children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-ring",
        active ? "bg-white text-black" : "bg-surface-200 text-white/60 hover:bg-surface-300 hover:text-white"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
