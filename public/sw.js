/* Service worker du Ministère — stratégie explicite, périmètre public uniquement.
 * - Jamais en cache : /api/*, /gestion, /discussion, réponses avec Set-Cookie, requêtes non GET.
 * - Ressources versionnées (/_next/static, polices, icônes) : cache d'abord.
 * - Pages publiques : réseau d'abord, copie de secours, puis page hors ligne.
 * - Les livres ne sont gardés hors ligne que par action volontaire du lecteur (cache « ms-livres »),
 *   géré par la liseuse elle-même, jamais préchargés ici.
 */
const VERSION = "v1-2026-10-13";
const STATIC_CACHE = `ms-static-${VERSION}`;
const PAGES_CACHE = `ms-pages-${VERSION}`;
const BOOKS_CACHE = "ms-livres-v1";
const OFFLINE_URL = "/hors-ligne";
const PRECACHE = [OFFLINE_URL, "/icons/icon.svg", "/icons/icon-192.png"];

const PUBLIC_PAGES = [/^\/$/, /^\/bibliotheque$/, /^\/ouvrages\/[a-z0-9-]+$/, /^\/enseignements(\/[a-z]+)?$/, /^\/videos(\/[A-Za-z0-9_-]+)?$/, /^\/ecrits(\/[a-z0-9-]+)?$/, /^\/confidentialite$/, /^\/etude$/];
const NEVER = [/^\/api\//, /^\/gestion/, /^\/discussion/];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("ms-") && k !== STATIC_CACHE && k !== PAGES_CACHE && k !== BOOKS_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

function cacheable(res) {
  return res && res.ok && res.type === "basic" && !res.headers.has("set-cookie") && !/no-store|private/.test(res.headers.get("cache-control") || "");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (NEVER.some((r) => r.test(url.pathname))) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(woff2?|svg|png|webp|avif)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (cacheable(res)) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    const isPublic = PUBLIC_PAGES.some((r) => r.test(url.pathname));
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (isPublic && cacheable(res)) (await caches.open(PAGES_CACHE)).put(url.pathname, res.clone());
          return res;
        } catch {
          if (isPublic) {
            const hit = await (await caches.open(PAGES_CACHE)).match(url.pathname);
            if (hit) return hit;
          }
          return (await caches.match(OFFLINE_URL)) || new Response("Hors ligne", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
        }
      })(),
    );
  }
});
