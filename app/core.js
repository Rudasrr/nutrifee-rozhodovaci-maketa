/* NutriFee — jádro aplikace (doména). Podle 15-ZDROJ-PRAVDY-MAKETA.md.
   Žádná modelová data, žádné texty prezentace; ty jsou ve složce demo/ a jsou odstranitelné.

   Aplikace se učí z pacientových zápisů, jak jeho tělo reaguje na jídla, před jídlem radí
   (porce k obvyklé, doplněk, pořadí, pohyb), připomíná předepsaný inzulin a ptá se na podání.
   Dávku nikdy nepočítá ani nemění. Lékaři na kontrole předkládá návrhy s důvodem a postupem.
   Každý výpočet a rada pochází z položky schvalovacího registru. */
(function (global) {
'use strict';

var NF = global.NutriFee = global.NutriFee || {};

/* Číslo verze uloženého stavu. Po každé změně struktury se zvýší; musí souhlasit s ?v= v HTML. */
NF.SCHEMA = 17;
NF.STORAGE = 'nutrifee-maketa';
var MONTHS = ['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince'];
var DAYS = ['neděle','pondělí','úterý','středa','čtvrtek','pátek','sobota'];

/* ---------- pomůcky ---------- */
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
NF.fmtDate = function (iso) { if (!iso) return '—'; var d = NF.parse(iso); return d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
NF.fmtDayDate = function (iso) { if (!iso) return '—'; var d = NF.parse(iso); return DAYS[d.getDay()] + ' ' + d.getDate() + '. ' + MONTHS[d.getMonth()]; };
NF.fmtShort = function (iso) { if (!iso) return '—'; var d = NF.parse(iso); return d.getDate() + '. ' + (d.getMonth() + 1) + '. ' + d.getFullYear(); };
NF.fmtTime = function (iso) { if (!iso) return '—'; var d = NF.parse(iso); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); };
NF.fmtDateTime = function (iso) { return iso ? NF.fmtShort(iso) + ' ' + NF.fmtTime(iso) : '—'; };
function localIso(d) {
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}
NF.addDays = function (iso, n) { var d = NF.parse(iso); d.setDate(d.getDate() + n); return localIso(d); };
NF.addMin = function (iso, n) { var d = NF.parse(iso); d.setMinutes(d.getMinutes() + n); return localIso(d); };
NF.daysBetween = function (a, b) { return Math.round((NF.parse(b) - NF.parse(a)) / 86400000); };
NF.mmol = function (v) { return v == null ? '—' : String(Math.round(v * 10) / 10).replace('.', ','); };
NF.pct = function (a, b) { return b ? Math.round(a / b * 100) : null; };
NF.median = function (list) {
  var a = list.filter(function (x) { return x != null; }).slice().sort(function (x, y) { return x - y; });
  if (!a.length) return null;
  var m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
NF.quantile = function (list, q) {
  var a = list.filter(function (x) { return x != null; }).slice().sort(function (x, y) { return x - y; });
  if (!a.length) return null;
  var pos = (a.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return a[lo] + (a[hi] - a[lo]) * (pos - lo);
};
NF.r1 = function (v) { return v == null ? null : Math.round(v * 10) / 10; };
NF.plural = function (n, one, few, many) { return n + ' ' + (n === 1 ? one : n >= 2 && n <= 4 ? few : many); };

/* ---------- výchozí prázdný stav ----------
   Bez demonstrační vrstvy startuje aplikace prázdná: žádný registr, žádná jídla, žádný plán.
   Bez schválené položky registru nic nevyhodnocuje ani neradí. */
NF.createState = function () {
  return {
    schema: NF.SCHEMA,
    role: 'patient', page: 'today',
    clock: '2026-10-05T09:00:00',
    patient: { id: 'DEMO-P01', label: 'Modelový pacient 01' },
    doctor: { id: 'DEMO-L01', label: 'Modelový lékař 01 (garant)' },
    nurse: { id: 'DEMO-S01', label: 'Modelová sestra 01' },
    registry: { items: [], history: [] },
    foods: [],
    plans: [], activePlanId: null,
    habits: [],
    episodes: [],
    basalLog: [],
    nights: [],
    sensorSummary: null,
    enrollment: { eligible: false, criteria: {} },
    training: { result: null, steps: {}, previewPage: null },
    onboarding: { checkAnswer: null },
    draft: null,
    meal: null,
    illness: null, illnessLog: [],
    review: null,
    questions: [],
    participation: 'active',
    fb: { resultSeen: {}, milestones: [], weeksSeen: {} },
    events: [],
    wizardStep: 0,
    toast: '', error: ''
  };
};

/* ---------- úložiště ---------- */
NF.storageOK = true;
NF.load = function () {
  var s;
  try { var raw = global.localStorage && global.localStorage.getItem(NF.STORAGE); s = raw ? JSON.parse(raw) : null; }
  catch (e) { NF.storageOK = false; s = null; }
  if (!s || s.schema !== NF.SCHEMA || !Array.isArray(s.plans)) s = NF.createState();
  return s;
};
NF.save = function (S) {
  try { global.localStorage && global.localStorage.setItem(NF.STORAGE, JSON.stringify(S)); } catch (e) { NF.storageOK = false; }
};

/* ---------- stopa ----------
   Každý výpočet, rada a rozhodnutí se zapíše se vstupy, položkou registru a výstupem.
   Nikdy nevolá síť ani generativní AI; vše je deterministické. */
NF.log = function (S, what, detail, data) {
  S.events.push({ at: S.clock, who: S.role, what: what, detail: detail || '', data: data || null });
  if (S.events.length > 4000) S.events.shift();
};
NF.exportTrace = function (S) {
  return JSON.stringify({ exported: S.clock, schema: NF.SCHEMA, note: 'Deterministická stopa. Žádný krok nepoužívá generativní AI ani síť.',
    registry: S.registry, events: S.events }, null, 2);
};

/* ---------- schvalovací registr ----------
   Položka: { id, version, cat, title, summary, detail, params, text, lever, kind, status, history }
   status: approved | edited | rejected. Použitelná je approved nebo edited. */
NF.CATS = [
  ['kohorta', 'Kohorta a zařazení'], ['plan', 'Startovní plán a úkoly'], ['vypocty', 'Výpočty a prahy'],
  ['rady', 'Rady a texty'], ['skore', 'Reakce jídel'], ['davka', 'Návrhy k dávce'], ['pokyny', 'Osobní pokyny'],
  ['zauceni', 'Zaučení'], ['jidla', 'Jídla a štítky'], ['report', 'Report a souhrny'], ['provoz', 'Provoz']
];
NF.catLabel = function (c) { var x = NF.CATS.filter(function (k) { return k[0] === c; })[0]; return x ? x[1] : c; };
NF.STATUS = { approved: 'schváleno', edited: 'schváleno s úpravou', rejected: 'zamítnuto' };
NF.item = function (S, id) { return S.registry.items.filter(function (r) { return r.id === id; })[0] || null; };
NF.usable = function (S, id) { var r = NF.item(S, id); return !!r && r.status !== 'rejected'; };
NF.param = function (S, id, key, fallback) {
  var r = NF.item(S, id);
  return r && r.params && r.params[key] != null ? r.params[key] : fallback;
};
NF.decideItem = function (S, id, status, comment, params) {
  var r = NF.item(S, id);
  if (!r) return { ok: false, error: 'Položka nenalezena.' };
  if (S.role !== 'doctor') return { ok: false, error: 'Registr spravuje lékař-garant.' };
  var from = { status: r.status, params: NF.clone(r.params || {}) };
  r.status = status;
  if (params) { Object.keys(params).forEach(function (k) { r.params[k] = params[k]; }); }
  r.decidedAt = S.clock; r.decidedBy = S.doctor.id; r.comment = comment || '';
  var h = { id: NF.uid('H'), at: S.clock, by: S.doctor.id, item: id, from: from, to: { status: status, params: NF.clone(r.params || {}) }, comment: comment || '' };
  S.registry.history.push(h);
  NF.log(S, 'registr.rozhodnuti', id + ' → ' + status, h);
  return { ok: true, item: r };
};

/* ---------- zařazení ---------- */
NF.ELIGIBILITY = [
  ['adult', 'Dospělý s diabetem 2. typu'],
  ['insulinOnly', 'Léčba jen inzulinem, bez perorálních antidiabetik'],
  ['regimen', 'Bazál 1× večer + prandiální inzulin ke třem hlavním jídlům, pevné dávky'],
  ['cgm', 'Senzor glukózy (CGM)']
];
NF.setEligibility = function (S, key, value) {
  S.enrollment.criteria[key] = !!value;
  S.enrollment.eligible = NF.ELIGIBILITY.every(function (c) { return !!S.enrollment.criteria[c[0]]; });
  return S.enrollment.eligible;
};

/* ---------- plán, dávky, návyky, pokyny ---------- */
NF.MEALS = [['breakfast', 'snídaně', 'Snídaně', 'snídani'], ['lunch', 'oběd', 'Oběd', 'obědu'], ['dinner', 'večeře', 'Večeře', 'večeři']];
/* cap: true = s velkým písmenem, 'dat' = 3. pád („k snídani“) */
NF.mealLabel = function (m, cap) { var x = NF.MEALS.filter(function (k) { return k[0] === m; })[0]; return x ? (cap === 'dat' ? x[3] : cap ? x[2] : x[1]) : m; };
NF.DEFAULT_TARGETS = { low: 3.9, high: 10.0, fastingHigh: 7.2, tirGoal: 70 };
/* Den má tři pojmenované sloty: snídaně, oběd, večeře. Žádná okna nastavovaná lékařem.
   Čas se používá jen hrubě (denní doba), aby aplikace věděla, že prázdný slot už minul:
   snídaně po 10:00, oběd po 15:30, večeře po 21:00. Pacient se může vždy opravit sám. */
NF.DAYPART_END = { breakfast: 10, lunch: 15.5, dinner: 21 };
NF.fmtHour = function (h) { var hh = Math.floor(h), mm = Math.round((h - hh) * 60); return hh + (mm ? ':' + (mm < 10 ? '0' : '') + mm : ''); };
/* Stav slotu: done | skipped | missed (prázdný a denní doba minula) | now (prázdný, na řadě) | later (prázdný, přijde po jiném) */
NF.mealState = function (S, meal) {
  var d = NF.parse(S.clock), h = d.getHours() + d.getMinutes() / 60, day = NF.day(S.clock);
  var eaten = S.episodes.some(function (x) { return x.meal === meal && NF.day(x.at) === day; });
  var skipped = !!(S.skipped && S.skipped[day] && S.skipped[day][meal]);
  var state = eaten ? 'done' : skipped ? 'skipped' : h >= NF.DAYPART_END[meal] ? 'missed' : 'now';
  return { meal: meal, state: state };
};
NF.daySlots = function (S) { return NF.MEALS.map(function (m) { return NF.mealState(S, m[0]); }); };
/* Slot, na který se Dnes ptá: nejdřív minulý prázdný (doptat se), pak první prázdný na řadě. */
NF.focusMeal = function (S) {
  var slots = NF.daySlots(S);
  var missed = slots.filter(function (x) { return x.state === 'missed'; })[0];
  if (missed) return missed;
  var open = slots.filter(function (x) { return x.state === 'now'; });
  if (!open.length) return null;
  open[0].state = 'now'; return open[0];
};
NF.skipMeal = function (S, meal, insulin) {
  var day = NF.day(S.clock);
  S.skipped = S.skipped || {}; S.skipped[day] = S.skipped[day] || {};
  S.skipped[day][meal] = { at: S.clock, insulin: insulin || 'unknown' };
  NF.log(S, 'jidlo.vynechano', meal + ' · inzulin ' + (insulin || 'nevím'), { meal: meal, insulin: insulin });
  return { ok: true, warn: insulin === 'as' || insulin === 'other' };
};

NF.newDraft = function (S) {
  return {
    planId: 'P' + (S.plans.length + 1), version: 'v1',
    doses: { basal: { units: 18, time: '21:00' }, breakfast: { units: 8 }, lunch: { units: 10 }, dinner: { units: 8 } },
    habits: [], instructions: [], targets: NF.clone(NF.DEFAULT_TARGETS), advice: { off: [], prefer: [] },
    medicationChecked: false, instructionsChecked: false, validUntil: NF.addDays(S.clock, 92), decisions: []
  };
};
NF.setDose = function (S, key, delta) {
  var d = S.draft; if (!d) return;
  var x = d.doses[key]; x.units = Math.max(0, Math.min(60, x.units + delta));
};
NF.toggleHabit = function (S, catalogId) {
  var d = S.draft; if (!d) return;
  var i = d.habits.indexOf(catalogId);
  if (i >= 0) d.habits.splice(i, 1); else d.habits.push(catalogId);
};
NF.setInstruction = function (S, id, value) {
  var d = S.draft; if (!d) return;
  var ex = d.instructions.filter(function (x) { return x.id === id; })[0];
  if (value === null) { d.instructions = d.instructions.filter(function (x) { return x.id !== id; }); return; }
  if (ex) ex.value = value; else d.instructions.push({ id: id, value: value });
};
NF.planBlockers = function (S) {
  var d = S.draft, chybi = [];
  if (!d) return ['návrh plánu'];
  if (!S.enrollment.eligible) chybi.push('potvrzení způsobilosti');
  if (!d.medicationChecked) chybi.push('ověření dávek s pacientem');
  if (!d.habits.length) chybi.push('aspoň jeden návyk');
  if (!d.instructions.length) chybi.push('osobní pokyny');
  if (!d.instructionsChecked) chybi.push('potvrzení, že pokyny byly probrány');
  return chybi;
};
NF.activePlan = function (S) { return S.plans.filter(function (p) { return p.id === S.activePlanId; })[0] || null; };
NF.planById = function (S, id) { return S.plans.filter(function (p) { return p.id === id; })[0] || null; };
NF.targets = function (S) { var p = NF.activePlan(S); return (p && p.targets) || NF.DEFAULT_TARGETS; };
NF.instructions = function (S) { var p = NF.activePlan(S); return (p && p.instructions) || []; };
/* Rady svázané s plánem (15, odst. 9): lékař může radu pro pacienta vypnout nebo nahradit. */
NF.planAdvice = function (S, p) { p = p || NF.activePlan(S); return (p && p.advice) || { off: [], prefer: [] }; };

NF.issuePlan = function (S, catalog) {
  if (S.role !== 'doctor') return { ok: false, error: 'Plán vydává lékař.' };
  var chybi = NF.planBlockers(S);
  if (chybi.length) return { ok: false, error: 'Plán zatím nelze vydat. Chybí: ' + chybi.join(', ') + '.' };
  var d = S.draft, prev = NF.activePlan(S);
  var plan = {
    id: d.planId, version: d.version, author: S.doctor.id, issuedAt: S.clock, effectiveFrom: S.clock, validUntil: d.validUntil,
    doses: NF.clone(d.doses), instructions: NF.clone(d.instructions), targets: NF.clone(d.targets), habits: d.habits.slice(), advice: NF.clone(d.advice || { off: [], prefer: [] }),
    decisions: d.decisions || [], previousId: prev ? prev.id : null, handedOver: false, understood: false, state: 'issued'
  };
  if (prev) { prev.state = 'superseded'; prev.validUntil = S.clock; }
  S.plans.push(plan); S.activePlanId = plan.id; S.nextVisit = plan.validUntil;
  S.habits.forEach(function (h) { if (h.state === 'active') { h.state = 'done'; h.endedAt = S.clock; } });
  d.habits.forEach(function (cid) {
    var c = (catalog || []).filter(function (x) { return x.id === cid; })[0] || { id: cid, title: cid };
    S.habits.push({ id: NF.uid('H'), catalogId: cid, title: c.title, short: c.short || c.title, why: c.why || '', how: c.how || '', item: c.item, planId: plan.id, state: 'prepared', training: c.training || [] });
  });
  S.draft = null;
  NF.log(S, 'plan.vydan', plan.id, { doses: plan.doses, habits: plan.habits, instructions: plan.instructions, targets: plan.targets });
  return { ok: true, plan: plan };
};
NF.handover = function (S) { var p = NF.activePlan(S); if (!p) return { ok: false, error: 'Není co předat.' }; p.handedOver = true; NF.log(S, 'plan.predan', p.id); return { ok: true }; };
NF.confirmUnderstanding = function (S) {
  var p = NF.activePlan(S);
  if (!p || !p.handedOver) return { ok: false, error: 'Plán zatím nebyl předán.' };
  if (!S.training || S.training.result !== 'done') return { ok: false, error: 'Zaučení u sestry nebylo dokončeno. Návyky nezačnou platit.' };
  p.understood = true;
  S.habits.forEach(function (h) { if (h.planId === p.id && h.state === 'prepared') { h.state = 'active'; h.activatedAt = S.clock; } });
  NF.log(S, 'plan.prevzat', p.id);
  return { ok: true };
};
NF.activeHabits = function (S) { return S.habits.filter(function (h) { return h.state === 'active'; }); };
NF.hasHabit = function (S, catalogId) { return NF.activeHabits(S).some(function (h) { return h.catalogId === catalogId; }); };

/* Zaučení: body z návyků + tři pevné. */
NF.FIXED_TRAINING = [
  ['app', 'Pacient si otevřel aplikaci a našel obrazovku Dnes', 'today'],
  ['safety', 'Pacient našel své osobní pokyny v části Bezpečí', 'safety'],
  ['contacts', 'Pacient ví, kam se obrátit s technickým problémem a kam se zdravotním', 'safety']
];
NF.trainingItems = function (S) {
  var list = NF.FIXED_TRAINING.map(function (x) { return { id: x[0], text: x[1], page: x[2] }; });
  var p = NF.activePlan(S);
  S.habits.filter(function (h) { return p && h.planId === p.id; }).forEach(function (h) {
    (h.training || []).forEach(function (t) { if (!list.some(function (l) { return l.id === t.id; })) list.push(t); });
  });
  return list;
};
NF.finishTraining = function (S, result) {
  if (S.role !== 'nurse') return { ok: false, error: 'Zaučení potvrzuje sestra.' };
  if (result === 'done' && !NF.trainingItems(S).every(function (t) { return S.training.steps[t.id]; })) return { ok: false, error: 'Dokud některý bod chybí, zaučení nelze dokončit.' };
  S.training.result = result; S.training.at = S.clock; S.training.by = S.nurse.id;
  NF.log(S, 'zauceni.' + result, '');
  return { ok: true };
};

/* ---------- jídla ----------
   Jídlo má název a tři hrubé štítky (příloha, příprava, velikost). Žádná makra. */
NF.TAGS = {
  side: [['brambory', 'brambory / kaše'], ['ryze', 'rýže'], ['testoviny', 'těstoviny'], ['knedlik', 'knedlík'], ['pecivo', 'pečivo'], ['bez', 'bez přílohy']],
  prep: [['smazene', 'smažené'], ['varene', 'vařené / pečené'], ['studene', 'studené']],
  size: [['male', 'malé'], ['bezne', 'běžné'], ['velke', 'velké']]
};
NF.tagLabel = function (group, key) { var x = NF.TAGS[group].filter(function (k) { return k[0] === key; })[0]; return x ? x[1] : key; };
NF.foodById = function (S, id) { return S.foods.filter(function (f) { return f.id === id; })[0] || null; };
NF.addFood = function (S, name, tags) {
  if (!name || !name.trim()) return { ok: false, error: 'Napiš, co jsi jedl.' };
  if (!tags || !tags.side || !tags.prep || !tags.size) return { ok: false, error: 'Klepni na přílohu, přípravu a velikost.' };
  var f = { id: NF.uid('F'), name: name.trim(), tags: tags, custom: true, addedAt: S.clock };
  S.foods.push(f);
  NF.log(S, 'jidlo.pridano', f.name, f);
  return { ok: true, food: f };
};
NF.searchFoods = function (S, q, meal) {
  var n = String(q || '').toLowerCase().trim();
  return S.foods.filter(function (f) { return !n || f.name.toLowerCase().indexOf(n) >= 0; })
    .sort(function (a, b) { return (b.custom ? 1 : 0) - (a.custom ? 1 : 0) || a.name.localeCompare(b.name, 'cs'); }).slice(0, 12);
};
NF.recentFoods = function (S, meal) {
  var seen = {}, out = [];
  S.episodes.slice().reverse().forEach(function (e) {
    if (meal && e.meal !== meal) return;
    if (!seen[e.foodId]) { seen[e.foodId] = 1; var f = NF.foodById(S, e.foodId); if (f) out.push(f); }
  });
  return out.slice(0, 6);
};
NF.similarFoods = function (S, food) {
  return S.foods.filter(function (f) { return f.id !== food.id && f.tags.side === food.tags.side && f.tags.prep === food.tags.prep; });
};

/* ---------- zápisy jídel ----------
   ep = { id, planId, meal, foodId, at, portion, portionPlanned, insulin:{prescribed, confirmed, units, time}, doseKey,
          advice:[{lever,item,accepted,reason}], context, points:[{min,mmol}], peak, at2h } */
NF.PORTIONS = [['usual', 'Obvyklá'], ['bigger', 'Větší než obvykle'], ['smaller', 'Menší než obvykle']];
NF.INSULIN = { as: 'podle plánu', other: 'jinak', none: 'nepodal', unknown: 'nevím' };
NF.peakOf = function (points) {
  var pts = (points || []).filter(function (p) { return p.mmol != null && p.min <= 120; });
  return pts.length ? Math.max.apply(null, pts.map(function (p) { return p.mmol; })) : null;
};
NF.at2h = function (points) { var p = (points || []).filter(function (x) { return x.mmol != null && x.min === 120; })[0]; return p ? p.mmol : null; };
NF.complete = function (ep) {
  var pts = (ep.points || []).filter(function (p) { return p.mmol != null; });
  return pts.length >= 4 && pts.some(function (p) { return p.min === 0; }) && pts.some(function (p) { return p.min >= 120; });
};
NF.doseKey = function (S, meal) { var p = NF.activePlan(S); return p && p.doses[meal] ? meal + ':' + p.doses[meal].units : meal + ':?'; };
/* Započítaný zápis: úplná data, inzulin potvrzen podle plánu, mimo nemoc, obvyklá porce, stejná dávka jako teď. */
/* Včas = inzulin do ±tolerance (D-CISTA, 15 min) od času jídla. */
NF.minutesOf = function (iso) { var d = NF.parse(iso); return d.getHours() * 60 + d.getMinutes(); };
NF.onTime = function (S, ep) {
  if (!ep.insulin || !ep.insulin.time) return false;
  var tol = NF.param(S, 'D-CISTA', 'tolerance_min', 15), hm = String(ep.insulin.time).split(':');
  return Math.abs((Number(hm[0]) * 60 + Number(hm[1])) - NF.minutesOf(ep.at)) <= tol;
};
NF.usableEp = function (S, ep) {
  return NF.complete(ep) && ep.insulin && ep.insulin.confirmed === 'as' && NF.onTime(S, ep) && ep.context !== 'illness' && ep.portion === 'usual' && ep.doseKey === NF.doseKey(S, ep.meal);
};
NF.whyNotUsable = function (S, ep) {
  if (ep.context === 'illness') return 'z doby nemoci';
  if (!NF.complete(ep)) return 'chybí data ze senzoru';
  if (!ep.insulin || ep.insulin.confirmed !== 'as') return 'inzulin nepotvrzen podle plánu';
  if (!NF.onTime(S, ep)) return 'inzulin mimo ±' + NF.param(S, 'D-CISTA', 'tolerance_min', 15) + ' min od jídla';
  if (ep.portion !== 'usual') return 'jiná než obvyklá porce';
  if (ep.doseKey !== NF.doseKey(S, ep.meal)) return 'při jiné dávce';
  return null;
};

/* ---------- učení: reakce na jídlo ----------
   Pravidlo R-REAKCE: známé jídlo od minKnown započítaných zápisů; rozmezí = p10–p90 vrcholu 0–120 min;
   „v cíli“ = vrchol ≤ horní cíl. Pravidlo R-PODOBNOST: podobné = shoda štítků příloha + příprava. */
/* Stejné jídlo u dvou jídel dne se slévá jen při stejné dávce; kontext = slot, ve kterém se o jídle rozhoduje (jinak nejčastější). */
NF.dominantMeal = function (S, foodId) { var c = {}; S.episodes.forEach(function (e) { if (e.foodId === foodId) c[e.meal] = (c[e.meal] || 0) + 1; }); return Object.keys(c).sort(function (a, b) { return c[b] - c[a]; })[0] || null; };
NF.sameDose = function (S, ep, meal) {
  if (!meal || ep.meal === meal) return true;
  var p = NF.activePlan(S), a = p && p.doses[ep.meal], b = p && p.doses[meal];
  return a && b ? a.units === b.units : !a && !b;
};
NF.foodStats = function (S, foodId, filter, meal) {
  meal = meal || NF.dominantMeal(S, foodId);
  var eps = S.episodes.filter(function (e) { return e.foodId === foodId && (!filter || filter(e)); });
  var usable = eps.filter(function (e) { return NF.usableEp(S, e) && NF.sameDose(S, e, meal); });
  var peaks = usable.map(function (e) { return NF.peakOf(e.points); });
  var high = NF.targets(S).high;
  var inT = peaks.filter(function (p) { return p <= high; }).length;
  return { eaten: eps.length, n: usable.length, peaks: peaks, lo: NF.r1(NF.quantile(peaks, 0.1)), hi: NF.r1(NF.quantile(peaks, 0.9)),
    med: NF.r1(NF.median(peaks)), inTarget: inT, list: eps, usable: usable };
};
NF.reactionLabel = function (S, st) {
  if (!st.n || !NF.usable(S, 'R-SKORE')) return null;
  var share = st.inTarget / st.n;
  var mild = NF.param(S, 'R-SKORE', 'mirna', 0.8), mid = NF.param(S, 'R-SKORE', 'stredni', 0.5);
  return share >= mild ? { key: 'mild', label: 'mírná reakce', cls: 'ok' } : share >= mid ? { key: 'mid', label: 'střední reakce', cls: 'warn' } : { key: 'strong', label: 'silná reakce', cls: 'bad' };
};
NF.confidence = function (S, foodId, meal) {
  var food = NF.foodById(S, foodId);
  meal = meal || NF.dominantMeal(S, foodId);
  var st = NF.foodStats(S, foodId, null, meal);
  if (!food) return { level: 'unknown', st: st, items: [], meal: meal };
  if (!NF.usable(S, 'R-REAKCE')) return { level: 'none', st: st, items: [], meal: meal, why: 'Pravidlo pro vyhodnocení reakce je zamítnuté; nic nevyhodnocujeme.' };
  var min = NF.param(S, 'R-REAKCE', 'minKnown', 3);
  var res = { st: st, min: min, items: ['R-REAKCE'], reaction: null, meal: meal };
  if (st.n >= min) { res.level = 'known'; res.reaction = NF.reactionLabel(S, st); return res; }
  if (NF.usable(S, 'R-PODOBNOST')) {
    var like = NF.similarFoods(S, food).filter(function (f) { return NF.foodStats(S, f.id, null, meal).n >= min; });
    if (like.length) {
      var peaks = [];
      like.forEach(function (f) { peaks = peaks.concat(NF.foodStats(S, f.id, null, meal).peaks); });
      var high = NF.targets(S).high;
      res.level = 'similar'; res.items.push('R-PODOBNOST'); res.like = like;
      res.pool = { n: peaks.length, lo: NF.r1(NF.quantile(peaks, 0.1)), hi: NF.r1(NF.quantile(peaks, 0.9)), inTarget: peaks.filter(function (p) { return p <= high; }).length };
      res.reaction = NF.reactionLabel(S, { n: res.pool.n, inTarget: res.pool.inTarget });
      return res;
    }
  }
  res.level = 'unknown';
  return res;
};
/* Co pomohlo: zápisy s přijatou radou (páka) vs. bez ní. */
NF.leverStats = function (S, foodId, meal) {
  var out = [];
  Object.keys(NF.LEVERS).forEach(function (l) {
    if (l === 'portion') return;
    var withL = NF.foodStats(S, foodId, function (e) { return (e.advice || []).some(function (a) { return a.lever === l && a.accepted === true; }); }, meal);
    if (withL.n) out.push({ lever: l, st: withL });
  });
  return out.sort(function (a, b) { return (b.st.inTarget / b.st.n) - (a.st.inTarget / a.st.n); });
};
NF.baseStats = function (S, foodId, meal) {
  return NF.foodStats(S, foodId, function (e) { return !(e.advice || []).some(function (a) { return a.accepted === true && a.lever !== 'portion'; }); }, meal);
};

/* ---------- rady ----------
   Zásada 3: před píchnutím porce k obvyklé oběma směry; po píchnutí a při „nevím“ jen z větší zpět k obvyklé;
   nikdy „sněz víc“. Rady bez změny množství kdykoli (mimo nemoc jen ty bezpečné). */
NF.LEVERS = {
  portion: { label: 'Obvyklá porce', item: 'R-PORCE', carbs: true },
  addon: { label: 'Doplněk k jídlu', item: 'R-DOPLNEK', carbs: false, illnessSafe: true },
  order: { label: 'Pořadí jídla', item: 'R-PORADI', carbs: false, illnessSafe: true },
  walk: { label: 'Procházka po jídle', item: 'R-PROCHAZKA', carbs: false, illnessSafe: false }
};
NF.effectiveBolus = function (state) { return state === 'before' ? 'before' : 'after'; };
NF.adviceGate = function (S) {
  var p = NF.activePlan(S);
  if (S.participation !== 'active') return { ok: false, why: 'Účast je ukončená.' };
  if (!p || !p.understood) return { ok: false, why: 'Dokud nemáš převzatý plán od lékaře, neradíme.' };
  if (!NF.usable(S, 'R-REAKCE')) return { ok: false, why: 'Vyhodnocení reakce je v registru zamítnuté; neradíme.' };
  return { ok: true };
};
function fill(text, food) {
  return String(text || '').replace('{addon}', food.addon || 'bílkovinu (jogurt, sýr, vejce)').replace('{first}', food.first || 'zeleninu nebo maso');
}
NF.advise = function (S, foodId, portion, bolusState, meal) {
  var food = NF.foodById(S, foodId);
  var res = { gate: NF.adviceGate(S), conf: null, items: [], blocked: [], gone: [], effective: bolusState ? NF.effectiveBolus(bolusState) : null, illness: !!(S.illness && S.illness.active) };
  if (!food) return res;
  res.conf = NF.confidence(S, foodId, meal); meal = res.conf.meal;
  if (!res.gate.ok || !bolusState) return res;
  var before = res.effective === 'before';
  /* porce */
  if (portion !== 'usual') {
    var it = NF.item(S, 'R-PORCE');
    if (!NF.usable(S, 'R-PORCE')) res.blocked.push({ lever: 'portion', reason: 'item', why: 'Pravidlo k porci je zamítnuté.' });
    else if (res.illness) res.blocked.push({ lever: 'portion', reason: 'illness', why: 'Během nemoci k množství jídla neradíme; řiď se pokyny lékaře.' });
    else if (before || portion === 'bigger') {
      res.items.push({ lever: 'portion', item: 'R-PORCE', label: NF.LEVERS.portion.label, carbs: true,
        text: portion === 'bigger'
          ? (before ? 'Dej si obvyklou porci. Tvoje dávka inzulinu je nastavená na obvyklé množství — větší porce ho přesáhne.'
                    : 'Dej si obvyklou porci. Inzulin, který už máš v těle, je nastavený na obvyklé množství; větší porce ho přesáhne.')
          : 'Dej si obvyklou porci. Menší porce při stejné dávce inzulinu může vést k nízké glukóze.',
        certainty: 'Obvyklá porce je množství, na které lékař nastavil tvoji dávku.' });
    } else {
      res.blocked.push({ lever: 'portion', reason: 'bolus', why: bolusState === 'unknown'
        ? 'Nevíš, jestli už máš inzulin píchnutý — bereme to, jako by byl. Radu k množství jídla proto nedáváme. Sníš-li méně než obvykle, řiď se pokynem lékaře „snědl jsem méně“.'
        : 'Inzulin už máš v těle. Radu „sněz víc“ nedáváme nikdy. Sníš-li méně než obvykle, řiď se pokynem lékaře „snědl jsem méně“.' });
    }
  }
  /* rady bez změny množství */
  var lv = res.conf.level;
  var cands = [], pa = NF.planAdvice(S), reason = false;
  if (lv === 'known' || lv === 'similar') {
    var r = res.conf.reaction;
    if (r && r.key !== 'mild') { cands = ['addon', 'order', 'walk']; reason = true; }
    else if (lv === 'known') { NF.leverStats(S, foodId, meal).forEach(function (x) { if (cands.indexOf(x.lever) < 0) cands.push(x.lever); }); }
  }
  if (reason) (pa.prefer || []).forEach(function (l) { if (cands.indexOf(l) < 0) cands.push(l); });
  cands = cands.filter(function (l) { return (pa.off || []).indexOf(l) < 0; });
  var base = lv === 'known' ? NF.baseStats(S, foodId, meal) : null;
  cands.forEach(function (l) {
    var meta = NF.LEVERS[l], it = NF.item(S, meta.item);
    if (!NF.usable(S, meta.item)) return; /* zamítnuté pravidlo → rada prostě není */
    if (res.illness && !meta.illnessSafe) return;
    var item = { lever: l, item: meta.item, label: meta.label, carbs: false, text: fill(it.text, food) };
    var ls = lv === 'known' ? NF.leverStats(S, foodId, meal).filter(function (x) { return x.lever === l; })[0] : null;
    if (ls) item.certainty = 'Zkusil jsi to ' + ls.st.n + '×: ' + ls.st.inTarget + ' z ' + ls.st.n + ' v cíli' + (base && base.n ? ' (bez toho ' + base.inTarget + ' z ' + base.n + ')' : '') + '.';
    else if (lv === 'known') item.certainty = 'U tohoto jídla jsi to ještě nezkoušel. Až to zkusíš, uvidíš, jestli pomohlo.';
    else item.certainty = 'Obecná rada ze schváleného pravidla. Jak zabere právě u tebe, zatím nevíme.';
    if (ls) item.with = ls.st;
    res.items.push(item);
  });
  /* 15, odst. 13: zamítnutá rada, kterou pacient u tohoto jídla dřív přijímal, dostane jednu neutrální větu. */
  var TZ = NF.texts(S, 'R-ZMIZELA');
  if (TZ) Object.keys(NF.LEVERS).forEach(function (l) {
    if (l === 'portion' || NF.usable(S, NF.LEVERS[l].item)) return;
    var tried = S.episodes.some(function (e) { return e.foodId === foodId && (e.advice || []).some(function (a) { return a.lever === l && a.accepted === true; }); });
    if (tried) res.gone.push({ lever: l, text: NF.fillText(TZ.text, { lever: NF.LEVERS[l].label }) });
  });
  return res;
};

/* Rada po jídle, které už je snědené: k jídlu se radit nedá, ale pohyb teď pomůže. */
NF.adviseAfter = function (S, foodId, meal) {
  var res = { gate: NF.adviceGate(S), items: [], conf: NF.confidence(S, foodId, meal) };
  if (!res.gate.ok) return res;
  var meta = NF.LEVERS.walk, it = NF.item(S, meta.item);
  if (NF.usable(S, meta.item) && !(S.illness && S.illness.active)) {
    res.items.push({ lever: 'walk', item: meta.item, label: meta.label, carbs: false, text: it.text, certainty: 'Jídlo už máš za sebou; pohyb do hodiny po jídle zmírní vzestup glukózy. Doplněk ani pořadí už teď nezměníš.' });
  }
  return res;
};
/* Uložení jídla se zápisem inzulinu i rozhodnutí o radách. */
NF.saveEpisode = function (S, data) {
  var p = NF.activePlan(S);
  if (!p || !p.understood) return { ok: false, error: 'Zápis patří k převzatému plánu.' };
  if (!data.foodId) return { ok: false, error: 'Vyber jídlo.' };
  if (!data.insulin || !data.insulin.confirmed) return { ok: false, error: 'Řekni, jak to bylo s inzulinem.' };
  var advice = (data.advice || []).map(function (a) { return { lever: a.lever, item: a.item, accepted: a.accepted === true ? true : a.accepted === false ? false : null, reason: a.reason || null }; });
  var portionTaken = advice.some(function (a) { return a.lever === 'portion' && a.accepted === true; });
  var ep = {
    id: data.id || NF.uid('E'), planId: p.id, meal: data.meal, foodId: data.foodId, at: data.at || S.clock, recordedAt: S.clock,
    portionPlanned: data.portion || 'usual', portion: portionTaken ? 'usual' : (data.portion || 'usual'),
    bolusAtAdvice: data.bolusState || null, retro: !!data.retro,
    insulin: { prescribed: p.doses[data.meal] ? p.doses[data.meal].units : null, confirmed: data.insulin.confirmed, units: data.insulin.units != null ? data.insulin.units : null, time: data.insulin.time || null },
    doseKey: NF.doseKey(S, data.meal),
    advice: advice, context: S.illness && S.illness.active ? 'illness' : null,
    points: data.points || [], importedAt: data.importedAt || null
  };
  if (ep.insulin.confirmed === 'other' && ep.insulin.units === ep.insulin.prescribed) ep.insulin.confirmed = 'as';
  ep.peak = NF.peakOf(ep.points); ep.at2h = NF.at2h(ep.points);
  S.episodes.push(ep);
  NF.log(S, 'jidlo.zapsano', ep.id + ' ' + ep.foodId, { meal: ep.meal, portion: ep.portion, insulin: ep.insulin, advice: ep.advice, context: ep.context, usable: NF.usableEp(S, ep), whyNot: NF.whyNotUsable(S, ep) });
  NF.checkMilestones(S);
  return { ok: true, episode: ep };
};
NF.confirmBasal = function (S, confirmed, units, time, date) {
  var p = NF.activePlan(S); if (!p) return { ok: false, error: 'Není plán.' };
  var rec = { at: S.clock, date: date || NF.day(S.clock), prescribed: p.doses.basal.units, confirmed: confirmed, units: units != null ? units : (confirmed === 'as' ? p.doses.basal.units : null), time: time || NF.fmtTime(S.clock) };
  if (rec.confirmed === 'other' && rec.units === rec.prescribed) rec.confirmed = 'as';
  S.basalLog = S.basalLog.filter(function (b) { return b.date !== rec.date; }).concat([rec]);
  NF.log(S, 'bazal.potvrzen', rec.confirmed + ' ' + (rec.units == null ? '' : rec.units + ' j.'), rec);
  return { ok: true };
};
NF.correctEpisode = function (S, id, name) {
  var ep = S.episodes.filter(function (e) { return e.id === id; })[0]; if (!ep) return { ok: false, error: 'Zápis nenalezen.' };
  ep.history = ep.history || []; ep.history.push({ at: S.clock, from: ep.note || '', to: name }); ep.note = name;
  NF.log(S, 'jidlo.opraveno', id); return { ok: true };
};

/* ---------- zpětná vazba pacientovi (15, odst. 7b) ----------
   Chválíme snahu a návyk, ne hodnotu glukózy. Výsledek se říká věcně, poděkování patří k činu.
   Všechny texty jsou položky registru (S-VYSLEDEK, R-DIKY, R-MILNIKY, S-CESTA, S-TYDEN);
   bez schválené položky se nic neukáže. Nic z toho nejde do reportu lékaře. */
NF.fillText = function (tpl, map) { return String(tpl || '').replace(/\{(\w+)\}/g, function (_, k) { return map && map[k] != null ? NF.esc(map[k]) : ''; }); };
function fbState(S) { S.fb = S.fb || { resultSeen: {}, milestones: [], weeksSeen: {} }; return S.fb; }
NF.texts = function (S, id) { var r = NF.item(S, id); return NF.usable(S, id) && r && r.texts ? r.texts : null; };
NF.nextVisit = function (S) { var p = NF.activePlan(S); return S.nextVisit || (p && p.validUntil) || null; };
NF.LEVER_WITH = { addon: 's doplňkem', order: 's pořadím jídla', walk: 's procházkou' };
NF.leverNoun = function (l) { return { addon: 'doplněk k jídlu', order: 'jiné pořadí jídla', walk: 'procházku po jídle' }[l] || l; };

/* Poslední dnešní zápis, ke kterému už dorazila data a pacient výsledek ještě neviděl. */
NF.lastResult = function (S) {
  var T = NF.texts(S, 'S-VYSLEDEK'); if (!T) return null;
  var fb = fbState(S), day = NF.day(S.clock), high = NF.targets(S).high;
  var eps = S.episodes.filter(function (e) { return NF.day(e.at) === day && e.importedAt && e.importedAt <= S.clock && !fb.resultSeen[e.id]; });
  if (!eps.length) return null;
  var ep = eps[eps.length - 1], food = NF.foodById(S, ep.foodId); if (!food) return null;
  var acc = (ep.advice || []).filter(function (a) { return a.accepted === true && a.lever !== 'portion'; }).map(function (a) { return a.lever; });
  var peak = NF.peakOf(ep.points), usable = NF.usableEp(S, ep), why = NF.whyNotUsable(S, ep);
  var map = { food: food.name, peak: NF.mmol(peak), meal: NF.mealLabel(ep.meal, true), lever: acc.length ? NF.LEVER_WITH[acc[0]] : '', why: why || '', base: '', sugg: '' };
  var key;
  if (peak == null) key = 'nodata';
  else if (acc.length) {
    key = peak <= high ? 'okAdvice' : 'highAdvice';
    var base = NF.baseStats(S, food.id, ep.meal);
    if (key === 'okAdvice' && base.n >= 2 && base.lo != null) map.base = NF.fillText(T.baseNote, { lo: NF.mmol(base.lo), hi: NF.mmol(base.hi) });
  } else if (peak <= high) key = 'okPlain';
  else {
    key = 'highPlain';
    var best = NF.leverStats(S, food.id, ep.meal).filter(function (x) { return x.st.n >= 2 && x.st.inTarget / x.st.n >= 0.5; })[0];
    map.sugg = best ? NF.fillText(T.suggestData, { lever: NF.leverNoun(best.lever), k: best.st.inTarget, n: best.st.n }) : (T.suggestGeneric || '');
  }
  var text = NF.fillText(T[key], map) + (!usable && key !== 'nodata' && why ? NF.fillText(T.unusable, { why: why }) : '');
  return { ep: ep, food: food, key: key, text: text, usable: usable, why: why, peak: peak };
};
NF.markResultSeen = function (S, id) { fbState(S).resultSeen[id] = S.clock; NF.log(S, 'vysledek.zobrazen', id); };

/* Poděkování po uložení: podle činu, ne podle hodnoty. */
NF.thanks = function (S, ep) {
  var T = NF.texts(S, 'R-DIKY'); if (!T) return null;
  var f = NF.foodById(S, ep.foodId);
  var acc = (ep.advice || []).some(function (a) { return a.accepted === true && a.lever !== 'portion'; });
  var back = ep.portionPlanned === 'bigger' && ep.portion === 'usual';
  var key = ep.retro ? 'retro' : back ? 'portion' : acc ? 'advice' : 'plain';
  return NF.fillText(T[key], { food: f ? f.name : '' });
};

/* Milníky: jednorázové, za snahu a návyk. Žádný milník za hodnotu glukózy. */
NF.checkMilestones = function (S) {
  var T = NF.texts(S, 'R-MILNIKY'); if (!T) return [];
  var fb = fbState(S), high = NF.targets(S).high, out = [];
  function add(id, key, map) {
    if (fb.milestones.some(function (m) { return m.id === id; })) return;
    var m = { id: id, key: key, text: NF.fillText(T[key], map || {}), at: S.clock, seen: false };
    fb.milestones.push(m); out.push(m); NF.log(S, 'milnik', id, { key: key, item: 'R-MILNIKY' });
  }
  var min = NF.param(S, 'R-REAKCE', 'minKnown', 3), eaten = {};
  S.episodes.forEach(function (e) { eaten[e.foodId] = (eaten[e.foodId] || 0) + 1; });
  var repeated = Object.keys(eaten).filter(function (k) { return eaten[k] >= 2; }), knownCount = 0;
  repeated.forEach(function (fid) {
    var f = NF.foodById(S, fid); if (!f) return;
    var st = NF.foodStats(S, fid);
    if (st.n >= min) { knownCount++; add('known:' + fid, 'known', { food: f.name, n: min }); }
    var last = st.list.slice(-3);
    if (last.length === 3) Object.keys(NF.LEVERS).forEach(function (l) {
      if (l === 'portion') return;
      var all = last.every(function (e) { return NF.usableEp(S, e) && (e.advice || []).some(function (a) { return a.lever === l && a.accepted === true; }) && NF.peakOf(e.points) <= high; });
      if (all) add('habit:' + fid + ':' + l, 'habit', { food: f.name, lever: NF.LEVER_WITH[l] });
    });
  });
  if (repeated.length >= 5 && knownCount === repeated.length) add('allknown', 'allknown', { n: repeated.length });
  var days = {};
  S.episodes.forEach(function (e) { var d = NF.day(e.at); days[d] = days[d] || {}; days[d][e.meal] = 1; });
  var full = Object.keys(days).filter(function (d) { return days[d].breakfast && days[d].lunch && days[d].dinner; }).sort();
  for (var i = 6; i < full.length; i++) if (NF.daysBetween(full[i - 6], full[i]) === 6) { add('week1', 'week1', {}); break; }
  var recent = S.episodes.filter(function (e) { return e.context !== 'illness'; }).slice(-10);
  if (recent.length === 10 && recent.every(function (e) { return e.portion === 'usual'; })) add('usual10', 'usual10', {});
  if (S.episodes.filter(function (e) { return e.retro; }).length >= 5) add('retro5', 'retro5', {});
  return out;
};
NF.pendingMilestone = function (S) { var un = fbState(S).milestones.filter(function (m) { return !m.seen; }); return un.length ? un[un.length - 1] : null; };
/* Zavření zavře i starší neviděné: na Dnes je vždy nejvýš jedna karta (nejnovější), přehled je v Plánu. */
NF.closeMilestone = function (S, id) { var ms = fbState(S).milestones, i = ms.map(function (m) { return m.id; }).indexOf(id); ms.forEach(function (m, j) { if (j <= i) m.seen = true; }); };
NF.settleFeedback = function (S) { var fb = fbState(S); fb.milestones.forEach(function (m) { m.seen = true; }); S.episodes.forEach(function (e) { fb.resultSeen[e.id] = S.clock; }); var w = NF.weekSummary(S); while (w) { fb.weeksSeen[w.id] = S.clock; w = NF.weekSummary(S); } };

/* Cesta ke kontrole: dny, známá jídla X z N, tento týden X z N. Čísla, ne hodnocení. */
NF.pathStats = function (S) {
  var p = NF.activePlan(S); if (!p || !NF.usable(S, 'S-CESTA')) return null;
  var from = NF.day(p.effectiveFrom) + 'T00:00:00', to = NF.nextVisit(S);
  var total = Math.max(1, NF.daysBetween(from, to)), gone = Math.max(0, Math.min(total, Math.floor((NF.parse(S.clock) - NF.parse(from)) / 86400000)));
  var min = NF.param(S, 'R-REAKCE', 'minKnown', 3), eaten = {};
  S.episodes.forEach(function (e) { eaten[e.foodId] = (eaten[e.foodId] || 0) + 1; });
  var rep = Object.keys(eaten).filter(function (k) { return eaten[k] >= 2; });
  var known = rep.filter(function (k) { return NF.foodStats(S, k).n >= min; }).length;
  var wk = Math.floor(gone / 7), wstart = NF.addDays(from, wk * 7), dayIn = Math.max(0, Math.min(6, NF.daysBetween(wstart, S.clock)));
  var weps = S.episodes.filter(function (e) { return NF.day(e.at) >= NF.day(wstart) && NF.day(e.at) <= NF.day(S.clock); });
  var conf = weps.filter(function (e) { return e.insulin && e.insulin.confirmed !== 'unknown'; }).length;
  return { total: total, gone: gone, left: Math.max(0, total - gone), known: known, repeated: rep.length, week: wk + 1, weekMeals: weps.length, weekSlots: (dayIn + 1) * 3, weekConfirmed: conf, milestones: fbState(S).milestones.length, visit: to };
};

/* Týdenní shrnutí za poslední uzavřený týden od vydání plánu; ukáže se jednou. */
NF.weekSummary = function (S) {
  var p = NF.activePlan(S); if (!p || !NF.usable(S, 'S-TYDEN')) return null;
  var from = NF.day(p.effectiveFrom) + 'T00:00:00';
  var fb = fbState(S), gone = NF.daysBetween(from, S.clock), wk = Math.floor(gone / 7);
  if (wk < 1) return null;
  var id = p.id + ':' + wk; if (fb.weeksSeen[id]) return null;
  var start = NF.addDays(from, (wk - 1) * 7), end = NF.addDays(from, wk * 7), high = NF.targets(S).high;
  var eps = S.episodes.filter(function (e) { return e.at >= start && e.at < end; });
  if (!eps.length) { fb.weeksSeen[id] = S.clock; return null; }
  var usual = eps.filter(function (e) { return e.portion === 'usual'; }).length, lv = {};
  eps.forEach(function (e) { (e.advice || []).forEach(function (a) {
    if (a.lever === 'portion' || a.accepted !== true) return;
    lv[a.lever] = lv[a.lever] || { n: 0, inT: 0 }; lv[a.lever].n++;
    var pk = NF.peakOf(e.points); if (pk != null && pk <= high) lv[a.lever].inT++;
  }); });
  var best = Object.keys(lv).sort(function (a, b) { return (lv[b].inT / lv[b].n - lv[a].inT / lv[a].n) || (lv[b].n - lv[a].n); })[0];
  var sugg = null;
  if (best && lv[best].inT >= 2) {
    var seen = {};
    eps.forEach(function (e) {
      if (seen[e.foodId] || sugg) return; seen[e.foodId] = 1;
      var c = NF.confidence(S, e.foodId);
      if (c.level === 'known' && c.reaction && c.reaction.key !== 'mild' && !NF.leverStats(S, e.foodId).some(function (x) { return x.lever === best; })) sugg = { food: NF.foodById(S, e.foodId).name, lever: best, k: lv[best].inT, n: lv[best].n };
    });
  }
  return { id: id, week: wk, start: start, end: end, meals: eps.length, usual: usual, best: best ? { lever: best, k: lv[best].inT, n: lv[best].n } : null,
    milestones: fb.milestones.filter(function (m) { return m.at >= start && m.at < end; }), suggest: sugg };
};
NF.closeWeek = function (S, id) { fbState(S).weeksSeen[id] = S.clock; NF.log(S, 'tyden.zobrazen', id); };

/* ---------- nemoc ---------- */
NF.setIllness = function (S, on) {
  if (on) { S.illness = { active: true, from: S.clock, checkins: [] }; NF.log(S, 'nemoc.zacatek', ''); }
  else if (S.illness && S.illness.active) { S.illness.active = false; S.illness.to = S.clock; S.illnessLog = (S.illnessLog || []).concat([{ from: S.illness.from, to: S.clock }]); NF.log(S, 'nemoc.konec', ''); }
  return { ok: true };
};
NF.illnessCheckin = function (S, better) {
  if (!S.illness || !S.illness.active) return { ok: false };
  S.illness.checkins.push({ at: S.clock, better: !!better });
  if (better) NF.setIllness(S, false);
  return { ok: true };
};
/* Dny nemoci = počet kalendářních dnů ve všech obdobích nemoci (včetně prvního i posledního). */
NF.illnessDays = function (S) {
  var periods = (S.illnessLog || []).slice();
  if (S.illness && S.illness.active) periods.push({ from: S.illness.from, to: S.clock });
  var days = {};
  periods.forEach(function (p) { for (var d = NF.day(p.from); d <= NF.day(p.to); d = NF.day(NF.addDays(d + 'T12:00:00', 1))) days[d] = 1; });
  return Object.keys(days).length;
};

/* ---------- souhrny pro report ---------- */
NF.periodEpisodes = function (S, planId) { return S.episodes.filter(function (e) { return e.planId === planId; }); };
NF.summary = function (S, planId) {
  var eps = NF.periodEpisodes(S, planId);
  var meals = eps.length;
  var usual = eps.filter(function (e) { return e.portion === 'usual'; }).length;
  var asPlan = eps.filter(function (e) { return e.insulin && e.insulin.confirmed === 'as'; }).length;
  var other = eps.filter(function (e) { return e.insulin && e.insulin.confirmed === 'other'; }).length;
  var none = eps.filter(function (e) { return e.insulin && e.insulin.confirmed === 'none'; }).length;
  var unknown = eps.filter(function (e) { return !e.insulin || e.insulin.confirmed === 'unknown'; }).length;
  var pl = NF.planById(S, planId), since = pl ? NF.day(pl.issuedAt) : '0000';
  var basalDays = pl ? Math.max(1, NF.daysBetween(since + 'T00:00:00', NF.day(S.clock) + 'T00:00:00')) : S.basalLog.length;
  var basalAs = S.basalLog.filter(function (b) { return b.confirmed === 'as' && b.date >= since; }).length;
  var onTime = eps.filter(function (e) { return e.insulin && e.insulin.confirmed === 'as' && NF.onTime(S, e); }).length;
  var ill = eps.filter(function (e) { return e.context === 'illness'; }).length;
  var incomplete = eps.filter(function (e) { return !NF.complete(e); }).length;
  var ss = S.sensorSummary, t = NF.targets(S);
  var tirState = !ss ? 'none' : (ss.tir >= t.tirGoal && ss.below < 4 ? 'ok' : (ss.tir >= 50 && ss.below < 4 && ss.veryLow < 1) ? 'warn' : 'bad');
  var adv = NF.adviceOutcome(S, planId);
  return { meals: meals, usual: usual, usualPct: NF.pct(usual, meals), asPlan: asPlan, asPct: NF.pct(asPlan, meals), other: other, none: none, unknown: unknown,
    basalAs: basalAs, basalDays: basalDays, onTime: onTime, ill: ill, illDays: NF.illnessDays(S), incomplete: incomplete, sensor: ss, tirState: tirState, advice: adv,
    hba1c: (S.patient && S.patient.hba1c) || null, habitsDone: NF.activeHabits(S).length };
};
NF.adviceOutcome = function (S, planId) {
  var eps = NF.periodEpisodes(S, planId).filter(function (e) { return (e.advice || []).some(function (a) { return a.lever !== 'portion'; }); });
  var high = NF.targets(S).high;
  var grp = function (pred) {
    var l = eps.filter(pred), c = l.filter(function (e) { return NF.complete(e) && e.context !== 'illness'; });
    var peaks = c.map(function (e) { return NF.peakOf(e.points); });
    return { n: l.length, c: c.length, med: NF.r1(NF.median(peaks)), inTarget: peaks.filter(function (p) { return p <= high; }).length };
  };
  var acc = grp(function (e) { return e.advice.some(function (a) { return a.lever !== 'portion' && a.accepted === true; }); });
  var dec = grp(function (e) { return !e.advice.some(function (a) { return a.lever !== 'portion' && a.accepted === true; }) && e.advice.some(function (a) { return a.lever !== 'portion' && a.accepted === false; }); });
  var noans = grp(function (e) { return e.advice.filter(function (a) { return a.lever !== 'portion'; }).every(function (a) { return a.accepted === null; }); });
  var byLever = {}, reasons = {};
  eps.forEach(function (e) { e.advice.forEach(function (a) {
    if (a.lever === 'portion') return;
    byLever[a.lever] = byLever[a.lever] || { offered: 0, accepted: 0, declined: 0, reasons: {} };
    byLever[a.lever].offered++;
    if (a.accepted === true) byLever[a.lever].accepted++;
    if (a.accepted === false) { byLever[a.lever].declined++; if (a.reason) { byLever[a.lever].reasons[a.reason] = (byLever[a.lever].reasons[a.reason] || 0) + 1; reasons[a.reason] = (reasons[a.reason] || 0) + 1; } }
  }); });
  var top = Object.keys(reasons).sort(function (a, b) { return reasons[b] - reasons[a]; })[0] || null;
  return { offered: eps.length, accepted: acc, declined: dec, noAnswer: noans, byLever: byLever, reasons: reasons, topReason: top,
    works: acc.c >= 3 && dec.c >= 3 && acc.med != null && dec.med != null ? (acc.med < dec.med - 0.5 ? 'yes' : acc.med > dec.med + 0.5 ? 'no' : 'same') : 'few' };
};
NF.DECLINE_REASONS = [['nothome', 'Nemám to doma'], ['taste', 'Nechutná mi to'], ['time', 'Nestihl jsem to'], ['nowant', 'Tentokrát nechci']];
NF.reasonLabel = function (k) { var x = NF.DECLINE_REASONS.filter(function (r) { return r[0] === k; })[0]; return x ? x[1] : k; };

/* ---------- návrhy lékaři ----------
   Každý návrh: { id, kind, cat, title, why, weak[], verify[], branches[], item, decision }
   Aplikace nevymýšlí směr dávky: větve jsou z položky D-POSTUP, kterou schválil lékař-garant. */
function cleanEps(S, planId, meal, days) {
  var since = NF.addDays(S.clock, -days);
  return NF.periodEpisodes(S, planId).filter(function (e) { return e.meal === meal && e.at >= since && NF.usableEp(S, e); });
}
NF.proposals = function (S, planId, catalog) {
  var out = [], t = NF.targets(S), p = NF.planById(S, planId);
  if (!p) return out;
  var days = NF.param(S, 'D-PRAND', 'dny', 14);
  /* --- bazál: nízké noční hodnoty mají přednost --- */
  if (NF.usable(S, 'D-BAZAL')) {
    var nights = S.nights.filter(function (n) { return n.date >= NF.day(NF.addDays(S.clock, -days)); });
    var lowN = nights.filter(function (n) { return n.min < t.low; }).length, veryLow = nights.filter(function (n) { return n.min < 3.0; }).length;
    var fastMed = NF.r1(NF.median(nights.map(function (n) { return n.fasting; })));
    if (nights.length >= 7 && (lowN >= NF.param(S, 'D-BAZAL', 'nociPod', 2) || veryLow >= 1)) {
      out.push({ id: 'PR-BAZAL', kind: 'dose', dose: 'basal', cat: 'davka', priority: 0, title: 'Posoudit bazální dávku — noční hodnoty pod cílem',
        why: lowN + ' z ' + nights.length + ' nocí za posledních ' + days + ' dní kleslo pod ' + NF.mmol(t.low) + ' mmol/l' + (veryLow ? ', z toho ' + veryLow + '× pod 3,0' : '') + '. Noční pokles je nejdůležitější signál a má přednost před ostatními.',
        weak: [], verify: ['Bazál si pacient píchá ve stejnou hodinu (potvrzeno ' + S.basalLog.filter(function (b) { return b.confirmed === 'as'; }).length + ' z ' + S.basalLog.length + ')', 'Večeře v těch nocích byly obvyklé, bez alkoholu a nočního jídla', 'Pohyb v těch dnech byl běžný, bez mimořádné zátěže'],
        branches: [{ when: 'body 1–3 sedí', action: 'down', text: 'snížit bazál' }, { when: 'bod 1 nesedí', action: 'keep', text: 'ponechat, řešit čas podání' }, { when: 'bod 2 nesedí', action: 'keep', text: 'ponechat, řešit večeře' }],
        item: 'D-BAZAL', postup: 'D-POSTUP' });
    } else if (nights.length >= 7 && fastMed != null && fastMed > t.fastingHigh && lowN === 0) {
      out.push({ id: 'PR-BAZAL', kind: 'dose', dose: 'basal', cat: 'davka', priority: 2, title: 'Posoudit bazální dávku — ranní hodnoty nad cílem',
        why: 'Medián ranních hodnot za ' + days + ' dní je ' + NF.mmol(fastMed) + ' mmol/l (cíl do ' + NF.mmol(t.fastingHigh) + ') a žádná noc neklesla pod ' + NF.mmol(t.low) + '.',
        weak: [], verify: ['Bazál potvrzen ve stejnou hodinu (' + S.basalLog.filter(function (b) { return b.confirmed === 'as'; }).length + ' z ' + S.basalLog.length + ')', 'Bez pozdní večeře a nočního jídla', 'Technika a místo aplikace v pořádku'],
        branches: [{ when: 'body 1–3 sedí', action: 'up', text: 'zvýšit bazál' }, { when: 'bod 1 nesedí', action: 'keep', text: 'ponechat, řešit podání' }, { when: 'bod 2 nesedí', action: 'keep', text: 'ponechat, řešit večeře' }],
        item: 'D-BAZAL', postup: 'D-POSTUP' });
    }
  }
  /* --- prandiální podle jídla --- */
  if (NF.usable(S, 'D-PRAND')) NF.MEALS.forEach(function (m) {
    var meal = m[0], eps = cleanEps(S, planId, meal, days);
    var minN = NF.param(S, 'D-PRAND', 'minJidel', 6), share = NF.param(S, 'D-PRAND', 'podil', 2 / 3);
    var all = NF.periodEpisodes(S, planId).filter(function (e) { return e.meal === meal && e.at >= NF.addDays(S.clock, -days); });
    var excluded = all.length - eps.length;
    var lows = eps.filter(function (e) { return (e.points || []).some(function (x) { return x.mmol != null && x.mmol < t.low; }); }).length;
    if (eps.length && lows >= NF.param(S, 'D-PRAND', 'hypo', 2)) {
      out.push({ id: 'PR-' + meal.toUpperCase(), kind: 'dose', dose: meal, cat: 'davka', priority: 1, title: 'Posoudit prandiální dávku k ' + NF.mealLabel(meal, 'dat') + ' — hodnoty pod cílem',
        why: lows + '× za ' + days + ' dní klesla glukóza do 4 h po ' + NF.mealLabel(meal) + ' pod ' + NF.mmol(t.low) + ' mmol/l.',
        weak: excluded ? [excluded + ' zápisů vyřazeno (jiná porce, nepotvrzený inzulin, nemoc nebo chybějící data)'] : [],
        verify: ['Porce byla obvyklá (ne menší)', 'Dávka potvrzena podle plánu a včas', 'Pohyb po jídle byl běžný'],
        branches: [{ when: 'body 1–3 sedí', action: 'down', text: 'snížit dávku k ' + NF.mealLabel(meal, 'dat') }, { when: 'bod 1 nesedí', action: 'keep', text: 'ponechat, řešit porce' }],
        item: 'D-PRAND', postup: 'D-POSTUP' });
      return;
    }
    if (eps.length < minN) return;
    var above = eps.filter(function (e) { return NF.peakOf(e.points) > t.high; });
    if (above.length / eps.length < share) return;
    var acceptedAdvice = eps.filter(function (e) { return (e.advice || []).some(function (a) { return a.accepted === true && a.lever !== 'portion'; }); });
    if (acceptedAdvice.length < NF.param(S, 'D-PRAND', 'radyPrve', 3)) {
      var declined = {};
      all.forEach(function (e) { (e.advice || []).forEach(function (a) { if (a.lever !== 'portion' && a.accepted === false) declined[a.lever] = (declined[a.lever] || 0) + 1; }); });
      var worst = Object.keys(declined).sort(function (a, b) { return declined[b] - declined[a]; })[0] || 'addon';
      out.push({ id: 'PR-' + meal.toUpperCase() + '-RADY', kind: 'habit', cat: 'plan', priority: 3, lever: worst, title: 'Nejdřív rady k ' + NF.mealLabel(meal, 'dat') + ', dávku zatím neměnit',
        why: above.length + ' z ' + eps.length + ' ' + NF.mealLabel(meal) + ' skončilo nad cílem, ale pacient rady k jídlu přijal jen ' + acceptedAdvice.length + '×' + (declined[worst] ? ' (nejčastěji odmítl „' + NF.LEVERS[worst].label + '“)' : '') + '. Podle schváleného postupu jde jídlo před dávkou.',
        weak: [], verify: ['Rady jsou pro pacienta proveditelné (doplněk má doma, pořadí zvládne)', 'Pacient je ochotný rady zkusit'],
        branches: [{ when: 'oba body sedí', action: 'keep', text: 'ponechat dávku, posílit radu' }, { when: 'bod 1 nesedí', action: 'swap', text: 'vyměnit radu „' + NF.LEVERS[worst].label + '“ za jinou' }, { when: 'bod 2 nesedí', action: 'keep', text: 'ponechat dávku, probrat důvody' }],
        item: 'D-PRAND', postup: 'D-POSTUP' });
      return;
    }
    out.push({ id: 'PR-' + meal.toUpperCase(), kind: 'dose', dose: meal, cat: 'davka', priority: 2, title: 'Posoudit prandiální dávku k ' + NF.mealLabel(meal, 'dat') + ' — hodnoty nad cílem',
      why: above.length + ' z ' + eps.length + ' ' + NF.mealLabel(meal) + ' s obvyklou porcí a potvrzenou dávkou mělo vrchol glukózy po jídle nad ' + NF.mmol(t.high) + ' mmol/l, i když pacient ' + acceptedAdvice.length + '× přijal radu k jídlu.',
      weak: excluded ? [excluded + ' zápisů vyřazeno (jiná porce, nepotvrzený inzulin, nemoc nebo chybějící data)'] : [],
      verify: ['Potvrzení dávek a jejich čas sedí', 'Technika a místo aplikace v pořádku', 'Průběhy po jídle odpovídají', 'Mezi jídlem a měřením nejedl nic dalšího'],
      branches: [{ when: 'všechny body sedí a hodnoty jsou nad cílem', action: 'up', text: 'zvýšit dávku k ' + NF.mealLabel(meal, 'dat') }, { when: 'bod 1 nesedí', action: 'keep', text: 'ponechat, řešit podání' }, { when: 'bod 4 nesedí', action: 'keep', text: 'ponechat, řešit dojídání' }],
      item: 'D-PRAND', postup: 'D-POSTUP' });
  });
  /* --- návyky --- */
  var adv = NF.adviceOutcome(S, planId);
  Object.keys(adv.byLever).forEach(function (l) {
    var b = adv.byLever[l], meta = NF.LEVERS[l];
    if (b.offered < 5) return;
    var topR = Object.keys(b.reasons).sort(function (x, y) { return b.reasons[y] - b.reasons[x]; })[0];
    if (b.declined / b.offered >= 0.6) {
      var impractical = topR === 'nothome' || topR === 'taste';
      out.push({ id: 'PR-SWAP-' + l, kind: 'habit', cat: 'plan', priority: 4, lever: l, title: (impractical ? 'Vyměnit radu „' : 'Probrat radu „') + meta.label + '“',
        why: 'Pacient ji odmítl ' + b.declined + '× z ' + b.offered + (topR ? ', nejčastěji „' + NF.reasonLabel(topR) + '“' : '') + '. ' + (impractical ? 'To ukazuje na nepraktickou radu, ne na neochotu.' : 'Stojí za to zjistit proč.'),
        weak: [], verify: ['Pacient radu může běžně plnit (má to doma, chutná mu, stihne to)'], branches: [{ when: 'bod 1 sedí', action: 'keep', text: 'ponechat, zkusit znovu' }, { when: 'bod 1 nesedí', action: 'swap', text: 'vyměnit za jinou radu' }], item: 'R-NAVYKY' });
    } else if (b.accepted >= 5) {
      out.push({ id: 'PR-KEEP-' + l, kind: 'habit', cat: 'plan', priority: 5, lever: l, group: 'keep', title: 'Zachovat radu „' + meta.label + '“',
        why: 'Přijata ' + b.accepted + '× z ' + b.offered + '.' + (adv.works === 'yes' ? ' Když pacient rady přijal, vrchol byl v mediánu ' + NF.mmol(adv.accepted.med) + ' mmol/l; když ne, ' + NF.mmol(adv.declined.med) + '.' : ''),
        weak: [], verify: ['Pacient má radu běžně po ruce'], branches: [{ when: 'bod 1 sedí', action: 'keep', text: 'ponechat' }], item: 'R-NAVYKY' });
    }
  });
  out.push({ id: 'PR-POKYNY', kind: 'instructions', cat: 'pokyny', priority: 6, group: 'keep', title: 'Osobní pokyny stále platí?',
    why: 'Pokyny z ' + NF.fmtShort(p.issuedAt) + ': ' + (p.instructions || []).length + ' položek. Po změně dávky se mění i pokyn „snědl jsem méně“.',
    weak: [], verify: ['Kontakty a hranice hodnot odpovídají'], branches: [{ when: 'ano', action: 'keep', text: 'ponechat' }, { when: 'změna', action: 'edit', text: 'upravit v plánu' }], item: 'R-POKYNY' });
  if (!NF.usable(S, 'D-POSTUP')) out.forEach(function (pr) { if (pr.postup) { pr.branches = []; pr.postup = null; pr.weak.push('postup posouzení dávky (D-POSTUP) není schválen — větev nelze ukázat, rozhodněte sami'); } });
  out.sort(function (a, b) { return a.priority - b.priority; });
  return out;
};
/* Návrhy „beze změny“ tvoří jednu kartu; ostatní se rozhodují jeden po druhém. */
NF.proposalIsSingle = function (S, pr) { return !pr.group || !!(S.review && S.review.single && S.review.single[pr.id]); };
NF.nextProposal = function (S) { var r = S.review; if (!r) return null; return r.proposals.filter(function (pr) { return !r.decisions[pr.id] && NF.proposalIsSingle(S, pr); })[0] || null; };
NF.swapOptions = function (S, pr) {
  var r = S.review, off = (NF.planAdvice(S).off || []).slice();
  if (r) r.proposals.forEach(function (x) { var d = r.decisions[x.id]; if (d && d.choice === 'agree' && d.branch === 'swap' && x.lever) off.push(x.lever); });
  return Object.keys(NF.LEVERS).filter(function (l) { return l !== 'portion' && l !== pr.lever && off.indexOf(l) < 0 && NF.usable(S, NF.LEVERS[l].item); });
};
NF.verifyAll = function (S, id) { var r = S.review, pr = r && r.proposals.filter(function (x) { return x.id === id; })[0]; if (!pr) return; r.verify[id] = {}; pr.verify.forEach(function (_, i) { r.verify[id][i] = true; }); };
NF.keepAll = function (S) {
  var r = S.review; if (!r) return { ok: false };
  r.proposals.forEach(function (pr) { if (pr.group && !r.decisions[pr.id] && !NF.proposalIsSingle(S, pr)) { NF.verifyAll(S, pr.id); NF.decideProposal(S, pr.id, { choice: 'keep', branch: 'keep' }); } });
  return { ok: true };
};

/* Report = souhrn + návrhy, sestavený jednou na začátku kontroly a zapsaný do stopy. */
NF.startReview = function (S, catalog) {
  var p = NF.activePlan(S); if (!p) return { ok: false, error: 'Není plán.' };
  var props = NF.proposals(S, p.id, catalog);
  S.review = { planId: p.id, startedAt: S.clock, step: 1, index: 0, summary: NF.summary(S, p.id), proposals: props, decisions: {}, verify: {}, newDoses: NF.clone(p.doses) };
  NF.log(S, 'kontrola.zahajena', p.id, { summary: S.review.summary, proposals: props.map(function (x) { return { id: x.id, title: x.title, item: x.item }; }) });
  return { ok: true };
};
NF.decideProposal = function (S, id, decision) {
  var r = S.review; if (!r) return { ok: false, error: 'Kontrola není zahájená.' };
  var pr = r.proposals.filter(function (x) { return x.id === id; })[0]; if (!pr) return { ok: false, error: 'Návrh nenalezen.' };
  if (S.role !== 'doctor') return { ok: false, error: 'Rozhoduje lékař.' };
  r.decisions[id] = { choice: decision.choice, reason: decision.reason || null, comment: decision.comment || '', at: S.clock, branch: decision.branch || null, units: decision.units != null ? decision.units : null, swapTo: decision.swapTo || null };
  if (pr.kind === 'dose' && decision.choice === 'agree' && decision.units != null) r.newDoses[pr.dose].units = decision.units;
  NF.log(S, 'navrh.rozhodnut', id + ' → ' + decision.choice, r.decisions[id]);
  var i = r.proposals.indexOf(pr);
  if (i === r.index && r.index < r.proposals.length - 1) r.index++;
  return { ok: true };
};
NF.reviewComplete = function (S) { var r = S.review; return !!r && r.proposals.every(function (p) { return r.decisions[p.id]; }); };
/* Nový plán z rozhodnutí kontroly (dávky, návyky, rady, pokyny) — stejný výpočet pro náhled i vydání. */
NF.planFromReview = function (S) {
  var r = S.review, prev = NF.activePlan(S); if (!r || !prev) return null;
  var d = NF.newDraft(S);
  d.doses = NF.clone(r.newDoses); d.instructions = NF.clone(r.newInstructions || prev.instructions); d.targets = NF.clone(r.newTargets || prev.targets);
  d.habits = prev.habits.slice(); d.advice = NF.clone(NF.planAdvice(S, prev)); d.medicationChecked = true; d.instructionsChecked = true;
  var habitOf = { walk: 'H-PROCHAZKA' };
  r.proposals.forEach(function (pr) {
    var dec = r.decisions[pr.id]; if (!dec) return;
    var swapped = null;
    if (pr.lever && dec.choice === 'agree' && dec.branch === 'swap') {
      swapped = dec.swapTo || null;
      if (d.advice.off.indexOf(pr.lever) < 0) d.advice.off.push(pr.lever);
      d.advice.prefer = d.advice.prefer.filter(function (x) { return x !== pr.lever; });
      if (habitOf[pr.lever]) d.habits = d.habits.filter(function (h) { return h !== habitOf[pr.lever]; });
      if (swapped) {
        d.advice.off = d.advice.off.filter(function (x) { return x !== swapped; });
        if (d.advice.prefer.indexOf(swapped) < 0) d.advice.prefer.push(swapped);
        if (habitOf[swapped] && d.habits.indexOf(habitOf[swapped]) < 0) d.habits.push(habitOf[swapped]);
      }
    }
    d.decisions.push({ id: pr.id, title: pr.title, text: dec.choice === 'agree' ? 'lékař souhlasil' + (dec.units != null ? ', nová dávka ' + dec.units + ' j.' : '') + (swapped ? ', radu „' + NF.LEVERS[pr.lever].label + '“ nahradil radou „' + NF.LEVERS[swapped].label + '“' : dec.branch === 'swap' ? ', radu „' + NF.LEVERS[pr.lever].label + '“ vypnul' : '') : dec.choice === 'keep' ? 'lékař ponechal beze změny' : 'lékař zamítl' + (dec.reason ? ' (' + dec.reason + ')' : '') });
  });
  return d;
};
NF.issueFromReview = function (S, catalog) {
  var r = S.review; if (!r) return { ok: false, error: 'Kontrola není zahájená.' };
  if (!NF.reviewComplete(S)) return { ok: false, error: 'Nejdřív rozhodněte všechny návrhy.' };
  if (r.planIssued) return { ok: false, error: 'Plán už je vydaný.' };
  var d = NF.planFromReview(S);
  S.draft = d;
  var res = NF.issuePlan(S, catalog); if (!res.ok) return res;
  NF.handover(S);
  r.planIssued = res.plan.id; r.step = 4;
  return { ok: true, plan: res.plan };
};

/* ---------- ukončení ---------- */
NF.endParticipation = function (S, mode) {
  S.participation = mode;
  S.habits.forEach(function (h) { if (h.state === 'active') { h.state = 'cancelled'; } });
  NF.log(S, 'ucast.' + mode, '');
  return { ok: true };
};

})(typeof window !== 'undefined' ? window : globalThis);
