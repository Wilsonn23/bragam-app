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
const SimulationPanel = __DEV__ ? require('./src/dev/SimulationPanel').SimulationPanel : null;

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');
  const data = usePois();
  const active = useAppActive();
  const path = usePathname();
  const [simSample, setSimSample] = useState(null);
  const [developmentToolsOpen, setDevelopmentToolsOpen] = useState(false);

  // Existing non-Router sub-screens: Navigation and TripSummary.
  const [subScreen, setSubScreen] = useState(null);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);

  const exploring = active && path === '/' && activeTab === 'Explore' && subScreen === null;
  const gps = useForegroundLocation(exploring && !data.simulation);
  const sample = data.simulation ? simSample : gps.sample;
  const { event, dismiss } = usePoiTriggers(data.records, sample, exploring);
  const handleOpenDetail = poi => {
    if (poi?.id) openPoiDetail(poi.id, target => router.push(target));
  };
  const onOpenPoiDetail = poiId => {
    dismiss();
    openPoiDetail(poiId, target => router.push(target));
  };
  const showDevelopmentTools = __DEV__ && developmentToolsOpen;
  const hasLocationFeedback = data.status === 'loading' || data.status === 'empty' || data.error ||
    (!data.simulation && (gps.loading || gps.error));
  const locationFeedback = (hasLocationFeedback || showDevelopmentTools || data.simulation) ? <View style={{ gap: 8, padding: 16 }}>
    {data.simulation && <Text style={{ color: COLORS.textPrimary }}>SIMULASI — bukan GPS asli</Text>}
    {data.status === 'loading' && <ActivityIndicator accessibilityLabel="Memuat destinasi" color={COLORS.darkPurple} />}
    {data.error && <Text accessibilityLiveRegion="polite">{data.error}</Text>}
    {data.error && <ActionButton label="Coba muat destinasi lagi" onPress={data.retry} />}
    {data.status === 'empty' && <><Text>Belum ada destinasi tersedia.</Text><ActionButton label="Muat ulang destinasi" onPress={data.retry} /></>}
    {!data.simulation && gps.loading && <Text>Membaca lokasi…</Text>}
    {!data.simulation && gps.error && <><Text accessibilityLiveRegion="polite">{gps.error}</Text><ActionButton label="Coba GPS lagi" onPress={gps.retry} /></>}
    {showDevelopmentTools && <ActionButton secondary label={data.simulation ? 'Gunakan GPS asli' : 'Aktifkan simulasi development'} onPress={() => {
      setSimSample(null); data.setSimulation(!data.simulation);
    }} />}
    {showDevelopmentTools && data.simulation && SimulationPanel && <SimulationPanel onSample={setSimSample} />}
    {showDevelopmentTools && <ActionButton secondary label="Tutup panel development" onPress={() => {
      setSimSample(null); data.setSimulation(false); setDevelopmentToolsOpen(false);
    }} />}
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
            onOpenDevelopmentTools={__DEV__ ? () => setDevelopmentToolsOpen(true) : undefined}
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
