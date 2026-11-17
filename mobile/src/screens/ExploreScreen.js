import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, {
  Marker,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import { PoiDetailFooter } from '../components/PoiCardComponents';
import PoiImageGallery from '../components/PoiImageGallery';
import SearchPoiOverlay from '../components/SearchPoiOverlay';
import {
  BRAGA_REGION,
  BRAGA_POIS,
  BRAGA_ZONE_POLYGON,
  BRAGA_GRAY_MAP_STYLE,
} from '../constants/bragaMapData';
import { useAppActive, useForegroundLocation } from '../hooks/useForegroundLocation';
import { distanceMeters } from '../location/distance';

// Sesuaikan IP komputer & PORT dengan yang ada di backend/.env
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 275;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.78;

const TIME_OPTIONS = [
  { label: 'All Time', value: 'Semua' },
  { label: 'Morning (Pagi)', value: 'pagi' },
  { label: 'Afternoon (Siang)', value: 'siang' },
  { label: 'Night (Malam)', value: 'malam' },
];

const ENV_OPTIONS = [
  { label: 'All Area', value: 'Semua' },
  { label: 'Indoor', value: 'indoor' },
  { label: 'Outdoor', value: 'outdoor' },
  { label: 'Both', value: 'both' },
];

const RATING_OPTIONS = [
  { label: 'All Rating', value: '0' },
  { label: '1+ ★', value: '1' },
  { label: '2+ ★', value: '2' },
  { label: '3+ ★', value: '3' },
  { label: '4+ ★', value: '4' },
];

// Mengecek apakah titik GPS pengguna berada di dalam poligon ungu Jl. Braga (Ray-Casting)
function isPointInPolygon(point, polygon) {
  if (!point || !Array.isArray(polygon) || polygon.length < 3) return false;
  const { latitude: x, longitude: y } = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].latitude;
    const yi = polygon[i].longitude;
    const xj = polygon[j].latitude;
    const yj = polygon[j].longitude;

    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

function formatDistanceText(meters) {
  if (!Number.isFinite(meters)) return 'Jarak belum tersedia';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function normalizePoiItem(item, userCoord = null, existingPois = []) {
  const localMeta = BRAGA_POIS.find((b) => String(b.id) === String(item.id));
  const parentPoi = existingPois.find((p) => String(p.id) === String(item.id));

  const lat = Number(
    item.coordinate?.latitude ??
      item.latitude ??
      item.lat ??
      parentPoi?.latitude ??
      localMeta?.latitude
  );
  const lng = Number(
    item.coordinate?.longitude ??
      item.longitude ??
      item.lng ??
      parentPoi?.longitude ??
      localMeta?.longitude
  );

  const validLat = Number.isFinite(lat) ? lat : BRAGA_REGION.latitude;
  const validLng = Number.isFinite(lng) ? lng : BRAGA_REGION.longitude;

  let computedMeters = Number.isFinite(item.distanceMeters)
    ? item.distanceMeters
    : Number.isFinite(parentPoi?.distanceMeters)
    ? parentPoi.distanceMeters
    : null;

  if (!Number.isFinite(computedMeters) && userCoord) {
    const d = distanceMeters(userCoord, { latitude: validLat, longitude: validLng });
    if (Number.isFinite(d)) {
      computedMeters = d;
    }
  }

  const distanceLabel = Number.isFinite(computedMeters)
    ? formatDistanceText(computedMeters)
    : typeof item.distance === 'string' && item.distance !== 'Jarak belum tersedia'
    ? item.distance
    : typeof parentPoi?.distance === 'string' &&
      parentPoi.distance !== 'Jarak belum tersedia'
    ? parentPoi.distance
    : 'Jarak belum tersedia';

  return {
    ...localMeta,
    ...parentPoi,
    ...item,
    latitude: validLat,
    longitude: validLng,
    coordinate: {
      latitude: validLat,
      longitude: validLng,
    },
    rating: item.rating == null ? 'Belum tersedia' : String(item.rating),
    distanceMeters: computedMeters,
    distance: distanceLabel,
  };
}

export default function ExploreScreen({
  windowShrink = 0,
  pois = [],
  bookmarkedPois = [],
  onOpenDetail,
  onOpenDirections,
  onOpenBookmarks,
  onToggleSave,
  onAddToItinerary,
  onSimulateGeofence,
}) {
  const insets = useSafeAreaInsets();
  const topInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? StatusBar.currentHeight || 28
      : 44;

  const mapRef = useRef(null);
  const [activeSegment, setActiveSegment] = useState('nearby'); // 'nearby' | 'recommendation'
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // State koordinat GPS dari MapView / expo-location sebagai cadangan cepat
  const [mapUserCoord, setMapUserCoord] = useState(null);

  // Baca GPS perangkat melalui hook foreground
  const isAppActive = useAppActive();
  const locationState = useForegroundLocation(isAppActive);
  const hookCoords =
    locationState?.sample ||
    locationState?.location?.coords ||
    locationState?.coords ||
    locationState?.location ||
    locationState;

  // Ambil posisi terakhir / posisi cepat saat layar dibuka agar tidak menunggu lama
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted' || !isMounted) return;

        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown?.coords && isMounted) {
          setMapUserCoord({
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          });
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (current?.coords && isMounted) {
          setMapUserCoord({
            latitude: current.coords.latitude,
            longitude: current.coords.longitude,
          });
        }
      } catch (_) {}
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Gabungkan sumber koordinat terbaik (hook -> MapView -> expo-location)
  const resolvedUserCoord = useMemo(() => {
    const hLat = Number(hookCoords?.latitude);
    const hLng = Number(hookCoords?.longitude);
    if (Number.isFinite(hLat) && Number.isFinite(hLng)) {
      return { latitude: hLat, longitude: hLng };
    }
    if (
      mapUserCoord &&
      Number.isFinite(mapUserCoord.latitude) &&
      Number.isFinite(mapUserCoord.longitude)
    ) {
      return mapUserCoord;
    }
    return null;
  }, [hookCoords?.latitude, hookCoords?.longitude, mapUserCoord]);

  const isOutsideBragaZone = useMemo(() => {
    if (!resolvedUserCoord) return false;
    return !isPointInPolygon(resolvedUserCoord, BRAGA_ZONE_POLYGON);
  }, [resolvedUserCoord]);

  // State 4 Dropdown Filter pada Bottom Sheet
  const [categoryOptions, setCategoryOptions] = useState([
    { label: 'Category', value: 'Semua' },
  ]);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedTime, setSelectedTime] = useState('Semua');
  const [selectedEnv, setSelectedEnv] = useState('Semua');
  const [selectedRating, setSelectedRating] = useState('0');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [rawSheetPois, setRawSheetPois] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/categories`)
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json.categories) && json.categories.length > 0) {
          setCategoryOptions(
            json.categories.map((cat) => ({
              label: cat === 'Semua' ? 'Category' : cat,
              value: cat,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({
      q: '',
      category: selectedCategory,
      time_category: selectedTime,
      environment: selectedEnv,
      min_rating: selectedRating,
    });

    fetch(`${API_BASE_URL}/api/pois/search?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (Array.isArray(json.data)) {
          setRawSheetPois(json.data);
        }
      })
      .catch(() => {});
  }, [selectedCategory, selectedTime, selectedEnv, selectedRating]);

  const [sheetHeight] = useState(() => new Animated.Value(COLLAPSED_HEIGHT));
  const [currentHeight, setCurrentHeight] = useState(COLLAPSED_HEIGHT);

  const handleRecenterBraga = () => {
    mapRef.current?.animateToRegion(BRAGA_REGION, 600);
  };

  const handlePressAddItinerary = (poi) => {
    if (onAddToItinerary) {
      onAddToItinerary(poi);
    } else {
      Alert.alert(
        'Ditambahkan ke Itinerary',
        `${poi.name} berhasil ditambahkan ke rencana perjalananmu.`
      );
    }
  };

  const animateSheet = (toExpanded) => {
    const target = toExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
    setIsExpanded(toExpanded);
    setCurrentHeight(target);
    Animated.spring(sheetHeight, {
      toValue: target,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
        onPanResponderMove: (_, gesture) => {
          const nextHeight = currentHeight - gesture.dy;
          if (nextHeight >= COLLAPSED_HEIGHT - 20 && nextHeight <= EXPANDED_HEIGHT + 20) {
            sheetHeight.setValue(nextHeight);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy < -40) {
            animateSheet(true);
          } else if (gesture.dy > 40) {
            animateSheet(false);
          } else {
            animateSheet(currentHeight > (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2);
          }
        },
      }),
    [currentHeight, sheetHeight]
  );

  const getDropdownConfig = () => {
    switch (openDropdown) {
      case 'category':
        return {
          title: 'Select Category',
          options: categoryOptions,
          value: selectedCategory,
          onSelect: setSelectedCategory,
        };
      case 'time':
        return {
          title: 'Select Time',
          options: TIME_OPTIONS,
          value: selectedTime,
          onSelect: setSelectedTime,
        };
      case 'env':
        return {
          title: 'Select Environment',
          options: ENV_OPTIONS,
          value: selectedEnv,
          onSelect: setSelectedEnv,
        };
      case 'rating':
        return {
          title: 'Minimum Rating',
          options: RATING_OPTIONS,
          value: selectedRating,
          onSelect: setSelectedRating,
        };
      default:
        return null;
    }
  };

  const getPillLabel = (options, value, fallback) => {
    if (value === 'Semua' || value === '0') return fallback;
    return options.find((o) => o.value === value)?.label || fallback;
  };

  const renderFilterPill = (key, label, isActive) => (
    <TouchableOpacity
      key={key}
      activeOpacity={0.85}
      onPress={() => setOpenDropdown(key)}
      style={[styles.filterPill, isActive && styles.filterPillActive]}
    >
      <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
        {label}
      </Text>
      <View
        style={[
          styles.filterChevronCircle,
          isActive && styles.filterChevronCircleActive,
        ]}
      >
        <Ionicons
          name="chevron-down"
          size={12}
          color={isActive ? COLORS.darkPurple : COLORS.white}
        />
      </View>
    </TouchableOpacity>
  );

  const activeDropdown = getDropdownConfig();

  const hasActiveFilter =
    selectedCategory !== 'Semua' ||
    selectedTime !== 'Semua' ||
    selectedEnv !== 'Semua' ||
    selectedRating !== '0';

  const displayPois = useMemo(() => {
    const existingList = Array.isArray(pois) ? pois : [];
    const sourceList = hasActiveFilter
      ? rawSheetPois
      : rawSheetPois.length > 0
      ? rawSheetPois
      : existingList;

    const normalized = sourceList.map((item) =>
      normalizePoiItem(item, resolvedUserCoord, existingList)
    );

    if (activeSegment === 'nearby') {
      return [...normalized].sort((a, b) => {
        const da = Number.isFinite(a.distanceMeters) ? a.distanceMeters : Infinity;
        const db = Number.isFinite(b.distanceMeters) ? b.distanceMeters : Infinity;
        return da - db;
      });
    }

    return normalized;
  }, [activeSegment, hasActiveFilter, pois, rawSheetPois, resolvedUserCoord]);

  return (
    <View style={styles.root}>
      {/* Google Maps / Apple Maps Canvas */}
      <View style={styles.mapCanvas}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={StyleSheet.absoluteFill}
          initialRegion={BRAGA_REGION}
          customMapStyle={Platform.OS === 'android' ? BRAGA_GRAY_MAP_STYLE : undefined}
          userInterfaceStyle="light"
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          onUserLocationChange={(event) => {
            const coord = event?.nativeEvent?.coordinate;
            if (
              coord &&
              Number.isFinite(coord.latitude) &&
              Number.isFinite(coord.longitude)
            ) {
              setMapUserCoord({
                latitude: coord.latitude,
                longitude: coord.longitude,
              });
            }
          }}
        >
          {/* Highlight Blok Ungu Transparan Khusus Koridor Jl. Braga */}
          <Polygon
            coordinates={BRAGA_ZONE_POLYGON}
            fillColor="rgba(126, 87, 194, 0.24)"
            strokeWidth={0}
          />

          {/* Garis Batas Putus-Putus Mengelilingi Zona Jl. Braga */}
          <Polyline
            coordinates={[...BRAGA_ZONE_POLYGON, BRAGA_ZONE_POLYGON[0]]}
            strokeColor={COLORS.primaryPurple}
            strokeWidth={3}
            lineDashPattern={[10, 8]}
          />

          {/* Marker POI di Jl. Braga (ditekan langsung membuka Detail POI) */}
          {displayPois.map((poi) => {
            const lat = Number(
              poi.coordinate?.latitude ?? poi.latitude ?? poi.lat
            );
            const lng = Number(
              poi.coordinate?.longitude ?? poi.longitude ?? poi.lng
            );

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

            return (
              <Marker
                key={String(poi.id)}
                coordinate={{ latitude: lat, longitude: lng }}
                anchor={{ x: 0.5, y: 0.32 }}
                centerOffset={{ x: 0, y: 12 }}
                onPress={() => onOpenDetail?.(poi)}
              >
                <View style={styles.customMarkerCol}>
                  <View style={styles.teardropPin}>
                    <View style={styles.pinInnerHole} />
                  </View>
                  <View style={styles.markerLabelBadge}>
                    <Text style={styles.mapLabelText} numberOfLines={1}>
                      {poi.name}
                    </Text>
                  </View>
                </View>
              </Marker>
            );
          })}
        </MapView>

        {/* Top Floating Bar: Bubble Info Luar Zona + Tombol Search & Bookmark */}
        <View
          style={[styles.topOverlay, { paddingTop: topInset + 8 }]}
          pointerEvents="box-none"
        >
          <View style={styles.topActionRow} pointerEvents="box-none">
            {isOutsideBragaZone && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleRecenterBraga}
                style={styles.outsideZoneBubble}
              >
                <Ionicons
                  name="information-circle"
                  size={18}
                  color={COLORS.darkPurple}
                />
                <Text style={styles.outsideZoneText} numberOfLines={2}>
                  Kamu berada di luar area Jl. Braga
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.rightButtonsGroup}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setIsSearchOpen(true)}
                style={styles.circleActionBtn}
              >
                <Ionicons name="search" size={20} color={COLORS.darkPurple} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onOpenBookmarks}
                onLongPress={onSimulateGeofence}
                style={styles.circleActionBtn}
              >
                <Ionicons name="bookmark" size={20} color={COLORS.darkPurple} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Draggable Bottom Sheet (Nearby You & Contextual Recommendation) */}
      <Animated.View
        style={[
          styles.bottomSheet,
          { height: sheetHeight, bottom: -windowShrink },
        ]}
      >
        {/* Floating Recenter Button above sheet */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleRecenterBraga}
          style={styles.recenterBtn}
        >
          <MaterialIcons name="my-location" size={24} color={COLORS.darkPurple} />
        </TouchableOpacity>

        {/* Drag Handle Area */}
        <View {...panResponder.panHandlers} style={styles.dragHeaderArea}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => animateSheet(!isExpanded)}
            style={styles.dragHandleTouch}
          >
            <View style={styles.dragHandle} />
          </TouchableOpacity>

          {/* Segmented Toggle: Nearby You / Recommendation */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setActiveSegment('nearby')}
              style={[
                styles.segmentBtn,
                activeSegment === 'nearby' && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === 'nearby' && styles.segmentTextActive,
                ]}
              >
                Nearby You
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setActiveSegment('recommendation')}
              style={[
                styles.segmentBtn,
                activeSegment === 'recommendation' && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === 'recommendation' && styles.segmentTextActive,
                ]}
              >
                Recommendation
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filter Pills Row (tampil saat sheet digeser ke atas) */}
          {isExpanded && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <TouchableOpacity
                style={styles.filterIconBtn}
                onPress={() => {
                  setSelectedCategory('Semua');
                  setSelectedTime('Semua');
                  setSelectedEnv('Semua');
                  setSelectedRating('0');
                }}
              >
                <Ionicons name="options" size={20} color={COLORS.primaryPurple} />
              </TouchableOpacity>

              {renderFilterPill(
                'category',
                getPillLabel(categoryOptions, selectedCategory, 'Category'),
                selectedCategory !== 'Semua'
              )}
              {renderFilterPill(
                'time',
                getPillLabel(TIME_OPTIONS, selectedTime, 'Time'),
                selectedTime !== 'Semua'
              )}
              {renderFilterPill(
                'env',
                getPillLabel(ENV_OPTIONS, selectedEnv, 'Environment'),
                selectedEnv !== 'Semua'
              )}
              {renderFilterPill(
                'rating',
                getPillLabel(RATING_OPTIONS, selectedRating, 'Rating'),
                selectedRating !== '0'
              )}
            </ScrollView>
          )}
        </View>

        {/* Scrollable POI Cards List */}
        <ScrollView
          style={{ flex: 1 }}
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardsScrollContent}
        >
          {displayPois.map((poi, idx) => {
            const isPoiSaved = bookmarkedPois.some(
              (item) =>
                (poi.id && String(item.id) === String(poi.id)) ||
                item.name?.toLowerCase() === poi.name?.toLowerCase()
            );

            return (
              <View
                key={`${activeSegment}-${poi.id}`}
                style={[
                  styles.poiCardSection,
                  idx !== displayPois.length - 1 && styles.poiCardDivider,
                ]}
              >
                <ScrollView
                  horizontal
                  nestedScrollEnabled={true}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselRow}
                >
                  <PoiImageGallery poi={poi} compact />
                </ScrollView>

                <View style={{ paddingHorizontal: 20 }}>
                  <PoiDetailFooter
                    name={poi.name}
                    distance={poi.distance}
                    rating={poi.rating}
                    isSaved={isPoiSaved}
                    onCheckDetail={() => onOpenDetail?.(poi)}
                    onDirections={() => onOpenDirections?.(poi)}
                    onSave={() => onToggleSave?.(poi)}
                    onAddToItinerary={() => handlePressAddItinerary(poi)}
                  />
                </View>
              </View>
            );
          })}
        </ScrollView>
      </Animated.View>

      {/* Dropdown Picker Overlay untuk Filter Bottom Sheet */}
      {activeDropdown && (
        <TouchableOpacity
          style={styles.dropdownBackdrop}
          activeOpacity={1}
          onPress={() => setOpenDropdown(null)}
        >
          <View style={styles.dropdownSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.dropdownSheetHeader}>
              <Text style={styles.dropdownSheetTitle}>{activeDropdown.title}</Text>
              <TouchableOpacity onPress={() => setOpenDropdown(null)}>
                <Ionicons name="close" size={22} color={COLORS.darkPurple} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 280 }}>
              {activeDropdown.options.map((opt) => {
                const isSelected = opt.value === activeDropdown.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.dropdownOptionRow,
                      isSelected && styles.dropdownOptionRowSelected,
                    ]}
                    onPress={() => {
                      activeDropdown.onSelect(opt.value);
                      setOpenDropdown(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        isSelected && styles.dropdownOptionTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={COLORS.darkPurple}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      )}

      {/* Search POI Slider */}
      <SearchPoiOverlay
        visible={isSearchOpen}
        windowShrink={windowShrink}
        onClose={() => setIsSearchOpen(false)}
        onSelectPoi={(poi) => onOpenDetail?.(poi)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#EAEAEA',
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#EAEAEA',
    position: 'relative',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    gap: 10,
  },
  outsideZoneBubble: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
  },
  outsideZoneText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.darkPurple,
  },
  rightButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circleActionBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  customMarkerCol: {
    alignItems: 'center',
  },
  teardropPin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#8B65D4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    elevation: 3,
  },
  pinInnerHole: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.lavenderTint,
  },
  markerLabelBadge: {
    marginTop: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    maxWidth: 140,
    elevation: 2,
  },
  mapLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryPurple,
    textAlign: 'center',
  },
  recenterBtn: {
    position: 'absolute',
    right: 18,
    top: -62,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: '#9E7CE0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    borderTopWidth: 2.5,
    borderColor: COLORS.primaryPurple,
    paddingTop: 6,
  },
  dragHeaderArea: {
    paddingBottom: 6,
  },
  dragHandleTouch: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  dragHandle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.lavenderTint,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 36,
    borderWidth: 1.8,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    marginBottom: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.darkPurple,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  segmentTextActive: {
    color: COLORS.white,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 6,
    gap: 8,
  },
  filterIconBtn: {
    padding: 4,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.mediumPurple,
    borderRadius: RADIUS.pill,
    paddingVertical: 5,
    paddingLeft: 12,
    paddingRight: 6,
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: COLORS.darkPurple,
    borderColor: COLORS.darkPurple,
  },
  filterPillText: {
    fontSize: 12,
    color: COLORS.primaryPurple,
    fontWeight: '500',
  },
  filterPillTextActive: {
    color: COLORS.white,
  },
  filterChevronCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.darkPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChevronCircleActive: {
    backgroundColor: COLORS.white,
  },
  cardsScrollContent: {
    paddingBottom: 24,
  },
  poiCardSection: {
    paddingVertical: 10,
  },
  poiCardDivider: {
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.borderSubtle,
  },
  carouselRow: {
    paddingHorizontal: 20,
    gap: 10,
  },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(49, 20, 101, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 50,
  },
  dropdownSheet: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    padding: 16,
  },
  dropdownSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    marginBottom: 6,
  },
  dropdownSheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
  },
  dropdownOptionRowSelected: {
    backgroundColor: COLORS.lavenderTint,
  },
  dropdownOptionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  dropdownOptionTextSelected: {
    fontWeight: '700',
    color: COLORS.darkPurple,
  },
});