/**
 * Order Online — basket checkout with location / outlet picker (Uber/PickMe-style).
 */
(function () {
  "use strict";

  var KEY = "peoples-bakers-cart-v1";
  var grid = document.getElementById("co-grid");
  if (!grid) return;

  var emptyEl = document.getElementById("co-empty");
  var successEl = document.getElementById("co-success");
  var areaInput = document.getElementById("c-area");
  var outletSelect = document.getElementById("c-outlet");
  var suggestEl = document.getElementById("co-suggest");
  var locResult = document.getElementById("co-loc-result");
  var modeSelect = document.getElementById("c-mode");
  var suggestTimer;
  var payhereEnabled = false;
  var discountConfig = { phoneDiscountEnabled: false };
  var basketSubtotal = 0;
  var discountTimer;

  function redirectToPayHere(checkout) {
    var form = document.createElement("form");
    form.method = "POST";
    form.action = checkout.action;
    form.style.display = "none";
    Object.keys(checkout.fields).forEach(function (key) {
      var input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = checkout.fields[key];
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  function getPaymentMethod() {
    var picked = document.querySelector('input[name="c-payment"]:checked');
    return picked ? picked.value : "cod";
  }

  function setupPaymentUi() {
    fetch("/api/config", { credentials: "same-origin" })
      .then(function (res) {
        return res.ok ? res.json() : {};
      })
      .then(function (cfg) {
        payhereEnabled = !!cfg.payhereEnabled;
        discountConfig = cfg;
        var opt = document.getElementById("co-payhere-option");
        if (payhereEnabled && opt) opt.hidden = false;
        document.querySelectorAll('input[name="c-payment"]').forEach(function (el) {
          el.addEventListener("change", updatePayLabel);
        });
        updatePayLabel();
        setupDiscountBanner(cfg);
        refreshDiscountPreview();
      })
      .catch(function () {});
  }

  function setupDiscountBanner(cfg) {
    var banner = document.getElementById("co-discount-banner");
    var text = document.getElementById("co-discount-banner-text");
    if (!banner || !text || !cfg.phoneDiscountEnabled) return;
    text.textContent =
      cfg.phoneDiscountHint ||
      "Add a valid mobile number for " +
        cfg.phoneDiscountPercent +
        "% off orders over Rs. " +
        (cfg.phoneDiscountMin || 0).toLocaleString("en-LK") +
        ".";
    banner.hidden = false;
  }

  function updateDiscountBanner(d, phone) {
    var banner = document.getElementById("co-discount-banner");
    if (!banner || !discountConfig.phoneDiscountEnabled) return;
    if (d && d.applied) {
      banner.hidden = true;
      return;
    }
    if (phone && d && d.reason !== "invalid_phone") {
      banner.hidden = false;
    }
  }

  function resetDiscountRows(subRow, discRow, hint) {
    if (subRow) subRow.hidden = true;
    if (discRow) discRow.hidden = true;
    if (hint) hint.hidden = true;
    document.getElementById("co-total").textContent = rs(basketSubtotal);
  }

  function refreshDiscountPreview() {
    clearTimeout(discountTimer);
    discountTimer = setTimeout(function () {
      var phoneEl = document.getElementById("c-phone");
      var phone = phoneEl ? phoneEl.value.trim() : "";
      var hint = document.getElementById("co-phone-hint");
      var subRow = document.getElementById("co-subtotal-row");
      var discRow = document.getElementById("co-discount-row");

      if (!discountConfig.phoneDiscountEnabled || basketSubtotal <= 0) {
        if (subRow) subRow.hidden = true;
        if (discRow) discRow.hidden = true;
        document.getElementById("co-total").textContent = rs(basketSubtotal);
        if (hint) hint.hidden = true;
        return;
      }

      fetch(
        "/api/discount/preview?subtotal=" +
          encodeURIComponent(basketSubtotal) +
          "&phone=" +
          encodeURIComponent(phone),
        { credentials: "same-origin" }
      )
        .then(function (res) {
          return res.ok ? res.json() : null;
        })
        .then(function (d) {
          if (!d) {
            resetDiscountRows(subRow, discRow, hint);
            return;
          }
          updateDiscountBanner(d, phone);
          if (subRow) {
            subRow.hidden = !(d.discount > 0 || d.reason === "min_order");
            document.getElementById("co-subtotal").textContent = rs(d.subtotal);
          }
          if (discRow) {
            discRow.hidden = !(d.applied && d.discount > 0);
            if (d.applied && d.discount > 0) {
              document.getElementById("co-discount-label").textContent =
                d.label || "Phone discount";
              document.getElementById("co-discount").textContent =
                "− " + rs(d.discount);
            }
          }
          document.getElementById("co-total").textContent = rs(d.total);
          if (hint) {
            if (d.applied) {
              hint.hidden = false;
              hint.className = "orderx-phone-hint is-ok";
              hint.textContent =
                "Discount applied — you save " + rs(d.discount) + ".";
            } else if (phone && d.reason === "invalid_phone") {
              hint.hidden = false;
              hint.className = "orderx-phone-hint is-warn";
              hint.textContent =
                "Use a valid Sri Lankan mobile (e.g. 0771234567) for the discount.";
            } else if (phone && d.reason === "min_order") {
              hint.hidden = false;
              hint.className = "orderx-phone-hint is-warn";
              hint.textContent =
                "Discount applies on orders over Rs. " +
                (d.minSubtotal || discountConfig.phoneDiscountMin || 0).toLocaleString(
                  "en-LK"
                ) +
                ".";
            } else {
              hint.hidden = true;
            }
          }
        })
        .catch(function () {
          resetDiscountRows(subRow, discRow, hint);
        });
    }, 180);
  }

  function updatePayLabel() {
    var label = document.getElementById("co-submit-label");
    var hint = document.getElementById("co-payhere-hint");
    var isPayhere = getPaymentMethod() === "payhere";
    if (label) {
      label.textContent = isPayhere ? "Pay with PayHere" : "Place order";
    }
    if (hint) hint.hidden = !isPayhere;
  }

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function rs(n) {
    return "Rs. " + (Number(n) || 0).toLocaleString("en-LK");
  }

  function renderBasket(items) {
    var total = 0;
    document.getElementById("co-lines").innerHTML = items
      .map(function (it) {
        var amt = Number(it.amount) || 0;
        total += amt * (it.qty || 1);
        return (
          '<div class="orderx-checkout-line"><span>' +
          esc((it.qty || 1) + "× " + it.title) +
          '</span><span>' +
          (amt ? rs(amt * (it.qty || 1)) : "—") +
          "</span></div>"
        );
      })
      .join("");
    document.getElementById("co-total").textContent = rs(total);
    basketSubtotal = total;
    refreshDiscountPreview();
    return total;
  }

  function showLocResult(html, ok) {
    if (!locResult) return;
    locResult.hidden = false;
    locResult.className = "orderx-loc-result" + (ok ? " is-ok" : " is-warn");
    locResult.innerHTML = html;
  }

  function fillOutlets(outlets, selectedId) {
    if (!outletSelect || !outlets.length) {
      if (outletSelect) {
        outletSelect.innerHTML = '<option value="">No outlets found — type your area</option>';
      }
      return;
    }
    outletSelect.innerHTML =
      '<option value="">Choose outlet (optional)</option>' +
      outlets
        .map(function (o) {
          var label =
            (o.area || o.name || "Outlet") +
            (o.distanceKm != null ? " · " + o.distanceKm.toFixed(1) + " km" : "");
          return (
            '<option value="' +
            esc(o.id) +
            '"' +
            (o.id === selectedId ? " selected" : "") +
            ">" +
            esc(label) +
            "</option>"
          );
        })
        .join("");
  }

  function loadAllOutlets() {
    return fetch("/api/outlets?limit=80&sort=area")
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        fillOutlets(data.outlets || []);
        return data.outlets || [];
      })
      .catch(function () {
        if (outletSelect) {
          outletSelect.innerHTML =
            '<option value="">Could not load outlets — enter area manually</option>';
        }
        return [];
      });
  }

  function selectOutletByArea(area) {
    if (!area || !outletSelect) return;
    var q = area.split(",")[0].trim();
    return fetch("/api/outlets?q=" + encodeURIComponent(q) + "&limit=5")
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        var list = data.outlets || [];
        if (list.length) {
          fillOutlets(list, list[0].id);
          showLocResult(
            '<i class="fa-solid fa-store"></i> Nearest match: <strong>' +
              esc(list[0].area || list[0].name) +
              "</strong>" +
              (list[0].address ? " — " + esc(list[0].address) : ""),
            true
          );
        }
      })
      .catch(function () {});
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      showLocResult('<i class="fa-solid fa-circle-info"></i> Location not supported in this browser.', false);
      return;
    }
    var btn = document.getElementById("co-use-location");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Locating…';
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        var lat = pos.coords.latitude;
        var lng = pos.coords.longitude;
        fetch(
          "/api/outlets/nearby?lat=" +
            encodeURIComponent(lat) +
            "&lng=" +
            encodeURIComponent(lng) +
            "&radius=40&limit=8"
        )
          .then(function (res) {
            return res.json();
          })
          .then(function (data) {
            var list = data.outlets || [];
            if (!list.length) {
              showLocResult(
                '<i class="fa-solid fa-circle-info"></i> No outlet nearby — try typing your town or use Uber Eats / PickMe.',
                false
              );
              return;
            }
            var nearest = list[0];
            if (areaInput) areaInput.value = nearest.area || nearest.name || "";
            fillOutlets(list, nearest.id);
            showLocResult(
              '<i class="fa-solid fa-location-dot"></i> <strong>' +
                esc(nearest.area || nearest.name) +
                "</strong> is closest" +
                (nearest.distanceKm != null
                  ? " (" + nearest.distanceKm.toFixed(1) + " km away)"
                  : "") +
                ".",
              true
            );
          })
          .catch(function () {
            showLocResult('<i class="fa-solid fa-circle-info"></i> Could not find nearby outlets.', false);
          })
          .finally(resetLocBtn);
      },
      function () {
        showLocResult(
          '<i class="fa-solid fa-circle-info"></i> Allow location access or type your area manually.',
          false
        );
        resetLocBtn();
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
    );
  }

  function resetLocBtn() {
    var btn = document.getElementById("co-use-location");
    if (!btn) return;
    btn.disabled = false;
    btn.innerHTML =
      '<i class="fa-solid fa-location-crosshairs"></i> My location';
  }

  function loadSuggestions(q) {
    if (!suggestEl || q.length < 2) {
      if (suggestEl) suggestEl.hidden = true;
      return;
    }
    fetch("/api/outlets/suggest?q=" + encodeURIComponent(q))
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        var items = data.suggestions || [];
        if (!items.length) {
          suggestEl.hidden = true;
          return;
        }
        suggestEl.innerHTML = items
          .map(function (item) {
            return (
              '<li role="option"><button type="button" data-area="' +
              esc(item.area) +
              '" data-id="' +
              esc(item.id) +
              '"><strong>' +
              esc(item.area) +
              "</strong><span>" +
              esc(item.region || "") +
              " · " +
              esc(item.type || "Outlet") +
              "</span></button></li>"
            );
          })
          .join("");
        suggestEl.hidden = false;
      })
      .catch(function () {
        suggestEl.hidden = true;
      });
  }

  function updateModeUi() {
    var pickup = modeSelect && modeSelect.value.indexOf("Pickup") === 0;
    var hint = document.getElementById("co-outlet-hint");
    if (hint) {
      hint.textContent = pickup
        ? "Select the branch you will collect from."
        : "We route delivery to the closest branch for your area.";
    }
    if (areaInput) {
      areaInput.placeholder = pickup
        ? "Your town — e.g. Kandy (to find pickup branch)"
        : "Delivery area — e.g. Nugegoda, Colombo";
    }
  }

  function refreshCheckoutCart() {
    var cartItems = loadCart();
    if (!cartItems.length) {
      grid.classList.add("hidden");
      if (emptyEl) emptyEl.classList.remove("hidden");
      return cartItems;
    }
    grid.classList.remove("hidden");
    if (emptyEl) emptyEl.classList.add("hidden");
    renderBasket(cartItems);
    refreshDiscountPreview();
    return cartItems;
  }

  var items = refreshCheckoutCart();
  if (!items.length) {
    /* empty — basket hidden */
  } else {
    loadAllOutlets();
    setupPaymentUi();

    fetch("/api/auth/me", { credentials: "same-origin" })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        if (!data || !data.user) return;
        var u = data.user;
        if (u.name) document.getElementById("c-name").value = u.name;
        if (u.email) document.getElementById("c-email").value = u.email;
        if (u.phone) document.getElementById("c-phone").value = u.phone;
        refreshDiscountPreview();
      })
      .catch(function () {});

    var phoneInput = document.getElementById("c-phone");
    if (phoneInput) {
      phoneInput.addEventListener("input", refreshDiscountPreview);
      phoneInput.addEventListener("blur", refreshDiscountPreview);
    }

    if (location.hash === "#checkout") {
      setTimeout(function () {
        document.getElementById("checkout").scrollIntoView({ behavior: "smooth" });
      }, 120);
    }

    document.getElementById("co-use-location").addEventListener("click", useMyLocation);

    if (modeSelect) {
      modeSelect.addEventListener("change", updateModeUi);
      updateModeUi();
    }

    if (areaInput) {
      areaInput.addEventListener("input", function () {
        clearTimeout(suggestTimer);
        var q = areaInput.value.trim();
        suggestTimer = setTimeout(function () {
          loadSuggestions(q);
        }, 220);
        if (q.length >= 2) selectOutletByArea(q);
      });
      areaInput.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && suggestEl) suggestEl.hidden = true;
      });
    }

    if (suggestEl) {
      suggestEl.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-area]");
        if (!btn || !areaInput) return;
        areaInput.value = btn.getAttribute("data-area") || "";
        var id = btn.getAttribute("data-id");
        if (id && outletSelect) outletSelect.value = id;
        suggestEl.hidden = true;
        selectOutletByArea(areaInput.value);
      });
    }

    document.addEventListener("click", function (e) {
      if (!suggestEl || !areaInput) return;
      if (e.target.closest(".orderx-checkout-field--loc")) return;
      suggestEl.hidden = true;
    });

    window.addEventListener("peoples-cart-changed", function () {
      refreshCheckoutCart();
    });

    document.getElementById("co-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = document.getElementById("co-msg");
      msg.textContent = "";
      msg.className = "orderx-checkout-msg";

      var outletOpt =
        outletSelect && outletSelect.selectedIndex > 0
          ? outletSelect.options[outletSelect.selectedIndex]
          : null;
      var outletLabel = outletOpt ? outletOpt.textContent : "";

      var customer = {
        name: document.getElementById("c-name").value.trim(),
        phone: document.getElementById("c-phone").value.trim(),
        email: document.getElementById("c-email").value.trim(),
        area: areaInput.value.trim(),
        mode: modeSelect.value,
      };

      if (!customer.name || !customer.phone) {
        msg.textContent = "Name and phone are required.";
        msg.classList.add("err");
        return;
      }
      if (!customer.area) {
        msg.textContent = "Please enter your area or use My location.";
        msg.classList.add("err");
        return;
      }

      var notesParts = [document.getElementById("c-notes").value.trim()];
      if (outletLabel) notesParts.push("Outlet: " + outletLabel);
      if (outletSelect && outletSelect.value) notesParts.push("Outlet ID: " + outletSelect.value);

      items = loadCart();
      if (!items.length) {
        msg.textContent = "Your basket is empty. Add items before checkout.";
        msg.classList.add("err");
        return;
      }
      renderBasket(items);

      var payload = {
        items: items.map(function (it) {
          return {
            id: it.id,
            title: it.title,
            qty: it.qty || 1,
            price: Number(it.amount) || 0,
          };
        }),
        customer: customer,
        notes: notesParts.filter(Boolean).join(" | "),
      };

      var submitBtn = e.target.querySelector(".orderx-checkout-submit");
      submitBtn.disabled = true;

      var usePayhere = getPaymentMethod() === "payhere";
      var endpoint = usePayhere ? "/api/payments/payhere/checkout" : "/api/orders";

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json().then(function (d) {
            if (!res.ok) throw new Error(d.error || "Failed");
            return d;
          });
        })
        .then(function (d) {
          if (usePayhere && d.payhere) {
            try {
              localStorage.setItem(KEY, "[]");
            } catch (err) {}
            window.dispatchEvent(
              new CustomEvent("peoples-cart-changed", { detail: { items: [] } })
            );
            redirectToPayHere(d.payhere);
            return;
          }
          try {
            localStorage.setItem(KEY, "[]");
          } catch (err) {}
          window.dispatchEvent(new CustomEvent("peoples-cart-changed", { detail: { items: [] } }));
          grid.classList.add("hidden");
          successEl.classList.remove("hidden");
          document.getElementById("co-ref").textContent =
            "#" + d.order.id.slice(-6).toUpperCase();
          document.getElementById("co-success-links").innerHTML =
            '<a href="account.html#orders">View in My Orders</a> · <a href="index.html">Back to home</a>';
          var lines = items
            .map(function (it) {
              return (it.qty || 1) + "x " + it.title;
            })
            .join(", ");
          var waText =
            "Hi Peoples Bakers, I placed order " +
            d.order.id.slice(-6).toUpperCase() +
            ": " +
            lines +
            ". Name: " +
            customer.name +
            ", Phone: " +
            customer.phone +
            ", " +
            customer.mode +
            " — " +
            customer.area +
            (outletLabel ? ", " + outletLabel : "") +
            ".";
          document.getElementById("co-wa").href =
            "https://wa.me/" +
            (window.PB_CONTACT && window.PB_CONTACT.whatsappNumber
              ? window.PB_CONTACT.whatsappNumber
              : "947228955477") +
            "?text=" +
            encodeURIComponent(waText);
          successEl.scrollIntoView({ behavior: "smooth" });
        })
        .catch(function (err) {
          msg.textContent = err.message + " — is the server running at localhost:3000?";
          msg.classList.add("err");
          submitBtn.disabled = false;
        });
    });
  }
})();
