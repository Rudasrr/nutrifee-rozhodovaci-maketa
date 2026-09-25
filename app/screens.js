/* Obrazovky aplikace. Obsahují jen běžnou uživatelskou nápovědu pro pacienta,
   lékaře, sestru a garanta — „proč mi to radíš a jak moc si tím jsi jistá“.
   Ta zůstává i v produkci. Vysvětlení a obhajoba návrhu pro prezentující
   jsou v demo/guide-content.js. */
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
function choice(label, action, value, on) {
  return '<button type="button" class="choice ' + (on ? 'chosen' : '') + '" data-action="' + e(action) + '" data-value="' + e(value) + '"' +
    ' aria-pressed="' + (on ? 'true' : 'false') + '">' + e(label) + '</button>';
}
V.btn = btn; V.btnHtml = btnHtml; V.hint = hint; V.kv = kv; V.card = card; V.tag = tag; V.choice = choice;

/* Každý výpočet a rada nese pravidlo, ze kterého pochází, a jeho stav. */
function ruleChip(S, key) {
  var r = NF.ruleByKey(S, key);
  if (!r) return '<span class="rule-chip missing">pravidlo nenalezeno</span>';
  return '<span class="rule-chip ' + e(r.status) + '">Pravidlo ' + e(r.id + ' ' + r.version) + ' · ' + e(NF.RULE_STATUS[r.status] || r.status) + '</span>';
}
V.ruleChip = ruleChip;

var LEVEL = {
  known: ['Známé jídlo', 'ok'],
  similar: ['Podobné jídlo', 'info'],
  unknown: ['Neznámé jídlo', ''],
  none: ['Bez vyhodnocení', 'warn']
};
function levelTag(level) { var l = LEVEL[level] || LEVEL.unknown; return tag(l[0], l[1]); }
V.levelTag = levelTag;

/* ---------- graf průběhu po jídle ----------
   Osy mají popisky a jednotky, chybějící data tvoří viditelnou mezeru,
   barva sama nenese význam a graf má textový souhrn. */
function chart(eps, title) {
  var W = 560, H = 210, L = 46, R = 14, T = 16, B = 34;
  var all = [];
  eps.forEach(function (ep) { (ep.points || []).forEach(function (p) { if (p.mmol != null) all.push(p.mmol); }); });
  if (!all.length) {
    return '<figure class="chart"><figcaption>' + e(title) + ' — pro zvolené záznamy nejsou k dispozici žádné senzorové body. Mezera se nedopočítává.</figcaption></figure>';
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
  });
  /* Legenda místo popisků u čar — křivky se u konce okna sbíhají a popisky by se překrývaly. */
  var styles = ['plná', 'čárkovaná', 'tečkovaná', 'dlouhé čárky'];
  var legend = eps.length > 1 ? '<p class="chart-legend small muted">' + eps.map(function (ep, i) {
    return '<span><svg width="28" height="8" aria-hidden="true"><line x1="0" y1="4" x2="28" y2="4" stroke="#006b62" stroke-width="2" stroke-dasharray="' + dashes[i % 4] + '"/></svg> ' +
      e(ep.id) + ' (' + styles[i % 4] + ')</span>';
  }).join(' ') + '</p>' : '';
  var summary = eps.map(function (ep) {
    var have = (ep.points || []).filter(function (p) { return p.mmol != null; });
    return ep.id + ': ' + (have.length ? have.map(function (p) { return p.min + ' min ' + NF.mmol(p.mmol); }).join(', ') + ' mmol/l' : 'žádné body');
  }).join('; ');
  return '<figure class="chart">' +
    '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + e(title + '. ' + summary) + '">' +
    '<text x="6" y="' + (T + 4) + '" font-size="11" fill="#516764">mmol/l</text>' + body +
    '<text x="' + (W / 2) + '" y="' + (H - 1) + '" text-anchor="middle" font-size="11" fill="#516764">minuty od jídla</text>' +
    '</svg>' + legend + '<figcaption>' + e(title) + '. Osa x: minuty od jídla. Osa y: glukóza v mmol/l. Zobrazeny jsou jen dostupné body; přes chybějící data se čára nekreslí. ' +
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
  var items = [['today', 'Dnes'], ['foods', 'Moje jídla'], ['plan', 'Plán'], ['safety', 'Bezpečí']];
  return '<div class="patientnav-wrap"' + NF.hook('patient-nav') + '>' +
    '<nav class="patientnav" aria-label="Hlavní nabídka pacienta">' + items.map(function (it) {
      return '<button type="button" data-action="page" data-value="' + it[0] + '" class="' + (S.page === it[0] ? 'active' : '') + '"' +
        (S.page === it[0] ? ' aria-current="page"' : '') + '>' + e(it[1]) + '</button>';
    }).join('') + '</nav></div>';
}

