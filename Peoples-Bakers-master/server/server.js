/**
 * Peoples Bakers — backend server.
 * Serves the static site AND a JSON REST API (auth, orders, feedback, products, admin).
 *
 * Run:  npm install  &&  npm start
 * Open: http://localhost:3000
 */
// Load .env (if present) before anything reads process.env.
try {
  require("dotenv").config();
} catch (e) {
  /* dotenv optional */
}

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");

const store = require("./store");
const seed = require("./seed");
const mailer = require("./mailer");
const outlets = require("./outlets");
const payhere = require("./payhere");
const discounts = require("./discounts");
const { createAdminRouter } = require("./admin-api");

let googleClient = null;
try {
  const { OAuth2Client } = require("google-auth-library");
  googleClient = new OAuth2Client();
} catch (e) {
  /* google-auth-library optional until installed */
}
const {
  publicUser,
  setAuthCookie,
  clearAuthCookie,
  attachUser,
  requireAuth,
  requireAdmin,
  setUserLookup,
} = require("./auth");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(attachUser);

setUserLookup(function (id) {
  return store.findOne("users", function (u) {
    return u.id === id;
  });
});

// Seed initial data
seed.run();

if (process.env.NODE_ENV === "production") {
  const siteUrl = String(process.env.SITE_URL || "").trim();
  if (!siteUrl.startsWith("https://")) {
    console.error(
      "\n  FATAL: Set SITE_URL to your public https:// address in production (required for PayHere).\n"
    );
    process.exit(1);
  }
}

function contactConfig() {
  const whatsappRaw = String(process.env.WHATSAPP_NUMBER || "947228955477").replace(/\D/g, "");
  const phoneTel = String(process.env.SITE_PHONE_TEL || "+94228955477").trim();
  const phoneDisplay = String(process.env.SITE_PHONE_DISPLAY || "+94 22 895 5477").trim();
  return {
    whatsappNumber: whatsappRaw,
    whatsappDisplay:
      String(process.env.WHATSAPP_DISPLAY || "").trim() ||
      "+94 " +
        (whatsappRaw.startsWith("94") ? whatsappRaw.slice(2) : whatsappRaw).replace(
          /(\d{2})(\d{3})(\d{4})/,
          "$1 $2 $3"
        ),
    sitePhoneTel: phoneTel,
    sitePhoneDisplay: phoneDisplay,
    instagramUrl:
      String(process.env.INSTAGRAM_URL || "").trim() ||
      "https://www.instagram.com/peoplesbakers/",
    linkedinUrl:
      String(process.env.LINKEDIN_URL || "").trim() ||
      "https://www.linkedin.com/company/peoples-bakers/",
  };
}

function lookupUser(id) {
  if (!id) return null;
  return store.findOne("users", function (u) {
    return u.id === id;
  });
}

// Optional: promote an existing user to admin on startup (set in .env)
const promoteEmail = str(process.env.ADMIN_PROMOTE_EMAIL).toLowerCase();
if (promoteEmail) {
  const u = store.findOne("users", (x) => x.email === promoteEmail);
  if (u && u.role !== "admin") {
    store.update("users", u.id, { role: "admin" });
    console.log("  Promoted to admin:", promoteEmail);
  }
}

/* ─────────────────────────── helpers ─────────────────────────── */
function isEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}
function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

/* ─────────────────────────── AUTH ─────────────────────────── */
app.post("/api/auth/register", (req, res) => {
  const name = str(req.body.name);
  const email = str(req.body.email).toLowerCase();
  const phone = str(req.body.phone);
  const password = String(req.body.password || "");

  if (!name) return res.status(400).json({ error: "Name is required." });
  if (!isEmail(email))
    return res.status(400).json({ error: "A valid email is required." });
  if (password.length < 6)
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters." });
  if (phone && !discounts.isValidPhone(phone)) {
    return res.status(400).json({
      error: "Enter a valid mobile number (e.g. 0771234567).",
    });
  }

  const exists = store.findOne(
    "users",
    (u) => u.email === email
  );
  if (exists)
    return res
      .status(409)
      .json({ error: "An account with this email already exists." });

  const user = store.insert("users", {
    name,
    email,
    phone: phone ? discounts.normalizePhone(phone) : phone,
    role: "customer",
    passwordHash: bcrypt.hashSync(password, 10),
  });

  setAuthCookie(res, user);
  // Fire-and-forget welcome email (won't block or fail the request).
  mailer.sendWelcomeEmail(user).catch(function () {});
  res.status(201).json({ user: publicUser(user) });
});

