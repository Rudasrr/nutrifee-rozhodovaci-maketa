/* Obrazovky aplikace. Obsahují jen běžnou uživatelskou nápovědu pro pacienta,
   lékaře a garanta. Vysvětlení a obhajoba návrhu pro prezentující jsou v demo/guide-content.js. */
(function (global) {
'use strict';
var NF = global.NutriFee;
var e = NF.esc, V = {};
NF.screens = V;

/* Kotva pro průvodce maketou. Bez načtené vrstvy průvodce nevzniká v DOM nic navíc. */
NF.hook = function (key) {
  var g = global.NutriFeeGuide;
  return (g && g.enabled) ? ' data-guide="' + e(key) + '"' : '';
};

/* ---------- stavební prvky převzatého designu ---------- */
function btn(label, action, value, cls) {
  return '<button type="button" class="btn ' + (cls || '') + '" data-action="' + e(action) + '"' +
    (value != null ? ' data-value="' + e(value) + '"' : '') + '>' + e(label) + '</button>';
}
function btnHtml(label, action, value, cls, extra) {
  return '<button type="button" class="btn ' + (cls || '') + '" data-action="' + e(action) + '"' +
    (value != null ? ' data-value="' + e(value) + '"' : '') + (extra || '') + '>' + label + '</button>';
}
function hint(text, kind) { return '<div class="hint ' + (kind || '') + '">' + text + '</div>'; }
function kv(k, v) { return '<div class="kv"><span>' + e(k) + '</span><strong>' + (v || '') + '</strong></div>'; }
function card(body, cls) { return '<section class="card ' + (cls || '') + '">' + body + '</section>'; }
function tag(text, kind) { return '<span class="tag ' + (kind || '') + '">' + e(text) + '</span>'; }
V.btn = btn; V.btnHtml = btnHtml; V.hint = hint; V.kv = kv; V.card = card; V.tag = tag;

function missingWord(v) { return v == null ? '<span class="missing">nemáme údaj</span>' : e(String(v)); }

/* ---------- graf epizody ----------
   Osy mají popisky a jednotky, chybějící data tvoří viditelnou mezeru,
   barva sama nenese význam a graf má textový souhrn. */
function chart(eps, title) {
  var W = 560, H = 210, L = 46, R = 14, T = 16, B = 34;
  var all = [];
  eps.forEach(function (ep) { (ep.points || []).forEach(function (p) { if (p.mmol != null) all.push(p.mmol); }); });
  if (!all.length) {
    return '<figure class="chart"><figcaption>' + e(title) + ' — pro zvolené epizody nejsou k dispozici žádné senzorové body. Mezera se nedopočítává.</figcaption></figure>';
  }
  var min = Math.min.apply(null, all) - 1, max = Math.max.apply(null, all) + 1;
  var xs = [0, 30, 60, 90, 120];
  var px = function (m) { return L + (m / 120) * (W - L - R); };
  var py = function (v) { return T + (1 - (v - min) / (max - min)) * (H - T - B); };
  var dashes = ['', '6 4', '2 3', '10 4'];
  var body = '';
  [Math.ceil(min), Math.round((min + max) / 2), Math.floor(max)].forEach(function (v) {
    body += '<line x1="' + L + '" y1="' + py(v) + '" x2="' + (W - R) + '" y2="' + py(v) + '" stroke="#cededa"/>' +
      '<text x="' + (L - 8) + '" y="' + (py(v) + 4) + '" text-anchor="end" font-size="11" fill="#516764">' + e(NF.mmol(v)) + '</text>';
  });
  xs.forEach(function (m) {
    body += '<text x="' + px(m) + '" y="' + (H - 12) + '" text-anchor="middle" font-size="11" fill="#516764">' + m + '</text>';
  });
  eps.forEach(function (ep, i) {
    var segs = [], cur = [];
    (ep.points || []).forEach(function (p) {
      if (p.mmol == null) { if (cur.length) segs.push(cur); cur = []; }
      else cur.push(p);
    });
    if (cur.length) segs.push(cur);
    segs.forEach(function (seg) {
      if (seg.length > 1) {
        body += '<polyline fill="none" stroke="#006b62" stroke-width="2" stroke-dasharray="' + dashes[i % 4] +
          '" points="' + seg.map(function (p) { return px(p.min) + ',' + py(p.mmol); }).join(' ') + '"/>';
      }
      seg.forEach(function (p) {
        body += '<circle cx="' + px(p.min) + '" cy="' + py(p.mmol) + '" r="3.5" fill="#004f49"/>';
      });
    });
    var lab = (ep.points || []).filter(function (p) { return p.mmol != null; })[0];
    if (lab) body += '<text x="' + (px(lab.min) + 6) + '" y="' + (py(lab.mmol) - 8) + '" font-size="11" font-weight="700" fill="#14312f">' + e(ep.id) + '</text>';
  });
  var summary = eps.map(function (ep) {
    var have = (ep.points || []).filter(function (p) { return p.mmol != null; });
    return ep.id + ': ' + (have.length ? have.map(function (p) { return p.min + ' min ' + NF.mmol(p.mmol); }).join(', ') + ' mmol/l' : 'žádné body');
  }).join('; ');
  return '<figure class="chart">' +
    '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + e(title + '. ' + summary) + '">' +
    '<text x="6" y="' + (T + 4) + '" font-size="11" fill="#516764">mmol/l</text>' + body +
    '<text x="' + (W / 2) + '" y="' + (H - 1) + '" text-anchor="middle" font-size="11" fill="#516764">minuty od jídla</text>' +
    '</svg><figcaption>' + e(title) + '. Osa x: minuty od jídla. Osa y: glukóza v mmol/l. Zobrazeny jsou jen dostupné body; přes chybějící data se čára nekreslí. ' +
    'Textový souhrn: ' + e(summary) + '.</figcaption></figure>';
}
V.chart = chart;

/* ---------- pacient ---------- */
function planStrip(S) {
  var p = NF.activePlan(S);
  if (!p) return '<div class="planstrip"><div><strong>Plán dosud nebyl vydán</strong><span class="small">Zatím nemáš žádný úkol. Plán vydává tvůj lékař.</span></div></div>';
  return '<div class="planstrip"' + NF.hook('plan-strip') + '><div><strong>Plán ' + e(p.id + ' ' + p.version) + ' · vydal modelový lékař</strong>' +
    '<span class="small">Účinný od ' + e(NF.fmtShort(p.effectiveFrom)) + (p.validUntil ? ', platnost do ' + e(NF.fmtShort(p.validUntil)) : '') + '</span></div></div>';
}

function patientNav(S) {
  var items = [['today', 'Dnes'], ['records', 'Moje záznamy'], ['plan', 'Plán'], ['safety', 'Bezpečí']];
  return '<div class="patientnav-wrap"' + NF.hook('patient-nav') + '>' +
    '<nav class="patientnav" aria-label="Hlavní nabídka pacienta">' + items.map(function (it) {
      return '<button type="button" data-action="page" data-value="' + it[0] + '" class="' + (S.page === it[0] ? 'active' : '') + '"' +
        (S.page === it[0] ? ' aria-current="page"' : '') + '>' + e(it[1]) + '</button>';
    }).join('') + '</nav></div>';
}

V.patient = function (S) {
  var body;
  switch (S.page) {
    case 'prep': body = V.prep(S); break;
    case 'understand': body = V.understand(S); break;
    case 'takeover': body = V.takeover(S); break;
    case 'episode': body = V.episodeForm(S); break;
    case 'compare': body = V.compare(S); break;
    case 'conclude': body = V.conclude(S); break;
    case 'records': body = V.records(S); break;
    case 'plan': body = V.planScreen(S); break;
    case 'safety': body = V.safety(S); break;
    case 'unclear': body = V.unclear(S); break;
    case 'datastate': body = V.datastate(S); break;
    case 'preview': body = V.preview(S); break;
    case 'newplan': body = V.newPlan(S); break;
    case 'concept': body = V.conceptPreview(S); break;
    case 'edge': body = V.edgeScreen(S); break;
    default: body = V.today(S);
  }
  var nav = ['prep', 'understand', 'takeover', 'concept'].indexOf(S.page) === -1;
  return '<div class="patient">' + body + (nav ? patientNav(S) : '') + '</div>';
};

/* Příprava — plán zatím nevydán. */
V.prep = function (S) {
  var ok = S.onboarding.circumstances && S.onboarding.medication;
  return card('<p class="eyebrow">Příprava před vydáním plánu</p>' +
    '<h1>Plán dosud nebyl vydán</h1>' +
    '<p class="muted">Senzor je v této ukázce <strong>modelově připojený</strong> — jde o simulaci, žádná skutečná data se nepřenášejí. ' +
    'Než ti lékař vydá plán, doplň dvě věci, které s ním na návštěvě ověříte.</p>' +
    '<label class="field"' + NF.hook('prep-circumstances') + '>Okolnosti, které bych chtěl zmínit' +
    '<textarea data-bind="onboarding.circumstances" placeholder="Například: ráno často spěchám do práce.">' + e(S.onboarding.circumstances) + '</textarea></label>' +
    '<label class="field"' + NF.hook('prep-medication') + '>Léčba, kterou teď užívám' +
    '<textarea data-bind="onboarding.medication" placeholder="Vypiš, co užíváš. Lékař seznam na návštěvě ověří.">' + e(S.onboarding.medication) + '</textarea></label>' +
    '<p class="field-help">Tento seznam je podklad k ověření, ne nový předpis. NutriFee léčbu nemění.</p>' +
    (S.onboarding.trainingFailed
      ? hint('<strong>Zaučení zatím není dokončené.</strong> Klinický úkol se ti neaktivuje a nejsi vykázán jako úspěšně zařazený. ' +
        'Co dál: domluv si s ordinací opakované zaučení, nebo požádej o pomoc pečující osobu. ' + btn('Ukázat modelovou cestu k pomoci', 'page', 'safety', 'secondary'), 'warn')
      : '') +
    '<div class="actions">' +
    btnHtml('Začít úkol', 'noop', null, 'primary', ok ? ' disabled aria-describedby="prep-why"' : ' disabled aria-describedby="prep-why"') +
    btn('Pokračovat na ověření porozumění', 'page', 'understand', 'secondary') + '</div>' +
    '<p class="small muted" id="prep-why"' + NF.hook('prep-blocked') + '>Úkol zatím nelze začít: <strong>plán ještě nevydal lékař</strong>. ' +
    'Nejdřív projdeš krátké ověření porozumění, potom lékař plán vydá a předá ti ho.</p>');
};

V.understand = function (S) {
  var a = S.onboarding.checkAnswer;
  return card('<p class="eyebrow">Ověření porozumění</p>' +
    '<h1>Jedna otázka, než začneme</h1>' +
    '<p>Znamená zápis v aplikaci, že ho lékař hned uvidí?</p>' +
    '<div class="actions"' + NF.hook('understand-answer') + '>' +
    btn('Ano', 'answerCheck', 'yes', a === 'yes' ? 'selected' : 'secondary') +
    btn('Ne', 'answerCheck', 'no', a === 'no' ? 'selected' : 'secondary') + '</div>' +
    (a === 'yes' ? hint('<strong>Tady si to upřesníme.</strong> Zápis v NutriFee <strong>není zpráva ordinaci</strong>. ' +
      'Nikdo ho průběžně nesleduje a nikdo na něj nečeká. Záznamy si s lékařem projdete na domluvené kontrole. ' +
      'Pokud řešíš problém právě teď, použij bezpečnostní a kontaktní plán.' +
      '<div class="actions">' + btn('Rozumím, zpět k otázce', 'answerCheck', 'reset', 'secondary') + '</div>') : '') +
    (a === 'no' ? hint('<strong>Přesně tak.</strong> Zápis slouží tobě a rozhovoru na kontrole. ' +
      'Pro aktuální potíže je tu bezpečnostní a kontaktní plán; technická pomoc s aplikací je jinde a řeší ji jiný člověk.', 'success') : '') +
    '<div class="divider"></div>' +
    '<div class="split"' + NF.hook('help-split') + '><div><h3>Technická pomoc</h3><p class="small muted">Aplikace nejde spustit, senzor se nepáruje. Řeší podpora, ne ordinace.</p></div>' +
    '<div><h3>Zdravotní kontakt</h3><p class="small muted">Zdravotní potíže a nejasnosti k léčbě. Řeší tvoje ordinace podle bezpečnostního plánu.</p></div></div>' +
    '<div class="actions">' + (a === 'no'
      ? btn('Pokračovat', 'page', 'takeover', 'primary')
      : btnHtml('Pokračovat', 'noop', null, 'primary', ' disabled')) +
    btn('Zpět na přípravu', 'page', 'prep', 'secondary') + '</div>' +
    (a !== 'no' ? '<p class="small muted">Odpověď tě neznámkuje. Po vysvětlení se můžeš vrátit a odpovědět znovu.</p>' : ''));
};

V.takeover = function (S) {
  var p = NF.activePlan(S);
  if (!p) return card('<h1>Plán zatím není vydaný</h1><p>Vydání plánu je krok lékaře. Zatím není co převzít.</p>' +
    '<div class="actions">' + btn('Zpět na přípravu', 'page', 'prep', 'secondary') + '</div>');
  var t = NF.taskById(S, p.taskId);
  return card('<p class="eyebrow">Předání plánu</p>' +
    '<h1>Tvůj plán ' + e(p.id + ' ' + p.version) + '</h1>' +
    '<div class="plan-basics"' + NF.hook('takeover-basics') + '>' +
    kv('Vydal', e(S.doctor.label)) + kv('Účinný od', e(NF.fmtDate(p.effectiveFrom))) +
    kv('Platnost do', e(NF.fmtShort(p.validUntil))) + '</div>' +
    '<h2>Modelový předpis</h2><p>' + e(p.prescription) + '</p>' +
    '<p class="small muted">Předpis zobrazujeme ve statické podobě. NutriFee dávku nepočítá, nemění a nenavrhuje.</p>' +
    (t ? '<h2>Tvůj úkol</h2><p><strong>' + e(t.title) + '</strong></p><p>' + e(t.conditions) + '</p>' +
      '<p class="small muted">' + e(t.minimum) + '</p>' : '') +
    hint('<strong>Hranice služby.</strong> NutriFee tě průběžně nesleduje, neposílá zprávy ordinaci a nemá vlastní akutní detekci. ' +
      'Akutní upozornění zajišťuje systém výrobce senzoru.') +
    '<div class="actions"' + NF.hook('takeover-confirm') + '>' +
    (p.understood ? btn('Přejít na Dnes', 'page', 'today', 'primary')
      : btn('Potvrzuji převzetí plánu', 'confirmUnderstanding', null, 'primary')) +
    '</div>' +
    '<p class="small muted">Potvrzení znamená, že jsi plán dostal a otevřel. Není to potvrzení, že rozumíš všemu.</p>');
};

V.today = function (S) {
  var p = NF.activePlan(S), t = NF.activeTask(S) || S.tasks[0];
  var c = NF.countEpisodes(S, t && t.id);
  var out = planStrip(S);
  if (!p) {
    out += card('<h1>Zatím nemáš vydaný plán</h1><p>Až ti lékař plán vydá a předá, uvidíš tady jeden aktuální úkol.</p>' +
      '<div class="actions">' + btn('Zpět na přípravu', 'page', 'prep', 'primary') + '</div>');
    return out;
  }
  if (S.participation !== 'active') {
    out += card('<div' + NF.hook('participation-end') + '><h1>Účast je ukončená</h1><p>Úkoly i připomínky jsou zastavené.</p>' +
      '<div class="actions">' + btn('Zobrazit předání a další péči', 'page', 'edge', 'primary') + '</div></div>');
    return out;
  }
  if (!t) return out + card('<h1>Žádný úkol</h1><p>K tvému plánu není přiřazený žádný úkol.</p>');

  if (t.state === 'paused') {
    out += card('<p class="eyebrow">Úkol je pozastavený</p><h1>' + e(t.title) + '</h1>' +
      hint('<strong>Proč je pozastavený:</strong> ' + e(t.pauseDetail || '') +
        '<br><strong>Co to neznamená:</strong> tvůj předpis se nemění a inzulin se nevysazuje. ' +
        '<br><strong>Co dál:</strong> pozorování se obnoví až po domluvě s lékařem. Zápisy, které už máš, zůstávají uložené.', 'warn') +
      '<div class="actions">' + btn('Bezpečnostní a kontaktní plán', 'page', 'safety', 'secondary') +
      btn('Moje záznamy', 'page', 'records', 'secondary') + '</div>', 'flat');
    return out + (S.dataState.offline ? offlineNote(S) : '');
  }
  if (t.state === 'done') {
    out += card('<div' + NF.hook('task-done') + '><p class="eyebrow">Hotovo</p><h1>Úkol dokončen</h1>' +
      '<p>Pro tento úkol už nemusíš nic zapisovat.</p>' +
      '<div class="next-step"' + NF.hook('today-after-done') + '><strong>Co bude dál</strong>' +
      '<p>' + (S.nextVisit ? 'Kontrola je ' + e(NF.fmtDate(S.nextVisit)) + '. Na ní si zaznamenané rozdíly projdete.' : 'Další krok domluvíš s lékařem na kontrole.') + '</p></div>' +
      '<p class="small muted">Nevyzýváme tě, abys dodatečně odhadoval minulá jídla.</p>' +
      '<div class="actions">' + btn('Zobrazit můj závěr', 'page', 'records', 'secondary') +
      (S.page !== 'preview' ? btn('Náhled podkladu pro lékaře', 'page', 'preview', 'secondary') : '') + '</div></div>');
    return out;
  }
  /* aktivní úkol */
  out += card('<p class="eyebrow">Jeden aktuální úkol</p>' +
    '<h1>' + e(t.title) + '</h1>' +
    '<p class="muted">' + e(t.conditions) + '</p>' +
    '<div class="review-facts"' + NF.hook('today-counts') + '>' +
    '<div>' + kv('Zaznamenané epizody', String(c.recorded)) + '</div>' +
    '<div>' + kv('Z toho s potřebným kontextem', String(c.complete)) + '</div></div>' +
    '<p class="small muted">Obě čísla uvádíme zvlášť. Epizoda bez kontextu se nemaže a nepočítá se jako úplná.</p>' +
    (S.illness && S.illness.active ? hint('Máš označené období nemoci. Pozorování je pozastavené.', 'warn') : '') +
    '<div class="actions"' + NF.hook('today-primary') + '>' +
    btn('Zapsat snídani', 'page', 'episode', 'primary') +
    (c.recorded ? btn('Porovnat zaznamenané průběhy', 'page', 'compare', 'secondary') : '') +
    '</div>' +
    '<div class="next-step"><strong>Co bude potom</strong><p>' +
    (c.complete >= 2
      ? 'Máš dost zaznamenaných průběhů k porovnání. Potom úkol uzavřeš vlastním závěrem.'
      : 'Až budeš mít víc zaznamenaných snídaní, ukážeme ti je vedle sebe. Závěr si napíšeš sám.') + '</p></div>');
  out += card('<h2>Když si nejsi jistý</h2>' +
    '<div class="buttonlist"' + NF.hook('today-unsure') + '>' +
    btn('Nerozumím tomu, co vidím', 'page', 'unclear', 'secondary') +
    btn('Bezpečnostní a kontaktní plán', 'page', 'safety', 'secondary') +
    btn('Jsem nemocný', 'page', 'unclear', 'secondary') + '</div>', 'flat');
  if (S.dataState.gap) out += dataGapCard(S);
  if (S.dataState.offline) out += offlineNote(S);
  return out;
};

function offlineNote(S) {
  return card(hint('<strong>Simulovaný offline režim.</strong> Vidíš poslední uloženou verzi bezpečnostního a kontaktního plánu ' +
    e(S.safetyPlan ? S.safetyPlan.version : '') + ', synchronizovanou ' + e(NF.fmtDateTime(S.safetySyncAt)) + '. ' +
    'Jde o simulaci; skutečná funkčnost při výpadku sítě není ověřená.', 'warn'), 'flat');
}
function dataGapCard(S) {
  return card('<h2>Stav dat v NutriFee</h2>' +
    '<p>Poslední hodnota, kterou tu máme, je z <strong>' + e(NF.fmtDateTime(S.dataState.lastValueAt)) + '</strong>. Novější data tu zatím nejsou.</p>' +
    '<p class="small muted">Tohle samo o sobě neznamená, že je senzor rozbitý. Příčinu neurčujeme.</p>' +
    '<div class="actions">' + btn('Upřesnit, co vidíš ty', 'page', 'datastate', 'secondary') + '</div>', 'flat');
}

/* Zápis epizody. */
V.episodeForm = function (S) {
  var d = S.form || {};
  var t = NF.activeTask(S);
  if (!t) return card('<h1>Zápis teď není otevřený</h1><p>Zápis epizody patří k aktivnímu úkolu. Žádný teď aktivní není.</p>' +
    '<div class="actions">' + btn('Zpět na Dnes', 'page', 'today', 'primary') + '</div>');
  var ins = d.insulinReported || '';
  return card('<p class="eyebrow">Zápis epizody</p><h1>Snídaně</h1>' +
    '<label class="field"' + NF.hook('episode-desc') + '>Popis jídla' +
    '<textarea data-bind="form.desc">' + e(d.desc == null ? 'Chléb, sýr a neslazený čaj; pacient uvádí obvyklou porci' : d.desc) + '</textarea></label>' +
    '<p class="field-help">Předvyplněný text můžeš přepsat. „Podobná snídaně“ je tvoje označení, ne objektivně shodné složení.</p>' +
    '<fieldset class="choice-field"' + NF.hook('episode-insulin') + '><legend>Inzulin k tomuto jídlu</legend><div class="choice-row">' +
    ['per-plan|Podal jsem podle plánu', 'none|Nepodal jsem', 'unknown|Nevím'].map(function (o) {
      var x = o.split('|');
      return '<button type="button" class="choice ' + (ins === x[0] ? 'chosen' : '') + '" data-action="formSet" data-value="insulinReported:' + x[0] + '"' +
        (ins === x[0] ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' + e(x[1]) + '</button>';
    }).join('') + '</div></fieldset>' +
    (ins && ins !== 'unknown'
      ? '<label class="field">Čas podání<input data-bind="form.insulinTime" placeholder="07:15" value="' + e(d.insulinTime || '') + '"></label>' +
        '<p class="field-help">Čas uvádíš ty. Nezávislé ověření podání v této maketě nemáme.</p>'
      : ins === 'unknown'
        ? hint('Zvolil jsi „nevím“. Nic nedopočítáváme a údaj nenahrazujeme. Epizodu uložíme, ale bude bez potřebného kontextu.')
        : '') +
    '<label class="field">Okolnosti (nepovinné)<input data-bind="form.circumstances" placeholder="Například: spěchal jsem." value="' + e(d.circumstances || '') + '"></label>' +
    (S.bolusState === 'unknown' || S.bolusState === 'after'
      ? hint('<strong>Změnová rada teď není dostupná.</strong> ' + e(NF.adviceAllowed(S, S.bolusState).why) +
        ' Pozorovací zápis zůstává dostupný beze změny.', 'warn') : '') +
    '<div class="actions">' + btn('Uložit epizodu', 'saveEpisode', null, 'primary') + btn('Zpět', 'page', 'today', 'secondary') + '</div>');
};

V.compare = function (S) {
  var c = NF.countEpisodes(S, (NF.activeTask(S) || S.tasks[0] || {}).id);
  if (!c.recorded) return card('<h1>Zatím není co porovnat</h1><p>Až zapíšeš první snídani, uvidíš ji tady.</p>' +
    '<div class="actions">' + btn('Zpět na Dnes', 'page', 'today', 'primary') + '</div>');
  var incomplete = c.list.filter(function (x) { return !NF.episodeStatus(x).complete; });
  var withPoints = c.list.filter(function (x) { return NF.episodeStatus(x).points > 0; });
  return card('<p class="eyebrow">Porovnání</p><h1>Co zatím máme</h1>' +
    '<p' + NF.hook('compare-sentence') + '>Máme <strong>' + c.recorded + ' zaznamenané průběhy</strong> po snídani, z toho <strong>' + c.complete + '</strong> s potřebným kontextem. ' +
    'Průběhy se lišily. Nevíme, co rozdíl způsobilo. Není to předpověď.</p>' +
    (withPoints.length ? chart(withPoints, 'Zaznamenané průběhy po snídani') :
      hint('Pro zaznamenané epizody nemáme senzorové body. Průběh nedokreslujeme.', 'warn')) +
    '<h2>Jednotlivé epizody</h2><ul class="plain-list"' + NF.hook('compare-list') + '>' +
    c.list.map(function (ep) {
      var st = NF.episodeStatus(ep);
      return '<li><strong>' + e(ep.id + ' · ' + NF.fmtShort(ep.at) + ' v ' + NF.fmtTime(ep.at)) + '</strong>' +
        (st.complete ? tag('s kontextem', 'ok') : tag('chybí kontext', 'warn')) +
        '<p>' + e(ep.desc) + '</p>' +
        (st.complete ? '' : '<p class="small"><span class="missing">Chybí: ' + e(st.missing.join(', ')) + '.</span></p>') +
        (ep.circumstances ? '<p class="small muted">Okolnosti: ' + e(ep.circumstances) + '</p>' : '') +
        '<p class="small muted">Zdroj senzorového úseku: import ' + (ep.importedAt ? e(NF.fmtDateTime(ep.importedAt)) : '<span class="missing">nemáme údaj</span>') + '.</p>' +
        '<div class="actions">' + btn('Opravit popis', 'openCorrect', ep.id, 'link') + '</div></li>';
    }).join('') + '</ul>' +
    (incomplete.length ? hint('U epizody ' + e(incomplete.map(function (x) { return x.id; }).join(', ')) +
      ' chybí kontext. Nepřepisujeme to na nulu a nedohadujeme, co se stalo.') : '') +
    '<p class="small muted">Nehodnotíme jídlo jako dobré nebo špatné a neurčujeme příčinu rozdílu.</p>' +
    '<div class="actions">' + (c.complete >= 2 ? btn('Uzavřít úkol vlastním závěrem', 'page', 'conclude', 'primary') : '') +
    btn('Zpět na Dnes', 'page', 'today', 'secondary') + '</div>' +
    (c.complete < 2 ? hint('Úkol zatím nemůžeš uzavřít věcným závěrem — máš ' + c.complete + ' epizody s potřebným kontextem. ' +
      'Můžeš zaznamenat další epizodu, úkol zjednodušit, nebo jej po domluvě pozastavit. Náhradní průběh nedoplňujeme.' +
      '<div class="actions">' + btn('Zapsat další epizodu', 'page', 'episode', 'secondary') +
      btn('Uzavřít bez věcného závěru', 'page', 'conclude', 'secondary') + '</div>', 'warn') : ''));
};

V.conclude = function (S) {
  var D = global.NutriFeeDemo;
  var list = (D && D.conclusions) || [];
  var c = NF.countEpisodes(S, (NF.activeTask(S) || {}).id);
  var chosen = S.form && S.form.conclusion != null ? S.form.conclusion : (list[c.complete >= 2 ? 0 : 1] || '');
  return card('<p class="eyebrow">Závěr úkolu</p><h1>Co si z toho odnáším</h1>' +
    '<p class="muted">Závěr píšeš ty. Nabídnutý text můžeš upravit nebo přepsat.</p>' +
    (list.length ? '<div class="buttonlist"' + NF.hook('conclude-options') + '>' + list.map(function (x, i) {
      return btn(x, 'pickConclusion', String(i), chosen === x ? 'selected' : 'secondary');
    }).join('') + '</div>' : '') +
    '<label class="field">Můj závěr<textarea data-bind="form.conclusion">' + e(chosen) + '</textarea></label>' +
    hint('Závěr netvrdí příčinu ani budoucí účinek. Je to podklad k rozhovoru na kontrole.') +
    '<div class="actions">' + btn('Dokončit úkol', 'completeTask', null, 'primary') + btn('Zpět', 'page', 'compare', 'secondary') + '</div>');
};

V.records = function (S) {
  var t = S.tasks[0];
  return card('<p class="eyebrow">Moje záznamy</p><h1>Co je uložené</h1>' +
    (t && t.conclusion ? '<div class="next-step"><strong>Můj závěr k úkolu</strong><p>' + e(t.conclusion) + '</p>' +
      '<p class="small muted">Dokončeno ' + e(NF.fmtDateTime(t.completedAt)) + '.</p></div>' : '') +
    (S.episodes.length ? '<ul class="plain-list">' + S.episodes.map(function (ep) {
      var st = NF.episodeStatus(ep);
      return '<li><strong>' + e(ep.id + ' · ' + NF.fmtShort(ep.at)) + '</strong>' + (st.complete ? tag('s kontextem', 'ok') : tag('chybí kontext', 'warn')) +
        '<p>' + e(ep.desc) + '</p>' +
        '<p class="small muted">Plán v době epizody: ' + e(ep.planId || 'nemáme údaj') + '. Zapsáno ' + e(NF.fmtDateTime(ep.recordedAt)) + '.</p>' +
        (ep.history.length ? '<details><summary>Historie oprav (' + ep.history.length + ')</summary><div>' + ep.history.map(function (h) {
          return '<p class="small">' + e(NF.fmtDateTime(h.at)) + ': „' + e(h.from) + '“ → „' + e(h.to) + '“</p>';
        }).join('') + '</div></details>' : '') + '</li>';
    }).join('') + '</ul>' : '<div class="empty"><p>Zatím tu nic není. Až něco zapíšeš, uvidíš to tady i s tím, kdy to vzniklo.</p></div>') +
    (S.questions.length ? '<h2>Otázky uložené ke kontrole</h2><ul class="plain-list">' + S.questions.map(function (q) {
      return '<li><p>' + e(q.text) + '</p><p class="small muted">Uloženo ' + e(NF.fmtDateTime(q.at)) + '. Nebylo odesláno lékaři.</p></li>';
    }).join('') + '</ul>' : ''));
};

V.planScreen = function (S) {
  var p = NF.activePlan(S);
  if (!p) return card('<h1>Plán</h1><p>Plán dosud nebyl vydán.</p>');
  var older = S.plans.filter(function (x) { return x.id !== p.id; });
  return card('<p class="eyebrow">Můj plán</p><h1>' + e(p.id + ' ' + p.version) + '</h1>' +
    '<div class="plan-basics">' + kv('Vydal', e(S.doctor.label)) + kv('Účinný od', e(NF.fmtDate(p.effectiveFrom))) +
    kv('Platnost do', e(NF.fmtShort(p.validUntil))) + '</div>' +
    '<h2>Modelový předpis</h2><p>' + e(p.prescription) + '</p>' +
    '<p class="small muted">NutriFee dávku nepočítá ani nemění.</p>' +
    (older.length ? '<h2>Starší plány</h2><ul class="plain-list">' + older.map(function (x) {
      return '<li><strong>' + e(x.id + ' ' + x.version) + '</strong><p class="small muted">Účinný od ' + e(NF.fmtShort(x.effectiveFrom)) +
        '. Epizody z tohoto období zůstávají navázané na něj.</p></li>';
    }).join('') + '</ul>' : ''));
};

V.safety = function (S) {
  var sp = S.safetyPlan || (global.NutriFeeDemo && global.NutriFeeDemo.SAFETY);
  if (!sp) return card('<h1>Bezpečnostní a kontaktní plán</h1><p>Plán zatím nebyl předán.</p>');
  return card('<p class="eyebrow">Vždy dostupné</p><h1>Bezpečnostní a kontaktní plán</h1>' +
    '<p class="small muted">Verze ' + e(sp.version) + ' · poslední synchronizace ' + e(NF.fmtDateTime(S.safetySyncAt)) +
    (S.dataState.offline ? ' · <strong>simulovaný offline režim</strong>' : '') + '</p>' +
    hint('<strong>' + e(sp.approvedNote) + '</strong> NutriFee sám nepřidává léčebné prahy, dávky ani instrukce.', 'warn') +
    '<div' + NF.hook('safety-sections') + '>' + sp.sections.map(function (s) {
      return '<details><summary>' + e(s.title) + '</summary><div><p>' + e(s.body) + '</p></div></details>';
    }).join('') + '</div>' +
    '<div class="divider"></div>' +
    '<h2>Kontakt</h2>' +
    '<p>Kontaktní postup je v této ukázce simulovaný. Nezobrazujeme žádné číslo, které by šlo vytočit.</p>' +
    '<div class="actions"' + NF.hook('safety-contact') + '>' + btn('Ukázat kontaktní postup', 'showContact', null, 'secondary') + '</div>' +
    (S.contactShown ? hint('<strong>Modelový postup:</strong> 1. Zjisti, zda jde o akutní situaci. 2. V ordinačních hodinách kontaktuj svoji ambulanci běžnou cestou. ' +
      '3. Mimo ně se řiď postupem, který ti pracoviště předalo. 4. Při ohrožení života volej záchrannou službu.<br>' +
      '<strong>Nic se neodeslalo.</strong> Ordinace o tomto zobrazení neví a nikdo nečeká na reakci.') : ''));
};

V.unclear = function (S) {
  var b = S.unclearBranch;
  return card('<p class="eyebrow">Nerozumím tomu</p><h1>Čeho se to týká?</h1>' +
    '<div class="buttonlist"' + NF.hook('unclear-split') + '>' +
    btn('Ptám se na dřívější průběh', 'unclear', 'past', b === 'past' ? 'selected' : 'secondary') +
    btn('Řeším problém právě teď', 'unclear', 'now', b === 'now' ? 'selected' : 'secondary') +
    btn('Jsem nemocný', 'unclear', 'ill', b === 'ill' ? 'selected' : 'secondary') + '</div>' +
    '<p class="small muted">Závažnost netřídíme automaticky podle čísel. Rozhoduješ ty.</p>' +
    (b === 'past' ? '<div class="divider"></div><h2>Otázka ke kontrole</h2>' +
      '<label class="field">Co tě zajímá<textarea data-bind="form.question" placeholder="Napiš vlastními slovy, co ti není jasné.">' + e((S.form && S.form.question) || '') + '</textarea></label>' +
      '<label class="field">Okolnost (nepovinné)<input data-bind="form.qcirc" value="' + e((S.form && S.form.qcirc) || '') + '"></label>' +
      '<div class="actions">' + btn('Uložit otázku ke kontrole', 'saveQuestion', null, 'primary') + '</div>' +
      hint('<strong>Neodesláno lékaři.</strong> Otázka se uloží k tobě a otevřete ji spolu na kontrole. Nikdo na ni teď nečeká.') : '') +
    (b === 'now' ? '<div class="divider"></div>' + hint('<strong>Otevři bezpečnostní a kontaktní plán.</strong> Je to schválený modelový postup od tvého lékaře.') +
      '<div class="actions">' + btn('Otevřít bezpečnostní a kontaktní plán', 'page', 'safety', 'primary') + '</div>' : '') +
    (b === 'ill' ? '<div class="divider"></div><h2>Oznámení nemoci</h2>' +
      '<p>Nemoc oznamuješ ty. Aplikace ji nedetekuje.</p>' +
      (S.illness && S.illness.active
        ? hint('Období nemoci je označené od ' + e(NF.fmtDateTime(S.illness.from)) + '. Pozorování je pozastavené a změnové kroky se nenabízejí. ' +
          'Epizody z tohoto období se nepředkládají jako běžná zkušenost.', 'warn')
        : '<div class="actions">' + btn('Oznámit nemoc', 'reportIllness', null, 'primary') + '</div>') : '') +
    '<div class="actions">' + btn('Zpět na Dnes', 'page', 'today', 'secondary') + '</div>');
};

V.datastate = function (S) {
  var c = S.dataState.patientCause;
  return card('<p class="eyebrow">Stav dat</p><h1>V NutriFee chybí novější hodnoty</h1>' +
    '<p>Poslední hodnota, kterou tu máme, je z <strong>' + e(NF.fmtDateTime(S.dataState.lastValueAt)) + '</strong>.</p>' +
    '<fieldset class="choice-field"' + NF.hook('datastate-cause') + '><legend>Co vidíš ty v systému výrobce senzoru?</legend><div class="choice-row">' +
    ['vendor-ok|Výrobce senzoru hodnoty ukazuje', 'broken|Senzor nefunguje', 'unknown|Nevím'].map(function (o) {
      var x = o.split('|');
      return '<button type="button" class="choice ' + (c === x[0] ? 'chosen' : '') + '" data-action="setCause" data-value="' + x[0] + '" aria-pressed="' + (c === x[0]) + '">' + e(x[1]) + '</button>';
    }).join('') + '</div></fieldset>' +
    (c === 'vendor-ok' ? hint('<strong>Chybí data jen nám.</strong> NutriFee popisuje pouze absenci vlastních dat. Tvůj senzor a jeho akutní upozornění tím nekomentujeme.') : '') +
    (c === 'broken' ? hint('<strong>Náhradní postup podle tvého plánu.</strong> Řiď se bezpečnostním a kontaktním plánem. Technickou pomoc se senzorem řeší podpora výrobce, ne ordinace.' +
      '<div class="actions">' + btn('Otevřít bezpečnostní plán', 'page', 'safety', 'secondary') + '</div>') : '') +
    (c === 'unknown' ? hint('<strong>Příčinu neurčujeme.</strong> Zaznamenali jsme jen, že novější data v NutriFee nejsou. Nepíšeme, že je senzor rozbitý.') : '') +
    '<p class="small muted">Chybějící body zůstanou mezerou. Nedopočítáváme je ani zpětně.</p>' +
    '<div class="actions">' + btn('Zpět na Dnes', 'page', 'today', 'secondary') + '</div>');
};

V.preview = function (S) {
  var rev = NF.buildReview(S);
  return card('<p class="eyebrow">Náhled před kontrolou</p><h1>Co dostane lékař</h1>' +
    '<p class="muted">Tohle uvidí tvůj lékař na kontrole ' + e(S.nextVisit ? NF.fmtDate(S.nextVisit) : '') + '. Můžeš opravit překlep a doplnit otázku.</p>' +
    (S.episodes.length ? '<ul class="plain-list">' + S.episodes.map(function (ep) {
      return '<li><strong>' + e(ep.id + ' · ' + NF.fmtShort(ep.at)) + '</strong>' +
        '<label class="field">Popis<input data-bind="edit.' + ep.id + '" value="' + e(ep.desc) + '"></label>' +
        '<div class="actions">' + btn('Uložit opravu', 'saveCorrection', ep.id, 'secondary') + '</div>' +
        (ep.history.length ? '<p class="small muted">Historie změny zůstává dostupná (' + ep.history.length + ').</p>' : '') + '</li>';
    }).join('') + '</ul>' : '<div class="empty"><p>V tomto období nemáš žádné zápisy. Kontrola se kvůli tomu neruší a nic si nedomýšlíme.</p></div>') +
    '<label class="field">Moje hlavní otázka na kontrolu<textarea data-bind="form.question">' +
    e((S.form && S.form.question != null) ? S.form.question : (rev.question || '')) + '</textarea></label>' +
    '<div class="actions">' + btn('Uložit otázku', 'saveQuestion', null, 'primary') + '</div>' +
    hint('Potvrzení údajů neznamená nezávislé ověření podané dávky. Uvádíme, co jsi zaznamenal ty.'));
};

V.newPlan = function (S) {
  var p = NF.activePlan(S);
  var prev = p && p.previousId ? NF.planById(S, p.previousId) : null;
  if (!p) return card('<h1>Nový plán</h1><p>Zatím žádný nový plán nebyl vydán.</p>');
  return card('<p class="eyebrow">Nový plán</p><h1>' + e(p.id + ' ' + p.version) + '</h1>' +
    '<div class="plan-basics">' + kv('Vydal', e(S.doctor.label)) + kv('Účinný od', e(NF.fmtDate(p.effectiveFrom))) + '</div>' +
    '<h2>Co se změnilo</h2>' +
    '<div class="plan-changes"' + NF.hook('newplan-diff') + '>' +
    '<p><strong>Léčba v modelové ukázce beze změny.</strong> Předpis zůstává stejný jako v ' + e(prev ? prev.id : 'předchozím plánu') + '.</p>' +
    '<p><strong>Nová otázka pozorování.</strong> ' + e((NF.taskById(S, p.taskId) || {}).title || '') + '</p>' +
    (S.nextVisit ? '<p><strong>Nový termín kontroly:</strong> ' + e(NF.fmtDate(S.nextVisit)) + '.</p>' : '') + '</div>' +
    '<p class="small muted">Starší epizody zůstávají navázané na ' + e(prev ? prev.id : 'původní plán') + '. Nepřepisují se na nový plán.</p>' +
    (p.understood
      ? hint('Plán je převzatý. Na Dnes máš jeden aktuální úkol.', 'success') + '<div class="actions">' + btn('Přejít na Dnes', 'page', 'today', 'primary') + '</div>'
      : '<div class="actions">' + btn('Potvrzuji předání', 'confirmUnderstanding', null, 'primary') + '</div>'));
};

V.conceptPreview = function (S) {
  return card('<p class="eyebrow">Neschválený koncept — není aktivní</p>' +
    '<h1>Koncepční náhled protokolu samotitrace</h1>' +
    hint('<strong>Neschválený koncept — není aktivní.</strong> Tato obrazovka je dostupná pouze uvnitř panelu variant. ' +
      'Není součástí běžné pacientské role a neobsahuje žádnou novou číselnou dávku.', 'warn') +
    '<h2>Předání protokolu</h2>' +
    '<p>Tvůj lékař by ti předal protokol s krokem, intervalem a cílem. <strong>[Klinický obsah protokolu musí dodat a schválit garant.]</strong></p>' +
    '<h2>Ověření porozumění</h2>' +
    '<p>Otázka: Co uděláš, když onemocníš? Odpověď podle protokolu: <strong>[k doplnění garantem]</strong>.</p>' +
    (S.conceptState === 'paused'
      ? hint('<strong>Koncept je pozastavený.</strong> Důvod: pacient oznámil nemoc. Není vypočtena žádná změna inzulinu. ' +
        'Pozastavení protokolu neznamená vysazení inzulinu. Postup najdeš v bezpečnostním plánu svého lékaře.', 'warn') : '') +
    '<div class="actions">' + btn('Zavřít koncepční náhled', 'closeConcept', null, 'secondary') + '</div>');
};

V.edgeScreen = function (S) {
  var D = global.NutriFeeDemo;
  var item = D && S.edge ? D.edgeCases.filter(function (x) { return x.id === S.edge; })[0] : null;
  if (!item) return card('<h1>Okrajové situace</h1><p>Žádná situace není zapnutá.</p>' +
    '<div class="actions">' + btn('Zpět na Dnes', 'page', 'today', 'secondary') + '</div>');
  return card('<div' + NF.hook('edge-case') + '><p class="eyebrow">Okrajová situace</p><h1>' + e(item.title) + '</h1>' +
    '<p>' + e(item.answer) + '</p>' +
    '<div class="next-step"><strong>Co se změnilo, co lze dál dělat a kdo řeší další krok</strong>' +
    '<p>Změna je zaznamenaná v této demonstraci. Úkoly odpovídají popsanému stavu. Další krok řeší role uvedená v textu — aplikace nikomu nic neodesílá.</p></div>' +
    '<div class="actions">' + btn('Zpět na Dnes', 'page', 'today', 'secondary') + '</div></div>');
};

})(typeof window !== 'undefined' ? window : globalThis);
