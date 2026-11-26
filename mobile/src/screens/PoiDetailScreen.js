import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
  AppState,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import { WireframeImageBox } from '../components/PoiCardComponents';
import { getOperatingStatus, getPoiDetailFields, getRatingStars } from '../poi/presentation';
import { useAppActive, useForegroundLocation } from '../hooks/useForegroundLocation';
import { distanceMeters } from '../location/distance';
import { useGuideAudio } from '../audio/AudioProvider';
import { audioSourceFor, bundledAudioFor, AUDIO_ERROR } from '../audio/guideController';
import { POI_AUDIO_ASSETS } from '../audio/guideAssets';
import PoiRatingSection from '../components/PoiRatingSection';

const DETAIL_TABS = ['Overview', 'Menu', 'Review', 'About'];

function resolveImageUri(value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return null;
  try {
    const parsed = new URL(value);
    if (parsed.hostname === 'thumb.wikimedia.org' || parsed.hostname === 'upload.wikimedia.org') {
      const source = value.replace(/^https?:\/\//i, '').replace(/&/g, '%26');
      return `https://images.weserv.nl/?url=${source}`;
    }
  } catch {
    return null;
  }
  return value;
}

function extractPoiGalleryItems(poi) {
  const seen = new Set();
  const items = [];

  const pushItem = (rawUrl, altText) => {
    const uri = resolveImageUri(rawUrl);
    if (!uri || seen.has(uri)) return;
    seen.add(uri);
    items.push({
      uri,
      altText: typeof altText === 'string' && altText.trim() ? altText.trim() : null,
    });
  };

  if (Array.isArray(poi?.images)) {
    for (const img of poi.images) {
      pushItem(img?.imageUrl ?? img?.image_url, img?.altText ?? img?.alt_text);
    }
  }
  if (Array.isArray(poi?.imageUrls)) {
    for (const url of poi.imageUrls) {
      pushItem(url, null);
    }
  }
  pushItem(poi?.imageUrl, null);

  return items;
}

function clampRatio(ratio, min = 0.65, max = 1.85) {
  if (!Number.isFinite(ratio) || ratio <= 0) return 1;
  return Math.min(max, Math.max(min, ratio));
}

export default function PoiDetailScreen({
  poi,
  onBack,
  onOpenDirections,
  isSaved = false,
  onToggleSave = undefined,
  onAddToItinerary = undefined,
  currentUser = null,
  onRatingChange = undefined,
}) {
  const appActive = useAppActive();
  const { sample } = useForegroundLocation(appActive);
  const { width: screenWidth } = useWindowDimensions();
  const audio = useGuideAudio();
  const audioPoi = { ...poi, audioAsset: bundledAudioFor(poi, POI_AUDIO_ASSETS) };
  const audioSource = audioSourceFor(audioPoi);
  const activeAudio = audio.currentId === poi.id;
  const playing = activeAudio && audio.status.playing;
  const audioError = activeAudio && (audio.error || (!audio.pending && audio.status.error && AUDIO_ERROR));
  const audioLoading = activeAudio && audio.intent && !audioError && (audio.pending || audio.status.isBuffering || (!audio.status.isLoaded && !playing));
  const audioLabel = audioError ? 'Coba lagi' : audioLoading ? 'Memuat audio' : playing ? 'Jeda audio' : activeAudio && audio.status.isLoaded && !audio.status.didJustFinish ? 'Lanjutkan audio' : 'Nyalakan audio';

  const [activeTab, setActiveTab] = useState('Overview');
  const [failedImages, setFailedImages] = useState([]);
  const [imageRatios, setImageRatios] = useState({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    setFailedImages([]);
    setImageRatios({});
    setSelectedImageIndex(null);
  }, [poi?.id]);

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

  const images = useMemo(
    () => extractPoiGalleryItems(poi).filter(item => !failedImages.includes(item.uri)),
    [poi, failedImages]
  );

  const handleImageLoad = (uri, event) => {
    const src = event?.nativeEvent?.source;
    if (src?.width && src?.height) {
      const ratio = src.width / src.height;
      setImageRatios(prev => (prev[uri] === ratio ? prev : { ...prev, [uri]: ratio }));
    }
  };

  const handleImageError = uri => {
    setFailedImages(prev => (prev.includes(uri) ? prev : [...prev, uri]));
  };

  const contentWidth = Math.max(260, screenWidth - 40);
  const primaryRatio = clampRatio(imageRatios[images[0]?.uri] ?? 1.05, 0.75, 1.5);
  // Tinggi baris utama menyesuaikan rasio gambar pertama secara dinamis
  const topBentoHeight = Math.round(
    Math.min(300, Math.max(190, (contentWidth * 0.57) / primaryRatio))
  );
  const bottomRowRatio = clampRatio(
    ((imageRatios[images[3]?.uri] ?? 1.25) + (imageRatios[images[4]?.uri] ?? 1.25)) / 2,
    0.85,
    1.7
  );
  const bottomBentoHeight = Math.round(
    Math.min(190, Math.max(115, ((contentWidth - 10) / 2) / bottomRowRatio))
  );

  const renderBentoTile = (item, index, style, extraBadge = null) => (
    <Pressable
      key={item.uri}
      accessibilityRole="button"
      accessibilityLabel={item.altText || `Foto ${poi.name} ${index + 1} dari ${images.length}`}
      onPress={() => setSelectedImageIndex(index)}
      style={[styles.bentoTile, style]}
    >
      <Image
        source={{ uri: item.uri }}
        resizeMode="cover"
        onLoad={e => handleImageLoad(item.uri, e)}
        onError={() => handleImageError(item.uri)}
        style={styles.bentoImage}
      />
      {extraBadge !== null && (
        <View style={styles.moreOverlay}>
          <Text style={styles.moreOverlayText}>+{extraBadge}</Text>
        </View>
      )}
    </Pressable>
  );

  const renderBentoGallery = () => {
    if (!images.length) {
      return (
        <View style={styles.galleryContainer}>
          <WireframeImageBox width={contentWidth} height={220} />
          <Text style={styles.galleryCaption}>Foto belum tersedia</Text>
        </View>
      );
    }

    if (images.length === 1) {
      const singleRatio = clampRatio(imageRatios[images[0].uri] ?? 1.4, 0.75, 1.85);
      return (
        <View style={styles.galleryContainer}>
          {renderBentoTile(images[0], 0, { width: '100%', aspectRatio: singleRatio })}
        </View>
      );
    }

    if (images.length === 2) {
      const pairRatio = clampRatio(
        ((imageRatios[images[0].uri] ?? 1) + (imageRatios[images[1].uri] ?? 1)) / 2,
        0.75,
        1.5
      );
      return (
        <View style={styles.galleryContainer}>
          <View style={styles.bentoRow}>
            {renderBentoTile(images[0], 0, { flex: 1, aspectRatio: pairRatio })}
            {renderBentoTile(images[1], 1, { flex: 1, aspectRatio: pairRatio })}
          </View>
        </View>
      );
    }

    const visibleBottom = images.slice(3, 5);
    const hiddenCount = Math.max(0, images.length - 5);

    return (
      <View style={styles.galleryContainer}>
        {/* Baris Atas Bento: 1 Besar di Kiri + 2 Row Bertumpuk di Kanan */}
        <View style={[styles.bentoRow, { height: topBentoHeight }]}>
          {renderBentoTile(images[0], 0, styles.leftLargeBox)}
          <View style={styles.rightStackedCol}>
            {renderBentoTile(images[1], 1, { flex: 1 })}
            {renderBentoTile(images[2], 2, { flex: 1 })}
          </View>
        </View>

        {/* Baris Bawah Bento: Menampilkan foto ke-4 & ke-5 (atau 1 lebar jika total 4) */}
        {visibleBottom.length === 1 && (
          <View style={styles.bentoRow}>
            {renderBentoTile(visibleBottom[0], 3, {
              width: '100%',
              aspectRatio: clampRatio(imageRatios[visibleBottom[0].uri] ?? 1.75, 1.2, 2.1),
            })}
          </View>
        )}

        {visibleBottom.length === 2 && (
          <View style={[styles.bentoRow, { height: bottomBentoHeight }]}>
            {renderBentoTile(visibleBottom[0], 3, { flex: 1.1 })}
            {renderBentoTile(
              visibleBottom[1],
              4,
              { flex: 0.9 },
              hiddenCount > 0 ? hiddenCount : null
            )}
          </View>
        )}
      </View>
    );
  };

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
            <TouchableOpacity
              style={styles.ratingRow}
              onPress={() => setActiveTab('Review')}
              accessibilityRole="button"
              accessibilityLabel={`${fields.ratingSummary}. Lihat ulasan`}
            >
              <Text style={styles.ratingText}>{fields.rating}</Text>
              {getRatingStars(ratedPoi.rating).map((name, index) => (
                <Ionicons key={index} name={name} size={14} color={COLORS.darkPurple} />
              ))}
              {fields.hasRating && reviewCount !== null && (
                <Text style={styles.reviewCountText}>({reviewCount})</Text>
              )}
            </TouchableOpacity>
          </View>
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
        </View>
        {!!audioError && <Text accessibilityLiveRegion="polite" style={styles.audioError}>{audioError}</Text>}
        <View style={styles.actionRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: !onOpenDirections }}
            disabled={!onOpenDirections}
            onPress={() => onOpenDirections?.(poi)}
            style={[styles.outlinePillBtn, !onOpenDirections && styles.disabled]}
          >
            <Text style={styles.outlinePillText}>Directions</Text>
            <MaterialCommunityIcons name="directions" size={17} color={COLORS.darkPurple} style={{ marginLeft: 5 }} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: !onToggleSave }}
            disabled={!onToggleSave}
            onPress={() => onToggleSave?.(poi)}
            style={[styles.outlinePillBtn, isSaved && styles.savedPillBtnActive, !onToggleSave && styles.disabled]}
          >
            <Text style={[styles.outlinePillText, isSaved && styles.savedPillTextActive]}>{isSaved ? 'Saved' : 'Save'}</Text>
            <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={15} color={isSaved ? COLORS.white : COLORS.darkPurple} style={{ marginLeft: 5 }} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: !onAddToItinerary }}
            disabled={!onAddToItinerary}
            onPress={() => onAddToItinerary?.(poi)}
            style={[styles.outlinePillBtn, !onAddToItinerary && styles.disabled]}
          >
            <Text style={styles.outlinePillText}>Add to Itinerary</Text>
            <Ionicons name="add-circle-outline" size={17} color={COLORS.darkPurple} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {renderBentoGallery()}

        <View style={styles.tabsUnderline}>
          <View style={styles.tabsRow}>
            {DETAIL_TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === tab }}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
              >
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

      {/* Modal Preview Rasio Asli Penuh Saat Foto Diklik */}
      <Modal
        visible={selectedImageIndex !== null}
        animationType="fade"
        onRequestClose={() => setSelectedImageIndex(null)}
      >
        <SafeAreaView style={styles.modalPage}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>{poi.name}</Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Tutup galeri"
              onPress={() => setSelectedImageIndex(null)}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>Tutup</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {images.map((item, idx) => (
              <View key={item.uri} style={styles.modalCard}>
                <Image
                  source={{ uri: item.uri }}
                  resizeMode="contain"
                  onLoad={e => handleImageLoad(item.uri, e)}
                  style={[
                    styles.modalFullImage,
                    { aspectRatio: imageRatios[item.uri] || 1.33 },
                  ]}
                />
                <Text style={styles.modalCaption}>
                  {item.altText || `Foto ${poi.name} ${idx + 1} dari ${images.length}`}
                </Text>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ icon, value }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={22} color={COLORS.darkPurple} style={styles.detailIcon} />
      <Text style={styles.detailText}>{value}</Text>
    </View>
  );
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
  galleryContainer: {
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 10,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bentoTile: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.lavenderTint,
  },
  bentoImage: {
    width: '100%',
    height: '100%',
  },
  leftLargeBox: {
    flex: 1.35,
  },
  rightStackedCol: {
    flex: 1,
    gap: 10,
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(25, 14, 64, 0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreOverlayText: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '700',
  },
  galleryCaption: { color: COLORS.textSecondary, fontSize: 12, marginTop: 6 },
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
  modalPage: {
    flex: 1,
    backgroundColor: COLORS.softLilacBg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  modalTitle: {
    flex: 1,
    marginRight: 12,
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  closeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.darkPurple,
  },
  closeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
    gap: 16,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  modalFullImage: {
    width: '100%',
    backgroundColor: COLORS.lavenderTint,
  },
  modalCaption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});