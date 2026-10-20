/**
 * Products page — P&S-style category hub, then browse (Breads, Sweets, Savory, Cookies, Drinks).
 */
(function () {
  if (window.location.hash === "#cakes") {
    window.location.replace("cakes.html");
    return;
  }

  var hub = document.getElementById("products-cat-hub");
  var browse = document.getElementById("products-cat-browse");
  var backBtn = document.getElementById("products-cat-back");
  var tiles = document.querySelectorAll("[data-products-cat]");
  var buttons = document.querySelectorAll(".product-toolbar--categories .product-filter");
  if (!hub || !browse || !buttons.length) return;

  var cards = document.querySelectorAll(".products-catalog-section .product-card");
  var productGrid = document.querySelector(".products-page-grid");
  var pageNote = document.querySelector(".products-page-note--after-grid");
  var breadZone = document.getElementById("breads");
  var sweetZone = document.getElementById("sweets");
  var savoryZone = document.getElementById("savory");
  var cookiesZone = document.getElementById("cookies");
  var drinksZone = document.getElementById("drinks");
  var cookieTiles = document.querySelectorAll(".products-cookie-tile");
  var searchInput = document.getElementById("products-search");
  var searchClear = document.getElementById("products-search-clear");
  var searchStatus = document.getElementById("products-search-status");
  var viewHub = true;
  var currentFilter = "all";
  var searchQuery = "";
  var chromeHideLockedUntil = 0;

  var hashMap = {
    "#all": "all",
    "#breads": "breads",
    "#sweets": "sweets",
    "#savory": "savory",
    "#cookies": "cookies",
    "#drinks": "drinks",
  };

  function cardSearchText(card) {
    return String(card.textContent || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function matchesSearch(card) {
    if (!searchQuery) return true;
    return cardSearchText(card).indexOf(searchQuery) !== -1;
  }

  function setZoneVisible(el, show) {
    if (!el) return;
    el.hidden = !show;
    el.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function scrollToEl(el) {
    if (!el) return;
    var reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.requestAnimationFrame(function () {
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  }

  function countVisibleCards() {
    var n = 0;
    cards.forEach(function (card) {
      if (!card.hidden && card.style.display !== "none") n++;
    });
    return n;
  }

  function updateSearchStatus(visibleCards) {
    if (!searchStatus) return;
    if (!searchQuery) {
      searchStatus.hidden = true;
      searchStatus.textContent = "";
      return;
    }
    searchStatus.hidden = false;
    if (visibleCards === 0) {
      searchStatus.textContent = 'No products match "' + searchQuery + '".';
    } else {
      searchStatus.textContent = visibleCards + ' result(s) for "' + searchQuery + '".';
    }
  }

  function setHash(filter, isHub) {
    var path = window.location.pathname + window.location.search;
    if (isHub) {
      if (window.location.hash) history.replaceState(null, "", path);
      return;
    }
    var next = filter && filter !== "all" ? "#" + filter : "#all";
    if (window.location.hash !== next) history.replaceState(null, "", path + next);
  }

  function applyFilters(opts) {
    opts = opts || {};
    var isAll = currentFilter === "all";
    var isBreads = currentFilter === "breads";
    var isSweets = currentFilter === "sweets";
    var isSavory = currentFilter === "savory";
    var isCookies = currentFilter === "cookies";
    var isDrinks = currentFilter === "drinks";
    var hasSearch = searchQuery.length > 0;
    var showHub = viewHub && !hasSearch;

    buttons.forEach(function (b) {
      var match = b.getAttribute("data-filter") === currentFilter;
      b.classList.toggle("is-active", match);
      b.setAttribute("aria-selected", match ? "true" : "false");
    });

    tiles.forEach(function (tile) {
      tile.classList.toggle("is-active", tile.getAttribute("data-products-cat") === currentFilter);
    });

    document.body.classList.toggle("is-products-hub", showHub);
    document.body.classList.toggle("is-products-browse", !showHub);
    if (showHub) document.body.classList.remove("is-browse-chrome-hidden");
    document.body.classList.toggle("is-breads-focus", !showHub && isBreads);
    document.body.classList.toggle("is-sweets-focus", !showHub && isSweets);
    document.body.classList.toggle("is-savory-focus", !showHub && isSavory);
    document.body.classList.toggle("is-cookies-focus", !showHub && isCookies);
    if (showHub || !isCookies) {
      var priceWrap = document.getElementById("cookie-price-list-wrap");
      var pricePanel = document.getElementById("cookie-price-list");
      var priceBtn = document.getElementById("cookie-price-list-btn");
      if (priceWrap) priceWrap.classList.remove("is-open");
      if (pricePanel) pricePanel.hidden = true;
      if (priceBtn) priceBtn.setAttribute("aria-expanded", "false");
    }
    document.body.classList.toggle("is-drinks-focus", !showHub && isDrinks);
    document.body.classList.toggle("is-products-filter-all", !showHub && isAll);
    document.body.classList.toggle("is-products-search-active", hasSearch);
    document.body.setAttribute("data-product-filter", showHub ? "hub" : currentFilter);

    setZoneVisible(hub, showHub);
    setZoneVisible(browse, !showHub);

    if (showHub) {
      updateSearchStatus(0);
      return;
    }

    setZoneVisible(breadZone, (isAll || isBreads) && !hasSearch);
    setZoneVisible(sweetZone, (isAll || isSweets) && !hasSearch);
    setZoneVisible(savoryZone, (isAll || isSavory) && !hasSearch);
    setZoneVisible(drinksZone, (isAll || isDrinks) && !hasSearch);

    var cookieCatOk = isAll || isCookies;
    var cookieMatches = 0;
    cookieTiles.forEach(function (tile) {
      var show = cookieCatOk && matchesSearch(tile);
      tile.hidden = !show;
      tile.style.display = show ? "" : "none";
      if (show) cookieMatches++;
    });
    setZoneVisible(cookiesZone, cookieCatOk && (!hasSearch || cookieMatches > 0));

    cards.forEach(function (card) {
      var cat = card.getAttribute("data-category") || "";
      var catOk = isAll || cat === currentFilter;
      var show = catOk && matchesSearch(card);
      card.style.display = show ? "" : "none";
      card.hidden = !show;
    });

    var visible = countVisibleCards();
    if (productGrid) {
      productGrid.hidden = visible === 0;
      productGrid.setAttribute("aria-hidden", visible === 0 ? "true" : "false");
    }
    if (pageNote) {
      pageNote.hidden = visible === 0 && !isCookies;
    }

    updateSearchStatus(visible + (hasSearch ? cookieMatches : 0));

    if (opts.skipScroll) return;

    chromeHideLockedUntil = Date.now() + 700;
    document.body.classList.remove("is-browse-chrome-hidden");

    if (hasSearch && (visible > 0 || cookieMatches > 0)) {
      if (cookieMatches > 0 && visible === 0) scrollToEl(browse);
      else if (productGrid) scrollToEl(productGrid);
    } else if (isSavory) scrollToEl(savoryZone || browse);
    else if (isCookies) scrollToEl(browse);
    else if (isSweets) scrollToEl(sweetZone || browse);
    else if (isBreads) scrollToEl(breadZone || browse);
    else if (isDrinks) scrollToEl(drinksZone || productGrid || browse);
    else scrollToEl(browse);
  }

  function showHub() {
    viewHub = true;
    currentFilter = "all";
    searchQuery = "";
    if (searchInput) searchInput.value = "";
    if (searchClear) searchClear.hidden = true;
    setHash("all", true);
    applyFilters({ skipScroll: true });
    scrollToEl(document.getElementById("products-menu") || hub);
  }

  function showCategory(filter, opts) {
    viewHub = false;
    currentFilter = filter || "all";
    setHash(currentFilter, false);
    applyFilters(opts);
  }

  function applySearch(value) {
    searchQuery = String(value || "")
      .toLowerCase()
      .trim();
    if (searchClear) searchClear.hidden = !searchQuery;
    if (searchQuery && viewHub) {
      viewHub = false;
      currentFilter = "all";
    }
    applyFilters({ skipScroll: !searchQuery });
  }

  tiles.forEach(function (tile) {
    tile.addEventListener("click", function () {
      showCategory(tile.getAttribute("data-products-cat"));
    });
  });

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      showCategory(btn.getAttribute("data-filter"));
    });
  });

  if (backBtn) {
    backBtn.addEventListener("click", showHub);
  }

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      applySearch(searchInput.value);
    });
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        searchInput.value = "";
        applySearch("");
        showHub();
      }
    });
  }

  if (searchClear) {
    searchClear.addEventListener("click", function () {
      if (searchInput) searchInput.value = "";
      applySearch("");
      if (searchInput) searchInput.focus();
    });
  }

  function applyHashFilter(opts) {
    var f = hashMap[window.location.hash];
    if (f) {
      showCategory(f, opts || { skipScroll: true });
      if (!opts || !opts.skipScroll) {
        window.setTimeout(function () {
          applyFilters();
        }, 80);
      }
    } else {
      viewHub = true;
      currentFilter = "all";
      applyFilters({ skipScroll: true });
    }
  }

  applyHashFilter({ skipScroll: true });
  window.addEventListener("hashchange", function () {
    if (window.location.hash === "#cakes") {
      window.location.replace("cakes.html");
      return;
    }
    applyHashFilter({ skipScroll: false });
  });

  /* ── Drink cards: hover preview (comes forward) ── */
  var drinkPreview = (function () {
    var overlay = null;
    var imgEl, badgeEl, titleEl, descEl, priceEl, actionsEl, dialogEl;
    var originCard = null;
    var closeTimer = null;
    var hideTimer = null;
    var closeGen = 0;
    var onDocMove = null;

    function build() {
      if (overlay) return;
      overlay = document.createElement("div");
      overlay.className = "pb-drink-preview";
      overlay.hidden = true;
      overlay.innerHTML =
        '<div class="pb-drink-preview__veil" aria-hidden="true"></div>' +
        '<div class="pb-drink-preview__dialog" role="dialog" aria-labelledby="pb-dp-title">' +
          '<button type="button" class="pb-drink-preview__close" data-dp-close aria-label="Close">' +
            '<i class="fa-solid fa-xmark" aria-hidden="true"></i>' +
          "</button>" +
          '<div class="pb-drink-preview__media">' +
            '<span class="pb-drink-preview__media-glow" aria-hidden="true"></span>' +
            '<img id="pb-dp-img" src="" alt="" decoding="async">' +
          "</div>" +
          '<div class="pb-drink-preview__body">' +
            '<p class="pb-drink-preview__kicker"><i class="fa-solid fa-snowflake" aria-hidden="true"></i> Chilled &amp; ready</p>' +
            '<span class="pb-drink-preview__badge" id="pb-dp-badge" hidden></span>' +
            '<h3 class="pb-drink-preview__title" id="pb-dp-title"></h3>' +
            '<p class="pb-drink-preview__desc" id="pb-dp-desc"></p>' +
            '<p class="pb-drink-preview__price" id="pb-dp-price"></p>' +
            '<div class="pb-drink-preview__actions" id="pb-dp-actions">' +
              '<a class="pb-drink-preview__order" href="order.html">' +
                '<i class="fa-solid fa-motorcycle" aria-hidden="true"></i> Order options' +
              "</a>" +
            "</div>" +
          "</div>" +
        "</div>";
      document.body.appendChild(overlay);
      imgEl = overlay.querySelector("#pb-dp-img");
      badgeEl = overlay.querySelector("#pb-dp-badge");
      titleEl = overlay.querySelector("#pb-dp-title");
      descEl = overlay.querySelector("#pb-dp-desc");
      priceEl = overlay.querySelector("#pb-dp-price");
      actionsEl = overlay.querySelector("#pb-dp-actions");
      dialogEl = overlay.querySelector(".pb-drink-preview__dialog");
      overlay.addEventListener("click", function (e) {
        if (e.target.closest("[data-dp-close]")) close();
      });
    }

    function fill(card) {
      var titleNode = card.querySelector("h3");
      var descNode = card.querySelector(".product-card-desc");
      var priceNode = card.querySelector(".price");
      var badgeNode = card.querySelector(".product-card-badge");
      var img = card.querySelector("img");
      var title = titleNode ? titleNode.textContent.trim() : "";
      imgEl.src = img ? img.getAttribute("src") || img.src : "";
      imgEl.alt = (img && img.getAttribute("alt")) || title;
      titleEl.textContent = title;
      descEl.textContent = descNode ? descNode.textContent.trim() : "";
      descEl.hidden = !descEl.textContent;
      priceEl.textContent = priceNode ? priceNode.textContent.trim() : "";
      var hasBadge = badgeNode && badgeNode.textContent.trim();
      badgeEl.textContent = hasBadge ? badgeNode.textContent.trim() : "";
      badgeEl.hidden = !hasBadge;

      var oldCart = actionsEl.querySelector(".pb-drink-preview__cart");
      if (oldCart) oldCart.parentNode.removeChild(oldCart);

      var cardAdd = card.querySelector("[data-add-cart]");
      if (!cardAdd) return;
      var clone = cardAdd.cloneNode(true);
      clone.classList.remove("btn-add-cart-fresh--sm");
      clone.classList.add("pb-drink-preview__add");
      var qty = 1;
      var base = {
        id: clone.getAttribute("data-cart-id") || "",
        title: clone.getAttribute("data-cart-title") || title,
        priceLabel: clone.getAttribute("data-cart-price") || priceEl.textContent,
        image: clone.getAttribute("data-cart-image") || imgEl.src,
      };
      var stepper = document.createElement("div");
      stepper.className = "pb-qty pb-drink-preview__qty";
      stepper.innerHTML =
        '<button type="button" class="pb-qty__btn" data-qty-dec aria-label="Decrease quantity"><i class="fa-solid fa-minus" aria-hidden="true"></i></button>' +
        '<span class="pb-qty__val" aria-live="polite">1</span>' +
        '<button type="button" class="pb-qty__btn" data-qty-inc aria-label="Increase quantity"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>';
      var valEl = stepper.querySelector(".pb-qty__val");
      var decBtn = stepper.querySelector("[data-qty-dec]");
      function syncQty() {
        clone.setAttribute(
          "data-cart-payload",
          encodeURIComponent(JSON.stringify({
            id: base.id,
            title: base.title,
            priceLabel: base.priceLabel,
            image: base.image,
            qty: qty
          }))
        );
        valEl.textContent = String(qty);
        decBtn.disabled = qty <= 1;
      }
      stepper.addEventListener("click", function (e) {
        e.stopPropagation();
        if (e.target.closest("[data-qty-inc]")) qty = Math.min(99, qty + 1);
        else if (e.target.closest("[data-qty-dec]")) qty = Math.max(1, qty - 1);
        syncQty();
      });
      syncQty();
      var cartRow = document.createElement("div");
      cartRow.className = "pb-drink-preview__cart";
      cartRow.appendChild(stepper);
      cartRow.appendChild(clone);
      actionsEl.insertBefore(cartRow, actionsEl.firstChild);
    }

    function place(card) {
      var r = card.getBoundingClientRect();
      var w = Math.min(780, window.innerWidth - 24);
      var left = r.left + r.width / 2 - w / 2;
      left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
      var top = Math.max(12, r.top - 28);
      var estimatedH = Math.min(460, window.innerHeight - 24);
      if (top + estimatedH > window.innerHeight - 12) {
        top = Math.max(12, window.innerHeight - estimatedH - 12);
      }
      dialogEl.style.width = w + "px";
      dialogEl.style.left = left + "px";
      dialogEl.style.top = top + "px";
    }

    function hitRect(el, x, y, pad) {
      if (!el) return false;
      var r = el.getBoundingClientRect();
      return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
    }

    function isOverPreview(x, y) {
      if (hitRect(dialogEl, x, y, 12)) return true;
      if (hitRect(originCard, x, y, 12)) return true;
      var el = document.elementFromPoint(x, y);
      if (!el || !el.closest) return false;
      if (el.closest(".pb-drink-preview__dialog")) return true;
      if (originCard && (el === originCard || originCard.contains(el))) return true;
      return false;
    }

    function cancelClose() {
      if (closeTimer) {
        window.clearTimeout(closeTimer);
        closeTimer = null;
      }
    }

    function scheduleClose(delay) {
      if (closeTimer) return;
      closeTimer = window.setTimeout(function () {
        closeTimer = null;
        close();
      }, delay || 160);
    }

    function open(card) {
      build();
      closeGen += 1;
      if (hideTimer) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
      cancelClose();
      if (originCard && originCard !== card) {
        originCard.classList.remove("is-previewing");
      }
      originCard = card;
      fill(card);
      overlay.hidden = false;
      place(card);
      overlay.offsetWidth;
      overlay.classList.add("is-open");
      card.classList.add("is-previewing");
      document.addEventListener("keydown", onKey, true);
      armLeave();
    }

    function armLeave() {
      disarmLeave();
      onDocMove = function (e) {
        if (isOverPreview(e.clientX, e.clientY)) cancelClose();
        else scheduleClose(160);
      };
      document.addEventListener("mousemove", onDocMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", onWindowLeave);
      window.addEventListener("scroll", onWindowLeave, { passive: true });
      window.addEventListener("blur", onWindowLeave);
    }

    function onWindowLeave() {
      scheduleClose(80);
    }

    function disarmLeave() {
      cancelClose();
      if (onDocMove) {
        document.removeEventListener("mousemove", onDocMove);
        onDocMove = null;
      }
      document.documentElement.removeEventListener("mouseleave", onWindowLeave);
      window.removeEventListener("scroll", onWindowLeave);
      window.removeEventListener("blur", onWindowLeave);
    }

    function close() {
      if (!overlay) return;
      if (overlay.hidden && !overlay.classList.contains("is-open")) return;
      var gen = ++closeGen;
      disarmLeave();
      overlay.classList.remove("is-open");
      if (originCard) originCard.classList.remove("is-previewing");
      originCard = null;
      document.removeEventListener("keydown", onKey, true);
      hideTimer = window.setTimeout(function () {
        hideTimer = null;
        if (gen !== closeGen) return;
        overlay.hidden = true;
      }, 220);
    }

    function onKey(e) {
      if (e.key === "Escape") close();
    }

    function isOpen() {
      return !!(overlay && !overlay.hidden && overlay.classList.contains("is-open"));
    }

    return { open: open, close: close, isOpen: isOpen, origin: function () { return originCard; } };
  })();

  var DRINK_SKIP = "a, button, [data-add-cart], .product-add-cart-wrap, .pb-qty, .pb-card-actions";

  (function () {
    var canHover =
      window.matchMedia &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!canHover) return;
    var timer = null;
    var pending = null;

    function armCard(card) {
      if (card.getAttribute("data-drink-hover") === "1") return;
      card.setAttribute("data-drink-hover", "1");
      card.addEventListener("mouseenter", function () {
        if (drinkPreview.origin() === card) return;
        pending = card;
        window.clearTimeout(timer);
        timer = window.setTimeout(function () {
          if (pending === card) drinkPreview.open(card);
          pending = null;
        }, 140);
      });
      card.addEventListener("mouseleave", function (e) {
        if (pending === card) {
          window.clearTimeout(timer);
          pending = null;
        }
        var next = e.relatedTarget;
        if (next && next.closest && next.closest(".pb-drink-preview__dialog")) return;
      });
    }

    document
      .querySelectorAll(".products-catalog-section .product-card--drink")
      .forEach(armCard);
  })();

  document.addEventListener("click", function (e) {
    var card = e.target.closest(".products-catalog-section .product-card--drink");
    if (e.target.closest(".pb-drink-preview__dialog, [data-dp-close]")) return;
    if (!card || e.target.closest(DRINK_SKIP)) {
      if (drinkPreview.isOpen() && !card) drinkPreview.close();
      return;
    }
    e.preventDefault();
    if (drinkPreview.origin() === card) drinkPreview.close();
    else drinkPreview.open(card);
  });

  /* ── Cookie tiles: separate photo overlay (not the drinks preview) ── */
  var cookiePreview = (function () {
    var overlay = null;
    var imgEl, titleEl, priceEl, actionsEl, dialogEl, flyEl, stageEl, loupeEl;
    var originTile = null;
    var hideTimer = null;
    var flyTimer = null;
    var closeGen = 0;

    function build() {
      if (overlay) return;
      overlay = document.createElement("div");
      overlay.className = "pb-cookie-preview";
      overlay.hidden = true;
      overlay.innerHTML =
        '<div class="pb-cookie-preview__veil" aria-hidden="true"></div>' +
        '<img class="pb-cookie-preview__fly" alt="" hidden>' +
        '<div class="pb-cookie-preview__dialog" role="dialog" aria-labelledby="pb-ck-title">' +
          '<button type="button" class="pb-cookie-preview__close" data-ck-close aria-label="Close">' +
            '<i class="fa-solid fa-xmark" aria-hidden="true"></i>' +
          "</button>" +
          '<div class="pb-cookie-preview__media">' +
            '<span class="pb-cookie-preview__media-glow" aria-hidden="true"></span>' +
            '<div class="pb-cookie-preview__stage">' +
              '<img id="pb-ck-img" src="" alt="" decoding="async" title="Move mouse to zoom · Click for full zoom">' +
              '<span class="pb-cookie-preview__loupe" data-ck-loupe aria-hidden="true"></span>' +
            "</div>" +
          "</div>" +
          '<div class="pb-cookie-preview__body">' +
            '<p class="pb-cookie-preview__kicker"><i class="fa-solid fa-cookie-bite" aria-hidden="true"></i> Fresh from the oven</p>' +
            '<h3 class="pb-cookie-preview__title" id="pb-ck-title"></h3>' +
            '<p class="pb-cookie-preview__price" id="pb-ck-price"></p>' +
            '<div class="pb-cookie-preview__actions" id="pb-ck-actions">' +
              '<a class="pb-cookie-preview__order" href="order.html">' +
                '<i class="fa-solid fa-motorcycle" aria-hidden="true"></i> Order options' +
              "</a>" +
            "</div>" +
          "</div>" +
        "</div>";
      document.body.appendChild(overlay);
      imgEl = overlay.querySelector("#pb-ck-img");
      titleEl = overlay.querySelector("#pb-ck-title");
      priceEl = overlay.querySelector("#pb-ck-price");
      actionsEl = overlay.querySelector("#pb-ck-actions");
      dialogEl = overlay.querySelector(".pb-cookie-preview__dialog");
      flyEl = overlay.querySelector(".pb-cookie-preview__fly");
      stageEl = overlay.querySelector(".pb-cookie-preview__stage");
      loupeEl = overlay.querySelector("[data-ck-loupe]");
      overlay.addEventListener("click", function (e) {
        if (
          e.target.closest("[data-ck-close]") ||
          e.target.classList.contains("pb-cookie-preview__veil")
        ) {
          close();
        }
      });
      overlay.addEventListener("click", function (e) {
        var mediaImg = e.target.closest(".pb-cookie-preview__stage img");
        if (!mediaImg) return;
        resetHoverZoom();
        overlay.classList.toggle("is-photo-zoomed");
        imgEl.title = overlay.classList.contains("is-photo-zoomed")
          ? "Click to zoom out"
          : "Move mouse to zoom · Click for full zoom";
      });
      if (stageEl) {
        stageEl.addEventListener("mousemove", onStageMove);
        stageEl.addEventListener("mouseenter", onStageMove);
        stageEl.addEventListener("mouseleave", onStageLeave);
      }
    }

    function fill(tile) {
      var titleNode = tile.querySelector("figcaption h4");
      var priceNodes = tile.querySelectorAll("figcaption span");
      var priceNode = priceNodes.length ? priceNodes[priceNodes.length - 1] : null;
      var img = tile.querySelector(".products-cookie-tile__img img") || tile.querySelector("img");
      var title = titleNode ? titleNode.textContent.trim() : "";
      imgEl.src = img ? img.getAttribute("src") || img.src : "";
      imgEl.alt = (img && img.getAttribute("alt")) || title;
      if (loupeEl) {
        loupeEl.style.backgroundImage = imgEl.src ? 'url("' + imgEl.src + '")' : "none";
      }
      titleEl.textContent = title;
      priceEl.textContent = priceNode ? priceNode.textContent.trim() : "";

      var oldCart = actionsEl.querySelector(".pb-cookie-preview__cart");
      if (oldCart) oldCart.parentNode.removeChild(oldCart);
      var cardAdd = tile.querySelector("[data-add-cart]");
      if (!cardAdd) return;
      var clone = cardAdd.cloneNode(true);
      clone.classList.remove("btn-add-cart-fresh--sm", "pb-shop-bar__add", "is-added");
      clone.classList.add("pb-cookie-preview__add");
      var qty = 1;
      var base = {
        id: clone.getAttribute("data-cart-id") || "",
        title: clone.getAttribute("data-cart-title") || title,
        priceLabel: clone.getAttribute("data-cart-price") || priceEl.textContent,
        image: clone.getAttribute("data-cart-image") || imgEl.src,
      };
      var stepper = document.createElement("div");
      stepper.className = "pb-qty pb-cookie-preview__qty";
      stepper.innerHTML =
        '<button type="button" class="pb-qty__btn" data-qty-dec aria-label="Decrease quantity"><i class="fa-solid fa-minus" aria-hidden="true"></i></button>' +
        '<span class="pb-qty__val" aria-live="polite">1</span>' +
        '<button type="button" class="pb-qty__btn" data-qty-inc aria-label="Increase quantity"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>';
      var valEl = stepper.querySelector(".pb-qty__val");
      var decBtn = stepper.querySelector("[data-qty-dec]");
      function syncQty() {
        clone.setAttribute(
          "data-cart-payload",
          encodeURIComponent(JSON.stringify({
            id: base.id,
            title: base.title,
            priceLabel: base.priceLabel,
            image: base.image,
            qty: qty
          }))
        );
        valEl.textContent = String(qty);
        decBtn.disabled = qty <= 1;
      }
      stepper.addEventListener("click", function (e) {
        e.stopPropagation();
        if (e.target.closest("[data-qty-inc]")) qty = Math.min(99, qty + 1);
        else if (e.target.closest("[data-qty-dec]")) qty = Math.max(1, qty - 1);
        syncQty();
      });
      syncQty();
      var cartRow = document.createElement("div");
      cartRow.className = "pb-cookie-preview__cart";
      cartRow.appendChild(stepper);
      cartRow.appendChild(clone);
      actionsEl.insertBefore(cartRow, actionsEl.firstChild);
    }

    function place() {
      if (!dialogEl) return;
      dialogEl.style.left = "";
      dialogEl.style.top = "";
      dialogEl.style.width = "";
    }

    function reduceMotion() {
      return !!(
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    }

    function isCoarsePointer() {
      return !!(
        window.matchMedia &&
        window.matchMedia("(pointer: coarse)").matches
      );
    }

    function resetHoverZoom() {
      if (!overlay) return;
      overlay.classList.remove("is-hover-zoom");
      if (imgEl) {
        imgEl.style.transform = "";
        imgEl.style.transition = "";
      }
      if (loupeEl) {
        loupeEl.style.left = "";
        loupeEl.style.top = "";
        loupeEl.style.backgroundPosition = "";
        loupeEl.style.backgroundSize = "";
      }
    }

    function onStageMove(e) {
      if (isCoarsePointer()) return;
      if (!overlay || overlay.classList.contains("is-photo-zoomed")) return;
      if (!imgEl || !stageEl || !loupeEl) return;
      var rect = imgEl.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return;
      var x = (e.clientX - rect.left) / rect.width;
      var y = (e.clientY - rect.top) / rect.height;
      x = Math.max(0, Math.min(1, x));
      y = Math.max(0, Math.min(1, y));

      overlay.classList.add("is-hover-zoom");

      if (!reduceMotion()) {
        var rotY = (x - 0.5) * 16;
        var rotX = (0.5 - y) * 12;
        imgEl.style.transition = "transform 0.08s linear";
        imgEl.style.transform =
          "perspective(900px) rotateY(" + rotY + "deg) rotateX(" + rotX + "deg) scale(1.08)";
      }

      var stageRect = stageEl.getBoundingClientRect();
      var size = 180;
      loupeEl.style.left = e.clientX - stageRect.left - size / 2 + "px";
      loupeEl.style.top = e.clientY - stageRect.top - size / 2 + "px";
      loupeEl.style.backgroundPosition = x * 100 + "% " + y * 100 + "%";
      loupeEl.style.backgroundSize = rect.width * 2.2 + "px " + rect.height * 2.2 + "px";
    }

    function onStageLeave() {
      resetHoverZoom();
    }

    function clearFly() {
      if (flyTimer) {
        window.clearTimeout(flyTimer);
        flyTimer = null;
      }
      if (!flyEl) return;
      flyEl.hidden = true;
      flyEl.style.transition = "none";
      flyEl.style.transform = "none";
    }

    function sourceImg(tile) {
      return tile ? tile.querySelector(".products-cookie-tile__img img") : null;
    }

    function destBox() {
      var destImg = overlay && overlay.querySelector(".pb-cookie-preview__media img");
      if (destImg) {
        var r = destImg.getBoundingClientRect();
        if (r.width >= 24 && r.height >= 24) return r;
      }
      var media = overlay && overlay.querySelector(".pb-cookie-preview__media");
      if (!media) return null;
      var m = media.getBoundingClientRect();
      var pad = 18;
      return {
        left: m.left + pad,
        top: m.top + pad,
        width: Math.max(8, m.width - pad * 2),
        height: Math.max(8, m.height - pad * 2),
      };
    }

    function flyTransform(from, to) {
      var scale = Math.min(to.width / from.width, to.height / from.height);
      var dx = to.left + (to.width - from.width * scale) / 2 - from.left;
      var dy = to.top + (to.height - from.height * scale) / 2 - from.top;
      return "translate(" + dx + "px," + dy + "px) scale(" + scale + ")";
    }

    function flyFromThumb(tile) {
      var src = sourceImg(tile);
      if (!src || !flyEl || reduceMotion()) return false;
      var from = src.getBoundingClientRect();
      if (from.width < 8 || from.height < 8) return false;
      flyEl.hidden = false;
      flyEl.src = src.currentSrc || src.src;
      flyEl.style.left = from.left + "px";
      flyEl.style.top = from.top + "px";
      flyEl.style.width = from.width + "px";
      flyEl.style.height = from.height + "px";
      flyEl.style.borderRadius = "0";
      flyEl.style.transition = "none";
      flyEl.style.transform = "none";
      flyEl.style.transformOrigin = "top left";
      tile.classList.add("is-cookie-zooming");
      overlay.classList.add("is-zooming");
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          var to = destBox();
          if (!to || to.width < 8) {
            overlay.classList.remove("is-zooming");
            clearFly();
            tile.classList.remove("is-cookie-zooming");
            return;
          }
          flyEl.style.transition =
            "transform 0.48s cubic-bezier(0.22, 1, 0.36, 1)";
          flyEl.style.transform = flyTransform(from, to);
        });
      });
      flyTimer = window.setTimeout(function () {
        flyTimer = null;
        overlay.classList.remove("is-zooming");
        clearFly();
        if (originTile) originTile.classList.remove("is-cookie-zooming");
      }, 500);
      return true;
    }

    function flyBackToThumb(tile) {
      var src = sourceImg(tile);
      var from = destBox();
      if (!src || !from || !flyEl || reduceMotion()) return false;
      var to = src.getBoundingClientRect();
      if (from.width < 8 || to.width < 8) return false;
      flyEl.hidden = false;
      flyEl.src = src.currentSrc || src.src;
      flyEl.style.left = from.left + "px";
      flyEl.style.top = from.top + "px";
      flyEl.style.width = from.width + "px";
      flyEl.style.height = from.height + "px";
      flyEl.style.borderRadius = "0";
      flyEl.style.transition = "none";
      flyEl.style.transform = "none";
      flyEl.style.transformOrigin = "top left";
      tile.classList.add("is-cookie-zooming");
      overlay.classList.add("is-zooming");
      window.requestAnimationFrame(function () {
        flyEl.style.transition =
          "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)";
        flyEl.style.transform = flyTransform(from, to);
      });
      return true;
    }

    function open(tile) {
      build();
      if (drinkPreview.isOpen()) drinkPreview.close();
      closeGen += 1;
      clearFly();
      if (hideTimer) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (originTile && originTile !== tile) {
        originTile.classList.remove("is-cookie-previewing");
        originTile.classList.remove("is-cookie-zooming");
      }
      originTile = tile;
      fill(tile);
      overlay.classList.remove("is-photo-zoomed");
      resetHoverZoom();
      imgEl.title = "Move mouse to zoom · Click for full zoom";
      overlay.hidden = false;
      place();
      overlay.offsetWidth;
      overlay.classList.add("is-open");
      tile.classList.add("is-cookie-previewing");
      flyFromThumb(tile);
      document.addEventListener("keydown", onKey, true);
    }

    function close() {
      if (!overlay) return;
      if (overlay.hidden && !overlay.classList.contains("is-open")) return;
      var gen = ++closeGen;
      var tile = originTile;
      var reversed = flyBackToThumb(tile);
      overlay.classList.remove("is-open");
      overlay.classList.remove("is-photo-zoomed");
      resetHoverZoom();
      if (originTile) originTile.classList.remove("is-cookie-previewing");
      originTile = null;
      document.removeEventListener("keydown", onKey, true);
      hideTimer = window.setTimeout(function () {
        hideTimer = null;
        if (gen !== closeGen) return;
        overlay.hidden = true;
        overlay.classList.remove("is-zooming");
        clearFly();
        if (tile) tile.classList.remove("is-cookie-zooming");
      }, reversed ? 420 : 220);
    }

    function onKey(e) {
      if (e.key === "Escape") close();
    }

    function isOpen() {
      return !!(overlay && !overlay.hidden && overlay.classList.contains("is-open"));
    }

    return { open: open, close: close, isOpen: isOpen, origin: function () { return originTile; } };
  })();

  (function () {
    var COOKIE_SKIP = "a, button, [data-add-cart], .product-add-cart-wrap, .pb-qty, .pb-shop-bar, .products-tile-order";

    document.querySelectorAll(".products-cookie-tile").forEach(function (tile) {
      if (tile.getAttribute("data-cookie-hover") === "1") return;
      tile.setAttribute("data-cookie-hover", "1");
      tile.addEventListener("click", function (e) {
        if (e.target.closest(COOKIE_SKIP)) return;
        if (cookiePreview.origin() === tile) cookiePreview.close();
        else cookiePreview.open(tile);
      });
    });
  })();

  /* ── Quantity stepper directly on each product card (next to Add to cart) ── */
  function buildCardStepper(addBtn) {
    var qty = 1;
    var base = {
      id: addBtn.getAttribute("data-cart-id") || "",
      title: addBtn.getAttribute("data-cart-title") || "",
      priceLabel: addBtn.getAttribute("data-cart-price") || "",
      image: addBtn.getAttribute("data-cart-image") || "",
    };

    var stepper = document.createElement("div");
    stepper.className = "pb-qty pb-qty--card";
    stepper.innerHTML =
      '<button type="button" class="pb-qty__btn" data-qty-dec aria-label="Decrease quantity">' +
        '<i class="fa-solid fa-minus" aria-hidden="true"></i>' +
      "</button>" +
      '<span class="pb-qty__val" aria-live="polite">1</span>' +
      '<button type="button" class="pb-qty__btn" data-qty-inc aria-label="Increase quantity">' +
        '<i class="fa-solid fa-plus" aria-hidden="true"></i>' +
      "</button>";
    var valEl = stepper.querySelector(".pb-qty__val");
    var decBtn = stepper.querySelector("[data-qty-dec]");

    function sync() {
      addBtn.setAttribute(
        "data-cart-payload",
        encodeURIComponent(
          JSON.stringify({
            id: base.id,
            title: base.title,
            priceLabel: base.priceLabel,
            image: base.image,
            qty: qty,
          })
        )
      );
      valEl.textContent = String(qty);
      decBtn.disabled = qty <= 1;
    }

    stepper.addEventListener("click", function (e) {
      e.stopPropagation();
      if (e.target.closest("[data-qty-inc]")) {
        qty = Math.min(99, qty + 1);
        sync();
      } else if (e.target.closest("[data-qty-dec]")) {
        qty = Math.max(1, qty - 1);
        sync();
      }
    });

    addBtn.addEventListener("click", function () {
      window.setTimeout(function () {
        qty = 1;
        sync();
      }, 60);
    });

    sync();
    return stepper;
  }

  function enhanceCardQty(card) {
    if (card.getAttribute("data-qty-enhanced") === "1") return;
    var addBtn = card.querySelector(".card-body [data-add-cart]");
    if (!addBtn) return;
    card.setAttribute("data-qty-enhanced", "1");

    var addWrap = addBtn.closest(".product-add-cart-wrap") || addBtn;
    var row = document.createElement("div");
    row.className = "pb-card-actions";
    addWrap.parentNode.insertBefore(row, addWrap);
    row.appendChild(buildCardStepper(addBtn));
    row.appendChild(addWrap);
  }

  function enhanceAllCardQty() {
    document
      .querySelectorAll(".products-catalog-section .product-card")
      .forEach(enhanceCardQty);
    document
      .querySelectorAll(".products-drink-tile, .products-cookie-tile")
      .forEach(enhanceShowcaseTile);
  }

  function enhanceShowcaseTile(tile) {
    if (tile.getAttribute("data-qty-enhanced") === "1") return;
    var addBtn = tile.querySelector("[data-add-cart]");
    if (!addBtn) return;
    tile.setAttribute("data-qty-enhanced", "1");

    var panel = tile.querySelector(".products-tile-order");
    var addWrap = addBtn.closest(".product-add-cart-wrap") || addBtn;
    if (!panel) {
      panel = document.createElement("div");
      panel.className = "products-tile-order";
      if (tile.classList.contains("products-cookie-tile")) {
        panel.classList.add("products-tile-order--below");
        tile.appendChild(panel);
      } else {
        addWrap.parentNode.insertBefore(panel, addWrap);
      }
      panel.appendChild(addWrap);
    }

    var isCookie = tile.classList.contains("products-cookie-tile");
    var row = document.createElement("div");

    if (isCookie) {
      addBtn.classList.add("pb-shop-bar__add");
      panel.classList.add("pb-shop-bar");
      row.className = "pb-shop-bar__cart";
      panel.insertBefore(row, addWrap);
      var cookieStepper = buildCardStepper(addBtn);
      cookieStepper.className = "pb-qty pb-shop-bar__qty";
      row.appendChild(cookieStepper);
      row.appendChild(addWrap);
      if (!panel.querySelector(".pb-shop-bar__order")) {
        var order = document.createElement("a");
        order.className = "pb-shop-bar__order";
        order.href = "order.html";
        order.innerHTML =
          '<i class="fa-solid fa-motorcycle" aria-hidden="true"></i> Order options';
        panel.appendChild(order);
      }
      return;
    }

    row.className = "pb-card-actions pb-card-actions--tile";
    panel.insertBefore(row, addWrap);
    row.appendChild(buildCardStepper(addBtn));
    row.appendChild(addWrap);
  }

  document.addEventListener("click", function (e) {
    var tile = e.target.closest(".products-drink-tile");
    var onControls = e.target.closest(
      ".products-tile-order, .pb-qty, [data-add-cart], .product-add-cart-wrap"
    );

    document.querySelectorAll(".products-drink-tile.is-ordering").forEach(function (openTile) {
      if (openTile !== tile) openTile.classList.remove("is-ordering");
    });

    if (!tile || onControls) return;
    if (window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      tile.classList.add("is-ordering");
      return;
    }
    tile.classList.toggle("is-ordering");
  });

  document.addEventListener("mouseover", function (e) {
    var tile = e.target.closest(".products-drink-tile");
    if (!tile) return;
    tile.classList.add("is-ordering");
  });

  document.addEventListener("mouseout", function (e) {
    var tile = e.target.closest(".products-drink-tile");
    if (!tile || !tile.classList.contains("is-ordering")) return;
    var next = e.relatedTarget;
    if (next && tile.contains(next)) return;
    window.setTimeout(function () {
      if (!tile.matches(":hover")) tile.classList.remove("is-ordering");
    }, 120);
  });

  enhanceAllCardQty();
  window.addEventListener("load", enhanceAllCardQty);

  if (window.MutationObserver) {
    var catalogSection = document.querySelector(".products-catalog-section");
    var qtyObserver = new MutationObserver(function () {
      enhanceAllCardQty();
    });
    [catalogSection, cookiesZone, drinksZone].forEach(function (root) {
      if (!root) return;
      qtyObserver.observe(root, { childList: true, subtree: true });
    });
  }

  (function setupCookiePriceList() {
    var wrap = document.getElementById("cookie-price-list-wrap");
    var btn = document.getElementById("cookie-price-list-btn");
    var panel = document.getElementById("cookie-price-list");
    var items = document.getElementById("cookie-price-list-items");
    if (!wrap || !btn || !panel || !items) return;

    function isOpen() {
      return wrap.classList.contains("is-open");
    }

    function closeList() {
      wrap.classList.remove("is-open");
      panel.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    }

    function fillList() {
      items.innerHTML = "";
      document.querySelectorAll(".products-cookie-tile").forEach(function (tile, i) {
        if (tile.hidden || tile.style.display === "none") return;
        var nameEl = tile.querySelector("figcaption h4");
        var priceEl = tile.querySelector("figcaption span");
        var name = nameEl ? String(nameEl.textContent || "").trim() : "";
        var price = priceEl ? String(priceEl.textContent || "").trim() : "";
        if (!name) return;
        var li = document.createElement("li");
        var row = document.createElement("button");
        row.type = "button";
        row.className = "pb-cookie-pricelist__row";
        row.setAttribute("data-cookie-index", String(i));
        var nameSpan = document.createElement("span");
        nameSpan.className = "pb-cookie-pricelist__name";
        nameSpan.textContent = name;
        var priceSpan = document.createElement("span");
        priceSpan.className = "pb-cookie-pricelist__price";
        priceSpan.textContent = price;
        row.appendChild(nameSpan);
        row.appendChild(priceSpan);
        li.appendChild(row);
        items.appendChild(li);
      });
    }

    function openList() {
      fillList();
      wrap.classList.add("is-open");
      panel.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      document.body.classList.remove("is-browse-chrome-hidden");
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!document.body.classList.contains("is-cookies-focus")) return;
      if (isOpen()) closeList();
      else openList();
    });

    items.addEventListener("click", function (e) {
      var row = e.target.closest(".pb-cookie-pricelist__row");
      if (!row) return;
      var idx = parseInt(row.getAttribute("data-cookie-index"), 10);
      var tiles = document.querySelectorAll(".products-cookie-tile");
      var tile = tiles[idx];
      closeList();
      if (!tile) return;
      tile.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    document.addEventListener("click", function (e) {
      if (!isOpen()) return;
      if (wrap.contains(e.target)) return;
      closeList();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeList();
    });
  })();

  (function setupBrowseChromeHide() {
    var lastY = window.scrollY || 0;
    var ticking = false;

    function isSearchFocused() {
      return !!(searchInput && document.activeElement === searchInput);
    }

    function chromeCanAutoHide() {
      if (document.body.classList.contains("is-products-hub")) return false;
      if (document.body.classList.contains("is-cookies-focus")) return true;
      return window.matchMedia && window.matchMedia("(max-width: 900px)").matches;
    }

    function setChromeHidden(hide) {
      if (!chromeCanAutoHide()) hide = false;
      document.body.classList.toggle("is-browse-chrome-hidden", !!hide);
    }

    function onScroll() {
      var y = window.scrollY || 0;
      if (Date.now() < chromeHideLockedUntil) {
        lastY = y;
        setChromeHidden(false);
        return;
      }
      var dy = y - lastY;
      lastY = y;

      if (!chromeCanAutoHide() || isSearchFocused() || y < 72) {
        setChromeHidden(false);
        return;
      }
      if (document.querySelector(".pb-cookie-pricelist.is-open")) {
        setChromeHidden(false);
        return;
      }
      if (dy > 10) setChromeHidden(true);
      else if (dy < -8) setChromeHidden(false);
    }

    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          ticking = false;
          onScroll();
        });
      },
      { passive: true }
    );

    if (searchInput) {
      searchInput.addEventListener("focus", function () {
        setChromeHidden(false);
      });
    }
  })();

  window.ProductsPageFilter = {
    apply: showCategory,
    hub: showHub,
    current: function () {
      return viewHub ? "hub" : currentFilter;
    },
    search: applySearch,
  };
})();
