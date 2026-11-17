// Explicit test responses, NOT an algorithm or a claim of contextual relevance.
// Identity/name/coordinates are from data/dataset_poi_braga_pb03.csv; optional fields cover missing data.
const items = [
  { poi: { id: 'P03', name: 'Sweet Cantina', category: 'Kuliner (Dessert)',
    latitude: -6.91685, longitude: 107.60895, shortDescription: 'Spot es krim artisan dan cookies.',
    description: 'Contoh development untuk menguji halaman detail.', rating: 4.5, reviews_count: 890,
    openAtNight: true }, reason: 'Contoh alasan rekomendasi untuk pengujian UI.' },
  { poi: { id: 'P01', name: 'Maison Bogerijen', category: 'Kuliner Legendaris',
    latitude: -6.91775, longitude: 107.60912, shortDescription: 'Restoran legendaris di Braga.',
    rating: 4.6, reviews_count: 1280, openAtNight: true }, reason: '' },
  { poi: { id: 'P04', name: 'Toko Roti Canary', category: 'Kuliner (Bakery & Oleh-oleh)',
    shortDescription: 'Contoh data tanpa lokasi, foto, dan ulasan.', rating: 0, reviews_count: 0,
    openAtNight: false }, reason: '' },
];

export async function loadDemoRecommendations(source, signal, catalogue = []) {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, 450);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new Error('ABORTED')); }, { once: true });
  });
  if (source === 'demo-error') throw new Error('DEVELOPMENT_FAILURE');
  const examples = items.map((item) => {
    const actual = catalogue.find((poi) => poi.id === item.poi.id);
    return { ...item, poi: { ...item.poi, imageUrl: actual?.imageUrl, images: actual?.images } };
  });
  return { items: source === 'demo-empty' ? [] : examples, capabilities: { openAtNight: true } };
}
