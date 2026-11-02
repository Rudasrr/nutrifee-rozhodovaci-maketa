/* Nezávislá kontrola SCHEMA 74 (27. 10. 2026), prezentační vrstva: B1, M2, M6 a kosmetické nálezy z navrhy-designu/26-nezavisla-kontrola-2026-10-27/01-prohlizec.md.
   Rozvržení (M3–M5, M9–M11: štítek nabízené položky a cíl kroku nad lištami a panelem, karta v panelu nad patičkou) se ověřuje v prohlížeči;
   tady se hlídají jen pravidla, na kterých stojí. Spuštění: node kontrola74-panel.test.cjs */
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

test('B1: po změně rozhodnutí jde souhrn potvrdit znovu i s nerozhodnutými položkami (otázka s oběma tlačítky, pak Skončit)', () => {
  toSummary();
  assert.ok(D.garantSummary(S()).remaining > 0, 'zbývají nerozhodnuté');
  act('garantConfirmSummary', 'force'); assert.ok(D.progress().done); assert.equal(D.pendingNow(S()).summary, false);
  assert.match(panel(), /data-action="tourFinish"/);
  const id = NF.garantItems(S())[0].id; act('garantDecide', id + ':approved');
  assert.equal(D.pendingNow(S()).summary, true, 'po změně se souhrn znovu potvrzuje');
  let p = panel(); assert.match(p, /Od potvrzení jste rozhodnutí změnili/); assert.equal((p.match(/data-action="garantConfirmSummary"/g) || []).length, 1, 'jedno tlačítko potvrzení');
  assert.match(p, /data-action="garantConfirmSummary">Potvrdit souhrn znovu</); assert.equal(/data-action="tourNext"/.test(p), false, 'místo Dál potvrzení');
  act('garantConfirmSummary'); assert.equal(D.confirmAsk(), true); p = panel();
  assert.match(p, /potvrdit přesto\?/); assert.match(p, /data-action="garantConfirmSummary" data-value="force"/); assert.match(p, /data-action="garantConfirmCancel"/);
  const before = D.progress().done; act('garantConfirmSummary', 'force');
  assert.ok(D.progress().done >= before); assert.equal(D.pendingNow(S()).summary, false);
  p = panel(); assert.match(p, /Děkujeme(, máme vaše rozhodnutí|\. Rozhodnutí zatím nejsou odeslaná)/); assert.match(p, /data-action="tourFinish"/);
});

test('M2: položka, jejíž krok se přeskočil kvůli zamítnutí, se v té scéně nenabízí, jde do souhrnu; věta o přeskočení je v panelu jednou', () => {
  let checked = 0;
  for (let idx = 0; idx < D.scenes.length; idx++) {
    boot(); act('goScene', String(idx)); act('closeDrawer');
    const steps = D.tour.stepsFor(D.chapters[D.scenes[idx].ch].id, S().branches || D.defaults); /* dodatek má své větve */
    const needs = [...new Set(steps.flatMap(st => st.needs || []))].filter(id => NF.item(S(), id) && NF.garantItems(S()).some(r => r.id === id));
    if (!needs.length) continue;
    needs.forEach(id => act('garantDecide', id + ':rejected:ano'));
    act('goScene', String(idx)); act('closeDrawer');
    for (let k = 0; k < steps.length && (S().tourStep || 0) < steps.length; k++) { /* SCHEMA 76 (kontrola 2, M3): úsek přeskočených kroků je jedno Dál – smyčka končí na konci scény */
      D.pendingNow(S()).ids.forEach(id => act('garantDecide', id + ':approved'));
      act('tourNext');
      const i = S().tourStep, st = steps[i - 1];
      const offered = D.offeredNow(S());
      offered.forEach(id => assert.equal(D.offerSkipped(id, S()), false, 'scéna ' + (idx + 1) + ' krok ' + i + ': ' + id + ' se nabízí, i když jeho krok byl přeskočen'));
      if (st && D.needsMissing(st, S()).length) {
        checked++;
        assert.equal((panel().match(/Přeskočili jsme/g) || []).length, 1, 'scéna ' + (idx + 1) + ' krok ' + i + ': věta o přeskočení jen jednou'); /* kontrola 3 (M8): věta říká, co úsek ukazoval */
      }
    }
  }
  assert.ok(checked > 0, 'v příběhu je aspoň jeden přeskočený krok');
});

