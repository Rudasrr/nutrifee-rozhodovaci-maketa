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
const run = (id, variant) => { act('runScenario', id); if (variant) act('setVariant', variant); };

let passed = 0, failed = 0;
const fails = [];
function test(name, fn) {
  try { boot(); fn(); console.log('OK  ', name); passed++; }
  catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); }
}

/* ---------- 1. Pacient nevydá plán ---------- */
test('Pacient nevydá plán a nevydaný plán neaktivuje úkol', () => {
  run('S1');
  assert.equal(S().role, 'patient');
  const r = NF.issuePlan(S(), 'patient');
  assert.equal(r.ok, false);
  assert.match(r.error, /vydává lékař/);
  assert.equal(S().activePlanId, null);
  assert.equal(NF.activeTask(S()), null);
  const u = NF.confirmUnderstanding(S());
  assert.equal(u.ok, false);
  assert.equal(S().tasks[0].state, 'prepared');
});

test('Vydání plánu vyžaduje ověření léčby, bezpečnostní plán a úkol', () => {
  run('S1');
  act('role', 'doctor');
  act('issuePlan');
  assert.equal(S().activePlanId, null);
  assert.match(S().error, /ověření modelového seznamu léčby/);
  bind('draft.medicationChecked', true);
  act('issuePlan');
  assert.equal(S().activePlanId, null);
  assert.match(S().error, /bezpečnostní a kontaktní plán/);
  bind('draft.safetyChecked', true);
  act('issuePlan');
  assert.equal(S().activePlanId, 'P1');
});

test('Nezvládnuté zaučení neaktivuje klinický úkol', () => {
  run('S1', 'training');
  act('role', 'doctor');
  bind('draft.medicationChecked', true); bind('draft.safetyChecked', true);
  act('issuePlan');
  act('confirmUnderstanding');
  assert.equal(NF.activeTask(S()), null);
  assert.equal(S().tasks[0].state, 'prepared');
  assert.match(S().error, /[Zz]aučení/);
});

/* ---------- 2. Pravidla ---------- */
test('Neschválená v2 nenahradí v1 a neovlivní aktivní úkol', () => {
  run('S4', 'B');
  const v2 = S().rules.find(r => r.version === 'v2');
  assert.equal(v2.status, 'draft');
  assert.equal(NF.isRuleUsable(S(), 'R-SNIDANE'), true);
  assert.equal(NF.activeTask(S()).ruleVersion, 'v1');
  act('approveRule', 'R-SNIDANE|v2');
  assert.match(S().error, /testovací příklady/);
  assert.equal(S().rules.find(r => r.version === 'v2').status, 'draft');
  bind('ruleExamples.R-SNIDANE|v2', true);
  act('approveRule', 'R-SNIDANE|v2');
  assert.equal(S().rules.find(r => r.version === 'v2').status, 'approved');
  assert.equal(NF.activeTask(S()).ruleVersion, 'v1', 'schválení v2 samo nepřepne běžící úkol');
});

test('Vyřazení v1 pozastaví úkol, nezmění předpis a neobnoví se samo', () => {
  run('S4', 'B');
  const before = NF.activePlan(S()).prescription;
  act('openRetire', 'R-SNIDANE|v1');
  act('retireRule', 'R-SNIDANE|v1');
  const t = S().tasks[0];
  assert.equal(t.state, 'paused');
  assert.equal(t.pauseReason, 'rule');
  assert.equal(NF.activePlan(S()).prescription, before, 'vyřazení pravidla nemění inzulin');
  const r = NF.resumeTask(S(), 'doctor', 'zkouška');
  assert.equal(r.ok, false, 'nelze obnovit, dokud není použitelná verze pravidla');
});

test('Neschválené pravidlo nelze aktivovat, schválení v2 nevydá plán', () => {
  run('S4', 'B');
  act('openRetire', 'R-SNIDANE|v1'); act('retireRule', 'R-SNIDANE|v1');
  const plansBefore = S().plans.length;
  bind('ruleExamples.R-SNIDANE|v2', true);
  act('approveRule', 'R-SNIDANE|v2');
  assert.equal(S().plans.length, plansBefore, 'schválení pravidla nevydává nový plán');
});

