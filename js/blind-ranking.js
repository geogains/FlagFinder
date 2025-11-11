// ✅ UNIVERSAL BLIND RANKING GAME ENGINE (tie-range aware edition)

const urlParams = new URLSearchParams(window.location.search);
const currentCategory = urlParams.get("mode") || "population";

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(
  'https://ajwxgdaninuzcpfwawug.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqd3hnZGFuaW51emNwZndhd3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MDI5ODgsImV4cCI6MjA3NzA3ODk4OH0._LvYsqhSZIsWLIvAYtEceg1fXbEuaM0DElY5poVqZxI' // Replace this if not using env var
);

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

  document.querySelectorAll(".rank-slot").forEach((slot) => {
    slot.innerHTML = "";
    slot.classList.add("empty-slot");
    slot.classList.remove("stomp", "correct-slot");
  });

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
  const rankBtn = event.currentTarget;
  const row = rankBtn.parentElement;
  const slot = row.querySelector(".rank-slot");
  if (!slot.classList.contains("empty-slot")) return;

  const country = selectedCountry;
  usedCountries.add(country.code);
  const usedFlag = document.querySelector(
    `.country-flag-item[data-code="${country.code}"]`
  );
  if (usedFlag) usedFlag.classList.add("used");

  slot.innerHTML = `<img src="flags/${country.code}.png" alt="${country.name}" /> ${country.name}`;
  slot.classList.remove("empty-slot");
  slot.classList.add("stomp");
  rankBtn.classList.add("used-rank");
  rankBtn.style.cursor = "default";

  const correctTier = country.bestRankInRound;
  const range = country.rankRange || { min: correctTier, max: correctTier };
  const allRows = Array.from(document.querySelectorAll(".ranking-row"));
  const userTier = allRows.indexOf(row) + 1;

  const withinTieRange = userTier >= range.min && userTier <= range.max;
  const diff =
    userTier < range.min
      ? range.min - userTier
      : userTier > range.max
      ? userTier - range.max
      : 0;

  let roundPoints = Math.max(10 - diff, 1);

  totalScore += roundPoints;

  const nextCountry = selectedCountries.find(
    (c) => !usedCountries.has(c.code)
  );
  if (nextCountry) {
    selectedCountry = nextCountry;
    document
      .querySelectorAll(".country-flag-item")
      .forEach((el) => el.classList.remove("active"));
    const nextFlagEl = document.querySelector(
      `.country-flag-item[data-code="${nextCountry.code}"]`
    );
    if (nextFlagEl) nextFlagEl.classList.add("active");
    updateFlagPreview(nextCountry);
  }

  if (usedCountries.size >= selectedCountries.length) endGame();
}

function formatMetric(num) {
  if (metricKey === "temperature") return `${num}°C`;
  if (metricKey === "precipitation") return `${num} mm`;
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(0) + "K";
  return num.toString();
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
    <table class="result-table" style="width:100%;border-collapse:separate;border-spacing:0 6px;text-align:center;">
      <thead>
        <tr style="background:#7c3aed;color:white;font-weight:600;">
          <th style="padding:10px;border-radius:8px 0 0 8px;">Country</th>
          <th style="padding:10px;">Best</th>
          <th style="padding:10px;">Your Guess</th>
          <th style="padding:10px;border-radius:0 8px 8px 0;">Points</th>
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
    tr.innerHTML = `
      <td style="padding:6px;">
        <div style="width:48px;height:32px;border-radius:6px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.2);margin:auto;">
          <img src="flags/${c.code}.png" alt="${c.name}" style="width:100%;height:100%;object-fit:cover;" />
        </div>
      </td>
      <td style="font-weight:600;">${range.min === range.max ? range.min : `${range.min}–${range.max}`}</td>
      <td>${userTier}</td>
      <td style="color:${isPerfect ? "#22c55e" : "#7c3aed"};font-weight:700;">${roundPoints}</td>
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
      new_score: totalScore
    });

    if (rpcError) {
      console.error("❌ Error updating high score:", rpcError);
    } else {
      console.log("✅ High score upserted:", totalScore);
    }
  } else {
    console.warn("⚠️ No active session found.");
  }
})();




  const playAgain = document.querySelector(".action-play-again");
  const playRandom = document.querySelector(".action-play-random");
  const shareBtn = document.querySelector(".action-share");

  playAgain.onclick = () => {
    res.classList.remove("visible");
    res.style.display = "none";
    scrollToTop();
    setTimeout(() => startBlindRankingGame(), 200);
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
    .querySelectorAll(".rank-number")
    .forEach((btn) => btn.addEventListener("click", handleRankClick));
}

window.addEventListener("DOMContentLoaded", setupRankButtons);
