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
 let query=''; const app=createApp({query:async sql=>{
  if (/FROM poi_images|FROM poi_ratings/.test(sql)) return {rows:[]};
  query=sql;return {rows:[row]};
 }});
 const server=app.listen(0,'127.0.0.1');t.after(()=>server.close());
 await new Promise(resolve=>server.once('listening',resolve));
 const response=await fetch(`http://127.0.0.1:${server.address().port}/api/pois`);
 const records=await response.json();assert.equal(response.status,200);assert.equal(records[0].id,'P01');assert.equal(records[0].cooldownSeconds,60);
 assert.match(query,/notification_body/);assert.match(query,/cooldown_seconds/);
});

for (const path of ['/api/pois', '/api/pois/P01', '/api/pois/nearby?latitude=-6.91775&longitude=107.60912']) {
 test(`HTTP ${path} preserves database detail fields and gallery together`, async t => {
  const detail = {...row, address:'Jl. Braga No. 58', history:'Sejarah destinasi',
   opening_hours:'09:00 - 22:00', menu_highlights:'Steak dan es krim',
   // Seeded CSV values on the row; the response must use poi_ratings instead.
   price_min:45000, price_max:180000, rating:'4.6', reviews_count:1280};
  const queries=[];
  const app=createApp({query:async(sql, params)=>{
   queries.push({sql, params});
   if (/FROM poi_ratings/.test(sql)) return {rows:[{poi_id:'P01', average_rating:'3.5', review_count:'2'}]};
   if (/FROM poi_images/.test(sql)) return {rows:[
    {id:1, poi_id:'P01', image_url:'https://example.invalid/first.jpg', alt_text:'Foto pertama', sort_order:0},
    {id:2, poi_id:'P01', image_url:'https://example.invalid/second.jpg', sort_order:1},
   ]};
   return {rows:[detail]};
  }});
  const server=app.listen(0,'127.0.0.1');t.after(()=>server.close());
  await new Promise(resolve=>server.once('listening',resolve));
  const response=await fetch(`http://127.0.0.1:${server.address().port}${path}`);
  assert.equal(response.status,200);
  const body=await response.json();const poi=Array.isArray(body)?body[0]:body;
  assert.equal(poi.address,detail.address);
  assert.equal(poi.openingHours,detail.opening_hours);
  assert.equal(poi.menuHighlights,detail.menu_highlights);
  assert.equal(poi.priceMin,45000);assert.equal(poi.priceMax,180000);
  assert.equal(poi.rating,3.5);assert.equal(poi.reviewsCount,2);
  assert.equal(poi.history,detail.history);
  assert.equal(poi.imageUrl,'https://example.invalid/first.jpg');
  assert.deepEqual(poi.images.map(image=>image.imageUrl),[
   'https://example.invalid/first.jpg','https://example.invalid/second.jpg',
  ]);
  for (const field of ['address','opening_hours','menu_highlights','price_min','price_max','rating','reviews_count','notification_body','cooldown_seconds']) {
   assert.match(queries[0].sql,new RegExp(`\\b${field}\\b`));
  }
  assert.equal(queries.length,3);
  const ratingQuery=queries.find(q=>/FROM poi_ratings/.test(q.sql));
  const imageQuery=queries.find(q=>/FROM poi_images/.test(q.sql));
  assert.deepEqual(ratingQuery.params,[['P01']]);
  assert.deepEqual(imageQuery.params,[['P01']]);
 });
}
test('database errors return HTTP error, never synthetic POIs', async t => {
 const app=createApp({query:async()=>{throw {code:'TEST_ERROR'};}});const server=app.listen(0,'127.0.0.1');t.after(()=>server.close());
 await new Promise(resolve=>server.once('listening',resolve));
 const response=await fetch(`http://127.0.0.1:${server.address().port}/api/pois`);
 assert.equal(response.status,500);assert.deepEqual(await response.json(),{error:'Database request failed.'});
});
