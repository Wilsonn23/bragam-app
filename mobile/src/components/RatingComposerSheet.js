import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from './theme';
import { StarInput } from './StarRating';
import { MAX_REVIEW_LENGTH, RATING_LABELS } from '../poi/ratings';

/**
 * Bottom sheet for creating or editing the user's rating.
 * The parent remounts it (via `key`) per opening so state starts from `initialRating`.
 */
export default function RatingComposerSheet({ visible, poiName, initialRating = null, initialStars = 0, onClose, onSubmit }) {
  const isEdit = Boolean(initialRating);
  const [rating, setRating] = useState(initialStars || initialRating?.rating || 0);
  const [review, setReview] = useState(initialRating?.review || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [focused, setFocused] = useState(false);

  const unchanged = isEdit && rating === initialRating.rating && review.trim() === (initialRating.review || '').trim();
  const canSubmit = rating > 0 && !submitting && !unchanged;

  const close = () => { if (!submitting) onClose(); };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ rating, review: review.trim() });
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan ulasan. Coba lagi.');
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Tutup" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{isEdit ? 'Edit Ulasan' : 'Beri Ulasan'}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>{poiName}</Text>
            </View>
            <TouchableOpacity onPress={close} disabled={submitting} style={styles.closeBtn}
              accessibilityRole="button" accessibilityLabel="Tutup">
              <Ionicons name="close" size={20} color={COLORS.darkPurple} />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <Text style={styles.question}>Bagaimana pengalamanmu di sini?</Text>
            <StarInput value={rating} onChange={setRating} disabled={submitting} />
            <View style={[styles.labelPill, rating > 0 && styles.labelPillActive]}>
              <Text style={[styles.labelText, rating > 0 && styles.labelTextActive]}>
                {rating > 0 ? RATING_LABELS[rating] : 'Ketuk bintang untuk menilai'}
              </Text>
            </View>

            <Text style={styles.fieldLabel}>Ceritakan pengalamanmu <Text style={styles.optional}>(opsional)</Text></Text>
            <View style={[styles.inputBox, focused && styles.inputBoxFocused]}>
              <TextInput
                value={review}
                onChangeText={setReview}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                editable={!submitting}
                multiline
                maxLength={MAX_REVIEW_LENGTH}
                placeholder="Suasana, pelayanan, menu favorit, tips berkunjung…"
                placeholderTextColor={COLORS.textMuted}
                style={styles.input}
                textAlignVertical="top"
                accessibilityLabel="Tulis ulasan"
              />
              <Text style={styles.counter}>{review.length}/{MAX_REVIEW_LENGTH}</Text>
            </View>

            {!!error && (
              <View style={styles.errorBox} accessibilityLiveRegion="polite">
                <Ionicons name="alert-circle" size={16} color="#a52222" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={submit} disabled={!canSubmit} activeOpacity={0.85}
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              accessibilityRole="button" accessibilityState={{ disabled: !canSubmit, busy: submitting }}>
              {submitting
                ? <ActivityIndicator color={COLORS.white} />
                : <>
                  <Text style={styles.submitText}>{isEdit ? 'Simpan Perubahan' : 'Kirim Ulasan'}</Text>
                  <Ionicons name="send" size={15} color={COLORS.white} style={{ marginLeft: 8 }} />
                </>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(49, 20, 101, 0.45)' },
  sheet: {
    backgroundColor: COLORS.softLilacBg,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  handle: {
    alignSelf: 'center', width: 44, height: 5, borderRadius: 3,
    backgroundColor: COLORS.borderSubtle, marginTop: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingTop: 14 },
  headerText: { flex: 1, paddingRight: 10 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.lavenderTint,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 8 },
  question: { textAlign: 'center', fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 },
  labelPill: {
    alignSelf: 'center', marginTop: 10, paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: RADIUS.pill, backgroundColor: 'transparent',
  },
  labelPillActive: { backgroundColor: COLORS.lavenderTint },
  labelText: { fontSize: 13, color: COLORS.textMuted },
  labelTextActive: { color: COLORS.darkPurple, fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginTop: 24, marginBottom: 8 },
  optional: { fontWeight: '400', color: COLORS.textMuted },
  inputBox: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.md, borderWidth: 1.5,
    borderColor: COLORS.borderSubtle, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
  },
  inputBoxFocused: { borderColor: COLORS.primaryPurple },
  input: { minHeight: 110, maxHeight: 200, fontSize: 14, lineHeight: 20, color: COLORS.textPrimary, padding: 0 },
  counter: { alignSelf: 'flex-end', fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12,
    backgroundColor: '#FCEBEB', borderRadius: RADIUS.sm, padding: 10,
  },
  errorText: { flex: 1, fontSize: 12, color: '#a52222' },
  footer: { paddingHorizontal: 22, paddingTop: 12 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 50,
    borderRadius: RADIUS.pill, backgroundColor: COLORS.darkPurple,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});
