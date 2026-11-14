const express = require('express');
const cors = require('cors');
const loadPoisFromCsv = require('./utils/loadPOIs');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const pois = loadPoisFromCsv();

// Hitung jarak dua koordinat dalam meter (Rumus Haversine)
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Endpoint Health Check (PB01)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    dataset: 'dataset_poi_braga_pb03_3.csv',
    total_pois: pois.length,
  });
});

// Endpoint Kategori Dinamis dari CSV (PB09)
app.get('/api/categories', (req, res) => {
  const rawCategories = pois
    .map((p) => (p.main_category || p.category || '').trim())
    .filter(Boolean);

  const uniqueCategories = ['Semua', ...new Set(rawCategories)];
  res.status(200).json({ categories: uniqueCategories });
});

// Endpoint Pencarian & Multi-Filter POI (PB09)
app.get('/api/pois/search', (req, res) => {
  const {
    q = '',
    category = 'Semua',
    time_category = 'Semua',
    environment = 'Semua',
    min_rating = '0',
    lat,
    lng,
  } = req.query;

  const keyword = q.trim().toLowerCase();
  const selectedCat = category.trim().toLowerCase();
  const selectedTime = time_category.trim().toLowerCase();
  const selectedEnv = environment.trim().toLowerCase();
  const minRatingVal = parseFloat(min_rating) || 0;

  const hasCoords =
    lat !== undefined &&
    lng !== undefined &&
    !isNaN(parseFloat(lat)) &&
    !isNaN(parseFloat(lng));

  let results = pois.filter((poi) => {
    // 1. Filter Kata Kunci
    const searchableText = [
      poi.name,
      poi.category,
      poi.main_category,
      poi.sub_category,
      poi.description,
      poi.menu_highlights,
      poi.history,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchKeyword = keyword === '' || searchableText.includes(keyword);

    // 2. Filter Category
    const poiCategory = (poi.main_category || poi.category || '').toLowerCase();
    const matchCategory =
      selectedCat === 'semua' ||
      poiCategory === selectedCat ||
      (poi.category && poi.category.toLowerCase().includes(selectedCat));

    // 3. Filter Time Category (pagi, siang, malam — mendukung nilai gabungan seperti "pagi, siang, malam")
    const poiTimes = (poi.time_category || '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const matchTime = selectedTime === 'semua' || poiTimes.includes(selectedTime);

    // 4. Filter Environment (indoor, outdoor, both)
    const poiEnv = (poi.environment || '').trim().toLowerCase();
    const matchEnv = selectedEnv === 'semua' || poiEnv === selectedEnv;

    // 5. Filter Rating Minimum (1+, 2+, 3+, 4+)
    const matchRating = (poi.rating || 0) >= minRatingVal;

    return matchKeyword && matchCategory && matchTime && matchEnv && matchRating;
  });

  results = results.map((poi) => ({
    ...poi,
    distanceMeters:
      hasCoords && !isNaN(poi.latitude) && !isNaN(poi.longitude)
        ? getDistanceMeters(parseFloat(lat), parseFloat(lng), poi.latitude, poi.longitude)
        : null,
  }));

  if (hasCoords) {
    results.sort((a, b) => (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity));
  } else {
    results.sort((a, b) => b.rating - a.rating);
  }

  res.status(200).json({
    count: results.length,
    data: results,
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server BRAGAm (PB09) berjalan di port ${PORT} — ${pois.length} POI dimuat.`);
});