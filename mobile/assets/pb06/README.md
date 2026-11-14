# UI04 assets

Source: Figma copy `5MJzy7VlHWVrTYky8yR0sI`, node `5:1983`, popup group `5:2005` (read 2026-11-14).

Downloaded unchanged SVGs from the design-context asset URLs. SVG root dimensions are preserved; Metro's SVG transformer keeps dimensions and geometry. Its sole SVGO operation removes the browser-only root display style in generated native code; the source SVG files are unchanged. No temporary URL is used at runtime.

| File | Design layer / slot | Root dimensions |
| --- | --- | --- |
| placeholder.svg | 5:2122, 5:2126, 5:2130 / gallery fallback | 117.316 × 106.712 |
| chevron.svg | 5:2053 / Cek Sekarang | 22.8021 × 24.875 |
| direction.svg | 5:2105 / Directions | 24 × 24 |
| bookmark.svg | 5:2110 / Save | 20 × 20 |
| ring.svg | 5:2115 / itinerary circle | 24 × 24 |
| plus.svg | 5:2116 / itinerary plus | 14 × 14 |
| badge.svg | 5:2137 / pin backing | 34 × 34 |
| pin.svg | 5:2138 / location glyph | 16.0002 × 20.01 |

Every asset is rendered by `src/components/PoiNotificationCard.js`. Data-supplied POI photos remain dynamic. No rating or sample 12km is copied from the mock data.
