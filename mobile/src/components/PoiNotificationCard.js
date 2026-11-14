import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Pressable, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import Placeholder from '../../assets/pb06/placeholder.svg';
import Chevron from '../../assets/pb06/chevron.svg';
import Direction from '../../assets/pb06/direction.svg';
import Bookmark from '../../assets/pb06/bookmark.svg';
import Ring from '../../assets/pb06/ring.svg';
import Plus from '../../assets/pb06/plus.svg';
import Badge from '../../assets/pb06/badge.svg';
import Pin from '../../assets/pb06/pin.svg';
import { POI_NOTIFICATION as palette } from './theme';
import { notificationContent, notificationImages, formatPoiDistance } from '../poi/notification';

/** The same card can be mounted in the native modal or an isolated visual preview. */
export function PoiNotificationCard({ poi, distanceMeters, onClose, onOpenPoiDetail, onDirections = undefined, onSave = undefined, onAddToItinerary = undefined }) {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold,
  });
  const font = weight => fontsLoaded ? { fontFamily: `PlusJakartaSans_${weight}` } : {};
  const content = notificationContent(poi);
  const images = notificationImages(poi);
  const distance = formatPoiDistance(distanceMeters);
  const unavailable = !onSave || !onAddToItinerary;
  return <View style={styles.card} accessibilityViewIsModal>
    <ScrollView style={styles.scroller} contentContainerStyle={styles.content} bounces={false}>
      <Text accessibilityRole="header" style={[styles.heading, font('700Bold')]}>{content.title}</Text>
      <ScrollView horizontal contentContainerStyle={styles.gallery} accessibilityLabel="Foto destinasi" showsHorizontalScrollIndicator>
        {[0, 1, 2].map(index => <PhotoSlot key={`${poi.id}:${images[index] || index}`} uri={images[index]} name={poi.name} index={index} />)}
      </ScrollView>
      <View style={styles.infoRow}>
        <View style={styles.locationCol}>
          <View style={styles.badge}><Badge /><View style={styles.pin}><Pin /></View></View>
          {distance && <Text style={[styles.distance, font('400Regular')]}>{distance}</Text>}
        </View>
        <View style={styles.identity}>
          <Text style={[styles.name, font('400Regular')]}>{poi.name}</Text>
          <Text style={[styles.category, font('400Regular')]}>{poi.category}</Text>
        </View>
      </View>
      <Text style={[styles.body, font('400Regular')]}>{content.body}</Text>
      <View style={styles.actions}>
        <Pill label="Directions" accessibilityLabel={`Petunjuk arah ke ${poi.name}`} onPress={onDirections && (() => onDirections(poi.id))} font={font('600SemiBold')}><Direction /></Pill>
        <Pill label="Save" accessibilityLabel="Simpan destinasi" onPress={onSave && (() => onSave(poi.id))} font={font('600SemiBold')}><Bookmark /></Pill>
        <Pill label="Add to Itinerary" accessibilityLabel="Tambahkan ke itinerary" onPress={onAddToItinerary && (() => onAddToItinerary(poi.id))} font={font('600SemiBold')}>
          <View style={styles.addIcon}><Ring /><View style={styles.plus}><Plus /></View></View>
        </Pill>
      </View>
      {unavailable && <Text style={[styles.unavailable, font('400Regular')]}>Simpan dan itinerary belum tersedia.</Text>}
    </ScrollView>
    <View style={[styles.ctas, styles.footer]}>
        <Pill label="Cek Sekarang" primary onPress={() => onOpenPoiDetail(poi.id)} font={font('600SemiBold')}><Chevron /></Pill>
        <Pill label="Gak dulu deh" onPress={onClose} font={font('500Medium')} />
      </View>
  </View>;
}
function PhotoSlot({ uri, name, index }) {
  const [failed, setFailed] = useState(false);
  return <View style={styles.photoSlot} accessible accessibilityLabel={uri && !failed ? `Foto ${name} ${index + 1}` : `Foto ${index + 1} belum tersedia`}>
    {uri && !failed ? <Image source={{ uri }} style={styles.photo} resizeMode="cover" onError={() => setFailed(true)} /> : <Placeholder />}
  </View>;
}
function Pill({ label, accessibilityLabel = label, onPress, font, primary = false, children = null }) {
  const disabled = !onPress;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel}
    accessibilityState={{ disabled }} accessibilityHint={disabled ? 'Fitur ini belum tersedia' : undefined}
    disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.pill, primary && styles.primary, disabled && styles.disabled, pressed && styles.pressed]}>
    <Text style={[styles.buttonText, font, primary && styles.primaryText]}>{label}</Text>
    {children}
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 394, maxHeight: '90%', alignSelf: 'center', backgroundColor: palette.surface,
    borderRadius: palette.radius, borderWidth: palette.borderWidth, borderColor: palette.border, overflow: 'hidden' },
  scroller: { flexShrink: 1 },
  footer: { padding: 12, paddingTop: 2, flexShrink: 0, backgroundColor: palette.surface },
  content: { padding: 12, paddingTop: 20, gap: 10 },
  heading: { fontSize: 16, fontWeight: '700', lineHeight: 23, color: palette.ink, textAlign: 'center', marginHorizontal: 16, marginBottom: 4 },
  gallery: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  photoSlot: { width: 117.316, height: 106.712, overflow: 'hidden', borderRadius: 18, backgroundColor: palette.tint },
  photo: { width: '100%', height: '100%', borderRadius: 18 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationCol: { alignItems: 'center', minWidth: 40 },
  badge: { width: 34, height: 34 }, pin: { position: 'absolute', top: 7, left: 9 },
  distance: { color: palette.ink, fontSize: 12, marginTop: 2 },
  identity: { flex: 1, gap: 4 },
  name: { color: palette.ink, fontSize: 15, lineHeight: 22 },
  category: { color: palette.ink, fontSize: 12, lineHeight: 18 },
  body: { fontSize: 13, lineHeight: 20, color: palette.ink },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  pill: { minHeight: 48, borderRadius: 24, borderWidth: 3, borderColor: palette.border, backgroundColor: palette.surface,
    paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, maxWidth: '100%' },
  buttonText: { fontSize: 12, lineHeight: 18, color: palette.ink, flexShrink: 1 },
  primary: { backgroundColor: palette.ink, borderColor: palette.ink }, primaryText: { color: palette.surface },
  disabled: { opacity: 0.5 }, pressed: { opacity: 0.7 },
  ctas: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7 },
  unavailable: { color: palette.ink, fontSize: 11, lineHeight: 16, textAlign: 'center' },
  addIcon: { width: 24, height: 24 }, plus: { position: 'absolute', top: 5, left: 5 },
});
