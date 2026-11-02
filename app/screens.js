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
   U zamítnuté položky následuje oznámení „tahle část nefunguje“ (prezentační vrstva přes NF.slots.offNotice; produkce bez ní nic nepřidá). */
var APPR = { pending: ['pend', 'circle-dashed', 'ke schválení', 'Pravidlo ke schválení: '], approved: ['', 'check', '', 'Schválené pravidlo: '], rejected: ['rej', 'x', 'zamítnuto', 'Zamítnuté pravidlo: '] };
function appr(S, id) {
  var r = NF.item(S, id);
  if (!r || r.scope === 'provozni') return ''; /* provozní pravidla neschvaluje nikdo a štítek nemají (27. 10. 2026, Q1) */
  var st = NF.itemState(S, id), m = APPR[st] || APPR.pending;
  return '<button type="button" class="appr ' + m[0] + '" data-action="openItem" data-value="' + e(id) + '" title="' + e((m[2] || 'schváleno') + ' · ' + r.title) + '" aria-label="' + m[3] + e(r.title) + '"><span aria-hidden="true">' + NF.icon(m[1]) + '</span> ' + e(r.title) + (m[2] ? '\u00a0<span class="st">· ' + m[2].replace(' ', '\u00a0') + '</span>' : '') + '</button>' + (st === 'rejected' ? off(S, id) : '');
}
function off(S, id) { return NF.slots.offNotice ? NF.slots.offNotice(S, id) : ''; }
/* B3 (31/03): věty o maketě, ukázce a příběhu dodává prezentační vrstva (NF.slots.demoTexts); jádro (produkce) mluví neutrálně jako aplikace. */
function demoText(key) { try { var t = NF.slots.demoTexts && NF.slots.demoTexts()[key]; return t ? String(t) : ''; } catch (err) { return ''; } }
V.demoText = demoText;
V.demoNote = function (key, cls) { var t = demoText(key); return t ? '<p class="small muted' + (cls ? ' ' + cls : '') + '">' + e(t) + '</p>' : ''; };
/* Pravidlo I-*, které v plánu chybí: oznámení na místě (zamítnutá R-POKYNY, jinak zamítnuté pravidlo) – obrazovka na chybějící pravidlo neodkazuje (15 odst. 12; kontrola 3, B2). */
function ruleOff(S, id) { return NF.item(S, 'R-POKYNY') && !NF.usable(S, 'R-POKYNY') ? off(S, 'R-POKYNY') : NF.item(S, id) && !NF.usable(S, id) ? off(S, id) : ''; }
/* Řádek štítků položek, které na místě působí (zásada 4; A02, 27. 10. 2026). */
function rules(S, ids, cls) { var h = ids.filter(Boolean).map(function (id) { return appr(S, id); }).filter(Boolean).join(' '); return h ? '<div class="small mt-2 rules' + (cls ? ' ' + cls : '') + '">' + h + '</div>' : ''; }
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
      'Spočítáno ' + NF.z(st.n) + ' ' + st.n + ' vašich zápisů' + (st.quantile ? '' : ', s dalšími se upřesní') + '.' + (detail && prev && st.quantile && (prev.lo !== st.lo || prev.hi !== st.hi) ? ' Po prvních ' + half.length + ' zápisech bylo rozmezí ' + e(NF.mmol(prev.lo)) + '–' + e(NF.mmol(prev.hi)) + ', krajní hodnoty se nepočítají.' : ''); /* počet „X ze N v cíli“ je v souhrnu jídla, tady se neopakuje (21. 10. 2026) */
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
  var items = [['today', 'Dnes', 'home'], ['foods', 'Jídla', 'utensils'], ['plan', 'Plán', 'list'], ['safety', 'Bezpečí', 'shield']];
  return '<nav class="tabbar" aria-label="Hlavní nabídka">' + items.map(function (it) {
    var on = S.page === it[0] || (S.page === 'food' && it[0] === 'foods') || (S.page === 'preview' && it[0] === 'plan') || (S.page === 'support' && it[0] === 'safety'); /* detail jídla patří pod Jídla, report a nahrání exportu pod Plán, podpora pod Bezpečí */
    return '<button type="button" data-action="page" data-value="' + it[0] + '" class="' + (on ? 'active' : '') + '"' + (on ? ' aria-current="page"' : '') + '><span class="ic" aria-hidden="true">' + NF.icon(it[2]) + '</span>' + e(it[1]) + '</button>';
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
};

function head(S, eyebrow, h1) { return '<p class="eyebrow">' + e(eyebrow) + '</p><h1>' + e(h1) + '</h1>'; }
function greeting(S) { var h = NF.parse(S.clock).getHours(); return h < 10 ? 'Dobré ráno' : h < 18 ? 'Dobrý den' : 'Dobrý večer'; }
function mealNow(S) { var d = NF.parse(S.clock), h = d.getHours() + d.getMinutes() / 60; return h < NF.DAYPART_END.breakfast ? 'breakfast' : h < NF.DAYPART_END.lunch ? 'lunch' : 'dinner'; }
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
  var t = NF.tolerance(S), k = 2, left = 160 - t.before * k, w = (t.before + t.after) * k, b = ['as', 'other', 'before', 'unknown'].indexOf(m.bolus) >= 0 ? m.bolus : 'none';
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
    }).join('') + segs.map(function (sg, i) { return '<text class="lab l' + (i + 1) + '" x="160" y="' + (segs.length === 2 ? 44 + i * 24 : 32 + i * 24) + '">' + (i + 1) + ' ' + e(sg[0]) + '</text>'; }).join('');
    return leverFig('order', svg);
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
  return '<div class="stephead">' + (back || '<span></span>') + safetyBtn() + '</div>' + head(S, 'Převzetí plánu ' + p.id + ' · ' + n + ' ze 6', TAKEOVER[n - 1]) +
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
  if (order) list.sort(function (x, y) { var ix = order.indexOf(x.id), iy = order.indexOf(y.id); return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy); }); /* nejnaléhavější pokyny první (18. 10. 2026) */
  if (!list.length) return '<p class="small muted">V plánu zatím nejsou žádná bezpečnostní pravidla.</p>';
  if (compact) return '<ul class="plain">' + list.map(function (i) { var c = cat.filter(function (x) { return x.id === i.id; })[0] || { title: i.id }; return '<li>' + e(c.title) + '</li>'; }).join('') + '</ul>'; /* převzetí plánu: jen názvy, celé znění v Bezpečí (19. 10. 2026) */
  return '<ul class="plain doc-list">' + list.map(function (i) {
    var c = cat.filter(function (x) { return x.id === i.id; })[0] || { title: i.id, text: '' };
    if (!NF.usable(S, i.id)) return '<li><b>' + e(c.title) + '</b> ' + off(S, i.id) + '</li>'; /* zamítnutý pokyn: na jeho místě oznámení, ne text (zásada 4, 23. 10. 2026) */
    var txt = NF.instrHtml(NF.instrTextOf(S, c), i.value); /* bez odkazu na chybějící pravidlo (kontrola 4, B6) */
    return '<li><b>' + e(c.title) + '</b> ' + appr(S, i.id) + '<p class="doc-q">' + txt + '</p></li>'; /* každé pravidlo je položka registru (21. 10. 2026); bez uvozovek a podpisu lékaře (SCHEMA 74) */
  }).join('') + cat.filter(function (c) { return NF.item(S, c.id) && !NF.usable(S, c.id) && !list.some(function (i) { return i.id === c.id; }); }).map(function (c) { return '<li><b>' + e(c.title) + '</b> ' + off(S, c.id) + '</li>'; }).join('') + /* zamítnutý pokyn, který v plánu chybí: oznámení na jeho místě (nález 9e) */
    '</ul>';
}
V.instructionsList = instructionsList;
/* Bezpečnostní pravidlo (rozhodnutí vlastníka 27. 10. 2026, SCHEMA 74; ruší „hlas lékaře jako citaci“ z 19. 10. 2026): obecné pravidlo NutriFee schválené garantem,
   stejné pro všechny – vysazené větším písmem, bez uvozovek a bez podpisu lékaře (lékař pravidla nepíše ani nevybírá). Prázdný řetězec, když pravidlo v plánu není. */
