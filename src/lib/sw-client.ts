"use client";

// Thin wrapper around the offline service worker (public/sw.js) — registration
// plus the two message-based operations the OfflineButton needs.

export function registerServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => {
    console.error("[SW] registration failed:", e);
  });
}

const SHELL_DOCS = ["/offline", "/offline-reader"];

/**
 * Explicitly caches everything /offline and /offline-reader need to render
 * with zero network: the two documents plus their actual script/stylesheet
 * URLs (parsed straight out of the fetched HTML, so this stays correct
 * across rebuilds without hardcoding hashed chunk names). Deliberate and
 * synchronous rather than relying on the fetch handler happening to observe
 * every sub-resource request — that depends on browser-specific "is this
 * navigation controlled yet" timing we don't want to bet offline reading on.
 */
export async function warmOfflineShell(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  if (!reg.active) return;

  const assetUrls = new Set<string>();
  for (const doc of SHELL_DOCS) {
    try {
      const html = await fetch(doc).then((r) => r.text());
      for (const m of html.matchAll(/<script[^>]+src="([^"]+)"/g)) assetUrls.add(m[1]);
      for (const m of html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)) assetUrls.add(m[1]);
    } catch {
      /* best-effort — a failed warm just means offline reading isn't primed yet */
    }
  }

  const requestId = Math.random().toString(36).slice(2);
  await new Promise<void>((resolve) => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; requestId?: string };
      if (data?.requestId !== requestId || data.type !== "WARM_DONE") return;
      navigator.serviceWorker.removeEventListener("message", onMessage);
      resolve();
    }
    navigator.serviceWorker.addEventListener("message", onMessage);
    reg.active!.postMessage({ type: "WARM_SHELL", urls: [...SHELL_DOCS, ...assetUrls], requestId });
  });
}

/** Fetches every URL into the offline image cache, reporting progress as it goes. */
export async function cacheOfflineUrls(urls: string[], onProgress?: (done: number, total: number) => void): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  if (!reg.active) return;
  const requestId = Math.random().toString(36).slice(2);

  await new Promise<void>((resolve) => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; requestId?: string; done?: number; total?: number };
      if (data?.requestId !== requestId) return;
      if (data.type === "CACHE_PROGRESS" && onProgress) onProgress(data.done ?? 0, data.total ?? urls.length);
      if (data.type === "CACHE_DONE") {
        navigator.serviceWorker.removeEventListener("message", onMessage);
        resolve();
      }
    }
    navigator.serviceWorker.addEventListener("message", onMessage);
    reg.active!.postMessage({ type: "CACHE_URLS", urls, requestId });
  });
}

export async function evictOfflineUrls(urls: string[]): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  reg.active?.postMessage({ type: "EVICT_URLS", urls });
}
