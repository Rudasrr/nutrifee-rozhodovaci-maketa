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
const overlay = () => elements.get('overlay').innerHTML;
const chapter = id => {
  const i = D.indexOf(id);
  assert.ok(i >= 0, 'neznámá kapitola ' + id);
  act('goChapter', String(i));
  act('closeDrawer');
};
const branch = (k, v) => { act('setBranch', k + ':' + v); act('closeDrawer'); };
const everyScreen = fn => {
  for (let i = 0; i < D.chapters.length; i++) {
    act('goChapter', String(i)); act('closeDrawer');
    for (const role of ['patient', 'doctor', 'nurse', 'garant']) { act('role', role); fn(markup(), D.chapters[i].id + '/' + role); }
  }
};

let passed = 0, failed = 0;
const fails = [];
function test(name, fn) {
  try { boot(); fn(); console.log('OK  ', name); passed++; }
  catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); }
}

/* ================= ordinace ================= */
test('Příběh začíná v ordinaci u lékaře, ne u pacienta', () => {
  assert.equal(S().chapterIndex, 0);
  assert.equal(D.chapters[0].id, 'enroll');
  assert.equal(S().role, 'doctor');
  assert.match(markup(), /Zařazení pacienta/);
  assert.equal(S().activePlanId, null);
  assert.equal(NF.activeTask(S()), null);
});

test('Pacient na začátku nemá co vyplňovat ani potvrzovat', () => {
  act('role', 'patient');
  assert.match(markup(), /Plán zatím nebyl vydán/);
  assert.match(markup(), /Plán vydává lékař/);
});

test('Pořadí dějství: ordinace, učení, rada, výpadek, pravidla, kontrola', () => {
  const ids = D.chapters.map(c => c.id);
  const order = ['enroll', 'plan', 'training', 'handover', 'understanding', 'firstMeal', 'learning', 'advice', 'afterBolus', 'similar',
    'disruption', 'catalog', 'onepage', 'decide'];
  let last = -1;
  for (const id of order) { const i = ids.indexOf(id); assert.ok(i > last, 'kapitola ' + id + ' je mimo pořadí'); last = i; }
  assert.equal(D.acts.length, 6);
  const a0 = D.chapters.filter(c => c.act === 0);
  assert.equal(a0.slice(0, 4).map(c => c.role).join(), 'doctor,doctor,nurse,patient');
});

test('Kohorta: jen inzulin, bez perorálních antidiabetik, pevné dávky', () => {
  const labels = NF.ELIGIBILITY.map(c => c[1]).join(' | ');
  assert.match(labels, /žádná perorální antidiabetika/);
  assert.match(labels, /pevné dávky/);
  chapter('enroll');
  const m = markup();
  assert.equal(/metformin/i.test(m), false, 'karta nesmí uvádět perorální antidiabetikum');
  assert.match(m, /Jen inzulin — bez perorálních antidiabetik/);
  assert.equal(/metformin/i.test(fs.readFileSync(path.join(__dirname, 'demo/fixtures.js'), 'utf8')), false);
});

test('Bez způsobilosti se nepokračuje a plán se nevydá', () => {
  const r = NF.issuePlan(S(), 'doctor');
  assert.equal(r.ok, false);
  assert.match(r.error, /způsobilosti/);
  act('eligibility', 'adult');
  assert.equal(S().enrollment.eligible, false, 'jedno kritérium nestačí');
  for (const c of NF.ELIGIBILITY.slice(1)) act('eligibility', c[0]);
  assert.equal(S().enrollment.eligible, true);
});

test('Vydání plánu vyžaduje všechny náležitosti a předá pacienta sestře', () => {
  chapter('plan');
  act('issuePlan');
  assert.match(S().error, /ověření modelového seznamu léčby|bezpečnostní a kontaktní plán/);
  bind('draft.medicationChecked', true);
  act('issuePlan');
  assert.match(S().error, /bezpečnostní a kontaktní plán/);
  bind('draft.safetyChecked', true);
  act('issuePlan');
  assert.equal(S().activePlanId, 'P1');
  assert.equal(S().role, 'nurse', 'po vydání zaučí pacienta sestra');
});

test('Zaučení vede sestra a obsahuje otázku na bolus', () => {
  chapter('training');
  assert.equal(S().role, 'nurse');
  assert.match(markup(), /Zaučení vede sestra/);
  assert.ok(NF.TRAINING.some(t => /píchl/.test(t[1])), 'pacient musí znát otázku na bolus');
  assert.equal(NF.finishTraining(S(), 'doctor', 'done', '').ok, false);
  S().training.steps = {}; S().training.result = null;
  act('finishTraining', 'done');
  assert.match(S().error, /dokud některý bod chybí/);
  for (const t of NF.TRAINING) act('trainingStep', t[0]);
  act('finishTraining', 'done');
  assert.equal(S().training.result, 'done');
  assert.equal(S().training.by, 'DEMO-S01');
});

