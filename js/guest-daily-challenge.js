// js/guest-daily-challenge.js
// Guest Daily Challenge pipeline: persistent guest id, recording a completed
// guest attempt, and claiming it once the visitor signs up/in. Mirrors the
// authenticated save pipeline (see classicresults.html / top10results.html /
// vsresults.html "Pending Score Save" blocks) but for signed-out play.

import { maybeCelebrateStreak } from './streak-celebration.js';
import { showAchievementQueue, waitForStreakPopupClose } from './achievement-celebration.js';
import { maybeShowFirstBelieverReveal } from './first-believer.js';

const GUEST_ID_KEY = 'georanks_guest_id';
const PENDING_CLAIM_KEY = 'georanks_pending_guest_claim';

// Persistent, reused-forever browser guest identifier. No fingerprinting,
// no IP — a plain client-generated UUID in localStorage, same storage
// pattern the rest of the app already uses for other durable client state.
export function getOrCreateGuestId() {
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function getPendingGuestClaim() {
  try {
    const raw = localStorage.getItem(PENDING_CLAIM_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function clearPendingGuestClaim() {
  localStorage.removeItem(PENDING_CLAIM_KEY);
}

function storePendingGuestClaim(claim) {
  localStorage.setItem(PENDING_CLAIM_KEY, JSON.stringify(claim));
}

// submitGuestDailyAttempt(supabase, payload) — records a completed guest
// Daily Challenge attempt via the submit_guest_daily_attempt RPC and, on
// success, stashes the claim token in localStorage so it survives auth
// redirects, email verification and page refreshes.
//
// payload: { gameMode, categoryId, playedDate, score, maxScore, correctCount,
//            wrongCount, timeTaken, timeRemaining, gameStateJson, playableCount }
export async function submitGuestDailyAttempt(supabase, payload) {
  const guestId = getOrCreateGuestId();
  const { data, error } = await supabase.rpc('submit_guest_daily_attempt', {
    p_guest_id: guestId,
    p_game_mode: payload.gameMode,
    p_category_id: payload.categoryId,
    p_played_date: payload.playedDate,
    p_score: payload.score,
    p_max_score: payload.maxScore ?? null,
    p_correct_count: payload.correctCount ?? null,
    p_wrong_count: payload.wrongCount ?? null,
    p_time_taken: payload.timeTaken ?? null,
    p_time_remaining: payload.timeRemaining ?? null,
    p_game_state_json: payload.gameStateJson ?? null,
    p_playable_count: payload.playableCount ?? null
  });

  if (error) {
    console.error('⚠️ Guest attempt submission failed:', error);
    return { error: error.message };
  }

  if (data?.error) {
    console.warn('⚠️ Guest attempt rejected by server:', data.error);
    return { error: data.error };
  }

  if (data?.claim_token) {
    storePendingGuestClaim({
      attemptId: data.attempt_id,
      claimToken: data.claim_token,
      categoryId: payload.categoryId,
      gameMode: payload.gameMode,
      playedDate: payload.playedDate,
      score: payload.score,
      maxScore: payload.maxScore ?? null
    });
  }

  return { data };
}

// resolvePendingGuestClaim(supabase, session) — call whenever a session is
// present and a guest attempt might be waiting to be claimed: on results-page
// load, and right after a successful sign-in on auth.html. Idempotent and
// safe to call speculatively — it's a no-op if there's nothing pending.
export async function resolvePendingGuestClaim(supabase, session) {
  const pending = getPendingGuestClaim();
  if (!pending || !session?.user) return null;

  const { data, error } = await supabase.rpc('claim_guest_daily_attempt', {
    p_claim_token: pending.claimToken
  });

  if (error) {
    console.error('⚠️ Guest claim failed:', error);
    return { status: 'error', error: error.message };
  }

  if (data?.error) {
    console.warn('⚠️ Guest claim rejected:', data.error);
    // not_authenticated / attempt_not_found / already_claimed_by_other —
    // none of these are retryable with this token, so drop it.
    clearPendingGuestClaim();
    return { status: 'error', error: data.error };
  }

  if (data?.status === 'already_completed') {
    // This account already has a real result for that date — nothing to
    // attach, but not an error either. Stop offering the claim.
    clearPendingGuestClaim();
    return { status: 'already_completed', score: data.score };
  }

  if (data?.status === 'claimed') {
    clearPendingGuestClaim();

    if (data.already) {
      // Idempotent replay of a claim that already fully ran (streak,
      // achievements, history) — nothing left to display again.
      return { status: 'claimed', already: true, score: data.score };
    }

    window.plausible?.('daily_challenge_guest_claim_completed');

    // Streak/achievements were computed server-side inside the claim RPC
    // (same transaction as the score/history writes) — the client's job
    // here is only to display the same popups the authenticated flow shows,
    // using the values the RPC already returned.
    const celebrationSettled = maybeCelebrateStreak(session, data.prev_streak ?? 0, data.new_streak ?? 0);

    const achievements = Array.isArray(data.achievements) ? data.achievements : [];
    if (achievements.length) {
      setTimeout(async () => {
        await waitForStreakPopupClose();
        showAchievementQueue(achievements);
      }, 3000);
    }

    maybeShowFirstBelieverReveal(supabase, session, { celebrationSettled }).catch(() => {});

    return { status: 'claimed', already: false, score: data.score, newStreak: data.new_streak };
  }

  return { status: data?.status || 'unknown' };
}

// estimateLeaderboardPosition — read-only rank estimate against
// daily_challenge_scores for this category/date, the same table
// leaderboard.html's Daily tab already reads without requiring auth.
// Not guaranteed to stay accurate — the real leaderboard can change
// between this estimate and any later authenticated view.
export async function estimateLeaderboardPosition(supabase, { categoryId, playedDate, score }) {
  if (!categoryId || !playedDate || score == null) return null;
  const { count, error } = await supabase
    .from('daily_challenge_scores')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)
    .eq('played_date', playedDate)
    .eq('completed', true)
    .gt('score', score);
  if (error) {
    console.warn('⚠️ Rank estimate failed:', error.message);
    return null;
  }
  return (count ?? 0) + 1;
}

// ---------------------------------------------------------------------------
// showGuestResultsPrompt — the post-results conversion prompt. Same visual
// pattern (backdrop + centered card) as showStreakCelebration() in
// streak-celebration.js, injected into the DOM directly rather than requiring
// each results page to hand-author this markup, so it works identically
// across classicresults.html / top10results.html / vsresults.html regardless
// of their individual layouts.
// ---------------------------------------------------------------------------

const PROMPT_STYLES = `
.gdc-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.60);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  opacity: 0;
  animation: gdcBackdropIn 0.28s ease forwards;
  padding: 16px;
}
@keyframes gdcBackdropIn { to { opacity: 1; } }
.gdc-modal {
  background: #fff;
  border-radius: 24px;
  padding: 36px 32px 28px;
  width: min(420px, 100%);
  text-align: center;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.20), 0 4px 16px rgba(0, 0, 0, 0.08);
  font-family: 'Poppins', sans-serif;
  transform: scale(0.9);
  opacity: 0;
  animation: gdcModalIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s forwards;
}
@keyframes gdcModalIn { to { transform: scale(1); opacity: 1; } }
.gdc-eyebrow {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9ca3af;
  margin: 0 0 6px;
}
.gdc-score {
  font-size: 3rem;
  font-weight: 900;
  line-height: 1;
  color: #0d315a;
  margin: 0 0 6px;
}
.gdc-rank {
  font-size: 0.98rem;
  color: #6b7280;
  margin: 0 0 22px;
}
.gdc-benefits {
  text-align: left;
  font-size: 0.92rem;
  color: #4b5563;
  margin: 0 0 24px;
  padding: 14px 16px 14px 32px;
  background: rgba(13, 49, 90, 0.04);
  border-radius: 14px;
  line-height: 1.75;
}
.gdc-btn {
  display: block;
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-family: 'Poppins', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  margin-bottom: 10px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.gdc-btn-primary {
  background: linear-gradient(135deg, #ff9770 0%, #ff6f61 100%);
  color: #fff;
  box-shadow: 0 6px 20px rgba(255, 111, 97, 0.38);
}
.gdc-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(255, 111, 97, 0.5); }
.gdc-btn-secondary {
  background: rgba(13, 49, 90, 0.08);
  color: #0d315a;
}
.gdc-btn-secondary:hover { background: rgba(13, 49, 90, 0.12); }
.gdc-btn-tertiary {
  background: none;
  color: #9ca3af;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 8px;
  margin-bottom: 0;
  box-shadow: none;
}
.gdc-btn-tertiary:hover { color: #6b7280; }
@media (prefers-reduced-motion: reduce) {
  .gdc-backdrop, .gdc-modal { animation: none; opacity: 1; transform: none; }
}
`;

let _promptStylesInjected = false;
function injectPromptStyles() {
  if (_promptStylesInjected) return;
  _promptStylesInjected = true;
  const style = document.createElement('style');
  style.textContent = PROMPT_STYLES;
  document.head.appendChild(style);
}

function safeAuthReturnPath() {
  // The current results URL, as a bare relative path+query — never an
  // absolute URL, so it can't be used to redirect off-site later.
  return window.location.pathname + window.location.search;
}

// showGuestResultsPrompt({ score, maxScore, rank })
// Fires daily_challenge_registration_prompt_viewed on display and
// daily_challenge_registration_started when either auth button is used.
export function showGuestResultsPrompt({ score, maxScore, rank }) {
  injectPromptStyles();

  const backdrop = document.createElement('div');
  backdrop.className = 'gdc-backdrop';
  backdrop.id = 'guestResultsPromptOverlay';

  const modal = document.createElement('div');
  modal.className = 'gdc-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Save your Daily Challenge score');

  const scoreLine = maxScore != null ? `${score}/${maxScore}` : `${score}`;
  const rankLine = rank
    ? `<p class="gdc-rank">This would currently place you <strong>#${rank}</strong> today.</p>`
    : '';

  modal.innerHTML = `
    <p class="gdc-eyebrow">You scored</p>
    <p class="gdc-score">${scoreLine}</p>
    ${rankLine}
    <ul class="gdc-benefits">
      <li>Join the official Daily Challenge leaderboard</li>
      <li>Build and protect your daily streak</li>
      <li>Save this game to your history</li>
      <li>Unlock achievements and badges</li>
    </ul>
    <button class="gdc-btn gdc-btn-primary" id="gdcCreateAccountBtn">Create account and save score</button>
    <button class="gdc-btn gdc-btn-secondary" id="gdcSignInBtn">Sign in to claim score</button>
    <button class="gdc-btn gdc-btn-tertiary" id="gdcContinueBtn">Continue without saving</button>
  `;

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  window.plausible?.('daily_challenge_registration_prompt_viewed');

  const next = encodeURIComponent(safeAuthReturnPath());

  document.getElementById('gdcCreateAccountBtn').addEventListener('click', () => {
    window.plausible?.('daily_challenge_registration_started');
    window.location.href = `auth.html?mode=signup&next=${next}`;
  });
  document.getElementById('gdcSignInBtn').addEventListener('click', () => {
    window.plausible?.('daily_challenge_registration_started');
    window.location.href = `auth.html?mode=signin&next=${next}`;
  });
  document.getElementById('gdcContinueBtn').addEventListener('click', () => {
    backdrop.remove();
  });
}
