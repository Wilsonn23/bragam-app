// Pure helpers for the POI Menu tab. Kept framework-free so node tests can cover them.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/**
 * @typedef {{id:string, category:string, name:string, description:string|null,
 *   priceIdr:number|null, source:string, sourceUrl:string|null, checkedOn:string|null}} MenuItem
 * @typedef {{category:string, items:MenuItem[]}} MenuGroup
 * @typedef {{label:string, url:string|null, checkedOn:string|null}} MenuSource
 */

const text = (/** @type {unknown} */ value) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

/** Keep only renderable items from an API response, in the order the API sent them.
 * @param {unknown} data @returns {MenuItem[]}
 */
function normalizeMenuItems(data) {
  if (!Array.isArray(data)) return [];
  return data.flatMap((item, index) => {
    const name = text(item?.name);
    if (!name) return [];
    const price = Number(item.priceIdr);
    const url = text(item.sourceUrl);
    return [{
      id: String(item.id ?? index),
      category: text(item.category) || 'Menu',
      name,
      description: text(item.description),
      priceIdr: item.priceIdr !== null && item.priceIdr !== undefined && Number.isInteger(price) && price >= 0 ? price : null,
      source: text(item.source) || 'Sumber tidak diketahui',
      sourceUrl: url && /^https?:\/\//i.test(url) ? url : null,
      checkedOn: text(item.checkedOn),
    }];
  });
}

/** Group items by category, keeping the first-seen order of categories and items.
 * @param {MenuItem[]} items @returns {MenuGroup[]}
 */
function groupMenuByCategory(items) {
  /** @type {Map<string, MenuItem[]>} */
  const groups = new Map();
  for (const item of items) {
    const list = groups.get(item.category) || [];
    list.push(item);
    groups.set(item.category, list);
  }
  return [...groups].map(([category, list]) => ({ category, items: list }));
}

/** 26000 -> "Rp26.000"; null when there is no price. Avoids Intl for Hermes builds without it.
 * @param {number|null} value @returns {string|null}
 */
function formatRupiah(value) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return null;
  return `Rp${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

/** "2026-11-27" -> "27 Nov 2026"; null for anything else.
 * @param {string|null} value @returns {string|null}
 */
function formatCheckedOn(value) {
  const match = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return `${Number(match[3])} ${MONTHS[month - 1]} ${match[1]}`;
}

/** Distinct sources (by label) in first-seen order, for the attribution footer.
 * @param {MenuItem[]} items @returns {MenuSource[]}
 */
function menuSources(items) {
  /** @type {Map<string, MenuSource>} */
  const sources = new Map();
  for (const item of items) {
    if (!sources.has(item.source)) {
      sources.set(item.source, { label: item.source, url: item.sourceUrl, checkedOn: item.checkedOn });
    }
  }
  return [...sources.values()];
}

module.exports = { normalizeMenuItems, groupMenuByCategory, formatRupiah, formatCheckedOn, menuSources };
