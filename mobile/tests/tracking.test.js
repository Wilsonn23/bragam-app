const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startForegroundTracking } = require('../src/location/tracking');
function mock(overrides={}) {return {Accuracy:{High:4},requestForegroundPermissionsAsync:async()=>({status:'granted'}),hasServicesEnabledAsync:async()=>true,watchPositionAsync:async()=>({remove(){}}),getCurrentPositionAsync:async()=>({coords:{latitude:0,longitude:0,accuracy:3},timestamp:1}),...overrides};}
test('permission denied and services disabled never start watcher',async()=>{
 for(const overrides of [{requestForegroundPermissionsAsync:async()=>({status:'denied'})},{hasServicesEnabledAsync:async()=>false}]) {
  let watched=false;let error='';const tracker=startForegroundTracking(mock({...overrides,watchPositionAsync:async()=>{watched=true;}}),()=>assert.fail('unexpected fix'),value=>{error=value;});
  await tracker.ready;tracker.stop();assert.equal(watched,false);assert.match(error,/ditolak|tidak aktif/);
 }
});
test('late subscription is removed after cleanup, emits no late state',async()=>{
 let finish;let removed=0;
 const tracker=startForegroundTracking(mock({watchPositionAsync:()=>new Promise(resolve=>{finish=resolve;})}),()=>assert.fail('late state'),()=>assert.fail('late error'));
 await new Promise(resolve=>setImmediate(resolve));tracker.stop();finish({remove(){removed++;}});await tracker.ready;assert.equal(removed,1);
});
test('one watcher, stale initial read ignored, no updates after stop',async()=>{
 let callback;let removed=0;const fixes=[];
 const tracker=startForegroundTracking(mock({watchPositionAsync:async(_,cb)=>{callback=cb;cb({coords:{latitude:0,longitude:0,accuracy:3},timestamp:10});return {remove(){removed++;}};}}),sample=>fixes.push(sample),()=>assert.fail('error'));
 await tracker.ready;await new Promise(resolve=>setImmediate(resolve));assert.equal(fixes.length,1);tracker.stop();
 callback({coords:{latitude:0,longitude:0},timestamp:20});assert.equal(fixes.length,1);assert.equal(removed,1);
});
test('initial read failure reports recovery error while live watcher can recover',async()=>{
 let callback;const errors=[];const fixes=[];
 const tracker=startForegroundTracking(mock({watchPositionAsync:async(_,cb)=>{callback=cb;return {remove(){}};},getCurrentPositionAsync:async()=>{throw new Error('GPS');}}),value=>fixes.push(value),value=>errors.push(value));
 await tracker.ready;await new Promise(resolve=>setImmediate(resolve));assert.equal(errors.length,1);
 callback({coords:{latitude:0,longitude:0,accuracy:3},timestamp:10});assert.equal(fixes.length,1);tracker.stop();
});
