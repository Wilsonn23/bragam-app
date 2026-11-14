function notificationContent(poi) {
  const text = value => typeof value === 'string' ? value.trim() : '';
  const description = text(poi.description) || text(poi.shortDescription);
  return {
    title: text(poi.notificationTitle) || `Ada ${poi.name} di dekatmu!`,
    body: text(poi.notificationBody) || (description.length > 220 ? `${description.slice(0, 217).trimEnd()}…` : description) || 'Temukan informasi destinasi ini.',
  };
}
function detailTarget(id) {
  if (typeof id !== 'string' || !id.trim()) throw new Error('ID destinasi tidak valid.');
  return { pathname: '/poi/[id]', params: { id } };
}
function openPoiDetail(id, push) { push(detailTarget(id)); }
function notificationImages(poi) {
  const candidates = [...(Array.isArray(poi.imageUrls) ? poi.imageUrls : []), poi.imageUrl];
  return [...new Set(candidates.filter(url => typeof url === 'string' && /^https?:\/\//.test(url)))].slice(0, 3);
}
function formatPoiDistance(meters) {
  if (!Number.isFinite(meters) || meters < 0) return null;
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}
module.exports = { notificationContent, detailTarget, openPoiDetail, notificationImages, formatPoiDistance };
