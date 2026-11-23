const express = require('express');
const bcrypt = require('bcryptjs');
const { signToken } = require('../auth');
const { createUser } = require('./users');

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
    res.json({ user: safeUser, token: signToken(safeUser.id) });
  } catch (error) {
    next(error);
  }
});

// Create an account and start a session in one step.
router.post('/register', async (req, res, next) => {
  try {
    const result = await createUser(req.db, req.body);
    if (result.error) return res.status(result.status).json({ error: result.error });
    res.status(201).json({ user: result.user, token: signToken(result.user.id) });
  } catch (error) {
    next(error);
  }
});

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

module.exports = router;
