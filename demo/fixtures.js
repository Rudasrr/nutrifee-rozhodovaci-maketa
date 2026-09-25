/* Modelová data a jeden souvislý příběh. Součást demonstrační vrstvy.
   Produkční sestavení tento soubor nezahrnuje; jádro pak startuje v prázdném
   přípravném stavu a data by četlo ze skutečného zdroje.

   Příběh je jedna linka od ordinace dál. Nemoc, výpadek dat, změna pravidla
   a kontrola jsou kapitoly téhož příběhu, ne samostatné starty. */
(function (global) {
'use strict';
var NF = global.NutriFee;
var D = global.NutriFeeDemo = global.NutriFeeDemo || {};

var PRESCRIPTION = 'Bazální inzulin: dávka dle modelového předpisu P1. Prandiální inzulin: dávky dle modelového předpisu P1.';
var QUESTION = 'Po podobné snídani mám někdy jiný průběh. Co se z toho můžu dozvědět?';

var SAFETY = {
  version: 'BP-v1',
  approvedNote: 'Konkrétní postup a meze doplní a schválí klinický garant.',
  sections: [
    { id: 'low', title: 'Nízká hodnota glukózy', body: 'Postupuj podle pokynů, které ti dal tvůj lékař při zaučení. Konkrétní meze a postup zde doplní klinický garant.' },
    { id: 'ill', title: 'Nemoc, zvracení nebo nemožnost pít', body: 'Inzulin se při nemoci obvykle nevysazuje. Přesný postup určí tvůj lékař. Pokud nemůžeš pít, kontaktuj ordinaci nebo pohotovost.' },
    { id: 'high', title: 'Přetrvávající vysoké hodnoty a ketony', body: 'Postup pro měření ketonů a další kroky doplní klinický garant podle tvého pracoviště.' },
    { id: 'miss', title: 'Vynechaný inzulin nebo porucha podání', body: 'Zaznamenej, co se stalo, a řiď se pokynem svého lékaře. NutriFee dávku nedopočítává ani nenavrhuje.' },
    { id: 'closed', title: 'Nedostupná ordinace', body: 'Mimo ordinační hodiny se řiď postupem, který ti pracoviště předalo. NutriFee zprávy neodesílá a nikdo tvůj zápis průběžně nesleduje.' },
    { id: 'acute', title: 'Akutní situace', body: 'Při bezvědomí, křečích, dušnosti nebo jiném ohrožení volej záchrannou službu běžnou cestou. NutriFee není tísňová linka.' }
  ]
};

function rules() {
  return [
    {
      id: 'R-SNIDANE', version: 'v1', status: 'approved',
      title: 'Pozorování jedné běžné snídaně',
      purpose: 'Umožnit pacientovi zaznamenat několik podobných snídaní a popsat, co z nich lze a nelze vyčíst.',
      population: 'Dospělý s DM2, stabilní bazál–bolus režim, nově zavedený senzor.',
      inputs: ['čas a popis jídla', 'pacientem uvedený inzulin a jeho čas nebo „nevím“', 'senzorový úsek 0–120 minut'],
      limits: ['Pouze pozorování. Nevydává změnovou radu k jídlu ani pohybu.', 'Neurčuje příčinu rozdílu mezi průběhy.', 'Nepoužívá se k hodnocení jednotlivé potraviny.'],
      text: 'Zaznamenej tři podobné snídaně. Aplikace ukáže zaznamenané průběhy vedle sebe a upozorní, u které epizody chybí kontext.',
      approvedBy: 'DEMO-G01', approvedAt: '2026-09-28T10:00:00',
      examplesReviewed: true,
      examples: {
        use: ['Pacient se ptá, proč má po stejné snídani jiný průběh.'],
        skip: ['Pacient žádá o úpravu dávky inzulinu.', 'Pacient je nemocný nebo má nejasnou platnost plánu.']
      },
      tasks: ['T1']
    },
    {
      id: 'R-SNIDANE', version: 'v2', status: 'draft',
      title: 'Pozorování jedné běžné snídaně — návrh v2',
      purpose: 'Doplnit chybějící větu o tom, že se pravidlo nepoužívá v období nemoci.',
      population: 'Stejná jako v1.',
      inputs: ['stejné jako v1'],
      limits: ['Stejná omezení jako v1.', 'Nově výslovně: v období oznámené nemoci se pozorování nezahajuje a probíhající se pozastaví.'],
      text: 'Zaznamenej tři podobné snídaně. Pokud jsi nemocný, pozorování teď neprobíhá — vrátíme se k němu po domluvě s lékařem.',
      examplesReviewed: false,
      examples: {
        use: ['Pacient se ptá na rozdíly po snídani a není nemocný.'],
        skip: ['Období oznámené nemoci.', 'Nejasná platnost plánu.']
      },
      tasks: []
    },
    {
      id: 'R-VECERE', version: 'v1', status: 'draft',
      title: 'Pozorování jedné běžné večeře',
      purpose: 'Rozšířit pozorování na večerní jídlo.',
      population: 'Stejná jako u snídaně.',
      inputs: ['čas a popis jídla', 'pacientem uvedený inzulin a jeho čas nebo „nevím“', 'senzorový úsek 0–120 minut'],
      limits: ['Návrh k posouzení. Dokud není modelově schválený, nelze úkol přiřadit pacientovi.'],
      text: 'Zaznamenej tři podobné večeře.',
      examplesReviewed: false,
      examples: { use: ['Pacient se ptá na večerní průběhy.'], skip: ['Období oznámené nemoci.'] },
      tasks: []
    },
    {
      id: 'R-POHYB', version: 'v1', status: 'draft',
      title: 'Pozorování procházky po jídle',
      purpose: 'Ukázat, zda pacient dokáže zaznamenat souvislost jídla a pohybu.',
      population: 'Stejná jako u snídaně.',
      inputs: ['čas jídla', 'čas a délka procházky', 'senzorový úsek 0–120 minut'],
      limits: ['Návrh k posouzení.', 'Pozorovací úkol. Nevydává radu ke změně pohybu.'],
      text: 'Zaznamenej tři procházky po stejném typu jídla.',
      examplesReviewed: false,
      examples: { use: ['Pacient se sám ptá na vliv pohybu.'], skip: ['Pacient žádá plán cvičení.'] },
      tasks: []
    },
    {
      id: 'PROTO-BAZAL-DEMO', version: 'koncept', status: 'concept',
      title: 'Koncept protokolu samotitrace bazálu',
      purpose: 'Ukázat, jaká pole by protokol musel mít, aby o něm šlo rozhodnout. Neobsahuje klinické hodnoty.',
      population: 'K doplnění garantem.',
      inputs: ['krok titrace — k doplnění garantem', 'interval — k doplnění garantem', 'cíl — k doplnění garantem'],
      limits: [
        'Neschválený koncept. Není dostupný v běžném pacientském průchodu.',
        'NutriFee nesmí dávku vypočítat ani sama změnit. Statická tabulka provádějící tutéž volbu je rovněž mimo zadání.',
        'Stop-pravidla, podmínky obnovení, odpovědný lékař a předání — k doplnění garantem.'
      ],
      text: '[Klinický obsah protokolu musí dodat a schválit garant.]',
      examplesReviewed: false,
      examples: { use: [], skip: [] },
      tasks: []
    }
  ];
}

/* Katalog úkolů je předem definovaný. Lékař v ordinaci nic nepíše, jen vybírá.
   Úkol lze vybrat jen tehdy, má-li jeho pravidlo modelově schválenou verzi. */
D.taskCatalog = [
  {
    id: 'T-SNIDANE', kind: 'observe', ruleId: 'R-SNIDANE',
    title: 'Pozoruji jednu běžnou snídani.',
    question: 'Po podobné snídani mám někdy jiný průběh. Co se z toho můžu dozvědět?',
    conditions: 'Zaznamenej tři podobné snídaně. U každé uveď čas, popis a údaj o inzulinu, nebo „nevím“.',
    minimum: 'Epizoda je úplná, když má popis, údaj o inzulinu s časem a senzorový úsek po jídle.',
    burden: 'Tři zápisy během dvou týdnů, každý do dvou minut.',
    target: 3
  },
  {
    id: 'T-VECERE', kind: 'observe', ruleId: 'R-VECERE',
    title: 'Pozoruji jednu běžnou večeři.',
    question: 'Po večeři mi průběh vypadá jinak než přes den. Co z toho jde vyčíst?',
    conditions: 'Zaznamenej tři podobné večeře. U každé uveď čas, popis a údaj o inzulinu, nebo „nevím“.',
    minimum: 'Stejné jako u snídaně.',
    burden: 'Tři zápisy během dvou týdnů.',
    target: 3
  },
  {
    id: 'T-POHYB', kind: 'observe', ruleId: 'R-POHYB',
    title: 'Pozoruji jednu běžnou procházku po jídle.',
    question: 'Změní se něco, když se po jídle projdu?',
    conditions: 'Zaznamenej tři procházky po stejném typu jídla.',
    minimum: 'Epizoda je úplná, když má čas jídla, čas procházky a senzorový úsek.',
    burden: 'Tři zápisy během dvou týdnů.',
    target: 3
  }
];

/* Známý kontext pacienta z karty. Zobrazuje se, nevyplňuje se. */
D.patientContext = [
  ['Diagnóza', 'Diabetes 2. typu'],
  ['Režim', 'Bazál–bolus, tři dávky inzulinu denně, dlouhodobě stabilní'],
  ['Senzor', 'CGM zaveden 28. 9. 2026 — nově'],
  ['Poslední HbA1c', '62 mmol/mol (23. 9. 2026, syntetický údaj)'],
  ['Modelový seznam léčby', 'Bazální inzulin večer · prandiální inzulin ke třem hlavním jídlům · metformin ráno a večer']
];

D.compensations = [
  ['insufficient', 'Nedostatečná kompenzace'],
  ['acceptable', 'Přijatelná kompenzace']
];

D.decisionReasons = [
  'Dostupný kontext neumožňuje připsat rozdíl konkrétní příčině.',
  'Kontext potvrdil očekávání; plán zůstává beze změny.',
  'Podkladů je málo; chci pokračovat ve stejném pozorování.'
];

function makeTask(catalogId) {
  var c = D.taskCatalog.filter(function (x) { return x.id === (catalogId || 'T-SNIDANE'); })[0];
  return {
    id: 'T1', catalogId: c.id, kind: c.kind, state: 'prepared',
    question: c.question, title: c.title,
    ruleId: c.ruleId, ruleVersion: 'v1',
    conditions: c.conditions, minimum: c.minimum, burden: c.burden,
    target: c.target, planId: null, conclusion: null, pauseReason: null
  };
}

function makeDraft() {
  return {
    planId: 'P1', version: 'v1',
    prescription: PRESCRIPTION,
    safety: SAFETY,
    taskId: 'T1',
    allowChange: false,
    medicationChecked: false,
    safetyChecked: false,
    validUntil: '2027-01-05T00:00:00',
    note: ''
  };
}

var POINTS_MIN = [0, 30, 60, 90, 120];
function pts(values, at) {
  return POINTS_MIN.map(function (m, i) {
    var d = new Date(at); d.setMinutes(d.getMinutes() + m);
    return { min: m, at: d.toISOString().slice(0, 19), mmol: values[i] };
  });
}
function emptyPts() {
  return POINTS_MIN.map(function (m) { return { min: m, at: null, mmol: null }; });
}

var BREAKFAST = 'Chléb, sýr a neslazený čaj; pacient uvádí obvyklou porci';
var MEALS = [
  { id: 'E1', at: '2026-10-06T07:30:00', values: [7.2, 8.1, 9.6, 8.8, 7.9], insulin: { reported: 'per-plan', time: '07:15' }, circ: '' },
  { id: 'E2', at: '2026-10-08T07:30:00', values: [7.4, 8.9, 10.7, 9.9, 8.5], insulin: { reported: 'unknown', time: null }, circ: 'Spěchal jsem.' },
  { id: 'E3', at: '2026-10-10T07:30:00', values: [7.1, 8.0, 9.2, 8.4, 7.7], insulin: { reported: 'per-plan', time: '07:15' }, circ: '' }
];

function meal(spec, noSensor) {
  return {
    id: spec.id, taskId: 'T1', planId: 'P1',
    at: spec.at, recordedAt: spec.at.slice(0, 11) + '08:05:00',
    desc: BREAKFAST, usualPortion: true,
    insulin: { reported: spec.insulin.reported, time: spec.insulin.time },
    circumstances: spec.circ,
    points: noSensor ? emptyPts() : pts(spec.values, spec.at),
    importedAt: noSensor ? null : spec.at.slice(0, 11) + '11:00:00',
    author: 'DEMO-P01', history: []
  };
}

/* ---------- odbočky (mimo hlavní linku) ---------- */
D.branches = {
  training: {
    label: 'Zaučení u sestry',
    from: 'training',
    options: [
      { id: 'done', label: 'Zaučení proběhlo' },
      { id: 'failed', label: 'Zaučení se nezdařilo — úkol se neaktivuje' }
    ]
  },
  evidence: {
    label: 'Podklady ze snídaní',
    from: 'compare',
    options: [
      { id: 'full', label: 'Tři snídaně, dvě s kontextem' },
      { id: 'thin', label: 'Málo podkladů — u E3 chybí senzorová data' }
    ]
  },
  disruption: {
    label: 'Co se stalo 20. října',
    from: 'disruption',
    options: [
      { id: 'illness', label: 'Pacient oznámil nemoc' },
      { id: 'gap-vendor', label: 'Výpadek — systém výrobce hodnoty ukazuje' },
      { id: 'gap-broken', label: 'Výpadek — pacient uvádí nefunkční senzor' },
      { id: 'gap-unknown', label: 'Výpadek — pacient neví' }
    ]
  },
  offline: {
    label: 'Zařízení pacienta při změně pravidla',
    from: 'catalog',
    options: [
      { id: 'online', label: 'Online — změna doručena' },
      { id: 'offline', label: 'Offline — doručení nepotvrzeno' }
    ]
  },
  review: {
    label: 'Podklad ke kontrole',
    from: 'preview',
    options: [
      { id: 'base', label: 'Zaznamenaný kontext' },
      { id: 'A', label: 'A — pacient nic nezapisoval' },
      { id: 'A0', label: 'A — chybí i senzorový souhrn' },
      { id: 'B', label: 'B — historická bezpečnostní událost' },
      { id: 'C', label: 'C — aktuální problém během návštěvy' }
    ]
  },
  dose: {
    label: 'Dávkové podklady (panel lékaře)',
    from: 'onepage',
    options: [
      { id: 'off', label: 'Nezobrazovat' },
      { id: 'on', label: 'D — zobrazit otevřenou variantu' }
    ]
  }
};
D.defaults = { training: 'done', evidence: 'full', disruption: 'illness', offline: 'online', review: 'base', dose: 'off' };

/* ---------- společný výchozí stav ---------- */
function setup(S) {
  S.clock = '2026-10-05T09:00:00';
  S.rules = rules();
  S.tasks = [];
  S.draft = makeDraft();
  S.draft.taskId = null;
  S.dataState = { lastValueAt: '2026-10-05T08:45:00', gap: false, patientCause: null, offline: false, simulated: true };
  S.nextVisit = '2027-01-05T09:00:00';
}

function enrolled(S) {
  NF.ELIGIBILITY.forEach(function (c) { NF.setEligibility(S, c[0], true); });
  S.enrollment.compensation = 'insufficient';
}

function pickTask(S) {
  if (S.tasks.length) return;
  S.tasks.push(makeTask('T-SNIDANE'));
  S.draft.taskId = 'T1';
}

/* ---------- kapitoly ----------
   setup = kulisy scény; platí, jakmile na kapitolu přijdeš.
   apply = akce, která se v té scéně teprve odehraje; platí, až scénu opustíš.
   Díky tomu kapitola ukazuje výchozí stav a prezentující ji odehraje. */
var CH = [
  /* ---- Dějství 1 — V ordinaci ----
     Lékař rozhodne a vydá plán. Zaučení a předání zařízení vede sestra.
     Úkol se aktivuje až po zaučení a ověření porozumění. */
  {
    id: 'enroll', act: 0, title: 'Lékař — zařazení pacienta',
    role: 'doctor', page: 'issue', wizardStep: 0, at: '2026-10-05T09:00:00',
    apply: function (S) { enrolled(S); }
  },
  {
    id: 'plan', act: 0, title: 'Lékař — úkol z katalogu a vydání plánu',
    role: 'doctor', page: 'issue', wizardStep: 1, at: '2026-10-05T09:15:00',
    setup: function (S, B) { pickTask(S); },
    apply: function (S, B) {
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

  /* ---- Dějství 2 — Doma, první zkušenost ---- */
  {
    id: 'firstMeal', act: 1, title: 'Pacient — první snídaně',
    role: 'patient', page: 'episode', at: '2026-10-06T07:30:00',
    apply: function (S, B) {
      if (B.training === 'failed') return;
      S.episodes.push(meal(MEALS[0], false));
    }
  },
  {
    id: 'compare', act: 1, title: 'Pacient — tři snídaně a porovnání',
    role: 'patient', page: 'compare', at: '2026-10-10T11:30:00',
    setup: function (S, B) {
      if (B.training === 'failed') return;
      if (!S.episodes.some(function (x) { return x.id === 'E2'; })) {
        S.episodes.push(meal(MEALS[1], false));
        S.episodes.push(meal(MEALS[2], B.evidence === 'thin'));
      }
    }
  },

  /* ---- Dějství 3 — Když něco nesedí ---- */
  {
    id: 'unclear', act: 2, title: 'Pacient — nerozumím tomu, bezpečnostní plán',
    role: 'patient', page: 'unclear', at: '2026-10-20T10:00:00',
    setup: function (S, B) {
      if (B.training === 'failed') return;
      S.safetySyncAt = '2026-10-19T21:40:00';
      if (!S.episodes.some(function (x) { return x.id === 'E4'; })) {
        S.episodes.push({
          id: 'E4', taskId: 'T1', planId: 'P1',
          at: '2026-10-20T08:00:00', recordedAt: '2026-10-20T08:20:00',
          desc: BREAKFAST, usualPortion: true,
          insulin: { reported: 'per-plan', time: '07:45' }, circumstances: '',
          points: [
            { min: 0, at: '2026-10-20T08:00:00', mmol: 7.3 },
            { min: 10, at: '2026-10-20T08:10:00', mmol: 7.8 },
            { min: 60, at: null, mmol: null },
            { min: 90, at: null, mmol: null },
            { min: 120, at: null, mmol: null }
          ],
          importedAt: '2026-10-20T08:12:00', author: 'DEMO-P01', history: []
        });
      }
      S.dataState.gap = true;
      S.dataState.lastValueAt = '2026-10-20T08:10:00';
    }
  },
  {
    id: 'disruption', act: 2, title: 'Pacient — nemoc nebo výpadek dat',
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
      if (B.disruption === 'illness') NF.reportIllness(S);
      else NF.pauseTask(S, 'data', 'V NutriFee chybí senzorová data od ' + NF.fmtTime(S.dataState.lastValueAt) + '. Pozorování je do ověření pozastavené.');
    }
  },
  {
    id: 'resume', act: 2, title: 'Lékař — ověření a obnovení úkolu',
    role: 'doctor', page: 'resume', at: '2026-10-21T11:00:00',
    apply: function (S, B) {
      if (B.training === 'failed') return;
      NF.restoreData(S);
      if (S.illness && S.illness.active) NF.endIllness(S);
      NF.resumeTask(S, 'doctor', 'Ověřil jsem aktuálnost plánu P1. Pozorování může pokračovat.');
    }
  },

  /* ---- Dějství 4 — Správa pravidel ---- */
  {
    id: 'catalog', act: 3, title: 'Garant — podnět a vyřazení pravidla',
    role: 'garant', page: 'catalog', at: '2026-10-22T09:00:00',
    setup: function (S, B) {
      if (B.training === 'failed') return;
      S.safetySyncAt = '2026-10-21T22:10:00';
      S.impulse = {
        id: 'IMP-1',
        text: 'Při testu bylo zjištěno, že formulace pravidla pro pozorování nejasně popisuje použití při nemoci.',
        note: 'Jde o hlášený problém formulace, ne automaticky o závažnou nežádoucí příhodu.',
        at: '2026-10-22T08:30:00'
      };
      NF.setOffline(S, B.offline === 'offline');
    },
    apply: function (S, B) {
      if (B.training === 'failed') return;
      NF.retireRule(S, 'garant', 'R-SNIDANE|v1', 'Formulace nejasně popisuje použití při nemoci.');
      S.lastRetire = 'R-SNIDANE|v1';
    }
  },
  {
    id: 'impact', act: 3, title: 'Pacient — pozastavený úkol, online i offline',
    role: 'patient', page: 'today', at: '2026-10-22T10:00:00'
  },
  {
    id: 'fix', act: 3, title: 'Garant — incident, schválení v2 a obnovení',
    role: 'garant', page: 'incidents', at: '2026-10-23T09:00:00',
    apply: function (S, B) {
      if (B.training === 'failed') return;
      NF.addIncident(S, {
        source: 'interní test', report: S.impulse ? S.impulse.text : '',
        versions: ['R-SNIDANE v1'], role: S.garant.id
      });
      var v2 = NF.ruleByKey(S, 'R-SNIDANE|v2');
      if (v2) v2.examplesReviewed = true;
      NF.approveRule(S, 'garant', 'R-SNIDANE|v2');
      var t = NF.taskById(S, 'T1');
      if (t) t.ruleVersion = 'v2';
      NF.setOffline(S, false);
      NF.resumeTask(S, 'doctor', 'Pravidlo je v modelově schválené verzi v2. Pozorování může pokračovat.');
    }
  },

  /* ---- Dějství 5 — Uzavření úkolu ---- */
  {
    id: 'conclude', act: 4, title: 'Pacient — závěr a dokončení úkolu',
    role: 'patient', page: 'conclude', at: '2026-10-25T18:00:00',
    apply: function (S, B) {
      if (B.training === 'failed') return;
      NF.completeTask(S, D.conclusions[B.evidence === 'thin' ? 1 : 0]);
    }
  },

  /* ---- Dějství 6 — Kontrola a nový plán ---- */
  {
    id: 'preview', act: 5, title: 'Pacient — náhled podkladu před kontrolou',
    role: 'patient', page: 'preview', at: '2026-12-05T09:00:00',
    setup: function (S, B) {
      if (B.training === 'failed') return;
      S.safetySyncAt = '2026-12-04T20:00:00';
      if (!S.questions.length) S.questions.push({ id: 'Q1', at: '2026-12-05T09:10:00', text: 'Co z rozdílů po snídani stojí za to dál pozorovat?' });
      if (B.review === 'A' || B.review === 'A0') S.episodes = [];
      S.findings = S.episodes.length ? [{
        id: 'F1',
        text: 'Tři říjnové snídaně označené pacientem jako podobné; dvě s potřebným kontextem, jedna bez údaje o inzulinu. Nelze určit příčinu rozdílu.',
        source: 'Pacientské zápisy E1–E3 a senzorové úseky 0–120 minut.',
        period: '6.–10. 10. 2026',
        limit: 'Podobnost jídel je pacientský údaj. Kontext nestačí k určení příčiny.'
      }] : [];
      S.sensorSummary = B.review === 'A0' ? null : {
        period: '22. 12. 2026 – 4. 1. 2027',
        availability: 91, tir: 62, below: 2, above: 36,
        range: '3,9–10,0 mmol/l',
        note: 'Předem vložené syntetické hodnoty. Nejsou vypočtené z pěti bodů snídaňových epizod.'
      };
      S.safetyEvents = B.review === 'B' ? [{
        id: 'SE1', at: '2026-12-29T02:00:00', reportedAt: '2027-01-04T18:20:00',
        source: 'zpětně nahlásil pacient',
        text: 'Řešil jsem podle svého plánu; chci to probrat.',
        assessment: null
      }] : [];
      S.doseBasis = B.dose === 'on' ? 'open' : null;
    }
  },
  {
    id: 'onepage', act: 5, title: 'Lékař — kontrola na jedné stránce',
    role: 'doctor', page: 'onepage', at: '2027-01-05T09:00:00',
    setup: function (S, B) {
      if (B.training === 'failed') return;
      S.visitInterrupted = B.review === 'C';
    }
  },
  {
    id: 'decide', act: 5, title: 'Lékař — důkaz a rozhodnutí',
    role: 'doctor', page: 'decide', at: '2027-01-05T09:20:00',
    setup: function (S, B) {
      if (B.training === 'failed') return;
      S.visitInterrupted = false;
      S.form = S.form || {};
      S.form.choice = 'unchanged';
      S.form.reason = 'Dostupný kontext neumožňuje připsat rozdíl konkrétní příčině.';
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
  { title: 'Dějství 1 — V ordinaci', note: 'Lékař zařadí a vydá plán, sestra zaučí a předá zařízení, pacient plán převezme.', covers: 'scénář 1' },
  { title: 'Dějství 2 — Doma, první zkušenost', note: 'Jeden úkol, epizody a poctivý závěr o tom, co z dat nelze rozhodnout.', covers: 'scénář 1' },
  { title: 'Dějství 3 — Když něco nesedí', note: 'Nemoc nebo výpadek dat, bezpečnostní plán, pozastavení a obnovení.', covers: 'scénář 2' },
  { title: 'Dějství 4 — Správa pravidel', note: 'Podnět, vyřazení pravidla, dopad na pacienta, incident a náprava.', covers: 'scénář 4 B' },
  { title: 'Dějství 5 — Uzavření úkolu', note: 'Závěr vlastními slovy a konec požadavku na zapisování.', covers: 'scénář 1' },
  { title: 'Dějství 6 — Kontrola a nový plán', note: 'Jedna stránka, rozhodnutí lékaře, vydání a předání P2.', covers: 'scénář 3' }
];

D.chapters = CH;

/* Vydání druhého plánu — používá i akce v UI. */
D.issueSecondPlan = function (S) {
  var prev = NF.activePlan(S);
  if (!prev || S.plans.length > 1) return false;
  var t2 = makeTask('T-SNIDANE');
  t2.id = 'T2';
  t2.ruleVersion = 'v2';
  S.tasks.push(t2);
  S.draft = {
    planId: 'P2', version: 'v1', prescription: prev.prescription,
    safety: S.safetyPlan, taskId: 'T2', allowChange: false,
    medicationChecked: true, safetyChecked: true, validUntil: '2027-04-05T00:00:00'
  };
  var r = NF.issuePlan(S, 'doctor');
  if (!r.ok) return false;
  S.reviews.push(NF.buildReview(S));
  NF.decideReview(S, 'doctor', { choice: (S.form && S.form.choice) || 'unchanged', reason: (S.form && S.form.reason) || '' });
  NF.handover(S);
  S.nextVisit = '2027-04-05T09:00:00';
  return true;
};

/* ---------- přehrání příběhu ----------
   Skok na kapitolu přehraje příběh deterministicky od začátku, takže stav
   odpovídá ručnímu průchodu. Nejde o načtení odděleného fixture. */
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

/* ---------- okrajové situace ---------- */
D.edgeCases = [
  { id: 'holiday', title: 'Dovolená / změna režimu', answer: 'Období je označené, úkol pozastavený, zaznamenané časy zůstávají. Žádné rady k posunu inzulinu.' },
  { id: 'motivation', title: 'Třetí měsíc bez motivace', answer: 'Nabídneme volby „už mi to odpovědělo“, „je to moc práce“, „nerozumím“, „teď nechci“ → dokončení, pomoc nebo pauza. Žádný trest ani hodnocení.' },
  { id: 'otherdoc', title: 'Změna léčby jiným lékařem', answer: 'Pacient změnu nahlásí. Údaj není nový předpis NutriFee. Závislý úkol čeká na ověření plánu.' },
  { id: 'expired', title: 'Odložená kontrola / konec platnosti plánu', answer: 'Zobrazíme potřebu ověření a kontakt. Nikdy pokyn přestat podávat inzulin.' },
  { id: 'carer', title: 'Pečující osoba', answer: 'Výchozí demo ukazuje pomoc při obsluze bez samostatného účtu. Samostatný přístup je otevřená volba; oprávnění nejsou vyřešena.' },
  { id: 'newdoc', title: 'Změna lékaře', answer: 'Předání podkladu a stav „převzetí nepotvrzeno“. Nový lékař nezíská přístup automaticky.' },
  { id: 'hosp', title: 'Hospitalizace', answer: 'Ručně oznámená pauza. Obnovení po kontrole aktuální léčby a plánu.' },
  { id: 'end', title: 'Ukončení účasti / konec studie', answer: 'Zastavené úkoly, modelové předání pokynů a další péče, informace o dostupnosti dokumentů.' },
  { id: 'consent', title: 'Odvolání souhlasu', answer: 'Rozlišíme ukončení účasti, druhotné použití a požadavek výmazu. Zobrazíme modelové přijetí požadavku bez skutečného mazání a bez slibu výmazu všech dat.' },
  { id: 'death', title: 'Úmrtí', answer: 'Ručně vložené ověřené oznámení oprávněnou rolí, konec připomínek a účasti. Žádný závěr z neaktivity.' }
];

/* ---------- rozhodovací list garanta ---------- */
D.decisionList = [
  { key: 'katalog', title: 'Katalog', q: 'Které pozorovací úkoly do první studie, jaká minimální epizoda a co znamená dokončení? Kdy lze bezpečně nabídnout změnový úkol?' },
  { key: 'bezpecnost', title: 'Bezpečnost a přerušení', q: 'Kdo dodá konkrétní formulace, meze a kontaktní postupy; které stavy pozastavují úkol a kdo jej obnovuje?' },
  { key: 'jedna-stranka', title: 'Jedna stránka', q: 'Stačí navržené pořadí a zdroje? Jak oddělit různá období a co je klinicky užitečný kontextový nález?' },
  { key: 'davkove-podklady', title: 'Dávkové podklady', q: 'Pouze vzorce a otázky, nebo i předem odborně připravený číselný podklad? Jaký původ a schválení by měl mít? Žádný vlastní výpočet NutriFee.' },
  { key: 'samotitrace', title: 'Samotitrace bazálu', q: 'Mimo první studii, samostatná větev k dopracování, nebo odklad rozhodnutí? Protokol a soulad se zásadami musí být vyřešeny před klinickou implementací.' },
  { key: 'provoz', title: 'Provoz', q: 'Kdo řeší neúspěšné zaučení, incident, nedoručenou aktualizaci a předání při odchodu?' },
  { key: 'pilot', title: 'Pilot', q: 'Jak se pozná užitek oproti senzoru a edukaci, jak se změří celková práce a jaké budou stop/go podmínky?' }
];

/* ---------- otázky pro garanta podle dějství ---------- */
D.garantQuestions = [
  ['Jaká jsou praktická vstupní kritéria a co přesně znamená stabilní režim?', 'Které pozorovací úkoly patří do katalogu?', 'Kdo řeší neúspěšné zaučení a co se s pacientem děje dál?', 'Kolik času zabere zaučení sestře a započítává se do zátěže ambulance?'],
  ['Které pozorovací úkoly patří do první studie?', 'Jaká je minimální epizoda a co znamená dokončení?', 'Kdy lze bezpečně nabídnout změnový úkol?'],
  ['Kdo dodá konkrétní formulace, meze a kontaktní postupy?', 'Které stavy pozastavují úkol a kdo jej obnovuje?', 'Jak odlišit technickou a klinickou pomoc?'],
  ['Kdo řeší incident a nedoručenou aktualizaci?', 'Musí se projít testovací příklady i u drobné formulační opravy?'],
  ['Kolik úplných epizod stačí k uzavření úkolu věcným závěrem?'],
  ['Stačí navržené pořadí a zdroje jedné stránky?', 'Co je klinicky užitečný kontextový nález?', 'Mají být dávkové podklady jen vzorce a otázky, nebo i číselný podklad?']
];

D.conclusions = [
  'Podobná snídaně nemusí mít pokaždé stejný průběh. Chci s lékařem probrat zaznamenané rozdíly.',
  'Zatím nemám dost podkladů. Chci pokračovat v pozorování po domluvě s lékařem.'
];

D.PRESCRIPTION = PRESCRIPTION;
D.SAFETY = SAFETY;
D.rules = rules;

})(typeof window !== 'undefined' ? window : globalThis);
