(function () {
  var CAKE_IMAGE_FALLBACK = 'images/cakes/chocolate-gateau-cake-1kg.png';
  var CAKE_CATEGORIES = {
    round: true,
    square: true,
    heart: true,
    rectangle: true,
    gateau: true,
  };

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
  /** Cake objects in the same order as data-cake-idx on cards. */
  var catalogByIdx = [];
  var MSG_MAX = 40;
  var WEIGHT_CHIP_ORDER = ['bento', '500g', '650g', '1kg', '2kg', 'pieces'];
  var PRICE_SLIDER_MAX = 8500;
  var advFilterState = { min: 0, max: PRICE_SLIDER_MAX, flavours: [], weights: [] };
  var currentSort = 'default';
  var textSearchQuery = '';
  var priceBand = 'all';
  var selectedShapes = [];
  function formatRsLabel(n) {
    var num = parseInt(n, 10);
    if (isNaN(num)) return 'Rs. 0';
    try {
      return 'Rs. ' + num.toLocaleString('en-LK');
    } catch (e) {
      return 'Rs. ' + num;
    }
  }

  function updatePricePills() {
    var minEl = document.getElementById('cakes-price-min');
    var maxEl = document.getElementById('cakes-price-max');
    var pillMin = document.getElementById('cakes-price-min-pill');
    var pillMax = document.getElementById('cakes-price-max-pill');
    if (pillMin && minEl) pillMin.textContent = formatRsLabel(minEl.value);
    if (pillMax && maxEl) pillMax.textContent = formatRsLabel(maxEl.value);
  }

  function countActiveFilterRules() {
    var n = 0;
    if (advFilterState.min > 0 || advFilterState.max < PRICE_SLIDER_MAX) n++;
    n += advFilterState.flavours.length;
    n += advFilterState.weights.length;
    if (currentSort !== 'default') n++;
    return n;
  }

  function updateFilterUiMeta(previewVisible) {
    var live = document.getElementById('cakes-filter-live-count');
    var badge = document.getElementById('cakes-filter-active-count');
    var tags = document.getElementById('cakes-filter-active-tags');
    var visible =
      typeof previewVisible === 'number'
        ? previewVisible
        : applyCakeVisibilityPreview();

    if (live) {
      if (visible === 1) {
        live.textContent = i18nT('cakes.live_count_one');
      } else {
        live.textContent = i18nT('cakes.live_count', { count: visible });
      }
    }

    var activeN = countActiveFilterRules();
    if (badge) {
      if (activeN > 0) {
        badge.hidden = false;
        badge.textContent = String(activeN);
      } else {
        badge.hidden = true;
      }
    }

    if (!tags) return;
    var parts = [];
    function removableTag(label, removeType, removeValue) {
      return (
        '<button type="button" class="cakes-filter-tag cakes-filter-tag--removable" data-remove-filter="' +
        escapeHtml(removeType) +
        '" data-remove-value="' +
        escapeHtml(removeValue || '') +
        '" aria-label="' +
        escapeHtml(i18nT('cakes.tag_remove_aria', { label: label })) +
        '">' +
        escapeHtml(label) +
        ' <i class="fa-solid fa-xmark" aria-hidden="true"></i></button>'
      );
    }
    if (advFilterState.min > 0 || advFilterState.max < PRICE_SLIDER_MAX) {
      parts.push(
        removableTag(
          i18nT('cakes.active_price') +
            ': ' +
            formatRsLabel(advFilterState.min) +
            ' – ' +
            formatRsLabel(advFilterState.max),
          'price',
          ''
        )
      );
    }
    advFilterState.flavours.forEach(function (f) {
      var labelEl = document.querySelector(
        '#cakes-adv-checks input[value="' + f + '"] + span'
      );
      var label = labelEl ? labelEl.textContent : f;
      parts.push(removableTag(label, 'flavour', f));
    });
    advFilterState.weights.forEach(function (w) {
      var labelEl = document.querySelector(
        '#cakes-adv-weights input[value="' + w + '"] + span'
      );
      var label = labelEl ? labelEl.textContent : w;
      parts.push(removableTag(label, 'weight', w));
    });
    if (parts.length) {
      parts.push(
        '<button type="button" class="cakes-filter-tag cakes-filter-tag--clear" data-remove-filter="all">' +
          escapeHtml(i18nT('cakes.tag_clear_all')) +
          '</button>'
      );
      tags.hidden = false;
      tags.innerHTML = parts.join('');
    } else {
      tags.hidden = true;
      tags.innerHTML = '';
    }

    document.querySelectorAll('.cakes-adv-preset').forEach(function (btn) {
      var pMin = parseInt(btn.getAttribute('data-price-min'), 10) || 0;
      var pMax = parseInt(btn.getAttribute('data-price-max'), 10) || PRICE_SLIDER_MAX;
      var on =
        advFilterState.min === pMin &&
        advFilterState.max === Math.min(pMax, PRICE_SLIDER_MAX);
      btn.classList.toggle('is-active', on);
    });
  }

  function cardMatchesFilters(card, occ) {
    var bucket = card.getAttribute('data-cake-bucket') || 'birthday';
    var weights = String(card.getAttribute('data-weight-keys') || '').split(/\s+/).filter(Boolean);
    if (occ === 'bento') {
      if (weights.indexOf('bento') === -1) return false;
    } else if (occ === 'slices') {
      if (weights.indexOf('pieces') === -1) return false;
    } else if (occ !== 'all' && bucket !== occ) {
      return false;
    }

    var price = parseInt(card.getAttribute('data-price-lkr'), 10);
    if (priceBand === 'under1500') {
      if (isNaN(price) || price >= 1500) return false;
    } else if (priceBand === 'mid') {
      if (isNaN(price) || price < 1500 || price > 3000) return false;
    } else if (priceBand === 'above3000') {
      if (isNaN(price) || price <= 3000) return false;
    }

    if (advFilterState.min > 0 || advFilterState.max < PRICE_SLIDER_MAX) {
      if (isNaN(price) || price < advFilterState.min || price > advFilterState.max) {
        return false;
      }
    }
    if (advFilterState.flavours.length) {
      var flavours = String(card.getAttribute('data-flavour-keys') || '')
        .split(/\s+/)
        .filter(Boolean);
      var flavOk = advFilterState.flavours.some(function (f) {
        return flavours.indexOf(f) !== -1;
      });
      if (!flavOk) return false;
    }
    if (advFilterState.weights.length) {
      var wMatch = advFilterState.weights.some(function (w) {
        return weights.indexOf(w) !== -1;
      });
      if (!wMatch) return false;
    }

    if (selectedShapes.length) {
      var shape = card.getAttribute('data-category') || '';
      if (selectedShapes.indexOf(shape) === -1) return false;
    }

    var q = textSearchQuery;
    if (!q) return true;
    return String(card.textContent || '').toLowerCase().indexOf(q) !== -1;
  }

  function applyCakeVisibilityPreview() {
    var occ = getActiveOccasionFilter();
    var visible = 0;
    document.querySelectorAll('.cakes-catalog-groups .cake-card').forEach(function (card) {
      if (cardMatchesFilters(card, occ)) visible += 1;
    });
    return visible;
  }

  function sortCakeGrids() {
    document.querySelectorAll('.cakes-page-grid').forEach(function (grid) {
      var cards = Array.prototype.slice.call(grid.querySelectorAll('.cake-card'));
      if (cards.length < 2 || currentSort === 'default') return;
      cards.sort(function (a, b) {
        if (currentSort === 'name-asc') {
          var ta = (a.querySelector('h3') && a.querySelector('h3').textContent) || '';
          var tb = (b.querySelector('h3') && b.querySelector('h3').textContent) || '';
          return ta.localeCompare(tb);
        }
        var pa = parseInt(a.getAttribute('data-price-lkr'), 10);
        var pb = parseInt(b.getAttribute('data-price-lkr'), 10);
        if (isNaN(pa)) pa = currentSort === 'price-asc' ? 999999 : -1;
        if (isNaN(pb)) pb = currentSort === 'price-asc' ? 999999 : -1;
        return currentSort === 'price-desc' ? pb - pa : pa - pb;
      });
      cards.forEach(function (c) {
        grid.appendChild(c);
      });
    });
  }

  var filterLastFocus = null;

  function cakesFilterFocusable(root) {
    if (!root) return [];
    return Array.prototype.slice
      .call(
        root.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      )
      .filter(function (el) {
        return !el.hasAttribute('hidden') && (el.offsetWidth > 0 || el.offsetHeight > 0);
      });
  }

  function onCakesFilterKeydown(e) {
    if (!document.body.classList.contains('cakes-filter-open')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeMobileFilterPanel();
      return;
    }
    if (e.key !== 'Tab') return;
    var list = cakesFilterFocusable(document.getElementById('cakes-sidebar-filters'));
    if (!list.length) return;
    var first = list[0];
    var last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function openMobileFilterPanel() {
    var overlay = document.getElementById('cakes-filter-overlay');
    var btn = document.getElementById('cakes-filter-open');
    var sidebar = document.getElementById('cakes-sidebar-filters');
    filterLastFocus = document.activeElement;
    document.body.classList.add('cakes-filter-open');
    if (overlay) overlay.hidden = false;
    if (btn) btn.setAttribute('aria-expanded', 'true');
    // #region agent log
    fetch('http://127.0.0.1:7505/ingest/4aff59ea-ea1c-4b76-985d-93d083b5aa7f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d114ee'},body:JSON.stringify({sessionId:'d114ee',runId:'post-fix',hypothesisId:'D',location:'cakes-page.js:openMobileFilterPanel',message:'filter drawer open',data:{bodyLock:document.body.classList.contains('cakes-filter-open'),width:window.innerWidth},timestamp:Date.now()})}).catch(function(){});
    // #endregion
    if (sidebar) {
      var closeBtn = document.getElementById('cakes-filter-close');
      window.setTimeout(function () {
        try {
          (closeBtn || sidebar).focus();
        } catch (err) {}
      }, 40);
    }
  }

  function closeMobileFilterPanel() {
    var wasOpen = document.body.classList.contains('cakes-filter-open');
    var overlay = document.getElementById('cakes-filter-overlay');
    var btn = document.getElementById('cakes-filter-open');
    document.body.classList.remove('cakes-filter-open');
    if (overlay) overlay.hidden = true;
    if (btn) btn.setAttribute('aria-expanded', 'false');
    if (!wasOpen) return;
    try {
      if (btn && typeof btn.focus === 'function') btn.focus();
      else if (filterLastFocus && typeof filterLastFocus.focus === 'function') filterLastFocus.focus();
    } catch (err) {}
  }

  var FILTER_COLLAPSE_KEY = 'pb_cakes_filter_collapsed';

  function setFilterCollapsed(collapsed) {
    var card = document.getElementById('cakes-filter-card');
    var btn = document.getElementById('cakes-filter-collapse');
    if (!card || !btn) return;
    card.classList.toggle('is-collapsed', collapsed);
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    btn.setAttribute(
      'aria-label',
      collapsed ? i18nT('cakes.adv_expand_aria') : i18nT('cakes.adv_collapse_aria')
    );
    try {
      localStorage.setItem(FILTER_COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch (e) {
      /* ignore */
    }
  }

  function initFilterCollapse() {
    var btn = document.getElementById('cakes-filter-collapse');
    if (!btn) return;
    var collapsed = false;
    try {
      collapsed = localStorage.getItem(FILTER_COLLAPSE_KEY) === '1';
    } catch (e) {
      collapsed = false;
    }
    setFilterCollapsed(collapsed);
    btn.addEventListener('click', function () {
      var card = document.getElementById('cakes-filter-card');
      if (!card) return;
      setFilterCollapsed(!card.classList.contains('is-collapsed'));
    });
  }

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
      id: p.id || '',
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
        return rows
          .filter(function (p) {
            var cat = String(p.category || '').toLowerCase();
            return CAKE_CATEGORIES[cat] === true;
          })
          .map(mapApiProductToCake)
          .filter(Boolean);
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

  /** Inferred from title for the size/weight quick filter */
  function inferWeightKeys(cake) {
    var t = (String(cake.title) + ' ' + String(cake.description || '')).toLowerCase();
    var k = [];
    if (/bento|\b300\s*g\b|300g/.test(t)) k.push('bento');
    if (/\b500\s*g\b|500g/.test(t)) k.push('500g');
    if (/\b6[05]0\s*g\b|650g|600g/.test(t)) k.push('650g');
    if (/\b1\s*kg\b|1kg/.test(t)) k.push('1kg');
    if (/\b2\s*kg\b|2kg/.test(t)) k.push('2kg');
    if (/pieces|\bslice\b|slices/.test(t)) k.push('pieces');
    return k;
  }

  function labelForWeightKey(key) {
    if (key === 'bento') return '300g';
    if (key === 'pieces') return 'Pieces';
    return key || '';
  }

  function primaryWeightKey(keys) {
    if (!keys || !keys.length) return '';
    var i;
    for (i = 0; i < WEIGHT_CHIP_ORDER.length; i++) {
      if (keys.indexOf(WEIGHT_CHIP_ORDER[i]) !== -1) return WEIGHT_CHIP_ORDER[i];
    }
    return keys[0];
  }

  function normalizeCakeTitle(title) {
    return String(title || '')
      .toLowerCase()
      .replace(/\b(300\s*g|500\s*g|6[05]0\s*g|1\s*kg|2\s*kg|300g|500g|650g|600g|1kg|2kg)\b/gi, '')
      .replace(/\b(pieces|slice|slices)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function cakeFamilyKey(cake) {
    return String((cake && cake.category) || 'round') + '|' + normalizeCakeTitle(cake && cake.title);
  }

  function findFamily(cake) {
    var key = cakeFamilyKey(cake);
    var list = lastRenderedCakes || [];
    var out = [];
    list.forEach(function (c) {
      if (c && cakeFamilyKey(c) === key) out.push(c);
    });
    return out.length ? out : cake ? [cake] : [];
  }

  function idxForCake(cake) {
    var i;
    for (i = 0; i < catalogByIdx.length; i++) {
      if (catalogByIdx[i] === cake) return i;
    }
    return -1;
  }

  function hashNote(s) {
    var h = 0;
    var i;
    s = String(s || '');
    for (i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return String(Math.abs(h));
  }

  function getWaNumber() {
    if (window.PB_CONTACT && window.PB_CONTACT.whatsappNumber) {
      return String(window.PB_CONTACT.whatsappNumber).replace(/\D/g, '');
    }
    return '947228955477';
  }

  function tFallback(key, fallback) {
    var tr = i18nT(key);
    return tr !== key ? tr : fallback;
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

  function isDuplicateCopyCake(cake) {
    var url = String((cake && cake.imageUrl) || '');
    var title = String((cake && cake.title) || '');
    return /[\s_-]copy\b/i.test(url) || /[\s_-]copy\b/i.test(title);
  }

  function isUnnamedCake(cake) {
    return /^peoples bakers cake\s*\(\d+/i.test(String((cake && cake.title) || ''));
  }

  function displayCakeTitle(cake) {
    if (isUnnamedCake(cake)) {
      var tr = i18nT('cakes.unnamed_title');
      return tr !== 'cakes.unnamed_title' ? tr : 'Celebration cake';
    }
    return String((cake && cake.title) || 'Cake');
  }

  function displayCakeDescription(cake) {
    if (isUnnamedCake(cake)) {
      var d = i18nT('cakes.unnamed_desc');
      return d !== 'cakes.unnamed_desc'
        ? d
        : 'Handcrafted celebration cake — ask in-store for flavour, size, and price.';
    }
    return String((cake && cake.description) || '');
  }

  function cakeDedupeKey(cake) {
    return String((cake && cake.imageUrl) || cake.title || '')
      .toLowerCase()
      .replace(/\s+- copy/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function prepareCakes(cakes) {
    if (!Array.isArray(cakes)) return [];
    var seen = {};
    var out = [];
    cakes.forEach(function (c) {
      if (!c) return;
      if (isDuplicateCopyCake(c)) return;
      var key = cakeDedupeKey(c);
      if (key && seen[key]) return;
      if (key) seen[key] = true;
      out.push(c);
    });
    return out;
  }

  /** Occasion filter: printed = photo print line; gateau = data category gateau; birthday = party & celebration block */
  function renderCakeCard(cake, idx, cakeBucket) {
    catalogByIdx[idx] = cake;
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
    var priceLkr = parsePriceLkr(cake.price);
    var canOrderOnline = priceLkr != null && priceLkr > 0;
    var priceDisplay =
      priceLkr != null && priceLkr > 0 ? formatRsLabel(Math.round(priceLkr)) : cake.price || '';
    var cartPayload = encodeURIComponent(
      JSON.stringify({
        id: cake.id || ('cake-' + idx + '-' + slug),
        title: cake.title,
        priceLabel: cake.price,
        image: imgSrc,
      })
    );
    var flavourKeys = inferFlavourKeys(cake);
    var weightKeys = inferWeightKeys(cake);
    var weightKey = primaryWeightKey(weightKeys);
    var weightLabel = labelForWeightKey(weightKey);
    var priceAttr = priceLkr != null && !isNaN(priceLkr) ? String(Math.round(priceLkr)) : '';
    var flavAttr = flavourKeys.length ? escapeHtml(flavourKeys.join(' ')) : '';
    var weightAttr = weightKeys.length ? escapeHtml(weightKeys.join(' ')) : '';
    var qvLabel = tFallback('cakes.quick_view', 'Quick View');
    var addLabel = tFallback('cart.add_to_cart', 'Add to Cart');

    return (
      '<article class="cake-card' +
      featured +
      '" data-category="' +
      escapeHtml(cat) +
      '" data-cake-bucket="' +
      escapeHtml(bucket) +
      '" data-cake-idx="' +
      idx +
      '" data-price-lkr="' +
      priceAttr +
      '" data-price-label="' +
      escapeHtml(cake.price || '') +
      '" data-flavour-keys="' +
      flavAttr +
      '" data-weight-keys="' +
      weightAttr +
      '">' +
      '<div class="cake-card-media">' +
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
      '</div>' +
      '<div class="cake-card-body">' +
      (weightLabel
        ? '<div class="cake-card-meta"><span class="cake-card-weight">' +
          escapeHtml(weightLabel) +
          '</span></div>'
        : '') +
      '<h3>' +
      escapeHtml(displayCakeTitle(cake)) +
      '</h3>' +
      '<p>' +
      escapeHtml(displayCakeDescription(cake)) +
      '</p>' +
      '<div class="cake-card-footer">' +
      '<span class="price">' +
      escapeHtml(priceDisplay) +
      '</span>' +
      '<div class="cake-card-btns">' +
      '<button type="button" class="cake-quick-view">' +
      '<i class="fa-solid fa-eye" aria-hidden="true"></i> ' +
      escapeHtml(qvLabel) +
      '</button>' +
      (canOrderOnline
        ? '<button type="button" class="btn-add-cart-fresh btn-add-cart-fresh--sm" data-add-cart data-cart-payload="' +
          cartPayload +
          '"><i class="fa-solid fa-cart-plus" aria-hidden="true"></i> ' +
          escapeHtml(addLabel) +
          '</button>'
        : '') +
      '</div></div></div></article>'
    );
  }

  function isPrintedName(cake) {
    return /printed/i.test(String(cake && cake.title ? cake.title : ''));
  }

  function cakeNavBucket(cake) {
    if (isPrintedName(cake)) return 'printed';
    if (cake && cake.category === 'gateau') return 'gateau';
    return 'birthday';
  }

  function writeCategoryCounts(cakes) {
    var n = { all: 0, birthday: 0, printed: 0, gateau: 0, bento: 0, slices: 0 };
    var list = Array.isArray(cakes) ? cakes : [];
    n.all = list.length;
    list.forEach(function (c) {
      var b = cakeNavBucket(c);
      if (n[b] != null) n[b]++;
      var w = inferWeightKeys(c);
      if (w.indexOf('bento') !== -1) n.bento++;
      if (w.indexOf('pieces') !== -1) n.slices++;
    });
    Object.keys(n).forEach(function (k) {
      document.querySelectorAll('[data-filter-count="' + k + '"]').forEach(function (el) {
        el.textContent = String(n[k]);
      });
    });
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

  var cakePreview = (function () {
    var overlay = null;
    var imgEl, titleEl, priceEl, actionsEl, dialogEl, stageEl, loupeEl;
    var catEl, weightsEl, thumbsEl, msgEl, msgCountEl, waEl, addBtnEl, ratingEl;
    var originCard = null;
    var hideTimer = null;
    var cardBound = false;
    var loupeRaf = 0;
    var lastPointer = null;
    var holdTimer = null;
    var holdStart = null;
    var didHold = false;
    var modalState = { cake: null, family: [], qty: 1, note: '', weightKey: '' };

    function reduceMotion() {
      return !!(
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    }

    function isCoarsePointer() {
      return !!(
        window.matchMedia &&
        window.matchMedia('(pointer: coarse)').matches
      );
    }

    function isFinePointer() {
      return !!(
        window.matchMedia &&
        window.matchMedia('(pointer: fine)').matches
      );
    }

    function resetLoupe() {
      if (!overlay) return;
      overlay.classList.remove('is-hover-zoom', 'is-cake-zoomed', 'is-cake-holding');
      if (imgEl) {
        imgEl.style.transform = '';
        imgEl.style.transformOrigin = '';
        imgEl.style.transition = '';
      }
      if (loupeEl) {
        loupeEl.style.left = '';
        loupeEl.style.top = '';
        loupeEl.style.backgroundPosition = '';
        loupeEl.style.backgroundSize = '';
      }
      if (holdTimer) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      didHold = false;
    }

    function applyLoupe(pt) {
      if (!pt || reduceMotion() || !imgEl || !stageEl || !loupeEl) return;
      if (!overlay || !overlay.classList.contains('is-open')) return;
      if (overlay.classList.contains('is-cake-zoomed')) return;
      var rect = imgEl.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return;
      var x = (pt.clientX - rect.left) / rect.width;
      var y = (pt.clientY - rect.top) / rect.height;
      x = Math.max(0, Math.min(1, x));
      y = Math.max(0, Math.min(1, y));
      overlay.classList.add('is-hover-zoom');
      var stageRect = stageEl.getBoundingClientRect();
      var size = 180;
      loupeEl.style.left = pt.clientX - stageRect.left - size / 2 + 'px';
      loupeEl.style.top = pt.clientY - stageRect.top - size / 2 + 'px';
      loupeEl.style.backgroundPosition = x * 100 + '% ' + y * 100 + '%';
      loupeEl.style.backgroundSize = rect.width * 2.4 + 'px ' + rect.height * 2.4 + 'px';
    }

    function onStageMove(e) {
      if (!isFinePointer() || isCoarsePointer() || reduceMotion()) return;
      lastPointer = e;
      if (loupeRaf) return;
      loupeRaf = window.requestAnimationFrame(function () {
        loupeRaf = 0;
        applyLoupe(lastPointer);
      });
    }

    function onStageLeave() {
      overlay && overlay.classList.remove('is-hover-zoom');
      if (loupeEl) {
        loupeEl.style.left = '';
        loupeEl.style.top = '';
      }
    }

    function panZoom(pt) {
      if (!imgEl || !stageEl || !pt) return;
      var rect = stageEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      var x = ((pt.clientX - rect.left) / rect.width) * 100;
      var y = ((pt.clientY - rect.top) / rect.height) * 100;
      x = Math.max(0, Math.min(100, x));
      y = Math.max(0, Math.min(100, y));
      imgEl.style.transformOrigin = x + '% ' + y + '%';
    }

    function toggleTapZoom(pt) {
      if (reduceMotion() || !overlay || !imgEl) return;
      var on = overlay.classList.toggle('is-cake-zoomed');
      overlay.classList.remove('is-hover-zoom');
      if (on && pt) panZoom(pt);
      else {
        imgEl.style.transformOrigin = '50% 50%';
      }
    }

    function onTouchStart(e) {
      if (!isCoarsePointer() || !e.touches || !e.touches[0]) return;
      if (overlay.classList.contains('is-cake-zoomed')) return;
      var t = e.touches[0];
      holdStart = { clientX: t.clientX, clientY: t.clientY };
      didHold = false;
      holdTimer = window.setTimeout(function () {
        holdTimer = null;
        didHold = true;
        overlay.classList.add('is-cake-holding');
        applyLoupe(holdStart);
      }, 400);
    }

    function onTouchMove(e) {
      if (!isCoarsePointer() || !e.touches || !e.touches[0]) return;
      var t = e.touches[0];
      if (overlay.classList.contains('is-cake-zoomed')) {
        e.preventDefault();
        panZoom(t);
        return;
      }
      if (holdTimer && holdStart) {
        if (Math.abs(t.clientX - holdStart.clientX) > 12 || Math.abs(t.clientY - holdStart.clientY) > 12) {
          window.clearTimeout(holdTimer);
          holdTimer = null;
        }
      }
      if (overlay.classList.contains('is-cake-holding')) {
        e.preventDefault();
        applyLoupe(t);
      }
    }

    function onTouchEnd(e) {
      if (!isCoarsePointer()) return;
      var pt = (e.changedTouches && e.changedTouches[0]) || holdStart;
      if (holdTimer) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
      overlay.classList.remove('is-cake-holding', 'is-hover-zoom');
      if (!didHold && pt && e.target && e.target.closest && e.target.closest('.pb-cake-preview__stage')) {
        toggleTapZoom(pt);
      }
      didHold = false;
      holdStart = null;
    }

    function onKey(e) {
      if (e.key === 'Escape') close();
    }

    function isOpen() {
      return !!(overlay && !overlay.hidden && overlay.classList.contains('is-open'));
    }

    function cakeSlug(cake) {
      return String((cake && cake.title) || 'cake')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48);
    }

    function basePayload(cake) {
      var idx = idxForCake(cake);
      if (idx < 0) idx = 0;
      return {
        id: (cake && cake.id) || ('cake-' + idx + '-' + cakeSlug(cake)),
        title: (cake && cake.title) || '',
        priceLabel: (cake && cake.price) || '',
        image: encodeRelativeImageUrl((cake && cake.imageUrl) || ''),
      };
    }

    function currentPayload() {
      var p = basePayload(modalState.cake);
      var note = (modalState.note || '').trim();
      p.qty = modalState.qty || 1;
      if (note) {
        p.note = note;
        p.title = p.title + ' — "' + note + '"';
        p.id = p.id + '-msg-' + hashNote(note);
      }
      return p;
    }

    function syncCartButton() {
      if (!addBtnEl) return;
      var cake = modalState.cake;
      var priceLkr = cake ? parsePriceLkr(cake.price) : null;
      var canOrder = priceLkr != null && priceLkr > 0;
      addBtnEl.hidden = !canOrder;
      addBtnEl.disabled = !canOrder;
      addBtnEl.setAttribute('data-cart-payload', encodeURIComponent(JSON.stringify(currentPayload())));
    }

    function syncWaLink() {
      if (!waEl || !modalState.cake) return;
      var cake = modalState.cake;
      var weight = labelForWeightKey(modalState.weightKey);
      var text = "Hi Peoples Bakers, I'd like to order: " + displayCakeTitle(cake);
      if (weight) text += ' (' + weight + ')';
      if (cake.price) text += ' — ' + cake.price;
      var note = (modalState.note || '').trim();
      if (note) text += '. Message on cake: "' + note + '"';
      waEl.setAttribute(
        'href',
        'https://wa.me/' + getWaNumber() + '?text=' + encodeURIComponent(text)
      );
    }

    function syncQtyUi() {
      var valEl = overlay && overlay.querySelector('.pb-cake-preview__qty .pb-qty__val');
      var decBtn = overlay && overlay.querySelector('[data-qty-dec]');
      if (valEl) valEl.textContent = String(modalState.qty);
      if (decBtn) decBtn.disabled = modalState.qty <= 1;
    }

    function setModalImage(src, alt) {
      if (!imgEl) return;
      imgEl.src = src || '';
      imgEl.alt = alt || '';
      if (loupeEl) {
        loupeEl.style.backgroundImage = src ? 'url("' + src + '")' : 'none';
      }
    }

    function applySelectedCake(cake, weightKey) {
      if (!cake) return;
      modalState.cake = cake;
      modalState.weightKey = weightKey || primaryWeightKey(inferWeightKeys(cake));
      var priceLkr = parsePriceLkr(cake.price);
      var priceDisplay =
        priceLkr != null && priceLkr > 0 ? formatRsLabel(Math.round(priceLkr)) : cake.price || '';
      titleEl.textContent = displayCakeTitle(cake);
      if (catEl) catEl.textContent = categoryLabel(cake.category || 'round');
      priceEl.textContent = priceDisplay;
      if (ratingEl) {
        if (cake.rating) {
          ratingEl.hidden = false;
          ratingEl.textContent = String(cake.rating);
        } else {
          ratingEl.hidden = true;
        }
      }
      setModalImage(
        encodeRelativeImageUrl(cake.imageUrl || ''),
        cake.imageAlt || cake.title || ''
      );
      if (weightsEl) {
        weightsEl.querySelectorAll('[data-weight-key]').forEach(function (btn) {
          var on = btn.getAttribute('data-weight-key') === modalState.weightKey;
          btn.classList.toggle('is-active', on);
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      }
      if (thumbsEl) {
        thumbsEl.querySelectorAll('[data-thumb-src]').forEach(function (btn) {
          var src = encodeRelativeImageUrl(cake.imageUrl || '');
          btn.classList.toggle('is-active', btn.getAttribute('data-thumb-src') === src);
        });
      }
      syncCartButton();
      syncWaLink();
    }

    function uniqueWeights(family) {
      var seen = {};
      var chips = [];
      (family || []).forEach(function (c) {
        inferWeightKeys(c).forEach(function (k) {
          if (!k || seen[k]) return;
          seen[k] = true;
          chips.push({ key: k, cake: c, label: labelForWeightKey(k) });
        });
      });
      chips.sort(function (a, b) {
        return WEIGHT_CHIP_ORDER.indexOf(a.key) - WEIGHT_CHIP_ORDER.indexOf(b.key);
      });
      return chips;
    }

    function uniqueThumbs(family, cake) {
      var seen = {};
      var thumbs = [];
      function addSrc(src, alt, fromCake) {
        src = encodeRelativeImageUrl(src || '');
        if (!src || seen[src]) return;
        seen[src] = true;
        thumbs.push({ src: src, alt: alt || '', cake: fromCake || cake });
      }
      if (cake && Array.isArray(cake.gallery)) {
        cake.gallery.forEach(function (g) {
          addSrc(typeof g === 'string' ? g : g && g.src, (g && g.alt) || cake.imageAlt, cake);
        });
      }
      (family || []).forEach(function (c) {
        addSrc(c.imageUrl, c.imageAlt || c.title, c);
      });
      return thumbs;
    }

    function build() {
      if (overlay) return;
      overlay = document.createElement('div');
      overlay.className = 'pb-cake-preview';
      overlay.hidden = true;
      overlay.innerHTML =
        '<div class="pb-cake-preview__veil" aria-hidden="true"></div>' +
        '<div class="pb-cake-preview__dialog" role="dialog" aria-modal="true" aria-labelledby="pb-cake-title">' +
          '<button type="button" class="pb-cake-preview__close" data-cake-close aria-label="Close">' +
            '<i class="fa-solid fa-xmark" aria-hidden="true"></i>' +
          '</button>' +
          '<div class="pb-cake-preview__media">' +
            '<span class="pb-cake-preview__media-glow" aria-hidden="true"></span>' +
            '<div class="pb-cake-preview__stage">' +
              '<img id="pb-cake-img" src="" alt="" decoding="async">' +
              '<span class="pb-cake-preview__loupe" data-cake-loupe aria-hidden="true"></span>' +
            '</div>' +
            '<div class="pb-cake-preview__thumbs" data-cake-thumbs hidden></div>' +
          '</div>' +
          '<div class="pb-cake-preview__body">' +
            '<p class="pb-cake-preview__kicker"><i class="fa-solid fa-cake-candles" aria-hidden="true"></i> Handcrafted cake</p>' +
            '<h3 class="pb-cake-preview__title" id="pb-cake-title"></h3>' +
            '<p class="pb-cake-preview__category" id="pb-cake-category"></p>' +
            '<p class="pb-cake-preview__rating" id="pb-cake-rating" hidden></p>' +
            '<p class="pb-cake-preview__price" id="pb-cake-price"></p>' +
            '<div class="pb-cake-preview__weights" data-cake-weights hidden></div>' +
            '<label class="pb-cake-preview__msg">' +
              '<span>Name / Message on Cake</span>' +
              '<input type="text" id="pb-cake-msg" maxlength="' +
              MSG_MAX +
              '" autocomplete="off" placeholder="Happy Birthday">' +
              '<small><span data-cake-msg-count>0</span>/' +
              MSG_MAX +
              '</small>' +
            '</label>' +
            '<div class="pb-cake-preview__actions" id="pb-cake-actions">' +
              '<div class="pb-cake-preview__cart">' +
                '<div class="pb-qty pb-cake-preview__qty">' +
                  '<button type="button" class="pb-qty__btn" data-qty-dec aria-label="Decrease quantity"><i class="fa-solid fa-minus" aria-hidden="true"></i></button>' +
                  '<span class="pb-qty__val" aria-live="polite">1</span>' +
                  '<button type="button" class="pb-qty__btn" data-qty-inc aria-label="Increase quantity"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>' +
                '</div>' +
                '<button type="button" class="btn-add-cart-fresh pb-cake-preview__add" data-add-cart data-cart-payload="">' +
                  '<i class="fa-solid fa-cart-plus" aria-hidden="true"></i> Add to Cart' +
                '</button>' +
              '</div>' +
              '<a class="pb-cake-preview__wa" data-cake-wa href="https://wa.me/947228955477" target="_blank" rel="noopener noreferrer">' +
                '<i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Order via WhatsApp' +
              '</a>' +
              '<a class="pb-cake-preview__order" href="order.html">More order options</a>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);
      imgEl = overlay.querySelector('#pb-cake-img');
      titleEl = overlay.querySelector('#pb-cake-title');
      priceEl = overlay.querySelector('#pb-cake-price');
      catEl = overlay.querySelector('#pb-cake-category');
      ratingEl = overlay.querySelector('#pb-cake-rating');
      actionsEl = overlay.querySelector('#pb-cake-actions');
      dialogEl = overlay.querySelector('.pb-cake-preview__dialog');
      stageEl = overlay.querySelector('.pb-cake-preview__stage');
      loupeEl = overlay.querySelector('[data-cake-loupe]');
      weightsEl = overlay.querySelector('[data-cake-weights]');
      thumbsEl = overlay.querySelector('[data-cake-thumbs]');
      msgEl = overlay.querySelector('#pb-cake-msg');
      msgCountEl = overlay.querySelector('[data-cake-msg-count]');
      waEl = overlay.querySelector('[data-cake-wa]');
      addBtnEl = overlay.querySelector('.pb-cake-preview__add');
      overlay.addEventListener('click', function (e) {
        if (
          e.target.closest('[data-cake-close]') ||
          e.target.classList.contains('pb-cake-preview__veil')
        ) {
          close();
        }
      });
      if (stageEl) {
        stageEl.addEventListener('mousemove', onStageMove);
        stageEl.addEventListener('mouseenter', onStageMove);
        stageEl.addEventListener('mouseleave', onStageLeave);
        stageEl.addEventListener('touchstart', onTouchStart, { passive: true });
        stageEl.addEventListener('touchmove', onTouchMove, { passive: false });
        stageEl.addEventListener('touchend', onTouchEnd);
        stageEl.addEventListener('touchcancel', onTouchEnd);
      }
      if (weightsEl) {
        weightsEl.addEventListener('click', function (e) {
          var btn = e.target.closest('[data-weight-key]');
          if (!btn) return;
          var key = btn.getAttribute('data-weight-key');
          var i;
          var match = null;
          for (i = 0; i < modalState.family.length; i++) {
            var keys = inferWeightKeys(modalState.family[i]);
            if (keys.indexOf(key) === -1) continue;
            if (primaryWeightKey(keys) === key) {
              match = modalState.family[i];
              break;
            }
            if (!match) match = modalState.family[i];
          }
          if (match) {
            // #region agent log
            fetch('http://127.0.0.1:7505/ingest/4aff59ea-ea1c-4b76-985d-93d083b5aa7f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d114ee'},body:JSON.stringify({sessionId:'d114ee',runId:'post-fix',hypothesisId:'E',location:'cakes-page.js:weightChip',message:'sku switch',data:{key:key,title:match.title,price:match.price,chipCount:(uniqueWeights(modalState.family)||[]).length},timestamp:Date.now()})}).catch(function(){});
            // #endregion
            applySelectedCake(match, key);
          }
        });
      }
      if (thumbsEl) {
        thumbsEl.addEventListener('click', function (e) {
          var btn = e.target.closest('[data-thumb-src]');
          if (!btn) return;
          var src = btn.getAttribute('data-thumb-src');
          var i;
          for (i = 0; i < modalState.family.length; i++) {
            if (encodeRelativeImageUrl(modalState.family[i].imageUrl || '') === src) {
              applySelectedCake(modalState.family[i]);
              return;
            }
          }
          setModalImage(src, btn.getAttribute('aria-label') || '');
        });
      }
      if (msgEl) {
        msgEl.addEventListener('input', function () {
          modalState.note = msgEl.value || '';
          if (msgCountEl) msgCountEl.textContent = String(modalState.note.length);
          syncCartButton();
          syncWaLink();
        });
      }
      if (actionsEl) {
        actionsEl.addEventListener('click', function (e) {
          if (e.target.closest('[data-qty-inc]')) {
            modalState.qty = Math.min(99, modalState.qty + 1);
            syncQtyUi();
            syncCartButton();
          } else if (e.target.closest('[data-qty-dec]')) {
            modalState.qty = Math.max(1, modalState.qty - 1);
            syncQtyUi();
            syncCartButton();
          }
        });
      }
    }

    function fill(card) {
      var idx = parseInt(card.getAttribute('data-cake-idx'), 10);
      var cake = !isNaN(idx) ? catalogByIdx[idx] : null;
      if (!cake) {
        cake = {
          title: (card.querySelector('.cake-card-body h3') || {}).textContent || '',
          price: card.getAttribute('data-price-label') || '',
          imageUrl: (card.querySelector('.cake-card-img') || {}).getAttribute('src') || '',
          category: card.getAttribute('data-category') || 'round',
        };
      }
      modalState.family = findFamily(cake);
      modalState.qty = 1;
      modalState.note = '';
      if (msgEl) msgEl.value = '';
      if (msgCountEl) msgCountEl.textContent = '0';
      syncQtyUi();

      var chips = uniqueWeights(modalState.family);
      if (weightsEl) {
        if (chips.length) {
          weightsEl.hidden = false;
          weightsEl.innerHTML = chips
            .map(function (chip) {
              return (
                '<button type="button" class="pb-cake-preview__chip" data-weight-key="' +
                escapeHtml(chip.key) +
                '" aria-pressed="false">' +
                escapeHtml(chip.label) +
                '</button>'
              );
            })
            .join('');
        } else {
          weightsEl.hidden = true;
          weightsEl.innerHTML = '';
        }
      }

      var thumbs = uniqueThumbs(modalState.family, cake);
      if (thumbsEl) {
        if (thumbs.length > 1) {
          thumbsEl.hidden = false;
          thumbsEl.innerHTML = thumbs
            .map(function (th) {
              return (
                '<button type="button" class="pb-cake-preview__thumb" data-thumb-src="' +
                escapeHtml(th.src) +
                '" aria-label="' +
                escapeHtml(th.alt || 'Cake photo') +
                '"><img src="' +
                escapeHtml(th.src) +
                '" alt=""></button>'
              );
            })
            .join('');
        } else {
          thumbsEl.hidden = true;
          thumbsEl.innerHTML = '';
        }
      }

      applySelectedCake(cake);
    }

    function open(card) {
      build();
      if (hideTimer) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (originCard && originCard !== card) {
        originCard.classList.remove('is-cake-previewing');
      }
      originCard = card;
      fill(card);
      resetLoupe();
      overlay.hidden = false;
      overlay.classList.remove('is-open', 'is-hover-zoom', 'is-cake-zoomed');
      overlay.classList.add('is-entering');
      overlay.offsetWidth;
      overlay.classList.add('is-open');
      overlay.classList.remove('is-entering');
      card.classList.add('is-cake-previewing');
      document.body.classList.add('cake-preview-open');
      document.addEventListener('keydown', onKey, true);
      // #region agent log
      fetch('http://127.0.0.1:7505/ingest/4aff59ea-ea1c-4b76-985d-93d083b5aa7f',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'d114ee'},body:JSON.stringify({sessionId:'d114ee',runId:'post-fix',hypothesisId:'C',location:'cakes-page.js:previewOpen',message:'quick-view open',data:{bodyLock:document.body.classList.contains('cake-preview-open'),chips:uniqueWeights(modalState.family).map(function(c){return c.key;})},timestamp:Date.now()})}).catch(function(){});
      // #endregion
      var closeBtn = overlay.querySelector('[data-cake-close]');
      if (closeBtn && typeof closeBtn.focus === 'function') {
        try {
          closeBtn.focus();
        } catch (err) {}
      }
    }

    function close() {
      if (!overlay) return;
      if (overlay.hidden && !overlay.classList.contains('is-open')) return;
      resetLoupe();
      overlay.classList.remove('is-open', 'is-entering', 'is-hover-zoom', 'is-cake-zoomed');
      document.body.classList.remove('cake-preview-open');
      if (originCard) originCard.classList.remove('is-cake-previewing');
      originCard = null;
      document.removeEventListener('keydown', onKey, true);
      var delay = reduceMotion() ? 0 : 280;
      hideTimer = window.setTimeout(function () {
        hideTimer = null;
        overlay.hidden = true;
      }, delay);
    }

    function closeNow() {
      if (!overlay) return;
      if (hideTimer) {
        window.clearTimeout(hideTimer);
        hideTimer = null;
      }
      resetLoupe();
      overlay.classList.remove('is-open', 'is-entering', 'is-hover-zoom', 'is-cake-zoomed');
      overlay.hidden = true;
      document.body.classList.remove('cake-preview-open');
      if (originCard) originCard.classList.remove('is-cake-previewing');
      originCard = null;
      document.removeEventListener('keydown', onKey, true);
    }

    function bindCards() {
      if (cardBound) return;
      cardBound = true;
      document.addEventListener('click', function (e) {
        var qv = e.target.closest('.cake-quick-view');
        if (qv) {
          var qvCard = qv.closest('.cakes-catalog-groups .cake-card');
          if (!qvCard) return;
          e.preventDefault();
          open(qvCard);
          return;
        }
        var card = e.target.closest('.cakes-catalog-groups .cake-card');
        if (!card) return;
        if (e.target.closest('a, [data-add-cart], .cake-card-btns, .pb-qty, input, textarea, label')) {
          return;
        }
        if (originCard === card && isOpen()) close();
        else open(card);
      });
    }

    bindCards();

    return {
      open: open,
      close: close,
      closeNow: closeNow,
      isOpen: isOpen,
      origin: function () {
        return originCard;
      },
    };
  })();

  function renderCakes(cakes) {
    var host = document.querySelector('.cakes-catalog-groups');
    if (!host) return;
    if (cakePreview && cakePreview.isOpen()) cakePreview.closeNow();
    catalogByIdx = [];

    if (!Array.isArray(cakes) || !cakes.length) {
      lastRenderedCakes = null;
      host.setAttribute('aria-busy', 'false');
      host.innerHTML = '';
      writeCategoryCounts([]);
      return;
    }

    lastRenderedCakes = cakes = prepareCakes(cakes);

    if (!cakes.length) {
      lastRenderedCakes = null;
      host.setAttribute('aria-busy', 'false');
      host.innerHTML = '';
      writeCategoryCounts([]);
      return;
    }

    var idx = 0;
    var cardsHtml = cakes
      .map(function (cake) {
        return renderCakeCard(cake, idx++, cakeNavBucket(cake));
      })
      .join('');

    host.setAttribute('aria-busy', 'false');
    host.innerHTML = '<div class="cakes-page-grid">' + cardsHtml + '</div>';
    writeCategoryCounts(cakes);
    applyCatalogI18n();
    applyCakeVisibility();
    sortCakeGrids();
  }

  function getActiveOccasionFilter() {
    var active = document.querySelector('.cakes-cat-item.is-active');
    return (active && active.getAttribute('data-filter')) || 'all';
  }

  function applyCakeVisibility() {
    if (
      document.getElementById('cakes-price-min') ||
      document.getElementById('cakes-adv-checks') ||
      document.getElementById('cakes-adv-weights')
    ) {
      readAdvStateFromForm();
    }
    var occ = getActiveOccasionFilter();
    var cards = document.querySelectorAll('.cakes-catalog-groups .cake-card');
    var visible = 0;
    cards.forEach(function (card) {
      var show = cardMatchesFilters(card, occ);
      card.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });
    updateEmptyState(visible);
    var el = document.getElementById('cakes-result-count');
    if (el) {
      if (visible === 1) {
        var one = i18nT('cakes.live_count_one');
        el.textContent = one === 'cakes.live_count_one' ? 'Showing 1 cake' : one;
      } else {
        var many = i18nT('cakes.showing_n', { count: String(visible) });
        el.textContent = many === 'cakes.showing_n' ? 'Showing ' + visible + ' cakes' : many;
      }
    }
    return visible;
  }

  function updateEmptyState(visible) {
    var host = document.querySelector('.cakes-catalog-groups');
    if (!host) return;
    var panel = host.querySelector('.cakes-no-results');
    if (visible > 0) {
      if (panel) panel.remove();
      return;
    }
    if (panel) return;
    panel = document.createElement('div');
    panel.className = 'cakes-no-results';
    panel.setAttribute('role', 'status');
    panel.innerHTML =
      '<i class="fa-solid fa-magnifying-glass cakes-no-results__icon" aria-hidden="true"></i>' +
      '<h3>' +
      escapeHtml(i18nT('cakes.no_results_h')) +
      '</h3>' +
      '<p>' +
      escapeHtml(i18nT('cakes.no_results_p')) +
      '</p>' +
      '<button type="button" class="btn cakes-no-results__reset" data-remove-filter="all">' +
      escapeHtml(i18nT('cakes.tag_clear_all')) +
      '</button>';
    host.appendChild(panel);
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
    updatePricePills();
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
    var wch = document.querySelectorAll('#cakes-adv-weights input[type="checkbox"]:checked');
    var wt = [];
    for (var j = 0; j < wch.length; j++) {
      var wv = wch[j].getAttribute('value');
      if (wv) wt.push(wv);
    }
    advFilterState = {
      min: minEl ? +minEl.value : 0,
      max: maxEl ? +maxEl.value : PRICE_SLIDER_MAX,
      flavours: fl,
      weights: wt,
    };
  }

  function syncShapeChipStyles() {
    document.querySelectorAll('#cakes-shape-chips .cakes-shape-chip').forEach(function (lbl) {
      var inp = lbl.querySelector('input');
      lbl.classList.toggle('is-selected', !!(inp && inp.checked));
    });
  }

  function readShapeChips() {
    selectedShapes = [];
    document.querySelectorAll('#cakes-shape-chips input[type="checkbox"]:checked').forEach(function (inp) {
      if (inp.value) selectedShapes.push(inp.value);
    });
  }

  function setPriceBand(band) {
    priceBand = band || 'all';
    document.querySelectorAll('.cakes-price-pill').forEach(function (btn) {
      var on = btn.getAttribute('data-price-band') === priceBand;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function syncCategoryHash(filter) {
    var path = window.location.pathname + window.location.search;
    try {
      if (!filter || filter === 'all') {
        history.replaceState(null, '', path);
      } else {
        history.replaceState(null, '', path + '#' + filter);
      }
    } catch (err) {
      window.location.hash = !filter || filter === 'all' ? '' : filter;
    }
  }

  function resetAllFilters(opts) {
    opts = opts || {};
    priceBand = 'all';
    selectedShapes = [];
    currentSort = 'default';
    textSearchQuery = '';
    var search = document.getElementById('cakes-search');
    if (search) search.value = '';
    var clearBtn = document.getElementById('cakes-search-clear');
    if (clearBtn) clearBtn.hidden = true;
    var sortEl = document.getElementById('cakes-sort-select');
    if (sortEl) sortEl.value = 'default';
    document.querySelectorAll('#cakes-shape-chips input[type="checkbox"]').forEach(function (x) {
      x.checked = false;
    });
    setPriceBand('all');
    syncShapeChipStyles();
    advFilterState = { min: 0, max: PRICE_SLIDER_MAX, flavours: [], weights: [] };
    document.querySelectorAll('#cakes-adv-checks input[type="checkbox"], #cakes-adv-weights input[type="checkbox"]').forEach(function (x) {
      x.checked = false;
    });
    var minEl = document.getElementById('cakes-price-min');
    var maxEl = document.getElementById('cakes-price-max');
    if (minEl) minEl.value = '0';
    if (maxEl) maxEl.value = String(PRICE_SLIDER_MAX);
    var allBtn = document.querySelector('.cakes-cat-item[data-filter="all"]');
    if (allBtn) setActiveFilterButton(allBtn);
    syncCategoryHash('all');
    applyCakeVisibility();
    if (opts.closeDrawer) closeMobileFilterPanel();
  }

  function initAdvancedFilters() {
    if (advFiltersBound) return;
    var sidebar = document.getElementById('cakes-sidebar-filters');
    if (!sidebar) return;
    advFiltersBound = true;
    if (!sidebar.hasAttribute('tabindex')) sidebar.setAttribute('tabindex', '-1');

    document.querySelectorAll('.cakes-price-pill').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setPriceBand(btn.getAttribute('data-price-band') || 'all');
        applyCakeVisibility();
      });
    });

    document.querySelectorAll('#cakes-shape-chips input[type="checkbox"]').forEach(function (box) {
      box.addEventListener('change', function () {
        readShapeChips();
        syncShapeChipStyles();
        applyCakeVisibility();
      });
    });

    var sortEl = document.getElementById('cakes-sort-select');
    if (sortEl) {
      sortEl.addEventListener('change', function () {
        currentSort = sortEl.value || 'default';
        sortCakeGrids();
        applyCakeVisibility();
      });
    }

    var resetBtn = document.getElementById('cakes-reset-filters');
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        resetAllFilters({ closeDrawer: true });
      });
    }

    var openBtn = document.getElementById('cakes-filter-open');
    var closeBtn = document.getElementById('cakes-filter-close');
    var overlay = document.getElementById('cakes-filter-overlay');
    if (openBtn) {
      openBtn.addEventListener('click', function () {
        if (window.innerWidth <= 900) openMobileFilterPanel();
      });
    }
    if (closeBtn) closeBtn.addEventListener('click', closeMobileFilterPanel);
    if (overlay) overlay.addEventListener('click', closeMobileFilterPanel);

    document.addEventListener('keydown', onCakesFilterKeydown);

    window.addEventListener('resize', function () {
      if (window.innerWidth > 900) closeMobileFilterPanel();
    });

    setPriceBand(priceBand);
    syncShapeChipStyles();
  }

  function setActiveFilterButton(clicked) {
    if (!clicked) return;
    var filter = clicked.getAttribute('data-filter');
    document.querySelectorAll('.cakes-cat-item').forEach(function (b) {
      var isAct = b.getAttribute('data-filter') === filter;
      b.classList.toggle('is-active', isAct);
      b.setAttribute('aria-pressed', isAct ? 'true' : 'false');
    });
  }

  function bindCakeSearch() {
    var input = document.getElementById('cakes-search');
    var clearBtn = document.getElementById('cakes-search-clear');
    if (!input || input.getAttribute('data-cakes-search-bound')) return;
    input.setAttribute('data-cakes-search-bound', '1');

    function run() {
      textSearchQuery = String(input.value || '')
        .toLowerCase()
        .trim();
      if (clearBtn) clearBtn.hidden = !textSearchQuery;
      applyCakeVisibility();
    }

    input.addEventListener('input', run);
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        input.value = '';
        run();
        input.focus();
      });
    }

    document.addEventListener('click', function (e) {
      var reset = e.target.closest('.cakes-no-results__reset');
      if (!reset) return;
      resetAllFilters({ closeDrawer: true });
    });
  }

  function bindFilters() {
    if (shapeFiltersBound) return;
    var zone = document.querySelector('.cakes-catalog-section');
    if (!zone) return;
    shapeFiltersBound = true;

    zone.addEventListener('click', function (e) {
      var btn = e.target.closest('.cakes-cat-item');
      if (!btn || !zone.contains(btn)) return;
      e.preventDefault();
      var filter = btn.getAttribute('data-filter');
      if (filter == null) return;
      setActiveFilterButton(btn);
      syncCategoryHash(filter);
      applyCakeVisibility();
      var gridAnchor = document.getElementById('cakes-grid-anchor');
      if (gridAnchor && window.innerWidth > 900) {
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

    function hashToCakeFilter() {
      var h = String(window.location.hash || '')
        .replace(/^#/, '')
        .toLowerCase();
      if (h === 'print' || h === 'photo') h = 'printed';
      if (h === 'slice' || h === 'piece' || h === 'pieces') h = 'slices';
      if (
        h !== 'birthday' &&
        h !== 'printed' &&
        h !== 'gateau' &&
        h !== 'all' &&
        h !== 'bento' &&
        h !== 'slices'
      ) {
        return null;
      }
      return h;
    }

    function applyHashFilter() {
      var h = hashToCakeFilter();
      if (!h) return;
      var btn = document.querySelector('.cakes-cat-item[data-filter="' + h + '"]');
      if (!btn) return;
      setActiveFilterButton(btn);
      applyCakeVisibility();
    }

    function finish(cakes) {
      renderCakes(cakes);
      bindFilters();
      bindCakeSearch();
      initAdvancedFilters();
      setActiveFilterButton(
        document.querySelector('.cakes-cat-item.is-active') ||
          document.querySelector('.cakes-cat-item')
      );
      applyCakeVisibility();
      applyHashFilter();
      if (!window.__pbCakeHashBound) {
        window.__pbCakeHashBound = true;
        window.addEventListener('hashchange', applyHashFilter);
      }
    }

    if (embedded && embedded.length) {
      finish(embedded);
      return;
    }

    if (window.location.protocol === 'file:') {
      showError(i18nT('cakes.err_load'));
      return;
    }

    fetch(resolveCatalogUrl(apiUrl))
      .then(function (res) {
        if (!res.ok) {
          throw new Error('Could not load cakes (' + res.status + ')');
        }
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data) || !data.length) {
          throw new Error('Invalid cakes data');
        }
        finish(data);
      })
      .catch(function () {
        return fetchProductsFromApi().then(function (apiCakes) {
          if (apiCakes.length) {
            finish(apiCakes);
            return;
          }
          throw new Error('No cakes to show');
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
      var active = document.querySelector('.cakes-cat-item.is-active');
      var filter = (active && active.getAttribute('data-filter')) || 'all';
      renderCakes(data);
      setActiveFilterButton(
        document.querySelector('.cakes-cat-item[data-filter="' + filter + '"]') ||
          document.querySelector('.cakes-cat-item')
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
