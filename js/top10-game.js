// js/top10-game.js
import { top10Data, CATEGORY_ID_MAP } from './top10-data.js';

// Get category from URL or default to population
const params = new URLSearchParams(window.location.search);
const categoryKey = params.get('mode') || 'population';
const currentCategory = top10Data[categoryKey] || top10Data.population;

// Game state
let gameState = {
  countries: [...currentCategory.countries],
  guessedCountries: new Set(),
  lives: 3,
  score: 0,
  timeRemaining: 120, // 2 minutes
  incorrectGuesses: [],
  startTime: Date.now()
};

// Initialize game
function initGame() {
  // Set title
  const titleText = `NAME THE TOP 10 COUNTRIES RANKED BY: ${currentCategory.title.toUpperCase()}`;
  document.getElementById('categoryTitle').textContent = titleText;
  
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
}

function buildSearchDropdown() {
  const dropdown = document.getElementById('searchDropdown');
  dropdown.innerHTML = '';
  
  // Sort alphabetically for easier finding
  const sortedCountries = [...currentCategory.countries].sort((a, b) => 
    a.name.localeCompare(b.name)
  );
  
  sortedCountries.forEach(country => {
    const option = document.createElement('div');
    option.className = 'country-option';
    option.dataset.countryCode = country.code;
    option.innerHTML = `
      <img src="assets/flags/${country.flag}" alt="${country.name}" class="country-flag">
      <span class="country-name">${country.name}</span>
    `;
    option.addEventListener('click', () => selectCountry(country));
    dropdown.appendChild(option);
  });
}

function setupSearch() {
  const searchInput = document.getElementById('searchInput');
  const dropdown = document.getElementById('searchDropdown');
  
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (searchTerm === '') {
      dropdown.classList.remove('active');
      return;
    }
    
    const options = dropdown.querySelectorAll('.country-option');
    let hasVisibleOptions = false;
    
    options.forEach(option => {
      const countryName = option.querySelector('.country-name').textContent.toLowerCase();
      const matches = countryName.includes(searchTerm);
      option.style.display = matches ? 'flex' : 'none';
      if (matches) hasVisibleOptions = true;
    });
    
    dropdown.classList.toggle('active', hasVisibleOptions);
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      dropdown.classList.remove('active');
    }
  });
}

function selectCountry(country) {
  // Check if already guessed
  if (gameState.guessedCountries.has(country.code)) {
    return;
  }
  
  // Mark as guessed
  gameState.guessedCountries.add(country.code);
  
  // Disable in dropdown
  const option = document.querySelector(`[data-country-code="${country.code}"]`);
  if (option) {
    option.classList.add('disabled');
  }
  
  // Clear search
  document.getElementById('searchInput').value = '';
  document.getElementById('searchDropdown').classList.remove('active');
  
  // Check if correct
  const isCorrect = country.rank >= 1 && country.rank <= 10;
  
  if (isCorrect) {
    // Place in correct slot with flag and data value
    const slot = document.querySelector(`[data-rank="${country.rank}"]`);
    slot.classList.add('correct');
    
    // Format the value based on category
    const formattedValue = formatValue(country.value, currentCategory.unit);
    
    slot.innerHTML = `
      <img src="assets/flags/${country.flag}" alt="${country.name}" class="rank-flag">
      <span class="rank-data">${formattedValue}</span>
    `;
    
    gameState.score += 10;
    
    // Check for win
    if (gameState.guessedCountries.size === 10) {
      setTimeout(() => endGame(true), 500);
    }
  } else {
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

function endGame(won) {
  // Clear timer
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
  }
  
  // Calculate final stats
  const timeElapsed = 120 - gameState.timeRemaining;
  const correctGuesses = gameState.guessedCountries.size;
  
  // Show results overlay
  showResults(won, correctGuesses, timeElapsed);
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
    const isGuessed = gameState.guessedCountries.has(country.code);
    const row = document.createElement('div');
    row.className = `table-row ${isGuessed ? 'correct' : ''}`;
    
    const formattedValue = formatValue(country.value, currentCategory.unit);
    
    row.innerHTML = `
      <span class="table-rank">#${country.rank}</span>
      <img src="assets/flags/${country.flag}" alt="${country.name}" class="table-flag">
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
