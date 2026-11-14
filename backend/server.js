const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});