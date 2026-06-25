/**
 * Peoples Bakers — shopping basket (localStorage).
 * Opens a slide-over panel; works on static hosting.
 */
(function () {
  var STORAGE_KEY = 'peoples-bakers-cart-v1';

  function loadCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(
      new CustomEvent('peoples-cart-changed', { detail: { items: items } })
    );
  }

  function parseAmount(label) {
    if (label == null || label === '') return null;
    var nums = String(label).replace(/,/g, '').match(/\d+(?:\.\d+)?/g);
    if (!nums || !nums.length) return null;
    var n = parseFloat(nums[nums.length - 1]);
    return isNaN(n) ? null : n;
  }

  function getCount(items) {
    return items.reduce(function (sum, line) {
      return sum + (line.qty || 0);
    }, 0);
  }

  function addFromPayload(payload) {
    if (!payload || !payload.id || !payload.title) return;
    var items = loadCart();
    var amount =
      payload.amount != null ? payload.amount : parseAmount(payload.priceLabel);
    var idx = items.findIndex(function (l) {
      return l.id === payload.id;
    });
    if (idx >= 0) {
      items[idx].qty = (items[idx].qty || 0) + (payload.qty || 1);
    } else {
      items.push({
        id: payload.id,
        title: payload.title,
        priceLabel: payload.priceLabel || '',
        amount: amount,
        image: payload.image || '',
        qty: payload.qty || 1,
      });
    }
    saveCart(items);
  }

  function setQty(id, qty) {
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

  function removeLine(id) {
    saveCart(
      loadCart().filter(function (l) {
        return l.id !== id;
      })
    );
  }

  function clearCart() {
    saveCart([]);
  }

  function formatRs(n) {
    if (n == null || isNaN(n)) return null;
    try {
      return (
        'Rs. ' +
        n.toLocaleString('en-LK', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    } catch (e) {
      return 'Rs. ' + n.toFixed(2);
    }
  }

  function i18nT(key, vars) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key, vars);
    }
    return key;
  }

  function updateBadges() {
    var n = getCount(loadCart());
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = String(n);
      if (n > 0) {
        el.removeAttribute('hidden');
        el.setAttribute('aria-label', i18nT('cart.aria_items', { n: n }));
      } else {
        el.setAttribute('hidden', '');
        el.setAttribute('aria-label', i18nT('cart.aria_empty'));
      }
    });
  }

  function computeSubtotal(items) {
    var sum = 0;
    var ok = true;
    items.forEach(function (l) {
      var a = l.amount;
      if (a == null || isNaN(a)) ok = false;
      else sum += a * (l.qty || 1);
    });
    return ok && items.length ? sum : null;
  }

  function renderLines() {
    var root = document.getElementById('cart-drawer');
    if (!root) return;
    var list = root.querySelector('[data-cart-lines]');
    var subEl = root.querySelector('[data-cart-subtotal]');
    var emptyEl = root.querySelector('[data-cart-empty]');
    if (!list || !subEl) return;

    var items = loadCart();
    if (!items.length) {
      list.innerHTML = '';
      emptyEl && emptyEl.removeAttribute('hidden');
      subEl.textContent = '—';
      return;
    }
    emptyEl && emptyEl.setAttribute('hidden', '');

    var sub = computeSubtotal(items);
    subEl.textContent = sub != null ? formatRs(sub) : i18nT('cart.subtotal_see');

    list.innerHTML = items
      .map(function (line) {
        var img = line.image
          ? '<img src="' +
            escapeHtml(line.image) +
            '" alt="" class="cart-line-img" loading="lazy" decoding="async">'
          : '<div class="cart-line-img cart-line-img--ph" aria-hidden="true"><i class="fa-solid fa-image"></i></div>';
        var lineSub =
          line.amount != null && !isNaN(line.amount)
            ? formatRs(line.amount * (line.qty || 1))
            : escapeHtml(line.priceLabel || '');
        return (
          '<li class="cart-line" data-id="' +
          escapeHtml(line.id) +
          '">' +
          img +
          '<div class="cart-line-main">' +
          '<p class="cart-line-title">' +
          escapeHtml(line.title) +
          '</p>' +
          '<p class="cart-line-meta">' +
          escapeHtml(line.priceLabel || '') +
          '</p>' +
          '<div class="cart-line-controls">' +
          '<button type="button" class="cart-qty-btn" data-cart-dec="' +
          escapeHtml(line.id) +
          '" aria-label="' +
          escapeHtml(i18nT('cart.aria_dec')) +
          '"><i class="fa-solid fa-minus"></i></button>' +
          '<span class="cart-qty-val">' +
          String(line.qty || 1) +
          '</span>' +
          '<button type="button" class="cart-qty-btn" data-cart-inc="' +
          escapeHtml(line.id) +
          '" aria-label="' +
          escapeHtml(i18nT('cart.aria_inc')) +
          '"><i class="fa-solid fa-plus"></i></button>' +
          '<button type="button" class="cart-remove-btn" data-cart-remove="' +
          escapeHtml(line.id) +
          '" aria-label="' +
          escapeHtml(i18nT('cart.aria_remove')) +
          '"><i class="fa-solid fa-trash-can"></i></button>' +
          '</div></div>' +
          '<div class="cart-line-sum">' +
          lineSub +
          '</div></li>'
        );
      })
      .join('');
  }

  function escapeHtml(text) {
    if (text == null) return '';
    var div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  function showToast(message) {
    var t = document.getElementById('cart-toast');
    if (!t) return;
    t.textContent = message
      ? i18nT('cart.toast_prefix') + message
      : i18nT('cart.toast_added');
    t.classList.add('is-visible');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      t.classList.remove('is-visible');
    }, 2600);
  }

  function openDrawer() {
    var root = document.getElementById('cart-drawer');
    var overlay = document.getElementById('cart-overlay');
    if (!root || !overlay) return;
    root.classList.add('is-open');
    overlay.classList.add('is-open');
    root.setAttribute('aria-hidden', 'false');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-drawer-open');
    document.querySelectorAll('[data-cart-open]').forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'true');
    });
    renderLines();
  }

  function closeDrawer() {
    var root = document.getElementById('cart-drawer');
    var overlay = document.getElementById('cart-overlay');
    if (!root || !overlay) return;
    root.classList.remove('is-open');
    overlay.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-drawer-open');
    document.querySelectorAll('[data-cart-open]').forEach(function (btn) {
      btn.setAttribute('aria-expanded', 'false');
    });
  }

  function ensureShell() {
    if (document.getElementById('cart-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'cart-overlay';
    overlay.className = 'cart-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.tabIndex = -1;

    var drawer = document.createElement('aside');
    drawer.id = 'cart-drawer';
    drawer.className = 'cart-drawer';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('data-i18n-aria-label', 'cart.aria_drawer');
    drawer.setAttribute('aria-label', i18nT('cart.aria_drawer'));
    drawer.innerHTML =
      '<div class="cart-drawer-head">' +
      '<div class="cart-drawer-head-text">' +
      '<span class="cart-drawer-kicker" data-i18n="cart.kicker"><i class="fa-solid fa-leaf" aria-hidden="true"></i> Fresh picks</span>' +
      '<h2 class="cart-drawer-title" data-i18n="cart.title">Your basket</h2>' +
      '</div>' +
      '<button type="button" class="cart-drawer-close" data-cart-close data-i18n-aria-label="cart.aria_close" aria-label="' +
      escapeHtml(i18nT('cart.aria_close')) +
      '"><i class="fa-solid fa-xmark"></i></button>' +
      '</div>' +
      '<p class="cart-drawer-empty" data-cart-empty data-i18n="cart.empty" hidden>Your basket is empty. Add items from Products or All Cakes.</p>' +
      '<ul class="cart-lines" data-cart-lines></ul>' +
      '<div class="cart-drawer-foot">' +
      '<div class="cart-subtotal-row">' +
      '<span data-i18n="cart.subtotal">Subtotal</span>' +
      '<strong data-cart-subtotal>—</strong>' +
      '</div>' +
      '<p class="cart-foot-note" data-i18n="cart.foot_note">Prices are indicative; confirm at your outlet or when you order.</p>' +
      '<div class="cart-foot-actions">' +
      '<button type="button" class="cart-btn-secondary" data-cart-clear data-i18n="cart.clear">Clear basket</button>' +
      '<a href="order.html#checkout" class="cart-btn-primary"><span data-i18n="cart.order_btn">Checkout</span> <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>' +
      '</div></div>';

    var toast = document.createElement('div');
    toast.id = 'cart-toast';
    toast.className = 'cart-toast';
    toast.setAttribute('role', 'status');

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    document.body.appendChild(toast);

    if (window.i18n && typeof window.i18n.updateLanguage === 'function') {
      try {
        window.i18n.updateLanguage();
      } catch (e) {
        console.warn('cart: i18n.updateLanguage after drawer mount failed', e);
      }
    }

    overlay.addEventListener('click', closeDrawer);
    drawer.querySelector('[data-cart-close]').addEventListener('click', closeDrawer);
    drawer.addEventListener('click', function (e) {
      var inc = e.target.closest('[data-cart-inc]');
      var dec = e.target.closest('[data-cart-dec]');
      var rem = e.target.closest('[data-cart-remove]');
      if (inc) {
        var idI = inc.getAttribute('data-cart-inc');
        var lineI = loadCart().find(function (l) {
          return l.id === idI;
        });
        if (lineI) setQty(idI, (lineI.qty || 1) + 1);
        renderLines();
        updateBadges();
      } else if (dec) {
        var idD = dec.getAttribute('data-cart-dec');
        var lineD = loadCart().find(function (l) {
          return l.id === idD;
        });
        if (lineD) setQty(idD, (lineD.qty || 1) - 1);
        renderLines();
        updateBadges();
      } else if (rem) {
        removeLine(rem.getAttribute('data-cart-remove'));
        renderLines();
        updateBadges();
      }
    });

    var clearBtn = drawer.querySelector('[data-cart-clear]');
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        clearCart();
        renderLines();
        updateBadges();
      });
    }
  }

  function readPayload(btn) {
    var enc = btn.getAttribute('data-cart-payload');
    if (enc) {
      try {
        return JSON.parse(decodeURIComponent(enc));
      } catch (e) {
        return null;
      }
    }
    var id = btn.getAttribute('data-cart-id');
    var title = btn.getAttribute('data-cart-title');
    if (!id || !title) return null;
    return {
      id: id,
      title: title,
      priceLabel: btn.getAttribute('data-cart-price') || '',
      image: btn.getAttribute('data-cart-image') || '',
    };
  }

  function slugifyTitle(title) {
    return String(title || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function extractProductImage(container) {
    if (!container) return '';
    var imgEl = container.querySelector('img');
    if (imgEl) {
      return imgEl.getAttribute('src') || imgEl.src || '';
    }
    var bgEl = container.querySelector('.product-card-img') || container;
    if (bgEl.style && bgEl.style.backgroundImage) {
      var m = bgEl.style.backgroundImage.match(/url\(["']?([^"')]+)/);
      if (m) return m[1];
    }
    return '';
  }

  function buildAddCartButton(payload, opts) {
    opts = opts || {};
    var wrap = document.createElement('div');
    wrap.className =
      'product-add-cart-wrap' +
      (opts.compact ? '' : ' product-add-cart-wrap--pro');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className =
      'btn-add-cart-fresh btn-add-cart-fresh--pro' +
      (opts.compact ? ' btn-add-cart-fresh--sm' : '');
    btn.setAttribute('data-add-cart', '');
    btn.setAttribute('data-cart-id', payload.id);
    btn.setAttribute('data-cart-title', payload.title);
    btn.setAttribute('data-cart-price', payload.priceLabel || '');
    if (payload.image) {
      btn.setAttribute('data-cart-image', payload.image);
    }
    setCartButtonContent(btn);
    wrap.appendChild(btn);
    return wrap;
  }

  function formatPriceChip(priceLabel) {
    if (!priceLabel) return '';
    var amount = parseAmount(priceLabel);
    if (amount != null) {
      var formatted = formatRs(amount);
      return formatted ? formatted.replace(/\.00$/, '') : '';
    }
    return priceLabel.length > 20 ? priceLabel.slice(0, 18) + '…' : priceLabel;
  }

  function setCartButtonContent(btn, state) {
    state = state || {};
    var added = !!state.added;
    var label = added ? i18nT('cart.added_short') : i18nT('cart.add_to_cart');
    var icon = added ? 'fa-check' : 'fa-cart-plus';
    var priceChip = formatPriceChip(btn.getAttribute('data-cart-price') || '');
    var compact = btn.classList.contains('btn-add-cart-fresh--sm');

    if (compact || !priceChip) {
      btn.innerHTML =
        '<i class="fa-solid ' +
        icon +
        '" aria-hidden="true"></i> ' +
        escapeHtml(label);
      return;
    }

    btn.innerHTML =
      '<span class="btn-add-cart-fresh__main">' +
      '<i class="fa-solid ' +
      icon +
      '" aria-hidden="true"></i>' +
      '<span class="btn-add-cart-fresh__label">' +
      escapeHtml(label) +
      '</span></span>' +
      '<span class="btn-add-cart-fresh__price">' +
      escapeHtml(priceChip) +
      '</span>';
  }

  function pulseAddedState(btn) {
    btn.classList.add('is-added');
    setCartButtonContent(btn, { added: true });
    window.setTimeout(function () {
      btn.classList.remove('is-added');
      setCartButtonContent(btn);
    }, 1400);
  }

  function refreshCartButtonLabels() {
    document.querySelectorAll('.btn-add-cart-fresh[data-add-cart]').forEach(function (btn) {
      if (!btn.classList.contains('is-added')) {
        setCartButtonContent(btn);
      }
    });
  }

  function enhanceCatalogCards() {
    var candidates = document.querySelectorAll(
      '.product-card, #products .home-products-grid > .card'
    );
    candidates.forEach(function (card, i) {
      if (card.getAttribute('data-cart-enhanced') === '1') return;
      var body = card.querySelector('.card-body');
      var h3 = card.querySelector('h3');
      var priceEl = card.querySelector('.price');
      if (!body || !h3 || !priceEl) return;
      if (body.querySelector('[data-add-cart]')) {
        card.setAttribute('data-cart-enhanced', '1');
        return;
      }
      card.setAttribute('data-cart-enhanced', '1');

      var title = h3.textContent.trim();
      var price = priceEl.textContent.trim();
      var id = 'prd-' + (slugifyTitle(title) || 'item') + '-' + i;
      body.appendChild(
        buildAddCartButton({
          id: id,
          title: title,
          priceLabel: price,
          image: extractProductImage(card),
        })
      );
    });
  }

  function enhanceProductGalleries() {
    if (!document.body.classList.contains('page-products')) return;

    document
      .querySelectorAll(
        '.products-bread-hero__copy, .products-sweet-hero__copy, .products-savory-hero__copy'
      )
      .forEach(function (block, i) {
        if (block.getAttribute('data-cart-enhanced') === '1') return;
        var h3 = block.querySelector('h3');
        var priceEl = block.querySelector('strong');
        if (!h3 || !priceEl) return;
        block.setAttribute('data-cart-enhanced', '1');

        var heroMain = block.closest(
          '.products-bread-hero__main, .products-sweet-hero__main, .products-savory-hero__main'
        );
        var title = h3.textContent.trim();
        var price = priceEl.textContent.trim();
        var actions = block.querySelector('.gallery-cart-actions');
        if (!actions) {
          actions = document.createElement('div');
          actions.className = 'gallery-cart-actions';
          block.appendChild(actions);
        }
        var orderLink = block.querySelector('a.btn');
        if (orderLink && orderLink.parentNode === block) {
          actions.appendChild(orderLink);
        }
        actions.insertBefore(
          buildAddCartButton(
            {
              id: 'gal-hero-' + (slugifyTitle(title) || 'item') + '-' + i,
              title: title,
              priceLabel: price,
              image: extractProductImage(heroMain),
            },
            { compact: true }
          ),
          actions.firstChild
        );
      });

    document
      .querySelectorAll(
        '.products-bread-mini, .products-sweet-mini, .products-savory-mini'
      )
      .forEach(function (mini, i) {
        if (mini.getAttribute('data-cart-enhanced') === '1') return;
        var h4 = mini.querySelector('h4');
        var priceEl = mini.querySelector('span');
        if (!h4 || !priceEl) return;
        mini.setAttribute('data-cart-enhanced', '1');

        var title = h4.textContent.trim();
        var price = priceEl.textContent.trim();
        mini.appendChild(
          buildAddCartButton(
            {
              id: 'gal-mini-' + (slugifyTitle(title) || 'item') + '-' + i,
              title: title,
              priceLabel: price,
              image: extractProductImage(mini),
            },
            { compact: true }
          )
        );
      });

    document
      .querySelectorAll(
        '.products-bread-strip__item, .products-sweet-strip__item, .products-savory-strip__item'
      )
      .forEach(function (item, i) {
        if (item.getAttribute('data-cart-enhanced') === '1') return;
        var fig = item.querySelector('figcaption');
        var priceSpan = fig && fig.querySelector('span');
        if (!fig || !priceSpan) return;
        item.setAttribute('data-cart-enhanced', '1');

        var price = priceSpan.textContent.trim();
        var title = fig.textContent.replace(price, '').trim();
        item.appendChild(
          buildAddCartButton(
            {
              id: 'gal-strip-' + (slugifyTitle(title) || 'item') + '-' + i,
              title: title,
              priceLabel: price,
              image: extractProductImage(item),
            },
            { compact: true }
          )
        );
      });
  }

  function enhanceAllProductItems() {
    enhanceCatalogCards();
    enhanceProductGalleries();
  }

  function onDomReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  onDomReady(function () {
    ensureShell();
    updateBadges();
    renderLines();
    enhanceAllProductItems();

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-cart-open]')) {
        e.preventDefault();
        openDrawer();
        return;
      }
      var addBtn = e.target.closest('[data-add-cart]');
      if (addBtn) {
        e.preventDefault();
        var payload = readPayload(addBtn);
        if (payload) {
          addFromPayload(payload);
          updateBadges();
          renderLines();
          pulseAddedState(addBtn);
          showToast(payload.title);
        }
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDrawer();
    });

    window.addEventListener('peoples-cart-changed', function () {
      updateBadges();
      if (document.getElementById('cart-drawer') && document.getElementById('cart-drawer').classList.contains('is-open')) {
        renderLines();
      }
    });

    window.addEventListener('load', function () {
      enhanceAllProductItems();
      updateBadges();
    });

    window.addEventListener('i18n:languageChanged', function () {
      if (document.getElementById('cart-drawer')) {
        if (window.i18n && typeof window.i18n.updateLanguage === 'function') {
          window.i18n.updateLanguage();
        }
        renderLines();
        updateBadges();
      }
      refreshCartButtonLabels();
    });
  });

  window.PeoplesBakersCart = {
    refresh: function () {
      ensureShell();
      enhanceAllProductItems();
      updateBadges();
      renderLines();
    },
    open: openDrawer,
    close: closeDrawer,
  };
})();
