import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { reportHeartbeat, clearHeartbeat } from "@/lib/analytics";
import { useAllChannels } from "@/hooks/useAllChannels";

const HEARTBEAT_INTERVAL_MS = 20_000;

/**
 * Mounted once in Layout (above <Outlet/>). Sends a presence heartbeat on
 * an interval and immediately whenever the watched channel changes, so the
 * admin "Online users" / "Channel viewer count" panel stays roughly live.
 * See the limitations documented at the top of src/lib/analytics.ts.
 */
export function AnalyticsBeacon() {
  const location = useLocation();
  const { channels } = useAllChannels();

  // Parsed straight from the URL rather than via useParams(): this
  // component lives above the route that owns the :channelId param, and
  // pathname parsing is unambiguous regardless of router-version nesting
  // semantics.
  const watchMatch = location.pathname.match(/^\/watch\/([^/]+)/);
  const channelId = watchMatch ? decodeURIComponent(watchMatch[1]) : null;
  const channelName = channelId ? channels.find((c) => c.id === channelId)?.name ?? null : null;

  useEffect(() => {
    // Fire immediately on route/channel change, then keep a steady heartbeat.
    reportHeartbeat(channelId, channelName);
    const interval = setInterval(() => {
      reportHeartbeat(channelId, channelName);
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [channelId, channelName]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") clearHeartbeat();
    };
    window.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", clearHeartbeat);
    return () => {
      window.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", clearHeartbeat);
    };
  }, []);

  return null;
}
