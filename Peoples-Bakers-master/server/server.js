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
} = require("./auth");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(attachUser);

// Seed initial data
seed.run();

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
    phone,
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
  res.json({ user: req.user ? publicUser(req.user) : null });
});

// Public config for the front-end (e.g. Google client id).
app.get("/api/config", (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || "" });
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
app.post("/api/feedback", (req, res) => {
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

/* ─────────────────────────── ORDERS ─────────────────────────── */
app.post("/api/orders", (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const customer = req.body.customer || {};
  const name = str(customer.name);
  const phone = str(customer.phone);

  if (!items.length)
    return res.status(400).json({ error: "Your order has no items." });
  if (!name || !phone)
    return res
      .status(400)
      .json({ error: "Name and phone number are required." });

  const cleanItems = items.map((it) => ({
    title: str(it.title) || "Item",
    qty: Math.max(1, parseInt(it.qty, 10) || 1),
    price: Number(it.price) || 0,
  }));
  const total = cleanItems.reduce((s, it) => s + it.price * it.qty, 0);

  const order = store.insert("orders", {
    items: cleanItems,
    total,
    customer: {
      name,
      phone,
      email: str(customer.email),
      area: str(customer.area),
      mode: str(customer.mode) || "Delivery",
    },
    notes: str(req.body.notes),
    status: "pending",
    userId: req.user ? req.user.id : null,
  });

  // Email the customer a confirmation if they gave an email (non-blocking).
  mailer.sendOrderConfirmation(order).catch(function () {});
  res.status(201).json({ order });
});

// Admin: all orders. Customer: own orders.
app.get("/api/orders", requireAuth, (req, res) => {
  let rows = store.read("orders").sort(byNewest);
  if (req.user.role !== "admin") {
    rows = rows.filter((o) => o.userId === req.user.id);
  }
  res.json({ orders: rows });
});

app.patch("/api/orders/:id", requireAuth, requireAdmin, (req, res) => {
  const allowed = ["pending", "confirmed", "preparing", "delivered", "cancelled"];
  const status = str(req.body.status);
  if (status && allowed.indexOf(status) === -1)
    return res.status(400).json({ error: "Invalid status." });
  const updated = store.update("orders", req.params.id, status ? { status } : {});
  if (!updated) return res.status(404).json({ error: "Not found." });
  res.json({ order: updated });
});

/* ─────────────────────────── ADMIN STATS ─────────────────────────── */
app.get("/api/admin/stats", requireAuth, requireAdmin, (req, res) => {
  const orders = store.read("orders");
  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + (Number(o.total) || 0), 0);
  res.json({
    stats: {
      orders: orders.length,
      pendingOrders: orders.filter((o) => o.status === "pending").length,
      revenue,
      feedback: store.read("feedback").length,
      products: store.read("products").length,
      users: store.read("users").length,
    },
  });
});

app.get("/api/admin/users", requireAuth, requireAdmin, (req, res) => {
  const users = store.read("users").map(publicUser).reverse();
  res.json({ users });
});

/* ─────────────────────────── STATIC SITE ─────────────────────────── */
function byNewest(a, b) {
  return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
}

app.use(
  express.static(ROOT, {
    extensions: ["html"],
    index: "index.html",
  })
);

// API 404 (must come after API routes, before SPA-ish fallback)
app.use("/api", (req, res) => {
  res.status(404).json({ error: "Unknown API endpoint." });
});

app.listen(PORT, () => {
  console.log("\n  Peoples Bakers server running:");
  console.log("    Site:  http://localhost:" + PORT);
  console.log("    Admin: http://localhost:" + PORT + "/admin.html\n");
});
