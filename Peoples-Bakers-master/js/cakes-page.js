(function () {
  var CAKE_IMAGE_FALLBACK =
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=85';

  var apiUrl =
    (typeof window !== 'undefined' && window.PEOPLES_CAKES_API) || 'data/cakes.json';

  var CATEGORY_LABEL = {
    round: 'Round',
    square: 'Square',
    heart: 'Heart',
    rectangle: 'Rectangle',
    gateau: 'Gateau',
  };

  var shapeFiltersBound = false;
  var advFiltersBound = false;
  var langChangeBound = false;
  /** Set after the bootstrap `emitLanguageChange` that follows i18n:ready (skip duplicate re-render). */
  var sawFirstI18nLanguageEvent = false;
  /** Last array passed to renderCakes (embedded or from fetch) for i18n re-render. */
  var lastRenderedCakes = null;
  var PRICE_SLIDER_MAX = 8500;
  var advFilterState = { min: 0, max: PRICE_SLIDER_MAX, flavours: [] };
  var textSearchQuery = "";

  function i18nT(key, vars) {
    if (typeof window !== 'undefined' && window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key, vars);
    }
    return key;
  }

  function applyCatalogI18n() {
    if (window.i18n && typeof window.i18n.updateLanguage === 'function') {
      try {
        window.i18n.updateLanguage();
      } catch (e) {
        console.warn('cakes-page: i18n.updateLanguage failed (catalog text may stay EN)', e);
      }
    }
  }

  function categoryLabel(cat) {
    var k = 'cakes_badge.' + (cat || 'round');
    var tr = i18nT(k);
    if (tr !== k) return tr;
    return CATEGORY_LABEL[cat] || cat;
  }

  function getEmbeddedCakes() {
    var w = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null;
    if (w && Array.isArray(w.PEOPLES_CAKES_DATA)) {
      return w.PEOPLES_CAKES_DATA;
    }
    return null;
  }

  function mapApiProductToCake(p) {
    if (!p) return null;
    return {
      category: p.category || 'round',
      title: p.title || 'Untitled',
      description: p.description || '',
      price: p.priceLabel || (p.price ? 'Rs. ' + p.price : ''),
      imageUrl: p.imageUrl || '',
      imageAlt: p.imageAlt || p.title || '',
      orderLabel: i18nT('cakes_js.order'),
    };
  }

  function fetchProductsFromApi(query) {
    var url = '/api/products';
    if (query) {
      url += '?q=' + encodeURIComponent(query);
    }
    return fetch(url)
      .then(function (res) {
        if (!res.ok) {
          throw new Error('Could not load products (' + res.status + ')');
        }
        return res.json();
      })
      .then(function (data) {
        var rows = Array.isArray(data.products) ? data.products : [];
        return rows.map(mapApiProductToCake).filter(Boolean);
      });
  }

  function resolveCatalogUrl(path) {
    try {
      return new URL(path, document.baseURI).href;
    } catch (e) {
      return path;
    }
  }

  function escapeHtml(text) {
    if (text == null) return '';
    var div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  /** Path-safe encoding for on-disk or relative paths; do not mangle full http(s) URLs. */
  function encodeRelativeImageUrl(url) {
    if (!url) return '';
    var s = String(url).trim();
    if (/^https?:\/\//i.test(s) || s.indexOf('//') === 0) {
      return s;
    }
    return s
      .split('/')
      .map(function (part) {
        if (part === '') return part;
        return encodeURIComponent(part);
      })
      .join('/');
  }

  function parsePriceLkr(priceStr) {
    if (priceStr == null) return null;
    var s = String(priceStr);
    if (/on request|n\/a|ask/i.test(s)) return null;
    var m = s.replace(/,/g, '').match(/([0-9]+(?:\.[0-9]+)?)/);
    if (!m) return null;
    var n = parseFloat(m[1]);
    return isNaN(n) ? null : n;
  }

  /** Inferred from title + description for sidebar flavour filters (OR within selection) */
  function inferFlavourKeys(cake) {
    var t = (String(cake.title) + ' ' + String(cake.description || '')).toLowerCase();
    var k = [];
    if (/mango/.test(t)) k.push('mango');
    if (/\borange\b|orange[-\s]/.test(t)) k.push('orange');
    if (/\bcoffee\b/.test(t)) k.push('coffee');
    if (/pineapple/.test(t)) k.push('pineapple');
    if (/blueberry|strawberry|berry|berries/.test(t)) k.push('berry');
    var hasChoco = /(chocolate|choco|ganache|fudge|black forest|\bcocoa\b)/.test(t);
    var hasVanilla = /vanilla|white forest/.test(t);
    if (hasChoco && hasVanilla) k.push('choc_vanilla');
    if (hasChoco) k.push('chocolate');
    if (!hasChoco && /\bbutter\b|nougat|curd|white forest|\bvanilla\b/.test(t)) {
      k.push('butter');
    }
    var seen = [];
    k.forEach(function (x) {
      if (seen.indexOf(x) === -1) seen.push(x);
    });
    return seen;
  }

  function badgeClass(category) {
    switch (category) {
      case 'gateau':
        return 'cake-card-badge cake-card-badge--gold';
      case 'heart':
        return 'cake-card-badge cake-card-badge--purple';
      case 'rectangle':
        return 'cake-card-badge cake-card-badge--green';
      default:
        return 'cake-card-badge';
    }
  }

  /** Occasion filter: printed = photo print line; gateau = data category gateau; birthday = party & celebration block */
  function renderCakeCard(cake, idx, cakeBucket) {
    var cat = cake.category || 'round';
    var bucket = cakeBucket || 'birthday';
    var label = categoryLabel(cat);
    var featured = cake.featured ? ' cake-card--featured' : '';
    var imgSrc = encodeRelativeImageUrl(cake.imageUrl || '');
    var imgAlt = String(cake.imageAlt || cake.title || '');
    var slug = String(cake.title || 'cake')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);
    var cartPayload = encodeURIComponent(
      JSON.stringify({
        id: 'cake-' + idx + '-' + slug,
        title: cake.title,
        priceLabel: cake.price,
        image: imgSrc,
      })
    );
    var priceLkr = parsePriceLkr(cake.price);
    var flavourKeys = inferFlavourKeys(cake);
    var priceAttr = priceLkr != null && !isNaN(priceLkr) ? String(Math.round(priceLkr)) : '';
    var flavAttr = flavourKeys.length ? escapeHtml(flavourKeys.join(' ')) : '';

    return (
      '<article class="cake-card' +
      featured +
      '" data-category="' +
      escapeHtml(cat) +
      '" data-cake-bucket="' +
      escapeHtml(bucket) +
      '" data-price-lkr="' +
      priceAttr +
      '" data-flavour-keys="' +
      flavAttr +
      '">' +
      '<img class="cake-card-img" src="' +
      escapeHtml(imgSrc) +
      '" alt="' +
      escapeHtml(imgAlt) +
      '" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\'' +
      CAKE_IMAGE_FALLBACK +
      '\'">' +
      '<div class="' +
      badgeClass(cat) +
      '">' +
      escapeHtml(label) +
      '</div>' +
      '<div class="cake-card-body">' +
      '<h3>' +
      escapeHtml(cake.title) +
      '</h3>' +
      '<p>' +
      escapeHtml(cake.description) +
      '</p>' +
      '<div class="cake-card-footer">' +
      '<span class="price">' +
      escapeHtml(cake.price) +
      '</span>' +
      '<div class="cake-card-btns">' +
      '<button type="button" class="btn-add-cart-fresh btn-add-cart-fresh--sm" data-add-cart data-cart-payload="' +
      cartPayload +
      '"><i class="fa-solid fa-cart-plus" aria-hidden="true"></i> ' +
      escapeHtml(i18nT('cart.add_to_cart')) +
      '</button>' +
      '<a href="order.html" class="cake-order-btn">' +
      escapeHtml(cake.orderLabel || i18nT('cakes_js.order')) +
      '</a>' +
      '</div></div></div></article>'
    );
  }

  function isPrintedName(cake) {
    return /printed/i.test(String(cake && cake.title ? cake.title : ''));
  }

  function buildSectionHtml(gKey, list, startIndex) {
    if (!list || !list.length) return { html: '', nextIndex: startIndex };
    var occasionBucket =
      gKey === 'gateau' ? 'gateau' : gKey === 'printed' ? 'printed' : 'birthday';
    var nextIndex = startIndex;
    var cardsHtml = list
      .map(function (cake) {
        return renderCakeCard(cake, nextIndex++, occasionBucket);
      })
      .join('');

    if (gKey === 'gateau') {
      return {
        nextIndex: nextIndex,
        html:
          '<section class="cakes-group cakes-group--gateau" data-cakes-group="gateau" data-cake-section="gateau" aria-label="' +
          escapeHtml(i18nT('cakes.group_gateau_title')) +
          '">' +
          '<div class="cakes-group__head">' +
          '<h3 class="cakes-group__title" data-i18n="cakes.group_gateau_title">' +
          escapeHtml(i18nT('cakes.group_gateau_title')) +
          '</h3>' +
          '<p class="cakes-group__sub" data-i18n="cakes.group_gateau_sub">' +
          escapeHtml(i18nT('cakes.group_gateau_sub')) +
          '</p>' +
          '</div>' +
          '<div class="cakes-page-grid cakes-page-grid--in-group">' +
          cardsHtml +
          '</div>' +
          '</section>',
      };
    }

    if (gKey === 'printed') {
      return {
        nextIndex: nextIndex,
        html:
          '<section class="cakes-group cakes-group--printed" data-cakes-group="printed" data-cake-section="printed" aria-label="' +
          escapeHtml(i18nT('cakes.group_printed_title')) +
          '">' +
          '<div class="cakes-group__head">' +
          '<h3 class="cakes-group__title" data-i18n="cakes.group_printed_title">' +
          escapeHtml(i18nT('cakes.group_printed_title')) +
          '</h3>' +
          '<p class="cakes-group__sub" data-i18n="cakes.group_printed_sub">' +
          escapeHtml(i18nT('cakes.group_printed_sub')) +
          '</p>' +
          '</div>' +
          '<div class="cakes-page-grid cakes-page-grid--in-group">' +
          cardsHtml +
          '</div>' +
          '</section>',
      };
    }

    return {
      nextIndex: nextIndex,
      html:
        '<section class="cakes-group cakes-group--celebration" data-cakes-group="celebration" data-cake-section="celebration" aria-label="' +
        escapeHtml(i18nT('cakes.group_celebration_title')) +
        '">' +
        '<div class="cakes-group__head">' +
        '<h3 class="cakes-group__title" data-i18n="cakes.group_celebration_title">' +
        escapeHtml(i18nT('cakes.group_celebration_title')) +
        '</h3>' +
        '<p class="cakes-group__sub" data-i18n="cakes.group_celebration_sub">' +
        escapeHtml(i18nT('cakes.group_celebration_sub')) +
        '</p>' +
        '</div>' +
        '<div class="cakes-page-grid cakes-page-grid--in-group">' +
        cardsHtml +
        '</div>' +
        '</section>',
    };
  }

  function renderCakes(cakes) {
    var host = document.querySelector('.cakes-catalog-groups');
    if (!host) return;

    if (!Array.isArray(cakes) || !cakes.length) {
      lastRenderedCakes = null;
      host.setAttribute('aria-busy', 'false');
      host.innerHTML = '';
      return;
    }

    lastRenderedCakes = cakes;

    /* “Printed” in the product name → own section; gateau/celebration get the rest (no duplicate rows) */
    var printed = [];
    var gateau = [];
    var celebration = [];
    cakes.forEach(function (c) {
      if (!c) return;
      if (isPrintedName(c)) {
        printed.push(c);
        return;
      }
      if (c.category === 'gateau') {
        gateau.push(c);
        return;
      }
      celebration.push(c);
    });

    var idx = 0;
    var out = [];
    var totalCakes = cakes.length;
    var countLine =
      '<div class="cakes-catalog-meta" role="status" aria-live="polite"><p class="cakes-catalog-meta__p">' +
      escapeHtml(i18nT('cakes.catalog_count', { count: String(totalCakes) })) +
      '</p></div>';

    /* Section order: birthday & celebration first, then print, then gateau (Caravan-style scan) */
    var gBirth = buildSectionHtml('celebration', celebration, idx);
    idx = gBirth.nextIndex;
    if (gBirth.html) out.push(gBirth.html);

    var gPrint = buildSectionHtml('printed', printed, idx);
    idx = gPrint.nextIndex;
    if (gPrint.html) out.push(gPrint.html);

    var gGateau = buildSectionHtml('gateau', gateau, idx);
    if (gGateau.html) out.push(gGateau.html);

    host.setAttribute('aria-busy', 'false');
    host.innerHTML =
      countLine +
        (out.join('') || '<p class="cakes-load-error" style="text-align:center;padding:2rem;">' + escapeHtml('No cakes to show') + '</p>');
    applyCatalogI18n();
    updateGroupVisibility();
    initAdvancedFilters(cakes);
  }

  function updateGroupVisibility() {
    document.querySelectorAll('.cakes-group').forEach(function (group) {
      var n = 0;
      group.querySelectorAll('.cake-card').forEach(function (card) {
        if (window.getComputedStyle(card).display !== 'none') n++;
      });
      group.hidden = n === 0;
      group.setAttribute('aria-hidden', n === 0 ? 'true' : 'false');
    });
  }

  function getActiveOccasionFilter() {
    var active = document.querySelector('.cakes-shapes-wrap .product-filter.cakes-cat-tile.is-active');
    return (active && active.getAttribute('data-filter')) || 'all';
  }

  function applyCakeVisibility() {
    var occ = getActiveOccasionFilter();
    var minP = advFilterState.min;
    var maxP = advFilterState.max;
    var wantFl = advFilterState.flavours;
    var q = textSearchQuery;
    var cards = document.querySelectorAll('.cakes-catalog-groups .cake-card');
    var visible = 0;
    cards.forEach(function (card) {
      var bucket = card.getAttribute('data-cake-bucket') || 'birthday';
      var okO = occ === 'all' || bucket === occ;
      var pAttr = card.getAttribute('data-price-lkr');
      var p = pAttr && String(pAttr).length ? parseInt(pAttr, 10) : null;
      var okP = p == null || isNaN(p) ? true : p >= minP && p <= maxP;
      var keys = (card.getAttribute('data-flavour-keys') || '')
        .split(/\s+/)
        .filter(function (x) {
          return x;
        });
      var okF =
        !wantFl.length ||
        wantFl.some(function (f) {
          return keys.indexOf(f) !== -1;
        });
      var text = String(card.textContent || '').toLowerCase();
      var okQ = !q || text.indexOf(q) !== -1;
      var show = okO && okP && okF && okQ;
      card.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });
    updateGroupVisibility();
    return visible;
  }

  function getMaxPriceFromCakes(cakes) {
    var max = 0;
    if (!Array.isArray(cakes)) return max;
    cakes.forEach(function (c) {
      var p = parsePriceLkr(c && c.price);
      if (p != null && p > max) max = p;
    });
    return max;
  }

  function updateAdvRangeFill() {
    var minEl = document.getElementById('cakes-price-min');
    var maxEl = document.getElementById('cakes-price-max');
    var fill = document.getElementById('cakes-adv-range-fill');
    if (!minEl || !maxEl || !fill) return;
    var top = +minEl.max || PRICE_SLIDER_MAX;
    if (top <= 0) return;
    var a = (+minEl.value / top) * 100;
    var b = (+maxEl.value / top) * 100;
    fill.style.left = a + '%';
    fill.style.width = Math.max(0, b - a) + '%';
  }

  function syncPriceSliderGap() {
    var minEl = document.getElementById('cakes-price-min');
    var maxEl = document.getElementById('cakes-price-max');
    if (!minEl || !maxEl) return;
    var gap = 100;
    var minV = +minEl.value;
    var maxV = +maxEl.value;
    if (minV > maxV - gap) {
      if (minEl === document.activeElement) {
        minEl.value = String(Math.max(0, maxV - gap));
      } else {
        maxEl.value = String(minV + gap);
      }
    }
    var labMin = document.getElementById('cakes-price-min-label');
    var labMax = document.getElementById('cakes-price-max-label');
    if (labMin) labMin.textContent = minEl.value;
    if (labMax) labMax.textContent = maxEl.value;
    updateAdvRangeFill();
  }

  function readAdvStateFromForm() {
    var minEl = document.getElementById('cakes-price-min');
    var maxEl = document.getElementById('cakes-price-max');
    var ch = document.querySelectorAll('#cakes-adv-checks input[type="checkbox"]:checked');
    var fl = [];
    for (var i = 0; i < ch.length; i++) {
      var v = ch[i].getAttribute('value');
      if (v) fl.push(v);
    }
    advFilterState = {
      min: minEl ? +minEl.value : 0,
      max: maxEl ? +maxEl.value : PRICE_SLIDER_MAX,
      flavours: fl,
    };
  }

  function initAdvancedFilters(cakes) {
    if (advFiltersBound) {
      return;
    }
    var sidebar = document.querySelector('.cakes-filter-sidebar');
    var minEl = document.getElementById('cakes-price-min');
    var maxEl = document.getElementById('cakes-price-max');
    if (!sidebar || !minEl || !maxEl) {
      return;
    }
    advFiltersBound = true;
    var dataMax = getMaxPriceFromCakes(cakes);
    if (dataMax > 0) {
      var rounded = Math.ceil(dataMax / 50) * 50;
      PRICE_SLIDER_MAX = Math.min(20000, Math.max(8500, rounded));
    }
    minEl.max = String(PRICE_SLIDER_MAX);
    maxEl.max = String(PRICE_SLIDER_MAX);
    minEl.value = '0';
    maxEl.value = String(PRICE_SLIDER_MAX);
    var labMax = document.getElementById('cakes-price-max-label');
    if (labMax) labMax.textContent = String(PRICE_SLIDER_MAX);
    readAdvStateFromForm();

    function onRangeInput() {
      syncPriceSliderGap();
    }
    minEl.addEventListener('input', onRangeInput);
    maxEl.addEventListener('input', onRangeInput);
    syncPriceSliderGap();

    var applyBtn = document.getElementById('cakes-apply-filters');
    var resetBtn = document.getElementById('cakes-reset-filters');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        readAdvStateFromForm();
        applyCakeVisibility();
        var g = document.getElementById('cakes-grid-anchor');
        if (g) {
          var reduceMotion =
            window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          g.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        }
      });
    }
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        document.querySelectorAll('#cakes-adv-checks input[type="checkbox"]').forEach(function (x) {
          x.checked = false;
        });
        minEl.value = '0';
        maxEl.value = String(PRICE_SLIDER_MAX);
        syncPriceSliderGap();
        readAdvStateFromForm();
        applyCakeVisibility();
      });
    }
  }

  function setActiveFilterButton(clicked) {
    if (!clicked) return;
    var zone = document.querySelector('.cakes-shapes-wrap') || document.querySelector('.cakes-catalog-section');
    if (!zone) return;
    var btns = zone.querySelectorAll('.product-filter.cakes-cat-tile');
    btns.forEach(function (b) {
      var isAct = b === clicked;
      b.classList.toggle('is-active', isAct);
      b.setAttribute('aria-selected', isAct ? 'true' : 'false');
    });
  }

  function bindFilters() {
    if (shapeFiltersBound) return;
    var zone = document.querySelector('.cakes-shapes-wrap');
    if (!zone) return;
    shapeFiltersBound = true;

    zone.addEventListener('click', function (e) {
      var btn = e.target.closest('.product-filter.cakes-cat-tile');
      if (!btn || !zone.contains(btn)) return;
      e.preventDefault();
      var filter = btn.getAttribute('data-filter');
      if (filter == null) return;
      setActiveFilterButton(btn);
      applyCakeVisibility();
      var gridAnchor = document.getElementById('cakes-grid-anchor');
      if (gridAnchor) {
        var reduceMotion =
          window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.requestAnimationFrame(function () {
          gridAnchor.scrollIntoView({
            behavior: reduceMotion ? 'auto' : 'smooth',
            block: 'start',
          });
        });
      }
    });
  }

  function showError(message) {
    var host = document.querySelector('.cakes-catalog-groups');
    if (!host) return;
    host.setAttribute('aria-busy', 'false');
    host.innerHTML =
      '<p class="cakes-load-error" role="alert" style="grid-column:1/-1;text-align:center;padding:2rem;color:#a33;">' +
      escapeHtml(message) +
      '</p>';
  }

  function load() {
    var embedded = getEmbeddedCakes();

    function finish(cakes) {
      renderCakes(cakes);
      bindFilters();
      setActiveFilterButton(
        document.querySelector('.cakes-shapes-wrap .product-filter.cakes-cat-tile.is-active') ||
          document.querySelector('.cakes-shapes-wrap .product-filter.cakes-cat-tile')
      );
      applyCakeVisibility();
    }

    if (window.location.protocol === 'file:') {
      if (embedded && embedded.length) {
        finish(embedded);
        return;
      }
      showError(i18nT('cakes.err_load'));
      return;
    }

    fetchProductsFromApi()
      .then(function (apiCakes) {
        if (apiCakes.length) {
          finish(apiCakes);
          return;
        }
        throw new Error('No API products');
      })
      .catch(function () {
        if (embedded && embedded.length) {
          finish(embedded);
          return;
        }
        return fetch(resolveCatalogUrl(apiUrl))
          .then(function (res) {
            if (!res.ok) {
              throw new Error('Could not load cakes (' + res.status + ')');
            }
            return res.json();
          })
          .then(function (data) {
            if (!Array.isArray(data)) {
              throw new Error('Invalid cakes data');
            }
            finish(data);
          });
      })
      .catch(function (err) {
        console.error(err);
        showError(err.message || 'Unable to load cakes.');
      });
  }

  function start() {
    try {
      load();
    } catch (err) {
      console.error(err);
      showError(err.message || 'Unable to show cakes.');
    }
  }

  function attachLangRefresh() {
    if (langChangeBound) {
      return;
    }
    langChangeBound = true;
    window.addEventListener('i18n:languageChanged', function () {
      if (!sawFirstI18nLanguageEvent) {
        sawFirstI18nLanguageEvent = true;
        return;
      }
      var emb = getEmbeddedCakes();
      var data = emb && emb.length ? emb : lastRenderedCakes && lastRenderedCakes.length ? lastRenderedCakes : null;
      if (!data) return;
      var active = document.querySelector('.cakes-shapes-wrap .product-filter.cakes-cat-tile.is-active');
      var filter = (active && active.getAttribute('data-filter')) || 'all';
      renderCakes(data);
      setActiveFilterButton(
        document.querySelector('.cakes-shapes-wrap .product-filter.cakes-cat-tile[data-filter="' + filter + '"]') ||
          document.querySelector('.cakes-shapes-wrap .product-filter.cakes-cat-tile')
      );
      applyCakeVisibility();
    });
  }

  /* Run after i18n has at least one successful updateLanguage, so t() and {{count}} on products do not break */
  var catalogBooted = false;

  function bootCakes() {
    if (catalogBooted) {
      return;
    }
    catalogBooted = true;
    start();
    attachLangRefresh();
  }

  window.addEventListener(
    'i18n:ready',
    function () {
      bootCakes();
    },
    { once: true }
  );

  setTimeout(function () {
    if (!catalogBooted) {
      console.warn('cakes-page: i18n:ready did not fire, loading catalog anyway (check i18n / network).');
      bootCakes();
    }
  }, 2000);

  window.ProductsCakeCatalog = {
    applySearch: function (query, zoneActive) {
      textSearchQuery = String(query || '')
        .toLowerCase()
        .trim();
      if (!zoneActive) {
        return 0;
      }
      return applyCakeVisibility();
    },
    reloadFromApi: function (query) {
      return fetchProductsFromApi(query).then(function (rows) {
        if (rows.length) {
          renderCakes(rows);
          bindFilters();
          applyCakeVisibility();
        }
        return rows.length;
      });
    },
  };
})();
