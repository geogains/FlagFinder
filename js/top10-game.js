// js/top10-game.js
import { supabase } from './supabase-client.js';
import { top10Data, CATEGORY_ID_MAP } from './top10-data.js';
import { allCountries } from './countries-list.js';

// Game state
let gameState = {
  categoryKey: null,
  categoryData: null,
  lives: 3,
  timeRemaining: 120, // 2 minutes in seconds
  correctGuesses: [],
  wrongGuesses: [],
  guessedCountries: new Set(),
  gameEnded: false,
  timerInterval: null,
  startTime: null
};

// DOM elements
const searchInput = document.getElementById('searchInput');
const searchDropdown = document.getElementById('searchDropdown');
const rankingsGrid = document.getElementById('rankingsGrid');
const categoryTitle = document.getElementById('categoryTitle');
const timerDisplay = document.getElementById('timerDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const resultsOverlay = document.getElementById('resultsOverlay');

// Get today's category from URL parameter
function getTodayCategory() {
  const urlParams = new URLSearchParams(window.location.search);
  const category = urlParams.get('category');
  
  if (!category || !top10Data[category]) {
    // Default to population if no valid category
    return 'population';
  }
  
  return category;
}

// Initialize game
async function initGame() {
  // Check if user is signed in FIRST
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session || !session.user) {
    // User not signed in - show modal
    showSignInRequiredModal();
    return;
  }
  
  gameState.categoryKey = getTodayCategory();
  gameState.categoryData = top10Data[gameState.categoryKey];
  
  if (!gameState.categoryData) {
    alert('Invalid category!');
    window.location.href = 'index.html';
    return;
  }
  
  // Check if user already played today
  const today = new Date().toISOString().split('T')[0];
  const categoryId = CATEGORY_ID_MAP[gameState.categoryKey];
  
  const { data: existingScore } = await supabase
    .from('top10_scores')
    .select('score, correct_count, created_at')
    .eq('user_id', session.user.id)
    .eq('category_id', categoryId)
    .eq('challenge_date', today)
    .maybeSingle();
  
  if (existingScore) {
    // User already played today - show their score
    showAlreadyPlayedMessage(existingScore);
    return;
  }
  
  // Set category title
  categoryTitle.textContent = `NAME THE TOP 10 COUNTRIES RANKED BY: ${gameState.categoryData.titletoUpperCase()}`;
  
  // Render empty ranking slots
  renderRankings();
  
  // Start timer
  startTimer();
  
  // Setup search
  setupSearch();
  
  // Focus search input
  searchInput.focus();
  
  console.log('Game initialized:', gameState.categoryKey);
}

// Show sign-in required modal
function showSignInRequiredModal() {
  const container = document.querySelector('.game-container');
  
  container.innerHTML = `
    <div style="text-align: center; padding: 40px 20px;">
      <div style="font-size: 4rem; margin-bottom: 20px;">🔒</div>
      <h2 style="color: #0d315a; margin-bottom: 10px;">Sign In Required</h2>
      <p style="font-size: 1.1rem; color: #6b7280; margin-bottom: 30px;">
        Please sign in to play the Daily Challenge
      </p>
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <button onclick="window.location.href='auth.html'" 
                style="padding: 12px 24px; background: linear-gradient(135deg, #ff9770, #ff6f61); 
                       color: white; border: none; border-radius: 10px; font-weight: 600; 
                       font-size: 1rem; cursor: pointer; font-family: 'Poppins', sans-serif;">
          Sign In / Create Account
        </button>
        <button onclick="window.location.href='index.html'" 
                style="padding: 12px 24px; background: #e5e7eb; color: #374151; 
                       border: none; border-radius: 10px; font-weight: 600; 
                       font-size: 1rem; cursor: pointer; font-family: 'Poppins', sans-serif;">
          Back Home
        </button>
      </div>
    </div>
  `;
}

