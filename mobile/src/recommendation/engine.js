// Contextual recommendation engine: scores POIs from user preferences, visit time,
// location, rating and weather. Pure and deterministic for a given `now`.
const { getOperatingStatus } = require('../poi/presentation');
const { distanceMeters, validCoordinate } = require('../location/distance');
const { INTERESTS, ENVIRONMENTS, normalizePreferences } = require('./preferences');

/** @typedef {import('./preferences').Preferences} Preferences */
/** @typedef {import('./preferences').Factor} Factor */
/** @typedef {import('./weather').Weather} Weather */
/** @typedef {'pagi'|'siang'|'sore'|'malam'} Slot */
/** @typedef {{icon:string, text:string}} Reason */
/** @typedef {{score:number, reason?:Reason}|null} FactorResult */

const SLOT_LABELS = Object.freeze({ pagi: 'pagi', siang: 'siang', sore: 'sore', malam: 'malam' });
// Representative WIB hour used to check opening hours for a chosen (non-auto) visit time.
const SLOT_HOURS = Object.freeze({ pagi: 9, siang: 13, sore: 16, malam: 19.5 });
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const NEAR_LIMIT_METERS = 5000; // beyond this the user is not in Braga; distance stops being informative
const WALK_METERS_PER_MINUTE = 80;
const RATING_PRIOR = { mean: 4.2, weight: 10 };

const clamp01 = value => Math.min(1, Math.max(0, value));
const text = value => typeof value === 'string' ? value.trim().toLowerCase() : '';

/** @param {Date} now @returns {Slot} */
function slotAt(now) {
  const hour = new Date(now.getTime() + WIB_OFFSET_MS).getUTCHours();
  if (hour >= 5 && hour < 11) return 'pagi';
  if (hour >= 11 && hour < 15) return 'siang';
  if (hour >= 15 && hour < 18) return 'sore';
  return 'malam';
}

/** Today's date at the slot's representative WIB hour. @param {Slot} slot @param {Date} now */
function dateForSlot(slot, now) {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  const midnightWibAsUtc = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate());
  return new Date(midnightWibAsUtc + SLOT_HOURS[slot] * 3600 * 1000 - WIB_OFFSET_MS);
}

/** How well a POI's time tags fit a slot: 1 exact, 0.8 sore-adjacent, 0.5 unknown, 0.2 mismatch. */
function slotFit(timeCategory, slot) {
  const tags = text(timeCategory).split(/[,/]/).map(tag => tag.trim()).filter(Boolean);
  if (!tags.length) return 0.5;
  if (tags.includes(slot)) return 1;
  if (slot === 'sore' && (tags.includes('siang') || tags.includes('malam'))) return 0.8;
  return 0.2;
}

const poiEnvironment = poi => text(poi.environment) || null;
const poiTimeCategory = poi => poi.timeCategory ?? poi.time_category;
const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;

/** @param {any} poi @param {Preferences} prefs @returns {FactorResult} */
function preferenceFactor(poi, prefs) {
  /** @type {{score:number, reason?:Reason}[]} */
  const parts = [];
  if (prefs.interests.length) {
    const matched = INTERESTS.find(item => prefs.interests.includes(item.key) && item.pattern.test(poi.category || ''));
    parts.push(matched
      ? { score: 1, reason: { icon: matched.icon, text: `Sesuai minatmu: ${matched.label}` } }
      : { score: 0.15 });
  }
  if (prefs.environment !== 'any') {
    const env = poiEnvironment(poi);
    const label = ENVIRONMENTS.find(item => item.key === prefs.environment)?.label;
    if (!env) parts.push({ score: 0.5 });
    else if (env === prefs.environment || env === 'both') {
      parts.push({ score: 1, reason: { icon: prefs.environment === 'indoor' ? 'home-outline' : 'leaf-outline', text: `Area ${label?.toLowerCase()} sesuai pilihanmu` } });
    } else parts.push({ score: 0.1 });
  }
  if (prefs.maxBudget) {
    const min = Number(poi.priceMin);
    const max = Number.isFinite(Number(poi.priceMax)) && Number(poi.priceMax) > 0 ? Number(poi.priceMax) : min;
    if (!Number.isFinite(min)) parts.push({ score: 0.5 });
    else if (max <= prefs.maxBudget) parts.push({ score: 1, reason: { icon: 'wallet-outline', text: 'Masuk budget-mu' } });
    else if (min <= prefs.maxBudget) parts.push({ score: 0.65 });
    else parts.push({ score: 0.05 });
  }
  if (!parts.length) return null;
  const best = parts.filter(part => part.reason).sort((a, b) => b.score - a.score)[0];
  return { score: average(parts.map(part => part.score)), reason: best?.reason };
}

/** @param {any} poi @param {Slot} slot @param {boolean} auto @param {Date} at */
function timeFactor(poi, slot, auto, at) {
  const status = getOperatingStatus(poi.openingHours, at);
  const fit = slotFit(poiTimeCategory(poi), slot);
  const closed = status === 'Closed';
  /** @type {Reason|undefined} */
  let reason;
  if (!closed && fit >= 0.8) {
    reason = { icon: 'time-outline', text: auto && status === 'Open' ? `Buka sekarang · pas untuk ${SLOT_LABELS[slot]}` : `Pas untuk kunjungan ${SLOT_LABELS[slot]}` };
  } else if (!closed && auto && status === 'Open') {
    reason = { icon: 'time-outline', text: 'Buka sekarang' };
  }
  return { result: { score: closed ? fit * 0.15 : fit, reason }, closed, status };
}

