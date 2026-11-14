import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  Ionicons,
  MaterialIcons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import {
  BRAGA_REGION,
  BRAGA_POIS,
  BRAGA_PURPLE_MAP_STYLE,
} from '../constants/bragaMapData';
import { fetchWalkingRoute } from '../utils/directionsApi';

// Koordinat default titik awal pengguna di ruas Jl. Braga
const DEFAULT_USER_ORIGIN = {
  latitude: -6.9182,
  longitude: 107.6093,
};

export default function NavigationScreen({ poi, onBack }) {
  const mapRef = useRef(null);
  const destinationName = poi?.name || 'Sweet Cantina';

  // Cari koordinat destinasi dari BRAGA_POIS atau gunakan coordinate dari prop poi
  const targetPoi =
    BRAGA_POIS.find(
      (item) => item.name.toLowerCase() === destinationName.toLowerCase()
    ) ||
    (poi?.coordinate ? poi : BRAGA_POIS[1]);

  const [isSwapped, setIsSwapped] = useState(false);
  const [routeCoords, setRouteCoords] = useState([]);
  const [durationBadge, setDurationBadge] = useState('1 min');
  const [etaSummary, setEtaSummary] = useState('1 Menit 30 detik (30m)');
  const [nextInstruction, setNextInstruction] = useState(
    `Belok serong kiri menuju ${destinationName}`
  );

  const originText = isSwapped ? destinationName : 'Your Location';
  const targetText = isSwapped ? 'Your Location' : destinationName;

  const activeOriginCoord = isSwapped
    ? targetPoi.coordinate
    : DEFAULT_USER_ORIGIN;
  const activeDestCoord = isSwapped
    ? DEFAULT_USER_ORIGIN
    : targetPoi.coordinate;

  useEffect(() => {
    let isMounted = true;

    fetchWalkingRoute(activeOriginCoord, activeDestCoord)
      .then((res) => {
        if (!isMounted) return;
        setRouteCoords(res.coordinates);
        setDurationBadge(res.durationText);
        setEtaSummary(`${res.durationText} (${res.distanceText})`);
        setNextInstruction(res.instruction);

        if (res.coordinates.length > 1) {
          mapRef.current?.fitToCoordinates(res.coordinates, {
            edgePadding: { top: 90, right: 60, bottom: 90, left: 60 },
            animated: true,
          });
        }
      })
      .catch(() => {
        if (!isMounted) return;
        // Fallback garis langsung jika API Key belum aktif atau offline
        setRouteCoords([activeOriginCoord, activeDestCoord]);
      });

    return () => {
      isMounted = false;
    };
  }, [destinationName, isSwapped]);

  const handleRecenter = () => {
    if (routeCoords.length > 1) {
      mapRef.current?.fitToCoordinates(routeCoords, {
        edgePadding: { top: 90, right: 60, bottom: 90, left: 60 },
        animated: true,
      });
    } else {
      mapRef.current?.animateToRegion(BRAGA_REGION, 600);
    }
  };

  // Titik tengah rute untuk menempatkan badge durasi jalan kaki
  const midPoint =
    routeCoords.length > 0
      ? routeCoords[Math.floor(routeCoords.length / 2)]
      : null;

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
              onPress={() => setIsSwapped((prev) => !prev)}
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

      {/* Google Maps View Area */}
      <View style={styles.mapCanvas}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={BRAGA_REGION}
          customMapStyle={BRAGA_PURPLE_MAP_STYLE}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {/* Dotted Walking Route Polyline */}
          {routeCoords.length > 0 && (
            <Polyline
              coordinates={routeCoords}
              strokeColor={COLORS.darkPurple}
              strokeWidth={6}
              lineDashPattern={[1, 10]}
            />
          )}

          {/* Origin Marker */}
          <Marker coordinate={activeOriginCoord} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.userPuck} />
          </Marker>

          {/* Destination Marker */}
          <Marker coordinate={activeDestCoord}>
            <View style={styles.markerGroup}>
              <View style={styles.teardropPin}>
                <View style={styles.pinHole} />
              </View>
              <View style={styles.markerLabelBadge}>
                <Text style={styles.markerLabel}>{targetText}</Text>
              </View>
            </View>
          </Marker>

          {/* Walking Duration Bubble on Route Midpoint */}
          {midPoint && (
            <Marker coordinate={midPoint} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.walkBubble}>
                <MaterialIcons
                  name="directions-walk"
                  size={15}
                  color={COLORS.white}
                />
                <Text style={styles.walkBubbleText}>{durationBadge}</Text>
              </View>
            </Marker>
          )}
        </MapView>

        {/* Recenter Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleRecenter}
          style={styles.recenterBtn}
        >
          <MaterialIcons
            name="my-location"
            size={24}
            color={COLORS.darkPurple}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Turn-by-Turn Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.dragHandle} />

        <View style={styles.etaRow}>
          <Text style={styles.etaText}>{etaSummary}</Text>
        </View>

        <View style={styles.directionBanner}>
          <MaterialCommunityIcons
            name="arrow-u-left-top"
            size={28}
            color={COLORS.darkPurple}
          />
          <Text style={styles.directionInstruction}>{nextInstruction}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teardropPin: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8B65D4',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  pinHole: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.lavenderTint,
  },
  markerLabelBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  markerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  walkBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkPurple,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
    gap: 4,
    elevation: 3,
  },
  walkBubbleText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  userPuck: {
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