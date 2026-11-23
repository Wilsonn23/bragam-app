const express = require('express');

const router = express.Router();

router.get('/pois/:poiId/ratings', async (req, res, next) => {
  try {
    const poi = await req.db.query('SELECT id FROM pois WHERE id = $1', [req.params.poiId]);
    if (!poi.rows.length) return res.status(404).json({ error: 'POI tidak ditemukan.' });

    const summaryResult = await req.db.query(`
      SELECT
        COALESCE(ROUND(AVG(rating)::NUMERIC, 1), 0) AS average_rating,
        COUNT(*) AS review_count,
        COUNT(*) FILTER (WHERE rating = 1) AS rating_1,
        COUNT(*) FILTER (WHERE rating = 2) AS rating_2,
        COUNT(*) FILTER (WHERE rating = 3) AS rating_3,
        COUNT(*) FILTER (WHERE rating = 4) AS rating_4,
        COUNT(*) FILTER (WHERE rating = 5) AS rating_5,
        COUNT(*) FILTER (WHERE rating >= 4) AS high_rating_count,
        COUNT(*) FILTER (WHERE rating = 3) AS neutral_rating_count,
        COUNT(*) FILTER (WHERE rating <= 2) AS low_rating_count
      FROM poi_ratings
      WHERE poi_id = $1
    `, [req.params.poiId]);

    const ratingsResult = await req.db.query(`
      SELECT r.id, r.poi_id, r.user_id, r.rating, r.review, r.created_at, r.updated_at,
             u.name AS user_name
      FROM poi_ratings r
      LEFT JOIN public.users u ON u.id = r.user_id
      WHERE r.poi_id = $1
      ORDER BY r.updated_at DESC, r.id DESC
    `, [req.params.poiId]);

    const row = summaryResult.rows[0];
    res.json({
      poiId: req.params.poiId,
      averageRating: Number(row.average_rating),
      reviewCount: Number(row.review_count),
      highRatingCount: Number(row.high_rating_count),
      neutralRatingCount: Number(row.neutral_rating_count),
      lowRatingCount: Number(row.low_rating_count),
      breakdown: {
        1: Number(row.rating_1),
        2: Number(row.rating_2),
        3: Number(row.rating_3),
        4: Number(row.rating_4),
        5: Number(row.rating_5),
      },
      ratings: ratingsResult.rows.map(formatRating),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/pois/:poiId/ratings', async (req, res, next) => {
  const rating = validateRating(req.body?.rating);
  const userId = typeof req.body?.userId === 'string' ? req.body.userId : '';
  if (!isUuid(userId)) return res.status(400).json({ error: 'userId harus berupa UUID yang valid.' });
  if (!rating.valid) return res.status(400).json({ error: rating.error });
  const review = normalizeReview(req.body?.review);

  try {
    const poi = await req.db.query('SELECT id FROM pois WHERE id = $1', [req.params.poiId]);
    if (!poi.rows.length) return res.status(404).json({ error: 'POI tidak ditemukan.' });

    const { rows } = await req.db.query(`
      INSERT INTO poi_ratings (poi_id, user_id, rating, review)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (poi_id, user_id) DO UPDATE
      SET rating = EXCLUDED.rating,
          review = EXCLUDED.review,
          updated_at = CURRENT_TIMESTAMP
      RETURNING id, poi_id, user_id, rating, review, created_at, updated_at
    `, [req.params.poiId, userId, rating.value, review]);
    res.status(201).json(formatRating(rows[0]));
  } catch (error) {
    if (error.code === '23503') return res.status(404).json({ error: 'User tidak ditemukan.' });
    next(error);
  }
});

router.get('/ratings/:id', async (req, res, next) => {
  const id = parseRatingId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID rating tidak valid.' });

  try {
    const { rows } = await req.db.query(`
      SELECT r.id, r.poi_id, r.user_id, r.rating, r.review, r.created_at, r.updated_at,
             u.name AS user_name
      FROM poi_ratings r
      LEFT JOIN public.users u ON u.id = r.user_id
      WHERE r.id = $1
    `, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Rating tidak ditemukan.' });
    res.json(formatRating(rows[0]));
  } catch (error) {
    next(error);
  }
});

router.patch('/ratings/:id', async (req, res, next) => {
  const id = parseRatingId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID rating tidak valid.' });
  if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Body request tidak valid.' });

  const fields = [];
  const values = [];
  if (Object.prototype.hasOwnProperty.call(req.body, 'rating')) {
    const rating = validateRating(req.body.rating);
    if (!rating.valid) return res.status(400).json({ error: rating.error });
    fields.push(`rating = $${values.length + 1}`);
    values.push(rating.value);
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'review')) {
    fields.push(`review = $${values.length + 1}`);
    values.push(normalizeReview(req.body.review));
  }
  if (!fields.length) return res.status(400).json({ error: 'Tidak ada field yang diubah.' });
  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  try {
    const { rows } = await req.db.query(`
      UPDATE poi_ratings
      SET ${fields.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, poi_id, user_id, rating, review, created_at, updated_at
    `, values);
    if (!rows.length) return res.status(404).json({ error: 'Rating tidak ditemukan.' });
    res.json(formatRating(rows[0]));
  } catch (error) {
    next(error);
  }
});

router.delete('/ratings/:id', async (req, res, next) => {
  const id = parseRatingId(req.params.id);
  if (!id) return res.status(400).json({ error: 'ID rating tidak valid.' });

  try {
    const result = await req.db.query('DELETE FROM poi_ratings WHERE id = $1', [id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Rating tidak ditemukan.' });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/users/:userId/ratings', async (req, res, next) => {
  if (!isUuid(req.params.userId)) return res.status(400).json({ error: 'ID user tidak valid.' });
  try {
    const { rows } = await req.db.query(`
      SELECT id, poi_id, user_id, rating, review, created_at, updated_at
      FROM poi_ratings
      WHERE user_id = $1
      ORDER BY updated_at DESC
    `, [req.params.userId]);
    res.json(rows.map(formatRating));
  } catch (error) {
    next(error);
  }
});

function validateRating(value) {
  const rating = typeof value === 'string' ? Number(value) : value;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { valid: false, error: 'Rating harus berupa bilangan bulat dari 1 sampai 5.' };
  }
  return { valid: true, value: rating };
}

function normalizeReview(value) {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 2000) : null;
}

function parseRatingId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function formatRating(row) {
  return {
    id: Number(row.id),
    poiId: row.poi_id,
    userId: row.user_id,
    rating: Number(row.rating),
    review: row.review ?? null,
    userName: row.user_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = router;
