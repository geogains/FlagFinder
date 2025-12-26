// ✅ UNIVERSAL BLIND RANKING GAME ENGINE (tie-range aware edition)

const urlParams = new URLSearchParams(window.location.search);
const currentCategory = urlParams.get("mode") || "population";
const isDailyChallenge = urlParams.get("daily") === "true";

console.log("Current category:", currentCategory);
console.log("Is Daily Challenge:", isDailyChallenge);

// Use the shared Supabase client instead of creating a duplicate
import { supabase } from './supabase-client.js';

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

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
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

  slot.innerHTML = `<img src="flags/${country.code}.png" alt="${country.name}" /> ${country.name}`;
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
  // --- AUTO‑SELECT NEXT COUNTRY ---
  //
  const nextCountry = selectedCountries.find(
    (c) => !usedCountries.has(c.code)
  );

  if (nextCountry) {
    selectedCountry = nextCountry;
    updateFlagPreview(nextCountry);

    document
      .querySelectorAll(".country-flag-item")
      .forEach((el) => el.classList.remove("active"));

    const nextFlagEl = document.querySelector(
      `.country-flag-item[data-code="${nextCountry.code}"]`
    );
    if (nextFlagEl) nextFlagEl.classList.add("active");
  }

  //
  // --- END GAME WHEN ALL RANKS ARE FILLED ---
  //
  if (usedCountries.size >= selectedCountries.length) endGame();
}


function formatMetric(num) {
  if (metricKey === "temperature") return `${num}°C`;
  if (metricKey === "beerConsumption") return `${num} Litres`;
  
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
  
  // For other categories, use K/M/B abbreviations
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(0) + "K";
  return num.toLocaleString();
}

function endGame() {
  isGameOver = true;
  const res = document.querySelector(".result-panel");
  res.style.display = "flex";
  setTimeout(() => res.classList.add("visible"), 10);

  const maxScore = selectedCountries.length * 10;
  document.querySelector(
    ".result-score-value"
  ).textContent = `${totalScore}/${maxScore}`;

  setTimeout(() => {
    res.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 600);

  document.querySelectorAll(".ranking-row").forEach((row) => {
    const slot = row.querySelector(".rank-slot");
    if (!slot.innerHTML.trim()) return;
    const code = slot.querySelector("img")?.src?.split("/").pop()?.split(".")[0];
    const c = selectedCountries.find((x) => x.code === code);
    if (!c) return;
    slot.innerHTML = `
      <img src="flags/${c.code}.png" alt="${c.name}" />
      ${metricKey ? `${formatMetric(c[metricKey])}` : ""}
    `;
  });

   const breakdownDiv = document.querySelector(".result-breakdown");
  breakdownDiv.innerHTML = `
    <table class="result-table" style="width:100%;border-collapse:separate;border-spacing:0 6px;text-align:center;table-layout:fixed;">
      <thead>
        <tr style="background:#7c3aed;color:white;font-weight:600;font-size:13px;">
          <th style="padding:8px;border-radius:8px 0 0 8px;width:45%;">Country</th>
          <th style="padding:8px;width:18%;">Best</th>
          <th style="padding:8px;width:18%;">Your</th>
          <th style="padding:8px;border-radius:0 8px 8px 0;width:19%;">Pts</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  `;

  const tbody = breakdownDiv.querySelector("tbody");
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

    const diff =
      userTier < range.min
        ? range.min - userTier
        : userTier > range.max
        ? userTier - range.max
        : 0;

    let roundPoints = Math.max(10 - diff, 1);
    const isPerfect = withinTieRange;

    if (isPerfect) {
      slot.classList.add("correct-slot");
      row.style.background = "rgba(34,197,94,0.12)";
    }

    const tr = document.createElement("tr");
    tr.style.background = isPerfect ? "rgba(34,197,94,0.12)" : "#f8f7fc";
   const metricDisplay = metricKey === "highestPoint" && c.highestPointName
      ? `${formatMetric(c[metricKey])} (${c.highestPointName})`
      : metricKey ? formatMetric(c[metricKey]) : "";
    
    tr.innerHTML = `
      <td style="padding:6px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="width:40px;height:28px;flex-shrink:0;border-radius:6px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
            <img src="flags/${c.code}.png" alt="${c.name}" style="width:100%;height:100%;object-fit:cover;" />
          </div>
          <div style="text-align:left;min-width:0;flex:1;overflow:hidden;">
            <div style="font-weight:600;font-size:13px;line-height:1.2;">${c.name}</div>
            <div style="font-size:10px;color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;">${metricDisplay}</div>
          </div>
        </div>
      </td>
      <td style="font-weight:600;font-size:13px;padding:4px;">${range.min === range.max ? range.min : `${range.min}–${range.max}`}</td>
      <td style="font-size:13px;padding:4px;">${userTier}</td>
      <td style="color:${isPerfect ? "#22c55e" : "#7c3aed"};font-weight:700;font-size:15px;padding:4px;">${roundPoints}</td>
    `;
    tbody.appendChild(tr);
  });

