const counters = document.querySelectorAll('.counter');

const animateCounter = (counter) => {
  const raw = counter.getAttribute('data-target');
  const target = parseInt(raw, 10);
  if (!Number.isFinite(target) || target <= 0) {
    return;
  }
  const duration = 2000;
  const step = target / (duration / 16);
  let current = 0;

  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }

    const n = Math.floor(current);
    if (target >= 1000) {
      // Avoid "0K+" while current is still under 1,000 (e.g. animating to 10,000).
      counter.textContent =
        n < 1000 ? n + '+' : Math.floor(current / 1000) + 'K+';
    } else {
      counter.textContent = n + '+';
    }
  }, 16);
};

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);

counters.forEach(counter => {
  observer.observe(counter);
});

let lastScrollY = window.scrollY;
window.addEventListener(
  'scroll',
  () => {
    const navbar = document.querySelector('.navbar');
    if (!navbar) {
      return;
    }

    const currentScrollY = window.scrollY;
    if (currentScrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }

    // Hide the social icon bar when scrolling down,
    // reveal it again while scrolling up.
    if (currentScrollY > 110 && currentScrollY > lastScrollY + 4) {
      document.body.classList.add('top-bar-hidden');
      document.documentElement.classList.add('top-bar-hidden');
    } else if (currentScrollY < lastScrollY - 4 || currentScrollY <= 30) {
      document.body.classList.remove('top-bar-hidden');
      document.documentElement.classList.remove('top-bar-hidden');
    }

    lastScrollY = currentScrollY;
  },
  { passive: true }
);

// Hero slider runs via pure CSS animation keyframes — no JS needed.

/* ─────────────────────────────────────────────
   Mobile hamburger navigation
───────────────────────────────────────────── */
(function setupMobileNav() {
  var inner = document.querySelector('.nav-inner');
  var links = document.querySelector('.nav-links');
  if (!inner || !links || inner.querySelector('.nav-menu-toggle')) return;

  if (!links.id) links.id = 'site-nav-links';

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-menu-toggle';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', links.id);
  btn.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';

  var backdrop = document.createElement('div');
  backdrop.className = 'nav-backdrop';
  backdrop.hidden = true;
  backdrop.setAttribute('aria-hidden', 'true');

  var actions = inner.querySelector('.nav-actions');
  if (actions) {
    inner.insertBefore(btn, actions);
  } else {
    inner.appendChild(btn);
  }
  document.body.appendChild(backdrop);

  function menuLabel(open) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(open ? 'common.menu_close' : 'common.menu_open');
    }
    return open ? 'Close menu' : 'Open menu';
  }

  function setOpen(open) {
    document.body.classList.toggle('nav-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', menuLabel(open));
    btn.querySelector('i').className = open
      ? 'fa-solid fa-xmark'
      : 'fa-solid fa-bars';
    backdrop.hidden = !open;
    backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  btn.addEventListener('click', function () {
    setOpen(!document.body.classList.contains('nav-open'));
  });

  backdrop.addEventListener('click', function () {
    setOpen(false);
  });

  links.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  // Login stays in nav-actions (btn-login); no duplicate link in the menu.

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) setOpen(false);
  });

  window.addEventListener('i18n:languageChanged', function () {
    btn.setAttribute(
      'aria-label',
      menuLabel(document.body.classList.contains('nav-open'))
    );
  });

  btn.setAttribute('aria-label', menuLabel(false));
})();

