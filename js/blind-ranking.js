// ✅ UNIVERSAL BLIND RANKING GAME ENGINE (tie-range aware edition)

const urlParams = new URLSearchParams(window.location.search);
const currentCategory = urlParams.get("mode") || "population";
const isDailyChallenge = urlParams.get("daily") === "true";

console.log("Current category:", currentCategory);
console.log("Is Daily Challenge:", isDailyChallenge);

// Use the shared Supabase client instead of creating a duplicate
import { supabase } from './supabase-client.js';
import soundManager from './sound-manager.js';
import { CATEGORY_ID_MAP } from './top10-categories-loader.js';

// Initialize sound manager
const SOUND_MAP = {
  'pop': '/sounds/pop.mp3',
  'perfect': '/sounds/perfect.mp3',
  'correct': '/sounds/correct.mp3',
  'tryagain': '/sounds/tryagain.mp3'
};

soundManager.init(SOUND_MAP).then(() => {
  console.log('✅ Sounds loaded for Classic mode');
}).catch(err => {
  console.error('❌ Failed to load sounds:', err);
});

function getCountries() {
  return window.countries && window.countries.length ? window.countries : [];
}

let selectedCountries = [];
let totalScore = 0;
let isGameOver = false;
let usedCountries = new Set();
let selectedCountry = null;

// 🔍 Detect metric & rank keys
function detectMetricKey(data) {
  if (!data.length) return null;
  const sample = data[0];
  const keys = Object.keys(sample);
  const possibleKeys = [
    "population",
    "gdp",
    "score",
    "forestArea",
    "coastline",
    "cuisineScore",
    "medals",
    "trophies",
    "landmass",
    "crimerate",
    "highestPoint",
    "passportstrength",
    "beerConsumption",
    "nobelPrizes",
    "temperature",
    "precipitation",
    "touristArrivals",
    "michelinTotal",
    "bigMacPrice",
    "lifeExpectancy",
    // NEW CATEGORIES
    "marriageAge",
    "sexRatio",
    "height",
    "density",
    "carExportsUsdB",
    "personnel",
    "rentUsd",
    "gdpPerCapita",
    "university",
    "volcanos",
    "flamingos",
    "disasterrisk",
    "longestriver",
    "sharepercent",
    "millionaires",
    "grandmasters"
  ];
  return possibleKeys.find((k) => keys.includes(k)) || null;
}

function detectRankKey(data) {
  if (!data.length) return null;
  const sample = data[0];
  const keys = Object.keys(sample);
  return keys.find((k) => k.endsWith("Rank")) || null;
}

const metricKey = detectMetricKey(countries);
const rankKey = detectRankKey(countries);

console.log("🧭 Detected metricKey:", metricKey);
console.log("🏅 Detected rankKey:", rankKey);

// Fisher-Yates shuffle - unbiased randomization
function shuffle(array) {
  const arr = [...array]; // Don't mutate original
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 🧮 Compute ranks & tie ranges
function computeBestRanks(list) {
  if (!metricKey) return;

  const sorted = [...list].sort((a, b) => b[metricKey] - a[metricKey]);

  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    const currentVal = sorted[i][metricKey];
    // Find all items sharing the same value
    const tieGroup = sorted.filter((x) => x[metricKey] === currentVal);
    const startRank = i + 1;
    const endRank = startRank + tieGroup.length - 1;

    sorted[i].bestRankInRound = currentRank;
    sorted[i].rankRange = { min: startRank, max: endRank };

    // Apply same range to all tied elements
    tieGroup.forEach((t, j) => {
      t.bestRankInRound = startRank;
      t.rankRange = { min: startRank, max: endRank };
    });

    // Skip over the whole tie group
    i += tieGroup.length - 1;
    currentRank = endRank + 1;
  }
}

export function startBlindRankingGame() {
  const countries = getCountries();
  if (!countries.length) {
    console.error("❌ No country data found!");
    document.querySelector(".top-card-title").textContent =
      "No data available for this category.";
    return;
  }

  selectedCountries = shuffle([...countries]).slice(0, 10);
  computeBestRanks(selectedCountries);
  totalScore = 0;
  usedCountries.clear();
  isGameOver = false;

  const res = document.querySelector(".result-panel");
  res.classList.remove("visible");
  res.style.display = "none";
  scrollToTop();

  // ✅ Clean up previous slots and row styling
  document.querySelectorAll(".ranking-row").forEach((row) => {
    const slot = row.querySelector(".rank-slot");
    slot.innerHTML = "";
    slot.classList.add("empty-slot");
    slot.classList.remove("stomp", "correct-slot");

    row.style.background = ""; // remove green highlight
  });

  // ✅ Reset rank buttons
  document.querySelectorAll(".rank-number").forEach((btn) => {
    btn.classList.remove("used-rank");
    btn.style.cursor = "pointer";
  });

  renderCountryPool();

  selectedCountry = selectedCountries[0];
  const firstFlagItem = document.querySelector(
    `.country-flag-item[data-code="${selectedCountry.code}"]`
  );
  if (firstFlagItem) firstFlagItem.classList.add("active");
  updateFlagPreview(selectedCountry);
}

