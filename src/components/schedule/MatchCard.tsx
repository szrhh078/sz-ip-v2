import { MapPin, Clock } from "lucide-react";
import type { WorldCupMatch } from "@/types";
import { Badge } from "@/components/ui/badge";
import { formatMatchDateTime, formatMatchTime, formatCountdown } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MatchCardProps {
  match: WorldCupMatch;
  compact?: boolean;
}

export function MatchCard({ match, compact }: MatchCardProps) {
  const score1 = match.score?.ft?.[0];
  const score2 = match.score?.ft?.[1];
  const hasScore = score1 !== undefined && score2 !== undefined;
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        isLive
          ? "border-brand-500/40 bg-brand-500/8 shadow-lg shadow-brand-600/10"
          : "border-white/8 glass"
      )}
    >
      {/* Header row */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {match.group && (
            <span className="shrink-0 rounded-full bg-surface-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/60">
              {match.group}
            </span>
          )}
          <span className="truncate text-[10px] text-white/40">{match.round}</span>
        </div>
        <div className="shrink-0">
          {isLive && (
            <Badge variant="live">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </Badge>
          )}
          {isFinished && <Badge variant="success">Final</Badge>}
          {!isLive && !isFinished && !compact && (
            <span className="text-xs font-medium text-white/50">{formatCountdown(match.kickoffUtc)}</span>
          )}
        </div>
      </div>

      {/* Teams & score */}
      <div className="space-y-2">
        {/* Team 1 */}
        <div className="flex items-center justify-between gap-3">
          <p className={cn("font-display text-base font-bold", isLive ? "text-white" : "text-white/90")}>
            {match.team1}
          </p>
          {hasScore && (
            <span className={cn("font-display text-xl font-extrabold tabular-nums", isLive ? "text-brand-300" : "text-white")}>
              {score1}
            </span>
          )}
        </div>
        {/* Divider */}
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-white/10" />
          {!hasScore && (
            <span className="text-xs font-bold text-white/30">VS</span>
          )}
          {hasScore && match.score?.ht && (
            <span className="text-[10px] text-white/30">HT {match.score.ht[0]}-{match.score.ht[1]}</span>
          )}
          <div className="h-px flex-1 bg-white/10" />
        </div>
        {/* Team 2 */}
        <div className="flex items-center justify-between gap-3">
          <p className={cn("font-display text-base font-bold", isLive ? "text-white" : "text-white/90")}>
            {match.team2}
          </p>
          {hasScore && (
            <span className={cn("font-display text-xl font-extrabold tabular-nums", isLive ? "text-brand-300" : "text-white")}>
              {score2}
            </span>
          )}
        </div>
      </div>

      {/* Goal scorers (compact view hides these) */}
      {!compact && hasScore && (match.goals1?.length || match.goals2?.length) && (
        <div className="mt-2 space-y-0.5">
          {match.goals1?.map((g, i) => (
            <p key={i} className="text-[10px] text-white/40">⚽ {g.name} {g.minute}'</p>
          ))}
          {match.goals2?.map((g, i) => (
            <p key={i} className="text-[10px] text-white/40 text-right">⚽ {g.name} {g.minute}'</p>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-white/35">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatMatchTime(match.kickoffUtc)}
        </span>
        {!compact && (
          <span>{formatMatchDateTime(match.kickoffUtc)}</span>
        )}
        {match.ground && (
          <span className="flex items-center gap-1 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            {match.ground}
          </span>
        )}
      </div>
    </div>
  );
}
