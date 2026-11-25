const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getPoiDetailFields, getRatingStars, getPoiGalleryImages, getOperatingStatus } = require('../src/poi/presentation');
const records = require('../src/poi/pb03.snapshot.json');

test('all PB03 records present their own descriptive fields without defaults from another POI', () => {
  for (const poi of records) {
    const fields = getPoiDetailFields(poi);
    assert.equal(fields.description, poi.description.trim());
    assert.equal(fields.history, poi.history.trim());
    assert.equal(fields.openingHours, poi.openingHours.trim());
    assert.equal(fields.menu, poi.menuHighlights.trim());
    // The offline snapshot carries no seeded ratings; real ones come only from poi_ratings via the API.
    assert.equal(fields.hasRating, false);
    assert.equal(fields.ratingSummary, 'Rating belum tersedia');
  }
});

test('missing optional attributes display fallbacks instead of fabricated values', () => {
  const fields = getPoiDetailFields({});
  assert.equal(fields.description, 'Deskripsi belum tersedia.');
  assert.equal(fields.address, 'Alamat belum tersedia.');
  assert.equal(fields.openingHours, 'Jam operasional belum tersedia.');
  assert.equal(fields.prices, 'Harga belum tersedia.');
  assert.equal(fields.reviews, 'Ulasan tertulis belum tersedia.');
  assert.equal(fields.hasRating, false);
});

test('formats actual price range, rating count and distance', () => {
  const fields = getPoiDetailFields({ priceMin: 10000, priceMax: 20000, rating: 4.5, reviewsCount: 7, distanceMeters: 42.4 });
  assert.equal(fields.prices, 'Kisaran harga: Rp10.000 – Rp20.000');
  assert.equal(fields.ratingSummary, '4.5 / 5 (7 ulasan)');
  assert.equal(fields.distance, '42 m');
});

test('rating stars match the value, including half-star values', () => {
  assert.deepEqual(getRatingStars(4), ['star', 'star', 'star', 'star']);
  assert.deepEqual(getRatingStars(4.5), ['star', 'star', 'star', 'star', 'star-half']);
  assert.deepEqual(getRatingStars(5), ['star', 'star', 'star', 'star', 'star']);
  assert.deepEqual(getRatingStars(null), []);
  assert.deepEqual(getRatingStars(6), []);
});

test('gallery uses only supplied, valid, unique images', () => {
  assert.deepEqual(getPoiGalleryImages({}), []);
  assert.deepEqual(getPoiGalleryImages({ imageUrl: 'https://example.invalid/a.jpg', imageUrls: [
    'https://example.invalid/a.jpg', 'https://example.invalid/b.jpg', '', null, 'file:///private',
  ] }), ['https://example.invalid/a.jpg', 'https://example.invalid/b.jpg']);
});

test('opening status follows WIB and treats opening as inclusive and closing as exclusive', () => {
  assert.equal(getOperatingStatus('09:00 - 22:00', new Date('2026-11-15T01:59:00Z')), 'Closed');
  assert.equal(getOperatingStatus('09:00 - 22:00', new Date('2026-11-15T02:00:00Z')), 'Open');
  assert.equal(getOperatingStatus('09:00 - 22:00', new Date('2026-11-15T14:59:00Z')), 'Open');
  assert.equal(getOperatingStatus('09:00 - 22:00', new Date('2026-11-15T15:00:00Z')), 'Closed');
});

test('opening status supports ranges past midnight and declines ambiguous hours', () => {
  assert.equal(getOperatingStatus('17:00 - 02:00', new Date('2026-11-15T17:00:00Z')), 'Open');
  assert.equal(getOperatingStatus('17:00 - 02:00', new Date('2026-11-15T19:00:00Z')), 'Closed');
  assert.equal(getOperatingStatus('18:00 - 00:00', new Date('2026-11-15T16:59:00Z')), 'Open');
  assert.equal(getOperatingStatus('18:00 - 00:00', new Date('2026-11-15T17:00:00Z')), 'Closed');
  for (const value of ['', null, '09:00 - 09:00', '27:00 - 08:00', 'Senin 09:00 - 17:00']) {
    assert.equal(getOperatingStatus(value), null);
  }
});
