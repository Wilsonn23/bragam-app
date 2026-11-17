# PB05–PB06 UI contract

Source: requested PB05/PB06 acceptance criteria; technical policy and data contract: `mobile/PB05-PB06.md`.

| Capability | Owner | Behavior | Verification |
| --- | --- | --- | --- |
| Notification modal UI04 | mobile/src/components/PoiTriggerModal.js | One queue head; Android back and close dismiss the same visit; long text scrolls; missing/error image fallback | mobile/tests/geofence.test.js for state; device checklist in mobile/PB05-PB06.md for native UI |
| Trigger lifecycle and queue | mobile/src/location/geofence.js | Per-POI visit, deterministic ordering and relevance checks | mobile/tests/geofence.test.js |
| Detail handoff UI05 | App.onOpenPoiDetail(poiId) | Dismiss current notification, show received ID in development; replace callback with Expo Router when UI05 is available | Development simulation; route implementation deferred |
| Location feedback | useForegroundLocation + App | Permission/services/read failures show recovery action; one foreground watcher | lint/typecheck/export plus device checklist |

No persistent location history, server writes, background permissions, audio or push notification are introduced. Data lifecycle: visit state exists in memory only. Permission behavior follows the existing foreground-location flow and the requested scope. No billing, deletion or legal flow applies.

## PB12 Recommendation contract

Source: PB12 task acceptance criterion (UI03, contextual recommendation list directly linked to POI detail); service boundary and schema: `mobile/PB12.md`. Native mobile exploratory list; no web URL-state contract applies to this App.js navigation shell.

| Capability | Canonical owner | Source of truth / behavior | Verification |
| --- | --- | --- | --- |
| Recommendation results | recommendations/service.js + transport.js + store.js | Configured same-backend service; ordered `{items:[{poi,reason}]}` only. No POI-catalogue fallback or client ranking. App-lifetime memory, cancellation/generation guard, timeout, retry. | recommendations.test.js |
| Recommendation list and search | RecommendationPanel + RecommendationSearch | Local filtering preserves service order; clear acts immediately. One FlatList owns scrolling. Session controls/results/scroll survive detail/back. GPS only affects distance; explicit refresh captures a new location context. | recommendation-ui.test.js; browser preview harness; device follow-up |
| Select/Listbox | PoiFilterPicker | Authored RN Modal, labelled options, radio selection, Android back and explicit close; viewport-bounded scrolling. Used for Destination and reviewed minimum rating. | recommendation-ui.test.js; native accessibility follow-up |
| Time filtering | RecommendationPanel + model.js | Open at Night requires service capability and explicit `poi.openAtNight` boolean. Never parse free-form hours. Unsupported filter is disabled with explanation. | recommendations.test.js; recommendation-ui.test.js |
| POI identity/detail | App.handleOpenDetail → existing PoiDetailScreen | Forward the selected POI and unchanged `id`; reuse current App.js navigation. Dormant Router entry is not migrated as part of PB12. | App Explore → Recommendation → Detail → back component test |
| Card actions | PoiDetailFooter recommendation variant + existing App handlers | Save toggles existing in-memory bookmarks; Directions requires coordinates. Itinerary handler explains that no save occurred until the team implements it; no fake success. | recommendation-ui.test.js |
| Optional data | model.js + PoiImageGallery | Missing location has no example distance; rating needs positive reviews_count and a valid rating; images use live POI gallery or labelled fallback. | model/component tests; device follow-up |
| Recovery and development data | RecommendationPanel + src/dev/recommendations.js | Loading, error/retry, unavailable, empty, no-match states. Explicit labelled demo controls only under __DEV__; synthetic response order is never called contextual ranking. | store/component tests; production bundle inspection |

No recommendation persistence, database writes, new location permission, additional GPS watcher, or itinerary storage is introduced. No authentication, billing or deletion workflow is part of PB12. The old PB05 implementation and current main's manual notification handoff are preserved; PB12 does not claim to repair integrations absent from main.
