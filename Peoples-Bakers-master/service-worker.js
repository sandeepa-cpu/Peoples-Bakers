const CACHE_NAME = "peoples-bakers-v147";
const APP_SHELL_FILES = [
  "./",
  "index.html",
  "find-us.html",
  "products.html",
  "legacy.html",
  "cakes.html",
  "order.html",
  "special-cake.html",
  "login.html",
  "feedback.html",
  "checkout.html",
  "account.html",
  "css/account.css",
  "payment-return.html",
  "css/style.css",
  "css/admin.css",
  "js/main.js",
  "js/cart.js",
  "js/find-us.js",
  "js/admin.js",
  "data/outlets.json",
  "js/feedback-page.js",
  "js/order-page.js",
  "js/checkout-page.js",
  "js/special-cake-page.js",
  "js/i18n.js",
  "js/cakes-page.js",
  "js/cakes-data.js",
  "js/auth.js",
  "js/account-page.js",
  "data/cakes.json",
  "manifest.webmanifest",
  "icons/app-icon.svg",
  "images/logo.png",
  "images/photo-cake-sample.jpg",
  "images/outlets/outlet-colombo.png",
  "images/outlets/outlet-govinna.png",
  "images/outlets/outlet-event.png"
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

function stripQuery(url) {
  const u = new URL(url);
  u.search = "";
  return u.toString();
}

function cacheMatch(request) {
  return caches.match(request).then((hit) => {
    if (hit) return hit;
    return caches.match(stripQuery(request.url));
  });
}

function isCakeCatalogRequest(url) {
  const p = url.pathname;
  return (
    p.endsWith("/js/cakes-data.js") || p.endsWith("/data/cakes.json")
  );
}

function isFreshAlwaysRequest(url) {
  const p = url.pathname;
  return (
    p.endsWith(".html") ||
    p.endsWith("/") ||
    p.includes("/js/translations/") ||
    p.endsWith("/css/style.css") ||
    p.endsWith("/css/account.css") ||
    p.endsWith("/css/admin.css") ||
    p.endsWith("/js/main.js") ||
    p.endsWith("/js/cart.js") ||
    p.endsWith("/js/order-page.js") ||
    p.endsWith("/js/checkout-page.js") ||
    p.endsWith("/js/auth.js") ||
    p.endsWith("/js/account-page.js") ||
    p.endsWith("/js/admin.js")
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (
    requestUrl.origin === self.location.origin &&
    requestUrl.pathname.startsWith("/api/")
  ) {
    return;
  }

  if (
    requestUrl.origin === self.location.origin &&
    (isCakeCatalogRequest(requestUrl) || isFreshAlwaysRequest(requestUrl))
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(stripQuery(event.request.url), responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cacheMatch(event.request))
    );
    return;
  }

  event.respondWith(
    cacheMatch(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          const url = new URL(event.request.url);

          if (url.origin === self.location.origin) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(stripQuery(event.request.url), responseClone);
            });
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