V.patient = function (S) {
  var body;
  switch (S.page) {
    case 'takeover': body = V.takeover(S); break;
    case 'understand': body = V.understand(S); break;
    case 'meal': body = V.meal(S); break;
    case 'foods': body = V.foods(S); break;
    case 'plan': body = V.planScreen(S); break;
    case 'safety': body = V.safety(S); break;
    case 'unclear': body = V.unclear(S); break;
    case 'datastate': body = V.datastate(S); break;
    case 'preview': body = V.preview(S); break;
    case 'newplan': body = V.newPlan(S); break;
    case 'edge': body = V.edgeScreen(S); break;
    default: body = V.today(S);
  }
  var nav = ['understand', 'takeover'].indexOf(S.page) === -1;
  return '<div class="patient">' + body + (nav ? patientNav(S) : '') + '</div>';
};

V.takeover = function (S) {
  var p = NF.activePlan(S);
  if (!p) return card('<p class="eyebrow">V ordinaci</p><h1>Plán zatím nebyl vydán</h1>' +
    '<p>Tvůj lékař s tebou právě prochází zařazení. Až plán vydá, uvidíš ho tady.</p>' +
    '<p class="small muted">Plán vydává lékař. Sám si ho nastavit nemůžeš.</p>');
  var t = NF.taskById(S, p.taskId);
  return card('<p class="eyebrow">V ordinaci · předání plánu</p>' +
    '<h1>Tvůj plán ' + e(p.id + ' ' + p.version) + '</h1>' +
    '<p class="muted">Lékař ti plán vydal a sestra tě zaučila. Projdi si, co obsahuje.</p>' +
    '<div class="plan-basics"' + NF.hook('takeover-basics') + '>' +
    kv('Vydal', e(S.doctor.label)) + kv('Účinný od', e(NF.fmtDate(p.effectiveFrom))) +
    kv('Platnost do', e(NF.fmtShort(p.validUntil))) + '</div>' +
    '<h2>Tvoje dávky</h2><p>' + e(p.prescription) + '</p>' +
    '<p class="small muted">Dávky jsou pevné a určuje je lékař. NutriFee dávku nepočítá, nemění a nenavrhuje — pomáhá ti k ní jíst obvyklé množství a vybrat, v jaké podobě.</p>' +
    (t ? '<h2>Tvůj úkol</h2><p><strong>' + e(t.title) + '</strong></p><p>' + e(t.conditions) + '</p>' +
      '<p class="small muted">Otázka, na kterou úkol odpovídá: „' + e(t.question) + '“</p>' : '') +
    hint('<strong>Hranice služby.</strong> NutriFee tě průběžně nesleduje, neposílá zprávy ordinaci a nemá vlastní akutní detekci. ' +
      'Akutní upozornění zajišťuje systém výrobce senzoru.') +
    '<div class="actions"' + NF.hook('takeover-confirm') + '>' +
    (p.understood ? btn('Přejít na Dnes', 'page', 'today', 'primary')
      : btn('Plán jsem převzal — pokračovat', 'page', 'understand', 'primary')) +
    '</div>' +
    '<p class="small muted">Převzetí znamená, že jsi plán dostal a otevřel. Porozumění ověří ještě jedna krátká otázka.</p>');
};

V.understand = function (S) {
  var a = S.onboarding.checkAnswer;
  var p = NF.activePlan(S);
  return card('<p class="eyebrow">V ordinaci · ověření porozumění</p>' +
    '<h1>Jedna otázka, než odejdeš</h1>' +
    '<p class="muted">Odpověď tě neznámkuje a nikam se neukládá jako hodnocení.</p>' +
    '<p><strong>Znamená zápis v aplikaci, že ho lékař hned uvidí?</strong></p>' +
    '<div class="actions"' + NF.hook('understand-answer') + '>' +
    btn('Ano', 'answerCheck', 'yes', a === 'yes' ? 'selected' : 'secondary') +
    btn('Ne', 'answerCheck', 'no', a === 'no' ? 'selected' : 'secondary') + '</div>' +
    (a === 'yes' ? hint('<strong>Tady si to upřesníme.</strong> Zápis v NutriFee <strong>není zpráva ordinaci</strong>. ' +
      'Nikdo ho průběžně nesleduje a nikdo na něj nečeká. Záznamy si s lékařem projdete na domluvené kontrole. ' +
      'Pokud řešíš problém právě teď, použij bezpečnostní a kontaktní plán.' +
      '<div class="actions">' + btn('Rozumím, zpět k otázce', 'answerCheck', 'reset', 'secondary') + '</div>') : '') +
    (a === 'no' ? hint('<strong>Přesně tak.</strong> Zápisy slouží tobě a rozhovoru na kontrole. ' +
      'Pro aktuální potíže je tu bezpečnostní a kontaktní plán; technická pomoc s aplikací je jinde a řeší ji jiný člověk.', 'success') : '') +
    '<div class="divider"></div>' +
    '<div class="split"' + NF.hook('help-split') + '><div><h3>Technická pomoc</h3><p class="small muted">Aplikace nejde spustit, senzor se nepáruje. Řeší podpora, ne ordinace.</p></div>' +
    '<div><h3>Zdravotní kontakt</h3><p class="small muted">Zdravotní potíže a nejasnosti k léčbě. Řeší tvoje ordinace podle bezpečnostního plánu.</p></div></div>' +
    '<div class="actions">' + (a === 'no' && p
      ? btn('Hotovo — odcházím s aktivním úkolem', 'confirmUnderstanding', null, 'primary')
      : btnHtml('Hotovo', 'noop', null, 'primary', ' disabled')) +
    btn('Zpět na plán', 'page', 'takeover', 'secondary') + '</div>' +
    (a !== 'no' ? '<p class="small muted">Úkol se aktivuje až po téhle odpovědi.</p>' : ''));
};