function renderCountryPool() {
  const pool = document.querySelector(".country-pool-panel");
  pool.innerHTML = "";
  selectedCountries.forEach((c) => {
    const div = document.createElement("div");
    div.classList.add("country-flag-item");
    div.setAttribute("data-code", c.code);
    div.innerHTML = `<img src="flags/${c.code}.png" alt="${c.name}" />`;
    div.addEventListener("click", () => selectCountry(c));
    pool.appendChild(div);
  });
}

function selectCountry(country) {
  if (isGameOver || usedCountries.has(country.code)) return;
  selectedCountry = country;
  document
    .querySelectorAll(".country-flag-item")
    .forEach((el) => el.classList.remove("active"));
  document
    .querySelector(`.country-flag-item[data-code="${country.code}"]`)
    .classList.add("active");
  updateFlagPreview(country);
}

function updateFlagPreview(country) {
  const flagBox = document.querySelector(".flag-box");
  const countryNameElem = document.querySelector(".flag-country-name");
  flagBox.innerHTML = `<img src="flags/${country.code}.png" alt="${country.name}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;" />`;
  countryNameElem.textContent = country.name.toUpperCase();
}

// 🏅 Handle rank clicks (tie-range aware)
function handleRankClick(event) {
  if (isGameOver || !selectedCountry) return;

  const clickedEl = event.currentTarget;
  const row = clickedEl.closest(".ranking-row");
  const rankBtn = row.querySelector(".rank-number");
  const slot = row.querySelector(".rank-slot");

  // Slot already filled? Do nothing (locked mode)
  if (!slot.classList.contains("empty-slot")) return;

  const country = selectedCountry;

  //
  // --- ASSIGN COUNTRY TO SLOT ---
  //
  usedCountries.add(country.code);

  const usedFlag = document.querySelector(
    `.country-flag-item[data-code="${country.code}"]`
  );
  if (usedFlag) {
    usedFlag.classList.add("used");
    usedFlag.classList.remove("active");
  }

  slot.innerHTML = `<img src="flags/${country.code}.png" alt="${country.name}" /><span class="country-name">${country.name}</span>`;
  soundManager.play('pop');
  slot.classList.remove("empty-slot");
  slot.classList.add("stomp");

  // Grey out the rank number ALWAYS, even if clicking the slot
  rankBtn.classList.add("used-rank");
  rankBtn.style.cursor = "default";

  //
  // --- TIE RANGE + SCORING LOGIC (UNCHANGED) ---
  //
  const correctTier = country.bestRankInRound;
  const range = country.rankRange || { min: correctTier, max: correctTier };

  const allRows = Array.from(document.querySelectorAll(".ranking-row"));
  const userTier = allRows.indexOf(row) + 1;

  const diff =
    userTier < range.min
      ? range.min - userTier
      : userTier > range.max
      ? userTier - range.max
      : 0;

  let roundPoints = Math.max(10 - diff, 1);
  totalScore += roundPoints;

  //
  // --- AUTO-SELECT NEXT UNUSED FLAG (SEQUENTIAL) ---
  //
  // Find the index of the currently PLACED country
  const currentIndex = selectedCountries.findIndex(c => c.code === country.code);
  console.log(`Placed country: ${country.name} at index ${currentIndex}`);
  
  // Look for the next unused country starting from current position + 1
  let nextCountry = null;
  for (let i = currentIndex + 1; i < selectedCountries.length; i++) {
    if (!usedCountries.has(selectedCountries[i].code)) {
      nextCountry = selectedCountries[i];
      console.log(`Next unused country found: ${nextCountry.name} at index ${i}`);
      break;
    }
  }
  
  // If no unused country found after current position, wrap around to beginning
  if (!nextCountry) {
    for (let i = 0; i < currentIndex; i++) {
      if (!usedCountries.has(selectedCountries[i].code)) {
        nextCountry = selectedCountries[i];
        console.log(`Wrapped around, found: ${nextCountry.name} at index ${i}`);
        break;
      }
    }
  }

  if (nextCountry) {
    selectedCountry = nextCountry;
    updateFlagPreview(nextCountry);

    // Remove active class from all flags
    document
      .querySelectorAll(".country-flag-item")
      .forEach((el) => el.classList.remove("active"));

    // Add active class to next flag
    const nextFlagEl = document.querySelector(
      `.country-flag-item[data-code="${nextCountry.code}"]`
    );
    if (nextFlagEl) {
      nextFlagEl.classList.add("active");
      console.log(`Activated flag for: ${nextCountry.name}`);
    }
  } else {
    console.log('No next country found - all used');
  }

  //
  // --- END GAME WHEN ALL RANKS ARE FILLED ---
  //
  if (usedCountries.size >= selectedCountries.length) endGame();
}


