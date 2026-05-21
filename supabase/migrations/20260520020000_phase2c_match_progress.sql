-- ================================================================
-- Phase 2C Phase A: h2h_match_progress
--
-- Authoritative per-placement gameplay persistence for Duel.
-- Each player's committed placements are saved incrementally so that
-- a refresh/disconnect restores exact game state rather than
-- allowing a reroll attempt.
--
-- AUTHORITY MODEL:
--   This table is RECOVERY AUTHORITY, not live game authority.
--   The client (blind-ranking.js) is the live runtime — placements
--   happen instantly in memory.  The DB receives the same data
--   asynchronously via fire-and-forget upsert.  On any reload, the
--   DB state is used to restore the client — it is the canonical
--   record of what was committed before the session ended.
--
-- DESIGN DECISIONS:
--
--   Separate table (not a column on h2h_matches):
--     h2h_matches owns lifecycle (status, started_at, timeout_at).
--     Gameplay progression is different data with different access
--     patterns (frequent upserts during play vs. occasional reads).
--     Mixing them would bloat the lifecycle table and obscure its role.
--
--   JSONB placements (not normalized rows):
--     Each game mode (Classic, VS, Top10) has a different placement
--     structure.  A normalized table would require schema changes per
--     mode or a one-size-fits-all design that fits none well.  JSONB
--     lets each mode define its own structure while sharing the table.
--     The placement schema is enforced at the application layer.
--     Future: add a CHECK constraint or domain validation if needed.
--
--   Full array upsert (not delta/append):
--     Each upsert replaces the entire placements array.  This keeps
--     the DB row coherent regardless of write order and makes reads
--     trivial (one row = complete state).  At 10 placements per game
--     the overhead is negligible.
--
--   Composite PK (match_id, user_id):
--     Exactly one progress record per player per match.  Prevents
--     duplicate rows and makes upsert semantics clean.
--
--   ON DELETE CASCADE:
--     When cleanup_stale_duel_matches abandons a match, progress rows
--     disappear with it automatically.  No orphan accumulation.
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
