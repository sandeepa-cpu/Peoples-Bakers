const CACHE_NAME = "peoples-bakers-v89";
const APP_SHELL_FILES = [
  "./",
  "index.html",
  "products.html",
  "legacy.html",
  "cakes.html",
  "order.html",
  "special-cake.html",
  "login.html",
  "feedback.html",
  "checkout.html",
  "css/style.css",
  "js/main.js",
  "js/cart.js",
  "js/feedback-page.js",
  "js/order-page.js",
  "js/special-cake-page.js",
  "js/i18n.js",
  "js/cakes-page.js",
  "js/cakes-data.js",
  "js/auth.js",
  "data/cakes.json",
  "manifest.webmanifest",
  "icons/app-icon.svg",
  "images/logo.png",
  "images/photo-cake-sample.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        APP_SHELL_FILES.map((url) =>
          cache.add(url).catch((err) => {
            console.warn("[SW] cache add failed:", url, err && err.message);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isCakeCatalogRequest(url) {
  const p = url.pathname;
  return (
    p.endsWith("/js/cakes-data.js") || p.endsWith("/data/cakes.json")
  );
}

function isFreshAlwaysRequest(url) {
  const p = url.pathname;
  // HTML pages + translation files — always try network first so nav / copy updates show up.
  return (
    p.endsWith(".html") ||
    p.endsWith("/") ||
    p.includes("/js/translations/")
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // Never cache or intercept API calls — always hit the network.
  if (
    requestUrl.origin === self.location.origin &&
    requestUrl.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Network-first for cake catalog + HTML pages + translations so nav / copy updates show up fast.
  if (
    requestUrl.origin === self.location.origin &&
    (isCakeCatalogRequest(requestUrl) || isFreshAlwaysRequest(requestUrl))
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          const url = new URL(event.request.url);

          if (url.origin === self.location.origin) {
            const responseClone = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseClone));
          }

          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === "navigate") {
            return caches.match("index.html");
          }

          return new Response("", { status: 503, statusText: "Offline" });
        });
    })
  );
});
