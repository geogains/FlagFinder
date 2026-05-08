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
  // 22–27 particles, randomised per call
  const count = 22 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'sc-piece';
    const size   = (5 + Math.random() * 8).toFixed(1);
    const dx     = ((Math.random() * 120) - 60).toFixed(0); // ±60 px sideways drift
    const rot    = (300 + Math.random() * 620).toFixed(0);  // 300–920 deg rotation
    const dur    = (1.3 + Math.random() * 1.5).toFixed(2);  // 1.3–2.8 s
    const del    = (0.45 + Math.random() * 0.85).toFixed(2);// 0.45–1.30 s (fires after entrance)
    const left   = (Math.random() * 94 + 3).toFixed(1);
    p.style.cssText =
      `left:${left}%;` +
      `background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};` +
      `--dur:${dur}s;` +
      `--del:${del}s;` +
      `--dx:${dx}px;` +
      `--rot:${rot}deg;` +
      `width:${size}px;` +
      `height:${size}px;` +
      `border-radius:${Math.random() > 0.45 ? '50%' : '2px'};`;
    wrap.appendChild(p);
  }
  return wrap;
}

// ---------------------------------------------------------------------------
// Number count-up (ease-out cubic) — onComplete fires when counter lands
// ---------------------------------------------------------------------------

function countUp(el, from, to, duration, onComplete) {
  const start = performance.now();
  const diff  = to - from;
  function step(now) {
    const raw   = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - raw, 3);
    el.textContent = Math.round(from + diff * eased);
    if (raw < 1) {
      requestAnimationFrame(step);
    } else if (onComplete) {
      onComplete();
    }
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
/* ── Backdrop ─────────────────────────────────────────────── */
.sc-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.60);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  opacity: 0;
  animation: scBackdropIn 0.28s ease forwards;
}
@keyframes scBackdropIn { to { opacity: 1; } }

/* ── Warm glow behind card ─────────────────────────────────── */
.sc-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 540px;
  height: 540px;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0.5);
  background: radial-gradient(
    circle,
    rgba(255, 175, 105, 0.28) 0%,
    rgba(255, 111,  97, 0.12) 40%,
    transparent 70%
  );
  pointer-events: none;
  opacity: 0;
  animation: scGlowIn 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards;
  z-index: 0;
}
@keyframes scGlowIn {
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

/* ── Card ───────────────────────────────────────────────────── */
.sc-modal {
  position: relative;
  background: #fff;
  border-radius: 28px;
  padding: 44px 36px 36px;
  width: min(380px, calc(100vw - 32px));
  text-align: center;
  box-shadow:
    0 32px 80px rgba(0, 0, 0, 0.20),
    0  4px 16px rgba(0, 0, 0, 0.08);
  transform: scale(0.78) translateY(30px);
  opacity: 0;
  animation: scModalIn 0.52s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s forwards;
  overflow: hidden;
  z-index: 1;
}
@keyframes scModalIn {
  to { transform: scale(1) translateY(0); opacity: 1; }
}

/* ── Confetti (behind content) ─────────────────────────────── */
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
  0%   { transform: translateX(0)        translateY(0)     rotate(0deg);   opacity: 1;   }
  70%  { opacity: 0.85; }
  100% { transform: translateX(var(--dx)) translateY(490px) rotate(var(--rot)); opacity: 0; }
}

/* ── Content (above confetti) ──────────────────────────────── */
.sc-content {
  position: relative;
  z-index: 1;
}

/* ── Flame ─────────────────────────────────────────────────── */
.sc-flame {
  font-size: 4.8rem;
  display: block;
  margin-bottom: 4px;
  transform-origin: center bottom;
  /* entrance + looping idle pulse (starts after entrance finishes) */
  animation:
    scFlameIn    0.5s  cubic-bezier(0.34, 1.56, 0.64, 1) 0.32s both,
    scFlamePulse 2.8s  ease-in-out                       1.2s  infinite;
}
@keyframes scFlameIn {
  from { transform: scale(0) translateY(8px); opacity: 0; }
  to   { transform: scale(1) translateY(0);   opacity: 1; }
}
@keyframes scFlamePulse {
  0%,  100% { transform: scale(1)    translateY(0);   }
  38%        { transform: scale(1.07) translateY(-3px); }
  68%        { transform: scale(0.97) translateY(1px);  }
}

/* ── Title ─────────────────────────────────────────────────── */
.sc-title {
  font-family: 'Poppins', sans-serif;
  font-size: 1.65rem;
  font-weight: 800;
  color: #0d315a;
  margin: 0 0 18px;
  animation: scFadeUp 0.38s cubic-bezier(0.34, 1.4, 0.64, 1) 0.48s both;
}

