import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, View, Text, Image } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from './ActionButton';
import { theme } from './theme';

// Keep one native Modal instance while advancing the queue.
export function PoiTriggerModal({ poi, onClose, onOpenPoiDetail }) {
  return <Modal visible={!!poi} transparent animationType="none" onRequestClose={onClose}>
    {poi && <PoiContent key={poi.id} poi={poi} onClose={onClose} onOpenPoiDetail={onOpenPoiDetail} />}
  </Modal>;
}
function PoiContent({ poi, onClose, onOpenPoiDetail }) {
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.card} accessibilityViewIsModal>
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={styles.category}>Destinasi di sekitar Anda</Text>
            {poi.imageUrl && !imageFailed ? <Image source={{ uri: poi.imageUrl }} style={styles.image}
              accessibilityLabel={`Foto ${poi.name}`} onError={() => setImageFailed(true)} /> :
              <View style={[styles.image, styles.fallback]}><Text style={styles.category}>Foto belum tersedia</Text></View>}
            <Text accessibilityRole="header" style={styles.title}>{poi.name}</Text>
            <Text style={styles.category}>{poi.category}</Text>
            <Text style={styles.description}>{poi.shortDescription}</Text>
            <ActionButton label="Lihat Detail" onPress={() => onOpenPoiDetail(poi.id)} />
            <ActionButton label="Tutup notifikasi" onPress={onClose} secondary />
          </ScrollView>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: theme.overlay, justifyContent: 'center', paddingHorizontal: 20 },
  card: { backgroundColor: theme.background, borderRadius: 8, maxHeight: '90%', width: '100%', maxWidth: 520, alignSelf: 'center', overflow: 'hidden' },
  body: { padding: 20 },
  category: { fontSize: 14, color: theme.muted, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: theme.ink, marginVertical: 12 },
  description: { fontSize: 16, lineHeight: 25, color: theme.ink, marginBottom: 20 },
  image: { width: '100%', height: 160, borderRadius: 8, backgroundColor: theme.surface },
  fallback: { alignItems: 'center', justifyContent: 'center' },
});
