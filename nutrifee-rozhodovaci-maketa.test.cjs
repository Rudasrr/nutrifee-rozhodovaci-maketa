/* Testuje skutečnou logiku makety v izolovaném prostředí.
   Nenahrazuje ověření v prohlížeči. Spuštění: node nutrifee-rozhodovaci-maketa.test.cjs */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, 'nutrifee-rozhodovaci-maketa.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
assert.ok(scripts.length >= 8, 'HTML musí načítat jádro i demonstrační vrstvu');

const CORE = scripts.filter(s => s.startsWith('app/'));
const DEMO = scripts.filter(s => s.startsWith('demo/'));

let ctx, app, NF, D, elements, store;

function boot({ withDemo = true } = {}) {
  elements = new Map();
  store = new Map();
  const el = id => {
    if (!elements.has(id)) {
      elements.set(id, {
        innerHTML: '', focus() { }, querySelector() { return null; }, querySelectorAll() { return []; }
      });
    }
    return elements.get(id);
  };
  const sandbox = {
    console,
    document: {
      getElementById: el,
      addEventListener() { },
      querySelectorAll() { return []; },
      createElement() { return { click() { }, setAttribute() { }, appendChild() { }, querySelector() { return null; } }; },
      activeElement: null
    },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v) },
    setTimeout() { return 1; }, clearTimeout() { }, print() { },
    Blob: class { constructor() { } }, URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() { } }
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  ctx = vm.createContext(sandbox);
  const files = withDemo ? [...CORE, ...DEMO] : CORE;
  for (const f of files) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f });
  }
  app = ctx.NutriFeeApp;
  NF = ctx.NutriFee;
  D = ctx.NutriFeeDemo;
}

const S = () => app.getState();
const act = (a, v) => app.act(a, v);
const bind = (k, v) => app.bind(k, v);
const markup = () => elements.get('app').innerHTML;
const chapter = id => {
  const i = D.indexOf(id);
  assert.ok(i >= 0, 'neznámá kapitola ' + id);
  act('goChapter', String(i));
  act('closeDrawer');
};
const branch = (k, v) => { act('setBranch', k + ':' + v); act('closeDrawer'); };

let passed = 0, failed = 0;
const fails = [];
function test(name, fn) {
  try { boot(); fn(); console.log('OK  ', name); passed++; }
  catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); }
}

/* ---------- příběh začíná u lékaře v ordinaci ---------- */
test('Příběh začíná v ordinaci u lékaře, ne u pacienta', () => {
  assert.equal(S().chapterIndex, 0);
  assert.equal(D.chapters[0].id, 'enroll');
  assert.equal(D.chapters[0].role, 'doctor');
  assert.equal(S().role, 'doctor');
  assert.match(markup(), /Zařazení pacienta/);
  assert.equal(S().activePlanId, null);
  assert.equal(NF.activeTask(S()), null);
});

test('Pacient na začátku nemá co vyplňovat ani potvrzovat', () => {
  act('role', 'patient');
  const m = markup();
  assert.match(m, /Plán zatím nebyl vydán/);
  assert.match(m, /Plán vydává lékař/);
  assert.equal(/Začít úkol/.test(m), false, 'žádný pacientský krok před lékařem');
});

test('Pořadí dějství drží ordinaci před domovem', () => {
  const ids = D.chapters.map(c => c.id);
  const order = ['enroll', 'training', 'plan', 'handover', 'understanding', 'firstMeal'];
  let last = -1;
  for (const id of order) {
    const i = ids.indexOf(id);
    assert.ok(i > last, 'kapitola ' + id + ' je mimo pořadí');
    last = i;
  }
  assert.equal(D.acts.length, 6);
  const act0 = D.chapters.filter(c => c.act === 0);
  assert.equal(act0[0].role, 'doctor');
  assert.equal(act0[1].role, 'doctor');
  assert.equal(act0[2].role, 'doctor');
});

/* ---------- zařazení a zaučení ---------- */
test('Bez způsobilosti se nepokračuje a plán se nevydá', () => {
  const r = NF.issuePlan(S(), 'doctor');
  assert.equal(r.ok, false);
  assert.match(r.error, /způsobilosti/);
  assert.equal(S().enrollment.eligible, false);
  act('eligibility', 'adult');
  assert.equal(S().enrollment.eligible, false, 'jedno kritérium nestačí');
  for (const c of NF.ELIGIBILITY.slice(1)) act('eligibility', c[0]);
  assert.equal(S().enrollment.eligible, true);
});

