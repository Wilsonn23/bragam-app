const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NotificationPresentation } = require('../src/location/presentation');

test('presented event survives stale GPS and does not dismiss a newer event', () => {
  const presentation = new NotificationPresentation();
  const first = { poiId: 'P01' }, next = { poiId: 'P02' };
  let head = first;
  const controller = { current: () => head, dismiss: () => { head = null; } };
  presentation.capture(head);
  head = null; // Geofence event is no longer relevant or GPS has stopped.
  presentation.capture(head);
  assert.equal(presentation.current(), first);
  head = next;
  presentation.capture(next);
  assert.equal(presentation.current(), first);
  presentation.dismiss(controller);
  assert.equal(presentation.current(), next);
  presentation.dismiss(controller);
  assert.equal(presentation.current(), null);
});
