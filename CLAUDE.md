# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GeoRanks (geo-ranks.com) is a geography trivia game where users rank countries by various metrics (population, GDP, altitude, etc.). It's a vanilla JavaScript web app with no build step.

## Running Locally

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

No package manager, bundler, or transpilation. Dependencies are loaded from CDN.

## Supabase Functions (Deno)

```bash
# Lint
deno lint supabase/functions/

# Format
deno fmt supabase/functions/

# Deploy
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
```

Deno is configured only for `supabase/functions/` — the VS Code workspace is scoped via `.vscode/settings.json`.

## Architecture

### Tech Stack
- **Frontend**: Vanilla HTML/CSS/JavaScript (ES modules, no framework)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Serverless Functions**: Deno (Supabase Edge Functions) for Stripe payment flows
- **Payments**: Stripe (checkout session + webhook handler)
- **Analytics**: Plausible (privacy-friendly)

### Game Modes
- **Classic** (`game.html` + `js/blind-ranking.js`): Rank 10 randomly selected countries by a metric
- **Top 10** (`top10.html` + `js/top10-game.js`): Type the top 10 countries in 2 minutes
- **VS** (`vs.html` + `js/vs-game.js`): Compare two countries head-to-head, unlimited rounds
- **Daily Challenge** (`daily-challenge.html` + `js/daily-challenge.js`): Seeded by UTC date (YYYYMMDD) so all users see the same challenge

### Key Files
- `js/supabase-client.js` — Supabase client init + `requireAuth()` guard for protected routes
- `js/categories-config.js` — Central config for all 36 categories (title, emoji, unit, data file, question text)
- `js/mode-selector.js` — Modal for choosing game mode; handles category background images
- `js/categories/[category].js` — Per-category country data arrays (180+ countries each)

### Category Data Format
Each file in `js/categories/` exports an array of country objects. The key field varies (e.g., `population`, `gdp`, `score`) — the game engines auto-detect the metric key at runtime.

### Premium System
- 6 free categories + daily challenge (always free)
- 30 premium categories gated by `is_premium` flag in Supabase users table
- Stripe payments handled by `supabase/functions/create-checkout-session/` and `supabase/functions/stripe-webhook/`

### Routing
All pages are standalone HTML files. There's no client-side router — navigation is via `<a>` tags and `window.location`.

### Auth
Supabase Auth (JWT-based). Session persisted in browser via `persistSession: true`. Protected pages call `requireAuth()` from `supabase-client.js` which redirects unauthenticated users to `auth.html`.