function instructionText(S, id) {
  var cat = NF.instructionCatalog();
  var i = NF.instructions(S).filter(function (x) { return x.id === id; })[0], c = cat.filter(function (x) { return x.id === id; })[0];
  if (!i || !c || !NF.usable(S, id)) return ''; /* zamítnuté pravidlo nepůsobí (zásada 4, 23. 10. 2026) */
  var txt = NF.instrHtml(NF.instrTextOf(S, c), i.value);
  return '<div class="doc-voice"><p class="doc-q">' + txt + '</p></div>';
}
/* Bezpečnostní karta s pravidlem: odlišená sazbou a nadpisem (výchozí „Bezpečnostní pravidlo“), ne barevným okrajem. */
function doctorCard(S, id, title, extra, cls) {
  var q = instructionText(S, id), pokynyOff = NF.item(S, 'R-POKYNY') && !NF.usable(S, 'R-POKYNY'), itemOff = !!NF.item(S, id) && !NF.usable(S, id);
  if (!q && !extra && !pokynyOff && !itemOff) return '';
  /* štítek pravidla u jeho textu (A02, 02 #19); bez pravidel (zamítnutá R-POKYNY) nebo se zamítnutým pravidlem oznámení na místě textu (A05; B18, nezávislá kontrola 27. 10. 2026) */
  return card('<p class="eyebrow doc-h">' + NF.icon('shield') + ' ' + e(title || 'Bezpečnostní pravidlo') + '</p>' + (q ? q + rules(S, [id]) : pokynyOff ? off(S, 'R-POKYNY') : itemOff ? off(S, id) : '') + (extra || ''), 'doc' + (cls ? ' ' + cls : ''));
}
/* Čip „nad 15“ (glukóza teď nebo nejvyšší po jídle): hned pravidlo k vysoké glukóze I-VYSOKA (vlastník 27. 10. 2026, SCHEMA 74); zamítnuté pravidlo → oznámení na místě. */
/* past = hodnota z minulosti (nejvyšší po jídle, zpětný zápis): aplikace nezná hodnotu teď, proto nejdřív „podívejte se, kolik je teď“ (kontrola 2, B2; text položky I-VYSOKA). */
function highCard(S, title, past) {
  if (NF.item(S, 'I-VYSOKA') && !NF.usable(S, 'I-VYSOKA')) return card('<p class="eyebrow doc-h">' + NF.icon('shield') + ' ' + e(title) + '</p>' + off(S, 'I-VYSOKA'), 'doc warn high-now');
  var q = instructionText(S, 'I-VYSOKA'), T = NF.texts(S, 'I-VYSOKA'), i = NF.instructions(S).filter(function (x) { return x.id === 'I-VYSOKA'; })[0];
  var pre = past && q && T && T.minula ? '<p class="small mt-1 mb-2"><b>' + NF.instrHtml({ text: T.minula, unit: 'mmol/l' }, i ? i.value : 15) + '</b></p>' : '';
  if (!pre) return doctorCard(S, 'I-VYSOKA', title, '', 'warn high-now'); /* kontrola 3, B2: bez pravidla jen oznámení na místě, žádný odkaz na pravidla v Bezpečí */
  return card('<p class="eyebrow doc-h">' + NF.icon('shield') + ' ' + e(title) + '</p>' + pre + q + rules(S, ['I-VYSOKA']), 'doc warn high-now');
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
    var txt = NF.instrHtml(NF.instrTextOf(S, c), i.value);
    return '<div class="box' + (cls || '') + '"><div class="k">' + e(c.title) + '</div><p class="small mt-1 mb-0">' + txt + '</p>' + rules(S, [id]) + '</div>'; /* štítek pravidla (A02) */
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
function resultCard(S, compact) {
  var r = NF.lastResult(S); if (!r) return NF.usable(S, 'S-VYSLEDEK') ? '' : off(S, 'S-VYSLEDEK');
  var rc = NF.confidence(S, r.food.id, r.ep.meal), g = NF.glucoseOf(S, r.ep), high = NF.targets(S).high;
  var body = '<div class="now-row">' + foodIcon(S, r.food, rc) + '<div>' + (compact ? '' : ttl('Jak to dopadlo')) + r.text + riseBar(S, r) + (g.source === 'manual' ? '<p class="small muted mt-1 mb-0">Podle hodnot, které jste opsali; na kontrole je upřesníme.</p>' : '') + divergenceBlock(S, r.ep) + (r.key === 'excluded' && r.smaller && instructionText(S, 'I-MENE') ? '<p class="eyebrow doc-h mt-3">' + NF.icon('shield') + ' Bezpečnostní pravidlo</p>' + instructionText(S, 'I-MENE') : '') +
    '<div class="actions mt-3">' + btn('Zavřít', 'resultSeen', r.ep.id, 'sm') + btn('Zobrazit jídlo', 'openFood', r.food.id, 'quiet sm') + '</div></div></div>' +
    '<div class="small mt-2">' + appr(S, 'S-VYSLEDEK') + '</div>';
  if (!compact) return card(body, 'result');
  /* když je na řadě další jídlo, výsledek minulého je jeden řádek s rozbalením (18. 10. 2026: akce před informací) */
  var verdict = r.key === 'noEval' || r.key === 'excluded' ? '' : ' · ' + (g.peak <= high && g.peakBound !== 'under' ? 'v cíli' : g.peakBound === 'under' ? 'pokles' : 'nad cílem'); /* B4 (kontrola 2): bez vyhodnocení ani u nezapočítaného zápisu verdikt v hlavičce není */
  var st = g.peak == null ? 'bez hodnoty' : r.key === 'excluded' ? 'do učení nejde' : NF.mmolB(g.peak, g.peakBound) + ' mmol/l' + verdict; /* „nad 15“ slovem i ve sbaleném řádku */
  return card('<details class="more result-compact"><summary>' + NF.icon('plate') + '<span><b>Jak to dopadlo</b> · ' + e(NF.mealLabel(r.ep.meal)) + '</span><span class="st">' + e(st) + '</span></summary>' + body + '</details>', 'result');
}
/* Zapsáno + „Opravit inzulin“: do 60 minut po zápisu hlavního jídla (R6). */
function fixInsulinCard(S) {
  var eps = S.episodes.filter(function (x) { return !NF.isSnack(x.meal) && NF.canCorrectInsulin(S, x); });
  if (!eps.length) return '';
  var ep = eps[eps.length - 1], f = NF.foodById(S, ep.foodId), open = S.fixInsulin === ep.id, pick = open ? S.fixInsulinPick : null;
  var insOf = function (x) { return x.confirmed === 'as' ? 'inzulin ' + x.units + ' j. podle plánu' : x.confirmed === 'other' ? 'inzulin ' + x.units + ' j. (jinak)' : x.confirmed === 'none' ? 'bez inzulinu' : x.confirmed === 'pending' ? 'inzulin čeká na potvrzení' : 'inzulin „nevím“'; };
  var left = NF.param(S, 'D-CISTA', 'oprava_min', 60) - NF.minutesDiff(NF.insulinConfirmedAt(ep), S.clock); /* od potvrzení inzulinu (01 #2) */
  var fixed = ep.insulinCorrected && ep.history && ep.history.length ? ep.history[ep.history.length - 1] : null;
  var just = !!(NF.flash && NF.flash.food === ep.foodId);
  return card('<div class="now-row">' + foodIcon(S, f, NF.confidence(S, f.id, ep.meal)) + '<div>' + ttl('Zapsáno: ' + e(NF.mealLabel(ep.meal)) + ' · ' + e(f ? f.name : '')) + e(insOf(ep.insulin)) + (ep.context === 'illness' ? ' <span class="tag">' + NF.icon('thermometer') + ' nemoc</span>' : '') + /* zápis z doby nemoci nese štítek (21. 10. 2026) */
    (fixed ? '<p class="small mt-1 mb-0">' + NF.icon('check', 'ok') + ' Opraveno: ' + e(insOf(fixed.insulinTo)) + ' · ' + e(NF.fmtClock(fixed.at)) + '</p>' : '') +
    '<div class="actions meta mt-2">' + btn(open ? 'Zavřít' : 'Opravit inzulin', 'fixInsulinOpen', ep.id, 'link') + '<span class="small muted">lze ještě ' + NF.plural(Math.max(0, left), 'minutu', 'minuty', 'minut') + '</span></div>' +
    (open ? '<div class="choice-row col mt-2" role="group" aria-label="Jak to bylo s inzulinem?">' + choice(opt('Podle plánu', ep.insulin.prescribed + ' j.'), 'fixInsulinPick', ep.id + ':as', pick === 'as', 'opt') + choice(opt('Jinak', 'jiné množství'), 'fixInsulinPick', ep.id + ':other', pick === 'other', 'opt') + choice(opt('Nepíchnuto', 'k tomuto jídlu bez inzulinu'), 'fixInsulinPick', ep.id + ':none', pick === 'none', 'opt') + choice(opt('Nevím', 'pro jistotu počítáme, že byl'), 'fixInsulinPick', ep.id + ':unknown', pick === 'unknown', 'opt') + '</div>' +
      (pick === 'other' ? '<div class="actions"><div class="stepper">' + btn(NF.icon('minus'), 'fixInsulinUnits', '-1', '', ' aria-label="méně"') + '<span class="val">' + (S.fixInsulinUnits != null ? S.fixInsulinUnits : ep.insulin.prescribed) + ' j.</span>' + btn(NF.icon('plus'), 'fixInsulinUnits', '1', '', ' aria-label="více"') + '</div></div>' : '') +
      '<div class="actions col">' + btn('Uložit opravu', 'fixInsulin', ep.id + ':' + (pick || ''), 'primary', pick ? '' : ' disabled') + '</div>' +
      '<p class="small muted mt-2 mb-0">Z opraveného zápisu se učíme dál; do návrhu k dávce pro lékaře už nejde.</p>' : '') + '</div></div>', just ? 'just-saved' : '');
}
function milestoneCard(S) {
  var m = NF.pendingMilestone(S); if (!m) return NF.usable(S, 'R-MILNIKY') ? '' : off(S, 'R-MILNIKY');
  return card('<div class="now-row"><div>' + ttl('Milník') + m.text +
    '<div class="actions mt-3">' + btn('Zavřít', 'milestoneClose', m.id, 'sm') + '</div></div></div>' +
    '<div class="small mt-2">' + appr(S, 'R-MILNIKY') + '</div>', 'tint milestone');
}
function weekCard(S) {
  var w = NF.weekSummary(S), T = NF.texts(S, 'S-TYDEN'); if (!NF.usable(S, 'S-TYDEN')) return off(S, 'S-TYDEN'); if (!w || !T) return '';
  var lines = [NF.fillText(T.meals, { meals: w.meals, slots: w.slots, usual: w.usual })];
  if (w.best) lines.push(NF.fillText(T.helped, { lever: NF.LEVERS[w.best.lever].label, k: w.best.k, n: w.best.n }));
  if (w.milestones.length) lines.push(T.milestone ? NF.fillText(T.milestone, { n: w.milestones.length }) + ' ' + w.milestones[w.milestones.length - 1].text.replace(/<\/?strong>/g, '') : ''); /* text milníku je už escapovaný (P4) */
  if (w.suggest) lines.push(NF.fillText(T.suggest, { food: w.suggest.food, lever: NF.leverNoun(w.suggest.lever), k: w.suggest.k, n: w.suggest.n }));
  lines.push(T.thanks || '');
  return card('<div class="now-row"><div>' + ttl(e(NF.fillText(T.head, { week: w.week }))) + lines.filter(Boolean).map(function (l) { return '<p class="mt-1 mb-1">' + l + '</p>'; }).join('') +
    '<div class="actions mt-3">' + btn('Zavřít', 'weekClose', w.id, 'sm') + '</div></div></div>' +
    '<div class="small mt-2">' + appr(S, 'S-TYDEN') + '</div>', 'week');
}
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
    '<div class="hero-num sm">' + ps.left + '<small>' + (ps.left === 1 ? 'den' : ps.left >= 2 && ps.left <= 4 ? 'dny' : 'dní') + ' do kontroly</small></div><div class="hero-cap">' + ps.week + '. týden plánu</div>' +
    /* posledních 7 dní jako tkanina místo dlaždic (Podpis C, 20. 10. 2026); celé období vidí jen lékař */
    (ps.gone >= 1 || ps.weekMeals ? '<' + hl + ' class="weave-h">' + (ps.weave.days.length === 1 ? 'Dnešní den' : ps.weave.days.length <= 4 ? 'Poslední ' + ps.weave.days.length + ' dny' : 'Posledních ' + ps.weave.days.length + ' dní') + '</' + hl + '>' + weave(ps.weave, true) +
      '<p class="small muted mt-2 mb-0">Mezery nejsou chyba. Lékař uvidí celé období najednou.</p>' + /* 21. 10. 2026: tkanina není série s trestem */
      (ps.repeated ? '<p class="small mt-3 mb-0">Vašich častých jídel známe ' + frac(ps.known, ps.repeated) + '.</p>' : '')
      : '<p class="small muted mt-3">Po prvních zápisech tu uvidíte, které dny máte zapsané a kolik jídel už známe.</p>') + /* nulový stav místo „0 z 0“ (19. 10. 2026) */
    (withPreview ? '<p class="small muted mt-3 mb-0">' + T.visit + '</p>' : '') + /* na Dnes by věta opakovala závěrečnou nápovědu */
    (withPreview ? '<div class="actions mt-3">' + btn('Co uvidí lékař →', 'page', 'preview', 'sm') + '</div>' : '') +
    '<div class="small mt-2">' + appr(S, 'S-CESTA') + '</div>', asCard ? 'path' : 'flat flush');
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
  return card('<div class="now-row"><div>' + ttl(ps.left === 0 ? 'Dnes jdete na kontrolu' : 'Za ' + ps.left + ' ' + (ps.left === 1 ? 'den' : ps.left <= 4 ? 'dny' : 'dní') + ' jdete na kontrolu') + 'Podívejte se, co uvidí lékař, a vyberte otázky, které si chcete vzít s sebou.' + exportRemind(S, true) +
    '<div class="actions mt-3">' + btn('Co uvidí lékař →', 'page', 'preview', 'primary sm') + '</div></div></div>');
}
V.pathCard = pathCard;
/* Zlomek „3 z 4“: spojka menší a tlumená, číslo a spojka se nerozdělí (19. 10. 2026). */
/* C4 (31/03): zlomek „0 z 1“ s mezerami i v textu a pro čtečku (dřív „0z1“) */
function frac(a, b) { return '<span class="frac">' + a + ' <span class="of">' + NF.z(b) + '</span> ' + b + '</span>'; }
V.frac = frac;

