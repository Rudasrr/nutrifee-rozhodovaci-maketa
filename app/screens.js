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
/* Štítek stavu nese slovo i ikonu (15a; A20, 19. 10. 2026): v cíli/hotovo fajfka, nad cílem šipka nahoru, upozornění a pokles kroužek s vykřičníkem. */
var TAG_ICON = { ok: 'check', known: 'check', over: 'arrow-up', warn: 'alert', low: 'alert', bad: 'alert' };
function tag(text, kind) { var ic = TAG_ICON[kind]; return '<span class="tag ' + (kind || '') + '">' + (ic ? NF.icon(ic) : '') + e(text) + '</span>'; }
/* Nadpis karty jako h2 (A11): po nadpisech jde přecházet čtečkou, vzhled zůstává tučný řádek. */
function ttl(text) { return '<h2 class="card-title">' + text + '</h2>'; }
V.ttl = ttl;
/* Jedna bílá karta pro pacienta i ordinaci (19. 10. 2026). Varianty: tint (zvýrazněná), warn (nad cílem), low (pokles pod 4), flat, flush. */
function card(body, cls) { return '<section class="card' + (cls ? ' ' + cls : '') + '">' + body + '</section>'; }
/* Štítek položky registru u místa, kde působí: ◌ ke schválení · ✓ schváleno · ✕ zamítnuto (stav „upraveno“ zrušen 27. 10. 2026). Klepnutí otevře vysvětlení.
   U zamítnuté položky následuje oznámení na místě: prezentační vrstva ho kreslí slotem NF.slots.offNotice („Tahle část nefunguje“ pro garanta);
   bez ní (produkce) jádro ukáže neutrální výchozí oznámení „Tato část teď není k dispozici.“ (SCHEMA 87, bod 6). */
var APPR = { pending: ['pend', 'circle-dashed', 'ke schválení', 'Pravidlo ke schválení: '], approved: ['', 'check', '', 'Schválené pravidlo: '], rejected: ['rej', 'x', 'zamítnuto', 'Zamítnuté pravidlo: '] };
/* SCHEMA 86 (rozhodnutí vlastníka 5. 11. 2026, bod 1): štítky schvalování pacient nevidí. Na obrazovce pacienta (V.patient, list Bezpečí) jádro štítek
   nekreslí; na jeho místě je jen značka <span class="item-ref" data-item="ID" hidden> (vazba místa na položku registru; stopa a report se nemění).
   Prezentační vrstva může štítek pro garanta dokreslit slotem NF.slots.patientTag(S, id, html) – html je štítek, který by jádro jinak nakreslilo.
   Produkční sestavení slot nemá, takže pacient štítky nevidí. Lékař, sestra a registr štítky vidí beze změny. */
var PT = 0;
V.inPatient = function () { return PT > 0; };
function patientWrap(fn) { PT++; try { return fn(); } finally { PT--; } }
V.patientWrap = patientWrap;
function itemRef(id) { return '<span class="item-ref" data-item="' + e(id) + '" hidden></span>'; }
V.itemRef = itemRef;
function appr(S, id) {
  var r = NF.item(S, id);
  if (!r || r.scope === 'provozni') return ''; /* provozní pravidla neschvaluje nikdo a štítek nemají (27. 10. 2026, Q1) */
  var st = NF.itemState(S, id), m = APPR[st] || APPR.pending;
  var html = '<button type="button" class="appr ' + m[0] + '" data-action="openItem" data-value="' + e(id) + '" title="' + e((m[2] || 'schváleno') + ' · ' + r.title) + '" aria-label="' + m[3] + e(r.title) + '"><span aria-hidden="true">' + NF.icon(m[1]) + '</span> ' + e(r.title) + (m[2] ? '\u00a0<span class="st">· ' + m[2].replace(' ', '\u00a0') + '</span>' : '') + '</button>';
  var offH = st === 'rejected' ? off(S, id) : '';
  if (PT > 0) { var x = ''; try { x = NF.slots && NF.slots.patientTag ? (NF.slots.patientTag(S, id, html) || '') : ''; } catch (err) { x = ''; } return itemRef(id) + x + offH; }
  return html + offH;
}
/* SCHEMA 87 (rozhodnutí vlastníka 6. 11. 2026, bod 6; atlas pacienta R1): bez prezentační vrstvy výchozí neutrální oznámení na místě – bez zmínky o garantovi,
   bez výzvy volat (zásada 3); v jednom vykreslení se stejná položka hlásí jen jednou. Položky, jejichž zamítnutí je jen záznam nesouhlasu (C-CILE, K-KRITERIA,
   Z-GLUKOZA) nebo zásada bez místa (P-LEKAR), dál fungují, proto oznámení nemají. */
/* SCHEMA 89: výchozí text a seznam položek bez oznámení jsou v jádře (NF.OFF_TEXT, NF.OFF_RECORD_ONLY v app/core.js); tady jen aliasy pro obrazovky. */
V.OFF_TEXT = NF.OFF_TEXT; V.OFF_RECORD_ONLY = NF.OFF_RECORD_ONLY;
var offSeen = {}, offSeq = -1;
function off(S, id) {
  if (NF.slots.offNotice) return NF.slots.offNotice(S, id);
  if (NF.OFF_RECORD_ONLY.indexOf(id) >= 0) return '';
  if (NF.renderSeq !== offSeq) { offSeq = NF.renderSeq; offSeen = {}; }
  if (offSeen[id]) return ''; offSeen[id] = 1;
  return '<div class="hint neutral off-default" role="status" data-off="' + e(id) + '">' + e(NF.OFF_TEXT) + '</div>';
}
V.off = off;
/* B3 (31/03): věty o maketě, ukázce a příběhu dodává prezentační vrstva (NF.slots.demoTexts); jádro (produkce) mluví neutrálně jako aplikace. */
function demoText(key) { try { var t = NF.slots.demoTexts && NF.slots.demoTexts()[key]; return t ? String(t) : ''; } catch (err) { return ''; } }
V.demoText = demoText;
V.demoNote = function (key, cls) { var t = demoText(key); return t ? '<p class="small muted' + (cls ? ' ' + cls : '') + '">' + e(t) + '</p>' : ''; };
/* Pravidlo I-*, které v plánu chybí: oznámení na místě (zamítnutá R-POKYNY, jinak zamítnuté pravidlo) – obrazovka na chybějící pravidlo neodkazuje (15 odst. 12; kontrola 3, B2). */
function ruleOff(S, id) { return NF.item(S, 'R-POKYNY') && !NF.usable(S, 'R-POKYNY') ? off(S, 'R-POKYNY') : NF.item(S, id) && !NF.usable(S, id) ? off(S, id) : ''; }
/* Řádek štítků položek, které na místě působí (zásada 4; A02, 27. 10. 2026). */
function rules(S, ids, cls) { var h = ids.filter(Boolean).map(function (id) { return appr(S, id); }).filter(Boolean).join(' '); if (!h) return ''; if (!h.replace(/<span class="item-ref"[^>]*><\/span>/g, '').trim()) return h; /* u pacienta jen značky, bez prázdného řádku (SCHEMA 86) */ return '<div class="small mt-2 rules' + (cls ? ' ' + cls : '') + '">' + h + '</div>'; }
/* Zamítnuté páky rad (a pravidlo mizení): oznámení tam, kde by rada byla. */
function offLevers(S) {
  return Object.keys(NF.LEVERS).filter(function (l) { return l !== 'portion' && !NF.usable(S, NF.LEVERS[l].item); }).map(function (l) { return off(S, NF.LEVERS[l].item); }).join('') + (NF.usable(S, 'R-ZMIZELA') ? '' : off(S, 'R-ZMIZELA'));
}
V.btn = btn; V.choice = choice; V.hint = hint; V.kv = kv; V.tag = tag; V.card = card; V.appr = appr; V.off = off; V.offLevers = offLevers; V.rules = rules;

var LEVEL = { known: ['Známé jídlo', 'known'], similar: ['Podobné jídlo', 'similar'], learning: ['Učíme se', 'similar'], unstable: ['Nestálé jídlo', 'unknown'], unknown: ['Neznámé jídlo', 'unknown'], none: ['Bez vyhodnocení', 'unknown'] };
function levelTag(level, conf) { var l = LEVEL[level] || LEVEL.unknown; return tag(level === 'learning' && conf ? 'Učíme se · ' + conf.st.n + ' ' + NF.z(conf.min || 4) + ' ' + (conf.min || 4) : l[0], l[1]); }
function reactionTag(r) { return r ? tag(r.label, r.cls) : ''; }
/* Jeden nosič faktu (řemeslo 9, 19. 10. 2026): známé jídlo s reakcí má jen štítek reakce (slovo + ikona); „známé“ říká fajfka na prstenci. */
function foodBadges(conf) { return conf.level === 'known' && conf.reaction ? reactionTag(conf.reaction) : levelTag(conf.level, conf); }
V.foodBadges = foodBadges;
/* Řádek výsledku hledání (21. 10. 2026, vlastník): druhý řádek jen když nese informaci; „neznámé“ je výchozí stav a nepíše se. */
function foodOptLine(c, S, foodId, meal) {
  /* jídlo s rozdílnou dávkou u víc jídel dne: stav pro právě zapisované jídlo dne („k obědu učíme se 1 ze 4“; vlastník 25. 10. 2026) */
  var g = S && foodId ? NF.slotGroups(S, foodId, meal) : null, grp = g ? g.filter(function (x) { return x.meals.indexOf(meal) >= 0; })[0] : null, st = grp ? NF.slotStateText(S, grp) : '';
  if (st) return c.level === 'known' && c.reaction ? '<span class="badges"><small>' + st + '</small> ' + reactionTag(c.reaction) + '</span>' : '<small>' + st + '</small>';
  if (c.level === 'known') return c.reaction ? '<span class="badges">' + reactionTag(c.reaction) + '</span>' : '<small>známe</small>';
  if (c.level === 'similar') return '<small>podobné známým</small>';
  if (c.level === 'learning') return '<small>učíme se · ' + c.st.n + ' ' + NF.z(c.min || 4) + ' ' + (c.min || 4) + '</small>';
  if (c.level === 'unstable') return '<small>pokaždé jinak</small>';
  return '';
}
function markMatch(name, q) {
  var i = q ? name.toLowerCase().indexOf(String(q).trim().toLowerCase()) : -1, n = q ? String(q).trim().length : 0;
  return i < 0 || !n ? e(name) : e(name.slice(0, i)) + '<mark>' + e(name.slice(i, i + n)) + '</mark>' + e(name.slice(i + n));
}
V.levelTag = levelTag; V.reactionTag = reactionTag;

/* Ikona jídla (SVG podle druhu nebo zdroje sacharidů; nové jídlo jen názvem = talíř) + prstenec učení 1/2/3.
   Animace: po uložení zápisu se nový oblouk vykreslí a po třetím se objeví fajfka (NF.flash nastaví akce mealFinish, platí jedno vykreslení). */
function foodIco(food) { return NF.icon(NF.foodIconName(food), 'fico'); }
function ring(n, total, just) {
  total = total || 3; var arcs = '', seg = 170 / total, gap = 8;
  for (var i = 0; i < total; i++) {
    arcs += '<circle' + (just && i === n - 1 ? ' class="new"' : '') + ' cx="31" cy="31" r="27" stroke="' + (i < n ? 'var(--brand)' : 'var(--nf-line-strong)') + '" stroke-dasharray="' + (seg - gap) + ' 170" stroke-dashoffset="' + (-i * seg) + '"/>';
  }
  return '<svg viewBox="0 0 62 62" aria-hidden="true">' + arcs + '</svg>';
}
function foodIcon(S, food, conf) {
  var n = Math.min(conf.min || 4, conf.st.n), just = !!(NF.flash && NF.flash.food === food.id);
  return '<div class="emoji' + (just ? ' just' : '') + '">' + ring(n, conf.min || 4, just) + foodIco(food) + (conf.level === 'known' ? '<span class="ck">' + NF.icon('check') + '</span>' : '') + '</div>';
}
V.foodIco = foodIco; V.foodIcon = foodIcon;

/* Rozmezí vrcholů jako okno na stupnici zelená → červená (osa 4–16). */
function pos(v) { return Math.max(0, Math.min(100, (v - 4) / 12 * 100)); }
function rowTrack(label, lo, hi, cls, wide, goalV, txt) {
  if (lo == null || hi == null) return '';
  var l = pos(lo), r = pos(hi);
  return '<div class="row ' + (cls || '') + '"><span class="rl">' + e(label) + '</span><div class="track' + (wide ? ' wide' : '') + '" style="--goal:' + pos(goalV != null ? goalV : 10) + '%">' +
    '<div class="dim" style="--from:0%;--to:' + l + '%"></div><div class="dim" style="--from:' + r + '%;--to:100%"></div>' +
    '<div class="win" style="--from:' + l + '%;--to:' + (l + Math.max(2, r - l)) + '%"><b class="rng">' + (txt ? e(txt) : lo === hi ? e(NF.mmol(lo)) : e(NF.mmol(lo)) + '–' + e(NF.mmol(hi))) + '</b></div></div></div>'; /* rozmezí jednou nad oknem, nikdy přes hranici cíle (21. 10. 2026) */
}
/* Text rozmezí s hranicemi čipů: nejvyšší hodnota z čipu „nad 15“ se píše „nad 15“, ne jako číslo (nález 10, 23. 10. 2026). */
function rangeText(S, st) {
  if (st.lo == null || st.hi == null) return null;
  var over = st.usable.some(function (x) { var g = NF.glucoseOf(S, x); return g.peakBound === 'over' && g.peak === st.hi; });
  var under = st.usable.some(function (x) { var g = NF.glucoseOf(S, x); return g.peakBound === 'under' && g.peak === st.lo; });
  if (!over && !under) return null;
  if (st.lo === st.hi) return NF.mmolB(st.lo, over ? 'over' : 'under');
  return (under ? 'pod ' : '') + NF.mmol(st.lo) + '–' + (over ? 'nad ' : '') + NF.mmol(st.hi);
}
var LEVER_WITH = { addon: 's doplňkem', order: 's pořadím', walk: 's procházkou' };
/* Kontrola 4 (06 B7): stupnice popisuje minulost („dostávala“, „bývala“), nepředpovídá. 07 B4: řádek „s doplňkem“ u stažené rady se neukazuje;
   rozmezí jednou větou „Spočítáno z N vašich zápisů“, dřívější rozmezí jen v detailu jídla (detail = true). */
function peakBlock(S, food, conf, detail) {
  var t = NF.targets(S), st = conf.st;
  var rows = '', note = '', inT = '', note0 = '';
  if (conf.level === 'known') {
    var base = NF.baseStats(S, food.id, conf.meal);
    var best = NF.ill(S) ? null : NF.leverStats(S, food.id, conf.meal).filter(function (x) { return !(x.lever === 'addon' && NF.addonWithdrawn(S, food.id, conf.meal)); })[0]; /* C5: při nemoci neradíme, řádek „s radou“ se neukazuje; stažený doplněk ne (kontrola 4, 07 B4) */
    var aLo = base.n ? base.lo : st.lo, aHi = base.n ? base.hi : st.hi;
    rows += rowTrack(best ? 'bez rady' : 'obvykle', aLo, aHi, '', false, t.high, rangeText(S, base.n ? base : st));
    if (best) rows += rowTrack(LEVER_WITH[best.lever] || 's radou', best.st.lo, best.st.hi, 'adv' + (best.st.n && best.st.inTarget / best.st.n >= 0.5 ? ' ok' : ''), false, t.high); /* zeleně jen když s radou bývá v cíli */
    var half = st.peaks.slice(0, Math.ceil(st.peaks.length / 2));
    var prev = st.peaks.length > 6 ? { lo: NF.r1(NF.quantile(half, 0.1)), hi: NF.r1(NF.quantile(half, 0.9)) } : null;
    note = 'Vlevo od čáry jste v cíli. ' + (best ? 'S ' + LEVER_WITH[best.lever].slice(2) + ' to bylo <b>' + best.st.inTarget + ' ' + NF.z(best.st.n) + ' ' + best.st.n + '</b> v cíli' + (best.multi ? ' (' + best.multi + '× ' + NF.WITH_OTHER + ')' : '') + '. ' : '') + /* dvě přijaté rady: značka (A16) */
      'Spočítáno ' + NF.z(st.n) + ' ' + st.n + ' vašich zápisů' + (st.quantile ? '' : ', s dalšími se upřesní') + '.' + (detail && prev && st.quantile && (prev.lo !== st.lo || prev.hi !== st.hi) ? ' Po prvních ' + half.length + ' zápisech bývala ' + e(NF.mmol(prev.lo)) + '–' + e(NF.mmol(prev.hi)) + '.' : ''); /* SCHEMA 86: bez „krajní hodnoty se nepočítají“ (bod 6) */ /* počet „X ze N v cíli“ je v souhrnu jídla, tady se neopakuje (21. 10. 2026) */
  } else if (conf.level === 'similar') {
    /* Podobné jídlo jen směrem, slovem a ikonou, bez čísla a bez stupnice (A15, rozhodnutí vlastníka 27. 10. 2026; 15 odst. 6) */
    return '<div class="peak sim"><div class="lbl"><span>Kam se po něm glukóza dostávala</span></div>' + simDir(conf.pool) +
      '<div class="note">Podobné jídlo bývalo ' + (conf.pool && conf.pool.dir === 'in' ? 'spíš v cíli' : 'spíš nad cílem') + '. Jak je to u tohoto jídla, ukážou vaše zápisy.' + (conf.like && conf.like.length ? ' Podobné: ' + e(conf.like.map(function (f) { return f.name; }).slice(0, 2).join(', ')) + '.' : '') + '</div>' + rules(S, ['R-PODOBNOST', 'R-REAKCE']) + '</div>';
  } else if (conf.level === 'learning') {
    var imp = conf.impression, stageWord = st.n === 1 ? 'první dojem' : imp === 'mixed' ? 'zápisy se liší' : 'zatím to vypadá';
    inT = tag(stageWord, imp === 'in' ? 'ok' : imp === 'over' ? 'over' : '').replace('class="tag ', 'class="in tag ');
    rows += rowTrack(st.n === 1 ? 'tentokrát' : 'zatím', st.lo, st.hi, '', st.n === 1, t.high, rangeText(S, st));
    if (conf.pool) note0 = simDir(conf.pool); /* odhad z podobného jídla jen směrem (A15) */
    var need = Math.max(1, (conf.min || 4) - st.n), needTxt = need === 1 ? 'po dalším zápisu' : 'po dalších ' + NF.plural(need, 'zápisu', 'zápisech', 'zápisech');
    note = st.n === 1 ? ('První zápis: tentokrát ' + (imp === 'in' ? 'v cíli' : 'nad cílem') + '. Jeden zápis nestačí, ' + needTxt + ' budeme vědět víc.')
      : imp === 'mixed' ? 'Zápisy se liší (někdy v cíli, někdy nad ním). ' + NF.cap(needTxt) + ' budeme vědět, jak to je.'
      : imp === 'in' ? 'Zatím to vypadá, že po něm zůstáváte v cíli. ' + NF.cap(needTxt) + ' ho budeme znát.'
      : 'Zatím ' + NF.plural(st.n, 'zápis', 'zápisy', 'zápisů') + ' nad cílem. ' + NF.cap(needTxt) + ' budeme vědět jistě. Držte obvyklou porci.'; /* fakt a pokyn, ne „šance“ pro jídlo (hlas, 19. 10. 2026) */
  } else return '';
  var alt = conf.level === 'known' ? 'Stupnice glukózy 4 až 16 mmol/l, hranice cíle ' + NF.mmol1(t.high) + ' mmol/l. Bez rady ' + NF.mmol(aLo) + ' až ' + NF.mmol(aHi) + ' mmol/l' + (best && best.st.lo != null ? ', ' + (LEVER_WITH[best.lever] || 's radou') + ' ' + NF.mmol(best.st.lo) + ' až ' + NF.mmol(best.st.hi) + ' mmol/l' : '') + '.'
    : conf.level === 'learning' ? 'Stupnice glukózy 4 až 16 mmol/l, hranice cíle ' + NF.mmol1(t.high) + ' mmol/l. Zatím ' + st.n + ' ' + NF.z(conf.min || 4) + ' ' + (conf.min || 4) + ' zápisů: ' + NF.mmol(st.lo) + ' až ' + NF.mmol(st.hi) + ' mmol/l.'
    : '';
  return '<div class="peak"><div class="lbl"><span>Kam se po něm glukóza dostávala</span>' + (inT || '') + '</div>' +
    '<div class="rows" role="img" aria-label="' + e(alt) + '"><div class="goal" style="--f:' + (pos(t.high) / 100) + '"><span>hranice cíle ' + e(NF.mmol1(t.high)) + ' mmol/l</span></div>' + rows + '</div>' +
    '<div class="axis" aria-hidden="true">' + [4, 7, 10, 13, 16].map(function (v) { return '<span style="--f:' + (pos(v) / 100) + '">' + v + '</span>'; }).join('') + '</div>' +
    '<div class="axis-words"><span>v cíli</span><span>nad cílem</span></div>' + note0 +
    '<div class="note">' + note + '</div>' + rules(S, ['R-REAKCE', conf.pool ? 'R-PODOBNOST' : null]) + '</div>'; /* štítek R-REAKCE u stupnice (A02) */
}
/* Směr podle podobného jídla: slovo a ikona, bez čísla (A15). */
function simDir(pool) {
  if (!pool) return '';
  return '<p class="sim-dir">' + (pool.dir === 'in' ? tag('Podle podobného jídla: spíš v cíli', 'ok') : tag('Podle podobného jídla: spíš nad cílem', 'warn')) + '</p>';
}
V.peakBlock = peakBlock; V.simDir = simDir;

/* ---------- navigace ---------- */
function tabbar(S) {
  var items = [['today', 'Dnes', 'home'], ['foods', 'Jídla', 'utensils'], ['plan', 'Můj plán', 'list'], ['safety', 'Bezpečí', 'shield']]; /* SCHEMA 86: „Můj plán“ (rozhodnutí vlastníka 5. 11. 2026, bod 4) */
  return '<nav class="tabbar" aria-label="Hlavní nabídka">' + items.map(function (it) {
    var on = S.page === it[0] || (S.page === 'food' && it[0] === 'foods') || (S.page === 'preview' && it[0] === 'plan') || (S.page === 'support' && it[0] === 'safety'); /* detail jídla patří pod Jídla, report a nahrání exportu pod Plán, podpora pod Bezpečí */
    return '<button type="button" data-action="page" data-value="' + it[0] + '" class="' + (on ? 'active' : '') + '"' + (on ? ' aria-current="page"' : '') + '><span class="ic" aria-hidden="true">' + NF.icon(it[2]) + '</span>' + e(it[1]) + '</button>';
  }).join('') + '</nav>';
}
V.patient = function (S, forcedPage) { return patientWrap(function () { return patientScreen(S, forcedPage); }); };
function patientScreen(S, forcedPage) {
  var page = forcedPage || S.page, body;
  var p = NF.activePlan(S);
  if (!forcedPage && p && !p.understood && ['takeover', 'understand', 'newplan'].indexOf(page) < 0) page = p.previousId ? 'newplan' : 'takeover';
  switch (page) {
    case 'takeover': body = V.takeover(S); break;
    case 'understand': body = V.understand(S); break;
    case 'meal': body = V.meal(S); break;
    case 'foods': body = V.foods(S); break;
    case 'food': body = V.foodDetail(S); break;
    case 'plan': body = V.planScreen(S); break;
    case 'safety': body = V.safety(S); break;
    case 'support': body = V.support(S); break;
    case 'preview': body = V.preview(S); break;
    case 'newplan': body = V.newPlan(S); break;
    default: body = V.today(S);
  }
  var nav = ['understand', 'takeover', 'meal', 'newplan'].indexOf(page) === -1;
  /* štítek DEMO na každé pacientské obrazovce, ne jen na Dnes: snímek kroku ani Bezpečí nevypadá jako skutečný pacient (LF-25, 19. 10. 2026) */
  /* vlastník 26. 10. 2026: štítek DEMO jednou, v liště ukázky (NF.slots.demoBar); bez prezentační vrstvy ho nese obrazovka sama */
  return '<div class="patient-shell"><div class="patient page-' + e(page) + '">' + (NF.slots.demoBar || S.role === 'nurse' ? '' : '<p class="demo-band"><span class="demo-flag">DEMO · syntetická data · není určeno pro léčbu</span></p>') /* B4 (31/03): v náhledu telefonu u sestry ho už nese lišta obrazovky */ + body + '</div>' + (nav ? tabbar(S) : '') + '</div>';

}

function head(S, eyebrow, h1) { return '<p class="eyebrow">' + e(eyebrow) + '</p><h1>' + e(h1) + '</h1>'; }
function greeting(S) { var h = NF.parse(S.clock).getHours(); return h < 10 ? 'Dobré ráno' : h < 18 ? 'Dobrý den' : 'Dobrý večer'; }
function mealNow(S) { var d = NF.parse(S.clock), h = d.getHours() + d.getMinutes() / 60, dp = NF.daypartEnd(S); return h < dp.breakfast ? 'breakfast' : h < dp.lunch ? 'lunch' : 'dinner'; } /* SCHEMA 87: denní doby z registru (S-PRIPOMINKY) */
V.mealNow = mealNow;

/* ---------- vysvětlující animace (vlastník 15. 10. 2026: pohyb má vysvětlovat podstatné; přehraje se jednou, Přehrát znovu) ----------
   Vše CSS na inline SVG; statický stav = konec animace (při omezení pohybu se ukáže rovnou). */
