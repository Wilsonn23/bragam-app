import { API_BASE_URL } from '../config/api';
import { normalizePreferences } from '../recommendation/preferences';

/** @param {string} userId */
export async function fetchUserPreferences(userId) {
  const response = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(userId)}/preferences`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Gagal memuat preferensi (${response.status}).`);
  return normalizePreferences(data.preferences);
}

/** @param {string} userId @param {import('../recommendation/preferences').Preferences} preferences */
export async function saveUserPreferences(userId, preferences) {
  const response = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(userId)}/preferences`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalizePreferences(preferences)),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Gagal menyimpan preferensi (${response.status}).`);
  return normalizePreferences(data.preferences);
}
