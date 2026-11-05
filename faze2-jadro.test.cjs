/* Fáze 2 – balík A (jádro a obrazovky), opravy A01–A33 z navrhy-designu/23-schvalovani-2026-10-27/05-seznam-oprav-faze2.md.
   Spuštění: node faze2-jadro.test.cjs (ONLY=část názvu spustí jen vybrané testy). Zavádění stejné jako v nutrifee-rozhodovaci-maketa.test.cjs. */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, 'nutrifee-rozhodovaci-maketa.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1].split('?')[0]);
const CORE = scripts.filter(s => s.startsWith('app/'));
const DEMO = scripts.filter(s => s.startsWith('demo/'));

let ctx, app, NF, D, elements, store;
const sessionFor = role => JSON.stringify({ access_token: 'test-token', refresh_token: 'test-refresh', expires_at: 4102444800000, user: { id: 'u-' + role, email: role + '@example.test', app_metadata: { role } } });
function boot({ withDemo = true } = {}) {
  elements = new Map(); store = new Map(); store.set('nutrifee-auth', sessionFor('garant'));
  const el = id => { if (!elements.has(id)) elements.set(id, { innerHTML: '', focus() { }, querySelector() { return null; }, querySelectorAll() { return []; }, childNodes: [] }); return elements.get(id); };
  const sandbox = {
    console,
    document: { getElementById: el, addEventListener() { }, querySelectorAll() { return []; }, createElement() { return { click() { }, set innerHTML(v) { }, querySelectorAll() { return []; } }; }, activeElement: null, body: null },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
    setTimeout() { return 1; }, Blob: class { }, URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() { } }
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  ctx = vm.createContext(sandbox);
  for (const f of (withDemo ? [...CORE, ...DEMO] : CORE)) vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f });
  app = ctx.NutriFeeApp; NF = ctx.NutriFee; D = ctx.NutriFeeDemo;
}
const S = () => app.getState();
const act = (a, v) => app.act(a, v);
const plain = s => String(s).replace(/ /g, ' ');
const screen = () => plain(elements.get('app').innerHTML);
const chapter = id => { const i = D.indexOf(id); assert.ok(i >= 0, 'neznámá kapitola ' + id); act('goChapter', String(i)); act('closeDrawer'); };
const branch = (k, v) => { act('setBranch', k + ':' + v); act('closeDrawer'); };
const reject = id => act('garantDecide', id + ':rejected:ano');
const food = name => S().foods.find(f => f.name === name);
const render = () => { app.render(); return screen(); };
/* Doplní do registru to, co přidá balík B (B10, B11, B13), aby šlo ověřit čtení parametrů z registru. */
const param = (id, k, v) => { NF.item(S(), id).params[k] = v; };
/* Souhrn kontroly: scéna může začínat nahráním exportu sestrou (C10), kontrolu pak zahájí lékař. */
const review = () => { chapter('reviewSummary'); act('role', 'doctor'); act('page', 'review'); if (!S().review || NF.reviewClosed(S())) act('startReview'); if (S().review.step !== 1) act('reviewStep', '1'); };

let passed = 0, failed = 0; const fails = [];
function test(name, fn) { if (process.env.ONLY && name.indexOf(process.env.ONLY) < 0) return; try { boot(); fn(); console.log('OK  ', name); passed++; } catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); } }

test('A01 zamítnutá S-SILNA neskryje „Data ze senzoru“ ani „Bezpečnost“', () => {
  reject('S-SILNA'); review();
  const m = render();
  assert.match(m, /Sestra · Data ze senzoru/); assert.match(m, /<summary>Bezpečnost/);
  assert.equal(/Jídla opakovaně nad cílem<span/.test(m), false, 'blok S-SILNA zmizí');
});

