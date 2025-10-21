import { populationData } from './population.js';
import { gdpData } from './gdp.js';
import { happinessData } from './happiness.js';
import { forestData } from './forest.js';
import { coastlineData } from './coastline.js';
import { cuisineData } from './cuisine.js';
import { olympicsData } from './olympic.js';
import { worldcupData } from './worldcup.js';

export const categories = {
  population: {
    label: 'Population',
    emoji: '👥',
    description: 'Rank countries by total population',
    data: populationData,
  },
  gdp: {
    label: 'GDP',
    emoji: '💰',
    description: 'Rank countries by total economic output',
    data: gdpData,
  },
  happiness: {
    label: 'Happiness Index',
    emoji: '😊',
    description: 'Rank countries by quality of life',
    data: happinessData,
  },
  forest: {
    label: 'Forest Cover',
    emoji: '🌲',
    description: 'Rank countries by forest land area',
    data: forestData,
  },
  coastline: {
    label: 'Coastline',
    emoji: '🌊',
    description: 'Rank countries by total coastline length',
    data: coastlineData,
  },
  cuisine: {
    label: 'Cuisine',
    emoji: '🍽️',
    description: 'Rank countries by food culture influence',
    data: cuisineData,
  },
  olympic: {
    label: 'Olympic Medals',
    emoji: '🏅',
    description: 'Rank countries by total medals won',
    data: olympicData,
  },
  worldcup: {
    label: 'World Cup',
    emoji: '⚽️',
    description: 'Rank countries by total football titles',
    data: worldcupData,
  },
};