/* ---------- data ze senzoru bez napojení (Z-GLUKOZA, Z-IMPORT, B-HYPO) ---------- */
/* Čipy po celých mmol/l místo klávesnice (vlastník 18. 10. 2026): 4–15, pod 4, nad 15, nemám. */
function glucoseChips(action, prefix, current, asked, bound) {
  var vals = [], cur = asked ? (current == null ? 'none' : bound === 'under' ? 'low' : bound === 'over' ? 'high' : String(Math.round(current))) : null;
  vals.push(['low', 'pod 4']); for (var v = 4; v <= 15; v++) vals.push([String(v), String(v)]); vals.push(['high', 'nad 15']); vals.push(['none', 'nemám hodnotu']);
  /* pravidelná mřížka 4 sloupců: čísla vždy na stejném místě (19. 10. 2026) */
  return '<div class="chips glu" role="group" aria-label="Glukóza v mmol/l">' + vals.map(function (x) { return choice(x[1], action, (prefix ? prefix + ':' : '') + x[0], cur === x[0], 'chip' + (x[0] === 'none' ? ' quiet' : x[0] === 'low' ? ' low' : x[0] === 'high' ? ' high' : '')); }).join('') + '</div>';
}
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
      (!peakDone ? ttl('Nejvyšší hodnota za první dvě hodiny <span class="unit">mmol/l</span>') + '<p class="small muted mt-1 mb-2">Podle grafu v aplikaci senzoru.</p>' + glucoseChips('peakChip', ep.id, null, false)
        : !NF.usable(S, 'B-HYPO') ? '<p class="small muted mt-1 mb-2">Nejvyšší hodnota po jídle: <b>' + e(NF.mmolB(ep.manual.peak, ep.manual.peakBound)) + '</b>.</p>' + off(S, 'B-HYPO') /* B17: otázka na pokles patří k B-HYPO; zamítnutá položka = otázka se neptá */
        : ttl(lowQ(S, ep.at)) + '<p class="small muted mt-1 mb-2">Nejvyšší hodnota po jídle: <b>' + e(NF.mmolB(ep.manual.peak, ep.manual.peakBound)) + '</b>.</p>' + yesNoChips('lowChip', ep.id, null)) +
      (S.page === 'meal' && !peakDone ? '' : '<div class="small mt-2">' + appr(S, peakDone ? 'B-HYPO' : 'Z-GLUKOZA') + '</div>'), 'prev-ask') +
      (peakDone && ep.manual.peakBound === 'over' ? highCard(S, prevLabel(ep) + ': nejvyšší hodnota nad 15', true) : ''); /* čip „nad 15“ → pravidlo I-VYSOKA hned (SCHEMA 74) */
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
    yesNoChips('hypoAnswer', w.id, null) + '<div class="mt-3">' + (instructionText(S, 'I-HYPO') || ruleOff(S, 'I-HYPO')) + '</div></div></div>' +
    '<div class="small mt-2">' + appr(S, 'B-HYPO') + '</div>');
}
/* Pravidlo hned (15 odst. 2.3; nález 3 a 5, 23. 10. 2026): po menší porci s inzulinem v těle, nebo po vynechaném jídle s inzulinem (i „nevím“),
   je na Dnes karta s pravidlem „méně jídla než obvykle“, dokud otázka na pokles nemá odpověď. Pravidlo je schválené garantem; aplikace k němu nic nepřidává. */
function lessFoodCards(S) {
  var day = NF.day(S.clock), out = '', seen = {};
  var m = NF.param(S, 'B-HYPO', 'pripominka_min', 60);
  var one = function (kind, meal, insulin, w) {
    var k = kind + ':' + meal; if (seen[k]) return; seen[k] = 1;
    var situation = kind === 'skipped' ? 'Dnes ' + NF.mealText(meal, 'without') + ', ale inzulin ' + (insulin === 'unknown' ? 'možná podaný – počítáme, že byl.' : 'podaný.') : NF.cap(NF.mealLabel(meal)) + ' s menší porcí než obvykle, inzulin ' + (insulin === 'unknown' ? 'možná v těle.' : 'v těle.');
    var when = w && !w.night ? 'Za ' + m + ' min od jídla se zeptáme, jestli glukóza klesla pod 4.' : w && w.night ? 'Ráno se zeptáme, jestli glukóza klesla v noci pod 4.' : '';
    out += doctorCard(S, 'I-MENE', 'Méně jídla než obvykle', '<p class="small mt-3 mb-0"><b>' + e(situation) + '</b>' + (when ? ' ' + e(when) : '') + '</p>', 'low');
  };
  NF.openHypoWatch(S).forEach(function (w) { if (NF.day(w.at) !== day || (w.kind !== 'skipped' && w.kind !== 'smaller')) return; var ep = w.epId ? S.episodes.filter(function (x) { return x.id === w.epId; })[0] : null; var sk = S.skipped && S.skipped[day] && S.skipped[day][w.meal]; one(w.kind, w.meal, ep ? ep.insulin.confirmed : sk ? sk.insulin : 'as', w); });
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
  return card('<div class="now-row"><div>' + ttl(hypoAlertTitle(a)) + '<p class="mt-1 mb-0">' + e(NF.dropRuleRefs(S, T.opakovane || '')) + '</p>' + /* bez odkazu na chybějící pravidlo (kontrola 4, B6) */
    (instructionText(S, 'I-HYPO') ? '<p class="eyebrow doc-h mt-3">' + NF.icon('shield') + ' Nízká glukóza</p>' + instructionText(S, 'I-HYPO') + rules(S, ['I-HYPO']) : '') +
    '<div class="actions mt-3">' + btn('Rozumím', 'hypoAlertSeen', null, 'primary sm') + '</div></div></div><div class="small mt-2">' + appr(S, 'B-HYPO') + '</div>', 'low repeat');
}
/* Odpověď „ano, pod 4“: karta s pravidlem zůstane, dokud ji pacient nepotvrdí; řekne, kolik poklesů se počítá (19. 10. 2026). Bez věty o volání (SCHEMA 74).
   Když poklesy dosáhly B-HYPO.poklesy, nese pravidlo karta po opakovaných poklesech a tahle se neukazuje. */
function lowNoticeCard(S) {
  if (!S.lowNotice || NF.day(S.lowNotice.at) !== NF.day(S.clock)) return '';
  var al = NF.hypoAlert(S); if (al && !al.seen) return '';
  /* M2 (kontrola 2): zamítnutá B-HYPO = poklesy se nepočítají; místo počtu oznámení na místě */
  if (NF.item(S, 'B-HYPO') && !NF.usable(S, 'B-HYPO')) return doctorCard(S, 'I-HYPO', 'Glukóza klesla pod 4', off(S, 'B-HYPO') + '<div class="actions mt-3">' + btn('Rozumím', 'lowNoticeSeen', null, 'sm') + '</div>', 'low');
  var n = NF.param(S, 'B-HYPO', 'poklesy', 2), d = NF.param(S, 'B-HYPO', 'dny', 7), k = NF.lowEvents(S, d).length;
  return doctorCard(S, 'I-HYPO', 'Pokles pod 4 je zapsaný', '<p class="small mt-3 mb-0">Počítá se do poklesů za ' + d + ' dní: ' + Math.min(k, n) + ' ' + NF.z(n) + ' ' + n + '. Poklesy uvidí lékař na kontrole.</p>' +
    '<div class="actions mt-3">' + btn('Rozumím', 'lowNoticeSeen', null, 'sm') + '</div>', 'low');
}
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
function lowNowCard(S) { return doctorCard(S, 'I-HYPO', 'Glukóza je teď pod 4', '<p class="small mt-3 mb-0">' + e(NF.lowNowText(S)) + '</p>', 'low'); } /* rozhodnutí vlastníka 25. 10. 2026: při pod 4 žádná rada */
/* Čip „nad 15“ v kroku 1 (glukóza teď, u zpětného zápisu i nejvyšší po jídle) → pravidlo I-VYSOKA hned (SCHEMA 74). */
function highNow(S, m) {
  var out = '';
  if (m.beforeAsked && m.beforeBound === 'over') out += highCard(S, m.retro ? 'Glukóza při jídle nad 15' : 'Glukóza je teď nad 15', !!m.retro);
  if (m.retro && m.peakAsked && m.peakBound === 'over') out += highCard(S, 'Nejvyšší hodnota po jídle nad 15', true);
  return out;
}
V.highNow = highNow;
V.prevAskBlock = prevAskBlock; V.hypoWatchCard = hypoWatchCard; V.hypoAlertCard = hypoAlertCard; V.lowNoticeCard = lowNoticeCard; V.pendingInsulinCard = pendingInsulinCard;

/* V.peakAskCard (karta „Nejvyšší hodnota po…?“ s psaním desetinného čísla) smazána – nevykreslovala se od 18. 10. 2026 a obcházela by čipy (kontrola 4, 06 C1). */
function divergenceBlock(S, ep) {
  var dv = NF.divergence(S, ep); if (!dv) return '';
  /* B14 (kontrola 2): slovo pacienta „nejvyšší hodnota“, „nad 15“ slovem (hranice čipu, ne číslo); C11: jiná příloha a jiné množství zvlášť; C1: jedno znění neobvyklého dne */
  var cmp = dv.peak != null && dv.peakMed != null ? ' (nejvyšší hodnota ' + e(NF.mmolB(dv.peak, dv.peakBound)) + ' mmol/l, dřív kolem ' + e(String(dv.peakMed)) + ')' : '';
  return '<div class="hint neutral mt-3"><b>Tentokrát to dopadlo jinak než dřív</b>' + cmp + '. Bylo to stejné jídlo?' +
    '<div class="choice-row mt-2">' + choice('Stejné jídlo', 'foodDiverge', ep.id + ':same', false, 'sm') + choice('Jiná příloha', 'foodDiverge', ep.id + ':side', false, 'sm') + choice('Jiné množství', 'foodDiverge', ep.id + ':amount', false, 'sm') + choice('Jinak připravené', 'foodDiverge', ep.id + ':prep', false, 'sm') + choice('Neobvyklý den (' + NF.UNUSUAL + ')', 'foodDiverge', ep.id + ':day', false, 'sm') + '</div>' +
    '<p class="small muted mt-2 mb-0">Jídlo bude „známé“, až se zápisy shodnou. Jiná příloha nebo příprava se přidá jako samostatné jídlo; jiné množství a neobvyklý den do učení nepočítáme.</p></div>';
}
/* Připomínka před kontrolou (vlastník 27. 10. 2026, SCHEMA 74): během plánu pacient hodnoty opisuje; před kontrolou pošle do ordinace export ze senzoru
   a sestra ho na kontrole nahraje. Na Dnes v kartě „Za N dní jdete na kontrolu“ (inline) a nahoře v přehledu Před kontrolou. Text je provozní (Z-IMPORT). */
