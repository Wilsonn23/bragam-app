const { test } = require('node:test');
const assert = require('node:assert/strict');
const { findPoi } = require('../src/poi/detail');
const { adaptPois } = require('../src/poi/adapter');
const { testPois } = require('../src/dev/fixtures');
const snapshot = require('../src/poi/pb03.snapshot.json');

test('detail resolves the same adapted records by ID and handles missing IDs', () => {
  const records = adaptPois(testPois);
  for (const record of records) assert.equal(findPoi(record.id, records), record);
  assert.equal(findPoi('missing', records), null);
  assert.equal(findPoi(undefined, records), null);
  assert.equal(findPoi(testPois[0].id), null); // Production PB03 has not been supplied.
});

test('optional detail fields survive PB03 adaptation', () => {
  const record = { ...testPois[0], description: 'Uji', menu: 'Uji', openingHours: 'Uji', reviews: 'Uji', audioUrl: 'https://example.invalid/audio.mp3' };
  assert.deepEqual(findPoi(record.id, adaptPois([record])), { ...record, imageUrl: undefined });
});

test('API audioGuideUrl is mapped for the guide player', () => {
  const record = { ...testPois[0], audioGuideUrl: 'https://example.invalid/guide.mp3' };
  assert.equal(findPoi(record.id, adaptPois([record])).audioUrl, record.audioGuideUrl);
});

test('PB03 offline snapshot resolves all 12 records and preserves their audio references', () => {
  const records = adaptPois(snapshot);
  assert.equal(records.length, 12);
  for (const record of records) {
    assert.equal(findPoi(record.id, records), record);
    assert.equal(record.audioUrl || null, snapshot.find(item => item.id === record.id).audioGuideUrl || null);
  }
});
