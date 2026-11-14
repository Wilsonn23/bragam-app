// Foreground lifecycle adapter, dependency-injected so permissions and async cleanup are testable.
function startForegroundTracking(location, onSample, onError) {
  let stopped = false;
  let subscription;
  let latestTimestamp = -Infinity;
  let receivedFix = false;
  let settled = false;
  const fail = (message = 'Gagal membaca GPS. Pastikan layanan lokasi aktif, lalu coba lagi.') => {
    if (stopped) return;
    settled = true; onError(message);
  };
  const accept = fix => {
    if (stopped || !fix || !fix.coords || !Number.isFinite(fix.timestamp) || fix.timestamp <= latestTimestamp) return;
    latestTimestamp = fix.timestamp; receivedFix = true; settled = true;
    onSample({ ...fix.coords, timestamp: fix.timestamp });
  };
  const ready = (async () => {
    try {
      const permission = await location.requestForegroundPermissionsAsync();
      if (stopped) return;
      if (permission.status !== 'granted') { fail('Izin lokasi ditolak. Aktifkan izin lokasi BRAGAm di pengaturan, lalu coba lagi.'); return; }
      const services = await location.hasServicesEnabledAsync();
      if (stopped) return;
      if (!services) { fail('Layanan lokasi tidak aktif. Aktifkan GPS, lalu coba lagi.'); return; }
      subscription = await location.watchPositionAsync({ accuracy: location.Accuracy.High, timeInterval: 2000, distanceInterval: 1 }, accept, () => fail());
      if (stopped) { subscription.remove(); return; }
      location.getCurrentPositionAsync({ accuracy: location.Accuracy.High }).then(accept).catch(() => { if (!receivedFix) fail(); });
    } catch { fail(); }
  })();
  const timeout = setTimeout(() => { if (!settled) fail(); }, 20000);
  return { ready, stop() { stopped = true; clearTimeout(timeout); subscription?.remove(); } };
}
module.exports = { startForegroundTracking };
