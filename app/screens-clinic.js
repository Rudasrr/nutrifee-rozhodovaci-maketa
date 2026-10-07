/* Obrazovky lékaře (= garanta) a sestry — desktop. Podle 15-ZDROJ-PRAVDY-MAKETA.md.
   Kontrola je vedené flow o čtyřech krocích; každý krok má jedno primární tlačítko. */
(function (global) {
'use strict';
var NF = global.NutriFee, V = NF.screens, e = NF.esc;
var btn = V.btn, choice = V.choice, hint = V.hint, kv = V.kv, card = V.card, tag = V.tag, appr = V.appr;

function rail(S, items, who) {
  return '<nav class="rail" aria-label="Nabídka"><div class="brand"><span class="brandmark">N</span>NutriFee</div>' + items.map(function (it) {
    return '<button type="button" class="nav ' + (S.page === it[0] ? 'active' : '') + '" data-action="page" data-value="' + it[0] + '"' + (S.page === it[0] ? ' aria-current="page"' : '') + '><span class="ic" aria-hidden="true">' + it[2] + '</span>' + e(it[1]) + '</button>';
  }).join('') + '<div class="who">' + e(who) + '<br><span class="demo-flag">DEMO · syntetická data</span></div></nav>';
}
function pagehead(eyebrow, h1, sub, right) {
  return '<div class="pagehead"><div><p class="eyebrow">' + e(eyebrow) + '</p><h1>' + e(h1) + '</h1>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>' + (right || '') + '</div>';
}
function nextbar(text, small, button) {
  return '<div class="nextbar"><div class="txt"><b>' + text + '</b>' + (small ? '<small>' + small + '</small>' : '') + '</div>' + button + '</div>';
}

/* ---------- lékař ---------- */
V.doctor = function (S) {
  var items = [['enroll', 'Zařazení a plán', '▤'], ['review', 'Kontrola', '◔'], ['registry', 'Schvalovací registr', '✓'], ['trace', 'Verze a stopa', '≡']];
  var body;
  switch (S.page) {
    case 'review': body = V.review(S); break;
    case 'registry': body = V.registry(S); break;
    case 'trace': body = V.trace(S); break;
    default: body = V.enroll(S);
  }
  return '<div class="app">' + rail(S, items, S.doctor.label) + '<div class="desk">' + body + '</div></div>';
};

/* --- zařazení a startovní plán (3 kroky) --- */
V.enroll = function (S) {
  var D = global.NutriFeeDemo, p = NF.activePlan(S), d = S.draft;
  if (!d && p) {
    return pagehead('Pacient je zařazený', 'Plán ' + p.id + ' platí', 'Vydán ' + e(NF.fmtDate(p.issuedAt)) + ' · platnost do ' + e(NF.fmtShort(p.validUntil))) +
      card('<div class="grid2"><div><h2>Dávky inzulinu</h2>' + V.dosesTable(p) + '</div><div><h2>Návyky</h2><ul class="plain">' + S.habits.filter(function (h) { return h.planId === p.id; }).map(function (h) { return '<li><b>' + e(h.title) + '</b> ' + tag(h.state === 'active' ? 'platí' : h.state === 'prepared' ? 'čeká na zaučení' : h.state, h.state === 'active' ? 'ok' : 'warn') + '</li>'; }).join('') + '</ul>' + (function () { var ts = NF.trainingSummary(S); return '<p class="small" style="margin-top:8px">' + tag(ts.state === 'done' ? 'zaučení hotovo' : ts.state === 'failed' ? 'zaučení se nezdařilo' : 'zaučení čeká', ts.state === 'done' ? 'ok' : ts.state === 'failed' ? 'bad' : 'warn') + ' ' + e(ts.text) + '</p>'; })() + '</div></div>' +
        '<div class="actions">' + btn('Otevřít kontrolu →', 'page', 'review', 'primary') + '</div>') +
      hint('<b>Mezi kontrolami tu není co dělat.</b> Pacient zapisuje, aplikace se učí a radí. Vše uvidíte v reportu na kontrole.', 'sand');
  }
  if (!d) {
    return pagehead('V ordinaci · ' + NF.fmtDate(S.clock), 'Nový pacient', 'Zařazení a startovní plán ve třech krocích. Nic se nepíše, jen potvrzuje a volí.') +
      card('<div class="actions" style="margin:0">' + btn('Připravit zařazení →', 'startDraft', null, 'primary') + '</div>');
  }
  var step = S.wizardStep || 0;
  var steps = ['Zařazení', 'Dávky, návyky a pokyny', 'Vydání plánu'];
  var out = pagehead('V ordinaci · ' + NF.fmtDate(S.clock), 'Zařazení a startovní plán') +
    '<div class="wsteps">' + steps.map(function (t, i) { return '<button type="button" class="' + (i === step ? 'now' : i < step ? 'done' : '') + '" data-action="wizardGo" data-value="' + i + '"><span class="n">' + (i < step ? '✓' : i + 1) + '</span>' + e(t) + '</button>'; }).join('') + '</div>';
  if (step === 0) {
    var en = S.enrollment, ctx = (D && D.patientContext) || [];
    out += card('<h2>1 · Karta pacienta</h2><p class="muted">Načteno z karty. Nic se nepřepisuje.</p>' + ctx.map(function (r) { return kv(r[0], e(r[1])); }).join('')) +
      card('<h2>2 · Podmínky zařazení</h2><p class="muted">Aplikace stojí na pevné dávce inzulinu. Bez všech čtyř podmínek nedává smysl.</p>' +
        NF.ELIGIBILITY.map(function (c) { var fromCard = D && D.cardEligibility && D.cardEligibility.indexOf(c[0]) >= 0; return '<label class="check"><input type="checkbox" data-action="eligibility" data-value="' + c[0] + '"' + (en.criteria[c[0]] ? ' checked' : '') + '><span>' + e(c[1]) + (fromCard ? ' ' + tag('z karty: splněno', 'info') : '') + '</span></label>'; }).join('') +
        (en.eligible ? hint('Všechny podmínky potvrzené. ' + appr(S, 'K-KRITERIA'), 'ok') : hint('Potvrďte všechny čtyři podmínky (karta je dokládá, potvrzení je vaše). Dokud některá chybí, pokračovat nejde.', 'warn')));
    out += nextbar('Další krok: dávky, návyky a pokyny', en.eligible ? '' : 'Odemkne se po potvrzení všech podmínek.', btn('Pokračovat →', 'wizardGo', '1', 'primary', en.eligible ? '' : ' disabled'));
    return out;
  }
  if (step === 1) {
    var hc = (D && D.habitCatalog) || [], ic = (D && D.instructionCatalog) || [];
    out += card('<h2>1 · Dávky inzulinu</h2><p class="muted">Zadejte voličem podle svého předpisu — aplikace žádnou výši nenabízí. Pacientovi je bude připomínat a ptát se na podání. Nikdy je nepočítá ani nemění.</p>' +
      '<div class="dose-grid"><div class="dose-group"><div class="gk">Prandiální inzulin · k jídlu</div><div class="dose-row">' + [['breakfast', 'Snídaně'], ['lunch', 'Oběd'], ['dinner', 'Večeře']].map(function (x) {
        return '<div class="dose"><div class="k">' + e(x[1]) + '</div><div class="stepper">' + btn('−', 'dose', x[0] + ':-1', '', ' aria-label="méně"') + '<span class="val">' + (d.doses[x[0]].units ? d.doses[x[0]].units + ' j.' : '<small>nastavte</small>') + '</span>' + btn('+', 'dose', x[0] + ':1', '', ' aria-label="více"') + '</div></div>';
      }).join('') + '</div></div>' +
      '<div class="dose-group basal"><div class="gk">🌙 Bazální inzulin · na noc</div><div class="dose-row"><div class="dose"><div class="k">Bazál · ' + e(d.doses.basal.time) + '</div><div class="stepper">' + btn('−', 'dose', 'basal:-1', '', ' aria-label="méně"') + '<span class="val">' + (d.doses.basal.units ? d.doses.basal.units + ' j.' : '<small>nastavte</small>') + '</span>' + btn('+', 'dose', 'basal:1', '', ' aria-label="více"') + '</div></div></div></div></div>' +
      '<label class="check" style="margin-top:12px"><input type="checkbox" data-bind="draft.medicationChecked"' + (d.medicationChecked ? ' checked' : '') + '><span>Dávky jsou s pacientem ověřené a pacient bere jen inzulin (žádná perorální antidiabetika).</span></label>');
    out += card('<h2>2 · Startovní návyky</h2><p class="muted">NutriFee navrhla stejnou startovní sadu pro všechny pacienty. Škrtněte nebo přidejte. ' + appr(S, 'R-NAVYKY') + '</p>' +
      '<div style="display:grid;gap:8px">' + hc.filter(function (h) { return NF.usable(S, h.item); }).map(function (h) {
        var on = d.habits.indexOf(h.id) >= 0;
        return '<button type="button" class="habit-opt ' + (on ? 'on' : '') + '" data-action="toggleHabit" data-value="' + h.id + '" aria-pressed="' + on + '"><span class="dot">' + (on ? '✓' : '') + '</span><span><b>' + e(h.title) + '</b>' + (h.default ? ' ' + tag('startovní sada', 'info') : '') + '<small>' + e(h.why) + '</small></span></button>';
      }).join('') + '</div>');
    out += card('<h2>3 · Osobní pokyny pro pacienta</h2><p class="muted">Připravené věty, hodnoty volíte. Pacient je uvidí v Bezpečí a při nemoci nahoře na Dnes. ' + appr(S, 'R-POKYNY') + '</p>' +
      ic.map(function (c) {
        var ex = d.instructions.filter(function (x) { return x.id === c.id; })[0];
        return '<div class="instr"><label class="check" style="padding:0"><input type="checkbox" data-action="instrToggle" data-value="' + c.id + '"' + (ex ? ' checked' : '') + '><span><b>' + e(c.title) + '</b><br><span class="small muted">' + (c.text || '').replace('{v}', '<b>' + (ex ? e(String(ex.value).replace('.', ',')) : e(String(c.value).replace('.', ','))) + (c.unit ? ' ' + e(c.unit) : '') + '</b>') + '</span></span></label>' +
          (ex && typeof c.value === 'number' ? '<div class="stepper">' + btn('−', 'instrValue', c.id + ':-1', '', ' aria-label="méně"') + '<span class="val">' + e(String(ex.value).replace('.', ',')) + '<small>' + e(c.unit || '') + '</small></span>' + btn('+', 'instrValue', c.id + ':1', '', ' aria-label="více"') + '</div>' : '<span></span>') + '</div>';
      }).join('') +
      '<h3 style="margin-top:16px">Cíle glukózy</h3><p class="muted small">Výchozí hodnoty z registru; u pacienta je můžete upravit. Z nich vychází semafor v reportu a návrhy k dávce. ' + appr(S, 'C-CILE') + '</p>' + targetsGrid(d.targets, 'target') +
      '<label class="check" style="margin-top:12px"><input type="checkbox" data-bind="draft.instructionsChecked"' + (d.instructionsChecked ? ' checked' : '') + '><span>Pokyny jsou s pacientem probrané.</span></label>');
    var bl = NF.planBlockers(S);
    out += nextbar('Další krok: vydání plánu', bl.length ? 'Chybí: ' + e(bl.join(', ')) + '.' : 'Vše je připravené.', btn('Pokračovat →', 'wizardGo', '2', 'primary', bl.length ? ' disabled' : ''));
    return out;
  }
  var hc2 = (D && D.habitCatalog) || [];
  out += card('<h2>Shrnutí před vydáním</h2><div class="grid2"><div>' + kv('Plán', e(d.planId)) + kv('Platnost do', e(NF.fmtShort(d.validUntil))) +
    kv('Snídaně / oběd / večeře', d.doses.breakfast.units + ' / ' + d.doses.lunch.units + ' / ' + d.doses.dinner.units + ' j.') + kv('🌙 Bazál na noc', d.doses.basal.units + ' j. · ' + e(d.doses.basal.time)) +
    kv('Cíle glukózy', e(NF.mmol(d.targets.low)) + '–' + e(NF.mmol(d.targets.high)) + ' mmol/l · ráno do ' + e(NF.mmol(d.targets.fastingHigh))) + '</div>' +
    '<div><b>Návyky</b><ul class="plain small">' + d.habits.map(function (id) { var h = hc2.filter(function (x) { return x.id === id; })[0]; return '<li>' + e(h ? h.title : id) + '</li>'; }).join('') + '</ul><b>Pokyny</b>' + V.instructionsList(S, d, true) + '</div></div>') +
    hint('<b>Co se stane po vydání:</b> plán se předá sestře k zaučení. Návyky začnou pacientovi platit až po zaučení a jedné závěrečné otázce. Vy už mezi kontrolami nic neděláte.', 'sand');
  out += nextbar('Vydat plán ' + e(d.planId), 'Nevratný krok. Plán uvidí sestra a pacient.', btn('Vydat plán a předat sestře', 'issuePlan', null, 'primary'));
  return out;
};

/* Cíle glukózy voličem (15, odst. 4.6): rozmezí, ráno, cíl času v cíli. */
function targetsGrid(t, action) {
  var rows = [['low', 'Dolní cíl', 'mmol/l'], ['high', 'Horní cíl (po jídle)', 'mmol/l'], ['fastingHigh', 'Ráno nalačno do', 'mmol/l'], ['tirGoal', 'Čas v cíli alespoň', '%']];
  return '<div class="dose-row">' + rows.map(function (r) {
    return '<div class="dose"><div class="k">' + e(r[1]) + '</div><div class="stepper">' + btn('−', action, r[0] + ':-1', '', ' aria-label="méně"') + '<span class="val">' + e(String(t[r[0]]).replace('.', ',')) + '<small>' + e(r[2]) + '</small></span>' + btn('+', action, r[0] + ':1', '', ' aria-label="více"') + '</div></div>';
  }).join('') + '</div>';
}
/* Úprava pokynů při kontrole: stejný katalog jako při zařazení, vázaný na r.newInstructions. */
function reviewInstructions(S, r) {
  var D = global.NutriFeeDemo, ic = (D && D.instructionCatalog) || [];
  return '<div class="box" style="margin-top:10px"><div class="k">Pokyny pro příští období</div>' + ic.map(function (c) {
    var ex = r.newInstructions.filter(function (x) { return x.id === c.id; })[0];
    return '<div class="instr"><label class="check" style="padding:0"><input type="checkbox" data-action="revInstrToggle" data-value="' + c.id + '"' + (ex ? ' checked' : '') + '><span><b>' + e(c.title) + '</b></span></label>' +
      (ex && typeof c.value === 'number' ? '<div class="stepper">' + btn('−', 'revInstrValue', c.id + ':-1', '', ' aria-label="méně"') + '<span class="val">' + e(String(ex.value).replace('.', ',')) + '<small>' + e(c.unit || '') + '</small></span>' + btn('+', 'revInstrValue', c.id + ':1', '', ' aria-label="více"') + '</div>' : '<span></span>') + '</div>';
  }).join('') + '<div class="k" style="margin-top:10px">Cíle glukózy ' + appr(S, 'C-CILE') + '</div>' + targetsGrid(r.newTargets, 'revTarget') + '</div>';
}

/* --- kontrola: 4 kroky --- */
/* Semafor dlaždice: barva + znak + slovo (E7), aby stav nebyl jen barvou. */
var TILE_WORD = { 'c-ok': '✓ v cíli', 'c-warn': '! blízko cíle', 'c-bad': '✕ mimo cíl', 'c-none': '– bez dat' };
var TILE_WORD_ADV = { 'c-ok': '✓ ano', 'c-none': '– zatím ne' };
function tileBtn(S, key, k, v, d, cls, open) {
  var w = (key === 'adv' ? TILE_WORD_ADV : TILE_WORD)[cls] || '';
  return '<button type="button" class="tile ' + cls + (open ? ' open' : '') + '" data-action="reviewTile" data-value="' + key + '" aria-expanded="' + (open ? 'true' : 'false') + '"><div class="k"><i aria-hidden="true"></i>' + e(k) + (w ? ' <span class="st">· ' + e(w) + '</span>' : '') + '</div><div class="v">' + v + '</div><div class="d">' + e(d) + '</div></button>';
}
function leadSentence(S, s) {
  var parts = [];
  if (!s.meals) return 'Zatím žádné zápisy jídel.';
  parts.push(s.usualPct >= 80 ? 'Pacient jedl konzistentně (obvyklá porce u ' + s.usualPct + ' % jídel)' : 'Porce kolísaly (obvyklá jen u ' + s.usualPct + ' % jídel)');
  parts.push(s.asPct >= 80 ? 'inzulin potvrdil podle plánu u ' + s.asPct + ' % jídel' : 'inzulin podle plánu potvrdil jen u ' + s.asPct + ' % jídel');
  parts.push('rady k jídlu přijal ' + s.advice.accepted.n + '×, nepřijal ' + s.advice.declined.n + '×' + (s.advice.works === 'yes' ? ' (s radou bývalo níž, viz dlaždice)' : s.advice.works === 'few' ? ' (jestli s radou bývalo níž, zatím nelze říct)' : ' (s radou nebylo níž)'));
  if (s.sensor) parts.push('čas v cíli ' + s.sensor.tir + ' %' + (s.tirState === 'ok' ? ' — cíl splněn' : s.tirState === 'bad' ? ' — pod cílem' : ' — blízko cíle'));
  return parts.join(', ') + '.';
}
V.review = function (S) {
  var p = NF.activePlan(S), r = S.review, D = global.NutriFeeDemo;
  if (!p) return pagehead('Kontrola', 'Pacient zatím nemá plán') + card('<p>Nejdřív ho zařaďte.</p><div class="actions">' + btn('Zařazení →', 'page', 'enroll', 'primary') + '</div>');
  if (!r || NF.reviewClosed(S)) {
    var eps = NF.periodEpisodes(S, p.id);
    return pagehead('Kontrola · ' + NF.fmtDate(S.clock), 'Modelový pacient 01 · plán ' + p.id, 'Období ' + e(NF.fmtShort(p.issuedAt)) + ' – ' + e(NF.fmtShort(S.clock)) + ' · ' + NF.daysBetween(p.issuedAt, S.clock) + ' dní · ' + eps.length + ' zápisů') +
      card('<h2>Report se sestaví jedním klepnutím</h2><p class="muted">NutriFee připraví souhrn a návrhy na příští plán. Vy jen procházíte čtyři kroky: souhrn → návrhy → potvrzení → předání.</p><div class="actions" style="margin:0">' + btn('Zahájit kontrolu →', 'startReview', null, 'primary') + '</div>');
  }
  var s = r.summary, steps = [['Souhrn', s ? 'přečteno' : ''], ['Návrhy', Object.keys(r.decisions).length + ' z ' + r.proposals.length], ['Potvrdit plán', r.planIssued ? 'vydán' : ''], ['Předat pacientovi', '']];
  var out = '<div class="flow">' + steps.map(function (x, i) { var n = i + 1; return '<button type="button" class="step ' + (n === r.step ? 'now' : n < r.step ? 'done' : '') + '" data-action="reviewStep" data-value="' + n + '"' + (n === r.step ? ' aria-current="step"' : '') + '><span class="n">' + (n < r.step ? '✓' : n) + '</span>' + e(x[0]) + (x[1] ? '<small>' + e(x[1]) + '</small>' : '') + '</button>'; }).join('') + '</div>' +
    pagehead('Kontrola · ' + NF.fmtDate(S.clock), 'Modelový pacient 01 · plán ' + p.id, 'Období ' + e(NF.fmtShort(p.issuedAt)) + ' – ' + e(NF.fmtShort(r.startedAt)) + ' · ' + NF.daysBetween(p.issuedAt, r.startedAt) + ' dní · HbA1c ' + e((D && D.hba1c) ? D.hba1c.join(' → ') : '—') + ' mmol/mol',
      btn('Pacient má akutní problém →', 'acuteOpen', null, 'danger sm'));
  if (r.step === 1) out += reviewSummary(S, p, r);
  else if (r.step === 2) out += reviewProposals(S, p, r);
  else if (r.step === 3) out += reviewConfirm(S, p, r);
  else out += reviewHandover(S, p, r);
  return out;
};
function reviewSummary(S, p, r) {
  var s = r.summary, ss = s.sensor, D = global.NutriFeeDemo, t = NF.targets(S);
  var tiles = tileBtn(S, 'tir', 'Čas v cíli', ss ? ss.tir + ' <small>%</small>' : '—', ss ? 'cíl > ' + t.tirGoal + ' % · pod ' + NF.mmol(t.low) + ': ' + ss.below + ' %' : 'souhrn ze senzoru chybí', 'c-' + s.tirState, r.tile === 'tir') +
    tileBtn(S, 'usual', 'Obvyklá porce', s.usualPct == null ? '—' : s.usualPct + ' <small>%</small>', s.meals + ' jídel · ' + (s.meals - s.usual) + '× jinak' + (s.snacks ? ' · ' + NF.plural(s.snacks, 'svačina', 'svačiny', 'svačin') : ''), s.usualPct == null ? 'c-none' : s.usualPct >= 80 ? 'c-ok' : s.usualPct >= 60 ? 'c-warn' : 'c-bad', r.tile === 'usual') +
    tileBtn(S, 'ins', 'Inzulin podle plánu', s.asPct == null ? '—' : s.asPct + ' <small>%</small>', s.other + '× jinak · ' + s.none + '× bez inzulinu · ' + s.unknown + '× neví', s.asPct == null ? 'c-none' : s.asPct >= 80 ? 'c-ok' : s.asPct >= 60 ? 'c-warn' : 'c-bad', r.tile === 'ins') +
    tileBtn(S, 'adv', 'S radou bývalo níž?', s.advice.works === 'yes' ? 'ano' : s.advice.works === 'few' ? 'zatím nelze říct' : 'ne', 'přijato ' + s.advice.accepted.n + '× · nepřijato ' + s.advice.declined.n + '× · bez odpovědi ' + s.advice.noAnswer.n + '×', s.advice.works === 'yes' ? 'c-ok' : 'c-none', r.tile === 'adv') +
    (s.hba1c ? tileBtn(S, 'hba', 'HbA1c', s.hba1c[0] + ' → ' + s.hba1c[1], 'mmol/mol · ' + NF.fmtShort(p.issuedAt) + ' → ' + NF.fmtShort(r.startedAt), s.hba1c[1] < s.hba1c[0] ? 'c-ok' : s.hba1c[1] > s.hba1c[0] ? 'c-bad' : 'c-warn', r.tile === 'hba') : '') +
    tileBtn(S, 'ill', 'Mimo učení', s.illDays + (s.incomplete ? '<small>+' + s.incomplete + '</small>' : ''), NF.plural(s.illDays, 'den', 'dny', 'dní') + ' nemoci · ' + NF.plural(s.incomplete, 'zápis', 'zápisy', 'zápisů') + ' bez dat', s.illDays > 7 ? 'c-warn' : 'c-ok', r.tile === 'ill');
  var out = '<div class="tiles">' + tiles + '</div><p class="small muted" style="margin:4px 0 8px">Dlaždice vycházejí z: ' + appr(S, 'C-CILE') + ' ' + appr(S, 'S-SEMAFOR') + ' ' + appr(S, 'D-CISTA') + ' ' + appr(S, 'S-SOUHRN') + '</p>';
  if (r.tile) out += card(tileDetail(S, p, r, r.tile), 'soft');
  out += card('<p><b>Co se dělo:</b> ' + e(leadSentence(S, s)) + ' <span class="small muted">' + appr(S, 'S-SOUHRN') + '</span></p>', 'soft');
  out += '<h2 class="eyebrow" style="margin-top:22px">Podklady · jen když chcete víc</h2>' + podklady(S, p, r);
  out += nextbar('Další krok: návrhy na příští plán (' + r.proposals.length + ')', 'NutriFee připravila návrhy s důvodem a postupem ověření. Rozhodujete jeden po druhém.', btn('Pokračovat k návrhům →', 'reviewStep', '2', 'primary'));
  return out;
}
function tileDetail(S, p, r, key) {
  var s = r.summary, ss = s.sensor, t = NF.targets(S);
  if (key === 'tir') { var zel = NF.param(S, 'S-SEMAFOR', 'tir_zelena', t.tirGoal), zlu = NF.param(S, 'S-SEMAFOR', 'tir_zluta', 50), tbr = NF.param(S, 'S-SEMAFOR', 'tbr_max', 4), tbr3 = NF.param(S, 'S-SEMAFOR', 'tbr3_max', 1); return ss ? '<h3>Čas v cíli (TIR) ' + ss.tir + ' %</h3><p>Období ' + e(ss.period) + '. Pod ' + e(NF.mmol(t.low)) + ': ' + ss.below + ' % (cíl < ' + tbr + ' %), pod 3,0: ' + ss.veryLow + ' % (cíl < ' + tbr3 + ' %), nad ' + e(NF.mmol(t.high)) + ': ' + ss.above + ' %. Dostupnost dat ' + ss.availability + ' %.</p><p class="small muted">Semafor: zelená čas v cíli > ' + Math.max(zel, t.tirGoal) + ' % a pod ' + e(NF.mmol(t.low)) + ' < ' + tbr + ' %; žlutá čas v cíli ' + zlu + '–' + Math.max(zel, t.tirGoal) + ' %; červená čas v cíli < ' + zlu + ' % nebo pod ' + e(NF.mmol(t.low)) + ' ≥ ' + tbr + ' % nebo pod 3,0 ≥ ' + tbr3 + ' %. ' + appr(S, 'S-SEMAFOR') + ' ' + appr(S, 'C-CILE') + '</p>' : '<p>Souhrn ze senzoru není k dispozici.</p>'; }
  if (key === 'ill') return '<h3>Mimo učení: ' + NF.plural(s.illDays, 'den', 'dny', 'dní') + ' nemoci, ' + NF.plural(s.incomplete, 'zápis', 'zápisy', 'zápisů') + ' bez dat</h3><p>Zápisy z nemoci a bez dat ze senzoru se nepočítají do učení ani do návrhů k dávce.</p>' + (s.illLong ? hint('<b>Bezpečnost:</b> ' + NF.plural(s.illLong, 'období nemoci bylo delší', 'období nemoci byla delší', 'období nemoci bylo delších') + ' než ' + NF.param(S, 'P-NEMOC', 'dny', 3) + ' dny; pacient dostal kartu s vaším pokynem k trvání nemoci. ' + appr(S, 'P-NEMOC'), 'warn') : '<p class="small muted">Žádné období nemoci nepřesáhlo ' + NF.param(S, 'P-NEMOC', 'dny', 3) + ' dny. ' + appr(S, 'P-NEMOC') + '</p>');
  if (key === 'usual') return '<h3>Obvyklá porce u ' + s.usual + ' z ' + s.meals + ' jídel</h3><p>Obvyklá porce je množství, na které je nastavená pevná dávka. Jídla s jinou porcí se nepočítají do učení ani do návrhů k dávce — jinak by signál ukazoval na dávku, přestože příčina je v porci.</p>' + (s.snacks ? '<p class="small muted">Mimo hlavní jídla pacient zapsal ' + NF.plural(s.snacks, 'svačinu', 'svačiny', 'svačin') + ' (bez inzulinu k jídlu; do návrhů k dávce nevstupují).</p>' : '');
  if (key === 'hba') return '<h3>HbA1c ' + s.hba1c[0] + ' mmol/mol (' + e(NF.fmtShort(p.issuedAt)) + ') → ' + s.hba1c[1] + ' mmol/mol (' + e(NF.fmtShort(r.startedAt)) + ')</h3><p>Hodnota při zařazení z karty pacienta a hodnota z dnešní kontroly. Report ukazuje obě čísla s datem; co znamenají, posuzujete vy.</p>';
  if (key === 'ins') return '<h3>Potvrzení inzulinu</h3><p>Podle plánu ' + s.asPlan + '×, z toho včas (nejvýš ' + NF.tolerance(S).before + ' min před jídlem nebo ' + NF.tolerance(S).after + ' min po něm) ' + s.onTime + '×; jinak ' + s.other + '×, bez inzulinu ' + s.none + '×, neví ' + s.unknown + '×. Bazál potvrzen ' + s.basalAs + ' z ' + s.basalDays + ' dnů plánu.</p><p class="small muted">Do návrhů k dávce vstupují jen jídla s dávkou potvrzenou podle plánu a včas.</p>';
  if (key === 'adv') { var a = s.advice; return '<h3>Fungovaly rady?</h3><div class="bars">' + bar('přijato (' + a.accepted.n + ')', a.accepted.med, 'var(--ok)') + bar('nepřijato (' + a.declined.n + ')', a.declined.med, 'var(--bad)') + bar('bez odpovědi (' + a.noAnswer.n + ')', a.noAnswer.med, '#9fb3ad') + '</div><p class="small muted" style="margin-top:8px">Medián vrcholu glukózy po jídle. ' + (a.topReason ? 'Nejčastější důvod odmítnutí: „' + e(NF.reasonLabel(a.topReason)) + '“.' : '') + ' Srovnání z malého počtu zápisů jednoho pacienta ukazuje směr, nedokazuje účinek.</p>'; }
  if (key === 'ill') return '<h3>Co nejde do učení</h3><p>' + s.ill + ' zápisů z ' + s.illDays + ' dnů nemoci a ' + s.incomplete + ' zápisů s mezerou v datech ze senzoru. Zůstávají vidět, ale nepočítají se.</p>';
  return '';
}
function bar(label, med, color) {
  var w = med == null ? 0 : Math.max(8, Math.min(100, (med - 4) / 12 * 100));
  return '<span>' + e(label) + '</span><div class="b" style="width:' + w + '%;background:' + color + '">' + (med == null ? '—' : e(NF.mmol(med)) + ' mmol/l') + '</div>';
}
function podklady(S, p, r) {
  var s = r.summary, a = s.advice, t = NF.targets(S);
  var foods = S.foods.filter(function (f) { return NF.foodStats(S, f.id).eaten > 0; }).sort(function (x, y) { return NF.foodStats(S, y.id).eaten - NF.foodStats(S, x.id).eaten; });
  var out = '<details class="part"><summary>Reakce na jednotlivá jídla<span class="mini">' + foods.filter(function (f) { return NF.confidence(S, f.id).level === 'known'; }).length + ' známých · ' + foods.length + ' celkem</span></summary><div class="body"><div class="tablewrap"><table><thead><tr><th>Jídlo</th><th>Úroveň</th><th>Zapsáno</th><th>Reakce</th><th>V cíli</th><th>Vrchol</th><th>Co pomohlo</th></tr></thead><tbody>' +
    foods.slice(0, 12).map(function (f) {
      var c = NF.confidence(S, f.id), st = c.st, lev = c.level === 'known' ? NF.leverStats(S, f.id) : [];
      return '<tr><td><b>' + e(f.name) + '</b>' + (f.custom ? ' <span class="tag">vlastní</span>' : '') + '</td><td>' + V.levelTag(c.level) + '</td><td>' + st.eaten + '× · ' + st.n + ' započítáno</td><td>' + V.reactionTag(c.reaction) + '</td><td>' + (st.n ? st.inTarget + ' z ' + st.n : '—') + '</td><td>' + (st.n ? e(NF.mmol(st.lo)) + '–' + e(NF.mmol(st.hi)) : '—') + '</td><td>' + (lev.length ? lev.map(function (x) { return e(NF.LEVERS[x.lever].label) + ' (' + x.st.inTarget + ' z ' + x.st.n + ')'; }).join('<br>') : '—') + '</td></tr>';
    }).join('') + '</tbody></table></div><p class="small muted">Reakce = podíl zápisů s vrcholem pod ' + e(NF.mmol(t.high)) + ' mmol/l: mírná ≥ 80 %, střední ≥ 50 %, silná < 50 %. ' + appr(S, 'R-SKORE') + ' ' + appr(S, 'R-REAKCE') + '</p></div></details>';
  out += '<details class="part"><summary>Fungovaly rady<span class="mini">' + a.accepted.n + ' · ' + a.declined.n + ' · ' + a.noAnswer.n + ' bez odpovědi</span></summary><div class="body">' + tileDetail(S, p, r, 'adv') +
    '<div class="tablewrap" style="margin-top:10px"><table><thead><tr><th>Rada</th><th>Nabídnuto</th><th>Přijato</th><th>Odmítnuto</th><th>Důvody</th></tr></thead><tbody>' + Object.keys(a.byLever).map(function (l) { var b = a.byLever[l]; return '<tr><td>' + e(NF.LEVERS[l].label) + '</td><td>' + b.offered + '</td><td>' + b.accepted + '</td><td>' + b.declined + '</td><td>' + Object.keys(b.reasons).map(function (k) { return e(NF.reasonLabel(k)) + ' ' + b.reasons[k] + '×'; }).join(', ') + '</td></tr>'; }).join('') + '</tbody></table></div></div></details>';
  out += '<details class="part"><summary>Plán, dávky a jejich potvrzení<span class="mini">' + (s.asPct == null ? 'zatím bez zápisů' : s.asPct + ' % podle plánu') + '</span></summary><div class="body">' + tileDetail(S, p, r, 'ins') + V.dosesTable(p) + '</div></details>';
  out += '<details class="part"><summary>Senzor<span class="mini">' + (s.sensor ? 'TIR ' + s.sensor.tir + ' % · dostupnost ' + s.sensor.availability + ' %' : 'chybí') + '</span></summary><div class="body">' + tileDetail(S, p, r, 'tir') + '</div></details>';
  out += '<details class="part"><summary>Osobní pokyny<span class="mini">' + (p.instructions || []).length + '</span></summary><div class="body">' + V.instructionsList(S, p, false) + '</div></details>';
  var ts = NF.trainingSummary(S);
  out += '<details class="part"' + (ts.state === 'failed' ? ' open' : '') + '><summary>Zaučení u sestry<span class="mini">' + e(ts.state === 'done' ? 'hotovo' : ts.state === 'failed' ? 'nezdařilo se' : 'čeká') + '</span></summary><div class="body"><p>' + e(ts.text) + '</p>' + (ts.state === 'failed' ? hint('Návyky pacientovi neplatí; zápisy jsou jen záznam. Domluvte nové zaučení.', 'warn') : '') + '</div></details>';
  out += '<details class="part"><summary>Otázky pacienta<span class="mini">' + S.questions.length + '</span></summary><div class="body">' + (S.questions.length ? '<ul class="plain">' + S.questions.map(function (q) { return '<li>„' + e(q.text) + '“</li>'; }).join('') + '</ul>' : '<p class="muted">Pacient si žádnou otázku neuložil.</p>') + '</div></details>';
  return out;
}

/* Větev postupu podle toho, co lékař ověřil. */
V.proposalBranch = function (S, pr) {
  /* Tři stavy u každého bodu: neověřeno (undefined) → čeká; sedí (true); nesedí (false) → větev podle bodu. */
  var v = (S.review && S.review.verify[pr.id]) || {};
  var states = pr.verify.map(function (_, i) { return v[i]; });
  if (states.some(function (x) { return x === undefined; })) return { action: 'wait', text: 'dokončete ověření' };
  if (!pr.branches.length) return { action: 'free', text: 'postup není schválen — rozhodněte sami' };
  var firstNo = states.indexOf(false);
  if (firstNo === -1) return pr.branches[0];
  var m = pr.branches.filter(function (b) { return new RegExp('bod ' + (firstNo + 1) + '\\b.*nesedí').test(b.when); })[0];
  /* Pro bod, který postup nezná, aplikace větev nevymýšlí: řekne, že postup pro něj není (6. 10. 2026). */
  return m || { action: 'free', text: 'bod ' + (firstNo + 1) + ' nesedí — pro tento bod schválený postup nemá větev, rozhodněte sami' };
};
function reviewProposals(S, p, r) {
  var singles = r.proposals.filter(function (pr) { return NF.proposalIsSingle(S, pr); }), group = r.proposals.filter(function (pr) { return !NF.proposalIsSingle(S, pr); });
  var next = NF.nextProposal(S), decided = singles.filter(function (pr) { return r.decisions[pr.id]; }).length;
  var out = '<h2 style="margin-top:6px">Rozhodněte ' + NF.plural(singles.length, 'návrh', 'návrhy', 'návrhů') + (group.length ? ' a potvrďte ' + NF.plural(group.length, 'položku beze změny', 'položky beze změny', 'položek beze změny') : '') + '</h2><p class="muted">Jeden po druhém. U každého je důvod a postup ověření; primární tlačítko říká, co váš schválený postup doporučuje. Jiné rozhodnutí je pod odkazem. Co se nemění, potvrdíte najednou.</p>';
  singles.forEach(function (pr, i) {
    var dec = r.decisions[pr.id], now = !dec && next && pr.id === next.id;
    var cls = dec ? 'done' : now ? 'now' : 'locked';
    out += '<section class="prop ' + cls + '"><button type="button" class="bar" data-action="' + (dec && !r.planIssued ? 'propReopen' : 'noop') + '" data-value="' + pr.id + '"><span class="n">' + (dec ? '✓' : i + 1) + '</span><h3>' + e(pr.title) + '</h3><span class="state">' + (dec ? e(decisionLabel(dec)) + (r.planIssued ? '' : ' · změnit') : now ? 'rozhodujete teď' : 'čeká') + '</span></button>';
    if (now) out += proposalBody(S, p, r, pr);
    out += '</section>';
  });
  if (group.length) {
    var allDone = group.every(function (pr) { return r.decisions[pr.id]; });
    out += '<section class="prop group ' + (allDone ? 'done' : '') + '"><div class="bar"><span class="n">' + (allDone ? '✓' : group.length) + '</span><h3>Beze změny (' + group.length + ')</h3><span class="state">' + (allDone ? 'potvrzeno' : 'jedno potvrzení') + '</span></div>' +
      '<div class="body"><p class="muted small" style="margin-top:0">Tyto návrhy nic nemění; aplikace je jen připomíná. Potvrďte je najednou, nebo si kterýkoli rozhodněte zvlášť.</p><ul class="plain small">' +
      group.map(function (pr) { return '<li><b>' + e(pr.title) + '</b> — ' + e(pr.why) + ' ' + (r.decisions[pr.id] ? tag('potvrzeno', 'ok') : btn('Rozhodnout zvlášť', 'propSingle', pr.id, 'quiet sm')) + '</li>'; }).join('') + '</ul>' +
      (allDone ? '' : '<div class="actions">' + btn('Potvrdit vše beze změny', 'propKeepAll', null, singles.every(function (pr) { return r.decisions[pr.id]; }) ? 'primary' : '') + '<span class="rule">každá položka se zapíše do stopy zvlášť</span></div>') + '</div></section>';
  }
  var complete = NF.reviewComplete(S);
  out += nextbar(complete ? 'Všechny návrhy rozhodnuté' : next ? 'Další krok: rozhodnout návrh ' + (decided + 1) + ' z ' + singles.length : 'Další krok: potvrdit položky beze změny', complete ? 'Pokračujte k potvrzení plánu.' : 'Tlačítko se odemkne, až rozhodnete všechny návrhy.', btn('Pokračovat k potvrzení plánu →', 'reviewStep', '3', 'primary', complete ? '' : ' disabled'));
  return out;
}
function decisionLabel(dec) { return dec.choice === 'agree' ? 'souhlas' + (dec.units != null ? ' · ' + dec.units + ' j.' : '') : dec.choice === 'other' ? 'rozhodnuto jinak než postup' + (dec.units != null ? ' · ' + dec.units + ' j.' : '') : dec.choice === 'keep' ? 'ponechat' : 'zamítnuto'; }
function proposalBody(S, p, r, pr) {
  var v = r.verify[pr.id] || {}, br = V.proposalBranch(S, pr), wait = !br || br.action === 'wait';
  var units = pr.kind === 'dose' ? r.newDoses[pr.dose].units : null, cur = pr.kind === 'dose' ? p.doses[pr.dose].units : null;
  var free = !wait && br.action === 'free';
  var swapOpts = pr.lever ? NF.swapOptions(S, pr) : [], swapTo = (r.swapTo && r.swapTo[pr.id]) || swapOpts[0] || null;
  var against = !wait && pr.kind === 'dose' && ((br.action === 'up' && units < cur) || (br.action === 'down' && units > cur));
  var primary = wait ? 'Souhlasím (dokončete ověření)' : against ? 'Rozhodnout jinak než postup · nová dávka ' + units + ' j.' : br.action === 'up' || br.action === 'down' ? 'Souhlasím · nová dávka ' + units + ' j.' : (free && pr.kind === 'dose') ? 'Rozhodnout · nová dávka ' + units + ' j.' : br.action === 'swap' ? 'Souhlasím · vyměnit' + (swapTo ? ' za „' + NF.LEVERS[swapTo].label + '“' : ' (vypnout)') : free ? 'Rozhodnout' : 'Souhlasím · ' + (br.text || 'ponechat');
  var choiceVal = wait ? null : (br.action === 'up' || br.action === 'down' || br.action === 'swap' || br.action === 'edit' || free) ? 'agree' : 'keep';
  var showStepper = !wait && (br.action === 'up' || br.action === 'down' || (free && pr.kind === 'dose'));
  var allYes = pr.verify.every(function (_, i) { return v[i] === true; });
  var other = r.other === pr.id;
  return '<div class="body">' +
    '<div class="why"><b>Proč návrh vznikl:</b> ' + e(pr.why) + (pr.breakdown && pr.breakdown.length ? '<br><span class="small">Po jídlech: ' + pr.breakdown.map(function (b) { return e(b.food) + ' ' + b.above + ' z ' + b.n + ' nad cílem'; }).join(' · ') + '</span>' : '') + '</div>' +
    (pr.context ? '<div class="small" style="margin:4px 0"><b>Celkové vyrovnání:</b> ' + e(pr.context) + '</div>' : '') +
    (pr.weak.length ? '<div class="small muted">Návrh oslabuje: ' + e(pr.weak.join(' · ')) + (pr.excluded && pr.excluded.length ? ' <details class="more" style="display:inline-block"><summary>které</summary><ul class="plain small">' + pr.excluded.map(function (x) { return '<li>' + e(NF.fmtDateTime(x.at)) + ' · ' + e(x.why || 'bez důvodu') + '</li>'; }).join('') + '</ul></details>' : '') + '</div>' : '') +
    '<div class="grid2"><div class="box"><div class="k">1 · Ověřte s pacientem</div>' + (pr.verify.length > 1 ? '<div class="actions" style="margin:0 0 8px">' + btn('Vše sedí', 'propVerifyAll', pr.id, allYes ? 'sm' : 'sm primary') + '<span class="small muted">jednotlivé „nesedí“ přepněte níže</span></div>' : '') + pr.verify.map(function (t, i) { return '<div class="verify"><span>' + (i + 1) + '. ' + e(t) + '</span><span class="choice-row">' + choice('Sedí', 'propVerify', pr.id + ':' + i + ':yes', v[i] === true, 'sm') + choice('nesedí', 'propVerify', pr.id + ':' + i + ':no', v[i] === false, 'sm') + '</span></div>'; }).join('') + '</div>' +
    '<div class="box"><div class="k">2 · Váš schválený postup říká</div><div class="branch">' + pr.branches.map(function (b) { var hi = br && !wait && b === br; return '<div class="' + (hi ? 'hi' : '') + '">' + tag(b.action === 'up' ? 'zvýšit' : b.action === 'down' ? 'snížit' : b.action === 'swap' ? 'vyměnit' : b.action === 'edit' ? 'upravit' : 'ponechat', b.action === 'up' || b.action === 'down' ? 'warn' : b.action === 'swap' ? 'info' : '') + '<span>' + e(b.when) + ' → ' + e(b.text) + '</span></div>'; }).join('') +
    (wait ? '<div class="hi">' + tag('čeká') + '<span>dokončete ověření vlevo — postup vám pak řekne, co dál</span></div>' : free ? '<div class="hi">' + tag('bez postupu', 'warn') + '<span>' + e(br.text) + '</span></div>' : '') +
    (!wait && br.action === 'edit' ? reviewInstructions(S, r) : '') +
    (!wait && br.action === 'swap' && swapOpts.length ? '<div style="margin-top:10px"><div class="k">Místo ní nabízet</div><div class="choice-row">' + swapOpts.map(function (l) { return choice(e(NF.LEVERS[l].label), 'propSwapTo', pr.id + ':' + l, swapTo === l, 'sm'); }).join('') + choice('Jen vypnout', 'propSwapTo', pr.id + ':none', swapTo === null && r.swapTo && r.swapTo[pr.id] === 'none', 'sm') + '</div>' + (swapTo && NF.HABIT_OF[swapTo] ? '<p class="small muted" style="margin:6px 0 0">S touto radou přibude do plánu návyk „' + e(NF.LEVERS[swapTo].label) + '“.</p>' : '') + '</div>' : '') + '</div>' +
    '<div class="small muted" style="margin-top:8px">' + (pr.postup ? appr(S, pr.postup) + ' ' : '') + appr(S, pr.item) + (pr.kind === 'dose' ? ' · o kolik, volíte vy' : '') + '</div></div></div>' +
    '<div class="decide"><span class="lbl">3 · Rozhodnutí</span>' +
    (showStepper ? '<div class="stepper">' + btn('−', 'propUnits', pr.id + ':-1', '', ' aria-label="méně"') + '<span class="val">' + units + ' j.<small>dnes ' + cur + ' j.</small></span>' + btn('+', 'propUnits', pr.id + ':1', '', ' aria-label="více"') + '</div>' : '') +
    btn(e(primary), 'propDecide', pr.id + ':' + (choiceVal || 'agree'), against ? '' : 'primary', wait || (showStepper && units === cur) ? ' disabled' : '') +
    (against ? '<p class="small muted">Změna jde proti větvi vašeho postupu; zapíše se jako „rozhodnuto jinak než postup“.</p>' : '') +
    btn('Jiné rozhodnutí', 'propOther', pr.id, 'quiet') + '<span class="rule">rozhodnutí se zapíše do stopy</span></div>' +
    (showStepper && units === cur && !wait ? '<p class="small muted">Nastavte novou dávku voličem; aplikace ji nenavrhuje.</p>' : '') +
    (other ? '<div class="box"><div class="k">Jiné rozhodnutí</div><div class="choice-row">' + btn('Ponechat beze změny', 'propDecide', pr.id + ':keep', 'sm') + '</div>' +
      '<div class="small" style="margin:10px 0 4px"><b>Zamítnout s důvodem:</b></div><div class="choice-row">' + ['jiná příčina', 'pacient si nepřeje', 'počkat na další data', 'klinický důvod'].map(function (x) { return btn(e(x), 'propDecide', pr.id + ':reject:' + x, 'sm'); }).join('') + '</div>' +
      '<label class="field"><span>Komentář (nepovinný)</span><input data-bind="form.comment_' + pr.id + '" value="' + e((S.form && S.form['comment_' + pr.id]) || '') + '"></label></div>' : '') +
    '</div>';
}
function reviewConfirm(S, p, r) {
  var D = global.NutriFeeDemo, hc = (D && D.habitCatalog) || [];
  var nxt = r.planIssued ? NF.planById(S, r.planIssued) : NF.planFromReview(S);
  var prevPlan = r.planIssued ? NF.planById(S, nxt.previousId) : p;
  var habTitle = function (id) { var h = hc.filter(function (x) { return x.id === id; })[0]; return h ? h.title : id; };
  var habitsHtml = nxt.habits.map(function (id) { return '<li>' + e(habTitle(id)) + (prevPlan.habits.indexOf(id) < 0 ? ' ' + tag('nový', 'warn') : '') + '</li>'; }).join('') + prevPlan.habits.filter(function (id) { return nxt.habits.indexOf(id) < 0; }).map(function (id) { return '<li class="muted" style="text-decoration:line-through">' + e(habTitle(id)) + '</li>'; }).join('');
  var adv = nxt.advice || { off: [], prefer: [] };
  var adviceHtml = Object.keys(NF.LEVERS).filter(function (l) { return l !== 'portion'; }).map(function (l) { return '<li>' + e(NF.LEVERS[l].label) + ' ' + (!NF.usable(S, NF.LEVERS[l].item) ? tag('nepoužívá se (položka registru zamítnuta)', 'bad') : adv.off.indexOf(l) >= 0 ? tag('vypnuto', 'bad') : adv.prefer.indexOf(l) >= 0 ? tag('nabízet přednostně', 'info') : tag('nabízí se podle reakce')) + '</li>'; }).join('');
  var changes = ['basal', 'breakfast', 'lunch', 'dinner'].filter(function (k) { return nxt.doses[k].units !== prevPlan.doses[k].units; });
  var out = card('<h2>Shrnutí rozhodnutí</h2><ul class="plain">' + r.proposals.map(function (pr) { var d = r.decisions[pr.id]; return '<li><b>' + e(pr.title) + '</b> — ' + (d ? e(decisionLabel(d)) + (d.reason ? ' (' + e(d.reason) + ')' : '') + (d.comment ? ' · „' + e(d.comment) + '“' : '') : tag('nerozhodnuto', 'warn')) + '</li>'; }).join('') + '</ul>') +
    card('<h2>Nový plán ' + (r.planIssued || 'P' + (S.plans.length + 1)) + '</h2><div class="grid2"><div><b>Dávky</b>' + ['breakfast', 'lunch', 'dinner', 'basal'].map(function (k) { var ch = changes.indexOf(k) >= 0; return kv(k === 'basal' ? '🌙 Bazál na noc · ' + prevPlan.doses.basal.time : NF.mealLabel(k, true), (ch ? '<span class="muted" style="text-decoration:line-through">' + prevPlan.doses[k].units + '</span> → <b>' + nxt.doses[k].units + ' j.</b> ' + tag('změna', 'warn') : nxt.doses[k].units + ' j.')); }).join('') +
      (changes.length ? hint('Po změně dávky začne učení k radám u jídel znovu. Staré zápisy zůstanou označené původní dávkou.', 'sand') : '') + '</div>' +
      '<div><b>Návyky</b><ul class="plain small">' + habitsHtml + '</ul><b>Rady</b><ul class="plain small">' + adviceHtml + '</ul><b>Osobní pokyny</b> · ' + (r.decisions['PR-POKYNY'] ? e(decisionLabel(r.decisions['PR-POKYNY'])) : '') + V.instructionsList(S, nxt, true) + '</div></div>');
  out += nextbar(r.planIssued ? 'Plán ' + r.planIssued + ' je vydaný' : 'Vydat nový plán', r.planIssued ? 'Pokračujte k předání.' : 'Nevratný krok. Plán uvidí pacient.', r.planIssued ? btn('Ukázat pacientovi →', 'reviewStep', '4', 'primary') : btn('Vydat plán', 'issueP2', null, 'primary'));
  return out;
}
function reviewHandover(S, p, r) {
  return '<div class="split"><div>' + card('<h2>Předání pacientovi</h2><p>Pacient vidí na telefonu, co se změnilo a proč, a potvrdí převzetí. Tím kontrola končí. Do příští kontroly už nic neděláte.</p>' + kv('Příští kontrola', e(NF.fmtDate(S.nextVisit))) + '<div class="actions">' + btn('Zobrazit zařazení a plán', 'page', 'enroll', '') + '</div>') + '</div>' +
    '<div class="phone-preview"><div class="island"></div>' + V.patient(S, 'newplan') + '</div></div>';
}

/* --- schvalovací registr --- */
var ICONS = { kohorta: '👤', plan: '📋', vypocty: '∑', rady: '💡', skore: '◔', davka: '💉', pokyny: '🛡', zauceni: '🎓', jidla: '🍽', report: '📊', provoz: '⚙' };
V.registry = function (S) {
  var f = S.reg || {}, q = (f.q || '').toLowerCase();
  var sum = NF.registrySummary(S);
  var items = S.registry.items.filter(function (r) {
    var t = NF.itemTouched(S, r.id), hist = S.registry.history.filter(function (h) { return h.item === r.id; });
    var text = (r.title + ' ' + r.id + ' ' + r.summary + ' ' + (r.detail || '') + ' ' + (r.text || '') + ' ' + hist.map(function (h) { return h.comment; }).join(' ')).toLowerCase();
    var c = hist.some(function (h) { return h.comment; });
    return (!f.cat || r.cat === f.cat) && (!f.status || r.status === f.status) && (!f.touch || (f.touch === 'done' ? t : f.touch === 'todo' ? !t : f.touch === 'pending' ? (c && !t) : c)) && (!q || text.indexOf(q) >= 0);
  });
  var counts = { approved: 0, edited: 0, rejected: 0 }; S.registry.items.forEach(function (r) { counts[r.status]++; });
  var open = f.open ? NF.item(S, f.open) : null;
  var sumTile = function (k, v, d, cls, key) { return '<button type="button" class="tile ' + cls + (f.touch === key ? ' open' : '') + '" data-action="regFilter" data-value="touch:' + key + '"><div class="k"><i></i>' + e(k) + '</div><div class="v">' + v + '</div><div class="d">' + e(d) + '</div></button>'; };
  var out = pagehead('Lékař-garant', 'Schvalovací registr · potvrzeno ' + sum.confirmed + ' z ' + sum.total, 'Vše, co aplikace počítá, radí a navrhuje, stojí na těchto ' + S.registry.items.length + ' položkách. Výchozí stav „schváleno předem“ dal autor makety, aby ukázka fungovala celá; podpisem garanta je až „potvrzeno“. Garant položky prochází, potvrzuje, upravuje nebo zamítá — tady i přímo z obrazovek. Rozhodnutí platí okamžitě, komentář stav nemění, historie se uchovává.',
    '<div class="actions" style="margin:0">' + btn('Exportovat JSON', 'exportRegistry', null, 'sm') + '</div>') +
    '<div class="tiles" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">' + sumTile('Rozhodnuto', sum.touched + '<small>z ' + sum.total + '</small>', 'položek s rozhodnutím garanta', 'c-ok', 'done') + sumTile('Potvrzeno', String(sum.confirmed), 'beze změny nebo s úpravou', 'c-ok', 'done') + sumTile('Upraveno', String(sum.edited), 'parametry nebo text', 'c-warn', 'done') + sumTile('Zamítnuto', String(sum.rejected), 'aplikace položku nepoužívá', 'c-bad', 'done') + sumTile('Jen komentář', String(sum.pending), 'okomentováno, čeká na rozhodnutí', sum.pending ? 'c-warn' : 'c-none', 'pending') + sumTile('Zbývá', String(sum.remaining), 'schváleno předem, bez rozhodnutí garanta', sum.remaining ? 'c-warn' : 'c-ok', 'todo') + '</div>' +
    '<div class="filters"><input data-bind="reg.q" placeholder="Hledat v názvu, popisu, textu i komentářích…" value="' + e(f.q || '') + '">' + NF.CATS.map(function (c) { return choice(e(c[1]), 'regFilter', 'cat:' + c[0], f.cat === c[0], 'sm'); }).join('') + '</div>' +
    '<div class="filters">' + [['approved', 'schválené ' + counts.approved], ['edited', 'upravené ' + counts.edited], ['rejected', 'zamítnuté ' + counts.rejected]].map(function (x) { return choice(e(x[1]), 'regFilter', 'status:' + x[0], f.status === x[0], 'sm'); }).join('') + [['todo', 'zbývá potvrdit ' + sum.remaining], ['done', 'rozhodnuto ' + sum.touched], ['pending', 'jen komentář ' + sum.pending], ['commented', 's komentářem ' + sum.commented]].map(function (x) { return choice(e(x[1]), 'regFilter', 'touch:' + x[0], f.touch === x[0], 'sm'); }).join('') + '</div>' +
    '<div class="reg"><div class="card flat" style="padding:0;overflow:hidden">' + (items.length ? items.map(function (r) {
      return '<button type="button" class="reg-row ' + (open && open.id === r.id ? 'on' : '') + '" data-action="regOpen" data-value="' + r.id + '"><span class="ic" aria-hidden="true">' + (ICONS[r.cat] || '•') + '</span><span><span class="t">' + e(r.title) + '</span><br><span class="s">' + e(r.id) + ' · ' + e(NF.catLabel(r.cat)) + ' · ' + e(r.summary) + '</span></span>' + (NF.itemTouched(S, r.id) ? tag(r.status === 'approved' ? 'potvrzeno' : r.status === 'edited' ? 'potvrzeno s úpravou' : NF.STATUS[r.status], r.status === 'approved' ? 'ok' : r.status === 'edited' ? 'warn' : 'bad') : NF.itemCommented(S, r.id) ? tag('okomentováno · čeká', 'warn') : tag('schváleno předem · k potvrzení', '')) + '<span class="s">' + e(NF.fmtShort(r.decidedAt)) + '</span></button>';
    }).join('') : '<p class="muted" style="padding:16px">Nic neodpovídá filtru.</p>') + '</div>' +
    '<div class="reg-side">' + (open ? itemPanel(S, open) : card('<p class="muted">Klepněte na položku. Uvidíte, co přesně dělá, jaké má parametry, a můžete ji schválit, upravit nebo zamítnout — s komentářem, nebo bez něj.</p>')) + '</div></div>';
  return out;
};
function itemPanel(S, r) {
  var f = S.reg || {}, editing = f.editing, params = r.params || {}, keys = Object.keys(params);
  var pend = f.params || {};
  var hist = S.registry.history.filter(function (h) { return h.item === r.id; }).slice().reverse();
  return card('<p class="eyebrow">' + e(NF.catLabel(r.cat)) + ' · ' + e(r.id) + '</p><h2>' + e(r.title) + '</h2>' + tag(NF.STATUS[r.status], r.status === 'approved' ? 'ok' : r.status === 'edited' ? 'warn' : 'bad') +
    '<p style="margin-top:10px">' + e(r.summary) + '</p>' + (r.detail ? '<details class="more"><summary>Jak to přesně funguje</summary><p class="small" style="margin-top:6px">' + e(r.detail) + '</p></details>' : '') +
    itemTexts(r) +
    (keys.length ? '<div class="box" style="margin-top:10px"><div class="k">Parametry</div>' + keys.map(function (k) {
      var val = pend[k] != null ? pend[k] : params[k], step = (r.steps && r.steps[k]) || (Number.isInteger(params[k]) ? 1 : 0.05);
      return '<div class="instr"><span>' + e(paramLabel(r, k)) + '</span>' + (editing && typeof val === 'number' ? '<div class="stepper">' + btn('−', 'regParam', r.id + ':' + k + ':' + (-step), 'sm', ' aria-label="méně"') + '<span class="val">' + e(String(Math.round(val * 100) / 100).replace('.', ',')) + '</span>' + btn('+', 'regParam', r.id + ':' + k + ':' + step, 'sm', ' aria-label="více"') + '</div>' : '<b>' + e(String(val).replace('.', ',')) + '</b>') + '</div>';
    }).join('') + '</div>' : '') +
    itemPostup(S, r, editing) +
    (r.usedBy ? '<p class="small muted" style="margin-top:8px">Používá se: ' + e(r.usedBy) + '</p>' : '') +
    '<div class="divider"></div><h3>Rozhodnutí garanta</h3>' +
    '<label class="field"><span>Komentář (nepovinný)</span><input data-bind="form.regcomment_' + r.id + '" value="' + e((S.form && S.form['regcomment_' + r.id]) || '') + '"></label>' +
    '<div class="actions" style="margin-top:8px">' + btn(NF.itemTouched(S, r.id) && r.status === 'approved' ? 'Potvrdit znovu' : 'Potvrdit', 'regDecide', 'approved', r.status === 'approved' && !NF.itemTouched(S, r.id) ? 'primary sm' : 'sm') +
    (keys.length || r.postup ? (editing ? btn('Uložit úpravu', 'regDecide', 'edited', 'primary sm') : btn(r.postup && !keys.length ? 'Upravit větve' : 'Upravit parametry', 'regEdit', null, 'sm')) : '') +
    btn('Zamítnout', 'regDecide', 'rejected', 'danger sm') + btn('Jen komentář', 'regComment', null, 'sm quiet') + '</div>' +
    (r.status === 'rejected' ? hint('Položka je zamítnutá: aplikace ji přestala používat (rada zmizela, výpočet se neprovádí).', 'bad') : '') +
    '<details class="more" style="margin-top:12px"><summary>Historie rozhodnutí (' + hist.length + ')</summary><ul class="plain hist">' + (hist.length ? hist.map(function (h) { return '<li>' + e(NF.fmtDateTime(h.at)) + ' · ' + e(h.by) + ': ' + (h.kind === 'comment' ? 'komentář (stav beze změny)' : e(NF.STATUS[h.from.status] || h.from.status) + ' → <b>' + e(NF.STATUS[h.to.status]) + '</b>') + (JSON.stringify(h.from.params) !== JSON.stringify(h.to.params) ? ' · parametry ' + e(JSON.stringify(h.to.params)) : '') + (h.comment ? ' · „' + e(h.comment) + '“' : '') + '</li>'; }).join('') : '<li class="muted">Zatím beze změny od výchozího schválení.</li>') + '</ul></details>');
}
/* Český název parametru s jednotkou (F4): z položky, jinak klíč. */
function paramLabel(r, k) { return (r.labels && r.labels[k]) || k; }
/* Texty položky: jedna věta (text) nebo pojmenované šablony (texts). Zástupné hodnoty {…} zůstávají vidět. */
function itemTexts(r) {
  var T = r.texts && Object.keys(r.texts).length ? r.texts : null;
  if (!r.text && !T) return '';
  return '<div class="box" style="margin-top:10px"><div class="k">' + (T && Object.keys(T).length > 1 ? 'Texty pro pacienta' : 'Text pro pacienta') + '</div>' + (r.text ? '<p style="margin:0">' + e(r.text) + '</p>' : '') + (T ? Object.keys(T).map(function (k) { return '<p class="small" style="margin:4px 0">' + e(String(T[k]).replace(/<\/?strong>/g, '')) + '</p>'; }).join('') : '') + '</div>';
}
/* Větve a ověřovací body postupu (D-POSTUP): garant je vidí celé a v úpravě může větev vyřadit. */
function itemPostup(S, r, editing) {
  if (!r.postup) return '';
  var pendOff = (S.reg && S.reg.off) || {};
  return Object.keys(r.postup).map(function (key) {
    var p = r.postup[key];
    return '<div class="box" style="margin-top:10px"><div class="k">' + e(p.title || key) + '</div><ol class="plain small" style="margin:0 0 6px 18px;padding:0;list-style:decimal">' + (p.verify || []).map(function (v) { return '<li>' + e(v) + '</li>'; }).join('') + '</ol><div class="branch">' + (p.branches || []).map(function (b, i) {
      var id = key + ':' + i, off = pendOff[id] != null ? pendOff[id] : !!b.off;
      return '<div class="' + (off ? 'off' : '') + '">' + tag(b.action === 'up' ? 'zvýšit' : b.action === 'down' ? 'snížit' : b.action === 'swap' ? 'vyměnit' : b.action === 'edit' ? 'upravit' : 'ponechat', off ? 'bad' : b.action === 'up' || b.action === 'down' ? 'warn' : b.action === 'swap' ? 'info' : '') + '<span' + (off ? ' style="text-decoration:line-through"' : '') + '>' + e(b.when) + ' → ' + e(b.text) + '</span>' + (editing ? btn(off ? 'Vrátit' : 'Vyřadit', 'regBranch', id, 'sm quiet') : off ? tag('vyřazeno', 'bad') : '') + '</div>';
    }).join('') + '</div></div>';
  }).join('');
}
/* Zásuvka pro lékaře: co položka znamená, s parametry a texty. */
V.itemDetail = function (S, id) {
  var r = NF.item(S, id); if (!r) return '';
  if (S.role === 'patient') return '<p class="eyebrow">Schválené pravidlo</p><h2>' + e(r.title) + '</h2><p>' + tag(r.status === 'rejected' ? 'teď se nepoužívá' : 'schválil lékař', r.status === 'rejected' ? 'bad' : 'ok') + '</p><p>' + e(r.summary) + '</p>' +
    '<p class="small muted" style="margin-top:12px">Každá rada a každý výpočet v aplikaci vychází z pravidla, které schválil lékař. Aplikace si nic nevymýšlí.</p>';
  var keys = Object.keys(r.params || {});
  return '<p class="eyebrow">Schválené pravidlo</p><h2>' + e(r.title) + '</h2><p>' + tag(NF.STATUS[r.status], r.status === 'rejected' ? 'bad' : 'ok') + ' · ' + e(r.id) + '</p><p>' + e(r.summary) + '</p>' + (r.detail ? '<p class="small muted">' + e(r.detail) + '</p>' : '') +
    itemTexts(r) + (keys.length ? '<div class="box" style="margin-top:10px"><div class="k">Parametry</div>' + keys.map(function (k) { return '<div class="instr"><span>' + e(paramLabel(r, k)) + '</span><b>' + e(String(r.params[k]).replace('.', ',')) + '</b></div>'; }).join('') + '</div>' : '') + itemPostup(S, r, false) +
    '<p class="small muted" style="margin-top:12px">Schválil lékař-garant ' + e(NF.fmtShort(r.decidedAt)) + '. Každý výpočet a rada v aplikaci pochází z takto schválené položky.</p>';
};

/* Akutní problém: pokyny lékaře a kontakty, mimo flow kontroly. */
V.acute = function (S) {
  var p = NF.activePlan(S);
  return '<p class="eyebrow">Mimo kroky kontroly</p><h2>Akutní problém pacienta</h2><p class="muted">Aplikace do léčby nezasahuje. Zde jsou pokyny, které má pacient v Bezpečí, a kontakty — pro rychlou orientaci.</p>' +
    '<h3>Osobní pokyny pacienta</h3>' + V.instructionsList(S, p, false) +
    '<h3 style="margin-top:14px">Kam se obrátit</h3>' + kv('Zdravotní potíže', 'ordinace podle pokynů') + kv('Ohrožení života', 'záchranná služba') + kv('Technika', 'technická podpora') +
    '<p class="small muted" style="margin-top:12px">V ukázce nejsou skutečná čísla.</p>';
};

/* --- verze a stopa --- */
V.trace = function (S) {
  var ev = S.events.slice().reverse().slice(0, 80);
  return pagehead('Verze a stopa', 'Co aplikace udělala a proč', 'Každý výpočet, rada, návrh a rozhodnutí se vstupy a výstupy. Deterministické, bez sítě, bez generativní AI.',
    '<div class="actions" style="margin:0">' + btn('Export stopy (JSON)', 'exportTrace', null, 'primary sm') + '</div>') +
    card('<div class="grid2"><div><h3>Plány</h3><ul class="plain small">' + (S.plans.length ? S.plans.map(function (p) { return '<li><b>' + e(p.id) + '</b> ' + tag(p.state === 'issued' ? 'platí' : 'starší', p.state === 'issued' ? 'ok' : '') + ' · ' + e(NF.fmtShort(p.issuedAt)) + ' · S/O/V ' + p.doses.breakfast.units + '/' + p.doses.lunch.units + '/' + p.doses.dinner.units + ' j. · 🌙 bazál ' + p.doses.basal.units + ' j.</li>'; }).join('') : '<li class="muted">Žádný plán.</li>') + '</ul></div>' +
      '<div><h3>Návyky</h3><ul class="plain small">' + (S.habits.length ? S.habits.map(function (h) { return '<li>' + e(h.title) + ' ' + tag(h.state) + ' · ' + e(h.planId) + '</li>'; }).join('') : '<li class="muted">Žádné.</li>') + '</ul></div></div>') +
    card('<h3>Stopa (' + S.events.length + ' záznamů, posledních 80)</h3><div class="tablewrap"><table><thead><tr><th>Čas</th><th>Kdo</th><th>Událost</th><th>Podrobnost</th><th></th></tr></thead><tbody>' +
      ev.map(function (x, i) { var k = String(S.events.length - 1 - i); return '<tr><td class="nowrap">' + e(NF.fmtDateTime(x.at)) + '</td><td>' + e(x.who) + '</td><td><b>' + e(x.what) + '</b></td><td>' + e(x.detail) + '</td><td>' + (x.data ? btn(S.traceOpen === k ? 'skrýt' : 'data', 'traceOpen', k, 'sm quiet') : '') + '</td></tr>' + (S.traceOpen === k && x.data ? '<tr><td colspan="5"><pre class="small" style="white-space:pre-wrap;margin:0;background:var(--bg);padding:10px;border-radius:10px">' + e(JSON.stringify(x.data, null, 2)) + '</pre></td></tr>' : ''); }).join('') + '</tbody></table></div>');
};

/* ---------- sestra ---------- */
/* Náhled telefonu u sestry. U bodů jídlo / porce / inzulin se ukáže ukázkové jídlo (ne prázdná obrazovka); sestra v náhledu neklepe. */
function nursePreview(S, p, t) {
  var page = t.previewPage || 'today', pv = t.preview, html;
  if (page === 'meal' && pv && !S.meal) {
    var meal = 'breakfast', f = S.foods.filter(function (x) { return (x.meals || []).indexOf(meal) >= 0 || x.meal === meal; })[0] || S.foods[0];
    var sample = { step: pv.step || 1, meal: meal, bolus: pv.step > 1 ? (pv.bolus || 'before') : null, units: p.doses[meal] ? p.doses[meal].units : 0, offset: '0', q: f ? f.name : '', foodId: pv.step > 2 && f ? f.id : null, portion: pv.step > 2 ? (pv.portion || 'usual') : null, decisions: {}, reasons: {}, newFood: null, sample: true };
    S.meal = sample; try { html = V.patient(S, 'meal'); } finally { S.meal = null; }
  } else html = V.patient(S, page);
  var label = page === 'meal' ? (pv && pv.step > 1 ? 'Ukázkové jídlo · krok ' + pv.step : 'Před jídlem · krok 1') : page === 'plan' ? 'Plán s dávkami' : page === 'safety' ? 'Bezpečí' : 'Dnes';
  return '<div class="phone-preview preview-static"><span class="preview-label">Takto to vidí pacient · ' + e(label) + '</span><div class="island"></div>' + html + '</div>';
}
V.nurse = function (S) {
  var p = NF.activePlan(S), t = S.training, items = NF.trainingItems(S);
  var all = items.every(function (x) { return t.steps[x.id]; }), done = t.result === 'done', failed = t.result === 'failed';
  var left = pagehead('V ordinaci · sestra · ' + NF.fmtDate(S.clock), 'Zaučení a předání zařízení', p ? 'Plán ' + e(p.id) + ' vydal ' + e(S.doctor.label) + '. Návyky začnou platit až po zaučení a jedné kontrolní otázce.' : 'Lékař zatím plán nevydal.') +
    (p ? card('<h2>Co pacient zvládl</h2><p class="muted">Zaškrtněte, až to pacient udělá sám. Vpravo vidíte, co má právě na telefonu; „Ukázat“ přepne náhled.</p>' +
      '<div class="actions" style="margin:0 0 10px">' + btn('Ukázat Dnes', 'trainingPreview', 'today', 'sm') + btn('Ukázat plán s dávkami', 'trainingPreview', 'plan', 'sm') + btn('Ukázat Bezpečí', 'trainingPreview', 'safety', 'sm') + '</div>' +
      items.map(function (x) { return '<label class="check"><input type="checkbox" data-action="trainingStep" data-value="' + x.id + '"' + (t.steps[x.id] ? ' checked' : '') + (done || failed ? ' disabled' : '') + '><span>' + e(x.text) + ' <button type="button" class="btn quiet sm" data-action="trainingPreview" data-value="' + e(x.id) + '">Ukázat</button></span></label>'; }).join('') +
      (done ? hint('<b>Zaučení dokončeno</b> ' + e(NF.fmtDateTime(t.at)) + '.<br><b>Co dál:</b> předejte telefon pacientovi. Na obrazovce „Nový plán“ si projde dávky a návyky a klepne na „Plán přebírám“; až pak návyky začnou platit. Vy už nic nezapisujete.', 'ok') : '') +
      (failed ? hint('<b>Zaučení se nezdařilo</b> ' + e(NF.fmtDateTime(t.at)) + '. Plán je vydaný, návyky pacientovi nezačnou platit.<br><b>Co dál:</b> domluvte nový termín, nebo pomoc blízké osoby. Lékař to uvidí na kontrole a v zařazení.', 'warn') +
        '<div class="box" style="margin-top:10px"><div class="k">Důvod (vyberte)</div><div class="choice-row">' + NF.TRAINING_REASONS.map(function (r) { return choice(e(r[1]), 'trainingReason', r[0], t.reason === r[0], 'sm'); }).join('') + '</div></div>' : '') +
      (done || failed ? '<div class="actions">' + btn('Změnit výsledek', 'finishTraining', 'reset', 'quiet sm') + '</div>'
        : '<div class="actions">' + btn('Dokončit zaučení', 'finishTraining', 'done', 'primary', all ? '' : ' disabled') + btn('Zaučení se nezdařilo', 'finishTraining', 'failed', 'quiet') + '</div>' + (all ? '' : '<p class="small muted">Tlačítko se odemkne, až budou všechny body zaškrtnuté.</p>'))) : '');
  var right = p ? nursePreview(S, p, t) : '<div class="phone-preview"><div class="island"></div><div class="patient-shell"><div class="patient"><p class="muted">Zatím není co ukázat.</p></div></div></div>';
  return '<div class="app">' + rail(S, [['training', 'Zaučení', '🎓']], S.nurse.label) + '<div class="desk"><div class="split"><div>' + left + '</div>' + right + '</div></div></div>';
};

})(typeof window !== 'undefined' ? window : globalThis);