test('A02 štítky položek tam, kde působí (R-REAKCE, R-SKORE, R-PODOBNOST, pokyny, B-HYPO, P-NEMOC)', () => {
  chapter('advice'); act('role', 'patient');
  const k = food('Ovesná kaše s mlékem a banánem');
  act('page', 'food'); act('foodOpen', k.id);
  let m = render();
  assert.match(m, /data-item="R-REAKCE"/, 'R-REAKCE u stupnice v detailu jídla (SCHEMA 86: značka, štítek dokreslí prezentační vrstva)');
  if (NF.confidence(S(), k.id).reaction) assert.match(m, /data-item="R-SKORE"/, 'R-SKORE u stupně');
  /* pokyn lékaře v doctorCard nese štítek pokynu */
  const card = NF.screens.doctorCard(S(), 'I-MENE', 'Méně jídla než obvykle', '');
  assert.match(plain(card), /data-value="I-MENE"/);
  /* přepínač nemoci nese P-NEMOC */
  act('page', 'today'); m = render(); assert.match(m, /data-item="P-NEMOC"/);
  /* zpětný zápis: otázka na pokles nese B-HYPO */
  act('mealRetro', 'lunch'); Object.assign(S().meal, { bolus: 'as', at: 11, whenOk: true, beforeAsked: true, before: 7, atMealOk: true }); m = render(); /* SCHEMA 86: otázka na pokles je u nejvyšší hodnoty (4. otázka zpětného zápisu) */
  assert.match(m, /Klesla glukóza (do 4 hodin po jídle|od jídla zatím) pod 4 mmol\/l\?<\/b>/);
  assert.match(m, /data-item="B-HYPO"/);
  /* R-PODOBNOST u otázky „podobá se…“ při novém jídle */
  act('mealCancel'); act('startMeal', 'lunch'); act('mealBolus', 'before'); act('mealBefore', '7'); act('mealStep', '2');
  app.bind('meal.q', 'Zcela nové jídlo xyz'); act('mealNewFood'); m = render();
  if (/Nepovinně: podobá se/.test(m)) assert.match(m, /data-item="R-PODOBNOST"/);
});

test('A03 zamítnutá R-REAKCE: milník „jídlo už známe“ se nevydává', () => {
  reject('R-REAKCE'); chapter('preview');
  assert.equal(S().fb.milestones.some(m => /^known:|^allknown/.test(m.id)), false);
});

test('A04 pokyn I-MENE po menší porci i při zamítnuté B-HYPO; místo otázky oznámení', () => {
  reject('B-HYPO'); chapter('advice'); act('role', 'patient');
  const k = food('Ovesná kaše s mlékem a banánem').id;
  const r = NF.saveEpisode(S(), { meal: 'lunch', foodId: k, portion: 'smaller', insulin: { confirmed: 'as', units: 10, time: NF.fmtTime(S().clock) }, advice: [] });
  assert.equal(r.ok, true);
  assert.equal((S().hypoWatch || []).some(w => w.epId === r.episode.id), false, 'bez B-HYPO se sledování nezakládá');
  const m = plain(NF.screens.lessFoodCards(S()));
  assert.match(m, /Méně jídla než obvykle/, 'pokyn lékaře hned');
  assert.equal(/Za \d+ min od jídla se zeptáme/.test(m), false, 'otázka za 60 min chybí');
});

test('A05 zamítnutí R-NAVYKY, R-POKYNY a P-NEMOC má účinek', () => {
  reject('R-NAVYKY'); reject('R-POKYNY'); reject('P-NEMOC'); chapter('week'); act('role', 'patient');
  const p = NF.activePlan(S());
  assert.ok(p, 'plán vyšel i bez startovních návyků');
  assert.equal(NF.activeHabits(S()).some(h => h.item === 'R-NAVYKY'), false, 'startovní návyky neplatí');
  assert.equal(NF.instructions(S()).length, 0, 'pokyny nepůsobí');
  assert.equal(NF.defaultInstructions(S()).length, 0, 'pokyny nejsou součástí nového plánu');
  act('page', 'today'); let m = render();
  assert.equal(/data-action="illness"/.test(m), false, 'přepínač nemoci nahradí oznámení');
  assert.equal(NF.setIllness(S(), true).ok, false);
  assert.equal(NF.inIllness(S(), { context: 'illness', at: S().clock }), false, 'zápisy z nemoci vstupují do učení');
  act('page', 'safety'); m = render();
  assert.equal(/Pokyn lékaře|doc-q/.test(m), false, 'v Bezpečí místo pokynů oznámení');
  assert.ok(NF.planBlockers({ draft: { doses: { basal: { units: 1 }, breakfast: { units: 1 }, lunch: { units: 1 }, dinner: { units: 1 } }, medicationChecked: true, habits: [] }, enrollment: { eligible: true }, registry: S().registry }).indexOf('aspoň jeden návyk') < 0, 'bez R-NAVYKY plán vydat jde');
});

