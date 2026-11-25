import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  ScrollView,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, {
  Marker,
  Polygon,
  Polyline,
  PROVIDER_GOOGLE,
} from 'react-native-maps';
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import {
  BRAGA_REGION,
  BRAGA_POIS,
  BRAGA_ZONE_POLYGON,
  BRAGA_GRAY_MAP_STYLE,
} from '../constants/bragaMapData';
import {
  fetchWalkingRoute,
  formatDistance,
  formatDuration,
} from '../utils/directionsApi';
import { useForegroundLocation } from '../hooks/useForegroundLocation';
import { createRouteRequestTracker } from '../utils/routeRequestTracker';

// Koordinat cadangan di ruas Jl. Braga jika izin GPS belum aktif / di dalam ruangan
const DEFAULT_USER_ORIGIN = {
  latitude: -6.9182,
  longitude: 107.6093,
};

const USER_LOCATION_ID = '__USER_GPS__';
const DEFAULT_STAY_MINUTES = 60;

function haversineMeters(a, b) {
  if (!a || !b) return 0;
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

function estimateWalkMinutes(fromCoord, toCoord) {
  const meters = haversineMeters(fromCoord, toCoord);
  return Math.max(2, Math.ceil(meters / 75));
}

function formatDateToTripTime(dateObj) {
  const h = String(dateObj.getHours()).padStart(2, '0');
  const m = String(dateObj.getMinutes()).padStart(2, '0');
  return `${h}.${m}`;
}

function normalizePoiOption(item) {
  const localMeta = BRAGA_POIS.find((b) => b.id === item.id);
  const lat = Number(
    item.coordinate?.latitude ?? item.latitude ?? item.lat ?? localMeta?.latitude
  );
  const lng = Number(
    item.coordinate?.longitude ?? item.longitude ?? item.lng ?? localMeta?.longitude
  );

  return {
    ...localMeta,
    ...item,
    id: String(item.id || item.name),
    name: item.name || 'Titik Braga',
    category: item.category || localMeta?.category || 'POI Braga',
    coordinate: {
      latitude: Number.isFinite(lat) ? lat : BRAGA_REGION.latitude,
      longitude: Number.isFinite(lng) ? lng : BRAGA_REGION.longitude,
    },
  };
}

export default function NavigationScreen({
  poi,
  pois = BRAGA_POIS,
  tripStops = null,
  existingTripCount = 0,
  onSaveAsTrip,
  onBack,
}) {
  const insets = useSafeAreaInsets();
  const topInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? StatusBar.currentHeight || 28
      : 44;

  const mapRef = useRef(null);
  const routeTracker = useMemo(() => createRouteRequestTracker(haversineMeters), []);

  const availablePois = useMemo(() => {
    const source = Array.isArray(pois) && pois.length > 0 ? pois : BRAGA_POIS;
    return source.map(normalizePoiOption);
  }, [pois]);

  // Normalisasi rangkaian pemberhentian jika dibuka dari tombol "Pakai" di TripScreen / HomeScreen
  const normalizedTripStops = useMemo(() => {
    if (!Array.isArray(tripStops) || tripStops.length === 0) return [];
    return tripStops.map((stop) => {
      const matched = availablePois.find(
        (item) =>
          (stop.id && String(item.id) === String(stop.id)) ||
          item.name.toLowerCase() === String(stop.name || '').toLowerCase()
      );
      return matched
        ? { ...matched, ...stop, coordinate: matched.coordinate }
        : normalizePoiOption(stop);
    });
  }, [tripStops, availablePois]);

  const isTripChainMode = normalizedTripStops.length > 0;

  // Baca GPS perangkat secara real-time
  const locationState = useForegroundLocation(true);
  const rawCoords =
    locationState?.sample ||
    locationState?.location?.coords ||
    locationState?.coords ||
    locationState?.location ||
    locationState;

  const hasLiveGps =
    Number.isFinite(Number(rawCoords?.latitude)) &&
    Number.isFinite(Number(rawCoords?.longitude));

  const userGpsCoord = useMemo(() => {
    if (hasLiveGps) {
      return {
        latitude: Number(rawCoords.latitude),
        longitude: Number(rawCoords.longitude),
      };
    }
    return DEFAULT_USER_ORIGIN;
  }, [hasLiveGps, rawCoords?.latitude, rawCoords?.longitude]);

  const resolveInitialDestination = (targetProp) => {
    if (normalizedTripStops.length > 0) {
      return normalizedTripStops[0];
    }
    if (targetProp) {
      const matched = availablePois.find(
        (item) =>
          (targetProp.id && String(item.id) === String(targetProp.id)) ||
          item.name.toLowerCase() === String(targetProp.name || '').toLowerCase()
      );
      return matched || normalizePoiOption(targetProp);
    }
    return availablePois[1] || availablePois[0];
  };

  // State daftar POI sementara untuk navigasi non-Trip (dari Explore / HomeScreen)
  const [adHocStops, setAdHocStops] = useState(() => {
    if (normalizedTripStops.length > 0) return [];
    const initial = resolveInitialDestination(poi);
    return initial ? [initial] : [];
  });

  // Gabungan daftar pemberhentian aktif (Trip resmi vs rute multi-POI non-Trip)
  const activeRouteStops = isTripChainMode ? normalizedTripStops : adHocStops;
  const hasMultiStopRoute =
    isTripChainMode || (!isTripChainMode && adHocStops.length > 1);
  const canSaveAdHocAsTrip = !isTripChainMode && adHocStops.length > 1;

  const [currentStopIndex, setCurrentStopIndex] = useState(0);

  // State pilihan titik awal & tujuan
  const [originSelection, setOriginSelection] = useState(
    /** @type {any} */ (USER_LOCATION_ID)
  );
  const [destSelection, setDestSelection] = useState(/** @returns {any} */ () =>
    resolveInitialDestination(poi)
  );

  // State Pop-up "Simpan sebagai Trip"
  const [saveTripModalVisible, setSaveTripModalVisible] = useState(false);
  const savingTrip = useRef(false);
  const [newTripTitle, setNewTripTitle] = useState('');

  // Sinkronkan origin & destination secara berantai saat mode Trip atau Multi-POI aktif
  useEffect(() => {
    if (!hasMultiStopRoute || activeRouteStops.length === 0) return;
    const safeIdx = Math.min(currentStopIndex, activeRouteStops.length - 1);
    if (safeIdx === 0) {
      setOriginSelection(USER_LOCATION_ID);
    } else {
      setOriginSelection(activeRouteStops[safeIdx - 1]);
    }
    setDestSelection(activeRouteStops[safeIdx]);
  }, [hasMultiStopRoute, currentStopIndex, activeRouteStops]);

  // State modal pemilih titik ('origin' | 'destination' | 'add_stop') & daftar langkah
  const [pickerTarget, setPickerTarget] = useState(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [showAllSteps, setShowAllSteps] = useState(false);

  // State data rute dari API
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeSteps, setRouteSteps] = useState([]);
  const [routeError, setRouteError] = useState('');
  const [routeRetry, setRouteRetry] = useState(0);
  useEffect(() => () => { routeTracker.dispose(); }, [routeTracker]);
  const [baseDistanceMeters, setBaseDistanceMeters] = useState(0);
  const [baseDurationSeconds, setBaseDurationSeconds] = useState(60);

  const isOriginUser = originSelection === USER_LOCATION_ID;
  const isDestUser = destSelection === USER_LOCATION_ID;

  const originText = isOriginUser
    ? hasLiveGps
      ? 'Your Location (GPS)'
      : 'Your Location (Jl. Braga)'
    : originSelection?.name || 'Pilih Titik Awal';

  const targetText = isDestUser
    ? hasLiveGps
      ? 'Your Location (GPS)'
      : 'Your Location (Jl. Braga)'
    : destSelection?.name || 'Pilih Tujuan';

  const activeOriginCoord = isOriginUser
    ? userGpsCoord
    : originSelection?.coordinate || DEFAULT_USER_ORIGIN;

  const activeDestCoord = isDestUser
    ? userGpsCoord
    : destSelection?.coordinate ||
      availablePois[0]?.coordinate ||
      DEFAULT_USER_ORIGIN;

  // Fetch rute jalan kaki berbasis jalan raya/trotoar setiap kali origin/destination berubah signifikan (>12m)
  useEffect(() => {
    const sameSelectionKey = `${isOriginUser ? 'GPS' : originSelection?.id}->${
      isDestUser ? 'GPS' : destSelection?.id
    }`;
    const requestId = routeTracker.start(sameSelectionKey, activeOriginCoord, activeDestCoord);
    if (requestId === null) return;
    fetchWalkingRoute(activeOriginCoord, activeDestCoord, targetText)
      .then((res) => {
        if (!routeTracker.isCurrent(requestId)) return;
        setRouteError('');
        setRouteCoords(res.coordinates);
        setRouteSteps(res.steps || []);
        setBaseDistanceMeters(res.distanceMeters || 0);
        setBaseDurationSeconds(res.durationSeconds || 60);

        if (res.coordinates.length > 1) {
          mapRef.current?.fitToCoordinates(res.coordinates, {
            edgePadding: { top: 100, right: 60, bottom: 130, left: 60 },
            animated: true,
          });
        }
      })
      .catch(() => {
        if (!routeTracker.isCurrent(requestId)) return;
        setRouteCoords([]);
        setRouteSteps([]);
        setBaseDistanceMeters(0);
        setBaseDurationSeconds(0);
        setRouteError('Rute belum tersedia. Periksa koneksi lalu pilih kembali tujuan.');
      });
  }, [
    activeOriginCoord.latitude,
    activeOriginCoord.longitude,
    activeDestCoord.latitude,
    activeDestCoord.longitude,
    targetText,
    routeRetry,
    routeTracker,
  ]);

  // Hitung ETA real-time, sisa jarak, dan step aktif saat pengguna berjalan
  const liveNavigation = useMemo(() => {
    const directRemaining = haversineMeters(activeOriginCoord, activeDestCoord);
    const remainingMeters =
      baseDistanceMeters > 0
        ? Math.min(baseDistanceMeters, Math.max(directRemaining, 0))
        : directRemaining;

    const remainingSeconds =
      hasLiveGps && isOriginUser
        ? Math.max(0, Math.round(remainingMeters / 1.25))
        : baseDurationSeconds;

    if (hasLiveGps && isOriginUser && remainingMeters <= 12) {
      return {
        durationBadge: 'Tiba',
        etaSummary: `Anda telah tiba di ${targetText} (${formatDistance(
          remainingMeters
        )})`,
        activeStep: {
          instruction: `Tiba di tujuan: ${targetText}`,
          icon: 'flag-checkered',
        },
        activeStepIndex: Math.max(0, routeSteps.length - 1),
      };
    }

    let activeStepIndex = 0;
    if (hasLiveGps && isOriginUser && routeSteps.length > 1) {
      for (let i = 0; i < routeSteps.length - 1; i++) {
        const distToStepEnd = haversineMeters(
          userGpsCoord,
          routeSteps[i].endLocation
        );
        if (distToStepEnd < 15) {
          activeStepIndex = i + 1;
        } else {
          break;
        }
      }
    }

    const currentStep = routeSteps[activeStepIndex] || {
      instruction: `Jalan lurus sejauh ${formatDistance(
        remainingMeters
      )} menuju ${targetText}`,
      icon: 'arrow-up',
    };

    let liveInstruction = currentStep.instruction;
    if (
      hasLiveGps &&
      isOriginUser &&
      currentStep.endLocation &&
      !liveInstruction.toLowerCase().includes('tiba')
    ) {
      const distToNextTurn = haversineMeters(
        userGpsCoord,
        currentStep.endLocation
      );
      if (distToNextTurn > 5) {
        liveInstruction = liveInstruction.replace(
          /sejauh\s+\d+(\.\d+)?\s*(m|km)/i,
          `sejauh ${formatDistance(distToNextTurn)}`
        );
      }
    }

    const durLabel = formatDuration(remainingSeconds);
    const distLabel = formatDistance(remainingMeters);

    return {
      durationBadge: durLabel,
      etaSummary: `${durLabel} (${distLabel}) • Estimasi Jalan Kaki`,
      activeStep: {
        ...currentStep,
        instruction: liveInstruction,
      },
      activeStepIndex,
    };
  }, [
    activeOriginCoord,
    activeDestCoord,
    baseDistanceMeters,
    baseDurationSeconds,
    hasLiveGps,
    isOriginUser,
    routeSteps,
    targetText,
    userGpsCoord,
  ]);

  // Tukar titik hanya diizinkan jika BUKAN mode Trip
  const handleSwapPoints = () => {
    if (isTripChainMode) return;

    if (adHocStops.length > 1) {
      setAdHocStops((prev) => [...prev].reverse());
      setCurrentStopIndex(0);
      return;
    }

    const prevOrigin = originSelection;
    setOriginSelection(destSelection);
    setDestSelection(prevOrigin);
  };

  const handleSelectLocation = (chosenItem) => {
    if (pickerTarget === 'add_stop') {
      if (chosenItem !== USER_LOCATION_ID) {
        setAdHocStops((prev) => {
          const alreadyExists = prev.some(
            (s) => String(s.id) === String(chosenItem.id)
          );
          if (alreadyExists) return prev;
          const next = [...prev, chosenItem];
          if (next.length > 1) {
            setCurrentStopIndex(next.length - 1);
          }
          return next;
        });
      }
      setPickerTarget(null);
      setPickerQuery('');
      return;
    }

    if (pickerTarget === 'origin') {
      const isSameAsDest =
        (chosenItem === USER_LOCATION_ID && isDestUser) ||
        (chosenItem !== USER_LOCATION_ID &&
          !isDestUser &&
          String(chosenItem.id) === String(destSelection?.id));

      if (isSameAsDest) setDestSelection(originSelection);
      setOriginSelection(chosenItem);
    } else if (pickerTarget === 'destination') {
      const isSameAsOrigin =
        (chosenItem === USER_LOCATION_ID && isOriginUser) ||
        (chosenItem !== USER_LOCATION_ID &&
          !isOriginUser &&
          String(chosenItem.id) === String(originSelection?.id));

      if (isSameAsOrigin) setOriginSelection(destSelection);
      setDestSelection(chosenItem);

      if (!isTripChainMode && chosenItem !== USER_LOCATION_ID) {
        setAdHocStops((prev) => {
          if (prev.length <= 1) return [chosenItem];
          const updated = [...prev];
          const safeIdx = Math.min(currentStopIndex, updated.length - 1);
          updated[safeIdx] = chosenItem;
          return updated;
        });
      }
    }

    setPickerTarget(null);
    setPickerQuery('');
  };

  const handleRemoveAdHocStop = (stopId) => {
    setAdHocStops((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((s) => String(s.id) !== String(stopId));
      setCurrentStopIndex((curr) => Math.min(curr, next.length - 1));
      if (next.length === 1) {
        setOriginSelection(USER_LOCATION_ID);
        setDestSelection(next[0]);
      }
      return next;
    });
  };

  // Buka pop-up "Simpan sebagai Trip"
  const handleOpenSaveTripModal = () => {
    setNewTripTitle(`Trip Plan ${existingTripCount + 1}`);
    setSaveTripModalVisible(true);
  };

  // Konfirmasi "Jadikan Trip Baru" -> Hitung jam dari waktu user sekarang + estimasi waktu jalan kaki tiap POI
  const handleConfirmSaveAdHocTrip = async () => {
    if (savingTrip.current) return;
    if (adHocStops.length < 2) {
      setSaveTripModalVisible(false);
      return;
    }

    const cleanTitle =
      newTripTitle.trim() || `Trip Plan ${existingTripCount + 1}`;
    let cursorMs = Date.now();

    const scheduledStops = adHocStops.map((stopItem, idx) => {
      const prevCoord =
        idx === 0 ? userGpsCoord : adHocStops[idx - 1].coordinate;
      const walkMins = estimateWalkMinutes(prevCoord, stopItem.coordinate);

      if (idx === 0) {
        cursorMs += walkMins * 60 * 1000;
      } else {
        cursorMs += (DEFAULT_STAY_MINUTES + walkMins) * 60 * 1000;
      }

      return {
        ...stopItem,
        time: formatDateToTripTime(new Date(cursorMs)),
      };
    });

    const newTripPlan = {
      id: `plan-${Date.now()}`,
      title: cleanTitle,
      stops: scheduledStops,
    };

    savingTrip.current = true;
    try {
      const saved = await onSaveAsTrip?.(newTripPlan);
      if (saved) {
        setSaveTripModalVisible(false);
        Alert.alert('Trip Tersimpan', `"${cleanTitle}" berhasil ditambahkan ke daftar Trip.`);
      }
    } finally { savingTrip.current = false; }
  };

  const handleRecenter = () => {
    if (hasMultiStopRoute && activeRouteStops.length > 0) {
      mapRef.current?.fitToCoordinates(
        [userGpsCoord, ...activeRouteStops.map((s) => s.coordinate)],
        {
          edgePadding: { top: 100, right: 60, bottom: 130, left: 60 },
          animated: true,
        }
      );
    } else if (routeCoords.length > 1) {
      mapRef.current?.fitToCoordinates(routeCoords, {
        edgePadding: { top: 100, right: 60, bottom: 110, left: 60 },
        animated: true,
      });
    } else {
      mapRef.current?.animateToRegion(BRAGA_REGION, 600);
    }
  };

  // Gabungkan posisi real-time pengguna ke awal garis rute agar garis menyambung mulus ke titik jalan
  const renderedRouteCoords = useMemo(() => {
    if (routeCoords.length === 0) return [];
    return [activeOriginCoord, ...routeCoords, activeDestCoord];
  }, [routeCoords, activeOriginCoord, activeDestCoord]);

  const midPoint =
    renderedRouteCoords.length > 0
      ? renderedRouteCoords[Math.floor(renderedRouteCoords.length / 2)]
      : null;

  const filteredModalPois = availablePois.filter((item) =>
    item.name.toLowerCase().includes(pickerQuery.trim().toLowerCase())
  );

  // Cek apakah origin/destination sedang ditampilkan sebagai bagian dari pin bernomor multi-stop
  const isOriginInChain =
    hasMultiStopRoute &&
    !isOriginUser &&
    activeRouteStops.some((s) => String(s.id) === String(originSelection?.id));

  const isDestInChain =
    hasMultiStopRoute &&
    !isDestUser &&
    activeRouteStops.some((s) => String(s.id) === String(destSelection?.id));

  return (
    <View style={styles.root}>
      {/* Top Route Header */}
      <View style={[styles.topHeader, { paddingTop: topInset }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.darkPurple} />
          </TouchableOpacity>

          <View style={styles.routeIconsCol}>
            <View style={styles.originCircle} />
            <View style={styles.dottedLine} />
            <Ionicons name="location" size={22} color={COLORS.primaryPurple} />
          </View>

          <View style={styles.inputsCol}>
            <TouchableOpacity
              activeOpacity={isTripChainMode ? 1 : 0.85}
              disabled={isTripChainMode}
              onPress={() => {
                setPickerQuery('');
                setPickerTarget('origin');
              }}
              style={[
                styles.locationBox,
                isTripChainMode && styles.locationBoxLocked,
              ]}
            >
              <Text style={styles.locationBoxText} numberOfLines={1}>
                {originText}
              </Text>
              {!isTripChainMode && (
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={COLORS.primaryPurple}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={isTripChainMode ? 1 : 0.85}
              disabled={isTripChainMode}
              onPress={() => {
                setPickerQuery('');
                setPickerTarget('destination');
              }}
              style={[
                styles.locationBox,
                isTripChainMode && styles.locationBoxLocked,
              ]}
            >
              <Text style={styles.locationBoxText} numberOfLines={1}>
                {targetText}
              </Text>
              {!isTripChainMode && (
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color={COLORS.primaryPurple}
                />
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.rightControlsCol}>
            {isTripChainMode ? (
              <View
                style={styles.lockedTopIconWrap}
                accessibilityLabel="Mode Rencana Trip Aktif"
              >
                <MaterialIcons
                  name="gps-fixed"
                  size={20}
                  color={COLORS.textMuted}
                />
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setPickerQuery('');
                  setPickerTarget('add_stop');
                }}
                style={styles.addStopIconBtn}
                accessibilityLabel="Tambah POI Tujuan ke Rute"
              >
                <Ionicons name="add" size={20} color={COLORS.white} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={isTripChainMode ? 1 : 0.8}
              disabled={isTripChainMode}
              onPress={handleSwapPoints}
              style={isTripChainMode ? styles.switchBtnLocked : undefined}
              accessibilityLabel={
                isTripChainMode
                  ? 'Urutan Trip Terkunci'
                  : 'Tukar Titik Awal dan Tujuan'
              }
            >
              <MaterialCommunityIcons
                name="swap-vertical"
                size={26}
                color={
                  isTripChainMode ? COLORS.textMuted : COLORS.primaryPurple
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Google Maps / Apple Maps View Area */}
      <View style={styles.mapCanvas}>
        <MapView
          ref={mapRef}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          style={StyleSheet.absoluteFill}
          initialRegion={BRAGA_REGION}
          customMapStyle={
            Platform.OS === 'android' ? BRAGA_GRAY_MAP_STYLE : undefined
          }
          userInterfaceStyle="light"
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {/* Zona Koridor Jl. Braga */}
          <Polygon
            coordinates={BRAGA_ZONE_POLYGON}
            fillColor="rgba(126, 87, 194, 0.20)"
            strokeWidth={0}
          />
          <Polyline
            coordinates={[...BRAGA_ZONE_POLYGON, BRAGA_ZONE_POLYGON[0]]}
            strokeColor={COLORS.mediumPurple}
            strokeWidth={2}
            lineDashPattern={[8, 6]}
          />

          {/* Garis penghubung seluruh rangkaian destinasi (mode Trip & multi-POI non-Trip) */}
          {hasMultiStopRoute && activeRouteStops.length > 0 && (
            <Polyline
              coordinates={[
                userGpsCoord,
                ...activeRouteStops.map((s) => s.coordinate),
              ]}
              strokeColor="rgba(126, 87, 194, 0.42)"
              strokeWidth={3}
              lineDashPattern={[6, 6]}
            />
          )}

          {/* Jalur Rute Jalan Kaki Mengikuti Jalan (Segmen Aktif) */}
          {renderedRouteCoords.length > 1 && (
            <>
              <Polyline
                coordinates={renderedRouteCoords}
                strokeColor="rgba(91, 43, 191, 0.25)"
                strokeWidth={9}
              />
              <Polyline
                coordinates={renderedRouteCoords}
                strokeColor={COLORS.darkPurple}
                strokeWidth={5}
                lineDashPattern={[8, 6]}
              />
            </>
          )}

          {/* Origin Marker (jika tidak duplikat dengan pin bernomor multi-stop) */}
          {!isOriginInChain && (
            <Marker
              coordinate={activeOriginCoord}
              anchor={isOriginUser ? { x: 0.5, y: 0.5 } : { x: 0.5, y: 0.32 }}
              centerOffset={isOriginUser ? { x: 0, y: 0 } : { x: 0, y: 12 }}
            >
              {isOriginUser ? (
                <View style={styles.userPuck} />
              ) : (
                <View style={styles.customMarkerCol}>
                  <View style={styles.teardropPin}>
                    <View style={styles.pinInnerHole} />
                  </View>
                  <View style={styles.markerLabelBadge}>
                    <Text style={styles.mapLabelText} numberOfLines={1}>
                      {originText}
                    </Text>
                  </View>
                </View>
              )}
            </Marker>
          )}

          {/* Destination Marker (mode navigasi satuan 1 POI) */}
          {!isDestInChain && (
            <Marker
              coordinate={activeDestCoord}
              anchor={isDestUser ? { x: 0.5, y: 0.5 } : { x: 0.5, y: 0.32 }}
              centerOffset={isDestUser ? { x: 0, y: 0 } : { x: 0, y: 12 }}
            >
              {isDestUser ? (
                <View style={styles.userPuck} />
              ) : (
                <View style={styles.customMarkerCol}>
                  <View style={styles.teardropPin}>
                    <View style={styles.pinInnerHole} />
                  </View>
                  <View style={styles.markerLabelBadge}>
                    <Text style={styles.mapLabelText} numberOfLines={1}>
                      {targetText}
                    </Text>
                  </View>
                </View>
              )}
            </Marker>
          )}

          {/* Marker Bernomor Berantai untuk Trip maupun Multi-POI Non-Trip */}
          {hasMultiStopRoute &&
            activeRouteStops.map((stopItem, idx) => {
              const isCurrentTarget = idx === currentStopIndex;
              const isCompleted = idx < currentStopIndex;
              return (
                <Marker
                  key={`chain-${stopItem.id}-${idx}`}
                  coordinate={stopItem.coordinate}
                  anchor={{ x: 0.5, y: 0.32 }}
                  centerOffset={{ x: 0, y: 12 }}
                  onPress={() => setCurrentStopIndex(idx)}
                >
                  <View style={styles.customMarkerCol}>
                    <View
                      style={[
                        styles.teardropPin,
                        isCurrentTarget && styles.teardropPinActive,
                        isCompleted && styles.teardropPinCompleted,
                      ]}
                    >
                      <Text style={styles.chainPinNumber}>{idx + 1}</Text>
                    </View>
                    <View style={styles.markerLabelBadge}>
                      <Text style={styles.mapLabelText} numberOfLines={1}>
                        {stopItem.name}
                      </Text>
                    </View>
                  </View>
                </Marker>
              );
            })}

          {/* Walking Duration Bubble on Route Midpoint */}
          {midPoint && (
            <Marker coordinate={midPoint} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.walkBubble}>
                <MaterialIcons
                  name="directions-walk"
                  size={15}
                  color={COLORS.white}
                />
                <Text style={styles.walkBubbleText}>
                  {liveNavigation.durationBadge}
                </Text>
              </View>
            </Marker>
          )}
        </MapView>

        {/* Tombol Simpan sebagai Trip (kiri bawah peta, tepat di atas kiri slider panduan) */}
        {canSaveAdHocAsTrip && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenSaveTripModal}
            style={styles.saveTripFloatingBtn}
          >
            <Ionicons name="bookmark" size={16} color={COLORS.white} />
            <Text style={styles.saveTripFloatingBtnText}>
              Simpan sebagai Trip
            </Text>
          </TouchableOpacity>
        )}

        {/* Recenter Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleRecenter}
          style={styles.recenterBtn}
        >
          <MaterialIcons
            name="my-location"
            size={24}
            color={COLORS.darkPurple}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Turn-by-Turn Sheet (Real-time ETA & Panduan Langkah) */}
      <View style={styles.bottomSheet}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowAllSteps((prev) => !prev)}
          style={styles.dragHandleTouch}
        >
          <View style={styles.dragHandle} />
        </TouchableOpacity>

        {/* Bar Kontrol Navigasi Berantai (Trip maupun Multi-POI Non-Trip) */}
        {hasMultiStopRoute && (
          <View style={styles.chainProgressBar}>
            <View style={styles.chainProgressInfo}>
              {currentStopIndex > 0 && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    setCurrentStopIndex((prev) => Math.max(0, prev - 1))
                  }
                  style={styles.chainPrevBtn}
                >
                  <Ionicons
                    name="chevron-back"
                    size={15}
                    color={COLORS.darkPurple}
                  />
                </TouchableOpacity>
              )}
              <Text style={styles.chainProgressText} numberOfLines={1}>
                {isTripChainMode ? 'Stop' : 'Tujuan'} {currentStopIndex + 1}/
                {activeRouteStops.length}:{' '}
                {activeRouteStops[currentStopIndex]?.name}
              </Text>
            </View>

            {!isTripChainMode && activeRouteStops.length > 1 && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  handleRemoveAdHocStop(activeRouteStops[currentStopIndex]?.id)
                }
                style={styles.removeAdHocBtn}
                accessibilityLabel="Hapus Tujuan Ini"
              >
                <Ionicons name="close" size={14} color="#C62828" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (currentStopIndex < activeRouteStops.length - 1) {
                  setCurrentStopIndex((prev) => prev + 1);
                } else {
                  onBack?.();
                }
              }}
              style={styles.chainNextBtn}
            >
              <Text style={styles.chainNextBtnText}>
                {currentStopIndex < activeRouteStops.length - 1
                  ? 'Lanjut POI Berikutnya →'
                  : isTripChainMode
                  ? 'Selesai Trip ✓'
                  : 'Selesai Rute ✓'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.etaRow}>
          <View style={styles.etaLeft}>
            <MaterialIcons
              name="directions-walk"
              size={19}
              color={COLORS.primaryPurple}
            />
            <Text style={styles.etaText}>{liveNavigation.etaSummary}</Text>
          </View>

          {routeSteps.length > 1 && (
            <TouchableOpacity
              onPress={() => setShowAllSteps((prev) => !prev)}
              style={styles.stepsToggleBtn}
            >
              <Text style={styles.stepsToggleText}>
                {showAllSteps ? 'Tutup' : `${routeSteps.length} Langkah`}
              </Text>
              <Ionicons
                name={showAllSteps ? 'chevron-down' : 'chevron-up'}
                size={14}
                color={COLORS.primaryPurple}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Banner Panduan Rute Aktif */}
        {routeError ? (
          <TouchableOpacity accessibilityRole="button" onPress={() => { routeTracker.retry(); setRouteError(''); setRouteRetry(n => n + 1); }} style={styles.directionBanner}>
            <Text style={styles.directionInstruction}>{routeError} Ketuk untuk mencoba lagi.</Text>
          </TouchableOpacity>
        ) : <View style={styles.directionBanner}>
          <View style={styles.maneuverBadge}>
            <MaterialCommunityIcons
              name={liveNavigation.activeStep?.icon || 'arrow-up'}
              size={24}
              color={COLORS.white}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.directionLabel}>Panduan Berikutnya</Text>
            <Text style={styles.directionInstruction}>
              {liveNavigation.activeStep?.instruction}
            </Text>
          </View>
        </View>}

        {/* Daftar Lengkap Langkah Belokan (Jika Diketuk) */}
        {showAllSteps && routeSteps.length > 0 && (
          <ScrollView style={styles.stepsListContainer}>
            {routeSteps.map((step, idx) => {
              const isCurrent = idx === liveNavigation.activeStepIndex;
              return (
                <View
                  key={step.id || idx}
                  style={[
                    styles.stepItemRow,
                    isCurrent && styles.stepItemRowActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name={step.icon || 'arrow-up'}
                    size={18}
                    color={isCurrent ? COLORS.darkPurple : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.stepItemText,
                      isCurrent && styles.stepItemTextActive,
                    ]}
                  >
                    {step.instruction}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Pop-up Simpan sebagai Trip */}
      <Modal
        visible={saveTripModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSaveTripModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setSaveTripModalVisible(false)}
        >
          <View
            style={styles.saveTripModalCard}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.saveTripModalTitle}>Simpan sebagai Trip</Text>
            <Text style={styles.saveTripModalSub}>
              Masukkan nama rencana perjalanan untuk {adHocStops.length} POI
              terpilih:
            </Text>

            <TextInput
              value={newTripTitle}
              onChangeText={setNewTripTitle}
              placeholder="Contoh: Jalan Sore Braga"
              placeholderTextColor={COLORS.textMuted}
              style={styles.saveTripInput}
              autoFocus={true}
            />

            <View style={styles.saveTripBtnRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSaveTripModalVisible(false)}
                style={styles.saveTripCancelBtn}
              >
                <Text style={styles.saveTripCancelText}>Batalkan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleConfirmSaveAdHocTrip}
                style={styles.saveTripConfirmBtn}
              >
                <Text style={styles.saveTripConfirmText}>Jadikan Trip Baru</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal Pemilih Titik Awal / Titik Tujuan / Tambah POI */}
      <Modal
        visible={Boolean(pickerTarget)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPickerTarget(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPickerTarget(null)}
        >
          <View
            style={styles.modalCard}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickerTarget === 'origin'
                  ? 'Pilih Titik Awal Navigasi'
                  : pickerTarget === 'add_stop'
                  ? 'Tambah POI Tujuan ke Rute'
                  : 'Pilih POI Tujuan'}
              </Text>
              <TouchableOpacity onPress={() => setPickerTarget(null)}>
                <Ionicons name="close" size={22} color={COLORS.darkPurple} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBox}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <TextInput
                value={pickerQuery}
                onChangeText={setPickerQuery}
                placeholder="Cari POI di Jl. Braga..."
                placeholderTextColor={COLORS.textMuted}
                style={styles.modalSearchInput}
              />
            </View>

            <ScrollView style={styles.modalList}>
              {pickerTarget !== 'add_stop' && (
                <TouchableOpacity
                  style={[
                    styles.modalOptionRow,
                    ((pickerTarget === 'origin' && isOriginUser) ||
                      (pickerTarget === 'destination' && isDestUser)) &&
                      styles.modalOptionSelected,
                  ]}
                  onPress={() => handleSelectLocation(USER_LOCATION_ID)}
                >
                  <View style={styles.modalOptionIcon}>
                    <MaterialIcons
                      name="my-location"
                      size={18}
                      color={COLORS.primaryPurple}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalOptionTitle}>
                      Your Location (GPS)
                    </Text>
                    <Text style={styles.modalOptionSub}>
                      {hasLiveGps
                        ? 'Gunakan posisi GPS perangkat saat ini'
                        : 'Titik default koridor Jl. Braga'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}

              {filteredModalPois.map((item) => {
                const isAlreadyInAdHoc =
                  pickerTarget === 'add_stop' &&
                  adHocStops.some((s) => String(s.id) === String(item.id));

                const isSelected =
                  isAlreadyInAdHoc ||
                  (pickerTarget === 'origin' &&
                    !isOriginUser &&
                    String(originSelection?.id) === String(item.id)) ||
                  (pickerTarget === 'destination' &&
                    !isDestUser &&
                    String(destSelection?.id) === String(item.id));

                return (
                  <TouchableOpacity
                    key={item.id}
                    disabled={isAlreadyInAdHoc}
                    style={[
                      styles.modalOptionRow,
                      isSelected && styles.modalOptionSelected,
                    ]}
                    onPress={() => handleSelectLocation(item)}
                  >
                    <View style={styles.modalOptionIcon}>
                      <Ionicons
                        name="location"
                        size={18}
                        color={COLORS.primaryPurple}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalOptionTitle}>{item.name}</Text>
                      <Text style={styles.modalOptionSub} numberOfLines={1}>
                        {item.category}
                      </Text>
                    </View>
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
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.softLilacBg,
  },
  topHeader: {
    backgroundColor: COLORS.softLilacBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  routeIconsCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  originCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
  },
  dottedLine: {
    width: 2,
    height: 18,
    borderLeftWidth: 2,
    borderStyle: 'dotted',
    borderColor: COLORS.mediumPurple,
    marginVertical: 2,
  },
  inputsCol: {
    flex: 1,
    gap: 8,
  },
  locationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.8,
    borderColor: '#9E7CE0',
    borderRadius: 10,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  locationBoxLocked: {
    backgroundColor: COLORS.lavenderTint,
    borderColor: COLORS.borderSubtle,
  },
  locationBoxText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  rightControlsCol: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  lockedTopIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.45,
  },
  addStopIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.darkPurple,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  switchBtnLocked: {
    opacity: 0.35,
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#EAEAEA',
    position: 'relative',
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
  teardropPinActive: {
    backgroundColor: COLORS.darkPurple,
    transform: [{ scale: 1.12 }],
  },
  teardropPinCompleted: {
    backgroundColor: COLORS.mediumPurple,
    opacity: 0.78,
  },
  chainPinNumber: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
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
  walkBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkPurple,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    gap: 4,
    elevation: 3,
  },
  walkBubbleText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  userPuck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.lavenderTint,
    borderWidth: 2.5,
    borderColor: COLORS.primaryPurple,
  },
  saveTripFloatingBtn: {
    position: 'absolute',
    left: 18,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkPurple,
    borderWidth: 1.5,
    borderColor: COLORS.white,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 6,
    elevation: 4,
  },
  saveTripFloatingBtnText: {
    color: COLORS.white,
    fontSize: 12.5,
    fontWeight: '700',
  },
  recenterBtn: {
    position: 'absolute',
    right: 18,
    bottom: 18,
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
    backgroundColor: COLORS.softLilacBg,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    borderTopWidth: 2.5,
    borderColor: COLORS.primaryPurple,
    paddingTop: 6,
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
  chainProgressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 8,
  },
  chainProgressInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  chainPrevBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.lavenderTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeAdHocBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainProgressText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.darkPurple,
  },
  chainNextBtn: {
    backgroundColor: COLORS.darkPurple,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  chainNextBtnText: {
    color: COLORS.white,
    fontSize: 11.5,
    fontWeight: '700',
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  etaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  etaText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  stepsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lavenderTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    gap: 4,
  },
  stepsToggleText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  directionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  maneuverBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.darkPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  directionInstruction: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  stepsListContainer: {
    maxHeight: 150,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
  },
  stepItemRowActive: {
    backgroundColor: COLORS.lavenderTint,
  },
  stepItemText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.textSecondary,
  },
  stepItemTextActive: {
    fontWeight: '700',
    color: COLORS.darkPurple,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(49, 20, 101, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  saveTripModalCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    padding: 18,
  },
  saveTripModalTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  saveTripModalSub: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  saveTripInput: {
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.softLilacBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  saveTripBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveTripCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveTripCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  saveTripConfirmBtn: {
    flex: 1.2,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.darkPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveTripConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    padding: 16,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.softLilacBg,
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 10,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  modalList: {
    maxHeight: 340,
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    gap: 10,
  },
  modalOptionSelected: {
    backgroundColor: COLORS.lavenderTint,
  },
  modalOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.softLilacBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalOptionSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
