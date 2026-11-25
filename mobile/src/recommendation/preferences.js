// User-customisable recommendation preferences. Keep values in sync with backend/routes/preferences.js.

/** @typedef {'preference'|'time'|'location'|'rating'|'weather'} Factor */
/**
 * @typedef {{interests:string[], visitTime:'auto'|'pagi'|'siang'|'malam', environment:'any'|'indoor'|'outdoor',
 *   maxBudget:number|null, hideClosed:boolean, weights:Record<Factor, number>}} Preferences
 */

const INTERESTS = Object.freeze([
  { key: 'kuliner', label: 'Kuliner & Resto', icon: 'restaurant-outline', pattern: /kuliner|resto|makanan/i },
  { key: 'kafe', label: 'Kafe & Dessert', icon: 'cafe-outline', pattern: /kafe|bakery|dessert|kopi/i },
  { key: 'oleh', label: 'Oleh-oleh', icon: 'gift-outline', pattern: /oleh/i },
  { key: 'sejarah', label: 'Sejarah & Budaya', icon: 'library-outline', pattern: /sejarah|budaya|seni|legendaris/i },
  { key: 'hiburan', label: 'Hiburan & Belanja', icon: 'sparkles-outline', pattern: /hiburan|belanja|rekreasi/i },
  { key: 'malam', label: 'Nightlife', icon: 'moon-outline', pattern: /malam|nightlife/i },
]);

const VISIT_TIMES = Object.freeze([
  { key: 'auto', label: 'Otomatis', icon: 'time-outline' },
  { key: 'pagi', label: 'Pagi', icon: 'partly-sunny-outline' },
  { key: 'siang', label: 'Siang', icon: 'sunny-outline' },
  { key: 'malam', label: 'Malam', icon: 'moon-outline' },
]);

const ENVIRONMENTS = Object.freeze([
  { key: 'any', label: 'Bebas' },
  { key: 'indoor', label: 'Indoor' },
  { key: 'outdoor', label: 'Outdoor' },
]);

const BUDGETS = Object.freeze([
  { key: null, label: 'Bebas' },
  { key: 50000, label: '≤ 50rb' },
  { key: 100000, label: '≤ 100rb' },
  { key: 200000, label: '≤ 200rb' },
]);

const FACTORS = Object.freeze([
  { key: 'preference', label: 'Minat & selera', icon: 'heart-outline' },
  { key: 'time', label: 'Waktu kunjungan', icon: 'time-outline' },
  { key: 'location', label: 'Jarak dari kamu', icon: 'navigate-outline' },
  { key: 'rating', label: 'Rating pengunjung', icon: 'star-outline' },
  { key: 'weather', label: 'Kondisi cuaca', icon: 'cloud-outline' },
]);

const WEIGHT_LEVELS = Object.freeze(['Abaikan', 'Rendah', 'Sedang', 'Tinggi']);

/** @type {Preferences} */
const DEFAULT_PREFERENCES = Object.freeze({
  interests: [],
  visitTime: 'auto',
  environment: 'any',
  maxBudget: null,
  hideClosed: true,
  weights: Object.freeze({ preference: 2, time: 2, location: 2, rating: 2, weather: 2 }),
});

/** Coerce any stored/received value into valid preferences. @param {any} value @returns {Preferences} */
function normalizePreferences(value) {
  const source = value && typeof value === 'object' ? value : {};
  /** @type {Record<Factor, number>} */
  const weights = { ...DEFAULT_PREFERENCES.weights };
  for (const { key } of FACTORS) {
    const weight = source.weights?.[key];
    if (Number.isInteger(weight) && weight >= 0 && weight <= 3) weights[key] = weight;
  }
  if (Object.values(weights).every(weight => weight === 0)) Object.assign(weights, DEFAULT_PREFERENCES.weights);
  const keys = INTERESTS.map(item => item.key);
  return {
    interests: Array.isArray(source.interests) ? [...new Set(source.interests.filter(item => keys.includes(item)))] : [],
    visitTime: VISIT_TIMES.some(item => item.key === source.visitTime) ? source.visitTime : DEFAULT_PREFERENCES.visitTime,
    environment: ENVIRONMENTS.some(item => item.key === source.environment) ? source.environment : DEFAULT_PREFERENCES.environment,
    maxBudget: BUDGETS.some(item => item.key === source.maxBudget) ? source.maxBudget : DEFAULT_PREFERENCES.maxBudget,
    hideClosed: typeof source.hideClosed === 'boolean' ? source.hideClosed : DEFAULT_PREFERENCES.hideClosed,
    weights,
  };
}

/** @param {Preferences} a @param {Preferences} b */
function samePreferences(a, b) {
  return JSON.stringify(normalizePreferences(a)) === JSON.stringify(normalizePreferences(b));
}

/** Short human summary of what the user customised, for chips. @param {Preferences} prefs */
function preferenceSummary(prefs) {
  const parts = [];
  if (prefs.interests.length) {
    parts.push(...INTERESTS.filter(item => prefs.interests.includes(item.key)).map(item => item.label));
  }
  if (prefs.visitTime !== 'auto') parts.push(`Waktu: ${VISIT_TIMES.find(item => item.key === prefs.visitTime)?.label}`);
  if (prefs.environment !== 'any') parts.push(ENVIRONMENTS.find(item => item.key === prefs.environment)?.label);
  if (prefs.maxBudget) parts.push(`Budget ${BUDGETS.find(item => item.key === prefs.maxBudget)?.label}`);
  return parts.filter(Boolean);
}

module.exports = {
  INTERESTS, VISIT_TIMES, ENVIRONMENTS, BUDGETS, FACTORS, WEIGHT_LEVELS,
  DEFAULT_PREFERENCES, normalizePreferences, samePreferences, preferenceSummary,
};
