const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('../server');
const { adaptPois } = require('../../mobile/src/poi/adapter');
const { GeofenceController } = require('../../mobile/src/location/geofence');
const { bundledAudioFor } = require('../../mobile/src/audio/guideController');

test('shared Citywalk remains one database POI in production and with old local flags enabled', async t => {
  const keys = ['NODE_ENV', 'LOCAL_TEST_POI_ENABLED', 'LOCAL_TEST_POI_SOURCE_ID',
    'LOCAL_TEST_POI_LATITUDE', 'LOCAL_TEST_POI_LONGITUDE'];
  const saved = keys.map(key => process.env[key]);
  t.after(() => keys.forEach((key, i) => {
    if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i];
  }));
  Object.assign(process.env, { LOCAL_TEST_POI_ENABLED: 'true', LOCAL_TEST_POI_SOURCE_ID: 'P11',
    // Stale local coordinates must not replace the persisted test POI.
    LOCAL_TEST_POI_LATITUDE: '-6.9', LOCAL_TEST_POI_LONGITUDE: '107.6' });
  const original = { id: 'P11', name: 'Braga CityWalk', category: 'Hiburan',
    latitude: -6.9162, longitude: 107.6088, radius_meters: 15, cooldown_seconds: 60,
    description: 'Deskripsi Citywalk', history: 'Sejarah Citywalk', rating: 4.4,
    reviews_count: 5800, address: 'Alamat Citywalk', opening_hours: '10:00 - 22:00' };
  const shared = { ...original, id: 'TEST-LOCAL', name: 'Braga CityWalk (Uji GPS)',
    latitude: -6.890389, longitude: 107.609583 };
  const image = { id: 50, poi_id: shared.id, image_url: 'https://example.test/citywalk.jpg',
    alt_text: 'Citywalk', sort_order: 0 };
  const snapshot = JSON.stringify([original, shared]);
  const db = { query: async (sql, values = []) => {
    assert.match(sql.trim(), /^SELECT\b/i);
    if (sql.includes('SELECT id FROM public.pois')) {
      assert.deepEqual(values, [shared.id]);
      return { rows: [{ id: shared.id }] };
    }
    if (sql.includes('FROM public.pois')) throw new Error('Persisted POI must bypass local source cloning');
    if (sql.includes('FROM poi_images')) {
      const ids = Array.isArray(values[0]) ? values[0] : [values[0]];
      return { rows: ids.includes(shared.id) ? [image] : [] };
    }
    if (sql.includes('ST_DWithin')) return { rows: [{ ...shared, distance_meters: 0 }] };
    if (sql.includes('WHERE id = $1')) return { rows: [shared] };
    return { rows: [original, shared] };
  } };
  const manifest = fs.readFileSync(path.join(__dirname, '../../mobile/src/audio/guideAssets.js'), 'utf8')
    .replace('export const POI_AUDIO_ASSETS', 'const POI_AUDIO_ASSETS') + '; POI_AUDIO_ASSETS;';
  for (const mode of ['production', 'development']) {
    process.env.NODE_ENV = mode;
    const server = createApp(db).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    try {
      const get = async endpoint => {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api${endpoint}`);
        assert.equal(response.status, 200);
        return response.json();
      };
      const records = await get('/pois');
      assert.equal(records.filter(p => p.id === shared.id).length, 1);
      const detail = await get(`/pois/${shared.id}`);
      assert.equal(detail.name, shared.name);
      assert.equal(detail.latitude, shared.latitude);
      assert.equal(detail.longitude, shared.longitude);
      assert.equal(detail.isLocalTest, undefined);
      assert.equal(detail.description, original.description);
      assert.equal(detail.history, original.history);
      assert.equal(detail.rating, original.rating);
      assert.equal(detail.images[0].imageUrl, image.image_url);
      assert.equal((await get(`/pois/${shared.id}/images`))[0].poiId, shared.id);
      assert.equal((await get('/pois/nearby?latitude=-6.890389&longitude=107.609583')).id, shared.id);
      assert.equal((await get('/pois/search?q=CityWalk')).data.filter(p => p.id === shared.id).length, 1);
      const controller = new GeofenceController(adaptPois(records));
      const sample = { latitude: shared.latitude, longitude: shared.longitude, accuracy: 5, timestamp: 1000 };
      assert.deepEqual(controller.update(sample, 1000).map(e => e.poiId), [shared.id]);
      const assetIds = new Map();
      const assets = vm.runInNewContext(manifest, { __DEV__: mode !== 'production', require: value => {
        if (!assetIds.has(value)) assetIds.set(value, assetIds.size + 1);
        return assetIds.get(value);
      } });
      assert.equal(bundledAudioFor(detail, assets), assets.P11.source);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  }
  assert.equal(JSON.stringify([original, shared]), snapshot);
});
