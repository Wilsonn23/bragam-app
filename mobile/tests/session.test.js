const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { setToken, getToken, clearSession, setUnauthorizedHandler, authHeaders, authFetch } = require('../src/services/session');

const respond = status => async (url, options) => ({ status, ok: status < 400, url, options });

beforeEach(() => {
  setToken(null);
  setUnauthorizedHandler(null);
});

test('auth headers include the bearer token only while signed in', () => {
  assert.deepEqual(authHeaders({ 'Content-Type': 'application/json' }), { 'Content-Type': 'application/json' });
  setToken('abc.def.ghi');
  assert.deepEqual(authHeaders({ 'Content-Type': 'application/json' }),
    { 'Content-Type': 'application/json', Authorization: 'Bearer abc.def.ghi' });
  setToken('');
  assert.equal(getToken(), null);
});

test('authFetch sends the token and keeps caller options', async () => {
  setToken('tok');
  const response = await authFetch('https://api/x', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{}' }, respond(200));
  assert.equal(response.options.method, 'PUT');
  assert.equal(response.options.body, '{}');
  assert.equal(response.options.headers.Authorization, 'Bearer tok');
  assert.equal(response.options.headers['Content-Type'], 'application/json');
});

test('a 401 on a signed-in request clears the session and notifies the app once', async () => {
  let calls = 0;
  setUnauthorizedHandler(() => { calls += 1; });
  setToken('expired');
  await authFetch('https://api/x', {}, respond(401));
  assert.equal(getToken(), null);
  assert.equal(calls, 1);
  await authFetch('https://api/x', {}, respond(401));
  assert.equal(calls, 1, 'no repeated logout once already signed out');
});

test('403 and other errors do not end the session', async () => {
  let calls = 0;
  setUnauthorizedHandler(() => { calls += 1; });
  setToken('tok');
  await authFetch('https://api/x', {}, respond(403));
  await authFetch('https://api/x', {}, respond(500));
  assert.equal(getToken(), 'tok');
  assert.equal(calls, 0);
});

test('clearSession (manual logout) drops the token without the session-expired notice', () => {
  let calls = 0;
  setUnauthorizedHandler(() => { calls += 1; });
  setToken('tok');
  clearSession();
  assert.equal(getToken(), null);
  assert.deepEqual(authHeaders(), {});
  assert.equal(calls, 0);
});
