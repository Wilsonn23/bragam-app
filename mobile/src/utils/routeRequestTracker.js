// Keep an in-flight route through small GPS updates and reject obsolete responses.
function createRouteRequestTracker(distanceMeters) {
  let previous = null;
  let generation = 0;
  return {
    start(key, origin, destination) {
      if (previous && previous.key === key &&
          distanceMeters(previous.origin, origin) < 12 &&
          distanceMeters(previous.destination, destination) < 12) return null;
      previous = { key, origin: { ...origin }, destination: { ...destination } };
      return ++generation;
    },
    isCurrent(requestId) { return requestId === generation; },
    retry() { previous = null; },
    dispose() { generation++; previous = null; },
  };
}
module.exports = { createRouteRequestTracker };
