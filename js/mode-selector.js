// js/mode-selector.js
// Modal for selecting game mode when clicking a category

console.log('Mode Selector loaded');

// Categories that have less than 10 countries (Top 10 not available)
const SMALL_CATEGORIES = [];

// Category hint text — keyed by categoryKey
export const CATEGORY_HINTS = {
  population: {
    description: "Rank countries from highest to lowest total population.",
    detail: "Countries with more people rank higher, regardless of land size or economic output.",
    example: "A country with 800 million people ranks above one with 50 million."
  },
  gdp: {
    description: "Rank countries from highest to lowest GDP per capita (PPP-adjusted).",
    detail: "Economic output divided by population, adjusted for local costs. A large economy doesn't automatically win — it's per person.",
    example: "A country with $90,000 GDP per capita ranks above one with $30,000."
  },
  altitude: {
    description: "Rank countries from highest to lowest peak elevation above sea level.",
    detail: "Each country is ranked by its single highest point. Countries with no significant peaks rank lowest.",
    example: "A country with a peak of 8,000m ranks above one with a peak of 2,500m."
  },
  forest: {
    description: "Rank countries from highest to lowest forest cover as a percentage of land area.",
    detail: "It's the proportion of land covered by forest, not the total forested area. A small country can rank higher than a much larger one.",
    example: "A country with 90% forest cover ranks above one with 25%."
  },
  coastline: {
    description: "Rank countries from longest to shortest total coastline.",
    detail: "Every stretch of coast — including islands, inlets, and fjords — counts toward the total. A heavily indented or island-heavy coastline can be surprisingly long.",
    example: "A country with 200,000 km of coastline ranks above one with 7,000 km."
  },
  olympic: {
    description: "Rank countries from most to fewest all-time Olympic medals (Summer + Winter combined).",
    detail: "Total medals across all editions count equally. Gold, silver, and bronze are all included.",
    example: "A country with 2,500 total medals ranks above one with 300."
  },
  landmass: {
    description: "Rank countries from largest to smallest total land area.",
    detail: "Total land area in km² is all that matters. Population, wealth, and coastline have no effect.",
    example: "A country covering 17 million km² ranks above one covering 300,000 km²."
  },
  passport: {
    description: "Rank countries by passport strength — how many destinations their citizens can visit visa-free.",
    detail: "More visa-free or visa-on-arrival destinations means a stronger passport and a higher rank.",
    example: "A passport granting visa-free access to 190 countries ranks above one granting 50."
  },
  beer: {
    description: "Rank countries from highest to lowest annual beer consumption per capita.",
    detail: "Total national beer consumption divided by population. Cultural, religious, and climate factors all influence where countries fall.",
    example: "A country averaging 150 litres per person per year ranks above one averaging 40."
  },
  nobelprize: {
    description: "Rank countries from most to fewest Nobel Prize winners across all categories.",
    detail: "Each laureate is attributed to one country — typically their country of birth or citizenship at the time of the award.",
    example: "A country with 350 laureates ranks above one with 30."
  },
  worldcup: {
    description: "Rank countries from most to fewest FIFA World Cup titles won.",
    detail: "Only tournament victories count. Runner-up finishes and group stage exits do not affect the ranking.",
    example: "A country with 5 titles ranks above one with 2, which ranks above one with 0."
  },
  hightemp: {
    description: "Rank countries from highest to lowest average annual temperature.",
    detail: "Average temperature across the whole country over the full year. Latitude, elevation, and proximity to oceans all affect it.",
    example: "A country averaging 30°C year-round ranks above one averaging 5°C."
  },
  temperature: {
    description: "Rank countries from highest to lowest average annual temperature.",
    detail: "Average temperature across the whole country over the full year. Latitude, elevation, and proximity to oceans all affect it.",
    example: "A country averaging 30°C year-round ranks above one averaging 5°C."
  },
  rainfall: {
    description: "Rank countries from highest to lowest average annual precipitation.",
    detail: "Total rainfall averaged across the country per year. Topography, latitude, and wind patterns all play a role.",
    example: "A country averaging 3,000mm of rain per year ranks above one averaging 100mm."
  },
  precipitation: {
    description: "Rank countries from highest to lowest average annual precipitation.",
    detail: "Total rainfall averaged across the country per year. Topography, latitude, and wind patterns all play a role.",
    example: "A country averaging 3,000mm of rain per year ranks above one averaging 100mm."
  },
  crimerate: {
    description: "Rank countries from highest to lowest crime index score.",
    detail: "The score combines reported crime statistics and public perception of safety. Higher scores mean more crime.",
    example: "A country with a crime index of 75 ranks above one with a score of 22."
  },
  happiness: {
    description: "Rank countries from highest to lowest World Happiness Report score.",
    detail: "Scores are calculated from data on income, social support, health, freedom, generosity, and perceived corruption.",
    example: "A country scoring 7.5 out of 10 ranks above one scoring 4.2."
  },
  cuisine: {
    description: "Rank countries by cuisine influence and international popularity score.",
    detail: "The score reflects global recognition, number of internationally popular dishes, and the cultural spread of the national food tradition.",
    example: "A country with a cuisine score of 85 ranks above one with a score of 30."
  },
  tourism: {
    description: "Rank countries from most to fewest international tourist arrivals per year.",
    detail: "Total inbound international visitors per year. Geography, attractions, infrastructure, and visa policies all influence the count.",
    example: "A country with 90 million annual visitors ranks above one with 5 million."
  },
  michelin: {
    description: "Rank countries from most to fewest Michelin-starred restaurants.",
    detail: "Only restaurants awarded at least one Michelin star count. More starred restaurants across the country means a higher rank.",
    example: "A country with 400 starred restaurants ranks above one with 20."
  },
  bigmac: {
    description: "Rank countries from most to least expensive Big Mac price (in USD).",
    detail: "The price is converted to USD and compared directly. It roughly reflects local wages, food costs, and purchasing power.",
    example: "A country where a Big Mac costs $8 ranks above one where it costs $2."
  },
  lifeexpectancy: {
    description: "Rank countries from highest to lowest average life expectancy at birth.",
    detail: "The average number of years a person born in that country is expected to live. Healthcare, diet, and living standards all influence the figure.",
    example: "A country with a life expectancy of 85 years ranks above one with 60 years."
  },
  marriageage: {
    description: "Rank countries from highest to lowest average age at first marriage.",
    detail: "Countries where people tend to marry later in life rank higher.",
    example: "A country where the average first marriage happens at 32 ranks above one where it happens at 20."
  },
  sexratio: {
    description: "Rank countries from highest to lowest male-to-female ratio (males per 100 females).",
    detail: "A ratio above 100 means more males than females; below 100 means more females. Migration patterns, birth rates, and other factors shift the balance.",
    example: "A country with 130 males per 100 females ranks above one with 95 per 100."
  },
  tallestbuilding: {
    description: "Rank countries by the height of their tallest building.",
    detail: "Only the single tallest structure per country counts. Height in metres determines rank.",
    example: "A country with a 700m skyscraper ranks above one with a 300m building."
  },
  density: {
    description: "Rank countries from highest to lowest population density (people per km²).",
    detail: "Total population divided by land area. A small country with a large population can rank far above a huge country with few inhabitants.",
    example: "A country with 5,000 people per km² ranks above one with 30 per km²."
  },
  carexports: {
    description: "Rank countries from highest to lowest automobile export value.",
    detail: "Total value of cars and commercial vehicles exported per year in USD. Industrial capacity and trade relationships drive the rankings.",
    example: "A country exporting $150 billion of vehicles per year ranks above one exporting $8 billion."
  },
  militarypersonel: {
    description: "Rank countries from highest to lowest number of active military personnel.",
    detail: "Only active-duty service members count — not reserves or paramilitary forces. Population size and national service policies both influence the total.",
    example: "A country with 1.5 million active personnel ranks above one with 80,000."
  },
  rent: {
    description: "Rank countries from most to least expensive average monthly rent (city centre, 1-bedroom).",
    detail: "Based on average city-centre rent converted to USD. High wages and strong housing demand tend to push prices up.",
    example: "A country where average rent is $2,000/month ranks above one where it is $300/month."
  },
  poorestgdp: {
    description: "Rank countries from lowest to highest GDP per capita.",
    detail: "This category is the inverse of standard GDP — lower economic output per person means a higher rank here.",
    example: "A country with $300 GDP per capita ranks above one with $5,000."
  },
  university: {
    description: "Rank countries by number of top-ranked universities in global league tables.",
    detail: "Only universities appearing in recognised global rankings count. More top institutions means a higher rank.",
    example: "A country with 150 globally ranked universities ranks above one with 8."
  },
  volcano: {
    description: "Rank countries from most to fewest active volcanoes.",
    detail: "Only currently active or recently active volcanoes count. Tectonic position is the primary factor.",
    example: "A country with 120 active volcanoes ranks above one with 5."
  },
  flamingo: {
    description: "Rank countries from largest to smallest wild flamingo population.",
    detail: "Flamingos depend on specific shallow, alkaline water habitats. Countries with more suitable wetland environments support larger colonies.",
    example: "A country with 1.5 million flamingos ranks above one with 10,000."
  },
  disasterrisk: {
    description: "Rank countries from highest to lowest natural disaster risk index score.",
    detail: "The index combines exposure to hazards — earthquakes, floods, storms — with local vulnerability and resilience capacity.",
    example: "A country with a risk score of 8.5 out of 10 ranks above one scoring 1.2."
  },
  longestriver: {
    description: "Rank countries by the length of their longest river.",
    detail: "Only the single longest river within each country's borders counts. Rivers shared between countries may be credited differently.",
    example: "A country with a 6,000km river ranks above one whose longest river is 800km."
  },
  renewableenergy: {
    description: "Rank countries from highest to lowest share of electricity from renewable sources.",
    detail: "The percentage of total electricity generation that comes from renewables — including hydro, wind, solar, and geothermal.",
    example: "A country generating 95% of its electricity from renewables ranks above one at 20%."
  },
  millionaires: {
    description: "Rank countries from most to fewest USD millionaires.",
    detail: "Counts individuals with net assets of $1 million or more. Wealth distribution varies widely — a small number of countries hold the vast majority.",
    example: "A country with 15 million millionaires ranks above one with 200,000."
  },
  gm: {
    description: "Rank countries from most to fewest chess grandmasters.",
    detail: "The Grandmaster title is awarded by FIDE — the international chess federation — for consistently high-level tournament performance. More titled players means a higher rank.",
    example: "A country with 200 grandmasters ranks above one with 15."
  },
};