/** @param {any} poi @param {{latitude:number, longitude:number}|null} user */
function locationFactor(poi, user) {
  if (!validCoordinate(user)) return { result: null, distance: null };
  const distance = distanceMeters(user, poi);
  if (!Number.isFinite(distance) || distance > NEAR_LIMIT_METERS) return { result: null, distance };
  const minutes = Math.max(1, Math.round(distance / WALK_METERS_PER_MINUTE));
  const label = distance < 1000 ? `${Math.round(distance / 10) * 10} m` : `${(distance / 1000).toFixed(1)} km`;
  return {
    result: {
      score: 1 / (1 + distance / 400),
      reason: distance <= 600 ? { icon: 'walk-outline', text: `${label} · ${minutes} menit jalan kaki` } : undefined,
    },
    distance,
  };
}

/** Bayesian-smoothed rating so 5.0 from 2 reviews does not outrank 4.7 from 1,000. @returns {FactorResult} */
function ratingFactor(poi) {
  const rating = Number(poi.rating);
  if (!Number.isFinite(rating) || rating <= 0) return { score: 0.5 };
  const count = Number.isFinite(Number(poi.reviewsCount)) ? Math.max(0, Number(poi.reviewsCount)) : 0;
  const smoothed = (RATING_PRIOR.mean * RATING_PRIOR.weight + rating * count) / (RATING_PRIOR.weight + count);
  return {
    score: clamp01((smoothed - 3) / 2),
    reason: rating >= 4.5 ? { icon: 'star', text: `Rating ${rating.toFixed(1)}${count ? ` dari ${count.toLocaleString('id-ID')} ulasan` : ''}` } : undefined,
  };
}

/** @param {any} poi @param {Weather|null} weather @returns {FactorResult} */
function weatherFactor(poi, weather) {
  if (!weather) return null;
  const env = poiEnvironment(poi);
  if (!env) return { score: 0.5 };
  const pick = (indoor, both, outdoor) => env === 'indoor' ? indoor : env === 'outdoor' ? outdoor : both;
  if (weather.wet) {
    return { score: pick(1, 0.6, 0.1), reason: env === 'indoor' ? { icon: 'umbrella-outline', text: `Indoor, tetap nyaman saat ${weather.label.toLowerCase()}` } : undefined };
  }
  if (weather.hot) {
    return { score: pick(0.9, 0.75, 0.45), reason: env === 'indoor' ? { icon: 'snow-outline', text: 'Sejuk, terlindung dari terik' } : undefined };
  }
  if (weather.condition === 'clear') {
    return {
      score: pick(0.6, 0.85, 1),
      reason: env !== 'indoor' ? { icon: weather.isDay ? 'sunny-outline' : 'moon-outline', text: `${weather.isDay ? 'Cuaca cerah' : 'Malam cerah'}, pas untuk ${env === 'both' ? 'duduk di luar' : 'outdoor'}` } : undefined,
    };
  }
  return { score: pick(0.75, 0.75, 0.7) };
}

/**
 * Rank POIs for the current context.
 * @param {any[]} pois
 * @param {Preferences} preferences
 * @param {{now?: Date, userCoord?: {latitude:number, longitude:number}|null, weather?: Weather|null}} [context]
 */
function recommend(pois, preferences, { now = new Date(), userCoord = null, weather = null } = {}) {
  const prefs = normalizePreferences(preferences);
  const auto = prefs.visitTime === 'auto';
  /** @type {Slot} */
  const slot = auto ? slotAt(now) : /** @type {Slot} */ (prefs.visitTime);
  const at = auto ? now : dateForSlot(slot, now);
  let farAway = false;
  let hiddenClosed = 0;

  const items = [];
  for (const poi of Array.isArray(pois) ? pois : []) {
    if (!poi || poi.isLocalTest || poi.id === 'TEST-LOCAL') continue;
    const time = timeFactor(poi, slot, auto, at);
    if (time.closed && prefs.hideClosed) { hiddenClosed += 1; continue; }
    const location = locationFactor(poi, userCoord);
    if (location.distance !== null && location.result === null) farAway = true;

    /** @type {Record<Factor, FactorResult>} */
    const factors = {
      preference: preferenceFactor(poi, prefs),
      time: time.result,
      location: location.result,
      rating: ratingFactor(poi),
      weather: weatherFactor(poi, weather),
    };
    let weighted = 0;
    let totalWeight = 0;
    /** @type {{reason:Reason, impact:number}[]} */
    const reasons = [];
    for (const [key, result] of Object.entries(factors)) {
      const weight = prefs.weights[key];
      if (!result || !weight) continue;
      weighted += weight * result.score;
      totalWeight += weight;
      if (result.reason && result.score >= 0.75) reasons.push({ reason: result.reason, impact: weight * result.score });
    }
    let score = totalWeight ? weighted / totalWeight : 0.5;
    if (time.closed) score *= 0.6;
    items.push({
      poi,
      score,
      matchPercent: Math.round(clamp01(score) * 100),
      reasons: reasons.sort((a, b) => b.impact - a.impact).slice(0, 3).map(item => item.reason),
      closed: time.closed,
      openStatus: time.status,
      distanceMeters: location.distance,
      factors,
    });
  }
  items.sort((a, b) => b.score - a.score || (Number(b.poi.rating) || 0) - (Number(a.poi.rating) || 0) ||
    String(a.poi.name).localeCompare(String(b.poi.name)));

  return {
    items,
    context: { slot, slotLabel: SLOT_LABELS[slot], auto, weather, hasLocation: validCoordinate(userCoord), farAway, hiddenClosed },
  };
}

module.exports = { recommend, slotAt, dateForSlot, slotFit, SLOT_LABELS };
