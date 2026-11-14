const { validCoordinate } = require('../location/distance');
const DEFAULT_COOLDOWN_SECONDS = 60;
/** @typedef {{id:string, name:string, category:string, latitude:number, longitude:number,
 * triggerRadiusMeters:number, cooldownSeconds:number, shortDescription:string, description?:string,
 * notificationTitle?:string, notificationBody?:string, imageUrl?:string}} Poi */
const text = value => typeof value === 'string' ? value.trim() : '';
const numeric = value => typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
/** Accept API camelCase and database snake_case. Invalid rows and every duplicate ID are excluded.
 * @param {unknown} input @returns {Poi[]}
 */
function adaptPois(input) {
  if (!Array.isArray(input)) return [];
  const counts = new Map();
  for (const p of input) if (p && typeof p.id === 'string') counts.set(p.id, (counts.get(p.id) || 0) + 1);
  return input.filter(p => p && counts.get(p.id) === 1).map(p => {
    const cooldown = numeric(p.cooldownSeconds ?? p.cooldown_seconds);
    return { ...p, latitude: numeric(p.latitude), longitude: numeric(p.longitude),
      triggerRadiusMeters: numeric(p.triggerRadiusMeters ?? p.radius_meters),
      cooldownSeconds: Number.isFinite(cooldown) && cooldown >= 0 ? cooldown : DEFAULT_COOLDOWN_SECONDS,
      shortDescription: text(p.shortDescription ?? p.description),
      notificationTitle: text(p.notificationTitle ?? p.notification_title),
      notificationBody: text(p.notificationBody ?? p.notification_body),
      imageUrl: typeof p.imageUrl === 'string' && /^https?:\/\//.test(p.imageUrl) ? p.imageUrl : undefined,
      audioUrl: p.audioUrl ?? p.audioGuideUrl ?? p.audio_guide_url,
    };
  }).filter(p => ['id', 'name', 'category'].every(k => text(p[k])) && validCoordinate(p) &&
    Number.isFinite(p.triggerRadiusMeters) && p.triggerRadiusMeters > 0);
}
// Empty default retained for callers of findPoi without a dataset, never a live fallback.
const pois = [];
module.exports = { adaptPois, pois, DEFAULT_COOLDOWN_SECONDS };
