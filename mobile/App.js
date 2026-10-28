import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';

export default function App() {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let subscription;

    const startLocationTracking = async () => {
      try {
        // 1. Minta Izin Akses Lokasi
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Izin akses lokasi ditolak. Aktifkan izin lokasi untuk menggunakan BRAGAm.');
          setLoading(false);
          return;
        }

        // 2. Baca Posisi Awal
        let initialLocation = await Location.getCurrentPositionAsync({});
        setLocation(initialLocation.coords);
        setLoading(false);

        // 3. Pantau Perubahan Lokasi secara Real-time (GPS Live Tracking)
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000, // Update setiap 2 detik
            distanceInterval: 1, // Update setiap berpindah 1 meter
          },
          (newLocation) => {
            setLocation(newLocation.coords);
          }
        );
      } catch (error) {
        setErrorMsg('Gagal membaca sinyal GPS.');
        setLoading(false);
      }
    };

    startLocationTracking();

    // Cleanup listener saat komponen di-unmount
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BRAGAm - GPS Tracker</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : errorMsg ? (
        <Text style={styles.errorText}>{errorMsg}</Text>
      ) : location ? (
        <View style={styles.locationBox}>
          <Text style={styles.label}>Latitude: {location.latitude}</Text>
          <Text style={styles.label}>Longitude: {location.longitude}</Text>
          <Text style={styles.label}>Akurasi: ±{location.accuracy?.toFixed(1)} meter</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  locationBox: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
});