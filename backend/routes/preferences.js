const express = require('express');

const router = express.Router();

// Keep in sync with mobile/src/recommendation/preferences.js
const INTERESTS = ['kuliner', 'kafe', 'oleh', 'sejarah', 'hiburan', 'malam'];
const VISIT_TIMES = ['auto', 'pagi', 'siang', 'malam'];
const ENVIRONMENTS = ['any', 'indoor', 'outdoor'];
const BUDGETS = [null, 50000, 100000, 200000];
const FACTORS = ['preference', 'time', 'location', 'rating', 'weather'];
const DEFAULT_PREFERENCES = Object.freeze({
  interests: [],
  visitTime: 'auto',
  environment: 'any',
  maxBudget: null,
  hideClosed: true,
  weights: Object.freeze({ preference: 2, time: 2, location: 2, rating: 2, weather: 2 }),
});

router.get('/users/:userId/preferences', async (req, res, next) => {
  if (!isUuid(req.params.userId)) return res.status(400).json({ error: 'ID user tidak valid.' });
  try {
    const { rows } = await req.db.query(
      'SELECT preferences, updated_at FROM public.user_preferences WHERE user_id = $1',
      [req.params.userId],
    );
    if (!rows.length) return res.json({ preferences: withDefaults({}), updatedAt: null });
    res.json({ preferences: withDefaults(rows[0].preferences), updatedAt: rows[0].updated_at });
  } catch (error) {
    next(error);
  }
});

router.put('/users/:userId/preferences', async (req, res, next) => {
  if (!isUuid(req.params.userId)) return res.status(400).json({ error: 'ID user tidak valid.' });
  const validation = validatePreferences(req.body);
  if (validation.error) return res.status(400).json({ error: validation.error });

  try {
    const { rows } = await req.db.query(`
      INSERT INTO public.user_preferences (user_id, preferences)
      VALUES ($1, $2::jsonb)
      ON CONFLICT (user_id) DO UPDATE
      SET preferences = EXCLUDED.preferences,
          updated_at = CURRENT_TIMESTAMP
      RETURNING preferences, updated_at
    `, [req.params.userId, JSON.stringify(validation.value)]);
    res.json({ preferences: withDefaults(rows[0].preferences), updatedAt: rows[0].updated_at });
  } catch (error) {
    if (error.code === '23503') return res.status(404).json({ error: 'User tidak ditemukan.' });
    next(error);
  }
});

/** Strict validation for writes: unknown values are rejected, missing keys take defaults. */
function validatePreferences(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Body request tidak valid.' };
  const value = withDefaults({});
  const has = key => Object.prototype.hasOwnProperty.call(body, key);

  if (has('interests')) {
    if (!Array.isArray(body.interests) || !body.interests.every(item => INTERESTS.includes(item))) {
      return { error: `interests hanya boleh berisi: ${INTERESTS.join(', ')}.` };
    }
    value.interests = [...new Set(body.interests)];
  }
  if (has('visitTime')) {
    if (!VISIT_TIMES.includes(body.visitTime)) return { error: `visitTime harus salah satu dari: ${VISIT_TIMES.join(', ')}.` };
    value.visitTime = body.visitTime;
  }
  if (has('environment')) {
    if (!ENVIRONMENTS.includes(body.environment)) return { error: `environment harus salah satu dari: ${ENVIRONMENTS.join(', ')}.` };
    value.environment = body.environment;
  }
  if (has('maxBudget')) {
    if (!BUDGETS.includes(body.maxBudget)) return { error: 'maxBudget harus null, 50000, 100000, atau 200000.' };
    value.maxBudget = body.maxBudget;
  }
  if (has('hideClosed')) {
    if (typeof body.hideClosed !== 'boolean') return { error: 'hideClosed harus boolean.' };
    value.hideClosed = body.hideClosed;
  }
  if (has('weights')) {
    const weights = body.weights;
    if (!weights || typeof weights !== 'object' || Array.isArray(weights)) return { error: 'weights harus berupa objek.' };
    for (const [key, weight] of Object.entries(weights)) {
      if (!FACTORS.includes(key)) return { error: `Faktor bobot tidak dikenal: ${key}.` };
      if (!Number.isInteger(weight) || weight < 0 || weight > 3) return { error: 'Setiap bobot harus bilangan bulat 0 sampai 3.' };
      value.weights[key] = weight;
    }
    if (FACTORS.every(key => value.weights[key] === 0)) return { error: 'Minimal satu faktor harus aktif.' };
  }
  return { value };
}

/** Lenient read: stored values that no longer validate fall back to defaults. */
function withDefaults(stored) {
  const source = stored && typeof stored === 'object' ? stored : {};
  const weights = { ...DEFAULT_PREFERENCES.weights };
  for (const key of FACTORS) {
    const weight = source.weights?.[key];
    if (Number.isInteger(weight) && weight >= 0 && weight <= 3) weights[key] = weight;
  }
  return {
    interests: Array.isArray(source.interests) ? source.interests.filter(item => INTERESTS.includes(item)) : [],
    visitTime: VISIT_TIMES.includes(source.visitTime) ? source.visitTime : DEFAULT_PREFERENCES.visitTime,
    environment: ENVIRONMENTS.includes(source.environment) ? source.environment : DEFAULT_PREFERENCES.environment,
    maxBudget: BUDGETS.includes(source.maxBudget) ? source.maxBudget : DEFAULT_PREFERENCES.maxBudget,
    hideClosed: typeof source.hideClosed === 'boolean' ? source.hideClosed : DEFAULT_PREFERENCES.hideClosed,
    weights,
  };
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

module.exports = router;
module.exports.validatePreferences = validatePreferences;
module.exports.withDefaults = withDefaults;
