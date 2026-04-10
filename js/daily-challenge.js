// js/daily-challenge.js v1.0
// Daily Challenge Router - Selects random mode + category and redirects

import { supabase } from './supabase-client.js';

console.log('Daily Challenge system loaded');

// All available categories
const allCategories = [
  'population', 'gdp', 'landmass', 'altitude', 'forest', 'coastline',
  'olympic', 'worldcup', 'passport', 'beer', 'nobelprize', 
  'hightemp', 'rainfall', 'crimerate', 'happiness', 'cuisine','tourism', 'michelin', 'bigmac', 'lifeexpectancy',
  // NEW CATEGORIES
  'marriageage', 'sexratio', 'tallestbuilding', 'density', 'carexports',
  'militarypersonel', 'rent', 'poorestgdp', 'university', 'volcano',
  'flamingo', 'disasterrisk', 'longestriver', 'renewableenergy', 'millionaires', 'gm'
];

// Categories with at least 10 countries (valid for Top 10 mode)
const top10ValidCategories = [
  'population', 'gdp', 'landmass', 'altitude', 'forest', 'coastline',
  'passport', 'beer', 'nobelprize', 'hightemp', 'rainfall',
  'crimerate', 'happiness','tourism', 'michelin', 'bigmac', 'lifeexpectancy',
  // NEW CATEGORIES (all have 10+ countries)
  'marriageage', 'sexratio', 'tallestbuilding', 'density', 'carexports',
  'militarypersonel', 'rent', 'poorestgdp', 'university', 'volcano',
  'flamingo', 'disasterrisk', 'longestriver', 'renewableenergy', 'millionaires', 'gm'
];

// All categories valid for Classic and VS (no minimum requirement)
const classicVsCategories = [...allCategories];

// Categories excluded from VS daily challenge because their datasets are too small
// (< 30 countries). In VS mode the full dataset is shuffled and cycled; small datasets
// produce a visible loop within the 2-minute session (e.g. 10 countries = 5-pair loop).
const VS_SMALL_DATASET = new Set([
  'happiness', 'worldcup', 'carexports', 'flamingo', 'tourism',
  'marriageage', 'longestriver', 'nobelprize', 'millionaires', 'poorestgdp',
  'sexratio', 'university', 'renewableenergy', 'volcano', 'cuisine'
]);

// Categories valid for VS daily challenge (≥ 30 country entries)
const vsEligibleCategories = allCategories.filter(cat => !VS_SMALL_DATASET.has(cat));

// Game modes
const gameModes = ['classic', 'top10', 'vs'];

// Seeded random function (same seed = same result)
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// --- Deterministic daily-game draw utilities ---

// Stateful seeded PRNG (Mulberry32). Call makeSeededRNG(seed) to get an rng() function.
export function makeSeededRNG(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle driven by a seeded rng — does not mutate the original array.
export function seededShuffle(array, rng) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Derive a single stable integer seed from UTC date + game mode + category string.
export function getDailyGameSeed(dateInt, mode, category) {
  const modeHash = [...mode].reduce((a, c) => a + c.charCodeAt(0), 0);
  const catHash  = [...category].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (dateInt ^ (modeHash * 1000) ^ catHash) >>> 0;
}

// Get daily seed based on current UTC date
function getDailySeed() {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1; // 0-indexed, so add 1
  const day = today.getUTCDate();
  
  // Create seed: YYYYMMDD format (e.g., 20251217)
  const seed = year * 10000 + month * 100 + day;
  console.log('Daily seed:', seed);
  return seed;
}

// Get today's daily challenge (mode + category)
export function getTodaysDailyChallenge() {
  const seed = getDailySeed();
  
  // Pick random game mode (use seed directly)
  const modeIndex = Math.floor(seededRandom(seed) * gameModes.length);
  const selectedMode = gameModes[modeIndex];
  
  console.log('Selected mode:', selectedMode);
  
  // Pick random category (use seed + offset for different randomness)
  let validCategories;
  
  if (selectedMode === 'top10') {
    validCategories = top10ValidCategories;
  } else if (selectedMode === 'vs') {
    validCategories = vsEligibleCategories;
  } else {
    validCategories = classicVsCategories;
  }
  
  const categoryIndex = Math.floor(seededRandom(seed + 1000) * validCategories.length);
  const selectedCategory = validCategories[categoryIndex];
  
  console.log('Selected category:', selectedCategory);
  console.log('Valid categories for this mode:', validCategories.length);
  
  return {
    mode: selectedMode,
    category: selectedCategory,
    date: new Date().toISOString().split('T')[0]
  };
}

// Validate that a given mode/category is actually today's daily challenge
// This prevents users from manually adding ?daily=true to bypass premium
export function isValidDailyChallenge(mode, category) {
  const todayChallenge = getTodaysDailyChallenge();
  
  // Map mode names (URL uses 'classic', daily challenge might use different names)
  const modeMap = {
    'game': 'classic',
    'classic': 'classic',
    'top10': 'top10',
    'vs': 'vs'
  };
  
  const normalizedMode = modeMap[mode] || mode;
  
  const isValid = todayChallenge.mode === normalizedMode && 
                  todayChallenge.category === category;
  
  console.log('Daily challenge validation:', {
    provided: { mode: normalizedMode, category },
    expected: { mode: todayChallenge.mode, category: todayChallenge.category },
    isValid
  });
  
  return isValid;
}

// Check if user has completed today's daily challenge
export async function hasCompletedTodaysChallenge() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.log('Not logged in - returning not-logged-in status');
    return { loggedIn: false, completed: false };  // ✅ Return object
  }
  
  const todayString = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('daily_challenge_scores')
    .select('id, completed')
    .eq('user_id', session.user.id)
    .eq('played_date', todayString)
    .eq('completed', true)
    .maybeSingle();
  
  if (error) {
    console.error('Error checking completion:', error);
    return { loggedIn: true, completed: false };
  }
  
  return { loggedIn: true, completed: !!data };  // ✅ Return object
}

