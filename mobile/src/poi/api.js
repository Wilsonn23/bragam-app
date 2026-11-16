import { adaptPois } from './adapter';
import { API_BASE_URL } from '../config/api';

export async function fetchPois() {
  const response = await fetch(`${API_BASE_URL}/api/pois`);
  if (!response.ok) throw new Error(`Gagal mengambil POI (${response.status}).`);
  return adaptPois(await response.json());
}
