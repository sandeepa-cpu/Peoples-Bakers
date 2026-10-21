/* Peoples Bakers — Advanced admin dashboard */
(function () {
  "use strict";

  var gate = document.getElementById("gate");
  var shell = document.getElementById("shell");
  var sidebar = document.getElementById("sidebar");
  var backdrop = document.getElementById("sidebar-backdrop");

  var SECTION_META = {
    overview: {
      title: "Overview",
      sub: "Welcome back — here's what's happening today.",
    },
    orders: {
      title: "Orders",
      sub: "Manage incoming orders, payments and delivery status.",
    },
    feedback: {
      title: "Feedback",
      sub: "Customer ratings and messages from the website.",
    },
    products: {
      title: "Products",
      sub: "Edit cakes and items shown on the order page.",
    },
    users: {
      title: "Users",
      sub: "Registered customers and administrator accounts.",
    },
    kitchen: {
      title: "Kitchen board",
      sub: "Live workflow — move orders from new to delivered.",
    },
    reports: {
      title: "Reports",
      sub: "Monthly sales summary and order breakdown.",
    },
    settings: {
      title: "Settings",
      sub: "WhatsApp, notifications and auto-refresh preferences.",
    },
  };

  var KITCHEN_COLS = [
    { key: "pending", label: "New", next: "confirmed", nextLabel: "Confirm" },
    { key: "awaiting_payment", label: "Awaiting pay", next: "confirmed", nextLabel: "Confirm" },
    { key: "confirmed", label: "Confirmed", next: "preparing", nextLabel: "Start prep" },
    { key: "preparing", label: "Preparing", next: "delivered", nextLabel: "Delivered" },
    { key: "delivered", label: "Done today", next: null, nextLabel: null },
  ];

  var STATUSES = [
    "pending",
    "awaiting_payment",
    "confirmed",
    "preparing",
    "delivered",
    "cancelled",
  ];

  var state = {
    orders: [],
    ordersMeta: { total: 0, page: 1, pages: 1, limit: 15 },
    feedback: [],
    feedbackMeta: { total: 0, page: 1, pages: 1, limit: 15 },
    products: [],
    users: [],
    usersMeta: { total: 0, page: 1, pages: 1, limit: 15 },
    stats: null,
    currentUser: null,
    orderDetailId: null,
    settings: null,
    pollTimer: null,
    pollSince: null,
    activeSection: "overview",
  };

  var searchTimers = {};

  function debounceSearch(key, fn, ms) {
    clearTimeout(searchTimers[key]);
    searchTimers[key] = setTimeout(fn, ms || 350);
  }

  function buildQuery(params) {
    var parts = [];
    Object.keys(params).forEach(function (k) {
      if (params[k] !== "" && params[k] != null) {
        parts.push(
          encodeURIComponent(k) + "=" + encodeURIComponent(params[k])
        );
      }
    });
    return parts.length ? "?" + parts.join("&") : "";
  }

  function renderPagination(containerId, meta, onPage) {
    var el = document.getElementById(containerId);
    if (!el || !meta || meta.total === 0) {
      if (el) el.innerHTML = "";
      return;
    }
    el.innerHTML =
      "<span>Showing page " +
      meta.page +
      " of " +
      meta.pages +
      " · " +
      meta.total +
      " total</span>" +
      "<div style='display:flex;gap:.35rem'>" +
      "<button type='button' class='adm-btn adm-btn-sm adm-btn-ghost' data-page='prev'" +
      (meta.page <= 1 ? " disabled" : "") +
      ">Prev</button>" +
      "<button type='button' class='adm-btn adm-btn-sm adm-btn-ghost' data-page='next'" +
      (meta.page >= meta.pages ? " disabled" : "") +
      ">Next</button>" +
      "</div>";
    el.querySelector("[data-page=prev]").addEventListener("click", function () {
      if (meta.page > 1) onPage(meta.page - 1);
    });
    el.querySelector("[data-page=next]").addEventListener("click", function () {
      if (meta.page < meta.pages) onPage(meta.page + 1);
    });
  }

  function api(path, opts) {
    opts = opts || {};
    return fetch(path, {
      method: opts.method || "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
      .catch(function () {
        throw new Error(
          "Cannot reach server. Open http://localhost:3000/pb-office.html and run npm start."
        );
      })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "Request failed");
          return data;
        });
      });
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function rs(n) {
    return "Rs. " + (Number(n) || 0).toLocaleString("en-LK");
  }

  function dt(s) {
    if (!s) return "";
    return new Date(s).toLocaleString("en-LK", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function initials(name) {
    return String(name || "A")
      .split(/\s+/)
      .slice(0, 2)
      .map(function (p) {
        return p.charAt(0).toUpperCase();
      })
      .join("");
  }

  function toast(msg, kind) {
    var wrap = document.getElementById("toasts");
    var el = document.createElement("div");
    el.className = "adm-toast" + (kind ? " " + kind : "");
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 3200);
  }

  function pill(label, extra) {
    var cls = "adm-pill adm-pill-" + String(label || "pending").replace(/\s+/g, "_");
    return (
      '<span class="' +
      cls +
      '">' +
      esc(String(label || "").replace(/_/g, " ")) +
      (extra ? " · " + esc(extra) : "") +
      "</span>"
    );
  }

  function stars(n) {
    var out = "";
    for (var i = 0; i < 5; i++) out += i < n ? "★" : "☆";
    return out;
  }

  function closeSidebar() {
    sidebar.classList.remove("is-open");
    backdrop.classList.remove("is-visible");
  }

  function openSidebar() {
    sidebar.classList.add("is-open");
    backdrop.classList.add("is-visible");
  }

  /* ── Auth ── */
  function showApp(user) {
    state.currentUser = user;
    gate.style.display = "none";
    shell.classList.add("is-active");
    document.getElementById("user-name").textContent = user.name;
    document.getElementById("user-email").textContent = user.email;
    document.getElementById("user-avatar").textContent = initials(user.name);
    loadSettings().then(function () {
      loadAll();
      startPolling();
    });
  }

  function setGateMsg(text, ok) {
    var msg = document.getElementById("g-msg");
    msg.textContent = text || "";
    msg.className = "adm-msg " + (ok ? "ok" : "err");
  }

  function checkSession() {
    api("/api/auth/me")
      .then(function (d) {
        if (d.user && d.user.role === "admin") {
          showApp(d.user);
          return;
        }
        if (d.user) {
          setGateMsg(
            "Signed in as " +
              d.user.email +
              " — not an administrator yet. Log out below and sign in with an admin account, or ask staff to promote your email.",
            false
          );
          showGateLogout();
          return;
        }
      })
      .catch(function (err) {
        setGateMsg(err.message, false);
      });
  }

  function showGateLogout() {
    var form = document.getElementById("login-form");
    if (!form || document.getElementById("gate-logout")) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "adm-btn adm-btn-sm adm-btn-ghost";
    btn.id = "gate-logout";
    btn.style.marginTop = "0.75rem";
    btn.style.width = "100%";
    btn.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Log out &amp; switch account';
    btn.addEventListener("click", function () {
      api("/api/auth/logout", { method: "POST" }).then(function () {
        location.reload();
      });
    });
    form.appendChild(btn);
  }

  function onGoogleCredential(response) {
    if (!response || !response.credential) return;
    setGateMsg("");
    api("/api/auth/google", {
      method: "POST",
      body: { credential: response.credential },
    })
      .then(function (d) {
        if (d.user.role !== "admin") {
          setGateMsg("This Google account is not an administrator.", false);
          return;
        }
        showApp(d.user);
      })
      .catch(function (err) {
        setGateMsg(err.message, false);
      });
  }

  function initGoogle() {
    fetch("/api/config", { credentials: "same-origin" })
      .then(function (r) {
        return r.json();
      })
      .then(function (cfg) {
        if (!cfg.googleClientId) return;
        (function waitForGsi() {
          if (!(window.google && google.accounts && google.accounts.id)) {
            setTimeout(waitForGsi, 300);
            return;
          }
          google.accounts.id.initialize({
            client_id: cfg.googleClientId,
            callback: onGoogleCredential,
            auto_select: false,
            cancel_on_tap_outside: false,
          });
          var btn = document.getElementById("btn-google");
          if (!btn) return;
          var holder = document.createElement("div");
          holder.style.display = "flex";
          holder.style.justifyContent = "center";
          btn.parentNode.insertBefore(holder, btn);
          btn.style.display = "none";
          try {
            google.accounts.id.renderButton(holder, {
              theme: "filled_black",
              size: "large",
              text: "continue_with",
              shape: "pill",
              width: 320,
            });
          } catch (e) {
            btn.style.display = "";
            btn.addEventListener("click", function () {
              google.accounts.id.prompt();
            });
          }
        })();
      })
      .catch(function () {});
  }

  document.getElementById("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    setGateMsg("");
    api("/api/auth/login", {
      method: "POST",
      body: {
        email: document.getElementById("g-email").value,
        password: document.getElementById("g-pass").value,
      },
    })
      .then(function (d) {
        if (d.user.role !== "admin") {
          setGateMsg("This account is not an administrator.", false);
          return;
        }
        showApp(d.user);
      })
      .catch(function (err) {
        setGateMsg(err.message, false);
      });
  });

  document.getElementById("logout").addEventListener("click", function () {
    api("/api/auth/logout", { method: "POST" }).then(function () {
      location.reload();
    });
  });

  initGoogle();

  /* ── Navigation ── */
  function goSection(name) {
    state.activeSection = name;
    document.querySelectorAll(".adm-nav-btn").forEach(function (btn) {
      btn.classList.toggle(
        "is-active",
        btn.getAttribute("data-section") === name
      );
    });
    document.querySelectorAll(".adm-section").forEach(function (sec) {
      sec.classList.toggle("is-active", sec.id === "sec-" + name);
    });
    var meta = SECTION_META[name] || SECTION_META.overview;
    document.getElementById("page-title").textContent = meta.title;
    document.getElementById("page-sub").textContent = meta.sub;
    closeSidebar();
    if (name === "kitchen") loadKitchen();
    if (name === "reports") {
      var monthEl = document.getElementById("report-month");
      if (monthEl && !monthEl.value) {
        monthEl.value = new Date().toISOString().slice(0, 7);
      }
    }
  }

  document.querySelectorAll(".adm-nav-btn[data-section]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      goSection(btn.getAttribute("data-section"));
    });
  });

  document.querySelectorAll("[data-goto]").forEach(function (el) {
    el.addEventListener("click", function () {
      goSection(el.getAttribute("data-goto"));
    });
  });

  document.getElementById("menu-toggle").addEventListener("click", openSidebar);
  backdrop.addEventListener("click", closeSidebar);

  document.getElementById("btn-refresh").addEventListener("click", function () {
    var btn = document.getElementById("btn-refresh");
    btn.disabled = true;
    loadAll()
      .then(function () {
        toast("Dashboard refreshed", "ok");
      })
      .catch(function (err) {
        toast(err.message, "err");
      })
      .finally(function () {
        btn.disabled = false;
      });
  });

  /* ── Data loaders ── */
  function loadAll() {
    return Promise.all([
      loadStats(),
      loadAnalytics(),
      loadActivity(),
      loadOrders(),
      loadFeedback(),
      loadProducts(),
      loadUsers(),
      loadKitchen(true),
    ]);
  }

  function loadSettings() {
    return api("/api/admin/settings").then(function (d) {
      state.settings = d.settings;
      document.getElementById("set-whatsapp").value = d.settings.whatsapp || "";
      document.getElementById("set-name").value = d.settings.businessName || "";
      document.getElementById("set-refresh").value =
        d.settings.autoRefreshSeconds != null
          ? d.settings.autoRefreshSeconds
          : 30;
      document.getElementById("set-notify").checked =
        d.settings.notifyNewOrders !== false;
      restartPolling();
    });
  }

  function startPolling() {
    restartPolling();
  }

  function restartPolling() {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollSince = new Date().toISOString();
    var dot = document.getElementById("live-indicator");
    var secs =
      state.settings && state.settings.autoRefreshSeconds != null
        ? Number(state.settings.autoRefreshSeconds)
        : 30;
    if (!secs || secs <= 0) {
      dot.classList.remove("is-live");
      return;
    }
    dot.classList.add("is-live");
    state.pollTimer = setInterval(pollNewOrders, secs * 1000);
  }

  function pollNewOrders() {
    var since = state.pollSince || "";
    api("/api/admin/poll?since=" + encodeURIComponent(since))
      .then(function (d) {
        state.pollSince = d.serverTime;
        var badge = document.getElementById("badge-orders");
        if (d.pending > 0) {
          badge.hidden = false;
          badge.textContent = d.pending;
        }
        if (
          d.newCount > 0 &&
          state.settings &&
          state.settings.notifyNewOrders !== false
        ) {
          toast(d.newCount + " new order(s)!", "ok");
          try {
            if (window.Notification && Notification.permission === "granted") {
              new Notification("Peoples Bakers", {
                body: d.newCount + " new order(s) waiting",
              });
            }
          } catch (e) {}
          loadStats();
          if (state.activeSection === "kitchen") loadKitchen();
          if (state.activeSection === "orders") loadOrders(state.ordersMeta.page);
        }
      })
      .catch(function () {});
  }

  if ("Notification" in window && Notification.permission === "default") {
    document.addEventListener("click", function reqNotif() {
      Notification.requestPermission();
      document.removeEventListener("click", reqNotif);
    }, { once: true });
  }

  function loadStats() {
    return api("/api/admin/stats").then(function (d) {
      state.stats = d.stats;
      var s = d.stats;

      var badge = document.getElementById("badge-orders");
      if (s.pendingOrders > 0) {
        badge.hidden = false;
        badge.textContent = s.pendingOrders;
      } else {
        badge.hidden = true;
      }

      var cards = [
        {
          icon: "fa-bag-shopping",
          val: s.orders,
          label: "Total orders",
          note: s.todayOrders + " today",
        },
        {
          icon: "fa-clock",
          val: s.pendingOrders,
          label: "Needs action",
          note: (s.awaitingPayment || 0) + " awaiting payment",
        },
        {
          icon: "fa-coins",
          val: rs(s.revenue),
          label: "Total revenue",
          note: rs(s.todayRevenue) + " today",
        },
        {
          icon: "fa-star",
          val: s.avgRating ? s.avgRating + " / 5" : "—",
          label: "Avg rating",
          note: s.feedback + " reviews",
        },
        {
          icon: "fa-cake-candles",
          val: s.products,
          label: "Products",
          note: "On catalogue",
        },
        {
          icon: "fa-users",
          val: s.users,
          label: "Users",
          note: "Registered accounts",
        },
      ];

      document.getElementById("stats").innerHTML = cards
        .map(function (c) {
          return (
            '<div class="adm-stat">' +
            '<div class="adm-stat-icon"><i class="fa-solid ' +
            esc(c.icon) +
            '"></i></div>' +
            '<div class="adm-stat-val">' +
            esc(c.val) +
            "</div>" +
            '<div class="adm-stat-label">' +
            esc(c.label) +
            "</div>" +
            (c.note
              ? '<div class="adm-stat-note">' + esc(c.note) + "</div>"
              : "") +
            "</div>"
          );
        })
        .join("");

      renderRecentOrders(d.recentOrders || []);
      renderRecentFeedback(d.recentFeedback || []);
    });
  }

  function loadAnalytics() {
    return api("/api/admin/analytics?days=7").then(function (d) {
      var chart = document.getElementById("analytics-chart");
      if (!chart) return;
      var days = d.revenueByDay || [];
      if (!days.length) {
        chart.innerHTML = '<div class="adm-empty">No data yet.</div>';
        return;
      }
      var maxRev = Math.max.apply(
        null,
        days.map(function (x) {
          return x.revenue || 0;
        }).concat([1])
      );
      var bars = days
        .map(function (day) {
          var h = Math.round(((day.revenue || 0) / maxRev) * 100);
          var label = day.date.slice(5);
          return (
            '<div class="adm-bar-col">' +
            '<span class="adm-bar-val">' +
            (day.orders || 0) +
            "</span>" +
            '<div class="adm-bar" style="height:' +
            h +
            '%" title="' +
            esc(rs(day.revenue)) +
            '"></div>' +
            '<span class="adm-bar-label">' +
            esc(label) +
            "</span></div>"
          );
        })
        .join("");
      var topItems = (d.topItems || [])
        .slice(0, 5)
        .map(function (it) {
          return (
            '<div class="adm-top-row"><span>' +
            esc(it.title) +
            "</span><span>" +
            esc(it.qty) +
            " sold</span></div>"
          );
        })
        .join("");
      chart.innerHTML =
        '<div class="adm-bars">' +
        bars +
        "</div>" +
        (topItems
          ? '<div class="adm-top-items"><h4>Top items</h4>' +
            topItems +
            "</div>"
          : "");
    });
  }

  function loadActivity() {
    return api("/api/admin/activity?limit=12").then(function (d) {
      var el = document.getElementById("activity-feed");
      if (!el) return;
      var list = d.activity || [];
      if (!list.length) {
        el.innerHTML =
          '<li class="adm-empty"><i class="fa-solid fa-bell"></i><br>No activity yet.</li>';
        return;
      }
      el.innerHTML = list
        .map(function (ev) {
          var icon = "fa-circle";
          if (ev.type === "order") icon = "fa-bag-shopping";
          if (ev.type === "feedback") icon = "fa-star";
          if (ev.type === "user") icon = "fa-user";
          if (ev.type === "status_change") icon = "fa-arrows-rotate";
          return (
            '<li class="adm-activity-item">' +
            '<div class="adm-activity-icon ' +
            esc(ev.type) +
            '"><i class="fa-solid ' +
            icon +
            '"></i></div>' +
            '<div class="adm-activity-body"><strong>' +
            esc(ev.title || ev.type) +
            "</strong><span>" +
            esc(ev.detail || "") +
            " · " +
            dt(ev.at) +
            "</span></div></li>"
          );
        })
        .join("");
    });
  }

  function renderRecentOrders(list) {
    var el = document.getElementById("recent-orders");
    if (!list.length) {
      el.innerHTML =
        '<li class="adm-empty"><i class="fa-solid fa-inbox"></i><br>No orders yet.</li>';
      return;
    }
    el.innerHTML = list
      .map(function (o) {
        return (
          '<li class="adm-mini-item">' +
          "<div><strong>" +
          esc(o.customer.name) +
          "</strong><br>" +
          '<span class="adm-muted">' +
          dt(o.createdAt) +
          " · " +
          esc(o.customer.mode || "Delivery") +
          "</span></div>" +
          "<div style='text-align:right'>" +
          pill(o.status) +
          "<br><strong>" +
          rs(o.total) +
          "</strong></div></li>"
        );
      })
      .join("");
  }

  function renderRecentFeedback(list) {
    var el = document.getElementById("recent-feedback");
    if (!list.length) {
      el.innerHTML =
        '<li class="adm-empty"><i class="fa-solid fa-comment"></i><br>No feedback yet.</li>';
      return;
    }
    el.innerHTML = list
      .map(function (f) {
        return (
          '<li class="adm-mini-item">' +
          "<div><strong>" +
          esc(f.name || "Anonymous") +
          '</strong><br><span class="adm-stars">' +
          stars(f.rating || 0) +
          '</span><br><span class="adm-muted">' +
          esc((f.message || "").slice(0, 80)) +
          (f.message && f.message.length > 80 ? "…" : "") +
          "</span></div>" +
          '<span class="adm-muted">' +
          dt(f.createdAt) +
          "</span></li>"
        );
      })
      .join("");
  }

  function loadOrders(page) {
    page = page || state.ordersMeta.page || 1;
    var q = document.getElementById("order-search").value.trim();
    var status = document.getElementById("order-filter").value;
    var query = buildQuery({ q: q, status: status, page: page, limit: 15 });
    return api("/api/admin/orders" + query).then(function (d) {
      state.orders = d.orders;
      state.ordersMeta = d.meta || state.ordersMeta;
      renderOrders();
    });
  }

  function renderOrders() {
    var body = document.getElementById("orders-body");
    var list = state.orders;

    if (!list.length) {
      body.innerHTML =
        '<div class="adm-empty"><i class="fa-solid fa-bag-shopping"></i><br>No orders match your filters.</div>';
      renderPagination("orders-pagination", state.ordersMeta, loadOrders);
      return;
    }

    var rows = list
      .map(function (o) {
        var items = o.items
          .map(function (it) {
            return esc(it.qty + "× " + it.title);
          })
          .join("<br>");
        var pay =
          o.paymentMethod === "payhere"
            ? pill(o.paymentStatus || "pending", "PayHere")
            : pill("cod", "Cash");
        var sel =
          '<select class="adm-status-select" data-order="' +
          esc(o.id) +
          '">' +
          STATUSES.map(function (st) {
            return (
              '<option value="' +
              st +
              '"' +
              (o.status === st ? " selected" : "") +
              ">" +
              st.replace(/_/g, " ") +
              "</option>"
            );
          }).join("") +
          "</select>";
        return (
          "<tr>" +
          "<td>" +
          dt(o.createdAt) +
          "<br><span class='adm-muted'>#" +
          esc(o.id.slice(-6)) +
          "</span></td>" +
          "<td><strong>" +
          esc(o.customer.name) +
          "</strong><br><span class='adm-muted'>" +
          esc(o.customer.phone) +
          "</span>" +
          (o.customer.email
            ? "<br><span class='adm-muted'>" + esc(o.customer.email) + "</span>"
            : "") +
          "<br><span class='adm-muted'>" +
          esc(o.customer.mode || "Delivery") +
          (o.customer.area ? " · " + esc(o.customer.area) : "") +
          "</span></td>" +
          "<td>" +
          items +
          (o.notes
            ? "<br><em class='adm-muted'>" + esc(o.notes) + "</em>"
            : "") +
          "</td>" +
          "<td><strong>" +
          rs(o.total) +
          "</strong><br>" +
          pay +
          "</td>" +
          "<td>" +
          pill(o.status) +
          "<br>" +
          sel +
          "<br><button type='button' class='adm-btn adm-btn-sm adm-btn-ghost' style='margin-top:.35rem' data-view-order='" +
          esc(o.id) +
          "'>View</button></td></tr>"
        );
      })
      .join("");

    body.innerHTML =
      '<table class="adm-table"><thead><tr><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>' +
      rows +
      "</tbody></table>";

    body.querySelectorAll("select[data-order]").forEach(function (sel) {
      sel.addEventListener("change", function () {
        var id = sel.getAttribute("data-order");
        api("/api/admin/orders/" + id, {
          method: "PATCH",
          body: { status: sel.value },
        })
          .then(function () {
            toast("Order status updated", "ok");
            loadStats();
            loadAnalytics();
            loadActivity();
            loadOrders(state.ordersMeta.page);
          })
          .catch(function (err) {
            toast(err.message, "err");
            loadOrders(state.ordersMeta.page);
          });
      });
    });

    body.querySelectorAll("[data-view-order]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openOrderDetail(btn.getAttribute("data-view-order"));
      });
    });

    renderPagination("orders-pagination", state.ordersMeta, loadOrders);
  }

  document.getElementById("order-search").addEventListener("input", function () {
    debounceSearch("orders", function () {
      loadOrders(1);
    });
  });
  document.getElementById("order-filter").addEventListener("change", function () {
    loadOrders(1);
  });

  function loadFeedback(page) {
    page = page || state.feedbackMeta.page || 1;
    var q = document.getElementById("feedback-search").value.trim();
    var handled = document.getElementById("feedback-filter").value;
    var query = buildQuery({ q: q, handled: handled, page: page, limit: 15 });
    return api("/api/admin/feedback" + query).then(function (d) {
      state.feedback = d.feedback;
      state.feedbackMeta = d.meta || state.feedbackMeta;
      renderFeedback();
    });
  }

  function renderFeedback() {
    var list = state.feedback;
    var body = document.getElementById("feedback-body");

    if (!list.length) {
      body.innerHTML =
        '<div class="adm-empty"><i class="fa-solid fa-star"></i><br>No feedback found.</div>';
      renderPagination("feedback-pagination", state.feedbackMeta, loadFeedback);
      return;
    }

    var rows = list
      .map(function (f) {
        return (
          "<tr><td>" +
          dt(f.createdAt) +
          "</td><td><strong>" +
          esc(f.name || "Anonymous") +
          "</strong><br><span class='adm-muted'>" +
          esc(f.email || "") +
          "</span></td><td><span class='adm-stars'>" +
          stars(f.rating || 0) +
          "</span><br><span class='adm-muted'>" +
          esc((f.categories || []).join(", ")) +
          "</span></td><td>" +
          esc(f.message) +
          (f.handled ? '<br><span class="adm-pill adm-pill-delivered">Handled</span>' : "") +
          "</td><td><div class='adm-row-actions'>" +
          (f.handled
            ? "<button type='button' class='adm-btn adm-btn-sm adm-btn-ghost' data-unhandle='" +
              esc(f.id) +
              "'>Reopen</button>"
            : "<button type='button' class='adm-btn adm-btn-sm adm-btn-primary' data-handle='" +
              esc(f.id) +
              "'>Mark handled</button>") +
          "<button type='button' class='adm-btn adm-btn-sm adm-btn-danger' data-del-fb='" +
          esc(f.id) +
          "'>Delete</button>" +
          "</div></td></tr>"
        );
      })
      .join("");

    body.innerHTML =
      '<table class="adm-table"><thead><tr><th>Date</th><th>From</th><th>Rating</th><th>Message</th><th></th></tr></thead><tbody>' +
      rows +
      "</tbody></table>";

    body.querySelectorAll("[data-handle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        api("/api/admin/feedback/" + btn.getAttribute("data-handle"), {
          method: "PATCH",
          body: { handled: true },
        }).then(function () {
          toast("Feedback marked handled", "ok");
          loadStats();
          loadFeedback(state.feedbackMeta.page);
        });
      });
    });
    body.querySelectorAll("[data-unhandle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        api("/api/admin/feedback/" + btn.getAttribute("data-unhandle"), {
          method: "PATCH",
          body: { handled: false },
        }).then(function () {
          loadFeedback(state.feedbackMeta.page);
        });
      });
    });
    body.querySelectorAll("[data-del-fb]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (!confirm("Delete this feedback?")) return;
        api("/api/admin/feedback/" + btn.getAttribute("data-del-fb"), {
          method: "DELETE",
        }).then(function () {
          toast("Feedback deleted", "ok");
          loadStats();
          loadFeedback(state.feedbackMeta.page);
        });
      });
    });

    renderPagination("feedback-pagination", state.feedbackMeta, loadFeedback);
  }

  document.getElementById("feedback-search").addEventListener("input", function () {
    debounceSearch("feedback", function () {
      loadFeedback(1);
    });
  });
  document.getElementById("feedback-filter").addEventListener("change", function () {
    loadFeedback(1);
  });

  function loadProducts() {
    return api("/api/products").then(function (d) {
      state.products = d.products;
      renderProducts();
    });
  }

  function renderProducts() {
    var q = (document.getElementById("product-search").value || "")
      .trim()
      .toLowerCase();
    var list = state.products.filter(function (p) {
      if (!q) return true;
      return [p.title, p.category, p.description]
        .join(" ")
        .toLowerCase()
        .indexOf(q) !== -1;
    });
    var body = document.getElementById("products-body");

    if (!list.length) {
      body.innerHTML =
        '<div class="adm-empty"><i class="fa-solid fa-cake-candles"></i><br>No products found.</div>';
      return;
    }

    var rows = list
      .map(function (p) {
        return (
          "<tr><td>" +
          (p.imageUrl
            ? "<img class='adm-product-thumb' src='" +
              esc(p.imageUrl) +
              "' alt=''>"
            : "") +
          "</td><td><strong>" +
          esc(p.title) +
          "</strong><br><span class='adm-muted'>" +
          esc(p.category) +
          "</span></td><td>" +
          rs(p.price) +
          "</td><td>" +
          (p.available === false ? pill("hidden") : pill("live")) +
          "</td><td><div class='adm-row-actions'>" +
          "<button type='button' class='adm-btn adm-btn-sm adm-btn-ghost' data-edit='" +
          esc(p.id) +
          "'>Edit</button>" +
          "<button type='button' class='adm-btn adm-btn-sm adm-btn-danger' data-del='" +
          esc(p.id) +
          "'>Delete</button>" +
          "</div></td></tr>"
        );
      })
      .join("");

    body.innerHTML =
      '<table class="adm-table"><thead><tr><th></th><th>Product</th><th>Price</th><th>Status</th><th></th></tr></thead><tbody>' +
      rows +
      "</tbody></table>";

    body.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        openProduct(b.getAttribute("data-edit"));
      });
    });
    body.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!confirm("Delete this product from the catalogue?")) return;
        api("/api/products/" + b.getAttribute("data-del"), { method: "DELETE" })
          .then(function () {
            toast("Product deleted", "ok");
            loadProducts();
            loadStats();
          })
          .catch(function (err) {
            toast(err.message, "err");
          });
      });
    });
  }

  document
    .getElementById("product-search")
    .addEventListener("input", renderProducts);

  function loadUsers(page) {
    page = page || state.usersMeta.page || 1;
    var q = document.getElementById("user-search").value.trim();
    var query = buildQuery({ q: q, page: page, limit: 15 });
    return api("/api/admin/users" + query).then(function (d) {
      state.users = d.users;
      state.usersMeta = d.meta || state.usersMeta;
      renderUsers();
    });
  }

  function renderUsers() {
    var list = state.users;
    var body = document.getElementById("users-body");

    if (!list.length) {
      body.innerHTML =
        '<div class="adm-empty"><i class="fa-solid fa-users"></i><br>No users found.</div>';
      renderPagination("users-pagination", state.usersMeta, loadUsers);
      return;
    }

    var rows = list
      .map(function (u) {
        var isSelf = state.currentUser && u.id === state.currentUser.id;
        var roleBtn =
          u.role === "admin"
            ? "<button type='button' class='adm-btn adm-btn-sm adm-btn-ghost' data-role='customer' data-user='" +
              esc(u.id) +
              "'" +
              (isSelf ? " disabled title='Cannot demote yourself'" : "") +
              ">Make customer</button>"
            : "<button type='button' class='adm-btn adm-btn-sm adm-btn-primary' data-role='admin' data-user='" +
              esc(u.id) +
              "'>Make admin</button>";
        return (
          "<tr><td><strong>" +
          esc(u.name) +
          "</strong>" +
          (isSelf ? " <span class='adm-muted'>(you)</span>" : "") +
          "</td><td>" +
          esc(u.email) +
          "</td><td>" +
          esc(u.phone || "—") +
          "</td><td>" +
          (u.role === "admin" ? pill("admin") : pill("customer")) +
          "</td><td><div class='adm-row-actions'>" +
          roleBtn +
          "</div></td></tr>"
        );
      })
      .join("");

    body.innerHTML =
      '<table class="adm-table"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th></th></tr></thead><tbody>' +
      rows +
      "</tbody></table>";

    body.querySelectorAll("[data-role]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var role = btn.getAttribute("data-role");
        var uid = btn.getAttribute("data-user");
        var label = role === "admin" ? "promote to admin" : "remove admin access";
        if (!confirm("Are you sure you want to " + label + "?")) return;
        api("/api/admin/users/" + uid, {
          method: "PATCH",
          body: { role: role },
        })
          .then(function () {
            toast("User role updated", "ok");
            loadUsers();
            loadStats();
          })
          .catch(function (err) {
            toast(err.message, "err");
          });
      });
    });

    renderPagination("users-pagination", state.usersMeta, loadUsers);
  }

  document.getElementById("user-search").addEventListener("input", function () {
    debounceSearch("users", function () {
      loadUsers(1);
    });
  });

  /* ── Order detail ── */
  var orderDialog = document.getElementById("order-dialog");

  function openOrderDetail(id) {
    state.orderDetailId = id;
    document.getElementById("order-detail-content").innerHTML = "Loading…";
    document.getElementById("order-admin-notes").value = "";
    orderDialog.showModal();
    api("/api/admin/orders/" + id).then(function (d) {
      var o = d.order;
      var waLink = document.getElementById("order-wa-link");
      if (d.whatsappUrl) {
        waLink.href = d.whatsappUrl;
        waLink.style.display = "";
      } else {
        waLink.style.display = "none";
      }
      document.getElementById("order-admin-notes").value = o.adminNotes || "";
      var items = (o.items || [])
        .map(function (it) {
          return esc(it.qty + "× " + it.title) + " — " + rs(it.price * it.qty);
        })
        .join("<br>");
      var history = (o.statusHistory || [])
        .map(function (h) {
          return (
            "<li>" +
            dt(h.at) +
            ": " +
            esc((h.from || "new").replace(/_/g, " ")) +
            " → " +
            esc((h.to || "").replace(/_/g, " ")) +
            (h.by ? " <span class='adm-muted'>by " + esc(h.by) + "</span>" : "") +
            "</li>"
          );
        })
        .join("");
      document.getElementById("order-detail-content").innerHTML =
        '<dl class="adm-detail-grid">' +
        "<dt>Order ID</dt><dd>" +
        esc(o.id) +
        "</dd>" +
        "<dt>Date</dt><dd>" +
        dt(o.createdAt) +
        "</dd>" +
        "<dt>Customer</dt><dd>" +
        esc(o.customer.name) +
        "</dd>" +
        "<dt>Phone</dt><dd>" +
        esc(o.customer.phone) +
        "</dd>" +
        "<dt>Mode</dt><dd>" +
        esc(o.customer.mode || "Delivery") +
        (o.customer.area ? " · " + esc(o.customer.area) : "") +
        "</dd>" +
        "<dt>Total</dt><dd>" +
        rs(o.total) +
        "</dd>" +
        "<dt>Payment</dt><dd>" +
        esc(o.paymentMethod || "cod") +
        " · " +
        esc(o.paymentStatus || "") +
        "</dd>" +
        "<dt>Status</dt><dd>" +
        pill(o.status) +
        "</dd>" +
        "</dl>" +
        "<strong>Items</strong><br><span class='adm-muted'>" +
        items +
        "</span>" +
        (o.notes
          ? "<br><br><strong>Customer notes</strong><br><span class='adm-muted'>" +
            esc(o.notes) +
            "</span>"
          : "") +
        (history
          ? '<ul class="adm-history"><strong>Status history</strong>' +
            history +
            "</ul>"
          : "");
    });
  }

  document.getElementById("order-detail-close").addEventListener("click", function () {
    orderDialog.close();
  });

  document.getElementById("order-notes-save").addEventListener("click", function () {
    if (!state.orderDetailId) return;
    api("/api/admin/orders/" + state.orderDetailId, {
      method: "PATCH",
      body: { adminNotes: document.getElementById("order-admin-notes").value },
    })
      .then(function () {
        toast("Admin notes saved", "ok");
        orderDialog.close();
      })
      .catch(function (err) {
        toast(err.message, "err");
      });
  });

  /* ── Product dialog ── */
  var dialog = document.getElementById("product-dialog");

  function openProduct(id) {
    var p = id
      ? state.products.find(function (x) {
          return x.id === id;
        })
      : null;
    document.getElementById("pd-title").textContent = p
      ? "Edit product"
      : "Add product";
    document.getElementById("pd-id").value = p ? p.id : "";
    document.getElementById("pd-name").value = p ? p.title : "";
    document.getElementById("pd-cat").value = p ? p.category : "";
    document.getElementById("pd-price").value = p ? p.price : "";
    document.getElementById("pd-img").value = p ? p.imageUrl : "";
    document.getElementById("pd-desc").value = p ? p.description : "";
    document.getElementById("pd-avail").checked = p ? p.available !== false : true;
    document.getElementById("pd-msg").textContent = "";
    dialog.showModal();
  }

  document.getElementById("add-product").addEventListener("click", function () {
    openProduct(null);
  });
  document.getElementById("pd-cancel").addEventListener("click", function () {
    dialog.close();
  });

  document.getElementById("product-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var id = document.getElementById("pd-id").value;
    var payload = {
      title: document.getElementById("pd-name").value,
      category: document.getElementById("pd-cat").value,
      price: document.getElementById("pd-price").value,
      imageUrl: document.getElementById("pd-img").value,
      description: document.getElementById("pd-desc").value,
      available: document.getElementById("pd-avail").checked,
    };
    var req = id
      ? api("/api/products/" + id, { method: "PUT", body: payload })
      : api("/api/products", { method: "POST", body: payload });
    req
      .then(function () {
        dialog.close();
        toast(id ? "Product updated" : "Product added", "ok");
        loadProducts();
        loadStats();
      })
      .catch(function (err) {
        document.getElementById("pd-msg").textContent = err.message;
      });
  });

  document.getElementById("order-print").addEventListener("click", function () {
    window.print();
  });

  function loadKitchen(silent) {
    return api("/api/admin/kitchen").then(function (d) {
      var board = document.getElementById("kitchen-board");
      if (!board) return;
      var cols = d.columns || {};
      board.innerHTML = KITCHEN_COLS.map(function (col) {
        var list = cols[col.key] || [];
        var cards = list
          .map(function (o) {
            var items = (o.items || [])
              .slice(0, 3)
              .map(function (it) {
                return esc(it.qty + "× " + it.title);
              })
              .join(", ");
            var actions =
              col.next
                ? "<button type='button' class='adm-btn adm-btn-sm adm-btn-primary' data-kitchen-move='" +
                  esc(o.id) +
                  "' data-next='" +
                  col.next +
                  "'>" +
                  esc(col.nextLabel) +
                  "</button>"
                : "";
            return (
              '<div class="adm-k-card">' +
              "<strong>" +
              esc(o.customer.name) +
              "</strong>" +
              '<span class="adm-muted">' +
              rs(o.total) +
              " · " +
              esc(o.customer.mode || "Delivery") +
              "</span><br>" +
              '<span class="adm-muted">' +
              items +
              "</span>" +
              '<div class="adm-k-actions">' +
              actions +
              "<button type='button' class='adm-btn adm-btn-sm adm-btn-ghost' data-view-order='" +
              esc(o.id) +
              "'>View</button></div></div>"
            );
          })
          .join("");
        return (
          '<div class="adm-kanban-col">' +
          '<div class="adm-kanban-head">' +
          esc(col.label) +
          '<span class="adm-kanban-count">' +
          list.length +
          "</span></div>" +
          '<div class="adm-kanban-cards">' +
          (cards || '<span class="adm-muted" style="padding:.5rem;font-size:.78rem">Empty</span>') +
          "</div></div>"
        );
      }).join("");

      board.querySelectorAll("[data-kitchen-move]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          api("/api/admin/orders/" + btn.getAttribute("data-kitchen-move"), {
            method: "PATCH",
            body: { status: btn.getAttribute("data-next") },
          }).then(function () {
            toast("Order moved", "ok");
            loadKitchen();
            loadStats();
          });
        });
      });
      board.querySelectorAll("[data-view-order]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          openOrderDetail(btn.getAttribute("data-view-order"));
        });
      });
    }).catch(function (err) {
      if (!silent) toast(err.message, "err");
    });
  }

  function loadReport() {
    var month = document.getElementById("report-month").value;
    if (!month) return;
    var body = document.getElementById("reports-body");
    body.innerHTML = '<div class="adm-empty">Loading…</div>';
    api("/api/admin/reports?month=" + encodeURIComponent(month)).then(function (d) {
      var r = d.report;
      var statusRows = Object.keys(r.byStatus || {})
        .map(function (k) {
          return (
            '<div class="adm-top-row"><span>' +
            esc(k.replace(/_/g, " ")) +
            "</span><span>" +
            r.byStatus[k] +
            "</span></div>"
          );
        })
        .join("");
      body.innerHTML =
        '<div class="adm-report-stats">' +
        '<div class="adm-report-stat"><div class="n">' +
        r.orders +
        '</div><div class="l">Orders</div></div>' +
        '<div class="adm-report-stat"><div class="n">' +
        rs(r.revenue) +
        '</div><div class="l">Revenue</div></div>' +
        '<div class="adm-report-stat"><div class="n">' +
        rs(r.avgOrderValue) +
        '</div><div class="l">Avg order</div></div>' +
        '<div class="adm-report-stat"><div class="n">' +
        r.delivered +
        '</div><div class="l">Delivered</div></div>' +
        '<div class="adm-report-stat"><div class="n">' +
        r.cancelled +
        '</div><div class="l">Cancelled</div></div>' +
        "</div>" +
        (statusRows
          ? '<div style="padding:0 1.1rem 1.1rem"><h4 style="font-size:.85rem;margin-bottom:.5rem">By status</h4>' +
            statusRows +
            "</div>"
          : "");
    });
  }

  document.getElementById("btn-load-report").addEventListener("click", loadReport);

  document.getElementById("settings-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = document.getElementById("settings-msg");
    api("/api/admin/settings", {
      method: "PATCH",
      body: {
        whatsapp: document.getElementById("set-whatsapp").value,
        businessName: document.getElementById("set-name").value,
        autoRefreshSeconds: Number(document.getElementById("set-refresh").value),
        notifyNewOrders: document.getElementById("set-notify").checked,
      },
    })
      .then(function (d) {
        state.settings = d.settings;
        msg.textContent = "Settings saved.";
        msg.className = "adm-msg ok";
        restartPolling();
      })
      .catch(function (err) {
        msg.textContent = err.message;
        msg.className = "adm-msg err";
      });
  });

  checkSession();
})();
