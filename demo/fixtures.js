/* Modelová data a definice scénářů. Součást demonstrační vrstvy.
   Produkční sestavení tento soubor nezahrnuje; jádro pak startuje v prázdném
   přípravném stavu a data by četlo ze skutečného zdroje. */
(function (global) {
'use strict';
var NF = global.NutriFee;
var D = global.NutriFeeDemo = global.NutriFeeDemo || {};

var PRESCRIPTION = 'Bazální inzulin: dávka dle modelového předpisu P1. Prandiální inzulin: dávky dle modelového předpisu P1.';

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

function makeTask(over) {
  return Object.assign({
    id: 'T1', kind: 'observe', state: 'prepared',
    question: 'Po podobné snídani mám někdy jiný průběh. Co se z toho můžu dozvědět?',
    title: 'Pozoruji jednu běžnou snídani.',
    ruleId: 'R-SNIDANE', ruleVersion: 'v1',
    conditions: 'Zaznamenej tři podobné snídaně. U každé uveď čas, popis a údaj o inzulinu, nebo „nevím“.',
    minimum: 'Epizoda je úplná, když má popis, údaj o inzulinu s časem a senzorový úsek po jídle.',
    target: 3,
    planId: null, conclusion: null, pauseReason: null
  }, over || {});
}

function makeDraft(over) {
  return Object.assign({
    planId: 'P1', version: 'v1',
    prescription: PRESCRIPTION,
    safety: SAFETY,
    taskId: 'T1',
    allowChange: false,
    medicationChecked: false,
    safetyChecked: false,
    validUntil: '2027-01-05T00:00:00',
    note: ''
  }, over || {});
}

var POINTS_MIN = [0, 30, 60, 90, 120];
function pts(values, at) {
  return POINTS_MIN.map(function (m, i) {
    var d = new Date(at); d.setMinutes(d.getMinutes() + m);
    return { min: m, at: d.toISOString().slice(0, 19), mmol: values[i] };
  });
}

function breakfasts(S, opts) {
  opts = opts || {};
  var days = ['2026-10-06T07:30:00', '2026-10-08T07:30:00', '2026-10-10T07:30:00'];
  var values = [[7.2, 8.1, 9.6, 8.8, 7.9], [7.4, 8.9, 10.7, 9.9, 8.5], [7.1, 8.0, 9.2, 8.4, 7.7]];
  var out = [];
  days.forEach(function (at, i) {
    if (opts.only != null && i >= opts.only) return;
    var missingSensor = opts.noSensorOnE3 && i === 2;
    out.push({
      id: 'E' + (i + 1), taskId: 'T1', planId: 'P1',
      at: at, recordedAt: at.slice(0, 11) + '08:05:00',
      desc: 'Chléb, sýr a neslazený čaj; pacient uvádí obvyklou porci',
      usualPortion: true,
      insulin: i === 1
        ? { reported: 'unknown', time: null }
        : { reported: 'per-plan', time: '07:15' },
      circumstances: i === 1 ? 'Spěchal jsem.' : '',
      points: missingSensor ? POINTS_MIN.map(function (m) { return { min: m, at: null, mmol: null }; }) : pts(values[i], at),
      importedAt: missingSensor ? null : at.slice(0, 11) + '11:00:00',
      author: 'DEMO-P01',
      history: []
    });
  });
  S.episodes = out;
}

/* ---------- Scénáře ---------- */
D.scenarios = [
  {
    id: 'S1',
    title: 'Scénář 1 — od nového senzoru k vlastnímu závěru',
    goal: 'Ukázat, že omezený pozorovací úkol má srozumitelný začátek i konec a nenutí pacienta odhadovat chybějící údaje.',
    garantQuestions: ['Které pozorovací úkoly patří do první studie?', 'Jaká je minimální epizoda a co znamená dokončení?', 'Kdy lze bezpečně nabídnout změnový úkol?'],
    decisionKey: 'katalog',
    startRole: 'patient', startPage: 'prep',
    variants: [
      { id: 'base', label: 'Výchozí průchod' },
      { id: 'thin', label: 'Málo podkladů (u E3 chybí senzorová data)' },
      { id: 'bolus', label: 'Bolus již podán / stav neznámý' },
      { id: 'training', label: 'Nezvládnuté zaučení' }
    ],
    steps: [
      ['prep', 'Pacient — příprava'],
      ['understand', 'Pacient — ověření porozumění'],
      ['issue', 'Lékař — vydání P1'],
      ['takeover', 'Pacient — převzetí'],
      ['episode', 'Pacient — první jídlo'],
      ['more', 'Prezentující — doplnit E2 a E3'],
      ['compare', 'Pacient — porovnání'],
      ['conclude', 'Pacient — závěr']
    ],
    seed: function (S, variant) {
      S.clock = '2026-10-05T09:00:00';
      S.rules = rules();
      S.tasks = [makeTask()];
      S.draft = makeDraft();
      S.dataState = { lastValueAt: '2026-10-05T08:45:00', gap: false, patientCause: null, offline: false, simulated: true };
      S.role = 'patient'; S.page = 'prep';
      if (variant === 'training') { S.onboarding.trainingFailed = true; }
      if (variant === 'bolus') { S.bolusState = 'unknown'; }
      S.variantNote = {
        thin: 'U epizody E3 nejsou k dispozici senzorová data. Úkol zůstane bez věcného závěru.',
        bolus: 'Stav podání bolusu je neznámý. Změnová rada je nedostupná, pozorovací zápis zůstává.',
        training: 'Zaučení nebylo dokončeno. Žádný klinický úkol se neaktivuje.'
      }[variant] || null;
    },
    situations: [
      { id: 'addE2E3', label: 'Posunout čas na 10. 10. a doplnit E2 a E3', apply: function (S) {
          var v = S.variant;
          S.clock = '2026-10-10T11:30:00';
          breakfasts(S, { noSensorOnE3: v === 'thin' });
          if (!S.episodes.length) return;
          return 'Doplněny epizody E2 a E3. Zaznamenané a úplné epizody se počítají odděleně.';
        } }
    ]
  },
  {
    id: 'S2',
    title: 'Scénář 2 — nejasnost, nemoc nebo výpadek a bezpečný návrat',
    goal: 'Ukázat, že aplikace umí přestat vyvozovat závěry a přerušit úkol.',
    garantQuestions: ['Kdo dodá konkrétní formulace, meze a kontaktní postupy?', 'Které stavy pozastavují úkol a kdo jej obnovuje?', 'Jak odlišit technickou a klinickou pomoc?'],
    decisionKey: 'bezpecnost',
    startRole: 'patient', startPage: 'today',
    variants: [
      { id: 'illness', label: 'Větev nemoc' },
      { id: 'gap-vendor', label: 'Výpadek — systém výrobce hodnoty ukazuje' },
      { id: 'gap-broken', label: 'Výpadek — pacient uvádí nefunkční senzor' },
      { id: 'gap-unknown', label: 'Výpadek — pacient neví' }
    ],
    steps: [
      ['today', 'Pacient — Dnes'],
      ['unclear', 'Pacient — Nerozumím tomu'],
      ['safety', 'Bezpečnostní a kontaktní plán'],
      ['datastate', 'Stav dat a výpadek'],
      ['restore', 'Prezentující — návrat dat'],
      ['resume', 'Lékař — obnovení úkolu']
    ],
    seed: function (S, variant) {
      S.clock = '2026-10-20T10:00:00';
      S.rules = rules();
      var t = makeTask({ state: 'active', planId: 'P1', activatedAt: '2026-10-05T11:00:00' });
      S.tasks = [t];
      S.plans = [{
        id: 'P1', author: 'DEMO-L01', version: 'v1',
        issuedAt: '2026-10-05T10:30:00', effectiveFrom: '2026-10-05T10:30:00',
        validUntil: '2027-01-05T00:00:00', state: 'issued',
        prescription: PRESCRIPTION, safety: SAFETY, taskId: 'T1',
        handedOver: true, understood: true, allowChange: false, previousId: null
      }];
      S.activePlanId = 'P1';
      S.safetyPlan = SAFETY;
      S.safetySyncAt = '2026-10-19T21:40:00';
      breakfasts(S);
      S.episodes.push({
        id: 'E4', taskId: 'T1', planId: 'P1',
        at: '2026-10-20T08:00:00', recordedAt: '2026-10-20T08:20:00',
        desc: 'Chléb, sýr a neslazený čaj; pacient uvádí obvyklou porci',
        usualPortion: true,
        insulin: { reported: 'per-plan', time: '07:45' },
        circumstances: '',
        points: [
          { min: 0, at: '2026-10-20T08:00:00', mmol: 7.3 },
          { min: 10, at: '2026-10-20T08:10:00', mmol: 7.8 },
          { min: 60, at: null, mmol: null },
          { min: 90, at: null, mmol: null },
          { min: 120, at: null, mmol: null }
        ],
        importedAt: '2026-10-20T08:12:00', author: 'DEMO-P01', history: []
      });
      S.dataState = {
        lastValueAt: '2026-10-20T08:10:00', gap: true,
        patientCause: variant === 'gap-vendor' ? 'vendor-ok' : variant === 'gap-broken' ? 'broken' : variant === 'gap-unknown' ? 'unknown' : null,
        offline: false, simulated: true
      };
      S.role = 'patient'; S.page = 'today';
      if (variant === 'illness') S.hint = 'illness';
    },
    situations: [
      { id: 'offline', label: 'Zapnout simulovaný offline režim', apply: function (S) { NF.setOffline(S, true); return 'Simulovaný offline režim je zapnutý. Bezpečnostní plán zůstává dostupný jako uložená verze.'; } },
      { id: 'online', label: 'Vypnout simulovaný offline režim', apply: function (S) { NF.setOffline(S, false); return 'Simulovaný offline režim je vypnutý.'; } },
      { id: 'restore', label: 'Obnovit datový tok', apply: function (S) { S.clock = '2026-10-20T14:00:00'; NF.restoreData(S); return 'Datový tok obnoven. E4 zůstává neúplná, pauza se tím neruší.'; } },
      { id: 'late', label: 'Doplnit opožděný import (nikoli dopočet)', apply: function (S) {
          var e = S.episodes.filter(function (x) { return x.id === 'E4'; })[0];
          if (!e) return 'Epizoda E4 není v tomto běhu.';
          e.lateImport = { at: S.clock, note: 'Opožděně dodané modelové body. Nejde o dopočet mezery.' };
          e.points[2] = { min: 60, at: '2026-10-20T09:00:00', mmol: 9.1, late: true };
          return 'Přidán jeden opožděně importovaný bod. Ostatní body zůstávají mezerou.';
        } }
    ]
  },
  {
    id: 'S3',
    title: 'Scénář 3 — podklad ke kontrole, rozhodnutí a nový plán',
    goal: 'Ukázat konkrétní přínos kontextu pro rozhovor a rozhodnutí na kontrole.',
    garantQuestions: ['Stačí navržené pořadí a zdroje jedné stránky?', 'Jak oddělit různá období?', 'Co je klinicky užitečný kontextový nález?', 'Mají být dávkové podklady jen vzorce a otázky, nebo i číselný podklad?'],
    decisionKey: 'jedna-stranka',
    startRole: 'patient', startPage: 'preview',
    variants: [
      { id: 'base', label: 'Výchozí podklad' },
      { id: 'A', label: 'A — pacient nic nezapisoval' },
      { id: 'A0', label: 'A — chybí i senzorový souhrn' },
      { id: 'B', label: 'B — historická bezpečnostní událost' },
      { id: 'C', label: 'C — aktuální problém během návštěvy' },
      { id: 'D', label: 'D — rozsah dávkového podkladu' }
    ],
    steps: [
      ['preview', 'Pacient — náhled podkladu'],
      ['onepage', 'Lékař — jedna stránka'],
      ['evidence', 'Lékař — důkaz u epizody'],
      ['decide', 'Lékař — rozhodnutí a vydání P2'],
      ['newplan', 'Pacient — nový plán'],
      ['result', 'Výsledek demonstrace']
    ],
    seed: function (S, variant) {
      S.clock = '2026-12-05T09:00:00';
      S.rules = rules();
      S.plans = [{
        id: 'P1', author: 'DEMO-L01', version: 'v1',
        issuedAt: '2026-10-05T10:30:00', effectiveFrom: '2026-10-05T10:30:00',
        validUntil: '2027-01-05T00:00:00', state: 'issued',
        prescription: PRESCRIPTION, safety: SAFETY, taskId: 'T1',
        handedOver: true, understood: true, allowChange: false, previousId: null
      }];
      S.activePlanId = 'P1';
      S.safetyPlan = SAFETY;
      S.safetySyncAt = '2026-12-04T20:00:00';
      S.tasks = [makeTask({
        state: 'done', planId: 'P1', activatedAt: '2026-10-05T11:00:00',
        completedAt: '2026-10-10T12:00:00',
        conclusion: 'Podobná snídaně nemusí mít pokaždé stejný průběh. Chci s lékařem probrat zaznamenané rozdíly.'
      })];
      S.nextVisit = '2027-01-05T09:00:00';
      S.questions = [{ id: 'Q1', at: '2026-12-05T09:10:00', text: 'Co z rozdílů po snídani stojí za to dál pozorovat?' }];
      if (variant === 'A' || variant === 'A0') {
        S.episodes = [];
        S.findings = [];
      } else {
        breakfasts(S);
        S.findings = [{
          id: 'F1',
          text: 'Tři říjnové snídaně označené pacientem jako podobné; dvě s potřebným kontextem, jedna bez údaje o inzulinu. Nelze určit příčinu rozdílu.',
          source: 'Pacientské zápisy E1–E3 a senzorové úseky 0–120 minut.',
          period: '6.–10. 10. 2026',
          limit: 'Podobnost jídel je pacientský údaj. Kontext nestačí k určení příčiny.'
        }];
      }
      S.sensorSummary = variant === 'A0' ? null : {
        period: '22. 12. 2026 – 4. 1. 2027',
        availability: 91, tir: 62, below: 2, above: 36,
        range: '3,9–10,0 mmol/l',
        note: 'Předem vložené syntetické hodnoty. Nejsou vypočtené z pěti bodů snídaňových epizod.'
      };
      S.safetyEvents = variant === 'B' ? [{
        id: 'SE1', at: '2026-12-29T02:00:00', reportedAt: '2027-01-04T18:20:00',
        source: 'zpětně nahlásil pacient',
        text: 'Řešil jsem podle svého plánu; chci to probrat.',
        assessment: null
      }] : [];
      S.doseBasis = variant === 'D' ? 'open' : null;
      S.role = 'patient'; S.page = 'preview';
      S.variantNote = {
        A: 'Pacient v tomto období nic nezapisoval. Kontrolu lze přesto dokončit.',
        A0: 'Chybí zápisy i senzorový souhrn. Zobrazuje se „nelze vyhodnotit“, nikoli nuly.',
        B: 'Pacientem zpětně nahlášená bezpečnostní událost má na stránce přednost.',
        C: 'Lékař může kontrolu ručně přerušit kvůli aktuálnímu problému.',
        D: 'Otevřená varianta rozsahu dávkového podkladu — pouze panel lékaře a prezentujícího.'
      }[variant] || null;
    },
    situations: [
      { id: 'visit', label: 'Posunout modelový čas na kontrolu 5. 1. 2027', apply: function (S) { S.clock = '2027-01-05T09:00:00'; return 'Modelové datum je den kontroly.'; } }
    ]
  },
  {
    id: 'S4',
    title: 'Scénář 4 — hranice samotitrace, vyřazení pravidla a incident',
    goal: 'Umožnit rozhodnout, zda má samotitrace bazálu patřit do studie, a ukázat, kdo smí pravidlo uvést v platnost, zastavit jeho použití a obnovit činnost.',
    garantQuestions: ['Patří samotitrace bazálu do první studie, do oddělené větve, nebo se rozhodnutí odloží?', 'Kdo řeší incident, nedoručenou aktualizaci a předání při odchodu?'],
    decisionKey: 'samotitrace',
    startRole: 'garant', startPage: 'catalog',
    variants: [
      { id: 'A', label: 'Průchod A — rozhodnutí o samotitraci' },
      { id: 'B', label: 'Průchod B — změna pravidla a incident' }
    ],
    steps: [
      ['catalog', 'Garant — katalog pravidel'],
      ['impulse', 'Garant — podnět a vyřazení v1'],
      ['impact', 'Garant — dopad změny'],
      ['patient-online', 'Pacient online — pozastavený úkol'],
      ['patient-offline', 'Pacient offline — poslední uložená verze'],
      ['incident', 'Garant — incident'],
      ['fix', 'Garant — schválení v2 a obnovení']
    ],
    seed: function (S, variant) {
      S.clock = '2026-10-22T09:00:00';
      S.rules = rules();
      S.plans = [{
        id: 'P1', author: 'DEMO-L01', version: 'v1',
        issuedAt: '2026-10-05T10:30:00', effectiveFrom: '2026-10-05T10:30:00',
        validUntil: '2027-01-05T00:00:00', state: 'issued',
        prescription: PRESCRIPTION, safety: SAFETY, taskId: 'T1',
        handedOver: true, understood: true, allowChange: false, previousId: null
      }];
      S.activePlanId = 'P1';
      S.safetyPlan = SAFETY;
      S.safetySyncAt = '2026-10-21T22:10:00';
      S.tasks = [makeTask({ state: 'active', planId: 'P1', activatedAt: '2026-10-05T11:00:00' })];
      breakfasts(S);
      S.impulse = {
        id: 'IMP-1',
        text: 'Při testu bylo zjištěno, že formulace pravidla pro pozorování nejasně popisuje použití při nemoci.',
        note: 'Jde o hlášený problém formulace, ne automaticky o závažnou nežádoucí příhodu.',
        at: '2026-10-22T08:30:00'
      };
      S.role = 'garant'; S.page = variant === 'A' ? 'protocol' : 'catalog';
    },
    situations: [
      { id: 'goOffline', label: 'Pacientské zařízení offline', apply: function (S) { NF.setOffline(S, true); if (S.ruleDelivery === 'confirmed') S.ruleDelivery = 'unconfirmed'; return 'Zařízení pacienta je v simulaci offline. Doručení změny nelze potvrdit.'; } },
      { id: 'goOnline', label: 'Pacientské zařízení online', apply: function (S) { NF.setOffline(S, false); return 'Zařízení je znovu online.'; } },
      { id: 'illnessStop', label: 'Simulovat oznámení nemoci (stop-situace konceptu)', apply: function (S) { S.conceptState = 'paused'; return 'Koncept protokolu přešel do stavu pozastaveno. Není vypočtena žádná změna inzulinu.'; } }
    ]
  }
];

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

D.conclusions = [
  'Podobná snídaně nemusí mít pokaždé stejný průběh. Chci s lékařem probrat zaznamenané rozdíly.',
  'Zatím nemám dost podkladů. Chci pokračovat v pozorování po domluvě s lékařem.'
];

D.PRESCRIPTION = PRESCRIPTION;
D.SAFETY = SAFETY;
D.rules = rules;

D.byId = function (id) {
  return D.scenarios.filter(function (s) { return s.id === id; })[0] || null;
};

/* Nahrání scénáře: deterministický reset na přesná vstupní data. */
D.load = function (S, id, variant) {
  var sc = D.byId(id);
  if (!sc) return null;
  var fresh = NF.createState();
  NF.resetUid();
  fresh.scenario = id;
  fresh.variant = variant || sc.variants[0].id;
  sc.seed(fresh, fresh.variant);
  fresh.role = sc.startRole;
  fresh.page = fresh.page || sc.startPage;
  NF.log(fresh, 'scenario.loaded', id + '/' + fresh.variant);
  return fresh;
};

})(typeof window !== 'undefined' ? window : globalThis);
