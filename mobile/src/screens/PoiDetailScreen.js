import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import { WireframeImageBox } from '../components/PoiCardComponents';
import { detailContent } from '../poi/detail';

const DETAIL_TABS = ['Overview', 'Menu', 'Review', 'About'];

export default function PoiDetailScreen({ poi, onBack, onOpenDirections, audio = undefined }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [failedImage, setFailedImage] = useState(null);

  const placeName = poi.name;
  const distance = poi.distance;
  const rating = poi.rating;
  const content = detailContent(poi);
  const isAudioOn = audio?.currentId === poi.id && audio.status.playing;
  const audioFailed = audio?.currentId === poi.id && (audio.error || audio.status.error);

  return (
    <SafeAreaView style={styles.root}>
      {/* Top Back Button */}
      <View style={styles.topBar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Kembali" onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.darkPurple} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Info + Nyalakan Audio */}
        <View style={styles.headerInfoRow}>
          <View style={styles.distanceCol}>
            <View style={styles.pinBadge}>
              <Ionicons name="location" size={18} color={COLORS.darkPurple} />
            </View>
            {distance && <Text style={styles.distanceText}>{distance}</Text>}
          </View>

          <View style={styles.titleCol}>
            <Text style={styles.poiTitle}>{placeName}</Text>
            {rating && <View style={styles.ratingRow}>
              <Text style={styles.ratingText}>{rating}</Text>
              {[1, 2, 3, 4].map((star) => (
                <Ionicons
                  key={star}
                  name="star"
                  size={14}
                  color={COLORS.darkPurple}
                  style={{ marginLeft: 2 }}
                />
              ))}
            </View>}
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={content.audioUrl ? isAudioOn ? 'Jeda narasi' : 'Putar narasi' : 'Audio belum tersedia'}
            accessibilityState={{ disabled: !content.audioUrl || !audio }}
            disabled={!content.audioUrl || !audio}
            onPress={() => audio?.toggle({ ...poi, audioUrl: content.audioUrl })}
            style={[styles.audioBtn, (!content.audioUrl || !audio) && { opacity: 0.5 }]}
          >
            <Text style={styles.audioBtnText}>
              {!content.audioUrl ? 'Audio belum tersedia' : isAudioOn ? 'Matikan Audio' : 'Nyalakan Audio'}
            </Text>
            <Ionicons
              name={isAudioOn ? 'volume-mute' : 'volume-high'}
              size={18}
              color={COLORS.white}
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>
        </View>
        <Text style={[styles.detailText, { paddingHorizontal: 20, marginTop: 12 }]}>{poi.category}</Text>
        {audioFailed && <Text accessibilityLiveRegion="polite" style={[styles.detailText, { paddingHorizontal: 20 }]}>Audio tidak dapat diputar. Coba lagi.</Text>}

        {/* Action Pills: Directions, Save, Add to Itinerary */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Petunjuk arah ke ${placeName}`}
            onPress={() => onOpenDirections?.(poi)}
            style={styles.outlinePillBtn}
          >
            <Text style={styles.outlinePillText}>Directions</Text>
            <MaterialCommunityIcons
              name="directions"
              size={17}
              color={COLORS.darkPurple}
              style={{ marginLeft: 5 }}
            />
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} disabled accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityHint="Fitur ini belum tersedia" style={[styles.outlinePillBtn, { opacity: 0.5 }]}>
            <Text style={styles.outlinePillText}>Save</Text>
            <Ionicons
              name="bookmark"
              size={15}
              color={COLORS.darkPurple}
              style={{ marginLeft: 5 }}
            />
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} disabled accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityHint="Fitur ini belum tersedia" style={[styles.outlinePillBtn, { opacity: 0.5 }]}>
            <Text style={styles.outlinePillText}>Add to Itinerary</Text>
            <Ionicons
              name="add-circle-outline"
              size={17}
              color={COLORS.darkPurple}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        </View>

        {/* Asymmetric 3-Box Wireframe Gallery */}
        <View style={styles.galleryGrid}>
          {poi.imageUrl && failedImage !== poi.imageUrl ?
            <Image source={{ uri: poi.imageUrl }} accessibilityLabel={`Foto ${placeName}`} style={[styles.leftLargeBox, { height: 232, borderRadius: RADIUS.md }]} onError={() => setFailedImage(poi.imageUrl)} /> :
            <WireframeImageBox style={styles.leftLargeBox} height={232} />}
          <View style={styles.rightStackedCol}>
            <WireframeImageBox width="100%" height={111} />
            <WireframeImageBox width="100%" height={111} />
          </View>
        </View>

        {/* Tabs Bar */}
        <View style={styles.tabsRow}>
          {DETAIL_TABS.map((tab) => {
            const isSelected = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                activeOpacity={0.85}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabPill, isSelected && styles.tabPillActive]}
              >
                <Text
                  style={[
                    styles.tabText,
                    isSelected && styles.tabTextActive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        {activeTab === 'Overview' ? (
          <View style={styles.overviewList}>
            <View style={styles.detailRow}><Text style={styles.detailText}>{content.description}</Text></View>
            {/* Row 1: Address */}
            <View style={styles.detailRow}>
              <Ionicons
                name="location"
                size={22}
                color={COLORS.darkPurple}
                style={styles.detailIcon}
              />
              <Text style={styles.detailText}>
                {content.address}
              </Text>
            </View>

            {/* Row 2: Operating Hours */}
            <View style={styles.detailRow}>
              <Ionicons
                name="time-outline"
                size={22}
                color={COLORS.darkPurple}
                style={styles.detailIcon}
              />
              <View style={styles.hoursGroup}>
                <Text style={styles.detailText}>{content.openingHours}</Text>
              </View>
            </View>

            {/* Row 3: Website */}
            <View style={styles.detailRow}>
              <Ionicons
                name="globe"
                size={22}
                color={COLORS.darkPurple}
                style={styles.detailIcon}
              />
              <Text style={styles.detailText}>
                {content.website}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.placeholderTabBox}>
            <Text style={styles.placeholderTabText}>
              {activeTab === 'Menu' ? content.menu : activeTab === 'Review' ? content.reviews : content.description}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
    marginRight: 10,
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
  },
  poiTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 6,
  },
  outlinePillBtn: {
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
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.lavenderTint,
  },
  tabPill: {
    paddingVertical: 7,
    paddingHorizontal: 16,
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
