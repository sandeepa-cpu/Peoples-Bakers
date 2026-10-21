/* Peoples Bakers — customer account dashboard */
(function () {
  "use strict";

  function t(key, vars) {
    if (window.i18n && typeof window.i18n.t === "function") {
      return window.i18n.t(key, vars);
    }
    return key;
  }

  var TRACK_STEPS = [
    { key: "pending", labelKey: "account.track_placed" },
    { key: "confirmed", labelKey: "account.track_confirmed" },
    { key: "preparing", labelKey: "account.track_preparing" },
    { key: "delivered", labelKey: "account.track_delivered" },
  ];

  var state = {
    user: null,
    orders: [],
    filter: "all",
    search: "",
    discountCfg: null,
  };

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function rs(n) {
    return "Rs. " + (Number(n) || 0).toLocaleString("en-LK");
  }

  function dt(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("en-LK", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (e) {
      return iso;
    }
  }

  function initials(name) {
    return String(name || "P")
      .split(/\s+/)
      .slice(0, 2)
      .map(function (p) {
        return p.charAt(0).toUpperCase();
      })
      .join("");
  }

  function api(path, opts) {
    opts = opts || {};
    return fetch(path, {
      method: opts.method || "GET",
      headers: opts.body
        ? { "Content-Type": "application/json" }
        : undefined,
      credentials: "same-origin",
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    })
      .catch(function () {
        throw new Error(t("account.server_error"));
      })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) {
            var msg = data.error || "Request failed";
            if (msg.indexOf("Unknown API endpoint") !== -1) {
              msg = t("account.server_outdated");
            }
            throw new Error(msg);
          }
          return data;
        });
      });
  }

  function showTab(name, opts) {
    opts = opts || {};
    document.querySelectorAll("[data-ac-tab]").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-ac-tab") === name);
    });
    document.querySelectorAll("[data-ac-panel]").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-ac-panel") !== name;
    });
    if (opts.silentHash) return;
    if (name === "orders") {
      if (location.hash !== "#orders") location.hash = "orders";
    } else if (name === "overview") {
      if (location.hash !== "#overview") location.hash = "overview";
    } else if (location.hash) {
      history.replaceState(null, "", "account.html");
    }
  }

  function tabFromHash() {
    var h = (location.hash || "").replace("#", "");
    if (h === "orders" || h === "overview" || h === "profile") return h;
    return "profile";
  }

  function canCancelOrder(o) {
    if (!o || o.status === "cancelled") return false;
    return (
      o.status === "pending" ||
      o.status === "awaiting_payment" ||
      o.status === "confirmed"
    );
  }

  function isActiveOrder(o) {
    return (
      o.status !== "delivered" &&
      o.status !== "cancelled"
    );
  }

  function statusIndex(status) {
    if (status === "awaiting_payment") return 0;
    var idx = TRACK_STEPS.findIndex(function (s) {
      return s.key === status;
    });
    return idx >= 0 ? idx : 0;
  }

  function renderTrack(status) {
    if (status === "cancelled") {
      return (
        '<p class="ac-order-preview" style="color:#b3261e;font-weight:600">' +
        '<i class="fa-solid fa-circle-xmark"></i> ' + esc(t("account.order_cancelled")) + "</p>"
      );
    }
    var idx = statusIndex(status);
    return (
      '<div class="ac-track">' +
      TRACK_STEPS.map(function (step, i) {
        var cls = "ac-track-step";
        if (i < idx) cls += " is-done";
        if (i === idx) cls += " is-current";
        return (
          '<div class="' +
          cls +
          '">' +
          '<div class="ac-track-dot">' +
          (i < idx ? '<i class="fa-solid fa-check"></i>' : "") +
          "</div>" +
          '<div class="ac-track-label">' +
          esc(t(step.labelKey)) +
          "</div></div>"
        );
      }).join("") +
      "</div>"
    );
  }

  function paymentBadges(o) {
    var badges = [];
    if (o.paymentStatus === "paid") {
      badges.push('<span class="ac-pill ac-pill--paid">' + esc(t("account.pill_paid")) + "</span>");
    } else if (o.paymentMethod === "payhere" && o.paymentStatus === "pending") {
      badges.push('<span class="ac-pill ac-pill--awaiting_payment">' + esc(t("account.pill_awaiting_payment")) + "</span>");
    } else if (o.paymentStatus === "refund_pending") {
      badges.push('<span class="ac-pill ac-pill--refund">' + esc(t("account.pill_refund")) + "</span>");
    }
    return badges.join("");
  }

  function renderLatestOrder(orders) {
    var el = document.getElementById("ac-latest-order");
    if (!el) return;
    if (!orders.length) {
      el.innerHTML =
        '<div class="ac-latest ac-empty" style="padding:1.5rem">' +
        '<i class="fa-solid fa-basket-shopping"></i>' +
        "<p>" + esc(t("account.latest_none")) + "</p>" +
        '<a class="btn btn-primary" href="order.html">' + esc(t("account.order_now")) + "</a></div>";
      return;
    }
    var o = orders[0];
    var ref = "#" + String(o.id || "").slice(-6).toUpperCase();
    var status = o.status || "pending";
    el.innerHTML =
      '<div class="ac-latest">' +
      '<div class="ac-latest-label"><i class="fa-solid fa-star"></i> ' + esc(t("account.latest_label")) + "</div>" +
      '<div class="ac-latest-head">' +
      '<div><span class="ac-latest-ref">' +
      esc(ref) +
      "</span><br>" +
      '<span class="ac-order-date">' +
      dt(o.createdAt) +
      "</span></div>" +
      '<div class="ac-order-badges">' +
      '<span class="ac-pill ac-pill--' +
      esc(status) +
      '">' +
      esc(String(status).replace(/_/g, " ")) +
      "</span>" +
      paymentBadges(o) +
      "</div></div>" +
      renderTrack(status) +
      '<div class="ac-order-foot" style="border:none;padding-top:0;margin-top:0">' +
      "<span>" +
      esc(o.customer && o.customer.mode ? o.customer.mode : t("account.mode_delivery")) +
      "</span>" +
      '<span class="ac-order-total">' +
      rs(o.total) +
      "</span></div>" +
      '<button type="button" class="ac-quick-btn" style="margin-top:.75rem" data-ac-tab-jump="orders">' +
      '<i class="fa-solid fa-arrow-right"></i> ' + esc(t("account.view_all_orders")) + "</button></div>";
    el.querySelectorAll("[data-ac-tab-jump]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showTab(btn.getAttribute("data-ac-tab-jump"));
      });
    });
  }

  function updateStats(orders) {
    var active = orders.filter(isActiveOrder).length;
    var spent = orders
      .filter(function (o) {
        return o.status !== "cancelled";
      })
      .reduce(function (s, o) {
        return s + (Number(o.total) || 0);
      }, 0);

    document.getElementById("ac-stat-orders").textContent = orders.length;
    document.getElementById("ac-stat-active").textContent = active;
    document.getElementById("ac-stat-spent").textContent = rs(spent);

    var badge = document.getElementById("ac-orders-badge");
    if (active > 0) {
      badge.hidden = false;
      badge.textContent = active;
    } else {
      badge.hidden = true;
    }
  }

  function filteredOrders() {
    return state.orders.filter(function (o) {
      if (state.filter === "active" && !isActiveOrder(o)) return false;
      if (state.filter === "delivered" && o.status !== "delivered") return false;
      if (state.filter === "cancelled" && o.status !== "cancelled") return false;
      if (state.search) {
        var hay = [
          o.id,
          o.status,
          o.notes,
          o.customer && o.customer.area,
          (o.items || []).map(function (it) {
            return it.title;
          }).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (hay.indexOf(state.search) === -1) return false;
      }
      return true;
    });
  }

  function renderOrders() {
    var body = document.getElementById("ac-orders-body");
    var orders = filteredOrders();

    if (!state.orders.length) {
      body.innerHTML =
        '<div class="ac-empty">' +
        '<i class="fa-solid fa-basket-shopping" aria-hidden="true"></i>' +
        "<p>" + esc(t("account.empty_sub")) + "</p>" +
        '<a class="btn btn-primary" href="order.html"><i class="fa-solid fa-bag-shopping"></i> ' + esc(t("account.order_online")) + "</a>" +
        "</div>";
      return;
    }

    if (!orders.length) {
      body.innerHTML =
        '<div class="ac-empty"><p>' + esc(t("account.no_match")) + "</p></div>";
      return;
    }

    body.innerHTML = orders
      .map(function (o) {
        var ref = "#" + String(o.id || "").slice(-6).toUpperCase();
        var status = o.status || "pending";
        var preview = (o.items || [])
          .slice(0, 2)
          .map(function (it) {
            return esc((it.qty || 1) + "× " + (it.title || t("account.item_fallback")));
          })
          .join(" · ");
        if ((o.items || []).length > 2) preview += " …";

        var detailItems = (o.items || [])
          .map(function (it) {
            return (
              "<li>" +
              esc((it.qty || 1) + "× " + (it.title || t("account.item_fallback"))) +
              " — " +
              rs((it.price || 0) * (it.qty || 1)) +
              "</li>"
            );
          })
          .join("");

        var cancelBtn = canCancelOrder(o)
          ? '<button type="button" class="ac-cancel-btn" data-cancel-order="' +
            esc(o.id) +
            '"><i class="fa-solid fa-xmark"></i> ' + esc(t("account.cancel_order")) + "</button>"
          : "";

        return (
          '<article class="ac-order-card" data-order-id="' +
          esc(o.id) +
          '">' +
          '<div class="ac-order-main" data-toggle-order="' +
          esc(o.id) +
          '">' +
          '<div class="ac-order-head">' +
          "<div>" +
          '<span class="ac-order-ref">' +
          esc(ref) +
          "</span>" +
          '<span class="ac-order-date">' +
          dt(o.createdAt) +
          "</span></div>" +
          '<div class="ac-order-badges">' +
          '<span class="ac-pill ac-pill--' +
          esc(status) +
          '">' +
          esc(String(status).replace(/_/g, " ")) +
          "</span>" +
          paymentBadges(o) +
          "</div></div>" +
          renderTrack(status) +
          '<p class="ac-order-preview">' +
          preview +
          "</p>" +
          '<div class="ac-order-foot">' +
          "<span><i class=\"fa-solid fa-truck\"></i> " +
          esc(o.customer && o.customer.mode ? o.customer.mode : t("account.mode_delivery")) +
          (o.customer && o.customer.area ? " · " + esc(o.customer.area) : "") +
          "</span>" +
          '<span class="ac-order-total">' +
          rs(o.total) +
          "</span></div>" +
          '<p class="ac-expand-hint"><i class="fa-solid fa-chevron-down"></i> ' + esc(t("account.tap_details")) + "</p>" +
          "</div>" +
          '<div class="ac-order-detail">' +
          '<dl class="ac-detail-grid">' +
          "<dt>" + esc(t("account.order_id")) + "</dt><dd>" +
          esc(o.id) +
          "</dd>" +
          "<dt>" + esc(t("account.lbl_payment")) + "</dt><dd>" +
          esc(o.paymentMethod || "cod") +
          " · " +
          esc(o.paymentStatus || "—") +
          "</dd>" +
          "<dt>" + esc(t("account.lbl_phone")) + "</dt><dd>" +
          esc((o.customer && o.customer.phone) || "—") +
          "</dd></dl>" +
          "<strong>" + esc(t("account.lbl_items")) + "</strong><ul style='margin:.5rem 0 0 1.1rem;font-size:.85rem;line-height:1.6'>" +
          detailItems +
          "</ul>" +
          (o.notes
            ? "<p style='margin-top:.75rem;font-size:.85rem;color:#7a6f78'><em>" +
              esc(o.notes) +
              "</em></p>"
            : "") +
          '<div class="ac-order-actions">' +
          cancelBtn +
          '<a class="ac-quick-btn" href="order.html"><i class="fa-solid fa-rotate"></i> ' + esc(t("account.order_again")) + "</a>" +
          "</div></div></article>"
        );
      })
      .join("");

    body.querySelectorAll("[data-toggle-order]").forEach(function (el) {
      el.addEventListener("click", function () {
        var card = el.closest(".ac-order-card");
        if (card) card.classList.toggle("is-expanded");
      });
    });

    body.querySelectorAll("[data-cancel-order]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var orderId = btn.getAttribute("data-cancel-order");
        if (
          !window.confirm(t("account.cancel_confirm"))
        ) {
          return;
        }
        btn.disabled = true;
        btn.textContent = t("account.cancelling");
        api("/api/orders/" + encodeURIComponent(orderId) + "/cancel", {
          method: "POST",
        })
          .then(function () {
            return loadOrders();
          })
          .catch(function (err) {
            alert(err.message || t("account.cancel_fail"));
            btn.disabled = false;
            btn.innerHTML =
              '<i class="fa-solid fa-xmark"></i> ' + esc(t("account.cancel_order"));
          });
      });
    });
  }

  function loadOrders() {
    return api("/api/orders")
      .then(function (d) {
        state.orders = d.orders || [];
        updateStats(state.orders);
        renderLatestOrder(state.orders);
        renderOrders();
      })
      .catch(function () {
        document.getElementById("ac-orders-body").innerHTML =
          '<div class="ac-empty"><p>' + esc(t("account.load_orders_fail")) + "</p></div>";
      });
  }

  function updateDiscountUi(user, cfg) {
    var banner = document.getElementById("ac-phone-discount");
    var profileHint = document.getElementById("ac-profile-discount-hint");
    if (!cfg || !cfg.phoneDiscountEnabled) {
      if (banner) banner.hidden = true;
      return;
    }
    var hintText =
      cfg.phoneDiscountHint ||
      "Add a valid mobile number (07XXXXXXXX) for " +
        cfg.phoneDiscountPercent +
        "% off orders over Rs. " +
        (cfg.phoneDiscountMin || 0).toLocaleString("en-LK") +
        ".";
    if (profileHint) profileHint.textContent = hintText;
    if (banner) {
      if (user.phone) {
        banner.hidden = true;
      } else {
        banner.hidden = false;
        var pctEl = document.getElementById("ac-discount-pct");
        if (pctEl) pctEl.textContent = cfg.phoneDiscountPercent + "%";
        document.getElementById("ac-discount-title").textContent =
          t("account.discount_title_save");
        document.getElementById("ac-discount-hint").textContent = hintText;
      }
    }
  }

  function loadDiscountConfig(user) {
    fetch("/api/config", { credentials: "same-origin" })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (cfg) {
        if (!cfg) return;
        state.discountCfg = cfg;
        updateDiscountUi(user, cfg);
      })
      .catch(function () {});
  }

  function renderUser(user) {
    var avatar = document.getElementById("ac-avatar");
    if (user.avatar) {
      avatar.innerHTML =
        '<img src="' + esc(user.avatar) + '" alt="" referrerpolicy="no-referrer">';
    } else {
      avatar.textContent = initials(user.name);
    }
    document.getElementById("ac-welcome").textContent = t("account.welcome", {
      name: user.name || t("account.welcome_default"),
    });
    document.getElementById("ac-email-display").textContent = user.email || "";
  }

  function init(user) {
    state.user = user;
    document.getElementById("ac-gate").hidden = true;
    document.getElementById("ac-app").hidden = false;

    renderUser(user);
    document.getElementById("ac-name").value = user.name || "";
    document.getElementById("ac-email").value = user.email || "";
    document.getElementById("ac-phone").value = user.phone || "";

    loadDiscountConfig(user);

    document.querySelectorAll("[data-ac-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showTab(btn.getAttribute("data-ac-tab"));
      });
    });

    document.querySelectorAll("[data-ac-tab-jump]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        showTab(btn.getAttribute("data-ac-tab-jump"));
      });
    });

    document.querySelectorAll("[data-order-filter]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll("[data-order-filter]").forEach(function (b) {
          b.classList.remove("is-active");
        });
        btn.classList.add("is-active");
        state.filter = btn.getAttribute("data-order-filter");
        renderOrders();
      });
    });

    document.getElementById("ac-order-search").addEventListener("input", function (e) {
      state.search = e.target.value.trim().toLowerCase();
      renderOrders();
    });

    if (location.hash === "#orders") showTab("orders", { silentHash: true });
    else showTab(tabFromHash(), { silentHash: true });

    window.addEventListener("hashchange", function () {
      showTab(tabFromHash(), { silentHash: true });
    });

    document.getElementById("ac-profile-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = document.getElementById("ac-profile-msg");
      msg.textContent = "";
      msg.className = "ac-msg";
      var btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      api("/api/auth/profile", {
        method: "POST",
        body: {
          name: document.getElementById("ac-name").value.trim(),
          phone: document.getElementById("ac-phone").value.trim(),
        },
      })
        .then(function (d) {
          msg.textContent = t("account.profile_saved");
          msg.classList.add("ok");
          if (d.user) {
            state.user = d.user;
            renderUser(d.user);
            updateDiscountUi(d.user, state.discountCfg);
          }
        })
        .catch(function (err) {
          msg.textContent = err.message || t("account.profile_save_fail");
          msg.classList.add("err");
        })
        .finally(function () {
          btn.disabled = false;
        });
    });

    loadOrders();
  }

  window.addEventListener("i18n:languageChanged", function () {
    if (!state.user) return;
    renderUser(state.user);
    updateDiscountUi(state.user, state.discountCfg);
    renderLatestOrder(state.orders);
    renderOrders();
  });

  api("/api/auth/me")
    .then(function (d) {
      if (!d.user) {
        location.href =
          "login.html?next=" + encodeURIComponent("account.html" + location.hash);
        return;
      }
      init(d.user);
    })
    .catch(function () {
      location.href = "login.html?next=" + encodeURIComponent("account.html");
    });
})();
