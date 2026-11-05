# PB05–PB06 UI contract

Source: requested PB05/PB06 acceptance criteria; technical policy and data contract: `mobile/PB05-PB06.md`.

| Capability | Owner | Behavior | Verification |
| --- | --- | --- | --- |
| Notification modal UI04 | mobile/src/components/PoiTriggerModal.js | One queue head; Android back and close dismiss the same visit; long text scrolls; missing/error image fallback | mobile/tests/geofence.test.js for state; device checklist in mobile/PB05-PB06.md for native UI |
| Trigger lifecycle and queue | mobile/src/location/geofence.js | Per-POI visit, deterministic ordering and relevance checks | mobile/tests/geofence.test.js |
| Detail handoff UI05 | App.onOpenPoiDetail(poiId) | Dismiss current notification, show received ID in development; replace callback with Expo Router when UI05 is available | Development simulation; route implementation deferred |
| Location feedback | useForegroundLocation + App | Permission/services/read failures show recovery action; one foreground watcher | lint/typecheck/export plus device checklist |

No persistent location history, server writes, background permissions, audio or push notification are introduced. Data lifecycle: visit state exists in memory only. Permission behavior follows the existing foreground-location flow and the requested scope. No billing, deletion or legal flow applies.
