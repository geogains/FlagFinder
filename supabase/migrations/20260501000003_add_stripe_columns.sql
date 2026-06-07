-- ================================================================
-- Stripe billing columns on public.users.
--
-- Normalized from the original add_stripe_columns.sql (no timestamp).
-- Timestamped 20260501 to precede the subscription_tier migration
-- (20260519190000) which adds further billing-related columns.
-- ================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
