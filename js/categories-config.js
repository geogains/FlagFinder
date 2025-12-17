// js/categories-config.js
// Configuration for VS mode categories

export const categoriesConfig = {
  landmass: {
    title: "Largest Landmass",
    emoji: "🗺️",
    unit: "km²",
    dataFile: "landmass",
    dataKey: "landmassData",
    valueField: "landmass",
    questionText: "WHICH COUNTRY HAS THE LARGEST LANDMASS?"
  },
  
  population: {
    title: "Population",
    emoji: "👥",
    unit: "M",
    dataFile: "population",
    dataKey: "populationData",
    valueField: "population",
    questionText: "WHICH COUNTRY HAS THE LARGEST POPULATION?"
  },
  
  gdp: {
    title: "GDP per Capita",
    emoji: "💰",
    unit: "USD",
    dataFile: "gdp",
    dataKey: "gdpData",
    valueField: "gdp",
    questionText: "WHICH COUNTRY HAS THE HIGHEST GDP PER CAPITA?"
  },
  
  altitude: {
    title: "Highest Altitude",
    emoji: "⛰️",
    unit: "m",
    dataFile: "altitude",
    dataKey: "altitudeData",
    valueField: "altitude",
    questionText: "WHICH COUNTRY HAS THE HIGHEST ALTITUDE?"
  },
  
  forest: {
    title: "Forest Coverage",
    emoji: "🌲",
    unit: "%",
    dataFile: "forest",
    dataKey: "forestData",
    valueField: "forest",
    questionText: "WHICH COUNTRY HAS MORE FOREST COVERAGE?"
  },
  
  coastline: {
    title: "Longest Coastline",
    emoji: "🌊",
    unit: "km",
    dataFile: "coastline",
    dataKey: "coastlineData",
    valueField: "coastline",
    questionText: "WHICH COUNTRY HAS THE LONGEST COASTLINE?"
  },
  
  olympic: {
    title: "Olympic Medals",
    emoji: "🏅",
    unit: "medals",
    dataFile: "olympic",
    dataKey: "olympicData",
    valueField: "olympic",
    questionText: "WHICH COUNTRY HAS MORE OLYMPIC MEDALS?"
  },
  
  worldcup: {
    title: "World Cup Trophies",
    emoji: "⚽",
    unit: "trophies",
    dataFile: "worldcup",
    dataKey: "worldcupData",
    valueField: "worldcup",
    questionText: "WHICH COUNTRY HAS MORE WORLD CUP TROPHIES?"
  },
  
  passport: {
    title: "Passport Power",
    emoji: "🛂",
    unit: "countries",
    dataFile: "passport",
    dataKey: "passportData",
    valueField: "passport",
    questionText: "WHICH COUNTRY HAS THE MOST POWERFUL PASSPORT?"
  },
  
  beer: {
    title: "Beer Consumption",
    emoji: "🍺",
    unit: "L",
    dataFile: "beer",
    dataKey: "beerData",
    valueField: "beer",
    questionText: "WHICH COUNTRY CONSUMES MORE BEER?"
  },
  
  nobelprize: {
    title: "Nobel Prizes",
    emoji: "🏆",
    unit: "prizes",
    dataFile: "nobelprize",
    dataKey: "nobelprizeData",
    valueField: "nobelprize",
    questionText: "WHICH COUNTRY HAS MORE NOBEL PRIZES?"
  },
  
  temperature: {
    title: "Average Temperature",
    emoji: "🌡️",
    unit: "°C",
    dataFile: "temperature",
    dataKey: "temperatureData",
    valueField: "temperature",
    questionText: "WHICH COUNTRY HAS A HIGHER AVERAGE TEMPERATURE?"
  },
  
  rainfall: {
    title: "Annual Rainfall",
    emoji: "🌧️",
    unit: "mm",
    dataFile: "rainfall",
    dataKey: "rainfallData",
    valueField: "rainfall",
    questionText: "WHICH COUNTRY HAS MORE ANNUAL RAINFALL?"
  },
  
  crimerate: {
    title: "Crime Rate",
    emoji: "🚨",
    unit: "/100k",
    dataFile: "crimerate",
    dataKey: "crimerateData",
    valueField: "crimerate",
    questionText: "WHICH COUNTRY HAS A HIGHER CRIME RATE?"
  },
  
  happiness: {
    title: "Happiness Index",
    emoji: "😊",
    unit: "/10",
    dataFile: "happiness",
    dataKey: "happinessData",
    valueField: "happiness",
    questionText: "WHICH COUNTRY HAS A HIGHER HAPPINESS INDEX?"
  },
  
  cuisine: {
    title: "Cuisine Score",
    emoji: "🍽️",
    unit: "score",
    dataFile: "cuisine",
    dataKey: "cuisineData",
    valueField: "cuisine",
    questionText: "WHICH COUNTRY HAS A HIGHER CUISINE SCORE?"
  }
};

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