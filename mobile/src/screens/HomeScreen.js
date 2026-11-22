import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import { PoiDetailFooter } from '../components/PoiCardComponents';
import { PoiFirstImage } from '../components/PoiImageGallery';
import { BRAGA_POIS } from '../constants/bragaMapData';

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

function getPoiCoord(stop, allPois = BRAGA_POIS) {
  if (!stop) return null;
  const lat = Number(stop.coordinate?.latitude ?? stop.latitude ?? stop.lat);
  const lng = Number(stop.coordinate?.longitude ?? stop.longitude ?? stop.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { latitude: lat, longitude: lng };
  }
  const matched = allPois.find(
    (item) =>
      (stop.id && String(item.id) === String(stop.id)) ||
      item.name?.toLowerCase() === stop.name?.toLowerCase()
  );
  if (matched) {
    const mLat = Number(matched.coordinate?.latitude ?? matched.latitude);
    const mLng = Number(matched.coordinate?.longitude ?? matched.longitude);
    if (Number.isFinite(mLat) && Number.isFinite(mLng)) {
      return { latitude: mLat, longitude: mLng };
    }
  }
  return null;
}

function formatStopDistance(prevStop, currStop, allPois) {
  if (currStop?.distance) return currStop.distance;
  if (!prevStop) return 'Start';
  const c1 = getPoiCoord(prevStop, allPois);
  const c2 = getPoiCoord(currStop, allPois);
  if (!c1 || !c2) return '±150m';
  const meters = haversineMeters(c1, c2);
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.max(10, meters)}m`;
}

function resolveUserDisplayName(user) {
  if (!user) return 'User';
  if (typeof user === 'string' && user.trim()) return user.trim();
  const rawName =
    user.name ||
    user.fullName ||
    user.full_name ||
    user.displayName ||
    user.username ||
    (typeof user.email === 'string' ? user.email.split('@')[0] : '');
  return String(rawName || 'User').trim();
}

function pickRandomPois(sourceList, count = 3) {
  const pool = Array.isArray(sourceList) ? [...sourceList] : [];
  if (pool.length <= count) return pool;
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

export default function HomeScreen({
  user = null,
  pois = [],
  tripPlans = [],
  bookmarkedPois = [],
  onOpenDetail,
  onOpenDirections,
  onOpenBookmarks,
  onToggleSave,
  onAddToItinerary,
  onUseTrip,
  onEditTrip,
  onCreateTrip,
}) {
  const insets = useSafeAreaInsets();
  const topInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? StatusBar.currentHeight || 28
      : 44;

  const userName = useMemo(() => resolveUserDisplayName(user), [user]);

  const datasetPois = useMemo(
    () => (Array.isArray(pois) && pois.length > 0 ? pois : BRAGA_POIS),
    [pois]
  );

  // State indeks carousel Trip & expand daftar stop
  const [tripIndex, setTripIndex] = useState(0);
  const [isTripExpanded, setIsTripExpanded] = useState(true);

  useEffect(() => {
    if (tripPlans.length === 0) {
      setTripIndex(0);
    } else if (tripIndex >= tripPlans.length) {
      setTripIndex(tripPlans.length - 1);
    }
  }, [tripPlans.length, tripIndex]);

  const activeTrip = tripPlans[tripIndex] || null;
  const activeTripStops = activeTrip?.stops || [];

  // Pilih 3 POI acak dari dataset Braga
  const [recommendedIndex, setRecommendedIndex] = useState(0);
  const randomRecommendedPois = useMemo(
    () => pickRandomPois(datasetPois, 3),
    [datasetPois]
  );

  useEffect(() => {
    if (recommendedIndex >= randomRecommendedPois.length) {
      setRecommendedIndex(0);
    }
  }, [randomRecommendedPois.length, recommendedIndex]);

  const currentRecommended = randomRecommendedPois[recommendedIndex] || null;

  const isCurrentRecommendedSaved = useMemo(() => {
    if (!currentRecommended) return false;
    return bookmarkedPois.some(
      (item) =>
        (currentRecommended.id &&
          String(item.id) === String(currentRecommended.id)) ||
        item.name?.toLowerCase() === currentRecommended.name?.toLowerCase()
    );
  }, [bookmarkedPois, currentRecommended]);

  const handlePrevTrip = () => {
    if (tripPlans.length <= 1) return;
    setTripIndex((prev) => (prev - 1 + tripPlans.length) % tripPlans.length);
  };

  const handleNextTrip = () => {
    if (tripPlans.length <= 1) return;
    setTripIndex((prev) => (prev + 1) % tripPlans.length);
  };

  const handlePrevRecommended = () => {
    if (randomRecommendedPois.length <= 1) return;
    setRecommendedIndex(
      (prev) =>
        (prev - 1 + randomRecommendedPois.length) % randomRecommendedPois.length
    );
  };

  const handleNextRecommended = () => {
    if (randomRecommendedPois.length <= 1) return;
    setRecommendedIndex((prev) => (prev + 1) % randomRecommendedPois.length);
  };

  return (
    <View style={styles.root}>
      {/* Top Purple Header */}
      <View style={styles.headerArea}>
        <View style={[styles.headerContent, { paddingTop: topInset + 14 }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.greetingTitle} numberOfLines={1}>
              Hi, {userName}!
            </Text>
            <Text style={styles.greetingSubtitle}>
              Mau jalan-jalan ke mana{'\n'}di Braga hari ini?
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity activeOpacity={0.8} style={styles.circleIconBtn}>
              <Ionicons name="notifications" size={20} color={COLORS.darkPurple} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onOpenBookmarks}
              style={styles.circleIconBtn}
            >
              <Ionicons name="bookmark" size={19} color={COLORS.darkPurple} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main White Rounded Sheet */}
      <View style={styles.sheetContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Section 1: Trip Plan */}
          <Text style={styles.sectionHeading}>
            Coba Pakai Rencana Jalan-Jalanmu, Yuk!
          </Text>

          {activeTrip ? (
            <>
              <View style={styles.carouselWrapper}>
                {tripPlans.length > 1 && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handlePrevTrip}
                    style={[styles.carouselArrowBtn, styles.carouselArrowLeft]}
                    accessibilityLabel="Trip Sebelumnya"
                  >
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={COLORS.darkPurple}
                    />
                  </TouchableOpacity>
                )}

                <View style={styles.tripCard}>
                  {/* Trip Card Header */}
                  <View style={styles.tripCardHeader}>
                    <View style={styles.tripTitleGroup}>
                      <MaterialCommunityIcons
                        name="map-marker-path"
                        size={26}
                        color={COLORS.darkPurple}
                      />
                      <Text style={styles.tripCardTitle} numberOfLines={1}>
                        {activeTrip.title}
                      </Text>
                    </View>

                    <View style={styles.tripCardButtons}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => onUseTrip?.(activeTrip)}
                        style={styles.pakaiBtn}
                      >
                        <Text style={styles.pakaiBtnText}>Pakai</Text>
                        <MaterialCommunityIcons
                          name="directions"
                          size={14}
                          color={COLORS.darkPurple}
                          style={{ marginLeft: 3 }}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => onEditTrip?.(activeTrip)}
                        style={styles.editBtn}
                      >
                        <Text style={styles.editBtnText}>Edit</Text>
                        <MaterialCommunityIcons
                          name="pencil-outline"
                          size={13}
                          color={COLORS.white}
                          style={{ marginLeft: 3 }}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => setIsTripExpanded((prev) => !prev)}
                        style={{ paddingLeft: 2 }}
                      >
                        <Ionicons
                          name={isTripExpanded ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={COLORS.darkPurple}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Trip Stops Timeline */}
                  {isTripExpanded && (
                    <View style={styles.tripCardBody}>
                      {activeTripStops.length === 0 ? (
                        <Text style={styles.emptyTripStopsText}>
                          Belum ada destinasi di rencana ini.
                        </Text>
                      ) : (
                        activeTripStops.map((stop, idx) => {
                          const isLast = idx === activeTripStops.length - 1;
                          const distLabel = formatStopDistance(
                            idx > 0 ? activeTripStops[idx - 1] : null,
                            stop,
                            datasetPois
                          );
                          return (
                            <View
                              key={`${activeTrip.id}-${stop.id || idx}-${idx}`}
                              style={styles.stopRow}
                            >
                              {/* Time + Circle Timeline */}
                              <View style={styles.timelineCol}>
                                <View style={styles.timeNodeRow}>
                                  <View style={styles.nodeCircle} />
                                  <Text style={styles.timeText}>
                                    {stop.time || '09.00'}
                                  </Text>
                                </View>
                                {!isLast && (
                                  <View style={styles.dottedConnector} />
                                )}
                              </View>

                              {/* Destination Info */}
                              <View
                                style={[
                                  styles.stopInfoBox,
                                  !isLast && styles.stopDivider,
                                ]}
                              >
                                <View style={styles.smallPinCol}>
                                  <View style={styles.smallPinCircle}>
                                    <Ionicons
                                      name="location"
                                      size={15}
                                      color={COLORS.darkPurple}
                                    />
                                  </View>
                                  <Text style={styles.smallDistText}>
                                    {distLabel}
                                  </Text>
                                </View>
                                <Text style={styles.stopName} numberOfLines={2}>
                                  {stop.name}
                                </Text>
                              </View>
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}
                </View>

                {tripPlans.length > 1 && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleNextTrip}
                    style={[styles.carouselArrowBtn, styles.carouselArrowRight]}
                    accessibilityLabel="Trip Berikutnya"
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={COLORS.darkPurple}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Carousel Dots Dinamis Sesuai Jumlah Trip */}
              {tripPlans.length > 0 && (
                <View style={styles.dotsRow}>
                  {tripPlans.map((plan, idx) => (
                    <TouchableOpacity
                      key={plan.id || idx}
                      onPress={() => setTripIndex(idx)}
                      style={[
                        styles.dot,
                        idx === tripIndex && styles.dotActive,
                      ]}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.emptyTripBox}>
              <Text style={styles.emptyTripTitle}>
                Kamu belum memiliki rencana perjalanan
              </Text>
              <Text style={styles.emptyTripSub}>
                Buat rencana perjalanan otomatis atau pilih destinasi favoritmu di Braga.
              </Text>
            </View>
          )}

          {/* Buat Rencana Baru Button -> ke TripSettingScreen */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onCreateTrip}
            style={styles.newPlanBtn}
          >
            <Text style={styles.newPlanBtnText}>Buat Rencana Baru</Text>
            <Ionicons
              name="add"
              size={22}
              color={COLORS.darkPurple}
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>

          {/* Divider "Atau" */}
          <View style={styles.orDividerRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>Atau</Text>
            <View style={styles.orLine} />
          </View>

          {/* Section 2: Rekomendasi Destinasi Braga (3 POI Acak) */}
          <Text style={styles.sectionHeading}>
            Coba Kunjungi Rekomendasi Destinasi Braga!
          </Text>

          {currentRecommended ? (
            <>
              <View style={styles.carouselWrapper}>
                {randomRecommendedPois.length > 1 && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handlePrevRecommended}
                    style={[styles.carouselArrowBtn, styles.carouselArrowLeft]}
                    accessibilityLabel="Rekomendasi Sebelumnya"
                  >
                    <Ionicons
                      name="chevron-back"
                      size={18}
                      color={COLORS.darkPurple}
                    />
                  </TouchableOpacity>
                )}

                <View style={styles.recommendedCard}>
                  <PoiFirstImage
                    poi={currentRecommended}
                    style={styles.recommendationImage}
                  />

                  <View style={styles.recommendedBody}>
                    <PoiDetailFooter
                      name={currentRecommended.name}
                      isSaved={isCurrentRecommendedSaved}
                      onCheckDetail={() => onOpenDetail?.(currentRecommended)}
                      onDirections={() => onOpenDirections?.(currentRecommended)}
                      onSave={() => onToggleSave?.(currentRecommended)}
                      onAddToItinerary={() =>
                        onAddToItinerary?.(currentRecommended)
                      }
                    />
                  </View>
                </View>

                {randomRecommendedPois.length > 1 && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleNextRecommended}
                    style={[styles.carouselArrowBtn, styles.carouselArrowRight]}
                    accessibilityLabel="Rekomendasi Berikutnya"
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={COLORS.darkPurple}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Bottom Carousel Dots (3 POI Acak) */}
              <View style={[styles.dotsRow, { marginTop: 12 }]}>
                {randomRecommendedPois.map((item, idx) => (
                  <TouchableOpacity
                    key={item.id || idx}
                    onPress={() => setRecommendedIndex(idx)}
                    style={[
                      styles.dot,
                      idx === recommendedIndex && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.sectionHeading}>
              Buka Explore untuk memuat atau mencoba ulang destinasi.
            </Text>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.primaryPurple,
  },
  headerArea: {
    backgroundColor: COLORS.primaryPurple,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingBottom: 24,
    backgroundColor: COLORS.primaryPurple,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.white,
    lineHeight: 21,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  circleIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 14,
  },
  carouselWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  carouselArrowBtn: {
    position: 'absolute',
    zIndex: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  carouselArrowLeft: {
    left: -10,
  },
  carouselArrowRight: {
    right: -10,
  },
  tripCard: {
    borderWidth: 1.8,
    borderColor: COLORS.darkPurple,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  tripCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1.8,
    borderBottomColor: COLORS.darkPurple,
    gap: 6,
  },
  tripTitleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },
  tripCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  tripCardButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pakaiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.4,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pakaiBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkPurple,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  tripCardBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'relative',
  },
  emptyTripStopsText: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 8,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineCol: {
    width: 78,
    alignItems: 'flex-start',
  },
  timeNodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nodeCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.darkPurple,
    backgroundColor: COLORS.white,
  },
  timeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dottedConnector: {
    width: 2,
    height: 28,
    marginLeft: 9,
    borderLeftWidth: 2,
    borderStyle: 'dotted',
    borderColor: COLORS.mediumPurple,
  },
  stopInfoBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 8,
  },
  stopDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  smallPinCol: {
    alignItems: 'center',
    marginRight: 10,
    minWidth: 34,
  },
  smallPinCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.lavenderTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallDistText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stopName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  emptyTripBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.mediumPurple,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.softLilacBg,
    padding: 16,
    alignItems: 'center',
  },
  emptyTripTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkPurple,
    marginBottom: 4,
  },
  emptyTripSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.lavenderTint,
  },
  dotActive: {
    width: 16,
    backgroundColor: COLORS.darkPurple,
  },
  newPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 1.8,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingVertical: 7,
    paddingHorizontal: 18,
    marginTop: 12,
  },
  newPlanBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderSubtle,
  },
  orText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  recommendedCard: {
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  recommendationImage: {
    width: '100%',
    height: 150,
    backgroundColor: COLORS.lavenderTint,
  },
  recommendedBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
});