// js/vs-game.js
import soundManager from './sound-manager.js';
import { categoriesConfig, CATEGORY_ID_MAP } from './categories-config.js';
import { supabase } from './supabase-client.js';

// Initialize sound manager
const SOUND_MAP = {
  'correct': '/sounds/correct.mp3',
  'wrong': '/sounds/wrong.mp3',
   'perfect': '/sounds/perfect.mp3',
  'tryagain': '/sounds/tryagain.mp3',
  'pop': '/sounds/pop.mp3'
};

window.addEventListener("pointerdown", () => soundManager.unlock(), { once: true });

soundManager.init(SOUND_MAP).then(() => {
  console.log('✅ Sounds loaded for VS mode');
});

console.log('VS game script loaded');

// Get category from URL
const params = new URLSearchParams(window.location.search);
const categoryKey = params.get('mode') || 'landmass';
const isDailyChallenge = params.get('daily') === 'true';
const categoryConfig = categoriesConfig[categoryKey];

if (!categoryConfig) {
  console.error('Invalid category:', categoryKey);
  alert('Invalid category selected!');
  window.location.href = 'index.html';
}

const categoryId = CATEGORY_ID_MAP[categoryKey];

console.log('VS Mode - Category:', categoryKey, categoryConfig);
console.log('Is Daily Challenge:', isDailyChallenge);

// Game state
let gameState = {
  score: 0,
  correct: 0,
  incorrect: 0,
  lives: 3,
  timeRemaining: 120, // 2 minutes
  timerInterval: null,
  isProcessing: false, // Prevent multiple clicks during transition
  isGameOver: false, // Prevent multiple endGame calls
  countries: [], // Will be loaded from category file
  recentCountries: [] // Track recently used countries to avoid repetition
};

// Load category data and initialize game
async function loadCategoryData() {
  try {
    console.log('Loading category data from:', `./categories/${categoryConfig.dataFile}.js`);
    
    // Dynamically import the category data
    const module = await import(`./categories/${categoryConfig.dataFile}.js`);
    const data = module[categoryConfig.dataKey];
    
    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid category data format');
    }
    
    console.log('Category data loaded:', data.length, 'countries');
 
    // Transform data to include flag path and extract value
gameState.countries = data.map(country => {
  let value = country[categoryConfig.valueField];
  
  // Convert population to millions if needed - ALWAYS convert, not just for large numbers
  if (categoryConfig.convertToMillions) {
    value = parseFloat((value / 1000000).toFixed(3)); // Use 3 decimals for better precision on small countries
  }
  
  return {
    name: country.name,
    code: country.code,
    flag: `flags/${country.code}.png`,
    value: value,
    highestPointName: country.highestPointName,        // For altitude
    tallestBuildingName: country.tallestBuildingName,  // For tallest buildings
    riverName: country.riverName                       // For longest rivers
  };
});
    
    console.log('Transformed countries:', gameState.countries.slice(0, 3));
    
    // Initialize game
    initGame();
    
  } catch (error) {
    console.error('Error loading category data:', error);
    alert('Failed to load category data. Please try again.');
    window.location.href = 'index.html';
  }
}

// Initialize game
function initGame() {
  console.log('Initializing VS game...');
  
  window.plausible('game_started', { props: { mode: 'vs', category: categoryKey } });

  // Set category title
  document.getElementById('categoryTitle').textContent = categoryConfig.questionText;
  
  // Start timer
  startTimer();
  
  // Load first round
  loadNewRound();
  
  console.log('Game initialized successfully');
}

// Start the countdown timer
function startTimer() {
  const timerDisplay = document.getElementById('timerDisplay');
  
  gameState.timerInterval = setInterval(() => {
    gameState.timeRemaining--;
    
    const minutes = Math.floor(gameState.timeRemaining / 60);
    const seconds = gameState.timeRemaining % 60;
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    // Warning color when under 30 seconds
    if (gameState.timeRemaining <= 30) {
      timerDisplay.style.color = '#ef4444';
    }
    
    if (gameState.timeRemaining <= 0) {
      clearInterval(gameState.timerInterval);
      if (!gameState.isGameOver) {
        console.log('⏰ Time ran out - ending game');
        endGame();
      }
    }
  }, 1000);
}

// Update lives display
function updateLives() {
  const livesDisplay = document.getElementById('livesDisplay');
  const maxLives = 3;
  const redHearts = '❤️'.repeat(gameState.lives);
  const whiteHearts = '🤍'.repeat(maxLives - gameState.lives);
  livesDisplay.innerHTML = whiteHearts + redHearts;
  
  // Trigger shake animation
  livesDisplay.classList.add('shake');
  setTimeout(() => {
    livesDisplay.classList.remove('shake');
  }, 500);
}