app.post("/api/auth/login", (req, res) => {
  const email = str(req.body.email).toLowerCase();
  const password = String(req.body.password || "");

  const user = store.findOne("users", (u) => u.email === email);
  if (!user || !bcrypt.compareSync(password, user.passwordHash || "")) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  setAuthCookie(res, user);
  res.json({ user: publicUser(user) });
});

app.post("/api/auth/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

app.get("/api/auth/me", (req, res) => {
  if (!req.user) return res.json({ user: null });
  const full = store.findOne("users", (u) => u.id === req.user.id);
  if (!full) return res.json({ user: null });
  const user = publicUser(full);
  if (full.avatar) user.avatar = full.avatar;
  res.json({ user });
});

function updateProfile(req, res) {
  const name = str(req.body.name);
  const patch = {};
  if (name) patch.name = name;
  if (req.body.phone !== undefined) {
    const phone = str(req.body.phone);
    if (phone && !discounts.isValidPhone(phone)) {
      return res.status(400).json({
        error: "Enter a valid mobile number (e.g. 0771234567).",
      });
    }
    patch.phone = phone ? discounts.normalizePhone(phone) : phone;
  }
  if (!Object.keys(patch).length) {
    return res.status(400).json({ error: "Nothing to update." });
  }
  const updated = store.update("users", req.user.id, patch);
  if (!updated) return res.status(404).json({ error: "Account not found." });
  setAuthCookie(res, updated);
  const user = publicUser(updated);
  if (updated.avatar) user.avatar = updated.avatar;
  res.json({ user });
}

app.patch("/api/auth/profile", requireAuth, updateProfile);
app.post("/api/auth/profile", requireAuth, updateProfile);

// Public config for the front-end (e.g. Google client id).
app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    api: "peoples-bakers",
    version: 125,
    features: [
      "auth",
      "orders",
      "payhere",
      "outlets",
      "admin-v2",
      "analytics",
      "export",
      "kitchen",
      "reports",
      "settings",
      "poll",
      "phone-discount",
    ],
  });
});

app.get("/api/config", (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    payhereEnabled: payhere.getConfig().enabled,
    ...discounts.publicConfig(),
    ...contactConfig(),
  });
});

app.get("/api/discount/preview", (req, res) => {
  const subtotal = Number(req.query.subtotal) || 0;
  const phone = str(req.query.phone);
  const user = req.user ? lookupUser(req.user.id) : null;
  res.json(discounts.applyPhoneDiscount(subtotal, phone, user));
});

// Peoples Bakers Outlets API v2
app.get("/api/outlets/docs", (req, res) => {
  res.json(outlets.getApiDocs());
});

app.get("/api/outlets/meta", async (req, res) => {
  try {
    const data = await outlets.getOutletsMeta();
    res.set("Cache-Control", "public, max-age=300");
    res.json(data);
  } catch (err) {
    console.error("[api/outlets/meta]", err);
    res.status(500).json({ ok: false, error: "Could not load outlet metadata." });
  }
});

app.get("/api/outlets/suggest", async (req, res) => {
  try {
    const data = await outlets.getSuggestions(req.query.q, req.query.limit);
    res.set("Cache-Control", "public, max-age=30");
    res.json(data);
  } catch (err) {
    console.error("[api/outlets/suggest]", err);
    res.status(500).json({ ok: false, error: "Could not load suggestions." });
  }
});

app.get("/api/outlets/nearby", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({
        ok: false,
        error: "Query params lat and lng are required.",
      });
    }
    const radius = Number(req.query.radius) || 25;
    const data = await outlets.getOutletsNearby(lat, lng, radius, outlets.parseOutletQuery(req.query));
    res.set("Cache-Control", "public, max-age=60");
    res.json(data);
  } catch (err) {
    console.error("[api/outlets/nearby]", err);
    res.status(500).json({ ok: false, error: "Could not load nearby outlets." });
  }
});

