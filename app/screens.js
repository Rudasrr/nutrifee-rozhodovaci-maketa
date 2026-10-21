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
/* Štítek položky registru u místa, kde působí: ◌ ke schválení · ✓ schváleno · ✎ s úpravou · ✕ zamítnuto. Klepnutí otevře vysvětlení.
   U zamítnuté položky následuje oznámení „tahle část nefunguje“ (prezentační vrstva přes NF.slots.offNotice; produkce bez ní nic nepřidá). */
var APPR = { pending: ['pend', 'circle-dashed', 'ke schválení', 'Pravidlo ke schválení: '], approved: ['', 'check', '', 'Schválené pravidlo: '], edited: ['edit', 'pencil', 'upraveno', 'Schválené pravidlo s úpravou: '], rejected: ['rej', 'x', 'zamítnuto', 'Zamítnuté pravidlo: '] };
function appr(S, id) {
  var r = NF.item(S, id);
  if (!r || r.scope === 'provozni') return ''; /* provozní položky schvaluje vlastník; pacient ani garant štítek nevidí (18. 10. 2026) */
  var st = NF.itemState(S, id), m = APPR[st] || APPR.pending;
  return '<button type="button" class="appr ' + m[0] + '" data-action="openItem" data-value="' + e(id) + '" title="' + e((m[2] || 'schváleno') + ' · ' + r.title) + '" aria-label="' + m[3] + e(r.title) + '"><span aria-hidden="true">' + NF.icon(m[1]) + '</span> ' + e(r.title) + (m[2] ? '\u00a0<span class="st">· ' + m[2].replace(' ', '\u00a0') + '</span>' : '') + '</button>' + (st === 'rejected' ? off(S, id) : '');
}
function off(S, id) { return NF.slots.offNotice ? NF.slots.offNotice(S, id) : ''; }
/* Zamítnuté páky rad (a pravidlo mizení): oznámení tam, kde by rada byla. */
function offLevers(S) {
  return Object.keys(NF.LEVERS).filter(function (l) { return l !== 'portion' && !NF.usable(S, NF.LEVERS[l].item); }).map(function (l) { return off(S, NF.LEVERS[l].item); }).join('') + (NF.usable(S, 'R-ZMIZELA') ? '' : off(S, 'R-ZMIZELA'));
}
V.btn = btn; V.choice = choice; V.hint = hint; V.kv = kv; V.tag = tag; V.card = card; V.appr = appr; V.off = off; V.offLevers = offLevers;

