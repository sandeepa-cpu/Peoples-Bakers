# Peoples Bakers — Full-Stack Bakery E-Commerce Platform

A production-ready web application for a Sri Lankan bakery business. Customers browse products, place orders, and pay online; staff manage orders and inventory through a secure admin dashboard.

**Author:** [Channa Sandeepa](https://github.com/sandeepa-cpu)

---

## Live demo (local)

This project requires a **Node.js server** — it is not a static HTML site.

```bash
npm install
copy .env.example .env    # Windows — edit JWT_SECRET if needed
npm start
```

| URL | Description |
|-----|-------------|
| http://localhost:3000 | Customer website |
| http://localhost:3000/pb-office.html | Admin dashboard |
| http://localhost:3000/api/health | API health check |

**Dev admin (first run):** `admin@peoplesbakers.lk` / `admin123` — change before production.

---

## Features

### Customer
- Product catalogue, shopping cart, checkout (COD / WhatsApp / PayHere)
- User registration, login, optional Google Sign-In
- Order history on account page
- Outlet finder with map and search
- Feedback form
- Custom cake requests
- **Tri-lingual UI:** English · Sinhala · Tamil
- Mobile responsive layout (hamburger menu, lazy images)

### Admin
- Order management (status pipeline, search, pagination)
- Product CRUD
- Customer feedback moderation
- User list, site settings (WhatsApp, phone, social links)
- Analytics and kitchen display mode

### Backend & security
- REST API with Express 4
- JWT authentication (httpOnly cookie)
- Server-side price validation (anti-tampering)
- PayHere payment gateway with webhook verification
- SQLite persistence (`node:sqlite` — no separate DB server)
- Rate limiting on feedback, production env checks

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js 22.5+, Express 4 |
| Database | SQLite (document-store pattern) |
| Auth | JWT, bcrypt, httpOnly cookies |
| Payments | PayHere (Sri Lanka) |
| Email | Nodemailer (optional SMTP) |
| i18n | JSON dictionaries (en / si / ta) |
| PWA | Service worker (network-first for API) |

---

## Project structure

```
Peoples-Bakers-master/
├── index.html, order.html, checkout.html, …   # Customer pages
├── admin.html, pb-office.html                 # Admin UI
├── js/                                        # Frontend logic
├── css/                                       # Styles
├── server/
│   ├── server.js          # Main API + static server
│   ├── auth.js            # JWT middleware
│   ├── store.js           # SQLite layer
│   ├── admin-api.js       # Admin REST API
│   ├── payhere.js         # Payment integration
│   └── data/              # Database (git-ignored)
├── scripts/verify-backend.js
├── .env.example           # Environment template
└── render.yaml            # Deploy blueprint
```

---

## API overview

| Area | Endpoints |
|------|-----------|
| Auth | `POST /api/auth/register`, `login`, `logout`, `GET /api/auth/me` |
| Orders | `POST /api/orders`, `GET /api/orders`, `PATCH /api/orders/:id` |
| Products | `GET /api/products`, admin `POST/PUT/DELETE` |
| Payments | `POST /api/payments/payhere/checkout`, `/notify` |
| Outlets | `GET /api/outlets`, `/nearby`, `/geojson` |
| Admin | `GET /api/admin/stats`, `/orders`, `/users`, `/settings` |
| Config | `GET /api/config`, `GET /api/health` |

Full technical guide: see `docs/Peoples-Bakers-Project-Guide-English-Advanced.html`

---

## Environment variables

Copy `.env.example` to `.env`. **Never commit `.env` to git.**

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Login token signing (32+ chars in production) |
| `SITE_URL` | Public site URL for emails and PayHere |
| `PAYHERE_MERCHANT_ID` / `PAYHERE_MERCHANT_SECRET` | Online payments |
| `WHATSAPP_NUMBER` | Business WhatsApp (default: 947228955477) |
| `SMTP_*` | Optional order confirmation emails |
| `DB_PATH` | Optional custom SQLite file path on host |

---

## Commands

```bash
npm start              # Run server (production)
npm run dev            # Auto-restart on file changes
npm run verify         # Health checks (server must be running)
npm run seed           # Re-seed products (no duplicates)
npm run promote-admin -- user@email.com
```

---

## Deployment

Requires **Node.js hosting** (Render, Railway, VPS). GitHub Pages and PHP-only hosting will **not** work.

- Set `NODE_ENV=production`, strong `JWT_SECRET`, `ADMIN_SEED_PASSWORD`
- Use HTTPS for PayHere webhooks
- Mount persistent disk for SQLite (`DB_PATH`)

See `docs/Peoples-Bakers-Hosting-Guide.html` for full checklist.

---

## Security notes

- `.env` and `server/data/` are git-ignored
- Production rejects weak JWT secrets and default admin passwords
- Order prices validated server-side against product catalogue
- PayHere notify requests verified with MD5 hash

---

## License

MIT — see project use terms as applicable for Peoples Bakers branding.

---

## Contact

- **GitHub:** [@sandeepa-cpu](https://github.com/sandeepa-cpu)
- **Project:** [Peoples-Bakers](https://github.com/sandeepa-cpu/Peoples-Bakers)
