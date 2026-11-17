import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from './theme';
import { PoiDetailFooter } from './PoiCardComponents';
import PoiImageGallery from './PoiImageGallery';
import PoiFilterPicker from './PoiFilterPicker';
import { DEFAULT_FILTERS, coordinates, distanceLabel, filterRecommendations, poiForDetail, reviewedRating } from '../recommendations/model';
const demo = __DEV__ ? require('../dev/recommendations') : null;
function Pill({
  label,
  onPress,
  icon = null,
  dropdown = false,
  selected = false,
  disabled = false
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{
    selected,
    disabled
  }} onPress={onPress} style={({
    pressed
  }) => [styles.pill, icon && styles.iconPill, selected && styles.selected, disabled && styles.disabled, pressed && styles.pressed]}>
    {icon ? <Ionicons name={icon} size={22} color={COLORS.primaryPurple} /> :
      <Text style={[styles.pillText, selected && styles.selectedText]}>{label}</Text>}
    {dropdown && <Ionicons name="chevron-down-circle" size={18} color={selected ? COLORS.white : COLORS.darkPurple} />}
  </Pressable>;
}
export function RecommendationSearch({
  query,
  onChange
}) {
  const input = useRef(null);
  return <View style={styles.search}>
    <TextInput ref={input} value={query} onChangeText={onChange} accessibilityLabel="Cari rekomendasi" placeholder="Type Something..." placeholderTextColor={COLORS.textSecondary} returnKeyType="search" style={styles.searchInput} />
    {query ? <Pressable accessibilityRole="button" accessibilityLabel="Hapus pencarian rekomendasi" onPress={() => {
      onChange('');
      input.current?.focus();
    }} style={styles.iconButton}>
      <Ionicons name="close" size={22} color={COLORS.darkPurple} />
    </Pressable> : <Ionicons name="search" size={24} color={COLORS.darkPurple} />}
  </View>;
}
export default function RecommendationPanel({
  store,
  catalogue = [],
  filters,
  onFiltersChange,
  location,
  bookmarkedPois = [],
  onOpenDetail,
  onOpenDirections,
  onToggleSave,
  onAddToItinerary
}) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [picker, setPicker] = useState(null);
  const [showScenarios, setShowScenarios] = useState(false);
  const list = useRef(null);
  const restored = useRef(false);
  useEffect(() => {
    list.current?.scrollToOffset({ offset: store.getScrollOffset(), animated: false });
  }, [filters.query, store]);
  const load = (source = state.source) => store.load({
    location,
    source,
    demoLoader: demo ? (source, signal) => demo.loadDemoRecommendations(source, signal, catalogue) : undefined
  });

  // Load once on entry; GPS updates only change displayed distances, never re-rank/refetch.
  useEffect(() => {
    if (store.getSnapshot().status === 'idle') store.load({
      location,
        demoLoader: demo ? (source, signal) => demo.loadDemoRecommendations(source, signal, catalogue) : undefined
    });
    // A session is owned by App and may finish loading while detail is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);
  const change = update => {
    store.setScrollOffset(0);
    list.current?.scrollToOffset({
      offset: 0,
      animated: false
    });
    onFiltersChange({
      ...filters,
      ...update
    });
  };
  const categories = [...new Set(state.items.map(({
    poi
  }) => poi.category).filter(Boolean))];
  const nightFilter = filters.openAtNight && state.capabilities.openAtNight;
  const filtered = filterRecommendations(state.items, { ...filters, openAtNight: nightFilter });
  const isFiltered = !!(filters.query.trim() || filters.category || nightFilter || filters.minRating);
  const ready = state.status === 'success';
  const header = <>
    <ScrollView horizontal contentContainerStyle={styles.filters} showsHorizontalScrollIndicator>
      {<Pill label={'Reset filter'} icon="options" onPress={() => change(DEFAULT_FILTERS)} selected={false} disabled={!isFiltered} />}
      {<Pill dropdown label={filters.category || 'Destination'} onPress={() => setPicker({
        title: 'Destination',
        value: filters.category,
        options: [{
          label: 'Semua destinasi',
          value: ''
        }, ...categories.map(value => ({
          value,
          label: value
        }))],
        onSelect: category => change({
          category
        })
      })} selected={!!filters.category} disabled={!ready || !categories.length} />}
      {<Pill label={'Open at Night'} onPress={() => change({
        openAtNight: !filters.openAtNight
      })} selected={nightFilter} disabled={!ready || !state.capabilities.openAtNight} />}
      {<Pill dropdown label={filters.minRating ? `Rating ${filters.minRating}+` : 'Top Rated'} onPress={() => setPicker({
        title: 'Minimum rating',
        value: filters.minRating,
        options: [{
          value: 0,
          label: 'Semua rating'
        }, {
          value: 4,
          label: '4+ ★'
        }, {
          value: 4.5,
          label: '4.5+ ★'
        }],
        onSelect: minRating => change({
          minRating
        })
      })} selected={!!filters.minRating} disabled={!ready} />}
    </ScrollView>
    {!state.capabilities.openAtNight && <Text style={styles.hint}>Filter malam tersedia setelah informasi waktu kunjungan disediakan.</Text>}
    {!location && <Text style={styles.hint}>Jarak belum tersedia. Izinkan lokasi untuk melihat jarak destinasi.</Text>}
    {__DEV__ && state.source !== 'service' && <Text accessibilityLiveRegion="polite" style={styles.notice}>
      Contoh development untuk uji tampilan. Bukan rekomendasi kontekstual.
    </Text>}
    {ready && <View style={styles.summary}>
      <Text accessibilityLiveRegion="polite" style={styles.hint}>{filtered.length} destinasi</Text>
      {<Pill label={'Muat ulang'} onPress={() => load()} />}
    </View>}
    {__DEV__ && <View style={styles.dev}>
      {<Pill label={showScenarios ? 'Tutup skenario uji' : 'Skenario uji development'} onPress={() => setShowScenarios(!showScenarios)} />}
      {showScenarios && <View style={styles.scenarios}>
        {['service', 'demo', 'demo-empty', 'demo-error'].map(source => <React.Fragment key={source}>
          {<Pill label={{
            service: 'Service',
            demo: 'Contoh daftar',
            'demo-empty': 'Contoh kosong',
            'demo-error': 'Contoh gagal'
          }[source]} onPress={() => {
            change(DEFAULT_FILTERS);
            load(source);
          }} selected={state.source === source} />}
        </React.Fragment>)}
      </View>}
    </View>}
  </>;
  const empty = state.status === 'loading' || state.status === 'idle' ? <View style={styles.status}><ActivityIndicator color={COLORS.primaryPurple} accessibilityLabel="Memuat rekomendasi" />
      <Text style={styles.statusText}>Memuat rekomendasi...</Text></View> : state.status === 'unavailable' ? <View style={styles.status}>
      <Text accessibilityRole="header" style={styles.statusTitle}>Rekomendasi belum tersedia</Text>
      <Text style={styles.statusText}>Rekomendasi kontekstual belum tersedia saat ini. Kamu tetap dapat menjelajah Nearby You.</Text>
      {<Pill label={'Coba lagi'} onPress={() => load()} />}
    </View> : state.status === 'error' ? <View style={styles.status}>
      <Text accessibilityRole="alert" style={styles.statusTitle}>Rekomendasi gagal dimuat</Text>
      <Text style={styles.statusText}>Periksa koneksi, lalu coba lagi.</Text>{<Pill label={'Coba lagi'} onPress={() => load()} />}
    </View> : <View style={styles.status}>
      <Text accessibilityRole="header" style={styles.statusTitle}>{isFiltered ? 'Tidak ada hasil yang cocok' : 'Belum ada rekomendasi'}</Text>
      <Text style={styles.statusText}>{isFiltered ? 'Coba kata kunci atau filter lain.' : 'Coba muat ulang rekomendasi nanti.'}</Text>
      {isFiltered ? <Pill label={'Hapus pencarian dan filter'} onPress={() => change(DEFAULT_FILTERS)} /> : <Pill label={'Muat ulang'} onPress={() => load()} />}
    </View>;
  return <View style={styles.panel}>
    <FlatList ref={list} data={ready ? filtered : []} keyExtractor={item => item.poi.id} ListHeaderComponent={header} ListEmptyComponent={empty} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list} showsVerticalScrollIndicator initialNumToRender={5} onScroll={event => {
      store.setScrollOffset(event.nativeEvent.contentOffset.y);
    }} scrollEventThrottle={100} onContentSizeChange={() => {
      if (!restored.current && ready) {
        restored.current = true;
        list.current?.scrollToOffset({
          offset: store.getScrollOffset(),
          animated: false
        });
      }
    }} renderItem={({
      item
    }) => {
      const poi = item.poi;
      const selected = poiForDetail(item, location);
      return <View style={styles.card} testID={`recommendation-${poi.id}`}>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.gallery}>
            <PoiImageGallery poi={poi} compact recommendation />
          </ScrollView>
          <View style={styles.cardBody}>
            <PoiDetailFooter recommendation name={poi.name} distance={distanceLabel(poi, location)} rating={reviewedRating(poi)} isSaved={bookmarkedPois.some(saved => saved.id === poi.id)} onCheckDetail={onOpenDetail ? () => onOpenDetail(selected) : undefined} onDirections={onOpenDirections && coordinates(poi) ? () => onOpenDirections(selected) : undefined} onSave={onToggleSave ? () => onToggleSave(selected) : undefined} onAddToItinerary={onAddToItinerary ? () => onAddToItinerary(selected) : undefined} />
            {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}
            {!coordinates(poi) && <Text style={styles.hint}>Directions belum tersedia untuk destinasi ini.</Text>}
          </View>
        </View>;
    }} />
    <PoiFilterPicker picker={picker} onClose={() => setPicker(null)} />
  </View>;
}
const styles = StyleSheet.create({
  iconPill: { borderWidth: 0, paddingHorizontal: 0, minWidth: 32 },
  panel: {
    flex: 1,
    minHeight: 0,
    backgroundColor: COLORS.softLilacBg
  },
  list: {
    paddingBottom: 24,
    flexGrow: 1
  },
  filters: {
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    alignItems: 'center'
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: COLORS.softLilacBg
  },
  pillText: {
    fontFamily: 'PB12Jakarta',
    fontSize: 12,
    color: COLORS.darkPurple
  },
  selected: {
    backgroundColor: COLORS.darkPurple
  },
  selectedText: {
    color: COLORS.white
  },
  disabled: {
    opacity: 0.45
  },
  pressed: {
    opacity: 0.7
  },
  hint: {
    fontFamily: 'PB12Jakarta',
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 20,
    paddingVertical: 4
  },
  notice: {
    fontFamily: 'PB12Jakarta',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.lavenderTint,
    padding: 12,
    margin: 16,
    borderRadius: RADIUS.sm,
    lineHeight: 20
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 20
  },
  dev: {
    marginHorizontal: 20,
    marginVertical: 8
  },
  scenarios: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8
  },
  status: {
    minHeight: 180,
    padding: 24,
    gap: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusTitle: {
    fontFamily: 'PB12Jakarta',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center'
  },
  statusText: {
    fontFamily: 'PB12Jakarta',
    color: COLORS.textSecondary,
    lineHeight: 22,
    textAlign: 'center'
  },
  card: {
    borderBottomWidth: 9,
    borderColor: COLORS.lavenderTint,
    paddingTop: 14,
    paddingBottom: 16
  },
  gallery: {
    paddingHorizontal: 28
  },
  cardBody: {
    paddingHorizontal: 28
  },
  reason: {
    fontFamily: 'PB12Jakarta',
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10
  },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.softLilacBg,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 14,
    minHeight: 50
  },
  searchInput: {
    fontFamily: 'PB12Jakarta',
    flex: 1,
    minWidth: 0,
    color: COLORS.textPrimary,
    fontSize: 16,
    paddingVertical: 10
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
