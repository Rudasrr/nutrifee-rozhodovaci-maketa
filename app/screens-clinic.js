/* Obrazovky lékaře a garanta. */
(function (global) {
'use strict';
var NF = global.NutriFee, V = NF.screens, e = NF.esc;
var btn = V.btn, btnHtml = V.btnHtml, hint = V.hint, kv = V.kv, card = V.card, tag = V.tag, chart = V.chart;

function tabs(S, items) {
  return '<nav class="tabs" aria-label="Nabídka">' + items.map(function (it) {
    return '<button type="button" class="btn ' + (S.page === it[0] ? 'primary' : '') + '" data-action="page" data-value="' + it[0] + '"' +
      (S.page === it[0] ? ' aria-current="page"' : '') + '>' + e(it[1]) + '</button>';
  }).join('') + '</nav>';
}

/* ---------- lékař ---------- */
V.doctor = function (S) {
  var items = [['issue', 'Vydání plánu'], ['onepage', 'Kontrola — jedna stránka'], ['decide', 'Rozhodnutí'], ['versions', 'Verze a stopa']];
  if (S.doseBasis) items.splice(3, 0, ['dose', 'Dávkové podklady']);
  var body;
  switch (S.page) {
    case 'onepage': body = V.onePage(S); break;
    case 'evidence': body = V.evidence(S); break;
    case 'decide': body = V.decide(S); break;
    case 'result': body = V.result(S); break;
    case 'versions': body = V.versions(S); break;
    case 'dose': body = V.dose(S); break;
    case 'resume': body = V.resume(S); break;
    default: body = V.issue(S);
  }
  return tabs(S, items) + '<div class="clinic-page">' + body + '</div>';
};

V.issue = function (S) {
  var d = S.draft;
  var active = NF.activePlan(S);
  if (!d) {
    return card('<p class="eyebrow">Vydání plánu</p><h1>Žádný připravený návrh</h1>' +
      (active ? '<p>Platný plán je <strong>' + e(active.id + ' ' + active.version) + '</strong>, účinný od ' + e(NF.fmtDate(active.effectiveFrom)) + '.</p>' +
        '<p class="small muted">Nový plán se připravuje na kontrole v části Rozhodnutí.</p>' +
        '<div class="actions">' + btn('Otevřít kontrolu', 'page', 'onepage', 'primary') + '</div>'
        : '<p>Pro tohoto modelového pacienta zatím není připravený návrh plánu.</p>'));
  }
  var t = NF.taskById(S, d.taskId);
  var missing = [];
  if (!d.medicationChecked) missing.push('ověření modelového seznamu léčby');
  if (!d.safetyChecked) missing.push('bezpečnostní a kontaktní plán');
  if (!d.taskId) missing.push('přiřazený úkol');
  return '<div class="wizard"><div class="wizard-body">' +
    '<p class="eyebrow">Modelový pacient 01 · DEMO-P01</p>' +
    '<h1>Vydání plánu ' + e(d.planId + ' ' + d.version) + '</h1>' +
    '<p class="muted">Dospělý s DM2, stabilní bazál–bolus režim, nově zavedený senzor. Údaje jsou syntetické.</p>' +
    '<div class="person-line"><span class="person-avatar" aria-hidden="true">P1</span><div><strong>Modelový pacient 01</strong><span>DEMO-P01 · bez reálných identifikátorů</span></div></div>' +
    '<h2>1. Modelový seznam léčby</h2>' +
    '<p class="small muted">Vyplnil pacient jako podklad k ověření: „' + e(S.onboarding.medication || 'nevyplněno') + '“</p>' +
    '<label class="check"' + NF.hook('issue-medication') + '><input type="checkbox" data-bind="draft.medicationChecked"' + (d.medicationChecked ? ' checked' : '') + '>' +
    '<span>Seznam léčby jsem s pacientem ověřil.</span></label>' +
    '<h2>2. Bezpečnostní a kontaktní plán</h2>' +
    '<p class="small muted">Verze ' + e(d.safety.version) + '. ' + e(d.safety.approvedNote) + '</p>' +
    '<label class="check"' + NF.hook('issue-safety') + '><input type="checkbox" data-bind="draft.safetyChecked"' + (d.safetyChecked ? ' checked' : '') + '>' +
    '<span>Bezpečnostní a kontaktní plán jsem předal a probral.</span></label>' +
    '<h2>3. Úkol</h2>' +
    (t ? '<div class="plan-proposal"><h2>' + e(t.title) + '</h2>' +
      '<p class="proposal-reason">Otázka pacienta: „' + e(t.question) + '“</p>' +
      '<p class="small muted">Pravidlo ' + e(t.ruleId + ' ' + t.ruleVersion) + '. Výchozí stav pouze pozorovací — bez doporučení změny jídla či pohybu.</p></div>' : '') +
    '<h2>4. Modelový předpis</h2><p>' + e(d.prescription) + '</p>' +
    '<p class="small muted">Statický text. NutriFee dávku nepočítá, nenavrhuje a nemění.</p>' +
    (missing.length ? hint('<strong>Plán zatím nelze vydat.</strong> Chybí: ' + e(missing.join(', ')) + '.', 'warn') : '') +
    '<div class="wizard-footer quiet">' +
    (missing.length ? btnHtml('Vydat plán', 'noop', null, 'primary', ' disabled') : btn('Vydat plán', 'issuePlan', null, 'primary')) +
    '</div></div></div>';
};

function sectionHead(n, title, key) {
  return '<h2' + NF.hook(key) + '><span class="part-label">Část ' + n + '</span><br>' + e(title) + '</h2>';
}

V.onePage = function (S) {
  var p = NF.activePlan(S);
  var rev = NF.buildReview(S);
  var counts = NF.countEpisodes(S);
  var ss = S.sensorSummary;
  var ev = S.safetyEvents || [];
  if (S.visitInterrupted) {
    return card('<p class="eyebrow">Kontrola přerušena</p><h1>Aktuální problém</h1>' +
      hint('<strong>Běžná kontrola je přerušená.</strong> Maketa přešla do bezpečnostního stavu. ' +
        'Léčbu neřeší automaticky a nic neodeslala.', 'danger') +
      '<h2>Modelový postup</h2>' +
      (S.safetyPlan ? '<ul class="plain-list">' + S.safetyPlan.sections.map(function (s) {
        return '<li><strong>' + e(s.title) + '</strong><p class="small">' + e(s.body) + '</p></li>';
      }).join('') + '</ul>' : '') +
      '<div class="actions">' + btn('Založit záznam incidentu', 'openIncident', null, 'secondary') +
      btn('Vrátit se ke kontrole', 'resumeVisit', null, 'secondary') + '</div>');
  }
  var out = '<div class="onepage"><div class="pagehead"><div><p class="eyebrow">Kontrola ' + e(NF.fmtDate(S.clock)) + '</p>' +
    '<h1>Jednostránkový podklad</h1>' +
    '<p class="muted">Modelový pacient 01 · plán ' + e(p ? p.id + ' ' + p.version : 'nemáme údaj') + '</p></div>' +
    '<div class="actions">' + btn('Přerušit kontrolu — aktuální problém', 'interruptVisit', null, 'danger') +
    btn('Náhled tisku', 'print', null, 'secondary') + '</div></div>';

  out += card(sectionHead(1, 'Bezpečnostní události a úplnost dat', 'onepage-1') +
    (ev.length ? '<ul class="plain-list">' + ev.map(function (x) {
      return '<li><strong>' + e(NF.fmtDateTime(x.at)) + '</strong> ' + tag(x.source, 'warn') +
        '<p>„' + e(x.text) + '“</p>' +
        '<p class="small muted">Zaznamenáno ' + e(NF.fmtDateTime(x.reportedAt)) + '. Závažnost neklasifikujeme automaticky a nepotvrzujeme správnost postupu. ' +
        'Aplikace událost nezachytila v reálném čase.</p>' +
        (x.assessment ? '<p class="small"><strong>Vyhodnocení lékaře:</strong> ' + e(x.assessment) + '</p>'
          : '<div class="actions">' + btn('Zaznamenat vyhodnocení', 'assessEvent', x.id, 'secondary') + '</div>') + '</li>';
    }).join('') + '</ul>'
      : '<p>' + e(rev.sections.safety.text) + '</p>') +
    '<p class="small muted">Úplnost dat: ' + e(rev.sections.safety.completeness) + '</p>');

  out += card(sectionHead(2, 'Platný plán a zaznamenané odchylky', 'onepage-2') +
    '<div class="evidence-labels"><div><dt>Předepsáno</dt><dd>' + e(p ? p.prescription : 'nemáme údaj') + '</dd></div>' +
    '<div><dt>Pacientem zaznamenáno</dt><dd>' + rev.sections.plan.patientReported.map(e).join('<br>') + '</dd></div>' +
    '<div><dt>Nezávisle ověřeno</dt><dd><span class="missing">nemáme údaj</span> — nezávislé ověření podání není v této maketě k dispozici</dd></div></div>');

  out += card(sectionHead(3, 'Modelové cíle, TIR a čas pod rozmezím', 'onepage-3') +
    (ss ? '<p class="small muted">Období ' + e(ss.period) + '. Modelově nastavené rozmezí pro tuto demonstraci: ' + e(ss.range) + '.</p>' +
      '<div class="review-facts">' + kv('Dostupnost dat', e(ss.availability) + ' %') + kv('Čas v rozmezí (TIR)', e(ss.tir) + ' %') +
      kv('Čas pod rozmezím', e(ss.below) + ' %') + kv('Čas nad rozmezím', e(ss.above) + ' %') + '</div>' +
      '<p class="small muted">Tři časové kategorie dávají 100 %. Dostupnost dat je jiný ukazatel a do součtu nevstupuje. ' + e(ss.note) + '</p>'
      : '<p><span class="missing">Senzorový souhrn není k dispozici — nelze vyhodnotit.</span></p>' +
        '<p class="small muted">Nezobrazujeme nuly. Chybějící údaj není nula.</p>'));

  out += card(sectionHead(4, 'Kontextové nálezy (nejvýše dva)', 'onepage-4') +
    (rev.findings.length ? '<ul class="plain-list">' + rev.findings.slice(0, 2).map(function (f) {
      return '<li><p>' + e(f.text) + '</p>' +
        '<p class="small muted">Zdroj: ' + e(f.source) + ' · Období: ' + e(f.period) + '</p>' +
        '<p class="small muted">Omezení: ' + e(f.limit) + '</p>' +
        '<div class="actions">' + btn('Otevřít důkaz', 'page', 'evidence', 'link') + '</div></li>';
    }).join('') + '</ul>'
      : '<p>Kontext jídel nebyl zaznamenán.</p>' +
        '<p class="small muted">Není to hodnocení pacienta a prázdné místo není požadavek vyrobit další nález. Kontrolu lze dokončit.</p>') +
    (rev.findings.length === 1 ? '<p class="small muted">Druhý nález se nevynucuje.</p>' : ''));

  out += card(sectionHead(5, 'Hlavní otázka pacienta', 'onepage-5') +
    (rev.question ? '<p>„' + e(rev.question) + '“</p>' : '<p><span class="missing">Pacient neuložil otázku.</span></p>'));

  out += '<div class="actions">' + btn('Pokračovat k rozhodnutí', 'page', 'decide', 'primary') + '</div>';
  if (S.variantNote) out += card(hint('<strong>Varianta demonstrace:</strong> ' + e(S.variantNote)), 'flat');
  return out + '</div>';
};

V.evidence = function (S) {
  var eps = S.episodes;
  var focus = S.evidenceId || (eps.filter(function (x) { return !NF.episodeStatus(x).complete; })[0] || eps[0] || {}).id;
  var ep = eps.filter(function (x) { return x.id === focus; })[0];
  if (!ep) return card('<h1>Důkaz</h1><p>Žádná epizoda k zobrazení.</p>' +
    '<div class="actions">' + btn('Zpět na jednu stránku', 'page', 'onepage', 'primary') + '</div>');
  var st = NF.episodeStatus(ep);
  var plan = NF.planById(S, ep.planId);
  return '<div class="pagehead"><div><p class="eyebrow">Důkaz k nálezu</p><h1>Epizoda ' + e(ep.id) + '</h1></div>' +
    '<div class="actions">' + btn('Zpět na jednu stránku', 'page', 'onepage', 'secondary') + '</div></div>' +
    card('<div class="pillgroup">' + eps.map(function (x) {
      return '<button type="button" class="choice ' + (x.id === ep.id ? 'chosen' : '') + '" data-action="setEvidence" data-value="' + e(x.id) + '">' + e(x.id) + '</button>';
    }).join('') + '</div>' +
      '<div class="plan-basics">' + kv('Čas jídla', e(NF.fmtDateTime(ep.at))) + kv('Zapsáno', e(NF.fmtDateTime(ep.recordedAt))) +
      kv('Import senzorového úseku', ep.importedAt ? e(NF.fmtDateTime(ep.importedAt)) : '<span class="missing">nemáme údaj</span>') +
      kv('Autor', e(ep.author)) + '</div>' +
      '<p>' + e(ep.desc) + '</p>' +
      (ep.circumstances ? '<p class="small muted">Okolnosti podle pacienta: ' + e(ep.circumstances) + '</p>' : '') +
      (st.complete ? hint('Epizoda má potřebný kontext.', 'success')
        : hint('<strong>Chybí kontext:</strong> ' + e(st.missing.join(', ')) + '. Epizoda zůstává viditelná, ale nepočítá se jako úplná.', 'warn')) +
      chart([ep], 'Epizoda ' + ep.id) +
      (ep.lateImport ? '<p class="small muted">Opožděný import ' + e(NF.fmtDateTime(ep.lateImport.at)) + ': ' + e(ep.lateImport.note) + '</p>' : '') +
      '<div class="divider"></div>' +
      '<h2>Plán platný v době epizody</h2>' +
      (plan ? '<p><strong>' + e(plan.id + ' ' + plan.version) + '</strong> · účinný od ' + e(NF.fmtShort(plan.effectiveFrom)) + '</p><p>' + e(plan.prescription) + '</p>'
        : '<p><span class="missing">nemáme údaj</span></p>') +
      (ep.history.length ? '<details><summary>Historie oprav</summary><div>' + ep.history.map(function (h) {
        return '<p class="small">' + e(NF.fmtDateTime(h.at)) + ': „' + e(h.from) + '“ → „' + e(h.to) + '“</p>';
      }).join('') + '</div></details>' : ''));
};

V.decide = function (S) {
  var rev = S.reviews[S.reviews.length - 1];
  var p = NF.activePlan(S);
  var choice = (S.form && S.form.choice) || (rev && rev.decision && rev.decision.choice) || '';
  var reason = (S.form && S.form.reason != null) ? S.form.reason : (rev && rev.decision ? rev.decision.reason : '');
  var issued = S.plans.length > 1;
  var opts = [
    ['unchanged', 'Plán beze změny, upřesnit další pozorování'],
    ['modify', 'Upravit plán'],
    ['remove', 'Odebrat úkol'],
    ['defer', 'Zatím nelze rozhodnout']
  ];
  return '<div class="pagehead"><div><p class="eyebrow">Rozhodnutí lékaře</p><h1>Co dál s plánem</h1></div></div>' +
    card('<p class="muted">Platný plán: <strong>' + e(p ? p.id + ' ' + p.version : 'nemáme údaj') + '</strong>. Na rozhodnutí není žádný časový limit.</p>' +
      '<fieldset class="choice-field"' + NF.hook('decide-options') + '><legend>Rozhodnutí</legend><div class="choice-row">' +
      opts.map(function (o) {
        return '<button type="button" class="choice ' + (choice === o[0] ? 'chosen' : '') + '" data-action="formSet" data-value="choice:' + o[0] + '" aria-pressed="' + (choice === o[0]) + '">' + e(o[1]) + '</button>';
      }).join('') + '</div></fieldset>' +
      '<label class="field">Modelový důvod<textarea data-bind="form.reason" placeholder="Například: Dostupný kontext neumožňuje připsat rozdíl konkrétní příčině.">' + e(reason || '') + '</textarea></label>' +
      (choice === 'defer' ? hint('Rozhodnutí zůstává otevřené. Nový plán se nevydává a stávající platí dál.') : '') +
      (choice === 'modify' ? hint('Editor plánu nedoporučuje dávku ani ji nepočítá. Měnit lze pozorovací úkol a termín kontroly.') : '') +
      '<div class="actions">' +
      (issued ? btn('Zobrazit výsledek demonstrace', 'page', 'result', 'primary')
        : btn('Vydat P2 s novým pozorovacím úkolem', 'issueP2', null, 'primary')) +
      btn('Zpět na jednu stránku', 'page', 'onepage', 'secondary') + '</div>' +
      (issued ? hint('P2 je vydaný a předaný pacientovi. Historie P1 a jeho epizod zůstává beze změny.', 'success') : ''));
};

V.result = function (S) {
  var d = S.decisions.helped;
  return card('<p class="eyebrow">Výsledek demonstrace</p><h1>Pomohl kontext?</h1>' +
    '<p class="muted">Tento záznam je oddělený hodnoticí panel demonstrace. Není součástí pacientského podkladu.</p>' +
    '<fieldset class="choice-field"><legend>Pomohl kontext zodpovědět konkrétní otázku nad rámec výstupu výrobce senzoru?</legend><div class="choice-row">' +
    ['yes|Ano', 'partly|Částečně', 'no|Ne', 'undecided|Nerozhodnuto'].map(function (o) {
      var x = o.split('|');
      return '<button type="button" class="choice ' + (d === x[0] ? 'chosen' : '') + '" data-action="setHelped" data-value="' + x[0] + '" aria-pressed="' + (d === x[0]) + '">' + e(x[1]) + '</button>';
    }).join('') + '</div></fieldset>' +
    '<p class="small muted">Výchozí stav je nerozhodnuto. Nic tu není předvyplněné a nikde netvrdíme úsporu konkrétního počtu minut.</p>' +
    '<div class="actions">' + btn('Náhled tisku jedné stránky', 'print', null, 'secondary') +
    btn('Zpět na jednu stránku', 'page', 'onepage', 'secondary') + '</div>');
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
        '<p class="small muted">Pravidlo ' + e(t.ruleId + ' ' + t.ruleVersion) + ' · plán ' + e(t.planId || '—') +
        (t.pauseDetail ? ' · ' + e(t.pauseDetail) : '') + '</p>' +
        (t.state === 'paused' ? '<div class="actions">' + btn('Modelově potvrdit obnovení úkolu', 'page', 'resume', 'secondary') + '</div>' : '') + '</li>';
    }).join('') : '<li>Žádný úkol.</li>') + '</ul>' +
    '<h2' + NF.hook('versions-trace') + '>Stopa demonstrace</h2><div class="tablewrap"><table><thead><tr><th>Čas</th><th>Událost</th><th>Podrobnost</th></tr></thead><tbody>' +
    S.events.slice(-25).reverse().map(function (x) {
      return '<tr><td class="nowrap">' + e(NF.fmtDateTime(x.at)) + '</td><td>' + e(x.what) + '</td><td>' + e(x.detail) + '</td></tr>';
    }).join('') + '</tbody></table></div>' +
    '<p class="small muted">Stopa je lokální záznam demonstrace. Nikam se neodesílá.</p>');
};

