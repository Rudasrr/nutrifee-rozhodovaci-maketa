/* Ukládání rozhodnutí garanta mimo zařízení (7. 10. 2026). Součást prezentační vrstvy — jádro aplikace síť nevolá.
   Každé rozhodnutí nebo komentář k položce registru se hned zařadí do fronty (localStorage) a vloží jako řádek do tabulky Supabase (D.syncConfig).
   Co se neodešle (výpadek, úložiště nenastaveno), zůstává ve frontě a odešle se při dalším pokusu; lišta ukazuje stav.
   Posílají se jen rozhodnutí garanta (položka, stav, parametry/texty po úpravě, komentář, čas, scéna, verze) — žádná data příběhu. */
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
function record(S, d, h, r) {
  var sc = S.sceneIndex != null && D.scenes && D.scenes[S.sceneIndex] ? D.scenes[S.sceneIndex] : null;
  return { id: h.id, kind: d.kind || 'decision', item: d.item, title: r ? r.title : '', status: d.status, params: d.params || null, text: d.text || null, off: d.off || null, comment: d.comment || '',
    by: d.by, modelAt: d.at, at: new Date().toISOString(), scene: S.sceneIndex != null ? S.sceneIndex + 1 : null, sceneTitle: sc ? (sc.title || (D.chapters && D.chapters[sc.ch].title)) : null,
    schema: NF.SCHEMA, client: client, note: D.syncLabel || '' };
}
function configured() { var c = D.syncConfig || {}; return !!(c.url && c.key && c.table); }
/* Záznam → řádek tabulky (Supabase REST: POST pole řádků, veřejný klíč smí jen vkládat). */
function row(x) {
  return { id: x.client + ':' + x.id, kind: x.kind, item: x.item, title: x.title, status: x.status, params: x.params, text: x.text, off: x.off, comment: x.comment, decided_by: x.by,
    model_at: x.modelAt, at: x.at, scene: x.scene, scene_title: x.sceneTitle, schema: x.schema, client: x.client, note: x.note };
}
function post(rows) {
  var c = D.syncConfig;
  return global.fetch(c.url.replace(/\/$/, '') + '/rest/v1/' + c.table, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'application/json', 'apikey': c.key, 'Authorization': 'Bearer ' + c.key, 'Prefer': 'return=minimal' }, body: JSON.stringify(rows.map(row)) });
}
/* 409 = řádek s tímto id už v tabulce je (opakované odeslání po výpadku) → považujeme za uložený. U dávky pošleme řádky jednotlivě. */
function sendBatch(batch) {
  return post(batch).then(function (res) {
    if (res.ok) return;
    if (res.status !== 409) throw new Error('HTTP ' + res.status);
    if (batch.length === 1) return;
    return batch.reduce(function (p, x) { return p.then(function () { return sendBatch([x]); }); }, Promise.resolve());
  });
}
function flush() {
  if (sending || !queue.length || !configured() || typeof global.fetch !== 'function') { return; }
  sending = true;
  var batch = queue.slice(0, 20);
  sendBatch(batch)
    .then(function () { queue = queue.slice(batch.length); lastOk = new Date().toISOString(); lastErr = null; save(); })
    .catch(function (err) { lastErr = String(err && err.message || err); })
    .then(function () { sending = false; if (NF.render) NF.render(); if (queue.length && !lastErr) flush(); });
}
D.sync = {
  pending: function () { return queue.length; },
  status: function () { return { pending: queue.length, lastOk: lastOk, lastErr: lastErr, configured: configured(), client: client }; },
  row: row,
  retry: flush
};
load();
NF.onDecision(function (S, d, h, r) { queue.push(record(S, d, h, r)); save(); flush(); });
/* stav v liště a v hlavičce registru */
function badge(s) {
  var n = queue.length;
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
