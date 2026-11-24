const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createStopDrag, resolveStopDrag, swapStopsByKey, previewSwapOffsets } = require('../src/utils/stopReorder');
const keys = ['a', 'b', 'c', 'd'];
const heights = { a:60, b:100, c:80, d:120 };

test('drag is bounded by the list even when the first and last cards are shorter', () => {
  const drag = createStopDrag(keys, { a:40, b:100, c:80, d:50 }, 'b');
  assert.deepEqual(resolveStopDrag(drag, 0), { translation:0, target:1 });
  assert.deepEqual(resolveStopDrag(drag, -1000), { translation:-40, target:0 });
  assert.deepEqual(resolveStopDrag(drag, 1000), { translation:130, target:3 });
  assert.deepEqual(resolveStopDrag(createStopDrag(keys, heights, 'a'), -1000), { translation:0, target:0 });
  assert.equal(createStopDrag(keys, {a:40}, 'b'), null);
});

test('swapping nonadjacent rows exchanges only source and target, preserving IDs and data', () => {
  const stops = keys.map((stopKey, i) => ({ stopKey, id: `P0${i+1}`, time: `${9+i}.00` }));
  const down = swapStopsByKey(stops, 'a', 3);
  assert.deepEqual(down.map(x => x.stopKey), ['d','b','c','a']);
  assert.equal(down[3], stops[0]);
  assert.equal(down[0], stops[3]);
  const up = swapStopsByKey(down, 'a', 0);
  assert.deepEqual(up.map(x => x.stopKey), keys);
  assert.equal(swapStopsByKey(stops, 'missing', 1), stops);
  assert.equal(swapStopsByKey(stops, 'a', -1), stops);
  assert.equal(swapStopsByKey(stops, 'd', 4), stops);
  assert.equal(swapStopsByKey(stops, 'b', 1), stops);
  assert.deepEqual(stops.map(x => x.stopKey), keys);
});
test('live hover moves the target to the original slot, even with fractional row heights', () => {
  const drag = createStopDrag(keys, { ...heights, a:60.25, d:120.5 }, 'a');
  const firstHover = resolveStopDrag(drag, 60);
  assert.equal(firstHover.target, 1);
  assert.equal(previewSwapOffsets(drag, firstHover.target).b, -60.25);
  const lastHover = resolveStopDrag(drag, 310);
  assert.equal(lastHover.target, 3);
  const offsets = previewSwapOffsets(drag, lastHover.target);
  assert.deepEqual(offsets, { d:-240.25, b:60.25, c:60.25, a:300.5 });
  assert.equal(offsets.a, drag.dropOffsets[lastHover.target]);
  assert.deepEqual(previewSwapOffsets(drag, resolveStopDrag(drag, 0).target), {});
});

test('dragging upward swaps with the crossed row and keeps the row between them in place', () => {
  const equal = { a:50, b:50, c:50, d:50 };
  const drag = createStopDrag(keys, equal, 'c');
  const frame = resolveStopDrag(drag, -85);
  assert.deepEqual(frame, { translation:-85, target:0 });
  assert.deepEqual(previewSwapOffsets(drag, frame.target), { c:-100, b:0, a:100, d:0 });
});
