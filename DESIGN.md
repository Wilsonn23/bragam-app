# BRAGAm mobile

Product UI in Indonesian for visitors exploring Jalan Braga. PB05–PB06 extends the existing GPS screen; no UI04 wireframe or brand system exists in this checkout.

Keep the existing white background, gray cards, eight-point corner radius and native system font. Runtime palette owner: `mobile/src/components/theme.js`: background #ffffff, surface #f0f0f0, ink #172338, muted #4b596b, primary #164b86, error #a52222. The blue primary action replaces the original blue spinner as the shared action color. Use native bold system type for titles (22–24), regular 16 for body, 14 for category. Space content in 16–20 point intervals; controls have a minimum 48 point height and grow with text.

UI04's identifying structure is category, fixed photo/fallback region, full destination name and description, then stacked “Lihat Detail” and “Tutup notifikasi” actions. Content scrolls within the modal; safe-area insets surround it. No truncated titles, invented ratings, prices or photo assets. Native scroll indicators remain available. No custom animation. Keep debug controls clearly labeled and development-only.

Canonical modal: `PoiTriggerModal`; canonical buttons: `ActionButton`; behavior contract: `UX-CONTRACT.md`. Native Android back uses the same dismissal as the close button. The existing GPS screen is the sibling style reference. Native rendering, dynamic text and screen-reader checks remain device validation tasks.