V.resume = function (S) {
  var t = S.tasks.filter(function (x) { return x.state === 'paused'; })[0];
  if (!t) return card('<h1>Obnovení úkolu</h1><p>Žádný úkol není pozastavený.</p>' +
    '<div class="actions">' + btn('Zpět', 'page', 'versions', 'secondary') + '</div>');
  var p = NF.activePlan(S);
  var blockers = [];
  if (S.illness && S.illness.active) blockers.push('Období nemoci je stále označené jako trvající.');
  if (!p || p.state !== 'issued') blockers.push('Plán není v platném stavu.');
  if (t.pauseReason === 'rule' && !NF.isRuleUsable(S, t.ruleId)) blockers.push('Pravidlo ' + t.ruleId + ' není v modelově schválené použitelné verzi.');
  return card('<div' + NF.hook('resume-conditions') + '><p class="eyebrow">Obnovení úkolu</p><h1>' + e(t.title) + '</h1>' +
    '<p>Pozastaveno ' + e(NF.fmtDateTime(t.pausedAt)) + '. Důvod: ' + e(t.pauseDetail || '') + '</p>' +
    '<h2>Podmínky obnovení</h2>' +
    '<p class="small muted">V této demonstraci je podmínkou modelové potvrzení lékařem a ověření aktuálnosti plánu. ' +
    'Jde o konzervativní demo variantu; reálné podmínky určí garant. Samotné uplynutí času ani návrat dat úkol neobnoví.</p>' +
    (blockers.length ? hint('<strong>Zatím nelze obnovit:</strong><br>' + blockers.map(e).join('<br>'), 'warn') : '') +
    '<label class="field">Důvod obnovení (uvidí jej pacient)<input data-bind="form.resumeReason" value="' +
    e((S.form && S.form.resumeReason) || 'Ověřil jsem aktuálnost plánu P1. Pozorování může pokračovat.') + '"></label>' +
    '<div class="actions">' +
    (blockers.length ? btnHtml('Obnovit úkol', 'noop', null, 'primary', ' disabled') : btn('Obnovit úkol', 'resumeTask', null, 'primary')) +
    (S.illness && S.illness.active ? btn('Ukončit označené období nemoci', 'endIllness', null, 'secondary') : '') +
    btn('Zpět', 'page', 'versions', 'secondary') + '</div></div>');
};

