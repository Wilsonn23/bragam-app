# BRAGAm mobile

## PB12 Explore Recommendation (current surface)

Reference: Figma file `5MJzy7VlHWVrTYky8yR0sI`, node `5:1242`, inspected 17 November 2026. The composed screen is Explore's existing map and bottom sheet, not a new navigation destination. The reference's lavender dividers, horizontal photo strip, two-segment selector and rounded purple actions are its identifying structure. Existing Explore, tab bar, photo gallery and `PoiDetailFooter` remain the owners; the footer's `recommendation` variant wraps for small screens and long labels.

Runtime tokens remain canonical (Model B): `mobile/src/components/theme.js` owns `COLORS.primaryPurple` (#5B2BBF), `darkPurple` (#35166F), `softLilacBg` (#F9F7FD), `lavenderTint` (#EAE2F8), text and border roles, and `RADIUS`. PB12 reuses this shared palette rather than changing sibling screens. `RecommendationPanel` owns its list/filter/status layout; `PoiFilterPicker` owns the new accessible native-modal picker. Plus Jakarta Sans, used by the Figma reference, is bundled locally under `mobile/assets/fonts` with its OFL license; `App` loads it as `PB12Jakarta`, and PB12 text/inputs and the recommendation footer use that family. Other screens retain their typography.

The reference's crossed photos are placeholders, not assets to repeat in production. Dynamic `imageUrl`/`images` from the POI contract flow into `PoiImageGallery`; absent or failed images display a labelled lavender fallback with reserved geometry. Existing vector icon families supply the shared pin, stars, directions, bookmark, plus and chevron. Native Maps supplies the map background. No Figma screenshot or temporary asset URL is used in application code.

Controls have at least 44-point action height and grow with text. Recommendation owns one vertical FlatList, with horizontal gallery/filter scrollers. Its sheet height is bounded by the actual content viewport so the existing bottom navigation remains reachable; keyboard shrink is applied within this panel. The already-present sheet expansion/drag behavior is reused. Product labels retained from the English Figma design coexist with Indonesian recovery messages, matching the current app's vocabulary. System font fallback is used if local font loading fails; native font scaling, safe areas and map rendering still require device checks.

The historical PB05-only notes below describe the older GPS UI and do not define the current Explore Recommendation surface.

## Historical PB05 style notes

Product UI in Indonesian for visitors exploring Jalan Braga. PB05–PB06 extends the existing GPS screen; no UI04 wireframe or brand system exists in this checkout.

Keep the existing white background, gray cards, eight-point corner radius and native system font. Runtime palette owner: `mobile/src/components/theme.js`: background #ffffff, surface #f0f0f0, ink #172338, muted #4b596b, primary #164b86, error #a52222. The blue primary action replaces the original blue spinner as the shared action color. Use native bold system type for titles (22–24), regular 16 for body, 14 for category. Space content in 16–20 point intervals; controls have a minimum 48 point height and grow with text.

UI04's identifying structure is category, fixed photo/fallback region, full destination name and description, then stacked “Lihat Detail” and “Tutup notifikasi” actions. Content scrolls within the modal; safe-area insets surround it. No truncated titles, invented ratings, prices or photo assets. Native scroll indicators remain available. No custom animation. Keep debug controls clearly labeled and development-only.

Canonical modal: `PoiTriggerModal`; canonical buttons: `ActionButton`; behavior contract: `UX-CONTRACT.md`. Native Android back uses the same dismissal as the close button. The existing GPS screen is the sibling style reference. Native rendering, dynamic text and screen-reader checks remain device validation tasks.
