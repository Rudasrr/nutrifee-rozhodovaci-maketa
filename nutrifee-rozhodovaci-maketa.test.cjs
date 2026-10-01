/* Testy logiky makety v izolovaném prostředí. Nenahrazují ověření v prohlížeči.
   Spuštění: node nutrifee-rozhodovaci-maketa.test.cjs */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, 'nutrifee-rozhodovaci-maketa.html'), 'utf8');
/* ?v= je jen proti cache prohlížeče. */
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1].split('?')[0]);
const CORE = scripts.filter(s => s.startsWith('app/'));
const DEMO = scripts.filter(s => s.startsWith('demo/'));
assert.ok(CORE.length >= 4 && DEMO.length >= 3, 'HTML musí načítat jádro i prezentační vrstvu');

let ctx, app, NF, D, elements, store;
function boot({ withDemo = true } = {}) {
  elements = new Map(); store = new Map();
  const el = id => { if (!elements.has(id)) elements.set(id, { innerHTML: '', focus() { }, querySelector() { return null; }, querySelectorAll() { return []; }, childNodes: [] }); return elements.get(id); };
  const sandbox = {
    console,
    document: { getElementById: el, addEventListener() { }, querySelectorAll() { return []; }, createElement() { return { click() { }, set innerHTML(v) { }, querySelectorAll() { return []; } }; }, activeElement: null, body: null },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v) },
    setTimeout() { return 1; }, Blob: class { }, URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() { } }
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  ctx = vm.createContext(sandbox);
  for (const f of (withDemo ? [...CORE, ...DEMO] : CORE)) vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f });
  app = ctx.NutriFeeApp; NF = ctx.NutriFee; D = ctx.NutriFeeDemo;
}
const S = () => app.getState();
const act = (a, v) => app.act(a, v);
const bind = (k, v) => app.bind(k, v);
const markup = () => elements.get('app').innerHTML;
const chapter = id => { const i = D.indexOf(id); assert.ok(i >= 0, 'neznámá kapitola ' + id); act('goChapter', String(i)); act('closeDrawer'); };
const branch = (k, v) => { act('setBranch', k + ':' + v); act('closeDrawer'); };
const food = name => S().foods.find(f => f.name === name);
const everyScreen = fn => { for (let i = 0; i < D.chapters.length; i++) { act('goChapter', String(i)); act('closeDrawer'); for (const r of ['patient', 'doctor', 'nurse']) { act('role', r); fn(markup(), D.chapters[i].id + '/' + r); } } };

let passed = 0, failed = 0; const fails = [];
function test(name, fn) { try { boot(); fn(); console.log('OK  ', name); passed++; } catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); } }

/* ---------- zásady ---------- */
test('Aplikace nikde nepočítá ani nenavrhuje dávku; volí ji lékař', () => {
  chapter('reviewProposals');
  const pr = S().review.proposals.find(p => p.kind === 'dose');
  assert.ok(pr, 'návrh k dávce existuje');
  assert.equal(/\d+\s*j\./.test(pr.title + pr.why + pr.branches.map(b => b.text).join()), false, 'návrh neobsahuje jednotky');
  assert.ok(pr.branches.every(b => ['up', 'down', 'keep', 'swap', 'edit'].includes(b.action)));
  assert.ok(pr.postup === 'D-POSTUP', 'větve jsou z lékařova schváleného postupu');
  const src = fs.readFileSync(path.join(__dirname, 'app/core.js'), 'utf8');
  assert.equal(/units\s*[+\-]=\s*\d/.test(src), false, 'jádro samo nemění jednotky');
});

test('Porce: před píchnutím oběma směry; po píchnutí jen z větší; nikdy „sněz víc“', () => {
  chapter('advice');
  const k = food('Ovesná kaše s mlékem a banánem').id;
  assert.ok(NF.advise(S(), k, 'bigger', 'before').items.some(i => i.lever === 'portion'));
  assert.ok(NF.advise(S(), k, 'smaller', 'before').items.some(i => i.lever === 'portion'));
  assert.ok(NF.advise(S(), k, 'bigger', 'as').items.some(i => i.lever === 'portion'), 'z větší zpět k obvyklé i po píchnutí');
  const sm = NF.advise(S(), k, 'smaller', 'as');
  assert.equal(sm.items.some(i => i.lever === 'portion'), false);
  assert.ok(sm.blocked.some(b => b.lever === 'portion' && b.reason === 'bolus'));
  assert.equal(NF.advise(S(), k, 'bigger', 'unknown').effective, 'after');
  assert.equal(NF.advise(S(), k, 'smaller', 'unknown').items.some(i => i.lever === 'portion'), false);
  const bad = /(?<!„)(sněz víc|dej si víc|jez víc|sněz více)/i;
  everyScreen((m, w) => assert.equal(bad.test(m), false, w));
  for (const it of S().registry.items) assert.equal(bad.test(it.text || ''), false, it.id);
});

