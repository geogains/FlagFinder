-- ================================================================
-- Phase 2 Finalization: verify_and_save_duel_result hardening
--
-- Three changes in one atomic replacement:
--
--   1. IDENTITY FIX (Critical)
--      Remove p_user_id from the parameter list.  The old signature
--      accepted the caller's identity from the client, which bypassed
--      the SECURITY DEFINER context and allowed a participant to submit
--      fabricated results on their opponent's behalf.  Identity is now
--      derived exclusively from auth.uid() inside the function body.
--
--   2. FIRST-SUBMISSION-WINS (Integrity)
--      Replace ON CONFLICT DO UPDATE with ON CONFLICT DO NOTHING.
--      A result row, once written, is immutable.  Duplicate submissions
--      (reconnect recovery, double-tap) return the existing committed
--      score rather than overwriting it.
--
--   3. EMPTY-PLACEMENT GUARD (Anti-abuse)
--      Reject calls where p_placements is empty or NULL.  An empty
--      array previously produced score=0 and finalized the match,
--      enabling deliberate forfeit abuse.
--
-- Frontend change required: duelgame.html must remove p_user_id from
-- the supabase.rpc('verify_and_save_duel_result', {...}) call.
-- ================================================================

-- Drop the old three-parameter overload.  IF EXISTS is safe for fresh
-- deployments where the old signature was never created.
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
  -- Caller must be authenticated
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING errcode = 'P0001';
  END IF;

  -- Reject empty or null placements before any DB work
  IF p_placements IS NULL OR jsonb_array_length(p_placements) < 1 THEN
    RAISE EXCEPTION 'Placements array must not be empty' USING errcode = 'P0002';
  END IF;

  -- Lock the match row to serialise concurrent submissions
  SELECT * INTO v_match FROM public.h2h_matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found' USING errcode = 'P0003';
  END IF;

  -- Caller must be a participant in this specific match
  IF v_match.player1_id != v_caller AND v_match.player2_id != v_caller THEN
    RAISE EXCEPTION 'User does not belong to this match' USING errcode = 'P0004';
  END IF;

  -- Match must be active
  IF v_match.status != 'active' THEN
    RAISE EXCEPTION 'Match is not active (status: %)', v_match.status USING errcode = 'P0005';
  END IF;

  -- Re-derive score server-side from submitted placements.
  -- Algorithm mirrors blind-ranking.js exactly.
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

  -- First-submission-wins: if a result row already exists, do nothing.
  INSERT INTO public.h2h_results (match_id, user_id, placements, score, max_score)
  VALUES (p_match_id, v_caller, p_placements, v_score, v_max_score)
  ON CONFLICT (match_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  -- Duplicate submission (reconnect recovery): return the committed score,
  -- not the score recomputed from the re-submitted placements.
  IF v_rows_inserted = 0 THEN
    SELECT score, max_score INTO v_score, v_max_score
    FROM public.h2h_results
    WHERE match_id = p_match_id AND user_id = v_caller;
  END IF;

  -- Determine opponent for winner comparison
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

  -- Mark match finished once both results are recorded
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
