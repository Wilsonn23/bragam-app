import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

export function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  return active;
}

// One foreground watcher shared by the GPS display and geofence controller.
export function useForegroundLocation(enabled) {
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const session = useMemo(() => ({ enabled, retry }), [enabled, retry]);
  useEffect(() => {
    let cancelled = false;
    let subscription;
    let latestTimestamp = -Infinity;
    let receivedFix = false;
    let settled = false;
    if (!enabled) return;
    const accept = fix => {
      if (cancelled || fix.timestamp <= latestTimestamp) return;
      latestTimestamp = fix.timestamp;
      receivedFix = true;
      settled = true;
      setResult({ session, sample: { ...fix.coords, timestamp: fix.timestamp }, error: null });
    };
    const fail = () => {
      if (cancelled) return;
      settled = true;
      setResult({ session, sample: null, error: 'Gagal membaca GPS. Pastikan layanan lokasi aktif, lalu coba lagi.' });
    };
    async function start() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (permission.status !== 'granted') {
          settled = true;
          setResult({ session, sample: null, error: 'Izin lokasi ditolak. Aktifkan izin lokasi BRAGAm di pengaturan, lalu coba lagi.' });
          return;
        }
        const services = await Location.hasServicesEnabledAsync();
        if (cancelled) return;
        if (!services) {
          settled = true;
          setResult({ session, sample: null, error: 'Layanan lokasi tidak aktif. Aktifkan GPS, lalu coba lagi.' });
          return;
        }
        // Watch first: a slow/failed initial read must not prevent live tracking.
        subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 1 }, accept, fail);
        if (cancelled) { subscription.remove(); return; }
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }).then(accept).catch(() => {
          // The watcher remains available to recover from an initial read failure.
          if (!receivedFix) fail();
        });
      } catch { fail(); }
    }
    start();
    const timeout = setTimeout(() => { if (!settled) fail(); }, 20000);
    return () => { cancelled = true; clearTimeout(timeout); subscription?.remove(); };
  }, [enabled, session]);
  const current = result?.session === session ? result : null;
  return { sample: enabled ? current?.sample : null, error: enabled ? current?.error : null,
    loading: enabled && !current, retry: () => setRetry(n => n + 1) };
}