test('Zaučení nelze označit za dokončené, dokud některý bod chybí', () => {
  chapter('training');
  boot();
  act('goChapter', String(D.indexOf('training')));
  act('closeDrawer');
  S().training.steps = {};
  S().training.result = null;
  act('finishTraining', 'done');
  assert.match(S().error, /dokud některý bod chybí/);
  assert.equal(S().training.result, null);
  for (const t of NF.TRAINING) act('trainingStep', t[0]);
  act('finishTraining', 'done');
  assert.equal(S().training.result, 'done');
});

test('Nezvládnuté zaučení je slepá ulička — plán ani úkol nevzniknou', () => {
  chapter('plan');
  branch('training', 'failed');
  assert.equal(S().training.result, 'failed');
  const r = NF.issuePlan(S(), 'doctor');
  assert.equal(r.ok, false);
  assert.match(r.error, /zaučení/);
  chapter('firstMeal');
  assert.equal(S().activePlanId, null, 'příběh dál nepokračuje');
  assert.equal(NF.activeTask(S()), null);
});

test('Vydání plánu vyžaduje všechny náležitosti', () => {
  chapter('plan');
  assert.equal(NF.activePlan(S()), null);
  act('issuePlan');
  assert.match(S().error, /ověření modelového seznamu léčby|bezpečnostní a kontaktní plán/);
  bind('draft.medicationChecked', true);
  act('issuePlan');
  assert.match(S().error, /bezpečnostní a kontaktní plán/);
  bind('draft.safetyChecked', true);
  act('issuePlan');
  assert.equal(S().activePlanId, 'P1');
  assert.equal(S().role, 'patient', 'po vydání se předává pacientovi');
});

/* ---------- pacient nevydá plán ---------- */
test('Pacient nevydá plán a nevydaný plán neaktivuje úkol', () => {
  const r = NF.issuePlan(S(), 'patient');
  assert.equal(r.ok, false);
  assert.match(r.error, /vydává lékař/);
  assert.equal(S().activePlanId, null);
  const u = NF.confirmUnderstanding(S());
  assert.equal(u.ok, false);
  assert.equal(S().tasks.length, 0, 'úkol vzniká až výběrem z katalogu u lékaře');
});

test('Úkol se aktivuje až po ověření porozumění v ordinaci', () => {
  chapter('handover');
  assert.equal(S().activePlanId, 'P1');
  assert.equal(NF.activeTask(S()), null, 'převzetí samo úkol neaktivuje');
  act('page', 'understand');
  act('answerCheck', 'no');
  act('confirmUnderstanding');
  assert.equal(NF.activeTask(S()).id, 'T1');
});

/* ---------- v ordinaci se nic nevypisuje ---------- */
test('V ordinaci není jediné pole k vypisování', () => {
  for (const id of ['enroll', 'training', 'plan']) {
    chapter(id);
    const m = markup();
    assert.equal(/<textarea/.test(m), false, 'textarea v kroku ' + id);
    assert.equal(/<input(?![^>]*type="checkbox")/.test(m), false, 'textové pole v kroku ' + id);
  }
});

test('Lékař ani pacient v celém příběhu nepíšou v ordinaci', () => {
  for (let i = 0; i < D.indexOf('firstMeal'); i++) {
    act('goChapter', String(i)); act('closeDrawer');
    for (const role of ['patient', 'doctor']) {
      act('role', role);
      assert.equal(/<textarea/.test(markup()), false, D.chapters[i].id + '/' + role);
    }
  }
});

test('Kontext pacienta se zobrazuje, nevyplňuje', () => {
  chapter('enroll');
  const m = markup();
  assert.match(m, /Diabetes 2\. typu/);
  assert.match(m, /CGM zaveden/);
  assert.match(m, /Údaje z karty/);
  assert.equal(S().enrollment.compensation, null, 'kompenzace není předvybraná');
  act('setCompensation', 'insufficient');
  assert.equal(S().enrollment.compensation, 'insufficient');
});