test('Nezvládnuté zaučení nechá plán vydaný, ale úkol se neaktivuje', () => {
  branch('training', 'failed');
  assert.equal(S().activePlanId, 'P1');
  chapter('handover');
  assert.equal(S().training.result, 'failed');
  assert.equal(NF.confirmUnderstanding(S()).ok, false);
  chapter('firstMeal');
  assert.equal(NF.activeTask(S()), null, 'příběh dál nepokračuje');
  assert.equal(S().role, 'nurse');
});

test('Úkol se aktivuje až po ověření porozumění', () => {
  chapter('handover');
  assert.equal(NF.activeTask(S()), null);
  act('page', 'understand'); act('answerCheck', 'no'); act('confirmUnderstanding');
  assert.equal(NF.activeTask(S()).id, 'T1');
});

test('V ordinaci není jediné pole k vypisování', () => {
  for (let i = 0; i < D.indexOf('firstMeal'); i++) {
    act('goChapter', String(i)); act('closeDrawer');
    for (const role of ['patient', 'doctor', 'nurse']) {
      act('role', role);
      const m = markup();
      assert.equal(/<textarea/.test(m), false, 'textarea ' + D.chapters[i].id + '/' + role);
      assert.equal(/<input(?![^>]*type="checkbox")/.test(m), false, 'textové pole ' + D.chapters[i].id + '/' + role);
    }
  }
});

test('Úkoly jsou předdefinované; neschválené pravidlo nejde přiřadit', () => {
  chapter('plan');
  assert.ok(D.taskCatalog.length >= 3);
  for (const c of D.taskCatalog) assert.ok(markup().includes(c.title), 'v katalogu chybí ' + c.id);
  assert.equal(S().tasks[0].catalogId, 'T-SNIDANE');
  const walk = D.taskCatalog.find(c => c.id === 'T-PROCHAZKA');
  assert.equal(NF.isRuleUsable(S(), walk.ruleId), false);
  act('selectTask', 'T-PROCHAZKA');
  assert.match(S().error, /nemá schválenou verzi/);
  assert.equal(S().tasks[0].catalogId, 'T-SNIDANE');
  assert.match(markup(), /čeká na schválení garantem, nelze přiřadit/);
});

/* ================= tři úrovně jistoty ================= */
test('Neznámé jídlo: žádný odhad, jen nabídka zapsat', () => {
  chapter('firstMeal');
  act('mealFood', 'kase');
  const c = NF.confidence(S(), 'kase');
  assert.equal(c.level, 'unknown');
  const m = markup();
  assert.match(m, /Nic neodhaduju/);
  const card = m.slice(m.indexOf('level-card'), m.indexOf('bolus-q'));
  assert.equal(/\d,\d mmol\/l/.test(card), false, 'u neznámého jídla nesmí být číslo');
  act('mealBolus', 'before');
  assert.equal(NF.advise(S(), 'kase', 'usual', 'before').items.length, 0, 'k neznámému jídlu obvyklé porce není rada');
});

test('Známé jídlo od tří úplných záznamů; neúplné se nepočítají', () => {
  chapter('learning');
  const h = NF.foodHistory(S(), 'kase');
  assert.equal(h.eaten, 4);
  assert.equal(h.usable, 3, 'záznam s „nevím“ u inzulinu se nepočítá');
  assert.equal(NF.confidence(S(), 'kase').level, 'known');
  assert.equal(NF.confidence(S(), 'chleb').level, 'known');
  const m = markup();
  assert.match(m, /Zapsáno 4×, s úplnými daty 3×/);
  assert.match(m, /mmol\/l/);
  const r = NF.usableRule(S(), 'R-REAKCE');
  assert.equal(r.params.minKnown, 3, 'hranice je parametr schváleného pravidla');
});

test('Podobné jídlo: směr bez čísla, počítáno z vlastností, ne z názvu', () => {
  chapter('similar');
  const c = NF.confidence(S(), 'musli');
  assert.equal(c.level, 'similar');
  assert.equal(c.direction, 'more');
  assert.equal(c.like.join(), 'kase');
  const m = markup();
  assert.match(m, /Vypadá jako jídla, po kterých ti to stoupá víc/);
  const card = m.slice(m.indexOf('level-card'), m.indexOf('bolus-q'));
  assert.equal(/\d,\d mmol\/l/.test(card), false, 'u podobného jídla nesmí být číslo');
  /* stejný název, jiné vlastnosti → nepodobné; jiný název, stejné vlastnosti → podobné */
  const kase = NF.foodById(S(), 'kase');
  S().foods.push({ id: 'x1', meal: 'breakfast', name: kase.name, carbs: 8, protein: 25, fat: 20, fiber: 1, form: 'pevne' });
  S().foods.push({ id: 'x2', meal: 'breakfast', name: 'Úplně jiné jméno', carbs: kase.carbs, protein: kase.protein, fat: kase.fat, fiber: kase.fiber, form: kase.form });
  assert.notEqual(NF.confidence(S(), 'x1').level, 'similar', 'shodný název nezakládá podobnost');
  assert.equal(NF.confidence(S(), 'x2').level, 'similar', 'shodné vlastnosti ano');
});

