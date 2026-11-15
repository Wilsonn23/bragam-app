import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import PoiDetailScreen from '../../screens/PoiDetailScreen';
import { COLORS, RADIUS } from '../../components/theme';
import { useGuideAudio } from '../../audio/AudioProvider';
import { findPoi } from '../../poi/detail';
import { usePois } from '../../poi/PoiProvider';

const fixtures = __DEV__ ? require('../../dev/fixtures').testPois : null;

export default function PoiDetail() {
  const { id, simulation } = useLocalSearchParams();
  const data = usePois();
  const isSimulation = __DEV__ && simulation === '1';
  const poi = findPoi(id, isSimulation ? fixtures : data.pois);
  const audio = useGuideAudio();
  const back = () => router.canGoBack() ? router.back() : router.replace('/');

  if (!isSimulation && data.loading) return <DetailState message="Memuat destinasi…" onBack={back} />;
  if (!isSimulation && data.error) return <DetailState message={data.error} onBack={back} onRetry={data.retry} />;
  if (!poi) return <DetailState message="Destinasi tidak ditemukan." onBack={back} />;

  // Keep the existing player and its lifecycle; only adapt its control to the detail layout.
  const active = audio.currentId === poi.id;
  const audioUrl = typeof poi.audioUrl === 'string' && /^https:\/\//i.test(poi.audioUrl) ? poi.audioUrl : null;
  const audioControl = <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: !audioUrl }} disabled={!audioUrl}
    accessibilityLabel={active && audio.status.playing ? 'Jeda audio' : 'Nyalakan audio'}
    onPress={() => audio.toggle({ ...poi, audioUrl })} style={styles.audioTouchArea}>
    <View style={[styles.audioButton, !audioUrl && styles.disabled]}>
      <Text style={styles.audioButtonText}>{active && audio.status.playing ? 'Jeda audio' : 'Nyalakan audio'}</Text>
      <Ionicons name={active && audio.status.playing ? 'pause' : 'volume-high'} size={15} color={COLORS.white} />
    </View>
  </TouchableOpacity>;
  return <PoiDetailScreen key={poi.id} poi={poi} onBack={back} audioControl={audioControl} onOpenDirections={undefined}
    isOffline={data.source === 'offline' && !isSimulation} />;
}

function DetailState({ message, onBack, onRetry = undefined }) {
  return <SafeAreaView style={styles.page}><View style={styles.state}>
    <Text accessibilityRole="header" style={styles.stateMessage}>{message}</Text>
    {onRetry && <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={styles.stateButton}><Text style={styles.audioButtonText}>Coba lagi</Text></TouchableOpacity>}
    <TouchableOpacity accessibilityRole="button" onPress={onBack} style={styles.stateButton}><Text style={styles.audioButtonText}>Kembali</Text></TouchableOpacity>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.softLilacBg },
  state: { padding: 20, gap: 16 },
  stateMessage: { fontSize: 16, lineHeight: 24, color: COLORS.textPrimary },
  stateButton: { minHeight: 48, backgroundColor: COLORS.darkPurple, borderRadius: RADIUS.pill, padding: 14, alignItems: 'center' },
  audioTouchArea: { minHeight: 44, justifyContent: 'center', marginLeft: 6 },
  audioButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 7, paddingHorizontal: 10, backgroundColor: COLORS.darkPurple, borderRadius: RADIUS.pill },
  audioButtonText: { color: COLORS.white, fontSize: 11, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
