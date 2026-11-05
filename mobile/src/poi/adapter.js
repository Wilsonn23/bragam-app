const { validCoordinate } = require('../location/distance');
/** @typedef {{id:string, name:string, category:string, latitude:number, longitude:number,
 * triggerRadiusMeters:number, shortDescription:string, imageUrl?:string}} Poi */
/** PB03 adapter: invalid records and ALL occurrences of duplicate IDs are excluded.
 * @param {unknown} input @returns {Poi[]}
 */
function adaptPois(input) {
  if (!Array.isArray(input)) return [];
  const counts = new Map();
  for (const p of input) if (p && typeof p.id === 'string') counts.set(p.id, (counts.get(p.id) || 0) + 1);
  return input.filter(p => p && ['id', 'name', 'category', 'shortDescription'].every(k => typeof p[k] === 'string' && p[k].trim()) &&
    counts.get(p.id) === 1 && validCoordinate(p) && Number.isFinite(p.triggerRadiusMeters) && p.triggerRadiusMeters > 0)
    .map(p => ({ ...p, imageUrl: typeof p.imageUrl === 'string' && /^https?:\/\//.test(p.imageUrl) ? p.imageUrl : undefined }));
}
// Replace with the surveyed PB03 dataset/API adapter. Never use synthetic places in live mode.
const pois = [];
module.exports = { adaptPois, pois };
