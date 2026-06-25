/**
 * Customize Cake page — simple photo cake request flow.
 */
(function () {
  function getWhatsAppNumber() {
    if (window.PB_CONTACT && window.PB_CONTACT.whatsappNumber) {
      return String(window.PB_CONTACT.whatsappNumber).replace(/\D/g, '');
    }
    return '947228955477';
  }

  function getFormState(form) {
    function val(name) {
      var el = form.querySelector('[name="' + name + '"]');
      return el ? el.value.trim() : '';
    }
    function checked(name) {
      var el = form.querySelector('[name="' + name + '"]');
      return !!(el && el.checked);
    }
    var photo = form.querySelector('[name="photo"]');

    return {
      weight: val('weight'),
      photoName: photo && photo.files && photo.files[0] ? photo.files[0].name : '',
      addMessage: checked('addMessage'),
      cakeMessage: val('cakeMessage'),
      qty: val('qty') || '1',
    };
  }

  function buildLines(state) {
    var lines = ['Hi Peoples Bakers, I would like to order a Customize Cake.'];
    if (state.weight) lines.push('Weight: ' + state.weight);
    lines.push('Quantity: ' + state.qty);
    if (state.addMessage) {
      lines.push('Add cake message: Yes (Rs.120)');
      if (state.cakeMessage) lines.push('Message: ' + state.cakeMessage);
    }
    if (state.photoName) lines.push('Selected photo: ' + state.photoName);
    lines.push('');
    lines.push('I will attach the photo in this WhatsApp chat. Please confirm price and availability.');
    return lines;
  }

  function setQty(form, nextValue) {
    var input = form.querySelector('[name="qty"]');
    if (!input) return;
    var qty = parseInt(nextValue, 10);
    if (isNaN(qty) || qty < 1) qty = 1;
    if (qty > 20) qty = 20;
    input.value = String(qty);
  }

  function syncMessageField(form) {
    var checkbox = form.querySelector('[data-cake-message-toggle]');
    var field = form.querySelector('[data-cake-message-field]');
    if (!checkbox || !field) return;
    if (checkbox.checked) {
      field.removeAttribute('hidden');
    } else {
      field.setAttribute('hidden', '');
      var input = field.querySelector('input');
      if (input) input.value = '';
    }
  }

  function setupSpecialCakeForm() {
    var form = document.querySelector('[data-special-cake-form]');
    if (!form) return;

    var whatsapp = document.querySelector('[data-special-cake-whatsapp]');
    var dec = form.querySelector('[data-cake-qty-dec]');
    var inc = form.querySelector('[data-cake-qty-inc]');

    form.addEventListener('change', function () {
      syncMessageField(form);
    });
    if (dec) {
      dec.addEventListener('click', function () {
        var current = parseInt(form.querySelector('[name="qty"]').value, 10) || 1;
        setQty(form, current - 1);
      });
    }
    if (inc) {
      inc.addEventListener('click', function () {
        var current = parseInt(form.querySelector('[name="qty"]').value, 10) || 1;
        setQty(form, current + 1);
      });
    }

    if (whatsapp) {
      whatsapp.addEventListener('click', function () {
        var message = buildLines(getFormState(form)).join('\n');
        whatsapp.setAttribute(
          'href',
          'https://wa.me/' + getWhatsAppNumber() + '?text=' + encodeURIComponent(message)
        );
      });
    }

    syncMessageField(form);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSpecialCakeForm);
  } else {
    setupSpecialCakeForm();
  }
})();
