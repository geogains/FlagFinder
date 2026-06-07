// js/achievements.js
// Centralized achievement evaluation pipeline.
// Call evaluateAchievements() from every game completion point.
// The DB-side RPC handles conditions and deduplication — this file handles
// orchestration and popup sequencing only.

import { showAchievementQueue, waitForStreakPopupClose, BADGE_META } from './achievement-celebration.js';

export { BADGE_META };

// ---------------------------------------------------------------------------
// evaluateAchievements(supabase, session, options)
// options.silent = true  →  evaluate and update DB, but show no popups.
//                            Used for retroactive catch on account.html load.
// ---------------------------------------------------------------------------
export async function evaluateAchievements(supabase, session, options = {}) {
  if (!session?.user) return [];

  let unlocked = [];
  try {
    const { data, error } = await supabase.rpc('evaluate_and_award_achievements');
    if (error) {
      console.warn('⚠️ Achievement evaluation failed:', error.message);
      return [];
    }
    unlocked = Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn('⚠️ Achievement evaluation error:', e);
    return [];
  }

  if (!unlocked.length || options.silent) return unlocked;

  // Show popup(s) after a generous delay that clears:
  // - results page entrance animation (~500ms)
  // - streak popup scheduling delay (1500ms) + animation
  // - premium modal possibility
  setTimeout(async () => {
    await waitForStreakPopupClose();
    showAchievementQueue(unlocked);
  }, 3000);

  return unlocked;
}
