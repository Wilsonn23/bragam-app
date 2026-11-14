function toPoiResponse(row) {
  const cooldown = Number(row.cooldown_seconds);
  return {
    id: row.id, name: row.name, category: row.category,
    latitude: Number(row.latitude), longitude: Number(row.longitude),
    triggerRadiusMeters: Number(row.radius_meters),
    cooldownSeconds: row.cooldown_seconds != null && Number.isFinite(cooldown) && cooldown >= 0 ? cooldown : 60,
    description: row.description || '', shortDescription: row.description || '',
    notificationTitle: row.notification_title || '', notificationBody: row.notification_body || null,
    imageUrl: undefined, audioGuideUrl: row.audio_guide_url || undefined,
    distanceMeters: row.distance_meters === undefined ? undefined : Number(row.distance_meters),
  };
}
module.exports = { toPoiResponse };
