const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');
const { localTestPoi } = require('../localTestPoi');

test('local POI is opt-in, valid, and disabled in production', () => {
  const config = { LOCAL_TEST_POI_ENABLED: 'true', LOCAL_TEST_POI_LATITUDE: '-6.890389',
    LOCAL_TEST_POI_LONGITUDE: '107.609583' };
  assert.equal(localTestPoi({ ...config, LOCAL_TEST_POI_ENABLED: 'false' }), null);
  assert.equal(localTestPoi({ ...config, NODE_ENV: 'production' }), null);
  assert.equal(localTestPoi({ ...config, LOCAL_TEST_POI_LATITUDE: '' }), null);
  assert.equal(localTestPoi({ ...config, LOCAL_TEST_POI_LATITUDE: '91' }), null);
  assert.equal(localTestPoi({ ...config, LOCAL_TEST_POI_LONGITUDE: 'NaN' }), null);
  assert.equal(localTestPoi(config).latitude, -6.890389);
});

test('local fixture works across catalogue, filters, nearby and detail without database writes', async t => {
  const keys = ['NODE_ENV', 'LOCAL_TEST_POI_ENABLED', 'LOCAL_TEST_POI_LATITUDE', 'LOCAL_TEST_POI_LONGITUDE', 'LOCAL_TEST_POI_SOURCE_ID'];
  const saved = keys.map(key => process.env[key]);
  t.after(() => keys.forEach((key, i) => {
    if (saved[i] === undefined) delete process.env[key]; else process.env[key] = saved[i];
  }));
  Object.assign(process.env, { NODE_ENV: 'test', LOCAL_TEST_POI_ENABLED: 'true',
    LOCAL_TEST_POI_LATITUDE: '-6.890389', LOCAL_TEST_POI_LONGITUDE: '107.609583', LOCAL_TEST_POI_SOURCE_ID: '' });
  let fail = false;
  const server = createApp({ query: async sql => {
    assert.match(sql.trim(), /^SELECT\b/i);
    if (fail) throw { code: 'TEST_ERROR' };
    return { rows: [] };
  } }).listen(0, '127.0.0.1');
  t.after(() => server.close());
  await new Promise(resolve => server.once('listening', resolve));
  const get = async path => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`);
    return { status: response.status, data: await response.json() };
  };
  const catalogue = await get('/pois');
  assert.equal(catalogue.data.length, 1);
  assert.equal(catalogue.data[0].id, 'TEST-LOCAL');
  assert.equal(catalogue.data[0].triggerRadiusMeters, 15);
  assert.equal(catalogue.data[0].cooldownSeconds, 60);
  assert.deepEqual((await get('/categories')).data.categories, ['Semua', 'Uji Coba']);
  assert.equal((await get('/pois/search?q=Uji&category=Uji%20Coba')).data.data.length, 1);
  assert.equal((await get('/pois/search?q=tidak-cocok')).data.data.length, 0);
  assert.equal((await get('/pois/search?category=Kuliner')).data.data.length, 0);
  assert.equal((await get('/pois/search?min_rating=4')).data.data.length, 0);
  assert.equal((await get('/pois/nearby?latitude=-6.890389&longitude=107.609583')).data.id, 'TEST-LOCAL');
  assert.equal((await get('/pois/nearby?latitude=-6.891&longitude=107.609583')).data, null);
  assert.equal((await get('/pois/TEST-LOCAL')).data.latitude, -6.890389);
  assert.deepEqual((await get('/pois/TEST-LOCAL/images')).data, []);
  fail = true;
  assert.equal((await get('/pois')).status, 500);
  fail = false;
  process.env.LOCAL_TEST_POI_ENABLED = 'false';
  assert.deepEqual((await get('/pois')).data, []);
  assert.equal((await get('/pois/TEST-LOCAL')).status, 404);
});

test('Citywalk clone keeps original data, gallery, audio identity and geofence behavior at the local coordinate', async t => {
  const { loadLocalTestPoi } = require('../localTestPoi');
  const { adaptPois } = require('../../mobile/src/poi/adapter');
  const { GeofenceController } = require('../../mobile/src/location/geofence');
  const { bundledAudioFor } = require('../../mobile/src/audio/guideController');
  const fs = require('node:fs'); const vm = require('node:vm'); const path = require('node:path');
  const keys=['NODE_ENV','LOCAL_TEST_POI_ENABLED','LOCAL_TEST_POI_SOURCE_ID','LOCAL_TEST_POI_LATITUDE','LOCAL_TEST_POI_LONGITUDE'];
  const saved=keys.map(k=>process.env[k]);t.after(()=>keys.forEach((k,i)=>saved[i]===undefined?delete process.env[k]:process.env[k]=saved[i]));
  Object.assign(process.env,{NODE_ENV:'test',LOCAL_TEST_POI_ENABLED:'true',LOCAL_TEST_POI_SOURCE_ID:'P11',
    LOCAL_TEST_POI_LATITUDE:'-6.890389',LOCAL_TEST_POI_LONGITUDE:'107.609583'});
  const source={id:'P11',name:'Braga CityWalk',category:'Hiburan',latitude:-6.9162,longitude:107.6088,radius_meters:15,
    cooldown_seconds:60,description:'Deskripsi Citywalk',history:'Sejarah Citywalk',address:'Alamat Citywalk',
    opening_hours:'10:00 - 22:00',rating:4.6,reviews_count:1800,price_min:0,price_max:50000,
    notification_title:'Jelajahi Citywalk',notification_body:'Kamu dekat Citywalk',audio_guide_url:null};
  const original=JSON.stringify(source);
  const images=[{id:1,poi_id:'P11',image_url:'https://example.test/citywalk.jpg',alt_text:'Citywalk',sort_order:0}];
  const db={query:async(sql,values=[])=>{
    assert.match(sql.trim(),/^SELECT\b/i);
    if(sql.includes('FROM public.pois')){
      if(values[0]==='TEST-LOCAL')return {rows:[]};
      assert.deepEqual(values,['P11']);return {rows:[source]};
    }
    if(sql.includes('FROM poi_images')){assert.ok(values[0]==='P11'||values[0].includes('P11'));return {rows:images};}
    if(sql.includes('SELECT DISTINCT'))return {rows:[{category:source.category}]};
    if(sql.includes('ST_DWithin'))return {rows:[]};
    return {rows:[source]};
  }};
  const server=createApp(db).listen(0,'127.0.0.1');t.after(()=>server.close());
  await new Promise(r=>server.once('listening',r));
  const get=async route=>{const r=await fetch(`http://127.0.0.1:${server.address().port}/api${route}`);assert.equal(r.status,200);return r.json();};
  const all=await get('/pois');const clone=all.find(p=>p.id==='TEST-LOCAL');
  assert.equal(clone.name,'Braga CityWalk (Uji GPS)');assert.equal(clone.latitude,-6.890389);assert.equal(clone.longitude,107.609583);
  assert.equal(clone.isLocalTest,true);assert.equal(clone.sourcePoiId,'P11');assert.equal(clone.triggerRadiusMeters,15);assert.equal(clone.cooldownSeconds,60);
  assert.equal(clone.description,source.description);assert.equal(clone.history,source.history);assert.equal(clone.address,source.address);
  assert.equal(clone.rating,4.6);assert.equal(clone.reviewsCount,1800);assert.equal(clone.openingHours,'10:00 - 22:00');
  assert.equal(clone.images[0].imageUrl,images[0].image_url);
  const detail=await get('/pois/TEST-LOCAL');assert.equal(detail.id,clone.id);assert.equal(detail.images[0].imageUrl,clone.images[0].imageUrl);
  const gallery=await get('/pois/TEST-LOCAL/images');assert.equal(gallery[0].poiId,'TEST-LOCAL');assert.equal(gallery[0].imageUrl,clone.images[0].imageUrl);
  assert.equal((await get('/pois/nearby?latitude=-6.890389&longitude=107.609583')).id,'TEST-LOCAL');
  assert.equal((await get('/pois/search?q=CityWalk')).data.filter(p=>p.id==='TEST-LOCAL').length,1);
  assert.equal((await get('/categories')).categories.includes('Hiburan'),true);
  const adapted=adaptPois(all);assert.equal(adapted.length,2);
  const controller=new GeofenceController(adapted);const sample={latitude:-6.890389,longitude:107.609583,accuracy:5,timestamp:1000};
  const events=controller.update(sample,1000);assert.deepEqual(events.map(e=>e.poiId),['TEST-LOCAL']);
  assert.equal(events[0].poi.notificationTitle,source.notification_title);
  assert.equal(controller.update({...sample,timestamp:2000},2000).length,0);
  const manifest=fs.readFileSync(path.join(__dirname,'../../mobile/src/audio/guideAssets.js'),'utf8').replace('export const POI_AUDIO_ASSETS','const POI_AUDIO_ASSETS')+'; POI_AUDIO_ASSETS;';
  const ids=new Map();const requireAsset=p=>{if(!ids.has(p))ids.set(p,ids.size+1);return ids.get(p);};
  const assets=vm.runInNewContext(manifest,{__DEV__:true,require:requireAsset});
  assert.equal(bundledAudioFor(clone,assets),assets.P11.source);
  const productionAssets=vm.runInNewContext(manifest,{__DEV__:false,require:requireAsset});
  assert.equal(bundledAudioFor(clone,productionAssets),productionAssets.P11.source);
  assert.equal(JSON.stringify(source),original);
  await assert.rejects(loadLocalTestPoi({query:async()=>({rows:[]})}),e=>e.code==='LOCAL_POI_SOURCE_MISSING');
});
