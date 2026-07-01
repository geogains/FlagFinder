// js/challenge-bell.js
// Populates the challenge notification bell injected by nav-menu-init.js.
// Called once per page load; never throws — auth failures are silently ignored.
import { supabase } from '/js/supabase-client.js';

(async () => {
  const bell = document.getElementById('challengeBell');
  if (!bell) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data, error } = await supabase.rpc('get_pending_challenge_count');
    if (error || !data) return;

    const count = data.count ?? 0;
    if (count <= 0) return;

    const countEl = document.getElementById('challengeBellCount');
    if (countEl) countEl.textContent = count > 9 ? '9+' : String(count);
    bell.style.display = 'flex';

    // Homepage banner — only present on index.html
    const banner    = document.getElementById('challengePendingBanner');
    const bannerTxt = document.getElementById('bannerChallengeCount');
    if (banner && bannerTxt) {
      bannerTxt.textContent = count === 1 ? '1 pending challenge' : `${count} pending challenges`;
      banner.style.display = 'flex';
    }
  } catch (_) {}
})();
