const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
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

const post = (url, body, headers = {}) => fetch(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
});
// A protected endpoint that only checks the session (preferences of the token's own user).
const preferencesOf = (baseUrl, id, token) =>
  fetch(`${baseUrl}/api/users/${id}/preferences`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

test('login returns a working session token for valid credentials only', async () => {
  const passwordHash = await bcrypt.hash('password123', 4);
  await withServer({
    query: async (sql) => /FROM public.users/.test(sql)
      ? { rows: [{ id: userId, email: 'a@b.co', name: 'A', password_hash: passwordHash }] }
      : { rows: [] },
  }, async (baseUrl) => {
    const ok = await post(`${baseUrl}/api/auth/login`, { email: 'A@b.co ', password: 'password123' });
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(body.user.id, userId);
    assert.equal(body.user.password_hash, undefined);
    assert.equal((await preferencesOf(baseUrl, userId, body.token)).status, 200, 'token opens the session');

    const wrong = await post(`${baseUrl}/api/auth/login`, { email: 'a@b.co', password: 'nope-nope' });
    assert.equal(wrong.status, 401);
    assert.equal((await wrong.json()).token, undefined);
  });
});

test('register creates the account and starts a session', async () => {
  await withServer({
    query: async (sql, values) => /INSERT INTO public.users/.test(sql)
      ? { rows: [{ id: values[0], email: values[1], name: values[2] }] }
      : { rows: [] },
  }, async (baseUrl) => {
    const response = await post(`${baseUrl}/api/auth/register`, { name: 'Baru', email: 'baru@b.co', password: 'password123' });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.user.email, 'baru@b.co');
    assert.equal((await preferencesOf(baseUrl, body.user.id, body.token)).status, 200);

    assert.equal((await post(`${baseUrl}/api/auth/register`, { email: 'bad', password: 'password123' })).status, 400);
  });
});

test('register reports duplicate email without issuing a token', async () => {
  await withServer({
    query: async () => { throw Object.assign(new Error('dup'), { code: '23505' }); },
  }, async (baseUrl) => {
    const response = await post(`${baseUrl}/api/auth/register`, { email: 'a@b.co', password: 'password123' });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).token, undefined);
  });
});

test('logout revokes the session token', async () => {
  const passwordHash = await bcrypt.hash('password123', 4);
  await withServer({
    query: async (sql) => /FROM public.users/.test(sql)
      ? { rows: [{ id: userId, email: 'a@b.co', name: 'A', password_hash: passwordHash }] }
      : { rows: [] },
  }, async (baseUrl) => {
    const { token } = await (await post(`${baseUrl}/api/auth/login`, { email: 'a@b.co', password: 'password123' })).json();
    assert.equal((await preferencesOf(baseUrl, userId, token)).status, 200);
    const logout = await post(`${baseUrl}/api/auth/logout`, {}, { Authorization: `Bearer ${token}` });
    assert.equal(logout.status, 204);
    assert.equal((await preferencesOf(baseUrl, userId, token)).status, 401, 'revoked token no longer works');
  });
});
