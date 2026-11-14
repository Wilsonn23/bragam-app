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
    const { rows } = await pool.query(`
      SELECT id, name, category, latitude, longitude, radius_meters,
             description, notification_title, audio_guide_url
      FROM pois
      ORDER BY id
    `);
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
    const { rows } = await pool.query(
      `SELECT * FROM pois ${whereClause} ORDER BY id ASC`,
      values
    );

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

    res.json({
      data: filtered.map((row) => ({
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
    const { rows } = await pool.query(`
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
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    triggerRadiusMeters: Number(row.radius_meters),
    shortDescription: row.description || '',
    notificationTitle: row.notification_title || '',
    imageUrl: undefined,
    audioGuideUrl: row.audio_guide_url || undefined,
    distanceMeters: row.distance_meters === undefined ? undefined : Number(row.distance_meters),
  };
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});