test('Úkoly jsou předdefinované a lékař je jen vybírá', () => {
  chapter('plan');
  assert.ok(D.taskCatalog.length >= 3, 'katalog má víc než jednu položku');
  assert.match(markup(), /Úkol z katalogu/);
  for (const c of D.taskCatalog) assert.match(markup(), new RegExp(c.title.replace(/[.]/g, '\\.')));
  assert.equal(S().tasks[0].catalogId, 'T-SNIDANE');
  act('selectTask', 'T-SNIDANE');
  assert.equal(S().tasks[0].catalogId, 'T-SNIDANE');
  assert.equal(S().tasks[0].question, D.taskCatalog[0].question, 'otázka pacienta patří k úkolu, nepíše se');
});

test('Úkol s neschváleným pravidlem nelze přiřadit', () => {
  chapter('plan');
  const vecere = D.taskCatalog.find(c => c.id === 'T-VECERE');
  assert.equal(NF.isRuleUsable(S(), vecere.ruleId), false);
  act('selectTask', 'T-VECERE');
  assert.match(S().error, /nemá modelově schválenou verzi/);
  assert.equal(S().tasks[0].catalogId, 'T-SNIDANE', 'původní úkol zůstává');
  assert.match(markup(), /čeká na schválení garantem, nelze přiřadit/);
});

test('Bez vybraného úkolu nelze plán vydat', () => {
  chapter('plan');
  S().tasks = [];
  S().draft.taskId = null;
  const r = NF.issuePlan(S(), 'doctor');
  assert.equal(r.ok, false);
  assert.match(r.error, /úkol/);
});

test('Lékař vybírá důvod rozhodnutí z připravených, nepíše jej', () => {
  chapter('decide');
  const m = markup();
  assert.equal(/<textarea/.test(m), false, 'žádné psaní důvodu');
  assert.ok(D.decisionReasons.length >= 2);
  act('pickReason', D.decisionReasons[1]);
  assert.equal(S().form.reason, D.decisionReasons[1]);
});

/* ---------- determinismus příběhu ---------- */
test('Skok na kapitolu je deterministický', () => {
  for (let i = 1; i < D.chapters.length; i++) {
    const a = D.play(i, null);
    const b = D.play(i, null);
    assert.equal(JSON.stringify(a.episodes), JSON.stringify(b.episodes), 'kapitola ' + i);
    assert.equal(a.plans.length, b.plans.length);
    assert.equal(a.tasks.map(t => t.state).join(), b.tasks.map(t => t.state).join());
  }
});

test('Každá kapitola se vykreslí ve své roli', () => {
  for (let i = 0; i < D.chapters.length; i++) {
    act('goChapter', String(i));
    act('closeDrawer');
    assert.equal(S().role, D.chapters[i].role, 'role u kapitoly ' + D.chapters[i].id);
    assert.ok(markup().length > 400, 'kapitola ' + D.chapters[i].id + ' se nevykreslila');
  }
});

/* ---------- pravidla ---------- */
test('Neschválená v2 nenahradí v1 a neovlivní aktivní úkol', () => {
  chapter('catalog');
  assert.equal(S().rules.find(r => r.version === 'v2').status, 'draft');
  assert.equal(NF.activeTask(S()).ruleVersion, 'v1');
  act('approveRule', 'R-SNIDANE|v2');
  assert.match(S().error, /testovací příklady/);
  assert.equal(S().rules.find(r => r.version === 'v2').status, 'draft');
  bind('ruleExamples.R-SNIDANE|v2', true);
  act('approveRule', 'R-SNIDANE|v2');
  assert.equal(S().rules.find(r => r.version === 'v2').status, 'approved');
  assert.equal(NF.activeTask(S()).ruleVersion, 'v1', 'schválení v2 samo nepřepne běžící úkol');
});

test('Vyřazení v1 pozastaví úkol a nezmění předpis', () => {
  chapter('catalog');
  const before = NF.activePlan(S()).prescription;
  act('openRetire', 'R-SNIDANE|v1');
  act('retireRule', 'R-SNIDANE|v1');
  const t = S().tasks[0];
  assert.equal(t.state, 'paused');
  assert.equal(t.pauseReason, 'rule');
  assert.equal(NF.activePlan(S()).prescription, before, 'vyřazení pravidla nemění inzulin');
  const r = NF.resumeTask(S(), 'doctor', 'zkouška');
  assert.equal(r.ok, false, 'nelze obnovit bez použitelné verze pravidla');
});

