/**
 * Order Online — basket checkout with location / outlet picker (Uber/PickMe-style).
 */
(function () {
  "use strict";

  var KEY = "peoples-bakers-cart-v1";
  var COMPLETE_KEY = "pb-checkout-complete";
  var root = document.getElementById("checkout");
  if (!root) return;

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
  var currentStep = "cart";
  var STEP_ORDER = { cart: 0, details: 1, complete: 2 };
  var STEP_HASH = {
    cart: "#checkout",
    details: "#checkout-details",
    complete: "#checkout-complete",
  };

  function redirectToPayHere(checkout) {
    if (!checkout || !checkout.action || !checkout.fields || !checkout.fields.hash) {
      throw new Error("PayHere checkout could not start. Try again or choose Cash.");
    }
    var form = document.createElement("form");
    form.method = "POST";
    form.action = checkout.action;
    form.acceptCharset = "utf-8";
    form.style.display = "none";
    Object.keys(checkout.fields).forEach(function (key) {
      var input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = checkout.fields[key] == null ? "" : String(checkout.fields[key]);
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  function getPaymentMethod() {
    var picked = document.querySelector('input[name="c-payment"]:checked');
    return picked ? picked.value : "cod";
  }

  var paymentUiBound = false;

  function applyPayhereVisibility() {
    var opt = document.getElementById("co-payhere-option");
    if (opt) {
      opt.hidden = !payhereEnabled;
      if (payhereEnabled) opt.removeAttribute("hidden");
      else opt.setAttribute("hidden", "hidden");
    }
    if (!payhereEnabled) {
      var ph = document.getElementById("c-payhere");
      var cod = document.querySelector('input[name="c-payment"][value="cod"]');
      if (ph) ph.checked = false;
      if (cod) cod.checked = true;
    }
    updatePayLabel();
  }

  function setupPaymentUi() {
    applyPayhereVisibility();
    fetch("/api/config", { credentials: "same-origin" })
      .then(function (res) {
        return res.ok ? res.json() : {};
      })
      .then(function (cfg) {
        payhereEnabled = !!cfg.payhereEnabled;
        discountConfig = cfg;
        applyPayhereVisibility();
        if (!paymentUiBound) {
          paymentUiBound = true;
          document.querySelectorAll('input[name="c-payment"]').forEach(function (el) {
            el.addEventListener("change", updatePayLabel);
          });
        }
        setupDiscountBanner(cfg);
        refreshDiscountPreview();
      })
      .catch(function () {
        payhereEnabled = false;
        applyPayhereVisibility();
      });
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

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function setHidden(id, hidden) {
    var el = document.getElementById(id);
    if (el) el.hidden = !!hidden;
  }

  function setTotals(value) {
    setText("co-total", value);
    setText("co-summary-total", value);
  }

  function resetDiscountRows(subRow, discRow, hint) {
    if (subRow) subRow.hidden = true;
    if (discRow) discRow.hidden = true;
    setHidden("co-summary-subtotal-row", true);
    setHidden("co-summary-discount-row", true);
    if (hint) hint.hidden = true;
    setTotals(rs(basketSubtotal));
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
        setHidden("co-summary-subtotal-row", true);
        setHidden("co-summary-discount-row", true);
        setTotals(rs(basketSubtotal));
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
          var showSub = d.discount > 0 || d.reason === "min_order";
          var showDisc = d.applied && d.discount > 0;
          if (subRow) {
            subRow.hidden = !showSub;
            setText("co-subtotal", rs(d.subtotal));
          }
          setHidden("co-summary-subtotal-row", !showSub);
          setText("co-summary-subtotal", rs(d.subtotal));
          if (discRow) {
            discRow.hidden = !showDisc;
            if (showDisc) {
              setText("co-discount-label", d.label || "Phone discount");
              setText("co-discount", "− " + rs(d.discount));
            }
          }
          setHidden("co-summary-discount-row", !showDisc);
          if (showDisc) {
            setText("co-summary-discount-label", d.label || "Phone discount");
            setText("co-summary-discount", "− " + rs(d.discount));
          }
          setTotals(rs(d.total));
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
            } else if (phone && d.reason === "login_required") {
              hint.hidden = false;
              hint.className = "orderx-phone-hint is-warn";
              hint.textContent =
                "Sign in with your account to unlock the phone discount.";
            } else if (phone && d.reason === "phone_mismatch") {
              hint.hidden = false;
              hint.className = "orderx-phone-hint is-warn";
              hint.textContent =
                "Use the mobile number saved on your account to get the discount.";
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

  function applyI18nText(el, key, fallback) {
    if (!el) return;
    el.setAttribute("data-i18n", key);
    if (window.i18n && typeof window.i18n.t === "function") {
      var translated = window.i18n.t(key);
      el.textContent =
        translated && translated !== key ? translated : fallback;
    } else {
      el.textContent = fallback;
    }
  }

  function updatePayLabel() {
    var label = document.getElementById("co-submit-label");
    var hint = document.getElementById("co-payhere-hint");
    var trust = document.getElementById("co-trust-text");
    var isPayhere = getPaymentMethod() === "payhere";
    applyI18nText(
      label,
      isPayhere ? "order.page.pay_with_payhere" : "order.page.place_order",
      isPayhere ? "Pay with PayHere" : "Place order"
    );
    applyI18nText(
      trust,
      isPayhere ? "order.page.cox_trust_payhere" : "order.page.cox_trust",
      isPayhere
        ? "You will pay securely on PayHere. We mark the order paid only after the bank confirms."
        : "No payment needed now — we confirm on WhatsApp first."
    );
    if (hint) hint.hidden = !isPayhere;
  }

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(items) {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch (e) {}
    window.dispatchEvent(
      new CustomEvent("peoples-cart-changed", { detail: { items: items } })
    );
  }

  function setCartQty(id, qty) {
    var items = loadCart();
    var n = parseInt(qty, 10);
    if (isNaN(n) || n < 1) {
      items = items.filter(function (l) {
        return l.id !== id;
      });
    } else {
      items.forEach(function (l) {
        if (l.id === id) l.qty = n;
      });
    }
    saveCart(items);
  }

  function esc(s) {
    var d = document.createElement("div");
    d.textContent = s == null ? "" : String(s);
    return d.innerHTML;
  }

  function rs(n) {
    return "Rs. " + (Number(n) || 0).toLocaleString("en-LK");
  }

  function hasPricedLine(items) {
    return (items || []).some(function (it) {
      return (Number(it.amount) || 0) > 0;
    });
  }

  function setSubmitEnabled(on) {
    var submitBtn = document.querySelector("#co-form .orderx-checkout-submit");
    if (submitBtn) submitBtn.disabled = !on;
    var proceed = document.getElementById("co-proceed");
    if (proceed) proceed.disabled = !on;
  }

  function renderCartTable(items) {
    var wrap = document.getElementById("co-cart-lines");
    var list = items || [];
    if (!wrap) return;
    if (!list.length) {
      wrap.innerHTML = "";
      wrap.hidden = true;
      if (emptyEl) emptyEl.classList.remove("hidden");
      return;
    }
    wrap.hidden = false;
    if (emptyEl) emptyEl.classList.add("hidden");
    wrap.innerHTML = list
      .map(function (it) {
        var amt = Number(it.amount) || 0;
        var qty = it.qty || 1;
        var img = it.image
          ? '<img src="' +
            esc(it.image) +
            '" alt="" class="co-cart-img" loading="lazy" decoding="async">'
          : '<div class="co-cart-img co-cart-img--ph" aria-hidden="true"><i class="fa-solid fa-image"></i></div>';
        return (
          '<div class="co-cart-row" data-id="' +
          esc(it.id) +
          '">' +
          img +
          '<div class="co-cart-main">' +
          '<p class="co-cart-title">' +
          esc(it.title) +
          "</p>" +
          '<p class="co-cart-meta">' +
          (it.priceLabel ? esc(it.priceLabel) : amt ? rs(amt) : "") +
          "</p>" +
          '<div class="co-cart-controls">' +
          '<button type="button" class="cart-qty-btn" data-cart-dec="' +
          esc(it.id) +
          '" aria-label="Decrease quantity"><i class="fa-solid fa-minus"></i></button>' +
          '<span class="cart-qty-val">' +
          qty +
          "</span>" +
          '<button type="button" class="cart-qty-btn" data-cart-inc="' +
          esc(it.id) +
          '" aria-label="Increase quantity"><i class="fa-solid fa-plus"></i></button>' +
          '<button type="button" class="cart-remove-btn" data-cart-remove="' +
          esc(it.id) +
          '" aria-label="Remove item"><i class="fa-solid fa-trash-can"></i></button>' +
          "</div></div>" +
          '<div class="co-cart-sum">' +
          (amt ? rs(amt * qty) : "—") +
          "</div></div>"
        );
      })
      .join("");
  }

  function renderBasket(items) {
    var lines = document.getElementById("co-lines");
    var list = items || [];
    var total = 0;
    list.forEach(function (it) {
      total += (Number(it.amount) || 0) * (it.qty || 1);
    });
    if (lines) {
      if (!list.length) {
        lines.innerHTML =
          '<p class="orderx-checkout-basket-empty">Your basket is empty.</p>';
      } else {
        lines.innerHTML = list
          .map(function (it) {
            var amt = Number(it.amount) || 0;
            return (
              '<div class="orderx-checkout-line"><span>' +
              esc((it.qty || 1) + "× " + it.title) +
              "</span><span>" +
              (amt ? rs(amt * (it.qty || 1)) : "—") +
              "</span></div>"
            );
          })
          .join("");
      }
    }
    basketSubtotal = total;
    setTotals(rs(total));
    setSubmitEnabled(hasPricedLine(list));
    refreshDiscountPreview();
    return total;
  }

  function setCheckoutStep(step, opts) {
    opts = opts || {};
    var cartItems = loadCart();
    if (step === "details" && !hasPricedLine(cartItems)) step = "cart";
    if (step === "complete" && !opts.force) {
      var allowed = false;
      try {
        allowed = !!sessionStorage.getItem(COMPLETE_KEY);
      } catch (e) {}
      if (!allowed) step = "cart";
    }
    currentStep = step;
    ["cart", "details", "complete"].forEach(function (s) {
      var view = document.getElementById("co-view-" + s);
      if (!view) return;
      var on = s === step;
      view.hidden = !on;
      view.classList.toggle("is-active", on);
    });
    document.querySelectorAll(".co-stepper__item").forEach(function (item) {
      var s = item.getAttribute("data-co-goto");
      var idx = STEP_ORDER[s] || 0;
      var cur = STEP_ORDER[step] || 0;
      item.classList.toggle("is-active", s === step);
      item.classList.toggle("is-done", idx < cur);
      var btn = item.querySelector(".co-stepper__btn");
      if (!btn) return;
      if (s === step) btn.setAttribute("aria-current", "step");
      else btn.removeAttribute("aria-current");
      if (step === "complete") {
        btn.disabled = s !== "complete";
      } else {
        btn.disabled = s === "complete";
      }
    });
    var heading = document.getElementById("checkout-heading");
    var sub = document.getElementById("checkout-sub");
    if (step === "details") {
      applyI18nText(heading, "order.page.details_h2", "Checkout details");
      applyI18nText(
        sub,
        "order.page.details_sub",
        "Enter billing details, choose payment, and place your order."
      );
    } else if (step === "complete") {
      applyI18nText(heading, "order.page.complete_h2", "Order complete");
      applyI18nText(
        sub,
        "order.page.complete_sub",
        "Thank you — your order is in."
      );
    } else {
      applyI18nText(heading, "order.page.cart_h2", "Shopping cart");
      applyI18nText(
        sub,
        "order.page.cart_sub",
        "Review your items, then continue to billing and payment."
      );
    }
    if (!opts.fromHash) {
      var hash = STEP_HASH[step] || "#checkout";
      if (history.replaceState) {
        history.replaceState(null, "", hash);
      } else {
        location.hash = hash.slice(1);
      }
    }
    if (!opts.skipScroll && root) {
      root.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function stepFromHash() {
    var h = (location.hash || "").replace(/^#/, "");
    if (h === "checkout-details") return "details";
    if (h === "checkout-complete") return "complete";
    return "cart";
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
    if (currentStep === "complete") {
      return cartItems;
    }
    renderCartTable(cartItems);
    renderBasket(cartItems);
    if (!cartItems.length && currentStep === "details") {
      setCheckoutStep("cart", { skipScroll: true });
    }
    return cartItems;
  }

  var items = refreshCheckoutCart();
  loadAllOutlets();
    setupPaymentUi();
    window.addEventListener("i18n:languageChanged", function () {
      updatePayLabel();
      setCheckoutStep(currentStep, { skipScroll: true, fromHash: true });
    });
    window.addEventListener("i18n:ready", updatePayLabel);

    var whenEl = document.getElementById("c-when");
    if (whenEl) {
      var now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      whenEl.min = now.toISOString().slice(0, 16);
    }

    var initialStep = stepFromHash();
    if (initialStep === "complete") {
      var ok = false;
      try {
        ok = !!sessionStorage.getItem(COMPLETE_KEY);
      } catch (e) {}
      if (!ok) initialStep = "cart";
    }
    setCheckoutStep(initialStep, { skipScroll: true, force: initialStep === "complete" });

    if (/^#checkout/.test(location.hash)) {
      setTimeout(function () {
        if (root) root.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    }

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

    var locBtn = document.getElementById("co-use-location");
    if (locBtn) locBtn.addEventListener("click", useMyLocation);

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

    window.addEventListener("hashchange", function () {
      setCheckoutStep(stepFromHash(), { fromHash: true, skipScroll: true });
    });

    document.getElementById("co-stepper") &&
      document.getElementById("co-stepper").addEventListener("click", function (e) {
        var btn = e.target.closest("[data-co-goto]");
        if (!btn || btn.disabled) return;
        var next = btn.getAttribute("data-co-goto");
        if (next === "complete" && currentStep !== "complete") return;
        if (next === "details" && !hasPricedLine(loadCart())) return;
        if (currentStep === "complete") return;
        setCheckoutStep(next);
      });

    var proceedBtn = document.getElementById("co-proceed");
    if (proceedBtn) {
      proceedBtn.addEventListener("click", function () {
        var hint = document.getElementById("co-proceed-hint");
        if (!hasPricedLine(loadCart())) {
          if (hint) {
            hint.hidden = false;
            hint.className = "orderx-checkout-msg err";
            applyI18nText(
              hint,
              "order.page.proceed_hint",
              "Add items to your basket before checkout."
            );
          }
          return;
        }
        if (hint) {
          hint.hidden = true;
          hint.textContent = "";
        }
        setCheckoutStep("details");
      });
    }

    var backBtn = document.getElementById("co-back-cart");
    if (backBtn) {
      backBtn.addEventListener("click", function () {
        setCheckoutStep("cart");
      });
    }

    var cartLines = document.getElementById("co-cart-lines");
    if (cartLines) {
      cartLines.addEventListener("click", function (e) {
        var inc = e.target.closest("[data-cart-inc]");
        var dec = e.target.closest("[data-cart-dec]");
        var rem = e.target.closest("[data-cart-remove]");
        if (inc) {
          var idI = inc.getAttribute("data-cart-inc");
          var lineI = loadCart().find(function (l) {
            return l.id === idI;
          });
          if (lineI) setCartQty(idI, (lineI.qty || 1) + 1);
        } else if (dec) {
          var idD = dec.getAttribute("data-cart-dec");
          var lineD = loadCart().find(function (l) {
            return l.id === idD;
          });
          if (lineD) setCartQty(idD, (lineD.qty || 1) - 1);
        } else if (rem) {
          setCartQty(rem.getAttribute("data-cart-remove"), 0);
        }
      });
    }

    var checkoutForm = document.getElementById("co-form");
    if (!checkoutForm) return;
    checkoutForm.addEventListener("submit", function (e) {
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
        area: areaInput ? areaInput.value.trim() : "",
        mode: modeSelect ? modeSelect.value : "",
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
      var whenInput = document.getElementById("c-when");
      if (whenInput && whenInput.value) {
        notesParts.push("When: " + whenInput.value.replace("T", " "));
      }
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
      if (submitBtn) submitBtn.disabled = true;

      var usePayhere = getPaymentMethod() === "payhere";
      if (usePayhere && !payhereEnabled) {
        msg.textContent = "Online payment is not available. Choose Cash instead.";
        msg.classList.add("err");
        if (submitBtn) submitBtn.disabled = false;
        return;
      }
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
          if (usePayhere) {
            if (!d.payhere) {
              throw new Error("PayHere checkout could not start. Try again or choose Cash.");
            }
            try {
              sessionStorage.setItem("pb-payhere-pending", d.order.id);
            } catch (err) {}
            redirectToPayHere(d.payhere);
            return;
          }
          try {
            sessionStorage.setItem(COMPLETE_KEY, "1");
          } catch (err) {}
          setCheckoutStep("complete", { force: true });
          try {
            localStorage.setItem(KEY, "[]");
          } catch (err) {}
          window.dispatchEvent(
            new CustomEvent("peoples-cart-changed", { detail: { items: [] } })
          );
          var refEl = document.getElementById("co-ref");
          if (refEl) {
            refEl.textContent = "#" + d.order.id.slice(-6).toUpperCase();
          }
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
          var checkoutRoot = document.getElementById("checkout");
          if (checkoutRoot) checkoutRoot.scrollIntoView({ behavior: "smooth", block: "start" });
        })
        .catch(function (err) {
          var hint =
            err && err.message && /failed to fetch|network/i.test(String(err.message))
              ? " — check your connection and that the site server is running."
              : "";
          msg.textContent = (err && err.message ? err.message : "Checkout failed.") + hint;
          msg.classList.add("err");
          if (submitBtn) submitBtn.disabled = false;
        });
    });
})();
