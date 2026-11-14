// SYNTHETIC ONLY: near (0,0), no surveyed Braga place or real destination content.
const testPois = [
  { id: 'test-a', name: 'Titik Uji A', category: 'Data pengujian', latitude: 0, longitude: 0, triggerRadiusMeters: 12, cooldownSeconds: 60, shortDescription: 'POI sintetis untuk menguji notifikasi. Bukan destinasi nyata di Braga.' },
  { id: 'test-b', name: 'Titik Uji B dengan nama panjang untuk memeriksa tampilan notifikasi', category: 'Data pengujian', latitude: 0, longitude: 0.00005, triggerRadiusMeters: 15, cooldownSeconds: 60, shortDescription: 'POI sintetis kedua. Area bertumpang tindih dengan Titik Uji A untuk memeriksa antrean. Deskripsi ini sengaja lebih panjang agar konten dapat diuji pada layar kecil dan ukuran teks besar.' },
];
const positions = [
  { label: 'Di luar', latitude: 0.0005, longitude: 0 },
  { label: 'Masuk A + B', latitude: 0, longitude: 0 },
  { label: 'Batas A (13 m)', latitude: 0.000117, longitude: 0 },
  { label: 'Hanya B', latitude: 0, longitude: 0.00017 },
];
module.exports = { testPois, positions };
