/* NutriFee — rozhodovací maketa · jádro aplikace.
   Obsahuje pouze doménový model a pravidla průchodu. Neobsahuje modelová data,
   ovládání scénářů ani texty průvodce; ty jsou ve složce demo/ a jsou odstranitelné. */
(function (global) {
'use strict';

var NF = global.NutriFee = global.NutriFee || {};

/* ---------- drobné pomůcky ---------- */
NF.SCHEMA = 5;
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
  return v == null ? null : String(v).replace('.', ',');
};

/* ---------- výchozí prázdný stav ----------
   Bez nahraných modelových dat je maketa v přípravném stavu: žádný plán,
   žádný úkol, žádné epizody. Produkční sestavení by zde četlo skutečný zdroj dat. */
NF.createState = function () {
  return {
    schema: NF.SCHEMA,
    scenario: null,
    variant: null,
    role: 'patient',
    page: 'today',
    clock: '2026-10-05T09:00:00',
    patient: { id: 'DEMO-P01', label: 'Modelový pacient 01' },
    doctor: { id: 'DEMO-L01', label: 'Modelový lékař 01' },
    garant: { id: 'DEMO-G01', label: 'Modelový garant 01' },
    onboarding: { checkAnswer: null, done: false },
    /* Zařazení a zaučení proběhnou v ordinaci, dřív než lékař vydá plán. */
    enrollment: { eligible: false, criteria: {}, compensation: null },
    training: { result: null, steps: {}, note: '' },
    wizardStep: 0,
    plans: [],
    activePlanId: null,
    tasks: [],
    episodes: [],
    segments: [],
    reviews: [],
    rules: [],
    incidents: [],
    questions: [],
    safetyPlan: null,
    safetySyncAt: null,
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

/* ---------- úplnost epizody ----------
   Chybějící údaj není nula. Epizoda bez kontextu zůstává viditelná,
   ale nezapočítává se jako úplná. */
NF.episodeStatus = function (ep) {
  var missing = [];
  if (!ep.insulin || ep.insulin.reported === 'unknown') missing.push('údaj o inzulinu a jeho čase');
  else if (!ep.insulin.time) missing.push('čas podání inzulinu');
  /* Úsek po jídle je úplný jen tehdy, když sahá až na konec sledovaného okna.
     Opožděně doplněný jednotlivý bod mezeru nezaceluje. */
  var pts = (ep.points || []).filter(function (p) { return p.mmol != null; });
  var hasEnd = (ep.points || []).some(function (p) { return p.mmol != null && p.min >= 120; });
  if (pts.length < 4 || !hasEnd) missing.push('senzorová data po jídle');
  return { complete: missing.length === 0, missing: missing, points: pts.length };
};
NF.countEpisodes = function (S, taskId) {
  var list = S.episodes.filter(function (e) { return !taskId || e.taskId === taskId; });
  var complete = list.filter(function (e) { return NF.episodeStatus(e).complete; });
  return { recorded: list.length, complete: complete.length, list: list };
};

/* ---------- zařazení a zaučení ----------
   Cesta začíná u lékaře v ordinaci. Plán nelze vydat bez posouzení způsobilosti
   a bez dokončeného zaučení; úkol se neaktivuje bez ověření porozumění. */
NF.ELIGIBILITY = [
  ['adult', 'Dospělý pacient s diabetem 2. typu'],
  ['basal', 'Stabilní bazál–bolus režim, nejméně tři dávky inzulinu denně'],
  ['cgm', 'Nově zavedený senzor CGM nebo isCGM'],
  ['excl', 'Není nově zahájený inzulin, pumpa, premix ani prandiální titrace']
];
NF.setEligibility = function (S, key, value) {
  S.enrollment.criteria[key] = !!value;
  S.enrollment.eligible = NF.ELIGIBILITY.every(function (c) { return !!S.enrollment.criteria[c[0]]; });
  return S.enrollment.eligible;
};
/* Úkol jde přiřadit jen z předdefinovaného katalogu a jen s modelově
   schváleným pravidlem. Lékař žádný text nepíše. */
NF.assignTask = function (S, item) {
  if (!item) return { ok: false, error: 'Vyber úkol z katalogu.' };
  if (!NF.isRuleUsable(S, item.ruleId)) {
    return { ok: false, error: 'Pravidlo ' + item.ruleId + ' nemá modelově schválenou verzi. Úkol nelze přiřadit.' };
  }
  S.tasks = S.tasks.filter(function (t) { return t.id !== 'T1'; });
  S.tasks.unshift({
    id: 'T1', catalogId: item.id, kind: item.kind, state: 'prepared',
    question: item.question, title: item.title,
    ruleId: item.ruleId, ruleVersion: 'v1',
    conditions: item.conditions, minimum: item.minimum, burden: item.burden,
    target: item.target, planId: null, conclusion: null, pauseReason: null
  });
  if (S.draft) S.draft.taskId = 'T1';
  NF.log(S, 'task.assigned', item.id);
  return { ok: true };
};

NF.TRAINING = [
  ['app', 'Pacient si otevřel aplikaci a našel dnešní úkol'],
  ['record', 'Pacient zvládl zapsat zkušební jídlo'],
  ['safety', 'Pacient našel bezpečnostní a kontaktní plán'],
  ['limits', 'Pacient řekl vlastními slovy, co aplikace nedělá']
];
NF.finishTraining = function (S, result, note) {
  S.training.result = result;
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
NF.taskById = function (S, id) {
  return S.tasks.filter(function (t) { return t.id === id; })[0] || null;
};
NF.ruleKey = function (r) { return r.id + '|' + r.version; };
NF.ruleByKey = function (S, key) {
  return S.rules.filter(function (r) { return NF.ruleKey(r) === key; })[0] || null;
};
/* Pro úkol je rozhodující, zda k jeho pravidlu existuje použitelná schválená verze. */
NF.ruleById = function (S, id) {
  var list = S.rules.filter(function (r) { return r.id === id; });
  return list.filter(function (r) { return r.status === 'approved'; })[0] || list[0] || null;
};

/* Vydání plánu — smí jen role lékaře a jen s úplnými náležitostmi. */
NF.issuePlan = function (S, role) {
  var d = S.draft;
  if (role !== 'doctor') return { ok: false, error: 'Plán vydává lékař. V pacientské roli vydání není možné.' };
  if (!d) return { ok: false, error: 'Není připravený návrh plánu.' };
  var chybi = [];
  if (!S.enrollment || !S.enrollment.eligible) chybi.push('posouzení způsobilosti pro kohortu');
  if (!d.medicationChecked) chybi.push('ověření modelového seznamu léčby');
  if (!S.training || S.training.result !== 'done') chybi.push('dokončené zaučení a předání zařízení');
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
    note: d.note || '',
    previousId: prev ? prev.id : null,
    handedOver: false,
    understood: false
  };
  S.plans.push(plan);
  S.activePlanId = plan.id;
  S.safetyPlan = d.safety;
  S.safetySyncAt = S.clock;
  S.draft = null;
  NF.log(S, 'plan.issued', plan.id + ' ' + plan.version);
  return { ok: true, plan: plan };
};

/* Předání pacientovi a ověření porozumění. Aktivace úkolu až po obojím. */
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
    return { ok: false, error: 'Zaučení nebylo dokončeno. Klinický úkol se neaktivuje.' };
  }
  p.understood = true;
  var t = NF.taskById(S, p.taskId);
  if (t && t.state === 'prepared') {
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
/* Obnovení jen po modelovém potvrzení lékařem — nikoli pouhým uplynutím času
   nebo návratem datového toku. */
NF.resumeTask = function (S, role, reason) {
  var t = S.tasks.filter(function (x) { return x.state === 'paused'; })[0];
  if (!t) return { ok: false, error: 'Žádný pozastavený úkol.' };
  if (role !== 'doctor') return { ok: false, error: 'Obnovení úkolu potvrzuje v této demonstraci lékař.' };
  if (S.illness && S.illness.active) return { ok: false, error: 'Období nemoci je stále označené jako trvající. Nejdřív je ukončete.' };
  var p = NF.activePlan(S);
  if (!p || p.state !== 'issued') return { ok: false, error: 'Plán není v platném stavu.' };
  if (t.pauseReason === 'rule' && (!t.ruleId || !NF.isRuleUsable(S, t.ruleId))) {
    return { ok: false, error: 'Pravidlo úkolu není v použitelné verzi. Nejdřív musí garant schválit novou verzi.' };
  }
  t.state = 'active';
  t.resumedAt = S.clock;
  t.resumeReason = reason || 'Lékař modelově ověřil aktuálnost plánu.';
  t.pauseReason = null;
  NF.log(S, 'task.resumed', t.id);
  return { ok: true, task: t };
};
NF.completeTask = function (S, conclusion) {
  var t = NF.activeTask(S);
  if (!t) return { ok: false, error: 'Žádný aktivní úkol.' };
  if (!conclusion) return { ok: false, error: 'Nejdřív vyber nebo uprav závěr.' };
  t.state = 'done';
  t.conclusion = conclusion;
  t.completedAt = S.clock;
  NF.log(S, 'task.done', t.id);
  return { ok: true, task: t };
};

/* ---------- epizody ---------- */
NF.saveEpisode = function (S, data) {
  var t = NF.activeTask(S);
  if (!t) return { ok: false, error: 'Zápis epizody patří k aktivnímu úkolu. Žádný není.' };
  var ep = {
    id: data.id || NF.uid('E'),
    taskId: t.id,
    planId: S.activePlanId,
    at: data.at || S.clock,
    recordedAt: S.clock,
    desc: data.desc || '',
    usualPortion: !!data.usualPortion,
    insulin: { reported: data.insulinReported || 'unknown', time: data.insulinTime || null },
    circumstances: data.circumstances || '',
    points: data.points || [],
    importedAt: data.importedAt || null,
    author: S.patient.id,
    history: []
  };
  S.episodes.push(ep);
  NF.log(S, 'episode.saved', ep.id);
  return { ok: true, episode: ep };
};
NF.correctEpisode = function (S, id, field, value) {
  var ep = S.episodes.filter(function (e) { return e.id === id; })[0];
  if (!ep) return { ok: false, error: 'Epizoda nenalezena.' };
  var before = field === 'desc' ? ep.desc : ep.circumstances;
  if (before === value) return { ok: true, episode: ep };
  ep.history.push({ at: S.clock, field: field, from: before, to: value, by: S.role });
  if (field === 'desc') ep.desc = value; else ep.circumstances = value;
  NF.log(S, 'episode.corrected', id + ' ' + field);
  return { ok: true, episode: ep };
};

/* ---------- změnová rada ----------
   Povolena pouze před bolusem A zároveň v mezích plánu a schváleného pravidla.
   Samotné „před bolusem“ oprávnění nezakládá. */
NF.adviceAllowed = function (S, bolusState) {
  var p = NF.activePlan(S);
  var t = NF.activeTask(S);
  if (bolusState !== 'before') return { allowed: false, why: 'Změnová rada je možná jen před podáním bolusu. Podaný nebo neznámý stav podání to neumožňuje.' };
  if (!p || !p.understood) return { allowed: false, why: 'Bez předaného a potvrzeného plánu se změnová rada nenabízí.' };
  if (!p.allowChange) return { allowed: false, why: 'Platný plán změnové rady nepovoluje. Zůstává pozorovací zápis.' };
  if (!t || t.state !== 'active' || t.kind !== 'change') return { allowed: false, why: 'Aktivní úkol je pozorovací. Změnová rada k němu nepatří.' };
  if (!t.ruleId || !NF.isRuleUsable(S, t.ruleId)) return { allowed: false, why: 'Pravidlo není v modelově schválené použitelné verzi.' };
  return { allowed: true, why: '' };
};

/* ---------- katalog pravidel ---------- */
NF.isRuleUsable = function (S, id) {
  return S.rules.some(function (r) { return r.id === id && r.status === 'approved'; });
};
NF.approveRule = function (S, role, key) {
  if (role !== 'garant') return { ok: false, error: 'Pravidla modelově schvaluje garant.' };
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
  if (!reason) return { ok: false, error: 'Uveď důvod vyřazení.' };
  r.status = 'retired';
  r.retiredReason = reason;
  r.retiredAt = S.clock;
  /* Dopad: pozastavit dotčený úkol. Předpis plánu se nemění. */
  var affected = S.tasks.filter(function (t) { return t.ruleId === r.id && t.state === 'active'; });
  affected.forEach(function (t) {
    t.state = 'paused';
    t.pauseReason = 'rule';
    t.pauseDetail = 'Pravidlo ' + r.id + ' ' + r.version + ' bylo vyřazeno z dalšího použití.';
    t.pausedAt = S.clock;
  });
  S.ruleDelivery = S.dataState.offline ? 'unconfirmed' : 'confirmed';
  NF.log(S, 'rule.retired', r.id);
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

/* ---------- jednostránková kontrola ----------
   Pořadí částí je dané zadáním a nemění se podle dostupnosti dat. */
NF.buildReview = function (S, opts) {
  opts = opts || {};
  var p = NF.activePlan(S);
  var eps = S.episodes.slice();
  var counts = NF.countEpisodes(S);
  var review = {
    id: NF.uid('REV'),
    builtAt: S.clock,
    planId: p ? p.id : null,
    sections: {},
    findings: [],
    question: S.questions.length ? S.questions[S.questions.length - 1].text : null,
    decision: null
  };
  review.sections.safety = {
    events: S.safetyEvents || [],
    text: (S.safetyEvents && S.safetyEvents.length)
      ? null
      : 'Žádná bezpečnostní událost nebyla zaznamenána. To není tvrzení, že žádná nenastala.',
    completeness: counts.recorded === 0
      ? 'Pacient v tomto období nezaznamenal žádnou epizodu.'
      : counts.recorded + ' zaznamenaných epizod, z toho ' + counts.complete + ' s potřebným kontextem.'
  };
  review.sections.plan = {
    planId: p ? p.id : null,
    prescribed: p ? p.prescription : 'nemáme údaj',
    patientReported: eps.length
      ? eps.map(function (e) {
          return NF.fmtShort(e.at) + ': ' + (e.insulin.reported === 'unknown' ? 'údaj chybí' :
            (e.insulin.reported === 'per-plan' ? 'pacient uvádí dávku podle plánu' : 'pacient uvádí, že dávku nepodal') +
            (e.insulin.time ? ', čas ' + e.insulin.time : ''));
        })
      : ['Pacient nezaznamenal žádný údaj o podání.'],
    verified: 'nemáme údaj — nezávislé ověření podání není v této maketě k dispozici'
  };
  review.sections.sensor = S.sensorSummary || null;
  review.findings = opts.findings || S.findings || [];
  return review;
};
NF.decideReview = function (S, role, decision) {
  if (role !== 'doctor') return { ok: false, error: 'Rozhodnutí o plánu patří lékaři.' };
  var rev = S.reviews[S.reviews.length - 1];
  if (!rev) return { ok: false, error: 'Není sestavená kontrola.' };
  if (!decision.choice) return { ok: false, error: 'Vyber rozhodnutí.' };
  rev.decision = { choice: decision.choice, reason: decision.reason || '', at: S.clock };
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
  if (!on && S.ruleDelivery === 'unconfirmed') S.ruleDelivery = 'confirmed';
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
