const { test } = require('node:test');
const assert = require('node:assert/strict');
const { poiLoadSuccess, poiLoadFailure } = require('../src/poi/source');

test('a successful API response is authoritative, including an empty result', () => {
  const records = [{ id: 'api-poi' }];
  assert.deepEqual(poiLoadSuccess(records), { pois: records, loading: false, error: null, source: 'api' });
  assert.deepEqual(poiLoadSuccess([]), { pois: [], loading: false, error: null, source: 'api' });
});

test('snapshot is explicitly marked offline only after failure', () => {
  const snapshot = [{ id: 'offline-poi' }];
  assert.deepEqual(poiLoadFailure(snapshot), { pois: snapshot, loading: false, error: null, source: 'offline' });
  const empty = poiLoadFailure([]);
  assert.equal(empty.source, 'offline');
  assert.ok(empty.error);
});
