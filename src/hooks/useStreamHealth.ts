import { useState, useCallback } from "react";
import type { Channel, StreamHealth } from "@/types";

/**
 * Checks stream health by attempting a HEAD/GET request to the stream URL.
 * Note: many IPTV streams won't respond to fetch due to CORS, so we treat
 * "no error thrown" or specific network responses as best-effort signals.
 */
export function useStreamHealth() {
  const [healthMap, setHealthMap] = useState<Map<string, StreamHealth>>(new Map());
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);

  const checkChannel = useCallback(async (channel: Channel): Promise<StreamHealth> => {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      await fetch(channel.url, {
        method: "GET",
        mode: "no-cors",
        signal: controller.signal,
        headers: { Range: "bytes=0-1024" },
      });

      clearTimeout(timeout);
      const latencyMs = Math.round(performance.now() - start);

      return {
        channelId: channel.id,
        status: "online",
        lastChecked: Date.now(),
        latencyMs,
      };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      // no-cors fetch errors are often opaque; if it took >0ms and didn't
      // immediately reject due to invalid URL, treat as "unknown" rather than offline
      if (err instanceof DOMException && err.name === "AbortError") {
        return {
          channelId: channel.id,
          status: "offline",
          lastChecked: Date.now(),
          latencyMs,
          error: "Timeout",
        };
      }
      return {
        channelId: channel.id,
        status: "unknown",
        lastChecked: Date.now(),
        latencyMs,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }, []);

  const checkAll = useCallback(
    async (channels: Channel[], concurrency = 6) => {
      setChecking(true);
      setProgress(0);
      const results = new Map<string, StreamHealth>();
      let completed = 0;

      const queue = [...channels];
      const workers = Array.from({ length: concurrency }).map(async () => {
        while (queue.length > 0) {
          const channel = queue.shift();
          if (!channel) break;
          const health = await checkChannel(channel);
          results.set(channel.id, health);
          completed++;
          setProgress(Math.round((completed / channels.length) * 100));
          setHealthMap(new Map(results));
        }
      });

      await Promise.all(workers);
      setChecking(false);
      return results;
    },
    [checkChannel]
  );

  return { healthMap, checking, progress, checkAll, checkChannel };
}