/* Vyřazená rada bez schválené náhrady: pacient ví, proč ji nedostává. */
function retiredNotice(S) {
  var gone = S.rules.filter(function (r) { return r.status === 'retired' && r.lever && !NF.leverRule(S, r.lever); });
  if (!gone.length || S.dataState.offline) return '';
  return card('<div' + NF.hook('rule-notice') + '>' + hint('<strong>Některé rady teď nedostaneš.</strong> ' + gone.map(function (r) {
    return e(NF.LEVERS[r.lever].label) + ' — pravidlo ' + e(r.id + ' ' + r.version) + ' bylo vyřazeno. Až garant schválí novou verzi, rada se vrátí.';
  }).join('<br>') + '<br>Tvoje dávky se tím nemění. Ostatní rady platí.', 'warn') + '</div>', 'flat');
}

V.today = function (S) {
  var p = NF.activePlan(S), t = NF.currentTask(S);
  var out = planStrip(S);
  if (!p) {
    out += card('<h1>Zatím nemáš vydaný plán</h1><p>Až ti lékař plán v ordinaci vydá, uvidíš tady svůj úkol.</p>' +
      '<p class="small muted">Plán vydává lékař. Sám si ho nastavit nemůžeš.</p>');
    return out;
  }
  if (S.participation !== 'active') {
    out += card('<div' + NF.hook('participation-end') + '><h1>Účast je ukončená</h1><p>Úkoly, rady i připomínky jsou zastavené.</p>' +
      '<div class="actions">' + btn('Zobrazit předání a další péči', 'page', 'edge', 'primary') + '</div></div>');
    return out;
  }
  if (!t) return out + card('<h1>Žádný úkol</h1><p>K tvému plánu není přiřazený žádný úkol.</p>');
  if (t.state === 'prepared') {
    return out + card('<h1>Úkol ještě není aktivní</h1><p>' + e(t.title) + '</p>' +
      '<p class="small muted">Aktivuje se po zaučení u sestry a ověření porozumění.</p>');
  }
  if (t.state === 'paused') {
    out += card('<p class="eyebrow">Úkol je pozastavený</p><h1>' + e(t.title) + '</h1>' +
      hint('<strong>Proč je pozastavený:</strong> ' + e(t.pauseDetail || '') +
        '<br><strong>Co to neznamená:</strong> tvoje dávky se nemění a inzulin se nevysazuje. ' +
        '<br><strong>Co dál:</strong> úkol obnoví lékař. Rady k jídlu do té doby nedostaneš. Zápisy, které už máš, zůstávají.', 'warn') +
      '<div class="actions">' + btn('Bezpečnostní a kontaktní plán', 'page', 'safety', 'secondary') +
      btn('Moje jídla', 'page', 'foods', 'secondary') + '</div>', 'flat');
    return out + (S.dataState.offline ? offlineNote(S) : '');
  }
  var c = NF.countEpisodes(S, t.id);
  var known = S.foods.filter(function (f) { return NF.confidence(S, f.id).level === 'known'; }).length;
  out += card('<p class="eyebrow">Tvůj úkol</p>' +
    '<h1>' + e(t.title) + '</h1>' +
    '<p class="muted">' + e(t.conditions) + '</p>' +
    '<div class="review-facts"' + NF.hook('today-counts') + '>' +
    '<div>' + kv('Zapsaná jídla', String(c.recorded)) + '</div>' +
    '<div>' + kv('Jídla, která už znám', String(known)) + '</div></div>' +
    '<p class="small muted">Jídlo „znám“, když ho máš zapsané aspoň třikrát s úplnými daty. Do té doby se zpřesňuje.</p>' +
    '<div class="actions"' + NF.hook('today-primary') + '>' +
    btn('Chystám se jíst', 'startMeal', null, 'primary') +
    btn('Moje jídla', 'page', 'foods', 'secondary') + '</div>');
  out += retiredNotice(S);
  out += card('<h2>Když si nejsi jistý</h2>' +
    '<div class="buttonlist"' + NF.hook('today-unsure') + '>' +
    btn('Nerozumím tomu, co vidím', 'page', 'unclear', 'secondary') +
    btn('Bezpečnostní a kontaktní plán', 'page', 'safety', 'secondary') +
    btn('Jsem nemocný', 'unclearGo', 'ill', 'secondary') + '</div>', 'flat');
  if (S.dataState.gap) out += dataGapCard(S);
  if (S.dataState.offline) out += offlineNote(S);
  return out;
};

