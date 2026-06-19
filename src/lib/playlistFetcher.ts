/**
 * Fetches a remote M3U playlist as text. If a direct fetch fails (e.g. CORS),
 * falls back to a list of public CORS proxies.
 */

const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

export async function fetchPlaylistText(url: string, timeoutMs = 15000): Promise<string> {
  // Try direct fetch first
  try {
    const text = await fetchWithTimeout(url, timeoutMs);
    if (text && text.includes("#EXTM3U")) return text;
  } catch {
    // fall through to proxies
  }

  // Try proxies in order
  let lastError: unknown = null;
  for (const buildProxyUrl of CORS_PROXIES) {
    try {
      const proxied = buildProxyUrl(url);
      const text = await fetchWithTimeout(proxied, timeoutMs);
      if (text && text.includes("#EXTM3U")) return text;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `Failed to fetch playlist from ${url}: ${
      lastError instanceof Error ? lastError.message : "all sources failed"
    }`
  );
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/plain, application/x-mpegURL, */*" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}
