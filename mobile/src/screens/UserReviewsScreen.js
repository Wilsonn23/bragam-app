import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Modal,
  Platform,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import {
  fetchUserRatings,
  updatePoiRating,
  deletePoiRating,
} from '../poi/api';

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

function formatReviewDate(rawDate) {
  if (!rawDate) return 'Tanggal tidak tersedia';
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return 'Tanggal tidak tersedia';

  const day = parsed.getDate();
  const month = BULAN_ID[parsed.getMonth()];
  const year = parsed.getFullYear();
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}.${minutes}`;
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

function getPoiThumbUrl(poi) {
  if (!poi) return null;
  if (Array.isArray(poi.images) && poi.images.length > 0) {
    const first = poi.images[0]?.imageUrl ?? poi.images[0]?.image_url;
    const resolved = resolveImageUri(first);
    if (resolved) return resolved;
  }
  return resolveImageUri(poi.imageUrl ?? poi.image_url);
}

export default function UserReviewsScreen({
  user,
  allPois = [],
  onBack,
  onOpenDetail = undefined,
}) {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // State Modal Edit Ulasan
  const [editingItem, setEditingItem] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [editError, setEditError] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // State Modal Konfirmasi Hapus Ulasan
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadReviews = useCallback(async () => {
    if (!user?.id) {
      setReviews([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError('');
    try {
      const response = await fetchUserRatings(user.id);
      const list = Array.isArray(response)
        ? response
        : Array.isArray(response?.ratings)
        ? response.ratings
        : [];
      setReviews(list);
    } catch (err) {
      setLoadError(err?.message || 'Gagal memuat daftar ulasan.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditRating(Number(item.rating) || 5);
    setEditComment(item.review ?? item.comment ?? '');
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editingItem?.id) return;
    if (!Number.isInteger(editRating) || editRating < 1 || editRating > 5) {
      setEditError('Pilih rating antara 1 hingga 5 bintang.');
      return;
    }

    const trimmedReview = editComment.trim();
    setEditError('');
    setIsSavingEdit(true);

    try {
      const updated = await updatePoiRating(
        editingItem.id,
        editRating,
        trimmedReview
      );
      const nextRating = updated?.rating ?? editRating;
      const nextReview =
        updated?.review !== undefined ? updated.review : trimmedReview;
      const nextUpdatedAt = updated?.updated_at ?? new Date().toISOString();

      setReviews((prev) =>
        prev.map((r) =>
          String(r.id) === String(editingItem.id)
            ? {
                ...r,
                rating: nextRating,
                review: nextReview,
                updated_at: nextUpdatedAt,
              }
            : r
        )
      );
      setEditingItem(null);
      Alert.alert('Berhasil', 'Ulasan berhasil diperbarui.');
    } catch (err) {
      setEditError(err?.message || 'Gagal memperbarui ulasan.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem?.id) return;
    setIsDeleting(true);
    try {
      await deletePoiRating(deletingItem.id);
      setReviews((prev) =>
        prev.filter((r) => String(r.id) !== String(deletingItem.id))
      );
      setDeletingItem(null);
      Alert.alert('Dihapus', 'Ulasan berhasil dihapus.');
    } catch (err) {
      Alert.alert(
        'Gagal Menghapus',
        err?.message || 'Tidak dapat menghapus ulasan.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Header Halaman */}
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
          <Text style={styles.headerTitle}>Ulasan Saya</Text>
          <Text style={styles.headerSubtitle}>
            {reviews.length} ulasan destinasi Braga
          </Text>
        </View>

        <View style={styles.headerBadge}>
          <Ionicons name="star" size={18} color={COLORS.primaryPurple} />
        </View>
      </View>

      {/* Body */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryPurple} />
          <Text style={styles.loadingText}>Memuat ulasanmu...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={42} color="#B00020" />
          <Text style={styles.errorTitle}>Gagal Memuat Ulasan</Text>
          <Text style={styles.emptyDesc}>{loadError}</Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={loadReviews}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : reviews.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons
              name="star-outline"
              size={40}
              color={COLORS.primaryPurple}
            />
          </View>
          <Text style={styles.emptyTitle}>Belum Ada Ulasan</Text>
          <Text style={styles.emptyDesc}>
            Kamu belum memberikan ulasan untuk destinasi mana pun di Jl. Braga. Buka halaman detail destinasi dan pilih tab Review untuk mulai mengulas!
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onBack}
            style={styles.ctaBtn}
          >
            <Text style={styles.ctaBtnText}>Kembali ke Akun</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {reviews.map((item) => {
            const poiId = String(item.poi_id ?? item.poiId ?? '');
            const matchedPoi = allPois.find((p) => String(p.id) === poiId);
            const poiName =
              matchedPoi?.name ||
              item.poi_name ||
              item.poiName ||
              `Destinasi #${poiId}`;
            const poiCategory =
              matchedPoi?.category || item.poi_category || 'Wisata Braga';
            const thumbUrl = getPoiThumbUrl(matchedPoi);

            const ratingValue = Math.max(
              0,
              Math.min(5, Math.round(Number(item.rating) || 0))
            );
            const commentText = (item.review ?? item.comment ?? '').trim();

            const createdAt = item.created_at ?? item.createdAt;
            const updatedAt = item.updated_at ?? item.updatedAt;
            const isEdited =
              updatedAt &&
              createdAt &&
              new Date(updatedAt).getTime() - new Date(createdAt).getTime() >
                5000;
            const dateLabel = isEdited
              ? `Diperbarui ${formatReviewDate(updatedAt)}`
              : formatReviewDate(createdAt || updatedAt);

            return (
              <View key={String(item.id)} style={styles.card}>
                {/* Header Card: Info POI */}
                <TouchableOpacity
                  activeOpacity={matchedPoi && onOpenDetail ? 0.75 : 1}
                  disabled={!matchedPoi || !onOpenDetail}
                  onPress={() => matchedPoi && onOpenDetail?.(matchedPoi)}
                  style={styles.poiHeaderRow}
                >
                  {thumbUrl ? (
                    <Image
                      source={{ uri: thumbUrl }}
                      style={styles.poiThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.poiThumbPlaceholder}>
                      <Ionicons
                        name="location"
                        size={20}
                        color={COLORS.darkPurple}
                      />
                    </View>
                  )}

                  <View style={styles.poiTitleCol}>
                    <Text style={styles.poiName} numberOfLines={1}>
                      {poiName}
                    </Text>
                    <Text style={styles.poiCategory} numberOfLines={1}>
                      {poiCategory}
                    </Text>
                  </View>

                  {matchedPoi && onOpenDetail && (
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={COLORS.textSecondary}
                    />
                  )}
                </TouchableOpacity>

                {/* Baris Rating Bintang & Tanggal Ulasan */}
                <View style={styles.ratingDateRow}>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= ratingValue ? 'star' : 'star-outline'}
                        size={16}
                        color={COLORS.darkPurple}
                        style={{ marginRight: 2 }}
                      />
                    ))}
                    <Text style={styles.ratingNumberText}>
                      {ratingValue}.0
                    </Text>
                  </View>

                  <Text style={styles.dateText}>{dateLabel}</Text>
                </View>

                {/* Isi Komentar / Ulasan */}
                <View style={styles.commentBox}>
                  {commentText ? (
                    <Text style={styles.commentText}>{commentText}</Text>
                  ) : (
                    <Text style={styles.noCommentText}>
                      (Tidak ada komentar tertulis)
                    </Text>
                  )}
                </View>

                {/* Tombol Opsi: Edit & Hapus */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => openEditModal(item)}
                    style={[styles.optionBtn, styles.editOptionBtn]}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ulasan ${poiName}`}
                  >
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={COLORS.darkPurple}
                    />
                    <Text style={styles.editOptionText}>Edit Ulasan</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setDeletingItem({ ...item, poiName })}
                    style={[styles.optionBtn, styles.deleteOptionBtn]}
                    accessibilityRole="button"
                    accessibilityLabel={`Hapus ulasan ${poiName}`}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color="#B00020"
                    />
                    <Text style={styles.deleteOptionText}>Hapus</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* POP-UP EDIT ULASAN */}
      <Modal
        visible={Boolean(editingItem)}
        transparent
        animationType="fade"
        onRequestClose={() => !isSavingEdit && setEditingItem(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity
            style={styles.backdropTouchFill}
            activeOpacity={1}
            onPress={() => !isSavingEdit && setEditingItem(null)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Edit Ulasan</Text>
              <TouchableOpacity
                disabled={isSavingEdit}
                onPress={() => setEditingItem(null)}
              >
                <Ionicons name="close" size={22} color={COLORS.darkPurple} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Rating Bintang</Text>
            <View style={styles.editStarsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  activeOpacity={0.75}
                  onPress={() => setEditRating(star)}
                  style={styles.starTapBtn}
                >
                  <Ionicons
                    name={star <= editRating ? 'star' : 'star-outline'}
                    size={30}
                    color={COLORS.darkPurple}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Komentar / Ulasan</Text>
            <TextInput
              value={editComment}
              onChangeText={setEditComment}
              placeholder="Ceritakan pengalamanmu di destinasi ini..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={styles.commentInput}
            />

            {!!editError && <Text style={styles.errorText}>{editError}</Text>}

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSavingEdit}
                onPress={() => setEditingItem(null)}
                style={styles.cancelPillBtn}
              >
                <Text style={styles.cancelPillText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSavingEdit}
                onPress={handleSaveEdit}
                style={styles.primaryModalBtn}
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryModalBtnText}>Simpan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* POP-UP KONFIRMASI HAPUS ULASAN */}
      <Modal
        visible={Boolean(deletingItem)}
        transparent
        animationType="fade"
        onRequestClose={() => !isDeleting && setDeletingItem(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => !isDeleting && setDeletingItem(null)}
        >
          <View
            style={styles.confirmCard}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.warningIconCircle}>
              <Ionicons name="trash" size={28} color="#B00020" />
            </View>

            <Text style={styles.confirmTitle}>Hapus Ulasan?</Text>
            <Text style={styles.confirmMessage}>
              Apakah anda yakin ingin menghapus ulasan untuk{' '}
              <Text style={{ fontWeight: '700', color: COLORS.darkPurple }}>
                {deletingItem?.poiName || 'destinasi ini'}
              </Text>
              ?
            </Text>

            <View style={styles.modalFooterRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isDeleting}
                onPress={() => setDeletingItem(null)}
                style={styles.cancelPillBtn}
              >
                <Text style={styles.cancelPillText}>Tidak</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isDeleting}
                onPress={handleConfirmDelete}
                style={styles.dangerModalBtn}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryModalBtnText}>Ya, Hapus</Text>
                )}
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13.5,
    color: COLORS.textSecondary,
    fontWeight: '600',
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
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#B00020',
    marginTop: 10,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  ctaBtn: {
    backgroundColor: COLORS.darkPurple,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
  },
  ctaBtnText: {
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
    padding: 14,
    elevation: 2,
  },
  poiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    gap: 10,
  },
  poiThumb: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.lavenderTint,
  },
  poiThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.lavenderTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poiTitleCol: {
    flex: 1,
  },
  poiName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  poiCategory: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  ratingDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingNumberText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.darkPurple,
    marginLeft: 5,
  },
  dateText: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
  },
  commentBox: {
    backgroundColor: COLORS.softLilacBg,
    borderRadius: RADIUS.md,
    padding: 12,
    marginBottom: 12,
  },
  commentText: {
    fontSize: 13.5,
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  noCommentText: {
    fontSize: 12.5,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    gap: 5,
  },
  editOptionBtn: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
  },
  editOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  deleteOptionBtn: {
    backgroundColor: '#FFF0F2',
    borderWidth: 1.5,
    borderColor: '#F5B7C0',
  },
  deleteOptionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B00020',
  },
  // --- Modals ---
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(49, 20, 101, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  backdropTouchFill: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    padding: 20,
    elevation: 6,
  },
  confirmCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    padding: 20,
    alignItems: 'center',
    elevation: 6,
  },
  warningIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    fontSize: 13.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 6,
  },
  editStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  starTapBtn: {
    padding: 2,
  },
  commentInput: {
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 92,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.softLilacBg,
  },
  errorText: {
    color: '#B00020',
    fontSize: 12.5,
    fontWeight: '500',
    marginTop: 8,
  },
  modalFooterRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 18,
  },
  cancelPillBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  cancelPillText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.primaryPurple,
  },
  primaryModalBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.darkPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerModalBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
    backgroundColor: '#B00020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryModalBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: COLORS.white,
  },
});