test('Každá rada a výpočet nese položku registru; zamítnutá položka přestane působit', () => {
  chapter('advice');
  const k = food('Ovesná kaše s mlékem a banánem').id;
  for (const it of NF.advise(S(), k, 'bigger', 'before').items) assert.ok(NF.item(S(), it.item) && NF.usable(S(), it.item), it.lever);
  act('mealBolus', 'before'); act('mealStep', '3');
  assert.match(markup(), /class="appr /);
  act('role', 'doctor');
  const r = NF.decideItem(S(), 'R-DOPLNEK', 'rejected', 'test');
  assert.equal(r.ok, true);
  assert.equal(NF.advise(S(), k, 'bigger', 'before').items.some(i => i.lever === 'addon'), false, 'zamítnutá rada zmizí');
  assert.equal(S().registry.history.length, 1);
  assert.equal(S().registry.history[0].to.status, 'rejected');
  NF.decideItem(S(), 'R-REAKCE', 'rejected', '');
  assert.equal(NF.confidence(S(), k).level, 'none', 'bez pravidla se nic nevyhodnocuje');
  assert.equal(NF.adviceGate(S()).ok, false);
});

test('Registr: rozhodnutí se uloží ihned, historie jen přibývá, lze měnit', () => {
  chapter('registry');
  act('regOpen', 'R-PORADI');
  bind('form.regcomment_R-PORADI', 'zkouška');
  act('regDecide', 'rejected');
  assert.equal(NF.item(S(), 'R-PORADI').status, 'rejected');
  assert.equal(JSON.parse(store.get('nutrifee-maketa')).registry.items.find(i => i.id === 'R-PORADI').status, 'rejected', 'uloženo do prohlížeče ihned');
  act('regDecide', 'approved');
  assert.equal(NF.item(S(), 'R-PORADI').status, 'approved');
  const h = S().registry.history.filter(x => x.item === 'R-PORADI');
  assert.equal(h.length, 2); assert.equal(h[0].comment, 'zkouška');
  act('regOpen', 'R-REAKCE'); act('regEdit'); act('regParam', 'R-REAKCE:minKnown:1'); act('regDecide', 'edited');
  assert.equal(NF.item(S(), 'R-REAKCE').params.minKnown, 4);
  assert.equal(NF.item(S(), 'R-REAKCE').status, 'edited');
  assert.equal(/Hledat/.test(markup()), true);
  for (const c of NF.CATS) assert.ok(S().registry.items.some(i => i.cat === c[0]), 'kategorie ' + c[0] + ' má položku');
});

test('Lékař mezi kontrolami nic nedělá', () => {
  const doctorChapters = D.chapters.filter(c => c.role === 'doctor').map(c => c.id);
  for (const id of doctorChapters) assert.ok(/^(enroll|doses|issue|registry|review|trace)/.test(id), 'lékařská kapitola mimo ordinaci: ' + id);
  const between = D.chapters.filter(c => c.at > '2026-10-06' && c.at < '2027-01-05' && c.role === 'doctor');
  assert.equal(between.map(c => c.id).join(), 'registry', 'jediná akce lékaře mezi kontrolami je registr garanta');
  const src = fs.readFileSync(path.join(__dirname, 'app/core.js'), 'utf8');
  assert.equal(/resumeTask/.test(src), false);
});

test('Nic se neodesílá, žádná AI, žádná síť', () => {
  for (const f of [...CORE, ...DEMO]) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    assert.equal(/fetch\(|XMLHttpRequest|WebSocket|navigator\.sendBeacon|openai|anthropic|claude|gpt/i.test(src), false, f);
  }
  const bad = /zpráva odeslána|odesláno ordinaci|lékař upozorněn|sledujeme vás/i;
  everyScreen((m, w) => assert.equal(bad.test(m), false, w));
});

test('Demo označení je vidět všude', () => everyScreen((m, w) => assert.match(m, /DEMO · syntetická data/, w)));

/* ---------- ordinace ---------- */
test('Zařazení: podmínky zamykají pokračování; plán bez náležitostí nejde vydat', () => {
  chapter('enroll');
  assert.match(markup(), /disabled/);
  for (const c of NF.ELIGIBILITY) act('eligibility', c[0]);
  assert.equal(S().enrollment.eligible, true);
  act('wizardGo', '1');
  assert.ok(NF.planBlockers(S()).length >= 2);
  S().role = 'doctor';
  assert.equal(NF.issuePlan(S(), D.habitCatalog).ok, false);
  bind('draft.medicationChecked', true); bind('draft.instructionsChecked', true);
  act('toggleHabit', 'H-ZAPIS'); act('instrToggle', 'I-HYPO');
  assert.equal(NF.planBlockers(S()).length, 0);
  act('dose', 'breakfast:1');
  assert.equal(S().draft.doses.breakfast.units, 9);
  act('issuePlan');
  assert.equal(S().activePlanId, 'P1'); assert.equal(S().role, 'nurse');
  assert.equal(NF.activePlan(S()).doses.breakfast.units, 9);
});

test('V ordinaci se nepíše (jen výběr, zaškrtnutí, volič)', () => {
  for (const id of ['enroll', 'doses', 'issue', 'training']) {
    chapter(id);
    const m = markup();
    assert.equal(/<textarea/.test(m), false, id);
    assert.equal(/<input(?![^>]*type="checkbox")/.test(m), false, id);
  }
});

test('Zaučení: body podle návyků, náhled telefonu, návyky platí až po otázce', () => {
  chapter('training');
  const items = NF.trainingItems(S());
  assert.ok(items.some(t => t.id === 't-inzulin') && items.some(t => t.id === 't-bazal'));
  assert.match(markup(), /phone-preview/);
  act('trainingStep', 't-zapis');
  assert.equal(S().training.previewPage, 'meal');
  assert.equal(NF.finishTraining(S(), 'done').ok, false);
  for (const t of items) S().training.steps[t.id] = true;
  act('finishTraining', 'done');
  assert.equal(S().training.result, 'done');
  assert.equal(NF.activeHabits(S()).length, 0);
  act('role', 'patient'); act('answerCheck', 'no'); act('confirmUnderstanding');
  assert.equal(NF.activeHabits(S()).length, 4);
  boot(); branch('training', 'failed'); chapter('handover');
  assert.equal(NF.confirmUnderstanding(S()).ok, false);
});

/* ---------- pacient ---------- */
test('Před jídlem: inzulin první, kroky zamčené bez volby, zápis nese potvrzení dávky', () => {
  chapter('firstMeal');
  assert.equal(S().meal.step, 1);
  assert.match(markup(), /Už sis píchl inzulin/);
  act('mealStep', '2'); assert.equal(S().meal.step, 1); assert.match(S().error, /inzulin/);
  act('mealBolus', 'as'); act('mealTime', '-15'); act('mealStep', '2');
  bind('meal.q', 'kaše');
  assert.ok(NF.searchFoods(S(), 'kaše').length >= 3);
  act('mealStep', '3'); assert.equal(S().meal.step, 2);
  act('mealFood', food('Ovesná kaše s mlékem a banánem').id); act('mealPortion', 'usual'); act('mealStep', '3');
  assert.equal(NF.confidence(S(), S().meal.foodId).level, 'unknown');
  assert.match(markup(), /Nic neodhadujeme/);
  act('mealFinish', 'as');
  const ep = S().episodes[S().episodes.length - 1];
  assert.equal(ep.insulin.confirmed, 'as'); assert.equal(ep.insulin.units, 8); assert.equal(ep.insulin.time, '06:45');
  assert.ok(ep.points.length === 5, 'simulovaný senzor dodal průběh');
});

test('Vlastní jídlo jen názvem a třemi štítky; podobnost ze štítků, ne z názvu', () => {
  chapter('custom');
  act('mealTag', 'side:brambory'); act('mealTag', 'prep:smazene');
  act('mealSaveFood'); assert.match(S().error, /Klepni/);
  act('mealTag', 'size:velke'); act('mealSaveFood');
  const f = food('Řízek s kaší od maminky');
  assert.ok(f && f.custom);
  assert.equal(NF.confidence(S(), f.id).level, 'similar');
  assert.ok(NF.confidence(S(), f.id).like.some(x => x.name.indexOf('řízek') >= 0));
  const same = NF.addFood(S(), 'Smažený řízek s bramborovou kaší', { side: 'bez', prep: 'studene', size: 'male' }).food;
  assert.notEqual(NF.confidence(S(), same.id).level, 'similar', 'stejný název bez shody štítků není podobný');
});

test('Učení: známé od 3 započítaných; nezapočítá se nevím, nemoc, jiná porce, jiná dávka', () => {
  chapter('week');
  const k = food('Ovesná kaše s mlékem a banánem').id;
  const st = NF.foodStats(S(), k);
  assert.equal(st.eaten, 4); assert.equal(st.n, 3);
  assert.equal(NF.confidence(S(), k).level, 'known');
  assert.ok(st.lo <= st.med && st.med <= st.hi);
  assert.equal(NF.whyNotUsable(S(), S().episodes.find(e => e.id === 'E3')), 'inzulin nepotvrzen podle plánu');
  chapter('recovery');
  assert.equal(NF.whyNotUsable(S(), S().episodes.find(e => e.id === 'E11')), 'z doby nemoci');
  assert.equal(NF.whyNotUsable(S(), S().episodes.find(e => e.id === 'E9')), null);
  NF.activePlan(S()).doses.breakfast.units = 10;
  assert.equal(NF.foodStats(S(), k).n, 0, 'po změně dávky učení začíná znovu');
});

test('Reakce těla podle podílu v cíli; rozmezí se s daty zužuje', () => {
  chapter('preview');
  const k = food('Ovesná kaše s mlékem a banánem').id, c = NF.confidence(S(), k);
  assert.equal(c.level, 'known'); assert.ok(c.reaction);
  const share = c.st.inTarget / c.st.n;
  assert.equal(c.reaction.key, share >= 0.8 ? 'mild' : share >= 0.5 ? 'mid' : 'strong');
  const half = c.st.peaks.slice(0, Math.ceil(c.st.peaks.length / 2));
  assert.ok(NF.quantile(c.st.peaks, 0.9) - NF.quantile(c.st.peaks, 0.1) <= NF.quantile(half, 0.9) - NF.quantile(half, 0.1) + 0.6);
  act('role', 'patient'); act('page', 'foods'); act('foodOpen', k);
  const m = markup();
  assert.match(m, /hranice cíle/); assert.match(m, /v cíli/); assert.match(m, /class="win"/);
  assert.equal(/před<\/small>/.test(m), false, 'hodnota před jídlem se pacientovi neukazuje');
});

test('Nemoc: pacient označí i ukončí; rady jen bezpečné; data štítkovaná', () => {
  chapter('illness');
  act('illness', 'on');
  assert.equal(S().illness.active, true);
  assert.match(markup(), /Pokyny lékaře pro nemoc/);
  const k = food('Ovesná kaše s mlékem a banánem').id;
  const res = NF.advise(S(), k, 'smaller', 'as');
  assert.equal(res.items.some(i => i.lever === 'portion' || i.lever === 'walk'), false);
  assert.ok(res.blocked.some(b => b.reason === 'illness'));
  act('illnessCheck', 'same'); assert.equal(S().illness.active, true);
  act('illnessCheck', 'better'); assert.equal(S().illness.active, false);
  chapter('recovery'); assert.ok(NF.illnessDays(S()) >= 1);
});

test('Bazál: připomínka večer, potvrzení podle plánu nebo jinak', () => {
  chapter('week'); S().clock = '2026-10-13T21:00:00'; act('role', 'patient'); act('page', 'today');
  assert.match(markup(), /Čas na bazál/);
  act('basalOther'); act('basalUnits', '-2'); act('basalConfirm', 'other');
  const b = S().basalLog.find(x => x.date === '2026-10-13');
  assert.equal(b.confirmed, 'other'); assert.equal(b.units, 16);
});

test('Report pro pacienta: pochvala, dlaždice s vysvětlením, navržené otázky', () => {
  chapter('preview');
  const m = markup();
  assert.match(m, /Vedeš si dobře/); assert.match(m, /Na co se zeptat lékaře/);
  assert.equal(/poslechl“/.test(m) && /Neuvidí žádné hodnocení/.test(m), true);
  act('previewTile', 'adv'); assert.match(markup(), /medián/);
  const q = 'Jsou moje cíle glukózy pořád správné?';
  act('toggleQuestion', q); assert.ok(S().questions.some(x => x.text === q));
  act('toggleQuestion', q); assert.equal(S().questions.some(x => x.text === q), false);
});

test('Tři sloty dne: prázdný na řadě radí, prázdný minulý se doptá; pacient se může opravit', () => {
  chapter('week');
  act('role', 'patient');
  S().clock = '2026-10-13T08:00:00'; act('page', 'today');
  assert.equal(NF.mealState(S(), 'breakfast').state, 'now');
  assert.match(markup(), /Chystám se jíst/); assert.equal(/Snídal jsi dnes/.test(markup()), false);
  assert.match(markup(), /Už jsem snídal/, 'pacient se může opravit i když denní doba netrefí');
  assert.equal(NF.activePlan(S()).mealWindows, undefined, 'žádná okna od lékaře');
  S().clock = '2026-10-13T10:15:00'; act('page', 'today');
  assert.equal(NF.mealState(S(), 'breakfast').state, 'missed');
  assert.match(markup(), /Snídal jsi dnes\?/); assert.equal(/Chystám se jíst/.test(markup()), false, 'po okně se nenabízí dopředné flow');
  act('mealRetro', 'breakfast');
  assert.equal(S().meal.retro, true); assert.match(markup(), /Píchl sis k snídani inzulin/);
  act('mealStep', '2'); assert.match(S().error, /inzulin/);
  act('mealBolus', 'as'); act('mealAt', '7.5'); act('mealTime', '-15'); act('mealStep', '2');
  assert.match(markup(), /Co jsi jedl/);
  act('mealFood', food('Chléb se sýrem a zeleninou').id); act('mealPortion', 'usual'); act('mealStep', '3');
  assert.match(markup(), /Co pomůže teď/); assert.ok(NF.adviseAfter(S(), food('Chléb se sýrem a zeleninou').id).items.some(i => i.lever === 'walk'));
  act('mealDecide', 'walk:yes'); act('mealFinish', 'as');
  const ep = S().episodes[S().episodes.length - 1];
  assert.equal(ep.at, '2026-10-13T07:30:00'); assert.equal(ep.insulin.time, '07:15'); assert.equal(ep.retro, true);
  assert.equal(NF.mealState(S(), 'breakfast').state, 'done');
  /* vynechané jídlo s inzulinem → pokyn lékaře */
  S().clock = '2026-10-13T16:00:00'; act('page', 'today');
  assert.match(markup(), /Obědval jsi dnes/);
  act('mealSkipAsk', 'lunch'); assert.match(markup(), /Píchl sis k obědu inzulin/);
  act('mealSkip', 'lunch:as');
  assert.equal(NF.mealState(S(), 'lunch').state, 'skipped'); assert.match(markup(), /snědl jsem méně/);
});

/* ---------- zpětná vazba (15, odst. 7b) ---------- */
test('Zpětná vazba: po příchodu dat karta „Jak to dopadlo“ děkuje za čin; živá glukóza na Dnes není', () => {
  chapter('lateMeal'); act('role', 'patient');
  assert.equal(/Glukóza teď/.test(markup()), false, 'živá glukóza zrušena 1. 10. 2026');
  assert.equal(/Jak to dopadlo/.test(markup()), false, 'bez dnešních dat karta není');
  act('mealRetro', 'breakfast'); act('mealBolus', 'as'); act('mealAt', '7.5'); act('mealTime', '-15'); act('mealStep', '2');
  act('mealFood', food('Chléb se sýrem a zeleninou').id); act('mealPortion', 'usual'); act('mealStep', '3'); act('mealDecide', 'walk:yes'); act('mealFinish', 'as');
  const r = NF.lastResult(S());
  assert.ok(r && r.key === 'okAdvice', r && r.key); assert.match(r.text, /Díky, že jsi to zkusil/); assert.match(r.text, /vrchol/);
  assert.match(markup(), /Jak to dopadlo/);
  act('resultSeen', r.ep.id); assert.equal(NF.lastResult(S()), null); assert.equal(/Jak to dopadlo/.test(markup()), false);
  const T = NF.texts(S(), 'R-DIKY');
  for (const k of Object.keys(T)) assert.equal(/mmol|v cíli|nad cíl/.test(T[k]), false, 'poděkování není za hodnotu: ' + k);
  assert.equal(NF.thanks(S(), S().episodes[S().episodes.length - 1]), T.retro);
});
test('Milníky: jednou, za snahu a návyk, ne za hodnotu; Cesta ke kontrole počítá X z N', () => {
  chapter('week');
  const kase = food('Ovesná kaše s mlékem a banánem');
  assert.equal(S().fb.milestones.filter(m => m.id === 'known:' + kase.id).length, 1);
  NF.checkMilestones(S()); assert.equal(S().fb.milestones.filter(m => m.id === 'known:' + kase.id).length, 1, 'nejvýš jednou');
  const T = NF.texts(S(), 'R-MILNIKY');
  assert.ok(Object.keys(T).every(k => ['known', 'habit', 'week1', 'usual10', 'allknown', 'retro5'].includes(k)), 'žádný milník za hodnotu glukózy');
  for (const k of Object.keys(T)) assert.equal(/mmol/.test(T[k]), false, k);
  act('role', 'patient'); act('page', 'today');
  const m = NF.pendingMilestone(S()); assert.ok(m); assert.match(markup(), /Milník<\/b>/);
  act('milestoneClose', m.id); assert.equal(NF.pendingMilestone(S()), null, 'zavření zavře i starší; na Dnes je nejvýš jedna karta');
  const ps = NF.pathStats(S()); assert.ok(ps.known <= ps.repeated && ps.left > 0);
  const path = markup().match(/class="glass path"[\s\S]*?<\/section>/)[0];
  assert.match(path, /Cesta ke kontrole/); assert.match(path, new RegExp(ps.known + ' z ' + ps.repeated)); assert.equal(/\d+ %/.test(path), false, 'čísla X z N, ne procenta');
  assert.ok(S().events.some(x => x.what === 'milnik'), 'milník je ve stopě');
});
test('Týdenní shrnutí po 7 dnech jednou; vstup k reportu z Plánu a před kontrolou z Dnes', () => {
  chapter('lateMeal'); act('role', 'patient');
  act('milestoneClose', NF.pendingMilestone(S()).id);
  const w = NF.weekSummary(S()); assert.ok(w && w.week === 1); assert.match(markup(), /Tvůj 1\. týden/); assert.match(markup(), /z 21 jídel/);
  act('weekClose', w.id); assert.equal(NF.weekSummary(S()), null); assert.equal(/Tvůj 1\. týden/.test(markup()), false);
  act('page', 'plan'); assert.match(markup(), /Co uvidí lékař/); assert.match(markup(), /Tvoje milníky/);
  act('page', 'preview'); assert.match(markup(), /Na co se zeptat lékaře/);
  act('page', 'today'); assert.equal(/jdeš na kontrolu/.test(markup()), false);
  S().clock = '2027-01-02T09:00:00'; act('page', 'today'); assert.match(markup(), /jdeš na kontrolu/);
  /* nic z toho nejde do reportu lékaře */
  chapter('reviewSummary'); act('startReview'); assert.equal(/[Mm]ilník/.test(markup()), false);
});

/* ---------- kontrola ---------- */
test('Kontrola je vedené flow: souhrn → návrhy (jeden po druhém) → plán → předání', () => {
  chapter('reviewSummary'); act('startReview');
  const r = S().review;
  assert.equal(r.step, 1); assert.ok(r.proposals.length >= 3);
  assert.match(markup(), /Čas v cíli/); assert.match(markup(), /Co se dělo/);
  act('reviewStep', '3'); assert.equal(S().review.step, 1); assert.match(S().error, /Nejdřív/);
  act('reviewStep', '2');
  assert.equal((markup().match(/class="prop now"/g) || []).length, 1, 'jen jeden návrh otevřený');
  const pr = r.proposals[0];
  act('propDecide', pr.id + ':agree');
  if (pr.kind === 'dose') { assert.equal(S().review.decisions[pr.id], undefined, 'bez ověření nejde souhlasit'); }
  pr.verify.forEach((_, i) => act('propVerify', pr.id + ':' + i + ':yes'));
  const br = ctx.NutriFee.screens.proposalBranch(S(), pr);
  assert.ok(br && br.action !== 'wait');
  if (pr.kind === 'dose') { act('propUnits', pr.id + ':1'); act('propUnits', pr.id + ':1'); }
  act('propDecide', pr.id + ':' + (br.action === 'keep' ? 'keep' : 'agree'));
  assert.ok(S().review.decisions[pr.id]);
  assert.equal(S().review.index, 1);
});

test('Návrh k dávce: čistá data, rady první, větve podle ověření, jednotky volí lékař', () => {
  chapter('reviewProposals');
  const r = S().review, pr = r.proposals.find(p => p.kind === 'dose');
  assert.ok(pr);
  assert.match(pr.why, /obvyklou porcí a potvrzenou dávkou|potvrzen|nocí/);
  r.verify[pr.id] = {};
  assert.equal(NF.screens.proposalBranch(S(), pr).action, 'wait');
  pr.verify.forEach((_, i) => { r.verify[pr.id][i] = i !== 0; });
  assert.equal(NF.screens.proposalBranch(S(), pr).action, 'keep', 'bod 1 nesedí → ponechat');
  pr.verify.forEach((_, i) => { r.verify[pr.id][i] = true; });
  assert.ok(['up', 'down'].includes(NF.screens.proposalBranch(S(), pr).action));
  act('role', 'doctor'); act('propDecide', pr.id + ':agree');
  assert.equal(S().review.decisions[pr.id], undefined, 'stejné jednotky jako dnes → zamčeno');
  const before = NF.activePlan(S()).doses[pr.dose].units;
  act('propUnits', pr.id + ':1'); act('propDecide', pr.id + ':agree');
  assert.equal(S().review.decisions[pr.id].units, before + 1);
  assert.ok(S().events.some(e => e.what === 'navrh.rozhodnut'));
});

test('Vydání P2 z rozhodnutí; historie P1 zůstává; učení po změně dávky znovu', () => {
  chapter('reviewConfirm');
  const eps = S().episodes.length, k = food('Ovesná kaše s mlékem a banánem').id;
  assert.ok(NF.foodStats(S(), k).n >= 3);
  act('issueP2');
  assert.equal(S().activePlanId, 'P2'); assert.equal(S().plans.length, 2); assert.equal(S().episodes.length, eps);
  assert.equal(S().plans[0].state, 'superseded');
  const changed = ['basal', 'breakfast', 'lunch', 'dinner'].some(x => S().plans[1].doses[x].units !== S().plans[0].doses[x].units);
  if (changed) assert.equal(NF.foodStats(S(), k).n === 0 || NF.activePlan(S()).doses.breakfast.units === S().plans[0].doses.breakfast.units, true);
  assert.equal(S().review.step, 4);
  assert.match(markup(), /phone-preview/);
  act('role', 'patient');
  assert.match(markup(), /Co se změnilo/);
  act('confirmUnderstanding');
  assert.equal(NF.activeHabits(S()).every(h => h.planId === 'P2'), true);
});

test('Odbočka „většinou nepřijal“ vede k jiným návrhům', () => {
  chapter('reviewSummary'); branch('response', 'impractical'); act('role', 'doctor'); act('startReview');
  const ids = S().review.proposals.map(p => p.id).join(' ');
  assert.match(ids, /PR-SWAP|PR-.*-RADY/);
  boot(); chapter('reviewSummary'); branch('response', 'accepts'); act('role', 'doctor'); act('startReview');
  assert.match(S().review.proposals.map(p => p.id).join(' '), /PR-KEEP/);
});

/* ---------- stopa ---------- */
test('Stopa má vstupy a výstupy výpočtů a jde exportovat', () => {
  chapter('trace');
  const ev = S().events;
  assert.ok(ev.some(e => e.what === 'rada.zobrazena' && e.data && e.data.items));
  assert.ok(ev.some(e => e.what === 'kontrola.zahajena' && e.data.proposals));
  assert.ok(ev.some(e => e.what === 'registr.rozhodnuti'));
  const json = JSON.parse(NF.exportTrace(S()));
  assert.match(json.note, /generativní AI/);
  assert.match(markup(), /Export stopy/);
});

/* ---------- prezentace ---------- */
test('Skok na kapitolu je deterministický a každá se vykreslí ve své roli', () => {
  for (let i = 0; i < D.chapters.length; i++) {
    const a = D.play(i, null), b = D.play(i, null);
    assert.equal(JSON.stringify(a.episodes.map(e => e.id + e.peak)), JSON.stringify(b.episodes.map(e => e.id + e.peak)), D.chapters[i].id);
    act('goChapter', String(i)); act('closeDrawer');
    assert.equal(S().role, D.chapters[i].role, D.chapters[i].id);
    assert.equal(S().error, '', D.chapters[i].id + ': ' + S().error);
    assert.ok(markup().length > 500, D.chapters[i].id);
  }
});

function selectorPresent(m, sel) {
  const attrs = [...String(sel).matchAll(/\[([\w-]+)="([^"]*)"\]/g)].map(x => x[1] + '="' + x[2].replace(/&/g, '&amp;') + '"');
  if (!attrs.length) return true;
  return sel.split(',').some(part => { const a = [...part.matchAll(/\[([\w-]+)="([^"]*)"\]/g)].map(x => x[1] + '="' + x[2] + '"'); return [...m.matchAll(/<[^>]+>/g)].some(tag => a.every(x => tag[0].includes(x))); });
}
function tourAll(branches) {
  if (branches) app.setState(D.play(0, branches));
  const seen = [];
  for (let guard = 0; guard < 400; guard++) {
    const s = S(), B = s.branches, st = D.tour.stepsFor(D.chapters[s.chapterIndex].id, B), i = s.tourStep || 0;
    if (s.chapterIndex >= D.tour.lastIndex() && i >= st.length) break;
    if (i < st.length) { const op = (st[i].do || [])[0]; if (op && op.sel) { const sel = typeof op.sel === 'function' ? op.sel(B, s) : op.sel; assert.ok(selectorPresent(markup(), sel), 'cíl kroku chybí: ' + D.chapters[s.chapterIndex].id + ' krok ' + (i + 1) + ' ' + sel); } }
    act('tourNext');
    assert.equal(S().error, '', D.chapters[s.chapterIndex].id + ' krok ' + (i + 1) + ': ' + S().error);
    seen.push(D.chapters[S().chapterIndex].id);
  }
  return seen;
}
test('Celou maketu jde projít jen tlačítkem Další', () => {
  const seen = tourAll();
  for (const c of D.chapters) assert.ok(seen.includes(c.id), 'vynechána ' + c.id);
  assert.equal(S().plans.length, 2);
});
test('Průchod Další funguje ve všech odbočkách', () => {
  for (const v of [{ bolus: 'smaller' }, { bolus: 'unknown' }, { response: 'declines' }, { response: 'impractical' }]) { boot(); tourAll(Object.assign({}, D.defaults, v)); assert.equal(S().chapterIndex, D.chapters.length - 1, JSON.stringify(v)); }
  boot(); tourAll(Object.assign({}, D.defaults, { training: 'failed' }));
  assert.equal(D.chapters[S().chapterIndex].id, 'handover');
});
test('Každý krok vypráví a každá kapitola má úvod', () => {
  for (const c of D.chapters) {
    const ch = D.tour.chapters[c.id];
    assert.ok(ch && ch.intro && ch.intro.t && ch.intro.co, c.id);
    for (const s of ch.steps) { assert.ok(s.t && s.co, c.id + '/' + s.t); for (const op of s.do) if (op.act) assert.ok(NF.actions[op.act] || NF.demoActions[op.act], op.act); }
  }
});

/* ---------- produkce ---------- */
test('Produkční sestavení bez demo/ startuje prázdné a bez registru nic neradí', () => {
  for (const f of CORE) assert.equal(/D\.chapters|D\.play\(|NutriFeeDemo\.tour/.test(fs.readFileSync(path.join(__dirname, f), 'utf8')), false, f);
  boot({ withDemo: false });
  assert.equal(ctx.NutriFeeDemo, undefined);
  assert.equal(S().registry.items.length, 0); assert.equal(S().foods.length, 0);
  assert.equal(NF.sensorSource, undefined);
  assert.equal(NF.lastResult(S()), null); assert.equal(NF.pathStats(S()), null); assert.equal(NF.thanks(S(), { advice: [] }), null, 'bez položek registru žádná zpětná vazba');
  assert.equal(/DEMO · syntetická data · není určeno/.test(markup()), true, 'i produkce nese označení');
  assert.ok(markup().length > 200);
});
test('Verze v HTML souhlasí se schématem stavu', () => {
  const all = [...html.matchAll(/(?:src|href)="(?:app|demo)\/[^"]+\?v=(\d+)"/g)].map(m => m[1]);
  assert.equal(all.length, CORE.length + DEMO.length + 2);
  assert.equal(new Set(all).size, 1);
  assert.equal(Number(all[0]), NF.SCHEMA);
});
test('V publikovaných souborech nejsou skutečná jména', () => {
  const bad = /MUDr\.|Ing\. ?[A-Z]|prof\. |doc\. |a kol\.|et al\.|nemocnic|FN [A-Z]|Standards of Care|iPhone|Apple/;
  for (const f of ['nutrifee-rozhodovaci-maketa.html', 'README.md', ...CORE, ...DEMO]) assert.equal(bad.test(fs.readFileSync(path.join(__dirname, f), 'utf8')), false, f);
});

console.log('');
console.log('Prošlo: ' + passed + ', selhalo: ' + failed);
if (fails.length) console.log('Selhaly: ' + fails.join(' | '));
process.exit(failed ? 1 : 0);
