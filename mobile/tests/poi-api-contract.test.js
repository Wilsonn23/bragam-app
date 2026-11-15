const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toPoiResponse } = require('../../backend/poiResponse');
const { adaptPois } = require('../src/poi/adapter');

test('database record supplies matching POI detail and audio fields to mobile', () => {
  const response = toPoiResponse({ id: 'P01', name: 'Uji', category: 'Uji',
    latitude: -6.9, longitude: 107.6, radius_meters: 10, description: 'Deskripsi uji',
    history: 'Sejarah uji', opening_hours: '09:00–17:00', menu_highlights: 'Menu uji',
    price_min: 10000, price_max: 20000, rating: '4.5', reviews_count: 4,
    audio_guide_url: 'https://example.invalid/audio.mp3' });
  const [poi] = adaptPois([response]);
  assert.equal(poi.id, 'P01');
  assert.equal(poi.history, 'Sejarah uji');
  assert.equal(poi.openingHours, '09:00–17:00');
  assert.equal(poi.menuHighlights, 'Menu uji');
  assert.equal(poi.rating, 4.5);
  assert.equal(poi.audioUrl, response.audioGuideUrl);
});

test('missing optional database values are not turned into zero or NaN', () => {
  const response = toPoiResponse({ latitude: 0, longitude: 0, radius_meters: 10,
    rating: null, price_min: null, price_max: undefined, reviews_count: null });
  assert.equal(response.rating, undefined);
  assert.equal(response.priceMin, undefined);
  assert.equal(response.priceMax, undefined);
  assert.equal(response.reviewsCount, undefined);
});