// Animate score with count-up effect
function animateScoreCountUp(points) {
  const scoreValueElement = document.getElementById('scoreValue');
  const startScore = gameState.score;
  const endScore = startScore + points;
  const duration = 400; // 400ms for count-up
  const frameRate = 1000 / 60; // 60fps
  const totalFrames = Math.round(duration / frameRate);
  const increment = points / totalFrames;
  
  let currentFrame = 0;
  
  const counter = setInterval(() => {
    currentFrame++;
    gameState.score = Math.round(startScore + (increment * currentFrame));
    scoreValueElement.textContent = gameState.score;
    
    if (currentFrame >= totalFrames) {
      clearInterval(counter);
      gameState.score = endScore; // Ensure exact final value
      scoreValueElement.textContent = endScore;
    }
  }, frameRate);
}

// Load a new round with two random countries
function loadNewRound() {
  console.log('Loading new round...');
  
  // Reset processing flag
  gameState.isProcessing = false;
  
  // Get two random unique countries
  const [country1, country2] = getTwoRandomCountries();
  
  // Update option 1
  const flag1 = document.getElementById('flag1');
  flag1.src = country1.flag;
  flag1.alt = country1.name;
  document.getElementById('name1').textContent = country1.name;
  document.getElementById('value1').textContent = '';
  document.getElementById('value1').classList.remove('show');
  
  // Update option 2
  const flag2 = document.getElementById('flag2');
  flag2.src = country2.flag;
  flag2.alt = country2.name;
  document.getElementById('name2').textContent = country2.name;
  document.getElementById('value2').textContent = '';
  document.getElementById('value2').classList.remove('show');
  
  // Store country data in option elements
  document.getElementById('option1').dataset.value = country1.value;
  document.getElementById('option1').dataset.country = country1.name;
  document.getElementById('option1').dataset.buildingName = country1.tallestBuildingName || '';
  document.getElementById('option1').dataset.mountainName = country1.highestPointName || '';
  document.getElementById('option1').dataset.riverName = country1.riverName || '';
  document.getElementById('option2').dataset.value = country2.value;
  document.getElementById('option2').dataset.country = country2.name;
  document.getElementById('option2').dataset.buildingName = country2.tallestBuildingName || '';
  document.getElementById('option2').dataset.mountainName = country2.highestPointName || '';
  document.getElementById('option2').dataset.riverName = country2.riverName || '';
  
  // Get country options (not flags, but the wrapper divs)
  const option1 = document.getElementById('option1');
  const option2 = document.getElementById('option2');
  
  // Add click handlers to options
  option1.onclick = () => handleSelection(1);
  option2.onclick = () => handleSelection(2);
  
  console.log('Round loaded:', country1.name, 'vs', country2.name);
}

// Get two random unique countries with smart repetition avoidance
function getTwoRandomCountries() {
  const available = [...gameState.countries];
  
  // Track recently used countries (keep last 20 to avoid repetition in small sessions)
  if (!gameState.recentCountries) {
    gameState.recentCountries = [];
  }
  
  // Filter out recently used countries if we have enough alternatives
  let filtered = available.filter(c => !gameState.recentCountries.includes(c.name));
  
  // If we filtered out too many, just use all countries
  if (filtered.length < 10) {
    filtered = available;
  }
  
  // Shuffle array using Fisher-Yates
  for (let i = filtered.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
  }
  
 // Get first two countries with DIFFERENT values (no ties)
let country1 = filtered[0];
let country2 = null;

// Find a second country with a different value than country1
for (let i = 1; i < filtered.length; i++) {
  if (filtered[i].value !== country1.value) {
    country2 = filtered[i];
    break;
  }
}

// Fallback: if all remaining have same value, just use the second one
if (!country2) {
  country2 = filtered[1];
}
  
  // Add to recent countries list
  gameState.recentCountries.push(country1.name, country2.name);
  
  // Keep only last 20 countries (about 10 rounds)
  if (gameState.recentCountries.length > 20) {
    gameState.recentCountries = gameState.recentCountries.slice(-20);
  }
  
  return [country1, country2];
}