function offlineNote(S) {
  return card('<div' + NF.hook('offline-advice') + '>' + hint('<strong>Zařízení je bez spojení (simulace).</strong> Rady k jídlu jsou vypnuté, protože nevíme, jestli pravidla pořád platí. ' +
    'Poslední ověření pravidel: ' + e(NF.fmtDateTime(S.rulesSyncAt)) + '. Bezpečnostní a kontaktní plán ' +
    e(S.safetyPlan ? S.safetyPlan.version : '') + ' je dostupný v poslední uložené verzi.', 'warn') + '</div>', 'flat');
}
function dataGapCard(S) {
  return card('<h2>Stav dat v NutriFee</h2>' +
    '<p>Poslední hodnota, kterou tu máme, je z <strong>' + e(NF.fmtDateTime(S.dataState.lastValueAt)) + '</strong>. Novější data tu zatím nejsou.</p>' +
    '<p class="small muted">Tohle samo o sobě neznamená, že je senzor rozbitý. Příčinu neurčujeme.</p>' +
    '<div class="actions">' + btn('Upřesnit, co vidíš ty', 'page', 'datastate', 'secondary') + '</div>', 'flat');
}

/* ---------- před jídlem: úroveň jistoty, otázka na inzulin, rada, zápis ---------- */
function levelCard(S, food, conf) {
  var h = conf.history;
  var rules = (conf.rules || []).map(function (k) { return ruleChip(S, k); }).join(' ');
  var body;
  if (conf.level === 'known') {
    var recent = h.list.filter(NF.usableEpisode).slice(-3);
    body = '<p>Tohle jídlo znám — máš ho zapsané <strong>' + h.eaten + '×</strong>, z toho ' + h.usable + '× s úplnými daty.</p>' +
      '<p>Po obvyklé porci ti obvykle stoupne přibližně o <strong>' + e(NF.mmol(h.typicalRise)) + ' mmol/l</strong>.</p>' +
      chart(recent, 'Poslední průběhy po jídle ' + food.name);
  } else if (conf.level === 'similar') {
    var names = conf.like.map(function (id) { return (NF.foodById(S, id) || {}).name; }).join(', ');
    body = '<p>Tohle jídlo zatím neznám' + (h.eaten ? ' (zapsané ' + h.eaten + '×)' : '') + '. ' +
      (conf.direction === 'more' ? '<strong>Vypadá jako jídla, po kterých ti to stoupá víc</strong>'
        : conf.direction === 'less' ? '<strong>Vypadá jako jídla, po kterých ti to stoupá méně</strong>'
          : '<strong>Vypadá jako jídla, po kterých ti to stoupá zhruba jako obvykle</strong>') +
      ' — podobá se: ' + e(names) + '.</p>' +
      '<p class="small muted">Kolik přesně, neodhadujeme. Podobnost počítáme z vlastností porce (sacharidy, bílkovina, tuk, vláknina, forma), ne z názvu.</p>';
  } else if (conf.level === 'none') {
    body = '<p>' + e(conf.why) + '</p>';
  } else {
    body = '<p>Tohle jídlo zatím neznám' + (h.eaten ? ' — zapsané ' + h.eaten + '×, potřebuju ' + conf.min + '× s úplnými daty' : '') +
      ' a nic podobného taky ne. <strong>Nic neodhaduju.</strong></p>' +
      '<p class="small muted">Zapiš ho. Po ' + (conf.min || 3) + ' úplných záznamech ti řeknu, co se po něm děje.</p>';
  }
  return '<div class="level-card"' + NF.hook('meal-level') + '><h2>' + e(food.name) + ' ' + levelTag(conf.level) + '</h2>' + body +
    (rules ? '<p class="rule-line">' + rules + '</p>' : '') + '</div>';
}

function helpDetails(S, res) {
  var c = res.conf;
  var lines = [];
  lines.push('<strong>Odkud to vím:</strong> jen z tvých vlastních záznamů jídla a senzoru. Záznamy bez údaje o inzulinu, s mezerou v datech nebo z doby nemoci nepočítám.');
  if (c.level === 'known') lines.push('<strong>Jak moc si jsem jistá:</strong> vycházím z ' + c.history.usable + ' úplných záznamů. Čím víc jich bude, tím přesnější to je. Je to tvoje minulost, ne předpověď.');
  else if (c.level === 'similar') lines.push('<strong>Jak moc si jsem jistá:</strong> málo. Tohle jídlo jsem u tebe neviděla, jen se podobá jiným. Proto neříkám číslo.');
  else lines.push('<strong>Jak moc si jsem jistá:</strong> vůbec. Proto nic neodhaduju.');
  lines.push('<strong>Co nikdy nedělám:</strong> nepočítám ani neměním dávku inzulinu. Radím jen k jídlu, porci, pořadí a pohybu.');
  lines.push('<strong>Proč se ptám na inzulin:</strong> radu, která mění množství sacharidů, dávám jen před píchnutím. Když nevíš, chovám se, jako by už byl podaný.');
  return '<details class="app-help"' + NF.hook('meal-help') + '><summary>Proč mi to radíš a jak moc si tím jsi jistá?</summary><div>' +
    lines.map(function (l) { return '<p class="small">' + l + '</p>'; }).join('') + '</div></details>';
}

