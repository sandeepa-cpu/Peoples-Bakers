(function () {
  'use strict';

  var WA_DEFAULT = '947228955477';
  var WA_TEXT_DEFAULT =
    'Hi Peoples Bakers, I%27d like to place an order';
  var PHONE_TEL_DEFAULT = '+94228955477';
  var PHONE_DISPLAY_DEFAULT = '+94 22 895 5477';

  var wired = false;
  var openMenu = null;

  function t(key, fallback) {
    try {
      if (window.i18n && typeof window.i18n.t === 'function') {
        var v = window.i18n.t(key);
        if (v && v !== key) return v;
      }
    } catch (e) {
      /* ignore */
    }
    return fallback;
  }

  function getContact() {
    var c = window.PB_CONTACT || {};
    return {
      wa: String(c.whatsappNumber || WA_DEFAULT).replace(/\D/g, ''),
      waDisplay: c.whatsappDisplay || c.sitePhoneDisplay || PHONE_DISPLAY_DEFAULT,
      tel: c.sitePhoneTel || PHONE_TEL_DEFAULT,
      telDisplay: c.sitePhoneDisplay || PHONE_DISPLAY_DEFAULT,
    };
  }

  function buildPanel(triggerBtn) {
    var contact = getContact();
    var panel = document.createElement('div');
    panel.className = 'order-menu__panel';
    panel.setAttribute('role', 'menu');
    panel.setAttribute('aria-label', t('order.menu.aria', 'Order options'));

    var currentUrl = (location.pathname || '').toLowerCase();
    var isOrderPage = /order\.html?$/.test(currentUrl);

    panel.innerHTML =
      '<div class="order-menu__head">' +
        '<span class="order-menu__eyebrow">' +
          '<span class="order-menu__dot" aria-hidden="true"></span>' +
          '<span>' + escapeHtml(t('order.menu.open', 'Open now · fast delivery')) + '</span>' +
        '</span>' +
        '<h3 class="order-menu__title">' + escapeHtml(t('order.menu.title', 'How would you like to order?')) + '</h3>' +
      '</div>' +
      '<ul class="order-menu__list">' +
        item('wa', 'fa-brands fa-whatsapp', t('order.menu.wa_name', 'WhatsApp'), t('order.menu.wa_text', 'Chat & order in seconds'),
          'https://wa.me/' + contact.wa + '?text=' + WA_TEXT_DEFAULT, true) +
        item('call', 'fa-solid fa-phone', t('order.menu.call_name', 'Call us'), contact.telDisplay + ' · 7am–9pm',
          'tel:' + contact.tel, false) +
        item('uber', 'fa-solid fa-utensils', t('order.menu.uber_name', 'Uber Eats'), t('order.menu.uber_text', 'Live tracking'),
          'https://www.ubereats.com/lk', true) +
        item('pickme', 'fa-solid fa-motorcycle', t('order.menu.pickme_name', 'PickMe Food'), t('order.menu.pickme_text', 'Island-wide delivery'),
          'https://pickme.lk/', true) +
        item('site', 'fa-solid fa-basket-shopping', t('order.menu.site_name', 'Website checkout'), t('order.menu.site_text', 'Basket · pick location · confirm'),
          isOrderPage ? '#checkout' : 'order.html#checkout', false, 'is-primary') +
        item('outlet', 'fa-solid fa-store', t('order.menu.outlet_name', 'Visit an outlet'), t('order.menu.outlet_text', '150+ outlets nearby'),
          'find-us.html', false) +
      '</ul>' +
      '<div class="order-menu__foot">' +
        '<i class="fa-solid fa-shield-halved" aria-hidden="true"></i>' +
        '<span>' + escapeHtml(t('order.menu.foot', 'Same price online or in-store · baked today')) + '</span>' +
      '</div>';

    triggerBtn.parentNode.appendChild(panel);
    return panel;
  }

  function item(id, icon, name, sub, href, external, extraClass) {
    var rel = external ? ' target="_blank" rel="noopener noreferrer"' : '';
    var cls = 'order-menu__item' + (extraClass ? ' order-menu__item--' + extraClass : '');
    return (
      '<li>' +
        '<a class="' + cls + '" data-order-menu-item="' + id + '" href="' + href + '"' + rel + ' role="menuitem">' +
          '<span class="order-menu__icon"><i class="' + icon + '" aria-hidden="true"></i></span>' +
          '<span class="order-menu__body">' +
            '<span class="order-menu__name">' + escapeHtml(name) + '</span>' +
            '<span class="order-menu__sub">' + escapeHtml(sub) + '</span>' +
          '</span>' +
          '<i class="fa-solid fa-arrow-right order-menu__go" aria-hidden="true"></i>' +
        '</a>' +
      '</li>'
    );
  }

  function escapeHtml(text) {
    if (text == null) return '';
    var d = document.createElement('div');
    d.textContent = String(text);
    return d.innerHTML;
  }

  function closeMenu() {
    if (!openMenu) return;
    var wrap = openMenu.wrap;
    var trigger = openMenu.trigger;
    wrap.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('order-menu-open');
    document.removeEventListener('keydown', onKey, true);
    document.removeEventListener('click', onDocClick, true);
    openMenu = null;
  }

  function openMenuFor(wrap, trigger, panel) {
    if (openMenu && openMenu.wrap === wrap) {
      closeMenu();
      return;
    }
    if (openMenu) closeMenu();
    wrap.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('order-menu-open');
    openMenu = { wrap: wrap, trigger: trigger, panel: panel };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('click', onDocClick, true);

    var firstItem = panel.querySelector('.order-menu__item');
    if (firstItem && window.matchMedia('(min-width: 640px)').matches) {
      try { firstItem.focus({ preventScroll: true }); } catch (e) { firstItem.focus(); }
    }
  }

  function onKey(e) {
    if (!openMenu) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      var trig = openMenu.trigger;
      closeMenu();
      try { trig.focus(); } catch (err) { /* ignore */ }
    }
  }

  function onDocClick(e) {
    if (!openMenu) return;
    if (openMenu.wrap.contains(e.target)) return;
    closeMenu();
  }

  function wrapTrigger(btn) {
    if (!btn || btn.dataset.orderMenuBound === '1') return;
    btn.dataset.orderMenuBound = '1';

    var wrap = document.createElement('span');
    wrap.className = 'order-menu';
    btn.parentNode.insertBefore(wrap, btn);
    wrap.appendChild(btn);

    var caret = document.createElement('button');
    caret.type = 'button';
    caret.className = 'order-menu__caret';
    caret.setAttribute('aria-label', t('order.menu.caret_aria', 'Show quick order options'));
    caret.setAttribute('aria-haspopup', 'menu');
    caret.setAttribute('aria-expanded', 'false');
    caret.innerHTML = '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
    wrap.appendChild(caret);

    var panel = buildPanel(btn);

    caret.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      openMenuFor(wrap, caret, panel);
    });
  }

  function refreshPanels() {
    document.querySelectorAll('.order-menu').forEach(function (wrap) {
      var trig = wrap.querySelector('.btn-order');
      var oldPanel = wrap.querySelector('.order-menu__panel');
      if (!trig || !oldPanel) return;
      oldPanel.remove();
      buildPanel(trig);
    });
  }

  function init() {
    var triggers = document.querySelectorAll('.nav-actions .btn-order, [data-order-menu-trigger]');
    triggers.forEach(wrapTrigger);

    if (wired) return;
    wired = true;

    document.addEventListener('peoples-contact-updated', refreshPanels);
    document.addEventListener('i18n:ready', refreshPanels);
    document.addEventListener('peoples-language-changed', refreshPanels);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