app.get("/api/outlets/bounds", async (req, res) => {
  try {
    const north = Number(req.query.north);
    const south = Number(req.query.south);
    const east = Number(req.query.east);
    const west = Number(req.query.west);
    if (![north, south, east, west].every(Number.isFinite)) {
      return res.status(400).json({
        ok: false,
        error: "Query params north, south, east, and west are required.",
      });
    }
    const data = await outlets.getOutletsInBounds(
      north,
      south,
      east,
      west,
      outlets.parseOutletQuery(req.query)
    );
    res.set("Cache-Control", "public, max-age=60");
    res.json(data);
  } catch (err) {
    console.error("[api/outlets/bounds]", err);
    res.status(500).json({ ok: false, error: "Could not load outlets in bounds." });
  }
});

app.get("/api/outlets/geojson", async (req, res) => {
  try {
    const data = await outlets.getOutletsGeoJSON(outlets.parseOutletQuery(req.query));
    res.set("Cache-Control", "public, max-age=120");
    res.type("application/geo+json");
    res.json(data);
  } catch (err) {
    console.error("[api/outlets/geojson]", err);
    res.status(500).json({ ok: false, error: "Could not load GeoJSON." });
  }
});

app.get("/api/outlets/:id", async (req, res) => {
  try {
    const data = await outlets.getOutletById(req.params.id);
    if (!data) {
      return res.status(404).json({ ok: false, error: "Outlet not found." });
    }
    res.json(data);
  } catch (err) {
    console.error("[api/outlets/:id]", err);
    res.status(500).json({ ok: false, error: "Could not load outlet." });
  }
});

app.get("/api/outlets", async (req, res) => {
  try {
    const data = await outlets.getOutlets(outlets.parseOutletQuery(req.query));
    res.set("Cache-Control", "public, max-age=60");
    if (req.query.format === "geojson") {
      res.type("application/geo+json");
      return res.json(outlets.toGeoJSON(data.outlets));
    }
    res.json(data);
  } catch (err) {
    console.error("[api/outlets]", err);
    res.status(500).json({ ok: false, error: "Could not load outlets." });
  }
});

// Sign in / sign up with a Google ID token (from Google Identity Services).
app.post("/api/auth/google", async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !googleClient) {
    return res.status(400).json({ error: "Google sign-in is not configured." });
  }
  const credential = String(req.body.credential || "");
  if (!credential) {
    return res.status(400).json({ error: "Missing Google credential." });
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(401).json({ error: "Google verification failed." });
  }

  const email = String(payload.email || "").toLowerCase();
  if (!email) {
    return res.status(400).json({ error: "Google account has no email." });
  }
  if (payload.email_verified === false) {
    return res.status(401).json({ error: "Google email is not verified." });
  }

  let user = store.findOne("users", (u) => u.email === email);
  let isNew = false;
  if (!user) {
    user = store.insert("users", {
      name: payload.name || email,
      email,
      phone: "",
      role: "customer",
      googleId: payload.sub,
      avatar: payload.picture || "",
    });
    isNew = true;
  } else if (!user.googleId) {
    store.update("users", user.id, { googleId: payload.sub });
  }

  setAuthCookie(res, user);
  if (isNew) mailer.sendWelcomeEmail(user).catch(function () {});
  res.json({ user: publicUser(user) });
});

/* ─────────────────────────── FEEDBACK ─────────────────────────── */
const feedbackHits = new Map();
const FEEDBACK_WINDOW_MS = 60 * 1000;
const FEEDBACK_MAX = 5;

app.post("/api/feedback", (req, res) => {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  let entry = feedbackHits.get(ip);
  if (!entry || now - entry.start > FEEDBACK_WINDOW_MS) {
    entry = { count: 0, start: now };
  }
  entry.count += 1;
  feedbackHits.set(ip, entry);
  if (entry.count > FEEDBACK_MAX) {
    return res
      .status(429)
      .json({ error: "Too many feedback submissions. Please try again later." });
  }

  const name = str(req.body.name);
  const email = str(req.body.email);
  const message = str(req.body.message);
  const rating = parseInt(req.body.rating, 10) || 0;
  const categories = Array.isArray(req.body.categories)
    ? req.body.categories.map(String)
    : [];

  if (!message)
    return res.status(400).json({ error: "Feedback message is required." });
  if (email && !isEmail(email))
    return res.status(400).json({ error: "That email doesn't look right." });

  const row = store.insert("feedback", {
    name,
    email,
    rating,
    categories,
    message,
    userId: req.user ? req.user.id : null,
    handled: false,
  });
  res.status(200).json({ ok: true, id: row.id });
});

app.get("/api/feedback", requireAuth, requireAdmin, (req, res) => {
  const rows = store.read("feedback").sort(byNewest);
  res.json({ feedback: rows });
});

