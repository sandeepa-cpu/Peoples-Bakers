/**
 * Data store backed by SQLite (Node's built-in `node:sqlite` — no native build needed).
 *
 * Each collection is a small table: (id TEXT PK, createdAt TEXT, doc TEXT-JSON).
 * We keep the same simple document-style interface the rest of the app uses, so
 * routes/seed/admin code does not need to change.
 *
 * If older JSON files (server/data/<name>.json) exist from the previous version,
 * they are migrated into the database automatically on first run.
 */
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "peoples-bakers.db");
const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");

const COLLECTIONS = ["users", "orders", "feedback", "products", "settings"];

function safeName(name) {
  if (!/^[a-z_]+$/.test(name)) {
    throw new Error("Invalid collection name: " + name);
  }
  return name;
}

function ensureTable(name) {
  safeName(name);
  db.exec(
    "CREATE TABLE IF NOT EXISTS " +
      name +
      " (id TEXT PRIMARY KEY, createdAt TEXT, doc TEXT NOT NULL)"
  );
}

COLLECTIONS.forEach(ensureTable);

let seq = 0;
function genId(prefix) {
  seq += 1;
  return (
    (prefix || "id") +
    "_" +
    Date.now().toString(36) +
    seq.toString(36) +
    Math.random().toString(36).slice(2, 6)
  );
}

function read(name) {
  ensureTable(name);
  const rows = db
    .prepare("SELECT doc FROM " + name + " ORDER BY createdAt ASC")
    .all();
  return rows.map((r) => JSON.parse(r.doc));
}

function getRaw(name, id) {
  ensureTable(name);
  const row = db
    .prepare("SELECT doc FROM " + name + " WHERE id = ?")
    .get(id);
  return row ? JSON.parse(row.doc) : null;
}

function putRaw(name, record) {
  ensureTable(name);
  db.prepare(
    "INSERT OR REPLACE INTO " +
      name +
      " (id, createdAt, doc) VALUES (?, ?, ?)"
  ).run(record.id, record.createdAt || "", JSON.stringify(record));
}

function write(name, rows) {
  ensureTable(name);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("DELETE FROM " + name).run();
    const insert = db.prepare(
      "INSERT OR REPLACE INTO " +
        name +
        " (id, createdAt, doc) VALUES (?, ?, ?)"
    );
    rows.forEach((r) => {
      const record = Object.assign(
        { id: genId(name.slice(0, 3)), createdAt: new Date().toISOString() },
        r
      );
      insert.run(record.id, record.createdAt || "", JSON.stringify(record));
    });
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function insert(name, row) {
  const record = Object.assign(
    { id: genId(name.slice(0, 3)), createdAt: new Date().toISOString() },
    row
  );
  putRaw(name, record);
  return record;
}

function update(name, id, patch) {
  const current = getRaw(name, id);
  if (!current) return null;
  const next = Object.assign({}, current, patch, {
    updatedAt: new Date().toISOString(),
  });
  putRaw(name, next);
  return next;
}

function remove(name, id) {
  ensureTable(name);
  const info = db.prepare("DELETE FROM " + name + " WHERE id = ?").run(id);
  return info.changes > 0;
}

function findOne(name, predicate) {
  return read(name).find(predicate) || null;
}

/* ── One-time migration from old JSON files ── */
function migrateLegacyJson() {
  COLLECTIONS.forEach((name) => {
    const count = db
      .prepare("SELECT COUNT(*) AS n FROM " + name)
      .get().n;
    if (count > 0) return;

    const file = path.join(DATA_DIR, name + ".json");
    if (!fs.existsSync(file)) return;
    try {
      const arr = JSON.parse(fs.readFileSync(file, "utf8"));
      if (Array.isArray(arr) && arr.length) {
        arr.forEach((item) => {
          const record = Object.assign(
            { id: genId(name.slice(0, 3)), createdAt: new Date().toISOString() },
            item
          );
          putRaw(name, record);
        });
        console.log(
          "  Migrated " + arr.length + " rows from " + name + ".json -> SQLite"
        );
      }
      fs.renameSync(file, file + ".bak");
    } catch (err) {
      console.warn("  Could not migrate " + name + ".json:", err.message);
    }
  });
}

migrateLegacyJson();

module.exports = {
  db,
  DATA_DIR,
  DB_PATH,
  read,
  write,
  insert,
  update,
  remove,
  findOne,
  genId,
};
