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
import Svg, { Path } from 'react-native-svg';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import { WireframeImageBox, PoiDetailFooter } from '../components/PoiCardComponents';
import SearchPoiOverlay from '../components/SearchPoiOverlay';

const API_BASE_URL = 'http://10.46.161.81:5000';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 275;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.78;

const FALLBACK_ITEMS = [
  { id: 'p1', name: 'Braga Citywalk', distance: '12km', rating: '5.0' },
  { id: 'p2', name: 'Braga Citywalk', distance: '12km', rating: '5.0' },
  { id: 'p3', name: 'Braga Citywalk', distance: '12km', rating: '5.0' },
];

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
  onOpenDetail,
  onOpenDirections,
  onSimulateGeofence,
}) {
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
  const [sheetPois, setSheetPois] = useState(FALLBACK_ITEMS);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/categories`)
      .then((res) => res.json())
      .then((json) => {
        if (json.categories && json.categories.length > 0) {
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
          setSheetPois(
            json.data.map((item) => ({
              ...item,
              rating: String(item.rating ?? '5.0'),
              distance: item.distance || '-',
            }))
          );
        }
      })
      .catch(() => {});
  }, [selectedCategory, selectedTime, selectedEnv, selectedRating]);

  const sheetHeight = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;
  const currentHeightRef = useRef(COLLAPSED_HEIGHT);

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

  return (
    <View style={styles.root}>
      {/* Map Canvas */}
      <View style={styles.mapCanvas}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Path
            d="M -20 120 Q 140 160 220 40 T 420 140"
            stroke={COLORS.white}
            strokeWidth="12"
            fill="none"
          />
          <Path
            d="M 80 -10 L 160 280 L 110 520"
            stroke={COLORS.white}
            strokeWidth="10"
            fill="none"
          />
          <Path
            d="M 280 -10 Q 250 220 330 480"
            stroke={COLORS.white}
            strokeWidth="14"
            fill="none"
          />
          <Path
            d="M -10 310 Q 190 290 410 350"
            stroke={COLORS.white}
            strokeWidth="8"
            fill="none"
          />
        </Svg>

        {/* Top Floating Icons: Lup Pencarian & Bookmark */}
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

        {/* Map Marker 1 */}
        <View style={[styles.mapMarkerGroup, { top: '23%', left: '28%' }]}>
          <View style={styles.teardropPin}>
            <View style={styles.pinInnerHole} />
          </View>
          <Text style={styles.mapLabelText}>Braga Citywalk</Text>
        </View>

        {/* User Location Puck */}
        <View style={[styles.userPuckWrapper, { top: '46%', left: '49%' }]}>
          <View style={styles.userPuckDot} />
        </View>

        {/* Map Marker 2 */}
        <View style={[styles.mapMarkerGroup, { top: '53%', left: '48%' }]}>
          <View style={styles.teardropPin}>
            <View style={styles.pinInnerHole} />
          </View>
          <Text style={styles.mapLabelText}>Sweet Cantina</Text>
        </View>
      </View>

      {/* Draggable Bottom Sheet (Nearby You & Contextual Recommendation) */}
      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
        {/* Floating Recenter Button above sheet */}
        <TouchableOpacity activeOpacity={0.85} style={styles.recenterBtn}>
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

          {/* 4 Dropdown Filter Pills Row (tampil saat sheet digeser ke atas) */}
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
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardsScrollContent}
        >
          {sheetPois.map((poi, idx) => (
            <View
              key={`${activeSegment}-${poi.id}`}
              style={[
                styles.poiCardSection,
                idx !== sheetPois.length - 1 && styles.poiCardDivider,
              ]}
            >
              <ScrollView
                horizontal
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
                  distance={poi.distance}
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
        onClose={() => setIsSearchOpen(false)}
        onSelectPoi={(poi) => onOpenDetail?.(poi)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E5DAF7',
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#DDD0F4',
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
  mapMarkerGroup: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teardropPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B65D4',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  pinInnerHole: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.lavenderTint,
  },
  mapLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  userPuckWrapper: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(91, 43, 191, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPuckDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.lavenderTint,
    borderWidth: 2.5,
    borderColor: COLORS.primaryPurple,
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