/* ── Number ────────────────────────────────────────────────── */
.sc-number-wrap {
  margin-bottom: 2px;
  animation: scFadeUp 0.38s cubic-bezier(0.34, 1.4, 0.64, 1) 0.56s both;
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
/* Pop class added by JS when count-up lands */
.sc-number-pop {
  animation: scNumPop 0.48s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes scNumPop {
  0%   { transform: scale(1);    }
  52%  { transform: scale(1.22); }
  100% { transform: scale(1);    }
}

/* ── Day label ─────────────────────────────────────────────── */
.sc-day-label {
  font-family: 'Poppins', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0 0 16px;
  animation: scFadeUp 0.35s ease 0.62s both;
}

/* ── Message ───────────────────────────────────────────────── */
.sc-message {
  font-family: 'Poppins', sans-serif;
  font-size: 0.95rem;
  color: #6b7280;
  margin: 0 0 26px;
  line-height: 1.5;
  animation: scFadeUp 0.35s ease 0.68s both;
}

/* ── Button ────────────────────────────────────────────────── */
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
  transition: transform 0.22s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.22s ease;
  animation: scFadeUp 0.35s ease 0.74s both;
}
.sc-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(255, 111, 97, 0.52);
}
.sc-btn:active {
  transform: scale(0.96) translateY(0);
  box-shadow: 0 4px 12px rgba(255, 111, 97, 0.28);
  transition-duration: 0.08s;
}

/* ── Shared fade-up keyframe ───────────────────────────────── */
@keyframes scFadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0);    }
}

/* ── Mobile ────────────────────────────────────────────────── */
@media (max-width: 420px) {
  .sc-modal    { padding: 36px 24px 28px; }
  .sc-flame    { font-size: 4rem; }
  .sc-number   { font-size: 4.5rem; }
  .sc-title    { font-size: 1.4rem; }
  .sc-glow     { width: 300px; height: 300px; }
}

/* ── Reduced motion ────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .sc-backdrop { animation: scBackdropIn 0.15s ease forwards; }
  .sc-glow     { animation: none; opacity: 0; }
  .sc-modal    {
    animation: none;
    transform: none;
    opacity: 1;
  }
  .sc-flame    { animation: none; }
  .sc-title,
  .sc-number-wrap,
  .sc-day-label,
  .sc-message,
  .sc-btn      { animation: none; opacity: 1; transform: none; }
  .sc-piece    { display: none; }
  .sc-number-pop { animation: none; }
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
// getEffectiveStreak(currentStreak, lastPlayedDate, timezone)
// Returns the streak value that should be displayed to the user.
// If the user has missed more than 1 local calendar day since last_played_date,
// returns 0 — the database value is preserved but the display is suppressed.
// ---------------------------------------------------------------------------

export function getEffectiveStreak(currentStreak, lastPlayedDate, timezone) {
  if (!currentStreak || currentStreak <= 0 || !lastPlayedDate) return 0;

  const tz = timezone || 'UTC';

  // 'sv' locale reliably formats as YYYY-MM-DD for any IANA timezone
  const todayLocal = new Intl.DateTimeFormat('sv', { timeZone: tz }).format(new Date());

  // Parse both dates as UTC midnight to avoid DST arithmetic artifacts
  const todayMs  = Date.parse(todayLocal     + 'T00:00:00Z');
  const lastMs   = Date.parse(lastPlayedDate + 'T00:00:00Z');
  const daysDiff = Math.floor((todayMs - lastMs) / 86400000);

  // Streak is alive if played today (0 days ago) or yesterday (1 day ago)
  return daysDiff <= 1 ? currentStreak : 0;
}

// ---------------------------------------------------------------------------
// showStreakCelebration(prevStreak, newStreak)
// ---------------------------------------------------------------------------

export function showStreakCelebration(prevStreak, newStreak) {
  injectStyles();

  const backdrop = document.createElement('div');
  backdrop.className = 'sc-backdrop';
  backdrop.id = 'streakCelebrationOverlay';

  // Warm glow — sits behind the card in the backdrop
  const glow = document.createElement('div');
  glow.className = 'sc-glow';
  backdrop.appendChild(glow);

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

  // Duration scales so large numbers don't blur past too fast
  const countDuration =
    newStreak > 100 ? 1700 :
    newStreak > 50  ? 1400 :
    newStreak > 10  ? 1100 : 800;

  // Start counting after the card + text entrance is mostly complete (~700 ms)
  setTimeout(() => {
    const numEl = document.getElementById('scNum');
    if (!numEl) return;
    countUp(numEl, 0, newStreak, countDuration, () => {
      numEl.classList.add('sc-number-pop');
    });
  }, 700);

  function close() {
    backdrop.style.opacity = '0';
    backdrop.style.transition = 'opacity 0.22s ease';
    setTimeout(() => backdrop.remove(), 240);
  }

  document.getElementById('scContinueBtn').addEventListener('click', close);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
}

// ---------------------------------------------------------------------------
// recordActivityAndMaybeCelebrate({ categoryId, gameMode })
// Replaces the inline record_user_activity call in each results page.
// Returns { error } — same shape as the supabase rpc call it wraps.
// ---------------------------------------------------------------------------

export async function recordActivityAndMaybeCelebrate(supabase, session, { categoryId, gameMode }) {
  // 1. Snapshot streak BEFORE the RPC — use effective value so the
  //    celebration fires correctly even after a broken-streak restart.
  const { data: beforeData } = await supabase
    .from('user_streaks')
    .select('current_streak, last_played_date')
    .eq('user_id', session.user.id)
    .maybeSingle();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const prevStreak = getEffectiveStreak(
    beforeData?.current_streak,
    beforeData?.last_played_date,
    tz
  );

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
