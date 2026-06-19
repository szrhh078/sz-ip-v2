import { Link } from "react-router-dom";
import { Trophy, ChevronRight, Radio, Tv } from "lucide-react";
import { motion } from "framer-motion";
import type { WorldCupMatch } from "@/types";
import { MatchCard } from "@/components/schedule/MatchCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface UpcomingMatchesRowProps {
  liveMatches: WorldCupMatch[];
  upcomingMatches: WorldCupMatch[];
  isLoading: boolean;
}

export function UpcomingMatchesRow({ liveMatches, upcomingMatches, isLoading }: UpcomingMatchesRowProps) {
  const matches = [...liveMatches, ...upcomingMatches].slice(0, 6);
  if (!isLoading && matches.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white sm:text-xl">
          <Trophy className="h-5 w-5 text-emerald-400" />
          FIFA World Cup 2026
          {liveMatches.length > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-xs font-semibold text-red-400">
              <Radio className="h-3 w-3 animate-pulse" /> LIVE
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {liveMatches.length > 0 && (
            <Link to="/category/fifa">
              <Button variant="brand" size="sm">
                <Tv className="h-3.5 w-3.5" /> Watch
              </Button>
            </Link>
          )}
          <Link
            to="/schedule"
            className="flex items-center gap-1 text-xs font-semibold text-white/60 hover:text-brand-400 transition-colors"
          >
            Full Schedule <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:px-6 lg:px-8 snap-x snap-mandatory">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="w-[280px] shrink-0">
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
            ))
          : matches.map((m, i) => (
              <motion.div
                key={m.num ?? `${m.team1}-${m.team2}-${m.date}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.3) }}
                className="w-[280px] shrink-0 snap-start sm:w-[320px]"
              >
                <MatchCard match={m} compact />
              </motion.div>
            ))}
      </div>
    </section>
  );
}
