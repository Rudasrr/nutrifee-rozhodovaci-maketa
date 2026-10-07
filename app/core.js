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
NF.SCHEMA = 25;
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
/* Rozdíl kalendářních dnů (b − a) podle místního data; nezávisí na hodině ani na změně času (P2, 6. 10. 2026). */
NF.daysBetween = function (a, b) {
  var da = NF.parse(a), db = NF.parse(b);
  var ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate()), ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / 86400000);
};
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
/* Typografie při vykreslení (D11, 6. 10. 2026): nezlomitelná mezera mezi číslem a jednotkou („8 j.“, „10,0 mmol/l“, „70 %“, „15 min“),
   v datech („5. 10. 2026“, „5. října“) a za jednopísmennou předložkou. Mění jen text mezi značkami, ne atributy. */
NF.nbspText = function (t) {
  return String(t)
    .replace(/(\d)[ ](j\.|mmol\/l|mmol\/mol|%|min\b|h\b|×|j\b)/g, '$1\u00a0$2')
    .replace(/(\d{1,2}\.)[ ](\d{1,2}\.|\d{4}\b|[a-záčďéěíňóřšťúůýž]{3,})/g, '$1\u00a0$2')
    .replace(/(^|[\s(„>–—·])([ksvzouKSVZOU])[ ](?=\S)/g, '$1$2\u00a0');
};
NF.nbsp = function (html) { return String(html).replace(/>([^<]+)</g, function (_, t) { return '>' + NF.nbspText(t) + '<'; }); };
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
NF.migrated = null;
NF.load = function () {
  var s = null, raw = null;
  try { raw = global.localStorage && global.localStorage.getItem(NF.STORAGE); s = raw ? JSON.parse(raw) : null; }
  catch (e) { if (raw == null) NF.storageOK = false; s = null; }
  if (raw && (!s || s.schema !== NF.SCHEMA || !Array.isArray(s.plans))) {
    /* Jiné schéma nebo poškozený záznam: nic se tiše nezahazuje — záloha zůstane v zařízení a lišta to řekne (P3, 6. 10. 2026). */
    try { global.localStorage.setItem(NF.STORAGE + '.zaloha-' + (s && s.schema != null ? s.schema : 'poskozeno'), raw); } catch (e2) { }
    NF.migrated = s && s.schema != null ? String(s.schema) : 'poškozený záznam';
    s = null;
  }
  var base = NF.createState();
  if (!s) return base;
  Object.keys(base).forEach(function (k) { if (s[k] === undefined || s[k] === null) s[k] = base[k]; }); /* osekaný stav doplní výchozí klíče */
  return s;
};
NF.save = function (S) {
  try { global.localStorage && global.localStorage.setItem(NF.STORAGE, JSON.stringify(S)); } catch (e) { NF.storageOK = false; }
};

/* ---------- stopa ----------
   Každý výpočet, rada a rozhodnutí se zapíše se vstupy, položkou registru a výstupem.
   Nikdy nevolá síť ani generativní AI; vše je deterministické. */
NF.log = function (S, what, detail, data) {
  S.events.push({ at: S.clock, who: S.actor || S.role, what: what, detail: detail || '', data: data || null });
  if (S.events.length > 4000) S.events.shift();
  if (S.events.length > 1000) { var old = S.events[S.events.length - 1001]; if (old && old.data && !old.data.zkraceno) old.data = { zkraceno: true }; } /* stará data stopy se krátí, událost zůstává */
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
/* opts.garant: rozhodnutí lékaře-garanta mimo roli na obrazovce (panel vyprávění v prezentaci). Vrací i přenositelný záznam `decision`. */
NF.decideItem = function (S, id, status, comment, params, opts) {
  var r = NF.item(S, id), garant = !!(opts && opts.garant), isComment = !!(opts && opts.comment);
  if (!r) return { ok: false, error: 'Položka nenalezena.' };
  if (S.role !== 'doctor' && !garant) return { ok: false, error: 'Registr spravuje lékař-garant.' };
  if (isComment && !(comment || '').trim()) return { ok: false, error: 'Napište komentář.' };
  var by = garant ? 'garant' : S.doctor.id;
  /* Komentář nikdy nemění stav položky ani se nepočítá jako potvrzení (6. 10. 2026). */
  var d = { item: id, kind: isComment ? 'comment' : 'decision', status: isComment ? r.status : status, comment: comment || '', params: params ? NF.clone(params) : null, text: null, off: (opts && opts.off) ? NF.clone(opts.off) : null, at: S.clock, by: by };
  var h = NF.applyDecision(S, d);
  return { ok: true, item: r, decision: d, history: h };
};
/* Aplikuje záznam rozhodnutí na stav (použije se i při přehrání scény, aby rozhodnutí garanta přežila). */
NF.applyDecision = function (S, d) {
  var r = NF.item(S, d.item); if (!r) return null;
  var from = { status: r.status, params: NF.clone(r.params || {}) };
  if (d.kind === 'comment') {
    var hc = { id: NF.uid('H'), at: d.at, by: d.by, item: d.item, kind: 'comment', from: from, to: from, comment: d.comment || '' };
    S.registry.history.push(hc);
    NF.log(S, 'registr.komentar', d.item + ' · „' + d.comment + '“', hc);
    return hc;
  }
  /* Potvrzení položky, která už nese úpravu, úpravu zachová (stav zůstane „schváleno s úpravou“). */
  if (d.status === 'approved' && r.status === 'edited' && !d.params && !d.text && !d.off) d.status = 'edited';
  r.status = d.status;
  if (d.params) { r.params = r.params || {}; Object.keys(d.params).forEach(function (k) { r.params[k] = d.params[k]; }); }
  if (d.text) r.text = d.text;
  if (d.off && r.postup) Object.keys(d.off).forEach(function (k) { var kk = k.split(':'), b = r.postup[kk[0]] && r.postup[kk[0]].branches && r.postup[kk[0]].branches[Number(kk[1])]; if (b) { if (d.off[k]) b.off = true; else delete b.off; } });
  r.decidedAt = d.at; r.decidedBy = d.by; r.comment = d.comment || ''; r.touched = true;
  var h = { id: NF.uid('H'), at: d.at, by: d.by, item: d.item, kind: 'decision', from: from, to: { status: d.status, params: NF.clone(r.params || {}) }, comment: d.comment || '' };
  if (d.off) h.to.off = NF.clone(d.off);
  S.registry.history.push(h);
  NF.log(S, 'registr.rozhodnuti', d.item + ' → ' + d.status + (d.comment ? ' · „' + d.comment + '“' : ''), h);
  return h;
};
/* Souhrn pro hlavičku registru: kolik garant prošel, potvrdil, upravil, zamítl, okomentoval, kolik zbývá. */
NF.itemTouched = function (S, id) { return S.registry.history.some(function (h) { return h.item === id && h.kind !== 'comment'; }); };
NF.itemCommented = function (S, id) { return S.registry.history.some(function (h) { return h.item === id && h.comment; }); };
NF.registrySummary = function (S) {
  var items = S.registry.items, out = { total: items.length, touched: 0, confirmed: 0, edited: 0, rejected: 0, commented: 0, pending: 0, remaining: 0 };
  items.forEach(function (r) {
    var t = NF.itemTouched(S, r.id), c = NF.itemCommented(S, r.id);
    if (t) out.touched++; else out.remaining++;
    if (t && (r.status === 'approved' || r.status === 'edited')) out.confirmed++;
    if (r.status === 'edited') out.edited++;
    if (r.status === 'rejected') out.rejected++;
    if (c) out.commented++;
    if (c && !t) out.pending++;
  });
  return out;
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
/* Svačina (15, odst. 7a): čtvrtý a další zápis dne, bez inzulinu k jídlu; není slot. */
NF.SNACK = ['snack', 'svačina', 'Svačina', 'svačině'];
/* Věty bez rodu k jednotlivým jídlům dne (vykáme a nepředpokládáme rod). */
NF.MEAL_TEXT = {
  breakfast: { was: 'Byla dnes snídaně?', yes: 'Ano, byla', already: 'Snídaně už byla', without: 'bez snídaně', when: 'V kolik byla snídaně?' },
  lunch: { was: 'Byl dnes oběd?', yes: 'Ano, byl', already: 'Oběd už byl', without: 'bez oběda', when: 'V kolik byl oběd?' },
  dinner: { was: 'Byla dnes večeře?', yes: 'Ano, byla', already: 'Večeře už byla', without: 'bez večeře', when: 'V kolik byla večeře?' }
};
NF.mealText = function (m, key) { var t = NF.MEAL_TEXT[m]; return t ? t[key] : ''; };
/* cap: true = velké písmeno, 'dat' = 3. pád („snídani“), 'ke' / 'Ke' = s předložkou („ke snídani“, „k obědu“), 'acc' = 4. pád („snídani“, „oběd“) */
NF.MEAL_ACC = { breakfast: 'snídani', lunch: 'oběd', dinner: 'večeři', snack: 'svačinu' };
NF.mealLabel = function (m, cap) {
  var x = NF.MEALS.concat([NF.SNACK]).filter(function (k) { return k[0] === m; })[0]; if (!x) return m;
  if (cap === 'ke' || cap === 'Ke') { var pre = /^[sz]/.test(x[3]) ? 'ke' : 'k'; return (cap === 'Ke' ? pre.charAt(0).toUpperCase() + pre.slice(1) : pre) + ' ' + x[3]; }
  if (cap === 'acc') return NF.MEAL_ACC[m] || x[1];
  return cap === 'dat' ? x[3] : cap ? x[2] : x[1];
};
NF.isSnack = function (m) { return m === 'snack'; };
NF.DEFAULT_TARGETS = { low: 3.9, high: 10.0, fastingHigh: 7.2, tirGoal: 70 };
/* Výchozí cíle glukózy jsou položka registru C-CILE (R13, 6. 10. 2026); bez ní (nebo zamítnutá) platí pevný fallback. */
NF.defaultTargets = function (S) {
  var d = NF.DEFAULT_TARGETS;
  if (!S || !NF.usable(S, 'C-CILE')) return NF.clone(d);
  return { low: NF.param(S, 'C-CILE', 'low', d.low), high: NF.param(S, 'C-CILE', 'high', d.high), fastingHigh: NF.param(S, 'C-CILE', 'fastingHigh', d.fastingHigh), tirGoal: NF.param(S, 'C-CILE', 'tirGoal', d.tirGoal) };
};
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
    doses: { basal: { units: 0, time: '21:00' }, breakfast: { units: 0 }, lunch: { units: 0 }, dinner: { units: 0 } }, /* 0 = „nastavte“; výši dávky aplikace nikdy nepředvyplňuje (6. 10. 2026) */
    habits: [], instructions: [], targets: NF.defaultTargets(S), advice: { off: [], prefer: [] },
    medicationChecked: false, instructionsChecked: false, validUntil: NF.addDays(S.clock, 92), decisions: []
  };
};
NF.TARGET_STEPS = { low: [0.1, 3.0, 5.0], high: [0.5, 7.0, 14.0], fastingHigh: [0.1, 5.0, 10.0], tirGoal: [5, 40, 90] };
NF.setTarget = function (t, key, delta) {
  var st = NF.TARGET_STEPS[key]; if (!st || !t) return;
  var v = Math.round(Math.max(st[1], Math.min(st[2], t[key] + delta * st[0])) * 10) / 10;
  if (key === 'low' && v >= (t.high || 99) - 1) return; /* dolní cíl vždy aspoň 1 mmol/l pod horním */
  if (key === 'high' && v <= (t.low || 0) + 1) return;
  if (key === 'fastingHigh' && v <= (t.low || 0)) return;
  t[key] = v;
};
/* Meze parametrů registru (min, max): garant krokuje jen uvnitř nich (C6, 6. 10. 2026). */
NF.PARAM_BOUNDS = {
  'C-CILE': { low: [3.0, 5.0], high: [7.0, 14.0], fastingHigh: [5.0, 10.0], tirGoal: [40, 90] },
  'R-REAKCE': { minKnown: [1, 10], okno_min: [60, 240] }, 'R-SKORE': { mirna: [0.5, 1], stredni: [0.1, 0.9] },
  'D-PRAND': { dny: [7, 120], minJidel: [3, 30], podil: [0.5, 1], radyPrve: [0, 10], hypo: [1, 10], medianNad: [0, 3], hypoPodil: [0, 0.5] },
  'D-BAZAL': { dny: [7, 120], nociPod: [1, 10], minNoci: [3, 30] }, 'D-CISTA': { pred_min: [0, 60], po_min: [0, 60] },
  'S-SEMAFOR': { tir_zelena: [50, 90], tir_zluta: [30, 70], tbr_max: [1, 10], tbr3_max: [0.5, 5] }, 'R-PROCHAZKA': { minut: [5, 60] }, 'R-DOPLNEK': { stahnout_po: [1, 10] },
  'S-SOUHRN': { min_n: [3, 30], rozdil_mmol: [0.3, 3] }, 'P-NEMOC': { dny: [1, 14] }
};
NF.clampParam = function (id, key, v) { var b = NF.PARAM_BOUNDS[id] && NF.PARAM_BOUNDS[id][key]; if (!b) return Math.max(0, v); return Math.max(b[0], Math.min(b[1], v)); };
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
  if (['breakfast', 'lunch', 'dinner', 'basal'].some(function (k) { return !d.doses[k] || !(d.doses[k].units >= 1); })) chybi.push('všechny čtyři dávky (nejméně 1 j.)');
  if (!d.medicationChecked) chybi.push('ověření dávek s pacientem');
  if (!d.habits.length) chybi.push('aspoň jeden návyk');
  if (!d.instructions.length) chybi.push('osobní pokyny');
  if (!d.instructionsChecked) chybi.push('potvrzení, že pokyny byly probrány');
  return chybi;
};
NF.activePlan = function (S) { return S.plans.filter(function (p) { return p.id === S.activePlanId; })[0] || null; };
NF.planById = function (S, id) { return S.plans.filter(function (p) { return p.id === id; })[0] || null; };
NF.targets = function (S) { var p = NF.activePlan(S); return (p && p.targets) || NF.defaultTargets(S); };
NF.instructions = function (S) { var p = NF.activePlan(S); return (p && p.instructions) || []; };
/* Rady svázané s plánem (15, odst. 9): lékař může radu pro pacienta vypnout nebo nahradit. */
NF.planAdvice = function (S, p) { p = p || NF.activePlan(S); return (p && p.advice) || { off: [], prefer: [] }; };

