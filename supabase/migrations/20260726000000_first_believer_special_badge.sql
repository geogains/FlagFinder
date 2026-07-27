-- ================================================================
-- First Believer — isolated special-badge system
-- 2026-07-26
--
-- A personal, honorary, permanent badge for a single named recipient.
-- Deliberately NOT part of the achievements/user_achievements/
-- user_equipped_badges system — see FlagFinder architecture analysis
-- (special-badge phase). This migration:
--
--   special_badges          — definition + private message (this and
--                              only this badge exists here today)
--   user_special_badges     — grant + reveal ledger (who has it, when
--                              granted, when the reveal was shown)
--   maybe_grant_first_believer_badge()   — server-authorised, idempotent grant
--   get_pending_first_believer_reveal()  — one-time private content fetch
--   mark_special_badge_revealed()        — marks the reveal as shown, once
--   get_public_first_believer_badge(uuid) — safe public-profile summary
--
-- Authorisation is by immutable Supabase Auth UUID, never by username
-- (usernames are mutable and can be re-claimed after a rename — see
-- update_username() in 20260521000003_username_cooldown.sql).
--
-- Unlike the achievements tables, these two tables have NO public read
-- policy and NO direct table-level GRANTs to anon/authenticated at all —
-- every read and write goes through a SECURITY DEFINER RPC below. RLS is
-- still enabled with owner-scoped policies as defense-in-depth in case a
-- future migration ever adds a table grant without re-checking this file.
-- ================================================================

