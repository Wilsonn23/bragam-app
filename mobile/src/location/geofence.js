const { distanceMeters, validCoordinate } = require('./distance');
const { adaptPois } = require('../poi/adapter');
const DEFAULT_POLICY = Object.freeze({ exitMarginMeters: 8, exitSamples: 2, exitDurationMs: 2000, maxAgeMs: 15000, maxAccuracyMeters: 25 });
/** @typedef {{latitude:number, longitude:number, accuracy:number, timestamp:number}} Sample */
/** Stateful, UI-independent controller. Queue head is the only visible notification. */
class GeofenceController {
  constructor(pois, policy = {}) {
    this.pois = adaptPois(pois);
    this.policy = { ...DEFAULT_POLICY, ...policy };
    for (const [key, value] of Object.entries(this.policy)) {
      if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid geofence policy: ${key}`);
    }
    if (!Number.isInteger(this.policy.exitSamples) || this.policy.exitSamples < 2) throw new Error('exitSamples must be >= 2');
    this.visits = new Map();
    this.queue = [];
    /** @type {Sample | null} */
    this.sample = null;
    this.lastTimestamp = -Infinity;
  }
  /** @param {Sample} sample */
  usable(sample, now) {
    return validCoordinate(sample) && Number.isFinite(sample.timestamp) && sample.timestamp <= now &&
      now - sample.timestamp <= this.policy.maxAgeMs && Number.isFinite(sample.accuracy) &&
      sample.accuracy >= 0 && sample.accuracy <= this.policy.maxAccuracyMeters;
  }
  /** @param {Sample} sample */
  update(sample, now = Date.now()) {
    if (!this.usable(sample, now)) { this.suspend(); return []; }
    // A repeated/cached/out-of-order fix cannot count toward exit confirmation.
    if (sample.timestamp <= this.lastTimestamp) return [];
    if (this.sample && sample.timestamp - this.sample.timestamp > this.policy.maxAgeMs) {
      for (const visit of this.visits.values()) { visit.exitCount = 0; visit.exitSince = null; }
    }
    this.sample = sample;
    this.lastTimestamp = sample.timestamp;
    const events = [];
    for (const poi of this.pois) {
      const distance = distanceMeters(sample, poi);
      const visit = this.visits.get(poi.id) || { inside: false, visitId: 0, triggered: false, exitCount: 0, exitSince: null };
      if (!visit.inside && distance <= poi.triggerRadiusMeters) {
        visit.inside = true;
        visit.visitId += 1;
        visit.triggered = false;
      }
      if (visit.inside) {
        if (distance > poi.triggerRadiusMeters + this.policy.exitMarginMeters) {
          visit.exitSince ??= sample.timestamp;
          visit.exitCount += 1;
          if (visit.exitCount >= this.policy.exitSamples && sample.timestamp - visit.exitSince >= this.policy.exitDurationMs) {
            visit.inside = false;
            visit.triggered = false;
          }
        } else { visit.exitCount = 0; visit.exitSince = null; }
        if (visit.inside && !visit.triggered) {
          visit.triggered = true;
          events.push({ poi, poiId: poi.id, visitId: visit.visitId, distanceMeters: distance });
        }
      } else { visit.exitCount = 0; visit.exitSince = null; }
      this.visits.set(poi.id, visit);
    }
    events.sort((a, b) => a.distanceMeters - b.distanceMeters || (a.poiId < b.poiId ? -1 : a.poiId > b.poiId ? 1 : 0));
    for (const event of events) if (!this.queue.some(e => e.poiId === event.poiId && e.visitId === event.visitId)) this.queue.push(event);
    this.prune(now);
    return events;
  }
  relevant(event, now) {
    const visit = this.visits.get(event.poiId);
    return this.sample && this.usable(this.sample, now) && visit?.inside && visit.visitId === event.visitId &&
      distanceMeters(this.sample, event.poi) <= event.poi.triggerRadiusMeters;
  }
  prune(now = Date.now()) { this.queue = this.queue.filter(event => this.relevant(event, now)); }
  current(now = Date.now()) { this.prune(now); return this.queue[0] || null; }
  dismiss(now = Date.now()) { this.prune(now); this.queue.shift(); return this.current(now); }
  // Preserve visits, discard stale presentation, break consecutive exit evidence.
  suspend() {
    this.sample = null;
    this.queue = [];
    for (const visit of this.visits.values()) { visit.exitCount = 0; visit.exitSince = null; }
  }
}
module.exports = { GeofenceController, DEFAULT_POLICY };
