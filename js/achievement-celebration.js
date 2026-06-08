// js/achievement-celebration.js
// Achievement & badge unlock popup — follows the same pattern as streak-celebration.js.
// Exports: BADGE_META, showAchievementQueue, waitForStreakPopupClose

// ---------------------------------------------------------------------------
// Badge visual metadata — client-side only.
// badge_key → { img, label, grad }
// img  — absolute path to the real badge asset (served from /assets/)
// grad — kept as a tint reference for popup glow / card backgrounds
// emoji — fallback shown if the image fails to load
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Gradient shorthands by tier — used in badge card backgrounds for popups.
// Phase 4 will add `img` paths to these entries; no other changes needed.
// ---------------------------------------------------------------------------
const _G = {
  bronze:  'linear-gradient(135deg,#cd7f32,#b5651d)',
  silver:  'linear-gradient(135deg,#9ca3af,#6b7280)',
  gold:    'linear-gradient(135deg,#fbbf24,#f59e0b)',
  plat:    'linear-gradient(135deg,#9333ea,#7c3aed)',
  s1:      'linear-gradient(135deg,#34d399,#10b981)',
  s2:      'linear-gradient(135deg,#667eea,#764ba2)',
};

export const BADGE_META = {
  // ── Badges with artwork ──────────────────────────────────────────
  badge_streak_30:         { img: '/assets/badges/gr2_gold_30_day_streak.png',          emoji: '🔥', label: '30-Day Streak',    grad: 'linear-gradient(135deg,#ff9770,#ff6f61)' },
  badge_gdp_master:        { img: '/assets/badges/gr2_specialist_gdp_t2.png',           emoji: '💰', label: 'GDP Master',        grad: 'linear-gradient(135deg,#fbbf24,#f59e0b)' },
  badge_population_expert: { img: '/assets/badges/gr2_specialist_population_t2.png',   emoji: '👥', label: 'Population Expert', grad: 'linear-gradient(135deg,#60a5fa,#3b82f6)' },
  badge_founding_explorer: { img: '/assets/badges/gr2_platinum_founding_explorer.png', emoji: '🌍', label: 'Founding Explorer', grad: 'linear-gradient(135deg,#34d399,#10b981)' },

  // ── Bronze (8) ──────────────────────────────────────────────────
  badge_bronze_first_steps:      { img: '/assets/badges/gr2_bronze_first_steps.png',      emoji: '🌱', label: 'First Steps',       grad: _G.bronze },
  badge_bronze_getting_started:  { img: '/assets/badges/gr2_bronze_getting_started.png',  emoji: '🚀', label: 'Getting Started',    grad: _G.bronze },
  badge_bronze_streak_starter:   { img: '/assets/badges/gr2_bronze_streak_starter.png',   emoji: '🔥', label: 'Streak Starter',     grad: _G.bronze },
  badge_bronze_fresh_face:       { img: '/assets/badges/gr2_bronze_fresh_face.png',       emoji: '🎮', label: 'Fresh Face',         grad: _G.bronze },
  badge_bronze_explorer:         { img: '/assets/badges/gr2_bronze_explorer.png',         emoji: '🗺️', label: 'Explorer',           grad: _G.bronze },
  badge_bronze_first_blood:      { img: '/assets/badges/gr2_bronze_first_blood.png',      emoji: '⚔️', label: 'First Blood',        grad: _G.bronze },
  badge_bronze_perfectionist:    { img: '/assets/badges/gr2_bronze_precision_master.png', emoji: '✨', label: 'Precision Master',    grad: _G.bronze },
  badge_bronze_daily_debut:      { img: '/assets/badges/gr2_bronze_daily_debut.png',      emoji: '☀️', label: 'Daily Debut',        grad: _G.bronze },

  // ── Silver (6) ───────────────────────────────────────────────────
  badge_silver_daily_warrior:    { img: '/assets/badges/gr2_silver_daily_warrior.png',   emoji: '🛡️', label: 'Daily Warrior',      grad: _G.silver },
  badge_silver_quarter_century:  { img: '/assets/badges/gr2_silver_quarter_century.png', emoji: '🎯', label: 'Quarter Century',    grad: _G.silver },
  badge_silver_world_traveller:  { img: '/assets/badges/gr2_silver_world_traveller.png', emoji: '✈️', label: 'World Traveller',    grad: _G.silver },
  badge_silver_geodex_initiate:  { img: '/assets/badges/gr2_silver_geodex_initiate.png', emoji: '📖', label: 'GeoDex Initiate',    grad: _G.silver },
  badge_silver_duel_veteran:     { img: '/assets/badges/gr2_silver_duel_veteran.png',    emoji: '⚔️', label: 'Duel Veteran',       grad: _G.silver },
  badge_silver_streak_keeper:    { img: '/assets/badges/gr2_silver_streak_keeper.png',   emoji: '🔥', label: 'Streak Keeper',      grad: _G.silver },

  // ── Gold (7) ─────────────────────────────────────────────────────
  badge_silver_top10_challenger: { img: '/assets/badges/gr2_gold_top10_challenger.png',  emoji: '🏆', label: 'Top 10 Challenger',  grad: _G.gold },
  badge_gold_centurion:          { img: '/assets/badges/gr2_gold_centurion.png',          emoji: '💯', label: 'Centurion',          grad: _G.gold },
  badge_gold_geography_scholar:  { img: '/assets/badges/gr2_gold_geography_scholar.png', emoji: '🎓', label: 'Geography Scholar',  grad: _G.gold },
  badge_gold_duel_master:        { img: '/assets/badges/gr2_gold_duel_master.png',        emoji: '🥊', label: 'Duel Master',        grad: _G.gold },
  badge_gold_precision_master:   { img: '/assets/badges/gr2_gold_perfectionist.png',      emoji: '🎯', label: 'Perfectionist',      grad: _G.gold },
  badge_gold_game_mode_master:   { img: '/assets/badges/gr2_gold_game_mode_master.png',   emoji: '👑', label: 'Game Mode Master',   grad: _G.gold },

  // ── Platinum (3) ─────────────────────────────────────────────────
  badge_platinum_georanks_legend:      { img: '/assets/badges/gr2_platinum_georanks_legend.png',      emoji: '🌟', label: 'GeoRanks Legend',      grad: _G.plat },
  badge_platinum_geodex_completionist: { img: '/assets/badges/gr2_platinum_geodex_completionist.png', emoji: '📚', label: 'GeoDex Completionist', grad: _G.plat },

  // ── Specialist Tier I (40) ────────────────────────────────────────
  badge_population_t1:       { img: '/assets/badges/gr2_specialist_population_t1.png',        emoji: '👥', label: 'Census Taker',           grad: _G.s1 },
  badge_altitude_t1:         { img: '/assets/badges/gr2_specialist_altitude_t1.png',           emoji: '🏔️', label: 'Summit Chaser',          grad: _G.s1 },
  badge_gdp_t1:              { img: '/assets/badges/gr2_specialist_gdp_t1.png',               emoji: '💰', label: 'GDP Grinder',             grad: _G.s1 },
  badge_happiness_t1:        { img: '/assets/badges/gr2_specialist_happiness_t1.png',          emoji: '😊', label: 'Joy Seeker',              grad: _G.s1 },
  badge_forest_t1:           { img: '/assets/badges/gr2_specialist_forest_t1.png',             emoji: '🌲', label: 'Forest Wanderer',         grad: _G.s1 },
  badge_coastline_t1:        { img: '/assets/badges/gr2_specialist_coastline_t1.png',          emoji: '🌊', label: 'Shore Explorer',          grad: _G.s1 },
  badge_cuisine_t1:          { img: '/assets/badges/gr2_specialist_cuisine_t1.png',            emoji: '🍽️', label: 'Food Lover',              grad: _G.s1 },
  badge_olympic_t1:          { img: '/assets/badges/gr2_specialist_olympic_t1.png',            emoji: '🏅', label: 'Olympic Fan',             grad: _G.s1 },
  badge_worldcup_t1:         { img: '/assets/badges/gr2_specialist_world_cup_t1.png',          emoji: '⚽', label: 'Football Fan',            grad: _G.s1 },
  badge_landmass_t1:         { img: '/assets/badges/gr2_specialist_landmass_t1.png',           emoji: '🗺️', label: 'Land Mapper',             grad: _G.s1 },
  badge_crimerate_t1:        { img: '/assets/badges/gr2_specialist_crime_rate_t1.png',         emoji: '🚨', label: 'Crime Watcher',           grad: _G.s1 },
  badge_passport_t1:         { img: '/assets/badges/gr2_specialist_passport_t1.png',           emoji: '🛂', label: 'Frequent Flyer',          grad: _G.s1 },
  badge_beer_t1:             { img: '/assets/badges/gr2_specialist_beer_t1.png',               emoji: '🍺', label: 'Beer Enthusiast',         grad: _G.s1 },
  badge_nobelprize_t1:       { img: '/assets/badges/gr2_specialist_nobel_prize_t1.png',        emoji: '🔬', label: 'Nobel Follower',          grad: _G.s1 },
  badge_temperature_t1:      { img: '/assets/badges/gr2_specialist_temperature_t1.png',        emoji: '🌡️', label: 'Weather Watcher',         grad: _G.s1 },
  badge_rainfall_t1:         { img: '/assets/badges/gr2_specialist_rainfall_t1.png',           emoji: '🌧️', label: 'Rain Chaser',             grad: _G.s1 },
  badge_tourism_t1:          { img: '/assets/badges/gr2_specialist_tourism_t1.png',            emoji: '✈️', label: 'Tourist Scout',           grad: _G.s1 },
  badge_michelin_t1:         { img: '/assets/badges/gr2_specialist_michelin_t1.png',           emoji: '⭐', label: 'Food Explorer',           grad: _G.s1 },
  badge_bigmac_t1:           { img: '/assets/badges/gr2_specialist_big_mac_t1.png',            emoji: '🍔', label: 'Price Tracker',           grad: _G.s1 },
  badge_lifeexpectancy_t1:   { img: '/assets/badges/gr2_specialist_life_expectancy_t1.png',    emoji: '❤️', label: 'Life Tracker',            grad: _G.s1 },
  badge_marriageage_t1:      { img: '/assets/badges/gr2_specialist_marriage_age_t1.png',       emoji: '💒', label: 'Life Stage Watcher',      grad: _G.s1 },
  badge_sexratio_t1:         { img: '/assets/badges/gr2_specialist_sex_ratio_t1.png',          emoji: '⚖️', label: 'Demographics Fan',        grad: _G.s1 },
  badge_tallestbuilding_t1:  { img: '/assets/badges/gr2_specialist_tallest_building_t1.png',   emoji: '🏗️', label: 'Sky Gazer',               grad: _G.s1 },
  badge_density_t1:          { img: '/assets/badges/gr2_specialist_density_t1.png',            emoji: '🏙️', label: 'Crowd Watcher',           grad: _G.s1 },
  badge_carexports_t1:       { img: '/assets/badges/gr2_specialist_car_exports_t1.png',        emoji: '🚗', label: 'Auto Enthusiast',         grad: _G.s1 },
  badge_militarypersonel_t1: { img: '/assets/badges/gr2_specialist_military_personnel_t1.png', emoji: '🪖', label: 'Military Recruit',        grad: _G.s1 },
  badge_rent_t1:             { img: '/assets/badges/gr2_specialist_rent_t1.png',               emoji: '🏠', label: 'Cost of Living Watcher',  grad: _G.s1 },
  badge_poorestgdp_t1:       { img: '/assets/badges/gr2_specialist_poorest_gdp_t1.png',        emoji: '📉', label: 'Development Watcher',     grad: _G.s1 },
  badge_university_t1:       { img: '/assets/badges/gr2_specialist_university_t1.png',         emoji: '🎓', label: 'Campus Explorer',         grad: _G.s1 },
  badge_volcano_t1:          { img: '/assets/badges/gr2_specialist_volcano_t1.png',            emoji: '🌋', label: 'Volcano Chaser',          grad: _G.s1 },
  badge_flamingo_t1:         { img: '/assets/badges/gr2_specialist_flamingo_t1.png',           emoji: '🦩', label: 'Nature Watcher',          grad: _G.s1 },
  badge_disasterrisk_t1:     { img: '/assets/badges/gr2_specialist_disaster_risk_t1.png',      emoji: '⚠️', label: 'Risk Watcher',            grad: _G.s1 },
  badge_longestriver_t1:     { img: '/assets/badges/gr2_specialist_longest_river_t1.png',      emoji: '🏞️', label: 'River Explorer',          grad: _G.s1 },
  badge_renewableenergy_t1:  { img: '/assets/badges/gr2_specialist_renewable_energy_t1.png',   emoji: '♻️', label: 'Green Watcher',           grad: _G.s1 },
  badge_millionaires_t1:     { img: '/assets/badges/gr2_specialist_millionaires_t1.png',       emoji: '💎', label: 'Wealth Watcher',          grad: _G.s1 },
  badge_gm_t1:               { img: '/assets/badges/gr2_specialist_chess_gm_t1.png',           emoji: '♟️', label: 'Chess Enthusiast',        grad: _G.s1 },
  badge_f1_t1:               { img: '/assets/badges/gr2_specialist_f1_t1.png',                 emoji: '🏎️', label: 'Race Fan',                grad: _G.s1 },
  badge_worldcupgoals_t1:        { img: '/assets/badges/gr2_specialist_world_cup_goals_t1.png',        emoji: '⚽', label: 'Goal Tracker',            grad: _G.s1 },
  badge_worldcupappearances_t1:  { img: '/assets/badges/gr2_specialist_world_cup_appearances_t1.png',  emoji: '⚽', label: 'Tournament Regular',      grad: _G.s1 },
  badge_worldcupwins_t1:         { img: '/assets/badges/gr2_specialist_world_cup_wins_t1.png',         emoji: '⚽', label: 'Trophy Watcher',          grad: _G.s1 },

  // ── Specialist Tier II (38 — no population/gdp; those use existing badges above) ──
  badge_altitude_t2:         { img: '/assets/badges/gr2_specialist_altitude_t2.png',           emoji: '🏔️', label: 'Altitude Expert',          grad: _G.s2 },
  badge_happiness_t2:        { img: '/assets/badges/gr2_specialist_happiness_t2.png',          emoji: '😊', label: 'Happiness Guru',            grad: _G.s2 },
  badge_forest_t2:           { img: '/assets/badges/gr2_specialist_forest_t2.png',             emoji: '🌲', label: 'Forest Ranger',             grad: _G.s2 },
  badge_coastline_t2:        { img: '/assets/badges/gr2_specialist_coastline_t2.png',          emoji: '🌊', label: 'Coastline Cartographer',    grad: _G.s2 },
  badge_cuisine_t2:          { img: '/assets/badges/gr2_specialist_cuisine_t2.png',            emoji: '🍽️', label: 'Culinary Master',           grad: _G.s2 },
  badge_olympic_t2:          { img: '/assets/badges/gr2_specialist_olympic_t2.png',            emoji: '🏅', label: 'Olympic Scholar',           grad: _G.s2 },
  badge_worldcup_t2:         { img: '/assets/badges/gr2_specialist_world_cup_t2.png',          emoji: '⚽', label: 'World Cup Historian',       grad: _G.s2 },
  badge_landmass_t2:         { img: '/assets/badges/gr2_specialist_landmass_t2.png',           emoji: '🗺️', label: 'Territory Expert',          grad: _G.s2 },
  badge_crimerate_t2:        { img: '/assets/badges/gr2_specialist_crime_rate_t2.png',         emoji: '🚨', label: 'Crime Analyst',             grad: _G.s2 },
  badge_passport_t2:         { img: '/assets/badges/gr2_specialist_passport_t2.png',           emoji: '🛂', label: 'Passport Collector',        grad: _G.s2 },
  badge_beer_t2:             { img: '/assets/badges/gr2_specialist_beer_t2.png',               emoji: '🍺', label: 'Beer Connoisseur',          grad: _G.s2 },
  badge_nobelprize_t2:       { img: '/assets/badges/gr2_specialist_nobel_prize_t2.png',        emoji: '🔬', label: 'Nobel Scholar',             grad: _G.s2 },
  badge_temperature_t2:      { img: '/assets/badges/gr2_specialist_temperature_t2.png',        emoji: '🌡️', label: 'Climate Expert',            grad: _G.s2 },
  badge_rainfall_t2:         { img: '/assets/badges/gr2_specialist_rainfall_t2.png',           emoji: '🌧️', label: 'Precipitation Expert',      grad: _G.s2 },
  badge_tourism_t2:          { img: '/assets/badges/gr2_specialist_tourism_t2.png',            emoji: '✈️', label: 'Tourism Expert',            grad: _G.s2 },
  badge_michelin_t2:         { img: '/assets/badges/gr2_specialist_michelin_t2.png',           emoji: '⭐', label: 'Michelin Master',           grad: _G.s2 },
  badge_bigmac_t2:           { img: '/assets/badges/gr2_specialist_big_mac_t2.png',            emoji: '🍔', label: 'Big Mac Economist',         grad: _G.s2 },
  badge_lifeexpectancy_t2:   { img: '/assets/badges/gr2_specialist_life_expectancy_t2.png',    emoji: '❤️', label: 'Longevity Expert',          grad: _G.s2 },
  badge_marriageage_t2:      { img: '/assets/badges/gr2_specialist_marriage_age_t2.png',       emoji: '💒', label: 'Marriage Age Analyst',      grad: _G.s2 },
  badge_sexratio_t2:         { img: '/assets/badges/gr2_specialist_sex_ratio_t2.png',          emoji: '⚖️', label: 'Demographics Expert',       grad: _G.s2 },
  badge_tallestbuilding_t2:  { img: '/assets/badges/gr2_specialist_tallest_building_t2.png',   emoji: '🏗️', label: 'Architecture Expert',       grad: _G.s2 },
  badge_density_t2:          { img: '/assets/badges/gr2_specialist_density_t2.png',            emoji: '🏙️', label: 'Density Expert',            grad: _G.s2 },
  badge_carexports_t2:       { img: '/assets/badges/gr2_specialist_car_exports_t2.png',        emoji: '🚗', label: 'Car Export Expert',         grad: _G.s2 },
  badge_militarypersonel_t2: { img: '/assets/badges/gr2_specialist_military_personnel_t2.png', emoji: '🪖', label: 'Military Analyst',          grad: _G.s2 },
  badge_rent_t2:             { img: '/assets/badges/gr2_specialist_rent_t2.png',               emoji: '🏠', label: 'Real Estate Expert',        grad: _G.s2 },
  badge_poorestgdp_t2:       { img: '/assets/badges/gr2_specialist_poorest_gdp_t2.png',        emoji: '📉', label: 'Development Expert',        grad: _G.s2 },
  badge_university_t2:       { img: '/assets/badges/gr2_specialist_university_t2.png',         emoji: '🎓', label: 'Academic Expert',           grad: _G.s2 },
  badge_volcano_t2:          { img: '/assets/badges/gr2_specialist_volcano_t2.png',            emoji: '🌋', label: 'Volcanologist',             grad: _G.s2 },
  badge_flamingo_t2:         { img: '/assets/badges/gr2_specialist_flamingo_t2.png',           emoji: '🦩', label: 'Flamingo Expert',           grad: _G.s2 },
  badge_disasterrisk_t2:     { img: '/assets/badges/gr2_specialist_disaster_risk_t2.png',      emoji: '⚠️', label: 'Risk Analyst',              grad: _G.s2 },
  badge_longestriver_t2:     { img: '/assets/badges/gr2_specialist_longest_river_t2.png',      emoji: '🏞️', label: 'Hydrologist',               grad: _G.s2 },
  badge_renewableenergy_t2:  { img: '/assets/badges/gr2_specialist_renewable_energy_t2.png',   emoji: '♻️', label: 'Energy Expert',             grad: _G.s2 },
  badge_millionaires_t2:     { img: '/assets/badges/gr2_specialist_millionaires_t2.png',       emoji: '💎', label: 'Wealth Expert',             grad: _G.s2 },
  badge_gm_t2:               { img: '/assets/badges/gr2_specialist_chess_gm_t2.png',           emoji: '♟️', label: 'Grandmaster Scholar',       grad: _G.s2 },
  badge_f1_t2:               { img: '/assets/badges/gr2_specialist_f1_t2.png',                 emoji: '🏎️', label: 'F1 Historian',              grad: _G.s2 },
  badge_worldcupgoals_t2:        { img: '/assets/badges/gr2_specialist_world_cup_goals_t2.png',        emoji: '⚽', label: 'Goal Scoring Expert',       grad: _G.s2 },
  badge_worldcupappearances_t2:  { img: '/assets/badges/gr2_specialist_world_cup_appearances_t2.png',  emoji: '⚽', label: 'World Cup Historian',       grad: _G.s2 },
  badge_worldcupwins_t2:         { img: '/assets/badges/gr2_specialist_world_cup_wins_t2.png',         emoji: '⚽', label: 'Champion Tracker',          grad: _G.s2 },
};