// Show message for users who already played today
function showAlreadyPlayedMessage(scoreData) {
  const container = document.querySelector('.game-container');
  
  const timeUntilMidnight = getTimeUntilMidnightUTC();
  
  container.innerHTML = `
    <div style="text-align: center; padding: 40px 20px;">
      <div style="font-size: 4rem; margin-bottom: 20px;">✅</div>
      <h2 style="color: #0d315a; margin-bottom: 10px;">You've Already Played Today!</h2>
      <p style="font-size: 1.2rem; color: #6b7280; margin-bottom: 30px;">
        Your score: <strong style="color: #10b981;">${scoreData.score}</strong> 
        (${scoreData.correct_count}/10 correct)
      </p>
      <p style="font-size: 1rem; color: #6b7280; margin-bottom: 30px;">
        Next challenge available in: <strong>${timeUntilMidnight}</strong>
      </p>
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <button onclick="window.location.href='categories.html'" 
                style="padding: 12px 24px; background: linear-gradient(135deg, #ff9770, #ff6f61); 
                       color: white; border: none; border-radius: 10px; font-weight: 600; 
                       font-size: 1rem; cursor: pointer; font-family: 'Poppins', sans-serif;">
          Play Classic Mode
        </button>
        <button onclick="window.location.href='leaderboard.html'" 
                style="padding: 12px 24px; background: #e5e7eb; color: #374151; 
                       border: none; border-radius: 10px; font-weight: 600; 
                       font-size: 1rem; cursor: pointer; font-family: 'Poppins', sans-serif;">
          View Leaderboard
        </button>
        <button onclick="window.location.href='index.html'" 
                style="padding: 12px 24px; background: #e5e7eb; color: #374151; 
                       border: none; border-radius: 10px; font-weight: 600; 
                       font-size: 1rem; cursor: pointer; font-family: 'Poppins', sans-serif;">
          Back Home
        </button>
      </div>
    </div>
  `;
}