test('Bez schváleného pravidla pro vyhodnocení aplikace nic neodhaduje ani neradí', () => {
  chapter('advice');
  S().rules.find(r => r.id === 'R-REAKCE').status = 'draft';
  const res = NF.advise(S(), 'kase', 'bigger', 'before');
  assert.equal(res.conf.level, 'none');
  assert.equal(res.items.filter(i => i.lever !== 'portion').length, 0);
});

/* ================= bolus a páky ================= */
test('Před bolusem se rada k porci nabídne, směrem k obvyklé', () => {
  chapter('advice');
  act('mealBolus', 'before');
  const res = NF.advise(S(), 'kase', 'bigger', 'before');
  const p = res.items.find(i => i.lever === 'portion');
  assert.ok(p, 'rada k porci chybí');
  assert.match(p.text, /obvyklou porci/);
  assert.match(markup(), /Porce k obvyklé/);
});

test('Po bolusu se rada měnící sacharidy nedá', () => {
  chapter('afterBolus');
  const res = NF.advise(S(), 'kase', 'bigger', 'after');
  assert.equal(res.items.some(i => NF.LEVERS[i.lever].carbs), false);
  assert.ok(res.blocked.some(b => b.lever === 'portion' && b.reason === 'bolus'));
  assert.ok(res.items.some(i => i.lever === 'addon'), 'rada bez změny sacharidů zůstává');
  assert.match(markup(), /Porce k obvyklé: teď neradím/);
});

test('Neznámý stav podání se chová jako po bolusu', () => {
  assert.equal(NF.effectiveBolus('unknown'), 'after');
  assert.equal(NF.effectiveBolus(null), 'after');
  chapter('afterBolus');
  branch('bolus', 'unknown');
  const res = NF.advise(S(), 'kase', 'bigger', 'unknown');
  assert.equal(res.effective, 'after');
  assert.equal(res.items.some(i => i.lever === 'portion'), false);
  assert.match(markup(), /Nevíme, jestli už máš inzulin/);
});

test('Bez odpovědi na otázku o inzulinu se rada neukáže', () => {
  chapter('advice');
  const res = NF.advise(S(), 'kase', 'bigger', null);
  assert.equal(res.needsBolus, true);
  assert.equal(res.items.length, 0);
  assert.equal(/Co můžeš zkusit/.test(markup()), false);
  assert.match(markup(), /Už sis k tomuto jídlu píchl inzulin/);
});

test('Aplikace nikdy neradí jíst méně než obvykle', () => {
  chapter('advice');
  const smaller = NF.advise(S(), 'kase', 'smaller', 'before').items.find(i => i.lever === 'portion');
  assert.ok(smaller, 'menší porce má dostat radu vrátit se k obvyklé');
  assert.match(smaller.text, /Dej si obvyklou porci/);
  const bad = /dej si menší|sněz méně|jez méně|uber (z )?porc|menší porci si dej/i;
  everyScreen((m, where) => assert.equal(bad.test(m), false, where));
  for (const r of S().rules) assert.equal(bad.test(r.text || ''), false, 'text pravidla ' + r.id);
});

test('K pacientovi se dostane jen rada ze schváleného pravidla', () => {
  chapter('advice');
  act('mealBolus', 'before');
  for (const it of NF.advise(S(), 'kase', 'bigger', 'before').items) {
    assert.equal(NF.ruleByKey(S(), it.ruleKey).status, 'approved', it.lever);
  }
  S().rules.find(r => r.id === 'R-DOPLNEK').status = 'draft';
  const res = NF.advise(S(), 'kase', 'bigger', 'before');
  assert.equal(res.items.some(i => i.lever === 'addon'), false);
  act('mealPortion', 'bigger');
  assert.equal(/R-DOPLNEK/.test(markup()), false, 'neschválené pravidlo není ani zašedlé');
  const drafts = ['R-PROCHAZKA', 'R-ODSTUP', 'R-PRILOHA-FORMA', 'R-PRILOHA-MNOZSTVI'];
  boot();
  for (let i = 0; i < D.chapters.length; i++) {
    act('goChapter', String(i)); act('closeDrawer'); act('role', 'patient');
    for (const id of drafts) assert.equal(markup().includes(id), false, id + ' v pacientské roli, kapitola ' + D.chapters[i].id);
  }
});