/* ---------- 3. Žádná dávka ---------- */
test('Žádná větev nevypočítá ani nezmění dávku', () => {
  const texts = [];
  for (const id of ['S1', 'S2', 'S3', 'S4']) {
    boot(); run(id);
    for (const role of ['patient', 'doctor', 'garant']) {
      act('role', role);
      texts.push(markup());
    }
  }
  const joined = texts.join(' ');
  assert.equal(/\d+\s*(j\.|IU|jednotek|jednotky)\b/.test(joined), false, 'nikde nesmí být číselná dávka inzulinu');
  boot(); run('S3');
  const p1 = NF.activePlan(S()).prescription;
  act('role', 'doctor'); act('page', 'decide');
  act('formSet', 'choice:unchanged');
  act('issueP2');
  assert.equal(NF.activePlan(S()).prescription, p1, 'P2 nese stejný text předpisu; aplikace dávku nemění');
});

/* ---------- 4. Změnová rada ---------- */
test('Podaný nebo neznámý bolus neumožní změnovou radu', () => {
  run('S2', 'illness');
  assert.equal(NF.adviceAllowed(S(), 'after').allowed, false);
  assert.equal(NF.adviceAllowed(S(), 'unknown').allowed, false);
  assert.match(NF.adviceAllowed(S(), 'unknown').why, /před podáním bolusu/);
});

test('Samotné „před bolusem“ bez oprávnění v plánu radu neumožní', () => {
  run('S2', 'illness');
  const res = NF.adviceAllowed(S(), 'before');
  assert.equal(res.allowed, false);
  assert.match(res.why, /nepovoluje|pozorovací/);
  const p = NF.activePlan(S());
  p.allowChange = true;
  const res2 = NF.adviceAllowed(S(), 'before');
  assert.equal(res2.allowed, false, 'i s povolením v plánu musí být změnový úkol');
});

/* ---------- 5. Úplnost epizod ---------- */
test('Chybějící kontext a senzorová mezera nevytvoří úplnou epizodu ani nulu', () => {
  run('S1');
  act('applySituation', 'addE2E3');
  const c = NF.countEpisodes(S());
  assert.equal(c.recorded, 3);
  assert.equal(c.complete, 2, 'E2 bez údaje o inzulinu není úplná');
  const e2 = S().episodes.find(x => x.id === 'E2');
  assert.equal(JSON.stringify(NF.episodeStatus(e2).missing), JSON.stringify(['údaj o inzulinu a jeho čase']));
  act('role', 'patient'); act('page', 'compare');
  const m = markup();
  assert.match(m, /3 zaznamenané průběhy/);
  assert.match(m, /Nevíme, co rozdíl způsobilo/);
  assert.equal(/0 z 3|Překážky/.test(m), false, 'žádná domyšlená nula');
});

test('Varianta „málo podkladů“ zůstane bez věcného závěru', () => {
  run('S1', 'thin');
  act('applySituation', 'addE2E3');
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
  run('S1');
  act('role', 'doctor'); bind('draft.medicationChecked', true); bind('draft.safetyChecked', true);
  act('issuePlan'); act('confirmUnderstanding');
  act('page', 'episode');
  act('saveEpisode');
  assert.match(S().error, /jak to bylo s inzulinem/);
  assert.equal(S().episodes.length, 0);
  act('formSet', 'insulinReported:per-plan');
  act('saveEpisode');
  assert.match(S().error, /[Dd]oplň čas podání/);
  act('formSet', 'insulinReported:unknown');
  act('saveEpisode');
  assert.equal(S().episodes.length, 1);
  assert.equal(NF.episodeStatus(S().episodes[0]).complete, false);
});

