/* Vykreslení, akce a veřejné rozhraní makety.
   Sloty (role bar, demo lišta, průvodce) plní volitelná demonstrační vrstva.
   Bez ní se nic z nich nevykreslí a rozložení obrazovek se nemění. */
(function (global) {
'use strict';
var NF = global.NutriFee, V = NF.screens, e = NF.esc;
var S = NF.load();
var drawer = null;

/* ---------- sloty ---------- */
NF.slots = {};
NF.registerSlot = function (name, fn) { NF.slots[name] = fn; NF.render && NF.render(); };
function slot(name) {
  try { return NF.slots[name] ? NF.slots[name](S) : ''; }
  catch (err) { return ''; }
}

function toast(msg) { S.toast = msg; }
function fail(msg) { S.error = msg; }

/* ---------- vykreslení ---------- */
function content() {
  if (S.role === 'doctor') return V.doctor(S);
  if (S.role === 'nurse') return V.nurse(S);
  if (S.role === 'garant') return V.garant(S);
  return V.patient(S);
}

NF.render = function () {
  var root = global.document && global.document.getElementById('app');
  if (!root) return;
  var focused = global.document.activeElement && global.document.activeElement.id;
  var open = [];
  try {
    var ds = global.document.querySelectorAll('details[open]');
    for (var i = 0; i < ds.length; i++) {
      var sm = ds[i].querySelector('summary');
      if (sm) open.push(sm.textContent);
    }
  } catch (err) { /* prostředí bez DOM dotazů */ }

  root.innerHTML =
    '<a class="skip" href="#main">Přeskočit na obsah</a>' +
    '<header class="top">' +
    '<div class="brand"><span class="brandmark" aria-hidden="true">N</span>NutriFee</div>' +
    slot('rolebar') +
    slot('headerTools') +
    '</header>' +
    slot('banner') +
    '<main class="shell" id="main" tabindex="-1">' +
    (S.error ? '<div id="error" class="error" role="alert" tabindex="-1">' + e(S.error) + '</div>' : '') +
    content() +
    '<footer class="footer">NutriFee · rozhodovací maketa · syntetická data · verze pravidel z katalogu garanta<br>' +
    'Neodesílají se žádné zprávy, žádná data neopouštějí tento prohlížeč.</footer>' +
    '</main>';

  try {
    var d2 = global.document.querySelectorAll('details');
    for (var j = 0; j < d2.length; j++) {
      var s2 = d2[j].querySelector('summary');
      if (s2 && open.indexOf(s2.textContent) !== -1) d2[j].open = true;
    }
  } catch (err2) { /* prázdné */ }

  renderDrawer();
  if (focused) { var f = global.document.getElementById(focused); if (f && f.focus) f.focus({ preventScroll: true }); }
  if (S.toast) { showToast(S.toast); S.toast = ''; }
  if (NF.slots.afterRender) { try { NF.slots.afterRender(S); } catch (e3) { } }
};

function showToast(msg) {
  var el = global.document && global.document.getElementById('toast');
  if (!el) return;
  el.innerHTML = '<div class="toast" role="status">' + e(msg) + '</div>';
  if (global.setTimeout) global.setTimeout(function () { if (el) el.innerHTML = ''; }, 4000);
}

function renderDrawer() {
  var el = global.document && global.document.getElementById('overlay');
  if (!el) return;
  if (!drawer) { el.innerHTML = ''; return; }
  var body = '';
  if (drawer.indexOf('correct:') === 0) {
    var id = drawer.slice(8);
    var ep = S.episodes.filter(function (x) { return x.id === id; })[0];
    body = '<h2>Oprava popisu epizody ' + e(id) + '</h2>' +
      '<label class="field">Popis<textarea data-bind="edit.' + e(id) + '">' + e(ep ? ep.desc : '') + '</textarea></label>' +
      '<p class="small muted">Předchozí hodnota zůstane v historii epizody.</p>' +
      '<div class="actions">' + V.btn('Uložit opravu', 'saveCorrection', id, 'primary') + V.btn('Zrušit', 'closeDrawer', null, 'secondary') + '</div>';
  } else if (drawer === 'incident') {
    body = '<h2>Založit záznam incidentu</h2>' +
      '<p class="small muted">Modelová evidence. Nikam se neodesílá a maketa neurčuje povinnost regulatorního hlášení.</p>' +
      '<label class="field">Podnět<textarea data-bind="form.incidentText">' +
      e((S.form && S.form.incidentText) || (S.impulse ? S.impulse.text : '')) + '</textarea></label>' +
      '<div class="actions">' + V.btn('Založit záznam', 'createIncident', null, 'primary') + V.btn('Zrušit', 'closeDrawer', null, 'secondary') + '</div>';
  } else if (NF.slots.drawer) {
    body = NF.slots.drawer(S, drawer) || '';
    if (!body) { el.innerHTML = ''; drawer = null; return; }
  } else { el.innerHTML = ''; drawer = null; return; }
  el.innerHTML = '<div class="drawer"><section class="drawerpanel" role="dialog" aria-modal="true" aria-label="Podrobnosti">' +
    '<button type="button" class="btn secondary close" data-action="closeDrawer" aria-label="Zavřít">×</button>' + body + '</section></div>';
  var first = el.querySelector('button');
  if (first && first.focus) first.focus();
}
NF.openDrawer = function (name) { drawer = name; renderDrawer(); };
NF.closeDrawer = function () { drawer = null; renderDrawer(); };
NF.currentDrawer = function () { return drawer; };

/* ---------- vazba polí ---------- */
function bind(key, value) {
  var parts = String(key).split('.');
  if (parts[0] === 'form') { S.form = S.form || {}; S.form[parts[1]] = value; return; }
  if (parts[0] === 'draft' && S.draft) { S.draft[parts[1]] = value; return; }
  if (parts[0] === 'onboarding') { S.onboarding[parts[1]] = value; return; }
  if (parts[0] === 'edit') { S.edit = S.edit || {}; S.edit[parts[1]] = value; return; }
  if (parts[0] === 'decisionNotes') { S.decisionNotes = S.decisionNotes || {}; S.decisionNotes[parts[1]] = value; return; }
  if (parts[0] === 'ruleExamples') {
    var r = NF.ruleByKey(S, parts.slice(1).join('.'));
    if (r) r.examplesReviewed = !!value;
    return;
  }
  S[key] = value;
}

/* ---------- akce ---------- */
var A = {
  noop: function () { },
  page: function (v) { S.page = v; S.error = ''; },
  role: function (v) {
    S.role = v;
    S.page = v === 'doctor' ? (S.draft ? 'issue' : 'onepage')
      : v === 'nurse' ? 'training'
        : v === 'garant' ? 'catalog' : (NF.activePlan(S) ? 'today' : 'takeover');
  },
  closeDrawer: function () { drawer = null; },

  answerCheck: function (v) { S.onboarding.checkAnswer = v === 'reset' ? null : v; },
  wizardGo: function (v) { S.wizardStep = Number(v); },
  eligibility: function (v) {
    NF.setEligibility(S, v, !S.enrollment.criteria[v]);
  },
  setCompensation: function (v) { S.enrollment.compensation = v; },
  selectTask: function (v) {
    var D = global.NutriFeeDemo;
    var item = D && D.taskCatalog ? D.taskCatalog.filter(function (x) { return x.id === v; })[0] : null;
    var r = NF.assignTask(S, item);
    if (!r.ok) return fail(r.error);
    toast('Úkol je vybraný z katalogu.');
  },
  pickReason: function (v) { S.form = S.form || {}; S.form.reason = v; },
  trainingStep: function (v) {
    if (S.role !== 'nurse') return fail('Zaučení vede sestra.');
    S.training.steps[v] = !S.training.steps[v];
    if (S.training.result === 'done' && !NF.TRAINING.every(function (x) { return S.training.steps[x[0]]; })) S.training.result = null;
  },
  finishTraining: function (v) {
    if (v === 'done' && !NF.TRAINING.every(function (x) { return S.training.steps[x[0]]; })) {
      return fail('Zaučení nelze označit za dokončené, dokud některý bod chybí.');
    }
    var r = NF.finishTraining(S, S.role, v, v === 'failed' ? 'Pacient si zatím není jistý ovládáním; domluveno opakované zaučení.' : '');
    if (!r.ok) return fail(r.error);
    if (v === 'failed') toast('Zaučení nebylo dokončeno. Plán se nevydá a úkol se neaktivuje.');
    else toast('Zaučení je dokončené.');
  },
  confirmUnderstanding: function () {
    var p = NF.activePlan(S);
    if (p && !p.handedOver) NF.handover(S);
    var r = NF.confirmUnderstanding(S);
    if (!r.ok) return fail(r.error);
    S.page = 'today';
    toast('Hotovo. Odcházíš z ordinace s jedním aktivním úkolem.');
  },
  issuePlan: function () {
    var r = NF.issuePlan(S, S.role);
    if (!r.ok) return fail(r.error);
    NF.handover(S);
    S.role = 'patient'; S.page = 'takeover';
    toast('Plán P1 je vydaný a předaný pacientovi. Úkol se aktivuje po ověření porozumění.');
  },
  issueP2: function () {
    if (S.role !== 'doctor') return fail('Plán vydává lékař.');
    var choice = (S.form && S.form.choice) || '';
    if (!choice) return fail('Nejdřív vyber rozhodnutí.');
    if (choice === 'defer') return fail('Zvolil jsi „zatím nelze rozhodnout“. Nový plán se nevydává a stávající platí dál.');
    var D = global.NutriFeeDemo;
    if (!D || !D.issueSecondPlan) return fail('Vydání dalšího plánu je součástí demonstrační vrstvy.');
    if (!D.issueSecondPlan(S)) return fail('Další plán už byl vydaný, nebo chybí platný plán.');
    S.page = 'result';
    toast('P2 je vydaný. Historie P1 a jeho epizod zůstává beze změny.');
  },

  formSet: function (v) {
    var i = String(v).indexOf(':');
    S.form = S.form || {};
    S.form[v.slice(0, i)] = v.slice(i + 1);
  },
  pickConclusion: function (v) {
    var D = global.NutriFeeDemo;
    S.form = S.form || {};
    S.form.conclusion = D && D.conclusions ? D.conclusions[Number(v)] : '';
  },
  saveEpisode: function () {
    var f = S.form || {};
    if (!f.insulinReported) return fail('Vyber, jak to bylo s inzulinem. Můžeš zvolit i „nevím“.');
    if (f.insulinReported !== 'unknown' && !f.insulinTime) return fail('Doplň čas podání, nebo zvol „nevím“. Čas nedopočítáváme.');
    var at = S.clock;
    var r = NF.saveEpisode(S, {
      at: at, desc: f.desc == null ? 'Chléb, sýr a neslazený čaj; pacient uvádí obvyklou porci' : f.desc,
      usualPortion: true,
      insulinReported: f.insulinReported, insulinTime: f.insulinTime || null,
      circumstances: f.circumstances || '',
      points: [
        { min: 0, at: at, mmol: 7.2 }, { min: 30, at: at, mmol: 8.1 }, { min: 60, at: at, mmol: 9.6 },
        { min: 90, at: at, mmol: 8.8 }, { min: 120, at: at, mmol: 7.9 }
      ],
      importedAt: at
    });
    if (!r.ok) return fail(r.error);
    S.form = {};
    S.page = 'compare';
    toast('Epizoda ' + r.episode.id + ' je uložená. Opravit ji můžeš kdykoli.');
  },
  openCorrect: function (v) { drawer = 'correct:' + v; },
  saveCorrection: function (v) {
    var val = (S.edit || {})[v];
    if (val == null) return fail('Není co uložit.');
    var r = NF.correctEpisode(S, v, 'desc', val);
    if (!r.ok) return fail(r.error);
    drawer = null;
    toast('Oprava uložená. Předchozí hodnota zůstává v historii.');
  },
  completeTask: function () {
    var c = (S.form && S.form.conclusion) || '';
    var r = NF.completeTask(S, c);
    if (!r.ok) return fail(r.error);
    S.page = 'today';
    toast('Úkol je dokončený. Pro tento úkol už nemusíš nic zapisovat.');
  },

  saveQuestion: function () {
    var t = (S.form && S.form.question) || '';
    if (!t.trim()) return fail('Napiš, co tě zajímá.');
    S.questions.push({ id: NF.uid('Q'), at: S.clock, text: t, circumstance: (S.form && S.form.qcirc) || '' });
    S.form.question = '';
    toast('Otázka je uložená ke kontrole. Lékaři se neodeslala.');
  },
  unclear: function (v) { S.unclearBranch = v; },
  reportIllness: function () { NF.reportIllness(S); toast('Období nemoci je označené. Pozorování je pozastavené.'); },
  endIllness: function () { var r = NF.endIllness(S); if (!r.ok) return fail(r.error); toast('Období nemoci je ukončené.'); },
  setCause: function (v) { S.dataState.patientCause = v; },
  showContact: function () { S.contactShown = true; },

  setEvidence: function (v) { S.evidenceId = v; },
  interruptVisit: function () { S.visitInterrupted = true; toast('Kontrola je přerušená. Maketa přešla do bezpečnostního stavu.'); },
  resumeVisit: function () { S.visitInterrupted = false; },
  assessEvent: function (v) {
    var ev = (S.safetyEvents || []).filter(function (x) { return x.id === v; })[0];
    if (ev) ev.assessment = 'Vyhodnoceno na kontrole. Modelový záznam bez klasifikace závažnosti.';
    toast('Vyhodnocení je zaznamenané.');
  },
  setHelped: function (v) { S.decisions.helped = v; },
  print: function () { if (global.print) global.print(); },
  setDoseVariant: function (v) { S.doseVariant = v; },

  approveRule: function (v) {
    var r = NF.approveRule(S, S.role, v);
    if (!r.ok) return fail(r.error);
    toast('Verze ' + v + ' je modelově schválená. Nevydává tím žádný inzulinový plán.');
  },
  openRetire: function (v) { S.retireOpen = v; },
  closeRetire: function () { S.retireOpen = null; },
  retireRule: function (v) {
    var reason = (S.form && S.form.retireReason) || 'Formulace nejasně popisuje použití při nemoci.';
    var r = NF.retireRule(S, S.role, v, reason);
    if (!r.ok) return fail(r.error);
    S.retireOpen = null;
    S.lastRetire = v;
    toast('Pravidlo ' + v + ' je vyřazené z dalšího použití. Předpis plánu se nemění.');
  },
  openIncident: function () { drawer = 'incident'; },
  createIncident: function () {
    var txt = (S.form && S.form.incidentText) || (S.impulse ? S.impulse.text : '');
    if (!txt) return fail('Doplň podnět.');
    NF.addIncident(S, { source: 'interní test', report: txt, versions: ['R-SNIDANE v1'], role: S.garant.id });
    drawer = null;
    S.page = 'incidents';
    toast('Incident je zaznamenaný. Nikam se neodeslal.');
  },
  assessIncident: function (v) {
    var parts = String(v).split(':');
    var inc = S.incidents.filter(function (x) { return x.id === parts[0]; })[0];
    if (!inc) return;
    if (parts[1] === 'clinical') inc.clinical = 'Posouzeno: formulační problém bez zjištěné újmy. Klasifikaci závažnosti maketa neurčuje.';
    else inc.technical = 'Připravena verze v2 s doplněnou větou o nemoci. Nasazení mimo maketu.';
    if (inc.clinical !== 'neposouzeno' && inc.technical !== 'neřešeno') inc.state = 'vyřešeno v maketě';
  },

  decide: function (v) {
    var i = String(v).indexOf(':');
    S.decisions[v.slice(0, i)] = v.slice(i + 1);
  },
  exportNotes: function () {
    var lines = ['Poznámky z demonstrace — nejde o formální klinické schválení', ''];
    var D = global.NutriFeeDemo;
    ((D && D.decisionList) || []).forEach(function (it) {
      lines.push(it.title + ': ' + (S.decisions[it.key] || 'nerozhodnuto'));
      var n = (S.decisionNotes || {})[it.key];
      if (n) lines.push('  ' + n);
    });
    download('nutrifee-poznamky-demonstrace.txt', lines.join('\n'));
    toast('Poznámky jsou připravené ke stažení.');
  },

  openConcept: function () { S.conceptOpen = true; S.role = 'patient'; S.page = 'concept'; },
  closeConcept: function () { S.conceptOpen = false; S.role = 'garant'; S.page = 'protocol'; },
  conceptIllness: function () { S.conceptState = 'paused'; toast('Koncept je pozastavený. Není vypočtena žádná změna inzulinu.'); },
  resumeTask: function () {
    var r = NF.resumeTask(S, S.role, (S.form && S.form.resumeReason) || '');
    if (!r.ok) return fail(r.error);
    S.page = 'versions';
    toast('Úkol je obnovený. Pacient vidí důvod obnovení.');
  }
};
NF.actions = A;

function download(name, text) {
  try {
    var blob = new global.Blob([text], { type: 'text/plain;charset=utf-8' });
    var a = global.document.createElement('a');
    a.href = global.URL.createObjectURL(blob);
    a.download = name;
    a.click();
    global.URL.revokeObjectURL(a.href);
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
    var k = ev.target.dataset && ev.target.dataset.bind;
    if (!k || ev.target.type === 'checkbox') return;
    bind(k, ev.target.value);
    NF.save(S);
  });
  global.document.addEventListener('change', function (ev) {
    var k = ev.target.dataset && ev.target.dataset.bind;
    if (!k) return;
    bind(k, ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value);
    NF.save(S);
    NF.render();
  });
  global.document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && drawer) { drawer = null; renderDrawer(); return; }
    if (ev.key === 'Tab' && drawer) {
      var nodes = [].slice.call(global.document.querySelectorAll('#overlay button,#overlay a,#overlay input,#overlay textarea,#overlay select'))
        .filter(function (x) { return !x.disabled; });
      if (!nodes.length) return;
      var first = nodes[0], last = nodes[nodes.length - 1];
      if (ev.shiftKey && global.document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && global.document.activeElement === last) { ev.preventDefault(); first.focus(); }
    }
  });
}

/* ---------- veřejné rozhraní ---------- */
NF.getState = function () { return S; };
NF.setState = function (next) { S = next; NF.save(S); NF.render(); };
NF.act = act;
NF.bindValue = function (k, v) { bind(k, v); NF.save(S); };
NF.reset = function () { S = NF.createState(); NF.save(S); NF.render(); };
global.NutriFeeApp = {
  getState: NF.getState, setState: NF.setState, act: act, bind: NF.bindValue,
  reset: NF.reset, render: function () { NF.render(); }
};
NF.render();

})(typeof window !== 'undefined' ? window : globalThis);
