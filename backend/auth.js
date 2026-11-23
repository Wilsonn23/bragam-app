// Stateless bearer tokens (JWT, HS256) signed with a server-side secret using node:crypto only.
// The secret never leaves the server (it is not part of the mobile APK).
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const MIN_SECRET_LENGTH = 32;
const DEFAULT_SECRET_FILE = path.join(__dirname, '.auth-secret');

const base64url = value => Buffer.from(value).toString('base64url');
const HEADER = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

/** @type {{file:string, value:string}|null} */
let generated = null;

/**
 * Secret resolution, no manual setup required:
 * 1. AUTH_SECRET from the environment, when set (must be 32+ characters).
 * 2. Otherwise an auto-generated secret persisted in backend/.auth-secret (or AUTH_SECRET_FILE),
 *    so sessions survive restarts. If the file cannot be written, an in-memory secret is used
 *    and users simply log in again after a restart.
 */
function secret(env = process.env) {
  const configured = env.AUTH_SECRET;
  if (typeof configured === 'string' && configured !== '') {
    if (configured.length < MIN_SECRET_LENGTH) {
      throw Object.assign(new Error('AUTH_SECRET is shorter than 32 characters'), { code: 'AUTH_NOT_CONFIGURED' });
    }
    return configured;
  }
  const file = env.AUTH_SECRET_FILE || DEFAULT_SECRET_FILE;
  if (generated?.file !== file) generated = { file, value: loadOrCreateSecret(file) };
  return generated.value;
}

function loadOrCreateSecret(file) {
  try {
    const existing = fs.readFileSync(file, 'utf8').trim();
    if (existing.length >= MIN_SECRET_LENGTH) return existing;
  } catch {
    // Not created yet.
  }
  const value = crypto.randomBytes(48).toString('base64url');
  try {
    fs.writeFileSync(file, `${value}\n`, { mode: 0o600 });
  } catch {
    console.warn('Could not save the generated auth secret; users will need to log in again after a restart.');
  }
  return value;
}

/** 'env' | 'generated' — for the startup log only. */
function secretSource(env = process.env) {
  return typeof env.AUTH_SECRET === 'string' && env.AUTH_SECRET !== '' ? 'env' : 'generated';
}

function sign(data, key) {
  return crypto.createHmac('sha256', key).update(data).digest('base64url');
}

/** @param {string} userId @returns {string} */
function signToken(userId, { env = process.env, now = Date.now(), ttlSeconds = TOKEN_TTL_SECONDS } = {}) {
  const iat = Math.floor(now / 1000);
  const payload = base64url(JSON.stringify({ sub: userId, iat, exp: iat + ttlSeconds }));
  return `${HEADER}.${payload}.${sign(`${HEADER}.${payload}`, secret(env))}`;
}

/** Returns the user id for a valid, unexpired token, otherwise null. */
function verifyToken(token, { env = process.env, now = Date.now() } = {}) {
  const key = secret(env); // surface misconfiguration even for malformed tokens
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== HEADER) return null;
  const expected = Buffer.from(sign(`${parts[0]}.${parts[1]}`, key));
  const actual = Buffer.from(parts[2]);
  if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  let claims;
  try {
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof claims?.sub !== 'string' || !Number.isFinite(claims.exp) || claims.exp * 1000 <= now) return null;
  return claims.sub;
}

/** Rejects requests without a valid `Authorization: Bearer <token>`; sets req.userId. */
function requireAuth(req, res, next) {
  const match = /^Bearer\s+(\S+)$/i.exec(req.get('authorization') || '');
  let userId;
  try {
    userId = match ? verifyToken(match[1]) : null;
  } catch (error) {
    if (error.code === 'AUTH_NOT_CONFIGURED') {
      console.error('Auth is not configured: set AUTH_SECRET (32+ characters).');
      return res.status(500).json({ error: 'Autentikasi server belum dikonfigurasi.' });
    }
    return next(error);
  }
  if (!userId) {
    return res.status(401).json({ error: 'Sesi tidak valid atau sudah berakhir. Silakan login ulang.' });
  }
  req.userId = userId;
  next();
}

/** After requireAuth: only the owner of :param may continue. */
function requireSelf(param) {
  return (req, res, next) => {
    if (req.params[param] !== req.userId) {
      return res.status(403).json({ error: 'Kamu tidak punya akses ke data user ini.' });
    }
    next();
  };
}

function authConfigured(env = process.env) {
  try { secret(env); return true; } catch { return false; }
}

module.exports = { signToken, verifyToken, requireAuth, requireSelf, authConfigured, secretSource, TOKEN_TTL_SECONDS };
