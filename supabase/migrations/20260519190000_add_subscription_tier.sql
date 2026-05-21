-- Phase 1: Introduce subscription_tier enum + stripe_price_id.
-- is_premium is preserved and continues to drive all frontend gating.
-- All existing premium users are backfilled to subscription_tier = 'premium'.

DO $$ BEGIN
  CREATE TYPE public.subscription_tier AS ENUM ('free', 'light', 'premium');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_tier public.subscription_tier NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Backfill: any user already marked premium inherits the premium tier.
UPDATE public.users
  SET subscription_tier = 'premium'
  WHERE is_premium = true;
