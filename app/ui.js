/* Vykreslení (morph bez blikání), akce a veřejné rozhraní.
   Sloty (lišta prezentace, zásuvka, po vykreslení) plní volitelná prezentační vrstva. */
(function (global) {
'use strict';
var NF = global.NutriFee, V = NF.screens, e = NF.esc;
var S = NF.load();
var drawer = null;

NF.slots = {};
NF.registerSlot = function (name, fn) { NF.slots[name] = fn; NF.render && NF.render(); };
function slot(name) { try { return NF.slots[name] ? NF.slots[name](S) : ''; } catch (err) { return ''; } }
function toast(msg) { S.toast = msg; }
function fail(msg) { S.error = msg; }

/* ---------- morph: přepíše jen to, co se změnilo ---------- */
function morph(from, to) {
  if (from.nodeType === 3 && to.nodeType === 3) { if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue; return; }
  if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) { from.parentNode.replaceChild(to.cloneNode(true), from); return; }
  if (from.nodeType !== 1) return;
  var i, a = from.attributes, b = to.attributes;
  for (i = a.length - 1; i >= 0; i--) if (!to.hasAttribute(a[i].name)) from.removeAttribute(a[i].name);
  for (i = 0; i < b.length; i++) if (from.getAttribute(b[i].name) !== b[i].value) from.setAttribute(b[i].name, b[i].value);
  if (from.nodeName === 'INPUT' || from.nodeName === 'TEXTAREA') {
    if (from.type === 'checkbox') { if (from.checked !== to.checked) from.checked = to.checked; }
    else if (global.document.activeElement !== from && from.value !== to.value) from.value = to.value;
    from.disabled = to.disabled;
  }
  if (from.nodeName === 'BUTTON') from.disabled = to.disabled;
  morphChildren(from, to);
}
/* Potomky procházíme z pevného seznamu — šablona se nesmí měnit během průchodu. */
function morphChildren(from, to) {
  var tcs = Array.prototype.slice.call(to.childNodes), fcs = Array.prototype.slice.call(from.childNodes);
  for (var i = 0; i < tcs.length; i++) {
    if (!fcs[i]) { from.appendChild(tcs[i].cloneNode(true)); continue; }
    morph(fcs[i], tcs[i]);
  }
  for (var j = fcs.length - 1; j >= tcs.length; j--) from.removeChild(fcs[j]);
}
function keepOpenDetails(root) {
  /* stav <details> se drží podle textu summary a pořadí mezi stejnými texty (P7) */
  var open = {}, count = {};
  try { root.querySelectorAll('details').forEach(function (d) { var s = d.querySelector('summary'), k = s ? s.textContent : ''; count[k] = (count[k] || 0) + 1; if (d.open) open[k + '#' + count[k]] = 1; }); } catch (err) { }
  return open;
}

/* ---------- vykreslení ---------- */
function content() {
  if (S.role === 'doctor') return V.doctor(S);
  if (S.role === 'nurse') return V.nurse(S);
  return V.patient(S);
}
NF.render = function () {
  var doc = global.document, root = doc && doc.getElementById('app');
  if (!root) return;
  var html = '<a class="skip" href="#main">Přeskočit na obsah</a>' + slot('banner') +
    (NF.storageOK ? '' : '<div class="error" role="alert">Zařízení nemá místo pro uložení, nebo je ukládání zakázané. Zápisy se po zavření ztratí.</div>') +
    (NF.migrated ? '<div class="error" role="status" style="background:var(--sand,#faf6ef);color:inherit">Uložený stav byl ze starší verze (' + e(NF.migrated) + '); začínáme znovu. Záloha zůstala v zařízení.</div>' : '') +
    '<main id="main" class="role-' + e(S.role) + '">' +
    (S.error ? '<div id="error" class="error" role="alert">' + e(S.error) + '</div>' : '') + content() + '</main>';
  html = NF.nbsp(html);
  var open = keepOpenDetails(root);
  if (typeof doc.createElement === 'function' && root.firstChild && root.innerHTML !== undefined && root.querySelectorAll) {
    var tmp = doc.createElement('div'); tmp.innerHTML = html;
    try {
      var seen = {};
      tmp.querySelectorAll('details').forEach(function (d) { var s = d.querySelector('summary'), k = s ? s.textContent : ''; seen[k] = (seen[k] || 0) + 1; if (open[k + '#' + seen[k]]) d.setAttribute('open', ''); });
      morphChildren(root, tmp);
    } catch (err) { root.innerHTML = html; }
  } else root.innerHTML = html;
  renderDrawer();
  focusAfterRender(root);
  if (S.toast) { showToast(S.toast); S.toast = ''; }
  if (NF.slots.afterRender) { try { NF.slots.afterRender(S); } catch (e3) { } }
};
/* Po přepnutí obrazovky nebo role dostane fokus nadpis h1 (E5, 6. 10. 2026); první vykreslení fokus nemění. */
var lastScreen = null;
function focusAfterRender(root) {
  var key = S.role + '/' + S.page;
  if (lastScreen !== null && lastScreen !== key && root && typeof root.querySelector === 'function') {
    try { var h = root.querySelector('main h1'); if (h && h.focus) { h.setAttribute('tabindex', '-1'); h.focus(); } } catch (err) { }
  }
  lastScreen = key;
}
function showToast(msg) {
  var el = global.document && global.document.getElementById('toast'); if (!el) return;
  el.innerHTML = '<div class="toast">' + e(msg) + '</div>'; /* #toast je trvalá živá oblast (aria-live v HTML) */
  if (global.setTimeout) global.setTimeout(function () { el.innerHTML = ''; }, 4000);
}
function renderDrawer() {
  var el = global.document && global.document.getElementById('overlay'); if (!el) return;
  if (!drawer) { el.innerHTML = ''; if (drawerOpener && typeof drawerOpener.focus === 'function') { try { drawerOpener.focus(); } catch (err) { } } drawerOpener = null; return; }
  var body = '';
  if (drawer.indexOf('item:') === 0) body = V.itemDetail ? V.itemDetail(S, drawer.slice(5)) : '';
  else if (drawer === 'acute') body = V.acute ? V.acute(S) : '';
  else if (NF.slots.drawer) body = NF.slots.drawer(S, drawer) || '';
  if (!body) { el.innerHTML = ''; drawer = null; return; }
  el.innerHTML = '<div class="drawer"><section class="drawerpanel" role="dialog" aria-modal="true" aria-label="Podrobnosti">' +
    '<button type="button" class="btn sm close" data-action="closeDrawer" aria-label="Zavřít">×</button>' + body + '</section></div>';
  try { var c = el.querySelector && el.querySelector('.close'); if (c && c.focus) c.focus(); } catch (err2) { }
}
var drawerOpener = null;
NF.openDrawer = function (n) { if (!drawer) drawerOpener = global.document && global.document.activeElement; drawer = n; renderDrawer(); };
NF.closeDrawer = function () { drawer = null; renderDrawer(); };
NF.currentDrawer = function () { return drawer; };

/* ---------- vazba polí ---------- */
function bind(key, value) {
  var parts = String(key).split('.');
  if (parts[0] === 'form') { S.form = S.form || {}; S.form[parts[1]] = value; return; }
  if (parts[0] === 'meal' && S.meal) { S.meal[parts[1]] = value; if (parts[1] === 'q') { S.meal.foodId = null; S.meal.newFood = null; } return; }
  if (parts[0] === 'draft' && S.draft) { S.draft[parts[1]] = value; return; }
  if (parts[0] === 'reg') { S.reg = S.reg || {}; S.reg[parts[1]] = value; return; }
  if (key === 'notes') S.notes = value; /* jiné kořeny stavu z formuláře měnit nelze (P9) */
}

/* ---------- akce ---------- */
function catalog() { var D = global.NutriFeeDemo; return (D && D.habitCatalog) || []; }
/* Po vydání plánu z kontroly se návrhy už nemění (P6); bez zahájené kontroly akce nad návrhy nic nedělají. */
function reviewLocked() {
  if (!S.review) { fail('Kontrola není zahájená.'); return true; }
  if (S.review.planIssued) { fail('Plán ' + S.review.planIssued + ' už je vydaný. Změny patří do příští kontroly.'); return true; }
  return false;
}
/* Akce nad zápisem jídla potřebují rozpracovaný zápis (C4). */
function needMeal() { if (!S.meal) { fail('Zápis jídla není otevřený. Začněte na Dnes.'); return false; } return true; }
/* Náhled telefonu u sestry podle bodu zaučení: stránka a případné ukázkové jídlo. Vrací false, když hodnota není bod. */
function previewFor(id) {
  var it = NF.trainingItems(S).filter(function (x) { return x.id === id; })[0]; if (!it) return false;
  S.training.previewPage = it.page; S.training.preview = it.preview || null; return true;
}
function validMeal(meal) { return NF.isSnack(meal) || NF.MEALS.some(function (m) { return m[0] === meal; }); }
function newMeal(meal) {
  var p = NF.activePlan(S);
  var snack = NF.isSnack(meal);
  return { step: snack ? 2 : 1, meal: meal, bolus: snack ? 'snack' : null, units: p && p.doses[meal] ? p.doses[meal].units : 0, offset: '0', q: '', foodId: null, portion: snack ? 'usual' : null, decisions: {}, reasons: {}, newFood: null };
}
var A = {
  noop: function () { },
  page: function (v) { if (S.role === 'nurse') return; S.page = v; S.error = ''; S.foodOpen = null; }, /* sestra má jen zaučení; náhled telefonu neovládá */
  role: function (v) {
    if (['patient', 'doctor', 'nurse'].indexOf(v) < 0) return;
    S.role = v; S.error = ''; S.meal = null; S.ask = null; /* rozpracovaný zápis nepatří jiné roli (P5) */
    S.page = v === 'doctor' ? (S.draft ? 'enroll' : S.review ? 'review' : NF.activePlan(S) ? 'review' : 'enroll') : v === 'nurse' ? 'training' : 'today';
  },
  closeDrawer: function () { drawer = null; },
  openItem: function (v) { if (!drawer) drawerOpener = global.document && global.document.activeElement; drawer = 'item:' + v; },

  /* ordinace */
  wizardGo: function (v) { S.wizardStep = Number(v); },
  eligibility: function (v) { NF.setEligibility(S, v, !S.enrollment.criteria[v]); },
  startDraft: function () {
    if (S.draft) return;
    S.draft = NF.newDraft(S);
    var D = global.NutriFeeDemo;
    /* Startovní sada je stejná pro všechny: NutriFee navrhne, lékař škrtá nebo přidává (15 odst. 4). Dávky nepředvyplňujeme. */
    catalog().forEach(function (h) { if (h.default && NF.usable(S, h.item)) S.draft.habits.push(h.id); });
    ((D && D.instructionCatalog) || []).forEach(function (i) { if (i.default) S.draft.instructions.push({ id: i.id, value: i.value }); });
  },
  dose: function (v) { var p = v.split(':'); NF.setDose(S, p[0], Number(p[1])); },
  target: function (v) { var p = v.split(':'); if (S.draft) NF.setTarget(S.draft.targets, p[0], Number(p[1])); },
  revTarget: function (v) { var p = v.split(':'); if (S.review) NF.setTarget(S.review.newTargets, p[0], Number(p[1])); },
  revInstrToggle: function (v) {
    var D = global.NutriFeeDemo, c = ((D && D.instructionCatalog) || []).filter(function (x) { return x.id === v; })[0], r = S.review; if (!r) return;
    var has = r.newInstructions.some(function (x) { return x.id === v; });
    r.newInstructions = has ? r.newInstructions.filter(function (x) { return x.id !== v; }) : r.newInstructions.concat([{ id: v, value: c ? c.value : true }]);
  },
  revInstrValue: function (v) {
    var p = v.split(':'), D = global.NutriFeeDemo, c = ((D && D.instructionCatalog) || []).filter(function (x) { return x.id === p[0]; })[0], r = S.review; if (!r) return;
    var ex = r.newInstructions.filter(function (x) { return x.id === p[0]; })[0]; if (!ex || !c) return;
    ex.value = Math.max(0, Math.round((ex.value + Number(p[1]) * (c.step || 1)) * 10) / 10);
  },
  toggleHabit: function (v) { NF.toggleHabit(S, v); },
  instrToggle: function (v) {
    var D = global.NutriFeeDemo, c = ((D && D.instructionCatalog) || []).filter(function (x) { return x.id === v; })[0];
    var has = S.draft && S.draft.instructions.some(function (x) { return x.id === v; });
    NF.setInstruction(S, v, has ? null : (c ? c.value : true));
  },
  instrValue: function (v) {
    var p = v.split(':'), D = global.NutriFeeDemo, c = ((D && D.instructionCatalog) || []).filter(function (x) { return x.id === p[0]; })[0];
    var ex = S.draft.instructions.filter(function (x) { return x.id === p[0]; })[0]; if (!ex || !c) return;
    ex.value = Math.round((ex.value + Number(p[1]) * (c.step || 1)) * 10) / 10;
  },
  issuePlan: function () {
    var r = NF.issuePlan(S, catalog()); if (!r.ok) return fail(r.error);
    NF.handover(S);
    S.role = 'nurse'; S.page = 'training'; S.training = { result: null, steps: {}, previewPage: 'today' };
    toast('Plán ' + r.plan.id + ' je vydaný. Pacienta teď zaučí sestra.');
  },
  trainingCheck: function (v) { if (S.role !== 'nurse') return fail('Zaučení potvrzuje sestra.'); S.training.steps[v] = true; previewFor(v); }, /* nastaví, nepřepíná — pro kroky vyprávění (CH-4) */
  trainingStep: function (v) {
    if (S.role !== 'nurse') return fail('Zaučení vede sestra.');
    S.training.steps[v] = !S.training.steps[v];
    if (S.training.steps[v]) previewFor(v);
    if (S.training.result === 'done' && !NF.trainingItems(S).every(function (x) { return S.training.steps[x.id]; })) { S.training.result = null; S.training.reason = null; }
  },
  /* „Ukázat“: hodnota je bod zaučení (náhled i s ukázkovým jídlem), nebo přímo stránka (plan, today, safety). */
  trainingPreview: function (v) { if (!previewFor(v)) { S.training.previewPage = v; S.training.preview = null; } },
  trainingReason: function (v) { if (S.role !== 'nurse') return fail('Zaučení vede sestra.'); S.training.reason = S.training.reason === v ? null : v; if (S.training.result === 'failed') NF.finishTraining(S, 'failed', S.training.reason); },
  finishTraining: function (v) {
    if (v === 'reset') { var r0 = NF.finishTraining(S, null); if (!r0.ok) return fail(r0.error); toast('Výsledek zaučení je zrušený; můžete pokračovat.'); return; }
    var r = NF.finishTraining(S, v, S.training.reason || null); if (!r.ok) return fail(r.error);
    toast(v === 'done' ? 'Zaučení je dokončené a zapsané. Předejte telefon pacientovi.' : 'Zapsáno: zaučení se nezdařilo. Návyky pacientovi nezačnou platit; lékař to uvidí na kontrole.');
  },
  answerCheck: function (v) { S.onboarding.checkAnswer = v === 'reset' ? null : v; },
  confirmUnderstanding: function () {
    var p = NF.activePlan(S); if (p && !p.handedOver) NF.handover(S);
    var r = NF.confirmUnderstanding(S); if (!r.ok) return fail(r.error);
    S.page = 'today'; toast('Hotovo. Plán platí.');
  },

  /* pacient: dnes */
  illness: function (v) { NF.setIllness(S, v === 'on'); toast(v === 'on' ? 'Nemoc je označená. Pomáháme dál, jen jinak.' : 'Nemoc je ukončená. Rady zase platí naplno.'); },
  illnessCheck: function (v) { NF.illnessCheckin(S, v === 'better'); toast(v === 'better' ? 'Rádi to slyšíme. Rady zase platí naplno.' : 'Zeptáme se zítra. Pokyny lékaře máte nahoře.'); },
  basalOther: function () { S.basalOther = !S.basalOther; S.basalUnits = S.basalUnits != null ? S.basalUnits : NF.activePlan(S).doses.basal.units; },
  basalUnits: function (v) { S.basalUnits = Math.max(0, Math.min(60, (S.basalUnits != null ? S.basalUnits : NF.activePlan(S).doses.basal.units) + Number(v))); },
  basalYesterday: function (v) { var p = NF.activePlan(S); var r = NF.confirmBasal(S, v, undefined, p.doses.basal.time, NF.day(NF.addDays(S.clock, -1))); if (!r.ok) return fail(r.error); toast('Díky za doplnění. Včerejší bazál je zapsaný.'); },
  basalConfirm: function (v) { var r = NF.confirmBasal(S, v, v === 'other' ? S.basalUnits : v === 'none' ? null : undefined); if (!r.ok) return fail(r.error); S.basalOther = false; toast('Bazál je zapsaný.'); },
  startMeal: function (v) { if (S.role !== 'patient') return fail('Jídlo zapisuje pacient.'); var meal = v || V.mealNow(S); if (!validMeal(meal)) return fail('Neznámé jídlo dne.'); S.meal = newMeal(meal); S.page = 'meal'; S.error = ''; },
  mealRetro: function (v) { if (!validMeal(v) || NF.isSnack(v)) return fail('Neznámé jídlo dne.'); S.meal = newMeal(v); S.meal.retro = true; S.meal.at = null; S.ask = null; S.page = 'meal'; S.error = ''; },
  mealAt: function (v) { if (!needMeal()) return; S.meal.at = Number(v); },
  mealSkipAsk: function (v) { S.ask = S.ask && S.ask.meal === v ? null : { day: NF.day(S.clock), meal: v }; },
  mealSkip: function (v) { var p = v.split(':'); var r = NF.skipMeal(S, p[0], p[1]); S.ask = null; toast(r.warn ? 'Zapsáno. Inzulin bez jídla — podívejte se na pokyn lékaře „méně jídla než obvykle“.' : 'Zapsáno: dnes ' + NF.mealText(p[0], 'without') + '.'); },
  mealBolus: function (v) { if (!needMeal()) return; S.meal.bolus = v; S.meal.decisions = {}; S.meal.reasons = {}; },
  mealUnits: function (v) { if (!needMeal()) return; S.meal.units = Math.max(0, Math.min(60, S.meal.units + Number(v))); },
  mealTime: function (v) { if (!needMeal()) return; S.meal.offset = v; },
  mealStep: function (v) {
    if (!needMeal()) return;
    var m = S.meal, n = Number(v);
    if (n === 2 && !m.bolus) return fail('Vyberte, jak to je s inzulinem.');
    if (n === 2 && m.retro && m.at == null) return fail('Vyberte čas jídla.');
    if (n === 3 && (!m.foodId || !m.portion)) return fail(!m.foodId ? 'Vyberte jídlo.' : 'Vyberte porci.');
    m.step = n; S.error = '';
    if (n === 3 && m.retro) { var f2 = NF.foodById(S, m.foodId), ra = NF.adviseAfter(S, f2.id, m.meal, NF.retroAt(S, m.at)); NF.log(S, 'rada.zobrazena', f2.name + ' (zpětně)', { level: ra.conf.level, items: ra.items.map(function (i) { return { lever: i.lever, item: i.item }; }), retro: true }); return; }
    if (n === 3) { var f = NF.foodById(S, m.foodId), res = NF.advise(S, f.id, m.portion, m.bolus, m.meal); NF.log(S, 'rada.zobrazena', f.name, { level: res.conf.level, items: res.items.map(function (i) { return { lever: i.lever, item: i.item }; }), blocked: res.blocked.map(function (b) { return { lever: b.lever, reason: b.reason }; }), bolus: m.bolus, portion: m.portion, gate: res.gate }); }
  },
  mealFood: function (v) { if (!needMeal()) return; S.meal.foodId = v; S.meal.newFood = null; S.meal.decisions = {}; S.meal.reasons = {}; },
  mealNewFood: function () { if (!needMeal()) return; S.meal.newFood = S.meal.newFood || {}; },
  mealTag: function (v) { if (!needMeal()) return; var p = v.split(':'); S.meal.newFood = S.meal.newFood || {}; S.meal.newFood[p[0]] = p[1]; },
  mealSaveFood: function () { if (!needMeal()) return; var r = NF.addFood(S, S.meal.q, S.meal.newFood); if (!r.ok) return fail(r.error); S.meal.foodId = r.food.id; S.meal.newFood = null; S.meal.q = r.food.name; toast('Jídlo je ve vašem seznamu. Příště ho najdete pod „naposledy“.'); },
  mealPortion: function (v) { if (!needMeal()) return; S.meal.portion = v; S.meal.decisions = {}; S.meal.reasons = {}; },
  mealDecide: function (v) { if (!needMeal()) return; var p = v.split(':'); S.meal.decisions[p[0]] = p[1] === 'yes'; if (p[1] === 'yes') delete S.meal.reasons[p[0]]; },
  mealReason: function (v) { if (!needMeal()) return; var p = v.split(':'); S.meal.reasons[p[0]] = p[1]; },
  mealFinishOther: function () { if (!needMeal()) return; S.meal.finishOther = !S.meal.finishOther; },
  mealFinish: function (v) {
    if (!needMeal()) return;
    var m = S.meal, p = NF.activePlan(S), f = NF.foodById(S, m.foodId);
    if (!p) return fail('Není plán.'); if (!f) return fail('Vyberte jídlo.');
    var res = m.retro ? NF.adviseAfter(S, f.id, m.meal, NF.retroAt(S, m.at)) : NF.advise(S, f.id, m.portion, m.bolus, m.meal);
    var advice = res.items.map(function (it) { var d = m.decisions[it.lever]; return { lever: it.lever, item: it.item, accepted: d === true ? true : d === false ? false : null, reason: m.reasons[it.lever] || null }; });
    var confirmed = v === 'as' ? 'as' : v === 'other' ? 'other' : v === 'none' ? 'none' : v === 'unknown' ? 'unknown' : v === 'snack' ? 'snack' : 'as';
    var units = confirmed === 'as' ? p.doses[m.meal].units : confirmed === 'other' ? m.units : null;
    var at = m.retro ? NF.retroAt(S, m.at) : S.clock;
    var time = confirmed === 'none' || confirmed === 'unknown' || confirmed === 'snack' ? null : NF.fmtTime(NF.addMin(at, Number(m.offset || 0)));
    var draft = { meal: m.meal, foodId: f.id, portion: m.portion, bolusState: m.retro ? 'retro' : m.bolus, advice: advice, insulin: { confirmed: confirmed, units: units, time: time }, at: at, retro: !!m.retro };
    var src = NF.sensorSource ? NF.sensorSource(S, draft) : null;
    draft.points = src ? src.points : []; draft.importedAt = src ? src.importedAt : null;
    var r = NF.saveEpisode(S, draft); if (!r.ok) return fail(r.error);
    S.meal = null; S.page = 'today';
    var th = NF.thanks(S, r.episode);
    toast(th || (m.retro ? f.name + ' je zapsané k ' + NF.fmtTime(at) + '.' : f.name + ' je zapsané.'));
  },
  resultSeen: function (v) { NF.markResultSeen(S, v); },
  fixInsulinOpen: function (v) { S.fixInsulin = S.fixInsulin === v ? null : v; S.fixInsulinOther = false; S.fixInsulinUnits = null; },
  fixInsulinOther: function (v) { S.fixInsulinOther = !S.fixInsulinOther; var ep = S.episodes.filter(function (x) { return x.id === v; })[0]; S.fixInsulinUnits = ep ? ep.insulin.prescribed : 0; },
  fixInsulinUnits: function (v) { S.fixInsulinUnits = Math.max(0, Math.min(60, (S.fixInsulinUnits || 0) + Number(v))); },
  fixInsulin: function (v) {
    var p = v.split(':'); var r = NF.correctInsulin(S, p[0], p[1], p[1] === 'other' ? S.fixInsulinUnits : undefined); if (!r.ok) return fail(r.error);
    S.fixInsulin = null; S.fixInsulinOther = false; toast('Inzulin je opravený. Zápis se učí dál, do návrhu k dávce už nejde.');
  },
  openFood: function (v) { S.page = 'foods'; S.foodsSeg = 'all'; S.foodOpen = v; },
  milestoneClose: function (v) { NF.closeMilestone(S, v); },
  weekClose: function (v) { NF.closeWeek(S, v); },
  foodsSeg: function (v) { S.foodsSeg = v; S.foodOpen = null; },
  foodOpen: function (v) { S.foodOpen = S.foodOpen === v ? null : v; },
  previewTile: function (v) { S.previewTile = S.previewTile === v ? null : v; },
  toggleQuestion: function (v) {
    var i = S.questions.findIndex(function (q) { return q.text === v; });
    if (i >= 0) S.questions.splice(i, 1); else S.questions.push({ id: NF.uid('Q'), at: S.clock, text: v, suggested: true });
  },
  saveQuestion: function () {
    var t = (S.form && S.form.question) || ''; if (!t.trim()) return fail('Napište, co vás zajímá.');
    S.questions.push({ id: NF.uid('Q'), at: S.clock, text: t }); S.form.question = ''; toast('Otázka je uložená. Lékař ji uvidí na kontrole.');
  },

  /* lékař: kontrola */
  startReview: function () { var r = NF.startReview(S, catalog()); if (!r.ok) return fail(r.error); S.page = 'review'; },
  reviewStep: function (v) {
    var r = S.review, n = Number(v);
    if (n === 3 && !NF.reviewComplete(S)) return fail('Nejdřív rozhodněte všechny návrhy.');
    if (n === 4 && !S.review.planIssued) return fail('Nejdřív vydejte plán.');
    r.step = n; S.error = '';
  },
  reviewTile: function (v) { if (!S.review) return; S.review.tile = S.review.tile === v ? null : v; },
  propVerify: function (v) { if (reviewLocked()) return; var p = v.split(':'); S.review.verify[p[0]] = S.review.verify[p[0]] || {}; S.review.verify[p[0]][p[1]] = p[2] === 'yes'; },
  propVerifyAll: function (v) { if (reviewLocked()) return; NF.verifyAll(S, v); },
  propKeepAll: function () { if (reviewLocked()) return; if (S.role !== 'doctor') return fail('Rozhoduje lékař.'); NF.keepAll(S); },
  propSingle: function (v) { S.review.single = S.review.single || {}; S.review.single[v] = true; },
  propSwapTo: function (v) { var p = v.split(':'); S.review.swapTo = S.review.swapTo || {}; S.review.swapTo[p[0]] = p[1]; },
  acuteOpen: function () { drawer = 'acute'; },
  propUnits: function (v) { if (reviewLocked()) return; var p = v.split(':'); var pr = S.review.proposals.filter(function (x) { return x.id === p[0]; })[0]; if (!pr || !pr.dose) return; S.review.newDoses[pr.dose].units = Math.max(1, Math.min(60, S.review.newDoses[pr.dose].units + Number(p[1]))); },
  propOther: function (v) { S.review.other = S.review.other === v ? null : v; },
  propDecide: function (v) {
    if (reviewLocked()) return;
    var p = v.split(':'), pr = S.review.proposals.filter(function (x) { return x.id === p[0]; })[0]; if (!pr) return fail('Návrh nenalezen.');
    var branch = V.proposalBranch ? V.proposalBranch(S, pr) : null;
    if (!branch || branch.action === 'wait') return fail('Nejdřív u každého bodu označte, zda sedí, nebo nesedí.');
    var dec = { choice: p[1], branch: branch && branch.action, comment: (S.form && S.form['comment_' + pr.id]) || '' };
    if (branch.action === 'swap' && p[1] === 'agree') { var st = S.review.swapTo && S.review.swapTo[pr.id]; dec.swapTo = st === 'none' ? null : (st || NF.swapOptions(S, pr)[0] || null); }
    if (p[1] === 'agree' && pr.kind === 'dose' && (branch.action === 'up' || branch.action === 'down' || branch.action === 'free') && S.review.newDoses[pr.dose].units === NF.activePlan(S).doses[pr.dose].units) return fail('Nastavte novou dávku voličem.');
    if (p[1] === 'agree' && pr.kind === 'dose') {
      dec.units = S.review.newDoses[pr.dose].units;
      var cur = NF.activePlan(S).doses[pr.dose].units;
      /* Změna proti směru větve není souhlas s postupem; zapíše se jako „rozhodnuto jinak“ (6. 10. 2026). */
      if ((branch.action === 'up' && dec.units < cur) || (branch.action === 'down' && dec.units > cur)) { dec.choice = 'other'; dec.againstBranch = true; }
    }
    if (p[1] === 'reject' && !p[2]) return fail('Vyberte důvod zamítnutí.');
    if (p[2]) dec.reason = p[2];
    var r = NF.decideProposal(S, pr.id, dec); if (!r.ok) return fail(r.error);
    S.review.other = null; S.error = '';
  },
  propReopen: function (v) { if (reviewLocked()) return; delete S.review.decisions[v]; S.review.index = S.review.proposals.findIndex(function (x) { return x.id === v; }); },
  issueP2: function () {
    if (S.role !== 'doctor') return fail('Plán vydává lékař.');
    var res = NF.issueFromReview(S, catalog()); if (!res.ok) return fail(res.error);
    toast('Plán ' + res.plan.id + ' je vydaný. Předejte ho pacientovi.');
  },

  /* registr */
  regFilter: function (v) { var p = v.split(':'); S.reg = S.reg || {}; S.reg[p[0]] = S.reg[p[0]] === p[1] ? null : p[1]; },
  regComment: function () {
    var id = S.reg && S.reg.open, r = id && NF.item(S, id); if (!r) return;
    var c = (S.form && S.form['regcomment_' + id]) || ''; if (!c.trim()) return fail('Napište komentář.');
    var res = NF.decideItem(S, id, r.status, c, null, { comment: true }); if (!res.ok) return fail(res.error);
    S.form['regcomment_' + id] = ''; toast('Komentář je v historii položky. Stav položky se nemění.');
  },
  regOpen: function (v) { S.reg = S.reg || {}; S.reg.open = v; S.reg.editing = false; S.reg.params = null; S.reg.off = null; },
  regBranch: function (v) { var it = S.reg && NF.item(S, S.reg.open), kk = v.split(':'), b = it && it.postup && it.postup[kk[0]] && it.postup[kk[0]].branches && it.postup[kk[0]].branches[Number(kk[1])]; if (!b) return; S.reg.off = S.reg.off || {}; var cur = S.reg.off[v] != null ? S.reg.off[v] : !!b.off; S.reg.off[v] = !cur; },
  regEdit: function () { S.reg.editing = !S.reg.editing; },
  regParam: function (v) { var p = v.split(':'), it = S.reg && NF.item(S, S.reg.open); if (!it || !it.params || it.params[p[1]] == null) return; S.reg.params = S.reg.params || {}; var cur = S.reg.params[p[1]] != null ? S.reg.params[p[1]] : it.params[p[1]]; S.reg.params[p[1]] = NF.clampParam(it.id, p[1], Math.round((cur + Number(p[2])) * 100) / 100); },
  regDecide: function (v) {
    var id = S.reg && S.reg.open; if (!id) return;
    var r = NF.decideItem(S, id, v, (S.form && S.form['regcomment_' + id]) || '', v === 'edited' ? (S.reg.params || null) : null, v === 'edited' && S.reg.off ? { off: S.reg.off } : null);
    if (!r.ok) return fail(r.error);
    if (S.form) S.form['regcomment_' + id] = '';
    S.reg.params = null; S.reg.off = null; S.reg.editing = false;
    toast('Rozhodnutí je uložené a hned platí v aplikaci.');
  },
  exportTrace: function () { download('nutrifee-stopa.json', NF.exportTrace(S)); toast('Stopa je připravená ke stažení.'); },
  exportRegistry: function () { download('nutrifee-registr.json', JSON.stringify(S.registry, null, 2)); toast('Registr je připravený ke stažení.'); },
  traceOpen: function (v) { S.traceOpen = S.traceOpen === v ? null : v; }
};
NF.actions = A;

function download(name, text) {
  try {
    var blob = new global.Blob([text], { type: 'application/json;charset=utf-8' });
    var a = global.document.createElement('a'); a.href = global.URL.createObjectURL(blob); a.download = name; a.click(); global.URL.revokeObjectURL(a.href);
  } catch (err) { fail('Stažení není v tomto prostředí dostupné.'); }
}
function act(name, value) {
  var fn = A[name] || (NF.demoActions && NF.demoActions[name]);
  if (!fn) return;
  S.error = '';
  try { fn(value); }
  catch (err) {
    /* Výjimka v akci nesmí shodit aplikaci: zapíše se do stopy a zobrazí jako hláška (C4, 6. 10. 2026). */
    S.error = 'Tohle se nepovedlo. Zkuste to znovu, nebo se vraťte na Dnes.';
    try { NF.log(S, 'chyba.akce', name + ': ' + (err && err.message)); } catch (e2) { }
  }
  NF.save(S);
  try { NF.render(); }
  catch (err) {
    /* Když se obrazovka nedá vykreslit, vrátíme pacienta na Dnes místo prázdné stránky. */
    try { NF.log(S, 'chyba.vykresleni', name + ': ' + (err && err.message)); } catch (e3) { }
    S.meal = null; S.ask = null; S.page = S.role === 'doctor' ? 'enroll' : S.role === 'nurse' ? 'training' : 'today'; S.error = 'Obrazovku se nepodařilo zobrazit; vrátili jsme vás na začátek.';
    NF.save(S); NF.render();
  }
}

/* ---------- události ---------- */
if (global.document && global.document.addEventListener) {
  global.document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-action]');
    if (!b || b.disabled) return;
    act(b.dataset.action, b.dataset.value);
  });
  global.document.addEventListener('input', function (ev) {
    var k = ev.target.dataset && ev.target.dataset.bind; if (!k || ev.target.type === 'checkbox') return;
    bind(k, ev.target.value); NF.save(S);
    if (k === 'meal.q') NF.render();
  });
  global.document.addEventListener('change', function (ev) {
    var k = ev.target.dataset && ev.target.dataset.bind; if (!k) return;
    bind(k, ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value); NF.save(S); NF.render();
  });
  global.document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && drawer) { drawer = null; renderDrawer(); } });
}

NF.getState = function () { return S; };
NF.setState = function (next) { S = next; NF.save(S); NF.render(); };
NF.act = act;
NF.bindValue = function (k, v) { bind(k, v); NF.save(S); };
NF.reset = function () { S = NF.createState(); NF.save(S); NF.render(); };
global.NutriFeeApp = { getState: NF.getState, setState: NF.setState, act: act, bind: NF.bindValue, reset: NF.reset, render: function () { NF.render(); } };
NF.render();

})(typeof window !== 'undefined' ? window : globalThis);