// Get display names for modes and categories
export const modeDisplayNames = {
  classic: 'Classic',
  top10: 'Top 10',
  vs: 'VS Mode'
};

export const categoryDisplayNames = {
  population: 'Population',
  gdp: 'GDP Per Capita',
  landmass: 'Landmass',
  altitude: 'Highest Altitude',
  forest: 'Forest Coverage',
  coastline: 'Coastline Length',
  olympic: 'Olympic Medals',
  worldcup: 'World Cup Wins',
  passport: 'Passport Power',
  beer: 'Beer Consumption',
  nobelprize: 'Nobel Prizes',
  hightemp: 'Highest Temp',
  rainfall: 'Rainfall',
  crimerate: 'Crime Rate',
  happiness: 'Happiness Index',
  cuisine: 'Cuisine Popularity',
  tourism: 'Tourist Visits',
  michelin: 'Michelin Stars',
  bigmac: 'BigMac Index',
  lifeexpectancy: 'Life Expectancy',
  // NEW CATEGORIES
  marriageage: 'Marriage Age',
  sexratio: 'Gender Ratio',
  tallestbuilding: 'Tallest Building',
  density: 'Population Density',
  carexports: 'Car Exports',
  militarypersonel: 'Military Personnel',
  rent: 'Rent Prices',
  poorestgdp: 'Poorest Countries',
  university: 'Universities',
  volcano: 'Volcanoes',
  flamingo: 'Flamingos',
  disasterrisk: 'Natural Disasters',
  longestriver: 'Longest River',
  renewableenergy: 'Renewable Energy',
  millionaires: 'Millionaires',
  gm: 'Grandmasters',
};

// Get emoji for each category
export const categoryEmojis = {
  population: '👥',
  gdp: '💵',
  landmass: '🗺️',
  altitude: '🏔️',
  forest: '🌲',
  coastline: '🏖️',
  olympic: '🥇',
  worldcup: '⚽',
  passport: '🛂',
  beer: '🍺',
  nobelprize: '🕊️',
  hightemp: '☀️',
  rainfall: '🌧️',
  crimerate: '🚨',
  happiness: '😊',
  cuisine: '🍽️',
  tourism: '✈️',
  michelin: '⭐',
  bigmac: '🍔',
  lifeexpectancy: '🤍',
  // NEW CATEGORIES
  marriageage: '💍',
  sexratio: '⚖️',
  tallestbuilding: '🏙️',
  density: '👨‍👩‍👧‍👦',
  carexports: '🚗',
  militarypersonel: '🪖',
  rent: '🏠',
  poorestgdp: '📉',
  university: '🎓',
  volcano: '🌋',
  flamingo: '🦩',
  disasterrisk: '🌪️',
  longestriver: '🌊',
  renewableenergy: '♻️',
  millionaires: '💰',
  gm: '♟️',
};

console.log('Daily Challenge utilities ready');