test('A06 procházka ve zpětném zápisu jen do R-PROCHAZKA.okno_min; pozdější se nepočítá', () => {
  chapter('lateMeal'); act('role', 'patient');
  const k = food('Chléb se sýrem a zeleninou').id;
  const late = NF.adviseAfter(S(), k, 'breakfast', NF.addMin(S().clock, -90), 'usual', 'as');
  assert.equal(late.late, true); assert.equal(late.items.length, 0, 'po 60 min se procházka nenabízí');
  const soon = NF.adviseAfter(S(), k, 'breakfast', NF.addMin(S().clock, -45), 'usual', 'as');
  assert.equal(soon.items.some(i => i.lever === 'walk'), true, 'do 60 min ano');
  param('R-PROCHAZKA', 'okno_min', 120);
  assert.equal(NF.adviseAfter(S(), k, 'breakfast', NF.addMin(S().clock, -90), 'usual', 'as').late, false, 'okno je parametr registru');
  param('R-PROCHAZKA', 'okno_min', 60);
  const ep = { retro: true, at: '2026-10-13T07:30:00', recordedAt: '2026-10-13T10:15:00', advice: [{ lever: 'walk', accepted: true }] };
  assert.equal(NF.countedAdvice(S(), ep).length, 0, 'starší zápis procházky po okně se do srovnání nepočítá');
  assert.equal(typeof NF.WALK_WINDOW_MIN, 'undefined');
});

test('A07 pořadí u jednolitých jídel nenabízet; detail bere text ze stejné funkce jako krok 3', () => {
  chapter('advice'); act('role', 'patient');
  const k = food('Ovesná kaše s mlékem a banánem');
  assert.equal(k.jednolite, true); assert.deepEqual(Array.from(k.slozky), []); /* kontrola 3, A2: strukturované údaje místo textu */
  assert.equal(NF.leverFits(k, 'order'), false);
  assert.equal(NF.advise(S(), k.id, 'usual', 'before').items.some(i => i.lever === 'order'), false);
  assert.ok(food('Bramboračka').jednolite && food('Krupicová kaše').jednolite);
  const r = food('Smažený řízek s bramborovou kaší'); assert.ok(NF.leverFits(r, 'order'), 'řízek pořadí má');
  assert.match(NF.leverText(S(), 'order', r), new RegExp(NF.orderFirst(S(), r)));
  act('page', 'food'); act('foodOpen', k.id);
  assert.equal(/nejdřív zeleninu nebo maso/i.test(render()), false, 'detail kaše „zeleninu nebo maso“ nenabízí');
});

test('A08 export přepíše noci; hláška jen „Export nahrán a převeden · doplněno N jídel a N nocí“, shoda zvlášť (SCHEMA 74)', () => {
  chapter('advice'); act('role', 'patient');
  S().nights = [{ date: '2026-10-14', fasting: 6, min: 5.4 }];
  const k = food('Ovesná kaše s mlékem a banánem').id;
  NF.saveEpisode(S(), { meal: 'breakfast', foodId: k, portion: 'usual', insulin: { confirmed: 'as', units: 8, time: '07:00' }, advice: [], at: '2026-10-14T07:05:00', before: 7, peak: 9 });
  const csv = 'Čas;Glukóza\n14.10.2026 03:00;3,6\n14.10.2026 06:00;6,1\n14.10.2026 07:05;7,0\n14.10.2026 07:35;8,1\n14.10.2026 08:05;9,4\n14.10.2026 09:05;8,2\n14.10.2026 09:35;7,5\n';
  const rows = NF.parseSensorCsv(csv); assert.equal(rows.length, 7); /* SCHEMA 74: o formátu se nemluví, rows.format zrušen */
  const r = NF.importReadings(S(), rows); assert.equal(r.ok, true);
  const n = S().nights.find(x => x.date === '2026-10-14'); assert.equal(n.min, 3.6, 'noc z exportu přepsala dosavadní');
  assert.ok(r.filled >= 1 && r.manualOnly >= 1);
  /* SCHEMA 74 (vlastník 27. 10. 2026): jen „Export nahrán a převeden · doplněno N jídel a N nocí“; shoda opsaných hodnot zvlášť (NF.importAgreeText) */
  assert.match(r.text, /^Export nahrán a převeden · doplněno \d+ (jídlo|jídla|jídel) a 1 noc\.$/);
  assert.match(NF.importAgreeText(S().sensorImport), /^Opsaná nejvyšší hodnota se s exportem shoduje u \d z \d (jídla|jídel)/);
  assert.doesNotMatch(r.text, /formát|typu A|Rozpoznáno|měření/);
  const bad = NF.importReadings(S(), NF.parseSensorCsv('nesmysl\nbez čísel')); assert.equal(bad.ok, false); assert.match(bad.error, /neumíme načíst/); assert.doesNotMatch(bad.error, /formát|csv|xlsx/i);
});

