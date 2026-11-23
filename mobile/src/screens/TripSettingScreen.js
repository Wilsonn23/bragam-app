import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Alert,
  PanResponder,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import { PoiFirstImage } from '../components/PoiImageGallery';
import { BRAGA_POIS } from '../constants/bragaMapData';
import { distanceMeters } from '../location/distance';
import { API_BASE_URL } from '../config/api';

const MAX_DESTINATIONS = 12;
const BUDGET_MIN_LIMIT = 0;
const BUDGET_MAX_LIMIT = 500000;
const BUDGET_STEP = 10000;
const ROW_ITEM_HEIGHT = 68;

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

const CULINARY_KEYWORDS = [
  'kuliner',
  'kafe',
  'cafe',
  'kopi',
  'bakery',
  'oleh',
  'makan',
  'food',
  'resto',
  'minum',
  'es krim',
  'gelato',
  'street',
];

function classifyMainCategory(poi) {
  const rawCat = String(poi.main_category || poi.category || '').toLowerCase();
  const rawSub = String(poi.subcategory || poi.sub_category || '').toLowerCase();
  const combined = `${rawCat} ${rawSub}`;

  if (rawCat === 'kuliner') return 'Kuliner';
  if (rawCat === 'hiburan') return 'Hiburan';

  const isCulinary = CULINARY_KEYWORDS.some((kw) => combined.includes(kw));
  return isCulinary ? 'Kuliner' : 'Hiburan';
}

function extractSubcategory(poi) {
  if (poi.subcategory || poi.sub_category) {
    return String(poi.subcategory || poi.sub_category);
  }
  const cat = String(poi.category || '').trim();
  if (cat && cat.toLowerCase() !== 'kuliner' && cat.toLowerCase() !== 'hiburan') {
    return cat;
  }
  return classifyMainCategory(poi) === 'Kuliner' ? 'Kafe & Kuliner' : 'Wisata & Hiburan';
}

function getPoiHoursLabel(poi) {
  if (poi.opening_hours) return String(poi.opening_hours);
  if (poi.openingHours) return String(poi.openingHours);
  if (poi.hours) return String(poi.hours);
  if (poi.jamBuka) return String(poi.jamBuka);
  if (poi.openTime && poi.closeTime) return `${poi.openTime} - ${poi.closeTime}`;
  if (poi.open_time && poi.close_time) return `${poi.open_time} - ${poi.close_time}`;

  const timeCat = String(poi.time_category || '').toLowerCase();
  const sub = extractSubcategory(poi).toLowerCase();
  if (timeCat === 'malam' || sub.includes('malam') || sub.includes('night')) {
    return '17.00 - 01.00';
  }
  if (timeCat === 'pagi') return '07.00 - 15.00';
  if (timeCat === 'siang') return '10.00 - 21.00';
  return '09.00 - 22.00';
}

function parseHoursRange(hoursText) {
  if (!hoursText) return null;
  const lower = String(hoursText).toLowerCase();
  if (lower.includes('24 jam') || lower.includes('24 hours')) {
    return { openMins: 0, closeMins: 24 * 60, is24Hours: true };
  }

  const matches = lower.match(/(\d{1,2})[.:](\d{2})/g);
  if (!matches || matches.length < 2) return null;

  const toMins = (token) => {
    const [h, m] = token.replace(':', '.').split('.').map(Number);
    return (h % 24) * 60 + (m || 0);
  };

  return {
    openMins: toMins(matches[0]),
    closeMins: toMins(matches[1]),
    is24Hours: false,
  };
}

function isPoiOpenAtMinutes(poi, targetMinutes) {
  const normalizedTarget = ((Math.round(targetMinutes) % 1440) + 1440) % 1440;
  const hoursStr = getPoiHoursLabel(poi);
  const parsed = parseHoursRange(hoursStr);

  if (parsed) {
    if (parsed.is24Hours) return true;
    const { openMins, closeMins } = parsed;
    if (openMins === closeMins) return true;
    if (closeMins > openMins) {
      return normalizedTarget >= openMins && normalizedTarget < closeMins;
    }
    return normalizedTarget >= openMins || normalizedTarget < closeMins;
  }

  const timeCat = String(poi.time_category || '').toLowerCase();
  const sub = extractSubcategory(poi).toLowerCase();
  if (timeCat === 'malam' || sub.includes('malam') || sub.includes('night')) {
    return normalizedTarget >= 16 * 60 || normalizedTarget < 3 * 60;
  }
  if (timeCat === 'pagi') {
    return normalizedTarget >= 6 * 60 && normalizedTarget < 14 * 60;
  }
  if (timeCat === 'siang') {
    return normalizedTarget >= 10 * 60 && normalizedTarget < 21 * 60;
  }
  return true;
}

function getPoiCoord(poi) {
  const lat = Number(poi?.coordinate?.latitude ?? poi?.latitude ?? poi?.lat);
  const lng = Number(poi?.coordinate?.longitude ?? poi?.longitude ?? poi?.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { latitude: lat, longitude: lng };
  }
  return null;
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 9 * 60;
  const cleaned = timeStr.replace(':', '.');
  const [h, m] = cleaned.split('.').map(Number);
  if (!Number.isFinite(h)) return 9 * 60;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

function formatMinutesToTime(totalMinutes) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const h = String(Math.floor(clamped / 60)).padStart(2, '0');
  const m = String(clamped % 60).padStart(2, '0');
  return `${h}.${m}`;
}

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

function formatPoiBudgetBadge(poi) {
  const rawStr =
    poi.priceRange ?? poi.price_range ?? poi.harga ?? poi.estimasi_harga;
  if (typeof rawStr === 'string' && rawStr.trim().length > 0) {
    return rawStr.trim();
  }
  const { min, max } = getPoiPriceBounds(poi);
  if (min === 0 && max === 0) return 'Free';
  const minLabel = min === 0 ? 'Free' : `Rp${min.toLocaleString('id-ID')}`;
  const maxLabel = `Rp${max.toLocaleString('id-ID')}`;
  if (min === max) return maxLabel;
  return `${minLabel}–${maxLabel}`;
}

