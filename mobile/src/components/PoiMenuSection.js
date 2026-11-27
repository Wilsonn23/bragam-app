import React, { useEffect, useState } from 'react';
import { Animated, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from './theme';
import { fetchPoiMenu } from '../poi/api';
import { normalizeMenuItems, groupMenuByCategory, formatRupiah, formatCheckedOn, menuSources } from '../poi/menu';

/** @typedef {import('../poi/menu').MenuItem} MenuItem */

// Menus rarely change; keep them for the app session so switching tabs does not refetch.
/** @type {Map<string, MenuItem[]>} */
const menuCache = new Map();

/**
 * Menu tab: the POI's menu grouped by category, with prices and data sources.
 * Falls back to the short menu highlights when no menu list exists yet.
 * @param {{poi: any, priceSummary?: string|null}} props
 */
export default function PoiMenuSection({ poi, priceSummary = null }) {
  const [state, setState] = useState(() => {
    const cached = menuCache.get(poi.id);
    return cached
      ? { status: 'ready', items: cached, error: null }
      : { status: 'loading', items: /** @type {MenuItem[]} */ ([]), error: null };
  });
  const [attempt, setAttempt] = useState(0);
  const [filter, setFilter] = useState('all');
  const needsFetch = state.status === 'loading';

  useEffect(() => {
    if (!needsFetch) return undefined;
    let active = true;
    fetchPoiMenu(poi.id)
      .then(data => {
        const items = normalizeMenuItems(data);
        menuCache.set(poi.id, items);
        if (active) setState({ status: 'ready', items, error: null });
      })
      .catch(err => {
        if (active) setState({ status: 'error', items: [], error: err?.message || 'Gagal memuat menu.' });
      });
    return () => { active = false; };
  }, [poi.id, needsFetch, attempt]);

  const retry = () => {
    setState({ status: 'loading', items: [], error: null });
    setAttempt(n => n + 1);
  };

  if (state.status === 'loading') return <LoadingState />;
  if (state.status === 'error') {
    return (
      <View style={styles.stateBox}>
        <View style={styles.stateIcon}><Ionicons name="cloud-offline-outline" size={28} color={COLORS.primaryPurple} /></View>
        <Text style={styles.stateTitle}>Menu belum bisa dimuat</Text>
        <Text style={styles.stateText}>{state.error}</Text>
        <TouchableOpacity onPress={retry} style={styles.retryBtn} accessibilityRole="button">
          <Ionicons name="refresh" size={15} color={COLORS.white} />
          <Text style={styles.retryText}>Coba lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!state.items.length) return <EmptyMenu highlights={poi.menuHighlights} priceSummary={priceSummary} />;

  const groups = groupMenuByCategory(state.items);
  const visible = filter === 'all' ? groups : groups.filter(group => group.category === filter);

  return (
    <View style={styles.container}>
      {groups.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.chips}>
          {[{ category: 'all', label: 'Semua', count: state.items.length },
            ...groups.map(group => ({ category: group.category, label: group.category, count: group.items.length }))]
            .map(option => {
              const selected = filter === option.category;
              return (
                <TouchableOpacity key={option.category} onPress={() => setFilter(option.category)}
                  style={[styles.chip, selected && styles.chipActive]}
                  accessibilityRole="button" accessibilityState={{ selected }}>
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option.label}</Text>
                  <Text style={[styles.chipCount, selected && styles.chipTextActive]}> {option.count}</Text>
                </TouchableOpacity>
              );
            })}
        </ScrollView>
      )}

      {visible.map(group => (
        <View key={group.category} style={styles.card}>
          <Text style={styles.groupTitle} accessibilityRole="header">{group.category}</Text>
          {group.items.map((item, index) => <MenuRow key={item.id} item={item} first={index === 0} />)}
        </View>
      ))}

      <Sources items={state.items} />
    </View>
  );
}

/** @param {{item: MenuItem, first: boolean}} props */
function MenuRow({ item, first }) {
  const price = formatRupiah(item.priceIdr);
  return (
    <View style={[styles.itemRow, !first && styles.itemDivider]}
      accessibilityLabel={`${item.name}, ${price || 'harga belum tersedia'}`}>
      <View style={styles.itemText}>
        <Text style={styles.itemName}>{item.name}</Text>
        {!!item.description && <Text style={styles.itemDesc}>{item.description}</Text>}
      </View>
      {price
        ? <Text style={styles.price}>{price}</Text>
        : <Text style={styles.noPrice}>Harga{'\n'}belum ada</Text>}
    </View>
  );
}