test('A09 A10 report: V cíli ze základu štítku, sloupec „Zkoušené rady (v cíli)“, věta z registru', () => {
  review();
  const m = render();
  assert.match(m, /Zkoušené rady \(v cíli\)/); assert.equal(/>Co pomohlo</.test(m), false);
  assert.match(m, /Od 50 % v cíli z posledních 8 zápisů je jídlo „většinou v cíli“/);
  const known = S().foods.find(f => NF.foodStats(S(), f.id).n > 8);
  if (known) assert.match(m, / z posledních \d+</, 'základ štítku „X z posledních 8“');
});

test('A11 bod „Nad cílem nejsou jen jedno nebo dvě jídla“ s číslem z dat a větví', () => {
  chapter('reviewProposals'); act('role', 'doctor');
  const pr = S().review.proposals.find(p => p.kind === 'dose' && p.dose !== 'basal' && /nad cílem/.test(p.title));
  assert.ok(pr, 'návrh k dávce nad cílem existuje');
  const i = pr.verify.indexOf('Nad cílem nejsou jen jedno nebo dvě jídla'); assert.ok(i >= 0);
  assert.ok(pr.facts[i] && pr.facts[i].text, 'bod má číslo z dat');
  assert.ok(pr.branches.some(b => b.when === 'bod ' + (i + 1) + ' nesedí' && b.text === 'ponechat dávku, řešit jídlo'));
  if (pr.facts[i].against) { NF.verifyAll(S(), pr.id); assert.equal(S().review.verify[pr.id][i], undefined, '„Vše sedí“ bod s „data říkají jinak“ nepřepne'); }
});

test('A12 A13 návrh „Nejdřív rady“: štítky D-PRAND + D-POSTUP, prahy odmítnutí z registru', () => {
  branch('response', 'declines'); chapter('reviewProposals'); act('role', 'doctor');
  const rady = S().review.proposals.filter(p => /-RADY$/.test(p.id));
  assert.ok(rady.length, 'návrh nejdřív rady vznikl');
  for (const pr of rady) { assert.equal(pr.item, 'D-PRAND'); assert.equal(pr.postup, 'D-POSTUP'); assert.ok(pr.branches.length); assert.match(pr.facts.filter(Boolean)[0].text, /^nabídek rad \d+: přijato \d+, odmítnuto \d+$/); }
  const keep = S().review.proposals.filter(p => /^PR-(SWAP|KEEP)-/.test(p.id) || p.id === 'PR-POKYNY');
  for (const pr of keep) { assert.equal(pr.postup, 'D-POSTUP', pr.id); assert.notEqual(pr.item, 'R-NAVYKY', pr.id); assert.ok(pr.branches.length, pr.id); }
  assert.equal(S().review.proposals.find(p => p.id === 'PR-POKYNY').item, 'R-POKYNY');
  /* A13: podíl odmítnutí z registru – při prahu 1,0 už „většinou odmítá“ neplatí */
  param('D-PRAND', 'odmitnutiPodil', 1); param('D-PRAND', 'radyPrve', 0);
  const props = NF.proposals(S(), S().review.planId);
  assert.equal(props.some(p => /-RADY$/.test(p.id)), false, 'prah odmitnutiPodil se čte z registru');
});

test('A14 prahy dlaždic kontroly ze S-SEMAFOR', () => {
  review();
  param('S-SEMAFOR', 'porce_ok', 0.99); param('S-SEMAFOR', 'porce_varovani', 0.98); param('S-SEMAFOR', 'mimo_dni', 1);
  const m = render();
  assert.match(m, /pod 99 %|99 % a víc/, 'slovo stavu porce z parametru');
  assert.match(m, /1 den a víc|v normě \(pod 1 dnem\)/, 'mimo učení z parametru');
});

