// js/category-compatibility.js
// Single source of truth for which categories are structurally compatible
// with each game mode (Classic / VS / Top 10) — independent of Premium tier.
//
// Consumed by js/daily-challenge.js (category pool selection) and by the
// Quick Match backend RPCs (must stay in sync with the SQL mirror in
// supabase/migrations/20260722010000_quickmatch_lobby_categories.sql —
// Postgres can't import this module directly, so the arrays are
// duplicated there with an explicit "keep in sync" comment).

// All categories — valid for Classic (no minimum country-count requirement).
export const ALL_CATEGORIES = [
  'population', 'gdp', 'landmass', 'altitude', 'forest', 'coastline',
  'olympic', 'worldcup', 'passport', 'beer', 'nobelprize',
  'hightemp', 'rainfall', 'crimerate', 'happiness', 'cuisine', 'tourism', 'michelin', 'bigmac', 'lifeexpectancy',
  'marriageage', 'sexratio', 'tallestbuilding', 'density', 'carexports',
  'militarypersonel', 'rent', 'poorestgdp', 'university', 'volcano',
  'flamingo', 'disasterrisk', 'longestriver', 'renewableenergy', 'millionaires', 'gm',
  'f1', 'worldcupgoals', 'worldcupappearances', 'worldcupwins'
];

// Categories with at least 10 countries — valid for Top 10 mode.
// (olympic and worldcup are intentionally excluded — their datasets don't
// hold up structurally in Top 10 despite nominally having enough rows.)
export const TOP10_VALID_CATEGORIES = [
  'population', 'gdp', 'landmass', 'altitude', 'forest', 'coastline',
  'passport', 'beer', 'nobelprize', 'hightemp', 'rainfall',
  'crimerate', 'happiness', 'tourism', 'michelin', 'bigmac', 'lifeexpectancy',
  'marriageage', 'sexratio', 'tallestbuilding', 'density', 'carexports',
  'militarypersonel', 'rent', 'poorestgdp', 'university', 'volcano',
  'flamingo', 'disasterrisk', 'longestriver', 'renewableenergy', 'millionaires', 'gm',
  'f1', 'worldcupgoals', 'worldcupappearances', 'worldcupwins'
];

// Categories whose datasets are too small (< 30 countries) for VS mode —
// the full dataset is shuffled and cycled, and a small dataset produces a
// visible loop within a session (e.g. 10 countries = 5-pair loop).
export const VS_SMALL_DATASET = new Set([
  'happiness', 'worldcup', 'carexports', 'flamingo', 'tourism',
  'marriageage', 'longestriver', 'nobelprize', 'millionaires', 'poorestgdp',
  'sexratio', 'university', 'renewableenergy', 'volcano', 'cuisine', 'f1'
]);

// Categories valid for VS mode (>= 30 country entries).
export const VS_ELIGIBLE_CATEGORIES = ALL_CATEGORIES.filter(cat => !VS_SMALL_DATASET.has(cat));

// Returns the mode-compatible category pool for 'classic' | 'vs' | 'top10'.
export function getCompatibleCategories(mode) {
  if (mode === 'top10') return TOP10_VALID_CATEGORIES;
  if (mode === 'vs')    return VS_ELIGIBLE_CATEGORIES;
  return ALL_CATEGORIES;
}
