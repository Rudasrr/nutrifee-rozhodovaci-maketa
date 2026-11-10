/* Modelová data a příběh. Součást prezentační vrstvy – produkce tento soubor nezahrnuje.
   Registr (položky ke schválení; maketa se chová, jako by byly schválené), katalogy, 171 českých jídel, simulovaný senzor, kapitoly. */
(function (global) {
'use strict';
var NF = global.NutriFee;
var D = global.NutriFeeDemo = global.NutriFeeDemo || {};
NF.clockModel = true; /* A3 (31/03): hodiny řídí příběh (modelové dny); jádro bez ukázky bere skutečný čas */

var T0 = '2026-09-28T10:00:00'; /* modelové schválení registru garantem */
/* B3 (31/02): HbA1c s datem a původem – při zařazení z karty pacienta (62, odběr 23. 9. 2026); pro kontrolu ho sestra vybere voličem z karty (55, odběr 3. 1. 2027). */
D.HBA_CARD = { v: 62, date: '2026-09-23' }; D.HBA_REVIEW = { v: 55, date: '2027-01-03' };
/* SCHEMA 84 (rozhodnutí vlastníka 4. 11. 2026, bod 6): hmotnost při zařazení z karty (92 kg, 23. 9. 2026) a na kontrole vybraná sestrou (90 kg, 5. 1. 2027; návrh autora). Modelový pacient je muž (volba zdravotního stavu bez těhotenství, 32/02 C8). */
D.WEIGHT_CARD = { kg: 92, date: '2026-09-23' }; D.WEIGHT_REVIEW = { kg: 90, date: '2027-01-05' }; D.PATIENT_SEX = 'm';
/* Noční poklesy v exportu (25. 12. a 1. 1., hlavní linie): pacient je ráno zapsal čipem u snídaně (rozhodnutí vlastníka 1. 11. 2026, bod 7). */
D.NIGHT_LOWS = ['2026-12-25', '2027-01-01'];

/* ---------- schvalovací registr ---------- */
/* Položky registru, katalogy a jídla jsou od 18. 10. 2026 v jádru (app/data/); ukázka k položkám jen připojí průvodce. */

/* ---------- katalog návyků ---------- */
D.habitCatalog = NF.habitCatalog(); D.instructionCatalog = NF.instructionCatalog(); /* aliasy pro ukázku a testy */
D.patientContext = [
  ['Diagnóza', 'Diabetes 2. typu, 9 let'],
  ['Léčba', 'Jen inzulin – bazál 1× večer, prandiální ke třem jídlům, pevné dávky'],
  ['Jiné léky na diabetes', 'žádné (ani tablety, ani GLP-1)'], /* SCHEMA 84: kohorta jen inzulin */
  ['Senzor', 'kontinuální monitor glukózy (CGM) nosí od srpna 2026'],
  ['Senzor před zařazením', 'za posledních 30 dní: čas v cíli 58 %, pod 3,9 mmol/l 3 %'],
  ['Poslední HbA1c', '62 mmol/mol (23. 9. 2026)'],
  ['Věk, výška, hmotnost', '58 let · 176 cm · 92 kg (BMI 29,7)']
];

/* ---------- jídla ----------
   171 českých jídel a hotovek se štítky. Syntetické; skutečný zdroj vybere studie. */
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
function curve(S, food, portion, lever, k, ctx, extra) {
  var rise = D.reactivity(food) + (portion === 'bigger' ? 1.4 : portion === 'smaller' ? -1.1 : 0) + (lever ? LEVER_EFF[lever] || 0 : 0) + (((k * 37) % 7) - 3) * 0.12 + (extra || 0);
  if (ctx === 'illness') rise += 1.6;
  if (ctx === 'lowdose') rise += 1.2;
  if (ctx === 'nodose') rise += 3.0;
  var base = 6.4 + ((k * 13) % 5) * 0.15 + (ctx === 'illness' ? 1.2 : 0);
  var v = [base, base + 0.55 * rise, base + rise, base + 0.8 * rise, base + 0.5 * rise].map(function (x) { return Math.round(x * 10) / 10; });
  return v;
}
/* A1 (závěrečné ověření 1. 11. 2026): od listopadu má modelový pacient po snídani vyšší glukózu u všech snídaní, sladkých i slaných
   (ranní potřeba inzulinu vzrostla – méně pohybu v zimě, přibral). V říjnu, kdy aplikace snídaně poznávala, to tak nebylo. Dávka ke snídani tak přestala stačit
   bez ohledu na jídlo a rady (doplněk se po neúspěších stáhl, procházku pacient zkoušel) – návrh posoudit dávku ke snídani je obhajitelný. Modelová data, ne pravidlo. */
D.MORNING_FROM = '2026-11-01'; D.MORNING_RISE = 1.6;
D.morningRise = function (meal, at) { return meal === 'breakfast' && String(at) >= D.MORNING_FROM ? D.MORNING_RISE : 0; };
function pts(values, at) { return [0, 30, 60, 90, 120].map(function (m, i) { return { min: m, at: NF.addMin(at, m), mmol: values[i] }; }); }
NF.sensorSource = function (S, draft) {
  var food = NF.foodById(S, draft.foodId), k = S.episodes.length + 1;
  var taken = (draft.advice || []).filter(function (a) { return a.accepted === true && a.lever !== 'portion'; })[0];
  var portionTaken = (draft.advice || []).some(function (a) { return a.lever === 'portion' && a.accepted === true; });
  var ctx = S.illness && S.illness.active ? 'illness' : draft.insulin.confirmed === 'none' ? 'nodose' : (draft.insulin.confirmed === 'other' && draft.insulin.units < (NF.activePlan(S).doses[draft.meal].units)) ? 'lowdose' : null;
  return { points: pts(curve(S, food, portionTaken ? 'usual' : draft.portion, taken && taken.lever, k, ctx, D.morningRise(draft.meal, draft.at)), draft.at), importedAt: NF.addMin(draft.at, 130) };
};
/* „Aplikace senzoru“ v ukázce: co by pacient viděl v grafu (nejvyšší hodnota) a ukázkový export pro zápisy bez průběhu + noci. Jádro žádný senzor nevolá. */
D.sensorPeak = function (S, ep) { var src = NF.sensorSource(S, { foodId: ep.foodId, advice: ep.advice, portion: ep.portionPlanned, insulin: ep.insulin, meal: ep.meal, at: ep.at }); return Math.max.apply(null, src.points.map(function (p) { return p.mmol; })); };
/* Ukázkový export za posledních 14 dní před kontrolou (02 #1, 25. 10. 2026): z tohoto souboru vzniká přes jádro (NF.sensorSummaryFrom)
   souhrn ze senzoru v kontrole a tentýž soubor nahraje tlačítko „Použít ukázkový export“. Deterministický: 5minutová měření, výpadek
   při výměně senzoru (28. 12. 9:00–21:00) a drobné mezery (dostupnost 91 %).
   A3 (nezávislá kontrola 27. 10. 2026): export je průběh glukózy, ze kterého pacient během plánu opisoval celá čísla – po každém zápisu jídla v okně exportu
   je v souboru jeho skutečný průběh (specCurve), mezi jídly klidová hladina. Klidová hladina je dopočtená tak, aby čas nad cílem byl 26 % (rady přijímá) nebo 37 % (jinak).
   Fáze 2 (Q6, 27. 10. 2026): v hlavní linii (rady přijímá) dvě noci s poklesem pod 3,9 – ráno 25. 12. po Štědrém večeru a 1. 1. po Silvestru (2 %);
   noci v období exportu doplní až import, a tak na kontrole vznikne návrh k bazálu s předností. V dodatku (jiná historie pacienta) noci bez poklesu.
   Čísla v příběhu: čas v cíli 72 % / 63 % (dodatek, bez nočních poklesů), pod 3,9 2 % / 0 %, dostupnost 91 %. */
D.EXPORT_FROM = '2026-12-22'; D.EXPORT_DAYS = 14; D.REVIEW_DAY = '2027-01-05';
var periodCache = {};
/* Příspěvek jídla k průběhu: 0–120 min tvar zápisu (vzestup nad hodnotu při jídle), 120–240 min lineární návrat ke klidové hladině. */
function bumpAt(v, dt) {
  if (dt < 0 || dt > 240) return 0;
  if (dt >= 120) return (v[4] - v[0]) * (1 - (dt - 120) / 120);
  var i = Math.floor(dt / 30), f = (dt - i * 30) / 30;
  return (v[i] - v[0]) + ((v[i + 1] - v[0]) - (v[i] - v[0])) * f;
}
/* A1 (závěrečné ověření 1. 11. 2026): export i zápisy dlouhé řady vznikají z jednoho výpočtu (seriesFinal) a pamatují se podle větví příběhu a stavu registru
   (zamítnutá rada se pacientovi nenabízela, a tak ji nemá ani průběh v exportu). Bez stavu, nebo se stavem po řadě, se příběh přehraje do dne před kontrolou. */
D.periodCsv = function (B, S) {
  var BB = {}; Object.keys(D.defaults).forEach(function (k) { BB[k] = (B && B[k]) || D.defaults[k]; });
  if (S && !S.episodes.some(function (x) { return x.id === 'E60'; }) && NF.activePlan(S)) return seriesFinal(S, BB).csv;
  if (S && periodCache[seriesKey(S, BB)]) return periodCache[seriesKey(S, BB)].csv;
  var P = D.play(D.indexOf('preview'), BB), hit = periodCache[seriesKey(P, BB)];
  return hit ? hit.csv : null;
};
function csvFrom(S, specs, B) {
  var key = B && B.response === 'accepts' ? 'accepts' : 'other';
  var aboveTarget = key === 'accepts' ? 30 : 37, n = Math.round(0.91 * D.EXPORT_DAYS * 288), slots = [];
  for (var d = 0; d < D.EXPORT_DAYS; d++) for (var i = 0; i < 288; i++) if (!(d === 6 && i >= 108 && i < 252)) slots.push([d, i * 5]); /* výměna senzoru 28. 12. 9:00–21:00 */
  var drop = slots.length - n, keep = []; /* drobné mezery rovnoměrně */
  for (var j = 0, k = 0; j < slots.length; j++) { if (k < drop && j === Math.floor((k + 0.5) * slots.length / drop)) { k++; continue; } keep.push(slots[j]); }
  /* jídla v okně exportu s jejich skutečným průběhem (stejný výpočet jako zápis jídla v ep) */
  var t0 = D.EXPORT_FROM + 'T00:00:00', meals = specs.filter(function (sp) { return sp.at >= D.EXPORT_FROM; }).map(function (sp) { return { t: NF.minutesDiff(t0, sp.at), v: specCurve(S, sp) }; });
  var night = function (s) { return key === 'accepts' && (s[0] === 3 || s[0] === 10) && s[1] >= 120 && s[1] < 120 + 37 * 5; }; /* dvě noci s poklesem pod 3,9 (25. 12. a 1. 1. ráno), nikdy pod 3,0 */
  /* Vzestupy po jídle jsou z průběhu zápisů. Noc a ráno nalačno drží klidovou hladinu (6,2 ± 0,5 mmol/l); přes den (7:00–22:00) je hladina mezi jídly
     o svátcích vyšší než v říjnu – o kolik, je dopočtené tak, aby čas nad cílem odpovídal příběhu. */
  var lift = function (m) { return m < 420 ? 0 : m < 480 ? (m - 420) / 60 : m < 1320 ? 1 : m < 1410 ? 1 - (m - 1320) / 90 : 0; };
  var wave = keep.map(function (s) { return 6.2 + 0.5 * Math.sin(2 * Math.PI * (s[1] - 300) / 1440); }), day = keep.map(function (s) { return lift(s[1]); });
  var bump = keep.map(function (s) { var abs = s[0] * 1440 + s[1], v = 0; meals.forEach(function (ml) { v += bumpAt(ml.v, abs - ml.t); }); return v; });
  var val = function (idx, base) { var s = keep[idx]; return night(s) ? 3.6 + 0.1 * ((s[1] / 5) % 3) : Math.round((wave[idx] + base * day[idx] + bump[idx]) * 10) / 10; };
  var count = function (base) { var c = 0; for (var x = 0; x < keep.length; x++) if (val(x, base) > 10) c++; return c; };
  var lo = 0, hi = 6; for (var it = 0; it < 40; it++) { var mid = (lo + hi) / 2; if (Math.round(count(mid) / n * 100) < aboveTarget) lo = mid; else hi = mid; }
  var mult = hi, p2 = function (x) { return ('0' + x).slice(-2); };
  var rows = keep.map(function (s, idx) {
    var iso = NF.day(NF.addDays(D.EXPORT_FROM + 'T12:00:00', s[0]));
    return 'DEMO,0000,' + iso.slice(8, 10) + '-' + iso.slice(5, 7) + '-' + iso.slice(0, 4) + ' ' + p2(Math.floor(s[1] / 60)) + ':' + p2(s[1] % 60) + ',0,' + NF.r1(val(idx, mult)) + ',';
  });
  return 'Glucose Data,Generated on 05-01-2027 08:50,Generated by DEMO\nDevice,Serial Number,Device Timestamp,Record Type,Historic Glucose mmol/L,Scan Glucose mmol/L\n' + rows.join('\n');
}
/* Na kontrole (od dne kontroly, dokud platí P1) je ukázkový export týž soubor, ze kterého je souhrn; dřív export k zápisům bez průběhu. */
D.periodExportNow = function (S) { var p = NF.activePlan(S); return NF.day(S.clock) >= D.REVIEW_DAY && !!p && !p.previousId; };
D.demoCsv = function (S) {
  if (D.periodExportNow(S)) return D.periodCsv(S.branches, S);
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
/* B1 (31/02): sestra potvrzuje jen to, co data neukážou. Pozdě večer a v noci pacient o svátcích jedl (Štědrý večer, Silvestr) – „Nesedí“, stejně jako lékař u bazálu.
   B3: HbA1c pro kontrolu vybrala z karty pacienta voličem (hodnota a datum odběru). */
D.nurseStory = { technika: true, jidlo: true, vecer: false, stres: true };
D.nurseCheckApply = function (S) { NF.setNurseMeds(S, 'no'); NF.setNurseHealth(S, 'no'); NF.setWeight(S, 'sestra', D.WEIGHT_REVIEW.kg, D.WEIGHT_REVIEW.date); NF.setHba1c(S, 'sestra', D.HBA_REVIEW.v, D.HBA_REVIEW.date); NF.nurseKeys(S).forEach(function (k) { NF.setNurseCheck(S, k, D.nurseStory[k] !== false); }); }; /* SCHEMA 84: jiný lék na diabetes „Ne“, zdravotní stav „Ne“, hmotnost 90 kg */
D.importDemoApply = function (S) { var csv = D.demoCsv(S); if (csv) NF.importReadings(S, NF.parseSensorCsv(csv)); };
NF.demoActions = NF.demoActions || {};
NF.demoActions.importDemo = function () { var S = NF.getState(), csv = D.demoCsv(S); if (!csv) return; NF.actions.importText(csv); };
NF.slots.importDemo = function () { return '<div class="actions mt-2"><button type="button" class="btn sm" data-action="importDemo">Použít ukázkový export ze senzoru</button><span class="small muted">DEMO: soubor vytvoří ukázka místo aplikace senzoru</span></div>'; };

/* B3 (31/03): věty o maketě, ukázce a příběhu, které jádro samo neříká (produkce mluví jako aplikace). */
NF.slots.demoTexts = function () {
  return { registr: 'Maketa se chová, jako byste vše schválili; skutečný stav položky je „ke schválení“, dokud ji neschválíte nebo nezamítnete. ', registr2: ' Zamítnutá položka příběh nezastaví. Jde o neformální podklad pro debatu; pro ostrý provoz se pravidla podepisují znovu.',
    zamitnuto: 'Příběh pokračuje dál, ale na místě, kde položka působí, maketa ukáže, že tahle část nefunguje. ', modelHead: ' (modelový krok příběhu)', modelOff: 'Položku vypnul modelový garant během studie; tento krok odehrála ukázka. Vaše dnešní rozhodnutí o položce se tím nemění a najdete ho v souhrnu.',
    modelHist: 'Model příběhu (během studie, odehrála ukázka)', cisla: 'V ukázce nejsou skutečná čísla.', podpora: 'V ukázce se nic neposílá.' };
};
/* ---------- pomocníci příběhu ---------- */
function foodByName(S, name) { return S.foods.filter(function (f) { return f.name === name; })[0]; }
/* Skutečný průběh glukózy u modelového zápisu (0, 30, 60, 90, 120 min) – deterministicky z jídla, porce, přijaté rady a podání inzulinu.
   Pacient z něj opisuje celá čísla; v okně exportu je tentýž průběh v exportu ze senzoru (D.periodCsv). */
function specCurve(S, spec, f) {
  f = f || (spec.food.id ? spec.food : foodByName(S, spec.food));
  var p = NF.activePlan(S), meal = spec.meal || 'breakfast', advice = spec.advice || [];
  var taken = advice.filter(function (a) { return a.accepted === true && a.lever !== 'portion'; })[0];
  var portion = advice.some(function (a) { return a.lever === 'portion' && a.accepted === true; }) ? 'usual' : (spec.portion || 'usual');
  var dose = p.doses[meal], confirmed = NF.isSnack(meal) ? 'snack' : (spec.insulin || 'as'), units = confirmed === 'other' ? (spec.units || dose.units - 2) : null;
  var ctx = spec.context || (confirmed === 'none' ? 'nodose' : confirmed === 'other' && units < dose.units ? 'lowdose' : null);
  var v = curve(S, f, portion, taken && taken.lever, hash(spec.at + f.id), ctx === 'illness' ? 'illness' : ctx, D.morningRise(meal, spec.at));
  if (spec.gap) v = [v[0], v[1], null, null, null];
  if (spec.low) v = [5.2, 4.4, 3.6, 3.4, 4.1];
  return v;
}
/* Čip po celých mmol/l jako v kroku 1 (Z-GLUKOZA): pod 4 a nad 15 jsou hranice se značkou (NF.chip). */
function chipOf(x) { if (x == null) return { v: null, b: null }; var r = Math.round(x); return r < 4 ? { v: 4, b: 'under' } : r > 15 ? { v: 15, b: 'over' } : { v: r, b: null }; }
/* Opsané hodnoty zápisu (A3, nezávislá kontrola 27. 10. 2026): celé číslo při jídle a nejvyšší do 2 h; nejvyšší pacient zadá u dalšího jídla (peakAt),
   otázku na pokles pod 4 zodpověděl. Desetiny a průběh přidá jen export, který sestra nahraje na kontrole. */
/* peakAt = kdy pacient nejvyšší hodnotu opsal (záznam, od kdy je výsledek vidět), ne čas vrcholu; vrchol je vždy z okna 0–120 min (v[0..4] = 0, 30, 60, 90, 120 min). Kontrola 2, C5. */
function copiedManual(v, at) {
  var vals = v.filter(function (x) { return x != null; }), b = chipOf(v[0]), pk = vals.length >= 4 ? chipOf(Math.max.apply(null, vals)) : { v: null, b: null };
  var low = vals.some(function (x) { return x < 4; });
  return { before: b.v, beforeBound: b.b, peak: pk.v, peakBound: pk.b, peakAt: pk.v != null ? NF.addMin(at, 125) : null, low: pk.v != null ? low : null, lowAsked: pk.v != null, skipped: pk.v == null };
}
/* A1 (závěrečné ověření 1. 11. 2026, 31/02): které rady se k zápisu nabídly, neurčuje příběh ručně – skládá je jádro (NF.advise, u zpětného zápisu
   NF.adviseAfter) nad průběžným stavem v okamžiku jídla, stejně jako v aplikaci. Příběh určuje jen odpovědi pacienta (spec.advice = odpovědi k radám,
   spec.answer(lever, i) = odpověď podle větve u dlouhé řady); nabídnutá rada bez odpovědi se uloží „bez odpovědi“ jako v aplikaci.
   Odpověď k radě, kterou jádro nenabídlo, se nezapíše a zůstane v D.adviceMismatch (test ji hlídá – příběh a jádro se nesmí rozejít). */
D.adviceMismatch = [];
function offeredLevers(S, f, spec, meal) {
  var c = S.clock, m = S.meal, retro = spec.bolus === 'retro';
  S.clock = retro ? (spec.recorded || c) : spec.at; S.meal = null;
  try {
    var res = retro ? NF.adviseAfter(S, f.id, meal, spec.at, spec.portion || 'usual', spec.insulin || 'as') : NF.advise(S, f.id, spec.portion || 'usual', spec.bolus || 'as', meal);
    return res.items.map(function (it) { return it.lever; });
  } finally { S.clock = c; S.meal = m; }
}
function adviceFor(S, f, spec, meal) {
  var offered = offeredLevers(S, f, spec, meal), given = {}, k = 0;
  (spec.advice || []).forEach(function (a) { given[a.lever] = a; if (offered.indexOf(a.lever) < 0) D.adviceMismatch.push({ id: spec.id, at: spec.at, lever: a.lever }); });
  return offered.map(function (l) {
    var a = given[l] || (spec.answer && l !== 'portion' ? spec.answer(l, k++) : null) || {};
    return { lever: l, item: NF.LEVERS[l].item, accepted: a.accepted === undefined ? null : a.accepted, reason: a.reason || null };
  });
}
function ep(S, spec) {
  var f = spec.food.id ? spec.food : foodByName(S, spec.food);
  var p = NF.activePlan(S), meal = spec.meal || 'breakfast';
  if (!S.episodes.some(function (x) { return x.id === spec.id; })) spec = Object.assign({}, spec, { advice: adviceFor(S, f, spec, meal) }); /* A1: rady z jádra, odpovědi z příběhu */
  var advice = (spec.advice || []).map(function (a) { return { lever: a.lever, item: NF.LEVERS[a.lever].item, accepted: a.accepted === undefined ? null : a.accepted, reason: a.reason || null }; });
  var portionTaken = advice.some(function (a) { return a.lever === 'portion' && a.accepted === true; });
  var portion = portionTaken ? 'usual' : (spec.portion || 'usual');
  var dose = p.doses[meal], snack = NF.isSnack(meal);
  var confirmed = snack ? 'snack' : (spec.insulin || 'as'), units = snack ? null : confirmed === 'as' ? dose.units : confirmed === 'other' ? (spec.units || dose.units - 2) : null;
  var v = specCurve(S, spec, f);
  var e = { id: spec.id || NF.uid('E'), planId: p.id, meal: meal, foodId: f.id, at: spec.at, recordedAt: spec.at, portionPlanned: spec.portion || 'usual', portion: portion, bolusAtAdvice: spec.bolus || 'as',
    insulin: { prescribed: dose ? dose.units : null, confirmed: confirmed, units: units, time: confirmed === 'none' || confirmed === 'unknown' || snack ? null : NF.fmtTime(NF.addMin(spec.at, -(spec.offset || 5))) },
    doseKey: NF.doseKey(S, meal), advice: advice, context: spec.context || null, points: [], importedAt: null };
  if (spec.manual) { var m = spec.manual; e.manual = { before: m.before != null ? m.before : null, beforeBound: m.beforeBound || null, peak: m.peak != null ? m.peak : null, peakBound: m.peakBound || null, peakAt: m.peak != null ? NF.addMin(spec.at, 125) : null, low: m.peak != null ? (m.low === true) : null, lowAsked: m.peak != null, skipped: !!m.skipped }; } /* hodnoty dané příběhem */
  else e.manual = copiedManual(v, spec.at);
  if (spec.nightLow && meal === 'breakfast' && NF.usable(S, 'B-HYPO')) e.manual.nightLow = true; /* noční pokles čipem u snídaně (bod 7) */
  e.peak = NF.epPeak(S, e); e.rise = NF.epRise(S, e); e.at2h = NF.at2h(e.points);
  if (S.episodes.some(function (x) { return x.id === e.id; })) return e;
  /* V05 (21. 10. 2026): stopa nese skutečného aktéra (pacient) a čas zápisu, ne roli a hodiny scény, ve které se data generují */
  var saveClock = S.clock, hadActor = 'actor' in S, saveActor = S.actor; S.clock = spec.at; S.actor = 'patient';
  if (advice.length) NF.log(S, 'rada.zobrazena', f.name, { level: NF.confidence(S, f.id).level, items: advice.map(function (a) { return { lever: a.lever, item: a.item }; }), bolus: e.bolusAtAdvice, portion: e.portionPlanned });
  S.episodes.push(e);
  NF.log(S, 'jidlo.zapsano', e.id + ' ' + f.id, { meal: meal, portion: e.portion, insulin: e.insulin, advice: advice, context: e.context });
  if (e.manual.nightLow) NF.log(S, 'hypo.noc', 'v noci na ' + NF.fmtDM(e.at) + ' pod 4 mmol/l (zapsal pacient u snídaně)', { epId: e.id, item: 'B-HYPO' });
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
/* Dlouhá řada listopad–prosinec podle odbočky „jak pacient s radami naložil“.
   Fáze 2 (27. 10. 2026):
   – Q4: snídaně se střídají tak, aby nad cílem nebyla jen jedna nebo dvě jídla (kaše, müsli, croissant, cereálie, loupák; chléb zůstává v cíli);
     hlavní linie tak dál ukazuje větev „zvýšit“ a ověřovací bod „Nad cílem nejsou jen jedno nebo dvě jídla“ platí.
   – Q2: pořadí jídla se nabízí jen u jídla, které má složku „nejdřív“ (kontrola 3, A2: NF.leverFits nad strukturovanými údaji jídla); doplněk jen u jídla, které bývá nad cílem.
   – Kontrola 3, B7 a kontrola 4, B7: doplněk se u jídla stáhne podle R-DOPLNEK (aspoň stahnout_po přijatých pokusů se známou nejvyšší hodnotou – i v zápisech, které do učení nejdou – a ani jeden v cíli, NF.addonWithdrawn);
     řada to dodržuje už při skládání (opsaný vrchol jako čip), takže po stažení se doplněk u jídla nenabízí.
   – A27: důvod „nemám to doma“ dostává jen doplněk; pořadí v odbočce „nemám to doma“ odmítá s důvodem „nechutná mi to“.
   – Q6, C10: noci se nepředvyplňují – noční hodnoty pacient neopisuje, doplní je až export, který sestra nahraje na kontrole;
   – A3 (nezávislá kontrola 27. 10. 2026): všechny zápisy mají jen opsaná celá čísla (při jídle, nejvyšší do 2 h). V okně exportu je opsal ze stejného průběhu,
     který je v exportu (jednou o 2 vyšší – shoda opsaného vrcholu s exportem); při výměně senzoru 28. 12. hodnotu neměl („nemám“). Průběh s desetinami
     dostanou jen zápisy v okně exportu, až ho sestra nahraje.
   – C20: 20. 12. bez obecného oběda; ten den je oběd E900 (řízek s pořadím). */
var SERIES_START = '2026-10-24', SERIES_DAYS = 72;
/* Odpovědi pacienta na nabídnuté rady podle větve „jak pacient s radami naložil“ (A1, 1. 11. 2026). Rady samy nabízí jádro.
   Většinou přijal: v 7 dnech z 10 zkusí první nabídnutou radu (ostatní bez odpovědi), jinak ji odmítne s důvodem. Většinou nepřijal: zkusí ve 2 dnech z 10,
   jinak odmítne všechny nabídnuté rady („nechci“, „nebyl čas“); „nemám to doma“ dostává jen doplněk (A27), pořadí „nechutná mi to“; v té variantě pacient doplněk odmítá vždy a procházku občas zkusí. */
function seriesAnswer(B, d) {
  var r = (d * 7 + 3) % 10, accept = B.response === 'accepts' ? r < 7 : r < 2;
  var why = { addon: B.response === 'impractical' ? ['nothome', 'nothome', 'taste'] : ['nowant', 'time', 'nowant'], order: B.response === 'impractical' ? ['taste', 'nowant', 'taste'] : ['nowant', 'time', 'nowant'], walk: ['time', 'nowant', 'time'] };
  return function (lever, i) {
    /* „nemám to doma“: doplněk pacient odmítá vždy (doma ho nemívá); procházku občas zkusí, jindy nestihne; pořadí mu nechutná */
    if (B.response === 'impractical') return lever === 'addon' ? { accepted: false, reason: why.addon[d % 3] } : lever === 'walk' ? (accept ? { accepted: true } : d % 3 ? { accepted: false, reason: 'time' } : { accepted: null }) : (accept ? { accepted: null } : { accepted: false, reason: why.order[d % 3] });
    if (accept) return i === 0 ? { accepted: true } : { accepted: null };
    if (B.response === 'accepts') return i === 0 ? { accepted: false, reason: why[lever][d % 3] } : { accepted: null };
    return { accepted: false, reason: why[lever][d % 3] };
  };
}
/* Dlouhá řada 24. 10. – 4. 1.: zápisy jdou do stavu jeden po druhém v pořadí času a rady ke každému nabídne jádro nad tím, co aplikace v tu chvíli ví
   (stažení doplňku po třech neúspěších, procházka, pořadí jen u jídla, které „nejdřív“ má). V okně exportu jsou opsané hodnoty z průběhu v exportu (readings),
   bez něj (první průchod výpočtu) z průběhu zápisu. Vrací specifikace zápisů s nabídnutými radami a odpověďmi – z nich se skládá export. */
function runSeries(S, B, readings, opt) {
  opt = opt || {};
  var specs = [], manualN = 0, bumped = false, start = SERIES_START, nights = B.response === 'accepts' ? D.NIGHT_LOWS : [];
  var bf = ['Ovesná kaše s mlékem a banánem', 'Chléb se sýrem a zeleninou', 'Müsli s mlékem a medem', 'Croissant s džemem', 'Ovesná kaše s mlékem a banánem', 'Cereálie s mlékem', 'Loupák s máslem'];
  var lu = ['Smažený řízek s bramborovou kaší', 'Kuřecí maso na kari s rýží', 'Svíčková na smetaně s knedlíkem', 'Špagety boloňské', 'Pečené kuře s bramborem', 'Čočka na kyselo s vejcem', 'Bramboračka'];
  var di = ['Grilovaný losos se zeleninou', 'Chléb se sýrem a zeleninou', 'Pizza šunková', 'Zeleninový salát s kuřecím', 'Kebab v pitě', 'Těstovinový salát', 'Chlebíčky s vlašským salátem'];
  var fromExport = function (at, lo, hi) { var v = (readings || []).filter(function (r) { var dm = NF.minutesDiff(at, r.at); return dm >= lo && dm <= hi; }).map(function (r) { return r.mmol; }); return v.length ? v : null; };
  var taken = function (date, meal) { return S.episodes.some(function (x) { return x.meal === meal && NF.day(x.at) === date; }); }; /* B5 (31/02): oběd 24. 10. už zapsal pacient ve scéně (E13) – druhý se nezakládá */
  for (var d = 0; d < SERIES_DAYS; d++) {
    var date = NF.day(NF.addDays(start + 'T07:00:00', d)), answer = seriesAnswer(B, d), day = [];
    var portion = d % 9 === 4 ? 'bigger' : 'usual', ins = d % 13 === 6 ? 'other' : d % 23 === 11 ? 'unknown' : 'as';
    day.push({ id: 'E' + (60 + d * 3), food: bf[d % 7], meal: 'breakfast', at: date + 'T07:' + (d % 2 ? '10' : '05') + ':00', portion: portion, insulin: ins, bolus: 'before', advice: portion === 'bigger' ? [{ lever: 'portion', accepted: true }] : [], answer: answer });
    if (date === '2026-12-20') day.push({ id: 'E900', food: 'Smažený řízek s bramborovou kaší', meal: 'lunch', at: date + 'T12:30:00', insulin: 'as', bolus: 'as', answer: function (l, i) { return i === 0 ? { accepted: true } : { accepted: null }; } });
    else if (!taken(date, 'lunch')) day.push({ id: 'E' + (61 + d * 3), food: lu[d % 7], meal: 'lunch', at: date + 'T12:30:00', insulin: 'as', bolus: 'as', answer: answer });
    if (d % 9 === 2 || d % 11 === 7) day.push({ id: 'E' + (60 + d * 3) + 's', food: 'Jablko', meal: 'snack', at: date + 'T15:30:00' }); /* C5 (31/02): občas svačina, vždy mimo 2 h po hlavním jídle */
    day.push({ id: 'E' + (62 + d * 3), food: di[d % 7], meal: 'dinner', at: date + 'T18:30:00', insulin: 'as', bolus: 'as', answer: answer });
    day.forEach(function (sp) {
      if (sp.meal === 'breakfast' && nights.indexOf(date) >= 0) sp.nightLow = true; /* noc s poklesem v exportu: pacient ji zapsal čipem u snídaně (bod 7) */
      if (opt.manual) { if ((opt.from && sp.at < opt.from) || (opt.until && sp.at >= opt.until)) return; if (opt.manual[sp.id]) sp.manual = opt.manual[sp.id]; } /* část řady (scéna 1. 1.): opsané hodnoty z hotového výpočtu */
      else if (sp.at >= D.EXPORT_FROM && readings) {
        var pk = fromExport(sp.at, 0, 120), bv = fromExport(sp.at, -5, 5);
        if (pk && bv) { manualN++; var pmax = Math.max.apply(null, pk), plus = !bumped && manualN >= 4 && pmax <= 12.5 ? 2 : 0; if (plus) bumped = true; var b0 = chipOf(bv[0]), p0 = chipOf(pmax + plus); sp.manual = { before: b0.v, beforeBound: b0.b, peak: p0.v, peakBound: p0.b }; } /* jednou opsal hodnotu o 2 vyšší (shoda s exportem X z Y); kontrola 3: u jídla, kde +2 nepřekročí čip „nad 15“ */
        else sp.manual = { before: bv ? chipOf(bv[0]).v : null, peak: null, skipped: true }; /* výměna senzoru: hodnotu neměl („nemám“) */
      }
      var e = ep(S, sp);
      specs.push({ id: e.id, food: sp.food, meal: sp.meal || 'breakfast', at: sp.at, portion: sp.portion, insulin: sp.insulin, units: sp.units, context: sp.context, manual: sp.manual || null, advice: e.advice.map(function (a) { return { lever: a.lever, accepted: a.accepted, reason: a.reason }; }) });
    });
  }
  for (var b = 0; b < SERIES_DAYS; b++) basal(S, NF.day(NF.addDays(SERIES_START + 'T07:00:00', b)), b % 17 === 9 ? 'other' : 'as', b % 17 === 9 ? 16 : undefined);
  return specs;
}
/* Řada a export jedním výpočtem: rady závisí na opsaných hodnotách, opsané hodnoty v okně exportu na průběhu v exportu a průběh na přijatých radách.
   Výpočet se opakuje na kopii stavu, dokud se nabídnuté rady a odpovědi nepřestanou měnit (obvykle 2–3 průchody); výsledek se pamatuje. */
function seriesKey(S, B) { return JSON.stringify(B) + '|' + S.registry.items.map(function (i) { return i.id + ':' + i.status + ':' + (i.version || ''); }).join(','); }
function seriesFinal(S, B) {
  var key = seriesKey(S, B); if (periodCache[key]) return periodCache[key];
  var readings = null, sig = null, out = null;
  for (var it = 0; it < 8; it++) {
    var T = NF.clone(S), specs = runSeries(T, B, readings), s2 = JSON.stringify(specs.map(function (x) { return [x.id, x.advice]; }));
    out = { specs: specs, csv: csvFrom(T, specs, B), iterations: it + 1, sig: s2, stable: s2 === sig };
    if (out.stable) break; sig = s2; readings = NF.parseSensorCsv(out.csv);
  }
  periodCache[key] = out; return out;
}
/* Řada do stavu příběhu: celá (scéna „den před kontrolou“), nebo jen do `until` (scéna „ráno 1. ledna“ přidá zbytek až po svém zápisu).
   Výpočet se dělá jednou nad stavem před řadou; zápisy se pak přidávají s týmiž opsanými hodnotami a jádro k nim nabídne tytéž rady (kontrola níže). */
var seriesRun = null;
function series(S, B, until) {
  var first = !S.episodes.some(function (x) { return x.id === 'E60'; });
  if (first) seriesRun = { key: seriesKey(S, B), fin: seriesFinal(S, B) };
  var fin = seriesRun && seriesRun.key === seriesKey(S, B) ? seriesRun.fin : null;
  if (!fin) { D.adviceMismatch.push({ id: 'SERIES', at: SERIES_START, lever: 'řada bez výpočtu' }); return; }
  var man = {}; fin.specs.forEach(function (x) { man[x.id] = x.manual; });
  var from = (S.seriesUntil || null), specs = runSeries(S, B, null, { manual: man, from: from, until: until || null });
  S.seriesUntil = until || '9999';
  var want = {}; fin.specs.forEach(function (x) { want[x.id] = JSON.stringify(x.advice); });
  if (!fin.stable || specs.some(function (x) { return want[x.id] !== JSON.stringify(x.advice); })) D.adviceMismatch.push({ id: 'SERIES', at: SERIES_START, lever: 'export a zápisy se rozešly' });
  /* Souhrn ze senzoru (čas v cíli, pod cílem) a noci vznikají až z exportu, který sestra nahraje na kontrole (C10); dřív je aplikace nemá. */
}

/* Jak body ověření v příběhu dopadnou (lékař je ověřuje s pacientem). Fáze 2, 27. 10. 2026:
   – bazál (noční hodnoty pod cílem): večeře v těch nocích nebyly obvyklé (Štědrý večer, Silvestr) → „ponechat, řešit večeře“;
   – „Nejdřív rady“: pacient rady nechce (odbočka „nechci, nebyl čas“) → bod ochoty nesedí, „probrat důvody“; „nemám to doma“ u doplňku
     → bod „může běžně plnit“ nesedí, „vyměnit radu“; jinde oba body sedí;
   – „Vyměnit radu“ v odbočce „nemám to doma“: radu nemůže běžně plnit → bod 1 nesedí;
   – A1 (nezávislá kontrola 27. 10. 2026): bod „U jídla nebyl v období pokles pod 4“ po obědě s poklesy (16. a 17. 10.) nesedí podle dat → „ponechat dávku, řešit jídlo“;
   – ostatní body sedí (bod se štítkem „data říkají jinak“ posoudí lékař v ukázce jako „sedí“, LF-06). */
D.storyVerify = function (S, B, pr) {
  /* SCHEMA 84 (rozhodnutí 2): bod „Pacient rady k jídlu zkoušel“ u karty k dávce v odbočkách „nepřijal“ podle dat nesedí – modelový lékař ho tak i označí (větev „ponechat dávku, posílit radu“) */
  var radyI = pr.facts ? pr.facts.map(function (f, i) { return f && f.against && /^nabídnuto/.test(f.text) ? i : -1; }).filter(function (i) { return i >= 0; }) : [];
  if (pr.facts && pr.facts.some(function (f) { return f && f.block; })) return pr.verify.map(function (_, i) { return !NF.verifyBlocked(pr, i) && radyI.indexOf(i) < 0; });
  if (radyI.length) return pr.verify.map(function (_, i) { return radyI.indexOf(i) < 0; });
  if (pr.id === 'PR-BAZAL' && /pod cílem/.test(pr.title)) return pr.verify.map(function (_, i) { return i !== 1; });
  if (/-RADY$/.test(pr.id)) return pr.verify.map(function (_, i) { return B.response === 'declines' ? i !== 1 : !(B.response === 'impractical' && pr.lever === 'addon' && i === 0); });
  if (B.response === 'impractical' && pr.lever && /^Vyměnit/.test(pr.title)) return pr.verify.map(function (_, i) { return i !== 0; });
  return pr.verify.map(function () { return true; });
};
/* SCHEMA 88: ověřovací body modelového lékaře přes NF.setVerify, aby stopa měla navrh.overeni jako v ostré aplikaci */
function storyFill(S, B, pr) { var r = S.review, v = r.verify[pr.id] || {}; D.storyVerify(S, B, pr).forEach(function (x, i) { if (v[i] === undefined) NF.setVerify(S, pr.id, i, x); }); }
/* Rozhodne zbývající návrhy, které se rozhodují jednotlivě, podle větve postupu. C15 (27. 10. 2026): dávku tady nikdy nemění –
   prandiální návrh k dávce, jehož větev by byla „zvýšit / snížit“, „ponechá na příští kontrolu“ (volba modelového lékaře měnit v jedné kontrole jen jednu dávku; žádné pravidlo registru to neukládá – D-POSTUP jen upozorní, kontrola 2, C16);
   větev „ponechat“ (např. oběd s poklesy pod 4, A1) potvrdí jako lékař ve vyprávění. */
D.decideSingles = function (S, B) {
  var r = S.review;
  r.proposals.forEach(function (pr) {
    if (pr.row || r.decisions[pr.id] || !NF.proposalIsSingle(S, pr)) return; /* SCHEMA 84: řádky bez návrhu se nerozhodují */
    if (pr.kind === 'dose' && pr.dose !== 'basal') {
      storyFill(S, B, pr); var bd = NF.proposalBranch(S, pr);
      /* C12 (kontrola 3, vlastník 29. 10. 2026): se zamítnutou B-HYPO lékař dávku k obědu ponechá proti větvi „zvýšit“ bez poznámky – ukázka za něj nic nepíše (jako krok ve scéně 22) */
      NF.decideProposal(S, pr.id, bd && bd.action === 'keep' ? { choice: 'keep', branch: 'keep' } : !NF.usable(S, 'B-HYPO') && pr.dose === 'lunch' ? { choice: 'keep', branch: bd ? bd.action : null } : { choice: 'keep', branch: null }); return; /* A4 (31/03): modelový lékař nic nepíše; dávku ponechal na příští kontrolu (volba, ne text) */
    }
    storyFill(S, B, pr);
    var br = NF.proposalBranch(S, pr), dec = { choice: br && (br.action === 'swap') ? 'agree' : 'keep', branch: br && br.action };
    if (br && br.action === 'swap') dec.swapTo = NF.swapOptions(S, pr)[0] || null;
    NF.decideProposal(S, pr.id, dec);
  });
};
/* Kontrola v příběhu stejně jako kroky vyprávění (C01): bazál podle bodů → první prandiální návrh mimo oběd „zvýšit“ o 2 j. (dvě klepnutí voličem) →
   ostatní podle postupu → „Beze změny“ jednou kartou. */
D.reviewStory = function (S, B) {
  var r = S.review, first = true;
  r.proposals.forEach(function (pr) {
    if (pr.row || r.decisions[pr.id] || !NF.proposalIsSingle(S, pr)) return; /* SCHEMA 84: řádky bez návrhu se nerozhodují */
    if (pr.kind === 'dose' && pr.dose === 'basal') { storyFill(S, B, pr); var bb = NF.proposalBranch(S, pr); NF.decideProposal(S, pr.id, { choice: bb && bb.action === 'keep' ? 'keep' : 'agree', branch: bb && bb.action }); return; }
    /* SCHEMA 84 (07 bod 3, 09 odd. 4): oběd s poklesy po menší porci modelový lékař v hlavní linii i v odbočkách ponechá přes „Jiné rozhodnutí“
       (jedna změna najednou, poklesy jen varují) – zvyšuje se jen první jiná prandiální dávka; oběd rozhodne D.decideSingles (ponechat) */
    if (pr.kind === 'dose' && first && pr.dose !== 'lunch') {
      first = false; storyFill(S, B, pr);
      var br = NF.proposalBranch(S, pr);
      if (br && (br.action === 'up' || br.action === 'down')) { var u = r.newDoses[pr.dose].units + (br.action === 'up' ? 2 : -2); NF.decideProposal(S, pr.id, { choice: 'agree', branch: br.action, units: u }); }
      else NF.decideProposal(S, pr.id, { choice: 'keep', branch: br && br.action });
    }
  });
  D.decideSingles(S, B);
  NF.keepAll(S);
  D.decideSingles(S, B); /* po změně dávky se pravidla potvrzují zvlášť (6. 10. 2026) */
};

/* ---------- odbočky ---------- */
D.branches = {
  training: { label: 'Zaučení u sestry', from: 'training', options: [{ id: 'done', label: 'Zaučení proběhlo' }, { id: 'failed', label: 'Zaučení se nezdařilo – návyky nezačnou platit' }] },
  bolus: { label: 'Scéna „po píchnutí“: co si pacient chystá', from: 'afterBolus', options: [{ id: 'bigger', label: 'Větší porci → rada zpět k obvyklé' }, { id: 'smaller', label: 'Menší porci → žádná rada k množství, jen pravidlo' }, { id: 'unknown', label: 'Neví, jestli si píchl → jako po píchnutí' }] },
  response: { label: 'Jak pacient s radami naložil (listopad–prosinec)', from: 'preview', options: [{ id: 'accepts', label: 'Většinou přijal' }, { id: 'declines', label: 'Většinou nepřijal – „nechci“, „nebyl čas“' }, { id: 'impractical', label: 'Většinou nepřijal – „nemám to doma“' }] }
};
D.defaults = { training: 'done', bolus: 'bigger', response: 'accepts' };

/* ---------- společný start ---------- */
function setup(S) {
  S.clock = '2026-10-05T09:00:00';
  NF.seed(S, T0, 'DEMO-L01'); /* registr a jídla z jádra; modelové schválení garantem k T0 */
  S.registry.items.forEach(function (r) { r.guide = (D.guide && D.guide[r.id]) || null; }); /* pětidílný průvodce položkou (demo/guide.js) */
  S.patient.hba1cLog = [{ v: D.HBA_CARD.v, date: D.HBA_CARD.date, src: 'karta' }];
  S.patient.weightLog = [{ kg: D.WEIGHT_CARD.kg, date: D.WEIGHT_CARD.date, src: 'karta' }]; S.patient.sex = D.PATIENT_SEX; /* SCHEMA 84 */
  S.enrollment.baseline = { tir: D.cardBaseline.tir, below: D.cardBaseline.below }; /* z reportu senzoru před zařazením; lékař hodnoty při zařazení potvrdí nebo upraví voličem */
}
function enrolled(S) { NF.ELIGIBILITY.forEach(function (c) { NF.setEligibility(S, c[0], true); }); NF.setEligibility(S, NF.EXCLUSION[0], true); } /* kontrola 4 (06 B4): lékař potvrdí i vylučovací kritéria */
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
/* Kontrola 4 (bod 4): časy připomínek, které sestra s pacientem vybrala při zaučení (modelový pacient snídá kolem 7, obědvá ve 12, večeří v 18, bazál ve 21). */
D.reminderTimes = { breakfast: '7:00', lunch: '12:00', dinner: '18:00', basal: '21:00' };
function trained(S, B) {
  S.role = 'nurse';
  Object.keys(D.reminderTimes).forEach(function (k) { NF.setReminderTime(S, k, D.reminderTimes[k]); });
  NF.trainingItems(S).forEach(function (t) { S.training.steps[t.id] = true; });
  if (B.training === 'failed') { S.training.steps.contacts = false; NF.finishTraining(S, 'failed', 'helper'); } /* C17: bod „kam se obrátit“ chybí, důvod „potřebuje pomoc blízké osoby“ */
  else NF.finishTraining(S, 'done');
}
function understood(S) { S.role = 'patient'; S.onboarding.checkAnswer = 'no'; NF.confirmUnderstanding(S); }
function freshMeal(S, meal, food, portion, bolus) {
  var p = NF.activePlan(S); var f = food ? foodByName(S, food) : null;
  S.meal = { step: bolus ? (f ? 3 : 2) : 1, meal: meal, bolus: bolus || null, units: p.doses[meal].units, offset: '0', q: f ? f.name : '', foodId: f ? f.id : null, portion: portion || null, decisions: {}, reasons: {}, newFood: null, before: bolus ? 7 : null, beforeAsked: !!bolus };
}

/* ---------- kapitoly ----------
   setup = kulisy scény (platí při příchodu), apply = akce, která se ve scéně odehraje. */
/* Nové znění rady k pořadí ve scénáři 5 (verze v2). */
/* Kontrola 2 (A1, 29. 10. 2026): v2 neradí jíst víc („přílohu nevynechávejte – snězte ji jako obvykle“ by po píchnutí s menší porcí byla rada jíst víc, zásada 3).
   Kdo se po první složce nasytí dřív, řídí se schváleným pravidlem „Méně jídla než obvykle“; jádro navíc radu, jejíž text mluví o množství, v riziku nízké glukózy nenabídne (NF.talksAmount). */
D.PORADI_V2 = 'Snězte nejdřív {first}, potom zbytek jídla. Když budete mít dost dřív, než jídlo dojíte, řiďte se pravidlem „Méně jídla než obvykle“.';
/* C06 (Q2, 27. 10. 2026): podnět se týká jídla s přílohou; ukazuje ho karta „Podnět z provozu“ (A33).
   Kontrola 2 (B8): podnět přišel z provozu studie od jiného pacienta – modelový pacient radu k pořadí u řízku do 23. 10. nedostal (v datech není), proto „jiný pacient ve studii“. */
D.IMPULSE = 'Jiný pacient ve studii po radě „nejdřív maso“ u smaženého řízku s bramborovou kaší nedojedl přílohu. Snědl méně než obvykle, a inzulin už měl píchnutý.'; /* C14 (27. 10. 2026): bez párování jídla s inzulinem */
D.OFF_NOTE = 'Vypnuto po podnětu z provozu.'; /* stejné znění jako tlačítko „Navrhnout vypnutí položky“ (ui.impulseOff; kontrola 4, bod 11: navrhuje garant, provádí výrobce) */
D.V2_NOTE = 'Podnět z provozu: ' + D.IMPULSE; /* stejné znění jako „Založit novou verzi ke schválení“ (ui.impulseVersion) */

/* Scéna „menší porce a pokles pod 4“ (C24): oběd 16. 10. s menší porcí, otázka za 60 min, druhý pokles další den v poledne. */
var HYPO_FOOD = 'Kuřecí maso na kari s rýží';
D.HYPO_ASK = '2026-10-16T13:25:00';
D.HYPO_SECOND = '2026-10-17T12:30:00';
/* A1 (nezávislá kontrola 27. 10. 2026): zápisy s poklesem mají úplná data jako v aplikaci – nejvyšší hodnotu po obědě pacient opsal v kroku 1
   další večeře (16. 10. a 17. 10. v 18:30); do návrhů k dávce nejdou kvůli menší porci a pokles se počítá do poklesů u oběda. */
D.HYPO_PEAK = 8;
function hypoLunch(S, day) { return S.episodes.filter(function (x) { return x.meal === 'lunch' && NF.day(x.at) === day && x.portion === 'smaller'; })[0] || null; }
D.hypoPeak = function (S, day) {
  var e = hypoLunch(S, day), at = day + 'T18:30:00'; if (!e || (e.manual && e.manual.peak != null) || S.clock < at) return;
  var c = S.clock, hadActor = 'actor' in S, a = S.actor; S.clock = at; S.actor = 'patient'; NF.setManualPeak(S, e.id, D.HYPO_PEAK); S.clock = c; if (hadActor) S.actor = a; else delete S.actor;
};
/* Druhý pokles: další den k obědu znovu menší porce s inzulinem, za hodinu odpověď „ano, pod 4“; hodiny scény se posunou na tu chvíli. */
D.hypoSecond = function (S) {
  if (S.episodes.some(function (x) { return x.id === 'E9i'; })) return;
  var c0 = S.clock; S.clock = '2026-10-16T18:30:00'; D.hypoPeak(S, '2026-10-16'); ep(S, { id: 'E9d', food: 'Chléb se sýrem a zeleninou', meal: 'dinner', at: '2026-10-16T18:30:00' }); S.clock = c0; /* nejvyšší po obědě 16. 10. opsaný u večeře; C2 (31/02): ta večeře je i v datech */
  var e = ep(S, { id: 'E9i', food: HYPO_FOOD, meal: 'lunch', at: D.HYPO_SECOND, portion: 'smaller', insulin: 'as', bolus: 'as', manual: { before: 7, peak: null } });
  var w = NF.addHypoWatch(S, 'smaller', 'lunch', e.at, e.id);
  S.clock = NF.addMin(D.HYPO_SECOND, 65); basal(S, '2026-10-16');
  if (w) { NF.answerHypoWatch(S, w.id, 'yes'); S.lowNotice = { at: S.clock }; }
};
/* První navržená otázka na lékaře v přehledu před kontrolou (stejná, na kterou klepne vyprávění). */
/* Scéna „1. ledna ráno“: zápis snídaně s čipem nočního poklesu (stejný zápis, jaký by vznikl v řadě; opsané hodnoty z exportu). */
D.NIGHT_SCENE = '2027-01-01T07:00:00';
D.nightSpec = function () { var x = seriesRun && seriesRun.fin.specs.filter(function (s) { return s.meal === 'breakfast' && NF.day(s.at) === '2027-01-01'; })[0]; return x || null; };
D.nightFinish = function (S, B) {
  var sp = D.nightSpec(); series(S, B || S.branches, sp ? NF.addMin(sp.at, 1) : D.NIGHT_SCENE);
  S.clock = sp ? NF.addMin(sp.at, 2) : S.clock; S.meal = null; S.page = 'today';
  if (sp && S.episodes.some(function (x) { return x.id === sp.id && x.manual && x.manual.nightLow; })) S.lowNotice = { at: S.clock, night: true }; /* karta „Pokles pod 4 je zapsaný“ na Dnes, jako po uložení v aplikaci (SCHEMA 86, 33/06 odd. 4: night jako NF.saveEpisode) */
};
D.firstQuestion = function (S) {
  if (NF.previewQuestions) return NF.previewQuestions(S)[0] || ''; /* SCHEMA 89: otázky počítá jádro; příběh tak jde přehrát i bez obrazovek */
  var page = S.page, role = S.role, html = '';
  try { S.page = 'preview'; S.role = 'patient'; html = NF.screens.patient(S); } catch (err) { html = ''; } finally { S.page = page; S.role = role; }
  var m = html.match(/data-action="toggleQuestion" data-value="([^"]*)"/); if (!m) return '';
  return m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
};
var CH = [
  { id: 'prolog', act: 0, title: 'Úvod – k čemu NutriFee je a jak ukázku ovládat', role: 'doctor', page: 'intro', wizardStep: 0, at: '2026-10-05T09:00:00' }, /* 12. 10. 2026: úvodní obrazovka v obsahu (demo/intro.js); karta pacienta začíná až scénou 2 */
  /* Scénář 1 – V ordinaci */
  { id: 'enroll', act: 1, title: 'Lékař – karta a podmínky zařazení', role: 'doctor', page: 'enroll', wizardStep: 0, at: '2026-10-05T09:00:00',
    setup: function (S) { S.draft = S.draft || NF.newDraft(S); }, apply: function (S) { enrolled(S); } }, /* čtyři podmínky NF.ELIGIBILITY (sdílení dat zrušeno, SCHEMA 74) */
  { id: 'doses', act: 1, title: 'Lékař – dávky, startovní návyky a pravidla', role: 'doctor', page: 'enroll', wizardStep: 1, at: '2026-10-05T09:10:00',
    setup: function (S) { draftReady(S); }, apply: function (S) { S.draft.medicationChecked = true; S.draft.instructionsChecked = true; } },
  { id: 'issue', act: 1, title: 'Lékař – vydání plánu', role: 'doctor', page: 'enroll', wizardStep: 2, at: '2026-10-05T09:20:00',
    apply: function (S) { issued(S); } },
  { id: 'training', act: 1, title: 'Sestra – zaučení s náhledem telefonu', role: 'nurse', page: 'training', at: '2026-10-05T09:35:00',
    /* integrace SCHEMA 73: v dodatku „zaučení se nezdařilo“ jsou body Dnes a Bezpečí odškrtnuté už na začátku scény (krok tak odškrtá nejvýš 5 bodů, tempo SCHEMA 71) */
    setup: function (S, B) { var b = B || S.branches; if (b && b.training === 'failed' && S.training && S.training.steps) { S.training.steps.app = true; S.training.steps.safety = true; ['alerts', 'reminders'].forEach(function (k) { S.training.steps[k] = true; }); Object.keys(D.reminderTimes).forEach(function (k) { NF.setReminderTime(S, k, D.reminderTimes[k]); }); } }, /* integrace SCHEMA 78: dodatek ukazuje jen to, čím se liší – připomínky a ústní body jsou kulisa jako Dnes a Bezpečí */
    apply: function (S, B) { trained(S, B); } },
  { id: 'handover', act: 1, title: 'Pacient – převzetí plánu a jedna otázka', role: 'patient', page: 'takeover', at: '2026-10-05T09:55:00',
    apply: function (S, B) { if (B.training !== 'failed') understood(S); } },

  /* Scénář 2 – Doma: aplikace se učí */
  { id: 'firstMeal', act: 2, title: 'Pacient – první snídaně ve třech krocích', role: 'patient', page: 'meal', at: '2026-10-06T07:00:00',
    setup: function (S) { freshMeal(S, 'breakfast'); },
    apply: function (S) { ep(S, { id: 'E1', food: 'Ovesná kaše s mlékem a banánem', at: '2026-10-06T07:05:00', bolus: 'before', manual: { before: 7 } }); basal(S, '2026-10-05'); basal(S, '2026-10-06'); S.meal = null; } },
  { id: 'firstResult', act: 2, title: 'Pacient – před obědem: nejvyšší hodnota po snídani', role: 'patient', page: 'meal', at: '2026-10-06T12:10:00',
    setup: function (S) { freshMeal(S, 'lunch'); },
    /* Kontrola 4 (02 C4): pacient pak oběd dokončil – 6. 10. má tkanina i oběd (svíčková, kterou aplikace teprve poznává). */
    apply: function (S) { NF.setManualPeak(S, 'E1', 12); NF.setManualLow(S, 'E1', 'no'); S.meal = null; } },
  { id: 'week', act: 2, title: 'Pacient – po týdnu: co už aplikace ví', role: 'patient', page: 'food', at: '2026-10-12T19:00:00',
    setup: function (S) {
      /* C3 (nezávislá kontrola 27. 10. 2026): zápisy týdne vznikají v pořadí času, takže milníky „jídlo známe“ přicházejí v pořadí, v jakém aplikace jídla poznala */
      var week = [];
      [['E2', 'Chléb se sýrem a zeleninou', '2026-10-07T07:05:00', 'as'], ['E3', 'Ovesná kaše s mlékem a banánem', '2026-10-08T07:10:00', 'as'], ['E4', 'Ovesná kaše s mlékem a banánem', '2026-10-09T07:00:00', 'as'], ['E5', 'Chléb se sýrem a zeleninou', '2026-10-10T07:05:00', 'as'], ['E6', 'Ovesná kaše s mlékem a banánem', '2026-10-11T07:00:00', 'as'], ['E7', 'Chléb se sýrem a zeleninou', '2026-10-12T07:05:00', 'as']]
        .forEach(function (x) { week.push({ id: x[0], food: x[1], at: x[2], insulin: x[3] }); });
      [['E2b', 'Kuřecí maso na kari s rýží', '2026-10-07T12:30:00'], ['E3b', 'Svíčková na smetaně s knedlíkem', '2026-10-08T12:30:00'], ['E4b', 'Smažený řízek s bramborovou kaší', '2026-10-09T12:30:00'], ['E5b', 'Smažený řízek s bramborovou kaší', '2026-10-10T12:30:00'], ['E6b', 'Smažený řízek s bramborovou kaší', '2026-10-11T12:30:00'], ['E7b', 'Smažený řízek s bramborovou kaší', '2026-10-12T12:30:00']]
        .forEach(function (x) { week.push({ id: x[0], food: x[1], meal: 'lunch', at: x[2] }); });
      week.push({ id: 'E1l', food: 'Svíčková na smetaně s knedlíkem', meal: 'lunch', at: '2026-10-06T12:15:00' }); /* kontrola 4 (02 C4): oběd 6. 10., který pacient ve scéně „před obědem“ začal zapisovat – tkanina ten den nemá mezeru */
      week.push({ id: 'E1d', food: 'Chléb se sýrem a zeleninou', meal: 'dinner', at: '2026-10-06T18:30:00' }, { id: 'E3d', food: 'Chléb se sýrem a zeleninou', meal: 'dinner', at: '2026-10-08T18:30:00' }); /* od 18. 10. 2026 je známé od 4 zápisů; večeře 8 j. = stejná dávka jako snídaně */
      week.push({ id: 'E4s', food: 'Jablko', meal: 'snack', at: '2026-10-09T15:30:00' }, { id: 'E6s', food: 'Jablko', meal: 'snack', at: '2026-10-11T15:40:00' });
      week.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; }).forEach(function (sp) { ep(S, sp); });
      for (var d = 7; d <= 12; d++) basal(S, '2026-10-' + (d < 10 ? '0' + d : d));
      S.foodsSeg = 'known'; S.foodOpen = foodByName(S, 'Ovesná kaše s mlékem a banánem').id;
    } },

  { id: 'lateMeal', act: 2, title: 'Pacient – otevřel aplikaci až v 10:15', role: 'patient', page: 'today', at: '2026-10-13T10:15:00',
    setup: function (S) { basal(S, '2026-10-12'); },
    /* C01, C13: milník i týdenní shrnutí pacient zavřel; A06/Q3: snídaně 165 min stará, procházka se už nenabízí */
    apply: function (S) {
      var m = NF.pendingMilestone(S); if (m) NF.closeMilestone(S, m.id);
      var w = NF.weekSummary(S); if (w) NF.closeWeek(S, w.id);
      /* B2, B4 (nezávislá kontrola 27. 10. 2026): nejvyšší hodnota „nad 15“ (pravidlo I-VYSOKA hned) a otázka při rozchodu – pacient odpověděl „neobvyklý den“ */
      ep(S, { id: 'E7c', food: 'Chléb se sýrem a zeleninou', at: '2026-10-13T07:30:00', bolus: 'retro', offset: 15, manual: { before: 7, peak: 15, peakBound: 'over' } }); S.meal = null;
      var c0 = S.clock; S.clock = '2026-10-13T10:20:00'; NF.noteHigh(S, 'peak', 'E7c'); NF.answerDivergence(S, 'E7c', 'day'); S.clock = c0;
    } },

  /* Scénář 3 – Rada před jídlem */
  { id: 'advice', act: 3, title: 'Pacient – před píchnutím: porce zpět k obvyklé a doplněk', role: 'patient', page: 'meal', at: '2026-10-14T07:00:00',
    setup: function (S) { milestonesSeen(S); freshMeal(S, 'breakfast', 'Ovesná kaše s mlékem a banánem', 'bigger', 'before'); },
    /* C01, C06: přijatá porce a doplněk; pořadí jen bez odpovědi a jen u jídla, které „nejdřív“ má (u kaše se nenabízí, Q2) */
    apply: function (S) { var k = foodByName(S, 'Ovesná kaše s mlékem a banánem'); ep(S, { id: 'E8', food: k, at: '2026-10-14T07:05:00', portion: 'bigger', bolus: 'before', advice: [{ lever: 'portion', accepted: true }, { lever: 'addon', accepted: true }].concat(k.first ? [{ lever: 'order' }] : []) }); basal(S, '2026-10-13'); basal(S, '2026-10-14'); S.meal = null; } },
  { id: 'afterBolus', act: 3, title: 'Pacient – po píchnutí: co aplikace smí a nesmí', role: 'patient', page: 'meal', at: '2026-10-16T07:30:00',
    setup: function (S, B) { milestonesSeen(S); freshMeal(S, 'breakfast', 'Ovesná kaše s mlékem a banánem', B.bolus === 'smaller' ? 'smaller' : 'bigger', B.bolus === 'unknown' ? 'unknown' : 'as'); },
    /* C01, C07: větší porce (i „nevím“) → pacient radu zpět k obvyklé přijme; menší porce → žádná rada, sledování B-HYPO */
    apply: function (S, B) { if (B.bolus === 'smaller') NF.addHypoWatch(S, 'smaller', 'breakfast', '2026-10-16T07:30:00', 'E9'); ep(S, { id: 'E9', food: 'Ovesná kaše s mlékem a banánem', at: '2026-10-16T07:30:00', portion: B.bolus === 'smaller' ? 'smaller' : 'bigger', bolus: B.bolus === 'unknown' ? 'unknown' : 'as', insulin: B.bolus === 'unknown' ? 'unknown' : 'as', advice: B.bolus === 'smaller' ? [] : [{ lever: 'portion', accepted: true }] }); basal(S, '2026-10-15'); basal(S, '2026-10-16'); S.meal = null; } },
  /* C24, Q5 (27. 10. 2026): menší porce po píchnutí a pokles pod 4 – pravidlo hned, za 60 min otázka, 2 poklesy za 7 dní → karta s obecnou radou (SCHEMA 74, bez výzvy volat). */
  { id: 'hypo', act: 3, title: 'Pacient – menší porce a pokles pod 4', role: 'patient', page: 'meal', at: '2026-10-16T12:20:00',
    setup: function (S) { milestonesSeen(S); freshMeal(S, 'lunch', HYPO_FOOD, 'smaller', 'as'); },
    apply: function (S) {
      var e = ep(S, { id: 'E9h', food: HYPO_FOOD, meal: 'lunch', at: '2026-10-16T12:20:00', portion: 'smaller', insulin: 'as', bolus: 'as', manual: { before: 7, peak: null } });
      var w = NF.addHypoWatch(S, 'smaller', 'lunch', e.at, e.id); S.meal = null;
      S.clock = D.HYPO_ASK; if (w) { NF.answerHypoWatch(S, w.id, 'yes'); S.lowNotice = { at: S.clock }; }
      D.hypoSecond(S); basal(S, '2026-10-17');
      NF.hypoAlertSeen(S); /* pacient kartu s radou po opakovaných poklesech přečetl a zavřel „Rozumím“ (SCHEMA 74) */
    } },
  { id: 'custom', act: 3, title: 'Pacient – nové jídlo jen názvem', role: 'patient', page: 'meal', at: '2026-10-18T12:20:00',
    setup: function (S) { D.hypoPeak(S, '2026-10-17'); if (!S.episodes.some(function (x) { return x.id === 'E9e'; })) ep(S, { id: 'E9e', food: 'Chléb se sýrem a zeleninou', meal: 'dinner', at: '2026-10-17T18:30:00' }); milestonesSeen(S); freshMeal(S, 'lunch', null, null, 'before'); S.meal.step = 2; S.meal.q = 'Řízek s kaší od maminky'; }, /* C2 (31/02): večeře 17. 10., u které pacient opsal nejvyšší hodnotu po obědě */
    apply: function (S) {
      var like = S.foods.filter(function (f) { return f.name === 'Smažený řízek s bramborovou kaší'; })[0];
      var r = NF.addFood(S, 'Řízek s kaší od maminky', { like: like ? like.id : null }, { force: true }); /* „Myslíte Smažený řízek…?“ → Ne, je jiné; „Je to jako…“ → Smažený řízek s bramborovou kaší */
      ep(S, { id: 'E10', food: r.food, meal: 'lunch', at: '2026-10-18T12:30:00', bolus: 'before', advice: [{ lever: 'order', accepted: true }] });
      basal(S, '2026-10-17'); basal(S, '2026-10-18'); S.meal = null;
    } },

  /* Scénář 4 – Nemoc */
  { id: 'illness', act: 4, title: 'Pacient – není mi dobře', role: 'patient', page: 'today', at: '2026-10-20T08:00:00',
    setup: function (S) { for (var d = 19; d <= 20; d++) basal(S, '2026-10-' + d); NF.settleFeedback(S); },
    apply: function (S) { NF.setIllness(S, true); } }, /* C01: jen to, co ukáže krok (zapnutí nemoci); dřívější modelový zápis E11 krok neukazoval */
  { id: 'illnessMeal', act: 4, title: 'Pacient – jídlo během nemoci', role: 'patient', page: 'meal', at: '2026-10-21T08:00:00',
    setup: function (S) { freshMeal(S, 'breakfast', 'Ovesná kaše s mlékem a banánem', 'smaller', 'as'); },
    /* C01: menší porce s inzulinem i za nemoci založí sledování „pod 4?“ za 60 min (jako zápis z kroků) */
    apply: function (S) { var e = ep(S, { id: 'E12', food: 'Ovesná kaše s mlékem a banánem', at: '2026-10-21T08:05:00', portion: 'smaller', context: 'illness', advice: [] }); NF.addHypoWatch(S, 'smaller', 'breakfast', e.at, e.id); basal(S, '2026-10-21'); S.meal = null; } },
  { id: 'recovery', act: 4, title: 'Pacient – už je mi lépe', role: 'patient', page: 'today', at: '2026-10-22T07:30:00',
    /* Kulisy: na otázku po menší porci za nemoci (21. 10.) pacient odpověděl „ne“ hned, jak aplikaci otevřel; ráno 22. 10. už nevisí. */
    setup: function (S) { NF.settleFeedback(S); (S.hypoWatch || []).forEach(function (w) { if (w.epId === 'E12' && w.answer == null) { var c = S.clock; S.clock = '2026-10-21T09:10:00'; NF.answerHypoWatch(S, w.id, 'no'); S.clock = c; } }); },
    apply: function (S) { NF.illnessCheckin(S, true); basal(S, '2026-10-22'); } },

  /* Scénář 5 – Během studie: garant upraví pravidlo (funkce ostré aplikace; chronologicky uprostřed období, proto před kontrolou) */
  { id: 'registry', act: 5, title: 'Během studie – garant upraví pravidlo po podnětu', role: 'doctor', page: 'registry', at: '2026-10-23T09:00:00',
    setup: function (S) { S.reg = { open: 'R-PORADI', q: '' }; S.impulse = { text: D.IMPULSE, at: '2026-10-23T08:40:00', item: 'R-PORADI', newText: D.PORADI_V2 }; S.garantOff = NF.item(S, 'R-PORADI').status === 'rejected'; },
    apply: function (S) {
      S.role = 'doctor';
      /* Oprava pravidla v ostré aplikaci = nová verze ke schválení, kterou garant schválí (O6, 27. 10. 2026). Modelový krok (pod NF.muteHooks): garantovi se nepřipisuje.
         Zamítl-li garant položku dnes, zůstává zamítnutá – nová verze ji nevrací. */
      /* C25 (27. 10. 2026): podnět → vypnout hned → nová verze ke schválení → schválení; stejné kroky jako vyprávění. */
      if (NF.item(S, 'R-PORADI').status !== 'rejected') {
        NF.decideItem(S, 'R-PORADI', 'rejected', D.OFF_NOTE);
        NF.newVersion(S, 'R-PORADI', { text: D.PORADI_V2 }, D.V2_NOTE);
        NF.decideItem(S, 'R-PORADI', 'approved', 'Upřesněn text: kdo se nasytí dřív, řídí se pravidlem „Méně jídla než obvykle“.');
      }
      S.reg = null;
    } },
  { id: 'impact', act: 5, title: 'Pacient – rada s novým textem', role: 'patient', page: 'meal', at: '2026-10-24T12:20:00',
    setup: function (S) { freshMeal(S, 'lunch', 'Smažený řízek s bramborovou kaší', 'usual', 'before'); basal(S, '2026-10-23'); },
    apply: function (S) { ep(S, { id: 'E13', food: 'Smažený řízek s bramborovou kaší', meal: 'lunch', at: '2026-10-24T12:30:00', bolus: 'before', advice: [{ lever: 'order', accepted: true }] }); S.meal = null; } },

  /* Scénář 6 – Kontrola */
  /* Rozhodnutí vlastníka 1. 11. 2026 (bod 7): ráno po Silvestru pacient u snídaně zapíše čipem, že glukóza v noci klesla pod 4 (export to potvrdí, 2:00–5:00).
     Předchozí noční pokles (25. 12.) je starší než 7 dní, a tak karta s obecnou radou nevznikne; oba poklesy lékař uvidí na kontrole u bazálu. */
  { id: 'nightLow', act: 6, title: 'Pacient – 1. ledna ráno: noční pokles pod 4', role: 'patient', page: 'meal', at: D.NIGHT_SCENE,
    setup: function (S, B) { series(S, B, D.NIGHT_SCENE); milestonesSeen(S); freshMeal(S, 'breakfast'); },
    apply: function (S, B) { D.nightFinish(S, B); } },
  { id: 'preview', act: 6, title: 'Pacient – den před kontrolou', role: 'patient', page: 'preview', at: '2027-01-04T18:00:00',
    setup: function (S, B) { series(S, B); },
    /* C19: lékař v reportu uvidí otázku, kterou pacient v této scéně vybral (první navržená), ne podstrčenou */
    apply: function (S) { var q = D.firstQuestion(S); if (q && !S.questions.some(function (x) { return x.text === q; })) S.questions.push({ id: NF.uid('Q'), at: S.clock, text: q, suggested: true }); } },
  { id: 'reviewSummary', act: 6, title: 'Lékař – kontrola, krok 1: souhrn', role: 'doctor', page: 'review', at: '2027-01-05T09:00:00',
    /* C10: nejdřív sestra nahraje export ze senzoru (noci, průběh k opsaným hodnotám, čas v cíli), pak lékař zahájí kontrolu */
    /* Kontrola 4 (bod 7): sestra s pacientem před lékařem – léky beze změny, body, které z dat ověřit nejde, sedí. */
    apply: function (S) { S.role = 'doctor'; basal(S, NF.day(NF.addDays(S.clock, -1))); /* C1 (32/02): včerejší bazál je v zápisech dřív, než se spočítá souhrn – 88 z 92 všude */ D.importDemoApply(S); D.nurseCheckApply(S); NF.startReview(S, D.habitCatalog); } },
  { id: 'reviewProposals', act: 6, title: 'Lékař – krok 2: návrhy s důvodem a postupem', role: 'doctor', page: 'review', at: '2027-01-05T09:10:00',
    setup: function (S) { if (S.review) S.review.step = 2; },
    apply: function (S, B) { S.role = 'doctor'; D.reviewStory(S, B); } },
  { id: 'reviewConfirm', act: 6, title: 'Lékař – krok 3: potvrzení a vydání plánu P2', role: 'doctor', page: 'review', at: '2027-01-05T09:25:00',
    setup: function (S) { if (S.review) S.review.step = 3; },
    apply: function (S) { S.role = 'doctor'; NF.issueFromReview(S, D.habitCatalog); } },
  { id: 'reviewHandover', act: 6, title: 'Lékař – krok 4: předání pacientovi', role: 'doctor', page: 'review', at: '2027-01-05T09:35:00',
    setup: function (S) { if (S.review) S.review.step = 4; } },
  { id: 'newplan', act: 6, title: 'Pacient – nový plán a co se změnilo', role: 'patient', page: 'newplan', at: '2027-01-05T09:40:00',
    apply: function (S) { S.role = 'patient'; S.onboarding.readback = 'yes'; NF.confirmUnderstanding(S); } }, /* kontrola 4 (06 B6): nová dávka souhlasí s tím, co řekl lékař */
  { id: 'trace', act: 6, title: 'Souhrn – vaše rozhodnutí o položkách registru', role: 'doctor', page: 'trace', at: '2027-01-05T09:50:00' }
];
D.acts = [
  { title: 'Úvod', note: 'K čemu NutriFee je a jak ukázku ovládat.' },
  { title: 'Scénář 1 – V ordinaci', note: 'Lékař projde kartu pacienta a podmínky zařazení, zadá dávky a vydá plán se startovními návyky a bezpečnostními pravidly. Sestra pak pacienta zaučí s náhledem jeho telefonu.' },
  { title: 'Scénář 2 – Doma: aplikace se učí', note: 'Pacient zapisuje jídla ve třech krocích a prvním je vždy inzulin. Po týdnu aplikace zná první jídla a ukáže, kam se po nich glukóza dostává.' },
  { title: 'Scénář 3 – Rada před jídlem', note: 'Před píchnutím aplikace radí vrátit porci k obvyklé z větší i z menší, po píchnutí jen z větší. Po menší porci s inzulinem ukáže hned pravidlo, za 60 minut se zeptá na pokles pod 4 a po dvou poklesech za 7 dní ukáže obecnou radu, co dělat. Nové jídlo pacient zadá jen názvem.' },
  { title: 'Scénář 4 – Nemoc', note: 'Pacient označí nemoc a aplikace mu pomáhá dál, jen jinak. Nemoc ukončí zase pacient.' },
  { title: 'Scénář 5 – Během studie: garant upraví pravidlo', note: 'Funkce ostré aplikace, ne vaše dnešní schvalování: po podnětu z provozu garant (a lékař studie) radu hned vypne a opravu připraví jako novou verzi ke schválení. Ukázka novou verzi schválí hned, aby bylo vidět, co pacient uvidí. Ve studii by protokol opravu odložil na konec období a rada by od podnětu zůstala vypnutá; report na kontrole by ji pak ukazoval jako vypnutou, ne jako přijatou.' }, /* kontrola 2 (B8): ukázka a report si neodporují */
  { title: 'Scénář 6 – Kontrola', note: 'Ráno po Silvestru pacient u snídaně zapíše noční pokles pod 4. Den před kontrolou si prohlédne přehled pro lékaře. Lékař projde souhrn a návrhy, potvrdí nový plán a předá ho pacientovi. Na konci je stopa všech výpočtů a rozhodnutí.' }
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
  scene('firstMeal'), scene('firstResult'), scene('week'), scene('lateMeal'), scene('advice'), scene('afterBolus'), scene('hypo'),
  scene('custom'), scene('illness'), scene('illnessMeal'), scene('recovery'), scene('registry'), scene('impact'),
  scene('nightLow'), scene('preview'), scene('reviewSummary'), scene('reviewProposals'), scene('reviewConfirm'), scene('reviewHandover'), scene('newplan'),
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
  ['Stačí čtyři podmínky zařazení?', 'Je startovní sada návyků správná pro všechny?', 'Jsou připravené věty bezpečnostních pravidel úplné?'],
  ['Je vrchol 0–120 min správná míra reakce?', 'Stačí hrubá denní doba (10:00 / 15:30 / 21:00) k rozlišení, že jídlo už minulo?', 'Stačí celá čísla (posuvník po celých mmol/l) místo přesných hodnot ze senzoru a dotaz na minulé jídlo až při dalším jídle?', 'Stačí 4 shodné zápisy (rozdíl do 2,5 mmol/l) pro „známé jídlo“ a dva stupně reakce místo tří?', 'Je správně, že pochvala je jen za snahu a návyk, nikdy za hodnotu glukózy?', 'Jsou milníky (jídlo poznáno, rada zdomácněla, týden bez mezery) ty správné?'],
  ['Je pravidlo „z větší porce zpět k obvyklé i po píchnutí“ bezpečné?', 'Stačí po menší porci s inzulinem otázka za 60 minut a obecná rada po dvou poklesech za 7 dní, bez výzvy volat?', 'Stačí podobnost určená pacientem („podobá se jídlu X“) bez složení?'],
  ['Je správně, že při nemoci neradíme k jídlu vůbec (ani doplněk, pořadí, procházku) a platí jen pravidla pro nemoc?'],
  ['Kdo smí pravidla měnit mezi kontrolami a jak rychle to pacient uvidí?'],
  ['Jsou prahy návrhů k dávce (okno ≥ 28 dní, ≥ 8 čistých jídel, 2/3 nad cílem, medián > cíl + 0,5) správné?', 'Je postup posouzení D-POSTUP úplný?']
];

})(typeof window !== 'undefined' ? window : globalThis);