/* ---------- 6. Nemoc a obnova dat ---------- */
test('Obnova dat nezruší nemoc ani pauzu', () => {
  run('S2', 'illness');
  act('page', 'unclear'); act('unclear', 'ill'); act('reportIllness');
  assert.equal(S().tasks[0].state, 'paused');
  assert.equal(S().illness.active, true);
  act('applySituation', 'restore');
  assert.equal(S().dataState.gap, false);
  assert.equal(S().tasks[0].state, 'paused', 'návrat dat neobnoví úkol');
  assert.equal(S().illness.active, true, 'návrat dat neukončí nemoc');
  const r = NF.resumeTask(S(), 'doctor', 'x');
  assert.equal(r.ok, false);
  assert.match(r.error, /nemoci/);
});

test('Nemoc oznamuje člověk a nic se neodesílá', () => {
  run('S2', 'illness');
  act('page', 'unclear'); act('unclear', 'ill'); act('reportIllness');
  assert.equal(S().illness.reportedBy, 'pacient');
  act('role', 'patient'); act('page', 'today');
  assert.match(markup(), /pozastaven/i);
  assert.equal(/odesláno lékaři|ordinace informována/.test(markup()), false);
});

test('Opožděný import nedopočítává mezeru', () => {
  run('S2', 'gap-vendor');
  const e4before = S().episodes.find(x => x.id === 'E4');
  const nullsBefore = e4before.points.filter(p => p.mmol === null).length;
  act('applySituation', 'late');
  const e4 = S().episodes.find(x => x.id === 'E4');
  const nulls = e4.points.filter(p => p.mmol === null).length;
  assert.equal(nullsBefore, 3);
  assert.equal(nulls, 2, 'přidán jeden opožděný bod, zbytek zůstává mezerou');
  assert.equal(NF.episodeStatus(e4).complete, false);
});

test('Lékař obnoví úkol až po ukončení nemoci', () => {
  run('S2', 'illness');
  act('page', 'unclear'); act('unclear', 'ill'); act('reportIllness');
  act('role', 'doctor'); act('page', 'resume');
  act('endIllness');
  act('resumeTask');
  assert.equal(S().tasks[0].state, 'active');
  assert.ok(S().tasks[0].resumeReason);
});

/* ---------- 7. P2 nepřepíše historii ---------- */
test('P2 nepřepíše historii P1 ani jeho epizody', () => {
  run('S3');
  const eps = S().episodes.map(x => ({ id: x.id, planId: x.planId }));
  act('role', 'doctor'); act('page', 'decide');
  act('formSet', 'choice:unchanged');
  bind('form.reason', 'Dostupný kontext neumožňuje připsat rozdíl konkrétní příčině.');
  act('issueP2');
  assert.equal(S().activePlanId, 'P2');
  assert.equal(S().plans.length, 2);
  assert.equal(S().plans[0].id, 'P1');
  assert.equal(JSON.stringify(S().episodes.map(x => ({ id: x.id, planId: x.planId }))), JSON.stringify(eps), 'staré epizody zůstávají u P1');
  assert.equal(NF.planById(S(), 'P2').previousId, 'P1');
});

test('Rozhodnutí „zatím nelze rozhodnout“ nevydá nový plán', () => {
  run('S3');
  act('role', 'doctor'); act('page', 'decide');
  act('formSet', 'choice:defer');
  act('issueP2');
  assert.equal(S().plans.length, 1);
  assert.match(S().error, /nelze rozhodnout/);
});

/* ---------- 8. Prázdný deník ---------- */
test('Prázdný deník umožní dokončit kontrolu bez vymyšlených nálezů', () => {
  run('S3', 'A');
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
  run('S3', 'A0');
  act('role', 'doctor'); act('page', 'onepage');
  const m = markup();
  assert.match(m, /nelze vyhodnotit/);
  assert.equal(/>0 %/.test(m), false);
});

test('Jedna stránka drží pevné pořadí částí', () => {
  for (const v of ['base', 'A', 'A0', 'B']) {
    boot(); run('S3', v);
    act('role', 'doctor'); act('page', 'onepage');
    const m = markup();
    const order = ['Bezpečnostní události a úplnost dat', 'Platný plán a zaznamenané odchylky',
      'Modelové cíle, TIR a čas pod rozmezím', 'Kontextové nálezy', 'Hlavní otázka pacienta'];
    let last = -1;
    for (const part of order) {
      const i = m.indexOf(part);
      assert.ok(i > last, 'část „' + part + '“ mimo pořadí ve variantě ' + v);
      last = i;
    }
  }
});

