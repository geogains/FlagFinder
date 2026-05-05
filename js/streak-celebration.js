// js/streak-celebration.js
// Streak celebration modal — shown after record_user_activity when streak increases.

// ---------------------------------------------------------------------------
// Confetti
// ---------------------------------------------------------------------------

const CONFETTI_COLORS = [
  '#ff6f61', '#ff9770', '#fbbf24', '#f59e0b',
  '#34d399', '#60a5fa', '#a78bfa', '#f472b6'
];

function buildConfetti() {
  const wrap = document.createElement('div');
  wrap.className = 'sc-confetti';
  wrap.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 24; i++) {
    const p = document.createElement('span');
    p.className = 'sc-piece';
    const size = 6 + Math.random() * 6;
    p.style.cssText =
      `left:${Math.random() * 100}%;` +
      `background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};` +
      `--dur:${(1.4 + Math.random() * 1.2).toFixed(2)}s;` +
      `--del:${(Math.random() * 0.9).toFixed(2)}s;` +
      `width:${size.toFixed(1)}px;` +
      `height:${size.toFixed(1)}px;` +
      `border-radius:${Math.random() > 0.5 ? '50%' : '3px'};`;
    wrap.appendChild(p);
  }
  return wrap;
}

// ---------------------------------------------------------------------------
// Number count-up (ease-out cubic)
// ---------------------------------------------------------------------------

