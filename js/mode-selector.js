// js/mode-selector.js
// Modal for selecting game mode when clicking a category

console.log('Mode Selector loaded');

// Categories that have less than 10 countries (Top 10 not available)
const SMALL_CATEGORIES = ['olympic', 'worldcup', 'cuisine'];

// Mode configurations
const MODES = {
  classic: {
    icon: '🎮',
    name: 'CLASSIC',
    description: 'Rank 10 randomly assigned countries',
    gameFile: 'game.html'
  },
  top10: {
    icon: '🎯',
    name: 'TOP 10',
    description: 'Name the top 10 countries in under 2 minutes',
    gameFile: 'top10.html'
  },
  vs: {
    icon: '⚔️',
    name: 'VS MODE',
    description: 'Which country ranks higher? Unlimited rounds',
    gameFile: 'vs.html'
  },
  random: {
    icon: '🎲',
    name: 'RANDOM',
    description: 'Surprise me! Pick a random mode',
    gameFile: null // Special handling
  }
};

// Create modal HTML
export function createModeSelectorModal() {
  const modalHTML = `
    <div class="mode-selector-overlay" id="modeSelectorOverlay">
      <div class="mode-selector-modal">
        <!-- Close Button -->
        <button class="mode-selector-close" id="modeSelectorClose">×</button>
        
        <!-- Header -->
        <div class="mode-selector-header">
          <h2 class="mode-selector-title">Choose Your Mode</h2>
          <p class="mode-selector-category" id="modeSelectorCategory">
            <span id="modeSelectorCategoryName">Population</span> 
            <span id="modeSelectorCategoryEmoji">👥</span>
          </p>
        </div>

        <!-- Mode Cards -->
        <div class="mode-cards-grid" id="modeCardsGrid">
          <!-- Cards will be inserted here -->
        </div>

        <!-- Cancel Button -->
        <button class="mode-cancel-btn" id="modeCancelBtn">Cancel</button>
      </div>
    </div>
  `;

  // Insert modal into body
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Set up event listeners
  setupModalListeners();
}

// Set up event listeners
function setupModalListeners() {
  const overlay = document.getElementById('modeSelectorOverlay');
  const closeBtn = document.getElementById('modeSelectorClose');
  const cancelBtn = document.getElementById('modeCancelBtn');

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  // Close on X button
  closeBtn.addEventListener('click', closeModal);

  // Close on Cancel button
  cancelBtn.addEventListener('click', closeModal);

  // Close on ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      closeModal();
    }
  });
}

// Open modal for a specific category
export function openModeSelector(categoryKey, categoryDisplayName, categoryEmoji) {
  console.log('Opening mode selector for:', categoryKey);

  // Update category display
  document.getElementById('modeSelectorCategoryName').textContent = categoryDisplayName;
  document.getElementById('modeSelectorCategoryEmoji').textContent = categoryEmoji;

  // Set background image based on category
  const modal = document.querySelector('.mode-selector-modal');
  const bgMap = {
    population: "population.jpg",
    gdp: "gdp.jpg",
    altitude: "altitude.jpg",
    forest: "forest.jpg",
    coastline: "coastline.jpg",
    olympic: "olympic.jpg",
    landmass: "landmass.jpg",
    passport: "passport.jpg",
    beer: "beer.jpg",
    nobelprize: "nobelprize.jpg",
    worldcup: "worldcup.jpg",
    temperature: "hightemp.jpg",
    precipitation: "rainfall.jpg",
    crimerate: "crimerate.jpg",
    happiness: "happiness.jpg",
    cuisine: "cuisine.jpg"
  };

  const bgImage = bgMap[categoryKey];
  if (bgImage && modal) {
    modal.style.backgroundImage = `url('images/categories/${bgImage}')`;
  }

  // Generate mode cards
  const cardsGrid = document.getElementById('modeCardsGrid');
  cardsGrid.innerHTML = '';

  Object.keys(MODES).forEach(modeKey => {
    const mode = MODES[modeKey];
    
    // Check if Top 10 should be disabled for this category
    const isDisabled = modeKey === 'top10' && SMALL_CATEGORIES.includes(categoryKey);

    const card = document.createElement('div');
    card.className = `mode-card ${isDisabled ? 'disabled' : ''}`;
    
    if (!isDisabled) {
      card.onclick = () => selectMode(modeKey, categoryKey);
    }

    card.innerHTML = `
      <span class="mode-icon">${mode.icon}</span>
      <div class="mode-name">${mode.name}</div>
      <div class="mode-description">${mode.description}</div>
    `;

    cardsGrid.appendChild(card);
  });

  // Show modal
  document.getElementById('modeSelectorOverlay').classList.add('active');
  
  // Auto-scroll page to center modal vertically in viewport
  setTimeout(() => {
    const modal = document.querySelector('.mode-selector-modal');
    if (modal) {
      const modalRect = modal.getBoundingClientRect();
      const modalCenter = modalRect.top + modalRect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const scrollOffset = modalCenter - viewportCenter;
      
      if (Math.abs(scrollOffset) > 10) { // Only scroll if modal is not already centered
        window.scrollBy({
          top: scrollOffset,
          behavior: 'smooth'
        });
      }
    }
  }, 50); // Small delay to ensure modal is rendered
  
  // Prevent body scroll after centering
  setTimeout(() => {
    document.body.style.overflow = 'hidden';
  }, 100);
}

// Close modal
function closeModal() {
  document.getElementById('modeSelectorOverlay').classList.remove('active');
  document.body.style.overflow = '';
}

// Handle mode selection
function selectMode(modeKey, categoryKey) {
  const mode = MODES[modeKey];
  console.log('Selected:', modeKey, 'for category:', categoryKey);

  // Handle Random mode - pick a random available mode
  if (modeKey === 'random') {
    const availableModes = ['classic', 'vs'];
    
    // Add Top 10 only if category supports it
    if (!SMALL_CATEGORIES.includes(categoryKey)) {
      availableModes.push('top10');
    }
    
    // Pick random mode
    const randomMode = availableModes[Math.floor(Math.random() * availableModes.length)];
    console.log('Random mode selected:', randomMode);
    
    // Redirect to random mode
    window.location.href = `${MODES[randomMode].gameFile}?mode=${categoryKey}`;
    return;
  }

  // Redirect to selected game
  window.location.href = `${mode.gameFile}?mode=${categoryKey}`;
}

// Auto-initialize modal when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createModeSelectorModal);
} else {
  createModeSelectorModal();
}

console.log('Mode Selector ready');