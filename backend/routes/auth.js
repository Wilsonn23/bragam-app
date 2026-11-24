const express = require('express');
const bcrypt = require('bcryptjs');
const { createSession, revokeSession } = require('../session');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;

  if (!email || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  try {
    const { rows } = await req.db.query(`
      SELECT id, email, name, password_hash, created_at, updated_at
      FROM public.users
      WHERE email = $1
      LIMIT 1
    `, [email]);

    const user = rows[0];
    const passwordMatches = user?.password_hash
      ? await bcrypt.compare(password, user.password_hash)
      : false;

    if (!user || !passwordMatches) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const { password_hash: _passwordHash, ...safeUser } = user;
    res.json({ user: safeUser, token: createSession(user.id) });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res) => {
  const token = /^Bearer (\S+)$/.exec(req.get('Authorization') || '')?.[1];
  revokeSession(token);
  res.status(204).end();
});

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

module.exports = router;
