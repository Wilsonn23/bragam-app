const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_FILTERS, adaptRecommendations, reviewedRating, distanceLabel, filterRecommendations,
  locationForRecommendations, poiForDetail } = require('../src/recommendations/model');
const { createRecommendationStore } = require('../src/recommendations/store');
const { createRecommendationService } = require('../src/recommendations/transport');

const payload = { items: [
  { poi: { id: 'P03', name: 'Sweet Cantina', category: 'Dessert', rating: 4.5, reviews_count: 12,
    latitude: -6.91685, longitude: 107.60895, openAtNight: true }, reason: 'Dessert malam' },
  { poi: { id: 'P01', name: 'Maison Bogerijen', category: 'Restoran', rating: 4.8, reviews_count: 14,
    openAtNight: false } },
  { poi: { id: 'P04', name: 'Canary', category: 'Bakery', rating: 0, reviews_count: 0 } },
], capabilities: { openAtNight: true } };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject }; };

test('ordered recommendations keep stable IDs, reasons and POI metadata through detail handoff', () => {
  const result = adaptRecommendations(payload);
  assert.deepEqual(result.items.map(({ poi }) => poi.id), ['P03', 'P01', 'P04']);
  const detail = poiForDetail(result.items[0], { latitude: -6.91685, longitude: 107.60895 });
  assert.equal(detail.id, 'P03');
  assert.equal(detail.name, 'Sweet Cantina');
  assert.equal(detail.distance, '0 m');
  assert.equal(detail.reviews_count, 12);
  assert.equal(result.items[0].reason, 'Dessert malam');
  assert.notEqual(detail, payload.items[0].poi);
});

test('a catalogue, duplicate ID, missing ID or malformed recommendation is rejected', () => {
  for (const bad of [[], { data: payload.items }, { items: [{ poi: { name: 'Missing ID' } }] },
    { items: [payload.items[0], payload.items[0]] }, { items: [null] }]) {
    assert.throws(() => adaptRecommendations(bad), /INVALID_RECOMMENDATIONS/);
  }
  assert.deepEqual(adaptRecommendations({ items: [] }).items, []);
});

test('search/category/night/reviewed-rating filters preserve service ordering and clear immediately', () => {
  const { items } = adaptRecommendations(payload);
  assert.deepEqual(filterRecommendations(items, { ...DEFAULT_FILTERS, query: '  CANTINA ' }).map(x => x.poi.id), ['P03']);
  assert.deepEqual(filterRecommendations(items, { ...DEFAULT_FILTERS, category: 'Bakery' }).map(x => x.poi.id), ['P04']);
  assert.deepEqual(filterRecommendations(items, { ...DEFAULT_FILTERS, openAtNight: true }).map(x => x.poi.id), ['P03']);
  assert.deepEqual(filterRecommendations(items, { ...DEFAULT_FILTERS, minRating: 4.5 }).map(x => x.poi.id), ['P03', 'P01']);
  assert.equal(filterRecommendations(items, { ...DEFAULT_FILTERS, query: 'museum' }).length, 0);
  assert.deepEqual(filterRecommendations(items, DEFAULT_FILTERS), items);
  // Free-form hours/time text does not establish an agreed night capability.
  assert.equal(filterRecommendations([{ poi: { opening_hours: '09:00 - 23:00' } }],
    { ...DEFAULT_FILTERS, openAtNight: true }).length, 0);
});

test('missing photos/rating/reviews/location remain unknown, never example values', () => {
  assert.equal(reviewedRating({ rating: 5 }), null);
  assert.equal(reviewedRating({ rating: 0, reviews_count: 0 }), null);
  assert.equal(reviewedRating({ rating: 9, reviews_count: 2 }), null);
  assert.equal(distanceLabel(payload.items[0].poi, null), 'Jarak belum tersedia');
  assert.equal(distanceLabel({}, { latitude: 0, longitude: 0 }), 'Jarak belum tersedia');
  assert.equal(poiForDetail(payload.items[2], null).rating, null);
  assert.equal(poiForDetail(payload.items[2], null).imageUrl, undefined);
});

test('location context excludes inaccurate, expired, future and invalid device samples', () => {
  const sample = { latitude: -6.917, longitude: 107.609, accuracy: 10, timestamp: 10000 };
  assert.deepEqual(locationForRecommendations(sample, 12000), { latitude: -6.917, longitude: 107.609 });
  for (const bad of [null, { ...sample, timestamp: 0 }, { ...sample, accuracy: 80 },
    { ...sample, latitude: 100 }, { ...sample, timestamp: 40000 }]) {
    assert.equal(locationForRecommendations(bad, 20000), null);
  }
});

test('session exposes loading, errors, retry, empty results and unavailable service', async () => {
  let count = 0;
  const store = createRecommendationStore(async () => {
    if (count++ === 0) throw new Error('OFFLINE');
    return { items: [] };
  });
  const changes = [];
  const unsubscribe = store.subscribe(() => changes.push(store.getSnapshot().status));
  await store.load();
  assert.equal(store.getSnapshot().status, 'error');
  await store.load();
  assert.deepEqual(changes, ['loading', 'error', 'loading', 'success']);
  assert.deepEqual(store.getSnapshot().items, []);
  unsubscribe();
  const unavailable = createRecommendationStore(createRecommendationService({ baseUrl: 'http://example.test' }));
  await unavailable.load();
  assert.equal(unavailable.getSnapshot().status, 'unavailable');
});

