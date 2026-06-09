// js/nav-menu-init.js
// Single source of truth for the GeoRanks hamburger navigation menu.
//
// This is a plain (non-module) script loaded synchronously so the full menu
// DOM — including #closeMenu — exists before any toggle scripts or ES module
// scripts run. That prevents the null-reference errors that would occur if
// a non-module toggle script calls getElementById('closeMenu').addEventListener
// before the element exists.
//
// Adding new menu items or changing order: edit ITEMS below. Done.
// Adding a new page to current-page hiding: add an entry to PAGE_IDS below.

(function () {
  'use strict';

  // ── Current-page detection ──────────────────────────────────────────────
  // Uses the full path (not just last segment) so /u/index.html is not
  // confused with /index.html. Strips leading slash, trailing slash, .html.
  const fullSlug = window.location.pathname
    .replace(/^\//, '')
    .replace(/\.html$/, '')
    .replace(/\/$/, '')
    || 'index';

  const PAGE_IDS = {
    '':                'home',
    'index':           'home',
    'daily-challenge': 'daily-challenge',
    'account':         'account',
    'duel':            'duel',
    'categories':      'categories',
    'leaderboard':     'leaderboard',
    'stats':           'stats',
    'upload':          'battle-royale',
    'how-to-play':     'how-to-play',
    'feedback':        'feedback',
    'contact':         'contact',
    'about':           'about',
  };
  const currentPage = PAGE_IDS[fullSlug] ?? null;

  // ── Menu items — edit here to change order or content ──────────────────
  // id: matches PAGE_IDS values above (null = always shown)
  // All hrefs use root-relative paths (/…) so this script works from any
  // page depth, including /u/index.html.
  const ITEMS = [
    {
      id: 'daily-challenge',
      html: [
        '<button class="menu-btn menu-daily-challenge"',
        '  onclick="window.location.href=\'/daily-challenge.html\'"',
        '  id="dailyChallengeMenuBtn">',
        '  <div class="daily-bg" id="dailyChallengeBg"></div>',
        '  <div class="daily-overlay"></div>',
        '  <div class="daily-content">',
        '    <h3 class="daily-title">📅 Daily Challenge</h3>',
        '    <span class="daily-category" id="dailyChallengeCategory">Loading...</span>',
        '  </div>',
        '</button>',
      ].join('\n    '),
    },
    { id: 'home',         html: '<button class="menu-btn" onclick="window.location.href=\'/index.html\'">🏠 Home</button>' },
    { id: 'account',      html: '<button class="menu-btn menu-btn-account" onclick="window.location.href=\'/account.html\'">👤 Account</button>' },
    { id: 'duel',         html: '<button class="menu-btn" onclick="window.location.href=\'/duel\'">⚔️ Duel</button>' },
    { id: 'categories',   html: '<button class="menu-btn" onclick="window.location.href=\'/categories.html\'">🎮 Categories</button>' },
    { id: 'leaderboard',  html: '<button class="menu-btn" onclick="window.location.href=\'/leaderboard.html\'">🏆 Leaderboard</button>' },
    { id: 'stats',        html: '<button class="menu-btn" onclick="window.location.href=\'/stats.html\'">📊 My Stats</button>' },
    { id: 'battle-royale', html: '<button class="menu-btn" onclick="window.location.href=\'/upload.html\'">🛡️ Battle Royale</button>' },
    { id: 'how-to-play',  html: '<button class="menu-btn" onclick="window.location.href=\'/how-to-play.html\'">💡 How to Play</button>' },
    { id: 'feedback',     html: '<button class="menu-btn" onclick="window.location.href=\'/feedback.html\'">💬 Feedback</button>' },
    { id: 'contact',      html: '<button class="menu-btn" onclick="window.location.href=\'/contact.html\'">📩 Contact Us</button>' },
    { id: 'about',        html: '<button class="menu-btn" onclick="window.location.href=\'/about.html\'">🌍 About Us</button>' },
    // Premium upgrade button — auth module shows/hides via .upgrade-access-btn class
    {
      id: null,
      html: '<button class="menu-btn upgrade-access-btn" onclick="window.plausible?.(' +
            '\'premium_clicked_navbar\'); window.location.href=\'/premium.html\'" style="display:none;">' +
            '🔓 Unlock All Categories</button>',
    },
  ];

  // ── Inject menu into overlay ────────────────────────────────────────────
  const overlay = document.getElementById('menuOverlay');
  if (!overlay) return;

  const itemsHtml = ITEMS
    .filter(item => item.id !== currentPage)
    .map(item => '    ' + item.html)
    .join('\n');

  overlay.innerHTML =
    '  <div class="menu-panel">\n' +
    '    <h2>Menu</h2>\n' +
    itemsHtml + '\n' +
    '    <button class="menu-close-x" id="closeMenu">×</button>\n' +
    '  </div>';

  // ── Toggle event listeners ──────────────────────────────────────────────
  // Set up here so they're always registered regardless of whether the page
  // also has its own toggle script (extra listeners are harmless).
  const toggleBtn = document.getElementById('menuToggle');
  const closeBtn  = document.getElementById('closeMenu');

  toggleBtn?.addEventListener('click', () => {
    overlay.classList.add('active');
    document.body.classList.add('menu-open');
  });
  closeBtn?.addEventListener('click', () => {
    overlay.classList.remove('active');
    document.body.classList.remove('menu-open');
  });
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
      document.body.classList.remove('menu-open');
    }
  });
})();