// ---------------------------------------------------------------------------
// CSS (injected once, scoped to .ac- prefix to avoid streak-celebration conflicts)
// ---------------------------------------------------------------------------
const STYLES = `
.ac-backdrop {
  position: fixed; inset: 0; z-index: 10001;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.62);
  backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
  opacity: 0; animation: acBackdropIn 0.26s ease forwards;
}
@keyframes acBackdropIn { to { opacity: 1; } }

.ac-glow {
  position: absolute; top: 50%; left: 50%;
  width: 520px; height: 520px; border-radius: 50%;
  transform: translate(-50%,-50%) scale(0.5);
  background: radial-gradient(circle, rgba(102,126,234,0.22) 0%, transparent 70%);
  pointer-events: none; opacity: 0;
  animation: acGlowIn 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s forwards;
}
@keyframes acGlowIn { to { opacity:1; transform: translate(-50%,-50%) scale(1); } }

.ac-modal {
  position: relative; background: #fff; border-radius: 28px;
  padding: 40px 32px 32px;
  width: min(380px, calc(100vw - 32px));
  text-align: center;
  box-shadow: 0 32px 80px rgba(0,0,0,0.20), 0 4px 16px rgba(0,0,0,0.08);
  transform: scale(0.78) translateY(28px); opacity: 0;
  animation: acModalIn 0.50s cubic-bezier(0.34,1.56,0.64,1) 0.08s forwards;
  overflow: hidden; z-index: 1;
}
@keyframes acModalIn { to { transform: scale(1) translateY(0); opacity: 1; } }

.ac-content { position: relative; z-index: 1; }

.ac-icon {
  font-size: 3.6rem; display: block; margin-bottom: 6px;
  animation: acIconIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.3s both;
}
@keyframes acIconIn {
  from { transform: scale(0) translateY(6px); opacity: 0; }
  to   { transform: scale(1) translateY(0);   opacity: 1; }
}

.ac-eyebrow {
  font-family: 'Poppins', sans-serif;
  font-size: 0.7rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: #9ca3af; margin: 0 0 8px;
  animation: acFadeUp 0.32s ease 0.44s both;
}

.ac-title {
  font-family: 'Poppins', sans-serif;
  font-size: 1.5rem; font-weight: 800; color: #0d315a;
  margin: 0 0 10px; line-height: 1.2;
  animation: acFadeUp 0.32s ease 0.50s both;
}

.ac-desc {
  font-family: 'Poppins', sans-serif;
  font-size: 0.88rem; color: #6b7280; line-height: 1.55;
  margin: 0 0 26px;
  animation: acFadeUp 0.32s ease 0.56s both;
}

.ac-badge-tier {
  font-family: 'Poppins', sans-serif;
  font-size: 0.72rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.1em;
  color: #9ca3af; margin: -6px 0 16px;
  animation: acFadeUp 0.32s ease 0.52s both;
}

.ac-badge-card {
  display: inline-flex; flex-direction: column; align-items: center;
  gap: 6px; padding: 16px 24px; border-radius: 18px;
  margin-bottom: 24px;
  animation: acFadeUp 0.32s ease 0.44s both;
}
.ac-badge-card-img {
  padding: 12px 20px;
  background: rgba(0,0,0,0.04) !important;
}
.ac-badge-emoji { font-size: 2.8rem; line-height: 1; }
.ac-badge-img {
  width: 88px; height: 88px;
  object-fit: contain;
  filter: drop-shadow(0 4px 14px rgba(0,0,0,0.14));
}
.ac-badge-label {
  font-family: 'Poppins', sans-serif;
  font-size: 0.75rem; font-weight: 700;
  color: #fff; text-transform: uppercase; letter-spacing: 0.07em;
}
.ac-badge-label-dark { color: #0d315a !important; }

.ac-btn {
  display: block; width: 100%; padding: 13px;
  background: linear-gradient(135deg, #ff9770 0%, #ff6f61 100%);
  color: #fff; border: none; border-radius: 14px;
  font-family: 'Poppins', sans-serif;
  font-size: 1rem; font-weight: 700; cursor: pointer;
  box-shadow: 0 6px 18px rgba(255,111,97,0.36);
  transition: transform 0.2s cubic-bezier(0.34,1.4,0.64,1), box-shadow 0.2s ease;
  animation: acFadeUp 0.32s ease 0.62s both;
}
.ac-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(255,111,97,0.48); }
.ac-btn:active { transform: scale(0.96); transition-duration: 0.08s; }

.ac-btn-ghost {
  display: block; width: 100%; padding: 11px;
  background: none; color: #9ca3af; border: none;
  font-family: 'Poppins', sans-serif;
  font-size: 0.88rem; font-weight: 600; cursor: pointer;
  margin-top: 10px; border-radius: 10px;
  transition: color 0.15s ease, background 0.15s ease;
  animation: acFadeUp 0.32s ease 0.68s both;
}
.ac-btn-ghost:hover { color: #6b7280; background: rgba(0,0,0,0.04); }

@keyframes acFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

@media (max-width: 420px) {
  .ac-modal { padding: 32px 22px 26px; }
  .ac-icon  { font-size: 3rem; }
  .ac-title { font-size: 1.3rem; }
}
@media (prefers-reduced-motion: reduce) {
  .ac-backdrop, .ac-glow, .ac-modal, .ac-icon,
  .ac-eyebrow, .ac-title, .ac-desc, .ac-badge-card, .ac-btn, .ac-btn-ghost {
    animation: none; opacity: 1; transform: none;
  }
}
`;

