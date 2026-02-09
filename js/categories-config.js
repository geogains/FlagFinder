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
  questionText: "WHICH COUNTRY HAS THE LARGEST POPULATION?",
  convertToMillions: true
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
    unit: "Hectares",
    dataFile: "forest",
    dataKey: "forestData",
    valueField: "forest",
    questionText: "WHICH COUNTRY HAS MORE HECTARES OF FOREST COVERAGE?"
  },
  
  coastline: {
    title: "Longest Coastline",
    emoji: "🏝️",
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
    questionText: "WHICH COUNTRY HAS THE MOST OLYMPIC MEDALS?"
  },
  
  worldcup: {
    title: "World Cup Trophies",
    emoji: "⚽",
    unit: "trophies",
    dataFile: "worldcup",
    dataKey: "worldcupData",
    valueField: "worldcup",
    questionText: "WHICH COUNTRY HAS THE MOST WORLD CUP TROPHIES?"
  },
  
  passport: {
    title: "Passport Power",
    emoji: "🛂",
    unit: "countries",
    dataFile: "passport",
    dataKey: "passportData",
    valueField: "passportstrength",
    questionText: "WHICH COUNTRY HAS THE MOST POWERFUL PASSPORT?"
  },
  
  beer: {
    title: "Beer Consumption",
    emoji: "🍺",
    unit: "L",
    dataFile: "beer",
    dataKey: "beerData",
    valueField: "beer",
    questionText: "WHICH COUNTRY CONSUMES MORE BEER PER CAPITA?"
  },
  
  nobelprize: {
    title: "Nobel Prizes",
    emoji: "🕊️",
    unit: "prizes",
    dataFile: "nobelprize",
    dataKey: "nobelprizeData",
    valueField: "nobelprize",
    questionText: "WHICH COUNTRY HAS WON MORE NOBEL PRIZES?"
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
  
  // ✅ ALIAS for temperature (used by daily challenge and other parts of the app)
  hightemp: {
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
    dataKey: "precipitationData",
    valueField: "rainfall",
    questionText: "WHICH COUNTRY HAS MORE ANNUAL RAINFALL?"
  },
  precipitation: {  // ✅ ALIAS for rainfall
    title: "Annual Rainfall",
    emoji: "🌧️",
    unit: "mm",
    dataFile: "rainfall",
    dataKey: "precipitationData",
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
    questionText: "WHICH COUNTRY HAS A HIGHER CUISINE RATING?"
  },

  tourism: {
  title: "Tourist Visits",
  emoji: "✈️",
  unit: "M Tourists",
  dataFile: "tourism",
  dataKey: "tourismData",
  valueField: "touristArrivals",
  questionText: "WHICH COUNTRY RECEIVED MORE TOURISTS IN 2025?"
},

michelin: {
  title: "Michelin Restaurants",
  emoji: "⭐",
  unit: "Restaurants",
  dataFile: "michelin",
  dataKey: "michelinData",
  valueField: "michelinTotal",
  questionText: "WHICH COUNTRY HAS MORE MICHELIN STARRED RESTAURANTS?"
},
bigmac: {
  title: "BigMac Price",
  emoji: "🍔",
  unit: "USD",
  dataFile: "bigmac",
  dataKey: "bigmacData",
  valueField: "bigMacPrice",
  questionText: "WHICH COUNTRY HAS A MORE EXPENSIVE BIG MAC?"
},
lifeexpectancy: {
  title: "Life Expectancy",
  emoji: "🤍",
  unit: "Years",
  dataFile: "lifeexpectancy",
  dataKey: "lifeexpectancyData",
  valueField: "lifeExpectancy",
  questionText: "WHICH COUNTRY HAS HIGHER LIFE EXPECTANCY?"
},
// NEW CATEGORIES
marriageage: {
  title: "Marriage Age",
  emoji: "💍",
  unit: "years",
  dataFile: "marriageage",
  dataKey: "marriageageData",
  valueField: "marriageAge",
  questionText: "WHICH COUNTRY HAS A HIGHER MARRIAGE AGE?"
},
sexratio: {
  title: "Gender Ratio",
  emoji: "⚖️",
  unit: "ratio",
  dataFile: "sexratio",
  dataKey: "sexratioData",
  valueField: "sexRatio",
  questionText: "WHICH COUNTRY HAS A MORE MALES PER 100 FEMALES?"
},
tallestbuilding: {
  title: "Tallest Building",
  emoji: "🏙️",
  unit: "m",
  dataFile: "tallestbuilding",
  dataKey: "tallestbuildingData",
  valueField: "height",
  questionText: "WHICH COUNTRY HAS THE TALLEST BUILDING?"
},
density: {
  title: "Population Density",
  emoji: "👨‍👩‍👧‍👦",
  unit: "per km²",
  dataFile: "density",
  dataKey: "densityData",
  valueField: "density",
  questionText: "WHICH COUNTRY HAS HIGHER POPULATION DENSITY?"
},
carexports: {
  title: "Car Exports",
  emoji: "🚗",
  unit: "$B",
  dataFile: "carexports",
  dataKey: "carexportsData",
  valueField: "carExportsUsdB",
  questionText: "WHICH COUNTRY EXPORTS MORE CARS?"
},
militarypersonel: {
  title: "Military Personnel",
  emoji: "🪖",
  unit: "",
  dataFile: "militarypersonel",
  dataKey: "militaryPersonnelData",
  valueField: "personnel",
  questionText: "WHICH COUNTRY HAS MORE MILITARY PERSONNEL?"
},
rent: {
  title: "Rent Prices",
  emoji: "🏠",
  unit: "$",
  dataFile: "rent",
  dataKey: "rentData",
  valueField: "rentUsd",
  questionText: "WHICH COUNTRY HAS HIGHER CAPTAL CITY RENT PRICES?"
},
poorestgdp: {
  title: "Poorest Countries",
  emoji: "📉",
  unit: "$",
  dataFile: "poorestgdp",
  dataKey: "poorestgdpData",
  valueField: "gdpPerCapita",
  questionText: "WHICH COUNTRY HAS LOWER GDP PER CAPITA?"
},
university: {
  title: "Universities",
  emoji: "🎓",
  unit: "universities",
  dataFile: "university",
  dataKey: "universityData",
  valueField: "university",
  questionText: "WHICH COUNTRY HAS MORE UNIVERSITIES?"
},
volcano: {
  title: "Volcanoes",
  emoji: "🌋",
  unit: "volcanoes",
  dataFile: "volcano",
  dataKey: "volcanoData",
  valueField: "volcanos",
  questionText: "WHICH COUNTRY HAS MORE VOLCANOES?"
},
flamingo: {
  title: "Flamingos",
  emoji: "🦩",
  unit: "flamingos",
  dataFile: "flamingo",
  dataKey: "flamingoData",
  valueField: "flamingos",
  questionText: "WHICH COUNTRY HAS MORE FLAMINGOS?"
},
disasterrisk: {
  title: "Natural Disasters",
  emoji: "🌪️",
  unit: "risk index",
  dataFile: "disasterrisk",
  dataKey: "disasterRiskData",
  valueField: "disasterrisk",
  questionText: "WHICH COUNTRY HAS HIGHER NATURAL DISASTER RISK?"
},
longestriver: {
  title: "Longest River",
  emoji: "🌊",
  unit: "km",
  dataFile: "longestriver",
  dataKey: "longestriverData",
  valueField: "longestriver",
  questionText: "WHICH COUNTRY HAS A LONGER RIVER?"
},
renewableenergy: {
  title: "Renewable Energy",
  emoji: "♻️",
  unit: "%",
  dataFile: "renewableenergy",
  dataKey: "renewableShareData",
  valueField: "sharepercent",
  questionText: "WHICH COUNTRY HAS A HIGHER % OF RENEWABLE ENERGY USAGES?"
},
millionaires: {
  title: "Millionaires",
  emoji: "💰",
  unit: "millionaires",
  dataFile: "millionaires",
  dataKey: "millionaireData",
  valueField: "millionaires",
  questionText: "WHICH COUNTRY HAS MORE MILLIONAIRES?"
},
gm: {
  title: "Chess Grandmasters",
  emoji: "♟️",
  unit: "grandmasters",
  dataFile: "gm",
  dataKey: "chessGMData",
  valueField: "grandmasters",
  questionText: "WHICH COUNTRY HAS MORE CHESS GRANDMASTERS?"
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
  hightemp: 15,  // ✅ ALIAS - maps to same ID as temperature
  rainfall: 16,
  precipitation: 16,  // ✅ ALIAS - maps to same ID as rainfall
  tourism: 17,
  michelin: 18,
  bigmac: 19,
  lifeexpectancy: 20,
  // NEW CATEGORIES
  marriageage: 21,
  sexratio: 22,
  tallestbuilding: 23,
  density: 24,
  carexports: 25,
  militarypersonel: 26,
  rent: 27,
  poorestgdp: 28,
  university: 29,
  volcano: 30,
  flamingo: 31,
  disasterrisk: 32,
  longestriver: 33,
  renewableenergy: 34,
  millionaires: 35,
  gm: 36,
};