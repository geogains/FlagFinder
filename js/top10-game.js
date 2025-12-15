// js/top10-game.js
import { top10Data, CATEGORY_ID_MAP } from './top10-data.js';
import { allCountries } from './countries-list.js';
import { supabase } from './supabase-client.js';

console.log('Top10 game script loaded');
console.log('Available categories:', Object.keys(top10Data));
console.log('Total countries available for search:', allCountries.length);

// Get category from URL or default to population
const params = new URLSearchParams(window.location.search);
const categoryKey = params.get('mode') || 'population';
const currentCategory = top10Data[categoryKey] || top10Data.population;
const categoryId = CATEGORY_ID_MAP[categoryKey];

console.log('Current category:', categoryKey, currentCategory);
console.log('Category ID for database:', categoryId);

// Game state
let gameState = {
  countries: [...currentCategory.countries],
  guessedCountries: new Set(), // Stores country names that have been guessed
  lives: 3,
  score: 0,
  timeRemaining: 120, // 2 minutes
  incorrectGuesses: [],
  startTime: Date.now()
};

// Check if user already played today's challenge
async function checkDailyPlayStatus() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.log('No session - allowing play');
    return false; // Not logged in, allow play
  }
  
  // Get today's date in UTC
  const today = new Date();
  const utcDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const todayString = utcDate.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Check if user has a score for this category today (started OR completed)
  const { data, error } = await supabase
    .from('top10_scores')
    .select('id, score, completed')
    .eq('user_id', session.user.id)
    .eq('category_id', categoryId)
    .eq('played_date', todayString)
    .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 error
  
  if (error) {
    console.error('Error checking daily play status:', error);
    return false; // On error, allow play
  }
  
  if (data) {
    console.log('User already started/completed today:', data);
    return true; // Already started or completed
  }
  
  return false; // Haven't played yet
}

// Mark challenge as started (creates initial record in database)
// This prevents users from refreshing to reset the timer
async function markChallengeAsStarted() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('Not logged in - not marking as started');
      return;
    }
    
    // Get today's date in UTC
    const today = new Date();
    const utcDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const todayString = utcDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Create initial record with 0 score (will be updated when game ends)
    const { data, error } = await supabase
      .from('top10_scores')
      .insert({
        user_id: session.user.id,
        category_id: categoryId,
        score: 0,
        correct_count: 0,
        wrong_count: 0,
        time_remaining: 120,
        played_date: todayString,
        completed: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error marking challenge as started:', error);
    } else {
      console.log('✅ Challenge marked as started:', data);
    }
  } catch (err) {
    console.error('Exception marking challenge as started:', err);
  }
}

// Initialize game
async function initGame() {
  console.log('Initializing game...');
  
  // First check if user is logged in
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // Show sign-in modal for non-authenticated users
    const modal = document.getElementById('signInRequiredModal');
    const categoryDisplay = document.getElementById('signInCategoryName');
    if (categoryDisplay) {
      categoryDisplay.textContent = currentCategory.title;
    }
    if (modal) {
      modal.style.display = 'flex';
    }
    return;
  }
  
  // Check if already played today (only for logged-in users)
  const hasPlayedToday = await checkDailyPlayStatus();
  
  if (hasPlayedToday) {
    // Show beautiful custom modal instead of alert
    const modal = document.getElementById('alreadyPlayedModal');
    const categoryDisplay = document.getElementById('alreadyPlayedCategory');
    if (categoryDisplay) {
      categoryDisplay.textContent = currentCategory.title;
    }
    if (modal) {
      modal.style.display = 'flex';
    }
    return;
  }
  
  // Set title
  const titleText = `NAME THE TOP 10 COUNTRIES RANKED BY: ${currentCategory.title.toUpperCase()}`;
  document.getElementById('categoryTitle').textContent = titleText;
  
  // IMPORTANT: Mark challenge as "started" immediately in database
  // This prevents users from refreshing to restart the timer
  await markChallengeAsStarted();
  
  // Build ranking grid with new layout (rank number outside slot)
  const grid = document.getElementById('rankingsGrid');
  grid.innerHTML = '';
  
  for (let i = 1; i <= 10; i++) {
    const row = document.createElement('div');
    row.className = 'ranking-row';
    row.innerHTML = `
      <div class="rank-number">${i}</div>
      <div class="rank-slot" data-rank="${i}">
        <span class="rank-empty">---</span>
      </div>
    `;
    grid.appendChild(row);
  }
  
  // Build search dropdown
  buildSearchDropdown();
  
  // Start timer
  startTimer();
  
  // Setup search functionality
  setupSearch();
  
  console.log('Game initialized successfully');
}

