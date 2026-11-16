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
/** @param {Coordinate} point @param {Coordinate[]} polygon */
function isPointInPolygon(point, polygon) {
  if (!validCoordinate(point) || !Array.isArray(polygon) || polygon.length < 3) return false;
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const current = polygon[index];
    const prior = polygon[previous];
    if (!validCoordinate(current) || !validCoordinate(prior)) return false;
    const crossesLatitude = (current.latitude > point.latitude) !== (prior.latitude > point.latitude);
    if (crossesLatitude) {
      const longitudeAtPoint = (prior.longitude - current.longitude) *
        (point.latitude - current.latitude) / (prior.latitude - current.latitude) + current.longitude;
      if (point.longitude < longitudeAtPoint) inside = !inside;
    }
  }
  return inside;
}
module.exports = { distanceMeters, isPointInPolygon, validCoordinate };
