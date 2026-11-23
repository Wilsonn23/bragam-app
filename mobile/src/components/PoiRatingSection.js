import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from './theme';
import { StarDisplay, StarInput } from './StarRating';
import RatingComposerSheet from './RatingComposerSheet';
import { fetchPoiRatings, submitPoiRating, deletePoiRating } from '../poi/api';
import {
  normalizeRatingSummary, breakdownRows, findUserRating, filterRatings,
  formatRelativeTime, initialsOf, RATING_LABELS,
} from '../poi/ratings';

/** @typedef {import('../poi/ratings').RatingSummary} RatingSummary */
/** @typedef {import('../poi/ratings').PoiRating} PoiRating */

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'text', label: 'Dengan ulasan' },
  { key: 5, label: '5' }, { key: 4, label: '4' }, { key: 3, label: '3' }, { key: 2, label: '2' }, { key: 1, label: '1' },
];

/**
 * Review tab content: live summary, the user's own rating, filters and the review list.
 * @param {{poi: any, currentUser: any, onSummaryChange?: (summary: RatingSummary) => void}} props
 */
export default function PoiRatingSection({ poi, currentUser, onSummaryChange }) {
  const userId = currentUser?.id || null;
  const [summary, setSummary] = useState(/** @type {RatingSummary|null} */ (null));
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState(/** @type {string|number} */ ('all'));
  const [composer, setComposer] = useState(/** @type {{key:number, stars:number}|null} */ (null));
  const [deleting, setDeleting] = useState(false);
  const [thanks, setThanks] = useState(false);
  const thanksTimer = useRef(null);
  const summaryCallback = useRef(onSummaryChange);
  useEffect(() => { summaryCallback.current = onSummaryChange; }, [onSummaryChange]);

  const load = useCallback(() => fetchPoiRatings(poi.id).then(data => {
    const next = normalizeRatingSummary(data);
    setSummary(next);
    setStatus('ready');
    setError(null);
    summaryCallback.current?.(next);
    return next;
  }), [poi.id]);

  useEffect(() => {
    let active = true;
    load().catch(err => {
      if (!active) return;
      setStatus('error');
      setError(err?.message || 'Gagal memuat ulasan.');
    });
    return () => { active = false; };
  }, [load, attempt]);

  useEffect(() => () => clearTimeout(thanksTimer.current), []);

  const retry = () => { setStatus('loading'); setAttempt(n => n + 1); };

  const myRating = summary ? findUserRating(summary.ratings, userId) : null;

  const openComposer = (stars = 0) => setComposer({ key: Date.now(), stars });

  const handleSubmit = async ({ rating, review }) => {
    await submitPoiRating(poi.id, userId, rating, review);
    setComposer(null);
    setThanks(true);
    clearTimeout(thanksTimer.current);
    thanksTimer.current = setTimeout(() => setThanks(false), 3500);
    await load().catch(() => retry());
  };

  const handleDelete = () => {
    if (!myRating) return;
    Alert.alert('Hapus ulasan?', 'Rating dan ulasanmu untuk destinasi ini akan dihapus.', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive', onPress: async () => {
          setDeleting(true);
          try {
            await deletePoiRating(myRating.id);
            setThanks(false);
            await load();
          } catch (err) {
            Alert.alert('Gagal menghapus', err?.message || 'Coba lagi nanti.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  if (status === 'loading' && !summary) return <LoadingState />;
  if (status === 'error' && !summary) {
    return (
      <View style={styles.stateBox}>
        <View style={styles.stateIcon}><Ionicons name="cloud-offline-outline" size={28} color={COLORS.primaryPurple} /></View>
        <Text style={styles.stateTitle}>Ulasan belum bisa dimuat</Text>
        <Text style={styles.stateText}>{error}</Text>
        <TouchableOpacity onPress={retry} style={styles.retryBtn} accessibilityRole="button">
          <Ionicons name="refresh" size={15} color={COLORS.white} />
          <Text style={styles.retryText}>Coba lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const visible = filterRatings(summary.ratings, filter, userId);
  const others = filterRatings(summary.ratings, 'all', userId);

  return (
    <View style={styles.container}>
      <SummaryCard summary={summary} />

      {thanks && (
        <View style={styles.thanksBanner} accessibilityLiveRegion="polite">
          <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
          <Text style={styles.thanksText}>Terima kasih! Ulasanmu sudah tersimpan.</Text>
        </View>
      )}

      {userId && (myRating ? (
        <View style={[styles.card, styles.myCard]}>
          <View style={styles.myHeader}>
            <Text style={styles.sectionLabel}>Ulasanmu</Text>
            <View style={styles.myActions}>
              <TouchableOpacity onPress={() => openComposer()} disabled={deleting} style={styles.iconBtn}
                accessibilityRole="button" accessibilityLabel="Edit ulasan">
                <Ionicons name="create-outline" size={18} color={COLORS.darkPurple} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} disabled={deleting} style={styles.iconBtn}
                accessibilityRole="button" accessibilityLabel="Hapus ulasan">
                {deleting ? <ActivityIndicator size="small" color={COLORS.darkPurple} />
                  : <Ionicons name="trash-outline" size={18} color={COLORS.darkPurple} />}
              </TouchableOpacity>
            </View>
          </View>
          <ReviewBody item={myRating} name={currentUser?.name || 'Kamu'} highlight />
        </View>
      ) : (
        <View style={[styles.card, styles.promptCard]}>
          <Text style={styles.promptTitle}>Sudah pernah ke sini?</Text>
          <Text style={styles.promptText}>Bagikan pengalamanmu untuk membantu pengunjung lain.</Text>
          <View style={styles.promptStars}>
            <StarInput value={0} onChange={openComposer} size={32} />
          </View>
          <TouchableOpacity onPress={() => openComposer()} style={styles.writeBtn} accessibilityRole="button">
            <Ionicons name="create-outline" size={16} color={COLORS.white} />
            <Text style={styles.writeText}>Tulis ulasan</Text>
          </TouchableOpacity>
        </View>
      ))}

      {others.length > 0 && <>
        <Text style={[styles.sectionLabel, styles.listLabel]}>Ulasan pengunjung</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled
          contentContainerStyle={styles.chips}>
          {FILTERS.map(option => {
            const selected = filter === option.key;
            const n = filterRatings(summary.ratings, option.key, userId).length;
            return (
              <TouchableOpacity key={String(option.key)} onPress={() => setFilter(option.key)}
                style={[styles.chip, selected && styles.chipActive]}
                accessibilityRole="button" accessibilityState={{ selected }}>
                {typeof option.key === 'number' &&
                  <Ionicons name="star" size={12} color={selected ? COLORS.white : COLORS.primaryPurple} style={{ marginRight: 3 }} />}
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option.label}</Text>
                <Text style={[styles.chipCount, selected && styles.chipTextActive]}> {n}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {visible.length ? visible.map(item => (
          <View key={item.id} style={styles.card}>
            <ReviewBody item={item} name={item.userName || 'Pengunjung'} />
          </View>
        )) : (
          <Text style={styles.filterEmpty}>Belum ada ulasan untuk filter ini.</Text>
        )}
      </>}

      {composer && (
        <RatingComposerSheet
          key={composer.key}
          visible
          poiName={poi.name}
          initialRating={myRating}
          initialStars={composer.stars}
          onClose={() => setComposer(null)}
          onSubmit={handleSubmit}
        />
      )}
    </View>
  );
}

/** @param {{summary: RatingSummary}} props */
function SummaryCard({ summary }) {
  if (!summary.reviewCount) {
    return (
      <View style={[styles.card, styles.emptySummary]}>
        <View style={styles.stateIcon}><Ionicons name="chatbubbles-outline" size={26} color={COLORS.primaryPurple} /></View>
        <Text style={styles.stateTitle}>Belum ada ulasan</Text>
        <Text style={styles.stateText}>Jadilah yang pertama menilai destinasi ini.</Text>
      </View>
    );
  }
  return (
    <View style={[styles.card, styles.summaryCard]}>
      <View style={styles.scoreCol}>
        <Text style={styles.score}>{summary.averageRating.toFixed(1)}</Text>
        <StarDisplay value={summary.averageRating} size={15} />
        <Text style={styles.scoreCaption}>{summary.reviewCount} ulasan</Text>
      </View>
      <View style={styles.barsCol}>
        {breakdownRows(summary).map(row => (
          <View key={row.star} style={styles.barRow} accessibilityLabel={`${row.star} bintang: ${row.count} ulasan`}>
            <Text style={styles.barStar}>{row.star}</Text>
            <Ionicons name="star" size={10} color={COLORS.primaryPurple} />
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.round(row.share * 100)}%` }]} />
            </View>
            <Text style={styles.barCount}>{row.count}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** @param {{item: PoiRating, name: string, highlight?: boolean}} props */
function ReviewBody({ item, name, highlight = false }) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const edited = item.updatedAt && item.createdAt &&
    new Date(item.updatedAt).getTime() - new Date(item.createdAt).getTime() > 60000;
  return (
    <View>
      <View style={styles.reviewHeader}>
        <View style={[styles.avatar, highlight && styles.avatarHighlight]}>
          <Text style={[styles.avatarText, highlight && styles.avatarTextHighlight]}>{initialsOf(name)}</Text>
        </View>
        <View style={styles.reviewMeta}>
          <Text style={styles.reviewName} numberOfLines={1}>{name}</Text>
          <View style={styles.reviewSubRow}>
            <StarDisplay value={item.rating} size={12} />
            <Text style={styles.reviewDate}>
              {'  '}{formatRelativeTime(item.updatedAt || item.createdAt)}{edited ? ' · diedit' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.ratingTag}><Text style={styles.ratingTagText}>{RATING_LABELS[item.rating]}</Text></View>
      </View>
      {item.review ? <>
        <Text style={styles.reviewText} numberOfLines={expanded ? undefined : 4}
          onTextLayout={e => { if (!canExpand && e.nativeEvent.lines.length > 4) setCanExpand(true); }}>
          {item.review}
        </Text>
        {canExpand && (
          <TouchableOpacity onPress={() => setExpanded(v => !v)} hitSlop={8}>
            <Text style={styles.moreText}>{expanded ? 'Tutup' : 'Selengkapnya'}</Text>
          </TouchableOpacity>
        )}
      </> : <Text style={styles.noText}>Memberi rating tanpa ulasan tertulis.</Text>}
    </View>
  );
}

function LoadingState() {
  const [pulse] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.5, duration: 650, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <Animated.View style={[styles.container, { opacity: pulse }]} accessibilityLabel="Memuat ulasan">
      <View style={[styles.card, styles.skeletonSummary]} />
      <View style={[styles.card, styles.skeletonRow]} />
      <View style={[styles.card, styles.skeletonRow]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.softLilacBg, paddingTop: 16, paddingBottom: 8 },
  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, marginHorizontal: 20, marginBottom: 12,
    padding: 16, borderWidth: 1, borderColor: COLORS.borderSubtle,
  },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  listLabel: { marginHorizontal: 20, marginTop: 8, marginBottom: 10 },

  summaryCard: { flexDirection: 'row', alignItems: 'center' },
  scoreCol: { alignItems: 'center', paddingRight: 16, marginRight: 16, borderRightWidth: 1, borderRightColor: COLORS.borderSubtle },
  score: { fontSize: 42, fontWeight: '800', color: COLORS.darkPurple, lineHeight: 48 },
  scoreCaption: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },
  barsCol: { flex: 1, gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center' },
  barStar: { width: 10, fontSize: 12, color: COLORS.textSecondary, fontWeight: '600', marginRight: 2 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: COLORS.lavenderTint, marginHorizontal: 8, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.primaryPurple },
  barCount: { minWidth: 22, textAlign: 'right', fontSize: 11, color: COLORS.textSecondary },

  emptySummary: { alignItems: 'center', paddingVertical: 22 },
  stateBox: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 32, backgroundColor: COLORS.softLilacBg },
  stateIcon: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.lavenderTint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  stateTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  stateText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, backgroundColor: COLORS.darkPurple,
    borderRadius: RADIUS.pill, paddingHorizontal: 18, paddingVertical: 10,
  },
  retryText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },

  thanksBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 12,
    backgroundColor: COLORS.primaryPurple, borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10,
  },
  thanksText: { color: COLORS.white, fontSize: 13, fontWeight: '600', flex: 1 },

  promptCard: { alignItems: 'center', backgroundColor: COLORS.lavenderTint, borderColor: COLORS.lavenderTint },
  promptTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  promptText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3, textAlign: 'center' },
  promptStars: { marginTop: 10 },
  writeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: COLORS.darkPurple,
    borderRadius: RADIUS.pill, paddingHorizontal: 18, paddingVertical: 10,
  },
  writeText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },

  myCard: { borderColor: COLORS.primaryPurple, borderWidth: 1.5 },
  myHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  myActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.lavenderTint,
    alignItems: 'center', justifyContent: 'center',
  },

  chips: { paddingHorizontal: 20, paddingBottom: 12, gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: RADIUS.pill, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.borderSubtle,
  },
  chipActive: { backgroundColor: COLORS.darkPurple, borderColor: COLORS.darkPurple },
  chipText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  chipCount: { fontSize: 12, color: COLORS.textMuted },
  chipTextActive: { color: COLORS.white },
  filterEmpty: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 13, paddingVertical: 20 },

  reviewHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.lavenderTint,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  avatarHighlight: { backgroundColor: COLORS.darkPurple },
  avatarText: { fontSize: 14, fontWeight: '700', color: COLORS.darkPurple },
  avatarTextHighlight: { color: COLORS.white },
  reviewMeta: { flex: 1, minWidth: 0 },
  reviewName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  reviewSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, flexWrap: 'wrap' },
  reviewDate: { fontSize: 11, color: COLORS.textMuted },
  ratingTag: { backgroundColor: COLORS.softLilacBg, borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 3, marginLeft: 6 },
  ratingTagText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  reviewText: { fontSize: 13, lineHeight: 20, color: COLORS.textPrimary, marginTop: 12 },
  moreText: { fontSize: 12, fontWeight: '700', color: COLORS.primaryPurple, marginTop: 6 },
  noText: { fontSize: 12, fontStyle: 'italic', color: COLORS.textMuted, marginTop: 10 },

  skeletonSummary: { height: 132, backgroundColor: COLORS.lavenderTint, borderColor: COLORS.lavenderTint },
  skeletonRow: { height: 92, backgroundColor: COLORS.lavenderTint, borderColor: COLORS.lavenderTint },
});