var LEVEL = { known: ['Známé jídlo', 'known'], similar: ['Podobné jídlo', 'similar'], learning: ['Učíme se', 'similar'], unstable: ['Nestálé jídlo', 'unknown'], unknown: ['Neznámé jídlo', 'unknown'], none: ['Bez vyhodnocení', 'unknown'] };
function levelTag(level, conf) { var l = LEVEL[level] || LEVEL.unknown; return tag(level === 'learning' && conf ? 'Učíme se · ' + conf.st.n + ' ' + NF.z(conf.min || 4) + ' ' + (conf.min || 4) : l[0], l[1]); }
function reactionTag(r) { return r ? tag(r.label, r.cls) : ''; }
/* Jeden nosič faktu (řemeslo 9, 19. 10. 2026): známé jídlo s reakcí má jen štítek reakce (slovo + ikona); „známé“ říká fajfka na prstenci. */
function foodBadges(conf) { return conf.level === 'known' && conf.reaction ? reactionTag(conf.reaction) : levelTag(conf.level, conf); }
V.foodBadges = foodBadges;
/* Řádek výsledku hledání (21. 10. 2026, vlastník): druhý řádek jen když nese informaci; „neznámé“ je výchozí stav a nepíše se. */
function foodOptLine(c) {
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
function rowTrack(label, lo, hi, cls, wide, goalV) {
  if (lo == null || hi == null) return '';
  var l = pos(lo), r = pos(hi);
  return '<div class="row ' + (cls || '') + '"><span class="rl">' + e(label) + '</span><div class="track' + (wide ? ' wide' : '') + '" style="--goal:' + pos(goalV != null ? goalV : 10) + '%">' +
    '<div class="dim" style="--from:0%;--to:' + l + '%"></div><div class="dim" style="--from:' + r + '%;--to:100%"></div>' +
    '<div class="win" style="--from:' + l + '%;--to:' + (l + Math.max(2, r - l)) + '%"><b class="rng">' + (lo === hi ? e(NF.mmol(lo)) : e(NF.mmol(lo)) + '–' + e(NF.mmol(hi))) + '</b></div></div></div>'; /* rozmezí jednou nad oknem, nikdy přes hranici cíle (21. 10. 2026) */
}
var LEVER_WITH = { addon: 's doplňkem', order: 's pořadím', walk: 's procházkou' };
function peakBlock(S, food, conf) {
  var t = NF.targets(S), st = conf.st;
  var rows = '', note = '', inT = '';
  if (conf.level === 'known') {
    var base = NF.baseStats(S, food.id, conf.meal);
    var best = NF.leverStats(S, food.id, conf.meal)[0];
    var aLo = base.n ? base.lo : st.lo, aHi = base.n ? base.hi : st.hi;
    rows += rowTrack(best ? 'bez rady' : 'obvykle', aLo, aHi, '', false, t.high);
    if (best) rows += rowTrack(LEVER_WITH[best.lever] || 's radou', best.st.lo, best.st.hi, 'adv' + (best.st.n && best.st.inTarget / best.st.n >= 0.5 ? ' ok' : ''), false, t.high); /* zeleně jen když s radou bývá v cíli */
    var half = st.peaks.slice(0, Math.ceil(st.peaks.length / 2));
    var prev = st.peaks.length > 6 ? { lo: NF.r1(NF.quantile(half, 0.1)), hi: NF.r1(NF.quantile(half, 0.9)) } : null;
    note = 'Vlevo od čáry jste v cíli. ' + (best ? 'S ' + LEVER_WITH[best.lever].slice(2) + ' skončíte <b>' + best.st.inTarget + ' ' + NF.z(best.st.n) + ' ' + best.st.n + '</b> v cíli. ' : '') +
      'Rozmezí je ' + NF.z(st.n) + ' ' + NF.plural(st.n, 'zápisu', 'zápisů', 'zápisů') + (st.quantile ? ' bez krajních hodnot' : ' a s dalšími se upřesní') + (prev && st.quantile && (prev.lo !== st.lo || prev.hi !== st.hi) ? '; po prvních ' + half.length + ' bylo ' + e(NF.mmol(prev.lo)) + '–' + e(NF.mmol(prev.hi)) + '.' : '.'); /* počet „X ze N v cíli“ je v souhrnu jídla, tady se neopakuje (21. 10. 2026) */
  } else if (conf.level === 'similar') {
    rows += rowTrack('podobná', conf.pool.lo, conf.pool.hi, '', true, t.high); /* štítek úrovně „Podobné jídlo“ je nahoře, pilulka se neopakuje */
    note = 'Tohle jídlo u vás ještě neznáme. Rozmezí je ' + (conf.pool.explicit ? 'z jídla, které jste označili za podobné (' : 'z ' + conf.pool.n + ' zápisů jídel se stejným zdrojem sacharidů, úpravou a formou (') + e(conf.like.map(function (f) { return f.name; }).slice(0, 2).join(', ')) + '). Je to jen hrubý odhad; s vašimi vlastními zápisy se upřesní.';
  } else if (conf.level === 'learning') {
    var imp = conf.impression, stageWord = st.n === 1 ? 'první dojem' : imp === 'mixed' ? 'zápisy se liší' : 'zatím to vypadá';
    inT = tag(stageWord, imp === 'in' ? 'ok' : imp === 'over' ? 'over' : '').replace('class="tag ', 'class="in tag ');
    rows += rowTrack(st.n === 1 ? 'tentokrát' : 'zatím', st.lo, st.hi, '', st.n === 1, t.high);
    if (conf.pool) rows += rowTrack('podobná', conf.pool.lo, conf.pool.hi, '', true, t.high);
    var need = Math.max(1, (conf.min || 4) - st.n), needTxt = NF.plural(need, 'zápisu', 'zápisech', 'zápisech');
    note = st.n === 1 ? ('První zápis: tentokrát ' + (imp === 'in' ? 'v cíli' : 'nad cílem') + '. Jeden zápis nestačí, po dalších ' + needTxt + ' budeme vědět víc.')
      : imp === 'mixed' ? 'Zápisy se liší (jednou v cíli, jednou nad ním). Po dalších ' + needTxt + ' budeme vědět, jak to je.'
      : imp === 'in' ? 'Zatím to vypadá, že po něm zůstáváte v cíli. Po dalších ' + needTxt + ' ho budeme znát.'
      : 'Zatím ' + NF.plural(st.n, 'zápis', 'zápisy', 'zápisů') + ' nad cílem. Po dalších ' + needTxt + ' budeme vědět jistě. Držte obvyklou porci.'; /* fakt a pokyn, ne „šance“ pro jídlo (hlas, 19. 10. 2026) */
  } else return '';
  var alt = conf.level === 'known' ? 'Stupnice glukózy 4 až 16 mmol/l, hranice cíle ' + NF.mmol(t.high) + ' mmol/l. Bez rady ' + NF.mmol(aLo) + ' až ' + NF.mmol(aHi) + ' mmol/l' + (best && best.st.lo != null ? ', ' + (LEVER_WITH[best.lever] || 's radou') + ' ' + NF.mmol(best.st.lo) + ' až ' + NF.mmol(best.st.hi) + ' mmol/l' : '') + '.'
    : conf.level === 'learning' ? 'Stupnice glukózy 4 až 16 mmol/l, hranice cíle ' + NF.mmol(t.high) + ' mmol/l. Zatím ' + st.n + ' z ' + (conf.min || 4) + ' zápisů: ' + NF.mmol(st.lo) + ' až ' + NF.mmol(st.hi) + ' mmol/l.'
    : 'Stupnice glukózy 4 až 16 mmol/l, hranice cíle ' + NF.mmol(t.high) + ' mmol/l. Odhad z podobných jídel ' + NF.mmol(conf.pool.lo) + ' až ' + NF.mmol(conf.pool.hi) + ' mmol/l.';
  return '<div class="peak"><div class="lbl"><span>Kam se po něm glukóza dostane</span>' + (inT || '') + '</div>' +
    '<div class="rows" role="img" aria-label="' + e(alt) + '"><div class="goal" style="--f:' + (pos(t.high) / 100) + '"><span>hranice cíle ' + e(NF.mmol(t.high)) + ' mmol/l</span></div>' + rows + '</div>' +
    '<div class="axis" aria-hidden="true">' + [4, 7, 10, 13, 16].map(function (v) { return '<span style="--f:' + (pos(v) / 100) + '">' + v + '</span>'; }).join('') + '</div>' +
    '<div class="axis-words"><span>v cíli</span><span>nad cílem</span></div>' +
    '<div class="note">' + note + '</div></div>';
}
V.peakBlock = peakBlock;

/* ---------- navigace ---------- */
function tabbar(S) {
  var items = [['today', 'Dnes', 'home'], ['foods', 'Jídla', 'utensils'], ['plan', 'Plán', 'list'], ['safety', 'Bezpečí', 'shield']];
  return '<nav class="tabbar" aria-label="Hlavní nabídka">' + items.map(function (it) {
    var on = S.page === it[0] || (S.page === 'food' && it[0] === 'foods') || ((S.page === 'preview' || S.page === 'import') && it[0] === 'plan'); /* detail jídla patří pod Jídla, report a nahrání exportu pod Plán */
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
    case 'preview': body = V.preview(S); break;
    case 'import': body = V.importPage(S); break;
    case 'newplan': body = V.newPlan(S); break;
    default: body = V.today(S);
  }
  var nav = ['understand', 'takeover', 'meal', 'newplan'].indexOf(page) === -1;
  /* štítek DEMO na každé pacientské obrazovce, ne jen na Dnes: snímek kroku ani Bezpečí nevypadá jako skutečný pacient (LF-25, 19. 10. 2026) */
  return '<div class="patient-shell"><div class="patient page-' + page + '"><p class="demo-band"><span class="demo-flag">DEMO · syntetická data · není určeno pro léčbu</span></p>' + body + '</div>' + (nav ? tabbar(S) : '') + '</div>';
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
function notsCard(S) {
  var items = [['sigma', 'nepočítáme sacharidy'], ['syringe', 'neměníme dávku inzulinu'], ['eye', 'nikdo nečte zápisy mezi kontrolami']];
  var body = '<div class="nots">' + items.map(function (it, i) {
    return '<div class="not"><span class="pic"><span class="pi">' + NF.icon(it[0]) + '</span><svg class="strike-svg" viewBox="0 0 40 40" aria-hidden="true"><path class="strike s' + (i + 1) + '" d="M6 34L34 6"/></svg></span><small>' + e(it[1]) + '</small></div>';
  }).join('') + '</div>';
  return card('<h2>Co neděláme</h2>' + animWrap('nots', body, 'Na nízkou či vysokou glukózu vás upozorňuje aplikace vašeho senzoru. S potížemi teď pomůže Bezpečí.'));
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
    '</svg><p class="fig-cap">Uprostřed je pásmo, kdy se zápis počítá do učení.</p></div>' /* popisek jako text, na telefonu čitelný (21. 10. 2026) */;
}
/* Mikroanimace rad: pořadí jídla · doplněk · procházka · porce.
   Jeden rámeček pro všechny obrázky rad (řemeslo 7, 19. 10. 2026): viewBox 300 × 100, hlavní talíř r 36, druhý r 22, stejný tah;
   čísla a popisky nikdy pod ručičkou ani přes obrázek, pořadí se čte zleva. */
function figPlate(cx, r, foodR, cls) { return scenePlate(cx, 50, r, foodR, cls); }
function leverFig(lever, svg, cap) {
  return '<div class="lever-anim lever-fig play" data-anim="' + lever + '" data-lever="' + lever + '"><svg viewBox="0 0 300 100" aria-hidden="true">' + svg + '</svg>' + (cap ? '<p class="fig-cap">' + cap + '</p>' : '') + '</div>'; /* bez „Přehrát znovu“ u mikroanimací (19. 10. 2026) */
}
function leverAnim(lever, food) {
  if (lever === 'order') {
    var first = food && food.first ? String(food.first) : '';
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
  return '<div class="stephead">' + back + '</div>' + head(S, 'Převzetí plánu ' + p.id + ' · ' + n + ' ze 6', TAKEOVER[n - 1]) +
    '<div class="msteps" aria-hidden="true">' + [1, 2, 3, 4, 5, 6].map(function (i) { return '<span class="' + (i <= n ? 'on' : '') + '"></span>'; }).join('') + '</div>';
}
function takeoverNext(n, label, disabled, why) {
  return '<div class="actions">' + btn(label || 'Další →', 'takeoverPage', String(n + 1), 'primary big', disabled ? ' disabled' : '') + '</div>' + (disabled && why ? '<p class="small muted ta-c">' + why + '</p>' : '');
}
V.takeover = function (S) {
  var p = NF.activePlan(S);
  if (!p) return head(S, 'V ordinaci', 'Plán zatím nemáte') + card('<p>Lékař s vámi právě prochází zařazení. Až vám plán vydá, uvidíte ho tady.</p>');
  var n = Math.max(1, Math.min(6, (S.onboarding && S.onboarding.page) || 1));
  if (n === 6) return V.understand(S);
  var habits = S.habits.filter(function (h) { return h.planId === p.id; }), rb = S.onboarding.readback;
  var out = takeoverHead(S, p, n);
  if (n === 1) {
    var T = NF.texts(S, 'S-CESTA');
    out += card('<p class="lead">' + (T && T.goal ? T.goal : 'Aby aplikace poznala vaše běžná jídla a vy jste věděli, co vám u nich pomáhá.') + '</p>', 'tint') +
      '<p class="small muted inset">Projdeme spolu pět krátkých stránek a jednu otázku. Trvá to pár minut.</p>' + takeoverNext(1, 'Začít →');
  } else if (n === 2) {
    out += card(dosesTable(p) + '<p class="small muted mt-3 mb-0">Určil je lékař. My je jen připomínáme a ptáme se, jestli byl inzulin podaný. Nikdy je nepočítáme ani neměníme.</p>') +
      card('<h2>Souhlasí s tím, co vám řekl lékař?</h2><div class="choice-row col" role="group" aria-label="Souhlasí dávky s tím, co vám řekl lékař?">' +
        choice(opt('Ano, souhlasí'), 'doseReadback', 'yes', rb === 'yes', 'opt') + choice(opt('Ne, něco nesedí'), 'doseReadback', 'no', rb === 'no', 'opt') + '</div>' +
        (rb === 'no' ? hint('<b>Ukažte telefon sestře.</b> Plán zatím nepřebírejte; sestra dávky ověří s lékařem.', 'over') : '')) + /* zpětné přečtení: jediná nezávislá kontrola zadání dávky (rozhodnutí vlastníka 19. 10. 2026) */
      takeoverNext(2, null, rb !== 'yes', rb === 'no' ? 'Pokračovat půjde, až sestra dávky ověří.' : 'Nejdřív odpovězte, jestli dávky souhlasí.');
  } else if (n === 3) {
    out += card('<ul class="plain">' + habits.map(function (h) { return '<li><b>' + e(h.title) + '</b><br><span class="small muted">' + e(h.why) + '</span></li>'; }).join('') + '</ul>') + takeoverNext(3);
  } else if (n === 4) {
    out += explainerKey(S, true) + takeoverNext(4);
  } else if (n === 5) {
    out += notsCard(S) + card('<h2>Osobní pokyny od lékaře</h2>' + instructionsList(S, p, true) + '<p class="small muted mt-2 mb-0">Celé znění najdete kdykoli v části Bezpečí.</p>') +
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
      (a === 'no' ? hint('<b>Přesně tak.</b> Zápisy slouží vám a rozhovoru na kontrole. S potížemi vám teď pomůže Bezpečí, s telefonem technická podpora.', 'ok') : '')) +
    '<div class="actions">' + btn('Plán přebírám', 'confirmUnderstanding', null, 'primary big', a === 'no' && trained ? '' : ' disabled') + '</div>' +
    (a !== 'no' ? '<p class="small muted ta-c">Plán převezmete po správné odpovědi.</p>' : !trained ? hint('<b>Zaučení u sestry nebylo dokončeno.</b> Návyky zatím nezačnou platit. Domluvte se se sestrou na novém zaučení.', 'over') : '');
};

/* Token dávky (Podpis A, rozhodnutí vlastníka 20. 10. 2026): pilulka s ikonou klíče, číslem a „j.“ všude, kde pacient dávku vidí.
   Stavy: připomínáme (výchozí, obrys) · done = píchnuto (fajfka místo klíče) · new = nová od lékaře · was = dřívější, přeškrtnutá.
   Ukazuje jen předepsané číslo – nikdy směr ani rozdíl („+2“). V textech se říká „dávka“, slovo „klíč“ se nezavádí. */
function dose(units, state, size) {
  var word = state === 'done' ? 'píchnuto' : state === 'new' ? 'nová' : '';
  var aria = state === 'was' ? 'dřív ' + units + ' jednotek' : units + ' jednotek' + (word ? ', ' + word : '');
  return '<span class="dose' + (state ? ' ' + state : '') + (size ? ' ' + size : '') + '" role="img" aria-label="' + e(aria) + '">' + NF.icon(state === 'done' ? 'check' : 'key-round') + '<b>' + units + '</b><span class="u">j.</span>' + (word ? '<span class="st">' + word + '</span>' : '') + '</span>';
}
V.dose = dose;
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
  var list = ((p && p.instructions) || []).slice();
  if (order) list.sort(function (x, y) { var ix = order.indexOf(x.id), iy = order.indexOf(y.id); return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy); }); /* nejnaléhavější pokyny první (18. 10. 2026) */
  if (!list.length) return '<p class="small muted">Lékař zatím pokyny nezadal.</p>';
  if (compact) return '<ul class="plain">' + list.map(function (i) { var c = cat.filter(function (x) { return x.id === i.id; })[0] || { title: i.id }; return '<li>' + e(c.title) + '</li>'; }).join('') + '</ul>'; /* převzetí plánu: jen názvy, celé znění v Bezpečí (19. 10. 2026) */
  return '<ul class="plain doc-list">' + list.map(function (i) {
    var c = cat.filter(function (x) { return x.id === i.id; })[0] || { title: i.id, text: '' };
    var txt = (c.text || '').replace('{v}', '<b>' + e(String(i.value).replace('.', ',')) + (c.unit ? ' ' + e(c.unit) : '') + '</b>');
    return '<li><b>' + e(c.title) + '</b><blockquote class="doc-q">„' + txt + '“</blockquote></li>';
  }).join('') + '</ul><p class="doc-sign">– váš lékař' + (p ? ' · plán ' + e(p.id) + ' · ' + e(NF.fmtShort(p.issuedAt)) : '') + '</p>';
}
V.instructionsList = instructionsList;
/* Hlas lékaře jako citace (podpis aplikace, rozhodnutí vlastníka 19. 10. 2026): pokyn lékaře je vysazený v uvozovkách s podpisem role,
   nikdy jménem. Pacient na první pohled pozná, co říká lékař a co aplikace („my“). Prázdný řetězec, když lékař pokyn nezadal. */
function instructionText(S, id) {
  var cat = NF.instructionCatalog(), p = NF.activePlan(S);
  var i = NF.instructions(S).filter(function (x) { return x.id === id; })[0], c = cat.filter(function (x) { return x.id === id; })[0];
  if (!i || !c) return '';
  var txt = (c.text || '').replace('{v}', '<b>' + e(String(i.value).replace('.', ',')) + (c.unit ? ' ' + e(c.unit) : '') + '</b>');
  return '<figure class="doc-voice"><blockquote>„' + txt + '“</blockquote><figcaption>– váš lékař' + (p ? ' · plán ' + e(p.id) : '') + '</figcaption></figure>';
}
/* Bezpečnostní karta s pokynem lékaře: odlišená sazbou a nadpisem „Pokyn lékaře“, ne barevným okrajem. */
function doctorCard(S, id, title, extra, cls) {
  var q = instructionText(S, id); if (!q && !extra) return '';
  return card('<p class="eyebrow doc-h">' + NF.icon('shield') + ' ' + e(title || 'Pokyn lékaře') + '</p>' + q + (extra || ''), 'doc' + (cls ? ' ' + cls : ''));
}
V.instructionText = instructionText; V.doctorCard = doctorCard;

/* Pokyny pro nemoc: bazál a inzulin k jídlu vedle sebe (rozdělený pokyn, 18. 10. 2026), ostatní pokyny sbalené. */
function illnessInstructions(S, p) {
  var cat = NF.instructionCatalog(), list = (p && p.instructions) || [];
  var one = function (id) {
    var i = list.filter(function (x) { return x.id === id; })[0], c = cat.filter(function (x) { return x.id === id; })[0];
    if (!i || !c) return '';
    var txt = (c.text || '').replace('{v}', '<b>' + e(String(i.value).replace('.', ',')) + (c.unit ? ' ' + e(c.unit) : '') + '</b>');
    return '<div class="box"><div class="k">' + e(c.title) + '</div><p class="small mt-1 mb-0">' + txt + '</p></div>';
  };
  var two = one('I-NEMOC-BAZAL') + one('I-NEMOC-JIDLO'), rest = list.filter(function (x) { return !/^I-NEMOC/.test(x.id); });
  return card('<h2>Pokyny lékaře pro nemoc</h2>' + (two ? '<div class="grid2 ill-two">' + two + '</div>' : '<p class="small muted">Lékař pokyny pro nemoc nezadal.</p>') +
    (rest.length ? '<details class="more mt-2"><summary>Další pokyny lékaře</summary>' + instructionsList(S, { instructions: rest }, true) + '</details>' : ''), 'ill');
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
  var ok = peak <= high, ps = pos(start), pp = pos(peak), lo = Math.min(ps, pp), hi = Math.max(ps, pp);
  return '<div class="rise ' + (ok ? 'ok' : 'bad') + '" role="img" aria-label="' + e('Glukóza při jídle ' + NF.mmol(start) + ', nejvyšší ' + NF.mmol(peak) + ' mmol/l, hranice cíle ' + NF.mmol(high) + ' mmol/l.') + '">' +
    '<div class="track" style="--goal:' + pos(high) + '%"><div class="dim" style="--from:0%;--to:' + lo + '%"></div><div class="dim" style="--from:' + hi + '%;--to:100%"></div><div class="span" style="--from:' + lo + '%;--to:' + (lo + Math.max(1, hi - lo)) + '%"></div><div class="goal" style="--at:' + pos(high) + '%"></div><span class="mark s" style="--at:' + ps + '%"></span><span class="mark p" style="--at:' + pp + '%"></span></div>' +
    '<div class="axis" aria-hidden="true">' + [4, 7, 10, 13, 16].map(function (v) { return '<span style="--f:' + (pos(v) / 100) + '">' + v + '</span>'; }).join('') + '</div>' +
    '<div class="lbl"><span>při jídle<b>' + e(NF.mmol(start)) + '</b></span><span class="peak-v">nejvyšší<b>' + e(NF.mmol(peak)) + '</b></span><span>cíl do<b>' + e(NF.mmol(high)) + '</b></span></div></div>';
}
function resultCard(S, compact) {
  var r = NF.lastResult(S); if (!r) return NF.usable(S, 'S-VYSLEDEK') ? '' : off(S, 'S-VYSLEDEK');
  var rc = NF.confidence(S, r.food.id, r.ep.meal), g = NF.glucoseOf(S, r.ep), high = NF.targets(S).high;
  var body = '<div class="now-row">' + foodIcon(S, r.food, rc) + '<div>' + (compact ? '' : ttl('Jak to dopadlo')) + r.text + riseBar(S, r) + (g.source === 'manual' ? '<p class="small muted mt-1 mb-0">Podle hodnot, které jste opsali; export ze senzoru je upřesní.</p>' : '') + divergenceBlock(S, r.ep) + (r.key === 'excluded' && r.smaller && instructionText(S, 'I-MENE') ? '<p class="eyebrow doc-h mt-3">' + NF.icon('shield') + ' Pokyn lékaře</p>' + instructionText(S, 'I-MENE') : '') +
    '<div class="actions mt-3">' + btn('Zavřít', 'resultSeen', r.ep.id, 'sm') + btn('Zobrazit jídlo', 'openFood', r.food.id, 'quiet sm') + '</div></div></div>' +
    '<div class="small mt-2">' + appr(S, 'S-VYSLEDEK') + '</div>';
  if (!compact) return card(body, 'result');
  /* když je na řadě další jídlo, výsledek minulého je jeden řádek s rozbalením (18. 10. 2026: akce před informací) */
  var st = g.peak == null ? 'bez hodnoty' : NF.mmol(g.peak) + ' mmol/l · ' + (g.peak <= high ? 'v cíli' : 'nad cílem');
  return card('<details class="more result-compact"><summary>' + NF.icon('plate') + '<span><b>Jak to dopadlo</b> · ' + e(NF.mealLabel(r.ep.meal)) + '</span><span class="st">' + e(st) + '</span></summary>' + body + '</details>', 'result');
}
/* Zapsáno + „Opravit inzulin“: do 60 minut po zápisu hlavního jídla (R6). */
function fixInsulinCard(S) {
  var eps = S.episodes.filter(function (x) { return !NF.isSnack(x.meal) && NF.canCorrectInsulin(S, x); });
  if (!eps.length) return '';
  var ep = eps[eps.length - 1], f = NF.foodById(S, ep.foodId), open = S.fixInsulin === ep.id, pick = open ? S.fixInsulinPick : null;
  var insOf = function (x) { return x.confirmed === 'as' ? 'inzulin ' + x.units + ' j. podle plánu' : x.confirmed === 'other' ? 'inzulin ' + x.units + ' j. (jinak)' : x.confirmed === 'none' ? 'bez inzulinu' : x.confirmed === 'pending' ? 'inzulin čeká na potvrzení' : 'inzulin „nevím“'; };
  var left = NF.param(S, 'D-CISTA', 'oprava_min', 60) - NF.minutesDiff(ep.recordedAt || ep.at, S.clock);
  var fixed = ep.insulinCorrected && ep.history && ep.history.length ? ep.history[ep.history.length - 1] : null;
  var just = !!(NF.flash && NF.flash.food === ep.foodId);
  return card('<div class="now-row">' + foodIcon(S, f, NF.confidence(S, f.id, ep.meal)) + '<div>' + ttl('Zapsáno: ' + e(NF.mealLabel(ep.meal)) + ' · ' + e(f ? f.name : '')) + e(insOf(ep.insulin)) + (ep.context === 'illness' ? ' <span class="tag">' + NF.icon('thermometer') + ' nemoc</span>' : '') + /* zápis z doby nemoci nese štítek (21. 10. 2026) */
    (fixed ? '<p class="small mt-1 mb-0">' + NF.icon('check', 'ok') + ' Opraveno: ' + e(insOf(fixed.insulinTo)) + ' · ' + e(NF.fmtClock(fixed.at)) + '</p>' : '') +
    '<div class="actions meta mt-2">' + btn(open ? 'Zavřít' : 'Opravit inzulin', 'fixInsulinOpen', ep.id, 'link') + '<span class="small muted">lze ještě ' + NF.plural(Math.max(0, left), 'minutu', 'minuty', 'minut') + '</span></div>' +
    (open ? '<div class="choice-row col mt-2" role="group" aria-label="Jak to bylo s inzulinem?">' + choice(opt('Podle plánu', ep.insulin.prescribed + ' j.'), 'fixInsulinPick', ep.id + ':as', pick === 'as', 'opt') + choice(opt('Jinak', 'jiné množství'), 'fixInsulinPick', ep.id + ':other', pick === 'other', 'opt') + choice(opt('Nepíchnuto', 'k tomuto jídlu bez inzulinu'), 'fixInsulinPick', ep.id + ':none', pick === 'none', 'opt') + choice(opt('Nevím', 'pro jistotu počítáme, že byl'), 'fixInsulinPick', ep.id + ':unknown', pick === 'unknown', 'opt') + '</div>' +
      (pick === 'other' ? '<div class="actions"><div class="stepper">' + btn(NF.icon('minus'), 'fixInsulinUnits', '-1', '', ' aria-label="méně"') + '<span class="val">' + (S.fixInsulinUnits != null ? S.fixInsulinUnits : ep.insulin.prescribed) + ' j.</span>' + btn(NF.icon('plus'), 'fixInsulinUnits', '1', '', ' aria-label="více"') + '</div></div>' : '') +
      '<div class="actions col">' + btn('Uložit opravu', 'fixInsulin', ep.id + ':' + (pick || ''), 'primary', pick ? '' : ' disabled') + '</div>' +
      '<p class="small muted mt-2 mb-0">Opravený zápis se učí dál, do návrhu k dávce pro lékaře už nejde.</p>' : '') + '</div></div>', just ? 'just-saved' : '');
}
function milestoneCard(S) {
  var m = NF.pendingMilestone(S); if (!m) return NF.usable(S, 'R-MILNIKY') ? '' : off(S, 'R-MILNIKY');
  return card('<div class="now-row"><div>' + ttl('Milník') + m.text +
    '<div class="actions mt-3">' + btn('Zavřít', 'milestoneClose', m.id, 'sm') + '</div></div></div>' +
    '<div class="small mt-2">' + appr(S, 'R-MILNIKY') + '</div>', 'tint milestone');
}
function weekCard(S) {
  var w = NF.weekSummary(S), T = NF.texts(S, 'S-TYDEN'); if (!NF.usable(S, 'S-TYDEN')) return off(S, 'S-TYDEN'); if (!w || !T) return '';
  var lines = [NF.fillText(T.meals, { meals: w.meals, usual: w.usual })];
  if (w.best) lines.push(NF.fillText(T.helped, { lever: NF.LEVERS[w.best.lever].label, k: w.best.k, n: w.best.n }));
  if (w.milestones.length) lines.push(T.milestone ? NF.fillText(T.milestone, { n: w.milestones.length }) + ' ' + w.milestones[w.milestones.length - 1].text.replace(/<\/?strong>/g, '') : ''); /* text milníku je už escapovaný (P4) */
  if (w.suggest) lines.push(NF.fillText(T.suggest, { food: w.suggest.food, lever: NF.leverNoun(w.suggest.lever), k: w.suggest.k, n: w.suggest.n }));
  lines.push(T.thanks || '');
  return card('<div class="now-row"><div>' + ttl(e(NF.fillText(T.head, { week: w.week }))) + lines.filter(Boolean).map(function (l) { return '<p class="mt-1 mb-1">' + l + '</p>'; }).join('') +
    '<div class="actions mt-3">' + btn('Zavřít', 'weekClose', w.id, 'sm') + (NF.importDue(S).missing ? btn('Nahrát data ze senzoru', 'importPage', null, 'sm') : '') + '</div></div></div>' +
    '<div class="small mt-2">' + appr(S, 'S-TYDEN') + '</div>', 'week');
}
function pathCard(S, withPreview) {
  var ps = NF.pathStats(S), T = NF.texts(S, 'S-CESTA'); if (!NF.usable(S, 'S-CESTA')) return off(S, 'S-CESTA'); if (!ps || !T) return '';
  var pct = Math.round(ps.gone / ps.total * 100);
  return card('<div class="card-head"><span>Cesta ke kontrole</span><span class="muted w-600">' + e(NF.fmtShort(ps.visit)) + '</span></div>' +
    '<div class="bar" aria-hidden="true"><span style="--pct:' + pct + '%"></span></div>' +
    '<div class="hero-num sm">' + ps.left + '<small>' + (ps.left === 1 ? 'den' : ps.left >= 2 && ps.left <= 4 ? 'dny' : 'dní') + ' do kontroly</small></div><div class="hero-cap">' + ps.week + '. týden plánu</div>' +
    /* posledních 7 dní jako tkanina místo dlaždic (Podpis C, 20. 10. 2026); celé období vidí jen lékař */
    (ps.gone >= 1 || ps.weekMeals ? '<h3 class="weave-h">' + (ps.weave.days.length === 1 ? 'Dnešní den' : ps.weave.days.length <= 4 ? 'Poslední ' + ps.weave.days.length + ' dny' : 'Posledních ' + ps.weave.days.length + ' dní') + '</h3>' + weave(ps.weave, true) +
      (ps.repeated ? '<p class="small mt-3 mb-0">Vašich častých jídel známe ' + frac(ps.known, ps.repeated) + '.</p>' : '')
      : '<p class="small muted mt-3">Po prvních zápisech tu uvidíte, které dny máte zapsané a kolik jídel už známe.</p>') + /* nulový stav místo „0 z 0“ (19. 10. 2026) */
    (withPreview ? '<p class="small muted mt-3 mb-0">' + T.visit + '</p>' : '') + /* na Dnes by věta opakovala závěrečnou nápovědu */
    (withPreview ? '<div class="actions mt-3">' + btn('Co uvidí lékař →', 'page', 'preview', 'sm') + '</div>' : '') +
    '<div class="small mt-2">' + appr(S, 'S-CESTA') + '</div>', 'path');
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
  return card('<div class="now-row"><div>' + ttl(ps.left === 0 ? 'Dnes jdete na kontrolu' : 'Za ' + ps.left + ' ' + (ps.left === 1 ? 'den' : ps.left <= 4 ? 'dny' : 'dní') + ' jdete na kontrolu') + 'Podívejte se, co uvidí lékař, a vyberte otázky, které si chcete vzít s sebou.' +
    '<div class="actions mt-3">' + btn('Co uvidí lékař →', 'page', 'preview', 'primary sm') + '</div></div></div>');
}
V.pathCard = pathCard;
/* Zlomek „3 z 4“: spojka menší a tlumená, číslo a spojka se nerozdělí (19. 10. 2026). */
function frac(a, b) { return '<span class="frac">' + a + '<span class="of">' + NF.z(b) + '</span>' + b + '</span>'; }
V.frac = frac;

/* ---------- data ze senzoru bez napojení (Z-GLUKOZA, Z-IMPORT, B-HYPO) ---------- */
/* Čipy po celých mmol/l místo klávesnice (vlastník 18. 10. 2026): 4–15, pod 4, nad 15, nemám. */
function glucoseChips(action, prefix, current, asked) {
  var vals = [], cur = asked ? (current == null ? 'none' : current <= 3.5 ? 'low' : current >= 16 ? 'high' : String(Math.round(current))) : null;
  vals.push(['low', 'pod 4']); for (var v = 4; v <= 15; v++) vals.push([String(v), String(v)]); vals.push(['high', 'nad 15']); vals.push(['none', 'nemám hodnotu']);
  /* pravidelná mřížka 4 sloupců: čísla vždy na stejném místě (19. 10. 2026) */
  return '<div class="chips glu">' + vals.map(function (x) { return choice(x[1], action, (prefix ? prefix + ':' : '') + x[0], cur === x[0], 'chip' + (x[0] === 'none' ? ' quiet' : x[0] === 'low' ? ' low' : x[0] === 'high' ? ' high' : '')); }).join('') + '</div>';
}
function yesNoChips(action, prefix, current) {
  return '<div class="chips">' + [['yes', 'Ano, pod 4'], ['no', 'Ne'], ['unknown', 'Nevím']].map(function (x) { return choice(x[1], action, prefix + ':' + x[0], current === x[0], 'chip'); }).join('') + '</div>';
}
/* Dotaz na minulé jídlo (nejvyšší hodnota, pod 4) – v kroku 1 dalšího jídla a večer u bazálu, ne samostatnou kartou. */
/* Každý blok čipů má časovou hlavičku s ikonou (LF-08, 19. 10. 2026): „Teď · 12:10“ (hodiny) a „Po snídani · 7:05–9:05“ (talíř),
   aby se hodnota teď a nejvyšší po minulém jídle nespletly. Odpovězený blok se během zápisu sbalí na jeden řádek se „Změnit“. */
function timeHead(ic, text) { return '<p class="eyebrow time-h">' + NF.icon(ic) + ' ' + e(text) + '</p>'; }
function prevLabel(ep) { return 'Po ' + NF.mealLabel(ep.meal, 'ke').replace(/^ke? /, ''); }
function prevAskBlock(S) {
  var pend = NF.pendingPeakAsk(S).concat(S.episodes.filter(function (e) { return e.manual && e.manual.peak != null && !e.manual.lowAsked && !NF.hasImport(e) && NF.minutesDiff(e.at, S.clock) <= 24 * 60 && NF.minutesDiff(e.at, S.clock) >= 120; })).slice(0, 2);
  var done = S.meal && S.meal.prevDone ? S.episodes.filter(function (x) { return S.meal.prevDone.indexOf(x.id) >= 0 && x.manual && x.manual.lowAsked && pend.indexOf(x) < 0; }) : [];
  return done.map(function (ep) {
    var lowTxt = ep.manual.low === true ? 'ano' : ep.manual.low === false ? 'ne' : 'nevím';
    return card('<div class="row-sum"><span>' + NF.icon('plate') + ' <b>' + e(prevLabel(ep)) + ':</b> nejvyšší ' + (ep.manual.peak != null ? e(NF.mmol(ep.manual.peak)) : 'bez hodnoty') + ' · pod 4: ' + lowTxt + '</span>' + btn('Změnit', 'prevReopen', ep.id, 'quiet sm') + '</div>', 'flat');
  }).join('') + pend.map(function (ep) {
    var f = NF.foodById(S, ep.foodId);
    var peakDone = ep.manual && ep.manual.peak != null;
    return card(timeHead('plate', prevLabel(ep) + ' · ' + NF.fmtClock(ep.at) + '–' + NF.fmtClock(NF.addMin(ep.at, 120)) + (f ? ' · ' + f.name : '')) +
      (!peakDone ? ttl('Nejvyšší hodnota za první dvě hodiny <span class="unit">mmol/l</span>') + '<p class="small muted mt-1 mb-2">Podle grafu v aplikaci senzoru.</p>' + glucoseChips('peakChip', ep.id, null, false)
        : ttl('Byla glukóza po jídle pod 4 mmol/l?') + '<p class="small muted mt-1 mb-2">Nejvyšší hodnota po jídle: <b>' + e(NF.mmol(ep.manual.peak)) + '</b>.</p>' + yesNoChips('lowChip', ep.id, null)) +
      (S.page === 'meal' && !peakDone ? '' : '<div class="small mt-2">' + appr(S, peakDone ? 'B-HYPO' : 'Z-GLUKOZA') + '</div>'), 'prev-ask');
  }).join('');
}
/* Sledování po menší porci s podaným inzulinem nebo po vynechaném jídle s inzulinem: za hodinu otázka „bylo pod 4?“ (B-HYPO). */
function hypoWatchCard(S) {
  var pend = NF.pendingHypoWatch(S); if (!pend.length) return '';
  var w = pend[0];
  return card('<div class="now-row"><div>' + ttl(w.night ? (w.kind === 'skipped' ? 'Včera večer jste vynechali večeři s podaným inzulinem' : 'Včera večer jste snědli méně než obvykle') : (w.kind === 'skipped' ? 'Před hodinou jste vynechali ' + e(NF.mealLabel(w.meal, 'acc')) + ' s podaným inzulinem' : 'Před hodinou jste snědli méně než obvykle')) + (w.night ? 'Podívejte se do grafu senzoru. Klesla glukóza v noci pod 4?' : 'Podívejte se na senzor. Klesla glukóza pod 4?') +
    yesNoChips('hypoAnswer', w.id, null) + '<div class="mt-3">' + (instructionText(S, 'I-HYPO') || '<p class="small muted mb-0">Při poklesu postupujte podle pokynu lékaře k nízké glukóze.</p>') + '</div></div></div>' +
    '<div class="small mt-2">' + appr(S, 'B-HYPO') + '</div>');
}
function hypoAlertCard(S) {
  var a = NF.hypoAlert(S); if (!a) return '';
  return card('<div class="now-row"><div>' + ttl('Nízká glukóza ' + a.count + '× za ' + a.days + ' dní') + 'Zavolejte do ordinace, ať lékař dávku posoudí dřív než na kontrole. Telefon najdete v Bezpečí. Jídla nevynechávejte.' +
    '<div class="actions mt-2">' + btn('Otevřít Bezpečí', 'page', 'safety', 'primary sm') + '</div></div></div><div class="small mt-2">' + appr(S, 'B-HYPO') + '</div>', 'low');
}
/* Odpověď „ano, pod 4“: karta s pokynem lékaře zůstane, dokud ji pacient nepotvrdí; řekne, kolik poklesů se počítá do „zavolejte“ (19. 10. 2026). */
function lowNoticeCard(S) {
  if (!S.lowNotice || NF.day(S.lowNotice.at) !== NF.day(S.clock)) return '';
  var n = NF.param(S, 'B-HYPO', 'poklesy', 2), d = NF.param(S, 'B-HYPO', 'dny', 7), k = NF.lowEvents(S, d).length;
  return doctorCard(S, 'I-HYPO', 'Pokles pod 4 je zapsaný', '<p class="small mt-3 mb-0">Počítá se do poklesů za ' + d + ' dní: ' + Math.min(k, n) + ' z ' + n + '. ' + (k >= n ? 'Zavolejte do ordinace.' : 'Při druhém poklesu vám řekneme, ať zavoláte do ordinace.') + '</p>' +
    '<div class="actions mt-3">' + btn('Rozumím', 'lowNoticeSeen', null, 'sm') + '</div>', 'low');
}
/* „Uložit, píchnu za chvíli“: jídlo je zapsané, inzulin čeká; po 30 min otázka „Byl inzulin?“ (jen při otevření, nic nehlídá). */
function pendingInsulinCard(S) {
  return NF.pendingInsulin(S).map(function (ep) {
    var late = NF.minutesDiff(ep.recordedAt || ep.at, S.clock) >= 30, lbl = NF.mealLabel(ep.meal, 'ke');
    return card('<div class="now-row"><span class="ic" aria-hidden="true">' + NF.icon('syringe') + '</span><div>' + ttl(late ? 'Byl ' + e(lbl) + ' inzulin?' : 'Inzulin ' + e(lbl) + ' čeká na potvrzení') + (late ? 'Jídlo je zapsané v ' + e(NF.fmtClock(ep.at)) + '.' : 'Až si píchnete ' + ep.insulin.prescribed + ' j., klepněte níže.') + '</div></div>' +
      '<div class="choice-row col mt-3" role="group" aria-label="Byl inzulin?">' + choice(opt('Píchnuto ' + ep.insulin.prescribed + ' j.', 'podle plánu'), 'pendingInsulin', ep.id + ':as', false, 'opt') + choice(opt('Nepíchnuto', 'k tomuto jídlu bez inzulinu'), 'pendingInsulin', ep.id + ':none', false, 'opt') + choice(opt('Nevím', 'pro jistotu počítáme, že už je'), 'pendingInsulin', ep.id + ':unknown', false, 'opt') + '</div>');
  }).join('');
}
/* Volba se dvěma řádky: titulek a vysvětlení (místo tečky „·“ v jednom řádku). */
function opt(t, sub) { return '<span class="opt-t">' + t + '</span>' + (sub ? '<span class="opt-s">' + sub + '</span>' : ''); }
/* Glukóza teď pod 4 (čip v kroku 1): hned pokyn lékaře; zápis pokračuje, procházku neradíme (19. 10. 2026). */
function lowNowCard(S) { return doctorCard(S, 'I-HYPO', 'Glukóza je teď pod 4', '<p class="small mt-3 mb-0">Jídlo zapsat můžete. Procházku po jídle teď neradíme.</p>', 'low'); }
V.prevAskBlock = prevAskBlock; V.hypoWatchCard = hypoWatchCard; V.hypoAlertCard = hypoAlertCard; V.lowNoticeCard = lowNoticeCard; V.pendingInsulinCard = pendingInsulinCard;

function peakAskCard(S) {
  var pend = NF.pendingPeakAsk(S); if (!pend.length) return '';
  var ep = pend[0], f = NF.foodById(S, ep.foodId), key = 'peak_' + ep.id, val = (S.form || {})[key];
  return card('<div class="now-row"><div>' + ttl('Nejvyšší hodnota od ' + e('po ' + NF.mealLabel(ep.meal, 'ke').replace(/^ke? /, '')) + '?') +
    'V aplikaci senzoru se podívejte na graf od ' + e(NF.fmtClock(ep.at)) + ' a opište nejvyšší číslo za první dvě hodiny' + (f ? ' (' + e(f.name) + ')' : '') + '.' +
    '<label class="field mt-2"><span>Nejvyšší hodnota (mmol/l)</span><input type="number" step="0.1" min="1" max="30" inputmode="decimal" data-bind="form.' + key + '" value="' + e(val != null ? val : '') + '" placeholder="např. 9,4"></label>' +
    '<div class="actions mt-2">' + btn('Uložit', 'peakSave', ep.id, 'primary sm') + btn('Nevím / nemám', 'peakSkip', ep.id, 'quiet sm') + '</div>' +
    '<p class="small muted mt-2 mb-0">Hodnoty, které opíšete, později nahradí přesný průběh z exportu ze senzoru.</p></div></div>' +
    '<div class="small mt-2">' + appr(S, 'Z-GLUKOZA') + '</div>');
}
function divergenceBlock(S, ep) {
  var dv = NF.divergence(S, ep); if (!dv) return '';
  return '<div class="hint neutral mt-3"><b>Tentokrát to dopadlo jinak než dřív</b> (vzestup ' + e(NF.mmol(dv.mine)) + ' mmol/l, dřív kolem ' + e(NF.mmol(dv.med)) + '). Bylo to stejné jídlo?' +
    '<div class="choice-row mt-2">' + choice('Stejné jídlo', 'foodDiverge', ep.id + ':same', false, 'sm') + choice('Jiná příloha nebo množství', 'foodDiverge', ep.id + ':side', false, 'sm') + choice('Jinak připravené', 'foodDiverge', ep.id + ':prep', false, 'sm') + choice('Jiný den (stres, pohyb, spánek)', 'foodDiverge', ep.id + ':day', false, 'sm') + '</div>' +
    '<p class="small muted mt-2 mb-0">Jídlo bude „známé“, až se zápisy shodnou. Jiná příloha nebo příprava se přidá jako samostatné jídlo.</p></div>';
}
function importCard(S) {
  var d = NF.importDue(S); if (!d.due) return '';
  return card('<div class="now-row"><div>' + ttl('Nahrát data ze senzoru') + 'Jednou týdně nahrajte export z aplikace senzoru: doplní přesný průběh k ' + NF.plural(d.missing, 'jídlu', 'jídlům', 'jídlům') + ' a noci pro bazál.' +
    '<div class="actions mt-2">' + btn('Nahrát export', 'importPage', null, 'primary sm') + '</div></div></div><div class="small mt-2">' + appr(S, 'Z-IMPORT') + '</div>');
}
function importNotice(S) {
  var d = NF.importDue(S); if (!d.missing) return '';
  return hint('<b>Přesný průběh ze senzoru nahraje sestra na kontrole.</b> Umíte-li stáhnout soubor z aplikace senzoru, můžete ho nahrát sami.<div class="actions mt-2">' + btn('Nahrát export', 'importPage', null, 'sm') + '</div>');
}
V.importPage = function (S) {
  var si = S.sensorImport;
  return head(S, 'Data ze senzoru', 'Nahrát export') +
    card('<p>V aplikaci senzoru zvolte <b>export dat</b> a soubor uložte do telefonu (csv; tabulku xlsx uložte jako csv). Potom ho tady vyberte. Soubor se čte jen v telefonu a nikam se neposílá.</p>' +
      '<label class="field"><span>Soubor s exportem</span><input type="file" accept=".csv,text/csv,.txt" data-action="importFile"></label>' +
      (NF.slots.importDemo ? NF.slots.importDemo(S) : '') +
      (si ? '<p class="small muted mt-3">Naposledy nahráno ' + e(NF.fmtDateTime(si.at)) + ': ' + si.readings + ' měření od ' + e(NF.fmtShort(si.from)) + ' do ' + e(NF.fmtShort(si.to)) + ', doplněno ' + NF.plural(si.filled, 'jídlo', 'jídla', 'jídel') + (si.nights ? ' a ' + NF.plural(si.nights, 'noc', 'noci', 'nocí') : '') + '.</p>' : '') +
      '<div class="small mt-2">' + appr(S, 'Z-IMPORT') + '</div>') +
    '<div class="actions">' + btn('← Zpět na Dnes', 'page', 'today', 'quiet') + '</div>';
};
V.peakAskCard = peakAskCard; V.divergenceBlock = divergenceBlock;

/* ---------- Dnes ---------- */
function todayEpisodes(S) { return S.episodes.filter(function (x) { return NF.day(x.at) === NF.day(S.clock); }); }
function basalToday(S) { return S.basalLog.filter(function (b) { return b.date === NF.day(S.clock) && (!b.at || b.at <= S.clock); })[0]; } /* záznam „z budoucnosti“ (večerní bazál ráno) se nepočítá */
V.today = function (S) {
  var p = NF.activePlan(S);
  var out = head(S, NF.fmtDayDate(S.clock), greeting(S));
  if (!p) return out + card('<h2>Zatím nemáte plán</h2><p>Až vám ho lékař v ordinaci vydá, uvidíte tady, co dělat.</p>');
  if (S.participation !== 'active') return out + card('<h2>Účast je ukončená</h2><p>Návyky, rady i připomínky jsou zastavené. Vaše zápisy zůstávají uložené.</p>');
  var ill = S.illness && S.illness.active;
  if (!ill) out += card('<div class="sick">' + NF.icon('thermometer') + ' Není mi dobře <button type="button" class="toggle" role="switch" aria-checked="false" data-action="illness" data-value="on" aria-label="Není mi dobře"></button></div>' +
    '<details class="more mt-2"><summary>Co se stane</summary><p class="small muted">Zapisovat můžete dál. K množství jídla neradíme a ukážeme vám pokyny lékaře pro nemoc. Každý den se zeptáme, jestli je vám lépe.</p></details>');
  var fm = NF.focusMeal(S), meal = fm ? fm.meal : mealNow(S), dose = p.doses[meal], hour = NF.parse(S.clock).getHours();
  var eaten = !fm || fm.state === 'done';
  var basalHour = Number(String(p.doses.basal.time).split(':')[0]) || 21;
  var basal = basalToday(S), basalTime = hour >= basalHour - 2;
  var yday = NF.day(NF.addDays(S.clock, -1)), askYesterday = NF.day(p.effectiveFrom) <= yday && !S.basalLog.some(function (b) { return b.date === yday; });
  var ask = S.ask && S.ask.day === NF.day(S.clock) ? S.ask : null;

  if (ill) {
    var ci = S.illness.checkins.filter(function (c) { return NF.day(c.at) === NF.day(S.clock); })[0];
    out += card('<div class="now-row"><div>' + ttl('Při nemoci') + 'Zapisujte jídla dál, k množství jídla ale neradíme. Dávky inzulinu platí, jak řekl lékař; níže máte jeho pokyny pro nemoc.' +
      (ci ? '<br><span class="small muted">Dnes už máme odpověď. Zeptáme se zase zítra.</span>' : '<div class="actions mt-3">' + btn('Už je mi lépe', 'illnessCheck', 'better', 'primary') + btn('Ještě ne', 'illnessCheck', 'same', '') + '</div>') + '</div></div>', 'soft') +
      illnessInstructions(S, p);
  }
  if (ill && NF.illnessLong(S)) out += doctorCard(S, 'I-NEMOC-JIDLO', 'Nemoc trvá už ' + NF.plural(NF.daysBetween(S.illness.from, S.clock), 'den', 'dny', 'dní'), '<p class="small mt-3 mb-0">' + (instructionText(S, 'I-NEMOC-JIDLO') ? '' : 'Když se nelepší, volejte podle pokynů v Bezpečí. ') + 'Lékař uvidí na kontrole, jak dlouho nemoc trvala.</p>');
  var slots = NF.daySlots(S), MT = function (k) { return e(NF.mealText(meal, k)); };
  var sk = (S.skipped && S.skipped[NF.day(S.clock)]) || {};
  /* 1) Co teď + primární akce hned pod pozdravem (18. 10. 2026: obrazovka začíná tím, co má pacient udělat) */
  var mealDue = !!(fm && (fm.state === 'now' || fm.state === 'next')), nextOnly = !!(fm && fm.state === 'next');
  /* „Co teď“ je jediný hrdina obrazovky (rozhodnutí vlastníka 19. 10. 2026): podbarvená karta, zpráva velkým písmem, bez ikony. */
  var hero = function (msg, sub, body) { return card('<p class="eyebrow">Co teď</p><h2 class="hero-msg">' + msg + '</h2>' + (sub ? '<p class="hero-sub">' + sub + '</p>' : '') + (body || ''), 'hero'); };
  if (mealDue) {
    out += hero(nextOnly ? 'Další jídlo: ' + e(NF.mealLabel(meal)) : 'Na řadě je ' + e(NF.mealLabel(meal)), nextOnly ? 'Inzulin ' + e(NF.mealLabel(meal, 'ke')) + ' až před jídlem. Až se budete chystat jíst, klepněte níže.' : (ill ? 'Připomeneme inzulin. K jídlu teď neradíme.' : 'Připomeneme inzulin a poradíme.'),
      '<div class="actions col mt-4">' + btn('' + NF.icon('utensils') + ' Chystám se jíst', 'startMeal', meal, 'primary big') + '</div>' +
      '<div class="actions split">' + btn(MT('already'), 'mealRetro', meal, '') + btn('Dnes ' + MT('without'), 'mealSkipAsk', meal, '', ask && ask.meal === meal ? ' aria-pressed="true"' : '') + '</div>' +
      (ask && ask.meal === meal ? '<div class="mt-4"><b>Byl ' + e(NF.mealLabel(meal, 'ke')) + ' inzulin?</b><div class="choice-row col mt-2" role="group">' + choice(opt('Ano, ' + dose.units + ' j.', 'podle plánu'), 'mealSkip', meal + ':as', false, 'opt') + choice(opt('Ano, jinak', 'jiné množství'), 'mealSkip', meal + ':other', false, 'opt') + choice(opt('Ne', 'bez inzulinu'), 'mealSkip', meal + ':none', false, 'opt') + choice(opt('Nevím', 'pro jistotu počítáme, že byl'), 'mealSkip', meal + ':unknown', false, 'opt') + '</div></div>' : ''));
  } else if (basalTime && !basal) {
    out += hero('Čas na bazál', 'Lékař vám předepsal ' + V.dose(p.doses.basal.units, '', 'sm') + ' ve ' + e(p.doses.basal.time) + '. Až si píchnete, potvrďte to níže.');
  } else if (fm && fm.state === 'missed') {
    var a0 = ask && ask.meal === meal ? ask : null;
    out += hero(MT('was'), e(NF.mealLabel(meal, 'Ke')) + ' nemáme zápis. Dejte nám vědět, co bylo.',
      '<div class="actions split mt-4">' + choice(MT('yes'), 'mealRetro', meal, false, 'big') + choice('Ne, ' + MT('without'), 'mealSkipAsk', meal, !!a0, 'big') + '</div>' +
      (a0 ? '<div class="mt-4"><b>Byl ' + e(NF.mealLabel(meal, 'ke')) + ' inzulin?</b><div class="choice-row col mt-2" role="group">' + choice(opt('Ano, ' + dose.units + ' j.', 'podle plánu'), 'mealSkip', meal + ':as', false, 'opt') + choice(opt('Ano, jinak', 'jiné množství'), 'mealSkip', meal + ':other', false, 'opt') + choice(opt('Ne', 'bez inzulinu'), 'mealSkip', meal + ':none', false, 'opt') + choice(opt('Nevím', 'pro jistotu počítáme, že byl'), 'mealSkip', meal + ':unknown', false, 'opt') + '</div><p class="small muted mt-2">Řiďte se pokynem lékaře „Méně jídla než obvykle“. Najdete ho v Bezpečí.</p></div>' : ''));
  } else {
    out += hero('Dnešní jídla jsou zapsaná', 'Další věc na vás čeká až ' + (basalTime ? 'zítra ráno' : 'večer u bazálu') + '.',
      '<div class="actions col mt-4">' + btn('' + NF.icon('apple') + ' Zapsat svačinu', 'startMeal', 'snack', 'big') + '</div>');
  }
  out += lowNoticeCard(S);
  out += pendingInsulinCard(S);
  out += fixInsulinCard(S);
  /* 2) bezpečí a otázky k minulému jídlu */
  out += hypoAlertCard(S);
  out += hypoWatchCard(S);
  if (basalTime) out += prevAskBlock(S);
  NF.MEALS.forEach(function (mm) { var i = sk[mm[0]]; if (i && (i.insulin === 'as' || i.insulin === 'other')) out += hint('<b>Dnes ' + e(NF.mealText(mm[0], 'without')) + ', ale inzulin podaný.</b> Postupujte podle pokynu lékaře „Méně jídla než obvykle“ a sledujte glukózu.', 'neutral'); });
  /* 3) zpětná vazba: výsledek posledního jídla (zkrácený, když je na řadě další), pak nejvýš jedna karta milníku nebo týdne */
  out += resultCard(S, mealDue);
  out += importCard(S);
  var msCard = milestoneCard(S); out += msCard || weekCard(S);
  out += soonCard(S);
  /* 4) pás dne a bazál */
  out += dayStrip(S, slots, meal, basal, basalTime, p);
  if (askYesterday) out += card('<div class="now-row"><span class="ic" aria-hidden="true">' + NF.icon('moon') + '</span><div>' + ttl('Byl včera večer bazál?') + 'Záznam ze včerejška chybí. Lékař předepsal ' + p.doses.basal.units + ' j. ve ' + e(p.doses.basal.time) + '.' +
    '<div class="choice-row col mt-2" role="group">' + choice('Ano, ' + p.doses.basal.units + ' j.', 'basalYesterday', 'as', false) + choice('Ne', 'basalYesterday', 'none', false) + choice('Nevím', 'basalYesterday', 'unknown', false) + '</div></div></div>');
  if (basalTime && !basal) {
    out += card('<div class="insulin"><div class="ic" aria-hidden="true">' + NF.icon('syringe') + '</div><div><b>Bazál ve ' + e(p.doses.basal.time) + '</b><small>Předepsal lékař</small></div>' + V.dose(p.doses.basal.units) + '</div>' +
      '<div class="actions col mt-3">' + btn('Bazál ' + p.doses.basal.units + ' j. je píchnutý', 'basalConfirm', 'as', 'primary big') + btn('Jinak', 'basalOther', null, '', S.basalOther ? ' aria-pressed="true"' : '') + '</div>' +
      (S.basalOther ? '<div class="actions"><div class="stepper">' + btn(NF.icon('minus'), 'basalUnits', '-1', '', ' aria-label="méně"') + '<span class="val">' + (S.basalUnits != null ? S.basalUnits : p.doses.basal.units) + ' j.<small>předepsáno ' + p.doses.basal.units + '</small></span>' + btn(NF.icon('plus'), 'basalUnits', '1', '', ' aria-label="více"') + '</div>' + btn('Uložit', 'basalConfirm', 'other', 'primary') + btn('Dnes bez bazálu', 'basalConfirm', 'none', 'quiet') + '</div>' : ''));
  } /* karta „Inzulin k …“ sloučena do pásu dne: dávka je druhý řádek uzlu „teď“ (rozhodnutí vlastníka 19. 10. 2026) */
  if (!(fm && fm.state === 'done') || (basalTime && !basal) || (fm && fm.state === 'missed')) out += '<div class="actions sec pull-up mb-4">' + btn('' + NF.icon('apple') + ' Zapsat svačinu', 'startMeal', 'snack', 'quiet') + '</div>'; /* velké tlačítko svačiny je jen ve stavu „vše zapsáno“ */

  var habits = NF.activeHabits(S);
  if (habits.length) {
    var todayEps = todayEpisodes(S).filter(function (x) { return !NF.isSnack(x.meal); }); /* svačina nemá dávku ani porci, do návyků nepatří */
    /* návyky, které jen zrcadlí pás dne, jsou sbalené; vidět zůstane bazál, dokud má dnes termín (rozhodnutí vlastníka 19. 10. 2026) */
    var done = 0, shown = '', hidden = '';
    habits.forEach(function (h) {
      var ok = habitDone(S, h, todayEps, basal); if (ok) done++;
      var row = '<div class="habit"><span class="mark ' + (ok ? '' : 'todo') + '">' + (ok ? NF.icon('check') : '') + '</span><div>' + e(h.short || h.title) + '<small>' + e(habitProgress(S, h, todayEps, basal)) + '</small></div></div>';
      if (h.catalogId === 'H-BAZAL' && !ok) shown += row; else hidden += row;
    });
    out += card(shown + '<details class="more habits' + (shown ? ' mt-2' : '') + '"><summary><span><b>Návyky dnes</b> · ' + done + ' ze ' + habits.length + ' splněno</span></summary>' + hidden +
      '<p class="small muted mt-3 mb-0">' + habits.map(function (h) { return '<b>' + e(h.short || h.title) + ':</b> ' + e(h.why); }).join('<br>') + '</p></details>');
  }
  out += pathCard(S, false);
  out += hint('<b>Vaše zápisy uvidí lékař až s vámi na kontrole.</b> Při potížích otevřete Bezpečí.');
  return out;
};
/* Pás dne: ráno → večer, kruh za každé hlavní jídlo a bazál; značka „teď“ bez pohybu (6:00–22:00). */
function dayStrip(S, slots, meal, basal, basalTime, p) {
  var fm = NF.focusMeal(S), nodes = slots.map(function (sl) {
    var next = fm && fm.meal === sl.meal && fm.state === 'next';
    var st = sl.state === 'done' ? 'done' : sl.state === 'skipped' ? 'skipped' : sl.state === 'missed' ? 'missed' : sl.meal === meal ? (next ? 'next' : 'now') : 'wait';
    var txt = st === 'done' ? 'zapsáno' : st === 'skipped' ? 'vynecháno' : st === 'missed' ? 'chybí' : st === 'now' ? 'teď' : st === 'next' ? 'další' : 'později';
    var units = (st === 'now' || st === 'next') && p.doses[sl.meal] ? p.doses[sl.meal].units : null;
    return { cls: st, ic: st === 'done' ? 'check' : st === 'skipped' ? 'minus' : st === 'missed' ? 'question' : 'utensils', label: NF.mealLabel(sl.meal, true), txt: txt, sub: units, act: st === 'now' || st === 'next' ? ['startMeal', sl.meal] : st === 'done' ? ['page', 'foods'] : st === 'missed' ? ['mealRetro', sl.meal] : null };
  });
  nodes.push({ cls: basal ? 'done' : basalTime ? 'now' : 'wait', ic: basal ? 'check' : 'moon', label: 'Bazál', txt: basal ? 'potvrzen' : basalTime ? 'teď' : String(p.doses.basal.time), sub: !basal && basalTime ? p.doses.basal.units : null });
  /* seznam uzlů, ne obrázek: tlačítka uvnitř musí čtečka ohlásit (přístupnost, 19. 10. 2026) */
  return card('<ol class="daystrip" aria-label="Dnešní den">' + nodes.map(function (n) {
    var inner = '<span class="dot" aria-hidden="true">' + NF.icon(n.ic) + '</span><b>' + e(n.label) + '</b><small>' + e(n.txt) + '</small>' + (n.sub != null ? dose(n.sub, '', 'sm') : '');
    var label = n.label + ': ' + n.txt + (n.sub != null ? ', dávka ' + n.sub + ' j.' : '');
    return '<li class="dnode ' + n.cls + '">' + (n.act ? '<button type="button" data-action="' + n.act[0] + '" data-value="' + e(n.act[1]) + '" aria-label="' + e(label) + '">' + inner + '</button>' : inner) + '</li>';
  }).join('') + '</ol>');
}
V.dayStrip = dayStrip;
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
    case 'H-BAZAL': return basal ? 'potvrzeno ' + basal.time : 've ' + (NF.activePlan(S).doses.basal.time);
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
  return '<div class="timechips">' + opts.map(function (o) { return choice(o[1], 'mealTime', o[0], String(m.offset) === o[0]); }).join('') + '</div>';
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
  return '<div class="patient sheet-body"><p class="eyebrow">Zápis jídla zůstává rozpracovaný</p><h2 class="sheet-h">Bezpečí</h2>' +
    card('<h2>Kam se obrátit</h2>' + safetyContacts()) +
    card('<h2>Osobní pokyny od lékaře</h2>' + instructionsList(S, p, false, SAFETY_ORDER)) +
    '<div class="actions col">' + btn(NF.icon('chevron-left') + ' Zpět k zápisu', 'closeDrawer', null, 'primary big') + '</div></div>';
};
var SAFETY_ORDER = ['I-HYPO', 'I-KONTAKT', 'I-MENE', 'I-NEVIM', 'I-VYSOKA', 'I-NEMOC-BAZAL', 'I-NEMOC-JIDLO'];
function safetyContacts() {
  var row = function (ic, k, v) { return '<div class="kv"><span>' + NF.icon(ic) + ' ' + e(k) + '</span><strong>' + e(v) + '</strong></div>'; };
  return row('stethoscope', 'Zdravotní potíže', 'ordinace podle pokynů') + row('shield', 'Ohrožení života', 'záchranná služba') + row('cog', 'Nefunguje telefon, zápis nebo senzor', 'technická podpora') + '<p class="small muted">V ukázce nejsou skutečná čísla. Sami nikam nic neposíláme.</p>';
}
V.meal = function (S) {
  var m = S.meal, p = NF.activePlan(S);
  if (!m || !p) return card('<h2>Teď nelze nic zapsat</h2>') + '<div class="actions">' + btn('Zpět', 'page', 'today', 'primary') + '</div>';
  var dose = p.doses[m.meal], out = '', snack = NF.isSnack(m.meal);
  if (!snack && !dose) return card('<h2>Teď nelze nic zapsat</h2><p class="small muted">K tomuto jídlu plán nemá dávku.</p>') + '<div class="actions">' + btn('Zpět', 'page', 'today', 'primary') + '</div>';
  var steps = '<div class="msteps">' + (snack ? [2, 3] : [1, 2, 3]).map(function (i) { return '<span class="' + (i <= m.step ? 'on' : '') + '"></span>'; }).join('') + '</div>';
  var stepLabel = function (n) { return snack ? 'Krok ' + (n - 1) + ' ze 2 · svačina' : 'Krok ' + n + ' ze 3 · ' + NF.mealLabel(m.meal); };
  if (m.step === 1 && m.retro) {
    var base = { breakfast: 6, lunch: 11, dinner: 17 }[m.meal];
    out += stepHead(S, m, 1) + head(S, 'Krok 1 ze 3 · ' + NF.mealLabel(m.meal) + ' zpětně', 'Byl ' + NF.mealLabel(m.meal, 'ke') + ' inzulin?') + steps +
      card('<div class="insulin"><div class="ic" aria-hidden="true">' + NF.icon('syringe') + '</div><div><b>Lékař předepsal ' + e(NF.mealLabel(m.meal, 'ke')) + '</b><small>ptáme se, jak to bylo</small></div>' + V.dose(dose.units) + '</div>') +
      '<div class="choice-row col" role="group" aria-label="Byl inzulin?">' +
      choice(opt('Ano, ' + dose.units + ' j.', 'podle plánu'), 'mealBolus', 'as', m.bolus === 'as', 'opt') +
      choice(opt('Ano, jinak', 'jiné množství'), 'mealBolus', 'other', m.bolus === 'other', 'opt') +
      choice(opt('Ne', 'bez inzulinu'), 'mealBolus', 'none', m.bolus === 'none', 'opt') +
      choice(opt('Nevím', 'pro jistotu počítáme, že byl'), 'mealBolus', 'unknown', m.bolus === 'unknown', 'opt') + '</div>' +
      (m.bolus === 'unknown' ? doctorCard(S, 'I-NEVIM', 'Nevíte, jestli jste si píchli') : '') +
      (m.bolus === 'other' ? card('<b>Kolik jednotek?</b><div class="actions mt-2"><div class="stepper">' + btn(NF.icon('minus'), 'mealUnits', '-1', '', ' aria-label="méně"') + '<span class="val">' + m.units + ' j.<small>předepsáno ' + dose.units + '</small></span>' + btn(NF.icon('plus'), 'mealUnits', '1', '', ' aria-label="více"') + '</div></div>') : '') +
      card('<b>' + e(NF.mealText(m.meal, 'when')) + '</b><div class="timechips">' + [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(function (o) { var h = base + o; var nowH = NF.parse(S.clock).getHours() + NF.parse(S.clock).getMinutes() / 60; return h <= nowH ? choice('v ' + NF.fmtHour(h), 'mealAt', String(h), String(m.at) === String(h)) : ''; }).join('') + '</div>' +
        (m.bolus === 'as' || m.bolus === 'other' ? '<b class="field-q">A inzulin?</b><div class="timechips">' + [['0', 'zároveň s jídlem'], ['-15', '15 min před'], ['-30', '30 min před'], ['15', 'až po jídle']].map(function (o) { return choice(o[1], 'mealTime', o[0], String(m.offset) === o[0]); }).join('') + '</div>' + tolNote(S) : '')) +
      '<div class="actions">' + btn('Další: co bylo k jídlu →', 'mealStep', '2', 'primary big', m.bolus && m.at != null ? '' : ' disabled') + '</div>' +
      (m.bolus && m.at != null ? '' : '<p class="small muted ta-c">Vyberte inzulin a čas jídla.</p>');
    return out;
  }
  if (m.step === 1) {
    var nd = newDose(S, p, m.meal);
    /* doplňující otázka, která se po odpovědi objeví, se ohlásí čtečce (A15, 19. 10. 2026) */
    var said = m.bolus === 'as' ? 'Doplňující otázka: Kdy byl inzulin?' : m.bolus === 'other' ? 'Doplňující otázka: Kolik jednotek a kdy?' : m.bolus === 'unknown' ? 'Níže je pokyn lékaře, když nevíte, jestli jste si píchli.' : '';
    if (m.beforeAsked && m.before != null && m.before < 4) said += (said ? ' ' : '') + 'Glukóza je teď pod 4: níže je pokyn lékaře.';
    out += stepHead(S, m, 1) + head(S, 'Krok 1 ze 3 · ' + NF.mealLabel(m.meal), 'Je inzulin k tomuto jídlu už píchnutý?') + steps + '<p class="sr-only" role="status">' + e(said) + '</p>' +
      (m.cancelAsk ? hint('<b>Zahodit rozpracovaný zápis?</b><div class="actions mt-2">' + btn('Zahodit', 'mealCancel', null, 'danger sm') + btn('Pokračovat v zápisu', 'mealCancelKeep', null, 'sm') + '</div>', 'warn') : '') +
      card('<div class="insulin"><div class="ic" aria-hidden="true">' + NF.icon('syringe') + '</div><div><b>Lékař předepsal ' + e(NF.mealLabel(m.meal, 'ke')) + '</b>' + (nd ? '<small>nově, dřív ' + nd.was + ' j.</small>' : '') + '</div>' + V.dose(dose.units, nd ? 'new' : (m.bolus === 'as' ? 'done' : '')) + '</div>' +
        /* odpovědi jako rovnocenné volby, plné až po vybrání (rozhodnutí vlastníka 19. 10. 2026; dřív očekávaná odpověď plná předem) */
        '<div class="choice-row col mt-3" role="group" aria-label="Je inzulin k tomuto jídlu už píchnutý?">' +
        choice(opt('Ano, ' + dose.units + ' j.', 'podle plánu'), 'mealBolus', 'as', m.bolus === 'as', 'opt') +
        choice(opt('Ano, jinak', 'jiné množství nebo čas'), 'mealBolus', 'other', m.bolus === 'other', 'opt') +
        choice(opt('Ještě ne', 'inzulin až před jídlem'), 'mealBolus', 'before', m.bolus === 'before', 'opt') +
        choice(opt('Nevím', 'pro jistotu počítáme, že už je'), 'mealBolus', 'unknown', m.bolus === 'unknown', 'opt') + '</div>' +
        (m.bolus === 'unknown' ? '<div class="mt-3"><p class="small mb-2"><b>Nevíte, jestli jste si píchli?</b> Bereme to, jako by inzulin v těle byl.</p>' + (instructionText(S, 'I-NEVIM') || '<p class="small muted">Řiďte se pokyny lékaře v Bezpečí. ' + btn(NF.icon('shield') + ' Bezpečí', 'safetyOpen', null, 'sm') + '</p>') + '</div>' : '') +
        (m.bolus === 'other' ? '<div class="box mt-3"><b>Kolik jednotek?</b><div class="actions mt-2"><div class="stepper">' + btn(NF.icon('minus'), 'mealUnits', '-1', '', ' aria-label="méně"') + '<span class="val">' + m.units + ' j.<small>předepsáno ' + dose.units + '</small></span>' + btn(NF.icon('plus'), 'mealUnits', '1', '', ' aria-label="více"') + '</div></div><b class="field-q">Kdy?</b>' + timeChips(m) + '</div>' : '') +
        (m.bolus === 'as' ? '<div class="box mt-3"><b>Kdy byl inzulin?</b>' + timeChips(m) + tolNote(S) + '</div>' : '') +
        insulinAxis(S, m) +
        '<details class="more mt-1"><summary>Proč se ptáme</summary><p class="small muted">Radu k velikosti porce můžeme dát jen dřív, než je inzulin v těle. Když nevíte, bereme to, jako by už byl – je to bezpečnější.</p></details>') +
      card((m.retro ? '' : timeHead('clock', 'Teď · ' + NF.fmtClock(S.clock))) + '<h2>' + (m.retro ? 'Glukóza při jídle podle grafu senzoru' : 'Kolik ukazuje senzor teď') + ' <span class="unit">mmol/l</span></h2><p class="small muted mt-1 mb-2">Opište celé číslo z aplikace senzoru. Když ho nemáte, klepněte na „nemám“ – jídlo zapíšeme i tak, do učení se započítá až s exportem.</p>' + glucoseChips('mealBefore', '', m.before, !!m.beforeAsked) +
        (m.beforeAsked ? '<p class="chosen-note">Vybráno' + (m.retro ? '' : ' teď') + ': ' + (m.before == null ? 'nemám hodnotu' : m.before < 4 ? 'pod 4 mmol/l' : m.before >= 16 ? 'nad 15 mmol/l' : e(NF.mmol(m.before)) + ' mmol/l') + '</p>' : '') +
        (m.retro ? '<b class="field-q">Nejvyšší hodnota za dvě hodiny po jídle</b>' + glucoseChips('mealPeak', '', m.peak, !!m.peakAsked) + '<b class="field-q">Klesla do 4 hodin pod 4?</b>' + yesNoChips('mealLow', '', m.lowAsked ? (m.low === true ? 'yes' : m.low === false ? 'no' : 'unknown') : null) : '') +
        '<div class="small mt-2">' + appr(S, 'Z-GLUKOZA') + '</div>') +
      (m.beforeAsked && m.before != null && m.before < 4 ? lowNowCard(S) : '') +
      (m.retro ? '' : hypoWatchCard(S) + prevAskBlock(S) + lowNoticeCard(S)) +
      '<div class="actions">' + btn('Další: co budete jíst →', 'mealStep', '2', 'primary big', m.bolus && m.beforeAsked ? '' : ' disabled') + '</div>' +
      (m.bolus && m.beforeAsked ? '' : '<p class="small muted ta-c">' + (!m.bolus ? 'Odpovězte na otázku k inzulinu.' : 'Klepněte na hodnotu ze senzoru, nebo na „nemám“.') + '</p>');
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
      '<p class="sr-only" role="status">' + (m.q ? e(results.length ? 'Nalezeno: ' + NF.plural(results.length, 'jídlo', 'jídla', 'jídel') : 'Žádné jídlo neodpovídá.') : '') + '</p>' +
      card('<label class="field"><span>' + (list.length ? 'Jiné jídlo' : 'Jídlo') + ' – napište pár písmen</span><input data-bind="meal.q" value="' + e(m.q || '') + '" placeholder="např. řízek, kaše, guláš" autocomplete="off"></label>' +
        (list.length ? '<div class="small muted mt-1 mb-2">' + (m.q ? 'Nalezeno' : 'Naposledy') + '</div><ul class="food-grid' + (m.q ? ' q' : '') + '">' + list.map(function (f) {
          var c = NF.confidence(S, f.id, m.meal);
          var on = !!(chosen && chosen.id === f.id);
          return '<li><button type="button" class="food-opt' + (on ? ' chosen' : '') + '" data-action="mealFood" data-value="' + e(f.id) + '" aria-pressed="' + on + '">' + foodIcon(S, f, c) + '<span class="name">' + markMatch(f.name, m.q) + foodOptLine(c) + '</span>' + (on ? '<span class="sel" aria-hidden="true">' + NF.icon('check') + '</span>' : '') + '</button></li>';
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
  if (m.retro) {
    var ra = NF.adviseAfter(S, food.id, m.meal, NF.retroAt(S, m.at)), rc = ra.conf;
    out += stepHead(S, m, 3) + head(S, 'Krok 3 ze 3 · ' + NF.mealLabel(m.meal) + ' zpětně', 'Zápis a co pomůže teď') + steps +
      card('<div class="media">' + foodIcon(S, food, rc) + '<div><div class="name name-lg">' + e(food.name) + '</div><div class="badges">' + foodBadges(rc) + '</div><div class="learn">' + e(NF.mealLabel(m.meal, true)) + ' v ' + e(NF.fmtHour(Number(m.at))) + ' · ' + e(NF.PORTIONS.filter(function (x) { return x[0] === m.portion; })[0][1].toLowerCase()) + ' porce · inzulin ' + e(m.bolus === 'as' ? dose.units + ' j.' : m.bolus === 'other' ? m.units + ' j.' : NF.INSULIN[m.bolus]) + '</div></div></div>' +
        (rc.level === 'known' ? '<div class="detail">' + peakBlock(S, food, rc) + '</div>' : '<p class="sum mt-3">Zápis se přidá k učení' + (m.bolus === 'as' ? '' : ' jen jako záznam (inzulin nebyl podle plánu)') + '.</p>')) +
      (ra.items.length ? '<h2 class="section-h">Co pomůže teď <span class="small muted w-text">· jídlo už změnit nejde</span></h2>' + ra.items.map(function (it) {
        var d = (m.decisions || {})[it.lever];
        return '<div class="advice ' + (d === true ? 'taken' : d === false ? 'declined' : '') + '"><div class="lever">' + e(it.label) + '</div><div class="text">' + e(it.text) + '</div><div class="cert">' + e(it.certainty) + '</div>' +
          '<div class="choice-row" role="group" aria-label="' + e(it.label) + '">' + choice(NF.icon('check') + ' Zkusím to', 'mealDecide', it.lever + ':yes', d === true, 'yes') + choice('Tentokrát ne', 'mealDecide', it.lever + ':no', d === false) + '</div><div class="mt-2">' + appr(S, it.item) + '</div></div>';
      }).join('') : '') +
      (NF.usable(S, 'R-REAKCE') ? '' : off(S, 'R-REAKCE')) + offLevers(S) +
      (ra.late ? hint('<b>Od jídla už uplynuly víc než tři hodiny.</b> Glukóza po něm už klesla, pohyb teď k tomuto jídlu nic nezmění. Zápis se i tak počítá.', 'neutral') : '') +
      (m.bolus === 'none' || m.bolus === 'unknown' ? hint('<b>Inzulin k tomuto jídlu ' + (m.bolus === 'none' ? 'nebyl podán' : 'není potvrzený') + '.</b> Zápis uložíme, ale do učení ho nezapočítáme. Při nejistotě, co dělat: ' + btn(NF.icon('shield') + ' Bezpečí', 'safetyOpen', null, 'sm'), 'warn') : '') +
      '<div class="choice-row inset mt-2 mb-2">' + choice('Neobvyklý den (stres, málo spánku, alkohol)', 'mealUnusual', 'toggle', !!m.unusual, 'sm') + '</div>' + (m.unusual ? '<p class="small muted inset mb-2">Zápis uložíme, ale do učení ho nezapočítáme.</p>' : '') +
      '<div class="actions">' + btn('Uložit ' + NF.mealLabel(m.meal, 'acc'), 'mealFinish', m.bolus, 'primary big') + '</div>';
    return out;
  }
  var res = NF.advise(S, food.id, m.portion, m.bolus, m.meal);
  var conf = res.conf;
  out += stepHead(S, m, 3) + head(S, stepLabel(3), snack ? 'Zápis svačiny' : 'Rada a zápis') + steps;
  out += card('<div class="media">' + foodIcon(S, food, conf) + '<div><div class="name name-lg">' + e(food.name) + '</div><div class="badges">' + foodBadges(conf) + '</div>' +
    '<div class="learn">' + (conf.level === 'known' ? 'Známe ho · ' + NF.plural(conf.st.n, 'zápis', 'zápisy', 'zápisů') : conf.level === 'similar' ? 'Zatím odhad z podobných jídel' : conf.level === 'unstable' ? 'Zápisy se liší, jídlo zatím neznáme' : conf.level === 'learning' && conf.impression === 'mixed' ? 'Zápisy se liší; bude známé, až se shodnou' : 'Zatím nic neodhadujeme – zapište ho ' + (conf.min || 4) + '×') + '</div></div></div>' +
    (conf.level === 'unknown' ? '' : conf.level === 'none' ? '<p class="sum mt-3">' + e(conf.why) + '</p>' : '<div class="detail">' + peakBlock(S, food, conf) + '</div>'));
  if (res.lowNow) out += lowNowCard(S);
  if (!res.gate.ok) out += NF.usable(S, 'R-REAKCE') ? hint('<b>Teď neradíme.</b> ' + e(res.gate.why), 'neutral') : off(S, 'R-REAKCE');
  else {
    res.blocked.forEach(function (b) { out += b.reason === 'item' ? off(S, NF.LEVERS[b.lever].item) : hint('<b>' + e(NF.LEVERS[b.lever].label) + ': teď neradíme.</b> ' + e(b.why), 'neutral'); });
    if (m.portion === 'smaller' && m.bolus !== 'before' && m.bolus !== 'none') out += doctorCard(S, 'I-MENE', 'Méně jídla než obvykle');
    res.gone.forEach(function (g) { out += hint(e(g.text) + ' ' + appr(S, 'R-ZMIZELA')); });
    if (res.illness) out += hint('<b>Při nemoci</b> k jídlu neradíme; platí pokyny lékaře nahoře na Dnes.');
    if (res.items.length) {
      out += '<h2 class="section-h">Co můžete zkusit <span class="small muted w-text">(odpovědět nemusíte)</span></h2>' + res.items.map(function (it) {
        var d = (m.decisions || {})[it.lever], reason = (m.reasons || {})[it.lever];
        if (m.compact && m.compact[it.lever]) return '<div class="advice compact ' + (d === true ? 'taken' : 'declined') + '"><div class="lever">' + e(it.label) + '</div><div class="text">Jako minule: <b>' + (d === true ? 'zkusím to' : 'tentokrát ne') + '</b> ' + btn('Změnit', 'mealExpand', it.lever, 'sm quiet') + '</div><div class="mt-2">' + appr(S, it.item) + '</div></div>'; /* rutina po 3 odpovědích (18. 10. 2026) */
        return '<div class="advice ' + (d === true ? 'taken' : d === false ? 'declined' : '') + '"><div class="lever">' + e(it.label) + (it.carbs ? tag('mění množství jídla', 'warn') : '') + '</div>' +
          (it.lever === 'portion' ? plateMove(m.portion) : leverAnim(it.lever, food)) + '<div class="text">' + e(it.text) + '</div><div class="cert">' + e(it.certainty) + '</div>' +
          '<div class="choice-row" role="group" aria-label="' + e(it.label) + '">' + choice(NF.icon('check') + ' Zkusím to', 'mealDecide', it.lever + ':yes', d === true, 'yes') + choice('Tentokrát ne', 'mealDecide', it.lever + ':no', d === false) + '</div>' +
          (d === false ? '<div class="choice-row reasons">' + NF.DECLINE_REASONS.map(function (r) { return choice(r[1], 'mealReason', it.lever + ':' + r[0], reason === r[0]); }).join('') + '</div>' : '') +
          '<div class="mt-2">' + appr(S, it.item) + '</div></div>';
      }).join('');
    } else if (conf.level === 'known' && !res.blocked.length) out += card('<p>K tomuto jídlu radu nepotřebujete – zůstáváte po něm v cíli. Stačí ho zapsat.</p>');
  }
  if (res.gate.ok) out += offLevers(S);
  if (!snack && res.gate.ok && res.items.length) out += '<details class="more card why-card"><summary>Proč tohle radíme</summary><div class="small muted pt-2">' +
    '<p><b>Odkud to víme:</b> jen z vašich vlastních zápisů a dat ze senzoru. Počítáme jen zápisy s potvrzeným inzulinem a daty ze senzoru. Nepočítáme zápis z doby nemoci, s jinou než obvyklou porcí nebo s jinou dávkou.</p>' +
    '<p><b>Proč se ptáme na inzulin:</b> dávka je jako klíč vyrobený na obvyklou porci. Dokud inzulin není v těle, můžete porci ještě upravit. Po píchnutí inzulin působí 3–5 hodin, ať sníte cokoli. Proto pak poradíme jen návrat z větší porce k obvyklé.</p>' +
    '<p><b>Co nikdy neděláme:</b> nepočítáme ani neměníme dávku inzulinu.</p></div></details>';
  if (m.bolus === 'before') {
    out += card('<h2>Až si píchnete ' + dose.units + ' j., potvrďte to</h2><p class="small muted">Klepněte, až budete mít inzulin píchnutý. Když si píchnete až u stolu, uložte jídlo teď a inzulin potvrďte na Dnes.</p>' +
      '<div class="actions col mt-3">' + btn('Píchnuto · uložit ' + NF.mealLabel(m.meal, 'acc'), 'mealFinish', 'as', 'primary big') + '<div class="actions col">' + btn('Uložit, píchnu za chvíli', 'mealFinish', 'pending', '') + btn('Píchnuto jinak', 'mealFinishOther', null, '', m.finishOther ? ' aria-pressed="true"' : '') + '</div></div>' +
      (m.finishOther ? '<div class="actions"><div class="stepper">' + btn(NF.icon('minus'), 'mealUnits', '-1') + '<span class="val">' + m.units + ' j.</span>' + btn(NF.icon('plus'), 'mealUnits', '1') + '</div>' + btn('Uložit', 'mealFinish', 'other', 'primary') + btn('Nepíchnuto', 'mealFinish', 'none', 'quiet') + '</div>' : '') +
      '<p class="small muted mt-2 mb-0">Do 60 minut ho můžete opravit na obrazovce Dnes.</p>');
  } else out += '<div class="actions">' + btn(snack ? 'Uložit svačinu' : 'Uložit jídlo', 'mealFinish', m.bolus, 'primary big') + '</div>';
  return out;
};

/* ---------- Moje jídla ---------- */
V.foods = function (S) {
  var seg = S.foodsSeg || 'known';
  var withEps = S.foods.filter(function (f) { return NF.foodStats(S, f.id).eaten > 0; });
  var known = withEps.filter(function (f) { return NF.confidence(S, f.id).level === 'known'; });
  var learning = withEps.filter(function (f) { return NF.confidence(S, f.id).level !== 'known'; });
  var list = seg === 'known' ? known : seg === 'learn' ? learning : withEps;
  var out = head(S, 'Co už o vašich jídlech víme', 'Vaše jídla') +
    '<div class="segmented mb-3">' + [['known', 'Známá · ' + known.length], ['learn', 'Učíme se · ' + learning.length], ['all', 'Všechna · ' + withEps.length]].map(function (x) { return '<button type="button" class="' + (seg === x[0] ? 'on' : '') + '" data-action="foodsSeg" data-value="' + x[0] + '" aria-pressed="' + (seg === x[0] ? 'true' : 'false') + '">' + e(x[1]) + '</button>'; }).join('') + '</div>';
  if (!withEps.length) return out + card('<p>Zatím tu nic není. Až zapíšete první jídlo, uvidíte ho tady.</p>');
  if (!list.length) return out + card('<p>' + (seg === 'known' ? 'Zatím žádné známé jídlo. Jídlo poznáme po ' + NF.param(S, 'R-REAKCE', 'minKnown', 4) + ' zápisech se všemi údaji.' : 'Všechna zapsaná jídla už znáte.') + '</p>');
  /* seznam jako řádky (rozhodnutí vlastníka 20. 10. 2026): prstenec · název · štítek reakce · šipka; detail na samostatné obrazovce se Zpět */
  out += '<section class="card list-card"><ul class="food-list" aria-label="' + e(seg === 'known' ? 'Známá jídla' : seg === 'learn' ? 'Jídla, která se učíme' : 'Všechna jídla') + '">' + list.map(function (f) { return '<li>' + foodRow(S, f, seg) + '</li>'; }).join('') + '</ul></section>';
  return out;
};
function foodRow(S, f, seg) {
  var c = NF.confidence(S, f.id), badge = c.level === 'known' && c.reaction ? reactionTag(c.reaction) : seg === 'known' && c.level === 'known' ? '' : levelTag(c.level, c);
  return '<button type="button" class="food-row" data-action="foodOpen" data-value="' + e(f.id) + '">' + foodIcon(S, f, c) + '<span class="fr-main"><span class="name">' + e(f.name) + '</span>' + (badge || f.custom ? '<span class="badges">' + badge + (f.custom ? tag('moje jídlo') : '') + '</span>' : '') + '</span><span class="chev" aria-hidden="true">' + NF.icon('chevron-right') + '</span></button>';
}
/* Detail jídla jako samostatná obrazovka (NF.PAGES 'food'): hlavička se Zpět, pak karta se vším, co dřív bylo v rozbalení. */
V.foodDetail = function (S) {
  var f = S.foodOpen ? NF.foodById(S, S.foodOpen) : null;
  if (!f) return V.foods(S);
  return '<div class="stephead">' + btn(NF.icon('chevron-left') + ' Zpět na jídla', 'foodBack', null, 'back') + '</div>' + head(S, 'Vaše jídlo', f.name) + foodCard(S, f, true, true);
};
/* Rady, které se pacientovi skutečně nabízejí: schválené v registru, nevypnuté lékařem, při nemoci jen bezpečné. */
function tipLevers(S) {
  var pa = NF.planAdvice(S), ill = !!(S.illness && S.illness.active), txt = { addon: 'přidat k jídlu bílkovinu (jogurt, sýr, vejce)', order: 'sníst nejdřív zeleninu nebo maso', walk: 'po jídle se projít' };
  return Object.keys(txt).filter(function (l) { var meta = NF.LEVERS[l]; return NF.usable(S, meta.item) && (pa.off || []).indexOf(l) < 0 && (!ill || meta.illnessSafe); }).map(function (l) { return txt[l]; });
}
/* Nové jídlo jen názvem (rozhodnutí vlastníka 15. 10. 2026): žádné složení. Nepovinné „Je to jako …“ a dotaz „Myslíte X?“ u podobného názvu. */
function customBuilder(S, m) {
  var nf = m.newFood, name = (m.q || '').trim(), sug = nf.suggest ? NF.foodById(S, nf.suggest) : null, cands = NF.usable(S, 'R-PODOBNOST') ? NF.likeCandidates(S) : [];
  var out = '<h2>Nové jídlo: ' + e(name) + '</h2><p class="small muted">Víc nepotřebujeme. Porci zadáte až u jídla.</p>';
  if (sug) out += '<div class="hint neutral"><b>Je to stejné jídlo jako „' + e(sug.name) + '“ ve vašem seznamu?</b><div class="actions split">' + btn('Ano, je to ono', 'mealUseExisting', sug.id, 'sm primary') + btn('Ne, přidat jako nové jídlo', 'mealNotSame', null, 'sm') + '</div></div>';
  else {
    if (cands.length) out += '<b class="field-q">Nepovinně: podobá se některému jídlu, které už známe? <span class="small muted w-text">Použijeme ho jen jako výchozí odhad na první tři zápisy; vaše jídlo zůstává samostatné.</span></b><div class="choice-row col" role="group">' + cands.map(function (f) { return choice(e(f.name), 'mealLike', f.id, nf.like === f.id); }).join('') + choice('Nic podobného', 'mealLike', 'none', nf.like === 'none') + '</div>';
    out += '<div class="actions">' + btn('Přidat do seznamu', 'mealSaveFood', null, 'primary') + '</div>';
  }
  return card(out);
}
function foodCard(S, f, open, page) {
  var c = NF.confidence(S, f.id), st = c.st;
  var sum;
  if (c.level === 'known' && !c.reaction) sum = 'Zapsáno ' + st.eaten + '×. ' + (NF.usable(S, 'R-SKORE') ? 'Zatím ' + st.inTarget + ' z ' + st.n + ' v cíli.' : 'Reakci zatím nehodnotíme; rozmezí vidíte níže.');
  else if (c.level === 'learning') sum = 'Zapsáno ' + st.eaten + '×, ' + (st.n === 1 ? 'první dojem: tentokrát ' + (c.impression === 'in' ? 'v cíli' : 'nad cílem') + '. Ještě ' + NF.plural(Math.max(1, (c.min || 4) - st.n), 'zápis', 'zápisy', 'zápisů') + ' a budeme ho znát.' : c.impression === 'mixed' ? 'zápisy se liší. Jídlo bude známé, až se shodnou.' : 'zatím to vypadá, že po něm ' + (c.impression === 'in' ? 'zůstáváte v cíli' : 'jdete nad cíl') + '. Ještě ' + NF.plural(Math.max(1, (c.min || 4) - st.n), 'zápis', 'zápisy', 'zápisů') + ' a bude známé.');
  else if (c.level === 'known') sum = 'Zapsáno ' + st.eaten + '×, v cíli ' + st.inTarget + ' ' + NF.z(st.n) + ' ' + st.n + ' započítaných.' + (c.reaction.settled ? '' : ' S dalšími zápisy se to může změnit.'); /* reakci nese štítek (slovo + ikona), věta nese čísla (řemeslo 9) */
  else if (c.level === 'similar') sum = 'Zapsáno ' + st.eaten + '×, ještě ' + (c.min - st.n) + ' a budeme ho znát. Podobá se jídlům, po kterých ' + (c.reaction && c.reaction.key === 'mild' ? 'zůstáváte v cíli' : 'jdete nad cíl') + '.';
  else if (c.level === 'unstable') sum = 'Zapsáno ' + st.eaten + '×, zápisy se ani po ' + st.n + ' neshodly. Lékař to uvidí v podkladech. Zkuste jídlo dělat pokaždé stejně, nebo ho rozdělte na dvě.';
  else sum = 'Zapsáno ' + st.eaten + '×. Zatím nic neodhadujeme; po ' + (c.min || 4) + ' zápisech se všemi údaji budeme vědět víc.';
  if (!NF.usable(S, 'R-SKORE')) sum += off(S, 'R-SKORE'); if (!NF.usable(S, 'R-PODOBNOST') && c.level !== 'known') sum += off(S, 'R-PODOBNOST');
  var detail = '';
  if (open) {
    var lev = c.level === 'known' ? NF.leverStats(S, f.id) : [], un = c.level === 'known' ? NF.unstable(S, f.id) : null;
    detail = '<div class="detail">' + peakBlock(S, f, c) +
      (un && un.kind === 'lever' ? '<div class="tip"><b>Zápisy se liší</b> – rozdíl vysvětluje rada „' + e(NF.LEVERS[un.lever].label) + '“: s ní bývá níž.</div>' : '') +
      (un && un.kind === 'ask' ? '<div class="tip"><b>Zápisy tohoto jídla se liší víc, než je obvyklé.</b> Děláte ho pokaždé stejně (porce, příprava)?<div class="choice-row mt-2">' + btn('Ano, stejně', 'foodSame', f.id, 'sm') + btn('Ne, různě – rozdělit na dvě jídla', 'foodSplit', f.id, 'sm primary') + '</div></div>' : '') +
      (f.sameAsked === 'same' ? '<div class="tip">Nestálé jídlo: reakce kolísá, i když ho děláte stejně. Sledujeme dál.</div>' : '') +
      (lev.length ? '<div class="tip"><b>Co u vás pomohlo</b>' + lev.map(function (x) { return e(NF.LEVERS[x.lever].label) + ': ' + x.st.inTarget + ' z ' + x.st.n + ' v cíli'; }).join(' · ') + '.</div>' : '') +
      (c.level === 'known' && c.reaction && c.reaction.key !== 'mild' && tipLevers(S).length ? '<div class="tip"><b>Co můžete zkusit</b><ul class="bullets">' + tipLevers(S).map(function (x) { return '<li>' + e(x.charAt(0).toUpperCase() + x.slice(1)) + '</li>'; }).join('') + '</ul>Každou radu vám nabídneme před jídlem.</div>' : '') +
      '<details class="more"><summary>Historie zápisů (' + st.eaten + ')</summary><div class="tablewrap"><table><thead><tr><th>Datum</th><th>Porce</th><th>Inzulin</th><th>Rada</th><th>Nejvyšší</th></tr></thead><tbody>' +
      st.list.slice().reverse().slice(0, 8).map(function (ep) {
        var why = NF.whyNotUsable(S, ep), acc = (ep.advice || []).filter(function (a) { return a.accepted === true && a.lever !== 'portion'; }).map(function (a) { return NF.LEVERS[a.lever].label; });
        return '<tr><td class="nowrap">' + e(NF.fmtShort(ep.at)) + '</td><td>' + e(NF.PORTIONS.filter(function (x) { return x[0] === ep.portion; })[0][1]) + '</td><td>' + e(NF.INSULIN[ep.insulin.confirmed]) + (ep.insulin.units != null && ep.insulin.confirmed === 'other' ? ' ' + ep.insulin.units + ' j.' : '') + '</td><td>' + e(acc.join(', ') || '—') + '</td><td>' + (why ? '<span class="missing">' + e(why) + '</span>' : e(NF.mmol(NF.peakOf(ep.points)))) + '</td></tr>';
      }).join('') + '</tbody></table></div></details></div>';
  }
  if (page) return '<section class="card food"><div class="h">' + foodIcon(S, f, c) + '<div><div class="badges mt-0">' + foodBadges(c) + (f.custom ? tag('moje jídlo') : '') + '</div>' +
    (c.level !== 'known' ? '<div class="learn">Učíme se: ' + Math.min(st.n, c.min || 4) + ' ze ' + (c.min || 4) + ' zápisů</div>' : '') + '</div></div><div class="sum">' + sum + '</div>' + detail + '</section>';
  return '<section class="card food"><h2 class="food-h"><button type="button" class="h" data-action="foodOpen" data-value="' + e(f.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' + foodIcon(S, f, c) +
    '<div><div class="name">' + e(f.name) + '</div><div class="badges">' + foodBadges(c) + (f.custom ? tag('moje jídlo') : '') + '</div>' +
    (c.level !== 'known' ? '<div class="learn">Učíme se: ' + Math.min(st.n, c.min || 4) + ' ze ' + (c.min || 4) + ' zápisů</div>' : '') + '</div><span class="chev">' + NF.icon(open ? 'chevron-up' : 'chevron-down') + '</span></button></h2>' +
    '<div class="sum">' + sum + '</div>' + detail + '</section>';
}
V.foodCard = foodCard;

/* ---------- Plán, Bezpečí ---------- */
V.planScreen = function (S) {
  var planOut = planScreenBody(S); return planOut + '<div class="actions mt-1">' + btn(NF.icon('arrow-up') + ' Nahrát export ze senzoru', 'importPage', null, 'quiet') + '</div>';
};
function planScreenBody(S) {
  var p = NF.activePlan(S); if (!p) return head(S, 'Plán', 'Plán vám zatím lékař nevydal');
  var older = S.plans.filter(function (x) { return x.id !== p.id; });
  var ms = (S.fb && S.fb.milestones) || [];
  return head(S, 'Můj plán od ' + NF.fmtShort(p.issuedAt), 'Dávky a návyky') +
    pathCard(S, true) +
    (ms.length ? card('<details class="more"><summary>Vaše milníky (' + ms.length + ')</summary><ul class="plain small">' + ms.slice().reverse().map(function (m) { return '<li>' + e(NF.fmtShort(m.at)) + ' · ' + m.text + '</li>'; }).join('') + '</ul></details>') : '') +
    card('<h2>Kdy a kolik inzulinu</h2>' + dosesTable(p) + '<p class="small muted">Určil lékař ' + e(NF.fmtShort(p.issuedAt)) + '. Dávky nepočítáme ani neměníme – jen je připomínáme a ptáme se, jestli byl inzulin.</p>') +
    card('<h2>Návyky</h2><ul class="plain">' + NF.activeHabits(S).map(function (h) { return '<li><b>' + e(h.title) + '</b><br><span class="small muted">' + e(h.why) + '</span></li>'; }).join('') + '</ul>') +
    card('<h2>Rady, které vám nabízíme</h2><p class="small muted">Nabízíme je před jídlem podle toho, jak na jídlo reagujete. Odpovídat nemusíte.</p>' + adviceList(S, p)) +
    card('<h2>Cíle glukózy</h2>' + (NF.usable(S, 'C-CILE') ? '' : off(S, 'C-CILE')) + kv('V cíli', e(NF.mmol(p.targets.low)) + '–' + e(NF.mmol(p.targets.high)) + ' mmol/l') + kv('Ráno nalačno do', e(NF.mmol(p.targets.fastingHigh)) + ' mmol/l') + kv('Platnost plánu do', e(NF.fmtShort(p.validUntil))) + '<div class="small mt-2">' + appr(S, 'C-CILE') + '</div>') +
    (older.length ? card('<details class="more"><summary>Starší plány (' + older.length + ')</summary><ul class="plain small">' + older.map(function (x) { return '<li><b>' + e(x.id) + '</b> · ' + e(NF.fmtShort(x.issuedAt)) + ' – ' + e(NF.fmtShort(x.validUntil)) + '<br><span class="muted">Zápisy z té doby zůstávají u něj.</span></li>'; }).join('') + '</ul></details>') : '');
};
V.safety = function (S) {
  var p = NF.activePlan(S), ill = S.illness && S.illness.active;
  return head(S, 'Platí vždy, i bez připojení', 'Bezpečí') +
    card('<h2>Kam se obrátit</h2>' + safetyContacts()) +
    card('<h2>Osobní pokyny od lékaře</h2>' + instructionsList(S, p, false, SAFETY_ORDER) + '<p class="small muted mt-2">Zadal lékař ' + (p ? e(NF.fmtShort(p.issuedAt)) : '') + '. Nic k nim nepřidáváme.</p>') +
    card('<div class="sick">' + NF.icon('thermometer') + ' ' + (ill ? 'Nemoc trvá od ' + e(NF.fmtShort(S.illness.from)) : 'Není mi dobře') + ' <button type="button" class="toggle ' + (ill ? 'on' : '') + '" role="switch" aria-checked="' + (ill ? 'true' : 'false') + '" data-action="illness" data-value="' + (ill ? 'off' : 'on') + '" aria-label="Nemoc"></button></div>');
};

/* ---------- report před kontrolou ---------- */
V.preview = function (S) {
  var p = NF.activePlan(S); if (!p) return head(S, 'Před kontrolou', 'Zatím nemáte plán');
  var s = NF.summary(S, p.id), adv = s.advice;
  var known = S.foods.filter(function (f) { return NF.confidence(S, f.id).level === 'known'; });
  var best = null; known.forEach(function (f) { NF.leverStats(S, f.id).forEach(function (x) { if (x.st.n >= 4 && x.st.inTarget / x.st.n >= 0.5 && (!best || x.st.inTarget / x.st.n > best.share)) best = { food: f, lever: x.lever, st: x.st, share: x.st.inTarget / x.st.n }; }); });
  var praise = 'Zapsáno <strong>' + s.meals + ' jídel</strong>, z toho ' + s.usual + ' v obvyklé porci. Inzulin podle plánu u ' + s.asPlan + ' ' + NF.z(s.meals) + ' ' + s.meals + ' jídel.' + /* přímé počty, ne zpětně z procenta; jedno poděkování (21. 10. 2026) */
    (best ? ' U jídla „' + e(best.food.name) + '“ vám pomohl ' + e(NF.LEVERS[best.lever].label.toLowerCase()) + ': ' + best.st.inTarget + ' z ' + best.st.n + ' v cíli.' : '');
  var qs = [];
  if (best) qs.push('Mám pokračovat s tím, že si k ' + best.food.name.toLowerCase() + ' dávám ' + NF.LEVERS[best.lever].label.toLowerCase() + '?');
  if (adv.topReason === 'nothome') qs.push('Rady, které nemám doma, často nepřijmu – dá se to nastavit jinak?');
  if (s.other + s.none > 0) qs.push('Inzulin byl někdy jinak než podle plánu (' + (s.other + s.none) + '×). Je to problém?');
  if (s.illDays) qs.push('Nemoc trvala ' + NF.plural(s.illDays, 'den', 'dny', 'dní') + '. Mám v takové době něco dělat jinak?');
  qs.push('Jsou moje cíle glukózy pořád správné?');
  qs = qs.slice(0, 3); /* 15, odst. 11: tři navržené otázky */
  return head(S, 'Před kontrolou ' + (S.nextVisit ? NF.fmtShort(S.nextVisit) : ''), 'Co uvidí lékař') + importNotice(S) +
    card('<div class="now-row"><div>' + ttl('Díky za ' + NF.plural(Math.max(1, NF.daysBetween(p.issuedAt, S.clock)), 'den', 'dny', 'dní') + ' zapisování') + praise + '<br><span class="small muted">Tohle uvidí lékař: co jste zkusili a jak to dopadlo. Nikoho nehodnotíme.</span></div></div>', 'soft') +
    card('<details class="more"' + (S.previewTile ? ' open' : '') + '><summary>Podrobnosti v číslech</summary><div class="tiles mt-3">' +
      tile('Jídla', s.meals, 'zapsáno' + (s.snacks ? ' · ' + NF.plural(s.snacks, 'svačina', 'svačiny', 'svačin') : ''), 'c-ok', 'meals') + tile('Obvyklá porce', s.usualPct == null ? '—' : s.usualPct + ' %', 'jídel', s.usualPct == null ? 'c-none' : s.usualPct >= 80 ? 'c-ok' : 'c-warn', 'usual') +
      tile('Inzulin', s.asPct == null ? '—' : s.asPct + ' %', 'podle plánu', s.asPct == null ? 'c-none' : s.asPct >= 80 ? 'c-ok' : 'c-warn', 'ins') + tile('Rady', adv.accepted.n, 'přijato · ' + adv.declined.n + ' odmítnuto', adv.works === 'yes' ? 'c-ok' : 'c-none', 'adv') + '</div><div class="small mt-1 mb-2">' + appr(S, 'C-CILE') + ' ' + appr(S, 'S-SOUHRN') + '</div>' +
      (S.previewTile ? '<div class="hint neutral">' + e(previewDetail(S, s, S.previewTile)) + '</div>' : '<p class="small muted">Klepněte na dlaždici pro vysvětlení.</p>') + '</details>') +
    card('<h2>Vaše návyky v tomto plánu</h2><ul class="plain">' + NF.activeHabits(S).map(function (h) { return '<li>' + e(h.title) + '</li>'; }).join('') + '</ul><p class="small muted">Jak se vám dařilo, je v číslech výše; návyky si lékař s vámi projde na kontrole.</p>') +
    card('<h2>Na co se zeptat lékaře</h2><p class="small muted">Klepněte na otázku, kterou si chcete vzít na kontrolu.</p><div class="choice-row col">' +
      qs.map(function (q) { return choice(e(q), 'toggleQuestion', q, S.questions.some(function (x) { return x.text === q; })); }).join('') + '</div>' +
      '<details class="more mt-3"><summary>Chci se zeptat na něco jiného</summary><label class="field"><span>Vlastní otázka</span><textarea data-bind="form.question" placeholder="Napište vlastními slovy">' + e((S.form && S.form.question) || '') + '</textarea></label><div class="actions">' + btn('Uložit otázku', 'saveQuestion', null, 'primary') + '</div></details>') +
    hint('<b>Otázky a přehled uvidí lékař až s vámi v ordinaci.</b> Mezi kontrolami je nikdo nečte.');
};
function tile(k, v, d, cls, key) { return '<button type="button" class="tile ' + cls + '" data-action="previewTile" data-value="' + key + '"><div class="k"><i></i>' + e(k) + '</div><div class="v">' + e(String(v)) + '</div><div class="d">' + e(d) + '</div></button>'; }
function previewDetail(S, s, key) {
  return { meals: 'Každý zápis nás učí, jak vaše tělo reaguje. ' + s.incomplete + ' zápisů má mezeru v datech ze senzoru a ' + s.ill + ' je z doby nemoci – ty se do učení nepočítají, ale lékař je vidí.',
    usual: 'Obvyklá porce je množství, na které lékař nastavil dávku. Čím častěji ji držíte, tím lépe dávka sedí a tím přesněji umíme radit.',
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
  var instrChange = JSON.stringify(p.instructions) !== JSON.stringify(prev.instructions) || JSON.stringify(p.targets) !== JSON.stringify(prev.targets) ? '<p><b>Pokyny a cíle:</b> lékař je upravil – najdete je v Bezpečí a v Plánu.</p>' : '';
  var adviceChange = advOff.length || advOn.length ? '<p>' + (advOff.length ? (advOff.length > 1 ? 'Rady „' : 'Radu „') + e(advOff.map(function (l) { return NF.LEVERS[l].label; }).join('“, „')) + '“ vám už nenabízíme – lékař ' + (advOff.length > 1 ? 'je' : 'ji') + ' vypnul. ' : '') + (advOn.length ? 'Místo toho vám budeme nabízet „' + e(advOn.map(function (l) { return NF.LEVERS[l].label; }).join('“, „')) + '“.' : '') + ' Dávky se tím nemění.</p>' : '';
  return head(S, 'Nový plán · ' + p.id, 'Co se změnilo') +
    card('<div class="now-row"><div>' + ttl('Co teď') + 'Projděte si změny a klepněte na „Rozumím, pokračuji“. Od teď platí nový plán.</div></div>') +
    card('<h2>Dávky inzulinu</h2>' + (doseChanges.length ? hint('<b>Nová dávka: učíme se znovu.</b> S novou dávkou bude tělo reagovat jinak, proto u těchto jídel začínáme od nuly. Staré zápisy zůstávají označené původní dávkou.', 'neutral') : '<p>Beze změny.</p>') + dosesTable(p, prev)) +
    card('<h2>Návyky a rady</h2>' + (added.length ? '<p><b>Nové:</b> ' + e(added.map(function (h) { return h.title; }).join(', ')) + '</p>' : '') + (removed.length ? '<p><b>Končí:</b> ' + e(removed.map(function (h) { return h.title; }).join(', ')) + '</p>' : '') + adviceChange + instrChange + (!added.length && !removed.length && !adviceChange && !instrChange ? '<p>Pokračují beze změny.</p>' : '') +
      (p.decisions && p.decisions.length ? '<details class="more"><summary>Proč lékař rozhodl takto</summary><ul class="plain small">' + p.decisions.map(function (d) { return '<li><b>' + e(d.title) + '</b> – ' + e(d.text) + '</li>'; }).join('') + '</ul></details>' : '')) +
    '<div class="actions">' + (p.understood ? btn('Přejít na Dnes', 'page', 'today', 'primary big') : btn('Rozumím, pokračuji', 'confirmUnderstanding', null, 'primary big')) + '</div>';
};

})(typeof window !== 'undefined' ? window : globalThis);
