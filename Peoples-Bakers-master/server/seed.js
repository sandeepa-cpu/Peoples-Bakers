/**
 * Seeds initial data on first run:
 *  - one admin account
 *  - products imported from data/cakes.json
 * Safe to run multiple times (it won't duplicate).
 */
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const store = require("./store");

const DEFAULT_ADMIN = {
  name: "Bakery Admin",
  email: "admin@peoplesbakers.lk",
  password: "admin123",
};

function parsePrice(label) {
  // "MRP Rs. 1600.00" -> 1600
  const m = String(label || "").match(/([\d,]+(?:\.\d+)?)/);
  if (!m) return 0;
  return Math.round(parseFloat(m[1].replace(/,/g, "")) || 0);
}

function seedAdmin() {
  const existing = store.findOne("users", (u) => u.role === "admin");
  if (existing) return existing;
  const user = store.insert("users", {
    name: DEFAULT_ADMIN.name,
    email: DEFAULT_ADMIN.email.toLowerCase(),
    phone: "",
    role: "admin",
    passwordHash: bcrypt.hashSync(DEFAULT_ADMIN.password, 10),
  });
  console.log(
    "\n  Seeded admin account:\n    email:    " +
      DEFAULT_ADMIN.email +
      "\n    password: " +
      DEFAULT_ADMIN.password +
      "\n  (change this after first login)\n"
  );
  return user;
}

function seedProducts() {
  const current = store.read("products");
  if (current.length > 0) return current;

  const cakesPath = path.join(__dirname, "..", "data", "cakes.json");
  let cakes = [];
  try {
    cakes = JSON.parse(fs.readFileSync(cakesPath, "utf8"));
  } catch (err) {
    console.warn("  Could not read data/cakes.json, skipping product seed.");
    return [];
  }

  const rows = cakes.map((c) => ({
    id: store.genId("prd"),
    createdAt: new Date().toISOString(),
    title: c.title || "Untitled",
    category: c.category || "other",
    description: c.description || "",
    price: parsePrice(c.price),
    priceLabel: c.price || "",
    imageUrl: c.imageUrl || "",
    imageAlt: c.imageAlt || c.title || "",
    available: true,
  }));
  store.write("products", rows);
  console.log("  Seeded " + rows.length + " products from data/cakes.json");
  return rows;
}

function run() {
  seedAdmin();
  seedProducts();
}

module.exports = { run, seedAdmin, seedProducts, parsePrice };

// Allow `npm run seed`
if (require.main === module) {
  run();
  console.log("  Seeding complete.");
}
