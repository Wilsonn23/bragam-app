const { adaptPois } = require('./adapter');
const { API_BASE_URL } = require('../config/api');
const session = require('../services/session');

/** Login/register responses carry `{ user, token }`: keep the token in the session, return the user. */
function startSession(data, fallbackMessage) {
  if (!data?.user || typeof data.token !== 'string' || !data.token) throw new Error(fallbackMessage);
  session.setToken(data.token);
  return data.user;
}

/** @param {{signal?: AbortSignal, fetchImpl?: typeof fetch, baseUrl?: string}} [options] */
async function fetchPois({ signal, fetchImpl = fetch, baseUrl = API_BASE_URL } = {}) {
  const controller = new AbortController();
  const requestSignal = signal || controller.signal;
  const timeout = signal ? null : setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/api/pois`, { signal: requestSignal });
    if (!response.ok) throw new Error(`Gagal mengambil POI (${response.status}).`);
    const records = await response.json();
    if (!Array.isArray(records)) throw new Error('Respons POI tidak valid.');
    const pois = adaptPois(records);
    if (records.length > 0 && pois.length === 0) throw new Error('Data POI tidak valid.');
    return pois;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function fetchPoiImages(id) {
  const response = await fetch(`${API_BASE_URL}/api/pois/${encodeURIComponent(id)}/images`);
  if (!response.ok) throw new Error(`Gagal mengambil gambar POI (${response.status}).`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/** Menu items of one POI; [] when the POI has no menu data. */
async function fetchPoiMenu(poiId, { fetchImpl = fetch, baseUrl = API_BASE_URL } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/api/pois/${encodeURIComponent(poiId)}/menu`,
      { signal: controller.signal });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error || `Gagal mengambil menu (${response.status}).`);
    if (!Array.isArray(data)) throw new Error('Respons menu tidak valid.');
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

async function loginUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Login gagal (${response.status}).`);
  return startSession(data, 'Response login tidak valid. Pastikan backend sudah diperbarui.');
}

async function registerUser(name, email, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Registrasi gagal (${response.status}).`);
  return startSession(data, 'Response registrasi tidak valid. Pastikan backend sudah diperbarui.');
}

async function fetchPoiRatings(poiId) {
  const response = await fetch(`${API_BASE_URL}/api/pois/${encodeURIComponent(poiId)}/ratings`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Gagal mengambil rating POI.');
  return data;
}

async function submitPoiRating(poiId, userId, rating, review) {
  const response = await session.authFetch(`${API_BASE_URL}/api/pois/${encodeURIComponent(poiId)}/ratings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, rating, review }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Gagal menyimpan rating.');
  return data;
}

async function updatePoiRating(ratingId, rating, review) {
  const body = {};
  if (rating !== undefined) body.rating = rating;
  if (review !== undefined) body.review = review;
  const response = await session.authFetch(`${API_BASE_URL}/api/ratings/${encodeURIComponent(ratingId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Gagal memperbarui rating.');
  return data;
}

async function deletePoiRating(ratingId) {
  const response = await session.authFetch(`${API_BASE_URL}/api/ratings/${encodeURIComponent(ratingId)}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Gagal menghapus rating.');
  }
}

async function fetchUserRatings(userId) {
  const response = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(userId)}/ratings`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Gagal mengambil rating user.');
  return data;
}

module.exports = {
  fetchPois,
  fetchPoiImages,
  fetchPoiMenu,
  loginUser,
  registerUser,
  fetchPoiRatings,
  submitPoiRating,
  updatePoiRating,
  deletePoiRating,
  fetchUserRatings,
};
