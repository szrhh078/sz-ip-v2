import type { Channel } from "@/types";

/**
 * Promise-based client for the parser Web Worker.
 * Falls back to synchronous (main-thread) parsing if Workers are
 * unavailable (e.g. some restrictive embedded webviews), so this
 * never breaks functionality — it's a pure performance upgrade.
 */

type WorkerResultMsg = { type: "result"; id: number; channels: Channel[] };
type WorkerErrorMsg = { type: "error"; id: number; error: string };
type WorkerMsg = WorkerResultMsg | WorkerErrorMsg;

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (c: Channel[]) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (typeof Worker === "undefined") return null;
  if (worker) return worker;

  try {
    worker = new Worker(new URL("../workers/parser.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerMsg>) => {
      const msg = event.data;
      const entry = pending.get(msg.id);
      if (!entry) return;
      pending.delete(msg.id);
      if (msg.type === "result") entry.resolve(msg.channels);
      else entry.reject(new Error(msg.error));
    };
    worker.onerror = (err) => {
      console.warn("[ParserWorker] Worker error, will fall back to main thread:", err);
      worker = null;
    };
    return worker;
  } catch (err) {
    console.warn("[ParserWorker] Could not create worker, falling back to main thread:", err);
    return null;
  }
}

function callWorker<T>(message: T): Promise<Channel[]> {
  const w = getWorker();
  if (!w) return Promise.reject(new Error("Worker unavailable"));

  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    w.postMessage({ ...message, id });

    // Safety timeout
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error("Worker timeout"));
      }
    }, 30000);
  });
}

export async function parseM3UInWorker(text: string, sourceId: string, sourceName: string): Promise<Channel[]> {
  try {
    return await callWorker({ type: "parse-m3u", payload: { text, sourceId, sourceName } });
  } catch {
    // Fallback: parse on main thread
    const { parseM3U } = await import("@/lib/m3uParser");
    return parseM3U(text, sourceId, sourceName);
  }
}

export async function parseJsonInWorker(data: unknown[], sourceId: string, sourceName: string): Promise<Channel[]> {
  try {
    return await callWorker({ type: "parse-json", payload: { data, sourceId, sourceName } });
  } catch {
    const { parseJsonPlaylist } = await import("@/lib/jsonParser");
    return parseJsonPlaylist(data as Parameters<typeof parseJsonPlaylist>[0], sourceId, sourceName);
  }
}

export async function dedupeInWorker(channels: Channel[]): Promise<Channel[]> {
  try {
    return await callWorker({ type: "dedupe", payload: { channels } });
  } catch {
    const { deduplicateChannels } = await import("@/lib/m3uParser");
    return deduplicateChannels(channels);
  }
}
