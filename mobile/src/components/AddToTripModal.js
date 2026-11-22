import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from './theme';
import { BRAGA_POIS } from '../constants/bragaMapData';

const DEFAULT_STAY_MINUTES = 60;
const DEFAULT_USER_ORIGIN = {
  latitude: -6.9182,
  longitude: 107.6093,
};

function haversineMeters(a, b) {
  if (!a || !b) return 0;
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h)));
}

function getPoiCoord(poi, allPois = BRAGA_POIS) {
  if (!poi) return null;
  const lat = Number(poi.coordinate?.latitude ?? poi.latitude ?? poi.lat);
  const lng = Number(poi.coordinate?.longitude ?? poi.longitude ?? poi.lng);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { latitude: lat, longitude: lng };
  }
  const matched = allPois.find(
    (item) =>
      (poi.id && String(item.id) === String(poi.id)) ||
      item.name?.toLowerCase() === poi.name?.toLowerCase()
  );
  if (matched) {
    const mLat = Number(matched.coordinate?.latitude ?? matched.latitude);
    const mLng = Number(matched.coordinate?.longitude ?? matched.longitude);
    if (Number.isFinite(mLat) && Number.isFinite(mLng)) {
      return { latitude: mLat, longitude: mLng };
    }
  }
  return null;
}

function estimateWalkMinutes(fromCoord, toCoord) {
  if (!fromCoord || !toCoord) return 10;
  const meters = haversineMeters(fromCoord, toCoord);
  return Math.max(2, Math.ceil(meters / 75));
}

function parseTripTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 9 * 60;
  const cleaned = timeStr.replace(':', '.');
  const [h, m] = cleaned.split('.').map(Number);
  if (!Number.isFinite(h)) return 9 * 60;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

function formatMinutesToTripTime(totalMinutes) {
  const normalized = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h = String(Math.floor(normalized / 60)).padStart(2, '0');
  const m = String(normalized % 60).padStart(2, '0');
  return `${h}.${m}`;
}

function isPoiInTrip(trip, targetPoi) {
  if (!trip?.stops || !targetPoi) return false;
  return trip.stops.some(
    (stop) =>
      (targetPoi.id && String(stop.id) === String(targetPoi.id)) ||
      stop.name?.toLowerCase() === targetPoi.name?.toLowerCase()
  );
}

