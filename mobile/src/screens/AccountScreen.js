import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';

export default function AccountScreen() {
  return (
    <View style={styles.root}>
      {/* Upper Purple Profile Section */}
      <SafeAreaView style={styles.headerSection}>
        <View style={styles.topRow}>
          <Text style={styles.headerTitle}>Pengaturan Akun</Text>
          <TouchableOpacity activeOpacity={0.8} style={styles.notifCircleBtn}>
            <Ionicons name="notifications" size={20} color={COLORS.darkPurple} />
          </TouchableOpacity>
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

        <Text style={styles.userName}>Favian</Text>
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
      </SafeAreaView>

      {/* Bottom Sheet Settings Menu */}
      <View style={styles.bottomSheet}>
        <View style={styles.dragHandle} />

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

        {/* Spacer + Keluar Akun Button */}
        <View style={styles.logoutWrapper}>
          <TouchableOpacity activeOpacity={0.85} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Keluar Akun</Text>
            <MaterialCommunityIcons
              name="exit-to-app"
              size={22}
              color={COLORS.darkPurple}
              style={{ marginLeft: 10 }}
            />
          </TouchableOpacity>
        </View>
      </View>
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
    flex: 1,
    backgroundColor: COLORS.softLilacBg,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    paddingTop: 10,
  },
  dragHandle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.lavenderTint,
    alignSelf: 'center',
    marginBottom: 10,
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
  logoutWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 24,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingVertical: 10,
    paddingHorizontal: 26,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
});