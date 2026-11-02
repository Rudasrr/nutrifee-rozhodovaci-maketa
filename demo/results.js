/* Výsledky garanta pro správce (7. 10. 2026; přestavěno 27. 10. 2026, rozhodnutí vlastníka O4). Čte tabulku rozhodnutí ze Supabase pod přihlášením správce
   (pravidlo RLS: garant vidí jen své řádky, správce všechny). Nahoře volič garanta (účty z dat, nic napevno v kódu); vše pod ním platí pro jeden účet.
   Záložka „Po scénách“: jak garant každou scénu opustil (stav a poznámka položek ze záznamu kind 'scene') a „později: …“, pokud se to změnilo.
   Záložka „Registr“: všechny položky garanta na jednom místě se stavem, poznámkou, kdy, ve které scéně a historií.
   Jen čtení; nic nemění. Jádro app/ o tom neví.
   Kontrola 4 (30. 10. 2026): účty podle user_id (e-mail jen popisek, B5/B6 z 05; popisky escapované), výchozí účet není vlastní účet správce (M7 z 01),
   čtení po stránkách (A4), pořadí podle účinného času (D.sync.cmp, B4), poznámka hned před rozhodnutím se stejným textem se nepočítá jako druhý záznam (M8),
   u položky „rozhodnuto k předchozímu znění“, když otisk z rozhodnutí nesedí s dnešním (rozhodnutí vlastníka 30. 10. 2026, bod 1),
   a jen pro správce export „Stáhnout JSON“ / „Stáhnout CSV“ z už načtených řádků, bez sítě (bod 2; formát v navrhy-designu/30-…/10-predani-programatorovi.md).
   Závěrečné ověření 1. 11. 2026 (31/01): rozhodnutí nad modelovou verzí příběhu = neplatí pro dnešní znění (A1), „Po scénách“ podle scény řádku decision (B1),
   pořadí D.sync.sortRows (B2), fpCat a fpExtra v exportu (C1, C8), decided_by správce (C3), sestavení (C4), nejdál = maximum, potvrzení před resetem (C5), vznik poznámky (C7). */
