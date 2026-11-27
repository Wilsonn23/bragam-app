import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  AppState,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import PoiImageGallery from '../components/PoiImageGallery';
import { getOperatingStatus, getPoiDetailFields, getRatingStars } from '../poi/presentation';
import { useAppActive, useForegroundLocation } from '../hooks/useForegroundLocation';
import { distanceMeters } from '../location/distance';
import { useGuideAudio } from '../audio/AudioProvider';
import { audioSourceFor, bundledAudioFor, AUDIO_ERROR } from '../audio/guideController';
import { POI_AUDIO_ASSETS } from '../audio/guideAssets';
import PoiRatingSection from '../components/PoiRatingSection';
import PoiMenuSection from '../components/PoiMenuSection';
import { fetchUserVisits, recordUserVisit } from '../services/userDataService';

const DETAIL_TABS = ['Overview', 'Menu', 'Review', 'About'];
const DEFAULT_GEOFENCE_RADIUS_METERS = 25;
const OUT_OF_RANGE_TOAST_DURATION_MS = 4000;

export default function PoiDetailScreen({
  poi,
  onBack,
  onOpenDirections,
  isSaved = false,
  onToggleSave = undefined,
  onAddToItinerary = undefined,
  currentUser = null,
  onRatingChange = undefined,
  isVisited: isVisitedProp = undefined,
  onMarkVisited = undefined,
}) {
  const appActive = useAppActive();
  const { sample } = useForegroundLocation(appActive);
  const audio = useGuideAudio();
  const audioPoi = { ...poi, audioAsset: bundledAudioFor(poi, POI_AUDIO_ASSETS) };
  const audioSource = audioSourceFor(audioPoi);
  const activeAudio = audio.currentId === poi.id;
  const playing = activeAudio && audio.status.playing;
  const audioError = activeAudio && (audio.error || (!audio.pending && audio.status.error && AUDIO_ERROR));
  const audioLoading = activeAudio && audio.intent && !audioError && (audio.pending || audio.status.isBuffering || (!audio.status.isLoaded && !playing));
  const audioLabel = audioError ? 'Coba lagi' : audioLoading ? 'Memuat audio' : playing ? 'Jeda audio' : activeAudio && audio.status.isLoaded && !audio.status.didJustFinish ? 'Lanjutkan audio' : 'Nyalakan audio';

  const [activeTab, setActiveTab] = useState('Overview');
  const [now, setNow] = useState(() => Date.now());

  // Sinkronisasi status kunjungan dengan database
  const [dbVisited, setDbVisited] = useState(Boolean(isVisitedProp));
  const [isSavingVisit, setIsSavingVisit] = useState(false);

  useEffect(() => {
    if (typeof isVisitedProp === 'boolean') {
      setDbVisited(isVisitedProp);
    }
  }, [isVisitedProp, poi?.id]);

  // Fallback: jika layar dibuka tanpa prop isVisited, muat langsung dari database
  useEffect(() => {
    let isMounted = true;
    if (typeof isVisitedProp === 'boolean' || !currentUser?.id || !poi?.id) {
      return;
    }

    fetchUserVisits(currentUser.id, [poi])
      .then((visits) => {
        if (!isMounted) return;
        const found = visits.some((v) => String(v.poiId) === String(poi.id));
        setDbVisited(found);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, poi?.id, isVisitedProp]);

  // State & animasi notifikasi selewat di atas layar
  const [toastMessage, setToastMessage] = useState(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(-16)).current;
  const toastTimerRef = useRef(null);

  const showTopToast = (message) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastMessage(message);
    toastOpacity.setValue(0);
    toastTranslateY.setValue(-16);

    Animated.parallel([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(toastTranslateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    toastTimerRef.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: -16,
          duration: 240,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setToastMessage(null);
      });
    }, OUT_OF_RANGE_TOAST_DURATION_MS);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setNow(Date.now());
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);

  // Live rating from the Review tab overrides the (possibly stale) list snapshot.
  const [liveRating, setLiveRating] = useState(null);
  const ratedPoi = liveRating ? { ...poi, rating: liveRating.rating, reviewsCount: liveRating.reviewsCount } : poi;
  const handleSummaryChange = summary => {
    const next = { rating: summary.averageRating, reviewsCount: summary.reviewCount };
    setLiveRating(next);
    onRatingChange?.(poi.id, next);
  };

  // Hitung jarak GPS terhadap titik POI dan cek apakah masuk radius geofence
  const currentDistanceMeters = distanceMeters(sample, poi);
  const geofenceRadiusMeters = Number(
    poi?.triggerRadiusMeters ?? poi?.radius_meters ?? DEFAULT_GEOFENCE_RADIUS_METERS
  );
  const isWithinGeofence =
    Number.isFinite(currentDistanceMeters) &&
    Number.isFinite(geofenceRadiusMeters) &&
    currentDistanceMeters <= geofenceRadiusMeters;

  const isVisited = typeof isVisitedProp === 'boolean' ? isVisitedProp : dbVisited;

  const handlePressMarkVisited = async () => {
    if (isVisited || isSavingVisit) return;

    if (!isWithinGeofence) {
      showTopToast('Anda berada di luar jangkauan destinasi');
      return;
    }

    if (!currentUser?.id) {
      showTopToast('Silakan login terlebih dahulu');
      return;
    }

    const roundedDistance = Math.round(currentDistanceMeters);
    const visitRecord = {
      poiId: String(poi.id),
      poiName: poi.name,
      category: poi.category || '',
      imageUrl: poi.images?.[0]?.imageUrl || poi.imageUrl || null,
      visitedAt: new Date().toISOString(),
      distanceMeters: roundedDistance,
    };

    setDbVisited(true);
    setIsSavingVisit(true);

    try {
      if (onMarkVisited) {
        await onMarkVisited(poi, visitRecord);
      } else {
        const saved = await recordUserVisit(currentUser.id, poi.id, roundedDistance);
        if (saved?.visited_at) {
          visitRecord.visitedAt = saved.visited_at;
        }
      }
      showTopToast('Berhasil ditandai sebagai sudah dikunjungi');
    } catch (_) {
      setDbVisited(false);
    } finally {
      setIsSavingVisit(false);
    }
  };

  const fields = getPoiDetailFields({ ...ratedPoi, distanceMeters: currentDistanceMeters });
  const reviewCount = Number.isInteger(ratedPoi.reviewsCount) ? ratedPoi.reviewsCount : null;
  const operatingStatus = getOperatingStatus(poi.openingHours, new Date(now));

  return (
    <SafeAreaView style={styles.root}>
      {/* Notifikasi Selewat di Atas Layar */}
      {toastMessage && (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="assertive"
          style={[
            styles.topToastBanner,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
            },
          ]}
        >
          <Ionicons
            name={isVisited ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={COLORS.white}
          />
          <Text style={styles.topToastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <View style={styles.topBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kembali" onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.darkPurple} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Baris Header: Jarak, Judul, dan 2 Row Tombol di Sisi Kanan */}
        <View style={styles.headerInfoRow}>
          <View style={styles.distanceCol}>
            <View style={styles.pinBadge}><Ionicons name="location" size={18} color={COLORS.darkPurple} /></View>
            <Text style={styles.distanceText}>{fields.distance}</Text>
          </View>
          <View style={styles.titleCol}>
            <Text accessibilityRole="header" style={styles.poiTitle}>{poi.name}</Text>
            <Text style={styles.categoryText}>{poi.category}</Text>
            <TouchableOpacity style={styles.ratingRow} onPress={() => setActiveTab('Review')}
              accessibilityRole="button" accessibilityLabel={`${fields.ratingSummary}. Lihat ulasan`}>
              <Text style={styles.ratingText}>{fields.rating}</Text>
              {getRatingStars(ratedPoi.rating).map((name, index) => (
                <Ionicons key={index} name={name} size={14} color={COLORS.darkPurple} />
              ))}
              {fields.hasRating && reviewCount !== null &&
                <Text style={styles.reviewCountText}>({reviewCount})</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.rightButtonsCol}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={audioLoading ? 'Batalkan pemuatan audio' : audioLabel}
              accessibilityState={{ disabled: audioSource === null, busy: !!audioLoading }}
              disabled={audioSource === null}
              onPress={() => audio.toggle(audioPoi)}
              style={[styles.audioBtn, audioSource === null && styles.disabled]}
            >
              <Text style={styles.audioBtnText}>{audioLabel}</Text>
              <Ionicons name={playing ? 'pause' : 'volume-high'} size={15} color={COLORS.white} style={{ marginLeft: 4 }} />
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={isVisited ? 'Destinasi sudah dikunjungi' : 'Tandai sudah dikunjungi'}
              accessibilityState={{ selected: isVisited, busy: isSavingVisit }}
              disabled={isVisited || isSavingVisit}
              activeOpacity={0.75}
              onPress={handlePressMarkVisited}
              style={[styles.visitedPillBtn, isVisited && styles.savedPillBtnActive]}
            >
              <Ionicons
                name={isVisited ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={14}
                color={isVisited ? COLORS.white : COLORS.darkPurple}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.visitedPillText, isVisited && styles.savedPillTextActive]}>
                {isSavingVisit ? 'Saving...' : isVisited ? 'Visited' : 'Mark as Visited'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        {!!audioError && <Text accessibilityLiveRegion="polite" style={styles.audioError}>{audioError}</Text>}

        {/* Baris Aksi Utama: Directions, Save, dan Add to Itinerary */}
        <View style={styles.actionRow}>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !onOpenDirections }} disabled={!onOpenDirections}
            onPress={() => onOpenDirections?.(poi)} style={[styles.outlinePillBtn, !onOpenDirections && styles.disabled]}>
            <Text style={styles.outlinePillText}>Directions</Text>
            <MaterialCommunityIcons name="directions" size={17} color={COLORS.darkPurple} style={{ marginLeft: 5 }} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !onToggleSave }} disabled={!onToggleSave}
            onPress={() => onToggleSave?.(poi)} style={[styles.outlinePillBtn, isSaved && styles.savedPillBtnActive, !onToggleSave && styles.disabled]}>
            <Text style={[styles.outlinePillText, isSaved && styles.savedPillTextActive]}>{isSaved ? 'Saved' : 'Save'}</Text>
            <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={15} color={isSaved ? COLORS.white : COLORS.darkPurple} style={{ marginLeft: 5 }} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !onAddToItinerary }} disabled={!onAddToItinerary}
            onPress={() => onAddToItinerary?.(poi)} style={[styles.outlinePillBtn, !onAddToItinerary && styles.disabled]}>
            <Text style={styles.outlinePillText}>Add to Itinerary</Text>
            <Ionicons name="add-circle-outline" size={17} color={COLORS.darkPurple} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* 1 large photo + 2 small stacked; "+N" on the last one opens the full gallery. */}
        <View style={styles.gallerySection}>
          <PoiImageGallery poi={poi} />
        </View>
        <View style={styles.tabsUnderline}>
          <View style={styles.tabsRow}>
            {DETAIL_TABS.map(tab => (
              <TouchableOpacity key={tab} accessibilityRole="tab" accessibilityState={{ selected: activeTab === tab }}
                onPress={() => setActiveTab(tab)} style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {activeTab === 'Review' ? (
          <PoiRatingSection poi={poi} currentUser={currentUser} onSummaryChange={handleSummaryChange} />
        ) : activeTab === 'Menu' ? (
          <PoiMenuSection key={poi.id} poi={poi} priceSummary={fields.prices} />
        ) : (
          <View style={styles.overviewList}>
            {activeTab === 'Overview' && <>
              <DetailRow icon="information-circle-outline" value={fields.description} />
              <DetailRow icon="location-outline" value={fields.address} />
              <DetailRow icon="time-outline" value={operatingStatus ? `${operatingStatus}  |  ${fields.openingHours}` : fields.openingHours} />
              <DetailRow icon="globe-outline" value={fields.website} />
            </>}
            {activeTab === 'About' && <DetailRow icon="book-outline" value={fields.history} />}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
function DetailRow({ icon, value }) {
  return <View style={styles.detailRow}>
    <Ionicons name={icon} size={22} color={COLORS.darkPurple} style={styles.detailIcon} />
    <Text style={styles.detailText}>{value}</Text>
  </View>;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.softLilacBg,
  },
  topToastBanner: {
    position: 'absolute',
    top: 48,
    left: 20,
    right: 20,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.darkPurple,
    borderRadius: RADIUS.pill,
    paddingVertical: 10,
    paddingHorizontal: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
  },
  topToastText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  topBar: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 6,
  },
  backBtn: {
    padding: 4,
    alignSelf: 'flex-start',
  },
  scrollContent: {
    paddingBottom: 28,
  },
  headerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
  },
  distanceCol: {
    alignItems: 'center',
    marginRight: 8,
    maxWidth: 62,
  },
  pinBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.lavenderTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  titleCol: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  poiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  categoryText: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  audioError: { fontSize: 12, color: COLORS.textSecondary, marginHorizontal: 20, marginTop: 6 },
  gallerySection: { paddingHorizontal: 20, marginTop: 14 },
  disabled: { opacity: 0.45 },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  reviewCountText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
    textDecorationLine: 'underline',
  },
  rightButtonsCol: {
    alignItems: 'stretch',
    gap: 6,
  },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.darkPurple,
    borderRadius: RADIUS.pill,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  audioBtnText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  visitedPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  visitedPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.darkPurple,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 6,
  },
  outlinePillBtn: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  outlinePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  savedPillBtnActive: { backgroundColor: COLORS.darkPurple, borderColor: COLORS.darkPurple },
  savedPillTextActive: { color: COLORS.white },
  tabsUnderline: {
    marginTop: 16,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.lavenderTint,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  tabPillActive: {
    backgroundColor: COLORS.darkPurple,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  tabTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },
  overviewList: {
    backgroundColor: COLORS.white,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  detailIcon: {
    marginRight: 14,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 19,
    flexShrink: 1,
  },
  hoursGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verticalDivider: {
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: COLORS.lavenderTint,
    marginHorizontal: 14,
  },
  placeholderTabBox: {
    padding: 28,
    alignItems: 'center',
  },
  placeholderTabText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});