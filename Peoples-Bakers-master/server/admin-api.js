/**
 * Advanced admin REST API — filtering, pagination, analytics, audit trail.
 */
const express = require("express");
const store = require("./store");

const ORDER_STATUSES = [
  "pending",
  "awaiting_payment",
  "confirmed",
  "preparing",
  "delivered",
  "cancelled",
];

const PAYMENT_STATUSES = [
  "cod",
  "pending",
  "paid",
  "failed",
  "cancelled",
  "refund_pending",
];

function byNewest(a, b) {
  return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
}

function countsAsRevenue(o) {
  if (!o || o.status === "cancelled") return false;
  if (o.paymentMethod === "payhere" && o.paymentStatus !== "paid") return false;
  return true;
}

function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

function parseIntSafe(v, fallback, min, max) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function parsePage(query) {
  const page = parseIntSafe(query.page, 1, 1, 10000);
  const limit = parseIntSafe(query.limit, 20, 1, 100);
  return { page, limit, offset: (page - 1) * limit };
}

function paginate(items, page, limit) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, pages);
  const start = (safePage - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    meta: { total, page: safePage, limit, pages },
  };
}

function matchSearch(haystack, q) {
  if (!q) return true;
  return String(haystack || "")
    .toLowerCase()
    .includes(q.toLowerCase());
}

function orderSearchText(o) {
  return [
    o.id,
    o.customer && o.customer.name,
    o.customer && o.customer.phone,
    o.customer && o.customer.email,
    o.customer && o.customer.area,
    o.customer && o.customer.mode,
    o.notes,
    o.adminNotes,
    o.status,
    o.paymentMethod,
    o.paymentStatus,
  ].join(" ");
}

function feedbackSearchText(f) {
  return [f.name, f.email, f.message, (f.categories || []).join(" ")].join(" ");
}

function userSearchText(u) {
  return [u.name, u.email, u.phone, u.role].join(" ");
}

function productSearchText(p) {
  return [p.title, p.category, p.description].join(" ");
}

function dateInRange(iso, from, to) {
  if (!iso) return false;
  const d = String(iso).slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function appendStatusHistory(order, status, by) {
  const history = Array.isArray(order.statusHistory)
    ? order.statusHistory.slice()
    : [];
  if (status && status !== order.status) {
    history.unshift({
      from: order.status || null,
      to: status,
      at: new Date().toISOString(),
      by: by || "admin",
    });
  }
  return history.slice(0, 50);
}

function buildAnalytics(days) {
  const orders = store.read("orders");
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days - 1));
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const byStatus = {};
  ORDER_STATUSES.forEach(function (s) {
    byStatus[s] = 0;
  });
  const paymentMethods = { cod: 0, payhere: 0 };
  const itemMap = {};

  const revenueByDay = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(cutoff);
    d.setDate(cutoff.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    revenueByDay[key] = { date: key, orders: 0, revenue: 0 };
  }

  orders.forEach(function (o) {
    if (byStatus[o.status] !== undefined) byStatus[o.status] += 1;
    else byStatus[o.status] = 1;

    const pm = o.paymentMethod === "payhere" ? "payhere" : "cod";
    paymentMethods[pm] = (paymentMethods[pm] || 0) + 1;

    (o.items || []).forEach(function (it) {
      const key = str(it.title) || "Item";
      if (!itemMap[key]) itemMap[key] = { title: key, qty: 0, revenue: 0 };
      itemMap[key].qty += Number(it.qty) || 1;
      itemMap[key].revenue +=
        (Number(it.price) || 0) * (Number(it.qty) || 1);
    });

    const day = String(o.createdAt || "").slice(0, 10);
    if (day >= cutoffStr && revenueByDay[day]) {
      revenueByDay[day].orders += 1;
      if (countsAsRevenue(o)) {
        revenueByDay[day].revenue += Number(o.total) || 0;
      }
    }
  });

  const topItems = Object.values(itemMap)
    .sort(function (a, b) {
      return b.qty - a.qty;
    })
    .slice(0, 8);

  return {
    days,
    revenueByDay: Object.values(revenueByDay),
    byStatus,
    paymentMethods,
    topItems,
  };
}

