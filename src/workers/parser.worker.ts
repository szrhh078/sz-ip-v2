/// <reference lib="webworker" />
import { parseM3U, deduplicateChannels } from "@/lib/m3uParser";
import { parseJsonPlaylist } from "@/lib/jsonParser";
import type { Channel } from "@/types";

/**
 * Parser Worker — runs M3U/JSON parsing off the main thread.
 * For large playlists this prevents any UI jank/freeze since parsing
 * (string splitting, regex, array building) happens entirely in this worker.
 *
 * Message protocol:
 *   { type: "parse-m3u", id, payload: { text, sourceId, sourceName } }
 *   { type: "parse-json", id, payload: { data, sourceId, sourceName } }
 *   { type: "dedupe", id, payload: { channels } }
 * Responses:
 *   { type: "result", id, channels }
 *   { type: "error", id, error }
 */

type IncomingMessage =
  | { type: "parse-m3u"; id: number; payload: { text: string; sourceId: string; sourceName: string } }
  | { type: "parse-json"; id: number; payload: { data: unknown[]; sourceId: string; sourceName: string } }
  | { type: "dedupe"; id: number; payload: { channels: Channel[] } };

self.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const msg = event.data;
  try {
    switch (msg.type) {
      case "parse-m3u": {
        const channels = parseM3U(msg.payload.text, msg.payload.sourceId, msg.payload.sourceName);
        (self as unknown as Worker).postMessage({ type: "result", id: msg.id, channels });
        break;
      }
      case "parse-json": {
        const channels = parseJsonPlaylist(
          msg.payload.data as Parameters<typeof parseJsonPlaylist>[0],
          msg.payload.sourceId,
          msg.payload.sourceName
        );
        (self as unknown as Worker).postMessage({ type: "result", id: msg.id, channels });
        break;
      }
      case "dedupe": {
        const channels = deduplicateChannels(msg.payload.channels);
        (self as unknown as Worker).postMessage({ type: "result", id: msg.id, channels });
        break;
      }
    }
  } catch (err) {
    (self as unknown as Worker).postMessage({
      type: "error",
      id: msg.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
