const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.AUTH_SECRET = 'test-secret-for-ratings-'.padEnd(48, 'x');
const { createApp } = require('../server');
const { signToken } = require('../auth');

const userId = '11111111-1111-4111-8111-111111111111';
const otherUserId = '22222222-2222-4222-8222-222222222222';
const authHeaders = (id = userId) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${signToken(id)}` });

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
      headers: authHeaders(),
      body: JSON.stringify({ rating: 5, review: 'Mantap' }),
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.rating, 5);
    assert.equal(body.review, 'Mantap');
    assert.equal(body.userId, userId, 'author comes from the token');
  });
});

test('rating CRUD rejects invalid score and deletes existing rating', async () => {
  await withServer({
    query: async (sql) => {
      if (/SELECT id FROM pois/.test(sql)) return { rows: [{ id: 'P01' }] };
      if (/SELECT user_id FROM poi_ratings/.test(sql)) return { rows: [{ user_id: userId }] };
      if (/DELETE FROM poi_ratings/.test(sql)) return { rowCount: 1 };
      return { rows: [] };
    },
  }, async (baseUrl) => {
    const invalid = await fetch(`${baseUrl}/api/pois/P01/ratings`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ rating: 8 }),
    });
    assert.equal(invalid.status, 400);

    const deleted = await fetch(`${baseUrl}/api/ratings/7`, { method: 'DELETE', headers: authHeaders() });
    assert.equal(deleted.status, 204);
  });
});

test('rating writes require a valid session', async () => {
  let queried = false;
  await withServer({ query: async () => { queried = true; return { rows: [] }; } }, async (baseUrl) => {
    const noToken = await fetch(`${baseUrl}/api/pois/P01/ratings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, rating: 5 }),
    });
    assert.equal(noToken.status, 401);
    const forged = await fetch(`${baseUrl}/api/ratings/7`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${signToken(userId).slice(0, -2)}xx` },
    });
    assert.equal(forged.status, 401);
    const patch = await fetch(`${baseUrl}/api/ratings/7`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: 1 }),
    });
    assert.equal(patch.status, 401);
  });
  assert.equal(queried, false, 'unauthenticated requests never reach the database');
});

test('users cannot rate as, edit, or delete for someone else', async () => {
  const writes = [];
  await withServer({
    query: async (sql) => {
      if (/SELECT user_id FROM poi_ratings/.test(sql)) return { rows: [{ user_id: otherUserId }] };
      if (/UPDATE poi_ratings|DELETE FROM poi_ratings|INSERT INTO poi_ratings/.test(sql)) writes.push(sql);
      return { rows: [] };
    },
  }, async (baseUrl) => {
    const impersonate = await fetch(`${baseUrl}/api/pois/P01/ratings`, {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ userId: otherUserId, rating: 1 }),
    });
    assert.equal(impersonate.status, 403);

    const edit = await fetch(`${baseUrl}/api/ratings/7`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ rating: 1 }),
    });
    assert.equal(edit.status, 403);

    const remove = await fetch(`${baseUrl}/api/ratings/7`, { method: 'DELETE', headers: authHeaders() });
    assert.equal(remove.status, 403);
  });
  assert.deepEqual(writes, []);
});

test('owners can edit their rating and the update is owner-scoped', async () => {
  let update;
  await withServer({
    query: async (sql, values) => {
      if (/SELECT user_id FROM poi_ratings/.test(sql)) return { rows: [{ user_id: userId }] };
      if (/UPDATE poi_ratings/.test(sql)) {
        update = { sql, values };
        return { rows: [{ id: 7, poi_id: 'P01', user_id: userId, rating: 4, review: 'Oke', created_at: 'x', updated_at: 'y' }] };
      }
      return { rows: [] };
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/ratings/7`, {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ rating: 4, review: 'Oke' }),
    });
    assert.equal(response.status, 200);
    assert.match(update.sql, /WHERE id = \$\d+ AND user_id = \$\d+/);
    assert.equal(update.values.at(-1), userId);
  });
});

test('missing ratings return 404 before ownership is considered', async () => {
  await withServer({ query: async () => ({ rows: [] }) }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/ratings/999`, { method: 'DELETE', headers: authHeaders() });
    assert.equal(response.status, 404);
  });
});
