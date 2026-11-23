import { Platform } from 'react-native';
import { authFetch } from './session';

const RAW_API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL ||
  (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000');

const API_BASE_URL = RAW_API_URL.replace(/\/+$/, '');

async function apiRequest(path, options = {}) {
  // Per-user data: always send the session token so the server can verify ownership.
  const response = await authFetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

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