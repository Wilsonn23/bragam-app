const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');
const { toPoiResponse } = require('../poiResponse');

const userId = '11111111-1111-4111-8111-111111111111';
const DEFAULTS = {
  interests: [], visitTime: 'auto', environment: 'any', maxBudget: null, hideClosed: true,
  weights: { preference: 2, time: 2, location: 2, rating: 2, weather: 2 },
};

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

const put = (url, body) => fetch(url, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('preferences default when the user has not saved any', async () => {
  await withServer({ query: async () => ({ rows: [] }) }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/users/${userId}/preferences`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { preferences: DEFAULTS, updatedAt: null });
  });
});

test('stored preferences are merged over defaults and stale values are dropped', async () => {
  await withServer({
    query: async () => ({ rows: [{
      preferences: { interests: ['kafe', 'unknown'], visitTime: 'malam', weights: { rating: 3, bogus: 1 } },
      updated_at: '2026-11-23T00:00:00Z',
    }] }),
  }, async (baseUrl) => {
    const body = await (await fetch(`${baseUrl}/api/users/${userId}/preferences`)).json();
    assert.deepEqual(body.preferences.interests, ['kafe']);
    assert.equal(body.preferences.visitTime, 'malam');
    assert.equal(body.preferences.environment, 'any');
    assert.deepEqual(body.preferences.weights, { ...DEFAULTS.weights, rating: 3 });
  });
});

test('saving preferences upserts the validated JSON document', async () => {
  const calls = [];
  await withServer({
    query: async (sql, params) => {
      calls.push({ sql, params });
      return { rows: [{ preferences: JSON.parse(params[1]), updated_at: '2026-11-23T00:00:00Z' }] };
    },
  }, async (baseUrl) => {
    const response = await put(`${baseUrl}/api/users/${userId}/preferences`, {
      interests: ['kuliner', 'kuliner', 'sejarah'], environment: 'indoor', maxBudget: 100000,
      hideClosed: false, weights: { weather: 3, location: 0 },
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.preferences.interests, ['kuliner', 'sejarah']);
    assert.equal(body.preferences.maxBudget, 100000);
    assert.equal(body.preferences.hideClosed, false);
    assert.equal(body.preferences.weights.weather, 3);
    assert.equal(body.preferences.weights.location, 0);
    assert.match(calls[0].sql, /ON CONFLICT \(user_id\) DO UPDATE/);
    assert.equal(calls[0].params[0], userId);
  });
});

test('invalid preference values are rejected before touching the database', async () => {
  let queried = false;
  await withServer({ query: async () => { queried = true; return { rows: [] }; } }, async (baseUrl) => {
    const url = `${baseUrl}/api/users/${userId}/preferences`;
    for (const body of [
      { interests: ['pizza'] },
      { visitTime: 'subuh' },
      { environment: 'roof' },
      { maxBudget: 75000 },
      { hideClosed: 'yes' },
      { weights: { rating: 5 } },
      { weights: { mood: 1 } },
      { weights: { preference: 0, time: 0, location: 0, rating: 0, weather: 0 } },
      [],
    ]) {
      const response = await put(url, body);
      assert.equal(response.status, 400, JSON.stringify(body));
    }
    assert.equal((await put(`${baseUrl}/api/users/not-a-uuid/preferences`, {})).status, 400);
  });
  assert.equal(queried, false);
});

test('saving preferences for an unknown user returns 404', async () => {
  await withServer({
    query: async () => { throw Object.assign(new Error('fk'), { code: '23503' }); },
  }, async (baseUrl) => {
    const response = await put(`${baseUrl}/api/users/${userId}/preferences`, { visitTime: 'pagi' });
    assert.equal(response.status, 404);
  });
});

test('POI responses carry the contextual fields used by recommendations', () => {
  const poi = toPoiResponse({
    id: 'P05', name: 'Street Food', category: 'Kuliner', latitude: '-6.9', longitude: '107.6', radius_meters: 10,
    time_category: 'malam', environment: 'outdoor', avg_duration_minutes: 25,
  });
  assert.equal(poi.timeCategory, 'malam');
  assert.equal(poi.environment, 'outdoor');
  assert.equal(poi.avgDurationMinutes, 25);
});
