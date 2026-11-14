import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from './theme';
import { WireframeImageBox } from './PoiCardComponents';

export default function PoiTriggerModal({
  visible,
  poi,
  onClose,
  onCheckNow,
  onDirections,
  onSave,
  onAddToItinerary,
}) {
  if (!visible || !poi) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.heading}>Ada lokasi menarik di dekatmu!</Text>

          {/* 3 Wireframe Image Boxes */}
          <View style={styles.galleryRow}>
            <WireframeImageBox style={styles.galleryBox} height={92} />
            <WireframeImageBox style={styles.galleryBox} height={92} />
            <WireframeImageBox style={styles.galleryBox} height={92} />
          </View>

          {/* POI Info */}
          <View style={styles.infoRow}>
            <View style={styles.distanceCol}>
              <View style={styles.pinBadge}>
                <Ionicons name="location" size={18} color={COLORS.darkPurple} />
              </View>
              <Text style={styles.distanceText}>{poi.distance || '12km'}</Text>
            </View>

            <View style={styles.titleCol}>
              <Text style={styles.poiTitle}>{poi.name}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingText}>{poi.rating || '5.0'}</Text>
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
          </View>

          {/* Row 1: Directions, Save, Add to Itinerary */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onDirections?.(poi)}
              style={styles.outlinePillBtn}
            >
              <Text style={styles.outlinePillText}>Directions</Text>
              <MaterialCommunityIcons
                name="directions"
                size={16}
                color={COLORS.darkPurple}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onSave?.(poi)}
              style={styles.outlinePillBtn}
            >
              <Text style={styles.outlinePillText}>Save</Text>
              <Ionicons
                name="bookmark"
                size={14}
                color={COLORS.darkPurple}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onAddToItinerary?.(poi)}
              style={styles.outlinePillBtn}
            >
              <Text style={styles.outlinePillText}>Add to Itinerary</Text>
              <Ionicons
                name="add-circle-outline"
                size={16}
                color={COLORS.darkPurple}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>
          </View>

          {/* Row 2: Cek Sekarang & Gak dulu deh */}
          <View style={styles.ctaRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => onCheckNow?.(poi)}
              style={styles.primaryCtaBtn}
            >
              <Text style={styles.primaryCtaText}>Cek Sekarang</Text>
              <View style={styles.chevronCircle}>
                <Ionicons
                  name="chevron-forward"
                  size={13}
                  color={COLORS.darkPurple}
                />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onClose}
              style={styles.secondaryCtaBtn}
            >
              <Text style={styles.secondaryCtaText}>Gak dulu deh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(30, 14, 62, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  heading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 14,
  },
  galleryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  galleryBox: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 15,
    fontWeight: '600',
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
    marginRight: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 14,
  },
  outlinePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  outlinePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  ctaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  primaryCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkPurple,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: RADIUS.pill,
  },
  primaryCtaText: {
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
  secondaryCtaBtn: {
    borderWidth: 1.6,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  secondaryCtaText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});