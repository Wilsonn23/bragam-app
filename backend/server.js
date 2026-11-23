const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const swaggerUi = require('swagger-ui-express');
const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');
const poisRouter = require('./routes/pois');
const ratingsRouter = require('./routes/ratings');
const preferencesRouter = require('./routes/preferences');
const openapiSpec = require('./openapi');
const { authConfigured, secretSource } = require('./auth');
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

  app.use('/api', poisRouter);
  app.use('/api', ratingsRouter);
  app.use('/api', preferencesRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/auth', authRouter);

  app.use((error, req, res, next) => {
    if (error.code === 'AUTH_NOT_CONFIGURED') {
      console.error('Auth is not configured: set AUTH_SECRET (32+ characters) in backend/.env.');
      return res.status(500).json({ error: 'Autentikasi server belum dikonfigurasi.' });
    }
    console.error('Database request failed:', error.code || 'unknown');
    res.status(500).json({ error: 'Database request failed.' });
  });

  return app;
}

if (require.main === module) {
  // Resolves (and on first run generates) the token secret before serving requests.
  if (!authConfigured()) {
    console.warn('WARNING: AUTH_SECRET is set but shorter than 32 characters. ' +
      'Remove it to use an auto-generated secret, or set a longer one.');
  } else {
    console.log(secretSource() === 'env'
      ? 'Auth: using AUTH_SECRET from environment'
      : 'Auth: using auto-generated secret (backend/.auth-secret)');
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
  createApp(pool).listen(process.env.PORT || 5000, () => console.log('BRAGAm API server ready'));
}
module.exports = { createApp };
