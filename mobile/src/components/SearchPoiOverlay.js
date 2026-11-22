import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  FlatList,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Animated,
  PanResponder,
  Dimensions,
  Keyboard,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from './theme';
import { WireframeImageBox } from './PoiCardComponents';
import { API_BASE_URL } from '../config/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 275;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.78;

const BUDGET_MIN_LIMIT = 0;
const BUDGET_MAX_LIMIT = 500000;
const BUDGET_STEP = 10000;

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

function formatRupiahNumber(val) {
  const num = Number(val) || 0;
  return num.toLocaleString('id-ID');
}

function parseMoneyToken(token) {
  if (token === null || token === undefined) return NaN;
  if (typeof token === 'number') return Number.isFinite(token) ? token : NaN;
  const str = String(token).trim().toLowerCase();
  if (!str) return NaN;
  if (str === 'free' || str === 'gratis') return 0;

  const kMatch = str.match(/(\d+(?:[.,]\d+)?)\s*(k|rb|ribu)/);
  if (kMatch) {
    return Math.round(parseFloat(kMatch[1].replace(',', '.')) * 1000);
  }

  const digits = str.replace(/[^\d]/g, '');
  return digits ? Number(digits) : NaN;
}

function getPoiPriceBounds(poi) {
  const directMin = parseMoneyToken(
    poi.price_min ?? poi.min_price ?? poi.priceMin ?? poi.minPrice
  );
  const directMax = parseMoneyToken(
    poi.price_max ?? poi.max_price ?? poi.priceMax ?? poi.maxPrice
  );

  if (Number.isFinite(directMin) || Number.isFinite(directMax)) {
    const min = Number.isFinite(directMin) ? Math.max(0, directMin) : 0;
    const max = Number.isFinite(directMax) ? Math.max(min, directMax) : min;
    return { min, max };
  }

  const textSource =
    poi.priceRange ??
    poi.price_range ??
    poi.budget ??
    poi.harga ??
    poi.estimasi_harga ??
    poi.cost ??
    poi.price;

  if (typeof textSource === 'number' && Number.isFinite(textSource)) {
    const val = Math.max(0, textSource);
    return { min: val, max: val };
  }

  if (typeof textSource === 'string' && textSource.trim()) {
    const lower = textSource.trim().toLowerCase();
    if (lower === 'free' || lower === 'gratis') {
      return { min: 0, max: 0 };
    }
    const parts = lower.split(/[-–—~]|s\/d|hingga|to/).map((p) => parseMoneyToken(p));
    const validNums = parts.filter((n) => Number.isFinite(n));
    if (validNums.length >= 2) {
      const min = Math.max(0, validNums[0]);
      const max = Math.max(min, validNums[1]);
      return { min, max };
    }
    if (validNums.length === 1) {
      const val = Math.max(0, validNums[0]);
      return { min: val, max: val };
    }
  }

  return { min: 0, max: 0 };
}

