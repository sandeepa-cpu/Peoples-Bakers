/**
 * Phone-number discount — valid mobile → automatic checkout discount.
 * Configure via .env: PHONE_DISCOUNT_PERCENT, PHONE_DISCOUNT_MIN
 */
function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

function digitsOnly(phone) {
  return String(phone || "").replace(/\D/g, "");
}

function isValidPhone(phone) {
  const d = digitsOnly(phone);
  if (d.length === 10 && d.startsWith("07")) return true;
  if (d.length === 11 && d.startsWith("947")) return true;
  if (d.length === 12 && d.startsWith("94") && d.charAt(2) === "7") return true;
  return false;
}

function normalizePhone(phone) {
  const d = digitsOnly(phone);
  if (d.length === 10 && d.startsWith("07")) return d;
  if (d.length === 11 && d.startsWith("947")) return "0" + d.slice(2);
  if (d.length === 12 && d.startsWith("947")) return "0" + d.slice(3);
  return str(phone);
}

function getConfig() {
  const percent = Math.min(
    50,
    Math.max(0, Number(process.env.PHONE_DISCOUNT_PERCENT) || 20)
  );
  const minSubtotal = Math.max(
    0,
    Number(process.env.PHONE_DISCOUNT_MIN) || 500
  );
  const enabled = percent > 0;
  return { enabled, percent, minSubtotal };
}

function applyPhoneDiscount(subtotal, phone, user) {
  const cfg = getConfig();
  const sub = Math.max(0, Number(subtotal) || 0);

  if (!cfg.enabled || !isValidPhone(phone)) {
    return {
      subtotal: sub,
      discount: 0,
      total: sub,
      applied: false,
      reason: !cfg.enabled ? "disabled" : "invalid_phone",
    };
  }

  if (!user || !user.id) {
    return {
      subtotal: sub,
      discount: 0,
      total: sub,
      applied: false,
      reason: "login_required",
    };
  }

  const normalized = normalizePhone(phone);
  const userPhone = normalizePhone(user.phone || "");
  if (userPhone && userPhone !== normalized) {
    return {
      subtotal: sub,
      discount: 0,
      total: sub,
      applied: false,
      reason: "phone_mismatch",
    };
  }

  if (sub < cfg.minSubtotal) {
    return {
      subtotal: sub,
      discount: 0,
      total: sub,
      applied: false,
      reason: "min_order",
      minSubtotal: cfg.minSubtotal,
    };
  }

  const discount = Math.min(sub, Math.round(sub * (cfg.percent / 100)));
  return {
    subtotal: sub,
    discount,
    total: sub - discount,
    applied: true,
    percent: cfg.percent,
    label: cfg.percent + "% off — phone number added",
  };
}

function publicConfig() {
  const cfg = getConfig();
  return {
    phoneDiscountEnabled: cfg.enabled,
    phoneDiscountPercent: cfg.percent,
    phoneDiscountMin: cfg.minSubtotal,
    phoneDiscountHint:
      cfg.enabled
        ? "Sign in with your account and use your registered mobile (07XXXXXXXX) for " +
          cfg.percent +
          "% off orders over Rs. " +
          cfg.minSubtotal.toLocaleString("en-LK") +
          "."
        : "",
  };
}

module.exports = {
  isValidPhone,
  normalizePhone,
  getConfig,
  applyPhoneDiscount,
  publicConfig,
};
