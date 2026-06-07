-- ================================================================
-- Fix equip_badge ownership check — drop stale is_badge_reward gate
-- 2026-06-07
--
-- equip_badge previously checked AND a.is_badge_reward = true, which
-- blocked all Bronze, Silver, Gold, Specialist T1/T2, and the two
-- new Platinum achievements from being equipped because Phase 2
-- inserted them with is_badge_reward = false.
--
-- badge_key is the source of truth: any earned achievement that has
-- a badge_key is equippable. The ownership proof is already provided
-- by the JOIN on user_achievements — is_badge_reward adds nothing and
-- blocked valid equips.
-- ================================================================

CREATE OR REPLACE FUNCTION public.equip_badge(p_badge_key text, p_slot_number int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_slot_number NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'invalid_slot';
  END IF;

  -- Verify user has earned an achievement that grants this badge_key.
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_achievements ua
    JOIN public.achievements a ON a.achievement_key = ua.achievement_key
    WHERE ua.user_id = auth.uid()
      AND a.badge_key = p_badge_key
  ) THEN
    RAISE EXCEPTION 'badge_not_earned';
  END IF;

  -- Remove from current slot if badge is already equipped elsewhere
  DELETE FROM public.user_equipped_badges
    WHERE user_id = auth.uid() AND badge_key = p_badge_key;

  -- Upsert into target slot (replaces whatever was in that slot)
  INSERT INTO public.user_equipped_badges (user_id, badge_key, slot_number)
  VALUES (auth.uid(), p_badge_key, p_slot_number)
  ON CONFLICT (user_id, slot_number)
  DO UPDATE SET badge_key = EXCLUDED.badge_key, created_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.equip_badge(text, int) TO authenticated;
