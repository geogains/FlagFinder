// js/first-believer.js
// The "First Believer" special badge — a permanent, honorary, account-specific
// recognition. Deliberately isolated from the normal achievement/badge system:
// it is not in `achievements`, not in `user_achievements`, and does not affect
// achievement_count or the platinum badge total for anyone. See the special
// badge migration (20260726000000_first_believer_special_badge.sql) for the
// server-side authorisation and storage.
//
// This module never contains any UUID or username — authorisation lives
// entirely server-side in maybe_grant_first_believer_badge(). Every function
// here is safe to call for any authenticated user: for everyone except the
// authorised recipient (or a manually-granted tester row), every RPC call
// below resolves to "nothing applies" and nothing is ever rendered.

const OVERLAY_ID = 'firstBelieverOverlay';

// ---------------------------------------------------------------------------
// RPC wrappers — each one swallows errors and returns a safe "nothing to do"
// value rather than throwing, so a missing migration, a network failure, or
// an unauthenticated session never surfaces to the result page.
// ---------------------------------------------------------------------------

async function grantFirstBelieverIfEligible(supabase) {
  try {
    const { data, error } = await supabase.rpc('maybe_grant_first_believer_badge');
    if (error) {
      // Expected/harmless for every normal user once RLS + the allowlist
      // check inside the RPC reject them, and also expected locally before
      // the migration has been applied (function does not exist yet).
      console.warn('[first-believer] grant check unavailable:', error.message);
      return null;
    }
    return data?.status ?? null;
  } catch (e) {
    console.warn('[first-believer] grant check failed:', e?.message);
    return null;
  }
}

async function getPendingFirstBelieverReveal(supabase) {
  try {
    const { data, error } = await supabase.rpc('get_pending_first_believer_reveal');
    if (error) {
      console.warn('[first-believer] pending-reveal check unavailable:', error.message);
      return null;
    }
    return data ?? null;
  } catch (e) {
    console.warn('[first-believer] pending-reveal check failed:', e?.message);
    return null;
  }
}

