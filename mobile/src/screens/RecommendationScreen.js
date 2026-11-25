import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import { ContextBanner, RecommendationListItem } from '../components/RecommendationParts';
import { preferenceSummary } from '../recommendation/preferences';

export default function RecommendationScreen({
  recommendations, preferences, weatherStatus, onRefreshWeather, onBack, onOpenDetail, onOpenPreferences,
}) {
  const { items, context } = recommendations;
  const summary = preferenceSummary(preferences);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Kembali">
          <Ionicons name="arrow-back" size={22} color={COLORS.darkPurple} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">Rekomendasi Untukmu</Text>
        <TouchableOpacity onPress={onOpenPreferences} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Atur preferensi">
          <Ionicons name="options-outline" size={22} color={COLORS.darkPurple} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ContextBanner context={context} weatherStatus={weatherStatus} onRefreshWeather={onRefreshWeather} />

        <TouchableOpacity activeOpacity={0.85} onPress={onOpenPreferences} style={styles.prefCard} accessibilityRole="button">
          <View style={styles.prefHeader}>
            <Text style={styles.prefTitle}>Preferensimu</Text>
            <Text style={styles.prefLink}>Ubah</Text>
          </View>
          {summary.length ? (
            <View style={styles.prefChips}>
              {summary.map(text => <View key={text} style={styles.prefChip}><Text style={styles.prefChipText}>{text}</Text></View>)}
            </View>
          ) : (
            <Text style={styles.prefEmpty}>Semua kategori · atur minat, waktu, suasana dan budget agar lebih personal.</Text>
          )}
        </TouchableOpacity>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>{items.length} destinasi diurutkan untukmu</Text>
          {context.hiddenClosed > 0 && (
            <Text style={styles.listSub}>{context.hiddenClosed} tempat yang tutup disembunyikan</Text>
          )}
        </View>

        {items.length ? items.map((item, index) => (
          <RecommendationListItem key={item.poi.id} item={item} rank={index + 1} onPress={() => onOpenDetail(item.poi)} />
        )) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="compass-outline" size={28} color={COLORS.primaryPurple} /></View>
            <Text style={styles.emptyTitle}>Belum ada yang cocok saat ini</Text>
            <Text style={styles.emptyText}>
              {context.hiddenClosed > 0
                ? 'Semua tempat yang cocok sedang tutup. Coba pilih waktu kunjungan lain atau tampilkan tempat yang tutup.'
                : 'Data destinasi belum tersedia. Coba lagi beberapa saat.'}
            </Text>
            <TouchableOpacity onPress={onOpenPreferences} style={styles.emptyBtn} accessibilityRole="button">
              <Text style={styles.emptyBtnText}>Atur preferensi</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.softLilacBg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  prefCard: {
    marginTop: 12, backgroundColor: COLORS.lavenderTint, borderRadius: RADIUS.lg, padding: 14,
  },
  prefHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prefTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  prefLink: { fontSize: 13, fontWeight: '700', color: COLORS.primaryPurple },
  prefChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  prefChip: { backgroundColor: COLORS.white, borderRadius: RADIUS.pill, paddingHorizontal: 10, paddingVertical: 5 },
  prefChipText: { fontSize: 11, fontWeight: '600', color: COLORS.darkPurple },
  prefEmpty: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6, lineHeight: 17 },
  listHeader: { marginTop: 18, marginBottom: 10 },
  listTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  listSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.lavenderTint,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  emptyBtn: { marginTop: 14, backgroundColor: COLORS.darkPurple, borderRadius: RADIUS.pill, paddingHorizontal: 18, paddingVertical: 10 },
  emptyBtnText: { color: COLORS.white, fontWeight: '600', fontSize: 13 },
});
