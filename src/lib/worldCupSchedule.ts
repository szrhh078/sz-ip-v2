import type { WorldCupMatch, MatchScore, MatchGoal } from "@/types";

const WORLDCUP_JSON_URL = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

const MATCH_DURATION_MS = 2 * 60 * 60 * 1000; // ~2 hours including stoppage time

interface RawMatch {
  num?: number;
  round: string;
  date: string;
  time: string;
  team1: string;
  team2: string;
  group?: string;
  ground?: string;
  score?: MatchScore;
  goals1?: MatchGoal[];
  goals2?: MatchGoal[];
}

interface RawWorldCupData {
  name: string;
  matches: RawMatch[];
}

/**
 * Parses a "HH:MM UTC±N" time string combined with a "YYYY-MM-DD" date string
 * into an epoch millisecond timestamp.
 */
function parseKickoffTime(date: string, time: string): number {
  // time looks like "13:00 UTC-6" or "20:00 UTC-4"
  const match = time.match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})?/i);
  if (!match) {
    // Fallback: treat as UTC midnight if unparseable
    return new Date(`${date}T00:00:00Z`).getTime();
  }

  const [, hh, mm, offsetStr] = match;
  const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

  // Construct an ISO string in UTC by subtracting the offset
  // local time = UTC + offset  =>  UTC = local time - offset
  const [year, month, day] = date.split("-").map(Number);
  const utcHour = parseInt(hh, 10) - offset;

  const utcDate = new Date(Date.UTC(year, month - 1, day, utcHour, parseInt(mm, 10)));
  return utcDate.getTime();
}

function deriveStatus(kickoffUtc: number, hasScore: boolean): WorldCupMatch["status"] {
  const now = Date.now();
  if (hasScore && now > kickoffUtc + MATCH_DURATION_MS) return "finished";
  if (now < kickoffUtc) return "upcoming";
  if (now >= kickoffUtc && now <= kickoffUtc + MATCH_DURATION_MS) return "live";
  return hasScore ? "finished" : "upcoming";
}

export async function fetchWorldCupSchedule(): Promise<WorldCupMatch[]> {
  const res = await fetch(WORLDCUP_JSON_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: RawWorldCupData = await res.json();

  return data.matches.map((m) => {
    const kickoffUtc = parseKickoffTime(m.date, m.time);
    const hasScore = !!m.score?.ft;
    return {
      ...m,
      kickoffUtc,
      status: deriveStatus(kickoffUtc, hasScore),
    };
  });
}