test('Každá rada ukazuje pravidlo, jeho verzi a stav', () => {
  chapter('advice');
  act('mealBolus', 'before');
  const m = markup();
  const items = m.split('class="advice ').slice(1);
  assert.ok(items.length >= 3);
  for (const it of items) assert.match(it, /Pravidlo R-[A-Z-]+ v\d · schváleno garantem/);
  assert.match(m, /Pravidlo R-REAKCE v1 · schváleno garantem/, 'i výpočet reakce nese pravidlo');
});

test('Přijetí a odmítnutí rady se uloží i s důvodem a aplikace se z nich učí', () => {
  chapter('advice');
  act('mealBolus', 'before');
  act('mealDecide', 'portion:yes');
  act('mealDecide', 'addon:yes');
  act('mealDecide', 'order:no');
  act('mealReason', 'order:nothome');
  act('mealInsulin', 'per-plan');
  act('saveMeal');
  assert.match(S().error, /čas podání/);
  bind('meal.insulinTime', '07:00');
  act('saveMeal');
  const ep = S().episodes[S().episodes.length - 1];
  assert.equal(ep.portion, 'usual', 'přijatá rada vrátí porci k obvyklé');
  assert.equal(ep.lever, 'addon');
  assert.equal(JSON.stringify(ep.advice.map(a => [a.lever, a.accepted, a.reason])), JSON.stringify([['portion', true, null], ['addon', true, null], ['order', false, 'nothome']]));
  assert.equal(NF.usableEpisode(ep), true, 'simulovaný senzor dodal úsek');
  const fx = NF.leverEffects(S(), 'kase').find(x => x.lever === 'addon');
  assert.equal(fx.n, 1);
  assert.ok(fx.rise < fx.without, 'doplněk v modelu zmírní vzestup');
});

test('Co pomohlo, je vidět s počtem pokusů', () => {
  chapter('afterBolus');
  const it = NF.advise(S(), 'kase', 'bigger', 'after').items.find(i => i.lever === 'addon');
  assert.match(it.certainty, /Zkusil jsi to 1×/);
  assert.match(it.certainty, /Zpřesňuje se/);
});

/* ================= když něco nesedí ================= */
test('Nemoc oznamuje člověk, vypne rady a záznamy z nemoci se nepočítají', () => {
  chapter('disruption');
  assert.equal(S().illness, null);
  act('unclear', 'ill');
  act('reportIllness');
  assert.equal(S().illness.reportedBy, 'pacient');
  assert.equal(NF.activeTask(S()), null);
  assert.equal(NF.adviceGate(S()).ok, false);
  chapter('resume');
  const e14 = S().episodes.find(x => x.id === 'E14');
  assert.equal(e14.context, 'illness');
  assert.equal(NF.usableEpisode(e14), false);
});

test('Obnova dat nezruší nemoc ani pauzu; obnovení potvrzuje lékař s důvodem z nabídky', () => {
  chapter('resume');
  NF.restoreData(S());
  assert.equal(S().tasks[0].state, 'paused');
  assert.equal(NF.resumeTask(S(), 'doctor', 'x').ok, false);
  act('endIllness');
  act('resumeTask');
  assert.match(S().error, /Vyber důvod/);
  act('formSet', 'resumeReason:' + D.resumeReasons[0]);
  act('resumeTask');
  assert.equal(S().tasks[0].state, 'active');
  assert.equal(/<textarea|<input(?![^>]*type="checkbox")/.test(markup()), false);
});

test('Výpadek dat rozlišuje tři příčiny, žádnou neuhodne, mezera se nepočítá', () => {
  for (const [b, re] of [['gap-vendor', /Chybí data jen nám/], ['gap-broken', /Náhradní postup/], ['gap-unknown', /Příčinu neurčujeme/]]) {
    boot();
    chapter('disruption');
    branch('disruption', b);
    act('role', 'patient'); act('page', 'datastate');
    assert.match(markup(), re, 'větev ' + b);
    assert.equal(NF.usableEpisode(S().episodes.find(x => x.id === 'E13')), false);
  }
});

test('Bez spojení aplikace neradí, bezpečnostní plán zůstává', () => {
  chapter('impact');
  branch('offline', 'offline');
  assert.equal(S().ruleDelivery, 'unconfirmed');
  assert.equal(NF.adviceGate(S()).ok, false);
  act('role', 'patient'); act('page', 'today');
  assert.match(markup(), /Rady k jídlu jsou vypnuté/);
  act('page', 'safety');
  assert.match(markup(), /BP-v1/);
  assert.match(markup(), /simulovaný offline režim/);
});