let _stylesInjected = false;
function injectStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const s = document.createElement('style');
  s.textContent = STYLES;
  document.head.appendChild(s);
}

// ---------------------------------------------------------------------------
// waitForStreakPopupClose — resolves when #streakCelebrationOverlay is gone
// ---------------------------------------------------------------------------
export function waitForStreakPopupClose() {
  return new Promise(resolve => {
    const el = document.getElementById('streakCelebrationOverlay');
    if (!el) { resolve(); return; }
    const obs = new MutationObserver(() => {
      if (!document.getElementById('streakCelebrationOverlay')) {
        obs.disconnect(); resolve();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  });
}

// sessionStorage key used to persist the remaining queue across the
// "View All Achievements" redirect. Cleared immediately on resume.
const PENDING_QUEUE_KEY = 'gr_pending_achievements';

// ---------------------------------------------------------------------------
// showAchievementQueue(achievements)
// achievements: array of { achievement_key, name, description, is_badge_reward, badge_key, badge_name }
// Shows each achievement (and optional badge slide) sequentially.
// ---------------------------------------------------------------------------
export function showAchievementQueue(achievements) {
  if (!achievements?.length) return;
  injectStyles();
  const queue = [...achievements];
  showNext(queue);
}

function showNext(queue) {
  if (!queue.length) return;
  const ach = queue.shift();
  const nextInQueue = () => showNext(queue);
  // Pass the remaining queue so showBadgeSlide can persist it before redirecting.
  showAchievementSlide(
    ach,
    () => showBadgeSlide(ach, queue, nextInQueue),
    nextInQueue
  );
}

function createBackdrop() {
  const bd = document.createElement('div');
  bd.className = 'ac-backdrop';
  const glow = document.createElement('div');
  glow.className = 'ac-glow';
  bd.appendChild(glow);
  return bd;
}

function closeBackdrop(bd, cb) {
  bd.style.opacity = '0';
  bd.style.transition = 'opacity 0.20s ease';
  setTimeout(() => { bd.remove(); if (cb) cb(); }, 220);
}

function showAchievementSlide(ach, onViewBadge, onContinue) {
  const bd = createBackdrop();
  const modal = document.createElement('div');
  modal.className = 'ac-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const icon = '🏆';

  modal.innerHTML = `
    <div class="ac-content">
      <span class="ac-icon">${icon}</span>
      <p class="ac-eyebrow">Achievement Unlocked</p>
      <h2 class="ac-title">${escHtml(ach.name)}</h2>
      <p class="ac-desc">${escHtml(ach.description)}</p>
      <button class="ac-btn" id="acPrimaryBtn">View Badge</button>
      <button class="ac-btn-ghost" id="acSecondaryBtn">Continue</button>
    </div>`;

  bd.appendChild(modal);
  document.body.appendChild(bd);

  modal.querySelector('#acPrimaryBtn').addEventListener('click', () => {
    closeBackdrop(bd, onViewBadge);
  });
  modal.querySelector('#acSecondaryBtn').addEventListener('click', () => {
    closeBackdrop(bd, onContinue);
  });
  bd.addEventListener('click', e => { if (e.target === bd) closeBackdrop(bd, onContinue); });
}

function getTierLabel(key) {
  if (!key) return null;
  if (key.includes('_platinum_')) return 'Platinum';
  if (key.includes('_gold_'))     return 'Gold';
  if (key.includes('_silver_'))   return 'Silver';
  if (key.includes('_bronze_'))   return 'Bronze';
  if (key.endsWith('_t2'))        return 'Specialist II';
  if (key.endsWith('_t1'))        return 'Specialist I';
  return null;
}

// remainingQueue — items still to be shown after this badge slide.
// Persisted to sessionStorage before redirect so account.html can resume them.
function showBadgeSlide(ach, remainingQueue, onDone) {
  const bd = createBackdrop();
  const modal = document.createElement('div');
  modal.className = 'ac-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  const meta = BADGE_META[ach.badge_key] || { emoji: '🏅', label: ach.badge_name || ach.name || 'Achievement', grad: 'linear-gradient(135deg,#ff9770,#ff6f61)' };
  const cardVisual = meta.img
    ? `<img class="ac-badge-img" src="${meta.img}" alt="${escHtml(meta.label)}" draggable="false">`
    : `<span class="ac-badge-emoji">${meta.emoji}</span>`;
  const cardClass  = meta.img ? 'ac-badge-card ac-badge-card-img' : 'ac-badge-card';
  const cardBg     = meta.img ? 'transparent' : meta.grad;
  const tier       = getTierLabel(ach.badge_key);

  modal.innerHTML = `
    <div class="ac-content">
      <p class="ac-eyebrow">Badge Unlocked</p>
      <div class="${cardClass}" style="background:${cardBg}">
        ${cardVisual}
      </div>
      <h2 class="ac-title">${escHtml(meta.label)}</h2>
      ${tier ? `<p class="ac-badge-tier">${escHtml(tier)}</p>` : ''}
      <p class="ac-desc">Badge added to your collection</p>
      <button class="ac-btn" id="acViewAllBtn">View All Achievements</button>
      <button class="ac-btn-ghost" id="acContinueBtn">Continue</button>
    </div>`;

  bd.appendChild(modal);
  document.body.appendChild(bd);

  modal.querySelector('#acViewAllBtn').addEventListener('click', () => {
    if (remainingQueue.length) {
      try {
        sessionStorage.setItem(PENDING_QUEUE_KEY, JSON.stringify(remainingQueue));
      } catch { /* storage full or unavailable — queue simply won't resume */ }
    }
    closeBackdrop(bd);
    window.location.href = '/account.html#badges';
  });
  modal.querySelector('#acContinueBtn').addEventListener('click', () => {
    closeBackdrop(bd, onDone);
  });
  bd.addEventListener('click', e => { if (e.target === bd) closeBackdrop(bd, onDone); });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---------------------------------------------------------------------------
// Dev preview helpers — simulate popup flow from the browser console.
// Do NOT write to DB. Do NOT award achievements.
//
// __previewAchievement(keyOrObject, options)
//   keyOrObject — achievement_key string, or a raw achievement object.
//                 Any key not in the static catalog is auto-resolved via BADGE_META.
//   options     — { skipBadge: true }  forces badge_key=null (tests emoji fallback
//                                      and two-card flow with no image)
//
// __previewAchievementQueue(items)
//   items — array of achievement_key strings or raw objects.
//           Runs the full queue: each item shows card 1 → card 2 in sequence.
//
// Examples:
//   __previewAchievement('bronze_first_steps')           → two-card, Bronze image
//   __previewAchievement('bronze_perfectionist')         → two-card, Bronze image
//   __previewAchievement('specialist_population_t1')     → two-card, Specialist I image
//   __previewAchievement('streak_30')                    → two-card, gold streak badge
//   __previewAchievement('founding_explorer')            → two-card, Platinum badge
//   __previewAchievement('bronze_first_steps', { skipBadge: true })  → card 2 emoji fallback
//   __previewAchievementQueue(['bronze_first_steps', 'bronze_perfectionist'])
//   __previewAchievementQueue([{ achievement_key:'x', name:'Custom', badge_key:null }])
// ---------------------------------------------------------------------------

// Static catalog — real names and requirement text for all named achievements.
// Specialist achievements (_t1 / _t2) are too numerous to enumerate here;
// they are auto-generated by _buildPreviewItem below.
const _PREVIEW_CATALOG = {
  // ── Bronze ───────────────────────────────────────────────────────────────
  bronze_first_steps:      { achievement_key: 'bronze_first_steps',      name: 'First Steps',        description: 'Complete your first game on GeoRanks.',                        category: 'bronze',   badge_key: 'badge_bronze_first_steps' },
  bronze_getting_started:  { achievement_key: 'bronze_getting_started',  name: 'Getting Started',    description: 'Complete 5 games across any mode.',                            category: 'bronze',   badge_key: 'badge_bronze_getting_started' },
  bronze_streak_starter:   { achievement_key: 'bronze_streak_starter',   name: 'Streak Starter',     description: 'Reach a 3-day daily challenge streak.',                        category: 'bronze',   badge_key: 'badge_bronze_streak_starter' },
  bronze_fresh_face:       { achievement_key: 'bronze_fresh_face',       name: 'Fresh Face',         description: 'Upload a custom profile photo.',                               category: 'bronze',   badge_key: 'badge_bronze_fresh_face' },
  bronze_explorer:         { achievement_key: 'bronze_explorer',         name: 'Explorer',           description: 'Play 3 different categories across any mode.',                 category: 'bronze',   badge_key: 'badge_bronze_explorer' },
  bronze_first_blood:      { achievement_key: 'bronze_first_blood',      name: 'First Blood',        description: 'Play your first head-to-head duel.',                           category: 'bronze',   badge_key: 'badge_bronze_first_blood' },
  bronze_perfectionist:    { achievement_key: 'bronze_perfectionist',    name: 'Precision Master',   description: 'Achieve your first perfect score.',                            category: 'bronze',   badge_key: 'badge_bronze_perfectionist' },
  bronze_daily_debut:      { achievement_key: 'bronze_daily_debut',      name: 'Daily Debut',        description: 'Complete your first daily challenge.',                         category: 'bronze',   badge_key: 'badge_bronze_daily_debut' },
  // ── Silver ───────────────────────────────────────────────────────────────
  silver_daily_warrior:    { achievement_key: 'silver_daily_warrior',    name: 'Daily Warrior',      description: 'Complete 10 daily challenges.',                                category: 'silver',   badge_key: 'badge_silver_daily_warrior' },
  silver_quarter_century:  { achievement_key: 'silver_quarter_century',  name: 'Quarter Century',    description: 'Complete 25 games across any mode.',                           category: 'silver',   badge_key: 'badge_silver_quarter_century' },
  silver_world_traveller:  { achievement_key: 'silver_world_traveller',  name: 'World Traveller',    description: 'Play 15 different categories across any mode.',                category: 'silver',   badge_key: 'badge_silver_world_traveller' },
  silver_geodex_initiate:  { achievement_key: 'silver_geodex_initiate',  name: 'GeoDex Initiate',    description: 'Complete 25% of Specialist Tier I categories.',                category: 'silver',   badge_key: 'badge_silver_geodex_initiate' },
  silver_duel_veteran:     { achievement_key: 'silver_duel_veteran',     name: 'Duel Veteran',       description: 'Complete 10 head-to-head duels.',                              category: 'silver',   badge_key: 'badge_silver_duel_veteran' },
  silver_streak_keeper:    { achievement_key: 'silver_streak_keeper',    name: 'Streak Keeper',      description: 'Reach a 14-day daily challenge streak.',                       category: 'silver',   badge_key: 'badge_silver_streak_keeper' },
  silver_top10_challenger: { achievement_key: 'silver_top10_challenger', name: 'Top 10 Challenger',  description: 'Achieve a perfect board in 10 different Top 10 categories.',   category: 'gold',     badge_key: 'badge_silver_top10_challenger' },
  // ── Gold ─────────────────────────────────────────────────────────────────
  streak_30:               { achievement_key: 'streak_30',               name: '30-Day Streak',      description: 'Reach a 30-day daily challenge streak.',                       category: 'streak',   badge_key: 'badge_streak_30' },
  gold_centurion:          { achievement_key: 'gold_centurion',          name: 'Centurion',          description: 'Complete 100 games across any mode.',                          category: 'gold',     badge_key: 'badge_gold_centurion' },
  gold_geography_scholar:  { achievement_key: 'gold_geography_scholar',  name: 'Geography Scholar',  description: 'Earn Tier II specialist mastery in 5 different categories.',   category: 'gold',     badge_key: 'badge_gold_geography_scholar' },
  gold_duel_master:        { achievement_key: 'gold_duel_master',        name: 'Duel Master',        description: 'Complete 50 head-to-head duels.',                             category: 'gold',     badge_key: 'badge_gold_duel_master' },
  gold_precision_master:   { achievement_key: 'gold_precision_master',   name: 'Perfectionist',      description: 'Earn 20 perfect results across Classic and Top 10.',           category: 'gold',     badge_key: 'badge_gold_precision_master' },
  gold_game_mode_master:   { achievement_key: 'gold_game_mode_master',   name: 'Game Mode Master',   description: 'Play the same 5 categories in Classic, VS, and Top 10.',       category: 'gold',     badge_key: 'badge_gold_game_mode_master' },
  // ── Platinum ─────────────────────────────────────────────────────────────
  founding_explorer:            { achievement_key: 'founding_explorer',            name: 'Founding Explorer',    description: 'An early adopter of GeoRanks — you were here before achievements existed.', category: 'founding',  badge_key: 'badge_founding_explorer' },
  platinum_georanks_legend:     { achievement_key: 'platinum_georanks_legend',     name: 'GeoRanks Legend',      description: 'Complete 500 games across any mode.',                          category: 'platinum', badge_key: 'badge_platinum_georanks_legend' },
  platinum_geodex_completionist:{ achievement_key: 'platinum_geodex_completionist',name: 'GeoDex Completionist', description: 'Complete all Specialist Tier I categories.',                   category: 'platinum', badge_key: 'badge_platinum_geodex_completionist' },
  // ── Mastery (prestige) ───────────────────────────────────────────────────
  gdp_master:        { achievement_key: 'gdp_master',        name: 'GDP Master',        description: 'Demonstrate GDP expertise across Classic, VS Mode, and Top 10.',         category: 'mastery',  badge_key: 'badge_gdp_master' },
  population_expert: { achievement_key: 'population_expert', name: 'Population Expert', description: 'Demonstrate population expertise across Classic, VS Mode, and Top 10.', category: 'mastery',  badge_key: 'badge_population_expert' },
};

// Auto-generates a preview payload for specialist_*_t1 / specialist_*_t2 keys,
// and any other key not covered by _PREVIEW_CATALOG.
// Derives badge_key via two BADGE_META lookup patterns:
//   'badge_' + key             → bronze/silver/gold/platinum/streak/mastery
//   'badge_' + key without 'specialist_' prefix → specialist tiers
// badge_key = null when unrecognised → emoji fallback on card 2.
function _buildPreviewItem(key) {
  const direct     = 'badge_' + key;
  const specialist = 'badge_' + key.replace(/^specialist_/, '');
  const badge_key  = BADGE_META[direct] ? direct : BADGE_META[specialist] ? specialist : null;
  const meta       = badge_key ? BADGE_META[badge_key] : null;

  // Derive requirement text from tier and category slug for specialist keys.
  const isT1 = key.endsWith('_t1');
  const isT2 = key.endsWith('_t2');
  const catSlug = key.replace(/^specialist_/, '').replace(/_t[12]$/, '');
  // Short slugs (gdp, f1) are fully uppercased; longer ones are title-cased.
  const catName = catSlug.split('_')
    .map(w => w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1))
    .join(' ');

  const description = isT1 ? `Play ${catName} in Classic, VS, and Top 10.`
    : isT2 ? `Master ${catName} — achieve expert scores in all three game modes.`
    : `Preview for: ${key}`;

  const category = key.startsWith('streak') || key.includes('streak') ? 'streak'
    : key.includes('founding')     ? 'founding'
    : key.startsWith('platinum')   ? 'mastery'
    : key.startsWith('gold')       ? 'mastery'
    : key.startsWith('specialist') ? 'mastery'
    : 'foundational';

  return {
    achievement_key: key,
    name:        meta?.label ?? key,
    description,
    category,
    badge_key,
    badge_name:  meta?.label ?? null,
  };
}

// Resolves a string key or raw object into a ready-to-show achievement payload.
// options.skipBadge = true → nulls badge_key to test the emoji fallback path.
function _resolvePreviewItem(keyOrObject, options = {}) {
  let item;
  if (typeof keyOrObject === 'string') {
    item = _PREVIEW_CATALOG[keyOrObject] ?? _buildPreviewItem(keyOrObject);
  } else if (keyOrObject && typeof keyOrObject === 'object') {
    item = keyOrObject;
  } else {
    console.warn('[GeoRanks] previewAchievement: argument must be a string key or object');
    return null;
  }
  return options.skipBadge ? { ...item, badge_key: null } : { ...item };
}

export function previewAchievement(keyOrObject, options = {}) {
  const item = _resolvePreviewItem(keyOrObject, options);
  if (!item) return;
  injectStyles();
  showNext([item]);
}

export function previewAchievementQueue(items) {
  if (!Array.isArray(items) || !items.length) {
    console.warn('[GeoRanks] previewAchievementQueue: pass a non-empty array');
    return;
  }
  const resolved = items.map(i => _resolvePreviewItem(i)).filter(Boolean);
  if (!resolved.length) return;
  injectStyles();
  showAchievementQueue(resolved);
}

// ---------------------------------------------------------------------------
// Resume pending queue after "View All Achievements" redirect.
// Runs once on every page that imports this module.
// Clears sessionStorage immediately — no re-show on refresh.
// ---------------------------------------------------------------------------
if (typeof window !== 'undefined') {
  const _resumePendingQueue = () => {
    const stored = sessionStorage.getItem(PENDING_QUEUE_KEY);
    if (!stored) return;
    sessionStorage.removeItem(PENDING_QUEUE_KEY);
    let pending;
    try { pending = JSON.parse(stored); } catch { return; }
    if (!Array.isArray(pending) || !pending.length) return;
    injectStyles();
    showNext(pending);
  };

  // Module scripts are deferred, so DOM is ready — but give the page
  // 600 ms to paint before overlaying popups on top.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(_resumePendingQueue, 600));
  } else {
    setTimeout(_resumePendingQueue, 600);
  }

  window.__previewAchievement      = previewAchievement;
  window.__previewAchievementQueue = previewAchievementQueue;
}
