const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const swaggerUi = require('swagger-ui-express');
const usersRouter = require('./routes/users');
const poisRouter = require('./routes/pois');
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

app.use('/api', poisRouter);
app.use('/api/users', usersRouter);

const PORT = process.env.PORT || 5000;
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Database request failed.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});