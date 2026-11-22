import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import { BRAGA_POIS } from '../constants/bragaMapData';
import { useAppActive, useForegroundLocation } from '../hooks/useForegroundLocation';
import { distanceMeters } from '../location/distance';

function formatStopDistance(meters) {
  if (!Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export default function TripScreen({
  plans = [],
  pois = [],
  onUseTrip,
  onEditTrip,
  onCreateTrip,
  onDeleteTrip,
}) {
  const insets = useSafeAreaInsets();
  const topInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? StatusBar.currentHeight || 28
      : 44;

  const isAppActive = useAppActive();
  const { sample: userCoord } = useForegroundLocation(isAppActive);

  const [expandedPlanId, setExpandedPlanId] = useState(
    plans[0]?.id || 'plan-1'
  );
  const [planToDelete, setPlanToDelete] = useState(null);

  const datasetPois = useMemo(
    () => (Array.isArray(pois) && pois.length > 0 ? pois : BRAGA_POIS),
    [pois]
  );

  const toggleExpand = (planId) => {
    setExpandedPlanId((prev) => (prev === planId ? null : planId));
  };

  // Enrich setiap stop dengan data koordinat POI dari dataset dan hitung jarak berantai
  const enrichedPlans = useMemo(() => {
    return plans.map((plan) => {
      let prevPoint =
        userCoord &&
        Number.isFinite(userCoord.latitude) &&
        Number.isFinite(userCoord.longitude)
          ? userCoord
          : null;

      const stopsWithMeta = (plan.stops || []).map((stop, idx) => {
        const matchedPoi =
          datasetPois.find(
            (p) =>
              (stop.id && String(p.id) === String(stop.id)) ||
              p.name?.toLowerCase() === stop.name?.toLowerCase()
          ) || stop;

        const lat = Number(
          matchedPoi.coordinate?.latitude ?? matchedPoi.latitude
        );
        const lng = Number(
          matchedPoi.coordinate?.longitude ?? matchedPoi.longitude
        );
        const currentPoint =
          Number.isFinite(lat) && Number.isFinite(lng)
            ? { latitude: lat, longitude: lng }
            : null;

        let distLabel = stop.distance || '—';
        if (prevPoint && currentPoint) {
          const meters = distanceMeters(prevPoint, currentPoint);
          distLabel = formatStopDistance(meters);
        }

        if (currentPoint) {
          prevPoint = currentPoint;
        }

        return {
          ...matchedPoi,
          ...stop,
          id: matchedPoi.id || stop.id || `stop-${idx}`,
          name: matchedPoi.name || stop.name,
          coordinate: currentPoint || matchedPoi.coordinate,
          distance: distLabel,
        };
      });

      return {
        ...plan,
        stops: stopsWithMeta,
      };
    });
  }, [plans, datasetPois, userCoord]);

  const confirmDelete = () => {
    if (planToDelete) {
      onDeleteTrip?.(planToDelete.id);
      setPlanToDelete(null);
    }
  };

  return (
    <View style={styles.root}>
      {/* Top Header */}
      <View style={[styles.topBar, { paddingTop: topInset + 12 }]}>
        <Text style={styles.topBarTitle}>Itinerary Builder</Text>
      </View>

      {/* Plans List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {/* Kalimat teks rata tengah di atas daftar trip */}
        <Text style={styles.subtitlePrompt}>
          Buat rencana jalan-jalanmu, yuk!
        </Text>

        {enrichedPlans.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons
              name="map-marker-path"
              size={38}
              color={COLORS.mediumPurple}
            />
            <Text style={styles.emptyText}>
              Belum ada rencana perjalanan. Tekan tombol "Buat Rencana" di bawah untuk memulai!
            </Text>
          </View>
        ) : (
          enrichedPlans.map((plan) => {
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
                        size={26}
                        color={COLORS.darkPurple}
                      />
                      <Text style={styles.planTitle} numberOfLines={1}>
                        {plan.title}
                      </Text>
                    </View>

                    <View style={styles.planActions}>
                      {/* Tombol Pakai (Navigasi Berantai GPS -> POI 1 -> POI 2 -> ...) */}
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

                      {/* Tombol Edit -> Masuk ke Setting Trip */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => onEditTrip?.(plan)}
                        style={styles.editBtn}
                      >
                        <Text style={styles.editText}>Edit</Text>
                        <MaterialCommunityIcons
                          name="pencil-outline"
                          size={13}
                          color={COLORS.white}
                          style={{ marginLeft: 3 }}
                        />
                      </TouchableOpacity>

                      {/* Tombol Delete (Simbol sampah saja tanpa teks) */}
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setPlanToDelete(plan)}
                        style={styles.deleteIconBtn}
                        accessibilityLabel={`Hapus ${plan.title}`}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={17}
                          color="#C62828"
                        />
                      </TouchableOpacity>

                      <Ionicons
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={19}
                        color={COLORS.darkPurple}
                      />
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Timeline Body */}
                  {isExpanded && (
                    <View style={styles.planBody}>
                      {plan.stops.map((stop, idx) => {
                        const isLast = idx === plan.stops.length - 1;
                        return (
                          <View
                            key={`${plan.id}-${stop.id}-${idx}`}
                            style={styles.stopRow}
                          >
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
          })
        )}
      </ScrollView>

      {/* Bottom Right Floating CTA: Buat Rencana dari Nol */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onCreateTrip}
        style={styles.fabCreateBtn}
      >
        <Text style={styles.fabCreateText}>Buat Rencana</Text>
        <Ionicons
          name="add"
          size={22}
          color={COLORS.darkPurple}
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>

      {/* Pop-up Konfirmasi Hapus Rencana Perjalanan */}
      <Modal
        visible={Boolean(planToDelete)}
        transparent
        animationType="fade"
        onRequestClose={() => setPlanToDelete(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="trash-outline" size={26} color="#C62828" />
            </View>
            <Text style={styles.confirmMessage}>
              Apakah yakin ingin menghapus Rencana Perjalanan{' '}
              <Text style={{ fontWeight: '700' }}>
                {planToDelete?.title}
              </Text>
              ?
            </Text>

            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setPlanToDelete(null)}
                style={styles.confirmNoBtn}
              >
                <Text style={styles.confirmNoText}>Tidak</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={confirmDelete}
                style={styles.confirmYesBtn}
              >
                <Text style={styles.confirmYesText}>Ya</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    backgroundColor: COLORS.softLilacBg,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitlePrompt: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.darkPurple,
    paddingTop: 18,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 95,
  },
  emptyCard: {
    margin: 20,
    padding: 24,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  planSectionWrapper: {
    paddingHorizontal: 18,
    paddingVertical: 10,
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
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  planHeaderExpanded: {
    borderBottomWidth: 1.8,
    borderBottomColor: COLORS.darkPurple,
  },
  planTitleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  planTitle: {
    flexShrink: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  planActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pakaiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.4,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
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
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  editText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  deleteIconBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
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
    flexShrink: 1,
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
    elevation: 4,
  },
  fabCreateText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(49, 20, 101, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  confirmCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    padding: 20,
    alignItems: 'center',
  },
  confirmIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 14.5,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 18,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmNoBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    alignItems: 'center',
  },
  confirmNoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  confirmYesBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: '#C62828',
    alignItems: 'center',
  },
  confirmYesText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.white,
  },
});