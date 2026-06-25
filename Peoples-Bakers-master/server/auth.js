/**
 * Authentication helpers: JWT signing + Express middleware.
 * The token is stored in an httpOnly cookie named `pb_token`.
 */
const jwt = require("jsonwebtoken");

function resolveJwtSecret() {
  const secret = String(process.env.JWT_SECRET || "").trim();
  if (secret.length >= 32) return secret;
  if (process.env.NODE_ENV === "production") {
    console.error(
      "\n  FATAL: Set JWT_SECRET in .env (at least 32 random characters) before running in production.\n"
    );
    process.exit(1);
  }
  console.warn(
    "  [auth] JWT_SECRET not set — using dev-only fallback. Set JWT_SECRET before production."
  );
  return "peoples-bakers-dev-secret-change-me-in-prod";
}

const SECRET = resolveJwtSecret();
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
    secure: process.env.NODE_ENV === "production",
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
      const payload = jwt.verify(token, SECRET);
      if (userLookup) {
        const full = userLookup(payload.id);
        req.user = full ? publicUser(full) : null;
      } else {
        req.user = payload;
      }
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
  if (userLookup) {
    const full = userLookup(req.user.id);
    if (!full) {
      return res.status(401).json({ error: "Please sign in to continue." });
    }
    req.user = publicUser(full);
  }
  next();
}

let userLookup = null;

function setUserLookup(fn) {
  userLookup = typeof fn === "function" ? fn : null;
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Please sign in to continue." });
  }
  if (userLookup) {
    const full = userLookup(req.user.id);
    if (!full || full.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }
    req.user = publicUser(full);
  } else if (req.user.role !== "admin") {
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
  setUserLookup,
};
