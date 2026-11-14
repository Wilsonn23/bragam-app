const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');
const { toPoiResponse } = require('../poiResponse');
const row = { id:'P01', name:'Uji', category:'Uji', latitude:'-6.91775', longitude:'107.60912', radius_meters:12, cooldown_seconds:60, description:'Deskripsi uji', notification_title:'Judul uji', notification_body:null };
test('POI response preserves identity, coordinates, radius, cooldown and nullable body', () => {
 const p=toPoiResponse(row); assert.equal(p.id,'P01');assert.equal(p.latitude,-6.91775);assert.equal(p.triggerRadiusMeters,12);assert.equal(p.cooldownSeconds,60);assert.equal(p.notificationBody,null);
 assert.equal(toPoiResponse({...row,cooldown_seconds:90}).cooldownSeconds,90);
 assert.equal(toPoiResponse({...row,cooldown_seconds:null}).cooldownSeconds,60);
});
test('HTTP /api/pois exposes database rows including notification fields', async t => {
 let query=''; const app=createApp({query:async sql=>{query=sql;return {rows:[row]};}});
 const server=app.listen(0,'127.0.0.1');t.after(()=>server.close());
 await new Promise(resolve=>server.once('listening',resolve));
 const response=await fetch(`http://127.0.0.1:${server.address().port}/api/pois`);
 const records=await response.json();assert.equal(response.status,200);assert.equal(records[0].id,'P01');assert.equal(records[0].cooldownSeconds,60);
 assert.match(query,/notification_body/);assert.match(query,/cooldown_seconds/);
});
test('database errors return HTTP error, never synthetic POIs', async t => {
 const app=createApp({query:async()=>{throw {code:'TEST_ERROR'};}});const server=app.listen(0,'127.0.0.1');t.after(()=>server.close());
 await new Promise(resolve=>server.once('listening',resolve));
 const response=await fetch(`http://127.0.0.1:${server.address().port}/api/pois`);
 assert.equal(response.status,500);assert.deepEqual(await response.json(),{error:'Database request failed.'});
});