function buildActivity(limit) {
  const events = [];

  store
    .read("orders")
    .sort(byNewest)
    .slice(0, 30)
    .forEach(function (o) {
      events.push({
        type: "order",
        at: o.createdAt,
        id: o.id,
        title: o.customer && o.customer.name,
        detail:
          rs(o.total) +
          " · " +
          String(o.status || "").replace(/_/g, " "),
        status: o.status,
      });
      (o.statusHistory || []).slice(0, 3).forEach(function (h) {
        events.push({
          type: "status_change",
          at: h.at,
          id: o.id,
          title: o.customer && o.customer.name,
          detail:
            (h.from ? h.from.replace(/_/g, " ") + " → " : "") +
            (h.to || "").replace(/_/g, " "),
          status: h.to,
        });
      });
    });

  store
    .read("feedback")
    .sort(byNewest)
    .slice(0, 15)
    .forEach(function (f) {
      events.push({
        type: "feedback",
        at: f.createdAt,
        id: f.id,
        title: f.name || "Anonymous",
        detail: (f.rating || 0) + "★ · " + str(f.message).slice(0, 60),
        handled: !!f.handled,
      });
    });

  store
    .read("users")
    .sort(byNewest)
    .slice(0, 10)
    .forEach(function (u) {
      events.push({
        type: "user",
        at: u.createdAt,
        id: u.id,
        title: u.name,
        detail: u.email + " · " + (u.role || "customer"),
      });
    });

  return events
    .filter(function (e) {
      return e.at;
    })
    .sort(function (a, b) {
      return String(b.at).localeCompare(String(a.at));
    })
    .slice(0, limit);
}

function rs(n) {
  return "Rs. " + (Number(n) || 0).toLocaleString("en-LK");
}

const SETTINGS_ID = "app_settings";
const DEFAULT_SETTINGS = {
  whatsapp: process.env.WHATSAPP_NUMBER || "947228955477",
  businessName: "Peoples Bakers",
  autoRefreshSeconds: 30,
  notifyNewOrders: true,
  kitchenStatuses: ["pending", "awaiting_payment", "confirmed", "preparing"],
};

function getSettings() {
  let row = store.findOne("settings", (s) => s.id === SETTINGS_ID);
  if (!row) {
    row = store.insert("settings", Object.assign({ id: SETTINGS_ID }, DEFAULT_SETTINGS));
  }
  return row;
}

function buildMonthlyReport(month) {
  const m = month || new Date().toISOString().slice(0, 7);
  const orders = store.read("orders").filter(function (o) {
    return String(o.createdAt || "").slice(0, 7) === m;
  });
  const active = orders.filter(countsAsRevenue);
  const revenue = active.reduce(function (s, o) {
    return s + (Number(o.total) || 0);
  }, 0);
  const byStatus = {};
  orders.forEach(function (o) {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
  });
  const byDay = {};
  orders.forEach(function (o) {
    const d = String(o.createdAt || "").slice(0, 10);
    if (!byDay[d]) byDay[d] = { date: d, orders: 0, revenue: 0 };
    byDay[d].orders += 1;
    if (countsAsRevenue(o)) byDay[d].revenue += Number(o.total) || 0;
  });
  return {
    month: m,
    orders: orders.length,
    revenue,
    cancelled: orders.filter(function (o) {
      return o.status === "cancelled";
    }).length,
    delivered: orders.filter(function (o) {
      return o.status === "delivered";
    }).length,
    avgOrderValue: active.length ? Math.round(revenue / active.length) : 0,
    byStatus,
    byDay: Object.values(byDay).sort(function (a, b) {
      return a.date.localeCompare(b.date);
    }),
  };
}

function buildKitchenBoard() {
  const cols = {
    pending: [],
    awaiting_payment: [],
    confirmed: [],
    preparing: [],
    delivered: [],
  };
  store
    .read("orders")
    .sort(byNewest)
    .forEach(function (o) {
      if (o.status === "cancelled") return;
      if (cols[o.status]) cols[o.status].push(o);
      else if (o.status === "awaiting_payment") cols.awaiting_payment.push(o);
    });
  Object.keys(cols).forEach(function (k) {
    cols[k] = cols[k].slice(0, 40);
  });
  return { columns: cols, updatedAt: new Date().toISOString() };
}

