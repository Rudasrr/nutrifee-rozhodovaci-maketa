/* Obrazovky lékaře, sestry a garanta. */
(function (global) {
'use strict';
var NF = global.NutriFee, V = NF.screens, e = NF.esc;
var btn = V.btn, btnHtml = V.btnHtml, hint = V.hint, kv = V.kv, card = V.card, tag = V.tag, chart = V.chart, choice = V.choice, ruleChip = V.ruleChip;

function tabs(S, items) {
  return '<nav class="tabs" aria-label="Nabídka">' + items.map(function (it) {
    return '<button type="button" class="btn ' + (S.page === it[0] ? 'primary' : '') + '" data-action="page" data-value="' + it[0] + '"' +
      (S.page === it[0] ? ' aria-current="page"' : '') + '>' + e(it[1]) + '</button>';
  }).join('') + '</nav>';
}

/* ---------- lékař ---------- */
V.doctor = function (S) {
  var items = [['issue', 'Zařazení a plán'], ['onepage', 'Kontrola — report'], ['decide', 'Rozhodnutí'], ['versions', 'Verze a stopa']];
  var body;
  switch (S.page) {
    case 'onepage': body = V.onePage(S); break;
    case 'evidence': body = V.evidence(S); break;
    case 'decide': body = V.decide(S); break;
    case 'result': body = V.result(S); break;
    case 'versions': body = V.versions(S); break;
    case 'resume': body = V.resume(S); break;
    default: body = V.issue(S);
  }
  return tabs(S, items) + '<div class="clinic-page">' + body + '</div>';
};

V.issue = function (S) {
  var d = S.draft;
  var active = NF.activePlan(S);
  if (!d) {
    return card('<p class="eyebrow">Zařazení a plán</p><h1>Žádný připravený návrh</h1>' +
      (active ? '<p>Platný plán je <strong>' + e(active.id + ' ' + active.version) + '</strong>, účinný od ' + e(NF.fmtDate(active.effectiveFrom)) + '.</p>' +
        '<p class="small muted">Nový plán se připravuje na kontrole v části Rozhodnutí.</p>' +
        '<div class="actions">' + btn('Otevřít kontrolu', 'page', 'onepage', 'primary') + '</div>'
        : '<p>Pro tohoto modelového pacienta zatím není připravený návrh plánu.</p>'));
  }
  var step = Math.min(1, S.wizardStep || 0);
  var steps = ['Zařazení pacienta', 'Úkol, plán a jeho vydání'];
  var head = '<div class="wizard-layout"><div class="wizard">' +
    '<div class="wizard-steps two" role="tablist" aria-label="Kroky lékaře v ordinaci">' +
    steps.map(function (t, i) {
      return '<button type="button" data-action="wizardGo" data-value="' + i + '"' +
        (i === step ? ' aria-current="step"' : '') + '><span aria-hidden="true">' + (i + 1) + '</span>' + e(t) + '</button>';
    }).join('') + '</div><div class="wizard-body">';
  var foot = function (inner) { return '<div class="wizard-footer quiet">' + inner + '</div></div></div></div>'; };

  if (step === 0) return head + V.enrollStep(S) + foot(
    (S.enrollment.eligible
      ? btn('Pokračovat k plánu', 'wizardGo', '1', 'primary')
      : btnHtml('Pokračovat k plánu', 'noop', null, 'primary', ' disabled')) +
    (S.enrollment.eligible ? '' : '<p class="small muted">Dokud některé kritérium není potvrzené, pacient do první kohorty nepatří a zařazení nepokračuje.</p>'));

  return head + V.planStep(S) + foot(
    btn('Zpět na zařazení', 'wizardGo', '0', 'secondary') +
    (V.planBlockers(S).length ? btnHtml('Vydat plán', 'noop', null, 'primary', ' disabled')
      : btn('Vydat plán a předat zaučení sestře', 'issuePlan', null, 'primary')));
};

V.enrollStep = function (S) {
  var D = global.NutriFeeDemo;
  var en = S.enrollment;
  var ctx = (D && D.patientContext) || [];
  var comps = (D && D.compensations) || [];
  return '<p class="eyebrow">V ordinaci · ' + e(NF.fmtDate(S.clock)) + '</p>' +
    '<h1>Zařazení pacienta</h1>' +
    '<p class="muted">Pacient sedí u vás. Nic se tu nevypisuje — co o něm víte, je už na kartě.</p>' +
    '<div class="person-line"><span class="person-avatar" aria-hidden="true">P1</span><div><strong>Modelový pacient 01</strong>' +
    '<span>DEMO-P01 · bez reálných identifikátorů</span></div></div>' +
    '<h2' + NF.hook('enroll-context') + '>1. Co o pacientovi víme</h2>' +
    '<div class="plan-basics">' + ctx.map(function (row) { return kv(row[0], e(row[1])); }).join('') + '</div>' +
    '<p class="field-help">Údaje z karty. Maketa je pouze zobrazuje; nepočítá z nich a nemění je.</p>' +
    '<h2' + NF.hook('enroll-compensation') + '>2. Kompenzace</h2>' +
    '<fieldset class="choice-field"><legend>Jak je pacient kompenzovaný</legend><div class="choice-row">' +
    comps.map(function (c) { return choice(c[1], 'setCompensation', c[0], en.compensation === c[0]); }).join('') + '</div></fieldset>' +
    '<p class="field-help">Vaše posouzení. Nevstupuje do žádného výpočtu; přenese se do reportu na příští kontrolu.</p>' +
    '<h2' + NF.hook('enroll-eligibility') + '>3. Způsobilost pro první kohortu</h2>' +
    '<div class="eligibility">' + NF.ELIGIBILITY.map(function (c) {
      return '<label class="check"><input type="checkbox" data-action="eligibility" data-value="' + c[0] + '"' +
        (en.criteria[c[0]] ? ' checked' : '') + '><span>' + e(c[1]) + '</span></label>';
    }).join('') + '</div>' +
    (en.eligible
      ? hint('Všechna kritéria potvrzena. Praktická vstupní kritéria zůstávají k rozhodnutí garantem.', 'success')
      : hint('Nepotvrzená kritéria znamenají, že pacient do první kohorty nepatří. Nic se nedopočítává a zařazení nepokračuje.', 'warn'));
};

V.nurse = function (S) {
  return '<nav class="tabs" aria-label="Nabídka sestry">' +
    '<button type="button" class="btn primary" data-action="page" data-value="training" aria-current="page">Zaučení a předání zařízení</button>' +
    '</nav><div class="clinic-page">' + V.trainingStep(S) + '</div>';
};

V.trainingStep = function (S) {
  var t = S.training;
  var p = NF.activePlan(S);
  var all = NF.TRAINING.every(function (x) { return t.steps[x[0]]; });
  return card('<p class="eyebrow">V ordinaci · sestra · ' + e(NF.fmtDate(S.clock)) + '</p>' +
    '<h1>Zaučení a předání zařízení</h1>' +
    '<p class="muted">Zaučení vede sestra. Lékař už plán vydal; úkol se pacientovi aktivuje až po zaučení a ověření porozumění.</p>' +
    (p ? '<div class="plan-basics">' + kv('Plán k zaučení', e(p.id + ' ' + p.version)) +
      kv('Vydal', e(S.doctor.label)) +
      kv('Úkol', e((NF.taskById(S, p.taskId) || {}).title || 'nemáme údaj')) + '</div>'
      : hint('Lékař zatím plán nevydal. Zaučení proběhne, až bude co předat.', 'warn')) +
    '<div class="next-step"' + NF.hook('training-sensor') + '><strong>Senzor</strong>' +
    '<p>Připojení senzoru je v této ukázce <strong>simulované</strong>. Žádná data se nepřenášejí a žádná integrace neexistuje.</p></div>' +
    '<h2' + NF.hook('training-steps') + '>Co pacient zvládl</h2>' +
    NF.TRAINING.map(function (x) {
      return '<label class="check"><input type="checkbox" data-action="trainingStep" data-value="' + x[0] + '"' +
        (t.steps[x[0]] ? ' checked' : '') + '><span>' + e(x[1]) + '</span></label>';
    }).join('') +
    (t.result === 'done' ? hint('Zaučení dokončila ' + e(S.nurse.label) + ' ' + e(NF.fmtDateTime(t.at)) +
      '. Pacient teď může převzít plán a projít ověřením porozumění.', 'success') : '') +
    (t.result === 'failed' ? hint('<strong>Zaučení nebylo dokončeno.</strong> ' + e(t.note) +
      '<br>Úkol se pacientovi <strong>neaktivuje</strong>, i když plán vydaný je. Pacient <strong>není</strong> vykázán jako úspěšně zařazený. ' +
      'Domluvte opakované zaučení nebo pomoc pečující osoby.', 'warn') : '') +
    '<div class="actions">' +
    (all ? btn('Zaučení dokončeno', 'finishTraining', 'done', 'primary')
      : btnHtml('Zaučení dokončeno', 'noop', null, 'primary', ' disabled')) +
    btn('Zaučení se nezdařilo', 'finishTraining', 'failed', 'secondary') + '</div>' +
    (all ? '' : '<p class="small muted">Dokud některý bod chybí, zaučení nelze označit za dokončené.</p>'));
};

V.planBlockers = function (S) {
  var d = S.draft, chybi = [];
  if (!S.enrollment.eligible) chybi.push('posouzení způsobilosti');
  if (!d.taskId) chybi.push('vybraný úkol z katalogu');
  if (!d.medicationChecked) chybi.push('ověření seznamu léčby');
  if (!d.safetyChecked) chybi.push('předaný bezpečnostní a kontaktní plán');
  return chybi;
};

function catalogOptions(S, chosenId, action) {
  var D = global.NutriFeeDemo;
  var catalog = (D && D.taskCatalog) || [];
  return '<div class="module-options">' + catalog.map(function (c) {
    var usable = NF.isRuleUsable(S, c.ruleId);
    var r = NF.ruleById(S, c.ruleId);
    var chosen = chosenId === c.id;
    return '<button type="button" class="module-option ' + (chosen ? 'chosen' : '') + '"' +
      (usable ? ' data-action="' + action + '" data-value="' + e(c.id) + '"' : ' disabled') +
      ' aria-pressed="' + (chosen ? 'true' : 'false') + '">' +
      '<span class="option-dot" aria-hidden="true">' + (chosen ? '●' : '○') + '</span>' +
      '<span><strong>' + e(c.title) + '</strong>' +
      '<small>Otázka pacienta: „' + e(c.question) + '“<br>' + e(c.burden) + '<br>' +
      'Pravidlo ' + e(c.ruleId + (r ? ' ' + r.version : '')) + ' · ' + (usable ? 'schváleno garantem' : 'návrh — čeká na schválení garantem, nelze přiřadit') +
      '</small></span></button>';
  }).join('') + '</div>';
}
V.catalogOptions = catalogOptions;

V.planStep = function (S) {
  var d = S.draft;
  var t = NF.taskById(S, d.taskId);
  var chybi = V.planBlockers(S);
  return '<p class="eyebrow">V ordinaci · ' + e(NF.fmtDate(S.clock)) + '</p>' +
    '<h1>Plán ' + e(d.planId + ' ' + d.version) + '</h1>' +
    '<h2' + NF.hook('task-catalog') + '>1. Úkol z katalogu</h2>' +
    '<p class="field-help">Úkoly jsou předem definované a jejich pravidla schvaluje garant. Vyberte jeden — nic se nepíše.</p>' +
    catalogOptions(S, t && t.catalogId, 'selectTask') +
    (t ? '<div class="plan-proposal"><h2>Vybraný úkol</h2>' +
      '<p><strong>' + e(t.title) + '</strong></p>' +
      '<p class="proposal-reason">' + e(t.conditions) + '</p>' +
      '<p class="small muted">Aplikace se z pacientových záznamů učí a před jídlem radí jen podle schválených pravidel. Dávku inzulinu nikdy neřeší.</p></div>'
      : hint('Zatím není vybraný žádný úkol.', 'warn')) +
    '<h2>2. Dávky inzulinu</h2><p>' + e(d.prescription) + '</p>' +
    '<p class="small muted">Pevné dávky z karty. NutriFee dávku nepočítá, nenavrhuje a nemění.</p>' +
    '<label class="check"' + NF.hook('issue-medication') + '><input type="checkbox" data-bind="draft.medicationChecked"' +
    (d.medicationChecked ? ' checked' : '') + '><span>Seznam léčby jsem s pacientem ověřil — jen inzulin, žádná perorální antidiabetika.</span></label>' +
    '<h2>3. Bezpečnostní a kontaktní plán</h2>' +
    '<p class="small muted">Verze ' + e(d.safety.version) + '. ' + e(d.safety.approvedNote) + '</p>' +
    '<label class="check"' + NF.hook('issue-safety') + '><input type="checkbox" data-bind="draft.safetyChecked"' +
    (d.safetyChecked ? ' checked' : '') + '><span>Bezpečnostní a kontaktní plán jsem předal a probral.</span></label>' +
    (chybi.length ? hint('<strong>Plán zatím nelze vydat.</strong> Chybí: ' + e(chybi.join(', ')) + '.', 'warn')
      : hint('Po vydání převezme pacienta sestra: zaučí ho a předá zařízení. Úkol se aktivuje až po zaučení a ověření porozumění.', 'success'));
};

/* ---------- kontrola: report ---------- */
function sectionHead(n, title, key) {
  return '<h2' + NF.hook(key) + '><span class="part-label">Část ' + n + '</span><br>' + e(title) + '</h2>';
}
function riseText(v) { return v == null ? '<span class="missing">nelze vyhodnotit</span>' : '≈ ' + e(NF.mmol(v)) + ' mmol/l'; }

V.onePage = function (S) {
  var p = NF.activePlan(S);
  var t = p ? NF.taskById(S, p.taskId) : null;
  var o = NF.adviceOutcome(S, p && p.id);
  var cons = NF.carbConsistency(S, p && p.id);
  var counts = NF.countEpisodes(S);
  var ss = S.sensorSummary;
  var ev = S.safetyEvents || [];
  var q = S.questions.length ? S.questions[S.questions.length - 1].text : null;
  var ill = S.episodes.filter(function (x) { return x.context === 'illness'; }).length;
  var reactRule = NF.usableRule(S, 'R-REAKCE');
  if (S.visitInterrupted) {
    return card('<p class="eyebrow">Kontrola přerušena</p><h1>Aktuální problém</h1>' +
      hint('<strong>Běžná kontrola je přerušená.</strong> Maketa přešla do bezpečnostního stavu. ' +
        'Léčbu neřeší automaticky a nic neodeslala.', 'danger') +
      '<h2>Modelový postup</h2>' +
      (S.safetyPlan ? '<ul class="plain-list">' + S.safetyPlan.sections.map(function (s) {
        return '<li><strong>' + e(s.title) + '</strong><p class="small">' + e(s.body) + '</p></li>';
      }).join('') + '</ul>' : '') +
      '<div class="actions">' + btn('Založit záznam incidentu', 'createIncident', null, 'secondary') +
      btn('Vrátit se ke kontrole', 'resumeVisit', null, 'secondary') + '</div>');
  }
  var out = '<div class="onepage"><div class="pagehead"><div><p class="eyebrow">Kontrola ' + e(NF.fmtDate(S.clock)) + '</p>' +
    '<h1>Report: jak plán probíhal</h1>' +
    '<p class="muted">Modelový pacient 01 · plán ' + e(p ? p.id + ' ' + p.version : 'nemáme údaj') +
    (S.enrollment.compensation ? ' · kompenzace při zařazení: ' + e(S.enrollment.compensation === 'insufficient' ? 'nedostatečná' : 'přijatelná') : '') + '</p></div>' +
    '<div class="actions">' + btn('Přerušit kontrolu — aktuální problém', 'interruptVisit', null, 'danger') +
    btn('Náhled tisku', 'print', null, 'secondary') + '</div></div>';

  out += card(sectionHead(1, 'Bezpečnostní události a úplnost dat', 'onepage-1') +
    (ev.length ? '<ul class="plain-list">' + ev.map(function (x) {
      return '<li><strong>' + e(NF.fmtDateTime(x.at)) + '</strong> ' + tag(x.source, 'warn') +
        '<p>„' + e(x.text) + '“</p>' +
        '<p class="small muted">Zaznamenáno ' + e(NF.fmtDateTime(x.reportedAt)) + '. Závažnost neklasifikujeme automaticky a nepotvrzujeme správnost postupu. ' +
        'Aplikace událost nezachytila v reálném čase.</p>' +
        (x.assessment ? '<p class="small"><strong>Vyhodnocení lékaře:</strong> ' + e(x.assessment) + '</p>'
          : '<div class="actions">' + btn('Označit jako probrané', 'assessEvent', x.id, 'secondary') + '</div>') + '</li>';
    }).join('') + '</ul>'
      : '<p>Žádná bezpečnostní událost nebyla zaznamenána. To není tvrzení, že žádná nenastala.</p>') +
    '<p class="small muted">Úplnost dat: ' + (counts.recorded
      ? counts.recorded + ' zapsaných jídel, z toho ' + counts.complete + ' s úplnými daty' + (ill ? '; ' + ill + ' z doby nemoci se nezapočítává' : '') + '.'
      : 'Pacient v tomto období nezapsal žádné jídlo.') + '</p>');

  out += card(sectionHead(2, 'Plán a jak probíhal', 'onepage-2') +
    '<div class="evidence-labels"><div><dt>Úkol</dt><dd>' + e(t ? t.title : 'nemáme údaj') + '</dd></div>' +
    '<div><dt>Předepsáno</dt><dd>' + e(p ? p.prescription : 'nemáme údaj') + '</dd></div>' +
    '<div><dt>Konzistence sacharidů</dt><dd>' + (cons
      ? 'Sacharidy ve snídani mezi dny ' + cons.min + '–' + cons.max + ' g, medián ' + e(Math.round(cons.median)) + ' g. ' +
        (cons.off ? cons.off + '× jiná než obvyklá porce.' : 'Pokaždé obvyklá porce.')
      : '<span class="missing">nelze vyhodnotit — žádné zápisy</span>') + '</dd></div>' +
    '<div><dt>Nezávisle ověřeno podání</dt><dd><span class="missing">nemáme údaj</span> — údaje o inzulinu jsou pacientovy záznamy</dd></div></div>' +
    '<p class="small muted">Odhad sacharidů vychází z katalogu jídel a pacientem zvolené porce, ne z vážení.</p>');

  out += card(sectionHead(3, 'Senzor: čas v rozmezí', 'onepage-3') +
    (ss ? '<p class="small muted">Období ' + e(ss.period) + '. Modelově nastavené rozmezí pro tuto demonstraci: ' + e(ss.range) + '.</p>' +
      '<div class="review-facts">' + kv('Dostupnost dat', e(ss.availability) + ' %') + kv('Čas v rozmezí (TIR)', e(ss.tir) + ' %') +
      kv('Čas pod rozmezím', e(ss.below) + ' %') + kv('Čas nad rozmezím', e(ss.above) + ' %') + '</div>' +
      '<p class="small muted">Tři časové kategorie dávají 100 %. Dostupnost dat je jiný ukazatel a do součtu nevstupuje. ' + e(ss.note) + '</p>'
      : '<p><span class="missing">Senzorový souhrn není k dispozici — nelze vyhodnotit.</span></p>' +
        '<p class="small muted">Nezobrazujeme nuly. Chybějící údaj není nula.</p>'));

  var eaten = S.foods.filter(function (f) { return NF.foodHistory(S, f.id).eaten > 0; });
  out += card(sectionHead(4, 'Reakce na jednotlivá jídla', 'onepage-4') +
    (eaten.length ? '<div class="tablewrap"><table><thead><tr><th>Jídlo</th><th>Zapsáno</th><th>Úplně</th><th>Úroveň</th><th>Obvyklý vzestup</th><th>Co pomohlo</th></tr></thead><tbody>' +
      eaten.map(function (f) {
        var c = NF.confidence(S, f.id), h = c.history;
        var fx = c.level === 'known' ? NF.leverEffects(S, f.id) : [];
        return '<tr><td>' + e(f.name) + '</td><td>' + h.eaten + '×</td><td>' + h.usable + '×</td><td>' + V.levelTag(c.level) + '</td>' +
          '<td>' + (c.level === 'known' ? riseText(h.typicalRise) : '<span class="missing">bez čísla</span>') + '</td>' +
          '<td>' + (fx.length ? fx.map(function (x) { return e(NF.LEVERS[x.lever].label) + ' (' + x.n + '×, ≈ ' + e(NF.mmol(x.rise)) + ')'; }).join('<br>') : '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="rule-line">' + (reactRule ? ruleChip(S, NF.ruleKey(reactRule)) : '<span class="missing">Pravidlo R-REAKCE není schválené — nic se nevyhodnocuje.</span>') + '</p>' +
      '<p class="small muted">Vzestup = nejvyšší hodnota do 120 minut minus výchozí. Počítají se jen úplné záznamy mimo nemoc. ' +
      'Jde o pacientovu minulost, ne o předpověď.</p>' +
      '<div class="actions">' + btn('Otevřít jednotlivé záznamy', 'page', 'evidence', 'link') + '</div>'
      : '<p>Pacient nezapsal žádné jídlo.</p><p class="small muted">Není to hodnocení pacienta. Kontrolu lze dokončit.</p>'));

  var fmtLever = function (k) { var b = o.byLever[k]; return e(NF.LEVERS[k].label) + ': nabídnuto ' + b.offered + '×, přijato ' + b.accepted + '×'; };
  var reasonLabel = function (k) { return (NF.DECLINE_REASONS.filter(function (r) { return r[0] === k; })[0] || [k, k])[1]; };
  out += card(sectionHead(5, 'Fungovaly rady, když je pacient přijal?', 'onepage-5') +
    (o.offered ? '<div class="outcome-grid">' +
      '<div class="outcome"><span>Rada přijata</span><strong>' + o.accepted.n + '×</strong><p>vzestup ' + riseText(o.accepted.rise) + '</p><small>' + o.accepted.usable + ' úplných záznamů</small></div>' +
      '<div class="outcome"><span>Rada nepřijata</span><strong>' + o.declined.n + '×</strong><p>vzestup ' + riseText(o.declined.rise) + '</p><small>' + o.declined.usable + ' úplných záznamů</small></div></div>' +
      '<p class="small">' + Object.keys(o.byLever).map(fmtLever).join(' · ') + '</p>' +
      (o.topReason ? '<p class="small">Nejčastější důvod, proč ne: <strong>' + e(reasonLabel(o.topReason)) + '</strong> (' + o.reasons[o.topReason] + '×).</p>' : '') +
      (o.signal ? hint('<strong>Signál k rozhovoru:</strong> rady pacient většinou nechává být (' + o.declined.n + ' z ' + o.offered + '). ' +
        (o.impractical
          ? 'Převažující důvod „' + e(reasonLabel(o.topReason)) + '“ naznačuje, že <strong>rada může být nepraktická</strong> — stojí za to zvolit jinou páku.'
          : 'Může to být téma k rozhovoru a důvod pro <strong>úkol na změnu režimu</strong>.') +
        ' Report neříká, že pacient „neposlechl“; říká, co se zkusilo a co z toho bylo.', 'warn') : '') +
      '<p class="small muted">Srovnání je z malého počtu záznamů jednoho pacienta a nerozlišuje další vlivy. Ukazuje směr, ne důkaz účinku.</p>'
      : '<p>Pacient zatím žádnou radu nedostal ani neodmítl.</p><p class="small muted">Bez rad nelze posoudit, jestli fungují.</p>'));

  out += card(sectionHead(6, 'Hlavní otázka pacienta', 'onepage-6') +
    (q ? '<p>„' + e(q) + '“</p>' : '<p><span class="missing">Pacient neuložil otázku.</span></p>'));

  out += '<div class="actions">' + btn('Pokračovat k rozhodnutí', 'page', 'decide', 'primary') + '</div>';
  return out + '</div>';
};

V.evidence = function (S) {
  var eps = S.episodes;
  var foodId = S.evidenceFood || (eps[0] || {}).foodId;
  var list = eps.filter(function (x) { return x.foodId === foodId; });
  var food = NF.foodById(S, foodId);
  if (!food) return card('<h1>Záznamy</h1><p>Žádný záznam k zobrazení.</p>' +
    '<div class="actions">' + btn('Zpět na report', 'page', 'onepage', 'primary') + '</div>');
  var usable = list.filter(NF.usableEpisode);
  return '<div class="pagehead"><div><p class="eyebrow">Záznamy k reportu</p><h1>' + e(food.name) + '</h1></div>' +
    '<div class="actions">' + btn('Zpět na report', 'page', 'onepage', 'secondary') + '</div></div>' +
    card('<div class="pillgroup">' + S.foods.filter(function (f) { return NF.foodHistory(S, f.id).eaten; }).map(function (f) {
      return choice(f.name, 'setEvidence', f.id, f.id === foodId);
    }).join('') + '</div>' +
      '<p class="small muted">Vlastnosti obvyklé porce (katalog jídel): sacharidy ' + food.carbs + ' g, bílkovina ' + food.protein + ' g, tuk ' + food.fat +
      ' g, vláknina ' + food.fiber + ' g, forma ' + e(NF.FORMS[food.form] || food.form) + '.</p>' +
      chart(usable.slice(-4), 'Poslední úplné průběhy po jídle ' + food.name) +
      '<div class="tablewrap"><table><thead><tr><th>Záznam</th><th>Porce</th><th>Inzulin při radě</th><th>Rada</th><th>Vzestup</th></tr></thead><tbody>' +
      list.map(function (ep) {
        var adv = (ep.advice || []).filter(function (a) { return a.accepted !== null; }).map(function (a) {
          return e(NF.LEVERS[a.lever].label) + ': ' + (a.accepted ? 'přijata' : 'nepřijata');
        }).join('<br>');
        return '<tr><td class="nowrap">' + e(ep.id + ' · ' + NF.fmtShort(ep.at)) + '</td>' +
          '<td>' + e((NF.PORTIONS.filter(function (p) { return p[0] === ep.portion; })[0] || ['', ''])[1]) + '</td>' +
          '<td>' + e(ep.bolusAtAdvice === 'before' ? 'před' : ep.bolusAtAdvice === 'after' ? 'po' : ep.bolusAtAdvice === 'unknown' ? 'nevím (jako po)' : '—') + '</td>' +
          '<td>' + (adv || '—') + '</td>' +
          '<td>' + (NF.usableEpisode(ep) ? '≈ ' + e(NF.mmol(NF.rise(ep))) + ' mmol/l' : '<span class="missing">' + (ep.context === 'illness' ? 'nemoc — nepočítá se' : 'neúplné') + '</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div>');
};

V.decide = function (S) {
  var D = global.NutriFeeDemo;
  var rev = S.reviews[S.reviews.length - 1];
  var p = NF.activePlan(S);
  var choiceV = (S.form && S.form.choice) || (rev && rev.decision && rev.decision.choice) || '';
  var reason = (S.form && S.form.reason) || (rev && rev.decision ? rev.decision.reason : '');
  var issued = S.plans.length > 1;
  var o = NF.adviceOutcome(S, p && p.id);
  var opts = [
    ['continue', 'Pokračovat ve stejném úkolu'],
    ['regime', 'Vydat úkol na změnu režimu'],
    ['defer', 'Zatím nelze rozhodnout']
  ];
  return '<div class="pagehead"><div><p class="eyebrow">Rozhodnutí lékaře</p><h1>Co dál s plánem</h1></div></div>' +
    card('<p class="muted">Platný plán: <strong>' + e(p ? p.id + ' ' + p.version : 'nemáme údaj') + '</strong>. ' +
      (o.offered ? 'Rady přijaty ' + o.accepted.n + '×, nepřijaty ' + o.declined.n + '×.' : 'Rady zatím nebyly nabídnuty.') + '</p>' +
      '<fieldset class="choice-field"' + NF.hook('decide-options') + '><legend>Rozhodnutí</legend><div class="choice-row">' +
      opts.map(function (x) { return choice(x[1], 'formSet', 'choice:' + x[0], choiceV === x[0]); }).join('') + '</div></fieldset>' +
      '<fieldset class="choice-field"' + NF.hook('decide-reasons') + '><legend>Důvod</legend><div class="buttonlist">' +
      ((D && D.decisionReasons) || []).map(function (r) {
        return btn(r, 'pickReason', r, reason === r ? 'selected' : 'secondary');
      }).join('') + '</div></fieldset>' +
      '<p class="small muted">Důvody jsou předem připravené, aby šly vyhodnotit napříč studií. Lékař nic nepíše.</p>' +
      (choiceV === 'regime' ? hint('Nový úkol se vybere z katalogu: <strong>' + e(((D && D.taskCatalog) || []).filter(function (c) { return c.id === 'T-REZIM'; }).map(function (c) { return c.title; })[0] || '') + '</strong>. Dávky se nemění.') : '') +
      (choiceV === 'defer' ? hint('Rozhodnutí zůstává otevřené. Nový plán se nevydává a stávající platí dál.') : '') +
      '<div class="actions">' +
      (issued ? btn('Zobrazit výsledek demonstrace', 'page', 'result', 'primary')
        : btn('Vydat P2', 'issueP2', null, 'primary')) +
      btn('Zpět na report', 'page', 'onepage', 'secondary') + '</div>' +
      (issued ? hint('P2 je vydaný a předaný pacientovi. Historie P1 a jeho záznamů zůstává beze změny.', 'success') : ''));
};

V.result = function (S) {
  var d = S.decisions.helped;
  return card('<p class="eyebrow">Výsledek demonstrace</p><h1>Pomohlo to?</h1>' +
    '<p class="muted">Tento záznam je oddělený hodnoticí panel demonstrace. Není součástí reportu o pacientovi.</p>' +
    '<fieldset class="choice-field"><legend>Pomohl report rozhodnout, jestli rady k jídlu u tohoto pacienta fungují?</legend><div class="choice-row">' +
    [['yes', 'Ano'], ['partly', 'Částečně'], ['no', 'Ne'], ['undecided', 'Nerozhodnuto']].map(function (x) {
      return choice(x[1], 'setHelped', x[0], d === x[0]);
    }).join('') + '</div></fieldset>' +
    '<p class="small muted">Výchozí stav je nerozhodnuto. Nic tu není předvyplněné a nikde netvrdíme úsporu konkrétního počtu minut.</p>' +
    '<div class="actions">' + btn('Náhled tisku reportu', 'print', null, 'secondary') +
    btn('Zpět na report', 'page', 'onepage', 'secondary') + '</div>');
};

V.versions = function (S) {
  return card('<p class="eyebrow">Verze a stopa</p><h1>Co se v této demonstraci stalo</h1>' +
    '<h2>Plány</h2><ul class="plain-list">' + (S.plans.length ? S.plans.map(function (p) {
      return '<li><strong>' + e(p.id + ' ' + p.version) + '</strong> ' + (p.id === S.activePlanId ? tag('platný', 'ok') : tag('starší')) +
        '<p class="small muted">Vydal ' + e(p.author) + ' ' + e(NF.fmtDateTime(p.issuedAt)) +
        (p.previousId ? ' · navazuje na ' + e(p.previousId) : '') + '</p></li>';
    }).join('') : '<li>Žádný plán zatím nebyl vydán.</li>') + '</ul>' +
    '<h2>Úkoly</h2><ul class="plain-list">' + (S.tasks.length ? S.tasks.map(function (t) {
      return '<li><strong>' + e(t.id + ' · ' + t.title) + '</strong> ' + tag(t.state) +
        '<p class="small muted">Pravidlo ' + e(t.ruleId + ' ' + (t.ruleVersion || '')) + ' · plán ' + e(t.planId || '—') +
        (t.pauseDetail && t.state === 'paused' ? ' · ' + e(t.pauseDetail) : '') + '</p>' +
        (t.state === 'paused' ? '<div class="actions">' + btn('Potvrdit obnovení úkolu', 'page', 'resume', 'secondary') + '</div>' : '') + '</li>';
    }).join('') : '<li>Žádný úkol.</li>') + '</ul>' +
    '<h2' + NF.hook('versions-trace') + '>Stopa demonstrace</h2><div class="tablewrap"><table><thead><tr><th>Čas</th><th>Událost</th><th>Podrobnost</th></tr></thead><tbody>' +
    S.events.slice(-25).reverse().map(function (x) {
      return '<tr><td class="nowrap">' + e(NF.fmtDateTime(x.at)) + '</td><td>' + e(x.what) + '</td><td>' + e(x.detail) + '</td></tr>';
    }).join('') + '</tbody></table></div>' +
    '<p class="small muted">Stopa je lokální záznam demonstrace. Nikam se neodesílá.</p>');
};

V.resume = function (S) {
  var D = global.NutriFeeDemo;
  var t = S.tasks.filter(function (x) { return x.state === 'paused'; })[0];
  if (!t) return card('<h1>Obnovení úkolu</h1><p>Žádný úkol není pozastavený.</p>' +
    '<div class="actions">' + btn('Zpět', 'page', 'versions', 'secondary') + '</div>');
  var p = NF.activePlan(S);
  var blockers = [];
  if (S.illness && S.illness.active) blockers.push('Období nemoci je stále označené jako trvající.');
  if (!p || p.state !== 'issued') blockers.push('Plán není v platném stavu.');
  if (t.pauseReason === 'rule' && !NF.isRuleUsable(S, t.ruleId)) blockers.push('Pravidlo ' + t.ruleId + ' není ve schválené verzi.');
  var reasons = (D && D.resumeReasons) || ['Lékař ověřil aktuálnost plánu.'];
  var chosen = (S.form && S.form.resumeReason) || '';
  return card('<div' + NF.hook('resume-conditions') + '><p class="eyebrow">Obnovení úkolu</p><h1>' + e(t.title) + '</h1>' +
    '<p>Pozastaveno ' + e(NF.fmtDateTime(t.pausedAt)) + '. Důvod: ' + e(t.pauseDetail || '') + '</p>' +
    '<h2>Podmínky obnovení</h2>' +
    '<p class="small muted">Podmínkou je potvrzení lékařem a ověření aktuálnosti plánu. ' +
    'Jde o konzervativní demo variantu; reálné podmínky určí garant. Samotné uplynutí času ani návrat dat úkol neobnoví.</p>' +
    (blockers.length ? hint('<strong>Zatím nelze obnovit:</strong><br>' + blockers.map(e).join('<br>'), 'warn') : '') +
    '<fieldset class="choice-field"><legend>Důvod obnovení (uvidí jej pacient)</legend><div class="buttonlist">' +
    reasons.map(function (r) { return btn(r, 'formSet', 'resumeReason:' + r, chosen === r ? 'selected' : 'secondary'); }).join('') + '</div></fieldset>' +
    '<div class="actions">' +
    (blockers.length ? btnHtml('Obnovit úkol', 'noop', null, 'primary', ' disabled') : btn('Obnovit úkol', 'resumeTask', null, 'primary')) +
    (S.illness && S.illness.active ? btn('Ukončit označené období nemoci', 'endIllness', null, 'secondary') : '') +
    btn('Zpět', 'page', 'versions', 'secondary') + '</div></div>');
};

/* ---------- garant ---------- */
V.garant = function (S) {
  var items = [['catalog', 'Katalog pravidel'], ['incidents', 'Podněty a incidenty'], ['decisions', 'Rozhodovací list']];
  var body;
  switch (S.page) {
    case 'incidents': body = V.incidents(S); break;
    case 'decisions': body = V.decisions(S); break;
    default: body = V.catalog(S);
  }
  return tabs(S, items) + '<div class="clinic-page">' + body + '</div>';
};

function ruleCard(S, r) {
  var status = { approved: ['schváleno garantem', 'approved'], draft: ['návrh', 'pending'], retired: ['vyřazeno z použití', 'rejected'] }[r.status];
  var lever = r.lever ? NF.LEVERS[r.lever] : null;
  return '<div class="rule-card"' + NF.hook('rule-' + r.status) + '>' +
    '<h3>' + e(r.id + ' ' + r.version) + ' <span class="rule-tag ' + status[1] + '">' + e(status[0]) + '</span></h3>' +
    '<p>' + e(r.title) + '</p>' +
    '<dl><dt>Druh</dt><dd>' + e(lever ? 'Rada — páka „' + lever.label + '“' + (lever.carbs ? ', mění sacharidy: jen před bolusem' : ', sacharidy nemění: kdykoli') : r.kind) + '</dd>' +
    '<dt>Účel</dt><dd>' + e(r.purpose) + '</dd>' +
    '<dt>Vstupy</dt><dd>' + r.inputs.map(e).join('; ') + '</dd>' +
    (r.params ? '<dt>Parametry</dt><dd>' + Object.keys(r.params).map(function (k) { return e(k + ' = ' + r.params[k]); }).join('; ') + '</dd>' : '') +
    '<dt>Omezení</dt><dd>' + r.limits.map(e).join('<br>') + '</dd>' +
    (r.text ? '<dt>Text pro pacienta</dt><dd>' + e(r.text) + '</dd>' : '') +
    (r.approvedBy ? '<dt>Schválil</dt><dd>' + e(r.approvedBy) + ' ' + e(NF.fmtDateTime(r.approvedAt)) + ' (modelově)</dd>' : '') +
    (r.retiredReason ? '<dt>Důvod vyřazení</dt><dd>' + e(r.retiredReason) + '</dd>' : '') + '</dl>' +
    '<details><summary>Testovací příklady použití i nepoužití</summary><div>' +
    '<p class="small"><strong>Použije se:</strong> ' + (r.examples.use.length ? r.examples.use.map(e).join(' ') : '—') + '</p>' +
    '<p class="small"><strong>Nepoužije se:</strong> ' + (r.examples.skip.length ? r.examples.skip.map(e).join(' ') : '—') + '</p>' +
    (r.status === 'draft' ? '<label class="check"><input type="checkbox" data-bind="ruleExamples.' + e(NF.ruleKey(r)) + '"' + (r.examplesReviewed ? ' checked' : '') + '><span>Příklady jsem prošel.</span></label>' : '') +
    '</div></details>' +
    (r.status === 'draft' ? '<div class="actions">' + btn('Schválit ' + r.version, 'approveRule', NF.ruleKey(r), 'primary') + '</div>' +
      '<p class="small muted">Dokud návrh není schválený, nevytvoří žádný výpočet ani radu a úkol s ním nejde přiřadit.</p>' : '') +
    (r.status === 'approved' ? '<div class="actions">' + btn('Vyřadit z dalšího použití', 'openRetire', NF.ruleKey(r), 'danger') + '</div>' : '') +
    '</div>';
}

V.catalog = function (S) {
  var D = global.NutriFeeDemo;
  var groups = [
    ['Výpočty', function (r) { return !r.lever && r.kind !== 'úkol'; }],
    ['Rady k jídlu a pohybu', function (r) { return !!r.lever; }],
    ['Úkoly', function (r) { return r.kind === 'úkol'; }]
  ];
  var retireReasons = (D && D.retireReasons) || [];
  var chosenReason = (S.form && S.form.retireReason) || '';
  return '<div class="pagehead"><div><p class="eyebrow">Garant · DEMO-G01</p><h1>Katalog pravidel</h1>' +
    '<p class="muted">Každý výpočet i rada v aplikaci pochází z pravidla v tomto katalogu. K pacientovi se dostane jen schválená verze. Schválení pravidla není vydání předpisu.</p></div></div>' +
    (S.impulse ? card(hint('<strong>Podnět k posouzení.</strong> ' + e(S.impulse.text) + '<br>' + e(S.impulse.note) +
      '<div class="actions">' + btn('Otevřít podnět', 'page', 'incidents', 'secondary') + '</div>', 'warn'), 'flat') : '') +
    groups.map(function (g) {
      var rs = S.rules.filter(g[1]);
      return rs.length ? card('<h2>' + e(g[0]) + '</h2>' + rs.map(function (r) { return ruleCard(S, r); }).join('')) : '';
    }).join('') +
    (S.retireOpen ? card('<h2>Vyřazení pravidla ' + e(S.retireOpen) + '</h2>' +
      '<fieldset class="choice-field"><legend>Důvod vyřazení</legend><div class="buttonlist">' +
      retireReasons.map(function (r) { return btn(r, 'formSet', 'retireReason:' + r, chosenReason === r ? 'selected' : 'secondary'); }).join('') + '</div></fieldset>' +
      '<div class="actions">' + btn('Potvrdit vyřazení', 'retireRule', S.retireOpen, 'danger') + btn('Zrušit', 'closeRetire', null, 'secondary') + '</div>' +
      '<p class="small muted">Akce je potvrzena uvnitř makety. Nikam se neodesílá.</p>') : '') +
    (S.lastRetire ? card('<h2>Dopad změny pravidla</h2>' +
      '<p>Jde o dopad změny pravidla, ne o živý monitoring zdravotního stavu.</p>' +
      '<div class="tablewrap"><table><thead><tr><th>Pacient</th><th>Co se mění</th></tr></thead><tbody>' +
      '<tr><td>' + e(S.patient.label) + '</td><td>' + e(impactText(S)) + '</td></tr></tbody></table></div>' +
      '<p class="small muted">Předpis plánu ' + e(S.activePlanId || '') + ' se nemění. Vyřazení pravidla nemění inzulin.</p>' +
      '<div class="row"><p class="small"><strong>Doručení změny do zařízení pacienta:</strong> ' +
      (S.ruleDelivery === 'unconfirmed' ? '<span class="missing">nepotvrzeno</span>' : 'potvrzeno') + '</p></div>' +
      (S.ruleDelivery === 'unconfirmed' ? hint('Zařízení je v simulaci offline. Bez spojení aplikace rady vypíná, takže vyřazená rada se nenabídne ani tam. ' +
        'Změnu textu ale pacient uvidí až po připojení — k tomu je potřeba samostatný organizační kontakt odpovědnou osobou. Žádná zpráva se neodesílá.', 'warn') : '')) : '');
};
function impactText(S) {
  var r = NF.ruleByKey(S, S.lastRetire);
  if (!r) return '';
  if (r.lever) return 'Rada „' + NF.LEVERS[r.lever].label + '“ se přestane nabízet. Úkol běží dál, ostatní rady platí.';
  var paused = S.tasks.filter(function (t) { return t.pauseReason === 'rule'; });
  return paused.length ? 'Úkol ' + paused[0].id + ' je pozastavený.' : 'Žádný aktivní úkol se nemění.';
}

V.incidents = function (S) {
  return '<div class="pagehead"><div><p class="eyebrow">Garant</p><h1>Podněty a incidenty</h1></div></div>' +
    (S.impulse ? card('<h2>Podnět</h2><p>' + e(S.impulse.text) + '</p>' +
      '<p class="small muted">' + e(S.impulse.note) + ' Zaznamenáno ' + e(NF.fmtDateTime(S.impulse.at)) + '.</p>' +
      '<div class="actions">' + btn('Založit záznam incidentu', 'createIncident', null, 'secondary') +
      btn('Přejít na katalog', 'page', 'catalog', 'secondary') + '</div>') : '') +
    (S.incidents.length ? card('<h2>Záznamy</h2>' + S.incidents.map(function (i) {
      return '<div class="rule-card"><h3>' + e(i.id) + ' ' + tag(i.state, 'warn') + '</h3>' +
        '<dl><dt>Podnět</dt><dd>' + e(i.report) + '</dd>' +
        '<dt>Zdroj</dt><dd>' + e(i.source) + '</dd>' +
        '<dt>Čas</dt><dd>' + e(NF.fmtDateTime(i.at)) + '</dd>' +
        '<dt>Dotčené verze</dt><dd>' + (i.versions.length ? i.versions.map(e).join(', ') : '—') + '</dd>' +
        '<dt>Odpovědná role</dt><dd>' + e(i.role) + '</dd>' +
        '<dt>Posouzení klinického dopadu</dt><dd>' + e(i.clinical) + '</dd>' +
        '<dt>Technická náprava</dt><dd>' + e(i.technical) + '</dd></dl>' +
        '<div class="actions">' + btn('Zaznamenat posouzení klinického dopadu', 'assessIncident', i.id + ':clinical', 'secondary') +
        btn('Zaznamenat technickou nápravu', 'assessIncident', i.id + ':technical', 'secondary') + '</div></div>';
    }).join('') + hint('Povinnost regulatorního hlášení a jeho klasifikaci maketa neurčuje. Nic se neodesílá.')) : '') +
    card('<h2>Náprava</h2>' +
      '<p>Novou verzi pravidla lze schválit až po kontrole testovacích příkladů. Schválení samo nevydává nový plán.</p>' +
      '<div class="actions">' + btn('Otevřít katalog', 'page', 'catalog', 'primary') + '</div>');
};

V.decisions = function (S) {
  var D = global.NutriFeeDemo;
  var list = (D && D.decisionList) || [];
  return '<div class="pagehead"><div><p class="eyebrow">Garant</p><h1>Rozhodovací list</h1>' +
    '<p class="muted">Co musí garant rozhodnout, než se o studii dá mluvit. Výchozí stav je nerozhodnuto. Nic není předvybrané.</p></div></div>' +
    (list.length ? list.map(function (it) {
      var v = S.decisions[it.key] || '';
      var note = (S.decisionNotes && S.decisionNotes[it.key]) || '';
      return card('<div class="decision-box"' + NF.hook('decision-' + it.key) + '><h2>' + e(it.title) + '</h2><p>' + e(it.q) + '</p>' +
        (it.proposal ? '<p class="small"><strong>Návrh v maketě:</strong> ' + e(it.proposal) + '</p>' : '') +
        '<div class="choice-row">' + [['yes', 'Přijmout návrh'], ['change', 'Navrhnout úpravu'], ['no', 'Nezařadit'], ['', 'Nerozhodnuto']].map(function (o) {
          return choice(o[1], 'decide', it.key + ':' + o[0], v === o[0]);
        }).join('') + '</div>' +
        '<label class="field">Poznámka garanta<textarea data-bind="decisionNotes.' + e(it.key) + '">' + e(note) + '</textarea></label></div>');
    }).join('') : card('<p>Seznam rozhodnutí není v tomto sestavení k dispozici.</p>')) +
    card('<div class="actions">' + btn('Exportovat poznámky z demonstrace', 'exportNotes', null, 'secondary') + '</div>' +
      '<p class="small muted">Export je jednoduchý textový soubor označený „Poznámky z demonstrace — nejde o formální klinické schválení“.</p>');
};

})(typeof window !== 'undefined' ? window : globalThis);