test('Historická bezpečnostní událost má zdroj a nehodnotí závažnost', () => {
  run('S3', 'B');
  act('role', 'doctor'); act('page', 'onepage');
  const m = markup();
  assert.match(m, /zpětně nahlásil pacient/);
  assert.match(m, /nezachytila v reálném čase/);
  assert.equal(/závažná nežádoucí|klasifikováno jako/i.test(m), false);
});

test('Aktuální problém během návštěvy přepne do bezpečnostního stavu', () => {
  run('S3', 'C');
  act('role', 'doctor'); act('page', 'onepage');
  act('interruptVisit');
  const m = markup();
  assert.match(m, /kontrola je přerušená/i);
  assert.equal(/62 %/.test(m), false, 'běžná kontrola se nezobrazuje');
  act('resumeVisit');
  assert.match(markup(), /Jednostránkový podklad/);
});

test('Dávkový podklad nemá číslo a není v pacientské roli', () => {
  run('S3', 'D');
  act('role', 'doctor'); act('page', 'dose');
  act('setDoseVariant', 'numeric');
  const m = markup();
  assert.match(m, /\[číselný obsah musí dodat a schválit garant\]/);
  act('role', 'patient');
  assert.equal(/číselný obsah musí dodat/.test(markup()), false, 'pacient dávkový podklad nevidí');
});

/* ---------- 9. Offline ---------- */
test('Offline simulace nepotvrdí doručení odvolaného pravidla', () => {
  run('S4', 'B');
  act('applySituation', 'goOffline');
  act('openRetire', 'R-SNIDANE|v1'); act('retireRule', 'R-SNIDANE|v1');
  assert.equal(S().ruleDelivery, 'unconfirmed');
  act('role', 'garant'); act('page', 'catalog');
  assert.match(markup(), /nepotvrzeno/);
  act('role', 'patient'); act('page', 'today');
  assert.match(markup(), /[Ss]imulovaný offline/);
  assert.match(markup(), new RegExp(NF.fmtTime(S().safetySyncAt)));
});

test('Bezpečnostní plán je dostupný i offline s datem verze', () => {
  run('S2', 'gap-unknown');
  act('applySituation', 'offline');
  act('role', 'patient'); act('page', 'safety');
  const m = markup();
  assert.match(m, /BP-v1/);
  assert.match(m, /simulovaný offline režim/);
  assert.match(m, /schválí klinický garant/);
});

/* ---------- 10. Reset ---------- */
test('Reset obnoví přesně vstupní data a odstraní změny běhu', () => {
  run('S1');
  const before = JSON.stringify(S());
  act('role', 'doctor'); bind('draft.medicationChecked', true); bind('draft.safetyChecked', true);
  act('issuePlan');
  bind('notes', 'poznámka z demonstrace');
  act('decide', 'katalog:yes');
  assert.notEqual(JSON.stringify(S()), before);
  act('resetDemo');
  const after = S();
  assert.equal(after.activePlanId, null);
  assert.equal(after.notes, '');
  assert.equal(Object.keys(after.decisions).length, 0);
  assert.equal(after.tasks[0].state, 'prepared');
  assert.equal(after.scenario, 'S1');
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
  run('S1');
  ctx.NutriFeeGuide.set(false);
  const off = markup();
  assert.equal(/data-guide/.test(off), false);
  ctx.NutriFeeGuide.set(true);
  const on = markup();
  assert.match(on, /data-guide/);
  ctx.NutriFeeGuide.set(false);
  assert.equal(markup(), off, 'vypnutí vrátí přesně původní rozložení');
});

