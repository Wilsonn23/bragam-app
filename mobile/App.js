import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAppActive, useForegroundLocation } from './src/hooks/useForegroundLocation';
import { usePoiTriggers } from './src/hooks/usePoiTriggers';
import { fetchPois } from './src/poi/api';
import { PoiTriggerModal } from './src/components/PoiTriggerModal';
import { ActionButton } from './src/components/ActionButton';
import { theme } from './src/components/theme';

const devFixtures = __DEV__ ? require('./src/dev/fixtures') : null;
const SimulationPanel = __DEV__ ? require('./src/dev/SimulationPanel').SimulationPanel : null;

export default function App() {
  const active = useAppActive();
  const [simulation, setSimulation] = useState(false);
  const [simSample, setSimSample] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [pois, setPois] = useState([]);
  const [poiError, setPoiError] = useState(null);
  const isSimulating = __DEV__ && simulation;
  const gps = useForegroundLocation(active && !isSimulating);
  const sample = isSimulating ? simSample : gps.sample;
  const { event, dismiss } = usePoiTriggers(isSimulating ? devFixtures.testPois : pois, sample, active);
  useEffect(() => {
    if (isSimulating) return;
    let cancelled = false;
    fetchPois().then((items) => {
      if (!cancelled) setPois(items);
    }).catch((error) => {
      if (!cancelled) setPoiError(error.message);
    });
    return () => { cancelled = true; };
  }, [isSimulating]);
  function onOpenPoiDetail(poiId) {
    setDetailId(poiId); // Integration seam: replace with Expo Router navigation when UI05 exists.
    dismiss();
  }
  return <SafeAreaProvider><SafeAreaView style={styles.container}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>BRAGAm - GPS Tracker</Text>
      <Text style={styles.body}>{isSimulating ? 'Sumber lokasi: SIMULASI' : 'Sumber lokasi: GPS perangkat'}</Text>
      {!active && <Text style={styles.body}>Deteksi dijeda saat aplikasi tidak aktif.</Text>}
      {!isSimulating && gps.loading && <ActivityIndicator size="large" color={theme.primary} accessibilityLabel="Membaca lokasi" />}
      {!isSimulating && gps.error && <View><Text style={styles.error}>{gps.error}</Text><ActionButton label="Coba baca GPS lagi" onPress={gps.retry} /></View>}
      {sample && <View style={styles.locationBox}>
        <Text style={styles.body}>Latitude: {sample.latitude}</Text>
        <Text style={styles.body}>Longitude: {sample.longitude}</Text>
        <Text style={styles.body}>Akurasi: {Number.isFinite(sample.accuracy) ? `±${sample.accuracy.toFixed(1)} meter` : 'Belum tersedia'}</Text>
        <Text style={styles.body}>Notifikasi membutuhkan sampel maksimal 15 detik dan akurasi ≤25 meter.</Text>
      </View>}
      {!isSimulating && poiError && <Text style={styles.error}>{poiError}</Text>}
      {!isSimulating && !poiError && pois.length === 0 && <ActivityIndicator size="small" color={theme.primary} accessibilityLabel="Memuat POI" />}
      {__DEV__ && <ActionButton secondary label={isSimulating ? 'Gunakan GPS asli' : 'Aktifkan simulasi development'} onPress={() => {
        setSimSample(null); setDetailId(null); setSimulation(value => !value);
      }} />}
      {isSimulating && SimulationPanel && <SimulationPanel onSample={setSimSample} />}
      {__DEV__ && detailId && <Text accessibilityLiveRegion="polite" style={styles.locationBox}>Integrasi Lihat Detail menerima ID POI: {detailId}. UI05 belum tersedia.</Text>}
    </ScrollView>
    <PoiTriggerModal poi={event?.poi} onClose={dismiss} onOpenPoiDetail={onOpenPoiDetail} />
  </SafeAreaView></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: theme.ink },
  body: { fontSize: 16, lineHeight: 24, color: theme.ink },
  locationBox: { padding: 15, backgroundColor: theme.surface, borderRadius: 8 },
  error: { fontSize: 16, color: theme.error },
});
