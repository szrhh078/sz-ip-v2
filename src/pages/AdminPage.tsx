import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  RefreshCw,
  Activity,
  Database,
  Tv2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
  BarChart3,
  LogOut,
  Megaphone,
  Plus,
  Trash2,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { AnalyticsPanel } from "@/components/admin/AnalyticsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useChannelStore } from "@/store/channelStore";
import { useUserStore } from "@/store/userStore";
import { useStreamHealth } from "@/hooks/useStreamHealth";
import { useAllChannels } from "@/hooks/useAllChannels";
import { useAdminAuthStore } from "@/store/adminAuthStore";
import { useSiteSettingsStore } from "@/store/siteSettingsStore";
import { useCustomChannelsStore } from "@/store/customChannelsStore";
import { AdminLoginPage } from "@/pages/AdminLoginPage";
import { formatTimeAgo } from "@/lib/utils";
import {
  exportAllChannelsAsM3U,
  exportCategoryAsM3U,
  exportCountryAsM3U,
  downloadM3U,
  getDistinctCountries,
} from "@/lib/m3uExporter";
import { getExtraSources, registerExtraSource, unregisterExtraSource, type RegisteredSource } from "@/lib/playlistRegistry";
import { triggerManualSync, getLastSyncTime } from "@/lib/autoUpdateEngine";
import { Download, FileDown, PlusCircle, Trash2 as TrashIcon, Zap } from "lucide-react";

// Source presets so admin-added channels can slot into existing category
// pages (e.g. "Sports" -> shows under /category/sports) or a new custom source.
const SOURCE_PRESETS = ["Bangla TV", "FIFA", "Sports", "Universal", "Custom"];

export function AdminPage() {
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <AdminLoginPage />;
  }

  return <AdminDashboard />;
}

