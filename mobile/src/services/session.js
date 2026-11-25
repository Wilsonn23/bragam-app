// In-memory session token for authenticated API calls (set by loginUser/registerUser).
// Cleared on logout, or when the server rejects it (expired/invalid/backend restarted),
// which also notifies the app so it can return to the login screen.

/** @type {string|null} */
let token = null;
/** @type {(() => void)|null} */
let onUnauthorized = null;

/** @param {unknown} value */
function setToken(value) {
  token = typeof value === 'string' && value ? value : null;
}

function getToken() {
  return token;
}

function clearSession() {
  token = null;
}

/** @param {(() => void)|null} handler */
function setUnauthorizedHandler(handler) {
  onUnauthorized = typeof handler === 'function' ? handler : null;
}

/** @param {Record<string, string>} [extra] @returns {Record<string, string>} */
function authHeaders(extra = {}) {
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

/**
 * fetch() with the bearer token attached. A 401 on a signed-in request means the
 * session is no longer valid: the token is dropped and the app is told to log out.
 * @param {string} url @param {RequestInit & {headers?: Record<string, string>}} [options] @param {typeof fetch} [fetchImpl]
 */
async function authFetch(url, options = {}, fetchImpl = fetch) {
  const hadToken = Boolean(token);
  const response = await fetchImpl(url, { ...options, headers: authHeaders(options.headers || {}) });
  if (response.status === 401 && hadToken) {
    token = null;
    onUnauthorized?.();
  }
  return response;
}

module.exports = { setToken, getToken, clearSession, setUnauthorizedHandler, authHeaders, authFetch };