test('Texty průvodce se neobjeví v běžném pacientském výstupu', () => {
  run('S1');
  ctx.NutriFeeGuide.set(true);
  act('role', 'patient');
  const m = markup();
  const C = ctx.NutriFeeGuideContent;
  for (const key of Object.keys(C.topics)) {
    const t = C.topics[key];
    if (t.why) assert.equal(m.includes(t.why), false, 'obhajoba návrhu unikla do obrazovky: ' + key);
    if (t.decide) assert.equal(m.includes(t.decide), false, 'otázka pro garanta unikla: ' + key);
  }
  assert.equal(/Zásada ze zadání|Návrh k posouzení|Otevřené rozhodnutí/.test(m), false);
});

test('Průvodce má pro každé téma úroveň a otevírá se akcí, ne jen hoverem', () => {
  run('S1');
  const C = ctx.NutriFeeGuideContent;
  const keys = Object.keys(C.topics);
  assert.ok(keys.length >= 30);
  for (const k of keys) {
    const t = C.topics[k];
    assert.ok(C.levels[t.level], 'chybí úroveň u ' + k);
    assert.ok(t.what && t.what.length > 20, 'chybí „co zde uživatel vidí“ u ' + k);
  }
  ctx.NutriFeeGuide.set(true);
  act('guideOpen', 'today-counts');
  assert.equal(NF.currentDrawer(), 'guide:today-counts');
  const panel = ctx.NutriFeeGuide.panelHtml('today-counts');
  assert.match(panel, /Co zde uživatel dělá nebo vidí/);
  assert.match(panel, /Proč je to navrženo právě takto/);
  assert.match(panel, /data-action="closeDrawer"/);
});

test('Průvodce pokrývá všechna povinná témata zadání', () => {
  run('S1');
  const C = ctx.NutriFeeGuideContent;
  const required = ['today-primary', 'task-done', 'today-counts', 'compare-list', 'onepage-2',
    'onepage-3', 'today-unsure', 'safety-sections', 'datastate-cause', 'onepage-1',
    'newplan-diff', 'rule-approved', 'rule-retired', 'dose-basis', 'decision-samotitrace',
    'participation-end', 'edge-case', 'resume-conditions'];
  for (const r of required) assert.ok(C.topics[r], 'chybí téma průvodce: ' + r);
});

/* ---------- průchody scénářů ---------- */
test('Scénář 1 projde od přípravy po dokončený úkol', () => {
  run('S1');
  assert.match(markup(), /Plán dosud nebyl vydán/);
  act('page', 'understand');
  act('answerCheck', 'yes');
  assert.match(markup(), /není zpráva ordinaci/);
  act('answerCheck', 'no');
  act('page', 'takeover');
  assert.match(markup(), /Plán zatím není vydaný/);
  act('role', 'doctor');
  bind('draft.medicationChecked', true); bind('draft.safetyChecked', true);
  act('issuePlan');
  assert.equal(S().role, 'patient');
  act('confirmUnderstanding');
  assert.equal(NF.activeTask(S()).id, 'T1');
  act('page', 'episode');
  act('formSet', 'insulinReported:per-plan');
  bind('form.insulinTime', '07:15');
  act('saveEpisode');
  assert.equal(S().episodes.length, 1);
  act('applySituation', 'addE2E3');
  assert.equal(NF.countEpisodes(S()).recorded, 3);
  act('page', 'compare');
  act('page', 'conclude');
  act('pickConclusion', '0');
  act('completeTask');
  assert.equal(S().tasks[0].state, 'done');
  assert.match(markup(), /už nemusíš nic zapisovat/);
});

test('Scénář 2 projde nejasností, výpadkem i obnovením', () => {
  run('S2', 'gap-broken');
  act('page', 'unclear');
  act('unclear', 'past');
  bind('form.question', 'Proč po stejné snídani vidím jiný průběh?');
  act('saveQuestion');
  assert.equal(S().questions.length, 1);
  assert.match(markup(), /Neodesláno lékaři/);
  act('unclear', 'now');
  act('page', 'safety');
  act('showContact');
  assert.match(markup(), /Nic se neodeslalo/);
  act('page', 'datastate');
  act('setCause', 'broken');
  assert.match(markup(), /Náhradní postup/);
  act('setCause', 'unknown');
  assert.match(markup(), /Příčinu neurčujeme/);
  act('applySituation', 'restore');
  assert.equal(S().dataState.gap, false);
  assert.equal(NF.episodeStatus(S().episodes.find(x => x.id === 'E4')).complete, false);
});