/* ================= správa pravidel ================= */
test('Vyřazení pravidla rady: rada zmizí, úkol běží, předpis se nemění', () => {
  chapter('catalog');
  const before = NF.activePlan(S()).prescription;
  assert.ok(NF.advise(S(), 'kase', 'usual', 'before').items.some(i => i.lever === 'order'));
  act('openRetire', 'R-PORADI|v1');
  act('retireRule', 'R-PORADI|v1');
  assert.match(S().error, /důvod/);
  act('formSet', 'retireReason:' + D.retireReasons[0]);
  act('retireRule', 'R-PORADI|v1');
  assert.equal(NF.ruleByKey(S(), 'R-PORADI|v1').status, 'retired');
  assert.equal(NF.advise(S(), 'kase', 'usual', 'before').items.some(i => i.lever === 'order'), false);
  assert.equal(NF.activeTask(S()).id, 'T1', 'úkol běží dál');
  assert.equal(NF.activePlan(S()).prescription, before);
  assert.match(markup(), /se přestane nabízet/);
});

test('Pacient ví, proč radu nedostává, a že dávky se nemění', () => {
  chapter('impact');
  act('role', 'patient'); act('page', 'today');
  const m = markup();
  assert.match(m, /Některé rady teď nedostaneš/);
  assert.match(m, /R-PORADI v1 bylo vyřazeno/);
  assert.match(m, /Tvoje dávky se tím nemění/);
});

test('Neschválená v2 nic nedělá; po schválení se rada vrátí s novou verzí', () => {
  chapter('impact');
  act('role', 'garant');
  act('approveRule', 'R-PORADI|v2');
  assert.match(S().error, /testovací příklady/);
  assert.equal(NF.advise(S(), 'kase', 'usual', 'before').items.some(i => i.lever === 'order'), false);
  const plans = S().plans.length;
  bind('ruleExamples.R-PORADI|v2', true);
  act('approveRule', 'R-PORADI|v2');
  const it = NF.advise(S(), 'kase', 'usual', 'before').items.find(i => i.lever === 'order');
  assert.equal(it.ruleKey, 'R-PORADI|v2');
  assert.match(it.text, /Přílohu nevynechávej/);
  assert.equal(S().plans.length, plans, 'schválení pravidla nevydá plán');
});

/* ================= kontrola ================= */
test('Report drží pevné pořadí částí ve všech odbočkách', () => {
  const order = ['Bezpečnostní události a úplnost dat', 'Plán a jak probíhal', 'Senzor: čas v rozmezí',
    'Reakce na jednotlivá jídla', 'Fungovaly rady, když je pacient přijal?', 'Hlavní otázka pacienta'];
  for (const v of ['base', 'A', 'A0', 'B']) {
    boot(); chapter('onepage'); branch('review', v);
    act('role', 'doctor'); act('page', 'onepage');
    const m = markup();
    let last = -1;
    for (const part of order) { const i = m.indexOf(part); assert.ok(i > last, '„' + part + '“ mimo pořadí v ' + v); last = i; }
  }
});

test('Klíčové číslo: vzestup při přijaté radě oproti nepřijaté', () => {
  chapter('onepage');
  const o = NF.adviceOutcome(S(), 'P1');
  assert.ok(o.offered > 20);
  assert.ok(o.accepted.n > o.declined.n, 'odbočka „většinou přijal“');
  assert.ok(o.accepted.rise < o.declined.rise, 'v modelu přijatá rada zmírní vzestup');
  assert.equal(o.signal, false);
  const m = markup();
  assert.match(m, /Rada přijata/);
  assert.match(m, /Rada nepřijata/);
  assert.match(m, /Ukazuje směr, ne důkaz účinku/);
  assert.equal(/nespolupracuje|selhal|adherence|neukázněn/i.test(m), false);
});

test('Soustavné odmítání je signál k rozhovoru; nepraktická rada se pozná zvlášť', () => {
  chapter('onepage');
  branch('response', 'declines');
  let o = NF.adviceOutcome(S(), 'P1');
  assert.equal(o.signal, true);
  assert.equal(o.impractical, false);
  act('role', 'doctor'); act('page', 'onepage');
  assert.match(markup(), /úkol na změnu režimu/);
  branch('response', 'impractical');
  o = NF.adviceOutcome(S(), 'P1');
  assert.equal(o.signal, true);
  assert.equal(o.impractical, true);
  act('role', 'doctor'); act('page', 'onepage');
  assert.match(markup(), /rada může být nepraktická/);
});

test('Konzistence sacharidů mezi dny je v reportu', () => {
  chapter('onepage');
  const c = NF.carbConsistency(S(), 'P1');
  assert.ok(c.n > 20 && c.min <= c.median && c.median <= c.max);
  assert.match(markup(), /Sacharidy ve snídani mezi dny/);
});

