// js/top10-game.js
export const CATEGORY_ID_MAP = {
  population: 1,
  gdp: 2,
  altitude: 3,
  forest: 4,
  coastline: 5,
  olympic: 6,
  cuisine: 7,
  worldcup: 8,
  landmass: 9,
  crimerate: 10,
  happiness: 11,
  passport: 12,
  beer: 13,
  nobelprize: 14,
  temperature: 15,
  precipitation: 16
};

export const top10Data = {
  population: {
    title: "Population",
    emoji: "👥",
    countries: [
      { name: "China", rank: 1, code: "china", flag: "china.png" },
      { name: "India", rank: 2, code: "india", flag: "india.png" },
      { name: "United States", rank: 3, code: "united-states", flag: "united-states.png" },
      { name: "Indonesia", rank: 4, code: "indonesia", flag: "indonesia.png" },
      { name: "Pakistan", rank: 5, code: "pakistan", flag: "pakistan.png" },
      { name: "Nigeria", rank: 6, code: "nigeria", flag: "nigeria.png" },
      { name: "Brazil", rank: 7, code: "brazil", flag: "brazil.png" },
      { name: "Bangladesh", rank: 8, code: "bangladesh", flag: "bangladesh.png" },
      { name: "Russia", rank: 9, code: "russia", flag: "russia.png" },
      { name: "Mexico", rank: 10, code: "mexico", flag: "mexico.png" }
    ]
  },

  gdp: {
    title: "GDP per Capita",
    emoji: "💰",
    countries: [
      { name: "Luxembourg", rank: 1, code: "luxembourg", flag: "luxembourg.png" },
      { name: "Ireland", rank: 2, code: "ireland", flag: "ireland.png" },
      { name: "Norway", rank: 3, code: "norway", flag: "norway.png" },
      { name: "Switzerland", rank: 4, code: "switzerland", flag: "switzerland.png" },
      { name: "Qatar", rank: 5, code: "qatar", flag: "qatar.png" },
      { name: "United States", rank: 6, code: "united-states", flag: "united-states.png" },
      { name: "Singapore", rank: 7, code: "singapore", flag: "singapore.png" },
      { name: "Denmark", rank: 8, code: "denmark", flag: "denmark.png" },
      { name: "Australia", rank: 9, code: "australia", flag: "australia.png" },
      { name: "Iceland", rank: 10, code: "iceland", flag: "iceland.png" }
    ]
  },

  landmass: {
    title: "Landmass",
    emoji: "🗺️",
    countries: [
      { name: "Russia", rank: 1, code: "russia", flag: "russia.png" },
      { name: "Canada", rank: 2, code: "canada", flag: "canada.png" },
      { name: "China", rank: 3, code: "china", flag: "china.png" },
      { name: "United States", rank: 4, code: "united-states", flag: "united-states.png" },
      { name: "Brazil", rank: 5, code: "brazil", flag: "brazil.png" },
      { name: "Australia", rank: 6, code: "australia", flag: "australia.png" },
      { name: "India", rank: 7, code: "india", flag: "india.png" },
      { name: "Argentina", rank: 8, code: "argentina", flag: "argentina.png" },
      { name: "Kazakhstan", rank: 9, code: "kazakhstan", flag: "kazakhstan.png" },
      { name: "Algeria", rank: 10, code: "algeria", flag: "algeria.png" }
    ]
  },

  nobelprize: {
    title: "Nobel Prizes",
    emoji: "🏅",
    countries: [
      { name: "United States", rank: 1, code: "united-states", flag: "united-states.png" },
      { name: "United Kingdom", rank: 2, code: "united-kingdom", flag: "united-kingdom.png" },
      { name: "Germany", rank: 3, code: "germany", flag: "germany.png" },
      { name: "France", rank: 4, code: "france", flag: "france.png" },
      { name: "Sweden", rank: 5, code: "sweden", flag: "sweden.png" },
      { name: "Japan", rank: 6, code: "japan", flag: "japan.png" },
      { name: "Russia", rank: 7, code: "russia", flag: "russia.png" },
      { name: "Canada", rank: 8, code: "canada", flag: "canada.png" },
      { name: "Switzerland", rank: 9, code: "switzerland", flag: "switzerland.png" },
      { name: "Netherlands", rank: 10, code: "netherlands", flag: "netherlands.png" }
    ]
  },

  temperature: {
    title: "Hottest Countries",
    emoji: "🌡️",
    countries: [
      { name: "United Arab Emirates", rank: 1, code: "united-arab-emirates", flag: "united-arab-emirates.png" },
      { name: "Djibouti", rank: 2, code: "djibouti", flag: "djibouti.png" },
      { name: "Gambia", rank: 3, code: "gambia", flag: "gambia.png" },
      { name: "Maldives", rank: 4, code: "maldives", flag: "maldives.png" },
      { name: "Guinea-Bissau", rank: 5, code: "guinea-bissau", flag: "guinea-bissau.png" },
      { name: "Singapore", rank: 6, code: "singapore", flag: "singapore.png" },
      { name: "Saint Kitts & Nevis", rank: 7, code: "saint-kitts-and-nevis", flag: "saint-kitts-and-nevis.png" },
      { name: "Thailand", rank: 8, code: "thailand", flag: "thailand.png" },
      { name: "Bahamas", rank: 9, code: "bahamas", flag: "bahamas.png" },
      { name: "Bangladesh", rank: 10, code: "bangladesh", flag: "bangladesh.png" }
    ]
  },

  precipitation: {
    title: "Rainfall",
    emoji: "🌧️",
    countries: [
      { name: "Micronesia", rank: 1, code: "micronesia", flag: "micronesia.png" },
      { name: "Palau", rank: 2, code: "palau", flag: "palau.png" },
      { name: "Fiji", rank: 3, code: "fiji", flag: "fiji.png" },
      { name: "Costa Rica", rank: 4, code: "costa-rica", flag: "costa-rica.png" },
      { name: "Papua New Guinea", rank: 5, code: "papua-new-guinea", flag: "papua-new-guinea.png" },
      { name: "Malaysia", rank: 6, code: "malaysia", flag: "malaysia.png" },
      { name: "Indonesia", rank: 7, code: "indonesia", flag: "indonesia.png" },
      { name: "Belize", rank: 8, code: "belize", flag: "belize.png" },
      { name: "Vanuatu", rank: 9, code: "vanuatu", flag: "vanuatu.png" },
      { name: "Philippines", rank: 10, code: "philippines", flag: "philippines.png" }
    ]
  },

  crimerate: {
    title: "Crime Rate",
    emoji: "🚨",
    countries: [
      { name: "Venezuela", rank: 1, code: "venezuela", flag: "venezuela.png" },
      { name: "Papua New Guinea", rank: 2, code: "papua-new-guinea", flag: "papua-new-guinea.png" },
      { name: "South Africa", rank: 3, code: "south-africa", flag: "south-africa.png" },
      { name: "Afghanistan", rank: 4, code: "afghanistan", flag: "afghanistan.png" },
      { name: "Honduras", rank: 5, code: "honduras", flag: "honduras.png" },
      { name: "Trinidad and Tobago", rank: 6, code: "trinidad-and-tobago", flag: "trinidad-and-tobago.png" },
      { name: "Guyana", rank: 7, code: "guyana", flag: "guyana.png" },
      { name: "El Salvador", rank: 8, code: "el-salvador", flag: "el-salvador.png" },
      { name: "Brazil", rank: 9, code: "brazil", flag: "brazil.png" },
      { name: "Jamaica", rank: 10, code: "jamaica", flag: "jamaica.png" }
    ]
  },

  happiness: {
    title: "Happiness Index",
    emoji: "😊",
    countries: [
      { name: "Finland", rank: 1, code: "finland", flag: "finland.png" },
      { name: "Denmark", rank: 2, code: "denmark", flag: "denmark.png" },
      { name: "Iceland", rank: 3, code: "iceland", flag: "iceland.png" },
      { name: "Sweden", rank: 4, code: "sweden", flag: "sweden.png" },
      { name: "Israel", rank: 5, code: "israel", flag: "israel.png" },
      { name: "Netherlands", rank: 6, code: "netherlands", flag: "netherlands.png" },
      { name: "Norway", rank: 7, code: "norway", flag: "norway.png" },
      { name: "Switzerland", rank: 8, code: "switzerland", flag: "switzerland.png" },
      { name: "Luxembourg", rank: 9, code: "luxembourg", flag: "luxembourg.png" },
      { name: "New Zealand", rank: 10, code: "new-zealand", flag: "new-zealand.png" }
    ]
  },

  passport: {
    title: "Most Powerful Passports",
    emoji: "🛂",
    countries: [
      { name: "Singapore", rank: 1, code: "singapore", flag: "singapore.png" },
      { name: "Japan", rank: 2, code: "japan", flag: "japan.png" },
      { name: "South Korea", rank: 3, code: "south-korea", flag: "south-korea.png" },
      { name: "Germany", rank: 4, code: "germany", flag: "germany.png" },
      { name: "Italy", rank: 5, code: "italy", flag: "italy.png" },
      { name: "Finland", rank: 6, code: "finland", flag: "finland.png" },
      { name: "Spain", rank: 7, code: "spain", flag: "spain.png" },
      { name: "Luxembourg", rank: 8, code: "luxembourg", flag: "luxembourg.png" },
      { name: "Sweden", rank: 9, code: "sweden", flag: "sweden.png" },
      { name: "France", rank: 10, code: "france", flag: "france.png" }
    ]
  },

  beer: {
    title: "Beer Consumption",
    emoji: "🍺",
    countries: [
      { name: "Czech Republic", rank: 1, code: "czech-republic", flag: "czech-republic.png" },
      { name: "Austria", rank: 2, code: "austria", flag: "austria.png" },
      { name: "Germany", rank: 3, code: "germany", flag: "germany.png" },
      { name: "Romania", rank: 4, code: "romania", flag: "romania.png" },
      { name: "Poland", rank: 5, code: "poland", flag: "poland.png" },
      { name: "Ireland", rank: 6, code: "ireland", flag: "ireland.png" },
      { name: "Spain", rank: 7, code: "spain", flag: "spain.png" },
      { name: "Croatia", rank: 8, code: "croatia", flag: "croatia.png" },
      { name: "Estonia", rank: 9, code: "estonia", flag: "estonia.png" },
      { name: "Slovenia", rank: 10, code: "slovenia", flag: "slovenia.png" }
    ]
  },

  altitude: {
    title: "Average Altitude",
    emoji: "⛰️",
    countries: [
      { name: "Bhutan", rank: 1, code: "bhutan", flag: "bhutan.png" },
      { name: "Nepal", rank: 2, code: "nepal", flag: "nepal.png" },
      { name: "Tajikistan", rank: 3, code: "tajikistan", flag: "tajikistan.png" },
      { name: "Kyrgyzstan", rank: 4, code: "kyrgyzstan", flag: "kyrgyzstan.png" },
      { name: "Lesotho", rank: 5, code: "lesotho", flag: "lesotho.png" },
      { name: "Andorra", rank: 6, code: "andorra", flag: "andorra.png" },
      { name: "Afghanistan", rank: 7, code: "afghanistan", flag: "afghanistan.png" },
      { name: "Chile", rank: 8, code: "chile", flag: "chile.png" },
      { name: "Armenia", rank: 9, code: "armenia", flag: "armenia.png" },
      { name: "China", rank: 10, code: "china", flag: "china.png" }
    ]
  },

  forest: {
    title: "Forest Area",
    emoji: "🌲",
    countries: [
      { name: "Russia", rank: 1, code: "russia", flag: "russia.png" },
      { name: "Brazil", rank: 2, code: "brazil", flag: "brazil.png" },
      { name: "Canada", rank: 3, code: "canada", flag: "canada.png" },
      { name: "United States", rank: 4, code: "united-states", flag: "united-states.png" },
      { name: "China", rank: 5, code: "china", flag: "china.png" },
      { name: "Democratic Republic of the Congo", rank: 6, code: "democratic-republic-of-the-congo", flag: "democratic-republic-of-the-congo.png" },
      { name: "Australia", rank: 7, code: "australia", flag: "australia.png" },
      { name: "Indonesia", rank: 8, code: "indonesia", flag: "indonesia.png" },
      { name: "Peru", rank: 9, code: "peru", flag: "peru.png" },
      { name: "India", rank: 10, code: "india", flag: "india.png" }
    ]
  },

  coastline: {
    title: "Coastline Length",
    emoji: "🌊",
    countries: [
      { name: "Canada", rank: 1, code: "canada", flag: "canada.png" },
      { name: "Indonesia", rank: 2, code: "indonesia", flag: "indonesia.png" },
      { name: "Norway", rank: 3, code: "norway", flag: "norway.png" },
      { name: "Russia", rank: 4, code: "russia", flag: "russia.png" },
      { name: "Philippines", rank: 5, code: "philippines", flag: "philippines.png" },
      { name: "Japan", rank: 6, code: "japan", flag: "japan.png" },
      { name: "Australia", rank: 7, code: "australia", flag: "australia.png" },
      { name: "United States", rank: 8, code: "united-states", flag: "united-states.png" },
      { name: "New Zealand", rank: 9, code: "new-zealand", flag: "new-zealand.png" },
      { name: "China", rank: 10, code: "china", flag: "china.png" }
    ]
  },

  olympic: {
    title: "Olympic Medals",
    emoji: "🥇",
    countries: [
      { name: "United States", rank: 1, code: "united-states", flag: "united-states.png" },
      { name: "United Kingdom", rank: 2, code: "united-kingdom", flag: "united-kingdom.png" },
      { name: "Germany", rank: 3, code: "germany", flag: "germany.png" },
      { name: "France", rank: 4, code: "france", flag: "france.png" },
      { name: "Italy", rank: 5, code: "italy", flag: "italy.png" },
      { name: "China", rank: 6, code: "china", flag: "china.png" },
      { name: "Sweden", rank: 7, code: "sweden", flag: "sweden.png" },
      { name: "Russia", rank: 8, code: "russia", flag: "russia.png" },
      { name: "Hungary", rank: 9, code: "hungary", flag: "hungary.png" },
      { name: "Australia", rank: 10, code: "australia", flag: "australia.png" }
    ]
  },

  cuisine: {
    title: "Cuisine Quality",
    emoji: "🍽️",
    countries: [
      { name: "Italy", rank: 1, code: "italy", flag: "italy.png" },
      { name: "France", rank: 2, code: "france", flag: "france.png" },
      { name: "Japan", rank: 3, code: "japan", flag: "japan.png" },
      { name: "Mexico", rank: 4, code: "mexico", flag: "mexico.png" },
      { name: "Thailand", rank: 5, code: "thailand", flag: "thailand.png" },
      { name: "India", rank: 6, code: "india", flag: "india.png" },
      { name: "China", rank: 7, code: "china", flag: "china.png" },
      { name: "Spain", rank: 8, code: "spain", flag: "spain.png" },
      { name: "Turkey", rank: 9, code: "turkey", flag: "turkey.png" },
      { name: "United States", rank: 10, code: "united-states", flag: "united-states.png" }
    ]
  },

  worldcup: {
    title: "World Cup Wins",
    emoji: "🏆",
    countries: [
      { name: "Brazil", rank: 1, code: "brazil", flag: "brazil.png" },
      { name: "Germany", rank: 2, code: "germany", flag: "germany.png" },
      { name: "Italy", rank: 3, code: "italy", flag: "italy.png" },
      { name: "Argentina", rank: 4, code: "argentina", flag: "argentina.png" },
      { name: "Uruguay", rank: 5, code: "uruguay", flag: "uruguay.png" },
      { name: "France", rank: 6, code: "france", flag: "france.png" },
      { name: "England", rank: 7, code: "england", flag: "england.png" },
      { name: "Spain", rank: 8, code: "spain", flag: "spain.png" },
      { name: "Netherlands", rank: 9, code: "netherlands", flag: "netherlands.png" },
      { name: "Croatia", rank: 10, code: "croatia", flag: "croatia.png" }
    ]
  }
};


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
  gameState.categoryKey = getTodayCategory();
  gameState.categoryData = top10Data[gameState.categoryKey];
  
  if (!gameState.categoryData) {
    alert('Invalid category!');
    window.location.href = 'index.html';
    return;
  }
  
  // Check if user already played today (only for signed-in users)
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
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
  }
  
  // Set category title
  categoryTitle.textContent = `TOP 10: ${gameState.categoryData.title}`;
  
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
    
    return `
      <div class="${classes}" data-country="${country.name}" data-code="${country.code}">
        <img src="https://flagcdn.com/w40/${country.code.toLowerCase()}.png" 
             alt="${country.name}" 
             class="country-flag"
             onerror="this.src='assets/placeholder-flag.png'" />
        <span class="country-name">${country.name}</span>
      </div>
    `;
  }).join('');
  
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
    <div class="rank-number">#${rank}</div>
    <img src="https://flagcdn.com/w40/${countryCode.toLowerCase()}.png" 
         alt="${countryName}" 
         class="rank-flag"
         onerror="this.src='assets/placeholder-flag.png'" />
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
        <img src="https://flagcdn.com/w40/${country.code.toLowerCase()}.png" 
             alt="${country.name}" 
             class="table-flag"
             onerror="this.src='assets/placeholder-flag.png'" />
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
  
  const text = `🎮 GeoRanks Top 10
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