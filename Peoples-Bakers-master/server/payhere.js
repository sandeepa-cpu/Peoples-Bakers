/**
 * PayHere.lk checkout — hash generation & notify verification.
 * Docs: https://support.payhere.lk/api-&-mobile-sdk/checkout-api
 */
const crypto = require("crypto");

function md5Upper(value) {
  return crypto.createHash("md5").update(String(value), "utf8").digest("hex").toUpperCase();
}

function siteUrl() {
  return String(process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function getConfig() {
  const merchantId = String(process.env.PAYHERE_MERCHANT_ID || "").trim();
  const merchantSecret = String(process.env.PAYHERE_MERCHANT_SECRET || "").trim();
  const isProd = process.env.NODE_ENV === "production";
  const sandbox = isProd
    ? process.env.PAYHERE_SANDBOX === "true"
    : process.env.PAYHERE_SANDBOX !== "false";
  const base = siteUrl();

  return {
    merchantId,
    merchantSecret,
    enabled: !!(merchantId && merchantSecret),
    sandbox,
    currency: process.env.PAYHERE_CURRENCY || "LKR",
    checkoutUrl: sandbox
      ? "https://sandbox.payhere.lk/pay/checkout"
      : "https://www.payhere.lk/pay/checkout",
    returnUrl: base + "/payment-return.html",
    cancelUrl: base + "/order.html#checkout",
    notifyUrl: base + "/api/payments/payhere/notify",
  };
}

function formatAmount(total) {
  const n = Math.max(0, Number(total) || 0);
  return n.toFixed(2);
}

function checkoutHash(merchantId, orderId, amount, currency, merchantSecret) {
  const secretHash = md5Upper(merchantSecret);
  return md5Upper(merchantId + orderId + amount + currency + secretHash);
}

function verifyNotifyHash(body, merchantSecret) {
  const merchant_id = String(body.merchant_id || "");
  const order_id = String(body.order_id || "");
  const payhere_amount = String(body.payhere_amount || "");
  const payhere_currency = String(body.payhere_currency || "");
  const status_code = String(body.status_code || "");
  const md5sig = String(body.md5sig || "").toUpperCase();
  const local = md5Upper(
    merchant_id +
      order_id +
      payhere_amount +
      payhere_currency +
      status_code +
      md5Upper(merchantSecret)
  );
  return local === md5sig;
}

function splitName(full) {
  const parts = String(full || "Customer").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: "Customer", last_name: "." };
  if (parts.length === 1) return { first_name: parts[0], last_name: "." };
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" "),
  };
}

function buildCheckoutFields(order, cfg) {
  const amount = formatAmount(order.total);
  const names = splitName(order.customer && order.customer.name);
  const items = (order.items || [])
    .map(function (it) {
      return (it.qty || 1) + "x " + (it.title || "Item");
    })
    .join(", ")
    .slice(0, 240);

  const fields = {
    merchant_id: cfg.merchantId,
    return_url: cfg.returnUrl,
    cancel_url: cfg.cancelUrl,
    notify_url: cfg.notifyUrl,
    order_id: order.id,
    items: items || "Peoples Bakers order",
    currency: cfg.currency,
    amount: amount,
    first_name: names.first_name,
    last_name: names.last_name,
    email: (order.customer && order.customer.email) || "hello@peoplesbakers.lk",
    phone: (order.customer && order.customer.phone) || "",
    address: (order.customer && order.customer.area) || "Sri Lanka",
    city: (order.customer && order.customer.area) || "Colombo",
    country: "Sri Lanka",
    hash: checkoutHash(cfg.merchantId, order.id, amount, cfg.currency, cfg.merchantSecret),
  };

  return { action: cfg.checkoutUrl, fields: fields };
}

module.exports = {
  getConfig,
  formatAmount,
  checkoutHash,
  verifyNotifyHash,
  buildCheckoutFields,
};
