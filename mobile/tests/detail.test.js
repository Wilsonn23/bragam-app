const { test } = require('node:test');
const assert = require('node:assert/strict');
const { findPoi, detailContent } = require('../src/poi/detail');
const { adaptPois } = require('../src/poi/adapter');
const { testPois } = require('./fixtures/pois');

test('detail resolves the same adapted records by ID and handles missing IDs', () => {
  const records = adaptPois(testPois);
  for (const record of records) assert.equal(findPoi(record.id, records), record);
  assert.equal(findPoi('missing', records), null);
  assert.equal(findPoi(undefined, records), null);
  assert.equal(findPoi(testPois[0].id), null); // A route must use the shared provider's records.
});

test('latest detail tabs show the selected POI content without Citywalk placeholders', () => {
  const records = adaptPois([
    { ...testPois[0], id: 'P01', name: 'Tempat A', description: 'Cerita A', address: 'Alamat A', openingHours: '09.00–17.00', menu: 'Menu A', reviews: 'Ulasan A', website: 'https://example.invalid/a', audioUrl: 'https://example.invalid/a.mp3' },
    { ...testPois[0], id: 'P07', name: 'Tempat B', description: 'Cerita B', audioUrl: 'http://example.invalid/b.mp3' },
  ]);
  assert.deepEqual(detailContent(findPoi('P01', records)), {
    description: 'Cerita A', address: 'Alamat A', openingHours: '09.00–17.00', menu: 'Menu A',
    reviews: 'Ulasan A', website: 'https://example.invalid/a', audioUrl: 'https://example.invalid/a.mp3',
  });
  const second = detailContent(findPoi('P07', records));
  assert.equal(second.description, 'Cerita B');
  assert.equal(second.address, 'Alamat belum tersedia.');
  assert.equal(second.audioUrl, null);
  assert.equal(second.reviews, 'Rating dan ulasan belum tersedia.');
});

test('optional detail fields survive PB03 adaptation', () => {
  const record = { ...testPois[0], description: 'Uji', menu: 'Uji', openingHours: 'Uji', reviews: 'Uji', audioUrl: 'https://example.invalid/audio.mp3' };
  assert.deepEqual(findPoi(record.id, adaptPois([record])), { ...record, imageUrl: undefined, cooldownSeconds: 60, notificationTitle: '', notificationBody: '' });
});
