-- ================================================================
-- Phase 2C Phase A: h2h_match_progress
--
-- Authoritative per-placement gameplay persistence for Duel.
-- Each player's committed placements are saved incrementally so that
-- a refresh/disconnect restores exact game state rather than
-- allowing a reroll attempt.
--
-- Design decisions:
--   • Separate table from h2h_matches — match lifecycle ≠ gameplay content
--   • Composite PK (match_id, user_id) — one row per player per match,
--     upsert-safe with no surrogate ID
--   • JSONB placements — flexible for Classic/VS/Top10 without migrations
--   • ON DELETE CASCADE — progress rows are cleaned up with the match
--   • game_mode column — extensible to future Duel variants
-- ================================================================

CREATE TABLE public.h2h_match_progress (
  match_id    uuid        NOT NULL REFERENCES public.h2h_matches(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id),
  game_mode   text        NOT NULL DEFAULT 'classic',
  placements  jsonb       NOT NULL DEFAULT '[]',
  -- Each placement: { countryCode, ordinalIndex, placedRank,
  --                   correctRankMin, correctRankMax, points }
  saved_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (match_id, user_id)
);

-- Grant table-level access — RLS policies enforce row ownership
GRANT SELECT, INSERT, UPDATE ON public.h2h_match_progress TO authenticated;

ALTER TABLE public.h2h_match_progress ENABLE ROW LEVEL SECURITY;

-- SELECT: players can only read their own progress (no opponent visibility)
CREATE POLICY "progress_select_own"
  ON public.h2h_match_progress FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: must be own row AND caller must be an active match participant.
-- Prevents writing progress for matches the caller doesn't belong to.
CREATE POLICY "progress_insert_own"
  ON public.h2h_match_progress FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.h2h_matches m
      WHERE m.id = match_id
        AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
        AND m.status = 'active'
    )
  );

-- UPDATE: must be own row (participation already validated at INSERT time)
CREATE POLICY "progress_update_own"
  ON public.h2h_match_progress FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
