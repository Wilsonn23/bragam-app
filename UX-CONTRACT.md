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
| Explore presentation | mobile/App.js + src/screens/ExploreScreen + PoiCardComponents | origin/main layout; no persistent healthy-GPS banner; contextual loading/error/empty feedback; development controls behind bookmark long-press; closing tools exits simulation | Source comparison + local checks; native visual check pending |

GPS is active only in foreground Explore on the root route. Leaving Explore or opening detail suspends presentation and exit evidence while preserving visit/cooldown state in the mounted host. Background return requires a fresh acceptable fix. Restarting the process or switching the explicit development dataset resets the in-memory session. No location history is persisted or sent to the API. No background-location permission, push, or audio feature is added; the pre-existing audio provider/config is retained.

UI04 Figma follow-up: Directions delegates the same POI ID to the existing navigation flow. Save/itinerary have optional ID callbacks; absent handlers render visibly disabled controls and availability text. Visual source and intentional dynamic-content/accessibility adaptations are recorded in DESIGN.md.