// Handle country selection
function handleSelection(optionNumber) {
  if (gameState.isProcessing) return; // Prevent multiple clicks
  gameState.isProcessing = true;
  
  const selectedOption = document.getElementById(`option${optionNumber}`);
  const otherNumber = optionNumber === 1 ? 2 : 1;
  const otherOption = document.getElementById(`option${otherNumber}`);
  
  console.log('Selection made:', selectedOption.dataset.country);
  
  // Disable both options
  selectedOption.classList.add('disabled');
  otherOption.classList.add('disabled');
  
  // Get values
  const selectedValue = parseFloat(selectedOption.dataset.value);
  const otherValue = parseFloat(otherOption.dataset.value);
  
  // Determine if correct
  // For "poorest GDP" category, LOWER values win (inverted logic)
  const isCorrect = categoryKey === 'poorestgdp' 
    ? selectedValue <= otherValue  // Lower is better
    : selectedValue >= otherValue; // Higher is better (normal)
  
  // Show values with animation
  const value1Element = document.getElementById('value1');
  const value2Element = document.getElementById('value2');
  const option1Element = document.getElementById('option1');
  const option2Element = document.getElementById('option2');
  const country1Value = parseFloat(option1Element.dataset.value);
  const country2Value = parseFloat(option2Element.dataset.value);
  const country1Data = {
    tallestBuildingName: option1Element.dataset.buildingName,
    highestPointName: option1Element.dataset.mountainName,
    riverName: option1Element.dataset.riverName
  };
  const country2Data = {
    tallestBuildingName: option2Element.dataset.buildingName,
    highestPointName: option2Element.dataset.mountainName,
    riverName: option2Element.dataset.riverName
  };
  
  value1Element.innerHTML = formatValue(country1Value, categoryConfig.unit, country1Data);
  value2Element.innerHTML = formatValue(country2Value, categoryConfig.unit, country2Data);
  
  setTimeout(() => {
    value1Element.classList.add('show');
    value2Element.classList.add('show');
  }, 100);
  
  if (isCorrect) {
    // Correct answer - only animate and border the selected flag
    selectedOption.classList.add('correct');
    soundManager.play('correct');
    gameState.correct++;
    animateScoreCountUp(100); // Count-up animation!
    console.log('✅ Correct!');
  } else {
    // Incorrect answer - only animate and border the selected flag in red
    // DO NOT show which one was correct - no green border on other flag
    selectedOption.classList.add('incorrect');
    soundManager.play('wrong');
    gameState.incorrect++;
    gameState.lives--;
    updateLives();
    console.log('❌ Incorrect! Lost a life.');
    
    // Check if game over (no lives)
    if (gameState.lives === 0) {
      setTimeout(() => {
        if (!gameState.isGameOver) {
          console.log('💔 No lives left - ending game');
          clearInterval(gameState.timerInterval);
          endGame();
        }
      }, 2000);
      return;
    }
  }
  
  // Show result for 1.5 seconds, then clean transition
setTimeout(() => {
  const battle = document.getElementById('vsBattle');
  const option1 = document.getElementById('option1');
  const option2 = document.getElementById('option2');
  const flag1 = document.getElementById('flag1');
  const flag2 = document.getElementById('flag2');
  
  // Fade entire container to black
  battle.style.transition = 'opacity 0.25s ease';
  battle.style.opacity = '0';
  
  // After fade, clean up
  setTimeout(() => {
    // CRITICAL FIX: Clear image sources FIRST to prevent flash
    flag1.src = '';
    flag2.src = '';
    
    option1.classList.remove('correct', 'incorrect', 'disabled');
    option2.classList.remove('correct', 'incorrect', 'disabled');
    
    loadNewRound();
    
    // Wait for images to load before fading back in
    const img1 = new Image();
    const img2 = new Image();
    let loadedCount = 0;
    
    const checkBothLoaded = () => {
      loadedCount++;
      if (loadedCount === 2) {
        // Both images loaded, now fade in
        setTimeout(() => {
          battle.style.opacity = '1';
        }, 50);
      }
    };
    
    img1.onload = checkBothLoaded;
    img2.onload = checkBothLoaded;
    img1.onerror = checkBothLoaded; // Handle errors gracefully
    img2.onerror = checkBothLoaded;
    
    img1.src = flag1.src;
    img2.src = flag2.src;
  }, 250);
}, 1500);
}

