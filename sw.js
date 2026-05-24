// NYC Coffee + Hotel Explorer - Service Worker
// Estratégia: cache-first para app shell, network-first para APIs,
// stale-while-revalidate para tiles do mapa (offline parcial).

const CACHE_VERSION = "nyc-coffee-v14";
const APP_SHELL = "nyc-coffee-shell-v14";
const RUNTIME = "nyc-coffee-runtime-v14";
const TILES = "nyc-coffee-tiles-v14";

const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/favicon-32.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];

// Install: pre-cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL).then((cache) => {
      return Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn("SW: falha ao cachear", url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: limpa caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => ![APP_SHELL, RUNTIME, TILES].includes(k))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: roteamento por tipo de request
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignora métodos não-GET
  if (req.method !== "GET") return;

  // APIs dinâmicas: network-first, sem cache (dados sempre frescos)
  if (
    url.hostname.includes("nominatim.openstreetmap.org") ||
    url.hostname.includes("overpass-api.de") ||
    url.hostname.includes("overpass.kumi.systems") ||
    url.hostname.includes("lz4.overpass-api.de") ||
    url.hostname.includes("z.overpass-api.de") ||
    url.hostname.includes("routing.openstreetmap.de") ||
    url.pathname.endsWith("/version.json")
  ) {
    event.respondWith(
      fetch(req).catch(() => new Response(JSON.stringify({ elements: [], error: "offline" }), {
        headers: { "Content-Type": "application/json" }
      }))
    );
    return;
  }

  // Tiles do mapa: stale-while-revalidate
  if (url.hostname.endsWith("tile.openstreetmap.org")) {
    event.respondWith(staleWhileRevalidate(req, TILES));
    return;
  }

  // App shell e Leaflet: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && (res.type === "basic" || res.type === "cors")) {
          const clone = res.clone();
          caches.open(RUNTIME).then((cache) => cache.put(req, clone));
        }
        return res;
      }).catch(() => {
        // Fallback: se o request for navegação, devolve o index cacheado
        if (req.mode === "navigate") return caches.match("./index.html");
        return new Response("Offline", { status: 503 });
      });
    })
  );
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((res) => {
    if (res && res.status === 200) {
      cache.put(request, res.clone()).catch(() => {});
    }
    return res;
  }).catch(() => cached || new Response("Offline tile", { status: 503 }));
  return cached || fetchPromise;
}

// Mensagem para forçar atualização (chamada pelo botão na UI)
self.addEventListener("message", (event) => {
  if (event.data && event.data.ty