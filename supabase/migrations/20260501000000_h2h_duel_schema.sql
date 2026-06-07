-- ================================================================
-- Head-to-Head Duel Mode — core schema, RLS, grants, and RPC.
--
-- Normalized from the original h2h_duel.sql (no timestamp prefix).
-- Timestamped 20260501 so it sorts before the Phase 2 migrations
-- (20260519+) that depend on these tables and functions.
--
-- All DDL uses IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS
-- so this file is safe to re-apply against an existing schema.
-- ================================================================

-- ── Tables ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.h2h_matches (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text        NOT NULL,
  seed        bigint      NOT NULL,
  status      text        NOT NULL DEFAULT 'waiting'
                          CHECK (status IN ('waiting','active','finished','abandoned')),
  player1_id  uuid        REFERENCES auth.users(id),
  player2_id  uuid        REFERENCES auth.users(id),
  started_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  timeout_at  timestamptz
);

CREATE TABLE IF NOT EXISTS public.h2h_results (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    uuid        NOT NULL REFERENCES public.h2h_matches(id),
  user_id     uuid        NOT NULL REFERENCES auth.users(id),
  placements  jsonb       NOT NULL,
  score       int         NOT NULL,
  max_score   int         NOT NULL,
  finished_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);

-- ── Grants ────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.h2h_matches TO authenticated;
GRANT SELECT, INSERT          ON public.h2h_results TO authenticated;

-- ── Row Level Security ────────────────────────────────────────────

ALTER TABLE public.h2h_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.h2h_results ENABLE ROW LEVEL SECURITY;

-- h2h_matches: read own matches + any waiting room (player2 slot open)
DROP POLICY IF EXISTS "duel_match_select" ON public.h2h_matches;
CREATE POLICY "duel_match_select"
  ON public.h2h_matches FOR SELECT
  USING (
    auth.uid() = player1_id
    OR auth.uid() = player2_id
    OR (player2_id IS NULL AND status = 'waiting')
  );

-- h2h_matches: create a match as player1
DROP POLICY IF EXISTS "duel_match_insert" ON public.h2h_matches;
CREATE POLICY "duel_match_insert"
  ON public.h2h_matches FOR INSERT
  WITH CHECK (auth.uid() = player1_id);

-- h2h_matches: legacy broad update policy (superseded by Phase 2C
-- narrower policies in 20260520120000, but kept here as the base
-- so the schema file is self-consistent for fresh deployments where
-- 20260520120000 will apply immediately after)
DROP POLICY IF EXISTS "duel_match_update" ON public.h2h_matches;
CREATE POLICY "duel_match_update"
  ON public.h2h_matches FOR UPDATE
  USING (
    (player2_id IS NULL AND status = 'waiting')
    OR auth.uid() = player1_id
    OR auth.uid() = player2_id
  );

-- h2h_results: read own result always; read opponent result only after match ends
DROP POLICY IF EXISTS "duel_result_select" ON public.h2h_results;
CREATE POLICY "duel_result_select"
  ON public.h2h_results FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.h2h_matches m
       WHERE m.id = match_id
         AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
         AND m.status IN ('finished', 'abandoned')
    )
  );

-- h2h_results: insert own result on an active match you belong to
DROP POLICY IF EXISTS "duel_result_insert" ON public.h2h_results;
CREATE POLICY "duel_result_insert"
  ON public.h2h_results FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.h2h_matches m
       WHERE m.id = match_id
         AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
         AND m.status = 'active'
    )
  );

-- ── RPC: verify_and_save_duel_result ─────────────────────────────
-- Score is re-derived server-side from placements; client score is
-- never trusted.  Identity comes from auth.uid(), not a parameter.
-- First-submission-wins: ON CONFLICT DO NOTHING.
-- See 20260521000001 for the authoritative version history.

DROP FUNCTION IF EXISTS public.verify_and_save_duel_result(uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.verify_and_save_duel_result(
  p_match_id   uuid,
  p_placements jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller        uuid := auth.uid();
  v_match         h2h_matches%rowtype;
  v_elem          jsonb;
  v_placed        int;
  v_min           int;
  v_max           int;
  v_diff          int;
  v_points        int;
  v_score         int  := 0;
  v_max_score     int;
  v_both_done     boolean;
  v_opponent_id   uuid;
  v_opp_score     int;
  v_is_winner     boolean;
  v_rows_inserted int;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0001';
  END IF;

  IF p_placements IS NULL OR jsonb_array_length(p_placements) < 1 THEN
    RAISE EXCEPTION 'Placements array must not be empty' USING errcode = 'P0002';
  END IF;

  SELECT * INTO v_match FROM public.h2h_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found' USING errcode = 'P0003';
  END IF;

  IF v_match.player1_id != v_caller AND v_match.player2_id != v_caller THEN
    RAISE EXCEPTION 'User does not belong to this match' USING errcode = 'P0004';
  END IF;

  IF v_match.status != 'active' THEN
    RAISE EXCEPTION 'Match is not active (status: %)', v_match.status USING errcode = 'P0005';
  END IF;

  v_max_score := jsonb_array_length(p_placements) * 10;
  FOR v_elem IN SELECT jsonb_array_elements(p_placements) LOOP
    v_placed := (v_elem->>'placedRank')::int;
    v_min    := (v_elem->>'correctRankMin')::int;
    v_max    := (v_elem->>'correctRankMax')::int;

    IF v_placed >= v_min AND v_placed <= v_max THEN
      v_diff := 0;
    ELSIF v_placed < v_min THEN
      v_diff := v_min - v_placed;
    ELSE
      v_diff := v_placed - v_max;
    END IF;

    v_points := GREATEST(10 - v_diff, 1);
    v_score  := v_score + v_points;
  END LOOP;

  INSERT INTO public.h2h_results (match_id, user_id, placements, score, max_score)
  VALUES (p_match_id, v_caller, p_placements, v_score, v_max_score)
  ON CONFLICT (match_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  IF v_rows_inserted = 0 THEN
    SELECT score, max_score INTO v_score, v_max_score
    FROM public.h2h_results
    WHERE match_id = p_match_id AND user_id = v_caller;
  END IF;

  v_opponent_id := CASE WHEN v_caller = v_match.player1_id
                        THEN v_match.player2_id
                        ELSE v_match.player1_id
                   END;

  SELECT score INTO v_opp_score
  FROM public.h2h_results
  WHERE match_id = p_match_id AND user_id = v_opponent_id;

  v_is_winner := CASE WHEN v_opp_score IS NULL THEN NULL
                      ELSE (v_score > v_opp_score)
                 END;

  SELECT COUNT(*) = 2 INTO v_both_done
  FROM public.h2h_results
  WHERE match_id = p_match_id;

  IF v_both_done THEN
    UPDATE public.h2h_matches SET status = 'finished' WHERE id = p_match_id;
  END IF;

  RETURN jsonb_build_object(
    'score',     v_score,
    'max_score', v_max_score,
    'is_winner', v_is_winner
  );
END;
$$;

REVOKE ALL ON FUNCTION public.verify_and_save_duel_result(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_and_save_duel_result(uuid, jsonb) TO authenticated;
