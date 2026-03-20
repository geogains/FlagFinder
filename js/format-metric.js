// js/format-metric.js
// Shared metric formatting utility for all game modes.
// Handles number formatting only — callers are responsible for
// location-name rendering (HTML in VS, text in Top10).
//
// options:
//   categoryKey {string} — required for units with context-dependent
//                          formatting ('years': marriage age vs life expectancy)

export function formatValue(value, unit, options = {}) {
  const { categoryKey = '' } = options;

  switch (unit) {

    // ── Population (value pre-converted to millions by caller) ──
    case 'M':
      if (value >= 1000)  return (value / 1000).toFixed(1) + 'B';
      if (value >= 1)     return value.toFixed(1) + 'M';
      if (value >= 0.001) return (value * 1000).toFixed(1) + 'K';
      return Math.round(value * 1_000_000).toLocaleString();

    // ── Raw meters (altitude, building height — names handled by caller) ──
    case 'm':
      return value.toLocaleString() + ' m';

    // ── Dollar amounts ──
    case 'USD':
    case 'usd':
      return '$' + value.toLocaleString();

    // ── Area ──
    case 'km²':
      if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M km²';
      if (value >= 1_000)     return (value / 1_000).toFixed(0) + 'K km²';
      return value.toLocaleString() + ' km²';

    // ── Distance / length ──
    case 'km':
      return value.toLocaleString() + ' km';

    // ── Rainfall ──
    case 'mm':
    case 'mm/year':
      return value.toLocaleString() + ' mm';

    // ── Forest area ──
    case 'hectares':
    case 'Hectares':
    case 'hectare':
      if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M hectares';
      if (value >= 1_000)     return (value / 1_000).toFixed(1) + 'K hectares';
      return value.toLocaleString() + ' hectares';

    // ── Percentage ──
    case '%':
      return value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%';

    // ── Count-only metrics ──
    case 'medals':
    case 'trophies':
    case 'titles':
      return value.toLocaleString();

    // ── Passport strength ──
    case 'countries':
      return value.toLocaleString() + ' countries';

    // ── Nobel prizes ──
    case 'prizes':
      return value.toLocaleString();

    // ── Beer / liquid volume ──
    case 'L':
    case 'l':
      return value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' L';

    // ── Temperature ──
    case '°C':
    case '°c':
      return value.toLocaleString('en-US', { maximumFractionDigits: 1 }) + '°C';

    // ── Crime rate ──
    case '/100k':
      return value.toLocaleString('en-US', { maximumFractionDigits: 2 });

    // ── Happiness index ──
    case '/10':
      return value.toFixed(1) + '/10';

    // ── Cuisine score ──
    case 'score':
      return value.toLocaleString() + ' pts';

    // ── Tourism ──
    case 'M Tourists':
    case 'm tourists': {
      const t = value.toFixed(1);
      return (t.endsWith('.0') ? t.slice(0, -2) : t) + 'M';
    }

    // ── Michelin restaurants ──
    case 'restaurants':
    case 'Restaurants':
      return value.toLocaleString();

    // ── Marriage age / life expectancy ──
    case 'years':
    case 'Years':
      if (categoryKey === 'marriageage') return Math.round(value) + ' years';
      return value.toFixed(1) + ' years';

    // ── Sex ratio ──
    case 'ratio':
      return value.toLocaleString();

    // ── Population density ──
    case 'per km²':
      return value.toLocaleString() + ' per km²';

    // ── Car exports ──
    case '$B':
    case '$b':
      return '$' + value.toFixed(1) + 'B';

    // ── Military personnel (VS sends empty string, Top10 sends 'personnel') ──
    case '':
    case 'personnel':
      return value.toLocaleString();

    // ── Rent / poorest GDP ──
    case '$':
      return '$' + value.toLocaleString();

    // ── Universities ──
    case 'universities':
      return value.toLocaleString();

    // ── Volcanoes ──
    case 'volcanoes':
      return value.toLocaleString();

    // ── Flamingos ──
    case 'flamingos': {
      if (value >= 1_000_000) {
        const m = (value / 1_000_000).toFixed(1);
        return m.endsWith('.0') ? m.slice(0, -2) + 'M' : m + 'M';
      }
      if (value >= 1_000) {
        const k = (value / 1_000).toFixed(1);
        return k.endsWith('.0') ? k.slice(0, -2) + 'K' : k + 'K';
      }
      return value.toLocaleString();
    }

    // ── Natural disaster risk ──
    case 'risk index':
      return value.toFixed(2);

    // ── Millionaires ──
    case 'millionaires':
      if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
      if (value >= 1_000)     return (value / 1_000).toFixed(1) + 'K';
      return value.toLocaleString();

    // ── Chess grandmasters ──
    case 'grandmasters':
      return value.toLocaleString() + ' grandmasters';

    default:
      return value.toLocaleString();
  }
}
