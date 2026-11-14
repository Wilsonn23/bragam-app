import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from './theme';
export function ActionButton({ label, onPress, secondary = false, pill = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [styles.button, pill && { borderRadius: RADIUS.pill }, secondary && styles.secondary, pressed && { opacity: 0.65 }]}>
    <Text style={[styles.text, secondary && { color: COLORS.darkPurple }]}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 48, padding: 14, borderRadius: 8, backgroundColor: COLORS.darkPurple, justifyContent: 'center', marginVertical: 4 },
  secondary: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.primaryPurple },
  text: { color: COLORS.white, textAlign: 'center', fontSize: 16, fontWeight: '600' },
});
