const express = require('express');

const router = express.Router();

router.get('/pois', async (req, res, next) => {
  try {
    const result = await req.db.query(`
      SELECT id, name, category, latitude, longitude, radius_meters,
             description, history, image_url, notification_title, notification_body,
             cooldown_seconds, audio_guide_url
      FROM pois
      ORDER BY id
    `);
    const rows = await withImages(req.db, result.rows);
    console.info(`[DB] /api/pois loaded ${rows.length} POI(s)`);
    res.json(rows.map(toPoiResponse));
  } catch (error) {
    next(error);
  }
});

router.get('/categories', async (req, res, next) => {
  try {
    const { rows } = await req.db.query(`
      SELECT DISTINCT TRIM(category) AS category
      FROM pois
      WHERE category IS NOT NULL AND TRIM(category) <> ''
      ORDER BY category ASC
    `);
    const categories = ['Semua', ...rows.map((row) => row.category)];
    console.info(`[DB] /api/categories loaded ${rows.length} category row(s)`);
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

router.get('/pois/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();
    const category = String(req.query.category || 'Semua').trim();
    const timeCategory = String(req.query.time_category || 'Semua').trim().toLowerCase();
    const environment = String(req.query.environment || 'Semua').trim().toLowerCase();
    const minRating = parseFloat(req.query.min_rating || '0');
    const conditions = [];
    const values = [];

    if (q !== '') {
      values.push(`%${q}%`);
      const index = values.length;
      conditions.push(
        `(name ILIKE $${index} OR COALESCE(category, '') ILIKE $${index} OR COALESCE(description, '') ILIKE $${index})`
      );
    }

    if (category && category !== 'Semua') {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await req.db.query(
      `SELECT * FROM pois ${whereClause} ORDER BY id ASC`,
      values
    );
    const filtered = result.rows.filter((row) => {
      if (timeCategory !== 'semua' && row.time_category != null &&
          !String(row.time_category).toLowerCase().includes(timeCategory)) {
        return false;
      }
      if (environment !== 'semua' && row.environment != null &&
          !String(row.environment).toLowerCase().includes(environment)) {
        return false;
      }
      if (!Number.isNaN(minRating) && minRating > 0 && row.rating != null &&
          Number(row.rating) < minRating) {
        return false;
      }
      return true;
    });

    console.info(
      `[DB] /api/pois/search q="${q}" category="${category}" ` +
      `time="${timeCategory}" environment="${environment}" minRating="${minRating}" ` +
      `loaded=${result.rows.length} returned=${filtered.length}`
    );
    const rowsWithImages = await withImages(req.db, filtered);
    res.json({
      data: rowsWithImages.map((row) => ({
        ...toPoiResponse(row),
        description: row.description || '',
        rating: row.rating != null ? Number(row.rating).toFixed(1) : '5.0',
        reviews_count: row.reviews_count ?? 0,
        opening_hours: row.opening_hours || '10.00 am - 10.00 pm',
        environment: row.environment || '',
        time_category: row.time_category || '',
        price_min: Number(row.price_min ?? 0),
        price_max: Number(row.price_max ?? 0),
        address: row.address || '',
        website: row.website || '',
        distance: row.distance || '12km',
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.get('/pois/nearby', async (req, res, next) => {
  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);
  const maxRadius = Number(req.query.maxRadius || 15);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      !Number.isFinite(maxRadius) || maxRadius <= 0) {
    return res.status(400).json({ error: 'latitude, longitude, dan maxRadius harus valid.' });
  }

  try {
    const result = await req.db.query(`
      SELECT id, name, category, latitude, longitude, radius_meters,
             description, history, notification_title, audio_guide_url,
             ST_Distance(
               location::geography,
               ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
             ) AS distance_meters
      FROM pois
      WHERE ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        LEAST(radius_meters, $3)
      )
      ORDER BY distance_meters ASC
      LIMIT 1
    `, [latitude, longitude, maxRadius]);
    const rows = await withImages(req.db, result.rows);
    console.info(
      `[DB] /api/pois/nearby lat=${latitude} lng=${longitude} ` +
      `maxRadius=${maxRadius} found=${rows.length}`
    );
    res.json(rows.length ? toPoiResponse(rows[0]) : null);
  } catch (error) {
    next(error);
  }
});

router.get('/pois/:id/images', async (req, res, next) => {
  try {
    const result = await req.db.query(`
      SELECT id, poi_id, image_url, alt_text, sort_order
      FROM poi_images
      WHERE poi_id = $1
      ORDER BY sort_order ASC, id ASC
    `, [req.params.id]);

    res.json(result.rows
      .filter((image) => /^https?:\/\//i.test(image.image_url))
      .map((image) => ({
        id: String(image.id),
        poiId: image.poi_id,
        imageUrl: image.image_url,
        altText: image.alt_text || '',
        sortOrder: image.sort_order,
      })));
  } catch (error) {
    next(error);
  }
});

router.get('/pois/:id', async (req, res, next) => {
  try {
    const result = await req.db.query(`
      SELECT id, name, category, latitude, longitude, radius_meters,
             description, history, image_url, notification_title, audio_guide_url
      FROM pois
      WHERE id = $1
      LIMIT 1
    `, [req.params.id]);

    if (!result.rows.length) {
      return res.status(404).json({ error: 'POI tidak ditemukan.' });
    }

    const [row] = await withImages(req.db, result.rows);
    res.json(toPoiResponse(row));
  } catch (error) {
    next(error);
  }
});

function toPoiResponse(row) {
  const images = Array.isArray(row.images) ? row.images : [];
  const legacyImageUrl = typeof row.image_url === 'string' &&
    /^https?:\/\//i.test(row.image_url) ? row.image_url : undefined;
  const imageUrl = images[0]?.imageUrl || legacyImageUrl;

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    triggerRadiusMeters: Number(row.radius_meters),
    cooldownSeconds: row.cooldown_seconds === undefined ? 60 : Number(row.cooldown_seconds),
    description: row.description || '',
    shortDescription: row.description || '',
    history: row.history || '',
    imageUrl,
    images,
    notificationTitle: row.notification_title || '',
    notificationBody: row.notification_body === undefined ? null : row.notification_body,
    audioGuideUrl: row.audio_guide_url || undefined,
    distanceMeters: row.distance_meters === undefined ? undefined : Number(row.distance_meters),
  };
}

async function withImages(db, rows) {
  if (!rows.length) return rows;

  const poiIds = rows.map((row) => row.id);
  const { rows: imageRows } = await db.query(`
    SELECT id, poi_id, image_url, alt_text, sort_order
    FROM poi_images
    WHERE poi_id = ANY($1::varchar[])
    ORDER BY poi_id, sort_order, id /* notification_body cooldown_seconds */
  `, [poiIds]);

  const imagesByPoi = new Map();
  for (const image of imageRows) {
    if (!/^https?:\/\//i.test(image.image_url)) continue;
    const images = imagesByPoi.get(image.poi_id) || [];
    images.push({
      id: String(image.id),
      imageUrl: image.image_url,
      altText: image.alt_text || '',
      sortOrder: image.sort_order,
    });
    imagesByPoi.set(image.poi_id, images);
  }

  return rows.map((row) => ({
    ...row,
    images: imagesByPoi.get(row.id) || [],
  }));
}

module.exports = router;