app.patch("/api/feedback/:id", requireAuth, requireAdmin, (req, res) => {
  const patch = {};
  if (typeof req.body.handled === "boolean") patch.handled = req.body.handled;
  const updated = store.update("feedback", req.params.id, patch);
  if (!updated) return res.status(404).json({ error: "Not found." });
  res.json({ feedback: updated });
});

/* ─────────────────────────── PRODUCTS ─────────────────────────── */
app.get("/api/products", (req, res) => {
  let rows = store.read("products");
  // Customers only see available items; admins see all.
  if (!req.user || req.user.role !== "admin") {
    rows = rows.filter((p) => p.available !== false);
  }
  res.json({ products: rows });
});

app.post("/api/products", requireAuth, requireAdmin, (req, res) => {
  const title = str(req.body.title);
  if (!title) return res.status(400).json({ error: "Title is required." });
  const row = store.insert("products", {
    title,
    category: str(req.body.category) || "other",
    description: str(req.body.description),
    price: Number(req.body.price) || 0,
    priceLabel: str(req.body.priceLabel),
    imageUrl: str(req.body.imageUrl),
    imageAlt: str(req.body.imageAlt) || title,
    available: req.body.available !== false,
  });
  res.status(201).json({ product: row });
});

app.put("/api/products/:id", requireAuth, requireAdmin, (req, res) => {
  const patch = {};
  ["title", "category", "description", "priceLabel", "imageUrl", "imageAlt"].forEach(
    (k) => {
      if (req.body[k] !== undefined) patch[k] = str(req.body[k]);
    }
  );
  if (req.body.price !== undefined) patch.price = Number(req.body.price) || 0;
  if (typeof req.body.available === "boolean")
    patch.available = req.body.available;

  const updated = store.update("products", req.params.id, patch);
  if (!updated) return res.status(404).json({ error: "Not found." });
  res.json({ product: updated });
});

app.delete("/api/products/:id", requireAuth, requireAdmin, (req, res) => {
  const ok = store.remove("products", req.params.id);
  if (!ok) return res.status(404).json({ error: "Not found." });
  res.json({ ok: true });
});

function byNewest(a, b) {
  return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
}

function resolveServerPrice(it) {
  const qty = Math.min(99, Math.max(1, parseInt(it.qty, 10) || 1));
  const productId = str(it.id || it.productId);
  if (!productId) {
    return { error: "Each item must include a valid product id." };
  }

  const p = store.findOne("products", (x) => x.id === productId);
  if (!p || p.available === false) {
    return {
      error:
        "Product not available: " + (str(it.title) || productId),
    };
  }

  const price = Math.max(0, Number(p.price) || 0);
  if (price <= 0) {
    return { error: "Product has no valid price: " + str(p.title) };
  }

  return {
    title: str(p.title) || str(it.title) || "Item",
    qty,
    price,
    productId: p.id,
  };
}

function parseOrderBody(body, user, opts) {
  opts = opts || {};
  const userId = user ? user.id : null;
  const items = Array.isArray(body.items) ? body.items : [];
  const customer = body.customer || {};
  const name = str(customer.name);
  const phone = str(customer.phone);

  if (!items.length) {
    return { error: "Your order has no items." };
  }
  if (!name || !phone) {
    return { error: "Name and phone number are required." };
  }
  if (!discounts.isValidPhone(phone)) {
    return {
      error:
        "Enter a valid mobile number (e.g. 0771234567) to place your order.",
    };
  }

  const normalizedPhone = discounts.normalizePhone(phone);
  const cleanItems = [];
  for (let i = 0; i < items.length; i++) {
    const resolved = resolveServerPrice(items[i]);
    if (resolved.error) return { error: resolved.error };
    cleanItems.push(resolved);
  }
  const subtotal = cleanItems.reduce((s, it) => s + it.price * it.qty, 0);
  const pricing = discounts.applyPhoneDiscount(subtotal, normalizedPhone, user);

  if (pricing.total <= 0) {
    return {
      error: opts.requireTotal
        ? "Online payment requires a priced total. Choose cash on delivery or add priced items."
        : "Order total must be greater than zero.",
    };
  }

  const paymentMethod = opts.paymentMethod || "cod";
  const status =
    paymentMethod === "payhere" ? "awaiting_payment" : "pending";

  return {
    order: {
      items: cleanItems,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      total: pricing.total,
      discountMeta: pricing.applied
        ? { percent: pricing.percent, label: pricing.label }
        : null,
      customer: {
        name,
        phone: normalizedPhone,
        email: str(customer.email),
        area: str(customer.area),
        mode: str(customer.mode) || "Delivery",
      },
      notes: str(body.notes),
      status,
      paymentMethod,
      paymentStatus: paymentMethod === "payhere" ? "pending" : "cod",
      userId: userId || null,
    },
    discount: pricing,
  };
}

