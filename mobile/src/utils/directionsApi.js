const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

async function fetchWithTimeout(url, timeoutMs = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

// Titik-titik jalur pedestrian (trotoar) sepanjang koridor Jl. Braga dari Utara ke Selatan
const BRAGA_PEDESTRIAN_SPINE = [
  { latitude: -6.9158, longitude: 107.60872 }, // Utara (Simpang Suniaraja)
  { latitude: -6.9162, longitude: 107.60880 }, // Braga CityWalk
  { latitude: -6.9165, longitude: 107.60888 }, // Bandung Kunafe
  { latitude: -6.91685, longitude: 107.60895 }, // Sweet Cantina
  { latitude: -6.9172, longitude: 107.60902 }, // Galeri Seni
  { latitude: -6.91761, longitude: 107.60910 }, // Kopi Toko Djawa
  { latitude: -6.91775, longitude: 107.60912 }, // Maison Bogerijen / Braga Permai
  { latitude: -6.9181, longitude: 107.60920 }, // Resto Braga
  { latitude: -6.91842, longitude: 107.60925 }, // Toko Roti Canary
  { latitude: -6.9189, longitude: 107.60935 }, // Bacang Panas Braga
  { latitude: -6.91925, longitude: 107.60945 }, // Gedung Majestic
  { latitude: -6.9196, longitude: 107.60952 }, // Selatan (Simpang Naripan)
];

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

function isInsideBragaCorridor(coord) {
  return (
    coord.latitude >= -6.9202 &&
    coord.latitude <= -6.9152 &&
    coord.longitude >= 107.6080 &&
    coord.longitude <= 107.6102
  );
}

// Bangun rute trotoar langsung di koridor Jl. Braga (dua arah untuk pejalan kaki)
function buildBragaCorridorWalk(origin, destination, destinationName) {
  const goingSouth = destination.latitude < origin.latitude;
  const minLat = Math.min(origin.latitude, destination.latitude);
  const maxLat = Math.max(origin.latitude, destination.latitude);

  let intermediate = BRAGA_PEDESTRIAN_SPINE.filter(
    (pt) => pt.latitude > minLat + 0.00008 && pt.latitude < maxLat - 0.00008
  );

  if (!goingSouth) {
    intermediate = [...intermediate].reverse();
  }

  const coordinates = [origin, ...intermediate, destination];

  let totalMeters = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    totalMeters += haversineMeters(coordinates[i], coordinates[i + 1]);
  }
  totalMeters = Math.max(10, totalMeters);

  const totalSeconds = Math.max(15, Math.round(totalMeters / 1.25));
  const directionCardinal = goingSouth ? 'ke arah selatan' : 'ke arah utara';
  const mainInstruction = `Jalan lurus di trotoar Jl. Braga (${directionCardinal}) sejauh ${formatDistance(
    totalMeters
  )} menuju ${destinationName}`;

  return {
    coordinates,
    distanceMeters: totalMeters,
    distanceText: formatDistance(totalMeters),
    durationSeconds: totalSeconds,
    durationText: formatDuration(totalSeconds),
    instruction: mainInstruction,
    steps: [
      {
        id: 'braga-step-0',
        instruction: mainInstruction,
        distanceMeters: totalMeters,
        distanceText: formatDistance(totalMeters),
        durationSeconds: totalSeconds,
        icon: 'arrow-up',
        startLocation: origin,
        endLocation: destination,
      },
      {
        id: 'braga-step-1',
        instruction: `Tiba di tujuan: ${destinationName}`,
        distanceMeters: 0,
        distanceText: '0 m',
        durationSeconds: 0,
        icon: 'flag-checkered',
        startLocation: destination,
        endLocation: destination,
      },
    ],
  };
}

// Decode Google Encoded Polyline menjadi array { latitude, longitude }
function decodePolyline(encoded) {
  const points = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatDistance(meters) {
  const m = Math.max(0, Math.round(meters));
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${m} m`;
}

export function formatDuration(seconds) {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${h} jam ${rem} mnt` : `${h} jam`;
  }
  return `${mins} mnt`;
}

function buildIndonesianStepText(step, destinationName) {
  const type = step.maneuver?.type || '';
  const modifier = step.maneuver?.modifier || '';
  const street = step.name ? ` di ${step.name}` : '';
  const distText = formatDistance(step.distance || 0);

  if (type === 'arrive') {
    return `Tiba di tujuan: ${destinationName}`;
  }

  const turnMap = {
    left: 'Belok kiri',
    'sharp left': 'Belok tajam ke kiri',
    'slight left': 'Belok serong kiri',
    right: 'Belok kanan',
    'sharp right': 'Belok tajam ke kanan',
    'slight right': 'Belok serong kanan',
    uturn: 'Putar balik',
    straight: 'Jalan lurus',
  };

  if (type === 'depart') {
    return `Mulai berjalan lurus${street} sejauh ${distText}`;
  }

  const action = turnMap[modifier] || 'Jalan lurus';
  return `${action}${street} sejauh ${distText}`;
}

function mapManeuverIcon(instructionText) {
  const text = instructionText.toLowerCase();
  if (text.includes('tiba')) return 'flag-checkered';
  if (text.includes('serong kiri')) return 'arrow-top-left';
  if (text.includes('serong kanan')) return 'arrow-top-right';
  if (text.includes('kiri')) return 'arrow-left-top';
  if (text.includes('kanan')) return 'arrow-right-top';
  if (text.includes('putar')) return 'arrow-u-left-top';
  return 'arrow-up';
}