// Format value with proper units and commas
function formatValue(value, unit, country = null) {
  // Debug logging for all calls
  console.log('VS formatValue called:', { value, unit, country: country?.name });
  
  let formatted;
  
  // Special handling for tallest building - show building name underneath
  // Check BEFORE normalization since we need exact case
  if (unit === 'm' && country && country.tallestBuildingName) {
    formatted = `${value.toLocaleString()} m<br><span style="font-size: 0.85em; opacity: 0.8;">${country.tallestBuildingName}</span>`;
    return formatted;
  }
  
  // Special handling for altitude - show mountain name underneath  
  if (unit === 'm' && country && country.highestPointName) {
    formatted = `${value.toLocaleString()} m<br><span style="font-size: 0.85em; opacity: 0.8;">${country.highestPointName}</span>`;
    return formatted;
  }
  
  // Special handling for longest rivers - show river name underneath
  if (unit === 'km' && country && country.riverName) {
    formatted = `${value.toLocaleString()} km<br><span style="font-size: 0.85em; opacity: 0.8;">${country.riverName}</span>`;
    return formatted;
  }
  
  // Normalize unit to lowercase for comparison
  const normalizedUnit = (unit || '').toLowerCase().trim();
  
  switch (normalizedUnit) {
    case 'm': // Population (already in millions)
      if (value >= 1000) {
        // Billions (1B+)
        formatted = (value / 1000).toFixed(1) + 'B';
      } else if (value >= 1) {
        // Millions (1M+)
        formatted = value.toFixed(1) + 'M';
      } else if (value >= 0.001) {
        // Thousands (1K+) - value is in millions, so multiply by 1000 to get thousands
        const thousands = (value * 1000).toFixed(1);
        formatted = thousands + 'K';
      } else {
        // Less than 1000 people - show raw number
        const raw = Math.round(value * 1000000);
        formatted = raw.toLocaleString();
      }
      break;           
    case 'usd':
      formatted = '$' + value.toLocaleString('en-US');
      break;
    case 'km²':
      // Format large landmass values with K/M notation
      if (value >= 1000000) {
        formatted = (value / 1000000).toFixed(1) + 'M km²';
      } else if (value >= 1000) {
        formatted = (value / 1000).toFixed(0) + 'K km²';
      } else {
        formatted = value.toLocaleString('en-US') + ' km²';
      }
      break;
    case 'm': // altitude in meters (when no mountain name)
    case 'km': // coastline
    case 'mm': // rainfall
      formatted = value.toLocaleString('en-US') + ' ' + unit;
      break;
    case 'hectares':
    case 'hectare':  // Also match singular form
      if (value >= 1000000) {
        formatted = (value / 1000000).toFixed(1) + 'M Hectares';
      } else if (value >= 1000) {
        formatted = (value / 1000).toFixed(1) + 'K Hectares';
      } else {
        formatted = value.toLocaleString('en-US') + ' Hectares';
      }
      break;
    case '%':
      formatted = value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%';
      break;
    case 'medals': // Olympic medals - show only raw number
      formatted = value.toLocaleString('en-US');
      break;
    case 'trophies': // world cup - show raw number only
      formatted = value.toLocaleString('en-US');
      break;
    case 'countries': // passport
      formatted = value.toLocaleString('en-US') + ' ' + unit;
      break;
    case 'prizes': // nobel prizes - show raw number only
      formatted = value.toLocaleString('en-US');
      break;
    case 'l':
      formatted = value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' L';
      break;
    case '°c':
      formatted = value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + '°C';
      break;
    case '/100k':
      formatted = value.toLocaleString('en-US', { maximumFractionDigits: 2 });
      break;
    case '/10':
      formatted = value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + '/10';
      break;
    case 'score':
      formatted = value.toLocaleString('en-US') + ' pts';
      break;
    case 'm tourists':
      formatted = value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'M';
      break;
    case 'restaurants':
      formatted = value.toLocaleString('en-US');
      break;
    case 'years':
      // Marriage age: no decimal (32 Years)
      // Life expectancy: 1 decimal (84.8 Years)
      if (categoryKey === 'marriageage') {
        formatted = Math.round(value) + ' Years';
      } else {
        formatted = value.toFixed(1) + ' Years';
      }
      break;
    // NEW CATEGORIES
    case 'ratio': // sex ratio
      formatted = value.toLocaleString('en-US');
      break;
    case 'per km²': // density
      formatted = value.toLocaleString('en-US') + ' per km²';
      break;
    case '$b': // car exports
      formatted = '$' + value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'B';
      break;
    case '': // military personnel (no unit, just number)
      formatted = value.toLocaleString('en-US');
      break;
    case '$': // rent, poorest GDP
      formatted = '$' + value.toLocaleString('en-US');
      break;
    case 'universities': // universities - show raw number only
      formatted = value.toLocaleString('en-US');
      break;
    case 'volcanoes': // volcanoes - show raw number only
      formatted = value.toLocaleString('en-US');
      break;
    case 'flamingos': // flamingos - use M/K notation
      if (value >= 1000000) {
        const millions = (value / 1000000).toFixed(1);
        formatted = millions.endsWith('.0') ? `${millions.slice(0, -2)}M` : `${millions}M`;
      } else if (value >= 1000) {
        const thousands = (value / 1000).toFixed(1);
        formatted = thousands.endsWith('.0') ? `${thousands.slice(0, -2)}K` : `${thousands}K`;
      } else {
        formatted = value.toLocaleString('en-US');
      }
      break;
    case 'risk index': // disaster risk
      formatted = value.toFixed(2);
      break;
    case 'millionaires': // millionaires
      if (value >= 1000000) {
        formatted = `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        formatted = `${(value / 1000).toFixed(1)}K`;
      } else {
        formatted = value.toLocaleString('en-US');
      }
      break;
    case 'grandmasters': // chess grandmasters - show only number in VS mode
      formatted = value.toLocaleString('en-US');
      break;
    default:
      formatted = value.toLocaleString('en-US');
  }
  
  return formatted;
}

// End game and show results
async function endGame() {
  // Prevent multiple calls to endGame
  if (gameState.isGameOver) {
    console.log('⚠️ endGame already called, skipping');
    return;
  }
  gameState.isGameOver = true;
  
  window.plausible('game_completed', { props: { mode: 'vs', category: categoryKey } });

  console.log('Game ended!');
  
  // Clear timer
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
  }
  
  // Calculate stats
  const totalGuesses = gameState.correct + gameState.incorrect;
  const accuracy = totalGuesses > 0 ? Math.round((gameState.correct / totalGuesses) * 100) : 0;
  const timePlayed = 120 - gameState.timeRemaining;
  
  // Save to database
  await saveScore();
  
  // Prepare results data for results page
  const resultsData = {
    score: gameState.score,
    correct: gameState.correct,
    total: totalGuesses,
    accuracy: accuracy,
    timePlayed: timePlayed,
    lives: gameState.lives,
    categoryName: categoryConfig.title,
    categoryKey: categoryKey
  };
  
  // Save to localStorage as backup
  localStorage.setItem('vsResults', JSON.stringify(resultsData));
  
  // Redirect to results page with URL parameters
  const params = new URLSearchParams({
    category: categoryKey,
    score: gameState.score,
    correct: gameState.correct,
    total: totalGuesses,
    accuracy: accuracy,
    time: timePlayed,
    lives: gameState.lives
  });
  
  window.location.href = `vsresults.html?${params.toString()}`;
}

// Save score to database
async function saveScore() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('Not logged in - score not saved');
      return;
    }
    
    const totalGuesses = gameState.correct + gameState.incorrect;
    const accuracy = totalGuesses > 0 ? Math.round((gameState.correct / totalGuesses) * 100) : 0;
    
    // Save to vs_scores table
    const { data, error } = await supabase
      .from('vs_scores')
      .insert({
        user_id: session.user.id,
        category_id: categoryId,
        score: gameState.score,
        correct_count: gameState.correct,
        incorrect_count: gameState.incorrect,
        accuracy: accuracy,
        time_played: 120 - gameState.timeRemaining
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving score:', error);
    } else {
      console.log('Score saved successfully:', data);
    }
    
    // If daily challenge, also save to daily_challenge_scores
    if (isDailyChallenge) {
      await saveDailyChallengeScore();
    }
  } catch (err) {
    console.error('Exception saving score:', err);
  }
}

// Save daily challenge score
async function saveDailyChallengeScore() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('Not logged in - daily challenge score not saved');
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_challenge_scores')
      .upsert({
        user_id: session.user.id,
        category_id: categoryId,
        played_date: today,
        score: gameState.score,
        completed: true
      })
      .select();
    
    if (error) {
      console.error('Error saving daily challenge score:', error);
    } else {
      console.log('✅ Daily challenge score saved:', data);
    }
  } catch (err) {
    console.error('Exception saving daily challenge score:', err);
  }
}

// Share results function
window.shareResults = function() {
  const totalGuesses = gameState.correct + gameState.incorrect;
  const accuracy = totalGuesses > 0 ? Math.round((gameState.correct / totalGuesses) * 100) : 0;
  
  const text = `🌍 GeoRanks - VS Mode: ${categoryConfig.title}
Score: ${gameState.score} 🎯
Correct: ${gameState.correct}/${totalGuesses} (${accuracy}%)

Can you beat my score? Play at geo-ranks.com`;
  
  if (navigator.share) {
    navigator.share({
      title: 'GeoRanks VS Mode Result',
      text: text
    }).catch(() => {});
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(text).then(() => {
      alert('Results copied to clipboard!');
    }).catch(() => {
      alert('Unable to share. Please try again.');
    });
  }
};

// Load category data and start game when DOM is ready
document.addEventListener('DOMContentLoaded', loadCategoryData);
console.log('Event listener added for DOMContentLoaded');