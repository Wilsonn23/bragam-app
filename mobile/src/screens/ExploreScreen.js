import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import MapView, {
  Marker,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import { WireframeImageBox, PoiDetailFooter } from '../components/PoiCardComponents';
import SearchPoiOverlay from '../components/SearchPoiOverlay';
import {
  BRAGA_REGION,
  BRAGA_POIS,
  BRAGA_ZONE_POLYGON,
  BRAGA_GRAY_MAP_STYLE,
} from '../constants/bragaMapData';

// Sesuaikan IP komputer & PORT dengan yang ada di backend/.env
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.46.161.81:5000';

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

export default function ExploreScreen({
  windowShrink = 0,
  pois = BRAGA_POIS,
  onOpenDetail,
  onOpenDirections,
  onSimulateGeofence,
}) {
  const mapRef = useRef(null);
  const [selectedMarker, setSelectedMarker] = useState(BRAGA_POIS[0]);
  const [activeSegment, setActiveSegment] = useState('nearby'); // 'nearby' | 'recommendation'
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // State 4 Dropdown Filter pada Bottom Sheet
  const [categoryOptions, setCategoryOptions] = useState([
    { label: 'Category', value: 'Semua' },
  ]);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedTime, setSelectedTime] = useState('Semua');
  const [selectedEnv, setSelectedEnv] = useState('Semua');
  const [selectedRating, setSelectedRating] = useState('0');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [sheetPois, setSheetPois] = useState(BRAGA_POIS);

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
        if (Array.isArray(json.data) && json.data.length > 0) {
          setSheetPois(
            json.data.map((item) => ({
              ...item,
              coordinate:
                item.coordinate ||
                (Number.isFinite(item.latitude) && Number.isFinite(item.longitude)
                  ? { latitude: item.latitude, longitude: item.longitude }
                  : {
                      latitude: BRAGA_REGION.latitude,
                      longitude: BRAGA_REGION.longitude,
                    }),
              rating: String(item.rating ?? '5.0'),
              distance: item.distance || '12km',
            }))
          );
        } else if (Array.isArray(json.data)) {
          setSheetPois([]);
        }
      })
      .catch(() => {});
  }, [selectedCategory, selectedTime, selectedEnv, selectedRating]);

  const sheetHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const currentHeightRef = useRef(COLLAPSED_HEIGHT);

  const handleRecenterBraga = () => {
    mapRef.current?.animateToRegion(BRAGA_REGION, 600);
  };

  const animateSheet = (toExpanded) => {
    const target = toExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
    setIsExpanded(toExpanded);
    currentHeightRef.current = target;
    Animated.spring(sheetHeight, {
      toValue: target,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
      onPanResponderMove: (_, gesture) => {
        const nextHeight = currentHeightRef.current - gesture.dy;
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
          animateSheet(currentHeightRef.current > (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2);
        }
      },
    })
  ).current;

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
      <View style={[styles.filterChevronCircle, isActive && styles.filterChevronCircleActive]}>
        <Ionicons
          name="chevron-down"
          size={12}
          color={isActive ? COLORS.darkPurple : COLORS.white}
        />
      </View>
    </TouchableOpacity>
  );

  const activeDropdown = getDropdownConfig();
  const mapMarkers = sheetPois.length > 0 ? sheetPois : BRAGA_POIS;

  return (
    <View style={styles.root}>
      {/* Google Maps Canvas */}
      <View style={styles.mapCanvas}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={BRAGA_REGION}
          customMapStyle={BRAGA_GRAY_MAP_STYLE}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
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

          {/* Marker POI di Jl. Braga */}
          {pois.map((poi) => (
            <Marker
              key={String(poi.id)}
              coordinate={{
              latitude: Number(poi.latitude),
              longitude: Number(poi.longitude),
              }}
              onPress={() => {
                setSelectedMarker(poi);
                mapRef.current?.animateToRegion(
                  {
                    latitude: Number(poi.latitude),
                    longitude: Number(poi.longitude),
                    latitudeDelta: 0.004,
                    longitudeDelta: 0.004,
                  },
                  400
                );
              }}
            >
              <View style={styles.customMarkerRow}>
                <View style={styles.teardropPin}>
                  <View style={styles.pinInnerHole} />
                </View>
                <View style={styles.markerLabelBadge}>
                  <Text style={styles.mapLabelText}>{poi.name}</Text>
                </View>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Top Floating Buttons: Tombol Pencarian & Bookmark */}
        <SafeAreaView style={styles.topOverlay}>
          <View style={styles.topActionRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsSearchOpen(true)}
              style={styles.circleActionBtn}
            >
              <Ionicons name="search" size={20} color={COLORS.darkPurple} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onLongPress={onSimulateGeofence}
              style={styles.circleActionBtn}
            >
              <Ionicons name="bookmark" size={20} color={COLORS.darkPurple} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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
          {pois.map((poi, idx) => (
            <View
              key={`${activeSegment}-${poi.id}`}
              style={[
                styles.poiCardSection,
                idx !== pois.length - 1 && styles.poiCardDivider,
              ]}
            >
              <ScrollView
                horizontal
                nestedScrollEnabled={true}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselRow}
              >
                <WireframeImageBox width={105} height={105} />
                <WireframeImageBox width={105} height={105} />
                <WireframeImageBox width={105} height={105} />
              </ScrollView>

              <View style={{ paddingHorizontal: 20 }}>
                <PoiDetailFooter
                  name={poi.name}
                  distance={poi.distance || `${poi.triggerRadiusMeters || 10}m`}
                  rating={poi.rating}
                  onCheckDetail={() => onOpenDetail?.(poi)}
                  onDirections={() => onOpenDirections?.(poi)}
                />
              </View>
            </View>
          ))}
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
    zIndex: 10,
  },
  topActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 48,
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
    elevation: 3,
  },
  customMarkerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teardropPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B65D4',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  pinInnerHole: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.lavenderTint,
  },
  markerLabelBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  mapLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryPurple,
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
    ...StyleSheet.absoluteFillObject,
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