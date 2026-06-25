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

  links.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () {
      setOpen(false);
    });
  });

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
      el.textContent = telDisplay;
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
