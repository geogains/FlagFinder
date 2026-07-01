-- ================================================================
-- Direct Player Challenges — Schema Extension
-- 2026-06-26
--
-- Extends h2h_matches with three new nullable columns and a new
-- status value ('direct_pending') to support asynchronous
-- head-to-head challenges between named players.
--
-- Design: single-source-of-truth in h2h_matches (no separate table).
-- All challenge lifecycle state is derivable from h2h_matches +
-- h2h_results using the new columns and the existing status machine.
--
-- New match_type = 'direct' lifecycle:
--   direct_pending  →  active  →  finished
--                   ↘  abandoned (declined / expired)
--
-- 'direct_pending': match is configured, challenger (player1) may
--   play their turn; player2 has not yet accepted. started_at and
--   timeout_at are NULL — these are set at acceptance time only.
--   This preserves the existing meaning of started_at:
--   "when the two-player live session began."
--
-- 'active': challenged player accepted, both players in game.
--   started_at = acceptance timestamp.
--   timeout_at = started_at + 5 minutes (existing cleanup Rule 2 applies).
--
-- 'finished', 'abandoned': unchanged semantics.
--   For abandoned direct challenges:
--     direct_abandon_reason = 'declined' — challenged player rejected it
--     direct_abandon_reason = 'expired'  — invite window closed
--     direct_abandon_reason IS NULL       — forfeited via cleanup Rule 2
-- ================================================================

-- ── 1. Extend status CHECK ────────────────────────────────────────

ALTER TABLE public.h2h_matches
  DROP CONSTRAINT IF EXISTS h2h_matches_status_check;

ALTER TABLE public.h2h_matches
  ADD CONSTRAINT h2h_matches_status_check
  CHECK (status IN (
    'waiting', 'category_select', 'active',
    'direct_pending',
    'finished', 'abandoned'
  ));


-- ── 2. Extend match_type CHECK ────────────────────────────────────

ALTER TABLE public.h2h_matches
  DROP CONSTRAINT IF EXISTS h2h_matches_match_type_check;

ALTER TABLE public.h2h_matches
  ADD CONSTRAINT h2h_matches_match_type_check
  CHECK (match_type IN ('private', 'quick', 'direct'));


-- ── 3. New columns — all nullable, safe for existing rows ─────────

-- The player who was challenged (the invite recipient).
-- Once accepted, this player becomes player2_id; the column is
-- retained because player2_id is set only at acceptance and the
-- challenged player must be able to see the match (via RLS) before
-- they accept.
ALTER TABLE public.h2h_matches
  ADD COLUMN IF NOT EXISTS invited_player_id uuid
  REFERENCES auth.users(id);

-- Hard deadline for the challenged player to accept.
-- 24 hours from challenge creation.  After this passes, the
-- cleanup function marks the match abandoned / expired.
ALTER TABLE public.h2h_matches
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamptz;

-- Reason an abandoned direct challenge ended without a result.
-- NULL for all non-direct matches and for direct challenges abandoned
-- by cleanup Rule 2 (active-but-timed-out).
ALTER TABLE public.h2h_matches
  ADD COLUMN IF NOT EXISTS direct_abandon_reason text
  CHECK (direct_abandon_reason IN ('declined', 'expired'));


-- ── 4. RLS: allow invited player to see the match ─────────────────
-- The challenged player must be able to read the match row to
-- display category, mode, and expiry in the challenge inbox before
-- they accept.  This clause is restricted to direct challenges so
-- it does not widen access for private or quick matches.

DROP POLICY IF EXISTS "duel_match_select" ON public.h2h_matches;
CREATE POLICY "duel_match_select"
  ON public.h2h_matches FOR SELECT
  USING (
    auth.uid() = player1_id
    OR auth.uid() = player2_id
    OR (player2_id IS NULL AND status = 'waiting')
    OR (match_type = 'direct' AND invited_player_id = auth.uid())
  );


-- ── 5. RLS: allow challenger to save mid-game progress ───────────
-- The existing INSERT policy on h2h_match_progress requires
-- m.status = 'active'.  The challenger plays while the match is
-- 'direct_pending', so their progress saves would silently fail.
-- This update adds the direct_pending path; all other behaviour
-- (UPDATE, SELECT, DELETE) is unchanged.

DROP POLICY IF EXISTS "progress_insert_own" ON public.h2h_match_progress;
CREATE POLICY "progress_insert_own"
  ON public.h2h_match_progress FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.h2h_matches m
       WHERE m.id = match_id
         AND (
           (
             (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
             AND m.status = 'active'
           )
           OR (
             m.match_type = 'direct'
             AND m.player1_id = auth.uid()
             AND m.status = 'direct_pending'
           )
         )
    )
  );


-- ── 6. Indexes ───────────────────────────────────────────────────

-- Fast lookup for the challenged player's inbox and notification count.
CREATE INDEX IF NOT EXISTS idx_h2h_direct_invited
  ON public.h2h_matches (invited_player_id, status)
  WHERE match_type = 'direct';

-- Prevent a challenger from having more than one pending direct
-- challenge to the same player at a time.  Once the challenge leaves
-- 'direct_pending' (accepted, declined, or expired), the index no
-- longer applies and a new challenge can be created.
CREATE UNIQUE INDEX IF NOT EXISTS idx_h2h_direct_one_pending_per_pair
  ON public.h2h_matches (player1_id, invited_player_id)
  WHERE match_type = 'direct' AND status = 'direct_pending';