test('Prázdný deník: report bez vymyšlených nálezů, kontrolu lze dokončit', () => {
  chapter('onepage');
  branch('review', 'A');
  act('role', 'doctor'); act('page', 'onepage');
  const m = markup();
  assert.match(m, /Pacient nezapsal žádné jídlo/);
  assert.match(m, /Pacient zatím žádnou radu nedostal/);
  assert.match(m, /64 %/, 'senzorový souhrn zůstává');
  act('page', 'decide'); act('formSet', 'choice:continue'); act('pickReason', D.decisionReasons[3]); act('issueP2');
  assert.equal(S().plans.length, 2);
});

test('Bez senzorového souhrnu „nelze vyhodnotit“, ne nuly', () => {
  chapter('onepage'); branch('review', 'A0');
  act('role', 'doctor'); act('page', 'onepage');
  assert.match(markup(), /nelze vyhodnotit/);
  assert.equal(/>0 %/.test(markup()), false);
});

test('Historická bezpečnostní událost má zdroj a nehodnotí závažnost', () => {
  chapter('onepage'); branch('review', 'B');
  act('role', 'doctor'); act('page', 'onepage');
  assert.match(markup(), /zpětně nahlásil pacient/);
  assert.equal(/závažná nežádoucí|klasifikováno jako/i.test(markup()), false);
});

test('Aktuální problém během návštěvy přepne do bezpečnostního stavu', () => {
  chapter('onepage'); branch('review', 'C');
  act('role', 'doctor'); act('page', 'onepage');
  assert.match(markup(), /kontrola je přerušená/i);
  act('resumeVisit');
  assert.match(markup(), /Report: jak plán probíhal/);
});

test('Rozhodnutí: důvod z připravených, žádné psaní', () => {
  chapter('decide');
  assert.equal(/<textarea|<input(?![^>]*type="checkbox")/.test(markup()), false);
  S().form = { choice: 'continue' };
  act('issueP2');
  assert.match(S().error, /důvod/);
  act('formSet', 'choice:defer'); act('pickReason', D.decisionReasons[3]); act('issueP2');
  assert.equal(S().plans.length, 1, 'odklad nevydá plán');
});

test('Úkol na změnu režimu je z katalogu a dávku nemění', () => {
  chapter('decide');
  branch('response', 'declines');
  assert.equal(S().form.choice, 'regime');
  act('issueP2');
  const p2 = NF.activePlan(S());
  assert.equal(p2.id, 'P2');
  assert.equal(NF.taskById(S(), p2.taskId).catalogId, 'T-REZIM');
  assert.equal(p2.prescription, NF.planById(S(), 'P1').prescription);
  assert.equal(p2.reviewReason, D.decisionReasons[1]);
});

test('P2 nepřepíše historii P1 a učení pokračuje', () => {
  chapter('newplan');
  assert.equal(S().activePlanId, 'P2');
  assert.match(markup(), /Dávky beze změny/);
  act('confirmUnderstanding');
  assert.equal(NF.activeTask(S()).id, 'T2');
  assert.equal(S().episodes.every(e => e.planId === 'P1'), true);
  assert.equal(NF.confidence(S(), 'kase').level, 'known', 'co aplikace ví o jídlech, zůstává');
});

test('Výsledek demonstrace nic nepředvybírá a netvrdí úsporu minut', () => {
  chapter('result');
  act('role', 'doctor'); act('page', 'result');
  assert.equal(S().decisions.helped, undefined);
  assert.equal(/úspora \d|ušetří \d/.test(markup()), false);
});

/* ================= žádná dávka ================= */
test('Nikde se nepočítá ani neukazuje číselná dávka inzulinu', () => {
  const dose = /\d+\s*(j\.|IU|jednotek|jednotky|jednotku)\b/;
  everyScreen((m, where) => assert.equal(dose.test(m), false, where));
  for (const f of [...CORE, ...DEMO]) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    assert.equal(/dose\s*[:=]\s*\d|dávk[ay]\s*=\s*\d/.test(src), false, f);
  }
});

test('Dávkové podklady ani samotitrace v maketě nejsou', () => {
  everyScreen((m, where) => assert.equal(/samotitrac|Dávkové podklady|dávkový podklad/i.test(m), false, where));
  act('openPresenter');
  assert.equal(/samotitrac|Dávkové podklady/i.test(overlay()), false);
  assert.equal(D.decisionList.some(d => /davk|samotitrace/.test(d.key)), false);
});

/* ================= garant ================= */
test('Průchod garanta vede jen po schvalovacích bodech', () => {
  assert.ok(D.garantRoute.length >= 8);
  for (const s of D.garantRoute) {
    assert.ok(D.indexOf(s.chapter) >= 0, 'neznámá kapitola ' + s.chapter);
    assert.ok(s.sign && s.sign.length > 20);
    for (const id of s.rules) assert.ok(D.rules().some(r => r.id === id), 'neznámé pravidlo ' + id);
  }
  act('garantGo', '5');
  assert.equal(S().garantStep, 5);
  assert.equal(S().branches.bolus, 'unknown', 'bod si nastaví svou odbočku');
  assert.match(elements.get('app').innerHTML, /Průchod garanta · bod 6/);
  assert.match(markup(), /Co podepisuješ/);
  act('garantEnd');
  assert.equal(S().page, 'decisions');
});

