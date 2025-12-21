// js/top10-categories-loader.js
// Unified data loader for Top 10 mode - uses categories/*.js files

// Category ID mapping (moved from top10-data.js)
export const CATEGORY_ID_MAP = {
  population: 1,
  altitude: 2,
  gdp: 3,
  happiness: 4,
  forest: 5,
  coastline: 6,
  cuisine: 7,
  olympic: 8,
  worldcup: 9,
  landmass: 10,
  crimerate: 11,
  passport: 12,
  beer: 13,
  nobelprize: 14,
  temperature: 15,
  rainfall: 16
};

// Category configurations for Top 10 mode
const top10Config = {
  population: {
    title: "Population",
    emoji: "👥",
    unit: "M",
    dataFile: "population",
    dataKey: "populationData",
    valueField: "population",
    rankField: "populationRank",
    convertToMillions: true
  },
  gdp: {
    title: "GDP per Capita",
    emoji: "💰",
    unit: "USD",
    dataFile: "gdp",
    dataKey: "gdpData",
    valueField: "gdp",
    rankField: "gdpRank"
  },
  landmass: {
    title: "Landmass",
    emoji: "🗺️",
    unit: "km²",
    dataFile: "landmass",
    dataKey: "landmassData",
    valueField: "landmass",
    rankField: "landmassRank"
  },
  altitude: {
    title: "Highest Altitude",
    emoji: "⛰️",
    unit: "m",
    dataFile: "altitude",
    dataKey: "altitudeData",
    valueField: "altitude",
    rankField: "highestPointRank"
  },
  forest: {
    title: "Forest Coverage",
    emoji: "🌲",
    unit: "hectares",
    dataFile: "forest",
    dataKey: "forestData",
    valueField: "forest",
    rankField: "forestRank"
  },
  coastline: {
    title: "Coastline Length",
    emoji: "🏖️",
    unit: "km",
    dataFile: "coastline",
    dataKey: "coastlineData",
    valueField: "coastline",
    rankField: "coastlineRank"
  },
  passport: {
    title: "Passport Power",
    emoji: "🛂",
    unit: "countries",
    dataFile: "passport",
    dataKey: "passportData",
    valueField: "passport",
    rankField: "passportRank"
  },
  beer: {
    title: "Beer Consumption",
    emoji: "🍺",
    unit: "L",
    dataFile: "beer",
    dataKey: "beerData",
    valueField: "beer",
    rankField: "beerConsumptionRank"
  },
  nobelprize: {
    title: "Nobel Prizes",
    emoji: "🏅",
    unit: "prizes",
    dataFile: "nobelprize",
    dataKey: "nobelprizeData",
    valueField: "nobelprize",
    rankField: "nobelPrizeRank"
  },
  hightemp: {
    title: "Hottest Countries",
    emoji: "🌡️",
    unit: "°C",
    dataFile: "temperature",
    dataKey: "temperatureData",
    valueField: "temperature",
    rankField: "temperatureRank"
  },
  rainfall: {
    title: "Annual Rainfall",
    emoji: "🌧️",
    unit: "mm",
    dataFile: "rainfall",
    dataKey: "precipitationData",
    valueField: "rainfall",
    rankField: "precipitationRank"
  },
  crimerate: {
    title: "Crime Rate",
    emoji: "🚨",
    unit: "/100k",
    dataFile: "crimerate",
    dataKey: "crimerateData",
    valueField: "crimerate",
    rankField: "crimerateRank"
  },
  happiness: {
    title: "Happiness Index",
    emoji: "😊",
    unit: "/10",
    dataFile: "happiness",
    dataKey: "happinessData",
    valueField: "happiness",
    rankField: "happinessRank"
  },
  olympic: {
    title: "Olympic Medals",
    emoji: "🥇",
    unit: "medals",
    dataFile: "olympic",
    dataKey: "olympicData",
    valueField: "olympic",
    rankField: "olympicRank"
  },
  cuisine: {
    title: "Cuisine Quality",
    emoji: "🍽️",
    unit: "score",
    dataFile: "cuisine",
    dataKey: "cuisineData",
    valueField: "cuisine",
    rankField: "cuisineRank"
  },
  worldcup: {
    title: "World Cup Wins",
    emoji: "🏆",
    unit: "titles",
    dataFile: "worldcup",
    dataKey: "worldcupData",
    valueField: "worldcup",
    rankField: "worldcupRank"
  }
};

// Load category data from categories/*.js files
export async function loadTop10CategoryData(categoryKey) {
  const config = top10Config[categoryKey];
  
  if (!config) {
    throw new Error(`Invalid category: ${categoryKey}`);
  }
  
  try {
    // Dynamically import the category data
    const module = await import(`./categories/${config.dataFile}.js`);
    const data = module[config.dataKey];
    
    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid category data format');
    }
    
    // Transform to Top 10 format - get top 10 by rank
    const top10 = data
      .filter(country => country[config.rankField] <= 10)
      .sort((a, b) => a[config.rankField] - b[config.rankField])
      .slice(0, 10)
      .map(country => {
        let value = country[config.valueField];
        
        // Convert population to millions if needed
        if (config.convertToMillions) {
          value = parseFloat((value / 1000000).toFixed(2));
        }
        
        return {
          name: country.name,
          rank: country[config.rankField],
          code: country.code, // Now uses 2-letter ISO codes!
          flag: `flags/${country.code}.png`, // Correct flag path
          value: value
        };
      });
    
    return {
      title: config.title,
      emoji: config.emoji,
      unit: config.unit,
      countries: top10
    };
    
  } catch (error) {
    console.error('Error loading category data:', error);
    throw error;
  }
}

console.log('Top 10 categories loader ready');