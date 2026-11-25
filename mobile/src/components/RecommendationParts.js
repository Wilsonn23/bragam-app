import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from './theme';
import { PoiFirstImage } from './PoiImageGallery';

const capitalize = value => value ? value[0].toUpperCase() + value.slice(1) : '';

/** Weather · time · location strip explaining what the ranking is based on. */
export function ContextBanner({ context, weatherStatus, onRefreshWeather = undefined, tone = 'light' }) {
  const dark = tone === 'dark';
  const weather = context.weather;
  const ink = dark ? COLORS.white : COLORS.textPrimary;
  const sub = dark ? 'rgba(255,255,255,0.78)' : COLORS.textSecondary;
  const locationText = !context.hasLocation ? 'Lokasi belum aktif' : context.farAway ? 'Di luar area Braga' : 'Lokasi aktif';

  return (
    <View style={[styles.banner, dark ? styles.bannerDark : styles.bannerLight]}>
      <View style={styles.weatherBlock}>
        <View style={[styles.weatherIcon, dark && styles.weatherIconDark]}>
          {weatherStatus === 'loading' && !weather
            ? <ActivityIndicator size="small" color={dark ? COLORS.white : COLORS.primaryPurple} />
            : <Ionicons name={weather ? /** @type {any} */ (weather.icon) : 'cloud-offline-outline'} size={22}
              color={dark ? COLORS.white : COLORS.primaryPurple} />}
        </View>
        <View style={styles.flex}>
          <Text style={[styles.weatherLabel, { color: ink }]} numberOfLines={1}>
            {weather ? `${weather.label}${weather.temperature !== null ? ` · ${weather.temperature}°C` : ''}`
              : weatherStatus === 'loading' ? 'Memuat cuaca…' : 'Cuaca tidak tersedia'}
          </Text>
          <Text style={[styles.weatherSub, { color: sub }]} numberOfLines={1}>
            {weather ? 'Cuaca Braga saat ini' : 'Rekomendasi tanpa faktor cuaca'}
          </Text>
        </View>
        {weatherStatus === 'error' && onRefreshWeather && (
          <TouchableOpacity onPress={onRefreshWeather} hitSlop={8} accessibilityRole="button" accessibilityLabel="Muat ulang cuaca">
            <Ionicons name="refresh" size={18} color={ink} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.contextRow}>
        <ContextChip dark={dark} icon="time-outline"
          text={context.auto ? `${capitalize(context.slotLabel)} · sekarang` : `Rencana: ${capitalize(context.slotLabel)}`} />
        <ContextChip dark={dark} icon={context.hasLocation && !context.farAway ? 'navigate' : 'navigate-outline'} text={locationText} />
      </View>
    </View>
  );
}

function ContextChip({ icon, text, dark }) {
  return (
    <View style={[styles.contextChip, dark && styles.contextChipDark]}>
      <Ionicons name={icon} size={12} color={dark ? COLORS.white : COLORS.primaryPurple} />
      <Text style={[styles.contextChipText, dark && { color: COLORS.white }]} numberOfLines={1}>{text}</Text>
    </View>
  );
}

/** "92% cocok" pill; colour deepens with the score. */
export function MatchBadge({ percent, style = undefined }) {
  const strong = percent >= 80;
  return (
    <View style={[styles.badge, strong ? styles.badgeStrong : styles.badgeSoft, style]}
      accessibilityLabel={`${percent} persen cocok`}>
      <Ionicons name="sparkles" size={11} color={strong ? COLORS.white : COLORS.darkPurple} />
      <Text style={[styles.badgeText, strong && { color: COLORS.white }]}>{percent}% cocok</Text>
    </View>
  );
}

/** Why-this-place chips. */
export function ReasonChips({ reasons, max = 3 }) {
  if (!reasons?.length) return null;
  return (
    <View style={styles.reasons}>
      {reasons.slice(0, max).map(reason => (
        <View key={reason.text} style={styles.reason}>
          <Ionicons name={reason.icon} size={12} color={COLORS.primaryPurple} />
          <Text style={styles.reasonText} numberOfLines={1}>{reason.text}</Text>
        </View>
      ))}
    </View>
  );
}

/** Ranked row for the full recommendation list. */
export function RecommendationListItem({ item, rank, onPress }) {
  const { poi } = item;
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.item}
      accessibilityRole="button" accessibilityLabel={`Peringkat ${rank}, ${poi.name}, ${item.matchPercent} persen cocok`}>
      <View style={styles.thumbWrap}>
        <PoiFirstImage poi={poi} style={styles.thumb} />
        <View style={[styles.rank, rank <= 3 && styles.rankTop]}>
          <Text style={[styles.rankText, rank <= 3 && { color: COLORS.white }]}>{rank}</Text>
        </View>
      </View>
      <View style={styles.itemBody}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName} numberOfLines={1}>{poi.name}</Text>
        </View>
        <Text style={styles.itemCategory} numberOfLines={1}>{poi.category}</Text>
        <View style={styles.itemMeta}>
          <MatchBadge percent={item.matchPercent} />
          {item.closed
            ? <Text style={[styles.metaText, styles.closedText]}>Tutup</Text>
            : item.openStatus === 'Open' ? <Text style={[styles.metaText, styles.openText]}>Buka</Text> : null}
          {Number.isFinite(Number(poi.rating)) && Number(poi.rating) > 0 && (
            <View style={styles.ratingMeta}>
              <Ionicons name="star" size={11} color={COLORS.primaryPurple} />
              <Text style={styles.metaText}>{Number(poi.rating).toFixed(1)}</Text>
            </View>
          )}
        </View>
        <ReasonChips reasons={item.reasons} max={2} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  banner: { borderRadius: RADIUS.lg, padding: 14 },
  bannerLight: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.borderSubtle },
  bannerDark: { backgroundColor: 'rgba(255,255,255,0.14)' },
  weatherBlock: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  weatherIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.lavenderTint,
    alignItems: 'center', justifyContent: 'center',
  },
  weatherIconDark: { backgroundColor: 'rgba(255,255,255,0.18)' },
  weatherLabel: { fontSize: 14, fontWeight: '700' },
  weatherSub: { fontSize: 11, marginTop: 1 },
  contextRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  contextChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.softLilacBg,
    borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5, maxWidth: '100%',
  },
  contextChipDark: { backgroundColor: 'rgba(255,255,255,0.16)' },
  contextChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },

  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start',
    borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 4,
  },
  badgeStrong: { backgroundColor: COLORS.darkPurple },
  badgeSoft: { backgroundColor: COLORS.lavenderTint },
  badgeText: { fontSize: 11, fontWeight: '700', color: COLORS.darkPurple },

  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  reason: {
    flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%',
    backgroundColor: COLORS.softLilacBg, borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 4,
    borderWidth: 1, borderColor: COLORS.borderSubtle,
  },
  reasonText: { fontSize: 11, color: COLORS.textPrimary, flexShrink: 1 },

  item: {
    flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: 10,
    borderWidth: 1, borderColor: COLORS.borderSubtle, marginBottom: 10,
  },
  thumbWrap: { width: 92, height: 92, marginRight: 12 },
  thumb: { width: 92, height: 92, borderRadius: RADIUS.md, backgroundColor: COLORS.lavenderTint },
  rank: {
    position: 'absolute', top: 6, left: 6, minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 6,
    backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center',
  },
  rankTop: { backgroundColor: COLORS.primaryPurple },
  rankText: { fontSize: 12, fontWeight: '800', color: COLORS.darkPurple },
  itemBody: { flex: 1, minWidth: 0, justifyContent: 'center' },
  itemHeader: { flexDirection: 'row', alignItems: 'center' },
  itemName: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  itemCategory: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  metaText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  openText: { color: '#1F8A4C' },
  closedText: { color: '#a52222' },
  ratingMeta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
