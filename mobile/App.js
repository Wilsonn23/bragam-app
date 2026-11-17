import React, { useState } from 'react';
import { View, StyleSheet, StatusBar, Alert, Platform } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import BottomNavBar from './src/components/BottomNavBar';
import PoiTriggerModal from './src/components/PoiTriggerModal';
import HomeScreen from './src/screens/HomeScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import TripScreen from './src/screens/TripScreen';
import AccountScreen from './src/screens/AccountScreen';
import LoginScreen from './src/screens/LoginScreen';
import PoiDetailScreen from './src/screens/PoiDetailScreen';
import NavigationScreen from './src/screens/NavigationScreen';
import TripRouteSummaryScreen from './src/screens/TripRouteSummaryScreen';
import BookmarkScreen from './src/screens/BookmarkScreen';
import { COLORS } from './src/components/theme';
import { usePois } from './src/poi/PoiProvider';
import { useAppActive, useForegroundLocation } from './src/hooks/useForegroundLocation';
import { usePoiTriggers } from './src/hooks/usePoiTriggers';

function MainApp() {
  const insets = useSafeAreaInsets();
  const [currentUser, setCurrentUser] = useState(null);
  const { pois, loading, error } = usePois();
  const active = useAppActive();
  const gps = useForegroundLocation(active);
  const { event, dismiss } = usePoiTriggers(pois, gps.sample, active);
  const [activeTab, setActiveTab] = useState('Home');

  // Sub-screens state: null | 'PoiDetail' | 'Navigation' | 'TripSummary' | 'Bookmark'
  const [subScreen, setSubScreen] = useState(null);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);

  // State daftar POI yang disimpan ke Bookmark
  const [bookmarkedPois, setBookmarkedPois] = useState([]);

  // State khusus Geofence Trigger Notification
  const [geofencePoi, setGeofencePoi] = useState(null);

  // Hitung penyusutan tinggi window saat keyboard muncul
  const [fullHeight, setFullHeight] = useState(0);
  const [currentHeight, setCurrentHeight] = useState(0);
  const [navHeight, setNavHeight] = useState(0);

  // Jarak aman bawah agar BottomNavBar tidak tertutup tombol navigasi sistem Android
  const systemBottomInset =
    insets.bottom > 0 ? insets.bottom : Platform.OS === 'android' ? 24 : 0;

  const isPoiBookmarked = (targetPoi) => {
    if (!targetPoi) return false;
    return bookmarkedPois.some(
      (item) =>
        (targetPoi.id && String(item.id) === String(targetPoi.id)) ||
        item.name?.toLowerCase() === targetPoi.name?.toLowerCase()
    );
  };

  const handleToggleSavePoi = (targetPoi) => {
    if (!targetPoi) return;
    setBookmarkedPois((prev) => {
      const exists = prev.some(
        (item) =>
          (targetPoi.id && String(item.id) === String(targetPoi.id)) ||
          item.name?.toLowerCase() === targetPoi.name?.toLowerCase()
      );
      if (exists) {
        return prev.filter(
          (item) =>
            !(
              (targetPoi.id && String(item.id) === String(targetPoi.id)) ||
              item.name?.toLowerCase() === targetPoi.name?.toLowerCase()
            )
        );
      }
      return [targetPoi, ...prev];
    });
  };

  const handleRemoveBookmark = (targetPoi) => {
    if (!targetPoi) return;
    setBookmarkedPois((prev) =>
      prev.filter(
        (item) =>
          !(
            (targetPoi.id && String(item.id) === String(targetPoi.id)) ||
            item.name?.toLowerCase() === targetPoi.name?.toLowerCase()
          )
      )
    );
  };

  const handleAddToItinerary = (targetPoi) => {
    Alert.alert(
      'Berhasil Ditambahkan',
      `${targetPoi.name} telah ditambahkan ke Itinerary perjalananmu.`
    );
  };

  const handleContainerLayout = (event) => {
    const { height } = event.nativeEvent.layout;
    if (height > 0) {
      setCurrentHeight(height);
      setFullHeight((prev) => (height > prev ? height : prev));
    }
  };

  const windowShrink =
    fullHeight > 0 && currentHeight > 0 ? Math.max(0, fullHeight - currentHeight) : 0;

  const handleOpenDetail = (poi) => {
    const byId = pois.find((item) => item.id === poi?.id);
    const byName = pois.filter(
      (item) => item.name.toLowerCase() === poi?.name?.toLowerCase()
    );
    const selected = byId || (byName.length === 1 ? byName[0] : null);
    if (!selected) {
      Alert.alert(
        'Destinasi belum tersedia',
        loading
          ? 'Data destinasi sedang dimuat.'
          : error || 'Data detail destinasi tidak ditemukan.'
      );
      return;
    }
    setSelectedPoi(selected);
    setSubScreen('PoiDetail');
  };

  const handleOpenDirections = (poi) => {
    setSelectedPoi(poi);
    setActiveTab('Explore');
    setSubScreen('Navigation');
  };

  const handleOpenBookmarks = () => {
    setSubScreen('Bookmark');
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
          isSaved={isPoiBookmarked(selectedPoi)}
          onToggleSave={handleToggleSavePoi}
          onAddToItinerary={handleAddToItinerary}
          onBack={() => setSubScreen(null)}
          onOpenDirections={handleOpenDirections}
        />
      );
    }

    if (subScreen === 'Bookmark') {
      return (
        <BookmarkScreen
          bookmarkedPois={bookmarkedPois}
          onBack={() => setSubScreen(null)}
          onOpenDetail={handleOpenDetail}
          onOpenDirections={handleOpenDirections}
          onRemoveBookmark={handleRemoveBookmark}
          onAddToItinerary={handleAddToItinerary}
        />
      );
    }

    if (subScreen === 'Navigation') {
      return (
        <NavigationScreen
          key={selectedPoi?.id || selectedPoi?.name}
          poi={selectedPoi}
          pois={pois}
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
            onOpenBookmarks={handleOpenBookmarks}
            onUseTrip={handleUseTrip}
          />
        );
      case 'Explore':
        return (
          <ExploreScreen
            windowShrink={windowShrink}
            pois={pois}
            bookmarkedPois={bookmarkedPois}
            onOpenDetail={handleOpenDetail}
            onOpenDirections={handleOpenDirections}
            onOpenBookmarks={handleOpenBookmarks}
            onToggleSave={handleToggleSavePoi}
            onAddToItinerary={handleAddToItinerary}
            onSimulateGeofence={() => {
              const target =
                pois.find((p) => p.name.toLowerCase().includes('citywalk')) ||
                pois[0];
              setGeofencePoi(target);
            }}
          />
        );
      case 'Trip':
        return <TripScreen onUseTrip={handleUseTrip} />;
      case 'Account':
        return (
          <AccountScreen
            user={currentUser}
            onLogout={() => setCurrentUser(null)}
          />
        );
      default:
        return (
          <HomeScreen
            pois={pois}
            onOpenDetail={handleOpenDetail}
            onOpenDirections={handleOpenDirections}
            onOpenBookmarks={handleOpenBookmarks}
            onUseTrip={handleUseTrip}
          />
        );
    }
  };

  const visiblePoi = event
    ? { ...event.poi, distanceMeters: event.distanceMeters }
    : geofencePoi;
  const closePoi = () => {
    if (event) dismiss();
    else setGeofencePoi(null);
  };

  const showBottomNav = subScreen !== 'PoiDetail';
  const isLightStatusBar =
    subScreen === null && (activeTab === 'Home' || activeTab === 'Account');

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  return (
    <View onLayout={handleContainerLayout} style={styles.container}>
      <StatusBar
        barStyle={isLightStatusBar ? 'light-content' : 'dark-content'}
      />

      {/* Biarkan screenWrapper mengisi layar penuh tanpa terpotong paddingBottom putih */}
      <View style={styles.screenWrapper}>
        {renderContent()}
      </View>

      {showBottomNav && (
        <View
          onLayout={(event) => {
            const h = event.nativeEvent.layout.height;
            if (h > 0 && h !== navHeight) setNavHeight(h);
          }}
          style={[
            styles.fixedBottomNav,
            { bottom: -windowShrink },
          ]}
        >
          <BottomNavBar activeTab={activeTab} onSelectTab={handleSelectTab} />
        </View>
      )}

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

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
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
  fixedBottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.darkPurple,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});
