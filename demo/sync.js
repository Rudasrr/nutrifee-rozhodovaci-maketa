/* Ukládání rozhodnutí garanta mimo zařízení (7. 10. 2026). Součást prezentační vrstvy — jádro aplikace síť nevolá.
   Každé rozhodnutí nebo komentář k položce registru se hned zařadí do fronty (localStorage) a vloží jako řádek do tabulky Supabase (D.syncConfig)
   pod přihlášením uživatele (demo/auth.js); bez přihlášení se nic neposílá. Co se neodešle (výpadek), zůstává ve frontě a odešle se při dalším pokusu; lišta ukazuje stav.
   Po přihlášení se dřívější zápisy téhož uživatele načtou ze serveru zpět do deníku garanta (restore → D.garantMerge).
   Posílají se jen rozhodnutí garanta (položka, stav, parametry/texty po úpravě, komentář, čas, scéna, verze, účet přihlášeného) — žádná data příběhu. */
(function (global) {
'use strict';
var NF = global.NutriFee, D = global.NutriFeeDemo, e = NF.esc;
var QKEY = 'nutrifee-sync-queue', CKEY = 'nutrifee-sync-client';
var queue = [], client = null, lastOk = null, lastErr = null, sending = false;
function load() {
  try { queue = JSON.parse(global.localStorage && global.localStorage.getItem(QKEY) || '[]') || []; } catch (err) { queue = []; }
  try { client = global.localStorage && global.localStorage.getItem(CKEY); } catch (err) { }
  if (!client) { client = 'g-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36); try { global.localStorage && global.localStorage.setItem(CKEY, client); } catch (err) { } }
}
function save() { try { global.localStorage && global.localStorage.setItem(QKEY, JSON.stringify(queue)); } catch (err) { } }
function user() { var s = D.auth && D.auth.session(); return s && s.user ? s.user : null; }
function record(S, d, h, r) {
  var sc = S.sceneIndex != null && D.scenes && D.scenes[S.sceneIndex] ? D.scenes[S.sceneIndex] : null, u = user();
  return { id: h.id, kind: d.kind || 'decision', item: d.item, title: r ? r.title : '', status: d.status, params: d.params || null, text: d.text || null, off: d.off || null, comment: d.comment || '',
    by: d.by, modelAt: d.at, at: new Date().toISOString(), scene: S.sceneIndex != null ? S.sceneIndex + 1 : null, sceneTitle: sc ? (sc.title || (D.chapters && D.chapters[sc.ch].title)) : null,
    schema: NF.SCHEMA, client: client, note: D.syncLabel || '', uid: u ? u.id : null, email: u ? u.email : null };
}
function configured() { var c = D.syncConfig || {}; return !!(c.url && c.key && c.table); }
function ready() { return configured() && typeof global.fetch === 'function' && !!(D.auth && D.auth.session()); }
function base() { var c = D.syncConfig; return String(c.url).replace(/\/$/, '') + '/rest/v1/' + c.table; }
/* Záznam → řádek tabulky (Supabase REST: POST pole řádků; pravidlo RLS pustí jen řádky s user_id přihlášeného). */
function row(x) {
  return { id: x.client + ':' + x.id, kind: x.kind, item: x.item, title: x.title, status: x.status, params: x.params, text: x.text, off: x.off, comment: x.comment, decided_by: x.by,
    model_at: x.modelAt, at: x.at, scene: x.scene, scene_title: x.sceneTitle, schema: x.schema, client: x.client, note: x.note, user_id: x.uid, user_email: x.email };
}
/* Řádek ze serveru → záznam deníku garanta (presenter: D.garantMerge). sid = id řádku, rt = skutečný čas zápisu (řazení napříč zařízeními). */
function fromRow(r) {
  return { item: r.item, kind: r.kind || 'decision', status: r.status, comment: r.comment || '', params: r.params || null, text: r.text || null, off: r.off || null, at: r.model_at, by: r.decided_by || 'garant', sid: r.id, rt: r.at };
}
function post(rows, force) {
  return D.auth.ensure(force).then(function (token) {
    return global.fetch(base(), { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/json', 'apikey': D.syncConfig.key, 'Authorization': 'Bearer ' + token, 'Prefer': 'return=minimal' }, body: JSON.stringify(rows.map(row)) });
  });
}
/* 401 = token vypršel → obnovit a zkusit jednou znovu. 409 = řádek s tímto id už v tabulce je (opakované odeslání po výpadku) → považujeme za uložený; u dávky pošleme řádky jednotlivě. */
function sendBatch(batch, retried) {
  return post(batch, !!retried).then(function (res) {
    if (res.ok) return;
    if (res.status === 401 && !retried) return sendBatch(batch, true);
    if (res.status !== 409) throw new Error('HTTP ' + res.status);
    if (batch.length === 1) return;
    return batch.reduce(function (p, x) { return p.then(function () { return sendBatch([x]); }); }, Promise.resolve());
  });
}
function flush() {
  if (sending || !queue.length || !ready()) { return; }
  sending = true;
  var batch = queue.slice(0, 20);
  sendBatch(batch)
    .then(function () { queue = queue.slice(batch.length); lastOk = new Date().toISOString(); lastErr = null; save(); })
    .catch(function (err) { lastErr = String(err && err.message || err); })
    .then(function () { sending = false; if (NF.render) NF.render(); if (queue.length && !lastErr) flush(); });
}
/* Po přihlášení: zápisy tohoto účtu ze serveru → deník garanta (co už tu je podle sid, se nepřidá). */
function restore() {
  var u = user(); if (!ready() || !u || !D.garantMerge) return Promise.resolve(0);
  return D.auth.ensure().then(function (token) {
    return global.fetch(base() + '?select=*&user_id=eq.' + encodeURIComponent(u.id) + '&order=at.asc&limit=5000', { mode: 'cors', headers: { 'apikey': D.syncConfig.key, 'Authorization': 'Bearer ' + token } });
  }).then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(function (rows) { return D.garantMerge((rows || []).map(fromRow)); })
    .catch(function (err) { try { NF.getState().toast = 'Dřívější rozhodnutí se nepodařilo načíst ze serveru (' + String(err && err.message || err) + ').'; NF.render(); } catch (e2) { } return 0; });
}
D.sync = {
  pending: function () { return queue.length; },
  status: function () { return { pending: queue.length, lastOk: lastOk, lastErr: lastErr, configured: configured(), client: client }; },
  row: row, fromRow: fromRow,
  retry: flush, restore: restore,
  clear: function () { queue = []; lastErr = null; save(); }
};
load();
/* Háček jádra: každé nové rozhodnutí/komentář (ne přehrání scény). Záznamu přidá sid a rt, aby ho deník garanta uměl spárovat se serverem. */
NF.onDecision(function (S, d, h, r) { var x = record(S, d, h, r); d.sid = x.client + ':' + x.id; d.rt = x.at; queue.push(x); save(); flush(); });
/* stav v liště a v hlavičce registru */
function badge(s) {
  var n = queue.length;
  if (!(D.auth && D.auth.session())) return '';
  if (!configured()) return '<span class="sync-badge warn" title="Adresa úložiště není nastavená; rozhodnutí čekají v prohlížeči">ukládání nenastaveno' + (n ? ' · čeká ' + n : '') + '</span>';
  if (n) return '<span class="sync-badge warn" title="' + e(lastErr || 'čeká na odeslání') + '">neuloženo: ' + n + ' <button type="button" class="btn sm" data-action="syncRetry">Zkusit znovu</button></span>';
  return '<span class="sync-badge ok" title="' + (lastOk ? 'naposledy ' + e(lastOk) : '') + '">rozhodnutí uložena ✓</span>';
}
NF.slots.syncBadge = badge;
NF.slots.syncStatus = function (s) { return '<div class="actions" style="margin:0">' + badge(s) + '</div>'; };
NF.demoActions = NF.demoActions || {};
NF.demoActions.syncRetry = function () { lastErr = null; flush(); };
if (global.addEventListener) global.addEventListener('online', function () { lastErr = null; flush(); });
setTimeout(flush, 1500);
})(typeof window !== 'undefined' ? window : globalThis);
