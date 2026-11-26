import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, AppState } from 'react-native';
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

const DETAIL_TABS = ['Overview', 'Menu', 'Review', 'About'];

export default function PoiDetailScreen({ poi, onBack, onOpenDirections, isSaved = false, onToggleSave = undefined, onAddToItinerary = undefined, currentUser = null, onRatingChange = undefined }) {
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
  const fields = getPoiDetailFields({ ...ratedPoi, distanceMeters: distanceMeters(sample, poi) });
  const reviewCount = Number.isInteger(ratedPoi.reviewsCount) ? ratedPoi.reviewsCount : null;
  const operatingStatus = getOperatingStatus(poi.openingHours, new Date(now));

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kembali" onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.darkPurple} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
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
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={audioLoading ? 'Batalkan pemuatan audio' : audioLabel}
            accessibilityState={{ disabled: audioSource === null, busy: !!audioLoading }}
            disabled={audioSource === null} onPress={() => audio.toggle(audioPoi)} style={[styles.audioBtn, audioSource === null && styles.disabled]}>
            <Text style={styles.audioBtnText}>{audioLabel}</Text>
            <Ionicons name={playing ? 'pause' : 'volume-high'} size={15} color={COLORS.white} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
        {!!audioError && <Text accessibilityLiveRegion="polite" style={styles.audioError}>{audioError}</Text>}
        <View style={styles.actionRow}>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !onOpenDirections }} disabled={!onOpenDirections}
            onPress={() => onOpenDirections?.(poi)} style={[styles.outlinePillBtn, !onOpenDirections && styles.disabled]}>
            <Text style={styles.outlinePillText}>Directions</Text>
            <MaterialCommunityIcons name="directions" size={17} color={COLORS.darkPurple} style={{ marginLeft: 5 }} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !onToggleSave }} disabled={!onToggleSave}
            onPress={() => onToggleSave?.(poi)} style={[styles.outlinePillBtn, isSaved && styles.savedPillBtnActive, !onToggleSave && styles.disabled]}>
            <Text style={[styles.outlinePillText, isSaved && styles.savedPillTextActive]}>{isSaved ? 'Saved' : 'Save'}</Text><Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={15} color={isSaved ? COLORS.white : COLORS.darkPurple} style={{ marginLeft: 5 }} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !onAddToItinerary }} disabled={!onAddToItinerary}
            onPress={() => onAddToItinerary?.(poi)} style={[styles.outlinePillBtn, !onAddToItinerary && styles.disabled]}>
            <Text style={styles.outlinePillText}>Add to Itinerary</Text><Ionicons name="add-circle-outline" size={17} color={COLORS.darkPurple} style={{ marginLeft: 4 }} />
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
        ) : (
          <View style={styles.overviewList}>
            {activeTab === 'Overview' && <>
              <DetailRow icon="information-circle-outline" value={fields.description} />
              <DetailRow icon="location-outline" value={fields.address} />
              <DetailRow icon="time-outline" value={operatingStatus ? `${operatingStatus}  |  ${fields.openingHours}` : fields.openingHours} />
              <DetailRow icon="globe-outline" value={fields.website} />
            </>}
            {activeTab === 'Menu' && <>
              <DetailRow icon="restaurant-outline" value={fields.menu} />
              <DetailRow icon="pricetag-outline" value={fields.prices} />
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
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkPurple,
    borderRadius: RADIUS.pill,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  audioBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
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