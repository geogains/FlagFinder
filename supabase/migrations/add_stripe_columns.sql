-- Add Stripe billing columns to users table
-- Required for Stripe Customer Portal (subscription management / cancellation)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
