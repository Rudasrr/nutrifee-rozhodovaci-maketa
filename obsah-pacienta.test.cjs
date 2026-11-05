/* Obsah obrazovek pacienta – pravidla P1–P11 (SCHEMA 86, rozhodnutí vlastníka 5. 11. 2026, bod 7; 15 odst. 15b; navrhy-designu/33/03-navrhar.md odd. 1).
   Projde všechny stavy pacienta v příběhu (každý krok tlačítkem Další se schválenými položkami) a navíc stránky Můj plán, Bezpečí a Jídla.
   Obrazovka se vykreslí jako v ostré aplikaci: jádrem NF.screens.patient bez slotů prezentační vrstvy (štítky, texty ukázky, lišta).
   Měří slova (viditelný text bez zavřených <details>, bez popisků tlačítek u karet), aktivní hlavní tlačítka, zakázané texty, opakované věty a vnoření rozbalení.
   Výšky obrazovky se měří jen v prohlížeči (navrhy-designu/33/snimky-86); tady slova a prvky.
   Spuštění: node obsah-pacienta.test.cjs   (ONLY=část názvu spustí jen vybrané testy) */
'use strict';
const assert = require('node:assert/strict');
const P = require('./pravdivost.test.cjs');

/* Limity (15 odst. 15b, P4): Dnes ≤ 150 slov, „Co teď“ ≤ 20, krok jídla 1–2 ≤ 90, krok 3 s radami ≤ 110 (návrh 2 má 103 – zvoleno bez dotazu), karta ≤ 40,
   bezpečnostní karta mimo okamžik události ≤ 60 a vždy s „Celé pravidlo“. Bezpečnostní pravidlo v okamžiku události (.card.event) se do slov obrazovky nepočítá (P8). */
const LIM = { today: 150, hero: 20, meal12: 90, meal3: 110, card: 40, doc: 60 }; /* doc: karta po opakovaných poklesech nese tři povinné body (P8 v 03 navrhoval 30 – zvoleno bez dotazu 60) */
const FORBID_ALL = [/ke schválení/i, /\bschváleno\b/i, /lékař-garant/i, /\bregistr/i, /\bP[12]\b/, /data-action="openItem"/];
const FORBID_VISIBLE = [/do učení/i, /započítan/i, /upřesní se/i, /krajní hodnot/i, /sestra nahraje a doplní/i];
const SLOTS = ['patientTag', 'demoTexts', 'demoBar', 'offNotice', 'pageOverride'];

const env = P.boot();
const { NF } = env;
function render(s, page) {
  const save = {}; SLOTS.forEach(k => { save[k] = NF.slots[k]; delete NF.slots[k]; });
  try { return NF.screens.patient(s, page); } finally { SLOTS.forEach(k => { if (save[k]) NF.slots[k] = save[k]; }); }
}
const isEl = n => n && n.tag && n.tag !== '#root';
const cls = n => ' ' + ((n.attrs && n.attrs.class) || '') + ' ';
function vis(n, out, noButtons) {
  if (n.text != null) { out.push(n.text); return; }
  if (n.tag === 'svg' || n.tag === 'script' || n.tag === 'style') return;
  if (n.attrs && (n.attrs.hidden != null || /\b(sr-only|demo-band)\b/.test(n.attrs.class || ''))) return;
  if (noButtons && n.tag === 'button') return;
  if (n.tag === 'details' && n.attrs.open == null) { (n.kids || []).filter(k => k.tag === 'summary').forEach(k => vis(k, out, noButtons)); return; }
  (n.kids || []).forEach(k => vis(k, out, noButtons));
  if (/^(div|p|li|section|h[1-6]|button|summary|td|th|label|ul|ol)$/.test(n.tag)) out.push(' ');
}
const textOf = (n, noButtons) => { const o = []; vis(n, o, noButtons); return P.norm(o.join('')); };
const words = t => t.split(' ').filter(w => /[\p{L}\d]/u.test(w)).length;
const sentences = t => t.split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(x => x.length > 25);
function within(n, pred) { for (let p = n.parent; p; p = p.parent) if (isEl(p) && pred(p)) return true; return false; }

/* sběr stavů: příběh + stránky Můj plán, Bezpečí, Jídla u prvního stavu každé scény s převzatým plánem */
const STATES = [];
P.walkStory(env, (i, k, s) => {
  if (s.role !== 'patient') return;
  STATES.push({ key: 'scéna ' + (i + 1) + ', krok ' + k, page: s.page, step: s.meal ? s.meal.step : null, html: render(s) });
  const p = NF.activePlan(s);
  if (k === 0 && p && p.understood) ['plan', 'safety', 'foods'].forEach(pg => { const was = s.page; s.page = pg; try { STATES.push({ key: 'scéna ' + (i + 1) + ', stránka ' + pg, page: pg, html: render(s) }); } finally { s.page = was; } });
});
STATES.forEach(st => { st.root = P.parse(st.html); st.pat = P.query(st.root, '.patient') || st.root; st.text = textOf(st.pat); });