// Komponen Dual-Thumb Budget Range Slider (sama seperti di TripSettingScreen)
function BudgetRangeSlider({ minVal, maxVal, onChangeRange }) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const minValRef = useRef(minVal);
  const maxValRef = useRef(maxVal);
  const onChangeRangeRef = useRef(onChangeRange);
  const startXRef = useRef(0);

  minValRef.current = minVal;
  maxValRef.current = maxVal;
  onChangeRangeRef.current = onChangeRange;

  const valueToX = (val) => {
    if (trackWidth <= 0) return 0;
    const clamped = Math.max(BUDGET_MIN_LIMIT, Math.min(BUDGET_MAX_LIMIT, val));
    return (
      ((clamped - BUDGET_MIN_LIMIT) / (BUDGET_MAX_LIMIT - BUDGET_MIN_LIMIT)) *
      trackWidth
    );
  };

  const xToValue = (x) => {
    const w = trackWidthRef.current;
    if (w <= 0) return 0;
    const ratio = Math.max(0, Math.min(1, x / w));
    const raw = BUDGET_MIN_LIMIT + ratio * (BUDGET_MAX_LIMIT - BUDGET_MIN_LIMIT);
    return Math.round(raw / BUDGET_STEP) * BUDGET_STEP;
  };

  const minPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          Keyboard.dismiss();
          const w = trackWidthRef.current;
          startXRef.current =
            w > 0
              ? ((minValRef.current - BUDGET_MIN_LIMIT) /
                  (BUDGET_MAX_LIMIT - BUDGET_MIN_LIMIT)) *
                w
              : 0;
        },
        onPanResponderMove: (_, gesture) => {
          const nextVal = xToValue(startXRef.current + gesture.dx);
          const clamped = Math.min(nextVal, maxValRef.current);
          onChangeRangeRef.current?.(clamped, maxValRef.current);
        },
      }),
    []
  );

  const maxPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          Keyboard.dismiss();
          const w = trackWidthRef.current;
          startXRef.current =
            w > 0
              ? ((maxValRef.current - BUDGET_MIN_LIMIT) /
                  (BUDGET_MAX_LIMIT - BUDGET_MIN_LIMIT)) *
                w
              : 0;
        },
        onPanResponderMove: (_, gesture) => {
          const nextVal = xToValue(startXRef.current + gesture.dx);
          const clamped = Math.max(nextVal, minValRef.current);
          onChangeRangeRef.current?.(minValRef.current, clamped);
        },
      }),
    []
  );

  const leftPos = valueToX(minVal);
  const rightPos = valueToX(maxVal);

  return (
    <View
      style={styles.sliderContainer}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width - 28;
        if (w > 0) {
          trackWidthRef.current = w;
          setTrackWidth(w);
        }
      }}
    >
      <View style={styles.sliderTrackBg} />
      {trackWidth > 0 && (
        <>
          <View
            style={[
              styles.sliderTrackActive,
              {
                left: 14 + leftPos,
                width: Math.max(0, rightPos - leftPos),
              },
            ]}
          />
          <View
            {...minPanResponder.panHandlers}
            style={[styles.sliderThumb, { left: leftPos }]}
          >
            <View style={styles.sliderThumbDot} />
          </View>
          <View
            {...maxPanResponder.panHandlers}
            style={[styles.sliderThumb, { left: rightPos }]}
          >
            <View style={styles.sliderThumbDot} />
          </View>
        </>
      )}
    </View>
  );
}

