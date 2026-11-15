import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Image, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import { WireframeImageBox } from '../components/PoiCardComponents';
import { getOperatingStatus, getPoiDetailFields, getPoiGalleryImages, getRatingStars } from '../poi/presentation';
import { useAppActive, useForegroundLocation } from '../hooks/useForegroundLocation';
import { distanceMeters } from '../location/distance';

const DETAIL_TABS = ['Overview', 'Menu', 'Review', 'About'];

export default function PoiDetailScreen({ poi, onBack, onOpenDirections, audioControl }) {
  const appActive = useAppActive();
  const { sample } = useForegroundLocation(appActive);
  const [activeTab, setActiveTab] = useState('Overview');
  const [failedImages, setFailedImages] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setNow(Date.now());
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []);
  const fields = getPoiDetailFields({ ...poi, distanceMeters: distanceMeters(sample, poi) });
  const operatingStatus = getOperatingStatus(poi.openingHours, new Date(now));
  const images = getPoiGalleryImages(poi).filter(uri => !failedImages.includes(uri));

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
            <View style={styles.ratingRow}>
              <Text style={styles.ratingText}>{fields.rating}</Text>
              {getRatingStars(poi.rating).map((name, index) => (
                <Ionicons key={index} name={name} size={14} color={COLORS.darkPurple} />
              ))}
            </View>
          </View>
          {audioControl}
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !onOpenDirections }} disabled={!onOpenDirections}
            onPress={() => onOpenDirections?.(poi)} style={[styles.outlinePillBtn, !onOpenDirections && styles.disabled]}>
            <Text style={styles.outlinePillText}>Directions</Text>
            <MaterialCommunityIcons name="directions" size={17} color={COLORS.darkPurple} style={{ marginLeft: 5 }} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={[styles.outlinePillBtn, styles.disabled]}>
            <Text style={styles.outlinePillText}>Save</Text><Ionicons name="bookmark" size={15} color={COLORS.darkPurple} style={{ marginLeft: 5 }} />
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: true }} disabled style={[styles.outlinePillBtn, styles.disabled]}>
            <Text style={styles.outlinePillText}>Add to Itinerary</Text><Ionicons name="add-circle-outline" size={17} color={COLORS.darkPurple} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
        <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryGrid}>
          {images.length ? images.map((uri, index) => <Image key={uri} source={{ uri }}
            accessibilityLabel={`Foto ${poi.name} ${index + 1} dari ${images.length}`}
            onError={() => setFailedImages(previous => [...previous, uri])} style={styles.galleryImage} />) :
            <WireframeImageBox width={220} height={232} />}
        </ScrollView>
        {!images.length && <Text style={styles.galleryCaption}>Foto belum tersedia</Text>}
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
          {activeTab === 'Review' && <>
            <DetailRow icon="star-outline" value={fields.ratingSummary} />
            <DetailRow icon="chatbubble-outline" value={fields.reviews} />
          </>}
          {activeTab === 'About' && <DetailRow icon="book-outline" value={fields.history} />}
        </View>
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
  galleryImage: { width: 220, height: 232, borderRadius: RADIUS.md, backgroundColor: COLORS.lavenderTint },
  galleryCaption: { color: COLORS.textSecondary, fontSize: 12, marginHorizontal: 20, marginTop: 6 },
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
  galleryGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 10,
  },
  leftLargeBox: {
    flex: 1.35,
  },
  rightStackedCol: {
    flex: 1,
    gap: 10,
  },
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