V.meal = function (S) {
  var t = NF.activeTask(S);
  if (!t) return card('<h1>Zápis teď není otevřený</h1><p>Zápis jídla patří k aktivnímu úkolu. Žádný teď aktivní není.</p>' +
    '<div class="actions">' + btn('Zpět na Dnes', 'page', 'today', 'primary') + '</div>');
  var m = S.meal || {};
  var food = m.foodId ? NF.foodById(S, m.foodId) : null;
  var out = '<p class="eyebrow">Před jídlem · ' + e(NF.fmtDateTime(S.clock)) + '</p><h1>Co budeš jíst?</h1>' +
    '<div class="food-grid"' + NF.hook('meal-food') + '>' + S.foods.filter(function (f) { return f.meal === t.meal; }).map(function (f) {
      var c = NF.confidence(S, f.id);
      return '<button type="button" class="food-option ' + (m.foodId === f.id ? 'chosen' : '') + '" data-action="mealFood" data-value="' + e(f.id) + '" aria-pressed="' + (m.foodId === f.id) + '">' +
        '<strong>' + e(f.name) + '</strong><small>' + (LEVEL[c.level] || LEVEL.unknown)[0] + ' · zapsáno ' + c.history.eaten + '×</small></button>';
    }).join('') + '</div>';
  if (!food) return card(out + '<p class="small muted">Vyber jídlo ze svého seznamu. Nové jídlo přidá sestra nebo lékař z katalogu.</p>' +
    '<div class="actions">' + btn('Zpět na Dnes', 'page', 'today', 'secondary') + '</div>');

  out += '<fieldset class="choice-field"' + NF.hook('meal-portion') + '><legend>Jakou porci si chystáš?</legend><div class="choice-row">' +
    NF.PORTIONS.map(function (p) { return choice(p[1], 'mealPortion', p[0], (m.portion || 'usual') === p[0]); }).join('') + '</div></fieldset>' +
    '<p class="field-help">Obvyklá porce je to množství, na které je nastavená tvoje dávka. Cílem je ho držet — ne jíst méně.</p>';

  var res = NF.advise(S, food.id, m.portion || 'usual', m.bolus || null);
  out += levelCard(S, food, res.conf);

  if (!res.gate.ok) {
    out += hint('<strong>Teď neradím.</strong> ' + e(res.gate.why), 'warn');
  } else {
    out += '<fieldset class="choice-field bolus-q"' + NF.hook('meal-bolus') + '><legend>Už sis k tomuto jídlu píchl inzulin?</legend><div class="choice-row">' +
      NF.BOLUS.map(function (b) { return choice(b[1], 'mealBolus', b[0], m.bolus === b[0]); }).join('') + '</div></fieldset>' +
      '<p class="field-help">Ptám se pokaždé. Rada k porci smí přijít jen před píchnutím.</p>';
    if (m.bolus) {
      res.blocked.filter(function (b) { return b.reason === 'bolus'; }).forEach(function (b) {
        out += '<div' + NF.hook('meal-blocked') + '>' + hint('<strong>' + e(NF.LEVERS[b.lever].label) + ': teď neradím.</strong> ' + e(b.why) +
          (m.portion === 'smaller' ? ' Pokud sníš méně než obvykle, řiď se bezpečnostním plánem.' : ''), 'warn') + '</div>';
      });
      if (res.items.length) {
        out += '<h2' + NF.hook('meal-advice') + '>Co můžeš zkusit</h2><ul class="advice-list">' + res.items.map(function (it) {
          var d = (m.decisions || {})[it.lever];
          var reason = (m.reasons || {})[it.lever];
          return '<li class="advice ' + (d === true ? 'taken' : d === false ? 'declined' : '') + '">' +
            '<p class="advice-lever">' + e(it.label) + (it.carbs ? ' <span class="tag warn">mění sacharidy — jen před inzulinem</span>' : '') + '</p>' +
            '<p class="advice-text">' + e(it.text) + '</p>' +
            '<p class="small muted">' + e(it.certainty) + '</p>' +
            '<p class="rule-line">' + ruleChip(S, it.ruleKey) + '</p>' +
            '<div class="choice-row">' + choice('Zkusím to', 'mealDecide', it.lever + ':yes', d === true) +
            choice('Tentokrát ne', 'mealDecide', it.lever + ':no', d === false) + '</div>' +
            (d === false ? '<div class="choice-row reasons" aria-label="Proč ne">' + NF.DECLINE_REASONS.map(function (r) {
              return choice(r[1], 'mealReason', it.lever + ':' + r[0], reason === r[0]);
            }).join('') + '</div><p class="small muted">Důvod je nepovinný. Pomůže lékaři poznat, jestli je rada nepraktická.</p>' : '') +
            '</li>';
        }).join('') + '</ul>';
      } else if (res.conf.level === 'unknown') {
        out += '<p>K tomuhle jídlu zatím nemám radu. Zapiš ho, ať se můžu učit.</p>';
      } else {
        out += '<p>K tomuhle jídlu teď nemám radu, která by ti podle tvých dat pomohla.</p>';
      }
      out += helpDetails(S, res);
    }
  }

  var ins = m.insulinReported || '';
  out += '<div class="divider"></div><h2' + NF.hook('meal-record') + '>Zápis</h2>' +
    '<label class="field">Popis jídla<textarea data-bind="meal.desc">' + e(m.desc != null ? m.desc : food.name) + '</textarea></label>' +
    '<p class="field-help">Předvyplněný popis můžeš opravit, třeba překlep.</p>' +
    '<fieldset class="choice-field"><legend>Inzulin k tomuto jídlu</legend><div class="choice-row">' +
    [['per-plan', 'Podal jsem podle plánu'], ['none', 'Nepodal jsem'], ['unknown', 'Nevím']].map(function (o) {
      return choice(o[1], 'mealInsulin', o[0], ins === o[0]);
    }).join('') + '</div></fieldset>' +
    (ins === 'per-plan'
      ? '<label class="field">Čas podání<input data-bind="meal.insulinTime" placeholder="07:05" value="' + e(m.insulinTime || '') + '"></label>' +
        '<p class="field-help">Čas uvádíš ty. Nezávislé ověření podání nemáme.</p>'
      : ins === 'unknown' ? hint('Zvolil jsi „nevím“. Záznam uložím, ale do učení ho nezapočítám.') : '') +
    '<div class="actions">' + btn('Uložit jídlo', 'saveMeal', null, 'primary') + btn('Zpět', 'page', 'today', 'secondary') + '</div>';
  return card(out);
};

