import { adaptPois } from './adapter';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000').replace(/\/+$/, '');

export async function fetchPois() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${API_BASE_URL}/api/pois`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Gagal mengambil POI (${response.status}).`);
    const records = await response.json();
    if (!Array.isArray(records)) throw new Error('Respons POI tidak valid.');
    const pois = adaptPois(records);
    if (records.length > 0 && pois.length === 0) throw new Error('Data POI tidak valid.');
    return pois;
  } finally {
    clearTimeout(timeout);
  }
}