export default function AddToTripModal({
  visible,
  poi,
  tripPlans = [],
  allPois = BRAGA_POIS,
  userCoord = null,
  onClose,
  onSelectExistingTrip,
  onCreateNewTrip,
}) {
  // 'select' = Pilih Trip / Buat Trip Baru | 'create' = Input Nama Trip Baru
  const [step, setStep] = useState('select');
  const [newTripTitle, setNewTripTitle] = useState('');

  useEffect(() => {
    if (visible) {
      setStep('select');
      setNewTripTitle(`Trip Plan ${tripPlans.length + 1}`);
    }
  }, [visible, tripPlans.length]);

  if (!poi) return null;

  const handleChooseExistingTrip = (trip) => {
    if (isPoiInTrip(trip, poi)) return;

    const existingStops = Array.isArray(trip.stops) ? trip.stops : [];
    let nextTimeStr = '09.00';

    if (existingStops.length === 0) {
      const origin = userCoord || DEFAULT_USER_ORIGIN;
      const destCoord = getPoiCoord(poi, allPois);
      const walkMins = estimateWalkMinutes(origin, destCoord);
      const now = new Date(Date.now() + walkMins * 60 * 1000);
      nextTimeStr = formatMinutesToTripTime(
        now.getHours() * 60 + now.getMinutes()
      );
    } else {
      const lastStop = existingStops[existingStops.length - 1];
      const lastMins = parseTripTimeToMinutes(lastStop.time);
      const lastCoord = getPoiCoord(lastStop, allPois);
      const nextCoord = getPoiCoord(poi, allPois);
      const walkMins = estimateWalkMinutes(lastCoord, nextCoord);
      nextTimeStr = formatMinutesToTripTime(
        lastMins + DEFAULT_STAY_MINUTES + walkMins
      );
    }

    const newStop = {
      ...poi,
      time: nextTimeStr,
    };

    onSelectExistingTrip?.(trip.id, newStop, trip.title);
    onClose?.();
  };

  const handleConfirmCreateTrip = () => {
    const cleanTitle =
      newTripTitle.trim() || `Trip Plan ${tripPlans.length + 1}`;
    const origin = userCoord || DEFAULT_USER_ORIGIN;
    const destCoord = getPoiCoord(poi, allPois);
    const walkMins = estimateWalkMinutes(origin, destCoord);

    const arrivalDate = new Date(Date.now() + walkMins * 60 * 1000);
    const arrivalTime = formatMinutesToTripTime(
      arrivalDate.getHours() * 60 + arrivalDate.getMinutes()
    );

    const createdPlan = {
      id: `plan-${Date.now()}`,
      title: cleanTitle,
      stops: [
        {
          ...poi,
          time: arrivalTime,
        },
      ],
    };

    onCreateNewTrip?.(createdPlan);
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        {step === 'select' ? (
          <View
            style={styles.modalCard}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalTitle}>Tambahkan ke Trip</Text>
                <Text style={styles.modalSub} numberOfLines={1}>
                  Destinasi: {poi.name}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={COLORS.darkPurple} />
              </TouchableOpacity>
            </View>

            {/* Tombol Membuat Trip Baru */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                setNewTripTitle(`Trip Plan ${tripPlans.length + 1}`);
                setStep('create');
              }}
              style={styles.createNewTripBtn}
            >
              <View style={styles.createNewIconCircle}>
                <Ionicons name="add" size={20} color={COLORS.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.createNewTripTitle}>Membuat Trip Baru</Text>
                <Text style={styles.createNewTripSub}>
                  Buat rencana perjalanan baru dengan destinasi ini
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.darkPurple}
              />
            </TouchableOpacity>

            <Text style={styles.listSectionLabel}>
              Atau pilih Trip yang sudah ada:
            </Text>

            {tripPlans.length === 0 ? (
              <View style={styles.emptyTripBox}>
                <Text style={styles.emptyTripText}>
                  Belum ada daftar Trip tersimpan.
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.tripList}
                showsVerticalScrollIndicator={false}
              >
                {tripPlans.map((trip) => {
                  const alreadyExists = isPoiInTrip(trip, poi);
                  const stopCount = trip.stops?.length || 0;

                  return (
                    <TouchableOpacity
                      key={trip.id}
                      activeOpacity={alreadyExists ? 1 : 0.85}
                      disabled={alreadyExists}
                      onPress={() => handleChooseExistingTrip(trip)}
                      style={[
                        styles.tripOptionRow,
                        alreadyExists && styles.tripOptionRowDisabled,
                      ]}
                    >
                      <View
                        style={[
                          styles.tripIconBox,
                          alreadyExists && styles.tripIconBoxDisabled,
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="map-marker-path"
                          size={19}
                          color={
                            alreadyExists
                              ? COLORS.textMuted
                              : COLORS.primaryPurple
                          }
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.tripOptionTitle,
                            alreadyExists && styles.tripOptionTitleDisabled,
                          ]}
                          numberOfLines={1}
                        >
                          {trip.title}
                        </Text>
                        <Text style={styles.tripOptionSub}>
                          {stopCount} destinasi
                        </Text>
                      </View>

                      {alreadyExists ? (
                        <View style={styles.alreadyBadge}>
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={COLORS.textMuted}
                          />
                          <Text style={styles.alreadyBadgeText}>
                            Sudah ada
                          </Text>
                        </View>
                      ) : (
                        <Ionicons
                          name="add-circle-outline"
                          size={22}
                          color={COLORS.darkPurple}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        ) : (
          /* Pop-up Input Nama Trip Baru (sama seperti NavigationScreen.js) */
          <View
            style={styles.createModalCard}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.createModalTitle}>Membuat Trip Baru</Text>
            <Text style={styles.createModalSub}>
              Masukkan nama rencana perjalanan untuk {poi.name}:
            </Text>

            <TextInput
              value={newTripTitle}
              onChangeText={setNewTripTitle}
              placeholder="Contoh: Jalan Sore Braga"
              placeholderTextColor={COLORS.textMuted}
              style={styles.createInput}
              autoFocus={true}
            />

            <View style={styles.createBtnRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={onClose}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Batalkan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleConfirmCreateTrip}
                style={styles.confirmBtn}
              >
                <Text style={styles.confirmBtnText}>Jadikan Trip Baru</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(49, 20, 101, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    padding: 16,
    maxHeight: '78%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalSub: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COLORS.primaryPurple,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  createNewTripBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lavenderTint,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.md,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  createNewIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.darkPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createNewTripTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.darkPurple,
  },
  createNewTripSub: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  listSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  tripList: {
    maxHeight: 280,
  },
  emptyTripBox: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyTripText: {
    fontSize: 12.5,
    color: COLORS.textMuted,
  },
  tripOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.softLilacBg,
    marginBottom: 8,
    gap: 10,
  },
  tripOptionRowDisabled: {
    backgroundColor: '#F3F1F7',
    borderColor: '#E2DCEB',
    opacity: 0.65,
  },
  tripIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripIconBoxDisabled: {
    backgroundColor: '#EAE6F2',
  },
  tripOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tripOptionTitleDisabled: {
    color: COLORS.textMuted,
  },
  tripOptionSub: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  alreadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8E3F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.pill,
    gap: 4,
  },
  alreadyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  createModalCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    padding: 18,
  },
  createModalTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  createModalSub: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  createInput: {
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.softLilacBg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  createBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  confirmBtn: {
    flex: 1.2,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.darkPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
});