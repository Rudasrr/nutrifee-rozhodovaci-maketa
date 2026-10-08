/* Výsledky garanta pro správce (7. 10. 2026, prezentační vrstva). Čte tabulku rozhodnutí ze Supabase pod přihlášením správce
   (pravidlo RLS: garant vidí jen své řádky, správce všechny) a ukazuje poslední stav každé položky registru, komentáře a historii.
   Jen čtení; nic nemění. Jádro app/ o tom neví. */
(function (global) {
'use strict';
var NF = global.NutriFee, D = global.NutriFeeDemo, e = NF.esc;
var btn = function (l, a, v, c, x) { return NF.screens.btn(l, a, v, c, x); };
var rows = null, loading = false, err = null, loadedAt = null;
function cfg() { return D.syncConfig || {}; }
function rerender() { if (NF.currentDrawer && NF.currentDrawer() === 'results') NF.openDrawer('results'); }
function load() {
  if (loading || !D.auth || !D.auth.session() || typeof global.fetch !== 'function' || !cfg().url) return;
  loading = true; err = null; rerender();
  D.auth.ensure().then(function (token) {
    return global.fetch(String(cfg().url).replace(/\/$/, '') + '/rest/v1/' + cfg().table + '?select=*&order=at.asc&limit=5000', { mode: 'cors', headers: { 'apikey': cfg().key, 'Authorization': 'Bearer ' + token } });
  }).then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(function (j) { rows = j || []; loadedAt = new Date().toISOString(); })
    .catch(function (x) { err = String(x && x.message || x); })
    .then(function () { loading = false; rerender(); });
}
function fmt(iso) { if (!iso) return '—'; var d = new Date(iso); if (isNaN(d.getTime())) return String(iso); return d.getDate() + '. ' + (d.getMonth() + 1) + '. ' + d.getFullYear() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
var LABEL = { approved: ['schváleno', 'ok'], edited: ['schváleno s úpravou', 'warn'], rejected: ['zamítnuto', 'bad'] };
function statusTag(st) { var l = LABEL[st] || ['ke schválení', '']; return '<span class="tag ' + l[1] + '">' + l[0] + '</span>'; }
function stat(v, k) { return '<div class="box stat"><b>' + e(String(v)) + '</b><span class="small muted">' + e(k) + '</span></div>'; }
function who(r) { return r.user_email ? e(r.user_email) : (r.decided_by ? e(r.decided_by) : ''); }
function params(r) { if (!r.params) return ''; var p = r.params; return Object.keys(p).map(function (k) { return e(k) + ' = ' + e(String(p[k])); }).join(' · '); }
/* Kam se garant dostal a zda potvrdil souhrn — z řádků kind progress/summary, poslední stav na účet. */
function progressBlock(evs) {
  if (!evs.length) return '<div class="box" style="margin:10px 0"><b>Průchod maketou</b><div class="small muted">Zatím žádný záznam: garant maketu ještě neotevřel po přihlášení.</div></div>';
  var byUser = {};
  evs.forEach(function (r) { var k = r.user_email || r.decided_by || '?'; var u = byUser[k] = byUser[k] || { prog: null, sum: null }; if (r.kind === 'progress' && (!u.prog || String(r.at) > String(u.prog.at))) u.prog = r; if (r.kind === 'summary' && (!u.sum || String(r.at) > String(u.sum.at))) u.sum = r; });
  return '<div class="box" style="margin:10px 0"><b>Průchod maketou</b>' + Object.keys(byUser).map(function (k) {
    var u = byUser[k], p = u.prog && u.prog.params || {}, sm = u.sum && u.sum.params || null;
    var full = sm ? 'ano — souhrn potvrzen ' + fmt(u.sum.at) : (p.scene && p.mainEnd && p.scene >= p.mainEnd ? 'došel na konec hlavní linie, souhrn zatím nepotvrdil' : 'zatím ne');
    return '<div class="small" style="margin-top:6px"><b>' + e(k) + '</b><br>nejdál: ' + (p.scene ? 'scéna ' + e(String(p.scene)) + ' z ' + e(String(p.total || '?')) + (p.title ? ' („' + e(p.title) + '“)' : '') + ' · ' + fmt(u.prog.at) : '—') + '<br>prošel celou maketu: ' + full +
      (sm ? '<br>v souhrnu: schváleno ' + e(String(sm.approved)) + ' · s úpravou ' + e(String(sm.edited)) + ' · zamítnuto ' + e(String(sm.rejected)) + ' · ke schválení ' + e(String(sm.pending)) + (sm.rejectedIds && sm.rejectedIds.length ? ' · zamítnuté: ' + e(sm.rejectedIds.join(', ')) : '') : '') + '</div>';
  }).join('') + '</div>';
}
function panel(s) {
  var items = (s.registry && s.registry.items) || [];
  var out = '<h2>Výsledky garanta</h2><p class="muted">Co garant v maketě rozhodl a okomentoval: poslední stav každé položky registru a celá historie zápisů. Načteno ze serveru pod přihlášením správce; neformální rozhodnutí k maketě.</p>' +
    '<div class="actions" style="margin-top:0">' + btn(loading ? 'Načítám…' : 'Obnovit', 'resultsReload', null, 'sm', loading ? ' disabled' : '') + btn('Zavřít', 'closeDrawer', null, 'sm quiet') + (loadedAt ? '<span class="small muted">načteno ' + e(fmt(loadedAt)) + '</span>' : '') + '</div>';
  if (err) out += '<div class="error" role="alert">Nepodařilo se načíst: ' + e(err) + '</div>';
  if (!rows) return out + (loading ? '' : '<p class="muted">Zatím nic nenačteno.</p>');
  var evs = rows.filter(function (r) { return r.kind === 'progress' || r.kind === 'summary'; }), decs = rows.filter(function (r) { return r.kind !== 'progress' && r.kind !== 'summary'; });
  out += progressBlock(evs);
  var byItem = {}, users = {}, last = null;
  decs.forEach(function (r) { (byItem[r.item] = byItem[r.item] || []).push(r); if (r.user_email) users[r.user_email] = 1; if (!last || String(r.at) > String(last)) last = r.at; });
  var decided = 0, c = { approved: 0, edited: 0, rejected: 0 }, comments = 0;
  var list = items.map(function (it) {
    var rs = byItem[it.id] || [], decs = rs.filter(function (r) { return r.kind === 'decision'; }), cm = rs.filter(function (r) { return r.kind === 'comment'; });
    var lastD = decs.length ? decs[decs.length - 1] : null;
    if (lastD) { decided++; c[lastD.status] = (c[lastD.status] || 0) + 1; }
    comments += cm.length;
    return { it: it, lastD: lastD, cm: cm, rs: rs };
  });
  var unknown = Object.keys(byItem).filter(function (id) { return !items.some(function (it) { return it.id === id; }); });
  out += '<div class="grid2 stats">' + stat(decided + ' z ' + items.length, 'rozhodnuto') + stat(c.approved, 'schváleno') + stat(c.edited, 'upraveno') + stat(c.rejected, 'zamítnuto') + '</div>' +
    '<p class="small muted">Komentářů: ' + comments + ' · zápisů celkem: ' + decs.length + ' · přihlášených, kdo zapisovali: ' + Object.keys(users).length + (last ? ' · poslední zápis ' + e(fmt(last)) : '') + (unknown.length ? ' · zápisy k neznámým položkám: ' + e(unknown.join(', ')) : '') + '</p>';
  if (!decs.length) return out + '<p class="muted">Zatím žádné rozhodnutí. Jakmile garant v maketě rozhodne nebo okomentuje první položku, objeví se tady.</p>';
  out += '<ul class="plain results">' + list.map(function (x) {
    var r = x.lastD, head = '<div class="res-head"><b>' + e(x.it.id) + ' · ' + e(x.it.title) + '</b>' + statusTag(r ? r.status : null) + '</div>';
    var body = '';
    if (r) body += '<div class="small">' + e(fmt(r.at)) + (r.scene ? ' · scéna ' + e(String(r.scene)) + (r.scene_title ? ': ' + e(r.scene_title) : '') : '') + (who(r) ? ' · ' + who(r) : '') + '</div>' +
      (r.comment ? '<div class="res-comment">„' + e(r.comment) + '“</div>' : '') + (r.status === 'edited' && params(r) ? '<div class="small muted">parametry: ' + params(r) + '</div>' : '');
    if (x.cm.length) body += x.cm.map(function (m) { return '<div class="res-comment small">komentář ' + e(fmt(m.at)) + ': „' + e(m.comment || '') + '“</div>'; }).join('');
    if (x.rs.length > 1) body += '<details class="more"><summary>historie (' + x.rs.length + ')</summary><ul class="plain small">' + x.rs.map(function (h) { return '<li>' + e(fmt(h.at)) + ' · ' + (h.kind === 'comment' ? 'komentář' : (LABEL[h.status] || ['?'])[0]) + (h.comment ? ' · „' + e(h.comment) + '“' : '') + (who(h) ? ' · ' + who(h) : '') + '</li>'; }).join('') + '</ul></details>';
    return '<li class="res">' + head + body + '</li>';
  }).join('') + '</ul>';
  return out;
}
var prevDrawer = NF.slots.drawer;
NF.slots.drawer = function (s, name) { if (name === 'results') return panel(s); return prevDrawer ? prevDrawer(s, name) : ''; };
NF.demoActions = NF.demoActions || {};
NF.demoActions.openResults = function () { if (!D.auth || D.auth.role() !== 'admin') return; NF.openDrawer('results'); if (!rows) load(); };
NF.demoActions.resultsReload = function () { load(); };
D.results = { rows: function () { return rows; }, setRows: function (r) { rows = r; loadedAt = new Date().toISOString(); }, load: load, panel: panel };
})(typeof window !== 'undefined' ? window : globalThis);
