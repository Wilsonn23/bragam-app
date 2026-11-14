const express = require('express');
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');

const router = express.Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await req.db.query(`
      SELECT id, email, name, created_at, updated_at
      FROM public.users
      ORDER BY created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: 'ID user tidak valid.' });

  try {
    const { rows } = await req.db.query(`
      SELECT id, email, name, created_at, updated_at
      FROM public.users
      WHERE id = $1
    `, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'User tidak ditemukan.' });
    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  const validation = validateCreateInput(req.body);
  if (validation.error) return res.status(400).json({ error: validation.error });

  try {
    const passwordHash = await bcrypt.hash(validation.password, 12);
    const { rows } = await req.db.query(`
      INSERT INTO public.users (id, email, name, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, created_at, updated_at
    `, [crypto.randomUUID(), validation.email, validation.name, passwordHash]);
    res.status(201).json(rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email user sudah terdaftar.' });
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: 'ID user tidak valid.' });
  const validation = validateUpdateInput(req.body);
  if (validation.error) return res.status(400).json({ error: validation.error });

  const fields = [];
  const values = [];
  if (validation.email !== undefined) {
    fields.push(`email = $${values.length + 1}`);
    values.push(validation.email);
  }
  if (validation.name !== undefined) {
    fields.push(`name = $${values.length + 1}`);
    values.push(validation.name);
  }
  if (validation.password !== undefined) {
    fields.push(`password_hash = $${values.length + 1}`);
    values.push(await bcrypt.hash(validation.password, 12));
  }
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(req.params.id);

  try {
    const { rows } = await req.db.query(`
      UPDATE public.users
      SET ${fields.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, email, name, created_at, updated_at
    `, values);
    if (!rows.length) return res.status(404).json({ error: 'User tidak ditemukan.' });
    res.json(rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Email user sudah terdaftar.' });
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  if (!isUuid(req.params.id)) return res.status(400).json({ error: 'ID user tidak valid.' });

  try {
    const result = await req.db.query('DELETE FROM public.users WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'User tidak ditemukan.' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

function validateCreateInput(body) {
  const email = normalizeEmail(body?.email);
  const name = normalizeName(body?.name);
  const password = body?.password;
  if (!emailPattern.test(email)) return { error: 'Email tidak valid.' };
  if (typeof password !== 'string' || password.length < 8) return { error: 'Password minimal 8 karakter.' };
  return { email, name, password };
}

function validateUpdateInput(body) {
  if (!body || typeof body !== 'object') return { error: 'Body request tidak valid.' };
  const result = {};
  if (Object.prototype.hasOwnProperty.call(body, 'email')) {
    result.email = normalizeEmail(body.email);
    if (!emailPattern.test(result.email)) return { error: 'Email tidak valid.' };
  }
  if (Object.prototype.hasOwnProperty.call(body, 'name')) result.name = normalizeName(body.name);
  if (Object.prototype.hasOwnProperty.call(body, 'password')) {
    if (typeof body.password !== 'string' || body.password.length < 8) return { error: 'Password minimal 8 karakter.' };
    result.password = body.password;
  }
  if (!Object.keys(result).length) return { error: 'Tidak ada field yang diubah.' };
  return result;
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeName(value) {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

module.exports = router;