/* ─────────────────────────────────────────────
   Slow networks — defer heavy images
───────────────────────────────────────────── */
(function setupProgressiveImages() {
  var slides = document.querySelectorAll('.hero-slides .hero-slide[src]');
  if (slides.length > 1) {
    var deferred = Array.prototype.slice.call(slides, 1);
    deferred.forEach(function (img) {
      var src = img.getAttribute('src');
      if (!src) return;
      img.dataset.deferredSrc = src;
      img.removeAttribute('src');
    });
    function loadDeferred() {
      deferred.forEach(function (img, i) {
        setTimeout(function () {
          if (img.dataset.deferredSrc && !img.getAttribute('src')) {
            img.src = img.dataset.deferredSrc;
          }
        }, 400 + i * 900);
      });
    }
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadDeferred, { timeout: 3000 });
    } else {
      window.addEventListener('load', function () {
        setTimeout(loadDeferred, 600);
      });
    }
  }

  document.querySelectorAll('img:not([loading])').forEach(function (img) {
    if (img.closest('.hero-slides')) return;
    if (img.classList.contains('brand-img')) return;
    img.loading = 'lazy';
    if (!img.getAttribute('decoding')) img.decoding = 'async';
  });

  if ('IntersectionObserver' in window) {
    var bgObs = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var src = el.dataset.bgSrc;
          if (src) {
            el.style.backgroundImage = "url('" + src.replace(/'/g, "\\'") + "')";
            delete el.dataset.bgSrc;
            el.classList.remove('is-bg-pending');
          }
          obs.unobserve(el);
        });
      },
      { rootMargin: '120px 0px' }
    );
    document
      .querySelectorAll('.home-reveal-photo[style*="background-image"]')
      .forEach(function (el) {
        var m = el.style.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
        if (!m || !m[1]) return;
        el.dataset.bgSrc = m[1];
        el.style.backgroundImage = 'none';
        el.classList.add('is-bg-pending');
        bgObs.observe(el);
      });
  }
})();

