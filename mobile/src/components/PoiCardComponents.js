import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from './theme';

export function WireframeImageBox({ width = '100%', height = 160, style }) {
  return (
    <View style={[styles.imagePlaceholder, { width, height }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Line x1="4" y1="4" x2="96" y2="96" stroke={COLORS.primaryPurple} strokeWidth="1.5" />
        <Line x1="96" y1="4" x2="4" y2="96" stroke={COLORS.primaryPurple} strokeWidth="1.5" />
      </Svg>
    </View>
  );
}

/** @param {{name?:string, distance?:string, rating?:any, recommendation?:boolean, isSaved?:boolean,
 * onCheckDetail?:()=>void, onDirections?:()=>void, onSave?:()=>void, onAddToItinerary?:()=>void}} props */
export function PoiDetailFooter({
  name = 'Braga Citywalk',
  distance = '12km',
  rating = '5.0',
  isSaved = false,
  recommendation = false,
  onCheckDetail,
  onDirections,
  onSave,
  onAddToItinerary,
}) {
  return (
    <View style={styles.footerWrapper}>
      {/* Info Row: Pin + Nama + Rating + Check Detail */}
      <View style={[styles.infoRow, recommendation && styles.recommendationInfo]}>
        <View style={styles.distanceCol}>
          <View style={styles.pinBadge}>
            <Ionicons name="location" size={18} color={COLORS.darkPurple} />
          </View>
          <Text accessibilityLabel={distance} style={[styles.distanceText, recommendation && styles.jakarta]}>
            {recommendation && distance === 'Jarak belum tersedia' ? '—' : distance}
          </Text>
        </View>

        <View style={[styles.titleCol, recommendation && styles.recommendationTitle]}>
          <Text style={[styles.poiTitle, recommendation && styles.jakarta]} numberOfLines={recommendation ? undefined : 1}>
            {name}
          </Text>
          <View style={[styles.ratingRow, recommendation && styles.recommendationRating]}>
            <Text style={[styles.ratingText, recommendation && styles.jakarta]}>{recommendation
              ? rating ? `${rating.value.toFixed(1)} (${rating.count})` : 'Belum ada ulasan'
              : rating}</Text>
            {(recommendation ? rating ? [1, 2, 3, 4, 5] : [] : [1, 2, 3, 4]).map((star) => (
              <Ionicons
                key={star}
                name={recommendation && star > rating.value ? star - rating.value < 1 ? 'star-half' : 'star-outline' : 'star'}
                size={14}
                color={COLORS.darkPurple}
                style={{ marginLeft: 2 }}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Check Detail ${name}`}
          disabled={recommendation && !onCheckDetail}
          onPress={onCheckDetail}
          style={[styles.checkDetailBtn, recommendation && styles.recommendationAction]}
        >
          <Text style={[styles.checkDetailText, recommendation && styles.jakarta]}>Check Detail</Text>
          <View style={styles.chevronCircle}>
            <Ionicons name="chevron-forward" size={13} color={COLORS.darkPurple} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Action Buttons Row */}
      <View style={[styles.actionRow, recommendation && styles.recommendationActions]}>
        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Directions ${name}`}
          disabled={recommendation && !onDirections}
          accessibilityState={{ disabled: recommendation && !onDirections }}
          onPress={onDirections}
          style={[styles.outlinePillBtn, recommendation && styles.recommendationAction,
            recommendation && !onDirections && styles.disabled]}
        >
          <Text style={[styles.outlinePillText, recommendation && styles.jakarta]}>Directions</Text>
          <MaterialCommunityIcons
            name="directions"
            size={17}
            color={COLORS.darkPurple}
            style={{ marginLeft: 5 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${isSaved ? 'Saved' : 'Save'} ${name}`}
          accessibilityState={{ selected: isSaved, disabled: recommendation && !onSave }}
          disabled={recommendation && !onSave}
          onPress={onSave}
          style={[
            styles.outlinePillBtn,
            recommendation && styles.recommendationAction,
            recommendation && !onSave && styles.disabled,
            isSaved && styles.savedPillBtnActive,
          ]}
        >
          <Text
            style={[
              styles.outlinePillText,
              recommendation && styles.jakarta,
              isSaved && styles.savedPillTextActive,
            ]}
          >
            {isSaved ? 'Saved' : 'Save'}
          </Text>
          <Ionicons
            name="bookmark"
            size={15}
            color={isSaved ? COLORS.white : COLORS.darkPurple}
            style={{ marginLeft: 5 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Add to Itinerary ${name}`}
          accessibilityState={{ disabled: recommendation && !onAddToItinerary }}
          disabled={recommendation && !onAddToItinerary}
          onPress={onAddToItinerary}
          style={[styles.outlinePillBtn, recommendation && styles.recommendationAction,
            recommendation && !onAddToItinerary && styles.disabled]}
        >
          <Text style={[styles.outlinePillText, recommendation && styles.jakarta]}>Add to Itinerary</Text>
          <Ionicons
            name="add-circle-outline"
            size={17}
            color={COLORS.darkPurple}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  jakarta: { fontFamily: 'PB12Jakarta' },
  recommendationInfo: { flexWrap: 'wrap', gap: 8 },
  recommendationTitle: { minWidth: 110 },
  recommendationRating: { flexWrap: 'wrap' },
  recommendationActions: { flexWrap: 'wrap', justifyContent: 'flex-start' },
  recommendationAction: { minHeight: 44, justifyContent: 'center' },
  disabled: { opacity: 0.45 },
  imagePlaceholder: {
    backgroundColor: COLORS.lavenderTint,
    borderRadius: RADIUS.md,
    borderWidth: 1.8,
    borderColor: COLORS.primaryPurple,
    overflow: 'hidden',
  },
  footerWrapper: {
    marginTop: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontWeight: '500',
  },
  titleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  poiTitle: {
    fontSize: 15,
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
    fontWeight: '500',
  },
  checkDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkPurple,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 8,
    borderRadius: RADIUS.pill,
  },
  checkDetailText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  chevronCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
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
  savedPillBtnActive: {
    backgroundColor: COLORS.darkPurple,
    borderColor: COLORS.darkPurple,
  },
  outlinePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  savedPillTextActive: {
    color: COLORS.white,
  },
});
