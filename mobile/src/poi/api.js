const { adaptPois } = require('./adapter');

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000').replace(/\/+$/, '');

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

async function loginUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Login gagal (${response.status}).`);
  if (!data.user) throw new Error('Response login tidak valid.');
  return data.user;
}

async function registerUser(name, email, password) {
  const response = await fetch(`${API_BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Registrasi gagal (${response.status}).`);
  return data;
}

module.exports = { fetchPois, fetchPoiImages, loginUser, registerUser };
