/* Ukládání rozhodnutí garanta mimo zařízení (7. 10. 2026; odolnost a otisk 30. 10. 2026, kontrola 4). Součást prezentační vrstvy – jádro aplikace síť nevolá.
   Každé rozhodnutí nebo poznámka k položce registru se hned zařadí do fronty (localStorage) a vloží jako řádek do tabulky Supabase (D.syncConfig)
   pod přihlášením uživatele (demo/auth.js); bez přihlášení se nic neposílá. Posílají se jen rozhodnutí garanta (položka, stav, poznámka, čas, scéna, verze
   a otisk znění, účet přihlášeného) – žádná data příběhu.
   Druhy řádků: decision (status approved | rejected + comment = platná poznámka), note (poznámka bez změny rozhodnutí; status = stav garanta v tu chvíli,
   null u nerozhodnuté), scene (opuštění scény: item 'SCENA'), progress ('PRUBEH'), summary ('SOUHRN', se snímkem položek), reset ('RESET'). Tabulka beze změny,
   nové údaje jsou v params (jsonb): ver { version, fp, fpGuide, fpCat, fpExtra, alg, shown } (rozhodnutí vlastníka 30. 10. 2026, bod 1; fpExtra a shown 1. 11. 2026),
   seq (pořadí v prohlížeči), skewMs (posun hodin proti serveru). Algoritmy otisků přesně: navrhy-designu/30-…/10-predani-programatorovi.md, odst. 5.
   Odolnost (kontrola 4, 05-robustnost A1–A4, B1–B4, C2, C5, C6):
   · fronta se čte a zapisuje vždy přímo z localStorage (dvě karty se nepřepíší, A2); změnu z jiné karty hlásí událost `storage`;
   · opakování s rostoucí prodlevou (2, 5, 15, 30, 60 s, pak každou minutu), při návratu na kartu a po `online`; časový limit požadavku 15 s (B1, C6);
   · řádek, který server trvale odmítne (400, 403, 413, 422), se odloží stranou (nutrifee-sync-dead) a fronta jde dál (B2); nic se nezahazuje;
   · obnova ze serveru při startu, po přihlášení, při návratu na kartu a po odeslání fronty; čte se po stránkách bez stropu (A3, A4);
   · pořadí (B4; 31 B2, C2): řádky téhož prohlížeče a účtu podle pořadového čísla seq; mezi prohlížeči klíč = účinný čas (čas klienta opravený o posun hodin,
     nejvýš čas přijetí serverem), u řádků téhož prohlížeče průběžné maximum podle seq; při shodě klíče client, seq, čas přijetí, id;
   · pravdivý stav uložení: D.sync.state(sid) = 'server' | 'local' | 'rejected' (B3). */
