const { adaptPois } = require('./adapter');
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000';
/** @param {{signal?:AbortSignal, fetchImpl?:typeof fetch, baseUrl?:string}} [options] */
async function fetchPois({ signal, fetchImpl = fetch, baseUrl = API_BASE_URL } = {}) {
  const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/api/pois`, { signal });
  if (!response.ok) throw new Error(`Gagal mengambil destinasi (${response.status}).`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Format data destinasi tidak valid.');
  const records = adaptPois(rows);
  if (records.length !== rows.length) throw new Error('Data destinasi memuat baris tidak valid atau ID duplikat.');
  return records;
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