test('M6: v souhrnu řádek rozhodnutý ze skupiny „Nerozhodnuto“ zůstane na místě s novým stavem a poznámkou; přeřadí se při dalším otevření', () => {
  toSummary();
  const first = () => { const m = page(); const t = m.indexOf('<tbody>'), e = m.indexOf('</tbody>', t); return m.slice(t, e); };
  const id = (first().match(/data-gsum-row="([^"]+)"/) || [])[1]; assert.ok(id);
  const rem = D.garantSummary(S()).remaining;
  act('garantOpen', id); D.noteDraft(id, 'Poznámka na místě'); act('garantDecide', id + ':approved');
  const g = first(); assert.match(g, new RegExp('data-gsum-row="' + id + '"'), 'řádek zůstal ve skupině Nerozhodnuto');
  assert.match(g, /Nerozhodnuto \(/); assert.match(g, new RegExp('Nerozhodnuto \\(' + (rem - 1) + '\\)'), 'počet ve skupině je skutečný počet nerozhodnutých');
  assert.match(g, /„Poznámka na místě“/); assert.match(g, />schváleno</);
  assert.equal((page().match(new RegExp('data-gsum-row="' + id + '"', 'g')) || []).length, 1, 'řádek jen jednou');
  act('goSummary'); assert.equal(new RegExp('data-gsum-row="' + id + '"').test(first()), false, 'po dalším otevření je ve skupině své scény');
});

test('Kosm. 2: první věta vyprávění neusekne citaci před uzavírací uvozovkou', () => {
  assert.equal(D.firstSentence('„Dejte si obvyklou porci. Vaše dávka je nastavená.“ Pacient radu vidí.'), '„Dejte si obvyklou porci. Vaše dávka je nastavená.“');
  assert.equal(D.firstSentence('Rada stojí. Druhá věta.'), 'Rada stojí.');
  assert.equal(D.firstSentence('Bez tečky'), 'Bez tečky');
  for (const ch of D.chapters) for (const st of D.tour.stepsFor(ch.id, D.defaults)) {
    const co = typeof st.co === 'function' ? '' : String(st.co || ''); if (!co) continue;
    const f = D.firstSentence(co); assert.ok((f.match(/„/g) || []).length <= (f.match(/“/g) || []).length, ch.id + ': ' + f);
  }
});

test('Kosm. 11: „Ukázka skončila“ přežije obnovení stránky; návrat do ukázky ho zruší', () => {
  toSummary(); act('garantConfirmSummary', 'force'); act('tourFinish'); assert.match(panel(), /Ukázka skončila/);
  boot({ keepStore: true }); NF.render(); assert.match(panel(), /Ukázka skončila/);
  act('tourUnfinish'); NF.render(); assert.equal(/Ukázka skončila/.test(panel()), false);
  boot({ keepStore: true }); NF.render(); assert.equal(/Ukázka skončila/.test(panel()), false);
});

test('Kosm. 9, 12: úvod říká, že maketa se chová jako po schválení; otázky ke scénáři říkají, kam s odpovědí', () => {
  act('goScene', '0'); act('closeDrawer'); assert.match(page(), /maketa se chová, jako by schválení už proběhlo/);
  act('openPresenter'); assert.match(plain(elements.get('overlay').innerHTML), /odpovídat na ně nemusíte/);
});

test('Rozvržení: tokeny místo pevných rozměrů; list panelu na telefonu při rozhodování vyšší; lišta Další krok nad panelem jen jako cíl kroku', () => {
  const tokens = fs.readFileSync(path.join(ROOT, 'app/tokens.css'), 'utf8'), css = fs.readFileSync(path.join(ROOT, 'demo/demo.css'), 'utf8'), pres = fs.readFileSync(path.join(ROOT, 'demo/presenter.js'), 'utf8');
  for (const t of ['--nf-demo-sheet-h', '--nf-demo-sheet-h-decide', '--nf-demo-content-end', '--nf-result-label-min']) assert.match(tokens, new RegExp(t + ':'), t);
  assert.match(css, /\.tour-panel\.tour-pending\{max-height:var\(--nf-demo-sheet-h-decide\)\}/);
  assert.match(css, /\.nextbar\.tour-focus,body\[class\*="pres-"\] \.nextbar\.tour-watch,body\[class\*="pres-"\] \.nextbar:has\(\.tour-focus,\.tour-watch\)\{bottom:var\(--panelh,0\)\}/);
  assert.equal(/\b(48|52)vh\b/.test(css), false, 'místo pro panel dává #app podle změřené výšky (--panelh), ne odhad ve vh');
  assert.equal(/body\.pres-patient \.tour-panel\{bottom/.test(css), false, 'rozbalený list pacienta sedí až dole (kosm. 3)');
  assert.match(pres, /BOTTOM_OVERLAYS = '\.tour-panel,\.nextbar,\.tabbar'/, 'posun k cíli počítá s lepivými lištami (M5)');
  assert.match(pres, /function fixedEl\(/, 'přilepený cíl (lišta Další krok) se neroluje (M11)');
  assert.match(pres, /function revealStep\(\)[\s\S]{0,400}global\.scrollTo\(0, 0\)/, 'souhrn se otevře od nadpisu (kosm. 1)');
});

console.log('\n' + passed + ' prošlo, ' + failed + ' selhalo');
process.exit(failed ? 1 : 0);