/* Ikona ze sady (Lucide) vložená do scény: x, y = levý horní roh, s = velikost. */
function sceneIcon(name, x, y, s, cls) {
  var body = NF.ICONS[name]; if (!body) return '';
  return '<svg class="sico' + (cls ? ' ' + cls : '') + '" x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" aria-hidden="true">' + body + '</svg>';
}
/* Talíř ve scéně: dva kruhy a porce (dvoubarevně, bez ručních tahů). */
function scenePlate(cx, cy, r, foodR, cls) {
  var s = r * 0.9;
  return '<g class="splate' + (cls ? ' ' + cls : '') + '"><circle class="p1" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/><circle class="p2" cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.7) + '"/>' +
    (foodR ? '<circle class="pfood" cx="' + cx + '" cy="' + cy + '" r="' + foodR + '"/>' : sceneIcon('utensils', cx - s / 2, cy - s / 2, s, 'pico')) + '</g>';
}
V.sceneIcon = sceneIcon; V.scenePlate = scenePlate;
function animWrap(id, body, caption) {
  return '<div class="anim play" data-anim="' + id + '">' + body + (caption ? '<div class="anim-cap">' + caption + '</div>' : '') +
    '<div class="anim-ctl">' + btn(NF.icon('refresh') + ' Přehrát znovu', 'animReplay', id, 'sm quiet') + '</div></div>';
}
/* Klíč a talíř: dávka je klíč vyrobený na obvyklou porci. */
function explainerKey(S, noTitle) {
  var svg = '<svg viewBox="0 0 320 162" role="img" aria-label="Dávka inzulinu je nastavená na obvyklou porci: s ní zůstane glukóza v cíli. Větší porce ji vyžene nad cíl; návrat k obvyklé porci ji vrátí.">' +
    '<line class="kbase" x1="46" y1="98" x2="104" y2="98"/>' +
    '<rect class="kband" x="104" y="88" width="208" height="20" rx="5"/><text class="kt" x="310" y="84" text-anchor="end">v cíli</text>' +
    sceneIcon('syringe', 6, 80, 36, 'ksyr') +
    '<g class="kplate"><circle class="krim" cx="76" cy="98" r="22"/><circle class="krim2" cx="76" cy="98" r="15.5"/><circle class="kfood" cx="76" cy="98" r="9"/></g>' +
    '<path class="kline" d="M104 101 C130 100 150 92 175 91 S230 95 262 98 S300 102 312 102"/>' +
    '<path class="khigh" d="M104 101 C130 92 150 42 185 36 S240 60 268 84 S300 97 312 98"/>' +
    '<text class="kl kl1" x="104" y="124">1 · Obvyklá porce → v cíli</text>' +
    '<text class="kl kl2" x="104" y="140">2 · Větší porce → nad cíl</text>' +
    '<text class="kl kl3" x="104" y="156">3 · Zpět k obvyklé → zase v cíli</text></svg>';
  return card((noTitle ? '' : '<h2>Jak to funguje</h2>') + '<p class="small muted">Dávka inzulinu od lékaře je jako klíč vyrobený na vaši obvyklou porci. My vám pomůžeme porci držet a z vaší reakce se učíme.</p>' + animWrap('key', svg));
}
/* Co aplikace nedělá: tři přeškrtnuté piktogramy. */
function notsCard(S, noHead) {
  var items = [['sigma', 'nepočítáme sacharidy'], ['syringe', 'neměníme dávku inzulinu'], ['eye', 'nikdo nečte zápisy mezi kontrolami']];
  var body = '<div class="nots">' + items.map(function (it, i) {
    return '<div class="not"><span class="pic"><span class="pi">' + NF.icon(it[0]) + '</span><svg class="strike-svg" viewBox="0 0 40 40" aria-hidden="true"><path class="strike s' + (i + 1) + '" d="M6 34L34 6"/></svg></span><small>' + e(it[1]) + '</small></div>';
  }).join('') + '</div>';
  /* Kontrola 4 (06 A2): NutriFee nízkou ani vysokou glukózu nehlídá; upozornění si pacient nastaví v aplikaci senzoru se sestrou (bod zaučení „alerts“). */
  var rulesOn = NF.instructions(S).length > 0;
  return card((noHead ? '' : '<h2>Co neděláme</h2>') + animWrap('nots', body, 'Nízkou ani vysokou glukózu nehlídáme. Upozornění na ni si nastavte v aplikaci senzoru – sestra vám s tím pomůže. ' + (rulesOn ? 'Když vám není dobře, řiďte se pravidly v Bezpečí.' : 'Když vám není dobře, v Bezpečí najdete, kam se obrátit.')));
}
/* Osa inzulinu v kroku 1: stříkačka před talířem / za ním / neznámo; pás, kdy se zápis počítá do učení. */
function insulinAxis(S, m) {
  var t = NF.tolerance(S, 'learn'), k = 2, left = 160 - t.before * k, w = (t.before + t.after) * k, b = ['as', 'other', 'before', 'unknown'].indexOf(m.bolus) >= 0 ? m.bolus : 'none';
  var alt = 'Osa jídla: inzulin ' + (b === 'as' || b === 'other' ? 'už podaný před jídlem' : b === 'before' ? 'ještě ne, až před jídlem' : b === 'unknown' ? 'nevíme, bereme jako podaný' : 'zatím nevybráno') + '. Do učení se počítá inzulin nejvýš ' + t.before + ' minut před jídlem a ' + t.after + ' minut po něm.';
  return '<div class="ins-axis b-' + b + '" role="img" aria-label="' + e(alt) + '" style="--sx-as:' + (left + 16) + 'px;--sx-other:' + (left + 34) + 'px;--sx-before:' + (left - 34) + 'px"><svg viewBox="0 0 320 96" aria-hidden="true">' +
    '<rect class="tol" x="' + left + '" y="18" width="' + w + '" height="44" rx="8"/><line class="ax" x1="12" y1="40" x2="308" y2="40"/>' +
    '<line class="tick" x1="' + left + '" y1="62" x2="' + left + '" y2="70"/><line class="tick" x1="' + (left + w) + '" y1="62" x2="' + (left + w) + '" y2="70"/>' +
    scenePlate(160, 40, 17, null, 'aplate') +
    '<g class="syr">' + sceneIcon('syringe', -13, -13, 26) + '<text class="q" x="0" y="-17" text-anchor="middle">?</text></g>' +
    '<text class="axl" x="' + left + '" y="82" text-anchor="middle">' + t.before + ' min před</text><text class="axl" x="' + (left + w) + '" y="82" text-anchor="middle">' + t.after + ' min po</text>' +
    '</svg><p class="fig-cap">Z jídel, kde byl inzulin v tomto pásmu, se o vás dozvíme nejvíc.</p></div>' /* kontrola 4 (07 B4): bez slova „učení“ a bez pokynu k času dávky */ /* popisek jako text, na telefonu čitelný (21. 10. 2026) */;
}
/* Mikroanimace rad: pořadí jídla · doplněk · procházka · porce.
   Jeden rámeček pro všechny obrázky rad (řemeslo 7, 19. 10. 2026): viewBox 300 × 100, hlavní talíř r 36, druhý r 22, stejný tah;
   čísla a popisky nikdy pod ručičkou ani přes obrázek, pořadí se čte zleva. */
function figPlate(cx, r, foodR, cls) { return scenePlate(cx, 50, r, foodR, cls); }
function leverFig(lever, svg, cap) {
  return '<div class="lever-anim lever-fig play" data-anim="' + lever + '" data-lever="' + lever + '"><svg viewBox="0 0 300 100" aria-hidden="true">' + svg + '</svg>' + (cap ? '<p class="fig-cap">' + cap + '</p>' : '') + '</div>'; /* bez „Přehrát znovu“ u mikroanimací (19. 10. 2026) */
}
function leverAnim(lever, food, S) {
  if (lever === 'order') {
    /* Kontrola 3, A2: popisek prvního dílu = složky z věty rady (šablona R-PORADI), u nového jídla obecné „zelenina nebo maso“ */
    var parts = S && NF.dbFood(food) ? NF.orderParts(S, food) : [], first = parts.length ? parts.join(' a ') : '';
    /* úhly po směru hodin od dvanácté; první díl je vlevo nahoře, pořadí se čte zleva doprava */
    var segs = first ? [[first, 'M100 50L100 14A36 36 0 0 0 100 86z', [82, 56]], ['zbytek', 'M100 50L100 86A36 36 0 0 0 100 14z', [118, 56]]]
      : [['zelenina nebo maso', 'M100 50L100 14A36 36 0 0 0 100 86z', [82, 56]], ['zbytek', 'M100 50L100 86A36 36 0 0 0 100 14z', [118, 56]]]; /* věta rady říká „zeleninu nebo maso“, tedy dva díly (21. 10. 2026) */
    var svg = '<circle class="prim" cx="100" cy="50" r="36"/>' + segs.map(function (sg, i) {
      return '<path class="sec s' + (i + 1) + '" d="' + sg[1] + '"/><text class="n n' + (i + 1) + '" x="' + sg[2][0] + '" y="' + sg[2][1] + '" text-anchor="middle">' + (i + 1) + '</text>';
    }).join('');
    /* SCHEMA 86 (oprava 05, 02 1.20): popisky pořadí jako text pod obrázkem – v SVG se na 390 px ořízly („1 zelenina nebo ma…“) */
    return leverFig('order', svg, segs.map(function (sg, i) { return (i + 1) + '\u00a0' + e(sg[0]); }).join(' · '));
  }
  if (lever === 'addon') return leverFig('addon', figPlate(100, 36, null) + '<text class="plus" x="150" y="60" text-anchor="middle">+</text><g class="bowl">' + figPlate(200, 22, null) + '</g>');
  if (lever === 'walk') return leverFig('walk', sceneIcon('walk', 72, 22, 56, 'st st1') +
    '<circle class="ringbg" cx="200" cy="44" r="30"/><circle class="ringfg" cx="200" cy="44" r="30"/><line class="hand" x1="200" y1="44" x2="200" y2="22"/><circle class="hub" cx="200" cy="44" r="3"/><text class="min" x="200" y="96" text-anchor="middle">15 min</text>');
  return '';
}
/* Rada k porci: táž mřížka – talíř s větší (menší) porcí → talíř s obvyklou, porce na pravém talíři se pohybem vrátí k obvyklé. */
function plateMove(portion) {
  if (portion !== 'bigger' && portion !== 'smaller') return '';
  return leverFig('portion', figPlate(90, 36, portion === 'bigger' ? 24 : 9) + sceneIcon('arrow-right', 136, 36, 28, 'farr') + figPlate(210, 36, 16, 'anim-' + portion), portion === 'bigger' ? 'z větší zpět k obvyklé' : 'z menší zpět k obvyklé');
}
V.explainerKey = explainerKey; V.notsCard = notsCard; V.insulinAxis = insulinAxis; V.leverAnim = leverAnim; V.plateMove = plateMove;

/* ---------- převzetí a ověření ----------
   Průvodce o šesti stránkách (rozhodnutí vlastníka 19. 10. 2026): každá stránka jedna myšlenka, hlavička se Zpět a pruhem jako u jídla.
   ① co chceme do kontroly ② dávky + zpětné přečtení ③ návyky ④ jak NutriFee funguje ⑤ co aplikace nedělá ⑥ kontrolní otázka. */
var TAKEOVER = ['Co chceme do kontroly', 'Vaše dávky inzulinu', 'Vaše návyky', 'Jak to funguje', 'Co neděláme', 'Uvidí lékař můj zápis hned?'];
function takeoverHead(S, p, n) {
  var back = n > 1 ? btn(NF.icon('chevron-left') + ' Zpět', 'takeoverPage', String(n - 1), 'back') : '';
  return '<div class="stephead">' + (back || '<span></span>') + safetyBtn() + '</div>' + head(S, 'Váš plán · ' + n + ' ze 6', TAKEOVER[n - 1]) /* SCHEMA 86 (02 odd. 2): bez kódu plánu „P1“ */ +
    '<div class="msteps" aria-hidden="true">' + [1, 2, 3, 4, 5, 6].map(function (i) { return '<span class="' + (i <= n ? 'on' : '') + '"></span>'; }).join('') + '</div>';
}
function takeoverNext(n, label, disabled, why) {
  return '<div class="actions">' + btn(label || 'Další →', 'takeoverPage', String(n + 1), 'primary big', disabled ? ' disabled' : '') + '</div>' + (disabled && why ? '<p class="small muted ta-c">' + why + '</p>' : '');
}
V.takeover = function (S) {
  var p = NF.activePlan(S);
  if (!p) return head(S, 'V ordinaci', 'Plán zatím nemáte') + card('<p>Lékař s vámi právě prochází zařazení. Až vám plán vydá, uvidíte ho tady.</p>');
  /* Bez dokončeného zaučení se převzetí zastaví hned na první stránce (A26, 27. 10. 2026): pacient neprojde šest stránek, aby se nakonec dozvěděl, že nemůže začít. */
  var trained = !!(S.training && S.training.result === 'done');
  var n = trained ? Math.max(1, Math.min(6, (S.onboarding && S.onboarding.page) || 1)) : 1;
  if (n === 6) return V.understand(S);
  var habits = NF.planHabits(S, p.id), rb = S.onboarding.readback;
  var out = takeoverHead(S, p, n);
  if (n === 1 && !trained) {
    out += hint('<b>Zaučení u sestry nebylo dokončeno.</b> Plán začne platit, až ho sestra dokončí. Domluvte si se sestrou nový termín.', 'over'); /* C7 (31/02): pacient ví, co dál */
  } else if (n === 1) {
    var T = NF.texts(S, 'S-CESTA');
    out += card('<p class="lead">' + (T && T.goal ? T.goal : 'Abychom poznali vaše běžná jídla a bylo jasné, co vám u nich pomáhá.') + '</p>', 'tint') +
      '<p class="small muted inset">Projdeme spolu pět krátkých stránek a jednu otázku. Trvá to pár minut.</p>' + takeoverNext(1, 'Začít →');
  } else if (n === 2) {
    out += card(dosesTable(p) + '<p class="small muted mt-3 mb-0">Určil je lékař. My je jen připomínáme a ptáme se, jestli byl inzulin podaný. Nikdy je nepočítáme ani neměníme.</p>') +
      card('<h2>Souhlasí s tím, co vám řekl lékař?</h2><div class="choice-row col" role="group" aria-label="Souhlasí dávky s tím, co vám řekl lékař?">' +
        choice(opt('Ano, souhlasí'), 'doseReadback', 'yes', rb === 'yes', 'opt') + choice(opt('Ne, něco nesedí'), 'doseReadback', 'no', rb === 'no', 'opt') + '</div>' +
        (rb === 'no' ? hint('<b>Ukažte telefon sestře.</b> Plán zatím nepřebírejte; sestra dávky ověří s lékařem.', 'over') : '')) + /* zpětné přečtení: jediná nezávislá kontrola zadání dávky (rozhodnutí vlastníka 19. 10. 2026) */
      takeoverNext(2, null, rb !== 'yes', rb === 'no' ? 'Pokračovat půjde, až sestra dávky ověří.' : 'Nejdřív odpovězte, jestli dávky souhlasí.');
  } else if (n === 3) {
    out += card((habits.length ? '<ul class="plain">' + habits.map(function (h) { return '<li><b>' + e(h.title) + '</b><br><span class="small muted">' + e(h.why) + '</span></li>'; }).join('') + '</ul>' : '') + (NF.item(S, 'R-NAVYKY') && !NF.usable(S, 'R-NAVYKY') ? off(S, 'R-NAVYKY') : '')) + takeoverNext(3);
  } else if (n === 4) {
    out += explainerKey(S, true) + takeoverNext(4);
  } else if (n === 5) {
    out += notsCard(S, true) /* C9 (31/03): stránka už nadpis „Co neděláme“ má */ + card('<h2>Bezpečnostní pravidla</h2>' + instructionsList(S, p, true) + '<p class="small muted mt-2 mb-0">Celé znění najdete kdykoli v části Bezpečí.</p>') +
      takeoverNext(5, 'Další: jedna otázka →');
  }
  return out;
};
V.understand = function (S) {
  var p = NF.activePlan(S), a = S.onboarding.checkAnswer, trained = !!(S.training && S.training.result === 'done');
  return (p ? takeoverHead(S, p, 6) : head(S, 'V ordinaci · jedna otázka', TAKEOVER[5])) +
    card('<p class="muted">Za odpověď vás nikdo nehodnotí. Jen si ověříme, že víte, jak to u nás funguje.</p>' +
      '<div class="choice-row col" role="group" aria-label="Uvidí lékař můj zápis hned?">' + choice(opt('Ano, hned'), 'answerCheck', 'yes', a === 'yes', 'opt' + (a === 'yes' ? ' wrong' : '')) + choice(opt('Ne, až na kontrole'), 'answerCheck', 'no', a === 'no', 'opt') + '</div>' +
      (a === 'yes' ? hint('<b>Ještě ne.</b> Zápis <b>není zpráva do ordinace</b> – nikdo ho průběžně nečte. Lékař ho uvidí až v přehledu na kontrole. Když máte potíže teď, otevřete Bezpečí.', 'over') : '') +
      (a === 'no' ? hint('<b>Přesně tak.</b> Zápisy slouží vám a rozhovoru na kontrole. S potížemi vám teď pomůže Bezpečí; když nefunguje NutriFee, napište podpoře z Bezpečí.', 'ok') : '')) +
    '<div class="actions">' + btn('Plán přebírám', 'confirmUnderstanding', null, 'primary big', a === 'no' && trained ? '' : ' disabled') + '</div>' +
    (a !== 'no' ? '<p class="small muted ta-c">Plán převezmete po správné odpovědi.</p>' : !trained ? hint('<b>Zaučení u sestry nebylo dokončeno.</b> Návyky zatím nezačnou platit. Domluvte se se sestrou na novém zaučení.', 'over') : '');
};

/* Token dávky (Podpis A, rozhodnutí vlastníka 20. 10. 2026): pilulka s ikonou klíče, číslem a „j.“ všude, kde pacient dávku vidí.
   Stavy: připomínáme (výchozí, obrys) · done = píchnuto (fajfka místo klíče) · new = nová od lékaře · was = dřívější, přeškrtnutá.
   Ukazuje jen předepsané číslo – nikdy směr ani rozdíl („+2“). V textech se říká „dávka“, slovo „klíč“ se nezavádí. */
function dose(units, state, size) {
  var word = state === 'done' ? 'píchnuto' : state === 'new' ? 'nová' : '';
  var uj = NF.plural(units, 'jednotka', 'jednotky', 'jednotek'); var aria = state === 'was' ? 'dřív ' + uj : uj + (word ? ', ' + word : '');
  return '<span class="dose' + (state ? ' ' + state : '') + (size ? ' ' + size : '') + '" role="img" aria-label="' + e(aria) + '">' + NF.icon(state === 'done' ? 'check' : 'key-round') + '<b>' + units + '</b><span class="u">j.</span>' + (word ? '<span class="st">' + word + '</span>' : '') + '</span>';
}
V.dose = dose;
/* S-DAVKA (vlastník 1. 11. 2026): původ a datum dávky podle plánu. */
function doseOrigin(S, key) { var o = NF.doseOrigin(S, key); return o ? '<p class="small mt-2 mb-0 dose-origin">' + e(o.text) + '</p>' : ''; }
V.doseOrigin = doseOrigin;
/* Oznámení telefonu (kontrola 4, bod 4, S-PRIPOMINKY): komponenta jádra. Telefon ukáže oznámení mimo aplikaci; klepnutí otevře Dnes.
   Ukázka ji v příběhu vykreslí nad obrazovkou pacienta (prezentační vrstva); jádro ji samo do obrazovek nevkládá. */
function phoneNotice(S, list) {
  list = list || NF.notifications(S); if (!list.length) return '';
  return '<div class="phone-notices" role="region" aria-label="Oznámení telefonu">' + list.map(function (n) {
    return '<button type="button" class="phone-notice" data-action="page" data-value="today" data-notice="' + e(n.key) + '"><span class="pn-head"><span class="pn-app">' + NF.icon('message') + ' NutriFee</span><span class="pn-time">' + e(NF.fmtClock(n.at)) + '</span></span><span class="pn-text">' + e(n.text) + '</span></button>';
  }).join('') + '</div>';
}
V.phoneNotice = phoneNotice;
/* Tabulka dávek; s předchozím plánem má změněný řádek štítek „nová“ a přeškrtnutou starou hodnotu (LF-21, 19. 10. 2026). */
function dosesTable(p, prev) {
  var d = p.doses, val = function (k) { var ch = prev && prev.doses[k] && prev.doses[k].units !== d[k].units; return '<span class="dose-pair">' + (ch ? dose(prev.doses[k].units, 'was', 'sm') + '<span class="arr" aria-hidden="true">→</span>' : '') + dose(d[k].units, ch ? 'new' : '', 'sm') + '</span>'; };
  return '<div>' + NF.MEALS.map(function (m) { return kv(NF.mealLabel(m[0], true), val(m[0])); }).join('') + '<div class="kv basal-kv"><span>' + NF.icon('moon') + ' Inzulin na noc (bazál)\u00a0·\u00a0' + e(d.basal.time) + '</span><strong>' + val('basal') + '</strong></div></div>';
}
/* Dávka změněná lékařem: v kroku 1 prvních NOVA_JIDEL jídel po změně „nová · dřív 8 j.“, aby pacient nepíchl starou ze zvyku (LF-21). */
var NOVA_JIDEL = 3;
function newDose(S, p, meal) {
  var prev = p && p.previousId ? NF.planById(S, p.previousId) : null;
  if (!prev || !prev.doses[meal] || !p.doses[meal] || prev.doses[meal].units === p.doses[meal].units) return null;
  return S.episodes.filter(function (x) { return x.planId === p.id && x.meal === meal; }).length < NOVA_JIDEL ? { was: prev.doses[meal].units } : null;
}
V.newDose = newDose;
V.dosesTable = dosesTable;
function instructionsList(S, p, compact, order) {
  var cat = NF.instructionCatalog();
  if (NF.item(S, 'R-POKYNY') && !NF.usable(S, 'R-POKYNY')) return off(S, 'R-POKYNY') || '<p class="small muted">Bezpečnostní pravidla teď nejsou součástí plánu.</p>'; /* zamítnutá R-POKYNY: místo pokynů oznámení (A05, Q1) */
  var list = ((p && p.instructions) || []).slice();
  if (PT > 0 && !compact && order) list = list.filter(function (i) { return i.id !== 'I-KONTAKT'; }); /* SCHEMA 86: v Bezpečí pravidlo „Kontakty“ neopakuje „Kam se obrátit“ (01 3a); jeho značka je u kontaktů */
  if (order) list.sort(function (x, y) { var ix = order.indexOf(x.id), iy = order.indexOf(y.id); return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy); }); /* nejnaléhavější pokyny první (18. 10. 2026) */
  if (!list.length) return '<p class="small muted">V plánu zatím nejsou žádná bezpečnostní pravidla.</p>';
  if (compact) return '<ul class="plain">' + list.map(function (i) { var c = cat.filter(function (x) { return x.id === i.id; })[0] || { title: i.id }; return '<li>' + e(c.title) + '</li>'; }).join('') + '</ul>'; /* převzetí plánu: jen názvy, celé znění v Bezpečí (19. 10. 2026) */
  return '<ul class="plain doc-list' + (PT > 0 ? ' rule-list' : '') + '">' + list.map(function (i) {
    var c = cat.filter(function (x) { return x.id === i.id; })[0] || { title: i.id, text: '' };
    if (!NF.usable(S, i.id)) return '<li><b>' + e(c.title) + '</b> ' + off(S, i.id) + '</li>'; /* zamítnutý pokyn: na jeho místě oznámení, ne text (zásada 4, 23. 10. 2026) */
    var txt = NF.instrHtml(NF.instrTextOf(S, c), i.value); /* bez odkazu na chybějící pravidlo (kontrola 4, B6) */
    /* SCHEMA 86 (rozhodnutí vlastníka 5. 11. 2026, bod 2): u pacienta (Bezpečí) seznam názvů, celé znění po klepnutí; „O pravidle“ uvnitř. Lékař a sestra vidí znění celé. */
    if (PT > 0) return '<li><details class="more rule-row"><summary>' + e(c.title) + '</summary><p class="doc-q full">' + txt + '</p></details>' + appr(S, i.id) + '</li>';
    return '<li><b>' + e(c.title) + '</b> ' + appr(S, i.id) + '<p class="doc-q">' + txt + '</p></li>'; /* každé pravidlo je položka registru (21. 10. 2026); bez uvozovek a podpisu lékaře (SCHEMA 74) */
  }).join('') + cat.filter(function (c) { return NF.item(S, c.id) && !NF.usable(S, c.id) && !list.some(function (i) { return i.id === c.id; }); }).map(function (c) { return '<li><b>' + e(c.title) + '</b> ' + off(S, c.id) + '</li>'; }).join('') + /* zamítnutý pokyn, který v plánu chybí: oznámení na jeho místě (nález 9e) */
    '</ul>';
}
V.instructionsList = instructionsList;
/* Bezpečnostní pravidlo (rozhodnutí vlastníka 27. 10. 2026, SCHEMA 74; ruší „hlas lékaře jako citaci“ z 19. 10. 2026): obecné pravidlo NutriFee schválené garantem,
   stejné pro všechny – vysazené větším písmem, bez uvozovek a bez podpisu lékaře (lékař pravidla nepíše ani nevybírá). Prázdný řetězec, když pravidlo v plánu není. */
function ruleOf(S, id) {
  var cat = NF.instructionCatalog();
  var i = NF.instructions(S).filter(function (x) { return x.id === id; })[0], c = cat.filter(function (x) { return x.id === id; })[0];
  if (!i || !c || !NF.usable(S, id)) return null; /* zamítnuté pravidlo nepůsobí (zásada 4, 23. 10. 2026) */
  return { c: c, value: i.value, parts: NF.instrParts(S, c) };
}
function instructionText(S, id, drop) {
  var r = ruleOf(S, id); if (!r) return '';
  var t = NF.instrTextOf(S, r.c); if (drop) t = Object.assign({}, t, { text: String(t.text).replace(drop, '').trim() });
  return '<div class="doc-voice"><p class="doc-q">' + NF.instrHtml(t, r.value) + '</p></div>';
}
var fillV = function (r, t) { return NF.instrHtml({ text: t, unit: r.c.unit }, r.value); };
/* SCHEMA 86 (rozhodnutí vlastníka 5. 11. 2026, bod 2): celé znění je vždy o jedno klepnutí dál – řádek „Celé pravidlo“ (jedna úroveň rozbalení, P11).
   Uvnitř je i „O pravidle“ (rozhodnutí vlastníka 30. 10. 2026, bod 10) a značka položky registru. */
function ruleFull(S, id, label, drop) {
  var q = instructionText(S, id, drop); if (!q) return '';
  return '<details class="more rule-full mt-2"><summary>' + e(label || 'Celé pravidlo') + '</summary>' + q.replace('class="doc-q"', 'class="doc-q full"') +
    '<p class="small muted mt-2 mb-0"><b>O pravidle:</b> Je stejné pro všechny pacienty NutriFee. Připravil ho NutriFee a posoudil lékař.</p></details>' + rules(S, [id]);
}
V.ruleFull = ruleFull;
/* V okamžiku události (volba „pod 4“, „nad 15“, „Nevím“, odpověď „Ano, pod 4“, menší porce po píchnutí): první krok velkým písmem, „Co dál“ v bodech, celé pravidlo na klepnutí. */
function ruleEventBody(S, id) {
  var r = ruleOf(S, id); if (!r) return '';
  return '<p class="rule-first">' + fillV(r, r.parts.first) + '</p>' + (r.parts.next.length ? '<p class="eyebrow mt-3 mb-1">Co dál</p><ul class="bul rule-next">' + r.parts.next.map(function (x) { return '<li>' + fillV(r, x) + '</li>'; }).join('') + '</ul>' : '') + ruleFull(S, id);
}
/* Jinde (karta na Dnes, otázka, nemoc): jedna věta a „Celé pravidlo“. */
function ruleShortBody(S, id) {
  var r = ruleOf(S, id); if (!r) return '';
  return '<p class="rule-short">' + fillV(r, r.parts.short) + '</p>' + ruleFull(S, id);
}
V.ruleEventBody = ruleEventBody; V.ruleShortBody = ruleShortBody;
function ruleCard(S, id, title, extra, cls, body) {
  var pokynyOff = NF.item(S, 'R-POKYNY') && !NF.usable(S, 'R-POKYNY'), itemOff = !!NF.item(S, id) && !NF.usable(S, id);
  if (!body && !extra && !pokynyOff && !itemOff) return '';
  /* bez pravidel (zamítnutá R-POKYNY) nebo se zamítnutým pravidlem oznámení na místě textu (A05; B18, nezávislá kontrola 27. 10. 2026) */
  return card('<p class="eyebrow doc-h">' + NF.icon('shield') + ' ' + e(title || 'Bezpečnostní pravidlo') + '</p>' + (body || (pokynyOff ? off(S, 'R-POKYNY') : itemOff ? off(S, id) : '')) + (extra || ''), 'doc' + (cls ? ' ' + cls : ''));
}
/* Bezpečnostní karta s pravidlem krátce (název, jedna věta, Celé pravidlo). */
function doctorCard(S, id, title, extra, cls) { return ruleCard(S, id, title, extra, cls, ruleShortBody(S, id)); }
/* Bezpečnostní karta v okamžiku události (první krok velkým písmem, Co dál, Celé pravidlo). */
function eventCard(S, id, title, extra, cls) { return ruleCard(S, id, title, extra, (cls ? cls + ' ' : '') + 'event', ruleEventBody(S, id)); }
V.eventCard = eventCard;
/* Čip „nad 15“ (glukóza teď nebo nejvyšší po jídle): hned pravidlo k vysoké glukóze I-VYSOKA (vlastník 27. 10. 2026, SCHEMA 74); zamítnuté pravidlo → oznámení na místě. */
/* past = hodnota z minulosti (nejvyšší po jídle, zpětný zápis): aplikace nezná hodnotu teď. SCHEMA 86 (oprava 05): rozlišit „teď“ a „tehdy“ – nejdřív
   „Podívejte se, kolik ukazuje senzor teď“ (text položky I-VYSOKA), pravidlo až pod tím krátce, celé na klepnutí; nesmí znít jako poplach teď. */
function highCard(S, title, past) {
  if (NF.item(S, 'I-VYSOKA') && !NF.usable(S, 'I-VYSOKA')) return card('<p class="eyebrow doc-h">' + NF.icon('shield') + ' ' + e(title) + '</p>' + off(S, 'I-VYSOKA'), 'doc warn high-now');
  var r = ruleOf(S, 'I-VYSOKA'), T = NF.texts(S, 'I-VYSOKA');
  if (!r) return ruleCard(S, 'I-VYSOKA', title, '', 'warn high-now');
  if (!past || !T || !T.minula) return eventCard(S, 'I-VYSOKA', title, '', 'warn high-now');
  return card('<p class="eyebrow doc-h">' + NF.icon('shield') + ' ' + e(title) + '</p><p class="rule-first">' + NF.instrHtml({ text: T.minula, unit: 'mmol/l' }, r.value) + '</p>' +
    '<p class="rule-short">' + fillV(r, r.parts.first) + '</p>' + ruleFull(S, 'I-VYSOKA'), 'doc warn high-past event');
}
V.instructionText = instructionText; V.doctorCard = doctorCard; V.highCard = highCard;

/* Pravidla pro nemoc: bazál a inzulin k jídlu vedle sebe (rozdělené pravidlo, 18. 10. 2026), ostatní pravidla sbalená. */
function illnessInstructions(S, p) {
  var cat = NF.instructionCatalog(), list = NF.instructions(S);
  if (NF.item(S, 'R-POKYNY') && !NF.usable(S, 'R-POKYNY')) return card('<h2>Pravidla pro nemoc</h2>' + off(S, 'R-POKYNY'), 'ill');
  var one = function (id, cls) {
    var i = list.filter(function (x) { return x.id === id; })[0], c = cat.filter(function (x) { return x.id === id; })[0];
    if (!i || !c) return '';
    if (!NF.usable(S, id)) return '<div class="box' + (cls || '') + '"><div class="k">' + e(c.title) + '</div>' + off(S, id) + '</div>';
    return '<div class="box' + (cls || '') + '"><div class="k">' + e(c.title) + '</div>' + ruleShortBody(S, id) + '</div>'; /* SCHEMA 86: krátce a „Celé pravidlo“ (rozhodnutí vlastníka 5. 11. 2026, bod 2) */
  };
  /* Kontrola 3 (prohlížeč M3): obrazovka pacienta má šířku telefonu i v rámečku na desktopu – dvě karty pravidel pod sebou, ne ve dvou sloupcích */
  var two = one('I-NEMOC-BAZAL', '') + one('I-NEMOC-JIDLO', ' mt-2'), rest = list.filter(function (x) { return !/^I-NEMOC/.test(x.id); });
  return card('<h2>Pravidla pro nemoc</h2>' + (two ? '<div class="ill-two">' + two + '</div>' : '<p class="small muted">Pravidla pro nemoc v plánu nejsou.</p>') +
    (rest.length ? '<details class="more mt-2"><summary>Další bezpečnostní pravidla</summary>' + instructionsList(S, { instructions: rest }, true) + '</details>' : ''), 'ill');
}