function formatMetric(num) {
  if (metricKey === "temperature") return `${num}°C`;
  if (metricKey === "beerConsumption") return `${num} Litres`;
  if (metricKey === "touristArrivals") return `${num}M Tourists`;
  if (metricKey === "michelinTotal") return `${num.toLocaleString()} restaurants`;
  if (metricKey === "bigMacPrice") return `$${num.toFixed(2)}`; 
  if (metricKey === "lifeExpectancy") return `${num.toFixed(1)} years`;
  if (metricKey === "score") return `${num.toFixed(1)}/10`; // happiness index - round to 1 decimal
  
  // NEW CATEGORIES
  if (metricKey === "marriageAge") return `${num} years`;
  if (metricKey === "sexRatio") return `${num}`;
  if (metricKey === "height") return `${num}m`; // tallest building
  if (metricKey === "density") return `${num.toLocaleString()} per km²`;
  if (metricKey === "carExportsUsdB") return `$${num}B`;
  if (metricKey === "personnel") return num.toLocaleString(); // military personnel
  if (metricKey === "rentUsd") return `$${num.toLocaleString()}`;
  if (metricKey === "gdpPerCapita") return `$${num.toLocaleString()}`; // poorest GDP
  if (metricKey === "university") return `${num.toLocaleString()} universities`;
  if (metricKey === "volcanos") return `${num} volcanoes`;
  if (metricKey === "flamingos") {
    if (num >= 1000000) {
      const millions = (num / 1000000).toFixed(1);
      return millions.endsWith('.0') ? `${millions.slice(0, -2)}M` : `${millions}M`;
    } else if (num >= 1000) {
      const thousands = (num / 1000).toFixed(1);
      return thousands.endsWith('.0') ? `${thousands.slice(0, -2)}K` : `${thousands}K`;
    }
    return num.toLocaleString();
  }
  if (metricKey === "disasterrisk") return `${num.toFixed(2)}`;
  if (metricKey === "longestriver") return `${num.toLocaleString()} km`;
  if (metricKey === "sharepercent") return `${num}%`; // renewable energy
  if (metricKey === "millionaires") {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  }
  if (metricKey === "grandmasters") return `${num} grandmasters`;
  
  // Special handling for altitude: always show full number with commas
  if (metricKey === "highestPoint") {
    return `${num.toLocaleString()} m`;
  }
  
  if (metricKey === "precipitation") {
    return `${num.toLocaleString()} mm`;
  }
  
  // Special handling for forest: always show in millions with 1 decimal
  if (metricKey === "forestArea") {
  const millions = (num / 1_000_000).toFixed(1);
  // Remove .0 if decimal is zero
  const formatted = millions.endsWith('.0') ? millions.slice(0, -2) : millions;
  return `${formatted}M Hectares`;
  }

    // Special handling for landmass: show in millions with 1 decimal + Km² suffix
  if (metricKey === "landmass") {
  if (num >= 1_000_000) {
    // 1 million and above: show as M
    const millions = (num / 1_000_000).toFixed(1);
    const formatted = millions.endsWith('.0') ? millions.slice(0, -2) : millions;
    return `${formatted}M Km²`;
  } else {
    // Under 1 million: show as K
    const thousands = (num / 1_000).toFixed(0);
    return `${thousands}K Km²`;
  }
}

  // Special handling for Olympic medals: show full number with commas
if (metricKey === "medals") {
  return num.toLocaleString();
}

  // Special handling for coastline: show full number with commas + km suffix
  if (metricKey === "coastline") {
    return `${num.toLocaleString()} km`;
  }

  // Special handling for GDP: show full number with $ and commas
if (metricKey === "gdp") {
  return `$${num.toLocaleString()}`;
}
  
  // Special handling for population: always show in M format
  if (metricKey === "population") {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
    if (num >= 1_000) return (num / 1_000).toFixed(1) + "K";
    return num.toLocaleString();
  }
  
  // For other categories, use K/M/B abbreviations
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(0) + "K";
  return num.toLocaleString();
}

