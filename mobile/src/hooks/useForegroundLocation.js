import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { startForegroundTracking } from '../location/tracking';

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
    if (!enabled) return;
    const tracking = startForegroundTracking(Location,
      sample => setResult({ session, sample, error: null }),
      error => setResult({ session, sample: null, error }));
    return () => tracking.stop();
  }, [enabled, session]);
  const current = result?.session === session ? result : null;
  return { sample: enabled ? current?.sample : null, error: enabled ? current?.error : null,
    loading: enabled && !current, retry: () => setRetry(n => n + 1) };
}
