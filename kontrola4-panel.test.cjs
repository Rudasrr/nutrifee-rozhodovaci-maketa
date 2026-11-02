/* Kontrola 4 (SCHEMA 78, 30. 10. 2026), prezentační vrstva: nálezy navrhy-designu/30-kontrola4-a-pohledy-2026-10-29/01-prohlizec.md (B1, M1, M2, M4–M6, kosmetické),
   02-obsah.md (B1–B5, B12, vyprávěcí C) a 04-pristupnost.md (A1, B1–B6, C). Rozvržení a fokus se ověřují v prohlížeči; tady pravidla, na kterých stojí.
   Spuštění: node kontrola4-panel.test.cjs */
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = __dirname;
const html = fs.readFileSync(path.join(ROOT, 'nutrifee-rozhodovaci-maketa.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1].split('?')[0]);
let ctx, app, NF, D, elements, store;
function boot() {
  elements = new Map(); store = new Map();
  store.set('nutrifee-auth', JSON.stringify({ access_token: 't', refresh_token: 'r', expires_at: 4102444800000, user: { id: 'u-garant', email: 'garant@example.test', app_metadata: { role: 'garant' } } }));
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
const plain = s => String(s).replace(/\u00a0/g, ' ');
const panel = () => plain(elements.has('tour') ? elements.get('tour').innerHTML : '');
const page = () => plain(elements.get('app').innerHTML);
const narr = () => D.shownNarration(S());
const goScene = i => { act('goScene', String(i)); act('closeDrawer'); };
const sceneOf = ch => D.scenes.findIndex(x => !x.appendix && D.chapters[x.ch].id === ch);
const steps = () => D.tour.stepsFor(D.chapters[S().chapterIndex].id, S().branches);
const runTo = (k, decide) => { for (let g = 0; g < 80 && (S().tourStep || 0) < k; g++) { D.pendingNow(S()).ids.forEach(id => act('garantDecide', id + ':' + (decide ? decide(id) : 'approved') + ':ano')); act('tourNext'); } };
const runAll = decide => runTo(steps().length, decide);
const finIdx = () => sceneOf('trace');
const toSummary = () => { goScene(finIdx()); S().tourStep = D.tour.stepsFor('trace', S().branches).length; NF.render(); };
const reject = (...ids) => ids.forEach(id => act('garantDecide', id + ':rejected:ano'));

let passed = 0, failed = 0;
function test(name, fn) { try { boot(); fn(); console.log('OK  ', name); passed++; } catch (err) { console.error('FAIL', name, '—', err.message); failed++; } }

test('Prohlížeč B1: „uloženo“ jen to, co je na serveru – poděkování, konec ukázky, poznámka i lišta podle fronty; stav i na telefonu (⋯)', () => {
  act('garantDecide', 'K-KRITERIA:approved'); assert.ok(D.sync.pending() > 0, 'v testu bez sítě čeká fronta');
  NF.render(); assert.match(page(), /class="sync-badge bar-sync [^"]*"[^>]*role="status"/, 'odznak v liště'); assert.equal(/class="sync-badge bar-sync[^"]*bar-wide/.test(page()), false, 'neuložené vidět i na úzké liště');
  D.noteDraft('K-KRITERIA', 'poznámka'); act('garantNote', 'K-KRITERIA'); assert.match(D.savedLine('K-KRITERIA'), /^Uloženo \d{1,2}:\d\d (jen )?v tomto prohlížeči/); assert.equal(/na serveru/.test(D.savedLine('K-KRITERIA')), false);
  toSummary(); act('garantConfirmSummary', 'force'); let p = panel();
  assert.match(p, /Děkujeme\. Rozhodnutí zatím nejsou odeslaná/); assert.equal(/máme vaše rozhodnutí/.test(p), false); assert.match(p, /zůstaňte prosím online/);
  act('tourFinish'); p = panel(); assert.match(p, /Ukázka skončila/); assert.match(p, /nejsou odeslaná na server/); assert.equal(/jsou uložená/.test(p), false);
  act('openPresenter'); assert.match(plain(elements.get('overlay').innerHTML), /class="sync-line[^"]*"/, 'stav ukládání v ⋯ (přehled scén)'); act('closeDrawer');
  /* fronta prázdná (server potvrdil) */
  const st = D.sync.status, ip = D.sync.isPending, sx = D.sync.state; D.sync.status = () => Object.assign(st(), { pending: 0, rejected: 0, saved: true, lastErr: null }); D.sync.isPending = () => false; D.sync.state = () => 'server';
  NF.render(); p = panel(); assert.match(p, /Vaše rozhodnutí jsou uložená na serveru; můžete okno zavřít/);
  act('goSummary'); p = panel(); assert.match(p, /Děkujeme, máme vaše rozhodnutí/); assert.match(D.savedLine('K-KRITERIA'), /^Uloženo \d{1,2}:\d\d na serveru/);
  D.sync.status = st; D.sync.isPending = ip; D.sync.state = sx;
});

test('Prohlížeč M2, obsah B2: v režimu „note“ zůstává vyprávění kroku a věta o zamítnuté části se připojí', () => {
  reject('I-HYPO'); const idx = sceneOf('hypo'); goScene(idx); runAll();
  const n = narr(); assert.equal(n.mode, 'note'); assert.ok(n.note && /Pravidlo: nízká glukóza|zamítli/.test(n.note), 'věta o zamítnutí');
  assert.ok([n.co, n.vsimni, n.proc, n.dusledek].join(' ').trim().length > 40, 'vyprávění kroku zůstává'); assert.match(panel(), /class="tour-lead tour-note"/); assert.match(panel(), /<dl class="tour-rows">|Více k tomuto kroku/);
  assert.ok(D.sceneItems.some(x => x.drop), 'mapa scén má vynechané věty (drop) z generátoru');
});

test('Prohlížeč M4, M6, kosm. 1–2: pořadí návrhů z dat, volba řízku, rámeček na otázce, jedno Dál = jedna volba', () => {
  reject('D-BAZAL'); const idx = sceneOf('reviewProposals'); goScene(idx);
  let found = null; for (let g = 0; g < 30 && (S().tourStep || 0) < steps().length; g++) { D.pendingNow(S()).ids.forEach(id => act('garantDecide', id + ':approved')); act('tourNext'); const x = narr(); if (x.mode === 'run' && x.t === 'Proč návrh vznikl') { found = x; break; } }
  assert.ok(found, 'krok s návrhem ke snídani'); assert.match(found.co, /^První návrh se týká dávky ke snídani/);
  const tc = fs.readFileSync(path.join(ROOT, 'demo/tour-content.js'), 'utf8');
  assert.match(tc, /\[data-action="mealLike"\]\[data-value="' \+ foodId\('Smažený řízek s bramborovou kaší'\)/);
  assert.match(tc, /watch: '\.choice-row:has\(\[data-action="mealPortion"\]\)'/); assert.match(tc, /watch: '\.chips:has\(\[data-action="hypoAnswer"\]\)'/);
  const late = D.tour.stepsFor('lateMeal', D.defaults); assert.ok(late.some(s => s.t === 'Hodnota při jídle: 7') && late.some(s => s.t === 'Nejvyšší hodnota nad 15'));
  late.forEach(s => { const acts = (s.do || []).filter(o => o.act || o.fn || o.bind).map(o => o.act || 'fn'); if (acts.length > 1 && !s.list) assert.ok(new Set(acts).size <= 2, s.t); });
});

test('Prohlížeč M5: položka, která po zamítnutí jiné z kroku zmizí, má v panelu větu, že se rozhodne v souhrnu', () => {
  const src = fs.readFileSync(path.join(ROOT, 'demo/presenter.js'), 'utf8');
  assert.match(src, /rozhodnete v souhrnu na konci, protože/); assert.equal(typeof D.movedHere, 'function');
  /* případ z kontroly: D-CISTA a D-PRAND se nabízejí v jednom kroku; garant zamítne D-CISTA */
  goScene(sceneOf('reviewProposals'));
  for (let g = 0; g < 30 && !D.offeredNow(S()).includes('D-CISTA') && (S().tourStep || 0) < steps().length; g++) { D.pendingNow(S()).ids.forEach(id => act('garantDecide', id + ':approved')); act('tourNext'); }
  const both = D.offeredNow(S()).filter(id => !D.garantStatus(id)); assert.ok(both.includes('D-CISTA'));
  act('garantDecide', 'D-CISTA:rejected:ano');
  const others = both.filter(id => id !== 'D-CISTA');
  /* SCHEMA 80 (31/02 B4): D-PRAND má po zamítnutí D-CISTA místo dál v téže scéně – u návrhu „Probrat radu „Doplněk k jídlu““ (alt v mapě scén) */
  const alt = (D.sceneItems[sceneOf('reviewProposals')].alt || {})['D-CISTA'] || {};
  others.forEach(id => { const still = D.offeredNow(S()).includes(id), moved = D.movedHere(S()).includes(id), later = alt[id] != null && alt[id] > (S().tourStep || 0); assert.ok(still || moved || later, id + ': nabízí se dál (i v pozdějším kroku scény), nebo panel řekne, že přešla do souhrnu'); if (moved) { assert.match(panel(), /class="small gmoved"/); assert.equal(/Vše rozhodnuto; změnit lze kdykoli/.test(panel()), false); } });
});

test('Kosm. 3, 4, 12: hláška v souhrnu bez „Příběh pokračuje“; souhrn nepíše „prošli celou“; scéna za „tady“ není „hotové“', () => {
  toSummary(); act('garantDecide', 'R-PORADI:rejected:ano'); assert.equal(/Příběh pokračuje/.test(panel() + page()), false); assert.match(panel(), /Rozhodnutí změníte kdykoli tady v tabulce/);
  assert.equal(/prošli celou/.test(panel()), false);
  const src = fs.readFileSync(path.join(ROOT, 'demo/presenter.js'), 'utf8'); assert.match(src, /si > here \? 'už jste viděli' : 'hotové'/);
});

test('Obsah B1, B3, B5, B12: vyprávění podle toho, co se opravdu stalo (zamítnuté rady, návyky, sledování poklesů, „Nevím“)', () => {
  reject('R-PORCE'); goScene(sceneOf('advice')); runAll(); let n = narr();
  assert.equal(/obvyklou porcí a doplňkem/.test(n.co + (n.note || '')), false); assert.match(n.co + ' ' + (n.note || ''), /větší porcí|zamítli/);
  boot(); reject('R-NAVYKY'); goScene(sceneOf('training')); runAll(); assert.equal(S().training.result, 'done', 'zaučení bez návyků se dokončí');
  assert.equal(D.skipRanges(S()).length, 0, 've scéně zaučení se nic nepřeskočí');
  goScene(sceneOf('handover')); runTo(3); n = narr(); assert.equal(/Třetí stránka ukazuje návyky ze startovní sady/.test(n.co), false);
  boot(); reject('B-HYPO'); goScene(sceneOf('custom')); runAll(); n = narr(); assert.equal(/přečetl a zavřel/.test(String(n.vsimni) + n.co), false);
  boot(); reject('I-NEVIM'); goScene(sceneOf('afterBolus')); runAll(); const sk = D.skipRanges(S()); const st = steps();
  assert.ok(!sk.some(r => st.slice(r[0], r[1]).some(x => x.t === 'Nejistý inzulin: radíme jako po píchnutí')), 'krok „radíme jako po píchnutí“ se nepřeskočí'); assert.equal(S().meal == null || S().meal.step === 3, true);
  boot(); reject('I-MENE'); goScene(sceneOf('afterBolus')); runAll(); assert.ok(!D.skipRanges(S()).some(r => steps().slice(r[0], r[1]).some(x => x.t === 'Druhý případ: menší porce')), 'menší porce bez pravidla se ukáže');
});

test('Přístupnost A1: panel po boku do 640 px (token), užší panel, kompaktní lišta, scroll-padding; B5 pulz 3×; C9 kontrasty tokenem', () => {
  const tok = fs.readFileSync(path.join(ROOT, 'app/tokens.css'), 'utf8'), css = fs.readFileSync(path.join(ROOT, 'demo/demo.css'), 'utf8'), pres = fs.readFileSync(path.join(ROOT, 'demo/presenter.js'), 'utf8');
  assert.match(tok, /--nf-demo-side-min:640px/); assert.match(tok, /--nf-demo-panel-w:clamp\(280px,34vw,380px\)/); assert.match(tok, /--nf-demo-pulse-iter:3/);
  assert.match(pres, /var SIDE_MIN = 640; \/\* = --nf-demo-side-min \*\//); assert.equal(/max-width:1100px\)'\)/.test(pres), false);
  assert.equal(/@media \(max-width:1100px\)\{\s*\.tour-panel\{left/.test(css), false, 'panel dole jen do 640 px'); assert.match(css, /@media \(max-width:640px\)\{\s*\.tour-panel\{left/);
  assert.match(css, /scroll-padding-bottom:calc\(var\(--panelh/); assert.match(css, /animation:tourPulse 1\.1s ease-in-out var\(--nf-demo-pulse-iter\)/);
  assert.match(tok, /--nf-over:#D2632B/); assert.match(tok, /--nf-ok:#268F61/); assert.match(tok, /--nf-tir-gap:2px/);
  const L = h => { const c = [0, 2, 4].map(i => parseInt(h.slice(1 + i, 3 + i), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const tv = n => (tok.match(new RegExp(n + ':(#[0-9A-Fa-f]{6})')) || [])[1];
  for (const n of ['--nf-ok', '--nf-over']) { assert.ok(cr(tv(n), tv('--nf-bg')) >= 3, n + ' ≥ 3:1 na podkladu'); assert.ok(cr(tv(n), '#FFFFFF') >= 3, n + ' ≥ 3:1 na bílé'); }
  assert.ok(cr('#FFFFFF', tv('--nf-ok')) >= 4, 'bílý text na --nf-ok ≥ 4:1');
});

test('Přístupnost B1–B4, C1, C2, C12, C14: panel v DOM hned za lištou, zámek i pro klávesnici, fokus, živé oblasti jen krátké, názvy', () => {
  assert.equal(NF.slots.afterBanner, 'tour'); assert.match(page(), /<div class="pres-bar"[\s\S]*?<\/div><div id="tour" data-nf-keep="">/, 'místo panelu hned za lištou');
  assert.equal(/class="tour-body" aria-live/.test(panel()), false, 'vyprávění není živá oblast'); assert.match(panel(), /<p class="tour-status" role="status">/);
  assert.equal(typeof D.lockedKey, 'function'); const pres = fs.readFileSync(path.join(ROOT, 'demo/presenter.js'), 'utf8'); assert.match(pres, /addEventListener\('keydown', function \(ev\) \{ D\.lockedKey\(ev\); \}, true\)/); assert.match(pres, /aria-describedby/);
  assert.equal(NF.slots.drawerLabel('decisions'), 'Vaše rozhodnutí'); assert.equal(NF.slots.drawerLabel('presenter'), 'Přehled scén'); assert.equal(NF.slots.drawerLabel('results'), 'Výsledky garanta');
  const ui = fs.readFileSync(path.join(ROOT, 'app/ui.js'), 'utf8'); assert.match(ui, /drawerShown === drawer/, 'otevřená zásuvka se překresluje morphem (drží polohu a fokus)'); assert.match(ui, /data-nf-keep/);
  toSummary(); assert.match(page(), /aria-label="Rozhodnout: [^"]+"/);
  NF.render(); assert.match(page(), /class="btn bar-more" data-action="openPresenter" aria-haspopup="dialog"/);
  const ex = fs.readFileSync(path.join(ROOT, 'demo/explain.js'), 'utf8'); assert.match(ex, /el\.hidden = true; doc\.body\.appendChild\(el\)/);
});

test('Rozhodnutí 10: lékař návrh ověří s pacientem a rozhodne (ne „jen schvaluje“)', () => {
  for (const f of ['demo/intro.js', 'demo/tour-content.js']) assert.equal(/jen (je )?schvaluje/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), false, f);
  assert.match(fs.readFileSync(path.join(ROOT, 'demo/intro.js'), 'utf8'), /ověří (je )?s pacientem a rozhodne/);
});

console.log('\n' + passed + ' prošlo, ' + failed + ' selhalo');
process.exit(failed ? 1 : 0);
