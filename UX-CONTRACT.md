# PB05–PB06 integration contract

Business source: the user's PB05–PB06 integration criteria (2026-11-14). Database contract: existing public.pois and the read-only MCP verification recorded in mobile/PB05-PB06.md. No policy or live data changes were authorized or made.

| Capability | Canonical owner | Behavior | Verification |
| --- | --- | --- | --- |
| Shared POI source | src/poi/PoiProvider + store | API load once per root session, loading/error/empty/retry, request cancellation, no static fallback | mobile/tests/integration.test.js |
| Trigger lifecycle | src/location/geofence | Per-POI visit, hysteresis, cooldown minimum, deterministic queue and relevance pruning | mobile/tests/geofence.test.js + integration.test.js |
| UI04 | src/components/PoiTriggerModal | One native modal, Figma copy card, scrollable body with persistent primary actions, three gallery slots with fallback, Android back and decline dismiss only current notification | Logic tests; device checklist remains |
| Detail handoff UI05 | src/poi/notification + src/app/poi/[id].js + PoiRoute + PoiDetailScreen | “Cek Sekarang” dismisses then pushes same ID; main's tabbed detail resolves shared records, replaces sample content with real optional fields, and uses existing AudioProvider | integration.test.js + detail.test.js + isolated browser flow |
| Detail directions | src/app/navigation/[id].js + PoiRoute + NavigationScreen | Same provider ID and API coordinates; Router back returns to detail, then Explore; map provider and platform config retained | isolated browser flow + Android bundle; device back pending |
| Foreground GPS | src/hooks/useForegroundLocation + location/tracking | One subscription, permission/services/error recovery, late completion and unmount guards | mobile/tests/tracking.test.js |
| Explore presentation | mobile/App.js + src/screens/ExploreScreen + PoiCardComponents | origin/main layout; contextual loading/error/empty feedback; API records and device GPS only; no development panel, simulation mode or hidden bookmark gesture | Source comparison + local checks; native visual check pending |

GPS is active only in foreground Explore on the root route. Leaving Explore or opening detail suspends presentation and exit evidence while preserving visit/cooldown state in the mounted host. Background return requires a fresh acceptable fix. Restarting the process or replacing the API dataset resets the in-memory session. No location history is persisted or sent to the API. No background-location permission, push, or audio feature is added; the pre-existing audio provider/config is retained.

UI04 Figma follow-up: Directions delegates the same POI ID to the existing navigation flow. Save/itinerary have optional ID callbacks; absent handlers render visibly disabled controls and availability text. Visual source and intentional dynamic-content/accessibility adaptations are recorded in DESIGN.md.

## PB12 Recommendation contract

Source: PB12 task acceptance criterion (UI03, contextual recommendation list directly linked to POI detail); service boundary and schema: `mobile/PB12.md`. Native mobile exploratory list; no web URL-state contract applies to this App.js navigation shell.

| Capability | Canonical owner | Source of truth / behavior | Verification |
| --- | --- | --- | --- |
| Recommendation results | recommendations/service.js + transport.js + store.js | Configured same-backend service; ordered `{items:[{poi,reason}]}` only. No POI-catalogue fallback or client ranking. App-lifetime memory, cancellation/generation guard, timeout, retry. | recommendations.test.js |
| Recommendation list and search | RecommendationPanel + RecommendationSearch | Local filtering preserves service order; clear acts immediately. One FlatList owns scrolling. Session controls/results/scroll survive detail/back. GPS only affects distance; explicit refresh captures a new location context. | recommendation-ui.test.js; browser preview harness; device follow-up |
| Select/Listbox | PoiFilterPicker | Authored RN Modal, labelled options, radio selection, Android back and explicit close; viewport-bounded scrolling. Used for Destination and reviewed minimum rating. | recommendation-ui.test.js; native accessibility follow-up |
| Time filtering | RecommendationPanel + model.js | Open at Night requires service capability and explicit `poi.openAtNight` boolean. Never parse free-form hours. Unsupported filter is disabled with explanation. | recommendations.test.js; recommendation-ui.test.js |
| POI identity/detail | App.handleOpenDetail → existing PoiDetailScreen | Forward the selected POI and unchanged `id`; reuse current App.js navigation. Root Router/PoiProvider/AudioProvider follow current main; App's existing detail handoff is retained. | App Explore → Recommendation → Detail → back component test |
| Card actions | PoiDetailFooter recommendation variant + existing App handlers | Save toggles existing in-memory bookmarks; Directions requires coordinates. Itinerary handler explains that no save occurred until the team implements it; no fake success. | recommendation-ui.test.js |
| Optional data | model.js + PoiImageGallery | Missing location has no example distance; rating needs positive reviewsCount (legacy reviews_count accepted) and a valid rating; images use live POI gallery or labelled fallback. | model/component tests; device follow-up |
| Recovery and development data | RecommendationPanel + src/dev/recommendations.js | Loading, error/retry, unavailable, empty, no-match states. Explicit labelled demo controls only under __DEV__; synthetic response order is never called contextual ranking. | store/component tests; production bundle inspection |

No recommendation persistence, database writes, new location permission, additional GPS watcher, or itinerary storage is introduced. No authentication, billing or deletion workflow is part of PB12. Current main's geofence queue, provider and audio/detail flow are retained. Explore receives the host's shared GPS sample; login/logout resets recommendation state and invalidates old responses.