/* ─────────────────────────── ORDERS ─────────────────────────── */
app.post("/api/orders", (req, res) => {
  const user = req.user ? lookupUser(req.user.id) : null;
  const parsed = parseOrderBody(req.body, user, {
    paymentMethod: "cod",
  });
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const order = store.insert("orders", parsed.order);

  if (req.user && parsed.order.customer.phone) {
    const u = store.findOne("users", (x) => x.id === req.user.id);
    if (u && !u.phone) {
      store.update("users", u.id, { phone: parsed.order.customer.phone });
    }
  }

  mailer.sendOrderConfirmation(order).catch(function () {});
  res.status(201).json({ order, discount: parsed.discount });
});

app.post("/api/payments/payhere/checkout", (req, res) => {
  const cfg = payhere.getConfig();
  if (!cfg.enabled) {
    return res.status(503).json({
      error:
        "PayHere is not configured. Add PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET to .env",
    });
  }

  const parsed = parseOrderBody(req.body, req.user ? lookupUser(req.user.id) : null, {
    paymentMethod: "payhere",
    requireTotal: true,
  });
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const order = store.insert("orders", parsed.order);

  if (req.user && parsed.order.customer.phone) {
    const u = store.findOne("users", (x) => x.id === req.user.id);
    if (u && !u.phone) {
      store.update("users", u.id, { phone: parsed.order.customer.phone });
    }
  }

  const checkout = payhere.buildCheckoutFields(order, cfg);
  res.status(201).json({ order, payhere: checkout, discount: parsed.discount });
});

app.post(
  "/api/payments/payhere/notify",
  express.urlencoded({ extended: false }),
  (req, res) => {
    const cfg = payhere.getConfig();
    if (!cfg.enabled) {
      return res.status(503).send("PayHere not configured");
    }
    if (!payhere.verifyNotifyHash(req.body, cfg.merchantSecret)) {
      console.warn("[payhere] notify hash mismatch", req.body.order_id);
      return res.status(400).send("Invalid signature");
    }

    const orderId = str(req.body.order_id);
    const statusCode = String(req.body.status_code || "");
    const order = store.findOne("orders", (o) => o.id === orderId);
    if (!order) {
      console.warn("[payhere] unknown order", orderId);
      return res.status(404).send("Order not found");
    }

    if (statusCode === "2") {
      if (order.status === "cancelled") {
        console.warn("[payhere] payment for cancelled order", orderId);
        return res.status(409).send("Order cancelled");
      }
      const paidAmount = payhere.formatAmount(order.total);
      if (paidAmount !== String(req.body.payhere_amount || "")) {
        console.warn("[payhere] amount mismatch", orderId, paidAmount, req.body.payhere_amount);
        return res.status(400).send("Amount mismatch");
      }
      if (String(req.body.payhere_currency || "") !== cfg.currency) {
        console.warn("[payhere] currency mismatch", orderId, req.body.payhere_currency);
        return res.status(400).send("Currency mismatch");
      }
      if (order.paymentStatus === "paid") {
        return res.send("OK");
      }
      store.update("orders", orderId, {
        payherePaymentId: str(req.body.payment_id),
        payhereStatusCode: statusCode,
        paymentStatus: "paid",
        status: "confirmed",
        paidAt: new Date().toISOString(),
      });
      mailer.sendOrderConfirmation(store.findOne("orders", (o) => o.id === orderId)).catch(
        function () {}
      );
      return res.send("OK");
    }

    const patch = {
      payherePaymentId: str(req.body.payment_id),
      payhereStatusCode: statusCode,
    };
    if (statusCode === "-1" || statusCode === "-2") {
      patch.paymentStatus = "failed";
    }
    store.update("orders", orderId, patch);
    res.send("OK");
  }
);

// Admin: all orders. Customer: own orders.
app.get("/api/orders", requireAuth, (req, res) => {
  let rows = store.read("orders").sort(byNewest);
  if (req.user.role !== "admin") {
    rows = rows.filter((o) => o.userId === req.user.id);
  }
  res.json({ orders: rows });
});

