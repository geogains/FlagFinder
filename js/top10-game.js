// js/top10-game.js
// Import sound manager
import soundManager from './sound-manager.js';
import { loadTop10CategoryData, CATEGORY_ID_MAP } from './top10-categories-loader.js';
import { allCountries } from './countries-list.js';
import { supabase } from './supabase-client.js';

console.log('Top10 game script loaded');

console.log('Top10 game script loaded');

// Initialize sound manager with sounds
const SOUND_MAP = {
  'wrong': '../sounds/wrong.mp3',
  'correct': '../sounds/correct.mp3'
};

soundManager.init(SOUND_MAP).then(() => {
  console.log('✅ Sounds loaded for Top 10 mode');
}).catch(err => {
  console.error('❌ Failed to load sounds:', err);
});

// Get category from URL or default to population
const params = new URLSearchParams(window.location.search);
const categoryKey = params.get('mode') || 'population';
const isDailyChallenge = params.get('daily') === 'true'; // Check if it's Daily Challenge mode
const categoryId = CATEGORY_ID_MAP[categoryKey];

console.log('Current category:', categoryKey);
console.log('Category ID for database:', categoryId);
console.log('Is Daily Challenge:', isDailyChallenge);

// Load category data asynchronously
let currentCategory = null;
let gameState = null;

async function initializeGame() {
  try {
    // Load category data from categories/*.js
    currentCategory = await loadTop10CategoryData(categoryKey);
    console.log('Category data loaded:', currentCategory);
    console.log('Top 10 countries:', currentCategory.countries);
    
    // Initialize game state
    gameState = {
      countries: [...currentCategory.countries],
      guessedCountries: new Set(), // Stores country names that have been guessed
      lives: 3,
      score: 0,
      timeRemaining: 120, // 2 minutes
      incorrectGuesses: [],
      startTime: Date.now()
    };
    
    // Continue with game initialization
    await continueGameInit();
    
  } catch (error) {
    console.error('Error loading category data:', error);
    alert('Failed to load category data. Please try again.');
    window.location.href = 'index.html';
  }
}

async function continueGameInit() {
  // After loading category data, run the main game initialization
  await initGame();
}

// Check if user already completed today's challenge
// Returns the completed game data if found, null otherwise
async function checkIfCompleted() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.log('No session - allowing play');
    return null;
  }
  
  // Get today's date in UTC
  const today = new Date();
  const utcDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const todayString = utcDate.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Check if user has a COMPLETED score for this category today
  const { data, error } = await supabase
    .from('daily_challenge_scores')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('category_id', categoryId)
    .eq('played_date', todayString)
    .maybeSingle();
  
  if (error) {
    console.error('Error checking completion status:', error);
    return null;
  }
  
  if (data) {
    // Check if the game was actually COMPLETED
    if (data.completed === true) {
      console.log('User already completed today:', data);
      return data; // Return the completed game data
    }
    
    // Also check if game ended but wasn't marked complete (0 lives or 0 time)
    const remainingLives = Math.max(0, 3 - (data.wrong_count || 0));
    if (remainingLives === 0 || (data.time_remaining || 0) <= 0) {
      console.log('Game ended (0 lives or 0 time):', data);
      return data; // Return the ended game data
    }
    
    console.log('User started but did not complete - allowing resume:', data);
    return null; // Started but not completed - allow resume
  }
  
  return null; // Haven't played yet
}

