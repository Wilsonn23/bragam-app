const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalizeMenuItems, groupMenuByCategory, formatRupiah, formatCheckedOn, menuSources } = require('../src/poi/menu');

// Native Expo constants are unavailable to Node's test runner; stub the API config like integration.test.js.
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === '../config/api' && parent?.filename.replace(/\\/g, '/').endsWith('/src/poi/api.js')) return { API_BASE_URL: 'http://test.invalid' };
  return originalLoad.apply(this, arguments);
};
const { fetchPoiMenu } = require('../src/poi/api');
Module._load = originalLoad;

const apiItems = [
  { id: '1', category: 'Kopi', name: 'Es Kopi Awan', description: 'Dengan foam', priceIdr: 31200, source: 'GoFood Braga', sourceUrl: 'https://example.invalid/a', checkedOn: '2026-11-27' },
  { id: '2', category: 'Kue', name: '  Donat Coklat ', description: '', priceIdr: 13000, source: 'GoFood Braga', sourceUrl: 'https://example.invalid/a', checkedOn: '2026-11-27' },
  { id: '3', category: 'Kopi', name: 'Es Kopi Polos', priceIdr: null, source: 'Artikel', sourceUrl: 'javascript:alert(1)', checkedOn: null },
  { id: '4', category: 'Kopi', name: '', priceIdr: 1000, source: 'x' },
  null,
];

test('normalizeMenuItems keeps valid items, trims text, and rejects bad prices and URLs', () => {
  const items = normalizeMenuItems(apiItems);
  assert.deepEqual(items.map(item => item.name), ['Es Kopi Awan', 'Donat Coklat', 'Es Kopi Polos']);
  assert.equal(items[1].description, null);
  assert.equal(items[2].priceIdr, null);
  assert.equal(items[2].sourceUrl, null, 'only http(s) sources are linkable');
  assert.equal(normalizeMenuItems([{ name: 'Minus', priceIdr: -5 }])[0].priceIdr, null);
  assert.equal(normalizeMenuItems([{ name: 'Tanpa kategori' }])[0].category, 'Menu');
  assert.deepEqual(normalizeMenuItems({}), []);
});

test('groupMenuByCategory keeps first-seen category and item order', () => {
  const groups = groupMenuByCategory(normalizeMenuItems(apiItems));
  assert.deepEqual(groups.map(group => group.category), ['Kopi', 'Kue']);
  assert.deepEqual(groups[0].items.map(item => item.name), ['Es Kopi Awan', 'Es Kopi Polos']);
});

test('formatRupiah and formatCheckedOn render Indonesian formats without Intl', () => {
  assert.equal(formatRupiah(26000), 'Rp26.000');
  assert.equal(formatRupiah(117000), 'Rp117.000');
  assert.equal(formatRupiah(1250000), 'Rp1.250.000');
  assert.equal(formatRupiah(500), 'Rp500');
  assert.equal(formatRupiah(null), null);
  assert.equal(formatRupiah(12.5), null);
  assert.equal(formatCheckedOn('2026-11-27'), '27 Nov 2026');
  assert.equal(formatCheckedOn('2026-05-01'), '1 Mei 2026');
  assert.equal(formatCheckedOn('2026-13-01'), null);
  assert.equal(formatCheckedOn('27/11/2026'), null);
});

test('menuSources lists each source once in first-seen order', () => {
  const sources = menuSources(normalizeMenuItems(apiItems));
  assert.deepEqual(sources, [
    { label: 'GoFood Braga', url: 'https://example.invalid/a', checkedOn: '2026-11-27' },
    { label: 'Artikel', url: null, checkedOn: null },
  ]);
});

test('fetchPoiMenu calls the menu endpoint and rejects failed or malformed responses', async () => {
  let requested;
  const data = await fetchPoiMenu('P 02', {
    baseUrl: 'http://api.invalid/',
    fetchImpl: async url => { requested = url; return new Response(JSON.stringify(apiItems.slice(0, 1))); },
  });
  assert.equal(requested, 'http://api.invalid/api/pois/P%2002/menu');
  assert.equal(data[0].name, 'Es Kopi Awan');
  await assert.rejects(fetchPoiMenu('P02', { fetchImpl: async () => new Response(JSON.stringify({ error: 'Database request failed.' }), { status: 500 }) }),
    /Database request failed/);
  await assert.rejects(fetchPoiMenu('P02', { fetchImpl: async () => new Response('{}') }), /tidak valid/);
});
