// rerank-passport.js
import { passportData } from './js/categories/passport.js';
import fs from 'fs';

// Sort by strength (descending), then alphabetically
const sorted = [...passportData].sort((a, b) => {
  if (b.passportstrength !== a.passportstrength) {
    return b.passportstrength - a.passportstrength;
  }
  return a.name.localeCompare(b.name);
});

// Assign sequential ranks
sorted.forEach((country, index) => {
  country.passportRank = index + 1;
});

// Generate new file content
const output = `export const passportData = [\n${sorted.map(c => 
  `  { name: '${c.name}', code: '${c.code}', passportRank: ${c.passportRank}, passportstrength: ${c.passportstrength}, tieGroup: ${c.tieGroup} }`
).join(',\n')}\n];`;

fs.writeFileSync('./js/categories/passport.js', output);
console.log('✅ Passport ranks updated with alphabetical tiebreaking!');