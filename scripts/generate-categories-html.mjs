#!/usr/bin/env node
// scripts/generate-categories-html.mjs
//
// Regenerates the static (no-JS) category cards embedded in categories.html
// so search engines and visitors without JavaScript see a real category
// directory instead of an empty grid. categories-config.js stays the single
// source of truth for category data; js/categories-list.js owns the
// filter/sort shared with the browser's own renderCategories(), so this
// script and the live page can never describe a different set of categories.
//
// This project has no build step (see CLAUDE.md) — run this manually after
// editing js/categories-config.js:
//
//   node scripts/generate-categories-html.mjs
//
// It shows the first page (12 cards) in the signed-out / non-Premium state,
// matching what renderCategories() paints on initial load before any auth
// check resolves. JavaScript fully replaces this container's content on
// page load, so this is a fallback, not a second live copy.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const categoriesHtmlPath = path.join(repoRoot, 'categories.html');

const { categoriesConfig } = await import('../js/categories-config.js');
const { getSortedCategories } = await import('../js/categories-list.js');

const ITEMS_PER_PAGE = 12;
const allCategoriesData = getSortedCategories(categoriesConfig);
const pageCategories = allCategoriesData.slice(0, ITEMS_PER_PAGE);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Mirrors the card markup built client-side by renderCategories() in
// categories.html. Locked (Premium) cards get no working onclick here —
// the browser attaches real handlers once JS runs; this is a readable
// fallback, not an attempt to replicate the interactive modal without JS.
function renderCard(cat) {
  const isLocked = cat.tier !== 'free';
  const lockBadge = isLocked ? '<div class="lock-badge">Premium</div>' : '';
  return `
        <div class="category-item">
          <div class="category-card-new${isLocked ? ' locked' : ''}" data-category="${escapeHtml(cat.category)}">
            <img class="category-bg" src="images/categories/${escapeHtml(cat.image)}" alt="" loading="lazy">
            <div class="category-overlay"></div>
            ${lockBadge}
            <div class="category-content">
              <div class="category-emoji">${cat.emoji}</div>
              <div class="category-name">${escapeHtml(cat.display)}</div>
              <div class="category-desc">${escapeHtml(cat.description)}</div>
            </div>
          </div>
        </div>`;
}

const generatedMarkup = [
  '<!-- SSR:CATEGORIES:START -->',
  '<!-- Static fallback content — do not hand-edit. Regenerate with:',
  '         node scripts/generate-categories-html.mjs',
  '       after changing js/categories-config.js. JavaScript replaces this',
  '       content immediately on load (see renderCategories() below); it exists',
  '       so search engines and no-JS visitors see a real category directory. -->',
  pageCategories.map(renderCard).join(''),
  '\n      <!-- SSR:CATEGORIES:END -->'
].join('\n      ');

const html = await readFile(categoriesHtmlPath, 'utf8');
const markerRegex = /<!-- SSR:CATEGORIES:START -->[\s\S]*?<!-- SSR:CATEGORIES:END -->/;

if (!markerRegex.test(html)) {
  throw new Error(
    'Could not find SSR:CATEGORIES markers in categories.html — has the #categoriesGrid container been changed?'
  );
}

const updatedHtml = html.replace(markerRegex, generatedMarkup);
await writeFile(categoriesHtmlPath, updatedHtml, 'utf8');

console.log(`Wrote ${pageCategories.length} static category cards into categories.html`);
