import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { RADIUS, theme } from './theme';
export function ActionButton({ label, onPress, secondary = false, pill = false }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [styles.button, pill && { borderRadius: RADIUS.pill }, secondary && styles.secondary, pressed && { opacity: 0.65 }]}>
    <Text style={[styles.text, secondary && { color: theme.primary }]}>{label}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 48, padding: 14, borderRadius: 8, backgroundColor: theme.primary, justifyContent: 'center', marginVertical: 4 },
  secondary: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.primary },
  text: { color: theme.background, textAlign: 'center', fontSize: 16, fontWeight: '600' },
});
