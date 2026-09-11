# 📘 COMPLETE GUIDE: Adding New Categories to GeoRanks

**Version:** 2.0  
**Last Updated:** December 30, 2025  
**Purpose:** Master reference for adding new game categories

---

## 📋 TABLE OF CONTENTS

1. [Overview](#overview)
2. [Pre-Implementation Checklist](#pre-implementation-checklist)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [File-by-File Changes](#file-by-file-changes)
5. [Common Pitfalls & Fixes](#common-pitfalls--fixes)
6. [Testing Checklist](#testing-checklist)
7. [Quick Reference](#quick-reference)

---

## OVERVIEW

### What You'll Need:
- Category data file (`.js` with country data)
- Background image (`.jpg` for category card)
- Category information (name, emoji, ID, units, etc.)

### Total Files to Update: 13 files + 1 image
1. Data file (create new)
2. game.html
3. categories-config.js
4. top10-categories-loader.js
5. daily-challenge.js
6. blind-ranking.js
7. mode-selector.js
8. categories.html
9. stats.html
10. vs-game.js
11. top10-game.js
12. **index.html** (NEW - often forgotten!)
13. **leaderboard.html** (NEW - often forgotten!)
14. Background image

---

## PRE-IMPLEMENTATION CHECKLIST

Before you start coding, gather this information:

### Basic Information
```
Category Name: _________________ (e.g., "Tourist Visits")
Category Slug: _________________ (lowercase, no spaces/hyphens: "tourism")
Category Emoji: ________________ (e.g., ✈️)
Category ID: ___________________ (next available: 17, 18, 19, etc.)
Is Premium: Yes / No
Has 10+ Countries: Yes / No (for Top 10 mode)
```

### Data Structure
```
Data File Name: ________________ (e.g., tourism.js)
Export Name: ___________________ (e.g., tourismData)
Value Field: ___________________ (e.g., touristArrivals)
Rank Field: ____________________ (e.g., touristRank)
Unit: __________________________ (e.g., "M tourists", "USD", "years")
```

### Game Text
```
Classic Mode Title: RANK COUNTRIES BY _______________________
VS Mode Question: WHICH COUNTRY HAS _______________________?
Top 10 Mode Title: _______________________
```

### Data Format Required
```javascript
export const [categoryName]Data = [
  { 
    name: "Country Name",
    code: "XX",  // ISO 2-letter code
    [valueField]: 123.45,
    [rankField]: 1
  },
  // ... more countries
];
```

---

## STEP-BY-STEP IMPLEMENTATION

Follow this order to minimize errors:

### Phase 1: Create Data File
✅ Create `js/categories/[slug].js`  
✅ Verify all countries have `name`, `code`, `[valueField]`, `[rankField]`

### Phase 2: Update Core Game Files (9 files)
✅ game.html (3 changes)  
✅ categories-config.js (2 changes)  
✅ top10-categories-loader.js (2 changes)  
✅ daily-challenge.js (4 changes)  
✅ blind-ranking.js (2 changes)  
✅ mode-selector.js (1 change)  
✅ categories.html (2 changes)  
✅ stats.html (1 change)

### Phase 3: Update Format Functions (3 files)
✅ vs-game.js (1 change)  
✅ top10-game.js (1 change)  
✅ blind-ranking.js (already updated in Phase 2)

### Phase 4: Update Daily Challenge Display (2 files - CRITICAL!)
✅ index.html (1 change - background image map)  
✅ leaderboard.html (2 changes - category arrays)

### Phase 5: Add Assets
✅ Add background image to `images/categories/`

### Phase 6: Testing
✅ Run through complete testing checklist

---

## FILE-BY-FILE CHANGES

### 📁 FILE 1: js/categories/[slug].js

**Action:** Create new file

**Template:**
```javascript
// js/categories/[slug].js
// Description of what this category measures

export const [slug]Data = [
  { name: "Country", code: "XX", [valueField]: 100, [rankField]: 1 },
  // ... more countries (minimum 10 for Top 10 mode)
];
```

**Example:**
```javascript
// js/categories/tourism.js
// International tourist arrivals data

export const tourismData = [
  { name: "France", code: "FR", touristArrivals: 102.0, touristRank: 1 },
  { name: "Spain", code: "ES", touristArrivals: 93.8, touristRank: 2 },
  // ... more countries
];
```

---

### 📁 FILE 2: game.html (Classic Mode)

**Location:** `game.html`

#### Change 2A: Add Import Statement
**Find:** (around line 48-66)
```javascript
import { tourismData } from './js/categories/tourism.js';
```

**Add AFTER last import:**
```javascript
import { [slug]Data } from './js/categories/[slug].js';
```

---

#### Change 2B: Add to datasets Object
**Find:** (around line 68-85)
```javascript
tourism: { title: 'RANK COUNTRIES BY NUMBER OF TOURIST VISITS ✈️', data: tourismData },
```

**Add BEFORE closing `};`:**
```javascript
[slug]: { title: '[CLASSIC_MODE_TITLE] [EMOJI]', data: [slug]Data },
```

**Example:**
```javascript
tourism: { title: 'RANK COUNTRIES BY NUMBER OF TOURIST VISITS ✈️', data: tourismData },
michelin: { title: 'RANK COUNTRIES BY MICHELIN STARRED RESTAURANTS ⭐', data: michelinData },
```

---

#### Change 2C: Add to PREMIUM_MODES Array (if premium)
**Find:** (around line 96-114)
```javascript
const PREMIUM_MODES = [
  'coastline',
  'cuisine',
  // ... other premium modes
  'tourism'
];
```

**Add BEFORE closing `];` (only if premium):**
```javascript
'[slug]'
```

**Example:**
```javascript
const PREMIUM_MODES = [
  'coastline',
  'cuisine',
  'olympic',
  'worldcup',
  'landmass',
  'crimerate',
  'happiness',
  'passport',
  'beer',
  'nobelprize',
  'temperature',
  'precipitation',
  'tourism',
  'michelin'  // ← ADD
];
```

---

### 📁 FILE 3: categories-config.js (VS Mode)

**Location:** `js/categories-config.js`

#### Change 3A: Add Category Configuration
**Find:** End of categoriesConfig object (before closing `};`)

**Add:**
```javascript
[slug]: {
  title: "[Category Display Name]",
  emoji: "[EMOJI]",
  unit: "[unit]",
  dataFile: "[slug]",
  dataKey: "[slug]Data",
  valueField: "[valueField]",
  questionText: "[VS_MODE_QUESTION]"
},
```

**Example:**
```javascript
tourism: {
  title: "Tourist Visits",
  emoji: "✈️",
  unit: "M tourists",
  dataFile: "tourism",
  dataKey: "tourismData",
  valueField: "touristArrivals",
  questionText: "WHICH COUNTRY RECEIVES MORE TOURISTS?"
},
```

---

#### Change 3B: Add to CATEGORY_ID_MAP
**Find:** (around line 97-114)
```javascript
export const CATEGORY_ID_MAP = {
  population: 1,
  // ... other categories
  tourism: 17
};
```

**Add BEFORE closing `};`:**
```javascript
[slug]: [ID]
```

**Example:**
```javascript
tourism: 17,
michelin: 18,
bigmac: 19
};
```

---

### 📁 FILE 4: top10-categories-loader.js (Top 10 Mode)

**Location:** `js/top10-categories-loader.js`

#### Change 4A: Add to CATEGORY_ID_MAP
**Find:** (around line 9-23)
```javascript
export const CATEGORY_ID_MAP = {
  population: 1,
  // ... other categories
  tourism: 17
};
```

**Add BEFORE closing `};`:**
```javascript
[slug]: [ID]
```

---

#### Change 4B: Add to top10Config Object
**Find:** End of top10Config object (before closing `};`)

**Add:**
```javascript
[slug]: {
  title: "[Top 10 Mode Title]",
  emoji: "[EMOJI]",
  unit: "[unit]",
  dataFile: "[slug]",
  dataKey: "[slug]Data",
  valueField: "[valueField]",
  rankField: "[rankField]"
},
```

**Example:**
```javascript
tourism: {
  title: "Most Visited Countries",
  emoji: "✈️",
  unit: "M tourists",
  dataFile: "tourism",
  dataKey: "tourismData",
  valueField: "touristArrivals",
  rankField: "touristRank"
},
```

---

### 📁 FILE 5: daily-challenge.js

**Location:** `js/daily-challenge.js`

#### Change 5A: Add to allCategories Array
**Find:** (around line 9-13)
```javascript
const allCategories = [
  'population', 'gdp', 'landmass', 'altitude', 'forest', 'coastline',
  'olympic', 'worldcup', 'passport', 'beer', 'nobelprize', 
  'hightemp', 'rainfall', 'crimerate', 'happiness', 'cuisine', 'tourism'
];
```

**Add to array:**
```javascript
'[slug]'
```

---

#### Change 5B: Add to top10ValidCategories Array (if has 10+ countries)
**Find:** (around line 16-20)
```javascript
const top10ValidCategories = [
  'population', 'gdp', 'landmass', 'altitude', 'forest', 'coastline',
  'passport', 'beer', 'nobelprize', 'hightemp', 'rainfall',
  'crimerate', 'happiness', 'tourism'
];
```

**Add to array (only if category has 10+ countries):**
```javascript
'[slug]'
```

---

#### Change 5C: Add Display Name
**Find:** (around line 140-157)
```javascript
export const categoryDisplayNames = {
  population: 'Population',
  // ... other categories
  tourism: 'Tourist Visits'
};
```

**Add BEFORE closing `};`:**
```javascript
[slug]: '[Display Name]'
```

---

#### Change 5D: Add Emoji
**Find:** (around line 160-177)
```javascript
export const categoryEmojis = {
  population: '👥',
  // ... other categories
  tourism: '✈️'
};
```

**Add BEFORE closing `};`:**
```javascript
[slug]: '[EMOJI]'
```

---

### 📁 FILE 6: blind-ranking.js (Classic Mode)

**Location:** `js/blind-ranking.js`

#### Change 6A: Add to possibleKeys Array
**Find:** (around line 28-46)
```javascript
const possibleKeys = [
  "population",
  "gdp",
  // ... other keys
  "touristArrivals"
];
```

**Add to array:**
```javascript
"[valueField]"
```

---

#### Change 6B: Add to formatMetric Function
**Find:** (around line 265-268)
```javascript
function formatMetric(num) {
  if (metricKey === "temperature") return `${num}°C`;
  if (metricKey === "beerConsumption") return `${num} Litres`;
  if (metricKey === "touristArrivals") return `${num}M tourists`;
  // ... more conditions
```

**Add AFTER existing conditions:**
```javascript
if (metricKey === "[valueField]") return `${num}[formatted with unit]`;
```

**Examples:**
```javascript
if (metricKey === "michelinTotal") return `${num.toLocaleString()} restaurants`;
if (metricKey === "bigMacPrice") return `$${num.toFixed(2)}`;
if (metricKey === "lifeExpectancy") return `${num.toFixed(1)} years`;
```

---

### 📁 FILE 7: mode-selector.js

**Location:** `js/mode-selector.js`

#### Change 7A: Add Background Image Mapping
**Find:** (around line 42-61)
```javascript
const bgMap = {
  population: "population.jpg",
  gdp: "gdp.jpg",
  // ... other categories
  tourism: "tourism.jpg"
};
```

**Add BEFORE closing `};`:**
```javascript
[slug]: "[slug].jpg"
```

---

### 📁 FILE 8: categories.html

**Location:** `categories.html`

#### Change 8A: Add Category Card to Grid
**Find:** The categories grid section (after last category card)

**Add BEFORE closing `</div>` of categories-grid:**
```html
<div class="category-card" data-premium="[true/false]" data-category="[slug]" data-display="[Display Name]" data-emoji="[EMOJI]"
     style="background-image:url('images/categories/[slug].jpg');">
  <div class="category-info">
    <span class="emoji">[EMOJI]</span>
    <h3>[Display Name]</h3>
  </div>
</div>
```

**Example:**
```html
<div class="category-card" data-premium="true" data-category="tourism" data-display="Tourist Visits" data-emoji="✈️"
     style="background-image:url('images/categories/tourism.jpg');">
  <div class="category-info">
    <span class="emoji">✈️</span>
    <h3>Tourist Visits</h3>
  </div>
</div>
```

---

#### Change 8B: Add to Search Array
**Find:** (around line 369-386)
```javascript
const allCategories = [
  { name: "Altitude", slug: "altitude" },
  { name: "Beer Consumption", slug: "beer" },
  // ... other categories (alphabetically sorted)
  { name: "World Cup Trophies", slug: "worldcup" }
];
```

**Add in ALPHABETICAL ORDER:**
```javascript
{ name: "[Display Name]", slug: "[slug]" }
```

---

### 📁 FILE 9: stats.html

**Location:** `stats.html`

#### Change 9A: Add to Category Name Mapping
**Find:** getCategoryNameById function (around line 138-155)
```javascript
function getCategoryNameById(id) {
  const mapping = {
    1: '👥 Population',
    2: '🏔️ Altitude',
    // ... other categories
    17: '✈️ Tourist Visits'
  };
  return mapping[id] || `Category ${id}`;
}
```

**Add:**
```javascript
[ID]: '[EMOJI] [Display Name]'
```

---

### 📁 FILE 10: vs-game.js

**Location:** `js/vs-game.js`

#### Change 10A: Update formatValue Function
**Find:** formatValue function (around line 328-379)
```javascript
function formatValue(value, unit) {
  let formatted;
  
  switch (unit) {
    case 'M': // Million
      formatted = value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'M';
      break;
    case 'USD':
      formatted = '$' + value.toLocaleString('en-US');
      break;
    // ... more cases
    default:
      formatted = value.toLocaleString('en-US');
  }
  
  return formatted;
}
```

**Add case BEFORE `default:`:**
```javascript
case '[unit]':
  formatted = [formatting logic];
  break;
```

**Examples:**
```javascript
case 'restaurants':
  formatted = value.toLocaleString('en-US') + ' restaurants';
  break;
case 'years':
  formatted = value.toFixed(1) + ' years';
  break;
```

---

### 📁 FILE 11: top10-game.js

**Location:** `js/top10-game.js`

#### Change 11A: Update formatValue Function
**Find:** formatValue function (around line 721-763)
```javascript
function formatValue(value, unit) {
  switch(unit) {
    case 'M': // Million
      return `${value.toFixed(1)}M`;
    case 'USD':
      return `$${value.toLocaleString()}`;
    // ... more cases
    default:
      return `${value}`;
  }
}
```

**Add case BEFORE `default:`:**
```javascript
case '[unit]':
  return `[formatting logic]`;
```

**Examples:**
```javascript
case 'restaurants':
  return `${value.toLocaleString()} restaurants`;
case 'years':
  return `${value.toFixed(1)} years`;
```

---

### 📁 FILE 12: index.html (⚠️ CRITICAL - Often Forgotten!)

**Location:** `index.html`

#### Change 12A: Add to bgMap Object
**Find:** Daily challenge script section (around line 259-276)
```javascript
const bgMap = {
  population: "population.jpg",
  gdp: "gdp.jpg",
  // ... other categories
  cuisine: "cuisine.jpg"
};
```

**Add BEFORE closing `};`:**
```javascript
[slug]: "[slug].jpg"
```

**Example:**
```javascript
tourism: "tourism.jpg",
michelin: "michelin.jpg",
bigmac: "bigmac.jpg"
};
```

---

### 📁 FILE 13: leaderboard.html (⚠️ CRITICAL - Often Forgotten!)

**Location:** `leaderboard.html`

#### Change 13A: Add to allCategories Array
**Find:** getDailyChallengeForDate function (around line 540-544)
```javascript
const allCategories = [
  'population', 'gdp', 'landmass', 'altitude', 'forest', 'coastline',
  'olympic', 'worldcup', 'passport', 'beer', 'nobelprize', 
  'hightemp', 'rainfall', 'crimerate', 'happiness', 'cuisine'
];
```

**Add to array:**
```javascript
'[slug]'
```

---

#### Change 13B: Add to top10ValidCategories Array
**Find:** (around line 546-550)
```javascript
const top10ValidCategories = [
  'population', 'gdp', 'landmass', 'altitude', 'forest', 'coastline',
  'passport', 'beer', 'nobelprize', 'hightemp', 'rainfall',
  'crimerate', 'happiness'
];
```

**Add to array (only if category has 10+ countries):**
```javascript
'[slug]'
```

---

### 📁 FILE 14: Background Image

**Location:** `images/categories/`

**Action:** Add image file

**Requirements:**
- Filename: `[slug].jpg` (exact match, lowercase)
- Recommended size: 800x600px or similar landscape ratio
- Format: JPG
- Theme: Relevant to category

---

## COMMON PITFALLS & FIXES

### ❌ Problem: Categories display in single column
**Cause:** Missing closing `</div>` tag in categories.html  
**Fix:** Ensure every category card has proper closing tags

---

### ❌ Problem: Daily challenge shows different category on homepage vs leaderboard
**Cause:** Forgot to update category arrays in index.html or leaderboard.html  
**Fix:** Update both files with new categories

---

### ❌ Problem: Units not displaying (shows raw numbers)
**Cause:** Forgot to add unit formatting in format functions  
**Fix:** Update formatValue() in vs-game.js, top10-game.js, and formatMetric() in blind-ranking.js

---

### ❌ Problem: "Invalid category" error when playing
**Cause:** Mismatch between slug in different files  
**Fix:** Ensure slug is identical everywhere (case-sensitive!)

---

### ❌ Problem: Mode selector doesn't show background image
**Cause:** Forgot to add to bgMap in mode-selector.js or index.html  
**Fix:** Add mapping in both files

---

### ❌ Problem: Premium lock not working
**Cause:** Forgot to add to PREMIUM_MODES array  
**Fix:** Add slug to PREMIUM_MODES in game.html

---

### ❌ Problem: Top 10 mode disabled for category with 10+ countries
**Cause:** Forgot to add to top10ValidCategories arrays  
**Fix:** Add to arrays in daily-challenge.js and leaderboard.html

---

## TESTING CHECKLIST

After implementation, test systematically:

### ✅ Visual Tests
- [ ] Category appears on categories.html page
- [ ] Category shows correct emoji
- [ ] Background image displays correctly
- [ ] Premium lock shows (if applicable)
- [ ] Card is clickable and not nested inside another card

---

### ✅ Search Functionality
- [ ] Category appears when searching by name
- [ ] Clicking from search opens mode selector
- [ ] Mode selector shows correct background image

---

### ✅ Mode Selector
- [ ] Opens with correct title and emoji
- [ ] Background image displays
- [ ] All 4 mode buttons clickable (Classic, Top 10, VS, Random)
- [ ] Top 10 disabled if <10 countries

---

### ✅ Classic Mode
**URL:** `game.html?mode=[slug]`
- [ ] Page loads without errors
- [ ] Title displays correctly with emoji
- [ ] 10 random countries appear
- [ ] Country flags display
- [ ] Ranking works
- [ ] Score calculates
- [ ] Results show with correct unit formatting

---

### ✅ Top 10 Mode
**URL:** `top10.html?mode=[slug]`
- [ ] Page loads without errors
- [ ] Title displays correctly
- [ ] Input accepts country names
- [ ] Timer counts down from 2:00
- [ ] Lives system works (3 lives)
- [ ] All top 10 countries can be guessed
- [ ] Results show with correct unit formatting

---

### ✅ VS Mode
**URL:** `vs.html?mode=[slug]`
- [ ] Page loads without errors
- [ ] Question displays correctly
- [ ] Two countries show with flags
- [ ] Values display after selection with correct units
- [ ] Score increases for correct answers
- [ ] Lives decrease for wrong answers
- [ ] Timer counts down

---

### ✅ Daily Challenge
- [ ] Category can appear as daily challenge
- [ ] Homepage shows correct category name and emoji
- [ ] Homepage shows correct background image
- [ ] Leaderboard shows matching category
- [ ] Daily challenge bypasses premium lock
- [ ] Completion tracked correctly

---

### ✅ Stats & Leaderboard
- [ ] Category appears in stats with correct emoji
- [ ] Shows correct rank
- [ ] Shows correct score
- [ ] Progress bar displays
- [ ] Leaderboard accepts scores
- [ ] Rankings display properly

---

### ✅ Premium System (if applicable)
- [ ] Non-premium users see lock
- [ ] Premium modal appears when clicking
- [ ] Premium users can access freely
- [ ] Daily challenge bypasses lock

---

## QUICK REFERENCE

### Category Slug Rules
✅ DO: Use lowercase, no spaces  
✅ DO: Use simple names (tourism, michelin, bigmac)  
❌ DON'T: Use hyphens (tourist-visits)  
❌ DON'T: Use spaces (tourist visits)  
❌ DON'T: Use capital letters (Tourism)

---

### File Naming Convention
- Data file: `[slug].js` (e.g., tourism.js)
- Export name: `[slug]Data` (e.g., tourismData)
- Image file: `[slug].jpg` (e.g., tourism.jpg)

---

### Unit Formatting Guide
| Unit Type | Format | Example Output |
|-----------|--------|----------------|
| Million | `${num}M` | "102.0M" |
| USD | `$${num.toFixed(2)}` | "$7.99" |
| Number with unit | `${num.toLocaleString()} [unit]` | "641 restaurants" |
| Decimal with unit | `${num.toFixed(1)} [unit]` | "86.5 years" |
| Percentage | `${num}%` | "15.5%" |

---

### Country Code Reference
Use ISO 3166-1 alpha-2 codes:
- US = United States
- GB = United Kingdom  
- FR = France
- DE = Germany
- JP = Japan
- CN = China
- etc.

Full list: https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2

---

## SUMMARY

### Total Updates Per Category:
- **13 files** to modify
- **1 image** to add
- **25+ individual changes** across all files

### Time Estimate:
- First category: 60-90 minutes
- Subsequent categories: 30-45 minutes each
- Testing: 15-30 minutes per category

### Critical Files (Most Commonly Forgotten):
1. ⚠️ **index.html** - bgMap for daily challenge
2. ⚠️ **leaderboard.html** - category arrays
3. ⚠️ **Format functions** - unit display

### Success Criteria:
✅ All 3 game modes work  
✅ Daily challenge can select category  
✅ Leaderboard shows correct info  
✅ Stats display properly  
✅ Units format correctly  
✅ Premium lock works (if applicable)

---

## VERSION HISTORY

**v2.0** (Dec 30, 2025)
- Added index.html (bgMap) - CRITICAL
- Added leaderboard.html (category arrays) - CRITICAL
- Expanded testing checklist
- Added common pitfalls section
- Added unit formatting guide

**v1.0** (Dec 28, 2025)
- Initial comprehensive guide
- Core 11 files documented

---

## NOTES

- Always update files in the order listed
- Test after each phase, not just at the end
- Keep backups before making changes
- Category slugs are case-sensitive and must match everywhere
- The order of categories in arrays matters for daily challenge generation
- When in doubt, check existing categories for reference

---

**Questions? Issues? Debug Steps:**
1. Check browser console for errors
2. Verify slug spelling in all files
3. Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
4. Check that all closing tags are present
5. Verify file paths are correct
6. Confirm category ID is unique

---

**End of Guide**
