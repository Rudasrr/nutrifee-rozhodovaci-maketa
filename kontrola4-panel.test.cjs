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


/* ---------- SCHEMA 84 (4. 11. 2026): prezentační vrstva podle navrhy-designu/32-overeni-cile-2026-11-04/03-garant-pochopeni-ovladani.md (A1–A3, B1–B7, C1–C9) ---------- */
const overlay = () => plain(elements.has('overlay') ? elements.get('overlay').innerHTML : '');
const stepsOf = i => D.tour.stepsFor(D.chapters[D.scenes[i].ch].id, Object.assign({}, D.defaults, D.scenes[i].B || {}));
const walkMain = (decide, cb) => { const fin = finIdx(); for (let i = 0; i <= fin; i++) { goScene(i); const st = steps(); cb(i, 0, S()); for (let g = 0; g < 80 && (S().tourStep || 0) < st.length; g++) { D.pendingNow(S()).ids.forEach(id => act('garantDecide', id + ':' + (decide ? decide(id) : 'approved') + ':ano')); const from = S().tourStep || 0; act('tourNext'); const k = S().tourStep || 0; if (k <= from) throw new Error('Dál se nepohnulo: scéna ' + (i + 1) + ' krok ' + from); cb(i, k, S()); } D.pendingNow(S()).ids.forEach(id => act('garantDecide', id + ':' + (decide ? decide(id) : 'approved') + ':ano')); cb(i, S().tourStep || 0, S()); } };

test('SCHEMA 84 A1, A2: se zamítnutou R-REAKCE se I-MENE, I-HYPO, D-PRAND i D-CISTA nabídnou v příběhu (ne v souhrnu) a vyprávění kroků říká pravdu', () => {
  act('garantDecide', 'R-REAKCE:rejected:ano');
  const seen = {}, narrAt = {};
  walkMain(id => 'approved', (i, k, s) => { D.offeredNow(s).forEach(id => { if (!seen[id]) seen[id] = { scene: i, step: k }; }); if (k) narrAt[i + ':' + k] = D.shownNarration(s); });
  assert.equal(seen['I-MENE'].scene, sceneOf('afterBolus'), 'I-MENE ve scéně po píchnutí');
  assert.equal(seen['I-HYPO'].scene, sceneOf('hypo'), 'I-HYPO ve scéně s poklesem');
  assert.equal(seen['D-PRAND'].scene, sceneOf('reviewProposals'), 'D-PRAND u karty ke snídani (návrh k dávce, nebo Nejdřív rady)');
  assert.ok([sceneOf('reviewProposals'), sceneOf('reviewSummary')].includes(seen['D-CISTA'].scene), 'D-CISTA u vyřazených zápisů, nebo u značky čistých dat v kroku 1 kontroly (also)');
  const n12 = narrAt[sceneOf('afterBolus') + ':' + seen['I-MENE'].step]; assert.ok(n12 && n12.mode !== 'skip', 'krok s pravidlem proběhl'); assert.match(String(n12.co), /Méně jídla než obvykle/); assert.match(String(n12.co), /vyhodnocení reakce jste zamítli/);
  const n23 = narrAt[sceneOf('reviewProposals') + ':' + seen['D-PRAND'].step]; assert.ok(n23 && n23.mode !== 'skip'); assert.match(String(n23.co) + ' ' + String(n23.vsimni || ''), /snídan/);
  toSummary(); const left = NF.garantItems(S()).filter(r => !D.garantStatus(r.id)).map(r => r.id), bezMista = (D.ucinek('R-REAKCE') || {}).bezMista || []; assert.equal(JSON.stringify(left.filter(id => bezMista.indexOf(id) < 0)), '[]', 'do souhrnu naslepo spadly jen rady, jejichž místo bez vyhodnocení zmizí: ' + left.join(', '));
});

