export interface Channel {
  id: string;
  name: string;
  url: string;
  logo: string;
  group: string;
  source: string;
  tvgId?: string;
  tvgName?: string;
  resolution?: string;
  isLive: boolean;
  country?: string;
  language?: string;
  streamType?: "hls" | "dash";
  drmKid?: string;   // ClearKey DRM key ID
  drmKey?: string;   // ClearKey DRM key
  verified?: boolean;
  verifiedAt?: string;
  statusCode?: number;
}

export interface ChannelGroup {
  name: string;
  channels: Channel[];
  source: string;
}

export interface PlaylistSource {
  id: string;
  name: string;
  url: string;
  channelCount: number;
  lastUpdated: number;
  status: "ok" | "error" | "loading" | "idle";
  error?: string;
}

export interface WatchHistoryEntry {
  channelId: string;
  channelName: string;
  channelLogo: string;
  group: string;
  watchedAt: number;
  duration: number;
}

export interface StreamHealth {
  channelId: string;
  status: "online" | "offline" | "checking" | "unknown";
  lastChecked: number;
  latencyMs?: number;
  error?: string;
}

export type ViewMode = "grid" | "list" | "compact";

export type PlayerQuality = "auto" | string;

export interface PlayerState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  isFullscreen: boolean;
  isPiP: boolean;
  isTheater: boolean;
  quality: PlayerQuality;
  qualities: { id: number; label: string; bitrate: number }[];
  buffering: boolean;
  error: string | null;
  reconnectAttempts: number;
  /** Seconds of video currently buffered ahead of playback position. */
  bufferHealth: number;
  /** Best-effort network classification from the Network Information API. */
  networkQuality: "unknown" | "slow" | "medium" | "fast";
}

export interface MatchGoal {
  name: string;
  minute: string;
}

export interface MatchScore {
  ft?: [number, number];
  ht?: [number, number];
  et?: [number, number];
  p?: [number, number];
}

export interface WorldCupMatch {
  num?: number;
  round: string;
  date: string; // YYYY-MM-DD
  time: string; // "HH:MM UTC±N"
  team1: string;
  team2: string;
  group?: string;
  ground?: string;
  score?: MatchScore;
  goals1?: MatchGoal[];
  goals2?: MatchGoal[];
  /** Derived fields, computed client-side */
  kickoffUtc: number; // epoch ms
  status: "upcoming" | "live" | "finished";
}
