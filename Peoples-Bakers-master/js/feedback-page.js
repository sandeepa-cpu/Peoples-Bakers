(function () {
  'use strict';

  var form = document.getElementById('feedback-form');
  if (!form) return;

  var starButtons = form.querySelectorAll('.feedback-star-btn');
  var pillButtons = form.querySelectorAll('.feedback-pill');
  var submitBtn = document.getElementById('feedback-submit');
  var formPanel = document.getElementById('feedback-form-panel');
  var successPanel = document.getElementById('feedback-success-panel');
  var toast = document.getElementById('feedback-toast');
  var toastHideTimer;

  var rating = 0;
  var selectedCategories = new Set();

  function setRating(value) {
    rating = value;
    starButtons.forEach(function (btn, i) {
      var star = btn.querySelector('.fa-star');
      var n = i + 1;
      if (n <= value) {
        btn.classList.add('is-active');
        if (star) {
          star.classList.remove('fa-regular');
          star.classList.add('fa-solid');
        }
      } else {
        btn.classList.remove('is-active');
        if (star) {
          star.classList.remove('fa-solid');
          star.classList.add('fa-regular');
        }
      }
    });
  }

  starButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var v = parseInt(btn.getAttribute('data-value'), 10);
      if (Number.isFinite(v)) setRating(v);
    });
  });

  pillButtons.forEach(function (pill) {
    pill.addEventListener('click', function () {
      var cat = pill.getAttribute('data-category');
      if (!cat) return;
      if (selectedCategories.has(cat)) {
        selectedCategories.delete(cat);
        pill.classList.remove('is-selected');
        pill.setAttribute('aria-pressed', 'false');
      } else {
        selectedCategories.add(cat);
        pill.classList.add('is-selected');
        pill.setAttribute('aria-pressed', 'true');
      }
    });
  });

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    if (toastHideTimer) clearTimeout(toastHideTimer);
    toastHideTimer = window.setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 5200);
  }

  function basicEmailOk(email) {
    if (!email || !email.trim()) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var nameInput = document.getElementById('feedback-name');
    var emailInput = document.getElementById('feedback-email');
    var messageInput = document.getElementById('feedback-message');

    var name = nameInput ? nameInput.value.trim() : '';
    var email = emailInput ? emailInput.value.trim() : '';
    var message = messageInput ? messageInput.value.trim() : '';

    if (rating < 1) {
      showToast('Please tap a star rating before submitting.');
      return;
    }
    if (selectedCategories.size === 0) {
      showToast('Choose at least one category that fits your feedback.');
      return;
    }
    if (!message) {
      showToast('Please share a few words in the feedback box.');
      return;
    }
    if (!basicEmailOk(email)) {
      showToast('That email doesn’t look quite right — please check it.');
      return;
    }

    var payload = {
      name: name || '',
      email: email || '',
      rating: rating,
      categories: Array.from(selectedCategories),
      message: message,
    };

    submitBtn.disabled = true;
    submitBtn.classList.add('feedback-btn-loading');

    fetch('/api/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        if (res.status === 200) {
          formPanel.classList.add('is-hidden');
          successPanel.classList.add('is-visible');
          form.reset();
          setRating(0);
          selectedCategories.clear();
          pillButtons.forEach(function (p) {
            p.classList.remove('is-selected');
            p.setAttribute('aria-pressed', 'false');
          });
          successPanel.focus();
          return;
        }
        throw new Error('Bad status');
      })
      .catch(function () {
        showToast(
          'We couldn’t send your feedback. Check your connection and try again.'
        );
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.classList.remove('feedback-btn-loading');
      });
  });

  var btnAnother = document.getElementById('feedback-submit-another');
  if (btnAnother) {
    btnAnother.addEventListener('click', function () {
      successPanel.classList.remove('is-visible');
      formPanel.classList.remove('is-hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
