import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../components/theme';
import { WireframeImageBox, PoiDetailFooter } from '../components/PoiCardComponents';
import { validCoordinate } from '../location/distance';
import SearchPoiOverlay from '../components/SearchPoiOverlay';
import {
  BRAGA_REGION,
  BRAGA_PURPLE_MAP_STYLE,
} from '../constants/bragaMapData';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 275;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.78;

export default function ExploreScreen({
  onOpenDetail,
  onOpenDirections,
  pois,
  sample,
  statusContent,
  onOpenDevelopmentTools,
}) {
  const mapRef = useRef(null);
  const [activeSegment, setActiveSegment] = useState('nearby'); // 'nearby' | 'recommendation'
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [sheetHeight] = useState(() => new Animated.Value(COLLAPSED_HEIGHT));
  const currentHeightRef = useRef(COLLAPSED_HEIGHT);

  const handleRecenterBraga = () => {
    mapRef.current?.animateToRegion(BRAGA_REGION, 600);
  };

  const animateSheet = (toExpanded) => {
    const target = toExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT;
    setIsExpanded(toExpanded);
    currentHeightRef.current = target;
    Animated.spring(sheetHeight, {
      toValue: target,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  };

  // eslint-disable-next-line react-hooks/refs -- PanResponder stores gesture callbacks; ref reads occur only when those callbacks run.
  const [panResponder] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
      onPanResponderMove: (_, gesture) => {
        const nextHeight = currentHeightRef.current - gesture.dy;
        if (nextHeight >= COLLAPSED_HEIGHT - 20 && nextHeight <= EXPANDED_HEIGHT + 20) {
          sheetHeight.setValue(nextHeight);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -40) {
          animateSheet(true);
        } else if (gesture.dy > 40) {
          animateSheet(false);
        } else {
          animateSheet(currentHeightRef.current > (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2);
        }
      },
    })
  );

  return (
    <View style={styles.root}>
      {/* Google Maps Canvas */}
      <View style={styles.mapCanvas}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFill}
          initialRegion={BRAGA_REGION}
          customMapStyle={BRAGA_PURPLE_MAP_STYLE}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
        >
          {validCoordinate(sample) &&
            <Marker coordinate={{ latitude: sample.latitude, longitude: sample.longitude }} title="Posisi pengguna" pinColor={COLORS.primaryPurple} />}
          {pois.map((poi) => (
            <Marker
              key={poi.id}
              coordinate={{ latitude: poi.latitude, longitude: poi.longitude }}
              onPress={() => {
                mapRef.current?.animateToRegion(
                  {
                    latitude: poi.latitude, longitude: poi.longitude,
                    latitudeDelta: 0.004,
                    longitudeDelta: 0.004,
                  },
                  400
                );
              }}
            >
              <View style={styles.customMarkerRow}>
                <View style={styles.teardropPin}>
                  <View style={styles.pinInnerHole} />
                </View>
                <View style={styles.markerLabelBadge}>
                  <Text style={styles.mapLabelText}>{poi.name}</Text>
                </View>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Top Search Bar Trigger */}
        <SafeAreaView style={styles.topOverlay}>
          <View style={styles.searchRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setIsSearchOpen(true)}
              style={styles.searchInputBox}
            >
              <Text style={styles.searchPlaceholder}>Type Something...</Text>
              <Ionicons name="search" size={20} color={COLORS.darkPurple} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onLongPress={onOpenDevelopmentTools}
              accessibilityRole="button"
              accessibilityLabel="Bookmark"
              accessibilityHint={__DEV__ ? 'Tekan tahan untuk membuka panel pengujian lokasi' : undefined}
              style={styles.bookmarkCircleBtn}
            >
              <Ionicons name="bookmark" size={20} color={COLORS.darkPurple} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Draggable Bottom Sheet (Nearby You & Contextual Recommendation) */}
      <Animated.View style={[styles.bottomSheet, { height: sheetHeight }]}>
        {/* Floating Recenter Button above sheet */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleRecenterBraga}
          style={styles.recenterBtn}
        >
          <MaterialIcons name="my-location" size={24} color={COLORS.darkPurple} />
        </TouchableOpacity>

        {/* Drag Handle Area */}
        <View {...panResponder.panHandlers} style={styles.dragHeaderArea}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => animateSheet(!isExpanded)}
            style={styles.dragHandleTouch}
          >
            <View style={styles.dragHandle} />
          </TouchableOpacity>

          {/* Segmented Toggle: Nearby You / Recommendation */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setActiveSegment('nearby')}
              style={[
                styles.segmentBtn,
                activeSegment === 'nearby' && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === 'nearby' && styles.segmentTextActive,
                ]}
              >
                Nearby You
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setActiveSegment('recommendation')}
              style={[
                styles.segmentBtn,
                activeSegment === 'recommendation' && styles.segmentBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === 'recommendation' && styles.segmentTextActive,
                ]}
              >
                Recommendation
              </Text>
            </TouchableOpacity>
          </View>

          {/* Filter Pills Row (tampil saat sheet digeser ke atas) */}
          {isExpanded && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <TouchableOpacity style={styles.filterIconBtn}>
                <Ionicons name="options" size={20} color={COLORS.primaryPurple} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.filterPill}>
                <Text style={styles.filterPillText}>Destination</Text>
                <View style={styles.filterChevronCircle}>
                  <Ionicons name="chevron-down" size={12} color={COLORS.white} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.filterPill}>
                <Text style={styles.filterPillText}>Open at Night</Text>
                <View style={styles.filterChevronCircle}>
                  <Ionicons name="chevron-down" size={12} color={COLORS.white} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.filterPill}>
                <Text style={styles.filterPillText}>Top Rated</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Scrollable POI Cards List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardsScrollContent}
        >
          {statusContent}
          {pois.map((poi, idx) => (
            <View
              key={`${activeSegment}-${poi.id}`}
              style={[
                styles.poiCardSection,
                idx !== pois.length - 1 && styles.poiCardDivider,
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carouselRow}
              >
                <WireframeImageBox width={105} height={105} />
                <WireframeImageBox width={105} height={105} />
                <WireframeImageBox width={105} height={105} />
              </ScrollView>

              <View style={{ paddingHorizontal: 20 }}>
                <PoiDetailFooter
                  name={poi.name}
                  distance={poi.distance}
                  rating={poi.rating}
                  onCheckDetail={() => onOpenDetail?.(poi)}
                  onDirections={() => onOpenDirections?.(poi)}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      </Animated.View>

      {/* Search POI Overlay */}
      <SearchPoiOverlay
        pois={pois}
        visible={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectPoi={(poi) => onOpenDetail?.(poi)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E5DAF7',
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#DDD0F4',
    position: 'relative',
  },
  topOverlay: {
    zIndex: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  searchInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    height: 46,
  },
  searchPlaceholder: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  bookmarkCircleBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primaryPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customMarkerRow: {
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
  pinInnerHole: {
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
  mapLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryPurple,
  },
  recenterBtn: {
    position: 'absolute',
    right: 18,
    top: -62,
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: RADIUS.sheet,
    borderTopRightRadius: RADIUS.sheet,
    borderTopWidth: 2.5,
    borderColor: COLORS.primaryPurple,
    paddingTop: 6,
  },
  dragHeaderArea: {
    paddingBottom: 6,
  },
  dragHandleTouch: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  dragHandle: {
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.lavenderTint,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 36,
    borderWidth: 1.8,
    borderColor: COLORS.primaryPurple,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    marginBottom: 8,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.pill,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.darkPurple,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  segmentTextActive: {
    color: COLORS.white,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 6,
    gap: 8,
  },
  filterIconBtn: {
    padding: 4,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.mediumPurple,
    borderRadius: RADIUS.pill,
    paddingVertical: 5,
    paddingLeft: 12,
    paddingRight: 6,
    gap: 6,
  },
  filterPillText: {
    fontSize: 12,
    color: COLORS.primaryPurple,
    fontWeight: '500',
  },
  filterChevronCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.darkPurple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardsScrollContent: {
    paddingBottom: 24,
  },
  poiCardSection: {
    paddingVertical: 10,
  },
  poiCardDivider: {
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.borderSubtle,
  },
  carouselRow: {
    paddingHorizontal: 20,
    gap: 10,
  },
});
