const { distanceMeters, validCoordinate } = require('../location/distance');
const { getPoiGalleryImages } = require('../poi/presentation');

const DEFAULT_FILTERS = Object.freeze({ query: '', category: '', openAtNight: false, minRating: 0 });

/** Ordered service envelope. Reject ambiguous identities; never rank a POI catalogue here. */
function adaptRecommendations(payload) {
  if (!payload || !Array.isArray(payload.items)) throw new Error('INVALID_RECOMMENDATIONS');
  const seen = new Set();
  const items = payload.items.map((item) => {
    const poi = item?.poi;
    if (!poi || typeof poi.id !== 'string' || !poi.id.trim() ||
      typeof poi.name !== 'string' || !poi.name.trim() || seen.has(poi.id)) {
      throw new Error('INVALID_RECOMMENDATIONS');
    }
    seen.add(poi.id);
    return { poi: { ...poi }, reason: typeof item.reason === 'string' ? item.reason.trim() : '' };
  });
  return { items, capabilities: { openAtNight: payload.capabilities?.openAtNight === true } };
}

function reviewedRating(poi) {
  const count = Number(poi.reviewsCount ?? poi.reviews_count);
  const value = Number(poi.rating);
  return Number.isInteger(count) && count > 0 && Number.isFinite(value) && value > 0 && value <= 5
    ? { value, count } : null;
}

function coordinates(poi) {
  const value = { latitude: poi.latitude ?? poi.coordinate?.latitude,
    longitude: poi.longitude ?? poi.coordinate?.longitude };
  return validCoordinate(value) ? value : null;
}

function locationForRecommendations(sample, now = Date.now()) {
  return validCoordinate(sample) && Number.isFinite(sample.timestamp) &&
    now - sample.timestamp >= 0 && now - sample.timestamp <= 15000 &&
    Number.isFinite(sample.accuracy) && sample.accuracy <= 25 && sample.accuracy >= 0
    ? { latitude: sample.latitude, longitude: sample.longitude } : null;
}

function distanceLabel(poi, location) {
  const target = coordinates(poi);
  if (!target || !validCoordinate(location)) return 'Jarak belum tersedia';
  const meters = distanceMeters(location, target);
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function filterRecommendations(items, filters = DEFAULT_FILTERS) {
  const query = (filters.query || '').trim().toLocaleLowerCase('id-ID');
  return items.filter(({ poi }) => {
    const text = [poi.name, poi.category, poi.shortDescription, poi.description]
      .filter((value) => typeof value === 'string').join(' ').toLocaleLowerCase('id-ID');
    return (!query || text.includes(query)) && (!filters.category || poi.category === filters.category) &&
      (!filters.openAtNight || poi.openAtNight === true) &&
      (!filters.minRating || (reviewedRating(poi)?.value || 0) >= filters.minRating);
  });
}

function poiForDetail(item, location) {
  if (!item?.poi?.id) throw new Error('INVALID_POI_ID');
  const rating = reviewedRating(item.poi);
  const target = coordinates(item.poi);
  return { ...item.poi, distance: distanceLabel(item.poi, location),
    distanceMeters: target && validCoordinate(location) ? distanceMeters(location, target) : undefined,
    rating: rating ? rating.value : null,
    reviewsCount: rating ? rating.count : 0,
    imageUrls: galleryUrls(item.poi),
    recommendationPoiId: item.poi.id };
}

/** Current main uses imageUrls; retain the older image metadata at this boundary. */
function galleryUrls(poi) {
  return getPoiGalleryImages({ ...poi, imageUrls: [...(Array.isArray(poi.imageUrls) ? poi.imageUrls : []),
    ...(Array.isArray(poi.images) ? poi.images.map(image => image?.imageUrl) : [])] });
}

/** A recommendation ID must never resolve to a different POI merely because its name matches. */
function resolveRecommendationDetail(poi, catalogue) {
  if (!poi || typeof poi.id !== 'string' || !poi.id.trim()) return null;
  const canonical = catalogue.find(record => record.id === poi.id);
  const provided = Object.fromEntries(Object.entries(poi).filter(([, value]) => value !== undefined));
  return { ...canonical, ...provided, id: poi.id };
}

module.exports = { DEFAULT_FILTERS, adaptRecommendations, reviewedRating, coordinates,
  locationForRecommendations, distanceLabel, filterRecommendations, poiForDetail, galleryUrls, resolveRecommendationDetail };
