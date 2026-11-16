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
