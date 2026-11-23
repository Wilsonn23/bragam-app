const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeRatingSummary, breakdownRows, findUserRating, filterRatings,
  formatRelativeTime, initialsOf, starIcons, applyRatingOverrides,
} = require('../src/poi/ratings');

const USER = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const OTHER = '9b2c1d7e-1a2b-4c3d-8e9f-0a1b2c3d4e5f';
const ratings = [
  { id: 1, poiId: 'P01', userId: USER, rating: 5, review: 'Mantap', userName: 'Derick', createdAt: '', updatedAt: '' },
  { id: 2, poiId: 'P01', userId: OTHER, rating: 4, review: '  ', userName: null, createdAt: '', updatedAt: '' },
  { id: 3, poiId: 'P01', userId: 'x', rating: 4, review: 'Nyaman', userName: 'Ana', createdAt: '', updatedAt: '' },
];

test('normalizes an API summary and drops invalid rating rows', () => {
  const summary = normalizeRatingSummary({
    averageRating: '4.3', reviewCount: '3', breakdown: { 5: '1', 4: 2 },
    ratings: [...ratings, { id: 9, rating: 7 }, null],
  });
  assert.equal(summary.averageRating, 4.3);
  assert.equal(summary.reviewCount, 3);
  assert.deepEqual(summary.breakdown, { 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 });
  assert.equal(summary.ratings.length, 3);
});

test('normalizes a missing or malformed summary to an empty one', () => {
  const summary = normalizeRatingSummary(undefined);
  assert.equal(summary.averageRating, 0);
  assert.equal(summary.reviewCount, 0);
  assert.deepEqual(summary.ratings, []);
});

test('breakdown rows run 5 to 1 with shares of the total', () => {
  const rows = breakdownRows(normalizeRatingSummary({ breakdown: { 5: 3, 1: 1 } }));
  assert.deepEqual(rows.map(row => row.star), [5, 4, 3, 2, 1]);
  assert.equal(rows[0].share, 0.75);
  assert.equal(rows[4].share, 0.25);
  assert.equal(breakdownRows(normalizeRatingSummary({})).every(row => row.share === 0), true);
});

test('finds the current user rating and excludes it from the visitor list', () => {
  assert.equal(findUserRating(ratings, USER).id, 1);
  assert.equal(findUserRating(ratings, null), null);
  assert.deepEqual(filterRatings(ratings, 'all', USER).map(r => r.id), [2, 3]);
  assert.deepEqual(filterRatings(ratings, 'text', USER).map(r => r.id), [3]);
  assert.deepEqual(filterRatings(ratings, 4).map(r => r.id), [2, 3]);
  assert.deepEqual(filterRatings(ratings, 5, USER), []);
});

test('formats relative times in Indonesian', () => {
  const now = new Date('2026-11-23T12:00:00Z');
  const ago = ms => new Date(now.getTime() - ms).toISOString();
  assert.equal(formatRelativeTime(ago(10_000), now), 'Baru saja');
  assert.equal(formatRelativeTime(ago(5 * 60_000), now), '5 menit lalu');
  assert.equal(formatRelativeTime(ago(3 * 3_600_000), now), '3 jam lalu');
  assert.equal(formatRelativeTime(ago(26 * 3_600_000), now), 'Kemarin');
  assert.equal(formatRelativeTime(ago(4 * 86_400_000), now), '4 hari lalu');
  assert.equal(formatRelativeTime(ago(15 * 86_400_000), now), '2 minggu lalu');
  assert.match(formatRelativeTime('2026-01-05T10:00:00Z', now), /^5 Jan 2026$/);
  assert.equal(formatRelativeTime('not a date', now), '');
  assert.equal(formatRelativeTime(null, now), '');
});

test('builds avatar initials', () => {
  assert.equal(initialsOf('Derick Amadeus'), 'DA');
  assert.equal(initialsOf('ana'), 'AN');
  assert.equal(initialsOf('  '), '?');
  assert.equal(initialsOf(null), '?');
});

test('star icons are always five, with half stars and clamping', () => {
  assert.deepEqual(starIcons(3.5), ['star', 'star', 'star', 'star-half', 'star-outline']);
  assert.deepEqual(starIcons(0), Array(5).fill('star-outline'));
  assert.deepEqual(starIcons(9), Array(5).fill('star'));
  assert.deepEqual(starIcons(NaN), Array(5).fill('star-outline'));
});

test('rating overrides keep array identity when unused and patch only matching POIs', () => {
  const pois = [{ id: 'P01', rating: 4.1, reviewsCount: 10 }, { id: 'P02', rating: 3, reviewsCount: 2 }];
  assert.equal(applyRatingOverrides(pois, {}), pois);
  const next = applyRatingOverrides(pois, { P02: { rating: 4.5, reviewsCount: 3 } });
  assert.equal(next[0], pois[0]);
  assert.deepEqual(next[1], { id: 'P02', rating: 4.5, reviewsCount: 3 });
});
