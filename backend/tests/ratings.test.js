const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');

const userId = '11111111-1111-4111-8111-111111111111';

async function withServer(pool, run) {
  const app = createApp(pool);
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

test('rating summary exposes average, total and 1-5 breakdown', async () => {
  await withServer({
    query: async (sql) => {
      if (/SELECT id FROM pois/.test(sql)) return { rows: [{ id: 'P01' }] };
      if (/COALESCE\(ROUND\(AVG/.test(sql)) return { rows: [{
        average_rating: '4.3',
        review_count: '6',
        rating_1: '0', rating_2: '1', rating_3: '1',
        rating_4: '2', rating_5: '2',
        high_rating_count: '4', neutral_rating_count: '1', low_rating_count: '1',
      }] };
      if (/FROM poi_ratings r/.test(sql)) return { rows: [{
        id: 1, poi_id: 'P01', user_id: userId, rating: 5,
        review: 'Bagus', created_at: '2026-11-21T00:00:00Z',
        updated_at: '2026-11-21T00:00:00Z', user_name: 'Tester',
      }] };
      return { rows: [] };
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/pois/P01/ratings`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.averageRating, 4.3);
    assert.equal(body.reviewCount, 6);
    assert.deepEqual(body.breakdown, { 1: 0, 2: 1, 3: 1, 4: 2, 5: 2 });
    assert.equal(body.highRatingCount, 4);
    assert.equal(body.neutralRatingCount, 1);
    assert.equal(body.lowRatingCount, 1);
  });
});

test('POST creates or updates a 1-5 POI rating', async () => {
  await withServer({
    query: async (sql, values) => {
      if (/SELECT id FROM pois/.test(sql)) return { rows: [{ id: 'P01' }] };
      if (/INSERT INTO poi_ratings/.test(sql)) return { rows: [{
        id: 7, poi_id: values[0], user_id: values[1], rating: values[2],
        review: values[3], created_at: '2026-11-21T00:00:00Z',
        updated_at: '2026-11-21T00:00:00Z',
      }] };
      return { rows: [] };
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/pois/P01/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, rating: 5, review: 'Mantap' }),
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.rating, 5);
    assert.equal(body.review, 'Mantap');
  });
});

test('rating CRUD rejects invalid score and deletes existing rating', async () => {
  await withServer({
    query: async (sql) => {
      if (/SELECT id FROM pois/.test(sql)) return { rows: [{ id: 'P01' }] };
      if (/DELETE FROM poi_ratings/.test(sql)) return { rowCount: 1 };
      return { rows: [] };
    },
  }, async (baseUrl) => {
    const invalid = await fetch(`${baseUrl}/api/pois/P01/ratings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, rating: 8 }),
    });
    assert.equal(invalid.status, 400);

    const deleted = await fetch(`${baseUrl}/api/ratings/7`, { method: 'DELETE' });
    assert.equal(deleted.status, 204);
  });
});
