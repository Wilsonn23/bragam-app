import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ActionButton } from '../../components/ActionButton';
import { theme } from '../../components/theme';
import { useGuideAudio } from '../../audio/AudioProvider';
import { usePois } from '../../poi/PoiProvider';
import { findPoi } from '../../poi/detail';

const text = value => typeof value === 'string' && value.trim() ? value : null;

export default function PoiDetail() {
  const { id } = useLocalSearchParams();
  const data = usePois();
  const poi = findPoi(id, data.records);
  const audio = useGuideAudio();
  const [failedImage, setFailedImage] = useState(null);
  const back = () => router.canGoBack() ? router.back() : router.replace('/');
  if (data.status === 'loading' || data.status === 'error') return <SafeAreaView style={styles.page}><View style={styles.content}>
    <Text style={styles.body}>{data.error || 'Memuat destinasi…'}</Text>
    {data.error && <ActionButton label="Coba lagi" onPress={data.retry} />}
    <ActionButton label="Kembali" onPress={back} />
  </View></SafeAreaView>;
  if (!poi) return <SafeAreaView style={styles.page}><View style={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>Destinasi tidak ditemukan</Text>
    <Text style={styles.body}>Data destinasi tidak tersedia.</Text>
    <ActionButton label="Kembali" onPress={back} />
  </View></SafeAreaView>;
  const active = audio.currentId === poi.id;
  const audioUrl = typeof poi.audioUrl === 'string' && /^https:\/\//i.test(poi.audioUrl) ? poi.audioUrl : null;
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <ActionButton secondary label="Kembali" onPress={back} />
    {poi.imageUrl && failedImage !== poi.imageUrl ? <Image source={{ uri: poi.imageUrl }} style={styles.image}
      accessibilityLabel={`Foto ${poi.name}`} onError={() => setFailedImage(poi.imageUrl)} /> :
      <View style={[styles.image, styles.placeholder]}><Text style={styles.muted}>Foto belum tersedia</Text></View>}
    <Text style={styles.muted}>{poi.category}</Text>
    <Text accessibilityRole="header" style={styles.title}>{poi.name}</Text>
    <Text style={styles.body}>{text(poi.description) || text(poi.shortDescription) || 'Deskripsi belum tersedia.'}</Text>
    <Section title="Jam operasional" value={text(poi.openingHours)} />
    <Section title="Menu dan harga" value={text(poi.menu)} />
    <Section title="Rating dan ulasan" value={text(poi.reviews)} />
    <View style={styles.section}><Text accessibilityRole="header" style={styles.heading}>Panduan audio</Text>
      {!audioUrl ? <Text style={styles.body}>Narasi audio belum tersedia.</Text> : <>
        <Text accessibilityLiveRegion="polite" style={styles.body}>{active && (audio.error || audio.status.error) ? 'Audio tidak dapat diputar. Coba lagi.' : active && audio.status.playing ? 'Sedang diputar' : active && audio.status.isBuffering ? 'Memuat audio…' : 'Siap diputar'}</Text>
        <ActionButton label={active && audio.status.playing ? 'Jeda narasi' : 'Putar narasi'} onPress={() => audio.toggle({ ...poi, audioUrl })} />
      </>}
    </View>
  </ScrollView></SafeAreaView>;
}
function Section({ title, value }) {
  return <View style={styles.section}><Text accessibilityRole="header" style={styles.heading}>{title}</Text><Text style={styles.body}>{value || 'Belum tersedia.'}</Text></View>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.background }, content: { padding: 20, gap: 16 },
  image: { width: '100%', height: 220, borderRadius: 8, backgroundColor: theme.surface },
  placeholder: { alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 24, fontWeight: 'bold', color: theme.ink },
  heading: { fontSize: 18, fontWeight: 'bold', color: theme.ink }, body: { fontSize: 16, lineHeight: 24, color: theme.ink },
  muted: { fontSize: 14, color: theme.muted }, section: { gap: 8, padding: 16, backgroundColor: theme.surface, borderRadius: 8 },
});
