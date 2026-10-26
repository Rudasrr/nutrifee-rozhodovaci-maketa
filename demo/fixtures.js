/* Modelová data a příběh. Součást prezentační vrstvy – produkce tento soubor nezahrnuje.
   Registr (položky ke schválení; maketa se chová, jako by byly schválené), katalogy, ~200 českých jídel, simulovaný senzor, kapitoly. */
(function (global) {
'use strict';
var NF = global.NutriFee;
var D = global.NutriFeeDemo = global.NutriFeeDemo || {};

var T0 = '2026-09-28T10:00:00'; /* modelové schválení registru garantem */
D.hba1c = [62, 55];

/* ---------- schvalovací registr ---------- */
/* Položky registru, katalogy a jídla jsou od 18. 10. 2026 v jádru (app/data/); ukázka k položkám jen připojí průvodce. */

/* ---------- katalog návyků ---------- */
D.habitCatalog = NF.habitCatalog(); D.instructionCatalog = NF.instructionCatalog(); /* aliasy pro ukázku a testy */
D.patientContext = [
  ['Diagnóza', 'Diabetes 2. typu, 9 let'],
  ['Léčba', 'Jen inzulin – bazál 1× večer, prandiální ke třem jídlům, pevné dávky'],
  ['Perorální antidiabetika', 'žádná'],
  ['Senzor', 'kontinuální monitor glukózy (CGM) nosí od srpna 2026'],
  ['Senzor před zařazením', 'za posledních 30 dní: čas v cíli 58 %, pod 3,9 mmol/l 3 %'],
  ['Poslední HbA1c', '62 mmol/mol (23. 9. 2026)'],
  ['Věk, výška, hmotnost', '58 let · 176 cm · 92 kg (BMI 29,7)']
];

/* ---------- jídla ----------
   ~200 českých jídel a hotovek se štítky. Syntetické; skutečný zdroj vybere studie. */
D.foods = NF.data.foods;

/* ---------- simulovaný senzor ----------
   Deterministický: vrchol podle reaktivity jídla, porce, přijaté rady, nemoci, potvrzení dávky. */
var REACT = { smazene: 1.1, varene: 1.0, studene: 0.9, knedlik: 1.2, pecivo: 1.1, brambory: 1.0, ryze: 1.05, testoviny: 1.0, bez: 0.75, velke: 1.15, bezne: 1, male: 0.8 };
var LEVER_EFF = { addon: -1.4, order: -0.9, walk: -1.1 };
function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h; }
D.reactivity = function (food) {
  if (food.react != null) return food.react;
  var t = food.tags || {};
  return 3.4 * (REACT[t.prep] || 1) * (REACT[t.side] || 1) * (REACT[t.size] || 1);
};
function curve(S, food, portion, lever, k, ctx) {
  var rise = D.reactivity(food) + (portion === 'bigger' ? 1.4 : portion === 'smaller' ? -1.1 : 0) + (lever ? LEVER_EFF[lever] || 0 : 0) + (((k * 37) % 7) - 3) * 0.12;
  if (ctx === 'illness') rise += 1.6;
  if (ctx === 'lowdose') rise += 1.2;
  if (ctx === 'nodose') rise += 3.0;
  var base = 6.4 + ((k * 13) % 5) * 0.15 + (ctx === 'illness' ? 1.2 : 0);
  var v = [base, base + 0.55 * rise, base + rise, base + 0.8 * rise, base + 0.5 * rise].map(function (x) { return Math.round(x * 10) / 10; });
  return v;
}
function pts(values, at) { return [0, 30, 60, 90, 120].map(function (m, i) { return { min: m, at: NF.addMin(at, m), mmol: values[i] }; }); }
NF.sensorSource = function (S, draft) {
  var food = NF.foodById(S, draft.foodId), k = S.episodes.length + 1;
  var taken = (draft.advice || []).filter(function (a) { return a.accepted === true && a.lever !== 'portion'; })[0];
  var portionTaken = (draft.advice || []).some(function (a) { return a.lever === 'portion' && a.accepted === true; });
  var ctx = S.illness && S.illness.active ? 'illness' : draft.insulin.confirmed === 'none' ? 'nodose' : (draft.insulin.confirmed === 'other' && draft.insulin.units < (NF.activePlan(S).doses[draft.meal].units)) ? 'lowdose' : null;
  return { points: pts(curve(S, food, portionTaken ? 'usual' : draft.portion, taken && taken.lever, k, ctx), draft.at), importedAt: NF.addMin(draft.at, 130) };
};
/* „Aplikace senzoru“ v ukázce: co by pacient viděl v grafu (nejvyšší hodnota) a ukázkový export csv pro zápisy bez průběhu + noci. Jádro žádný senzor nevolá. */
D.sensorPeak = function (S, ep) { var src = NF.sensorSource(S, { foodId: ep.foodId, advice: ep.advice, portion: ep.portionPlanned, insulin: ep.insulin, meal: ep.meal, at: ep.at }); return Math.max.apply(null, src.points.map(function (p) { return p.mmol; })); };
/* Ukázkový export za posledních 14 dní před kontrolou (02 #1, 25. 10. 2026): z tohoto souboru vzniká přes jádro (NF.sensorSummaryFrom)
   souhrn ze senzoru v kontrole a tentýž soubor nahraje tlačítko „Použít ukázkový export“. Deterministický: 5minutová měření, výpadek
   při výměně senzoru a drobné mezery (dostupnost 91 %), dvě noci s poklesem pod 3,9 (2 %), výška vrcholů po jídle dopočtená tak, aby čas nad
   cílem byl 26 % (rady přijímá) nebo 37 % (jinak). Čísla v příběhu: čas v cíli 72 % / 61 %, pod 3,9 2 %, dostupnost 91 %. */
D.EXPORT_FROM = '2026-12-22'; D.EXPORT_DAYS = 14; D.REVIEW_DAY = '2027-01-05';
var periodCache = {};
D.periodCsv = function (B) {
  var key = B && B.response === 'accepts' ? 'accepts' : 'other'; if (periodCache[key]) return periodCache[key];
  var aboveTarget = key === 'accepts' ? 26 : 37, n = Math.round(0.91 * D.EXPORT_DAYS * 288), slots = [];
  for (var d = 0; d < D.EXPORT_DAYS; d++) for (var i = 0; i < 288; i++) if (!(d === 6 && i >= 108 && i < 252)) slots.push([d, i * 5]); /* výměna senzoru 28. 12. 9:00–21:00 */
  var drop = slots.length - n, keep = []; /* drobné mezery rovnoměrně */
  for (var j = 0, k = 0; j < slots.length; j++) { if (k < drop && j === Math.floor((k + 0.5) * slots.length / drop)) { k++; continue; } keep.push(slots[j]); }
  var meals = [425, 750, 1110];
  var val = function (s, mult) {
    var d = s[0], m = s[1], v = 6.2 + 0.5 * Math.sin(2 * Math.PI * (m - 300) / 1440);
    meals.forEach(function (t, mi) { var dt = m - t; if (dt >= 0 && dt <= 240) v += (3 + 1.6 * ((d * 7 + mi * 3) % 5) / 4) * mult * (dt / 60) * Math.exp(1 - dt / 60); });
    if ((d === 3 || d === 9) && m >= 120 && m < 120 + 37 * 5) v = 3.6 + 0.1 * ((m / 5) % 3); /* dvě noci s poklesem pod 3,9, nikdy pod 3,0 */
    return Math.round(v * 10) / 10;
  };
  var count = function (mult) { return keep.filter(function (s) { return val(s, mult) > 10; }).length; };
  var lo = 0.5, hi = 3; for (var it = 0; it < 40; it++) { var mid = (lo + hi) / 2; if (Math.round(count(mid) / n * 100) < aboveTarget) lo = mid; else hi = mid; }
  var mult = hi, p2 = function (x) { return ('0' + x).slice(-2); };
  var rows = keep.map(function (s) {
    var iso = NF.day(NF.addDays(D.EXPORT_FROM + 'T12:00:00', s[0]));
    return 'DEMO,0000,' + iso.slice(8, 10) + '-' + iso.slice(5, 7) + '-' + iso.slice(0, 4) + ' ' + p2(Math.floor(s[1] / 60)) + ':' + p2(s[1] % 60) + ',0,' + val(s, mult) + ',';
  });
  periodCache[key] = 'Glucose Data,Generated on 05-01-2027 08:50,Generated by DEMO\nDevice,Serial Number,Device Timestamp,Record Type,Historic Glucose mmol/L,Scan Glucose mmol/L\n' + rows.join('\n');
  return periodCache[key];
};
/* Na kontrole (od dne kontroly, dokud platí P1) je ukázkový export týž soubor, ze kterého je souhrn; dřív export k zápisům bez průběhu. */
D.periodExportNow = function (S) { var p = NF.activePlan(S); return NF.day(S.clock) >= D.REVIEW_DAY && !!p && !p.previousId; };
D.demoCsv = function (S) {
  if (D.periodExportNow(S)) return D.periodCsv(S.branches);
  var rows = [], days = {};
  function ts(iso) { return iso.slice(8, 10) + '-' + iso.slice(5, 7) + '-' + iso.slice(0, 4) + ' ' + iso.slice(11, 16); }
  S.episodes.forEach(function (ep) {
    if (NF.hasImport(ep)) return;
    var v = NF.sensorSource(S, { foodId: ep.foodId, advice: ep.advice, portion: ep.portionPlanned, insulin: ep.insulin, meal: ep.meal, at: ep.at }).points.map(function (p) { return p.mmol; });
    var seq = v.concat([NF.r1(v[4] - 0.4), NF.r1(v[4] - 0.7)]);
    [0, 30, 60, 90, 120, 150, 180].forEach(function (m, i) { rows.push([NF.addMin(ep.at, m), seq[i]]); });
    days[String(ep.at).slice(0, 10)] = 1;
  });
  Object.keys(days).forEach(function (d) { if (S.nights.some(function (n) { return n.date === d; })) return; for (var h = 0; h <= 6; h++) rows.push([d + 'T0' + h + ':00:00', NF.r1(5.4 + 0.12 * h)]); });
  if (!rows.length) return null;
  rows.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
  return 'Glucose Data,Generated on 13-10-2026 10:15,Generated by DEMO\nDevice,Serial Number,Device Timestamp,Record Type,Historic Glucose mmol/L,Scan Glucose mmol/L\n' + rows.map(function (r) { return 'DEMO,0000,' + ts(r[0]) + ',0,' + r[1] + ','; }).join('\n');
};
D.importDemoApply = function (S) { var csv = D.demoCsv(S); if (csv) NF.importReadings(S, NF.parseSensorCsv(csv)); };
NF.demoActions = NF.demoActions || {};
NF.demoActions.importDemo = function () { var S = NF.getState(), csv = D.demoCsv(S); if (!csv) return; NF.actions.importText(csv); };
NF.slots.importDemo = function () { return '<div class="actions mt-2"><button type="button" class="btn sm" data-action="importDemo">Použít ukázkový export ze senzoru</button><span class="small muted">DEMO: soubor vytvoří ukázka místo aplikace senzoru</span></div>'; };

/* ---------- pomocníci příběhu ---------- */
function foodByName(S, name) { return S.foods.filter(function (f) { return f.name === name; })[0]; }
function ep(S, spec) {
  var f = spec.food.id ? spec.food : foodByName(S, spec.food);
  var p = NF.activePlan(S), meal = spec.meal || 'breakfast';
  var advice = (spec.advice || []).map(function (a) { return { lever: a.lever, item: NF.LEVERS[a.lever].item, accepted: a.accepted === undefined ? null : a.accepted, reason: a.reason || null }; });
  var taken = advice.filter(function (a) { return a.accepted === true && a.lever !== 'portion'; })[0];
  var portionTaken = advice.some(function (a) { return a.lever === 'portion' && a.accepted === true; });
  var portion = portionTaken ? 'usual' : (spec.portion || 'usual');
  var dose = p.doses[meal], snack = NF.isSnack(meal);
  var confirmed = snack ? 'snack' : (spec.insulin || 'as'), units = snack ? null : confirmed === 'as' ? dose.units : confirmed === 'other' ? (spec.units || dose.units - 2) : null;
  var k = hash(spec.at + f.id);
  var ctx = spec.context || (confirmed === 'none' ? 'nodose' : confirmed === 'other' && units < dose.units ? 'lowdose' : null);
  var v = curve(S, f, portion, taken && taken.lever, k, ctx === 'illness' ? 'illness' : ctx);
  if (spec.gap) v = [v[0], v[1], null, null, null];
  if (spec.low) v = [5.2, 4.4, 3.6, 3.4, 4.1];
  var e = { id: spec.id || NF.uid('E'), planId: p.id, meal: meal, foodId: f.id, at: spec.at, recordedAt: spec.at, portionPlanned: spec.portion || 'usual', portion: portion, bolusAtAdvice: spec.bolus || 'as',
    insulin: { prescribed: dose ? dose.units : null, confirmed: confirmed, units: units, time: confirmed === 'none' || confirmed === 'unknown' || snack ? null : NF.fmtTime(NF.addMin(spec.at, -(spec.offset || 5))) },
    doseKey: NF.doseKey(S, meal), advice: advice, context: spec.context || null, points: pts(v, spec.at), importedAt: NF.addMin(spec.at, 130) };
  if (spec.manual) { e.points = []; e.importedAt = null; e.manual = { before: spec.manual.before, peak: spec.manual.peak != null ? spec.manual.peak : null, peakAt: spec.manual.peak != null ? NF.addMin(spec.at, 125) : null }; } /* opsané hodnoty místo importu */
  e.peak = NF.epPeak(S, e); e.rise = NF.epRise(S, e); e.at2h = NF.at2h(e.points);
  if (S.episodes.some(function (x) { return x.id === e.id; })) return e;
  /* V05 (21. 10. 2026): stopa nese skutečného aktéra (pacient) a čas zápisu, ne roli a hodiny scény, ve které se data generují */
  var saveClock = S.clock, hadActor = 'actor' in S, saveActor = S.actor; S.clock = spec.at; S.actor = 'patient';
  if (advice.length) NF.log(S, 'rada.zobrazena', f.name, { level: NF.confidence(S, f.id).level, items: advice.map(function (a) { return { lever: a.lever, item: a.item }; }), bolus: e.bolusAtAdvice, portion: e.portionPlanned });
  S.episodes.push(e);
  NF.log(S, 'jidlo.zapsano', e.id + ' ' + f.id, { meal: meal, portion: e.portion, insulin: e.insulin, advice: advice, context: e.context });
  NF.checkMilestones(S);
  S.clock = saveClock; if (hadActor) S.actor = saveActor; else delete S.actor;
  return e;
}
/* S7 (21. 10. 2026): bazál ve 21:05 se zapíše, jen když už podle hodin scény nastal; dny, které scéna přeskočila, doplní pozdější volání
   (od posledního zápisu po zadaný den). Dnešní večerní bazál tak ve ranní scéně není „potvrzený“ dopředu. */
function basalOne(S, date, confirmed, units) {
  var p = NF.activePlan(S), at = date + 'T21:05:00';
  if (at > S.clock || S.basalLog.some(function (b) { return b.date === date; })) return;
  S.basalLog.push({ at: at, date: date, prescribed: p.doses.basal.units, confirmed: confirmed || 'as', units: units != null ? units : (confirmed === 'none' ? null : p.doses.basal.units), time: '21:05' });
}
function basal(S, date, confirmed, units) {
  var last = S.basalLog.map(function (b) { return b.date; }).sort().pop(), p = NF.activePlan(S);
  var from = last ? NF.day(NF.addDays(last + 'T12:00:00', 1)) : (p && p.effectiveFrom ? NF.day(p.effectiveFrom) : date);
  for (var d = from; d < date; d = NF.day(NF.addDays(d + 'T12:00:00', 1))) basalOne(S, d);
  basalOne(S, date, confirmed, units);
}
/* P31: milník se ukáže jednou; v další scéně už je viděný (výsledky jídel se tím neoznačují) */
function milestonesSeen(S) { ((S.fb && S.fb.milestones) || []).forEach(function (m) { m.seen = true; }); }
function night(S, date, fasting, min) {
  if (S.nights.some(function (n) { return n.date === date; })) return;
  S.nights.push({ date: date, fasting: fasting, min: min });
}
/* Dlouhá řada listopad–prosinec podle odbočky „jak pacient s radami naložil“. */
function series(S, B) {
  if (S.episodes.some(function (x) { return x.id === 'E60'; })) return;
  var start = '2026-10-24', bf = ['Ovesná kaše s mlékem a banánem', 'Chléb se sýrem a zeleninou', 'Ovesná kaše s mlékem a banánem', 'Müsli s jogurtem a medem', 'Ovesná kaše s mlékem a banánem', 'Müsli s jogurtem a medem', 'Ovesná kaše s mlékem a banánem'];
  var lu = ['Smažený řízek s bramborovou kaší', 'Kuřecí maso na kari s rýží', 'Svíčková na smetaně s knedlíkem', 'Špagety boloňské', 'Pečené kuře s bramborem', 'Čočka na kyselo s vejcem', 'Bramboračka'];
  var di = ['Grilovaný losos se zeleninou', 'Chléb se sýrem a zeleninou', 'Pizza šunková', 'Zeleninový salát s kuřecím', 'Kebab v pitě', 'Těstovinový salát', 'Chlebíčky s vlašským salátem'];
  var reasons = B.response === 'impractical' ? ['nothome', 'nothome', 'taste'] : ['nowant', 'time', 'nowant'];
  for (var d = 0; d < 72; d++) {
    var date = NF.day(NF.addDays(start + 'T07:00:00', d)), r = (d * 7 + 3) % 10;
    var accept = B.response === 'accepts' ? r < 7 : r < 2, reason = reasons[d % 3];
    var portion = d % 9 === 4 ? 'bigger' : 'usual', ins = d % 13 === 6 ? 'other' : d % 23 === 11 ? 'unknown' : 'as';
    var b = bf[d % 7], strong = b.indexOf('kaše') >= 0 || b.indexOf('Müsli') >= 0;
    var adv = [];
    if (portion === 'bigger') adv.push({ lever: 'portion', accepted: true });
    if (strong) { adv.push({ lever: 'addon', accepted: accept, reason: accept ? null : reason }); adv.push({ lever: 'order', accepted: accept ? null : false, reason: accept ? null : reason }); }
    ep(S, { id: 'E' + (60 + d * 3), food: b, meal: 'breakfast', at: date + 'T07:' + (d % 2 ? '10' : '05') + ':00', portion: portion, insulin: ins, advice: adv, bolus: 'before' });
    var l = lu[d % 7];
    ep(S, { id: 'E' + (61 + d * 3), food: l, meal: 'lunch', at: date + 'T12:30:00', insulin: 'as', advice: l.indexOf('knedl') >= 0 || l.indexOf('řízek') >= 0 ? [{ lever: 'order', accepted: accept, reason: accept ? null : reason }] : [] });
    var dn = di[d % 7];
    ep(S, { id: 'E' + (62 + d * 3), food: dn, meal: 'dinner', at: date + 'T18:30:00', insulin: 'as', advice: dn.indexOf('Pizza') >= 0 || dn.indexOf('Kebab') >= 0 ? [{ lever: 'walk', accepted: B.response === 'accepts' ? d % 2 === 0 : false, reason: 'time' }] : [] });
    basal(S, date, d % 17 === 9 ? 'other' : 'as', d % 17 === 9 ? 16 : undefined);
    night(S, date, Math.round((6.1 + ((d * 11) % 7) * 0.25) * 10) / 10, Math.round((4.6 + ((d * 5) % 6) * 0.2) * 10) / 10);
  }
  ep(S, { id: 'E900', food: 'Smažený řízek s bramborovou kaší', meal: 'lunch', at: '2026-12-20T12:30:00', insulin: 'as', advice: [{ lever: 'order', accepted: true }] });
  S.sensorSummary = NF.sensorSummaryFrom(S, NF.parseSensorCsv(D.periodCsv(B))); /* souhrn z ukázkového exportu přes jádro (02 #1, 25. 10. 2026) */
}

/* Rozhodne návrhy, které se rozhodují jednotlivě, podle větve postupu (v odbočce „nemám to doma“ ověření nesedí → výměna rady). */
D.decideSingles = function (S, B) {
  var r = S.review;
  r.proposals.forEach(function (pr) {
    if (r.decisions[pr.id] || !NF.proposalIsSingle(S, pr)) return;
    NF.verifyAll(S, pr.id);
    pr.verify.forEach(function (_, i) { if (r.verify[pr.id][i] === undefined) r.verify[pr.id][i] = true; }); /* bod „data říkají jinak“ posoudí v ukázce lékař sám jako „sedí“ (LF-06) */
    if (B.response === 'impractical' && pr.lever && (/^Vyměnit/.test(pr.title) || /-RADY$/.test(pr.id))) r.verify[pr.id][0] = false;
    var br = NF.screens.proposalBranch(S, pr), dec = { choice: br && (br.action === 'up' || br.action === 'down' || br.action === 'swap') ? 'agree' : 'keep', branch: br && br.action };
    if (pr.kind === 'dose' && dec.choice === 'agree') { r.newDoses[pr.dose].units += br.action === 'up' ? 2 : -2; dec.units = r.newDoses[pr.dose].units; }
    if (br && br.action === 'swap') dec.swapTo = NF.swapOptions(S, pr)[0] || null;
    NF.decideProposal(S, pr.id, dec);
  });
};

/* ---------- odbočky ---------- */
D.branches = {
  training: { label: 'Zaučení u sestry', from: 'training', options: [{ id: 'done', label: 'Zaučení proběhlo' }, { id: 'failed', label: 'Zaučení se nezdařilo – návyky nezačnou platit' }] },
  bolus: { label: 'Scéna „po píchnutí“: co si pacient chystá', from: 'afterBolus', options: [{ id: 'bigger', label: 'Větší porci → rada zpět k obvyklé' }, { id: 'smaller', label: 'Menší porci → žádná rada k množství, jen pokyn lékaře' }, { id: 'unknown', label: 'Neví, jestli si píchl → jako po píchnutí' }] },
  response: { label: 'Jak pacient s radami naložil (listopad–prosinec)', from: 'preview', options: [{ id: 'accepts', label: 'Většinou přijal' }, { id: 'declines', label: 'Většinou nepřijal – „nechci“, „nebyl čas“' }, { id: 'impractical', label: 'Většinou nepřijal – „nemám to doma“' }] }
};
D.defaults = { training: 'done', bolus: 'bigger', response: 'accepts' };

/* ---------- společný start ---------- */
function setup(S) {
  S.clock = '2026-10-05T09:00:00';
  NF.seed(S, T0, 'DEMO-L01'); /* registr a jídla z jádra; modelové schválení garantem k T0 */
  S.registry.items.forEach(function (r) { r.guide = (D.guide && D.guide[r.id]) || null; }); /* pětidílný průvodce položkou (demo/guide.js) */
  S.patient.hba1c = D.hba1c.slice();
  S.enrollment.baseline = { tir: D.cardBaseline.tir, below: D.cardBaseline.below }; /* z reportu senzoru před zařazením; lékař hodnoty při zařazení potvrdí nebo upraví voličem */
}
function enrolled(S) { NF.ELIGIBILITY.forEach(function (c) { NF.setEligibility(S, c[0], true); }); }
D.cardBaseline = { tir: 58, below: 3 }; /* čas v cíli a čas pod 3,9 mmol/l ze senzoru za 30 dní před zařazením (vlastník 26. 10. 2026: delší období, bez data) */
D.cardDoses = { basal: 18, breakfast: 8, lunch: 10, dinner: 8 }; /* dávky z karty modelového pacienta; v aplikaci je zadává lékař voličem */
D.cardEligibility = ['adult', 'insulinOnly', 'regimen', 'cgm']; /* co karta pacienta dokládá; lékař přesto každou podmínku potvrdí */
function draftReady(S) {
  if (!S.draft) S.draft = NF.newDraft(S);
  var d = S.draft;
  Object.keys(D.cardDoses).forEach(function (k) { if (!d.doses[k].units) d.doses[k].units = D.cardDoses[k]; });
  if (!d.habits.length) d.habits = D.habitCatalog.filter(function (h) { return h.default; }).map(function (h) { return h.id; });
  if (!d.instructions.length) D.instructionCatalog.filter(function (i) { return i.default; }).forEach(function (i) { d.instructions.push({ id: i.id, value: i.value }); });
}
function issued(S) {
  draftReady(S); S.draft.medicationChecked = true; S.draft.instructionsChecked = true;
  S.role = 'doctor'; NF.issuePlan(S, D.habitCatalog); NF.handover(S);
  S.training = { result: null, steps: {}, previewPage: 'today' };
}
function trained(S, B) {
  S.role = 'nurse';
  NF.trainingItems(S).forEach(function (t) { S.training.steps[t.id] = true; });
  if (B.training === 'failed') { S.training.steps.contacts = false; NF.finishTraining(S, 'failed'); }
  else NF.finishTraining(S, 'done');
}
function understood(S) { S.role = 'patient'; S.onboarding.checkAnswer = 'no'; NF.confirmUnderstanding(S); }
function freshMeal(S, meal, food, portion, bolus) {
  var p = NF.activePlan(S); var f = food ? foodByName(S, food) : null;
  S.meal = { step: bolus ? (f ? 3 : 2) : 1, meal: meal, bolus: bolus || null, units: p.doses[meal].units, offset: '0', q: f ? f.name : '', foodId: f ? f.id : null, portion: portion || null, decisions: {}, reasons: {}, newFood: null, before: bolus ? 7 : null, beforeAsked: !!bolus };
}

/* ---------- kapitoly ----------
   setup = kulisy scény (platí při příchodu), apply = akce, která se ve scéně odehraje. */
var CH = [
  { id: 'prolog', act: 0, title: 'Úvod – k čemu NutriFee je a jak ukázku ovládat', role: 'doctor', page: 'intro', wizardStep: 0, at: '2026-10-05T09:00:00' }, /* 12. 10. 2026: úvodní obrazovka v obsahu (demo/intro.js); karta pacienta začíná až scénou 2 */
  /* Scénář 1 – V ordinaci */
  { id: 'enroll', act: 1, title: 'Lékař – karta a podmínky zařazení', role: 'doctor', page: 'enroll', wizardStep: 0, at: '2026-10-05T09:00:00',
    setup: function (S) { S.draft = S.draft || NF.newDraft(S); }, apply: function (S) { enrolled(S); } },
  { id: 'doses', act: 1, title: 'Lékař – dávky, startovní návyky a pokyny', role: 'doctor', page: 'enroll', wizardStep: 1, at: '2026-10-05T09:10:00',
    setup: function (S) { draftReady(S); }, apply: function (S) { S.draft.medicationChecked = true; S.draft.instructionsChecked = true; } },
  { id: 'issue', act: 1, title: 'Lékař – vydání plánu', role: 'doctor', page: 'enroll', wizardStep: 2, at: '2026-10-05T09:20:00',
    apply: function (S) { issued(S); } },
  { id: 'training', act: 1, title: 'Sestra – zaučení s náhledem telefonu', role: 'nurse', page: 'training', at: '2026-10-05T09:35:00',
    apply: function (S, B) { trained(S, B); } },
  { id: 'handover', act: 1, title: 'Pacient – převzetí plánu a jedna otázka', role: 'patient', page: 'takeover', at: '2026-10-05T09:55:00',
    apply: function (S, B) { if (B.training !== 'failed') understood(S); } },

  /* Scénář 2 – Doma: aplikace se učí */
  { id: 'firstMeal', act: 2, title: 'Pacient – první snídaně ve třech krocích', role: 'patient', page: 'meal', at: '2026-10-06T07:00:00',
    setup: function (S) { freshMeal(S, 'breakfast'); },
    apply: function (S) { ep(S, { id: 'E1', food: 'Ovesná kaše s mlékem a banánem', at: '2026-10-06T07:05:00', bolus: 'before', manual: { before: 7 } }); basal(S, '2026-10-05'); basal(S, '2026-10-06'); S.meal = null; } },
  { id: 'firstResult', act: 2, title: 'Pacient – před obědem: nejvyšší hodnota po snídani', role: 'patient', page: 'meal', at: '2026-10-06T12:10:00',
    setup: function (S) { freshMeal(S, 'lunch'); },
    apply: function (S) { NF.setManualPeak(S, 'E1', 12); NF.setManualLow(S, 'E1', 'no'); S.meal = null; } },
  { id: 'week', act: 2, title: 'Pacient – po týdnu: co už aplikace ví', role: 'patient', page: 'food', at: '2026-10-12T19:00:00',
    setup: function (S) {
      [['E2', 'Chléb se sýrem a zeleninou', '2026-10-07T07:05:00', 'as'], ['E3', 'Ovesná kaše s mlékem a banánem', '2026-10-08T07:10:00', 'as'], ['E4', 'Ovesná kaše s mlékem a banánem', '2026-10-09T07:00:00', 'as'], ['E5', 'Chléb se sýrem a zeleninou', '2026-10-10T07:05:00', 'as'], ['E6', 'Ovesná kaše s mlékem a banánem', '2026-10-11T07:00:00', 'as'], ['E7', 'Chléb se sýrem a zeleninou', '2026-10-12T07:05:00', 'as']]
        .forEach(function (x) { ep(S, { id: x[0], food: x[1], at: x[2], insulin: x[3] }); });
      [['E2b', 'Kuřecí maso na kari s rýží', '2026-10-07T12:30:00'], ['E3b', 'Svíčková na smetaně s knedlíkem', '2026-10-08T12:30:00'], ['E4b', 'Smažený řízek s bramborovou kaší', '2026-10-09T12:30:00'], ['E5b', 'Smažený řízek s bramborovou kaší', '2026-10-10T12:30:00'], ['E6b', 'Smažený řízek s bramborovou kaší', '2026-10-11T12:30:00'], ['E7b', 'Smažený řízek s bramborovou kaší', '2026-10-12T12:30:00']]
        .forEach(function (x) { ep(S, { id: x[0], food: x[1], meal: 'lunch', at: x[2] }); });
      ep(S, { id: 'E1d', food: 'Chléb se sýrem a zeleninou', meal: 'dinner', at: '2026-10-06T18:30:00' }); ep(S, { id: 'E3d', food: 'Chléb se sýrem a zeleninou', meal: 'dinner', at: '2026-10-08T18:30:00' }); /* od 18. 10. 2026 je známé od 4 zápisů; večeře 8 j. = stejná dávka jako snídaně */
      ep(S, { id: 'E4s', food: 'Jablko', meal: 'snack', at: '2026-10-09T15:30:00' }); ep(S, { id: 'E6s', food: 'Jablko', meal: 'snack', at: '2026-10-11T15:40:00' });
      for (var d = 7; d <= 12; d++) basal(S, '2026-10-' + (d < 10 ? '0' + d : d));
      S.foodsSeg = 'known'; S.foodOpen = foodByName(S, 'Ovesná kaše s mlékem a banánem').id;
    } },

  { id: 'lateMeal', act: 2, title: 'Pacient – otevřel aplikaci až v 10:00', role: 'patient', page: 'today', at: '2026-10-13T10:15:00',
    setup: function (S) { basal(S, '2026-10-12'); },
    apply: function (S) { ep(S, { id: 'E7c', food: 'Chléb se sýrem a zeleninou', at: '2026-10-13T07:30:00', bolus: 'retro', advice: [{ lever: 'walk', accepted: true }] }); S.meal = null; } },

  /* Scénář 3 – Rada před jídlem */
  { id: 'advice', act: 3, title: 'Pacient – před píchnutím: porce zpět k obvyklé a doplněk', role: 'patient', page: 'meal', at: '2026-10-14T07:00:00',
    setup: function (S) { milestonesSeen(S); freshMeal(S, 'breakfast', 'Ovesná kaše s mlékem a banánem', 'bigger', 'before'); },
    apply: function (S) { ep(S, { id: 'E8', food: 'Ovesná kaše s mlékem a banánem', at: '2026-10-14T07:05:00', portion: 'bigger', bolus: 'before', advice: [{ lever: 'portion', accepted: true }, { lever: 'addon', accepted: true }, { lever: 'order' }] }); basal(S, '2026-10-13'); basal(S, '2026-10-14'); S.meal = null; } },
  { id: 'afterBolus', act: 3, title: 'Pacient – po píchnutí: co aplikace smí a nesmí', role: 'patient', page: 'meal', at: '2026-10-16T07:30:00',
    setup: function (S, B) { milestonesSeen(S); freshMeal(S, 'breakfast', 'Ovesná kaše s mlékem a banánem', B.bolus === 'smaller' ? 'smaller' : 'bigger', B.bolus === 'unknown' ? 'unknown' : 'as'); },
    apply: function (S, B) { if (B.bolus === 'smaller') NF.addHypoWatch(S, 'smaller', 'breakfast', '2026-10-16T07:30:00', 'E9'); ep(S, { id: 'E9', food: 'Ovesná kaše s mlékem a banánem', at: '2026-10-16T07:30:00', portion: B.bolus === 'smaller' ? 'smaller' : 'bigger', bolus: B.bolus === 'unknown' ? 'unknown' : 'as', insulin: B.bolus === 'unknown' ? 'unknown' : 'as', advice: B.bolus === 'smaller' ? [{ lever: 'order', accepted: false, reason: 'nowant' }] : [{ lever: 'portion', accepted: true }, { lever: 'order', accepted: false, reason: 'nowant' }] }); basal(S, '2026-10-15'); basal(S, '2026-10-16'); S.meal = null; } },
  { id: 'custom', act: 3, title: 'Pacient – nové jídlo jen názvem', role: 'patient', page: 'meal', at: '2026-10-18T12:20:00',
    setup: function (S) { milestonesSeen(S); freshMeal(S, 'lunch', null, null, 'before'); S.meal.step = 2; S.meal.q = 'Řízek s kaší od maminky'; },
    apply: function (S) {
      var like = S.foods.filter(function (f) { return f.name === 'Smažený řízek s bramborovou kaší'; })[0];
      var r = NF.addFood(S, 'Řízek s kaší od maminky', { like: like ? like.id : null }, { force: true }); /* „Myslíte Smažený řízek…?“ → Ne, je jiné; „Je to jako…“ → Smažený řízek s bramborovou kaší */
      ep(S, { id: 'E10', food: r.food, meal: 'lunch', at: '2026-10-18T12:30:00', bolus: 'before', advice: [{ lever: 'order', accepted: true }] });
      basal(S, '2026-10-17'); basal(S, '2026-10-18'); S.meal = null;
    } },

  /* Scénář 4 – Nemoc */
  { id: 'illness', act: 4, title: 'Pacient – není mi dobře', role: 'patient', page: 'today', at: '2026-10-20T08:00:00',
    setup: function (S) { for (var d = 19; d <= 20; d++) basal(S, '2026-10-' + d); NF.settleFeedback(S); },
    apply: function (S) { NF.setIllness(S, true); ep(S, { id: 'E11', food: 'Chléb se sýrem a zeleninou', at: '2026-10-20T08:30:00', context: 'illness', advice: [{ lever: 'addon', accepted: true }] }); } },
  { id: 'illnessMeal', act: 4, title: 'Pacient – jídlo během nemoci', role: 'patient', page: 'meal', at: '2026-10-21T08:00:00',
    setup: function (S) { freshMeal(S, 'breakfast', 'Ovesná kaše s mlékem a banánem', 'smaller', 'as'); },
    apply: function (S) { ep(S, { id: 'E12', food: 'Ovesná kaše s mlékem a banánem', at: '2026-10-21T08:05:00', portion: 'smaller', context: 'illness', advice: [{ lever: 'addon' }] }); basal(S, '2026-10-21'); S.meal = null; } },
  { id: 'recovery', act: 4, title: 'Pacient – už je mi lépe', role: 'patient', page: 'today', at: '2026-10-22T07:30:00',
    setup: function (S) { NF.settleFeedback(S); },
    apply: function (S) { NF.illnessCheckin(S, true); basal(S, '2026-10-22'); } },

  /* Scénář 5 – Během studie: garant upraví pravidlo (funkce ostré aplikace; chronologicky uprostřed období, proto před kontrolou) */
  { id: 'registry', act: 5, title: 'Během studie – garant upraví pravidlo po podnětu', role: 'doctor', page: 'registry', at: '2026-10-23T09:00:00',
    setup: function (S) { S.reg = { open: 'R-PORADI', q: '' }; S.impulse = 'Při testu pacient pochopil radu „snězte nejdřív jogurt“ tak, že jogurt nahradí část kaše, a kaši nedojedl – snědl méně sacharidů, než má.'; },
    apply: function (S) {
      S.role = 'doctor';
      var it = NF.item(S, 'R-PORADI'); it.text = 'Snězte nejdřív {first}, potom zbytek obvyklého jídla. Přílohu nevynechávejte – snězte ji jako obvykle.'; it.version = 'v2';
      NF.decideItem(S, 'R-PORADI', 'edited', 'Upřesněn text: příloha se nevynechává.');
      S.reg = null;
    } },
  { id: 'impact', act: 5, title: 'Pacient – rada s novým textem', role: 'patient', page: 'meal', at: '2026-10-24T12:20:00',
    setup: function (S) { freshMeal(S, 'lunch', 'Smažený řízek s bramborovou kaší', 'usual', 'before'); basal(S, '2026-10-23'); },
    apply: function (S) { ep(S, { id: 'E13', food: 'Smažený řízek s bramborovou kaší', meal: 'lunch', at: '2026-10-24T12:30:00', bolus: 'before', advice: [{ lever: 'order', accepted: true }] }); S.meal = null; } },

  /* Scénář 6 – Kontrola */
  { id: 'preview', act: 6, title: 'Pacient – den před kontrolou', role: 'patient', page: 'preview', at: '2027-01-04T18:00:00',
    setup: function (S, B) { series(S, B); if (!S.questions.length) S.questions.push({ id: 'Q1', at: '2027-01-04T18:10:00', text: 'Je v pořádku, že si ke kaši dávám jogurt skoro pokaždé?', suggested: true }); } },
  { id: 'reviewSummary', act: 6, title: 'Lékař – kontrola, krok 1: souhrn', role: 'doctor', page: 'review', at: '2027-01-05T09:00:00',
    apply: function (S) { S.role = 'doctor'; NF.startReview(S, D.habitCatalog); } },
  { id: 'reviewProposals', act: 6, title: 'Lékař – krok 2: návrhy s důvodem a postupem', role: 'doctor', page: 'review', at: '2027-01-05T09:10:00',
    setup: function (S) { if (S.review) S.review.step = 2; },
    apply: function (S, B) {
      S.role = 'doctor';
      D.decideSingles(S, B);
      NF.keepAll(S);
      D.decideSingles(S, B); /* po změně dávky se pokyny potvrzují zvlášť (6. 10. 2026) */
    } },
  { id: 'reviewConfirm', act: 6, title: 'Lékař – krok 3: potvrzení a vydání plánu P2', role: 'doctor', page: 'review', at: '2027-01-05T09:25:00',
    setup: function (S) { if (S.review) S.review.step = 3; },
    apply: function (S) { S.role = 'doctor'; NF.issueFromReview(S, D.habitCatalog); } },
  { id: 'reviewHandover', act: 6, title: 'Lékař – krok 4: předání pacientovi', role: 'doctor', page: 'review', at: '2027-01-05T09:35:00',
    setup: function (S) { if (S.review) S.review.step = 4; } },
  { id: 'newplan', act: 6, title: 'Pacient – nový plán a co se změnilo', role: 'patient', page: 'newplan', at: '2027-01-05T09:40:00',
    apply: function (S) { S.role = 'patient'; NF.confirmUnderstanding(S); } },
  { id: 'trace', act: 6, title: 'Lékař – verze a stopa: důkaz, jak to počítá', role: 'doctor', page: 'trace', at: '2027-01-05T09:50:00' }
];
D.acts = [
  { title: 'Úvod', note: 'K čemu NutriFee je a jak ukázku ovládat.' },
  { title: 'Scénář 1 – V ordinaci', note: 'Lékař projde kartu pacienta a podmínky zařazení, zadá dávky a vydá plán se startovními návyky a pokyny. Sestra pak pacienta zaučí s náhledem jeho telefonu.' },
  { title: 'Scénář 2 – Doma: aplikace se učí', note: 'Pacient zapisuje jídla ve třech krocích a prvním je vždy inzulin. Po týdnu aplikace zná první jídla a ukáže, kam se po nich glukóza dostává.' },
  { title: 'Scénář 3 – Rada před jídlem', note: 'Před píchnutím aplikace radí vrátit porci k obvyklé z větší i z menší, po píchnutí jen z větší. Nové jídlo pacient zadá jen názvem.' },
  { title: 'Scénář 4 – Nemoc', note: 'Pacient označí nemoc a aplikace mu pomáhá dál, jen jinak. Nemoc ukončí zase pacient.' },
  { title: 'Scénář 5 – Během studie: garant upraví pravidlo', note: 'Funkce ostré aplikace, ne vaše dnešní schvalování: během studie jako garant (a lékař studie) upravíte text rady po podnětu z provozu; změna platí okamžitě, bez čekání na kontrolu.' },
  { title: 'Scénář 6 – Kontrola', note: 'Pacient si den předem prohlédne přehled pro lékaře. Lékař projde souhrn a návrhy, potvrdí nový plán a předá ho pacientovi. Na konci je stopa všech výpočtů a rozhodnutí.' }
];
D.chapters = CH;

D.play = function (index, branches) {
  var idx = Math.max(0, Math.min(CH.length - 1, Number(index) || 0));
  var B = {}; Object.keys(D.defaults).forEach(function (k) { B[k] = D.defaults[k]; });
  if (branches) Object.keys(branches).forEach(function (k) { if (branches[k]) B[k] = branches[k]; });
  var S = NF.createState(); NF.resetUid(); S.branches = B; setup(S);
  if (D.beforePlay) D.beforePlay(S); /* rozhodnutí garanta platí dřív, než kapitoly spočítají report a návrhy */
  var stop = B.training === 'failed' ? Math.min(idx, D.indexOf('handover')) : idx; /* bez zaučení příběh končí u převzetí; scéna sestry se ale přehraje jako sestra (7. 10. 2026) */
  var ch = CH[stop];
  NF.muteHooks(function () { /* rozhodnutí odehraná příběhem nejsou rozhodnutí garanta (neukládají se) */
    for (var i = 0; i < stop; i++) { S.clock = CH[i].at; if (CH[i].setup) CH[i].setup(S, B); if (CH[i].apply) CH[i].apply(S, B); }
    S.clock = ch.at; if (ch.setup) ch.setup(S, B);
    if (stop > D.indexOf('handover') && B.training !== 'failed' && NF.activePlan(S)) basal(S, NF.day(S.clock)); /* S7: bazál za všechny minulé večery, dnešní až po 21:05 */
  });
  S.role = ch.role; S.page = ch.page; S.wizardStep = ch.wizardStep != null ? ch.wizardStep : 0;
  S.chapter = ch.id; S.chapterIndex = stop; S.error = '';
  NF.log(S, 'prezentace.kapitola', ch.id + ' · ' + JSON.stringify(B));
  return S;
};
D.indexOf = function (id) { for (var i = 0; i < CH.length; i++) if (CH[i].id === id) return i; return -1; };

/* ---------- scény: lineární řada pro tlačítko Další, odbočky vložené mezi hlavní linii ----------
   Lékař-garant nemusí nic volit: Další projde všechny kapitoly i všechny varianty odboček. */
/* R25 (6. 10. 2026): hlavní linie = prolog → … → finále (stopa a shrnutí); odbočky jsou v dodatku za finále.
   Případy „menší porce“ a „nevím“ po píchnutí jsou kroky scény „po píchnutí“, ne samostatné scény. */
function scene(id, B, title, appendix) { return { ch: D.indexOf(id), B: B || {}, title: title || null, detour: !!B, appendix: !!appendix }; }
D.scenes = [
  scene('prolog'), scene('enroll'), scene('doses'), scene('issue'), scene('training'), scene('handover'),
  scene('firstMeal'), scene('firstResult'), scene('week'), scene('lateMeal'), scene('advice'), scene('afterBolus'),
  scene('custom'), scene('illness'), scene('illnessMeal'), scene('recovery'), scene('registry'), scene('impact'),
  scene('preview'), scene('reviewSummary'), scene('reviewProposals'), scene('reviewConfirm'), scene('reviewHandover'), scene('newplan'),
  scene('trace'),
  scene('training', { training: 'failed' }, 'Dodatek · zaučení se nezdařilo', true),
  scene('handover', { training: 'failed' }, 'Dodatek · bez zaučení plán nezačne platit', true),
  scene('reviewProposals', { response: 'declines' }, 'Dodatek · pacient rady většinou nepřijal: jiné návrhy', true),
  scene('reviewProposals', { response: 'impractical' }, 'Dodatek · „nemám to doma“: výměna rady', true),
  scene('newplan', { response: 'impractical' }, 'Dodatek · „nemám to doma“: co uvidí pacient', true)
];
D.mainSceneCount = function () { return D.scenes.filter(function (s) { return !s.appendix; }).length; };
D.playScene = function (i) {
  var idx = Math.max(0, Math.min(D.scenes.length - 1, Number(i) || 0)), sc = D.scenes[idx];
  var S = D.play(sc.ch, sc.B);
  S.sceneIndex = idx; S.sceneTitle = sc.title || CH[sc.ch].title;
  return S;
};
/* Nejbližší scéna ke kapitole a větvím (pro skoky z panelu prezentujícího). */
D.sceneFor = function (chapterIndex, B) {
  B = B || D.defaults;
  var exact = -1, first = -1;
  D.scenes.forEach(function (sc, i) {
    if (sc.ch !== chapterIndex) return;
    if (first < 0) first = i;
    var all = Object.keys(sc.B).every(function (k) { return B[k] === sc.B[k]; }) && Object.keys(D.branches).every(function (k) { return sc.B[k] ? true : B[k] === D.defaults[k]; });
    if (all && exact < 0) exact = i;
  });
  return exact >= 0 ? exact : first >= 0 ? first : 0;
};

/* Otázky pro garanta podle scénáře (panel prezentujícího). */
D.garantQuestions = [
  [], /* úvod */
  ['Stačí čtyři podmínky zařazení?', 'Je startovní sada návyků správná pro všechny?', 'Jsou připravené věty pokynů úplné?', 'Stačí hrubá denní doba (10:00 / 15:30 / 21:00) k rozlišení, že jídlo už minulo?'],
  ['Je vrchol 0–120 min správná míra reakce?', 'Stačí celá čísla (čipy) místo přesných hodnot ze senzoru a dotaz na minulé jídlo až při dalším jídle?', 'Stačí 4 shodné zápisy (rozdíl do 2,5 mmol/l) pro „známé jídlo“ a dva stupně reakce místo tří?', 'Je správně, že pochvala je jen za snahu a návyk, nikdy za hodnotu glukózy?', 'Jsou milníky (jídlo poznáno, rada zdomácněla, týden bez mezery) ty správné?'],
  ['Je pravidlo „z větší porce zpět k obvyklé i po píchnutí“ bezpečné?', 'Stačí podobnost určená pacientem („podobá se jídlu X“) bez složení?'],
  ['Je správně, že při nemoci neradíme k jídlu vůbec (ani doplněk, pořadí, procházku) a platí jen pokyny lékaře?'],
  ['Kdo smí pravidla měnit mezi kontrolami a jak rychle to pacient uvidí?'],
  ['Jsou prahy návrhů k dávce (okno ≥ 28 dní, ≥ 8 čistých jídel, 2/3 nad cílem, medián > cíl + 0,5) správné?', 'Je postup posouzení D-POSTUP úplný?']
];

})(typeof window !== 'undefined' ? window : globalThis);
