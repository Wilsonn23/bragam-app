const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRouteRequestTracker } = require('../src/utils/routeRequestTracker');
test('small GPS changes preserve the pending request, new selection supersedes it, and retry starts again', () => {
  const tracker = createRouteRequestTracker((a,b) => Math.abs(a.latitude-b.latitude));
  const origin = {latitude:0,longitude:0}, destination={latitude:100,longitude:0};
  const first=tracker.start('a',origin,destination);
  assert.equal(tracker.start('a',{latitude:5,longitude:0},destination),null);
  assert.equal(tracker.isCurrent(first),true);
  const second=tracker.start('b',origin,destination);
  assert.equal(tracker.isCurrent(first),false);
  assert.equal(tracker.isCurrent(second),true);
  assert.equal(tracker.start('b',origin,destination),null);
  tracker.retry();
  const third=tracker.start('b',origin,destination);
  assert.ok(third>second);
  tracker.dispose();
  assert.equal(tracker.isCurrent(third),false);
});