test('Schválení pravidla nevydá nový plán', () => {
  chapter('impact');
  const plansBefore = S().plans.length;
  act('role', 'garant');
  bind('ruleExamples.R-SNIDANE|v2', true);
  act('approveRule', 'R-SNIDANE|v2');
  assert.equal(S().plans.length, plansBefore);
});

/* ---------- žádná dávka ---------- */
test('Žádná větev nevypočítá ani nezmění dávku', () => {
  const texts = [];
  for (let i = 0; i < D.chapters.length; i++) {
    act('goChapter', String(i)); act('closeDrawer');
    for (const role of ['patient', 'doctor', 'garant']) { act('role', role); texts.push(markup()); }
  }
  assert.equal(/\d+\s*(j\.|IU|jednotek|jednotky)\b/.test(texts.join(' ')), false, 'nikde nesmí být číselná dávka inzulinu');
  chapter('result');
  assert.equal(S().plans.length, 2);
  assert.equal(S().plans[1].prescription, S().plans[0].prescription, 'P2 nese stejný text předpisu');
});

/* ---------- změnová rada ---------- */
test('Podaný nebo neznámý bolus neumožní změnovou radu', () => {
  chapter('firstMeal');
  assert.equal(NF.adviceAllowed(S(), 'after').allowed, false);
  assert.equal(NF.adviceAllowed(S(), 'unknown').allowed, false);
  assert.match(NF.adviceAllowed(S(), 'unknown').why, /před podáním bolusu/);
});

test('Samotné „před bolusem“ bez oprávnění v plánu radu neumožní', () => {
  chapter('firstMeal');
  const res = NF.adviceAllowed(S(), 'before');
  assert.equal(res.allowed, false);
  assert.match(res.why, /nepovoluje|pozorovací/);
  NF.activePlan(S()).allowChange = true;
  assert.equal(NF.adviceAllowed(S(), 'before').allowed, false, 'i s povolením musí být změnový úkol');
});

/* ---------- úplnost epizod ---------- */
test('Chybějící kontext a senzorová mezera nevytvoří úplnou epizodu ani nulu', () => {
  chapter('compare');
  const c = NF.countEpisodes(S());
  assert.equal(c.recorded, 3);
  assert.equal(c.complete, 2, 'E2 bez údaje o inzulinu není úplná');
  const e2 = S().episodes.find(x => x.id === 'E2');
  assert.equal(JSON.stringify(NF.episodeStatus(e2).missing), JSON.stringify(['údaj o inzulinu a jeho čase']));
  const m = markup();
  assert.match(m, /3 zaznamenané průběhy/);
  assert.match(m, /Nevíme, co rozdíl způsobilo/);
  assert.equal(/0 z 3|Překážky/.test(m), false, 'žádná domyšlená nula');
});

test('Odbočka „málo podkladů“ zůstane bez věcného závěru', () => {
  chapter('compare');
  branch('evidence', 'thin');
  const c = NF.countEpisodes(S());
  assert.equal(c.recorded, 3);
  assert.equal(c.complete, 1, 'E2 chybí kontext, E3 chybí senzorová data');
  const e3 = S().episodes.find(x => x.id === 'E3');
  assert.equal(JSON.stringify(NF.episodeStatus(e3).missing), JSON.stringify(['senzorová data po jídle']));
  assert.equal(e3.points.every(p => p.mmol === null), true, 'náhradní průběh se nedoplňuje');
  act('role', 'patient'); act('page', 'compare');
  assert.match(markup(), /Úkol zatím nemůžeš uzavřít věcným závěrem/);
});

test('Zápis epizody vyžaduje volbu o inzulinu, „nevím“ je legitimní', () => {
  chapter('firstMeal');
  const before = S().episodes.length;
  act('saveEpisode');
  assert.match(S().error, /jak to bylo s inzulinem/);
  assert.equal(S().episodes.length, before);
  act('formSet', 'insulinReported:per-plan');
  act('saveEpisode');
  assert.match(S().error, /[Dd]oplň čas podání/);
  act('formSet', 'insulinReported:unknown');
  act('saveEpisode');
  assert.equal(S().episodes.length, before + 1);
  assert.equal(NF.episodeStatus(S().episodes[before]).complete, false);
});