test('A15 podobné jídlo jen směrem, bez čísla', () => {
  chapter('advice'); act('role', 'patient');
  const like = food('Ovesná kaše s mlékem a banánem');
  const r = NF.addFood(S(), 'Kaše od babičky úplně jiná', { like: like.id }, { force: true });
  const c = NF.confidence(S(), r.food.id);
  if (c.pool) {
    assert.equal(c.pool.lo, undefined); assert.equal(c.pool.hi, undefined); assert.ok(c.pool.dir === 'in' || c.pool.dir === 'over');
    act('page', 'food'); act('foodOpen', r.food.id); const m = render();
    assert.match(m, /Podle podobného jídla: spíš (v cíli|nad cílem)/);
    assert.match(m, /Podobné jídlo bývalo spíš (v cíli|nad cílem)\. Jak je to u tohoto jídla, ukážou vaše zápisy\./); /* SCHEMA 78 (06 B7) */
    assert.equal(/class="row[^"]*"><span class="rl">podobná/.test(m), false, 'bez stupnice a rozmezí');
  }
});

test('A16 zápis se dvěma přijatými radami se počítá ke každé se značkou', () => {
  chapter('advice'); act('role', 'patient');
  const ep = { advice: [{ lever: 'portion', accepted: true }, { lever: 'addon', accepted: true }] };
  assert.equal(NF.multiAdvice(S(), ep), true);
  assert.equal(NF.multiAdvice(S(), { advice: [{ lever: 'addon', accepted: true }, { lever: 'order', accepted: false }] }), false);
  const k = food('Ovesná kaše s mlékem a banánem').id;
  const ls = NF.leverStats(S(), k); for (const x of ls) assert.equal(typeof x.multi, 'number');
});

test('A17 zpětný zápis: jedno poděkování, karta výsledku bez „Díky za pokus“', () => {
  chapter('lateMeal'); act('role', 'patient');
  const k = food('Chléb se sýrem a zeleninou').id, at = NF.addMin(S().clock, -40);
  const r = NF.saveEpisode(S(), { meal: 'lunch', foodId: k, portion: 'usual', insulin: { confirmed: 'as', units: 10, time: NF.fmtTime(at) }, advice: [{ lever: 'walk', item: 'R-PROCHAZKA', accepted: true }], at: at, retro: true, before: 6, peak: 8 });
  assert.equal(r.ok, true);
  const th = NF.thanks(S(), r.episode); assert.match(th, /^Díky za doplnění\./, 'jedno poděkování při uložení');
  const res = NF.lastResult(S()); assert.ok(res && res.ep.id === r.episode.id);
  assert.equal(/Díky za pokus/.test(res.text), false); assert.match(res.text, /[Ss] procházkou/);
});

test('A18 nabídnutá shoda: „Žádné jídlo neodpovídá“ se neříká', () => {
  chapter('advice'); act('role', 'patient');
  act('startMeal', 'lunch'); act('mealBolus', 'before'); act('mealBefore', '7'); act('mealStep', '2');
  app.bind('meal.q', 'Řízek s kaší od maminky'); const m = render();
  if (/Je to stejné jídlo jako/.test(m)) assert.equal(/Žádné jídlo neodpovídá/.test(m), false);
});

test('A19 při nemoci všude jedna věta', () => {
  chapter('illnessMeal'); act('role', 'patient'); act('page', 'today');
  assert.match(render(), /K jídlu neradíme, platí pravidla pro nemoc\./); /* SCHEMA 74: pravidla, ne pokyny lékaře */
  assert.equal(/k množství jídla ale neradíme|K množství jídla neradíme/.test(render()), false);
});

test('A20 (SCHEMA 74): pacient export v aplikaci nenahrává – žádná karta, stránka ani odkaz „Nahrát export“; Z-IMPORT bez pacient_tydne', () => {
  chapter('week'); act('role', 'patient');
  for (const pg of ['today', 'plan', 'preview']) { act('page', pg); assert.doesNotMatch(render(), /Nahrát (export|data ze senzoru)|data-action="importPage"|Jednou týdně nahrajte/, pg); }
  assert.equal(NF.item(S(), 'Z-IMPORT').params.pacient_tydne, undefined); assert.equal(NF.importDue(S()).due, false);
  act('page', 'import'); assert.notEqual(S().page, 'import', 'stránka import už není');
});

