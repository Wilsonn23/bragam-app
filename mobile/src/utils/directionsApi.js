const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

// Decoder standar Google Encoded Polyline menjadi array koordinat { latitude, longitude }
function decodePolyline(encoded) {
  let index = 0;
  const len = encoded.length;
  const points = [];
  let lat = 0;
  let lng = 0;

  while (index < len) {
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

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }
  return points;
}

export async function fetchWalkingRoute(originCoord, destCoord) {
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY belum diatur di .env');
  }

  const originStr = `${originCoord.latitude},${originCoord.longitude}`;
  const destStr = `${destCoord.latitude},${destCoord.longitude}`;
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&mode=walking&language=id&key=${GOOGLE_MAPS_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' || !data.routes.length) {
    throw new Error(data.error_message || 'Rute tidak ditemukan');
  }

  const route = data.routes[0];
  const leg = route.legs[0];
  const firstStepInstruction =
    leg.steps[0]?.html_instructions?.replace(/<[^>]*>?/gm, '') ||
    'Ikuti jalur Jl. Braga';

  return {
    coordinates: decodePolyline(route.overview_polyline.points),
    durationText: leg.duration.text,
    distanceText: leg.distance.text,
    instruction: firstStepInstruction,
  };
}