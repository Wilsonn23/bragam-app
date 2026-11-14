const { test } = require('node:test');
const assert = require('node:assert/strict');
const { distanceMeters } = require('../src/location/distance');
const { adaptPois } = require('../src/poi/adapter');
const { GeofenceController } = require('../src/location/geofence');
const { testPois } = require('../src/dev/fixtures');
const poi = testPois[0];
const fix = (meters, timestamp = 10000, accuracy = 3) => ({ latitude: meters / 111194.9266, longitude: 0, timestamp, accuracy });
const update = (c, meters, time) => c.update(fix(meters, time), time);

test('Haversine returns meters, symmetric, zero, antipodal, invalid', () => {
  assert.ok(Math.abs(distanceMeters({latitude:0,longitude:0},{latitude:0,longitude:1}) - 111194.93) < 0.1);
  assert.equal(distanceMeters(poi,poi),0);
  assert.equal(distanceMeters(poi,testPois[1]),distanceMeters(testPois[1],poi));
  assert.ok(Math.abs(distanceMeters({latitude:0,longitude:0},{latitude:0,longitude:180})-20015086.8)<1);
  assert.ok(Number.isNaN(distanceMeters(null,poi)));
});
test('outside does not trigger; entry emits once, closing does not rearm', () => {
  const c = new GeofenceController([poi]);
  assert.equal(update(c,30,10000).length,0);
  assert.equal(update(c,0,12000).length,1);
  assert.equal(c.current(12000).poiId,poi.id);
  c.dismiss(12000);
  for (let t=14000;t<30000;t+=2000) assert.equal(update(c,1,t).length,0);
  assert.equal(c.current(28000),null);
});
test('confirmed exit followed by entry starts a new visit', () => {
  const c = new GeofenceController([poi]);
  update(c,0,10000); c.dismiss(10000);
  update(c,30,12000);
  assert.equal(c.visits.get(poi.id).inside,true);
  update(c,30,14000);
  assert.equal(c.visits.get(poi.id).inside,false);
  assert.equal(update(c,0,70000)[0].visitId,2);
});
test('boundary jitter and isolated spikes do not spam or rearm', () => {
  const c = new GeofenceController([poi]); update(c,0,10000); c.dismiss(10000);
  [13,11,19,12,30,11,21,19,11].forEach((m,i)=>assert.equal(update(c,m,12000+i*2000).length,0));
  assert.equal(c.visits.get(poi.id).visitId,1);
});
test('exit needs distinct samples AND minimum duration', () => {
  const c = new GeofenceController([poi]); update(c,0,10000);
  update(c,30,11000); update(c,30,11000); update(c,30,11500);
  assert.equal(c.visits.get(poi.id).inside,true);
  update(c,30,13000); assert.equal(c.visits.get(poi.id).inside,false);
});
test('queue is distance then ID ordered, one head and no duplicates', () => {
  const same = {...poi,id:'test-c'};
  const c = new GeofenceController([same,testPois[1],poi]);
  update(c,0,10000);
  assert.deepEqual(c.queue.map(e=>e.poiId),['test-a','test-c','test-b']);
  update(c,0,12000); assert.equal(c.queue.length,3);
  assert.equal(c.current(12000).poiId,'test-a');
  c.dismiss(12000); assert.equal(c.current(12000).poiId,'test-c');
  c.dismiss(12000); assert.equal(c.current(12000).poiId,'test-b');
});
test('each POI can trigger independently', () => {
  const b={...poi,id:'far-b',latitude:0.001};
  const c=new GeofenceController([poi,b]); update(c,0,10000);c.dismiss(10000);
  const events=update(c,111.1949266,12000);
  assert.equal(events[0].poiId,'far-b');
});
test('departed queue items are dropped even before exit is confirmed', () => {
  const c=new GeofenceController(testPois);update(c,0,10000);
  update(c,18,12000);assert.equal(c.current(12000),null);assert.equal(c.queue.length,0);
  assert.equal(c.visits.get(poi.id).inside,true);
});
test('pending item still in range is offered, departed item is skipped', () => {
  const c=new GeofenceController(testPois);update(c,0,10000);
  c.update({latitude:0,longitude:0.00017,accuracy:3,timestamp:12000},12000);
  assert.equal(c.current(12000).poiId,'test-b');
});
test('stale, poor, absent accuracy, invalid and future fixes do not trigger', () => {
  for (const sample of [null,fix(0,-10000),fix(0,30000),fix(0,10000,26),fix(0,10000,null),{...fix(0),latitude:91},{...fix(0),longitude:NaN}]) {
    const c=new GeofenceController([poi]);assert.deepEqual(c.update(sample,10000),[]);
    assert.equal(c.current(10000),null);
  }
});
test('invalid sample interrupts exit evidence; out of order fix is ignored', () => {
  const c=new GeofenceController([poi]);update(c,0,10000);update(c,30,12000);
  c.update(fix(30,13000,100),13000);update(c,30,14000);
  assert.equal(c.visits.get(poi.id).inside,true);
  update(c,0,11000);assert.equal(c.sample.timestamp,14000);
  update(c,30,16000);assert.equal(c.visits.get(poi.id).inside,false);
});
test('expiry and suspension clear notification without rearming current visit', () => {
  const c=new GeofenceController(testPois);update(c,0,10000);
  assert.equal(c.current(25001),null);
  c.suspend();assert.equal(update(c,0,30000).length,0);
  assert.equal(c.current(30000),null);
  assert.equal(update(new GeofenceController(testPois),0,30000).length,2);
});
test('adapter rejects invalid records and duplicate IDs; image is optional', () => {
  assert.deepEqual(adaptPois(null),[]);
  for (const patch of [{latitude:Infinity},{longitude:181},{triggerRadiusMeters:0},{triggerRadiusMeters:-1},{name:''},{id:5}]) {
    assert.equal(adaptPois([{...poi,...patch}]).length,0);
  }
  assert.equal(adaptPois([poi,poi]).length,0);
  assert.equal(adaptPois([{...poi,imageUrl:'file:///private'}])[0].imageUrl,undefined);
  assert.equal(adaptPois([poi])[0].id,poi.id);
});
test('policy is configurable and invalid policy fails explicitly', () => {
  const c=new GeofenceController([poi],{exitMarginMeters:15,exitDurationMs:4000});
  update(c,0,10000);update(c,24,12000);update(c,24,18000);
  assert.equal(c.visits.get(poi.id).inside,true);
  assert.throws(()=>new GeofenceController([poi],{exitSamples:0}));
});
test('long gaps break consecutive exit confirmation', () => {
  const c=new GeofenceController([poi]); update(c,0,10000);update(c,30,12000);
  update(c,30,30000); assert.equal(c.visits.get(poi.id).inside,true);
  update(c,30,32000); assert.equal(c.visits.get(poi.id).inside,false);
});
test('invalid location clears queued notifications without creating another visit', () => {
  const c=new GeofenceController(testPois);update(c,0,10000);
  c.update(fix(0,12000,80),12000);assert.equal(c.current(12000),null);
  assert.equal(update(c,0,14000).length,0);
});