test('Scénář 3 projde od náhledu pacienta po předaný P2', () => {
  run('S3');
  assert.match(markup(), /Co dostane lékař/);
  bind('edit.E1', 'Chléb, sýr a neslazený čaj; obvyklá porce');
  act('saveCorrection', 'E1');
  assert.equal(S().episodes.find(x => x.id === 'E1').history.length, 1);
  act('role', 'doctor'); act('page', 'onepage');
  assert.match(markup(), /nemáme údaj/);
  act('page', 'evidence');
  act('setEvidence', 'E2');
  assert.match(markup(), /Chybí kontext/);
  act('page', 'decide');
  act('formSet', 'choice:unchanged');
  bind('form.reason', 'Dostupný kontext neumožňuje připsat rozdíl konkrétní příčině.');
  act('issueP2');
  assert.equal(S().activePlanId, 'P2');
  act('role', 'patient'); act('page', 'newplan');
  assert.match(markup(), /Léčba v modelové ukázce beze změny/);
  act('confirmUnderstanding');
  assert.equal(NF.activeTask(S()).id, 'T2');
  act('role', 'doctor'); act('page', 'result');
  act('setHelped', 'partly');
  assert.equal(S().decisions.helped, 'partly');
  assert.equal(/dvou minut|úspora 2/.test(markup()), false);
});

test('Scénář 4 projde katalogem, incidentem i nápravou', () => {
  run('S4', 'B');
  act('page', 'incidents');
  act('openIncident');
  act('createIncident');
  assert.equal(S().incidents.length, 1);
  act('page', 'catalog');
  act('openRetire', 'R-SNIDANE|v1'); act('retireRule', 'R-SNIDANE|v1');
  assert.equal(S().tasks[0].state, 'paused');
  act('role', 'patient'); act('page', 'today');
  assert.match(markup(), /aktualizac|vyřazeno/i);
  assert.match(markup(), /předpis se nemění|nevysazuje/i);
  act('role', 'garant'); act('page', 'catalog');
  bind('ruleExamples.R-SNIDANE|v2', true);
  act('approveRule', 'R-SNIDANE|v2');
  assert.equal(S().rules.find(r => r.version === 'v2').status, 'approved');
});

test('Scénář 4 A drží koncept mimo běžný pacientský průchod', () => {
  run('S4', 'A');
  assert.equal(S().page, 'protocol');
  assert.match(markup(), /Neschválený koncept/);
  act('conceptIllness');
  assert.equal(S().conceptState, 'paused');
  assert.match(markup(), /[Nn]ení vypočtena (žádná )?změna inzulinu/);
  act('role', 'patient'); act('page', 'today');
  assert.equal(/k doplnění garantem/.test(markup()), false, 'koncept není v běžné pacientské roli');
  act('role', 'garant'); act('page', 'protocol');
  act('openConcept');
  assert.equal(S().page, 'concept');
  assert.match(markup(), /Neschválený koncept — není aktivní/);
  act('decide', 'samotitrace:defer');
  assert.equal(S().decisions.samotitrace, 'defer');
});

/* ---------- okrajové stavy ---------- */
test('Okrajové situace mají stav, další krok i odpovědnou roli', () => {
  run('S1');
  for (const ec of D.edgeCases) {
    act('setEdge', ec.id);
    const m = markup();
    assert.match(m, new RegExp(ec.title.split(' ')[0]));
    assert.match(m, /Co se změnilo, co lze dál dělat a kdo řeší další krok/);
  }
  assert.equal(D.edgeCases.length, 10);
});

