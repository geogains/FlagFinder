// js/vs-game.js
import { categoriesConfig, CATEGORY_ID_MAP } from './categories-config.js';
import { supabase } from './supabase-client.js';

console.log('VS game script loaded');

// Get category from URL
const params = new URLSearchParams(window.location.search);
const categoryKey = params.get('mode') || 'landmass';
const categoryConfig = categoriesConfig[categoryKey];

if (!categoryConfig) {
  console.error('Invalid category:', categoryKey);
  alert('Invalid category selected!');
  window.location.href = 'index.html';
}

const categoryId = CATEGORY_ID_MAP[categoryKey];

console.log('VS Mode - Category:', categoryKey, categoryConfig);

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
  usedPairs: [] // Track used country pairs to avoid repetition
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

// Update score display with animation
function updateScore(points) {
  gameState.score += points;
  const scoreValue = document.getElementById('scoreValue');
  scoreValue.textContent = gameState.score;
  
  // Trigger animation by removing and re-adding
  scoreValue.style.animation = 'none';
  setTimeout(() => {
    scoreValue.style.animation = 'scoreUpdate 0.5s ease';
  }, 10);
}

// Load a new round with two random countries
function loadNewRound() {
  console.log('Loading new round...');
  
  // Reset processing flag
  gameState.isProcessing = false;
  
  // Get two random unique countries
  const [country1, country2] = getTwoRandomCountries();
  
  // Update option 1
  document.getElementById('flag1').src = country1.flag;
  document.getElementById('flag1').alt = country1.name;
  document.getElementById('name1').textContent = country1.name;
  document.getElementById('value1').textContent = '';
  document.getElementById('value1').classList.remove('show');
  
  // Update option 2
  document.getElementById('flag2').src = country2.flag;
  document.getElementById('flag2').alt = country2.name;
  document.getElementById('name2').textContent = country2.name;
  document.getElementById('value2').textContent = '';
  document.getElementById('value2').classList.remove('show');
  
  // Store country data in elements
  document.getElementById('option1').dataset.value = country1.value;
  document.getElementById('option1').dataset.country = country1.name;
  document.getElementById('option2').dataset.value = country2.value;
  document.getElementById('option2').dataset.country = country2.name;
  
  // Reset styles
  const option1 = document.getElementById('option1');
  const option2 = document.getElementById('option2');
  option1.classList.remove('correct', 'incorrect', 'disabled');
  option2.classList.remove('correct', 'incorrect', 'disabled');
  
  // Add click handlers
  option1.onclick = () => handleSelection(option1, option2);
  option2.onclick = () => handleSelection(option2, option1);
  
  console.log('Round loaded:', country1.name, 'vs', country2.name);
}

// Get two random unique countries that haven't been paired recently
function getTwoRandomCountries() {
  const available = [...gameState.countries];
  
  // Shuffle array
  for (let i = available.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  
  // Get first two unique countries
  const country1 = available[0];
  const country2 = available[1];
  
  // Store this pair to avoid immediate repetition
  const pairKey = [country1.name, country2.name].sort().join('|');
  gameState.usedPairs.push(pairKey);
  
  // Keep only last 5 pairs to allow repetition after a while
  if (gameState.usedPairs.length > 5) {
    gameState.usedPairs.shift();
  }
  
  return [country1, country2];
}

// Handle country selection
function handleSelection(selected, other) {
  if (gameState.isProcessing) return; // Prevent multiple clicks
  gameState.isProcessing = true;
  
  console.log('Selection made:', selected.dataset.country);
  
  // Disable both options
  selected.classList.add('disabled');
  other.classList.add('disabled');
  
  // Get values
  const selectedValue = parseFloat(selected.dataset.value);
  const otherValue = parseFloat(other.dataset.value);
  
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
    // Correct answer
    selected.classList.add('correct');
    gameState.correct++;
    updateScore(100); // 100 points per correct answer
    console.log('✅ Correct!');
  } else {
    // Incorrect answer
    selected.classList.add('incorrect');
    other.classList.add('correct'); // Show which one was correct
    gameState.incorrect++;
    gameState.lives--;
    updateLives();
    console.log('❌ Incorrect! Lost a life.');
    
    // Check if game over (no lives)
    if (gameState.lives === 0) {
      setTimeout(() => {
        clearInterval(gameState.timerInterval);
        endGame();
      }, 3000);
      return;
    }
  }
  
  // Wait 3 seconds, then fade out and load next round
  setTimeout(() => {
    const battle = document.getElementById('vsBattle');
    battle.classList.add('fade-out');
    
    setTimeout(() => {
      battle.classList.remove('fade-out');
      battle.classList.add('fade-in');
      loadNewRound();
      
      setTimeout(() => {
        battle.classList.remove('fade-in');
      }, 500);
    }, 500);
  }, 3000);
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
  } catch (err) {
    console.error('Exception saving score:', err);
  }
}

// Load category data and start game when DOM is ready
document.addEventListener('DOMContentLoaded', loadCategoryData);
console.log('Event listener added for DOMContentLoaded');