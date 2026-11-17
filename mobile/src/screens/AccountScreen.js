import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 220;
const MAX_SHEET_HEIGHT = Math.min(SCREEN_HEIGHT * 0.4, 300);

export default function AccountScreen({ user, onLogout }) {
  const insets = useSafeAreaInsets();
  const topInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? StatusBar.currentHeight || 28
      : 44;

  const displayName = user?.name?.trim() || 'Pengguna BRAGAm';
  const displayEmail = user?.email || 'Email belum tersedia';
  // Keep the animated value and gesture handlers together for this mounted screen.
  const [{ sheetHeight, panResponder }] = useState(() => {
    const sheetHeight = new Animated.Value(MAX_SHEET_HEIGHT);
    let startHeight = MAX_SHEET_HEIGHT;
    let currentHeight = MAX_SHEET_HEIGHT;
    const animateSheet = (height) => {
      currentHeight = height;
      Animated.spring(sheetHeight, {
        toValue: height,
        useNativeDriver: false,
        bounciness: 3,
      }).start();
    };
    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
      onPanResponderGrant: () => {
        startHeight = currentHeight;
      },
      onPanResponderMove: (_, gesture) => {
        const nextHeight = Math.max(
          COLLAPSED_HEIGHT,
          Math.min(MAX_SHEET_HEIGHT, startHeight - gesture.dy)
        );
        currentHeight = nextHeight;
        sheetHeight.setValue(nextHeight);
      },
      onPanResponderRelease: (_, gesture) => {
        animateSheet(
          gesture.dy > 40 ||
            currentHeight < (COLLAPSED_HEIGHT + MAX_SHEET_HEIGHT) / 2
            ? COLLAPSED_HEIGHT
            : MAX_SHEET_HEIGHT
        );
      },
    });
    return { sheetHeight, panResponder };
  });

  return (
    <View style={styles.root}>
      {/* Upper Purple Profile Section */}
      <View style={[styles.headerSection, { paddingTop: topInset }]}>
        <View style={styles.topRow}>
          <Text style={styles.headerTitle}>Pengaturan Akun</Text>
          <View style={styles.topActions}>
            <TouchableOpacity activeOpacity={0.8} style={styles.notifCircleBtn}>
              <Ionicons name="notifications" size={20} color={COLORS.darkPurple} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onLogout}
              style={styles.logoutCircleBtn}
              accessibilityLabel="Keluar akun"
            >
              <MaterialCommunityIcons
                name="exit-to-app"
                size={21}
                color={COLORS.darkPurple}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Circular Avatar Placeholder */}
        <View style={styles.avatarContainer}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100">
            <Line
              x1="15"
              y1="15"
              x2="85"
              y2="85"
              stroke={COLORS.primaryPurple}
              strokeWidth="2.5"
            />
            <Line
              x1="85"
              y1="15"
              x2="15"
              y2="85"
              stroke={COLORS.primaryPurple}
              strokeWidth="2.5"
            />
          </Svg>
        </View>

        <Text style={styles.userName}>{displayName}</Text>
        <Text style={styles.userEmail}>{displayEmail}</Text>
        <Text style={styles.visitCounterText}>
          6 Destinasi Braga Telah Kamu Kunjungi!
        </Text>

        <TouchableOpacity activeOpacity={0.85} style={styles.historyPillBtn}>
          <Text style={styles.historyPillText}>Lihat Histori Kunjungan</Text>
          <MaterialCommunityIcons
            name="history"
            size={18}
            color={COLORS.darkPurple}
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Settings Menu */}
      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
        <View {...panResponder.panHandlers} style={styles.dragHandleHitArea}>
          <View style={styles.dragHandle} />
        </View>

        {/* Menu Item 1: Ganti Password */}
        <TouchableOpacity activeOpacity={0.75} style={styles.menuRow}>
          <View style={styles.menuLeft}>
            <View style={styles.passwordBadge}>
              <Text style={styles.passwordDots}>•••</Text>
            </View>
            <Text style={styles.menuLabel}>Ganti Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.darkPurple} />
        </TouchableOpacity>

        {/* Menu Item 2: Lihat Ulasan */}
        <TouchableOpacity activeOpacity={0.75} style={styles.menuRow}>
          <View style={styles.menuLeft}>
            <Ionicons name="star" size={24} color={COLORS.primaryPurple} />
            <Text style={styles.menuLabel}>Lihat Ulasan</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.darkPurple} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.primaryPurple,
  },
  headerSection: {
    alignItems: 'center',
    paddingBottom: 24,
    backgroundColor: COLORS.primaryPurple,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 14,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  notifCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.lavenderTint,
    borderWidth: 2.5,
    borderColor: '#9E7CE0',
    overflow: 'hidden',
    marginBottom: 10,
  },
  userName: {
    fontSize: 26,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: 8,
  },
  visitCounterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 12,
  },
  historyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.pill,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  historyPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.softLilacBg,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingTop: 10,
    overflow: 'hidden',
  },
  dragHandleHitArea: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragHandle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.lavenderTint,
    marginBottom: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  passwordBadge: {
    backgroundColor: COLORS.primaryPurple,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  passwordDots: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});