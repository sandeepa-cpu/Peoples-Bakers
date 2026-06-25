/**
 * Email sending via SMTP (nodemailer).
 *
 * Configure with environment variables (see .env.example):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM
 *
 * If SMTP is not configured, email functions become safe no-ops so the app
 * keeps working (e.g. during local development).
 */
const nodemailer = require("nodemailer");

let transporter = null;
let configured = false;

function init() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (host && user && pass) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: port === 465, // true for 465, false for 587/STARTTLS
      auth: { user: user, pass: pass },
    });
    configured = true;
    console.log("  [mail] SMTP configured (" + host + ")");
  } else {
    configured = false;
    console.log("  [mail] SMTP not configured — emails will be skipped.");
  }
}
init();

function from() {
  return (
    process.env.MAIL_FROM ||
    '"Peoples Bakers" <no-reply@peoplesbakers.lk>'
  );
}

function shell(title, bodyHtml) {
  return (
    '<div style="font-family:Arial,Helvetica,sans-serif;background:#f4eef2;padding:24px">' +
    '<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.08)">' +
    '<div style="background:linear-gradient(135deg,#2a0f28,#9c2d96);padding:24px;text-align:center">' +
    '<h1 style="margin:0;color:#ffd700;font-size:20px">Peoples Bakers</h1>' +
    '<p style="margin:4px 0 0;color:#f0e8d8;font-size:12px;letter-spacing:2px">හිත ඉල්ලන රස · EST. 2015</p>' +
    "</div>" +
    '<div style="padding:28px 26px;color:#221b22">' +
    '<h2 style="margin:0 0 12px;font-size:18px;color:#4a1742">' +
    title +
    "</h2>" +
    bodyHtml +
    "</div>" +
    '<div style="padding:16px;text-align:center;background:#faf6f9;color:#7a6f78;font-size:11px">' +
    "&copy; 2026 Peoples Bakers · Freshly baked, every day." +
    "</div></div></div>"
  );
}

async function send(to, subject, html) {
  if (!configured) {
    console.log("  [mail] (skipped) would send '" + subject + "' to " + to);
    return false;
  }
  try {
    await transporter.sendMail({ from: from(), to: to, subject: subject, html: html });
    console.log("  [mail] sent '" + subject + "' to " + to);
    return true;
  } catch (err) {
    console.warn("  [mail] failed to send to " + to + ":", err.message);
    return false;
  }
}

function sendWelcomeEmail(user) {
  if (!user || !user.email) return Promise.resolve(false);
  const body =
    '<p style="line-height:1.6;font-size:14px">Hi <strong>' +
    escapeHtml(user.name || "there") +
    "</strong>,</p>" +
    '<p style="line-height:1.6;font-size:14px">Welcome to the Peoples Bakers family! 🎂 Your account is ready — ' +
    "you can now order fresh cakes, breads and short eats, track orders, and grab member offers.</p>" +
    '<p style="text-align:center;margin:24px 0">' +
    '<a href="' +
    (process.env.SITE_URL || "http://localhost:3000") +
    '/products.html" style="background:#9c2d96;color:#ffd700;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold;font-size:14px">Browse our menu</a>' +
    "</p>" +
    '<p style="line-height:1.6;font-size:13px;color:#6f5a4e">Use code <strong>CAKE20</strong> for 20% off cakes on your first order.</p>';
  return send(user.email, "Welcome to Peoples Bakers! 🎂", shell("Account created 🎉", body));
}

function sendOrderConfirmation(order) {
  if (!order || !order.customer || !order.customer.email) return Promise.resolve(false);
  const lineItems = (order.items || []).map(function (it) {
    return (
      '<tr><td style="padding:6px 0;font-size:13px">' +
      escapeHtml(it.qty + "× " + it.title) +
      '</td><td style="padding:6px 0;font-size:13px;text-align:right">Rs. ' +
      (Number(it.price) * Number(it.qty)).toLocaleString("en-LK") +
      "</td></tr>"
    );
  });
  const subtotal =
    Number(order.subtotal) ||
    (order.items || []).reduce(function (s, it) {
      return s + (Number(it.price) || 0) * (Number(it.qty) || 1);
    }, 0);
  const discount = Math.max(0, Number(order.discount) || 0);
  if (discount > 0) {
    lineItems.push(
      '<tr><td style="padding:6px 0;font-size:13px;color:#2d6a4f">Phone discount</td>' +
        '<td style="padding:6px 0;font-size:13px;text-align:right;color:#2d6a4f">− Rs. ' +
        discount.toLocaleString("en-LK") +
        "</td></tr>"
    );
  }
  const items = lineItems.join("");
  const ref = "#" + String(order.id).slice(-6).toUpperCase();
  const body =
    '<p style="line-height:1.6;font-size:14px">Hi <strong>' +
    escapeHtml(order.customer.name || "there") +
    "</strong>,</p>" +
    '<p style="line-height:1.6;font-size:14px">Thanks for your order <strong>' +
    ref +
    "</strong>! We've received it and our team will confirm pricing & timing shortly.</p>" +
    '<table style="width:100%;border-collapse:collapse;margin:14px 0;border-top:1px solid #eee;border-bottom:1px solid #eee">' +
    items +
    "</table>" +
    '<p style="font-size:14px;text-align:right"><strong>Estimated total: Rs. ' +
    (Number(order.total) || 0).toLocaleString("en-LK") +
    "</strong></p>";
  return send(
    order.customer.email,
    "Your Peoples Bakers order " + ref,
    shell("Order received ✅", body)
  );
}

function escapeHtml(text) {
  return String(text == null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

module.exports = {
  isConfigured: () => configured,
  send,
  sendWelcomeEmail,
  sendOrderConfirmation,
};