-- ── TABLE 1: special_badges ───────────────────────────────────────
-- Definition + the private personalised message. No client role is ever
-- granted SELECT on this table directly — content only leaves the DB via
-- get_pending_first_believer_reveal() (owner-only, full content) and
-- get_public_first_believer_badge() (anyone, safe fields only).
CREATE TABLE IF NOT EXISTS public.special_badges (
  badge_key   text        PRIMARY KEY,
  title       text        NOT NULL,
  description text        NOT NULL,
  message     text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.special_badges ENABLE ROW LEVEL SECURITY;

-- Intentionally no CREATE POLICY here and no GRANT to anon/authenticated
-- below. RLS with zero policies denies all direct access from client
-- roles; the table is reachable only from SECURITY DEFINER functions,
-- which run as the function owner and are not subject to RLS.

-- ── TABLE 2: user_special_badges ──────────────────────────────────
-- Grant + reveal ledger. granted_at is set the moment the badge is
-- awarded; revealed_at stays NULL until the client confirms the reveal
-- modal actually appeared and was dismissed (see mark_special_badge_revealed).
CREATE TABLE IF NOT EXISTS public.user_special_badges (
  user_id     uuid        NOT NULL REFERENCES auth.users(id),
  badge_key   text        NOT NULL REFERENCES public.special_badges(badge_key),
  granted_at  timestamptz NOT NULL DEFAULT now(),
  revealed_at timestamptz,
  PRIMARY KEY (user_id, badge_key)
);

ALTER TABLE public.user_special_badges ENABLE ROW LEVEL SECURITY;

-- Defense-in-depth only (see note above) — no table grant is issued to
-- authenticated/anon, so this policy has nothing to actually gate today.
CREATE POLICY "user_special_badges_owner_read"
  ON public.user_special_badges FOR SELECT USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policy for any client role — every write goes
-- through maybe_grant_first_believer_badge() / mark_special_badge_revealed(),
-- both SECURITY DEFINER.

-- ── Badge definition + exact personalised message ─────────────────
-- Wording is exactly as provided — preserved verbatim, including blank-line
-- paragraph spacing, via dollar-quoting so no manual escaping is needed.
INSERT INTO public.special_badges (badge_key, title, description, message)
VALUES (
  'first_believer',
  'First Believer',
  'A unique honorary badge awarded for extraordinary support, loyalty and belief in GeoRanks from the very beginning.',
  $msg$To Erika,

Thank you so much for your support, you truly are my #1 Fan. My inspiration, you make me want to be a better man, and your 50 day commitment to GeoRanks shows just how much love and belief that you have for me. From the bottom of my heart I want to thank you for being there from the very beginning all the way up until now.

I love you,
Kieron$msg$
)
ON CONFLICT (badge_key) DO NOTHING;

-- ── RPC 1: maybe_grant_first_believer_badge ───────────────────────
-- SECURITY DEFINER. Derives the caller exclusively from auth.uid() — never
-- from any client-supplied value. Authorisation is a single hardcoded UUID
-- constant (ErikaBeta7's verified auth.users.id), not a username. The
-- tester account (Crooxs) is deliberately NOT included here — tester access
-- is granted out-of-band via a manual INSERT (see accompanying tester SQL),
-- never through this RPC, so the award path itself is never weakened for
-- testing convenience.
--
-- Idempotent: the (user_id, badge_key) primary key + ON CONFLICT DO NOTHING
-- guarantees at most one grant row ever exists, safe to call on every game
-- completion, from any device, any number of times.
--
-- Returns {"status": "granted" | "already_granted" | "not_applicable"}.
CREATE OR REPLACE FUNCTION public.maybe_grant_first_believer_badge()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_streak  int;
  ERIKA_ID  CONSTANT uuid := 'b0d0b7a0-8a0b-4e29-bd1c-69974c5269da'; -- ErikaBeta7 (permanent recipient)
  BADGE_KEY CONSTANT text := 'first_believer';
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('status', 'not_applicable');
  END IF;

  IF v_uid <> ERIKA_ID THEN
    RETURN jsonb_build_object('status', 'not_applicable');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_special_badges
    WHERE user_id = v_uid AND badge_key = BADGE_KEY
  ) THEN
    RETURN jsonb_build_object('status', 'already_granted');
  END IF;

  -- Live streak, read fresh from the DB — the client never supplies this.
  SELECT current_streak INTO v_streak
    FROM public.user_streaks WHERE user_id = v_uid;
  v_streak := COALESCE(v_streak, 0);

  IF v_streak < 50 THEN
    RETURN jsonb_build_object('status', 'not_applicable');
  END IF;

  INSERT INTO public.user_special_badges (user_id, badge_key)
  VALUES (v_uid, BADGE_KEY)
  ON CONFLICT (user_id, badge_key) DO NOTHING;

  IF FOUND THEN
    RETURN jsonb_build_object('status', 'granted');
  ELSE
    RETURN jsonb_build_object('status', 'already_granted');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.maybe_grant_first_believer_badge() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.maybe_grant_first_believer_badge() TO authenticated;

-- ── RPC 2: get_pending_first_believer_reveal ──────────────────────
-- SECURITY DEFINER. Returns the FULL private content (title, description,
-- message) only when the caller (auth.uid()) owns a grant whose
-- revealed_at is still NULL. Returns NULL otherwise — including for anyone
-- with no grant, and for the owner after the reveal has already happened.
-- This is the only path that ever returns the private message.
CREATE OR REPLACE FUNCTION public.get_pending_first_believer_reveal()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row RECORD;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT sb.badge_key, sb.title, sb.description, sb.message
    INTO v_row
    FROM public.user_special_badges usb
    JOIN public.special_badges sb ON sb.badge_key = usb.badge_key
   WHERE usb.user_id = v_uid
     AND usb.revealed_at IS NULL
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'badge_key',   v_row.badge_key,
    'title',       v_row.title,
    'description', v_row.description,
    'message',     v_row.message
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_pending_first_believer_reveal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pending_first_believer_reveal() TO authenticated;

-- ── RPC 3: mark_special_badge_revealed ─────────────────────────────
-- SECURITY DEFINER. Sets revealed_at = now() for the caller's own
-- first_believer grant, only if it is currently NULL. Safe to call
-- repeatedly — a second call simply matches zero rows and returns
-- 'already_revealed_or_not_granted'.
CREATE OR REPLACE FUNCTION public.mark_special_badge_revealed()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('status', 'not_applicable');
  END IF;

  UPDATE public.user_special_badges
     SET revealed_at = now()
   WHERE user_id = v_uid
     AND badge_key = 'first_believer'
     AND revealed_at IS NULL;

  IF FOUND THEN
    RETURN jsonb_build_object('status', 'revealed');
  ELSE
    RETURN jsonb_build_object('status', 'already_revealed_or_not_granted');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_special_badge_revealed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_special_badge_revealed() TO authenticated;

-- ── RPC 4: get_public_first_believer_badge ────────────────────────
-- SECURITY DEFINER. Read-only lookup by an arbitrary p_user_id, for
-- rendering a bonus badge tile on any profile (own account page or another
-- user's public profile, including logged-out visitors). This mirrors the
-- existing pattern of public-profile queries being scoped by the *viewed*
-- user's id (e.g. u/index.html's equipped-badges query) — it never writes
-- anything, so accepting a client-supplied id here carries none of the
-- "client could award itself the badge" risk that the grant RPC above
-- guards against. Returns only safe presentation fields; never the
-- message, revealed_at, or any tester/allowlist detail. Returns NULL if
-- the given user has no grant.
CREATE OR REPLACE FUNCTION public.get_public_first_believer_badge(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
BEGIN
  SELECT sb.badge_key, sb.title, sb.description
    INTO v_row
    FROM public.user_special_badges usb
    JOIN public.special_badges sb ON sb.badge_key = usb.badge_key
   WHERE usb.user_id = p_user_id
     AND sb.badge_key = 'first_believer';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'badge_key',   v_row.badge_key,
    'title',       v_row.title,
    'description', v_row.description
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_first_believer_badge(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_first_believer_badge(uuid) TO anon, authenticated;

-- ================================================================
-- Explicitly NOT done by this migration (by design):
--   - No row added to public.achievements
--   - No row added to public.user_achievements
--   - No change to public.users.achievement_count or its sync trigger
--   - No change to account.html's BADGE_CATALOG.platinum (client-side,
--     unaffected by any DB migration)
--   - No grant for the tester account (Crooxs) — see separate manual SQL
-- ================================================================