(function (global) {
'use strict';
var NF = global.NutriFee, D = global.NutriFeeDemo, e = NF.esc;
var btn = function (l, a, v, c, x) { return NF.screens.btn(l, a, v, c, x); };
var rows = null, loading = false, err = null, loadedAt = null, who = null, tab = 'sceny', filt = null;
function cfg() { return D.syncConfig || {}; }
function rerender() { if (NF.currentDrawer && NF.currentDrawer() === 'results') NF.openDrawer('results'); }
function load() {
  if (loading || !D.auth || !D.auth.session() || typeof global.fetch !== 'function' || !cfg().url) return;
  loading = true; err = null; rerender();
  var get = D.sync && D.sync.fetchAll ? D.sync.fetchAll('') : D.auth.ensure().then(function (token) {
    return global.fetch(String(cfg().url).replace(/\/$/, '') + '/rest/v1/' + cfg().table + '?select=*&order=at.asc&limit=5000', { mode: 'cors', headers: { 'apikey': cfg().key, 'Authorization': 'Bearer ' + token } });
  }).then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); });
  get.then(function (j) { rows = j || []; loadedAt = new Date().toISOString(); })
    .catch(function (x) { err = String(x && x.message || x); })
    .then(function () { loading = false; rerender(); });
}
function fmt(iso) { if (!iso) return '–'; var d = new Date(iso); if (isNaN(d.getTime())) return '–'; /* neplatné datum nikdy jako surový text (nález 1, 23. 10. 2026) */ return d.getDate() + '. ' + (d.getMonth() + 1) + '. ' + d.getFullYear() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
function hm(iso) { var d = new Date(iso); return isNaN(d.getTime()) ? '' : d.getDate() + '. ' + (d.getMonth() + 1) + '. ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
var LABEL = { approved: ['schváleno', 'ok'], rejected: ['zamítnuto', 'bad'] };
var HOW = { dal: 'Dál ▶', skok: 'skok přes Přehled scén', zpet: 'Zpět', konec: 'konec ukázky' };
var WHERE = { panel: 'v panelu', zasuvka: 'v zásuvce', souhrn: 'v souhrnu', registr: 'v registru' };
function statusTag(st) { var l = LABEL[st] || ['nerozhodnuto', '']; return '<span class="tag ' + l[1] + '">' + l[0] + '</span>'; } /* K2 (kontrola 3): jedno slovo jako u garanta */
function stat(v, k) { return '<div class="box stat"><b>' + e(String(v)) + '</b><span class="small muted">' + e(k) + '</span></div>'; }
/* Pořadí řádků: účinný čas (čas klienta opravený o posun hodin, nejvýš čas přijetí serverem), pořadové číslo, čas přijetí (D.sync.cmp, B4). */
function byAt(a, b) { if (D.sync && D.sync.cmp) return D.sync.cmp(a, b); var x = String(a.at || ''), y = String(b.at || ''); return x < y ? -1 : x > y ? 1 : 0; }
/* 31 B2: celé seznamy přes D.sync.sortRows (řádky téhož prohlížeče podle seq, klíče spočítané nad celou množinou) */
function sorted(list) { return D.sync && D.sync.sortRows ? D.sync.sortRows(list) : list.slice().sort(byAt); }
function effOf(r) { var t = D.sync && D.sync.effMs ? D.sync.effMs(r) : Date.parse(r.at); return isNaN(t) ? null : new Date(t).toISOString(); }
/* Účet řádku: user_id (plní server, B5); e-mail je jen popisek. Řádky bez user_id (staré, testovací) podle e-mailu. */
function acct(r) { return r.user_id || r.user_email || r.decided_by || '?'; }
function accounts(all) {
  var last = Object.create(null), mail = Object.create(null); /* klíče z dat serveru: bez prototypu (nález 7) */
  all.slice().sort(byAt).forEach(function (r) { var k = acct(r); last[k] = r; if (r.user_email) mail[k] = String(r.user_email); });
  var me = D.auth && D.auth.session && D.auth.session(), myId = me && me.user ? me.user.id : null;
  var list = Object.keys(last).sort(function (a, b) { return byAt(last[b], last[a]); }).map(function (k) { return { key: k, last: last[k].at, label: mail[k] || k, own: !!myId && k === myId }; });
  var cnt = Object.create(null); list.forEach(function (a) { cnt[a.label] = (cnt[a.label] || 0) + 1; });
  list.forEach(function (a) { a.value = cnt[a.label] === 1 ? a.label : a.key; });
  /* M7 (01): vlastní účet správce až na konec, výchozí je naposledy aktivní garant */
  return list.filter(function (a) { return !a.own; }).concat(list.filter(function (a) { return a.own; }));
}
/* Řádky jednoho účtu; rozhodnutí, poznámky a scény jen po posledním resetu (řádek kind 'reset'), průchod a souhrn celé. */
function forAccount(all, k) {
  var mine = sorted(all.filter(function (r) { return acct(r) === k; })), cut = -1;
  mine.forEach(function (r, i) { if (r.kind === 'reset') cut = i; });
  return { all: mine, live: mine.filter(function (r, i) { return i > cut && r.kind !== 'reset' && r.kind !== 'progress' && r.kind !== 'summary'; }) };
}
/* M8 (01): poznámka, po které do 10 s přišlo rozhodnutí téže položky se stejným textem, je součást rozhodnutí – v historii a „později“ se nepočítá zvlášť. */
function collapse(rs) {
  return rs.filter(function (r, i) {
    var n = rs[i + 1]; if (r.kind !== 'note' || !n || n.kind !== 'decision' || (n.comment || '') !== (r.comment || '')) return true;
    var a = D.sync && D.sync.effMs ? D.sync.effMs(r) : Date.parse(r.at), b = D.sync && D.sync.effMs ? D.sync.effMs(n) : Date.parse(n.at);
    return !(b - a <= 10000);
  });
}
/* Platný stav položky z řádků decision/note: stav = poslední rozhodnutí, poznámka = text posledního řádku (rozhodnutí nebo poznámka). */
function itemState(live, id) {
  var rs = collapse(sorted(live.filter(function (r) { return r.item === id && (r.kind === 'decision' || r.kind === 'note'); }))), lastD = null, last = null;
  rs.forEach(function (r) { last = r; if (r.kind === 'decision') lastD = r; });
  return { status: lastD ? lastD.status : null, note: last ? (last.comment || '') : '', lastD: lastD, last: last, rows: rs };
}
/* Otisk z rozhodnutí vs. dnešní znění (rozhodnutí vlastníka 30. 10. 2026, bod 1). */
function verInfo(d, id) {
  if (!d) return { applies: null, why: 'nerozhodnuto' };
  var v = d.params && d.params.ver;
  if (!v || !v.fp) return { applies: null, why: 'rozhodnutí nenese otisk znění (zapsáno před 30. 10. 2026, schema ' + (d.schema != null ? d.schema : '?') + '); ověřte ručně podle gitu' };
  var t = D.sync && D.sync.todayVer ? D.sync.todayVer(id, v.alg) : null, ok = D.sync && D.sync.sameVer ? D.sync.sameVer(v, id) : null;
  /* 31 A1: garant rozhodl nad jiným zněním, než je v kódu (modelová verze příběhu) */
  if (D.sync && D.sync.shownDiffers && D.sync.shownDiffers(v)) return { applies: false, model: true, why: 'rozhodnuto nad modelovou verzí příběhu (garant viděl verzi ' + (v.shown.version || '?') + ', otisk ' + v.shown.fp + '; v kódu verze ' + (v.version || '?') + ', otisk ' + v.fp + '); znění v kódu garant neschvaloval, znovu ke schválení', ver: v, today: t };
  if (ok == null) return { applies: null, why: 'dnešní otisk nejde spočítat (' + (v.alg || '?') + ')', ver: v, today: t };
  return ok ? { applies: true, why: 'platí pro dnešní znění', ver: v, today: t } :
    { applies: false, why: 'rozhodnuto k předchozímu znění (verze ' + (v.version || '?') + ', otisk ' + v.fp + (v.fpGuide ? '/' + v.fpGuide : '') + '; dnes verze ' + (t && t.version) + ', otisk ' + (t && t.fp) + (t && t.fpGuide ? '/' + t.fpGuide : '') + '); znovu ke schválení', ver: v, today: t };
}
function verLine(d, id) {
  var vi = verInfo(d, id); if (!d) return '';
  if (vi.model) return '<div class="small"><span class="tag warn">rozhodnuto nad modelovou verzí příběhu</span> <span class="muted">garant viděl verzi ' + e(String(vi.ver.shown.version || '?')) + ' ze scénáře příběhu, v kódu je ' + e(String(vi.ver.version || '?')) + '; znění v kódu neschvaloval</span></div>';
  if (vi.applies === false) return '<div class="small"><span class="tag warn">rozhodnuto k předchozímu znění</span> <span class="muted">verze ' + e(String(vi.ver.version || '?')) + ' → dnes ' + e(String(vi.today && vi.today.version || '?')) + '; znění, parametry nebo průvodce se od rozhodnutí změnily</span></div>';
  if (vi.applies == null) return '<div class="small muted">bez otisku znění – rozhodnuto před jeho zavedením</div>';
  return '';
}
D.resultsState = itemState;
/* Kde ve příběhu je scéna (číslo od 1): hlavní linie „scéna n z N“, dodatek „varianta k z M“; název scény vždy (kontrola 3: ne „scéna 31 z 31“). */
function sceneWhere(no, title) {
  var sc = D.scenes || [], i = Number(no) - 1, x = sc[i], name = title || sceneName(i);
  if (!x) return name ? '„' + e(name) + '“' : 'scéna ' + e(String(no));
  var main = sc.filter(function (y) { return !y.appendix; }).length, ap = sc.map(function (y, k) { return y.appendix ? k : -1; }).filter(function (k) { return k >= 0; });
  var nm = String(name).replace(/^Dodatek\s*·\s*/, ''), q = /^„/.test(nm) ? e(nm) : '„' + e(nm) + '“'; /* název, který sám začíná citací, se do uvozovek nebalí */
  return q + ' (' + (x.appendix ? 'dodatek, varianta ' + (ap.indexOf(i) + 1) + ' z ' + ap.length : 'scéna ' + (i + 1) + ' z ' + main + ' hlavní linie') + ')';
}
/* M5 (kontrola 3): „prošel celou maketu“ jen když opravdu navštívil (opustil) každou scénu hlavní linie před finále, došel do finále a potvrdil souhrn;
   jinak „souhrn potvrzen“ a počet nenavštívených scén. Navštívená = má řádek „scene“ (opuštění) nebo je to finále, kam došel. */
function visitInfo(all) {
  var sc = D.scenes || [], left = {}, fin = -1;
  sc.forEach(function (x, i) { if (!x.appendix) fin = i; });
  all.forEach(function (r) { if (r.kind === 'scene' && r.scene != null) left[Number(r.scene) - 1] = 1; });
  var miss = []; sc.forEach(function (x, i) { if (!x.appendix && i < fin && !left[i]) miss.push(i); });
  return { miss: miss, fin: fin };
}
D.resultsVisit = visitInfo;
/* 31 C5: nejdál = řádek progress s nejvyšší scénou (po odhlášení začíná průchod znovu od 1, nižší scéna z posledního řádku by nejdál zkreslila) */
function furthest(all) { var best = null; all.forEach(function (r) { if (r.kind !== 'progress') return; var n = Number(r.params && r.params.scene) || 0, b = best ? Number(best.params && best.params.scene) || 0 : -1; if (n > b || (n === b && byAt(best, r) < 0)) best = r; }); return best; }
function progressBlock(all) {
  var prog = furthest(all), sum = null;
  all.forEach(function (r) { if (r.kind === 'summary' && (!sum || byAt(sum, r) < 0)) sum = r; });
  var p = prog && prog.params || {}, sm = sum && sum.params || null, v = visitInfo(all), atEnd = !!(sm || (p.scene && p.mainEnd && p.scene >= p.mainEnd));
  var skipped = v.miss.length ? ' · nenavštívené scény hlavní linie: ' + v.miss.length + ' (' + v.miss.slice(0, 6).map(function (i) { return i + 1; }).join(', ') + (v.miss.length > 6 ? ', …' : '') + ')' : '';
  var full = sm ? (v.miss.length ? 'ne – souhrn potvrzen ' + e(fmt(sum.at)) + skipped : 'ano – všechny scény hlavní linie, souhrn potvrzen ' + e(fmt(sum.at))) :
    atEnd ? 'ne – došel na konec hlavní linie, souhrn zatím nepotvrdil' + skipped : 'zatím ne';
  return '<div class="box mt-3 mb-3"><b>Průchod maketou</b><div class="small mt-1">nejdál: ' + (p.scene ? sceneWhere(p.scene, p.title) + ' · ' + e(fmt(prog.at)) : '–') + '<br>prošel celou maketu: ' + full +
    (sm ? '<br>v souhrnu: schváleno ' + e(String(sm.approved)) + ' · zamítnuto ' + e(String(sm.rejected)) + ' · nerozhodnuto ' + e(String(sm.pending)) + (sm.rejectedIds && sm.rejectedIds.length ? ' · zamítnuté: ' + e(sm.rejectedIds.join(', ')) : '') : '') + '</div></div>';
}
function sceneName(i) { var sc = D.scenes && D.scenes[i]; return sc ? (sc.title || (D.chapters && D.chapters[sc.ch] ? D.chapters[sc.ch].title : '')) : ''; }
function itemTitle(items, id) { var r = items.filter(function (x) { return x.id === id; })[0]; return r ? r.title : id; }
function whereTxt(r) { return r && r.params && WHERE[r.params.where] ? ' (' + WHERE[r.params.where] + ')' : ''; }
/* M8 (01): záznam poznámky se jmenuje „poznámka“, ne jako rozhodnutí; rozhodnutí jen když se stav opravdu změnil. */
function laterText(cur, it) {
  var c = cur, d = c.lastD, n = c.last, noteChanged = c.note !== (it.note || ''), parts = [];
  if (c.status !== it.status) parts.push((LABEL[c.status] ? LABEL[c.status][0] : 'nerozhodnuto') + (d ? ' ' + e(hm(effOf(d))) : '') + whereTxt(d));
  if (noteChanged) {
    var viaNote = n && n.kind === 'note' && (!d || byAt(d, n) < 0);
    var t = c.note ? '„' + e(c.note) + '“' : 'poznámka smazána';
    parts.push(viaNote || !parts.length ? (c.note ? 'poznámka ' + e(hm(effOf(n))) + whereTxt(n) + ' ' + t : t + ' ' + e(hm(effOf(n))) + whereTxt(n)) : t);
  }
  return 'později: ' + parts.join(' · ');
}
/* Záložka „Po scénách“: scény hlavní linie a dodatku v pořadí příběhu. */
/* 31 B1: rozhodnutí položky platné v okamžiku odchodu ze scény (poslední decision před řádkem scene) */
function decAt(live, id, leaveRow) { var d = null; live.forEach(function (r) { if (r.kind === 'decision' && r.item === id && byAt(r, leaveRow) < 0) d = r; }); return d; }
function elsewhere(d, no) { return d && d.scene != null && Number(d.scene) !== Number(no) ? ' <span class="muted">(rozhodnuto ve scéně ' + e(String(d.scene)) + (d.params && WHERE[d.params.where] ? ', ' + WHERE[d.params.where] : '') + ')</span>' : ''; }
function scenesTab(live, items) {
  var leaves = live.filter(function (r) { return r.kind === 'scene'; });
  return '<ol class="plain results res-scenes">' + (D.scenes || []).map(function (sc, i) {
    var ls = leaves.filter(function (r) { return Number(r.scene) === i + 1; }), first = ls[0];
    var head = '<div class="res-head"><b>Scéna ' + (i + 1) + ' · ' + e(sceneName(i)) + '</b>' + (sc.appendix ? '<span class="tag">dodatek</span>' : '') + '</div>';
    if (!first) {
      var plan = D.decisionItems ? D.decisionItems(i) : [], cur = plan.map(function (id) { return { id: id, c: itemState(live, id) }; }).filter(function (x) { return x.c.status || x.c.note; });
      return '<li class="res">' + head + '<div class="small muted">nenavštívena (bez záznamu o odchodu)</div>' + (cur.length ? '<ul class="plain small">' + cur.map(function (x) { return '<li>' + e(x.id) + ' · ' + e(itemTitle(items, x.id)) + ' ' + statusTag(x.c.status) + (x.c.note ? ' „' + e(x.c.note) + '“' : '') + ' <span class="muted">(rozhodnuto mimo scénu' + (x.c.lastD && x.c.lastD.params && WHERE[x.c.lastD.params.where] ? ', ' + WHERE[x.c.lastD.params.where] : '') + ')</span></li>'; }).join('') + '</ul>' : '') + '</li>';
    }
    var leave = function (r, withLater) {
      var p = r.params || {}, its = (p.items || []).slice(), have = {};
      its.forEach(function (it) { have[it.id] = 1; });
      /* 31 B1: rozhodnutí z této scény, která snímek nemá (starší řádky, než sceneLeave ukládal i rozhodnuté položky): stav v okamžiku odchodu */
      live.forEach(function (x) { if (x.kind === 'decision' && Number(x.scene) === i + 1 && !have[x.item] && byAt(x, r) < 0) { var dd = decAt(live, x.item, r); have[x.item] = 1; its.push({ id: x.item, status: dd ? dd.status : null, note: dd ? dd.comment || '' : '', added: true }); } });
      return '<div class="small">opuštěna ' + e(fmt(effOf(r) || r.at)) + ' (' + e(HOW[p.how] || p.how || '?') + ')' + (its.length ? '' : ' · bez položek ke schválení') + '</div>' +
        (its.length ? '<ul class="plain small res-items">' + its.map(function (it) {
          var cur = itemState(live, it.id), changed = withLater && cur.last && byAt(cur.last, r) > 0 && (cur.status !== it.status || (it.noteLen == null && cur.note !== (it.note || '')));
          return '<li><b>' + e(it.id) + '</b> ' + e(itemTitle(items, it.id)) + ' ' + statusTag(it.status) + ' ' + (it.note ? '„' + e(it.note) + '“' : '<span class="muted">–</span>') + (it.status ? elsewhere(decAt(live, it.id, r), i + 1) : '') + (it.added ? ' <span class="muted">(zamítnutí jiné položky ji ze scény odebralo)</span>' : '') + (changed ? ' <span class="res-later">' + laterText(cur, it) + '</span>' : '') + '</li>';
        }).join('') + '</ul>' : '');
    };
    return '<li class="res">' + head + leave(first, true) + (ls.length > 1 ? '<details class="more"><summary>další průchody (' + (ls.length - 1) + ')</summary>' + ls.slice(1).map(function (r) { return leave(r, false); }).join('') + '</details>' : '') + '</li>';
  }).join('') + '</ol>';
}
/* Záložka „Registr“: všechny položky garanta v kategoriích registru. */
function registryTab(live, items) {
  var cats = NF.CATS || [];
  var list = items.map(function (it) { return { it: it, c: itemState(live, it.id) }; }).filter(function (x) {
    return !filt || (filt === 'todo' ? !x.c.status : filt === 'rejected' ? x.c.status === 'rejected' : filt === 'noted' ? !!x.c.note : true);
  });
  var out = '<div class="filters" role="group" aria-label="Filtr položek">' + [['todo', 'nerozhodnuté'], ['rejected', 'zamítnuté'], ['noted', 's poznámkou']].map(function (f) { return btn(f[1], 'resultsFilter', f[0], 'sm' + (filt === f[0] ? ' selected' : ''), ' aria-pressed="' + (filt === f[0] ? 'true' : 'false') + '"'); }).join('') + '</div>';
  if (!list.length) return out + '<p class="muted">Nic neodpovídá filtru.</p>';
  return out + cats.map(function (c) {
    var xs = list.filter(function (x) { return x.it.cat === c[0]; }); if (!xs.length) return '';
    return '<h3>' + e(c[1]) + '</h3><ul class="plain results">' + xs.map(function (x) {
      var d = x.c.lastD, hist = x.c.rows.slice().reverse();
      return '<li class="res"><div class="res-head"><b>' + e(x.it.id) + ' · ' + e(x.it.title) + '</b>' + statusTag(x.c.status) + '</div>' +
        (x.c.note ? '<div class="res-comment">„' + e(x.c.note) + '“</div>' : '') +
        (d ? '<div class="small">' + e(fmt(effOf(d))) + (d.scene ? ' · scéna ' + e(String(d.scene)) + (d.scene_title ? ': ' + e(d.scene_title) : '') : '') + (d.params && WHERE[d.params.where] ? ' · ' + WHERE[d.params.where] : '') + (d.user_email ? ' · ' + e(d.user_email) : '') + (d.decided_by === 'spravce' ? ' · <span class="tag">zapsal správce</span>' : '') + '</div>' + verLine(d, x.it.id) : '<div class="small muted">zatím nerozhodnuto</div>') +
        (hist.length ? '<details class="more"><summary>historie (' + hist.length + ')</summary><ul class="plain small">' + hist.map(function (h) { return '<li>' + e(fmt(effOf(h))) + ' · ' + (h.kind === 'note' ? (h.comment ? 'poznámka' : 'poznámka smazána') : (LABEL[h.status] || ['?'])[0]) + (h.comment ? ' · „' + e(h.comment) + '“' : '') + (h.scene ? ' · scéna ' + e(String(h.scene)) : '') + (h.params && WHERE[h.params.where] ? ' · ' + WHERE[h.params.where] : '') + '</li>'; }).join('') + '</ul></details>' : '') + '</li>';
    }).join('') + '</ul>';
  }).join('');
}
function panel(s) { return panelInner(s) + '</div>'; }
function panelInner(s) {
  var items = s.registry ? NF.garantItems(s) : []; /* jen klinické položky garanta; provozní pravidla neschvaluje nikdo */
  var out = '<div class="pres-drawer res-drawer"><h2>Výsledky garanta</h2><p class="muted">Co garant v maketě rozhodl a jak jednotlivé scény opustil. Načteno ze serveru pod přihlášením správce; neformální rozhodnutí k maketě.</p>' +
    '<div class="actions mt-0">' + btn(loading ? 'Načítám…' : 'Obnovit', 'resultsReload', null, 'sm', loading ? ' disabled' : '') + btn('Zavřít', 'closeDrawer', null, 'sm quiet') + (loadedAt ? '<span class="small muted">načteno ' + e(fmt(loadedAt)) + '</span>' : '') + '</div>';
  if (err) out += '<div class="error" role="alert">Nepodařilo se načíst: ' + e(err) + '</div>';
  if (!rows) return out + (loading ? '' : '<p class="muted">Zatím nic nenačteno.</p>');
  var accs = accounts(rows);
  if (!accs.length) return out + '<p class="muted">Zatím žádný záznam. Jakmile garant v maketě rozhodne první položku, objeví se tady.</p>';
  if (!who || !accs.some(function (a) { return a.key === who; })) who = accs[0].key; /* výchozí: naposledy aktivní účet garanta, ne vlastní účet správce (M7) */
  out += '<div class="filters res-who" role="group" aria-label="Garant">' + accs.map(function (a) { return btn(e(a.label) + (a.own ? ' (vy)' : ''), 'resultsWho', a.value, 'sm' + (a.key === who ? ' selected' : ''), ' aria-pressed="' + (a.key === who ? 'true' : 'false') + '"'); }).join('') + '</div>'; /* B6 (05): popisek z dat serveru escapovaný */
  var mine = forAccount(rows, who), live = mine.live, c = { decided: 0, approved: 0, rejected: 0, noted: 0 };
  items.forEach(function (it) { var x = itemState(live, it.id); if (x.status) { c.decided++; c[x.status] = (c[x.status] || 0) + 1; } if (x.note) c.noted++; });
  var vis = items.map(function (it) { return verInfo(itemState(live, it.id).lastD, it.id); }), stale = vis.filter(function (v) { return v.applies === false && !v.model; }).length, model = vis.filter(function (v) { return v.model; }).length;
  out += progressBlock(mine.all) + '<div class="grid2 stats">' + stat(c.decided + ' z ' + items.length, 'rozhodnuto') + stat(c.approved, 'schváleno') + stat(c.rejected, 'zamítnuto') + stat(c.noted, 's poznámkou') + '</div>' +
    (stale ? '<p class="small"><span class="tag warn">' + stale + '× rozhodnuto k předchozímu znění</span> <span class="muted">znění položky se od rozhodnutí změnilo; v předávce jde znovu ke schválení</span></p>' : '') +
    (model ? '<p class="small" role="status"><span class="tag warn">' + model + '× rozhodnuto nad modelovou verzí příběhu</span> <span class="muted">garant viděl jiné znění, než je v kódu; v předávce jde znovu ke schválení</span></p>' : '') +
    (isAdmin() ? '<div class="actions">' + btn('Stáhnout JSON', 'resultsExport', 'json', 'sm') + btn('Stáhnout CSV', 'resultsExport', 'csv', 'sm') + '<span class="small muted">rozhodnutí vybraného účtu se zněním položek, pro předání programátorovi</span></div>' : '');
  out += '<div class="filters res-tabs" role="group" aria-label="Pohled">' + [['sceny', 'Po scénách'], ['registr', 'Registr']].map(function (t) { return btn(t[1], 'resultsTab', t[0], 'sm' + (tab === t[0] ? ' selected' : ''), ' aria-pressed="' + (tab === t[0] ? 'true' : 'false') + '"'); }).join('') + '</div>';
  return out + (tab === 'registr' ? registryTab(live, items) : scenesTab(live, items));
}
/* ---------- export pro správce (rozhodnutí vlastníka 30. 10. 2026, bod 2) ----------
   Z už načtených řádků vybraného účtu, bez sítě. JSON: rozhodnutí, poznámka, historie, otisk v době rozhodnutí, příznak platnosti, celé znění a parametry
   položky, průvodce a surové řádky. CSV: řádek na položku, oddělovač ;, UTF-8 s BOM. Formát popisuje navrhy-designu/30-…/10-predani-programatorovi.md. */
function isAdmin() { return !!(D.auth && D.auth.role && D.auth.role() === 'admin'); }
var STATE_CS = { approved: 'schváleno', rejected: 'zamítnuto', pending: 'ke schválení' };
/* Průvodce s parametry dosazenými z kódu (31 C9; co = vstup otisku fp), surové texty (vstup fpGuide) – export tak stačí k přepočtu otisků (31 B4). */
function plainGuide(id) {
  var g = D.guideRaw && D.guideRaw[id] || D.guide && D.guide[id]; if (!g) return null;
  var fill = D.sync && D.sync.codeFill ? function (t) { return D.sync.codeFill(id, t); } : String;
  var o = {}; ['proc', 'jak', 'kde', 'co', 'dopad'].forEach(function (k) { if (g[k] != null) o[k] = typeof g[k] === 'string' ? fill(g[k]) : String(g[k]); });
  if (g.dopadSceny) o.dopadSceny = JSON.parse(JSON.stringify(g.dopadSceny)); if (g.ucinek) o.ucinek = JSON.parse(JSON.stringify(g.ucinek)); return o;
}
function rawGuide(id) { var g = D.guideRaw && D.guideRaw[id]; return g ? JSON.parse(JSON.stringify(g)) : null; }
function patientText(c) {
  if (!c) return '';
  if (c.text) return String(c.text);
  if (c.instruction && c.instruction.text) return String(c.instruction.text);
  if (c.texts) return Object.keys(c.texts).map(function (k) { return k + ': ' + c.texts[k]; }).join(' | ');
  return '';
}
/* 31 B4: popis otisku podle alg (přesný pseudokód v 10-predani-programatorovi.md odst. 5) */
var FP_DESC = {
  core: 'fp (alg core) = NF.itemFingerprint(položka z app/data/registry.js, { co }): s = canon({ item: { klíče id, scope, cat, title, summary, detail, text, texts, lists, postup, sestra, params, labels, jen ty, které nejsou null ani undefined }, co: text „Co schvalujete“ z demo/guide.js po dosazení parametrů z kódu (nebo null) }); nad kódovými jednotkami UTF-16 řetězce s (charCodeAt) dvě 32bitové funkce: h1 = 0x811c9dc5, h1 ^= c, h1 = h1 * 0x01000193 mod 2^32 (FNV-1a); h2 = 0x01000193 xor 0x5bd1e995, h2 ^= (c * 31 + i) and 0xffff, h2 = h2 * 0x01000193 mod 2^32; výsledek \'fp-\' + hex8(h1) + hex8(h2).',
  sync1: 'fp (alg sync1, jen řádky z doby před otiskem jádra) = FNV-1a 32 nad bajty UTF-8 canon(itemContent): klíče id, cat, scope, title, summary, detail, usedBy, params, labels, steps, texts, lists, postup, text, lever, kind z položky v kódu + bounds (PARAM_BOUNDS[id] nebo null), instruction (záznam catalogs.instructions s id, nebo null), habits (návyky s item = id).',
  common: 'fpGuide = FNV-1a 32 nad bajty UTF-8 canon(D.guideRaw[id]) – surové texty průvodce před dosazením parametrů (proc, jak, kde, co, dopad, dopadSceny, ucinek; jen klíče, které položka má). fpCat = FNV-1a 32 UTF-8 canon({ bounds: PARAM_BOUNDS[id] z app/core.js nebo null, instruction: záznam z catalogs.instructions nebo null, habits: návyky s item = id }). fpExtra = FNV-1a 32 UTF-8 canon({ usedBy, steps, safety: V.SAFETY_ITEMS[id] z app/screens-clinic.js nebo null }). canon = JSON se seřazenými klíči objektů (podle kódových jednotek), bez undefined a funkcí, bez mezer; hex8 = 8 číslic malými písmeny. ver.shown = { version, fp } položky, jak ji garant viděl.'
};
/* 31 C7: kdy poznámka s platným textem vznikla – první řádek téhož textu v nepřerušené řadě před posledním */
function noteFirst(full, text, last) { var first = last, i = full.indexOf(last); for (var k = i - 1; k >= 0; k--) { if ((full[k].comment || '') !== text) break; first = full[k]; } return effOf(first); }
function slug(v) { return String(v || 'ucet').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'ucet'; }
function exportData(fmt) {
  if (!rows || !D.sync) return null;
  var s = NF.getState(), items = s && s.registry ? NF.garantItems(s) : [], accs = accounts(rows);
  if (!accs.length) return null;
  if (!who || !accs.some(function (a) { return a.key === who; })) who = accs[0].key;
  var acc = accs.filter(function (a) { return a.key === who; })[0], mine = forAccount(rows, who), live = mine.live, now = new Date().toISOString();
  var me = D.auth && D.auth.session ? D.auth.session() : null;
  var list = items.map(function (it) {
    var full = live.filter(function (r) { return r.item === it.id && (r.kind === 'decision' || r.kind === 'note'); }).sort(byAt), c = itemState(live, it.id), d = c.lastD, vi = verInfo(d, it.id);
    var kept = {}; c.rows.forEach(function (r) { kept[r.id] = 1; });
    var tv = D.sync.todayVer(it.id) || {}, content = D.sync.itemContent(it.id) || {}, cur = { version: tv.version, fp: tv.fp, fpGuide: tv.fpGuide, fpCat: tv.fpCat, fpExtra: tv.fpExtra, alg: tv.alg };
    Object.keys(content).forEach(function (k) { if (k !== 'id' && k !== 'cat') cur[k] = content[k]; });
    var code = D.sync.codeItem ? D.sync.codeItem(it.id) : null; /* všechny vstupy otisku jádra (i sestra u D-POSTUP) */
    if (code) (NF.FINGERPRINT_KEYS || []).forEach(function (k) { if (code[k] !== undefined && code[k] !== null && k !== 'id' && k !== 'cat' && cur[k] === undefined) cur[k] = code[k]; });
    cur.guide = plainGuide(it.id); cur.guideRaw = rawGuide(it.id);
    cur.safety = NF.screens && NF.screens.SAFETY_ITEMS && NF.screens.SAFETY_ITEMS[it.id] != null ? String(NF.screens.SAFETY_ITEMS[it.id]) : null;
    return {
      id: it.id, cat: it.cat, catLabel: NF.catLabel ? NF.catLabel(it.cat) : it.cat, title: content.title || it.title,
      state: c.status || 'pending',
      decision: d ? { status: d.status, at: effOf(d), clientAt: d.at || null, receivedAt: d.received_at || null, scene: d.scene == null ? null : d.scene, sceneTitle: d.scene_title || null, where: (d.params && d.params.where) || null, rowId: d.id || null, schema: d.schema == null ? null : d.schema, decidedBy: d.decided_by || null, ver: (d.params && d.params.ver) || null } : null,
      note: c.last && c.note ? { text: c.note, at: effOf(c.last), firstAt: noteFirst(full, c.note, c.last), rowId: c.last.id || null, kind: c.last.kind } : null,
      appliesToCurrent: vi.applies, appliesToCurrentWhy: vi.why, decidedOnModel: !!vi.model,
      history: full.map(function (r) { return { at: effOf(r), clientAt: r.at || null, receivedAt: r.received_at || null, kind: r.kind, status: r.status == null ? null : r.status, comment: r.comment || '', scene: r.scene == null ? null : r.scene, where: (r.params && r.params.where) || null, rowId: r.id || null, schema: r.schema == null ? null : r.schema, ver: (r.params && r.params.ver) || null, partOfNextDecision: !kept[r.id] }; }),
      current: cur
    };
  });
  var prog = furthest(mine.all), pp = (prog && prog.params) || {}, lastProg = null, lastReset = null;
  mine.all.forEach(function (r) { if (r.kind === 'progress') lastProg = r; if (r.kind === 'reset') lastReset = r; });
  var alg = list[0] ? list[0].current.alg : null;
  var data = {
    format: 'nutrifee-garant-export', formatVersion: 1, exportedAt: now, exportedBy: me && me.user ? (me.user.email || me.user.id) : null,
    /* 31 C4: bez D.build (sync-config.js při publikaci) aspoň značka schema-NN; registryFp ze všech otisků včetně fpCat a fpExtra (C1) */
    build: { schema: NF.SCHEMA, build: D.build || null, tag: 'schema-' + NF.SCHEMA, buildNote: D.build ? null : 'sestavení není v sync-config.js zapsané (D.build); dohledat podle gitové značky schema-' + NF.SCHEMA,
      registryFp: D.sync.fnv1a(D.sync.canon(list.map(function (x) { return [x.id, x.current.version, x.current.fp, x.current.fpGuide, x.current.fpCat == null ? null : x.current.fpCat, x.current.fpExtra == null ? null : x.current.fpExtra]; }))),
      registryFpInput: 'fnv1a(canon([[id, version, fp, fpGuide, fpCat, fpExtra] pro 28 položek v pořadí items]))' },
    fingerprint: { alg: alg, description: FP_DESC[alg] || FP_DESC.core, other: FP_DESC.common },
    account: { user_id: (live[0] || mine.all[0] || {}).user_id || (acc.key !== acc.label ? acc.key : null), user_email: acc.label },
    rules: 'Platný stav = poslední decision po posledním reset. Pořadí: řádky téhož prohlížeče a účtu (user_id + client) podle params.seq; klíč řádku = účinný čas (at + params.skewMs, nejvýš received_at), u řádků téhož prohlížeče průběžné maximum podle seq; mezi prohlížeči podle klíče, při shodě client, seq, received_at, id. Poznámka = text posledního řádku decision/note (note.firstAt = kdy text poprvé vznikl). Poznámka, po které do 10 s přišlo rozhodnutí se stejným textem, je jeho součást (partOfNextDecision). appliesToCurrent: true jen když otisky z rozhodnutí (fp, fpGuide, fpCat, fpExtra; chybějící ve starším řádku se nepočítá) sedí s dnešními a garant viděl znění z kódu (ver.shown = fp); false = rozhodnuto k předchozímu znění nebo nad modelovou verzí příběhu (decidedOnModel), znovu ke schválení; null = bez otisku nebo nerozhodnuto. Neformální rozhodnutí k maketě; pro ostrý provoz se pravidla podepisují znovu.',
    progress: { furthestScene: pp.scene || null, furthestTitle: pp.title || null, mainEnd: pp.mainEnd || null, at: prog ? effOf(prog) : null, lastScene: lastProg && lastProg.params ? lastProg.params.scene || null : null, lastAt: lastProg ? effOf(lastProg) : null, lastResetAt: lastReset ? effOf(lastReset) : null,
      summaryConfirmations: mine.all.filter(function (r) { return r.kind === 'summary'; }).map(function (r) { var p = r.params || {}; return { at: effOf(r), beforeReset: !!(lastReset && byAt(r, lastReset) < 0), approved: p.approved, rejected: p.rejected, pending: p.pending, noted: p.noted, total: p.total, rejectedIds: p.rejectedIds || [], pendingIds: p.pendingIds || [], items: p.items || null }; }) },
    items: list,
    scenes: mine.live.filter(function (r) { return r.kind === 'scene'; }).map(function (r) { var p = r.params || {}; return { scene: r.scene, title: r.scene_title || null, at: effOf(r), how: p.how || null, to: p.to == null ? null : p.to, items: p.items || [], pending: p.pending || [] }; }),
    rows: mine.all
  };
  var base = 'nutrifee-rozhodnuti-garanta_' + slug(acc.label) + '_' + now.slice(0, 10);
  if (fmt !== 'csv') return { name: base + '.json', mime: 'application/json', text: JSON.stringify(data, null, 2), data: data };
  var cell = function (v) { if (v == null) return ''; var t = String(v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; /* vzorec v tabulkovém editoru se nespustí */ return /[;"\r\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
  var head = ['id', 'kategorie', 'nazev', 'stav', 'rozhodnuto_kdy', 'scena', 'kde', 'poznamka', 'pocet_zmen', 'schema_rozhodnuti', 'otisk_rozhodnuti', 'otisk_dnes', 'plati_pro_dnesni_zneni', 'parametry_json', 'text_pro_pacienta',
    'verze_rozhodnuti', 'verze_dnes', 'otisk_pruvodce_rozhodnuti', 'otisk_pruvodce_dnes', 'duvod', 'otisk_katalogu_rozhodnuti', 'otisk_katalogu_dnes', 'otisk_dalsich_textu_rozhodnuti', 'otisk_dalsich_textu_dnes',
    'verze_zobrazena', 'otisk_zobrazeny', 'poznamka_vznikla', 'zapsal'];
  var lines = [head.join(';')].concat(list.map(function (x) {
    var dv = x.decision && x.decision.ver;
    return [x.id, x.catLabel, x.title, STATE_CS[x.state] || x.state, x.decision ? x.decision.at : '', x.decision ? x.decision.scene : '', x.decision ? x.decision.where : '', x.note ? x.note.text : '',
      x.history.filter(function (h) { return h.kind === 'decision'; }).length, x.decision ? x.decision.schema : '', dv ? dv.fp : '', x.current.fp, x.appliesToCurrent === true ? 'ano' : x.appliesToCurrent === false ? 'ne' : 'neznámo',
      JSON.stringify(x.current.params || {}), patientText(x.current), dv ? dv.version : '', x.current.version, dv ? dv.fpGuide : '', x.current.fpGuide, x.appliesToCurrentWhy,
      dv ? dv.fpCat : '', x.current.fpCat, dv ? dv.fpExtra : '', x.current.fpExtra, dv && dv.shown ? dv.shown.version : '', dv && dv.shown ? dv.shown.fp : '', x.note ? x.note.firstAt : '', x.decision ? x.decision.decidedBy : ''].map(cell).join(';');
  }));
  return { name: base + '.csv', mime: 'text/csv;charset=utf-8', text: '﻿' + lines.join('\r\n') + '\r\n', data: data };
}
function download(name, mime, text) {
  var doc = global.document, U = global.URL;
  if (!doc || !doc.createElement || typeof global.Blob !== 'function' || !U || !U.createObjectURL) return false;
  try {
    var url = U.createObjectURL(new global.Blob([text], { type: mime })), a = doc.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    if (doc.body && doc.body.appendChild) doc.body.appendChild(a);
    a.click(); if (a.parentNode && a.parentNode.removeChild) a.parentNode.removeChild(a);
    if (typeof global.setTimeout === 'function') global.setTimeout(function () { try { U.revokeObjectURL(url); } catch (err) { } }, 2000);
    return true;
  } catch (err) { return false; }
}
var prevDrawer = NF.slots.drawer;
NF.slots.drawer = function (s, name) { if (name === 'results') return NF.nbsp(panel(s)); return prevDrawer ? prevDrawer(s, name) : ''; };
NF.demoActions = NF.demoActions || {};
NF.demoActions.openResults = function () { if (!D.auth || D.auth.role() !== 'admin') return; NF.openDrawer('results'); if (!rows) load(); };
NF.demoActions.resultsReload = function () { load(); };
NF.demoActions.resultsWho = function (v) { v = String(v || ''); var a = rows ? accounts(rows).filter(function (x) { return x.value === v || x.key === v; })[0] : null; who = a ? a.key : v; NF.openDrawer('results'); };
NF.demoActions.resultsExport = function (v) {
  if (!isAdmin() || !rows) return;
  var x = exportData(v === 'csv' ? 'csv' : 'json'); if (!x) return;
  if (!download(x.name, x.mime, x.text)) { try { NF.getState().toast = 'Stažení se nepodařilo (prohlížeč nepodporuje stahování souborů).'; } catch (err) { } }
};
NF.demoActions.resultsTab = function (v) { if (v === 'sceny' || v === 'registr') tab = v; NF.openDrawer('results'); };
NF.demoActions.resultsFilter = function (v) { filt = filt === v ? null : v; NF.openDrawer('results'); };
D.results = { rows: function () { return rows; }, setRows: function (r) { rows = r; loadedAt = new Date().toISOString(); }, load: load, panel: panel, exportData: exportData, accounts: function () { return rows ? accounts(rows) : []; } };
})(typeof window !== 'undefined' ? window : globalThis);
