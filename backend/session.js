// Opaque login sessions kept in backend memory (no secret to configure).
// Tokens last 12 hours, can be revoked via POST /api/auth/logout, and are lost when the
// server restarts (users then simply log in again).
const crypto = require('node:crypto');
const sessions = new Map();
const TTL = 12 * 60 * 60 * 1000;

function createSession(userId) {
  const now = Date.now();
  for (const [key, session] of sessions) if (session.expires <= now) sessions.delete(key);
  const token = crypto.randomBytes(32).toString('base64url');
  sessions.set(token, { userId, expires: now + TTL });
  return token;
}

function bearerToken(req) {
  return /^Bearer (\S+)$/.exec(req.get('Authorization') || '')?.[1];
}

/** Any signed-in user; sets req.userId. Used where ownership is checked per record (ratings). */
function requireSession(req, res, next) {
  const token = bearerToken(req);
  const session = token && sessions.get(token);
  if (!session || session.expires <= Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: 'Sesi berakhir. Silakan login kembali.' });
  }
  req.userId = session.userId;
  next();
}

/** Signed-in user who must also own the :userId in the path (bookmarks, trips, preferences). */
function requireUserSession(req, res, next) {
  requireSession(req, res, () => {
    if (req.userId !== req.params.userId) return res.status(403).json({ error: 'Akses ditolak.' });
    next();
  });
}

function revokeSession(token) { if (token) sessions.delete(token); }

module.exports = { createSession, requireSession, requireUserSession, revokeSession, bearerToken };
