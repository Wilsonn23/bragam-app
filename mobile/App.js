import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
} from 'react-native';
import * as Location from 'expo-location';

// Sesuaikan IP/Port dengan server backend Anda
const API_BASE_URL = 'http://10.46.161.81:5000';

const TIME_OPTIONS = [
  { label: 'Semua Waktu', value: 'Semua' },
  { label: 'Pagi', value: 'pagi' },
  { label: 'Siang', value: 'siang' },
  { label: 'Malam', value: 'malam' },
];

const ENV_OPTIONS = [
  { label: 'Semua Area', value: 'Semua' },
  { label: 'Indoor', value: 'indoor' },
  { label: 'Outdoor', value: 'outdoor' },
  { label: 'Both (Indoor & Outdoor)', value: 'both' },
];

const RATING_OPTIONS = [
  { label: 'Semua Rating', value: '0' },
  { label: '1+ ★', value: '1' },
  { label: '2+ ★', value: '2' },
  { label: '3+ ★', value: '3' },
  { label: '4+ ★', value: '4' },
];

// Komponen Dropdown Reusable
function FilterDropdown({ title, options, selectedValue, onSelect }) {
  const [visible, setVisible] = useState(false);

  const activeOption = options.find((opt) => opt.value === selectedValue) || options[0];
  const isFiltered = selectedValue !== 'Semua' && selectedValue !== '0';

  return (
    <View style={styles.dropdownWrapper}>
      <Text style={styles.dropdownTitle}>{title}</Text>
      <TouchableOpacity
        style={[styles.dropdownBtn, isFiltered && styles.dropdownBtnActive]}
        onPress={() => setVisible(true)}
      >
        <Text
          style={[styles.dropdownBtnText, isFiltered && styles.dropdownBtnTextActive]}
          numberOfLines={1}
        >
          {activeOption.label}
        </Text>
        <Text style={[styles.dropdownArrow, isFiltered && styles.dropdownBtnTextActive]}>▼</Text>
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.dropdownMenu}>
            <Text style={styles.dropdownMenuHeader}>Pilih {title}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {options.map((opt) => {
                const isSelected = opt.value === selectedValue;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                    onPress={() => {
                      onSelect(opt.value);
                      setVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        isSelected && styles.dropdownItemTextSelected,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && <Text style={styles.checkIcon}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function App() {
  // =========================================================
  // BAGIAN 1: STATE & TRACKING GPS REAL-TIME (PB02 - INDEPENDEN)
  // =========================================================
  const [location, setLocation] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('Mencari sinyal GPS...');

  useEffect(() => {
    let subscription;

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setGpsStatus('Izin lokasi ditolak');
          return;
        }

        const initialLocation = await Location.getCurrentPositionAsync({});
        setLocation(initialLocation.coords);
        setGpsStatus('GPS Aktif');

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 5,
          },
          (newLocation) => {
            setLocation(newLocation.coords);
          }
        );
      } catch (error) {
        setGpsStatus('Gagal membaca GPS');
      }
    };

    startLocationTracking();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);

  // =========================================================
  // BAGIAN 2: STATE & PENCARIAN / FILTER POI (PB09 - INDEPENDEN)
  // =========================================================
  const [categoryOptions, setCategoryOptions] = useState([
    { label: 'Semua Kategori', value: 'Semua' },
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [selectedTime, setSelectedTime] = useState('Semua');
  const [selectedEnv, setSelectedEnv] = useState('Semua');
  const [selectedRating, setSelectedRating] = useState('0');

  const [pois, setPois] = useState([]);
  const [loadingPois, setLoadingPois] = useState(true);
  const [selectedPoi, setSelectedPoi] = useState(null);

  // Muat daftar kategori sekali saat awal
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/categories`)
      .then((res) => res.json())
      .then((json) => {
        if (json.categories && json.categories.length > 0) {
          const mapped = json.categories.map((cat) => ({
            label: cat === 'Semua' ? 'Semua Kategori' : cat,
            value: cat,
          }));
          setCategoryOptions(mapped);
        }
      })
      .catch((err) => console.error('Gagal memuat kategori:', err));
  }, []);

  // Fetch POI HANYA dipicu oleh perubahan searchQuery atau 4 dropdown (tidak terhubung ke GPS)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPois();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, selectedTime, selectedEnv, selectedRating]);

  const fetchPois = async () => {
    setLoadingPois(true);
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        category: selectedCategory,
        time_category: selectedTime,
        environment: selectedEnv,
        min_rating: selectedRating,
      });

      const response = await fetch(`${API_BASE_URL}/api/pois/search?${params.toString()}`);
      const json = await response.json();
      setPois(json.data || []);
    } catch (error) {
      console.error('Gagal fetch POI:', error);
    } finally {
      setLoadingPois(false);
    }
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedCategory !== 'Semua' ||
    selectedTime !== 'Semua' ||
    selectedEnv !== 'Semua' ||
    selectedRating !== '0';

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Semua');
    setSelectedTime('Semua');
    setSelectedEnv('Semua');
    setSelectedRating('0');
  };

  const formatRupiah = (num) => {
    if (!num || num === 0) return 'Gratis';
    return `Rp${num.toLocaleString('id-ID')}`;
  };

  const renderPoiItem = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => setSelectedPoi(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.badge}>{item.category}</Text>
      </View>

      {item.description ? (
        <Text style={styles.cardDesc} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}

      <View style={styles.tagRow}>
        {item.environment ? (
          <Text style={styles.miniTag}>🏠 {item.environment}</Text>
        ) : null}
        {item.time_category ? (
          <Text style={styles.miniTag}>🕒 {item.time_category}</Text>
        ) : null}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.metaText}>
          ⭐ {item.rating} ({item.reviews_count} ulasan)
        </Text>
        <Text style={styles.hoursText}>{item.opening_hours}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header + Status GPS (PB02) */}
      <View style={styles.header}>
        <Text style={styles.appTitle}>BRAGAm Explorer</Text>
        <Text style={styles.gpsBadge}>
          {location
            ? `📍 GPS: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`
            : `⚠️ ${gpsStatus}`}
        </Text>
      </View>

      {/* Search Bar (PB09) */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cari nama destinasi, menu, atau sejarah..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => setSearchQuery('')}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Grid 2x2 Dropdown Filter (PB09) */}
      <View style={styles.filterGrid}>
        <View style={styles.filterRow}>
          <FilterDropdown
            title="Kategori"
            options={categoryOptions}
            selectedValue={selectedCategory}
            onSelect={setSelectedCategory}
          />
          <FilterDropdown
            title="Waktu (Time)"
            options={TIME_OPTIONS}
            selectedValue={selectedTime}
            onSelect={setSelectedTime}
          />
        </View>
        <View style={styles.filterRow}>
          <FilterDropdown
            title="Area (Environment)"
            options={ENV_OPTIONS}
            selectedValue={selectedEnv}
            onSelect={setSelectedEnv}
          />
          <FilterDropdown
            title="Rating"
            options={RATING_OPTIONS}
            selectedValue={selectedRating}
            onSelect={setSelectedRating}
          />
        </View>
      </View>

      {/* Bar Info Jumlah Hasil & Tombol Reset */}
      <View style={styles.resultBar}>
        <Text style={styles.resultCountText}>Menampilkan {pois.length} destinasi</Text>
        {hasActiveFilters && (
          <TouchableOpacity onPress={resetAllFilters}>
            <Text style={styles.resetText}>Reset Filter</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Daftar Hasil Pencarian */}
      {loadingPois ? (
        <ActivityIndicator size="large" color="#1E3A8A" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={pois}
          keyExtractor={(item) => item.id}
          renderItem={renderPoiItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Tidak ada destinasi yang sesuai dengan kombinasi filter.
            </Text>
          }
        />
      )}

      {/* Modal Detail Destinasi */}
      <Modal visible={!!selectedPoi} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            {selectedPoi && (
              <ScrollView>
                <Text style={styles.badge}>{selectedPoi.category}</Text>
                <Text style={styles.modalTitle}>{selectedPoi.name}</Text>

                <Text style={styles.modalMeta}>
                  ⭐ {selectedPoi.rating} ({selectedPoi.reviews_count} ulasan) • ⏱️ ±
                  {selectedPoi.avg_duration_minutes} menit
                </Text>
                <Text style={styles.modalMeta}>
                  🕒 Jam Buka: {selectedPoi.opening_hours} ({selectedPoi.time_category})
                </Text>
                <Text style={styles.modalMeta}>
                  🏠 Area: {selectedPoi.environment} • 💰 {formatRupiah(selectedPoi.price_min)} –{' '}
                  {formatRupiah(selectedPoi.price_max)}
                </Text>

                {selectedPoi.description ? (
                  <>
                    <Text style={styles.sectionLabel}>Deskripsi</Text>
                    <Text style={styles.modalBody}>{selectedPoi.description}</Text>
                  </>
                ) : null}

                {selectedPoi.history ? (
                  <>
                    <Text style={styles.sectionLabel}>Sejarah Singkat</Text>
                    <Text style={styles.modalBody}>{selectedPoi.history}</Text>
                  </>
                ) : null}

                {selectedPoi.menu_highlights ? (
                  <>
                    <Text style={styles.sectionLabel}>Highlight Menu / Aktivitas</Text>
                    <Text style={styles.modalBody}>{selectedPoi.menu_highlights}</Text>
                  </>
                ) : null}

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setSelectedPoi(null)}
                >
                  <Text style={styles.closeBtnText}>Tutup Detail</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: 35 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  appTitle: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
  gpsBadge: { fontSize: 12, color: '#475569', marginTop: 2 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 14, color: '#0F172A' },
  clearBtn: { padding: 6 },
  clearBtnText: { fontSize: 14, color: '#64748B', fontWeight: 'bold' },

  filterGrid: { paddingHorizontal: 16, marginBottom: 6 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  dropdownWrapper: { flex: 1 },
  dropdownTitle: { fontSize: 11, fontWeight: '600', color: '#475569', marginBottom: 3 },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  dropdownBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E3A8A',
  },
  dropdownBtnText: { fontSize: 12, color: '#1E293B', fontWeight: '600', flex: 1, marginRight: 4 },
  dropdownBtnTextActive: { color: '#1E3A8A', fontWeight: '700' },
  dropdownArrow: { fontSize: 10, color: '#64748B' },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 5,
  },
  dropdownMenuHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 4,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  dropdownItemSelected: { backgroundColor: '#EFF6FF' },
  dropdownItemText: { fontSize: 14, color: '#334155' },
  dropdownItemTextSelected: { color: '#1E3A8A', fontWeight: '700' },
  checkIcon: { fontSize: 14, color: '#1E3A8A', fontWeight: 'bold' },

  resultBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultCountText: { fontSize: 12, color: '#64748B' },
  resetText: { fontSize: 12, color: '#DC2626', fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#0F172A', flex: 1 },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E3A8A',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  cardDesc: { fontSize: 13, color: '#475569', marginTop: 6, lineHeight: 18 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  miniTag: {
    fontSize: 11,
    color: '#334155',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  metaText: { fontSize: 11, color: '#64748B' },
  hoursText: { fontSize: 11, fontWeight: '600', color: '#334155' },
  emptyText: { textAlign: 'center', color: '#64748B', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginTop: 8, marginBottom: 4 },
  modalMeta: { fontSize: 13, color: '#334155', marginTop: 3 },
  sectionLabel: { fontSize: 13, fontWeight: 'bold', color: '#0F172A', marginTop: 12, marginBottom: 3 },
  modalBody: { fontSize: 13, color: '#475569', lineHeight: 19 },
  closeBtn: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  closeBtnText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
});