V.dose = function (S) {
  var v = S.doseVariant || 'formulas';
  return card('<div' + NF.hook('dose-basis') + '><p class="eyebrow">Otevřená varianta · panel lékaře a prezentujícího</p>' +
    '<h1>Rozsah dávkového podkladu</h1>' +
    hint('<strong>Není dostupné v pacientské roli.</strong> Tato část slouží k rozhodnutí garanta o rozsahu podkladu. ' +
      'NutriFee žádnou dávku nepočítá a žádné číslo si nevymýšlí.', 'warn') +
    '<div class="tabs">' +
    '<button type="button" class="btn ' + (v === 'formulas' ? 'primary' : '') + '" data-action="setDoseVariant" data-value="formulas">Varianta 1 — vzorce, nejistota, otázka</button>' +
    '<button type="button" class="btn ' + (v === 'numeric' ? 'primary' : '') + '" data-action="setDoseVariant" data-value="numeric">Varianta 2 — struktura číselného podkladu</button></div>' +
    (v === 'formulas'
      ? '<h2>Co by lékař viděl</h2><ul class="plain-list">' +
        '<li><strong>Vzorec</strong><p class="small">Obecný tvar výpočtu, který používá pracoviště. NutriFee jej nevyhodnocuje.</p></li>' +
        '<li><strong>Nejistota</strong><p class="small">Co vstupní údaje neumožňují rozhodnout.</p></li>' +
        '<li><strong>Otázka</strong><p class="small">Co by lékař potřeboval doplnit, aby rozhodl.</p></li></ul>'
      : '<h2>Struktura číselného podkladu k rozhodnutí</h2>' +
        '<div class="rule-card"><dl>' +
        '<dt>Číselný obsah</dt><dd><span class="missing">[číselný obsah musí dodat a schválit garant]</span></dd>' +
        '<dt>Autor</dt><dd><span class="missing">k doplnění</span></dd>' +
        '<dt>Zdroj</dt><dd><span class="missing">k doplnění</span></dd>' +
        '<dt>Nejistota</dt><dd><span class="missing">k doplnění</span></dd></dl></div>' +
        hint('Případný později dodaný statický obsah se nesmí automaticky přenést do plánu a nesmí být dostupný v pacientské roli.', 'warn')) +
    hint('<strong>Otevřené rozhodnutí:</strong> přesná slučitelnost číselné varianty se zákazem výpočtu dávky není vyřešená. ' +
      'Rozhoduje garant.', 'warn') + '</div>');
};