test('A21 A22 texty zaučení a výchozích hodnot; A23 obráceně (SCHEMA 74): bez sdílení dat a klinického účtu', () => {
  const h = NF.habitCatalog().find(x => x.id === 'H-PORCE');
  assert.equal(h.training[0].text, 'Pacient ví, že rada k porci přijde před jídlem a že po píchnutí radíme jen návrat z větší porce k obvyklé');
  assert.equal(NF.ELIGIBILITY.length, 4); assert.ok(!NF.ELIGIBILITY.some(c => c[0] === 'shared'), 'povinné sdílení dat zrušeno (vlastník 27. 10. 2026)');
  assert.match(NF.FIXED_TRAINING.find(x => x[0] === 'export')[1], /před kontrolou pošle do ordinace export ze senzoru/);
  chapter('enroll'); act('role', 'doctor'); act('page', 'enroll');
  const m = render();
  assert.match(m, /Hodnoty převezměte posuvníkem ze souhrnu v aplikaci senzoru za poslední měsíc před zařazením\./); /* SCHEMA 84 (rozhodnutí 9, agent P+D) */
  assert.doesNotMatch(m, /data-value="shared"|nasdíl|klinick\S* účt/);
  NF.ELIGIBILITY.forEach(c => NF.setEligibility(S(), c[0], true)); assert.equal(S().enrollment.eligible, true, 'čtyři podmínky stačí');
  review(); const r = render();
  assert.doesNotMatch(r, /klinick\S* účt|portálu výrobce|Jak export získat|typu A|formát/);
  assert.match(r, /Sestra nahraje export ze senzoru, který pacient poslal do ordinace před kontrolou\./);
});

test('A24 otázka na pokles všude stejně', () => {
  assert.equal(NF.screens.LOW_Q, 'Klesla glukóza do 4 hodin po jídle pod 4 mmol/l?');
  const src = fs.readFileSync(path.join(__dirname, 'app/screens.js'), 'utf8');
  assert.equal(/Byla glukóza po jídle pod 4|Klesla do 4 hodin pod 4\?/.test(src), false);
});

test('A25 jednotky u počtů rad', () => {
  review();
  const m = render();
  assert.match(m, /Jídel s přijatou radou bylo \d+, bez přijaté rady \d+/);
  assert.match(m, /jídel s přijatou radou · \d+ jídel bez přijaté rady · \d+ jídel bez odpovědi/); /* kontrola 3, C6: jednotka u každého čísla */
  assert.match(m, /Nabídek<\/th>/, 'tabulka rad počítá nabídky');
});

test('A26 převzetí bez zaučení se zastaví na první stránce', () => {
  chapter('handover'); act('role', 'patient');
  S().training.result = null; S().onboarding.page = 3; act('takeoverPage', '3');
  const m = render();
  assert.match(m, /Zaučení u sestry nebylo dokončeno\.<\/b> Plán začne platit, až ho sestra dokončí\./);
  assert.equal(/data-action="takeoverPage"[^>]*>Začít/.test(m), false, 'dál nepustí');
  assert.equal(S().onboarding.page, 1);
});

test('A27 výměna rady jen za radu, která pacientovi nechodila; „Proč lékař rozhodl“ bez opakování', () => {
  branch('response', 'impractical'); chapter('reviewProposals'); act('role', 'doctor');
  const r = S().review, had = NF.adviceOutcome(S(), r.planId).byLever;
  for (const pr of r.proposals.filter(p => p.lever)) for (const l of NF.swapOptions(S(), pr)) assert.ok(!(had[l] && had[l].offered > 0), pr.id + ' nabízí ' + l);
  chapter('newplan'); const p = NF.activePlan(S());
  if (p && p.decisions) { const keys = p.decisions.map(d => d.title + '|' + d.text); assert.equal(new Set(keys).size, keys.length); }
});

test('A28 bez „Modelový pacient 01“', () => {
  assert.equal(NF.createState().patient.label, 'Pacient');
  review();
  assert.equal(/Modelový pacient/.test(render()), false);
  for (const f of ['app/screens-clinic.js', 'app/core.js']) assert.equal(/Modelový pacient 01/.test(fs.readFileSync(path.join(__dirname, f), 'utf8')), false, f);
});

