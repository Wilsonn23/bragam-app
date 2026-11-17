// Explicit local development fixture. No database writes or error fallback.
function localTestPoi(env = process.env) {
  if (env.NODE_ENV === 'production' || env.LOCAL_TEST_POI_ENABLED !== 'true') return null;
  if (!env.LOCAL_TEST_POI_LATITUDE?.trim() || !env.LOCAL_TEST_POI_LONGITUDE?.trim()) return null;
  const latitude = Number(env.LOCAL_TEST_POI_LATITUDE);
  const longitude = Number(env.LOCAL_TEST_POI_LONGITUDE);
  if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) || Math.abs(longitude) > 180) return null;
  return {
    id: 'TEST-LOCAL', name: 'POI Uji Coba Lokal', category: 'Uji Coba',
    latitude, longitude, radius_meters: 15, cooldown_seconds: 60,
    description: 'POI sementara untuk menguji peta, detail, dan notifikasi GPS lokal.',
    notification_title: 'Kamu dekat POI uji coba!',
    notification_body: 'Lokasi uji coba GPS lokal berhasil terdeteksi.',
    rating: 0, reviews_count: 0,
  };
}

async function loadLocalTestPoi(db, env = process.env) {
  const configured = localTestPoi(env);
  if (!configured) return null;
  const sourceId = env.LOCAL_TEST_POI_SOURCE_ID?.trim();
  if (!sourceId) return configured;
  if (sourceId === configured.id) throw Object.assign(new Error('Invalid local POI source'), { code: 'LOCAL_POI_SOURCE_INVALID' });
  const { rows } = await db.query('SELECT * FROM public.pois WHERE id = $1 LIMIT 1', [sourceId]);
  if (rows.length !== 1) throw Object.assign(new Error('Local POI source not found'), { code: 'LOCAL_POI_SOURCE_MISSING' });
  const source = rows[0];
  return { ...source, id: configured.id, name: `${source.name} (Uji Lokal)`,
    latitude: configured.latitude, longitude: configured.longitude, location: undefined,
    source_poi_id: source.id, is_local_test: true };
}

function appendLocalTestPoi(rows, poi = localTestPoi()) {
  return poi && !rows.some(row => row.id === poi.id) ? [...rows, poi] : rows;
}

function distanceMeters(a, b) {
  const rad = degrees => degrees * Math.PI / 180;
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) *
    Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

module.exports = { localTestPoi, loadLocalTestPoi, appendLocalTestPoi, distanceMeters };