test('SCHEMA 84 B4, C4, C5: D-PRAND u „Proč návrh vznikl“, D-CISTA ve vlastním kroku u vyřazených zápisů, D-POSTUP po „Pokles blokuje větev zvýšit“; R-REAKCE/R-SKORE a dvě pravidla pro nemoc ve dvou krocích', () => {
  const idx = sceneOf('reviewProposals'), st = stepsOf(idx), at = t => st.findIndex(x => x.t === t) + 1;
  assert.ok(at('Proč návrh vznikl') === 1 && at('Vyřazené zápisy: co do návrhu nejde') === 2 && at('Vše sedí – poklesy po menší porci jen varují') > at('O kolik – volí lékař') && at('Návrh k bazálu: noci pod cílem') > at('Dávka k obědu ponechána proti větvi „zvýšit“'), 'pořadí kroků: snídaně, oběd, bazál');
  goScene(idx); const first = {}; runTo(st.length, () => 'approved'); /* jen průchod; nabídky z D.offerStep */
  assert.equal(D.offerStep(idx, 'D-PRAND'), at('Proč návrh vznikl')); assert.equal(D.offerStep(idx, 'D-CISTA'), at('Vyřazené zápisy: co do návrhu nejde')); assert.equal(D.offerStep(idx, 'D-POSTUP'), at('Vše sedí – poklesy po menší porci jen varují'));
  assert.match(String(st[at('Vše sedí – poklesy po menší porci jen varují') - 1].vsimni), /Právě o postupu/); assert.match(String(st[at('Vyřazené zápisy: co do návrhu nejde') - 1].vsimni), /Právě o tomhle pravidle/);
  const w = sceneOf('week'); assert.equal(D.offerStep(w, 'R-REAKCE'), 1); assert.equal(D.offerStep(w, 'R-SKORE'), 2);
  const il = sceneOf('illness'); assert.equal(D.offerStep(il, 'I-NEMOC-BAZAL'), 2); assert.equal(D.offerStep(il, 'I-NEMOC-JIDLO'), 3); assert.equal(stepsOf(il)[2].t, 'Druhé pravidlo: inzulin k jídlu');
  goScene(w); runTo(1); assert.equal(JSON.stringify(D.offeredNow(S()).filter(id => !D.garantStatus(id))), '["R-REAKCE"]'); act('garantDecide', 'R-REAKCE:approved:ano'); act('tourNext'); assert.ok(D.offeredNow(S()).includes('R-SKORE'));
});

test('SCHEMA 84 B3: karta ukazuje z „Co schvalujete“ celé věty do 60 slov; u prahových položek první věty říkají slovy, co prahy znamenají', () => {
  const words = t => String(t).trim().split(/\s+/).filter(Boolean).length;
  assert.equal(D.shortCo('První věta. Druhá věta.'), 'První věta. Druhá věta.');
  const long = Array.from({ length: 9 }, (_, i) => 'Věta číslo ' + (i + 1) + ' má přesně sedm slov tady.').join(' '); const sc = D.shortCo(long); assert.ok(words(sc) <= D.CO_WORDS + 6 && /Celé znění je v průvodci níže\.$/.test(sc), sc);
  for (const r of NF.garantItems(S())) { const co = String((D.guide[r.id] || {}).co || ''); if (!co) continue; const out = D.shortCo(co); assert.ok(words(out.replace(/ Celé znění je v průvodci níže\.$/, '')) <= D.CO_WORDS || out === D.firstSentence(co) + (out.length > D.firstSentence(co).length ? ' Celé znění je v průvodci níže.' : ''), r.id + ': ' + words(out)); }
  assert.match(D.guide['D-PRAND'].co, /^Kdy vznikne návrh k dávce „nad cílem“: za posledních nejméně \d+ dní je aspoň \d+ čistých jídel/); assert.match(D.guide['D-CISTA'].co, /^Co je čistý zápis/);
  assert.match(D.guide['D-POSTUP'].co, /větve jsou zvýšit, snížit nebo ponechat, nikdy velikost kroku/); assert.match(D.guide['R-REAKCE'].co, /^Co znamená „v cíli“/);
  assert.match(D.guide['K-KRITERIA'].co, /^Pět podmínek zařazení:[\s\S]*?žádný jiný lék na diabetes[\s\S]*?\. Vylučovací kritéria: těhotenství/); assert.match(D.guide['R-DOPLNEK'].co, /bílý jogurt, hrst ořechů, plátek sýra, vejce, kousek masa/); assert.match(D.guide['S-SEMAFOR'].co, /^Semafor času v cíli: zelený/); /* SCHEMA 90: K-KRITERIA v2 má pět podmínek (záměrná změna) */
  assert.equal(/\{[A-Za-z_|%:-]+\}/.test(['D-PRAND', 'D-CISTA', 'D-POSTUP', 'R-REAKCE', 'R-DOPLNEK', 'S-SEMAFOR'].map(id => D.guide[id].co).join(' ')), false, 'všechny zástupné hodnoty dosazené');
  goScene(sceneOf('enroll')); runTo(2); assert.match(panel(), /<p class="gco"><b>Co schvalujete:<\/b> Pět podmínek zařazení:[^<]*Vylučovací kritéria: těhotenství[^<]*pamětí\. Celé znění je v průvodci níže\.<\/p>/);
});