test('Ukončení účasti zastaví úkoly a nevyvozuje závěr z neaktivity', () => {
  run('S2', 'illness');
  act('endParticipation', 'ended');
  assert.equal(S().tasks.every(t => t.state === 'cancelled'), true);
  act('role', 'patient'); act('page', 'today');
  assert.match(markup(), /Účast je ukončená/);
});

test('Rozhodovací list je výchozí nerozhodnuto a nic nepředvybírá', () => {
  run('S1');
  act('role', 'garant'); act('page', 'decisions');
  const m = markup();
  assert.match(m, /Výchozí stav je nerozhodnuto/);
  assert.equal(Object.keys(S().decisions).length, 0);
  assert.equal(D.decisionList.length, 7);
  act('decide', 'pilot:change');
  assert.equal(S().decisions.pilot, 'change');
});

/* ---------- obecné hranice ---------- */
test('Nikde se netvrdí odeslání zprávy ani průběžný dohled', () => {
  const bad = /zpráva odeslána|odesláno ordinaci|ordinace informována|lékař upozorněn|sledujeme vás/i;
  for (const id of ['S1', 'S2', 'S3', 'S4']) {
    boot(); run(id);
    for (const role of ['patient', 'doctor', 'garant']) {
      act('role', role);
      assert.equal(bad.test(markup()), false, id + '/' + role);
    }
  }
});

test('Demo označení zůstává viditelné ve všech rolích a scénářích', () => {
  for (const id of ['S1', 'S2', 'S3', 'S4']) {
    boot(); run(id);
    for (const role of ['patient', 'doctor', 'garant']) {
      act('role', role);
      assert.match(markup(), /DEMO · syntetická data · není určeno pro léčbu/, id + '/' + role);
    }
  }
});

test('Grafy mají jednotky, popisky os a textový souhrn', () => {
  run('S3');
  act('role', 'doctor'); act('page', 'evidence'); act('setEvidence', 'E1');
  const m = markup();
  assert.match(m, /mmol\/l/);
  assert.match(m, /minuty od jídla/);
  assert.match(m, /Textový souhrn:/);
  assert.match(m, /role="img"/);
});

test('Scénáře mají pevný modelový čas, ne systémové dnes', () => {
  boot(); run('S1'); assert.equal(S().clock.slice(0, 10), '2026-10-05');
  boot(); run('S2'); assert.equal(S().clock.slice(0, 10), '2026-10-20');
  boot(); run('S3'); assert.equal(S().clock.slice(0, 10), '2026-12-05');
  act('applySituation', 'visit'); assert.equal(S().clock.slice(0, 10), '2027-01-05');
  act('shiftTime', '7'); assert.equal(S().clock.slice(0, 10), '2027-01-12');
});

test('Tiskový podklad skryje průvodce a ponechá označení demonstrace', () => {
  const demoCss = fs.readFileSync(path.join(__dirname, 'demo/demo.css'), 'utf8');
  const printBlock = demoCss.slice(demoCss.indexOf('@media print'));
  assert.match(printBlock, /\.guide-marker[^{]*\{[^}]*display:none/);
  assert.match(printBlock, /#overlay/);
  assert.match(printBlock, /\.demo-banner/);
  assert.match(printBlock, /DEMO · syntetická data · není určeno pro léčbu/);
});

test('Produkční sestavení se obejde bez složky demo', () => {
  const page = fs.readFileSync(path.join(__dirname, 'nutrifee-rozhodovaci-maketa.html'), 'utf8');
  assert.equal(DEMO.every(s => s.startsWith('demo/')), true);
  assert.equal(CORE.every(s => s.startsWith('app/')), true);
  for (const f of CORE) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    assert.equal(/require\(|NutriFeeGuideContent\.topics|D\.scenarios/.test(src), false,
      'jádro nesmí záviset na obsahu demonstrační vrstvy: ' + f);
  }
  assert.match(page, /demo\/fixtures\.js/);
});

console.log('');
console.log('Prošlo: ' + passed + ', selhalo: ' + failed);
if (fails.length) console.log('Selhaly: ' + fails.join(' | '));
process.exit(failed ? 1 : 0);
