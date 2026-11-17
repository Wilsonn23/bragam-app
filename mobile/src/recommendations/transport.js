/** Same backend only. Endpoint is supplied by the recommendation owner; no catalogue fallback. */
function createRecommendationService({ baseUrl, path, request = fetch, timeoutMs = 12000 }) {
  return async ({ location = null, signal = undefined } = {}) => {
    if (!path) throw Object.assign(new Error('UNAVAILABLE'), { code: 'UNAVAILABLE' });
    if (!/^\/api\/[\w/-]+$/.test(path)) throw new Error('INVALID_RECOMMENDATION_PATH');
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(cancel, timeoutMs);
    try {
      const query = location ? `?${new URLSearchParams({ latitude: String(location.latitude),
        longitude: String(location.longitude) })}` : '';
      const response = await request(`${baseUrl}${path}${query}`, { signal: controller.signal });
      if (!response.ok) throw new Error('RECOMMENDATION_REQUEST_FAILED');
      return await response.json();
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    }
  };
}
module.exports = { createRecommendationService };