test('SCHEMA 84 rozhodnutí 7 (A3): úvod říká asi 60 minut a že se dá přerušit; panel ukazuje „zbývá asi N minut“ a odhad klesá', () => {
  const intro = plain(D.introPage(S())); /* SCHEMA 90 (36/04 S4, záměrná změna): délka se počítá – rozpětí bez a s četbou průvodce, ne pevných 60 minut */
  const tm = intro.match(/Celá ukázka trvá asi (\d+) minut, když [^.]* a asi (\d+) minut, když/); assert.ok(tm, 'úvod říká rozpětí délky'); assert.ok(+tm[1] >= 60 && +tm[2] > +tm[1] && +tm[2] <= 180, 'rozpětí ' + tm[1] + '–' + tm[2]);
  assert.match(intro, /přerušit a pokračovat/); assert.equal(/asi 15 minut|asi 60 minut:/.test(intro), false);
  assert.match(intro, /Provozní pravidla – formáty, texty obrazovek, milníky – neschvalujete/); assert.match(intro, /neformální podklad pro autora, ne o podpis/);
  goScene(1); const a = D.remainingSeconds(S()); assert.ok(a > 40 * 60 && a < 120 * 60, 'odhad ' + a + ' s'); assert.match(panel(), /Průběh: [^<]*· zbývá asi \d+ minut/);
  goScene(sceneOf('reviewProposals')); const b = D.remainingSeconds(S()); assert.ok(b < a && b > 2 * 60, 'odhad klesá: ' + a + ' → ' + b);
  runAll(); act('tourNext'); const c = D.remainingSeconds(S()); assert.ok(c < b);
});

test('SCHEMA 84 B2: zásuvka nenabízí tlačítka položek z budoucích scén; rozhodnuté a nabídnuté kartu mají', () => {
  goScene(sceneOf('handover')); act('openDecisions'); const o = overlay();
  assert.match(o, /přijd(e|ou) v dalších scénách/); assert.match(o, /class="gitem gfuture" data-gitem="D-PRAND"[^>]*>[\s\S]*?uvidíte ve scéně \d+/);
  assert.equal(/data-action="garantDecide" data-value="D-PRAND:approved"/.test(o), false, 'bez tlačítek u budoucí položky');
  assert.match(o, /class="gitem[^"]*" data-gitem="K-KRITERIA"><button type="button" class="gh" data-action="garantOpen"/, 'dřívější scéna má kartu, která jde rozbalit k rozhodnutí'); assert.equal(/class="gitem gfuture" data-gitem="K-KRITERIA"/.test(o), false);
  assert.equal(D.offeredYet('D-PRAND'), false); assert.equal(D.offeredYet('K-KRITERIA'), true);
  act('closeDrawer'); toSummary(); act('openDecisions'); assert.equal(/gfuture/.test(overlay()), false, 've finále jsou všechny k rozhodnutí');
});

test('SCHEMA 84 C6, C8: nápověda „i“ říká, jak se vrátit k rozhodnutí, že se poznámka ukládá sama a kde je souhrn; „Zpět k úvodu“ otevře úvod nad příběhem; hláška po načtení počítá položky a poznámky', () => {
  goScene(2); act('tourInfo'); const p = panel(); assert.match(p, /class="tour-info-box" role="note"/); assert.match(p, /ukládá samo už při psaní/); assert.match(p, /zásuvku „Vaše rozhodnutí“/); assert.match(p, /souhrn všech rozhodnutí/); assert.match(p, /neformální podklad/); assert.match(p, /data-action="tourIntro"/);
  act('tourIntro'); assert.equal(NF.currentDrawer(), 'intro'); assert.match(overlay(), /Jak ukázku ovládat/); assert.equal(NF.slots.drawerLabel('intro'), 'Úvod ukázky'); assert.equal(S().sceneIndex, 2, 'příběh stojí'); act('closeDrawer');
  const rt = new Date().toISOString();
  D.garantMerge([{ sid: 's1', item: 'C-CILE', kind: 'decision', status: 'approved', comment: '', rt }, { sid: 's2', item: 'C-CILE', kind: 'note', status: 'approved', comment: 'x', rt }, { sid: 's3', item: 'K-KRITERIA', kind: 'decision', status: 'rejected', comment: '', rt }], { login: true });
  assert.match(panel(), /Načteno z vašeho přihlášení: rozhodnutí u 2 položek a 1 poznámku\./);
});

