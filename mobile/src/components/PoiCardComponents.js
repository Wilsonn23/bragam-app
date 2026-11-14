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

export function PoiDetailFooter({
  name = 'Braga Citywalk',
  distance = '12km',
  rating = '5.0',
  onCheckDetail,
  onDirections,
  onSave,
  onAddToItinerary,
}) {
  return (
    <View style={styles.footerWrapper}>
      {/* Info Row: Pin + Nama + Rating + Check Detail */}
      <View style={styles.infoRow}>
        <View style={styles.distanceCol}>
          <View style={styles.pinBadge}>
            <Ionicons name="location" size={18} color={COLORS.darkPurple} />
          </View>
          <Text style={styles.distanceText}>{distance}</Text>
        </View>

        <View style={styles.titleCol}>
          <Text style={styles.poiTitle} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.ratingRow}>
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
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onCheckDetail}
          style={styles.checkDetailBtn}
        >
          <Text style={styles.checkDetailText}>Check Detail</Text>
          <View style={styles.chevronCircle}>
            <Ionicons name="chevron-forward" size={13} color={COLORS.darkPurple} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onDirections}
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

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onSave}
          style={styles.outlinePillBtn}
        >
          <Text style={styles.outlinePillText}>Save</Text>
          <Ionicons
            name="bookmark"
            size={15}
            color={COLORS.darkPurple}
            style={{ marginLeft: 5 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onAddToItinerary}
          style={styles.outlinePillBtn}
        >
          <Text style={styles.outlinePillText}>Add to Itinerary</Text>
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
  outlinePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});