import React, { useState } from 'react';
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

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');

  // Sub-screens state: null | 'PoiDetail' | 'Navigation' | 'TripSummary'
  const [subScreen, setSubScreen] = useState(null);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);

  // State khusus Geofence Trigger Notification (hanya muncul jika geofence terpicu)
  const [geofencePoi, setGeofencePoi] = useState(null);

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
            onOpenDetail={handleOpenDetail}
            onOpenDirections={handleOpenDirections}
            onUseTrip={handleUseTrip}
          />
        );
      case 'Explore':
        return (
          <ExploreScreen
            onOpenDetail={handleOpenDetail}
            onOpenDirections={handleOpenDirections}
            // Tekan tahan ikon bookmark di kanan atas Explore untuk menguji pop-up geofence
            onSimulateGeofence={() =>
              setGeofencePoi({
                name: 'Braga Citywalk',
                distance: '12km',
                rating: '5.0',
              })
            }
          />
        );
      case 'Trip':
        return <TripScreen onUseTrip={handleUseTrip} />;
      case 'Account':
        return <AccountScreen />;
      default:
        return <HomeScreen />;
    }
  };

  // POI Detail tampil penuh tanpa BottomNavBar sesuai desain
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

      {/* Geofence Notification Pop-up */}
      <PoiTriggerModal
        visible={Boolean(geofencePoi)}
        poi={geofencePoi}
        onClose={() => setGeofencePoi(null)}
        onCheckNow={(poi) => {
          setGeofencePoi(null);
          handleOpenDetail(poi);
        }}
        onDirections={(poi) => {
          setGeofencePoi(null);
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