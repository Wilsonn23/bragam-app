const { pois } = require('./adapter');

// The same PB03 records serve triggers and detail; simulations are explicitly isolated.
function findPoi(id, records = pois) {
  return typeof id === 'string' ? records.find(poi => poi.id === id) || null : null;
}
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
// Missing API fields must never inherit another destination's example content.
function detailContent(poi) {
  return {
    description: text(poi.description) || text(poi.shortDescription) || 'Deskripsi belum tersedia.',
    address: text(poi.address) || 'Alamat belum tersedia.',
    openingHours: text(poi.openingHours) || 'Jam operasional belum tersedia.',
    website: text(poi.website) || 'Website belum tersedia.',
    menu: text(poi.menu) || 'Menu dan harga belum tersedia.',
    reviews: text(poi.reviews) || 'Rating dan ulasan belum tersedia.',
    audioUrl: typeof poi.audioUrl === 'string' && /^https:\/\//i.test(poi.audioUrl) ? poi.audioUrl : null,
  };
}
module.exports = { findPoi, detailContent };