let passed = 0, failed = 0; const fails = [];
function test(name, fn) {
  if (process.env.ONLY && name.indexOf(process.env.ONLY) < 0) return;
  try { fn(); console.log('OK  ', name); passed++; } catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); }
}
const bad = [];
const check = (cond, msg) => { if (!cond) bad.push(msg); };
const flush = () => { const b = bad.splice(0); assert.equal(b.length, 0, b.slice(0, 8).join(' | ') + (b.length > 8 ? ' … (+' + (b.length - 8) + ')' : '')); };

test('Průchod pokryl obrazovky pacienta: Dnes, kroky jídla 1–3, převzetí, Můj plán, Bezpečí, Jídla', () => {
  const pages = new Set(STATES.map(s => s.page)), steps = new Set(STATES.filter(s => s.page === 'meal').map(s => s.step));
  ['today', 'meal', 'takeover', 'plan', 'safety', 'foods'].forEach(p => assert.ok(pages.has(p), 'chybí stránka ' + p));
  [1, 2, 3].forEach(n => assert.ok(steps.has(n), 'chybí krok ' + n));
  assert.ok(STATES.length > 80, 'stavů ' + STATES.length);
});

test('P1: jeden nadpis h1 a nejvýš jedno aktivní hlavní tlačítko; v kroku 1 nejvýš jedna otevřená otázka', () => {
  STATES.forEach(st => {
    check(P.queryAll(st.pat, 'h1').length === 1, st.key + ': h1 ' + P.queryAll(st.pat, 'h1').length);
    const prim = P.queryAll(st.pat, '.btn.primary').filter(b => b.attrs.disabled == null);
    check(prim.length <= 1, st.key + ': aktivních hlavních tlačítek ' + prim.length + ' (' + prim.map(b => P.norm(P.textOf(b))).join(' / ') + ')');
    if (st.page === 'meal' && st.step === 1) check(P.queryAll(st.pat, '.q-open').length <= 1, st.key + ': otevřených otázek ' + P.queryAll(st.pat, '.q-open').length);
  });
  flush();
});

test('P4 a P8: limity slov – Dnes ≤ 150, „Co teď“ ≤ 20, krok jídla ≤ 90 (krok 3 s radami ≤ 110), karta ≤ 40; pravidlo v okamžiku události se nepočítá', () => {
  /* SCHEMA 86 (prezentační vrstva, 33/06 odd. 2): příběh nově ukazuje otevřenou otázku po „Nevím“ – pravidlo I-NEVIM v okamžiku události je blok .unknown-rule
     (první krok velkým písmem, Co dál, Celé pravidlo) uvnitř otázky na inzulin, ne samostatná .card.event; nepočítá se stejně jako ostatní pravidla v okamžiku události (P8) */
  STATES.forEach(st => {
    const ev = P.queryAll(st.pat, '.card.event, .unknown-rule').reduce((a, c) => a + words(textOf(c)), 0), w = words(st.text) - ev;
    if (st.page === 'today') check(w <= LIM.today, st.key + ': Dnes ' + w + ' slov');
    if (st.page === 'meal') check(w <= (st.step === 3 ? LIM.meal3 : LIM.meal12), st.key + ': krok ' + st.step + ' ' + w + ' slov');
    const hero = P.query(st.pat, '.card.hero'); if (hero) check(words(textOf(hero, true)) <= LIM.hero, st.key + ': Co teď ' + words(textOf(hero, true)) + ' slov');
    if (st.page === 'today' || st.page === 'meal') P.queryAll(st.pat, '.card').forEach(c => {
      if (/ (doc|ill|hero|q-open|advice-card) /.test(cls(c))) return; /* bezpečnost: P8; Co teď: výše; otázka a rady: celou měří limit kroku */
      const n = words(textOf(c, true)); check(n <= LIM.card, st.key + ': karta „' + textOf(c).slice(0, 40) + '…“ ' + n + ' slov');
    });
    P.queryAll(st.pat, '.advice').forEach(a => { const n = words(textOf(a, true)); check(n <= LIM.card, st.key + ': rada ' + n + ' slov'); });
  });
  flush();
});

test('P8: bezpečnostní pravidlo – v okamžiku události první krok velkým písmem a „Celé pravidlo“; jinde krátce (≤ 60 slov) a „Celé pravidlo“; krátké věty jsou doslova ze schváleného znění', () => {
  const cat = NF.instructionCatalog();
  STATES.forEach(st => {
    P.queryAll(st.pat, '.card.doc').forEach(c => {
      if (P.query(c, '.off-mark, [data-off]') || !P.query(c, '.doc-q, .rule-first, .rule-short, .bul')) return; /* oznámení „Tahle část nefunguje“ nebo karta bez pravidla */
      const full = P.queryAll(c, 'details.rule-full');
      check(full.length >= 1, st.key + ': karta „' + textOf(c).slice(0, 40) + '“ bez řádku „Celé pravidlo“');
      if (/ event /.test(cls(c))) check(!!P.query(c, '.rule-first'), st.key + ': událost bez prvního kroku');
      else check(words(textOf(c, true)) <= LIM.doc, st.key + ': bezpečnostní karta ' + words(textOf(c, true)) + ' slov');
    });
  });
  /* každá krátká věta v katalogu je celou větou schváleného znění (nic nového se nepíše) */
  cat.forEach(c => [c.prvniKrok, c.kratce].concat(c.coDal || []).filter(Boolean).forEach(t => check(c.text.indexOf(t) >= 0 || Object.values(c.bez || {}).some(b => b.indexOf(t) >= 0), c.id + ': „' + t + '“ není ze znění')));
  flush();
});

