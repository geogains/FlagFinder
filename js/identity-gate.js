// js/identity-gate.js
// Centralized identity gate — import this module on every protected page.
//
// If the authenticated user has no username (identity not yet claimed),
// they are redirected to claim-username.html before accessing the page.
// The current URL is passed as ?next= so the claim flow can return them
// here afterward.
//
// Guests (not logged in) pass through — other auth guards handle those.
// getUserCapabilities() dedupes concurrent callers onto one in-flight request,
// so on pages that also call it themselves this check adds no extra DB round-trip
// even when both calls happen before the first one resolves.

import { getUserCapabilities } from './permissions.js';

(async () => {
  const caps = await getUserCapabilities();
  if (!caps.isAuthenticated) return;  // guests: other guards handle auth
  if (caps.username)         return;  // username claimed: allow through

  // No username — redirect to the claim flow, preserving the destination.
  const next = encodeURIComponent(window.location.href);
  window.location.replace(`claim-username.html?next=${next}`);
})();