/* ---------- zpětná vazba: výsledek, milník, týden, cesta ke kontrole (15, odst. 7b) ---------- */
function goalCard(S) {
  var T = NF.texts(S, 'S-CESTA'); if (!T || !T.goal) return '';
  return card('<h2>Co chceme do kontroly</h2><p>' + T.goal + '</p>');
}
/* Pruh start → vrchol (15, odst. 6): stejná vodorovná stupnice jako u jídla (18. 10. 2026) – kroužek = při jídle, plný bod = vrchol, čárkovaná hranice cíle; žádná křivka, žádné velké číslo „před jídlem“. */
function riseBar(S, r) {
  if (['okAdvice', 'okPlain', 'highAdvice', 'highPlain'].indexOf(r.key) < 0) return '';
  var g = NF.glucoseOf(S, r.ep), start = g.before, peak = g.peak, high = NF.targets(S).high; if (peak == null || start == null) return '';
  var ok = peak <= high && g.peakBound !== 'under', ps = pos(start), pp = pos(peak), lo = Math.min(ps, pp), hi = Math.max(ps, pp);
  var startT = NF.mmolB(start, g.beforeBound), peakT = NF.mmolB(peak, g.peakBound); /* čipy „pod 4“ / „nad 15“ se píší slovem, ne číslem (nález 10) */
  return '<div class="rise ' + (ok ? 'ok' : 'bad') + '" role="img" aria-label="' + e('Glukóza při jídle ' + startT + ', nejvyšší ' + peakT + ' mmol/l, hranice cíle ' + NF.mmol1(high) + ' mmol/l.') + '">' +
    '<div class="track" style="--goal:' + pos(high) + '%"><div class="dim" style="--from:0%;--to:' + lo + '%"></div><div class="dim" style="--from:' + hi + '%;--to:100%"></div><div class="span" style="--from:' + lo + '%;--to:' + (lo + Math.max(1, hi - lo)) + '%"></div><div class="goal" style="--at:' + pos(high) + '%"></div><span class="mark s" style="--at:' + ps + '%"></span><span class="mark p" style="--at:' + pp + '%"></span></div>' +
    '<div class="axis" aria-hidden="true">' + [4, 7, 10, 13, 16].map(function (v) { return '<span style="--f:' + (pos(v) / 100) + '">' + v + '</span>'; }).join('') + '</div>' +
    '<div class="lbl"><span>při jídle<b>' + e(startT) + '</b></span><span class="peak-v">nejvyšší<b>' + e(peakT) + '</b></span><span>cíl do<b>' + e(NF.mmol1(high)) + '</b></span></div></div>';
}
/* Řádek s šipkou na stránku (vzor „víc o datech“, navrhy-designu/33 odd. 2): název a nejvýš jeden šedý podtitul. */
function rowlink(label, action, value, sub) { return '<button type="button" class="rowlink" data-action="' + e(action) + '" data-value="' + e(value) + '"><span>' + e(label) + (sub ? '<small>' + e(sub) + '</small>' : '') + '</span>' + NF.icon('chevron-right') + '</button>'; }
V.rowlink = rowlink;
/* SCHEMA 86 (navrhy-designu/33, návrh 4): výsledek jednou – velkým písmem a se štítkem stavu; stupnice a vysvětlení pod „Podrobnosti“ (P7, P11). */
function resultCard(S, compact) {
  var r = NF.lastResult(S); if (!r) return NF.usable(S, 'S-VYSLEDEK') ? '' : off(S, 'S-VYSLEDEK');
  var rc = NF.confidence(S, r.food.id, r.ep.meal), g = NF.glucoseOf(S, r.ep), high = NF.targets(S).high, dv = divergenceBlock(S, r.ep, true);
  var evald = r.key !== 'noEval' && r.key !== 'excluded' && r.key !== 'nodata' && g.peak != null;
  var zone = !evald ? '' : g.peakBound === 'under' ? 'low' : g.peak <= high ? 'ok' : 'over';
  var peakT = g.peak == null ? '' : NF.mmolB(g.peak, g.peakBound) + ' mmol/l';
  var stateBig = peakT && r.key !== 'excluded' ? '<div class="state-big' + (zone ? ' ' + zone : '') + '">' + e(peakT) + (zone ? ' ' + tag(zone === 'ok' ? 'v cíli' : zone === 'low' ? 'pokles' : 'nad cílem', zone === 'ok' ? 'ok' : zone === 'low' ? 'low' : 'over') : '') + '</div>' : '';
  var more = riseBar(S, r) + (g.source === 'manual' ? '<p class="small muted mt-1 mb-0">Podle hodnot, které jste opsali; na kontrole je upřesníme.</p>' : '') + (dv ? dv.more : '');
  var body = '<div class="foodrow">' + foodIcon(S, r.food, rc) + '<div class="name">' + e(r.food.name) + '</div></div>' + stateBig +
    (r.text ? '<p class="mt-0 mb-2">' + r.text + '</p>' : '') + (dv ? dv.q : '') +
    (r.key === 'excluded' && r.smaller && ruleOf(S, 'I-MENE') ? '<p class="eyebrow doc-h mt-3">' + NF.icon('shield') + ' Bezpečnostní pravidlo</p>' + ruleShortBody(S, 'I-MENE') : '') +
    (more ? (compact && !dv ? '<div class="mt-2">' + more + '</div>' : '<details class="more mt-2"><summary>Podrobnosti</summary>' + more + '</details>') : '') + /* ve sbaleném řádku už jsou podrobnosti o klepnutí dál – bez druhé úrovně (P11) */
    '<div class="actions split mt-2">' + btn('Zavřít', 'resultSeen', r.ep.id, 'sm') + btn('Zobrazit jídlo', 'openFood', r.food.id, 'quiet sm') + '</div>' + rules(S, ['S-VYSLEDEK']);
  var eyebrow = '<p class="eyebrow">Jak to dopadlo · ' + e(NF.mealLabel(r.ep.meal)) + '</p>';
  /* když je na řadě další jídlo a karta se na nic neptá, je výsledek jeden řádek s rozbalením (18. 10. 2026: akce před informací); otázka při rozchodu je vidět hned */
  if (!compact || dv) return card(eyebrow + body, 'result');
  var st = g.peak == null ? 'bez hodnoty' : r.key === 'excluded' ? 'nehodnotíme' : peakT + (zone ? ' · ' + (zone === 'ok' ? 'v cíli' : zone === 'low' ? 'pokles' : 'nad cílem') : '');
  return card('<details class="more result-compact"><summary>' + NF.icon('plate') + '<span><b>Jak to dopadlo</b> · ' + e(NF.mealLabel(r.ep.meal)) + '</span><span class="st">' + e(st) + '</span></summary>' + body + '</details>', 'result');
}
/* Zapsáno + „Opravit inzulin“: do 60 minut po zápisu hlavního jídla (R6). SCHEMA 86: řádek v kartě pásu dne (návrh 3), ne samostatná karta. */
function fixInsulinLine(S) {
  var eps = S.episodes.filter(function (x) { return !NF.isSnack(x.meal) && NF.canCorrectInsulin(S, x); });
  if (!eps.length) return '';
  var ep = eps[eps.length - 1], f = NF.foodById(S, ep.foodId), open = S.fixInsulin === ep.id, pick = open ? S.fixInsulinPick : null;
  var insOf = function (x) { return x.confirmed === 'as' ? 'inzulin ' + x.units + ' j. podle plánu' : x.confirmed === 'other' ? 'inzulin ' + x.units + ' j. (jinak)' : x.confirmed === 'none' ? 'bez inzulinu' : x.confirmed === 'pending' ? 'inzulin čeká na potvrzení' : 'inzulin „nevím“'; };
  var left = NF.param(S, 'D-CISTA', 'oprava_min', 60) - NF.minutesDiff(NF.insulinConfirmedAt(ep), S.clock); /* od potvrzení inzulinu (01 #2) */
  var fixed = ep.insulinCorrected && ep.history && ep.history.length ? ep.history[ep.history.length - 1] : null;
  return '<div class="fix-ins mt-3' + (NF.flash && NF.flash.food === ep.foodId ? ' just-saved' : '') + '"><div class="foodrow">' + (f ? foodIcon(S, f, NF.confidence(S, f.id, ep.meal)) : '') + '<p class="small mt-0 mb-0"><b>Zapsáno: ' + e(NF.mealLabel(ep.meal)) + '</b> · ' + e(f ? f.name : '') + ' · ' + e(insOf(ep.insulin)) + (ep.context === 'illness' ? ' <span class="tag">' + NF.icon('thermometer') + ' nemoc</span>' : '') + '</p></div>' + /* zápis z doby nemoci nese štítek (21. 10. 2026); prstenec učení s animací po uložení (15. 10. 2026) */
    (fixed ? '<p class="small mt-1 mb-0">' + NF.icon('check', 'ok') + ' Opraveno: ' + e(insOf(fixed.insulinTo)) + ' · ' + e(NF.fmtClock(fixed.at)) + '</p>' : '') +
    btn(open ? 'Zavřít' : 'Opravit inzulin · ještě ' + NF.plural(Math.max(0, left), 'minuta', 'minuty', 'minut'), 'fixInsulinOpen', ep.id, 'link') +
    (open ? '<div class="choice-row col mt-2" role="group" aria-label="Jak to bylo s inzulinem?">' + choice(opt('Podle plánu', ep.insulin.prescribed + ' j.'), 'fixInsulinPick', ep.id + ':as', pick === 'as', 'opt') + choice(opt('Jinak', 'jiné množství'), 'fixInsulinPick', ep.id + ':other', pick === 'other', 'opt') + choice(opt('Nepíchnuto', 'k tomuto jídlu bez inzulinu'), 'fixInsulinPick', ep.id + ':none', pick === 'none', 'opt') + choice(opt('Nevím', 'pro jistotu počítáme, že byl'), 'fixInsulinPick', ep.id + ':unknown', pick === 'unknown', 'opt') + '</div>' +
      (pick === 'other' ? '<div class="mt-2">' + unitsSlider('fix-units', 'fixInsulinUnitsSet', S.fixInsulinUnits != null ? S.fixInsulinUnits : ep.insulin.prescribed, ep.insulin.prescribed, 'Opravený inzulin: jednotky') + '</div>' : '') + /* SCHEMA 87: posuvník */
      '<div class="actions col">' + btn('Uložit opravu', 'fixInsulin', ep.id + ':' + (pick || ''), 'primary', pick ? '' : ' disabled') + '</div>' : '') + '</div>';
}
function milestoneCard(S) {
  var m = NF.pendingMilestone(S); if (!m) return NF.usable(S, 'R-MILNIKY') ? '' : off(S, 'R-MILNIKY');
  return card('<p class="eyebrow">Novinka</p><p class="mt-1 mb-2">' + m.text + '</p>' + btn('Zavřít', 'milestoneClose', m.id, 'link') + rules(S, ['R-MILNIKY']), 'tint milestone mini-card');
}
/* Týdenní shrnutí (S-TYDEN, SCHEMA 86): čin a poděkování; podrobnosti na klepnutí. Chválí čin („Procházku jste zkusili 7×“), ne výsledek. */
function weekLines(S, w, T) {
  var main = [NF.fillText(T.meals, { meals: w.meals, slots: w.slots, usual: w.usual }) + (w.snacks && T.snacks ? ' ' + NF.fillText(T.snacks, { snacks: NF.plural(w.snacks, 'svačina', 'svačiny', 'svačin') }) : '')];
  var more = [];
  if (w.best && T.helped) more.push(NF.fillText(T.helped, { lever: NF.LEVERS[w.best.lever].label, k: w.best.k, n: w.best.n }) + (T.helpedNext ? ' ' + T.helpedNext : ''));
  if (T.near && w.near) more.push(NF.fillText(T.near, { food: e(w.near.food), left: NF.plural(w.near.left, 'zápis', 'zápisy', 'zápisů') }));
  if (w.suggest) more.push(NF.fillText(T.suggest, { food: w.suggest.food, lever: NF.leverNoun(w.suggest.lever), k: w.suggest.k, n: w.suggest.n }));
  return { main: main, more: more };
}
function weekCard(S) {
  var w = NF.weekSummary(S), T = NF.texts(S, 'S-TYDEN'); if (!NF.usable(S, 'S-TYDEN')) return off(S, 'S-TYDEN'); if (!w || !T) return '';
  var L = weekLines(S, w, T);
  return card(ttl(e(NF.fillText(T.head, { week: w.week }))) + '<p class="mt-1 mb-0">' + L.main.join(' ') + ' ' + e(T.thanks || '') + '</p>' +
    (L.more.length ? '<details class="more mt-2"><summary>Podrobnosti</summary>' + L.more.map(function (l) { return '<p class="small mt-1 mb-1">' + l + '</p>'; }).join('') + '</details>' : '') +
    btn('Zavřít', 'weekClose', w.id, 'link') + rules(S, ['S-TYDEN']), 'week mini-card');
}
V.weekLines = weekLines;
function pathCard(S, withPreview) {
  var ps = NF.pathStats(S), T = NF.texts(S, 'S-CESTA'); if (!NF.usable(S, 'S-CESTA')) return off(S, 'S-CESTA'); if (!ps || !T) return '';
  /* Kontrola 4 (07 B5): na Dnes v rutině (od 3. týdne plánu, víc než 7 dní do kontroly) je karta jeden řádek s rozbalením; obrazovka je kratší. */
  if (!withPreview && ps.week >= 3 && ps.left > 7 && !S.pathOpen) return card('<details class="more path-compact"><summary>' + NF.icon('clock') + '<span><b>Cesta ke kontrole</b> · ' + ps.left + ' ' + (ps.left >= 2 && ps.left <= 4 ? 'dny' : 'dní') + ' do kontroly</span></summary>' + pathBody(S, ps, T, withPreview) + '</details>', 'path');
  return pathBody(S, ps, T, withPreview, true);
}
function pathBody(S, ps, T, withPreview, asCard) {
  var pct = Math.round(ps.gone / ps.total * 100), hl = withPreview ? 'h2' : 'h3'; /* na Plánu je karta první, nadpis h2 (04 #7) */
  return card('<div class="card-head"><span>Cesta ke kontrole</span><span class="muted w-600">' + e(NF.fmtShort(ps.visit)) + '</span></div>' +
    '<div class="bar" aria-hidden="true"><span style="--pct:' + pct + '%"></span></div>' +
    '<div class="hero-num sm">' + ps.left + '<small>' + (ps.left === 1 ? 'den' : ps.left >= 2 && ps.left <= 4 ? 'dny' : 'dní') + ' do kontroly</small></div>' + /* SCHEMA 86: bez „N. týden plánu“ (02 odd. 2: čísla týdne si odporovala) */
    /* posledních 7 dní jako tkanina místo dlaždic (Podpis C, 20. 10. 2026); celé období vidí jen lékař */
    (ps.gone >= 1 || ps.weekMeals ? '<' + hl + ' class="weave-h">' + (ps.weave.days.length === 1 ? 'Dnešní den' : ps.weave.days.length <= 4 ? 'Poslední ' + ps.weave.days.length + ' dny' : 'Posledních ' + ps.weave.days.length + ' dní') + '</' + hl + '>' + weave(ps.weave, true) +
      '<p class="small muted mt-2 mb-0">Mezery nejsou chyba. Lékař uvidí celé období najednou.</p>' + /* 21. 10. 2026: tkanina není série s trestem */
      (ps.repeated ? '<p class="small mt-3 mb-0">' + (ps.known ? 'Známe už ' + NF.plural(ps.known, 'vaše jídlo', 'vaše jídla', 'vašich jídel') + '.' : 'Vaše jídla se zatím učíme.') + '</p>' : '') /* B6 (32/01, SCHEMA 84): bez jmenovatele – „4 z 28“ zní jako neúspěch; jmenovatel vidí lékař */
      : '<p class="small muted mt-3">Po prvních zápisech tu uvidíte, které dny máte zapsané a kolik jídel už známe.</p>') + /* nulový stav místo „0 z 0“ (19. 10. 2026) */
    (withPreview ? '<p class="small muted mt-3 mb-0">' + T.visit + '</p>' : '') + /* na Dnes by věta opakovala závěrečnou nápovědu */
    (withPreview ? rowlink('Co uvidí lékař', 'page', 'preview', 'přehled před kontrolou') : '') +
    rules(S, ['S-CESTA']), asCard ? 'path' : 'flat flush');
}
/* Tkanina zápisů (Podpis C, 20. 10. 2026): stejný jazyk jako pás dne, jen v čase. Jen činy – žádná glukóza, hodnocení ani série.
   Plná tečka = zapsáno · kroužek = vynecháno se zápisem · tlumené místo = chybí zápis · den nemoci tlumeně se značkou teploměru · dnes s halo. */
var WEAVE_ROWS = ['snídaně', 'oběd', 'večeře', 'bazál'], WEEKDAY = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'];
function weave(w, big) {
  var t = w.totals, n = w.days.length;
  var aria = 'Zápisy za ' + NF.plural(n, 'den', 'dny', 'dní') + ': zapsáno ' + t.done + ', vynecháno se zápisem ' + t.skipped + ', bez zápisu ' + t.missing + (t.ill ? ', z toho ' + NF.plural(t.ill, 'den', 'dny', 'dní') + ' nemoci' : '') + '.';
  return '<div class="weave' + (big ? ' lg' : '') + '" style="--days:' + n + '" role="img" aria-label="' + e(aria) + '">' +
    '<span class="wlabels" aria-hidden="true">' + (big ? '<span class="wmark"></span>' : '') + WEAVE_ROWS.map(function (x) { return '<span>' + x + '</span>'; }).join('') + (big ? '<span class="wday"></span>' : '') + '</span>' +
    w.days.map(function (d) {
      return '<span class="wcol' + (d.ill ? ' ill' : '') + (d.today ? ' today' : '') + '" aria-hidden="true">' + (big ? '<span class="wmark">' + (d.ill ? NF.icon('thermometer') : '') + '</span>' : '') +
        d.cells.map(function (c) { return '<i class="' + c + '"></i>'; }).join('') + (big ? '<span class="wday">' + (d.today ? 'dnes' : WEEKDAY[NF.parse(d.date + 'T12:00:00').getDay()]) + '</span>' : '') + '</span>';
    }).join('') + '</div>' +
    '<p class="weave-legend" aria-hidden="true"><span><i class="done"></i>zapsáno</span><span><i class="skipped"></i>vynecháno se zápisem</span><span><i class="missing"></i>bez zápisu</span><span><i class="future"></i>ještě přijde</span>' + (t.ill ? '<span>' + NF.icon('thermometer') + 'nemoc</span>' : '') + '</p>';
}
V.weave = weave;
function soonCard(S) {
  var ps = NF.pathStats(S); if (!ps || ps.left > 7) return '';
  return card(ttl(ps.left === 0 ? 'Dnes jdete na kontrolu' : 'Za ' + ps.left + ' ' + (ps.left === 1 ? 'den' : ps.left <= 4 ? 'dny' : 'dní') + ' jdete na kontrolu') + exportRemind(S, true) +
    rowlink('Co uvidí lékař', 'page', 'preview', 'a otázky, které si vezmete s sebou'), 'soon mini-card'); /* SCHEMA 86 (návrh 3): „Co uvidí lékař“ je řádek se šipkou, ne druhé plné tlačítko (P1) */
}
V.pathCard = pathCard;
/* Zlomek „3 z 4“: spojka menší a tlumená, číslo a spojka se nerozdělí (19. 10. 2026). */
/* C4 (31/03): zlomek „0 z 1“ s mezerami i v textu a pro čtečku (dřív „0z1“) */
function frac(a, b) { return '<span class="frac">' + a + ' <span class="of">' + NF.z(b) + '</span> ' + b + '</span>'; }
V.frac = frac;

/* ---------- data ze senzoru bez napojení (Z-GLUKOZA, Z-IMPORT, B-HYPO) ---------- */
/* Do SCHEMA 84 mřížka čipů po celých mmol/l (vlastník 18. 10. 2026); od 5. 11. 2026 posuvník se stejnými hodnotami (rozhodnutí 9). */
/* ---------- posuvník hodnoty (rozhodnutí vlastníka 5. 11. 2026, bod 9; SCHEMA 84) ----------
   Jeden prvek pro každou volbu čísla v ordinaci i u pacienta (nahrazuje mřížky „pilulek“ a samotná −/+): velká hodnota s jednotkou nahoře,
   pod ní široká dráha s kroky a tlačítka −/+ na doladění. Ovládání: tažení myší i prstem, klepnutí na dráhu, šipky (nativní input type=range),
   −/+ (dotykový cíl ≥ 44 px). V ordinaci se nepíše (zásada 8) – posuvník je výběr. Hodnota se nikdy nepředvyplňuje: bez volby je jezdec
   jen naznačený (čárkovaně) a hodnota „–“; uloží se až po pohybu, klepnutí nebo Enter.
   Druhy (cfg.kind): 'glu' = glukóza po celých mmol/l s pásmy podle rolí barev (červená pod 4, zelená v cíli do horního cíle pacienta, oranžová nad cílem)
   a konci „pod 4“ / „nad 15“ (hranice se značkou, NF.chip); 'goal' = hodnota se značkou cíle pacienta (C-CILE) a slovem stavu; 'plain' = bez stavu
   (hmotnost, dávky – u dávky jen značka „dnes“, aplikace výši nenavrhuje). Stav je vždy slovem a ikonou (15a), nikdy jen barvou.
   Režim potvrzení (cfg.confirm): volba se jen podrží (S.vsPick) a uloží ji tlačítko „Uložit“ – u nejvyšší hodnoty po minulém jídle, kde uložení hned mění otázku. */
var VS_ICON = { ok: 'check', warn: 'arrow-up', low: 'alert', none: 'circle-dashed' };
function vsNum(v, dec) { return dec ? String(Math.round(v * Math.pow(10, dec)) / Math.pow(10, dec)).replace('.', ',') : String(Math.round(v)); }
/* Stav hodnoty (zóna, slovo, ikona, text). Sdílí ho vykreslení i živý náhled při tažení (ui.js). v = číslo polohy jezdce, null = nevybráno. */
function vsState(c, v) {
  if (v == null || !Number.isFinite(Number(v))) return { zone: 'none', word: c.noneWord || '', text: '–', token: null };
  v = Number(v);
  if (c.kind === 'glu') {
    if (v < c.min) return { zone: 'low', word: 'nízká glukóza', text: 'pod 4', token: 'low', aria: 'pod 4 mmol/l, nízká glukóza' };
    if (v > c.max) return { zone: 'warn', word: 'nad 15', text: 'nad 15', token: 'high', aria: 'nad 15 mmol/l, nad cílem' };
    var z = v < c.lo ? 'low' : v > c.hi ? 'warn' : 'ok';
    return { zone: z, word: z === 'low' ? 'nízká glukóza' : z === 'warn' ? 'nad cílem' : 'v cíli', text: vsNum(v, 0), token: vsNum(v, 0).replace(',', '.') };
  }
  var t = { zone: 'none', word: '', text: vsNum(v, c.dec), token: String(Math.round(v * Math.pow(10, c.dec || 0)) / Math.pow(10, c.dec || 0)) };
  if (c.kind === 'goal' && c.goal != null) {
    var ok = c.better === 'max' ? v >= c.goal : v <= c.goal;
    t.zone = ok ? 'ok' : 'warn'; t.word = ok ? (c.better === 'max' ? 'splňuje cíl' : 'v cíli') : (c.better === 'max' ? 'pod cílem' : 'nad cílem');
    t.icon = ok ? 'check' : c.better === 'max' ? 'arrow-down' : 'arrow-up'; /* SCHEMA 84 (integrace): šipka ukazuje směr od cíle – „pod cílem“ dolů, „nad cílem“ nahoru */
  }
  return t;
}
V.vsState = vsState;
/* Poloha 0–1 na dráze. U glukózy má dráha navíc konce „pod 4“ (min − 1) a „nad 15“ (max + 1). */
function vsLo(c) { return c.kind === 'glu' ? c.min - c.step : c.min; }
function vsHi(c) { return c.kind === 'glu' ? c.max + c.step : c.max; }
function vsFrac(c, v) { var lo = vsLo(c), hi = vsHi(c); return Math.max(0, Math.min(1, (v - lo) / (hi - lo))); }
function vsPct(x) { return Math.round(x * 10000) / 100 + '%'; }
/* cfg: id, action, prefix, value (číslo nebo null), kind, min, max, step, dec, unit, label, lo/hi (glu), goal/better/goalText (goal), ref/refText (značka „dnes“),
   base (poloha naznačeného jezdce bez volby; u dávek a hodnot v ordinaci začátek dráhy – nic se nenavrhuje), none (volba „nemám hodnotu“: { label, on }),
   confirm ({ action, prefix, label }), pick (podržená volba v režimu potvrzení), disabled, size ('sm'), hint (věta pod hodnotou). */