(function (global) {
'use strict';
var NF = global.NutriFee, D = global.NutriFeeDemo, e = NF.esc;
var QKEY = 'nutrifee-sync-queue', DEADKEY = 'nutrifee-sync-dead', CKEY = 'nutrifee-sync-client', SEQKEY = 'nutrifee-sync-seq', SKEWKEY = 'nutrifee-sync-skew', MKEY = 'nutrifee-sync-merged';
var NOTE_MAX = 4000, PARAMS_MAX = 60000, SNAP_NOTE = 200; /* 31 B3: limit poznámky = CHECK comment_len na serveru (05 odst. 0.3); params_len 65 536 B s rezervou */
var PAGE = 1000, BATCH = 20, TIMEOUT_MS = 15000, NOTE_HOLD_MS = 2500, MERGE_MS = 10000, RESTORE_GAP_MS = 15000, SKEW_WARN_MS = 120000;
var DELAYS = [2000, 5000, 15000, 30000, 60000];
var PERMANENT = { 400: 1, 403: 1, 413: 1, 422: 1 };
var memQ = [], memDead = [], memSeq = 0, storageBroken = false;
var client = null, lastOk = null, lastErr = null, sending = null, inflight = {}, fails = 0, retryTimer = null, holdTimer = null, nextRetryAt = null;
var skew = { ms: null, how: null }, lastAtMs = 0, lastRestore = 0, restoring = null, restoreErr = null, listeners = [];

/* ---------- úložiště (vždy čerstvě z localStorage; bez něj v paměti) ---------- */
function store() { try { return storageBroken ? null : (global.localStorage || null); } catch (err) { return null; } }
function getRaw(k) { var s = store(); if (!s) return null; try { return s.getItem(k); } catch (err) { return null; } }
function setRaw(k, v) { var s = store(); if (!s) return; try { if (v == null) s.removeItem(k); else s.setItem(k, v); } catch (err) { storageBroken = true; } }
function readList(k, mem) { var s = store(); if (!s) return mem.slice(); try { var v = JSON.parse(s.getItem(k) || '[]'); return Array.isArray(v) ? v : []; } catch (err) { return mem.slice(); } }
function Q() { return readList(QKEY, memQ); }
function saveQ(list) { memQ = list.slice(); setRaw(QKEY, JSON.stringify(list)); }
function deadList() { return readList(DEADKEY, memDead); }
function saveDead(list) { memDead = list.slice(); setRaw(DEADKEY, list.length ? JSON.stringify(list) : null); }
function merged() { try { var m = JSON.parse(getRaw(MKEY) || '{}'); return m && typeof m === 'object' && !Array.isArray(m) ? m : {}; } catch (err) { return {}; } }
function load() {
  client = getRaw(CKEY);
  if (!client) { client = 'g-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36); setRaw(CKEY, client); }
  try { var k = JSON.parse(getRaw(SKEWKEY) || 'null'); if (k && typeof k.ms === 'number') skew = { ms: k.ms, how: k.how || 'uloženo' }; } catch (err) { }
}
function user() { var s = D.auth && D.auth.session(); return s && s.user ? s.user : null; }
function mine(x, u) { return !x.uid || (u && x.uid === u.id); }
function S0() { try { return NF.getState ? NF.getState() : null; } catch (err) { return null; } }
function notify() { listeners.forEach(function (fn) { try { fn(status()); } catch (err) { } }); }
function rerender() { try { if (NF.render) NF.render(); } catch (err) { } }

/* ---------- čas, pořadí, posun hodin (B4) ---------- */
function nextSeq() { var n = Number(getRaw(SEQKEY)) || memSeq; n = Math.max(n, memSeq) + 1; memSeq = n; setRaw(SEQKEY, String(n)); return n; }
function stamp() { var t = Date.now(); if (t <= lastAtMs) t = lastAtMs + 1; lastAtMs = t; return { at: new Date(t).toISOString(), seq: nextSeq(), skewMs: skew.ms }; }
function setSkew(ms, how) { if (typeof ms !== 'number' || !isFinite(ms)) return; skew = { ms: Math.round(ms), how: how }; setRaw(SKEWKEY, JSON.stringify(skew)); }
/* Účinný čas řádku: čas klienta + jeho posun proti serveru, nejvýš čas přijetí serverem (rozhodnutí nemohlo vzniknout až po přijetí; chrání i před „resetem v budoucnosti“). */
function effMs(r) {
  var p = r && r.params, at = Date.parse(r && r.at), sk = p && typeof p.skewMs === 'number' ? p.skewMs : 0, rec = Date.parse(r && r.received_at);
  if (isNaN(at)) return isNaN(rec) ? NaN : rec;
  var t = at + sk; if (!isNaN(rec) && rec < t) t = rec; return t;
}
function effIso(r) { var t = effMs(r); return isNaN(t) ? (r && r.at) || null : new Date(t).toISOString(); }
function seqOf(r) { var p = r && r.params; return p && typeof p.seq === 'number' ? p.seq : null; }
function strCmp(a, b) { a = String(a == null ? '' : a); b = String(b == null ? '' : b); return a < b ? -1 : a > b ? 1 : 0; }
/* 31 B2, C2: odhad posunu hodin se mezi dvěma zápisy může změnit (null → odhad z received_at → menší odhad), a účinný čas dvou řádků téhož prohlížeče
   by pak mohl obrátit pořadí, v jakém je garant zapsal. Proto: řádky téhož řetězce (účet + client, oba se seq) jdou vždy podle seq; klíč řazení řádku je
   průběžné maximum účinného času v jeho řetězci podle seq (nikdy neklesne); mezi řetězci rozhoduje klíč, při shodě client, seq, received_at, id.
   Klíč patří k celému řetězci (všechny druhy řádků účtu a prohlížeče, jako okno v SQL): sortRows ho spočítá nad množinou, kterou dostane, jen u řetězců,
   kde některý řádek klíč ještě nemá; podmnožina už seřazených řádků (např. jedna položka) klíče zdědí. Porovnání dvou řádků bez klíčů použije účinný čas.
   Stejně řadí pohled garant_stav (05 odst. 0.5). */
var KEYS = typeof WeakMap === 'function' ? new WeakMap() : null;
function chainOf(r) { return r && r.client && seqOf(r) != null ? String(r.user_id || r.uid || '') + '|' + r.client : null; }
function computeKeys(rows) {
  if (!KEYS) return;
  var by = Object.create(null);
  rows.forEach(function (r) { if (!r || typeof r !== 'object') return; var c = chainOf(r); if (c == null) { if (!KEYS.has(r)) KEYS.set(r, effMs(r)); } else (by[c] = by[c] || []).push(r); });
  Object.keys(by).forEach(function (c) {
    if (by[c].every(function (r) { return KEYS.has(r); })) return; /* řetězec už má klíče z celé množiny */
    var m = NaN;
    by[c].slice().sort(function (a, b) { return seqOf(a) - seqOf(b); }).forEach(function (r) { var t = effMs(r); if (!isNaN(t) && (isNaN(m) || t > m)) m = t; KEYS.set(r, m); });
  });
}
function keyOf(r) { var k = KEYS && r && typeof r === 'object' ? KEYS.get(r) : undefined; return k !== undefined ? k : effMs(r); }
function cmp(a, b) {
  var ca = chainOf(a), sa = seqOf(a), sb = seqOf(b);
  if (ca != null && ca === chainOf(b) && sa !== sb) return sa - sb;
  var x = keyOf(a), y = keyOf(b);
  if (isNaN(x) || isNaN(y)) { var c0 = strCmp(a && a.at, b && b.at); if (c0) return c0; } else if (x !== y) return x - y;
  var c1 = strCmp(a && a.client, b && b.client); if (c1) return c1;
  var qa = sa == null ? -1 : sa, qb = sb == null ? -1 : sb; if (qa !== qb) return qa - qb; /* bez seq (řádky před 30. 10. 2026) = −1, jako coalesce v pohledu garant_stav */
  var c2 = strCmp(a && a.received_at, b && b.received_at); if (c2) return c2;
  return strCmp(a && a.id, b && b.id);
}
function sortRows(rows) { var s = (rows || []).slice(); computeKeys(s); return s.sort(cmp); }
/* Deník garanta (presenter.js) řadí záznamy stejně: rt = účinný čas, client z sid, seq ze záznamu. */
function sortEntries(list) {
  var w = (list || []).map(function (d) {
    var c = d && (d.client || (d.sid ? String(d.sid).split(':')[0] : null));
    return { at: d && d.rt, client: c || null, params: { seq: d && typeof d.seq === 'number' ? d.seq : null }, id: d && d.sid, d: d };
  });
  return sortRows(w).map(function (x) { return x.d; });
}
/* Reset garanta („Smazat rozhodnutí“) je řádek kind 'reset'; stav se počítá jen z řádků po posledním resetu (podle účinného času). */
function afterReset(rows) {
  var s = sortRows(rows), k = -1; s.forEach(function (r, i) { if (r.kind === 'reset') k = i; });
  return k < 0 ? s : s.slice(k + 1);
}

/* ---------- otisk znění položky (rozhodnutí vlastníka 30. 10. 2026, bod 1; přesný popis 31 B4 v 10-predani-programatorovi.md odst. 5) ----------
   fp (alg 'core') = NF.itemFingerprint(položka z kódu, { co: „Co schvalujete“ s parametry z kódu }) – dvě 32bitové funkce nad kódovými jednotkami UTF-16.
   fpGuide = fnv1a(canon(D.guideRaw[id])), fpCat = fnv1a(canon({ bounds, instruction, habits })), fpExtra = fnv1a(canon({ usedBy, steps, safety })):
   FNV-1a 32 bitů nad bajty UTF-8 kanonického JSON (klíče seřazené). alg 'sync1' = fnv1a(canon(itemContent)) – jen řádky z doby, kdy jádro funkci nemělo.
   shown = { version, fp } položky, jak ji garant na kartě viděl (31 A1); liší-li se od fp z kódu, rozhodnutí pro dnešní znění neplatí. */
function canon(v) {
  if (v === undefined || typeof v === 'function') return 'null';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined && typeof v[k] !== 'function'; }).map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
}
function utf8(str) {
  var out = [];
  for (var i = 0; i < str.length; i++) {
    var c = str.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) { var d2 = str.charCodeAt(i + 1); if (d2 >= 0xdc00 && d2 <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (d2 - 0xdc00); i++; } }
    if (c < 0x80) out.push(c); else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}
function fnv1a(str) { var b = utf8(String(str)), h = 0x811c9dc5; for (var i = 0; i < b.length; i++) { h ^= b[i]; h = Math.imul(h, 0x01000193) >>> 0; } return ('0000000' + h.toString(16)).slice(-8); }
var pristineCache = null;
function pristine(id) {
  if (!pristineCache) { pristineCache = {}; try { (NF.data && NF.data.registry ? NF.data.registry() : []).forEach(function (r) { pristineCache[r.id] = r; }); } catch (err) { } }
  if (pristineCache[id]) return pristineCache[id];
  var s = S0(); return s && s.registry && NF.item ? NF.item(s, id) : null;
}
var CONTENT_KEYS = ['id', 'cat', 'scope', 'title', 'summary', 'detail', 'usedBy', 'params', 'labels', 'steps', 'texts', 'lists', 'postup', 'text', 'lever', 'kind'];
function itemContent(id) {
  var r = pristine(id); if (!r) return null;
  var o = {}; CONTENT_KEYS.forEach(function (k) { if (r[k] !== undefined) o[k] = r[k]; });
  o.bounds = (NF.PARAM_BOUNDS && NF.PARAM_BOUNDS[id]) || null;
  o.instruction = ((NF.data && NF.data.instructions) || []).filter(function (x) { return x.id === id; })[0] || null;
  o.habits = ((NF.data && NF.data.habits) || []).filter(function (x) { return x.item === id; });
  return o;
}
function tempFp(id) { var c = itemContent(id); return c ? fnv1a(canon(c)) : null; }
function guideFp(id) { var g = (D.guideRaw && D.guideRaw[id]) || null; return g ? fnv1a(canon(g)) : null; }
/* Položka přesně z kódu (NF.data.registry), bez náhrady ze stavu příběhu; null, když v kódu není. */
function codeItem(id) { pristine(id); return (pristineCache && pristineCache[id]) || null; }
/* 31 C9: „Co schvalujete“ do otisku s parametry z kódu, ne ze stavu příběhu. Stejné dosazení jako D.guideFill v demo/guide.js:
   {klíč} = parametr položky, {JINA-POLOZKA:klíč} = parametr jiné položky; modifikátor % = ×100 a „ %“, |n = n desetinných míst; čísla s desetinnou čárkou. */
var FILL_RE = /\{(?:([A-Z]-[A-Z0-9-]+):)?([A-Za-z_][A-Za-z0-9_]*)(%|\|\d)?\}/g;
function fillFmt(v, mod) {
  if (typeof v !== 'number') return String(v);
  if (mod === '%') return String(Math.round(v * 100)) + ' %';
  if (mod && mod.charAt(0) === '|') return v.toFixed(Number(mod.slice(1)) || 0).replace('.', ',');
  return String(v).replace('.', ',');
}
function codeFill(id, text) { return String(text).replace(FILL_RE, function (m, other, key, mod) { var r = codeItem(other || id) || pristine(other || id), p = (r && r.params) || {}; return p[key] != null ? fillFmt(p[key], mod) : m; }); }
function codeGuide(id) {
  var g = D.guideRaw && D.guideRaw[id];
  if (!g) return (D.guide && D.guide[id]) || null;
  return { co: g.co == null ? null : typeof g.co === 'string' ? codeFill(id, g.co) : g.co };
}
/* Otisk jádra: NF.itemFingerprint(položka z kódu, průvodce s parametry z kódu) → 'fp-' + 16 hex. */
function coreFp(id) {
  var r = codeItem(id);
  if (typeof NF.itemFingerprint !== 'function' || !r) return null;
  var v = null; try { v = NF.itemFingerprint(r, codeGuide(id)); } catch (err) { v = null; }
  if (v && typeof v === 'object') v = v.fp || v.hash || null;
  return typeof v === 'string' && v ? v : null;
}
/* Doplněk k otisku jádra: meze parametrů, znění pokynu z catalogs.js a návyky – jádro je do otisku nebere, garant je ale čte (I-* jsou celé v katalogu). */
function catFp(id) { var c = itemContent(id); return c ? fnv1a(canon({ bounds: c.bounds, instruction: c.instruction, habits: c.habits })) : null; }
/* 31 C8: další texty, které garant čte a jádro do otisku nebere: „V aplikaci: …“ (usedBy), kroky (steps) a věta k potvrzení zamítnutí bezpečnostní položky. */
function extraFp(id) {
  var r = codeItem(id); if (!r) return null;
  var SAFE = (NF.screens && NF.screens.SAFETY_ITEMS) || {};
  return fnv1a(canon({ usedBy: r.usedBy == null ? null : r.usedBy, steps: r.steps == null ? null : r.steps, safety: SAFE[id] == null ? null : String(SAFE[id]) }));
}
function versionOf(id) { var r = pristine(id); return (r && r.version) || 'v1'; }
/* Otisk dnešního znění; alg = 'core' | 'sync1' (pro porovnání se starším rozhodnutím se počítá stejným alg). */
function todayVer(id, alg) {
  var c = alg === 'sync1' ? null : coreFp(id);
  if (alg === 'core' && !c) return null;
  return { version: versionOf(id), fp: c || tempFp(id), fpGuide: guideFp(id), fpCat: catFp(id), fpExtra: extraFp(id), alg: c ? 'core' : 'sync1' };
}
function verOf(id) { return pristine(id) ? todayVer(id) : null; }
/* 31 A1: otisk znění, které garant při rozhodnutí opravdu viděl. Karty v panelu, zásuvce a souhrnu ukazují znění z kódu (D.garantView, presenter.js);
   obrazovka registru ukazuje, co vrátí NF.screens.shownItem (bez ní položku ze stavu příběhu – po scénáři 5 modelovou v2). */
function shownVer(S, id, where) {
  if (!S || !S.registry || !NF.item || typeof NF.itemFingerprint !== 'function') return null;
  var r = null;
  try { r = where === 'registr' ? (NF.screens && typeof NF.screens.shownItem === 'function' ? NF.screens.shownItem(S, id) : NF.item(S, id)) : (D.garantView ? D.garantView(S, id) : NF.item(S, id)); } catch (err) { r = null; }
  if (!r) return null;
  var fp = null; try { fp = NF.itemFingerprint(r, (D.guide && D.guide[id]) || null); } catch (err) { fp = null; }
  return typeof fp === 'string' && fp ? { version: r.version || 'v1', fp: fp } : null;
}
/* Garant viděl jiné znění, než je otisk z kódu v témže řádku (modelová verze příběhu)? */
function shownDiffers(ver) {
  return !!(ver && ver.shown && ver.shown.fp && ver.fp && ver.alg === 'core' && (ver.shown.fp !== ver.fp || (ver.shown.version && ver.version && ver.shown.version !== ver.version)));
}
/* Platí rozhodnutí pro dnešní znění? true / false / null (bez otisku nebo položka neexistuje). Otisk chybějící ve starším řádku (fpCat, fpExtra) se nepočítá. */
function sameVer(ver, id) {
  if (!ver || !ver.fp) return null;
  var t = todayVer(id, ver.alg); if (!t || !t.fp) return null;
  if (shownDiffers(ver)) return false;
  var eq = function (k) { return ver[k] == null || t[k] == null || t[k] === ver[k]; };
  return t.fp === ver.fp && eq('fpGuide') && eq('fpCat') && eq('fpExtra');
}

/* ---------- záznam ---------- */
function sceneInfo(s) { var sc = s && s.sceneIndex != null && D.scenes ? D.scenes[s.sceneIndex] : null; return { no: s && s.sceneIndex != null ? s.sceneIndex + 1 : null, title: sc ? (sc.title || (D.chapters && D.chapters[sc.ch] && D.chapters[sc.ch].title)) : null }; }
/* Stav garanta u položky z jeho deníku (poslední rozhodnutí; null = nerozhodnuto). Háček sync.js běží před zápisem do deníku. */
function garantStatus(id) {
  var g = D.garantLog ? D.garantLog() : [], st = null;
  g.forEach(function (x) { if (x.item === id && x.kind === 'decision') st = x.status; }); return st;
}
function isAdmin() { return !!(D.auth && D.auth.role && D.auth.role() === 'admin'); }
function record(S, d, h, r) {
  var u = user(), st = stamp(), sc = sceneInfo(S), kind = d.kind || 'decision';
  /* 03 B3: řádky z obrazovky registru – kde = registr, v deníku autor garant (přihlášený rozhoduje v roli garanta), stav poznámky podle deníku garanta (zásada 6) */
  if (!d.where) d.where = 'registr';
  if (d.by !== 'garant') { if (kind === 'note') d.status = garantStatus(d.item); d.by = 'garant'; }
  /* 31 A1: otisk zobrazeného znění vedle otisku z kódu */
  var ver = verOf(d.item); if (ver && ver.alg === 'core') { var sh = shownVer(S, d.item, d.where); if (sh) ver.shown = sh; }
  /* id řádku z času a náhody, ne z pořadového čísla jádra (NF.uid se nuluje při přehrání scény → po resetu by se opakovalo a server by 409 vzal za „uloženo“; 23. 10. 2026) */
  return { id: 'D-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7), kind: kind, item: d.item, title: r ? r.title : '', status: d.status == null ? null : d.status,
    params: { where: d.where, ver: ver, seq: st.seq, skewMs: st.skewMs }, text: null, off: null, comment: d.comment || '',
    by: isAdmin() ? 'spravce' : 'garant' /* 31 C3: decided_by podle role přihlášeného */, modelAt: d.at, at: st.at, scene: sc.no, sceneTitle: sc.title, schema: NF.SCHEMA, client: client, note: D.syncLabel || '', uid: u ? u.id : null, email: u ? u.email : null, created: Date.now() };
}
function configured() { var c = D.syncConfig || {}; return !!(c.url && c.key && c.table); }
function ready() { return configured() && typeof global.fetch === 'function' && !!(D.auth && D.auth.session()); }
function base() { var c = D.syncConfig; return String(c.url).replace(/\/$/, '') + '/rest/v1/' + c.table; }
/* Záznam → řádek tabulky (Supabase REST: POST pole řádků; pravidlo RLS pustí jen řádky s user_id přihlášeného; user_email, user_id a received_at přepíše spouštěč na serveru). */
function row(x) {
  return { id: x.client + ':' + x.id, kind: x.kind, item: x.item, title: x.title, status: x.status, params: x.params, text: x.text, off: x.off, comment: x.comment, decided_by: x.by,
    model_at: x.modelAt, at: x.at, scene: x.scene, scene_title: x.sceneTitle, schema: x.schema, client: x.client, note: x.note, user_id: x.uid, user_email: x.email };
}
/* Řádek ze serveru → záznam deníku garanta (presenter: D.garantMerge). sid = id řádku, rt = účinný čas (řazení napříč zařízeními, B4). */
function fromRow(r) {
  /* v deníku garanta je autor vždy garant (rozhodnutí v roli garanta); kdo zapsal podle role, nese decidedBy (31 C3) */
  var x = { item: r.item, kind: r.kind || 'decision', status: r.status == null ? null : r.status, comment: r.comment || '', at: r.model_at, by: 'garant', decidedBy: r.decided_by || 'garant', sid: r.id, rt: effIso(r), client: r.client || null, seq: seqOf(r), scene: r.scene == null ? null : r.scene };
  if (r.params && r.params.where) x.where = r.params.where;
  if (r.params && r.params.ver) x.ver = r.params.ver;
  return x;
}

/* ---------- síť ---------- */
function tfetch(url, opt) {
  var ctl = null; try { ctl = typeof global.AbortController === 'function' ? new global.AbortController() : null; } catch (err) { ctl = null; }
  var o = Object.assign({}, opt || {}); if (ctl) o.signal = ctl.signal;
  var timer = null, st = global.setTimeout, ct = global.clearTimeout || function () { };
  var to = new Promise(function (res, rej) { if (typeof st === 'function') timer = st(function () { try { if (ctl) ctl.abort(); } catch (err) { } rej(new Error('server neodpověděl do 15 s')); }, TIMEOUT_MS); });
  return Promise.race([global.fetch(url, o), to]).then(function (r) { ct(timer); return r; }, function (err) { ct(timer); throw err; });
}
/* Posun hodin z hlavičky Date (jen když ji server zpřístupní přes CORS; jinak odhad z received_at při obnově). */
function noteDate(res, t0, t1) {
  try { var d = res && res.headers && res.headers.get ? res.headers.get('Date') : null, ms = d ? Date.parse(d) : NaN; if (!isNaN(ms)) setSkew(ms + 500 - (t0 + t1) / 2, 'hlavička Date'); } catch (err) { }
}
function authHeaders(token) { return { 'apikey': D.syncConfig.key, 'Authorization': 'Bearer ' + token }; }
function post(rows, force) {
  return D.auth.ensure(force).then(function (token) {
    var t0 = Date.now(), h = authHeaders(token); h['Content-Type'] = 'application/json'; h['Prefer'] = 'return=minimal';
    return tfetch(base(), { method: 'POST', mode: 'cors', headers: h, body: JSON.stringify(rows.map(row)) }).then(function (res) { noteDate(res, t0, Date.now()); return res; });
  });
}
/* Výsledek: { sent: [id záznamu], dead: [{ x, status }] }. 401 → obnovit token a jednou znovu. 409 = řádek už v tabulce je (opakované odeslání) → uloženo.
   Trvalé odmítnutí (400/403/413/422) → u dávky po řádcích, odmítnutý řádek stranou (B2). Ostatní (5xx, síť, čas) → chyba, fronta se zkusí znovu (B1). */
function sendBatch(batch, retried) {
  return post(batch, !!retried).then(function (res) {
    if (res.ok) return { sent: batch.map(function (x) { return x.id; }), dead: [] };
    if (res.status === 401 && !retried) return sendBatch(batch, true);
    if (res.status === 409 && batch.length === 1) return { sent: [batch[0].id], dead: [] };
    if (PERMANENT[res.status] && batch.length === 1) return { sent: [], dead: [{ x: batch[0], status: res.status }] };
    if (res.status === 409 || PERMANENT[res.status]) {
      var out = { sent: [], dead: [] };
      return batch.reduce(function (p, x) { return p.then(function () { return sendBatch([x]).then(function (r) { out.sent = out.sent.concat(r.sent); out.dead = out.dead.concat(r.dead); }); }); }, Promise.resolve()).then(function () { return out; });
    }
    throw new Error('HTTP ' + res.status);
  });
}
function eligible(q, u, all) {
  var t = Date.now();
  return q.filter(function (x) { return mine(x, u) && (all || !(x.kind === 'note' && x.created && t - x.created < NOTE_HOLD_MS)); });
}
function scheduleRetry() {
  if (retryTimer || typeof global.setTimeout !== 'function') return;
  var ms = DELAYS[Math.min(Math.max(fails - 1, 0), DELAYS.length - 1)]; nextRetryAt = Date.now() + ms;
  retryTimer = global.setTimeout(function () { retryTimer = null; nextRetryAt = null; flush(); }, ms);
}
function scheduleHold(q) {
  if (holdTimer || typeof global.setTimeout !== 'function') return;
  var t = Date.now(), wait = null;
  q.forEach(function (x) { if (x.kind === 'note' && x.created && t - x.created < NOTE_HOLD_MS) { var w = NOTE_HOLD_MS - (t - x.created) + 50; if (wait == null || w < wait) wait = w; } });
  if (wait != null) holdTimer = global.setTimeout(function () { holdTimer = null; flush(); }, wait);
}
/* Odeslání fronty. Vrací slib (true = vše vlastní odesláno). Poznámka čeká ve frontě 2,5 s: přijde-li hned rozhodnutí se stejným textem, jde jen ono (M8). */
function flush(all) {
  if (ready()) scheduleHold(Q()); /* zadržená poznámka se odešle sama, i když právě běží jiné odeslání */
  if (sending) return sending;
  if (!ready()) return Promise.resolve(false);
  var u = user(), q = Q(), el = eligible(q, u, all);
  if (!el.length) return Promise.resolve(!q.some(function (x) { return mine(x, u); }));
  var batch = el.slice(0, BATCH).map(function (x) { return x.uid ? x : Object.assign({}, x, { uid: u.id, email: u.email }); }), didSend = false;
  inflight = {}; batch.forEach(function (x) { inflight[x.id] = 1; });
  sending = sendBatch(batch)
    .then(function (r) {
      var gone = {}; r.sent.concat(r.dead.map(function (d) { return d.x.id; })).forEach(function (id) { gone[id] = 1; });
      saveQ(Q().filter(function (x) { return !gone[x.id]; }));
      if (r.dead.length) saveDead(deadList().concat(r.dead.map(function (d) { return Object.assign({}, d.x, { deadStatus: d.status, deadAt: new Date().toISOString() }); })));
      didSend = r.sent.length > 0; lastOk = new Date().toISOString(); lastErr = null; fails = 0;
    })
    .catch(function (err) { lastErr = String(err && err.message || err); fails++; })
    .then(function () {
      sending = null; inflight = {}; notify(); rerender();
      if (lastErr) { scheduleRetry(); return false; }
      var left = eligible(Q(), user(), all);
      if (left.length) return flush(all);
      if (didSend && Date.now() - lastRestore > 10000) restore('odeslano');
      return !Q().some(function (x) { return mine(x, user()); });
    });
  return sending;
}
function pushQ(x) {
  var q = Q();
  /* M8 (01): poznámka uložená těsně před rozhodnutím se stejným textem → jen rozhodnutí (nese poznámku); sid poznámky ukazuje na rozhodnutí */
  if (x.kind === 'decision') {
    for (var i = q.length - 1; i >= 0; i--) {
      var y = q[i]; if (y.item !== x.item || !mine(y, { id: x.uid })) continue;
      if (y.kind === 'note' && !inflight[y.id] && (y.comment || '') === (x.comment || '') && y.created && x.created - y.created <= MERGE_MS) {
        q.splice(i, 1); var m = merged(); m[y.client + ':' + y.id] = x.client + ':' + x.id; var ks = Object.keys(m); if (ks.length > 200) ks.slice(0, ks.length - 200).forEach(function (k) { delete m[k]; }); setRaw(MKEY, JSON.stringify(m));
      }
      break;
    }
  }
  q.push(x); saveQ(q); notify(); flush();
}

/* ---------- čtení ze serveru po stránkách (A4: bez stropu Max rows) ---------- */
function fetchAll(filter) {
  if (!ready()) return Promise.reject(new Error('nepřihlášen'));
  var out = [], last = null, pages = 0;
  function page() {
    return D.auth.ensure().then(function (token) {
      var t0 = Date.now(), url = base() + '?select=*' + (filter ? '&' + filter : '') + (last != null ? '&id=gt.' + encodeURIComponent(last) : '') + '&order=id.asc&limit=' + PAGE;
      return tfetch(url, { mode: 'cors', headers: authHeaders(token) }).then(function (res) { noteDate(res, t0, Date.now()); return res; });
    }).then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
      .then(function (rows) {
        rows = Array.isArray(rows) ? rows : [];
        if (!rows.length || ++pages > 1000) return out;
        out = out.concat(rows);
        var nl = rows[rows.length - 1] && rows[rows.length - 1].id; if (nl == null || nl === last) return out;
        last = nl; return page();
      });
  }
  return page();
}
/* Odhad posunu hodin bez hlavičky Date: nejmenší (přijato serverem − čas klienta) u řádků tohoto prohlížeče. */
function estimateSkew(rows) {
  if (skew.how === 'hlavička Date') return;
  var best = null;
  rows.forEach(function (r) { if (r.client !== client || !r.received_at) return; var d = Date.parse(r.received_at) - Date.parse(r.at); if (!isNaN(d) && (best == null || d < best)) best = d; });
  if (best != null) setSkew(best, 'odhad z času přijetí');
}
/* Obnova deníku garanta ze serveru (A3): řádky účtu + vlastní řádky ještě ve frontě, po posledním resetu, sloučené podle sid (D.garantMerge přidá jen chybějící). */
function restore(why) {
  var u = user(); if (!ready() || !u || !D.garantMerge) return Promise.resolve(0);
  if (restoring) return restoring;
  lastRestore = Date.now();
  restoring = fetchAll('user_id=eq.' + encodeURIComponent(u.id)).then(function (rows) {
    estimateSkew(rows); restoreErr = null;
    var have = {}, all = [];
    rows.concat(Q().filter(function (x) { return mine(x, u); }).map(row)).forEach(function (r) { if (r && r.id && !have[r.id]) { have[r.id] = 1; all.push(r); } });
    all = afterReset(all);
    /* SCHEMA 90 (36/04 S5): nejdál dosažená scéna z řádků „progress“ (params.scene je 1…N) a ze scén rozhodnutí – po odhlášení a na jiném zařízení
       presenter nabídne „Pokračovat ve scéně N“ (D.garantResume); pozice se jinak obnovuje jen z prohlížeče */
    var far = 0; all.forEach(function (r) { var n = r.kind === 'progress' && r.params ? Number(r.params.scene) : (r.kind === 'decision' ? Number(r.scene) : 0); if (isFinite(n) && n > far) far = n; });
    var n0 = D.garantMerge(all.filter(function (r) { return r.kind === 'decision' || r.kind === 'note'; }).map(fromRow)) || 0;
    if (far > 1 && D.garantResume) { try { D.garantResume(far - 1); } catch (e3) { } }
    return n0;
  }).catch(function (err) {
    restoreErr = String(err && err.message || err);
    if (why === 'prihlaseni' || why === 'start') { try { NF.getState().toast = 'Dřívější rozhodnutí se nepodařilo načíst ze serveru (' + restoreErr + '). Zkusíme to znovu, až se na stránku vrátíte.'; rerender(); } catch (e2) { } }
    return 0;
  }).then(function (n) { restoring = null; return n; });
  return restoring;
}

/* ---------- události mimo registr ---------- */
/* Snímek stavu položek garanta (C1 z 03): pro souhrn – co přesně garant potvrzoval. */
function snapshot() {
  var s = S0(), g = D.garantLog ? D.garantLog() : [], items = s && s.registry && NF.garantItems ? NF.garantItems(s) : [];
  return items.map(function (r) {
    var st = null, note = ''; g.forEach(function (x) { if (x.item !== r.id) return; if (x.kind === 'decision') st = x.status; note = x.comment || ''; });
    /* 31 B3: snímek nese jen začátek poznámky (celé jsou v řádcích decision/note); 28 dlouhých poznámek by přesáhlo params_len 65 536 B */
    return { id: r.id, status: st, note: note.length > SNAP_NOTE ? note.slice(0, SNAP_NOTE) + '…' : note, noteLen: note.length, ver: verOf(r.id) };
  });
}
/* Průchod maketou, opuštění scény, potvrzení souhrnu, reset: stejný řádek tabulky, kind = 'progress' | 'scene' | 'summary' | 'reset'. */
function event(kind, item, title, data) {
  var u = user(); if (!u) return null; /* bez přihlášení se průchod nezaznamenává */
  if (item == null) item = kind === 'reset' ? 'RESET' : String(kind || '').toUpperCase(); /* 03 B4: sloupec item je not null */
  var s = S0(), sc = sceneInfo(s), st = stamp(), p = Object.assign({}, data || {});
  if (kind === 'scene' && Array.isArray(p.items)) p.items = p.items.map(function (it) { return Object.assign({}, it, { ver: verOf(it.id) }); });
  if (kind === 'summary') p.items = snapshot();
  /* 31 B3: řádek scene s mnoha dlouhými poznámkami se zkrátí pod params_len (poznámka zůstává celá v řádcích decision/note) */
  if (kind === 'scene' && Array.isArray(p.items) && utf8(JSON.stringify(p)).length > PARAMS_MAX) p.items = p.items.map(function (it) { var n = String(it.note || ''); return n.length > 500 ? Object.assign({}, it, { note: n.slice(0, 500) + '…', noteLen: n.length }) : it; });
  p.seq = st.seq; p.skewMs = st.skewMs;
  var x = { id: 'E-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7), kind: kind, item: item, title: title, status: null, params: p, text: null, off: null, comment: '',
    by: D.auth && D.auth.role && D.auth.role() === 'admin' ? 'spravce' : 'garant', modelAt: s ? s.clock : null, at: st.at, scene: sc.no, sceneTitle: sc.title, schema: NF.SCHEMA, client: client, note: D.syncLabel || '', uid: u.id, email: u.email, created: Date.now() };
  pushQ(x); return x;
}

/* ---------- pravdivý stav uložení (B3) ---------- */
function stateOf(sid) {
  if (!sid) return null;
  var t = merged()[sid]; if (t) sid = t;
  if (Q().some(function (x) { return x.client + ':' + x.id === sid; })) return 'local';
  if (deadList().some(function (x) { return x.client + ':' + x.id === sid; })) return 'rejected';
  return 'server'; /* ani ve frontě, ani odložený = server ho přijal (nebo přišel ze serveru) */
}
function hhmm(iso) { var d = new Date(iso || Date.now()); return isNaN(d.getTime()) ? '' : ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
function stateText(sid, rt) {
  var s = stateOf(sid);
  if (s === 'local') return 'Uloženo v tomto prohlížeči · čeká na odeslání';
  if (s === 'rejected') return 'Server zápis odmítl · zůstává v tomto prohlížeči';
  return 'Uloženo ' + hhmm(rt) + '.';
}
/* 31 B3: proč server řádek odmítl, větou pro garanta */
function tooLong(x) { return !!(x && (x.kind === 'decision' || x.kind === 'note') && String(x.comment || '').length > NOTE_MAX); }
function deadReason(x) {
  if (!x) return '';
  if (tooLong(x)) return 'Poznámka u ' + x.item + ' je delší než ' + NOTE_MAX + ' znaků (' + String(x.comment).length + '). „Zkusit znovu“ odešle rozhodnutí s prvními ' + NOTE_MAX + ' znaky poznámky; celou poznámku zkraťte a uložte znovu.';
  if (x.deadStatus === 400 && x.params && utf8(JSON.stringify(x.params)).length > 65536) return 'Záznam ' + x.item + ' je pro server příliš velký.';
  return 'Server zápis ' + (x.item || '') + ' odmítl (HTTP ' + x.deadStatus + ').';
}
function pendingOwn() { var u = user(); return Q().filter(function (x) { return mine(x, u); }); }
function deadOwn() { var u = user(); return deadList().filter(function (x) { return mine(x, u); }); }
function status() {
  var p = pendingOwn().length, dd = deadOwn().length;
  return { pending: p, rejected: dd, saved: !p && !dd, lastOk: lastOk, lastErr: lastErr, configured: configured(), client: client, sending: !!sending, nextRetryAt: nextRetryAt,
    skewMs: skew.ms, skewHow: skew.how, restoreErr: restoreErr, foreign: Q().length - Q().filter(function (x) { return mine(x, user()); }).length };
}

D.sync = {
  event: event,
  pending: function () { return pendingOwn().length; },
  status: status,
  row: row, fromRow: fromRow, afterReset: afterReset, sortRows: sortRows, cmp: cmp, effMs: effMs,
  /* otisk (rozhodnutí 1): ver(id) = otisk dnešního znění, sameVer(ver, id) = platí rozhodnutí pro dnešní znění, canon/fnv1a pro export */
  ver: verOf, todayVer: todayVer, sameVer: sameVer, shownDiffers: shownDiffers, shownVer: shownVer, fingerprint: tempFp, guideFingerprint: guideFp, catFingerprint: catFp, extraFingerprint: extraFp,
  coreFingerprint: coreFp, codeItem: codeItem, codeGuide: codeGuide, codeFill: codeFill, itemContent: itemContent, canon: canon, fnv1a: fnv1a, sortEntries: sortEntries, keyOf: keyOf,
  fetchAll: fetchAll,
  /* fronta jiného účtu (odhlášení vypršením, pak jiný účet na stejném prohlížeči) se neposílá ani nezahazuje; odejde, až se ten účet přihlásí (C5) */
  foreign: function () { var u = user(); return Q().filter(function (x) { return !mine(x, u); }).length; },
  dropForeign: function () { var u = user(); if (!u) return 0; var q = Q(), k = q.filter(function (x) { return mine(x, u); }); if (k.length !== q.length) saveQ(k); return q.length - k.length; },
  localCount: function () { return Q().length + deadList().length; },
  retry: function () { lastErr = null; fails = 0; if (retryTimer && global.clearTimeout) global.clearTimeout(retryTimer); retryTimer = null; nextRetryAt = null; return flush(true); },
  flush: flush, restore: restore,
  /* po přihlášení (A1): nejdřív odeslat frontu, pak obnovit deník ze serveru */
  afterLogin: function () { lastErr = null; fails = 0; restoreErr = null; return flush(true).then(function () { return restore('prihlaseni'); }); },
  /* „Odhlásit a zahodit neuložené“: jen vlastní řádky (fronta i odložené) */
  clear: function () { var u = user(); saveQ(Q().filter(function (x) { return !mine(x, u); })); saveDead(deadList().filter(function (x) { return !mine(x, u); })); lastErr = null; notify(); },
  /* C2: smazat vše, co maketa o ukládání v prohlížeči drží (přihlašovací stránka, sdílený počítač) */
  wipeLocal: function () { saveQ([]); saveDead([]); [MKEY, SEQKEY, SKEWKEY, CKEY].forEach(function (k) { setRaw(k, null); }); skew = { ms: null, how: null }; lastErr = null; load(); notify(); },
  state: stateOf, stateText: stateText,
  /* presenter (entrySaved): true = záznam ještě není na serveru (čeká ve frontě, nebo ho server odmítl) */
  isPending: function (sid) { var x = stateOf(sid); return x === 'local' || x === 'rejected'; },
  allSaved: function () { return status().saved; },
  dead: function () { return deadOwn().slice(); },
  /* 31 B3: rozhodnutí odmítnuté kvůli dlouhé poznámce odejde s prvními NOTE_MAX znaky (params.commentCut = původní délka); rozhodnutí se tak neztratí */
  retryDead: function () { var u = user(), dd = deadList(), back = dd.filter(function (x) { return mine(x, u); }); if (!back.length) return flush(true); saveDead(dd.filter(function (x) { return !mine(x, u); })); saveQ(Q().concat(back.map(function (x) { var y = Object.assign({}, x); if (tooLong(y)) { y.params = Object.assign({}, y.params || {}, { commentCut: String(y.comment).length }); y.comment = String(y.comment).slice(0, NOTE_MAX); } delete y.deadStatus; delete y.deadAt; return y; }))); notify(); return flush(true); },
  deadReason: deadReason, NOTE_MAX: NOTE_MAX,
  onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
};
load();
/* Háček jádra: každé nové rozhodnutí nebo poznámka (ne přehrání scény). Záznamu přidá sid a rt, aby ho deník garanta uměl spárovat se serverem. */
NF.onDecision(function (S, d, h, r) { var x = record(S, d, h, r); d.sid = x.client + ':' + x.id; d.rt = effIso(x); d.client = x.client; d.seq = x.params.seq; d.scene = x.scene; if (h) { h.rt = d.rt; if (!h.where) h.where = d.where; h.by = d.by; } pushQ(x); });
/* ---------- stav v liště a v hlavičce registru ---------- */
function badge(s) {
  if (!(D.auth && D.auth.session())) return '';
  var st = status(), n = st.pending, dd = st.rejected, out;
  if (!configured()) return '<span class="sync-badge warn" title="Adresa úložiště není nastavená; rozhodnutí čekají v prohlížeči">ukládání nenastaveno' + (n ? ' · čeká ' + n : '') + '</span>';
  var why = lastErr ? 'Naposledy: ' + lastErr + (nextRetryAt ? '. Další pokus asi za ' + Math.max(1, Math.round((nextRetryAt - Date.now()) / 1000)) + ' s.' : '') : 'Čeká na odeslání.';
  if (n) out = '<span class="sync-badge warn" role="status" title="' + e(why + ' Rozhodnutí jsou uložená v tomto prohlížeči; nezavírejte okno, dokud se neodešlou.') + '">neuloženo: ' + n + ' <button type="button" class="btn sm" data-action="syncRetry">Zkusit znovu</button></span>';
  else if (!dd) out = '<span class="sync-badge ok" title="' + (lastOk ? 'naposledy ' + e(lastOk) : '') + '">rozhodnutí uložena ✓</span>';
  else out = '';
  if (dd) { var lng = deadOwn().filter(tooLong); out += '<span class="sync-badge warn" role="status" title="' + e(deadOwn().map(deadReason).join(' ') + ' Zůstávají v tomto prohlížeči; nic se nezahodilo.') + '">server odmítl: ' + dd + (lng.length ? ' · poznámka u ' + e(lng.map(function (x) { return x.item; }).join(', ')) + ' je delší než ' + NOTE_MAX + ' znaků' : '') + ' <button type="button" class="btn sm" data-action="syncRetryDead">Zkusit znovu</button></span>'; }
  if (typeof skew.ms === 'number' && Math.abs(skew.ms) > SKEW_WARN_MS) out += '<span class="sync-badge warn" title="Pořadí rozhodnutí opravujeme podle času serveru.">hodiny počítače se liší o ' + Math.round(Math.abs(skew.ms) / 60000) + ' min</span>';
  return out;
}
NF.slots.syncBadge = badge;
NF.slots.syncStatus = function (s) { return '<div class="actions m-0">' + badge(s) + '</div>'; };
/* Pro konec ukázky a poděkování (01 B1): prázdné, když je vše na serveru; jinak věta a tlačítko. */
NF.slots.syncEnd = function () {
  if (!(D.auth && D.auth.session())) return '';
  var st = status(); if (st.saved) return '';
  return '<div class="error soft" role="status">' + (st.pending ? 'Rozhodnutí zatím nejsou odeslaná (' + st.pending + '). Zůstaňte prosím online a okno nezavírejte, dokud se neodešlou. ' : '') +
    (st.rejected ? 'Server ' + st.rejected + ' zápis(y) odmítl; zůstávají v tomto prohlížeči. ' + e(deadOwn().map(deadReason).join(' ')) + ' ' : '') +
    '<button type="button" class="btn sm" data-action="' + (st.pending ? 'syncRetry' : 'syncRetryDead') + '">Zkusit znovu</button></div>';
};
NF.demoActions = NF.demoActions || {};
NF.demoActions.syncRetry = function () { D.sync.retry(); };
NF.demoActions.syncRetryDead = function () { D.sync.retryDead(); };
if (global.addEventListener) {
  global.addEventListener('online', function () { D.sync.retry(); });
  /* A2: změna fronty v jiné kartě → přepočítat stav a lištu */
  global.addEventListener('storage', function (ev) { if (ev && (ev.key === QKEY || ev.key === DEADKEY || ev.key == null)) { notify(); rerender(); } });
  /* B1: při zavření karty s neodeslanými – pokus o odeslání (keepalive) a dotaz prohlížeče */
  global.addEventListener('pagehide', function () {
    try { if (D.commitFocusedDraft) D.commitFocusedDraft(); } catch (err) { } /* 31 C6: rozepsaná poznámka v poli s kurzorem se uloží jako při opuštění pole */
    var u = user(), s = D.auth && D.auth.session(), q = eligible(Q(), u, true).slice(0, BATCH);
    if (!q.length || !s || !configured() || typeof global.fetch !== 'function') return;
    try { var h = authHeaders(s.access_token); h['Content-Type'] = 'application/json'; h['Prefer'] = 'return=minimal';
      global.fetch(base(), { method: 'POST', mode: 'cors', keepalive: true, headers: h, body: JSON.stringify(q.map(function (x) { return row(x.uid ? x : Object.assign({}, x, { uid: u.id, email: u.email })); })) }).catch(function () { }); } catch (err) { }
  });
  /* 31 C6: dotaz i při neuložené poznámce; poznámka v poli s kurzorem se nejdřív uloží (jako při opuštění pole) a odejde s frontou */
  global.addEventListener('beforeunload', function (ev) {
    if (!(D.auth && D.auth.session())) return;
    try { if (D.commitFocusedDraft) D.commitFocusedDraft(); } catch (err) { }
    var nd = 0; try { nd = D.unsavedDrafts ? D.unsavedDrafts().length : 0; } catch (err) { nd = 0; }
    if (!pendingOwn().length && !nd) return;
    var msg = pendingOwn().length ? 'Rozhodnutí ještě nejsou odeslaná.' : 'Poznámka ještě není uložená.';
    try { ev.preventDefault(); ev.returnValue = msg; } catch (err) { } return msg;
  });
}
/* A3: návrat na kartu → odeslat a načíst změny z jiných zařízení a karet */
if (global.document && global.document.addEventListener) {
  global.document.addEventListener('visibilitychange', function () {
    if (global.document.visibilityState !== 'visible') return;
    D.sync.retry().then(function () { if (Date.now() - lastRestore > RESTORE_GAP_MS) restore('navrat'); });
  });
}
if (typeof global.setTimeout === 'function') global.setTimeout(function () { if (D.auth && D.auth.session()) flush(true).then(function () { restore('start'); }); }, 1500);
})(typeof window !== 'undefined' ? window : globalThis);