/* ---------- nemoc a výpadek ---------- */
test('Nemoc oznamuje člověk, pozastaví úkol a nic se neodesílá', () => {
  chapter('disruption');
  assert.equal(S().illness, null, 'na začátku scény nemoc ještě nenastala');
  assert.equal(S().tasks[0].state, 'active');
  act('unclear', 'ill');
  act('reportIllness');
  assert.equal(S().illness.active, true);
  assert.equal(S().illness.reportedBy, 'pacient');
  assert.equal(S().tasks[0].state, 'paused');
  act('page', 'today');
  assert.match(markup(), /pozastaven/i);
  assert.equal(/odesláno lékaři|ordinace informována/.test(markup()), false);
});

test('Obnova dat nezruší nemoc ani pauzu', () => {
  chapter('disruption');
  act('unclear', 'ill');
  act('reportIllness');
  NF.restoreData(S());
  assert.equal(S().dataState.gap, false);
  assert.equal(S().tasks[0].state, 'paused', 'návrat dat neobnoví úkol');
  assert.equal(S().illness.active, true, 'návrat dat neukončí nemoc');
  const r = NF.resumeTask(S(), 'doctor', 'x');
  assert.equal(r.ok, false);
  assert.match(r.error, /nemoci/);
});

test('Výpadek dat rozlišuje tři příčiny a žádnou neuhodne', () => {
  for (const [b, re] of [['gap-vendor', /Chybí data jen nám/], ['gap-broken', /Náhradní postup/], ['gap-unknown', /Příčinu neurčujeme/]]) {
    boot();
    chapter('disruption');
    branch('disruption', b);
    act('role', 'patient'); act('page', 'datastate');
    assert.match(markup(), re, 'větev ' + b);
    assert.equal(S().dataState.gap, true, 'mezera zůstává mezerou');
    assert.equal(NF.episodeStatus(S().episodes.find(x => x.id === 'E4')).complete, false);
  }
});

test('Lékař obnoví úkol až po ověření plánu', () => {
  chapter('resume');
  assert.equal(S().tasks[0].state, 'paused', 'na začátku scény je úkol pozastavený');
  const blocked = NF.resumeTask(S(), 'doctor', 'x');
  assert.equal(blocked.ok, false, 'dokud trvá nemoc, obnovit nelze');
  act('endIllness');
  act('resumeTask');
  assert.equal(S().tasks[0].state, 'active');
  assert.ok(S().tasks[0].resumeReason);
  chapter('catalog');
  assert.equal(S().tasks[0].state, 'active', 'po odehrání scény je úkol obnovený');
});

/* ---------- offline ---------- */
test('Offline simulace nepotvrdí doručení odvolaného pravidla', () => {
  chapter('impact');
  branch('offline', 'offline');
  assert.equal(S().ruleDelivery, 'unconfirmed');
  act('role', 'garant'); act('page', 'catalog');
  assert.match(markup(), /nepotvrzeno/);
  act('role', 'patient'); act('page', 'today');
  assert.match(markup(), /[Ss]imulovaný offline/);
});

test('Bezpečnostní plán je dostupný i offline s datem verze', () => {
  chapter('impact');
  branch('offline', 'offline');
  act('role', 'patient'); act('page', 'safety');
  const m = markup();
  assert.match(m, /BP-v1/);
  assert.match(m, /simulovaný offline režim/);
  assert.match(m, /schválí klinický garant/);
});

test('Pacient vidí pozastavený úkol s důvodem a bez pokynu k inzulinu', () => {
  chapter('impact');
  act('role', 'patient'); act('page', 'today');
  const m = markup();
  assert.match(m, /vyřazeno z dalšího použití/);
  assert.match(m, /předpis se nemění a inzulin se nevysazuje/);
});

/* ---------- kontrola a nový plán ---------- */
test('Jedna stránka drží pevné pořadí částí ve všech odbočkách', () => {
  for (const v of ['base', 'A', 'A0', 'B']) {
    boot();
    chapter('onepage');
    branch('review', v);
    act('role', 'doctor'); act('page', 'onepage');
    const m = markup();
    const order = ['Bezpečnostní události a úplnost dat', 'Platný plán a zaznamenané odchylky',
      'Modelové cíle, TIR a čas pod rozmezím', 'Kontextové nálezy', 'Hlavní otázka pacienta'];
    let last = -1;
    for (const part of order) {
      const i = m.indexOf(part);
      assert.ok(i > last, 'část „' + part + '“ mimo pořadí v odbočce ' + v);
      last = i;
    }
  }
});

