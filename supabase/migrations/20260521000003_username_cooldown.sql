-- ================================================================
-- Phase 3A: Username governance hardening
--
-- 1. last_username_change_at column
--    Tracks when a username was last set/changed.  Used by the
--    update_username RPC to enforce the 30-day cooldown rule.
--    NULL = never changed (safe for both new and legacy rows).
--
-- 2. update_username RPC
--    Canonical single entry point for ALL username mutations.
--    Called by both claim-username.html (initial claim) and
--    account.html (subsequent changes).
--
--    Validation order (server-authoritative):
--      auth check → no-change guard → cooldown → length →
--      starts-with-letter → character set → reserved list →
--      INSERT with UNIQUE conflict handling
--
--    Cooldown rule:
--      Applies only when user already has an established username.
--      Initial claims (current username IS NULL) are exempt.
--
--    Returns jsonb:
--      { ok: true,  username: "claimed" }
--      { ok: false, code: "cooldown",       days_remaining: 15 }
--      { ok: false, code: "taken" }
--      { ok: false, code: "reserved" }
--      etc. — see friendlyError() in js/username-utils.js for mapping
-- ================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS last_username_change_at timestamptz;

CREATE OR REPLACE FUNCTION public.update_username(p_new_username text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller         uuid := auth.uid();
  v_current        public.users%rowtype;
  v_days_remaining int;
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  SELECT * INTO v_current FROM public.users WHERE id = v_caller;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'code', 'not_authenticated');
  END IF;

  -- No-change guard (IS NOT DISTINCT FROM handles NULL = NULL comparison)
  IF v_current.username IS NOT DISTINCT FROM p_new_username THEN
    RETURN jsonb_build_object('ok', false, 'code', 'no_change');
  END IF;

  -- Cooldown: applies only to established identities (current username NOT NULL).
  -- Initial claims (NULL → first username) are always exempt.
  IF v_current.username IS NOT NULL
     AND v_current.last_username_change_at IS NOT NULL
  THEN
    v_days_remaining := CEIL(
      EXTRACT(EPOCH FROM (
        v_current.last_username_change_at + INTERVAL '30 days' - now()
      )) / 86400
    )::int;
    IF v_days_remaining > 0 THEN
      RETURN jsonb_build_object(
        'ok',            false,
        'code',          'cooldown',
        'days_remaining', v_days_remaining
      );
    END IF;
  END IF;

  -- Length
  IF length(p_new_username) < 3  THEN RETURN jsonb_build_object('ok', false, 'code', 'too_short');  END IF;
  IF length(p_new_username) > 30 THEN RETURN jsonb_build_object('ok', false, 'code', 'too_long');   END IF;

  -- Must start with a letter
  IF p_new_username !~ '^[a-zA-Z]' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'starts_non_letter');
  END IF;

  -- Only letters, digits, underscores
  IF p_new_username !~ '^[a-zA-Z][a-zA-Z0-9_]*$' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'invalid_format');
  END IF;

  -- Reserved names (same list as js/username-utils.js RESERVED set)
  IF lower(p_new_username) = ANY(ARRAY[
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
    'deleted','banned','suspended'
  ]) THEN
    RETURN jsonb_build_object('ok', false, 'code', 'reserved');
  END IF;

  -- Write — the DB UNIQUE constraint is the final authority on duplicates.
  BEGIN
    UPDATE public.users
       SET username                = p_new_username,
           last_username_change_at = now()
     WHERE id = v_caller;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'code', 'taken');
  END;

  RETURN jsonb_build_object('ok', true, 'username', p_new_username);
END;
$$;

REVOKE ALL ON FUNCTION public.update_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_username(text) TO authenticated;
