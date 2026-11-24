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
function requireUserSession(req, res, next) {
  const token = /^Bearer (\S+)$/.exec(req.get('Authorization') || '')?.[1];
  const session = token && sessions.get(token);
  if (!session || session.expires <= Date.now()) {
    if (token) sessions.delete(token);
    return res.status(401).json({ error: 'Sesi berakhir. Silakan login kembali.' });
  }
  if (session.userId !== req.params.userId) return res.status(403).json({ error: 'Akses ditolak.' });
  next();
}
function revokeSession(token) { if (token) sessions.delete(token); }
module.exports = { createSession, requireUserSession, revokeSession };