test('SCHEMA 84 B7, C1, C3, C7, C9: souhrn říká, proč se položka nenabídla (přeskočený krok); dodatek 31:5 má vlastní větu; oznámení v telefonu sbalené; velikosti přes token; fokus po Dál vidět', () => {
  const css = fs.readFileSync(path.join(ROOT, 'demo/demo.css'), 'utf8');
  assert.match(css, /\.pres-bar \.btn\{min-height:var\(--nf-tap-sm\)/); assert.match(css, /\.tour-link,\.tour-status-link\{[^}]*min-height:var\(--nf-tap-sm\)/); assert.equal(/min-height:3[26]px/.test(css), false);
  assert.match(css, /\.tour-panel h2\[tabindex="-1"\]:focus-visible[^{]*\{outline:3px solid var\(--nf-demo-focus\)/); assert.match(css, /body\.pres-locked main \.off-notice summary/);
  const tc = fs.readFileSync(path.join(ROOT, 'demo/tour-content.js'), 'utf8'); assert.match(tc, /t: 'Ostatní návrhy'[\s\S]{0,900}jinak: function \(B, S, miss\) \{ var off = adviceOff\(S\)/);
  /* C3: pacient – jen první věta a „Zobrazit, co chybí“; lékař celý text */
  act('garantDecide', 'R-REAKCE:rejected:ano'); goScene(sceneOf('afterBolus')); runTo(2); const pg = page(); assert.match(pg, /data-off="R-REAKCE"[\s\S]*?<details class="more off-more"><summary>Zobrazit, co chybí<\/summary>/);
  act('garantDecide', 'R-REAKCE:approved:ano'); act('garantDecide', 'S-SEMAFOR:rejected:ano'); goScene(sceneOf('reviewSummary')); runTo(D.offerStep(sceneOf('reviewSummary'), 'S-SEMAFOR')); const pd = page(); assert.match(pd, /data-off="S-SEMAFOR"/); assert.equal(/data-off="S-SEMAFOR"[\s\S]{0,1200}off-more/.test(pd), false, 'u lékaře celý text');
  /* B7: položka, jejíž krok nabídky se přeskočil, má v souhrnu větu proč */
  act('garantDecide', 'S-SEMAFOR:approved:ano'); act('garantDecide', 'R-PODOBNOST:rejected:ano'); goScene(sceneOf('custom')); runAll(id => 'approved');
  assert.ok(!D.garantStatus('R-PORADI') || D.notOfferedWhy('R-PORADI') !== undefined);
  const sk = NF.garantItems(S()).filter(r => !D.garantStatus(r.id)).map(r => r.id);
  toSummary(); sk.forEach(id => { const why = D.notOfferedWhy(id); if (why) assert.match(why, /V příběhu jsme ji nenabídli: (krok ve scéně \d+, ve kterém se ukazuje, se přeskočil, protože jste zamítli|zamítli jste)/); });
});

test('SCHEMA 84 vysvětlivky i v panelu: dekorace a klepnutí hledají prvky v #main, #tour a #overlay', () => {
  const ex = fs.readFileSync(path.join(ROOT, 'demo/explain.js'), 'utf8');
  assert.match(ex, /\['main', 'tour', 'overlay'\]\.map\(function \(id\) \{ return doc\.getElementById/); assert.match(ex, /var OUT = '\.pres-bar,\.lock-bubble,\.gsum-page';/); assert.match(ex, /inRoot/);
});


test('SCHEMA 84 „panel = rámeček“ (vlastník 5. 11. 2026): v „teď“ jen položky z cíle kroku, rozbalená karta jen z „teď“, po Zpět a po skoku je panel jako při první návštěvě kroku', () => {
  const nowIds = () => { const h = panel(), a = h.indexOf('id="tour-decide">'); let seg = a < 0 ? '' : h.slice(a); ['<div class="gearlier">', '<p class="small gmoved">', '<div class="garant off-scene">', '<p class="tour-hint">', '<div class="tour-foot">'].forEach(t => { const j = seg.indexOf(t); if (j >= 0) seg = seg.slice(0, j); }); return [...seg.matchAll(/<div class="gitem[^"]*" data-gitem="([^"]+)"/g)].map(x => x[1]); };
  const openIds = () => [...panel().matchAll(/<div class="gitem[^"]*\bopen\b[^"]*" data-gitem="([^"]+)"/g)].map(x => x[1]);
  const key = () => JSON.stringify({ now: nowIds(), open: openIds() });
  const first = {}; let nSteps = 0, badNow = [], badOpen = [], badBack = [], badJump = [];
  const fin = finIdx();
  for (let i = 1; i <= fin; i++) {
    goScene(i); const st = steps(); first[i + ':0'] = key();
    for (let g = 0; g < 80 && (S().tourStep || 0) < st.length; g++) {
      D.pendingNow(S()).ids.forEach(id => act('garantDecide', id + ':approved:ano'));
      act('tourNext'); const k = S().tourStep || 0, w = i + ':' + k; nSteps++;
      const now = nowIds(), open = openIds(), idx = i;
      now.forEach(id => { if (D.offerStep(idx, id) !== k && !(k >= st.length && !D.garantStatus(id))) badNow.push(w + ' ' + id + ' (offerStep ' + D.offerStep(idx, id) + ')'); });
      open.forEach(id => { if (now.indexOf(id) < 0) badOpen.push(w + ' ' + id); });
      if (!first[w]) first[w] = key();
      /* c) Zpět z k na k−1 a zpět na k: stejný panel jako poprvé */
      if (k >= 2) { D.pendingNow(S()).ids.forEach(id => act('garantDecide', id + ':approved:ano')); const kd = key(); act('tourBack'); const wb = i + ':' + (S().tourStep || 0); if (first[wb] && key() !== first[wb] && key() !== first[wb + 'd']) badBack.push(wb + ' ' + key() + ' ≠ ' + first[wb]); act('tourNext'); if ((S().tourStep || 0) !== k) badBack.push('po Zpět+Dál krok ' + S().tourStep + ' místo ' + k); first[w + 'd'] = kd; }
      D.pendingNow(S()).ids.forEach(id => act('garantDecide', id + ':approved:ano')); if (!first[w + 'd']) first[w + 'd'] = key();
    }
  }
  /* d) skok přes přehled scén: krok 0 */
  for (let i = 1; i <= fin; i++) { goScene(i); if (key() !== first[i + ':0']) badJump.push(i + ':0 ' + key() + ' ≠ ' + first[i + ':0']); }
  assert.ok(nSteps > 100, 'kroků ' + nSteps);
  assert.equal(badNow.length, 0, 'v „teď“ položka mimo cíl kroku: ' + badNow.slice(0, 6).join(' | '));
  assert.equal(badOpen.length, 0, 'rozbalená karta mimo „teď“: ' + badOpen.slice(0, 6).join(' | '));
  assert.equal(badBack.length, 0, 'po Zpět jiný panel: ' + badBack.slice(0, 4).join(' | '));
  assert.equal(badJump.length, 0, 'po skoku jiný panel: ' + badJump.slice(0, 4).join(' | '));
  /* dřív rozhodnuté položky jen řádkem, rozbalí se jen klepnutím */
  goScene(sceneOf('doses')); runTo(5); assert.match(panel(), /Dříve v této scéně: rozhodnuto \d+ · zobrazit/); assert.equal(/<div class="gearlier">[\s\S]*?<div class="gitem/.test(panel()), false);
  act('garantEarlier'); assert.match(panel(), /<div class="gearlier">[\s\S]*?<div class="gitem[^"]*" data-gitem="R-NAVYKY"/); act('tourNext'); assert.equal(/· skrýt/.test(panel()), false, 'po Dál zase sbalené');
});

console.log('\n' + passed + ' prošlo, ' + failed + ' selhalo');
process.exit(failed ? 1 : 0);
