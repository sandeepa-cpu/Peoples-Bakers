/* Peoples Bakers — Admin dashboard logic */
(function () {
  "use strict";

  var gate = document.getElementById("gate");
  var shell = document.getElementById("shell");

  function api(path, opts) {
    opts = opts || {};
    return fetch(path, {
      method: opts.method || "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (res) {
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
    var d = new Date(s);
    return d.toLocaleString("en-LK", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  /* ── Auth gate ── */
  function showApp(user) {
    gate.style.display = "none";
    shell.classList.add("show");
    document.getElementById("who").textContent = user.name + " · " + user.email;
    loadAll();
  }

  function checkSession() {
    api("/api/auth/me").then(function (d) {
      if (d.user && d.user.role === "admin") showApp(d.user);
    });
  }

  document.getElementById("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = document.getElementById("g-msg");
    msg.textContent = "";
    api("/api/auth/login", {
      method: "POST",
      body: {
        email: document.getElementById("g-email").value,
        password: document.getElementById("g-pass").value,
      },
    })
      .then(function (d) {
        if (d.user.role !== "admin") {
          msg.textContent = "This account is not an administrator.";
          return;
        }
        showApp(d.user);
      })
      .catch(function (err) {
        msg.textContent = err.message;
      });
  });

  document.getElementById("logout").addEventListener("click", function () {
    api("/api/auth/logout", { method: "POST" }).then(function () {
      location.reload();
    });
  });

  /* ── Tabs ── */
  document.querySelectorAll(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".tab").forEach(function (t) {
        t.classList.remove("active");
      });
      document.querySelectorAll(".view").forEach(function (v) {
        v.classList.remove("active");
      });
      tab.classList.add("active");
      document
        .getElementById("view-" + tab.getAttribute("data-view"))
        .classList.add("active");
    });
  });

  /* ── Loaders ── */
  function loadAll() {
    loadStats();
    loadOrders();
    loadFeedback();
    loadProducts();
    loadUsers();
  }

  function loadStats() {
    api("/api/admin/stats").then(function (d) {
      var s = d.stats;
      var cards = [
        { n: s.orders, l: "Orders" },
        { n: s.pendingOrders, l: "Pending" },
        { n: rs(s.revenue), l: "Revenue" },
        { n: s.feedback, l: "Feedback" },
        { n: s.products, l: "Products" },
        { n: s.users, l: "Users" },
      ];
      document.getElementById("stats").innerHTML = cards
        .map(function (c) {
          return (
            '<div class="stat"><div class="n">' +
            esc(c.n) +
            '</div><div class="l">' +
            esc(c.l) +
            "</div></div>"
          );
        })
        .join("");
    });
  }

  var STATUSES = ["pending", "confirmed", "preparing", "delivered", "cancelled"];

  function loadOrders() {
    api("/api/orders").then(function (d) {
      var body = document.getElementById("orders-body");
      if (!d.orders.length) {
        body.innerHTML = '<div class="empty">No orders yet.</div>';
        return;
      }
      var rows = d.orders
        .map(function (o) {
          var items = o.items
            .map(function (it) {
              return esc(it.qty + "× " + it.title);
            })
            .join("<br>");
          var sel =
            '<select data-order="' +
            o.id +
            '">' +
            STATUSES.map(function (st) {
              return (
                '<option value="' +
                st +
                '"' +
                (o.status === st ? " selected" : "") +
                ">" +
                st +
                "</option>"
              );
            }).join("") +
            "</select>";
          return (
            "<tr><td>" +
            dt(o.createdAt) +
            "</td><td><strong>" +
            esc(o.customer.name) +
            "</strong><br><span style='color:#7a6f78'>" +
            esc(o.customer.phone) +
            "</span><br><span style='color:#7a6f78'>" +
            esc(o.customer.mode || "") +
            (o.customer.area ? " · " + esc(o.customer.area) : "") +
            "</span></td><td>" +
            items +
            (o.notes ? "<br><em style='color:#7a6f78'>" + esc(o.notes) + "</em>" : "") +
            "</td><td>" +
            rs(o.total) +
            "</td><td>" +
            sel +
            "</td></tr>"
          );
        })
        .join("");
      body.innerHTML =
        "<table><thead><tr><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>" +
        rows +
        "</tbody></table>";

      body.querySelectorAll("select[data-order]").forEach(function (sel) {
        sel.addEventListener("change", function () {
          api("/api/orders/" + sel.getAttribute("data-order"), {
            method: "PATCH",
            body: { status: sel.value },
          }).then(loadStats);
        });
      });
    });
  }

  function loadFeedback() {
    api("/api/feedback").then(function (d) {
      var body = document.getElementById("feedback-body");
      if (!d.feedback.length) {
        body.innerHTML = '<div class="empty">No feedback yet.</div>';
        return;
      }
      var rows = d.feedback
        .map(function (f) {
          var stars = "";
          for (var i = 0; i < 5; i++)
            stars += i < f.rating ? "★" : "☆";
          return (
            "<tr><td>" +
            dt(f.createdAt) +
            "</td><td><strong>" +
            esc(f.name || "Anonymous") +
            "</strong><br><span style='color:#7a6f78'>" +
            esc(f.email || "") +
            "</span></td><td><span class='stars'>" +
            stars +
            "</span><br>" +
            esc((f.categories || []).join(", ")) +
            "</td><td>" +
            esc(f.message) +
            "</td></tr>"
          );
        })
        .join("");
      body.innerHTML =
        "<table><thead><tr><th>Date</th><th>From</th><th>Rating</th><th>Message</th></tr></thead><tbody>" +
        rows +
        "</tbody></table>";
    });
  }

  function loadProducts() {
    api("/api/products").then(function (d) {
      var body = document.getElementById("products-body");
      if (!d.products.length) {
        body.innerHTML = '<div class="empty">No products yet.</div>';
        return;
      }
      var rows = d.products
        .map(function (p) {
          return (
            "<tr><td>" +
            (p.imageUrl
              ? "<img src='" +
                esc(p.imageUrl) +
                "' alt='' style='width:42px;height:42px;object-fit:cover;border-radius:8px'>"
              : "") +
            "</td><td><strong>" +
            esc(p.title) +
            "</strong><br><span style='color:#7a6f78'>" +
            esc(p.category) +
            "</span></td><td>" +
            rs(p.price) +
            "</td><td>" +
            (p.available === false
              ? "<span class='pill s-cancelled'>hidden</span>"
              : "<span class='pill s-delivered'>live</span>") +
            "</td><td><div class='row-actions'>" +
            "<button class='btn btn-sm btn-ghost' data-edit='" +
            p.id +
            "'>Edit</button>" +
            "<button class='btn btn-sm btn-danger' data-del='" +
            p.id +
            "'>Delete</button>" +
            "</div></td></tr>"
          );
        })
        .join("");
      body.innerHTML =
        "<table><thead><tr><th></th><th>Product</th><th>Price</th><th>Status</th><th></th></tr></thead><tbody>" +
        rows +
        "</tbody></table>";

      window.__products = d.products;
      body.querySelectorAll("[data-edit]").forEach(function (b) {
        b.addEventListener("click", function () {
          openProduct(b.getAttribute("data-edit"));
        });
      });
      body.querySelectorAll("[data-del]").forEach(function (b) {
        b.addEventListener("click", function () {
          if (!confirm("Delete this product?")) return;
          api("/api/products/" + b.getAttribute("data-del"), {
            method: "DELETE",
          }).then(function () {
            loadProducts();
            loadStats();
          });
        });
      });
    });
  }

  function loadUsers() {
    api("/api/admin/users").then(function (d) {
      var body = document.getElementById("users-body");
      if (!d.users.length) {
        body.innerHTML = '<div class="empty">No users.</div>';
        return;
      }
      var rows = d.users
        .map(function (u) {
          return (
            "<tr><td><strong>" +
            esc(u.name) +
            "</strong></td><td>" +
            esc(u.email) +
            "</td><td>" +
            esc(u.phone || "—") +
            "</td><td>" +
            (u.role === "admin"
              ? "<span class='pill s-preparing'>admin</span>"
              : "<span class='pill s-confirmed'>customer</span>") +
            "</td></tr>"
          );
        })
        .join("");
      body.innerHTML =
        "<table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr></thead><tbody>" +
        rows +
        "</tbody></table>";
    });
  }

  /* ── Product dialog ── */
  var dialog = document.getElementById("product-dialog");
  function openProduct(id) {
    var p = id
      ? (window.__products || []).find(function (x) {
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
        loadProducts();
        loadStats();
      })
      .catch(function (err) {
        document.getElementById("pd-msg").textContent = err.message;
      });
  });

  checkSession();
})();
