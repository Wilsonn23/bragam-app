// Keep the presented notification until the user dismisses it, even if GPS expires.
class NotificationPresentation {
  constructor() { this.event = null; }
  capture(candidate) { if (!this.event && candidate) this.event = candidate; }
  current() { return this.event; }
  dismiss(controller) {
    if (controller.current() === this.event) controller.dismiss();
    this.event = null;
    this.capture(controller.current());
  }
}

function getPoiGalleryImages(poi) {
  const fromObjects = Array.isArray(poi?.images)
    ? poi.images.map(img => img?.imageUrl ?? img?.image_url)
    : [];
  const urls = [...fromObjects, poi?.imageUrl, ...(Array.isArray(poi?.imageUrls) ? poi.imageUrls : [])];
  return [...new Set(urls.filter(value => typeof value === 'string' && /^https?:\/\//i.test(value)))];
}

module.exports = { NotificationPresentation };
