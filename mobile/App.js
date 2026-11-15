import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, Alert } from 'react-native';
import { router } from 'expo-router';
import BottomNavBar from './src/components/BottomNavBar';
import PoiTriggerModal from './src/components/PoiTriggerModal';
import HomeScreen from './src/screens/HomeScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import TripScreen from './src/screens/TripScreen';
import AccountScreen from './src/screens/AccountScreen';
import NavigationScreen from './src/screens/NavigationScreen';
import TripRouteSummaryScreen from './src/screens/TripRouteSummaryScreen';
import { COLORS } from './src/components/theme';
import { usePois } from './src/poi/PoiProvider';
import { useAppActive, useForegroundLocation } from './src/hooks/useForegroundLocation';
import { usePoiTriggers } from './src/hooks/usePoiTriggers';

export default function App() {
  const { pois, loading, error, source } = usePois();
  const active = useAppActive();
  const gps = useForegroundLocation(active);
  const { event, dismiss } = usePoiTriggers(pois, gps.sample, active);
  const [activeTab, setActiveTab] = useState('Home');

  // Sub-screens state: null | 'Navigation' | 'TripSummary'
  const [subScreen, setSubScreen] = useState(null);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);

  // State khusus Geofence Trigger Notification (hanya muncul jika geofence terpicu)
  const [geofencePoi, setGeofencePoi] = useState(null);

  const handleOpenDetail = (poi) => {
    // Main's prototype cards still use different IDs; resolve only an unambiguous API record.
    const byId = pois.find(item => item.id === poi?.id);
    const byName = pois.filter(item => item.name.toLowerCase() === poi?.name?.toLowerCase());
    const selected = byId || (byName.length === 1 ? byName[0] : null);
    if (!selected) {
      Alert.alert('Destinasi belum tersedia', loading ? 'Data destinasi sedang dimuat.' : error || 'Data detail destinasi tidak ditemukan.');
      return;
    }
    router.push({ pathname: '/poi/[id]', params: { id: selected.id } });
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
            onOpenDetail={handleOpenDetail}
            onOpenDirections={handleOpenDirections}
            onUseTrip={handleUseTrip}
          />
        );
      case 'Explore':
        return (
          <ExploreScreen
            pois={pois}
            dataSource={source}
            onOpenDetail={handleOpenDetail}
            onOpenDirections={handleOpenDirections}
            // Tekan tahan ikon bookmark di kanan atas Explore untuk menguji pop-up geofence
            onSimulateGeofence={__DEV__ && pois.length ? () => setGeofencePoi(pois[0]) : undefined}
          />
        );
      case 'Trip':
        return <TripScreen onUseTrip={handleUseTrip} />;
      case 'Account':
        return <AccountScreen />;
      default:
        return <HomeScreen onOpenDetail={handleOpenDetail} onOpenDirections={handleOpenDirections} onUseTrip={handleUseTrip} />;
    }
  };

  const visiblePoi = event ? { ...event.poi, distanceMeters: event.distanceMeters } : geofencePoi;
  const closePoi = () => { if (event) dismiss(); else setGeofencePoi(null); };

  const isLightStatusBar =
    subScreen === null && (activeTab === 'Home' || activeTab === 'Account');

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isLightStatusBar ? 'light-content' : 'dark-content'}
      />

      <View style={styles.screenWrapper}>{renderContent()}</View>

      <BottomNavBar activeTab={activeTab} onSelectTab={handleSelectTab} />

      {/* Geofence Notification Pop-up */}
      <PoiTriggerModal
        visible={Boolean(visiblePoi)}
        poi={visiblePoi}
        onClose={closePoi}
        onSave={undefined}
        onAddToItinerary={undefined}
        onCheckNow={(poi) => {
          closePoi();
          handleOpenDetail(poi);
        }}
        onDirections={(poi) => {
          closePoi();
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
