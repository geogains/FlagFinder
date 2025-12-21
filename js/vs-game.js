// js/vs-game.js
import { categoriesConfig, CATEGORY_ID_MAP } from './categories-config.js';
import { supabase } from './supabase-client.js';

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
    gameState.countries = data.map(country => ({
      name: country.name,
      code: country.code,
      flag: `flags/${country.code}.png`,
      value: country[categoryConfig.valueField]
    }));
    
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
      endGame();
    }
  }, 1000);
}

// Update lives display
function updateLives() {
  const livesDisplay = document.getElementById('livesDisplay');
  livesDisplay.innerHTML = '❤️'.repeat(gameState.lives);
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
  document.getElementById('option2').dataset.value = country2.value;
  document.getElementById('option2').dataset.country = country2.name;
  
  // Get country options (not flags, but the wrapper divs)
  const option1 = document.getElementById('option1');
  const option2 = document.getElementById('option2');
  
  // Reset styles on options
  option1.classList.remove('correct', 'incorrect', 'disabled');
  option2.classList.remove('correct', 'incorrect', 'disabled');
  
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
  
  // Get first two unique countries
  const country1 = filtered[0];
  const country2 = filtered[1];
  
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
  const isCorrect = selectedValue >= otherValue;
  
  // Show values with animation
  const value1Element = document.getElementById('value1');
  const value2Element = document.getElementById('value2');
  const country1Value = parseFloat(document.getElementById('option1').dataset.value);
  const country2Value = parseFloat(document.getElementById('option2').dataset.value);
  
  value1Element.textContent = formatValue(country1Value, categoryConfig.unit);
  value2Element.textContent = formatValue(country2Value, categoryConfig.unit);
  
  setTimeout(() => {
    value1Element.classList.add('show');
    value2Element.classList.add('show');
  }, 100);
  
  if (isCorrect) {
    // Correct answer - only animate and border the selected flag
    selectedOption.classList.add('correct');
    gameState.correct++;
    animateScoreCountUp(100); // Count-up animation!
    console.log('✅ Correct!');
  } else {
    // Incorrect answer - only animate and border the selected flag in red
    // DO NOT show which one was correct - no green border on other flag
    selectedOption.classList.add('incorrect');
    gameState.incorrect++;
    gameState.lives--;
    updateLives();
    console.log('❌ Incorrect! Lost a life.');
    
    // Check if game over (no lives)
    if (gameState.lives === 0) {
      setTimeout(() => {
        clearInterval(gameState.timerInterval);
        endGame();
      }, 2000);
      return;
    }
  }
  
  // Wait 2 seconds, then fade out, load new round while invisible, then fade in
  setTimeout(() => {
    const battle = document.getElementById('vsBattle');
    battle.classList.add('fade-out');
    
    setTimeout(() => {
      // Keep invisible during load
      battle.style.visibility = 'hidden';
      battle.classList.remove('fade-out');
      
      // Load new round while invisible
      loadNewRound();
      
      // Make visible again and fade in
      setTimeout(() => {
        battle.style.visibility = 'visible';
        battle.classList.add('fade-in');
        
        setTimeout(() => {
          battle.classList.remove('fade-in');
        }, 300);
      }, 100); // Give DOM time to update
    }, 300); // Wait for fade-out to complete
  }, 2000);
}

// Format value with proper units and commas
function formatValue(value, unit) {
  let formatted;
  
  switch (unit) {
    case 'M': // Million
      formatted = value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'M';
      break;
    case 'USD':
      formatted = '$' + value.toLocaleString('en-US');
      break;
    case 'km²':
    case 'm': // altitude in meters
    case 'km': // coastline
    case 'mm': // rainfall
      formatted = value.toLocaleString('en-US') + ' ' + unit;
      break;
    case 'hectares':  // ← aligned with other cases
      if (value >= 1000000) {  // ← properly indented
        formatted = (value / 1000000).toFixed(1) + 'M hectares';
      } else if (value >= 1000) {
        formatted = (value / 1000).toFixed(1) + 'K hectares';
      } else {
        formatted = value.toLocaleString('en-US') + ' hectares';
      }
      break;
    case '%':
      formatted = value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%';
      break;
    case 'medals':
    case 'trophies':
    case 'prizes':
    case 'countries': // passport
      formatted = value.toLocaleString('en-US') + ' ' + unit;
      break;
    case 'L':
      formatted = value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' L';
      break;
    case '°C':
      formatted = value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + '°C';
      break;
    case '/100k':
      formatted = value.toLocaleString('en-US', { maximumFractionDigits: 2 }) + '/100k';
      break;
    case '/10':
      formatted = value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + '/10';
      break;
    case 'score':
      formatted = value.toLocaleString('en-US') + ' pts';
      break;
    default:
      formatted = value.toLocaleString('en-US');
  }
  
  return formatted;
}

// End game and show results
async function endGame() {
  console.log('Game ended!');
  
  // Clear timer
  if (gameState.timerInterval) {
    clearInterval(gameState.timerInterval);
  }
  
  // Calculate stats
  const totalGuesses = gameState.correct + gameState.incorrect;
  const accuracy = totalGuesses > 0 ? Math.round((gameState.correct / totalGuesses) * 100) : 0;
  const timePlayed = 120 - gameState.timeRemaining;
  const minutes = Math.floor(timePlayed / 60);
  const seconds = timePlayed % 60;
  
  // Save to database
  await saveScore();
  
  // Show results
  const overlay = document.getElementById('resultsOverlay');
  const emoji = document.getElementById('resultsEmoji');
  const title = document.getElementById('resultsTitle');
  
  // Set emoji based on performance
  if (gameState.lives === 0) {
    emoji.textContent = '💪';
    title.textContent = 'Game Over!';
  } else if (gameState.correct >= 20) {
    emoji.textContent = '🏆';
    title.textContent = 'Amazing!';
  } else if (gameState.correct >= 10) {
    emoji.textContent = '🌟';
    title.textContent = 'Great Job!';
  } else {
    emoji.textContent = '👍';
    title.textContent = 'Good Try!';
  }
  
  document.getElementById('resultsCategory').textContent = categoryConfig.title;
  document.getElementById('finalScore').textContent = gameState.score;
  document.getElementById('finalCorrect').textContent = `${gameState.correct}/${totalGuesses}`;
  document.getElementById('finalAccuracy').textContent = `${accuracy}%`;
  document.getElementById('finalTime').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  overlay.classList.add('active');
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