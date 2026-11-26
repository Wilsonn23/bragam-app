import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import { WireframeImageBox } from '../components/PoiCardComponents';
import { getRatingStars } from '../poi/presentation';

const BULAN_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

function formatVisitedTimestamp(rawDate) {
  if (!rawDate) return 'Waktu kunjungan tidak tersedia';
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return 'Waktu kunjungan tidak tersedia';

  const day = parsed.getDate();
  const month = BULAN_ID[parsed.getMonth()];
  const year = parsed.getFullYear();
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');

  return `Dikunjungi pada ${day} ${month} ${year}, ${hours}.${minutes}`;
}

function resolveImageUri(value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return null;
  try {
    const parsed = new URL(value);
    if (
      parsed.hostname === 'thumb.wikimedia.org' ||
      parsed.hostname === 'upload.wikimedia.org'
    ) {
      const source = value.replace(/^https?:\/\//i, '').replace(/&/g, '%26');
      return `https://images.weserv.nl/?url=${source}`;
    }
  } catch {
    return null;
  }
  return value;
}

function getCardImages(poi) {
  const seen = new Set();
  const urls = [];

  const push = (raw) => {
    const uri = resolveImageUri(raw);
    if (uri && !seen.has(uri)) {
      seen.add(uri);
      urls.push(uri);
    }
  };

  if (Array.isArray(poi?.images)) {
    for (const img of poi.images) {
      push(img?.imageUrl ?? img?.image_url);
    }
  }
  if (Array.isArray(poi?.imageUrls)) {
    for (const url of poi.imageUrls) {
      push(url);
    }
  }
  push(poi?.imageUrl);

  return urls;
}

export default function VisitHistoryScreen({
  visitedPois = [],
  onBack,
  onOpenDetail,
  onOpenDirections,
  onAddToItinerary,
}) {
  const handlePressAddItinerary = (poi) => {
    if (onAddToItinerary) {
      onAddToItinerary(poi);
    } else {
      Alert.alert(
        'Ditambahkan ke Itinerary',
        `${poi.name || poi.poiName} berhasil ditambahkan ke rencana perjalananmu.`
      );
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header Halaman Histori Kunjungan */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onBack}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Kembali"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.darkPurple} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Histori Kunjungan</Text>
          <Text style={styles.headerSubtitle}>
            {visitedPois.length} destinasi Braga telah kamu kunjungi
          </Text>
        </View>

        <View style={styles.headerBadge}>
          <MaterialCommunityIcons
            name="history"
            size={20}
            color={COLORS.primaryPurple}
          />
        </View>
      </View>

      {/* Daftar POI yang Pernah Dikunjungi atau Empty State */}
      {visitedPois.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <MaterialCommunityIcons
              name="map-marker-check-outline"
              size={40}
              color={COLORS.primaryPurple}
            />
          </View>
          <Text style={styles.emptyTitle}>Belum Ada Histori Kunjungan</Text>
          <Text style={styles.emptyDesc}>
            Kunjungi destinasi di Jl. Braga dan tekan tombol Mark as Visited pada halaman detail destinasi untuk mencatat perjalananmu.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onBack}
            style={styles.exploreCtaBtn}
          >
            <Text style={styles.exploreCtaText}>Kembali ke Akun</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {visitedPois.map((item) => {
            const poiId = String(item.poiId ?? item.id ?? '');
            const poiName = item.name || item.poiName || 'Destinasi Braga';
            const normalizedPoi = {
              ...item,
              id: poiId,
              name: poiName,
            };

            const imageUrls = getCardImages(normalizedPoi);
            const distanceLabel = Number.isFinite(Number(item.distanceMeters))
              ? `${Math.round(Number(item.distanceMeters))} m`
              : item.distance || `${item.triggerRadiusMeters || 25} m`;

            const ratingValue = Number(item.rating);
            const hasRating = Number.isFinite(ratingValue) && ratingValue > 0;
            const ratingLabel = hasRating
              ? ratingValue.toFixed(1)
              : 'Belum ada rating';

            const visitedTimeLabel = formatVisitedTimestamp(
              item.visitedAt ?? item.visited_at
            );

            return (
              <View key={poiId || poiName} style={styles.card}>
                {/* Carousel Gambar POI */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselRow}
                >
                  {imageUrls.length > 0 ? (
                    imageUrls.map((uri, idx) => (
                      <Image
                        key={`${poiId}-img-${idx}`}
                        source={{ uri }}
                        style={styles.poiThumbImage}
                        resizeMode="cover"
                        accessibilityLabel={`Foto ${poiName} ${idx + 1}`}
                      />
                    ))
                  ) : (
                    <>
                      <WireframeImageBox width={105} height={105} />
                      <WireframeImageBox width={105} height={105} />
                      <WireframeImageBox width={105} height={105} />
                    </>
                  )}
                </ScrollView>

                {/* Informasi Utama POI */}
                <View style={styles.cardBody}>
                  <View style={styles.infoHeaderRow}>
                    <View style={styles.distanceCol}>
                      <View style={styles.pinBadge}>
                        <Ionicons
                          name="location"
                          size={16}
                          color={COLORS.darkPurple}
                        />
                      </View>
                      <Text style={styles.distanceText}>{distanceLabel}</Text>
                    </View>

                    <View style={styles.titleCol}>
                      <Text style={styles.poiName} numberOfLines={1}>
                        {poiName}
                      </Text>
                      <View style={styles.ratingRow}>
                        <Text style={styles.ratingText}>{ratingLabel}</Text>
                        {hasRating &&
                          getRatingStars(ratingValue).map((name, index) => (
                            <Ionicons
                              key={index}
                              name={name}
                              size={12}
                              color={COLORS.darkPurple}
                              style={{ marginLeft: 2 }}
                            />
                          ))}
                        <Text style={styles.categoryDot}>•</Text>
                        <Text style={styles.categoryText} numberOfLines={1}>
                          {item.category || 'Wisata Braga'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Keterangan Waktu Kunjungan */}
                  <View style={styles.visitedTimestampBadge}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={COLORS.darkPurple}
                    />
                    <Text style={styles.visitedTimestampText} numberOfLines={1}>
                      {visitedTimeLabel}
                    </Text>
                  </View>

                  {/* 4 Tombol Opsi Seragam dengan BookmarkScreen */}
                  <View style={styles.actionsGrid}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => onOpenDirections?.(normalizedPoi)}
                      style={[styles.actionBtn, styles.primaryPillBtn]}
                    >
                      <Text style={styles.primaryPillText}>Directions</Text>
                      <MaterialCommunityIcons
                        name="directions"
                        size={17}
                        color={COLORS.white}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => onOpenDetail?.(normalizedPoi)}
                      style={[styles.actionBtn, styles.outlinePillBtn]}
                    >
                      <Text style={styles.outlinePillText}>Check Detail</Text>
                      <Ionicons
                        name="information-circle-outline"
                        size={17}
                        color={COLORS.darkPurple}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handlePressAddItinerary(normalizedPoi)}
                      style={[styles.actionBtn, styles.outlinePillBtn]}
                    >
                      <Text style={styles.outlinePillText}>
                        Add to Itinerary
                      </Text>
                      <Ionicons
                        name="add-circle-outline"
                        size={17}
                        color={COLORS.darkPurple}
                      />
                    </TouchableOpacity>

                    <View style={[styles.actionBtn, styles.visitedStatusPill]}>
                      <Text style={styles.visitedStatusText}>Visited</Text>
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color={COLORS.darkPurple}
                      />
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.softLilacBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    paddingBottom: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.borderSubtle,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.lavenderTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: COLORS.lavenderTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  exploreCtaBtn: {
    backgroundColor: COLORS.darkPurple,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
  },
  exploreCtaText: {
    color: COLORS.white,
    fontSize: 13.5,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    paddingVertical: 12,
    elevation: 2,
  },
  carouselRow: {
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 10,
  },
  poiThumbImage: {
    width: 105,
    height: 105,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.lavenderTint,
  },
  cardBody: {
    paddingHorizontal: 14,
  },
  infoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  distanceCol: {
    alignItems: 'center',
    marginRight: 10,
  },
  pinBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
  },
  poiName: {
    fontSize: 15.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 3,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: 3,
  },
  categoryDot: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginHorizontal: 6,
  },
  categoryText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  visitedTimestampBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COLORS.lavenderTint,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
    marginBottom: 12,
  },
  visitedTimestampText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.darkPurple,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    gap: 5,
  },
  primaryPillBtn: {
    backgroundColor: COLORS.darkPurple,
    borderWidth: 1.5,
    borderColor: COLORS.darkPurple,
  },
  primaryPillText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  outlinePillBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
  },
  outlinePillText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  visitedStatusPill: {
    backgroundColor: COLORS.lavenderTint,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
  },
  visitedStatusText: {
    color: COLORS.darkPurple,
    fontSize: 12,
    fontWeight: '700',
  },
});