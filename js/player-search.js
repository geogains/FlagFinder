// js/player-search.js
import { supabase } from './supabase-client.js';
import { profileUrl } from './username-utils.js';

const DEBOUNCE_MS    = 270;
const MIN_QUERY_LEN  = 2;
const RESULT_LIMIT   = 8;
const FALLBACK_AVATAR = 'assets/profile-icon.jpg';

export function initPlayerSearch() {
  const input    = document.getElementById('playerSearchInput');
  const dropdown = document.getElementById('playerSearchDropdown');
  if (!input || !dropdown) return;

  let debounceTimer = null;
  let activeIndex   = -1;

  // ── Dropdown state helpers ────────────────────────────────────────────────

  function closeDropdown() {
    dropdown.classList.remove('active');
    dropdown.innerHTML = '';
    activeIndex = -1;
  }

  function showLoading() {
    dropdown.innerHTML = '<div class="player-search-loading">Searching…</div>';
    dropdown.classList.add('active');
    activeIndex = -1;
  }

  function getItems() {
    return dropdown.querySelectorAll('.player-result-item');
  }

  function setActiveIndex(index) {
    const items = getItems();
    items.forEach(item => item.classList.remove('ps-active'));
    if (index >= 0 && index < items.length) {
      items[index].classList.add('ps-active');
      items[index].scrollIntoView({ block: 'nearest' });
      activeIndex = index;
    } else {
      activeIndex = -1;
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function navigate(username) {
    const url = profileUrl(username);
    if (url) window.location.href = url;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function renderDropdown(results, query) {
    dropdown.innerHTML = '';
    activeIndex = -1;

    if (results.length === 0) {
      const msg = document.createElement('div');
      msg.className = 'player-search-no-results';
      msg.textContent = `No player found for "${query}"`;
      dropdown.appendChild(msg);
    } else {
      results.forEach(user => {
        const item = document.createElement('a');
        item.className = 'player-result-item';
        item.href = profileUrl(user.username);

        const img = document.createElement('img');
        img.className   = 'player-result-avatar';
        img.src         = user.avatar_url || FALLBACK_AVATAR;
        img.alt         = user.username;
        img.onerror     = () => { img.src = FALLBACK_AVATAR; };

        const name = document.createElement('span');
        name.className   = 'player-result-name';
        name.textContent = user.username;

        const hint = document.createElement('span');
        hint.className   = 'player-result-hint';
        hint.textContent = 'View profile →';

        item.appendChild(img);
        item.appendChild(name);
        item.appendChild(hint);
        dropdown.appendChild(item);
      });
    }
    dropdown.classList.add('active');
  }

  // ── Search ────────────────────────────────────────────────────────────────

  async function search(query) {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LEN) {
      closeDropdown();
      return;
    }

    showLoading();

    const { data, error } = await supabase
      .from('users')
      .select('username, avatar_url')
      .ilike('username', `${trimmed}%`)
      .not('username', 'is', null)
      .order('username')
      .limit(RESULT_LIMIT);

    if (error) {
      closeDropdown();
      return;
    }
    renderDropdown(data, trimmed);
  }

  // ── Event listeners ───────────────────────────────────────────────────────

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    if (input.value.trim().length < MIN_QUERY_LEN) {
      closeDropdown();
      return;
    }
    debounceTimer = setTimeout(() => search(input.value), DEBOUNCE_MS);
  });

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Escape') {
      closeDropdown();
      input.blur();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const items = getItems();
      if (items.length) setActiveIndex(Math.min(activeIndex + 1, items.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(Math.max(activeIndex - 1, -1));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(debounceTimer);

      // Navigate to keyboard-highlighted item if one is active
      const items = getItems();
      if (activeIndex >= 0 && items[activeIndex]) {
        window.location.href = items[activeIndex].href;
        return;
      }

      const trimmed = input.value.trim();
      if (!trimmed) return;

      // Exact-match first (case-insensitive)
      const { data: exact } = await supabase
        .from('users')
        .select('username')
        .ilike('username', trimmed)
        .not('username', 'is', null)
        .limit(1);
      if (exact?.length > 0) {
        navigate(exact[0].username);
        return;
      }

      // Single prefix match → navigate directly
      const { data: prefix } = await supabase
        .from('users')
        .select('username')
        .ilike('username', `${trimmed}%`)
        .not('username', 'is', null)
        .order('username')
        .limit(2);
      if (prefix?.length === 1) {
        navigate(prefix[0].username);
        return;
      }

      // Multiple / no matches → show dropdown
      search(input.value);
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#playerSearchWrapper')) {
      closeDropdown();
    }
  });
}
