const { adaptPois } = require('./adapter');
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000';
/** @param {{signal?:AbortSignal, fetchImpl?:typeof fetch, baseUrl?:string}} [options] */
async function fetchPois({ signal, fetchImpl = fetch, baseUrl = API_BASE_URL } = {}) {
  const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/api/pois`, { signal });
  if (!response.ok) throw new Error(`Gagal mengambil destinasi (${response.status}).`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Format data destinasi tidak valid.');
  const records = adaptPois(rows);
  if (records.length !== rows.length) throw new Error('Data destinasi memuat baris tidak valid atau ID duplikat.');
  return records;
}
module.exports = { fetchPois };
