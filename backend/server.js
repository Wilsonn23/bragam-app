const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const swaggerUi = require('swagger-ui-express');
const usersRouter = require('./routes/users');
const openapiSpec = require('./openapi');
const { toPoiResponse } = require('./poiResponse');
require('dotenv').config();

function createApp(pool) {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));
  app.get('/openapi.json', (req, res) => res.json(openapiSpec));

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
               description, notification_title, notification_body, cooldown_seconds, audio_guide_url
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
               description, notification_title, notification_body, cooldown_seconds, audio_guide_url,
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
        ORDER BY distance_meters ASC, id ASC
        LIMIT 1
      `, [latitude, longitude, maxRadius]);
      res.json(rows.length ? toPoiResponse(rows[0]) : null);
    } catch (error) {
      next(error);
    }
  });

  app.use('/api/users', usersRouter);

  app.use((error, req, res, next) => {
    console.error('Database request failed:', error.code || 'unknown');
    res.status(500).json({ error: 'Database request failed.' });
  });

  return app;
}

if (require.main === module) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
  createApp(pool).listen(process.env.PORT || 5000, () => console.log('BRAGAm API server ready'));
}
module.exports = { createApp };