/* ---------- garant ---------- */
V.garant = function (S) {
  var items = [['catalog', 'Katalog pravidel'], ['protocol', 'Koncept samotitrace'], ['incidents', 'Podněty a incidenty'], ['decisions', 'Rozhodovací list']];
  var body;
  switch (S.page) {
    case 'protocol': body = V.protocol(S); break;
    case 'incidents': body = V.incidents(S); break;
    case 'decisions': body = V.decisions(S); break;
    case 'impact': body = V.impact(S); break;
    default: body = V.catalog(S);
  }
  return tabs(S, items) + '<div class="clinic-page">' + body + '</div>';
};

function ruleCard(S, r) {
  var status = { approved: ['modelově schváleno', 'approved'], draft: ['návrh', 'pending'], retired: ['vyřazeno z použití', 'rejected'], concept: ['neschválený koncept', 'pending'] }[r.status];
  return '<div class="rule-card"' + NF.hook('rule-' + r.status) + '>' +
    '<h3>' + e(r.id + ' ' + r.version) + ' <span class="rule-tag ' + status[1] + '">' + e(status[0]) + '</span></h3>' +
    '<p>' + e(r.title) + '</p>' +
    '<dl><dt>Účel</dt><dd>' + e(r.purpose) + '</dd>' +
    '<dt>Populace</dt><dd>' + e(r.population) + '</dd>' +
    '<dt>Vstupy</dt><dd>' + r.inputs.map(e).join('; ') + '</dd>' +
    '<dt>Omezení</dt><dd>' + r.limits.map(e).join('<br>') + '</dd>' +
    '<dt>Text pro pacienta</dt><dd>' + e(r.text) + '</dd>' +
    (r.approvedBy ? '<dt>Modelově schválil</dt><dd>' + e(r.approvedBy) + ' ' + e(NF.fmtDateTime(r.approvedAt)) + '</dd>' : '') +
    (r.retiredReason ? '<dt>Důvod vyřazení</dt><dd>' + e(r.retiredReason) + '</dd>' : '') +
    '<dt>Dotčené úkoly</dt><dd>' + (r.tasks.length ? r.tasks.map(e).join(', ') : 'žádné') + '</dd></dl>' +
    '<details><summary>Testovací příklady použití i nepoužití</summary><div>' +
    '<p class="small"><strong>Použije se:</strong> ' + (r.examples.use.length ? r.examples.use.map(e).join(' ') : '—') + '</p>' +
    '<p class="small"><strong>Nepoužije se:</strong> ' + (r.examples.skip.length ? r.examples.skip.map(e).join(' ') : '—') + '</p>' +
    (r.status === 'draft' ? '<label class="check"><input type="checkbox" data-bind="ruleExamples.' + e(NF.ruleKey(r)) + '"' + (r.examplesReviewed ? ' checked' : '') + '><span>Příklady jsem prošel.</span></label>' : '') +
    '</div></details>' +
    (r.status === 'draft' ? '<div class="actions">' + btn('Modelově schválit ' + r.version, 'approveRule', NF.ruleKey(r), 'primary') + '</div>' +
      '<p class="small muted">Návrh nesmí ovlivnit aktivní úkol, dokud není modelově schválený.</p>' : '') +
    (r.status === 'approved' ? '<div class="actions">' + btn('Vyřadit z dalšího použití', 'openRetire', NF.ruleKey(r), 'danger') + '</div>' : '') +
    '</div>';
}

