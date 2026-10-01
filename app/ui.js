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
function keepOpenDetails(root, html) {
  /* stav <details> se drží podle textu summary */
  var open = {};
  try { root.querySelectorAll('details[open] > summary').forEach(function (s) { open[s.textContent] = 1; }); } catch (err) { }
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
    '<main id="main" class="role-' + e(S.role) + '">' +
    (S.error ? '<div id="error" class="error" role="alert">' + e(S.error) + '</div>' : '') + content() + '</main>';
  var open = keepOpenDetails(root);
  if (typeof doc.createElement === 'function' && root.firstChild && root.innerHTML !== undefined && root.querySelectorAll) {
    var tmp = doc.createElement('div'); tmp.innerHTML = html;
    try {
      tmp.querySelectorAll('details').forEach(function (d) { var s = d.querySelector('summary'); if (s && open[s.textContent]) d.setAttribute('open', ''); });
      morphChildren(root, tmp);
    } catch (err) { root.innerHTML = html; }
  } else root.innerHTML = html;
  renderDrawer();
  if (S.toast) { showToast(S.toast); S.toast = ''; }
  if (NF.slots.afterRender) { try { NF.slots.afterRender(S); } catch (e3) { } }
};
function showToast(msg) {
  var el = global.document && global.document.getElementById('toast'); if (!el) return;
  el.innerHTML = '<div class="toast" role="status">' + e(msg) + '</div>';
  if (global.setTimeout) global.setTimeout(function () { el.innerHTML = ''; }, 4000);
}
function renderDrawer() {
  var el = global.document && global.document.getElementById('overlay'); if (!el) return;
  if (!drawer) { el.innerHTML = ''; return; }
  var body = '';
  if (drawer.indexOf('item:') === 0) body = V.itemDetail ? V.itemDetail(S, drawer.slice(5)) : '';
  else if (drawer === 'acute') body = V.acute ? V.acute(S) : '';
  else if (NF.slots.drawer) body = NF.slots.drawer(S, drawer) || '';
  if (!body) { el.innerHTML = ''; drawer = null; return; }
  el.innerHTML = '<div class="drawer"><section class="drawerpanel" role="dialog" aria-modal="true" aria-label="Podrobnosti">' +
    '<button type="button" class="btn sm close" data-action="closeDrawer" aria-label="Zavřít">×</button>' + body + '</section></div>';
}
NF.openDrawer = function (n) { drawer = n; renderDrawer(); };
NF.closeDrawer = function () { drawer = null; renderDrawer(); };
NF.currentDrawer = function () { return drawer; };

/* ---------- vazba polí ---------- */
function bind(key, value) {
  var parts = String(key).split('.');
  if (parts[0] === 'form') { S.form = S.form || {}; S.form[parts[1]] = value; return; }
  if (parts[0] === 'meal' && S.meal) { S.meal[parts[1]] = value; if (parts[1] === 'q') { S.meal.foodId = null; S.meal.newFood = null; } return; }
  if (parts[0] === 'draft' && S.draft) { S.draft[parts[1]] = value; return; }
  if (parts[0] === 'reg') { S.reg = S.reg || {}; S.reg[parts[1]] = value; return; }
  S[key] = value;
}