NF.issuePlan = function (S, catalog) {
  if (S.role !== 'doctor') return { ok: false, error: 'Plán vydává lékař.' };
  if (!S.draft && NF.activePlan(S)) return { ok: false, error: 'Plán už je vydaný.' };
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
  if (p.understood) return { ok: true };
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
NF.TRAINING_REASONS = [['app', 'nerozumí ovládání aplikace'], ['sight', 'špatně vidí na displej'], ['helper', 'potřebuje pomoc blízké osoby'], ['refuse', 'nechce aplikaci používat'], ['time', 'nebyl čas, nový termín']];
NF.trainingReasonLabel = function (k) { var x = NF.TRAINING_REASONS.filter(function (r) { return r[0] === k; })[0]; return x ? x[1] : k; };
NF.finishTraining = function (S, result, reason) {
  if (S.role !== 'nurse') return { ok: false, error: 'Zaučení potvrzuje sestra.' };
  if (result === 'done' && !NF.trainingItems(S).every(function (t) { return S.training.steps[t.id]; })) return { ok: false, error: 'Dokud některý bod chybí, zaučení nelze dokončit.' };
  if (result === null) { S.training.result = null; S.training.reason = null; NF.log(S, 'zauceni.zmena', 'výsledek zrušen'); return { ok: true }; }
  if (S.training.result === result && (reason || null) === (S.training.reason || null)) return { ok: true };
  S.training.result = result; S.training.at = S.clock; S.training.by = S.nurse.id; S.training.reason = result === 'failed' ? (reason || null) : null;
  NF.log(S, 'zauceni.' + result, S.training.reason ? NF.trainingReasonLabel(S.training.reason) : '');
  return { ok: true };
};
/* Shrnutí zaučení pro lékaře (zařazení, kontrola): sestra ho zapsala, lékař ho vidí až v ordinaci. */
NF.trainingSummary = function (S) {
  var t = S.training || {};
  if (!t.result) return { state: 'pending', text: 'zaučení zatím neproběhlo' };
  if (t.result === 'done') return { state: 'done', text: 'zaučení dokončeno ' + NF.fmtDateTime(t.at) };
  var missing = NF.trainingItems(S).filter(function (x) { return !t.steps[x.id]; }).length;
  return { state: 'failed', text: 'zaučení se nezdařilo ' + NF.fmtDateTime(t.at) + (t.reason ? ' · ' + NF.trainingReasonLabel(t.reason) : '') + (missing ? ' · nezvládnuto ' + NF.plural(missing, 'bod', 'body', 'bodů') : '') + ' · návyky neplatí' };
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
  if (!name || !name.trim()) return { ok: false, error: 'Napište, co bylo k jídlu.' };
  if (!tags || !tags.side || !tags.prep || !tags.size) return { ok: false, error: 'Klepněte na přílohu, přípravu a velikost.' };
  var same = S.foods.filter(function (x) { return x.name.trim().toLowerCase() === name.trim().toLowerCase(); })[0];
  if (same) return { ok: true, food: same, existing: true }; /* stejný název = totéž jídlo (CH-8) */
  var f = { id: NF.uid('F'), name: name.trim(), tags: tags, custom: true, addedAt: S.clock };
  S.foods.push(f);
  NF.log(S, 'jidlo.pridano', f.name, f);
  return { ok: true, food: f };
};
NF.searchFoods = function (S, q, meal) {
  var n = String(q || '').toLowerCase().trim();
  /* Shoda od začátku slova, ne podřetězec („ka“ najde kaši, ne bábovku) — D9, 6. 10. 2026. */
  var hit = function (name) { return (' ' + name.toLowerCase()).indexOf(' ' + n) >= 0; };
  return S.foods.filter(function (f) { return !n || hit(f.name); })
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
NF.INSULIN = { as: 'podle plánu', other: 'jinak', none: 'bez inzulinu', unknown: 'nevím', snack: 'svačina bez inzulinu' };
NF.peakOf = function (points, win) {
  win = win || 120;
  var pts = (points || []).filter(function (p) { return p.mmol != null && p.min <= win; });
  return pts.length ? Math.max.apply(null, pts.map(function (p) { return p.mmol; })) : null;
};
/* Vrchol v okně z registru (R-REAKCE.okno_min, výchozí 120 min). */
NF.peakOfS = function (S, points) { return NF.peakOf(points, NF.param(S, 'R-REAKCE', 'okno_min', 120)); };
NF.minutesDiff = function (a, b) { return Math.round((NF.parse(b) - NF.parse(a)) / 60000); };
NF.at2h = function (points) { var p = (points || []).filter(function (x) { return x.mmol != null && x.min === 120; })[0]; return p ? p.mmol : null; };
NF.complete = function (ep) {
  var pts = (ep.points || []).filter(function (p) { return p.mmol != null; });
  return pts.length >= 4 && pts.some(function (p) { return p.min === 0; }) && pts.some(function (p) { return p.min >= 120; });
};
NF.doseKey = function (S, meal) { var p = NF.activePlan(S); return p && p.doses[meal] ? meal + ':' + p.doses[meal].units : meal + ':0'; };
/* Započítaný zápis: úplná data, inzulin potvrzen podle plánu, mimo nemoc, obvyklá porce, stejná dávka jako teď. */
/* Včas = inzulin nejvýš `pred_min` před jídlem a nejvýš `po_min` po něm (D-CISTA; 30 / 15 min, rozhodnuto 1. 10. 2026). */
NF.minutesOf = function (iso) { var d = NF.parse(iso); return d.getHours() * 60 + d.getMinutes(); };
NF.tolerance = function (S) { return { before: NF.param(S, 'D-CISTA', 'pred_min', 30), after: NF.param(S, 'D-CISTA', 'po_min', 15) }; };
NF.onTime = function (S, ep) {
  if (!ep.insulin || !ep.insulin.time) return false;
  var t = NF.tolerance(S), hm = String(ep.insulin.time).split(':');
  var diff = (Number(hm[0]) * 60 + Number(hm[1])) - NF.minutesOf(ep.at); /* záporné = před jídlem */
  if (diff > 720) diff -= 1440; else if (diff < -720) diff += 1440; /* přes půlnoc (P9) */
  return diff < 0 ? -diff <= t.before : diff <= t.after;
};
/* Svačina do N minut po hlavním jídle (D-CISTA.svacina_min, výchozí 120) zkreslí vrchol → jídlo není započítané (R4, 6. 10. 2026). */
NF.snackAfter = function (S, ep) {
  if (NF.isSnack(ep.meal)) return false;
  var w = NF.param(S, 'D-CISTA', 'svacina_min', 120), end = NF.addMin(ep.at, w);
  return S.episodes.some(function (x) { return NF.isSnack(x.meal) && x.at > ep.at && x.at <= end; });
};
/* Pozdní podání = inzulin až po jídle (v toleranci pro učení, ale ne pro návrh k dávce; R11). */
NF.latePodani = function (S, ep) {
  if (!ep.insulin || !ep.insulin.time) return false;
  var hm = String(ep.insulin.time).split(':'), diff = (Number(hm[0]) * 60 + Number(hm[1])) - NF.minutesOf(ep.at);
  if (diff > 720) diff -= 1440; else if (diff < -720) diff += 1440;
  return diff > 0;
};
NF.usableEp = function (S, ep) {
  if (!NF.complete(ep) || ep.context === 'illness') return false;
  if (NF.isSnack(ep.meal)) return !!(ep.insulin && ep.insulin.confirmed === 'snack');
  return ep.insulin && ep.insulin.confirmed === 'as' && NF.onTime(S, ep) && ep.portion === 'usual' && ep.doseKey === NF.doseKey(S, ep.meal) && !NF.snackAfter(S, ep);
};
NF.whyNotUsable = function (S, ep) {
  if (ep.context === 'illness') return 'z doby nemoci';
  if (!NF.complete(ep)) return 'chybí data ze senzoru';
  if (NF.isSnack(ep.meal)) return null;
  if (!ep.insulin || ep.insulin.confirmed !== 'as') return 'inzulin nepotvrzen podle plánu';
  if (!NF.onTime(S, ep)) return 'inzulin mimo čas (víc než ' + NF.tolerance(S).before + ' min před jídlem nebo ' + NF.tolerance(S).after + ' min po něm)';
  if (ep.portion !== 'usual') return 'jiná než obvyklá porce';
  if (ep.doseKey !== NF.doseKey(S, ep.meal)) return 'při jiné dávce';
  if (NF.snackAfter(S, ep)) return 'svačina do ' + NF.param(S, 'D-CISTA', 'svacina_min', 120) + ' min po jídle';
  return null;
};
/* Do návrhu k dávce vstupuje přísnější podmnožina: bez zpětných zápisů s odhadnutým časem, bez pozdního podání, bez dodatečně opraveného inzulinu (R4, R11, R6). */
NF.usableForDose = function (S, ep) { return NF.usableEp(S, ep) && !ep.retro && !NF.latePodani(S, ep) && !ep.insulinCorrected; };
NF.whyNotForDose = function (S, ep) {
  var w = NF.whyNotUsable(S, ep); if (w) return w;
  if (ep.retro) return 'zpětný zápis s odhadnutým časem (jen do učení)';
  if (NF.latePodani(S, ep)) return 'pozdní podání — inzulin až po jídle (jen do učení)';
  if (ep.insulinCorrected) return 'inzulin dodatečně opraven (jen do učení)';
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
  var peaks = usable.map(function (e) { return NF.peakOfS(S, e.points); });
  var high = NF.targets(S).high;
  var inT = peaks.filter(function (p) { return p <= high; }).length;
  /* Do R-REAKCE.minQuantile (8) zápisů je rozmezí nejnižší–nejvyšší (percentily z mála hodnot kryjí jen část rozptylu); od té doby 10.–90. percentil (R9, 6. 10. 2026). */
  var q = usable.length >= NF.param(S, 'R-REAKCE', 'minQuantile', 8);
  return { eaten: eps.length, n: usable.length, peaks: peaks, lo: NF.r1(q ? NF.quantile(peaks, 0.1) : (peaks.length ? Math.min.apply(null, peaks) : null)), hi: NF.r1(q ? NF.quantile(peaks, 0.9) : (peaks.length ? Math.max.apply(null, peaks) : null)), quantile: q,
    med: NF.r1(NF.median(peaks)), inTarget: inT, list: eps, usable: usable };
};
/* Stupeň reakce až od R-SKORE.minLabel (6) započítaných zápisů; mění se s hysterezí — jen když by platil i s jedním zápisem jinak (R9). */
NF.reactionLabel = function (S, st, foodId) {
  if (!st.n || !NF.usable(S, 'R-SKORE')) return null;
  if (st.n < NF.param(S, 'R-SKORE', 'minLabel', 6)) return null;
  var mild = NF.param(S, 'R-SKORE', 'mirna', 0.8), mid = NF.param(S, 'R-SKORE', 'stredni', 0.5);
  var lab = function (k) { var share = k / st.n; return share >= mild ? 'mild' : share >= mid ? 'mid' : 'strong'; };
  var key = lab(st.inTarget), stable = lab(Math.min(st.n, st.inTarget + 1)) === key && lab(Math.max(0, st.inTarget - 1)) === key;
  if (foodId) {
    var store = fbState(S).labels || (fbState(S).labels = {});
    if (!stable && store[foodId]) key = store[foodId]; else store[foodId] = key;
  }
  var L = { mild: { key: 'mild', label: 'mírná reakce', cls: 'ok' }, mid: { key: 'mid', label: 'střední reakce', cls: 'warn' }, strong: { key: 'strong', label: 'častěji nad cílem', cls: 'bad' } };
  return L[key];
};
NF.confidence = function (S, foodId, meal) {
  var food = NF.foodById(S, foodId);
  meal = meal || NF.dominantMeal(S, foodId);
  var st = NF.foodStats(S, foodId, null, meal);
  if (!food) return { level: 'unknown', st: st, items: [], meal: meal };
  if (!NF.usable(S, 'R-REAKCE')) return { level: 'none', st: st, items: [], meal: meal, why: 'Pravidlo pro vyhodnocení reakce je zamítnuté; nic nevyhodnocujeme.' };
  var min = NF.param(S, 'R-REAKCE', 'minKnown', 3);
  var res = { st: st, min: min, items: ['R-REAKCE'], reaction: null, meal: meal };
  if (st.n >= min) { res.level = 'known'; res.reaction = NF.reactionLabel(S, st, foodId); return res; }
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
   nikdy „snězte víc“. Rady bez změny množství kdykoli (mimo nemoc jen ty bezpečné). */
NF.LEVERS = {
  portion: { label: 'Obvyklá porce', item: 'R-PORCE', carbs: true },
  addon: { label: 'Doplněk k jídlu', item: 'R-DOPLNEK', carbs: false, illnessSafe: false, beforeOnly: true },
  order: { label: 'Pořadí jídla', item: 'R-PORADI', carbs: false, illnessSafe: false }, /* při nemoci k jídlu neradíme vůbec (R8, 15 odst. 8) */
  walk: { label: 'Procházka po jídle', item: 'R-PROCHAZKA', carbs: false, illnessSafe: false }
};
NF.effectiveBolus = function (state) { return state === 'before' ? 'before' : 'after'; };
NF.adviceGate = function (S) {
  var p = NF.activePlan(S);
  if (S.participation !== 'active') return { ok: false, why: 'Účast je ukončená.' };
  if (!p || !p.understood) return { ok: false, why: 'Dokud nemáte převzatý plán od lékaře, neradíme.' };
  if (!NF.usable(S, 'R-REAKCE')) return { ok: false, why: 'Vyhodnocení reakce je v registru zamítnuté; neradíme.' };
  return { ok: true };
};
function fill(S, text, food) {
  return String(text || '').replace('{addon}', food.addon || 'bílkovinu (jogurt, sýr, vejce)').replace('{first}', food.first || 'zeleninu nebo maso').replace('{minut}', String(NF.param(S, 'R-PROCHAZKA', 'minut', 15)));
}
NF.advise = function (S, foodId, portion, bolusState, meal) {
  var food = NF.foodById(S, foodId);
  var res = { gate: NF.adviceGate(S), conf: null, items: [], blocked: [], gone: [], effective: bolusState ? NF.effectiveBolus(bolusState) : null, illness: !!(S.illness && S.illness.active) };
  if (!food) return res;
  res.conf = NF.confidence(S, foodId, meal); meal = res.conf.meal;
  if (!res.gate.ok || !bolusState) return res;
  var before = res.effective === 'before';
  /* porce (u svačiny není dávka, ke které by se porce vztahovala) */
  if (portion !== 'usual' && !NF.isSnack(meal)) {
    var it = NF.item(S, 'R-PORCE');
    if (!NF.usable(S, 'R-PORCE')) res.blocked.push({ lever: 'portion', reason: 'item', why: 'Pravidlo k porci je zamítnuté.' });
    else if (res.illness) res.blocked.push({ lever: 'portion', reason: 'illness', why: 'Během nemoci k množství jídla neradíme; řiďte se pokyny lékaře.' });
    else if (before || portion === 'bigger') {
      /* Věty rady jsou texty položky R-PORCE (R13); kód je nevymýšlí. */
      var TP = NF.texts(S, 'R-PORCE') || {};
      res.items.push({ lever: 'portion', item: 'R-PORCE', label: NF.LEVERS.portion.label, carbs: true,
        text: portion === 'bigger' ? (before ? TP.biggerBefore : TP.biggerAfter) : TP.smaller,
        certainty: TP.certainty || '' });
    } else {
      res.blocked.push({ lever: 'portion', reason: 'bolus', why: bolusState === 'unknown'
        ? 'Nevíte, jestli už máte inzulin píchnutý — bereme to, jako by byl. Radu k množství jídla proto nedáváme. Když sníte méně než obvykle, řiďte se pokynem lékaře „méně jídla než obvykle“.'
        : 'Inzulin už máte v těle. Když sníte méně než obvykle, řiďte se pokynem lékaře „méně jídla než obvykle“.' });
    }
  }
  /* rady bez změny množství */
  var lv = res.conf.level;
  var cands = [], pa = NF.planAdvice(S), reason = false;
  if (lv === 'known' || lv === 'similar') {
    /* Rady se nabízejí podle podílu v cíli (prahy R-SKORE), i když barevný stupeň ještě není (ten je až od 6 zápisů, R9). */
    var sst = lv === 'known' ? res.conf.st : res.conf.pool, share = sst && sst.n ? sst.inTarget / sst.n : null;
    var needs = NF.usable(S, 'R-SKORE') && share != null && share < NF.param(S, 'R-SKORE', 'mirna', 0.8);
    if (needs) { cands = ['addon', 'order', 'walk']; reason = true; }
    else if (lv === 'known') { NF.leverStats(S, foodId, meal).forEach(function (x) { if (cands.indexOf(x.lever) < 0) cands.push(x.lever); }); }
  }
  if (reason) (pa.prefer || []).forEach(function (l) { if (cands.indexOf(l) < 0) cands.push(l); });
  cands = cands.filter(function (l) { return (pa.off || []).indexOf(l) < 0; });
  var base = lv === 'known' ? NF.baseStats(S, foodId, meal) : null;
  cands.forEach(function (l) {
    var meta = NF.LEVERS[l], it = NF.item(S, meta.item);
    if (!NF.usable(S, meta.item)) return; /* zamítnuté pravidlo → rada prostě není */
    if (res.illness && !meta.illnessSafe) return;
    if (meta.beforeOnly && !before) return; /* doplněk jen před píchnutím (6. 10. 2026) */
    if (l === 'addon' && food.addon === '') return; /* jídlo, ke kterému není co přidat */
    var ls = lv === 'known' ? NF.leverStats(S, foodId, meal).filter(function (x) { return x.lever === l; })[0] : null;
    if (l === 'addon' && ls && ls.st.n >= NF.param(S, 'R-DOPLNEK', 'stahnout_po', 3) && ls.st.inTarget === 0) return; /* rada stažena po N pokusech bez účinku */
    var item = { lever: l, item: meta.item, label: meta.label, carbs: false, text: fill(S, it.text, food) };
    if (ls) item.certainty = 'Vyzkoušeno ' + ls.st.n + '×: ' + ls.st.inTarget + ' z ' + ls.st.n + ' v cíli' + (base && base.n ? ' (bez toho ' + base.inTarget + ' z ' + base.n + ')' : '') + '.';
    else if (lv === 'known') item.certainty = 'U tohoto jídla zatím nevyzkoušeno. Po prvním pokusu uvidíte, jestli pomohlo.';
    else item.certainty = 'Obecná rada ze schváleného pravidla. Jak zabere právě u vás, zatím nevíme.';
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

/* Čas zpětného zápisu: hodina dne (např. 7,5) → ISO dnešního dne. */
NF.retroAt = function (S, h) {
  if (h == null) return S.clock;
  var hh = Math.floor(h), mm = Math.round((h % 1) * 60);
  var at = NF.day(S.clock) + 'T' + (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm + ':00';
  if (at > S.clock) at = NF.addDays(at, -1); /* zápis po půlnoci o včerejším jídle: čas nesmí být v budoucnosti */
  return at;
};
NF.WALK_WINDOW_MIN = 180;
/* Rada po jídle, které už je snědené: k jídlu se radit nedá, ale pohyb pomůže, dokud je glukóza po jídle zvýšená (do ~3 h);
   do hodiny zmírní vzestup, později už jen sníží zvýšenou hodnotu. */
NF.adviseAfter = function (S, foodId, meal, at) {
  var res = { gate: NF.adviceGate(S), items: [], conf: NF.confidence(S, foodId, meal), late: false, minutes: at ? Math.round((NF.parse(S.clock) - NF.parse(at)) / 60000) : null };
  if (!res.gate.ok) return res;
  if (res.minutes != null && res.minutes > NF.WALK_WINDOW_MIN) { res.late = true; return res; }
  var meta = NF.LEVERS.walk, it = NF.item(S, meta.item);
  if (NF.usable(S, meta.item) && !(S.illness && S.illness.active)) {
    var soon = res.minutes == null || res.minutes <= 60;
    res.items.push({ lever: 'walk', item: meta.item, label: meta.label, carbs: false, text: it.text, certainty: soon ? 'Jídlo už máte za sebou; pohyb do hodiny po jídle zmírní vzestup glukózy. Doplněk ani pořadí už teď nezměníte.' : 'Od jídla uplynulo ' + res.minutes + ' min. Vzestup už nezměníte, ale glukóza po jídle bývá zvýšená ještě 2–3 hodiny a procházka ji sníží.' });
  }
  return res;
};
/* Uložení jídla se zápisem inzulinu i rozhodnutí o radách. */
NF.saveEpisode = function (S, data) {
  var p = NF.activePlan(S);
  if (!p || !p.understood) return { ok: false, error: 'Zápis patří k převzatému plánu.' };
  if (!data.foodId) return { ok: false, error: 'Vyberte jídlo.' };
  if (NF.isSnack(data.meal)) data.insulin = { confirmed: 'snack', units: null, time: null };
  if (!data.insulin || !data.insulin.confirmed) return { ok: false, error: 'Řekněte, jak to bylo s inzulinem.' };
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
  ep.peak = NF.peakOfS(S, ep.points); ep.at2h = NF.at2h(ep.points);
  S.episodes.push(ep);
  NF.log(S, 'jidlo.zapsano', ep.id + ' ' + ep.foodId, { meal: ep.meal, portion: ep.portion, insulin: ep.insulin, advice: ep.advice, context: ep.context, usable: NF.usableEp(S, ep), whyNot: NF.whyNotUsable(S, ep) });
  NF.checkMilestones(S);
  return { ok: true, episode: ep };
};
NF.confirmBasal = function (S, confirmed, units, time, date) {
  var p = NF.activePlan(S); if (!p) return { ok: false, error: 'Není plán.' };
  var h = NF.parse(S.clock).getHours();
  var autoDate = !date && h < 4 ? NF.day(NF.addDays(S.clock, -1)) : NF.day(S.clock); /* večerní bazál potvrzený po půlnoci (do 4:00) patří k předchozímu dni */
  var rec = { at: S.clock, date: date || autoDate, prescribed: p.doses.basal.units, confirmed: confirmed, units: units != null ? units : (confirmed === 'as' ? p.doses.basal.units : null), time: time || NF.fmtTime(S.clock) };
  if (rec.confirmed === 'other' && rec.units === rec.prescribed) rec.confirmed = 'as';
  S.basalLog = S.basalLog.filter(function (b) { return b.date !== rec.date; }).concat([rec]);
  NF.log(S, 'bazal.potvrzen', rec.confirmed + ' ' + (rec.units == null ? '' : rec.units + ' j.'), rec);
  return { ok: true };
};
/* Oprava potvrzení inzulinu do D-CISTA.oprava_min (60) minut po zápisu; opravený zápis jde do učení, ne do návrhu k dávce (R6, 6. 10. 2026). */
NF.canCorrectInsulin = function (S, ep) { return !!ep && !NF.isSnack(ep.meal) && NF.minutesDiff(ep.recordedAt || ep.at, S.clock) <= NF.param(S, 'D-CISTA', 'oprava_min', 60) && NF.minutesDiff(ep.recordedAt || ep.at, S.clock) >= 0; };
NF.correctInsulin = function (S, id, confirmed, units) {
  var ep = S.episodes.filter(function (e) { return e.id === id; })[0]; if (!ep) return { ok: false, error: 'Zápis nenalezen.' };
  if (!NF.canCorrectInsulin(S, ep)) return { ok: false, error: 'Inzulin lze opravit jen do ' + NF.param(S, 'D-CISTA', 'oprava_min', 60) + ' minut po zápisu.' };
  if (['as', 'other', 'none', 'unknown'].indexOf(confirmed) < 0) return { ok: false, error: 'Vyberte, jak to bylo s inzulinem.' };
  var from = NF.clone(ep.insulin);
  ep.insulin.confirmed = confirmed; ep.insulin.units = confirmed === 'as' ? ep.insulin.prescribed : confirmed === 'other' ? (units != null ? units : ep.insulin.units) : null;
  if (confirmed === 'other' && ep.insulin.units === ep.insulin.prescribed) ep.insulin.confirmed = 'as';
  if (confirmed === 'none' || confirmed === 'unknown') ep.insulin.time = null;
  ep.insulinCorrected = true; ep.history = ep.history || []; ep.history.push({ at: S.clock, insulinFrom: from, insulinTo: NF.clone(ep.insulin) });
  NF.log(S, 'jidlo.inzulin.opraven', id + ' ' + from.confirmed + ' → ' + ep.insulin.confirmed, { from: from, to: ep.insulin });
  return { ok: true, episode: ep };
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
  var peak = NF.peakOfS(S, ep.points), usable = NF.usableEp(S, ep), why = NF.whyNotUsable(S, ep);
  var map = { food: food.name, peak: NF.mmol(peak), meal: NF.mealLabel(ep.meal, true), lever: acc.length ? NF.LEVER_WITH[acc[0]] : '', why: why || '', base: '', sugg: '' };
  var key, minN = NF.param(S, 'S-VYSLEDEK', 'min_n', 4);
  if (peak == null) key = 'nodata';
  else if (!usable && !NF.isSnack(ep.meal)) key = 'excluded'; /* nezapočítaný zápis: bez čísla a verdiktu (R7, 6. 10. 2026) */
  else if (acc.length) {
    key = peak <= high ? 'okAdvice' : 'highAdvice';
    var base = NF.baseStats(S, food.id, ep.meal), withL = NF.leverStats(S, food.id, ep.meal).filter(function (x) { return x.lever === acc[0]; })[0];
    /* srovnání „bez toho u vás bývá“ až od min_n zápisů s radou i bez ní */
    if (key === 'okAdvice' && base.n >= minN && withL && withL.st.n >= minN && base.lo != null) map.base = NF.fillText(T.baseNote, { lo: NF.mmol(base.lo), hi: NF.mmol(base.hi), k: withL.st.inTarget, n: withL.st.n });
  } else if (peak <= high) key = 'okPlain';
  else {
    key = 'highPlain';
    var best = NF.leverStats(S, food.id, ep.meal).filter(function (x) { return x.st.n >= 2 && x.st.inTarget / x.st.n >= 0.5; })[0];
    map.sugg = best ? NF.fillText(T.suggestData, { lever: NF.leverNoun(best.lever), k: best.st.inTarget, n: best.st.n }) : (T.suggestGeneric || '');
  }
  var text = NF.fillText(T[key] || T.okPlain, map) + (!usable && key !== 'nodata' && key !== 'excluded' && why ? NF.fillText(T.unusable, { why: why }) : '');
  return { ep: ep, food: food, key: key, text: text, usable: usable, why: why, peak: key === 'excluded' ? null : peak, smaller: ep.portion === 'smaller' };
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
    if (st.n >= min) { knownCount++; if (!NF.isSnack(NF.dominantMeal(S, fid))) add('known:' + fid, 'known', { food: f.name, n: min }); }
    var last = st.list.slice(-3);
    if (last.length === 3) Object.keys(NF.LEVERS).forEach(function (l) {
      if (l === 'portion') return;
      var all = last.every(function (e) { return NF.usableEp(S, e) && (e.advice || []).some(function (a) { return a.lever === l && a.accepted === true; }); }); /* milník za návyk, ne za hodnotu (D7) */
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
  /* dny se počítají kalendářně (NF.daysBetween), nikdy z milisekund */
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
  if (on) { if (S.illness && S.illness.active) return { ok: true }; S.illness = { active: true, from: S.clock, checkins: [] }; NF.log(S, 'nemoc.zacatek', ''); }
  else if (S.illness && S.illness.active) { S.illness.active = false; S.illness.to = S.clock; S.illnessLog = (S.illnessLog || []).concat([{ from: S.illness.from, to: S.clock }]); NF.log(S, 'nemoc.konec', ''); }
  return { ok: true };
};
/* Nemoc delší než P-NEMOC.dny (3): karta s pokynem lékaře (R12). */
NF.illnessLong = function (S) { var n = NF.param(S, 'P-NEMOC', 'dny', 3); return S.illness && S.illness.active && NF.daysBetween(S.illness.from, S.clock) >= n ? n : 0; };
NF.illnessLongPeriods = function (S) {
  var n = NF.param(S, 'P-NEMOC', 'dny', 3), periods = (S.illnessLog || []).slice();
  if (S.illness && S.illness.active) periods.push({ from: S.illness.from, to: S.clock });
  return periods.filter(function (p) { return NF.daysBetween(p.from, p.to) >= n; }).length;
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
  var allEps = NF.periodEpisodes(S, planId), snacks = allEps.filter(function (e) { return NF.isSnack(e.meal); }).length;
  var eps = allEps.filter(function (e) { return !NF.isSnack(e.meal); });
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
  var zel = NF.param(S, 'S-SEMAFOR', 'tir_zelena', t.tirGoal), zlu = NF.param(S, 'S-SEMAFOR', 'tir_zluta', 50), tbr = NF.param(S, 'S-SEMAFOR', 'tbr_max', 4), tbr3 = NF.param(S, 'S-SEMAFOR', 'tbr3_max', 1);
  var tirState = !ss ? 'none' : (ss.tir >= Math.max(zel, t.tirGoal) && ss.below < tbr ? 'ok' : (ss.tir >= zlu && ss.below < tbr && ss.veryLow < tbr3) ? 'warn' : 'bad');
  var adv = NF.adviceOutcome(S, planId);
  return { meals: meals, snacks: snacks, usual: usual, usualPct: NF.pct(usual, meals), asPlan: asPlan, asPct: NF.pct(asPlan, meals), other: other, none: none, unknown: unknown,
    basalAs: basalAs, basalDays: basalDays, onTime: onTime, ill: ill, illDays: NF.illnessDays(S), illLong: NF.illnessLongPeriods(S), incomplete: incomplete, sensor: ss, tirState: tirState, advice: adv,
    hba1c: (S.patient && S.patient.hba1c) || null, habitsDone: NF.activeHabits(S).length };
};
NF.adviceOutcome = function (S, planId) {
  var eps = NF.periodEpisodes(S, planId).filter(function (e) { return (e.advice || []).some(function (a) { return a.lever !== 'portion'; }); });
  var high = NF.targets(S).high;
  var grp = function (pred) {
    var l = eps.filter(pred), c = l.filter(function (e) { return NF.complete(e) && e.context !== 'illness'; });
    var peaks = c.map(function (e) { return NF.peakOfS(S, e.points); });
    return { n: l.length, c: c.length, med: NF.r1(NF.median(peaks)), inTarget: peaks.filter(function (p) { return p <= high; }).length };
  };
  var acc = grp(function (e) { return e.advice.some(function (a) { return a.lever !== 'portion' && a.accepted === true; }); });
  var dec = grp(function (e) { return !e.advice.some(function (a) { return a.lever !== 'portion' && a.accepted === true; }) && e.advice.some(function (a) { return a.lever !== 'portion' && a.accepted === false; }); });
  var noans = grp(function (e) { return e.advice.filter(function (a) { return a.lever !== 'portion'; }).every(function (a) { return a.accepted === null; }); });
  var byLever = {}, reasons = {};
  eps.forEach(function (e) { e.advice.forEach(function (a) {
    if (a.lever === 'portion') return;
    byLever[a.lever] = byLever[a.lever] || { offered: 0, accepted: 0, declined: 0, reasons: {}, peaksAcc: [], peaksDec: [] };
    byLever[a.lever].offered++;
    var ok = NF.complete(e) && e.context !== 'illness', pk = ok ? NF.peakOfS(S, e.points) : null;
    if (a.accepted === true) { byLever[a.lever].accepted++; if (pk != null) byLever[a.lever].peaksAcc.push(pk); }
    if (a.accepted === false) { byLever[a.lever].declined++; if (pk != null) byLever[a.lever].peaksDec.push(pk); if (a.reason) { byLever[a.lever].reasons[a.reason] = (byLever[a.lever].reasons[a.reason] || 0) + 1; reasons[a.reason] = (reasons[a.reason] || 0) + 1; } }
  }); });
  /* Srovnání „s radou vs. bez“ je srovnání skupin, které si pacient vybral sám; říká se proto jen od 8 + 8 zápisů u téže rady a rozdílu ≥ 1,0 mmol/l, neutrálně (6. 10. 2026). */
  var MIN_N = NF.param(S, 'S-SOUHRN', 'min_n', 8), MIN_D = NF.param(S, 'S-SOUHRN', 'rozdil_mmol', 1.0);
  Object.keys(byLever).forEach(function (l) {
    var b = byLever[l]; b.nAcc = b.peaksAcc.length; b.nDec = b.peaksDec.length; b.medAcc = NF.r1(NF.median(b.peaksAcc)); b.medDec = NF.r1(NF.median(b.peaksDec));
    b.lower = b.nAcc >= MIN_N && b.nDec >= MIN_N && b.medAcc != null && b.medDec != null ? (b.medAcc <= b.medDec - MIN_D ? 'yes' : b.medAcc >= b.medDec + MIN_D ? 'no' : 'same') : 'few';
    delete b.peaksAcc; delete b.peaksDec;
  });
  var top = Object.keys(reasons).sort(function (a, b) { return reasons[b] - reasons[a]; })[0] || null;
  var any = Object.keys(byLever).map(function (l) { return byLever[l].lower; });
  return { offered: eps.length, accepted: acc, declined: dec, noAnswer: noans, byLever: byLever, reasons: reasons, topReason: top,
    works: any.indexOf('yes') >= 0 ? 'yes' : any.indexOf('no') >= 0 ? 'no' : any.indexOf('same') >= 0 ? 'same' : 'few' };
};
NF.DECLINE_REASONS = [['nothome', 'Nemám to doma'], ['taste', 'Nechutná mi to'], ['time', 'Nebyl čas'], ['nowant', 'Bez udání důvodu']];
NF.reasonLabel = function (k) { var x = NF.DECLINE_REASONS.filter(function (r) { return r[0] === k; })[0]; return x ? x[1] : k; };

/* ---------- návrhy lékaři ----------
   Každý návrh: { id, kind, cat, title, why, weak[], verify[], branches[], item, decision }
   Aplikace nevymýšlí směr dávky: větve jsou z položky D-POSTUP, kterou schválil lékař-garant. */
function cleanEps(S, planId, meal, since) {
  return NF.periodEpisodes(S, planId).filter(function (e) { return e.meal === meal && e.at >= since && NF.usableForDose(S, e); });
}
/* Větve a ověřovací body postupu posouzení dávky jsou texty položky D-POSTUP (R13, 6. 10. 2026):
   garant je vidí v registru, může jednotlivou větev vyřadit nebo celou položku zamítnout. Kód je nevymýšlí.
   Vrací { verify: [], branches: [] } s doplněnými hodnotami; bez položky nebo bez klíče prázdné pole. */
NF.postup = function (S, key, vars) {
  var r = NF.usable(S, 'D-POSTUP') ? NF.item(S, 'D-POSTUP') : null, p = r && r.postup && r.postup[key];
  if (!p) return { verify: [], branches: [], missing: !!r };
  var f = function (x) { return NF.fillText(x, vars || {}); };
  return { verify: (p.verify || []).map(f), branches: (p.branches || []).filter(function (b) { return !b.off; }).map(function (b) { return { when: f(b.when), action: b.action, text: f(b.text) }; }) };
};
NF.proposals = function (S, planId, catalog) {
  var out = [], t = NF.targets(S), p = NF.planById(S, planId);
  if (!p) return out;
  var withPostup = function (pr, key, vars) {
    var ps = NF.postup(S, key, vars);
    pr.verify = ps.verify; pr.branches = ps.branches; pr.postup = 'D-POSTUP';
    if (ps.missing || !ps.branches.length) pr.weak.push('postup posouzení dávky (D-POSTUP) pro tento případ nemá schválenou větev — rozhodněte sami');
    return pr;
  };
  /* Okno návrhu: od poslední změny dávky (= od vydání plánu), nejméně D-PRAND.dny (28) dní (R2, 6. 10. 2026). */
  var days = NF.param(S, 'D-PRAND', 'dny', 28), since = NF.addDays(S.clock, -days);
  if (p.effectiveFrom && p.effectiveFrom < since) since = p.effectiveFrom;
  var winDays = Math.max(1, NF.daysBetween(since, S.clock));
  var sm = NF.summary(S, planId), bal = (sm.sensor ? 'čas v cíli ' + sm.sensor.tir + ' % (cíl ' + t.tirGoal + ' %) · pod ' + NF.mmol(t.low) + ': ' + sm.sensor.below + ' %' : 'souhrn ze senzoru chybí') + (sm.hba1c ? ' · HbA1c ' + sm.hba1c.join(' → ') + ' mmol/mol' : '');
  /* --- bazál: nízké noční hodnoty mají přednost --- */
  if (NF.usable(S, 'D-BAZAL')) {
    var bdays = NF.param(S, 'D-BAZAL', 'dny', 14), minNoci = NF.param(S, 'D-BAZAL', 'minNoci', 10);
    var nights = S.nights.filter(function (n) { return n.date >= NF.day(NF.addDays(S.clock, -bdays)); });
    var lowN = nights.filter(function (n) { return n.min < t.low; }).length, veryLow = nights.filter(function (n) { return n.min < 3.0; }).length;
    var fastMed = NF.r1(NF.median(nights.map(function (n) { return n.fasting; })));
    var basalAs = S.basalLog.filter(function (b) { return b.confirmed === 'as'; }).length;
    if (nights.length >= minNoci && (lowN >= NF.param(S, 'D-BAZAL', 'nociPod', 2) || veryLow >= 1)) {
      out.push(withPostup({ id: 'PR-BAZAL', kind: 'dose', dose: 'basal', cat: 'davka', priority: 0, title: 'Posoudit bazální dávku — noční hodnoty pod cílem',
        why: lowN + ' z ' + nights.length + ' nocí za posledních ' + bdays + ' dní kleslo pod ' + NF.mmol(t.low) + ' mmol/l' + (veryLow ? ', z toho ' + veryLow + '× pod 3,0' : '') + '. Noční pokles je nejdůležitější signál a má přednost před ostatními.',
        context: bal, weak: ['hodnota pod 3,0 z jednoho bodu může být i artefakt senzoru (tlak na senzor ve spánku)'], item: 'D-BAZAL' }, 'bazalLow', { as: basalAs, n: S.basalLog.length }));
    } else if (nights.length >= minNoci && fastMed != null && fastMed > t.fastingHigh && lowN === 0) {
      out.push(withPostup({ id: 'PR-BAZAL', kind: 'dose', dose: 'basal', cat: 'davka', priority: 2, title: 'Posoudit bazální dávku — ranní hodnoty nad cílem',
        why: 'Medián ranních hodnot za ' + bdays + ' dní je ' + NF.mmol(fastMed) + ' mmol/l (cíl do ' + NF.mmol(t.fastingHigh) + ') a žádná noc neklesla pod ' + NF.mmol(t.low) + '.',
        context: bal, weak: [], item: 'D-BAZAL' }, 'bazalHigh', { as: basalAs, n: S.basalLog.length, tirGoal: t.tirGoal }));
    }
  }
  /* --- prandiální podle jídla --- */
  if (NF.usable(S, 'D-PRAND')) NF.MEALS.forEach(function (m) {
    var meal = m[0], eps = cleanEps(S, planId, meal, since);
    var minN = NF.param(S, 'D-PRAND', 'minJidel', 8), share = NF.param(S, 'D-PRAND', 'podil', 2 / 3), medNad = NF.param(S, 'D-PRAND', 'medianNad', 0.5);
    var all = NF.periodEpisodes(S, planId).filter(function (e) { return e.meal === meal && e.at >= since; });
    var excludedList = all.filter(function (e) { return !NF.usableForDose(S, e); }).map(function (e) { return { at: e.at, why: NF.whyNotForDose(S, e) }; });
    var excluded = excludedList.length, excludedText = NF.plural(excluded, 'zápis vyřazen', 'zápisy vyřazeny', 'zápisů vyřazeno') + ' z návrhu (jiná porce, nepotvrzený nebo pozdní inzulin, svačina do 2 h, zpětný zápis, nemoc, chybějící data)';
    /* Nízké hodnoty se berou ze všech zápisů jídla, ne jen z čistých; co není čisté, se vypíše (R4). Jediný pokles pod 3,0 stačí (R3). */
    var lowOf = function (e, lim) { return (e.points || []).some(function (x) { return x.mmol != null && x.mmol < lim; }); };
    var lowsAll = all.filter(function (e) { return lowOf(e, t.low); }), veryLowAll = all.filter(function (e) { return lowOf(e, 3.0); });
    var hypoN = NF.param(S, 'D-PRAND', 'hypo', 2), hypoShare = NF.param(S, 'D-PRAND', 'hypoPodil', 0.15), hypoMin = NF.param(S, 'D-PRAND', 'hypoMin', 6);
    if (all.length && (veryLowAll.length >= 1 || (all.length >= hypoMin && lowsAll.length >= hypoN && lowsAll.length / all.length >= hypoShare))) {
      var unclean = lowsAll.filter(function (e) { return !NF.usableForDose(S, e); });
      out.push(withPostup({ id: 'PR-' + meal.toUpperCase(), kind: 'dose', dose: meal, cat: 'davka', priority: 1, title: 'Posoudit prandiální dávku ' + NF.mealLabel(meal, 'ke') + ' — hodnoty pod cílem',
        why: lowsAll.length + ' z ' + all.length + ' ' + NF.mealLabel(meal) + ' za ' + winDays + ' dní: glukóza do 4 h po jídle klesla pod ' + NF.mmol(t.low) + ' mmol/l' + (veryLowAll.length ? ', z toho ' + veryLowAll.length + '× pod 3,0' : '') + '.',
        context: bal, weak: (unclean.length ? ['z toho ' + unclean.length + ' mimo čistá data: ' + unclean.map(function (e) { return NF.whyNotForDose(S, e); }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(', ')] : []).concat(excluded ? [excludedText] : []), excluded: excludedList,
        item: 'D-PRAND' }, 'prandLow', { meal: NF.mealLabel(meal, 'ke') }));
      return;
    }
    if (eps.length < minN) return;
    var above = eps.filter(function (e) { return NF.peakOfS(S, e.points) > t.high; });
    if (above.length / eps.length < share) return;
    var medPeak = NF.r1(NF.median(eps.map(function (e) { return NF.peakOfS(S, e.points); })));
    if (medPeak != null && medPeak <= t.high + medNad) return; /* hraniční jídla návrh nespouštějí (R2) */
    /* Rozpad po jídlech (R1): jednotka návrhu je slot dne, ale lékař vidí, které jídlo za tím stojí. */
    var byFood = {};
    eps.forEach(function (e) { var f = NF.foodById(S, e.foodId), nm = f ? f.name : e.foodId; byFood[nm] = byFood[nm] || { n: 0, above: 0 }; byFood[nm].n++; if (NF.peakOfS(S, e.points) > t.high) byFood[nm].above++; });
    var breakdown = Object.keys(byFood).map(function (k) { return { food: k, n: byFood[k].n, above: byFood[k].above }; }).sort(function (a, b) { return b.n - a.n; });
    var inTargetFoods = breakdown.filter(function (b) { return b.n >= 2 && b.above === 0; });
    var heteroWeak = inTargetFoods.length ? ['jídlo ' + inTargetFoods.map(function (b) { return '„' + b.food + '“ (' + b.n + '× v cíli)'; }).join(', ') + ' je v cíli — příčina může být v konkrétním jídle, ne v dávce; zvýšení by dopadlo i na tyto dny'] : [];
    var acceptedAdvice = eps.filter(function (e) { return (e.advice || []).some(function (a) { return a.accepted === true && a.lever !== 'portion'; }); });
    /* Rady první: dávka se neposuzuje, dokud pacient rady nepřijal aspoň radyPrve×, ani když je v okně většinou odmítal (odmítnutí ≥ 60 % z ≥ 5 nabídek). */
    var offered = 0, declinedN = 0;
    all.forEach(function (e) { (e.advice || []).forEach(function (a) { if (a.lever === 'portion') return; offered++; if (a.accepted === false) declinedN++; }); });
    if (acceptedAdvice.length < NF.param(S, 'D-PRAND', 'radyPrve', 3) || (offered >= 5 && declinedN / offered >= 0.6)) {
      var declined = {};
      all.forEach(function (e) { (e.advice || []).forEach(function (a) { if (a.lever !== 'portion' && a.accepted === false) declined[a.lever] = (declined[a.lever] || 0) + 1; }); });
      var usableLevers = Object.keys(NF.LEVERS).filter(function (l) { return l !== 'portion' && NF.usable(S, NF.LEVERS[l].item); });
      var worst = Object.keys(declined).filter(function (l) { return usableLevers.indexOf(l) >= 0; }).sort(function (a, b) { return declined[b] - declined[a]; })[0] || usableLevers[0];
      if (!worst) return; /* bez schválené rady k jídlu není co posílit */
      out.push(withPostup({ id: 'PR-' + meal.toUpperCase() + '-RADY', kind: 'habit', cat: 'plan', priority: 3, lever: worst, title: 'Nejdřív rady ' + NF.mealLabel(meal, 'ke') + ', dávku zatím neměnit',
        why: above.length + ' z ' + eps.length + ' ' + NF.mealLabel(meal) + ' skončilo nad cílem, ale pacient rady k jídlu přijal jen ' + acceptedAdvice.length + '×' + (declined[worst] ? ' (nejčastěji odmítl „' + NF.LEVERS[worst].label + '“)' : '') + '. Podle schváleného postupu jde jídlo před dávkou.',
        weak: [], item: 'D-PRAND' }, 'prandAdviceFirst', { lever: NF.LEVERS[worst].label }));
      return;
    }
    out.push(withPostup({ id: 'PR-' + meal.toUpperCase(), kind: 'dose', dose: meal, cat: 'davka', priority: 2, title: 'Posoudit prandiální dávku ' + NF.mealLabel(meal, 'ke') + ' — hodnoty nad cílem',
      why: above.length + ' z ' + eps.length + ' ' + NF.mealLabel(meal) + ' za ' + winDays + ' dní s obvyklou porcí a potvrzenou dávkou mělo vrchol glukózy po jídle nad ' + NF.mmol(t.high) + ' mmol/l (medián vrcholu ' + NF.mmol(medPeak) + '), i když pacient ' + acceptedAdvice.length + '× přijal radu k jídlu.',
      breakdown: breakdown, context: bal, weak: heteroWeak.concat(excluded ? [excludedText] : []), excluded: excludedList,
      item: 'D-PRAND' }, 'prandHigh', { meal: NF.mealLabel(meal, 'ke'), tirGoal: t.tirGoal }));
  });
  /* --- návyky --- */
  var adv = NF.adviceOutcome(S, planId);
  Object.keys(adv.byLever).forEach(function (l) {
    var b = adv.byLever[l], meta = NF.LEVERS[l];
    if (!NF.usable(S, meta.item)) return; /* zamítnutá položka registru se v reportu nenavrhuje (6. 10. 2026) */
    if (b.offered < 5) return;
    var topR = Object.keys(b.reasons).sort(function (x, y) { return b.reasons[y] - b.reasons[x]; })[0];
    if (b.declined / b.offered >= 0.6) {
      var impractical = topR === 'nothome' || topR === 'taste';
      out.push({ id: 'PR-SWAP-' + l, kind: 'habit', cat: 'plan', priority: 4, lever: l, swapWanted: impractical, title: (impractical ? 'Vyměnit radu „' : 'Probrat radu „') + meta.label + '“',
        why: 'Pacient ji odmítl ' + b.declined + '× z ' + b.offered + (topR ? ', nejčastěji „' + NF.reasonLabel(topR) + '“' : '') + '. ' + (impractical ? 'To ukazuje na nepraktickou radu, ne na neochotu.' : 'Stojí za to zjistit proč.'),
        weak: [], verify: ['Pacient radu může běžně plnit (má to doma, chutná mu, stihne to)'], branches: [{ when: 'bod 1 sedí', action: 'keep', text: 'ponechat, zkusit znovu' }, { when: 'bod 1 nesedí', action: 'swap', text: 'vyměnit za jinou radu' }], item: 'R-NAVYKY' });
    } else if (b.accepted >= 5) {
      out.push({ id: 'PR-KEEP-' + l, kind: 'habit', cat: 'plan', priority: 5, lever: l, group: 'keep', title: 'Zachovat radu „' + meta.label + '“',
        why: 'Přijata ' + b.accepted + '× z ' + b.offered + '. ' + (b.lower === 'yes' ? 'S radou bývalo níž: medián vrcholu ' + NF.mmol(b.medAcc) + ' vs. ' + NF.mmol(b.medDec) + ' mmol/l (n = ' + b.nAcc + ' / ' + b.nDec + ').' : b.lower === 'few' ? 'Jestli s radou bývalo níž, zatím nelze říct (málo zápisů v jedné ze skupin).' : 'S radou nebylo níž: medián vrcholu ' + NF.mmol(b.medAcc) + ' vs. ' + NF.mmol(b.medDec) + ' mmol/l (n = ' + b.nAcc + ' / ' + b.nDec + ').'),
        weak: [], verify: ['Pacient má radu běžně po ruce'], branches: [{ when: 'bod 1 sedí', action: 'keep', text: 'ponechat' }], item: 'R-NAVYKY' });
    }
  });
  out.push({ id: 'PR-POKYNY', kind: 'instructions', cat: 'pokyny', priority: 6, group: 'keep', title: 'Osobní pokyny stále platí?',
    why: 'Pokyny z ' + NF.fmtShort(p.issuedAt) + ': ' + NF.plural((p.instructions || []).length, 'pokyn', 'pokyny', 'pokynů') + '. Po změně dávky se mění i pokyn „méně jídla než obvykle“.',
    weak: [], verify: ['Kontakty, hranice hodnot i cíle glukózy odpovídají'], branches: [{ when: 'bod 1 sedí', action: 'keep', text: 'ponechat' }, { when: 'bod 1 nesedí', action: 'edit', text: 'upravit pokyny a cíle' }], item: 'R-POKYNY' });
  if (!NF.usable(S, 'D-POSTUP')) out.forEach(function (pr) { if (pr.postup) { pr.branches = []; pr.postup = null; pr.weak = pr.weak.filter(function (w) { return w.indexOf('D-POSTUP') < 0; }); pr.weak.push('postup posouzení dávky (D-POSTUP) není schválen — větev nelze ukázat, rozhodněte sami'); } });
  out.sort(function (a, b) { return a.priority - b.priority; });
  return out;
};
/* Návrhy „beze změny“ tvoří jednu kartu; ostatní se rozhodují jeden po druhém. */
NF.proposalIsSingle = function (S, pr) { return !pr.group || !!(S.review && S.review.single && S.review.single[pr.id]); };
NF.nextProposal = function (S) { var r = S.review; if (!r) return null; return r.proposals.filter(function (pr) { return !r.decisions[pr.id] && NF.proposalIsSingle(S, pr); })[0] || null; };
NF.HABIT_OF = { walk: 'H-PROCHAZKA' }; /* rada svázaná s návykem plánu */
NF.swapOptions = function (S, pr) {
  var r = S.review, off = (NF.planAdvice(S).off || []).slice();
  if (r) r.proposals.forEach(function (x) { var d = r.decisions[x.id]; if (d && d.choice === 'agree' && d.branch === 'swap' && x.lever) off.push(x.lever); if (x.swapWanted && x.lever) off.push(x.lever); /* rada sama navržená k výměně (nepraktická) není náhradou */ });
  return Object.keys(NF.LEVERS).filter(function (l) { return l !== 'portion' && l !== pr.lever && off.indexOf(l) < 0 && NF.usable(S, NF.LEVERS[l].item); });
};
NF.verifyAll = function (S, id) { var r = S.review, pr = r && r.proposals.filter(function (x) { return x.id === id; })[0]; if (!pr) return; r.verify[id] = {}; pr.verify.forEach(function (_, i) { r.verify[id][i] = true; }); };
NF.keepAll = function (S) {
  var r = S.review; if (!r) return { ok: false };
  var p = NF.activePlan(S), doseChanged = !!p && Object.keys(r.newDoses).some(function (k) { return p.doses[k] && r.newDoses[k].units !== p.doses[k].units; });
  if (doseChanged) { r.single = r.single || {}; r.single['PR-POKYNY'] = true; } /* po změně dávky se pokyny potvrzují zvlášť */
  r.proposals.forEach(function (pr) { if (pr.group && !r.decisions[pr.id] && !NF.proposalIsSingle(S, pr)) { NF.verifyAll(S, pr.id); NF.decideProposal(S, pr.id, { choice: 'keep', branch: 'keep' }); } });
  return { ok: true };
};

/* Report = souhrn + návrhy, sestavený jednou na začátku kontroly a zapsaný do stopy. */
NF.startReview = function (S, catalog) {
  var p = NF.activePlan(S); if (!p) return { ok: false, error: 'Není plán.' };
  var props = NF.proposals(S, p.id, catalog);
  S.review = { planId: p.id, startedAt: S.clock, step: 1, index: 0, summary: NF.summary(S, p.id), proposals: props, decisions: {}, verify: {}, newDoses: NF.clone(p.doses), newInstructions: NF.clone(p.instructions || []), newTargets: NF.clone(p.targets || NF.defaultTargets(S)) };
  NF.log(S, 'kontrola.zahajena', p.id, { summary: S.review.summary, proposals: props.map(function (x) { return { id: x.id, title: x.title, item: x.item }; }) });
  return { ok: true };
};
NF.decideProposal = function (S, id, decision) {
  var r = S.review; if (!r) return { ok: false, error: 'Kontrola není zahájená.' };
  var pr = r.proposals.filter(function (x) { return x.id === id; })[0]; if (!pr) return { ok: false, error: 'Návrh nenalezen.' };
  if (S.role !== 'doctor') return { ok: false, error: 'Rozhoduje lékař.' };
  r.decisions[id] = { choice: decision.choice, reason: decision.reason || null, comment: decision.comment || '', at: S.clock, branch: decision.branch || null, units: decision.units != null ? decision.units : null, swapTo: decision.swapTo || null, againstBranch: !!decision.againstBranch };
  if (pr.kind === 'dose' && (decision.choice === 'agree' || decision.choice === 'other') && decision.units != null) r.newDoses[pr.dose].units = decision.units;
  NF.log(S, 'navrh.rozhodnut', id + ' → ' + decision.choice, r.decisions[id]);
  var i = r.proposals.indexOf(pr);
  if (i === r.index && r.index < r.proposals.length - 1) r.index++;
  return { ok: true };
};
/* Kontrola je uzavřená, když pacient převzal plán, který z ní vzešel; další kontrola pak začíná znovu. */
NF.reviewClosed = function (S) { var r = S.review, p = NF.activePlan(S); return !!(r && r.planIssued && p && p.id === r.planIssued && p.understood); };
NF.reviewComplete = function (S) { var r = S.review; return !!r && r.proposals.every(function (p) { return r.decisions[p.id]; }); };
/* Nový plán z rozhodnutí kontroly (dávky, návyky, rady, pokyny) — stejný výpočet pro náhled i vydání. */
NF.planFromReview = function (S) {
  var r = S.review, prev = NF.activePlan(S); if (!r || !prev) return null;
  var d = NF.newDraft(S);
  d.doses = NF.clone(r.newDoses); d.instructions = NF.clone(r.newInstructions || prev.instructions); d.targets = NF.clone(r.newTargets || prev.targets);
  d.habits = prev.habits.slice(); d.advice = NF.clone(NF.planAdvice(S, prev)); d.medicationChecked = true; d.instructionsChecked = true;
  var habitOf = NF.HABIT_OF;
  r.proposals.forEach(function (pr) {
    var dec = r.decisions[pr.id]; if (!dec) return;
    var swapped = null;
    if (pr.lever && (dec.choice === 'agree' || dec.choice === 'other') && dec.branch === 'swap') {
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
    /* Věty pro pacienta se skládají z výsledku, ne z názvů návrhů (6. 10. 2026). */
    var subj = pr.kind === 'dose' ? (pr.dose === 'basal' ? 'Bazál na noc' : 'Inzulin ' + NF.mealLabel(pr.dose, 'ke')) : pr.lever ? 'Rada „' + NF.LEVERS[pr.lever].label + '“' : pr.kind === 'instructions' ? 'Pokyny a cíle' : 'Plán';
    var txt;
    if ((dec.choice === 'agree' || dec.choice === 'other') && dec.units != null) txt = 'lékař nastavil ' + dec.units + ' j. (dřív ' + prev.doses[pr.dose].units + ' j.)';
    else if (swapped) txt = 'lékař ji nahradil radou „' + NF.LEVERS[swapped].label + '“';
    else if (dec.branch === 'swap' && dec.choice === 'agree') txt = 'lékař ji vypnul';
    else if (dec.branch === 'edit' && dec.choice === 'agree') txt = 'lékař je upravil; najdete je v Bezpečí a v Plánu';
    else if (dec.choice === 'reject') txt = 'lékař návrh aplikace zamítl, nic se nemění';
    else txt = 'beze změny';
    d.decisions.push({ id: pr.id, title: subj, text: txt });
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
