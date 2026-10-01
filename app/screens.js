/* Obrazovky pacienta (mobil). Podle 15-ZDROJ-PRAVDY-MAKETA.md.
   Každá obrazovka: jedno primární tlačítko, „co teď“ vždy vidět, detaily až po rozbalení. */
(function (global) {
'use strict';
var NF = global.NutriFee;
var e = NF.esc, V = {};
NF.screens = V;

/* ---------- stavební prvky ---------- */
function btn(label, action, value, cls, extra) {
  return '<button type="button" class="btn ' + (cls || '') + '" data-action="' + e(action) + '"' +
    (value != null ? ' data-value="' + e(value) + '"' : '') + (extra || '') + '>' + label + '</button>';
}
function choice(label, action, value, on, cls) {
  return '<button type="button" class="choice ' + (on ? 'chosen ' : '') + (cls || '') + '" data-action="' + e(action) + '" data-value="' + e(value) + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + label + '</button>';
}
function hint(text, kind) { return '<div class="hint ' + (kind || '') + '">' + text + '</div>'; }
function kv(k, v) { return '<div class="kv"><span>' + e(k) + '</span><strong>' + v + '</strong></div>'; }
function tag(text, kind) { return '<span class="tag ' + (kind || '') + '">' + e(text) + '</span>'; }
function glass(body, cls) { return '<section class="glass ' + (cls || '') + '">' + body + '</section>'; }
function card(body, cls) { return '<section class="card ' + (cls || '') + '">' + body + '</section>'; }
/* Štítek schválené položky registru. Klepnutí otevře vysvětlení. */
function appr(S, id) {
  var r = NF.item(S, id);
  if (!r) return '';
  var cls = r.status === 'rejected' ? 'rej' : r.status === 'edited' ? 'edit' : '';
  return '<button type="button" class="appr ' + cls + '" data-action="openItem" data-value="' + e(id) + '" title="' + e(r.title) + '">' + (r.status === 'rejected' ? '✕' : '✓') + ' ' + e(r.title) + '</button>';
}
V.btn = btn; V.choice = choice; V.hint = hint; V.kv = kv; V.tag = tag; V.card = card; V.glass = glass; V.appr = appr;

var LEVEL = { known: ['ZNÁMÉ JÍDLO', 'known'], similar: ['PODOBNÉ JÍDLO', 'similar'], unknown: ['NEZNÁMÉ JÍDLO', 'unknown'], none: ['BEZ VYHODNOCENÍ', 'unknown'] };
function levelTag(level) { var l = LEVEL[level] || LEVEL.unknown; return tag(l[0], l[1]); }
function reactionTag(r) { return r ? tag(r.label, r.cls) : ''; }
V.levelTag = levelTag; V.reactionTag = reactionTag;

var EMOJI = { brambory: '🍽', ryze: '🍚', testoviny: '🍝', knedlik: '🥟', pecivo: '🥪', bez: '🥗' };
function emoji(food) { return food.emoji || EMOJI[(food.tags || {}).side] || '🍽'; }
function ring(n, total) {
  total = total || 3; var arcs = '', seg = 170 / total, gap = 8;
  for (var i = 0; i < total; i++) {
    arcs += '<circle cx="31" cy="31" r="27" stroke="' + (i < n ? 'var(--brand)' : '#dfe6ea') + '" stroke-dasharray="' + (seg - gap) + ' 170" stroke-dashoffset="' + (-i * seg) + '"/>';
  }
  return '<svg viewBox="0 0 62 62" aria-hidden="true">' + arcs + '</svg>';
}
function foodIcon(S, food, conf) {
  var n = Math.min(conf.min || 3, conf.st.n);
  return '<div class="emoji">' + ring(n, conf.min || 3) + e(emoji(food)) + (conf.level === 'known' ? '<span class="ck">✓</span>' : '') + '</div>';
}
V.emoji = emoji;

/* Rozmezí vrcholů jako okno na stupnici zelená → červená (osa 4–16). */
function pos(v) { return Math.max(0, Math.min(100, (v - 4) / 12 * 100)); }
function rowTrack(label, lo, hi, cls, wide) {
  if (lo == null || hi == null) return '';
  var l = pos(lo), r = pos(hi);
  return '<div class="row ' + (cls || '') + '"><span class="rl">' + e(label) + '</span><div class="track' + (wide ? ' wide' : '') + '">' +
    '<div class="dim" style="left:0;width:' + l + '%"></div><div class="dim" style="left:' + r + '%;right:0"></div>' +
    '<div class="win" style="left:' + l + '%;width:' + Math.max(2, r - l) + '%"><b class="l">' + e(NF.mmol(lo)) + '</b><b class="r">' + e(NF.mmol(hi)) + '</b></div></div></div>';
}
var LEVER_WITH = { addon: 's doplňkem', order: 's pořadím', walk: 's procházkou' };
function peakBlock(S, food, conf) {
  var t = NF.targets(S), st = conf.st;
  var rows = '', note = '', inT = '';
  if (conf.level === 'known') {
    var base = NF.baseStats(S, food.id, conf.meal);
    var best = NF.leverStats(S, food.id, conf.meal)[0];
    inT = '<span class="in ' + (conf.reaction ? 'tag ' + conf.reaction.cls : '') + '">' + st.inTarget + ' z ' + st.n + ' v cíli</span>';
    rows += rowTrack(best ? 'bez rady' : 'obvykle', base.n ? base.lo : st.lo, base.n ? base.hi : st.hi);
    if (best) rows += rowTrack(LEVER_WITH[best.lever] || 's radou', best.st.lo, best.st.hi, 'adv');
    var half = st.peaks.slice(0, Math.ceil(st.peaks.length / 2));
    var prev = st.peaks.length > 6 ? { lo: NF.r1(NF.quantile(half, 0.1)), hi: NF.r1(NF.quantile(half, 0.9)) } : null;
    note = 'Vlevo od čáry jsi v cíli. ' + (best ? 'S ' + LEVER_WITH[best.lever].slice(2) + ' skončíš <b>' + best.st.inTarget + ' z ' + best.st.n + '</b> v cíli. ' : '') +
      'Rozmezí z ' + st.n + ' započítaných zápisů' + (prev && (prev.lo !== st.lo || prev.hi !== st.hi) ? '; po prvních ' + half.length + ' bylo ' + e(NF.mmol(prev.lo)) + '–' + e(NF.mmol(prev.hi)) + ' — zpřesňuje se.' : '.');
  } else if (conf.level === 'similar') {
    inT = '<span class="in tag info">odhad z podobných</span>';
    rows += rowTrack('podobná jídla', conf.pool.lo, conf.pool.hi, '', true);
    note = 'Tohle jídlo u tebe ještě neznáme. Rozmezí je z ' + conf.pool.n + ' zápisů jídel se stejnou přílohou a přípravou (' + e(conf.like.map(function (f) { return f.name; }).slice(0, 2).join(', ')) + '). S každým tvým zápisem se zúží.';
  } else return '';
  return '<div class="peak"><div class="lbl"><span>Kam se po něm glukóza dostane</span>' + inT + '</div>' +
    '<div class="rows"><div class="goal" style="left:calc(72px + (100% - 72px) * ' + (pos(t.high) / 100) + ')"><span>hranice cíle ' + e(NF.mmol(t.high)) + '</span></div>' + rows + '</div>' +
    '<div class="axis"><span>4</span><span>7</span><span>10</span><span>13</span><span>16</span></div>' +
    '<div class="note">' + note + '</div></div>';
}
V.peakBlock = peakBlock;

/* ---------- navigace ---------- */
function tabbar(S) {
  var items = [['today', 'Dnes', '⌂'], ['foods', 'Jídla', '🍽'], ['plan', 'Plán', '▤'], ['safety', 'Bezpečí', '🛡']];
  return '<nav class="glass tabbar" aria-label="Hlavní nabídka">' + items.map(function (it) {
    return '<button type="button" data-action="page" data-value="' + it[0] + '" class="' + (S.page === it[0] ? 'active' : '') + '"' + (S.page === it[0] ? ' aria-current="page"' : '') + '><span class="ic" aria-hidden="true">' + it[2] + '</span>' + e(it[1]) + '</button>';
  }).join('') + '</nav>';
}
V.patient = function (S, forcedPage) {
  var page = forcedPage || S.page, body;
  var p = NF.activePlan(S);
  if (!forcedPage && p && !p.understood && ['takeover', 'understand', 'newplan'].indexOf(page) < 0) page = p.previousId ? 'newplan' : 'takeover';
  switch (page) {
    case 'takeover': body = V.takeover(S); break;
    case 'understand': body = V.understand(S); break;
    case 'meal': body = V.meal(S); break;
    case 'foods': body = V.foods(S); break;
    case 'plan': body = V.planScreen(S); break;
    case 'safety': body = V.safety(S); break;
    case 'preview': body = V.preview(S); break;
    case 'newplan': body = V.newPlan(S); break;
    default: body = V.today(S);
  }
  var nav = ['understand', 'takeover', 'meal', 'newplan'].indexOf(page) === -1;
  return '<div class="patient-shell"><div class="patient">' + body + '</div>' + (nav ? tabbar(S) : '') + '</div>';
};

function head(S, eyebrow, h1) { return '<p class="eyebrow">' + e(eyebrow) + '</p><h1>' + e(h1) + '</h1>'; }
function greeting(S) { var h = NF.parse(S.clock).getHours(); return h < 10 ? 'Dobré ráno' : h < 18 ? 'Dobrý den' : 'Dobrý večer'; }
function mealNow(S) { var d = NF.parse(S.clock), h = d.getHours() + d.getMinutes() / 60; return h < NF.DAYPART_END.breakfast ? 'breakfast' : h < NF.DAYPART_END.lunch ? 'lunch' : 'dinner'; }
V.mealNow = mealNow;

/* ---------- převzetí a ověření ---------- */
V.takeover = function (S) {
  var p = NF.activePlan(S);
  if (!p) return head(S, 'V ordinaci', 'Plán zatím nemáš') + glass('<p>Lékař s tebou právě prochází zařazení. Až ti plán vydá, uvidíš ho tady.</p>');
  var habits = S.habits.filter(function (h) { return h.planId === p.id; });
  return head(S, 'V ordinaci · předání plánu', 'Tvůj plán ' + p.id) +
    glass('<div class="now"><span class="ic">👉</span><div><b>Co teď</b>Projdi si dávky a návyky. Pak klepni dole na „Plán jsem převzal“ a odpovíš na jednu otázku.</div></div>') +
    goalCard(S) +
    glass('<h2>Tvoje dávky inzulinu</h2>' + dosesTable(p) + '<p class="small muted">Určil je lékař. My je jen připomínáme a ptáme se, jestli sis píchl. Nikdy je nepočítáme ani neměníme.</p>') +
    glass('<h2>Tvoje návyky</h2><ul class="plain">' + habits.map(function (h) { return '<li><b>' + e(h.title) + '</b><br><span class="small muted">' + e(h.why) + '</span></li>'; }).join('') + '</ul>') +
    glass('<h2>Osobní pokyny od lékaře</h2><p class="small muted">Najdeš je kdykoli v části Bezpečí. Platí i bez připojení.</p>' + instructionsList(S, p, true)) +
    hint('<b>Hranice služby.</b> NutriFee tě průběžně nesleduje a nic neposílá do ordinace. Na nízkou či vysokou glukózu tě upozorňuje aplikace tvého senzoru.', 'sand') +
    '<div class="actions">' + btn('Plán jsem převzal →', 'page', 'understand', 'primary big') + '</div>';
};
V.understand = function (S) {
  var a = S.onboarding.checkAnswer, trained = !!(S.training && S.training.result === 'done');
  return head(S, 'V ordinaci · jedna otázka', 'Uvidí lékař můj zápis hned?') +
    glass('<p class="muted">Za odpověď tě nikdo nehodnotí. Jen si ověříme, že víš, jak aplikace funguje.</p>' +
      '<div class="choice-row">' + choice('Ano, hned', 'answerCheck', 'yes', a === 'yes', 'big') + choice('Ne, až na kontrole', 'answerCheck', 'no', a === 'no', 'big') + '</div>' +
      (a === 'yes' ? hint('<b>Ještě ne.</b> Zápis <b>není zpráva do ordinace</b> — nikdo ho průběžně nečte. Lékař ho uvidí až v reportu na kontrole. Když máš potíže teď, otevři Bezpečí.', 'warn') : '') +
      (a === 'no' ? hint('<b>Přesně tak.</b> Zápisy slouží tobě a rozhovoru na kontrole. S potížemi teď pomůže Bezpečí, s technikou technická podpora.', 'ok') : '')) +
    '<div class="actions">' + btn('Hotovo — začínám', 'confirmUnderstanding', null, 'primary big', a === 'no' && trained ? '' : ' disabled') + '</div>' +
    (a !== 'no' ? '<p class="small muted" style="text-align:center">Tlačítko se odemkne správnou odpovědí.</p>' : !trained ? hint('<b>Zaučení u sestry nebylo dokončeno.</b> Návyky zatím nezačnou platit. Domluvte se se sestrou na novém zaučení.', 'warn') : '');
};

function dosesTable(p) {
  var d = p.doses;
  return '<div>' + NF.MEALS.map(function (m) { return kv(NF.mealLabel(m[0], true), '<b>' + d[m[0]].units + ' j.</b>'); }).join('') + '<div class="kv basal-kv"><span>🌙 Bazál na noc · ' + e(d.basal.time) + '</span><strong><b>' + d.basal.units + ' j.</b></strong></div></div>';
}
V.dosesTable = dosesTable;
function instructionsList(S, p, compact) {
  var D = global.NutriFeeDemo, cat = (D && D.instructionCatalog) || [];
  var list = (p && p.instructions) || [];
  if (!list.length) return '<p class="small muted">Lékař zatím pokyny nezadal.</p>';
  return '<ul class="plain">' + list.map(function (i) {
    var c = cat.filter(function (x) { return x.id === i.id; })[0] || { title: i.id, text: '' };
    var txt = (c.text || '').replace('{v}', '<b>' + e(String(i.value).replace('.', ',')) + (c.unit ? ' ' + e(c.unit) : '') + '</b>');
    return '<li><b>' + e(c.title) + '</b><br><span class="small' + (compact ? ' muted' : '') + '">' + txt + '</span></li>';
  }).join('') + '</ul>';
}
V.instructionsList = instructionsList;

/* ---------- zpětná vazba: výsledek, milník, týden, cesta ke kontrole (15, odst. 7b) ---------- */
function goalCard(S) {
  var T = NF.texts(S, 'S-CESTA'); if (!T || !T.goal) return '';
  return glass('<h2>Cíl do kontroly</h2><p>' + T.goal + '</p>', 'soft');
}
function resultCard(S) {
  var r = NF.lastResult(S); if (!r) return '';
  var ic = r.key === 'okAdvice' || r.key === 'okPlain' ? '🌟' : r.key === 'nodata' ? '📡' : '📊';
  return glass('<div class="now"><span class="ic">' + ic + '</span><div><b>Jak to dopadlo</b>' + r.text +
    '<div class="actions" style="margin-top:10px">' + btn('Rozumím', 'resultSeen', r.ep.id, 'sm') + btn('Zobrazit jídlo', 'openFood', r.food.id, 'quiet sm') + '</div></div></div>' +
    '<div class="small" style="margin-top:6px">' + appr(S, 'S-VYSLEDEK') + '</div>', 'result');
}
function milestoneCard(S) {
  var m = NF.pendingMilestone(S); if (!m) return '';
  return glass('<div class="now"><span class="ic">🎉</span><div><b>Milník</b>' + m.text +
    '<div class="actions" style="margin-top:10px">' + btn('Zavřít', 'milestoneClose', m.id, 'sm') + '</div></div></div>' +
    '<div class="small" style="margin-top:6px">' + appr(S, 'R-MILNIKY') + '</div>', 'milestone');
}
function weekCard(S) {
  var w = NF.weekSummary(S), T = NF.texts(S, 'S-TYDEN'); if (!w || !T) return '';
  var lines = [NF.fillText(T.meals, { meals: w.meals, usual: w.usual })];
  if (w.best) lines.push(NF.fillText(T.helped, { lever: NF.LEVERS[w.best.lever].label, k: w.best.k, n: w.best.n }));
  if (w.milestones.length) lines.push(T.milestone ? NF.fillText(T.milestone, { n: w.milestones.length }) + ' ' + e(w.milestones[w.milestones.length - 1].text.replace(/<[^>]+>/g, '')) : '');
  if (w.suggest) lines.push(NF.fillText(T.suggest, { food: w.suggest.food, lever: NF.leverNoun(w.suggest.lever), k: w.suggest.k, n: w.suggest.n }));
  lines.push(T.thanks || '');
  return glass('<div class="now"><span class="ic">📅</span><div><b>' + e(NF.fillText(T.head, { week: w.week })) + '</b>' + lines.filter(Boolean).map(function (l) { return '<p style="margin:4px 0">' + l + '</p>'; }).join('') +
    '<div class="actions" style="margin-top:10px">' + btn('Zavřít', 'weekClose', w.id, 'sm') + '</div></div></div>' +
    '<div class="small" style="margin-top:6px">' + appr(S, 'S-TYDEN') + '</div>', 'week');
}
function pathCard(S, withPreview) {
  var ps = NF.pathStats(S), T = NF.texts(S, 'S-CESTA'); if (!ps || !T) return '';
  var pct = Math.round(ps.gone / ps.total * 100);
  return glass('<div style="display:flex;justify-content:space-between;font-weight:800"><span>Cesta ke kontrole</span><span class="muted" style="font-weight:600">' + e(NF.fmtShort(ps.visit)) + '</span></div>' +
    '<div class="bar" aria-hidden="true"><span style="width:' + pct + '%"></span></div>' +
    '<div class="small muted">Do kontroly ' + ps.left + ' ' + (ps.left === 1 ? 'den' : ps.left >= 2 && ps.left <= 4 ? 'dny' : 'dní') + ' · ' + ps.week + '. týden plánu</div>' +
    '<div class="row3"><div><b>' + ps.known + ' z ' + ps.repeated + '</b><span class="tiny muted">známých jídel<br>z těch, co jíš opakovaně</span></div>' +
    '<div><b>' + ps.weekMeals + ' z ' + ps.weekSlots + '</b><span class="tiny muted">jídel zapsáno<br>tento týden</span></div>' +
    '<div><b>' + ps.weekConfirmed + ' z ' + ps.weekMeals + '</b><span class="tiny muted">inzulin potvrzen<br>tento týden</span></div></div>' +
    '<p class="small muted" style="margin:10px 0 0">' + T.visit + '</p>' +
    (withPreview ? '<div class="actions" style="margin-top:10px">' + btn('Co uvidí lékař →', 'page', 'preview', 'sm') + '</div>' : '') +
    '<div class="small" style="margin-top:6px">' + appr(S, 'S-CESTA') + '</div>', 'path');
}
function soonCard(S) {
  var ps = NF.pathStats(S); if (!ps || ps.left > 7) return '';
  return glass('<div class="now"><span class="ic">🩺</span><div><b>' + (ps.left === 0 ? 'Dnes jdeš na kontrolu' : 'Za ' + ps.left + ' ' + (ps.left === 1 ? 'den' : ps.left <= 4 ? 'dny' : 'dní') + ' jdeš na kontrolu') + '</b>Podívej se, co uvidí lékař, a vyber otázky, které si chceš vzít s sebou.' +
    '<div class="actions" style="margin-top:10px">' + btn('Co uvidí lékař →', 'page', 'preview', 'primary sm') + '</div></div></div>', 'soft');
}
V.pathCard = pathCard;

/* ---------- Dnes ---------- */
function todayEpisodes(S) { return S.episodes.filter(function (x) { return NF.day(x.at) === NF.day(S.clock); }); }
function basalToday(S) { return S.basalLog.filter(function (b) { return b.date === NF.day(S.clock); })[0]; }
V.today = function (S) {
  var p = NF.activePlan(S);
  var out = '<div style="margin:0 4px 6px"><span class="demo-flag">DEMO · syntetická data · není určeno pro léčbu</span></div>' +
    head(S, NF.fmtDayDate(S.clock), greeting(S));
  if (!p) return out + glass('<h2>Zatím nemáš plán</h2><p>Až ti ho lékař v ordinaci vydá, uvidíš tady, co dělat.</p>');
  if (S.participation !== 'active') return out + glass('<h2>Účast je ukončená</h2><p>Návyky, rady i připomínky jsou zastavené. Tvoje zápisy zůstávají uložené.</p>');
  var ill = S.illness && S.illness.active;
  var fm = NF.focusMeal(S), meal = fm ? fm.meal : mealNow(S), dose = p.doses[meal], hour = NF.parse(S.clock).getHours();
  var eaten = !fm || fm.state === 'done';
  var basalHour = Number(String(p.doses.basal.time).split(':')[0]) || 21;
  var basal = basalToday(S), basalTime = hour >= basalHour - 2;
  var yday = NF.day(NF.addDays(S.clock, -1)), askYesterday = NF.day(p.effectiveFrom) <= yday && !S.basalLog.some(function (b) { return b.date === yday; });
  var ask = S.ask && S.ask.day === NF.day(S.clock) ? S.ask : null;

  if (ill) {
    var ci = S.illness.checkins.filter(function (c) { return NF.day(c.at) === NF.day(S.clock); })[0];
    out += glass('<div class="now"><span class="ic">🤒</span><div><b>Jsi nemocný — pomáháme jinak</b>Zapisuj jídla dál, k množství jídla ale neradíme. Tvoje dávky inzulinu platí, jak řekl lékař. Níže máš jeho pokyny pro nemoc.' +
      (ci ? '<br><span class="small muted">Dnes už jsi odpověděl. Zeptáme se zase zítra.</span>' : '<div class="choice-row" style="margin-top:10px">' + choice('Už je mi lépe', 'illnessCheck', 'better', false) + choice('Ještě ne', 'illnessCheck', 'same', false) + '</div>') + '</div></div>', 'soft') +
      glass('<h2>Pokyny lékaře pro nemoc</h2>' + instructionsList(S, p, false));
  }
  /* zpětná vazba: výsledek posledního jídla, pak nejvýš jedna karta milníku nebo týdne (bezpečí má přednost, proto až za nemocí) */
  out += resultCard(S);
  var msCard = milestoneCard(S); out += msCard || weekCard(S);

  var slots = NF.daySlots(S), verb = { breakfast: 'snídal', lunch: 'obědval', dinner: 'večeřel' };
  var now;
  if (fm && fm.state === 'now') now = { ic: '👉', b: 'Co teď', t: 'Na řadě je ' + e(NF.mealLabel(meal)) + '. Až se budeš chystat jíst, klepni na „Chystám se jíst“ — připomeneme inzulin a poradíme.<br><span class="small muted">Už jsi ' + e(verb[meal]) + '? Klepni na „Už jsem jedl“ a doptáme se.</span>' };
  else if (basalTime && !basal) now = { ic: '💉', b: 'Čas na bazál', t: 'Lékař ti předepsal <b>' + p.doses.basal.units + ' j.</b> ve ' + e(p.doses.basal.time) + '. Až si píchneš, klepni níže.' };
  else if (fm && fm.state === 'missed') now = null; /* místo karty „co teď“ otázka na minulost */
  else now = { ic: '✅', b: 'Dnešní jídla jsou zapsaná', t: 'Další věc na tebe čeká až ' + (basalTime ? 'zítra ráno' : 'večer u bazálu') + '.' };
  if (now) out += glass('<div class="now"><span class="ic">' + now.ic + '</span><div><b>' + e(now.b) + '</b>' + now.t + '</div></div>');
  out += soonCard(S);
  /* tři sloty dne */
  out += glass('<div style="display:flex;gap:8px">' + slots.map(function (sl) {
    var ic = sl.state === 'done' ? '✓' : sl.state === 'skipped' ? '—' : sl.state === 'missed' ? '?' : '·';
    var cls = sl.state === 'done' ? 'ok' : sl.state === 'skipped' ? '' : sl.state === 'missed' ? 'warn' : 'info';
    return '<div style="flex:1;text-align:center"><span class="tag ' + cls + '" style="width:100%;justify-content:center">' + ic + ' ' + e(NF.mealLabel(sl.meal, true)) + '</span><div class="tiny muted" style="margin-top:4px">' + (sl.state === 'done' ? 'zapsáno' : sl.state === 'skipped' ? 'vynecháno' : sl.state === 'missed' ? 'chybí zápis' : sl.meal === meal ? 'na řadě' : 'později') + '</div></div>';
  }).join('') + '</div>');
  /* prázdný slot, který už minul: doptat se na minulost */
  if (fm && fm.state === 'missed') {
    var a = ask && ask.meal === meal ? ask : null;
    out += glass('<div class="now"><span class="ic">🕙</span><div><b>' + e(verb[meal].charAt(0).toUpperCase() + verb[meal].slice(1)) + ' jsi dnes?</b>K ' + e(NF.mealLabel(meal, 'dat')) + ' nemáme zápis. Dej nám vědět, co bylo — zabere to tři klepnutí.' +
      '<div class="choice-row" style="margin-top:10px">' + choice('Ano, ' + e(verb[meal]) + ' jsem', 'mealRetro', meal, false, 'big') + choice('Ne, vynechal jsem', 'mealSkipAsk', meal, !!a, 'big') + '</div>' +
      (a ? '<div style="margin-top:12px"><b>Píchl sis k ' + e(NF.mealLabel(meal, 'dat')) + ' inzulin?</b><div class="choice-row" style="margin-top:6px">' + choice('Ano, ' + dose.units + ' j.', 'mealSkip', meal + ':as', false) + choice('Ano, jinak', 'mealSkip', meal + ':other', false) + choice('Ne', 'mealSkip', meal + ':none', false) + '</div><p class="small muted" style="margin-top:6px">Když sis píchl a nejedl, řiď se pokynem lékaře „snědl jsem méně“ v části Bezpečí.</p></div>' : '') + '</div></div>', 'soft');
  }
  var sk = (S.skipped && S.skipped[NF.day(S.clock)]) || {};
  NF.MEALS.forEach(function (mm) { var i = sk[mm[0]]; if (i && (i.insulin === 'as' || i.insulin === 'other')) out += hint('<b>Vynechal jsi ' + e(mm[1]) + ', ale inzulin sis píchl.</b> Postupuj podle pokynu lékaře „snědl jsem méně“ a sleduj glukózu. Tohle není rada aplikace, ale pokyn od lékaře.', 'warn'); });

  if (askYesterday) out += glass('<div class="now"><span class="ic">🌙</span><div><b>Píchl sis včera večer bazál?</b>Záznam ze včerejška chybí. Lékař předepsal ' + p.doses.basal.units + ' j. ve ' + e(p.doses.basal.time) + '.' +
    '<div class="choice-row" style="margin-top:8px">' + choice('Ano, ' + p.doses.basal.units + ' j.', 'basalYesterday', 'as', false) + choice('Ne', 'basalYesterday', 'none', false) + choice('Nevím', 'basalYesterday', 'unknown', false) + '</div></div></div>', 'soft');
  if (basalTime && !basal) {
    out += glass('<div class="insulin"><div class="ic">💉</div><div><b>Bazál · ' + p.doses.basal.units + ' j. · ' + e(p.doses.basal.time) + '</b><small>Předepsal lékař</small></div></div>' +
      '<div class="choice-row" style="margin-top:12px">' + choice('Píchl jsem si ' + p.doses.basal.units + ' j.', 'basalConfirm', 'as', false, 'big') + choice('Jinak', 'basalOther', null, !!S.basalOther, 'big') + '</div>' +
      (S.basalOther ? '<div class="actions"><div class="stepper">' + btn('−', 'basalUnits', '-1', '', ' aria-label="méně"') + '<span class="val">' + (S.basalUnits != null ? S.basalUnits : p.doses.basal.units) + ' j.<small>předepsáno ' + p.doses.basal.units + '</small></span>' + btn('+', 'basalUnits', '1', '', ' aria-label="více"') + '</div>' + btn('Uložit', 'basalConfirm', 'other', 'primary') + btn('Nepíchl jsem si', 'basalConfirm', 'none', 'quiet') + '</div>' : ''));
  } else if (basal && basalTime) {
    out += glass('<div class="insulin"><div class="ic">✅</div><div><b>Bazál potvrzen · ' + (basal.units != null ? basal.units + ' j.' : 'nepodán') + '</b><small>' + e(basal.time) + ' · ' + e(NF.INSULIN[basal.confirmed]) + '</small></div></div>');
  } else if (dose && fm && fm.state === 'now') {
    out += glass('<div class="insulin"><div class="ic">💉</div><div><b>Inzulin k ' + e(NF.mealLabel(meal, 'dat')) + ' · ' + dose.units + ' j.</b><small>Předepsal lékař · zeptáme se před jídlem</small></div><span class="chip">brzy</span></div>');
  }
  if (fm && fm.state === 'missed') out += '';
  else if (!eaten) out += '<div class="actions" style="margin:4px 0 14px">' + btn('🍽 Chystám se jíst', 'startMeal', meal, 'primary big') + '</div>' +
    '<div class="actions" style="margin:-6px 0 14px;justify-content:center">' + btn('Už jsem ' + e(verb[meal]), 'mealRetro', meal, 'quiet') + btn('Vynechal jsem', 'mealSkipAsk', meal, 'quiet') + '</div>' +
    (ask && ask.meal === meal ? glass('<b>Píchl sis k ' + e(NF.mealLabel(meal, 'dat')) + ' inzulin?</b><div class="choice-row" style="margin-top:6px">' + choice('Ano, ' + dose.units + ' j.', 'mealSkip', meal + ':as', false) + choice('Ano, jinak', 'mealSkip', meal + ':other', false) + choice('Ne', 'mealSkip', meal + ':none', false) + '</div>') : '');
  else out += '<div class="actions" style="margin:4px 0 14px">' + btn('🍎 Svačina · bez inzulinu k jídlu', 'startMeal', 'snack', 'big') + '</div>';
  if (!eaten) out += '<div class="actions" style="margin:-8px 0 14px;justify-content:center">' + btn('🍎 Zapsat svačinu', 'startMeal', 'snack', 'quiet') + '</div>';

  var habits = NF.activeHabits(S);
  if (habits.length) {
    var todayEps = todayEpisodes(S);
    var done = 0, rows = habits.map(function (h) {
      var ok = habitDone(S, h, todayEps, basal); if (ok) done++;
      return '<div class="habit"><span class="mark ' + (ok ? '' : 'todo') + '">' + (ok ? '✓' : '') + '</span><div>' + e(h.short || h.title) + '<small>' + e(habitProgress(S, h, todayEps, basal)) + '</small></div></div>';
    }).join('');
    out += glass('<div style="display:flex;justify-content:space-between;font-weight:800;margin-bottom:8px"><span>Moje návyky dnes</span><span class="muted" style="font-weight:600">' + done + ' / ' + habits.length + '</span></div>' + rows +
      '<details class="more" style="margin-top:10px"><summary>Proč právě tyhle návyky</summary><ul class="plain small">' + habits.map(function (h) { return '<li><b>' + e(h.title) + '</b><br>' + e(h.why) + '</li>'; }).join('') + '</ul></details>');
  }
  out += pathCard(S, false);
  if (!ill) out += glass('<div class="sick">🤒 Jsem nemocný <button type="button" class="toggle" data-action="illness" data-value="on" aria-label="Označit nemoc"></button></div>' +
    '<details class="more" style="margin-top:8px"><summary>Co se stane</summary><p class="small muted">Zapisovat můžeš dál, ale k množství jídla neradíme a zápisy z nemoci se do učení nepočítají. Ukážeme ti pokyny lékaře pro nemoc. Každý den se zeptáme, jestli je ti lépe.</p></details>');
  return out;
};
function habitDone(S, h, todayEps, basal) {
  switch (h.catalogId) {
    case 'H-ZAPIS': return NF.daySlots(S).every(function (x) { return x.state === 'done' || x.state === 'skipped'; });
    case 'H-PORCE': return todayEps.length >= 1 && todayEps.every(function (x) { return x.portion === 'usual'; });
    case 'H-INZULIN': return todayEps.length >= 1 && todayEps.every(function (x) { return x.insulin.confirmed !== 'unknown'; });
    case 'H-CAS': var b = todayEps.filter(function (x) { return x.meal === 'breakfast'; })[0]; return !!b && NF.parse(b.at).getHours() < 8;
    case 'H-BAZAL': return !!basal;
    case 'H-PROCHAZKA': return todayEps.some(function (x) { return (x.advice || []).some(function (a) { return a.lever === 'walk' && a.accepted; }); });
    default: return false;
  }
}
function habitProgress(S, h, todayEps, basal) {
  switch (h.catalogId) {
    case 'H-ZAPIS': return todayEps.length + ' / 3 jídla';
    case 'H-PORCE': return todayEps.length ? todayEps.filter(function (x) { return x.portion === 'usual'; }).length + ' / ' + todayEps.length + ' jídel v obvyklé porci' : 'zatím žádné jídlo';
    case 'H-INZULIN': return todayEps.length ? todayEps.filter(function (x) { return x.insulin.confirmed !== 'unknown'; }).length + ' / ' + todayEps.length + ' potvrzeno' : 'zatím žádné jídlo';
    case 'H-CAS': return 'obvykle 7:00–8:00';
    case 'H-BAZAL': return basal ? 'potvrzeno ' + basal.time : 'večer ve ' + (NF.activePlan(S).doses.basal.time);
    default: return h.how || '';
  }
}

/* ---------- před jídlem: 3 kroky ---------- */
function timeChips(m) {
  var opts = [['0', 'právě teď'], ['-5', 'před 5 min'], ['-15', 'před 15 min'], ['-30', 'před 30 min']];
  return '<div class="timechips">' + opts.map(function (o) { return choice(o[1], 'mealTime', o[0], String(m.offset) === o[0]); }).join('') + '</div>';
}
function tolNote(S) { return '<p class="tiny muted" style="margin:6px 0 0">Do učení počítáme jídla, u kterých byl inzulin do ' + NF.param(S, 'D-CISTA', 'tolerance_min', 15) + ' minut od jídla. Zapiš to i tak — záznam zůstane.</p>'; }
V.meal = function (S) {
  var m = S.meal, p = NF.activePlan(S);
  if (!m || !p) return glass('<h2>Teď nelze nic zapsat</h2>') + '<div class="actions">' + btn('Zpět', 'page', 'today', 'primary') + '</div>';
  var dose = p.doses[m.meal], out = '', snack = NF.isSnack(m.meal);
  var steps = '<div class="msteps">' + (snack ? [2, 3] : [1, 2, 3]).map(function (i) { return '<span class="' + (i <= m.step ? 'on' : '') + '"></span>'; }).join('') + '</div>';
  var stepLabel = function (n) { return snack ? 'Krok ' + (n - 1) + ' ze 2 · svačina' : 'Krok ' + n + ' ze 3 · ' + NF.mealLabel(m.meal); };
  if (m.step === 1 && m.retro) {
    var base = { breakfast: 6, lunch: 11, dinner: 17 }[m.meal];
    out += head(S, 'Krok 1 ze 3 · ' + NF.mealLabel(m.meal) + ' zpětně', 'Píchl sis k ' + NF.mealLabel(m.meal, 'dat') + ' inzulin?') + steps +
      glass('<div class="insulin"><div class="ic">💉</div><div><b>Lékař předepsal · ' + dose.units + ' j.</b><small>k ' + e(NF.mealLabel(m.meal)) + ' · ptáme se, jak to bylo</small></div></div>') +
      '<div class="choice-row" style="flex-direction:column">' +
      choice('Ano, ' + dose.units + ' j.<small>podle plánu</small>', 'mealBolus', 'as', m.bolus === 'as', 'big') +
      choice('Ano, jinak<small>jiné množství</small>', 'mealBolus', 'other', m.bolus === 'other', 'big') +
      choice('Ne<small>inzulin jsem si nepíchl</small>', 'mealBolus', 'none', m.bolus === 'none', 'big') +
      choice('Nevím', 'mealBolus', 'unknown', m.bolus === 'unknown', 'big') + '</div>' +
      (m.bolus === 'other' ? glass('<b>Kolik jednotek?</b><div class="actions" style="margin-top:8px"><div class="stepper">' + btn('−', 'mealUnits', '-1', '', ' aria-label="méně"') + '<span class="val">' + m.units + ' j.<small>předepsáno ' + dose.units + '</small></span>' + btn('+', 'mealUnits', '1', '', ' aria-label="více"') + '</div></div>') : '') +
      glass('<b>V kolik jsi ' + (m.meal === 'breakfast' ? 'snídal' : m.meal === 'lunch' ? 'obědval' : 'večeřel') + '?</b><div class="timechips">' + [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(function (o) { var h = base + o; var nowH = NF.parse(S.clock).getHours() + NF.parse(S.clock).getMinutes() / 60; return h <= nowH ? choice('v ' + NF.fmtHour(h), 'mealAt', String(h), String(m.at) === String(h)) : ''; }).join('') + '</div>' +
        (m.bolus === 'as' || m.bolus === 'other' ? '<b style="display:block;margin-top:12px">A inzulin?</b><div class="timechips">' + [['0', 'zároveň s jídlem'], ['-15', '15 min před'], ['-30', '30 min před'], ['15', 'až po jídle']].map(function (o) { return choice(o[1], 'mealTime', o[0], String(m.offset) === o[0]); }).join('') + '</div>' + tolNote(S) : '')) +
      '<div class="actions">' + btn('Další: co jsi jedl →', 'mealStep', '2', 'primary big', m.bolus && m.at != null ? '' : ' disabled') + '</div>' +
      (m.bolus && m.at != null ? '' : '<p class="small muted" style="text-align:center">Vyber inzulin a čas jídla.</p>');
    return out;
  }
  if (m.step === 1) {
    out += head(S, 'Krok 1 ze 3 · ' + NF.mealLabel(m.meal), 'Už sis píchl inzulin k tomuto jídlu?') + steps +
      glass('<div class="insulin"><div class="ic">💉</div><div><b>Lékař předepsal · ' + dose.units + ' j.</b><small>k ' + e(NF.mealLabel(m.meal)) + ' · my jen připomínáme</small></div></div>') +
      '<div class="choice-row" style="flex-direction:column">' +
      choice('Píchl jsem si ' + dose.units + ' j.<small>podle plánu</small>', 'mealBolus', 'as', m.bolus === 'as', 'big') +
      choice('Píchl jsem si jinak<small>jiné množství nebo čas</small>', 'mealBolus', 'other', m.bolus === 'other', 'big') +
      choice('Ještě ne<small>píchnu si až před jídlem</small>', 'mealBolus', 'before', m.bolus === 'before', 'big') +
      choice('Nevím<small>bereme to, jako bys už měl</small>', 'mealBolus', 'unknown', m.bolus === 'unknown', 'big') + '</div>' +
      (m.bolus === 'other' ? glass('<b>Kolik jednotek?</b><div class="actions" style="margin-top:8px"><div class="stepper">' + btn('−', 'mealUnits', '-1', '', ' aria-label="méně"') + '<span class="val">' + m.units + ' j.<small>předepsáno ' + dose.units + '</small></span>' + btn('+', 'mealUnits', '1', '', ' aria-label="více"') + '</div></div><b style="display:block;margin-top:12px">Kdy?</b>' + timeChips(m)) : '') +
      (m.bolus === 'as' ? glass('<b>Kdy sis píchl?</b>' + timeChips(m) + tolNote(S)) : '') +
      '<details class="more" style="margin:4px 4px 12px"><summary>Proč se ptáme</summary><p class="small muted">Radu k velikosti porce můžeme dát jen dřív, než je inzulin v těle. Když nevíš, bereme to, jako by už byl — je to bezpečnější.</p></details>' +
      '<div class="actions">' + btn('Další: co budeš jíst →', 'mealStep', '2', 'primary big', m.bolus ? '' : ' disabled') + '</div>' +
      (m.bolus ? '' : '<p class="small muted" style="text-align:center">Vyber jednu z možností.</p>');
    return out;
  }
  if (m.step === 2) {
    var results = m.q ? NF.searchFoods(S, m.q, m.meal) : [], recents = NF.recentFoods(S, m.meal);
    var chosen = m.foodId ? NF.foodById(S, m.foodId) : null;
    var list = (m.q ? results : recents);
    out += head(S, stepLabel(2), m.retro ? 'Co jsi jedl?' : snack ? 'Co si dáš k svačině?' : 'Co budeš jíst?') + steps +
      (snack ? hint('<b>Svačina je bez inzulinu k jídlu.</b> Nepotvrzuješ dávku ani porci; jen zapiš, co jíš. Učíme se z ní zvlášť a lékař uvidí, kolik toho jíš mimo hlavní jídla.', 'sand') : '') +
      glass('<label class="field"><span>Napiš pár písmen</span><input data-bind="meal.q" value="' + e(m.q || '') + '" placeholder="např. řízek, kaše, guláš" autocomplete="off"></label>' +
        (list.length ? '<div class="small muted" style="margin:2px 0 6px">' + (m.q ? 'Nalezeno' : 'Naposledy') + '</div><div class="food-grid">' + list.map(function (f) {
          var c = NF.confidence(S, f.id, m.meal);
          return '<button type="button" class="food-opt ' + (chosen && chosen.id === f.id ? 'chosen' : '') + '" data-action="mealFood" data-value="' + e(f.id) + '">' + e(emoji(f)) + ' <span>' + e(f.name) + '<small>' + (c.level === 'known' ? 'znáš · ' + c.st.inTarget + ' z ' + c.st.n + ' v cíli' : c.level === 'similar' ? 'podobné známým' : 'zapsáno ' + c.st.eaten + '×') + '</small></span>' + levelTag(c.level) + '</button>';
        }).join('') + '</div>' : (m.q ? '<p class="small muted">Nic takového neznáme.</p>' : '')) +
        (m.q && !chosen ? '<div class="actions">' + btn('＋ Přidat „' + e(m.q) + '“ jako vlastní jídlo', 'mealNewFood', null, m.newFood ? 'primary' : '') + '</div>' : '')) +
      (m.newFood ? glass('<h2>Vlastní jídlo: ' + e(m.q) + '</h2><p class="small muted">Tři klepnutí. Žádná čísla — učíme se z toho, jak na jídlo reaguje tvoje tělo.</p>' +
        ['side', 'prep', 'size'].map(function (g) {
          return '<b style="display:block;margin:10px 0 6px">' + { side: 'Příloha', prep: 'Příprava', size: 'Velikost' }[g] + '</b><div class="choice-row">' + NF.TAGS[g].map(function (t) { return choice(t[1], 'mealTag', g + ':' + t[0], m.newFood[g] === t[0]); }).join('') + '</div>';
        }).join('') + '<div class="actions">' + btn('Uložit jídlo do seznamu', 'mealSaveFood', null, 'primary') + '</div>') : '');
    if (chosen && !snack) {
      out += glass('<h2>' + (m.retro ? 'Jakou porci jsi snědl?' : 'Jakou porci si chystáš?') + '</h2><div class="choice-row">' + NF.PORTIONS.map(function (x) { return choice(x[1], 'mealPortion', x[0], m.portion === x[0]); }).join('') + '</div>' +
        '<p class="field-help">Obvyklá porce = tak, jak ' + e(chosen.name.toLowerCase()) + ' jíš obvykle. Na to lékař nastavil tvoji dávku.</p>');
    }
    out += '<div class="actions">' + btn('Další: rada a zápis →', 'mealStep', '3', 'primary big', chosen && m.portion ? '' : ' disabled') + (snack ? btn('← Zpět na Dnes', 'page', 'today', 'quiet') : btn('← Zpět', 'mealStep', '1', 'quiet')) + '</div>' +
      (!chosen ? '<p class="small muted" style="text-align:center">Vyber jídlo ze seznamu, nebo přidej vlastní.</p>' : !m.portion ? '<p class="small muted" style="text-align:center">Vyber porci.</p>' : '');
    return out;
  }
  /* krok 3 */
  var food = NF.foodById(S, m.foodId);
  if (m.retro) {
    var ra = NF.adviseAfter(S, food.id, m.meal, NF.retroAt(S, m.at)), rc = ra.conf;
    out += head(S, 'Krok 3 ze 3 · ' + NF.mealLabel(m.meal) + ' zpětně', food.name) + steps +
      glass('<div style="display:flex;gap:12px;align-items:center">' + foodIcon(S, food, rc) + '<div><div class="badges">' + levelTag(rc.level) + reactionTag(rc.reaction) + '</div><div class="learn">' + e(NF.mealLabel(m.meal, true)) + ' v ' + e(NF.fmtHour(Number(m.at))) + ' · ' + e(NF.PORTIONS.filter(function (x) { return x[0] === m.portion; })[0][1].toLowerCase()) + ' porce · inzulin ' + e(m.bolus === 'as' ? dose.units + ' j.' : m.bolus === 'other' ? m.units + ' j.' : NF.INSULIN[m.bolus]) + '</div></div></div>' +
        (rc.level === 'known' ? '<div class="detail">' + peakBlock(S, food, rc) + '</div>' : '<p class="sum" style="margin-top:10px">Zápis se přidá k učení' + (m.bolus === 'as' ? '' : ' jen jako záznam (inzulin nebyl podle plánu)') + '.</p>')) +
      (ra.items.length ? '<h2 style="margin:14px 4px 8px">Co pomůže teď <span class="small muted" style="font-weight:500">· jídlo už změnit nejde</span></h2>' + ra.items.map(function (it) {
        var d = (m.decisions || {})[it.lever];
        return '<div class="advice ' + (d === true ? 'taken' : d === false ? 'declined' : '') + '"><div class="lever">' + e(it.label) + '</div><div class="text">' + e(it.text) + '</div><div class="cert">' + e(it.certainty) + '</div>' +
          '<div class="choice-row">' + choice('Jdu na to', 'mealDecide', it.lever + ':yes', d === true) + choice('Teď ne', 'mealDecide', it.lever + ':no', d === false) + '</div><div style="margin-top:8px">' + appr(S, it.item) + '</div></div>';
      }).join('') : '') +
      (ra.late ? hint('<b>Od jídla už uplynuly víc než tři hodiny.</b> Glukóza po něm už klesla, pohyb teď k tomuto jídlu nic nezmění. Zápis se i tak počítá.', 'sand') : '') +
      (m.bolus === 'none' || m.bolus === 'unknown' ? hint('<b>Inzulin k tomuto jídlu ' + (m.bolus === 'none' ? 'nebyl podán' : 'není potvrzený') + '.</b> Zápis uložíme, ale do učení ho nezapočítáme. Pokud si nejsi jistý, co dělat, otevři Bezpečí.', 'warn') : '') +
      '<div class="actions">' + btn('Uložit ' + NF.mealLabel(m.meal), 'mealFinish', m.bolus, 'primary big') + '</div><div class="actions" style="margin-top:6px">' + btn('← Zpět', 'mealStep', '2', 'quiet') + '</div>';
    return out;
  }
  var res = NF.advise(S, food.id, m.portion, m.bolus, m.meal);
  var conf = res.conf;
  out += head(S, stepLabel(3), food.name) + steps;
  out += glass('<div style="display:flex;gap:12px;align-items:center">' + foodIcon(S, food, conf) + '<div><div class="badges">' + levelTag(conf.level) + reactionTag(conf.reaction) + '</div>' +
    '<div class="learn">' + (conf.level === 'known' ? 'Znáš ho · ' + conf.st.n + ' započítaných zápisů' : conf.level === 'similar' ? 'Zatím odhad z podobných jídel' : 'Zatím nic neodhadujeme — zapiš ho ' + (conf.min || 3) + '×') + '</div></div></div>' +
    (conf.level === 'unknown' ? '<p class="sum" style="margin-top:10px">Tohle jídlo u tebe ještě neznáme a nic podobného také ne. <b>Nic neodhadujeme.</b> Po ' + (conf.min || 3) + ' zápisech ti řekneme, kam se po něm glukóza dostane.</p>' : conf.level === 'none' ? '<p class="sum" style="margin-top:10px">' + e(conf.why) + '</p>' : '<div class="detail">' + peakBlock(S, food, conf) + '</div>'));
  if (!res.gate.ok) out += hint('<b>Teď neradíme.</b> ' + e(res.gate.why), 'warn');
  else {
    res.blocked.forEach(function (b) { out += hint('<b>' + e(NF.LEVERS[b.lever].label) + ': teď neradíme.</b> ' + e(b.why), 'warn'); });
    res.gone.forEach(function (g) { out += hint(e(g.text) + ' ' + appr(S, 'R-ZMIZELA'), 'sand'); });
    if (res.illness) out += hint('<b>Jsi nemocný.</b> Nabízíme jen rady, které nemění množství jídla. Dávky platí, jak řekl lékař.', 'sand');
    if (res.items.length) {
      out += '<h2 style="margin:14px 4px 8px">Co můžeš zkusit <span class="small muted" style="font-weight:500">· odpovídat nemusíš</span></h2>' + res.items.map(function (it) {
        var d = (m.decisions || {})[it.lever], reason = (m.reasons || {})[it.lever];
        return '<div class="advice ' + (d === true ? 'taken' : d === false ? 'declined' : '') + '"><div class="lever">' + e(it.label) + (it.carbs ? tag('mění množství jídla', 'warn') : '') + '</div>' +
          '<div class="text">' + e(it.text) + '</div><div class="cert">' + e(it.certainty) + '</div>' +
          '<div class="choice-row">' + choice('Zkusím to', 'mealDecide', it.lever + ':yes', d === true) + choice('Tentokrát ne', 'mealDecide', it.lever + ':no', d === false) + '</div>' +
          (d === false ? '<div class="choice-row reasons">' + NF.DECLINE_REASONS.map(function (r) { return choice(r[1], 'mealReason', it.lever + ':' + r[0], reason === r[0]); }).join('') + '</div>' : '') +
          '<div style="margin-top:8px">' + appr(S, it.item) + '</div></div>';
      }).join('');
    } else if (conf.level === 'known' && !res.blocked.length) out += glass('<p>K tomuto jídlu teď nemáme radu — reaguješ na něj dobře. Jen ho zapiš.</p>');
  }
  out += '<details class="more" style="margin:4px 4px 14px"><summary>Proč radíme právě toto a jak jsme si jistí</summary><div class="small muted" style="padding-top:6px">' +
    '<p><b>Odkud to víme:</b> jen z tvých vlastních zápisů a dat ze senzoru. Nepočítáme zápisy bez potvrzeného inzulinu, s mezerou v datech, z doby nemoci, s jinou než obvyklou porcí ani z doby jiné dávky.</p>' +
    '<p><b>Proč se ptáme na inzulin:</b> dávka je jako klíč vyrobený na obvyklou porci. Dokud sis nepíchl, můžeš porci ještě upravit. Po píchnutí inzulin působí 3–5 hodin, ať sníš cokoli — proto pak radíme jen návrat k obvyklé porci z větší, nikdy „sněz víc“.</p>' +
    '<p><b>Co nikdy neděláme:</b> nepočítáme ani neměníme dávku inzulinu.</p></div></details>';
  if (m.bolus === 'before') {
    out += glass('<h2>Teď si píchni inzulin a jdi jíst</h2><p class="small muted">Lékař předepsal <b>' + dose.units + ' j.</b> k ' + e(NF.mealLabel(m.meal)) + '.</p>' +
      '<div class="choice-row" style="flex-direction:column">' + choice('Píchl jsem si ' + dose.units + ' j. a jdu jíst', 'mealFinish', 'as', false, 'big') + choice('Píchl jsem si jinak', 'mealFinishOther', null, !!m.finishOther, 'big') + '</div>' +
      (m.finishOther ? '<div class="actions"><div class="stepper">' + btn('−', 'mealUnits', '-1') + '<span class="val">' + m.units + ' j.</span>' + btn('+', 'mealUnits', '1') + '</div>' + btn('Uložit a jdu jíst', 'mealFinish', 'other', 'primary') + btn('Bez inzulinu', 'mealFinish', 'none', 'quiet') + '</div>' : ''));
  } else out += '<div class="actions">' + btn(snack ? 'Uložit svačinu' : 'Uložit jídlo', 'mealFinish', m.bolus, 'primary big') + '</div>';
  out += '<div class="actions" style="margin-top:6px">' + btn('← Zpět', 'mealStep', '2', 'quiet') + '</div>';
  return out;
};

/* ---------- Moje jídla ---------- */
V.foods = function (S) {
  var seg = S.foodsSeg || 'known';
  var withEps = S.foods.filter(function (f) { return NF.foodStats(S, f.id).eaten > 0; });
  var known = withEps.filter(function (f) { return NF.confidence(S, f.id).level === 'known'; });
  var learning = withEps.filter(function (f) { return NF.confidence(S, f.id).level !== 'known'; });
  var list = seg === 'known' ? known : seg === 'learn' ? learning : withEps;
  var out = head(S, 'Co už o tvých jídlech víme', 'Moje jídla') +
    '<div class="segmented" style="margin-bottom:12px">' + [['known', 'Známá · ' + known.length], ['learn', 'Učím se · ' + learning.length], ['all', 'Všechna']].map(function (x) { return '<button type="button" class="' + (seg === x[0] ? 'on' : '') + '" data-action="foodsSeg" data-value="' + x[0] + '">' + e(x[1]) + '</button>'; }).join('') + '</div>';
  if (!withEps.length) return out + glass('<p>Zatím tu nic není. Až zapíšeš první jídlo, uvidíš ho tady.</p>');
  if (!list.length) return out + glass('<p>' + (seg === 'known' ? 'Zatím žádné známé jídlo. Jídlo poznáme po 3 zápisech se všemi údaji.' : 'Všechna zapsaná jídla už znáš.') + '</p>');
  out += list.map(function (f) { return foodCard(S, f, S.foodOpen === f.id); }).join('');
  return out;
};
function foodCard(S, f, open) {
  var c = NF.confidence(S, f.id), st = c.st;
  var sum;
  if (c.level === 'known' && !c.reaction) sum = 'Zapsáno ' + st.eaten + '×. Reakci teď nehodnotíme (pravidlo není schválené); rozmezí vidíš níže.';
  else if (c.level === 'known') sum = 'Zapsáno ' + st.eaten + '×. ' + (c.reaction.key === 'mild' ? 'Po něm zůstáváš <b>většinou v cíli</b>.' : c.reaction.key === 'mid' ? 'Po něm jsi <b>zhruba napůl</b> v cíli a nad ním.' : 'Po něm se <b>většinou dostaneš nad cíl</b>.');
  else if (c.level === 'similar') sum = 'Zapsáno ' + st.eaten + '×, ještě ' + (c.min - st.n) + ' a budeme ho znát. Podobá se jídlům, po kterých ' + (c.reaction && c.reaction.key === 'mild' ? 'zůstáváš v cíli' : 'jdeš nad cíl') + '.';
  else sum = 'Zapsáno ' + st.eaten + '×. Zatím nic neodhadujeme; po ' + (c.min || 3) + ' zápisech se všemi údaji budeme vědět víc.';
  var detail = '';
  if (open) {
    var lev = c.level === 'known' ? NF.leverStats(S, f.id) : [];
    detail = '<div class="detail">' + peakBlock(S, f, c) +
      (lev.length ? '<div class="tip"><b>Co u tebe pomohlo</b>' + lev.map(function (x) { return e(NF.LEVERS[x.lever].label) + ': ' + x.st.inTarget + ' z ' + x.st.n + ' v cíli'; }).join(' · ') + '.</div>' : '') +
      (c.level === 'known' && c.reaction && c.reaction.key !== 'mild' ? '<div class="tip"><b>Kdy a s čím</b>Zkus přidat bílkovinu (jogurt, sýr, vejce), sníst nejdřív zeleninu nebo maso a po jídle se projít. Každou radu ti nabídneme přímo před jídlem.</div>' : '') +
      '<details class="more"><summary>Historie zápisů (' + st.eaten + ')</summary><div class="tablewrap"><table><thead><tr><th>Datum</th><th>Porce</th><th>Inzulin</th><th>Rada</th><th>Vrchol</th></tr></thead><tbody>' +
      st.list.slice().reverse().slice(0, 8).map(function (ep) {
        var why = NF.whyNotUsable(S, ep), acc = (ep.advice || []).filter(function (a) { return a.accepted === true && a.lever !== 'portion'; }).map(function (a) { return NF.LEVERS[a.lever].label; });
        return '<tr><td class="nowrap">' + e(NF.fmtShort(ep.at)) + '</td><td>' + e(NF.PORTIONS.filter(function (x) { return x[0] === ep.portion; })[0][1]) + '</td><td>' + e(NF.INSULIN[ep.insulin.confirmed]) + (ep.insulin.units != null && ep.insulin.confirmed === 'other' ? ' ' + ep.insulin.units + ' j.' : '') + '</td><td>' + e(acc.join(', ') || '—') + '</td><td>' + (why ? '<span class="missing">' + e(why) + '</span>' : e(NF.mmol(NF.peakOf(ep.points)))) + '</td></tr>';
      }).join('') + '</tbody></table></div></details></div>';
  }
  return '<section class="glass food"><button type="button" class="h" data-action="foodOpen" data-value="' + e(f.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' + foodIcon(S, f, c) +
    '<div><div class="name">' + e(f.name) + '</div><div class="badges">' + levelTag(c.level) + reactionTag(c.reaction) + (f.custom ? tag('moje jídlo') : '') + '</div>' +
    (c.level !== 'known' ? '<div class="learn">Učím se: ' + Math.min(st.n, c.min || 3) + ' ze ' + (c.min || 3) + ' zápisů</div>' : '') + '</div><span class="chev">' + (open ? '⌃' : '⌄') + '</span></button>' +
    '<div class="sum">' + sum + '</div>' + detail + '</section>';
}
V.foodCard = foodCard;

/* ---------- Plán, Bezpečí ---------- */
V.planScreen = function (S) {
  var p = NF.activePlan(S); if (!p) return head(S, 'Plán', 'Plán ti zatím lékař nevydal');
  var older = S.plans.filter(function (x) { return x.id !== p.id; });
  var ms = (S.fb && S.fb.milestones) || [];
  return head(S, 'Můj plán · ' + p.id, 'Dávky a návyky') +
    pathCard(S, true) +
    (ms.length ? glass('<details class="more"><summary>Tvoje milníky (' + ms.length + ')</summary><ul class="plain small">' + ms.slice().reverse().map(function (m) { return '<li>' + e(NF.fmtShort(m.at)) + ' · ' + m.text + '</li>'; }).join('') + '</ul></details>') : '') +
    glass('<h2>Kdy a kolik inzulinu</h2>' + dosesTable(p) + '<p class="small muted">Určil lékař ' + e(NF.fmtShort(p.issuedAt)) + '. Ke každému ze tří jídel se ptáme na inzulin a co jsi jedl; když zápis chybí, zeptáme se zpětně. Dávky nikdy nepočítáme ani neměníme.</p>') +
    glass('<h2>Návyky</h2><ul class="plain">' + NF.activeHabits(S).map(function (h) { return '<li><b>' + e(h.title) + '</b><br><span class="small muted">' + e(h.why) + '</span></li>'; }).join('') + '</ul>') +
    glass('<h2>Rady, které ti nabízíme</h2>' + adviceList(S, p) + '<p class="small muted">Nabízíme je před jídlem podle toho, jak na jídlo reaguješ. Odpovídat nemusíš.</p>') +
    glass('<h2>Cíle glukózy</h2>' + kv('V cíli', e(NF.mmol(p.targets.low)) + '–' + e(NF.mmol(p.targets.high)) + ' mmol/l') + kv('Ráno nalačno do', e(NF.mmol(p.targets.fastingHigh)) + ' mmol/l') + kv('Platnost plánu do', e(NF.fmtShort(p.validUntil)))) +
    (older.length ? glass('<details class="more"><summary>Starší plány (' + older.length + ')</summary><ul class="plain small">' + older.map(function (x) { return '<li><b>' + e(x.id) + '</b> · ' + e(NF.fmtShort(x.issuedAt)) + ' – ' + e(NF.fmtShort(x.validUntil)) + '<br><span class="muted">Zápisy z té doby zůstávají u něj.</span></li>'; }).join('') + '</ul></details>') : '');
};
V.safety = function (S) {
  var p = NF.activePlan(S), ill = S.illness && S.illness.active;
  return head(S, 'Vždy dostupné', 'Bezpečí') +
    glass('<h2>Osobní pokyny od lékaře</h2>' + instructionsList(S, p, false) + '<p class="small muted" style="margin-top:8px">Zadal lékař ' + (p ? e(NF.fmtShort(p.issuedAt)) : '') + '. Aplikace k nim nic nepřidává.</p>') +
    glass('<h2>Kam se obrátit</h2>' + kv('Zdravotní potíže', 'ordinace podle pokynů') + kv('Nefunguje aplikace nebo senzor', 'technická podpora') + kv('Ohrožení života', 'záchranná služba') + '<p class="small muted">V ukázce nejsou skutečná čísla. Aplikace sama nikam nic neposílá.</p>') +
    glass('<div class="sick">🤒 ' + (ill ? 'Nemoc trvá od ' + e(NF.fmtShort(S.illness.from)) : 'Jsem nemocný') + ' <button type="button" class="toggle ' + (ill ? 'on' : '') + '" data-action="illness" data-value="' + (ill ? 'off' : 'on') + '" aria-label="Nemoc"></button></div>');
};

/* ---------- report před kontrolou ---------- */
V.preview = function (S) {
  var p = NF.activePlan(S); if (!p) return head(S, 'Před kontrolou', 'Zatím nemáš plán');
  var s = NF.summary(S, p.id), adv = s.advice;
  var known = S.foods.filter(function (f) { return NF.confidence(S, f.id).level === 'known'; });
  var best = null; known.forEach(function (f) { NF.leverStats(S, f.id).forEach(function (x) { if (x.st.n >= 3 && (!best || x.st.inTarget / x.st.n > best.share)) best = { food: f, lever: x.lever, st: x.st, share: x.st.inTarget / x.st.n }; }); });
  var praise = 'Zapsal jsi <strong>' + s.meals + ' jídel</strong>' + (s.usualPct >= 80 ? ', z toho ' + s.usualPct + ' % v obvyklé porci — díky, že ji držíš' : '') + '. Inzulin jsi potvrdil u ' + s.asPct + ' % jídel.' +
    (best ? ' <strong>' + e(NF.LEVERS[best.lever].label) + '</strong> u jídla ' + e(best.food.name) + ' ti pomohl: ' + best.st.inTarget + ' z ' + best.st.n + ' v cíli.' : '');
  var qs = [];
  if (best) qs.push('Mám pokračovat s tím, že si k ' + best.food.name.toLowerCase() + ' dávám ' + NF.LEVERS[best.lever].label.toLowerCase() + '?');
  if (adv.topReason === 'nothome') qs.push('Rady, které nemám doma, často nepřijmu — dá se to nastavit jinak?');
  if (s.other + s.none > 0) qs.push('Někdy jsem si píchl jinak než podle plánu (' + (s.other + s.none) + '×). Je to problém?');
  if (s.illDays) qs.push('Byl jsem ' + s.illDays + ' dní nemocný. Mám v takové době něco dělat jinak?');
  qs.push('Jsou moje cíle glukózy pořád správné?');
  qs = qs.slice(0, 3); /* 15, odst. 11: tři navržené otázky */
  return head(S, 'Před kontrolou ' + (S.nextVisit ? NF.fmtShort(S.nextVisit) : ''), 'Co uvidí lékař') +
    glass('<div class="now"><span class="ic">👍</span><div><b>Díky za ' + NF.plural(Math.max(1, NF.daysBetween(p.issuedAt, S.clock)), 'den', 'dny', 'dní') + ' zapisování</b>' + praise + '<br><span class="small muted">Tohle uvidí lékař. Neuvidí žádné hodnocení, jestli jsi „poslechl“ — jen co jsi zkusil a jak to dopadlo.</span></div></div>', 'soft') +
    glass('<h2>V číslech</h2><div class="tiles">' +
      tile('Jídla', s.meals, 'zapsáno' + (s.snacks ? ' · ' + s.snacks + ' svačin' : ''), 'c-ok', 'meals') + tile('Obvyklá porce', s.usualPct == null ? '—' : s.usualPct + ' %', 'jídel', s.usualPct == null ? 'c-none' : s.usualPct >= 80 ? 'c-ok' : 'c-warn', 'usual') +
      tile('Inzulin', s.asPct == null ? '—' : s.asPct + ' %', 'podle plánu', s.asPct == null ? 'c-none' : s.asPct >= 80 ? 'c-ok' : 'c-warn', 'ins') + tile('Rady', adv.accepted.n, 'zkusil · ' + adv.declined.n + ' ne', adv.works === 'yes' ? 'c-ok' : 'c-none', 'adv') + '</div>' +
      (S.previewTile ? '<div class="hint sand">' + e(previewDetail(S, s, S.previewTile)) + '</div>' : '<p class="small muted">Klepni na dlaždici pro vysvětlení.</p>')) +
    glass('<h2>Tvoje návyky v tomto plánu</h2><ul class="plain">' + NF.activeHabits(S).map(function (h) { return '<li>' + e(h.title) + '</li>'; }).join('') + '</ul><p class="small muted">Jak se ti dařilo je v číslech výše; návyky si lékař s tebou projde na kontrole.</p>') +
    glass('<h2>Na co se zeptat lékaře</h2><p class="small muted">Klepni na otázku, kterou si chceš vzít na kontrolu.</p><div class="choice-row" style="flex-direction:column">' +
      qs.map(function (q) { return choice(e(q), 'toggleQuestion', q, S.questions.some(function (x) { return x.text === q; })); }).join('') + '</div>' +
      '<details class="more" style="margin-top:10px"><summary>Chci se zeptat na něco jiného</summary><label class="field"><span>Vlastní otázka</span><textarea data-bind="form.question" placeholder="Napiš vlastními slovy">' + e((S.form && S.form.question) || '') + '</textarea></label><div class="actions">' + btn('Uložit otázku', 'saveQuestion', null, 'primary') + '</div></details>') +
    hint('<b>Nic se neodesílá.</b> Otázky a report uvidí lékař až s tebou v ordinaci.', 'sand');
};
function tile(k, v, d, cls, key) { return '<button type="button" class="tile ' + cls + '" data-action="previewTile" data-value="' + key + '"><div class="k"><i></i>' + e(k) + '</div><div class="v">' + e(String(v)) + '</div><div class="d">' + e(d) + '</div></button>'; }
function previewDetail(S, s, key) {
  return { meals: 'Každý zápis nás učí, jak tvoje tělo reaguje. ' + s.incomplete + ' zápisů má mezeru v datech ze senzoru a ' + s.ill + ' je z doby nemoci — ty se do učení nepočítají, ale lékař je vidí.',
    usual: 'Obvyklá porce je množství, na které lékař nastavil dávku. Čím častěji ji držíš, tím lépe dávka sedí a tím přesněji umíme radit.',
    ins: 'Podle plánu: ' + s.asPlan + '×, jinak: ' + s.other + '×, nepodán: ' + s.none + '×, nevím: ' + s.unknown + '×. Lékaři to pomůže poznat, jestli dávka sedí, nebo se jen liší podání.',
    adv: 'Když jsi radu přijal, vrchol glukózy byl v mediánu ' + NF.mmol(s.advice.accepted.med) + ' mmol/l; když ne, ' + NF.mmol(s.advice.declined.med) + '. ' + (s.advice.topReason ? 'Nejčastější důvod, proč ne: „' + NF.reasonLabel(s.advice.topReason) + '“.' : '') }[key] || '';
}

function adviceList(S, p) {
  var a = NF.planAdvice(S, p);
  return '<ul class="plain">' + Object.keys(NF.LEVERS).filter(function (l) { return l !== 'portion' && NF.usable(S, NF.LEVERS[l].item); }).map(function (l) {
    return '<li><b>' + e(NF.LEVERS[l].label) + '</b> ' + (a.off.indexOf(l) >= 0 ? tag('lékař vypnul', 'warn') : a.prefer.indexOf(l) >= 0 ? tag('lékař doporučil', 'info') : '') + '</li>';
  }).join('') + '</ul>';
}
V.adviceList = adviceList;

/* ---------- nový plán ---------- */
V.newPlan = function (S) {
  var p = NF.activePlan(S), prev = p && p.previousId ? NF.planById(S, p.previousId) : null;
  if (!p || !prev) return V.today(S);
  var doseChanges = [];
  ['basal', 'breakfast', 'lunch', 'dinner'].forEach(function (k) { if (p.doses[k].units !== prev.doses[k].units) doseChanges.push((k === 'basal' ? 'bazál' : NF.mealLabel(k)) + ': ' + prev.doses[k].units + ' → <b>' + p.doses[k].units + ' j.</b>'); });
  var newH = S.habits.filter(function (h) { return h.planId === p.id; }), oldH = S.habits.filter(function (h) { return h.planId === prev.id; });
  var added = newH.filter(function (h) { return !oldH.some(function (o) { return o.catalogId === h.catalogId; }); }), removed = oldH.filter(function (h) { return !newH.some(function (o) { return o.catalogId === h.catalogId; }); });
  var pa = NF.planAdvice(S, p), oa = NF.planAdvice(S, prev);
  var advOff = pa.off.filter(function (l) { return oa.off.indexOf(l) < 0; }), advOn = pa.prefer.filter(function (l) { return oa.prefer.indexOf(l) < 0; });
  var instrChange = JSON.stringify(p.instructions) !== JSON.stringify(prev.instructions) || JSON.stringify(p.targets) !== JSON.stringify(prev.targets) ? '<p><b>Pokyny a cíle:</b> lékař je upravil — najdeš je v Bezpečí a v Plánu.</p>' : '';
  var adviceChange = advOff.length || advOn.length ? '<p>' + (advOff.length ? 'Radu „' + e(advOff.map(function (l) { return NF.LEVERS[l].label; }).join('“, „')) + '“ ti už nenabízíme — lékař ji vypnul. ' : '') + (advOn.length ? 'Místo toho ti budeme nabízet „' + e(advOn.map(function (l) { return NF.LEVERS[l].label; }).join('“, „')) + '“.' : '') + ' Dávky se tím nemění.</p>' : '';
  return head(S, 'Nový plán · ' + p.id, 'Co se změnilo') +
    glass('<div class="now"><span class="ic">👉</span><div><b>Co teď</b>Projdi si změny a klepni na „Rozumím, pokračuji“. Od teď platí nový plán.</div></div>') +
    glass('<h2>Dávky inzulinu</h2>' + (doseChanges.length ? '<p>' + doseChanges.join('<br>') + '</p>' + hint('<b>Změna dávky = učíme se znovu.</b> Tvoje tělo bude na jídla reagovat jinak, proto u jídel s novou dávkou začínáme počítat od nuly. Staré zápisy zůstávají označené původní dávkou.', 'sand') : '<p>Beze změny.</p>') + dosesTable(p)) +
    glass('<h2>Návyky a rady</h2>' + (added.length ? '<p><b>Nové:</b> ' + e(added.map(function (h) { return h.title; }).join(', ')) + '</p>' : '') + (removed.length ? '<p><b>Končí:</b> ' + e(removed.map(function (h) { return h.title; }).join(', ')) + '</p>' : '') + adviceChange + instrChange + (!added.length && !removed.length && !adviceChange && !instrChange ? '<p>Pokračují beze změny.</p>' : '') +
      (p.decisions && p.decisions.length ? '<details class="more"><summary>Proč lékař rozhodl takto</summary><ul class="plain small">' + p.decisions.map(function (d) { return '<li><b>' + e(d.title) + '</b> — ' + e(d.text) + '</li>'; }).join('') + '</ul></details>' : '')) +
    '<div class="actions">' + (p.understood ? btn('Přejít na Dnes', 'page', 'today', 'primary big') : btn('Rozumím, pokračuji', 'confirmUnderstanding', null, 'primary big')) + '</div>';
};

})(typeof window !== 'undefined' ? window : globalThis);