V.catalog = function (S) {
  var rs = S.rules.filter(function (r) { return r.id !== 'PROTO-BAZAL-DEMO'; });
  return '<div class="pagehead"><div><p class="eyebrow">Garant · DEMO-G01</p><h1>Katalog pravidel</h1>' +
    '<p class="muted">Schválení klinického obsahu není vydání pacientova předpisu.</p></div></div>' +
    (S.impulse ? card(hint('<strong>Podnět k posouzení.</strong> ' + e(S.impulse.text) + '<br>' + e(S.impulse.note) +
      '<div class="actions">' + btn('Otevřít podnět', 'page', 'incidents', 'secondary') + '</div>', 'warn'), 'flat') : '') +
    card(rs.map(function (r) { return ruleCard(S, r); }).join('')) +
    (S.retireOpen ? card('<h2>Vyřazení pravidla ' + e(S.retireOpen) + '</h2>' +
      '<label class="field">Důvod vyřazení<textarea data-bind="form.retireReason">' +
      e((S.form && S.form.retireReason) || 'Formulace nejasně popisuje použití při nemoci.') + '</textarea></label>' +
      '<div class="actions">' + btn('Potvrdit vyřazení', 'retireRule', S.retireOpen, 'danger') + btn('Zrušit', 'closeRetire', null, 'secondary') + '</div>' +
      '<p class="small muted">Akce je potvrzena uvnitř makety. Nikam se neodesílá.</p>') : '') +
    (S.lastRetire ? card('<h2>Dopad změny pravidla</h2>' +
      '<p>Seznam dotčených modelových pacientů a úkolů. Jde o dopad změny pravidla, ne o živý monitoring zdravotního stavu.</p>' +
      '<div class="tablewrap"><table><thead><tr><th>Pacient</th><th>Úkol</th><th>Stav po změně</th></tr></thead><tbody>' +
      S.tasks.filter(function (t) { return t.pauseReason === 'rule'; }).map(function (t) {
        return '<tr><td>' + e(S.patient.label) + '</td><td>' + e(t.id + ' — ' + t.title) + '</td><td>pozastaveno</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<p class="small muted">Předpis plánu ' + e(S.activePlanId || '') + ' se nemění. Vyřazení pravidla nemění inzulin.</p>' +
      '<div class="row"><p class="small"><strong>Doručení změny do zařízení pacienta:</strong> ' +
      (S.ruleDelivery === 'unconfirmed' ? '<span class="missing">nepotvrzeno</span>' : 'potvrzeno') + '</p></div>' +
      (S.ruleDelivery === 'unconfirmed' ? hint('Zařízení je v simulaci offline. Vzdálenou okamžitou změnu nesimulujeme. ' +
        'Je potřeba samostatný organizační kontakt odpovědnou osobou — žádná zpráva se neodesílá.', 'warn') : '')) : '');
};

V.protocol = function (S) {
  var r = NF.ruleById(S, 'PROTO-BAZAL-DEMO');
  var d = S.decisions.samotitrace;
  return '<div class="pagehead"><div><p class="eyebrow">Oddělená koncepční větev</p><h1>Samotitrace bazálu</h1>' +
    '<p class="muted">Rozhodnutí o samotitraci není totéž co rozhodnutí o katalogu edukace.</p></div></div>' +
    card(hint('<strong>Neschválený koncept — není aktivní.</strong> Není dostupný v běžném pacientském průchodu.', 'warn') +
      (r ? '<h2>Potřebná pole protokolu</h2><dl class="rule-card">' +
        ['Krok', 'Interval', 'Cíl', 'Stop-pravidla', 'Podmínky obnovení', 'Odpovědný lékař', 'Předání'].map(function (f) {
          return '<dt>' + e(f) + '</dt><dd><span class="missing">k doplnění garantem</span></dd>';
        }).join('') + '</dl>' : '') +
      '<h2>Stop-situace k posouzení</h2>' +
      '<ul class="plain-list"><li>Noční hypoglykémie</li><li>Nemoc</li><li>Vynechané dávky</li><li>Výpadek dat</li>' +
      '<li><span class="missing">další podmínky k doplnění</span></li></ul>' +
      '<p class="small muted">Maketa neurčuje klinické meze ani nevyhodnocuje jejich splnění z dat.</p>' +
      hint('Pokud by zamýšlená samotitrace vyžadovala, aby NutriFee dávku vypočítala nebo sama změnila, je mimo zadání a v rozporu se zásadami. ' +
        'Rozpor nelze vyřešit skrytým algoritmem ani statickou tabulkou, která provádí tutéž volbu.', 'danger') +
      '<div class="actions">' + btn('Otevřít koncepční pacientský náhled', 'openConcept', null, 'demo') +
      btn('Simulovat stop-situaci (oznámení nemoci)', 'conceptIllness', null, 'demo') + '</div>' +
      (S.conceptState === 'paused' ? hint('Koncept je ve stavu <strong>pozastaveno</strong>. Není vypočtena změna inzulinu. ' +
        'Obnovení by vyžadovalo schválené podmínky a modelové potvrzení lékařem — nikdy automaticky po uplynutí hodin.', 'warn') : '')) +
    card('<div class="decision-box"' + NF.hook('decision-samotitrace') + '><h2>Rozhodovací karta</h2>' +
      '<div class="choice-row">' + [['out', 'Mimo první studii'], ['branch', 'Dopracovat jako oddělenou větev'], ['defer', 'Nelze rozhodnout bez přesného protokolu']].map(function (o) {
        return '<button type="button" class="choice ' + (d === o[0] ? 'chosen' : '') + '" data-action="decide" data-value="samotitrace:' + o[0] + '" aria-pressed="' + (d === o[0]) + '">' + e(o[1]) + '</button>';
      }).join('') + '</div>' +
      '<p class="small muted">Uložení je pouze lokální poznámka z demonstrace. Neaktivuje klinickou funkci.</p></div>');
};

V.incidents = function (S) {
  return '<div class="pagehead"><div><p class="eyebrow">Garant</p><h1>Podněty a incidenty</h1></div></div>' +
    (S.impulse ? card('<h2>Podnět</h2><p>' + e(S.impulse.text) + '</p>' +
      '<p class="small muted">' + e(S.impulse.note) + ' Zaznamenáno ' + e(NF.fmtDateTime(S.impulse.at)) + '.</p>' +
      '<div class="actions">' + btn('Založit záznam incidentu', 'openIncident', null, 'secondary') +
      btn('Přejít na katalog a vyřadit v1', 'page', 'catalog', 'secondary') + '</div>') : '') +
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
      '<p>Novou verzi pravidla lze modelově schválit až po kontrole testovacích příkladů. Schválení samo nevydává nový inzulinový plán.</p>' +
      '<div class="actions">' + btn('Otevřít katalog', 'page', 'catalog', 'primary') + '</div>');
};

V.impact = function (S) { return V.catalog(S); };

V.decisions = function (S) {
  var D = global.NutriFeeDemo;
  var list = (D && D.decisionList) || [];
  return '<div class="pagehead"><div><p class="eyebrow">Garant</p><h1>Rozhodovací list</h1>' +
    '<p class="muted">Výchozí stav je nerozhodnuto. Nic není předvybrané.</p></div></div>' +
    (list.length ? list.map(function (it) {
      var v = S.decisions[it.key] || '';
      var note = (S.decisionNotes && S.decisionNotes[it.key]) || '';
      return card('<div class="decision-box"><h2>' + e(it.title) + '</h2><p>' + e(it.q) + '</p>' +
        '<div class="choice-row">' + [['yes', 'Zvolit navržené'], ['change', 'Navrhnout úpravu'], ['no', 'Nezařadit'], ['', 'Nerozhodnuto']].map(function (o) {
          return '<button type="button" class="choice ' + (v === o[0] ? 'chosen' : '') + '" data-action="decide" data-value="' + e(it.key) + ':' + o[0] + '" aria-pressed="' + (v === o[0]) + '">' + e(o[1]) + '</button>';
        }).join('') + '</div>' +
        '<label class="field">Důvod a co je třeba doplnit<textarea data-bind="decisionNotes.' + e(it.key) + '">' + e(note) + '</textarea></label></div>');
    }).join('') : card('<p>Seznam rozhodnutí není v tomto sestavení k dispozici.</p>')) +
    card('<div class="actions">' + btn('Exportovat poznámky z demonstrace', 'exportNotes', null, 'secondary') + '</div>' +
      '<p class="small muted">Export je jednoduchý textový soubor označený „Poznámky z demonstrace — nejde o formální klinické schválení“.</p>');
};

})(typeof window !== 'undefined' ? window : globalThis);
