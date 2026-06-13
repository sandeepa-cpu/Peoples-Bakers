/**
 * Authentication helpers: JWT signing + Express middleware.
 * The token is stored in an httpOnly cookie named `pb_token`.
 */
const jwt = require("jsonwebtoken");

const SECRET =
  process.env.JWT_SECRET || "peoples-bakers-dev-secret-change-me-in-prod";
const COOKIE_NAME = "pb_token";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    role: user.role || "customer",
  };
}

function signToken(user) {
  return jwt.sign(publicUser(user), SECRET, { expiresIn: "7d" });
}

function setAuthCookie(res, user) {
  res.cookie(COOKIE_NAME, signToken(user), {
    httpOnly: true,
    sameSite: "lax",
    maxAge: MAX_AGE_MS,
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

/** Populate req.user from the cookie if present (never blocks). */
function attachUser(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (token) {
    try {
      req.user = jwt.verify(token, SECRET);
    } catch (err) {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Please sign in to continue." });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

module.exports = {
  SECRET,
  COOKIE_NAME,
  publicUser,
  signToken,
  setAuthCookie,
  clearAuthCookie,
  attachUser,
  requireAuth,
  requireAdmin,
};
