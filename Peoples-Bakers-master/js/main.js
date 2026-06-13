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
      (user.role === 'admin'
        ? '<a class="nav-account-item" href="admin.html"><i class="fa-solid fa-gauge-high"></i> Admin dashboard</a>'
        : '') +
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
