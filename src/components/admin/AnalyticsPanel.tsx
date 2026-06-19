import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Tv2, Smartphone, Globe2, TrendingUp } from "lucide-react";
import { useAnalyticsStore } from "@/store/analyticsStore";
import { isFirebaseConfigured } from "@/lib/firebase";

const DEVICE_LABELS: Record<string, string> = {
  mobile: "Mobile",
  tablet: "Tablet",
  desktop: "Desktop",
  tv: "Smart TV",
};

/**
 * Online users / channel viewer counts / most viewed channels / device +
 * country analytics — the 5 metrics scoped for Shahriar TV. See
 * src/lib/analytics.ts for what this data does and doesn't guarantee
 * (heartbeat-based presence, IP-based country, no backend).
 */
export function AnalyticsPanel() {
  const init = useAnalyticsStore((s) => s.init);
  const isLoaded = useAnalyticsStore((s) => s.isLoaded);
  const onlineCount = useAnalyticsStore((s) => s.onlineCount);
  const channelViewerCounts = useAnalyticsStore((s) => s.channelViewerCounts);
  const deviceBreakdown = useAnalyticsStore((s) => s.deviceBreakdown);
  const countryBreakdown = useAnalyticsStore((s) => s.countryBreakdown);
  const topViewedChannels = useAnalyticsStore((s) => s.topViewedChannels);

  // Force a periodic re-render so the 60s "online" window in the store's
  // derived getters stays accurate even when no new Firestore snapshot
  // arrives (e.g. nobody's heartbeat ticked in the last few seconds).
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = init();
    const tick = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => {
      unsubscribe();
      clearInterval(tick);
    };
  }, [init]);

  if (!isFirebaseConfigured) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass p-5">
        <h2 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-white/70">Viewer Analytics</h2>
        <p className="text-sm text-white/40">Firebase isn't configured, so live viewer analytics are unavailable.</p>
      </motion.div>
    );
  }

  const viewers = channelViewerCounts();
  const devices = deviceBreakdown();
  const countries = countryBreakdown();
  const maxViewers = viewers[0]?.count || 1;
  const maxDevice = devices[0]?.count || 1;
  const maxCountry = countries[0]?.count || 1;
  const maxAllTime = topViewedChannels[0]?.totalViews || 1;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl glass p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white/70">Viewer Analytics</h2>
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
        </span>
      </div>

      {!isLoaded ? (
        <p className="text-sm text-white/40">Loading analytics…</p>
      ) : (
        <div className="space-y-6">
          {/* Online now */}
          <div className="flex items-center gap-3 rounded-xl bg-surface-200 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-2xl font-extrabold text-white">{onlineCount()}</p>
              <p className="text-xs text-white/40">Online right now (active in the last 60s)</p>
            </div>
          </div>

          {/* Channel viewer counts (live) */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50">
              <Tv2 className="h-3.5 w-3.5" /> Channel Viewer Count (now)
            </h3>
            {viewers.length === 0 ? (
              <p className="text-xs text-white/40">No one is watching a channel right now.</p>
            ) : (
              <div className="space-y-2">
                {viewers.slice(0, 8).map((v) => (
                  <div key={v.channelId} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm text-white/70">{v.channelName}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-300">
                      <div className="h-full gradient-brand rounded-full" style={{ width: `${(v.count / maxViewers) * 100}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs text-white/40">{v.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Most viewed channels (all-time) */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50">
              <TrendingUp className="h-3.5 w-3.5" /> Most Viewed Channels (all-time)
            </h3>
            {topViewedChannels.length === 0 ? (
              <p className="text-xs text-white/40">No view data yet.</p>
            ) : (
              <div className="space-y-2">
                {topViewedChannels.map((c) => (
                  <div key={c.channelId} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-sm text-white/70">{c.channelName}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-300">
                      <div className="h-full bg-accent-cyan rounded-full" style={{ width: `${(c.totalViews / maxAllTime) * 100}%` }} />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs text-white/40">{c.totalViews}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* Device analytics */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50">
                <Smartphone className="h-3.5 w-3.5" /> Devices (now)
              </h3>
              {devices.length === 0 ? (
                <p className="text-xs text-white/40">No active sessions.</p>
              ) : (
                <div className="space-y-2">
                  {devices.map((d) => (
                    <div key={d.device} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 truncate text-sm text-white/70">{DEVICE_LABELS[d.device] || d.device}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-300">
                        <div className="h-full bg-accent-violet rounded-full" style={{ width: `${(d.count / maxDevice) * 100}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs text-white/40">{d.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Country analytics */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50">
                <Globe2 className="h-3.5 w-3.5" /> Countries (now)
              </h3>
              {countries.length === 0 ? (
                <p className="text-xs text-white/40">No active sessions.</p>
              ) : (
                <div className="space-y-2">
                  {countries.slice(0, 6).map((c) => (
                    <div key={c.country} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 truncate text-sm text-white/70">{c.country}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-300">
                        <div className="h-full bg-accent-gold rounded-full" style={{ width: `${(c.count / maxCountry) * 100}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-xs text-white/40">{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-white/30">
            "Now" figures count sessions with a heartbeat in the last 60 seconds — not instant, but close. Country is
            estimated from IP address via a third-party lookup and may show "Unknown" for some visitors.
          </p>
        </div>
      )}
    </motion.div>
  );
}