// 1. Opsi Utama: Google Directions API (mode=walking)
async function fetchFromGoogleDirections(origin, destination, destinationName) {
  if (!GOOGLE_MAPS_API_KEY) throw new Error('No Google API key');

  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    `&mode=walking&language=id&key=${GOOGLE_MAPS_API_KEY}`;

  const json = await fetchWithTimeout(url);

  if (json.status !== 'OK' || !json.routes?.length) {
    throw new Error(json.status || 'Google Directions unavailable');
  }

  const route = json.routes[0];
  const leg = route.legs[0];
  const coordinates = decodePolyline(route.overview_polyline.points);

  const steps = (leg.steps || []).map((s, idx) => {
    const cleanText = stripHtml(s.html_instructions);
    const distMeters = s.distance?.value || 0;
    const isLast = idx === leg.steps.length - 1;
    const instruction = isLast
      ? `${cleanText} (${formatDistance(distMeters)}) menuju ${destinationName}`
      : `${cleanText} sejauh ${formatDistance(distMeters)}`;

    return {
      id: `step-${idx}`,
      instruction,
      distanceMeters: distMeters,
      distanceText: formatDistance(distMeters),
      durationSeconds: s.duration?.value || 0,
      icon: mapManeuverIcon(instruction),
      startLocation: {
        latitude: s.start_location.lat,
        longitude: s.start_location.lng,
      },
      endLocation: {
        latitude: s.end_location.lat,
        longitude: s.end_location.lng,
      },
    };
  });

  const totalMeters = leg.distance?.value || 0;
  const totalSeconds = leg.duration?.value || Math.round(totalMeters / 1.25);

  return {
    coordinates,
    distanceMeters: totalMeters,
    distanceText: formatDistance(totalMeters),
    durationSeconds: totalSeconds,
    durationText: formatDuration(totalSeconds),
    instruction: steps[0]?.instruction || `Jalan lurus menuju ${destinationName}`,
    steps,
  };
}

// 2. Opsi Pedestrian OSM Asli (routed-foot: mengabaikan aturan satu arah kendaraan)
async function fetchFromOsmPedestrian(origin, destination, destinationName) {
  const url =
    `https://routing.openstreetmap.de/routed-foot/route/v1/foot/` +
    `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}` +
    `?overview=full&geometries=geojson&steps=true`;

  const json = await fetchWithTimeout(url);

  if (json.code !== 'Ok' || !json.routes?.length) {
    throw new Error('OSM foot route unavailable');
  }

  const route = json.routes[0];
  const coordinates = route.geometry.coordinates.map(([lng, lat]) => ({
    latitude: lat,
    longitude: lng,
  }));

  const leg = route.legs?.[0];
  const steps = (leg?.steps || []).map((s, idx) => {
    const instruction = buildIndonesianStepText(s, destinationName);
    const distMeters = Math.round(s.distance || 0);
    const [startLng, startLat] = s.maneuver?.location || [
      origin.longitude,
      origin.latitude,
    ];
    const stepCoords = s.geometry?.coordinates || [];
    const [endLng, endLat] =
      stepCoords.length > 0
        ? stepCoords[stepCoords.length - 1]
        : [destination.longitude, destination.latitude];

    return {
      id: `osm-foot-${idx}`,
      instruction,
      distanceMeters: distMeters,
      distanceText: formatDistance(distMeters),
      durationSeconds: Math.round(s.duration || distMeters / 1.25),
      icon: mapManeuverIcon(instruction),
      startLocation: { latitude: startLat, longitude: startLng },
      endLocation: { latitude: endLat, longitude: endLng },
    };
  });

  const totalMeters = Math.round(route.distance || 0);
  const totalSeconds = Math.max(15, Math.round(totalMeters / 1.25));

  return {
    coordinates,
    distanceMeters: totalMeters,
    distanceText: formatDistance(totalMeters),
    durationSeconds: totalSeconds,
    durationText: formatDuration(totalSeconds),
    instruction: steps[0]?.instruction || `Jalan lurus menuju ${destinationName}`,
    steps,
  };
}

export async function fetchWalkingRoute(
  origin,
  destination,
  destinationName = 'Tujuan'
) {
  const directMeters = haversineMeters(origin, destination);
  const bothInBraga =
    isInsideBragaCorridor(origin) && isInsideBragaCorridor(destination);

  let routeResult = null;

  try {
    routeResult = await fetchFromGoogleDirections(
      origin,
      destination,
      destinationName
    );
  } catch (_) {
    try {
      routeResult = await fetchFromOsmPedestrian(
        origin,
        destination,
        destinationName
      );
    } catch (__) {
      routeResult = null;
    }
  }

  // Jika rute gagal diambil ATAU rute memutar tidak wajar (> 1.8x jarak lurus) di dalam koridor Jl. Braga,
  // gunakan jalur trotoar langsung sepanjang koridor Jl. Braga
  if (bothInBraga && (!routeResult || routeResult.distanceMeters > Math.max(120, directMeters * 1.8))) {
    return buildBragaCorridorWalk(origin, destination, destinationName);
  }

  if (!routeResult) throw new Error('Rute belum tersedia. Periksa koneksi atau konfigurasi layanan peta.');

  return routeResult;
}