function AdminDashboard() {
  const { sources, isLoading, lastLoaded, loadChannels, refreshSource } = useChannelStore();
  const { channels, groups } = useAllChannels();
  const { favorites, history, pinned } = useUserStore();
  const { healthMap, checking, progress, checkAll } = useStreamHealth();
  const [sampleSize, setSampleSize] = useState(20);
  const logout = useAdminAuthStore((s) => s.logout);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const stats = useMemo(() => {
    return {
      totalChannels: channels.length,
      totalGroups: groups.length,
      totalSources: sources.length,
      okSources: sources.filter((s) => s.status === "ok").length,
      favorites: favorites.length,
      pinned: pinned.length,
      historyEntries: history.length,
    };
  }, [channels, groups, sources, favorites, pinned, history]);

  const healthCounts = useMemo(() => {
    let online = 0,
      offline = 0,
      unknown = 0;
    healthMap.forEach((h) => {
      if (h.status === "online") online++;
      else if (h.status === "offline") offline++;
      else unknown++;
    });
    return { online, offline, unknown, total: healthMap.size };
  }, [healthMap]);

  const handleCheckHealth = () => {
    const sample = channels.slice(0, sampleSize);
    checkAll(sample);
  };

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle="Manage playlists, monitor stream health, and view platform statistics"
        icon={<ShieldCheck className="h-5 w-5 text-white" />}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="brand" onClick={() => loadChannels(true)} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh All Playlists
            </Button>
            <Button variant="secondary" onClick={logout}>
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        }
      />

      <div className="space-y-6 px-4 pb-10 sm:px-6 lg:px-8">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard icon={<Tv2 className="h-5 w-5" />} label="Total Channels" value={stats.totalChannels} color="brand" />
          <StatCard icon={<Database className="h-5 w-5" />} label="Categories" value={stats.totalGroups} color="cyan" />
          <StatCard icon={<Activity className="h-5 w-5" />} label="Active Sources" value={`${stats.okSources}/${stats.totalSources}`} color="emerald" />
          <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Watch History" value={stats.historyEntries} color="violet" />
          <StatCard icon={<Tv2 className="h-5 w-5" />} label="Favorites" value={stats.favorites} color="brand" />
          <StatCard icon={<Tv2 className="h-5 w-5" />} label="Pinned" value={stats.pinned} color="gold" />
          <StatCard
            icon={<RefreshCw className="h-5 w-5" />}
            label="Last Sync"
            value={lastLoaded ? formatTimeAgo(lastLoaded) : "Never"}
            color="cyan"
            small
          />
        </div>

        {/* Live viewer analytics: online users, channel viewer count,
            most viewed channels, device + country breakdowns */}
        <AnalyticsPanel />

        {/* Auto Update Engine status */}
        <AutoUpdateEngineStatus />

        {/* Site Content / Headline editor */}
        <SiteContentEditor />

        {/* Custom channels management */}
        <CustomChannelsManager />

        {/* Playlist sources */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white/70">Playlist Sources</h2>
            <span className="text-xs text-white/40">JSON (primary) · M3U (fallback)</span>
          </div>
          <div className="space-y-3">
            {sources.map((src) => (
              <div key={src.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-200 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-white">{src.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${src.id.startsWith("json-") ? "bg-blue-500/20 text-blue-300" : "bg-white/10 text-white/50"}`}>
                      {src.id.startsWith("json-") ? "JSON" : "M3U"}
                    </span>
                    <SourceStatusBadge status={src.status} />
                  </div>
                  <p className="mt-1 truncate text-xs text-white/40">{src.url}</p>
                  {src.error && <p className="mt-1 text-xs text-red-400">{src.error}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{src.channelCount}</p>
                    <p className="text-xs text-white/40">channels</p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => refreshSource(src.id)}
                    disabled={src.status === "loading"}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${src.status === "loading" ? "animate-spin" : ""}`} />
                    Reload
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Add new playlist sources without removing existing ones */}
        <ExtraSourceManager />

        {/* M3U Export / Converter */}
        <M3UExportPanel channels={channels} groups={groups} />

        {/* Stream health monitor */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white/70">Stream Health Check</h2>
            <div className="flex items-center gap-2">
              <select
                value={sampleSize}
                onChange={(e) => setSampleSize(Number(e.target.value))}
                className="rounded-lg border border-white/10 bg-surface-200 px-3 py-1.5 text-sm text-white focus-ring"
                disabled={checking}
              >
                <option value={10}>10 channels</option>
                <option value={20}>20 channels</option>
                <option value={50}>50 channels</option>
                <option value={100}>100 channels</option>
              </select>
              <Button variant="brand" size="sm" onClick={handleCheckHealth} disabled={checking}>
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                {checking ? `Checking... ${progress}%` : "Run Health Check"}
              </Button>
            </div>
          </div>

          {healthMap.size > 0 && (
            <>
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-400">{healthCounts.online}</p>
                  <p className="text-xs text-white/50">Online</p>
                </div>
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-center">
                  <p className="text-2xl font-bold text-red-400">{healthCounts.offline}</p>
                  <p className="text-xs text-white/50">Offline</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                  <p className="text-2xl font-bold text-white/60">{healthCounts.unknown}</p>
                  <p className="text-xs text-white/50">Unknown</p>
                </div>
              </div>

              <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                {channels.slice(0, sampleSize).map((ch) => {
                  const health = healthMap.get(ch.id);
                  if (!health) return null;
                  return (
                    <div key={ch.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-white/5">
                      <div className="flex min-w-0 items-center gap-2">
                        {health.status === "online" && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                        {health.status === "offline" && <XCircle className="h-4 w-4 shrink-0 text-red-400" />}
                        {health.status === "unknown" && <HelpCircle className="h-4 w-4 shrink-0 text-white/40" />}
                        <span className="truncate text-sm text-white/80">{ch.name}</span>
                      </div>
                      {health.latencyMs && <span className="shrink-0 text-xs text-white/40">{health.latencyMs}ms</span>}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {healthMap.size === 0 && !checking && (
            <p className="text-sm text-white/40">
              Run a health check to test stream connectivity. Note: due to browser CORS restrictions, results marked
              "Unknown" may still be working streams that simply block diagnostic requests.
            </p>
          )}
        </motion.div>

        {/* Active channels by category */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass p-5">
          <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-white/70">Channels by Category</h2>
          <div className="space-y-2">
            {groups.slice(0, 15).map((group) => {
              const count = channels.filter((c) => c.group === group).length;
              const pct = Math.round((count / channels.length) * 100);
              return (
                <div key={group} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 truncate text-sm text-white/70">{group}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-300">
                    <div className="h-full gradient-brand rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs text-white/40">{count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "brand" | "cyan" | "emerald" | "violet" | "gold";
  small?: boolean;
}) {
  const colorMap = {
    brand: "text-brand-400 bg-brand-500/10",
    cyan: "text-accent-cyan bg-accent-cyan/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
    violet: "text-accent-violet bg-accent-violet/10",
    gold: "text-accent-gold bg-accent-gold/10",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass p-4">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${colorMap[color]}`}>{icon}</div>
      <p className={`font-display font-extrabold text-white ${small ? "text-base" : "text-2xl"}`}>{value}</p>
      <p className="mt-0.5 text-xs text-white/40">{label}</p>
    </motion.div>
  );
}

function SourceStatusBadge({ status }: { status: string }) {
  if (status === "ok") return <Badge variant="success">Online</Badge>;
  if (status === "error") return <Badge variant="warning">Error</Badge>;
  if (status === "loading") return <Badge variant="outline">Loading...</Badge>;
  return <Badge variant="outline">Idle</Badge>;
}

function AutoUpdateEngineStatus() {
  const [lastSync, setLastSync] = useState<number | undefined>(undefined);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    getLastSyncTime().then(setLastSync);
  }, []);

  const handleForceSync = async () => {
    setSyncing(true);
    await triggerManualSync();
    const t = await getLastSyncTime();
    setLastSync(t);
    setSyncing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl glass p-5 flex flex-wrap items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-accent-violet">
          <Zap className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Auto Update Engine</p>
          <p className="text-xs text-white/40">
            Background sync every 6 hours · channels, logos, cache cleanup
            {lastSync ? ` · last full sync ${formatTimeAgo(lastSync)}` : " · no sync recorded yet"}
          </p>
        </div>
      </div>
      <Button variant="secondary" size="sm" onClick={handleForceSync} disabled={syncing}>
        {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
        {syncing ? "Syncing..." : "Force Full Sync"}
      </Button>
    </motion.div>
  );
}

function ExtraSourceManager() {
  const { addChannel: addCustomChannel } = useCustomChannelsStore();
  const [extraSources, setExtraSources] = useState<RegisteredSource[]>(() => getExtraSources());
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const refreshList = () => setExtraSources(getExtraSources());

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !name.trim()) return;
    setIsAdding(true);
    setStatusMsg(null);

    try {
      const sourceId = `extra-${Date.now()}`;
      const res = await fetch(url.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      let channels: import("@/types").Channel[] = [];
      const looksLikeJson = text.trim().startsWith("[") || text.trim().startsWith("{");

      if (looksLikeJson) {
        const data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : data.channels || [];
        const { parseJsonInWorker } = await import("@/lib/parserWorkerClient");
        channels = await parseJsonInWorker(arr, sourceId, name.trim());
      } else {
        const { parseM3UInWorker } = await import("@/lib/parserWorkerClient");
        channels = await parseM3UInWorker(text, sourceId, name.trim());
      }

      if (channels.length === 0) {
        throw new Error("No channels found — check the URL points to a valid M3U or JSON playlist");
      }

      // Register in the additive source registry (does not touch core sources)
      registerExtraSource({ id: sourceId, name: name.trim(), url: url.trim(), kind: looksLikeJson ? "json" : "m3u" });

      // Add channels into the existing customChannelsStore so they appear
      // app-wide (home, search, categories) alongside everything else
      for (const ch of channels) {
        addCustomChannel({ ...ch, source: name.trim() });
      }

      setStatusMsg({ type: "success", text: `Added ${channels.length} channels from "${name.trim()}"` });
      setUrl("");
      setName("");
      refreshList();
    } catch (err) {
      setStatusMsg({ type: "error", text: err instanceof Error ? err.message : "Failed to add source" });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = (id: string) => {
    unregisterExtraSource(id);
    refreshList();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass p-5">
      <div className="mb-4 flex items-center gap-2">
        <PlusCircle className="h-4 w-4 text-white/70" />
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white/70">
          Add Playlist Source
        </h2>
      </div>
      <p className="mb-4 text-xs text-white/40">
        Add additional M3U or JSON playlist URLs without removing or replacing any existing source. New sources
        merge into the catalogue and duplicates are automatically filtered out by stream URL.
      </p>

      <form onSubmit={handleAdd} className="mb-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Source name (e.g. My Extra Channels)"
            className="rounded-lg border border-white/10 bg-surface-200 px-3 py-2 text-sm text-white placeholder:text-white/30 focus-ring"
          />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/playlist.m3u or .json"
            className="rounded-lg border border-white/10 bg-surface-200 px-3 py-2 text-sm text-white placeholder:text-white/30 focus-ring"
          />
        </div>
        <Button type="submit" variant="brand" size="sm" disabled={isAdding || !url.trim() || !name.trim()}>
          {isAdding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />}
          {isAdding ? "Fetching & Parsing..." : "Add Source"}
        </Button>
      </form>

      {statusMsg && (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            statusMsg.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {extraSources.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Added Sources (runtime)</p>
          {extraSources.map((src) => (
            <div key={src.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface-200 p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-white">{src.name}</p>
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                    {src.kind.toUpperCase()}
                  </span>
                </div>
                <p className="truncate text-xs text-white/40">{src.url}</p>
              </div>
              <Button variant="destructive" size="icon-sm" onClick={() => handleRemove(src.id)} aria-label="Remove">
                <TrashIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function M3UExportPanel({ channels, groups }: { channels: import("@/types").Channel[]; groups: string[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>(groups[0] || "");
  const countries = useMemo(() => getDistinctCountries(channels), [channels]);
  const [selectedCountry, setSelectedCountry] = useState<string>(countries[0] || "");

  const handleExportAll = () => {
    const m3u = exportAllChannelsAsM3U(channels);
    downloadM3U(m3u, "sz-iptv-full-playlist.m3u");
  };

  const handleExportCategory = () => {
    if (!selectedCategory) return;
    const m3u = exportCategoryAsM3U(channels, selectedCategory);
    downloadM3U(m3u, `sz-iptv-${selectedCategory.toLowerCase().replace(/\s+/g, "-")}.m3u`);
  };

  const handleExportCountry = () => {
    if (!selectedCountry) return;
    const m3u = exportCountryAsM3U(channels, selectedCountry);
    downloadM3U(m3u, `sz-iptv-${selectedCountry.toLowerCase().replace(/\s+/g, "-")}.m3u`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass p-5">
      <div className="mb-4 flex items-center gap-2">
        <FileDown className="h-4 w-4 text-white/70" />
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white/70">
          M3U Converter & Export
        </h2>
      </div>
      <p className="mb-4 text-xs text-white/40">
        Convert the merged, deduplicated channel catalogue (JSON + M3U + custom sources combined) back into
        standard M3U playlist files for backup or re-use elsewhere.
      </p>

      <div className="space-y-3">
        {/* Full export */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-200 p-4">
          <div>
            <p className="text-sm font-semibold text-white">Full Merged Playlist</p>
            <p className="text-xs text-white/40">{channels.length} channels, all sources combined</p>
          </div>
          <Button variant="brand" size="sm" onClick={handleExportAll}>
            <Download className="h-3.5 w-3.5" /> Export All (.m3u)
          </Button>
        </div>

        {/* Category export */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-200 p-4">
          <div className="flex-1 min-w-[160px]">
            <p className="text-sm font-semibold text-white">By Category</p>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-white/10 bg-surface-300 px-3 py-1.5 text-sm text-white focus-ring"
            >
              {groups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <Button variant="secondary" size="sm" onClick={handleExportCategory} disabled={!selectedCategory}>
            <Download className="h-3.5 w-3.5" /> Export Category
          </Button>
        </div>

        {/* Country export */}
        {countries.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-200 p-4">
            <div className="flex-1 min-w-[160px]">
              <p className="text-sm font-semibold text-white">By Country</p>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-white/10 bg-surface-300 px-3 py-1.5 text-sm text-white focus-ring"
              >
                {countries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <Button variant="secondary" size="sm" onClick={handleExportCountry} disabled={!selectedCountry}>
              <Download className="h-3.5 w-3.5" /> Export Country
            </Button>
          </div>
        )}

        {countries.length === 0 && (
          <p className="text-xs text-white/30 italic">
            No country metadata found on current channels — country export will appear once sources include it.
          </p>
        )}
      </div>
    </motion.div>
  );
}

function SiteContentEditor() {
  const {
    hero,
    announcement,
    setHero,
    setAnnouncement,
    resetHero,
    publish,
    isPublishing,
    isLoaded,
    isDirty,
    lastPublished,
    publishError,
  } = useSiteSettingsStore();
  const [justPublished, setJustPublished] = useState(false);

  const handlePublish = async () => {
    const ok = await publish();
    if (ok) {
      setJustPublished(true);
      setTimeout(() => setJustPublished(false), 2500);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-white/70">
          <Megaphone className="h-4 w-4" /> Homepage Headline & Hero
        </h2>
        <div className="flex items-center gap-2 text-xs">
          {!isLoaded && (
            <span className="flex items-center gap-1 text-white/40">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading...
            </span>
          )}
          {isLoaded && isDirty && (
            <span className="flex items-center gap-1 font-semibold text-amber-400">Unpublished changes</span>
          )}
          {isLoaded && !isDirty && lastPublished && (
            <span className="text-white/40">Published {formatTimeAgo(lastPublished)}</span>
          )}
        </div>
      </div>

      {!useAdminAuthStore.getState().isFirebase && (
        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          Firebase isn't configured, so this saves to this browser only and won't appear on other devices. Set up
          Firebase + Firestore (see README) to publish site-wide.
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-white">Show Custom Hero Slide</p>
            <p className="mt-0.5 text-xs text-white/40">
              When enabled, your custom headline appears as the first slide on the homepage hero banner, ahead of
              live channels.
            </p>
          </div>
          <Switch checked={hero.enabled} onCheckedChange={(val) => setHero({ enabled: val })} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title (main headline)">
            <Input
              value={hero.title}
              onChange={(e) => setHero({ title: e.target.value })}
              placeholder="e.g. Welcome to Shahriar TV!"
            />
          </Field>
          <Field label="Subtitle (optional)">
            <Input
              value={hero.subtitle}
              onChange={(e) => setHero({ subtitle: e.target.value })}
              placeholder="e.g. New Bangla channels added"
            />
          </Field>
          <Field label="Badge text">
            <Input
              value={hero.badgeText}
              onChange={(e) => setHero({ badgeText: e.target.value })}
              placeholder="ANNOUNCEMENT"
            />
          </Field>
          <Field label="Button text">
            <Input
              value={hero.buttonText}
              onChange={(e) => setHero({ buttonText: e.target.value })}
              placeholder="Explore"
            />
          </Field>
          <Field label="Button link" className="sm:col-span-2">
            <Input
              value={hero.buttonLink}
              onChange={(e) => setHero({ buttonLink: e.target.value })}
              placeholder="/live or /category/sports"
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              value={hero.description}
              onChange={(e) => setHero({ description: e.target.value })}
              rows={3}
              placeholder="Write a short message shown to all visitors..."
              className="flex w-full rounded-xl border border-white/10 bg-surface-200 px-4 py-2.5 text-sm text-white placeholder:text-white/40 transition-colors focus-ring focus:border-brand-500/50"
            />
          </Field>
        </div>

        <div className="h-px bg-white/10" />

        {/* Announcement Banner */}
        <div className="rounded-xl bg-surface-200 p-4 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">📢 Site-wide Announcement Banner</p>
              <p className="mt-0.5 text-xs text-white/40">
                Shows a dismissible banner at the top of every page for all visitors. Toggle on to show it.
              </p>
            </div>
            <Switch checked={announcement.enabled} onCheckedChange={(val) => setAnnouncement({ enabled: val })} />
          </div>
          <Field label="Announcement Text">
            <Input
              value={announcement.text}
              onChange={(e) => setAnnouncement({ text: e.target.value })}
              placeholder="e.g. World Cup 2026 is LIVE now — Watch all matches on Shahriar TV!"
              disabled={!announcement.enabled}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Button Link (optional)">
              <Input
                value={announcement.link || ""}
                onChange={(e) => setAnnouncement({ link: e.target.value })}
                placeholder="/schedule or /category/fifa"
                disabled={!announcement.enabled}
              />
            </Field>
            <Field label="Button Text (optional)">
              <Input
                value={announcement.linkText || ""}
                onChange={(e) => setAnnouncement({ linkText: e.target.value })}
                placeholder="Watch Now"
                disabled={!announcement.enabled}
              />
            </Field>
          </div>
          {announcement.enabled && announcement.text && (
            <div className="rounded-lg overflow-hidden">
              <p className="mb-1.5 text-xs font-semibold text-white/40 uppercase tracking-wider">Preview</p>
              <div className="gradient-brand rounded-lg px-4 py-2.5 flex items-center gap-3">
                <Megaphone className="h-4 w-4 text-white/80 shrink-0" />
                <p className="flex-1 text-sm font-medium text-white truncate">{announcement.text}</p>
                {announcement.linkText && (
                  <span className="shrink-0 rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold text-white">
                    {announcement.linkText}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {publishError && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            Failed to publish: {publishError}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="brand" onClick={handlePublish} disabled={isPublishing || !isLoaded}>
            {isPublishing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Publishing...
              </>
            ) : justPublished ? (
              <>
                <Check className="h-4 w-4" /> Published!
              </>
            ) : (
              <>
                <Megaphone className="h-4 w-4" /> Save & Publish
              </>
            )}
          </Button>
          <Button variant="secondary" size="sm" onClick={resetHero}>
            Reset to Default
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50">{label}</label>
      {children}
    </div>
  );
}

function CustomChannelsManager() {
  const { customChannels, addChannel, updateChannel, removeChannel } = useCustomChannelsStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", url: "", logo: "", group: "Custom", source: "Custom" });
  const [customSource, setCustomSource] = useState(false);

  const resetForm = () => {
    setForm({ name: "", url: "", logo: "", group: "Custom", source: "Custom" });
    setCustomSource(false);
  };

  const startEdit = (channel: (typeof customChannels)[number]) => {
    setEditingId(channel.id);
    setIsAdding(false);
    setForm({
      name: channel.name,
      url: channel.url,
      logo: channel.logo,
      group: channel.group,
      source: channel.source,
    });
    setCustomSource(!SOURCE_PRESETS.includes(channel.source));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.url.trim()) return;

    const payload = {
      name: form.name.trim(),
      url: form.url.trim(),
      logo: form.logo.trim(),
      group: form.group.trim() || "Custom",
      source: form.source.trim() || "Custom",
    };

    if (editingId) {
      updateChannel(editingId, payload);
      setEditingId(null);
    } else {
      addChannel(payload);
      setIsAdding(false);
    }
    resetForm();
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    resetForm();
  };

  const showForm = isAdding || editingId !== null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-white/70">
          <Tv2 className="h-4 w-4" /> Custom Channels ({customChannels.length})
        </h2>
        {!showForm && (
          <Button variant="brand" size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4" /> Add Channel
          </Button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 grid gap-3 rounded-xl bg-surface-200 p-4 sm:grid-cols-2">
          <Field label="Channel Name">
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. My Sports Channel"
              required
            />
          </Field>
          <Field label="Category / Group">
            <Input
              value={form.group}
              onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
              placeholder="e.g. Sports"
            />
          </Field>
          <Field label="Source" className="sm:col-span-2">
            {customSource ? (
              <div className="flex gap-2">
                <Input
                  value={form.source}
                  onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
                  placeholder="e.g. My Network"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setCustomSource(false);
                    setForm((f) => ({ ...f, source: "Custom" }));
                  }}
                >
                  Use preset
                </Button>
              </div>
            ) : (
              <select
                value={form.source}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setCustomSource(true);
                    setForm((f) => ({ ...f, source: "" }));
                  } else {
                    setForm((f) => ({ ...f, source: e.target.value }));
                  }
                }}
                className="flex h-11 w-full rounded-xl border border-white/10 bg-surface-200 px-4 py-2 text-sm text-white transition-colors focus-ring focus:border-brand-500/50"
              >
                {SOURCE_PRESETS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="__custom__">+ New source...</option>
              </select>
            )}
            <p className="mt-1.5 text-xs text-white/40">
              Determines which category page this channel appears on (e.g. "Sports" → /category/sports). Choose
              "Custom" or a new source name to keep it separate.
            </p>
          </Field>
          <Field label="Stream URL (.m3u8)" className="sm:col-span-2">
            <Input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://example.com/stream/index.m3u8"
              required
            />
          </Field>
          <Field label="Logo URL (optional)" className="sm:col-span-2">
            <Input
              value={form.logo}
              onChange={(e) => setForm((f) => ({ ...f, logo: e.target.value }))}
              placeholder="https://example.com/logo.png"
            />
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" variant="brand" size="sm">
              <Check className="h-4 w-4" /> {editingId ? "Save Changes" : "Add Channel"}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={cancelForm}>
              <X className="h-4 w-4" /> Cancel
            </Button>
          </div>
        </form>
      )}

      {customChannels.length === 0 ? (
        <p className="text-sm text-white/40">
          No custom channels yet. Add channels manually here — they'll appear across the home page, search, and
          category pages alongside playlist channels.
        </p>
      ) : (
        <div className="space-y-2">
          {customChannels.map((ch) => (
            <div key={ch.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-200 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-300 flex items-center justify-center">
                  {ch.logo ? (
                    <img src={ch.logo} alt="" className="h-full w-full object-contain p-1" />
                  ) : (
                    <Tv2 className="h-4 w-4 text-white/30" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{ch.name}</p>
                  <p className="truncate text-xs text-white/40">
                    {ch.group} · <span className="text-white/30">source: {ch.source}</span>
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button variant="secondary" size="icon-sm" onClick={() => startEdit(ch)} aria-label="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="destructive" size="icon-sm" onClick={() => removeChannel(ch.id)} aria-label="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

