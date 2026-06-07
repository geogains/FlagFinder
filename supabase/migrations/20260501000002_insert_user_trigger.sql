-- ================================================================
-- New-user trigger: copy auth.users row into public.users on signup.
--
-- Normalized from the original insert_user_trigger.sql (no timestamp).
-- Timestamped 20260501 to precede the Stripe and subscription column
-- migrations that depend on public.users existing.
--
-- Note: handle_new_user() is later updated in 20260521000002 to also
-- copy the username from raw_user_meta_data when the username column
-- is formally added.  The version here is the original baseline.
-- ================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
