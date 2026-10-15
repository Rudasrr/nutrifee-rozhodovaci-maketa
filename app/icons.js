/* Ikonová sada NutriFee — jedna obrysová sada (mřížka 24 px, linka 1,75 px, barva z CSS), inline SVG bez závislostí.
   Rozhodnutí vlastníka 15. 10. 2026 (navrhy-designu/07-piktogramy-a-animace-2026-10-15.md): žádná emoji v jádru; ikona nikdy nenese význam sama
   (text zůstává), proto je vždy aria-hidden; grafika s významem má role="img" a popis u sebe. */
(function (global) {
'use strict';
var NF = global.NutriFee;
var P = {
  /* ovládání a stavy */
  syringe: '<rect x="6" y="9" width="11" height="6" rx="1.2"/><path d="M6 12H3M17 12h4M19.5 10.3v3.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  minus: '<path d="M6 12h12"/>',
  pencil: '<path d="M4 20l4-1L19 8l-3-3L5 16z"/><path d="M13 8l3 3"/>',
  'circle-dashed': '<circle cx="12" cy="12" r="8" stroke-dasharray="3.2 3.2"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 3.5 2 3.5H5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  note: '<path d="M4 4h10l5 5v11H4z"/><path d="M14 4v5h5M8 14h8M8 17h5"/>',
  signal: '<circle cx="12" cy="11" r="2"/><path d="M12 13v8M8 7a5.5 5.5 0 0 0 0 8M16 7a5.5 5.5 0 0 1 0 8M5 4a9.5 9.5 0 0 0 0 14M19 4a9.5 9.5 0 0 1 0 14"/>',
  chart: '<path d="M4 19h16M6 15l4-5 3 3 5-7"/>',
  star: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z"/>',
  calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  award: '<circle cx="12" cy="9" r="5"/><path d="M9 13.5L7.5 21l4.5-2.5L16.5 21 15 13.5"/>',
  stethoscope: '<path d="M6 3.5v5.5a4 4 0 0 0 8 0V3.5"/><path d="M10 13v3a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="12" r="2"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4.5" cy="6" r=".9"/><circle cx="4.5" cy="12" r=".9"/><circle cx="4.5" cy="18" r=".9"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  'chevron-down': '<path d="M6 9l6 6 6-6"/>',
  'chevron-up': '<path d="M6 15l6-6 6 6"/>',
  'arrow-up': '<path d="M12 19V5M6 11l6-6 6 6"/>',
  'arrow-down': '<path d="M12 5v14M6 13l6 6 6-6"/>',
  'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h6"/>',
  sigma: '<path d="M17 5H7l5 7-5 7h10"/>',
  pie: '<circle cx="12" cy="12" r="8"/><path d="M12 4v8l6 5"/>',
  lightbulb: '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  graduation: '<path d="M3 9l9-4 9 4-9 4z"/><path d="M7 11v4c0 1.5 2.5 3 5 3s5-1.5 5-3v-4M21 9v5"/>',
  'chart-bar': '<path d="M4 20h16M7 17v-6M12 17V7M17 17v-3"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  walk: '<circle cx="13" cy="4.5" r="1.5"/><path d="M8 13l2.5-5 3 1.5L16 13M12.5 9.5L11 15M10 21l1-6 3 2 1 4"/>',
  bowl: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M17 5l-3 6"/><circle cx="18" cy="4" r="1.5"/>',
  'eye-off': '<path d="M3 3l18 18"/><path d="M10 6.3A10 10 0 0 1 12 6c5 0 8.5 4 9.5 6-.4.9-1.3 2.2-2.6 3.4M6.5 8.1C4.4 9.5 3 11.2 2.5 12c1 2 4.5 6 9.5 6 1.3 0 2.5-.3 3.6-.7"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  thermometer: '<path d="M10 4a2 2 0 0 1 4 0v9.5a3.5 3.5 0 1 1-4 0z"/><path d="M12 10v6"/>',
  plate: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/>',
  utensils: '<path d="M6 3v4.5a2 2 0 0 0 4 0V3M8 3v18"/><path d="M17 3v18M17 3c-2 2.5-2.5 6-2 9h2"/>',
  /* jídla podle zdroje sacharidů a druhu */
  potato: '<ellipse cx="12" cy="12" rx="8" ry="6" transform="rotate(-20 12 12)"/><path d="M9 10h.01M13 9h.01M11 14h.01M15 13h.01"/>',
  rice: '<path d="M4 12h16a8 8 0 0 1-16 0z"/><path d="M6.5 12a5.5 3.5 0 0 1 11 0"/>',
  pasta: '<path d="M4 8c2-2 4-2 6 0s4 2 6 0 4-2 4 0M4 12.5c2-2 4-2 6 0s4 2 6 0 4-2 4 0M4 17c2-2 4-2 6 0s4 2 6 0 4-2 4 0"/>',
  dumpling: '<ellipse cx="9" cy="12" rx="4.5" ry="7"/><path d="M13.5 6c2.5 0 4.5 2.7 4.5 6s-2 6-4.5 6M17 7.5c2 .8 3 2.6 3 4.5s-1 3.7-3 4.5"/>',
  bread: '<path d="M6 11a3.5 3.5 0 0 1 1-7h10a3.5 3.5 0 0 1 1 7v9H6z"/><path d="M6 11h12"/>',
  porridge: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M17 5l-3 6"/><circle cx="18" cy="4" r="1.5"/>',
  beans: '<ellipse cx="7.5" cy="9" rx="3" ry="2" transform="rotate(-30 7.5 9)"/><ellipse cx="15.5" cy="9" rx="3" ry="2" transform="rotate(30 15.5 9)"/><ellipse cx="11.5" cy="15.5" rx="3" ry="2"/>',
  apple: '<path d="M12 7c-2.5-2-6-1-6.5 3 0 4 2.5 8 5 8 .8 0 1.2-.4 1.5-.4s.7.4 1.5.4c2.5 0 5-4 5-8-.5-4-4-5-6.5-3z"/><path d="M12 7c0-2 1-3 2.5-3.5"/>',
  cake: '<path d="M3 20L12 5l9 15z"/><path d="M7 15c1.5 1 3 1 4.5 0s3-1 4.5 0"/>',
  drink: '<path d="M6 3h12l-1.5 17h-9z"/><path d="M7 9h10"/>',
  salad: '<path d="M4 20c0-8 5-13 14-13-1 9-6 13-14 13z"/><path d="M4 20c3-4 6-7 10-9"/>',
  egg: '<path d="M6 9c1-5 7-6 10-3 2 2 3 5 3 8-1 4-7 6-11 3-3-2-3-5-2-8z"/><circle cx="12" cy="12" r="2.5"/>',
  soup: '<path d="M3 12h18a9 9 0 0 1-18 0z"/><path d="M9 8c0-1.5 1-2 0-3.5M13 8c0-1.5 1-2 0-3.5"/>',
  meat: '<circle cx="14.5" cy="8.5" r="5"/><path d="M11 12.5L5 18.5M6.5 20l-2-2M5 18.5l1.5 1.5"/>',
  pizza: '<path d="M3 20L12 3a14 14 0 0 1 9 17z"/><path d="M9 9a10 10 0 0 1 7 5"/><circle cx="12" cy="15" r="1"/><circle cx="15" cy="11" r="1"/>',
  wrap: '<path d="M4 16l9-9a4 4 0 0 1 5.5 5.5L10 21a4 4 0 0 1-6-5z"/><path d="M12 8l5 5"/>',
  pastry: '<path d="M4 15c0-5 4-9 8-9s8 4 8 9c-2-2-4-3-5-3-1 2-2 2-3 2s-2 0-3-2c-1 0-3 1-5 3z"/>',
  nuts: '<ellipse cx="8" cy="10" rx="3" ry="4" transform="rotate(-20 8 10)"/><ellipse cx="15.5" cy="9" rx="3" ry="4" transform="rotate(20 15.5 9)"/><ellipse cx="12" cy="16.5" rx="3" ry="4"/>',
  milk: '<path d="M7 3h10v4l2 3v11H5V10l2-3z"/><path d="M5 10h14M12 3v7"/>',
  cookie: '<circle cx="12" cy="12" r="9"/><path d="M9 9h.01M14 8h.01M15 14h.01M9 15h.01M12 12h.01"/>',
  box: '<path d="M3 8l9-4 9 4v9l-9 4-9-4z"/><path d="M3 8l9 4 9-4M12 12v9"/>'
};
NF.ICONS = P;
/* NF.icon(name, cls) → inline SVG (aria-hidden). Neznámé jméno → prázdný řetězec (text vedle ikony význam nese sám). */
NF.icon = function (name, cls) {
  var body = P[name]; if (!body) return '';
  return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false" data-icon="' + name + '">' + body + '</svg>';
};
/* Ikona jídla: podle druhu (fixtures) nebo zdroje sacharidů; nové jídlo jen názvem → talíř. */
NF.FOOD_ICON_BY_SOURCE = { brambory: 'potato', ryze: 'rice', testoviny: 'pasta', knedlik: 'dumpling', pecivo: 'bread', ovesne: 'porridge', lusteniny: 'beans', ovoce: 'apple', sladke: 'cake', tekute: 'drink', bez: 'salad' };
NF.foodIconName = function (food) {
  if (!food) return 'plate';
  if (food.icon && P[food.icon]) return food.icon;
  return NF.FOOD_ICON_BY_SOURCE[(food.tags || {}).source] || 'plate';
};
})(typeof window !== 'undefined' ? window : globalThis);
