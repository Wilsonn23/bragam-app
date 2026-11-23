// Pure helpers for the POI rating UI. Kept framework-free so node tests can cover them.

const MAX_REVIEW_LENGTH = 2000;
const STAR_VALUES = [5, 4, 3, 2, 1];
const RATING_LABELS = Object.freeze({
  1: 'Sangat buruk',
  2: 'Kurang',
  3: 'Cukup',
  4: 'Bagus',
  5: 'Luar biasa',
});

/**
 * @typedef {{id:number, poiId:string, userId:string, rating:number, review:string|null,
 *   userName:string|null, createdAt:string, updatedAt:string}} PoiRating
 * @typedef {{averageRating:number, reviewCount:number, breakdown:Record<number, number>,
 *   ratings:PoiRating[]}} RatingSummary
 */

const count = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
};

/** Coerce an API response into a summary the UI can always render.
 * @param {any} data @returns {RatingSummary}
 */
function normalizeRatingSummary(data) {
  /** @type {Record<number, number>} */
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const star of STAR_VALUES) breakdown[star] = count(data?.breakdown?.[star]);
  const ratings = Array.isArray(data?.ratings)
    ? data.ratings.filter(item => item && Number.isInteger(Number(item.rating)) &&
      Number(item.rating) >= 1 && Number(item.rating) <= 5)
    : [];
  const average = Number(data?.averageRating);
  return {
    averageRating: Number.isFinite(average) && average > 0 && average <= 5 ? average : 0,
    reviewCount: count(data?.reviewCount),
    breakdown,
    ratings,
  };
}

/** Rows for the 5→1 distribution bars; share is 0..1 of the total.
 * @param {RatingSummary} summary
 */
function breakdownRows(summary) {
  const total = STAR_VALUES.reduce((sum, star) => sum + (summary.breakdown[star] || 0), 0);
  return STAR_VALUES.map(star => {
    const value = summary.breakdown[star] || 0;
    return { star, count: value, share: total ? value / total : 0 };
  });
}

/** @param {PoiRating[]} ratings @param {string|null|undefined} userId */
function findUserRating(ratings, userId) {
  if (!userId) return null;
  return ratings.find(item => item.userId === userId) || null;
}

/** Visible list: the current user's own rating is shown separately, never twice.
 * @param {PoiRating[]} ratings @param {string|number} filter 'all' | 'text' | a star value
 * @param {string|null} [userId]
 */
function filterRatings(ratings, filter, userId = null) {
  return ratings.filter(item => {
    if (userId && item.userId === userId) return false;
    if (filter === 'text') return typeof item.review === 'string' && item.review.trim() !== '';
    if (typeof filter === 'number') return item.rating === filter;
    return true;
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Indonesian relative time; falls back to an absolute date after four weeks.
 * @param {unknown} value @param {Date} [now]
 */
function formatRelativeTime(value, now = new Date()) {
  const date = new Date(/** @type {any} */ (value));
  if (!value || !Number.isFinite(date.getTime())) return '';
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return 'Baru saja';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Kemarin';
  if (days < 7) return `${days} hari lalu`;
  if (days < 28) return `${Math.floor(days / 7)} minggu lalu`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Up to two initials for the avatar bubble. @param {unknown} name */
function initialsOf(name) {
  if (typeof name !== 'string' || !name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return letters.toUpperCase();
}

/** Star icon names for any value 0..5, padded with outlines to five.
 * @param {number} value @returns {('star'|'star-half'|'star-outline')[]}
 */
function starIcons(value) {
  const rounded = Number.isFinite(value) ? Math.round(Math.min(5, Math.max(0, value)) * 2) / 2 : 0;
  return [1, 2, 3, 4, 5].map(position => {
    if (rounded >= position) return 'star';
    if (rounded >= position - 0.5) return 'star-half';
    return 'star-outline';
  });
}

/**
 * Overlay freshly fetched rating summaries onto POI records for display.
 * Returns the original array when nothing applies so memoized consumers stay stable.
 * @param {any[]} pois @param {Record<string, {rating:number, reviewsCount:number}>} overrides
 * @returns {any[]}
 */
function applyRatingOverrides(pois, overrides) {
  if (!Array.isArray(pois) || !overrides || !Object.keys(overrides).length) return pois;
  return pois.map(poi => {
    const override = overrides[poi.id];
    return override ? { ...poi, rating: override.rating, reviewsCount: override.reviewsCount } : poi;
  });
}

module.exports = {
  applyRatingOverrides,
  MAX_REVIEW_LENGTH,
  RATING_LABELS,
  normalizeRatingSummary,
  breakdownRows,
  findUserRating,
  filterRatings,
  formatRelativeTime,
  initialsOf,
  starIcons,
};
