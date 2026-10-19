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
/* Štítek položky registru u místa, kde působí: ◌ ke schválení · ✓ schváleno · ✎ s úpravou · ✕ zamítnuto. Klepnutí otevře vysvětlení.
   U zamítnuté položky následuje oznámení „tahle část nefunguje“ (prezentační vrstva přes NF.slots.offNotice; produkce bez ní nic nepřidá). */
var APPR = { pending: ['pend', 'circle-dashed', 'ke schválení', 'Pravidlo ke schválení: '], approved: ['', 'check', '', 'Schválené pravidlo: '], edited: ['edit', 'pencil', 'upraveno', 'Schválené pravidlo s úpravou: '], rejected: ['rej', 'x', 'zamítnuto', 'Zamítnuté pravidlo: '] };
function appr(S, id) {
  var r = NF.item(S, id);
  if (!r || r.scope === 'provozni') return ''; /* provozní položky schvaluje vlastník; pacient ani garant štítek nevidí (18. 10. 2026) */
  var st = NF.itemState(S, id), m = APPR[st] || APPR.pending;
  return '<button type="button" class="appr ' + m[0] + '" data-action="openItem" data-value="' + e(id) + '" title="' + e((m[2] || 'schváleno') + ' · ' + r.title) + '" aria-label="' + m[3] + e(r.title) + '"><span aria-hidden="true">' + NF.icon(m[1]) + '</span> ' + e(r.title) + (m[2] ? ' <span class="st">· ' + m[2] + '</span>' : '') + '</button>' + (st === 'rejected' ? off(S, id) : '');
}
function off(S, id) { return NF.slots.offNotice ? NF.slots.offNotice(S, id) : ''; }
/* Zamítnuté páky rad (a pravidlo mizení): oznámení tam, kde by rada byla. */
function offLevers(S) {
  return Object.keys(NF.LEVERS).filter(function (l) { return l !== 'portion' && !NF.usable(S, NF.LEVERS[l].item); }).map(function (l) { return off(S, NF.LEVERS[l].item); }).join('') + (NF.usable(S, 'R-ZMIZELA') ? '' : off(S, 'R-ZMIZELA'));
}
V.btn = btn; V.choice = choice; V.hint = hint; V.kv = kv; V.tag = tag; V.card = card; V.glass = glass; V.appr = appr; V.off = off; V.offLevers = offLevers;

var LEVEL = { known: ['Známé jídlo', 'known'], similar: ['Podobné jídlo', 'similar'], learning: ['Učíme se', 'similar'], unstable: ['Nestálé jídlo', 'unknown'], unknown: ['Neznámé jídlo', 'unknown'], none: ['Bez vyhodnocení', 'unknown'] };
function levelTag(level, conf) { var l = LEVEL[level] || LEVEL.unknown; return tag(level === 'learning' && conf ? 'Učíme se · ' + conf.st.n + ' z ' + (conf.min || 3) : l[0], l[1]); }
function reactionTag(r) { return r ? tag(r.label, r.cls) : ''; }
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
  var n = Math.min(conf.min || 3, conf.st.n), just = !!(NF.flash && NF.flash.food === food.id);
  return '<div class="emoji' + (just ? ' just' : '') + '">' + ring(n, conf.min || 3, just) + foodIco(food) + (conf.level === 'known' ? '<span class="ck">' + NF.icon('check') + '</span>' : '') + '</div>';
}
V.foodIco = foodIco; V.foodIcon = foodIcon;

/* Rozmezí vrcholů jako okno na stupnici zelená → červená (osa 4–16). */
function pos(v) { return Math.max(0, Math.min(100, (v - 4) / 12 * 100)); }
function rowTrack(label, lo, hi, cls, wide, goalV) {
  if (lo == null || hi == null) return '';
  var l = pos(lo), r = pos(hi);
  return '<div class="row ' + (cls || '') + '"><span class="rl">' + e(label) + '</span><div class="track' + (wide ? ' wide' : '') + '" style="--goal:' + pos(goalV != null ? goalV : 10) + '%">' +
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
    var aLo = base.n ? base.lo : st.lo, aHi = base.n ? base.hi : st.hi;
    rows += rowTrack(best ? 'bez rady' : 'obvykle', aLo, aHi, '', false, t.high);
    if (best) rows += rowTrack(LEVER_WITH[best.lever] || 's radou', best.st.lo, best.st.hi, 'adv', false, t.high);
    var half = st.peaks.slice(0, Math.ceil(st.peaks.length / 2));
    var prev = st.peaks.length > 6 ? { lo: NF.r1(NF.quantile(half, 0.1)), hi: NF.r1(NF.quantile(half, 0.9)) } : null;
    note = 'Vlevo od čáry jste v cíli. ' + (best ? 'S ' + LEVER_WITH[best.lever].slice(2) + ' skončíte <b>' + best.st.inTarget + ' z ' + best.st.n + '</b> v cíli. ' : '') +
      (st.quantile ? 'Z ' + st.n + ' zápisů bez krajních hodnot' : 'Ze ' + st.n + ' zápisů; s dalšími se upřesní') + (prev && st.quantile && (prev.lo !== st.lo || prev.hi !== st.hi) ? '; po prvních ' + half.length + ' bylo ' + e(NF.mmol(prev.lo)) + '–' + e(NF.mmol(prev.hi)) + '.' : '.');
  } else if (conf.level === 'similar') {
    inT = '<span class="in tag info">odhad z podobných</span>';
    rows += rowTrack('podobná jídla', conf.pool.lo, conf.pool.hi, '', true, t.high);
    note = 'Tohle jídlo u vás ještě neznáme. Rozmezí je ' + (conf.pool.explicit ? 'z jídla, které jste označili za podobné (' : 'z ' + conf.pool.n + ' zápisů jídel se stejným zdrojem sacharidů, úpravou a formou (') + e(conf.like.map(function (f) { return f.name; }).slice(0, 2).join(', ')) + '). Je to jen hrubý odhad; s vašimi vlastními zápisy se upřesní.';
  } else if (conf.level === 'learning') {
    var imp = conf.impression, stageWord = st.n === 1 ? 'první dojem' : imp === 'mixed' ? 'zápisy se liší' : 'zatím to vypadá';
    inT = '<span class="in tag ' + (imp === 'in' ? 'ok' : imp === 'over' ? 'warn' : '') + '">' + stageWord + '</span>';
    rows += rowTrack(st.n === 1 ? 'tentokrát' : 'zatím', st.lo, st.hi, '', st.n === 1, t.high);
    if (conf.pool) rows += rowTrack('podobná jídla', conf.pool.lo, conf.pool.hi, '', true, t.high);
    note = st.n === 1 ? ('První zápis: tentokrát ' + (imp === 'in' ? 'v cíli' : 'nad cílem') + '. Jeden den nic neřekne, zapisujte dál — příště o jídle budeme vědět víc.')
      : imp === 'mixed' ? 'Dva zápisy se liší (jednou v cíli, jednou nad ním). Potřebujeme třetí, pak jídlo známe.'
      : imp === 'in' ? 'Zatím to vypadá, že po něm zůstáváte v cíli. Ještě jednou a bude známé.'
      : 'Tohle jídlo vás zatím zatížilo víc, než jsme čekali — v obou zápisech nad cílem. Dáme mu ještě jednu šanci, ať víme jistě. Porce ať není větší než obvyklá.';
  } else return '';
  var alt = conf.level === 'known' ? 'Stupnice glukózy 4 až 16 mmol/l, hranice cíle ' + NF.mmol(t.high) + ' mmol/l. Bez rady ' + NF.mmol(aLo) + ' až ' + NF.mmol(aHi) + ' mmol/l' + (best && best.st.lo != null ? ', ' + (LEVER_WITH[best.lever] || 's radou') + ' ' + NF.mmol(best.st.lo) + ' až ' + NF.mmol(best.st.hi) + ' mmol/l' : '') + '.'
    : conf.level === 'learning' ? 'Stupnice glukózy 4 až 16 mmol/l, hranice cíle ' + NF.mmol(t.high) + ' mmol/l. Zatím ' + st.n + ' z ' + (conf.min || 3) + ' zápisů: ' + NF.mmol(st.lo) + ' až ' + NF.mmol(st.hi) + ' mmol/l.'
    : 'Stupnice glukózy 4 až 16 mmol/l, hranice cíle ' + NF.mmol(t.high) + ' mmol/l. Odhad z podobných jídel ' + NF.mmol(conf.pool.lo) + ' až ' + NF.mmol(conf.pool.hi) + ' mmol/l.';
  return '<div class="peak"><div class="lbl"><span>Kam se po něm glukóza dostane</span>' + inT + '</div>' +
    '<div class="rows" role="img" aria-label="' + e(alt) + '"><div class="goal" style="left:calc(72px + (100% - 72px) * ' + (pos(t.high) / 100) + ')"><span>hranice cíle ' + e(NF.mmol(t.high)) + ' mmol/l</span></div>' + rows + '</div>' +
    '<div class="axis" aria-hidden="true"><span>4</span><span>7</span><span>10</span><span>13</span><span>16</span></div>' +
    '<div class="axis-words"><span>v cíli</span><span>nad cílem</span></div>' +
    '<div class="note">' + note + '</div></div>';
}
V.peakBlock = peakBlock;