/* ---------- moje jídla: co už aplikace ví ---------- */
V.foods = function (S) {
  var list = S.foods.filter(function (f) { return NF.foodHistory(S, f.id).eaten > 0; });
  var out = '<p class="eyebrow">Moje jídla</p><h1>Co už o tvých jídlech vím</h1>' +
    '<p class="muted">U každého jídla vidíš, kolikrát jsi ho zapsal a jak jisté je, co z toho plyne.</p>';
  if (!list.length) return card(out + '<div class="empty"><p>Zatím tu nic není. Až zapíšeš první jídlo, uvidíš ho tady.</p></div>');
  out += '<ul class="plain-list food-list"' + NF.hook('foods-list') + '>' + list.map(function (f) {
    var c = NF.confidence(S, f.id), h = c.history;
    var min = c.min || 3;
    var fx = c.level === 'known' ? NF.leverEffects(S, f.id) : [];
    return '<li><strong>' + e(f.name) + '</strong> ' + levelTag(c.level) +
      '<div class="learn-bar"' + NF.hook('foods-learning') + '><span style="width:' + Math.min(100, Math.round(h.usable / min * 100)) + '%"></span></div>' +
      '<p class="small">Zapsáno ' + h.eaten + '×, s úplnými daty ' + h.usable + '× ' +
      (c.level === 'known' ? '— znám ho, s každým dalším záznamem se to zpřesňuje.' : '— potřebuju ' + min + '×, pak ho budu znát.') + '</p>' +
      (c.level === 'known' ? '<p class="small">Obvykle stoupne přibližně o <strong>' + e(NF.mmol(h.typicalRise)) + ' mmol/l</strong>.</p>' : '') +
      (fx.length ? '<p class="small">Co pomohlo: ' + fx.map(function (x) {
        return e(NF.LEVERS[x.lever].label.toLowerCase()) + ' (' + x.n + '×, přibližně ' + e(NF.mmol(x.rise)) + ' mmol/l)';
      }).join('; ') + '.</p>' : '') +
      (c.level === 'similar' ? '<p class="small muted">Podobá se jídlům: ' + e(c.like.map(function (id) { return NF.foodById(S, id).name; }).join(', ')) + '.</p>' : '') +
      '</li>';
  }).join('') + '</ul>';
  var recent = S.episodes.slice(-6).reverse();
  out += '<h2>Poslední zápisy</h2><ul class="plain-list">' + recent.map(function (ep) {
    var st = NF.episodeStatus(ep);
    var acc = (ep.advice || []).filter(function (a) { return a.accepted === true; });
    var dec = (ep.advice || []).filter(function (a) { return a.accepted === false; });
    return '<li><strong>' + e(ep.id + ' · ' + NF.fmtDateTime(ep.at)) + '</strong> ' +
      (NF.usableEpisode(ep) ? tag('počítá se', 'ok') : tag(ep.context === 'illness' ? 'doba nemoci — nepočítá se' : 'chybí údaj — nepočítá se', 'warn')) +
      '<p>' + e(ep.desc) + '</p>' +
      (st.complete ? '' : '<p class="small"><span class="missing">Chybí: ' + e(st.missing.join(', ')) + '.</span></p>') +
      (acc.length ? '<p class="small">Zkusil jsem: ' + e(acc.map(function (a) { return NF.LEVERS[a.lever].label.toLowerCase(); }).join(', ')) + '.</p>' : '') +
      (dec.length ? '<p class="small muted">Tentokrát ne: ' + e(dec.map(function (a) { return NF.LEVERS[a.lever].label.toLowerCase(); }).join(', ')) + '.</p>' : '') +
      (ep.history.length ? '<details><summary>Historie oprav (' + ep.history.length + ')</summary><div>' + ep.history.map(function (x) {
        return '<p class="small">' + e(NF.fmtDateTime(x.at)) + ': „' + e(x.from) + '“ → „' + e(x.to) + '“</p>';
      }).join('') + '</div></details>' : '') +
      '<div class="actions">' + btn('Opravit popis', 'openCorrect', ep.id, 'link') + '</div></li>';
  }).join('') + '</ul>';
  if (S.questions.length) out += '<h2>Otázky uložené ke kontrole</h2><ul class="plain-list">' + S.questions.map(function (q) {
    return '<li><p>' + e(q.text) + '</p><p class="small muted">Uloženo ' + e(NF.fmtDateTime(q.at)) + '. Nebylo odesláno lékaři.</p></li>';
  }).join('') + '</ul>';
  return card(out);
};

