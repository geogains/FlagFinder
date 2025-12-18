// js/daily-challenge.js v1.0
// Daily Challenge Router - Selects random mode + category and redirects

import { supabase } from './supabase-client.js';

console.log('Daily Challenge system loaded');

// All available categories
const allCategories = [
  'population', 'gdp', 'landmass', 'altitude', 'forest', 'coastline',
  'olympic', 'worldcup', 'passport', 'beer', 'nobelprize', 
  'temperature', 'precipitation', 'crimerate', 'happiness', 'cuisine'
];

// Categories with at least 10 countries (valid for Top 10 mode)
const top10ValidCategories = [
  'population', 'gdp', 'landmass', 'altitude', 'forest', 'coastline',
  'passport', 'beer', 'nobelprize', 'temperature', 'precipitation',
  'crimerate', 'happiness'
];

// All categories valid for Classic and VS (no minimum requirement)
const classicVsCategories = [...allCategories];

// Game modes
const gameModes = ['classic', 'top10', 'vs'];

// Seeded random function (same seed = same result)
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
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

// Check if user has completed today's daily challenge
export async function hasCompletedTodaysChallenge() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.log('Not logged in - allowing play');
    return false;
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
    return false;
  }
  
  return !!data; // Returns true if completed record exists
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
  temperature: 'Temperature',
  precipitation: 'Precipitation',
  crimerate: 'Crime Rate',
  happiness: 'Happiness Index',
  cuisine: 'Cuisine Popularity'
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
  nobelprize: '🏆',
  temperature: '🌡️',
  precipitation: '🌧️',
  crimerate: '🚨',
  happiness: '😊',
  cuisine: '🍽️'
};

console.log('Daily Challenge utilities ready');