import React, { useState, useEffect } from 'react';
import { fetchPois } from './src/poi/api';
import { BRAGA_POIS } from './src/constants/bragaMapData';
import { View, StyleSheet, StatusBar, Modal, Text, Pressable, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { createRecommendationStore } from './src/recommendations/store';
import { DEFAULT_FILTERS } from './src/recommendations/model';
import { loadRecommendations } from './src/recommendations/service';
import BottomNavBar from './src/components/BottomNavBar';
import PoiTriggerModal from './src/components/PoiTriggerModal';
import HomeScreen from './src/screens/HomeScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import TripScreen from './src/screens/TripScreen';
import AccountScreen from './src/screens/AccountScreen';
import PoiDetailScreen from './src/screens/PoiDetailScreen';
import NavigationScreen from './src/screens/NavigationScreen';
import TripRouteSummaryScreen from './src/screens/TripRouteSummaryScreen';
import BookmarkScreen from './src/screens/BookmarkScreen';
import { COLORS } from './src/components/theme';

export default function App() {
  const [fontsReady, fontError] = useFonts({ PB12Jakarta: require('./assets/fonts/PlusJakartaSans.ttf') });
  const [activeTab, setActiveTab] = useState('Home');
  const [recommendationStore] = useState(() => createRecommendationStore(loadRecommendations));
  useEffect(() => () => recommendationStore.cancel(), [recommendationStore]);
  const [exploreView, setExploreView] = useState({ activeSegment: 'nearby', filters: { ...DEFAULT_FILTERS } });
  const [actionNotice, setActionNotice] = useState(null);

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

  const [pois, setPois] = useState(BRAGA_POIS);

  useEffect(() => {
    let isMounted = true;
    fetchPois()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setPois(data);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const isPoiBookmarked = (targetPoi) => {
    if (!targetPoi) return false;
    return bookmarkedPois.some(
      (item) =>
        (targetPoi.id && String(item.id) === String(targetPoi.id)) ||
        item.name?.toLowerCase() === targetPoi.name?.toLowerCase()
    );
  };

  // Menambahkan POI ke Bookmark (atau menghapus jika ditekan kembali)
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

  // Menghapus POI setelah konfirmasi "Ya" pada halaman Bookmark
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
    setActionNotice(`${targetPoi.name} belum ditambahkan. Fitur menambahkan destinasi ke itinerary belum tersedia.`);
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
    setSelectedPoi(poi);
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
            recommendationStore={recommendationStore}
            exploreView={exploreView}
            onExploreViewChange={setExploreView}
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
        return <AccountScreen />;
      default:
        return <HomeScreen pois={pois} />;
    }
  };

  const showBottomNav = subScreen !== 'PoiDetail';

  const isLightStatusBar =
    subScreen === null && (activeTab === 'Home' || activeTab === 'Account');

  if (!fontsReady && !fontError) return <View style={styles.fontLoading}>
    <ActivityIndicator accessibilityLabel="Memuat tampilan" color={COLORS.primaryPurple} />
  </View>;

  return (
    <View onLayout={handleContainerLayout} style={styles.container}>
      <StatusBar
        barStyle={isLightStatusBar ? 'light-content' : 'dark-content'}
        backgroundColor={isLightStatusBar ? COLORS.primaryPurple : COLORS.softLilacBg}
      />

      <View
        style={[
          styles.screenWrapper,
          showBottomNav && navHeight > 0 ? { paddingBottom: navHeight } : null,
        ]}
      >
        {renderContent()}
      </View>

      {showBottomNav && (
        <View
          onLayout={(event) => {
            const h = event.nativeEvent.layout.height;
            if (h > 0 && h !== navHeight) setNavHeight(h);
          }}
          style={[styles.fixedBottomNav, { bottom: -windowShrink }]}
        >
          <BottomNavBar activeTab={activeTab} onSelectTab={handleSelectTab} />
        </View>
      )}

      {/* Geofence Notification Pop-up */}
      <Modal visible={!!actionNotice} transparent animationType="fade" onRequestClose={() => setActionNotice(null)}>
        <View style={styles.noticeBackdrop}>
          <View style={styles.noticeCard} accessibilityViewIsModal>
            <Text accessibilityRole="header" style={styles.noticeTitle}>Itinerary belum tersedia</Text>
            <Text style={styles.noticeText}>{actionNotice}</Text>
            <Pressable accessibilityRole="button" onPress={() => setActionNotice(null)} style={styles.noticeButton}>
              <Text style={styles.noticeButtonText}>Tutup</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <PoiTriggerModal
        visible={Boolean(geofencePoi)}
        poi={geofencePoi}
        onSave={handleToggleSavePoi}
        onAddToItinerary={handleAddToItinerary}
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
  fontLoading: { flex: 1, backgroundColor: COLORS.softLilacBg, justifyContent: 'center' },
  noticeBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(20,10,40,0.45)' },
  noticeCard: { padding: 24, borderRadius: 22, backgroundColor: COLORS.softLilacBg, gap: 16 },
  noticeTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  noticeText: { color: COLORS.textPrimary, fontSize: 16, lineHeight: 24 },
  noticeButton: { backgroundColor: COLORS.darkPurple, borderRadius: 999, minHeight: 48, justifyContent: 'center', padding: 12 },
  noticeButtonText: { color: COLORS.white, textAlign: 'center', fontWeight: '600' },
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
  },
});