test('Prázdný deník umožní dokončit kontrolu bez vymyšlených nálezů', () => {
  chapter('onepage');
  branch('review', 'A');
  assert.equal(S().episodes.length, 0);
  act('role', 'doctor'); act('page', 'onepage');
  const m = markup();
  assert.match(m, /Kontext jídel nebyl zaznamenán/);
  assert.equal(/adherence|nespolupracuje|selhal/i.test(m), false);
  assert.match(m, /62 %/, 'senzorový souhrn zůstává dostupný');
  act('page', 'decide'); act('formSet', 'choice:unchanged'); act('issueP2');
  assert.equal(S().plans.length, 2, 'kontrolu lze dokončit');
});

test('Bez senzorového souhrnu se zobrazí „nelze vyhodnotit“, ne nuly', () => {
  chapter('onepage');
  branch('review', 'A0');
  act('role', 'doctor'); act('page', 'onepage');
  const m = markup();
  assert.match(m, /nelze vyhodnotit/);
  assert.equal(/>0 %/.test(m), false);
});

test('Historická bezpečnostní událost má zdroj a nehodnotí závažnost', () => {
  chapter('onepage');
  branch('review', 'B');
  act('role', 'doctor'); act('page', 'onepage');
  const m = markup();
  assert.match(m, /zpětně nahlásil pacient/);
  assert.match(m, /nezachytila v reálném čase/);
  assert.equal(/závažná nežádoucí|klasifikováno jako/i.test(m), false);
});

test('Aktuální problém během návštěvy přepne do bezpečnostního stavu', () => {
  chapter('onepage');
  branch('review', 'C');
  act('role', 'doctor'); act('page', 'onepage');
  assert.match(markup(), /kontrola je přerušená/i);
  assert.equal(/62 %/.test(markup()), false, 'běžná kontrola se nezobrazuje');
  act('resumeVisit');
  assert.match(markup(), /Jednostránkový podklad/);
});

test('Dávkový podklad nemá číslo a není v pacientské roli', () => {
  chapter('onepage');
  act('openAside', 'dose');
  act('setDoseVariant', 'numeric');
  assert.match(markup(), /\[číselný obsah musí dodat a schválit garant\]/);
  act('role', 'patient');
  assert.equal(/číselný obsah musí dodat/.test(markup()), false, 'pacient dávkový podklad nevidí');
});

test('P2 nepřepíše historii P1 ani jeho epizody', () => {
  chapter('decide');
  const eps = S().episodes.map(x => ({ id: x.id, planId: x.planId }));
  act('issueP2');
  assert.equal(S().activePlanId, 'P2');
  assert.equal(S().plans.length, 2);
  assert.equal(S().plans[0].id, 'P1');
  assert.equal(JSON.stringify(S().episodes.map(x => ({ id: x.id, planId: x.planId }))), JSON.stringify(eps));
  assert.equal(NF.planById(S(), 'P2').previousId, 'P1');
});

test('Rozhodnutí „zatím nelze rozhodnout“ nevydá nový plán', () => {
  chapter('decide');
  act('formSet', 'choice:defer');
  act('issueP2');
  assert.equal(S().plans.length, 1);
  assert.match(S().error, /nelze rozhodnout/);
});

test('Pacient převezme P2 a staré epizody zůstanou u P1', () => {
  chapter('newplan');
  assert.equal(S().activePlanId, 'P2');
  assert.match(markup(), /Léčba v modelové ukázce beze změny/);
  act('confirmUnderstanding');
  assert.equal(NF.activeTask(S()).id, 'T2');
  assert.equal(S().episodes.every(e => e.planId === 'P1'), true);
});

test('Výsledek demonstrace nic nepředvybírá a netvrdí úsporu minut', () => {
  chapter('result');
  act('role', 'doctor'); act('page', 'result');
  assert.equal(S().decisions.helped, undefined);
  assert.equal(/dvou minut|úspora 2/.test(markup()), false);
  act('setHelped', 'partly');
  assert.equal(S().decisions.helped, 'partly');
});

/* ---------- reset ---------- */
test('Reset vrátí začátek příběhu a odstraní změny běhu', () => {
  chapter('compare');
  bind('notes', 'poznámka z demonstrace');
  act('decide', 'katalog:yes');
  act('resetDemo');
  const after = S();
  assert.equal(after.chapterIndex, 0);
  assert.equal(after.role, 'doctor');
  assert.equal(after.activePlanId, null);
  assert.equal(after.episodes.length, 0);
  assert.equal(after.notes, '');
  assert.equal(Object.keys(after.decisions).length, 0);
  assert.equal(after.branches.training, 'done');
});