function estimateSegmentMinutes(prevPoi, nextPoi) {
  const stayDuration = 60;
  const c1 = getPoiCoord(prevPoi);
  const c2 = getPoiCoord(nextPoi);

  if (c1 && c2) {
    const meters = distanceMeters(c1, c2);
    const walkMins = Math.max(5, Math.ceil(meters / 75));
    return stayDuration + walkMins;
  }
  return 75;
}

function orderPoisByProximity(candidates) {
  if (!Array.isArray(candidates) || candidates.length <= 1) return candidates;

  const remaining = [...candidates];
  const ordered = [remaining.shift()];

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    const lastCoord = getPoiCoord(last);

    if (!lastCoord) {
      ordered.push(remaining.shift());
      continue;
    }

    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candCoord = getPoiCoord(remaining[i]);
      const dist = candCoord ? distanceMeters(lastCoord, candCoord) : Infinity;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    ordered.push(remaining.splice(nearestIdx, 1)[0]);
  }

  return ordered;
}

// Komponen Dual-Thumb Budget Range Slider
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

// Komponen Item Destinasi dengan Drag-and-Drop
function DraggableStopRow({
  stop,
  index,
  totalCount,
  onPressTime,
  onRemove,
  onDragStart,
  onDragEnd,
  onMoveIndex,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const lastStepOffset = useRef(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setIsDragging(true);
          lastStepOffset.current = 0;
          onDragStart?.();
        },
        onPanResponderMove: (_, gesture) => {
          const stepShift = Math.round(gesture.dy / ROW_ITEM_HEIGHT);
          if (stepShift !== lastStepOffset.current) {
            const targetIndex = Math.max(
              0,
              Math.min(totalCount - 1, index + (stepShift - lastStepOffset.current))
            );
            if (targetIndex !== index) {
              lastStepOffset.current = stepShift;
              onMoveIndex(index, targetIndex);
            }
          }
        },
        onPanResponderRelease: () => {
          setIsDragging(false);
          onDragEnd?.();
        },
        onPanResponderTerminate: () => {
          setIsDragging(false);
          onDragEnd?.();
        },
      }),
    [index, totalCount, onMoveIndex, onDragStart, onDragEnd]
  );

  return (
    <View
      style={[
        styles.stopEditRow,
        isDragging && styles.stopEditRowDragging,
      ]}
    >
      <View {...panResponder.panHandlers} style={styles.dragGripBtn}>
        <MaterialCommunityIcons
          name="drag-vertical"
          size={22}
          color={COLORS.primaryPurple}
        />
      </View>

      <View style={styles.orderBadge}>
        <Text style={styles.orderBadgeText}>{index + 1}</Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onPressTime(index)}
        style={styles.timePill}
      >
        <Ionicons name="time-outline" size={13} color={COLORS.darkPurple} />
        <Text style={styles.timePillText}>{stop.time}</Text>
      </TouchableOpacity>

      <View style={{ flex: 1 }}>
        <Text style={styles.stopEditName} numberOfLines={1}>
          {stop.name}
        </Text>
        <Text style={styles.stopEditCat} numberOfLines={1}>
          {extractSubcategory(stop)} • Buka {getPoiHoursLabel(stop)}
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => onRemove(stop.stopKey)}
        style={styles.iconActionBtn}
      >
        <Ionicons name="trash-outline" size={18} color="#C62828" />
      </TouchableOpacity>
    </View>
  );
}

