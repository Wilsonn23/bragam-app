const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const swaggerUi = require('swagger-ui-express');
const usersRouter = require('./routes/users');
const openapiSpec = require('./openapi');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    console.info(
      `[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`
    );
  });
  next();
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
app.get('/openapi.json', (req, res) => res.json(openapiSpec));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

app.use((req, res, next) => {
  req.db = pool;
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    message: 'BRAGAm API Server Running',
  });
});

app.get('/api/pois', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT id, name, category, latitude, longitude, radius_meters,
             description, image_url, notification_title, audio_guide_url
      FROM pois
      ORDER BY id
    `);
    const rows = await withImages(result.rows);
    console.info(`[DB] /api/pois loaded ${rows.length} POI(s)`);
    res.json(rows.map(toPoiResponse));
  } catch (error) {
    next(error);
  }
});

// Daftar kategori unik dari tabel pois di Supabase
app.get('/api/categories', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT TRIM(category) AS category
      FROM pois
      WHERE category IS NOT NULL AND TRIM(category) <> ''
      ORDER BY category ASC
    `);
    const categories = ['Semua', ...rows.map((r) => r.category)];
    console.info(`[DB] /api/categories loaded ${rows.length} category row(s)`);
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

// Pencarian & filter POI dari tabel pois di Supabase
app.get('/api/pois/search', async (req, res, next) => {
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
      const idx = values.length;
      conditions.push(
        `(name ILIKE $${idx} OR COALESCE(category, '') ILIKE $${idx} OR COALESCE(description, '') ILIKE $${idx})`
      );
    }

    if (category && category !== 'Semua') {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM pois ${whereClause} ORDER BY id ASC`,
      values
    );
    const rows = result.rows;

    const filtered = rows.filter((row) => {
      if (timeCategory !== 'semua' && row.time_category != null) {
        if (!String(row.time_category).toLowerCase().includes(timeCategory)) {
          return false;
        }
      }
      if (environment !== 'semua' && row.environment != null) {
        if (!String(row.environment).toLowerCase().includes(environment)) {
          return false;
        }
      }
      if (!Number.isNaN(minRating) && minRating > 0 && row.rating != null) {
        if (Number(row.rating) < minRating) {
          return false;
        }
      }
      return true;
    });

    console.info(
      `[DB] /api/pois/search q="${q}" category="${category}" ` +
      `time="${timeCategory}" environment="${environment}" minRating="${minRating}" ` +
      `loaded=${rows.length} returned=${filtered.length}`
    );
    const rowsWithImages = await withImages(filtered);
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

app.get('/api/pois/nearby', async (req, res, next) => {
  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);
  const maxRadius = Number(req.query.maxRadius || 15);

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180 ||
      !Number.isFinite(maxRadius) || maxRadius <= 0) {
    return res.status(400).json({ error: 'latitude, longitude, dan maxRadius harus valid.' });
  }

  try {
    const result = await pool.query(`
      SELECT id, name, category, latitude, longitude, radius_meters,
             description, notification_title, audio_guide_url,
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
    const rows = await withImages(result.rows);
    console.info(
      `[DB] /api/pois/nearby lat=${latitude} lng=${longitude} ` +
      `maxRadius=${maxRadius} found=${rows.length}`
    );
    res.json(rows.length ? toPoiResponse(rows[0]) : null);
  } catch (error) {
    next(error);
  }
});

app.use('/api/users', usersRouter);

const PORT = process.env.PORT || 5000;
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Database request failed.' });
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
    shortDescription: row.description || '',
    imageUrl,
    images,
    notificationTitle: row.notification_title || '',
    audioGuideUrl: row.audio_guide_url || undefined,
    distanceMeters: row.distance_meters === undefined ? undefined : Number(row.distance_meters),
  };
}

async function withImages(rows) {
  if (!rows.length) return rows;

  const poiIds = rows.map((row) => row.id);
  const { rows: imageRows } = await pool.query(`
    SELECT id, poi_id, image_url, alt_text, sort_order
    FROM poi_images
    WHERE poi_id = ANY($1::varchar[])
    ORDER BY poi_id, sort_order, id
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});