function slider(c) {
  c.step = c.step || 1; c.dec = c.dec || 0;
  var lo = vsLo(c), hi = vsHi(c), conf = !!c.confirm;
  var val = conf ? (c.pick != null ? c.pick : null) : c.value;
  var set = val != null && Number.isFinite(Number(val)), st = vsState(c, set ? Number(val) : null);
  var base = set ? Number(val) : (c.base != null ? Math.max(lo, Math.min(hi, c.base)) : lo);
  var fireAct = conf ? 'vsPick' : c.action, firePre = conf ? c.id + '|' : (c.prefix || '');
  var tok = function (v) { var s2 = vsState(c, v); return s2.token; };
  var clamp = function (n) { return Math.max(lo, Math.min(hi, Math.round(n * 1000) / 1000)); };
  var minus = clamp(base - c.step), plus = clamp(base + c.step); /* bez volby vedou −/+ od naznačené polohy */
  var unitTxt = c.unit ? ' ' + c.unit : '';
  var noneOn = !!(c.none && c.none.on && !set);
  var valTxt = set ? st.text : '–';
  var aria = set ? (st.aria || st.text + unitTxt + (st.word ? ', ' + st.word : '')) : noneOn ? 'vybráno: ' + (c.none.label || 'nemám hodnotu') : 'nevybráno';
  var dis = c.disabled ? ' disabled' : '';
  var stepBtn = function (sign, v) {
    var lbl = (sign < 0 ? 'Méně' : 'Více') + (set ? ': ' + vsState(c, v).text + unitTxt : '');
    var at = sign < 0 ? base <= lo && set : base >= hi && set;
    return '<button type="button" class="vs-step" data-action="' + e(fireAct) + '" data-value="' + e(firePre + tok(v)) + '" aria-label="' + e(lbl) + '"' + (c.disabled || at ? ' disabled' : '') + '>' + NF.icon(sign < 0 ? 'minus' : 'plus') + '</button>';
  };
  var zones = c.kind === 'glu' ? ';--vs-z1:' + vsPct(vsFrac(c, c.lo - c.step / 2)) + ';--vs-z2:' + vsPct(vsFrac(c, c.hi + c.step / 2)) : '';
  /* Značka cíle (C-CILE) nebo „dnes“ je čárka na dráze; její popisek je pod dráhou (nad dráhou ho zakrýval jezdec). */
  var mv = c.kind === 'goal' && c.goal != null ? c.goal : c.ref != null ? c.ref : null, mf = mv != null ? Math.round(vsFrac(c, mv) * 10000) / 10000 : null;
  var mText = mv == null ? '' : c.kind === 'goal' && c.goal != null ? (c.goalText || 'cíl ' + vsNum(c.goal, c.dec) + unitTxt) : (c.refText || 'dnes ' + vsNum(c.ref, c.dec) + unitTxt);
  var mark = mv != null ? '<span class="vs-mark' + (c.kind === 'goal' ? '' : ' ref') + '" style="--vs-m:' + mf + '" aria-hidden="true"></span>' : '';
  /* Popisky konců dráhy. U glukózy jsou konce „pod 4“ a „nad 15“ zároveň tlačítka (bezpečnostní signál jedním klepnutím, hodnota jako dřívější čip), uprostřed horní cíl. */
  var endBtn = function (t, txt) { return '<button type="button" class="vs-end ' + (t === 'low' ? 'low' : 'high') + '" data-action="' + e(fireAct) + '" data-value="' + e(firePre + t) + '" aria-pressed="' + (set && st.token === t) + '"' + dis + '>' + txt + '</button>'; };
  var scale = c.kind === 'glu'
    ? '<div class="vs-scale">' + endBtn('low', 'pod 4') + '<span class="vs-tick" style="--vs-m:' + Math.round(vsFrac(c, c.hi) * 10000) / 10000 + '" aria-hidden="true">' + vsNum(c.hi, 0) + '</span>' + endBtn('high', 'nad 15') + '</div>'
    : mv != null ? '<div class="vs-scale" aria-hidden="true"><span class="vs-tick' + (c.kind === 'goal' ? ' goal' : '') + '" style="--vs-m:' + mf + '">' + e(mText) + '</span></div>'
    : '<div class="vs-scale" aria-hidden="true"><span>' + vsNum(lo, c.dec) + '</span><span>' + vsNum(hi, c.dec) + '</span></div>';
  var quick = '';
  var data = ' data-vs-kind="' + e(c.kind || 'plain') + '" data-vs-min="' + c.min + '" data-vs-max="' + c.max + '" data-vs-step="' + c.step + '" data-vs-dec="' + c.dec + '"' + (c.unit ? ' data-vs-unit="' + e(c.unit) + '"' : '') +
    (c.kind === 'glu' ? ' data-vs-lo="' + c.lo + '" data-vs-hi="' + c.hi + '"' : '') + (c.kind === 'goal' && c.goal != null ? ' data-vs-goal="' + c.goal + '" data-vs-better="' + e(c.better || 'min') + '"' : '');
  return '<div class="vslider' + (c.kind === 'glu' ? ' glu' : '') + (set ? '' : ' unset') + (c.disabled ? ' off' : '') + (c.size === 'sm' ? ' sm' : '') + '" data-vs="' + e(c.id) + '" data-zone="' + st.zone + '"' + data + '>' +
    /* −/+ po stranách velké hodnoty, dráha pod nimi na celou šířku (na telefonu 390 px tak dráha nepřijde o 112 px) */
    '<div class="vs-head">' + stepBtn(-1, minus) + '<div class="vs-mid"><output class="vs-val" for="vs-' + e(c.id) + '"><b>' + e(valTxt) + '</b>' + (c.unit ? '<small>' + e(c.unit) + '</small>' : '') + '</output>' +
    '<span class="vs-state">' + (set && st.word ? NF.icon(st.icon || VS_ICON[st.zone] || 'check') + '<span>' + e(st.word) + '</span>' : noneOn ? NF.icon('circle-dashed') + '<span>vybráno: ' + e(c.none.label || 'nemám hodnotu') + '</span>' : !set ? '<span>' + e(c.prompt || 'Posuňte nebo klepněte na dráhu') + '</span>' : '') + '</span></div>' + stepBtn(1, plus) + '</div>' +
    '<div class="vs-track" style="--vs-f:' + Math.round(vsFrac(c, base) * 10000) / 10000 + zones + '"><span class="vs-rail" aria-hidden="true"></span>' + (c.kind !== 'glu' ? '<span class="vs-fill" aria-hidden="true"></span>' : '') + mark + '<span class="vs-thumb" aria-hidden="true"></span>' +
    '<input type="range" class="vs-input" id="vs-' + e(c.id) + '" min="' + lo + '" max="' + hi + '" step="' + c.step + '" value="' + base + '" aria-label="' + e(c.label) + '" aria-valuetext="' + e(aria) + '" data-vs-action="' + e(fireAct) + '" data-vs-prefix="' + e(firePre) + '"' + (set ? '' : ' data-vs-unset=""') + dis + '></div>' + scale +
    (c.none || c.confirm || quick ? '<div class="vs-foot">' + quick + (c.none ? choice(e(c.none.label || 'nemám hodnotu'), c.none.action || c.action, (c.none.prefix != null ? c.none.prefix : (c.prefix || '')) + 'none', !!c.none.on && !set, 'quiet sm vs-none') : '') +
      (c.confirm ? btn(set ? e(c.confirm.label || 'Uložit') + ' · ' + e(st.text) + unitTxt : e(c.confirm.label || 'Uložit'), c.confirm.action, set ? (c.confirm.prefix || '') + st.token : null, 'primary sm vs-save', set && !c.disabled ? '' : ' disabled') : '') + '</div>' : '') +
    (c.hint ? '<p class="small muted mt-1 mb-0">' + c.hint + '</p>' : '') + '</div>';
}
V.slider = slider;
/* Glukóza po celých mmol/l (Z-GLUKOZA): posuvník s pásmy a konci „pod 4“ / „nad 15“, „nemám hodnotu“ vedle. Hodnoty akcí jsou tytéž jako u dřívějších čipů
   (4–15, 'low', 'high', 'none'), takže pravidla I-HYPO / I-VYSOKA, otázky a stopa se chovají stejně. base = poslední opsaná hodnota (jen naznačená poloha). */
function gluSlider(S, o) {
  var t = NF.targets(S), cur = o.asked && o.current != null ? (o.bound === 'under' ? 3 : o.bound === 'over' ? 16 : Math.round(o.current)) : null;
  return slider({ id: o.id, action: o.action, prefix: o.prefix || '', kind: 'glu', min: 4, max: 15, step: 1, lo: 4, hi: Math.max(5, Math.min(14, Math.floor(t.high || 10))), unit: 'mmol/l', label: o.label || 'Glukóza v mmol/l',
    value: cur, base: o.base != null ? o.base : 7, none: { label: 'nemám hodnotu', on: !!o.asked && o.current == null, action: o.noneAction, prefix: o.nonePrefix }, confirm: o.confirm, pick: o.pick, prompt: o.prompt });
}
V.gluSlider = gluSlider;
/* Naznačená poloha bez volby: poslední opsaná hodnota (před jídlem, nebo nejvyšší po jídle; u nejvyšší nejdřív u téhož jídla). Nikdy se neuloží sama. */
function lastManual(S, key, foodId) {
  var eps = (S.episodes || []).filter(function (x) { return x.manual && x.manual[key] != null && !x.manual[key + 'Bound']; });
  var same = foodId ? eps.filter(function (x) { return x.foodId === foodId; }) : [];
  var l = (same.length ? same : eps).slice(-1)[0]; return l ? Math.max(4, Math.min(15, Math.round(l.manual[key]))) : null;
}
V.lastManual = lastManual;
function yesNoChips(action, prefix, current) {
  return '<div class="chips" role="group" aria-label="Klesla glukóza pod 4?">' + [['yes', 'Ano, pod 4'], ['no', 'Ne'], ['unknown', 'Nevím']].map(function (x) { return choice(x[1], action, prefix ? prefix + ':' + x[0] : x[0], current === x[0], 'chip'); }).join('') + '</div>'; /* bez předpony (zpětný zápis) jen „yes/no/unknown“ – ui.mealLow čte holou hodnotu (27. 10. 2026) */
}
/* Dotaz na minulé jídlo (nejvyšší hodnota, pod 4) – v kroku 1 dalšího jídla a večer u bazálu, ne samostatnou kartou. */
/* Každý blok čipů má časovou hlavičku s ikonou (LF-08, 19. 10. 2026): „Teď · 12:10“ (hodiny) a „Po snídani · 7:05–9:05“ (talíř),
   aby se hodnota teď a nejvyšší po minulém jídle nespletly. Odpovězený blok se během zápisu sbalí na jeden řádek se „Změnit“. */
/* Otázka na pokles po jídle všude stejně, v živém i zpětném zápisu (A24, 27. 10. 2026). */
var LOW_Q = 'Klesla glukóza do 4 hodin po jídle pod 4 mmol/l?';
V.LOW_Q = LOW_Q;
/* Kontrola 2 (B15, 29. 10. 2026): u zápisu, od kterého ještě neuplynuly 4 hodiny, se ptáme „zatím“ – odpověď nepředstírá celé okno 4 hodin. */
var LOW_Q_EARLY = 'Klesla glukóza od jídla zatím pod 4 mmol/l?';
V.LOW_Q_EARLY = LOW_Q_EARLY;
function lowQ(S, at) { return at && NF.minutesDiff(at, S.clock) < 240 ? LOW_Q_EARLY : LOW_Q; }
V.lowQ = lowQ;
function timeHead(ic, text) { return '<p class="eyebrow time-h">' + NF.icon(ic) + ' ' + e(text) + '</p>'; }
/* B7 (32/01, SCHEMA 84): věta, jak najít nejvyšší hodnotu v grafu senzoru – okno jídla a vrchol křivky. */
function peakHow(ep) { return 'V grafu senzoru najděte úsek ' + NF.fmtClock(ep.at) + '–' + NF.fmtClock(NF.addMin(ep.at, 120)) + ' a vyberte nejvyšší hodnotu, které tam křivka dosáhla.'; }
V.peakHow = peakHow;
function prevLabel(ep) { return 'Po ' + NF.mealLabel(ep.meal, 'ke').replace(/^ke? /, ''); }
function prevAskBlock(S) {
  var pend = NF.pendingPeakAsk(S).concat(S.episodes.filter(function (e) { return e.manual && e.manual.peak != null && !e.manual.lowAsked && !NF.hasImport(e) && NF.minutesDiff(e.at, S.clock) <= 24 * 60 && NF.minutesDiff(e.at, S.clock) >= 120; })).slice(0, 2);
  var done = S.meal && S.meal.prevDone ? S.episodes.filter(function (x) { return S.meal.prevDone.indexOf(x.id) >= 0 && x.manual && x.manual.lowAsked && pend.indexOf(x) < 0; }) : [];
  return done.map(function (ep) {
    var lowTxt = ep.manual.low === true ? 'ano' : ep.manual.low === false ? 'ne' : 'nevím';
    return card('<div class="row-sum"><span>' + NF.icon('plate') + ' <b>' + e(prevLabel(ep)) + ':</b> nejvyšší ' + (ep.manual.peak != null ? e(NF.mmolB(ep.manual.peak, ep.manual.peakBound)) : 'bez hodnoty') + ' · pod 4: ' + lowTxt + '</span>' + btn('Změnit', 'prevReopen', ep.id, 'quiet sm') + '</div>', 'flat');
  }).join('') + pend.map(function (ep) {
    var f = NF.foodById(S, ep.foodId);
    var peakDone = ep.manual && ep.manual.peak != null;
    return card(timeHead('plate', prevLabel(ep) + ' · ' + NF.fmtClock(ep.at) + '–' + NF.fmtClock(NF.addMin(ep.at, 120)) + (f ? ' · ' + f.name : '')) +
      (!peakDone ? ttl('Nejvyšší hodnota za první dvě hodiny <span class="unit">mmol/l</span>') + '<p class="small muted mt-1 mb-2">' + e(peakHow(ep)) + '</p>' + /* B7 (32/01): jak najít vrchol v grafu senzoru */
          gluSlider(S, { id: 'peak-' + ep.id, action: 'peakChip', prefix: ep.id + ':', asked: false, base: lastManual(S, 'peak', ep.foodId) || 10, label: 'Nejvyšší hodnota po jídle v mmol/l', confirm: { action: 'peakChip', prefix: ep.id + ':', label: 'Uložit' }, pick: S.vsPick && S.vsPick['peak-' + ep.id], noneAction: 'peakChip', nonePrefix: ep.id + ':', prompt: 'Posuňte na nejvyšší hodnotu z grafu' })
        : !NF.usable(S, 'B-HYPO') ? '<p class="small muted mt-1 mb-2">Nejvyšší hodnota po jídle: <b>' + e(NF.mmolB(ep.manual.peak, ep.manual.peakBound)) + '</b>.</p>' + off(S, 'B-HYPO') /* B17: otázka na pokles patří k B-HYPO; zamítnutá položka = otázka se neptá */
        : ttl(lowQ(S, ep.at)) + '<p class="small muted mt-1 mb-2">Nejvyšší hodnota po jídle: <b>' + e(NF.mmolB(ep.manual.peak, ep.manual.peakBound)) + '</b>.</p>' + yesNoChips('lowChip', ep.id, null)) +
      (S.page === 'meal' && !peakDone ? '' : rules(S, [peakDone ? 'B-HYPO' : 'Z-GLUKOZA'])), 'prev-ask') +
      (peakDone && ep.manual.peakBound === 'over' && S.page === 'meal' ? highCard(S, prevLabel(ep) + ' byla nejvyšší glukóza nad 15', true) : ''); /* čip „nad 15“ → pravidlo I-VYSOKA hned (SCHEMA 74); na Dnes večer už ne – událost minula (SCHEMA 86, 01 D10) */
  }).join('');
}
/* Sledování po menší porci s podaným inzulinem nebo po vynechaném jídle s inzulinem: za hodinu otázka „bylo pod 4?“ (B-HYPO). */
function hypoWatchCard(S, nightOnly) {
  if (!NF.usable(S, 'B-HYPO')) return (S.hypoWatch || []).some(function (w) { return w.answer == null && NF.day(w.at) === NF.day(S.clock); }) ? off(S, 'B-HYPO') : ''; /* zamítnutá položka: otázka se neptá, na místě je oznámení (zásada 4) */
  var pend = NF.pendingHypoWatch(S); if (nightOnly) pend = pend.filter(function (w) { return w.night; }); if (!pend.length) return '';
  var w = pend[0];
  /* Integrace SCHEMA 73: „Před chvílí“ jen do 3 h od jídla; později „Dnes v …“, další den „Včera v …“ (otázka může čekat do dalšího dne). */
  var yday = NF.day(NF.addDays(S.clock, -1)), when = NF.day(w.at) === NF.day(S.clock) ? (NF.minutesDiff(w.at, S.clock) <= 180 ? 'Před chvílí' : 'Dnes v ' + NF.fmtClock(w.at)) : (NF.day(w.at) === yday ? 'Včera v ' : NF.fmtShort(w.at) + ' v ') + NF.fmtClock(w.at);
  return card('<div class="now-row"><div>' + ttl(w.night ? (w.kind === 'skipped' ? 'Včera večer jste vynechali večeři s podaným inzulinem' : 'Včera večer jste snědli méně než obvykle') : (w.kind === 'skipped' ? when + ' jste vynechali ' + e(NF.mealLabel(w.meal, 'acc')) + ' s podaným inzulinem' : when + ' jste snědli méně než obvykle')) + (w.night ? 'Podívejte se do grafu senzoru. Klesla glukóza v noci pod 4?' : 'Podívejte se na senzor. Klesla glukóza pod 4?') +
    yesNoChips('hypoAnswer', w.id, null) + '<div class="mt-3">' + (ruleShortBody(S, 'I-HYPO') || ruleOff(S, 'I-HYPO')) + '</div></div></div>' + /* SCHEMA 86: u otázky pravidlo krátce, celé na klepnutí (P8) */
    rules(S, ['B-HYPO']), 'hypo-q');
}
/* Pravidlo hned (15 odst. 2.3; nález 3 a 5, 23. 10. 2026): po menší porci s inzulinem v těle, nebo po vynechaném jídle s inzulinem (i „nevím“),
   je na Dnes karta s pravidlem „méně jídla než obvykle“, dokud otázka na pokles nemá odpověď. Pravidlo je schválené garantem; aplikace k němu nic nepřidává. */
function lessFoodCards(S) {
  var day = NF.day(S.clock), out = '', seen = {};
  var m = NF.param(S, 'B-HYPO', 'pripominka_min', 60);
  var one = function (kind, meal, insulin, w) {
    var k = kind + ':' + meal; if (seen[k]) return; seen[k] = 1;
    var situation = kind === 'skipped' ? 'Dnes ' + NF.mealText(meal, 'without') + ', ale inzulin ' + (insulin === 'unknown' ? 'možná podaný – počítáme, že byl.' : 'podaný.') : '';
    var when = w && !w.night ? 'za ' + m + ' min od jídla se zeptáme, jestli glukóza klesla pod 4.' : w && w.night ? 'ráno se zeptáme, jestli glukóza klesla v noci pod 4.' : '';
    /* SCHEMA 86: pravidlo krátce, pod ním jen to, co bude dál (P6); situaci říká nadpis karty */
    out += doctorCard(S, 'I-MENE', 'Méně jídla než obvykle · ' + NF.mealLabel(meal), (situation ? '<p class="small mt-2 mb-0"><b>' + e(situation) + '</b></p>' : '') + (when ? '<p class="next-line ta-l">' + NF.icon('arrow-right') + ' Potom: ' + e(when) + '</p>' : ''), 'low');
  };
  var due = NF.usable(S, 'B-HYPO') ? NF.pendingHypoWatch(S) : [];
  NF.openHypoWatch(S).forEach(function (w) { if (NF.day(w.at) !== day || (w.kind !== 'skipped' && w.kind !== 'smaller')) return; if (due.indexOf(w) >= 0 || due.some(function (x) { return x.id === w.id; })) return; /* když se už ptáme „Klesla glukóza pod 4?“, otázka kartu nahrazuje (01 D7) */ var ep = w.epId ? S.episodes.filter(function (x) { return x.id === w.epId; })[0] : null; var sk = S.skipped && S.skipped[day] && S.skipped[day][w.meal]; one(w.kind, w.meal, ep ? ep.insulin.confirmed : sk ? sk.insulin : 'as', w); });
  NF.skippedWithInsulin(S, day).forEach(function (x) { if ((S.hypoWatch || []).some(function (w) { return w.kind === 'skipped' && w.meal === x.meal && NF.day(w.at) === day; })) return; one('skipped', x.meal, x.insulin, null); }); /* bez sledování (B-HYPO zamítnuto) platí pravidlo celý den */
  /* Menší porce s inzulinem v těle: pravidlo I-MENE hned, nezávisle na B-HYPO (A04, zásada 3). Bez sledování (B-HYPO zamítnuto) platí celý den. */
  var hypoOn = NF.usable(S, 'B-HYPO');
  S.episodes.forEach(function (x) {
    if (hypoOn || NF.day(x.at) !== day || NF.isSnack(x.meal) || x.portion !== 'smaller' || !x.insulin || !NF.insulinInBody(x.insulin.confirmed)) return;
    if ((S.hypoWatch || []).some(function (w) { return w.epId === x.id; })) return; /* se sledováním ji nese karta výše, dokud otázka nemá odpověď */
    one('smaller', x.meal, x.insulin.confirmed, null);
  });
  /* Zamítnutá B-HYPO: otázka za 60 min a karta po opakovaných poklesech nejsou; na jejich místě oznámení (A04). */
  if (out && NF.item(S, 'B-HYPO') && !NF.usable(S, 'B-HYPO')) out += off(S, 'B-HYPO');
  return out;
}
V.lessFoodCards = lessFoodCards;
/* Opakované poklesy (B-HYPO poklesy/dny; vlastník 27. 10. 2026, SCHEMA 74): obecná rada, co dělat (texts.opakovane), a pravidlo k nízké glukóze; bez výzvy volat.
   Zavírá se „Rozumím“; znovu se ukáže až s dalším poklesem. */