V.planScreen = function (S) {
  var p = NF.activePlan(S);
  if (!p) return card('<h1>Plán</h1><p>Plán dosud nebyl vydán.</p>');
  var older = S.plans.filter(function (x) { return x.id !== p.id; });
  var t = NF.taskById(S, p.taskId);
  return card('<p class="eyebrow">Můj plán</p><h1>' + e(p.id + ' ' + p.version) + '</h1>' +
    '<div class="plan-basics">' + kv('Vydal', e(S.doctor.label)) + kv('Účinný od', e(NF.fmtDate(p.effectiveFrom))) +
    kv('Platnost do', e(NF.fmtShort(p.validUntil))) + '</div>' +
    '<h2>Tvoje dávky</h2><p>' + e(p.prescription) + '</p>' +
    '<p class="small muted">NutriFee dávku nepočítá ani nemění.</p>' +
    (t ? '<h2>Úkol</h2><p><strong>' + e(t.title) + '</strong></p><p class="small">' + e(t.conditions) + '</p>' +
      '<p class="rule-line">' + ruleChip(S, t.ruleId + '|' + t.ruleVersion) + '</p>' : '') +
    (older.length ? '<h2>Starší plány</h2><ul class="plain-list">' + older.map(function (x) {
      return '<li><strong>' + e(x.id + ' ' + x.version) + '</strong><p class="small muted">Účinný od ' + e(NF.fmtShort(x.effectiveFrom)) +
        '. Zápisy z tohoto období zůstávají navázané na něj.</p></li>';
    }).join('') + '</ul>' : ''));
};

V.safety = function (S) {
  var sp = S.safetyPlan;
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
      '<div class="actions">' + btn('Uložit otázku ke kontrole', 'saveQuestion', null, 'primary') + '</div>' +
      hint('<strong>Neodesláno lékaři.</strong> Otázka se uloží k tobě a otevřete ji spolu na kontrole. Nikdo na ni teď nečeká.') : '') +
    (b === 'now' ? '<div class="divider"></div>' + hint('<strong>Otevři bezpečnostní a kontaktní plán.</strong> Je to postup od tvého lékaře.') +
      '<div class="actions">' + btn('Otevřít bezpečnostní a kontaktní plán', 'page', 'safety', 'primary') + '</div>' : '') +
    (b === 'ill' ? '<div class="divider"></div><h2>Oznámení nemoci</h2>' +
      '<p>Nemoc oznamuješ ty. Aplikace ji nedetekuje.</p>' +
      (S.illness && S.illness.active
        ? hint('Období nemoci je označené od ' + e(NF.fmtDateTime(S.illness.from)) + '. Úkol je pozastavený a rady k jídlu nedostaneš. ' +
          'Zápisy z této doby se nezapočítávají do učení.', 'warn')
        : '<div class="actions">' + btn('Oznámit nemoc', 'reportIllness', null, 'primary') + '</div>') : '') +
    '<div class="actions">' + btn('Zpět na Dnes', 'page', 'today', 'secondary') + '</div>');
};

V.datastate = function (S) {
  var c = S.dataState.patientCause;
  return card('<p class="eyebrow">Stav dat</p><h1>V NutriFee chybí novější hodnoty</h1>' +
    '<p>Poslední hodnota, kterou tu máme, je z <strong>' + e(NF.fmtDateTime(S.dataState.lastValueAt)) + '</strong>.</p>' +
    '<fieldset class="choice-field"' + NF.hook('datastate-cause') + '><legend>Co vidíš ty v systému výrobce senzoru?</legend><div class="choice-row">' +
    [['vendor-ok', 'Výrobce senzoru hodnoty ukazuje'], ['broken', 'Senzor nefunguje'], ['unknown', 'Nevím']].map(function (x) {
      return choice(x[1], 'setCause', x[0], c === x[0]);
    }).join('') + '</div></fieldset>' +
    (c === 'vendor-ok' ? hint('<strong>Chybí data jen nám.</strong> NutriFee popisuje pouze absenci vlastních dat. Tvůj senzor a jeho akutní upozornění tím nekomentujeme.') : '') +
    (c === 'broken' ? hint('<strong>Náhradní postup podle tvého plánu.</strong> Řiď se bezpečnostním a kontaktním plánem. Technickou pomoc se senzorem řeší podpora výrobce, ne ordinace.' +
      '<div class="actions">' + btn('Otevřít bezpečnostní plán', 'page', 'safety', 'secondary') + '</div>') : '') +
    (c === 'unknown' ? hint('<strong>Příčinu neurčujeme.</strong> Zaznamenali jsme jen, že novější data v NutriFee nejsou. Nepíšeme, že je senzor rozbitý.') : '') +
    '<p class="small muted">Chybějící body zůstanou mezerou. Nedopočítáváme je ani zpětně a záznam s mezerou se nezapočítá do učení.</p>' +
    '<div class="actions">' + btn('Zpět na Dnes', 'page', 'today', 'secondary') + '</div>');
};

