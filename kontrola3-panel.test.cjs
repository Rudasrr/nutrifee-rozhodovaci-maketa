/* Kontrola 3 (SCHEMA 77, 29. 10. 2026), prezentační vrstva: nálezy navrhy-designu/28-kontrola3-2026-10-29/01-prohlizec.md (B1, B2, M1, M4–M8, K1, K2, K5, K6)
   a 02-obsah.md B1 (úvody a kroky po zamítnutí). Rozvržení (M2, M3, K4, K7) se ověřuje v prohlížeči; tady jen pravidla, na kterých stojí.
   Spuštění: node kontrola3-panel.test.cjs */
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = __dirname;
const html = fs.readFileSync(path.join(ROOT, 'nutrifee-rozhodovaci-maketa.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1].split('?')[0]);
let ctx, app, NF, D, elements, store;
function boot({ keepStore = false } = {}) {
  elements = new Map();
  if (!(keepStore && store)) { store = new Map(); store.set('nutrifee-auth', JSON.stringify({ access_token: 't', refresh_token: 'r', expires_at: 4102444800000, user: { id: 'u-garant', email: 'garant@example.test', app_metadata: { role: 'garant' } } })); }
  const el = id => { if (!elements.has(id)) elements.set(id, { innerHTML: '', focus() { }, querySelector() { return null; }, querySelectorAll() { return []; }, childNodes: [] }); return elements.get(id); };
  const sb = {
    console: { log() { }, warn() { }, error() { }, info() { } },
    document: { getElementById: el, addEventListener() { }, querySelectorAll() { return []; }, createElement() { return { click() { }, set innerHTML(v) { }, querySelectorAll() { return []; } }; }, activeElement: null, body: null },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
    setTimeout() { return 1; }, Blob: class { }, URL: { createObjectURL() { return 'x'; }, revokeObjectURL() { } }
  };
  sb.window = sb; sb.globalThis = sb;
  ctx = vm.createContext(sb);
  for (const f of scripts) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  app = ctx.NutriFeeApp; NF = ctx.NutriFee; D = ctx.NutriFeeDemo;
}
const S = () => app.getState();
const act = (a, v) => app.act(a, v);
const plain = s => String(s).replace(/ /g, ' ');
const panel = () => plain(elements.has('tour') ? elements.get('tour').innerHTML : '');
const page = () => plain(elements.get('app').innerHTML);
const finIdx = () => D.scenes.findIndex(x => !x.appendix && D.chapters[x.ch].id === 'trace');
const toSummary = () => { act('goScene', String(finIdx())); act('closeDrawer'); S().tourStep = D.tour.stepsFor('trace', S().branches).length; NF.render(); };

let passed = 0, failed = 0;
function test(name, fn) { try { boot(); fn(); console.log('OK  ', name); passed++; } catch (err) { console.error('FAIL', name, '—', err.message); failed++; } }
const narr = () => D.shownNarration(S());
const goScene = i => { act('goScene', String(i)); act('closeDrawer'); };
const runTo = (k, decide) => { for (let g = 0; g < 60 && (S().tourStep || 0) < k; g++) { D.pendingNow(S()).ids.forEach(id => act('garantDecide', id + ':' + (decide ? decide(id) : 'approved') + ':ano')); act('tourNext'); } };
const sceneOf = ch => D.scenes.findIndex(x => !x.appendix && D.chapters[x.ch].id === ch);

test('B1, M4: po „Potvrdit přesto“ nerozhodnuté položky dodatek neblokují; panel ve finále nepočítá položky zvlášť a říká, kde v tabulce jsou', () => {
  toSummary();
  const left = D.garantSummary(S()).remaining; assert.ok(left > 0);
  assert.deepEqual([...D.pendingNow(S()).ids], [], 've finále blokuje jen potvrzení souhrnu');
  let p = panel(); assert.equal(/Rozhodněte \d+ polož/.test(p), false, 'žádný druhý počet'); assert.match(p, new RegExp('Nerozhodnuto ' + left + '\\.'));
  act('garantConfirmSummary'); assert.match(panel(), /potvrdit přesto\?/); assert.match(panel(), /Dodatek je otevřený i s nimi/);
  act('garantConfirmSummary', 'force'); p = panel(); assert.match(p, /Projít varianty v dodatku/);
  const fin = S().sceneIndex; act('tourNext'); assert.equal(S().sceneIndex, fin + 1, 'Dál vede do dodatku'); assert.ok(D.scenes[S().sceneIndex].appendix);
});

test('M1: zamítnutí v kroku, který položku ukazuje – krok je „note“, ne „přeskakujeme“; úsek počítá jen kroky, které přijdou; Zpět nejde dopředu', () => {
  const idx = sceneOf('reviewProposals'); goScene(idx);
  runTo(1); assert.ok(D.offeredNow(S()).includes('D-BAZAL'));
  act('garantDecide', 'D-BAZAL:rejected:ano');
  let n = narr(); assert.equal(n.mode, 'note'); assert.match(n.co, /Ukázka krok provedla|Krok ukazuje obrazovku jen zčásti/); assert.equal(/Přeskočili/.test(n.co), false);
  act('tourNext'); n = narr(); assert.equal(n.mode, 'skip');
  const r = D.skipRanges(S()); assert.equal(r.length, 1); assert.equal(r[0][0], 1, 'úsek začíná krokem, který teprve přišel');
  const m = n.co.match(/Přeskočili jsme (\d+)/); assert.ok(m); assert.equal(Number(m[1]), r[0][1] - r[0][0]);
  const at = S().tourStep; act('tourBack'); assert.ok(S().tourStep < at, 'Zpět jde zpět'); assert.ok(S().tourStep <= 1);
});

test('M8: věta o přeskočení jmenuje kroky, zamítnutou položku a položky, které se rozhodnou v souhrnu', () => {
  boot(); act('garantDecide', 'R-REAKCE:rejected:ano');
  const idx = sceneOf('advice'); goScene(idx);
  let found = null; for (let g = 0; g < 20 && (S().tourStep || 0) < D.tour.stepsFor('advice', S().branches).length; g++) { D.pendingNow(S()).ids.forEach(id => act('garantDecide', id + ':approved')); act('tourNext'); const x = narr(); if (x.mode === 'skip') { found = x; break; } }
  assert.ok(found, 've scéně s radami se něco přeskočí');
  assert.match(found.co, /^Přeskočili jsme (krok|\d+ krok)/); assert.match(found.co, /„[^“]+“/); assert.match(found.co, /Bez položky „Vyhodnocení reakce na jídlo“, kterou jste zamítli/);
});

test('B2, K6: správce má „Výsledky garanta“ i v Přehledu scén (telefon) a v liště nemá počítadlo garanta', () => {
  store.set('nutrifee-auth', JSON.stringify({ access_token: 't', refresh_token: 'r', expires_at: 4102444800000, user: { id: 'u-admin', email: 'admin@example.test', app_metadata: { role: 'admin' } } }));
  boot({ keepStore: true }); NF.render();
  const bar = plain(elements.get('app').innerHTML); assert.equal(/class="[^"]*bar-todo/.test(bar), false);
  act('openPresenter'); assert.match(plain(elements.get('overlay').innerHTML), /data-action="openResults"/);
  boot(); NF.render(); assert.match(plain(elements.get('app').innerHTML), /bar-todo/); act('openPresenter'); assert.equal(/data-action="openResults"/.test(plain(elements.get('overlay').innerHTML)), false, 'garant výsledky nemá');
});

test('M5: „prošel celou maketu“ jen po všech scénách hlavní linie; nejdál název scény, ne „scéna 31 z 31“', () => {
  const main = D.scenes.map((x, i) => i).filter(i => !D.scenes[i].appendix), fin = main[main.length - 1], u = { user_id: 'ua', user_email: 'a@example.test' };
  const T = i => '2026-10-29T10:' + String(10 + i).padStart(2, '0') + ':00.000Z';
  const base = [Object.assign({ id: 'p', kind: 'progress', item: 'PRUBEH', at: T(40), scene: D.scenes.length, params: { scene: D.scenes.length, total: D.scenes.length, mainEnd: fin + 1, title: D.scenes[D.scenes.length - 1].title } }, u),
    Object.assign({ id: 's', kind: 'summary', item: 'SOUHRN', at: T(45), params: { approved: 28, rejected: 0, pending: 0, total: 28, rejectedIds: [] } }, u)];
  let txt = plain(D.results.panel(S())); /* bez řádků */
  D.results.setRows(base.concat([Object.assign({ id: 'x', kind: 'scene', item: 'SCENA', at: T(1), scene: 2, params: { how: 'skok', items: [] } }, u)]));
  txt = plain(D.results.panel(S())); assert.match(txt, /prošel celou maketu: ne – souhrn potvrzen [^<]*nenavštívené scény hlavní linie: \d+/); assert.match(txt, /nejdál: „[^<]+ \(dodatek, varianta \d+ z \d+\)/); assert.equal(/scéna \d+ z \d+ ·/.test(txt), false);
  D.results.setRows(base.concat(main.filter(i => i < fin).map(i => Object.assign({ id: 'v' + i, kind: 'scene', item: 'SCENA', at: T(i % 30), scene: i + 1, params: { how: 'dal', items: [] } }, u))));
  txt = plain(D.results.panel(S())); assert.match(txt, /prošel celou maketu: ano – všechny scény hlavní linie, souhrn potvrzen/); assert.match(txt, /nerozhodnuto 0/);
});

test('M6: návrat z odbočky do registru vede tam, kde garant v příběhu byl', () => {
  goScene(5); runTo(2); const home = { sc: S().sceneIndex, k: S().tourStep };
  act('openAside', 'registry'); assert.match(panel(), new RegExp('Scéna „' + (D.scenes[5].title || D.chapters[D.scenes[5].ch].title).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  act('goSceneFrom', '6:Z-GLUKOZA'); assert.equal(S().sceneIndex, 6);
  act('regReturn'); assert.match(panel(), /Mimo příběh/); assert.match(panel(), new RegExp('Scéna „' + (D.scenes[5].title || D.chapters[D.scenes[5].ch].title).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  act('tourReturn'); assert.equal(S().sceneIndex, home.sc); assert.equal(S().tourStep, home.k);
});

test('K1, K2, K5: tvar slovesa v souhrnu; „nerozhodnuto“ v kartách garanta; „i“ v panelu je tlačítko s textem', () => {
  const pres = fs.readFileSync(path.join(ROOT, 'demo/presenter.js'), 'utf8');
  assert.match(pres, /položky se v příběhu nenabídly/); assert.match(pres, /položek se v příběhu nenabídlo/);
  goScene(1); runTo(2); assert.match(panel(), /data-gitem="K-KRITERIA"[\s\S]{0,400}>nerozhodnuto</);
  assert.match(panel(), /<button type="button" class="tour-info" data-action="tourInfo"/); assert.equal(/tour-info-text/.test(panel()), false);
  act('tourInfo'); assert.match(panel(), /class="tour-info-text small"[^>]*>Fialová tlačítka ovládají ukázku/);
});

test('02-obsah B1, M7, K3: úvody scén se zamítnutí přizpůsobí; úvody variant dodatku říkají, čím se liší; nadpisy bez citace, která na obrazovce není', () => {
  act('garantDecide', 'B-HYPO:rejected:ano'); goScene(sceneOf('hypo'));
  let n = narr(); assert.equal(n.mode, 'note'); assert.match(n.co, /Sledování poklesů jste zamítli/); assert.equal(/zeptá na pokles/.test(n.co), false);
  boot(); act('garantDecide', 'P-NEMOC:rejected:ano'); goScene(sceneOf('recovery')); n = narr(); assert.equal(n.mode, 'note'); assert.match(n.co, /Režim nemoci jste zamítli/);
  boot(); const ap = D.scenes.map((x, i) => i).filter(i => D.scenes[i].appendix), mainIntro = {};
  D.scenes.forEach((x, i) => { if (x.appendix) return; goScene(i); mainIntro[D.chapters[x.ch].id] = narr().co; });
  ap.forEach(i => { goScene(i); const id = D.chapters[D.scenes[i].ch].id; if (id === 'newplan') return; assert.notEqual(narr().co, mainIntro[id], 'dodatek ' + (i + 1) + ': úvod jiný než v hlavní linii'); assert.match(narr().co, /Na rozdíl od hlavní linie/); });
  const tc = fs.readFileSync(path.join(ROOT, 'demo/tour-content.js'), 'utf8'); assert.equal(/t: '„Už je mi lépe“'|Při „Nevím“ jako po píchnutí/.test(tc), false);
});

test('Kontrola pravdivosti: citace v oznámení se nepočítá jako obrazovka; generátor hlídá i popsaný (necitovaný) obsah a úvody; M3 kontejner telefonu', () => {
  const P = require('./pravdivost.test.cjs');
  for (const f of ['segments', 'describes', 'describesLoose', 'describesGone', 'introDependency']) assert.equal(typeof P[f], 'function', f);
  assert.ok(P.describes('věta, že se za 60 minut od jídla zeptáme, jestli glukóza klesla pod 4', ['Za 60 min od jídla se zeptáme, jestli glukóza klesla pod 4.'], []));
  assert.equal(P.describes('Pacient přijal pořadí a zápis uložil.', ['Až se zápisy stejného jídla shodnou, umíme vám k němu poradit.'], []), null);
  const src = fs.readFileSync(path.join(ROOT, 'pravdivost.test.cjs'), 'utf8'); assert.match(src, /seen = textNoOff\(root\)/);
  const gen = fs.readFileSync(path.join(ROOT, '..', 'navrhy-designu', '04-pohledy-2026-10-05', 'scene-items.cjs'), 'utf8'); assert.match(gen, /introDependency/); assert.match(gen, /bezMista/);
  assert.ok(D.sceneItems.some(x => x.deps && x.deps['0']), 'mapa má závislosti úvodů');
  const css = fs.readFileSync(path.join(ROOT, 'app/design.css'), 'utf8'); assert.match(css, /\.patient\{container-type:inline-size\}/); assert.match(css, /@container \(max-width:520px\)\{\.patient \.grid2\{grid-template-columns:1fr\}\}/);
});

console.log('\n' + passed + ' prošlo, ' + failed + ' selhalo');
process.exit(failed ? 1 : 0);