export default function TripSettingScreen({
  initialPlan = null,
  pois = [],
  existingCount = 0,
  onSavePlan,
  onBack,
}) {
  const insets = useSafeAreaInsets();
  const topInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? StatusBar.currentHeight || 28
      : 44;

  const isEditing = Boolean(initialPlan);
  const datasetPois = useMemo(() => {
    const raw = Array.isArray(pois) && pois.length > 0 ? pois : BRAGA_POIS;
    return raw.map((p) => {
      const localFallback = BRAGA_POIS.find(
        (b) =>
          (p.id && String(b.id) === String(p.id)) ||
          b.name?.toLowerCase() === p.name?.toLowerCase()
      );
      const merged = { ...localFallback, ...p };
      return {
        ...merged,
        mainCategory: classifyMainCategory(merged),
        subCategory: extractSubcategory(merged),
        priceBounds: getPoiPriceBounds(merged),
        hoursLabel: getPoiHoursLabel(merged),
      };
    });
  }, [pois]);

  // Kategori Utama & Subkategori (Mode Otomatis)
  const [selectedMainCats, setSelectedMainCats] = useState(['Kuliner', 'Hiburan']);
  const [selectedSubcats, setSelectedSubcats] = useState([]);

  const availableSubcategories = useMemo(() => {
    const set = new Set();
    datasetPois.forEach((p) => {
      if (selectedMainCats.includes(p.mainCategory) && p.subCategory) {
        set.add(p.subCategory);
      }
    });
    return Array.from(set);
  }, [datasetPois, selectedMainCats]);

  useEffect(() => {
    setSelectedSubcats((prev) =>
      prev.filter((sub) => availableSubcategories.includes(sub))
    );
  }, [availableSubcategories]);

  // Form umum
  const [title, setTitle] = useState(
    initialPlan?.title || `Trip Plan ${existingCount + 1}`
  );
  const [mode, setMode] = useState('auto'); // 'auto' | 'manual'
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Pop-up pesan tidak ada POI cocok
  const [noMatchModalVisible, setNoMatchModalVisible] = useState(false);

  // Jam Mulai (24 jam bebas: jam 0-23, menit 0-59)
  const initialStartMins = initialPlan?.stops?.[0]?.time
    ? parseTimeToMinutes(initialPlan.stops[0].time)
    : 9 * 60;
  const [startHour, setStartHour] = useState(Math.floor(initialStartMins / 60));
  const [startMinute, setStartMinute] = useState(initialStartMins % 60);

  // Budget Slider + Input Manual (Mode Buat Otomatis)
  const [minBudget, setMinBudget] = useState(0);
  const [maxBudget, setMaxBudget] = useState(250000);
  const [minBudgetInput, setMinBudgetInput] = useState('0');
  const [maxBudgetInput, setMaxBudgetInput] = useState('250000');

  // Jumlah Destinasi Maksimum (1..12)
  const [maxStopCount, setMaxStopCount] = useState(3);

  // Daftar Destinasi Terpilih
  const [stops, setStops] = useState(() => {
    if (initialPlan?.stops?.length) {
      return initialPlan.stops.map((s, idx) => ({
        ...s,
        stopKey: s.stopKey || `${s.id || idx}-${Date.now()}-${idx}`,
      }));
    }
    return [];
  });

  // Modal Edit Jam per POI
  const [editingStopIndex, setEditingStopIndex] = useState(null);
  const [tempHour, setTempHour] = useState(9);
  const [tempMinute, setTempMinute] = useState(0);

  // Filter Mode "Pilih Manual" (menggunakan /api/pois/search seperti SearchPoiOverlay)
  const [categoryOptions, setCategoryOptions] = useState([
    { label: 'Category', value: 'Semua' },
  ]);
  const [manualQuery, setManualQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedTime, setSelectedTime] = useState('Semua');
  const [selectedEnv, setSelectedEnv] = useState('Semua');
  const [selectedRating, setSelectedRating] = useState('0');
  const [openDropdown, setOpenDropdown] = useState(null);

  const [manualApiPois, setManualApiPois] = useState([]);
  const [loadingManualPois, setLoadingManualPois] = useState(false);

  const [manualMinBudget, setManualMinBudget] = useState(BUDGET_MIN_LIMIT);
  const [manualMaxBudget, setManualMaxBudget] = useState(BUDGET_MAX_LIMIT);
  const [manualMinBudgetInput, setManualMinBudgetInput] = useState(
    String(BUDGET_MIN_LIMIT)
  );
  const [manualMaxBudgetInput, setManualMaxBudgetInput] = useState(
    String(BUDGET_MAX_LIMIT)
  );

  // Ambil daftar kategori langsung dari /api/categories
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
      .catch(() => {
        const uniqueCats = Array.from(
          new Set(datasetPois.map((p) => p.category || p.subCategory).filter(Boolean))
        );
        setCategoryOptions([
          { label: 'Category', value: 'Semua' },
          ...uniqueCats.map((cat) => ({ label: cat, value: cat })),
        ]);
      });
  }, [datasetPois]);

  // Ambil hasil pencarian & filter langsung dari /api/pois/search seperti di SearchPoiOverlay
  useEffect(() => {
    if (mode !== 'manual') return;
    let isCancelled = false;

    const timer = setTimeout(async () => {
      setLoadingManualPois(true);
      try {
        const params = new URLSearchParams({
          q: manualQuery,
          category: selectedCategory,
          time_category: selectedTime,
          environment: selectedEnv,
          min_rating: selectedRating,
        });

        const response = await fetch(
          `${API_BASE_URL}/api/pois/search?${params.toString()}`
        );
        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error || `Server error (${response.status})`);
        }

        if (!isCancelled) {
          const rows = Array.isArray(json.data) ? json.data : [];
          setManualApiPois(
            rows.map((item) => {
              const localFallback = datasetPois.find(
                (d) =>
                  (item.id && String(d.id) === String(item.id)) ||
                  d.name?.toLowerCase() === item.name?.toLowerCase()
              );
              const merged = { ...localFallback, ...item };
              return {
                ...merged,
                mainCategory: classifyMainCategory(merged),
                subCategory: extractSubcategory(merged),
                priceBounds: getPoiPriceBounds(merged),
                hoursLabel: getPoiHoursLabel(merged),
              };
            })
          );
        }
      } catch (err) {
        if (!isCancelled) {
          console.log('Fallback filter lokal manual:', err.message);
          setManualApiPois(datasetPois);
        }
      } finally {
        if (!isCancelled) {
          setLoadingManualPois(false);
        }
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [
    mode,
    manualQuery,
    selectedCategory,
    selectedTime,
    selectedEnv,
    selectedRating,
    datasetPois,
  ]);

  // Hitung ulang seluruh jam pada stops secara berurutan (real-time cascade)
  const recalculateSchedule = (list, baseStartMins, anchorIndex = 0) => {
    if (!Array.isArray(list) || list.length === 0) return [];
    const updated = [...list];

    if (anchorIndex === 0) {
      updated[0] = {
        ...updated[0],
        time: formatMinutesToTime(baseStartMins),
      };
    }

    for (let i = Math.max(1, anchorIndex + 1); i < updated.length; i++) {
      const prevMins = parseTimeToMinutes(updated[i - 1].time);
      const segment = estimateSegmentMinutes(updated[i - 1], updated[i]);
      updated[i] = {
        ...updated[i],
        time: formatMinutesToTime(prevMins + segment),
      };
    }
    return updated;
  };

  // Ubah jam mulai jalan-jalan dengan tombol atas/bawah -> update jadwal real-time
  const updateStartTime = (newH, newM) => {
    const wrappedH = ((newH % 24) + 24) % 24;
    const wrappedM = ((newM % 60) + 60) % 60;
    setStartHour(wrappedH);
    setStartMinute(wrappedM);

    const newBaseMins = wrappedH * 60 + wrappedM;
    setStops((prev) => recalculateSchedule(prev, newBaseMins, 0));
  };

  const toggleMainCategory = (cat) => {
    setSelectedMainCats((prev) => {
      if (prev.includes(cat)) {
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== cat);
      }
      return [...prev, cat];
    });
  };

  const toggleSubcategory = (sub) => {
    setSelectedSubcats((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  // Handler Budget Mode Otomatis
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

  // Handler Budget Mode Pilih Manual
  const handleManualSliderRangeChange = (nextMin, nextMax) => {
    setManualMinBudget(nextMin);
    setManualMaxBudget(nextMax);
    setManualMinBudgetInput(String(nextMin));
    setManualMaxBudgetInput(String(nextMax));
  };

  const handleManualMinBudgetText = (text) => {
    const digits = text.replace(/[^0-9]/g, '');
    setManualMinBudgetInput(digits);
    const num = Number(digits) || 0;
    const clamped = Math.min(num, manualMaxBudget);
    setManualMinBudget(Math.min(clamped, BUDGET_MAX_LIMIT));
  };

  const handleManualMaxBudgetText = (text) => {
    const digits = text.replace(/[^0-9]/g, '');
    setManualMaxBudgetInput(digits);
    const num = Number(digits) || 0;
    const clamped = Math.max(num, manualMinBudget);
    setManualMaxBudget(Math.min(clamped, BUDGET_MAX_LIMIT));
  };

  // Generate Otomatis
  const handleGenerateAutoPlan = () => {
    const baseStartMins = startHour * 60 + startMinute;
    const lowBudget = Number(minBudgetInput) || 0;
    const highBudget = Math.max(
      lowBudget,
      maxBudgetInput === '' ? BUDGET_MAX_LIMIT : Number(maxBudgetInput) || 0
    );

    const filtered = datasetPois.filter((poi) => {
      const mainMatch = selectedMainCats.includes(poi.mainCategory);
      const subMatch =
        selectedSubcats.length === 0 || selectedSubcats.includes(poi.subCategory);

      const { min: poiMin, max: poiMax } = poi.priceBounds;
      const budgetMatch = poiMax >= lowBudget && poiMin <= highBudget;

      const openMatch = isPoiOpenAtMinutes(poi, baseStartMins);

      return mainMatch && subMatch && budgetMatch && openMatch;
    });

    if (filtered.length === 0) {
      setStops([]);
      setNoMatchModalVisible(true);
      return;
    }

    const topByRating = [...filtered]
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, maxStopCount);

    const proximityOrdered = orderPoisByProximity(topByRating);

    const rawStops = proximityOrdered.map((poi, idx) => ({
      ...poi,
      id: poi.id,
      stopKey: `${poi.id}-${Date.now()}-${idx}`,
      name: poi.name,
      time: formatMinutesToTime(baseStartMins),
    }));

    setStops(recalculateSchedule(rawStops, baseStartMins, 0));
  };

  const isPoiAlreadyInStops = (poi) => {
    return stops.some(
      (s) =>
        (poi.id && String(s.id) === String(poi.id)) ||
        s.name?.toLowerCase() === poi.name?.toLowerCase()
    );
  };

  const handleAddManualPoi = (poi) => {
    if (isPoiAlreadyInStops(poi)) {
      return;
    }
    if (stops.length >= MAX_DESTINATIONS) {
      Alert.alert(
        'Maksimum Tercapai',
        `Maksimal ${MAX_DESTINATIONS} destinasi dalam satu rencana.`
      );
      return;
    }
    const baseStartMins = startHour * 60 + startMinute;
    setStops((prev) => {
      const nextList = [
        ...prev,
        {
          ...poi,
          id: poi.id,
          stopKey: `${poi.id}-${Date.now()}-${prev.length}`,
          name: poi.name,
          time: formatMinutesToTime(baseStartMins),
        },
      ];
      const anchor = prev.length > 0 ? prev.length - 1 : 0;
      return recalculateSchedule(nextList, baseStartMins, anchor);
    });
  };

  const handleMoveStopIndex = (fromIndex, toIndex) => {
    const baseStartMins = startHour * 60 + startMinute;
    setStops((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return recalculateSchedule(copy, baseStartMins, 0);
    });
  };

  const handleRemoveStop = (stopKey) => {
    const baseStartMins = startHour * 60 + startMinute;
    setStops((prev) => {
      const filtered = prev.filter((s) => s.stopKey !== stopKey);
      return recalculateSchedule(filtered, baseStartMins, 0);
    });
  };

  const handleOpenStopTimeModal = (index) => {
    const mins = parseTimeToMinutes(stops[index]?.time);
    setTempHour(Math.floor(mins / 60));
    setTempMinute(mins % 60);
    setEditingStopIndex(index);
  };

  const handleConfirmStopTime = () => {
    if (editingStopIndex === null) return;
    const chosenMins = tempHour * 60 + tempMinute;

    if (editingStopIndex > 0) {
      const prevMins = parseTimeToMinutes(stops[editingStopIndex - 1].time);
      if (chosenMins <= prevMins) {
        Alert.alert(
          'Jam Tidak Valid',
          `Jam pada destinasi ke-${editingStopIndex + 1} harus lebih dari jam titik sebelumnya (${stops[editingStopIndex - 1].time}).`
        );
        return;
      }
    }

    if (editingStopIndex === 0) {
      setStartHour(tempHour);
      setStartMinute(tempMinute);
    }

    setStops((prev) => {
      const copy = [...prev];
      copy[editingStopIndex] = {
        ...copy[editingStopIndex],
        time: formatMinutesToTime(chosenMins),
      };
      return recalculateSchedule(copy, chosenMins, editingStopIndex);
    });
    setEditingStopIndex(null);
  };

  const handleSave = () => {
    const cleanTitle = title.trim() || `Trip Plan ${existingCount + 1}`;
    if (stops.length === 0) {
      Alert.alert(
        'Destinasi Kosong',
        'Pilih minimal 1 destinasi POI untuk rencana perjalananmu.'
      );
      return;
    }

    onSavePlan?.({
      id: initialPlan?.id || `plan-${Date.now()}`,
      title: cleanTitle,
      stops,
    });
  };

  const hasActiveFilters =
    manualQuery !== '' ||
    selectedCategory !== 'Semua' ||
    selectedTime !== 'Semua' ||
    selectedEnv !== 'Semua' ||
    selectedRating !== '0' ||
    manualMinBudget > BUDGET_MIN_LIMIT ||
    manualMaxBudget < BUDGET_MAX_LIMIT;

  const resetAllFilters = () => {
    setManualQuery('');
    setSelectedCategory('Semua');
    setSelectedTime('Semua');
    setSelectedEnv('Semua');
    setSelectedRating('0');
    setManualMinBudget(BUDGET_MIN_LIMIT);
    setManualMaxBudget(BUDGET_MAX_LIMIT);
    setManualMinBudgetInput(String(BUDGET_MIN_LIMIT));
    setManualMaxBudgetInput(String(BUDGET_MAX_LIMIT));
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

  // Filter budget diterapkan pada hasil dari /api/pois/search
  const filteredManualPois = useMemo(() => {
    const lowBudget = Math.max(0, manualMinBudget);
    const highBudget = Math.max(lowBudget, manualMaxBudget);

    return manualApiPois.filter((p) => {
      const { min: poiMin, max: poiMax } = p.priceBounds || getPoiPriceBounds(p);
      return poiMax >= lowBudget && poiMin <= highBudget;
    });
  }, [manualApiPois, manualMinBudget, manualMaxBudget]);

  const activeDropdown = getDropdownConfig();

  return (
    <View style={styles.root}>
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: topInset + 12 }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onBack}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.darkPurple} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {isEditing ? 'Setting Trip' : 'Buat Rencana Baru'}
        </Text>
      </View>

      <ScrollView
        scrollEnabled={scrollEnabled}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nama Rencana Perjalanan */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionLabel}>Nama Rencana Perjalanan</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Contoh: Wisata Kuliner Braga"
            placeholderTextColor={COLORS.textMuted}
            style={styles.titleInput}
          />
        </View>

        {/* Pemilih Mode: Otomatis vs Manual */}
        <View style={styles.modeToggleRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setMode('auto')}
            style={[styles.modeBtn, mode === 'auto' && styles.modeBtnActive]}
          >
            <MaterialCommunityIcons
              name="auto-fix"
              size={17}
              color={mode === 'auto' ? COLORS.white : COLORS.darkPurple}
            />
            <Text
              style={[
                styles.modeBtnText,
                mode === 'auto' && styles.modeBtnTextActive,
              ]}
            >
              Buat Otomatis
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setMode('manual')}
            style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
          >
            <Ionicons
              name="hand-left-outline"
              size={17}
              color={mode === 'manual' ? COLORS.white : COLORS.darkPurple}
            />
            <Text
              style={[
                styles.modeBtnText,
                mode === 'manual' && styles.modeBtnTextActive,
              ]}
            >
              Pilih Manual
            </Text>
          </TouchableOpacity>
        </View>

        {/* Panel Input Mode Otomatis */}
        {mode === 'auto' && (
          <View style={styles.cardSection}>
            {/* 1. Jam Mulai Bebas */}
            <Text style={styles.sectionLabel}>1. Jam Mulai Jalan-Jalan</Text>
            <View style={styles.timeWheelWrapper}>
              <View style={styles.timeWheelBox}>
                <TouchableOpacity
                  onPress={() => updateStartTime(startHour + 1, startMinute)}
                  style={styles.wheelArrowBtn}
                >
                  <Ionicons name="chevron-up" size={20} color={COLORS.darkPurple} />
                </TouchableOpacity>
                <Text style={styles.wheelValueText}>
                  {String(startHour).padStart(2, '0')}
                </Text>
                <TouchableOpacity
                  onPress={() => updateStartTime(startHour - 1, startMinute)}
                  style={styles.wheelArrowBtn}
                >
                  <Ionicons name="chevron-down" size={20} color={COLORS.darkPurple} />
                </TouchableOpacity>
              </View>

              <Text style={styles.wheelColon}>:</Text>

              <View style={styles.timeWheelBox}>
                <TouchableOpacity
                  onPress={() => updateStartTime(startHour, startMinute + 5)}
                  style={styles.wheelArrowBtn}
                >
                  <Ionicons name="chevron-up" size={20} color={COLORS.darkPurple} />
                </TouchableOpacity>
                <Text style={styles.wheelValueText}>
                  {String(startMinute).padStart(2, '0')}
                </Text>
                <TouchableOpacity
                  onPress={() => updateStartTime(startHour, startMinute - 5)}
                  style={styles.wheelArrowBtn}
                >
                  <Ionicons name="chevron-down" size={20} color={COLORS.darkPurple} />
                </TouchableOpacity>
              </View>

              <Text style={styles.timeHelperNote}>WIB (24 Jam)</Text>
            </View>

            {/* 2. Kategori Utama & Subkategori */}
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
              2. Kategori POI yang Diinginkan
            </Text>
            <View style={styles.wrapChips}>
              {['Kuliner', 'Hiburan'].map((cat) => {
                const active = selectedMainCats.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => toggleMainCategory(cat)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipText, active && styles.chipTextActive]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.subSectionLabel, { marginTop: 10 }]}>
              Pilih Subkategori (opsional, bisa pilih lebih dari satu):
            </Text>
            <View style={styles.wrapChips}>
              {availableSubcategories.map((sub) => {
                const active = selectedSubcats.includes(sub);
                return (
                  <TouchableOpacity
                    key={sub}
                    onPress={() => toggleSubcategory(sub)}
                    style={[styles.subChip, active && styles.subChipActive]}
                  >
                    <Text
                      style={[
                        styles.subChipText,
                        active && styles.subChipTextActive,
                      ]}
                    >
                      {sub}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Anggaran / Budget Jalan-Jalan */}
            <Text style={[styles.sectionLabel, { marginTop: 14 }]}>
              3. Anggaran / Budget Jalan-Jalan (Rp)
            </Text>
            <BudgetRangeSlider
              minVal={minBudget}
              maxVal={maxBudget}
              onChangeRange={handleSliderRangeChange}
            />

            <View style={styles.budgetInputsRow}>
              <View style={styles.budgetInputBox}>
                <Text style={styles.budgetInputCaption}>Batas Bawah (Rp)</Text>
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
                <Text style={styles.budgetInputCaption}>Batas Atas (Rp)</Text>
                <View style={styles.rupiahField}>
                  <Text style={styles.rpPrefix}>Rp</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={maxBudgetInput}
                    onChangeText={handleMaxBudgetText}
                    placeholder="250000"
                    style={styles.rpInput}
                  />
                </View>
              </View>
            </View>
            <Text style={styles.budgetPreviewText}>
              Rentang: Rp{formatRupiahNumber(minBudgetInput)} – Rp
              {formatRupiahNumber(maxBudgetInput)}
            </Text>

            {/* 4. Jumlah Destinasi Maksimum */}
            <View style={styles.stepperRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionLabel}>
                  4. Jumlah Destinasi Maksimum
                </Text>
                <Text style={styles.helperSubText}>
                  Maksimal 12 destinasi • Diurutkan berdasarkan jarak terdekat
                </Text>
              </View>

              <View style={styles.stepperControl}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={maxStopCount <= 1}
                  onPress={() => setMaxStopCount((c) => Math.max(1, c - 1))}
                  style={[
                    styles.stepperBtn,
                    maxStopCount <= 1 && { opacity: 0.35 },
                  ]}
                >
                  <Ionicons name="remove" size={18} color={COLORS.darkPurple} />
                </TouchableOpacity>

                <Text style={styles.stepperNumber}>{maxStopCount}</Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={maxStopCount >= MAX_DESTINATIONS}
                  onPress={() =>
                    setMaxStopCount((c) => Math.min(MAX_DESTINATIONS, c + 1))
                  }
                  style={[
                    styles.stepperBtn,
                    maxStopCount >= MAX_DESTINATIONS && { opacity: 0.35 },
                  ]}
                >
                  <Ionicons name="add" size={18} color={COLORS.darkPurple} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleGenerateAutoPlan}
              style={styles.generateBtn}
            >
              <MaterialCommunityIcons
                name="auto-fix"
                size={18}
                color={COLORS.white}
              />
              <Text style={styles.generateBtnText}>
                Generate Rencana Otomatis
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Panel Pemilih POI Mode Manual */}
        {mode === 'manual' && (
          <View style={styles.cardSection}>
            <Text style={styles.sectionLabel}>Search Destination</Text>

            {/* Search Input */}
            <View style={styles.searchInputBox}>
              <TextInput
                returnKeyType="search"
                style={styles.searchInput}
                placeholder="Type Something..."
                placeholderTextColor={COLORS.textMuted}
                value={manualQuery}
                onChangeText={setManualQuery}
              />
              {manualQuery.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setManualQuery('')}
                  style={styles.clearIconBtn}
                >
                  <Ionicons
                    name="close-circle"
                    size={19}
                    color={COLORS.textMuted}
                  />
                </TouchableOpacity>
              ) : null}
              <Ionicons name="search" size={20} color={COLORS.darkPurple} />
            </View>

            {/* Baris Pill Filter */}
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

            {/* Filter Budget (Slider + Input Rupiah) */}
            <View style={styles.manualBudgetBox}>
              <Text style={styles.subSectionLabel}>
                Filter Budget (Rp{formatRupiahNumber(manualMinBudget)} – Rp
                {formatRupiahNumber(manualMaxBudget)})
              </Text>
              <BudgetRangeSlider
                minVal={manualMinBudget}
                maxVal={manualMaxBudget}
                onChangeRange={handleManualSliderRangeChange}
              />
              <View style={styles.budgetInputsRow}>
                <View style={styles.budgetInputBox}>
                  <View style={styles.rupiahField}>
                    <Text style={styles.rpPrefix}>Rp</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={manualMinBudgetInput}
                      onChangeText={handleManualMinBudgetText}
                      placeholder="0"
                      style={styles.rpInput}
                    />
                  </View>
                </View>

                <Text style={[styles.budgetDash, { marginTop: 0 }]}>—</Text>

                <View style={styles.budgetInputBox}>
                  <View style={styles.rupiahField}>
                    <Text style={styles.rpPrefix}>Rp</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={manualMaxBudgetInput}
                      onChangeText={handleManualMaxBudgetText}
                      placeholder="500000"
                      style={styles.rpInput}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Header Jumlah Hasil & Reset Filter */}
            <View style={styles.resultHeader}>
              <Text style={styles.resultCountText}>
                Menampilkan {filteredManualPois.length} destinasi
              </Text>
              {hasActiveFilters && (
                <TouchableOpacity onPress={resetAllFilters} activeOpacity={0.8}>
                  <Text style={styles.resetText}>Reset Filter</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Daftar Card POI: Maksimal 5 POI terlihat sekaligus, sisa digulir atas-bawah */}
            {loadingManualPois ? (
              <ActivityIndicator
                size="small"
                color={COLORS.primaryPurple}
                style={{ marginVertical: 20 }}
              />
            ) : filteredManualPois.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons
                  name="search-outline"
                  size={28}
                  color={COLORS.textMuted}
                />
                <Text style={styles.emptyStopsText}>
                  No destinations match your search or filter.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.manualPoiScrollBox}
                contentContainerStyle={styles.manualPoiListVertical}
                nestedScrollEnabled={true}
                showsVerticalScrollIndicator={true}
              >
                {filteredManualPois.map((poi) => {
                  const isAdded = isPoiAlreadyInStops(poi);
                  // Real rating only: unrated places say so instead of a placeholder.
                  const reviewCount = poi.reviewsCount ?? poi.reviews_count ?? 0;
                  const ratingVal = Number(poi.rating) > 0
                    ? `${Number(poi.rating).toFixed(1)} (${reviewCount})`
                    : 'Belum ada rating';

                  return (
                    <View
                      key={String(poi.id)}
                      style={[
                        styles.poiCard,
                        isAdded && styles.poiCardAdded,
                      ]}
                    >
                      <PoiFirstImage poi={poi} style={styles.manualPoiImage} />

                      <View style={styles.poiCardBody}>
                        {/* Judul POI tampil utuh tanpa terpotong badge kategori */}
                        <View style={styles.poiTopRow}>
                          <Text style={styles.poiName} numberOfLines={2}>
                            {poi.name}
                          </Text>
                        </View>

                        <View style={styles.ratingRow}>
                          <Ionicons
                            name="star"
                            size={13}
                            color={COLORS.darkPurple}
                          />
                          <Text style={styles.ratingText}>{ratingVal}</Text>
                          <Text style={styles.dotSeparator}>•</Text>
                          <Text style={styles.hoursText} numberOfLines={1}>
                            {poi.hoursLabel}
                          </Text>
                        </View>

                        {/* Tag Kategori dipindahkan ke atas Budget */}
                        {poi.subCategory ? (
                          <View style={styles.categoryTagRow}>
                            <View style={styles.categoryBadge}>
                              <Text style={styles.categoryBadgeText}>
                                {poi.subCategory}
                              </Text>
                            </View>
                          </View>
                        ) : null}

                        {/* Budget & Tombol Tambah (tanpa tag Environment) */}
                        <View style={styles.cardBottomActionRow}>
                          <View style={styles.metaPillRow}>
                            <View style={styles.metaChip}>
                              <Text style={styles.metaChipText}>
                                {formatPoiBudgetBadge(poi)}
                              </Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            activeOpacity={0.85}
                            disabled={isAdded}
                            onPress={() => handleAddManualPoi(poi)}
                            style={[
                              styles.addMiniBadge,
                              isAdded && styles.addMiniBadgeDisabled,
                            ]}
                          >
                            <Ionicons
                              name={isAdded ? 'checkmark-circle' : 'add'}
                              size={14}
                              color={COLORS.white}
                            />
                            <Text style={styles.addMiniText}>
                              {isAdded ? 'Ditambahkan' : 'Tambah'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}

        {/* Daftar Urutan Destinasi (Drag-and-Drop + Edit Jam Real-Time) */}
        <View style={styles.cardSection}>
          <View style={styles.stopsHeaderRow}>
            <Text style={styles.sectionLabel}>
              Urutan Destinasi ({stops.length} Tempat)
            </Text>
            <Text style={styles.helperSubText}>
              Tahan & geser ikon ⋮⋮ untuk ubah urutan • Ketuk jam untuk ubah waktu
            </Text>
          </View>

          {stops.length === 0 ? (
            <Text style={styles.emptyStopsText}>
              Belum ada destinasi. Tekan "Generate Rencana Otomatis" atau pilih secara manual.
            </Text>
          ) : (
            stops.map((stop, idx) => (
              <DraggableStopRow
                key={stop.stopKey}
                stop={stop}
                index={idx}
                totalCount={stops.length}
                onPressTime={handleOpenStopTimeModal}
                onRemove={handleRemoveStop}
                onDragStart={() => setScrollEnabled(false)}
                onDragEnd={() => setScrollEnabled(true)}
                onMoveIndex={handleMoveStopIndex}
              />
            ))
          )}
        </View>

        {/* Tombol Simpan Rencana */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleSave}
          style={styles.savePlanBtn}
        >
          <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
          <Text style={styles.savePlanBtnText}>Simpan Rencana Perjalanan</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Dropdown Filter Overlay */}
      <Modal
        visible={Boolean(activeDropdown)}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenDropdown(null)}
      >
        {activeDropdown && (
          <TouchableOpacity
            style={styles.dropdownBackdrop}
            activeOpacity={1}
            onPress={() => setOpenDropdown(null)}
          >
            <View
              style={styles.dropdownSheet}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.dropdownSheetHeader}>
                <Text style={styles.dropdownSheetTitle}>
                  {activeDropdown.title}
                </Text>
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
      </Modal>

      {/* Pop-up Pesan Jika Tidak Ada Destinasi yang Cocok */}
      <Modal
        visible={noMatchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoMatchModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.alertModalCard}>
            <View style={styles.alertIconCircle}>
              <Ionicons
                name="alert-circle-outline"
                size={32}
                color={COLORS.darkPurple}
              />
            </View>
            <Text style={styles.alertModalMessage}>
              Maaf, tidak ada destinasi yang cocok dengan keinginanmu
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setNoMatchModalVisible(false)}
              style={styles.alertOkBtn}
            >
              <Text style={styles.alertOkBtnText}>Mengerti</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Ubah Jam Tiap Destinasi (Validasi > Jam Titik Sebelumnya) */}
      <Modal
        visible={editingStopIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingStopIndex(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.timeModalCard}>
            <Text style={styles.timeModalTitle}>
              Atur Jam Kunjungan ({stops[editingStopIndex]?.name})
            </Text>
            {editingStopIndex > 0 && (
              <Text style={styles.timeModalHint}>
                Harus lebih dari titik sebelumnya ({stops[editingStopIndex - 1]?.time})
              </Text>
            )}

            <View style={styles.timeWheelWrapper}>
              <View style={styles.timeWheelBox}>
                <TouchableOpacity
                  onPress={() => setTempHour((h) => (h + 1) % 24)}
                  style={styles.wheelArrowBtn}
                >
                  <Ionicons name="chevron-up" size={22} color={COLORS.darkPurple} />
                </TouchableOpacity>
                <Text style={styles.wheelValueText}>
                  {String(tempHour).padStart(2, '0')}
                </Text>
                <TouchableOpacity
                  onPress={() => setTempHour((h) => (h - 1 + 24) % 24)}
                  style={styles.wheelArrowBtn}
                >
                  <Ionicons name="chevron-down" size={22} color={COLORS.darkPurple} />
                </TouchableOpacity>
              </View>

              <Text style={styles.wheelColon}>:</Text>

              <View style={styles.timeWheelBox}>
                <TouchableOpacity
                  onPress={() => setTempMinute((m) => (m + 5) % 60)}
                  style={styles.wheelArrowBtn}
                >
                  <Ionicons name="chevron-up" size={22} color={COLORS.darkPurple} />
                </TouchableOpacity>
                <Text style={styles.wheelValueText}>
                  {String(tempMinute).padStart(2, '0')}
                </Text>
                <TouchableOpacity
                  onPress={() => setTempMinute((m) => (m - 5 + 60) % 60)}
                  style={styles.wheelArrowBtn}
                >
                  <Ionicons name="chevron-down" size={22} color={COLORS.darkPurple} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setEditingStopIndex(null)}
                style={styles.modalCancelBtn}
              >
                <Text style={styles.modalCancelText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmStopTime}
                style={styles.modalConfirmBtn}
              >
                <Text style={styles.modalConfirmText}>Terapkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.softLilacBg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    backgroundColor: COLORS.softLilacBg,
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
    gap: 14,
  },
  cardSection: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    padding: 14,
  },
  sectionLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  subSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  titleInput: {
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.softLilacBg,
  },
  modeToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
    borderWidth: 1.8,
    borderColor: COLORS.primaryPurple,
    backgroundColor: COLORS.white,
  },
  modeBtnActive: {
    backgroundColor: COLORS.darkPurple,
    borderColor: COLORS.darkPurple,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.darkPurple,
  },
  modeBtnTextActive: {
    color: COLORS.white,
  },
  timeWheelWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  timeWheelBox: {
    alignItems: 'center',
    backgroundColor: COLORS.softLilacBg,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 4,
    minWidth: 64,
  },
  wheelArrowBtn: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  wheelValueText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.darkPurple,
  },
  wheelColon: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.darkPurple,
  },
  timeHelperNote: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginLeft: 6,
  },
  wrapChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.mediumPurple,
    backgroundColor: COLORS.white,
  },
  chipActive: {
    backgroundColor: COLORS.darkPurple,
    borderColor: COLORS.darkPurple,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  subChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    borderWidth: 1.2,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.softLilacBg,
  },
  subChipActive: {
    backgroundColor: COLORS.primaryPurple,
    borderColor: COLORS.primaryPurple,
  },
  subChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  subChipTextActive: {
    color: COLORS.white,
  },
  sliderContainer: {
    height: 36,
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
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
    marginTop: 6,
  },
  budgetInputBox: {
    flex: 1,
  },
  budgetInputCaption: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
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
    marginTop: 14,
  },
  budgetPreviewText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.primaryPurple,
    marginTop: 6,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    gap: 10,
  },
  stepperControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.softLilacBg,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 12,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.lavenderTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.darkPurple,
    minWidth: 20,
    textAlign: 'center',
  },
  generateBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingVertical: 11,
  },
  generateBtnText: {
    color: COLORS.white,
    fontSize: 13.5,
    fontWeight: '700',
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
  manualBudgetBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  resultCountText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryPurple,
  },
  manualPoiScrollBox: {
    maxHeight: 545,
  },
  manualPoiListVertical: {
    gap: 10,
    paddingBottom: 4,
  },
  manualPoiImage: {
    width: 86,
    height: 86,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.lavenderTint,
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
  poiCardAdded: {
    borderColor: COLORS.mediumPurple,
    backgroundColor: COLORS.lavenderTint,
  },
  poiCardBody: {
    flex: 1,
    justifyContent: 'space-between',
  },
  poiTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  poiName: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  categoryTagRow: {
    flexDirection: 'row',
    marginTop: 5,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
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
    marginTop: 3,
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
  cardBottomActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 5,
  },
  metaPillRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  metaChip: {
    backgroundColor: COLORS.softLilacBg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metaChipText: {
    fontSize: 10,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  addMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.darkPurple,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 3,
  },
  addMiniBadgeDisabled: {
    backgroundColor: COLORS.mediumPurple,
    opacity: 0.78,
  },
  addMiniText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 6,
  },
  stopsHeaderRow: {
    marginBottom: 8,
  },
  helperSubText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: -4,
  },
  emptyStopsText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 10,
  },
  stopEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    backgroundColor: COLORS.white,
    gap: 7,
  },
  stopEditRowDragging: {
    backgroundColor: COLORS.lavenderTint,
    borderRadius: RADIUS.sm,
    elevation: 4,
  },
  dragGripBtn: {
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  orderBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.darkPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: {
    color: COLORS.white,
    fontSize: 11.5,
    fontWeight: '700',
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lavenderTint,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    gap: 4,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.darkPurple,
  },
  stopEditName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  stopEditCat: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  iconActionBtn: {
    padding: 4,
  },
  savePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.darkPurple,
    borderRadius: RADIUS.pill,
    paddingVertical: 14,
    elevation: 3,
  },
  savePlanBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(49, 20, 101, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  alertModalCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    padding: 22,
    alignItems: 'center',
  },
  alertIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.lavenderTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  alertModalMessage: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
  alertOkBtn: {
    backgroundColor: COLORS.darkPurple,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 28,
    paddingVertical: 10,
  },
  alertOkBtnText: {
    color: COLORS.white,
    fontSize: 13.5,
    fontWeight: '700',
  },
  timeModalCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    padding: 20,
    alignItems: 'center',
  },
  timeModalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  timeModalHint: {
    fontSize: 12,
    color: COLORS.primaryPurple,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.darkPurple,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.white,
  },
});