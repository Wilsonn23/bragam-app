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

const MULTI_ROUTE_DOTS = [
  { x: 55, y: 78 },
  { x: 68, y: 72 },
  { x: 78, y: 58 },
  { x: 92, y: 65 },
  { x: 108, y: 72 },
  { x: 122, y: 80 },
  { x: 136, y: 88 },
  { x: 150, y: 98 },
  { x: 162, y: 112 },
  { x: 174, y: 128 },
  { x: 185, y: 144 },
  { x: 196, y: 160 },
  { x: 196, y: 178 },
  { x: 196, y: 196 },
  { x: 196, y: 214 },
];

export default function TripRouteSummaryScreen({ trip, onBack }) {
  const [stops, setStops] = useState(
    trip?.stops || [
      { id: 's1', time: '09.00', distance: '12km', name: 'Sweet Cantina' },
      { id: 's2', time: '09.00', distance: '12km', name: 'Kopi Toko Djawa' },
    ]
  );

  const handleRemoveStop = (id) => {
    setStops((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <SafeAreaView style={styles.topHeader}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS.darkPurple} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {trip?.title || 'Trip Plan 1'}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onBack}
            style={styles.deletePlanBtn}
          >
            <Text style={styles.deletePlanText}>Hapus Rencana</Text>
            <Ionicons
              name="trash-outline"
              size={15}
              color={COLORS.white}
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Map View */}
      <View style={styles.mapCanvas}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Path
            d="M -20 90 Q 150 130 240 10 T 420 110"
            stroke={COLORS.white}
            strokeWidth="12"
            fill="none"
          />
          <Path
            d="M 110 -10 L 140 360"
            stroke={COLORS.white}
            strokeWidth="10"
            fill="none"
          />
          <Path
            d="M 275 -10 Q 250 180 330 360"
            stroke={COLORS.white}
            strokeWidth="14"
            fill="none"
          />

          {MULTI_ROUTE_DOTS.map((dot, idx) => (
            <Circle
              key={idx}
              cx={dot.x}
              cy={dot.y}
              r={5}
              fill={COLORS.darkPurple}
            />
          ))}
        </Svg>

        {/* Start User Puck */}
        <View style={[styles.userPuck, { top: 68, left: 36 }]} />

        {/* Stop 1 Pin */}
        <View style={[styles.markerGroup, { top: 44, left: 108 }]}>
          <View style={styles.teardropPin}>
            <View style={styles.pinHole} />
          </View>
          <Text style={styles.markerLabel}>Braga Citywalk</Text>
        </View>

        {/* Walking Badge 1 */}
        <View style={[styles.walkBubble, { top: 104, left: 56 }]}>
          <MaterialIcons name="directions-walk" size={15} color={COLORS.white} />
          <Text style={styles.walkBubbleText}>1 min</Text>
        </View>

        {/* Walking Badge 2 */}
        <View style={[styles.walkBubble, { top: 170, left: 214 }]}>
          <MaterialIcons name="directions-walk" size={15} color={COLORS.white} />
          <Text style={styles.walkBubbleText}>1 min</Text>
        </View>

        {/* Stop 2 Pin */}
        <View style={[styles.markerGroup, { top: 212, left: 178 }]}>
          <View style={styles.teardropPin}>
            <View style={styles.pinHole} />
          </View>
          <Text style={styles.markerLabel}>Sweet Cantina</Text>
        </View>

        {/* Recenter Button */}
        <TouchableOpacity activeOpacity={0.85} style={styles.recenterBtn}>
          <MaterialIcons name="my-location" size={24} color={COLORS.darkPurple} />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet: Rute Perjalanan */}
      <View style={styles.bottomSheet}>
        <View style={styles.dragHandle} />
        <Text style={styles.sheetTitle}>Rute Perjalanan</Text>

        <View style={styles.timelineList}>
          {/* Origin Row */}
          <View style={styles.timelineRow}>
            <View style={styles.leftTimelineCol}>
              <View style={styles.nodeCircle} />
              <View style={styles.dottedConnector} />
            </View>
            <View style={[styles.rightInfoCol, styles.rowDivider]}>
              <Text style={styles.originLabel}>Your Location</Text>
            </View>
          </View>

          {/* Dynamic Stops Rows */}
          {stops.map((stop, idx) => {
            const isLast = idx === stops.length - 1;
            return (
              <View key={stop.id} style={styles.timelineRow}>
                <View style={styles.leftTimelineCol}>
                  <View style={styles.timeRow}>
                    <View style={styles.nodeCircle} />
                    <Text style={styles.timeText}>{stop.time}</Text>
                  </View>
                  {!isLast && <View style={styles.dottedConnector} />}
                </View>

                <View style={[styles.rightInfoCol, styles.rowDivider]}>
                  <View style={styles.stopLeftGroup}>
                    <View style={styles.pinCol}>
                      <View style={styles.smallPinBadge}>
                        <Ionicons
                          name="location"
                          size={15}
                          color={COLORS.darkPurple}
                        />
                      </View>
                      <Text style={styles.distText}>{stop.distance}</Text>
                    </View>
                    <Text style={styles.stopName}>{stop.name}</Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => handleRemoveStop(stop.id)}
                  >
                    <Ionicons
                      name="remove-circle-outline"
                      size={24}
                      color={COLORS.darkPurple}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* Add Destination Pill Button */}
        <TouchableOpacity activeOpacity={0.85} style={styles.addDestBtn}>
          <Text style={styles.addDestText}>Add Destination</Text>
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={COLORS.darkPurple}
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>

        {/* Turn-by-Turn Footer Banner */}
        <View style={styles.directionBanner}>
          <MaterialCommunityIcons
            name="arrow-u-left-top"
            size={26}
            color={COLORS.darkPurple}
          />
          <Text style={styles.directionInstruction}>
            Belok kanan menuju Braga Citywalk
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
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  deletePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkPurple,
    borderRadius: RADIUS.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  deletePlanText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#DDD0F4',
    position: 'relative',
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
    fontSize: 11,
    fontWeight: '600',
  },
  recenterBtn: {
    position: 'absolute',
    right: 18,
    bottom: 14,
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
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  timelineList: {
    paddingHorizontal: 22,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftTimelineCol: {
    width: 76,
    alignItems: 'flex-start',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nodeCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.darkPurple,
    backgroundColor: COLORS.white,
  },
  timeText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  dottedConnector: {
    width: 2,
    height: 24,
    marginLeft: 9,
    borderLeftWidth: 2,
    borderStyle: 'dotted',
    borderColor: COLORS.mediumPurple,
  },
  rightInfoCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    marginBottom: 6,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  originLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  stopLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinCol: {
    alignItems: 'center',
    marginRight: 10,
  },
  smallPinBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.lavenderTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stopName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primaryPurple,
  },
  addDestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 1.8,
    borderColor: COLORS.darkPurple,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.white,
    paddingVertical: 7,
    paddingHorizontal: 28,
    marginTop: 6,
    marginBottom: 10,
  },
  addDestText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  directionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    gap: 14,
  },
  directionInstruction: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
});