import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import BottomNavBar from './src/components/BottomNavBar';
import PoiTriggerModal from './src/components/PoiTriggerModal';
import HomeScreen from './src/screens/HomeScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import TripScreen from './src/screens/TripScreen';
import AccountScreen from './src/screens/AccountScreen';
import PoiDetailScreen from './src/screens/PoiDetailScreen';
import NavigationScreen from './src/screens/NavigationScreen';
import TripRouteSummaryScreen from './src/screens/TripRouteSummaryScreen';
import { COLORS } from './src/components/theme';

// Modul API & Geofence dari rekan tim
import { fetchPois } from './src/poi/api';
import { useForegroundLocation } from './src/hooks/useForegroundLocation';
import { usePoiTriggers } from './src/hooks/usePoiTriggers';
import { BRAGA_POIS } from './src/constants/bragaMapData';

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const [subScreen, setSubScreen] = useState(null);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);

  // State POI dari backend (pakai BRAGA_POIS sebagai cadangan awal)
  const [pois, setPois] = useState(BRAGA_POIS);
  const [manualGeofencePoi, setManualGeofencePoi] = useState(null);

  // 1. Ambil dataset POI asli dari GET /api/pois saat aplikasi dibuka
  useEffect(() => {
    let isMounted = true;
    fetchPois()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          // Pastikan properti `coordinate` tersedia untuk react-native-maps
          const normalized = data.map((item) => ({
            ...item,
            coordinate: item.coordinate || {
              latitude: Number(item.latitude),
              longitude: Number(item.longitude),
            },
          }));
          setPois(normalized);
        }
      })
      .catch((err) => {
        console.warn('API belum terhubung, menggunakan data lokal:', err.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Baca lokasi GPS perangkat & stabilkan referensi objeknya dengan useMemo
  const locationState = useForegroundLocation();
  const rawCoords =
    locationState?.sample ||
    locationState?.location?.coords ||
    locationState?.coords ||
    locationState?.location ||
    locationState;

  const lat = rawCoords?.latitude;
  const lng = rawCoords?.longitude;

  const currentSample = useMemo(() => {
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return { latitude: lat, longitude: lng };
  }, [lat, lng]);

  const { event, dismiss } = usePoiTriggers(pois, currentSample, Boolean(currentSample));

  // Gabungkan trigger GPS asli dengan simulasi tekan-lama tombol bookmark
  const activeTriggerPoi = event?.poi || manualGeofencePoi;

  const handleCloseModal = () => {
    if (event) dismiss();
    setManualGeofencePoi(null);
  };

  const handleOpenDetail = (poi) => {
    setSelectedPoi(poi);
    setSubScreen('PoiDetail');
  };

  const handleOpenDirections = (poi) => {
    setSelectedPoi(poi);
    setActiveTab('Explore');
    setSubScreen('Navigation');
  };

  const handleUseTrip = (trip) => {
    setSelectedTrip(trip);
    setActiveTab('Trip');
    setSubScreen('TripSummary');
  };

  const handleSelectTab = (tab) => {
    setSubScreen(null);
    setActiveTab(tab);
  };

  const renderContent = () => {
    if (subScreen === 'PoiDetail') {
      return (
        <PoiDetailScreen
          poi={selectedPoi}
          onBack={() => setSubScreen(null)}
          onOpenDirections={handleOpenDirections}
        />
      );
    }

    if (subScreen === 'Navigation') {
      return (
        <NavigationScreen
          poi={selectedPoi}
          onBack={() => setSubScreen(null)}
        />
      );
    }

    if (subScreen === 'TripSummary') {
      return (
        <TripRouteSummaryScreen
          trip={selectedTrip}
          onBack={() => setSubScreen(null)}
        />
      );
    }

    switch (activeTab) {
      case 'Home':
        return (
          <HomeScreen
            pois={pois}
            onOpenDetail={handleOpenDetail}
            onOpenDirections={handleOpenDirections}
            onUseTrip={handleUseTrip}
          />
        );
      case 'Explore':
        return (
          <ExploreScreen
            pois={pois}
            onOpenDetail={handleOpenDetail}
            onOpenDirections={handleOpenDirections}
            onSimulateGeofence={() => setManualGeofencePoi(pois[0])}
          />
        );
      case 'Trip':
        return <TripScreen onUseTrip={handleUseTrip} />;
      case 'Account':
        return <AccountScreen />;
      default:
        return <HomeScreen pois={pois} />;
    }
  };

  const showBottomNav = subScreen !== 'PoiDetail';
  const isLightStatusBar =
    subScreen === null && (activeTab === 'Home' || activeTab === 'Account');

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isLightStatusBar ? 'light-content' : 'dark-content'}
        backgroundColor={isLightStatusBar ? COLORS.primaryPurple : COLORS.softLilacBg}
      />

      <View style={styles.screenWrapper}>{renderContent()}</View>

      {showBottomNav && (
        <BottomNavBar activeTab={activeTab} onSelectTab={handleSelectTab} />
      )}

      {/* Geofence Notification Pop-up (Otomatis dari GPS atau Simulasi) */}
      <PoiTriggerModal
        visible={Boolean(activeTriggerPoi)}
        poi={activeTriggerPoi}
        onClose={handleCloseModal}
        onCheckNow={(poi) => {
          handleCloseModal();
          handleOpenDetail(poi);
        }}
        onDirections={(poi) => {
          handleCloseModal();
          handleOpenDirections(poi);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  screenWrapper: {
    flex: 1,
  },
});