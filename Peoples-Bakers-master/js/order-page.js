/**
 * Order Online page — interactive studio, zone check, live status.
 */
(function () {
  var WHATSAPP_NUMBER = '94712345678';
  var EMAIL_TO = 'hello@peoplesbakers.lk';

  function t(key, vars) {
    if (window.i18n && typeof window.i18n.t === 'function') {
      return window.i18n.t(key, vars);
    }
    return key;
  }

  var PRIMARY_ZONES = {
    colombo: { name: 'Colombo', eta: '30–45 min', channels: 'Uber Eats, PickMe, our riders' },
    dehiwala: { name: 'Dehiwala', eta: '35–50 min', channels: 'Uber Eats, PickMe' },
    nugegoda: { name: 'Nugegoda', eta: '30–45 min', channels: 'Uber Eats, PickMe, our riders' },
    rajagiriya: { name: 'Rajagiriya', eta: '35–50 min', channels: 'Uber Eats, PickMe' },
    kotte: { name: 'Kotte', eta: '35–50 min', channels: 'Uber Eats, PickMe' },
    kaduwela: { name: 'Kaduwela', eta: '45–75 min', channels: 'PickMe, our riders' },
    maharagama: { name: 'Maharagama', eta: '40–60 min', channels: 'Uber Eats, PickMe' },
    moratuwa: { name: 'Moratuwa', eta: '45–70 min', channels: 'Uber Eats, PickMe' },
    kandy: { name: 'Kandy', eta: '40–70 min', channels: 'PickMe, outlet delivery' },
    galle: { name: 'Galle', eta: '45–75 min', channels: 'PickMe, outlet delivery' },
    matara: { name: 'Matara', eta: '60–90 min', channels: 'Outlet delivery, pickup' },
    kurunegala: { name: 'Kurunegala', eta: '60–90 min', channels: 'Outlet delivery, pickup' },
    negombo: { name: 'Negombo', eta: '45–75 min', channels: 'Uber Eats, PickMe, outlet' },
    gampaha: { name: 'Gampaha', eta: '45–75 min', channels: 'PickMe, outlet delivery' },
    jaffna: { name: 'Jaffna', eta: '90–120 min', channels: 'Outlet pickup, pre-order only' },
    batticaloa: { name: 'Batticaloa', eta: '90 min+', channels: 'Outlet pickup, pre-order only' },
    anuradhapura: { name: 'Anuradhapura', eta: '75 min+', channels: 'Outlet pickup' },
    ratnapura: { name: 'Ratnapura', eta: '75 min+', channels: 'Outlet pickup' }
  };

  function normalize(str) {
    return String(str || '').toLowerCase().replace(/[^a-z]/g, '');
  }

  function findZone(query) {
    var key = normalize(query);
    if (!key) return null;
    if (PRIMARY_ZONES[key]) return PRIMARY_ZONES[key];
    var match = null;
    Object.keys(PRIMARY_ZONES).forEach(function (k) {
      if (!match && (k.indexOf(key) === 0 || key.indexOf(k) === 0)) {
        match = PRIMARY_ZONES[k];
      }
    });
    return match;
  }

  function renderZone(result, target) {
    if (!target) return;
    target.hidden = false;
    if (!result) {
      target.className = 'order-zone-result is-miss';
      target.innerHTML =
        '<i class="fa-solid fa-circle-info"></i> ' + t('order.zone.miss');
      return;
    }
    target.className = 'order-zone-result is-hit';
    var lead = t('order.zone.deliver_lead', { name: escapeHtml(result.name) });
    target.innerHTML =
      '<div class="order-zone-result-head"><i class="fa-solid fa-circle-check"></i> ' +
      lead +
      '</div>' +
      '<div class="order-zone-result-row"><span><i class="fa-solid fa-clock"></i> ' +
      escapeHtml(result.eta) +
      '</span><span><i class="fa-solid fa-route"></i> ' +
      escapeHtml(result.channels) +
      '</span></div>';
  }

  function escapeHtml(text) {
    if (text == null) return '';
    var div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
  }

  function setupZoneChecker() {
    var input = document.getElementById('order-zone-input');
    var btn = document.querySelector('[data-zone-check]');
    var result = document.querySelector('[data-zone-result]');
    if (!input || !btn || !result) return;

    function check(value) {
      renderZone(findZone(value), result);
    }

    btn.addEventListener('click', function () {
      check(input.value);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        check(input.value);
      }
    });
    document.querySelectorAll('[data-zone-chip]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var val = chip.getAttribute('data-zone-chip');
        input.value = val;
        check(val);
      });
    });
  }

  function getStudioState() {
    var root = document.querySelector('.order-studio-card');
    if (!root) return null;
    var categories = Array.prototype.map
      .call(
        root.querySelectorAll('input[name="studio-category"]:checked'),
        function (el) {
          return el.value;
        }
      )
      .filter(Boolean);
    function val(name) {
      var el = root.querySelector('[name="' + name + '"]');
      return el ? el.value.trim() : '';
    }
    function checked(name) {
      var el = root.querySelector('[name="' + name + '"]');
      return !!(el && el.checked);
    }
    return {
      categories: categories,
      items: val('studio-items'),
      mode: val('studio-mode'),
      date: val('studio-date'),
      time: val('studio-time'),
      area: val('studio-area'),
      guests: val('studio-guests'),
      name: val('studio-name'),
      phone: val('studio-phone'),
      notes: val('studio-notes'),
      promo: checked('studio-promo')
    };
  }

  function buildOrderMessage(state) {
    if (!state) return '';
    var lines = [t('order.msg.open')];
    if (state.categories.length) {
      lines.push(t('order.msg.cat', { list: state.categories.join(', ') }));
    }
    if (state.items) lines.push(t('order.msg.items', { list: state.items }));
    if (state.mode) lines.push(t('order.msg.mode', { v: state.mode }));
    var when = [state.date, state.time].filter(Boolean).join(' ');
    if (when) lines.push(t('order.msg.when', { v: when }));
    if (state.area) lines.push(t('order.msg.area', { v: state.area }));
    if (state.guests) lines.push(t('order.msg.serves', { v: state.guests }));
    if (state.notes) lines.push(t('order.msg.notes', { v: state.notes }));
    if (state.promo) lines.push(t('order.msg.promo'));
    if (state.name) lines.push(t('order.msg.name', { v: state.name }));
    if (state.phone) lines.push(t('order.msg.phone', { v: state.phone }));
    lines.push('');
    lines.push(t('order.msg.footer'));
    return lines.join('\n');
  }

  function buildReviewHTML(state) {
    if (!state) return '';
    var rows = [];
    function push(labelKey, val) {
      if (!val) return;
      rows.push(
        '<div class="order-studio-review-row"><span>' +
          escapeHtml(t(labelKey)) +
          '</span><strong>' +
          escapeHtml(val) +
          '</strong></div>'
      );
    }
    push('order.studio.rev_cat', state.categories.join(', '));
    push('order.studio.rev_items', state.items);
    push('order.studio.rev_mode', state.mode);
    push('order.studio.rev_when', [state.date, state.time].filter(Boolean).join(' '));
    push('order.studio.rev_area', state.area);
    push('order.studio.rev_serves', state.guests);
    push('order.studio.rev_notes', state.notes);
    if (state.promo) push('order.studio.rev_promo', t('order.studio.rev_promo_val'));
    push('order.studio.rev_name', state.name);
    push('order.studio.rev_phone', state.phone);
    if (!rows.length) {
      return (
        '<p class="order-studio-review-empty">' +
        t('order.studio.rev_empty') +
        '</p>'
      );
    }
    return (
      '<h4 class="order-studio-review-title"><i class="fa-solid fa-list-check"></i> ' +
      t('order.studio.rev_title') +
      '</h4>' +
      '<div class="order-studio-review-rows">' +
      rows.join('') +
      '</div>'
    );
  }

  function setStep(step) {
    document.querySelectorAll('[data-studio-step]').forEach(function (el) {
      el.classList.toggle(
        'is-active',
        el.getAttribute('data-studio-step') === String(step)
      );
    });
    document.querySelectorAll('[data-studio-rail]').forEach(function (el) {
      var idx = parseInt(el.getAttribute('data-studio-rail'), 10);
      el.classList.toggle('is-active', idx === step);
      el.classList.toggle('is-done', idx < step);
    });
    if (step === 2) {
      var review = document.querySelector('[data-studio-review]');
      if (review) review.innerHTML = buildReviewHTML(getStudioState());
    }
  }

  function setupStudio() {
    var card = document.querySelector('.order-studio-card');
    if (!card) return;

    card.addEventListener('click', function (e) {
      var goto = e.target.closest('[data-studio-goto]');
      if (goto) {
        e.preventDefault();
        var step = parseInt(goto.getAttribute('data-studio-goto'), 10);
        if (!isNaN(step)) setStep(step);
      }
    });

    card.addEventListener('input', function () {
      var review = document.querySelector('[data-studio-review]');
      if (
        review &&
        document.querySelector('[data-studio-step="2"].is-active')
      ) {
        review.innerHTML = buildReviewHTML(getStudioState());
      }
    });

    card.addEventListener('change', function () {
      var review = document.querySelector('[data-studio-review]');
      if (
        review &&
        document.querySelector('[data-studio-step="2"].is-active')
      ) {
        review.innerHTML = buildReviewHTML(getStudioState());
      }
    });

    var waBtn = document.querySelector('[data-studio-whatsapp]');
    var mailBtn = document.querySelector('[data-studio-email]');
    if (waBtn) {
      waBtn.addEventListener('click', function (e) {
        var msg = buildOrderMessage(getStudioState());
        var url =
          'https://wa.me/' +
          WHATSAPP_NUMBER +
          '?text=' +
          encodeURIComponent(msg);
        waBtn.setAttribute('href', url);
        // allow default behaviour (opens in new tab)
        void e;
      });
    }
    if (mailBtn) {
      mailBtn.addEventListener('click', function (e) {
        var msg = buildOrderMessage(getStudioState());
        mailBtn.setAttribute(
          'href',
          'mailto:' +
            EMAIL_TO +
            '?subject=' +
            encodeURIComponent(t('order.mail_subj')) +
            '&body=' +
            encodeURIComponent(msg)
        );
        void e;
      });
    }
  }

  function setupLiveStatus() {
    var root = document.querySelector('[data-order-status]');
    if (!root) return;
    var text = root.querySelector('.order-hero-status-text');
    var dot = root.querySelector('.order-hero-status-dot');
    if (!text) return;

    var now = new Date();
    var hour = now.getHours();
    var open = hour >= 6 && hour < 22;

    if (open) {
      var msg =
        hour >= 6 && hour < 10
          ? t('order.hero.st_morn')
          : hour >= 10 && hour < 16
          ? t('order.hero.st_day')
          : hour >= 16 && hour < 20
          ? t('order.hero.st_eve')
          : t('order.hero.st_late');
      text.textContent = msg;
      root.classList.remove('is-closed');
    } else {
      text.textContent = t('order.hero.st_closed');
      root.classList.add('is-closed');
      if (dot) dot.style.background = '#c44';
    }
  }

  function setupTrackingDemo() {
    var bar = document.querySelector('.order-track-progress span');
    if (!bar) return;
    var target = parseInt(bar.style.width, 10);
    if (isNaN(target)) return;
    bar.style.width = '0%';
    requestAnimationFrame(function () {
      setTimeout(function () {
        bar.style.width = target + '%';
      }, 200);
    });
  }

  function setupScrollReveal() {
    var sections = document.querySelectorAll(
      '.order-studio-section, .order-zone-section, .order-steps-section, ' +
        '.order-channels-wrap, .order-occasions-section, .order-payment-section, ' +
        '.order-track-section, .order-love-section, .order-faq-section'
    );
    if (!sections.length) return;

    var reduce =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce || typeof IntersectionObserver === 'undefined') {
      sections.forEach(function (el) {
        el.classList.add('order-reveal-in');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('order-reveal-in');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    sections.forEach(function (el) {
      observer.observe(el);
    });
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  onReady(function () {
    setupStudio();
    setupZoneChecker();
    setupLiveStatus();
    setupTrackingDemo();
    setupScrollReveal();
  });

  window.addEventListener('i18n:languageChanged', function () {
    setupLiveStatus();
    var r = document.querySelector('[data-zone-result]');
    if (r && !r.hasAttribute('hidden') && r.innerHTML) {
      r.setAttribute('hidden', '');
      r.className = 'order-zone-result';
      r.innerHTML = '';
    }
    if (document.querySelector('[data-studio-step="2"].is-active')) {
      var review = document.querySelector('[data-studio-review]');
      if (review) review.innerHTML = buildReviewHTML(getStudioState());
    }
  });
})();