V.preview = function (S) {
  var p = NF.activePlan(S);
  var o = NF.adviceOutcome(S, p && p.id);
  var c = NF.countEpisodes(S);
  var q = S.questions.length ? S.questions[S.questions.length - 1].text : '';
  return card('<p class="eyebrow">Náhled před kontrolou</p><h1>Co uvidí lékař</h1>' +
    '<p class="muted">Tohle uvidí tvůj lékař na kontrole ' + e(S.nextVisit ? NF.fmtDate(S.nextVisit) : '') + '. Nic z toho se mu neodesílá předem.</p>' +
    '<div class="review-facts"' + NF.hook('preview-summary') + '>' +
    '<div>' + kv('Zapsaná jídla', String(c.recorded)) + '</div>' +
    '<div>' + kv('Rady, které jsem zkusil', String(o.accepted.n)) + '</div>' +
    '<div>' + kv('Rady, které jsem nechal být', String(o.declined.n)) + '</div></div>' +
    '<p class="small muted">Lékař uvidí, co se zkusilo a jak to dopadlo. Neuvidí hodnocení, jestli jsi „poslechl“.</p>' +
    '<label class="field">Moje hlavní otázka na kontrolu<textarea data-bind="form.question">' +
    e((S.form && S.form.question != null) ? S.form.question : q) + '</textarea></label>' +
    '<div class="actions">' + btn('Uložit otázku', 'saveQuestion', null, 'primary') + btn('Moje jídla', 'page', 'foods', 'secondary') + '</div>' +
    hint('Údaje o podání inzulinu jsou tvoje záznamy, ne nezávislé ověření.'));
};

V.newPlan = function (S) {
  var p = NF.activePlan(S);
  var prev = p && p.previousId ? NF.planById(S, p.previousId) : null;
  if (!p) return card('<h1>Nový plán</h1><p>Zatím žádný nový plán nebyl vydán.</p>');
  var t = NF.taskById(S, p.taskId);
  var pt = prev ? NF.taskById(S, prev.taskId) : null;
  var same = t && pt && t.catalogId === pt.catalogId;
  return card('<p class="eyebrow">Nový plán</p><h1>' + e(p.id + ' ' + p.version) + '</h1>' +
    '<div class="plan-basics">' + kv('Vydal', e(S.doctor.label)) + kv('Účinný od', e(NF.fmtDate(p.effectiveFrom))) + '</div>' +
    '<h2>Co se změnilo</h2>' +
    '<div class="plan-changes"' + NF.hook('newplan-diff') + '>' +
    '<p><strong>Dávky beze změny.</strong> Stejné jako v ' + e(prev ? prev.id : 'předchozím plánu') + '.</p>' +
    (t ? '<p><strong>' + (same ? 'Úkol pokračuje:' : 'Nový úkol:') + '</strong> ' + e(t.title) + '</p><p class="small">' + e(t.conditions) + '</p>' : '') +
    (p.reviewReason ? '<p><strong>Proč:</strong> ' + e(p.reviewReason) + '</p>' : '') +
    (S.nextVisit ? '<p><strong>Další kontrola:</strong> ' + e(NF.fmtDate(S.nextVisit)) + '.</p>' : '') + '</div>' +
    '<p class="small muted">Co už aplikace o tvých jídlech ví, zůstává. Starší zápisy zůstávají navázané na ' + e(prev ? prev.id : 'původní plán') + '.</p>' +
    (p.understood
      ? hint('Plán je převzatý.', 'success') + '<div class="actions">' + btn('Přejít na Dnes', 'page', 'today', 'primary') + '</div>'
      : '<div class="actions">' + btn('Potvrzuji převzetí', 'confirmUnderstanding', null, 'primary') + '</div>'));
};

V.edgeScreen = function (S) {
  var D = global.NutriFeeDemo;
  var item = D && S.edge ? D.edgeCases.filter(function (x) { return x.id === S.edge; })[0] : null;
  if (!item) return card('<h1>Okrajové situace</h1><p>Žádná situace není zapnutá.</p>' +
    '<div class="actions">' + btn('Zpět na Dnes', 'page', 'today', 'secondary') + '</div>');
  return card('<div' + NF.hook('edge-case') + '><p class="eyebrow">Okrajová situace</p><h1>' + e(item.title) + '</h1>' +
    '<p>' + e(item.answer) + '</p>' +
    '<div class="next-step"><strong>Co se změnilo, co lze dál dělat a kdo řeší další krok</strong>' +
    '<p>Změna je zaznamenaná v této demonstraci. Úkoly a rady odpovídají popsanému stavu. Další krok řeší role uvedená v textu — aplikace nikomu nic neodesílá.</p></div>' +
    '<div class="actions">' + btn('Zpět na Dnes', 'page', 'today', 'secondary') + '</div></div>');
};

})(typeof window !== 'undefined' ? window : globalThis);
