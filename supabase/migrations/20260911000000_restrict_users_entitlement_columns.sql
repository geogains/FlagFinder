-- ================================================================
-- Security fix: restrict which columns an authenticated client may
-- directly UPDATE on their own public.users row.
--
-- Problem
-- -------
-- The bootstrap "users_update" RLS policy (20260430000000) only
-- checks auth.uid() = id. RLS is row-level, not column-level, so
-- any authenticated client can set ANY column on their own row via
-- PostgREST — including entitlement/billing fields:
--
--   supabase.from('users').update({ is_premium: true }).eq('id', uid)
--
-- Fix
-- ---
-- Postgres column-level privileges. REVOKE the blanket table-level
-- UPDATE grant from `authenticated` and re-GRANT UPDATE only on the
-- columns that have a genuine, audited direct-client write path
-- today. Every `.update()`/`.upsert()` call against public.users in
-- *.html and js/*.js was searched; the only three are:
--
--   • avatar_url   — account.html profile picture upload/remove
--   • country_code — account.html profile flag selector
--   • timezone     — js/supabase-client.js self-healing IANA sync
--
-- Column-level grants are enforced independently of RLS and fail
-- CLOSED for the whole statement: a payload that mixes an allowed
-- column with a disallowed one (e.g. { avatar_url: '...',
-- is_premium: true }) is rejected outright — there is no partial
-- write of just the allowed part.
--
-- INSERT is revoked outright (not column-restricted): no client
-- code anywhere inserts into public.users. Every row is created by
-- the handle_new_user() trigger (SECURITY DEFINER, runs as the
-- table owner), which is unaffected by this REVOKE. This closes the
-- equivalent "insert my own row with is_premium already true before
-- the trigger runs" race, at zero compatibility cost.
--
-- Explicitly NOT grantable, and why:
--   • username                    — must go through public.update_username(),
--                                    a SECURITY DEFINER RPC enforcing the
--                                    30-day cooldown, format, and reserved-
--                                    name rules server-side. SECURITY
--                                    DEFINER functions run as their owner
--                                    and are unaffected by this REVOKE.
--   • is_premium, subscription_tier, stripe_customer_id,
--     stripe_subscription_id, stripe_price_id, premium_since,
--     premium_until, cancellation_email_sent_at,
--     premium_ended_email_sent_at
--                                  — entitlement/billing fields. Written
--                                    only by supabase/functions/stripe-webhook
--                                    using the service-role key, which
--                                    bypasses RLS and table/column grants
--                                    entirely — untouched by this migration.
--   • id, email                   — identity fields, written only by
--                                    handle_new_user() (SECURITY DEFINER).
--   • last_username_change_at     — written only by update_username() RPC.
--   • profile_is_public           — no shipped UI writes this directly yet
--                                    (see 20260521000002/4); add it to the
--                                    GRANT list below when that settings UI
--                                    ships.
--   • total_games, current_streak, best_streak, achievement_count,
--     categories_played
--                                  — denormalized read-only counters,
--                                    written only by SECURITY DEFINER
--                                    trigger functions from 20260525000000.
--
-- Schema-drift note
-- ------------------
-- avatar_url, premium_since, premium_until, cancellation_email_sent_at
-- and premium_ended_email_sent_at are not created by any ADD COLUMN in
-- this migration history — they already exist in production as
-- pre-existing drift (consistent with the drift already documented in
-- 20260606000000_fix_upsert_high_score.sql). This migration does not
-- retroactively formalize them; it only changes privileges on columns
-- that already exist. The avatar_url grant below is guarded with an
-- information_schema check so this migration also runs cleanly
-- against a fresh environment built solely from tracked migrations,
-- where avatar_url does not yet exist — on such an environment the
-- grant is skipped as a no-op until a future migration formally adds
-- the column.
-- ================================================================

-- No client code inserts into public.users directly — every row is
-- created by the handle_new_user() trigger (SECURITY DEFINER, runs
-- as table owner, unaffected by this REVOKE).
REVOKE INSERT ON public.users FROM authenticated;

-- Remove blanket column access, then re-grant only the confirmed
-- self-service profile columns.
REVOKE UPDATE ON public.users FROM authenticated;

GRANT UPDATE (country_code, timezone) ON public.users TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'users'
       AND column_name  = 'avatar_url'
  ) THEN
    EXECUTE 'GRANT UPDATE (avatar_url) ON public.users TO authenticated';
  END IF;
END $$;

-- Defense in depth: make WITH CHECK explicit rather than relying on
-- Postgres's implicit "falls back to USING" behavior for UPDATE
-- policies. Behavior is unchanged (USING was already auth.uid() = id).
DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
