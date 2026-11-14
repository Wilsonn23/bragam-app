// Titik tengah koridor Jl. Braga, Bandung
export const BRAGA_REGION = {
  latitude: -6.9175,
  longitude: 107.6093,
  latitudeDelta: 0.0055,
  longitudeDelta: 0.0055,
};

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

// Tema visual peta ungu-lavender menyesuaikan prototipe BRAGAm
export const BRAGA_PURPLE_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#E6DCF7' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4B229E' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }] },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'road.arterial',
    elementType: 'geometry',
    stylers: [{ color: '#FFFFFF' }],
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }], // Sembunyikan ikon bawaan Google agar marker BRAGAm menonjol
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#CBB8F0' }],
  },
];