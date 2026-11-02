/* Tokeny vzhledu (B8 a C1 ze závěrečného ověření 1. 11. 2026, navrhy-designu/31-zaverecne-overeni-2026-11-01/03-produkce-a-hrany.md).
   CLAUDE.md: jediný zdroj hodnot je app/tokens.css, app/design.css tokeny jen skládá. Hlídá se:
   · design.css nemá pevné rozměry, délky pohybu, řezy písma ani barvy mimo výjimky z pravidla v jeho úvodním komentáři;
   · každý var(--nf-*) z design.css je v tokens.css;
   · katalog design-system/ načítá styly a skript s ?v= rovným NF.SCHEMA (jako maketa) a ukazuje všechny tokeny.
   Spuštění: node tokeny.test.cjs */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = __dirname;
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const css = read('app/design.css'), tok = read('app/tokens.css'), cat = read('design-system/index.html'), catJs = read('design-system/catalog.js'), html = read('nutrifee-rozhodovaci-maketa.html');
const SCHEMA = Number((/NF\.SCHEMA\s*=\s*(\d+)/.exec(read('app/core.js')) || [])[1]);

let passed = 0, failed = 0; const fails = [];
function test(name, fn) { try { fn(); console.log('OK  ', name); passed++; } catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); } }

/* deklarace design.css bez komentářů a bez @page (var() v @page neplatí); podmínky @media a @container nejsou deklarace */
const src = css.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/@page\s*\{[^}]*\}/g, ' ');
function declarations(text) {
  const out = [], re = /[{;]\s*(-{0,2}[a-zA-Z][a-zA-Z0-9-]*)\s*:\s*([^;{}]+)/g; let m;
  while ((m = re.exec(text))) out.push({ prop: m[1], value: m[2].trim(), line: text.slice(0, m.index).split('\n').length });
  return out;
}
const decls = declarations(src);
/* hodnota bez var(): záložní hodnota var(--x,0px) smí být jen nula */
function stripVars(v) { let prev; do { prev = v; v = v.replace(/var\(--[a-z0-9-]+\s*(?:,\s*(0|0px|0s|[0-9.]+%))?\)/gi, 'V'); } while (v !== prev); return v; }
/* povolené výjimky (pravidlo na začátku design.css) */
function badNumbers(prop, value) {
  const v = stripVars(value).replace(/url\([^)]*\)/g, 'U');
  const bad = [];
  for (const m of v.matchAll(/(?<![\w#.-])(-?\d*\.?\d+)([a-z%]+)?(?![\w(])/gi)) {
    const [all, num, unit = ''] = m, n = Number(num), u = unit.toLowerCase();
    if (n === 0) continue;                                   /* nula v jakékoli jednotce */
    if (u === '') continue;                                  /* bezrozměrná čísla: řádkování, průhlednost, scale, tah SVG, z-index, flex, repeat(n) */
    if (u === '%' || u === 'fr' || u === 'deg') continue;    /* procenta rozložení, podíly mřížky, úhly */
    if (u === 'px' && Math.abs(n) === 1) continue;           /* vlasová čára ±1px */
    if (/^(vh|dvh|svh|lvh|vw)$/.test(u) && n === 100) continue; /* celé okno */
    bad.push(all);
  }
  if (/^font-weight$/.test(prop) && /\d/.test(v)) bad.push('font-weight ' + value);
  if (/^font-family$/.test(prop) && !/^(V|inherit)$/.test(v.trim())) bad.push('font-family ' + value);
  return bad;
}

test('Úvodní komentář design.css nese pravidlo hodnot a jeho výjimky', () => {
  const head = css.slice(0, 4000);
  assert.match(head, /Pravidlo hodnot \(B8/);
  for (const w of ['nula', '±1px', 'procenta', 'auto', 'fr', 'bezrozměrná', '@media']) assert.ok(head.includes(w), 'výjimka „' + w + '“ v pravidle');
});

test('design.css: žádné pevné rozměry, délky pohybu, řezy ani rodiny písma mimo výjimky (B8)', () => {
  const found = [];
  for (const d of decls) { const b = badNumbers(d.prop, d.value); if (b.length) found.push('ř. ' + d.line + ' ' + d.prop + ': ' + b.join(', ')); }
  assert.deepEqual(found, [], 'pevné hodnoty patří do app/tokens.css jako --nf-*');
});

test('design.css: žádné pevné barvy ani v bloku vysokého kontrastu (C2)', () => {
  const found = [];
  for (const d of decls) {
    const v = stripVars(d.value);
    if (/#[0-9a-f]{3,8}\b/i.test(v) || /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\(/i.test(v)) found.push('ř. ' + d.line + ' ' + d.prop + ': ' + d.value);
    else if (/(^|[\s,(])(white|black|red|green|blue|gray|grey|orange|yellow|purple|pink|silver|navy|teal|maroon|olive|lime|aqua|fuchsia)(?=$|[\s,)])/i.test(v)) found.push('ř. ' + d.line + ' ' + d.prop + ': ' + d.value);
  }
  assert.deepEqual(found, []);
  assert.match(css, /@media \(prefers-contrast:more\)\{:root\{--nf-muted:var\(--nf-hc-muted\)/, 'vysoký kontrast přepíná na tokeny --nf-hc-*');
});

test('Každý var(--nf-*) z design.css je definovaný v tokens.css; tokens.css nemá dvojí definici', () => {
  const defined = [...tok.matchAll(/(--nf-[a-z0-9-]+)\s*:/g)].map(m => m[1]);
  const dup = defined.filter((n, i) => defined.indexOf(n) !== i);
  assert.deepEqual([...new Set(dup)], [], 'token definovaný dvakrát');
  const used = [...new Set([...src.matchAll(/var\((--nf-[a-z0-9-]+)/g)].map(m => m[1]))];
  assert.deepEqual(used.filter(n => !defined.includes(n)), [], 'použitý, ale nedefinovaný token');
});

test('Lokální proměnné v design.css (--rl, --c …) nenesou pevné hodnoty', () => {
  const found = decls.filter(d => /^--/.test(d.prop) && !/^--nf-/.test(d.prop)).filter(d => badNumbers(d.prop, d.value).length || /#[0-9a-f]{3,8}\b/i.test(d.value)).map(d => d.prop + ': ' + d.value);
  assert.deepEqual(found, []);
});

test('Katalog načítá tokens.css, design.css, demo.css, catalog.css a catalog.js s ?v= = NF.SCHEMA (C1)', () => {
  assert.ok(SCHEMA > 0, 'NF.SCHEMA v app/core.js');
  const want = ['../app/tokens.css', '../app/design.css', '../demo/demo.css', 'catalog.css', 'catalog.js'];
  for (const f of want) {
    const m = new RegExp('(?:href|src)="' + f.replace(/[.\/]/g, '\\$&') + '\\?v=(\\d+)"').exec(cat);
    assert.ok(m, f + ' s ?v='); assert.equal(Number(m[1]), SCHEMA, f + ' ?v= = NF.SCHEMA');
  }
  const all = [...cat.matchAll(/(?:href|src)="(?!data:|#|https?:)([^"]+)"/g)].map(m => m[1]).filter(u => /\.(css|js)(\?|$)/.test(u));
  assert.deepEqual(all.filter(u => !/\?v=\d+$/.test(u)), [], 'každý styl a skript katalogu má ?v=');
  assert.match(cat, new RegExp('data-version="' + SCHEMA + '"'));
  assert.ok(cat.indexOf('app/tokens.css') < cat.indexOf('app/design.css'), 'tokeny před design.css');
  const mainV = [...html.matchAll(/(?:src|href)="(?:app|demo)\/[^"]+\?v=(\d+)"/g)].map(m => Number(m[1]));
  assert.ok(mainV.length && mainV.every(v => v === SCHEMA), 'maketa a katalog mají stejnou verzi');
});

test('Katalog ukazuje všechny tokeny a inspektor u vlastnosti uvádí token z pravidla', () => {
  assert.match(cat, /id="tok-sizes"/, 'sekce rozměrů, čar, pohybu a písma');
  assert.match(catJs, /function renderSizes\(/);
  assert.match(catJs, /function varsFor\(/, 'inspektor čte tokeny přímo z pravidel, která na prvek dopadají');
  for (const p of ['width', 'height', 'border-width', 'gap', 'letter-spacing', 'outline-width', 'animation-duration']) assert.match(catJs, new RegExp("\\['" + p + "'"), 'inspektor ukazuje ' + p);
});

console.log('');
console.log('Prošlo: ' + passed + ', selhalo: ' + failed);
if (fails.length) console.log('Selhaly: ' + fails.join(' | '));
process.exit(failed ? 1 : 0);
