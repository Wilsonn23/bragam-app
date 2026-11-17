// Keep field names shared by the map, detail view, and audio guide.
function optionalNumber(value) {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toPoiResponse(row) {
  const images = Array.isArray(row.images) ? row.images : [];
  const legacyImageUrl = typeof row.image_url === 'string' &&
    /^https?:\/\//i.test(row.image_url) ? row.image_url : undefined;

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    triggerRadiusMeters: Number(row.radius_meters),
    ...(row.cooldown_seconds !== undefined ? { cooldownSeconds: optionalNumber(row.cooldown_seconds) ?? 60 } : {}),
    shortDescription: row.description || '',
    description: row.description || undefined,
    address: row.address || undefined,
    history: row.history || undefined,
    openingHours: row.opening_hours || undefined,
    menuHighlights: row.menu_highlights || undefined,
    priceMin: optionalNumber(row.price_min),
    priceMax: optionalNumber(row.price_max),
    rating: optionalNumber(row.rating),
    reviewsCount: optionalNumber(row.reviews_count),
    imageUrl: images[0]?.imageUrl || legacyImageUrl,
    images,
    notificationTitle: row.notification_title || '',
    notificationBody: row.notification_body === undefined ? null : row.notification_body,
    audioGuideUrl: row.audio_guide_url || undefined,
    distanceMeters: optionalNumber(row.distance_meters),
  };
}
module.exports = { toPoiResponse };
