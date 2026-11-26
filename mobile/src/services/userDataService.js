import { API_BASE_URL } from '../config/api';
import { getToken, clearSession } from './session';

export function logoutUser() {
  const token = getToken();
  clearSession();
  if (token) fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (_) {
    throw new Error('Tidak dapat menghubungi backend. Periksa koneksi dan alamat API.');
  } finally { clearTimeout(timer); }

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody?.error) errMsg = errBody.error;
    } catch (_) {}
    throw new Error(errMsg);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// ==========================================
// 1. BOOKMARKS
// ==========================================
export async function fetchUserBookmarks(userId, allPois = []) {
  if (!userId) return [];

  const rows = await apiRequest(`/api/users/${userId}/bookmarks`);

  return (rows || [])
    .map((row) => allPois.find((p) => String(p.id) === String(row.poi_id)))
    .filter(Boolean);
}

export async function toggleUserBookmark(userId, poiId, currentlyBookmarked) {
  if (!userId || !poiId) return;

  if (currentlyBookmarked) {
    await apiRequest(
      `/api/users/${userId}/bookmarks/${encodeURIComponent(String(poiId))}`,
      { method: 'DELETE' }
    );
  } else {
    await apiRequest(`/api/users/${userId}/bookmarks`, {
      method: 'POST',
      body: JSON.stringify({ poiId: String(poiId) }),
    });
  }
}

// ==========================================
// 2. TRIPS & TRIP STOPS
// ==========================================
export async function fetchUserTrips(userId, allPois = []) {
  if (!userId) return [];

  const tripsData = await apiRequest(`/api/users/${userId}/trips`);

  return (tripsData || []).map((trip) => {
    const sortedStops = [...(trip.stops || [])].sort(
      (a, b) => (a.stop_order ?? 0) - (b.stop_order ?? 0)
    );

    const mappedStops = sortedStops.map((s) => {
      const poiMeta = allPois.find((p) => String(p.id) === String(s.poi_id));
      return {
        ...(poiMeta || {}),
        id: String(s.poi_id),
        name: poiMeta?.name || `POI #${s.poi_id}`,
        time: s.visit_time || '09.00',
      };
    });

    return {
      id: trip.id,
      title: trip.title,
      stops: mappedStops,
    };
  });
}

export async function saveUserTripPlan(userId, plan) {
  if (!userId || !plan) return null;

  const saved = await apiRequest(`/api/users/${userId}/trips`, {
    method: 'POST',
    body: JSON.stringify({
      id: plan.id,
      title: plan.title,
      stops: plan.stops || [],
    }),
  });

  return {
    ...plan,
    id: saved?.id || plan.id,
  };
}

export async function appendStopToExistingTrip(userId, tripId, newStop, currentStopCount) {
  if (!userId || !tripId || !newStop?.id) return;

  await apiRequest(`/api/users/${userId}/trips/${tripId}/stops`, {
    method: 'POST',
    body: JSON.stringify({
      poiId: String(newStop.id),
      time: newStop.time || '09.00',
      stopOrder: currentStopCount,
    }),
  });
}

export async function deleteUserTripPlan(userId, tripId) {
  if (!userId || !tripId) return;

  await apiRequest(`/api/users/${userId}/trips/${tripId}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 3. VISITED HISTORY
// ==========================================
export async function fetchUserVisits(userId, allPois = []) {
  if (!userId) return [];

  const rows = await apiRequest(`/api/users/${userId}/visits`);

  return (rows || []).map((row) => {
    const poiMeta = allPois.find((p) => String(p.id) === String(row.poi_id));
    return {
      ...(poiMeta || {}),
      poiId: String(row.poi_id),
      poiName: poiMeta?.name || `POI #${row.poi_id}`,
      category: poiMeta?.category || '',
      imageUrl: poiMeta?.images?.[0]?.imageUrl || poiMeta?.imageUrl || null,
      distanceMeters: row.distance_meters ?? null,
      visitedAt: row.visited_at,
    };
  });
}

export async function recordUserVisit(userId, poiId, distanceMeters = null) {
  if (!userId || !poiId) return null;

  return await apiRequest(`/api/users/${userId}/visits`, {
    method: 'POST',
    body: JSON.stringify({
      poiId: String(poiId),
      distanceMeters: Number.isFinite(distanceMeters) ? Math.round(distanceMeters) : null,
    }),
  });
}

// ==========================================
// 4. USER PROFILE & PASSWORD
// ==========================================
export async function updateUserProfile(userId, updates) {
  if (!userId) throw new Error('User belum login.');
  return await apiRequest(`/api/users/${encodeURIComponent(String(userId))}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function changeUserPassword(userId, oldPassword, newPassword) {
  if (!userId) throw new Error('User belum login.');
  return await apiRequest(`/api/users/${encodeURIComponent(String(userId))}`, {
    method: 'PATCH',
    body: JSON.stringify({
      oldPassword,
      password: newPassword,
    }),
  });
}