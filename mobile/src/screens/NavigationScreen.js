import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
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

// Koordinat cadangan di ruas Jl. Braga jika izin GPS belum aktif / di dalam ruangan
const DEFAULT_USER_ORIGIN = {
  latitude: -6.9182,
  longitude: 107.6093,
};

const USER_LOCATION_ID = '__USER_GPS__';

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

function normalizePoiOption(item) {
  const localMeta = BRAGA_POIS.find((b) => b.id === item.id) || {};
  const lat = Number(
    item.coordinate?.latitude ?? item.latitude ?? item.lat ?? localMeta.latitude
  );
  const lng = Number(
    item.coordinate?.longitude ?? item.longitude ?? item.lng ?? localMeta.longitude
  );

  return {
    ...localMeta,
    ...item,
    id: String(item.id || item.name),
    name: item.name || 'Titik Braga',
    category: item.category || localMeta.category || 'POI Braga',
    coordinate: {
      latitude: Number.isFinite(lat) ? lat : BRAGA_REGION.latitude,
      longitude: Number.isFinite(lng) ? lng : BRAGA_REGION.longitude,
    },
  };
}

export default function NavigationScreen({ poi, pois = BRAGA_POIS, onBack }) {
  const mapRef = useRef(null);
  const lastFetchedOriginRef = useRef(null);

  const availablePois = useMemo(() => {
    const source = Array.isArray(pois) && pois.length > 0 ? pois : BRAGA_POIS;
    return source.map(normalizePoiOption);
  }, [pois]);

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

  // State pilihan titik awal & tujuan
  const [originSelection, setOriginSelection] = useState(USER_LOCATION_ID);
  const [destSelection, setDestSelection] = useState(() =>
    resolveInitialDestination(poi)
  );

  // State modal pemilih titik & daftar langkah turn-by-turn
  const [pickerTarget, setPickerTarget] = useState(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [showAllSteps, setShowAllSteps] = useState(false);

  // State data rute dari API
  const [routeCoords, setRouteCoords] = useState([]);
  const [routeSteps, setRouteSteps] = useState([]);
  const [baseDistanceMeters, setBaseDistanceMeters] = useState(0);
  const [baseDurationSeconds, setBaseDurationSeconds] = useState(60);

  // Sinkronkan tujuan otomatis saat tombol "Directions" pada POI ditekan
  useEffect(() => {
    if (poi) {
      setOriginSelection(USER_LOCATION_ID);
      setDestSelection(resolveInitialDestination(poi));
    }
  }, [poi]);

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
    : destSelection?.coordinate || availablePois[0].coordinate;

  // Fetch rute jalan kaki berbasis jalan raya/trotoar setiap kali origin/destination berubah signifikan (>12m)
  useEffect(() => {
    let isMounted = true;

    const prev = lastFetchedOriginRef.current;
    const sameSelectionKey = `${isOriginUser ? 'GPS' : originSelection?.id}->${
      isDestUser ? 'GPS' : destSelection?.id
    }`;

    if (
      prev &&
      prev.key === sameSelectionKey &&
      haversineMeters(prev.origin, activeOriginCoord) < 12 &&
      haversineMeters(prev.dest, activeDestCoord) < 12
    ) {
      return;
    }

    lastFetchedOriginRef.current = {
      key: sameSelectionKey,
      origin: activeOriginCoord,
      dest: activeDestCoord,
    };

    fetchWalkingRoute(activeOriginCoord, activeDestCoord, targetText)
      .then((res) => {
        if (!isMounted) return;
        setRouteCoords(res.coordinates);
        setRouteSteps(res.steps || []);
        setBaseDistanceMeters(res.distanceMeters || 0);
        setBaseDurationSeconds(res.durationSeconds || 60);

        if (res.coordinates.length > 1) {
          mapRef.current?.fitToCoordinates(res.coordinates, {
            edgePadding: { top: 100, right: 60, bottom: 110, left: 60 },
            animated: true,
          });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        const straightDist = Math.max(
          10,
          haversineMeters(activeOriginCoord, activeDestCoord)
        );
        const estSec = Math.max(15, Math.round(straightDist / 1.25));
        setRouteCoords([activeOriginCoord, activeDestCoord]);
        setBaseDistanceMeters(straightDist);
        setBaseDurationSeconds(estSec);
        setRouteSteps([
          {
            id: 'fallback-0',
            instruction: `Jalan lurus di koridor Jl. Braga sejauh ${formatDistance(
              straightDist
            )} menuju ${targetText}`,
            distanceMeters: straightDist,
            distanceText: formatDistance(straightDist),
            icon: 'arrow-up',
            startLocation: activeOriginCoord,
            endLocation: activeDestCoord,
          },
        ]);
      });

    return () => {
      isMounted = false;
    };
  }, [
    activeOriginCoord.latitude,
    activeOriginCoord.longitude,
    activeDestCoord.latitude,
    activeDestCoord.longitude,
    targetText,
  ]);

  // Hitung ETA real-time, sisa jarak, dan step aktif saat pengguna berjalan
  const liveNavigation = useMemo(() => {
    const directRemaining = haversineMeters(activeOriginCoord, activeDestCoord);
    const remainingMeters =
      baseDistanceMeters > 0
        ? Math.min(baseDistanceMeters, Math.max(directRemaining, 0))
        : directRemaining;

    // Jika GPS aktif & pengguna sudah bergerak, hitung rasio sisa waktu secara real-time
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

    // Tentukan step turn-by-turn mana yang sedang dilalui pengguna
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

    // Perbarui jarak pada step aktif secara real-time jika GPS bergerak
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

  const handleSwapPoints = () => {
    const prevOrigin = originSelection;
    setOriginSelection(destSelection);
    setDestSelection(prevOrigin);
  };

  const handleSelectLocation = (chosenItem) => {
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
    }

    setPickerTarget(null);
    setPickerQuery('');
  };

  const handleRecenter = () => {
    if (routeCoords.length > 1) {
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

  return (
    <View style={styles.root}>
      {/* Top Route Header */}
      <SafeAreaView style={styles.topHeader}>
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
              activeOpacity={0.85}
              onPress={() => {
                setPickerQuery('');
                setPickerTarget('origin');
              }}
              style={styles.locationBox}
            >
              <Text style={styles.locationBoxText} numberOfLines={1}>
                {originText}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={COLORS.primaryPurple}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setPickerQuery('');
                setPickerTarget('destination');
              }}
              style={styles.locationBox}
            >
              <Text style={styles.locationBoxText} numberOfLines={1}>
                {targetText}
              </Text>
              <Ionicons
                name="chevron-down"
                size={16}
                color={COLORS.primaryPurple}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.rightControlsCol}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setOriginSelection(USER_LOCATION_ID)}
              accessibilityLabel="Gunakan Lokasi GPS"
            >
              <MaterialIcons
                name="gps-fixed"
                size={22}
                color={isOriginUser ? COLORS.darkPurple : COLORS.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSwapPoints}
              accessibilityLabel="Tukar Titik Awal dan Tujuan"
            >
              <MaterialCommunityIcons
                name="swap-vertical"
                size={26}
                color={COLORS.primaryPurple}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

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

          {/* Jalur Rute Jalan Kaki Mengikuti Jalan (Tidak Menembus Gedung) */}
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

          {/* Origin Marker */}
          <Marker coordinate={activeOriginCoord} anchor={{ x: 0.5, y: 0.5 }}>
            {isOriginUser ? (
              <View style={styles.userPuck} />
            ) : (
              <View style={styles.originPoiPin}>
                <View style={styles.originPoiHole} />
              </View>
            )}
          </Marker>

          {/* Destination Marker */}
          <Marker coordinate={activeDestCoord}>
            <View style={styles.markerGroup}>
              <View style={styles.teardropPin}>
                <View style={styles.pinHole} />
              </View>
              <View style={styles.markerLabelBadge}>
                <Text style={styles.markerLabel}>{targetText}</Text>
              </View>
            </View>
          </Marker>

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
        <View style={styles.directionBanner}>
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
        </View>

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

      {/* Modal Pemilih Titik Awal / Titik Tujuan */}
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

              {filteredModalPois.map((item) => {
                const isSelected =
                  (pickerTarget === 'origin' &&
                    !isOriginUser &&
                    String(originSelection?.id) === String(item.id)) ||
                  (pickerTarget === 'destination' &&
                    !isDestUser &&
                    String(destSelection?.id) === String(item.id));

                return (
                  <TouchableOpacity
                    key={item.id}
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
    paddingTop: Platform.OS === 'android' ? 36 : 12,
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
  locationBoxText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  rightControlsCol: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#EAEAEA',
    position: 'relative',
  },
  markerGroup: {
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
  pinHole: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.lavenderTint,
  },
  originPoiPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.darkPurple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  originPoiHole: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },
  markerLabelBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  markerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryPurple,
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