// Mode configurations
const MODES = {
  classic: {
    icon: '🌍',
    name: 'CLASSIC',
    description: 'Rank 10 randomly assigned countries',
    gameFile: 'game.html'
  },
  top10: {
    icon: '🔟',
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
        <!-- Close Button — outside scroll body so it stays visible while scrolling -->
        <button class="mode-selector-close" id="modeSelectorClose">×</button>

        <!-- Scrollable content body -->
        <div class="mode-selector-body">
          <!-- Header -->
          <div class="mode-selector-header">
            <h2 class="mode-selector-title">Select Game Mode</h2>
            <p class="mode-selector-category" id="modeSelectorCategory">
              <span id="modeSelectorCategoryName">Population</span>
              <span id="modeSelectorCategoryEmoji">👥</span>
            </p>

            <!-- Category hint -->
            <div class="category-info-row" id="categoryInfoRow" hidden>
              <button class="category-info-btn" id="categoryInfoBtn" aria-expanded="false">
                <span class="category-info-btn-icon">?</span>
                How to rank?
              </button>
              <div class="category-info-panel" id="categoryInfoPanel" hidden>
                <p class="category-info-description" id="categoryInfoDescription"></p>
                <p class="category-info-detail" id="categoryInfoDetail"></p>
                <p class="category-info-example" id="categoryInfoExample"></p>
              </div>
            </div>
          </div>

          <!-- Mode Cards -->
          <div class="mode-cards-grid" id="modeCardsGrid">
            <!-- Cards will be inserted here -->
          </div>

          <!-- Cancel Button -->
          <button class="mode-cancel-btn" id="modeCancelBtn">Cancel</button>
        </div>
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
  const modal = document.querySelector('.mode-selector-modal');

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

  // Toggle hint panel
  document.getElementById('categoryInfoBtn').addEventListener('click', () => {
    const panel = document.getElementById('categoryInfoPanel');
    const btn   = document.getElementById('categoryInfoBtn');
    const isOpen = !panel.hidden;
    panel.hidden = isOpen;
    btn.setAttribute('aria-expanded', String(!isOpen));
  });

  // Close hint panel when clicking inside modal but outside the info row
  modal.addEventListener('click', (e) => {
    const panel = document.getElementById('categoryInfoPanel');
    if (!panel.hidden && !e.target.closest('#categoryInfoRow')) {
      panel.hidden = true;
      document.getElementById('categoryInfoBtn').setAttribute('aria-expanded', 'false');
    }
  });
}

// Open modal for a specific category
export function openModeSelector(categoryKey, categoryDisplayName, categoryEmoji, source = null) {
  console.log('Opening mode selector for:', categoryKey);
  console.log('Opened from:', source);

  // Store the source for close handling
  window.modeSelectorSource = source;

  // Update category display
  document.getElementById('modeSelectorCategoryName').textContent = categoryDisplayName;
  document.getElementById('modeSelectorCategoryEmoji').textContent = categoryEmoji;

  // Populate and reset hint panel
  const hint      = CATEGORY_HINTS[categoryKey];
  const infoRow   = document.getElementById('categoryInfoRow');
  const infoPanel = document.getElementById('categoryInfoPanel');
  const infoBtn   = document.getElementById('categoryInfoBtn');

  // Always collapse before populating — prevents stale content showing from previous category
  infoPanel.hidden = true;
  infoBtn.setAttribute('aria-expanded', 'false');

  if (hint) {
    document.getElementById('categoryInfoDescription').textContent = hint.description;
    document.getElementById('categoryInfoDetail').textContent      = hint.detail;
    document.getElementById('categoryInfoExample').textContent     = hint.example;
    infoRow.hidden = false;
  } else {
    infoRow.hidden = true;
  }

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
    hightemp: "hightemp.jpg",
    temperature: "hightemp.jpg",  // ✅ ALIAS - points to same image as hightemp
    rainfall: "rainfall.jpg",
    precipitation: "rainfall.jpg",  // ✅ ALIAS - points to same image as rainfall
    crimerate: "crimerate.jpg",
    happiness: "happiness.jpg",
    cuisine: "cuisine.jpg",
    tourism: "tourism.jpg",
    michelin: "michelin.jpg",
    bigmac: "bigmac.jpg",
    lifeexpectancy: "lifeexpectancy.jpg",
    // NEW CATEGORIES
    marriageage: "marriageage.jpg",
    sexratio: "sexratio.jpg",
    tallestbuilding: "tallestbuilding.jpg",
    density: "density.jpg",
    carexports: "carexports.jpg",
    militarypersonel: "militarypersonel.jpg",
    rent: "rent.jpg",
    poorestgdp: "poorestgdp.jpg",
    university: "university.jpg",
    volcano: "volcano.jpg",
    flamingo: "flamingo.jpg",
    disasterrisk: "disasterrisk.jpg",
    longestriver: "longestriver.jpg",
    renewableenergy: "renewableenergy.jpg",
    millionaires: "millionaires.jpg",
    gm: "gm.jpg",
  };

  const bgImage = bgMap[categoryKey];
  if (modal) {
    if (bgImage) {
      // Set the background image for this category
      modal.style.backgroundImage = `url('images/categories/${bgImage}')`;
    } else {
      // ✅ FIX: Clear background if no image found (prevents showing previous category's image)
      modal.style.backgroundImage = '';
      console.warn(`No background image found for category: ${categoryKey}`);
    }
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
  // Collapse hint panel so it never appears pre-expanded on next open
  const infoPanel = document.getElementById('categoryInfoPanel');
  if (infoPanel) {
    infoPanel.hidden = true;
    document.getElementById('categoryInfoBtn').setAttribute('aria-expanded', 'false');
  }

  document.getElementById('modeSelectorOverlay').classList.remove('active');
  document.body.style.overflow = '';
  
  // If modal was opened from search, scroll back to search bar
  if (window.modeSelectorSource === 'search') {
    const searchInput = document.getElementById('categorySearchInput');
    if (searchInput) {
      setTimeout(() => {
        searchInput.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 300); // Wait for modal close animation
    }
    // Clear the source
    window.modeSelectorSource = null;
  }
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

    window.plausible?.('mode_selected', { props: { mode: randomMode, category: categoryKey } });

    // Redirect to random mode
    window.location.href = `${MODES[randomMode].gameFile}?mode=${categoryKey}`;
    return;
  }

  window.plausible?.('mode_selected', { props: { mode: modeKey, category: categoryKey } });

  // Redirect to selected game
  window.location.href = `${mode.gameFile}?mode=${categoryKey}`;
}

// Auto-initialize modal when script loads.
// Guard: skip on pages that only import CATEGORY_HINTS (e.g. daily-challenge.html)
// and don't need the mode selector UI injected into the DOM.
if (!document.querySelector('.daily-container')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createModeSelectorModal);
  } else {
    createModeSelectorModal();
  }
}

console.log('Mode Selector ready');