// Get time until midnight UTC
function getTimeUntilMidnightUTC() {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0
  ));
  
  const diff = midnight - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${hours}h ${minutes}m`;
}

// Render ranking slots
function renderRankings() {
  rankingsGrid.innerHTML = '';
  
  for (let i = 1; i <= 10; i++) {
    const slot = document.createElement('div');
    slot.className = 'rank-slot';
    slot.id = `rank-${i}`;
    
    slot.innerHTML = `
      <div class="rank-number">${i}</div>
      <div class="rank-country rank-empty"></div>
    `;
    
    rankingsGrid.appendChild(slot);
  }
}

// Start timer
function startTimer() {
  gameState.startTime = Date.now();
  
  gameState.timerInterval = setInterval(() => {
    gameState.timeRemaining--;
    
    const minutes = Math.floor(gameState.timeRemaining / 60);
    const seconds = gameState.timeRemaining % 60;
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Check for time out
    if (gameState.timeRemaining <= 0) {
      endGame('timeout');
    }
    
    // Warning color when under 30 seconds
    if (gameState.timeRemaining <= 30) {
      timerDisplay.style.color = '#ef4444';
    }
  }, 1000);
}

// Setup search functionality
function setupSearch() {
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();
    
    if (query.length === 0) {
      searchDropdown.classList.remove('active');
      return;
    }
    
    // Filter countries
    const matches = allCountries.filter(country => 
      country.name.toLowerCase().includes(query)
    );
    
    // Render dropdown
    renderDropdown(matches);
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      searchDropdown.classList.remove('active');
    }
  });
}

// Render search dropdown
function renderDropdown(countries) {
  if (countries.length === 0) {
    searchDropdown.innerHTML = '<div style="padding: 12px; color: #9ca3af;">No countries found</div>';
    searchDropdown.classList.add('active');
    return;
  }
  
  searchDropdown.innerHTML = countries.map(country => {
    const isGuessed = gameState.guessedCountries.has(country.name);
    const classes = isGuessed ? 'country-option disabled' : 'country-option';
    
    // Find matching country in top10Data to get correct flag filename
    const flagCode = getCountryFlagCode(country.name);
    
    return `
      <div class="${classes}" data-country="${country.name}" data-code="${flagCode}">
        <img src="flags/${flagCode}.png" 
             alt="${country.name}" 
             class="country-flag" />
        <span class="country-name">${country.name}</span>
      </div>
    `;
  }).join('');
  
// Helper function to get flag code from country name
function getCountryFlagCode(countryName) {
  // Search all categories for matching country
  for (const category of Object.values(top10Data)) {
    const country = category.countries.find(c => c.name === countryName);
    if (country) return country.code;
  }
  // Fallback: convert name to lowercase-hyphenated
  return countryName.toLowerCase().replace(/\s+/g, '-');
}
  
  searchDropdown.classList.add('active');
  
  // Add click handlers
  searchDropdown.querySelectorAll('.country-option:not(.disabled)').forEach(option => {
    option.addEventListener('click', () => {
      const countryName = option.dataset.country;
      const countryCode = option.dataset.code;
      handleGuess(countryName, countryCode);
    });
  });
}

// Handle country guess
function handleGuess(countryName, countryCode) {
  if (gameState.gameEnded) return;
  if (gameState.guessedCountries.has(countryName)) return;
  
  // Mark as guessed
  gameState.guessedCountries.add(countryName);
  
  // Check if correct
  const correctCountry = gameState.categoryData.countries.find(
    c => c.name === countryName
  );
  
  if (correctCountry) {
    // Correct guess!
    gameState.correctGuesses.push({
      rank: correctCountry.rank,
      name: countryName,
      code: countryCode
    });
    
    // Update the ranking slot
    updateRankSlot(correctCountry.rank, countryName, countryCode);
    
    // Check for completion
    if (gameState.correctGuesses.length === 10) {
      endGame('completed');
    }
  } else {
    // Wrong guess
    gameState.wrongGuesses.push({ name: countryName, code: countryCode });
    gameState.lives--;
    
    // Update lives display
    updateLives();
    
    // Check for game over
    if (gameState.lives === 0) {
      endGame('lives');
    }
  }
  
  // Clear search and refocus
  searchInput.value = '';
  searchDropdown.classList.remove('active');
  searchInput.focus();
}

// Update rank slot when correct
function updateRankSlot(rank, countryName, countryCode) {
  const slot = document.getElementById(`rank-${rank}`);
  
  slot.classList.add('correct');
  slot.innerHTML = `
    <div class="rank-number">${rank}</div>
    <img src="flags/${countryCode}.png" 
         alt="${countryName}" 
         class="rank-flag" />
    <div class="rank-country">${countryName}</div>
  `;
}

// Update lives display
function updateLives() {
  const hearts = [];
  for (let i = 0; i < 3; i++) {
    hearts.push(i < gameState.lives ? '❤️' : '🤍');
  }
  livesDisplay.innerHTML = hearts.map(h => `<span>${h}</span>`).join('');
}

// End game
function endGame(reason) {
  if (gameState.gameEnded) return;
  
  gameState.gameEnded = true;
  clearInterval(gameState.timerInterval);
  
  // Disable search
  searchInput.disabled = true;
  searchDropdown.classList.remove('active');
  
  // Calculate score
  const score = calculateScore();
  
  // Save score to database
  saveScore(score, reason === 'completed');
  
  // Show results
  showResults(score, reason);
}

// Calculate score
function calculateScore() {
  const correctPoints = gameState.correctGuesses.length * 10;
  const wrongPenalty = gameState.wrongGuesses.length * 10;
  const timeBonus = gameState.timeRemaining * 2;
  const completionBonus = gameState.correctGuesses.length === 10 ? 50 : 0;
  
  const total = correctPoints - wrongPenalty + timeBonus + completionBonus;
  
  return Math.max(0, total); // Can't be negative
}

// Save score to database
async function saveScore(score, completed) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      console.log('User not logged in, score not saved');
      return;
    }
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    
    // Get category ID
    const categoryId = CATEGORY_ID_MAP[gameState.categoryKey];
    
    const { error } = await supabase
      .from('top10_scores')
      .insert({
        user_id: session.user.id,
        category_id: categoryId,
        challenge_date: today,
        score: score,
        correct_count: gameState.correctGuesses.length,
        wrong_count: gameState.wrongGuesses.length,
        time_remaining: gameState.timeRemaining,
        completed: completed
      });
    
    if (error) {
      console.error('Error saving score:', error);
    } else {
      console.log('Score saved successfully!');
    }
  } catch (err) {
    console.error('Unexpected error saving score:', err);
  }
}

// Show results overlay
function showResults(score, reason) {
  const resultsEmoji = document.getElementById('resultsEmoji');
  const resultsTitle = document.getElementById('resultsTitle');
  const resultsCategory = document.getElementById('resultsCategory');
  const finalScore = document.getElementById('finalScore');
  const finalLives = document.getElementById('finalLives');
  const finalTime = document.getElementById('finalTime');
  const finalAccuracy = document.getElementById('finalAccuracy');
  const resultsTable = document.getElementById('resultsTable');
  const incorrectSection = document.getElementById('incorrectSection');
  const incorrectList = document.getElementById('incorrectList');
  
  // Set emoji and title based on result
  if (reason === 'completed') {
    resultsEmoji.textContent = '🎉';
    resultsTitle.textContent = 'Perfect!';
  } else if (gameState.correctGuesses.length >= 7) {
    resultsEmoji.textContent = '👏';
    resultsTitle.textContent = 'Great Job!';
  } else if (gameState.correctGuesses.length >= 4) {
    resultsEmoji.textContent = '👍';
    resultsTitle.textContent = 'Good Effort!';
  } else {
    resultsEmoji.textContent = '😢';
    resultsTitle.textContent = "Time's Up!";
  }
  
  // Set category
  resultsCategory.textContent = gameState.categoryData.title;
  
  // Set stats
  finalScore.textContent = score;
  
  const hearts = [];
  for (let i = 0; i < 3; i++) {
    hearts.push(i < gameState.lives ? '❤️' : '🤍');
  }
  finalLives.textContent = hearts.join('');
  
  const elapsedSeconds = 120 - gameState.timeRemaining;
  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const elapsedSecs = elapsedSeconds % 60;
  finalTime.textContent = `${elapsedMinutes}:${elapsedSecs.toString().padStart(2, '0')} / 2:00`;
  
  finalAccuracy.textContent = `${gameState.correctGuesses.length}/10 correct`;
  
  // Build results table
  let tableHTML = '';
  gameState.categoryData.countries.forEach(country => {
    const isCorrect = gameState.correctGuesses.some(g => g.rank === country.rank);
    const rowClass = isCorrect ? 'table-row correct' : 'table-row';
    
    tableHTML += `
      <div class="${rowClass}">
        <div class="table-rank">${country.rank}</div>
        <img src="flags/${country.code}.png" 
             alt="${country.name}" 
             class="table-flag" />
        <div class="table-country">${country.name}</div>
        <div>${isCorrect ? '✅' : '❌'}</div>
      </div>
    `;
  });
  resultsTable.innerHTML = tableHTML;
  
  // Show incorrect guesses if any
  if (gameState.wrongGuesses.length > 0) {
    incorrectSection.style.display = 'block';
    incorrectList.innerHTML = gameState.wrongGuesses.map(guess => `
      <div class="incorrect-item">
        <span>❌</span>
        <span>${guess.name}</span>
      </div>
    `).join('');
  }
  
  // Setup Play Classic button
  const playClassicBtn = document.getElementById('playClassicBtn');
  if (playClassicBtn) {
    playClassicBtn.onclick = () => {
      window.location.href = 'categories.html';
    };
  }
  
  // Show overlay
  resultsOverlay.classList.add('active');
  
  // Auto-scroll to center results after a brief delay
  setTimeout(() => {
    resultsOverlay.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
}

// Share results
window.shareResults = function() {
  const score = calculateScore();
  const today = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  
  const text = `🌍 GeoRanks Top 10
📅 ${today}
${gameState.categoryData.emoji} ${gameState.categoryData.title}

Score: ${score} pts
✅ ${gameState.correctGuesses.length}/10 correct
⏱️ Time: ${Math.floor((120 - gameState.timeRemaining) / 60)}:${((120 - gameState.timeRemaining) % 60).toString().padStart(2, '0')}

Play at www.geo-ranks.com`;

  // Copy to clipboard
  navigator.clipboard.writeText(text).then(() => {
    alert('✅ Results copied to clipboard!');
  }).catch(() => {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('✅ Results copied to clipboard!');
  });
};

// Initialize game on load
initGame();