test('late success or failure cannot overwrite the latest request; previous request is aborted', async () => {
  const old = deferred(), latest = deferred();
  const signals = [];
  const store = createRecommendationStore(({ signal }) => {
    signals.push(signal); return signals.length === 1 ? old.promise : latest.promise;
  });
  const first = store.load();
  const second = store.load();
  assert.equal(signals[0].aborted, true);
  latest.resolve(payload); await second;
  old.resolve({ items: [] }); await first;
  assert.equal(store.getSnapshot().items[0].poi.id, 'P03');
  const fail = deferred();
  const other = createRecommendationStore(() => fail.promise);
  const work = other.load(); other.cancel(); fail.reject(new Error('OLD_FAILURE')); await work;
  assert.equal(other.getSnapshot().status, 'idle');
});

test('demo results are explicit and may be replaced by the real service without leaking old data', async () => {
  const old = deferred();
  const store = createRecommendationStore(() => old.promise);
  const work = store.load();
  await store.load({ source: 'demo', demoLoader: async () => payload });
  old.resolve({ items: [] }); await work;
  assert.equal(store.getSnapshot().source, 'demo');
  assert.equal(store.getSnapshot().items.length, 3);
  store.setScrollOffset(150);
  assert.equal(store.getScrollOffset(), 150);
});

test('transport uses the configured same-backend path and fresh coordinates, with no hidden POI fallback', async () => {
  let called;
  const service = createRecommendationService({ baseUrl: 'http://backend.test', path: '/api/recommendations',
    request: async (url) => { called = url; return { ok: true, json: async () => payload }; } });
  assert.equal(await service({ location: { latitude: -6, longitude: 107 } }), payload);
  const url = new URL(called);
  assert.equal(url.pathname, '/api/recommendations');
  assert.equal(url.searchParams.get('latitude'), '-6');
  await service(); assert.equal(called, 'http://backend.test/api/recommendations');
  await assert.rejects(createRecommendationService({ baseUrl: '', path: 'https://other.test/api/recommendations' })(),
    /INVALID_RECOMMENDATION_PATH/);
});

test('transport timeout aborts a hung request and propagates an error for retry', async () => {
  const service = createRecommendationService({ baseUrl: 'http://backend.test', path: '/api/recommendations', timeoutMs: 10,
    request: (url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('ABORTED')), { once: true });
    }) });
  await assert.rejects(service(), /ABORTED/);
});

test('current backend metadata survives recommendation → detail and audio handoff', () => {
  const { toPoiResponse } = require('../../backend/poiResponse');
  const { adaptPois } = require('../src/poi/adapter');
  const { getPoiDetailFields } = require('../src/poi/presentation');
  const { audioSourceFor } = require('../src/audio/guideController');
  const response = toPoiResponse({id:'P03',name:'Sweet Cantina',category:'Dessert',latitude:-6.91685,
    longitude:107.60895,radius_meters:10,description:'Deskripsi dari POI',rating:'4.5',reviews_count:890,
    history:'Sejarah destinasi',audio_guide_url:'https://example.test/P03.mp3'});
  const [poi] = adaptPois([response]);
  const item = adaptRecommendations({items:[{poi:{...poi,imageUrls:['https://example.test/P03.jpg']}}]}).items[0];
  const detail = poiForDetail(item,{latitude:-6.91685,longitude:107.60895});
  assert.equal(detail.id,'P03');assert.equal(detail.rating,4.5);assert.equal(detail.reviewsCount,890);
  assert.equal(getPoiDetailFields(detail).ratingSummary,'4.5 / 5 (890 ulasan)');
  assert.equal(getPoiDetailFields(detail).description,'Deskripsi dari POI');
  assert.equal(audioSourceFor(detail),'https://example.test/P03.mp3');
  assert.deepEqual(detail.imageUrls,['https://example.test/P03.jpg']);
});

test('canonical metadata enrichment preserves rank and never substitutes a same-name ID', () => {
  const { resolveRecommendationDetail } = require('../src/recommendations/model');
  const catalogue = [{id:'P01',name:'Same name',history:'Canonical history',reviewsCount:8,rating:4.2}];
  const result = resolveRecommendationDetail({id:'P01',name:'Same name',history:undefined}, catalogue);
  assert.equal(result.id,'P01');assert.equal(result.history,'Canonical history');
  assert.equal(resolveRecommendationDetail({id:'P99',name:'Same name'},catalogue).id,'P99');
  assert.equal(resolveRecommendationDetail({name:'Same name'},catalogue),null);
});

test('reset on login/logout clears session data and invalidates in-flight responses', async () => {
  const old=deferred();const store=createRecommendationStore(()=>old.promise);
  const work=store.load();store.setScrollOffset(250);store.reset();
  old.resolve(payload);await work;
  assert.equal(store.getSnapshot().status,'idle');assert.equal(store.getSnapshot().source,'service');
  assert.equal(store.getScrollOffset(),0);assert.deepEqual(store.getSnapshot().items,[]);
});

test('canonical review counts take priority and invalid counts never manufacture ratings', () => {
  assert.equal(reviewedRating({rating:4.5,reviewsCount:0,reviews_count:100}),null);
  assert.equal(reviewedRating({rating:4.5,reviewsCount:1.5}),null);
  assert.deepEqual(reviewedRating({rating:4.5,reviewsCount:100}),{value:4.5,count:100});
});
