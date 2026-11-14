import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';

const ROUTE_DOTS = [
  { x: 185, y: 315 },
  { x: 193, y: 295 },
  { x: 198, y: 274 },
  { x: 200, y: 253 },
  { x: 200, y: 232 },
  { x: 200, y: 211 },
  { x: 200, y: 190 },
];

export default function NavigationScreen({ poi, onBack }) {
  const destinationName = poi?.name || 'Sweet Cantina';
  const [isSwapped, setIsSwapped] = useState(false);

  const originText = isSwapped ? destinationName : 'Your Location';
  const targetText = isSwapped ? 'Your Location' : destinationName;

  return (
    <View style={styles.root}>
      {/* Top Route Header */}
      <SafeAreaView style={styles.topHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.darkPurple} />
          </TouchableOpacity>

          {/* Origin & Destination Timeline Icons */}
          <View style={styles.routeIconsCol}>
            <View style={styles.originCircle} />
            <View style={styles.dottedLine} />
            <Ionicons name="location" size={22} color={COLORS.primaryPurple} />
          </View>

          {/* Two Input Boxes */}
          <View style={styles.inputsCol}>
            <View style={styles.locationBox}>
              <Text style={styles.locationBoxText} numberOfLines={1}>
                {originText}
              </Text>
            </View>
            <View style={styles.locationBox}>
              <Text style={styles.locationBoxText} numberOfLines={1}>
                {targetText}
              </Text>
            </View>
          </View>

          {/* Right Add & Swap Buttons */}
          <View style={styles.rightControlsCol}>
            <TouchableOpacity activeOpacity={0.8}>
              <Ionicons
                name="add-circle-outline"
                size={26}
                color={COLORS.primaryPurple}
              />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsSwapped(!isSwapped)}
            >
              <MaterialCommunityIcons
                name="swap-vertical"
                size={26}
                color={COLORS.primaryPurple}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Map View Area */}
      <View style={styles.mapCanvas}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          {/* Background Roads */}
          <Path
            d="M -10 90 Q 150 130 240 10 T 420 110"
            stroke={COLORS.white}
            strokeWidth="12"
            fill="none"
          />
          <Path
            d="M 110 -10 L 140 420"
            stroke={COLORS.white}
            strokeWidth="10"
            fill="none"
          />
          <Path
            d="M 275 -10 Q 250 220 330 450"
            stroke={COLORS.white}
            strokeWidth="14"
            fill="none"
          />

          {/* Dotted Navigation Route */}
          {ROUTE_DOTS.map((dot, idx) => (
            <Circle
              key={idx}
              cx={dot.x}
              cy={dot.y}
              r={5.5}
              fill={COLORS.darkPurple}
            />
          ))}
        </Svg>

        {/* Destination Marker */}
        <View
          style={[
            styles.markerGroup,
            { top: '27%', left: '45%' },
          ]}
        >
          <View style={styles.teardropPin}>
            <View style={styles.pinHole} />
          </View>
          <Text style={styles.markerLabel}>{destinationName}</Text>
        </View>

        {/* Walking Duration Speech Bubble */}
        <View style={[styles.walkBubble, { top: '38%', left: '28%' }]}>
          <MaterialIcons name="directions-walk" size={16} color={COLORS.white} />
          <Text style={styles.walkBubbleText}>1 min</Text>
        </View>

        {/* User Location Puck */}
        <View
          style={[
            styles.userPuck,
            { top: '65%', left: '44%' },
          ]}
        />

        {/* Recenter Button */}
        <TouchableOpacity activeOpacity={0.85} style={styles.recenterBtn}>
          <MaterialIcons name="my-location" size={24} color={COLORS.darkPurple} />
        </TouchableOpacity>
      </View>

      {/* Bottom Turn-by-Turn Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.dragHandle} />

        <View style={styles.etaRow}>
          <Text style={styles.etaText}>1 Menit 30 detik (30m)</Text>
        </View>

        <View style={styles.directionBanner}>
          <MaterialCommunityIcons
            name="arrow-u-left-top"
            size={28}
            color={COLORS.darkPurple}
          />
          <Text style={styles.directionInstruction}>
            Belok serong kiri menuju {destinationName}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.softLilacBg,
  },
  topHeader: {
    backgroundColor: COLORS.softLilacBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  routeIconsCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  originCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
  },
  dottedLine: {
    width: 2,
    height: 18,
    borderLeftWidth: 2,
    borderStyle: 'dotted',
    borderColor: COLORS.mediumPurple,
    marginVertical: 2,
  },
  inputsCol: {
    flex: 1,
    gap: 8,
  },
  locationBox: {
    borderWidth: 1.8,
    borderColor: '#9E7CE0',
    borderRadius: 10,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  locationBoxText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primaryPurple,
  },
  rightControlsCol: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#DDD0F4',
    position: 'relative',
  },
  markerGroup: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teardropPin: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8B65D4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinHole: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.lavenderTint,
  },
  markerLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  walkBubble: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkPurple,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    gap: 4,
  },
  walkBubbleText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  userPuck: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.lavenderTint,
    borderWidth: 2.5,
    borderColor: COLORS.primaryPurple,
  },
  recenterBtn: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: '#9E7CE0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  bottomSheet: {
    backgroundColor: COLORS.softLilacBg,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    borderTopWidth: 2.5,
    borderColor: COLORS.primaryPurple,
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
  etaRow: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  etaText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  directionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 14,
  },
  directionInstruction: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
});