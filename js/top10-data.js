// js/top10-game.js
export const CATEGORY_ID_MAP = {
  population: 1,
  gdp: 2,
  altitude: 3,
  forest: 4,
  coastline: 5,
  olympic: 6,
  cuisine: 7,
  worldcup: 8,
  landmass: 9,
  crimerate: 10,
  happiness: 11,
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
    countries: [
      { name: "China", rank: 1, code: "china", flag: "china.png" },
      { name: "India", rank: 2, code: "india", flag: "india.png" },
      { name: "United States", rank: 3, code: "united-states", flag: "united-states.png" },
      { name: "Indonesia", rank: 4, code: "indonesia", flag: "indonesia.png" },
      { name: "Pakistan", rank: 5, code: "pakistan", flag: "pakistan.png" },
      { name: "Nigeria", rank: 6, code: "nigeria", flag: "nigeria.png" },
      { name: "Brazil", rank: 7, code: "brazil", flag: "brazil.png" },
      { name: "Bangladesh", rank: 8, code: "bangladesh", flag: "bangladesh.png" },
      { name: "Russia", rank: 9, code: "russia", flag: "russia.png" },
      { name: "Mexico", rank: 10, code: "mexico", flag: "mexico.png" }
    ]
  },

  gdp: {
    title: "GDP per Capita",
    emoji: "💰",
    countries: [
      { name: "Luxembourg", rank: 1, code: "luxembourg", flag: "luxembourg.png" },
      { name: "Ireland", rank: 2, code: "ireland", flag: "ireland.png" },
      { name: "Norway", rank: 3, code: "norway", flag: "norway.png" },
      { name: "Switzerland", rank: 4, code: "switzerland", flag: "switzerland.png" },
      { name: "Qatar", rank: 5, code: "qatar", flag: "qatar.png" },
      { name: "United States", rank: 6, code: "united-states", flag: "united-states.png" },
      { name: "Singapore", rank: 7, code: "singapore", flag: "singapore.png" },
      { name: "Denmark", rank: 8, code: "denmark", flag: "denmark.png" },
      { name: "Australia", rank: 9, code: "australia", flag: "australia.png" },
      { name: "Iceland", rank: 10, code: "iceland", flag: "iceland.png" }
    ]
  },

  landmass: {
    title: "Landmass",
    emoji: "🗺️",
    countries: [
      { name: "Russia", rank: 1, code: "russia", flag: "russia.png" },
      { name: "Canada", rank: 2, code: "canada", flag: "canada.png" },
      { name: "China", rank: 3, code: "china", flag: "china.png" },
      { name: "United States", rank: 4, code: "united-states", flag: "united-states.png" },
      { name: "Brazil", rank: 5, code: "brazil", flag: "brazil.png" },
      { name: "Australia", rank: 6, code: "australia", flag: "australia.png" },
      { name: "India", rank: 7, code: "india", flag: "india.png" },
      { name: "Argentina", rank: 8, code: "argentina", flag: "argentina.png" },
      { name: "Kazakhstan", rank: 9, code: "kazakhstan", flag: "kazakhstan.png" },
      { name: "Algeria", rank: 10, code: "algeria", flag: "algeria.png" }
    ]
  },

  nobelprize: {
    title: "Nobel Prizes",
    emoji: "🏅",
    countries: [
      { name: "United States", rank: 1, code: "united-states", flag: "united-states.png" },
      { name: "United Kingdom", rank: 2, code: "united-kingdom", flag: "united-kingdom.png" },
      { name: "Germany", rank: 3, code: "germany", flag: "germany.png" },
      { name: "France", rank: 4, code: "france", flag: "france.png" },
      { name: "Sweden", rank: 5, code: "sweden", flag: "sweden.png" },
      { name: "Japan", rank: 6, code: "japan", flag: "japan.png" },
      { name: "Russia", rank: 7, code: "russia", flag: "russia.png" },
      { name: "Canada", rank: 8, code: "canada", flag: "canada.png" },
      { name: "Switzerland", rank: 9, code: "switzerland", flag: "switzerland.png" },
      { name: "Netherlands", rank: 10, code: "netherlands", flag: "netherlands.png" }
    ]
  },

  temperature: {
    title: "Hottest Countries",
    emoji: "🌡️",
    countries: [
      { name: "United Arab Emirates", rank: 1, code: "united-arab-emirates", flag: "united-arab-emirates.png" },
      { name: "Djibouti", rank: 2, code: "djibouti", flag: "djibouti.png" },
      { name: "Gambia", rank: 3, code: "gambia", flag: "gambia.png" },
      { name: "Maldives", rank: 4, code: "maldives", flag: "maldives.png" },
      { name: "Guinea-Bissau", rank: 5, code: "guinea-bissau", flag: "guinea-bissau.png" },
      { name: "Singapore", rank: 6, code: "singapore", flag: "singapore.png" },
      { name: "Saint Kitts & Nevis", rank: 7, code: "saint-kitts-and-nevis", flag: "saint-kitts-and-nevis.png" },
      { name: "Thailand", rank: 8, code: "thailand", flag: "thailand.png" },
      { name: "Bahamas", rank: 9, code: "bahamas", flag: "bahamas.png" },
      { name: "Bangladesh", rank: 10, code: "bangladesh", flag: "bangladesh.png" }
    ]
  },

  precipitation: {
    title: "Rainfall",
    emoji: "🌧️",
    countries: [
      { name: "Micronesia", rank: 1, code: "micronesia", flag: "micronesia.png" },
      { name: "Palau", rank: 2, code: "palau", flag: "palau.png" },
      { name: "Fiji", rank: 3, code: "fiji", flag: "fiji.png" },
      { name: "Costa Rica", rank: 4, code: "costa-rica", flag: "costa-rica.png" },
      { name: "Papua New Guinea", rank: 5, code: "papua-new-guinea", flag: "papua-new-guinea.png" },
      { name: "Malaysia", rank: 6, code: "malaysia", flag: "malaysia.png" },
      { name: "Indonesia", rank: 7, code: "indonesia", flag: "indonesia.png" },
      { name: "Belize", rank: 8, code: "belize", flag: "belize.png" },
      { name: "Vanuatu", rank: 9, code: "vanuatu", flag: "vanuatu.png" },
      { name: "Philippines", rank: 10, code: "philippines", flag: "philippines.png" }
    ]
  },

  crimerate: {
    title: "Crime Rate",
    emoji: "🚨",
    countries: [
      { name: "Venezuela", rank: 1, code: "venezuela", flag: "venezuela.png" },
      { name: "Papua New Guinea", rank: 2, code: "papua-new-guinea", flag: "papua-new-guinea.png" },
      { name: "South Africa", rank: 3, code: "south-africa", flag: "south-africa.png" },
      { name: "Afghanistan", rank: 4, code: "afghanistan", flag: "afghanistan.png" },
      { name: "Honduras", rank: 5, code: "honduras", flag: "honduras.png" },
      { name: "Trinidad and Tobago", rank: 6, code: "trinidad-and-tobago", flag: "trinidad-and-tobago.png" },
      { name: "Guyana", rank: 7, code: "guyana", flag: "guyana.png" },
      { name: "El Salvador", rank: 8, code: "el-salvador", flag: "el-salvador.png" },
      { name: "Brazil", rank: 9, code: "brazil", flag: "brazil.png" },
      { name: "Jamaica", rank: 10, code: "jamaica", flag: "jamaica.png" }
    ]
  },

  happiness: {
    title: "Happiness Index",
    emoji: "😊",
    countries: [
      { name: "Finland", rank: 1, code: "finland", flag: "finland.png" },
      { name: "Denmark", rank: 2, code: "denmark", flag: "denmark.png" },
      { name: "Iceland", rank: 3, code: "iceland", flag: "iceland.png" },
      { name: "Sweden", rank: 4, code: "sweden", flag: "sweden.png" },
      { name: "Israel", rank: 5, code: "israel", flag: "israel.png" },
      { name: "Netherlands", rank: 6, code: "netherlands", flag: "netherlands.png" },
      { name: "Norway", rank: 7, code: "norway", flag: "norway.png" },
      { name: "Switzerland", rank: 8, code: "switzerland", flag: "switzerland.png" },
      { name: "Luxembourg", rank: 9, code: "luxembourg", flag: "luxembourg.png" },
      { name: "New Zealand", rank: 10, code: "new-zealand", flag: "new-zealand.png" }
    ]
  },

  passport: {
    title: "Most Powerful Passports",
    emoji: "🛂",
    countries: [
      { name: "Singapore", rank: 1, code: "singapore", flag: "singapore.png" },
      { name: "Japan", rank: 2, code: "japan", flag: "japan.png" },
      { name: "South Korea", rank: 3, code: "south-korea", flag: "south-korea.png" },
      { name: "Germany", rank: 4, code: "germany", flag: "germany.png" },
      { name: "Italy", rank: 5, code: "italy", flag: "italy.png" },
      { name: "Finland", rank: 6, code: "finland", flag: "finland.png" },
      { name: "Spain", rank: 7, code: "spain", flag: "spain.png" },
      { name: "Luxembourg", rank: 8, code: "luxembourg", flag: "luxembourg.png" },
      { name: "Sweden", rank: 9, code: "sweden", flag: "sweden.png" },
      { name: "France", rank: 10, code: "france", flag: "france.png" }
    ]
  },

  beer: {
    title: "Beer Consumption",
    emoji: "🍺",
    countries: [
      { name: "Czech Republic", rank: 1, code: "czech-republic", flag: "czech-republic.png" },
      { name: "Austria", rank: 2, code: "austria", flag: "austria.png" },
      { name: "Germany", rank: 3, code: "germany", flag: "germany.png" },
      { name: "Romania", rank: 4, code: "romania", flag: "romania.png" },
      { name: "Poland", rank: 5, code: "poland", flag: "poland.png" },
      { name: "Ireland", rank: 6, code: "ireland", flag: "ireland.png" },
      { name: "Spain", rank: 7, code: "spain", flag: "spain.png" },
      { name: "Croatia", rank: 8, code: "croatia", flag: "croatia.png" },
      { name: "Estonia", rank: 9, code: "estonia", flag: "estonia.png" },
      { name: "Slovenia", rank: 10, code: "slovenia", flag: "slovenia.png" }
    ]
  },

  altitude: {
    title: "Average Altitude",
    emoji: "⛰️",
    countries: [
      { name: "Bhutan", rank: 1, code: "bhutan", flag: "bhutan.png" },
      { name: "Nepal", rank: 2, code: "nepal", flag: "nepal.png" },
      { name: "Tajikistan", rank: 3, code: "tajikistan", flag: "tajikistan.png" },
      { name: "Kyrgyzstan", rank: 4, code: "kyrgyzstan", flag: "kyrgyzstan.png" },
      { name: "Lesotho", rank: 5, code: "lesotho", flag: "lesotho.png" },
      { name: "Andorra", rank: 6, code: "andorra", flag: "andorra.png" },
      { name: "Afghanistan", rank: 7, code: "afghanistan", flag: "afghanistan.png" },
      { name: "Chile", rank: 8, code: "chile", flag: "chile.png" },
      { name: "Armenia", rank: 9, code: "armenia", flag: "armenia.png" },
      { name: "China", rank: 10, code: "china", flag: "china.png" }
    ]
  },

  forest: {
    title: "Forest Area",
    emoji: "🌲",
    countries: [
      { name: "Russia", rank: 1, code: "russia", flag: "russia.png" },
      { name: "Brazil", rank: 2, code: "brazil", flag: "brazil.png" },
      { name: "Canada", rank: 3, code: "canada", flag: "canada.png" },
      { name: "United States", rank: 4, code: "united-states", flag: "united-states.png" },
      { name: "China", rank: 5, code: "china", flag: "china.png" },
      { name: "Democratic Republic of the Congo", rank: 6, code: "democratic-republic-of-the-congo", flag: "democratic-republic-of-the-congo.png" },
      { name: "Australia", rank: 7, code: "australia", flag: "australia.png" },
      { name: "Indonesia", rank: 8, code: "indonesia", flag: "indonesia.png" },
      { name: "Peru", rank: 9, code: "peru", flag: "peru.png" },
      { name: "India", rank: 10, code: "india", flag: "india.png" }
    ]
  },

  coastline: {
    title: "Coastline Length",
    emoji: "🌊",
    countries: [
      { name: "Canada", rank: 1, code: "canada", flag: "canada.png" },
      { name: "Indonesia", rank: 2, code: "indonesia", flag: "indonesia.png" },
      { name: "Norway", rank: 3, code: "norway", flag: "norway.png" },
      { name: "Russia", rank: 4, code: "russia", flag: "russia.png" },
      { name: "Philippines", rank: 5, code: "philippines", flag: "philippines.png" },
      { name: "Japan", rank: 6, code: "japan", flag: "japan.png" },
      { name: "Australia", rank: 7, code: "australia", flag: "australia.png" },
      { name: "United States", rank: 8, code: "united-states", flag: "united-states.png" },
      { name: "New Zealand", rank: 9, code: "new-zealand", flag: "new-zealand.png" },
      { name: "China", rank: 10, code: "china", flag: "china.png" }
    ]
  },

  olympic: {
    title: "Olympic Medals",
    emoji: "🥇",
    countries: [
      { name: "United States", rank: 1, code: "united-states", flag: "united-states.png" },
      { name: "United Kingdom", rank: 2, code: "united-kingdom", flag: "united-kingdom.png" },
      { name: "Germany", rank: 3, code: "germany", flag: "germany.png" },
      { name: "France", rank: 4, code: "france", flag: "france.png" },
      { name: "Italy", rank: 5, code: "italy", flag: "italy.png" },
      { name: "China", rank: 6, code: "china", flag: "china.png" },
      { name: "Sweden", rank: 7, code: "sweden", flag: "sweden.png" },
      { name: "Russia", rank: 8, code: "russia", flag: "russia.png" },
      { name: "Hungary", rank: 9, code: "hungary", flag: "hungary.png" },
      { name: "Australia", rank: 10, code: "australia", flag: "australia.png" }
    ]
  },

  cuisine: {
    title: "Cuisine Quality",
    emoji: "🍽️",
    countries: [
      { name: "Italy", rank: 1, code: "italy", flag: "italy.png" },
      { name: "France", rank: 2, code: "france", flag: "france.png" },
      { name: "Japan", rank: 3, code: "japan", flag: "japan.png" },
      { name: "Mexico", rank: 4, code: "mexico", flag: "mexico.png" },
      { name: "Thailand", rank: 5, code: "thailand", flag: "thailand.png" },
      { name: "India", rank: 6, code: "india", flag: "india.png" },
      { name: "China", rank: 7, code: "china", flag: "china.png" },
      { name: "Spain", rank: 8, code: "spain", flag: "spain.png" },
      { name: "Turkey", rank: 9, code: "turkey", flag: "turkey.png" },
      { name: "United States", rank: 10, code: "united-states", flag: "united-states.png" }
    ]
  },

  worldcup: {
    title: "World Cup Wins",
    emoji: "🏆",
    countries: [
      { name: "Brazil", rank: 1, code: "brazil", flag: "brazil.png" },
      { name: "Germany", rank: 2, code: "germany", flag: "germany.png" },
      { name: "Italy", rank: 3, code: "italy", flag: "italy.png" },
      { name: "Argentina", rank: 4, code: "argentina", flag: "argentina.png" },
      { name: "Uruguay", rank: 5, code: "uruguay", flag: "uruguay.png" },
      { name: "France", rank: 6, code: "france", flag: "france.png" },
      { name: "England", rank: 7, code: "england", flag: "england.png" },
      { name: "Spain", rank: 8, code: "spain", flag: "spain.png" },
      { name: "Netherlands", rank: 9, code: "netherlands", flag: "netherlands.png" },
      { name: "Croatia", rank: 10, code: "croatia", flag: "croatia.png" }
    ]
  }
};


