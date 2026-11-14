import React from 'react';
import { Modal, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { PoiNotificationCard } from './PoiNotificationCard';
import { POI_NOTIFICATION } from './theme';

// One native host across queue changes; a new POI resets photo failure state.
export default function PoiTriggerModal({ poi, distanceMeters, onClose, onOpenPoiDetail, onDirections = undefined, onSave = undefined, onAddToItinerary = undefined }) {
  return <Modal visible={!!poi} transparent animationType="none" onRequestClose={onClose}>
    {poi && <SafeAreaProvider><SafeAreaView style={styles.backdrop}>
      <PoiNotificationCard key={poi.id} poi={poi} distanceMeters={distanceMeters} onClose={onClose}
        onOpenPoiDetail={onOpenPoiDetail} onDirections={onDirections} onSave={onSave} onAddToItinerary={onAddToItinerary} />
    </SafeAreaView></SafeAreaProvider>}
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: POI_NOTIFICATION.backdrop, justifyContent: 'center', paddingHorizontal: 18 },
});
