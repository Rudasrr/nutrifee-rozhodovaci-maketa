/* Trvalé testy robustnosti makety (návrh ze závěrečné kontroly 23. 10. 2026, 05-robustnost.md).
   Umístění: maketa-rozhodovaci/robustnost.test.cjs (vedle nutrifee-rozhodovaci-maketa.test.cjs). Spuštění: node robustnost.test.cjs;
   spouští ho i hlavní test na konci. Čísla # odpovídají tabulce vad v 05-robustnost.md; po opravách 25. 10. 2026 všechny procházejí. */
const fs = require('node:fs'); const vm = require('node:vm'); const path = require('node:path'); const assert = require('node:assert/strict');
const ROOT = process.env.NUTRIFEE_ROOT || __dirname;
const html = fs.readFileSync(path.join(ROOT, 'nutrifee-rozhodovaci-maketa.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1].split('?')[0]);
const CORE = scripts.filter(s => s.startsWith('app/')), DEMO = scripts.filter(s => s.startsWith('demo/'));
const sessionFor = role => JSON.stringify({ access_token: 'test-token', refresh_token: 'test-refresh', expires_at: 4102444800000, user: { id: 'u-' + role, email: role + '@example.test', app_metadata: { role } } });
let ctx, app, NF, D, elements, store;
function boot({ withDemo = true, raw = undefined, spies = null } = {}) {
  elements = new Map(); store = new Map(); store.set('nutrifee-auth', sessionFor('garant')); if (raw !== undefined) store.set('nutrifee-maketa', raw);
  const el = id => { if (!elements.has(id)) elements.set(id, { innerHTML: '', focus() { }, querySelector() { return null; }, querySelectorAll() { return []; }, childNodes: [] }); return elements.get(id); };
  const sandbox = { console: { log() { }, warn() { }, error() { } }, document: { getElementById: el, addEventListener() { }, querySelectorAll() { return []; }, createElement() { return { click() { }, set innerHTML(v) { }, querySelectorAll() { return []; } }; }, activeElement: null, body: null },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) }, setTimeout() { return 1; }, clearTimeout() { }, Blob: class { }, URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() { } } };
  if (spies) Object.assign(sandbox, spies); sandbox.window = sandbox; sandbox.globalThis = sandbox; ctx = vm.createContext(sandbox);
  for (const f of (withDemo ? [...CORE, ...DEMO] : CORE)) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  app = ctx.NutriFeeApp; NF = ctx.NutriFee; D = ctx.NutriFeeDemo;
}
const S = () => app.getState(); const act = (a, v) => app.act(a, v); const bind = (k, v) => app.bind(k, v);
const markup = () => String(elements.get('app').innerHTML).replace(/ /g, ' ');
const chapter = id => { act('goChapter', String(D.indexOf(id))); act('closeDrawer'); };
const BAD = /undefined|NaN|\[object Object\]|\bnull\b|Infinity/;
const allPages = fn => { const s = S(); for (const r of ['patient', 'doctor', 'nurse']) for (const pg of [...NF.PAGES, 'import']) { s.role = r; s.page = pg; app.render(); fn(markup(), r + '/' + pg); } };
const meal = (food, portion, bolus, finish) => { const f = S().foods.find(x => x.name === food); act('startMeal', 'breakfast'); act('mealBolus', bolus); act('mealBefore', '7'); act('mealStep', '2'); act('mealFood', f.id); act('mealPortion', portion); act('mealStep', '3'); act('mealFinish', finish); };
const walk = (v, p = '$', out = []) => { if (typeof v === 'number' && !Number.isFinite(v)) out.push(p); else if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], p + '.' + k, out); return out; };
let passed = 0, failed = 0; const fails = [];
function test(name, fn) { try { boot(); fn(); console.log('OK  ', name); passed++; } catch (err) { console.error('FAIL', name, '—', err.message.split('\n')[0]); failed++; fails.push(name); } }