function buildSearchDropdown() {
  console.log('Building search dropdown...');
  const dropdown = document.getElementById('searchDropdown');
  
  if (!dropdown) {
    console.error('Dropdown element not found!');
    return;
  }
  
  dropdown.innerHTML = '';
  
  // Sort all countries alphabetically for easier finding
  const sortedCountries = [...allCountries].sort((a, b) => 
    a.name.localeCompare(b.name)
  );
  
  console.log('Number of countries to add:', sortedCountries.length);
  
  sortedCountries.forEach(country => {
    const option = document.createElement('div');
    option.className = 'country-option';
    option.dataset.countryCode = country.code;
    
    // Convert country code to lowercase flag filename
    const flagFilename = `flags/${country.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    
    option.innerHTML = `
      <img src="${flagFilename}" alt="${country.name}" class="country-flag" onerror="this.style.display='none'">
      <span class="country-name">${country.name}</span>
    `;
    option.addEventListener('click', () => selectCountryByName(country.name));
    dropdown.appendChild(option);
  });
  
  console.log('Dropdown built with', dropdown.children.length, 'options');
}

function setupSearch() {
  console.log('Setting up search...');
  const searchInput = document.getElementById('searchInput');
  const dropdown = document.getElementById('searchDropdown');
  
  if (!searchInput) {
    console.error('Search input not found!');
    return;
  }
  
  if (!dropdown) {
    console.error('Search dropdown not found!');
    return;
  }
  
  let selectedIndex = -1; // Track highlighted option
  
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    console.log('Search term:', searchTerm);
    
    if (searchTerm === '') {
      dropdown.classList.remove('active');
      selectedIndex = -1;
      return;
    }
    
    const options = dropdown.querySelectorAll('.country-option');
    let hasVisibleOptions = false;
    
    options.forEach((option, index) => {
      const countryName = option.querySelector('.country-name').textContent.toLowerCase();
      const matches = countryName.includes(searchTerm);
      option.style.display = matches ? 'flex' : 'none';
      option.classList.remove('highlighted'); // Remove previous highlights
      if (matches) hasVisibleOptions = true;
    });
    
    console.log('Has visible options:', hasVisibleOptions);
    dropdown.classList.toggle('active', hasVisibleOptions);
    selectedIndex = -1; // Reset selection when typing
  });
  
  // Keyboard navigation (desktop)
  searchInput.addEventListener('keydown', (e) => {
    const visibleOptions = Array.from(dropdown.querySelectorAll('.country-option'))
      .filter(opt => opt.style.display !== 'none' && !opt.classList.contains('disabled'));
    
    if (visibleOptions.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, visibleOptions.length - 1);
      updateHighlight(visibleOptions);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
      updateHighlight(visibleOptions);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && visibleOptions[selectedIndex]) {
        const countryName = visibleOptions[selectedIndex].querySelector('.country-name').textContent;
        selectCountryByName(countryName);
      }
    }
  });
  
  function updateHighlight(visibleOptions) {
    // Remove all highlights
    visibleOptions.forEach(opt => opt.classList.remove('highlighted'));
    
    // Add highlight to selected
    if (selectedIndex >= 0 && visibleOptions[selectedIndex]) {
      visibleOptions[selectedIndex].classList.add('highlighted');
      visibleOptions[selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      dropdown.classList.remove('active');
      selectedIndex = -1;
    }
  });
  
  // Focus on search input on load
  searchInput.focus();
  console.log('Search setup complete');
}

function selectCountryByName(countryName) {
  console.log('Selected country:', countryName);
  
  // Find the country in the top 10 data for this category
  const country = currentCategory.countries.find(c => c.name === countryName);
  
  if (!country) {
    // Country not in top 10 - incorrect guess
    console.log('Country not in top 10 - incorrect guess');
    gameState.lives--;
    gameState.incorrectGuesses.push(countryName);
    updateLives();
    
    // Clear search and close dropdown
    const searchInput = document.getElementById('searchInput');
    searchInput.value = '';
    document.getElementById('searchDropdown').classList.remove('active');
    
    // Auto-focus for desktop (check if device has keyboard)
    if (window.innerWidth >= 768) {
      setTimeout(() => searchInput.focus(), 100);
    }
    
    if (gameState.lives === 0) {
      setTimeout(() => endGame(false), 500);
    }
    return;
  }
  
  // Country is in top 10 - pass to selectCountry
  selectCountry(country);
}

function selectCountry(country) {
  console.log('Selected country from top 10:', country.name);
  
  // Check if already guessed
  if (gameState.guessedCountries.has(country.name)) {
    console.log('Country already guessed');
    return;
  }
  
  // Mark as guessed
  gameState.guessedCountries.add(country.name);
  
  // Disable in dropdown - find by country name
  const options = document.querySelectorAll('.country-option');
  options.forEach(option => {
    if (option.querySelector('.country-name').textContent === country.name) {
      option.classList.add('disabled');
    }
  });
  
  // Clear search and close dropdown
  const searchInput = document.getElementById('searchInput');
  searchInput.value = '';
  document.getElementById('searchDropdown').classList.remove('active');
  
  // Auto-focus for desktop (check if device has keyboard)
  if (window.innerWidth >= 768) {
    setTimeout(() => searchInput.focus(), 100);
  }
  
  // Check if correct
  const isCorrect = country.rank >= 1 && country.rank <= 10;
  
  if (isCorrect) {
    console.log('Correct guess! Rank:', country.rank);
    // Place in correct slot with flag and data value
    const slot = document.querySelector(`[data-rank="${country.rank}"]`);
    slot.classList.add('correct');
    
    // Format the value based on category
    const formattedValue = formatValue(country.value, currentCategory.unit);
    
    slot.innerHTML = `
      <img src="${country.flag}" alt="${country.name}" class="rank-flag">
      <span class="rank-data">${formattedValue}</span>
    `;
    
    // Score is calculated at the end of the game
    
    // Check for win
    if (gameState.guessedCountries.size === 10) {
      setTimeout(() => endGame(true), 500);
    }
  } else {
    console.log('Incorrect guess');
    // Incorrect guess - lose a life
    gameState.lives--;
    gameState.incorrectGuesses.push(country.name);
    updateLives();
    
    if (gameState.lives === 0) {
      setTimeout(() => endGame(false), 500);
    }
  }
}

function formatValue(value, unit) {
  // Format numbers based on unit type
  switch(unit) {
    case 'M': // Million
      return `${value.toFixed(1)}M`;
    case 'USD':
      return `$${value.toLocaleString()}`;
    case 'km²':
      return `${value.toLocaleString()} km²`;
    case 'km':
      return `${value.toLocaleString()} km`;
    case 'm':
      return `${value.toLocaleString()} m`;
    case 'L':
      return `${value} L`;
    case '°C':
      return `${value}°C`;
    case 'mm/year':
      return `${value} mm`;
    case 'index':
      return `${value}`;
    case 'score':
      return `${value}`;
    case 'prizes':
      return `${value}`;
    case 'medals':
      return `${value.toLocaleString()}`;
    case 'titles':
      return `${value}`;
    case 'countries':
      return `${value}`;
    case 'rating':
      return `${value}/5`;
    default:
      return `${value}`;
  }
}

function updateLives() {
  const livesDisplay = document.getElementById('livesDisplay');
  const hearts = '❤️'.repeat(gameState.lives);
  livesDisplay.innerHTML = hearts;
}

function startTimer() {
  const timerDisplay = document.getElementById('timerDisplay');
  
  const interval = setInterval(() => {
    gameState.timeRemaining--;
    
    const minutes = Math.floor(gameState.timeRemaining / 60);
    const seconds = gameState.timeRemaining % 60;
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    if (gameState.timeRemaining <= 0) {
      clearInterval(interval);
      endGame(false);
    }
  }, 1000);
  
  // Store interval ID for cleanup
  gameState.timerInterval = interval;
}

async function endGame(won) {
  // Clear timer
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
  }
  
  // Calculate final stats
  const timeElapsed = 120 - gameState.timeRemaining;
  const correctGuesses = gameState.guessedCountries.size;
  
  // Calculate final score with balanced formula
  // - Base: 100 points per correct answer (heavily reward accuracy)
  // - Time bonus: 2 points per second remaining (max 240 points, rewards speed fairly)
  // - Lives bonus: 50 points per life remaining (reward efficiency)
  
  let finalScore = 0;
  
  // Correct answers: 100 points each (main scoring component)
  finalScore += correctGuesses * 100;
  
  // Time bonus: 2 points per second remaining (encourages speed)
  // Only awarded if you got at least 5 correct to prevent gaming
  if (correctGuesses >= 5) {
    const timeBonus = gameState.timeRemaining * 2;
    finalScore += timeBonus;
  }
  
  // Lives bonus: 50 points per life remaining (rewards accuracy without guessing)
  finalScore += gameState.lives * 50;
  
  // Update the final score
  gameState.score = finalScore;
  
  // Save score to database (only if logged in)
  await saveDailyScore(finalScore, correctGuesses, timeElapsed);
  
  // Show results overlay
  showResults(won, correctGuesses, timeElapsed);
}

// Save daily challenge score to database
async function saveDailyScore(score, correctGuesses, timeElapsed) {
  try {
    console.log('Attempting to save score...', { score, correctGuesses, timeElapsed });
    
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('Not logged in - score not saved');
      return;
    }
    
    console.log('User ID:', session.user.id);
    console.log('Category ID:', categoryId);
    console.log('Category Key:', categoryKey);
    
    // Get today's date in UTC
    const today = new Date();
    const utcDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const todayString = utcDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    console.log('Playing date (UTC):', todayString);
    
    // Prepare the data object (using actual database column names)
    const scoreData = {
      user_id: session.user.id,
      category_id: categoryId,
      score: score,
      correct_count: correctGuesses, // Database uses 'correct_count' not 'correct_answers'
      wrong_count: gameState.incorrectGuesses.length, // Track incorrect guesses
      time_remaining: gameState.timeRemaining, // Database uses 'time_remaining' not 'time_taken'
      played_date: todayString,
      completed: correctGuesses === 10 // Mark as completed if all 10 correct
    };
    
    console.log('Score data to save:', scoreData);
    
    // Update the existing record (created when challenge started)
    const { data, error } = await supabase
      .from('top10_scores')
      .update(scoreData)
      .eq('user_id', session.user.id)
      .eq('category_id', categoryId)
      .eq('played_date', todayString)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error saving score:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      // Show user-friendly error
      alert('Failed to save your score. Please check your internet connection.');
    } else {
      console.log('✅ Score saved successfully:', data);
    }
  } catch (err) {
    console.error('❌ Exception saving score:', err);
    console.error('Exception details:', err.message, err.stack);
  }
}

function showResults(won, correctGuesses, timeElapsed) {
  const overlay = document.getElementById('resultsOverlay');
  const emoji = document.getElementById('resultsEmoji');
  const title = document.getElementById('resultsTitle');
  const category = document.getElementById('resultsCategory');
  
  // Set emoji and title based on performance
  if (won) {
    emoji.textContent = '🎉';
    title.textContent = 'Perfect!';
  } else if (correctGuesses >= 7) {
    emoji.textContent = '🌟';
    title.textContent = 'Great Job!';
  } else if (correctGuesses >= 5) {
    emoji.textContent = '👍';
    title.textContent = 'Good Effort!';
  } else {
    emoji.textContent = '💪';
    title.textContent = 'Keep Trying!';
  }
  
  category.textContent = currentCategory.title;
  
  // Update stats
  document.getElementById('finalScore').textContent = gameState.score;
  document.getElementById('finalLives').textContent = '❤️'.repeat(gameState.lives);
  
  const minutes = Math.floor(timeElapsed / 60);
  const seconds = timeElapsed % 60;
  document.getElementById('finalTime').textContent = 
    `${minutes}:${seconds.toString().padStart(2, '0')} / 2:00`;
  
  document.getElementById('finalAccuracy').textContent = `${correctGuesses}/10 correct`;
  
  // Build results table
  buildResultsTable();
  
  // Show incorrect guesses if any
  if (gameState.incorrectGuesses.length > 0) {
    document.getElementById('incorrectSection').style.display = 'block';
    const incorrectList = document.getElementById('incorrectList');
    incorrectList.innerHTML = gameState.incorrectGuesses
      .map(name => `<div class="incorrect-item">❌ ${name}</div>`)
      .join('');
  }
  
  // Setup play classic button
  document.getElementById('playClassicBtn').onclick = () => {
    window.location.href = `game.html?mode=${categoryKey}`;
  };
  
  overlay.classList.add('active');
}

function buildResultsTable() {
  const table = document.getElementById('resultsTable');
  table.innerHTML = '';
  
  currentCategory.countries.forEach(country => {
    const isGuessed = gameState.guessedCountries.has(country.name);
    const row = document.createElement('div');
    row.className = `table-row ${isGuessed ? 'correct' : ''}`;
    
    const formattedValue = formatValue(country.value, currentCategory.unit);
    
    row.innerHTML = `
      <span class="table-rank">#${country.rank}</span>
      <img src="${country.flag}" alt="${country.name}" class="table-flag">
      <span class="table-country">${country.name}</span>
      <span class="table-data">${formattedValue}</span>
    `;
    table.appendChild(row);
  });
}

// Share functionality
window.shareResults = function() {
  const correctCount = gameState.guessedCountries.size;
  const text = `🌍 GeoRanks - ${currentCategory.title}
Score: ${gameState.score} | ${correctCount}/10 correct
Lives: ${'❤️'.repeat(gameState.lives)}

Can you beat my score? Play at geo-ranks.com`;
  
  if (navigator.share) {
    navigator.share({
      title: 'GeoRanks Result',
      text: text
    }).catch(() => {});
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      alert('Results copied to clipboard!');
    });
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initGame);
console.log('Event listener added for DOMContentLoaded');