test('P9 a zásada 4: pacient nevidí štítky schvalování ani texty pro lékaře, garanta a provoz; místo štítku je značka data-item', () => {
  let refs = 0;
  STATES.forEach(st => {
    FORBID_ALL.forEach(re => check(!re.test(st.html.replace(/<[^>]*>/g, ' ')) && !(re.source.indexOf('openItem') >= 0 && re.test(st.html)), st.key + ': ' + re));
    FORBID_VISIBLE.forEach(re => check(!re.test(st.text), st.key + ': ' + re + ' v „' + (st.text.match(new RegExp('.{0,40}' + re.source + '.{0,20}', 'i')) || [''])[0] + '“'));
    check(!/class="appr\b/.test(st.html), st.key + ': štítek .appr');
    refs += (st.html.match(/data-item="/g) || []).length;
  });
  flush();
  assert.ok(refs > 50, 'značky data-item u míst, kde působí položka (' + refs + ')');
});

test('P10: žádná viditelná věta delší než 25 znaků dvakrát na téže obrazovce (celé pravidlo na klepnutí smí opakovat první krok)', () => {
  STATES.forEach(st => {
    const all = st.text, seen = {};
    sentences(all).forEach(x => { if (seen[x]) check(false, st.key + ': dvakrát „' + x.slice(0, 70) + '“'); seen[x] = 1; });
  });
  flush();
});

test('P11: jedna úroveň rozbalení (žádné details v details); v kartě nejvýš dva rozbalovací řádky (výjimka: bezpečnostní karty, pravidla nemoci a seznam pravidel v Bezpečí)', () => {
  STATES.forEach(st => {
    check(P.queryAll(st.pat, 'details details').length === 0, st.key + ': vnořené rozbalení');
    P.queryAll(st.pat, '.card').forEach(c => { if (/ (doc|ill|rules-card) /.test(cls(c))) return; const n = P.queryAll(c, 'summary').length; check(n <= 2, st.key + ': karta s ' + n + ' rozbalovacími řádky „' + textOf(c).slice(0, 30) + '“'); });
  });
  flush();
});

test('P6 a P7: „Co teď“ má řádek „Potom“ nebo otázku; věta „jak si vedu“ je slovem a ikonou, čísla až v Podrobnostech', () => {
  STATES.filter(st => st.page === 'today').forEach(st => {
    const hero = P.query(st.pat, '.card.hero'); if (!hero) return;
    const t = textOf(hero);
    check(/Potom:/.test(t) || /\?/.test(t) || P.queryAll(hero, '.choice').length > 0, st.key + ': Co teď bez „Potom“');
  });
  STATES.forEach(st => P.queryAll(st.pat, '.how-line').forEach(h => {
    check(!!P.query(h, 'svg'), st.key + ': věta bez ikony');
    check(!/\d+\s*(z|ze)\s*\d+|%/.test(textOf(h)), st.key + ': čísla ve větě „' + textOf(h) + '“');
  }));
  flush();
});

test('Povinné věty zůstávají viditelné: „nečekejte na kontrolu…“ u opakovaných poklesů (jednou), připomínka exportu, „odpovědět nemusíte“ u rad', () => {
  const rep = STATES.filter(st => P.query(st.pat, '.card.repeat'));
  assert.ok(rep.length >= 1, 'karta po opakovaných poklesech v průchodu');
  rep.forEach(st => { const n = (st.text.match(/nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal/g) || []).length; check(n === 1, st.key + ': věta „nečekejte…“ ' + n + '×'); });
  const all = P.norm(P.screenText(rep[0].pat)); check((all.match(/nečekejte na kontrolu/g) || []).length === 1, 'věta „nečekejte…“ i v rozbaleném jen jednou');
  STATES.filter(st => /jdete na kontrolu/.test(st.text)).forEach(st => check(/Před kontrolou pošlete do ordinace export ze senzoru\./.test(st.text), st.key + ': připomínka exportu'));
  STATES.filter(st => P.query(st.pat, '.advice')).forEach(st => check(/odpovědět nemusíte/.test(st.text), st.key + ': „odpovědět nemusíte“'));
  flush();
});

console.log('');
console.log(passed + ' prošlo, ' + failed + ' selhalo (stavů pacienta: ' + STATES.length + ')');
if (fails.length) console.log('Selhaly: ' + fails.join(' | '));
process.exit(failed ? 1 : 0);
