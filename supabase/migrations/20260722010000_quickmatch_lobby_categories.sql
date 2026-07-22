-- ================================================================
-- Quick Match category redesign + World Cup Trophies returns to free.
-- 2026-07-22
--
-- Part A — World Cup Trophies (category 9) is a permanent free category
-- again (Goals/Appearances/Wins — 38/39/40 — remain Premium):
--   1. can_access_category()  — add 9 back to the free-ID array.
--   2. create_duel_match()    — add 'worldcup' back to the free-tier
--      branch (it never left the known-category validation list).
--
-- Part B — Quick Match becomes a "featured category" mode: subscription
-- tier no longer determines its category pool. Every lobby offers the
-- same 6 categories to both players: 4 permanently-fixed categories
-- (population, landmass, gdp, altitude) plus 2 wildcards drawn at random
-- from the remaining mode-compatible pool — wildcards may be free or
-- Premium.
--
-- This replaces the old client-side, deterministically-seeded category
-- list (previously computed independently by each browser from the
-- match UUID) with server-side generation stored on the match row —
-- the server becomes the single source of truth for what was offered,
-- closing the gap where a client could otherwise submit any globally
-- "compatible" category rather than one actually offered in that lobby:
--   3. h2h_matches.lobby_categories (new column) — the 6 categories
--      offered in this lobby, set once at match creation.
--   4. qm_lobby_categories(text)  — new helper, generates the 4 fixed +
--      2 random wildcards for a given duel mode. Its per-mode pools
--      must stay in sync with js/category-compatibility.js — the same
--      compatibility definitions already used by js/daily-challenge.js
--      (Postgres can't import that module directly, hence the mirror).
--   5. join_quick_match() / poll_quick_match_queue() — both places a
--      Quick Match row can be created now call qm_lobby_categories()
--      and store the result.
--   6. submit_qm_category_pick() — validates the submitted pick against
--      this match's stored lobby_categories, not a global allowlist.
-- ================================================================

-- ── A1. can_access_category ──────────────────────────────────────────
-- Drop-in CREATE OR REPLACE of the active version (20260722000000).
-- The only change: adding 9 (worldcup) back to the free-category-id
-- array. 38/39/40 (worldcupgoals/appearances/wins) remain Premium.

CREATE OR REPLACE FUNCTION public.can_access_category(
  category_id_input integer,
  is_daily          boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_tier text;
BEGIN
  -- Daily Challenge always allowed regardless of category tier or user tier.
  IF is_daily THEN
    RETURN true;
  END IF;

  -- Free categories require no subscription.
  -- This list must stay in sync with CATEGORY_ID_MAP in categories-config.js
  -- for the categories where premium: false.
  -- World Cup Trophies (9) is a permanent free category again.
  -- World Cup Goals/Appearances/Wins (38/39/40) remain Premium-only.
  IF category_id_input = ANY(ARRAY[1, 2, 3, 5, 8, 9, 10, 12, 13]) THEN
    RETURN true;
  END IF;

  -- All remaining categories are premium-gated.
  -- Unauthenticated users cannot hold a subscription.
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Resolve the user's effective tier.
  -- subscription_tier is the GeoRanks 2.0 source of truth.
  -- is_premium is the legacy fallback for rows that predate the
  -- subscription_tier migration (20260519190000).
  -- Matches the resolveEffectiveTier() logic in js/permissions.js.
  SELECT COALESCE(
    subscription_tier::text,
    CASE WHEN is_premium THEN 'premium' ELSE 'free' END,
    'free'
  )
  INTO v_tier
  FROM public.users
  WHERE id = v_uid;

  -- Profile not found: deny access rather than default-allow.
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN v_tier = 'premium';
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_category(integer, boolean)
  TO authenticated, anon;

-- ── A2. create_duel_match ─────────────────────────────────────────────
-- Drop-in CREATE OR REPLACE of the active three-argument version
-- (20260722000000). The only change: 'worldcup' moves back into the
-- free-tier branch of v_required_tier. It was already in the
-- known-category validation list throughout, so no change there.

CREATE OR REPLACE FUNCTION public.create_duel_match(
  p_category  text,
  p_seed      bigint,
  p_duel_mode text DEFAULT 'classic'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id              uuid;
  v_host_tier            text;
  v_required_tier        text;
  v_tier_rank_host       int;
  v_tier_rank_required   int;
  v_match_id             uuid;
  v_recent_count         int;
BEGIN
  -- 1. Identify the authenticated host
  v_host_id := auth.uid();
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING errcode = 'P0001';
  END IF;

  -- 2. Validate duel_mode
  IF p_duel_mode NOT IN ('classic', 'vs', 'top10') THEN
    RAISE EXCEPTION 'Unknown duel mode: %', p_duel_mode
      USING errcode = 'P0007';
  END IF;

  -- 3. Validate category is a known key
  IF p_category NOT IN (
    'landmass', 'population', 'gdp', 'altitude', 'forest',
    'olympic', 'passport', 'beer',
    'worldcup', 'worldcupgoals', 'worldcupappearances', 'worldcupwins',
    'bigmac', 'carexports', 'coastline', 'crimerate', 'cuisine',
    'density', 'disasterrisk', 'flamingo', 'gm', 'f1', 'happiness',
    'lifeexpectancy', 'longestriver', 'marriageage', 'michelin',
    'militarypersonel', 'millionaires', 'nobelprize', 'poorestgdp',
    'precipitation', 'rainfall', 'renewableenergy', 'rent', 'sexratio',
    'tallestbuilding', 'temperature', 'hightemp', 'tourism',
    'university', 'volcano'
  ) THEN
    RAISE EXCEPTION 'Unknown category: %', p_category
      USING errcode = 'P0002';
  END IF;

  -- 4. Determine required tier for the category.
  --    World Cup Trophies (worldcup) is a permanent free category again.
  --    World Cup Goals/Appearances/Wins remain Premium-only.
  v_required_tier := CASE
    WHEN p_category = ANY(ARRAY[
      'landmass', 'population', 'gdp', 'altitude', 'forest',
      'olympic', 'passport', 'beer', 'worldcup'
    ]) THEN 'free'
    ELSE 'premium'
  END;

  -- 5. Resolve host subscription tier
  SELECT COALESCE(
    subscription_tier::text,
    CASE WHEN is_premium THEN 'premium' ELSE 'free' END,
    'free'
  )
  INTO v_host_tier
  FROM public.users
  WHERE id = v_host_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found'
      USING errcode = 'P0003';
  END IF;

  -- 6. Compare tiers (free=0, light=1, premium=2)
  v_tier_rank_host     := CASE v_host_tier     WHEN 'free' THEN 0 WHEN 'light' THEN 1 WHEN 'premium' THEN 2 ELSE 0 END;
  v_tier_rank_required := CASE v_required_tier WHEN 'free' THEN 0 WHEN 'light' THEN 1 WHEN 'premium' THEN 2 ELSE 2 END;

  IF v_tier_rank_host < v_tier_rank_required THEN
    RAISE EXCEPTION 'Subscription upgrade required to create a % category match', v_required_tier
      USING errcode = 'P0004';
  END IF;

  -- 7. Rate limiting: at most 20 rooms per host per hour
  SELECT COUNT(*) INTO v_recent_count
  FROM public.h2h_matches
  WHERE player1_id = v_host_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent_count >= 20 THEN
    RAISE EXCEPTION 'Too many challenges created recently. Please wait before creating another.'
      USING errcode = 'P0006';
  END IF;

  -- 8. Insert match
  INSERT INTO public.h2h_matches (
    category,
    seed,
    player1_id,
    status,
    host_subscription_tier,
    required_category_tier,
    duel_mode
  ) VALUES (
    p_category,
    p_seed,
    v_host_id,
    'waiting',
    v_host_tier,
    v_required_tier,
    p_duel_mode
  )
  RETURNING id INTO v_match_id;

  RETURN jsonb_build_object(
    'id',                     v_match_id,
    'category',               p_category,
    'duel_mode',              p_duel_mode,
    'required_category_tier', v_required_tier,
    'host_subscription_tier', v_host_tier
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_duel_match(text, bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_duel_match(text, bigint, text) TO authenticated;

-- ── B1. h2h_matches.lobby_categories ──────────────────────────────────
-- The 6 categories offered in a Quick Match lobby, set once at match
-- creation and shared by both clients. NULL for non-Quick-Match rows
-- (private duels pick their category up front via create_duel_match).
ALTER TABLE public.h2h_matches
  ADD COLUMN IF NOT EXISTS lobby_categories text[];

-- ── B2. qm_lobby_categories ───────────────────────────────────────────
-- Generates the 6 categories for a Quick Match lobby: the 4 permanently
-- fixed categories plus 2 wildcards drawn at random from the remaining
-- mode-compatible pool. Wildcards may be free or Premium — Quick Match
-- category selection ignores subscription tier entirely.
--
-- The per-mode pools below must stay in sync with
-- js/category-compatibility.js (ALL_CATEGORIES / VS_ELIGIBLE_CATEGORIES /
-- TOP10_VALID_CATEGORIES) — the same compatibility definitions already
-- used by js/daily-challenge.js. Postgres can't import that module
-- directly, so the arrays are mirrored here.
--
-- Internal helper only — not granted to anon/authenticated; called
-- exclusively from join_quick_match() and poll_quick_match_queue(),
-- both SECURITY DEFINER, so ownership privileges cover the call.
CREATE OR REPLACE FUNCTION public.qm_lobby_categories(p_mode text)
RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
  v_fixed     text[] := ARRAY['population', 'landmass', 'gdp', 'altitude'];
  v_pool      text[];
  v_wildcards text[];
BEGIN
  v_pool := CASE p_mode
    WHEN 'top10' THEN ARRAY[
      'population', 'gdp', 'landmass', 'altitude', 'forest', 'coastline',
      'passport', 'beer', 'nobelprize', 'hightemp', 'rainfall',
      'crimerate', 'happiness', 'tourism', 'michelin', 'bigmac', 'lifeexpectancy',
      'marriageage', 'sexratio', 'tallestbuilding', 'density', 'carexports',
      'militarypersonel', 'rent', 'poorestgdp', 'university', 'volcano',
      'flamingo', 'disasterrisk', 'longestriver', 'renewableenergy', 'millionaires', 'gm',
      'f1', 'worldcupgoals', 'worldcupappearances', 'worldcupwins'
    ]
    WHEN 'vs' THEN ARRAY[
      'population', 'gdp', 'landmass', 'altitude', 'forest', 'coastline',
      'olympic', 'passport', 'beer', 'hightemp', 'rainfall', 'crimerate',
      'michelin', 'bigmac', 'lifeexpectancy', 'tallestbuilding', 'density',
      'militarypersonel', 'rent', 'disasterrisk', 'gm',
      'worldcupgoals', 'worldcupappearances', 'worldcupwins'
    ]
    ELSE ARRAY[
      'population', 'gdp', 'landmass', 'altitude', 'forest', 'coastline',
      'olympic', 'worldcup', 'passport', 'beer', 'nobelprize',
      'hightemp', 'rainfall', 'crimerate', 'happiness', 'cuisine', 'tourism', 'michelin', 'bigmac', 'lifeexpectancy',
      'marriageage', 'sexratio', 'tallestbuilding', 'density', 'carexports',
      'militarypersonel', 'rent', 'poorestgdp', 'university', 'volcano',
      'flamingo', 'disasterrisk', 'longestriver', 'renewableenergy', 'millionaires', 'gm',
      'f1', 'worldcupgoals', 'worldcupappearances', 'worldcupwins'
    ]
  END;

  -- Exclude the fixed four from the wildcard draw pool.
  SELECT array_agg(cat) INTO v_pool
    FROM unnest(v_pool) AS cat
   WHERE cat != ALL(v_fixed);

  -- Draw 2 wildcards at random from the remaining compatible pool.
  SELECT array_agg(cat) INTO v_wildcards
    FROM (
      SELECT cat FROM unnest(v_pool) AS cat
      ORDER BY random()
      LIMIT 2
    ) sub;

  RETURN v_fixed || v_wildcards;
END;
$$;

REVOKE ALL ON FUNCTION public.qm_lobby_categories(text) FROM PUBLIC;

-- ── B3. join_quick_match ──────────────────────────────────────────────
-- Drop-in CREATE OR REPLACE of the active version (20260613000002).
-- The only change: Step 5's INSERT now also populates lobby_categories
-- via qm_lobby_categories(p_mode).

CREATE OR REPLACE FUNCTION public.join_quick_match(
  p_mode text DEFAULT 'classic'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller       uuid := auth.uid();
  v_queue_id     uuid;
  v_match_id     uuid;
  v_opp_user_id  uuid;
  v_opp_queue_id uuid;
  v_seed         bigint;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0001';
  END IF;

  IF p_mode NOT IN ('classic', 'vs', 'top10') THEN
    RAISE EXCEPTION 'Unknown quick match mode: %', p_mode USING errcode = 'P0002';
  END IF;

  -- Step 1a: expire stale waiting queue entries globally.
  UPDATE public.quick_match_queue
     SET status = 'expired'
   WHERE status    = 'waiting'
     AND expires_at < now();

  -- Step 1b: abandon stale active Quick Matches.
  UPDATE public.h2h_matches
     SET status = 'abandoned'
   WHERE match_type = 'quick'
     AND status     = 'active'
     AND started_at IS NOT NULL
     AND started_at + interval '10 minutes' < now();

  -- Step 1c: abandon Quick Match lobbies whose deadline has long expired.
  UPDATE public.h2h_matches
     SET status = 'abandoned'
   WHERE match_type      = 'quick'
     AND status          = 'category_select'
     AND category_deadline + interval '30 seconds' < now();

  -- Step 2: resume a genuinely in-progress match for this mode.
  SELECT q.id, q.match_id
    INTO v_queue_id, v_match_id
    FROM public.quick_match_queue q
    JOIN public.h2h_matches m ON m.id = q.match_id
   WHERE q.user_id  = v_caller
     AND q.status   = 'matched'
     AND q.mode     = p_mode
     AND (
       (m.status = 'category_select' AND now() < m.category_deadline)
       OR
       (m.status = 'active'
        AND m.started_at IS NOT NULL
        AND now() < m.started_at + interval '10 minutes')
     )
   ORDER BY q.created_at DESC
   LIMIT 1;

  IF v_match_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status',   'matched',
      'match_id', v_match_id,
      'queue_id', v_queue_id
    );
  END IF;

  -- Step 3: cancel caller's stale queue entries.
  UPDATE public.quick_match_queue q
     SET status = 'cancelled'
   WHERE q.user_id = v_caller
     AND (
       q.status = 'waiting'
       OR (
         q.status = 'matched'
         AND EXISTS (
           SELECT 1 FROM public.h2h_matches m
            WHERE m.id = q.match_id
              AND (
                m.status IN ('finished', 'abandoned')
                OR (m.status = 'category_select' AND now() >= m.category_deadline)
                OR (m.status = 'active'
                    AND (m.started_at IS NULL
                         OR now() >= m.started_at + interval '10 minutes'))
              )
         )
       )
     );

  -- Step 4: serialise the opponent scan for this mode
  PERFORM pg_advisory_xact_lock(public.qmq_advisory_lock_key(p_mode));

  -- Step 5: claim a waiting opponent atomically
  SELECT id, user_id
    INTO v_opp_queue_id, v_opp_user_id
    FROM public.quick_match_queue
   WHERE status    = 'waiting'
     AND mode      = p_mode
     AND user_id  != v_caller
     AND expires_at > now()
   ORDER BY created_at ASC
   LIMIT 1
   FOR UPDATE SKIP LOCKED;

  IF v_opp_user_id IS NOT NULL THEN
    v_seed := floor(random() * 2147483647)::bigint;

    INSERT INTO public.h2h_matches (
      category, seed,
      player1_id, player2_id,
      status, match_type,
      duel_mode, category_deadline,
      lobby_categories
    ) VALUES (
      NULL, v_seed,
      v_opp_user_id, v_caller,
      'category_select', 'quick',
      p_mode,
      now() + interval '25 seconds',
      public.qm_lobby_categories(p_mode)
    )
    RETURNING id INTO v_match_id;

    UPDATE public.quick_match_queue
       SET status   = 'matched',
           match_id = v_match_id
     WHERE id = v_opp_queue_id;

    INSERT INTO public.quick_match_queue (user_id, mode, status, match_id)
    VALUES (v_caller, p_mode, 'matched', v_match_id)
    RETURNING id INTO v_queue_id;

    RETURN jsonb_build_object(
      'status',   'matched',
      'match_id', v_match_id,
      'queue_id', v_queue_id
    );
  END IF;

  -- Step 6: no opponent found — insert waiting entry
  INSERT INTO public.quick_match_queue (user_id, mode, status)
  VALUES (v_caller, p_mode, 'waiting')
  RETURNING id INTO v_queue_id;

  RETURN jsonb_build_object(
    'status',   'waiting',
    'queue_id', v_queue_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.join_quick_match(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.join_quick_match(text) TO authenticated;

-- ── B4. poll_quick_match_queue ────────────────────────────────────────
-- Drop-in CREATE OR REPLACE of the active version (20260613000001).
-- The only change: the Step-5 INSERT (opportunistic match creation when
-- this poll wins the pairing race) now also populates lobby_categories
-- via qm_lobby_categories(v_mode).

CREATE OR REPLACE FUNCTION public.poll_quick_match_queue(
  p_queue_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller            uuid := auth.uid();
  v_status            text;
  v_match_id          uuid;
  v_mode              text;
  v_expires_at        timestamptz;
  v_match_status      text;
  v_started_at        timestamptz;
  v_category_deadline timestamptz;
  v_opp_queue_id      uuid;
  v_opp_user_id       uuid;
  v_new_match_id      uuid;
  v_seed              bigint;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0001';
  END IF;

  SELECT q.status, q.match_id, q.mode, q.expires_at
    INTO v_status, v_match_id, v_mode, v_expires_at
    FROM public.quick_match_queue q
   WHERE q.id = p_queue_id AND q.user_id = v_caller;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  -- Already matched: verify the referenced match is still fresh and
  -- has the correct duel_mode for this queue entry's mode.
  -- Stale or mode-mismatched → cancel entry and return 'cancelled'.
  IF v_status = 'matched' AND v_match_id IS NOT NULL THEN
    SELECT m.status, m.started_at, m.category_deadline
      INTO v_match_status, v_started_at, v_category_deadline
      FROM public.h2h_matches m
     WHERE m.id        = v_match_id
       AND m.duel_mode = v_mode;

    IF (v_match_status = 'category_select' AND now() < v_category_deadline)
       OR (v_match_status = 'active'
           AND v_started_at IS NOT NULL
           AND now() < v_started_at + interval '10 minutes')
    THEN
      RETURN jsonb_build_object('status', 'matched', 'match_id', v_match_id);
    ELSE
      UPDATE public.quick_match_queue
         SET status = 'cancelled'
       WHERE id = p_queue_id;
      RETURN jsonb_build_object('status', 'cancelled');
    END IF;
  END IF;

  IF v_status IN ('cancelled', 'expired') THEN
    RETURN jsonb_build_object('status', v_status);
  END IF;

  IF v_expires_at < now() THEN
    UPDATE public.quick_match_queue
       SET status = 'expired'
     WHERE id = p_queue_id;
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  IF pg_try_advisory_xact_lock(public.qmq_advisory_lock_key(v_mode)) THEN

    SELECT q.status, q.match_id
      INTO v_status, v_match_id
      FROM public.quick_match_queue q
     WHERE q.id = p_queue_id
     FOR UPDATE;

    IF v_status = 'matched' THEN
      RETURN jsonb_build_object('status', 'matched', 'match_id', v_match_id);
    END IF;

    IF v_status != 'waiting' THEN
      RETURN jsonb_build_object('status', v_status);
    END IF;

    SELECT id, user_id
      INTO v_opp_queue_id, v_opp_user_id
      FROM public.quick_match_queue
     WHERE status    = 'waiting'
       AND mode      = v_mode
       AND user_id  != v_caller
       AND expires_at > now()
     ORDER BY created_at ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED;

    IF v_opp_user_id IS NOT NULL THEN
      v_seed := floor(random() * 2147483647)::bigint;

      INSERT INTO public.h2h_matches (
        category, seed,
        player1_id, player2_id,
        status, match_type,
        duel_mode, category_deadline,
        lobby_categories
      ) VALUES (
        NULL, v_seed,
        v_opp_user_id, v_caller,
        'category_select', 'quick',
        v_mode,
        now() + interval '25 seconds',
        public.qm_lobby_categories(v_mode)
      )
      RETURNING id INTO v_new_match_id;

      UPDATE public.quick_match_queue
         SET status   = 'matched',
             match_id = v_new_match_id
       WHERE id = v_opp_queue_id;

      UPDATE public.quick_match_queue
         SET status   = 'matched',
             match_id = v_new_match_id
       WHERE id = p_queue_id;

      RETURN jsonb_build_object('status', 'matched', 'match_id', v_new_match_id);
    END IF;

  END IF;

  RETURN jsonb_build_object('status', 'waiting');
END;
$$;

REVOKE ALL ON FUNCTION public.poll_quick_match_queue(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.poll_quick_match_queue(uuid) TO authenticated;

-- ── B5. submit_qm_category_pick ───────────────────────────────────────
-- Drop-in CREATE OR REPLACE of the active version (20260722000000).
-- The change: validation now checks the submitted category against
-- THIS match's stored lobby_categories (v_match.lobby_categories, read
-- via the %rowtype SELECT already in place) instead of a global
-- allowlist. A NULL lobby_categories (only possible for a Quick Match
-- row created in the brief window before this migration deployed)
-- fails closed — rejected, not silently accepted.

CREATE OR REPLACE FUNCTION public.submit_qm_category_pick(
  p_match_id uuid,
  p_category text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller     uuid := auth.uid();
  v_match      h2h_matches%rowtype;
  v_is_p1      boolean;
  v_p1_pick    text;
  v_p2_pick    text;
  v_final_cat  text;
  v_started_at timestamptz;
  v_timeout_at timestamptz;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0001';
  END IF;

  -- Lock the match row — serialises concurrent submissions
  SELECT * INTO v_match
    FROM public.h2h_matches
   WHERE id = p_match_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found' USING errcode = 'P0002';
  END IF;

  -- Security: caller must be a participant
  IF v_match.player1_id != v_caller AND v_match.player2_id != v_caller THEN
    RAISE EXCEPTION 'User does not belong to this match' USING errcode = 'P0003';
  END IF;

  -- Idempotent: if already active (2nd pick already resolved), return current state
  IF v_match.status = 'active' THEN
    RETURN jsonb_build_object(
      'status',     'active',
      'category',   v_match.category,
      'seed',       v_match.seed,
      'started_at', v_match.started_at
    );
  END IF;

  IF v_match.status != 'category_select' THEN
    RAISE EXCEPTION 'Match is not in category_select state (status: %)', v_match.status
      USING errcode = 'P0004';
  END IF;

  IF v_match.match_type != 'quick' THEN
    RAISE EXCEPTION 'Not a quick match' USING errcode = 'P0005';
  END IF;

  -- Validate the submitted category was actually offered in THIS lobby.
  -- A NULL lobby_categories fails closed (rejected), never silently accepted.
  IF v_match.lobby_categories IS NULL OR p_category != ALL(v_match.lobby_categories) THEN
    RAISE EXCEPTION 'Invalid category for quick match: %', p_category
      USING errcode = 'P0006';
  END IF;

  v_is_p1 := (v_match.player1_id = v_caller);

  -- Store pick idempotently (first-write-wins per player)
  IF v_is_p1 THEN
    IF v_match.qm_p1_pick IS NULL THEN
      UPDATE public.h2h_matches SET qm_p1_pick = p_category WHERE id = p_match_id;
    END IF;
    v_p1_pick := COALESCE(v_match.qm_p1_pick, p_category);
    v_p2_pick := v_match.qm_p2_pick;
  ELSE
    IF v_match.qm_p2_pick IS NULL THEN
      UPDATE public.h2h_matches SET qm_p2_pick = p_category WHERE id = p_match_id;
    END IF;
    v_p1_pick := v_match.qm_p1_pick;
    v_p2_pick := COALESCE(v_match.qm_p2_pick, p_category);
  END IF;

  -- Check if both picks are now in
  IF v_p1_pick IS NOT NULL AND v_p2_pick IS NOT NULL THEN

    -- Determine final category:
    -- Same pick → that category. Different picks → random choice between the two.
    IF v_p1_pick = v_p2_pick THEN
      v_final_cat := v_p1_pick;
    ELSIF random() < 0.5 THEN
      v_final_cat := v_p1_pick;
    ELSE
      v_final_cat := v_p2_pick;
    END IF;

    -- Set started_at 5 seconds in the future so both clients have time to
    -- transition from the lobby reveal screen before the game timer begins.
    v_started_at := clock_timestamp() + interval '5 seconds';
    v_timeout_at := v_started_at + interval '5 minutes';

    UPDATE public.h2h_matches
       SET status            = 'active',
           category          = v_final_cat,
           started_at        = v_started_at,
           timeout_at        = v_timeout_at,
           qm_p1_pick        = v_p1_pick,
           qm_p2_pick        = v_p2_pick
     WHERE id = p_match_id;

    RETURN jsonb_build_object(
      'status',     'active',
      'category',   v_final_cat,
      'seed',       v_match.seed,
      'started_at', v_started_at
    );
  END IF;

  -- One pick in — waiting for the opponent
  RETURN jsonb_build_object(
    'status',  'category_select',
    'my_pick', p_category
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_qm_category_pick(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.submit_qm_category_pick(uuid, text) TO authenticated;
