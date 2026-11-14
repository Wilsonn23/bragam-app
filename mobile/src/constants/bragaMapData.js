// Titik tengah koridor Jl. Braga, Bandung
export const BRAGA_REGION = {
  latitude: -6.9177,
  longitude: 107.6094,
  latitudeDelta: 0.0085,
  longitudeDelta: 0.0085,
};

// Koordinat poligon batas blok koridor Jl. Braga (Utara: Jl. Suniaraja -> Selatan: Jl. Asia Afrika)
export const BRAGA_ZONE_POLYGON = [
  { latitude: -6.9143, longitude: 107.6087 }, // Barat Laut (dekat Jl. Suniaraja / Banceuy)
  { latitude: -6.9143, longitude: 107.6103 }, // Timur Laut (dekat Jl. Lembong / Tamblong)
  { latitude: -6.9176, longitude: 107.6103 }, // Timur Tengah (blok Braga - Naripan)
  { latitude: -6.9212, longitude: 107.6101 }, // Tenggara (dekat Jl. Asia Afrika)
  { latitude: -6.9212, longitude: 107.6086 }, // Barat Daya (dekat Cikapundung / Asia Afrika)
  { latitude: -6.9176, longitude: 107.6086 }, // Barat Tengah (blok Braga - Cikapundung)
];

// Daftar koordinat nyata destinasi di sepanjang Jl. Braga
export const BRAGA_POIS = [
  {
    id: 'braga-citywalk',
    name: 'Braga Citywalk',
    address: 'Jl. Braga No.99–101, Braga, Kec. Sumur Bandung',
    distance: '150m',
    rating: '5.0',
    coordinate: { latitude: -6.9168, longitude: 107.6095 },
  },
  {
    id: 'sweet-cantina',
    name: 'Sweet Cantina',
    address: 'Jl. Braga No.89, Braga, Kec. Sumur Bandung',
    distance: '80m',
    rating: '5.0',
    coordinate: { latitude: -6.9173, longitude: 107.6094 },
  },
  {
    id: 'kopi-toko-djawa',
    name: 'Kopi Toko Djawa',
    address: 'Jl. Braga No.81, Braga, Kec. Sumur Bandung',
    distance: '120m',
    rating: '5.0',
    coordinate: { latitude: -6.9177, longitude: 107.6093 },
  },
  {
    id: 'museum-kaa',
    name: 'Museum Konferensi Asia Afrika',
    address: 'Jl. Asia Afrika No.65 (Ujung Selatan Jl. Braga)',
    distance: '350m',
    rating: '5.0',
    coordinate: { latitude: -6.9211, longitude: 107.6095 },
  },
];

// Tema peta dasar monokrom abu-abu untuk area di luar Jl. Braga
export const BRAGA_GRAY_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#EAEAEA' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7A7A7A' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F7F7F7' }] },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#D6D6D6' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#DFDFDF' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#D2D2D2' }],
  },
];