/** @param {{items: MenuItem[]}} props */
function Sources({ items }) {
  const sources = menuSources(items);
  const fromDeliveryApp = sources.some(source => /gofood|grabfood/i.test(source.label));
  return (
    <View style={styles.sources}>
      <Text style={styles.sourcesTitle}>Sumber data</Text>
      {sources.map(source => {
        const checked = formatCheckedOn(source.checkedOn);
        const label = `${source.label}${checked ? ` · dicek ${checked}` : ''}`;
        return source.url ? (
          <TouchableOpacity key={source.label} onPress={() => Linking.openURL(source.url).catch(() => {})}
            style={styles.sourceRow} accessibilityRole="link" accessibilityLabel={`Buka sumber ${source.label}`}>
            <Ionicons name="open-outline" size={13} color={COLORS.primaryPurple} style={styles.sourceIcon} />
            <Text style={[styles.sourceText, styles.sourceLink]}>{label}</Text>
          </TouchableOpacity>
        ) : (
          <View key={source.label} style={styles.sourceRow}>
            <Ionicons name="information-circle-outline" size={13} color={COLORS.textMuted} style={styles.sourceIcon} />
            <Text style={styles.sourceText}>{label}</Text>
          </View>
        );
      })}
      <Text style={styles.disclaimer}>
        {fromDeliveryApp
          ? 'Harga dari aplikasi pesan-antar biasanya sedikit lebih mahal daripada harga di tempat dan bisa berubah sewaktu-waktu.'
          : 'Harga dan ketersediaan menu bisa berubah sewaktu-waktu.'}
      </Text>
    </View>
  );
}

/** @param {{highlights?: string, priceSummary: string|null}} props */
function EmptyMenu({ highlights, priceSummary }) {
  const summary = typeof highlights === 'string' && highlights.trim() ? highlights.trim() : null;
  return (
    <View style={styles.container}>
      <View style={[styles.card, styles.emptyCard]}>
        <View style={styles.stateIcon}><Ionicons name="restaurant-outline" size={26} color={COLORS.primaryPurple} /></View>
        <Text style={styles.stateTitle}>Daftar menu belum tersedia</Text>
        {summary && <Text style={styles.stateText}>Yang bisa ditemui di sini: {summary}</Text>}
        {!!priceSummary && <Text style={styles.emptyPrice}>{priceSummary}</Text>}
      </View>
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
    <Animated.View style={[styles.container, { opacity: pulse }]} accessibilityLabel="Memuat menu">
      <View style={[styles.card, styles.skeleton]} />
      <View style={[styles.card, styles.skeleton]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.softLilacBg, paddingTop: 16, paddingBottom: 8 },
  card: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg, marginHorizontal: 20, marginBottom: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: COLORS.borderSubtle,
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

  groupTitle: { fontSize: 14, fontWeight: '700', color: COLORS.darkPurple, marginBottom: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10 },
  itemDivider: { borderTopWidth: 1, borderTopColor: COLORS.borderSubtle },
  itemText: { flex: 1, minWidth: 0, paddingRight: 12 },
  itemName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 18 },
  itemDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginTop: 2 },
  price: { fontSize: 13, fontWeight: '700', color: COLORS.primaryPurple, textAlign: 'right' },
  noPrice: { fontSize: 10, color: COLORS.textMuted, textAlign: 'right', lineHeight: 13 },

  sources: { marginHorizontal: 20, marginTop: 4, marginBottom: 8 },
  sourcesTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  sourceRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 3 },
  sourceIcon: { marginTop: 2, marginRight: 6 },
  sourceText: { flex: 1, fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  sourceLink: { color: COLORS.primaryPurple, textDecorationLine: 'underline' },
  disclaimer: { fontSize: 11, color: COLORS.textMuted, lineHeight: 16, marginTop: 8, fontStyle: 'italic' },

  emptyCard: { alignItems: 'center', paddingVertical: 22 },
  emptyPrice: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' },
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
  skeleton: { height: 150, backgroundColor: COLORS.lavenderTint, borderColor: COLORS.lavenderTint },
});
