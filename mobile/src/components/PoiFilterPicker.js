import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS } from './theme';

export default function PoiFilterPicker({ picker, onClose }) {
  if (!picker) return null;
  return <Modal visible={!!picker} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button"
        accessibilityLabel="Tutup pilihan filter" onPress={onClose} />
      <View style={styles.sheet} accessibilityViewIsModal>
        <Text accessibilityRole="header" style={styles.title}>{picker?.title}</Text>
        <ScrollView>
          {picker?.options.map((option) => <Pressable key={String(option.value)}
            accessibilityRole="radio" accessibilityState={{ checked: picker.value === option.value }}
            onPress={() => { picker.onSelect(option.value); onClose(); }}
            style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
            <Text style={styles.label}>{option.label}{picker.value === option.value ? ' ✓' : ''}</Text>
          </Pressable>)}
        </ScrollView>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.option}>
          <Text style={styles.label}>Tutup</Text>
        </Pressable>
      </View>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(20,10,40,0.45)' },
  sheet: { maxHeight: '75%', backgroundColor: COLORS.softLilacBg, borderRadius: RADIUS.lg, padding: 18 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  option: { paddingVertical: 14, paddingHorizontal: 8, minHeight: 48, borderRadius: RADIUS.sm },
  label: { color: COLORS.textPrimary, fontSize: 16 },
  pressed: { backgroundColor: COLORS.lavenderTint },
});