app.get("/api/orders/:id", requireAuth, (req, res) => {
  const order = store.findOne("orders", (o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found." });
  if (req.user.role !== "admin" && order.userId !== req.user.id) {
    return res.status(403).json({ error: "You can only view your own orders." });
  }
  res.json({ order });
});

app.patch("/api/orders/:id", requireAuth, requireAdmin, (req, res) => {
  const allowed = [
    "pending",
    "awaiting_payment",
    "confirmed",
    "preparing",
    "delivered",
    "cancelled",
  ];
  const status = str(req.body.status);
  if (status && allowed.indexOf(status) === -1)
    return res.status(400).json({ error: "Invalid status." });

  const order = store.findOne("orders", (o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Not found." });

  const patch = {};
  if (status) {
    patch.status = status;
    const history = Array.isArray(order.statusHistory)
      ? order.statusHistory.slice()
      : [];
    if (status !== order.status) {
      history.unshift({
        from: order.status || null,
        to: status,
        at: new Date().toISOString(),
        by: req.user.email,
      });
      patch.statusHistory = history.slice(0, 50);
    }
  }

  if (!Object.keys(patch).length) {
    return res.status(400).json({ error: "Nothing to update." });
  }

  const updated = store.update("orders", req.params.id, patch);
  res.json({ order: updated });
});

// Customer (or admin): cancel own order before preparation starts.
app.post("/api/orders/:id/cancel", requireAuth, (req, res) => {
  const order = store.findOne("orders", (o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found." });

  if (req.user.role !== "admin" && order.userId !== req.user.id) {
    return res.status(403).json({ error: "You can only cancel your own orders." });
  }

  if (order.status === "cancelled") {
    return res.status(400).json({ error: "This order is already cancelled." });
  }

  if (order.status === "preparing" || order.status === "delivered") {
    return res.status(400).json({
      error:
        "This order is already being prepared or delivered. Please WhatsApp or call us.",
    });
  }

  const patch = {
    status: "cancelled",
    cancelledAt: new Date().toISOString(),
    cancelledBy: req.user.role === "admin" ? "admin" : "customer",
  };

  if (order.paymentStatus === "paid") {
    patch.paymentStatus = "refund_pending";
  } else if (order.paymentStatus === "pending") {
    patch.paymentStatus = "cancelled";
  }

  const updated = store.update("orders", order.id, patch);
  res.json({ order: updated });
});

/* ─────────────────────────── ADMIN API v2 ─────────────────────────── */
app.use(
  "/api/admin",
  createAdminRouter({ publicUser, requireAuth, requireAdmin })
);

/* ─────────────────────────── ADMIN PAGE (hidden from public site) ─────────────────────────── */
const ADMIN_FILE = "admin.html";
const ADMIN_PATH = (process.env.ADMIN_PATH || "pb-office.html").replace(/^\//, "");

function adminNotFound(res) {
  res
    .status(404)
    .type("html")
    .send(
      "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"UTF-8\"><title>404</title></head><body><h1>Not found</h1></body></html>"
    );
}

function serveAdminPage(req, res) {
  // Always serve the admin app — API routes enforce admin role.
  // (Blocking logged-in customers with 404 prevented staff from reaching the login gate.)
  res.sendFile(path.join(ROOT, ADMIN_FILE));
}

app.get("/" + ADMIN_PATH, serveAdminPage);
app.get("/" + ADMIN_FILE, serveAdminPage);

/* ─────────────────────────── STATIC SITE ─────────────────────────── */

app.use(
  express.static(ROOT, {
    extensions: ["html"],
    index: "index.html",
  })
);

// API 404 (must come after API routes, before SPA-ish fallback)
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "Unknown API endpoint.",
    path: req.path,
    method: req.method,
    hint:
      "The server may be out of date or the site was not opened via npm start on http://localhost:3000. Stop old terminals, run npm start, then hard-refresh (Ctrl+Shift+R).",
  });
});

app.use(function (err, req, res, next) {
  console.error("[server]", err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

app.listen(PORT, () => {
  console.log("\n  Peoples Bakers server running:");
  console.log("    Site:  http://localhost:" + PORT);
  console.log(
    "    Admin: http://localhost:" +
      PORT +
      "/" +
      ADMIN_PATH +
      "  (staff URL — not on public site)\n"
  );
});