var TIMES = { 2: 'dvakrát', 3: 'třikrát', 4: 'čtyřikrát', 5: 'pětkrát' };
function hypoAlertTitle(a) { return 'Glukóza vám za posledních ' + a.days + ' dní klesla pod 4 ' + (TIMES[a.count] || a.count + '×'); } /* klouzavých 7 dní, ne kalendářní týden (kontrola 2, C13) */
function hypoAlertCard(S) {
  var a = NF.hypoAlert(S); if (!a || a.seen) return '';
  var T = NF.texts(S, 'B-HYPO') || {};
  /* SCHEMA 86 (navrhy-designu/33, návrh 5; nové znění B-HYPO ke schválení): rada v bodech, věta „nečekejte na kontrolu…“ viditelná a jen jednou;
     pravidla k nízké glukóze a k menší porci jako řádky k rozbalení (v rozbaleném I-HYPO se poslední věta o opakovaných poklesech neopakuje). */
  var body = (T.opakovaneBody && T.opakovaneBody.length ? '<ul class="bul">' + T.opakovaneBody.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ul>' : '<p class="mt-1 mb-0">' + e(NF.dropRuleRefs(S, T.opakovane || '')) + '</p>');
  var hypo = ruleOf(S, 'I-HYPO') ? ruleFull(S, 'I-HYPO', T.opakovaneHypo || 'Při poklesu: pravidlo k nízké glukóze', /\s*Když glukóza klesá pod 4 opakovaně, nečekejte na kontrolu:[^.]*\./) : '';
  var mene = ruleOf(S, 'I-MENE') ? ruleFull(S, 'I-MENE', T.opakovaneMene || 'Když sníte méně než obvykle') : '';
  return card('<p class="eyebrow doc-h">' + NF.icon('shield') + ' Bezpečí</p>' + ttl(hypoAlertTitle(a)) + body + hypo + mene +
    '<div class="actions mt-3">' + btn('Rozumím', 'hypoAlertSeen', null, 'primary sm') + '</div>' + rules(S, ['B-HYPO']), 'doc low repeat');
}
/* Odpověď „ano, pod 4“: karta s pravidlem zůstane, dokud ji pacient nepotvrdí; řekne, kolik poklesů se počítá (19. 10. 2026). Bez věty o volání (SCHEMA 74).
   Když poklesy dosáhly B-HYPO.poklesy, nese pravidlo karta po opakovaných poklesech a tahle se neukazuje. */
function lowNoticeCard(S) {
  if (!S.lowNotice || NF.day(S.lowNotice.at) !== NF.day(S.clock)) return '';
  /* SCHEMA 86 (rozhodnutí vlastníka 5. 11. 2026, bod 2 a 4): karta jen když je aktuální – nejvýš LOW_NOTICE_H hodin po zápisu poklesu, ne celý den */
  if (NF.minutesDiff(S.lowNotice.at, S.clock) > LOW_NOTICE_H * 60) return '';
  var al = NF.hypoAlert(S); if (al && !al.seen) return '';
  var seenBtn = '<div class="actions mt-3">' + btn('Rozumím', 'lowNoticeSeen', null, 'sm') + '</div>';
  /* M2 (kontrola 2): zamítnutá B-HYPO = poklesy se nepočítají; místo počtu oznámení na místě */
  if (NF.item(S, 'B-HYPO') && !NF.usable(S, 'B-HYPO')) return eventCard(S, 'I-HYPO', 'Glukóza klesla pod 4', off(S, 'B-HYPO') + seenBtn, 'low');
  var T = NF.texts(S, 'B-HYPO') || {}, note = '<p class="mt-0 mb-2">' + e(T.zapsano || 'Pokles jsme zapsali. Lékař ho uvidí na kontrole.') + '</p>'; /* bez „1 ze 2“ (oprava 05) */
  /* noční pokles zapsaný u snídaně už odezněl: pravidlo krátce; odpověď „Ano, pod 4“ teď je okamžik události: první krok, Co dál, celé na klepnutí */
  var night = !!S.lowNotice.night || S.episodes.some(function (x) { return x.manual && x.manual.nightLow && NF.day(x.at) === NF.day(S.clock) && Math.abs(NF.minutesDiff(x.recordedAt || x.at, S.lowNotice.at)) <= 10; });
  if (night) return ruleCard(S, 'I-HYPO', 'Pokles pod 4 je zapsaný', seenBtn, 'low', note + ruleShortBody(S, 'I-HYPO')) + rules(S, ['B-HYPO']);
  return ruleCard(S, 'I-HYPO', 'Pokles pod 4 je zapsaný', seenBtn, 'low event', note + ruleEventBody(S, 'I-HYPO')) + rules(S, ['B-HYPO']);
}
var LOW_NOTICE_H = 3; /* SCHEMA 86, zvoleno bez dotazu: karta po poklesu zůstane na Dnes nejvýš 3 hodiny (stejně jako „Před chvílí“ u otázky na pokles) */
/* „Uložit, píchnu za chvíli“: jídlo je zapsané, inzulin čeká; po 30 min otázka „Byl inzulin?“ (jen při otevření, nic nehlídá). */
function pendingInsulinCard(S) {
  return NF.pendingInsulin(S).map(function (ep) {
    var late = NF.minutesDiff(ep.recordedAt || ep.at, S.clock) >= 30, lbl = NF.mealLabel(ep.meal, 'ke');
    return card('<div class="now-row"><span class="ic" aria-hidden="true">' + NF.icon('syringe') + '</span><div>' + ttl(late ? 'Byl ' + e(lbl) + ' inzulin?' : 'Inzulin ' + e(lbl) + ' čeká na potvrzení') + (late ? 'Jídlo je zapsané v ' + e(NF.fmtClock(ep.at)) + '.' : 'Až si píchnete ' + ep.insulin.prescribed + ' j., potvrďte to.') + '</div></div>' +
      '<div class="choice-row col mt-3" role="group" aria-label="Byl inzulin?">' + choice(opt('Píchnuto ' + ep.insulin.prescribed + ' j.', 'podle plánu'), 'pendingInsulin', ep.id + ':as', false, 'opt') + choice(opt('Nepíchnuto', 'k tomuto jídlu bez inzulinu'), 'pendingInsulin', ep.id + ':none', false, 'opt') + choice(opt('Nevím', 'pro jistotu počítáme, že už je'), 'pendingInsulin', ep.id + ':unknown', false, 'opt') + '</div>');
  }).join('');
}
/* Volba se dvěma řádky: titulek a vysvětlení (místo tečky „·“ v jednom řádku). */
function opt(t, sub) { return '<span class="opt-t">' + t + '</span>' + (sub ? '<span class="opt-s">' + sub + '</span>' : ''); }
/* Glukóza teď pod 4 (čip v kroku 1): hned pravidlo k nízké glukóze; zápis pokračuje, procházku neradíme (19. 10. 2026). */
function lowNowCard(S) { return eventCard(S, 'I-HYPO', 'Glukóza je teď pod 4', '<p class="small mt-3 mb-0">' + e(NF.lowNowText(S)) + '</p>', 'low'); } /* rozhodnutí vlastníka 25. 10. 2026: při pod 4 žádná rada */
/* Čip „nad 15“ v kroku 1 (glukóza teď, u zpětného zápisu i nejvyšší po jídle) → pravidlo I-VYSOKA hned (SCHEMA 74). */
function highNow(S, m, part) {
  var out = '';
  if (part !== 'peak' && m.beforeAsked && m.beforeBound === 'over') out += highCard(S, m.retro ? 'Při jídle byla glukóza nad 15' : 'Glukóza je teď nad 15', !!m.retro);
  if (part !== 'before' && m.retro && m.peakAsked && m.peakBound === 'over') out += highCard(S, 'Po jídle byla glukóza nad 15', true);
  return out;
}
V.highNow = highNow;
V.prevAskBlock = prevAskBlock; V.hypoWatchCard = hypoWatchCard; V.hypoAlertCard = hypoAlertCard; V.lowNoticeCard = lowNoticeCard; V.pendingInsulinCard = pendingInsulinCard;

/* V.peakAskCard (karta „Nejvyšší hodnota po…?“ s psaním desetinného čísla) smazána – nevykreslovala se od 18. 10. 2026 a obcházela by čipy (kontrola 4, 06 C1). */
function divergenceBlock(S, ep, parts) {
  var dv = NF.divergence(S, ep); if (!dv) return parts ? null : '';
  /* B14 (kontrola 2): slovo pacienta „nejvyšší hodnota“, „nad 15“ slovem (hranice čipu, ne číslo); C11: jiná příloha a jiné množství zvlášť; C1: jedno znění neobvyklého dne.
     SCHEMA 86 (návrh 4): rozdíl proti dřívějšku jednou větou, volby ve dvou sloupcích, vysvětlení až v Podrobnostech; bez „do učení“. */
  var cmp = dv.peakMed != null ? 'Dřív bývala nejvyšší kolem ' + e(String(dv.peakMed)) + '. ' : 'Tentokrát to dopadlo jinak než dřív. ';
  var q = '<p class="mt-0 mb-2 diverge-q">' + cmp + '<b>Bylo to stejné jídlo?</b></p><div class="q2col" role="group" aria-label="Bylo to stejné jídlo?">' + choice('Stejné jídlo', 'foodDiverge', ep.id + ':same', false, 'sm') + choice('Jiná příloha', 'foodDiverge', ep.id + ':side', false, 'sm') + choice('Jiné množství', 'foodDiverge', ep.id + ':amount', false, 'sm') + choice('Jinak připravené', 'foodDiverge', ep.id + ':prep', false, 'sm') + choice('Neobvyklý den (' + NF.UNUSUAL + ')', 'foodDiverge', ep.id + ':day', false, 'sm wide') + '</div>';
  var more = '<p class="small muted mt-2 mb-0">Jídlo bude „známé“, až se zápisy shodnou. Jiná příloha nebo příprava se přidá jako samostatné jídlo; jiné množství a neobvyklý den do hodnocení jídla nepočítáme.</p>';
  if (parts) return { q: q, more: more };
  return '<div class="hint neutral mt-3">' + q + more + '</div>';
}
/* Připomínka před kontrolou (vlastník 27. 10. 2026, SCHEMA 74): během plánu pacient hodnoty opisuje; před kontrolou pošle do ordinace export ze senzoru
   a sestra ho na kontrole nahraje. Na Dnes v kartě „Za N dní jdete na kontrolu“ (inline) a nahoře v přehledu Před kontrolou. Text je provozní (Z-IMPORT). */
function exportRemind(S, inline) {
  if (S.sensorImport && S.nextVisit && NF.parse(S.sensorImport.at) >= NF.parse(NF.addDays(S.nextVisit, -14))) return ''; /* export za toto období už je nahraný */
  /* SCHEMA 86 (oprava 05; 02 1.27): připomínka zůstává doslova viditelná, pod ní krátký návod obecně (Z-IMPORT, provozní) a věta o sestře na klepnutí */
  var T = NF.texts(S, 'Z-IMPORT') || {}, steps = T.navod || [];
  var t = '<b>' + e(T.pripominka || 'Před kontrolou pošlete do ordinace export ze senzoru.') + '</b>';
  var how = '<details class="more mt-1 export-how"><summary>' + e(T.navodNadpis || 'Jak na to') + '</summary>' + (steps.length ? '<ol class="bul">' + steps.map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ol>' : '') + '<p class="small muted mb-0">Sestra ho na kontrole nahraje a doplní přesný průběh glukózy k vašim zápisům.</p></details>';
  return inline ? '<p class="mt-1 mb-0 export-remind">' + t + '</p>' + how : hint('<p class="mt-0 mb-0">' + t + '</p>' + how, 'export-remind'); /* export nahrává jen sestra (vlastník 27. 10. 2026) */
}
function importNotice(S) { return exportRemind(S, false); }
V.exportRemind = exportRemind;
/* V.importPage (stránka „Nahrát export“ u pacienta) zrušena 27. 10. 2026: export nahrává jen sestra. */
V.divergenceBlock = divergenceBlock;

/* ---------- Dnes ---------- */
function todayEpisodes(S) { return S.episodes.filter(function (x) { return NF.day(x.at) === NF.day(S.clock); }); }
function basalToday(S) { return S.basalLog.filter(function (b) { return b.date === NF.day(S.clock) && (!b.at || b.at <= S.clock); })[0]; } /* záznam „z budoucnosti“ (večerní bazál ráno) se nepočítá */
V.today = function (S) {
  var p = NF.activePlan(S);
  var ill = p ? NF.ill(S) : false;
  /* SCHEMA 86 (rozhodnutí vlastníka 5. 11. 2026, bod 4; navrhy-designu/33, návrh 3): pozdrav a „Není mi dobře“ jako malé tlačítko v jednom řádku (chování beze změny – přepínač režimu nemoci) */
  var sick = !p || S.participation !== 'active' || ill ? '' : NF.nemocOn(S) ? '<button type="button" class="sick-chip" role="switch" aria-checked="false" data-action="illness" data-value="on">' + NF.icon('thermometer') + ' Není mi dobře</button>' : '';
  var out = '<div class="head-row"><div><p class="eyebrow">' + e(NF.fmtDayDate(S.clock)) + '</p><h1>' + e(greeting(S)) + '</h1></div>' + sick + '</div>' + (p && !ill && NF.nemocOn(S) ? rules(S, ['P-NEMOC']) : '');
  if (!p) return out + card('<h2>Zatím nemáte plán</h2><p>Až vám ho lékař v ordinaci vydá, uvidíte tady, co dělat.</p>');
  if (S.participation !== 'active') return out + card('<h2>Účast je ukončená</h2><p>Návyky, rady i připomínky jsou zastavené. Vaše zápisy zůstávají uložené.</p>');
  /* Přepínač nemoci nese P-NEMOC (A02); zamítnutá P-NEMOC: na jeho místě oznámení „Tahle část nefunguje“ (A05, Q1). */
  if (!NF.nemocOn(S)) out += off(S, 'P-NEMOC');
  var fm = NF.focusMeal(S), meal = fm ? fm.meal : mealNow(S), dose = p.doses[meal], hour = NF.parse(S.clock).getHours();
  var basalHour = Number(String(p.doses.basal.time).split(':')[0]) || 21;
  var basal = basalToday(S), basalTime = hour >= basalHour - 2;
  var yday = NF.day(NF.addDays(S.clock, -1)), askYesterday = NF.day(p.effectiveFrom) <= yday && !S.basalLog.some(function (b) { return b.date === yday; });
  var ask = S.ask && S.ask.day === NF.day(S.clock) ? S.ask : null;
  if (ill) {
    var ci = S.illness.checkins.filter(function (c) { return NF.day(c.at) === NF.day(S.clock); })[0];
    out += card('<div class="now-row"><div>' + ttl('Při nemoci') + 'Zapisujte jídla dál. ' + e(NF.ILL_TEXT) + ' Dávky inzulinu platí, jak řekl lékař.' + /* jedna věta při nemoci (A19); SCHEMA 86: bez „pravidla máte na této stránce“ – jsou hned pod tím */
      (NF.day(S.illness.from) === NF.day(S.clock) ? '<p class="next-line ta-l">Zítra se zeptáme, jestli je vám lépe.</p>' : ci ? '<p class="next-line ta-l">Dnes už máme odpověď. Zeptáme se zase zítra.</p>' : '<div class="actions mt-3">' + btn('Už je mi lépe', 'illnessCheck', 'better', '') + btn('Ještě ne', 'illnessCheck', 'same', '') + '</div>') + '</div></div>' + rules(S, ['P-NEMOC']), 'soft');
  }
  var illRules = ill ? illnessInstructions(S, p) : ''; /* SCHEMA 86 (P2; rozhodnutí 5. 11. 2026, bod 4 přebíjí odst. 8): pravidla pro nemoc krátce hned pod „Co teď“, aby „Co teď“ zůstalo nad ohybem */
  if (ill && NF.illnessLong(S)) out += doctorCard(S, 'I-NEMOC-JIDLO', 'Nemoc trvá už ' + NF.plural(NF.daysBetween(S.illness.from, S.clock), 'den', 'dny', 'dní'), '<p class="small mt-3 mb-0">' + (instructionText(S, 'I-NEMOC-JIDLO') ? '' : 'Pravidla pro nemoc najdete v Bezpečí. ') + 'Lékař uvidí na kontrole, jak dlouho nemoc trvala.</p>');
  /* Otázka „Klesla glukóza pod 4?“ je nad „Co teď“ (oprava 05; 02 1.22): v tu chvíli je důležitější než další jídlo. */
  out += hypoWatchCard(S);
  var slots = NF.daySlots(S), MT = function (k) { return e(NF.mealText(meal, k)); };
  var mealDue = !!(fm && (fm.state === 'now' || fm.state === 'next')), nextOnly = !!(fm && fm.state === 'next');
  /* „Co teď“ je jediný hrdina obrazovky (rozhodnutí vlastníka 19. 10. 2026): podbarvená karta, zpráva velkým písmem, bez ikony; pod hlavním tlačítkem řádek „Potom: …“ (P6). */
  var hero = function (msg, sub, body, then) { return card('<p class="eyebrow">Co teď</p><h2 class="hero-msg">' + msg + '</h2>' + (sub ? '<p class="hero-sub">' + sub + '</p>' : '') + (body || '') + (then ? '<p class="next-line">' + NF.icon('arrow-right') + ' Potom: ' + e(then) + '</p>' : ''), 'hero'); };
  var skipAsk = function (a) { return '<div class="mt-4"><b>Byl ' + e(NF.mealLabel(meal, 'ke')) + ' inzulin?</b><div class="choice-row col mt-2" role="group">' + choice(opt('Ano, ' + dose.units + ' j.', 'podle plánu'), 'mealSkip', meal + ':as', false, 'opt') + choice(opt('Ano, jinak', 'jiné množství'), 'mealSkip', meal + ':other', false, 'opt') + choice(opt('Ne', 'bez inzulinu'), 'mealSkip', meal + ':none', false, 'opt') + choice(opt('Nevím', 'pro jistotu počítáme, že byl'), 'mealSkip', meal + ':unknown', false, 'opt') + '</div>' + (a && NF.hasInstruction(S, 'I-MENE') ? '<p class="small mt-3 mb-1">Když byl inzulin bez jídla, platí toto pravidlo:</p>' + ruleShortBody(S, 'I-MENE') : '') + '</div>'; };
  var basalBox = function () {
    return '<div class="actions col mt-4">' + btn(S.basalOther ? 'Přece jen ' + p.doses.basal.units + ' j.' : 'Bazál ' + p.doses.basal.units + ' j. je píchnutý', 'basalConfirm', 'as', S.basalOther ? 'quiet' : 'primary big') /* při „Jinak“ je jediné primární „Uložit“ (01 #12) */ + btn('Jinak', 'basalOther', null, '', S.basalOther ? ' aria-pressed="true"' : '') + '</div>' +
      (S.basalOther ? '<div class="mt-2">' + unitsSlider('basal-units', 'basalUnitsSet', S.basalUnits != null ? S.basalUnits : p.doses.basal.units, p.doses.basal.units, 'Bazál: jednotky') + '</div><div class="actions">' + btn('Uložit', 'basalConfirm', 'other', 'primary') + btn('Dnes bez bazálu', 'basalConfirm', 'none', 'quiet') + '</div>' : ''); /* SCHEMA 87: posuvník */
  };
  var basalInHero = false;
  if (mealDue) {
    out += hero(nextOnly ? 'Další jídlo: ' + e(NF.mealLabel(meal)) : 'Na řadě je ' + e(NF.mealLabel(meal)), nextOnly ? 'Inzulin ' + e(NF.mealLabel(meal, 'ke')) + ' až před jídlem.' : '',
      '<div class="actions col mt-4">' + btn('' + NF.icon('utensils') + ' Chystám se jíst', 'startMeal', meal, 'primary big') + '</div>' +
      '<div class="actions split">' + btn(MT('already'), 'mealRetro', meal, '') + btn('Dnes ' + MT('without'), 'mealSkipAsk', meal, '', ask && ask.meal === meal ? ' aria-pressed="true"' : '') + '</div>' +
      (ask && ask.meal === meal ? skipAsk(false) : ''), ill ? 'připomeneme inzulin.' : 'připomeneme inzulin a poradíme k jídlu.');
  } else if (basalTime && !basal) {
    /* Večer jedna karta s tlačítkem přímo v ní (rozhodnutí vlastníka 5. 11. 2026, bod 4; 02 1.13): bazál je na Dnes jednou v Co teď a jednou v pásu dne. */
    basalInHero = true;
    out += hero('Čas na bazál', 'Inzulin na noc ' + V.dose(p.doses.basal.units, '', 'sm') + ' ' + NF.ve(p.doses.basal.time) + ' ' + e(p.doses.basal.time) + '.', basalBox(), 'další věc až zítra ráno.');
  } else if (fm && fm.state === 'missed') {
    var a0 = ask && ask.meal === meal ? ask : null;
    out += hero(MT('was'), '',
      '<div class="actions split mt-4">' + choice(MT('yes'), 'mealRetro', meal, false, 'big') + choice('Ne, ' + MT('without'), 'mealSkipAsk', meal, !!a0, 'big') + '</div>' + (a0 ? skipAsk(true) : ''), null);
  } else {
    out += hero('Dnešní jídla jsou zapsaná', '',
      '<div class="actions col mt-4">' + btn('' + NF.icon('apple') + ' Zapsat svačinu', 'startMeal', 'snack', 'big') + '</div>', 'další věc ' + (basalTime ? 'zítra ráno.' : 'večer u bazálu.'));
  }
  out += illRules;
  /* bezpečí, jen když je aktuální (rozhodnutí vlastníka 5. 11. 2026, bod 4) */
  out += lowNoticeCard(S);
  out += hypoAlertCard(S);
  out += lessFoodCards(S); /* pravidlo po menší porci nebo vynechaném jídle s inzulinem (23. 10. 2026), krátce s „co dál“ */
  if (basalTime && !basalInHero) out += prevAskBlock(S);
  var back = NF.returnAfterGap && NF.returnAfterGap(S); if (back) out += card('<p class="mt-0 mb-0"><b>Vítejte zpět, pokračujeme tam, kde jste skončili.</b></p>', 'flat welcome-back'); /* C5 (32/01, SCHEMA 84): po ≥ 7 dnech bez zápisu jedna věta, žádná výčitka */
  out += pendingInsulinCard(S);
  out += doseOffPlanCard(S); /* S-DAVKA (vlastník 1. 11. 2026, bod 5): dvakrát po sobě jiná dávka než v plánu u téhož jídla dne */
  /* zpětná vazba: výsledek posledního jídla (zkrácený, když je na řadě další a nic se neptá), pak nejvýš jedna karta milníku nebo týdne */
  out += resultCard(S, mealDue);
  var soon = soonCard(S), msCard = milestoneCard(S); out += msCard || (soon ? '' : weekCard(S)); /* SCHEMA 86 (01 D12): týden před kontrolou na Dnes neukazujeme – přehled je v „Co uvidí lékař“ a v Mém plánu */
  out += soon;
  out += yesterdayCard(S); /* kontrola 4 (07 B3): zapomenutý zápis ze včerejška do 24 h od konce slotu – jeden řádek s tlačítkem */
  /* pás dne; zápis s „Opravit inzulin“ je v jeho kartě (návrh 3) */
  out += dayStrip(S, slots, meal, basal, basalTime, p);
  if (askYesterday) {
    var byBody = 'Záznam ze včerejška chybí. Lékař předepsal ' + p.doses.basal.units + ' j. ve ' + e(p.doses.basal.time) + '.' +
      '<div class="choice-row col mt-2" role="group">' + choice('Ano, ' + p.doses.basal.units + ' j.', 'basalYesterday', 'as', false) + choice('Ne', 'basalYesterday', 'none', false) + choice('Nevím', 'basalYesterday', 'unknown', false) + '</div>';
    /* kontrola 4 (07 C4): po poledni je karta jen řádek s rozbalením, aby celý den nezabírala Dnes */
    out += hour >= 12 ? card('<details class="more"><summary>' + NF.icon('moon') + ' <span><b>Byl včera večer bazál?</b> · záznam chybí</span></summary><div class="mt-2">' + byBody + '</div></details>')
      : card('<div class="now-row"><span class="ic" aria-hidden="true">' + NF.icon('moon') + '</span><div>' + ttl('Byl včera večer bazál?') + byBody + '</div></div>');
  }
  if (basalTime && !basal && !basalInHero) out += card('<p class="eyebrow">Inzulin na noc</p><h2 class="card-title">Bazál ' + NF.ve(p.doses.basal.time) + ' ' + e(p.doses.basal.time) + ' ' + V.dose(p.doses.basal.units, '', 'sm') + '</h2>' + basalBox(), 'basal-card');
  if (!(fm && fm.state === 'done') || (basalTime && !basal) || (fm && fm.state === 'missed')) out += '<div class="actions sec pull-up mb-4">' + btn('' + NF.icon('apple') + ' Zapsat svačinu', 'startMeal', 'snack', 'link') + '</div>'; /* velké tlačítko svačiny je jen ve stavu „vše zapsáno“ */
  /* Jak si vedu: jedna věta s odkazem do Mého plánu (rozhodnutí vlastníka 5. 11. 2026, bod 4 a 5); návyky a cesta ke kontrole jsou tam */
  if (!ill) out += howLine(S, true); /* při nemoci se zápisy nehodnotí (15 odst. 8) */
  if (NF.item(S, 'R-NAVYKY') && !NF.usable(S, 'R-NAVYKY')) out += off(S, 'R-NAVYKY'); /* zamítnutá R-NAVYKY: startovní návyky neplatí (A05); návyky samy jsou v Mém plánu */
  return out;
};
/* S-DAVKA (vlastník 1. 11. 2026, bod 5): jedna karta, i když se dávka liší u víc jídel dne. Aplikace dávku nemění ani nenavrhuje. */
function doseOffPlanCard(S) {
  var T = NF.texts(S, 'S-DAVKA'); if (!T || !NF.doseOffPlan(S).length) return '';
  return card('<div class="now-row"><span class="ic" aria-hidden="true">' + NF.icon('syringe') + '</span><div>' + ttl(T.nadpis || '') + '<p class="mt-1 mb-0">' + e(T.karta || '') + '</p></div></div>', 'dose-off');
}
/* Kontrola 4 (07 B3): zapomenutý zápis ze včerejška – stejný zpětný zápis (obě hodnoty a pokles z grafu), do 24 h od konce slotu. Akce mealRetroYesterday doplní prezentační vrstva v ui.js. */
function yesterdayCard(S) {
  var g = NF.yesterdayGaps(S); if (!g.length) return '';
  var names = g.map(function (x) { return NF.mealLabel(x.meal); });
  /* SCHEMA 86 (návrh 4): jeden řádek s tlačítkem; „Hodnoty najdete v grafu senzoru“ je ve zpětném zápisu, kde se hodnota opisuje */
  return card('<div class="head-row mb-0"><span><b>Včera chybí ' + e(NF.joinOr(names).replace(' nebo ', ' a ')) + '</b></span>' + (g.length === 1 ? btn('Doplnit', 'mealRetroYesterday', g[0].meal, 'sm') : '') + '</div>' +
    (g.length > 1 ? '<div class="actions split mt-2">' + g.map(function (x) { return btn('Doplnit ' + e(NF.mealLabel(x.meal, 'acc')), 'mealRetroYesterday', x.meal, 'sm'); }).join('') + '</div>' : ''), 'yesterday mini-card');
}
V.doseOffPlanCard = doseOffPlanCard; V.yesterdayCard = yesterdayCard;
/* Pás dne: ráno → večer, kruh za každé hlavní jídlo a bazál; značka „teď“ bez pohybu (6:00–22:00). */
function dayStrip(S, slots, meal, basal, basalTime, p) {
  var fm = NF.focusMeal(S), nodes = slots.map(function (sl) {
    var next = fm && fm.meal === sl.meal && fm.state === 'next';
    var st = sl.state === 'done' ? 'done' : sl.state === 'skipped' ? 'skipped' : sl.state === 'missed' ? 'missed' : sl.meal === meal ? (next ? 'next' : 'now') : 'wait';
    var txt = st === 'done' ? 'zapsáno' : st === 'skipped' ? 'vynecháno' : st === 'missed' ? 'chybí' : st === 'now' ? 'teď' : st === 'next' ? 'další' : 'později';
    var units = (st === 'now' || st === 'next') && p.doses[sl.meal] ? p.doses[sl.meal].units : null;
    return { cls: st, ic: st === 'done' ? 'check' : st === 'skipped' ? 'minus' : st === 'missed' ? 'question' : 'utensils', label: NF.mealLabel(sl.meal, true), txt: txt, sub: units, act: st === 'now' || st === 'next' ? ['startMeal', sl.meal] : st === 'done' ? ['page', 'foods'] : st === 'missed' ? ['mealRetro', sl.meal] : null };
  });
  nodes.push({ cls: basal ? 'done' : basalTime ? 'now' : 'wait', ic: basal ? 'check' : 'moon', label: 'Bazál', txt: basal ? 'zapsáno' : basalTime ? 'teď' : String(p.doses.basal.time), sub: !basal && basalTime ? p.doses.basal.units : null });
  /* seznam uzlů, ne obrázek: tlačítka uvnitř musí čtečka ohlásit (přístupnost, 19. 10. 2026) */
  return card('<ol class="daystrip" aria-label="Dnešní den">' + nodes.map(function (n) {
    var inner = '<span class="dot" aria-hidden="true">' + NF.icon(n.ic) + '</span><b>' + e(n.label) + '</b><small>' + e(n.txt) + '</small>' + (n.sub != null ? dose(n.sub, '', 'sm') : '');
    var label = n.label + ' ' + n.txt + (n.sub != null ? ' ' + n.sub + ' j.' : '') + (n.act ? (n.act[0] === 'startMeal' ? ', zapsat jídlo' : n.act[0] === 'page' ? ', otevřít jídla' : ', doplnit zápis') : ''); /* název začíná viditelným textem (04 #12) */
    return '<li class="dnode ' + n.cls + '">' + (n.act ? '<button type="button" data-action="' + n.act[0] + '" data-value="' + e(n.act[1]) + '" aria-label="' + e(label) + '">' + inner + '</button>' : inner) + '</li>';
  }).join('') + '</ol>' + fixInsulinLine(S)); /* SCHEMA 86: „Zapsáno … · Opravit inzulin“ je v kartě pásu dne */
}
/* SCHEMA 86 (rozhodnutí vlastníka 5. 11. 2026, bod 4 a 5): „jak si vedu“ – jedna věta slovem a ikonou (NF.howAmI, R-SKORE), čísla v Podrobnostech.
   Na Dnes s řádkem do Mého plánu, v Mém plánu s Podrobnostmi. */
function howLine(S, onToday) {
  var h = NF.howAmI(S); if (!h) return NF.item(S, 'R-SKORE') && !NF.usable(S, 'R-SKORE') ? off(S, 'R-SKORE') : '';
  var ic = h.state === 'ok' ? 'check' : h.state === 'few' ? 'clock' : 'arrow-up';
  var line = '<p class="how-line ' + h.state + '">' + NF.icon(ic) + '<span>' + e(h.text) + '</span></p>';
  if (onToday) return card('<p class="eyebrow">Jak si vedu</p>' + line + rowlink('Můj plán', 'page', 'plan', 'cesta ke kontrole a plnění plánu') + rules(S, ['R-SKORE']), 'how mini-card');
  return line + (h.details.length ? '<details class="more mt-1"><summary>Podrobnosti</summary><ul class="bul small">' + h.details.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><p class="small muted mb-0">Za posledních 7 dní. Nejvyšší glukóza po jídle do ' + e(NF.mmol1(NF.targets(S).high)) + ' mmol/l je v cíli.</p></details>' : '') + rules(S, ['R-SKORE']);
}
V.howLine = howLine;
V.dayStrip = dayStrip;
function habitDone(S, h, todayEps, basal) {
  switch (h.catalogId) {
    case 'H-ZAPIS': return NF.daySlots(S).every(function (x) { return x.state === 'done' || x.state === 'skipped'; });
    case 'H-PORCE': var pe = todayEps.filter(function (x) { return !NF.inIllness(S, x); }); return pe.length >= 1 && pe.every(function (x) { return x.portion === 'usual'; }); /* C5: jídla z nemoci se do návyku nepočítají */
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
    case 'H-PORCE': var pp = todayEps.filter(function (x) { return !NF.inIllness(S, x); }); return pp.length ? pp.filter(function (x) { return x.portion === 'usual'; }).length + ' / ' + NF.plural(pp.length, 'jídlo', 'jídla', 'jídel') + ' v obvyklé porci' : todayEps.length ? 'při nemoci se nepočítá' : 'zatím žádné jídlo';
    case 'H-INZULIN': return todayEps.length ? todayEps.filter(function (x) { return x.insulin.confirmed !== 'unknown'; }).length + ' / ' + todayEps.length + ' potvrzeno' : 'zatím žádné jídlo';
    case 'H-CAS': return 'obvykle 7:00–8:00';
    case 'H-BAZAL': return basal ? 'potvrzeno ' + basal.time : NF.ve(NF.activePlan(S).doses.basal.time) + ' ' + NF.activePlan(S).doses.basal.time;
    default: return h.how || '';
  }
}

/* ---------- před jídlem: 3 kroky ---------- */
/* Talíř porce: obvyklá · větší · menší. Animace „zpět k obvyklé“ ukáže směr rady pohybem (pravidlo 3: nikdy nahoru po píchnutí). */
function plateSvg(kind, anim) {
  var r = anim ? 5.6 : kind === 'bigger' ? 8.2 : kind === 'smaller' ? 3.6 : 5.6;
  return '<svg class="plate-ico' + (anim ? ' anim-' + anim : '') + '" viewBox="0 0 28 28" aria-hidden="true"><circle class="rim" cx="14" cy="14" r="12"/><circle class="inner" cx="14" cy="14" r="9.5"/><circle class="food" cx="14" cy="14" r="' + r + '"/></svg>';
}
V.plateSvg = plateSvg;
/* SCHEMA 87 (bod 7; 15 odst. 7.1): pátá volba „jiný čas“ otevře posuvník „před kolika minutami“ (0–NF.INS_AGO_MAX po 5 min). */
var TIME_OPTS = [['0', 'právě teď'], ['-5', 'před 5 min'], ['-15', 'před 15 min'], ['-30', 'před 30 min']];
function timeOther(m) { var cur = m.offset == null || m.offset === '' ? '0' : String(m.offset); return !!m.timeOther || (cur !== '15' && !TIME_OPTS.some(function (o) { return o[0] === cur; })); }
function timeChips(m) {
  var cur = m.offset == null || m.offset === '' ? '0' : String(m.offset), oth = timeOther(m); /* „právě teď“ je předvybrané (kontrola 4, 07 C2) */
  var ago = Math.max(0, Math.min(NF.INS_AGO_MAX, -Number(cur) || 0));
  return '<div class="timechips">' + TIME_OPTS.map(function (o) { return choice(o[1], 'mealTime', o[0], !oth && cur === o[0]); }).join('') + choice('jiný čas', 'mealTime', 'other', oth) + '</div>' +
    (oth ? '<div class="mt-2">' + slider({ id: 'ins-ago', action: 'mealTimeAgo', kind: 'plain', min: 0, max: NF.INS_AGO_MAX, step: 5, unit: 'min', label: 'Před kolika minutami byl inzulin píchnutý', value: ago, size: 'sm', hint: 'Před kolika minutami byl inzulin píchnutý.' }) + '</div>' : '');
}
/* SCHEMA 87 (bod 3; 15 odst. 15a): jednotky inzulinu u pacienta posuvníkem (dřív −/+). Značka „předepsáno N j.“, výši nic nenavrhuje; meze NF.DOSE_RANGE. */
function unitsSlider(id, action, units, prescribed, label) {
  return slider({ id: id, action: action, kind: 'plain', min: NF.DOSE_RANGE[0], max: NF.DOSE_RANGE[1], step: 1, unit: 'j.', label: label || 'Kolik jednotek', value: units >= 1 ? units : null, ref: prescribed, refText: 'předepsáno ' + prescribed + ' j.', base: prescribed, prompt: 'Nastavte posuvníkem' });
}
V.unitsSlider = unitsSlider;
/* Hlavička kroku: Zpět vlevo nahoře (48 px), krok 1 se ptá, zda zahodit rozpracovaný zápis (18. 10. 2026). */
function stepHead(S, m, step) {
  var back = step > (NF.isSnack(m.meal) ? 2 : 1) && !(m.retro && step === 1) ? btn(NF.icon('chevron-left') + ' Zpět', 'mealStep', String(step - 1), 'back') : btn(NF.icon('chevron-left') + ' Zpět na Dnes', (m.bolus || m.beforeAsked || m.foodId) ? 'mealCancelAsk' : 'mealCancel', null, 'back');
  return '<div class="stephead">' + back + safetyBtn() + '</div>';
}
/* Bezpečí jedním klepnutím i z kroků jídla (LF-11, 19. 10. 2026): list přes obrazovku, zápis zůstává rozpracovaný. */
function safetyBtn() { return btn(NF.icon('shield') + ' Bezpečí', 'safetyOpen', null, 'back safety-btn'); }
V.safetySheet = function (S) { return patientWrap(function () { return safetySheetBody(S); }); };
function safetySheetBody(S) {
  var p = NF.activePlan(S);
  return '<div class="patient sheet-body"><p class="eyebrow">' + (S.meal ? 'Zápis jídla zůstává rozpracovaný' : 'Platí vždy, i bez připojení') + '</p><h2 class="sheet-h">Bezpečí</h2>' +
    card('<h2>Kam se obrátit</h2>' + safetyContacts(S)) +
    card('<h2>Bezpečnostní pravidla</h2>' + instructionsList(S, p, false, SAFETY_ORDER), 'rules-card') +
    '<div class="actions col">' + btn(NF.icon('chevron-left') + (S.meal ? ' Zpět k zápisu' : ' Zpět'), 'closeDrawer', null, 'primary big') + '</div></div>';
}
var SAFETY_ORDER = ['I-HYPO', 'I-VYSOKA', 'I-MENE', 'I-NEVIM', 'I-NEMOC-BAZAL', 'I-NEMOC-JIDLO', 'I-KONTAKT']; /* SCHEMA 86 (01 B): nízká, vysoká, menší porce, nevím, nemoc */
function safetyContacts(S) {
  var row = function (ic, k, v) { return '<div class="kv contact"><span>' + NF.icon(ic) + ' ' + e(k) + '</span><strong>' + e(v) + '</strong></div>'; }; /* popisek nahoře, cesta pod ním – na telefonu se nic neláme (23. 10. 2026) */
  /* čtyři cesty (vlastník 23. 10. 2026): senzor → podpora výrobce senzoru, aplikace → kontaktní formulář v aplikaci (S-PODPORA).
     Kontrola 3, B4: zdravotní cesty (ordinace, pohotovost, záchranná služba) jsou klinický obsah pravidla Kontakty (I-KONTAKT, garant); bez něj v plánu je na jejich místě oznámení. */
  var health = !S || NF.hasInstruction(S, 'I-KONTAKT');
  return (health ? row('stethoscope', 'Zdravotní potíže', 'ordinace, mimo ordinační dobu pohotovost') + row('shield', 'Ohrožení života', 'záchranná služba') + (S && PT > 0 ? rules(S, ['I-KONTAKT']) : '') : ruleOff(S, 'I-KONTAKT')) + row('cog', 'Nefunguje senzor', 'podpora výrobce senzoru') + row('message', 'Nefunguje NutriFee', 'napište podpoře') +
    '<p class="small muted mt-2 mb-1">Podpora řeší jen NutriFee, ne zdraví.</p><div class="actions meta mt-0">' + btn(NF.icon('message') + ' Napsat podpoře', 'supportOpen', null, 'sm') + '</div>' + /* samostatná věta nad tlačítkem (01 #14) */
    '<p class="small muted">Kontakt na podporu senzoru je na jeho balení nebo v jeho aplikaci. ' + e(demoText('cisla')) + (demoText('cisla') ? ' ' : '') + 'Sami nikam nic neposíláme ani nevoláme.</p>';
}
/* Noční pokles u snídaně (rozhodnutí vlastníka 1. 11. 2026, bod 7; B-HYPO): nepovinný čip pod hodnotou ze senzoru – žádná nová otázka ani připomínka,
   pacient se na senzor u snídaně stejně dívá. Nenabízí se, když se na tutéž noc ptá otázka po menší nebo vynechané večeři (NF.nightAsked), ani se zamítnutou B-HYPO. */
function nightChip(S, m) {
  if (!m || m.meal !== 'breakfast') return '';
  if (!NF.usable(S, 'B-HYPO')) return NF.item(S, 'B-HYPO') ? off(S, 'B-HYPO') : ''; /* zamítnutá B-HYPO: čip není, na jeho místě oznámení (zásada 4) */
  var day = m.retro && m.day ? m.day : NF.day(S.clock); if (NF.nightAsked(S, day)) return '';
  var T = NF.texts(S, 'B-HYPO') || {};
  return '<div class="night-low mt-3">' + choice((m.nightLow ? NF.icon('check') + ' ' : '') + e(T.nocCip || 'V noci klesla glukóza pod 4'), 'mealNightLow', 'toggle', !!m.nightLow, 'chip low night') +
    (T.nocCipPomoc ? '<details class="more mt-1"><summary>Kdy klepnout?</summary><p class="small muted">' + e(T.nocCipPomoc) + '</p></details>' : '') + rules(S, ['B-HYPO'], 'mt-1') + '</div>'; /* SCHEMA 86 (P9): vysvětlení na klepnutí */
}
V.nightChip = nightChip;
/* ---------- krok 1: otázky jedna po druhé (rozhodnutí vlastníka 5. 11. 2026, bod 3; navrhy-designu/33, návrhy 1a a 1b) ----------
   Inzulin → (je-li co doplnit) nejvyšší glukóza po minulém jídle a pokles → glukóza teď. Otevřená je vždy jen jedna otázka (P1); zodpovězené jsou řádky
   s fajfkou a „Změnit“, čekající jsou šedé řádky „Potom“. Odpovědi mají stejné akce a hodnoty jako dřív (mealBolus, peakChip, lowChip, mealBefore…),
   stopa se nemění; „Změnit“ a „Pokračovat“ jen přepínají, která otázka je otevřená (mealQ). Tři kroky zápisu a jeden pohled do senzoru zůstávají. */
var OFFSET_TXT = { '0': 'právě teď', '-5': 'před 5 min', '-15': 'před 15 min', '-30': 'před 30 min', '15': 'až po jídle' };
var RETRO_OFFSET_TXT = { '0': 'zároveň s jídlem', '-15': '15 min před', '-30': '30 min před', '15': 'až po jídle' };
function qDone(label, value, act, val, extra) {
  return '<div class="qdone"><span class="ck" aria-hidden="true">' + NF.icon('check') + '</span><div><small>' + e(label) + '</small><b>' + value + '</b>' + (extra || '') + '</div>' + (act ? btn('Změnit', act, val, 'link') : '') + '</div>';
}
function qHead(n, text) { return '<p class="eyebrow q-h"><span class="qnum" aria-hidden="true">' + n + '</span>' + e(text) + '</p>'; }
function qLater(items, sensor) {
  if (!items.length) return '';
  return '<div class="q-later"><p class="eyebrow mt-4 mb-1">' + (sensor ? 'Potom jeden pohled do aplikace senzoru' : 'Potom') + '</p>' + items.map(function (x) { return '<div class="qnext"><span class="n" aria-hidden="true">' + x[0] + '</span>' + e(x[1]) + '</div>'; }).join('') + '</div>';
}
V.qDone = qDone; V.qLater = qLater;
function q1Done(m) { return !!m.bolus && m.qOpen !== 'ins' && (m.q1done != null ? !!m.q1done : !!(m.bolus === 'as' || m.bolus === 'before' || (m.retro && m.bolus === 'none') || m.beforeAsked)); } /* q1done nastaví volba (mealBolus); bez něj (starší rozpracovaný zápis) rozhoduje odpověď */
function insAnswer(m, dose) {
  var t = m.retro ? RETRO_OFFSET_TXT : OFFSET_TXT, off = m.offset == null || m.offset === '' ? '0' : String(m.offset);
  if (m.bolus === 'as') return 'Ano, ' + dose.units + ' j. podle plánu' + (m.retro ? '' : off !== '0' ? ' · ' + (t[off] || (Number(off) < 0 ? 'před ' + (-Number(off)) + ' min' : '')) : '');
  if (m.bolus === 'other') return 'Ano, ' + m.units + ' j.' + (m.retro ? '' : ' · ' + (t[off] || (Number(off) < 0 ? 'před ' + (-Number(off)) + ' min' : '')));
  if (m.bolus === 'before') return 'Ještě ne, až před jídlem';
  if (m.bolus === 'none') return 'Ne, bez inzulinu';
  if (m.bolus === 'unknown') return 'Nevím – počítáme, že byl';
  return '';
}
/* Dotazy k minulému jídlu, které v kroku 1 čekají (nejvyšší hodnota, pak pokles); nejvýš dva zápisy. */
function prevPending(S) { return NF.pendingPeakAsk(S).concat(S.episodes.filter(function (x) { return x.manual && x.manual.peak != null && !x.manual.lowAsked && !NF.hasImport(x) && NF.minutesDiff(x.at, S.clock) <= 24 * 60 && NF.minutesDiff(x.at, S.clock) >= 120; })).slice(0, 2); }
function prevDoneEps(S, pend) { return S.meal && S.meal.prevDone ? S.episodes.filter(function (x) { return S.meal.prevDone.indexOf(x.id) >= 0 && x.manual && x.manual.lowAsked && pend.indexOf(x) < 0; }) : []; }
function prevPo(ep) { return NF.MEAL_PO[ep.meal] || 'po jídle'; }
function prevDoneRow(S, ep) {
  var pk = ep.manual.peak, st = pk == null ? null : vsState({ kind: 'glu', min: 4, max: 15, lo: 4, hi: Math.max(5, Math.min(14, Math.floor(NF.targets(S).high || 10))) }, ep.manual.peakBound === 'under' ? 3 : ep.manual.peakBound === 'over' ? 16 : pk);
  var tg = st ? tag(st.word === 'nad 15' ? 'nad cílem' : st.word, st.zone === 'ok' ? 'ok' : st.zone === 'low' ? 'low' : 'over') : '';
  var lowTxt = ep.manual.low === true ? 'ano' : ep.manual.low === false ? 'ne' : 'nevím';
  return qDone('Nejvyšší glukóza ' + prevPo(ep), (pk != null ? e(NF.mmolB(pk, ep.manual.peakBound)) + ' mmol/l ' + tg : 'bez hodnoty'), 'prevReopen', ep.id, '<small>Pod 4: ' + lowTxt + '</small>');
}
/* Otevřená otázka k minulému jídlu: nejdřív nejvyšší hodnota (Uložit je hlavní tlačítko otázky), pak pokles pod 4. */
function prevQuestion(S, ep, n) {
  var f = NF.foodById(S, ep.foodId), peakDone = ep.manual && ep.manual.peak != null;
  var head = qHead(n, NF.cap(prevPo(ep)) + ' · ' + NF.fmtClock(ep.at) + '–' + NF.fmtClock(NF.addMin(ep.at, 120)) + (f ? ' · ' + f.name : ''));
  if (!peakDone) return card(head + '<p class="small mt-1 mb-2">Z nejvyšší hodnoty poznáme, jak vám jídlo sedlo.</p>' +
    gluSlider(S, { id: 'peak-' + ep.id, action: 'peakChip', prefix: ep.id + ':', asked: false, base: lastManual(S, 'peak', ep.foodId) || 10, label: 'Nejvyšší hodnota po jídle v mmol/l', confirm: { action: 'peakChip', prefix: ep.id + ':', label: 'Uložit' }, pick: S.vsPick && S.vsPick['peak-' + ep.id], noneAction: 'peakChip', nonePrefix: ep.id + ':', prompt: 'Posuňte na nejvyšší hodnotu z grafu' }) +
    '<details class="more mt-2"><summary>Kde ji najdu</summary><p class="small muted">' + e(peakHow(ep)) + '</p></details>' + rules(S, ['Z-GLUKOZA']), 'q-open prev-ask');
  if (!NF.usable(S, 'B-HYPO')) return card(head + '<p class="small muted mt-1 mb-2">Nejvyšší hodnota po jídle: <b>' + e(NF.mmolB(ep.manual.peak, ep.manual.peakBound)) + '</b>.</p>' + off(S, 'B-HYPO'), 'q-open prev-ask');
  return card(head + ttl(lowQ(S, ep.at)) + yesNoChips('lowChip', ep.id, null) + rules(S, ['B-HYPO']), 'q-open prev-ask');
}
function nowQuestion(S, m, n, part) {
  var nowTxt = m.retro ? 'Glukóza při jídle podle grafu senzoru' : 'Glukóza teď · ' + NF.fmtClock(S.clock);
  var noVal = '<details class="more mt-2"><summary>Když hodnotu nemáte</summary><p class="small muted">Klepněte na „nemám hodnotu“ – jídlo zapíšeme i tak. Hodnotu doplní sestra na kontrole z dat senzoru.</p></details>';
  if (part === 'peak') return card(qHead(n, 'Nejvyšší glukóza do 2 hodin po jídle') + gluSlider(S, { id: 'peak', action: 'mealPeak', current: m.peak, asked: !!m.peakAsked, bound: m.peakBound, base: lastManual(S, 'peak') || 10, label: 'Nejvyšší hodnota po jídle v mmol/l', prompt: 'Posuňte na nejvyšší hodnotu z grafu' }) +
      '<details class="more mt-2"><summary>Kde ji najdu</summary><p class="small muted">V grafu senzoru najděte dvě hodiny po jídle a vyberte nejvyšší hodnotu, které tam křivka dosáhla.</p></details>' +
      (m.peakBound === 'under' ? '<p class="chosen-note">Nejvyšší hodnota pod 4: počítáme to jako pokles.</p>' : !NF.usable(S, 'B-HYPO') ? off(S, 'B-HYPO') : '<b class="field-q">' + lowQ(S, m.at != null ? NF.retroAt(S, m.at) : null) + '</b>' + yesNoChips('mealLow', '', m.lowAsked ? (m.low === true ? 'yes' : m.low === false ? 'no' : 'unknown') : null) + rules(S, ['B-HYPO'])) +
      nightChip(S, m), 'q-open');
  return card(qHead(n, nowTxt) + (m.retro ? '' : '<p class="small muted mt-1 mb-2">Posuňte na číslo z aplikace senzoru.</p>') +
    '<div class="glu-pick">' + rules(S, ['Z-GLUKOZA'], 'mb-2') + gluSlider(S, { id: 'before', action: 'mealBefore', current: m.before, asked: !!m.beforeAsked, bound: m.beforeBound, base: lastManual(S, 'before'), label: m.retro ? 'Glukóza při jídle v mmol/l' : 'Glukóza teď v mmol/l', prompt: 'Posuňte na hodnotu ze senzoru' }) + '</div>' +
    (m.retro ? '' : nightChip(S, m)) + noVal +
    (m.retro && m.beforeAsked ? '<div class="actions mt-3">' + btn('Pokračovat', 'mealQ', 'next:atmeal', 'primary') + '</div>' : ''), 'q-open');
}
function bolusChoices(S, m, dose, retro) {
  var o = NF.doseOrigin(S, m.meal), plan = 'podle plánu' + (o && o.date ? ' z ' + NF.fmtDM(o.date) : '');
  return '<div class="choice-row col mt-3" role="group" aria-label="' + (retro ? 'Byl inzulin?' : 'Je inzulin k tomuto jídlu už píchnutý?') + '">' +
    choice(opt('Ano, ' + dose.units + ' j.', plan), 'mealBolus', 'as', m.bolus === 'as', 'opt') +
    choice(opt('Ano, jinak', retro ? 'jiné množství' : 'jiné množství nebo čas'), 'mealBolus', 'other', m.bolus === 'other', 'opt') +
    (retro ? choice(opt('Ne', 'bez inzulinu'), 'mealBolus', 'none', m.bolus === 'none', 'opt') : choice(opt('Ještě ne', 'inzulin až před jídlem'), 'mealBolus', 'before', m.bolus === 'before', 'opt')) +
    choice(opt('Nevím', retro ? 'pro jistotu počítáme, že byl' : 'pro jistotu počítáme, že už je'), 'mealBolus', 'unknown', m.bolus === 'unknown', 'opt') + '</div>';
}
function unitsBox(m, dose, withTime) {
  return '<div class="box mt-3"><b>Kolik jednotek?</b><div class="mt-2">' + unitsSlider('meal-units', 'mealUnitsSet', m.units, dose.units, 'Kolik jednotek inzulinu') + '</div>' + (withTime ? '<b class="field-q">Kdy?</b>' + timeChips(m) : '') + '</div>';
}
function insQuestion(S, m, p, dose, retro) {
  var nd = retro ? null : newDose(S, p, m.meal);
  var needNext = m.bolus && (m.qOpen === 'ins' || m.bolus === 'other' || m.bolus === 'unknown');
  var t = NF.tolerance(S, 'learn');
  return card('<div class="insulin"><div class="ic" aria-hidden="true">' + NF.icon('syringe') + '</div><div><b>Inzulin ' + e(NF.mealLabel(m.meal, 'ke')) + '</b>' + (nd ? '<small>nově, dřív ' + nd.was + ' j.</small>' : retro ? '<small>ptáme se, jak to bylo</small>' : '') + '</div>' + V.dose(dose.units, nd ? 'new' : (m.bolus === 'as' ? 'done' : '')) + '</div>' +
    bolusChoices(S, m, dose, retro) +
    (m.bolus === 'unknown' ? '<div class="mt-3 unknown-rule"><p class="small mb-2"><b>Nevíte, jestli byl inzulin píchnutý?</b> Bereme to, jako by inzulin v těle byl.</p>' + (ruleEventBody(S, 'I-NEVIM') || ruleOff(S, 'I-NEVIM')) + '</div>' : '') + /* okamžik události: první krok velkým písmem, Co dál, celé na klepnutí (bod 2) */
    (m.bolus === 'other' ? unitsBox(m, dose, !retro) : '') +
    (!retro && m.bolus === 'as' && m.qOpen === 'ins' ? '<div class="box mt-3"><b>Kdy byl inzulin?</b>' + timeChips(m) + '</div>' : '') +
    (needNext ? '<div class="actions mt-3">' + btn('Pokračovat', 'mealQ', 'next:ins', 'primary') + '</div>' : '') +
    '<details class="more mt-2"><summary>Proč se ptáme</summary><p class="small muted">Radu k velikosti porce můžeme dát jen dřív, než je inzulin v těle. Když nevíte, bereme to, jako by už byl – je to bezpečnější.</p><p class="small muted">Nejvíc se o vás dozvíme z jídel, kde byl inzulin ' + t.before + ' min před až ' + t.after + ' min po jídle.</p></details>', 'q-open');
}
function mealStep1(S, m, p, dose, steps) {
  /* doplňující otázka, která se po odpovědi objeví, se ohlásí čtečce (A15, 19. 10. 2026) */
  var said = m.bolus === 'as' ? 'Inzulin zapsán.' : m.bolus === 'other' ? 'Doplňující otázka: Kolik jednotek a kdy?' : m.bolus === 'unknown' ? 'Níže je pravidlo pro případ, že nevíte, jestli byl inzulin píchnutý.' : '';
  var lowNow = m.beforeAsked && NF.isLowValue(m.before, m.beforeBound);
  if (lowNow) said += (said ? ' ' : '') + (NF.hasInstruction(S, 'I-HYPO') ? 'Glukóza je teď pod 4: níže je pravidlo k nízké glukóze.' : 'Glukóza je teď pod 4.');
  if (m.beforeAsked && m.beforeBound === 'over') said += (said ? ' ' : '') + 'Glukóza je teď nad 15: níže je pravidlo k vysoké glukóze.';
  var insOk = q1Done(m), pend = prevPending(S), done = prevDoneEps(S, pend), watch = NF.usable(S, 'B-HYPO') ? NF.pendingHypoWatch(S) : [];
  var stage = !insOk ? 'ins' : pend.length ? 'prev' : watch.length ? 'watch' : 'now';
  var nPrev = pend.length || watch.length ? 2 : 0, nNow = nPrev ? 3 : 2;
  var keLbl = NF.mealLabel(m.meal, 'ke');
  var h1 = stage === 'ins' ? 'Je inzulin ' + keLbl + ' už píchnutý?' : stage === 'prev' ? (pend[0].manual && pend[0].manual.peak != null ? 'Klesla glukóza ' + prevPo(pend[0]) + ' pod 4?' : 'Kolik nejvíc ukázal senzor ' + prevPo(pend[0]) + '?') : stage === 'watch' ? (watch[0].night ? 'Klesla glukóza v noci pod 4?' : 'Klesla glukóza pod 4?') : 'Kolik ukazuje senzor teď?';
  var out = stepHead(S, m, 1) + head(S, 'Krok 1 ze 3 · ' + NF.mealLabel(m.meal), h1) + steps + '<p class="sr-only" role="status">' + e(said) + '</p>' +
    (m.cancelAsk ? hint('<b>Zahodit rozpracovaný zápis?</b><div class="actions mt-2">' + btn('Zahodit', 'mealCancel', null, 'danger sm') + btn('Pokračovat v zápisu', 'mealCancelKeep', null, 'sm') + '</div>', 'warn') : '');
  if (insOk) out += qDone('Inzulin ' + keLbl, insAnswer(m, dose), 'mealQ', 'ins');
  out += done.map(function (ep) { return prevDoneRow(S, ep); }).join('');
  if (stage === 'ins') out += insQuestion(S, m, p, dose, false);
  else if (stage === 'prev') out += prevQuestion(S, pend[0], 2);
  else if (stage === 'watch') out += hypoWatchCard(S);
  else out += nowQuestion(S, m, nNow);
  /* bezpečnost v okamžiku události: hned pod otevřenou otázkou (pod 4, nad 15, „Ano, pod 4“) */
  if (stage !== 'ins') out += done.concat(pend).filter(function (ep, i, a) { return a.indexOf(ep) === i && ep.manual && ep.manual.peakBound === 'over'; }).map(function (ep) { return highCard(S, NF.cap(prevPo(ep)) + ' byla nejvyšší glukóza nad 15', true); }).join('');
  if (stage === 'now') out += (lowNow ? lowNowCard(S) : '') + highNow(S, m);
  out += lowNoticeCard(S);
  var later = [];
  if (stage === 'ins' && nPrev) later.push([2, pend.length ? 'Nejvyšší glukóza ' + prevPo(pend[0]) : 'Pokles pod 4 ' + (watch[0] && watch[0].night ? 'v noci' : 'po jídle')]);
  if (stage !== 'now') later.push([nNow, 'Glukóza teď']);
  out += qLater(later, true);
  var ready = !!(m.bolus && m.beforeAsked && stage === 'now');
  out += '<div class="actions">' + btn('Další: co budete jíst →', 'mealStep', '2', 'primary big', ready ? '' : ' disabled') + '</div>' +
    (ready ? '<p class="next-line">Pak vyberete jídlo a porci.</p>' : stage === 'now' ? '<p class="small muted ta-c">Posuňte na hodnotu ze senzoru, nebo klepněte na „nemám hodnotu“.</p>' : '');
  return out;
}
function mealStep1Retro(S, m, p, dose, steps) {
  var base = { breakfast: 6, lunch: 11, dinner: 17 }[m.meal], yday = !!(m.day && m.day < NF.day(S.clock)); /* zápis včerejšího jídla (kontrola 4, 07 B3) */
  var insOk = q1Done(m), needTime = m.bolus === 'as' || m.bolus === 'other';
  var whenOk = insOk && m.at != null && m.qOpen !== 'when' && !!(m.whenOk || m.beforeAsked);
  var atOk = whenOk && m.beforeAsked && m.qOpen !== 'atmeal' && !!(m.atMealOk || m.peakAsked);
  var stage = !insOk ? 'ins' : !whenOk ? 'when' : !atOk ? 'atmeal' : 'vals';
  var keLbl = NF.mealLabel(m.meal, 'ke');
  var h1 = stage === 'ins' ? 'Byl ' + keLbl + ' inzulin?' : stage === 'when' ? NF.mealText(m.meal, 'when') : stage === 'atmeal' ? 'Kolik ukazoval senzor při jídle?' : 'Kolik nejvíc ukázal senzor po jídle?';
  var out = stepHead(S, m, 1) + head(S, 'Krok 1 ze 3 · ' + (yday ? 'včera · ' : '') + NF.mealLabel(m.meal) + ' zpětně', h1) + steps;
  if (insOk) out += qDone('Inzulin ' + keLbl, insAnswer(m, dose), 'mealQ', 'ins');
  if (whenOk) out += qDone(NF.cap(NF.mealLabel(m.meal)), 'v ' + e(NF.fmtHour(Number(m.at))) + (needTime ? ' · inzulin ' + e(RETRO_OFFSET_TXT[String(m.offset)] || 'zároveň s jídlem') : ''), 'mealQ', 'when');
  if (atOk) { var bst = vsState({ kind: 'glu', min: 4, max: 15, lo: 4, hi: Math.max(5, Math.min(14, Math.floor(NF.targets(S).high || 10))) }, m.before == null ? null : m.beforeBound === 'under' ? 3 : m.beforeBound === 'over' ? 16 : m.before); out += qDone('Glukóza při jídle', m.before == null ? 'bez hodnoty' : e(NF.mmolB(m.before, m.beforeBound)) + '\u00a0mmol/l ' + tag(bst.zone === 'ok' ? 'v cíli' : bst.zone === 'low' ? 'nízká glukóza' : 'nad cílem', bst.zone === 'ok' ? 'ok' : bst.zone === 'low' ? 'low' : 'over'), 'mealQ', 'atmeal'); }
  if (stage === 'ins') out += insQuestion(S, m, p, dose, true);
  else if (stage === 'when') out += card(qHead(2, NF.mealText(m.meal, 'when')) + '<div class="timechips">' + [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(function (o) { var h = base + o; var nowH = yday ? 24 : NF.parse(S.clock).getHours() + NF.parse(S.clock).getMinutes() / 60; return h <= nowH ? choice('v ' + NF.fmtHour(h), 'mealAt', String(h), String(m.at) === String(h)) : ''; }).join('') + '</div>' +
      (needTime ? '<b class="field-q">A inzulin?</b><div class="timechips">' + [['0', 'zároveň s jídlem'], ['-15', '15 min před'], ['-30', '30 min před'], ['15', 'až po jídle']].map(function (o) { return choice(o[1], 'mealTime', o[0], String(m.offset) === o[0]); }).join('') + '</div>' : '') +
      (m.at != null ? '<div class="actions mt-3">' + btn('Pokračovat', 'mealQ', 'next:when', 'primary') + '</div>' : ''), 'q-open');
  else if (stage === 'atmeal') out += hypoWatchCard(S, true) + /* noční otázka „klesla v noci pod 4?“ i v kroku 1 zpětného zápisu snídaně (nález 4, 23. 10. 2026) */ nowQuestion(S, m, 3) + (m.beforeAsked && NF.isLowValue(m.before, m.beforeBound) ? lowNowCard(S) : '') + highNow(S, m, 'before');
  else out += nowQuestion(S, m, 4, 'peak') + highNow(S, m, 'peak');
  var later = [];
  if (stage === 'ins') later.push([2, NF.cap(NF.mealLabel(m.meal)) + ': v kolik']);
  if (stage === 'ins' || stage === 'when') later.push([3, 'Glukóza při jídle']);
  if (stage !== 'vals') later.push([4, 'Nejvyšší glukóza po jídle a pokles']);
  out += qLater(later, false);
  var ready = !!(m.bolus && m.at != null && m.beforeAsked && stage === 'vals');
  out += '<div class="actions">' + btn('Další: co bylo k jídlu →', 'mealStep', '2', 'primary big', ready ? '' : ' disabled') + '</div>' +
    (ready ? '<p class="next-line">Pak vyberete jídlo a porci.</p>' : '');
  return out;
}
V.meal = function (S) {
  var m = S.meal, p = NF.activePlan(S);
  if (!m || !p) return card('<h2>Teď nelze nic zapsat</h2>') + '<div class="actions">' + btn('Zpět', 'page', 'today', 'primary') + '</div>';
  var dose = p.doses[m.meal], out = '', snack = NF.isSnack(m.meal);
  if (!snack && !dose) return card('<h2>Teď nelze nic zapsat</h2><p class="small muted">K tomuto jídlu plán nemá dávku.</p>') + '<div class="actions">' + btn('Zpět', 'page', 'today', 'primary') + '</div>';
  var steps = '<div class="msteps">' + (snack ? [2, 3] : [1, 2, 3]).map(function (i) { return '<span class="' + (i <= m.step ? 'on' : '') + '"></span>'; }).join('') + '</div>';
  var stepLabel = function (n) { return snack ? 'Krok ' + (n - 1) + ' ze 2 · svačina' : 'Krok ' + n + ' ze 3 · ' + NF.mealLabel(m.meal); };
  if (m.step === 1 && m.retro) return mealStep1Retro(S, m, p, dose, steps);
  if (m.step === 1) return mealStep1(S, m, p, dose, steps);
  if (m.step === 2) {
    var results = m.q ? NF.searchFoods(S, m.q, m.meal) : [], recents = NF.recentFoods(S, m.meal);
    var chosen = m.foodId ? NF.foodById(S, m.foodId) : null;
    var list = (m.q ? results : recents);
    /* Jedna akce v každém okamžiku (vlastník 15. 10. 2026): podobný název → dotaz „Myslíte X?“ hned, jinak tlačítko Přidat; po otevření karty nového jídla obojí zmizí. */
    var like = (m.q && !chosen && !m.newFood) ? NF.likeName(S, m.q) : null;
    if (like && results.some(function (r) { return r.id === like.id; })) like = null;
    out += stepHead(S, m, 2) + head(S, stepLabel(2), m.retro ? 'Co bylo k jídlu?' : snack ? 'Co si dáte ke svačině?' : 'Co budete jíst?') + steps +
      (snack ? hint('<b>Svačina je bez inzulinu k jídlu.</b> Nepotvrzujete dávku ani porci; jen zapište, co jíte. Učíme se z ní zvlášť a lékař uvidí, kolik toho jíte mimo hlavní jídla.', 'neutral') : '') +
      '<p class="sr-only" role="status">' + (m.q ? e(results.length ? 'Nalezeno: ' + NF.plural(results.length, 'jídlo', 'jídla', 'jídel') : like || (m.newFood && m.newFood.suggest) ? 'Nabízíme podobné jídlo ze seznamu.' : 'Žádné jídlo neodpovídá.') : '') + '</p>' + /* při nabídnuté shodě se „Žádné jídlo neodpovídá“ neříká (A18) */
      card('<label class="field"><span>' + (list.length ? 'Jiné jídlo' : 'Jídlo') + ' – napište pár písmen</span><input data-bind="meal.q" value="' + e(m.q || '') + '" placeholder="např. řízek, kaše, guláš" autocomplete="off"></label>' +
        (list.length ? '<div class="small muted mt-1 mb-2">' + (m.q ? 'Nalezeno' : 'Naposledy') + '</div><ul class="food-grid' + (m.q ? ' q' : '') + '">' + list.map(function (f) {
          var c = NF.confidence(S, f.id, m.meal);
          var on = !!(chosen && chosen.id === f.id);
          return '<li><button type="button" class="food-opt' + (on ? ' chosen' : '') + '" data-action="mealFood" data-value="' + e(f.id) + '" aria-pressed="' + on + '">' + foodIcon(S, f, c) + '<span class="name">' + markMatch(f.name, m.q) + foodOptLine(c, S, f.id, m.meal) + '</span>' + (on ? '<span class="sel" aria-hidden="true">' + NF.icon('check') + '</span>' : '') + '</button></li>';
        }).join('') + '</ul>' : (m.q && !like && !m.newFood ? '<p class="small muted">Nic takového neznáme.</p>' : '')) +
        (like ? '<div class="hint neutral"><b>Je to stejné jídlo jako „' + e(like.name) + '“ ve vašem seznamu?</b><div class="actions split">' + btn('Ano, je to ono', 'mealUseExisting', like.id, 'sm primary') + btn('Ne, přidat jako nové jídlo', 'mealNotSame', null, 'sm') + '</div></div>' : '') +
        (m.q && !chosen && !m.newFood && !like ? '<div class="actions">' + btn(NF.icon('plus') + ' Přidat „' + e(m.q) + '“ do seznamu', 'mealNewFood') + '</div>' : '')) +
      (m.newFood ? customBuilder(S, m) : '');
    if (chosen && !snack) {
      out += card('<h2>' + (m.retro ? 'Jaká byla porce?' : 'Jakou porci si chystáte?') + '</h2><div class="choice-row">' + NF.PORTIONS.map(function (x) { return choice(plateSvg(x[0]) + '<span>' + e(x[1]) + '</span>', 'mealPortion', x[0], m.portion === x[0], 'plate'); }).join('') + '</div>' +
        '<p class="field-help">Obvyklá porce je množství, na které lékař nastavil dávku.</p>');
    }
    out += '<div class="actions">' + btn(snack ? 'Další: zápis →' : 'Další: rada a zápis →', 'mealStep', '3', 'primary big', chosen && m.portion ? '' : ' disabled') + '</div>' +
      (!chosen ? '<p class="small muted ta-c">Nejdřív vyberte jídlo.</p>' : !m.portion ? '<p class="small muted ta-c">Vyberte porci.</p>' : '');
    return out;
  }
  /* krok 3 – SCHEMA 86 (rozhodnutí vlastníka 5. 11. 2026, bod 6; navrhy-designu/33, návrh 2): u jídla nahoře stav slovem a ikonou a rada; stupnice rozmezí a čísla
     pod „Podrobnosti“ (přebíjí 15a pro krok 3); hlavní rada je plná karta, další rady řádky v téže kartě; vysvětlení a jistota rad pod „Proč tohle radíme“. */
  var food = NF.foodById(S, m.foodId);
  if (!food) return stepHead(S, m, 3) + head(S, stepLabel(3), 'Vyberte jídlo') + steps + card('<p>Jídlo z rozpracovaného zápisu v seznamu není. Vraťte se o krok a vyberte ho znovu.</p>') + '<div class="actions">' + btn('← Vybrat jídlo', 'mealStep', '2', 'primary big') + '</div>'; /* robustnost #8: zápis zůstává */
  var nextLine = snack ? '' : '<p class="next-line">Co dál: při dalším jídle se zeptáme na nejvyšší glukózu ' + e(NF.MEAL_PO[m.meal] || 'po jídle') + '.</p>';
  var whyBox = function (extra, items, blockedTxt) {
    var certs = []; (items || []).forEach(function (it) { if (it.certainty && certs.indexOf(it.certainty) < 0) certs.push(it.certainty); });
    if (!extra && !certs.length && !blockedTxt) return '';
    return '<details class="more mt-2 why-more"><summary>' + (items && items.length ? 'Proč tohle radíme' : 'Proč teď neradíme') + '</summary><div class="small muted">' + (extra || '') + certs.map(function (c) { return '<p>' + e(c) + '</p>'; }).join('') + (blockedTxt || '') + '</div></details>';
  };
  var blockedHtml = function (list) { return (list || []).map(function (b) { return '<p><b>' + e(NF.LEVERS[b.lever].label) + ':</b> ' + e(b.why) + '</p>'; }).join(''); };
  var advBlock = function (items, retro) {
    if (!items.length) return '';
    var row = function (it, main) {
      var d = (m.decisions || {})[it.lever], reason = (m.reasons || {})[it.lever];
      if (!retro && m.compact && m.compact[it.lever]) return '<div class="adv-line compact ' + (d === true ? 'taken' : 'declined') + '"><span class="t">' + e(it.label) + '</span><div class="small">Jako minule: <b>' + (d === true ? 'zkusím to' : 'tentokrát ne') + '</b> ' + btn('Změnit', 'mealExpand', it.lever, 'sm quiet') + '</div>' + rules(S, [it.item]) + '</div>'; /* rutina po 3 odpovědích (18. 10. 2026) */
      var ch = '<div class="choice-row" role="group" aria-label="' + e(it.label) + '">' + choice(NF.icon('check') + ' Zkusím to', 'mealDecide', it.lever + ':yes', d === true, 'yes' + (main ? '' : ' sm')) + choice('Tentokrát ne', 'mealDecide', it.lever + ':no', d === false, main ? '' : 'sm') + '</div>' +
        (!retro && d === false ? '<div class="choice-row reasons" role="group" aria-label="' + e('Proč ne: ' + it.label) + '">' + NF.reasonsFor(it.lever).map(function (r) { return choice(r[1], 'mealReason', it.lever + ':' + r[0], reason === r[0]); }).join('') + '</div>' : '');
      if (main) return '<div class="advice main ' + (d === true ? 'taken' : d === false ? 'declined' : '') + '"><div class="lever">' + e(it.label) + '</div><p class="text mt-2 mb-3">' + e(it.text) + '</p>' + ch + rules(S, [it.item]) + '</div>';
      return '<div class="adv-line advice ' + (d === true ? 'taken' : d === false ? 'declined' : '') + '"><span class="t">' + e(it.text) + '</span>' + ch + rules(S, [it.item]) + '</div>';
    };
    return items.map(function (it, i) { return row(it, i === 0); }).join('');
  };
  var stateLine = function (conf) { /* jedna věta pod názvem jídla (stav nese štítek slovem a ikonou) */
    if (conf.level === 'known') return '';
    if (conf.level === 'similar') return 'Zatím ho neznáme. Podobá se jídlu, po kterém bývá glukóza ' + (conf.pool && conf.pool.dir === 'in' ? 'spíš v cíli.' : 'spíš nad cílem.');
    if (conf.level === 'unstable') return 'Zápisy se liší, jídlo zatím neznáme.';
    if (conf.level === 'learning' && conf.impression === 'mixed') return 'Zápisy se liší; jídlo poznáme, až se shodnou.';
    if (conf.level === 'none') return conf.why || '';
    var left = Math.max(1, (conf.min || 4) - ((conf.st && conf.st.n) || 0));
    return 'Zatím ho neznáme – zapište ho ještě ' + left + '×.'; /* oprava 05: bez „Je to jako…“ (jídlo už je vybrané) */
  };
  var foodHead = function (conf, extraLine, detail) {
    var sl = stateLine(conf);
    return card('<div class="foodrow">' + foodIcon(S, food, conf) + '<div><div class="name name-lg">' + e(food.name) + '</div><div class="badges">' + foodBadges(conf) + '</div>' + (conf.reaction ? rules(S, ['R-SKORE'], 'mt-1') : '') + '</div></div>' +
      (sl ? '<p class="mt-2 mb-0">' + e(sl) + '</p>' : '') + (extraLine || '') + (detail ? '<details class="more mt-2"><summary>Podrobnosti</summary>' + detail + '</details>' : ''), 'food-head');
  };
  if (m.retro) {
    var ra = NF.adviseAfter(S, food.id, m.meal, NF.retroAt(S, m.at), m.portion, m.bolus), rc = ra.conf;
    var info = '<p class="small muted mt-2 mb-0">' + e(NF.mealLabel(m.meal, true)) + ' v ' + e(NF.fmtHour(Number(m.at))) + ' · ' + (m.portion === 'usual' ? 'obvyklá porce' : 'porce ' + e(NF.PORTIONS.filter(function (x) { return x[0] === m.portion; })[0][1].toLowerCase())) + ' · inzulin ' + e(m.bolus === 'as' ? dose.units + ' j.' : m.bolus === 'other' ? m.units + ' j.' : NF.INSULIN[m.bolus]) + '</p>';
    out += stepHead(S, m, 3) + head(S, 'Krok 3 ze 3 · ' + NF.mealLabel(m.meal) + ' zpětně', ra.items.length ? 'Zápis a co pomůže teď' : 'Shrnutí zápisu') + steps +
      /* stejná bezpečnostní větev jako u živého zápisu (nález 2, 23. 10. 2026): menší porce s inzulinem v těle → pravidlo hned, procházka se nenabízí */
      (ra.lowNow ? lowNowCard(S) : '') +
      (ra.lowRisk && !ra.lowNow ? eventCard(S, 'I-MENE', 'Méně jídla než obvykle', '', 'low') : '') + /* B18: zamítnuté pravidlo = oznámení na místě, žádný odkaz na pravidlo, které chybí */
      foodHead(rc, info, rc.level === 'known' ? '<div class="detail">' + peakBlock(S, food, rc) + '</div>' : '') +
      (ra.items.length ? '<h2 class="section-h">Co pomůže teď</h2>' + card(advBlock(ra.items, true) + whyBox('', ra.items, blockedHtml(ra.blocked)), 'advice-card') : (ra.blocked || []).length ? whyBox('', [], blockedHtml(ra.blocked)) : '') +
      (NF.usable(S, 'R-REAKCE') ? '' : off(S, 'R-REAKCE')) + offLevers(S) +
      (m.bolus === 'none' || m.bolus === 'unknown' ? hint('<b>Inzulin k tomuto jídlu ' + (m.bolus === 'none' ? 'nebyl podán' : 'není potvrzený') + '.</b> Zápis uložíme, do hodnocení jídla ho nepočítáme. Při nejistotě, co dělat: ' + btn(NF.icon('shield') + ' Bezpečí', 'safetyOpen', null, 'sm'), 'warn') : '') +
      '<div class="choice-row inset mt-2 mb-2">' + choice('Neobvyklý den (' + NF.UNUSUAL + ')', 'mealUnusual', 'toggle', !!m.unusual, 'sm') + '</div>' + (m.unusual ? '<p class="small muted inset mb-2">Zápis uložíme, do hodnocení jídla ho nepočítáme.</p>' : '') +
      '<div class="actions">' + btn('Uložit ' + NF.mealLabel(m.meal, 'acc'), 'mealFinish', m.bolus, 'primary big') + '</div>' + nextLine;
    return out;
  }
  var res = NF.advise(S, food.id, m.portion, m.bolus, m.meal);
  var conf = res.conf;
  out += stepHead(S, m, 3) + head(S, stepLabel(3), snack ? 'Zápis svačiny' : res.gate.ok && res.items.length ? 'Rada a zápis' : 'Zápis jídla') + steps;
  var scale = snack || conf.level === 'unknown' || conf.level === 'none' ? '' : routineScale(S, food, conf, res, m, true); /* svačina bez stupnice (kontrola 4, 07 C3) */
  out += foodHead(conf, '', scale ? scale + (conf.level === 'known' ? '<p class="small muted mb-0">Známe ho · ' + NF.plural(conf.st.n, 'zápis', 'zápisy', 'zápisů') + '.</p>' : '') : '');
  /* Bezpečnostní větev nezávisí na bráně rad (kontrola 2, A2, 29. 10. 2026): pravidlo k nízké glukóze, pravidlo „Méně jídla než obvykle“ a věta o nemoci
     se ukážou i se zamítnutou R-REAKCE a před převzetím plánu; brána zastaví jen rady. Okamžik události: první krok velkým písmem (bod 2). */
  if (res.lowNow) out += lowNowCard(S);
  /* pravidlo hned: inzulin už v těle (i „nevím“), nebo porce menší a rada „obvyklá porce“ odmítnuta před píchnutím (nález 3, 23. 10. 2026) */
  else if (m.portion === 'smaller' && !snack && (NF.insulinInBody(m.bolus) || (m.bolus === 'before' && (m.decisions || {}).portion === false))) { out += eventCard(S, 'I-MENE', 'Méně jídla než obvykle', m.bolus === 'before' ? '<p class="small mt-3 mb-0">Až si píchnete, platí toto pravidlo.</p>' : '', 'low'); if (m.bolus !== 'before' && NF.usable(S, 'B-HYPO')) nextLine = '<p class="next-line">Co dál: za ' + NF.param(S, 'B-HYPO', 'pripominka_min', 60) + ' min se zeptáme, jestli glukóza neklesla pod 4.</p>'; }
  if (res.illness && !res.lowNow) out += hint('<b>' + e(NF.ILL_TEXT) + '</b>' + rules(S, ['P-NEMOC'])); /* jedna věta při nemoci (A19) */
  if (!res.gate.ok) out += res.gate.low ? '' : NF.usable(S, 'R-REAKCE') ? hint('<b>Teď neradíme.</b> ' + e(res.gate.why), 'neutral') : off(S, 'R-REAKCE');
  else {
    var blocked = res.blocked.filter(function (b) { return !(b.reason === 'illness' && res.illness) && b.reason !== 'item'; }); /* C5: při nemoci jedna věta (výše), ne u každé rady */
    res.blocked.forEach(function (b) { if (b.reason === 'item') out += off(S, NF.LEVERS[b.lever].item); });
    res.gone.forEach(function (g) { out += hint(e(g.text) + ' ' + appr(S, 'R-ZMIZELA')); });
    if (res.items.length) {
      out += '<h2 class="section-h">Co můžete zkusit <span class="small muted w-text">(odpovědět nemusíte)</span></h2>' + card(advBlock(res.items, false) +
        whyBox('<p><b>Odkud to víme:</b> jen z vašich vlastních zápisů a hodnot ze senzoru.</p><p><b>Proč se ptáme na inzulin:</b> dávka je jako klíč vyrobený na obvyklou porci. Dokud inzulin není v těle, můžete porci ještě upravit. Po píchnutí inzulin působí 3–5 hodin, ať sníte cokoli. Proto pak poradíme jen návrat z větší porce k obvyklé.</p><p><b>Co nikdy neděláme:</b> nepočítáme ani neměníme dávku inzulinu.</p>', res.items, blockedHtml(blocked)), 'advice-card');
    } else {
      if (conf.level === 'known' && !res.blocked.length && conf.reaction && conf.reaction.key === 'mild') out += card('<p>K tomuto jídlu radu nepotřebujete – zůstáváte po něm v cíli. Stačí ho zapsat.</p>'); /* kontrola 2: jen když stupeň opravdu říká „většinou v cíli“ */
      if (blocked.length) out += whyBox('', [], blockedHtml(blocked));
    }
  }
  if (res.gate.ok) out += offLevers(S);
  if (m.bolus === 'before' && res.lowNow) {
    /* SCHEMA 87 (rozhodnutí vlastníka 6. 11. 2026, bod 1; atlas pacienta R9; 15 odst. 7.3 „ukáže jen pravidlo k nízké glukóze a zápis jídla podle skutečnosti“):
       při glukóze pod 4 před píchnutím není hlavní tlačítko „Píchnuto … uložit“. Hlavní je uložit jídlo bez potvrzeného inzulinu (inzulin čeká, jako „píchnu za chvíli“);
       kdo už píchnuto má, zapíše to vedlejší volbou. Žádná rada, kdy píchnout – platí pravidlo k nízké glukóze (zvoleno bez dotazu, nejopatrnější varianta). */
    out += '<div class="actions col mt-4">' + btn('Uložit, inzulin zatím ne', 'mealFinish', 'pending', 'primary big') + '</div>' +
      '<p class="next-line">Co dál: na Dnes se zeptáme, jestli byl inzulin.</p>' +
      '<div class="actions split mt-3">' + btn('Už píchnuto ' + dose.units + ' j.', 'mealFinish', 'as', 'quiet') + btn('Píchnuto jinak', 'mealFinishOther', null, 'quiet', m.finishOther ? ' aria-pressed="true"' : '') + '</div>' +
      (m.finishOther ? '<div class="mt-2">' + unitsSlider('finish-units', 'mealUnitsSet', m.units, dose.units, 'Píchnuto: jednotky') + '</div><div class="actions">' + btn('Uložit', 'mealFinish', 'other', '') + '</div>' : '');
  } else if (m.bolus === 'before') {
    /* SCHEMA 86 (návrh 2): jedno hlavní tlačítko „Píchnuto 8 j. · uložit snídani“ a pod ním řádek „Co dál“; věta „Klepněte, až…“ (kontrola 4, 07 C1) odpadla – říká ji tlačítko (zvoleno bez dotazu podle návrhu 2) */
    out += '<div class="actions col mt-4">' + btn('Píchnuto ' + dose.units + ' j. · uložit ' + NF.mealLabel(m.meal, 'acc'), 'mealFinish', 'as', 'primary big') + '</div>' + nextLine +
      '<div class="actions split mt-3">' + btn('Uložit, píchnu za chvíli', 'mealFinish', 'pending', '') + btn('Píchnuto jinak', 'mealFinishOther', null, '', m.finishOther ? ' aria-pressed="true"' : '') + '</div>' +
      (m.finishOther ? '<div class="mt-2">' + unitsSlider('finish-units', 'mealUnitsSet', m.units, dose.units, 'Píchnuto: jednotky') + '</div><div class="actions">' + btn('Uložit', 'mealFinish', 'other', 'primary') + btn('Nepíchnuto', 'mealFinish', 'none', 'quiet') + '</div>' : ''); /* SCHEMA 87: posuvník */
  } else out += '<div class="actions">' + btn(snack ? 'Uložit svačinu' : 'Uložit jídlo', 'mealFinish', m.bolus, 'primary big') + '</div>' + nextLine;
  return out;
};

/* Kontrola 4 (07 B5): u známého jídla, kde jsou všechny rady rutinní (sbalené „jako minule“), je i stupnice jeden řádek s rozbalením.
   SCHEMA 86: v kroku 3 je stupnice vždy v „Podrobnostech“ (inner = bez vlastního rozbalení). */
function routineScale(S, food, conf, res, m, inner) {
  var html = '<div class="detail">' + peakBlock(S, food, conf) + '</div>';
  if (inner) return html;
  var routine = conf.level === 'known' && res && res.items.length && res.items.every(function (it) { return m.compact && m.compact[it.lever]; });
  if (!routine) return html;
  var st = conf.st, word = conf.reaction ? ' · ' + conf.reaction.label : '';
  return '<details class="more scale-compact"><summary>Po tomto jídle obvykle ' + e(NF.mmol(st.lo)) + '–' + e(NF.mmol(st.hi)) + e(word) + ' · Ukázat</summary>' + html + '</details>';
}
/* ---------- Moje jídla ---------- */
V.foods = function (S) {
  var seg = S.foodsSeg || 'known';
  var withEps = S.foods.filter(function (f) { return NF.foodStats(S, f.id).eaten > 0; });
  var known = withEps.filter(function (f) { return NF.confidence(S, f.id).level === 'known'; });
  var learning = withEps.filter(function (f) { return NF.confidence(S, f.id).level !== 'known'; });
  var list = seg === 'known' ? known : seg === 'learn' ? learning : withEps;
  var out = head(S, 'Co už o vašich jídlech víme', 'Vaše jídla') +
    '<div class="segmented mb-3" role="group" aria-label="Která jídla zobrazit">' + [['known', 'Známá · ' + known.length], ['learn', 'Učíme se · ' + learning.length], ['all', 'Všechna · ' + withEps.length]].map(function (x) { return '<button type="button" class="' + (seg === x[0] ? 'on' : '') + '" data-action="foodsSeg" data-value="' + x[0] + '" aria-pressed="' + (seg === x[0] ? 'true' : 'false') + '">' + e(x[1]) + '</button>'; }).join('') + '</div>';
  if (!withEps.length) return out + card('<p>Zatím tu nic není. Až zapíšete první jídlo, uvidíte ho tady.</p>');
  if (!list.length) return out + card('<p>' + (seg === 'known' ? 'Zatím žádné známé jídlo. Jídlo poznáme po ' + NF.param(S, 'R-REAKCE', 'minKnown', 4) + ' zápisech se všemi údaji.' : 'Všechna zapsaná jídla už známe.') + '</p>');
  /* seznam jako řádky (rozhodnutí vlastníka 20. 10. 2026): prstenec · název · štítek reakce · šipka; detail na samostatné obrazovce se Zpět */
  out += '<section class="card list-card"><ul class="food-list" aria-label="' + e(seg === 'known' ? 'Známá jídla' : seg === 'learn' ? 'Jídla, která se učíme' : 'Všechna jídla') + '">' + list.map(function (f) { return '<li>' + foodRow(S, f, seg) + '</li>'; }).join('') + '</ul></section>';
  return out;
};
function foodRow(S, f, seg) {
  var c = NF.confidence(S, f.id), badge = c.level === 'known' && c.reaction ? reactionTag(c.reaction) : seg === 'known' && c.level === 'known' ? '' : levelTag(c.level, c);
  var slots = NF.slotStates(S, f.id); /* stav po jídlech dne při rozdílné dávce (25. 10. 2026) */
  return '<button type="button" class="food-row" data-action="foodOpen" data-value="' + e(f.id) + '">' + foodIcon(S, f, c) + '<span class="fr-main"><span class="name">' + e(f.name) + '</span>' + (badge || f.custom ? '<span class="badges">' + badge + (f.custom ? tag('moje jídlo') : '') + '</span>' : '') + (slots.length ? '<span class="learn">' + slots.join(' · ') + '</span>' : '') + '</span><span class="chev" aria-hidden="true">' + NF.icon('chevron-right') + '</span></button>';
}
/* Detail jídla jako samostatná obrazovka (NF.PAGES 'food'): hlavička se Zpět, pak karta se vším, co dřív bylo v rozbalení. */
V.foodDetail = function (S) {
  var f = S.foodOpen ? NF.foodById(S, S.foodOpen) : null;
  if (!f) return V.foods(S);
  return '<div class="stephead">' + btn(NF.icon('chevron-left') + ' Zpět na jídla', 'foodBack', null, 'back') + '</div>' + head(S, 'Vaše jídlo', f.name) + foodCard(S, f, true, true);
};
/* Rady, které se pacientovi u tohoto jídla skutečně nabízejí: schválené v registru, nevypnuté lékařem, při nemoci jen bezpečné, a k jídlu se hodí.
   Text z téže funkce jako krok 3 (A07, 27. 10. 2026): u kaše žádné pořadí, u jídla se `first` jeho vlastní znění. */
function tipLevers(S, food) {
  var pa = NF.planAdvice(S), ill = NF.ill(S);
  return ['addon', 'order', 'walk'].filter(function (l) { var meta = NF.LEVERS[l]; return NF.usable(S, meta.item) && (pa.off || []).indexOf(l) < 0 && (!ill || meta.illnessSafe) && NF.leverFits(food, l); }).map(function (l) { return NF.leverText(S, l, food); }).filter(Boolean);
}
/* Nové jídlo jen názvem (rozhodnutí vlastníka 15. 10. 2026): žádné složení. Nepovinné „Je to jako …“ a dotaz „Myslíte X?“ u podobného názvu. */
function customBuilder(S, m) {
  var nf = m.newFood, name = (m.q || '').trim(), sug = nf.suggest ? NF.foodById(S, nf.suggest) : null, cands = NF.usable(S, 'R-PODOBNOST') ? NF.likeCandidates(S) : [];
  var out = '<h2>Nové jídlo: ' + e(name) + '</h2><p class="small muted">Víc nepotřebujeme. Porci zadáte až u jídla.</p>';
  if (sug) out += '<div class="hint neutral"><b>Je to stejné jídlo jako „' + e(sug.name) + '“ ve vašem seznamu?</b><div class="actions split">' + btn('Ano, je to ono', 'mealUseExisting', sug.id, 'sm primary') + btn('Ne, přidat jako nové jídlo', 'mealNotSame', null, 'sm') + '</div></div>';
  else {
    if (cands.length) out += '<b class="field-q">Nepovinně: podobá se některému jídlu, které už známe? <span class="small muted w-text">Použijeme ho jen jako výchozí odhad na první tři zápisy; vaše jídlo zůstává samostatné.</span></b><div class="choice-row col" role="group">' + cands.map(function (f) { return choice(e(f.name), 'mealLike', f.id, nf.like === f.id); }).join('') + choice('Nic podobného', 'mealLike', 'none', nf.like === 'none') + '</div>' + rules(S, ['R-PODOBNOST']); /* štítek u otázky na podobné jídlo (A02) */
    else if (!NF.usable(S, 'R-PODOBNOST')) out += off(S, 'R-PODOBNOST');
    out += '<div class="actions">' + btn('Přidat do seznamu', 'mealSaveFood', null, 'primary') + '</div>';
  }
  return card(out);
}
function foodCard(S, f, open, page) {
  var c = NF.confidence(S, f.id), st = c.st;
  var sum;
  if (c.level === 'known' && !c.reaction) sum = 'Zapsáno ' + st.eaten + '×. ' + (NF.usable(S, 'R-SKORE') ? 'Zatím ' + st.inTarget + ' ' + NF.z(st.n) + ' ' + st.n + ' v cíli.' : 'Reakci zatím nehodnotíme; rozmezí vidíte níže.');
  else if (c.level === 'learning') sum = 'Zapsáno ' + st.eaten + '×, ' + (st.n === 1 ? 'první dojem: tentokrát ' + (c.impression === 'in' ? 'v cíli' : 'nad cílem') + '. Ještě ' + NF.plural(Math.max(1, (c.min || 4) - st.n), 'zápis', 'zápisy', 'zápisů') + ' a budeme ho znát.' : c.impression === 'mixed' ? 'zápisy se liší. Jídlo bude známé, až se shodnou.' : 'zatím to vypadá, že po něm ' + (c.impression === 'in' ? 'zůstáváte v cíli' : 'jdete nad cíl') + '. Ještě ' + NF.plural(Math.max(1, (c.min || 4) - st.n), 'zápis', 'zápisy', 'zápisů') + ' a bude známé.');
  else if (c.level === 'known') { var rr = st.recent && st.recent.n ? st.recent : st; sum = 'Zapsáno ' + st.eaten + '×. V cíli ' + rr.inTarget + ' ' + NF.z(rr.n) + ' ' + rr.n + (rr.n < st.n ? ' posledních' : '') + ' zápisů.' + (c.reaction.settled ? '' : ' S dalšími zápisy se to může změnit.'); } /* reakci nese štítek (slovo + ikona), věta nese čísla (řemeslo 9); SCHEMA 86 (oprava 05): věta ze stejného okna posledních zápisů jako štítek (R-SKORE), bez „započítaných“ */
  else if (c.level === 'similar') sum = 'Zapsáno ' + st.eaten + '×, ještě ' + NF.plural(c.min - st.n, 'zápis', 'zápisy', 'zápisů') + ' a budeme ho znát. Podobá se jídlu, po kterém ' + (c.pool && c.pool.dir === 'in' ? 'spíš zůstáváte v cíli' : 'býváte spíš nad cílem') + '.'; /* jen směr (A15) */
  else if (c.level === 'unstable') sum = 'Zapsáno ' + st.eaten + '×, zápisy se ani po ' + NF.plural(st.n, 'zápisu', 'zápisech', 'zápisech') + ' neshodly. Lékař to uvidí v podkladech. Zkuste jídlo dělat pokaždé stejně, nebo ho rozdělte na dvě.';
  else sum = 'Zapsáno ' + st.eaten + '×. Zatím nic neodhadujeme; po ' + (c.min || 4) + ' zápisech se všemi údaji budeme vědět víc.'; /* SCHEMA 86: bez „Je to jako…“ – jídlo už je založené (oprava 05) */
  var slots = NF.slotStates(S, f.id), slotWhy = open ? NF.slotWhyText(S, f.id) : ''; /* učení po jídlech dne (25. 10. 2026) */
  if (slotWhy) sum += ' ' + slotWhy;
  var learnLine = slots.length ? '<div class="learn">' + slots.join(' · ') + '</div>' : c.level !== 'known' ? '<div class="learn">Učíme se: ' + Math.min(st.n, c.min || 4) + ' ' + NF.z(c.min || 4) + ' ' + (c.min || 4) + ' zápisů</div>' : '';
  if (!NF.usable(S, 'R-SKORE')) sum += off(S, 'R-SKORE'); if (!NF.usable(S, 'R-PODOBNOST') && c.level !== 'known') sum += off(S, 'R-PODOBNOST');
  var detail = '';
  if (open) {
    var lev = c.level === 'known' ? NF.leverStats(S, f.id) : [], un = c.level === 'known' ? NF.unstable(S, f.id) : null;
    detail = '<div class="detail">' + peakBlock(S, f, c, true) +
      (un && un.kind === 'lever' ? '<div class="tip"><b>Zápisy se liší</b> – rozdíl vysvětluje rada „' + e(NF.LEVERS[un.lever].label) + '“: s ní bývá níž.</div>' : '') +

      (lev.length ? '<div class="tip"><b>S čím u vás bývalo v cíli</b>' + lev.map(function (x) { return e(NF.LEVERS[x.lever].label) + ': ' + x.st.inTarget + ' ' + NF.z(x.st.n) + ' ' + x.st.n + ' v cíli' + (x.multi ? ' (' + x.multi + '× ' + NF.WITH_OTHER + ')' : ''); }).join(' · ') + '.</div>' : '') + /* značka dvou rad (A16) */
      (c.level === 'known' && c.reaction && c.reaction.key !== 'mild' && tipLevers(S, f).length ? '<div class="tip"><b>Co můžete zkusit</b><ul class="bullets">' + tipLevers(S, f).map(function (x) { return '<li>' + e(x) + '</li>'; }).join('') + '</ul>Každou radu vám nabídneme před jídlem.</div>' : '') +
      '<details class="more"><summary>Historie zápisů (' + st.eaten + ')</summary><div class="tablewrap"><table><thead><tr><th>Datum</th><th>Porce</th><th>Inzulin</th><th>Rada</th><th>Nejvyšší</th></tr></thead><tbody>' +
      st.list.slice().reverse().slice(0, 8).map(function (ep) {
        var why = NF.whyNotUsable(S, ep), acc = (ep.advice || []).filter(function (a) { return a.accepted === true && a.lever !== 'portion'; }).map(function (a) { return NF.LEVERS[a.lever].label; });
        return '<tr><td class="nowrap">' + e(NF.fmtShort(ep.at)) + '</td><td>' + e((NF.PORTIONS.filter(function (x) { return x[0] === ep.portion; })[0] || [0, 'jiné množství'])[1]) + '</td><td>' + e(NF.INSULIN[ep.insulin.confirmed]) + (ep.insulin.units != null && ep.insulin.confirmed === 'other' ? ' ' + ep.insulin.units + ' j.' : '') + '</td><td>' + e(acc.join(', ') || '—') + '</td><td>' + (why ? '<span class="missing">' + e(why) + '</span>' : e(NF.mmolB(NF.epPeak(S, ep), NF.glucoseOf(S, ep).peakBound))) + '</td></tr>';
      }).join('') + '</tbody></table></div></details></div>';
  }
  if (page) return '<section class="card food"><div class="h">' + foodIcon(S, f, c) + '<div><div class="badges mt-0">' + foodBadges(c) + (f.custom ? tag('moje jídlo') : '') + '</div>' + (c.reaction ? rules(S, ['R-SKORE'], 'mt-1') : '') +
    learnLine + '</div></div><div class="sum">' + sum + '</div>' + detail + '</section>'; /* štítek R-SKORE u stupně reakce (A02) */
  return '<section class="card food"><h2 class="food-h"><button type="button" class="h" data-action="foodOpen" data-value="' + e(f.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' + foodIcon(S, f, c) +
    '<div><div class="name">' + e(f.name) + '</div><div class="badges">' + foodBadges(c) + (f.custom ? tag('moje jídlo') : '') + '</div>' +
    learnLine + '</div><span class="chev">' + NF.icon(open ? 'chevron-up' : 'chevron-down') + '</span></button></h2>' +
    '<div class="sum">' + sum + '</div>' + detail + '</section>';
}
V.foodCard = foodCard;

/* ---------- Plán, Bezpečí ---------- */
V.planScreen = function (S) {
  return planScreenBody(S); /* stránka „Nahrát export“ u pacienta zrušena: export nahrává jen sestra (vlastník 27. 10. 2026) */
};
function planScreenBody(S) {
  var p = NF.activePlan(S); if (!p) return head(S, 'Můj plán', 'Plán vám zatím lékař nevydal');
  var older = S.plans.filter(function (x) { return x.id !== p.id; });
  var ms = (S.fb && S.fb.milestones) || [];
  var ps = NF.pathStats(S), T = NF.texts(S, 'S-TYDEN'), lw = NF.usable(S, 'S-TYDEN') ? NF.weekSummary(S, { all: true }) : null, L = lw && T ? weekLines(S, lw, T) : null;
  /* SCHEMA 86 (rozhodnutí vlastníka 5. 11. 2026, bod 4): nahoře „Jak si vedu“ – věta o glukóze, cesta ke kontrole s tkaninou, plnění plánu za týden, známá jídla, týdenní shrnutí;
     pod tím dávky, cíle a co lékař změnil. Přebíjí 7b.4 (cesta ke kontrole dole na Dnes). */
  return head(S, 'Platí od ' + NF.fmtShort(p.issuedAt) + ' do ' + NF.fmtShort(p.validUntil), 'Můj plán') +
    card('<h2>Jak si vedu</h2>' + howLine(S, false) + weekPlanBlock(S, p) +
      (ps && ps.repeated ? rowlink(ps.known ? 'Známe už ' + NF.plural(ps.known, 'vaše jídlo', 'vaše jídla', 'vašich jídel') : 'Vaše jídla se zatím učíme', 'page', 'foods', 'co víme o vašich jídlech') : '') +
      (L ? '<details class="more mt-1"><summary>' + e(NF.fillText(T.head, { week: lw.week })) + '</summary><p class="small mt-1 mb-1">' + L.main.join(' ') + '</p>' + L.more.map(function (l) { return '<p class="small mt-1 mb-1">' + l + '</p>'; }).join('') + '</details>' : ''), 'how-plan') +
    pathCard(S, true) +
    (ms.length ? card('<details class="more"><summary>Novinky (' + ms.length + ')</summary><ul class="plain small">' + ms.slice().reverse().map(function (m) { return '<li>' + e(NF.fmtShort(m.at)) + ' · ' + m.text + '</li>'; }).join('') + '</ul></details>') : '') +
    card('<h2>Kdy a kolik inzulinu</h2>' + dosesTable(p) + '<p class="small muted">Určil lékař ' + e(NF.fmtShort(p.issuedAt)) + '. Dávky nepočítáme ani neměníme – jen je připomínáme a ptáme se, jestli byl inzulin.</p>') +
    card('<h2>Návyky</h2><ul class="plain">' + NF.activeHabits(S).map(function (h) { return '<li><b>' + e(h.title) + '</b></li>'; }).join('') + '</ul>' +
      (NF.activeHabits(S).length ? '<details class="more"><summary>Proč tyhle návyky</summary><p class="small muted">' + NF.activeHabits(S).map(function (h) { return '<b>' + e(h.short || h.title) + ':</b> ' + e(h.why); }).join('<br>') + '</p></details>' : '') + (NF.item(S, 'R-NAVYKY') && !NF.usable(S, 'R-NAVYKY') ? off(S, 'R-NAVYKY') : '')) +
    card('<h2>Rady, které vám nabízíme</h2><p class="small muted">Nabízíme je před jídlem podle toho, jak na jídlo reagujete. Odpovídat nemusíte.</p>' + adviceList(S, p)) +
    remindersCard(S) +
    card('<h2>Cíle glukózy</h2>' + (NF.usable(S, 'C-CILE') ? '' : off(S, 'C-CILE')) + kv('V cíli', '4–' + e(NF.mmol(p.targets.high)) + ' mmol/l') + '<p class="small muted mt-1 mb-2">Pod 4 mmol/l je nízká glukóza.</p>' + /* pacient vidí všude hranici 4 z čipů a pravidel (kontrola 4, B10); lékař dolní cíl 3,9; SCHEMA 86: bez „ráno nalačno“ – pacient na tu hodnotu nic nedělá (01 3d) */ kv('Platnost plánu do', e(NF.fmtShort(p.validUntil))) + rules(S, ['C-CILE'])) +
    (p.decisions && p.decisions.length ? card('<h2>Co lékař změnil</h2><ul class="plain small">' + p.decisions.map(function (d) { return '<li><b>' + e(d.title) + '</b> – ' + e(d.text) + '</li>'; }).join('') + '</ul>') : '') +
    (older.length ? card('<details class="more"><summary>Starší plány (' + older.length + ')</summary><ul class="plain small">' + older.map(function (x) { return '<li>' + e(NF.fmtShort(x.issuedAt)) + ' – ' + e(NF.fmtShort(x.validUntil)) + '<br><span class="muted">Zápisy z té doby zůstávají u něj.</span></li>'; }).join('') + '</ul></details>') : '');
}
/* Plnění plánu za posledních 7 dní (SCHEMA 86): jen činy – potvrzený inzulin, obvyklá porce a návyky s fajfkou za každý den; žádná glukóza, žádné série. */
function habitDay(S, h, d) {
  var eps = S.episodes.filter(function (x) { return NF.day(x.at) === d.date && !NF.isSnack(x.meal); }), c = d.cells;
  var none = d.today ? 'future' : 'no';
  switch (h.catalogId) {
    case 'H-ZAPIS': return c.slice(0, 3).every(function (x) { return x === 'done' || x === 'skipped'; }) ? 'ok' : c.slice(0, 3).some(function (x) { return x === 'future'; }) ? 'future' : 'no';
    case 'H-PORCE': var pe = eps.filter(function (x) { return !NF.inIllness(S, x); }); return pe.length ? (pe.every(function (x) { return x.portion === 'usual'; }) ? 'ok' : 'no') : none;
    case 'H-INZULIN': return eps.length ? (eps.every(function (x) { return x.insulin && x.insulin.confirmed !== 'unknown'; }) ? 'ok' : 'no') : none;
    case 'H-BAZAL': return c[3] === 'done' ? 'ok' : c[3] === 'future' ? 'future' : 'no';
    case 'H-CAS': var b = eps.filter(function (x) { return x.meal === 'breakfast'; })[0]; return b ? (NF.parse(b.at).getHours() < 8 ? 'ok' : 'no') : none;
    case 'H-PROCHAZKA': return eps.some(function (x) { return (x.advice || []).some(function (a) { return a.lever === 'walk' && a.accepted; }); }) ? 'ok' : none;
    default: return 'no';
  }
}
function weekPlanBlock(S, p) {
  var wFrom = NF.day(NF.addDays(S.clock, -6)); if (wFrom < NF.day(p.effectiveFrom)) wFrom = NF.day(p.effectiveFrom);
  var w = NF.weave(S, wFrom, S.clock), habits = NF.activeHabits(S);
  var eps = S.episodes.filter(function (x) { return !NF.isSnack(x.meal) && NF.day(x.at) >= wFrom && x.at <= S.clock; });
  if (!eps.length && !habits.length) return '';
  var conf = eps.filter(function (x) { return x.insulin && x.insulin.confirmed !== 'unknown' && x.insulin.confirmed !== 'pending'; }).length;
  var pe = eps.filter(function (x) { return !NF.inIllness(S, x); }), usual = pe.filter(function (x) { return x.portion === 'usual'; }).length;
  var rows = habits.map(function (h) {
    var marks = w.days.map(function (d) { return { st: habitDay(S, h, d), d: d }; }), k = marks.filter(function (x) { return x.st === 'ok'; }).length, n = marks.filter(function (x) { return x.st !== 'future'; }).length;
    return '<li class="hweek"><span class="hn">' + e(h.short || h.title) + '</span><span class="marks" role="img" aria-label="' + e((h.short || h.title) + ': splněno ' + k + ' ' + NF.z(n) + ' ' + n + ' dní') + '">' + marks.map(function (x) { return '<i class="' + x.st + '">' + (x.st === 'ok' ? NF.icon('check') : '') + '</i>'; }).join('') + '</span></li>';
  }).join('');
  return '<h3 class="mt-4 mb-1">Plnění plánu za posledních ' + NF.plural(w.days.length, 'den', 'dny', 'dní') + '</h3>' +
    (eps.length ? '<p class="small mt-0 mb-2">Inzulin potvrzený u ' + frac(conf, eps.length) + ' jídel, obvyklá porce u ' + frac(usual, pe.length) + '.</p>' : '') +
    (rows ? '<ul class="plain habit-week">' + rows + '</ul>' : '');
}
/* Připomínky v telefonu (kontrola 4, bod 4): časy vybrala sestra s pacientem při zaučení; pacient je tu může vypnout nebo zapnout. Lékař nic nenastavuje. */
function remindersCard(S) {
  var T = NF.texts(S, 'S-PRIPOMINKY'); if (!T) return '';
  var st = NF.reminderSettings(S), lbl = { breakfast: 'Snídaně', lunch: 'Oběd', dinner: 'Večeře', basal: 'Inzulin na noc (bazál)' };
  return card('<h2>Připomínky v telefonu</h2><p class="small muted">' + (st.chosen ? 'Časy jste vybrali se sestrou.' : 'Časy vyberete se sestrou při zaučení.') + ' Připomínka nemusí přijít (vypnutý nebo ztlumený telefon); inzulin si píchejte podle plánu i bez ní.</p>' +
    NF.REMINDER_KEYS.map(function (k) { var on = !st.off[k]; return '<div class="kv"><span>' + e(lbl[k]) + ' · ' + e(st.times[k] || '–') + '</span><strong><button type="button" class="toggle' + (on ? ' on' : '') + '" role="switch" aria-checked="' + (on ? 'true' : 'false') + '" data-action="reminderToggle" data-value="' + k + '" aria-label="' + e('Připomínka: ' + lbl[k]) + '"></button></strong></div>'; }).join('') +
    '<p class="small muted mt-2 mb-0">Po menší porci s inzulinem se telefon za ' + NF.param(S, 'B-HYPO', 'pripominka_min', 60) + ' min zeptá, jestli glukóza klesla pod 4.</p>', 'reminders');
}
V.remindersCard = remindersCard;
V.safety = function (S) {
  var p = NF.activePlan(S), ill = NF.ill(S);
  return head(S, 'Platí vždy, i bez připojení', 'Bezpečí') +
    card('<h2>Kam se obrátit</h2>' + safetyContacts(S)) +
    card('<h2>Bezpečnostní pravidla</h2><p class="small muted mt-0">Klepněte na pravidlo, ukáže se celé.</p>' + instructionsList(S, p, false, SAFETY_ORDER) + (NF.instructions(S).length ? '<details class="more mt-2"><summary>O pravidlech</summary><p class="small muted">Pravidla jsou stejná pro všechny pacienty NutriFee. Tato pravidla připravil NutriFee a posoudil je lékař.</p></details>' : ''), 'rules-card') /* SCHEMA 86: věta o tom, kdo pravidla připravil (rozhodnutí vlastníka 30. 10. 2026, bod 10), je u každého pravidla v „O pravidle“ */ +
    (function () { var k = NF.item(S, 'K-KRITERIA'), t = k && k.texts && k.texts.bezpeci; return t ? hint(e(t), 'neutral') : ''; })() /* kontrola 4 (06 B4): kdy NutriFee přestává platit; záznam nesouhlasu s K-KRITERIA text neskrývá */ /* obecná pravidla bez podpisu lékaře (SCHEMA 74) */ +
    (NF.nemocOn(S) ? card('<div class="sick">' + NF.icon('thermometer') + ' ' + (ill ? 'Nemoc trvá od ' + e(NF.fmtShort(S.illness.from)) : 'Není mi dobře') + ' <button type="button" class="toggle ' + (ill ? 'on' : '') + '" role="switch" aria-checked="' + (ill ? 'true' : 'false') + '" data-action="illness" data-value="' + (ill ? 'off' : 'on') + '" aria-label="Nemoc"></button></div>' + rules(S, ['P-NEMOC']))
      : card('<div class="sick">' + NF.icon('thermometer') + ' Není mi dobře</div>' + off(S, 'P-NEMOC'))); /* A05 */
};

/* ---------- kontaktní formulář technické podpory (S-PODPORA, 23. 10. 2026) ----------
   Jen k aplikaci: výběr potíže, volitelný popis, Odeslat. Zdravotní potíže sem nepatří – obrazovka to říká. V ukázce se nic neposílá. */
V.support = function (S) {
  var sp = S.support || {};
  return head(S, 'Bezpečí · technická podpora', 'Napsat podpoře') +
    hint('<b>Jen k NutriFee.</b> Zdravotní potíže sem nepatří; kontakty na ordinaci a záchrannou službu najdete v Bezpečí. Když nefunguje senzor, pomůže podpora jeho výrobce.', 'warn') +
    (sp.sent ? card('<h2>Odesláno podpoře</h2><p>Ozveme se na telefon, ze kterého píšete. Zatím můžete zapisovat dál; vaše zápisy nikam nezmizí.</p>' + V.demoNote('podpora') + '<div class="actions mt-2">' + btn(NF.icon('chevron-left') + ' Zpět do Bezpečí', 'page', 'safety', 'primary') + '</div>', 'tint') :
    card('<h2>Co nefunguje?</h2><div class="choice-row col">' + NF.SUPPORT_ISSUES.map(function (x) { return choice(e(x[1]), 'supportIssue', x[0], sp.issue === x[0], 'opt'); }).join('') + '</div>' +
      '<label class="field mt-3"><span>Co se stalo (nemusíte vyplnit)</span><textarea data-bind="support.text" rows="3" placeholder="např. po klepnutí na Chystám se jíst se nic nestane">' + e(sp.text || '') + '</textarea></label>' +
      '<div class="actions mt-2">' + btn('Odeslat podpoře', 'supportSend', null, 'primary big', sp.issue ? '' : ' disabled') + '</div>' +
      (sp.issue ? '' : '<p class="small muted ta-c">Nejdřív vyberte, co nefunguje.</p>') +
      '<p class="small muted mt-2 mb-0">Zprávu čte technická podpora, ne lékař. Posíláme jen to, co tu vyberete a napíšete.</p>'));
};

/* ---------- report před kontrolou ---------- */
V.preview = function (S) {
  var p = NF.activePlan(S); if (!p) return head(S, 'Před kontrolou', 'Zatím nemáte plán');
  var s = NF.summary(S, p.id), adv = s.advice;
  var minN4 = NF.param(S, 'S-VYSLEDEK', 'min_n', 4), best = NF.previewBest(S, p); /* SCHEMA 89: výběr v jádře (NF.previewBest) */
  var pi = NF.periodInfo(S, p, S.clock, true), sem = NF.semafor(S); /* počet dní a zápisů stejným výpočtem jako report lékaře (A30) */
  var praise = 'Zapsáno <strong>' + NF.periodEntriesText(pi) + '</strong>, z toho ' + NF.plural(s.usual, 'jídlo', 'jídla', 'jídel') + ' v obvyklé porci. Inzulin podle plánu u ' + s.asPlan + ' ' + NF.z(s.meals) + ' ' + s.meals + ' jídel.' + /* přímé počty, ne zpětně z procenta; jedno poděkování (21. 10. 2026) */
    (best ? ' U jídla „' + e(best.food.name) + '“ bylo s radou „' + e(NF.LEVERS[best.lever].label.toLowerCase()) + '“ ' + best.st.inTarget + ' ' + NF.z(best.st.n) + ' ' + best.st.n + ' zápisů v cíli' + (best.base && best.base.n >= minN4 ? ', bez ní ' + best.base.inTarget + ' ' + NF.z(best.base.n) + ' ' + best.base.n : '') + '.' : '');
  var qs = NF.previewQuestions(S, s, best); /* SCHEMA 89: tři navržené otázky počítá jádro (NF.previewQuestions), příběh je bere odtud */
  return head(S, 'Před kontrolou ' + (S.nextVisit ? NF.fmtShort(S.nextVisit) : ''), 'Co uvidí lékař') + importNotice(S) +
    card('<div class="now-row"><div>' + ttl('Díky za ' + NF.plural(pi.days, 'den', 'dny', 'dní') + ' zapisování') + praise + '<br><span class="small muted">Tohle uvidí lékař: co jste zkusili a jak to dopadlo. Nikoho nehodnotíme.</span></div></div>', 'soft') +
    card('<details class="more"' + (S.previewTile ? ' open' : '') + '><summary>Podrobnosti v číslech</summary><div class="tiles mt-3">' +
      tile('Jídla', s.meals, 'zapsáno' + (s.snacks ? ' · ' + NF.plural(s.snacks, 'svačina', 'svačiny', 'svačin') : ''), 'c-ok', 'meals') + tile('Obvyklá porce', s.usualPct == null ? '—' : s.usualPct + ' %', 'jídel', s.usualPct == null ? 'c-none' : s.usualPct >= sem.porceOk ? 'c-ok' : 'c-warn', 'usual') + /* prahy S-SEMAFOR (A14) */
      tile('Inzulin', s.asPct == null ? '—' : s.asPct + ' %', 'podle plánu', s.asPct == null ? 'c-none' : s.asPct >= sem.insOk ? 'c-ok' : 'c-warn', 'ins') + tile('Rady', adv.accepted.n, 'jídel s přijatou radou · ' + adv.declined.n + ' bez přijaté rady', 'c-none', 'adv') /* kontrola 3, C6: jednotka jídla, ne nabídky */ /* B11: srovnání rad neutrálně */ + '</div><div class="small mt-1 mb-2">' + appr(S, 'C-CILE') + ' ' + appr(S, 'S-SOUHRN') + '</div>' +
      (S.previewTile ? '<div class="hint neutral">' + e(previewDetail(S, s, S.previewTile)) + '</div>' : '<p class="small muted">Klepněte na dlaždici pro vysvětlení.</p>') + '</details>') +
    card('<h2>Vaše návyky v tomto plánu</h2><ul class="plain">' + NF.activeHabits(S).map(function (h) { return '<li>' + e(h.title) + '</li>'; }).join('') + '</ul><p class="small muted">Jak se vám dařilo, je v číslech výše; návyky si lékař s vámi projde na kontrole.</p>') +
    card('<h2>Na co se zeptat lékaře</h2><p class="small muted">Klepněte na otázku, kterou si chcete vzít na kontrolu.</p><div class="choice-row col">' +
      qs.map(function (q) { return choice(e(q), 'toggleQuestion', q, S.questions.some(function (x) { return x.text === q; })); }).join('') + '</div>' +
      '<details class="more mt-3"><summary>Chci se zeptat na něco jiného</summary><label class="field"><span>Vlastní otázka</span><textarea data-bind="form.question" placeholder="Napište vlastními slovy">' + e((S.form && S.form.question) || '') + '</textarea></label><div class="actions">' + btn('Uložit otázku', 'saveQuestion', null, 'primary') + '</div></details>') +
    hint('<b>Otázky a přehled uvidí lékař až s vámi v ordinaci.</b> Mezi kontrolami je nikdo z ordinace nečte.'); /* kontrola 4 (06 C10) */
};
function tile(k, v, d, cls, key) { return '<button type="button" class="tile ' + cls + '" data-action="previewTile" data-value="' + key + '"><div class="k"><i></i>' + e(k) + '</div><div class="v">' + e(String(v)) + '</div><div class="d">' + e(d) + '</div></button>'; }
function previewDetail(S, s, key) {
  return { meals: 'Každý zápis nás učí, jak vaše tělo reaguje. ' + NF.plural(s.incomplete, 'zápis má', 'zápisy mají', 'zápisů má') + ' mezeru v datech ze senzoru a ' + NF.plural(s.ill, 'zápis je', 'zápisy jsou', 'zápisů je') + ' z doby nemoci – ty se do učení nepočítají, ale lékař je vidí.',
    usual: 'Obvyklá porce je množství, na které lékař nastavil dávku. Když ji držíte, můžeme výsledky jídel lépe porovnávat.', /* kontrola 4 (06, odst. 4): bez tvrzení o účinku */
    ins: 'Podle plánu: ' + s.asPlan + '×, jinak: ' + s.other + '×, bez inzulinu: ' + s.none + '×, nevím: ' + s.unknown + '×. Lékaři to pomůže poznat, jestli dávka sedí, nebo se jen liší podání.',
    adv: 'Po přijaté radě byla nejvyšší hodnota po jídle obvykle kolem ' + NF.mmol(s.advice.accepted.med) + ' mmol/l, bez rady kolem ' + NF.mmol(s.advice.declined.med) + '. ' + (s.advice.topReason ? 'Nejčastější důvod, proč ne: „' + NF.reasonLabel(s.advice.topReason) + '“.' : '') }[key] || '';
}

function adviceList(S, p) {
  var a = NF.planAdvice(S, p);
  return '<ul class="plain">' + Object.keys(NF.LEVERS).filter(function (l) { return l !== 'portion' && NF.usable(S, NF.LEVERS[l].item); }).map(function (l) {
    return '<li><b>' + e(NF.LEVERS[l].label) + '</b> ' + (a.off.indexOf(l) >= 0 ? tag('lékař vypnul', 'warn') : a.prefer.indexOf(l) >= 0 ? tag('lékař doporučil', 'info') : '') + '</li>';
  }).join('') + '</ul>' + offLevers(S);
}
V.adviceList = adviceList;

/* ---------- nový plán ---------- */
V.newPlan = function (S) {
  var p = NF.activePlan(S), prev = p && p.previousId ? NF.planById(S, p.previousId) : null;
  if (!p || !prev) return V.today(S);
  var doseChanges = [];
  ['basal', 'breakfast', 'lunch', 'dinner'].forEach(function (k) { if (p.doses[k].units !== prev.doses[k].units) doseChanges.push(k); }); /* změny ukazují tokeny v tabulce: dřívější přeškrtnutý, nový „nová“ – bez rozdílu „+2“ (Podpis A) */
  var newH = S.habits.filter(function (h) { return h.planId === p.id; }), oldH = S.habits.filter(function (h) { return h.planId === prev.id; });
  var added = newH.filter(function (h) { return !oldH.some(function (o) { return o.catalogId === h.catalogId; }); }), removed = oldH.filter(function (h) { return !newH.some(function (o) { return o.catalogId === h.catalogId; }); });
  var pa = NF.planAdvice(S, p), oa = NF.planAdvice(S, prev);
  var advOff = pa.off.filter(function (l) { return oa.off.indexOf(l) < 0; }), advOn = pa.prefer.filter(function (l) { return oa.prefer.indexOf(l) < 0; });
  var instrChange = JSON.stringify(p.instructions) !== JSON.stringify(prev.instructions) || JSON.stringify(p.targets) !== JSON.stringify(prev.targets) ? '<p><b>Pravidla a cíle:</b> lékař upravil jejich hodnoty – najdete je v Bezpečí a v Plánu.</p>' : '';
  var adviceChange = advOff.length || advOn.length ? '<p>' + (advOff.length ? (advOff.length > 1 ? 'Rady „' : 'Radu „') + e(advOff.map(function (l) { return NF.LEVERS[l].label; }).join('“, „')) + '“ vám už nenabízíme – lékař ' + (advOff.length > 1 ? 'je' : 'ji') + ' vypnul. ' : '') + (advOn.length ? 'Místo toho vám budeme nabízet „' + e(advOn.map(function (l) { return NF.LEVERS[l].label; }).join('“, „')) + '“.' : '') + ' Dávky se tím nemění.</p>' : '';
  /* Kontrola 4 (06 B6): u nového plánu se změněnou dávkou stejná otázka jako při prvním převzetí – jediná nezávislá kontrola zadání dávky. */
  var rb = S.onboarding && S.onboarding.readback, ask = doseChanges.length && !p.understood, doseLine = doseChanges.map(function (k) { return (k === 'basal' ? 'Inzulin na noc' : 'Inzulin ' + NF.mealLabel(k, 'ke')) + ': ' + p.doses[k].units + ' j. (dřív ' + prev.doses[k].units + ' j.)'; }).join(' · ');
  return head(S, 'Nový plán od ' + NF.fmtShort(p.effectiveFrom || p.issuedAt), 'Co se změnilo') + /* SCHEMA 86: bez kódu plánu „P2“ */
    card('<div class="now-row"><div>' + ttl('Co teď') + (ask ? 'Projděte si změny, odpovězte, jestli nová dávka souhlasí, a klepněte na „Rozumím, pokračuji“. Od teď platí nový plán.' : 'Projděte si změny a klepněte na „Rozumím, pokračuji“. Od teď platí nový plán.') + '</div></div>') +
    card('<h2>Dávky inzulinu</h2>' + (doseChanges.length ? hint('<b>Nová dávka: učíme se znovu.</b> S novou dávkou bude tělo reagovat jinak, proto u těchto jídel začínáme od nuly. Staré zápisy zůstávají označené původní dávkou.', 'neutral') : '<p>Beze změny.</p>') + dosesTable(p, prev)) +
    (ask ? card('<h2>' + e(doseLine) + '. Souhlasí s tím, co vám řekl lékař?</h2><div class="choice-row col" role="group" aria-label="Souhlasí nová dávka s tím, co vám řekl lékař?">' + choice(opt('Ano, souhlasí'), 'doseReadback', 'yes', rb === 'yes', 'opt') + choice(opt('Ne, něco nesedí'), 'doseReadback', 'no', rb === 'no', 'opt') + '</div>' +
      (rb === 'no' ? hint('<b>Ukažte telefon sestře.</b> Plán zatím nepřebírejte; sestra dávku ověří s lékařem.', 'over') : ''), 'readback') : '') +
    card('<h2>Návyky a rady</h2>' + (added.length ? '<p><b>Nové:</b> ' + e(added.map(function (h) { return h.title; }).join(', ')) + '</p>' : '') + (removed.length ? '<p><b>Končí:</b> ' + e(removed.map(function (h) { return h.title; }).join(', ')) + '</p>' : '') + adviceChange + instrChange + (!added.length && !removed.length && !adviceChange && !instrChange ? '<p>Pokračují beze změny.</p>' : '') +
      (p.decisions && p.decisions.length ? '<details class="more"><summary>Proč lékař rozhodl takto</summary><ul class="plain small">' + p.decisions.map(function (d) { return '<li><b>' + e(d.title) + '</b> – ' + e(d.text) + '</li>'; }).join('') + '</ul></details>' : '')) +
    '<div class="actions">' + (p.understood ? btn('Přejít na Dnes', 'page', 'today', 'primary big') : btn('Rozumím, pokračuji', 'confirmUnderstanding', null, 'primary big', ask && rb !== 'yes' ? ' disabled' : '')) + '</div>' +
    (ask && rb !== 'yes' && !p.understood ? '<p class="small muted ta-c">' + (rb === 'no' ? 'Pokračovat půjde, až sestra dávku ověří.' : 'Nejdřív odpovězte, jestli nová dávka souhlasí.') + '</p>' : '');
};

})(typeof window !== 'undefined' ? window : globalThis);
