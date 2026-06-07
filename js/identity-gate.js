// js/identity-gate.js
// Centralized identity gate — import this module on every protected page.
//
// If the authenticated user has no username (identity not yet claimed),
// they are redirected to claim-username.html before accessing the page.
// The current URL is passed as ?next= so the claim flow can return them
// here afterward.
//
// Guests (not logged in) pass through — other auth guards handle those.
// getUserCapabilities() is already cached per page load, so on pages that
// call it themselves this check adds zero extra DB round-trips.

import { getUserCapabilities } from './permissions.js';

(async () => {
  const caps = await getUserCapabilities();
  if (!caps.isAuthenticated) return;  // guests: other guards handle auth
  if (caps.username)         return;  // username claimed: allow through

  // No username — redirect to the claim flow, preserving the destination.
  const next = encodeURIComponent(window.location.href);
  window.location.replace(`claim-username.html?next=${next}`);
})();
