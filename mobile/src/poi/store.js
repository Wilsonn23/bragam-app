const { fetchPois } = require('./api');
// Request ownership lives outside screen lifecycles; no refetch on GPS updates/navigation.
function createPoiStore(loader = fetchPois) {
  let snapshot = { records: [], status: 'loading', error: null };
  const listeners = new Set();
  let request = null;
  let deadline = null;
  const publish = value => { snapshot = value; listeners.forEach(listener => listener()); };
  return {
    getSnapshot: () => snapshot,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    async load() {
      request?.abort();
      clearTimeout(deadline);
      const owned = new AbortController(); request = owned;
      publish({ records: [], status: 'loading', error: null });
      const timeout = setTimeout(() => {
        if (request !== owned) return;
        owned.abort();
        publish({ records: [], status: 'error', error: 'Waktu memuat destinasi habis. Coba lagi.' });
      }, 20000);
      deadline = timeout;
      try {
        const records = await loader({ signal: owned.signal });
        if (request !== owned || owned.signal.aborted) return;
        publish({ records, status: records.length ? 'ready' : 'empty', error: null });
      } catch (error) {
        if (request !== owned || owned.signal.aborted) return;
        publish({ records: [], status: 'error', error: error instanceof Error ? error.message : 'Gagal memuat destinasi.' });
      } finally { clearTimeout(timeout); }
    },
    dispose() { request?.abort(); clearTimeout(deadline); request = null; },
  };
}
module.exports = { createPoiStore };