function exportRemind(S, inline) {
  if (S.sensorImport && S.nextVisit && NF.parse(S.sensorImport.at) >= NF.parse(NF.addDays(S.nextVisit, -14))) return ''; /* export za toto období už je nahraný */
  var t = '<b>Před kontrolou pošlete do ordinace export ze senzoru.</b> Sestra ho na kontrole nahraje a doplní přesný průběh glukózy k vašim zápisům.';
  return inline ? '<p class="small mt-2 mb-0 export-remind">' + t + '</p>' : hint(t, 'export-remind'); /* export nahrává jen sestra (vlastník 27. 10. 2026) */
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
  var out = head(S, NF.fmtDayDate(S.clock), greeting(S));
  if (!p) return out + card('<h2>Zatím nemáte plán</h2><p>Až vám ho lékař v ordinaci vydá, uvidíte tady, co dělat.</p>');
  if (S.participation !== 'active') return out + card('<h2>Účast je ukončená</h2><p>Návyky, rady i připomínky jsou zastavené. Vaše zápisy zůstávají uložené.</p>');
  var ill = NF.ill(S);
  /* Přepínač nemoci nese P-NEMOC (A02); zamítnutá P-NEMOC: přepínač nahradí oznámení „Tahle část nefunguje“ (A05, Q1). */
  if (!NF.nemocOn(S)) out += card('<div class="sick">' + NF.icon('thermometer') + ' Není mi dobře</div>' + off(S, 'P-NEMOC'));
  else if (!ill) out += card('<div class="sick">' + NF.icon('thermometer') + ' Není mi dobře <button type="button" class="toggle" role="switch" aria-checked="false" data-action="illness" data-value="on" aria-label="Není mi dobře"></button></div>' +
    '<details class="more mt-2"><summary>Co se stane</summary><p class="small muted">Zapisovat můžete dál. ' + e(NF.ILL_TEXT) + ' Každý den se zeptáme, jestli je vám lépe.</p></details>' + rules(S, ['P-NEMOC']));
  var fm = NF.focusMeal(S), meal = fm ? fm.meal : mealNow(S), dose = p.doses[meal], hour = NF.parse(S.clock).getHours();
  var eaten = !fm || fm.state === 'done';
  var basalHour = Number(String(p.doses.basal.time).split(':')[0]) || 21;
  var basal = basalToday(S), basalTime = hour >= basalHour - 2;
  var yday = NF.day(NF.addDays(S.clock, -1)), askYesterday = NF.day(p.effectiveFrom) <= yday && !S.basalLog.some(function (b) { return b.date === yday; });
  var ask = S.ask && S.ask.day === NF.day(S.clock) ? S.ask : null;

  if (ill) {
    var ci = S.illness.checkins.filter(function (c) { return NF.day(c.at) === NF.day(S.clock); })[0];
    out += card('<div class="now-row"><div>' + ttl('Při nemoci') + 'Zapisujte jídla dál. ' + e(NF.ILL_TEXT) + ' Dávky inzulinu platí, jak řekl lékař; pravidla pro nemoc máte na této stránce.' + /* jedna věta při nemoci (A19) */
      (NF.day(S.illness.from) === NF.day(S.clock) ? '<br><span class="small muted">Zítra se zeptáme, jestli je vám lépe.</span>' : ci ? '<br><span class="small muted">Dnes už máme odpověď. Zeptáme se zase zítra.</span>' : '<div class="actions mt-3">' + btn('Už je mi lépe', 'illnessCheck', 'better', 'primary') + btn('Ještě ne', 'illnessCheck', 'same', '') + '</div>') + '</div></div>' + rules(S, ['P-NEMOC']), 'soft') + /* štítek P-NEMOC u karty nemoci (A02) */
      illnessInstructions(S, p);
  }
  if (ill && NF.illnessLong(S)) out += doctorCard(S, 'I-NEMOC-JIDLO', 'Nemoc trvá už ' + NF.plural(NF.daysBetween(S.illness.from, S.clock), 'den', 'dny', 'dní'), '<p class="small mt-3 mb-0">' + (instructionText(S, 'I-NEMOC-JIDLO') ? '' : 'Pravidla pro nemoc najdete v Bezpečí. ') + 'Lékař uvidí na kontrole, jak dlouho nemoc trvala.</p>');
  var slots = NF.daySlots(S), MT = function (k) { return e(NF.mealText(meal, k)); };
  var sk = (S.skipped && S.skipped[NF.day(S.clock)]) || {};
  /* 1) Co teď + primární akce hned pod pozdravem (18. 10. 2026: obrazovka začíná tím, co má pacient udělat) */
  var mealDue = !!(fm && (fm.state === 'now' || fm.state === 'next')), nextOnly = !!(fm && fm.state === 'next');
  /* „Co teď“ je jediný hrdina obrazovky (rozhodnutí vlastníka 19. 10. 2026): podbarvená karta, zpráva velkým písmem, bez ikony. */
  var hero = function (msg, sub, body) { return card('<p class="eyebrow">Co teď</p><h2 class="hero-msg">' + msg + '</h2>' + (sub ? '<p class="hero-sub">' + sub + '</p>' : '') + (body || ''), 'hero'); };
  if (mealDue) {
    out += hero(nextOnly ? 'Další jídlo: ' + e(NF.mealLabel(meal)) : 'Na řadě je ' + e(NF.mealLabel(meal)), nextOnly ? 'Inzulin ' + e(NF.mealLabel(meal, 'ke')) + ' až před jídlem. Až se budete chystat jíst, klepněte na „Chystám se jíst“.' : (ill ? 'Připomeneme inzulin. ' + e(NF.ILL_TEXT) : 'Připomeneme inzulin a poradíme.'),
      '<div class="actions col mt-4">' + btn('' + NF.icon('utensils') + ' Chystám se jíst', 'startMeal', meal, 'primary big') + '</div>' +
      '<div class="actions split">' + btn(MT('already'), 'mealRetro', meal, '') + btn('Dnes ' + MT('without'), 'mealSkipAsk', meal, '', ask && ask.meal === meal ? ' aria-pressed="true"' : '') + '</div>' +
      (ask && ask.meal === meal ? '<div class="mt-4"><b>Byl ' + e(NF.mealLabel(meal, 'ke')) + ' inzulin?</b><div class="choice-row col mt-2" role="group">' + choice(opt('Ano, ' + dose.units + ' j.', 'podle plánu'), 'mealSkip', meal + ':as', false, 'opt') + choice(opt('Ano, jinak', 'jiné množství'), 'mealSkip', meal + ':other', false, 'opt') + choice(opt('Ne', 'bez inzulinu'), 'mealSkip', meal + ':none', false, 'opt') + choice(opt('Nevím', 'pro jistotu počítáme, že byl'), 'mealSkip', meal + ':unknown', false, 'opt') + '</div></div>' : ''));
  } else if (basalTime && !basal) {
    out += hero('Čas na bazál', 'Lékař vám předepsal ' + V.dose(p.doses.basal.units, '', 'sm') + ' ' + NF.ve(p.doses.basal.time) + ' ' + e(p.doses.basal.time) + '. Až si píchnete, potvrďte to.');
  } else if (fm && fm.state === 'missed') {
    var a0 = ask && ask.meal === meal ? ask : null;
    out += hero(MT('was'), e(NF.mealLabel(meal, 'Ke')) + ' nemáme zápis. Dejte nám vědět, co bylo.',
      '<div class="actions split mt-4">' + choice(MT('yes'), 'mealRetro', meal, false, 'big') + choice('Ne, ' + MT('without'), 'mealSkipAsk', meal, !!a0, 'big') + '</div>' +
      (a0 ? '<div class="mt-4"><b>Byl ' + e(NF.mealLabel(meal, 'ke')) + ' inzulin?</b><div class="choice-row col mt-2" role="group">' + choice(opt('Ano, ' + dose.units + ' j.', 'podle plánu'), 'mealSkip', meal + ':as', false, 'opt') + choice(opt('Ano, jinak', 'jiné množství'), 'mealSkip', meal + ':other', false, 'opt') + choice(opt('Ne', 'bez inzulinu'), 'mealSkip', meal + ':none', false, 'opt') + choice(opt('Nevím', 'pro jistotu počítáme, že byl'), 'mealSkip', meal + ':unknown', false, 'opt') + '</div>' + (NF.hasInstruction(S, 'I-MENE') ? '<p class="small mt-3 mb-1">Když byl inzulin bez jídla, platí toto pravidlo:</p>' + instructionText(S, 'I-MENE') : '<p class="small muted mt-2">Bezpečnostní pravidla najdete v Bezpečí.</p>') + '</div>' : ''));
  } else {
    out += hero('Dnešní jídla jsou zapsaná', 'Další věc na vás čeká až ' + (basalTime ? 'zítra ráno' : 'večer u bazálu') + '.',
      '<div class="actions col mt-4">' + btn('' + NF.icon('apple') + ' Zapsat svačinu', 'startMeal', 'snack', 'big') + '</div>');
  }
  out += lowNoticeCard(S);
  out += pendingInsulinCard(S);
  out += fixInsulinCard(S);
  out += doseOffPlanCard(S); /* S-DAVKA (vlastník 1. 11. 2026, bod 5): dvakrát po sobě jiná dávka než v plánu u téhož jídla dne */
  /* 2) bezpečí a otázky k minulému jídlu */
  out += hypoAlertCard(S);
  out += hypoWatchCard(S);
  if (basalTime) out += prevAskBlock(S);
  out += lessFoodCards(S); /* pravidlo hned po menší porci nebo vynechaném jídle s inzulinem (23. 10. 2026) */
  /* 3) zpětná vazba: výsledek posledního jídla (zkrácený, když je na řadě další), pak nejvýš jedna karta milníku nebo týdne */
  out += resultCard(S, mealDue);
  var msCard = milestoneCard(S); out += msCard || weekCard(S);
  out += soonCard(S);
  out += yesterdayCard(S); /* kontrola 4 (07 B3): zapomenutý zápis ze včerejška do 24 h od konce slotu */
  /* 4) pás dne a bazál */
  out += dayStrip(S, slots, meal, basal, basalTime, p);
  if (askYesterday) {
    var byBody = 'Záznam ze včerejška chybí. Lékař předepsal ' + p.doses.basal.units + ' j. ve ' + e(p.doses.basal.time) + '.' +
      '<div class="choice-row col mt-2" role="group">' + choice('Ano, ' + p.doses.basal.units + ' j.', 'basalYesterday', 'as', false) + choice('Ne', 'basalYesterday', 'none', false) + choice('Nevím', 'basalYesterday', 'unknown', false) + '</div>';
    /* kontrola 4 (07 C4): po poledni je karta jen řádek s rozbalením, aby celý den nezabírala Dnes */
    out += hour >= 12 ? card('<details class="more"><summary>' + NF.icon('moon') + ' <span><b>Byl včera večer bazál?</b> · záznam chybí</span></summary><div class="mt-2">' + byBody + '</div></details>')
      : card('<div class="now-row"><span class="ic" aria-hidden="true">' + NF.icon('moon') + '</span><div>' + ttl('Byl včera večer bazál?') + byBody + '</div></div>');
  }
  if (basalTime && !basal) {
    out += card('<div class="insulin"><div class="ic" aria-hidden="true">' + NF.icon('syringe') + '</div><div><b>Bazál ' + NF.ve(p.doses.basal.time) + ' ' + e(p.doses.basal.time) + '</b><small>Předepsal lékař</small></div>' + V.dose(p.doses.basal.units) + '</div>' + doseOrigin(S, 'basal') +
      '<div class="actions col mt-3">' + btn(S.basalOther ? 'Přece jen ' + p.doses.basal.units + ' j.' : 'Bazál ' + p.doses.basal.units + ' j. je píchnutý', 'basalConfirm', 'as', S.basalOther ? 'quiet' : 'primary big') /* při „Jinak“ je jediné primární „Uložit“ (01 #12) */ + btn('Jinak', 'basalOther', null, '', S.basalOther ? ' aria-pressed="true"' : '') + '</div>' +
      (S.basalOther ? '<div class="actions"><div class="stepper">' + btn(NF.icon('minus'), 'basalUnits', '-1', '', ' aria-label="méně"') + '<span class="val">' + (S.basalUnits != null ? S.basalUnits : p.doses.basal.units) + ' j.<small>předepsáno ' + p.doses.basal.units + '</small></span>' + btn(NF.icon('plus'), 'basalUnits', '1', '', ' aria-label="více"') + '</div>' + btn('Uložit', 'basalConfirm', 'other', 'primary') + btn('Dnes bez bazálu', 'basalConfirm', 'none', 'quiet') + '</div>' : ''));
  } /* karta „Inzulin k …“ sloučena do pásu dne: dávka je druhý řádek uzlu „teď“ (rozhodnutí vlastníka 19. 10. 2026) */
  if (!(fm && fm.state === 'done') || (basalTime && !basal) || (fm && fm.state === 'missed')) out += '<div class="actions sec pull-up mb-4">' + btn('' + NF.icon('apple') + ' Zapsat svačinu', 'startMeal', 'snack', 'quiet') + '</div>'; /* velké tlačítko svačiny je jen ve stavu „vše zapsáno“ */

  var habits = NF.activeHabits(S);
  if (NF.item(S, 'R-NAVYKY') && !NF.usable(S, 'R-NAVYKY')) out += card('<h2 class="card-title">Návyky dnes</h2>' + off(S, 'R-NAVYKY')); /* zamítnutá R-NAVYKY: startovní návyky neplatí (A05) */
  if (habits.length) {
    var todayEps = todayEpisodes(S).filter(function (x) { return !NF.isSnack(x.meal); }); /* svačina nemá dávku ani porci, do návyků nepatří */
    /* návyky, které jen zrcadlí pás dne, jsou sbalené; vidět zůstane bazál, dokud má dnes termín (rozhodnutí vlastníka 19. 10. 2026) */
    var done = 0, shown = '', hidden = '';
    habits.forEach(function (h) {
      var ok = habitDone(S, h, todayEps, basal); if (ok) done++;
      var row = '<div class="habit"><span class="mark ' + (ok ? '' : 'todo') + '">' + (ok ? NF.icon('check') : '') + '</span><div>' + e(h.short || h.title) + '<small>' + e(habitProgress(S, h, todayEps, basal)) + '</small></div></div>';
      if (h.catalogId === 'H-BAZAL' && !ok) shown += row; else hidden += row;
    });
    out += card(shown + '<details class="more habits' + (shown ? ' mt-2' : '') + '"><summary><span><b>Návyky dnes</b> · ' + done + ' ' + NF.z(habits.length) + ' ' + habits.length + ' splněno</span></summary>' + hidden +
      '<p class="small muted mt-3 mb-0">' + habits.map(function (h) { return '<b>' + e(h.short || h.title) + ':</b> ' + e(h.why); }).join('<br>') + '</p></details>');
  }
  out += pathCard(S, false);
  out += hint('<b>Vaše zápisy uvidí lékař až s vámi na kontrole.</b> Při potížích otevřete Bezpečí.');
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
  return card('<div class="now-row"><span class="ic" aria-hidden="true">' + NF.icon('plate') + '</span><div>' + ttl('Včera chybí ' + e(NF.joinOr(names).replace(' nebo ', ' a ')) + ' – doplnit?') + '<p class="small mt-1 mb-2">Když si pamatujete, co bylo, doplňte to zpětně. Hodnoty najdete v grafu senzoru.</p>' +
    '<div class="actions split">' + g.map(function (x) { return btn('Doplnit ' + e(NF.mealLabel(x.meal, 'acc')), 'mealRetroYesterday', x.meal, 'sm'); }).join('') + '</div></div></div>', 'yesterday');
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
  }).join('') + '</ol>');
}
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
function timeChips(m) {
  var opts = [['0', 'právě teď'], ['-5', 'před 5 min'], ['-15', 'před 15 min'], ['-30', 'před 30 min']];
  var cur = m.offset == null || m.offset === '' ? '0' : String(m.offset); /* „právě teď“ je předvybrané (kontrola 4, 07 C2) */
  return '<div class="timechips">' + opts.map(function (o) { return choice(o[1], 'mealTime', o[0], cur === o[0]); }).join('') + '</div>';
}
function tolNote(S) { var t = NF.tolerance(S); return '<p class="tiny muted mt-2 mb-0">Nejlépe se učíme z jídel, kde byl inzulin do ' + t.before + ' minut před jídlem nebo do ' + t.after + ' minut po něm. Zapište jídlo i jindy, zůstane uložené.</p>'; }
/* Hlavička kroku: Zpět vlevo nahoře (48 px), krok 1 se ptá, zda zahodit rozpracovaný zápis (18. 10. 2026). */
function stepHead(S, m, step) {
  var back = step > (NF.isSnack(m.meal) ? 2 : 1) && !(m.retro && step === 1) ? btn(NF.icon('chevron-left') + ' Zpět', 'mealStep', String(step - 1), 'back') : btn(NF.icon('chevron-left') + ' Zpět na Dnes', (m.bolus || m.beforeAsked || m.foodId) ? 'mealCancelAsk' : 'mealCancel', null, 'back');
  return '<div class="stephead">' + back + safetyBtn() + '</div>';
}
/* Bezpečí jedním klepnutím i z kroků jídla (LF-11, 19. 10. 2026): list přes obrazovku, zápis zůstává rozpracovaný. */
function safetyBtn() { return btn(NF.icon('shield') + ' Bezpečí', 'safetyOpen', null, 'back safety-btn'); }
V.safetySheet = function (S) {
  var p = NF.activePlan(S);
  return '<div class="patient sheet-body"><p class="eyebrow">' + (S.meal ? 'Zápis jídla zůstává rozpracovaný' : 'Platí vždy, i bez připojení') + '</p><h2 class="sheet-h">Bezpečí</h2>' +
    card('<h2>Kam se obrátit</h2>' + safetyContacts(S)) +
    card('<h2>Bezpečnostní pravidla</h2>' + instructionsList(S, p, false, SAFETY_ORDER)) +
    '<div class="actions col">' + btn(NF.icon('chevron-left') + (S.meal ? ' Zpět k zápisu' : ' Zpět'), 'closeDrawer', null, 'primary big') + '</div></div>';
};
var SAFETY_ORDER = ['I-HYPO', 'I-KONTAKT', 'I-MENE', 'I-NEVIM', 'I-VYSOKA', 'I-NEMOC-BAZAL', 'I-NEMOC-JIDLO'];
function safetyContacts(S) {
  var row = function (ic, k, v) { return '<div class="kv contact"><span>' + NF.icon(ic) + ' ' + e(k) + '</span><strong>' + e(v) + '</strong></div>'; }; /* popisek nahoře, cesta pod ním – na telefonu se nic neláme (23. 10. 2026) */
  /* čtyři cesty (vlastník 23. 10. 2026): senzor → podpora výrobce senzoru, aplikace → kontaktní formulář v aplikaci (S-PODPORA).
     Kontrola 3, B4: zdravotní cesty (ordinace, pohotovost, záchranná služba) jsou klinický obsah pravidla Kontakty (I-KONTAKT, garant); bez něj v plánu je na jejich místě oznámení. */
  var health = !S || NF.hasInstruction(S, 'I-KONTAKT');
  return (health ? row('stethoscope', 'Zdravotní potíže', 'ordinace, mimo ordinační dobu pohotovost') + row('shield', 'Ohrožení života', 'záchranná služba') : ruleOff(S, 'I-KONTAKT')) + row('cog', 'Nefunguje senzor', 'podpora výrobce senzoru') + row('message', 'Nefunguje NutriFee', 'napište podpoře') +
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
    '<p class="small muted mt-1 mb-0">' + e(T.nocCipPomoc || '') + '</p>' + rules(S, ['B-HYPO'], 'mt-1') + '</div>';
}
V.nightChip = nightChip;
/* Karta opsaných hodnot ze senzoru (Z-GLUKOZA): teď / při jídle; u zpětného zápisu i nejvyšší do 2 h a „pod 4“. Jedna karta pro živý i zpětný zápis (23. 10. 2026). */
function glucoseCard(S, m) {
  return card((m.retro ? '' : timeHead('clock', 'Teď · ' + NF.fmtClock(S.clock))) + '<h2>' + (m.retro ? 'Glukóza při jídle podle grafu senzoru' : 'Kolik ukazuje senzor teď') + ' <span class="unit">mmol/l</span></h2><p class="small muted mt-1 mb-2">Opište celé číslo z aplikace senzoru. Když ho nemáte, klepněte na „nemám hodnotu“ – jídlo zapíšeme i tak. Hodnotu doplní sestra na kontrole z dat senzoru.</p>' +
    '<div class="small mb-2">' + appr(S, 'Z-GLUKOZA') + '</div>' + /* SCHEMA 82 (31/16 C5): štítek hodnot ze senzoru nad mřížkou, hned u řádku „Vybráno teď“ – posun k položce na telefonu nechá vybranou hodnotu na obrazovce (štítek pod mřížkou ji vytlačil nad výřez) */
    /* Kontrola 4 (07 B1): po výběru se mřížka „teď“ sbalí na řádek se „Změnit“ (jako blok k předchozímu jídlu), aby se dvě stejné mřížky pod sebou nepletly */
    (m.beforeAsked && !m.retro ? '<details class="more chips-done"><summary><span class="chosen-note">Vybráno teď: ' + (m.before == null ? 'nemám hodnotu' : e(NF.mmolB(m.before, m.beforeBound)) + ' mmol/l') + '</span> <span class="small">· Změnit</span></summary>' + glucoseChips('mealBefore', '', m.before, true, m.beforeBound) + '</details>'
      : glucoseChips('mealBefore', '', m.before, !!m.beforeAsked, m.beforeBound) + (m.beforeAsked ? '<p class="chosen-note">Vybráno: ' + (m.before == null ? 'nemám hodnotu' : e(NF.mmolB(m.before, m.beforeBound)) + ' mmol/l') + '</p>' : '')) +
    (m.retro ? '<b class="field-q">Nejvyšší hodnota za dvě hodiny po jídle</b>' + glucoseChips('mealPeak', '', m.peak, !!m.peakAsked, m.peakBound) + (m.peakBound === 'under' ? '<p class="chosen-note">Nejvyšší hodnota pod 4: počítáme to jako pokles.</p>' : !NF.usable(S, 'B-HYPO') ? off(S, 'B-HYPO') : '<b class="field-q">' + lowQ(S, m.at != null ? NF.retroAt(S, m.at) : null) + '</b>' + yesNoChips('mealLow', '', m.lowAsked ? (m.low === true ? 'yes' : m.low === false ? 'no' : 'unknown') : null) + rules(S, ['B-HYPO'])) : '') + /* otázka na pokles nese B-HYPO (A02, A24); zamítnutá B-HYPO = otázka se neptá (B17) */
    nightChip(S, m));
}
V.meal = function (S) {
  var m = S.meal, p = NF.activePlan(S);
  if (!m || !p) return card('<h2>Teď nelze nic zapsat</h2>') + '<div class="actions">' + btn('Zpět', 'page', 'today', 'primary') + '</div>';
  var dose = p.doses[m.meal], out = '', snack = NF.isSnack(m.meal);
  if (!snack && !dose) return card('<h2>Teď nelze nic zapsat</h2><p class="small muted">K tomuto jídlu plán nemá dávku.</p>') + '<div class="actions">' + btn('Zpět', 'page', 'today', 'primary') + '</div>';
  var steps = '<div class="msteps">' + (snack ? [2, 3] : [1, 2, 3]).map(function (i) { return '<span class="' + (i <= m.step ? 'on' : '') + '"></span>'; }).join('') + '</div>';
  var stepLabel = function (n) { return snack ? 'Krok ' + (n - 1) + ' ze 2 · svačina' : 'Krok ' + n + ' ze 3 · ' + NF.mealLabel(m.meal); };
  if (m.step === 1 && m.retro) {
    var base = { breakfast: 6, lunch: 11, dinner: 17 }[m.meal], yday = !!(m.day && m.day < NF.day(S.clock)); /* zápis včerejšího jídla (kontrola 4, 07 B3) */
    out += stepHead(S, m, 1) + head(S, 'Krok 1 ze 3 · ' + (yday ? 'včera · ' : '') + NF.mealLabel(m.meal) + ' zpětně', 'Byl ' + NF.mealLabel(m.meal, 'ke') + ' inzulin?') + steps +
      card('<div class="insulin"><div class="ic" aria-hidden="true">' + NF.icon('syringe') + '</div><div><b>Lékař předepsal ' + e(NF.mealLabel(m.meal, 'ke')) + '</b><small>ptáme se, jak to bylo</small></div>' + V.dose(dose.units) + '</div>') +
      '<div class="choice-row col" role="group" aria-label="Byl inzulin?">' +
      choice(opt('Ano, ' + dose.units + ' j.', 'podle plánu'), 'mealBolus', 'as', m.bolus === 'as', 'opt') +
      choice(opt('Ano, jinak', 'jiné množství'), 'mealBolus', 'other', m.bolus === 'other', 'opt') +
      choice(opt('Ne', 'bez inzulinu'), 'mealBolus', 'none', m.bolus === 'none', 'opt') +
      choice(opt('Nevím', 'pro jistotu počítáme, že byl'), 'mealBolus', 'unknown', m.bolus === 'unknown', 'opt') + '</div>' +
      (m.bolus === 'unknown' ? doctorCard(S, 'I-NEVIM', 'Nevíte, jestli byl inzulin píchnutý') : '') +
      hypoWatchCard(S, true) + /* noční otázka „klesla v noci pod 4?“ i v kroku 1 zpětného zápisu snídaně (nález 4, 23. 10. 2026) */
      (m.bolus === 'other' ? card('<b>Kolik jednotek?</b><div class="actions mt-2"><div class="stepper">' + btn(NF.icon('minus'), 'mealUnits', '-1', '', ' aria-label="méně"') + '<span class="val">' + m.units + ' j.<small>předepsáno ' + dose.units + '</small></span>' + btn(NF.icon('plus'), 'mealUnits', '1', '', ' aria-label="více"') + '</div></div>') : '') +
      card('<b>' + e(NF.mealText(m.meal, 'when')) + '</b><div class="timechips">' + [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(function (o) { var h = base + o; var nowH = yday ? 24 : NF.parse(S.clock).getHours() + NF.parse(S.clock).getMinutes() / 60; return h <= nowH ? choice('v ' + NF.fmtHour(h), 'mealAt', String(h), String(m.at) === String(h)) : ''; }).join('') + '</div>' +
        (m.bolus === 'as' || m.bolus === 'other' ? '<b class="field-q">A inzulin?</b><div class="timechips">' + [['0', 'zároveň s jídlem'], ['-15', '15 min před'], ['-30', '30 min před'], ['15', 'až po jídle']].map(function (o) { return choice(o[1], 'mealTime', o[0], String(m.offset) === o[0]); }).join('') + '</div>' + tolNote(S) : '')) +
      glucoseCard(S, m) + /* hodnoty ze senzoru i u zpětného zápisu; bez nich krok 2 nejde (23. 10. 2026) */
      (m.beforeAsked && NF.isLowValue(m.before, m.beforeBound) ? lowNowCard(S) : '') + highNow(S, m) +
      '<div class="actions">' + btn('Další: co bylo k jídlu →', 'mealStep', '2', 'primary big', m.bolus && m.at != null && m.beforeAsked ? '' : ' disabled') + '</div>' +
      (m.bolus && m.at != null && m.beforeAsked ? '' : '<p class="small muted ta-c">' + (!m.bolus || m.at == null ? 'Vyberte inzulin a čas jídla.' : 'Klepněte na hodnotu ze senzoru, nebo na „nemám hodnotu“.') + '</p>');
    return out;
  }
  if (m.step === 1) {
    var nd = newDose(S, p, m.meal);
    /* doplňující otázka, která se po odpovědi objeví, se ohlásí čtečce (A15, 19. 10. 2026) */
    var said = m.bolus === 'as' ? 'Doplňující otázka: Kdy byl inzulin?' : m.bolus === 'other' ? 'Doplňující otázka: Kolik jednotek a kdy?' : m.bolus === 'unknown' ? 'Níže je pravidlo pro případ, že nevíte, jestli byl inzulin píchnutý.' : '';
    var lowNow = m.beforeAsked && NF.isLowValue(m.before, m.beforeBound);
    if (lowNow) said += (said ? ' ' : '') + (NF.hasInstruction(S, 'I-HYPO') ? 'Glukóza je teď pod 4: níže je pravidlo k nízké glukóze.' : 'Glukóza je teď pod 4.');
    if (m.beforeAsked && m.beforeBound === 'over') said += (said ? ' ' : '') + 'Glukóza je teď nad 15: níže je pravidlo k vysoké glukóze.';
    out += stepHead(S, m, 1) + head(S, 'Krok 1 ze 3 · ' + NF.mealLabel(m.meal), 'Je inzulin k tomuto jídlu už píchnutý?') + steps + '<p class="sr-only" role="status">' + e(said) + '</p>' +
      (m.cancelAsk ? hint('<b>Zahodit rozpracovaný zápis?</b><div class="actions mt-2">' + btn('Zahodit', 'mealCancel', null, 'danger sm') + btn('Pokračovat v zápisu', 'mealCancelKeep', null, 'sm') + '</div>', 'warn') : '') +
      card('<div class="insulin"><div class="ic" aria-hidden="true">' + NF.icon('syringe') + '</div><div><b>Lékař předepsal ' + e(NF.mealLabel(m.meal, 'ke')) + '</b>' + (nd ? '<small>nově, dřív ' + nd.was + ' j.</small>' : '') + '</div>' + V.dose(dose.units, nd ? 'new' : (m.bolus === 'as' ? 'done' : '')) + '</div>' + doseOrigin(S, m.meal) +
        /* odpovědi jako rovnocenné volby, plné až po vybrání (rozhodnutí vlastníka 19. 10. 2026; dřív očekávaná odpověď plná předem) */
        '<div class="choice-row col mt-3" role="group" aria-label="Je inzulin k tomuto jídlu už píchnutý?">' +
        choice(opt('Ano, ' + dose.units + ' j.', 'podle plánu'), 'mealBolus', 'as', m.bolus === 'as', 'opt') +
        choice(opt('Ano, jinak', 'jiné množství nebo čas'), 'mealBolus', 'other', m.bolus === 'other', 'opt') +
        choice(opt('Ještě ne', 'inzulin až před jídlem'), 'mealBolus', 'before', m.bolus === 'before', 'opt') +
        choice(opt('Nevím', 'pro jistotu počítáme, že už je'), 'mealBolus', 'unknown', m.bolus === 'unknown', 'opt') + '</div>' +
        (m.bolus === 'unknown' ? '<div class="mt-3"><p class="small mb-2"><b>Nevíte, jestli byl inzulin píchnutý?</b> Bereme to, jako by inzulin v těle byl.</p>' + (instructionText(S, 'I-NEVIM') ? instructionText(S, 'I-NEVIM') + rules(S, ['I-NEVIM']) /* štítek pravidla i v živém kroku 1 (integrace SCHEMA 73, B01) */ : ruleOff(S, 'I-NEVIM')) + '</div>' : '') +
        (m.bolus === 'other' ? '<div class="box mt-3"><b>Kolik jednotek?</b><div class="actions mt-2"><div class="stepper">' + btn(NF.icon('minus'), 'mealUnits', '-1', '', ' aria-label="méně"') + '<span class="val">' + m.units + ' j.<small>předepsáno ' + dose.units + '</small></span>' + btn(NF.icon('plus'), 'mealUnits', '1', '', ' aria-label="více"') + '</div></div><b class="field-q">Kdy?</b>' + timeChips(m) + '</div>' : '') +
        (m.bolus === 'as' ? '<div class="box mt-3"><b>Kdy byl inzulin?</b>' + timeChips(m) + tolNote(S) + '</div>' : '') +
        insulinAxis(S, m) +
        '<details class="more mt-1"><summary>Proč se ptáme</summary><p class="small muted">Radu k velikosti porce můžeme dát jen dřív, než je inzulin v těle. Když nevíte, bereme to, jako by už byl – je to bezpečnější.</p></details>') +
      prevAskBlock(S) + /* kontrola 4 (07 B1): blok k předchozímu jídlu před hodnotou teď, s časovou hlavičkou */
      glucoseCard(S, m) +
      (lowNow ? lowNowCard(S) : '') + highNow(S, m) +
      hypoWatchCard(S) + lowNoticeCard(S) +
      '<div class="actions">' + btn('Další: co budete jíst →', 'mealStep', '2', 'primary big', m.bolus && m.beforeAsked ? '' : ' disabled') + '</div>' +
      (m.bolus && m.beforeAsked ? '' : '<p class="small muted ta-c">' + (!m.bolus ? 'Odpovězte na otázku k inzulinu.' : 'Klepněte na hodnotu ze senzoru, nebo na „nemám hodnotu“.') + '</p>');
    return out;
  }
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
  /* krok 3 */
  var food = NF.foodById(S, m.foodId);
  if (!food) return stepHead(S, m, 3) + head(S, stepLabel(3), 'Vyberte jídlo') + steps + card('<p>Jídlo z rozpracovaného zápisu v seznamu není. Vraťte se o krok a vyberte ho znovu.</p>') + '<div class="actions">' + btn('← Vybrat jídlo', 'mealStep', '2', 'primary big') + '</div>'; /* robustnost #8: zápis zůstává */
  if (m.retro) {
    var ra = NF.adviseAfter(S, food.id, m.meal, NF.retroAt(S, m.at), m.portion, m.bolus), rc = ra.conf;
    out += stepHead(S, m, 3) + head(S, 'Krok 3 ze 3 · ' + NF.mealLabel(m.meal) + ' zpětně', 'Zápis a co pomůže teď') + steps +
      /* stejná bezpečnostní větev jako u živého zápisu (nález 2, 23. 10. 2026): menší porce s inzulinem v těle → pravidlo hned, procházka se nenabízí */
      (ra.lowNow ? lowNowCard(S) : '') +
      (ra.lowRisk && !ra.lowNow ? doctorCard(S, 'I-MENE', 'Méně jídla než obvykle', '', 'low') : '') + /* B18: zamítnuté pravidlo = oznámení na místě, žádný odkaz na pravidlo, které chybí */
      (ra.blocked || []).map(function (b) { return hint('<b>' + e(NF.LEVERS[b.lever].label) + ': teď neradíme.</b> ' + e(b.why), 'neutral'); }).join('') +
      card('<div class="media">' + foodIcon(S, food, rc) + '<div><div class="name name-lg">' + e(food.name) + '</div><div class="badges">' + foodBadges(rc) + '</div>' + (rc.reaction ? rules(S, ['R-SKORE'], 'mt-1') : '') + '<div class="learn">' + e(NF.mealLabel(m.meal, true)) + ' v ' + e(NF.fmtHour(Number(m.at))) + ' · ' + (m.portion === 'usual' ? 'obvyklá porce' : 'porce ' + e(NF.PORTIONS.filter(function (x) { return x[0] === m.portion; })[0][1].toLowerCase())) + ' · inzulin ' + e(m.bolus === 'as' ? dose.units + ' j.' : m.bolus === 'other' ? m.units + ' j.' : NF.INSULIN[m.bolus]) + '</div></div></div>' +
        (rc.level === 'known' ? '<div class="detail">' + peakBlock(S, food, rc) + '</div>' : '<p class="sum mt-3">' + (m.bolus === 'as' ? 'Zápis se přidá k učení.' : 'Zápis uložíme; do učení nejde (inzulin nebyl podle plánu).') + '</p>')) +
      (ra.items.length ? '<h2 class="section-h">Co pomůže teď <span class="small muted w-text">· jídlo už změnit nejde</span></h2>' + ra.items.map(function (it) {
        var d = (m.decisions || {})[it.lever];
        return '<div class="advice ' + (d === true ? 'taken' : d === false ? 'declined' : '') + '"><div class="lever">' + e(it.label) + '</div><div class="text">' + e(it.text) + '</div><div class="cert">' + e(it.certainty) + '</div>' +
          '<div class="choice-row" role="group" aria-label="' + e(it.label) + '">' + choice(NF.icon('check') + ' Zkusím to', 'mealDecide', it.lever + ':yes', d === true, 'yes') + choice('Tentokrát ne', 'mealDecide', it.lever + ':no', d === false) + '</div><div class="mt-2">' + appr(S, it.item) + '</div></div>';
      }).join('') : '') +
      (NF.usable(S, 'R-REAKCE') ? '' : off(S, 'R-REAKCE')) + offLevers(S) +
      (ra.late ? hint('<b>Od jídla uplynulo víc než ' + NF.plural(ra.window, 'minuta', 'minuty', 'minut') + '.</b> Procházka teď vzestup po tomto jídle nezmění, proto ji nenabízíme. Zápis se i tak počítá.', 'neutral') : '') + /* A06: okno R-PROCHAZKA.okno_min */
      (m.bolus === 'none' || m.bolus === 'unknown' ? hint('<b>Inzulin k tomuto jídlu ' + (m.bolus === 'none' ? 'nebyl podán' : 'není potvrzený') + '.</b> Zápis uložíme, ale do učení ho nezapočítáme. Při nejistotě, co dělat: ' + btn(NF.icon('shield') + ' Bezpečí', 'safetyOpen', null, 'sm'), 'warn') : '') +
      '<div class="choice-row inset mt-2 mb-2">' + choice('Neobvyklý den (' + NF.UNUSUAL + ')', 'mealUnusual', 'toggle', !!m.unusual, 'sm') + '</div>' + (m.unusual ? '<p class="small muted inset mb-2">Zápis uložíme, ale do učení ho nezapočítáme.</p>' : '') +
      '<div class="actions">' + btn('Uložit ' + NF.mealLabel(m.meal, 'acc'), 'mealFinish', m.bolus, 'primary big') + '</div>';
    return out;
  }
  var res = NF.advise(S, food.id, m.portion, m.bolus, m.meal);
  var conf = res.conf;
  out += stepHead(S, m, 3) + head(S, stepLabel(3), snack ? 'Zápis svačiny' : 'Rada a zápis') + steps;
  out += card('<div class="media">' + foodIcon(S, food, conf) + '<div><div class="name name-lg">' + e(food.name) + '</div><div class="badges">' + foodBadges(conf) + '</div>' +
    (conf.reaction ? rules(S, ['R-SKORE'], 'mt-1') : '') + '<div class="learn">' + (conf.level === 'known' ? 'Známe ho · ' + NF.plural(conf.st.n, 'zápis', 'zápisy', 'zápisů') : conf.level === 'similar' ? 'Zatím ho neznáme – podobné jídlo bývalo ' + (conf.pool && conf.pool.dir === 'in' ? 'spíš v cíli' : 'spíš nad cílem') : conf.level === 'unstable' ? 'Zápisy se liší, jídlo zatím neznáme' : conf.level === 'learning' && conf.impression === 'mixed' ? 'Zápisy se liší; bude známé, až se shodnou' : 'Zatím nic neodhadujeme – zapište ho ' + (conf.min || 4) + '×') + '</div></div></div>' +
    (snack || conf.level === 'unknown' ? '' : conf.level === 'none' ? '<p class="sum mt-3">' + e(conf.why) + '</p>' : routineScale(S, food, conf, res, m))); /* svačina bez stupnice (kontrola 4, 07 C3) */
  /* Bezpečnostní větev nezávisí na bráně rad (kontrola 2, A2, 29. 10. 2026): pravidlo k nízké glukóze, pravidlo „Méně jídla než obvykle“ a věta o nemoci
     se ukážou i se zamítnutou R-REAKCE a před převzetím plánu; brána zastaví jen rady. */
  if (res.lowNow) out += lowNowCard(S);
  /* pravidlo hned: inzulin už v těle (i „nevím“), nebo porce menší a rada „obvyklá porce“ odmítnuta před píchnutím (nález 3, 23. 10. 2026) */
  else if (m.portion === 'smaller' && !snack && (NF.insulinInBody(m.bolus) || (m.bolus === 'before' && (m.decisions || {}).portion === false))) out += doctorCard(S, 'I-MENE', 'Méně jídla než obvykle', m.bolus === 'before' ? '<p class="small mt-3 mb-0">Až si píchnete, platí toto pravidlo.</p>' : '');
  if (res.illness && !res.lowNow) out += hint('<b>' + e(NF.ILL_TEXT) + '</b>' + rules(S, ['P-NEMOC'])); /* jedna věta při nemoci (A19) */
  if (!res.gate.ok) out += res.gate.low ? '' : NF.usable(S, 'R-REAKCE') ? hint('<b>Teď neradíme.</b> ' + e(res.gate.why), 'neutral') : off(S, 'R-REAKCE');
  else {
    res.blocked.forEach(function (b) { if (b.reason === 'illness' && res.illness) return; /* C5: při nemoci jedna věta (výše), ne u každé rady */ out += b.reason === 'item' ? off(S, NF.LEVERS[b.lever].item) : hint('<b>' + e(NF.LEVERS[b.lever].label) + ': teď neradíme.</b> ' + e(b.why), 'neutral'); });
    res.gone.forEach(function (g) { out += hint(e(g.text) + ' ' + appr(S, 'R-ZMIZELA')); });
    if (res.items.length) {
      out += '<h2 class="section-h">Co můžete zkusit <span class="small muted w-text">(odpovědět nemusíte)</span></h2>' + res.items.map(function (it) {
        var d = (m.decisions || {})[it.lever], reason = (m.reasons || {})[it.lever];
        if (m.compact && m.compact[it.lever]) return '<div class="advice compact ' + (d === true ? 'taken' : 'declined') + '"><div class="lever">' + e(it.label) + '</div><div class="text">Jako minule: <b>' + (d === true ? 'zkusím to' : 'tentokrát ne') + '</b> ' + btn('Změnit', 'mealExpand', it.lever, 'sm quiet') + '</div><div class="mt-2">' + appr(S, it.item) + '</div></div>'; /* rutina po 3 odpovědích (18. 10. 2026) */
        return '<div class="advice ' + (d === true ? 'taken' : d === false ? 'declined' : '') + '"><div class="lever">' + e(it.label) + (it.carbs ? tag('mění množství jídla', 'warn') : '') + '</div>' +
          (it.lever === 'portion' ? plateMove(m.portion) : leverAnim(it.lever, food, S)) + '<div class="text">' + e(it.text) + '</div><div class="cert">' + e(it.certainty) + '</div>' +
          '<div class="choice-row" role="group" aria-label="' + e(it.label) + '">' + choice(NF.icon('check') + ' Zkusím to', 'mealDecide', it.lever + ':yes', d === true, 'yes') + choice('Tentokrát ne', 'mealDecide', it.lever + ':no', d === false) + '</div>' +
          (d === false ? '<div class="choice-row reasons" role="group" aria-label="' + e('Proč ne: ' + it.label) + '">' + NF.reasonsFor(it.lever).map(function (r) { return choice(r[1], 'mealReason', it.lever + ':' + r[0], reason === r[0]); }).join('') + '</div>' : '') +
          '<div class="mt-2">' + appr(S, it.item) + '</div></div>';
      }).join('');
    } else if (conf.level === 'known' && !res.blocked.length && conf.reaction && conf.reaction.key === 'mild') out += card('<p>K tomuto jídlu radu nepotřebujete – zůstáváte po něm v cíli. Stačí ho zapsat.</p>'); /* kontrola 2: jen když stupeň opravdu říká „většinou v cíli“ – se zamítnutou R-SKORE by věta tvrdila něco, co aplikace nehodnotí */
  }
  if (res.gate.ok) out += offLevers(S);
  if (!snack && res.gate.ok && res.items.length) out += '<details class="more card why-card"><summary>Proč tohle radíme</summary><div class="small muted pt-2">' +
    '<p><b>Odkud to víme:</b> jen z vašich vlastních zápisů a dat ze senzoru. Počítáme jen zápisy s potvrzeným inzulinem a daty ze senzoru. Nepočítáme zápis z doby nemoci, s jinou než obvyklou porcí nebo s jinou dávkou.</p>' +
    '<p><b>Proč se ptáme na inzulin:</b> dávka je jako klíč vyrobený na obvyklou porci. Dokud inzulin není v těle, můžete porci ještě upravit. Po píchnutí inzulin působí 3–5 hodin, ať sníte cokoli. Proto pak poradíme jen návrat z větší porce k obvyklé.</p>' +
    '<p><b>Co nikdy neděláme:</b> nepočítáme ani neměníme dávku inzulinu.</p></div></details>';
  if (m.bolus === 'before') {
    out += card('<h2>Až si píchnete ' + dose.units + ' j., potvrďte to</h2><p class="small muted">Když si píchnete až u stolu, uložte jídlo teď a inzulin potvrďte na Dnes.</p>' +
      '<p class="small mt-3 mb-0"><b>Klepněte, až budete mít inzulin píchnutý.</b></p>' + /* věta přímo nad tlačítkem (kontrola 4, 07 C1) */
      '<div class="actions col mt-2">' + btn('Píchnuto · uložit ' + NF.mealLabel(m.meal, 'acc'), 'mealFinish', 'as', 'primary big') + '<div class="actions col">' + btn('Uložit, píchnu za chvíli', 'mealFinish', 'pending', '') + btn('Píchnuto jinak', 'mealFinishOther', null, '', m.finishOther ? ' aria-pressed="true"' : '') + '</div></div>' +
      (m.finishOther ? '<div class="actions"><div class="stepper">' + btn(NF.icon('minus'), 'mealUnits', '-1') + '<span class="val">' + m.units + ' j.</span>' + btn(NF.icon('plus'), 'mealUnits', '1') + '</div>' + btn('Uložit', 'mealFinish', 'other', 'primary') + btn('Nepíchnuto', 'mealFinish', 'none', 'quiet') + '</div>' : '') +
      '<p class="small muted mt-2 mb-0">Do ' + NF.param(S, 'D-CISTA', 'oprava_min', 60) + ' minut od potvrzení ho můžete opravit na Dnes.</p>');
  } else out += '<div class="actions">' + btn(snack ? 'Uložit svačinu' : 'Uložit jídlo', 'mealFinish', m.bolus, 'primary big') + '</div>';
  return out;
};

/* Kontrola 4 (07 B5): u známého jídla, kde jsou všechny rady rutinní (sbalené „jako minule“), je i stupnice jeden řádek s rozbalením. */
function routineScale(S, food, conf, res, m) {
  var html = '<div class="detail">' + peakBlock(S, food, conf) + '</div>';
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
  else if (c.level === 'known') sum = 'Zapsáno ' + st.eaten + '×, v cíli ' + st.inTarget + ' ' + NF.z(st.n) + ' ' + st.n + ' započítaných.' + (c.reaction.settled ? '' : ' S dalšími zápisy se to může změnit.'); /* reakci nese štítek (slovo + ikona), věta nese čísla (řemeslo 9) */
  else if (c.level === 'similar') sum = 'Zapsáno ' + st.eaten + '×, ještě ' + NF.plural(c.min - st.n, 'zápis', 'zápisy', 'zápisů') + ' a budeme ho znát. Podobá se jídlu, po kterém ' + (c.pool && c.pool.dir === 'in' ? 'spíš zůstáváte v cíli' : 'býváte spíš nad cílem') + '.'; /* jen směr (A15) */
  else if (c.level === 'unstable') sum = 'Zapsáno ' + st.eaten + '×, zápisy se ani po ' + NF.plural(st.n, 'zápisu', 'zápisech', 'zápisech') + ' neshodly. Lékař to uvidí v podkladech. Zkuste jídlo dělat pokaždé stejně, nebo ho rozdělte na dvě.';
  else sum = 'Zapsáno ' + st.eaten + '×. Zatím nic neodhadujeme; po ' + (c.min || 4) + ' zápisech se všemi údaji budeme vědět víc.';
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
  var p = NF.activePlan(S); if (!p) return head(S, 'Plán', 'Plán vám zatím lékař nevydal');
  var older = S.plans.filter(function (x) { return x.id !== p.id; });
  var ms = (S.fb && S.fb.milestones) || [];
  return head(S, 'Můj plán od ' + NF.fmtShort(p.issuedAt), 'Dávky a návyky') +
    pathCard(S, true) +
    (ms.length ? card('<details class="more"><summary>Vaše milníky (' + ms.length + ')</summary><ul class="plain small">' + ms.slice().reverse().map(function (m) { return '<li>' + e(NF.fmtShort(m.at)) + ' · ' + m.text + '</li>'; }).join('') + '</ul></details>') : '') +
    card('<h2>Kdy a kolik inzulinu</h2>' + dosesTable(p) + '<p class="small muted">Určil lékař ' + e(NF.fmtShort(p.issuedAt)) + '. Dávky nepočítáme ani neměníme – jen je připomínáme a ptáme se, jestli byl inzulin.</p>') +
    card('<h2>Návyky</h2><ul class="plain">' + NF.activeHabits(S).map(function (h) { return '<li><b>' + e(h.title) + '</b><br><span class="small muted">' + e(h.why) + '</span></li>'; }).join('') + '</ul>' + (NF.item(S, 'R-NAVYKY') && !NF.usable(S, 'R-NAVYKY') ? off(S, 'R-NAVYKY') : '')) +
    card('<h2>Rady, které vám nabízíme</h2><p class="small muted">Nabízíme je před jídlem podle toho, jak na jídlo reagujete. Odpovídat nemusíte.</p>' + adviceList(S, p)) +
    remindersCard(S) +
    card('<h2>Cíle glukózy</h2>' + (NF.usable(S, 'C-CILE') ? '' : off(S, 'C-CILE')) + kv('V cíli', '4–' + e(NF.mmol1(p.targets.high)) + ' mmol/l') + '<p class="small muted mt-1 mb-2">Pod 4 mmol/l je nízká glukóza.</p>' + /* pacient vidí všude hranici 4 z čipů a pravidel (kontrola 4, B10); lékař dolní cíl 3,9 */ kv('Ráno nalačno do', e(NF.mmol1(p.targets.fastingHigh)) + ' mmol/l') + kv('Platnost plánu do', e(NF.fmtShort(p.validUntil))) + '<div class="small mt-2">' + appr(S, 'C-CILE') + '</div>') +
    (older.length ? card('<details class="more"><summary>Starší plány (' + older.length + ')</summary><ul class="plain small">' + older.map(function (x) { return '<li><b>' + e(x.id) + '</b> · ' + e(NF.fmtShort(x.issuedAt)) + ' – ' + e(NF.fmtShort(x.validUntil)) + '<br><span class="muted">Zápisy z té doby zůstávají u něj.</span></li>'; }).join('') + '</ul></details>') : '');
};
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
    card('<h2>Bezpečnostní pravidla</h2>' + instructionsList(S, p, false, SAFETY_ORDER) + (NF.instructions(S).length ? '<p class="small muted mt-2">Pravidla jsou stejná pro všechny pacienty NutriFee. Tato pravidla připravil NutriFee a posoudil je lékař. Nic k nim nepřidáváme.</p>' : '')) /* rozhodnutí vlastníka 30. 10. 2026 (bod 10) */ +
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
  var known = S.foods.filter(function (f) { return NF.confidence(S, f.id).level === 'known'; });
  /* Kontrola 4 (C12, 06 B8): bez slova „pomohl“; věcně „s radou X z N v cíli“ a srovnání „bez rady“ jen od 4 zápisů s radou i bez ní (S-VYSLEDEK min_n, 15 odst. 7b.1). */
  var minN4 = NF.param(S, 'S-VYSLEDEK', 'min_n', 4);
  var best = null; known.forEach(function (f) { NF.leverStats(S, f.id).forEach(function (x) { if (x.st.n >= minN4 && x.st.inTarget / x.st.n >= 0.5 && (!best || x.st.inTarget / x.st.n > best.share)) best = { food: f, lever: x.lever, st: x.st, share: x.st.inTarget / x.st.n, base: NF.baseStats(S, f.id) }; }); });
  var pi = NF.periodInfo(S, p, S.clock, true), sem = NF.semafor(S); /* počet dní a zápisů stejným výpočtem jako report lékaře (A30) */
  var praise = 'Zapsáno <strong>' + NF.periodEntriesText(pi) + '</strong>, z toho ' + NF.plural(s.usual, 'jídlo', 'jídla', 'jídel') + ' v obvyklé porci. Inzulin podle plánu u ' + s.asPlan + ' ' + NF.z(s.meals) + ' ' + s.meals + ' jídel.' + /* přímé počty, ne zpětně z procenta; jedno poděkování (21. 10. 2026) */
    (best ? ' U jídla „' + e(best.food.name) + '“ bylo s radou „' + e(NF.LEVERS[best.lever].label.toLowerCase()) + '“ ' + best.st.inTarget + ' ' + NF.z(best.st.n) + ' ' + best.st.n + ' zápisů v cíli' + (best.base && best.base.n >= minN4 ? ', bez ní ' + best.base.inTarget + ' ' + NF.z(best.base.n) + ' ' + best.base.n : '') + '.' : '');
  var qs = [], lows = NF.lowEvents(S).filter(function (x) { return !p.effectiveFrom || x.at >= p.effectiveFrom; });
  /* B8 (nezávislá kontrola 27. 10. 2026): poklesy, které aplikace slíbila ukázat lékaři, jsou první navržená otázka */
  if (lows.length) {
    /* noční poklesy zapsané u snídaně (bod 7, 1. 11. 2026) se v otázce jmenují zvlášť – nejsou „po jídle“ */
    var lMeal = lows.filter(function (x) { return !x.night; }), lNight = lows.length - lMeal.length;
    var lm = lMeal.length && lMeal.every(function (x) { return x.meal === lMeal[0].meal; }) ? (NF.MEAL_PO[lMeal[0].meal] || 'po jídle') : 'po jídle';
    qs.push('Glukóza mi ' + lows.length + '× klesla pod 4' + (lNight && lMeal.length ? ' (' + lMeal.length + '× ' + lm + ', ' + lNight + '× v noci)' : lNight ? ' v noci' : ' ' + lm) + '. Mám něco dělat jinak?');
  }
  if (best) qs.push('Mám u jídla „' + best.food.name + '“ dál zkoušet radu „' + NF.LEVERS[best.lever].label.toLowerCase() + '“?');
  if (adv.topReason === 'nothome') qs.push('Rady, které nemám doma, často nepřijmu – dá se to nastavit jinak?');
  if (s.other + s.none > 0) qs.push('Inzulin byl někdy jinak než podle plánu (' + (s.other + s.none) + '×). Je to problém?');
  if (s.illDays) qs.push('Nemoc trvala ' + NF.plural(s.illDays, 'den', 'dny', 'dní') + '. Mám v takové době něco dělat jinak?');
  qs.push('Jsou moje cíle glukózy pořád správné?');
  qs = qs.slice(0, 3); /* 15, odst. 11: tři navržené otázky */
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
  return head(S, 'Nový plán · ' + p.id, 'Co se změnilo') +
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
