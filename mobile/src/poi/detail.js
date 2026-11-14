const { pois } = require('./adapter');

// The same PB03 records serve triggers and detail; simulations are explicitly isolated.
function findPoi(id, records = pois) {
  return typeof id === 'string' ? records.find(poi => poi.id === id) || null : null;
}
module.exports = { findPoi };
