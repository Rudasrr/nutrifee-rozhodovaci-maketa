/* Modelová data a jeden souvislý příběh. Součást demonstrační vrstvy.
   Produkční sestavení tento soubor nezahrnuje; jádro pak startuje v prázdném
   přípravném stavu a data by četlo ze skutečného zdroje.

   Příběh je jedna linka od ordinace dál: lékař vydá plán, sestra zaučí, pacient
   jí a aplikace se učí, před jídlem radí, a na kontrole lékař vidí, jestli rady
   fungovaly. Nemoc, výpadek dat a změna pravidla jsou kapitoly téhož příběhu. */
(function (global) {
'use strict';
var NF = global.NutriFee;
var D = global.NutriFeeDemo = global.NutriFeeDemo || {};

var PRESCRIPTION = 'Bazální inzulin 1× večer a prandiální inzulin ke třem hlavním jídlům v pevných dávkách podle modelového předpisu P1.';

var SAFETY = {
  version: 'BP-v1',
  approvedNote: 'Konkrétní postup a meze doplní a schválí klinický garant.',
  sections: [
    { id: 'low', title: 'Nízká hodnota glukózy', body: 'Postupuj podle pokynů, které ti dal tvůj lékař. Konkrétní meze a postup zde doplní klinický garant.' },
    { id: 'less', title: 'Snědl jsem méně, než jsem měl v plánu', body: 'Tvoje dávka je nastavená na obvyklé množství. Co dělat, když sníš méně, doplní klinický garant podle tvého pracoviště.' },
    { id: 'ill', title: 'Nemoc, zvracení nebo nemožnost pít', body: 'Inzulin se při nemoci obvykle nevysazuje. Přesný postup určí tvůj lékař. Pokud nemůžeš pít, kontaktuj ordinaci nebo pohotovost.' },
    { id: 'high', title: 'Přetrvávající vysoké hodnoty a ketony', body: 'Postup pro měření ketonů a další kroky doplní klinický garant podle tvého pracoviště.' },
    { id: 'miss', title: 'Vynechaný inzulin nebo porucha podání', body: 'Zaznamenej, co se stalo, a řiď se pokynem svého lékaře. NutriFee dávku nedopočítává ani nenavrhuje.' },
    { id: 'closed', title: 'Nedostupná ordinace', body: 'Mimo ordinační hodiny se řiď postupem, který ti pracoviště předalo. NutriFee zprávy neodesílá a nikdo tvůj zápis průběžně nesleduje.' },
    { id: 'acute', title: 'Akutní situace', body: 'Při bezvědomí, křečích, dušnosti nebo jiném ohrožení volej záchrannou službu běžnou cestou. NutriFee není tísňová linka.' }
  ]
};

/* ---------- katalog pravidel ----------
   Výpočty, rady (páky) a úkoly. K pacientovi se dostane jen schválená verze.
   Hodnoty parametrů jsou návrh k posouzení, ne klinicky ověřené meze. */
function rules() {
  var approved = { status: 'approved', approvedBy: 'DEMO-G01', approvedAt: '2026-09-28T10:00:00', examplesReviewed: true };
  function R(o, base) { var r = {}; Object.keys(base || {}).forEach(function (k) { r[k] = base[k]; }); Object.keys(o).forEach(function (k) { r[k] = o[k]; }); return r; }
  return [
    R({ id: 'R-REAKCE', version: 'v1', kind: 'výpočet', title: 'Vyhodnocení reakce na jídlo',
      purpose: 'Z vlastních záznamů pacienta spočítat, o kolik mu po jídle obvykle stoupne glukóza, a rozlišit známé a neznámé jídlo.',
      inputs: ['záznam jídla a porce', 'pacientem uvedený inzulin a jeho čas', 'senzorový úsek 0–120 minut'],
      params: { minKnown: 3, 'okno (min)': 120 },
      limits: ['Počítá jen úplné záznamy mimo období nemoci.', 'Ukazuje pacientovu minulost, ne předpověď.', 'Nikdy nepočítá dávku inzulinu.'],
      examples: { use: ['Kaše snězená potřetí s úplnými daty → známé jídlo.'], skip: ['Záznam s „nevím“ u inzulinu.', 'Záznam z doby oznámené nemoci.', 'Záznam s mezerou v senzorových datech.'] }
    }, approved),
    R({ id: 'R-PODOBNOST', version: 'v1', kind: 'výpočet', title: 'Podobnost jídel z vlastností',
      purpose: 'U jídla, které pacient ještě nezná, najít známá jídla s podobnými vlastnostmi porce a říct jen směr, bez čísla.',
      inputs: ['sacharidy, bílkovina, tuk a vláknina v porci (g)', 'forma jídla'],
      params: { maxDistance: 0.35 },
      limits: ['Podobnost se nepočítá z názvu jídla.', 'Neuvádí číselný odhad vzestupu.', 'Když nic podobného není, nic neodhaduje.'],
      examples: { use: ['Müsli s jogurtem se vlastnostmi podobá ovesné kaši.'], skip: ['Míchaná vejce — nic podobného mezi známými jídly.'] }
    }, approved),
    R({ id: 'R-PORCE', version: 'v1', kind: 'rada', lever: 'portion', title: 'Porce k obvyklému množství',
      purpose: 'Při pevné dávce držet porci u obvyklého množství — oběma směry.',
      inputs: ['pacientem zvolená porce', 'stav podání bolusu'],
      limits: ['Jen před bolusem. Neznámý stav podání se chová jako po bolusu.', 'Nikdy neradí jíst méně než obvykle.'],
      text: 'Dej si obvyklou porci. Tvoje dávka je nastavená na obvyklé množství.',
      examples: { use: ['Pacient si chystá větší porci a inzulin ještě nemá.'], skip: ['Inzulin už je podaný.', 'Pacient neví, jestli si píchl.'] }
    }, approved),
    R({ id: 'R-DOPLNEK', version: 'v1', kind: 'rada', lever: 'addon', title: 'Přidání bílkoviny, tuku nebo vlákniny',
      purpose: 'Změnit podobu jídla bez změny množství sacharidů.',
      inputs: ['vybrané jídlo', 'dřívější záznamy s touto radou'],
      limits: ['Kdykoli — množství sacharidů nemění.', 'Nenabízí se během oznámené nemoci.'],
      text: 'Přidej k jídlu {addon}. Množství sacharidů se tím nemění.',
      examples: { use: ['Kaše, po které pacientovi obvykle stoupne víc.'], skip: ['Oznámená nemoc.'] }
    }, approved),
    R({ id: 'R-PORADI', version: 'v1', kind: 'rada', lever: 'order', title: 'Pořadí jídla',
      purpose: 'Změnit pořadí složek jídla bez změny množství sacharidů.',
      inputs: ['vybrané jídlo'],
      limits: ['Kdykoli — množství sacharidů nemění.'],
      text: 'Sněz nejdřív {first}, potom zbytek jídla.',
      examples: { use: ['Snídaně se složkou s bílkovinou nebo zeleninou.'], skip: ['Jídlo z jediné složky.'] }
    }, approved),
    R({ id: 'R-PORADI', version: 'v2', kind: 'rada', lever: 'order', status: 'draft', examplesReviewed: false,
      title: 'Pořadí jídla — návrh v2',
      purpose: 'Upřesnit text tak, aby rada nemohla vést k vynechání přílohy.',
      inputs: ['vybrané jídlo'],
      limits: ['Kdykoli — množství sacharidů nemění.', 'Nově výslovně: přílohu nevynechávat.'],
      text: 'Sněz nejdřív {first}, potom zbytek obvyklého jídla. Přílohu nevynechávej — množství sacharidů má zůstat stejné.',
      examples: { use: ['Snídaně se složkou s bílkovinou nebo zeleninou.'], skip: ['Jídlo z jediné složky.', 'Pacient hlásí, že přílohu vynechal.'] }
    }),
    R({ id: 'R-PRILOHA-FORMA', version: 'v1', kind: 'rada', lever: 'sideForm', status: 'draft', examplesReviewed: false,
      title: 'Příloha ve stejném množství, jiné podobě',
      purpose: 'Nabídnout výměnu přílohy za stejné množství sacharidů v jiné podobě.',
      inputs: ['katalog příloh se sacharidy v porci'],
      limits: ['Návrh. Chybí ověřený zdroj potravinových dat.'],
      text: 'Místo {side} zkus stejné množství {sideAlt}.',
      examples: { use: ['Bílé pečivo → celozrnné ve stejném množství sacharidů.'], skip: ['Jídlo bez přílohy.'] }
    }),
    R({ id: 'R-PRILOHA-MNOZSTVI', version: 'v1', kind: 'rada', lever: 'sideAmount', status: 'draft', examplesReviewed: false,
      title: 'Příloha s jiným množstvím sacharidů',
      purpose: 'Vrátit množství sacharidů k obvyklému výměnou přílohy.',
      inputs: ['katalog příloh', 'stav podání bolusu'],
      limits: ['Návrh. Jen před bolusem.', 'Chybí ověřený zdroj potravinových dat.'],
      text: 'K ověření garantem.',
      examples: { use: [], skip: ['Inzulin už je podaný.'] }
    }),
    R({ id: 'R-ODSTUP', version: 'v1', kind: 'rada', lever: 'timing', status: 'draft', examplesReviewed: false,
      title: 'Odstup jídla od bolusu',
      purpose: 'Doporučit, kdy začít jíst vzhledem k podání prandiálního inzulinu.',
      inputs: ['čas podání bolusu', 'dřívější záznamy'],
      limits: ['Návrh bez hodnot. Hranice určí garant.'],
      text: 'K ověření garantem.',
      examples: { use: [], skip: [] }
    }),
    R({ id: 'R-PROCHAZKA', version: 'v1', kind: 'rada', lever: 'walk', status: 'draft', examplesReviewed: false,
      title: 'Svižná procházka po jídle',
      purpose: 'Doporučit krátký pohyb po jídle.',
      inputs: ['čas jídla', 'čas podání bolusu'],
      limits: ['Návrh bez hodnot. Hranice pohybu po bolusu určí garant.'],
      text: 'K ověření garantem.',
      examples: { use: [], skip: [] }
    }),
    R({ id: 'R-ROZLOZENI', version: 'v1', kind: 'úkol', title: 'Rozložení sacharidů mezi dny',
      purpose: 'Držet mezi dny konzistenci sacharidů, kterou pevná dávka předpokládá.',
      inputs: ['záznamy jídel', 'katalog jídel'],
      limits: ['Pozorovací úkol; rady se řídí ostatními pravidly.'],
      examples: { use: ['Pacient se ptá, proč mu dávka jednou sedí a jindy ne.'], skip: [] }
    }, approved),
    R({ id: 'R-REZIM', version: 'v1', kind: 'úkol', title: 'Úkol na změnu režimu',
      purpose: 'Když pacient rady soustavně nepřijímá, zjednodušit cíl na obvyklou porci v obvyklém čase.',
      inputs: ['report z kontroly'],
      limits: ['Vydává jen lékař na kontrole.'],
      examples: { use: ['Rady pacient většinou nechává být.'], skip: ['Rady fungují a pacient je přijímá.'] }
    }, approved)
  ];
}

/* ---------- katalog jídel ----------
   Syntetické hodnoty obvyklé porce. Zdroj a licence skutečných potravinových dat
   nejsou vybrané — rozhodne garant. */
function foods() {
  return [
    { id: 'kase', meal: 'breakfast', name: 'Ovesná kaše s mlékem a banánem', carbs: 55, protein: 10, fat: 6, fiber: 5, form: 'kase', addon: 'bílý jogurt nebo hrst ořechů', first: 'jogurt' },
    { id: 'chleb', meal: 'breakfast', name: 'Chléb se sýrem a zeleninou', carbs: 50, protein: 15, fat: 14, fiber: 4, form: 'pevne', addon: 'plátek šunky nebo vejce', first: 'zeleninu a sýr' },
    { id: 'musli', meal: 'breakfast', name: 'Müsli s jogurtem a medem', carbs: 58, protein: 9, fat: 7, fiber: 6, form: 'kase', addon: 'bílý jogurt navíc nebo ořechy', first: 'jogurt' },
    { id: 'vejce', meal: 'breakfast', name: 'Míchaná vejce se zeleninou', carbs: 8, protein: 20, fat: 18, fiber: 3, form: 'pevne', addon: 'nic navíc', first: 'zeleninu' }
  ];
}

/* ---------- simulovaný senzor ----------
   Deterministický model průběhu po jídle. Slouží jen demonstraci; skutečná data
   by přišla ze senzoru. Hodnoty nejsou klinicky kalibrované. */
var BASE_RISE = { kase: 4.6, chleb: 2.5, musli: 5.1, vejce: 1.1 };
var LEVER_EFFECT = { addon: -1.4, order: -0.9 };
function curve(foodId, portion, lever, k) {
  var rise = (BASE_RISE[foodId] || 3) + (portion === 'bigger' ? 1.2 : portion === 'smaller' ? -1.0 : 0) +
    (LEVER_EFFECT[lever] || 0) + (((k * 37) % 7) - 3) * 0.1;
  var b = 6.8 + ((k * 13) % 5) * 0.1;
  return [b, b + 0.55 * rise, b + rise, b + 0.75 * rise, b + 0.45 * rise].map(function (v) { return Math.round(v * 10) / 10; });
}
function pts(values, at) {
  return [0, 30, 60, 90, 120].map(function (m, i) {
    var d = new Date(at); d.setMinutes(d.getMinutes() + m);
    return { min: m, at: d.toISOString().slice(0, 19), mmol: values[i] == null ? null : values[i] };
  });
}
NF.sensorSource = function (S, draft) {
  var k = S.episodes.length + 1;
  var taken = (draft.advice || []).filter(function (a) { return a.accepted === true && a.lever !== 'portion'; })[0];
  var portionTaken = (draft.advice || []).some(function (a) { return a.lever === 'portion' && a.accepted === true; });
  var v = curve(draft.foodId, portionTaken ? 'usual' : draft.portion, taken && taken.lever, k);
  return { points: pts(v, draft.at), importedAt: NF.addDays(draft.at, 0).slice(0, 11) + '11:00:00' };
};

/* Hotový záznam jídla pro příběh. */
function ep(S, spec) {
  var k = Number(spec.id.slice(1));
  var advice = spec.advice || [];
  var taken = advice.filter(function (a) { return a.accepted === true && a.lever !== 'portion'; })[0];
  var portionTaken = advice.some(function (a) { return a.lever === 'portion' && a.accepted === true; });
  var portion = portionTaken ? 'usual' : (spec.portion || 'usual');
  var v = curve(spec.food, portion, taken && taken.lever, k);
  if (spec.gap) v = [v[0], v[1], null, null, null];
  if (spec.noSensor) v = [null, null, null, null, null];
  var food = NF.foodById(S, spec.food);
  return {
    id: spec.id, taskId: spec.task || 'T1', planId: spec.plan || 'P1', foodId: spec.food,
    at: spec.at, recordedAt: spec.at,
    desc: food.name, portionPlanned: spec.portion || 'usual', portion: portion,
    bolusAtAdvice: spec.bolus || (advice.length ? 'before' : null),
    insulin: { reported: spec.insulin || 'per-plan', time: spec.insulin === 'unknown' ? null : spec.at.slice(11, 16) },
    advice: advice.map(function (a) {
      return { lever: a.lever, ruleKey: a.ruleKey || { portion: 'R-PORCE|v1', addon: 'R-DOPLNEK|v1', order: 'R-PORADI|v1' }[a.lever],
        accepted: a.accepted === undefined ? null : a.accepted, reason: a.reason || null };
    }),
    lever: taken ? taken.lever : null,
    context: spec.context || null,
    points: pts(v, spec.at),
    importedAt: spec.noSensor ? null : spec.at.slice(0, 11) + '11:00:00',
    author: 'DEMO-P01', history: []
  };
}
function add(S, spec) {
  if (S.episodes.some(function (x) { return x.id === spec.id; })) return;
  S.episodes.push(ep(S, spec));
}

/* ---------- katalog úkolů ----------
   Předem definovaný. Lékař v ordinaci nic nepíše, jen vybírá. Úkol lze vybrat
   jen tehdy, má-li jeho pravidlo schválenou verzi. */
D.taskCatalog = [
  {
    id: 'T-SNIDANE', kind: 'advise', ruleId: 'R-REAKCE', meal: 'breakfast',
    title: 'Snídaně: aplikace se učí a radí',
    question: 'Proč mi po snídani jednou stoupne víc a jindy míň, když mám pořád stejnou dávku?',
    conditions: 'Před snídaní otevři aplikaci, vyber jídlo a porci a odpověz, jestli už máš inzulin. Po třech úplných zápisech stejného jídla ti řekne, co se po něm děje, a poradí.',
    burden: 'Jeden zápis denně ke snídani, do minuty.'
  },
  {
    id: 'T-ROZLOZENI', kind: 'advise', ruleId: 'R-ROZLOZENI', meal: 'breakfast',
    title: 'Každý den podobně sacharidů ke snídani',
    question: 'Jak mám jíst, aby mi pevná dávka seděla každý den?',
    conditions: 'Zapisuj snídani a porci. Aplikace ukáže, jak se ti mezi dny liší množství sacharidů, a před jídlem poradí, jak se vrátit k obvyklému.',
    burden: 'Jeden zápis denně ke snídani.'
  },
  {
    id: 'T-PROCHAZKA', kind: 'advise', ruleId: 'R-PROCHAZKA', meal: 'dinner',
    title: 'Procházka po večeři',
    question: 'Pomůže mi, když se po jídle projdu?',
    conditions: 'Po večeři se svižně projdi podle rady aplikace.',
    burden: 'Jeden zápis denně k večeři.'
  },
  {
    id: 'T-REZIM', kind: 'advise', ruleId: 'R-REZIM', meal: 'breakfast',
    title: 'Změna režimu: snídaně v obvyklé porci a obvyklém čase',
    question: 'Co mi pomůže, když se k radám často nedostanu?',
    conditions: 'Jez snídani v obvyklém čase a v obvyklé porci. Aplikace dál radí jen tam, kde to jde bez přípravy navíc.',
    burden: 'Jeden zápis denně ke snídani.'
  }
];

/* Známý kontext pacienta z karty. Zobrazuje se, nevyplňuje se. */
D.patientContext = [
  ['Diagnóza', 'Diabetes 2. typu'],
  ['Léčba', 'Jen inzulin — bez perorálních antidiabetik'],
  ['Režim', 'Bazální inzulin 1× večer · prandiální inzulin ke snídani, obědu a večeři · pevné dávky'],
  ['Senzor', 'CGM zaveden 28. 9. 2026'],
  ['Poslední HbA1c', '62 mmol/mol (23. 9. 2026, syntetický údaj)']
];

D.compensations = [
  ['insufficient', 'Nedostatečná kompenzace'],
  ['acceptable', 'Přijatelná kompenzace']
];

D.decisionReasons = [
  'Rady fungují, když je pacient přijme; pokračovat ve stejném úkolu.',
  'Pacient rady většinou nechává být; probrat a zadat úkol na změnu režimu.',
  'Rada se ukázala jako nepraktická; pokračovat a sledovat jiné páky.',
  'Podkladů je zatím málo; pokračovat ve sběru.'
];
D.resumeReasons = [
  'Pacient je po nemoci zdravý; plán P1 platí beze změny.',
  'Data ze senzoru jsou zpět; plán P1 platí beze změny.',
  'Pravidlo je znovu ve schválené verzi; úkol může pokračovat.'
];
D.retireReasons = [
  'Text rady je nejasný — pacient ho může pochopit jako snížení sacharidů.',
  'Rada se nabízí v situaci, na kterou pravidlo není určené.',
  'Nová odborná opora mění obsah pravidla.'
];

function makeDraft() {
  return {
    planId: 'P1', version: 'v1',
    prescription: PRESCRIPTION,
    safety: SAFETY,
    taskId: null,
    medicationChecked: false,
    safetyChecked: false,
    validUntil: '2027-01-05T00:00:00'
  };
}

/* ---------- odbočky ---------- */
D.branches = {
  training: {
    label: 'Zaučení u sestry', from: 'training',
    options: [{ id: 'done', label: 'Zaučení proběhlo' }, { id: 'failed', label: 'Zaučení se nezdařilo — úkol se neaktivuje' }]
  },
  bolus: {
    label: 'Stav inzulinu při druhé radě', from: 'afterBolus',
    options: [{ id: 'after', label: 'Pacient už si píchl' }, { id: 'unknown', label: 'Pacient neví — chová se jako po bolusu' }]
  },
  disruption: {
    label: 'Co se stalo 20. října', from: 'disruption',
    options: [
      { id: 'illness', label: 'Pacient oznámil nemoc' },
      { id: 'gap-vendor', label: 'Výpadek — systém výrobce hodnoty ukazuje' },
      { id: 'gap-broken', label: 'Výpadek — pacient uvádí nefunkční senzor' },
      { id: 'gap-unknown', label: 'Výpadek — pacient neví' }
    ]
  },
  offline: {
    label: 'Zařízení pacienta při změně pravidla', from: 'catalog',
    options: [{ id: 'online', label: 'Online — změna doručena' }, { id: 'offline', label: 'Offline — doručení nepotvrzeno, rady vypnuté' }]
  },
  response: {
    label: 'Jak pacient s radami naložil (listopad–prosinec)', from: 'preview',
    options: [
      { id: 'accepts', label: 'Většinou přijal' },
      { id: 'declines', label: 'Většinou nepřijal — „nechci“, „nestihl jsem“' },
      { id: 'impractical', label: 'Většinou nepřijal — „nemám to doma“' }
    ]
  },
  review: {
    label: 'Podklad ke kontrole', from: 'preview',
    options: [
      { id: 'base', label: 'Běžný průběh' },
      { id: 'A', label: 'A — pacient nic nezapisoval' },
      { id: 'A0', label: 'A — chybí i senzorový souhrn' },
      { id: 'B', label: 'B — historická bezpečnostní událost' },
      { id: 'C', label: 'C — aktuální problém během návštěvy' }
    ]
  }
};
D.defaults = { training: 'done', bolus: 'after', disruption: 'illness', offline: 'online', response: 'accepts', review: 'base' };

/* ---------- společný výchozí stav ---------- */
function setup(S) {
  S.clock = '2026-10-05T09:00:00';
  S.rules = rules();
  S.foods = foods();
  S.tasks = [];
  S.draft = makeDraft();
  S.dataState = { lastValueAt: '2026-10-05T08:45:00', gap: false, patientCause: null, offline: false, simulated: true };
  S.nextVisit = '2027-01-05T09:00:00';
}
function enrolled(S) {
  NF.ELIGIBILITY.forEach(function (c) { NF.setEligibility(S, c[0], true); });
  S.enrollment.compensation = 'insufficient';
}
function taskItem(id) { return D.taskCatalog.filter(function (x) { return x.id === id; })[0]; }
function freshMeal(foodId, portion, bolus) {
  return { foodId: foodId || null, portion: portion || 'usual', bolus: bolus || null, decisions: {}, reasons: {}, desc: null };
}

/* Synthetic listopad–prosinec: deterministicky, podle odbočky „jak pacient s radami naložil“. */
function series(S, B) {
  if (S.episodes.some(function (x) { return x.id === 'E20'; })) return;
  var start = new Date('2026-10-24T07:00:00');
  var n = 36, i, day, food, adv, portion, r;
  var reasonsDecl = B.response === 'impractical' ? ['nothome', 'nothome', 'taste'] : ['nowant', 'time', 'nowant'];
  for (i = 0; i < n; i++) {
    day = new Date(start.getTime() + i * 2 * 86400000);
    var at = day.toISOString().slice(0, 11) + '07:' + (i % 2 ? '10' : '00') + ':00';
    food = ['kase', 'chleb', 'kase', 'musli', 'kase', 'chleb'][i % 6];
    portion = i % 7 === 3 ? 'bigger' : 'usual';
    r = (i * 7 + 3) % 10;
    var accept = B.response === 'accepts' ? r < 7 : r < 2;
    var reason = reasonsDecl[i % 3];
    adv = [];
    if (portion === 'bigger') adv.push({ lever: 'portion', accepted: B.response === 'accepts' ? true : r < 4, reason: B.response === 'accepts' || r < 4 ? null : reason });
    if (food === 'chleb') adv.push({ lever: 'order', ruleKey: 'R-PORADI|v2', accepted: accept, reason: accept ? null : reason });
    else adv.push({ lever: 'addon', accepted: accept, reason: accept ? null : reason },
      { lever: 'order', ruleKey: 'R-PORADI|v2', accepted: false, reason: accept ? null : reason });
    if (accept && food !== 'chleb') adv[adv.length - 1].accepted = null;
    add(S, { id: 'E' + (20 + i), food: food, at: at, portion: portion, advice: adv, insulin: i % 11 === 5 ? 'unknown' : 'per-plan' });
  }
}

/* ---------- kapitoly ----------
   setup = kulisy scény; platí, jakmile na kapitolu přijdeš.
   apply = akce, která se v té scéně teprve odehraje; platí, až scénu opustíš. */
var CH = [
  /* ---- Dějství 1 — V ordinaci ---- */
  {
    id: 'enroll', act: 0, title: 'Lékař — zařazení pacienta',
    role: 'doctor', page: 'issue', wizardStep: 0, at: '2026-10-05T09:00:00',
    apply: function (S) { enrolled(S); }
  },
  {
    id: 'plan', act: 0, title: 'Lékař — úkol z katalogu a vydání plánu',
    role: 'doctor', page: 'issue', wizardStep: 1, at: '2026-10-05T09:15:00',
    setup: function (S) { if (!S.tasks.length) NF.assignTask(S, taskItem('T-SNIDANE')); },
    apply: function (S) {
      S.draft.medicationChecked = true;
      S.draft.safetyChecked = true;
      NF.issuePlan(S, 'doctor');
      NF.handover(S);
    }
  },
  {
    id: 'training', act: 0, title: 'Sestra — zaučení a předání zařízení',
    role: 'nurse', page: 'training', at: '2026-10-05T09:35:00',
    apply: function (S, B) {
      NF.TRAINING.forEach(function (x) { S.training.steps[x[0]] = true; });
      if (B.training === 'failed') {
        S.training.steps.contacts = false;
        NF.finishTraining(S, 'nurse', 'failed', 'Pacient si zatím není jistý ovládáním; domluveno opakované zaučení.');
      } else {
        NF.finishTraining(S, 'nurse', 'done', '');
      }
    }
  },
  {
    id: 'handover', act: 0, title: 'Pacient — převzetí plánu',
    role: 'patient', page: 'takeover', at: '2026-10-05T09:50:00'
  },
  {
    id: 'understanding', act: 0, title: 'Pacient — ověření porozumění',
    role: 'patient', page: 'understand', at: '2026-10-05T09:55:00',
    apply: function (S, B) {
      if (B.training === 'failed') return;
      S.onboarding.checkAnswer = 'no';
      NF.confirmUnderstanding(S);
    }
  },

  /* ---- Dějství 2 — Doma: aplikace se učí ---- */
  {
    id: 'firstMeal', act: 1, title: 'Pacient — první snídaně: neznámé jídlo',
    role: 'patient', page: 'meal', at: '2026-10-06T07:00:00',
    setup: function (S) { S.meal = freshMeal(); },
    apply: function (S) { add(S, { id: 'E1', food: 'kase', at: '2026-10-06T07:05:00' }); S.meal = null; }
  },
  {
    id: 'learning', act: 1, title: 'Pacient — po týdnu: co už aplikace ví',
    role: 'patient', page: 'foods', at: '2026-10-12T19:00:00',
    setup: function (S) {
      add(S, { id: 'E2', food: 'chleb', at: '2026-10-07T07:05:00' });
      add(S, { id: 'E3', food: 'kase', at: '2026-10-08T07:10:00', insulin: 'unknown' });
      add(S, { id: 'E4', food: 'kase', at: '2026-10-09T07:00:00', portion: 'bigger' });
      add(S, { id: 'E5', food: 'chleb', at: '2026-10-10T07:05:00' });
      add(S, { id: 'E6', food: 'kase', at: '2026-10-11T07:00:00' });
      add(S, { id: 'E7', food: 'chleb', at: '2026-10-12T07:05:00' });
    }
  },

  /* ---- Dějství 3 — Rada před jídlem ---- */
  {
    id: 'advice', act: 2, title: 'Pacient — rada před inzulinem: porce a doplněk',
    role: 'patient', page: 'meal', at: '2026-10-14T07:00:00',
    setup: function (S) { S.meal = freshMeal('kase', 'bigger'); },
    apply: function (S) {
      add(S, { id: 'E8', food: 'kase', at: '2026-10-14T07:05:00', portion: 'bigger', bolus: 'before',
        advice: [{ lever: 'portion', accepted: true }, { lever: 'addon', accepted: true }, { lever: 'order' }] });
      S.meal = null;
    }
  },
  {
    id: 'afterBolus', act: 2, title: 'Pacient — po inzulinu: rada k porci se nedává',
    role: 'patient', page: 'meal', at: '2026-10-16T07:30:00',
    setup: function (S, B) { S.meal = freshMeal('kase', 'bigger', B.bolus); if (B.bolus === 'after') S.meal.insulinReported = 'per-plan'; },
    apply: function (S, B) {
      add(S, { id: 'E9', food: 'kase', at: '2026-10-16T07:30:00', portion: 'bigger', bolus: B.bolus,
        insulin: B.bolus === 'unknown' ? 'unknown' : 'per-plan',
        advice: [{ lever: 'addon', accepted: false, reason: 'nothome' }, { lever: 'order', accepted: false }] });
      S.meal = null;
    }
  },
  {
    id: 'similar', act: 2, title: 'Pacient — nové jídlo podobné známému',
    role: 'patient', page: 'meal', at: '2026-10-19T07:00:00',
    setup: function (S) {
      add(S, { id: 'E10', food: 'kase', at: '2026-10-17T07:00:00', bolus: 'before', advice: [{ lever: 'addon', accepted: true }, { lever: 'order' }] });
      add(S, { id: 'E11', food: 'chleb', at: '2026-10-18T07:05:00', bolus: 'before', advice: [{ lever: 'addon' }, { lever: 'order', accepted: false, reason: 'nowant' }] });
      S.meal = freshMeal('musli', 'usual');
    },
    apply: function (S) {
      add(S, { id: 'E12', food: 'musli', at: '2026-10-19T07:05:00', bolus: 'before', advice: [{ lever: 'addon', accepted: true }, { lever: 'order' }] });
      S.meal = null;
    }
  },

  /* ---- Dějství 4 — Když něco nesedí ---- */
  {
    id: 'unclear', act: 3, title: 'Pacient — nerozumím tomu, bezpečnostní plán',
    role: 'patient', page: 'unclear', at: '2026-10-20T10:00:00',
    setup: function (S, B) {
      if (B.training === 'failed') return;
      S.safetySyncAt = '2026-10-19T21:40:00';
      add(S, { id: 'E13', food: 'kase', at: '2026-10-20T08:00:00', gap: true });
      S.dataState.gap = true;
      S.dataState.lastValueAt = '2026-10-20T08:30:00';
    }
  },
  {
    id: 'disruption', act: 3, title: 'Pacient — nemoc nebo výpadek dat',
    role: 'patient', page: 'unclear', at: '2026-10-20T10:20:00',
    setup: function (S, B) {
      if (B.training === 'failed') return;
      S.unclearBranch = B.disruption === 'illness' ? 'ill' : 'past';
      if (B.disruption !== 'illness') {
        S.dataState.patientCause = B.disruption === 'gap-vendor' ? 'vendor-ok'
          : B.disruption === 'gap-broken' ? 'broken' : 'unknown';
      }
    },
    apply: function (S, B) {
      if (B.training === 'failed') return;
      if (B.disruption === 'illness') {
        NF.reportIllness(S);
        add(S, { id: 'E14', food: 'chleb', at: '2026-10-21T08:30:00', context: 'illness' });
      } else {
        NF.pauseTask(S, 'data', 'V NutriFee chybí senzorová data od ' + NF.fmtTime(S.dataState.lastValueAt) + '. Úkol je do ověření pozastavený.');
      }
    }
  },
  {
    id: 'resume', act: 3, title: 'Lékař — ověření a obnovení úkolu',
    role: 'doctor', page: 'resume', at: '2026-10-21T11:00:00',
    apply: function (S, B) {
      if (B.training === 'failed') return;
      NF.restoreData(S);
      if (S.illness && S.illness.active) NF.endIllness(S);
      NF.resumeTask(S, 'doctor', B.disruption === 'illness' ? D.resumeReasons[0] : D.resumeReasons[1]);
    }
  },

  /* ---- Dějství 5 — Správa pravidel ---- */
  {
    id: 'catalog', act: 4, title: 'Garant — podnět a vyřazení pravidla rady',
    role: 'garant', page: 'catalog', at: '2026-10-22T09:00:00',
    setup: function (S, B) {
      if (B.training === 'failed') return;
      S.safetySyncAt = '2026-10-21T22:10:00';
      S.impulse = {
        id: 'IMP-1',
        text: 'Při testu pacient pochopil radu R-PORADI v1 „sněz nejdřív jogurt“ jako náhradu přílohy a část kaše nedojedl. Při pevné dávce tím snížil sacharidy.',
        note: 'Jde o hlášený problém formulace, ne automaticky o závažnou nežádoucí příhodu.',
        versions: ['R-PORADI v1'],
        at: '2026-10-22T08:30:00'
      };
      NF.setOffline(S, B.offline === 'offline');
    },
    apply: function (S, B) {
      if (B.training === 'failed') return;
      NF.retireRule(S, 'garant', 'R-PORADI|v1', D.retireReasons[0]);
      S.lastRetire = 'R-PORADI|v1';
    }
  },
  {
    id: 'impact', act: 4, title: 'Pacient — rada zmizela, ostatní platí',
    role: 'patient', page: 'today', at: '2026-10-22T10:00:00'
  },
  {
    id: 'fix', act: 4, title: 'Garant — incident a schválení v2',
    role: 'garant', page: 'incidents', at: '2026-10-23T09:00:00',
    apply: function (S, B) {
      if (B.training === 'failed') return;
      NF.addIncident(S, { source: 'interní test', report: S.impulse ? S.impulse.text : '', versions: ['R-PORADI v1'], role: S.garant.id });
      var v2 = NF.ruleByKey(S, 'R-PORADI|v2');
      if (v2) v2.examplesReviewed = true;
      NF.approveRule(S, 'garant', 'R-PORADI|v2');
      NF.setOffline(S, false);
    }
  },

  /* ---- Dějství 6 — Kontrola a nový plán ---- */
  {
    id: 'preview', act: 5, title: 'Pacient — náhled reportu před kontrolou',
    role: 'patient', page: 'preview', at: '2027-01-04T18:00:00',
    setup: function (S, B) {
      if (B.training === 'failed') return;
      S.safetySyncAt = '2027-01-04T07:00:00';
      S.rulesSyncAt = '2027-01-04T07:00:00';
      series(S, B);
      if (!S.questions.length) S.questions.push({ id: 'Q1', at: '2027-01-04T18:10:00', text: 'Je v pořádku, že si ke kaši dávám jogurt skoro pokaždé?' });
      if (B.review === 'A' || B.review === 'A0') { S.episodes = []; S.questions = []; }
      S.sensorSummary = B.review === 'A0' ? null : {
        period: '22. 12. 2026 – 4. 1. 2027',
        availability: 91, tir: 64, below: 2, above: 34,
        range: '3,9–10,0 mmol/l',
        note: 'Předem vložené syntetické hodnoty, ne výpočet ze záznamů jídel.'
      };
      S.safetyEvents = B.review === 'B' ? [{
        id: 'SE1', at: '2026-12-29T02:00:00', reportedAt: '2027-01-04T18:20:00',
        source: 'zpětně nahlásil pacient',
        text: 'V noci mi bylo špatně, řešil jsem to podle plánu; chci to probrat.',
        assessment: null
      }] : [];
    }
  },
  {
    id: 'onepage', act: 5, title: 'Lékař — report: jak plán probíhal a jestli rady fungovaly',
    role: 'doctor', page: 'onepage', at: '2027-01-05T09:00:00',
    setup: function (S, B) {
      if (B.training === 'failed') return;
      S.visitInterrupted = B.review === 'C';
    }
  },
  {
    id: 'decide', act: 5, title: 'Lékař — rozhodnutí z připravených důvodů',
    role: 'doctor', page: 'decide', at: '2027-01-05T09:20:00',
    setup: function (S, B) {
      if (B.training === 'failed') return;
      S.visitInterrupted = false;
      S.form = S.form || {};
      S.form.choice = B.response === 'declines' ? 'regime' : 'continue';
      S.form.reason = D.decisionReasons[B.response === 'declines' ? 1 : B.response === 'impractical' ? 2 : 0];
      if (B.review === 'A' || B.review === 'A0') S.form.reason = D.decisionReasons[3];
    },
    apply: function (S, B) {
      if (B.training === 'failed') return;
      D.issueSecondPlan(S);
    }
  },
  {
    id: 'newplan', act: 5, title: 'Pacient — nový plán a jeho převzetí',
    role: 'patient', page: 'newplan', at: '2027-01-05T09:40:00',
    apply: function (S, B) {
      if (B.training === 'failed') return;
      NF.confirmUnderstanding(S);
    }
  },
  {
    id: 'result', act: 5, title: 'Výsledek demonstrace',
    role: 'doctor', page: 'result', at: '2027-01-05T09:50:00'
  }
];

D.acts = [
  { title: 'Dějství 1 — V ordinaci', note: 'Lékař zařadí a vydá plán, sestra zaučí a předá zařízení, pacient plán převezme. Nikdo nic nevypisuje.' },
  { title: 'Dějství 2 — Doma: aplikace se učí', note: 'Neznámé jídlo bez odhadu, po týdnu první známá jídla. „Zpřesňuje se“ je vidět na počtech.' },
  { title: 'Dějství 3 — Rada před jídlem', note: 'Otázka na inzulin, rada k porci jen před bolusem, rady bez sacharidů kdykoli, podobné jídlo bez čísla.' },
  { title: 'Dějství 4 — Když něco nesedí', note: 'Nemoc nebo výpadek dat: rady se vypnou, záznamy z nemoci se do učení nepočítají.' },
  { title: 'Dějství 5 — Správa pravidel', note: 'Nejasný text rady, vyřazení pravidla, rada zmizí, ostatní platí, schválení opravené verze.' },
  { title: 'Dějství 6 — Kontrola a nový plán', note: 'Report: jak plán probíhal a jestli rady fungovaly, když je pacient přijal. Rozhodnutí z připravených důvodů.' }
];

D.chapters = CH;

/* Vydání druhého plánu — používá i akce v UI. */
D.issueSecondPlan = function (S) {
  var prev = NF.activePlan(S);
  if (!prev || S.plans.length > 1) return { ok: false, error: 'Další plán už byl vydaný, nebo chybí platný plán.' };
  var choice = (S.form && S.form.choice) || 'continue';
  var reason = (S.form && S.form.reason) || '';
  if (!reason) return { ok: false, error: 'Vyber důvod rozhodnutí z připravených.' };
  S.draft = {
    planId: 'P2', version: 'v1', prescription: prev.prescription,
    safety: S.safetyPlan, taskId: null,
    medicationChecked: true, safetyChecked: true, validUntil: '2027-04-05T00:00:00', reviewReason: reason
  };
  var a = NF.assignTask(S, taskItem(choice === 'regime' ? 'T-REZIM' : 'T-SNIDANE'), 'T2');
  if (!a.ok) { S.draft = null; return a; }
  S.reviews.push(NF.buildReview(S));
  var r = NF.issuePlan(S, 'doctor');
  if (!r.ok) return r;
  NF.decideReview(S, 'doctor', { choice: choice, reason: reason });
  NF.handover(S);
  S.nextVisit = '2027-04-05T09:00:00';
  return { ok: true };
};

/* ---------- přehrání příběhu ----------
   Skok na kapitolu přehraje příběh deterministicky od začátku, takže stav
   odpovídá ručnímu průchodu. */
D.play = function (index, branches) {
  var idx = Math.max(0, Math.min(CH.length - 1, Number(index) || 0));
  var B = {};
  Object.keys(D.defaults).forEach(function (k) { B[k] = D.defaults[k]; });
  if (branches) Object.keys(branches).forEach(function (k) { if (branches[k]) B[k] = branches[k]; });

  var S = NF.createState();
  NF.resetUid();
  S.branches = B;
  setup(S);
  for (var i = 0; i < idx; i++) {
    S.clock = CH[i].at;
    if (CH[i].setup) CH[i].setup(S, B);
    if (CH[i].apply) CH[i].apply(S, B);
  }
  var ch = CH[idx];
  S.clock = ch.at;
  if (ch.setup) ch.setup(S, B);
  S.role = ch.role;
  S.page = ch.page;
  S.wizardStep = ch.wizardStep != null ? ch.wizardStep : 0;
  S.chapter = ch.id;
  S.chapterIndex = idx;
  /* Nezvládnuté zaučení je slepá ulička — příběh dál nepokračuje. */
  if (B.training === 'failed' && idx > 3) {
    S.chapterIndex = 2;
    S.chapter = CH[2].id;
    S.role = 'nurse'; S.page = 'training';
    S.clock = CH[2].at;
  }
  NF.log(S, 'story.play', S.chapter + ' · ' + JSON.stringify(B));
  return S;
};
D.indexOf = function (id) {
  for (var i = 0; i < CH.length; i++) if (CH[i].id === id) return i;
  return -1;
};

/* ---------- průchod na úrovni garanta ----------
   Cesta jen po schvalovacích bodech: „tohle bys musel podepsat“. */
D.garantRoute = [
  { title: 'Katalog úkolů', sign: 'Které úkoly smí lékař vybrat. Úkol s neschváleným pravidlem je vidět, ale nejde přiřadit.', chapter: 'plan', rules: ['R-REAKCE', 'R-ROZLOZENI', 'R-REZIM', 'R-PROCHAZKA'] },
  { title: 'Vyhodnocení reakce na jídlo', sign: 'Co je „vzestup“, od kolika úplných záznamů je jídlo známé a které záznamy se nepočítají.', chapter: 'learning', rules: ['R-REAKCE'] },
  { title: 'Neznámé jídlo bez odhadu', sign: 'Že aplikace u jídla bez podobných nic neodhaduje, jen nabídne zapsat.', chapter: 'firstMeal', rules: ['R-REAKCE'] },
  { title: 'Podobné jídlo bez čísla', sign: 'Z jakých vlastností se počítá podobnost a jaký je práh. Směr se říká, číslo ne.', chapter: 'similar', rules: ['R-PODOBNOST'] },
  { title: 'Rada k porci jen před bolusem', sign: 'Porce se řídí k obvyklé oběma směry. „Dej si menší porci“ se neříká nikdy.', chapter: 'advice', rules: ['R-PORCE'] },
  { title: 'Neznámý stav podání = po bolusu', sign: 'Že při „nevím“ se rada měnící sacharidy nedá.', chapter: 'afterBolus', branch: { bolus: 'unknown' }, rules: ['R-PORCE'] },
  { title: 'Rady, které nemění sacharidy', sign: 'Texty rad a kdy se nabízejí. Rady bez schválení (příloha, odstup, procházka) se k pacientovi nedostanou.', chapter: 'advice', rules: ['R-DOPLNEK', 'R-PORADI', 'R-PRILOHA-FORMA', 'R-ODSTUP', 'R-PROCHAZKA'] },
  { title: 'Kdy aplikace neradí', sign: 'Nemoc, pozastavený úkol, ztráta spojení s pravidly.', chapter: 'disruption', rules: [] },
  { title: 'Vyřazení a nová verze pravidla', sign: 'Kdo vyřazuje, jak rychle rada zmizí a co když zařízení není online.', chapter: 'catalog', branch: { offline: 'offline' }, rules: ['R-PORADI'] },
  { title: 'Report „přijato vs. nepřijato“', sign: 'Co lékař vidí na kontrole a jak se liší „pacient radu nechce“ od „rada je nepraktická“.', chapter: 'onepage', branch: { response: 'impractical' }, rules: ['R-REAKCE'] },
  { title: 'Úkol na změnu režimu', sign: 'Kdy ho lékař vydá a že se tím nemění dávka.', chapter: 'decide', branch: { response: 'declines' }, rules: ['R-REZIM'] }
];

/* ---------- okrajové situace ---------- */
D.edgeCases = [
  { id: 'holiday', title: 'Dovolená / změna režimu', answer: 'Období je označené, úkol pozastavený, zapsané časy zůstávají. Rady k jídlu se nenabízejí a nikdy žádné rady k posunu inzulinu.' },
  { id: 'motivation', title: 'Třetí měsíc bez motivace', answer: 'Nabídneme volby „je to moc práce“, „nerozumím“, „teď nechci“ → pomoc nebo pauza. Žádný trest ani hodnocení. Na kontrole to lékař uvidí jako signál k rozhovoru.' },
  { id: 'otherdoc', title: 'Změna léčby jiným lékařem', answer: 'Pacient změnu nahlásí. Rady se pozastaví, protože učení stojí na pevných dávkách. Úkol čeká na ověření plánu.' },
  { id: 'expired', title: 'Odložená kontrola / konec platnosti plánu', answer: 'Zobrazíme potřebu ověření a kontakt. Nikdy pokyn přestat podávat inzulin.' },
  { id: 'carer', title: 'Pečující osoba', answer: 'Výchozí demo ukazuje pomoc při obsluze bez samostatného účtu. Samostatný přístup je otevřená volba; oprávnění nejsou vyřešena.' },
  { id: 'newdoc', title: 'Změna lékaře', answer: 'Předání podkladu a stav „převzetí nepotvrzeno“. Nový lékař nezíská přístup automaticky.' },
  { id: 'hosp', title: 'Hospitalizace', answer: 'Ručně oznámená pauza. Záznamy z hospitalizace se nepočítají do učení. Obnovení po kontrole aktuální léčby a plánu.' },
  { id: 'end', title: 'Ukončení účasti / konec studie', answer: 'Zastavené úkoly a rady, modelové předání pokynů a další péče, informace o dostupnosti dokumentů.' },
  { id: 'consent', title: 'Odvolání souhlasu', answer: 'Rozlišíme ukončení účasti, druhotné použití a požadavek výmazu. Zobrazíme modelové přijetí požadavku bez skutečného mazání a bez slibu výmazu všech dat.' },
  { id: 'death', title: 'Úmrtí', answer: 'Ručně vložené ověřené oznámení oprávněnou rolí, konec připomínek a účasti. Žádný závěr z neaktivity.' }
];

/* ---------- rozhodovací list garanta ---------- */
D.decisionList = [
  { key: 'odhad', title: 'Odhad reakce a jeho nejistota', q: 'Na čem stojí odhad reakce na jídlo a s jakou nejistotou se pacientovi ukazuje?',
    proposal: 'Vzestup 0–120 minut z vlastních úplných záznamů; známé jídlo od 3 záznamů; podobné bez čísla; neznámé bez odhadu. Počet záznamů je vždy vidět.' },
  { key: 'rady', title: 'Přípustné typy rad a kdy', q: 'Které páky smí aplikace nabízet a za jakých podmínek?',
    proposal: 'Jen před bolusem: porce k obvyklé, příloha s jiným množstvím. Kdykoli: příloha jiné podoby, doplněk, pořadí, odstup, procházka. Neznámý stav podání = po bolusu. Při nemoci a bez spojení se neradí.' },
  { key: 'pohyb', title: 'Hranice pohybu po bolusu', q: 'Jaký pohyb po jídle a po podání prandiálního inzulinu je přípustné doporučit?',
    proposal: 'V maketě bez hodnot. Pravidlo R-PROCHAZKA je návrh a k pacientovi se nedostane.' },
  { key: 'porce', title: 'Co je obvyklá porce', q: 'Jak se obvyklá porce určí a kdo ji nastaví?',
    proposal: 'Obvyklá porce je v katalogu jídel; pacient volí obvyklá / větší / menší. Sacharidy se odhadují z katalogu, ne z vážení.' },
  { key: 'katalog', title: 'Katalog úkolů', q: 'Které úkoly patří do první studie a kolik jich má být?',
    proposal: 'Snídaně: aplikace se učí a radí; rozložení sacharidů mezi dny; úkol na změnu režimu. Procházka až po schválení hranic.' },
  { key: 'data', title: 'Zdroj a licence potravinových dat', q: 'Odkud se vezmou vlastnosti jídel a za jakých licenčních podmínek?',
    proposal: 'V maketě syntetický katalog čtyř jídel. Skutečný zdroj ani licence nejsou vybrané.' },
  { key: 'regulace', title: 'Regulatorní zařazení', q: 'Aplikace, která odhaduje reakci na jídlo a doporučuje úpravu jídla, dělá klinické tvrzení. Jaká je třída rizika podle MDR a co z ní plyne pro studii?',
    proposal: 'Maketa to neřeší. K ověření.' },
  { key: 'provoz', title: 'Provoz', q: 'Kdo řeší neúspěšné zaučení, incident, nedoručenou změnu pravidla a předání při odchodu?' },
  { key: 'pilot', title: 'Pilot', q: 'Co je úspěch u rozdílu „přijato vs. nepřijato“, jak se změří práce ambulance a jaké budou stop/go podmínky?' }
];

/* ---------- otázky pro garanta podle dějství ---------- */
D.garantQuestions = [
  ['Jaká jsou praktická vstupní kritéria kohorty?', 'Které úkoly patří do katalogu?', 'Kdo řeší neúspěšné zaučení?'],
  ['Od kolika úplných záznamů je jídlo „známé“?', 'Které záznamy se do učení nepočítají?', 'Je vzestup 0–120 minut správná míra reakce?'],
  ['Které páky jsou přípustné a kdy?', 'Je správné neznámý stav podání brát jako „po bolusu“?', 'Jak se ukazuje nejistota u podobného jídla?'],
  ['Které stavy vypínají rady a kdo je obnovuje?', 'Jak odlišit technickou a klinickou pomoc?'],
  ['Kdo řeší incident a nedoručenou změnu pravidla?', 'Má aplikace bez spojení rady vypnout, jak je navrženo?'],
  ['Je srovnání „přijato vs. nepřijato“ z malého počtu záznamů dost na rozhodnutí?', 'Kdy vydat úkol na změnu režimu?', 'Jak poznat nepraktickou radu?']
];

D.PRESCRIPTION = PRESCRIPTION;
D.SAFETY = SAFETY;
D.rules = rules;
D.foods = foods;

})(typeof window !== 'undefined' ? window : globalThis);