/* ---------- oddělení průvodce a demonstrační vrstvy ---------- */
test('Bez načtené vrstvy průvodce nevznikne v DOM žádná kotva', () => {
  boot({ withDemo: false });
  assert.equal(ctx.NutriFeeGuide, undefined);
  const m = elements.get('app').innerHTML;
  assert.equal(/data-guide/.test(m), false);
  assert.equal(/guide-marker/.test(m), false);
  assert.equal(/DEMO · syntetická data/.test(m), false, 'demo lišta patří do demonstrační vrstvy');
  assert.ok(m.length > 200, 'jádro se vykreslí i bez demonstrační vrstvy');
});

test('Vypnutý průvodce neponechá kotvy ani vysvětlení', () => {
  chapter('compare');
  ctx.NutriFeeGuide.set(false);
  const off = markup();
  assert.equal(/data-guide/.test(off), false);
  ctx.NutriFeeGuide.set(true);
  assert.match(markup(), /data-guide/);
  ctx.NutriFeeGuide.set(false);
  assert.equal(markup(), off, 'vypnutí vrátí přesně původní rozložení');
});

test('Texty průvodce se neobjeví v běžném pacientském výstupu', () => {
  chapter('compare');
  ctx.NutriFeeGuide.set(true);
  act('role', 'patient');
  const m = markup();
  const C = ctx.NutriFeeGuideContent;
  for (const key of Object.keys(C.topics)) {
    const t = C.topics[key];
    if (t.why) assert.equal(m.includes(t.why), false, 'obhajoba návrhu unikla: ' + key);
    if (t.decide) assert.equal(m.includes(t.decide), false, 'otázka pro garanta unikla: ' + key);
  }
  assert.equal(/Zásada ze zadání|Návrh k posouzení|Otevřené rozhodnutí/.test(m), false);
});

test('Průvodce má u každého tématu úroveň a otevírá se akcí', () => {
  const C = ctx.NutriFeeGuideContent;
  const keys = Object.keys(C.topics);
  assert.ok(keys.length >= 30);
  for (const k of keys) {
    assert.ok(C.levels[C.topics[k].level], 'chybí úroveň u ' + k);
    assert.ok(C.topics[k].what && C.topics[k].what.length > 20, 'chybí „co zde uživatel vidí“ u ' + k);
  }
  ctx.NutriFeeGuide.set(true);
  act('guideOpen', 'today-counts');
  assert.equal(NF.currentDrawer(), 'guide:today-counts');
  const panel = ctx.NutriFeeGuide.panelHtml('today-counts');
  assert.match(panel, /Co zde uživatel dělá nebo vidí/);
  assert.match(panel, /Proč je to navrženo právě takto/);
  assert.match(panel, /data-action="closeDrawer"/);
});

test('Průvodce pokrývá všechna povinná témata včetně ordinace', () => {
  const C = ctx.NutriFeeGuideContent;
  const required = ['enroll-context', 'enroll-compensation', 'enroll-eligibility', 'task-catalog', 'training-steps', 'today-primary', 'task-done', 'today-counts',
    'compare-list', 'onepage-2', 'onepage-3', 'today-unsure', 'safety-sections', 'datastate-cause',
    'onepage-1', 'newplan-diff', 'rule-approved', 'rule-retired', 'dose-basis', 'decision-samotitrace',
    'participation-end', 'edge-case', 'resume-conditions'];
  for (const r of required) assert.ok(C.topics[r], 'chybí téma průvodce: ' + r);
});

