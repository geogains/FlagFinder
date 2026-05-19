// js/permissions.js
// Single source of truth for subscription tier, category access, and feature access.
// All pages should eventually read from here instead of fetching is_premium directly.

import { supabase, getSessionSafe } from './supabase-client.js';
import { categoriesConfig } from './categories-config.js';

// ---------------------------------------------------------------------------
// Feature name constants
// Use these with canAccessFeature() — avoids silent typo failures and
// provides a single auditable list of every gateable feature in the app.
// ---------------------------------------------------------------------------
export const FEATURES = {
  STATS:               'canAccessStats',
  DUEL:                'canAccessDuel',
  LIGHT_CATEGORIES:    'canAccessLightCategories',
  PREMIUM_CATEGORIES:  'canAccessPremiumCategories',
  CHALLENGE_USERS:     'canChallengeUsers',
  PREMIUM_BADGE:       'showPremiumBadge',
};

// ---------------------------------------------------------------------------
// Capability matrix
// To add a new feature: add a key to FEATURES above and to every tier below.
// To add a new tier: add an entry here — no other changes needed.
// isAuthenticated is NOT in this map — it is auth-state, not tier-state.
// ---------------------------------------------------------------------------
const TIER_CAPABILITIES = {
  free: {
    canAccessStats: false,
    canAccessDuel: false,
    canAccessLightCategories: false,
    canAccessPremiumCategories: false,
    canChallengeUsers: false,
    showPremiumBadge: false,
  },
  light: {
    canAccessStats: false,
    canAccessDuel: false,
    canAccessLightCategories: true,
    canAccessPremiumCategories: false,
    canChallengeUsers: false,
    showPremiumBadge: false,
  },
  premium: {
    canAccessStats: true,
    canAccessDuel: true,
    canAccessLightCategories: true,
    canAccessPremiumCategories: true,
    canChallengeUsers: true,
    showPremiumBadge: true,
  },
};

// Prebuilt base objects for the two unauthenticated/error paths.
const GUEST_CAPABILITIES      = { isAuthenticated: false, tier: 'free', ...TIER_CAPABILITIES.free };
const AUTH_FREE_CAPABILITIES  = { isAuthenticated: true,  tier: 'free', ...TIER_CAPABILITIES.free };

// Module-level cache — one DB read per page load.
let _cachedPermissions = null;

// Resolve effective tier from a DB row.
// subscription_tier is the source of truth; is_premium is the fallback
// for rows that predate the Phase 1 Part 1 migration.
function resolveEffectiveTier(row) {
  if (row?.subscription_tier) return row.subscription_tier;
  if (row?.is_premium === true) return 'premium';
  return 'free';
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Returns the full capabilities object for the current user.
 *
 * Shape: { isAuthenticated: bool, tier: string, canAccessStats: bool, ... }
 *
 * isAuthenticated distinguishes guests from logged-in free users — they share
 * the same tier and capability booleans, but future features (profiles, social,
 * challenges) depend on knowing whether a session exists.
 *
 * Guest (no session):        { isAuthenticated: false, tier: 'free', ... }
 * Authenticated free user:   { isAuthenticated: true,  tier: 'free', ... }
 * Authenticated + DB error:  { isAuthenticated: true,  tier: 'free', ... }  ← identity preserved
 * Authenticated + tier:      { isAuthenticated: true,  tier: 'premium', ... }
 *
 * Result is cached for the lifetime of the page.
 */
export async function getUserCapabilities() {
  if (_cachedPermissions) return _cachedPermissions;

  const { data: { session } } = await getSessionSafe();
  if (!session?.user) {
    _cachedPermissions = GUEST_CAPABILITIES;
    return _cachedPermissions;
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('subscription_tier, is_premium')
    .eq('id', session.user.id)
    .single();

  if (error || !profile) {
    console.warn('[permissions] profile fetch failed — defaulting to free', error?.message);
    // isAuthenticated: true — the session is valid; we just couldn't read the tier.
    _cachedPermissions = AUTH_FREE_CAPABILITIES;
    return _cachedPermissions;
  }

  const tier = resolveEffectiveTier(profile);
  const capabilities = TIER_CAPABILITIES[tier] ?? TIER_CAPABILITIES.free;
  _cachedPermissions = { isAuthenticated: true, tier, ...capabilities };
  return _cachedPermissions;
}

/**
 * Returns the current user's tier string: 'free' | 'light' | 'premium'.
 */
export async function getUserTier() {
  const caps = await getUserCapabilities();
  return caps.tier;
}

/**
 * Returns true if the current user can access the given category.
 * Reads the category's `tier` field from categoriesConfig.
 */
export async function canAccessCategory(categoryKey) {
  const category = categoriesConfig[categoryKey];
  if (!category) return false;

  const categoryTier = category.tier ?? 'free';
  if (categoryTier === 'free') return true;

  const caps = await getUserCapabilities();
  if (categoryTier === 'light') return caps.canAccessLightCategories;
  if (categoryTier === 'premium') return caps.canAccessPremiumCategories;
  return false;
}

/**
 * Returns true if the current user has the named capability.
 * Pass a FEATURES constant (e.g. FEATURES.STATS) rather than a raw string
 * to avoid silent failures from typos.
 */
export async function canAccessFeature(featureName) {
  if (!(featureName in TIER_CAPABILITIES.free)) {
    console.warn(`[permissions] canAccessFeature called with unknown feature: "${featureName}"`);
  }
  const caps = await getUserCapabilities();
  return caps[featureName] === true;
}

/**
 * Clears the permissions cache. Call after a subscription change
 * (e.g. immediately after a successful checkout) so the next
 * getUserCapabilities() re-reads from the DB.
 */
export function clearPermissionsCache() {
  _cachedPermissions = null;
}
