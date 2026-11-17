const { adaptRecommendations } = require('./model');

/** App-owned, in-memory session: keeps results, controls and scroll on detail/back. */
function createRecommendationStore(service) {
  let state = { status: 'idle', items: [], capabilities: { openAtNight: false },
    source: 'service', error: null };
  let generation = 0;
  let controller;
  let scrollOffset = 0;
  const listeners = new Set();
  const publish = (update) => { state = { ...state, ...update }; listeners.forEach((fn) => fn()); };
  return {
    getSnapshot: () => state,
    getScrollOffset: () => scrollOffset,
    setScrollOffset: (value) => { scrollOffset = Math.max(0, value); },
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    async load({ location = null, source = state.source, demoLoader = undefined } = {}) {
      const current = ++generation;
      controller?.abort();
      controller = new AbortController();
      publish({ status: 'loading', source, error: null, items: [], capabilities: { openAtNight: false } });
      try {
        const payload = source === 'service'
          ? await service({ location, signal: controller.signal })
          : await demoLoader(source, controller.signal);
        const result = adaptRecommendations(payload);
        if (current === generation) publish({ ...result, status: 'success' });
      } catch (error) {
        if (current === generation) publish({ items: [], status: error?.code === 'UNAVAILABLE'
          ? 'unavailable' : 'error', error: error?.code || 'REQUEST_FAILED' });
      }
    },
    cancel() { generation += 1; controller?.abort(); if (state.status === 'loading') publish({ status: 'idle' }); },
    reset() {
      generation += 1; controller?.abort(); scrollOffset = 0;
      publish({ status: 'idle', items: [], capabilities: { openAtNight: false }, source: 'service', error: null });
    },
  };
}

module.exports = { createRecommendationStore };
