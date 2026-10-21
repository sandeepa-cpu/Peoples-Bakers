(function () {
  'use strict';

  var STORAGE_KEY = 'pb_mobile_order_bar_dismissed_v1';

  function initStickyOrderBar() {
    var bar = document.getElementById('mobile-order-bar');
    if (!bar) return;

    /* If user has dismissed once, keep it dismissed for the session. */
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') {
        bar.classList.add('is-dismissed');
        return;
      }
    } catch (e) { /* sessionStorage unavailable — proceed anyway */ }

    var closeBtn = document.getElementById('mobile-order-bar-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        bar.classList.remove('is-visible');
        setTimeout(function () { bar.classList.add('is-dismissed'); }, 320);
        try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) { /* ignore */ }
      });
    }

    /* Only show after user scrolls past the hero (~500px), hide near footer. */
    var threshold = 500;
    var footerTriggerOffset = 400;
    var visible = false;

    function onScroll() {
      var y = window.scrollY || window.pageYOffset;
      var docH = document.documentElement.scrollHeight;
      var viewH = window.innerHeight;
      var nearBottom = y + viewH + footerTriggerOffset >= docH;

      var shouldShow = y > threshold && !nearBottom;
      if (shouldShow !== visible) {
        visible = shouldShow;
        bar.classList.toggle('is-visible', visible);
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }

  function initQuickAdd() {
    /* Fires a subtle "added" animation on the button. Real basket integration
       happens via existing cart.js if window.PB_CART is available. */
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.product-add') : null;
      if (!btn) return;
      e.preventDefault();

      var name = btn.getAttribute('data-add-product') || 'Product';
      var priceStr = btn.getAttribute('data-add-price') || '0';
      var price = parseFloat(priceStr) || 0;

      /* Real basket integration (best-effort): try known globals. */
      var added = false;
      try {
        if (window.PB_CART && typeof window.PB_CART.add === 'function') {
          window.PB_CART.add({ id: name, name: name, price: price, qty: 1 });
          added = true;
        } else if (window.pbCart && typeof window.pbCart.addItem === 'function') {
          window.pbCart.addItem({ id: name, name: name, price: price, qty: 1 });
          added = true;
        } else if (typeof window.addToCart === 'function') {
          window.addToCart({ id: name, name: name, price: price, qty: 1 });
          added = true;
        }
      } catch (err) {
        /* swallow — animation still shows so UX doesn't feel broken */
        console.debug('quick-add: cart integration failed', err);
      }

      /* Visual feedback: swap icon to check + green background, revert after 1.4s */
      btn.classList.add('is-added');
      btn.setAttribute('aria-label', (added ? 'Added ' : 'Selected ') + name);

      /* Optional lightweight toast */
      showToast((added ? 'Added ' : 'Noted ') + name + ' \u00b7 Rs. ' + price);

      setTimeout(function () {
        btn.classList.remove('is-added');
        btn.setAttribute('aria-label', 'Add ' + name + ' to basket');
      }, 1500);
    });
  }

  function showToast(msg) {
    var t = document.getElementById('pb-mobile-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'pb-mobile-toast';
      t.setAttribute('role', 'status');
      t.setAttribute('aria-live', 'polite');
      t.style.cssText =
        'position:fixed;left:50%;bottom:calc(var(--mobile-tab-bar-h,56px) + 78px);transform:translateX(-50%) translateY(20px);' +
        'background:#1a1a1a;color:#fff8ee;padding:0.65rem 1.05rem;border-radius:999px;font-size:0.85rem;' +
        'font-weight:600;letter-spacing:.005em;box-shadow:0 12px 32px rgba(0,0,0,.35),0 0 0 1px rgba(255,215,0,.22);' +
        'opacity:0;pointer-events:none;transition:opacity .25s ease,transform .3s ease;z-index:960;max-width:88%;text-align:center;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    requestAnimationFrame(function () {
      t.style.opacity = '1';
      t.style.transform = 'translateX(-50%) translateY(0)';
    });
    clearTimeout(t._hideT);
    t._hideT = setTimeout(function () {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(20px)';
    }, 1800);
  }

  function initCakesRail() {
    var root = document.querySelector('[data-home-cakes-rail]');
    if (!root) return;
    var track = root.querySelector('[data-home-cakes-track]');
    var prev = root.querySelector('[data-home-cakes-prev]');
    var next = root.querySelector('[data-home-cakes-next]');
    if (!track) return;

    function cardStep() {
      var card = track.querySelector('.card');
      if (!card) return 280;
      var styles = window.getComputedStyle(track);
      var gap = parseFloat(styles.columnGap || styles.gap) || 16;
      return Math.round(card.getBoundingClientRect().width + gap);
    }

    function updateNav() {
      var max = Math.max(0, track.scrollWidth - track.clientWidth - 2);
      var x = track.scrollLeft;
      if (prev) prev.disabled = x <= 2;
      if (next) next.disabled = x >= max;
    }

    function scrollByDir(dir) {
      track.scrollBy({ left: dir * cardStep(), behavior: 'smooth' });
    }

    if (prev) prev.addEventListener('click', function () { scrollByDir(-1); });
    if (next) next.addEventListener('click', function () { scrollByDir(1); });
    track.addEventListener('scroll', updateNav, { passive: true });
    window.addEventListener('resize', updateNav, { passive: true });

    var dragging = false;
    var startX = 0;
    var startLeft = 0;

    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      dragging = true;
      startX = e.clientX;
      startLeft = track.scrollLeft;
      track.classList.add('is-dragging');
      try { track.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    });

    track.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      track.scrollLeft = startLeft - (e.clientX - startX);
    });

    function endDrag() {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('is-dragging');
      updateNav();
    }

    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    updateNav();
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    initStickyOrderBar();
    initCakesRail();
  });
})();
