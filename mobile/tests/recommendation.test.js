const { test } = require('node:test');
const assert = require('node:assert/strict');
const { recommend, slotAt, dateForSlot, slotFit } = require('../src/recommendation/engine');
const { describeWeather, fetchWeather, clearWeatherCache } = require('../src/recommendation/weather');
const { DEFAULT_PREFERENCES, normalizePreferences, samePreferences, preferenceSummary } = require('../src/recommendation/preferences');
const records = require('../src/poi/pb03.snapshot.json');

// Wall-clock helpers in WIB (UTC+7).
const wib = (hour, minute = 0) => new Date(Date.UTC(2026, 10, 23, hour - 7, minute));
const prefs = (overrides = {}) => ({ ...DEFAULT_PREFERENCES, ...overrides, weights: { ...DEFAULT_PREFERENCES.weights, ...overrides.weights } });
const ids = result => result.items.map(item => item.poi.id);
const RAIN = describeWeather(63, 23, true, 0);
const CLEAR_EVENING = describeWeather(0, 24, false, 0);
const BRAGA = { latitude: -6.9176, longitude: 107.6091 };

test('time slots follow WIB wall-clock hours', () => {
  assert.equal(slotAt(wib(7)), 'pagi');
  assert.equal(slotAt(wib(12)), 'siang');
  assert.equal(slotAt(wib(16)), 'sore');
  assert.equal(slotAt(wib(20)), 'malam');
  assert.equal(slotAt(wib(2)), 'malam');
  assert.equal(dateForSlot('malam', wib(8)).toISOString(), wib(19, 30).toISOString());
  assert.equal(slotFit('pagi, siang', 'siang'), 1);
  assert.equal(slotFit('malam', 'sore'), 0.8);
  assert.equal(slotFit('malam', 'pagi'), 0.2);
  assert.equal(slotFit('', 'pagi'), 0.5);
});

test('closed places are hidden by default and kept but demoted when allowed', () => {
  const morning = recommend(records, prefs(), { now: wib(8) });
  assert.equal(ids(morning).includes('P05'), false, 'night street food is closed at 08:00');
  assert.ok(morning.context.hiddenClosed > 0);

  const shown = recommend(records, prefs({ hideClosed: false }), { now: wib(8) });
  const p05 = shown.items.find(item => item.poi.id === 'P05');
  assert.equal(p05.closed, true);
  const firstClosed = shown.items.findIndex(item => item.closed);
  assert.ok(shown.items.slice(firstClosed).every(item => item.closed), 'every open place ranks above every closed one');
});

test('evening favours places tagged for night, including late venues', () => {
  const night = recommend(records, prefs(), { now: wib(21) });
  assert.ok(ids(night).includes('P05'));
  assert.ok(ids(night).includes('P12'));
  assert.equal(ids(night).includes('P09'), false, 'museum closes at 18:00');
});

test('a chosen visit time checks opening hours at that time, not now', () => {
  const plannedNight = recommend(records, prefs({ visitTime: 'malam' }), { now: wib(8) });
  assert.equal(plannedNight.context.slot, 'malam');
  assert.equal(plannedNight.context.auto, false);
  assert.ok(ids(plannedNight).includes('P05'));
  assert.equal(ids(plannedNight).includes('P04'), false, 'bakery closes 19:00');
});

test('rain pushes indoor places up and outdoor places down', () => {
  const base = { now: wib(13) };
  const dry = recommend(records, prefs({ weights: { weather: 3 } }), { ...base, weather: describeWeather(3, 25, true, 0) });
  const wet = recommend(records, prefs({ weights: { weather: 3 } }), { ...base, weather: RAIN });
  const score = (result, id) => result.items.find(item => item.poi.id === id).matchPercent;
  assert.ok(score(wet, 'P10') < score(dry, 'P10'), 'outdoor gallery street scores lower in rain');
  assert.ok(score(wet, 'P02') > score(dry, 'P02'), 'indoor cafe scores higher in rain');
  const topWet = wet.items.slice(0, 3).map(item => item.poi.environment);
  assert.ok(topWet.every(env => env === 'indoor'));
  assert.ok(wet.items[0].reasons.some(reason => /hujan/i.test(reason.text)));
});

test('a clear evening rewards outdoor spots with an explanation', () => {
  const result = recommend(records, prefs({ weights: { weather: 3 } }), { now: wib(19), weather: CLEAR_EVENING });
  const p05 = result.items.find(item => item.poi.id === 'P05');
  assert.ok(p05.reasons.some(reason => /Malam cerah/.test(reason.text)));
});

test('interests, environment and budget steer the ranking', () => {
  const cafes = recommend(records, prefs({ interests: ['kafe'], weights: { preference: 3 } }), { now: wib(10) });
  assert.match(cafes.items[0].poi.category, /Kafe|Bakery|Dessert/);
  assert.ok(cafes.items[0].reasons.some(reason => reason.text.includes('Kafe & Dessert')));

  const cheap = recommend(records, prefs({ maxBudget: 50000, weights: { preference: 3 } }), { now: wib(19) });
  const expensive = cheap.items.findIndex(item => item.poi.id === 'P07');
  const budgetFit = cheap.items.findIndex(item => item.poi.id === 'P05');
  assert.ok(budgetFit < expensive);

  const outdoor = recommend(records, prefs({ environment: 'outdoor', weights: { preference: 3 } }), { now: wib(19) });
  assert.notEqual(outdoor.items[0].poi.environment, 'indoor');
});

