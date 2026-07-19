'use strict';

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Valid admin session tokens — in-memory, lives for the server process lifetime.
// Matches Section 15: "server issues a short-lived token stored in
// localStorage/memory on the admin device."
// ---------------------------------------------------------------------------
const validTokens = new Set();

// ---------------------------------------------------------------------------
// Login rate-limiting — max 5 attempts per IP within a 5-minute window.
// Simple Map<string, number[]> (IP → array of attempt epoch-ms timestamps).
// ---------------------------------------------------------------------------
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
/** @type {Map<string, number[]>} */
const loginAttempts = new Map();

/**
 * Prunes expired timestamps from the per-IP list and returns whether the
 * request should be rate-limited (true = blocked).
 *
 * @param {string} ip
 * @returns {boolean}
 */
function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = loginAttempts.get(ip) || [];

  // Keep only timestamps within the current window
  const recent = timestamps.filter((t) => now - t < WINDOW_MS);
  loginAttempts.set(ip, recent);

  return recent.length >= MAX_ATTEMPTS;
}

/**
 * Records a login attempt for the given IP address.
 *
 * @param {string} ip
 */
function recordAttempt(ip) {
  const timestamps = loginAttempts.get(ip) || [];
  timestamps.push(Date.now());
  loginAttempts.set(ip, timestamps);
}

// ---------------------------------------------------------------------------
// isValidAdminToken — standalone check, shared by REST middleware and Socket.IO
// ---------------------------------------------------------------------------

/**
 * Returns true if `token` is a currently-valid admin session token.
 * Callable directly (not Express middleware) so the Socket.IO layer can
 * verify admin identity at connection time using the exact same logic
 * as the REST middleware, without re-implementing it.
 *
 * @param {string} token
 * @returns {boolean}
 */
function isValidAdminToken(token) {
  return typeof token === 'string' && validTokens.has(token);
}

// ---------------------------------------------------------------------------
// requireAdmin — Express middleware
// ---------------------------------------------------------------------------

/**
 * Express middleware that checks for a Bearer token in the Authorization
 * header and verifies it against the in-memory valid-tokens Set.
 * Returns 401 if the token is missing or invalid.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireAdmin(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token || !isValidAdminToken(token)) {
    return res.status(401).json({ error: 'Unauthorized — valid admin token required.' });
  }

  next();
}

// ---------------------------------------------------------------------------
// handleAdminLogin — POST /api/admin/login handler
// ---------------------------------------------------------------------------

/**
 * Express route handler for `POST /api/admin/login`.
 * Accepts `{ pin }` in the request body, compares against
 * `process.env.ADMIN_PIN`, and returns a random session token on success.
 *
 * Rate-limited to 5 attempts per 5 minutes per IP (429 on excess).
 * Returns 401 on wrong PIN. Never logs the PIN or tokens (AGENTS.md §4).
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
function handleAdminLogin(req, res) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  // Rate-limit check — before even looking at the PIN
  if (isRateLimited(ip)) {
    return res.status(429).json({
      error: 'Too many login attempts. Try again in a few minutes.',
    });
  }

  recordAttempt(ip);

  const { pin } = req.body || {};
  const correctPin = process.env.ADMIN_PIN;

  if (!correctPin) {
    // Fail closed: if ADMIN_PIN is not configured, nobody can log in.
    return res.status(500).json({
      error: 'Server misconfiguration — ADMIN_PIN environment variable is not set.',
    });
  }

  if (!pin || pin !== correctPin) {
    return res.status(401).json({ error: 'Incorrect PIN.' });
  }

  // Success — issue a session token
  const token = crypto.randomUUID();
  validTokens.add(token);

  return res.status(200).json({ token });
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
module.exports = {
  handleAdminLogin,
  requireAdmin,
  isValidAdminToken,
};
