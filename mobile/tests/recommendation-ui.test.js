const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const React = require('react');
const renderer = require('react-test-renderer');
const { act } = renderer;
const babel = require('@babel/core');
const root = path.resolve(__dirname, '..');
global.IS_REACT_ACT_ENVIRONMENT = true;
process.env.EXPO_PUBLIC_RECOMMENDATIONS_PATH = '/api/recommendations';

// Exercise actual application/components and handlers with host/native services replaced.
// This is JS interaction coverage, not device rendering or native GPS verification.
const host = (name) => React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({ scrollToOffset() {}, focus() {}, animateToRegion() {} }));
  return name === 'Modal' && !props.visible ? null : React.createElement(name, props, props.children);
});
class AnimatedValue { constructor(value) { this.value = value; } setValue(value) { this.value = value; } }
const rn = {
  View: host('View'), Text: host('Text'), Image: host('Image'), TextInput: host('TextInput'),
  Pressable: host('Pressable'), TouchableOpacity: host('TouchableOpacity'), ScrollView: host('ScrollView'),
  Modal: host('Modal'), ActivityIndicator: host('ActivityIndicator'), SafeAreaView: host('SafeAreaView'),
  StatusBar: host('StatusBar'), Platform: { OS: 'android' },
  StyleSheet: { create: x => x, absoluteFill: {}, absoluteFillObject: {} },
  Dimensions: { get: () => ({ height: 820, width: 390 }) }, useWindowDimensions: () => ({ height: 820, width: 390 }),
  PanResponder: { create: () => ({ panHandlers: {} }) },
  Animated: { Value: AnimatedValue, View: host('AnimatedView'), spring: (v, c) => ({ start() { v.setValue(c.toValue); } }) },
  Alert: { alert() { throw new Error('Unexpected native alert'); } }, Keyboard: { dismiss() {} },
};
rn.FlatList = React.forwardRef((props, ref) => {
  React.useImperativeHandle(ref, () => ({ scrollToOffset() {} }));
  return React.createElement('FlatList', props, props.ListHeaderComponent,
    props.data.length ? props.data.map((item, index) => React.createElement(React.Fragment, { key: props.keyExtractor(item) },
      props.renderItem({ item, index }))) : props.ListEmptyComponent);
});
const load = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'react-native') return rn;
  if (request === '@expo/vector-icons') return { Ionicons: host('Icon'), MaterialIcons: host('Icon'), MaterialCommunityIcons: host('Icon') };
  if (request === 'react-native-svg') return { __esModule: true, default: host('Svg'), Line: host('Line') };
  if (request === 'react-native-maps') return { __esModule: true, default: host('MapView'), Marker: host('Marker'), Polygon: host('Polygon'), Polyline: host('Polyline'), PROVIDER_GOOGLE: 'google' };
  if (request === 'expo-font') return { useFonts: () => [true, null] };
  if (request === 'expo-constants') return { expoConfig: { hostUri: 'backend.test:8081' } };
  if (request === 'expo-location') return { requestForegroundPermissionsAsync: async () => ({ status: 'denied' }) };
  if (/hooks\/useForegroundLocation$/.test(request)) return { useAppActive: () => true, useForegroundLocation: () => ({ sample: null }) };
  if (/components\/SearchPoiOverlay$/.test(request)) return { __esModule: true, default: () => null };
  if (/screens\/(HomeScreen|TripScreen|AccountScreen|NavigationScreen|TripRouteSummaryScreen|BookmarkScreen)$/.test(request)) {
    return { __esModule: true, default: () => React.createElement('SiblingScreen') };
  }
  return load.apply(this, arguments);
};
Module._extensions['.ttf'] = (module, filename) => { module.exports = filename; };
const originalJs = Module._extensions['.js'];
Module._extensions['.js'] = function(module, filename) {
  if (filename.startsWith(root + '/src/') || filename === root + '/App.js') {
    const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), { filename,
      babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'] });
    return module._compile(code, filename);
  }
  return originalJs(module, filename);
};
global.__DEV__ = true;
const { createRecommendationStore } = require('../src/recommendations/store');
const { DEFAULT_FILTERS } = require('../src/recommendations/model');
const Panel = require('../src/components/RecommendationPanel').default;
const Search = require('../src/components/RecommendationPanel').RecommendationSearch;
let httpRequest;
global.fetch = (...args) => httpRequest(...args);
const App = require('../App').default;
const payload = { items: [
  { poi: { id: 'P03', name: 'Sweet Cantina', category: 'Dessert', latitude: -6.91685,
    longitude: 107.60895, shortDescription: 'Dessert', triggerRadiusMeters: 10, rating: 4.5, reviews_count: 12, openAtNight: true } },
  { poi: { id: 'P01', name: 'Maison Bogerijen', category: 'Restoran', rating: 0, reviews_count: 0 } },
], capabilities: { openAtNight: true } };
function allText(view) { return view.root.findAllByType('Text').map(n => n.children.filter(x => typeof x === 'string').join('')).join('\n'); }
function press(view, label) {
  const target = view.root.findAll(n => ['Pressable', 'TouchableOpacity'].includes(n.type) &&
    (n.props.accessibilityLabel === label || n.findAllByType('Text').some(t => t.children.join('') === label)))[0];
  assert.ok(target, `Control exists: ${label}`);
  assert.ok(!target.props.disabled, `Control enabled: ${label}`);
  return act(async () => target.props.onPress());
}
function cardIds(view) { return view.root.findAll(n => n.type === 'View' && /^recommendation-/.test(n.props.testID || '')).map(n => n.props.testID); }

