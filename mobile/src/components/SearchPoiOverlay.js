import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from './theme';
import { WireframeImageBox } from './PoiCardComponents';

const BACKEND_PORT = '5000';
const debuggerHost =
  Constants.expoConfig?.hostUri ||
  Constants.manifest2?.extra?.expoGo?.debuggerHost ||
  Constants.manifest?.debuggerHost;
const localIp = debuggerHost ? debuggerHost.split(':')[0] : '10.46.161.81';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${localIp}:${BACKEND_PORT}`;

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

export default function SearchPoiOverlay({
  visible,
  windowShrink = 0,
  onClose,
  onSelectPoi,
}) {
  const [categoryOptions, setCategoryOptions] = useState([
    { label: 'Category', value: 'Semua' },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedTime, setSelectedTime] = useState('Semua');
  const [selectedEnv, setSelectedEnv] = useState('Semua');
  const [selectedRating, setSelectedRating] = useState('0');

  const [openDropdown, setOpenDropdown] = useState(null);

  const [pois, setPois] = useState([]);
  const [loadingPois, setLoadingPois] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const searchInputRef = useRef(null);

  const [isExpanded, setIsExpanded] = useState(true);
  const isExpandedRef = useRef(true);
  const sheetHeight = useRef(new Animated.Value(0)).current;
  const currentHeightRef = useRef(EXPANDED_HEIGHT);

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
    isExpandedRef.current = toExpanded;
    currentHeightRef.current = target;
    Animated.spring(sheetHeight, {
      toValue: target,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  };

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.timing(sheetHeight, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start(() => {
      onClose?.();
    });
  };

  useEffect(() => {
    if (visible) {
      setIsExpanded(true);
      isExpandedRef.current = true;
      currentHeightRef.current = EXPANDED_HEIGHT;
      sheetHeight.setValue(COLLAPSED_HEIGHT);
      Animated.spring(sheetHeight, {
        toValue: EXPANDED_HEIGHT,
        useNativeDriver: false,
        bounciness: 4,
      }).start();

      const focusTimer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);

      return () => clearTimeout(focusTimer);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
      onPanResponderGrant: () => {
        Keyboard.dismiss();
      },
      onPanResponderMove: (_, gesture) => {
        const nextHeight = currentHeightRef.current - gesture.dy;
        if (nextHeight >= COLLAPSED_HEIGHT - 70 && nextHeight <= EXPANDED_HEIGHT + 20) {
          sheetHeight.setValue(nextHeight);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (!isExpandedRef.current && gesture.dy > 55) {
          handleClose();
          return;
        }

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

  const fetchPois = async () => {
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

      setPois(json.data || []);
    } catch (error) {
      setPois([]);
      setFetchError(`Gagal akses ${API_BASE_URL}: ${error.message}`);
    } finally {
      setLoadingPois(false);
    }
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedCategory !== 'Semua' ||
    selectedTime !== 'Semua' ||
    selectedEnv !== 'Semua' ||
    selectedRating !== '0';

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Semua');
    setSelectedTime('Semua');
    setSelectedEnv('Semua');
    setSelectedRating('0');
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

  return (
    <Animated.View
      style={[
        styles.bottomSheet,
        { height: sheetHeight, bottom: -windowShrink },
      ]}
    >
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
          <TouchableOpacity onPress={handleClose} style={styles.closeCircleBtn} activeOpacity={0.8}>
            <Ionicons name="close" size={18} color={COLORS.darkPurple} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputBox}>
          <TextInput
            ref={searchInputRef}
            autoFocus
            returnKeyType="search"
            style={styles.searchInput}
            placeholder="Type Something..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => {
              if (!isExpandedRef.current) animateSheet(true);
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
            keyboardHeight > 0 ? { paddingBottom: keyboardHeight + 24 } : null,
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

      <Modal
        visible={Boolean(activeDropdown)}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenDropdown(null)}
      >
        <TouchableOpacity
          style={styles.dropdownBackdrop}
          activeOpacity={1}
          onPress={() => setOpenDropdown(null)}
        >
          <View style={styles.dropdownSheet} onStartShouldSetResponder={() => true}>
            {activeDropdown && (
              <>
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
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
    zIndex: 30,
    elevation: 8,
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
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(49, 20, 101, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
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