test('A29 po převzetí nového plánu se milníky za minulý plán nevystavují', () => {
  chapter('newplan'); act('role', 'patient');
  if (NF.activePlan(S()) && NF.activePlan(S()).previousId && !NF.activePlan(S()).understood) act('confirmUnderstanding');
  assert.equal(NF.pendingMilestone(S()), null);
});

test('A30 počet dní a zápisů z jednoho výpočtu období', () => {
  chapter('preview'); act('role', 'patient'); act('page', 'preview');
  const m1 = render(), dPac = Number((m1.match(/Díky za (\d+) d/) || [])[1]);
  review();
  const m2 = render(), dLek = Number((m2.match(/Období [^<]*? · (\d+) d/) || [])[1]);
  assert.ok(dPac > 0 && dPac === dLek, 'pacient ' + dPac + ' / lékař ' + dLek);
  const pi = NF.periodInfo(S(), NF.planById(S(), S().review.planId), S().review.startedAt);
  assert.match(NF.periodEntriesText(pi), /^\d+ jídel?a?( a \d+ svačin[ay]?)?$/);
});

test('A31 hledání v registru a telefon (CSS)', () => {
  chapter('registry'); act('role', 'doctor'); act('page', 'registry');
  assert.match(render(), /placeholder="Hledat v názvu a textu"/);
  const css = fs.readFileSync(path.join(__dirname, 'app/design.css'), 'utf8');
  assert.match(css, /\.nextbar\{flex-wrap:wrap/); assert.match(css, /\.pagehead\{flex-wrap:wrap\}/);
});

test('A32 R-SKORE jen dva stupně', () => {
  chapter('preview');
  assert.equal(NF.PARAM_BOUNDS['R-SKORE'].stredni, undefined);
  for (const f of S().foods) { const c = NF.confidence(S(), f.id); if (c.reaction) assert.ok(['mild', 'strong'].includes(c.reaction.key), f.name); }
  const src = fs.readFileSync(path.join(__dirname, 'app/core.js'), 'utf8'); assert.equal(/střední reakce/.test(src), false);
});

test('A33 karta „Podnět z provozu“: vypnout a nová verze ke schválení', () => {
  chapter('registry'); act('role', 'doctor'); act('page', 'registry');
  if (!S().impulse) S().impulse = { text: 'Testovací podnět.', item: 'R-PORADI', at: S().clock };
  let m = render(); assert.match(m, /Podnět z provozu/);
  const id = NF.screens.impulseOf(S()).item.id;
  act('impulseOff', id); assert.equal(NF.item(S(), id).status, 'rejected');
  act('impulseVersion', id); assert.equal(NF.item(S(), id).status, 'pending'); assert.notEqual(NF.item(S(), id).version || 'v1', 'v1');
  m = render(); assert.match(m, /položka vypnuta/); assert.match(m, /ke schválení/);
});

test('C21 náhled telefonu u sestry bez „vpravo“', () => {
  chapter('training'); act('role', 'nurse');
  const m = render(); assert.match(m, /Náhled telefonu ukazuje, co má pacient na telefonu/); assert.equal(/Vpravo vidíte/.test(m), false);
});

test('Jádro bez demo/ běží a nevolá síť', () => {
  boot({ withDemo: false });
  assert.equal(S().foods.length > 0, true); assert.ok(screen().length > 0);
  for (const f of CORE) assert.equal(/fetch\(|XMLHttpRequest|WebSocket|sendBeacon/.test(fs.readFileSync(path.join(__dirname, f), 'utf8')), false, f);
});

test('Celý příběh se vykreslí bez chyby ve všech rolích', () => {
  for (let i = 0; i < D.chapters.length; i++) {
    act('goChapter', String(i)); act('closeDrawer');
    for (const r of ['patient', 'doctor', 'nurse']) { act('role', r); const m = render(); assert.equal(/Tohle se nepovedlo|Obrazovku se nepodařilo|NaN|undefined/.test(m), false, D.chapters[i].id + '/' + r); }
  }
});

console.log('\n' + passed + ' prošlo, ' + failed + ' selhalo' + (fails.length ? ': ' + fails.join(' | ') : ''));
process.exitCode = failed ? 1 : 0;