function Wrapper({ store, open = () => {} }) {
  const [filters, setFilters] = React.useState({ ...DEFAULT_FILTERS });
  return React.createElement(React.Fragment, null,
    React.createElement(Search, { query: filters.query, onChange: query => setFilters(x => ({ ...x, query })) }),
    React.createElement(Panel, { store, filters, onFiltersChange: setFilters, location: null, onOpenDetail: open,
      onToggleSave() {}, onOpenDirections() {}, onAddToItinerary() {} }));
}

test('Recommendation UI renders ordered cards, filters/search/clear, optional data, and exact detail ID', async () => {
  const store = createRecommendationStore(async () => payload);
  let selected;
  let view;
  await act(async () => { view = renderer.create(React.createElement(Wrapper, { store, open: poi => { selected = poi; } })); });
  assert.deepEqual(cardIds(view), ['recommendation-P03', 'recommendation-P01']);
  assert.match(allText(view), /Belum ada ulasan/);
  assert.match(allText(view), /Foto belum tersedia/);
  assert.match(allText(view), /Jarak belum tersedia/);
  await press(view, 'Check Detail Sweet Cantina');
  assert.equal(selected.id, 'P03');
  await press(view, 'Open at Night'); assert.equal(cardIds(view).length, 1);
  await press(view, 'Reset filter'); assert.equal(cardIds(view).length, 2);
  await press(view, 'Destination'); await press(view, 'Restoran');
  assert.deepEqual(cardIds(view), ['recommendation-P01']);
  await press(view, 'Reset filter');
  await press(view, 'Top Rated'); await press(view, '4+ ★');
  assert.deepEqual(cardIds(view), ['recommendation-P03']);
  await press(view, 'Reset filter');
  await act(async () => view.root.findByType('TextInput').props.onChangeText('tidak ditemukan'));
  assert.match(allText(view), /Tidak ada hasil yang cocok/);
  await press(view, 'Hapus pencarian rekomendasi'); assert.equal(cardIds(view).length, 2);
  await act(async () => view.unmount());
});

test('Recommendation UI shows loading/error/retry/empty and disables unsupported night filter', async () => {
  let resolve;
  let calls = 0;
  const store = createRecommendationStore(() => {
    if (calls++ === 0) return new Promise(r => { resolve = r; });
    return Promise.resolve({ items: [] });
  });
  let view;
  await act(async () => { view = renderer.create(React.createElement(Wrapper, { store })); });
  assert.match(allText(view), /Memuat rekomendasi/);
  await act(async () => { resolve({ items: null }); });
  assert.match(allText(view), /Rekomendasi gagal dimuat/);
  await press(view, 'Coba lagi');
  assert.match(allText(view), /Belum ada rekomendasi/);
  const night = view.root.findAllByType('Pressable').find(n => n.props.accessibilityLabel === 'Open at Night');
  assert.equal(night.props.disabled, true);
  await act(async () => view.unmount());
});

