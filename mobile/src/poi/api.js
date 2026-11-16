import { adaptPois } from './adapter';
import { API_BASE_URL } from '../config/api';

export async function fetchPois() {
  const response = await fetch(`${API_BASE_URL}/api/pois`);
  if (!response.ok) throw new Error(`Gagal mengambil POI (${response.status}).`);
  return adaptPois(await response.json());
}

export async function fetchPoi(id) {
  const response = await fetch(`${API_BASE_URL}/api/pois/${encodeURIComponent(id)}`);
  if (!response.ok) throw new Error(`Gagal mengambil detail POI (${response.status}).`);
  const [poi] = adaptPois([await response.json()]);
  if (!poi) throw new Error('Data detail POI tidak valid.');
  return poi;
}

export async function fetchPoiImages(id) {
  const response = await fetch(`${API_BASE_URL}/api/pois/${encodeURIComponent(id)}/images`);
  if (!response.ok) throw new Error(`Gagal mengambil gambar POI (${response.status}).`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function loginUser(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Login gagal (${response.status}).`);
  }
  if (!data.user) throw new Error('Response login tidak valid.');
  return data.user;
}

export async function registerUser(name, email, password) {
  const response = await fetch(`${API_BASE_URL}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Registrasi gagal (${response.status}).`);
  }
  return data;
}
