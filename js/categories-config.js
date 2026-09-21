// js/categories-config.js
// Central configuration for all game categories

export const categoriesConfig = {
  landmass: {
    title: "Landmass",
    emoji: "🗺️",
    unit: "km²",
    dataFile: "landmass",
    dataKey: "landmassData",
    valueField: "landmass",
    questionText: "WHICH COUNTRY HAS THE LARGEST LANDMASS?",
    description: "Rank countries by total land area, from the largest nations on Earth down to the smallest.",
    premium: false,
    image: "landmass.jpg"
  },

  population: {
    title: "Population",
    emoji: "👥",
    unit: "M",
    dataFile: "population",
    dataKey: "populationData",
    valueField: "population",
    questionText: "WHICH COUNTRY HAS THE LARGEST POPULATION?",
    description: "Rank countries by total population, from the world's most populous nations to smaller states.",
    convertToMillions: true,
    premium: false,
    image: "population.jpg"
  },

  gdp: {
    title: "GDP per Capita",
    emoji: "💰",
    unit: "USD",
    dataFile: "gdp",
    dataKey: "gdpData",
    valueField: "gdp",
    questionText: "WHICH COUNTRY HAS THE HIGHEST GDP PER CAPITA?",
    description: "Rank countries by the size of their economy per person, using GDP per capita.",
    premium: false,
    image: "gdp.jpg"
  },

  altitude: {
    title: "Highest Altitude",
    emoji: "⛰️",
    unit: "m",
    dataFile: "altitude",
    dataKey: "altitudeData",
    valueField: "altitude",
    questionText: "WHICH COUNTRY HAS THE HIGHEST ALTITUDE?",
    description: "Rank countries by the elevation of their highest peak above sea level.",
    premium: false,
    image: "altitude.jpg"
  },

  forest: {
    title: "Forest Coverage",
    emoji: "🌲",
    unit: "Hectares",
    dataFile: "forest",
    dataKey: "forestData",
    valueField: "forest",
    questionText: "WHICH COUNTRY HAS MORE HECTARES OF FOREST COVERAGE?",
    description: "Rank countries by how much of their land area is covered in forest.",
    premium: false,
    image: "forest.jpg"
  },

  olympic: {
    title: "Olympic Medals",
    emoji: "🏅",
    unit: "medals",
    dataFile: "olympic",
    dataKey: "olympicData",
    valueField: "olympic",
    questionText: "WHICH COUNTRY HAS THE MOST OLYMPIC MEDALS?",
    description: "Rank countries by total all-time Olympic medals, combining Summer and Winter Games.",
    premium: false,
    image: "olympic.jpg"
  },

  passport: {
    title: "Passport Power",
    emoji: "🛂",
    unit: "countries",
    dataFile: "passport",
    dataKey: "passportData",
    valueField: "passportstrength",
    questionText: "WHICH COUNTRY HAS THE MOST POWERFUL PASSPORT?",
    description: "Rank countries by passport strength — how many destinations their citizens can enter visa-free.",
    premium: false,
    image: "passport.jpg"
  },

  beer: {
    title: "Beer Consumption",
    emoji: "🍺",
    unit: "L",
    dataFile: "beer",
    dataKey: "beerData",
    valueField: "beer",
    questionText: "WHICH COUNTRY CONSUMES MORE BEER PER CAPITA?",
    description: "Rank countries by average annual beer consumption per person.",
    premium: false,
    image: "beer.jpg"
  },

  // --- PREMIUM CATEGORIES ---

  bigmac: {
    title: "BigMac Price",
    emoji: "🍔",
    unit: "USD",
    dataFile: "bigmac",
    dataKey: "bigmacData",
    valueField: "bigMacPrice",
    questionText: "WHICH COUNTRY HAS A MORE EXPENSIVE BIG MAC?",
    description: "Rank countries by the price of a Big Mac, converted to USD.",
    premium: true,
    image: "bigmac.jpg"
  },

  carexports: {
    title: "Car Exports",
    emoji: "🚗",
    unit: "$B",
    dataFile: "carexports",
    dataKey: "carexportsData",
    valueField: "carExportsUsdB",
    questionText: "WHICH COUNTRY EXPORTS MORE CARS?",
    description: "Rank countries by the total value of automobiles they export each year.",
    premium: true,
    image: "carexports.jpg"
  },

  coastline: {
    title: "Longest Coastline",
    emoji: "🏝️",
    unit: "km",
    dataFile: "coastline",
    dataKey: "coastlineData",
    valueField: "coastline",
    questionText: "WHICH COUNTRY HAS THE LONGEST COASTLINE?",
    description: "Rank countries by total coastline length, including islands, inlets and fjords.",
    premium: true,
    image: "coastline.jpg"
  },

  crimerate: {
    title: "Crime Rate",
    emoji: "🚨",
    unit: "/100k",
    dataFile: "crimerate",
    dataKey: "crimerateData",
    valueField: "crimerate",
    questionText: "WHICH COUNTRY HAS A HIGHER CRIME RATE?",
    description: "Rank countries by crime index score, combining reported crime and perceived safety.",
    premium: true,
    image: "crimerate.jpg"
  },

  cuisine: {
    title: "Cuisine Score",
    emoji: "🍽️",
    unit: "score",
    dataFile: "cuisine",
    dataKey: "cuisineData",
    valueField: "cuisine",
    questionText: "WHICH COUNTRY HAS A HIGHER CUISINE RATING?",
    description: "Rank countries by global cuisine influence and international popularity.",
    premium: true,
    image: "cuisine.jpg"
  },

  density: {
    title: "Population Density",
    emoji: "👨‍👩‍👧‍👦",
    unit: "per km²",
    dataFile: "density",
    dataKey: "densityData",
    valueField: "density",
    questionText: "WHICH COUNTRY HAS HIGHER POPULATION DENSITY?",
    description: "Rank countries by population density — how many people live per square kilometre.",
    premium: true,
    image: "density.jpg"
  },

  disasterrisk: {
    title: "Natural Disasters",
    emoji: "🌪️",
    unit: "risk index",
    dataFile: "disasterrisk",
    dataKey: "disasterRiskData",
    valueField: "disasterrisk",
    questionText: "WHICH COUNTRY HAS HIGHER NATURAL DISASTER RISK?",
    description: "Rank countries by natural disaster risk index, combining hazard exposure and vulnerability.",
    premium: true,
    image: "disasterrisk.jpg"
  },

  flamingo: {
    title: "Flamingos",
    emoji: "🦩",
    unit: "flamingos",
    dataFile: "flamingo",
    dataKey: "flamingoData",
    valueField: "flamingos",
    questionText: "WHICH COUNTRY HAS MORE FLAMINGOS?",
    description: "Rank countries by the size of their wild flamingo population.",
    premium: true,
    image: "flamingo.jpg"
  },

  gm: {
    title: "Grandmasters",
    emoji: "♟️",
    unit: "grandmasters",
    dataFile: "gm",
    dataKey: "chessGMData",
    valueField: "grandmasters",
    questionText: "WHICH COUNTRY HAS MORE CHESS GRANDMASTERS?",
    description: "Rank countries by the number of FIDE-titled chess grandmasters they've produced.",
    premium: true,
    image: "gm.jpg"
  },

  happiness: {
    title: "Happiness Index",
    emoji: "😊",
    unit: "/10",
    dataFile: "happiness",
    dataKey: "happinessData",
    valueField: "happiness",
    questionText: "WHICH COUNTRY HAS A HIGHER HAPPINESS INDEX?",
    description: "Rank countries by World Happiness Report score, based on wellbeing and quality of life.",
    premium: true,
    image: "happiness.jpg"
  },

  lifeexpectancy: {
    title: "Life Expectancy",
    emoji: "🤍",
    unit: "Years",
    dataFile: "lifeexpectancy",
    dataKey: "lifeexpectancyData",
    valueField: "lifeExpectancy",
    questionText: "WHICH COUNTRY HAS HIGHER LIFE EXPECTANCY?",
    description: "Rank countries by average life expectancy at birth.",
    premium: true,
    image: "lifeexpectancy.jpg"
  },

  longestriver: {
    title: "Longest River",
    emoji: "🌊",
    unit: "km",
    dataFile: "longestriver",
    dataKey: "longestriverData",
    valueField: "longestriver",
    questionText: "WHICH COUNTRY HAS A LONGER RIVER?",
    description: "Rank countries by the length of their longest river.",
    premium: true,
    image: "longestriver.jpg"
  },

  marriageage: {
    title: "Marriage Age",
    emoji: "💍",
    unit: "years",
    dataFile: "marriageage",
    dataKey: "marriageageData",
    valueField: "marriageAge",
    questionText: "WHICH COUNTRY HAS A HIGHER MARRIAGE AGE?",
    description: "Rank countries by the average age at first marriage.",
    premium: true,
    image: "marriageage.jpg"
  },

  michelin: {
    title: "Michelin Stars",
    emoji: "⭐",
    unit: "Restaurants",
    dataFile: "michelin",
    dataKey: "michelinData",
    valueField: "michelinTotal",
    questionText: "WHICH COUNTRY HAS MORE MICHELIN STARRED RESTAURANTS?",
    description: "Rank countries by the number of Michelin-starred restaurants they're home to.",
    premium: true,
    image: "michelin.jpg"
  },

  militarypersonel: {
    title: "Military Personnel",
    emoji: "🪖",
    unit: "",
    dataFile: "militarypersonel",
    dataKey: "militaryPersonnelData",
    valueField: "personnel",
    questionText: "WHICH COUNTRY HAS MORE MILITARY PERSONNEL?",
    description: "Rank countries by the number of active-duty military personnel.",
    premium: true,
    image: "militarypersonel.jpg"
  },

  millionaires: {
    title: "Millionaires",
    emoji: "💰",
    unit: "millionaires",
    dataFile: "millionaires",
    dataKey: "millionaireData",
    valueField: "millionaires",
    questionText: "WHICH COUNTRY HAS MORE MILLIONAIRES?",
    description: "Rank countries by the total number of USD millionaires.",
    premium: true,
    image: "millionaires.jpg"
  },

  nobelprize: {
    title: "Nobel Prizes",
    emoji: "🕊️",
    unit: "prizes",
    dataFile: "nobelprize",
    dataKey: "nobelprizeData",
    valueField: "nobelprize",
    questionText: "WHICH COUNTRY HAS WON MORE NOBEL PRIZES?",
    description: "Rank countries by the total number of Nobel Prizes won across all categories.",
    premium: true,
    image: "nobelprize.jpg"
  },

  poorestgdp: {
    title: "Poorest Countries",
    emoji: "📉",
    unit: "$",
    dataFile: "poorestgdp",
    dataKey: "poorestgdpData",
    valueField: "gdpPerCapita",
    questionText: "WHICH COUNTRY HAS LOWER GDP PER CAPITA?",
    description: "Rank countries from lowest to highest GDP per capita — the inverse of the standard GDP ranking.",
    premium: true,
    image: "poorestgdp.jpg"
  },

  precipitation: {
    title: "Rainfall",
    emoji: "🌧️",
    unit: "mm",
    dataFile: "rainfall",
    dataKey: "precipitationData",
    valueField: "rainfall",
    questionText: "WHICH COUNTRY HAS MORE ANNUAL RAINFALL?",
    description: "Rank countries by average annual rainfall.",
    premium: true,
    image: "precipitation.jpg"
  },

  // ALIAS for precipitation (legacy key used in URLs and daily challenge)
  rainfall: {
    title: "Rainfall",
    emoji: "🌧️",
    unit: "mm",
    dataFile: "rainfall",
    dataKey: "precipitationData",
    valueField: "rainfall",
    questionText: "WHICH COUNTRY HAS MORE ANNUAL RAINFALL?",
    description: "Rank countries by average annual rainfall.",
    premium: true,
    image: "rainfall.jpg"
  },

  renewableenergy: {
    title: "Renewable Energy",
    emoji: "♻️",
    unit: "%",
    dataFile: "renewableenergy",
    dataKey: "renewableShareData",
    valueField: "sharepercent",
    questionText: "WHICH COUNTRY HAS A HIGHER % OF RENEWABLE ENERGY USAGES?",
    description: "Rank countries by the share of their electricity generated from renewable sources.",
    premium: true,
    image: "renewableenergy.jpg"
  },

  rent: {
    title: "Rent Prices",
    emoji: "🏠",
    unit: "$",
    dataFile: "rent",
    dataKey: "rentData",
    valueField: "rentUsd",
    questionText: "WHICH COUNTRY HAS HIGHER CAPTAL CITY RENT PRICES?",
    description: "Rank countries by average city-centre rent prices, converted to USD.",
    premium: true,
    image: "rent.jpg"
  },

  sexratio: {
    title: "Gender Ratio",
    emoji: "⚖️",
    unit: "ratio",
    dataFile: "sexratio",
    dataKey: "sexratioData",
    valueField: "sexRatio",
    questionText: "WHICH COUNTRY HAS A MORE MALES PER 100 FEMALES?",
    description: "Rank countries by male-to-female ratio, measured as males per 100 females.",
    premium: true,
    image: "sexratio.jpg"
  },

  tallestbuilding: {
    title: "Tallest Building",
    emoji: "🏙️",
    unit: "m",
    dataFile: "tallestbuilding",
    dataKey: "tallestbuildingData",
    valueField: "height",
    questionText: "WHICH COUNTRY HAS THE TALLEST BUILDING?",
    description: "Rank countries by the height of their tallest building.",
    premium: true,
    image: "tallestbuilding.jpg"
  },

  temperature: {
    title: "Highest Temp",
    emoji: "☀️",
    unit: "°C",
    dataFile: "temperature",
    dataKey: "temperatureData",
    valueField: "temperature",
    questionText: "WHICH COUNTRY HAS A HIGHER AVERAGE TEMPERATURE?",
    description: "Rank countries by average annual temperature.",
    premium: true,
    image: "hightemp.jpg"  // image file is named hightemp.jpg
  },

  // ALIAS for temperature (legacy key used in URLs and daily challenge)
  hightemp: {
    title: "Highest Temp",
    emoji: "☀️",
    unit: "°C",
    dataFile: "temperature",
    dataKey: "temperatureData",
    valueField: "temperature",
    questionText: "WHICH COUNTRY HAS A HIGHER AVERAGE TEMPERATURE?",
    description: "Rank countries by average annual temperature.",
    premium: true,
    image: "hightemp.jpg"
  },

  tourism: {
    title: "Tourist Visits",
    emoji: "✈️",
    unit: "M Tourists",
    dataFile: "tourism",
    dataKey: "tourismData",
    valueField: "touristArrivals",
    questionText: "WHICH COUNTRY RECEIVED MORE TOURISTS IN 2025?",
    description: "Rank countries by the number of international tourist arrivals per year.",
    premium: true,
    image: "tourism.jpg"
  },

  university: {
    title: "Universities",
    emoji: "🎓",
    unit: "universities",
    dataFile: "university",
    dataKey: "universityData",
    valueField: "university",
    questionText: "WHICH COUNTRY HAS MORE UNIVERSITIES?",
    description: "Rank countries by the number of universities appearing in global league tables.",
    premium: true,
    image: "university.jpg"
  },

  volcano: {
    title: "Volcanoes",
    emoji: "🌋",
    unit: "volcanoes",
    dataFile: "volcano",
    dataKey: "volcanoData",
    valueField: "volcanos",
    questionText: "WHICH COUNTRY HAS MORE VOLCANOES?",
    description: "Rank countries by the number of active volcanoes within their borders.",
    premium: true,
    image: "volcano.jpg"
  },

  worldcup: {
    title: "World Cup Trophies",
    emoji: "⚽",
    unit: "trophies",
    dataFile: "worldcup",
    dataKey: "worldcupData",
    valueField: "worldcup",
    questionText: "WHICH COUNTRY HAS THE MOST WORLD CUP TROPHIES?",
    description: "Rank countries by total FIFA World Cup titles won.",
    premium: false,
    image: "worldcup.jpg"
  },

  f1: {
    title: "F1 Championships",
    emoji: "🏎️",
    unit: "titles",
    dataFile: "f1",
    dataKey: "f1Data",
    valueField: "f1",
    questionText: "WHICH COUNTRY HAS MORE FORMULA 1 WORLD DRIVERS' CHAMPIONSHIPS?",
    description: "Rank countries by Formula 1 World Drivers' Championship titles won by their drivers.",
    premium: true,
    image: "f1.jpg"
  },

  worldcupgoals: {
    title: "World Cup Goals",
    emoji: "⚽",
    unit: "goals",
    dataFile: "worldcupgoals",
    dataKey: "worldCupGoalsScoredData",
    valueField: "goalsScored",
    questionText: "WHICH COUNTRY HAS SCORED MORE WORLD CUP GOALS?",
    description: "Rank countries by total goals scored across all FIFA World Cup tournaments.",
    premium: true,
    image: "worldcupgoals.jpg"
  },

  worldcupappearances: {
    title: "World Cup Appearances",
    emoji: "⚽",
    unit: "appearances",
    dataFile: "worldcupappearances",
    dataKey: "worldCupAppearancesData",
    valueField: "appearances",
    questionText: "WHICH COUNTRY HAS MORE WORLD CUP APPEARANCES?",
    description: "Rank countries by the number of FIFA World Cup final-tournament appearances.",
    premium: true,
    image: "worldcupappearances.jpg"
  },

  worldcupwins: {
    title: "World Cup Wins",
    emoji: "⚽",
    unit: "wins",
    dataFile: "worldcupwins",
    dataKey: "worldCupWinsData",
    valueField: "wins",
    questionText: "WHICH COUNTRY HAS WON MORE WORLD CUP MATCHES?",
    description: "Rank countries by total individual match wins at FIFA World Cup tournaments.",
    premium: true,
    image: "worldcupwins.jpg"
  }
};

// Derive tier from the premium boolean.
// When light-tier categories are assigned, add tier: 'light' explicitly to those
// entries — this loop will leave explicitly-set values alone (see condition below).
for (const cat of Object.values(categoriesConfig)) {
  if (!cat.tier) cat.tier = cat.premium ? 'premium' : 'free';
}

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
  hightemp: 15,  // ALIAS - maps to same ID as temperature
  rainfall: 16,
  precipitation: 16,  // ALIAS - maps to same ID as rainfall
  tourism: 17,
  michelin: 18,
  bigmac: 19,
  lifeexpectancy: 20,
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
  f1: 37,
  worldcupgoals: 38,
  worldcupappearances: 39,
  worldcupwins: 40,
};
