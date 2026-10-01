/* Obrazovky lékaře (= garanta) a sestry — desktop. Podle 15-ZDROJ-PRAVDY-MAKETA.md.
   Kontrola je vedené flow o čtyřech krocích; každý krok má jedno primární tlačítko. */
(function (global) {
'use strict';
var NF = global.NutriFee, V = NF.screens, e = NF.esc;
var btn = V.btn, choice = V.choice, hint = V.hint, kv = V.kv, card = V.card, tag = V.tag, appr = V.appr;

function rail(S, items, who) {
  return '<nav class="rail" aria-label="Nabídka"><div class="brand"><span class="brandmark">N</span>NutriFee</div>' + items.map(function (it) {
    return '<button type="button" class="nav ' + (S.page === it[0] ? 'active' : '') + '" data-action="page" data-value="' + it[0] + '"' + (S.page === it[0] ? ' aria-current="page"' : '') + '><span class="ic">' + it[2] + '</span>' + e(it[1]) + '</button>';
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
      card('<div class="grid2"><div><h2>Dávky inzulinu</h2>' + V.dosesTable(p) + '</div><div><h2>Návyky</h2><ul class="plain">' + S.habits.filter(function (h) { return h.planId === p.id; }).map(function (h) { return '<li><b>' + e(h.title) + '</b> ' + tag(h.state === 'active' ? 'platí' : h.state === 'prepared' ? 'čeká na zaučení' : h.state, h.state === 'active' ? 'ok' : 'warn') + '</li>'; }).join('') + '</ul></div></div>' +
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
        NF.ELIGIBILITY.map(function (c) { return '<label class="check"><input type="checkbox" data-action="eligibility" data-value="' + c[0] + '"' + (en.criteria[c[0]] ? ' checked' : '') + '><span>' + e(c[1]) + '</span></label>'; }).join('') +
        (en.eligible ? hint('Všechny podmínky potvrzené. ' + appr(S, 'K-KRITERIA'), 'ok') : hint('Zaškrtněte všechny čtyři podmínky. Dokud některá chybí, pacient do studie nepatří a pokračovat nejde.', 'warn')));
    out += nextbar('Další krok: dávky, návyky a pokyny', en.eligible ? '' : 'Odemkne se po potvrzení všech podmínek.', btn('Pokračovat →', 'wizardGo', '1', 'primary', en.eligible ? '' : ' disabled'));
    return out;
  }
  if (step === 1) {
    var hc = (D && D.habitCatalog) || [], ic = (D && D.instructionCatalog) || [];
    out += card('<h2>1 · Dávky inzulinu</h2><p class="muted">Podle vašeho předpisu. Aplikace je bude pacientovi připomínat a ptát se na podání. Nikdy je nepočítá ani nemění.</p>' +
      '<div class="dose-grid"><div class="dose-group"><div class="gk">Prandiální inzulin · k jídlu</div><div class="dose-row">' + [['breakfast', 'Snídaně'], ['lunch', 'Oběd'], ['dinner', 'Večeře']].map(function (x) {
        return '<div class="dose"><div class="k">' + e(x[1]) + '</div><div class="stepper">' + btn('−', 'dose', x[0] + ':-1', '', ' aria-label="méně"') + '<span class="val">' + d.doses[x[0]].units + ' j.</span>' + btn('+', 'dose', x[0] + ':1', '', ' aria-label="více"') + '</div></div>';
      }).join('') + '</div></div>' +
      '<div class="dose-group basal"><div class="gk">🌙 Bazální inzulin · na noc</div><div class="dose-row"><div class="dose"><div class="k">Bazál · ' + e(d.doses.basal.time) + '</div><div class="stepper">' + btn('−', 'dose', 'basal:-1', '', ' aria-label="méně"') + '<span class="val">' + d.doses.basal.units + ' j.</span>' + btn('+', 'dose', 'basal:1', '', ' aria-label="více"') + '</div></div></div></div></div>' +
      '<label class="check" style="margin-top:12px"><input type="checkbox" data-bind="draft.medicationChecked"' + (d.medicationChecked ? ' checked' : '') + '><span>Dávky jsem s pacientem ověřil a bere jen inzulin (žádná perorální antidiabetika).</span></label>');
    out += card('<h2>2 · Startovní návyky</h2><p class="muted">NutriFee navrhla stejnou startovní sadu pro všechny pacienty studie. Škrtněte nebo přidejte. ' + appr(S, 'R-NAVYKY') + '</p>' +
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
      '<h3 style="margin-top:16px">Cíle glukózy</h3><p class="muted small">Výchozí hodnoty z registru; u pacienta je můžete upravit. Z nich vychází semafor v reportu a návrhy k dávce.</p>' + targetsGrid(d.targets, 'target') +
      '<label class="check" style="margin-top:12px"><input type="checkbox" data-bind="draft.instructionsChecked"' + (d.instructionsChecked ? ' checked' : '') + '><span>Pokyny jsem s pacientem probral.</span></label>');
    var bl = NF.planBlockers(S);
    out += nextbar('Další krok: vydání plánu', bl.length ? 'Chybí: ' + e(bl.join(', ')) + '.' : 'Vše je připravené.', btn('Pokračovat →', 'wizardGo', '2', 'primary', bl.length ? ' disabled' : ''));
    return out;
  }
  var hc2 = (D && D.habitCatalog) || [];
  out += card('<h2>Shrnutí před vydáním</h2><div class="grid2"><div>' + kv('Plán', e(d.planId)) + kv('Platnost do', e(NF.fmtShort(d.validUntil))) +
    kv('Snídaně / oběd / večeře', d.doses.breakfast.units + ' / ' + d.doses.lunch.units + ' / ' + d.doses.dinner.units + ' j.') + kv('🌙 Bazál na noc', d.doses.basal.units + ' j. · ' + e(d.doses.basal.time)) +
    kv('Cíle glukózy', e(NF.mmol(d.targets.low)) + '–' + e(NF.mmol(d.targets.high)) + ' mmol/l · ráno do ' + e(NF.mmol(d.targets.fastingHigh))) + '</div>' +
    '<div><b>Návyky</b><ul class="plain small">' + d.habits.map(function (id) { var h = hc2.filter(function (x) { return x.id === id; })[0]; return '<li>' + e(h ? h.title : id) + '</li>'; }).join('') + '</ul><b>Pokyny</b>: ' + d.instructions.length + ' položek</div></div>') +
    hint('<b>Co se stane po vydání:</b> plán se předá sestře k zaučení. Návyky začnou pacientovi platit až po zaučení a jedné kontrolní otázce. Vy už mezi kontrolami nic neděláte.', 'sand');
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
  }).join('') + '<div class="k" style="margin-top:10px">Cíle glukózy</div>' + targetsGrid(r.newTargets, 'revTarget') + '</div>';
}

/* --- kontrola: 4 kroky --- */
function tileBtn(S, key, k, v, d, cls, open) {
  return '<button type="button" class="tile ' + cls + (open ? ' open' : '') + '" data-action="reviewTile" data-value="' + key + '"><div class="k"><i></i>' + e(k) + '</div><div class="v">' + v + '</div><div class="d">' + e(d) + '</div></button>';
}
function leadSentence(S, s) {
  var parts = [];
  if (!s.meals) return 'Zatím žádné zápisy jídel.';
  parts.push(s.usualPct >= 80 ? 'Pacient jedl konzistentně (obvyklá porce u ' + s.usualPct + ' % jídel)' : 'Porce kolísaly (obvyklá jen u ' + s.usualPct + ' % jídel)');
  parts.push(s.asPct >= 80 ? 'inzulin potvrdil podle plánu u ' + s.asPct + ' % jídel' : 'inzulin podle plánu potvrdil jen u ' + s.asPct + ' % jídel');
  parts.push(s.advice.works === 'yes' ? 'rady k jídlu fungovaly (vrchol ' + NF.mmol(s.advice.accepted.med) + ' vs. ' + NF.mmol(s.advice.declined.med) + ' mmol/l)' : s.advice.works === 'few' ? 'k posouzení rad je málo dat' : 'rady zatím rozdíl neukázaly');
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
  var out = '<div class="flow">' + steps.map(function (x, i) { var n = i + 1; return '<button type="button" class="step ' + (n === r.step ? 'now' : n < r.step ? 'done' : '') + '" data-action="reviewStep" data-value="' + n + '"><span class="n">' + (n < r.step ? '✓' : n) + '</span>' + e(x[0]) + (x[1] ? '<small>' + e(x[1]) + '</small>' : '') + '</button>'; }).join('') + '</div>' +
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
  var tiles = tileBtn(S, 'tir', 'Čas v cíli', ss ? ss.tir + '<small>%</small>' : '—', ss ? 'cíl > ' + t.tirGoal + ' % · pod ' + NF.mmol(t.low) + ': ' + ss.below + ' %' : 'souhrn ze senzoru chybí', 'c-' + s.tirState, r.tile === 'tir') +
    tileBtn(S, 'usual', 'Obvyklá porce', s.usualPct == null ? '—' : s.usualPct + '<small>%</small>', s.meals + ' jídel · ' + (s.meals - s.usual) + '× jinak' + (s.snacks ? ' · ' + s.snacks + ' svačin' : ''), s.usualPct == null ? 'c-none' : s.usualPct >= 80 ? 'c-ok' : s.usualPct >= 60 ? 'c-warn' : 'c-bad', r.tile === 'usual') +
    tileBtn(S, 'ins', 'Inzulin podle plánu', s.asPct == null ? '—' : s.asPct + '<small>%</small>', s.other + '× jinak · ' + s.none + '× nepodán · ' + s.unknown + '× neví', s.asPct == null ? 'c-none' : s.asPct >= 80 ? 'c-ok' : s.asPct >= 60 ? 'c-warn' : 'c-bad', r.tile === 'ins') +
    tileBtn(S, 'adv', 'Rady fungovaly', s.advice.works === 'yes' ? '✓' : s.advice.works === 'few' ? '?' : '~', 'přijato ' + s.advice.accepted.n + '× · nepřijato ' + s.advice.declined.n + '× · bez odpovědi ' + s.advice.noAnswer.n + '×', s.advice.works === 'yes' ? 'c-ok' : s.advice.works === 'few' ? 'c-none' : 'c-warn', r.tile === 'adv') +
    (s.hba1c ? tileBtn(S, 'hba', 'HbA1c', s.hba1c[0] + ' → ' + s.hba1c[1], 'mmol/mol · při zařazení → teď', s.hba1c[1] < s.hba1c[0] ? 'c-ok' : s.hba1c[1] > s.hba1c[0] ? 'c-bad' : 'c-warn', r.tile === 'hba') : '') +
    tileBtn(S, 'ill', 'Mimo učení', s.illDays + (s.incomplete ? '<small>+' + s.incomplete + '</small>' : ''), s.illDays + ' dní nemoci · ' + s.incomplete + ' zápisů bez dat', s.illDays > 7 ? 'c-warn' : 'c-ok', r.tile === 'ill');
  var out = '<div class="tiles">' + tiles + '</div>';
  if (r.tile) out += card(tileDetail(S, p, r, r.tile), 'soft');
  out += card('<p><b>Co se dělo:</b> ' + e(leadSentence(S, s)) + ' <span class="small muted">' + appr(S, 'S-SOUHRN') + '</span></p>', 'soft');
  out += '<h2 class="eyebrow" style="margin-top:22px">Podklady · jen když chcete víc</h2>' + podklady(S, p, r);
  out += nextbar('Další krok: návrhy na příští plán (' + r.proposals.length + ')', 'NutriFee připravila návrhy s důvodem a postupem ověření. Rozhodujete jeden po druhém.', btn('Pokračovat k návrhům →', 'reviewStep', '2', 'primary'));
  return out;
}
function tileDetail(S, p, r, key) {
  var s = r.summary, ss = s.sensor, t = NF.targets(S);
  if (key === 'tir') return ss ? '<h3>Čas v cíli ' + ss.tir + ' %</h3><p>Období ' + e(ss.period) + '. Pod ' + e(NF.mmol(t.low)) + ': ' + ss.below + ' % (cíl < 4 %), pod 3,0: ' + ss.veryLow + ' % (cíl < 1 %), nad ' + e(NF.mmol(t.high)) + ': ' + ss.above + ' %. Dostupnost dat ' + ss.availability + ' %.</p><p class="small muted">Semafor: zelená TIR > ' + t.tirGoal + ' % a pod cílem < 4 %; žlutá TIR 50–70 %; červená TIR < 50 % nebo pod cílem ≥ 4 %. ' + appr(S, 'S-SEMAFOR') + '</p>' : '<p>Souhrn ze senzoru není k dispozici.</p>';
  if (key === 'usual') return '<h3>Obvyklá porce u ' + s.usual + ' z ' + s.meals + ' jídel</h3><p>Obvyklá porce je množství, na které je nastavená pevná dávka. Jídla s jinou porcí se nepočítají do učení ani do návrhů k dávce — jinak by signál ukazoval na dávku, přestože příčina je v porci.</p>' + (s.snacks ? '<p class="small muted">Mimo hlavní jídla pacient zapsal ' + NF.plural(s.snacks, 'svačinu', 'svačiny', 'svačin') + ' (bez inzulinu k jídlu; do návrhů k dávce nevstupují).</p>' : '');
  if (key === 'hba') return '<h3>HbA1c ' + s.hba1c[0] + ' → ' + s.hba1c[1] + ' mmol/mol</h3><p>Hodnota při zařazení z karty pacienta a dnešní. Kompenzaci lékař neoznačuje; report ji ukazuje sám.</p>';
  if (key === 'ins') return '<h3>Potvrzení inzulinu</h3><p>Podle plánu ' + s.asPlan + '×, z toho včas (nejvýš ' + NF.tolerance(S).before + ' min před jídlem nebo ' + NF.tolerance(S).after + ' min po něm) ' + s.onTime + '×; jinak ' + s.other + '×, nepodán ' + s.none + '×, neví ' + s.unknown + '×. Bazál potvrzen ' + s.basalAs + ' z ' + s.basalDays + ' dnů plánu.</p><p class="small muted">Do návrhů k dávce vstupují jen jídla s dávkou potvrzenou podle plánu a včas.</p>';
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
  return m || pr.branches.filter(function (b) { return b.action === 'keep'; })[0] || { action: 'keep', text: 'ponechat' };
};
function reviewProposals(S, p, r) {
  var singles = r.proposals.filter(function (pr) { return NF.proposalIsSingle(S, pr); }), group = r.proposals.filter(function (pr) { return !NF.proposalIsSingle(S, pr); });
  var next = NF.nextProposal(S), decided = singles.filter(function (pr) { return r.decisions[pr.id]; }).length;
  var out = '<h2 style="margin-top:6px">Rozhodněte ' + NF.plural(singles.length, 'návrh', 'návrhy', 'návrhů') + (group.length ? ' a potvrďte ' + NF.plural(group.length, 'položku beze změny', 'položky beze změny', 'položek beze změny') : '') + '</h2><p class="muted">Jeden po druhém. U každého je důvod a postup ověření; primární tlačítko říká, co váš schválený postup doporučuje. Jiné rozhodnutí je pod odkazem. Co se nemění, potvrdíte najednou.</p>';
  singles.forEach(function (pr, i) {
    var dec = r.decisions[pr.id], now = !dec && next && pr.id === next.id;
    var cls = dec ? 'done' : now ? 'now' : 'locked';
    out += '<section class="prop ' + cls + '"><button type="button" class="bar" data-action="' + (dec ? 'propReopen' : 'noop') + '" data-value="' + pr.id + '"><span class="n">' + (dec ? '✓' : i + 1) + '</span><h3>' + e(pr.title) + '</h3><span class="state">' + (dec ? e(decisionLabel(dec)) + ' · změnit' : now ? 'rozhodujete teď' : 'čeká') + '</span></button>';
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
function decisionLabel(dec) { return dec.choice === 'agree' ? 'souhlas' + (dec.units != null ? ' · ' + dec.units + ' j.' : '') : dec.choice === 'keep' ? 'ponechat' : 'zamítnuto'; }
function proposalBody(S, p, r, pr) {
  var v = r.verify[pr.id] || {}, br = V.proposalBranch(S, pr), wait = !br || br.action === 'wait';
  var units = pr.kind === 'dose' ? r.newDoses[pr.dose].units : null, cur = pr.kind === 'dose' ? p.doses[pr.dose].units : null;
  var free = !wait && br.action === 'free';
  var swapOpts = pr.lever ? NF.swapOptions(S, pr) : [], swapTo = (r.swapTo && r.swapTo[pr.id]) || swapOpts[0] || null;
  var primary = wait ? 'Souhlasím (dokončete ověření)' : br.action === 'up' || br.action === 'down' || (free && pr.kind === 'dose') ? 'Souhlasím · nová dávka ' + units + ' j.' : br.action === 'swap' ? 'Souhlasím · vyměnit' + (swapTo ? ' za „' + NF.LEVERS[swapTo].label + '“' : ' (vypnout)') : free ? 'Souhlasím' : 'Souhlasím · ' + (br.text || 'ponechat');
  var choiceVal = wait ? null : (br.action === 'up' || br.action === 'down' || br.action === 'swap' || br.action === 'edit' || free) ? 'agree' : 'keep';
  var showStepper = !wait && (br.action === 'up' || br.action === 'down' || (free && pr.kind === 'dose'));
  var allYes = pr.verify.every(function (_, i) { return v[i] === true; });
  var other = r.other === pr.id;
  return '<div class="body">' +
    '<div class="why"><b>Proč návrh vznikl:</b> ' + e(pr.why) + '</div>' +
    (pr.weak.length ? '<div class="small muted">Návrh oslabuje: ' + e(pr.weak.join(' · ')) + '</div>' : '') +
    '<div class="grid2"><div class="box"><div class="k">1 · Ověřte s pacientem</div>' + (pr.verify.length > 1 ? '<div class="actions" style="margin:0 0 8px">' + btn('Vše sedí', 'propVerifyAll', pr.id, allYes ? 'sm' : 'sm primary') + '<span class="small muted">jednotlivé „nesedí“ přepněte níže</span></div>' : '') + pr.verify.map(function (t, i) { return '<div class="verify"><span>' + (i + 1) + '. ' + e(t) + '</span><span class="choice-row">' + choice('sedí', 'propVerify', pr.id + ':' + i + ':yes', v[i] === true, 'sm') + choice('nesedí', 'propVerify', pr.id + ':' + i + ':no', v[i] === false, 'sm') + '</span></div>'; }).join('') + '</div>' +
    '<div class="box"><div class="k">2 · Váš schválený postup říká</div><div class="branch">' + pr.branches.map(function (b) { var hi = br && !wait && b === br; return '<div class="' + (hi ? 'hi' : '') + '">' + tag(b.action === 'up' ? 'zvýšit' : b.action === 'down' ? 'snížit' : b.action === 'swap' ? 'vyměnit' : b.action === 'edit' ? 'upravit' : 'ponechat', b.action === 'up' || b.action === 'down' ? 'warn' : b.action === 'swap' ? 'info' : '') + '<span>' + e(b.when) + ' → ' + e(b.text) + '</span></div>'; }).join('') +
    (wait ? '<div class="hi">' + tag('čeká') + '<span>dokončete ověření vlevo — postup vám pak řekne, co dál</span></div>' : free ? '<div class="hi">' + tag('bez postupu', 'warn') + '<span>' + e(br.text) + '</span></div>' : '') +
    (!wait && br.action === 'edit' ? reviewInstructions(S, r) : '') +
    (!wait && br.action === 'swap' && swapOpts.length ? '<div style="margin-top:10px"><div class="k">Místo ní nabízet</div><div class="choice-row">' + swapOpts.map(function (l) { return choice(e(NF.LEVERS[l].label), 'propSwapTo', pr.id + ':' + l, swapTo === l, 'sm'); }).join('') + choice('Jen vypnout', 'propSwapTo', pr.id + ':none', swapTo === null && r.swapTo && r.swapTo[pr.id] === 'none', 'sm') + '</div></div>' : '') + '</div>' +
    '<div class="small muted" style="margin-top:8px">' + (pr.postup ? appr(S, pr.postup) + ' ' : '') + appr(S, pr.item) + (pr.kind === 'dose' ? ' · o kolik, volíte vy' : '') + '</div></div></div>' +
    '<div class="decide"><span class="lbl">3 · Rozhodnutí</span>' +
    (showStepper ? '<div class="stepper">' + btn('−', 'propUnits', pr.id + ':-1', '', ' aria-label="méně"') + '<span class="val">' + units + ' j.<small>dnes ' + cur + ' j.</small></span>' + btn('+', 'propUnits', pr.id + ':1', '', ' aria-label="více"') + '</div>' : '') +
    btn(e(primary), 'propDecide', pr.id + ':' + (choiceVal || 'agree'), 'primary', wait || (showStepper && units === cur) ? ' disabled' : '') +
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
  var adviceHtml = Object.keys(NF.LEVERS).filter(function (l) { return l !== 'portion'; }).map(function (l) { return '<li>' + e(NF.LEVERS[l].label) + ' ' + (adv.off.indexOf(l) >= 0 ? tag('vypnuto', 'bad') : adv.prefer.indexOf(l) >= 0 ? tag('nabízet přednostně', 'info') : tag('nabízí se podle reakce')) + '</li>'; }).join('');
  var changes = ['basal', 'breakfast', 'lunch', 'dinner'].filter(function (k) { return nxt.doses[k].units !== prevPlan.doses[k].units; });
  var out = card('<h2>Shrnutí rozhodnutí</h2><ul class="plain">' + r.proposals.map(function (pr) { var d = r.decisions[pr.id]; return '<li><b>' + e(pr.title) + '</b> — ' + e(decisionLabel(d)) + (d.reason ? ' (' + e(d.reason) + ')' : '') + (d.comment ? ' · „' + e(d.comment) + '“' : '') + '</li>'; }).join('') + '</ul>') +
    card('<h2>Nový plán ' + (r.planIssued || 'P' + (S.plans.length + 1)) + '</h2><div class="grid2"><div><b>Dávky</b>' + ['breakfast', 'lunch', 'dinner', 'basal'].map(function (k) { var ch = changes.indexOf(k) >= 0; return kv(k === 'basal' ? '🌙 Bazál na noc · ' + prevPlan.doses.basal.time : NF.mealLabel(k, true), (ch ? '<span class="muted" style="text-decoration:line-through">' + prevPlan.doses[k].units + '</span> → <b>' + nxt.doses[k].units + ' j.</b> ' + tag('změna', 'warn') : nxt.doses[k].units + ' j.')); }).join('') +
      (changes.length ? hint('Po změně dávky začne učení k radám u jídel znovu. Staré zápisy zůstanou označené původní dávkou.', 'sand') : '') + '</div>' +
      '<div><b>Návyky</b><ul class="plain small">' + habitsHtml + '</ul><b>Rady</b><ul class="plain small">' + adviceHtml + '</ul><b>Osobní pokyny</b>: ' + (nxt.instructions || []).length + ' položek · ' + (r.decisions['PR-POKYNY'] ? e(decisionLabel(r.decisions['PR-POKYNY'])) : '') + '</div></div>');
  out += nextbar(r.planIssued ? 'Plán ' + r.planIssued + ' je vydaný' : 'Vydat nový plán', r.planIssued ? 'Pokračujte k předání.' : 'Nevratný krok. Plán uvidí pacient.', r.planIssued ? btn('Předat pacientovi →', 'reviewStep', '4', 'primary') : btn('Vydat plán', 'issueP2', null, 'primary'));
  return out;
}
function reviewHandover(S, p, r) {
  return '<div class="split"><div>' + card('<h2>Předání pacientovi</h2><p>Pacient vidí na telefonu, co se změnilo a proč, a potvrdí převzetí. Tím kontrola končí. Do příští kontrole už nic neděláte.</p>' + kv('Příští kontrola', e(NF.fmtDate(S.nextVisit))) + '<div class="actions">' + btn('Zobrazit zařazení a plán', 'page', 'enroll', '') + '</div>') + '</div>' +
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
    return (!f.cat || r.cat === f.cat) && (!f.status || r.status === f.status) && (!f.touch || (f.touch === 'done' ? t : f.touch === 'todo' ? !t : hist.some(function (h) { return h.comment; }))) && (!q || text.indexOf(q) >= 0);
  });
  var counts = { approved: 0, edited: 0, rejected: 0 }; S.registry.items.forEach(function (r) { counts[r.status]++; });
  var open = f.open ? NF.item(S, f.open) : null;
  var sumTile = function (k, v, d, cls, key) { return '<button type="button" class="tile ' + cls + (f.touch === key ? ' open' : '') + '" data-action="regFilter" data-value="touch:' + key + '"><div class="k"><i></i>' + e(k) + '</div><div class="v">' + v + '</div><div class="d">' + e(d) + '</div></button>'; };
  var out = pagehead('Lékař-garant', 'Schvalovací registr', 'Vše, co aplikace počítá, radí a navrhuje, stojí na těchto ' + S.registry.items.length + ' položkách. V maketě jsou schválené předem; garant je prochází, potvrzuje, upravuje nebo zamítá — tady i přímo z obrazovek. Rozhodnutí platí okamžitě a historie se uchovává.',
    '<div class="actions" style="margin:0">' + btn('Export JSON', 'exportRegistry', null, 'sm') + '</div>') +
    '<div class="tiles" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">' + sumTile('Prošel', sum.touched + '<small>z ' + sum.total + '</small>', 'položek s rozhodnutím garanta', 'c-ok', 'done') + sumTile('Potvrdil', String(sum.confirmed), 'beze změny', 'c-ok', 'done') + sumTile('Upravil', String(sum.edited), 'parametry nebo text', 'c-warn', 'done') + sumTile('Zamítl', String(sum.rejected), 'aplikace položku nepoužívá', 'c-bad', 'done') + sumTile('Okomentoval', String(sum.commented), 'poznámka v historii', 'c-none', 'commented') + sumTile('Zbývá', String(sum.remaining), 'schváleno předem, bez rozhodnutí', sum.remaining ? 'c-warn' : 'c-ok', 'todo') + '</div>' +
    '<div class="filters"><input data-bind="reg.q" placeholder="Hledat v názvu, popisu, textu i komentářích…" value="' + e(f.q || '') + '">' + NF.CATS.map(function (c) { return choice(e(c[1]), 'regFilter', 'cat:' + c[0], f.cat === c[0], 'sm'); }).join('') + '</div>' +
    '<div class="filters">' + [['approved', 'schválené ' + counts.approved], ['edited', 'upravené ' + counts.edited], ['rejected', 'zamítnuté ' + counts.rejected]].map(function (x) { return choice(e(x[1]), 'regFilter', 'status:' + x[0], f.status === x[0], 'sm'); }).join('') + [['todo', 'zbývá potvrdit ' + sum.remaining], ['done', 'rozhodnuto ' + sum.touched], ['commented', 's komentářem ' + sum.commented]].map(function (x) { return choice(e(x[1]), 'regFilter', 'touch:' + x[0], f.touch === x[0], 'sm'); }).join('') + '</div>' +
    '<div class="reg"><div class="card flat" style="padding:0;overflow:hidden">' + (items.length ? items.map(function (r) {
      return '<button type="button" class="reg-row ' + (open && open.id === r.id ? 'on' : '') + '" data-action="regOpen" data-value="' + r.id + '"><span class="ic">' + (ICONS[r.cat] || '•') + '</span><span><span class="t">' + e(r.title) + '</span><br><span class="s">' + e(r.id) + ' · ' + e(NF.catLabel(r.cat)) + ' · ' + e(r.summary) + '</span></span>' + (NF.itemTouched(S, r.id) ? tag(r.status === 'approved' ? 'potvrzeno' : NF.STATUS[r.status], r.status === 'approved' ? 'ok' : r.status === 'edited' ? 'warn' : 'bad') : tag('schváleno předem', '')) + '<span class="s">' + e(NF.fmtShort(r.decidedAt)) + '</span></button>';
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
    (r.text ? '<div class="box" style="margin-top:10px"><div class="k">Text pro pacienta</div>' + e(r.text) + '</div>' : '') +
    (keys.length ? '<div class="box" style="margin-top:10px"><div class="k">Parametry</div>' + keys.map(function (k) {
      var val = pend[k] != null ? pend[k] : params[k];
      return '<div class="instr"><span>' + e(k) + '</span>' + (editing && typeof val === 'number' ? '<div class="stepper">' + btn('−', 'regParam', r.id + ':' + k + ':' + (Number.isInteger(params[k]) ? -1 : -0.05), 'sm') + '<span class="val">' + e(String(Math.round(val * 100) / 100).replace('.', ',')) + '</span>' + btn('+', 'regParam', r.id + ':' + k + ':' + (Number.isInteger(params[k]) ? 1 : 0.05), 'sm') + '</div>' : '<b>' + e(String(val).replace('.', ',')) + '</b>') + '</div>';
    }).join('') + '</div>' : '') +
    (r.usedBy ? '<p class="small muted" style="margin-top:8px">Používá se: ' + e(r.usedBy) + '</p>' : '') +
    '<div class="divider"></div><h3>Rozhodnutí garanta</h3>' +
    '<label class="field"><span>Komentář (nepovinný)</span><input data-bind="form.regcomment_' + r.id + '" value="' + e((S.form && S.form['regcomment_' + r.id]) || '') + '"></label>' +
    '<div class="actions" style="margin-top:8px">' + btn(NF.itemTouched(S, r.id) && r.status === 'approved' ? 'Potvrdit znovu' : 'Potvrdit', 'regDecide', 'approved', r.status === 'approved' && !NF.itemTouched(S, r.id) ? 'primary sm' : 'sm') +
    (keys.length ? (editing ? btn('Uložit úpravu', 'regDecide', 'edited', 'primary sm') : btn('Upravit parametry', 'regEdit', null, 'sm')) : '') +
    btn('Zamítnout', 'regDecide', 'rejected', 'danger sm') + btn('Jen komentář', 'regComment', null, 'sm quiet') + '</div>' +
    (r.status === 'rejected' ? hint('Položka je zamítnutá: aplikace ji přestala používat (rada zmizela, výpočet se neprovádí).', 'bad') : '') +
    '<details class="more" style="margin-top:12px"><summary>Historie rozhodnutí (' + hist.length + ')</summary><ul class="plain hist">' + (hist.length ? hist.map(function (h) { return '<li>' + e(NF.fmtDateTime(h.at)) + ' · ' + e(h.by) + ': ' + e(NF.STATUS[h.from.status] || h.from.status) + ' → <b>' + e(NF.STATUS[h.to.status]) + '</b>' + (JSON.stringify(h.from.params) !== JSON.stringify(h.to.params) ? ' · parametry ' + e(JSON.stringify(h.to.params)) : '') + (h.comment ? ' · „' + e(h.comment) + '“' : '') + '</li>'; }).join('') : '<li class="muted">Zatím beze změny od výchozího schválení.</li>') + '</ul></details>');
}
/* Zásuvka pro pacienta i lékaře: co položka znamená. */
V.itemDetail = function (S, id) {
  var r = NF.item(S, id); if (!r) return '';
  return '<p class="eyebrow">Schválené pravidlo</p><h2>' + e(r.title) + '</h2><p>' + tag(NF.STATUS[r.status], r.status === 'rejected' ? 'bad' : 'ok') + ' · ' + e(r.id) + '</p><p>' + e(r.summary) + '</p>' + (r.detail ? '<p class="small muted">' + e(r.detail) + '</p>' : '') +
    (r.text ? '<div class="box"><div class="k">Text pro pacienta</div>' + e(r.text) + '</div>' : '') + '<p class="small muted" style="margin-top:12px">Schválil lékař-garant ' + e(NF.fmtShort(r.decidedAt)) + '. Každý výpočet a rada v aplikaci pochází z takto schválené položky.</p>';
};

/* Akutní problém: pokyny lékaře a kontakty, mimo flow kontroly. */
V.acute = function (S) {
  var p = NF.activePlan(S);
  return '<p class="eyebrow">Mimo flow kontroly</p><h2>Akutní problém pacienta</h2><p class="muted">Aplikace do léčby nezasahuje. Zde jsou pokyny, které má pacient v Bezpečí, a kontakty — pro rychlou orientaci.</p>' +
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
V.nurse = function (S) {
  var p = NF.activePlan(S), t = S.training, items = NF.trainingItems(S);
  var all = items.every(function (x) { return t.steps[x.id]; });
  var left = pagehead('V ordinaci · sestra · ' + NF.fmtDate(S.clock), 'Zaučení a předání zařízení', p ? 'Plán ' + e(p.id) + ' vydal ' + e(S.doctor.label) + '. Návyky začnou platit až po zaučení a jedné kontrolní otázce.' : 'Lékař zatím plán nevydal.') +
    (p ? card('<h2>Co pacient zvládl</h2><p class="muted">Zaškrtněte, až to pacient udělá sám. Vpravo vidíte, co má právě na telefonu.</p>' +
      items.map(function (x) { return '<label class="check"><input type="checkbox" data-action="trainingStep" data-value="' + x.id + '"' + (t.steps[x.id] ? ' checked' : '') + '><span>' + e(x.text) + ' <button type="button" class="btn quiet sm" data-action="trainingPreview" data-value="' + e(x.page) + '">ukázat</button></span></label>'; }).join('') +
      (t.result === 'done' ? hint('Zaučení dokončeno ' + e(NF.fmtDateTime(t.at)) + '. Pacient teď převezme plán a odpoví na kontrolní otázku.', 'ok') : '') +
      (t.result === 'failed' ? hint('<b>Zaučení nebylo dokončeno.</b> Plán je vydaný, ale návyky pacientovi nezačnou platit. Domluvte nové zaučení nebo pomoc blízké osoby.', 'warn') : '') +
      '<div class="actions">' + btn('Zaučení dokončeno', 'finishTraining', 'done', 'primary', all ? '' : ' disabled') + btn('Zaučení se nezdařilo', 'finishTraining', 'failed', 'quiet') + '</div>' +
      (all ? '' : '<p class="small muted">Tlačítko se odemkne, až budou všechny body zaškrtnuté.</p>')) : '');
  var right = '<div class="phone-preview"><div class="island"></div>' + (p ? V.patient(S, t.previewPage || 'today') : '<div class="patient-shell"><div class="patient"><p class="muted">Zatím není co ukázat.</p></div></div>') + '</div>';
  return '<div class="app">' + rail(S, [['training', 'Zaučení', '🎓']], S.nurse.label) + '<div class="desk"><div class="split"><div>' + left + '</div>' + right + '</div></div></div>';
};

})(typeof window !== 'undefined' ? window : globalThis);
