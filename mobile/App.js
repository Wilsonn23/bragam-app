import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import BottomNavBar from './src/components/BottomNavBar';
import PoiTriggerModal from './src/components/PoiTriggerModal';
import HomeScreen from './src/screens/HomeScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import TripScreen from './src/screens/TripScreen';
import AccountScreen from './src/screens/AccountScreen';
import { router, usePathname } from 'expo-router';
import { usePois } from './src/poi/PoiProvider';
import { openPoiDetail } from './src/poi/notification';
import { useAppActive, useForegroundLocation } from './src/hooks/useForegroundLocation';
import { usePoiTriggers } from './src/hooks/usePoiTriggers';
import { ActionButton } from './src/components/ActionButton';
import NavigationScreen from './src/screens/NavigationScreen';
import TripRouteSummaryScreen from './src/screens/TripRouteSummaryScreen';
import { COLORS } from './src/components/theme';

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const data = usePois();
  const active = useAppActive();
  const path = usePathname();

  // Existing non-Router sub-screens: Navigation and TripSummary.
  const [subScreen, setSubScreen] = useState(null);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);

  const exploring = active && path === '/' && activeTab === 'Explore' && subScreen === null;
  const gps = useForegroundLocation(exploring);
  const sample = gps.sample;
  const { event, dismiss } = usePoiTriggers(data.records, sample, exploring);
  const handleOpenDetail = poi => {
    if (poi?.id) openPoiDetail(poi.id, target => router.push(target));
  };
  const onOpenPoiDetail = poiId => {
    dismiss();
    openPoiDetail(poiId, target => router.push(target));
  };
  const hasLocationFeedback = data.status === 'loading' || data.status === 'empty' || data.error ||
    gps.loading || gps.error;
  const locationFeedback = hasLocationFeedback ? <View style={{ gap: 8, padding: 16 }}>
    {data.status === 'loading' && <ActivityIndicator accessibilityLabel="Memuat destinasi" color={COLORS.darkPurple} />}
    {data.error && <Text accessibilityLiveRegion="polite">{data.error}</Text>}
    {data.error && <ActionButton label="Coba muat destinasi lagi" onPress={data.retry} />}
    {data.status === 'empty' && <><Text>Belum ada destinasi tersedia.</Text><ActionButton label="Muat ulang destinasi" onPress={data.retry} /></>}
    {gps.loading && <Text>Membaca lokasi…</Text>}
    {gps.error && <><Text accessibilityLiveRegion="polite">{gps.error}</Text><ActionButton label="Coba GPS lagi" onPress={gps.retry} /></>}
  </View> : null;

  const handleOpenDirections = (poi) => {
    setSelectedPoi({ ...poi, coordinate: { latitude: poi.latitude, longitude: poi.longitude } });
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
            pois={data.records}
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
            pois={data.records}
            sample={sample}
            statusContent={locationFeedback}
          />
        );
      case 'Trip':
        return <TripScreen onUseTrip={handleUseTrip} />;
      case 'Account':
        return <AccountScreen />;
      default:
        return <HomeScreen pois={data.records} onOpenDetail={handleOpenDetail} onOpenDirections={handleOpenDirections} onUseTrip={handleUseTrip} />;
    }
  };

  const isLightStatusBar =
    subScreen === null && (activeTab === 'Home' || activeTab === 'Account');

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isLightStatusBar ? 'light-content' : 'dark-content'}
      />

      <View style={styles.screenWrapper}>{renderContent()}</View>

      <BottomNavBar activeTab={activeTab} onSelectTab={handleSelectTab} />

      <PoiTriggerModal poi={event?.poi} distanceMeters={event?.distanceMeters} onClose={dismiss} onOpenPoiDetail={onOpenPoiDetail}
        onDirections={poiId => {
          const poi = data.records.find(record => record.id === poiId);
          if (poi) { dismiss(); handleOpenDirections(poi); }
        }} />
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