async function markFirstBelieverRevealed(supabase) {
  try {
    const { data, error } = await supabase.rpc('mark_special_badge_revealed');
    if (error) {
      console.warn('[first-believer] mark-revealed call failed:', error.message);
      return null;
    }
    return data?.status ?? null;
  } catch (e) {
    console.warn('[first-believer] mark-revealed call failed:', e?.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Modal — refined platinum/pearlescent presentation, distinct from the warm
// orange streak-celebration styling. Injected once per page.
// ---------------------------------------------------------------------------

// Exported so account.html and u/index.html can render the same emblem in
// their (much smaller, static) badge tiles without duplicating the markup.
export const FIRST_BELIEVER_EMBLEM_SVG = `
<svg viewBox="0 0 120 120" width="88" height="88" aria-hidden="true">
  <defs>
    <radialGradient id="fbEmblemBg" cx="35%" cy="30%" r="75%">
      <stop offset="0%"  stop-color="#fffdf6"/>
      <stop offset="45%" stop-color="#f3e9d2"/>
      <stop offset="100%" stop-color="#cbb989"/>
    </radialGradient>
    <linearGradient id="fbEmblemRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%"  stop-color="#fff7e0"/>
      <stop offset="50%" stop-color="#d9c68f"/>
      <stop offset="100%" stop-color="#a98f5c"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="56" fill="url(#fbEmblemBg)" stroke="url(#fbEmblemRing)" stroke-width="4"/>
  <!-- eight-point compass star -->
  <g fill="#8a7440" opacity="0.9">
    <polygon points="60,14 67,50 60,60 53,50" />
    <polygon points="106,60 70,67 60,60 70,53" />
    <polygon points="60,106 53,70 60,60 67,70" />
    <polygon points="14,60 50,53 60,60 50,67" />
  </g>
  <g fill="#b89a54" opacity="0.75">
    <polygon points="90,30 68,52 60,60 62,52" transform="rotate(45 60 60)"/>
    <polygon points="90,30 68,52 60,60 62,52" transform="rotate(135 60 60)"/>
    <polygon points="90,30 68,52 60,60 62,52" transform="rotate(225 60 60)"/>
    <polygon points="90,30 68,52 60,60 62,52" transform="rotate(315 60 60)"/>
  </g>
  <!-- heart-and-compass centerpoint -->
  <path d="M60 72
           C 50 63, 40 56, 40 47
           C 40 40, 46 35, 52 35
           C 56 35, 59 37, 60 41
           C 61 37, 64 35, 68 35
           C 74 35, 80 40, 80 47
           C 80 56, 70 63, 60 72 Z"
        fill="#9c1f3f" opacity="0.88"/>
  <circle cx="60" cy="60" r="3.2" fill="#fffdf6"/>
</svg>`;

function buildSparkle() {
  const wrap = document.createElement('div');
  wrap.className = 'fb-sparkle-field';
  wrap.setAttribute('aria-hidden', 'true');
  const count = 10 + Math.floor(Math.random() * 5); // restrained — not confetti
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'fb-sparkle';
    const size = (3 + Math.random() * 4).toFixed(1);
    const left = (Math.random() * 96 + 2).toFixed(1);
    const top  = (Math.random() * 92 + 4).toFixed(1);
    const dur  = (2.2 + Math.random() * 1.6).toFixed(2);
    const del  = (Math.random() * 2.2).toFixed(2);
    p.style.cssText =
      `left:${left}%;top:${top}%;width:${size}px;height:${size}px;` +
      `--dur:${dur}s;--del:${del}s;`;
    wrap.appendChild(p);
  }
  return wrap;
}

const STYLES = `
.fb-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 12, 20, 0.66);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  opacity: 0;
  animation: fbBackdropIn 0.4s ease forwards;
}
@keyframes fbBackdropIn { to { opacity: 1; } }

.fb-glow {
  position: absolute;
  top: 50%; left: 50%;
  width: 560px; height: 560px;
  border-radius: 50%;
  transform: translate(-50%, -50%) scale(0.5);
  background: radial-gradient(circle,
    rgba(255, 244, 214, 0.35) 0%,
    rgba(200, 176, 120, 0.16) 42%,
    transparent 72%);
  pointer-events: none;
  opacity: 0;
  animation: fbGlowIn 1s cubic-bezier(0.22, 1, 0.36, 1) 0.15s forwards;
}
@keyframes fbGlowIn { to { opacity: 1; transform: translate(-50%, -50%) scale(1); } }

.fb-modal {
  position: relative;
  background: linear-gradient(165deg, #fffdf8 0%, #f6f1e4 55%, #ece3cd 100%);
  border-radius: 30px;
  padding: 40px 34px 34px;
  width: min(400px, calc(100vw - 32px));
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  text-align: center;
  box-shadow:
    0 40px 90px rgba(0, 0, 0, 0.32),
    0 0 0 1px rgba(255, 255, 255, 0.4) inset;
  transform: scale(0.8) translateY(26px);
  opacity: 0;
  animation: fbModalIn 0.62s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards;
  z-index: 1;
}
@keyframes fbModalIn { to { transform: scale(1) translateY(0); opacity: 1; } }

.fb-sparkle-field {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 30px;
  pointer-events: none;
  z-index: 0;
}
.fb-sparkle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, #fff9e6 0%, #d9c68f 60%, transparent 100%);
  opacity: 0;
  animation: fbTwinkle var(--dur) var(--del) ease-in-out infinite;
}
@keyframes fbTwinkle {
  0%, 100% { opacity: 0; transform: scale(0.6); }
  50%      { opacity: 0.9; transform: scale(1.15); }
}

.fb-content { position: relative; z-index: 1; }

.fb-eyebrow {
  font-family: 'Poppins', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #9c8a5c;
  margin: 0 0 18px;
  animation: fbFadeUp 0.4s ease 0.35s both;
}

.fb-emblem-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
  animation: fbEmblemIn 0.6s cubic-bezier(0.34, 1.4, 0.64, 1) 0.42s both;
}
@keyframes fbEmblemIn { from { transform: scale(0.4); opacity: 0; } to { transform: scale(1); opacity: 1; } }

.fb-emblem-shimmer {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0%, rgba(255,255,255,0.9) 8%, transparent 16%);
  animation: fbShimmerSpin 3.2s linear infinite;
  opacity: 0.85;
}
@keyframes fbShimmerSpin { to { transform: rotate(360deg); } }

.fb-title {
  font-family: 'Poppins', sans-serif;
  font-size: 1.7rem;
  font-weight: 800;
  background: linear-gradient(135deg, #8a7440 0%, #b89a54 50%, #8a7440 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 10px;
  animation: fbFadeUp 0.4s ease 0.5s both;
}

.fb-desc {
  font-family: 'Poppins', sans-serif;
  font-size: 0.86rem;
  color: #6b6350;
  line-height: 1.5;
  margin: 0 0 22px;
  animation: fbFadeUp 0.4s ease 0.58s both;
}

.fb-message {
  font-family: 'Poppins', sans-serif;
  font-size: 0.95rem;
  color: #3d3626;
  line-height: 1.65;
  text-align: left;
  white-space: pre-line;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(184, 154, 84, 0.3);
  border-radius: 16px;
  padding: 18px 20px;
  margin: 0 0 26px;
  animation: fbFadeUp 0.4s ease 0.66s both;
}

.fb-btn {
  display: block;
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #cdb06a 0%, #8a7440 100%);
  color: #fff;
  border: none;
  border-radius: 14px;
  font-family: 'Poppins', sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 22px rgba(138, 116, 64, 0.4);
  transition: transform 0.22s cubic-bezier(0.34, 1.4, 0.64, 1), box-shadow 0.22s ease;
  animation: fbFadeUp 0.4s ease 0.74s both;
}
.fb-btn:hover   { transform: translateY(-3px); box-shadow: 0 14px 32px rgba(138, 116, 64, 0.5); }
.fb-btn:active  { transform: scale(0.96) translateY(0); transition-duration: 0.08s; }
.fb-btn:focus-visible { outline: 3px solid #4a90d9; outline-offset: 2px; }

@keyframes fbFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

@media (max-width: 420px) {
  .fb-modal  { padding: 32px 22px 26px; }
  .fb-title  { font-size: 1.45rem; }
  .fb-glow   { width: 320px; height: 320px; }
}

@media (prefers-reduced-motion: reduce) {
  .fb-backdrop, .fb-glow, .fb-modal, .fb-eyebrow, .fb-emblem-wrap,
  .fb-title, .fb-desc, .fb-message, .fb-btn {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .fb-emblem-shimmer { animation: none !important; opacity: 0.4 !important; }
  .fb-sparkle { animation: none !important; opacity: 0 !important; }
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

// showFirstBelieverModalAndWaitForClose(badge)
// Mounts the modal, wires dismissal (button, backdrop click, Escape), cleans
// up its own listeners on close, and resolves once it has been dismissed.
function showFirstBelieverModalAndWaitForClose(badge) {
  return new Promise(resolve => {
    // Duplicate-overlay guard — if something already mounted one (shouldn't
    // happen given the orchestrator's own in-flight guard, but cheap to check).
    if (document.getElementById(OVERLAY_ID)) { resolve(); return; }

    injectStyles();

    const backdrop = document.createElement('div');
    backdrop.className = 'fb-backdrop';
    backdrop.id = OVERLAY_ID;

    const glow = document.createElement('div');
    glow.className = 'fb-glow';
    backdrop.appendChild(glow);

    const modal = document.createElement('div');
    modal.className = 'fb-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'First Believer — special recognition');

    modal.appendChild(buildSparkle());

    const content = document.createElement('div');
    content.className = 'fb-content';

    const eyebrow = document.createElement('p');
    eyebrow.className = 'fb-eyebrow';
    eyebrow.textContent = 'A Special Recognition';

    const emblemWrap = document.createElement('div');
    emblemWrap.className = 'fb-emblem-wrap';
    emblemWrap.innerHTML = `<div class="fb-emblem-shimmer"></div>${FIRST_BELIEVER_EMBLEM_SVG}`;

    const title = document.createElement('h2');
    title.className = 'fb-title';
    title.textContent = badge.title || 'First Believer';

    const desc = document.createElement('p');
    desc.className = 'fb-desc';
    desc.textContent = badge.description || '';

    const message = document.createElement('div');
    message.className = 'fb-message';
    message.textContent = badge.message || '';

    const btn = document.createElement('button');
    btn.className = 'fb-btn';
    btn.id = 'fbContinueBtn';
    btn.textContent = 'Continue';

    content.append(eyebrow, emblemWrap, title, desc, message, btn);
    modal.appendChild(content);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    btn.focus();

    function onKeydown(e) {
      if (e.key === 'Escape') close();
    }

    function close() {
      document.removeEventListener('keydown', onKeydown);
      backdrop.style.opacity = '0';
      backdrop.style.transition = 'opacity 0.24s ease';
      setTimeout(() => {
        backdrop.remove();
        resolve();
      }, 260);
    }

    btn.addEventListener('click', close);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onKeydown);
  });
}

// ---------------------------------------------------------------------------
// Orchestrator — the one function each result page needs to call.
// ---------------------------------------------------------------------------

let _inFlight = false;

// maybeShowFirstBelieverReveal(supabase, session, options)
//
// options.celebrationSettled — the promise returned by
//   recordActivityAndMaybeCelebrate() (see js/streak-celebration.js). Awaited
//   before showing the reveal, so the normal streak celebration is guaranteed
//   to have genuinely finished first — including the case where it hasn't
//   even mounted yet at the moment this function is called.
// options.skipReveal — pass true from pages that defer their own streak
//   celebration to a later page (Duel: deferCelebration: true). The grant
//   RPC still runs (this is the correct moment for the server-side streak
//   check), but the reveal itself is not attempted here, since the normal
//   streak popup won't display on this page either. If a grant lands during
//   a Duel game, the reveal is picked up the next time this function runs on
//   a non-deferred page.
//
// Returns a promise that resolves once this call's work is fully done
// (grant attempted, and — if applicable — the reveal shown, dismissed, and
// marked). For a normal user this resolves almost immediately. Result pages
// call evaluateAchievements(supabase, session) from inside a .then() on this
// promise, so the achievement queue is never even invoked until the reveal
// has settled — no change to achievements.js required.
export async function maybeShowFirstBelieverReveal(supabase, session, options) {
  // Deliberately no destructuring here — this line runs before the try block
  // below, so it must not be able to throw (e.g. if a future caller ever
  // passes `null` explicitly instead of omitting the argument).
  const opts = options || {};
  const celebrationSettled = opts.celebrationSettled;
  const skipReveal = opts.skipReveal === true;

  if (!session?.user) return;
  if (_inFlight) return; // duplicate/rapid orchestration guard
  _inFlight = true;

  try {
    // Always attempt the grant check — cheap no-op for everyone except the
    // authorised recipient at streak >= 50. This is the correct place for it:
    // right after successful streak processing, per the server RPC's own
    // authorisation logic (never trusted from here).
    await grantFirstBelieverIfEligible(supabase);

    if (skipReveal) return;

    const badge = await getPendingFirstBelieverReveal(supabase);
    if (!badge) return; // nothing pending — exit quietly, no visible change

    if (document.getElementById(OVERLAY_ID)) return; // already showing somehow

    if (celebrationSettled) {
      try { await celebrationSettled; } catch (_) { /* never block the reveal on this */ }
    }

    await showFirstBelieverModalAndWaitForClose(badge);

    const markResult = await markFirstBelieverRevealed(supabase);
    if (markResult !== 'revealed') {
      // Not fatal — the grant remains and revealed_at stays null server-side,
      // so the next legitimate call will offer the reveal again rather than
      // silently losing it.
      console.warn('[first-believer] reveal shown but not confirmed persisted — will retry next time.');
    }
  } catch (e) {
    console.warn('[first-believer] orchestration error (non-fatal):', e?.message);
  } finally {
    _inFlight = false;
  }
}
