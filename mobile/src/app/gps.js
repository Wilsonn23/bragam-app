import React, { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useAppActive, useForegroundLocation } from '../hooks/useForegroundLocation';
import { usePoiTriggers } from '../hooks/usePoiTriggers';
import { usePois } from '../poi/PoiProvider';
import PoiTriggerModal from '../components/PoiTriggerModal';
import { ActionButton } from '../components/ActionButton';
import { theme } from '../components/theme';

const devFixtures = __DEV__ ? require('../dev/fixtures') : null;
const SimulationPanel = __DEV__ ? require('../dev/SimulationPanel').SimulationPanel : null;

export default function App() {
  const active = useAppActive();
  const { pois, loading: poisLoading, error: poisError, retry: retryPois } = usePois();
  const [simulation, setSimulation] = useState(false);
  const [simSample, setSimSample] = useState(null);
  const isSimulating = __DEV__ && simulation;
  const gps = useForegroundLocation(active && !isSimulating);
  const sample = isSimulating ? simSample : gps.sample;
  const { event, dismiss } = usePoiTriggers(isSimulating ? devFixtures.testPois : pois, sample, active);
  function onOpenPoiDetail(poiId) {
    dismiss();
    router.push({ pathname: '/poi/[id]', params: { id: poiId, ...(isSimulating ? { simulation: '1' } : {}) } });
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
      {!isSimulating && poisLoading && <ActivityIndicator color={theme.primary} accessibilityLabel="Memuat destinasi" />}
      {!isSimulating && poisError && <View><Text style={styles.error}>{poisError}</Text><ActionButton label="Coba muat destinasi lagi" onPress={retryPois} /></View>}
      {!isSimulating && !poisLoading && !poisError && pois.length === 0 && <Text style={styles.body}>Destinasi belum tersedia.</Text>}
      {__DEV__ && <ActionButton secondary label={isSimulating ? 'Gunakan GPS asli' : 'Aktifkan simulasi development'} onPress={() => {
        setSimSample(null); setSimulation(value => !value);
      }} />}
      {isSimulating && SimulationPanel && <SimulationPanel onSample={setSimSample} />}
    </ScrollView>
    <PoiTriggerModal visible={!!event} poi={event ? { ...event.poi, distanceMeters: event.distanceMeters } : null} onClose={dismiss} onCheckNow={poi => onOpenPoiDetail(poi.id)}
      onDirections={undefined} onSave={undefined} onAddToItinerary={undefined} />
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
