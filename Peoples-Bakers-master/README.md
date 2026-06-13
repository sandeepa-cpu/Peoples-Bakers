# Peoples Bakers

A Sri Lankan bakery website (static front-end) with a lightweight **Node.js + Express** backend
for authentication, orders, feedback, products, and an admin dashboard.

The backend stores data in a real **SQLite database** using Node's built-in `node:sqlite`
module — so there is **no separate database server to install and no native build tools
required**. It runs anywhere Node.js 22.5+ is installed.

---

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer (includes `npm`)

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Start the server (also serves the website)
npm start
```

Then open:

- Website: <http://localhost:3000>
- Admin dashboard: <http://localhost:3000/admin.html>

On first run the server seeds data automatically:

- An **admin account** (printed in the terminal):
  - email: `admin@peoplesbakers.lk`
  - password: `admin123`
- All **products** imported from `data/cakes.json`.

> Change the admin password after your first login by registering a new admin in code,
> or update `server/seed.js`. For production, set a strong `JWT_SECRET` env var.

## Useful commands

```bash
npm start      # run the server
npm run dev    # run with auto-restart on file changes (Node --watch)
npm run seed   # re-run seeding (won't duplicate existing data)
```

---

## What the backend does

| Area      | Endpoint(s)                                   | Notes                                  |
| --------- | --------------------------------------------- | -------------------------------------- |
| Auth      | `POST /api/auth/register` / `login` / `logout`, `GET /api/auth/me` | JWT in an httpOnly cookie. |
| Feedback  | `POST /api/feedback`, `GET /api/feedback` (admin) | `feedback.html` posts here.          |
| Products  | `GET /api/products`, admin `POST/PUT/DELETE`  | Seeded from `data/cakes.json`.         |
| Orders    | `POST /api/orders`, `GET /api/orders`, admin `PATCH` status | `checkout.html` creates orders. |
| Admin     | `GET /api/admin/stats`, `GET /api/admin/users` | Admin-only.                           |

### Front-end wiring

- **Login / Register** — `login.html` → real accounts via `js/auth.js`.
- **Feedback** — `feedback.html` already posts to `/api/feedback`.
- **Cart checkout** — the basket "Checkout" button opens `checkout.html`, which saves the order.
- **Admin** — `admin.html` (`js/admin.js`) to view orders/feedback/users and manage products.

## Data & files

- All data lives in a single SQLite file: `server/data/peoples-bakers.db` (git-ignored).
- Delete `server/data/` to reset everything; it re-seeds on the next start.
- Override the location with the `DB_PATH` env var (useful on hosts with a mounted disk).
- If you ran an older version, old `*.json` files are auto-migrated into the DB on first
  start and renamed to `*.json.bak`.

## Hosting notes

- Use a **Node-capable host** (Render, Railway, Fly.io, a VPS…). Plain static hosts
  (GitHub Pages, static Netlify) or PHP-only shared hosting can't run the backend.
- Set a strong `JWT_SECRET` env var in production.
- SQLite stores data in `server/data/`. On hosts with ephemeral disks (e.g. Render free tier)
  **mount a persistent disk** and point `DB_PATH` at it, or data resets on each deploy.
- The PWA service worker never caches `/api/*` requests, so admin data is always live.
