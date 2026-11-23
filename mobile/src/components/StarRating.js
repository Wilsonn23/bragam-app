import React, { useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from './theme';
import { starIcons, RATING_LABELS } from '../poi/ratings';

/** Read-only row of five stars (supports half stars). */
export function StarDisplay({ value, size = 14, color = COLORS.primaryPurple, emptyColor = COLORS.borderSubtle, gap = 2 }) {
  return (
    <View style={[styles.row, { gap }]} accessibilityLabel={`${value} dari 5 bintang`}>
      {starIcons(value).map((name, index) => (
        <Ionicons key={index} name={name} size={size} color={name === 'star-outline' ? emptyColor : color} />
      ))}
    </View>
  );
}

/** Tappable 1–5 star input with a small spring on selection. */
export function StarInput({ value, onChange, size = 40, disabled = false }) {
  const [scales] = useState(() => [1, 2, 3, 4, 5].map(() => new Animated.Value(1)));

  const select = star => {
    if (disabled) return;
    onChange(star);
    scales[star - 1].setValue(0.7);
    Animated.spring(scales[star - 1], { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }).start();
  };

  return (
    <View style={styles.inputRow} accessibilityRole="radiogroup">
      {[1, 2, 3, 4, 5].map(star => {
        const filled = star <= value;
        return (
          <Pressable
            key={star}
            onPress={() => select(star)}
            disabled={disabled}
            hitSlop={6}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === star, disabled }}
            accessibilityLabel={`${star} bintang, ${RATING_LABELS[star]}`}
            style={styles.inputStar}
          >
            <Animated.View style={{ transform: [{ scale: scales[star - 1] }] }}>
              <Ionicons
                name={filled ? 'star' : 'star-outline'}
                size={size}
                color={filled ? COLORS.primaryPurple : COLORS.textMuted}
              />
            </Animated.View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  inputRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  inputStar: { paddingHorizontal: 5, paddingVertical: 4 },
});
