import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { usePois } from '../poi/PoiProvider';
import { findPoi } from '../poi/detail';
import { ActionButton } from './ActionButton';
import { COLORS } from './theme';

export const goBackToApp = () => router.canGoBack() ? router.back() : router.replace('/');

// Detail and directions resolve the exact same POI ID and API/simulation session.
export function PoiRoute({ children }) {
  const { id } = useLocalSearchParams();
  const data = usePois();
  const poi = findPoi(id, data.records);
  if (data.status === 'ready' && poi) return children(poi);
  const message = data.status === 'loading' ? 'Memuat destinasi…' :
    data.error || 'Data destinasi tidak tersedia.';
  return <SafeAreaView style={styles.page}><View style={styles.content}>
    {data.status !== 'loading' && !data.error && <Text accessibilityRole="header" style={styles.title}>Destinasi tidak ditemukan</Text>}
    <Text accessibilityLiveRegion="polite" style={styles.body}>{message}</Text>
    {data.error && <ActionButton label="Coba lagi" onPress={data.retry} />}
    <ActionButton label="Kembali" onPress={goBackToApp} />
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.softLilacBg },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary },
  body: { fontSize: 16, lineHeight: 24, color: COLORS.textPrimary },
});