test('nearby places rank higher and explain the walk; far-away users ignore distance', () => {
  const nearP09 = { latitude: records.find(p => p.id === 'P09').latitude, longitude: records.find(p => p.id === 'P09').longitude };
  const near = recommend(records, prefs({ weights: { location: 3, rating: 0, time: 1, weather: 0, preference: 0 } }), { now: wib(10), userCoord: nearP09 });
  assert.equal(near.items[0].poi.id, 'P09');
  assert.ok(near.items[0].reasons.some(reason => /jalan kaki/.test(reason.text)));
  assert.equal(near.context.hasLocation, true);

  const jakarta = recommend(records, prefs(), { now: wib(10), userCoord: { latitude: -6.2, longitude: 106.8 } });
  assert.equal(jakarta.context.farAway, true);
  assert.equal(jakarta.items[0].factors.location, null);
});

test('ignored factors do not influence the score', () => {
  const ratingOnly = prefs({ weights: { preference: 0, time: 0, location: 0, rating: 3, weather: 0 } });
  const a = recommend(records, ratingOnly, { now: wib(13), weather: RAIN, userCoord: BRAGA });
  const b = recommend(records, ratingOnly, { now: wib(13), weather: CLEAR_EVENING, userCoord: null });
  assert.deepEqual(ids(a), ids(b));
});

test('bayesian rating keeps a handful of perfect reviews from dominating', () => {
  const pois = [
    { ...records[0], id: 'A', name: 'A', rating: 5, reviewsCount: 2 },
    { ...records[0], id: 'B', name: 'B', rating: 4.7, reviewsCount: 1200 },
  ];
  const result = recommend(pois, prefs({ weights: { preference: 0, time: 0, location: 0, rating: 3, weather: 0 } }), { now: wib(13) });
  assert.deepEqual(ids(result), ['B', 'A']);
});

test('local GPS test clones are never recommended', () => {
  const pois = [...records, { ...records[10], id: 'TEST-LOCAL', isLocalTest: true }];
  assert.equal(ids(recommend(pois, prefs(), { now: wib(13) })).includes('TEST-LOCAL'), false);
});

test('scores are bounded percentages and output is stable', () => {
  const result = recommend(records, prefs(), { now: wib(13), weather: RAIN, userCoord: BRAGA });
  for (const item of result.items) {
    assert.ok(item.matchPercent >= 0 && item.matchPercent <= 100);
    assert.ok(item.reasons.length <= 3);
  }
  assert.deepEqual(ids(result), ids(recommend(records, prefs(), { now: wib(13), weather: RAIN, userCoord: BRAGA })));
});

test('weather codes map to recommender conditions', () => {
  assert.equal(describeWeather(0, 31, true).hot, true);
  assert.equal(describeWeather(0, 31, false).hot, false);
  assert.equal(describeWeather(53, 22, true).wet, true);
  assert.equal(describeWeather(81, 22, true).condition, 'rain');
  assert.equal(describeWeather(95, 22, true).condition, 'storm');
  assert.equal(describeWeather(45, 20, true).condition, 'fog');
  assert.equal(describeWeather(3, NaN, true).temperature, null);
});

test('weather fetch parses Open-Meteo, caches, and surfaces failures', async () => {
  clearWeatherCache();
  let calls = 0;
  const fetchImpl = async (url) => {
    calls += 1;
    assert.match(String(url), /latitude=-6\.9175&longitude=107\.6091/);
    return { ok: true, json: async () => ({ current: { weather_code: 61, temperature_2m: 22.6, is_day: 1 } }) };
  };
  const first = await fetchWeather({ fetchImpl, now: 1000 });
  assert.equal(first.condition, 'rain');
  assert.equal(first.temperature, 23);
  await fetchWeather({ fetchImpl, now: 2000 });
  assert.equal(calls, 1, 'second call within 10 minutes is cached');
  await assert.rejects(fetchWeather({ fetchImpl: async () => ({ ok: false, status: 503 }), force: true }), /503/);
  clearWeatherCache();
});

test('preferences normalize unknown values and summarise customisations', () => {
  const normalized = normalizePreferences({ interests: ['kafe', 'kafe', 'x'], visitTime: 'subuh', maxBudget: 1, weights: { rating: 9, time: 3 } });
  assert.deepEqual(normalized.interests, ['kafe']);
  assert.equal(normalized.visitTime, 'auto');
  assert.equal(normalized.maxBudget, null);
  assert.equal(normalized.weights.rating, 2);
  assert.equal(normalized.weights.time, 3);
  assert.equal(normalizePreferences({ weights: { preference: 0, time: 0, location: 0, rating: 0, weather: 0 } }).weights.rating, 2);
  assert.equal(samePreferences(DEFAULT_PREFERENCES, normalizePreferences(null)), true);
  assert.deepEqual(preferenceSummary(prefs({ interests: ['sejarah'], environment: 'indoor', maxBudget: 100000 })),
    ['Sejarah & Budaya', 'Indoor', 'Budget ≤ 100rb']);
});