/* ─────────────────────────────────────────────
   Home page — scroll reveal for photo sections
───────────────────────────────────────────── */
(function setupHomeScrollReveal() {
  if (!document.body.classList.contains('home-page')) return;

  var blocks = document.querySelectorAll('.home-reveal');
  if (!blocks.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    blocks.forEach(function (block) {
      block.classList.add('is-in');
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -3% 0px' }
  );

  blocks.forEach(function (block) {
    observer.observe(block);
  });
})();

/* ─────────────────────────────────────────────
   Home category showcase rows — independent Swipers
───────────────────────────────────────────── */
(function setupHomeShowcaseRows() {
  if (!document.body.classList.contains('home-page')) return;
  var section = document.getElementById('products');
  if (!section) return;
  var roots = section.querySelectorAll('.home-showcase-swiper');
  if (!roots.length) return;

  var reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function slidesIn(root) {
    var wrapper = root.querySelector('.swiper-wrapper');
    if (!wrapper) return [];
    return Array.prototype.slice.call(wrapper.children).filter(function (s) {
      return s.classList.contains('swiper-slide') && !s.classList.contains('swiper-slide-duplicate');
    });
  }

  function slidesPerViewNow() {
    var w = window.innerWidth;
    if (w >= 1024) return 3.15;
    if (w >= 768) return 2.35;
    return 1.4;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function parsePriceNum(label) {
    var m = String(label || '').replace(/,/g, '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function formatRs(n) {
    var num = parseInt(n, 10) || 0;
    try {
      return 'Rs. ' + num.toLocaleString('en-LK');
    } catch (err) {
      return 'Rs. ' + num;
    }
  }

  function cakeSlideMarkup(item, badge) {
    var title = item.title || '';
    var img = item.imageUrl || '';
    var alt = item.imageAlt || title;
    var priceNum = item.priceNum != null ? item.priceNum : parsePriceNum(item.price);
    var badgeHtml = '';
    if (badge === 'new') {
      badgeHtml =
        '<span class="product-badge product-badge--new"><i class="fa-solid fa-sparkles"></i> <span data-i18n="home.badge_new">New</span></span>';
    }
    return (
      '<div class="swiper-slide">' +
      '<article class="card product-card-modern">' +
      '<div class="card-image product-card-img" style="background-image: url(\'' +
      escapeHtml(img).replace(/'/g, '%27') +
      '\');" role="img" aria-label="' +
      escapeHtml(alt) +
      '">' +
      badgeHtml +
      '</div>' +
      '<div class="card-body">' +
      '<div class="product-meta">' +
      '<span class="product-fresh"><i class="fa-solid fa-clock"></i> <span data-i18n="home.chip_fresh">Fresh today</span></span>' +
      '</div>' +
      '<h3>' +
      escapeHtml(title) +
      '</h3>' +
      '<div class="product-footer">' +
      '<p class="price">' +
      formatRs(priceNum) +
      '</p>' +
      '<button type="button" class="product-add" data-add-product="' +
      escapeHtml(title) +
      '" data-add-price="' +
      priceNum +
      '" aria-label="Add ' +
      escapeHtml(title) +
      ' to basket"><i class="fa-solid fa-plus"></i></button>' +
      '</div></div></article></div>'
    );
  }

  function fillCakesShowcase(root) {
    var wrapper = root.querySelector('.swiper-wrapper');
    if (!wrapper) return Promise.resolve();
    var swiss = {
      title: 'Chocolate Swiss Roll',
      imageUrl: 'images/home/hero-chocolate-swiss-roll.png',
      imageAlt: 'Chocolate Swiss Roll',
      priceNum: 850,
    };
    return fetch('data/cakes.json')
      .then(function (res) {
        return res && res.ok ? res.json() : [];
      })
      .catch(function () {
        return [];
      })
      .then(function (list) {
        var prefer = [
          'images/cakes/chocolate-gateau-cake-1kg.png',
          'images/cakes/butter-gateau-cake-1kg.png',
          'images/cakes/black-forest-chocolate-gateau-cake.png',
          'images/cakes/coffee-gateau-cake.png',
          'images/cakes/chocolate-ganache-rectangle-1kg.png',
          'images/cakes/printed-butter-round-1kg.png',
          'images/cakes/printed-chocolate-round-1kg.png',
          'images/cakes/printed-chocolate-square-500g.png',
          'images/cakes/printed-butter-heart-500g.png',
          'images/cakes/barbie-rectangle-butter-icing-cake-1kg.png',
          'images/cakes/branded-5029-2-1-birthday.png',
          'images/cakes/chocolate-fudge-cake-650g.png',
          'images/cakes/butter-icing-rectangle-cake-1kg.png',
          'images/cakes/printed-chocolate-rectangle-1kg.png',
          'images/cakes/chocolate-icing-square-cake-1kg.png',
        ];
        var byUrl = {};
        (Array.isArray(list) ? list : []).forEach(function (cake) {
          var url = String((cake && cake.imageUrl) || '');
          var title = String((cake && cake.title) || '');
          if (!url || byUrl[url]) return;
          if (/pieces/i.test(title)) return;
          byUrl[url] = {
            title: title,
            imageUrl: url,
            imageAlt: (cake && cake.imageAlt) || title,
            price: cake && cake.price,
          };
        });
        var seen = {};
        var items = [swiss];
        seen[swiss.imageUrl] = true;
        prefer.forEach(function (url) {
          if (seen[url] || !byUrl[url]) return;
          seen[url] = true;
          items.push(byUrl[url]);
        });
        Object.keys(byUrl).forEach(function (url) {
          if (items.length >= 24) return;
          if (seen[url]) return;
          seen[url] = true;
          items.push(byUrl[url]);
        });
        if (items.length < 4) return;
        wrapper.innerHTML = items
          .map(function (item, i) {
            return cakeSlideMarkup(item, i === 0 ? 'new' : '');
          })
          .join('');
      });
  }

  function initRoot(root) {
    if (root.closest('[data-hero-swiper]')) return;
    var row = root.closest('.home-showcase-row');
    var prevEl = row ? row.querySelector('.home-showcase-nav .swiper-button-prev') : null;
    var nextEl = row ? row.querySelector('.home-showcase-nav .swiper-button-next') : null;

    if (typeof window.Swiper !== 'function') {
      root.classList.add('is-swiper-fallback');
      return;
    }

    var n = slidesIn(root).length;
    var loopOn = !reduceMotion && n >= Math.ceil(slidesPerViewNow()) * 2;

    new window.Swiper(root, {
      slidesPerView: 1.4,
      spaceBetween: 10,
      speed: reduceMotion ? 0 : 700,
      grabCursor: true,
      watchOverflow: true,
      loop: loopOn,
      rewind: !loopOn,
      autoplay: reduceMotion
        ? false
        : {
            delay: 2800,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          },
      navigation: {
        prevEl: prevEl,
        nextEl: nextEl,
      },
      breakpoints: {
        768: { slidesPerView: 2.35, spaceBetween: 10 },
        1024: { slidesPerView: 3.15, spaceBetween: 12 },
      },
    });
  }

  var cakeRoot = null;
  roots.forEach(function (root) {
    if (root.hasAttribute('data-home-cakes-showcase')) {
      cakeRoot = root;
      return;
    }
    initRoot(root);
  });

  if (cakeRoot) {
    fillCakesShowcase(cakeRoot).then(function () {
      initRoot(cakeRoot);
    });
  }
})();

/* ─────────────────────────────────────────────
   Logged-in state in the navbar (Login -> account)
───────────────────────────────────────────── */
(function () {
  function escapeHtml(s) {
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function renderAccount(user) {
    var loginBtn = document.querySelector('.btn-login');
    if (!loginBtn) return;

    var first = (user.name || user.email || 'Account').split(' ')[0];
    var wrap = document.createElement('div');
    wrap.className = 'nav-account';

    var avatar = user.avatar
      ? '<img class="nav-account-avatar" src="' + escapeHtml(user.avatar) + '" alt="" referrerpolicy="no-referrer">'
      : '<i class="fa-solid fa-circle-user"></i>';

    wrap.innerHTML =
      '<button type="button" class="btn btn-login nav-account-btn" aria-expanded="false">' +
      avatar +
      '<span class="nav-account-name">' + escapeHtml(first) + '</span>' +
      '<i class="fa-solid fa-chevron-down nav-account-caret" aria-hidden="true"></i>' +
      '</button>' +
      '<div class="nav-account-menu" hidden>' +
      '<div class="nav-account-head">' +
      '<strong>' + escapeHtml(user.name || 'Customer') + '</strong>' +
      '<span>' + escapeHtml(user.email || '') + '</span>' +
      '</div>' +
      '<a class="nav-account-item" href="account.html"><i class="fa-solid fa-user"></i> My Account</a>' +
      '<a class="nav-account-item" href="account.html#orders"><i class="fa-solid fa-box"></i> My Orders</a>' +
      '<button type="button" class="nav-account-item nav-account-logout"><i class="fa-solid fa-right-from-bracket"></i> Logout</button>' +
      '</div>';

    loginBtn.replaceWith(wrap);

    var btn = wrap.querySelector('.nav-account-btn');
    var menu = wrap.querySelector('.nav-account-menu');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !menu.hasAttribute('hidden');
      if (open) {
        menu.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
      } else {
        menu.removeAttribute('hidden');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
    document.addEventListener('click', function () {
      menu.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', 'false');
    });

    wrap.querySelector('.nav-account-logout').addEventListener('click', function () {
      fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
        .then(function () {
          window.location.reload();
        })
        .catch(function () {
          window.location.reload();
        });
    });
  }

  function initAuthState() {
    if (!document.querySelector('.btn-login')) return;
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        if (data && data.user) renderAccount(data.user);
      })
      .catch(function () {
        /* not served by backend / offline — keep the Login button */
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthState);
  } else {
    initAuthState();
  }
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('service-worker.js')
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  });
}

(function applySiteContact() {
  function updateLinks(cfg) {
    if (!cfg) return;
    var wa = String(cfg.whatsappNumber || '947228955477').replace(/\D/g, '');
    var waDisplay = cfg.whatsappDisplay || cfg.sitePhoneDisplay || '+94 22 895 5477';
    var tel = cfg.sitePhoneTel || '+94228955477';
    var telDisplay = cfg.sitePhoneDisplay || '+94 22 895 5477';
    window.PB_CONTACT = {
      whatsappNumber: wa,
      whatsappDisplay: waDisplay,
      sitePhoneTel: tel,
      sitePhoneDisplay: telDisplay,
    };
    document.querySelectorAll('a[href*="wa.me"]').forEach(function (el) {
      var href = el.getAttribute('href') || '';
      var textMatch = href.match(/[?&]text=([^&]*)/);
      var text = textMatch ? textMatch[1] : '';
      el.href = 'https://wa.me/' + wa + (text ? '?text=' + text : '');
    });
    document.querySelectorAll('.footer-base-link--wa span').forEach(function (label) {
      label.innerHTML = '<strong>WhatsApp :</strong> ' + waDisplay;
    });
    document.querySelectorAll('[data-site-phone]').forEach(function (el) {
      el.setAttribute('href', 'tel:' + tel.replace(/\s/g, ''));
      /* Only replace textContent when element has no children (would wipe rich markup otherwise). */
      if (el.children.length === 0) {
        el.textContent = telDisplay;
      }
    });
    if (cfg.instagramUrl) {
      document.querySelectorAll('[data-social-instagram]').forEach(function (el) {
        el.setAttribute('href', cfg.instagramUrl);
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      });
    }
    if (cfg.linkedinUrl) {
      document.querySelectorAll('[data-social-linkedin]').forEach(function (el) {
        el.setAttribute('href', cfg.linkedinUrl);
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      });
    }
  }
  fetch('/api/config', { credentials: 'same-origin' })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(updateLinks)
    .catch(function () {
      updateLinks({
        instagramUrl: 'https://www.instagram.com/peoplesbakers/',
        linkedinUrl: 'https://www.linkedin.com/company/peoples-bakers/',
        whatsappNumber: '947228955477',
        whatsappDisplay: '+94 22 895 5477',
        sitePhoneTel: '+94228955477',
        sitePhoneDisplay: '+94 22 895 5477',
      });
    });
})();

/* ─────────────────────────────────────────────
   Mobile UX — bottom tab bar + viewport polish
───────────────────────────────────────────── */
(function setupMobileUx() {
  var SKIP =
    document.body.classList.contains('adm-body') ||
    /login\.html|payment-return|checkout\.html/i.test(
      location.pathname + location.search
    );

  var vp = document.querySelector('meta[name="viewport"]');
  if (vp && vp.content.indexOf('viewport-fit') === -1) {
    vp.setAttribute('content', vp.content + ', viewport-fit=cover');
  }

  if (SKIP) return;

  function t(key, fallback) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key);
    }
    return fallback;
  }

  function currentTab() {
    var path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (path === '' || path === 'index.html') return 'home';
    if (path === 'products.html' || path === 'cakes.html') return 'menu';
    if (path === 'order.html') return 'order';
    return '';
  }

  var bar = document.createElement('nav');
  bar.className = 'mobile-tab-bar';
  bar.setAttribute('aria-label', t('common.mobile_tab_aria', 'Quick navigation'));
  bar.innerHTML =
    '<a href="index.html" class="mobile-tab" data-mobile-tab="home">' +
    '<i class="fa-solid fa-house" aria-hidden="true"></i>' +
    '<span data-i18n="common.mobile_tab_home">Home</span></a>' +
    '<a href="products.html" class="mobile-tab" data-mobile-tab="menu">' +
    '<i class="fa-solid fa-utensils" aria-hidden="true"></i>' +
    '<span data-i18n="common.mobile_tab_menu">Menu</span></a>' +
    '<a href="order.html" class="mobile-tab mobile-tab--accent" data-mobile-tab="order">' +
    '<i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>' +
    '<span data-i18n="common.mobile_tab_order">Order</span></a>' +
    '<button type="button" class="mobile-tab" data-mobile-tab="cart" data-cart-open aria-expanded="false">' +
    '<span class="mobile-tab__icon-wrap">' +
    '<i class="fa-solid fa-basket-shopping" aria-hidden="true"></i>' +
    '<span class="mobile-tab__badge nav-cart-count" data-cart-count hidden aria-hidden="true">0</span>' +
    '</span>' +
    '<span data-i18n="common.mobile_tab_cart">Basket</span></button>';

  document.body.appendChild(bar);
  document.body.classList.add('has-mobile-tab-bar');

  var active = currentTab();
  if (active) {
    var el = bar.querySelector('[data-mobile-tab="' + active + '"]');
    if (el) el.classList.add('is-active');
  }

  function syncBarVisibility() {
    var hide =
      document.body.classList.contains('nav-open') ||
      document.body.classList.contains('cart-drawer-open');
    bar.classList.toggle('is-hidden', hide);
  }

  if (window.MutationObserver) {
    new MutationObserver(syncBarVisibility).observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  window.addEventListener('peoples-cart-changed', syncBarVisibility);
  document.addEventListener('click', function () {
    window.setTimeout(syncBarVisibility, 0);
  });
  window.addEventListener('resize', syncBarVisibility);
  syncBarVisibility();

  window.addEventListener('i18n:languageChanged', function () {
    if (window.i18n && typeof window.i18n.updateLanguage === 'function') {
      window.i18n.updateLanguage(bar);
    }
  });
  if (window.i18n && typeof window.i18n.updateLanguage === 'function') {
    window.i18n.updateLanguage(bar);
  }
})();

(function setupProductsMobileSticky() {
  if (!document.body.classList.contains('page-products')) return;
  var toolbar = document.querySelector('.product-toolbar--categories');
  var search = document.querySelector('.products-search-bar');
  if (!toolbar || !search || document.querySelector('.products-mobile-sticky')) return;

  var wrap = document.createElement('div');
  wrap.className = 'products-mobile-sticky';
  toolbar.parentNode.insertBefore(wrap, toolbar);
  wrap.appendChild(toolbar);
  wrap.appendChild(search);
})();

/* Caravan Fresh-style category cards — Products + All Cakes only */
(function setupNavMegaMenus() {
  var navLinks = document.querySelector('.nav-links');
  if (!navLinks || navLinks.getAttribute('data-nav-mega-ready')) return;
  navLinks.setAttribute('data-nav-mega-ready', '1');

  function findNavLink(file) {
    var nodes = navLinks.querySelectorAll('a[href]');
    for (var i = 0; i < nodes.length; i++) {
      var href = String(nodes[i].getAttribute('href') || '').split('#')[0];
      if (href === file || href.slice(-file.length - 1) === '/' + file) return nodes[i];
    }
    return null;
  }

  function cardHtml(item) {
    return (
      '<a class="nav-mega__card" href="' +
      item.href +
      '">' +
      '<span class="nav-mega__copy">' +
      '<strong data-i18n="' +
      item.titleKey +
      '">' +
      item.title +
      '</strong>' +
      '<em data-i18n="nav.shop_now">Shop Now</em>' +
      '</span>' +
      '<img src="' +
      item.img +
      '" alt="" width="220" height="180" decoding="async">' +
      '</a>'
    );
  }

  function attachMega(link, kind, cards) {
    if (!link || link.closest('.nav-mega')) return;
    var wrap = document.createElement('div');
    wrap.className = 'nav-mega nav-mega--' + kind;
    link.parentNode.insertBefore(wrap, link);
    wrap.appendChild(link);
    link.setAttribute('aria-haspopup', 'true');
    link.setAttribute('aria-expanded', 'false');

    var panel = document.createElement('div');
    panel.className = 'nav-mega__panel';
    panel.innerHTML = cards.map(cardHtml).join('');
    wrap.appendChild(panel);

    var closeTimer = null;

    function placePanel() {
      var nav = document.querySelector('.navbar');
      var top = nav ? Math.round(nav.getBoundingClientRect().bottom) : 72;
      panel.style.top = top + 'px';
    }

    function setOpen(open) {
      if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
      wrap.classList.toggle('is-open', open);
      link.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) placePanel();
    }

    wrap.addEventListener('mouseenter', function () {
      setOpen(true);
    });
    wrap.addEventListener('mouseleave', function () {
      closeTimer = setTimeout(function () {
        setOpen(false);
      }, 180);
    });
    wrap.addEventListener('focusin', function () {
      setOpen(true);
    });
    wrap.addEventListener('focusout', function (e) {
      if (!wrap.contains(e.relatedTarget)) setOpen(false);
    });

    window.addEventListener('scroll', function () {
      if (wrap.classList.contains('is-open')) placePanel();
    }, { passive: true });
    window.addEventListener('resize', function () {
      if (wrap.classList.contains('is-open')) placePanel();
    });
  }

  attachMega(findNavLink('products.html'), 'products', [
    {
      href: 'products.html#breads',
      titleKey: 'products_page.cat_breads',
      title: 'Breads',
      img: 'images/breads/fresh-bread-loaf.png',
    },
    {
      href: 'products.html#savory',
      titleKey: 'products_page.cat_savory',
      title: 'Rolls, buns',
      img: 'images/savory/seeni-sambol-roll.png',
    },
    {
      href: 'products.html#cookies',
      titleKey: 'products_page.f_cookies',
      title: 'Cookies',
      img: 'images/cookies/pb-rusks-200g.png',
    },
    {
      href: 'products.html#drinks',
      titleKey: 'footer.fp_beverages',
      title: 'Beverages',
      img: 'images/drinks/pb-drinks-lineup-garden.png',
    },
  ]);

  attachMega(findNavLink('cakes.html'), 'cakes', [
    {
      href: 'cakes.html#birthday',
      titleKey: 'cakes.f_birthday',
      title: 'Birthday',
      img: 'images/cakes/branded-5029-2-1-birthday.png',
    },
    {
      href: 'cakes.html#printed',
      titleKey: 'cakes.f_printed',
      title: 'Print',
      img: 'images/cakes/printed-chocolate-square-500g.png',
    },
    {
      href: 'cakes.html#gateau',
      titleKey: 'cakes.f_gateau',
      title: 'Gateau',
      img: 'images/cakes/chocolate-gateau-cake-1kg.png',
    },
  ]);

  if (window.i18n && typeof window.i18n.updateLanguage === 'function') {
    window.i18n.updateLanguage();
  }
})();

/* ─────────────────────────────────────────────
   Back to top — show after scrolling, smooth return
───────────────────────────────────────────── */
(function setupBackToTop() {
  var btn = document.getElementById('back-to-top');
  if (!btn) return;

  var threshold = 600;
  var visible = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var shouldShow = y > threshold;
    if (shouldShow !== visible) {
      visible = shouldShow;
      btn.classList.toggle('is-visible', visible);
    }
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

(function setupHomeNewsletter() {
  var form = document.getElementById('home-newsletter-form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = form.querySelector('input[type="email"]');
    var btn = form.querySelector('button[type="submit"]');
    var email = input ? String(input.value || '').trim() : '';
    if (!email) return;
    var orig = btn ? btn.textContent : '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Sending…';
    }
    fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '',
        email: email,
        rating: 0,
        categories: ['Newsletter'],
        message: 'Newsletter signup from homepage: ' + email,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || 'Could not subscribe');
          return data;
        });
      })
      .then(function () {
        if (btn) btn.textContent = 'Subscribed ✓';
        if (input) input.value = '';
      })
      .catch(function () {
        var wa =
          'https://wa.me/947228955477?text=' +
          encodeURIComponent('Hi Peoples Bakers, please add me to the newsletter: ' + email);
        window.open(wa, '_blank', 'noopener,noreferrer');
        if (btn) {
          btn.disabled = false;
          btn.textContent = orig || 'Subscribe';
        }
      });
  });
})();