function orderWhatsAppText(order) {
  const c = order.customer || {};
  const items = (order.items || [])
    .map(function (it) {
      return (it.qty || 1) + "x " + (it.title || "Item");
    })
    .join(", ");
  return (
    "Hi " +
    (c.name || "there") +
    ", Peoples Bakers here regarding your order (" +
    rs(order.total) +
    "). Items: " +
    items +
    ". Status: " +
    String(order.status || "").replace(/_/g, " ") +
    "."
  );
}

function createAdminRouter({ publicUser, requireAuth, requireAdmin }) {
  const router = express.Router();

  router.get("/docs", requireAuth, requireAdmin, (req, res) => {
    res.json({
      version: 2,
      base: "/api/admin",
      endpoints: [
        { method: "GET", path: "/stats", desc: "Dashboard summary + recent items" },
        { method: "GET", path: "/analytics?days=7", desc: "Charts data" },
        { method: "GET", path: "/activity?limit=20", desc: "Recent activity feed" },
        {
          method: "GET",
          path: "/orders?q=&status=&from=&to=&page=1&limit=20",
          desc: "Paginated orders with filters",
        },
        { method: "GET", path: "/orders/:id", desc: "Single order detail" },
        {
          method: "PATCH",
          path: "/orders/:id",
          desc: "Update status, adminNotes, paymentStatus",
        },
        {
          method: "GET",
          path: "/feedback?q=&handled=&page=1&limit=20",
          desc: "Paginated feedback",
        },
        { method: "PATCH", path: "/feedback/:id", desc: "Mark handled, add reply" },
        { method: "DELETE", path: "/feedback/:id", desc: "Remove feedback" },
        {
          method: "GET",
          path: "/users?q=&role=&page=1&limit=20",
          desc: "Paginated users",
        },
        { method: "PATCH", path: "/users/:id", desc: "Change role (admin/customer)" },
        {
          method: "GET",
          path: "/export/orders?format=csv",
          desc: "Download orders as CSV",
        },
        { method: "GET", path: "/kitchen", desc: "Kitchen board columns" },
        { method: "GET", path: "/reports?month=YYYY-MM", desc: "Monthly report" },
        { method: "GET", path: "/settings", desc: "Shop settings" },
        { method: "PATCH", path: "/settings", desc: "Update shop settings" },
        { method: "GET", path: "/poll?since=ISO", desc: "Lightweight new-order check" },
      ],
    });
  });

  router.get("/stats", requireAuth, requireAdmin, (req, res) => {
    const orders = store.read("orders").sort(byNewest);
    const feedback = store.read("feedback").sort(byNewest);
    const today = new Date().toISOString().slice(0, 10);

    const activeOrders = orders.filter(countsAsRevenue);
    const revenue = activeOrders.reduce(
      (s, o) => s + (Number(o.total) || 0),
      0
    );
    const todayOrders = orders.filter(
      (o) => String(o.createdAt || "").slice(0, 10) === today
    );
    const todayRevenue = todayOrders
      .filter(countsAsRevenue)
      .reduce((s, o) => s + (Number(o.total) || 0), 0);

    const ratings = feedback.map((f) => Number(f.rating) || 0).filter(Boolean);
    const avgRating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) /
        10
      : 0;

    const pendingOrders = orders.filter(
      (o) => o.status === "pending" || o.status === "awaiting_payment"
    ).length;

    const unhandledFeedback = feedback.filter((f) => !f.handled).length;

    res.json({
      stats: {
        orders: orders.length,
        pendingOrders,
        awaitingPayment: orders.filter((o) => o.status === "awaiting_payment")
          .length,
        revenue,
        todayOrders: todayOrders.length,
        todayRevenue,
        avgRating,
        feedback: feedback.length,
        unhandledFeedback,
        products: store.read("products").length,
        users: store.read("users").length,
      },
      recentOrders: orders.slice(0, 5),
      recentFeedback: feedback.slice(0, 5),
    });
  });

  router.get("/analytics", requireAuth, requireAdmin, (req, res) => {
    const days = parseIntSafe(req.query.days, 7, 1, 90);
    res.json(buildAnalytics(days));
  });

  router.get("/activity", requireAuth, requireAdmin, (req, res) => {
    const limit = parseIntSafe(req.query.limit, 20, 1, 100);
    res.json({ activity: buildActivity(limit) });
  });

  router.get("/orders", requireAuth, requireAdmin, (req, res) => {
    const q = str(req.query.q).toLowerCase();
    const status = str(req.query.status);
    const from = str(req.query.from);
    const to = str(req.query.to);
    const { page, limit } = parsePage(req.query);

    let rows = store.read("orders").sort(byNewest);
    if (status) rows = rows.filter((o) => o.status === status);
    if (from || to) {
      rows = rows.filter((o) => dateInRange(o.createdAt, from, to));
    }
    if (q) rows = rows.filter((o) => matchSearch(orderSearchText(o), q));

    const result = paginate(rows, page, limit);
    res.json({ orders: result.items, meta: result.meta });
  });

  router.get("/kitchen", requireAuth, requireAdmin, (req, res) => {
    res.json(buildKitchenBoard());
  });

  router.get("/reports", requireAuth, requireAdmin, (req, res) => {
    const month = str(req.query.month) || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: "Month must be YYYY-MM." });
    }
    res.json({ report: buildMonthlyReport(month) });
  });

  router.get("/settings", requireAuth, requireAdmin, (req, res) => {
    res.json({ settings: getSettings() });
  });

  router.patch("/settings", requireAuth, requireAdmin, (req, res) => {
    const current = getSettings();
    const patch = {};
    if (req.body.whatsapp !== undefined) {
      patch.whatsapp = String(req.body.whatsapp || "").replace(/\D/g, "");
    }
    if (req.body.businessName !== undefined) {
      patch.businessName = str(req.body.businessName) || DEFAULT_SETTINGS.businessName;
    }
    if (req.body.autoRefreshSeconds !== undefined) {
      patch.autoRefreshSeconds = parseIntSafe(
        req.body.autoRefreshSeconds,
        30,
        0,
        300
      );
    }
    if (typeof req.body.notifyNewOrders === "boolean") {
      patch.notifyNewOrders = req.body.notifyNewOrders;
    }
    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: "Nothing to update." });
    }
    const updated = store.update("settings", current.id, patch);
    res.json({ settings: updated });
  });

  router.get("/poll", requireAuth, requireAdmin, (req, res) => {
    const since = str(req.query.since);
    const orders = store.read("orders").sort(byNewest);
    const pending = orders.filter(function (o) {
      return o.status === "pending" || o.status === "awaiting_payment";
    }).length;
    let newOrders = [];
    if (since) {
      newOrders = orders.filter(function (o) {
        return (
          String(o.createdAt || "") > since &&
          (o.status === "pending" || o.status === "awaiting_payment")
        );
      });
    }
    res.json({
      pending,
      newCount: newOrders.length,
      newOrders: newOrders.slice(0, 5),
      serverTime: new Date().toISOString(),
    });
  });

  router.get("/orders/:id", requireAuth, requireAdmin, (req, res) => {
    const order = store.findOne("orders", (o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found." });
    const settings = getSettings();
    res.json({
      order,
      whatsappUrl:
        "https://wa.me/" +
        settings.whatsapp +
        "?text=" +
        encodeURIComponent(orderWhatsAppText(order)),
    });
  });

  router.patch("/orders/:id", requireAuth, requireAdmin, (req, res) => {
    const order = store.findOne("orders", (o) => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found." });

    const status = str(req.body.status);
    const adminNotes =
      req.body.adminNotes !== undefined ? str(req.body.adminNotes) : undefined;
    const paymentStatus = str(req.body.paymentStatus);

    const patch = {};

    if (status) {
      if (ORDER_STATUSES.indexOf(status) === -1) {
        return res.status(400).json({ error: "Invalid status." });
      }
      patch.status = status;
      patch.statusHistory = appendStatusHistory(
        order,
        status,
        req.user.email
      );
    }

    if (adminNotes !== undefined) patch.adminNotes = adminNotes;

    if (paymentStatus) {
      if (PAYMENT_STATUSES.indexOf(paymentStatus) === -1) {
        return res.status(400).json({ error: "Invalid payment status." });
      }
      patch.paymentStatus = paymentStatus;
    }

    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: "Nothing to update." });
    }

    const updated = store.update("orders", order.id, patch);
    const settings = getSettings();
    res.json({
      order: updated,
      whatsappUrl:
        "https://wa.me/" +
        settings.whatsapp +
        "?text=" +
        encodeURIComponent(orderWhatsAppText(updated)),
    });
  });

  router.get("/feedback", requireAuth, requireAdmin, (req, res) => {
    const q = str(req.query.q).toLowerCase();
    const handled = str(req.query.handled);
    const { page, limit } = parsePage(req.query);

    let rows = store.read("feedback").sort(byNewest);
    if (handled === "true") rows = rows.filter((f) => f.handled);
    if (handled === "false") rows = rows.filter((f) => !f.handled);
    if (q) rows = rows.filter((f) => matchSearch(feedbackSearchText(f), q));

    const result = paginate(rows, page, limit);
    res.json({ feedback: result.items, meta: result.meta });
  });

  router.patch("/feedback/:id", requireAuth, requireAdmin, (req, res) => {
    const patch = {};
    if (typeof req.body.handled === "boolean") patch.handled = req.body.handled;
    if (req.body.adminReply !== undefined)
      patch.adminReply = str(req.body.adminReply);
    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: "Nothing to update." });
    }
    const updated = store.update("feedback", req.params.id, patch);
    if (!updated) return res.status(404).json({ error: "Not found." });
    res.json({ feedback: updated });
  });

  router.delete("/feedback/:id", requireAuth, requireAdmin, (req, res) => {
    const ok = store.remove("feedback", req.params.id);
    if (!ok) return res.status(404).json({ error: "Not found." });
    res.json({ ok: true });
  });

  router.get("/users", requireAuth, requireAdmin, (req, res) => {
    const q = str(req.query.q).toLowerCase();
    const role = str(req.query.role);
    const { page, limit } = parsePage(req.query);

    let rows = store
      .read("users")
      .sort(byNewest)
      .map(publicUser);
    if (role) rows = rows.filter((u) => u.role === role);
    if (q) rows = rows.filter((u) => matchSearch(userSearchText(u), q));

    const result = paginate(rows, page, limit);
    res.json({ users: result.items, meta: result.meta });
  });

  router.patch("/users/:id", requireAuth, requireAdmin, (req, res) => {
    const target = store.findOne("users", (u) => u.id === req.params.id);
    if (!target) return res.status(404).json({ error: "User not found." });

    const role = str(req.body.role);
    if (role && role !== "admin" && role !== "customer") {
      return res.status(400).json({ error: "Role must be admin or customer." });
    }
    if (role === "customer" && target.id === req.user.id) {
      return res
        .status(400)
        .json({ error: "You cannot remove your own admin access." });
    }
    if (target.role === "admin" && role === "customer") {
      const adminCount = store.read("users").filter((u) => u.role === "admin")
        .length;
      if (adminCount <= 1) {
        return res
          .status(400)
          .json({ error: "At least one administrator must remain." });
      }
    }

    const patch = {};
    if (role) patch.role = role;
    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: "Nothing to update." });
    }

    const updated = store.update("users", target.id, patch);
    res.json({ user: publicUser(updated) });
  });

  router.get("/export/orders", requireAuth, requireAdmin, (req, res) => {
    const orders = store.read("orders").sort(byNewest);
    const header = [
      "id",
      "date",
      "customer",
      "phone",
      "email",
      "mode",
      "area",
      "total",
      "status",
      "payment",
      "payment_status",
      "items",
    ];
    const lines = [header.join(",")];
    orders.forEach(function (o) {
      const c = o.customer || {};
      const items = (o.items || [])
        .map(function (it) {
          return (it.qty || 1) + "x " + (it.title || "Item");
        })
        .join("; ");
      lines.push(
        [
          o.id,
          o.createdAt,
          c.name,
          c.phone,
          c.email,
          c.mode,
          c.area,
          o.total,
          o.status,
          o.paymentMethod,
          o.paymentStatus,
          items,
        ]
          .map(function (v) {
            const s = String(v == null ? "" : v);
            return '"' + s.replace(/"/g, '""') + '"';
          })
          .join(",")
      );
    });
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set(
      "Content-Disposition",
      'attachment; filename="peoples-bakers-orders.csv"'
    );
    res.send(lines.join("\n"));
  });

  return router;
}

module.exports = {
  createAdminRouter,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  getSettings,
  orderWhatsAppText,
};
