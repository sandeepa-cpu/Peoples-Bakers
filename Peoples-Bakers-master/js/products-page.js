/**
 * Products page — top category filters (All, Breads, Cakes, Sweets, Savory, Drinks).
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
  var currentFilter = "all";

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
      if (card.style.display !== "none") n++;
    });
    return n;
  }

  function applyCategoryFilter(filter) {
    currentFilter = filter || "all";

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

    document.body.classList.toggle("is-cakes-focus", isCakes);
    document.body.classList.toggle("is-breads-focus", isBreads);
    document.body.classList.toggle("is-sweets-focus", isSweets);
    document.body.classList.toggle("is-savory-focus", isSavory);
    document.body.classList.toggle("is-drinks-focus", isDrinks);
    document.body.classList.toggle("is-products-filter-all", isAll);
    document.body.setAttribute("data-product-filter", currentFilter);

    setZoneVisible(breadZone, isAll || isBreads);
    setZoneVisible(sweetZone, isAll || isSweets);
    setZoneVisible(savoryZone, isAll || isSavory);
    setZoneVisible(cakeZone, isAll || isCakes);

    if (categoryHint) categoryHint.hidden = !isCakes;
    if (shapeLabel) shapeLabel.classList.toggle("is-linked-to-cakes-filter", isCakes);

    cards.forEach(function (card) {
      var cat = card.getAttribute("data-category") || "";
      var show = isAll || cat === currentFilter;
      card.style.display = show ? "" : "none";
      card.hidden = !show;
    });

    var showGrid = !isCakes;
    if (productGrid) {
      productGrid.hidden = !showGrid;
      productGrid.setAttribute("aria-hidden", showGrid ? "false" : "true");
    }
    if (pageNote) {
      pageNote.hidden = !showGrid || countVisibleCards() === 0;
    }

    if (isSavory) scrollToEl(savoryZone);
    else if (isSweets) scrollToEl(sweetZone);
    else if (isBreads) scrollToEl(breadZone);
    else if (isCakes) scrollToEl(cakeZone);
    else if (isDrinks) scrollToEl(productGrid);
    else if (isAll) scrollToEl(document.getElementById("products-menu"));
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyCategoryFilter(btn.getAttribute("data-filter"));
    });
  });

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
  };
})();