// ✅ Save highest score using upsert RPC
(async () => {
  const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
  if (session?.user) {
    const currentCategory = new URLSearchParams(window.location.search).get("mode");

    // Step 1: get category_id from name
    const { data: catData, error: catErr } = await supabase
      .from('categories')
      .select('id')
      .eq('name', currentCategory)
      .single();

    if (catErr || !catData) {
      console.error("❌ Could not find category ID:", catErr);
      return;
    }

    // Step 2: Call the stored procedure (function)
    const { error: rpcError } = await supabase.rpc('upsert_high_score', {
      category_id_input: catData.id,
      new_score: totalScore,
      is_daily_challenge: isDailyChallenge  // Pass daily challenge flag for premium bypass
    });

    if (rpcError) {
      console.error("❌ Error updating high score:", rpcError);
    } else {
      console.log("✅ High score upserted:", totalScore);
    }
    
    // Step 3: If daily challenge, also save to daily_challenge_scores
    if (isDailyChallenge) {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: dailyData, error: dailyError } = await supabase
        .from('daily_challenge_scores')
        .upsert({
          user_id: session.user.id,
          category_id: catData.id,
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




  const playAgain = document.querySelector(".action-play-again");
  const playRandom = document.querySelector(".action-play-random");
  const shareBtn = document.querySelector(".action-share");

  shareBtn.onclick = () => {
  const maxScore = selectedCountries.length * 10;
  const scoreLine = `GeoRanks 🌍 - ${currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1)} Challenge\nScore: ${totalScore}/${maxScore}\n`;

  const results = document.querySelectorAll(".ranking-row");
  const markers = Array.from(results).map(row => {
    const slot = row.querySelector(".rank-slot");
    if (!slot.innerHTML.trim()) return "❌";

    const code = slot.querySelector("img")?.src?.split("/").pop()?.split(".")[0];
    const c = selectedCountries.find(x => x.code === code);
    if (!c) return "❌";

    const userTier = [...results].indexOf(row) + 1;
    const range = c.rankRange || { min: c.bestRankInRound, max: c.bestRankInRound };
    return userTier >= range.min && userTier <= range.max ? "✅" : "❌";
  });

  const shareText = `${scoreLine}\n${markers.join(" ")}\n\nPlay at: https://geo-ranks.com\n\n`;

  navigator.clipboard.writeText(shareText)
    .then(() => alert("📋 Copied your results to clipboard!"))
    .catch(err => alert("❌ Failed to copy results."));
};

playAgain.onclick = () => {
  const wrapper = document.querySelector(".blind-ranking-wrapper");
  if (!wrapper) return;

  wrapper.classList.add("fade-out");

  setTimeout(() => {
    res.classList.remove("visible");
    res.style.display = "none";
    startBlindRankingGame();
    wrapper.classList.remove("fade-out");
  }, 400); // match CSS transition duration
};

playRandom.onclick = () => {
  const allModes = Object.keys(datasets);
  const otherModes = allModes.filter((m) => m !== currentCategory);
  const randomMode = otherModes[Math.floor(Math.random() * otherModes.length)];
  window.location.href = `game.html?mode=${randomMode}`;
};
}

export function setupRankButtons() {
  console.log("✅ Rank buttons initialized");
  document
    .querySelectorAll(".rank-number, .rank-slot")
    .forEach((el) => el.addEventListener("click", handleRankClick));
}

window.addEventListener("DOMContentLoaded", setupRankButtons);