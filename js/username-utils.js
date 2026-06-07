// js/username-utils.js
// Shared username validation utilities.
//
// Used by claim-username.html (initial claim) and account.html (changes).
// Client-side validation provides instant feedback; the update_username RPC
// is the authoritative server-side enforcement point — this file mirrors it.
//
// When the reserved list or format rules change, update BOTH this file
// AND the update_username RPC in 20260521000003_username_cooldown.sql.

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const USERNAME_RE  = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export const RESERVED = new Set([
  'admin','administrator','admins',
  'support','help','helpdesk',
  'official','georanks','geo_ranks','georankssupport',
  'staff','staffmember','team','theteam',
  'moderator','mod','mods','modteam',
  'system','sys','sysadmin',
  'api','apiuser','bot','autobot',
  'service','services',
  'contact','info','noreply','no_reply',
  'null','undefined','none','anonymous',
  'guest','player','user',
  'test','testuser','demo','example',
  'root','superuser','sudo',
  'deleted','banned','suspended',
]);

/**
 * Instant local validation — no network call.
 * Returns { ok: true } or { ok: false, msg: string }.
 */
export function validateLocally(value) {
  if (!value)                             return { ok: false, msg: '' };
  if (value.length < USERNAME_MIN)        return { ok: false, msg: `Must be at least ${USERNAME_MIN} characters.` };
  if (value.length > USERNAME_MAX)        return { ok: false, msg: `Must be ${USERNAME_MAX} characters or fewer.` };
  if (!/^[a-zA-Z]/.test(value))          return { ok: false, msg: 'Must start with a letter.' };
  if (!USERNAME_RE.test(value))           return { ok: false, msg: 'Only letters, numbers, and underscores allowed.' };
  if (RESERVED.has(value.toLowerCase()))  return { ok: false, msg: 'This username is reserved.' };
  return { ok: true };
}

/**
 * Returns the canonical public profile URL for a given username.
 * Returns null for null/empty usernames so callers can skip rendering a link.
 *
 * Uses ?username= query format instead of /u/:username path format.
 * Both work in production (Vercel cleanUrls + rewrite handles both),
 * but only ?username= works with the local Python dev server which has
 * no rewrite rules. The /u/:username Vercel rewrite is kept in vercel.json
 * for backward compat with externally shared links.
 */
export function profileUrl(username) {
  if (!username) return null;
  return `/u?username=${encodeURIComponent(username)}`;
}

/**
 * Maps an error code returned by the update_username RPC to a human-readable
 * message. Never exposes SQL constraint names or Supabase internals.
 *
 * @param {string} code          - The 'code' field from the RPC response.
 * @param {number} [daysRemaining] - Only present when code === 'cooldown'.
 */
export function friendlyError(code, daysRemaining) {
  switch (code) {
    case 'too_short':         return 'Must be at least 3 characters.';
    case 'too_long':          return 'Must be 30 characters or fewer.';
    case 'starts_non_letter': return 'Usernames must begin with a letter.';
    case 'invalid_format':    return 'Usernames can only contain letters, numbers, and underscores.';
    case 'reserved':          return 'This username is reserved.';
    case 'taken':             return 'This username is already taken.';
    case 'no_change':         return 'That is already your username.';
    case 'cooldown':
      return daysRemaining != null
        ? `You can change your username again in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`
        : 'Username changes are on cooldown. Please try again later.';
    case 'not_authenticated': return 'Session expired. Please sign in again.';
    default:                  return 'Something went wrong. Please try again.';
  }
}
