import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, StatusBar, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomNavBar from './src/components/BottomNavBar';
import PoiTriggerModal from './src/components/PoiTriggerModal';
import AddToTripModal from './src/components/AddToTripModal';
import HomeScreen from './src/screens/HomeScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import TripScreen from './src/screens/TripScreen';
import TripSettingScreen from './src/screens/TripSettingScreen';
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
import {
  fetchUserBookmarks,
  toggleUserBookmark,
  fetchUserTrips,
  saveUserTripPlan,
  appendStopToExistingTrip,
  deleteUserTripPlan,
} from './src/services/userDataService';
import { applyRatingOverrides } from './src/poi/ratings';

function MainApp() {
  const [currentUser, setCurrentUser] = useState(null);
  const { pois, loading, error } = usePois();
  // Fresh ratings fetched on the detail Review tab. Applied only to what screens display;
  // the geofence keeps the original `pois` so its visit/cooldown state is never reset.
  const [ratingOverrides, setRatingOverrides] = useState({});
  const displayPois = useMemo(() => applyRatingOverrides(pois, ratingOverrides), [pois, ratingOverrides]);
  const handleRatingChange = (poiId, next) => {
    setRatingOverrides((prev) => {
      const current = prev[poiId];
      if (current && current.rating === next.rating && current.reviewsCount === next.reviewsCount) return prev;
      return { ...prev, [poiId]: next };
    });
  };
  const active = useAppActive();
  const gps = useForegroundLocation(active);
  const { event, dismiss } = usePoiTriggers(pois, gps.sample, active);
  const [activeTab, setActiveTab] = useState('Home');

  // Sub-screens state: null | 'PoiDetail' | 'Navigation' | 'TripSummary' | 'TripSetting' | 'Bookmark'
  const [subScreen, setSubScreen] = useState(null);
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [selectedTrip, setSelectedTrip] = useState(null);

  // State khusus Itinerary Builder & Navigasi Berantai (dimuat dari Supabase)
  const [tripPlans, setTripPlans] = useState([]);
  const [editingTrip, setEditingTrip] = useState(null);
  const [activeTripChain, setActiveTripChain] = useState(null);

  // State daftar POI yang disimpan ke Bookmark (dimuat dari Supabase)
  const [bookmarkedPois, setBookmarkedPois] = useState([]);

  // State POI yang sedang akan ditambahkan ke Trip melalui AddToTripModal
  const [poiToAddTrip, setPoiToAddTrip] = useState(null);

  // State khusus Geofence Trigger Notification
  const [geofencePoi, setGeofencePoi] = useState(null);

  // Hitung penyusutan tinggi window saat keyboard muncul
  const [fullHeight, setFullHeight] = useState(0);
  const [currentHeight, setCurrentHeight] = useState(0);

  // Muat data Bookmark & Trip user dari Supabase saat login / dataset POI siap
  useEffect(() => {
    let isMounted = true;
    const userId = currentUser?.id;

    if (!userId || !Array.isArray(pois) || pois.length === 0) {
      if (!userId) {
        setTripPlans([]);
        setBookmarkedPois([]);
      }
      return;
    }

    Promise.all([
      fetchUserBookmarks(userId, pois),
      fetchUserTrips(userId, pois),
    ])
      .then(([loadedBookmarks, loadedTrips]) => {
        if (!isMounted) return;
        setBookmarkedPois(loadedBookmarks);
        setTripPlans(loadedTrips);
      })
      .catch((err) => {
        console.warn('Gagal memuat data user dari Supabase:', err?.message || err);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, pois]);

  const isPoiBookmarked = (targetPoi) => {
    if (!targetPoi) return false;
    return bookmarkedPois.some(
      (item) =>
        (targetPoi.id && String(item.id) === String(targetPoi.id)) ||
        item.name?.toLowerCase() === targetPoi.name?.toLowerCase()
    );
  };

  const handleToggleSavePoi = async (targetPoi) => {
    if (!targetPoi || !currentUser?.id) return;
    const alreadySaved = isPoiBookmarked(targetPoi);

    // Optimistic UI update
    setBookmarkedPois((prev) => {
      if (alreadySaved) {
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

    try {
      await toggleUserBookmark(currentUser.id, targetPoi.id, alreadySaved);
    } catch (err) {
      Alert.alert(
        'Gagal Menyimpan Bookmark',
        err?.message || 'Tidak dapat menyimpan bookmark ke database.'
      );
    }
  };

  const handleRemoveBookmark = async (targetPoi) => {
    if (!targetPoi || !currentUser?.id) return;

    setBookmarkedPois((prev) =>
      prev.filter(
        (item) =>
          !(
            (targetPoi.id && String(item.id) === String(targetPoi.id)) ||
            item.name?.toLowerCase() === targetPoi.name?.toLowerCase()
          )
      )
    );

    try {
      await toggleUserBookmark(currentUser.id, targetPoi.id, true);
    } catch (err) {
      Alert.alert(
        'Gagal Menghapus Bookmark',
        err?.message || 'Tidak dapat menghapus bookmark dari database.'
      );
    }
  };

  // Buka pop-up pilih Trip atau Membuat Trip Baru dari halaman mana pun
  const handleAddToItinerary = (targetPoi) => {
    if (!targetPoi) return;
    setPoiToAddTrip(targetPoi);
  };

  const handleConfirmAddStopToExistingTrip = async (tripId, newStop, tripTitle) => {
    const targetTrip = tripPlans.find((p) => p.id === tripId);
    const currentCount = targetTrip?.stops?.length || 0;

    setTripPlans((prev) =>
      prev.map((plan) => {
        if (plan.id !== tripId) return plan;
        return {
          ...plan,
          stops: [...(plan.stops || []), newStop],
        };
      })
    );

    try {
      await appendStopToExistingTrip(currentUser.id,tripId, newStop, currentCount);
      Alert.alert(
        'Ditambahkan ke Trip',
        `${newStop.name} berhasil ditambahkan ke "${tripTitle}".`
      );
    } catch (err) {
      Alert.alert(
        'Gagal Menyimpan Destinasi',
        err?.message || 'Tidak dapat menyimpan destinasi ke database.'
      );
    }
  };

  const handleConfirmCreateNewTripWithPoi = async (createdPlan) => {
    if (!currentUser?.id) return;
    try {
      const savedPlan = await saveUserTripPlan(currentUser.id, createdPlan);
      setTripPlans((prev) => [savedPlan, ...prev]);
      Alert.alert(
        'Trip Baru Dibuat',
        `"${savedPlan.title}" berhasil dibuat dengan destinasi ${savedPlan.stops[0]?.name}.`
      );
    } catch (err) {
      Alert.alert(
        'Gagal Membuat Trip',
        err?.message || 'Tidak dapat menyimpan Trip baru ke database.'
      );
    }
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
    const byId = displayPois.find((item) => item.id === poi?.id);
    const byName = displayPois.filter(
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

  // Navigasi tunggal ke 1 POI
  const handleOpenDirections = (poi) => {
    setActiveTripChain(null);
    setSelectedPoi(poi);
    setActiveTab('Explore');
    setSubScreen('Navigation');
  };

  const handleOpenBookmarks = () => {
    setSubScreen('Bookmark');
  };

  // Tombol "Pakai" pada card Trip -> Mulai navigasi berantai (GPS -> POI 1 -> POI 2 -> ...)
  const handleUseTrip = (trip) => {
    if (!trip?.stops || trip.stops.length === 0) {
      Alert.alert('Rencana Kosong', 'Rencana perjalanan ini belum memiliki destinasi.');
      return;
    }
    setSelectedTrip(trip);
    setActiveTripChain(trip.stops);
    setSelectedPoi(trip.stops[0]);
    setActiveTab('Explore');
    setSubScreen('Navigation');
  };

  // Tombol "Edit" pada card Trip -> Buka Setting Trip dengan data trip terpilih
  const handleEditTrip = (trip) => {
    setEditingTrip(trip);
    setSubScreen('TripSetting');
  };

  // Tombol "Buat Rencana" -> Buka Setting Trip dari nol
  const handleCreateTrip = () => {
    setEditingTrip(null);
    setSubScreen('TripSetting');
  };

  // Simpan hasil Buat Rencana Baru atau Edit Trip ke Supabase
  const handleSaveTripPlan = async (savedPlan) => {
    if (!currentUser?.id) return;
    try {
      const persistedPlan = await saveUserTripPlan(currentUser.id, savedPlan);
      setTripPlans((prev) => {
        const exists = prev.some((p) => p.id === persistedPlan.id);
        if (exists) {
          return prev.map((p) => (p.id === persistedPlan.id ? persistedPlan : p));
        }
        return [persistedPlan, ...prev];
      });
      setEditingTrip(null);
      setSubScreen(null);
    } catch (err) {
      Alert.alert(
        'Gagal Menyimpan Trip',
        err?.message || 'Tidak dapat menyimpan perubahan Trip ke database.'
      );
    }
  };

  // Simpan rute multi-POI dari NavigationScreen sebagai Trip baru ke Supabase
  const handleSaveNavigationAsTrip = async (newPlan) => {
    if (!currentUser?.id) return;
    try {
      const persistedPlan = await saveUserTripPlan(currentUser.id, newPlan);
      setTripPlans((prev) => [persistedPlan, ...prev]);
    } catch (err) {
      Alert.alert(
        'Gagal Menyimpan Trip',
        err?.message || 'Tidak dapat menyimpan Trip baru ke database.'
      );
    }
  };

  // Hapus Trip Plan setelah konfirmasi "Ya"
  const handleDeleteTripPlan = async (planId) => {
    if (!currentUser?.id) return;
    setTripPlans((prev) => prev.filter((p) => p.id !== planId));
    try {
      await deleteUserTripPlan(currentUser.id, planId);
    } catch (err) {
      Alert.alert(
        'Gagal Menghapus Trip',
        err?.message || 'Tidak dapat menghapus Trip dari database.'
      );
    }
  };

  const handleSelectTab = (tab) => {
    setActiveTripChain(null);
    setEditingTrip(null);
    setSubScreen(null);
    setActiveTab(tab);
  };

  const userLiveCoord =
    Number.isFinite(Number(gps?.sample?.latitude)) &&
    Number.isFinite(Number(gps?.sample?.longitude))
      ? {
          latitude: Number(gps.sample.latitude),
          longitude: Number(gps.sample.longitude),
        }
      : null;

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
          currentUser={currentUser}
          onRatingChange={handleRatingChange}
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

    if (subScreen === 'TripSetting') {
      return (
        <TripSettingScreen
          initialPlan={editingTrip}
          pois={displayPois}
          existingCount={tripPlans.length}
          onSavePlan={handleSaveTripPlan}
          onBack={() => {
            setEditingTrip(null);
            setSubScreen(null);
          }}
        />
      );
    }

    if (subScreen === 'Navigation') {
      return (
        <NavigationScreen
          key={
            activeTripChain
              ? `trip-${selectedTrip?.id}`
              : selectedPoi?.id || selectedPoi?.name
          }
          poi={selectedPoi}
          pois={displayPois}
          tripStops={activeTripChain}
          existingTripCount={tripPlans.length}
          onSaveAsTrip={handleSaveNavigationAsTrip}
          onBack={() => {
            setActiveTripChain(null);
            setSubScreen(null);
          }}
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
            user={currentUser}
            pois={displayPois}
            tripPlans={tripPlans}
            bookmarkedPois={bookmarkedPois}
            onOpenDetail={handleOpenDetail}
            onOpenDirections={handleOpenDirections}
            onOpenBookmarks={handleOpenBookmarks}
            onToggleSave={handleToggleSavePoi}
            onAddToItinerary={handleAddToItinerary}
            onUseTrip={handleUseTrip}
            onEditTrip={handleEditTrip}
            onCreateTrip={handleCreateTrip}
          />
        );
      case 'Explore':
        return (
          <ExploreScreen
            windowShrink={windowShrink}
            pois={displayPois}
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
        return (
          <TripScreen
            plans={tripPlans}
            pois={displayPois}
            onUseTrip={handleUseTrip}
            onEditTrip={handleEditTrip}
            onCreateTrip={handleCreateTrip}
            onDeleteTrip={handleDeleteTripPlan}
          />
        );
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
            user={currentUser}
            pois={displayPois}
            tripPlans={tripPlans}
            bookmarkedPois={bookmarkedPois}
            onOpenDetail={handleOpenDetail}
            onOpenDirections={handleOpenDirections}
            onOpenBookmarks={handleOpenBookmarks}
            onToggleSave={handleToggleSavePoi}
            onAddToItinerary={handleAddToItinerary}
            onUseTrip={handleUseTrip}
            onEditTrip={handleEditTrip}
            onCreateTrip={handleCreateTrip}
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

  const showBottomNav = subScreen !== 'PoiDetail' && subScreen !== 'TripSetting';
  const isLightStatusBar =
    subScreen === null && (activeTab === 'Home' || activeTab === 'Account');

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  return (
    <View onLayout={handleContainerLayout} style={styles.container}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle={isLightStatusBar ? 'light-content' : 'dark-content'}
      />

      {/* Konten halaman otomatis mengisi ruang tepat di atas BottomNavBar */}
      <View style={styles.screenWrapper}>
        {renderContent()}
      </View>

      {/* Navbar berada dalam aliran flex normal (tidak menimpa konten layar) */}
      {showBottomNav && (
        <BottomNavBar activeTab={activeTab} onSelectTab={handleSelectTab} />
      )}

      {/* Pop-up Pilih Trip / Membuat Trip Baru saat Add to Itinerary ditekan */}
      <AddToTripModal
        visible={Boolean(poiToAddTrip)}
        poi={poiToAddTrip}
        tripPlans={tripPlans}
        allPois={pois}
        userCoord={userLiveCoord}
        onClose={() => setPoiToAddTrip(null)}
        onSelectExistingTrip={handleConfirmAddStopToExistingTrip}
        onCreateNewTrip={handleConfirmCreateNewTripWithPoi}
      />

      {/* Geofence Notification Pop-up */}
      <PoiTriggerModal
        visible={Boolean(visiblePoi)}
        poi={visiblePoi}
        onClose={closePoi}
        onSave={undefined}
        onAddToItinerary={handleAddToItinerary}
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
    backgroundColor: COLORS.softLilacBg,
  },
  screenWrapper: {
    flex: 1,
  },
});