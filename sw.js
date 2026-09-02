/* ---------------------------------------------------------------------------
   APP_VERSION: bei JEDER inhaltlichen Änderung an index.html/manifest.json/
   den Icons hier die Nummer hochzählen (z. B. "1.1.0" -> "1.2.0") und
   zusammen mit den anderen Dateien committen/hochladen.

   Der Cache-Name hängt direkt von dieser Versionsnummer ab. Ändert sie sich,
   erkennt der Service Worker das als "neue Version", lädt alle Dateien frisch
   vom Server (nicht aus dem HTTP-Cache), aktiviert sich selbst sofort
   (skipWaiting/clients.claim) und löscht den alten Cache. index.html hört auf
   dieses Ereignis und lädt die Seite einmal automatisch neu — ganz ohne
   manuelles Cache-Leeren.
--------------------------------------------------------------------------- */
const APP_VERSION = "1.1.0";
const CACHE_NAME = "mitarbeit-cache-" + APP_VERSION;

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        ASSETS.map((asset) =>
          // cache:"reload" umgeht bewusst den normalen HTTP-Cache des Browsers,
          // damit bei einer neuen Version wirklich frische Dateien vom Server
          // geholt werden und nicht versehentlich noch alte HTTP-gecachte.
          fetch(asset, { cache: "reload" }).then((res) => cache.put(asset, res))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first, falling back to network, so the app works fully offline after first load.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => cached);
    })
  );
});