test('Rozhodovací list je výchozí nerozhodnuto a pojmenuje, co musí garant rozhodnout', () => {
  act('openAside', 'decisions');
  assert.match(markup(), /Výchozí stav je nerozhodnuto/);
  assert.equal(Object.keys(S().decisions).length, 0);
  const keys = D.decisionList.map(d => d.key);
  for (const k of ['odhad', 'rady', 'pohyb', 'porce', 'katalog', 'data', 'regulace']) assert.ok(keys.includes(k), 'chybí ' + k);
  act('decide', 'pilot:change');
  assert.equal(S().decisions.pilot, 'change');
});

test('Katalog pravidel ukazuje stav a parametry každého pravidla', () => {
  act('role', 'garant');
  const m = markup();
  for (const r of S().rules) assert.ok(m.includes(r.id + ' ' + r.version), r.id + ' ' + r.version);
  assert.match(m, /minKnown = 3/);
  assert.match(m, /jen před bolusem/);
});

/* ================= determinismus a demo ================= */
test('Skok na kapitolu je deterministický', () => {
  for (let i = 1; i < D.chapters.length; i++) {
    const a = D.play(i, null), b = D.play(i, null);
    assert.equal(JSON.stringify(a.episodes), JSON.stringify(b.episodes), 'kapitola ' + i);
    assert.equal(a.tasks.map(t => t.state).join(), b.tasks.map(t => t.state).join());
  }
});

test('Každá kapitola se vykreslí ve své roli', () => {
  for (let i = 0; i < D.chapters.length; i++) {
    act('goChapter', String(i)); act('closeDrawer');
    assert.equal(S().role, D.chapters[i].role, D.chapters[i].id);
    assert.ok(markup().length > 400, D.chapters[i].id + ' se nevykreslila');
    assert.equal(S().error, '', D.chapters[i].id + ': ' + S().error);
  }
});

test('Reset vrátí začátek příběhu a odstraní změny běhu', () => {
  chapter('learning');
  bind('notes', 'poznámka');
  act('decide', 'katalog:yes');
  act('resetDemo');
  const s = S();
  assert.equal(s.chapterIndex, 0);
  assert.equal(s.activePlanId, null);
  assert.equal(s.episodes.length, 0);
  assert.equal(s.notes, '');
  assert.equal(Object.keys(s.decisions).length, 0);
});

test('Příběh má pevný modelový čas, ne systémové dnes', () => {
  assert.equal(S().clock.slice(0, 10), '2026-10-05');
  chapter('advice'); assert.equal(S().clock.slice(0, 10), '2026-10-14');
  chapter('onepage'); assert.equal(S().clock.slice(0, 10), '2027-01-05');
  act('shiftTime', '7'); assert.equal(S().clock.slice(0, 10), '2027-01-12');
});