// Show results for a completed game (when user returns after finishing)
async function showCompletedGameResults(gameData) {
  console.log('Displaying completed game results');
  
  // Hide the game UI
  document.querySelector('.game-container').style.display = 'none';
  
  // Parse the game state to get what they guessed
  let savedGameState = null;
  if (gameData.game_state_json) {
    try {
      savedGameState = JSON.parse(gameData.game_state_json);
    } catch (e) {
      console.error('Failed to parse game state:', e);
    }
  }
  
  // Calculate stats
  const correctCount = gameData.correct_count || 0;
  const wrongCount = gameData.wrong_count || 0;
  const timeElapsed = 120 - (gameData.time_remaining || 0);
  const lives = Math.max(0, 3 - wrongCount);
  const won = correctCount === 10;
  
  // Update the GLOBAL gameState so buildResultsTable and shareResults work
  if (savedGameState) {
    gameState.guessedCountries = new Set(savedGameState.guessedCountries || []);
    gameState.incorrectGuesses = savedGameState.incorrectGuesses || [];
    gameState.lives = lives;
    gameState.timeRemaining = gameData.time_remaining || 0;
  }
  gameState.score = gameData.score || 0; // Make sure score is set
  
  // Show results overlay with their data
  const overlay = document.getElementById('resultsOverlay');
  const emoji = document.getElementById('resultsEmoji');
  const title = document.getElementById('resultsTitle');
  const category = document.getElementById('resultsCategory');
  
  // Set emoji and title based on performance
  if (won) {
    emoji.textContent = '🎉';
    title.textContent = 'Perfect!';
  } else if (correctCount >= 7) {
    emoji.textContent = '🌟';
    title.textContent = 'Great Job!';
  } else if (correctCount >= 5) {
    emoji.textContent = '👍';
    title.textContent = 'Good Effort!';
  } else {
    emoji.textContent = '💪';
    title.textContent = 'Keep Trying!';
  }
  
  category.textContent = currentCategory.title;
  
  // Update stats
  document.getElementById('finalScore').textContent = gameData.score || 0;
  document.getElementById('finalLives').textContent = '❤️'.repeat(lives);
  
  const minutes = Math.floor(timeElapsed / 60);
  const seconds = timeElapsed % 60;
  document.getElementById('finalTime').textContent = 
    `${minutes}:${seconds.toString().padStart(2, '0')} / 2:00`;
  
  document.getElementById('finalAccuracy').textContent = `${correctCount}/10 correct`;
  
  // Build results table
  buildResultsTable();
  
  // Show incorrect guesses if any
  if (savedGameState && savedGameState.incorrectGuesses && savedGameState.incorrectGuesses.length > 0) {
    const incorrectSection = document.getElementById('incorrectSection');
    const incorrectList = document.getElementById('incorrectList');
    incorrectSection.style.display = 'block';
    incorrectList.innerHTML = savedGameState.incorrectGuesses.map(name => 
      `<span class="incorrect-country">${name}</span>`
    ).join('');
  }
  
  // Show the overlay
  overlay.style.display = 'flex';
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
    
    // Check if record already exists (from a previous incomplete attempt)
    const { data: existing } = await supabase
      .from('daily_challenge_scores')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('category_id', categoryId)
      .eq('played_date', todayString)
      .maybeSingle();
    
    if (existing) {
      console.log('Challenge record already exists (resuming) - skipping insert');
      return; // Record already exists, don't create duplicate
    }
    
    // Create initial record with 0 score (will be updated when game ends)
    const initialState = {
      guessedCountries: [],
      incorrectGuesses: [],
      lives: 3,
      timeRemaining: 120
    };
    
    const { data, error } = await supabase
      .from('daily_challenge_scores')
      .insert({
        user_id: session.user.id,
        category_id: categoryId,
        score: 0,
        correct_count: 0,
        time_taken: 0,
        played_date: todayString,
        completed: false,
        game_state_json: JSON.stringify(initialState)
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
  
  // Declare savedState at function level
  let savedState = null;
  
  // Check if user is logged in
  const { data: { session } } = await supabase.auth.getSession();
  
  // Only require sign-in for Daily Challenge mode
  if (isDailyChallenge && !session) {
    // Show sign-in modal for Daily Challenge without auth
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
  
  // If logged in and Daily Challenge, check if already completed
  if (isDailyChallenge && session) {
    const completedGameData = await checkIfCompleted();
    
    if (completedGameData) {
      console.log('Daily Challenge already completed - showing results:', completedGameData);
      showCompletedGameResults(completedGameData);
      return;
    }
  }
  
  // Set title
  const titleText = `NAME THE TOP 10 COUNTRIES RANKED BY: ${currentCategory.title.toUpperCase()}`;
  document.getElementById('categoryTitle').textContent = titleText;
  
  // Try to restore saved game state (only works for logged-in users in Daily Challenge)
  if (session && isDailyChallenge) {
    savedState = await restoreGameState(); // Assign to function-level variable
    
    if (savedState) {
      // Restore the saved state
      console.log('Restoring saved game state');
      console.log('Saved state data:', savedState);
      gameState.guessedCountries = new Set(savedState.guessedCountries);
      gameState.incorrectGuesses = savedState.incorrectGuesses;
      gameState.lives = savedState.lives;
      gameState.timeRemaining = savedState.timeRemaining;
      
      console.log('Game state after restoration:');
      console.log('- Lives:', gameState.lives);
      console.log('- Time remaining:', gameState.timeRemaining);
      console.log('- Guessed countries:', Array.from(gameState.guessedCountries));
      console.log('- Incorrect guesses:', gameState.incorrectGuesses);
      
      // Update lives display
      updateLives();
    } else {
      // Fresh start - mark challenge as started in database
      console.log('Starting fresh Daily Challenge');
      await markChallengeAsStarted();
    }
  } else {
    console.log('Starting standalone Top 10 game (no save/restore)');
  }
  
    // Build ranking grid with new layout (rank number outside slot)
  const grid = document.getElementById('rankingsGrid');
  grid.innerHTML = '';
  
  // Get locked slots from category data (for categories with < 10 items)
  const lockedSlots = currentCategory.lockedSlots || [];
  
  for (let i = 1; i <= 10; i++) {
    const row = document.createElement('div');
    row.className = 'ranking-row';
    
    // Check if this slot should be locked
    const isLocked = lockedSlots.includes(i);
    
    if (isLocked) {
      // Locked slot - grayed out and unavailable
      row.innerHTML = `
        <div class="rank-number locked">${i}</div>
        <div class="rank-slot locked" data-rank="${i}">
          <span class="rank-locked">🔒 Unavailable</span>
        </div>
      `;
    } else {
      // Normal slot
      row.innerHTML = `
        <div class="rank-number">${i}</div>
        <div class="rank-slot" data-rank="${i}">
          <span class="rank-empty">---</span>
        </div>
      `;
    }
    
    grid.appendChild(row);
  }
  
  // If restoring state, fill in the correct slots
  if (savedState && savedState.guessedCountries.length > 0) {
    console.log('Restoring visual state for guessed countries');
    savedState.guessedCountries.forEach(countryName => {
      const country = currentCategory.countries.find(c => c.name === countryName);
      if (country && country.rank >= 1 && country.rank <= 10) {
        const slot = document.querySelector(`[data-rank="${country.rank}"]`);
        if (slot) {
          slot.classList.add('correct');
          const formattedValue = formatValue(country.value, currentCategory.unit);
          slot.innerHTML = `
            <img src="${country.flag}" alt="${country.name}" class="rank-flag">
            <span class="rank-data">${formattedValue}</span>
          `;
        }
      }
    });
  }
  
  // Build search dropdown
  buildSearchDropdown();
  
  // If restoring state, disable already-guessed countries in dropdown
  if (savedState && savedState.guessedCountries.length > 0) {
    console.log('Disabling already-guessed countries in dropdown');
    const options = document.querySelectorAll('.country-option');
    options.forEach(option => {
      const countryName = option.querySelector('.country-name').textContent;
      if (savedState.guessedCountries.includes(countryName)) {
        option.classList.add('disabled');
      }
    });
  }
  
  // Disable incorrect guesses too
  if (savedState && savedState.incorrectGuesses.length > 0) {
    console.log('Disabling already-guessed incorrect countries in dropdown');
    const options = document.querySelectorAll('.country-option');
    options.forEach(option => {
      const countryName = option.querySelector('.country-name').textContent;
      if (savedState.incorrectGuesses.includes(countryName)) {
        option.classList.add('disabled');
      }
    });
  }
  
  // Check if game already ended (0 lives or 0 time)
  if (gameState.lives === 0) {
    console.log('Game already ended (0 lives) - triggering endGame');
    setTimeout(() => endGame(false), 500);
    return;
  }
  
  if (gameState.timeRemaining <= 0) {
    console.log('Game already ended (0 time) - triggering endGame');
    setTimeout(() => endGame(false), 500);
    return;
  }
  
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
    
        // Use ISO country code for flag filename
    const flagFilename = `flags/${country.code}.png`;
    
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

// Restore game state from database (called during init)
async function restoreGameState() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    
    const today = new Date();
    const utcDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const todayString = utcDate.toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_challenge_scores')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('category_id', categoryId)
      .eq('played_date', todayString)
      .maybeSingle();
    
    if (error) {
      console.error('Error restoring game state:', error);
      return null;
    }
    
    if (data) {
      // Try to restore from JSON first
      if (data.game_state_json) {
        console.log('Restoring saved game state from JSON:', data);
        return JSON.parse(data.game_state_json);
      } else {
        // Fallback: reconstruct from database columns
        // This happens if user refreshed before first auto-save
        console.log('No JSON found, reconstructing from DB columns:', data);
        
        // Calculate time remaining from time_taken
        const timeRemaining = Math.max(0, 120 - (data.time_taken || 0));
        
        // For lives, we can't know for sure, so assume they started with 3
        const lives = 3;
        
        return {
          guessedCountries: [], // Can't restore this without JSON, but at least restore time/lives
          incorrectGuesses: [],
          lives: lives,
          timeRemaining: timeRemaining
        };
      }
    }
    
    return null;
  } catch (err) {
    console.error('Exception restoring game state:', err);
    return null;
  }
}

async function selectCountryByName(countryName) {
  console.log('Selected country:', countryName);
  
  // Find the country in the top 10 data for this category
  const country = currentCategory.countries.find(c => c.name === countryName);
  
  if (!country) {
    // Country not in top 10 - incorrect guess
    console.log('Country not in top 10 - incorrect guess');
    
    // Check if already guessed this incorrect country
    if (gameState.incorrectGuesses.includes(countryName)) {
      console.log('Already guessed this incorrect country');
      return;
    }
    
    gameState.lives--;
    gameState.incorrectGuesses.push(countryName);
    soundManager.play('wrong');
    updateLives();
    
    // Disable this country in the dropdown
    const options = document.querySelectorAll('.country-option');
    options.forEach(option => {
      if (option.querySelector('.country-name').textContent === countryName) {
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
    
    if (gameState.lives === 0) {
      setTimeout(() => endGame(false), 500);
    }
    return;
  }
  
  // Country is in top 10 - pass to selectCountry
  await selectCountry(country);
}

async function selectCountry(country) {
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
    soundManager.play('correct');
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
    
     // Check for win (consider only available countries, not locked slots)
    if (gameState.guessedCountries.size === currentCategory.countries.length) {
      setTimeout(() => endGame(true), 500);
    }
  } else {
    console.log('Incorrect guess');
    // Incorrect guess - lose a life
    gameState.lives--;
    gameState.incorrectGuesses.push(country.name);
    soundManager.play('wrong');
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
    case 'hectares':
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M hectares`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K hectares`;
      }
      return `${value.toLocaleString()} hectares`;
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
    case 'M Tourists':
      return `${value.toFixed(1)}M Tourists`;
     case 'restaurants':
      return `${value.toLocaleString()} Restaurants`;
    case 'USD':
      return `$${value.toFixed(2)}`;  // ← UPDATE to use .toFixed(2)
    case 'years':
      return `${value.toFixed(1)} Years`;
    default:
      return `${value}`;
  }
}

function updateLives() {
  const livesDisplay = document.getElementById('livesDisplay');
  const hearts = '❤️'.repeat(gameState.lives);
  livesDisplay.innerHTML = hearts;
  
  // Trigger shake animation
  livesDisplay.classList.add('shake');
  
  // Remove shake class after animation completes
  setTimeout(() => {
    livesDisplay.classList.remove('shake');
  }, 500); // Match animation duration
}

function startTimer() {
  const timerDisplay = document.getElementById('timerDisplay');
  
  // Display the current time immediately (important for restored states)
  const initialMinutes = Math.floor(gameState.timeRemaining / 60);
  const initialSeconds = gameState.timeRemaining % 60;
  timerDisplay.textContent = `${initialMinutes}:${initialSeconds.toString().padStart(2, '0')}`;
  
  console.log('Timer started with time remaining:', gameState.timeRemaining);
  
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
    
    // ========================================
    // 1. SAVE TO DAILY CHALLENGE SCORES
    // ========================================
    const dailyChallengeData = {
      score: score,
      correct_count: correctGuesses,
      time_taken: timeElapsed,
      completed: true
    };
    
    console.log('Daily Challenge data to save:', dailyChallengeData);
    
    const { data: dailyData, error: dailyError } = await supabase
      .from('daily_challenge_scores')
      .upsert({
        user_id: session.user.id,
        category_id: categoryId,
        played_date: todayString,
        ...dailyChallengeData
        }, {
    onConflict: 'user_id,category_id,played_date'
      })
      .select();
    
    if (dailyError) {
      console.error('❌ Error saving to daily_challenge_scores:', dailyError);
      alert('Failed to save your daily challenge score.');
    } else {
      console.log('✅ Daily Challenge score saved:', dailyData);
    }
    
    // ========================================
    // 2. SAVE/UPDATE TO TOP10 BEST SCORES
    // ========================================
    // Check if user has existing best score for this category
    const { data: existingBest } = await supabase
      .from('top10_best_scores')
      .select('score')
      .eq('user_id', session.user.id)
      .eq('category_id', categoryId)
      .maybeSingle();
    
    // Only save if this is a new record OR beats existing score
    if (!existingBest || score > existingBest.score) {
      const top10BestData = {
        user_id: session.user.id,
        category_id: categoryId,
        score: score,
        correct_count: correctGuesses,
        wrong_count: gameState.incorrectGuesses.length,
        time_remaining: gameState.timeRemaining
      };
      
      const { data: bestData, error: bestError } = await supabase
        .from('top10_best_scores')
        .upsert(top10BestData, {
          onConflict: 'user_id,category_id'
        })
        .select();
      
      if (bestError) {
        console.error('❌ Error saving to top10_best_scores:', bestError);
      } else {
        console.log('✅ Top 10 best score saved/updated:', bestData);
        if (!existingBest) {
          console.log('🎉 New personal best!');
        } else {
          console.log('🎉 Beat previous best of', existingBest.score);
        }
      }
    } else {
      console.log('ℹ️ Score did not beat existing best:', existingBest.score);
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
  // Read from the DOM since gameState might not be populated when viewing completed results
  const scoreElement = document.getElementById('finalScore');
  const accuracyElement = document.getElementById('finalAccuracy');
  const livesElement = document.getElementById('finalLives');
  
  const score = scoreElement ? scoreElement.textContent : '0';
  const accuracy = accuracyElement ? accuracyElement.textContent : '0/10 correct';
  const lives = livesElement ? livesElement.textContent : '❤️❤️❤️';
  
  const text = `🌍 GeoRanks - ${currentCategory.title}
Score: ${score} | ${accuracy}
Lives: ${lives}

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
document.addEventListener('DOMContentLoaded', initializeGame);
console.log('Event listener added for DOMContentLoaded');