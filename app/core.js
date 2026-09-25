/* NutriFee — rozhodovací maketa · jádro aplikace.
   Obsahuje pouze doménový model a pravidla průchodu. Neobsahuje modelová data,
   ovládání scénářů ani texty průvodce; ty jsou ve složce demo/ a jsou odstranitelné.

   Aplikace vyhodnocuje reakci na jídlo, učí se z dat pacienta a doporučuje změnu
   jídla, porce, přílohy, pořadí, odstupu nebo pohybu. Nikdy nepočítá, nenavrhuje
   ani nemění dávku inzulinu. Každý výpočet i rada pochází ze schváleného pravidla. */
(function (global) {
'use strict';

var NF = global.NutriFee = global.NutriFee || {};

/* ---------- drobné pomůcky ---------- */
NF.SCHEMA = 6;
NF.STORAGE = 'nutrifee-rozhodovaci-maketa';
var MONTHS = ['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince'];

NF.clone = function (x) { return JSON.parse(JSON.stringify(x)); };
NF.esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};
var seq = 0;
NF.uid = function (p) { seq += 1; return (p || 'id') + '-' + seq; };
NF.resetUid = function () { seq = 0; };

NF.parse = function (iso) { return new Date(iso); };
NF.day = function (iso) { return String(iso).slice(0, 10); };
NF.fmtDate = function (iso) {
  if (!iso) return 'nemáme údaj';
  var d = NF.parse(iso);
  return d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
};
NF.fmtShort = function (iso) {
  if (!iso) return '—';
  var d = NF.parse(iso);
  return d.getDate() + '. ' + (d.getMonth() + 1) + '. ' + d.getFullYear();
};
NF.fmtTime = function (iso) {
  if (!iso) return '—';
  var d = NF.parse(iso);
  return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
};
NF.fmtDateTime = function (iso) { return iso ? NF.fmtShort(iso) + ' v ' + NF.fmtTime(iso) : 'nemáme údaj'; };
NF.addDays = function (iso, n) {
  var d = NF.parse(iso); d.setDate(d.getDate() + n); return d.toISOString();
};
NF.mmol = function (v) {
  return v == null ? null : String(Math.round(v * 10) / 10).replace('.', ',');
};
NF.median = function (list) {
  var a = list.filter(function (x) { return x != null; }).slice().sort(function (x, y) { return x - y; });
  if (!a.length) return null;
  var m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};

/* ---------- výchozí prázdný stav ----------
   Bez nahraných modelových dat je maketa v přípravném stavu: žádný plán,
   žádný úkol, žádné záznamy jídel. Produkční sestavení by zde četlo skutečný zdroj dat. */
NF.createState = function () {
  return {
    schema: NF.SCHEMA,
    role: 'patient',
    page: 'today',
    clock: '2026-10-05T09:00:00',
    patient: { id: 'DEMO-P01', label: 'Modelový pacient 01' },
    doctor: { id: 'DEMO-L01', label: 'Modelový lékař 01' },
    nurse: { id: 'DEMO-S01', label: 'Modelová sestra 01' },
    garant: { id: 'DEMO-G01', label: 'Modelový garant 01' },
    onboarding: { checkAnswer: null, done: false },
    /* Zařazení a zaučení proběhnou v ordinaci, dřív než lékař vydá plán. */
    enrollment: { eligible: false, criteria: {}, compensation: null },
    training: { result: null, steps: {}, note: '' },
    wizardStep: 0,
    plans: [],
    activePlanId: null,
    tasks: [],
    foods: [],
    episodes: [],
    reviews: [],
    rules: [],
    incidents: [],
    questions: [],
    safetyPlan: null,
    safetySyncAt: null,
    rulesSyncAt: null,
    dataState: { lastValueAt: null, gap: false, patientCause: null, offline: false },
    illness: null,
    participation: 'active',
    edge: null,
    decisions: {},
    notes: '',
    toast: '',
    error: '',
    events: [],
    draft: null,
    meal: null,
    banner: null
  };
};

/* ---------- úložiště ---------- */
NF.storageOK = true;
NF.load = function () {
  var s;
  try {
    var raw = global.localStorage && global.localStorage.getItem(NF.STORAGE);
    s = raw ? JSON.parse(raw) : null;
  } catch (e) { NF.storageOK = false; s = null; }
  if (!s || s.schema !== NF.SCHEMA || !Array.isArray(s.plans)) s = NF.createState();
  return s;
};
NF.save = function (S) {
  try { global.localStorage && global.localStorage.setItem(NF.STORAGE, JSON.stringify(S)); }
  catch (e) { NF.storageOK = false; }
};

/* ---------- záznam do stopy demonstrace ---------- */
NF.log = function (S, what, detail) {
  S.events.push({ at: S.clock, what: what, detail: detail || '' });
  if (S.events.length > 200) S.events.shift();
};

/* ---------- katalog pravidel ----------
   Pravidlo je použitelné jen ve schválené verzi. Neschválené, vyřazené ani
   rozpracované pravidlo nevytvoří žádný výpočet ani radu. */
NF.ruleKey = function (r) { return r.id + '|' + r.version; };
NF.ruleByKey = function (S, key) {
  return S.rules.filter(function (r) { return NF.ruleKey(r) === key; })[0] || null;
};
NF.usableRule = function (S, id) {
  return S.rules.filter(function (r) { return r.id === id && r.status === 'approved'; })[0] || null;
};
NF.isRuleUsable = function (S, id) { return !!NF.usableRule(S, id); };
/* Pro zobrazení: schválená verze, jinak nejnovější známá. */
NF.ruleById = function (S, id) {
  var list = S.rules.filter(function (r) { return r.id === id; });
  return list.filter(function (r) { return r.status === 'approved'; })[0] || list[list.length - 1] || null;
};
NF.RULE_STATUS = {
  approved: 'schváleno garantem',
  draft: 'návrh — čeká na schválení',
  retired: 'vyřazeno z použití'
};
NF.approveRule = function (S, role, key) {
  if (role !== 'garant') return { ok: false, error: 'Pravidla schvaluje garant.' };
  var r = NF.ruleByKey(S, key);
  if (!r) return { ok: false, error: 'Pravidlo nenalezeno.' };
  if (r.status !== 'draft') return { ok: false, error: 'Schválit lze jen návrh.' };
  if (!r.examplesReviewed) return { ok: false, error: 'Nejdřív projdi testovací příklady použití i nepoužití.' };
  r.status = 'approved';
  r.approvedBy = S.garant.id;
  r.approvedAt = S.clock;
  NF.log(S, 'rule.approved', r.id + ' ' + r.version);
  return { ok: true, rule: r };
};
NF.retireRule = function (S, role, key, reason) {
  if (role !== 'garant') return { ok: false, error: 'Vyřazení pravidla provádí garant.' };
  var r = NF.ruleByKey(S, key);
  if (!r) return { ok: false, error: 'Pravidlo nenalezeno.' };
  if (!reason) return { ok: false, error: 'Vyber důvod vyřazení.' };
  r.status = 'retired';
  r.retiredReason = reason;
  r.retiredAt = S.clock;
  /* Úkol stojící na tomto pravidle se pozastaví. Rada z pravidla přestane
     vznikat okamžitě. Předpis plánu se nemění. */
  var affected = S.tasks.filter(function (t) { return t.ruleId === r.id && t.state === 'active'; });
  affected.forEach(function (t) {
    t.state = 'paused';
    t.pauseReason = 'rule';
    t.pauseDetail = 'Pravidlo ' + r.id + ' ' + r.version + ' bylo vyřazeno z dalšího použití.';
    t.pausedAt = S.clock;
  });
  S.ruleDelivery = S.dataState.offline ? 'unconfirmed' : 'confirmed';
  if (!S.dataState.offline) S.rulesSyncAt = S.clock;
  NF.log(S, 'rule.retired', r.id + ' ' + r.version);
  return { ok: true, rule: r, affected: affected };
};
NF.addIncident = function (S, data) {
  var inc = {
    id: NF.uid('INC'),
    at: S.clock,
    source: data.source,
    report: data.report,
    versions: data.versions || [],
    role: data.role || S.garant.id,
    clinical: data.clinical || 'neposouzeno',
    technical: data.technical || 'neřešeno',
    state: 'otevřeno'
  };
  S.incidents.push(inc);
  NF.log(S, 'incident.added', inc.id);
  return inc;
};

/* ---------- zařazení a zaučení ----------
   Cesta začíná u lékaře v ordinaci. Plán nelze vydat bez posouzení způsobilosti;
   úkol se neaktivuje bez zaučení u sestry a ověření porozumění. */
NF.ELIGIBILITY = [
  ['adult', 'Dospělý pacient s diabetem 2. typu'],
  ['insulinOnly', 'Léčba jen inzulinem — žádná perorální antidiabetika'],
  ['regimen', 'Bazál 1× večer a prandiální inzulin ke třem hlavním jídlům, pevné dávky určené lékařem'],
  ['cgm', 'Senzor CGM']
];
NF.setEligibility = function (S, key, value) {
  S.enrollment.criteria[key] = !!value;
  S.enrollment.eligible = NF.ELIGIBILITY.every(function (c) { return !!S.enrollment.criteria[c[0]]; });
  return S.enrollment.eligible;
};

function taskFrom(item, id) {
  return {
    id: id, catalogId: item.id, kind: item.kind, state: 'prepared',
    question: item.question, title: item.title,
    ruleId: item.ruleId, ruleVersion: null,
    conditions: item.conditions, burden: item.burden,
    meal: item.meal || 'breakfast',
    planId: null, pauseReason: null
  };
}
NF.taskFromCatalog = taskFrom;
/* Úkol jde přiřadit jen z předdefinovaného katalogu a jen se schváleným
   pravidlem. Lékař žádný text nepíše. */
NF.assignTask = function (S, item, id) {
  id = id || 'T1';
  if (!item) return { ok: false, error: 'Vyber úkol z katalogu.' };
  var rule = NF.usableRule(S, item.ruleId);
  if (!rule) {
    return { ok: false, error: 'Pravidlo ' + item.ruleId + ' nemá schválenou verzi. Úkol nelze přiřadit.' };
  }
  S.tasks = S.tasks.filter(function (t) { return t.id !== id; });
  var t = taskFrom(item, id);
  t.ruleVersion = rule.version;
  S.tasks.push(t);
  if (S.draft) S.draft.taskId = id;
  NF.log(S, 'task.assigned', item.id);
  return { ok: true, task: t };
};

/* Konkrétní úkony, které sestra při předání odškrtne. Nic abstraktního. */
NF.TRAINING = [
  ['app', 'Pacient si otevřel aplikaci a našel svůj úkol'],
  ['record', 'Pacient zvládl zapsat zkušební jídlo'],
  ['bolus', 'Pacient ví, že se ho aplikace před radou zeptá, jestli si už píchl'],
  ['safety', 'Pacient našel bezpečnostní a kontaktní plán'],
  ['contacts', 'Pacient ví, kam volat při technickém problému a kam při zdravotním']
];
NF.finishTraining = function (S, role, result, note) {
  if (role !== 'nurse') return { ok: false, error: 'Zaučení potvrzuje sestra.' };
  S.training.result = result;
  S.training.by = S.nurse.id;
  S.training.note = note || '';
  S.training.at = S.clock;
  NF.log(S, 'training.' + result, note || '');
  return { ok: true };
};

/* ---------- plán ---------- */
NF.activePlan = function (S) {
  return S.plans.filter(function (p) { return p.id === S.activePlanId; })[0] || null;
};
NF.planById = function (S, id) {
  return S.plans.filter(function (p) { return p.id === id; })[0] || null;
};
NF.activeTask = function (S) {
  return S.tasks.filter(function (t) { return t.state === 'active'; })[0] || null;
};
NF.currentTask = function (S) {
  var p = NF.activePlan(S);
  return (p && NF.taskById(S, p.taskId)) || NF.activeTask(S) || null;
};
NF.taskById = function (S, id) {
  return S.tasks.filter(function (t) { return t.id === id; })[0] || null;
};

/* Vydání plánu — smí jen role lékaře a jen s úplnými náležitostmi. */
NF.issuePlan = function (S, role) {
  var d = S.draft;
  if (role !== 'doctor') return { ok: false, error: 'Plán vydává lékař. V pacientské roli vydání není možné.' };
  if (!d) return { ok: false, error: 'Není připravený návrh plánu.' };
  var chybi = [];
  if (!S.enrollment || !S.enrollment.eligible) chybi.push('posouzení způsobilosti pro kohortu');
  if (!d.medicationChecked) chybi.push('ověření modelového seznamu léčby');
  if (!d.safetyChecked) chybi.push('bezpečnostní a kontaktní plán');
  if (!d.taskId) chybi.push('přiřazený úkol');
  if (chybi.length) return { ok: false, error: 'Plán zatím nelze vydat. Chybí: ' + chybi.join(', ') + '.' };
  var prev = NF.activePlan(S);
  var plan = {
    id: d.planId,
    author: S.doctor.id,
    version: d.version,
    issuedAt: S.clock,
    effectiveFrom: S.clock,
    validUntil: d.validUntil || null,
    state: 'issued',
    prescription: d.prescription,
    safety: d.safety,
    taskId: d.taskId,
    previousId: prev ? prev.id : null,
    reviewReason: d.reviewReason || null,
    handedOver: false,
    understood: false
  };
  if (prev) prev.state = 'superseded';
  S.plans.push(plan);
  S.activePlanId = plan.id;
  S.safetyPlan = d.safety;
  S.safetySyncAt = S.clock;
  S.rulesSyncAt = S.clock;
  S.draft = null;
  NF.log(S, 'plan.issued', plan.id + ' ' + plan.version);
  return { ok: true, plan: plan };
};

NF.handover = function (S) {
  var p = NF.activePlan(S);
  if (!p) return { ok: false, error: 'Není vydaný plán k předání.' };
  p.handedOver = true;
  NF.log(S, 'plan.handed', p.id);
  return { ok: true };
};
NF.confirmUnderstanding = function (S) {
  var p = NF.activePlan(S);
  if (!p || !p.handedOver) return { ok: false, error: 'Plán zatím nebyl předán.' };
  if (!S.training || S.training.result !== 'done') {
    return { ok: false, error: 'Zaučení u sestry nebylo dokončeno. Úkol se neaktivuje.' };
  }
  p.understood = true;
  var t = NF.taskById(S, p.taskId);
  if (t && t.state === 'prepared') {
    S.tasks.forEach(function (x) { if (x.state === 'active' && x.id !== t.id) { x.state = 'done'; x.completedAt = S.clock; } });
    t.state = 'active';
    t.planId = p.id;
    t.activatedAt = S.clock;
    NF.log(S, 'task.activated', t.id);
  }
  return { ok: true };
};

/* ---------- úkol ---------- */
NF.pauseTask = function (S, reason, detail) {
  var t = NF.activeTask(S);
  if (!t) return { ok: false, error: 'Žádný aktivní úkol.' };
  t.state = 'paused';
  t.pauseReason = reason;
  t.pauseDetail = detail || '';
  t.pausedAt = S.clock;
  NF.log(S, 'task.paused', reason);
  return { ok: true, task: t };
};
/* Obnovení jen po potvrzení lékařem — nikoli pouhým uplynutím času
   nebo návratem datového toku. */
NF.resumeTask = function (S, role, reason) {
  var t = S.tasks.filter(function (x) { return x.state === 'paused'; })[0];
  if (!t) return { ok: false, error: 'Žádný pozastavený úkol.' };
  if (role !== 'doctor') return { ok: false, error: 'Obnovení úkolu potvrzuje lékař.' };
  if (S.illness && S.illness.active) return { ok: false, error: 'Období nemoci je stále označené jako trvající. Nejdřív je ukončete.' };
  var p = NF.activePlan(S);
  if (!p || p.state !== 'issued') return { ok: false, error: 'Plán není v platném stavu.' };
  if (t.pauseReason === 'rule' && !NF.isRuleUsable(S, t.ruleId)) {
    return { ok: false, error: 'Pravidlo úkolu není ve schválené verzi. Nejdřív musí garant schválit novou verzi.' };
  }
  t.state = 'active';
  t.resumedAt = S.clock;
  t.resumeReason = reason || 'Lékař ověřil aktuálnost plánu.';
  t.pauseReason = null;
  NF.log(S, 'task.resumed', t.id);
  return { ok: true, task: t };
};

/* ---------- jídla ----------
   Jídlo má vlastnosti obvyklé porce: sacharidy, bílkovinu, tuk a vlákninu v gramech
   a formu. Podobnost se počítá z vlastností, ne z názvu. */
NF.PORTIONS = [
  ['usual', 'Obvyklá porce'],
  ['bigger', 'Větší než obvykle'],
  ['smaller', 'Menší než obvykle']
];
NF.PORTION_FACTOR = { usual: 1, bigger: 1.3, smaller: 0.7 };
NF.FORMS = { kase: 'kaše', pevne: 'pevné', tekute: 'tekuté' };
NF.foodById = function (S, id) {
  return S.foods.filter(function (f) { return f.id === id; })[0] || null;
};
NF.carbsOf = function (S, ep) {
  var f = NF.foodById(S, ep.foodId);
  if (!f) return null;
  return Math.round(f.carbs * (NF.PORTION_FACTOR[ep.portion] || 1));
};

/* ---------- záznam jídla ----------
   Chybějící údaj není nula. Záznam bez kontextu zůstává viditelný,
   ale nepočítá se do vyhodnocení. */
NF.episodeStatus = function (ep) {
  var missing = [];
  if (!ep.insulin || ep.insulin.reported === 'unknown') missing.push('údaj o inzulinu a jeho čase');
  else if (ep.insulin.reported === 'per-plan' && !ep.insulin.time) missing.push('čas podání inzulinu');
  /* Úsek po jídle je úplný jen tehdy, když sahá až na konec sledovaného okna. */
  var pts = (ep.points || []).filter(function (p) { return p.mmol != null; });
  var hasStart = (ep.points || []).some(function (p) { return p.mmol != null && p.min === 0; });
  var hasEnd = (ep.points || []).some(function (p) { return p.mmol != null && p.min >= 120; });
  if (pts.length < 4 || !hasStart || !hasEnd) missing.push('senzorová data po jídle');
  return { complete: missing.length === 0, missing: missing, points: pts.length };
};
/* Do učení vstupují jen úplné záznamy mimo období nemoci. */
NF.usableEpisode = function (ep) {
  return NF.episodeStatus(ep).complete && ep.context !== 'illness' && ep.insulin.reported === 'per-plan';
};
/* Vzestup = nejvyšší hodnota v okně 0–120 minut minus výchozí hodnota. */
NF.rise = function (ep) {
  if (!NF.episodeStatus(ep).complete) return null;
  var pts = ep.points.filter(function (p) { return p.mmol != null; });
  var base = pts.filter(function (p) { return p.min === 0; })[0].mmol;
  var peak = Math.max.apply(null, pts.map(function (p) { return p.mmol; }));
  return Math.round((peak - base) * 10) / 10;
};
NF.countEpisodes = function (S, taskId) {
  var list = S.episodes.filter(function (e) { return !taskId || e.taskId === taskId; });
  var complete = list.filter(NF.usableEpisode);
  return { recorded: list.length, complete: complete.length, list: list };
};

NF.foodHistory = function (S, foodId) {
  var eaten = S.episodes.filter(function (e) { return e.foodId === foodId; });
  var usable = eaten.filter(NF.usableEpisode);
  var baseline = usable.filter(function (e) { return !e.lever && e.portion === 'usual'; });
  return {
    eaten: eaten.length,
    usable: usable.length,
    rises: usable.map(NF.rise),
    typicalRise: NF.median((baseline.length ? baseline : usable).map(NF.rise)),
    baselineN: baseline.length,
    list: eaten
  };
};

/* Podobnost z vlastností. Vzdálenost v normalizovaném prostoru plus penalizace
   za jinou formu. Práh je parametrem schváleného pravidla, ne kódu. */
NF.foodDistance = function (a, b) {
  var d = Math.pow((a.carbs - b.carbs) / 80, 2) + Math.pow((a.protein - b.protein) / 30, 2) +
    Math.pow((a.fat - b.fat) / 30, 2) + Math.pow((a.fiber - b.fiber) / 10, 2);
  return Math.round((Math.sqrt(d) + (a.form === b.form ? 0 : 0.3)) * 100) / 100;
};

/* ---------- tři úrovně jistoty ----------
   known   — snědeno aspoň tolikrát, kolik určuje pravidlo: co se stalo minule a co pomohlo
   similar — neznámé, ale podobné vlastnostmi známým jídlům: jen směr, bez čísla
   unknown — nic podobného: žádný odhad, nabídne zaznamenat */
NF.confidence = function (S, foodId) {
  var food = NF.foodById(S, foodId);
  var rule = NF.usableRule(S, 'R-REAKCE');
  var h = NF.foodHistory(S, foodId);
  if (!food) return { level: 'unknown', history: h, rules: [], why: 'Jídlo nemáme v seznamu.' };
  if (!rule) return { level: 'none', history: h, rules: [], why: 'Pravidlo pro vyhodnocení reakce není schválené. Aplikace nic neodhaduje.' };
  var min = rule.params.minKnown;
  if (h.usable >= min) {
    return { level: 'known', history: h, rules: [NF.ruleKey(rule)], min: min };
  }
  var simRule = NF.usableRule(S, 'R-PODOBNOST');
  if (simRule) {
    var known = S.foods.filter(function (f) {
      return f.id !== foodId && NF.foodHistory(S, f.id).usable >= min;
    });
    var like = known.filter(function (f) { return NF.foodDistance(food, f) <= simRule.params.maxDistance; });
    if (like.length) {
      var all = NF.median(known.map(function (f) { return NF.foodHistory(S, f.id).typicalRise; }));
      var theirs = NF.median(like.map(function (f) { return NF.foodHistory(S, f.id).typicalRise; }));
      var dir = theirs - all > 0.4 ? 'more' : all - theirs > 0.4 ? 'less' : 'same';
      return { level: 'similar', history: h, like: like.map(function (f) { return f.id; }), direction: dir,
        rules: [NF.ruleKey(rule), NF.ruleKey(simRule)], min: min };
    }
  }
  return { level: 'unknown', history: h, rules: [NF.ruleKey(rule)].concat(simRule ? [NF.ruleKey(simRule)] : []), min: min };
};

/* Co pomohlo: u známého jídla porovná úplné záznamy s přijatou pákou
   a záznamy bez ní. Malé počty zůstávají vidět — zpřesňuje se. */
NF.leverEffects = function (S, foodId) {
  var h = NF.foodHistory(S, foodId);
  var usable = h.list.filter(NF.usableEpisode);
  var out = {};
  usable.forEach(function (ep) {
    if (!ep.lever) return;
    out[ep.lever] = out[ep.lever] || [];
    out[ep.lever].push(NF.rise(ep));
  });
  return Object.keys(out).map(function (k) {
    return { lever: k, n: out[k].length, rise: NF.median(out[k]), without: h.typicalRise, withoutN: h.baselineN };
  }).sort(function (a, b) { return a.rise - b.rise; });
};

/* ---------- páky ----------
   carbs: true = mění množství sacharidů → jen před bolusem. */
NF.LEVERS = {
  portion: { label: 'Porce k obvyklé', carbs: true },
  sideAmount: { label: 'Výměna přílohy za jiné množství sacharidů', carbs: true },
  sideForm: { label: 'Výměna přílohy za stejné množství jiné podoby', carbs: false },
  addon: { label: 'Přidání bílkoviny, tuku nebo vlákniny', carbs: false },
  order: { label: 'Pořadí jídla', carbs: false },
  timing: { label: 'Odstup jídla od bolusu', carbs: false },
  walk: { label: 'Svižná procházka po jídle', carbs: false }
};
NF.BOLUS = [
  ['before', 'Ještě ne'],
  ['after', 'Už ano'],
  ['unknown', 'Nevím']
];
/* Neznámý stav podání se chová jako „po bolusu“. */
NF.effectiveBolus = function (state) { return state === 'before' ? 'before' : 'after'; };

NF.leverRule = function (S, lever) {
  return S.rules.filter(function (r) { return r.lever === lever && r.status === 'approved'; })[0] || null;
};

/* Kdy aplikace vůbec radí. Bez spojení radí jen tehdy, když ví, že pravidla platí. */
NF.adviceGate = function (S) {
  var p = NF.activePlan(S);
  var t = NF.activeTask(S);
  if (S.participation !== 'active') return { ok: false, why: 'Účast je ukončená.' };
  if (!p || !p.understood) return { ok: false, why: 'Bez předaného a převzatého plánu aplikace neradí.' };
  if (S.illness && S.illness.active) return { ok: false, why: 'Během oznámené nemoci aplikace k jídlu neradí. Řiď se bezpečnostním plánem.' };
  if (!t) return { ok: false, why: 'Úkol je teď pozastavený, rady se nenabízejí.' };
  if (t.kind !== 'advise') return { ok: false, why: 'Aktuální úkol rady k jídlu nezahrnuje.' };
  if (S.dataState.offline) return { ok: false, why: 'Zařízení je bez spojení, takže nevíme, jestli pravidla pořád platí. Rady jsou do obnovení spojení vypnuté.' };
  return { ok: true };
};

function txt(rule, food) {
  return String(rule.text).replace('{addon}', food.addon || 'bílkovinu').replace('{first}', food.first || 'zeleninu');
}

/* Rada před jídlem. Vrací jen rady ze schválených pravidel; zablokované páky
   vrací zvlášť s důvodem, aby šlo ukázat, proč se neradí. */
NF.advise = function (S, foodId, portion, bolusState) {
  var gate = NF.adviceGate(S);
  var food = NF.foodById(S, foodId);
  var res = { gate: gate, conf: null, bolus: bolusState || null, effective: null, items: [], blocked: [] };
  if (!food) return res;
  res.conf = NF.confidence(S, foodId);
  if (!gate.ok) return res;
  if (!bolusState) { res.needsBolus = true; return res; }
  res.effective = NF.effectiveBolus(bolusState);
  var lv = res.conf.level;
  var cands = [];
  if (portion && portion !== 'usual') cands.push('portion');
  if (lv === 'known') {
    NF.leverEffects(S, foodId).forEach(function (x) {
      if (x.without != null && x.rise < x.without && cands.indexOf(x.lever) === -1) cands.push(x.lever);
    });
    ['addon', 'order'].forEach(function (l) { if (cands.indexOf(l) === -1) cands.push(l); });
  } else if (lv === 'similar' && res.conf.direction === 'more') {
    ['addon', 'order'].forEach(function (l) { if (cands.indexOf(l) === -1) cands.push(l); });
  }
  var effects = lv === 'known' ? NF.leverEffects(S, foodId) : [];
  cands.forEach(function (l) {
    var meta = NF.LEVERS[l];
    var rule = NF.leverRule(S, l);
    if (!rule) { res.blocked.push({ lever: l, reason: 'rule', why: 'Pravidlo pro tuhle páku nemá schválenou verzi.' }); return; }
    if (meta.carbs && res.effective !== 'before') {
      res.blocked.push({ lever: l, reason: 'bolus', ruleKey: NF.ruleKey(rule),
        why: bolusState === 'unknown'
          ? 'Nevíme, jestli už máš inzulin. Proto se chováme, jako bys ho už měl, a radu, která mění množství sacharidů, nedáváme.'
          : 'Inzulin už máš. Radu, která mění množství sacharidů, po podání nedáváme.' });
      return;
    }
    var item = { lever: l, label: meta.label, ruleKey: NF.ruleKey(rule), ruleStatus: rule.status, carbs: meta.carbs };
    if (l === 'portion') {
      item.text = portion === 'smaller'
        ? 'Dej si obvyklou porci. Tvoje dávka je nastavená na obvyklé množství — menší porce při stejné dávce může skončit nízkou glukózou.'
        : 'Dej si obvyklou porci. Tvoje dávka je nastavená na obvyklé množství, větší porce ho přesahuje.';
    } else {
      item.text = txt(rule, food);
    }
    var ef = effects.filter(function (x) { return x.lever === l; })[0];
    item.certainty = lv === 'known'
      ? (ef ? 'Zkusil jsi to ' + ef.n + '×. Tehdy ti stouplo přibližně o ' + NF.mmol(ef.rise) + ' mmol/l, bez toho obvykle o ' + NF.mmol(ef.without) + ' mmol/l. Zpřesňuje se s každým záznamem.'
        : (l === 'portion' ? 'Pravidlo drží porci u obvyklého množství, na které je nastavená dávka.' : 'U tohohle jídla jsi to ještě nezkoušel. Po zkoušce uvidíš, jestli to pomohlo.'))
      : 'Obecná rada ze schváleného pravidla. Jak zabere u tebe, zatím nevíme.';
    res.items.push(item);
  });
  return res;
};

/* Uložení jídla i s tím, jak pacient s radami naložil. */
NF.saveEpisode = function (S, data) {
  var t = NF.activeTask(S);
  if (!t) return { ok: false, error: 'Zápis jídla patří k aktivnímu úkolu. Žádný teď aktivní není.' };
  if (!data.foodId) return { ok: false, error: 'Vyber jídlo.' };
  var advice = (data.advice || []).map(function (a) {
    return { lever: a.lever, ruleKey: a.ruleKey, accepted: a.accepted === true ? true : a.accepted === false ? false : null, reason: a.reason || null };
  });
  var taken = advice.filter(function (a) { return a.accepted === true && a.lever !== 'portion'; })[0];
  var portionTaken = advice.some(function (a) { return a.lever === 'portion' && a.accepted === true; });
  var ep = {
    id: data.id || NF.uid('E'),
    taskId: t.id,
    planId: S.activePlanId,
    foodId: data.foodId,
    at: data.at || S.clock,
    recordedAt: S.clock,
    desc: data.desc || (NF.foodById(S, data.foodId) || {}).name || '',
    portionPlanned: data.portion || 'usual',
    portion: portionTaken ? 'usual' : (data.portion || 'usual'),
    bolusAtAdvice: data.bolusState || null,
    insulin: { reported: data.insulinReported || 'unknown', time: data.insulinTime || null },
    advice: advice,
    lever: taken ? taken.lever : null,
    context: S.illness && S.illness.active ? 'illness' : null,
    points: data.points || [],
    importedAt: data.importedAt || null,
    author: S.patient.id,
    history: []
  };
  S.episodes.push(ep);
  NF.log(S, 'episode.saved', ep.id + ' ' + ep.foodId);
  return { ok: true, episode: ep };
};
NF.correctEpisode = function (S, id, value) {
  var ep = S.episodes.filter(function (e) { return e.id === id; })[0];
  if (!ep) return { ok: false, error: 'Záznam nenalezen.' };
  if (ep.desc === value) return { ok: true, episode: ep };
  ep.history.push({ at: S.clock, field: 'desc', from: ep.desc, to: value, by: S.role });
  ep.desc = value;
  NF.log(S, 'episode.corrected', id);
  return { ok: true, episode: ep };
};

/* ---------- report pro kontrolu ----------
   Klíčové číslo: jak to dopadlo, když pacient radu přijal, oproti tomu, když ne.
   Report neříká „pacient neposlechl“ — říká, co se zkusilo a co z toho bylo. */
NF.DECLINE_REASONS = [
  ['nothome', 'Nemám to doma'],
  ['taste', 'Nechutná mi to'],
  ['time', 'Nestihl jsem to'],
  ['nowant', 'Tentokrát nechci']
];
NF.adviceOutcome = function (S, planId) {
  var eps = S.episodes.filter(function (e) {
    return (!planId || e.planId === planId) && e.advice && e.advice.some(function (a) { return a.accepted !== null; });
  });
  var acc = eps.filter(function (e) { return e.advice.some(function (a) { return a.accepted === true; }); });
  var dec = eps.filter(function (e) { return !e.advice.some(function (a) { return a.accepted === true; }); });
  var reasons = {};
  dec.forEach(function (e) {
    e.advice.forEach(function (a) { if (a.accepted === false && a.reason) reasons[a.reason] = (reasons[a.reason] || 0) + 1; });
  });
  var sum = function (list) {
    var u = list.filter(NF.usableEpisode);
    return { n: list.length, usable: u.length, rise: NF.median(u.map(NF.rise)) };
  };
  var byLever = {};
  eps.forEach(function (e) {
    e.advice.forEach(function (a) {
      if (a.accepted === null) return;
      byLever[a.lever] = byLever[a.lever] || { offered: 0, accepted: 0 };
      byLever[a.lever].offered += 1;
      if (a.accepted) byLever[a.lever].accepted += 1;
    });
  });
  var topReason = Object.keys(reasons).sort(function (a, b) { return reasons[b] - reasons[a]; })[0] || null;
  var decShare = eps.length ? dec.length / eps.length : 0;
  return {
    offered: eps.length,
    accepted: sum(acc),
    declined: sum(dec),
    reasons: reasons,
    topReason: topReason,
    byLever: byLever,
    /* Signál k rozhovoru, ne hodnocení: soustavné odmítání může znamenat obojí —
       potřebu změny režimu i nepraktickou radu. Druhé naznačuje převažující důvod. */
    signal: eps.length >= 4 && decShare >= 0.6,
    impractical: !!topReason && (topReason === 'nothome' || topReason === 'taste') && reasons[topReason] >= Math.ceil(dec.length / 2)
  };
};
/* Konzistence sacharidů mezi dny — to, co pevná dávka předpokládá. */
NF.carbConsistency = function (S, planId) {
  var list = S.episodes.filter(function (e) { return !planId || e.planId === planId; })
    .map(function (e) { return NF.carbsOf(S, e); }).filter(function (x) { return x != null; });
  if (!list.length) return null;
  return { n: list.length, min: Math.min.apply(null, list), max: Math.max.apply(null, list), median: NF.median(list),
    off: S.episodes.filter(function (e) { return (!planId || e.planId === planId) && e.portion !== 'usual'; }).length };
};

NF.buildReview = function (S) {
  var p = NF.activePlan(S);
  var counts = NF.countEpisodes(S);
  return {
    id: NF.uid('REV'),
    builtAt: S.clock,
    planId: p ? p.id : null,
    outcome: NF.adviceOutcome(S, p ? p.id : null),
    consistency: NF.carbConsistency(S, p ? p.id : null),
    counts: counts,
    question: S.questions.length ? S.questions[S.questions.length - 1].text : null,
    decision: null
  };
};
NF.decideReview = function (S, role, decision) {
  if (role !== 'doctor') return { ok: false, error: 'Rozhodnutí o plánu patří lékaři.' };
  var rev = S.reviews[S.reviews.length - 1];
  if (!rev) return { ok: false, error: 'Není sestavená kontrola.' };
  if (!decision.choice) return { ok: false, error: 'Vyber rozhodnutí.' };
  if (!decision.reason) return { ok: false, error: 'Vyber důvod rozhodnutí z připravených.' };
  rev.decision = { choice: decision.choice, reason: decision.reason, at: S.clock };
  NF.log(S, 'review.decided', decision.choice);
  return { ok: true, review: rev };
};

/* ---------- nemoc, výpadek, offline ---------- */
NF.reportIllness = function (S) {
  S.illness = { active: true, from: S.clock, reportedBy: 'pacient' };
  NF.pauseTask(S, 'illness', 'Pacient sám oznámil nemoc. Nejde o zjištění aplikací.');
  NF.log(S, 'illness.reported', '');
  return { ok: true };
};
NF.endIllness = function (S) {
  if (!S.illness) return { ok: false, error: 'Období nemoci není označené.' };
  S.illness.active = false;
  S.illness.to = S.clock;
  NF.log(S, 'illness.ended', '');
  return { ok: true };
};
/* Návrat datového toku sám neruší pauzu ani nedoplňuje chybějící body. */
NF.restoreData = function (S) {
  S.dataState.gap = false;
  S.dataState.lastValueAt = S.clock;
  NF.log(S, 'data.restored', '');
  return { ok: true };
};
NF.setOffline = function (S, on) {
  S.dataState.offline = !!on;
  if (!on) {
    if (S.ruleDelivery === 'unconfirmed') S.ruleDelivery = 'confirmed';
    S.rulesSyncAt = S.clock;
  }
  return { ok: true };
};

/* ---------- ukončení účasti ---------- */
NF.endParticipation = function (S, mode) {
  S.participation = mode;
  S.tasks.forEach(function (t) { if (t.state === 'active' || t.state === 'paused') { t.state = 'cancelled'; t.cancelledAt = S.clock; } });
  NF.log(S, 'participation.' + mode, '');
  return { ok: true };
};

})(typeof window !== 'undefined' ? window : globalThis);
