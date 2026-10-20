/**
 * Checkout form UI enhancements: delivery/pickup segmented toggle sync
 * and live total inside the submit button. Logic stays in checkout-page.js.
 */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var modeSelect = document.getElementById('c-mode');
    var btns = document.querySelectorAll('.cox-mode-btn');
    if (modeSelect && btns.length) {
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          btns.forEach(function (b) {
            b.classList.toggle('is-active', b === btn);
            b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
          });
          modeSelect.value = btn.getAttribute('data-mode');
          modeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    }

    /* Mirror the basket total into the submit button. #co-total is updated
       by checkout-page.js, so observe it instead of recomputing. */
    var totalEl = document.getElementById('co-total');
    var submitTotal = document.getElementById('cox-submit-total');
    if (totalEl && submitTotal) {
      var sync = function () {
        submitTotal.textContent = totalEl.textContent;
      };
      sync();
      new MutationObserver(sync).observe(totalEl, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }
  });
})();
