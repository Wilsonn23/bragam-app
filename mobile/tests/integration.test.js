const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fetchPois } = require('../src/poi/api');
const { adaptPois } = require('../src/poi/adapter');
const { createPoiStore } = require('../src/poi/store');
const { notificationContent, openPoiDetail } = require('../src/poi/notification');
const { GeofenceController } = require('../src/location/geofence');
const { findPoi } = require('../src/poi/detail');
const { toPoiResponse } = require('../../backend/poiResponse');
const row = { id:'P01',name:'Destinasi uji',category:'Uji',latitude:0,longitude:0,radius_meters:12,cooldown_seconds:60,description:'Deskripsi destinasi uji',notification_title:'Judul uji',notification_body:null };
const sample=(m,t)=>({latitude:m/111194.9266,longitude:0,accuracy:3,timestamp:t});
const update=(c,m,t)=>c.update(sample(m,t),t);
test('API → adapter → geofence → notification → same ID detail', async()=>{
 const records=await fetchPois({fetchImpl:async()=>new Response(JSON.stringify([toPoiResponse(row)]))});
 assert.equal(records[0].triggerRadiusMeters,12);assert.equal(records[0].cooldownSeconds,60);
 const c=new GeofenceController(records);update(c,0,10000);const event=c.current(10000);
 assert.equal(notificationContent(event.poi).title,'Judul uji');assert.equal(notificationContent(event.poi).body,row.description);
 let target;openPoiDetail(event.poiId,value=>{target=value;});assert.equal(target.params.id,'P01');assert.equal(findPoi(target.params.id,records),records[0]);
 c.dismiss(10000);assert.equal(update(c,0,80000).length,0);
});
test('confirmed exit/re-entry after cooldown emits; early entry consumes visit without timer trigger',()=>{
 const c=new GeofenceController([row]);update(c,0,10000);c.dismiss(10000);
 update(c,30,12000);update(c,30,14000);assert.equal(update(c,0,16000).length,0);
 assert.equal(update(c,0,80000).length,0);
 update(c,30,82000);update(c,30,84000);assert.equal(update(c,0,86000).length,1);
});
test('shared coordinates: stable ID order, deduplicated queue, old items discarded',()=>{
 const c=new GeofenceController([{...row,id:'P07'},row]);
 update(c,0,10000);assert.deepEqual(c.queue.map(e=>e.poiId),['P01','P07']);
 update(c,0,12000);assert.equal(c.queue.length,2);c.dismiss(12000);assert.equal(c.current(12000).poiId,'P07');
 update(c,30,14000);assert.equal(c.current(14000),null);
});
test('mapping honors custom/zero cooldown, defaults to 60, keeps description and optional image',()=>{
 for(const cooldown of [0,60,90]) assert.equal(adaptPois([{...row,cooldown_seconds:cooldown}])[0].cooldownSeconds,cooldown);
 assert.equal(adaptPois([{...row,cooldown_seconds:null}])[0].cooldownSeconds,60);
 assert.equal(notificationContent({...row,notificationBody:'Isi khusus'}).body,'Isi khusus');
 assert.equal(notificationContent({name:'Uji',description:'a'.repeat(400)}).body.length,218);
 assert.throws(()=>openPoiDetail('',()=>{}));
});
test('failed/malformed/invalid requests reject; empty response stays empty; AbortSignal forwarded',async()=>{
 for(const response of [new Response('',{status:503}),new Response('{}'),new Response(JSON.stringify([{...row,latitude:99}]))]) {
  await assert.rejects(fetchPois({fetchImpl:async()=>response}));
 }
 const abort=new AbortController();let forwarded;
 assert.deepEqual(await fetchPois({signal:abort.signal,fetchImpl:async(url,options)=>{forwarded=options.signal;return new Response('[]');}}),[]);
 assert.equal(forwarded,abort.signal);
});
test('store exposes loading/error/empty/retry and suppresses obsolete or unmounted requests',async()=>{
 const pending=[];const store=createPoiStore(({signal})=>new Promise((resolve,reject)=>pending.push({signal,resolve,reject})));
 const a=store.load();const b=store.load();assert.equal(pending[0].signal.aborted,true);
 pending[1].resolve([]);await b;assert.equal(store.getSnapshot().status,'empty');
 pending[0].resolve([row]);await a;assert.equal(store.getSnapshot().status,'empty');
 const c=store.load();pending[2].reject(new Error('offline'));await c;assert.equal(store.getSnapshot().status,'error');assert.deepEqual(store.getSnapshot().records,[]);
 const d=store.load();pending[3].resolve([row]);await d;assert.equal(store.getSnapshot().status,'ready');
 const e=store.load();store.dispose();const snapshot=store.getSnapshot();pending[4].resolve([row]);await e;assert.equal(store.getSnapshot(),snapshot);
});
test('notification gallery validates unique photo sources; distance uses computed meters only',()=>{
 const {notificationImages,formatPoiDistance}=require('../src/poi/notification');
 assert.deepEqual(notificationImages({imageUrl:'https://example.invalid/a.jpg',imageUrls:['https://example.invalid/a.jpg','file:///private','https://example.invalid/b.jpg','https://example.invalid/c.jpg','https://example.invalid/d.jpg']}),['https://example.invalid/a.jpg','https://example.invalid/b.jpg','https://example.invalid/c.jpg']);
 assert.deepEqual(notificationImages({}),[]);
 for(const value of [undefined,null,NaN,Infinity,-1]) assert.equal(formatPoiDistance(value),null);
 assert.equal(formatPoiDistance(12.4),'12 m');assert.equal(formatPoiDistance(1250),'1.3 km');
});
