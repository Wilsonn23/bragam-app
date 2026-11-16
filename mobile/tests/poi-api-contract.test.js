const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toPoiResponse } = require('../../backend/poiResponse');

test('backend carries a verified address through to the POI detail fields', () => {
  const { getPoiDetailFields } = require('../src/poi/presentation');
  const poi = toPoiResponse({ id: 'P01', name: 'Maison Bogerijen', category: 'Kuliner',
    latitude: -6.91775, longitude: 107.60912, radius_meters: 10,
    description: 'Destinasi', address: 'Jl. Braga No. 58' });
  assert.equal(getPoiDetailFields(poi).address, 'Jl. Braga No. 58');
  assert.equal(toPoiResponse({}).address, undefined);
});
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
