import React, { useState } from 'react';
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

const INITIAL_PLANS = [
  {
    id: 'plan-1',
    title: 'Trip Plan 1',
    stops: [
      { id: 's1', time: '09.00', distance: '12km', name: 'Sweet Cantina' },
      { id: 's2', time: '09.00', distance: '12km', name: 'Kopi Toko Djawa' },
    ],
  },
  {
    id: 'plan-2',
    title: 'Trip Plan 2',
    stops: [
      { id: 's3', time: '14.00', distance: '8km', name: 'Braga Citywalk' },
    ],
  },
  {
    id: 'plan-3',
    title: 'Trip Plan 3',
    stops: [
      { id: 's4', time: '16.30', distance: '5km', name: 'Museum Konferensi Asia Afrika' },
    ],
  },
];

export default function TripScreen({ onUseTrip }) {
  const [expandedPlanId, setExpandedPlanId] = useState('plan-1');

  const toggleExpand = (planId) => {
    setExpandedPlanId((prev) => (prev === planId ? null : planId));
  };

  return (
    <SafeAreaView style={styles.root}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.darkPurple} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Itinerary Builder</Text>
      </View>

      {/* Plans List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {INITIAL_PLANS.map((plan) => {
          const isExpanded = expandedPlanId === plan.id;

          return (
            <View key={plan.id} style={styles.planSectionWrapper}>
              <View style={styles.planCard}>
                {/* Card Header */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => toggleExpand(plan.id)}
                  style={[
                    styles.planHeader,
                    isExpanded && styles.planHeaderExpanded,
                  ]}
                >
                  <View style={styles.planTitleGroup}>
                    <MaterialCommunityIcons
                      name="map-marker-path"
                      size={28}
                      color={COLORS.darkPurple}
                    />
                    <Text style={styles.planTitle}>{plan.title}</Text>
                  </View>

                  <View style={styles.planActions}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => onUseTrip?.(plan)}
                      style={styles.pakaiBtn}
                    >
                      <Text style={styles.pakaiText}>Pakai</Text>
                      <MaterialCommunityIcons
                        name="directions"
                        size={14}
                        color={COLORS.darkPurple}
                        style={{ marginLeft: 3 }}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity activeOpacity={0.8} style={styles.editBtn}>
                      <Text style={styles.editText}>Edit</Text>
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={13}
                        color={COLORS.white}
                        style={{ marginLeft: 3 }}
                      />
                    </TouchableOpacity>

                    <Ionicons
                      name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                      size={20}
                      color={COLORS.darkPurple}
                      style={{ marginLeft: 4 }}
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded Timeline Body */}
                {isExpanded && (
                  <View style={styles.planBody}>
                    {plan.stops.map((stop, idx) => {
                      const isLast = idx === plan.stops.length - 1;
                      return (
                        <View key={stop.id} style={styles.stopRow}>
                          <View style={styles.timelineCol}>
                            <View style={styles.timeNodeRow}>
                              <View style={styles.nodeCircle} />
                              <Text style={styles.timeText}>{stop.time}</Text>
                            </View>
                            {!isLast && <View style={styles.dottedConnector} />}
                          </View>

                          <View
                            style={[
                              styles.stopInfoBox,
                              !isLast && styles.stopDivider,
                            ]}
                          >
                            <View style={styles.smallPinCol}>
                              <View style={styles.smallPinCircle}>
                                <Ionicons
                                  name="location"
                                  size={15}
                                  color={COLORS.darkPurple}
                                />
                              </View>
                              <Text style={styles.smallDistText}>
                                {stop.distance}
                              </Text>
                            </View>
                            <Text style={styles.stopName}>{stop.name}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Bottom Right Floating CTA */}
      <TouchableOpacity activeOpacity={0.85} style={styles.fabCreateBtn}>
        <Text style={styles.fabCreateText}>Buat Rencana</Text>
        <Ionicons name="add" size={22} color={COLORS.darkPurple} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.softLilacBg,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    backgroundColor: COLORS.softLilacBg,
  },
  backBtn: {
    marginRight: 16,
    padding: 4,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  listContent: {
    paddingBottom: 90,
  },
  planSectionWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  planCard: {
    borderWidth: 1.8,
    borderColor: COLORS.darkPurple,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  planHeaderExpanded: {
    borderBottomWidth: 1.8,
    borderBottomColor: COLORS.darkPurple,
  },
  planTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  planActions: {
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
  pakaiText: {
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
  editText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  planBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
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
  fabCreateBtn: {
    position: 'absolute',
    right: 20,
    bottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
    elevation: 3,
  },
  fabCreateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
});