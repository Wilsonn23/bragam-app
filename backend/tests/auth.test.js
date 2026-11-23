const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SECRET = 'test-secret-for-auth-'.padEnd(48, 'x');
process.env.AUTH_SECRET = SECRET;
const { createApp } = require('../server');
const { signToken, verifyToken, TOKEN_TTL_SECONDS } = require('../auth');

const userId = '11111111-1111-4111-8111-111111111111';
const env = { AUTH_SECRET: SECRET };

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

const post = (url, body) => fetch(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

test('tokens round-trip and carry the user id', () => {
  assert.equal(verifyToken(signToken(userId, { env }), { env }), userId);
});

test('tampered, foreign, malformed and expired tokens are rejected', () => {
  const token = signToken(userId, { env });
  const [header, , signature] = token.split('.');
  const forgedPayload = Buffer.from(JSON.stringify({ sub: 'attacker', iat: 0, exp: 9e9 })).toString('base64url');
  assert.equal(verifyToken(`${header}.${forgedPayload}.${signature}`, { env }), null, 'payload swapped');
  assert.equal(verifyToken(token, { env: { AUTH_SECRET: 'another-secret-'.padEnd(48, 'y') } }), null, 'other secret');
  assert.equal(verifyToken('a.b', { env }), null);
  assert.equal(verifyToken(null, { env }), null);
  const now = Date.now();
  const old = signToken(userId, { env, now: now - (TOKEN_TTL_SECONDS + 1) * 1000 });
  assert.equal(verifyToken(old, { env, now }), null, 'expired');
});

test('without AUTH_SECRET a secret is generated once and persisted across restarts', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bragam-auth-')), '.auth-secret');
  const generatedEnv = { AUTH_SECRET_FILE: file };
  const token = signToken(userId, { env: generatedEnv });
  assert.equal(verifyToken(token, { env: generatedEnv }), userId);
  const saved = fs.readFileSync(file, 'utf8').trim();
  assert.ok(saved.length >= 32, 'secret written to disk');
  assert.equal(verifyToken(token, { env: { AUTH_SECRET: saved } }), userId, 'same secret is reused after a restart');
  assert.equal(verifyToken(token, { env }), null, 'tokens from another secret are still rejected');
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
});

test('an explicitly set but short AUTH_SECRET fails closed', () => {
  assert.throws(() => signToken(userId, { env: { AUTH_SECRET: 'short' } }), /AUTH_SECRET/);
  assert.throws(() => verifyToken('a.b.c', { env: { AUTH_SECRET: 'short' } }), /AUTH_SECRET/);
});

test('login returns a session token for valid credentials only', async () => {
  const passwordHash = await bcrypt.hash('password123', 4);
  await withServer({
    query: async () => ({ rows: [{ id: userId, email: 'a@b.co', name: 'A', password_hash: passwordHash }] }),
  }, async (baseUrl) => {
    const ok = await post(`${baseUrl}/api/auth/login`, { email: 'A@b.co ', password: 'password123' });
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(body.user.id, userId);
    assert.equal(body.user.password_hash, undefined);
    assert.equal(verifyToken(body.token), userId);

    const wrong = await post(`${baseUrl}/api/auth/login`, { email: 'a@b.co', password: 'nope-nope' });
    assert.equal(wrong.status, 401);
    assert.equal((await wrong.json()).token, undefined);
  });
});

test('register creates the account and starts a session', async () => {
  await withServer({
    query: async (sql, values) => ({ rows: [{ id: values[0], email: values[1], name: values[2] }] }),
  }, async (baseUrl) => {
    const response = await post(`${baseUrl}/api/auth/register`, { name: 'Baru', email: 'baru@b.co', password: 'password123' });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.user.email, 'baru@b.co');
    assert.equal(verifyToken(body.token), body.user.id);

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
