// js/top10-data.js
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
  precipitation: 16
};

export const top10Data = {
  population: {
    title: "Population",
    emoji: "👥",
    unit: "M", // Million
    countries: [
      { name: "China", rank: 1, code: "china", flag: "china.png", value: 1425.9 },
      { name: "India", rank: 2, code: "india", flag: "india.png", value: 1428.6 },
      { name: "United States", rank: 3, code: "united-states", flag: "united-states.png", value: 339.9 },
      { name: "Indonesia", rank: 4, code: "indonesia", flag: "indonesia.png", value: 277.5 },
      { name: "Pakistan", rank: 5, code: "pakistan", flag: "pakistan.png", value: 240.5 },
      { name: "Nigeria", rank: 6, code: "nigeria", flag: "nigeria.png", value: 223.8 },
      { name: "Brazil", rank: 7, code: "brazil", flag: "brazil.png", value: 216.4 },
      { name: "Bangladesh", rank: 8, code: "bangladesh", flag: "bangladesh.png", value: 172.9 },
      { name: "Russia", rank: 9, code: "russia", flag: "russia.png", value: 144.4 },
      { name: "Mexico", rank: 10, code: "mexico", flag: "mexico.png", value: 128.5 }
    ]
  },

  gdp: {
    title: "GDP per Capita",
    emoji: "💰",
    unit: "USD",
    countries: [
      { name: "Luxembourg", rank: 1, code: "luxembourg", flag: "luxembourg.png", value: 126426 },
      { name: "Ireland", rank: 2, code: "ireland", flag: "ireland.png", value: 106059 },
      { name: "Norway", rank: 3, code: "norway", flag: "norway.png", value: 94660 },
      { name: "Switzerland", rank: 4, code: "switzerland", flag: "switzerland.png", value: 91932 },
      { name: "Qatar", rank: 5, code: "qatar", flag: "qatar.png", value: 84515 },
      { name: "United States", rank: 6, code: "united-states", flag: "united-states.png", value: 80035 },
      { name: "Singapore", rank: 7, code: "singapore", flag: "singapore.png", value: 72794 },
      { name: "Denmark", rank: 8, code: "denmark", flag: "denmark.png", value: 68300 },
      { name: "Australia", rank: 9, code: "australia", flag: "australia.png", value: 64675 },
      { name: "Iceland", rank: 10, code: "iceland", flag: "iceland.png", value: 64621 }
    ]
  },

  landmass: {
    title: "Landmass",
    emoji: "🗺️",
    unit: "km²",
    countries: [
      { name: "Russia", rank: 1, code: "russia", flag: "russia.png", value: 17098246 },
      { name: "Canada", rank: 2, code: "canada", flag: "canada.png", value: 9984670 },
      { name: "China", rank: 3, code: "china", flag: "china.png", value: 9596961 },
      { name: "United States", rank: 4, code: "united-states", flag: "united-states.png", value: 9525067 },
      { name: "Brazil", rank: 5, code: "brazil", flag: "brazil.png", value: 8515767 },
      { name: "Australia", rank: 6, code: "australia", flag: "australia.png", value: 7692024 },
      { name: "India", rank: 7, code: "india", flag: "india.png", value: 3287263 },
      { name: "Argentina", rank: 8, code: "argentina", flag: "argentina.png", value: 2780400 },
      { name: "Kazakhstan", rank: 9, code: "kazakhstan", flag: "kazakhstan.png", value: 2724900 },
      { name: "Algeria", rank: 10, code: "algeria", flag: "algeria.png", value: 2381741 }
    ]
  },

  nobelprize: {
    title: "Nobel Prizes",
    emoji: "🏅",
    unit: "prizes",
    countries: [
      { name: "United States", rank: 1, code: "united-states", flag: "united-states.png", value: 403 },
      { name: "United Kingdom", rank: 2, code: "united-kingdom", flag: "united-kingdom.png", value: 137 },
      { name: "Germany", rank: 3, code: "germany", flag: "germany.png", value: 115 },
      { name: "France", rank: 4, code: "france", flag: "france.png", value: 71 },
      { name: "Sweden", rank: 5, code: "sweden", flag: "sweden.png", value: 33 },
      { name: "Japan", rank: 6, code: "japan", flag: "japan.png", value: 29 },
      { name: "Russia", rank: 7, code: "russia", flag: "russia.png", value: 27 },
      { name: "Canada", rank: 8, code: "canada", flag: "canada.png", value: 27 },
      { name: "Switzerland", rank: 9, code: "switzerland", flag: "switzerland.png", value: 27 },
      { name: "Netherlands", rank: 10, code: "netherlands", flag: "netherlands.png", value: 22 }
    ]
  },

  temperature: {
    title: "Hottest Countries",
    emoji: "🌡️",
    unit: "°C",
    countries: [
      { name: "United Arab Emirates", rank: 1, code: "united-arab-emirates", flag: "united-arab-emirates.png", value: 28.2 },
      { name: "Djibouti", rank: 2, code: "djibouti", flag: "djibouti.png", value: 28.0 },
      { name: "Gambia", rank: 3, code: "gambia", flag: "gambia.png", value: 27.8 },
      { name: "Maldives", rank: 4, code: "maldives", flag: "maldives.png", value: 27.7 },
      { name: "Guinea-Bissau", rank: 5, code: "guinea-bissau", flag: "guinea-bissau.png", value: 27.4 },
      { name: "Singapore", rank: 6, code: "singapore", flag: "singapore.png", value: 27.3 },
      { name: "Saint Kitts & Nevis", rank: 7, code: "saint-kitts-and-nevis", flag: "saint-kitts-and-nevis.png", value: 27.2 },
      { name: "Thailand", rank: 8, code: "thailand", flag: "thailand.png", value: 27.1 },
      { name: "Bahamas", rank: 9, code: "bahamas", flag: "bahamas.png", value: 26.9 },
      { name: "Bangladesh", rank: 10, code: "bangladesh", flag: "bangladesh.png", value: 26.8 }
    ]
  },

  precipitation: {
    title: "Rainfall",
    emoji: "🌧️",
    unit: "mm/year",
    countries: [
      { name: "Micronesia", rank: 1, code: "micronesia", flag: "micronesia.png", value: 4000 },
      { name: "Palau", rank: 2, code: "palau", flag: "palau.png", value: 3700 },
      { name: "Fiji", rank: 3, code: "fiji", flag: "fiji.png", value: 3000 },
      { name: "Costa Rica", rank: 4, code: "costa-rica", flag: "costa-rica.png", value: 2926 },
      { name: "Papua New Guinea", rank: 5, code: "papua-new-guinea", flag: "papua-new-guinea.png", value: 2800 },
      { name: "Malaysia", rank: 6, code: "malaysia", flag: "malaysia.png", value: 2875 },
      { name: "Indonesia", rank: 7, code: "indonesia", flag: "indonesia.png", value: 2702 },
      { name: "Belize", rank: 8, code: "belize", flag: "belize.png", value: 1705 },
      { name: "Vanuatu", rank: 9, code: "vanuatu", flag: "vanuatu.png", value: 2362 },
      { name: "Philippines", rank: 10, code: "philippines", flag: "philippines.png", value: 2348 }
    ]
  },

  crimerate: {
    title: "Crime Rate",
    emoji: "🚨",
    unit: "index",
    countries: [
      { name: "Venezuela", rank: 1, code: "venezuela", flag: "venezuela.png", value: 83.76 },
      { name: "Papua New Guinea", rank: 2, code: "papua-new-guinea", flag: "papua-new-guinea.png", value: 80.79 },
      { name: "South Africa", rank: 3, code: "south-africa", flag: "south-africa.png", value: 76.86 },
      { name: "Afghanistan", rank: 4, code: "afghanistan", flag: "afghanistan.png", value: 76.31 },
      { name: "Honduras", rank: 5, code: "honduras", flag: "honduras.png", value: 74.54 },
      { name: "Trinidad and Tobago", rank: 6, code: "trinidad-and-tobago", flag: "trinidad-and-tobago.png", value: 71.63 },
      { name: "Guyana", rank: 7, code: "guyana", flag: "guyana.png", value: 68.74 },
      { name: "El Salvador", rank: 8, code: "el-salvador", flag: "el-salvador.png", value: 67.84 },
      { name: "Brazil", rank: 9, code: "brazil", flag: "brazil.png", value: 67.49 },
      { name: "Jamaica", rank: 10, code: "jamaica", flag: "jamaica.png", value: 67.42 }
    ]
  },

  happiness: {
    title: "Happiness Index",
    emoji: "😊",
    unit: "score",
    countries: [
      { name: "Finland", rank: 1, code: "finland", flag: "finland.png", value: 7.741 },
      { name: "Denmark", rank: 2, code: "denmark", flag: "denmark.png", value: 7.583 },
      { name: "Iceland", rank: 3, code: "iceland", flag: "iceland.png", value: 7.525 },
      { name: "Sweden", rank: 4, code: "sweden", flag: "sweden.png", value: 7.344 },
      { name: "Israel", rank: 5, code: "israel", flag: "israel.png", value: 7.341 },
      { name: "Netherlands", rank: 6, code: "netherlands", flag: "netherlands.png", value: 7.319 },
      { name: "Norway", rank: 7, code: "norway", flag: "norway.png", value: 7.315 },
      { name: "Switzerland", rank: 8, code: "switzerland", flag: "switzerland.png", value: 7.240 },
      { name: "Luxembourg", rank: 9, code: "luxembourg", flag: "luxembourg.png", value: 7.228 },
      { name: "New Zealand", rank: 10, code: "new-zealand", flag: "new-zealand.png", value: 7.123 }
    ]
  },

  passport: {
    title: "Most Powerful Passports",
    emoji: "🛂",
    unit: "countries",
    countries: [
      { name: "Singapore", rank: 1, code: "singapore", flag: "singapore.png", value: 195 },
      { name: "Japan", rank: 2, code: "japan", flag: "japan.png", value: 193 },
      { name: "South Korea", rank: 3, code: "south-korea", flag: "south-korea.png", value: 192 },
      { name: "Germany", rank: 4, code: "germany", flag: "germany.png", value: 191 },
      { name: "Italy", rank: 5, code: "italy", flag: "italy.png", value: 191 },
      { name: "Finland", rank: 6, code: "finland", flag: "finland.png", value: 190 },
      { name: "Spain", rank: 7, code: "spain", flag: "spain.png", value: 190 },
      { name: "Luxembourg", rank: 8, code: "luxembourg", flag: "luxembourg.png", value: 190 },
      { name: "Sweden", rank: 9, code: "sweden", flag: "sweden.png", value: 189 },
      { name: "France", rank: 10, code: "france", flag: "france.png", value: 189 }
    ]
  },

  beer: {
    title: "Beer Consumption",
    emoji: "🍺",
    unit: "L",
    countries: [
      { name: "Czech Republic", rank: 1, code: "czech-republic", flag: "czech-republic.png", value: 152.1 },
      { name: "Austria", rank: 2, code: "austria", flag: "austria.png", value: 106.5 },
      { name: "Germany", rank: 3, code: "germany", flag: "germany.png", value: 103.3 },
      { name: "Romania", rank: 4, code: "romania", flag: "romania.png", value: 100.6 },
      { name: "Poland", rank: 5, code: "poland", flag: "poland.png", value: 94.2 },
      { name: "Ireland", rank: 6, code: "ireland", flag: "ireland.png", value: 93.0 },
      { name: "Spain", rank: 7, code: "spain", flag: "spain.png", value: 92.6 },
      { name: "Croatia", rank: 8, code: "croatia", flag: "croatia.png", value: 88.8 },
      { name: "Estonia", rank: 9, code: "estonia", flag: "estonia.png", value: 84.4 },
      { name: "Slovenia", rank: 10, code: "slovenia", flag: "slovenia.png", value: 84.1 }
    ]
  },

  altitude: {
    title: "Average Altitude",
    emoji: "⛰️",
    unit: "m",
    countries: [
      { name: "Bhutan", rank: 1, code: "bhutan", flag: "bhutan.png", value: 3280 },
      { name: "Nepal", rank: 2, code: "nepal", flag: "nepal.png", value: 3265 },
      { name: "Tajikistan", rank: 3, code: "tajikistan", flag: "tajikistan.png", value: 3186 },
      { name: "Kyrgyzstan", rank: 4, code: "kyrgyzstan", flag: "kyrgyzstan.png", value: 2988 },
      { name: "Lesotho", rank: 5, code: "lesotho", flag: "lesotho.png", value: 2161 },
      { name: "Andorra", rank: 6, code: "andorra", flag: "andorra.png", value: 1996 },
      { name: "Afghanistan", rank: 7, code: "afghanistan", flag: "afghanistan.png", value: 1885 },
      { name: "Chile", rank: 8, code: "chile", flag: "chile.png", value: 1871 },
      { name: "Armenia", rank: 9, code: "armenia", flag: "armenia.png", value: 1792 },
      { name: "China", rank: 10, code: "china", flag: "china.png", value: 1840 }
    ]
  },

  forest: {
    title: "Forest Area",
    emoji: "🌲",
    unit: "km²",
    countries: [
      { name: "Russia", rank: 1, code: "russia", flag: "russia.png", value: 8149305 },
      { name: "Brazil", rank: 2, code: "brazil", flag: "brazil.png", value: 4935380 },
      { name: "Canada", rank: 3, code: "canada", flag: "canada.png", value: 3470690 },
      { name: "United States", rank: 4, code: "united-states", flag: "united-states.png", value: 3100950 },
      { name: "China", rank: 5, code: "china", flag: "china.png", value: 2198635 },
      { name: "Democratic Republic of the Congo", rank: 6, code: "democratic-republic-of-the-congo", flag: "democratic-republic-of-the-congo.png", value: 1522240 },
      { name: "Australia", rank: 7, code: "australia", flag: "australia.png", value: 1340051 },
      { name: "Indonesia", rank: 8, code: "indonesia", flag: "indonesia.png", value: 903256 },
      { name: "Peru", rank: 9, code: "peru", flag: "peru.png", value: 738054 },
      { name: "India", rank: 10, code: "india", flag: "india.png", value: 724070 }
    ]
  },

  coastline: {
    title: "Coastline Length",
    emoji: "🌊",
    unit: "km",
    countries: [
      { name: "Canada", rank: 1, code: "canada", flag: "canada.png", value: 202080 },
      { name: "Indonesia", rank: 2, code: "indonesia", flag: "indonesia.png", value: 54716 },
      { name: "Norway", rank: 3, code: "norway", flag: "norway.png", value: 25148 },
      { name: "Russia", rank: 4, code: "russia", flag: "russia.png", value: 37653 },
      { name: "Philippines", rank: 5, code: "philippines", flag: "philippines.png", value: 36289 },
      { name: "Japan", rank: 6, code: "japan", flag: "japan.png", value: 29751 },
      { name: "Australia", rank: 7, code: "australia", flag: "australia.png", value: 25760 },
      { name: "United States", rank: 8, code: "united-states", flag: "united-states.png", value: 19924 },
      { name: "New Zealand", rank: 9, code: "new-zealand", flag: "new-zealand.png", value: 15134 },
      { name: "China", rank: 10, code: "china", flag: "china.png", value: 14500 }
    ]
  },

  olympic: {
    title: "Olympic Medals",
    emoji: "🥇",
    unit: "medals",
    countries: [
      { name: "United States", rank: 1, code: "united-states", flag: "united-states.png", value: 2975 },
      { name: "United Kingdom", rank: 2, code: "united-kingdom", flag: "united-kingdom.png", value: 948 },
      { name: "Germany", rank: 3, code: "germany", flag: "germany.png", value: 937 },
      { name: "France", rank: 4, code: "france", flag: "france.png", value: 895 },
      { name: "Italy", rank: 5, code: "italy", flag: "italy.png", value: 742 },
      { name: "China", rank: 6, code: "china", flag: "china.png", value: 696 },
      { name: "Sweden", rank: 7, code: "sweden", flag: "sweden.png", value: 661 },
      { name: "Russia", rank: 8, code: "russia", flag: "russia.png", value: 590 },
      { name: "Hungary", rank: 9, code: "hungary", flag: "hungary.png", value: 511 },
      { name: "Australia", rank: 10, code: "australia", flag: "australia.png", value: 562 }
    ]
  },

  cuisine: {
    title: "Cuisine Quality",
    emoji: "🍽️",
    unit: "rating",
    countries: [
      { name: "Italy", rank: 1, code: "italy", flag: "italy.png", value: 4.72 },
      { name: "France", rank: 2, code: "france", flag: "france.png", value: 4.69 },
      { name: "Japan", rank: 3, code: "japan", flag: "japan.png", value: 4.65 },
      { name: "Mexico", rank: 4, code: "mexico", flag: "mexico.png", value: 4.58 },
      { name: "Thailand", rank: 5, code: "thailand", flag: "thailand.png", value: 4.54 },
      { name: "India", rank: 6, code: "india", flag: "india.png", value: 4.51 },
      { name: "China", rank: 7, code: "china", flag: "china.png", value: 4.48 },
      { name: "Spain", rank: 8, code: "spain", flag: "spain.png", value: 4.47 },
      { name: "Turkey", rank: 9, code: "turkey", flag: "turkey.png", value: 4.44 },
      { name: "United States", rank: 10, code: "united-states", flag: "united-states.png", value: 4.40 }
    ]
  },

  worldcup: {
    title: "World Cup Wins",
    emoji: "🏆",
    unit: "titles",
    countries: [
      { name: "Brazil", rank: 1, code: "brazil", flag: "brazil.png", value: 5 },
      { name: "Germany", rank: 2, code: "germany", flag: "germany.png", value: 4 },
      { name: "Italy", rank: 3, code: "italy", flag: "italy.png", value: 4 },
      { name: "Argentina", rank: 4, code: "argentina", flag: "argentina.png", value: 3 },
      { name: "Uruguay", rank: 5, code: "uruguay", flag: "uruguay.png", value: 2 },
      { name: "France", rank: 6, code: "france", flag: "france.png", value: 2 },
      { name: "England", rank: 7, code: "england", flag: "england.png", value: 1 },
      { name: "Spain", rank: 8, code: "spain", flag: "spain.png", value: 1 },
      { name: "Netherlands", rank: 9, code: "netherlands", flag: "netherlands.png", value: 0 },
      { name: "Croatia", rank: 10, code: "croatia", flag: "croatia.png", value: 0 }
    ]
  }
};