/* #1 Start nesmí spadnout na žádném uloženém záznamu stejného schématu; výjimka ve vykreslení nesmí uniknout z act(). */
test('Poškozený uložený stav (stejné schéma) nesmí shodit start ani zůstat trvale', () => {
  const good = JSON.parse((boot(), chapter('doses'), store.get('nutrifee-maketa')));
  const variants = [Object.assign({}, good, { draft: Object.assign({}, good.draft, { doses: '7.5' }) }), Object.assign({}, good, { registry: { items: 'x' } }), Object.assign({}, good, { foods: 'x' }), Object.assign({}, good, { episodes: [{}] }), Object.assign({}, good, { plans: [{ id: 'P1' }], activePlanId: 'P1' }), Object.assign({}, good, { clock: 'garbage' }), Object.assign({}, good, { meal: { step: 3, meal: 'breakfast', foodId: 'F-neexistuje', portion: 'usual', bolus: 'before', decisions: {}, reasons: {}, units: 8 }, role: 'patient', page: 'meal' })];
  for (const v of variants) { let err = null; try { boot({ raw: JSON.stringify(v) }); } catch (e) { err = e; } assert.equal(err, null, 'start spadl: ' + (err && err.message) + ' pro ' + JSON.stringify(v).slice(0, 60)); assert.ok(markup().length > 200, 'prázdná obrazovka'); }
  boot(); chapter('doses'); bind('draft.doses', '7.5'); let thrown = null; try { act('page', 'enroll'); } catch (e) { thrown = e; } assert.equal(thrown, null, 'výjimka unikla z act(): ' + (thrown && thrown.message));
});
/* #2 Vazba polí smí měnit jen vyjmenované klíče (form.*, meal.q, reg.q, notes, support.text, draft.medicationChecked, draft.notes). */
test('bind() nepřepíše strukturu stavu (draft.doses, meal.decisions, meal.step, reg.open…)', () => {
  chapter('doses'); bind('draft.doses', 'x'); assert.equal(typeof S().draft.doses, 'object'); bind('draft.habits', 'x'); assert.ok(Array.isArray(S().draft.habits));
  chapter('advice'); act('startMeal', 'breakfast'); bind('meal.decisions', 'x'); assert.equal(typeof S().meal.decisions, 'object'); bind('meal.step', '9'); assert.equal(S().meal.step, 1); bind('meal.units', 'x'); assert.equal(S().meal.units, 8);
});
/* #3 Číselné akce s nečíselnou hodnotou nesmí zanést NaN; dávky zůstávají celé 1–60. */
test('Dávky a kroky: nečíselná hodnota nic nezmění, žádné NaN ve stavu', () => {
  chapter('advice'); act('basalOther'); const b0 = S().basalUnits; for (const v of ['x', '', null, undefined, 'E999', '0.5', '1e308', '-1e308']) { act('basalUnits', v); assert.ok(Number.isInteger(S().basalUnits) && S().basalUnits >= 1 && S().basalUnits <= 60, 'basalUnits=' + S().basalUnits + ' po ' + v); }
  act('basalConfirm', 'other'); const rec = S().basalLog[S().basalLog.length - 1]; assert.ok(rec.confirmed !== 'other' || Number.isInteger(rec.units), 'bazál jinak bez jednotek: ' + JSON.stringify(rec));
  act('startMeal', 'breakfast'); for (const v of ['x', '0.5', '1e9']) { act('mealUnits', v); assert.ok(Number.isInteger(S().meal.units) && S().meal.units >= 1 && S().meal.units <= 60, 'meal.units=' + S().meal.units); }
  act('mealCancel'); act('fixInsulinUnits', 'x'); assert.ok(S().fixInsulinUnits == null || Number.isInteger(S().fixInsulinUnits));
  chapter('doses'); act('wizardGo', 'x'); assert.ok(Number.isInteger(S().wizardStep)); act('dose', 'basal:x'); act('dose', 'nope:1'); assert.ok(Number.isInteger(S().draft.doses.basal.units) && !S().error, 'dose s cizím klíčem: ' + S().error);
  chapter('reviewProposals'); act('reviewStep', 'x'); assert.ok(Number.isInteger(S().review.step)); act('propUnits', S().review.proposals[0].id + ':x'); assert.deepEqual(walk(S()), []);
  chapter('registry'); act('regOpen', 'R-REAKCE'); act('regEdit'); act('regParam', 'R-REAKCE:minKnown:x'); assert.deepEqual(walk(S()), [], 'NaN ve stavu: ' + walk(S()));
});
/* #4 Čas zpětného zápisu a posun inzulinu musí být platné; jinak se zápis neuloží. */
test('Zpětný zápis: neplatná hodina (−1, 25,5, NaN, 7,999) a nečíselný posun inzulinu nevedou k NaN datu', () => {
  for (const v of ['-1', '25.5', 'NaN', '1e9', '7.999', 'x']) { chapter('advice'); const n = S().episodes.length; act('mealRetro', 'lunch'); act('mealBolus', 'as'); act('mealAt', v); act('mealBefore', '7'); act('mealStep', '2'); act('mealFood', S().foods[0].id); act('mealPortion', 'usual'); act('mealStep', '3'); act('mealFinish', 'as'); const ep = S().episodes[S().episodes.length - 1]; if (S().episodes.length > n) assert.match(ep.at, /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:00$/, 'mealAt=' + v + ' → at=' + ep.at); }
  for (const v of ['x', '-1e9', '1e9']) { chapter('advice'); act('startMeal', 'breakfast'); act('mealBolus', 'as'); act('mealTime', v); act('mealBefore', '7'); act('mealStep', '2'); act('mealFood', S().foods[0].id); act('mealPortion', 'usual'); act('mealStep', '3'); act('mealFinish', 'as'); const ep = S().episodes[S().episodes.length - 1]; assert.match(String(ep.insulin.time), /^([01]\d|2[0-3]):[0-5]\d$/, 'mealTime=' + v + ' → ' + ep.insulin.time); }
  assert.equal(NF.retroAt(S(), 7.999).slice(11), '08:00:00');
});
/* #5 Export ze senzoru: neplatná data se zahodí, uvozovky nevadí. */
test('csv: neexistující datum/čas se nepřijme, pole v uvozovkách se čtou', () => {
  const r = NF.parseSensorCsv('čas;hodnota\n32.13.2026 07:20;7\n14.10.2026 25:99;7\n31.04.2026 07:00;7\n14.10.2026 07:05;7');
  assert.deepEqual(JSON.parse(JSON.stringify(r.map(x => x.at))), ['2026-10-14T07:05:00'], 'přijato: ' + JSON.stringify(r)); /* pole z jiného kontextu vm: porovnat po převodu */
  assert.equal(NF.parseSensorCsv('"čas";"hodnota"\n"14.10.2026 07:05";"7,0"\n"14.10.2026 07:20";"8,1"').length, 2);
  chapter('preview'); act('importText', 'čas;hodnota\n32.13.2026 07:20;7\n14.10.2026 25:99;7'); act('importPage'); assert.equal(BAD.test(markup()), false, 'NaN na stránce Nahrát export'); act('role', 'doctor'); act('startReview'); assert.equal(BAD.test(markup()), false, 'NaN v kontrole');
});
/* #6 Rozpracovaný zápis s neexistujícím jídlem: hláška, ne pád vykreslení (zápis se nesmí zahodit). */
test('Krok 3 s neznámým jídlem dá hlášku „Vyberte jídlo“ a zápis zůstane otevřený', () => {
  chapter('advice'); act('startMeal', 'breakfast'); act('mealBolus', 'before'); act('mealBefore', '7'); act('mealStep', '2'); act('mealFood', S().foods[0].id); act('mealPortion', 'usual'); act('mealStep', '3'); act('mealFood', 'F-neexistuje');
  assert.ok(S().meal, 'zápis zahozen'); assert.equal(/vrátili jsme vás na začátek/.test(S().error), false, S().error); assert.equal(S().events.some(e => e.what === 'chyba.vykresleni'), false);
});
/* #7 Modelový čas: posun nesmí vyrobit neplatné datum. */
test('shiftTime s nesmyslem nechá hodiny platné', () => { chapter('advice'); const c = S().clock; for (const v of ['1e308', 'x', '-1e308', '100000000']) { act('shiftTime', v); assert.match(S().clock, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/, 'shiftTime ' + v + ' → ' + S().clock); } });
/* #8 Atributy v HTML jsou escapované (třída stránky z náhledu sestry, názvy jídel, komentáře, dotazy). */
test('Žádná hodnota ze stavu nejde do HTML neescapovaná', () => {
  chapter('training'); act('trainingPreview', '<b>x</b>" onmouseover="1'); assert.equal(/page-<b>|onmouseover="1/.test(markup()), false, 'třída stránky neescapovaná');
  chapter('advice'); act('startMeal', 'lunch'); act('mealBolus', 'before'); act('mealBefore', '7'); act('mealStep', '2'); bind('meal.q', '<b>fuzz</b>'); act('mealNewFood'); act('mealSaveFood'); act('mealPortion', 'usual'); act('mealStep', '3'); act('mealFinish', 'as');
  act('page', 'foods'); allPages((m, w) => assert.equal(/<b>fuzz<\/b>/.test(m), false, w));
  act('role', 'doctor'); act('page', 'registry'); act('regOpen', 'R-PORADI'); bind('form.regcomment_R-PORADI', '<b>fuzz</b>'); act('regDecide', 'rejected'); allPages((m, w) => assert.equal(/<b>fuzz<\/b>/.test(m), false, w));
});
/* #9 Vykreslení nemění stav (štítek reakce se počítá při vykreslení a uloží až příští akcí). */
test('Vykreslení je bez vedlejšího účinku na stav: po reloadu je stav stejný jako před ním', () => {
  chapter('advice'); meal('Ovesná kaše s mlékem a banánem', 'bigger', 'before', 'as'); act('page', 'plan'); const before = JSON.stringify(S()); app.render(); app.render(); assert.equal(JSON.stringify(S()), before, 'render změnil stav'); assert.equal(store.get('nutrifee-maketa'), before, 'uložený stav se liší od stavu v paměti');
});
/* #10 Determinismus: stejná posloupnost → stejný stav; skok na kapitolu po jiné historii → stejný stav. */
test('Determinismus akcí a skoku na kapitolu', () => {
  const run = () => { boot(); chapter('advice'); meal('Ovesná kaše s mlékem a banánem', 'bigger', 'before', 'as'); act('basalConfirm', 'as'); act('importText', 'čas;hodnota\n14.10.2026 07:05;7,0\n14.10.2026 07:20;8,1\n14.10.2026 08:05;9,9\n14.10.2026 09:05;8,2'); return JSON.stringify(S()); };
  const a = run(), b = run(); assert.equal(a, b);
  boot(); chapter('advice'); const base = JSON.stringify(S()); for (const n of Object.keys(NF.actions)) act(n, '1'); chapter('advice'); const s2 = JSON.parse(JSON.stringify(S())); const s1 = JSON.parse(base); delete s1.notes; delete s2.notes; assert.deepEqual(s2, s1);
});
/* #11 Síť: jádro bez prezentační vrstvy nevolá žádné síťové rozhraní ani při 2 000 náhodných akcích. */
test('Jádro bez demo: 0 síťových volání (fetch, XHR, WebSocket, sendBeacon, Image)', () => {
  const calls = []; const spies = { fetch: u => { calls.push('fetch ' + u); return Promise.resolve({ ok: true }); }, XMLHttpRequest: class { open(m, u) { calls.push('xhr ' + u); } send() { } setRequestHeader() { } }, WebSocket: class { constructor(u) { calls.push('ws ' + u); } }, navigator: { sendBeacon(u) { calls.push('beacon ' + u); return true; } }, Image: class { set src(v) { calls.push('img ' + v); } } };
  boot({ withDemo: false, spies }); NF.seed(S()); let x = 7; const r = () => (x = (x * 1103515245 + 12345) % 2147483648) / 2147483648; const acts = Object.keys(NF.actions); for (let i = 0; i < 2000; i++) act(acts[Math.floor(r() * acts.length)], ['1', 'yes', 'as', 'x', 'breakfast', 'before'][Math.floor(r() * 6)]); assert.deepEqual(calls, []);
});
/* #12 Výkon: vykreslení Dnes, reportu a kontroly s 300 zápisy do 50 ms v nodu. */
test('Výkon: 300 zápisů → Dnes, report pacienta i kontrola lékaře pod 50 ms', () => {
  chapter('preview'); const p = NF.activePlan(S()); let d = 0; while (S().episodes.length < 300) { const m = ['breakfast', 'lunch', 'dinner'][d % 3]; S().clock = NF.addDays('2026-12-21', Math.floor(d / 3)) + 'T' + ['07:05', '12:30', '18:30'][d % 3] + ':00'; NF.saveEpisode(S(), { meal: m, foodId: S().foods[d % S().foods.length].id, portion: 'usual', bolusState: 'before', advice: [], insulin: { confirmed: 'as', units: p.doses[m].units, time: '07:00' }, at: S().clock, before: 7, peak: 9 }); d++; }
  S().clock = '2027-01-04T18:00:00'; const t = (role, page) => { S().role = role; S().page = page; app.render(); const t0 = process.hrtime.bigint(); for (let i = 0; i < 3; i++) app.render(); return Number(process.hrtime.bigint() - t0) / 3e6; };
  const res = { today: t('patient', 'today'), preview: t('patient', 'preview'), foods: t('patient', 'foods') }; S().role = 'doctor'; act('startReview'); res.review = t('doctor', 'review');
  for (const k of Object.keys(res)) assert.ok(res[k] < 50, k + ' ' + res[k].toFixed(1) + ' ms');
});
/* #13 Nemoc: žádná karta rady v žádném kroku ani zpětně. (dnes prochází – pojistka) */
test('Nemoc: žádná .advice v kroku 3 ani u zpětného zápisu', () => {
  chapter('illnessMeal'); for (const [po, bo] of [['bigger', 'before'], ['smaller', 'as'], ['bigger', 'unknown']]) { if (S().meal) act('mealCancel'); act('startMeal', 'breakfast'); act('mealBolus', bo); act('mealBefore', '7'); act('mealStep', '2'); act('mealFood', S().foods[0].id); act('mealPortion', po); act('mealStep', '3'); assert.equal(/class="advice/.test(markup()), false, po + '/' + bo); }
  act('mealCancel'); act('mealRetro', 'lunch'); act('mealBolus', 'as'); act('mealAt', '12.5'); act('mealBefore', '7'); act('mealStep', '2'); act('mealFood', S().foods[0].id); act('mealPortion', 'usual'); act('mealStep', '3'); assert.equal(/class="advice/.test(markup()), false, 'zpětný zápis v nemoci');
});
/* #14 Hledání jídla bez diakritiky („rizek“, „chleb“) najde totéž co s ní. */
test('Hledání jídla nezávisí na diakritice', () => { chapter('advice'); assert.ok(NF.searchFoods(S(), 'rizek', 'lunch').length >= 1, '„rizek“ nic nenašel'); assert.ok(NF.searchFoods(S(), 'chleb', 'lunch').some(f => /^Chléb/.test(f.name)), '„chleb“ nenašel „Chléb…“'); });

console.log('\nProšlo: ' + passed + ', selhalo: ' + failed + (fails.length ? '\nSelhaly: ' + fails.join(' | ') : ''));
process.exit(failed ? 1 : 0);