test('Tiskový podklad skryje průvodce a ponechá označení demonstrace', () => {
  const demoCss = fs.readFileSync(path.join(__dirname, 'demo/demo.css'), 'utf8');
  const printBlock = demoCss.slice(demoCss.indexOf('@media print'));
  assert.match(printBlock, /\.guide-marker[^{]*\{[^}]*display:none/);
  assert.match(printBlock, /#overlay/);
  assert.match(printBlock, /DEMO · syntetická data · není určeno pro léčbu/);
});

test('Produkční sestavení se obejde bez složky demo', () => {
  assert.equal(DEMO.every(s => s.startsWith('demo/')), true);
  assert.equal(CORE.every(s => s.startsWith('app/')), true);
  for (const f of CORE) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    assert.equal(/require\(|NutriFeeGuideContent\.topics|D\.chapters|D\.play\(/.test(src), false,
      'jádro nesmí záviset na obsahu demonstrační vrstvy: ' + f);
  }
});

/* ---------- okrajové stavy ---------- */
test('Okrajové situace mají stav, další krok i odpovědnou roli', () => {
  for (const ec of D.edgeCases) {
    act('setEdge', ec.id);
    const m = markup();
    assert.match(m, new RegExp(ec.title.split(' ')[0]));
    assert.match(m, /Co se změnilo, co lze dál dělat a kdo řeší další krok/);
  }
  assert.equal(D.edgeCases.length, 10);
});

test('Ukončení účasti zastaví úkoly a nevyvozuje závěr z neaktivity', () => {
  chapter('compare');
  act('endParticipation', 'ended');
  assert.equal(S().tasks.every(t => t.state === 'cancelled'), true);
  act('role', 'patient'); act('page', 'today');
  assert.match(markup(), /Účast je ukončená/);
});

test('Rozhodovací list je výchozí nerozhodnuto a nic nepředvybírá', () => {
  act('openAside', 'decisions');
  const m = markup();
  assert.match(m, /Výchozí stav je nerozhodnuto/);
  assert.equal(Object.keys(S().decisions).length, 0);
  assert.equal(D.decisionList.length, 7);
  act('decide', 'pilot:change');
  assert.equal(S().decisions.pilot, 'change');
});

test('Koncept samotitrace je mimo běžný pacientský průchod', () => {
  act('openAside', 'protocol');
  assert.match(markup(), /Neschválený koncept/);
  act('conceptIllness');
  assert.match(markup(), /[Nn]ení vypočtena (žádná )?změna inzulinu/);
  act('role', 'patient'); act('page', 'today');
  assert.equal(/k doplnění garantem/.test(markup()), false);
  act('role', 'garant'); act('page', 'protocol');
  act('openConcept');
  assert.match(markup(), /Neschválený koncept — není aktivní/);
  act('decide', 'samotitrace:defer');
  assert.equal(S().decisions.samotitrace, 'defer');
});

/* ---------- obecné hranice ---------- */
test('Nikde se netvrdí odeslání zprávy ani průběžný dohled', () => {
  const bad = /zpráva odeslána|odesláno ordinaci|ordinace informována|lékař upozorněn|sledujeme vás/i;
  for (let i = 0; i < D.chapters.length; i++) {
    act('goChapter', String(i)); act('closeDrawer');
    for (const role of ['patient', 'doctor', 'garant']) {
      act('role', role);
      assert.equal(bad.test(markup()), false, 'kapitola ' + D.chapters[i].id + '/' + role);
    }
  }
});

test('Demo označení zůstává viditelné ve všech kapitolách a rolích', () => {
  for (let i = 0; i < D.chapters.length; i++) {
    act('goChapter', String(i)); act('closeDrawer');
    for (const role of ['patient', 'doctor', 'garant']) {
      act('role', role);
      assert.match(markup(), /DEMO · syntetická data · není určeno pro léčbu/, D.chapters[i].id + '/' + role);
    }
  }
});

test('Grafy mají jednotky, popisky os a textový souhrn', () => {
  chapter('onepage');
  act('role', 'doctor'); act('page', 'evidence'); act('setEvidence', 'E1');
  const m = markup();
  assert.match(m, /mmol\/l/);
  assert.match(m, /minuty od jídla/);
  assert.match(m, /Textový souhrn:/);
  assert.match(m, /role="img"/);
});

test('Příběh má pevný modelový čas, ne systémové dnes', () => {
  assert.equal(S().clock.slice(0, 10), '2026-10-05');
  chapter('compare'); assert.equal(S().clock.slice(0, 10), '2026-10-10');
  chapter('unclear'); assert.equal(S().clock.slice(0, 10), '2026-10-20');
  chapter('onepage'); assert.equal(S().clock.slice(0, 10), '2027-01-05');
  act('shiftTime', '7'); assert.equal(S().clock.slice(0, 10), '2027-01-12');
});

console.log('');
console.log('Prošlo: ' + passed + ', selhalo: ' + failed);
if (fails.length) console.log('Selhaly: ' + fails.join(' | '));
process.exit(failed ? 1 : 0);
