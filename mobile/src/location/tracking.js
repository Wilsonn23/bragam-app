// Foreground lifecycle adapter, dependency-injected so permissions and async cleanup are testable.
function startForegroundTracking(location, onSample, onError) {
  let stopped = false;
  let subscription;
  let latestTimestamp = -Infinity;
  let receivedFix = false;
  let settled = false;
  let timeout;
  const fail = (message = 'Gagal membaca GPS. Pastikan layanan lokasi aktif, lalu coba lagi.') => {
    if (stopped) return;
    clearTimeout(timeout);
    settled = true; onError(message);
  };
  const accept = fix => {
    if (stopped || !fix || !fix.coords || !Number.isFinite(fix.timestamp) || fix.timestamp <= latestTimestamp) return;
    clearTimeout(timeout);
    latestTimestamp = fix.timestamp; receivedFix = true; settled = true;
    onSample({ ...fix.coords, timestamp: fix.timestamp });
  };
  const ready = (async () => {
    try {
      const permission = await location.requestForegroundPermissionsAsync();
      if (stopped) return;
      if (permission.status !== 'granted') { fail('Izin lokasi ditolak. Aktifkan izin lokasi BRAGAm di pengaturan, lalu coba lagi.'); return; }
      // Let Android resolve device settings through its native location prompt.
      // An early services check prevents that recovery when location is disabled.
      subscription = await location.watchPositionAsync({ accuracy: location.Accuracy.High, timeInterval: 2000, distanceInterval: 1,
        mayShowUserSettingsDialog: true }, accept, () => fail());
      if (stopped) { subscription.remove(); return; }
      // Permission/settings dialogs can take any length of time. Only time out
      // waiting for a fix after the native subscription is actually ready.
      if (!settled) timeout = setTimeout(() => fail(), 20000);
      location.getCurrentPositionAsync({ accuracy: location.Accuracy.High }).then(accept).catch(() => { if (!receivedFix) fail(); });
    } catch (error) {
      fail(error?.code === 'ERR_LOCATION_SETTINGS_UNSATISFIED'
        ? 'Lokasi perangkat belum diaktifkan. Izinkan permintaan lokasi Android, lalu coba lagi.'
        : undefined);
    }
  })();
  return { ready, stop() { stopped = true; clearTimeout(timeout); subscription?.remove(); } };
}
module.exports = { startForegroundTracking };
