/** @typedef {{latitude: number, longitude: number}} Coordinate */
/** @param {Coordinate} value */
function validCoordinate(value) {
  return !!value && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
    Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180;
}
/** Great-circle distance in meters. Invalid inputs return NaN.
 * @param {Coordinate} a @param {Coordinate} b
 */
function distanceMeters(a, b) {
  if (!validCoordinate(a) || !validCoordinate(b)) return NaN;
  const rad = (n) => n * Math.PI / 180;
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
module.exports = { distanceMeters, validCoordinate };
