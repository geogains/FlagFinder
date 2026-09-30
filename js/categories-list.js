// js/categories-list.js
// Shared category list derivation — the single place that turns
// categoriesConfig into the sorted, deduplicated list used for display.
//
// Used by both the browser (categories.html, via renderCategories()) and the
// static-HTML generator (scripts/generate-categories-html.mjs) so the
// no-JS category grid and the JS-rendered one can never drift out of sync.
// categories-config.js stays the single source of truth for names,
// descriptions, tiers and images; this module only owns the filter/sort.

export const ALIAS_KEYS = new Set(['hightemp', 'rainfall']);

export function getSortedCategories(categoriesConfig) {
  return Object.entries(categoriesConfig)
    .filter(([key]) => !ALIAS_KEYS.has(key))
    .map(([key, cfg]) => ({
      category: key,
      display: cfg.title,
      emoji: cfg.emoji,
      tier: cfg.tier,
      image: cfg.image,
      description: cfg.description || ''
    }))
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier === 'free' ? -1 : 1;
      return a.display.localeCompare(b.display);
    });
}
