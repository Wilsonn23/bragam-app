const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const positiveNumber = value => typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

/** Return only the filled/half stars corresponding to the rating, rounded to half a star.
 * @param {unknown} value @returns {('star'|'star-half')[]}
 */
function getRatingStars(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 || value > 5) return [];
  const rounded = Math.round(value * 2) / 2;
  /** @type {('star'|'star-half')[]} */
  const stars = Array(Math.floor(rounded)).fill('star');
  if (rounded % 1) stars.push('star-half');
  return stars;
}

/** Accept a single imageUrl and/or an imageUrls array without fabricating gallery items.
 * @param {{imageUrl?: unknown, imageUrls?: unknown}} poi @returns {string[]}
 */
function getPoiGalleryImages(poi) {
  const urls = [poi?.imageUrl, ...(Array.isArray(poi?.imageUrls) ? poi.imageUrls : [])];
  return [...new Set(urls.filter(value => typeof value === 'string' && /^https?:\/\//i.test(value)))];
}

/** Calculate open status for a simple daily time range in Bandung time (WIB).
 * Unknown formats and equal opening/closing times are intentionally not guessed.
 * @param {unknown} hours @param {Date} [now] @returns {'Open'|'Closed'|null}
 */
function getOperatingStatus(hours, now = new Date()) {
  if (typeof hours !== 'string' || !(now instanceof Date) || !Number.isFinite(now.getTime())) return null;
  const match = hours.match(/^\s*(\d{1,2})[:.](\d{2})\s*[-–—]\s*(\d{1,2})[:.](\d{2})\s*$/);
  if (!match) return null;
  const [, startHour, startMinute, endHour, endMinute] = match.map(Number);
  if (startHour > 23 || endHour > 23 || startMinute > 59 || endMinute > 59) return null;
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  if (start === end) return null;
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const current = wib.getUTCHours() * 60 + wib.getUTCMinutes();
  const open = start < end ? current >= start && current < end : current >= start || current < end;
  return open ? 'Open' : 'Closed';
}

function getPoiDetailFields(poi) {
  const rating = positiveNumber(poi?.rating);
  const hasRating = rating !== null && rating <= 5;
  const reviewCount = Number.isInteger(poi?.reviewsCount) && poi.reviewsCount >= 0 ? poi.reviewsCount : null;
  const min = positiveNumber(poi?.priceMin);
  const max = positiveNumber(poi?.priceMax);
  const prices = [min, max].filter((price, index, all) => price !== null && all.indexOf(price) === index);
  const distance = typeof poi?.distanceMeters === 'number' && Number.isFinite(poi.distanceMeters) && poi.distanceMeters >= 0
    ? `${Math.round(poi.distanceMeters)} m` : 'Jarak belum tersedia';
  const summary = hasRating ? `${rating} / 5${reviewCount !== null ? ` (${reviewCount} ulasan)` : ''}` : 'Rating belum tersedia';
  return {
    distance,
    rating: hasRating ? String(rating) : 'Rating belum tersedia',
    hasRating,
    ratingSummary: summary,
    description: text(poi?.description) || text(poi?.shortDescription) || 'Deskripsi belum tersedia.',
    address: text(poi?.address) || 'Alamat belum tersedia.',
    openingHours: text(poi?.openingHours) || 'Jam operasional belum tersedia.',
    website: text(poi?.website) || 'Situs web belum tersedia.',
    menu: text(poi?.menuHighlights) || text(poi?.menu) || 'Menu belum tersedia.',
    prices: prices.length ? `Kisaran harga: ${prices.map(price => `Rp${price.toLocaleString('id-ID')}`).join(' – ')}` : 'Harga belum tersedia.',
    reviews: text(poi?.reviews) || 'Ulasan tertulis belum tersedia.',
    history: text(poi?.history) || 'Cerita destinasi belum tersedia.',
  };
}
module.exports = { getPoiDetailFields, getRatingStars, getPoiGalleryImages, getOperatingStatus };
