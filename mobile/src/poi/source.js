// A successful empty API result is authoritative; the snapshot is only for failures.
function poiLoadSuccess(pois) {
  return { pois, loading: false, error: null, source: 'api' };
}
function poiLoadFailure(offlinePois) {
  return { pois: offlinePois, loading: false,
    error: offlinePois.length ? null : 'Gagal memuat destinasi. Periksa koneksi dan coba lagi.', source: 'offline' };
}
module.exports = { poiLoadSuccess, poiLoadFailure };
