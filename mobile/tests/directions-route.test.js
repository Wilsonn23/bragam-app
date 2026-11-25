const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/directionsApi.js'), 'utf8')
  .replace(/export (async function|function) /g, '$1 ') + '\nmodule.exports={fetchWalkingRoute};';
function loader(fetch, key = '') {
  const context = { module: { exports: {} }, process: { env: { EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: key } },
    AbortController, setTimeout, clearTimeout, fetch };
  vm.runInNewContext(source, context);
  return context.module.exports.fetchWalkingRoute;
}
const inBraga = { latitude:-6.9162, longitude:107.6088 };
const nearby = { latitude:-6.9172, longitude:107.60902 };
const distant = { latitude:-6.890389, longitude:107.609583 };
test('real pedestrian routing is used when Google fails and OSM succeeds', async () => {
  let calls = 0;
  const route = loader(async () => {
    calls++;
    if (calls === 1) return {ok:true,json:async()=>({status:'REQUEST_DENIED'})};
    return {ok:true,json:async()=>({code:'Ok',routes:[{distance:100,geometry:{coordinates:[[107.6088,-6.9162],[107.60902,-6.9172]]},legs:[{steps:[]}]}]})};
  }, 'test-key');
  const result = await route(inBraga,nearby,'Tujuan');
  assert.equal(calls,2); assert.equal(result.distanceMeters,100); assert.equal(result.coordinates.length,2);
});
test('offline corridor fallback is limited to Braga; distant routes fail honestly', async () => {
  const route = loader(async () => { throw new Error('network'); });
  const fallback = await route(inBraga,nearby,'Tujuan');
  assert.ok(fallback.coordinates.length >= 2);
  await assert.rejects(route(inBraga,distant,'Tujuan'),/Rute belum tersedia/);
});