export default function SearchPoiOverlay({
  visible,
  onClose,
  onSelectPoi,
}) {
  const insets = useSafeAreaInsets();
  const [categoryOptions, setCategoryOptions] = useState([
    { label: 'Category', value: 'Semua' },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedTime, setSelectedTime] = useState('Semua');
  const [selectedEnv, setSelectedEnv] = useState('Semua');
  const [selectedRating, setSelectedRating] = useState('0');

  // Filter Budget (Default 0 - 500.000)
  const [minBudget, setMinBudget] = useState(BUDGET_MIN_LIMIT);
  const [maxBudget, setMaxBudget] = useState(BUDGET_MAX_LIMIT);
  const [minBudgetInput, setMinBudgetInput] = useState(String(BUDGET_MIN_LIMIT));
  const [maxBudgetInput, setMaxBudgetInput] = useState(String(BUDGET_MAX_LIMIT));

  const [openDropdown, setOpenDropdown] = useState(null);

  const [rawPois, setRawPois] = useState([]);
  const [loadingPois, setLoadingPois] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const searchInputRef = useRef(null);

  const [isExpanded, setIsExpanded] = useState(true);
  const [sheetHeight] = useState(() => new Animated.Value(0));
  const [currentHeight, setCurrentHeight] = useState(EXPANDED_HEIGHT);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates?.height || 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  const handleClose = () => {
    Keyboard.dismiss();
    setOpenDropdown(null);
    Animated.timing(sheetHeight, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start(() => {
      setIsExpanded(true);
      setCurrentHeight(EXPANDED_HEIGHT);
      onClose?.();
    });
  };

  useEffect(() => {
    if (visible) {
      sheetHeight.setValue(COLLAPSED_HEIGHT);
      Animated.spring(sheetHeight, {
        toValue: EXPANDED_HEIGHT,
        useNativeDriver: false,
        bounciness: 4,
      }).start();

      const focusTimer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 120);

      return () => clearTimeout(focusTimer);
    }
  }, [visible]);

  const panResponder = useMemo(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
      onPanResponderGrant: () => {
        Keyboard.dismiss();
      },
      onPanResponderMove: (_, gesture) => {
        const nextHeight = currentHeight - gesture.dy;
        if (nextHeight >= COLLAPSED_HEIGHT - 70 && nextHeight <= EXPANDED_HEIGHT + 20) {
          sheetHeight.setValue(nextHeight);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (!isExpanded && gesture.dy > 55) {
          handleClose();
          return;
        }

        if (gesture.dy < -40) {
          animateSheet(true);
        } else if (gesture.dy > 40) {
          animateSheet(false);
        } else {
          animateSheet(currentHeight > (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2);
        }
      },
    })
  , [currentHeight, isExpanded, sheetHeight, onClose]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/categories`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        if (Array.isArray(json.categories) && json.categories.length > 0) {
          setCategoryOptions(
            json.categories.map((cat) => ({
              label: cat === 'Semua' ? 'Category' : cat,
              value: cat,
            }))
          );
        }
      })
      .catch((err) => console.log('Info kategori:', err.message));
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      fetchPois();
    }, 300);

    return () => clearTimeout(timer);
  }, [visible, searchQuery, selectedCategory, selectedTime, selectedEnv, selectedRating]);

  async function fetchPois() {
    setLoadingPois(true);
    setFetchError('');
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        category: selectedCategory,
        time_category: selectedTime,
        environment: selectedEnv,
        min_rating: selectedRating,
      });

      const response = await fetch(`${API_BASE_URL}/api/pois/search?${params.toString()}`);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || `Server error (${response.status})`);
      }

      setRawPois(json.data || []);
    } catch (error) {
      setRawPois([]);
      setFetchError(`Gagal akses ${API_BASE_URL}: ${error.message}`);
    } finally {
      setLoadingPois(false);
    }
  }

  // Handler Budget Slider + Input Rupiah
  const handleSliderRangeChange = (nextMin, nextMax) => {
    setMinBudget(nextMin);
    setMaxBudget(nextMax);
    setMinBudgetInput(String(nextMin));
    setMaxBudgetInput(String(nextMax));
  };

  const handleMinBudgetText = (text) => {
    const digits = text.replace(/[^0-9]/g, '');
    setMinBudgetInput(digits);
    const num = Number(digits) || 0;
    const clamped = Math.min(num, maxBudget);
    setMinBudget(Math.min(clamped, BUDGET_MAX_LIMIT));
  };

  const handleMaxBudgetText = (text) => {
    const digits = text.replace(/[^0-9]/g, '');
    setMaxBudgetInput(digits);
    const num = Number(digits) || 0;
    const clamped = Math.max(num, minBudget);
    setMaxBudget(Math.min(clamped, BUDGET_MAX_LIMIT));
  };

  const pois = useMemo(() => {
    const lowBudget = Math.max(0, minBudget);
    const highBudget = Math.max(lowBudget, maxBudget);

    return rawPois.filter((item) => {
      const { min: poiMin, max: poiMax } = getPoiPriceBounds(item);
      return poiMax >= lowBudget && poiMin <= highBudget;
    });
  }, [rawPois, minBudget, maxBudget]);

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedCategory !== 'Semua' ||
    selectedTime !== 'Semua' ||
    selectedEnv !== 'Semua' ||
    selectedRating !== '0' ||
    minBudget > BUDGET_MIN_LIMIT ||
    maxBudget < BUDGET_MAX_LIMIT;

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Semua');
    setSelectedTime('Semua');
    setSelectedEnv('Semua');
    setSelectedRating('0');
    setMinBudget(BUDGET_MIN_LIMIT);
    setMaxBudget(BUDGET_MAX_LIMIT);
    setMinBudgetInput(String(BUDGET_MIN_LIMIT));
    setMaxBudgetInput(String(BUDGET_MAX_LIMIT));
  };

  const formatRupiah = (num) => {
    if (!num || num === 0) return 'Free';
    return `Rp${num.toLocaleString('id-ID')}`;
  };

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

  const handleChoosePoi = (item) => {
    Keyboard.dismiss();
    setOpenDropdown(null);
    onClose?.();
    onSelectPoi?.({
      ...item,
      rating: String(item.rating ?? '5.0'),
      distance: item.distance || '12km',
    });
  };

  const renderFilterPill = (key, label, isActive) => (
    <TouchableOpacity
      key={key}
      activeOpacity={0.85}
      onPress={() => {
        Keyboard.dismiss();
        setOpenDropdown(key);
      }}
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

  const renderPoiItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.poiCard}
      onPress={() => handleChoosePoi(item)}
    >
      <WireframeImageBox width={82} height={82} />

      <View style={styles.poiCardBody}>
        <View style={styles.poiTopRow}>
          <Text style={styles.poiName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.category ? (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.ratingRow}>
          <Ionicons name="star" size={13} color={COLORS.darkPurple} />
          <Text style={styles.ratingText}>
            {item.rating} ({item.reviews_count ?? 0})
          </Text>
          <Text style={styles.dotSeparator}>•</Text>
          <Text style={styles.hoursText} numberOfLines={1}>
            {item.opening_hours}
          </Text>
        </View>

        {item.description || item.shortDescription ? (
          <Text style={styles.poiDesc} numberOfLines={2}>
            {item.description || item.shortDescription}
          </Text>
        ) : null}

        <View style={styles.metaPillRow}>
          {item.environment ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{item.environment}</Text>
            </View>
          ) : null}
          {item.time_category ? (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{item.time_category}</Text>
            </View>
          ) : null}
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>
              {formatRupiah(item.price_min)}–{formatRupiah(item.price_max)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!visible) return null;

  const activeDropdown = getDropdownConfig();
  const bottomSafeSpace = Math.max(insets.bottom, 16);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      statusBarTranslucent={true}
      onRequestClose={() => {
        if (openDropdown) {
          setOpenDropdown(null);
        } else {
          handleClose();
        }
      }}
    >
      <View style={styles.modalRoot}>
        {/* Area peta di atas slider bisa diketuk untuk menutup Search */}
        <Pressable style={styles.dismissBackdrop} onPress={handleClose} />

        {/* Slider Search terkunci di dasar layar */}
        <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
          <View {...panResponder.panHandlers} style={styles.dragHeaderArea}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => animateSheet(!isExpanded)}
              style={styles.dragHandleTouch}
            >
              <View style={styles.dragHandle} />
            </TouchableOpacity>

            <View style={styles.sheetTitleRow}>
              <Text style={styles.sheetTitle}>Search Destination</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeCircleBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={18} color={COLORS.darkPurple} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchInputBox}>
              <TextInput
                ref={searchInputRef}
                returnKeyType="search"
                style={styles.searchInput}
                placeholder="Type Something..."
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onFocus={() => {
                  if (!isExpanded) animateSheet(true);
                }}
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearIconBtn}>
                  <Ionicons name="close-circle" size={19} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : null}
              <Ionicons name="search" size={20} color={COLORS.darkPurple} />
            </View>
          </View>

          <View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.filterRow}
            >
              <TouchableOpacity
                style={styles.filterIconBtn}
                onPress={hasActiveFilters ? resetAllFilters : undefined}
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
          </View>

          {/* Filter Budget (Slider + Input Rupiah persis seperti Trip Planner) */}
          <View style={styles.budgetFilterBox}>
            <Text style={styles.subSectionLabel}>
              Filter Budget (Rp{formatRupiahNumber(minBudget)} – Rp
              {formatRupiahNumber(maxBudget)})
            </Text>
            <BudgetRangeSlider
              minVal={minBudget}
              maxVal={maxBudget}
              onChangeRange={handleSliderRangeChange}
            />
            <View style={styles.budgetInputsRow}>
              <View style={styles.budgetInputBox}>
                <View style={styles.rupiahField}>
                  <Text style={styles.rpPrefix}>Rp</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={minBudgetInput}
                    onChangeText={handleMinBudgetText}
                    placeholder="0"
                    style={styles.rpInput}
                  />
                </View>
              </View>

              <Text style={styles.budgetDash}>—</Text>

              <View style={styles.budgetInputBox}>
                <View style={styles.rupiahField}>
                  <Text style={styles.rpPrefix}>Rp</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={maxBudgetInput}
                    onChangeText={handleMaxBudgetText}
                    placeholder="500000"
                    style={styles.rpInput}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.resultHeader}>
            <Text style={styles.resultCountText}>Showing {pois.length} destinations</Text>
            {hasActiveFilters && (
              <TouchableOpacity onPress={resetAllFilters} activeOpacity={0.8}>
                <Text style={styles.resetText}>Reset Filter</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingPois ? (
            <ActivityIndicator
              size="large"
              color={COLORS.primaryPurple}
              style={{ marginTop: 28 }}
            />
          ) : (
            <FlatList
              data={pois}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderPoiItem}
              style={styles.poiList}
              nestedScrollEnabled={true}
              contentContainerStyle={[
                styles.listContent,
                {
                  paddingBottom:
                    keyboardHeight > 0
                      ? keyboardHeight + bottomSafeSpace + 12
                      : bottomSafeSpace + 16,
                },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons
                    name={fetchError ? 'alert-circle-outline' : 'search-outline'}
                    size={32}
                    color={COLORS.textMuted}
                  />
                  <Text style={styles.emptyText}>
                    {fetchError || 'No destinations match your search or filter.'}
                  </Text>
                  {fetchError ? (
                    <TouchableOpacity onPress={fetchPois} style={styles.retryBtn}>
                      <Text style={styles.retryBtnText}>Coba Lagi</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              }
            />
          )}
        </Animated.View>

        {/* Pop-up Filter melayang di tengah layar & di depan bottomSheet */}
        {activeDropdown && (
          <View style={styles.dropdownCenterOverlay}>
            <Pressable
              style={styles.dropdownBackdrop}
              onPress={() => setOpenDropdown(null)}
            />

            <View style={styles.dropdownSheet}>
              <View style={styles.dropdownSheetHeader}>
                <Text style={styles.dropdownSheetTitle}>{activeDropdown.title}</Text>
                <TouchableOpacity onPress={() => setOpenDropdown(null)}>
                  <Ionicons name="close" size={22} color={COLORS.darkPurple} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={true}>
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
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    position: 'relative',
  },
  dismissBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
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
    zIndex: 10,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  poiList: {
    flex: 1,
  },
  dragHeaderArea: {
    paddingHorizontal: 18,
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
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  closeCircleBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.lavenderTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  clearIconBtn: {
    marginRight: 6,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  filterIconBtn: {
    paddingRight: 2,
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
    fontWeight: '600',
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
  budgetFilterBox: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  subSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  sliderContainer: {
    height: 36,
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 2,
  },
  sliderTrackBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.lavenderTint,
    marginHorizontal: 14,
  },
  sliderTrackActive: {
    position: 'absolute',
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primaryPurple,
  },
  sliderThumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    borderWidth: 2.5,
    borderColor: COLORS.darkPurple,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  sliderThumbDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.darkPurple,
  },
  budgetInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  budgetInputBox: {
    flex: 1,
  },
  rupiahField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.4,
    borderColor: COLORS.mediumPurple,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    height: 38,
    backgroundColor: COLORS.softLilacBg,
  },
  rpPrefix: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.darkPurple,
    marginRight: 4,
  },
  rpInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  budgetDash: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  resultCountText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryPurple,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  poiCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 10,
    gap: 12,
  },
  poiCardBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  poiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  poiName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  categoryBadge: {
    backgroundColor: COLORS.lavenderTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.darkPurple,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  dotSeparator: {
    marginHorizontal: 5,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  hoursText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  poiDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
    marginTop: 3,
  },
  metaPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
  },
  metaChip: {
    backgroundColor: COLORS.softLilacBg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  metaChipText: {
    fontSize: 10,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 6,
    backgroundColor: COLORS.darkPurple,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  retryBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownCenterOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 999,
    elevation: 30,
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(49, 20, 101, 0.45)',
  },
  dropdownSheet: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    padding: 16,
    zIndex: 1000,
    elevation: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
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