/* ---------- navigace ---------- */
function tabbar(S) {
  var items = [['today', 'Dnes', 'home'], ['foods', 'Jídla', 'utensils'], ['plan', 'Plán', 'list'], ['safety', 'Bezpečí', 'shield']];
  return '<nav class="glass tabbar" aria-label="Hlavní nabídka">' + items.map(function (it) {
    return '<button type="button" data-action="page" data-value="' + it[0] + '" class="' + (S.page === it[0] ? 'active' : '') + '"' + (S.page === it[0] ? ' aria-current="page"' : '') + '><span class="ic" aria-hidden="true">' + NF.icon(it[2]) + '</span>' + e(it[1]) + '</button>';
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
    case 'import': body = V.importPage(S); break;
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
function explainerKey(S) {
  var svg = '<svg viewBox="0 0 320 162" role="img" aria-label="Dávka inzulinu je nastavená na obvyklou porci: s ní zůstane glukóza v cíli. Větší porce ji vyžene nad cíl; návrat k obvyklé porci ji vrátí.">' +
    '<line class="kbase" x1="46" y1="98" x2="104" y2="98"/>' +
    '<rect class="kband" x="104" y="88" width="208" height="20" rx="5"/><text class="kt" x="310" y="84" text-anchor="end">pásmo cíle</text>' +
    sceneIcon('syringe', 6, 80, 36, 'ksyr') +
    '<g class="kplate"><circle class="krim" cx="76" cy="98" r="22"/><circle class="krim2" cx="76" cy="98" r="15.5"/><circle class="kfood" cx="76" cy="98" r="9"/></g>' +
    '<path class="kline" d="M104 101 C130 100 150 92 175 91 S230 95 262 98 S300 102 312 102"/>' +
    '<path class="khigh" d="M104 101 C130 92 150 42 185 36 S240 60 268 84 S300 97 312 98"/>' +
    '<text class="kl kl1" x="104" y="124">1 · Obvyklá porce → v cíli</text>' +
    '<text class="kl kl2" x="104" y="140">2 · Větší porce → nad cíl</text>' +
    '<text class="kl kl3" x="104" y="156">3 · Zpět k obvyklé → zase v cíli</text></svg>';
  return glass('<h2>Jak NutriFee funguje</h2><p class="small muted">Dávka inzulinu od lékaře je jako klíč vyrobený na vaši obvyklou porci. My vám pomůžeme porci držet a z vaší reakce se učíme.</p>' + animWrap('key', svg), 'soft');
}
/* Co aplikace nedělá: tři přeškrtnuté piktogramy. */
function notsCard(S) {
  var items = [['sigma', 'nepočítáme sacharidy'], ['syringe', 'neměníme dávku inzulinu'], ['eye', 'nikdo nečte zápisy mezi kontrolami']];
  var body = '<div class="nots">' + items.map(function (it, i) {
    return '<div class="not"><span class="pic"><span class="pi">' + NF.icon(it[0]) + '</span><svg class="strike-svg" viewBox="0 0 40 40" aria-hidden="true"><path class="strike s' + (i + 1) + '" d="M6 34L34 6"/></svg></span><small>' + e(it[1]) + '</small></div>';
  }).join('') + '</div>';
  return glass('<h2>Co aplikace nedělá</h2>' + animWrap('nots', body, 'Na nízkou či vysokou glukózu vás upozorňuje aplikace vašeho senzoru. S potížemi teď pomůže Bezpečí.'), 'sand');
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
    '<text class="axc" x="160" y="94" text-anchor="middle">tady se zápis počítá do učení</text></svg></div>';
}
/* Mikroanimace rad: pořadí jídla · doplněk · procházka. */
function leverAnim(lever, food) {
  var svg = '';
  if (lever === 'order') {
    var first = food && food.first ? String(food.first) : '';
    var segs = first ? [[first, 'M30 30L30 6A24 24 0 0 1 30 54z'], ['zbytek', 'M30 30L30 54A24 24 0 0 1 30 6z']]
      : [['zelenina', 'M30 30L30 6A24 24 0 0 1 50.8 42z'], ['maso', 'M30 30L50.8 42A24 24 0 0 1 9.2 42z'], ['zbytek', 'M30 30L9.2 42A24 24 0 0 1 30 6z']];
    var pos = first ? [[42, 34], [18, 34]] : [[40, 22], [30, 46], [20, 22]];
    svg = '<svg viewBox="0 0 150 60" aria-hidden="true"><circle class="prim" cx="30" cy="30" r="27"/>' + segs.map(function (s, i) {
      return '<path class="sec s' + (i + 1) + '" d="' + s[1] + '"/><text class="n n' + (i + 1) + '" x="' + pos[i][0] + '" y="' + pos[i][1] + '" text-anchor="middle">' + (i + 1) + '</text>';
    }).join('') + segs.map(function (s, i) { return '<text class="lab l' + (i + 1) + '" x="66" y="' + (segs.length === 2 ? 24 + i * 18 : 18 + i * 15) + '">' + (i + 1) + ' ' + e(s[0]) + '</text>'; }).join('') + '</svg>';
  }
  else if (lever === 'addon') svg = '<svg viewBox="0 0 150 60" aria-hidden="true">' + scenePlate(32, 30, 26, null) +
    '<g class="bowl">' + scenePlate(100, 30, 16, null) + '</g><text class="plus" x="63" y="35" text-anchor="middle">+</text></svg>';
  else if (lever === 'walk') svg = '<svg viewBox="0 0 150 60" aria-hidden="true"><line class="ground" x1="6" y1="52" x2="86" y2="52"/>' +
    '<g class="steps">' + sceneIcon('walk', 8, 24, 24, 'st st1') + sceneIcon('walk', 34, 17, 24, 'st st2') + sceneIcon('walk', 60, 10, 24, 'st st3') + '</g>' +
    '<circle class="ringbg" cx="120" cy="30" r="18"/><circle class="ringfg" cx="120" cy="30" r="18"/><line class="hand" x1="120" y1="30" x2="120" y2="14"/><text class="min" x="120" y="34" text-anchor="middle">15 min</text></svg>';
  else return '';
  return '<div class="lever-anim play" data-anim="' + lever + '" data-lever="' + lever + '">' + svg + '</div>'; /* bez „Přehrát znovu“ u mikroanimací (19. 10. 2026) */
}
V.explainerKey = explainerKey; V.notsCard = notsCard; V.insulinAxis = insulinAxis; V.leverAnim = leverAnim;

/* ---------- převzetí a ověření ---------- */
V.takeover = function (S) {
  var p = NF.activePlan(S);
  if (!p) return head(S, 'V ordinaci', 'Plán zatím nemáte') + glass('<p>Lékař s vámi právě prochází zařazení. Až vám plán vydá, uvidíte ho tady.</p>');
  var habits = S.habits.filter(function (h) { return h.planId === p.id; });
  return head(S, 'V ordinaci · převzetí plánu', 'Váš plán ' + p.id) +
    glass('<div class="now"><span class="ic" aria-hidden="true">' + NF.icon('flag') + '</span><div><b>Co teď</b>Projděte si dávky a návyky. Pak klepněte dole na „Plán přebírám“ a odpovíte na jednu otázku.</div></div>') +
    goalCard(S) +
    glass('<h2>Vaše dávky inzulinu</h2>' + dosesTable(p) + '<p class="small muted">Určil je lékař. My je jen připomínáme a ptáme se, jestli byl inzulin podaný. Nikdy je nepočítáme ani neměníme.</p>') +
    glass('<h2>Vaše návyky</h2><ul class="plain">' + habits.map(function (h) { return '<li><b>' + e(h.title) + '</b><br><span class="small muted">' + e(h.why) + '</span></li>'; }).join('') + '</ul>') +
    glass('<h2>Osobní pokyny od lékaře</h2><p class="small muted">Najdete je kdykoli v části Bezpečí. Platí i bez připojení.</p>' + instructionsList(S, p, true)) +
    explainerKey(S) + notsCard(S) +
    '<div class="actions">' + btn('Plán přebírám →', 'page', 'understand', 'primary big') + '</div>';
};
V.understand = function (S) {
  var a = S.onboarding.checkAnswer, trained = !!(S.training && S.training.result === 'done');
  return head(S, 'V ordinaci · jedna otázka', 'Uvidí lékař můj zápis hned?') +
    glass('<p class="muted">Za odpověď vás nikdo nehodnotí. Jen si ověříme, že víte, jak aplikace funguje.</p>' +
      '<div class="choice-row">' + choice('Ano, hned', 'answerCheck', 'yes', a === 'yes', 'big') + choice('Ne, až na kontrole', 'answerCheck', 'no', a === 'no', 'big') + '</div>' +
      (a === 'yes' ? hint('<b>Ještě ne.</b> Zápis <b>není zpráva do ordinace</b> — nikdo ho průběžně nečte. Lékař ho uvidí až v přehledu na kontrole. Když máte potíže teď, otevřete Bezpečí.', 'warn') : '') +
      (a === 'no' ? hint('<b>Přesně tak.</b> Zápisy slouží vám a rozhovoru na kontrole. S potížemi teď pomůže Bezpečí, s technikou technická podpora.', 'ok') : '')) +
    '<div class="actions">' + btn('Začít', 'confirmUnderstanding', null, 'primary big', a === 'no' && trained ? '' : ' disabled') + '</div>' +
    (a !== 'no' ? '<p class="small muted" style="text-align:center">Tlačítko se odemkne po správné odpovědi.</p>' : !trained ? hint('<b>Zaučení u sestry nebylo dokončeno.</b> Návyky zatím nezačnou platit. Domluvte se se sestrou na novém zaučení.', 'warn') : '');
};

function dosesTable(p) {
  var d = p.doses;
  return '<div>' + NF.MEALS.map(function (m) { return kv(NF.mealLabel(m[0], true), '<b>' + d[m[0]].units + ' j.</b>'); }).join('') + '<div class="kv basal-kv"><span>' + NF.icon('moon') + ' Inzulin na noc (bazál) · ' + e(d.basal.time) + '</span><strong><b>' + d.basal.units + ' j.</b></strong></div></div>';
}
V.dosesTable = dosesTable;
function instructionsList(S, p, compact, order) {
  var cat = NF.instructionCatalog();
  var list = ((p && p.instructions) || []).slice();
  if (order) list.sort(function (x, y) { var ix = order.indexOf(x.id), iy = order.indexOf(y.id); return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy); }); /* nejnaléhavější pokyny první (18. 10. 2026) */
  if (!list.length) return '<p class="small muted">Lékař zatím pokyny nezadal.</p>';
  return '<ul class="plain">' + list.map(function (i) {
    var c = cat.filter(function (x) { return x.id === i.id; })[0] || { title: i.id, text: '' };
    var txt = (c.text || '').replace('{v}', '<b>' + e(String(i.value).replace('.', ',')) + (c.unit ? ' ' + e(c.unit) : '') + '</b>');
    return '<li><b>' + e(c.title) + '</b><br><span class="small' + (compact ? ' muted' : '') + '">' + txt + '</span></li>';
  }).join('') + '</ul>';
}
V.instructionsList = instructionsList;
/* Text jednoho pokynu lékaře (s hodnotou), nebo prázdný řetězec, když ho lékař nezadal. */
function instructionText(S, id) {
  var cat = NF.instructionCatalog();
  var i = NF.instructions(S).filter(function (x) { return x.id === id; })[0], c = cat.filter(function (x) { return x.id === id; })[0];
  if (!i || !c) return '';
  return '<br><b>Pokyn lékaře:</b> ' + (c.text || '').replace('{v}', '<b>' + e(String(i.value).replace('.', ',')) + (c.unit ? ' ' + e(c.unit) : '') + '</b>');
}

/* Pokyny pro nemoc: bazál a inzulin k jídlu vedle sebe (rozdělený pokyn, 18. 10. 2026), ostatní pokyny sbalené. */
function illnessInstructions(S, p) {
  var cat = NF.instructionCatalog(), list = (p && p.instructions) || [];
  var one = function (id) {
    var i = list.filter(function (x) { return x.id === id; })[0], c = cat.filter(function (x) { return x.id === id; })[0];
    if (!i || !c) return '';
    var txt = (c.text || '').replace('{v}', '<b>' + e(String(i.value).replace('.', ',')) + (c.unit ? ' ' + e(c.unit) : '') + '</b>');
    return '<div class="box"><div class="k">' + e(c.title) + '</div><p class="small" style="margin:4px 0 0">' + txt + '</p></div>';
  };
  var two = one('I-NEMOC-BAZAL') + one('I-NEMOC-JIDLO'), rest = list.filter(function (x) { return !/^I-NEMOC/.test(x.id); });
  return glass('<h2>Pokyny lékaře pro nemoc</h2>' + (two ? '<div class="grid2 ill-two">' + two + '</div>' : '<p class="small muted">Lékař pokyny pro nemoc nezadal.</p>') +
    (rest.length ? '<details class="more" style="margin-top:8px"><summary>Další pokyny lékaře</summary>' + instructionsList(S, { instructions: rest }, true) + '</details>' : ''));
}

/* ---------- zpětná vazba: výsledek, milník, týden, cesta ke kontrole (15, odst. 7b) ---------- */
function goalCard(S) {
  var T = NF.texts(S, 'S-CESTA'); if (!T || !T.goal) return '';
  return glass('<h2>Cíl do kontroly</h2><p>' + T.goal + '</p>', 'soft');
}
/* Pruh start → vrchol (15, odst. 6): stejná vodorovná stupnice jako u jídla (18. 10. 2026) — kroužek = při jídle, plný bod = vrchol, čárkovaná hranice cíle; žádná křivka, žádné velké číslo „před jídlem“. */
function riseBar(S, r) {
  if (['okAdvice', 'okPlain', 'highAdvice', 'highPlain'].indexOf(r.key) < 0) return '';
  var g = NF.glucoseOf(S, r.ep), start = g.before, peak = g.peak, high = NF.targets(S).high; if (peak == null || start == null) return '';
  var ok = peak <= high, ps = pos(start), pp = pos(peak), lo = Math.min(ps, pp), hi = Math.max(ps, pp);
  return '<div class="rise ' + (ok ? 'ok' : 'bad') + '" role="img" aria-label="' + e('Glukóza při jídle ' + NF.mmol(start) + ', vrchol ' + NF.mmol(peak) + ' mmol/l, hranice cíle ' + NF.mmol(high) + ' mmol/l.') + '">' +
    '<div class="track" style="--goal:' + pos(high) + '%"><div class="dim" style="left:0;width:' + lo + '%"></div><div class="dim" style="left:' + hi + '%;right:0"></div><div class="span" style="left:' + lo + '%;width:' + Math.max(1, hi - lo) + '%"></div><div class="goal" style="left:' + pos(high) + '%"></div><span class="mark s" style="left:' + ps + '%"></span><span class="mark p" style="left:' + pp + '%"></span></div>' +
    '<div class="axis" aria-hidden="true"><span>4</span><span>7</span><span>10</span><span>13</span><span>16</span></div>' +
    '<div class="lbl"><span>při jídle<b>' + e(NF.mmol(start)) + '</b></span><span class="peak-v">nejvyšší<b>' + e(NF.mmol(peak)) + '</b></span><span>cíl do<b>' + e(NF.mmol(high)) + '</b></span></div></div>';
}
function resultCard(S, compact) {
  var r = NF.lastResult(S); if (!r) return NF.usable(S, 'S-VYSLEDEK') ? '' : off(S, 'S-VYSLEDEK');
  var rc = NF.confidence(S, r.food.id, r.ep.meal), g = NF.glucoseOf(S, r.ep), high = NF.targets(S).high;
  var body = '<div class="now">' + foodIcon(S, r.food, rc) + '<div><b>Jak to dopadlo</b>' + r.text + riseBar(S, r) + (g.source === 'manual' ? '<p class="small muted" style="margin:4px 0 0">Podle hodnot, které jste opsali; export ze senzoru je upřesní.</p>' : '') + divergenceBlock(S, r.ep) + (r.key === 'excluded' && r.smaller ? '<br><span class="small">' + instructionText(S, 'I-MENE').replace(/^<br>/, '') + '</span>' : '') +
    '<div class="actions" style="margin-top:10px">' + btn('Rozumím', 'resultSeen', r.ep.id, 'sm') + btn('Zobrazit jídlo', 'openFood', r.food.id, 'quiet sm') + '</div></div></div>' +
    '<div class="small" style="margin-top:6px">' + appr(S, 'S-VYSLEDEK') + '</div>';
  if (!compact) return glass(body, 'result');
  /* když je na řadě další jídlo, výsledek minulého je jeden řádek s rozbalením (18. 10. 2026: akce před informací) */
  var st = g.peak == null ? 'bez hodnoty' : NF.mmol(g.peak) + ' · ' + (g.peak <= high ? 'v cíli' : 'nad cílem');
  return glass('<details class="more result-compact"><summary>' + NF.icon('plate') + '<span><b>Jak to dopadlo</b> · ' + e(NF.mealLabel(r.ep.meal)) + '</span><span class="st">' + e(st) + '</span></summary>' + body + '</details>', 'result');
}
/* Zapsáno + „Opravit inzulin“: do 60 minut po zápisu hlavního jídla (R6). */
function fixInsulinCard(S) {
  var eps = S.episodes.filter(function (x) { return !NF.isSnack(x.meal) && NF.canCorrectInsulin(S, x); });
  if (!eps.length) return '';
  var ep = eps[eps.length - 1], f = NF.foodById(S, ep.foodId), open = S.fixInsulin === ep.id;
  var ins = ep.insulin.confirmed === 'as' ? 'inzulin ' + ep.insulin.units + ' j. podle plánu' : ep.insulin.confirmed === 'other' ? 'inzulin ' + ep.insulin.units + ' j. (jinak)' : ep.insulin.confirmed === 'none' ? 'bez inzulinu' : 'inzulin „nevím“';
  var left = NF.param(S, 'D-CISTA', 'oprava_min', 60) - NF.minutesDiff(ep.recordedAt || ep.at, S.clock);
  return glass('<div class="now">' + foodIcon(S, f, NF.confidence(S, f.id, ep.meal)) + '<div><b>Zapsáno: ' + e(NF.mealLabel(ep.meal)) + ' · ' + e(f ? f.name : '') + '</b>' + e(ins) + (ep.insulinCorrected ? ' · opraveno' : '') +
    '<div class="actions" style="margin-top:8px">' + btn(open ? 'Zavřít' : 'Opravit inzulin', 'fixInsulinOpen', ep.id, 'sm' + (open ? '' : ' quiet')) + '<span class="small muted">ještě ' + NF.plural(Math.max(0, left), 'minutu', 'minuty', 'minut') + '</span></div>' +
    (open ? '<div class="choice-row" style="margin-top:8px">' + choice('Podle plánu, ' + ep.insulin.prescribed + ' j.', 'fixInsulin', ep.id + ':as', false, 'sm') + choice('Jinak', 'fixInsulinOther', ep.id, !!S.fixInsulinOther, 'sm') + choice('Nepíchnuto', 'fixInsulin', ep.id + ':none', false, 'sm') + choice('Nevím', 'fixInsulin', ep.id + ':unknown', false, 'sm') + '</div>' +
      (S.fixInsulinOther ? '<div class="actions"><div class="stepper">' + btn(NF.icon('minus'), 'fixInsulinUnits', '-1') + '<span class="val">' + (S.fixInsulinUnits != null ? S.fixInsulinUnits : ep.insulin.prescribed) + ' j.</span>' + btn(NF.icon('plus'), 'fixInsulinUnits', '1') + '</div>' + btn('Uložit opravu', 'fixInsulin', ep.id + ':other', 'primary sm') + '</div>' : '') +
      '<p class="small muted" style="margin:6px 0 0">Opravený zápis se učí dál, do návrhu k dávce pro lékaře už nejde.</p>' : '') + '</div></div>', 'soft');
}
function milestoneCard(S) {
  var m = NF.pendingMilestone(S); if (!m) return NF.usable(S, 'R-MILNIKY') ? '' : off(S, 'R-MILNIKY');
  return glass('<div class="now"><span class="ic" aria-hidden="true">' + NF.icon('award') + '</span><div><b>Milník</b>' + m.text +
    '<div class="actions" style="margin-top:10px">' + btn('Zavřít', 'milestoneClose', m.id, 'sm') + '</div></div></div>' +
    '<div class="small" style="margin-top:6px">' + appr(S, 'R-MILNIKY') + '</div>', 'milestone');
}
function weekCard(S) {
  var w = NF.weekSummary(S), T = NF.texts(S, 'S-TYDEN'); if (!NF.usable(S, 'S-TYDEN')) return off(S, 'S-TYDEN'); if (!w || !T) return '';
  var lines = [NF.fillText(T.meals, { meals: w.meals, usual: w.usual })];
  if (w.best) lines.push(NF.fillText(T.helped, { lever: NF.LEVERS[w.best.lever].label, k: w.best.k, n: w.best.n }));
  if (w.milestones.length) lines.push(T.milestone ? NF.fillText(T.milestone, { n: w.milestones.length }) + ' ' + w.milestones[w.milestones.length - 1].text.replace(/<\/?strong>/g, '') : ''); /* text milníku je už escapovaný (P4) */
  if (w.suggest) lines.push(NF.fillText(T.suggest, { food: w.suggest.food, lever: NF.leverNoun(w.suggest.lever), k: w.suggest.k, n: w.suggest.n }));
  lines.push(T.thanks || '');
  return glass('<div class="now"><span class="ic" aria-hidden="true">' + NF.icon('calendar') + '</span><div><b>' + e(NF.fillText(T.head, { week: w.week })) + '</b>' + lines.filter(Boolean).map(function (l) { return '<p style="margin:4px 0">' + l + '</p>'; }).join('') +
    '<div class="actions" style="margin-top:10px">' + btn('Zavřít', 'weekClose', w.id, 'sm') + (NF.importDue(S).missing ? btn('Nahrát data ze senzoru', 'importPage', null, 'sm') : '') + '</div></div></div>' +
    '<div class="small" style="margin-top:6px">' + appr(S, 'S-TYDEN') + '</div>', 'week');
}
function pathCard(S, withPreview) {
  var ps = NF.pathStats(S), T = NF.texts(S, 'S-CESTA'); if (!NF.usable(S, 'S-CESTA')) return off(S, 'S-CESTA'); if (!ps || !T) return '';
  var pct = Math.round(ps.gone / ps.total * 100);
  return glass('<div style="display:flex;justify-content:space-between;font-weight:800"><span>Cesta ke kontrole</span><span class="muted" style="font-weight:600">' + e(NF.fmtShort(ps.visit)) + '</span></div>' +
    '<div class="bar" aria-hidden="true"><span style="width:' + pct + '%"></span></div>' +
    '<div class="hero-num sm">' + ps.left + '<small>' + (ps.left === 1 ? 'den' : ps.left >= 2 && ps.left <= 4 ? 'dny' : 'dní') + ' do kontroly</small></div><div class="hero-cap">' + ps.week + '. týden plánu</div>' +
    '<div class="row3"><div><b>' + ps.known + ' z ' + ps.repeated + '</b><span class="tiny muted">vašich častých jídel známe</span></div>' +
    '<div><b>' + ps.weekMeals + ' z ' + ps.weekSlots + '</b><span class="tiny muted">jídel zapsáno tento týden</span></div>' +
    '<div><b>' + ps.weekConfirmed + ' z ' + ps.weekMeals + '</b><span class="tiny muted">inzulin potvrzen tento týden</span></div></div>' +
    '<p class="small muted" style="margin:10px 0 0">' + T.visit + '</p>' +
    (withPreview ? '<div class="actions" style="margin-top:10px">' + btn('Co uvidí lékař →', 'page', 'preview', 'sm') + '</div>' : '') +
    '<div class="small" style="margin-top:6px">' + appr(S, 'S-CESTA') + '</div>', 'path');
}
function soonCard(S) {
  var ps = NF.pathStats(S); if (!ps || ps.left > 7) return '';
  return glass('<div class="now"><span class="ic" aria-hidden="true">' + NF.icon('stethoscope') + '</span><div><b>' + (ps.left === 0 ? 'Dnes jdete na kontrolu' : 'Za ' + ps.left + ' ' + (ps.left === 1 ? 'den' : ps.left <= 4 ? 'dny' : 'dní') + ' jdete na kontrolu') + '</b>Podívejte se, co uvidí lékař, a vyberte otázky, které si chcete vzít s sebou.' +
    '<div class="actions" style="margin-top:10px">' + btn('Co uvidí lékař →', 'page', 'preview', 'primary sm') + '</div></div></div>', 'soft');
}
V.pathCard = pathCard;

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
/* Dotaz na minulé jídlo (nejvyšší hodnota, pod 4) — v kroku 1 dalšího jídla a večer u bazálu, ne samostatnou kartou. */
function prevAskBlock(S) {
  var pend = NF.pendingPeakAsk(S).concat(S.episodes.filter(function (e) { return e.manual && e.manual.peak != null && !e.manual.lowAsked && !NF.hasImport(e) && NF.minutesDiff(e.at, S.clock) <= 24 * 60 && NF.minutesDiff(e.at, S.clock) >= 120; })).slice(0, 2);
  if (!pend.length) return '';
  return pend.map(function (ep) {
    var f = NF.foodById(S, ep.foodId), lbl = NF.mealLabel(ep.meal, 'ke').replace(/^ke? /, '');
    var peakDone = ep.manual && ep.manual.peak != null;
    return glass('<b>Po ' + e(lbl) + ' (' + e(NF.fmtTime(ep.at)) + (f ? ', ' + e(f.name) : '') + ')</b>' +
      (!peakDone ? '<p class="small muted" style="margin:4px 0 6px">Nejvyšší hodnota podle aplikace senzoru za první dvě hodiny:</p>' + glucoseChips('peakChip', ep.id, null, false)
        : '<p class="small muted" style="margin:4px 0 6px">Nejvyšší hodnota: <b>' + e(NF.mmol(ep.manual.peak)) + '</b>. Klesla glukóza do 4 hodin po jídle pod 4?</p>' + yesNoChips('lowChip', ep.id, null)) +
      '<div class="small" style="margin-top:6px">' + appr(S, peakDone ? 'B-HYPO' : 'Z-GLUKOZA') + '</div>', 'soft');
  }).join('');
}
/* Sledování po menší porci s podaným inzulinem nebo po vynechaném jídle s inzulinem: za hodinu otázka „bylo pod 4?“ (B-HYPO). */
function hypoWatchCard(S) {
  var pend = NF.pendingHypoWatch(S); if (!pend.length) return '';
  var w = pend[0];
  return glass('<div class="now"><span class="ic" aria-hidden="true">' + NF.icon('clock') + '</span><div><b>' + (w.night ? (w.kind === 'skipped' ? 'Včera večer jste vynechali večeři s podaným inzulinem' : 'Včera večer jste snědli méně než obvykle') : (w.kind === 'skipped' ? 'Před hodinou jste vynechali ' + e(NF.mealLabel(w.meal, 'acc')) + ' s podaným inzulinem' : 'Před hodinou jste snědli méně než obvykle')) + '</b>' + (w.night ? 'Podívejte se do grafu senzoru. Klesla glukóza v noci pod 4?' : 'Podívejte se na senzor. Klesla glukóza pod 4?') +
    yesNoChips('hypoAnswer', w.id, null) + '<p class="small muted" style="margin:6px 0 0">' + (instructionText(S, 'I-MENE').replace(/^<br>/, '') || 'Při poklesu postupujte podle pokynu lékaře k nízké glukóze.') + '</p></div></div>' +
    '<div class="small" style="margin-top:6px">' + appr(S, 'B-HYPO') + '</div>', 'soft');
}
function hypoAlertCard(S) {
  var a = NF.hypoAlert(S); if (!a) return '';
  return glass('<div class="now"><span class="ic warn" aria-hidden="true">' + NF.icon('thermometer') + '</span><div><b>Nízká glukóza ' + a.count + '× za ' + a.days + ' dní</b>Zavolejte do ordinace, ať lékař dávku posoudí dřív než na kontrole. Telefon najdete v Bezpečí. Jídla nevynechávejte; aplikace dávku nemění.' +
    '<div class="actions" style="margin-top:8px">' + btn('Otevřít Bezpečí', 'page', 'safety', 'primary sm') + '</div></div></div><div class="small" style="margin-top:6px">' + appr(S, 'B-HYPO') + '</div>', 'warn');
}
V.prevAskBlock = prevAskBlock; V.hypoWatchCard = hypoWatchCard; V.hypoAlertCard = hypoAlertCard;

function peakAskCard(S) {
  var pend = NF.pendingPeakAsk(S); if (!pend.length) return '';
  var ep = pend[0], f = NF.foodById(S, ep.foodId), key = 'peak_' + ep.id, val = (S.form || {})[key];
  return glass('<div class="now"><span class="ic" aria-hidden="true">' + NF.icon('chart') + '</span><div><b>Nejvyšší hodnota od ' + e('po ' + NF.mealLabel(ep.meal, 'ke').replace(/^ke? /, '')) + '?</b>' +
    'V aplikaci senzoru se podívejte na graf od ' + e(NF.fmtTime(ep.at)) + ' a opište nejvyšší číslo za první dvě hodiny' + (f ? ' (' + e(f.name) + ')' : '') + '.' +
    '<label class="field" style="margin-top:8px"><span>Nejvyšší hodnota (mmol/l)</span><input type="number" step="0.1" min="1" max="30" inputmode="decimal" data-bind="form.' + key + '" value="' + e(val != null ? val : '') + '" placeholder="např. 9,4"></label>' +
    '<div class="actions" style="margin-top:8px">' + btn('Uložit', 'peakSave', ep.id, 'primary sm') + btn('Nevím / nemám', 'peakSkip', ep.id, 'quiet sm') + '</div>' +
    '<p class="small muted" style="margin:6px 0 0">Hodnoty, které opíšete, později nahradí přesný průběh z exportu ze senzoru.</p></div></div>' +
    '<div class="small" style="margin-top:6px">' + appr(S, 'Z-GLUKOZA') + '</div>', 'soft');
}
function divergenceBlock(S, ep) {
  var dv = NF.divergence(S, ep); if (!dv) return '';
  return '<div class="hint sand" style="margin-top:10px"><b>Tentokrát to dopadlo jinak než dřív</b> (vzestup ' + e(NF.mmol(dv.mine)) + ' mmol/l, dřív kolem ' + e(NF.mmol(dv.med)) + '). Bylo to stejné jídlo?' +
    '<div class="choice-row" style="margin-top:8px">' + choice('Stejné jídlo', 'foodDiverge', ep.id + ':same', false, 'sm') + choice('Jiná příloha nebo množství', 'foodDiverge', ep.id + ':side', false, 'sm') + choice('Jinak připravené', 'foodDiverge', ep.id + ':prep', false, 'sm') + choice('Jiný den (stres, pohyb, spánek)', 'foodDiverge', ep.id + ':day', false, 'sm') + '</div>' +
    '<p class="small muted" style="margin:6px 0 0">Jídlo bude „známé“, až se tři zápisy shodnou. Jiná příloha nebo příprava se založí jako samostatné jídlo.</p></div>';
}
function importCard(S) {
  var d = NF.importDue(S); if (!d.due) return '';
  return glass('<div class="now"><span class="ic" aria-hidden="true">' + NF.icon('signal') + '</span><div><b>Nahrát data ze senzoru</b>Jednou týdně nahrajte export z aplikace senzoru: doplní přesný průběh k ' + NF.plural(d.missing, 'jídlu', 'jídlům', 'jídlům') + ' a noci pro bazál.' +
    '<div class="actions" style="margin-top:8px">' + btn('Nahrát export', 'importPage', null, 'primary sm') + '</div></div></div><div class="small" style="margin-top:6px">' + appr(S, 'Z-IMPORT') + '</div>', 'soft');
}
function importNotice(S) {
  var d = NF.importDue(S); if (!d.missing) return '';
  return hint('<b>Přesný průběh ze senzoru nahraje sestra na kontrole.</b> Umíte-li stáhnout soubor z aplikace senzoru, můžete ho nahrát sami: ' + btn('Nahrát export', 'importPage', null, 'sm'), 'sand');
}
V.importPage = function (S) {
  var si = S.sensorImport;
  return head(S, 'Data ze senzoru', 'Nahrát export') +
    glass('<p>V aplikaci senzoru zvolte <b>export dat</b> a soubor uložte do telefonu (csv; tabulku xlsx uložte jako csv). Potom ho tady vyberte. Soubor se čte jen v telefonu a nikam se neposílá.</p>' +
      '<label class="field"><span>Soubor s exportem</span><input type="file" accept=".csv,text/csv,.txt" data-action="importFile"></label>' +
      (NF.slots.importDemo ? NF.slots.importDemo(S) : '') +
      (si ? '<p class="small muted" style="margin-top:10px">Naposledy nahráno ' + e(NF.fmtDateTime(si.at)) + ': ' + si.readings + ' měření od ' + e(NF.fmtShort(si.from)) + ' do ' + e(NF.fmtShort(si.to)) + ', doplněno ' + NF.plural(si.filled, 'jídlo', 'jídla', 'jídel') + (si.nights ? ' a ' + NF.plural(si.nights, 'noc', 'noci', 'nocí') : '') + '.</p>' : '') +
      '<div class="small" style="margin-top:6px">' + appr(S, 'Z-IMPORT') + '</div>') +
    '<div class="actions">' + btn('← Zpět na Dnes', 'page', 'today', 'quiet') + '</div>';
};
V.peakAskCard = peakAskCard; V.divergenceBlock = divergenceBlock;

/* ---------- Dnes ---------- */
function todayEpisodes(S) { return S.episodes.filter(function (x) { return NF.day(x.at) === NF.day(S.clock); }); }
function basalToday(S) { return S.basalLog.filter(function (b) { return b.date === NF.day(S.clock); })[0]; }
V.today = function (S) {
  var p = NF.activePlan(S);
  var out = '<div style="margin:0 4px 6px"><span class="demo-flag">DEMO · syntetická data · není určeno pro léčbu</span></div>' +
    head(S, NF.fmtDayDate(S.clock), greeting(S));
  if (!p) return out + glass('<h2>Zatím nemáte plán</h2><p>Až vám ho lékař v ordinaci vydá, uvidíte tady, co dělat.</p>');
  if (S.participation !== 'active') return out + glass('<h2>Účast je ukončená</h2><p>Návyky, rady i připomínky jsou zastavené. Vaše zápisy zůstávají uložené.</p>');
  var ill = S.illness && S.illness.active;
  if (!ill) out += glass('<div class="sick">' + NF.icon('thermometer') + ' Nemoc · není mi dobře <button type="button" class="toggle" role="switch" aria-checked="false" data-action="illness" data-value="on" aria-label="Není mi dobře"></button></div>' +
    '<details class="more" style="margin-top:8px"><summary>Co se stane</summary><p class="small muted">Zapisovat můžete dál. K množství jídla neradíme a ukážeme vám pokyny lékaře pro nemoc. Každý den se zeptáme, jestli je vám lépe.</p></details>');
  var fm = NF.focusMeal(S), meal = fm ? fm.meal : mealNow(S), dose = p.doses[meal], hour = NF.parse(S.clock).getHours();
  var eaten = !fm || fm.state === 'done';
  var basalHour = Number(String(p.doses.basal.time).split(':')[0]) || 21;
  var basal = basalToday(S), basalTime = hour >= basalHour - 2;
  var yday = NF.day(NF.addDays(S.clock, -1)), askYesterday = NF.day(p.effectiveFrom) <= yday && !S.basalLog.some(function (b) { return b.date === yday; });
  var ask = S.ask && S.ask.day === NF.day(S.clock) ? S.ask : null;

  if (ill) {
    var ci = S.illness.checkins.filter(function (c) { return NF.day(c.at) === NF.day(S.clock); })[0];
    out += glass('<div class="now"><span class="ic" aria-hidden="true">' + NF.icon('thermometer') + '</span><div><b>Nemoc — pomáháme jinak</b>Zapisujte jídla dál, k množství jídla ale neradíme. Vaše dávky inzulinu platí, jak řekl lékař. Níže máte jeho pokyny pro nemoc.' +
      (ci ? '<br><span class="small muted">Dnes už máme odpověď. Zeptáme se zase zítra.</span>' : '<div class="actions" style="margin-top:10px">' + btn('Už je mi lépe', 'illnessCheck', 'better', 'primary') + btn('Ještě ne', 'illnessCheck', 'same', '') + '</div>') + '</div></div>', 'soft') +
      illnessInstructions(S, p);
  }
  if (ill && NF.illnessLong(S)) out += hint('<b>Nemoc trvá už ' + NF.plural(NF.daysBetween(S.illness.from, S.clock), 'den', 'dny', 'dní') + '.</b>' + (instructionText(S, 'I-NEMOC-JIDLO') || '<br>Když se nelepší, volejte podle pokynů v Bezpečí.') + '<br>Lékař uvidí na kontrole, jak dlouho nemoc trvala.', 'warn');
  var slots = NF.daySlots(S), MT = function (k) { return e(NF.mealText(meal, k)); };
  var sk = (S.skipped && S.skipped[NF.day(S.clock)]) || {};
  /* 1) Co teď + primární akce hned pod pozdravem (18. 10. 2026: obrazovka začíná tím, co má pacient udělat) */
  var mealDue = !!(fm && fm.state === 'now');
  if (mealDue) {
    out += glass('<div class="now"><span class="ic" aria-hidden="true">' + NF.icon('flag') + '</span><div><b>Co teď</b>Na řadě je ' + e(NF.mealLabel(meal)) + '. Připomeneme inzulin a poradíme.</div></div>' +
      '<div class="actions col" style="margin-top:12px">' + btn('' + NF.icon('utensils') + ' Chystám se jíst', 'startMeal', meal, 'primary big') + '</div>' +
      '<div class="actions sec">' + btn(MT('already'), 'mealRetro', meal, '') + btn('Dnes ' + MT('without'), 'mealSkipAsk', meal, '') + '</div>' +
      (ask && ask.meal === meal ? '<div style="margin-top:12px"><b>Byl ' + e(NF.mealLabel(meal, 'ke')) + ' inzulin?</b><div class="choice-row" style="margin-top:6px">' + choice('Ano, ' + dose.units + ' j.', 'mealSkip', meal + ':as', false) + choice('Ano, jinak', 'mealSkip', meal + ':other', false) + choice('Ne', 'mealSkip', meal + ':none', false) + '</div></div>' : ''));
  } else if (basalTime && !basal) {
    out += glass('<div class="now"><span class="ic" aria-hidden="true">' + NF.icon('syringe') + '</span><div><b>Čas na bazál</b>Lékař vám předepsal <b>' + p.doses.basal.units + ' j.</b> ve ' + e(p.doses.basal.time) + '. Až si píchnete, potvrďte to níže.</div></div>');
  } else if (fm && fm.state === 'missed') {
    var a0 = ask && ask.meal === meal ? ask : null;
    out += glass('<div class="now"><span class="ic" aria-hidden="true">' + NF.icon('clock') + '</span><div><b>' + MT('was') + '</b>' + e(NF.mealLabel(meal, 'Ke')) + ' nemáme zápis. Dejte nám vědět, co bylo.' +
      '<div class="choice-row" style="margin-top:10px">' + choice(MT('yes'), 'mealRetro', meal, false, 'big') + choice('Ne, ' + MT('without'), 'mealSkipAsk', meal, !!a0, 'big') + '</div>' +
      (a0 ? '<div style="margin-top:12px"><b>Byl ' + e(NF.mealLabel(meal, 'ke')) + ' inzulin?</b><div class="choice-row" style="margin-top:6px">' + choice('Ano, ' + dose.units + ' j.', 'mealSkip', meal + ':as', false) + choice('Ano, jinak', 'mealSkip', meal + ':other', false) + choice('Ne', 'mealSkip', meal + ':none', false) + '</div><p class="small muted" style="margin-top:6px">Když je inzulin podaný a jídlo ne, řiďte se pokynem lékaře „méně jídla než obvykle“ v části Bezpečí.</p></div>' : '') + '</div></div>', 'soft');
  } else {
    out += glass('<div class="now"><span class="ic ok" aria-hidden="true">' + NF.icon('check') + '</span><div><b>Dnešní jídla jsou zapsaná</b>Další věc na vás čeká až ' + (basalTime ? 'zítra ráno' : 'večer u bazálu') + '.</div></div>' +
      '<div class="actions col" style="margin-top:12px">' + btn('' + NF.icon('apple') + ' Zapsat svačinu', 'startMeal', 'snack', 'big') + '</div>');
  }
  out += fixInsulinCard(S);
  /* 2) bezpečí a otázky k minulému jídlu */
  out += hypoAlertCard(S);
  out += hypoWatchCard(S);
  if (basalTime) out += prevAskBlock(S);
  NF.MEALS.forEach(function (mm) { var i = sk[mm[0]]; if (i && (i.insulin === 'as' || i.insulin === 'other')) out += hint('<b>Dnes ' + e(NF.mealText(mm[0], 'without')) + ', ale inzulin podaný.</b> Postupujte podle pokynu lékaře „méně jídla než obvykle“ a sledujte glukózu. Tohle není rada aplikace, ale pokyn od lékaře.', 'warn'); });
  /* 3) zpětná vazba: výsledek posledního jídla (zkrácený, když je na řadě další), pak nejvýš jedna karta milníku nebo týdne */
  out += resultCard(S, mealDue);
  out += importCard(S);
  var msCard = milestoneCard(S); out += msCard || weekCard(S);
  out += soonCard(S);
  /* 4) pás dne a bazál */
  out += dayStrip(S, slots, meal, basal, basalTime, p);
  if (askYesterday) out += glass('<div class="now"><span class="ic" aria-hidden="true">' + NF.icon('moon') + '</span><div><b>Byl včera večer bazál?</b>Záznam ze včerejška chybí. Lékař předepsal ' + p.doses.basal.units + ' j. ve ' + e(p.doses.basal.time) + '.' +
    '<div class="choice-row" style="margin-top:8px">' + choice('Ano, ' + p.doses.basal.units + ' j.', 'basalYesterday', 'as', false) + choice('Ne', 'basalYesterday', 'none', false) + choice('Nevím', 'basalYesterday', 'unknown', false) + '</div></div></div>', 'soft');
  if (basalTime && !basal) {
    out += glass('<div class="insulin"><div class="ic" aria-hidden="true">' + NF.icon('syringe') + '</div><div><b>Bazál · ' + p.doses.basal.units + ' j. · ' + e(p.doses.basal.time) + '</b><small>Předepsal lékař</small></div></div>' +
      '<div class="actions col" style="margin-top:12px">' + btn('Bazál ' + p.doses.basal.units + ' j. je píchnutý', 'basalConfirm', 'as', 'primary big') + btn('Jinak', 'basalOther', null, '', S.basalOther ? ' aria-pressed="true"' : '') + '</div>' +
      (S.basalOther ? '<div class="actions"><div class="stepper">' + btn(NF.icon('minus'), 'basalUnits', '-1', '', ' aria-label="méně"') + '<span class="val">' + (S.basalUnits != null ? S.basalUnits : p.doses.basal.units) + ' j.<small>předepsáno ' + p.doses.basal.units + '</small></span>' + btn(NF.icon('plus'), 'basalUnits', '1', '', ' aria-label="více"') + '</div>' + btn('Uložit', 'basalConfirm', 'other', 'primary') + btn('Dnes bez bazálu', 'basalConfirm', 'none', 'quiet') + '</div>' : ''));
  } else if (dose && mealDue) { /* potvrzený bazál nese pás dne, karta se nezdvojuje (19. 10. 2026) */
    out += glass('<div class="insulin"><div class="ic" aria-hidden="true">' + NF.icon('syringe') + '</div><div><b>Inzulin ' + e(NF.mealLabel(meal, 'ke')) + ' · ' + dose.units + ' j.</b><small>Předepsal lékař · zeptáme se před jídlem</small></div><span class="badge">brzy</span></div>');
  }
  if (!(fm && fm.state === 'done') || (basalTime && !basal) || (fm && fm.state === 'missed')) out += '<div class="actions sec" style="margin:-4px 0 14px">' + btn('' + NF.icon('apple') + ' Zapsat svačinu', 'startMeal', 'snack', 'quiet') + '</div>'; /* velké tlačítko svačiny je jen ve stavu „vše zapsáno“ */

  var habits = NF.activeHabits(S);
  if (habits.length) {
    var todayEps = todayEpisodes(S).filter(function (x) { return !NF.isSnack(x.meal); }); /* svačina nemá dávku ani porci, do návyků nepatří */
    var done = 0, rows = habits.map(function (h) {
      var ok = habitDone(S, h, todayEps, basal); if (ok) done++;
      return '<div class="habit"><span class="mark ' + (ok ? '' : 'todo') + '">' + (ok ? NF.icon('check') : '') + '</span><div>' + e(h.short || h.title) + '<small>' + e(habitProgress(S, h, todayEps, basal)) + '</small></div></div>';
    }).join('');
    out += glass('<div style="display:flex;justify-content:space-between;font-weight:800;margin-bottom:8px"><span>Moje návyky dnes</span><span class="muted" style="font-weight:600">' + done + ' / ' + habits.length + '</span></div>' + rows +
      '<details class="more" style="margin-top:10px"><summary>Proč právě tyhle návyky</summary><ul class="plain small">' + habits.map(function (h) { return '<li><b>' + e(h.title) + '</b><br>' + e(h.why) + '</li>'; }).join('') + '</ul></details>');
  }
  out += pathCard(S, false);
  out += hint('<b>Vaše zápisy uvidí lékař až s vámi na kontrole.</b> Při potížích otevřete Bezpečí.', 'sand');
  return out;
};
/* Pás dne: ráno → večer, kruh za každé hlavní jídlo a bazál; značka „teď“ bez pohybu (6:00–22:00). */
function dayStrip(S, slots, meal, basal, basalTime, p) {
  var nodes = slots.map(function (sl) {
    var st = sl.state === 'done' ? 'done' : sl.state === 'skipped' ? 'skipped' : sl.state === 'missed' ? 'missed' : sl.meal === meal ? 'now' : 'wait';
    var txt = st === 'done' ? 'zapsáno' : st === 'skipped' ? 'vynecháno' : st === 'missed' ? 'chybí zápis' : st === 'now' ? 'teď' : 'později';
    return { cls: st, ic: st === 'done' ? 'check' : st === 'skipped' ? 'minus' : st === 'missed' ? 'question' : 'utensils', label: NF.mealLabel(sl.meal, true), txt: txt, act: st === 'now' ? ['startMeal', sl.meal] : st === 'done' ? ['page', 'foods'] : st === 'missed' ? ['mealRetro', sl.meal] : null };
  });
  nodes.push({ cls: basal ? 'done' : basalTime ? 'now' : 'wait', ic: basal ? 'check' : 'moon', label: 'Bazál', txt: basal ? 'potvrzen' : basalTime ? 'teď' : String(p.doses.basal.time) });
  var alt = 'Den: ' + nodes.map(function (n) { return n.label + ' ' + n.txt; }).join(', ') + '.';
  return glass('<div class="daystrip" role="img" aria-label="' + e(alt) + '"><div class="nodes">' + nodes.map(function (n) {
    var inner = '<span class="dot">' + NF.icon(n.ic) + '</span><b>' + e(n.label) + '</b><small>' + e(n.txt) + '</small>';
    return '<div class="dnode ' + n.cls + '">' + (n.act ? '<button type="button" data-action="' + n.act[0] + '" data-value="' + e(n.act[1]) + '" aria-label="' + e(n.label + ': ' + n.txt) + '">' + inner + '</button>' : inner) + '</div>'; /* uzel je zkratka (19. 10. 2026) */
  }).join('') + '</div></div>');
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
    case 'H-BAZAL': return basal ? 'potvrzeno ' + basal.time : 'večer ve ' + (NF.activePlan(S).doses.basal.time);
    default: return h.how || '';
  }
}

/* ---------- před jídlem: 3 kroky ---------- */
/* Talíř porce: obvyklá · větší · menší. Animace „zpět k obvyklé“ ukáže směr rady pohybem (pravidlo 3: nikdy nahoru po píchnutí). */
function plateSvg(kind, anim) {
  var r = anim ? 5.6 : kind === 'bigger' ? 8.2 : kind === 'smaller' ? 3.6 : 5.6;
  return '<svg class="plate-ico' + (anim ? ' anim-' + anim : '') + '" viewBox="0 0 28 28" aria-hidden="true"><circle class="rim" cx="14" cy="14" r="12"/><circle class="inner" cx="14" cy="14" r="9.5"/><circle class="food" cx="14" cy="14" r="' + r + '"/></svg>';
}
function plateMove(portion) {
  if (portion !== 'bigger' && portion !== 'smaller') return '';
  return '<div class="plates" aria-hidden="true">' + plateSvg(portion, portion) + '<span class="arr">' + NF.icon('arrow-right') + '</span>' + plateSvg('usual') + '<small>' + (portion === 'bigger' ? 'z větší zpět k obvyklé' : 'z menší zpět k obvyklé') + '</small></div>';
}
V.plateSvg = plateSvg;
function timeChips(m) {
  var opts = [['0', 'právě teď'], ['-5', 'před 5 min'], ['-15', 'před 15 min'], ['-30', 'před 30 min']];
  return '<div class="timechips">' + opts.map(function (o) { return choice(o[1], 'mealTime', o[0], String(m.offset) === o[0]); }).join('') + '</div>';
}
function tolNote(S) { var t = NF.tolerance(S); return '<p class="tiny muted" style="margin:6px 0 0">Nejlépe se učíme z jídel, kde byl inzulin do ' + t.before + ' minut před jídlem nebo do ' + t.after + ' minut po něm. Zapište jídlo i jindy, zůstane uložené.</p>'; }
/* Hlavička kroku: Zpět vlevo nahoře (48 px), krok 1 se ptá, zda zahodit rozpracovaný zápis (18. 10. 2026). */
function stepHead(S, m, step) {
  var back = step > (NF.isSnack(m.meal) ? 2 : 1) && !(m.retro && step === 1) ? btn(NF.icon('chevron-left') + ' Zpět', 'mealStep', String(step - 1), 'back') : btn(NF.icon('chevron-left') + ' Zpět na Dnes', (m.bolus || m.beforeAsked || m.foodId) ? 'mealCancelAsk' : 'mealCancel', null, 'back');
  return '<div class="stephead">' + back + '</div>';
}
V.meal = function (S) {
  var m = S.meal, p = NF.activePlan(S);
  if (!m || !p) return glass('<h2>Teď nelze nic zapsat</h2>') + '<div class="actions">' + btn('Zpět', 'page', 'today', 'primary') + '</div>';
  var dose = p.doses[m.meal], out = '', snack = NF.isSnack(m.meal);
  if (!snack && !dose) return glass('<h2>Teď nelze nic zapsat</h2><p class="small muted">K tomuto jídlu plán nemá dávku.</p>') + '<div class="actions">' + btn('Zpět', 'page', 'today', 'primary') + '</div>';
  var steps = '<div class="msteps">' + (snack ? [2, 3] : [1, 2, 3]).map(function (i) { return '<span class="' + (i <= m.step ? 'on' : '') + '"></span>'; }).join('') + '</div>';
  var stepLabel = function (n) { return snack ? 'Krok ' + (n - 1) + ' ze 2 · svačina' : 'Krok ' + n + ' ze 3 · ' + NF.mealLabel(m.meal); };
  if (m.step === 1 && m.retro) {
    var base = { breakfast: 6, lunch: 11, dinner: 17 }[m.meal];
    out += stepHead(S, m, 1) + head(S, 'Krok 1 ze 3 · ' + NF.mealLabel(m.meal) + ' zpětně', 'Byl ' + NF.mealLabel(m.meal, 'ke') + ' inzulin?') + steps +
      glass('<div class="insulin"><div class="ic" aria-hidden="true">' + NF.icon('syringe') + '</div><div><b>Lékař předepsal · ' + dose.units + ' j.</b><small>' + e(NF.mealLabel(m.meal, 'ke')) + ' · ptáme se, jak to bylo</small></div></div>') +
      '<div class="choice-row" style="flex-direction:column">' +
      choice('Ano, ' + dose.units + ' j.<small>podle plánu</small>', 'mealBolus', 'as', m.bolus === 'as', 'big') +
      choice('Ano, jinak<small>jiné množství</small>', 'mealBolus', 'other', m.bolus === 'other', 'big') +
      choice('Ne<small>bez inzulinu</small>', 'mealBolus', 'none', m.bolus === 'none', 'big') +
      choice('Nevím', 'mealBolus', 'unknown', m.bolus === 'unknown', 'big') + '</div>' +
      (m.bolus === 'unknown' ? hint('<b>Nevíte, jestli jste si píchli?</b>' + (instructionText(S, 'I-NEVIM') || ' Řiďte se pokyny lékaře v Bezpečí.'), 'warn') : '') +
      (m.bolus === 'other' ? glass('<b>Kolik jednotek?</b><div class="actions" style="margin-top:8px"><div class="stepper">' + btn(NF.icon('minus'), 'mealUnits', '-1', '', ' aria-label="méně"') + '<span class="val">' + m.units + ' j.<small>předepsáno ' + dose.units + '</small></span>' + btn(NF.icon('plus'), 'mealUnits', '1', '', ' aria-label="více"') + '</div></div>') : '') +
      glass('<b>' + e(NF.mealText(m.meal, 'when')) + '</b><div class="timechips">' + [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(function (o) { var h = base + o; var nowH = NF.parse(S.clock).getHours() + NF.parse(S.clock).getMinutes() / 60; return h <= nowH ? choice('v ' + NF.fmtHour(h), 'mealAt', String(h), String(m.at) === String(h)) : ''; }).join('') + '</div>' +
        (m.bolus === 'as' || m.bolus === 'other' ? '<b style="display:block;margin-top:12px">A inzulin?</b><div class="timechips">' + [['0', 'zároveň s jídlem'], ['-15', '15 min před'], ['-30', '30 min před'], ['15', 'až po jídle']].map(function (o) { return choice(o[1], 'mealTime', o[0], String(m.offset) === o[0]); }).join('') + '</div>' + tolNote(S) : '')) +
      '<div class="actions">' + btn('Další: co bylo k jídlu →', 'mealStep', '2', 'primary big', m.bolus && m.at != null ? '' : ' disabled') + '</div>' +
      (m.bolus && m.at != null ? '' : '<p class="small muted" style="text-align:center">Vyberte inzulin a čas jídla.</p>');
    return out;
  }
  if (m.step === 1) {
    out += stepHead(S, m, 1) + head(S, 'Krok 1 ze 3 · ' + NF.mealLabel(m.meal), 'Je inzulin k tomuto jídlu už píchnutý?') + steps +
      (m.cancelAsk ? hint('<b>Zahodit rozpracovaný zápis?</b><div class="actions" style="margin-top:8px">' + btn('Zahodit', 'mealCancel', null, 'danger sm') + btn('Pokračovat v zápisu', 'mealCancelKeep', null, 'sm') + '</div>', 'warn') : '') +
      glass('<div class="insulin"><div class="ic" aria-hidden="true">' + NF.icon('syringe') + '</div><div><b>Lékař předepsal ' + e(NF.mealLabel(m.meal, 'ke')) + ' ' + dose.units + ' j.</b><small>my jen připomínáme</small></div></div>' +
        '<div class="actions col" style="margin-top:12px">' +
        btn('Ano, ' + dose.units + ' j. · podle plánu', 'mealBolus', 'as', 'primary big', m.bolus === 'as' ? ' aria-pressed="true"' : '') +
        btn('Ano, jinak · jiné množství nebo čas', 'mealBolus', 'other', '', m.bolus === 'other' ? ' aria-pressed="true"' : '') +
        btn('Ještě ne · inzulin až před jídlem', 'mealBolus', 'before', '', m.bolus === 'before' ? ' aria-pressed="true"' : '') +
        btn('Nevím · pro jistotu počítáme, že už je', 'mealBolus', 'unknown', '', m.bolus === 'unknown' ? ' aria-pressed="true"' : '') + '</div>' +
        (m.bolus === 'unknown' ? hint('<b>Nevíte, jestli jste si píchli?</b> Bereme to, jako by inzulin v těle byl.' + (instructionText(S, 'I-NEVIM') || '<br>Řiďte se pokyny lékaře v Bezpečí.'), 'warn') : '') +
        (m.bolus === 'other' ? '<div class="box" style="margin-top:10px"><b>Kolik jednotek?</b><div class="actions" style="margin-top:8px"><div class="stepper">' + btn(NF.icon('minus'), 'mealUnits', '-1', '', ' aria-label="méně"') + '<span class="val">' + m.units + ' j.<small>předepsáno ' + dose.units + '</small></span>' + btn(NF.icon('plus'), 'mealUnits', '1', '', ' aria-label="více"') + '</div></div><b style="display:block;margin-top:12px">Kdy?</b>' + timeChips(m) + '</div>' : '') +
        (m.bolus === 'as' ? '<div class="box" style="margin-top:10px"><b>Kdy byl inzulin?</b>' + timeChips(m) + tolNote(S) + '</div>' : '') +
        insulinAxis(S, m) +
        '<details class="more" style="margin-top:4px"><summary>Proč se ptáme</summary><p class="small muted">Radu k velikosti porce můžeme dát jen dřív, než je inzulin v těle. Když nevíte, bereme to, jako by už byl — je to bezpečnější.</p></details>') +
      glass('<h2>' + (m.retro ? 'Glukóza při jídle podle grafu senzoru' : 'Kolik ukazuje senzor teď?') + '</h2><p class="small muted" style="margin:4px 0 8px">Opište celé číslo z aplikace senzoru. Když ho nemáte, klepněte na „nemám“ — jídlo zapíšeme i tak, do učení se započítá až s exportem.</p>' + glucoseChips('mealBefore', '', m.before, !!m.beforeAsked) +
        (m.beforeAsked ? '<p class="chosen-note">Vybráno: ' + (m.before == null ? 'nemám hodnotu' : e(NF.mmol(m.before)) + ' mmol/l') + '</p>' : '') +
        (m.retro ? '<b style="display:block;margin-top:12px">Nejvyšší hodnota za dvě hodiny po jídle</b>' + glucoseChips('mealPeak', '', m.peak, !!m.peakAsked) + '<b style="display:block;margin-top:12px">Klesla do 4 hodin pod 4?</b>' + yesNoChips('mealLow', '', m.lowAsked ? (m.low === true ? 'yes' : m.low === false ? 'no' : 'unknown') : null) : '') +
        '<div class="small" style="margin-top:8px">' + appr(S, 'Z-GLUKOZA') + '</div>') +
      (m.retro ? '' : hypoWatchCard(S) + prevAskBlock(S)) +
      '<div class="actions">' + btn('Další: co budete jíst →', 'mealStep', '2', 'primary big', m.bolus && m.beforeAsked ? '' : ' disabled') + '</div>' +
      (m.bolus && m.beforeAsked ? '' : '<p class="small muted" style="text-align:center">' + (!m.bolus ? 'Odpovězte na otázku k inzulinu.' : 'Klepněte na hodnotu ze senzoru, nebo na „nemám“.') + '</p>');
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
      (snack ? hint('<b>Svačina je bez inzulinu k jídlu.</b> Nepotvrzujete dávku ani porci; jen zapište, co jíte. Učíme se z ní zvlášť a lékař uvidí, kolik toho jíte mimo hlavní jídla.', 'sand') : '') +
      glass('<label class="field"><span>Jiné jídlo — napište pár písmen</span><input data-bind="meal.q" value="' + e(m.q || '') + '" placeholder="např. řízek, kaše, guláš" autocomplete="off"></label>' +
        (list.length ? '<div class="small muted" style="margin:2px 0 6px">' + (m.q ? 'Nalezeno' : 'Naposledy') + '</div><div class="food-grid">' + list.map(function (f) {
          var c = NF.confidence(S, f.id, m.meal);
          return '<button type="button" class="food-opt ' + (chosen && chosen.id === f.id ? 'chosen' : '') + '" data-action="mealFood" data-value="' + e(f.id) + '">' + foodIco(f) + '<span>' + e(f.name) + '<small>' + (c.level === 'known' ? 'znáte · ' + c.st.inTarget + ' z ' + c.st.n + ' v cíli' : c.level === 'similar' ? 'podobné známým' : 'zapsáno ' + c.st.eaten + '×') + '</small></span>' + levelTag(c.level) + '</button>';
        }).join('') + '</div>' : (m.q && !like && !m.newFood ? '<p class="small muted">Nic takového neznáme.</p>' : '')) +
        (like ? '<div class="hint sand"><b>Není to totéž jako „' + e(like.name) + '“, které už máte v seznamu?</b><div class="choice-row" style="margin-top:6px">' + btn('Ano, je to ono', 'mealUseExisting', like.id, 'sm primary') + btn('Ne, založit jako nové jídlo', 'mealNotSame', null, 'sm') + '</div></div>' : '') +
        (m.q && !chosen && !m.newFood && !like ? '<div class="actions">' + btn('＋ Přidat „' + e(m.q) + '“ jako vlastní jídlo', 'mealNewFood') + '</div>' : '')) +
      (m.newFood ? customBuilder(S, m) : '');
    if (chosen && !snack) {
      out += glass('<h2>' + (m.retro ? 'Jaká byla porce?' : 'Jakou porci si chystáte?') + '</h2><div class="choice-row">' + NF.PORTIONS.map(function (x) { return choice(plateSvg(x[0]) + '<span>' + e(x[1]) + '</span>', 'mealPortion', x[0], m.portion === x[0], 'plate'); }).join('') + '</div>' +
        '<p class="field-help">Obvyklá porce je ta, kterou jíte obvykle. Na ni lékař nastavil dávku.</p>');
    }
    out += '<div class="actions">' + btn(snack ? 'Další: zápis →' : 'Další: rada a zápis →', 'mealStep', '3', 'primary big', chosen && m.portion ? '' : ' disabled') + '</div>' +
      (!chosen ? '<p class="small muted" style="text-align:center">Nejdřív vyberte jídlo.</p>' : !m.portion ? '<p class="small muted" style="text-align:center">Vyberte porci.</p>' : '');
    return out;
  }
  /* krok 3 */
  var food = NF.foodById(S, m.foodId);
  if (m.retro) {
    var ra = NF.adviseAfter(S, food.id, m.meal, NF.retroAt(S, m.at)), rc = ra.conf;
    out += stepHead(S, m, 3) + head(S, 'Krok 3 ze 3 · ' + NF.mealLabel(m.meal) + ' zpětně', 'Zápis a co pomůže teď') + steps +
      glass('<div style="display:flex;gap:12px;align-items:center">' + foodIcon(S, food, rc) + '<div><div class="name" style="font-family:var(--nf-font-display);font-weight:700;font-size:var(--nf-fs-lg)">' + e(food.name) + '</div><div class="badges">' + levelTag(rc.level, rc) + reactionTag(rc.reaction) + '</div><div class="learn">' + e(NF.mealLabel(m.meal, true)) + ' v ' + e(NF.fmtHour(Number(m.at))) + ' · ' + e(NF.PORTIONS.filter(function (x) { return x[0] === m.portion; })[0][1].toLowerCase()) + ' porce · inzulin ' + e(m.bolus === 'as' ? dose.units + ' j.' : m.bolus === 'other' ? m.units + ' j.' : NF.INSULIN[m.bolus]) + '</div></div></div>' +
        (rc.level === 'known' ? '<div class="detail">' + peakBlock(S, food, rc) + '</div>' : '<p class="sum" style="margin-top:10px">Zápis se přidá k učení' + (m.bolus === 'as' ? '' : ' jen jako záznam (inzulin nebyl podle plánu)') + '.</p>')) +
      (ra.items.length ? '<h2 style="margin:14px 4px 8px">Co pomůže teď <span class="small muted" style="font-weight:500">· jídlo už změnit nejde</span></h2>' + ra.items.map(function (it) {
        var d = (m.decisions || {})[it.lever];
        return '<div class="advice ' + (d === true ? 'taken' : d === false ? 'declined' : '') + '"><div class="lever">' + e(it.label) + '</div><div class="text">' + e(it.text) + '</div><div class="cert">' + e(it.certainty) + '</div>' +
          '<div class="choice-row">' + choice('Zkusím to', 'mealDecide', it.lever + ':yes', d === true, 'yes') + choice('Tentokrát ne', 'mealDecide', it.lever + ':no', d === false) + '</div><div style="margin-top:8px">' + appr(S, it.item) + '</div></div>';
      }).join('') : '') +
      (NF.usable(S, 'R-REAKCE') ? '' : off(S, 'R-REAKCE')) + offLevers(S) +
      (ra.late ? hint('<b>Od jídla už uplynuly víc než tři hodiny.</b> Glukóza po něm už klesla, pohyb teď k tomuto jídlu nic nezmění. Zápis se i tak počítá.', 'sand') : '') +
      (m.bolus === 'none' || m.bolus === 'unknown' ? hint('<b>Inzulin k tomuto jídlu ' + (m.bolus === 'none' ? 'nebyl podán' : 'není potvrzený') + '.</b> Zápis uložíme, ale do učení ho nezapočítáme. Při nejistotě, co dělat, otevřete Bezpečí.', 'warn') : '') +
      '<div class="choice-row" style="margin:6px 4px">' + choice('Neobvyklý den (stres, málo spánku, alkohol)', 'mealUnusual', 'toggle', !!m.unusual, 'sm') + '</div>' + (m.unusual ? '<p class="small muted" style="margin:0 4px 8px">Zápis uložíme, ale do učení ho nezapočítáme.</p>' : '') +
      '<div class="actions">' + btn('Uložit ' + NF.mealLabel(m.meal, 'acc'), 'mealFinish', m.bolus, 'primary big') + '</div>';
    return out;
  }
  var res = NF.advise(S, food.id, m.portion, m.bolus, m.meal);
  var conf = res.conf;
  out += stepHead(S, m, 3) + head(S, stepLabel(3), snack ? 'Zápis svačiny' : 'Rada a zápis') + steps;
  out += glass('<div style="display:flex;gap:12px;align-items:center">' + foodIcon(S, food, conf) + '<div><div class="name" style="font-family:var(--nf-font-display);font-weight:700;font-size:var(--nf-fs-lg)">' + e(food.name) + '</div><div class="badges">' + levelTag(conf.level, conf) + reactionTag(conf.reaction) + '</div>' +
    '<div class="learn">' + (conf.level === 'known' ? 'Známe ho · ' + NF.plural(conf.st.n, 'započítaný zápis', 'započítané zápisy', 'započítaných zápisů') : conf.level === 'similar' ? 'Zatím odhad z podobných jídel' : conf.level === 'unstable' ? 'Zápisy se liší, jídlo zatím neznáme' : conf.level === 'learning' && conf.impression === 'mixed' ? 'Zápisy se liší; bude známé, až se tři shodnou' : 'Zatím nic neodhadujeme — zapište ho ' + (conf.min || 3) + '×') + '</div></div></div>' +
    (conf.level === 'unknown' ? '<p class="sum" style="margin-top:10px">Zatím ho neznáme. <b>Nic neodhadujeme.</b> Po ' + (conf.min || 3) + ' zápisech vám řekneme, kam se po něm glukóza dostane.</p>' : conf.level === 'none' ? '<p class="sum" style="margin-top:10px">' + e(conf.why) + '</p>' : '<div class="detail">' + peakBlock(S, food, conf) + '</div>'));
  if (!res.gate.ok) out += NF.usable(S, 'R-REAKCE') ? hint('<b>Teď neradíme.</b> ' + e(res.gate.why), 'warn') : off(S, 'R-REAKCE');
  else {
    res.blocked.forEach(function (b) { out += b.reason === 'item' ? off(S, NF.LEVERS[b.lever].item) : hint('<b>' + e(NF.LEVERS[b.lever].label) + ': teď neradíme.</b> ' + e(b.why) + (b.reason === 'bolus' && m.portion === 'smaller' ? instructionText(S, 'I-MENE') : ''), 'warn'); });
    res.gone.forEach(function (g) { out += hint(e(g.text) + ' ' + appr(S, 'R-ZMIZELA'), 'sand'); });
    if (res.illness) out += hint('<b>Při nemoci</b> k jídlu neradíme; platí pokyny lékaře (máte je nahoře na Dnes). Dávky platí, jak řekl lékař.', 'sand');
    if (res.items.length) {
      out += '<h2 style="margin:14px 4px 8px">Co můžete zkusit <span class="small muted" style="font-weight:500">(odpovědět nemusíte)</span></h2>' + res.items.map(function (it) {
        var d = (m.decisions || {})[it.lever], reason = (m.reasons || {})[it.lever];
        if (m.compact && m.compact[it.lever]) return '<div class="advice compact ' + (d === true ? 'taken' : 'declined') + '"><div class="lever">' + e(it.label) + '</div><div class="text">Jako minule: <b>' + (d === true ? 'zkusím to' : 'tentokrát ne') + '</b> ' + btn('Změnit', 'mealExpand', it.lever, 'sm quiet') + '</div><div style="margin-top:6px">' + appr(S, it.item) + '</div></div>'; /* rutina po 3 odpovědích (18. 10. 2026) */
        return '<div class="advice ' + (d === true ? 'taken' : d === false ? 'declined' : '') + '"><div class="lever">' + e(it.label) + (it.carbs ? tag('mění množství jídla', 'warn') : '') + '</div>' +
          (it.lever === 'portion' ? plateMove(m.portion) : leverAnim(it.lever, food)) + '<div class="text">' + e(it.text) + '</div><div class="cert">' + e(it.certainty) + '</div>' +
          '<div class="choice-row">' + choice('Zkusím to', 'mealDecide', it.lever + ':yes', d === true, 'yes') + choice('Tentokrát ne', 'mealDecide', it.lever + ':no', d === false) + '</div>' +
          (d === false ? '<div class="choice-row reasons">' + NF.DECLINE_REASONS.map(function (r) { return choice(r[1], 'mealReason', it.lever + ':' + r[0], reason === r[0]); }).join('') + '</div>' : '') +
          '<div style="margin-top:8px">' + appr(S, it.item) + '</div></div>';
      }).join('');
    } else if (conf.level === 'known' && !res.blocked.length) out += glass('<p>K tomuto jídlu radu nepotřebujete — zůstáváte po něm v cíli. Stačí ho zapsat.</p>');
  }
  if (res.gate.ok) out += offLevers(S);
  if (!snack && res.gate.ok && res.items.length) out += '<details class="more" style="margin:4px 4px 14px"><summary>Proč tohle radíme</summary><div class="small muted" style="padding-top:6px">' +
    '<p><b>Odkud to víme:</b> jen z vašich vlastních zápisů a dat ze senzoru. Počítáme jen zápisy s potvrzeným inzulinem a daty ze senzoru. Nepočítáme zápis z doby nemoci, s jinou než obvyklou porcí nebo s jinou dávkou.</p>' +
    '<p><b>Proč se ptáme na inzulin:</b> dávka je jako klíč vyrobený na obvyklou porci. Dokud inzulin není v těle, můžete porci ještě upravit. Po píchnutí inzulin působí 3–5 hodin, ať sníte cokoli. Proto pak poradíme jen návrat z větší porce k obvyklé.</p>' +
    '<p><b>Co nikdy neděláme:</b> nepočítáme ani neměníme dávku inzulinu.</p></div></details>';
  if (m.bolus === 'before') {
    out += glass('<h2>Až si píchnete ' + dose.units + ' j., potvrďte to</h2><p class="small muted">' + e(NF.mealLabel(m.meal, 'Ke')) + ' · lékař předepsal, my jen připomínáme.</p>' +
      '<div class="actions col" style="margin-top:12px">' + btn('Píchnuto ' + dose.units + ' j. · uložit ' + NF.mealLabel(m.meal, 'acc'), 'mealFinish', 'as', 'primary big') + btn('Píchnuto jinak', 'mealFinishOther', null, '', m.finishOther ? ' aria-pressed="true"' : '') + '</div>' +
      (m.finishOther ? '<div class="actions"><div class="stepper">' + btn(NF.icon('minus'), 'mealUnits', '-1') + '<span class="val">' + m.units + ' j.</span>' + btn(NF.icon('plus'), 'mealUnits', '1') + '</div>' + btn('Uložit', 'mealFinish', 'other', 'primary') + btn('Nepíchnuto', 'mealFinish', 'none', 'quiet') + '</div>' : '') +
      '<p class="small muted" style="margin:6px 4px 0">Inzulin půjde do 60 minut opravit na Dnes.</p>');
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
  var out = head(S, 'Co už o vašich jídlech víme', 'Moje jídla') +
    '<div class="segmented" style="margin-bottom:12px">' + [['known', 'Známá · ' + known.length], ['learn', 'Učíme se · ' + learning.length], ['all', 'Všechna']].map(function (x) { return '<button type="button" class="' + (seg === x[0] ? 'on' : '') + '" data-action="foodsSeg" data-value="' + x[0] + '" aria-pressed="' + (seg === x[0] ? 'true' : 'false') + '">' + e(x[1]) + '</button>'; }).join('') + '</div>';
  if (!withEps.length) return out + glass('<p>Zatím tu nic není. Až zapíšete první jídlo, uvidíte ho tady.</p>');
  if (!list.length) return out + glass('<p>' + (seg === 'known' ? 'Zatím žádné známé jídlo. Jídlo poznáme po 3 zápisech se všemi údaji.' : 'Všechna zapsaná jídla už znáte.') + '</p>');
  out += list.map(function (f) { return foodCard(S, f, S.foodOpen === f.id); }).join('');
  return out;
};
/* Rady, které se pacientovi skutečně nabízejí: schválené v registru, nevypnuté lékařem, při nemoci jen bezpečné. */
function tipLevers(S) {
  var pa = NF.planAdvice(S), ill = !!(S.illness && S.illness.active), txt = { addon: 'přidat k jídlu bílkovinu (jogurt, sýr, vejce)', order: 'sníst nejdřív zeleninu nebo maso', walk: 'po jídle se projít' };
  return Object.keys(txt).filter(function (l) { var meta = NF.LEVERS[l]; return NF.usable(S, meta.item) && (pa.off || []).indexOf(l) < 0 && (!ill || meta.illnessSafe); }).map(function (l) { return txt[l]; });
}
/* Nové jídlo jen názvem (rozhodnutí vlastníka 15. 10. 2026): žádné složení. Nepovinné „Je to jako …“ a dotaz „Myslíte X?“ u podobného názvu. */
function customBuilder(S, m) {
  var nf = m.newFood, name = (m.q || '').trim(), sug = nf.suggest ? NF.foodById(S, nf.suggest) : null, cands = NF.usable(S, 'R-PODOBNOST') ? NF.likeCandidates(S) : [];
  var out = '<h2>Nové jídlo: ' + e(name) + '</h2><p class="small muted">Nic dalšího nepotřebujeme. Na složení ani množství se neptáme — porci zadáte až při jídle a z vaší reakce se naučíme, jak na vás jídlo působí.</p>';
  if (sug) out += '<div class="hint sand"><b>Není to totéž jako „' + e(sug.name) + '“, které už máte v seznamu?</b><div class="choice-row" style="margin-top:6px">' + btn('Ano, je to ono', 'mealUseExisting', sug.id, 'sm primary') + btn('Ne, založit jako nové jídlo', 'mealNotSame', null, 'sm') + '</div></div>';
  else {
    if (cands.length) out += '<b style="display:block;margin:10px 0 6px">Nepovinně: podobá se některému jídlu, které už známe? <span class="small muted" style="font-weight:500">Použijeme ho jen jako výchozí odhad na první tři zápisy; vaše jídlo zůstává samostatné.</span></b><div class="choice-row">' + cands.map(function (f) { return choice(e(f.name), 'mealLike', f.id, nf.like === f.id, 'sm'); }).join('') + choice('Nic podobného', 'mealLike', 'none', nf.like === 'none', 'sm quiet') + '</div>';
    out += '<div class="actions">' + btn('Zapsat jídlo', 'mealSaveFood', null, 'primary') + '</div>';
  }
  return glass(out);
}
function foodCard(S, f, open) {
  var c = NF.confidence(S, f.id), st = c.st;
  var sum;
  if (c.level === 'known' && !c.reaction) sum = 'Zapsáno ' + st.eaten + '×. ' + (NF.usable(S, 'R-SKORE') ? 'Zatím ' + st.inTarget + ' z ' + st.n + ' v cíli.' : 'Reakci zatím nehodnotíme; rozmezí vidíte níže.');
  else if (c.level === 'learning') sum = 'Zapsáno ' + st.eaten + '×, ' + (st.n === 1 ? 'první dojem: tentokrát ' + (c.impression === 'in' ? 'v cíli' : 'nad cílem') + '. Ještě dvakrát a budeme ho znát.' : c.impression === 'mixed' ? 'zápisy se liší. Jídlo bude známé, až se tři shodnou.' : 'zatím to vypadá, že po něm ' + (c.impression === 'in' ? 'zůstáváte v cíli' : 'jdete nad cíl') + '. Ještě jednou a bude známé.');
  else if (c.level === 'known') sum = 'Zapsáno ' + st.eaten + '×. ' + (c.reaction.key === 'mild' ? 'Po něm zůstáváte <b>většinou v cíli</b>.' : c.reaction.key === 'mid' ? 'Po něm skončíte <b>zhruba z poloviny</b> v cíli a z poloviny nad ním.' : 'Po něm bývá glukóza <b>častěji nad cílem</b>.') + (c.reaction.settled ? '' : ' S dalšími zápisy se to může změnit.');
  else if (c.level === 'similar') sum = 'Zapsáno ' + st.eaten + '×, ještě ' + (c.min - st.n) + ' a budeme ho znát. Podobá se jídlům, po kterých ' + (c.reaction && c.reaction.key === 'mild' ? 'zůstáváte v cíli' : 'jdete nad cíl') + '.';
  else if (c.level === 'unstable') sum = 'Zapsáno ' + st.eaten + '×, zápisy se ani po ' + st.n + ' neshodly. Lékař to uvidí v podkladech. Zkuste jídlo dělat pokaždé stejně, nebo ho rozdělte na dvě.';
  else sum = 'Zapsáno ' + st.eaten + '×. Zatím nic neodhadujeme; po ' + (c.min || 3) + ' zápisech se všemi údaji budeme vědět víc.';
  if (!NF.usable(S, 'R-SKORE')) sum += off(S, 'R-SKORE'); if (!NF.usable(S, 'R-PODOBNOST') && c.level !== 'known') sum += off(S, 'R-PODOBNOST');
  var detail = '';
  if (open) {
    var lev = c.level === 'known' ? NF.leverStats(S, f.id) : [], un = c.level === 'known' ? NF.unstable(S, f.id) : null;
    detail = '<div class="detail">' + peakBlock(S, f, c) +
      (un && un.kind === 'lever' ? '<div class="tip"><b>Zápisy se liší</b> — rozdíl vysvětluje rada „' + e(NF.LEVERS[un.lever].label) + '“: s ní bývá níž.</div>' : '') +
      (un && un.kind === 'ask' ? '<div class="tip"><b>Zápisy tohoto jídla se liší víc, než je obvyklé.</b> Děláte ho pokaždé stejně (porce, příprava)?<div class="choice-row" style="margin-top:6px">' + btn('Ano, stejně', 'foodSame', f.id, 'sm') + btn('Ne, různě — rozdělit na dvě jídla', 'foodSplit', f.id, 'sm primary') + '</div></div>' : '') +
      (f.sameAsked === 'same' ? '<div class="tip">Nestálé jídlo: reakce kolísá, i když ho děláte stejně. Sledujeme dál.</div>' : '') +
      (lev.length ? '<div class="tip"><b>Co u vás pomohlo</b>' + lev.map(function (x) { return e(NF.LEVERS[x.lever].label) + ': ' + x.st.inTarget + ' z ' + x.st.n + ' v cíli'; }).join(' · ') + '.</div>' : '') +
      (c.level === 'known' && c.reaction && c.reaction.key !== 'mild' && tipLevers(S).length ? '<div class="tip"><b>Co můžete zkusit</b><ul style="margin:4px 0 6px 18px;padding:0">' + tipLevers(S).map(function (x) { return '<li>' + e(x.charAt(0).toUpperCase() + x.slice(1)) + '</li>'; }).join('') + '</ul>Každou radu vám nabídneme před jídlem.</div>' : '') +
      '<details class="more"><summary>Historie zápisů (' + st.eaten + ')</summary><div class="tablewrap"><table><thead><tr><th>Datum</th><th>Porce</th><th>Inzulin</th><th>Rada</th><th>Vrchol</th></tr></thead><tbody>' +
      st.list.slice().reverse().slice(0, 8).map(function (ep) {
        var why = NF.whyNotUsable(S, ep), acc = (ep.advice || []).filter(function (a) { return a.accepted === true && a.lever !== 'portion'; }).map(function (a) { return NF.LEVERS[a.lever].label; });
        return '<tr><td class="nowrap">' + e(NF.fmtShort(ep.at)) + '</td><td>' + e(NF.PORTIONS.filter(function (x) { return x[0] === ep.portion; })[0][1]) + '</td><td>' + e(NF.INSULIN[ep.insulin.confirmed]) + (ep.insulin.units != null && ep.insulin.confirmed === 'other' ? ' ' + ep.insulin.units + ' j.' : '') + '</td><td>' + e(acc.join(', ') || '—') + '</td><td>' + (why ? '<span class="missing">' + e(why) + '</span>' : e(NF.mmol(NF.peakOf(ep.points)))) + '</td></tr>';
      }).join('') + '</tbody></table></div></details></div>';
  }
  return '<section class="glass food"><button type="button" class="h" data-action="foodOpen" data-value="' + e(f.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' + foodIcon(S, f, c) +
    '<div><div class="name">' + e(f.name) + '</div><div class="badges">' + levelTag(c.level) + reactionTag(c.reaction) + (f.custom ? tag('moje jídlo') : '') + '</div>' +
    (c.level !== 'known' ? '<div class="learn">Učíme se: ' + Math.min(st.n, c.min || 3) + ' ze ' + (c.min || 3) + ' zápisů</div>' : '') + '</div><span class="chev">' + NF.icon(open ? 'chevron-up' : 'chevron-down') + '</span></button>' +
    '<div class="sum">' + sum + '</div>' + detail + '</section>';
}
V.foodCard = foodCard;

/* ---------- Plán, Bezpečí ---------- */
V.planScreen = function (S) {
  var planOut = planScreenBody(S); return planOut + '<div class="actions" style="margin-top:4px">' + btn(NF.icon('signal') + ' Data ze senzoru · nahrát export', 'importPage', null, 'quiet') + '</div>';
};
function planScreenBody(S) {
  var p = NF.activePlan(S); if (!p) return head(S, 'Plán', 'Plán vám zatím lékař nevydal');
  var older = S.plans.filter(function (x) { return x.id !== p.id; });
  var ms = (S.fb && S.fb.milestones) || [];
  return head(S, 'Můj plán od ' + NF.fmtShort(p.issuedAt), 'Dávky a návyky') +
    pathCard(S, true) +
    (ms.length ? glass('<details class="more"><summary>Vaše milníky (' + ms.length + ')</summary><ul class="plain small">' + ms.slice().reverse().map(function (m) { return '<li>' + e(NF.fmtShort(m.at)) + ' · ' + m.text + '</li>'; }).join('') + '</ul></details>') : '') +
    glass('<h2>Kdy a kolik inzulinu</h2>' + dosesTable(p) + '<p class="small muted">Určil lékař ' + e(NF.fmtShort(p.issuedAt)) + '. Dávky nepočítáme ani neměníme — jen je připomínáme a ptáme se, jestli byl inzulin.</p>') +
    glass('<h2>Návyky</h2><ul class="plain">' + NF.activeHabits(S).map(function (h) { return '<li><b>' + e(h.title) + '</b><br><span class="small muted">' + e(h.why) + '</span></li>'; }).join('') + '</ul>') +
    glass('<h2>Rady, které vám nabízíme</h2>' + adviceList(S, p) + '<p class="small muted">Nabízíme je před jídlem podle toho, jak na jídlo reagujete. Odpovídat nemusíte.</p>') +
    glass('<h2>Cíle glukózy</h2>' + (NF.usable(S, 'C-CILE') ? '' : off(S, 'C-CILE')) + kv('V cíli', e(NF.mmol(p.targets.low)) + '–' + e(NF.mmol(p.targets.high)) + ' mmol/l') + kv('Ráno nalačno do', e(NF.mmol(p.targets.fastingHigh)) + ' mmol/l') + kv('Platnost plánu do', e(NF.fmtShort(p.validUntil))) + '<div class="small" style="margin-top:6px">' + appr(S, 'C-CILE') + '</div>') +
    (older.length ? glass('<details class="more"><summary>Starší plány (' + older.length + ')</summary><ul class="plain small">' + older.map(function (x) { return '<li><b>' + e(x.id) + '</b> · ' + e(NF.fmtShort(x.issuedAt)) + ' – ' + e(NF.fmtShort(x.validUntil)) + '<br><span class="muted">Zápisy z té doby zůstávají u něj.</span></li>'; }).join('') + '</ul></details>') : '');
};
V.safety = function (S) {
  var p = NF.activePlan(S), ill = S.illness && S.illness.active;
  var row = function (ic, k, v) { return '<div class="kv"><span>' + NF.icon(ic) + ' ' + e(k) + '</span><strong>' + e(v) + '</strong></div>'; };
  return head(S, 'Platí vždy, i bez připojení', 'Bezpečí') +
    glass('<h2>Kam se obrátit</h2>' + row('stethoscope', 'Zdravotní potíže', 'ordinace podle pokynů') + row('shield', 'Ohrožení života', 'záchranná služba') + row('cog', 'Nefunguje aplikace nebo senzor', 'technická podpora') + '<p class="small muted">V ukázce nejsou skutečná čísla. Aplikace sama nikam nic neposílá.</p>') +
    glass('<h2>Osobní pokyny od lékaře</h2>' + instructionsList(S, p, false, ['I-HYPO', 'I-KONTAKT', 'I-MENE', 'I-NEVIM', 'I-VYSOKA', 'I-NEMOC-BAZAL', 'I-NEMOC-JIDLO']) + '<p class="small muted" style="margin-top:8px">Zadal lékař ' + (p ? e(NF.fmtShort(p.issuedAt)) : '') + '. Aplikace k nim nic nepřidává.</p>') +
    glass('<div class="sick">' + NF.icon('thermometer') + ' ' + (ill ? 'Nemoc trvá od ' + e(NF.fmtShort(S.illness.from)) : 'Nemoc · není mi dobře') + ' <button type="button" class="toggle ' + (ill ? 'on' : '') + '" role="switch" aria-checked="' + (ill ? 'true' : 'false') + '" data-action="illness" data-value="' + (ill ? 'off' : 'on') + '" aria-label="Nemoc"></button></div>');
};

/* ---------- report před kontrolou ---------- */
V.preview = function (S) {
  var p = NF.activePlan(S); if (!p) return head(S, 'Před kontrolou', 'Zatím nemáte plán');
  var s = NF.summary(S, p.id), adv = s.advice;
  var known = S.foods.filter(function (f) { return NF.confidence(S, f.id).level === 'known'; });
  var best = null; known.forEach(function (f) { NF.leverStats(S, f.id).forEach(function (x) { if (x.st.n >= 4 && x.st.inTarget / x.st.n >= 0.5 && (!best || x.st.inTarget / x.st.n > best.share)) best = { food: f, lever: x.lever, st: x.st, share: x.st.inTarget / x.st.n }; }); });
  var praise = 'Zapsáno <strong>' + s.meals + ' jídel</strong>' + (s.usualPct >= 80 ? ', z toho ' + Math.round(s.meals * s.usualPct / 100) + ' v obvyklé porci — díky, že ji držíte' : '') + '. Inzulin potvrzený u ' + Math.round(s.meals * (s.asPct || 0) / 100) + ' z ' + s.meals + ' jídel.' +
    (best ? ' U jídla „' + e(best.food.name) + '“ vám pomohl ' + e(NF.LEVERS[best.lever].label.toLowerCase()) + ': ' + best.st.inTarget + ' z ' + best.st.n + ' v cíli.' : '');
  var qs = [];
  if (best) qs.push('Mám pokračovat s tím, že si k ' + best.food.name.toLowerCase() + ' dávám ' + NF.LEVERS[best.lever].label.toLowerCase() + '?');
  if (adv.topReason === 'nothome') qs.push('Rady, které nemám doma, často nepřijmu — dá se to nastavit jinak?');
  if (s.other + s.none > 0) qs.push('Inzulin byl někdy jinak než podle plánu (' + (s.other + s.none) + '×). Je to problém?');
  if (s.illDays) qs.push('Nemoc trvala ' + NF.plural(s.illDays, 'den', 'dny', 'dní') + '. Mám v takové době něco dělat jinak?');
  qs.push('Jsou moje cíle glukózy pořád správné?');
  qs = qs.slice(0, 3); /* 15, odst. 11: tři navržené otázky */
  return head(S, 'Před kontrolou ' + (S.nextVisit ? NF.fmtShort(S.nextVisit) : ''), 'Co uvidí lékař') + importNotice(S) +
    glass('<div class="now"><span class="ic" aria-hidden="true">' + NF.icon('heart') + '</span><div><b>Díky za ' + NF.plural(Math.max(1, NF.daysBetween(p.issuedAt, S.clock)), 'den', 'dny', 'dní') + ' zapisování</b>' + praise + '<br><span class="small muted">Tohle uvidí lékař: co jste zkusili a jak to dopadlo. Žádné známky.</span></div></div>', 'soft') +
    glass('<details class="more"><summary>Podrobnosti v číslech</summary><div class="tiles" style="margin-top:10px">' +
      tile('Jídla', s.meals, 'zapsáno' + (s.snacks ? ' · ' + NF.plural(s.snacks, 'svačina', 'svačiny', 'svačin') : ''), 'c-ok', 'meals') + tile('Obvyklá porce', s.usualPct == null ? '—' : s.usualPct + ' %', 'jídel', s.usualPct == null ? 'c-none' : s.usualPct >= 80 ? 'c-ok' : 'c-warn', 'usual') +
      tile('Inzulin', s.asPct == null ? '—' : s.asPct + ' %', 'podle plánu', s.asPct == null ? 'c-none' : s.asPct >= 80 ? 'c-ok' : 'c-warn', 'ins') + tile('Rady', adv.accepted.n, 'přijato · ' + adv.declined.n + ' odmítnuto', adv.works === 'yes' ? 'c-ok' : 'c-none', 'adv') + '</div><div class="small" style="margin:4px 0 8px">' + appr(S, 'C-CILE') + ' ' + appr(S, 'S-SOUHRN') + '</div>' +
      (S.previewTile ? '<div class="hint sand">' + e(previewDetail(S, s, S.previewTile)) + '</div>' : '<p class="small muted">Klepněte na dlaždici pro vysvětlení.</p>') + '</details>') +
    glass('<h2>Vaše návyky v tomto plánu</h2><ul class="plain">' + NF.activeHabits(S).map(function (h) { return '<li>' + e(h.title) + '</li>'; }).join('') + '</ul><p class="small muted">Jak se vám dařilo, je v číslech výše; návyky si lékař s vámi projde na kontrole.</p>') +
    glass('<h2>Na co se zeptat lékaře</h2><p class="small muted">Klepněte na otázku, kterou si chcete vzít na kontrolu.</p><div class="choice-row" style="flex-direction:column">' +
      qs.map(function (q) { return choice(e(q), 'toggleQuestion', q, S.questions.some(function (x) { return x.text === q; })); }).join('') + '</div>' +
      '<details class="more" style="margin-top:10px"><summary>Chci se zeptat na něco jiného</summary><label class="field"><span>Vlastní otázka</span><textarea data-bind="form.question" placeholder="Napište vlastními slovy">' + e((S.form && S.form.question) || '') + '</textarea></label><div class="actions">' + btn('Uložit otázku', 'saveQuestion', null, 'primary') + '</div></details>') +
    hint('<b>Otázky a přehled uvidí lékař až s vámi v ordinaci.</b> Mezi kontrolami je nikdo nečte.', 'sand');
};
function tile(k, v, d, cls, key) { return '<button type="button" class="tile ' + cls + '" data-action="previewTile" data-value="' + key + '"><div class="k"><i></i>' + e(k) + '</div><div class="v">' + e(String(v)) + '</div><div class="d">' + e(d) + '</div></button>'; }
function previewDetail(S, s, key) {
  return { meals: 'Každý zápis nás učí, jak vaše tělo reaguje. ' + s.incomplete + ' zápisů má mezeru v datech ze senzoru a ' + s.ill + ' je z doby nemoci — ty se do učení nepočítají, ale lékař je vidí.',
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
  ['basal', 'breakfast', 'lunch', 'dinner'].forEach(function (k) { if (p.doses[k].units !== prev.doses[k].units) doseChanges.push((k === 'basal' ? 'bazál' : NF.mealLabel(k)) + ': ' + prev.doses[k].units + ' → <b>' + p.doses[k].units + ' j.</b>'); });
  var newH = S.habits.filter(function (h) { return h.planId === p.id; }), oldH = S.habits.filter(function (h) { return h.planId === prev.id; });
  var added = newH.filter(function (h) { return !oldH.some(function (o) { return o.catalogId === h.catalogId; }); }), removed = oldH.filter(function (h) { return !newH.some(function (o) { return o.catalogId === h.catalogId; }); });
  var pa = NF.planAdvice(S, p), oa = NF.planAdvice(S, prev);
  var advOff = pa.off.filter(function (l) { return oa.off.indexOf(l) < 0; }), advOn = pa.prefer.filter(function (l) { return oa.prefer.indexOf(l) < 0; });
  var instrChange = JSON.stringify(p.instructions) !== JSON.stringify(prev.instructions) || JSON.stringify(p.targets) !== JSON.stringify(prev.targets) ? '<p><b>Pokyny a cíle:</b> lékař je upravil — najdete je v Bezpečí a v Plánu.</p>' : '';
  var adviceChange = advOff.length || advOn.length ? '<p>' + (advOff.length ? (advOff.length > 1 ? 'Rady „' : 'Radu „') + e(advOff.map(function (l) { return NF.LEVERS[l].label; }).join('“, „')) + '“ vám už nenabízíme — lékař ' + (advOff.length > 1 ? 'je' : 'ji') + ' vypnul. ' : '') + (advOn.length ? 'Místo toho vám budeme nabízet „' + e(advOn.map(function (l) { return NF.LEVERS[l].label; }).join('“, „')) + '“.' : '') + ' Dávky se tím nemění.</p>' : '';
  return head(S, 'Nový plán · ' + p.id, 'Co se změnilo') +
    glass('<div class="now"><span class="ic" aria-hidden="true">' + NF.icon('flag') + '</span><div><b>Co teď</b>Projděte si změny a klepněte na „Rozumím, pokračuji“. Od teď platí nový plán.</div></div>') +
    glass('<h2>Dávky inzulinu</h2>' + (doseChanges.length ? '<p>' + doseChanges.join('<br>') + '</p>' + hint('<b>Změna dávky = učíme se znovu.</b> S novou dávkou bude tělo reagovat jinak, proto u těchto jídel začínáme od nuly. Staré zápisy zůstávají označené původní dávkou.', 'sand') : '<p>Beze změny.</p>') + dosesTable(p)) +
    glass('<h2>Návyky a rady</h2>' + (added.length ? '<p><b>Nové:</b> ' + e(added.map(function (h) { return h.title; }).join(', ')) + '</p>' : '') + (removed.length ? '<p><b>Končí:</b> ' + e(removed.map(function (h) { return h.title; }).join(', ')) + '</p>' : '') + adviceChange + instrChange + (!added.length && !removed.length && !adviceChange && !instrChange ? '<p>Pokračují beze změny.</p>' : '') +
      (p.decisions && p.decisions.length ? '<details class="more"><summary>Proč lékař rozhodl takto</summary><ul class="plain small">' + p.decisions.map(function (d) { return '<li><b>' + e(d.title) + '</b> — ' + e(d.text) + '</li>'; }).join('') + '</ul></details>' : '')) +
    '<div class="actions">' + (p.understood ? btn('Přejít na Dnes', 'page', 'today', 'primary big') : btn('Rozumím, pokračuji', 'confirmUnderstanding', null, 'primary big')) + '</div>';
};

})(typeof window !== 'undefined' ? window : globalThis);
