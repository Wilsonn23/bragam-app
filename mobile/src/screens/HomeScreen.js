import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import { WireframeImageBox, PoiDetailFooter } from '../components/PoiCardComponents';

const TRIP_STOPS = [
  { id: '1', time: '09.00', distance: '2km', name: 'Sweet Cantina' },
  { id: '2', time: '09.15', distance: '1km', name: 'Kopi Toko Djawa' },
];

export default function HomeScreen({
  pois,
  onOpenDetail,
  onOpenDirections,
  onUseTrip,
}) {
  const recommended = pois?.[0];
  return (
    <View style={styles.root}>
      {/* Top Purple Header */}
      <SafeAreaView style={styles.headerArea}>
        <View style={styles.headerContent}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.greetingTitle}>Hi, User!</Text>
            <Text style={styles.greetingSubtitle}>
              Mau jalan-jalan ke mana{'\n'}di Braga hari ini?
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity activeOpacity={0.8} style={styles.circleIconBtn}>
              <Ionicons name="notifications" size={20} color={COLORS.darkPurple} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={styles.circleIconBtn}>
              <Ionicons name="bookmark" size={19} color={COLORS.darkPurple} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Main White Rounded Sheet */}
      <View style={styles.sheetContainer}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Section 1: Trip Plan */}
          <Text style={styles.sectionHeading}>
            Coba Pakai Rencana Jalan-Jalanmu, Yuk!
          </Text>

          <View style={styles.tripCard}>
            {/* Trip Card Header */}
            <View style={styles.tripCardHeader}>
              <View style={styles.tripTitleGroup}>
                <MaterialCommunityIcons
                  name="map-marker-path"
                  size={28}
                  color={COLORS.darkPurple}
                />
                <Text style={styles.tripCardTitle}>Trip Plan 1</Text>
              </View>

              <View style={styles.tripCardButtons}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    onUseTrip?.({
                      title: 'Trip Plan 1',
                      stops: [
                        { id: '1', time: '09.00', distance: '12km', name: 'Sweet Cantina' },
                        { id: '2', time: '09.00', distance: '12km', name: 'Kopi Toko Djawa' },
                      ],
                    })
                  }
                  style={styles.pakaiBtn}
                >
                  <Text style={styles.pakaiBtnText}>Pakai</Text>
                  <MaterialCommunityIcons
                    name="directions"
                    size={14}
                    color={COLORS.darkPurple}
                    style={{ marginLeft: 3 }}
                  />
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.8} style={styles.editBtn}>
                  <Text style={styles.editBtnText}>Edit</Text>
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={13}
                    color={COLORS.white}
                    style={{ marginLeft: 3 }}
                  />
                </TouchableOpacity>

                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.darkPurple}
                  style={{ marginLeft: 4 }}
                />
              </View>
            </View>

            {/* Trip Stops Timeline */}
            <View style={styles.tripCardBody}>
              {TRIP_STOPS.map((stop, idx) => {
                const isLast = idx === TRIP_STOPS.length - 1;
                return (
                  <View key={stop.id} style={styles.stopRow}>
                    {/* Time + Circle Timeline */}
                    <View style={styles.timelineCol}>
                      <View style={styles.timeNodeRow}>
                        <View style={styles.nodeCircle} />
                        <Text style={styles.timeText}>{stop.time}</Text>
                      </View>
                      {!isLast && <View style={styles.dottedConnector} />}
                    </View>

                    {/* Destination Info */}
                    <View style={[styles.stopInfoBox, !isLast && styles.stopDivider]}>
                      <View style={styles.smallPinCol}>
                        <View style={styles.smallPinCircle}>
                          <Ionicons name="location" size={15} color={COLORS.darkPurple} />
                        </View>
                        <Text style={styles.smallDistText}>{stop.distance}</Text>
                      </View>
                      <Text style={styles.stopName}>{stop.name}</Text>
                    </View>
                  </View>
                );
              })}

              {/* Decorative Right Scroll Indicator */}
              <View style={styles.fakeScrollTrack} />
            </View>
          </View>

          {/* Carousel Dots */}
          <View style={styles.dotsRow}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>

          {/* Buat Rencana Baru Button */}
          <TouchableOpacity activeOpacity={0.85} style={styles.newPlanBtn}>
            <Text style={styles.newPlanBtnText}>Buat Rencana Baru</Text>
            <Ionicons name="add" size={22} color={COLORS.darkPurple} style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          {/* Divider "Atau" */}
          <View style={styles.orDividerRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>Atau</Text>
            <View style={styles.orLine} />
          </View>

          {/* Section 2: Rekomendasi Destinasi Braga */}
          <Text style={styles.sectionHeading}>
            Coba Kunjungi Rekomendasi Destinasi Braga!
          </Text>

          <WireframeImageBox height={145} />

          {recommended ? <PoiDetailFooter
            name={recommended.name}
            onCheckDetail={() =>
              onOpenDetail?.(recommended)
            }
            onDirections={() =>
              onOpenDirections?.(recommended)
            }
          /> : <Text style={styles.sectionHeading}>Buka Explore untuk memuat atau mencoba ulang destinasi.</Text>}

          {/* Bottom Carousel Dots */}
          <View style={[styles.dotsRow, { marginTop: 12 }]}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.primaryPurple,
  },
  headerArea: {
    backgroundColor: COLORS.darkPurple,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 24,
    backgroundColor: COLORS.primaryPurple,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.white,
    lineHeight: 21,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  circleIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 14,
  },
  tripCard: {
    borderWidth: 1.8,
    borderColor: COLORS.darkPurple,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  tripCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1.8,
    borderBottomColor: COLORS.darkPurple,
  },
  tripTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  tripCardButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pakaiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.4,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pakaiBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkPurple,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  tripCardBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    position: 'relative',
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineCol: {
    width: 78,
    alignItems: 'flex-start',
  },
  timeNodeRow: {
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
    height: 28,
    marginLeft: 9,
    borderLeftWidth: 2,
    borderStyle: 'dotted',
    borderColor: COLORS.mediumPurple,
  },
  stopInfoBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 8,
  },
  stopDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  smallPinCol: {
    alignItems: 'center',
    marginRight: 10,
  },
  smallPinCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.lavenderTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallDistText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stopName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  fakeScrollTrack: {
    position: 'absolute',
    right: 6,
    top: 12,
    width: 4,
    height: 54,
    borderRadius: 2,
    backgroundColor: COLORS.lavenderTint,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.lavenderTint,
  },
  dotActive: {
    backgroundColor: COLORS.darkPurple,
  },
  newPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 1.8,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingVertical: 7,
    paddingHorizontal: 18,
    marginTop: 10,
  },
  newPlanBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.borderSubtle,
  },
  orText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
});