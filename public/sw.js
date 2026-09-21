// Adult Manga Verse — offline-reading service worker.
//
// Two caches:
//   amv-offline-v1  Manga page images + covers a Premium/VIP user explicitly
//                   saved for offline reading (see CACHE_URLS below). Never
//                   populated automatically — only via an explicit save.
//   amv-runtime-v1  The /offline and /offline-reader shell documents plus
//                   their Next.js static JS/CSS chunks, filled in as they're
//                   requested (chunk filenames are content-hashed, so
//                   cache-first is safe) so those two routes keep working
//                   with zero network once visited.
//
// Everything else on the site is untouched — normal pages always hit the
// network as usual; this worker only ever serves what was explicitly cached.

const OFFLINE_CACHE = "amv-offline-v1";
const RUNTIME_CACHE = "amv-runtime-v2";
function allowedUrl(value, shell = false) {
  try {
    const url = new URL(value, self.location.origin);
    if (url.origin !== self.location.origin) return false;
    return shell
      ? ["/offline", "/offline-reader"].includes(url.pathname) || url.pathname.startsWith("/_next/static/")
      : url.pathname.startsWith("/api/img/") || url.pathname.startsWith("/uploads/") || url.pathname === "/_next/image";
  } catch { return false; }
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("message", (event) => {
  const { type, urls, requestId } = event.data || {};

  if (type === "CACHE_URLS" && Array.isArray(urls)) {
    event.waitUntil(
      caches.open(OFFLINE_CACHE).then(async (cache) => {
        let done = 0;
        for (const url of urls.filter((url) => allowedUrl(url))) {
          try {
            await cache.add(url);
          } catch {
            // One failed image shouldn't abort the whole save.
          }
          done++;
          event.source?.postMessage({ type: "CACHE_PROGRESS", requestId, done, total: urls.length });
        }
        event.source?.postMessage({ type: "CACHE_DONE", requestId });
      }),
    );
  } else if (type === "EVICT_URLS" && Array.isArray(urls)) {
    event.waitUntil(
      caches.open(OFFLINE_CACHE).then((cache) => Promise.all(urls.map((url) => cache.delete(url)))),
    );
  } else if (type === "WARM_SHELL" && Array.isArray(urls)) {
    event.waitUntil(
      caches
        .open(RUNTIME_CACHE)
        .then((cache) =>
          Promise.all(
            urls.filter((url) => allowedUrl(url, true)).map((url) =>
              fetch(url)
                .then((res) => (res.ok ? cache.put(url, res) : null))
                .catch(() => null),
            ),
          ),
        )
        .then(() => event.source?.postMessage({ type: "WARM_DONE", requestId })),
    );
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/^\/(admin|login|register|account)(\/|$)/.test(url.pathname) || (url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/img/"))) return;
  const isSelfRoutingDoc = url.pathname === "/offline" || url.pathname === "/offline-reader";
  const isShellAsset = url.pathname.startsWith("/_next/static/") || isSelfRoutingDoc;

  if (isShellAsset) {
    // /offline and /offline-reader read all their state (which manga,
    // which chapter) from the query string client-side — the document the
    // server sends back is identical no matter what the query string is.
    // Cache under the bare path so a WARM_SHELL priming fetch (no query)
    // and a real deep-link navigation (?manga=...) hit the same entry.
    const cacheKey = isSelfRoutingDoc ? url.origin + url.pathname : req;

    // Network-first: keeps the shell current (dev-mode chunk hashes churn
    // within a session, and prod deploys should never serve a stale bundle),
    // falling back to whatever a prior WARM_SHELL cached when there's no
    // network at all.
    event.respondWith(
      fetch(req)
        .then((res) => {
          // The write must be tied to waitUntil — without it the browser is
          // free to kill the worker right after respondWith resolves, and
          // this fire-and-forget cache.put() would lose the race silently.
          if (res.ok) event.waitUntil(caches.open(RUNTIME_CACHE).then((cache) => cache.put(cacheKey, res.clone())));
          return res;
        })
        .catch(() => caches.match(cacheKey, { cacheName: RUNTIME_CACHE }).then((cached) => cached || Response.error())),
    );
    return;
  }

  // Everything else (ordinary pages, API calls, images not saved offline)
  // is left completely alone — we only ever serve from the offline-saved
  // image cache, and only for requests that are actually in it, so this
  // worker can never hand back stale or cross-user content.
  event.respondWith(caches.match(req, { cacheName: OFFLINE_CACHE }).then((cached) => cached || fetch(req)));
});
