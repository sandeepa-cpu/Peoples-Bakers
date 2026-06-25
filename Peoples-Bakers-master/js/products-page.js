/**
 * Products page — category filters + search (All, Breads, Cakes, …).
 */
(function () {
  var buttons = document.querySelectorAll(".product-toolbar--categories .product-filter");
  if (!buttons.length) return;

  var cards = document.querySelectorAll(".products-catalog-section .product-card");
  var productGrid = document.querySelector(".products-page-grid");
  var pageNote = document.querySelector(".products-page-note--after-grid");
  var cakeZone = document.getElementById("cakes");
  var breadZone = document.getElementById("breads");
  var sweetZone = document.getElementById("sweets");
  var savoryZone = document.getElementById("savory");
  var categoryHint = document.getElementById("cakes-category-hint");
  var shapeLabel = document.getElementById("cakes-shape-label");
  var searchInput = document.getElementById("products-search");
  var searchClear = document.getElementById("products-search-clear");
  var searchStatus = document.getElementById("products-search-status");
  var currentFilter = "all";
  var searchQuery = "";

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

  function updateSearchStatus(visibleCards, cakeVisible) {
    if (!searchStatus) return;
    if (!searchQuery) {
      searchStatus.hidden = true;
      searchStatus.textContent = "";
      return;
    }
    var total = visibleCards + (cakeVisible || 0);
    searchStatus.hidden = false;
    if (total === 0) {
      searchStatus.textContent = 'No products match "' + searchQuery + '".';
    } else {
      searchStatus.textContent = total + " result(s) for \"" + searchQuery + "\".";
    }
  }

  function applyFilters() {
    buttons.forEach(function (b) {
      var match = b.getAttribute("data-filter") === currentFilter;
      b.classList.toggle("is-active", match);
      b.setAttribute("aria-selected", match ? "true" : "false");
    });

    var isAll = currentFilter === "all";
    var isCakes = currentFilter === "cakes";
    var isBreads = currentFilter === "breads";
    var isSweets = currentFilter === "sweets";
    var isSavory = currentFilter === "savory";
    var isDrinks = currentFilter === "drinks";
    var hasSearch = searchQuery.length > 0;

    document.body.classList.toggle("is-cakes-focus", isCakes);
    document.body.classList.toggle("is-breads-focus", isBreads);
    document.body.classList.toggle("is-sweets-focus", isSweets);
    document.body.classList.toggle("is-savory-focus", isSavory);
    document.body.classList.toggle("is-drinks-focus", isDrinks);
    document.body.classList.toggle("is-products-filter-all", isAll);
    document.body.classList.toggle("is-products-search-active", hasSearch);
    document.body.setAttribute("data-product-filter", currentFilter);

    var showCakesZone = isAll || isCakes;
    if (hasSearch && !isCakes && !isAll) {
      showCakesZone = false;
    }

    setZoneVisible(breadZone, (isAll || isBreads) && !hasSearch);
    setZoneVisible(sweetZone, (isAll || isSweets) && !hasSearch);
    setZoneVisible(savoryZone, (isAll || isSavory) && !hasSearch);
    setZoneVisible(cakeZone, showCakesZone);

    if (categoryHint) categoryHint.hidden = !isCakes && !(hasSearch && showCakesZone);
    if (shapeLabel) {
      shapeLabel.classList.toggle(
        "is-linked-to-cakes-filter",
        isCakes || (hasSearch && showCakesZone)
      );
    }

    cards.forEach(function (card) {
      var cat = card.getAttribute("data-category") || "";
      var catOk = isAll || cat === currentFilter;
      var show = catOk && matchesSearch(card);
      card.style.display = show ? "" : "none";
      card.hidden = !show;
    });

    var showGrid = !isCakes || hasSearch;
    if (productGrid) {
      productGrid.hidden = !showGrid;
      productGrid.setAttribute("aria-hidden", showGrid ? "false" : "true");
    }
    if (pageNote) {
      pageNote.hidden = !showGrid || countVisibleCards() === 0;
    }

    var cakeVisible = 0;
    if (
      window.ProductsCakeCatalog &&
      typeof window.ProductsCakeCatalog.applySearch === "function"
    ) {
      cakeVisible = window.ProductsCakeCatalog.applySearch(searchQuery, showCakesZone);
    }

    updateSearchStatus(countVisibleCards(), cakeVisible);

    if (hasSearch) {
      if (cakeVisible > 0 && showCakesZone) scrollToEl(cakeZone);
      else if (countVisibleCards() > 0 && showGrid) scrollToEl(productGrid);
    } else if (isSavory) scrollToEl(savoryZone);
    else if (isSweets) scrollToEl(sweetZone);
    else if (isBreads) scrollToEl(breadZone);
    else if (isCakes) scrollToEl(cakeZone);
    else if (isDrinks) scrollToEl(productGrid);
  }

  function applyCategoryFilter(filter) {
    currentFilter = filter || "all";
    applyFilters();
  }

  function applySearch(value) {
    searchQuery = String(value || "")
      .toLowerCase()
      .trim();
    if (searchClear) searchClear.hidden = !searchQuery;
    applyFilters();
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyCategoryFilter(btn.getAttribute("data-filter"));
    });
  });

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      applySearch(searchInput.value);
    });
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        searchInput.value = "";
        applySearch("");
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

  document.querySelectorAll("[data-apply-cake-filter]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      applyCategoryFilter("cakes");
      var f = link.getAttribute("data-apply-cake-filter");
      var target = document.querySelector(
        '.product-toolbar--shapes .cakes-cat-tile[data-filter="' + f + '"]'
      );
      if (target) {
        target.click();
        window.setTimeout(function () {
          scrollToEl(document.getElementById("cakes-grid-anchor"));
        }, 80);
      }
    });
  });

  var hashMap = {
    "#cakes": "cakes",
    "#breads": "breads",
    "#sweets": "sweets",
    "#savory": "savory",
    "#drinks": "drinks",
  };

  function applyHashFilter() {
    var f = hashMap[window.location.hash];
    if (f) {
      window.setTimeout(function () {
        applyCategoryFilter(f);
      }, 120);
    }
  }

  applyHashFilter();
  window.addEventListener("hashchange", applyHashFilter);

  window.ProductsPageFilter = {
    apply: applyCategoryFilter,
    current: function () {
      return currentFilter;
    },
    search: applySearch,
  };
})();
