/**
 * Quick publish-readiness check: API health + admin auth + key static assets.
 * Usage: node scripts/verify-backend.js [baseUrl]
 */
const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const ROOT = path.join(__dirname, "..");

function request(method, urlPath, body, cookie) {
  return new Promise(function (resolve, reject) {
    const url = new URL(BASE + urlPath);
    const lib = url.protocol === "https:" ? https : http;
    const payload = body ? JSON.stringify(body) : null;
    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname + url.search,
        method: method,
        headers: Object.assign(
          { Accept: "application/json" },
          payload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(payload),
              }
            : {},
          cookie ? { Cookie: cookie } : {}
        ),
      },
      function (res) {
        let data = "";
        res.on("data", function (chunk) {
          data += chunk;
        });
        res.on("end", function () {
          let json = null;
          try {
            json = data ? JSON.parse(data) : null;
          } catch (e) {
            json = data;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: json,
          });
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function extractCookie(setCookie) {
  if (!setCookie) return "";
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  return arr.map(function (c) {
    return c.split(";")[0];
  }).join("; ");
}

async function run() {
  const results = [];
  function pass(label) {
    results.push({ ok: true, label: label });
    console.log("  OK  " + label);
  }
  function fail(label, detail) {
    results.push({ ok: false, label: label, detail: detail });
    console.log("  FAIL " + label + (detail ? " — " + detail : ""));
  }

  console.log("\nPeoples Bakers — backend verify (" + BASE + ")\n");

  try {
    const health = await request("GET", "/api/health");
    if (health.status === 200 && health.body && health.body.ok) {
      pass("/api/health");
    } else {
      fail("/api/health", "status " + health.status);
    }
  } catch (e) {
    fail("/api/health", e.message);
    console.log("\n  Start the server first: npm start\n");
    process.exit(1);
  }

  try {
    const config = await request("GET", "/api/config");
    if (config.status === 200 && config.body) pass("/api/config");
    else fail("/api/config", "status " + config.status);
  } catch (e) {
    fail("/api/config", e.message);
  }

  try {
    const outlets = await request("GET", "/api/outlets?limit=3");
    if (outlets.status === 200 && Array.isArray(outlets.body.outlets)) {
      pass("/api/outlets");
    } else {
      fail("/api/outlets", "status " + outlets.status);
    }
  } catch (e) {
    fail("/api/outlets", e.message);
  }

  let adminCookie = "";
  try {
    const login = await request("POST", "/api/auth/login", {
      email: "admin@peoplesbakers.lk",
      password: "admin123",
    });
    adminCookie = extractCookie(login.headers["set-cookie"]);
    if (login.status === 200 && login.body && login.body.user && login.body.user.role === "admin") {
      pass("Admin login (admin@peoplesbakers.lk)");
    } else {
      fail("Admin login", "status " + login.status);
    }
  } catch (e) {
    fail("Admin login", e.message);
  }

  if (adminCookie) {
    try {
      const stats = await request("GET", "/api/admin/stats", null, adminCookie);
      if (stats.status === 200 && stats.body && stats.body.stats) pass("/api/admin/stats");
      else fail("/api/admin/stats", "status " + stats.status);
    } catch (e) {
      fail("/api/admin/stats", e.message);
    }

    try {
      const orders = await request("GET", "/api/admin/orders?limit=5", null, adminCookie);
      if (orders.status === 200 && orders.body && Array.isArray(orders.body.orders)) {
        pass("/api/admin/orders");
      } else {
        fail("/api/admin/orders", "status " + orders.status);
      }
    } catch (e) {
      fail("/api/admin/orders", e.message);
    }

    try {
      const kitchen = await request("GET", "/api/admin/kitchen", null, adminCookie);
      if (kitchen.status === 200 && kitchen.body && kitchen.body.columns) {
        pass("/api/admin/kitchen");
      } else {
        fail("/api/admin/kitchen", "status " + kitchen.status);
      }
    } catch (e) {
      fail("/api/admin/kitchen", e.message);
    }
  }

  const assets = [
    "index.html",
    "admin.html",
    "images/sweets/vanilla-sprinkle-cupcake.png",
    "images/breads/butter-bun.png",
    "images/products/choco-swiss-roll.png",
  ];
  assets.forEach(function (rel) {
    const full = path.join(ROOT, rel.replace(/\//g, path.sep));
    if (fs.existsSync(full)) pass("Asset: " + rel);
    else fail("Asset: " + rel, "missing on disk");
  });

  const failed = results.filter(function (r) {
    return !r.ok;
  });
  console.log("\n" + (failed.length ? failed.length + " check(s) failed." : "All checks passed.") + "\n");
  process.exit(failed.length ? 1 : 0);
}

run();
