// Rows are contiguous. Accumulate their heights so native rounding of each row's
// reported y coordinate cannot invalidate a drag.
function createStopDrag(keys, heights, sourceKey) {
  const from = keys.indexOf(sourceKey);
  const rowHeights = keys.map(key => heights[key]);
  if (from < 0 || rowHeights.some(height => !Number.isFinite(height) || height <= 0)) return null;

  let height = 0;
  const tops = rowHeights.map(rowHeight => {
    const top = height;
    height += rowHeight;
    return top;
  });
  const sourceTop = tops[from];
  const sourceHeight = rowHeights[from];
  const minOffset = 0 - sourceTop;
  const maxOffset = height - sourceHeight - sourceTop;
  const dropOffsets = tops.map((top, index) =>
    top - sourceTop + (index > from ? rowHeights[index] - sourceHeight : 0));

  return { keys, rowHeights, tops, from, minOffset, maxOffset, dropOffsets };
}

function resolveStopDrag(drag, offset) {
  const translation = Math.max(drag.minOffset, Math.min(drag.maxOffset, offset));
  const { dropOffsets } = drag;
  const next = dropOffsets.findIndex((position, index) =>
    index < dropOffsets.length - 1 && translation < (position + dropOffsets[index + 1]) / 2);
  return { translation, target: next < 0 ? dropOffsets.length - 1 : next };
}

// The selected row and target exchange positions; intermediate rows retain their order.
function swapStopsByKey(stops, key, targetIndex) {
  const from = stops.findIndex(stop => stop.stopKey === key);
  if (from < 0 || !Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= stops.length || from === targetIndex) return stops;
  const reordered = stops.slice();
  [reordered[from], reordered[targetIndex]] = [reordered[targetIndex], reordered[from]];
  return reordered;
}

// Preview the same positions that will be rendered after the swap.
function previewSwapOffsets(drag, targetIndex) {
  const { keys, rowHeights, tops, from } = drag;
  if (from === targetIndex) return {};
  const order = keys.map((_, index) => index);
  [order[from], order[targetIndex]] = [order[targetIndex], order[from]];
  let top = 0;
  return Object.fromEntries(order.map(index => {
    const offset = top - tops[index];
    top += rowHeights[index];
    return [keys[index], offset];
  }));
}
module.exports = { createStopDrag, resolveStopDrag, swapStopsByKey, previewSwapOffsets };