function countUp(el, from, to, duration) {
  const start = performance.now();
  const diff = to - from;
  function step(now) {
    const raw = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - raw, 3);
    el.textContent = Math.round(from + diff * eased);
    if (raw < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------------------
// Wait for premium upsell modal to close (if visible)
// ---------------------------------------------------------------------------

function waitForPremiumModalClose() {
  return new Promise(resolve => {
    const modal = document.getElementById('premiumModal');
    if (!modal?.classList.contains('visible')) { resolve(); return; }
    const obs = new MutationObserver(() => {
      if (!modal.classList.contains('visible')) { obs.disconnect(); resolve(); }
    });
    obs.observe(modal, { attributes: true, attributeFilter: ['class'] });
  });
}

// ---------------------------------------------------------------------------
// CSS (injected once)
// ---------------------------------------------------------------------------

const STYLES = `
.sc-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  opacity: 0;
  animation: scBackdropIn 0.25s ease forwards;
}
@keyframes scBackdropIn { to { opacity: 1; } }

.sc-modal {
  position: relative;
  background: #fff;
  border-radius: 28px;
  padding: 44px 36px 36px;
  width: min(380px, calc(100vw - 32px));
  text-align: center;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.22);
  transform: scale(0.82) translateY(24px);
  opacity: 0;
  animation: scModalIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s forwards;
  overflow: hidden;
}
@keyframes scModalIn {
  to { transform: scale(1) translateY(0); opacity: 1; }
}

/* Confetti layer — behind content */
.sc-confetti {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}
.sc-piece {
  position: absolute;
  top: -14px;
  opacity: 0;
  animation: scFall var(--dur) var(--del) ease-in both;
}
@keyframes scFall {
  0%   { transform: translateY(0) rotate(0deg);      opacity: 1; }
  80%  { opacity: 0.9; }
  100% { transform: translateY(440px) rotate(600deg); opacity: 0; }
}

/* Content — above confetti */
.sc-content {
  position: relative;
  z-index: 1;
}

.sc-flame {
  font-size: 4.5rem;
  display: block;
  margin-bottom: 2px;
  animation: scFlameIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.28s both;
}
@keyframes scFlameIn {
  from { transform: scale(0) rotate(-15deg); opacity: 0; }
  to   { transform: scale(1) rotate(0deg);   opacity: 1; }
}

.sc-title {
  font-family: 'Poppins', sans-serif;
  font-size: 1.65rem;
  font-weight: 800;
  color: #0d315a;
  margin: 0 0 18px;
  animation: scFadeUp 0.4s ease 0.42s both;
}

.sc-number-wrap {
  margin-bottom: 2px;
  animation: scFadeUp 0.4s ease 0.52s both;
}
.sc-number {
  font-family: 'Poppins', sans-serif;
  font-size: 5.5rem;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #ff9770 0%, #ff6f61 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: inline-block;
}

.sc-day-label {
  font-family: 'Poppins', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 18px;
  animation: scFadeUp 0.4s ease 0.58s both;
}

.sc-message {
  font-family: 'Poppins', sans-serif;
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0 0 26px;
  line-height: 1.5;
  animation: scFadeUp 0.4s ease 0.63s both;
}

.sc-btn {
  display: block;
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #ff9770 0%, #ff6f61 100%);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-family: 'Poppins', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(255, 111, 97, 0.38);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  animation: scFadeUp 0.4s ease 0.68s both;
}
.sc-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(255, 111, 97, 0.5);
}
.sc-btn:active {
  transform: translateY(0);
}

@keyframes scFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 420px) {
  .sc-modal    { padding: 36px 24px 28px; }
  .sc-flame    { font-size: 3.8rem; }
  .sc-number   { font-size: 4.5rem; }
  .sc-title    { font-size: 1.4rem; }
}
`;

let _stylesInjected = false;
function injectStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// showStreakCelebration(prevStreak, newStreak)
// ---------------------------------------------------------------------------

export function showStreakCelebration(prevStreak, newStreak) {
  injectStyles();

  const backdrop = document.createElement('div');
  backdrop.className = 'sc-backdrop';
  backdrop.id = 'streakCelebrationOverlay';

  const modal = document.createElement('div');
  modal.className = 'sc-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'Streak extended');

  modal.appendChild(buildConfetti());

  const content = document.createElement('div');
  content.className = 'sc-content';
  content.innerHTML = `
    <span class="sc-flame">🔥</span>
    <h2 class="sc-title">Streak Extended!</h2>
    <div class="sc-number-wrap">
      <span class="sc-number" id="scNum">0</span>
    </div>
    <p class="sc-day-label">day streak</p>
    <p class="sc-message">Come back tomorrow to keep it alive.</p>
    <button class="sc-btn" id="scContinueBtn">Continue</button>
  `;
  modal.appendChild(content);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  // Always count up from 0 → newStreak; scale duration so large numbers don't jump
  const countDuration = newStreak > 100 ? 1200 : newStreak > 50 ? 950 : 700;
  setTimeout(() => {
    const numEl = document.getElementById('scNum');
    if (numEl) countUp(numEl, 0, newStreak, countDuration);
  }, 580);

  function close() {
    backdrop.style.opacity = '0';
    backdrop.style.transition = 'opacity 0.22s ease';
    setTimeout(() => backdrop.remove(), 240);
  }

  document.getElementById('scContinueBtn').addEventListener('click', close);
  // Tap outside modal also closes
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
}

// ---------------------------------------------------------------------------
// recordActivityAndMaybeCelebrate({ categoryId, gameMode })
// Replaces the inline record_user_activity call in each results page.
// Returns { error } — same shape as the supabase rpc call it wraps.
// ---------------------------------------------------------------------------

export async function recordActivityAndMaybeCelebrate(supabase, session, { categoryId, gameMode }) {
  // 1. Snapshot streak BEFORE the RPC
  const { data: beforeData } = await supabase
    .from('user_streaks')
    .select('current_streak')
    .eq('user_id', session.user.id)
    .maybeSingle();
  const prevStreak = beforeData?.current_streak ?? 0;

  // 2. Call record_user_activity (same call that existed before)
  const { error } = await supabase.rpc('record_user_activity', {
    p_category_id: categoryId,
    p_game_mode: gameMode
  });
  if (error) {
    console.error('⚠️ Streak update failed:', error);
    return { error };
  }
  console.log('🔥 Streak updated.');

  // 3. Snapshot streak AFTER the RPC
  const { data: afterData } = await supabase
    .from('user_streaks')
    .select('current_streak')
    .eq('user_id', session.user.id)
    .maybeSingle();
  const newStreak = afterData?.current_streak ?? 0;

  // 4. Dedup guard — one celebration per user per UTC day
  const today = new Date().toISOString().split('T')[0];
  const flagKey = `georanks_streak_celebrated:${session.user.id}`;
  const alreadyCelebrated = localStorage.getItem(flagKey) === today;

  if (newStreak > prevStreak && !alreadyCelebrated) {
    localStorage.setItem(flagKey, today);
    // Delay ensures results are visible; then yield to any premium modal first
    setTimeout(async () => {
      await waitForPremiumModalClose();
      showStreakCelebration(prevStreak, newStreak);
    }, 1500);
  }

  return { error: null };
}