/* ================= oddělení produkce a průvodce ================= */
test('Produkční sestavení se obejde bez složky demo a nic si nevymyslí', () => {
  assert.equal(DEMO.every(s => s.startsWith('demo/')), true);
  for (const f of CORE) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    assert.equal(/require\(|NutriFeeGuideContent\.topics|D\.chapters|D\.play\(/.test(src), false, f);
  }
  boot({ withDemo: false });
  const m = elements.get('app').innerHTML;
  assert.equal(/data-guide|guide-marker/.test(m), false);
  assert.equal(/DEMO · syntetická data/.test(m), false);
  assert.ok(m.length > 200);
  assert.equal(NF.sensorSource, undefined, 'bez demo vrstvy není simulovaný senzor');
  assert.equal(S().rules.length, 0, 'bez schváleného katalogu žádná pravidla');
});

test('Vypnutý průvodce neponechá kotvy ani vysvětlení', () => {
  chapter('advice');
  ctx.NutriFeeGuide.set(false);
  const off = markup();
  assert.equal(/data-guide/.test(off), false);
  ctx.NutriFeeGuide.set(true);
  assert.match(markup(), /data-guide/);
  ctx.NutriFeeGuide.set(false);
  assert.equal(markup(), off);
});

test('Texty průvodce se neobjeví v běžném výstupu; nápověda aplikace ano', () => {
  chapter('advice');
  ctx.NutriFeeGuide.set(true);
  act('mealBolus', 'before');
  const m = markup();
  const C = ctx.NutriFeeGuideContent;
  for (const key of Object.keys(C.topics)) {
    const t = C.topics[key];
    if (t.why) assert.equal(m.includes(t.why), false, 'obhajoba unikla: ' + key);
    if (t.decide) assert.equal(m.includes(t.decide), false, 'otázka pro garanta unikla: ' + key);
  }
  assert.equal(/Závazná zásada|Návrh k posouzení|Otevřené rozhodnutí/.test(m), false);
  assert.match(m, /Proč mi to radíš a jak moc si tím jsi jistá/, 'nápověda aplikace zůstává i v produkci');
});

test('Průvodce má u každého tématu úroveň a pokrývá nové obrazovky', () => {
  const C = ctx.NutriFeeGuideContent;
  for (const k of Object.keys(C.topics)) {
    assert.ok(C.levels[C.topics[k].level], 'úroveň u ' + k);
    assert.ok(C.topics[k].what && C.topics[k].what.length > 20, 'what u ' + k);
  }
  const required = ['enroll-eligibility', 'task-catalog', 'training-steps', 'meal-portion', 'meal-level', 'meal-bolus', 'meal-blocked',
    'meal-advice', 'foods-list', 'offline-advice', 'rule-retired', 'onepage-2', 'onepage-4', 'onepage-5', 'decide-options', 'decide-reasons'];
  for (const r of required) assert.ok(C.topics[r], 'chybí téma ' + r);
  ctx.NutriFeeGuide.set(true);
  act('guideOpen', 'meal-bolus');
  assert.equal(NF.currentDrawer(), 'guide:meal-bolus');
  assert.match(ctx.NutriFeeGuide.panelHtml('meal-bolus'), /Proč je to navrženo právě takto/);
});

test('Kotvy průvodce na obrazovkách mají téma', () => {
  const C = ctx.NutriFeeGuideContent;
  ctx.NutriFeeGuide.set(true);
  const missing = new Set();
  everyScreen(m => { for (const x of m.matchAll(/data-guide="([^"]+)"/g)) if (!C.topics[x[1]]) missing.add(x[1]); });
  const allowed = [...missing].filter(k => !/^decision-/.test(k));
  assert.equal(allowed.length, 0, 'kotvy bez tématu: ' + allowed.join(', '));
});

test('Tiskový podklad skryje průvodce a ponechá označení demonstrace', () => {
  const css = fs.readFileSync(path.join(__dirname, 'demo/demo.css'), 'utf8');
  const printBlock = css.slice(css.indexOf('@media print'));
  assert.match(printBlock, /\.guide-marker[^{]*\{[^}]*display:none/);
  assert.match(printBlock, /DEMO · syntetická data · není určeno pro léčbu/);
});

/* ================= obecné hranice ================= */
test('Okrajové situace mají stav, další krok i odpovědnou roli', () => {
  for (const ec of D.edgeCases) {
    act('setEdge', ec.id);
    assert.match(markup(), /Co se změnilo, co lze dál dělat a kdo řeší další krok/);
  }
  assert.equal(D.edgeCases.length, 10);
});

test('Ukončení účasti zastaví úkoly i rady', () => {
  chapter('advice');
  act('endParticipation', 'ended');
  assert.equal(S().tasks.every(t => t.state === 'cancelled'), true);
  assert.equal(NF.adviceGate(S()).ok, false);
  act('role', 'patient'); act('page', 'today');
  assert.match(markup(), /Účast je ukončená/);
});

test('Nikde se netvrdí odeslání zprávy ani průběžný dohled', () => {
  const bad = /zpráva odeslána|odesláno ordinaci|ordinace informována|lékař upozorněn|sledujeme vás/i;
  everyScreen((m, where) => assert.equal(bad.test(m), false, where));
});

test('Demo označení zůstává viditelné ve všech kapitolách a rolích', () => {
  everyScreen((m, where) => assert.match(m, /DEMO · syntetická data · není určeno pro léčbu/, where));
});

test('Grafy mají jednotky, popisky os a textový souhrn', () => {
  chapter('onepage');
  act('role', 'doctor'); act('page', 'evidence'); act('setEvidence', 'kase');
  const m = markup();
  assert.match(m, /mmol\/l/);
  assert.match(m, /minuty od jídla/);
  assert.match(m, /Textový souhrn:/);
  assert.match(m, /role="img"/);
});

test('V publikovaných souborech nejsou skutečná jména osob ani institucí', () => {
  const files = ['nutrifee-rozhodovaci-maketa.html', 'README.md', ...CORE, ...DEMO];
  /* Obecné vzory — test sám nesmí žádné skutečné jméno obsahovat. */
  const bad = /MUDr\.|Ing\. ?[A-Z]|prof\. |doc\. |a kol\.|et al\.|nemocnic|FN [A-Z]|Standards of Care/;
  for (const f of files) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    assert.equal(bad.test(src), false, f);
  }
});

console.log('');
console.log('Prošlo: ' + passed + ', selhalo: ' + failed);
if (fails.length) console.log('Selhaly: ' + fails.join(' | '));
process.exit(failed ? 1 : 0);