/* ---------- akce ---------- */
function catalog() { var D = global.NutriFeeDemo; return (D && D.habitCatalog) || []; }
function newMeal(meal) {
  var p = NF.activePlan(S);
  var snack = NF.isSnack(meal);
  return { step: snack ? 2 : 1, meal: meal, bolus: snack ? 'snack' : null, units: p && p.doses[meal] ? p.doses[meal].units : 0, offset: '0', q: '', foodId: null, portion: snack ? 'usual' : null, decisions: {}, reasons: {}, newFood: null };
}
var A = {
  noop: function () { },
  page: function (v) { S.page = v; S.error = ''; S.foodOpen = null; },
  role: function (v) {
    S.role = v; S.error = '';
    S.page = v === 'doctor' ? (S.draft ? 'enroll' : S.review ? 'review' : NF.activePlan(S) ? 'review' : 'enroll') : v === 'nurse' ? 'training' : 'today';
  },
  closeDrawer: function () { drawer = null; },
  openItem: function (v) { drawer = 'item:' + v; },

  /* ordinace */
  wizardGo: function (v) { S.wizardStep = Number(v); },
  eligibility: function (v) { NF.setEligibility(S, v, !S.enrollment.criteria[v]); },
  startDraft: function () { if (!S.draft) S.draft = NF.newDraft(S); },
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
    ex.value = Math.round((ex.value + Number(p[1]) * (c.step || 1)) * 10) / 10;
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
  trainingStep: function (v) {
    if (S.role !== 'nurse') return fail('Zaučení vede sestra.');
    S.training.steps[v] = !S.training.steps[v];
    var it = NF.trainingItems(S).filter(function (x) { return x.id === v; })[0];
    if (it && S.training.steps[v]) S.training.previewPage = it.page;
    if (S.training.result === 'done' && !NF.trainingItems(S).every(function (x) { return S.training.steps[x.id]; })) S.training.result = null;
  },
  trainingPreview: function (v) { S.training.previewPage = v; },
  finishTraining: function (v) { var r = NF.finishTraining(S, v); if (!r.ok) return fail(r.error); toast(v === 'done' ? 'Zaučení je dokončené. Pacient teď převezme plán.' : 'Zaučení nebylo dokončeno. Návyky nezačnou platit.'); },
  answerCheck: function (v) { S.onboarding.checkAnswer = v === 'reset' ? null : v; },
  confirmUnderstanding: function () {
    var p = NF.activePlan(S); if (p && !p.handedOver) NF.handover(S);
    var r = NF.confirmUnderstanding(S); if (!r.ok) return fail(r.error);
    S.page = 'today'; toast('Hotovo. Plán platí.');
  },

  /* pacient: dnes */
  illness: function (v) { NF.setIllness(S, v === 'on'); toast(v === 'on' ? 'Nemoc je označená. Pomáháme dál, jen jinak.' : 'Nemoc je ukončená. Rady zase platí naplno.'); },
  illnessCheck: function (v) { NF.illnessCheckin(S, v === 'better'); toast(v === 'better' ? 'Rádi to slyšíme. Rady zase platí naplno.' : 'Ozveme se zítra. Pokyny lékaře máš nahoře.'); },
  basalOther: function () { S.basalOther = !S.basalOther; S.basalUnits = S.basalUnits != null ? S.basalUnits : NF.activePlan(S).doses.basal.units; },
  basalUnits: function (v) { S.basalUnits = Math.max(0, (S.basalUnits != null ? S.basalUnits : NF.activePlan(S).doses.basal.units) + Number(v)); },
  basalYesterday: function (v) { var p = NF.activePlan(S); var r = NF.confirmBasal(S, v, undefined, p.doses.basal.time, NF.day(NF.addDays(S.clock, -1))); if (!r.ok) return fail(r.error); toast('Díky za doplnění. Včerejší bazál je zapsaný.'); },
  basalConfirm: function (v) { var r = NF.confirmBasal(S, v, v === 'other' ? S.basalUnits : v === 'none' ? null : undefined); if (!r.ok) return fail(r.error); S.basalOther = false; toast('Bazál je zapsaný.'); },
  startMeal: function (v) { S.meal = newMeal(v || V.mealNow(S)); S.page = 'meal'; S.error = ''; },
  mealRetro: function (v) { S.meal = newMeal(v); S.meal.retro = true; S.meal.at = null; S.ask = null; S.page = 'meal'; S.error = ''; },
  mealAt: function (v) { S.meal.at = Number(v); },
  mealSkipAsk: function (v) { S.ask = S.ask && S.ask.meal === v ? null : { day: NF.day(S.clock), meal: v }; },
  mealSkip: function (v) { var p = v.split(':'); var r = NF.skipMeal(S, p[0], p[1]); S.ask = null; toast(r.warn ? 'Zapsáno. Píchl sis inzulin bez jídla — podívej se na pokyn lékaře „snědl jsem méně“.' : 'Zapsáno, že jsi ' + NF.mealLabel(p[0]) + ' vynechal.'); },
  mealBolus: function (v) { S.meal.bolus = v; S.meal.decisions = {}; S.meal.reasons = {}; },
  mealUnits: function (v) { S.meal.units = Math.max(0, S.meal.units + Number(v)); },
  mealTime: function (v) { S.meal.offset = v; },
  mealStep: function (v) {
    var m = S.meal, n = Number(v);
    if (n === 2 && !m.bolus) return fail('Vyber, jak to je s inzulinem.');
    if (n === 2 && m.retro && m.at == null) return fail('Vyber, v kolik jsi jedl.');
    if (n === 3 && (!m.foodId || !m.portion)) return fail(!m.foodId ? 'Vyber jídlo.' : 'Vyber porci.');
    m.step = n; S.error = '';
    if (n === 3 && m.retro) { var f2 = NF.foodById(S, m.foodId), ra = NF.adviseAfter(S, f2.id, m.meal, NF.retroAt(S, m.at)); NF.log(S, 'rada.zobrazena', f2.name + ' (zpětně)', { level: ra.conf.level, items: ra.items.map(function (i) { return { lever: i.lever, item: i.item }; }), retro: true }); return; }
    if (n === 3) { var f = NF.foodById(S, m.foodId), res = NF.advise(S, f.id, m.portion, m.bolus, m.meal); NF.log(S, 'rada.zobrazena', f.name, { level: res.conf.level, items: res.items.map(function (i) { return { lever: i.lever, item: i.item }; }), blocked: res.blocked.map(function (b) { return { lever: b.lever, reason: b.reason }; }), bolus: m.bolus, portion: m.portion, gate: res.gate }); }
  },
  mealFood: function (v) { S.meal.foodId = v; S.meal.newFood = null; S.meal.decisions = {}; S.meal.reasons = {}; },
  mealNewFood: function () { S.meal.newFood = S.meal.newFood || {}; },
  mealTag: function (v) { var p = v.split(':'); S.meal.newFood = S.meal.newFood || {}; S.meal.newFood[p[0]] = p[1]; },
  mealSaveFood: function () { var r = NF.addFood(S, S.meal.q, S.meal.newFood); if (!r.ok) return fail(r.error); S.meal.foodId = r.food.id; S.meal.newFood = null; S.meal.q = r.food.name; toast('Jídlo je v tvém seznamu. Příště ho najdeš pod „naposledy“.'); },
  mealPortion: function (v) { S.meal.portion = v; S.meal.decisions = {}; S.meal.reasons = {}; },
  mealDecide: function (v) { var p = v.split(':'); S.meal.decisions[p[0]] = p[1] === 'yes'; if (p[1] === 'yes') delete S.meal.reasons[p[0]]; },
  mealReason: function (v) { var p = v.split(':'); S.meal.reasons[p[0]] = p[1]; },
  mealFinishOther: function () { S.meal.finishOther = !S.meal.finishOther; },
  mealFinish: function (v) {
    var m = S.meal, p = NF.activePlan(S), f = NF.foodById(S, m.foodId);
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
    var t = (S.form && S.form.question) || ''; if (!t.trim()) return fail('Napiš, co tě zajímá.');
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
  reviewTile: function (v) { S.review.tile = S.review.tile === v ? null : v; },
  propVerify: function (v) { var p = v.split(':'); S.review.verify[p[0]] = S.review.verify[p[0]] || {}; S.review.verify[p[0]][p[1]] = p[2] === 'yes'; },
  propVerifyAll: function (v) { NF.verifyAll(S, v); },
  propKeepAll: function () { if (S.role !== 'doctor') return fail('Rozhoduje lékař.'); NF.keepAll(S); },
  propSingle: function (v) { S.review.single = S.review.single || {}; S.review.single[v] = true; },
  propSwapTo: function (v) { var p = v.split(':'); S.review.swapTo = S.review.swapTo || {}; S.review.swapTo[p[0]] = p[1]; },
  acuteOpen: function () { drawer = 'acute'; },
  propUnits: function (v) { var p = v.split(':'); var pr = S.review.proposals.filter(function (x) { return x.id === p[0]; })[0]; if (!pr || !pr.dose) return; S.review.newDoses[pr.dose].units = Math.max(0, S.review.newDoses[pr.dose].units + Number(p[1])); },
  propOther: function (v) { S.review.other = S.review.other === v ? null : v; },
  propDecide: function (v) {
    var p = v.split(':'), pr = S.review.proposals.filter(function (x) { return x.id === p[0]; })[0];
    var branch = V.proposalBranch ? V.proposalBranch(S, pr) : null;
    if (!branch || branch.action === 'wait') return fail('Nejdřív u každého bodu označte, zda sedí, nebo nesedí.');
    var dec = { choice: p[1], branch: branch && branch.action, comment: (S.form && S.form['comment_' + pr.id]) || '' };
    if (branch.action === 'swap' && p[1] === 'agree') { var st = S.review.swapTo && S.review.swapTo[pr.id]; dec.swapTo = st === 'none' ? null : (st || NF.swapOptions(S, pr)[0] || null); }
    if (p[1] === 'agree' && pr.kind === 'dose' && (branch.action === 'up' || branch.action === 'down' || branch.action === 'free') && S.review.newDoses[pr.dose].units === NF.activePlan(S).doses[pr.dose].units) return fail('Nastavte novou dávku voličem.');
    if (p[1] === 'agree' && pr.kind === 'dose') dec.units = S.review.newDoses[pr.dose].units;
    if (p[1] === 'reject' && !p[2]) return fail('Vyberte důvod zamítnutí.');
    if (p[2]) dec.reason = p[2];
    var r = NF.decideProposal(S, pr.id, dec); if (!r.ok) return fail(r.error);
    S.review.other = null; S.error = '';
  },
  propReopen: function (v) { delete S.review.decisions[v]; S.review.index = S.review.proposals.findIndex(function (x) { return x.id === v; }); },
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
    var res = NF.decideItem(S, id, r.status, c); if (!res.ok) return fail(res.error);
    S.form['regcomment_' + id] = ''; toast('Komentář je v historii položky.');
  },
  regOpen: function (v) { S.reg = S.reg || {}; S.reg.open = v; S.reg.editing = false; S.reg.params = null; },
  regEdit: function () { S.reg.editing = !S.reg.editing; },
  regParam: function (v) { var p = v.split(':'), it = NF.item(S, S.reg.open); if (!it || it.params[p[1]] == null) return; S.reg.params = S.reg.params || {}; var cur = S.reg.params[p[1]] != null ? S.reg.params[p[1]] : it.params[p[1]]; S.reg.params[p[1]] = Math.round((cur + Number(p[2])) * 100) / 100; },
  regDecide: function (v) {
    var id = S.reg && S.reg.open; if (!id) return;
    var r = NF.decideItem(S, id, v, (S.form && S.form['regcomment_' + id]) || '', v === 'edited' ? (S.reg.params || null) : null);
    if (!r.ok) return fail(r.error);
    if (S.form) S.form['regcomment_' + id] = '';
    S.reg.params = null; S.reg.editing = false;
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
  fn(value);
  NF.save(S);
  NF.render();
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
