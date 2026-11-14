import { adaptPois } from './adapter';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000';

export async function fetchPois() {
  const response = await fetch(`${API_BASE_URL}/api/pois`);
  if (!response.ok) throw new Error(`Gagal mengambil POI (${response.status}).`);
  return adaptPois(await response.json());
}
