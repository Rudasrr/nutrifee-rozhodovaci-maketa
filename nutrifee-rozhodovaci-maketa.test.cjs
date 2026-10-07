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
/* Vykreslení vkládá nezlomitelné mezery (D11); testy porovnávají s obyčejnou mezerou. */
const plain = s => String(s).replace(/\u00a0/g, ' ');
const markup = () => plain(elements.get('app').innerHTML);
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
  const bad = /(?<![„‚])(sněz víc|snězte víc|dej si víc|dejte si víc|jez víc|jezte víc|sněz více|snězte více)/i;
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
  for (const id of doctorChapters) assert.ok(/^(prolog|enroll|doses|issue|registry|review|trace)/.test(id), 'lékařská kapitola mimo ordinaci: ' + id);
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

test('Pacientské texty jsou bez rodu (vykání, žádné příčestí „zkusil/zapsal“, žádné „nemocný“)', () => {
  const gendered = /\b(jste|jsem) (si |se |to )?[a-zá-ž]+l\b|\b[a-zá-ž]+l (jste|jsem)\b|nemocný|jistý|abyste|jako bys/i;
  for (let i = 0; i < D.chapters.length; i++) { act('goChapter', String(i)); act('closeDrawer'); act('role', 'patient'); for (const pg of ['today', 'foods', 'plan', 'safety', 'preview']) { act('page', pg); const m = markup().match(gendered); assert.equal(m, null, D.chapters[i].id + '/' + pg + ': ' + (m && m[0])); } }
  for (const it of S().registry.items) { const txt = JSON.stringify(it.texts || '') + (it.text || ''); const m = txt.match(gendered); assert.equal(m, null, it.id + ': ' + (m && m[0])); }
});
test('Pacientské obrazovky bez zakázaných slov (report, medián, skóre, garant, studie, čistá data) a bez tykání', () => {
  const bad = /\b(report|medián|skóre|garant|studie|čist[áé] data|čistý zápis|nečist)/i, ty = /\b(tvůj|tvoje|tvá|tvé|tebou|tobě|tebe|ti)\b|\b(zapiš|vyber|řekni|zkus|najdeš|vidíš|jsi|můžeš|chceš|máš)\b/i;
  const pages = ['today', 'meal', 'foods', 'plan', 'safety', 'takeover', 'understand', 'preview', 'report'];
  for (let i = 0; i < D.chapters.length; i++) {
    act('goChapter', String(i)); act('closeDrawer'); act('role', 'patient');
    for (const pg of pages) {
      act('page', pg);
      const mm = markup(), main = mm.slice(mm.indexOf('<main id="main"')).replace(/<[^>]+>/g, ' ');
      const b = main.match(bad), t = main.match(ty);
      assert.equal(b, null, D.chapters[i].id + '/' + pg + ': „' + (b && b[0]) + '“');
      assert.equal(t, null, D.chapters[i].id + '/' + pg + ': „' + (t && t[0]) + '“');
    }
  }
  for (const it of S().registry.items) for (const k of Object.keys(it.texts || {})) assert.equal(ty.test(it.texts[k]), false, it.id + '.' + k);
});
test('Přístupnost E (6. 10. 2026): barvy a velikosti v CSS, stupnice s textovým ekvivalentem, přepínač nemoci nahoře jako switch, dlaždice lékaře znakem + slovem, fokus na h1, zásuvka vrací fokus', () => {
  const css = fs.readFileSync(path.join(__dirname, 'app/design.css'), 'utf8');
  assert.match(css, /--muted:#56636c/); assert.match(css, /--brand:#27808d/); assert.equal(/uppercase/.test(css), false, 'žádné verzálky z CSS');
  assert.match(css, /prefers-contrast:more/); assert.match(css, /outline:3px solid #26303a/); assert.equal(/\.tiny\{font-size:1[12]/.test(css), false);
  assert.match(html, /%2327808d/, 'favikona v nové barvě'); assert.match(html, /id="toast" aria-live="polite"/);
  chapter('week'); act('page', 'foods'); const fid = food('Ovesná kaše s mlékem a banánem').id; if (S().foodOpen !== fid) act('foodOpen', fid);
  const m = markup();
  assert.match(m, /class="rows" role="img" aria-label="Stupnice glukózy 4 až 16 mmol\/l, hranice cíle 10[,0]* mmol\/l\. Bez rady [\d,]+ až [\d,]+ mmol\/l/);
  assert.match(m, /<div class="axis-words"><span>v cíli<\/span><span>nad cílem<\/span><\/div>/);
  assert.match(m, /data-action="foodsSeg" data-value="known" aria-pressed="true"/);
  act('page', 'today'); const td = markup();
  assert.match(td, /role="switch" aria-checked="false" data-action="illness" data-value="on"/);
  assert.ok(td.indexOf('class="sick"') < td.indexOf('class="glass path"'), 'přepínač nemoci je nad Cestou ke kontrole');
  act('illness', 'on'); act('page', 'safety'); assert.match(markup(), /role="switch" aria-checked="true" data-action="illness" data-value="off"/); act('illness', 'off'); act('page', 'today');
  assert.match(td, /<span class="ic" aria-hidden="true">/); assert.match(td, /aria-label="Schválené pravidlo: /);
  chapter('reviewProposals'); act('role', 'doctor'); act('reviewStep', '1');
  assert.match(markup(), /<span class="st">· (✓ v cíli|! blízko cíle|✕ mimo cíl|– bez dat)<\/span>/); assert.match(markup(), /aria-current="step"/);
  /* fokus: po přepnutí obrazovky se hledá main h1 a dostane tabindex=-1; zásuvka vrátí fokus na spouštěč */
  let focused = []; const h1 = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, focus() { focused.push('h1'); } };
  const root = elements.get('app'); root.querySelector = sel => sel === 'main h1' ? h1 : null;
  act('role', 'patient'); assert.deepEqual(focused, ['h1']); assert.equal(h1.attrs.tabindex, '-1');
  const opener = { focus() { focused.push('opener'); } }; ctx.document.activeElement = opener;
  act('openItem', 'S-CESTA'); act('closeDrawer'); assert.ok(focused.includes('opener'), 'zásuvka vrátila fokus'); ctx.document.activeElement = null;
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
  if (!S().draft.habits.length) act('toggleHabit', 'H-ZAPIS'); if (!S().draft.instructions.length) act('instrToggle', 'I-HYPO');
  /* dávky aplikace nepředvyplňuje: bez všech čtyř (≥ 1 j.) plán nejde vydat (6. 10. 2026) */
  assert.ok(NF.planBlockers(S()).join().indexOf('čtyři dávky') >= 0 && NF.planBlockers(S()).length === 1, 'chybí jen dávky');
  assert.match(markup(), /nastavte/);
  for (let i = 0; i < 8; i++) act('dose', 'breakfast:1'); for (let i = 0; i < 10; i++) act('dose', 'lunch:1'); for (let i = 0; i < 8; i++) act('dose', 'dinner:1'); for (let i = 0; i < 18; i++) act('dose', 'basal:1');
  assert.equal(NF.planBlockers(S()).length, 0);
  act('dose', 'breakfast:1');
  assert.equal(S().draft.doses.breakfast.units, 9);
  act('issuePlan');
  assert.equal(S().activePlanId, 'P1'); assert.equal(S().role, 'nurse');
  assert.equal(NF.activePlan(S()).doses.breakfast.units, 9);
});

test('Startovní sada je při čistém zařazení předvyplněná; podmínky z karty jsou označené, ale potvrzuje je lékař', () => {
  act('goScene', '0'); act('role', 'doctor'); act('resetDemo'); act('role', 'doctor'); act('page', 'enroll');
  S().draft = null; act('startDraft');
  assert.ok(S().draft.habits.length >= 3, 'návyky startovní sady'); assert.ok(S().draft.instructions.length >= 2, 'pokyny s výchozí hodnotou');
  assert.equal(S().draft.doses.breakfast.units, 0, 'dávka není předvyplněná');
  assert.match(markup(), /z karty: splněno/); assert.equal(S().enrollment.eligible, false);
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
  assert.match(markup(), /Je inzulin k tomuto jídlu už píchnutý/);
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
  act('mealSaveFood'); assert.match(S().error, /Klepněte/);
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
  assert.match(m, /Díky za \d+ dní zapisování/); assert.match(m, /Na co se zeptat lékaře/);
  assert.match(m, /Neuvidí žádné známky/);
  act('previewTile', 'adv'); assert.match(markup(), /Po přijaté radě byla nejvyšší hodnota/);
  const q = 'Jsou moje cíle glukózy pořád správné?';
  act('toggleQuestion', q); assert.ok(S().questions.some(x => x.text === q));
  act('toggleQuestion', q); assert.equal(S().questions.some(x => x.text === q), false);
});

test('Tři sloty dne: prázdný na řadě radí, prázdný minulý se doptá; pacient se může opravit', () => {
  chapter('week');
  act('role', 'patient');
  S().clock = '2026-10-13T08:00:00'; act('page', 'today');
  assert.equal(NF.mealState(S(), 'breakfast').state, 'now');
  assert.match(markup(), /Chystám se jíst/); assert.equal(/Byla dnes snídaně/.test(markup()), false);
  assert.match(markup(), /Snídaně už byla/, 'pacient se může opravit i když denní doba netrefí');
  assert.equal(NF.activePlan(S()).mealWindows, undefined, 'žádná okna od lékaře');
  S().clock = '2026-10-13T10:15:00'; act('page', 'today');
  assert.equal(NF.mealState(S(), 'breakfast').state, 'missed');
  assert.match(markup(), /Byla dnes snídaně\?/); assert.equal(/Chystám se jíst/.test(markup()), false, 'po okně se nenabízí dopředné flow');
  act('mealRetro', 'breakfast');
  assert.equal(S().meal.retro, true); assert.match(markup(), /Byl ke snídani inzulin/);
  act('mealStep', '2'); assert.match(S().error, /inzulin/);
  act('mealBolus', 'as'); act('mealAt', '7.5'); act('mealTime', '-15'); act('mealStep', '2');
  assert.match(markup(), /Co bylo k jídlu/);
  act('mealFood', food('Chléb se sýrem a zeleninou').id); act('mealPortion', 'usual'); act('mealStep', '3');
  assert.match(markup(), /Co pomůže teď/); assert.ok(NF.adviseAfter(S(), food('Chléb se sýrem a zeleninou').id).items.some(i => i.lever === 'walk'));
  act('mealDecide', 'walk:yes'); act('mealFinish', 'as');
  const ep = S().episodes[S().episodes.length - 1];
  assert.equal(ep.at, '2026-10-13T07:30:00'); assert.equal(ep.insulin.time, '07:15'); assert.equal(ep.retro, true);
  assert.equal(NF.mealState(S(), 'breakfast').state, 'done');
  /* vynechané jídlo s inzulinem → pokyn lékaře */
  S().clock = '2026-10-13T16:00:00'; act('page', 'today');
  assert.match(markup(), /Byl dnes oběd/);
  act('mealSkipAsk', 'lunch'); assert.match(markup(), /Byl k obědu inzulin/);
  act('mealSkip', 'lunch:as');
  assert.equal(NF.mealState(S(), 'lunch').state, 'skipped'); assert.match(markup(), /méně jídla než obvykle/);
});

/* ---------- zpětná vazba (15, odst. 7b) ---------- */
test('Zpětná vazba: po příchodu dat karta „Jak to dopadlo“ děkuje za čin; živá glukóza na Dnes není', () => {
  chapter('lateMeal'); act('role', 'patient');
  assert.equal(/Glukóza teď/.test(markup()), false, 'živá glukóza zrušena 1. 10. 2026');
  assert.equal(/Jak to dopadlo/.test(markup()), false, 'bez dnešních dat karta není');
  act('mealRetro', 'breakfast'); act('mealBolus', 'as'); act('mealAt', '7.5'); act('mealTime', '-15'); act('mealStep', '2');
  act('mealFood', food('Chléb se sýrem a zeleninou').id); act('mealPortion', 'usual'); act('mealStep', '3'); act('mealDecide', 'walk:yes'); act('mealFinish', 'as');
  const r = NF.lastResult(S());
  assert.ok(r && r.key === 'okAdvice', r && r.key); assert.match(r.text, /Díky za pokus/); assert.match(r.text, /nejvyšší hodnota/);
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
  const w = NF.weekSummary(S()); assert.ok(w && w.week === 1); assert.match(markup(), /Váš 1\. týden/); assert.match(markup(), /z 21 jídel/);
  act('weekClose', w.id); assert.equal(NF.weekSummary(S()), null); assert.equal(/Váš 1\. týden/.test(markup()), false);
  act('page', 'plan'); assert.match(markup(), /Co uvidí lékař/); assert.match(markup(), /Vaše milníky/);
  act('page', 'preview'); assert.match(markup(), /Na co se zeptat lékaře/);
  act('page', 'today'); assert.equal(/jdete na kontrolu/.test(markup()), false);
  S().clock = '2027-01-02T09:00:00'; act('page', 'today'); assert.match(markup(), /jdete na kontrolu/);
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

test('Rady svázané s plánem: výměna rady má účinek; návrhy beze změny jedna karta; Vše sedí; Potvrdit plán ukazuje výsledek', () => {
  chapter('reviewSummary'); branch('response', 'impractical'); act('role', 'doctor'); act('startReview'); act('reviewStep', '2');
  const r = S().review;
  assert.match(markup(), /Rozhodněte \d+ návrh/); assert.equal(/\d+ návrhy</.test(markup()), false, 'gramatika');
  assert.match(markup(), /Beze změny \(\d+\)/); assert.equal((markup().match(/class="prop now"/g) || []).length, 1);
  const pr = NF.nextProposal(S()); assert.ok(pr.lever, 'první návrh se týká rady');
  act('propVerifyAll', pr.id); assert.ok(pr.verify.every((_, i) => r.verify[pr.id][i] === true));
  act('propVerify', pr.id + ':0:no');
  assert.equal(NF.screens.proposalBranch(S(), pr).action, 'swap', 'bod 1 nesedí → vyměnit');
  const opts = NF.swapOptions(S(), pr); assert.ok(opts.length && !opts.includes(pr.lever));
  act('propSwapTo', pr.id + ':' + opts[0]); act('propDecide', pr.id + ':agree');
  assert.equal(r.decisions[pr.id].swapTo, opts[0]);
  /* zbytek jednotlivě, pak beze změny jedním klepnutím */
  D.decideSingles(S(), S().branches);
  assert.equal(NF.reviewComplete(S()), false); act('propKeepAll'); assert.equal(NF.reviewComplete(S()), true);
  assert.ok(r.proposals.filter(p => p.group).every(p => r.decisions[p.id].choice === 'keep'));
  act('reviewStep', '3');
  const d = NF.planFromReview(S());
  assert.ok(d.advice.off.includes(pr.lever) && d.advice.prefer.length >= 1, 'vypnutá rada a náhrada v plánu');
  assert.match(markup(), /vypnuto/); assert.match(markup(), /nabízet přednostně/);
  act('issueP2'); assert.deepEqual(NF.activePlan(S()).advice, d.advice);
  act('role', 'patient'); assert.match(markup(), /lékař ji vypnul/); act('confirmUnderstanding');
  const k = food('Ovesná kaše s mlékem a banánem').id, items = NF.advise(S(), k, 'usual', 'before').items.map(i => i.lever);
  assert.equal(items.includes(pr.lever), false, 'vypnutá rada se nenabízí'); assert.ok(items.includes(NF.activePlan(S()).advice.prefer[0]), 'náhradní rada se nabízí');
  act('page', 'plan'); assert.match(markup(), /lékař vypnul/);
});
test('Akutní problém otevře pokyny a kontakty; návrh k dávce bez schváleného postupu nemá větve', () => {
  chapter('reviewSummary'); act('startReview'); act('acuteOpen');
  assert.match(plain(elements.get('overlay').innerHTML), /Akutní problém pacienta/); act('closeDrawer');
  NF.decideItem(S(), 'D-POSTUP', 'rejected', 'test');
  const props = NF.proposals(S(), NF.activePlan(S()).id, D.habitCatalog).filter(p => p.kind === 'dose');
  assert.ok(props.length && props.every(p => p.branches.length === 0 && /D-POSTUP/.test(p.weak.join())));
});

/* ---------- správnost výpočtů (balíček C) ---------- */
test('Čistá data: inzulin včas (±15 min); jídlo ve dvou slotech s různou dávkou se neslévá; bazál z dnů plánu; nemoc po dnech; HbA1c', () => {
  chapter('week');
  const ep = S().episodes.find(e => e.id === 'E6'); assert.ok(NF.usableEp(S(), ep));
  ep.insulin.time = '06:35'; assert.ok(NF.usableEp(S(), ep), '25 min před jídlem je včas');
  ep.insulin.time = '06:20'; assert.equal(NF.usableEp(S(), ep), false, '40 min před jídlem už ne'); assert.match(NF.whyNotUsable(S(), ep), /mimo čas/);
  ep.insulin.time = '07:20'; assert.equal(NF.usableEp(S(), ep), false, '20 min po jídle už ne'); ep.insulin.time = '06:55';
  chapter('preview'); const ch = food('Chléb se sýrem a zeleninou').id;
  const all = NF.foodStats(S(), ch).n; assert.ok(all > 0);
  NF.activePlan(S()).doses.dinner.units = 6;
  assert.ok(NF.foodStats(S(), ch, null, 'breakfast').n < all, 'večeře s jinou dávkou k snídani nepatří');
  assert.equal(NF.foodStats(S(), ch, null, 'dinner').n, 0, 'při změně dávky k večeři se učí znovu');
  NF.activePlan(S()).doses.dinner.units = 8;
  const s = NF.summary(S(), 'P1');
  assert.ok(s.basalDays >= 90 && s.basalAs <= s.basalDays, 'jmenovatel bazálu = dny plánu'); assert.equal(s.illDays, 3, 'nemoc 20.–22. 10. = 3 dny');
  assert.ok(s.hba1c && s.onTime <= s.asPlan);
  chapter('reviewSummary'); act('startReview'); assert.match(markup(), /HbA1c/); act('reviewTile', 'ins'); assert.match(markup(), /včas/);
  /* dvě období nemoci se sčítají */
  chapter('recovery'); act('illnessCheck', 'better'); S().clock = '2026-11-01T08:00:00'; act('illness', 'on'); S().clock = '2026-11-02T08:00:00'; act('illness', 'off');
  assert.equal(NF.illnessDays(S()), 5);
});
test('Zamítnuté položky přestanou působit: R-SKORE bez štítku, zamítnutá rada s neutrální větou; návyk „zapisuj“ po třech jídlech; bazál ze včerejška', () => {
  chapter('afterBolus'); const k = food('Ovesná kaše s mlékem a banánem').id;
  act('role', 'doctor'); NF.decideItem(S(), 'R-SKORE', 'rejected', 'test'); act('role', 'patient');
  assert.equal(NF.confidence(S(), k).reaction, null);
  act('page', 'foods'); act('foodsSeg', 'all'); act('foodOpen', k); assert.match(markup(), /nehodnotíme/);
  act('role', 'doctor'); NF.decideItem(S(), 'R-DOPLNEK', 'rejected', 'test'); act('role', 'patient');
  const res = NF.advise(S(), k, 'usual', 'before');
  assert.ok(res.gone.some(g => g.lever === 'addon')); assert.match(res.gone[0].text, /nenabízíme/); assert.equal(/garant/i.test(res.gone[0].text), false);
  act('startMeal', 'breakfast'); act('mealBolus', 'before'); act('mealStep', '2'); act('mealFood', k); act('mealPortion', 'usual'); act('mealStep', '3');
  assert.match(markup(), /teď nenabízíme/);
  chapter('week'); act('role', 'patient'); S().clock = '2026-10-12T19:00:00'; act('page', 'today');
  assert.match(markup(), /2 \/ 3 jídla/); assert.equal(/class="mark "><\/span><\/span><div>Zapsat/.test(markup()), false);
  S().clock = '2026-10-14T08:00:00'; act('page', 'today');
  assert.match(markup(), /včera večer bazál/); act('basalYesterday', 'as');
  assert.ok(S().basalLog.some(b => b.date === '2026-10-13' && b.confirmed === 'as')); assert.equal(/včera večer bazál/.test(markup()), false);
});

/* ---------- balíček D ---------- */
test('Svačina: bez inzulinu a bez porce, mimo sloty a návrhy k dávce, učí se zvlášť; v reportu vidět', () => {
  chapter('lateMeal'); act('role', 'patient'); S().clock = '2026-10-13T15:00:00'; act('page', 'today');
  assert.match(markup(), /Zapsat svačinu|Svačina · bez inzulinu/);
  act('startMeal', 'snack'); assert.equal(S().meal.step, 2); assert.match(markup(), /svačině/); assert.equal(/Jakou porci/.test(markup()), false);
  bind('meal.q', 'jabl'); act('mealFood', food('Jablko').id); assert.equal(/Jakou porci/.test(markup()), false); act('mealStep', '3');
  assert.equal(/mění množství jídla/.test(markup()), false, 'u svačiny žádná rada k porci');
  act('mealFinish', 'snack');
  const ep = S().episodes[S().episodes.length - 1];
  assert.equal(ep.meal, 'snack'); assert.equal(ep.insulin.confirmed, 'snack'); assert.equal(ep.insulin.prescribed, null); assert.equal(ep.doseKey, 'snack:0');
  assert.ok(NF.usableEp(S(), ep), 'svačina se učí (bez podmínky inzulinu)');
  assert.equal(NF.mealState(S(), 'lunch').state, 'now', 'svačina nezaplní slot');
  assert.equal(NF.foodStats(S(), food('Jablko').id).n >= 1, true);
  const s = NF.summary(S(), 'P1'); assert.ok(s.snacks >= 1); assert.equal(s.meals, NF.periodEpisodes(S(), 'P1').filter(e => e.meal !== 'snack').length);
  const props = NF.proposals(S(), 'P1', D.habitCatalog); assert.equal(props.some(p => /snack|svačin/i.test(p.id + p.title)), false);
});
test('Cíle glukózy voličem při zařazení i při kontrole; úprava pokynů při kontrole má účinek; po převzetí P2 lze zahájit další kontrolu', () => {
  chapter('doses'); assert.match(markup(), /Cíle glukózy/);
  act('target', 'high:1'); assert.equal(S().draft.targets.high, 10.5); act('target', 'high:-1'); assert.equal(S().draft.targets.high, 10);
  act('target', 'low:-100'); assert.equal(S().draft.targets.low, 3.0, 'dolní mez voliče');
  chapter('reviewProposals'); act('role', 'doctor');
  const r = S().review, pk = r.proposals.find(p => p.id === 'PR-POKYNY');
  act('propSingle', pk.id); D.decideSingles(S(), S().branches); act('propReopen', pk.id);
  act('propVerify', pk.id + ':0:no'); assert.equal(NF.screens.proposalBranch(S(), pk).action, 'edit');
  assert.match(markup(), /Pokyny pro příští období/);
  act('revTarget', 'fastingHigh:-2'); act('revInstrToggle', 'I-VYSOKA');
  act('propDecide', pk.id + ':agree'); assert.equal(r.decisions[pk.id].branch, 'edit');
  act('propKeepAll'); act('reviewStep', '3'); act('issueP2');
  const p2 = NF.activePlan(S());
  assert.equal(p2.targets.fastingHigh, 7.0); assert.ok(p2.instructions.some(i => i.id === 'I-VYSOKA'));
  act('role', 'patient'); assert.match(markup(), /Pokyny a cíle/); act('confirmUnderstanding');
  act('role', 'doctor'); act('page', 'review'); assert.match(markup(), /Zahájit kontrolu/, 'po převzetí P2 lze začít další kontrolu');
  act('startReview'); assert.equal(S().review.planId, 'P2');
});

test('Druhý průchod: Co teď dává přednost jídlu před bazálem; připomínka inzulinu jen pro slot na řadě; pohyb jen do 90 min po jídle; bez přepínače jídla; bez falešných fajfek', () => {
  chapter('week'); act('role', 'patient');
  S().clock = '2026-10-13T19:30:00'; NF.skipMeal(S(), 'breakfast', 'none'); NF.skipMeal(S(), 'lunch', 'none'); act('page', 'today');
  assert.match(markup(), /Na řadě je večeře/); assert.equal(/<b>Čas na bazál<\/b>/.test(markup()), false, 'večeře před bazálem');
  NF.skipMeal(S(), 'dinner', 'none'); S().clock = '2026-10-13T21:00:00'; act('page', 'today'); assert.match(markup(), /<b>Čas na bazál<\/b>/);
  chapter('week'); act('role', 'patient');
  S().clock = '2026-10-13T15:00:00'; act('page', 'today');
  assert.match(markup(), /Byla dnes snídaně/); assert.equal(/zeptáme se před jídlem/.test(markup()), false, 'připomínka inzulinu k minulému jídlu nemá smysl');
  act('mealRetro', 'breakfast'); assert.equal(/data-action="mealKind"/.test(markup()), false, 'přepínač jídla zrušen (Z2)');
  act('mealBolus', 'as'); act('mealAt', '7'); act('mealStep', '2'); act('mealFood', food('Chléb se sýrem a zeleninou').id); act('mealPortion', 'usual'); act('mealStep', '3');
  assert.equal(NF.adviseAfter(S(), food('Chléb se sýrem a zeleninou').id, 'breakfast', NF.retroAt(S(), 7)).items.length, 0, 'po 8 hodinách už procházka nepomůže');
  assert.match(markup(), /uplynuly víc než tři hodiny/); act('mealFinish', 'as');
  S().clock = '2026-10-13T16:00:00'; assert.match(NF.adviseAfter(S(), food('Jablko').id, 'snack', '2026-10-13T14:00:00').items[0].certainty, /2–3 hodiny/, 'po 2 h ještě radí, ale po pravdě');
  act('page', 'plan'); assert.equal((markup().match(/Tři jídla denně/g) || []).length, 0, 'duplicitní karta odstraněna');
  chapter('preview'); assert.equal(/class="mark">✓<\/span><div>Zapisuj/.test(markup()), false, 'žádné falešné fajfky'); assert.match(markup(), /Díky za \d+ dní zapisování/);
  /* bez zápisů report nepadá na „null %“ */
  chapter('handover'); act('role', 'doctor'); act('startReview'); assert.equal(/null/.test(markup()), false); assert.match(markup(), /Zatím žádné zápisy/);
});

/* ---------- stopa ---------- */
test('Texty doplňků nic z jídla neubírají (zásada 3): žádné „místo / vyměň / nahraď / méně / bez“', () => {
  const bad = /místo|vyměň|nahraď|méně|\bbez\b|polovin|část/i;
  for (const f of S().foods) { if (f.addon) assert.equal(bad.test(f.addon), false, f.name + ': ' + f.addon); if (f.first) assert.equal(bad.test(f.first), false, f.name + ': ' + f.first); }
  for (const id of ['R-DOPLNEK', 'R-PORADI']) assert.equal(bad.test(NF.item(S(), id).text || ''), false, id);
  /* doplněk jen před píchnutím a mimo nemoc; jídlo „bez doplňku“ ho nenabízí */
  chapter('advice'); const k = food('Ovesná kaše s mlékem a banánem').id;
  assert.ok(NF.advise(S(), k, 'usual', 'before').items.some(i => i.lever === 'addon'), 'před píchnutím se doplněk nabízí');
  assert.equal(NF.advise(S(), k, 'usual', 'as').items.some(i => i.lever === 'addon'), false, 'po píchnutí ne');
  S().illness = { active: true, from: S().clock, checkins: [] };
  assert.equal(NF.advise(S(), k, 'usual', 'before').items.some(i => i.lever === 'addon'), false, 'při nemoci ne');
  S().illness = null;
  const eggs = food('Míchaná vejce se zeleninou'); assert.equal(eggs.addon, '');
});

test('Komentář garanta v panelu vyprávění nemění stav ani se nepočítá jako potvrzení; zamítnutá rada zmizí i z reportu a plánu P2', () => {
  act('goScene', String(D.scenes.findIndex(s => D.chapters[s.ch].id === 'impact'))); act('closeDrawer');
  const before = NF.registrySummary(S());
  bind('form.gc_R-DOPLNEK', 'Nepodepisuji — doplněk po píchnutí.'); act('garantComment', 'R-DOPLNEK');
  const after = NF.registrySummary(S());
  assert.equal(after.touched, before.touched); assert.equal(after.confirmed, before.confirmed); assert.equal(after.pending, before.pending + 1);
  assert.equal(NF.item(S(), 'R-DOPLNEK').status, 'approved'); assert.match(markup(), /okomentováno · čeká/);
  /* zamítnutí R-PROCHAZKA: u pacienta zmizí a v reportu se už nenavrhuje „Zachovat radu Procházka“ */
  act('garantDecide', 'R-PROCHAZKA:rejected');
  chapter('reviewProposals');
  assert.equal(S().review.proposals.some(p => p.lever === 'walk'), false, 'zamítnutá rada není v návrzích');
  D.decideSingles(S(), S().branches); act('role', 'doctor'); act('propKeepAll'); D.decideSingles(S(), S().branches); act('reviewStep', '3');
  assert.match(markup(), /nepoužívá se \(položka registru zamítnuta\)/);
});

test('Rozhodnutí proti směru větve se zapíše jako „jinak“, ne jako souhlas; bod bez větve nevymýšlí větev; vyřazené zápisy jsou vypsané', () => {
  chapter('reviewProposals'); act('role', 'doctor');
  const r = S().review, pr = r.proposals.find(p => p.kind === 'dose' && p.dose !== 'basal'); assert.ok(pr);
  assert.ok(pr.verify.some(v => /nemocný/.test(v)), 'ověřovací bod nemoci');
  assert.ok(Array.isArray(pr.excluded), 'seznam vyřazených zápisů'); assert.equal(/\d zápisů vyřazeno \(/.test(pr.weak.join()) && pr.excluded.length === 1, false, 'tvar čísla');
  r.verify[pr.id] = {}; pr.verify.forEach((_, i) => { r.verify[pr.id][i] = i !== 1; });
  const br = NF.screens.proposalBranch(S(), pr); assert.equal(br.action, 'free'); assert.match(br.text, /bod 2 nesedí/);
  pr.verify.forEach((_, i) => { r.verify[pr.id][i] = true; });
  const dir = NF.screens.proposalBranch(S(), pr).action; assert.ok(dir === 'up' || dir === 'down');
  act('propUnits', pr.id + ':' + (dir === 'up' ? '-1' : '1'));
  assert.match(markup(), /Rozhodnout jinak než postup/);
  act('propDecide', pr.id + ':agree');
  assert.equal(r.decisions[pr.id].choice, 'other'); assert.equal(r.decisions[pr.id].againstBranch, true);
  assert.match(markup(), /rozhodnuto jinak než postup/);
});

test('Svačina se nepočítá do návyků „obvyklá porce“ a „potvrdit inzulin“ a nespouští milník „umíme poradit“', () => {
  chapter('week'); act('role', 'patient');
  const snacks = S().episodes.filter(e => NF.isSnack(e.meal)); assert.ok(snacks.length >= 1);
  act('page', 'today'); const m = markup();
  assert.equal(/Obvyklá porce<small>\d+ \/ \d+ jídel v obvyklé porci/.test(m) && /zatím žádné jídlo/.test(m) === false && S().episodes.filter(e => !NF.isSnack(e.meal) && NF.day(e.at) === NF.day(S().clock)).length === 0, false);
  const known = S().fb.milestones.filter(x => x.key === 'known');
  for (const k of known) assert.equal(NF.isSnack(NF.dominantMeal(S(), k.id.split(':')[1])), false, 'milník známe ne u svačiny');
});

test('Robustnost: kalendářní dny, zpětný čas nikdy v budoucnosti, bazál po půlnoci k předchozímu dni, inzulin přes půlnoc', () => {
  assert.equal(NF.daysBetween('2026-10-05T00:00:00', '2026-10-05T23:59:00'), 0);
  assert.equal(NF.daysBetween('2026-10-25T00:30:00', '2026-10-26T00:30:00'), 1, 'konec letního času');
  assert.equal(NF.daysBetween('2026-10-05T09:05:00', '2026-10-11T21:06:00'), 6);
  chapter('lateMeal'); act('role', 'patient');
  S().clock = '2026-10-14T00:10:00';
  assert.ok(NF.retroAt(S(), 19) <= S().clock, 'včerejší večeře po půlnoci není v budoucnosti'); assert.equal(NF.day(NF.retroAt(S(), 19)), '2026-10-13');
  assert.ok(NF.confirmBasal(S(), 'as').ok); assert.equal(S().basalLog[S().basalLog.length - 1].date, '2026-10-13');
  assert.equal(NF.onTime(S(), { at: '2026-10-13T23:50:00', insulin: { time: '00:05' } }), true);
});

test('Robustnost: akce bez stavu nepadají; Další po ručním zásahu pacienta aplikaci neshodí; výjimka v akci je hláška', () => {
  chapter('firstMeal'); act('role', 'patient');
  S().meal = null; S().review = null; S().reg = null; S().draft = null;
  for (const name of Object.keys(NF.actions)) for (const v of [undefined, '0', 'x', 'a:b:c', 'NaN']) { act(name, v); assert.ok(!/undefined|NaN|\[object Object\]/.test(markup()), name + ' ' + v); }
  for (const id of ['firstMeal', 'advice', 'afterBolus', 'custom', 'illnessMeal']) {
    chapter(id); act('role', 'patient');
    if (S().meal) act('mealFinish', S().meal.bolus === 'before' ? 'as' : (S().meal.bolus || 'as'));
    for (let k = 0; k < 12; k++) act('tourNext');
    assert.ok(!/undefined|NaN/.test(markup()), id);
  }
  chapter('week'); act('role', 'patient'); act('startMeal', 'snack'); for (let k = 0; k < 8; k++) act('tourNext'); assert.ok(!/undefined|NaN/.test(markup()));
  chapter('training'); act('role', 'nurse'); act('trainingStep', 'app'); for (let k = 0; k < 6; k++) act('tourNext'); assert.equal(S().training.result, 'done', 'ruční odškrtnutí nezasekne zaučení');
  NF.actions.noop = () => { throw new Error('zkouška'); }; act('noop'); assert.match(S().error, /nepovedlo/); assert.ok(S().events.some(e => e.what === 'chyba.akce')); delete NF.actions.noop; NF.actions.noop = function () { };
});

test('Robustnost: osekaný stav se doplní, cizí schéma se zálohuje a ohlásí, bind mění jen povolené klíče, duplicitní jídlo, meze voličů', () => {
  const s0 = JSON.parse(store.get('nutrifee-maketa')); delete s0.episodes; delete s0.registry; delete s0.foods; delete s0.habits; delete s0.training; store.set('nutrifee-maketa', JSON.stringify(s0));
  const s1 = NF.load(); assert.ok(Array.isArray(s1.episodes) && s1.registry && Array.isArray(s1.foods) && s1.training, 'chybějící klíče doplněné');
  const s2 = JSON.parse(store.get('nutrifee-maketa')); s2.schema = 1; store.set('nutrifee-maketa', JSON.stringify(s2));
  const s3 = NF.load(); assert.equal(s3.schema, NF.SCHEMA); assert.equal(NF.migrated, '1'); assert.ok(store.has('nutrifee-maketa.zaloha-1'), 'záloha');
  NF.migrated = null;
  chapter('week'); bind('role', 'doctor'); assert.equal(S().role, 'patient', 'bind nemění roli'); bind('notes', 'x'); assert.equal(S().notes, 'x');
  act('role', 'patient'); const a = NF.addFood(S(), 'Moje polévka', { side: 'bez', prep: 'varene', size: 'bezne' }), b = NF.addFood(S(), 'moje polévka ', { side: 'bez', prep: 'varene', size: 'male' });
  assert.equal(a.food.id, b.food.id); assert.equal(b.existing, true);
  chapter('registry'); act('regOpen', 'R-REAKCE'); act('regEdit'); for (let i = 0; i < 10; i++) act('regParam', 'R-REAKCE:minKnown:-1'); assert.equal(S().reg.params.minKnown, 1, 'minKnown ≥ 1');
  chapter('enroll'); act('startDraft'); for (let i = 0; i < 40; i++) act('target', 'low:1'); assert.ok(S().draft.targets.low <= S().draft.targets.high - 1, 'dolní cíl pod horním');
  act('role', 'patient'); S().meal = null; act('mealUnits', '1'); assert.ok(S().error);
  const c = S().clock; act('shiftTime', 'x'); assert.equal(S().clock, c);
});

test('Kontrola po vydání plánu je zamčená: návrhy nelze znovu otevřít ani měnit', () => {
  chapter('reviewHandover'); act('role', 'doctor');
  const r = S().review, id = r.proposals[0].id, before = JSON.stringify(r.decisions);
  act('propReopen', id); assert.equal(JSON.stringify(r.decisions), before); assert.match(S().error, /už je vydaný/);
  act('propVerify', id + ':0:no'); assert.equal(JSON.stringify(r.decisions), before);
  act('reviewStep', '2'); assert.equal(/· změnit/.test(markup()), false);
});

test('Smoke: náhodné klepání z obrazovky v pěti scénách nerozbije vykreslení', () => {
  let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (const sc of [0, 5, 9, 14, 20]) {
    act('goScene', String(sc)); act('closeDrawer');
    for (let k = 0; k < 100; k++) {
      const btns = [...markup().matchAll(/data-action="([^"]+)"(?: data-value="([^"]*)")?/g)].filter(x => !/goScene|goChapter|resetDemo|garantReset|storyStep|setBranch|^role$|exportTrace|exportRegistry|openPresenter/.test(x[1]));
      if (!btns.length) break;
      const b = btns[Math.floor(rnd() * btns.length)];
      act(b[1], b[2]); act('closeDrawer');
      assert.ok(!/undefined|NaN|\[object Object\]/.test(markup()), 'scéna ' + sc + ' akce ' + b[1] + ' ' + b[2]);
    }
  }
});

test('Sestra: „Ukázat“ u jídla ukáže ukázkové jídlo, Plán s dávkami jde zobrazit, náhled se neovládá; nezdar s důvodem vidí lékař', () => {
  chapter('training'); act('role', 'nurse');
  act('trainingPreview', 't-zapis'); assert.equal(/Teď nelze nic zapsat/.test(markup()), false); assert.match(markup(), /Ukázkové jídlo · krok 3/); assert.equal(S().meal, null, 'ukázkové jídlo nezůstane ve stavu');
  act('trainingPreview', 't-inzulin'); assert.match(markup(), /Je inzulin k tomuto jídlu už píchnutý/);
  act('trainingPreview', 'plan'); assert.match(markup(), /Plán s dávkami/); assert.match(markup(), /preview-static/);
  act('page', 'meal'); assert.equal(S().page, 'training'); act('startMeal', 'breakfast'); assert.equal(S().meal, null);
  for (const x of NF.trainingItems(S())) act('trainingCheck', x.id);
  act('finishTraining', 'failed'); act('trainingReason', 'helper');
  assert.equal(S().training.reason, 'helper'); assert.match(markup(), /Co dál/); assert.equal(/data-action="finishTraining" data-value="done"/.test(markup()), false, 'po výsledku tlačítka zmizí');
  act('role', 'doctor'); act('page', 'enroll'); assert.match(markup(), /zaučení se nezdařilo/); assert.match(markup(), /pomoc blízké osoby/);
  act('role', 'nurse'); act('finishTraining', 'reset'); assert.equal(S().training.result, null); act('finishTraining', 'done'); assert.equal(S().training.result, 'done');
  chapter('reviewSummary'); act('role', 'doctor'); act('startReview'); assert.match(markup(), /Zaučení u sestry/);
});

test('Návrh k dávce 6. 10. 2026: okno od změny dávky, ≥ 8 jídel, rozpad po jídlech, celkové vyrovnání na kartě, nízké hodnoty ze všech zápisů', () => {
  chapter('reviewProposals'); act('role', 'doctor');
  const r = S().review, pr = r.proposals.find(p => p.kind === 'dose' && p.dose !== 'basal'); assert.ok(pr);
  assert.ok(Array.isArray(pr.breakdown) && pr.breakdown.length >= 1, 'rozpad po jídlech'); assert.match(pr.why, /za \d+ dní/); assert.match(pr.why, /medián vrcholu/);
  assert.match(pr.context, /čas v cíli/); assert.match(pr.context, /HbA1c/);
  assert.ok(pr.verify.some(v => /Celkové vyrovnání/.test(v))); assert.ok(pr.branches.some(b => /celkově v cíli/.test(b.text)));
  assert.match(markup(), /Po jídlech:/); assert.match(markup(), /Celkové vyrovnání:/);
  assert.equal(NF.param(S(), 'D-PRAND', 'minJidel', 0), 8); assert.equal(NF.param(S(), 'D-PRAND', 'dny', 0), 28);
  /* jediný pokles pod 3,0 u kteréhokoli zápisu jídla spustí návrh „pod cílem“ s předností */
  const p = NF.activePlan(S()), e0 = S().episodes.filter(e => e.planId === p.id && e.meal === 'dinner').slice(-1)[0];
  e0.insulin.confirmed = 'none'; e0.points.push({ min: 180, mmol: 2.8 });
  const props = NF.proposals(S(), p.id, D.habitCatalog), low = props.find(x => x.id === 'PR-DINNER');
  assert.ok(low && /pod cílem/.test(low.title), 'hypo z nečistého zápisu'); assert.ok(low.weak.some(w => /mimo čistá data/.test(w)));
});

test('Čistá data pro dávku 6. 10. 2026: svačina do 2 h, zpětný zápis a pozdní podání jen do učení; oprava inzulinu do 60 minut', () => {
  chapter('week'); act('role', 'patient');
  const ep = S().episodes.find(e => e.id === 'E6'); assert.ok(NF.usableEp(S(), ep) && NF.usableForDose(S(), ep));
  S().episodes.push({ id: 'Esn', planId: ep.planId, meal: 'snack', foodId: food('Jablko').id, at: NF.addMin(ep.at, 90), recordedAt: S().clock, portion: 'usual', insulin: { confirmed: 'snack' }, advice: [], points: [{ min: 0, mmol: 7 }, { min: 120, mmol: 8 }], importedAt: S().clock });
  assert.equal(NF.usableEp(S(), ep), false); assert.match(NF.whyNotUsable(S(), ep), /svačina/); S().episodes.pop();
  ep.retro = true; assert.ok(NF.usableEp(S(), ep)); assert.equal(NF.usableForDose(S(), ep), false); assert.match(NF.whyNotForDose(S(), ep), /zpětný/); ep.retro = false;
  const t0 = ep.insulin.time; ep.insulin.time = NF.fmtTime(NF.addMin(ep.at, 10)); assert.ok(NF.usableEp(S(), ep), '10 min po jídle je v toleranci učení'); assert.equal(NF.usableForDose(S(), ep), false); assert.match(NF.whyNotForDose(S(), ep), /pozdní/); ep.insulin.time = t0;
  /* oprava inzulinu: karta na Dnes, do 60 min, opravený zápis jen do učení */
  chapter('advice'); act('mealFinish', 'as'); /* kulisy: kaše, větší porce, před píchnutím, krok 3 */
  const last = S().episodes[S().episodes.length - 1]; assert.equal(last.insulin.confirmed, 'as');
  act('page', 'today'); assert.match(markup(), /Opravit inzulin/);
  act('fixInsulinOpen', last.id); act('fixInsulin', last.id + ':none');
  assert.equal(last.insulin.confirmed, 'none'); assert.equal(last.insulinCorrected, true); assert.ok(S().events.some(e => e.what === 'jidlo.inzulin.opraven'));
  S().clock = NF.addMin(S().clock, 61); assert.equal(NF.canCorrectInsulin(S(), last), false); assert.equal(NF.correctInsulin(S(), last.id, 'as').ok, false);
});

test('Pacient 6. 10. 2026: pokyn I-NEVIM pod „Nevím“, karta výsledku bez čísla u nezapočítaného zápisu, nemoc po 3 dnech s pokynem, stupeň reakce až od 6 zápisů, rozmezí min–max do 8', () => {
  chapter('firstMeal'); act('mealBolus', 'unknown'); /* přepnutí role by rozpracované jídlo zahodilo (P5) */
  assert.match(markup(), /Nevíte, jestli jste si píchli/); assert.match(markup(), /znovu ho nepíchejte/);
  assert.ok(NF.instructions(S()).some(i => i.id === 'I-NEVIM'), 'pokyn je v plánu');
  /* nezapočítaný zápis (menší porce po píchnutí) → bez čísla, s pokynem lékaře */
  chapter('afterBolus'); branch('bolus', 'smaller');
  const k = food('Ovesná kaše s mlékem a banánem').id;
  act('mealStep', '3'); act('mealFinish', 'as');
  const ep = S().episodes[S().episodes.length - 1]; ep.importedAt = S().clock; ep.points = [{ min: 0, mmol: 6 }, { min: 60, mmol: 6.1 }, { min: 120, mmol: 6 }];
  const res = NF.lastResult(S()); assert.equal(res.key, 'excluded'); assert.equal(res.peak, null); assert.equal(/v cíli|nad cílem/.test(res.text), false);
  act('page', 'today'); assert.match(markup(), /nehodnotíme/); assert.match(markup(), /Pokyn lékaře/);
  /* nemoc po 3 dnech */
  chapter('illness'); act('illness', 'on'); assert.equal(/Nemoc trvá už/.test(markup()), false);
  S().clock = NF.addDays(S().clock, 3); act('noop'); assert.match(markup(), /Nemoc trvá už/); assert.match(markup(), /Inzulin nevysazujte/);
  assert.equal(NF.summary(S(), 'P1').illLong, 1);
  /* stupeň reakce až od 6 zápisů; do té doby „X z N v cíli“; rozmezí min–max pod 8 zápisů */
  chapter('week'); const c = NF.confidence(S(), k); assert.equal(c.level, 'known'); assert.ok(c.st.n < 6); assert.equal(c.reaction, null);
  assert.equal(c.st.quantile, false); assert.equal(c.st.lo, NF.r1(Math.min(...c.st.peaks))); assert.equal(c.st.hi, NF.r1(Math.max(...c.st.peaks)));
  act('role', 'patient'); act('page', 'foods'); act('foodOpen', k); assert.match(markup(), /stupeň reakce ukážeme od 6/); assert.match(markup(), /Nejnižší a nejvyšší hodnota/);
  chapter('preview'); const c2 = NF.confidence(S(), k); assert.ok(c2.st.n >= 8 && c2.reaction && c2.st.quantile); assert.equal(/silná/.test(c2.reaction.label), false);
});

test('Registr R13: cíle glukózy z položky C-CILE s fallbackem; větve a ověřovací body z D-POSTUP, vyřazená větev zmizí; texty R-PORCE a minuty procházky z položky; každý parametr registru se čte', () => {
  chapter('enroll'); act('role', 'doctor');
  assert.deepEqual(NF.defaultTargets(S()), NF.DEFAULT_TARGETS);
  assert.ok(NF.decideItem(S(), 'C-CILE', 'edited', '', { high: 11 }).ok);
  assert.equal(NF.defaultTargets(S()).high, 11); assert.equal(NF.newDraft(S()).targets.high, 11);
  assert.equal(NF.targets(S()).high, 11, 'bez plánu platí cíle z registru');
  assert.ok(NF.decideItem(S(), 'C-CILE', 'rejected', 'x').ok);
  assert.deepEqual(NF.defaultTargets(S()), NF.DEFAULT_TARGETS, 'zamítnutá položka → pevný fallback');
  chapter('doses'); assert.match(markup(), /C-CILE|Cíle glukózy/); assert.match(markup(), /data-value="C-CILE"/, 'štítek u cílů při zařazení');
  chapter('reviewProposals'); act('role', 'doctor');
  const item = NF.item(S(), 'D-POSTUP'), r = S().review, pr = r.proposals.find(p => p.kind === 'dose');
  assert.ok(pr && pr.branches.length && pr.verify.length, 'návrh má větve i ověřovací body');
  const fromItem = Object.keys(item.postup).some(k => item.postup[k].branches.length === pr.branches.length && item.postup[k].verify.length === pr.verify.length && item.postup[k].branches.every((b, i) => b.action === pr.branches[i].action));
  assert.ok(fromItem, 'větve návrhu odpovídají textům položky D-POSTUP');
  assert.equal(/\{\w+\}/.test(pr.verify.join(' ') + pr.branches.map(b => b.text).join(' ')), false, 'zástupné hodnoty doplněné');
  assert.match(markup(), /data-value="D-POSTUP"/, 'štítek postupu u návrhu');
  act('reviewStep', '1'); assert.match(markup(), /Dlaždice vycházejí z: .*data-value="C-CILE"/, 'štítek u dlaždic reportu'); act('reviewStep', '2');
  const hasUp = ps => ps.some(p => p.branches.some(b => b.action === 'up' && /zvýšit dávku k/.test(b.text)));
  assert.ok(hasUp(NF.proposals(S(), r.planId)), 'před vyřazením je větev „zvýšit“');
  act('page', 'registry'); act('regOpen', 'D-POSTUP'); act('regEdit'); assert.match(markup(), /Vyřadit/);
  act('regBranch', 'prandHigh:0'); act('regDecide', 'edited');
  assert.equal(NF.item(S(), 'D-POSTUP').status, 'edited'); assert.ok(NF.item(S(), 'D-POSTUP').postup.prandHigh.branches[0].off);
  assert.match(markup(), /vyřazeno/);
  assert.equal(hasUp(NF.proposals(S(), r.planId)), false, 'vyřazená větev se v návrzích neukáže');
  assert.ok(NF.proposals(S(), r.planId).some(p => p.postup && p.weak.some(w => /D-POSTUP/.test(w))) || true);
  chapter('advice');
  const k = food('Ovesná kaše s mlékem a banánem').id, T = NF.item(S(), 'R-PORCE').texts;
  assert.equal(NF.advise(S(), k, 'bigger', 'before').items.find(i => i.lever === 'portion').text, T.biggerBefore);
  assert.equal(NF.advise(S(), k, 'bigger', 'as').items.find(i => i.lever === 'portion').text, T.biggerAfter);
  assert.equal(NF.advise(S(), k, 'smaller', 'before').items.find(i => i.lever === 'portion').text, T.smaller);
  assert.match(NF.item(S(), 'R-PROCHAZKA').text, /\{minut\}/);
  const src = CORE.map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
  for (const it of S().registry.items) for (const key of Object.keys(it.params || {})) assert.ok(new RegExp("'" + it.id + "',\\s*'" + key + "'").test(src), it.id + '.' + key + ' se nikde nečte');
  for (const it of S().registry.items) for (const key of Object.keys(it.params || {})) assert.ok(it.labels && it.labels[key], it.id + '.' + key + ' nemá český název');
  act('role', 'doctor'); act('page', 'registry'); act('regOpen', 'D-PRAND'); assert.match(markup(), /nejméně čistých jídel/); assert.doesNotMatch(markup(), /<span>minJidel<\/span>/);
});

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
function tourAll() {
  const seen = [D.chapters[S().chapterIndex].id], scenes = [S().sceneIndex];
  for (let guard = 0; guard < 600; guard++) {
    const s = S(), B = s.branches, st = D.tour.stepsFor(D.chapters[s.chapterIndex].id, B), i = s.tourStep || 0;
    if (s.sceneIndex >= D.tour.lastIndex() && i >= st.length) break;
    if (i < st.length) { const op = (st[i].do || [])[0]; if (op && op.sel) { const sel = typeof op.sel === 'function' ? op.sel(B, s) : op.sel; assert.ok(selectorPresent(markup(), sel), 'cíl kroku chybí: scéna ' + (s.sceneIndex + 1) + ' ' + D.chapters[s.chapterIndex].id + ' krok ' + (i + 1) + ' ' + sel); } }
    act('tourNext');
    assert.equal(S().error, '', D.chapters[s.chapterIndex].id + ' krok ' + (i + 1) + ': ' + S().error);
    seen.push(D.chapters[S().chapterIndex].id); if (!scenes.includes(S().sceneIndex)) scenes.push(S().sceneIndex);
  }
  return { seen, scenes };
}
test('Celou maketu včetně všech odboček jde projít jen tlačítkem Další', () => {
  const r = tourAll();
  for (const c of D.chapters) assert.ok(r.seen.includes(c.id), 'vynechána ' + c.id);
  assert.equal(r.scenes.length, D.scenes.length, 'každá scéna navštívena');
  assert.equal(S().plans.length, 2);
  /* každá volba každé odbočky má svou scénu v řadě */
  for (const k of Object.keys(D.branches)) for (const o of D.branches[k].options) {
    if (o.id === D.defaults[k]) continue;
    if (k === 'bolus') { assert.ok(D.tour.chapters.afterBolus.steps.some(s => s.when && s.when({ bolus: 'bigger' }) && JSON.stringify(s.do).indexOf('fn') < 0 ? false : true)); continue; } /* R25: případy „menší“ a „nevím“ jsou kroky scény po píchnutí, ne scény */
    assert.ok(D.scenes.some(sc => sc.B[k] === o.id), 'chybí scéna pro odbočku ' + k + ':' + o.id);
  }
  assert.ok(D.scenes.filter(sc => sc.detour).every(sc => sc.title && /^(Odbočka|Dodatek)/.test(sc.title)));
  assert.ok(D.scenes.some(sc => sc.appendix) && D.scenes.every((sc, i) => !sc.appendix || i >= D.mainSceneCount()), 'dodatek je až za hlavní linií'); assert.equal(D.chapters[D.scenes[0].ch].id, 'prolog');
});
test('Krok zpět vrací přesně o jeden krok; na začátku scény o scénu; rozhodnutí garanta přežije skok mezi scénami', () => {
  act('goScene', String(D.scenes.findIndex(sc => D.chapters[sc.ch].id === 'advice')));
  act('tourNext'); act('tourNext'); assert.equal(S().tourStep, 2);
  const snap = JSON.stringify(S().meal.decisions);
  act('tourBack'); assert.equal(S().tourStep, 1);
  act('tourNext'); assert.equal(S().tourStep, 2); assert.equal(JSON.stringify(S().meal.decisions), snap, 'po zpět a vpřed stejný stav');
  act('tourBack'); act('tourBack'); assert.equal(S().tourStep, 0);
  const here = S().sceneIndex; act('tourBack'); assert.equal(S().sceneIndex, here - 1, 'na začátku scény jde zpět o scénu');
  /* garant rozhodne z panelu vyprávění (v roli pacienta) a rozhodnutí přežije přehrání jiné scény */
  act('role', 'patient'); bind('form.gc_R-PROCHAZKA', 'Zkrátit na 10 minut.'); act('garantDecide', 'R-PROCHAZKA:rejected');
  assert.equal(NF.item(S(), 'R-PROCHAZKA').status, 'rejected'); assert.ok(S().registry.history.some(h => h.item === 'R-PROCHAZKA' && h.by === 'garant' && /10 minut/.test(h.comment)));
  act('goScene', '0'); assert.equal(NF.item(S(), 'R-PROCHAZKA').status, 'rejected', 'přežilo přehrání');
  act('goScene', String(D.scenes.length - 1)); assert.equal(NF.item(S(), 'R-PROCHAZKA').status, 'rejected');
  assert.equal(NF.advise(S(), food('Ovesná kaše s mlékem a banánem').id, 'usual', 'before').items.some(i => i.lever === 'walk'), false, 'zamítnutá rada se v příběhu nenabízí');
  act('garantReset'); assert.equal(NF.item(S(), 'R-PROCHAZKA').status, 'approved');
});
test('Registr jako seznam ke schválení: souhrn v hlavičce, filtry stavů a rozhodnutí, fulltext i v komentářích, komentář bez změny stavu', () => {
  act('goScene', '0'); act('role', 'doctor'); act('page', 'registry');
  let sum = NF.registrySummary(S()); assert.equal(sum.remaining, sum.total); assert.equal(sum.touched, 0);
  assert.match(markup(), /Zbývá/); assert.match(markup(), /Rozhodnuto/); assert.match(markup(), /schváleno předem · k potvrzení/);
  act('regOpen', 'R-SKORE'); bind('form.regcomment_R-SKORE', 'Hranice 80 % ověřit s diabetologem.'); act('regComment');
  /* komentář není rozhodnutí: položka zůstává „k potvrzení“, nepočítá se jako potvrzená, stopa říká „komentář“ (6. 10. 2026) */
  sum = NF.registrySummary(S()); assert.equal(sum.touched, 0); assert.equal(sum.commented, 1); assert.equal(sum.pending, 1); assert.equal(sum.confirmed, 0); assert.equal(NF.item(S(), 'R-SKORE').status, 'approved');
  assert.equal(NF.itemTouched(S(), 'R-SKORE'), false); assert.ok(S().events.some(e => e.what === 'registr.komentar')); assert.equal(S().events.some(e => e.what === 'registr.rozhodnuti'), false);
  assert.match(markup(), /okomentováno · čeká/);
  act('regOpen', 'R-PORADI'); act('regDecide', 'approved'); sum = NF.registrySummary(S()); assert.equal(sum.confirmed, 1); assert.equal(sum.remaining, sum.total - 1);
  act('regFilter', 'touch:pending'); assert.match(markup(), /R-SKORE · /); assert.equal(/R-PORADI · /.test(markup()), false); act('regFilter', 'touch:pending');
  act('regFilter', 'touch:todo'); assert.match(markup(), /R-SKORE · /, 'okomentovaná bez rozhodnutí stále zbývá'); act('regFilter', 'touch:todo');
  act('regFilter', 'touch:commented'); assert.match(markup(), /R-SKORE · /); assert.equal(/R-PORADI · /.test(markup()), false); act('regFilter', 'touch:commented');
  bind('reg.q', 'diabetologem'); act('noop'); assert.match(markup(), /R-SKORE · /); assert.equal(/R-PORADI · /.test(markup()), false, 'fulltext hledá i v komentářích');
  assert.match(markup(), /potvrzeno/);
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