test('actual App switches Nearby/Recommendation, opens correct detail, restores query/results and saves through existing handler', async () => {
  let recommendationRequests = 0;
  httpRequest = async url => {
    const u = new URL(url);
    const data = u.pathname === '/api/recommendations' ? (++recommendationRequests, payload)
      : u.pathname === '/api/categories' ? { categories: ['Semua'] }
      : u.pathname === '/api/pois/search' ? { data: [] }
      : u.pathname.endsWith('/images') ? [] : [];
    return { ok: true, json: async () => data };
  };
  let view;
  await act(async () => { view = renderer.create(React.createElement(App)); });
  await press(view, 'Explore');
  assert.equal(cardIds(view).length, 0);
  await press(view, 'Recommendation');
  assert.deepEqual(cardIds(view), ['recommendation-P03', 'recommendation-P01']);
  await act(async () => view.root.findByType('TextInput').props.onChangeText('Cantina'));
  await press(view, 'Save Sweet Cantina');
  assert.ok(view.root.findAllByType('TouchableOpacity').some(n => n.props.accessibilityLabel === 'Saved Sweet Cantina'));
  await press(view, 'Check Detail Sweet Cantina');
  assert.match(allText(view), /Sweet Cantina/);
  const back = view.root.findAllByType('TouchableOpacity').find(n => n.findAllByType('Icon').some(i => i.props.name === 'arrow-back'));
  assert.ok(back);
  await act(async () => back.props.onPress());
  assert.equal(view.root.findByType('TextInput').props.value, 'Cantina');
  assert.deepEqual(cardIds(view), ['recommendation-P03']);
  assert.equal(recommendationRequests, 1);
  await press(view, 'Add to Itinerary Sweet Cantina');
  assert.match(allText(view), /belum ditambahkan/);
  await press(view, 'Tutup');
  await press(view, 'Nearby You'); assert.equal(cardIds(view).length, 0);
  await press(view, 'Recommendation'); assert.deepEqual(cardIds(view), ['recommendation-P03']);
  assert.equal(recommendationRequests, 1);
  await act(async () => view.unmount());
});

test('GPS prop updates change distance without repeated requests; explicit refresh requests fresh context', async () => {
  const contexts = [];
  const store = createRecommendationStore(async ({location}) => { contexts.push(location); return payload; });
  let view;
  const props = { store, filters: DEFAULT_FILTERS, onFiltersChange() {}, onOpenDetail() {}, location: null };
  await act(async () => { view = renderer.create(React.createElement(Panel, props)); });
  assert.match(allText(view), /Jarak belum tersedia/);
  await act(async () => view.update(React.createElement(Panel, { ...props, location: {latitude:-6.91685,longitude:107.60895} })));
  assert.match(allText(view), /0 m/);
  assert.equal(contexts.length, 1);
  await press(view, 'Muat ulang');
  assert.equal(contexts.length, 2);
  assert.deepEqual(contexts[1], {latitude:-6.91685,longitude:107.60895});
  await act(async () => view.unmount());
});

test('POI galleries use supplied photos and recover to labelled fallback when every image fails', async () => {
  const data = { items: [{ poi: {...payload.items[0].poi,
    images: [{imageUrl:'https://example.test/photo-a.jpg'},{imageUrl:'https://example.test/photo-b.jpg'}] } }] };
  const store = createRecommendationStore(async () => data);
  let view;
  await act(async () => { view = renderer.create(React.createElement(Wrapper, {store})); });
  assert.equal(view.root.findAllByType('Image').length, 2);
  await act(async () => view.root.findAllByType('Image')[0].props.onError());
  assert.equal(view.root.findAllByType('Image').length, 1);
  await act(async () => view.root.findAllByType('Image')[0].props.onError());
  assert.match(allText(view), /Foto belum tersedia/);
  await act(async () => view.unmount());
});

test('development controls explicitly load the actual labelled fixture and reuse catalogue photos by ID', async () => {
  const store = createRecommendationStore(async () => { throw Object.assign(new Error('missing service'), {code:'UNAVAILABLE'}); });
  let view;
  await act(async () => { view = renderer.create(React.createElement(Panel, {
    store, filters: DEFAULT_FILTERS, onFiltersChange() {}, location:null,
    catalogue:[{id:'P03',imageUrl:'https://example.test/actual-cantina.jpg'}], onOpenDetail() {},
  })); });
  assert.match(allText(view), /Rekomendasi belum tersedia/);
  await press(view, 'Skenario uji development');
  await press(view, 'Contoh daftar');
  assert.match(allText(view), /Memuat rekomendasi/);
  await act(async () => new Promise(r => setTimeout(r, 480)));
  assert.deepEqual(cardIds(view), ['recommendation-P03','recommendation-P01','recommendation-P04']);
  assert.match(allText(view), /Bukan rekomendasi kontekstual/);
  assert.equal(view.root.findByType('Image').props.source.uri, 'https://example.test/actual-cantina.jpg');
  await press(view, 'Contoh gagal');
  await act(async () => new Promise(r => setTimeout(r, 480)));
  assert.match(allText(view), /Rekomendasi gagal dimuat/);
  await act(async () => view.unmount());
});
