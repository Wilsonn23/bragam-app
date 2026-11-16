const { test } = require('node:test');
const assert = require('node:assert/strict');
const { startForegroundTracking } = require('../src/location/tracking');
function mock(overrides={}) {return {Accuracy:{High:4},requestForegroundPermissionsAsync:async()=>({status:'granted'}),hasServicesEnabledAsync:async()=>true,watchPositionAsync:async()=>({remove(){}}),getCurrentPositionAsync:async()=>({coords:{latitude:0,longitude:0,accuracy:3},timestamp:1}),...overrides};}
test('permission denied never starts watcher',async()=>{
 let watched=false;let error='';
 const tracker=startForegroundTracking(mock({requestForegroundPermissionsAsync:async()=>({status:'denied'}),watchPositionAsync:async()=>{watched=true;}}),()=>assert.fail('unexpected fix'),value=>{error=value;});
 await tracker.ready;tracker.stop();assert.equal(watched,false);assert.match(error,/ditolak/);
});
test('disabled services do not block Android native settings recovery and a real fix',async()=>{
 let checks=0;let watches=0;const fixes=[];
 const tracker=startForegroundTracking(mock({hasServicesEnabledAsync:async()=>{checks++;return false;},watchPositionAsync:async(options,accept)=>{
  watches++;assert.equal(options.mayShowUserSettingsDialog,true);
  accept({coords:{latitude:0,longitude:0,accuracy:3},timestamp:10});return {remove(){}};
 }}),value=>fixes.push(value),()=>assert.fail('native settings recovery was blocked'));
 await tracker.ready;tracker.stop();assert.equal(checks,0);assert.equal(watches,1);assert.equal(fixes.length,1);
});
test('declining native location settings reports an error without producing a location',async()=>{
 const errors=[];
 const tracker=startForegroundTracking(mock({watchPositionAsync:async()=>{throw Object.assign(new Error('settings declined'),{code:'ERR_LOCATION_SETTINGS_UNSATISFIED'});},getCurrentPositionAsync:()=>assert.fail('no initial read without watcher')}),()=>assert.fail('no synthetic position'),value=>errors.push(value));
 await tracker.ready;tracker.stop();assert.equal(errors.length,1);assert.match(errors[0],/Izinkan permintaan lokasi Android/);
});
test('waiting for native settings does not consume the GPS-fix timeout',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let finish;const errors=[];
 const tracker=startForegroundTracking(mock({watchPositionAsync:()=>new Promise(resolve=>{finish=resolve;}),getCurrentPositionAsync:()=>new Promise(()=>{})}),()=>assert.fail('no fix yet'),value=>errors.push(value));
 await new Promise(resolve=>setImmediate(resolve));t.mock.timers.tick(30000);assert.equal(errors.length,0);
 finish({remove(){}});await tracker.ready;t.mock.timers.tick(19999);assert.equal(errors.length,0);
 t.mock.timers.tick(1);assert.equal(errors.length,1);tracker.stop();
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
