import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import { WireframeImageBox } from '../components/PoiCardComponents';

export default function BookmarkScreen({
  bookmarkedPois = [],
  onBack,
  onOpenDetail,
  onOpenDirections,
  onRemoveBookmark,
  onAddToItinerary,
}) {
  // State untuk menyimpan POI yang sedang dikonfirmasi untuk dihapus (Unsave)
  const [poiToUnsave, setPoiToUnsave] = useState(null);

  const handleConfirmUnsave = () => {
    if (poiToUnsave) {
      onRemoveBookmark?.(poiToUnsave);
      setPoiToUnsave(null);
    }
  };

  const handlePressAddItinerary = (poi) => {
    if (onAddToItinerary) {
      onAddToItinerary(poi);
    } else {
      Alert.alert(
        'Ditambahkan ke Itinerary',
        `${poi.name} berhasil ditambahkan ke rencana perjalananmu.`
      );
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header Halaman Bookmark */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onBack}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.darkPurple} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Saved Bookmarks</Text>
          <Text style={styles.headerSubtitle}>
            {bookmarkedPois.length} tempat tersimpan di Jl. Braga
          </Text>
        </View>

        <View style={styles.headerBadge}>
          <Ionicons name="bookmark" size={18} color={COLORS.primaryPurple} />
        </View>
      </View>

      {/* Daftar POI Tersimpan atau Empty State */}
      {bookmarkedPois.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons
              name="bookmark-outline"
              size={40}
              color={COLORS.primaryPurple}
            />
          </View>
          <Text style={styles.emptyTitle}>Belum Ada POI Tersimpan</Text>
          <Text style={styles.emptyDesc}>
            Tekan tombol Save pada halaman detail POI untuk menyimpannya ke daftar Bookmark.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onBack}
            style={styles.exploreCtaBtn}
          >
            <Text style={styles.exploreCtaText}>Jelajahi Jl. Braga</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {bookmarkedPois.map((poi) => {
            const distanceLabel =
              poi.distance || `${poi.triggerRadiusMeters || 15}m`;
            const ratingLabel = poi.rating || '4.6';

            return (
              <View key={String(poi.id || poi.name)} style={styles.card}>
                {/* Carousel Gambar Placeholder */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carouselRow}
                >
                  <WireframeImageBox width={105} height={105} />
                  <WireframeImageBox width={105} height={105} />
                  <WireframeImageBox width={105} height={105} />
                </ScrollView>

                {/* Informasi Utama POI (Seragam dengan PoiDetailFooter di ExploreScreen) */}
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
                        {poi.name}
                      </Text>
                      <View style={styles.ratingRow}>
                        <Text style={styles.ratingText}>{ratingLabel}</Text>
                        {[1, 2, 3, 4].map((star) => (
                          <Ionicons
                            key={star}
                            name="star"
                            size={12}
                            color={COLORS.darkPurple}
                            style={{ marginLeft: 2 }}
                          />
                        ))}
                        <Text style={styles.categoryDot}>•</Text>
                        <Text style={styles.categoryText} numberOfLines={1}>
                          {poi.category || 'Wisata Braga'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* 4 Tombol Opsi dengan Simbol yang Sama seperti ExploreScreen */}
                  <View style={styles.actionsGrid}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => onOpenDirections?.(poi)}
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
                      onPress={() => onOpenDetail?.(poi)}
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
                      onPress={() => handlePressAddItinerary(poi)}
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

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setPoiToUnsave(poi)}
                      style={[styles.actionBtn, styles.unsavePillBtn]}
                    >
                      <Text style={styles.unsavePillText}>Unsave</Text>
                      <Ionicons
                        name="bookmark"
                        size={15}
                        color="#B00020"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Pop-up Konfirmasi Unsave */}
      <Modal
        visible={Boolean(poiToUnsave)}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPoiToUnsave(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setPoiToUnsave(null)}
        >
          <View
            style={styles.confirmCard}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.warningIconCircle}>
              <Ionicons name="alert-circle" size={32} color="#B00020" />
            </View>

            <Text style={styles.confirmTitle}>Hapus Bookmark?</Text>
            <Text style={styles.confirmMessage}>
              Apakah anda yakin ingin menghapus POI ini dari Bookmark?
            </Text>
            {poiToUnsave?.name && (
              <Text style={styles.confirmPoiName}>{`"${poiToUnsave.name}"`}</Text>
            )}

            <View style={styles.confirmButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setPoiToUnsave(null)}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Tidak</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleConfirmUnsave}
                style={styles.yesBtn}
              >
                <Text style={styles.yesBtnText}>Ya</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
  cardBody: {
    paddingHorizontal: 14,
  },
  infoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  unsavePillBtn: {
    backgroundColor: '#FFF0F2',
    borderWidth: 1.5,
    borderColor: '#F5B7C0',
  },
  unsavePillText: {
    color: '#B00020',
    fontSize: 12,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(49, 20, 101, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  confirmCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    padding: 20,
    alignItems: 'center',
  },
  warningIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFF0F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  confirmMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmPoiName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.darkPurple,
    marginTop: 6,
    marginBottom: 18,
  },
  confirmButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primaryPurple,
  },
  yesBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
    backgroundColor: '#B00020',
    alignItems: 'center',
  },
  yesBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
});