function endGame() {
  isGameOver = true;

  const maxScore = selectedCountries.length * 10;
  
  // Prepare results table data
  const resultsTable = [];
  const rows = document.querySelectorAll(".ranking-row");

  rows.forEach((row, idx) => {
    const slot = row.querySelector(".rank-slot");
    if (!slot.innerHTML.trim()) return;

    const code = slot.querySelector("img")?.src?.split("/").pop()?.split(".")[0];
    const c = selectedCountries.find((x) => x.code === code);
    if (!c) return;

    const userTier = idx + 1;
    const range = c.rankRange || { min: c.bestRankInRound, max: c.bestRankInRound };
    const withinTieRange = userTier >= range.min && userTier <= range.max;

    resultsTable.push({
      rank: userTier,
      bestRank: range.min === range.max ? range.min : `${range.min}-${range.max}`,
      name: c.name,
      flag: `flags/${c.code}.png`,
      value: formatMetric(c[metricKey]),
      isPerfect: withinTieRange,
      tallestBuildingName: c.tallestBuildingName || null,
      highestPointName: c.highestPointName || null
    });
  });

  // Get category name
  const categoryParam = new URLSearchParams(window.location.search).get("mode") || 'population';
  const categoryNames = {
    population: 'Population',
    altitude: 'Highest Altitude',
    gdp: 'GDP per Capita',
    tallestbuilding: 'Tallest Buildings',
    landmass: 'Landmass',
    forest: 'Forest Coverage',
    coastline: 'Coastline Length',
    happiness: 'Happiness Index',
    passport: 'Passport Power',
    beer: 'Beer Consumption',
    nobelprize: 'Nobel Prizes',
    hightemp: 'Hottest Countries',
    rainfall: 'Annual Rainfall',
    crimerate: 'Crime Rate',
    olympic: 'Olympic Medals',
    cuisine: 'Cuisine Quality',
    worldcup: 'World Cup Wins',
    tourism: 'Most Visited Countries',
    michelin: 'Michelin Restaurants',
    bigmac: 'Most Expensive Big Mac',
    lifeexpectancy: 'Life Expectancy'
  };
  const categoryName = categoryNames[categoryParam] || categoryParam;

  // Prepare results data for results page
  const resultsData = {
    score: totalScore,
    maxScore: maxScore,
    categoryName: categoryName,
    categoryKey: categoryParam,
    resultsTable: resultsTable
  };
  
  // Save to localStorage as backup
  localStorage.setItem('classicResults', JSON.stringify(resultsData));
  
  // Save highest score using upsert RPC
  (async () => {
    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (session?.user) {
      const currentCategory = categoryParam;

      // Get category_id from CATEGORY_ID_MAP
      const categoryId = CATEGORY_ID_MAP[currentCategory];

      if (!categoryId) {
        console.error("❌ Could not find category ID for:", currentCategory);
        console.log("Available categories:", Object.keys(CATEGORY_ID_MAP));
        return;
      }

      console.log("✅ Found category ID:", categoryId, "for category:", currentCategory);

      // Call the stored procedure
      const { error: rpcError } = await supabase.rpc('upsert_high_score', {
        category_id_input: categoryId,
        new_score: totalScore,
        is_daily_challenge: isDailyChallenge
      });

      if (rpcError) {
        console.error("❌ Error updating high score:", rpcError);
      } else {
        console.log("✅ High score upserted:", totalScore);
      }
      
      // If daily challenge, also save to daily_challenge_scores
      if (isDailyChallenge) {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: dailyData, error: dailyError } = await supabase
          .from('daily_challenge_scores')
          .upsert({
            user_id: session.user.id,
            category_id: categoryId,
            played_date: today,
            score: totalScore,
            completed: true
          })
          .select();
        
        if (dailyError) {
          console.error("❌ Error saving daily challenge score:", dailyError);
        } else {
          console.log("✅ Daily challenge score saved:", dailyData);
        }
      }
    } else {
      console.warn("⚠️ No active session found.");
    }
  })();

  // Redirect to results page with URL parameters
  const params = new URLSearchParams({
    category: categoryParam,
    score: totalScore,
    maxScore: maxScore
  });
  
  setTimeout(() => {
    window.location.href = `classicresults.html?${params.toString()}`;
  }, 300); // Small delay to ensure score is saved
}

export function setupRankButtons() {
  console.log("✅ Rank buttons initialized");
  document
    .querySelectorAll(".rank-number, .rank-slot")
    .forEach((el) => el.addEventListener("click", handleRankClick));
}

window.addEventListener("DOMContentLoaded", setupRankButtons);