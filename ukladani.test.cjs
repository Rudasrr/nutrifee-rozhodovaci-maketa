/* Ukládání rozhodnutí garanta, přihlášení a výsledky správce (kontrola 4, 30. 10. 2026).
   Simulace bez sítě: fetch nahrazuje falešný server Supabase (REST + Auth) se stejnými pravidly jako návrh v navrhy-designu/05-supabase-rozhodnuti-garanta.md
   (PK id → 409, RLS user_id, spouštěč plní user_email a received_at, CHECK kind/status, item not null, Max rows 1000), výpadkem, zaseknutím, ztracenou odpovědí,
   posunem hodin a vynuceným kódem. Čas i časovače jsou řízené (žádné čekání). Na skutečný server nic nejde – každý požadavek mimo adresu z sync-config test shodí.
   Spuštění: node ukladani.test.cjs (z maketa-rozhodovaci/). Čísla v názvech odkazují na nálezy v navrhy-designu/30-kontrola4-a-pohledy-2026-10-29/ (01, 03, 05)
   a „31 …“ na závěrečné ověření navrhy-designu/31-zaverecne-overeni-2026-11-01/01-zaznam-garanta.md (A1, B1–B4, C1–C10). */
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), assert = require('node:assert/strict');
const ROOT = process.env.NUTRIFEE_ROOT || __dirname;
const html = fs.readFileSync(path.join(ROOT, 'nutrifee-rozhodovaci-maketa.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1].split('?')[0]);
const SRC = Object.fromEntries(scripts.map(f => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
const CFG = (SRC['demo/sync-config.js'].match(/url: '([^']+)'/) || [])[1];
assert.ok(/^https:\/\/[a-z]+\.supabase\.co$/.test(CFG), 'adresa úložiště v sync-config.js');

/* ---------- řízený čas a časovače ---------- */
let NOW = Date.UTC(2026, 9, 30, 8, 0, 0); const RealDate = Date;
let timers = [], tid = 0;
const tick = async (n = 40) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)); };
async function advance(ms) {
  const end = NOW + ms;
  for (;;) { timers.sort((a, b) => a.due - b.due); const t = timers[0]; if (!t || t.due > end) break; timers.shift(); NOW = Math.max(NOW, t.due); try { t.fn(); } catch (err) { } await tick(); }
  NOW = end; await tick();
}

/* ---------- falešný server ---------- */
let srv;
function makeServer(o = {}) {
  srv = Object.assign({ rows: [], calls: [], outage: false, hang: false, lose: 0, force: null, forceOnce: null, refresh: 200, maxRows: 1000, dateHeader: true, badItem: null, serverOffset: 0, tokens: {}, users: {}, outside: [] }, o);
  srv.user = (id, email, role, pass) => { srv.users[email] = { id, email, role, pass }; return srv.users[email]; };
  srv.issue = u => { const t = 'tok-' + u.id + '-' + Math.random().toString(36).slice(2, 7); srv.tokens[t] = u; return { access_token: t, refresh_token: 'rt-' + t, expires_in: 3600, user: { id: u.id, email: u.email, app_metadata: { role: u.role } } }; };
  srv.session = u => { const j = srv.issue(u); return JSON.stringify({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: 4102444800000, user: j.user }); };
  srv.time = () => new RealDate(NOW + srv.serverOffset);
  return srv;
}
function resp(status, body, extra) {
  const hdr = Object.assign({}, srv.dateHeader ? { date: srv.time().toUTCString() } : {}, extra || {});
  return { ok: status >= 200 && status < 300, status, json: async () => body, headers: { get: k => hdr[String(k).toLowerCase()] == null ? null : hdr[String(k).toLowerCase()] } };
}
async function fetchMock(url, opt = {}) {
  const u0 = new URL(url); if (u0.origin !== CFG) { srv.outside.push(url); throw new Error('požadavek mimo úložiště: ' + url); }
  const method = opt.method || 'GET', tok = ((opt.headers || {}).Authorization || '').replace('Bearer ', ''), who = srv.tokens[tok];
  srv.calls.push(method + ' ' + u0.pathname + u0.search.replace(/select=\*&?/, '') + (opt.keepalive ? ' keepalive' : '') + (opt.body && method === 'POST' && /rest/.test(u0.pathname) ? ' n=' + JSON.parse(opt.body).length : ''));
  if (srv.outage) throw new TypeError('Failed to fetch');
  if (srv.hang) return new Promise(() => { });
  if (u0.pathname.startsWith('/auth/v1/')) {
    const b = opt.body ? JSON.parse(opt.body) : {};
    if (u0.searchParams.get('grant_type') === 'password') { const u = srv.users[b.email]; if (!u || u.pass !== b.password) return resp(400, { error_description: 'Invalid login credentials' }); return resp(200, srv.issue(u)); }
    if (u0.searchParams.get('grant_type') === 'refresh_token') { if (srv.refresh !== 200) return resp(srv.refresh, { error: 'invalid_grant' }); const u = srv.tokens[String(b.refresh_token).replace(/^rt-/, '')]; return u ? resp(200, srv.issue(u)) : resp(400, { error: 'invalid_grant' }); }
    if (u0.pathname.endsWith('/logout')) { delete srv.tokens[tok]; return resp(204, null); }
    return resp(404, {});
  }
  if (srv.forceOnce) { const s = srv.forceOnce; srv.forceOnce = null; return resp(s, { message: 'vynuceno' }); }
  if (srv.force) return resp(srv.force, { message: 'vynuceno' });
  if (!who) return resp(401, { message: 'JWT expired' });
  if (method === 'POST') {
    const rows = JSON.parse(opt.body);
    for (const r of rows) {
      if (r.user_id !== who.id) return resp(403, { code: '42501' });
      if (r.item == null) return resp(400, { code: '23502', message: 'null value in column "item"' });
      if (!['decision', 'note', 'scene', 'progress', 'summary', 'reset'].includes(r.kind)) return resp(400, { code: '23514', message: 'kind_ok' });
      if (r.status != null && !['approved', 'rejected'].includes(r.status)) return resp(400, { code: '23514', message: 'status_ok' });
      if (srv.badItem && r.item === srv.badItem) return resp(400, { code: '22P02' });
      if ((r.comment || '').length > 4000) return resp(400, { code: '23514', message: 'comment_len' }); /* 05 odst. 0.3 */
      if (r.params && Buffer.byteLength(JSON.stringify(r.params)) > 65536) return resp(400, { code: '23514', message: 'params_len' });
    }
    if (rows.some(r => srv.rows.find(x => x.id === r.id))) return resp(409, { code: '23505' });
    rows.forEach(r => srv.rows.push(Object.assign({}, r, { user_id: who.id, user_email: who.email, received_at: srv.time().toISOString() }))); /* spouštěč garant_rozhodnuti_stamp */
    if (srv.lose > 0) { srv.lose--; throw new TypeError('Failed to fetch (odpověď ztracena)'); }
    return resp(201, null);
  }
  let out = srv.rows.slice(); if (who.role !== 'admin') out = out.filter(r => r.user_id === who.id);
  const f = u0.searchParams.get('user_id'); if (f) out = out.filter(r => 'eq.' + r.user_id === f);
  const gt = u0.searchParams.get('id'); if (gt && gt.startsWith('gt.')) out = out.filter(r => r.id > gt.slice(3));
  if (u0.searchParams.get('order') === 'id.asc') out.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const lim = Math.min(Number(u0.searchParams.get('limit') || 1e9), srv.maxRows);
  return resp(200, JSON.parse(JSON.stringify(out.slice(0, lim))));
}

/* ---------- zařízení (karta prohlížeče) ---------- */
function device({ store = null, session = null, offset = 0, fetch = true } = {}) {
  store = store || new Map(); if (session) store.set('nutrifee-auth', session);
  class FakeDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(NOW + offset); } static now() { return NOW + offset; } }
  const els = new Map(), el = id => { if (!els.has(id)) els.set(id, { innerHTML: '', focus() { }, querySelector() { return null; }, querySelectorAll() { return []; }, childNodes: [] }); return els.get(id); };
  const winL = {}, docL = {}, downloads = [];
  const doc = { getElementById: el, addEventListener: (t, fn) => { (docL[t] = docL[t] || []).push(fn); }, querySelectorAll() { return []; }, visibilityState: 'visible', activeElement: null, body: null,
    createElement: () => ({ click() { downloads.push({ name: this.download, href: this.href }); }, set innerHTML(v) { }, querySelectorAll() { return []; } }) };
  const blobs = new Map(); let bn = 0;
  const sb = { console: { log() { }, warn() { }, error() { } }, Date: FakeDate, document: doc,
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) },
    setTimeout: (fn, ms) => { const id = ++tid; timers.push({ id, due: NOW + (ms || 0), fn }); return id; }, clearTimeout: id => { timers = timers.filter(t => t.id !== id); },
    Blob: class { constructor(parts, o) { this.text = parts.join(''); this.type = o && o.type; } }, URL: { createObjectURL: b => { const k = 'blob:' + (++bn); blobs.set(k, b); return k; }, revokeObjectURL() { } },
    addEventListener: (t, fn) => { (winL[t] = winL[t] || []).push(fn); } };
  if (fetch) sb.fetch = fetchMock;
  sb.window = sb; sb.globalThis = sb;
  const ctx = vm.createContext(sb);
  for (const f of scripts) vm.runInContext(SRC[f], ctx, { filename: f });
  const app = ctx.NutriFeeApp, NF = ctx.NutriFee, D = ctx.NutriFeeDemo;
  const dev = { store, ctx, app, NF, D, els, downloads, blobs, S: () => app.getState(), act: (a, v) => app.act(a, v),
    fire: (t, ev) => (winL[t] || []).map(fn => fn(ev || { key: null, preventDefault() { this.prevented = true; } })),
    docFire: (t, ev) => (docL[t] || []).map(fn => fn(ev)), /* SCHEMA 83: psaní do pole poznámky (input, focusout) */
    visible: async () => { (docL.visibilitychange || []).forEach(fn => fn()); await tick(); },
    queue: () => JSON.parse(store.get('nutrifee-sync-queue') || '[]'), dead: () => JSON.parse(store.get('nutrifee-sync-dead') || '[]'),
    status: id => D.sync.state(id), state: id => NF.itemState(app.getState(), id), note: id => NF.itemNote(app.getState(), id),
    overlay: () => String(els.get('overlay') ? els.get('overlay').innerHTML : '').replace(/\u00a0/g, ' '), page: () => String(els.get('app') ? els.get('app').innerHTML : '').replace(/\u00a0/g, ' ') + String(els.get('tour') ? els.get('tour').innerHTML : '').replace(/\u00a0/g, ' ') };
  return dev;
}
const scene = (d, n = '2') => { d.act('goScene', n); d.act('closeDrawer'); };
const dq = d => d.queue().filter(x => x.kind === 'decision' || x.kind === 'note');
const garantRows = () => srv.rows.filter(r => r.kind === 'decision' || r.kind === 'note');
const legacyNote = (A, id, text) => A.NF.decideItem(A.S(), id, null, text, { garant: true, note: true, status: null, rt: new Date().toISOString(), where: 'panel' }); /* SCHEMA 83: poznámka bez rozhodnutí v novém toku nevzniká; starší záznam jako dřív */

let passed = 0, failed = 0; const fails = [], tests = [];
const test = (name, fn) => tests.push([name, fn]);

/* ---------- 1. otisk (rozhodnutí 1) ---------- */
test('Rozhodnutí 1: decision i note nesou params.ver { version, fp, fpGuide, alg }; otisk je deterministický a závisí na znění, parametrech i průvodci', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw');
  const A = device({ session: srv.session(G) }); scene(A);
  legacyNote(A, 'R-NAVYKY', 'jen poznámka'); await advance(3000);
  A.act('garantDecide', 'K-KRITERIA:approved'); await advance(100);
  const dec = srv.rows.find(r => r.kind === 'decision' && r.item === 'K-KRITERIA'), nt = srv.rows.find(r => r.kind === 'note');
  for (const r of [dec, nt]) { const v = r.params.ver; assert.ok(v, 'ver chybí u ' + r.kind); assert.equal(v.version, 'v1'); assert.match(v.fp, /^(fp-[0-9a-f]{16}|[0-9a-f]{8})$/); assert.match(v.fpCat, /^[0-9a-f]{8}$/); assert.match(v.fpGuide, /^[0-9a-f]{8}$/); assert.ok(['sync1', 'core'].includes(v.alg)); assert.equal(typeof r.params.seq, 'number'); }
  const B = device({ session: srv.session(G) });
  assert.equal(B.D.sync.ver('K-KRITERIA').fp, dec.params.ver.fp, 'jiné zařízení spočítá týž otisk');
  const c = B.D.sync.itemContent('R-PORCE'), f0 = B.D.sync.fnv1a(B.D.sync.canon(c));
  assert.equal(f0, B.D.sync.fingerprint('R-PORCE'));
  const v1 = B.D.sync.ver('R-PORCE'), v2 = B.D.sync.ver('R-DOPLNEK'); assert.notEqual(v1.fp, v2.fp, 'různé položky = různý otisk (i otiskem jádra)');
  assert.notEqual(B.D.sync.fnv1a(B.D.sync.canon(Object.assign({}, c, { summary: c.summary + '.' }))), f0, 'změna znění změní otisk');
  assert.notEqual(B.D.sync.fnv1a(B.D.sync.canon(Object.assign({}, c, { texts: Object.assign({}, c.texts, { smaller: 'x' }) }))), f0, 'změna textu pro pacienta změní otisk');
  assert.ok(B.D.sync.itemContent('C-CILE').bounds && B.D.sync.itemContent('I-HYPO').instruction, 'otisk zahrnuje meze parametrů a znění pokynu');
  assert.equal(B.D.sync.fnv1a(B.D.sync.canon({ b: 1, a: [1, 'ž'] })), B.D.sync.fnv1a(B.D.sync.canon({ a: [1, 'ž'], b: 1 })), 'kanonický JSON nezávisí na pořadí klíčů');
  assert.equal(B.D.sync.fnv1a(''), '811c9dc5'); assert.equal(B.D.sync.fnv1a('a'), 'e40c292c'); /* referenční hodnoty FNV-1a 32 */
  assert.equal(B.D.sync.sameVer(dec.params.ver, 'K-KRITERIA'), true);
  assert.equal(B.D.sync.sameVer(Object.assign({}, dec.params.ver, { fp: 'deadbeef' }), 'K-KRITERIA'), false);
  assert.equal(B.D.sync.sameVer(Object.assign({}, dec.params.ver, { fpGuide: '00000000' }), 'K-KRITERIA'), false, 'změna průvodce = jiné znění');
  assert.equal(B.D.sync.sameVer(Object.assign({}, dec.params.ver, { fpCat: '00000000' }), 'K-KRITERIA'), false, 'změna mezí nebo znění pokynu = jiné znění');
  /* opuštění scény a souhrn nesou otisky položek */
  for (let i = 0; i < 30 && A.S().sceneIndex === 2; i++) { A.D.pendingNow(A.S()).ids.forEach(id => A.act('garantDecide', id + ':approved')); A.act('tourNext'); }
  await advance(100); const sc = srv.rows.filter(r => r.kind === 'scene' && r.params.items && r.params.items.length).pop();
  assert.ok(sc && sc.params.items.every(it => it.ver && it.ver.fp), 'položky v řádku scene nesou ver');
});
test('Rozhodnutí 1: výsledky správce ukážou „rozhodnuto k předchozímu znění“, když otisk nesedí; bez otisku „bez otisku znění“', async () => {
  makeServer(); const Ad = srv.user('u-admin', 'admin@example.test', 'admin', 'pw');
  const A = device({ session: srv.session(Ad) }), ver = A.D.sync.ver('K-KRITERIA');
  const T = m => new Date(Date.UTC(2026, 9, 30, 9, m)).toISOString(), u = { user_id: 'u-g', user_email: 'garant@example.test' };
  A.D.results.setRows([
    Object.assign({ id: 'c:1', kind: 'decision', item: 'K-KRITERIA', status: 'approved', at: T(1), params: { where: 'panel', ver } }, u),
    Object.assign({ id: 'c:2', kind: 'decision', item: 'C-CILE', status: 'approved', at: T(2), params: { where: 'panel', ver: Object.assign({}, A.D.sync.ver('C-CILE'), { fp: 'deadbeef', version: 'v1' }) } }, u),
    Object.assign({ id: 'c:3', kind: 'decision', item: 'R-NAVYKY', status: 'rejected', at: T(3), schema: 71, params: { where: 'panel' } }, u)]);
  A.act('openResults'); A.act('resultsTab', 'registr'); const ov = A.overlay();
  const block = id => { const i = ov.indexOf('<b>' + id + ' · '); return ov.slice(i, ov.indexOf('</li>', i)); };
  assert.equal(/předchozímu znění/.test(block('K-KRITERIA')), false, 'stejný otisk: bez upozornění');
  assert.match(block('C-CILE'), /rozhodnuto k předchozímu znění/);
  assert.match(block('R-NAVYKY'), /bez otisku znění/);
  assert.match(ov, /1× rozhodnuto k předchozímu znění/);
});

/* ---------- 2. export (rozhodnutí 2) ---------- */
test('Rozhodnutí 2: export JSON a CSV jen pro správce, z načtených řádků bez sítě; 28 položek, stav = logika správce, otisk a platnost, znění, průvodce, surové řádky', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'), Ad = srv.user('u-admin', 'admin@example.test', 'admin', 'pw');
  const A = device({ session: srv.session(G) }); scene(A);
  A.D.noteDraft('K-KRITERIA', 'pozn; s "uvozovkami"'); A.act('garantDecide', 'K-KRITERIA:approved');
  A.D.noteDraft('C-CILE', '=SUM(A1)'); A.act('garantDecide', 'C-CILE:rejected:ano'); await advance(100);
  A.act('garantDecide', 'C-CILE:approved'); legacyNote(A, 'R-NAVYKY', 'jen poznámka'); await advance(5000);
  const M = device({ session: srv.session(Ad) }); M.act('openResults'); await advance(100);
  assert.ok(M.D.results.rows().length >= 4, 'správce načetl řádky');
  assert.match(M.overlay(), /data-action="resultsExport" data-value="json"[^>]*>Stáhnout JSON/); assert.match(M.overlay(), /data-action="resultsExport" data-value="csv"[^>]*>Stáhnout CSV/);
  const calls = srv.calls.length; M.act('resultsExport', 'json'); M.act('resultsExport', 'csv');
  assert.equal(srv.calls.length, calls, 'export nevolá síť'); assert.equal(M.downloads.length, 2);
  assert.match(M.downloads[0].name, /^nutrifee-rozhodnuti-garanta_garant-example\.test_\d{4}-\d{2}-\d{2}\.json$/); assert.match(M.downloads[1].name, /\.csv$/);
  const j = JSON.parse(M.blobs.get(M.downloads[0].href).text);
  assert.equal(j.format, 'nutrifee-garant-export'); assert.equal(j.formatVersion, 1); assert.equal(j.items.length, 28); assert.equal(j.account.user_email, 'garant@example.test'); assert.equal(j.account.user_id, 'u-g');
  const live = M.D.results.rows().filter(r => r.user_id === 'u-g');
  for (const it of j.items) { const rs = M.D.resultsState(live, it.id); assert.equal(it.state, rs.status || 'pending', it.id); }
  const k = j.items.find(x => x.id === 'K-KRITERIA'), cc = j.items.find(x => x.id === 'C-CILE'), nv = j.items.find(x => x.id === 'R-NAVYKY');
  assert.equal(k.appliesToCurrent, true); assert.equal(k.decision.ver.fp, k.current.fp); assert.equal(k.note.text, 'pozn; s "uvozovkami"');
  assert.equal(cc.state, 'approved'); assert.equal(cc.history.filter(h => h.kind === 'decision').length, 2, 'historie obou rozhodnutí');
  assert.equal(nv.state, 'pending'); assert.equal(nv.note.text, 'jen poznámka'); assert.equal(nv.appliesToCurrent, null);
  assert.ok(k.current.summary && k.current.guide && k.current.guide.co && k.current.guide.ucinek, 'znění a průvodce'); assert.ok(j.items.find(x => x.id === 'C-CILE').current.params.low != null && j.items.find(x => x.id === 'C-CILE').current.bounds, 'parametry a meze');
  assert.ok(j.items.find(x => x.id === 'I-HYPO').current.instruction.text, 'znění pokynu I-*');
  assert.ok(j.rows.length >= live.length && j.rows.some(r => r.kind === 'scene'), 'surové řádky účtu');
  assert.match(j.build.registryFp, /^[0-9a-f]{8}$/);
  const csv = M.blobs.get(M.downloads[1].href).text; assert.equal(csv.charCodeAt(0), 0xfeff, 'BOM');
  const lines = csv.slice(1).trim().split('\r\n'); assert.equal(lines.length, 29, 'hlavička + 28 položek');
  assert.ok(lines[0].startsWith('id;kategorie;nazev;stav;rozhodnuto_kdy;scena;kde;poznamka;pocet_zmen;schema_rozhodnuti;otisk_rozhodnuti;otisk_dnes;plati_pro_dnesni_zneni;parametry_json;text_pro_pacienta'));
  assert.match(csv, /K-KRITERIA;[^\r\n]*;schváleno;[^\r\n]*;"pozn; s ""uvozovkami""";/); assert.match(csv, /"?'=SUM\(A1\)/, 'vzorec neutralizován');
  /* garant export nemá */
  const G2 = device({ session: srv.session(G) }); G2.D.results.setRows(srv.rows.slice()); G2.act('resultsExport', 'json'); assert.equal(G2.downloads.length, 0);
  assert.equal(/resultsExport/.test(G2.page()), false);
});

/* ---------- 3. robustnost (05) ---------- */
test('05 B1: po výpadku i chybě 500 se fronta odešle sama (opakování 2, 5, 15 s…), bez klepnutí; pagehide pošle keepalive, beforeunload varuje', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'); const A = device({ session: srv.session(G) }); scene(A);
  srv.outage = true; A.act('garantDecide', 'K-KRITERIA:approved'); await advance(100);
  assert.equal(dq(A).length, 1); assert.match(A.D.sync.status().lastErr, /Failed to fetch/);
  const ev = { preventDefault() { this.prevented = true; } }; A.fire('beforeunload', ev); assert.ok(ev.prevented && ev.returnValue, 'beforeunload varuje');
  A.fire('pagehide'); assert.ok(srv.calls.some(c => /keepalive/.test(c)), 'pagehide zkusí keepalive');
  srv.outage = false; await advance(2500); assert.equal(A.D.sync.pending(), 0, 'odesláno samo po 2 s'); assert.equal(garantRows().length, 1);
  srv.force = 500; A.act('garantDecide', 'C-CILE:rejected:ano'); await advance(100); assert.equal(dq(A).length, 1);
  await advance(2100); assert.equal(dq(A).length, 1, 'stále 500'); srv.force = null; await advance(5100); assert.equal(A.D.sync.pending(), 0, 'druhý pokus po 5 s');
  const ev2 = { preventDefault() { this.prevented = true; } }; A.fire('beforeunload', ev2); assert.equal(!!ev2.prevented, false, 'bez neodeslaných nevaruje');
  assert.equal(new Set(srv.rows.map(r => r.id)).size, srv.rows.length, 'bez duplicit (keepalive + běžné odeslání)');
});
test('05 C6: zaseknutý požadavek po 15 s vyprší a fronta se zkusí znovu', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'); const A = device({ session: srv.session(G) }); scene(A);
  srv.hang = true; A.act('garantDecide', 'K-KRITERIA:approved'); await advance(1000); assert.equal(A.D.sync.status().sending, true);
  await advance(15000); assert.equal(A.D.sync.status().sending, false); assert.match(A.D.sync.status().lastErr, /15 s/);
  srv.hang = false; await advance(2500); assert.equal(A.D.sync.pending(), 0); assert.equal(garantRows().length, 1);
});
test('05 B2 + 03 B4: trvale odmítnutý řádek jde stranou a neblokuje frontu; reset má item RESET a projde přes item NOT NULL; nic se nezahazuje', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'); const A = device({ session: srv.session(G) }); scene(A);
  srv.badItem = 'K-KRITERIA'; A.act('garantDecide', 'K-KRITERIA:approved'); A.act('garantDecide', 'C-CILE:approved'); A.act('garantDecide', 'R-NAVYKY:approved'); await advance(3000);
  assert.equal(A.D.sync.pending(), 0); assert.equal(A.dead().length, 1); assert.equal(A.dead()[0].deadStatus, 400);
  assert.deepEqual(garantRows().map(r => r.item).sort(), ['C-CILE', 'R-NAVYKY']);
  assert.match(A.NF.slots.syncBadge(A.S()), /server odmítl: 1/); assert.equal(A.D.sync.status().rejected, 1);
  const sidK = A.D.garantLog().find(d => d.item === 'K-KRITERIA').sid; assert.equal(A.status(sidK), 'rejected');
  srv.badItem = null; A.act('syncRetryDead'); await advance(100); assert.equal(A.dead().length, 0); assert.ok(garantRows().some(r => r.item === 'K-KRITERIA'));
  A.act('garantReset'); A.act('garantDecide', 'C-CILE:rejected:ano'); await advance(3000);
  const rs = srv.rows.find(r => r.kind === 'reset'); assert.ok(rs, 'reset na serveru'); assert.equal(rs.item, 'RESET'); assert.equal(A.D.sync.pending(), 0, 'po resetu se fronta neblokuje');
});
test('05 A1: vypršení přihlášení nesmaže koncept ani deník; po novém přihlášení se fronta nejdřív odešle, pak se deník obnoví; jiný účet frontu nepošle ani nezahodí', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'), G2 = srv.user('u-g2', 'garant2@example.test', 'garant', 'pw2');
  const A = device({ session: srv.session(G) }); scene(A);
  A.act('garantDecide', 'R-NAVYKY:approved'); await advance(100);
  A.D.noteDraft('C-CILE', 'rozepsaná poznámka');
  srv.tokens = {}; srv.refresh = 400; A.act('garantDecide', 'K-KRITERIA:approved'); await advance(200);
  assert.equal(A.D.auth.session(), null, 'odhlášen'); assert.match(A.page(), /Přihlášení vypršelo/);
  assert.equal(JSON.parse(A.store.get('nutrifee-garant-drafts')).hasOwnProperty('C-CILE'), true, 'koncept zůstal');
  assert.equal(A.D.garantLog().length, 2, 'deník zůstal'); assert.equal(dq(A).length, 1, 'fronta drží');
  assert.match(A.page(), /Smazat data makety z tohoto prohlížeče/, 'C2: data jde smazat z přihlašovací stránky');
  srv.refresh = 200; Object.assign(A.D.auth.form(), { email: 'garant@example.test', pass: 'pw' }); A.act('authLogin'); await advance(500);
  assert.ok(A.D.auth.session()); assert.equal(A.D.sync.pending(), 0, 'fronta odeslána hned po přihlášení'); assert.equal(A.D.sync.status().lastErr, null);
  assert.ok(srv.rows.some(r => r.item === 'K-KRITERIA'));
  const iPost = srv.calls.findIndex(c => /^POST \/rest/.test(c) && c.includes('n=')), iGet = srv.calls.map((c, i) => [c, i]).filter(([c]) => /^GET \/rest/.test(c)).map(([, i]) => i).pop();
  assert.ok(iPost >= 0 && iGet > iPost, 'nejdřív odeslat, pak obnovit');
  assert.equal(A.state('K-KRITERIA'), 'approved'); assert.equal(A.D.noteField('C-CILE'), 'rozepsaná poznámka');
  /* jiný účet na stejném prohlížeči: deník předchozího pryč, jeho neodeslané čekají */
  srv.outage = true; A.act('garantDecide', 'S-SILNA:approved'); await advance(100); assert.equal(dq(A).length, 1);
  srv.tokens = {}; srv.refresh = 400; srv.outage = false; A.D.sync.retry(); await advance(100); assert.equal(A.D.auth.session(), null);
  srv.refresh = 200; Object.assign(A.D.auth.form(), { email: 'garant2@example.test', pass: 'pw2' }); A.act('authLogin'); await advance(500);
  assert.equal(A.D.garantLog().length, 0, 'deník jiného účtu smazán'); assert.equal(dq(A).length, 1, 'fronta předchozího účtu zůstala'); assert.equal(A.D.sync.pending(), 0, 'nepočítá se novému účtu');
  assert.equal(srv.rows.filter(r => r.item === 'S-SILNA').length, 0, 'cizí řádky se pod jiným účtem neposílají');
  A.act('authLogout'); Object.assign(A.D.auth.form(), { email: 'garant@example.test', pass: 'pw' }); A.act('authLogin'); await advance(500);
  assert.equal(srv.rows.filter(r => r.item === 'S-SILNA').length, 1, 'po přihlášení původního účtu odejdou'); assert.equal(A.state('S-SILNA'), 'approved');
});
test('05 A2: dvě karty téhož prohlížeče se nepřepíší – offline fronta drží rozhodnutí obou karet a deník karty A se po návratu doplní', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'); const store = new Map(); store.set('nutrifee-auth', srv.session(G));
  const A = device({ store }); scene(A); const B = device({ store }); scene(B);
  srv.outage = true; A.act('garantDecide', 'K-KRITERIA:approved'); B.act('garantDecide', 'C-CILE:rejected:ano'); A.act('garantDecide', 'R-NAVYKY:approved'); await advance(100);
  assert.deepEqual(dq(A).map(x => x.item), ['K-KRITERIA', 'C-CILE', 'R-NAVYKY'], 'fronta v úložišti má všechna tři');
  srv.outage = false; await advance(3000);
  assert.deepEqual(garantRows().map(r => r.item).sort(), ['C-CILE', 'K-KRITERIA', 'R-NAVYKY']); assert.equal(A.queue().length, 0);
  await advance(20000); await A.visible(); await advance(100);
  assert.equal(A.state('C-CILE'), 'rejected', 'karta A převzala rozhodnutí z karty B');
  B.fire('storage', { key: 'nutrifee-sync-queue' }); assert.equal(B.D.sync.pending(), 0);
});
test('05 A3: dvě zařízení – návrat na kartu načte rozhodnutí z druhého zařízení; poslední platí na obou i u správce', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'), Ad = srv.user('u-admin', 'admin@example.test', 'admin', 'pw');
  const A = device({ session: srv.session(G) }), B = device({ session: srv.session(G) }); scene(A); scene(B);
  A.act('garantDecide', 'K-KRITERIA:rejected:ano'); await advance(20000);
  await B.visible(); await advance(100); assert.equal(B.state('K-KRITERIA'), 'rejected', 'B vidí zamítnutí z A');
  scene(B); B.act('garantDecide', 'K-KRITERIA:approved'); await advance(20000);
  await A.visible(); await advance(100); assert.equal(A.state('K-KRITERIA'), 'approved', 'A vidí pozdější schválení z B');
  const M = device({ session: srv.session(Ad) }); M.act('openResults'); await advance(100);
  assert.equal(M.D.resultsState(M.D.results.rows().filter(r => r.user_id === 'u-g').sort(M.D.sync.cmp), 'K-KRITERIA').status, 'approved');
  /* start stránky s platným přihlášením obnoví deník bez nového přihlášení */
  const C = device({ session: srv.session(G) }); await advance(2000); assert.equal(C.state('K-KRITERIA'), 'approved', 'obnova při startu');
});
test('05 A4: čtení po stránkách – 2500 řádků při Max rows 1000: obnova i správce vidí nejnovější', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'), Ad = srv.user('u-admin', 'admin@example.test', 'admin', 'pw');
  const t0 = Date.UTC(2026, 9, 20, 8);
  for (let i = 0; i < 2500; i++) srv.rows.push({ id: 'old:' + String(i).padStart(5, '0'), kind: 'decision', item: 'C-CILE', status: 'approved', comment: '', at: new RealDate(t0 + i * 1000).toISOString(), received_at: new RealDate(t0 + i * 1000 + 50).toISOString(), user_id: 'u-g', user_email: 'garant@example.test', params: { where: 'panel' } });
  srv.rows.push({ id: 'new:1', kind: 'decision', item: 'C-CILE', status: 'rejected', comment: 'poslední', at: new RealDate(t0 + 3e6).toISOString(), received_at: new RealDate(t0 + 3e6 + 50).toISOString(), user_id: 'u-g', user_email: 'garant@example.test', params: { where: 'panel' } });
  const A = device({ session: srv.session(G) }); await advance(2000);
  assert.equal(A.state('C-CILE'), 'rejected', 'obnova má i řádky za 1000.'); assert.equal(A.note('C-CILE'), 'poslední');
  assert.ok(srv.calls.filter(c => /^GET \/rest/.test(c)).length >= 3, 'víc stránek');
  const M = device({ session: srv.session(Ad) }); M.act('openResults'); await advance(100); assert.ok(M.D.results.rows().length >= 2501 && M.D.results.rows().some(r => r.id === 'new:1'), 'správce má všech ' + M.D.results.rows().length);
});
test('05 B4 + 03 B2: pořadí podle opraveného času (posun hodin z hlavičky Date / z času přijetí); „reset v budoucnosti“ neskryje pozdější rozhodnutí', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw');
  const F = device({ session: srv.session(G), offset: 3 * 3600e3 }); scene(F); /* hodiny o 3 h napřed */
  F.act('garantDecide', 'R-NAVYKY:approved'); await advance(100);
  assert.ok(Math.abs(F.D.sync.status().skewMs + 3 * 3600e3) < 2000, 'posun změřen z hlavičky Date: ' + F.D.sync.status().skewMs);
  assert.match(F.NF.slots.syncBadge(F.S()), /hodiny počítače se liší o 180 min/);
  F.act('garantDecide', 'K-KRITERIA:rejected:ano'); await advance(3600e3); /* zamítnutí v 9:00 skutečného času */
  const B = device({ session: srv.session(G) }); scene(B); await advance(100); B.act('garantDecide', 'K-KRITERIA:approved'); await advance(100); /* schválení v 10:00 */
  const rows = srv.rows.filter(r => r.item === 'K-KRITERIA'); assert.ok(rows[0].at > rows[1].at, 'čas klienta by pořadí obrátil');
  const C = device({ session: srv.session(G) }); await advance(2000); assert.equal(C.state('K-KRITERIA'), 'approved', 'platí pozdější skutečné rozhodnutí');
  assert.equal(C.D.resultsState(C.D.sync.sortRows(rows), 'K-KRITERIA').status, 'approved');
  /* bez hlavičky Date: odhad z received_at */
  srv.dateHeader = false; const H = device({ session: srv.session(G), offset: -2 * 3600e3 }); scene(H); H.act('garantDecide', 'R-REAKCE:approved'); await advance(2000);
  H.D.sync.restore('test'); await advance(100); assert.ok(Math.abs(H.D.sync.status().skewMs - 2 * 3600e3) < 5000, 'odhad z času přijetí: ' + H.D.sync.status().skewMs);
  /* podvržený reset s at v budoucnosti: účinný čas je nejvýš received_at */
  const T = (h) => new RealDate(Date.UTC(2026, 9, 30, h)).toISOString();
  const rs = [{ id: 'x:1', kind: 'decision', item: 'C-CILE', status: 'rejected', at: T(8), received_at: T(8) }, { id: 'x:2', kind: 'reset', item: 'RESET', at: T(23), received_at: T(9) }, { id: 'x:3', kind: 'decision', item: 'C-CILE', status: 'approved', at: T(10), received_at: T(10) }];
  assert.deepEqual(H.D.sync.afterReset(rs).map(r => r.id), ['x:3']);
});
test('05 B3: pravdivý stav uložení – state(sid) „local“ do odeslání, pak „server“; stateText pro řádek pod poznámkou', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'); const A = device({ session: srv.session(G) }); scene(A);
  srv.outage = true; A.act('garantDecide', 'R-NAVYKY:approved'); A.D.noteDraft('R-NAVYKY', 'offline'); A.D.saveNote('R-NAVYKY'); await advance(3000);
  const sid = A.D.garantLog().slice(-1)[0].sid; assert.equal(A.status(sid), 'local'); assert.match(A.D.sync.stateText(sid), /čeká na odeslání/);
  assert.match(String(A.NF.slots.syncEnd()), /nejsou odeslaná/); assert.equal(A.D.sync.allSaved(), false);
  let seen = 0; A.D.sync.onChange(() => seen++);
  srv.outage = false; await advance(16000); assert.equal(A.status(sid), 'server'); assert.equal(A.D.sync.isPending(sid), false); assert.match(A.D.sync.stateText(sid, new Date().toISOString()), /^Uloženo \d\d:\d\d\.$/);
  assert.equal(A.NF.slots.syncEnd(), ''); assert.ok(seen > 0, 'onChange hlásí změnu');
});
test('05 B6 + B5: e-mail ze serveru se ve výsledcích správce escapuje; účty podle user_id', async () => {
  makeServer(); const Ad = srv.user('u-admin', 'admin@example.test', 'admin', 'pw'); const M = device({ session: srv.session(Ad) });
  const bad = '<a id="pwn4" href="https://example.invalid/login">Přihlaste se znovu</a><img id="img4" src=x>';
  M.D.results.setRows([{ id: 'a:1', kind: 'decision', item: 'K-KRITERIA', status: 'approved', at: '2026-10-30T09:00:00Z', user_id: 'u-x', user_email: 'jiny@example.test', params: {} },
    { id: 'a:2', kind: 'decision', item: 'C-CILE', status: 'rejected', at: '2026-10-30T09:01:00Z', user_id: 'u-x', user_email: bad, params: {} }]);
  M.act('openResults'); const ov = M.overlay();
  assert.equal(/<a id="pwn4"|<img id="img4"/.test(ov), false, 'žádné HTML z e-mailu'); assert.match(ov, /&lt;a id=/);
  assert.equal((ov.match(/data-action="resultsWho"/g) || []).length, 1, 'jeden účet (user_id), i když se e-mail liší');
});
test('01 M7: výchozí účet ve výsledcích je garant, ne vlastní (i když nedávno aktivní) účet správce', async () => {
  makeServer(); const Ad = srv.user('u-admin', 'admin@example.test', 'admin', 'pw'); const M = device({ session: srv.session(Ad) });
  M.D.results.setRows([{ id: 'g:1', kind: 'decision', item: 'K-KRITERIA', status: 'approved', at: '2026-10-30T09:00:00Z', user_id: 'u-g', user_email: 'garant@example.test' },
    { id: 'm:1', kind: 'progress', item: 'PRUBEH', at: '2026-10-30T11:00:00Z', user_id: 'u-admin', user_email: 'admin@example.test', params: { scene: 1 } }]);
  M.act('openResults'); const ov = M.overlay();
  assert.match(ov, /class="btn sm selected" data-action="resultsWho" data-value="garant@example\.test"/); assert.match(ov, /admin@example\.test \(vy\)/);
});
test('01 M8: poznámka uložená těsně před Schválit se stejným textem → jeden řádek (rozhodnutí); starší dvojice se u správce nepočítá jako druhé „schváleno“', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'); const A = device({ session: srv.session(G) }); scene(A);
  /* SCHEMA 83: poznámka vzniká až po rozhodnutí; změní-li garant hned po ní rozhodnutí, odejde jen rozhodnutí s poznámkou */
  A.act('garantDecide', 'K-KRITERIA:rejected'); await advance(3000);
  A.D.noteDraft('K-KRITERIA', 'text'); A.D.saveNote('K-KRITERIA'); await advance(500); A.act('garantDecide', 'K-KRITERIA:approved'); await advance(3000);
  const ks = srv.rows.filter(r => r.item === 'K-KRITERIA'); assert.deepEqual(ks.map(r => r.kind), ['decision', 'decision']); assert.equal(ks[1].comment, 'text'); assert.equal(ks[1].status, 'approved');
  const noteSid = A.D.garantLog().find(d => d.item === 'K-KRITERIA' && d.kind === 'note').sid; assert.equal(A.status(noteSid), 'server', 'sid poznámky ukazuje na rozhodnutí');
  const T = s => '2026-10-30T09:00:' + s + '.000Z', u = { user_id: 'u-g', user_email: 'garant@example.test' };
  const rows = [Object.assign({ id: 'a:1', kind: 'scene', item: 'SCENA', at: T('00'), scene: 3, params: { how: 'dal', items: [{ id: 'R-NAVYKY', status: null, note: '' }] } }, u),
    Object.assign({ id: 'a:2', kind: 'note', item: 'R-NAVYKY', status: null, comment: 'x', at: T('10'), params: { where: 'panel' } }, u),
    Object.assign({ id: 'a:3', kind: 'decision', item: 'R-NAVYKY', status: 'approved', comment: 'x', at: T('12'), params: { where: 'panel' } }, u)];
  assert.equal(A.D.resultsState(rows, 'R-NAVYKY').rows.length, 1, 'historie: jeden záznam');
  const Ad = srv.user('u-admin', 'admin@example.test', 'admin', 'pw'), M = device({ session: srv.session(Ad) }); M.D.results.setRows(rows); M.act('openResults');
  assert.match(M.overlay(), /později: schváleno [^<]*\(v panelu\) · „x“/);
  M.D.results.setRows([rows[0], Object.assign({}, rows[1], { comment: 'jen poznámka' })]); M.act('openResults');
  assert.match(M.overlay(), /později: poznámka [^<]*\(v panelu\) „jen poznámka“/, 'samotná poznámka se jmenuje poznámka');
});
test('03 B3: rozhodnutí a poznámka z obrazovky registru – where registr, decided_by garant, poznámka u nerozhodnuté má status null', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'); const A = device({ session: srv.session(G) });
  A.act('role', 'doctor'); A.act('page', 'registry'); A.act('regOpen', 'D-POSTUP'); A.S().form = A.S().form || {}; A.S().form['note_D-POSTUP'] = 'z registru'; A.act('regDecide', 'approved');
  A.act('regOpen', 'S-SILNA'); A.S().form['note_S-SILNA'] = 'pozn z registru'; A.act('regNote', 'S-SILNA'); await advance(3000);
  const d = srv.rows.find(r => r.item === 'D-POSTUP'), n = srv.rows.find(r => r.item === 'S-SILNA');
  assert.equal(d.params.where, 'registr'); assert.equal(d.decided_by, 'garant'); assert.equal(n.kind, 'note'); assert.equal(n.status, null, 'nerozhodnutá: null'); assert.equal(n.params.where, 'registr');
  assert.equal(A.D.garantLog().find(x => x.item === 'S-SILNA').status, null, 'deník souhlasí se serverem');
});
test('Regrese: ztracená odpověď a F5 během ukládání – 409 = uloženo, na serveru žádná duplicita; nic nejde mimo úložiště', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'); const A = device({ session: srv.session(G) }); scene(A);
  srv.lose = 1; A.act('garantDecide', 'K-KRITERIA:approved'); A.act('garantDecide', 'C-CILE:approved'); await advance(100);
  assert.equal(dq(A).length, 2); await advance(2500); assert.equal(A.D.sync.pending(), 0);
  srv.outage = true; A.act('garantDecide', 'R-NAVYKY:approved'); await advance(100);
  const A2 = device({ store: A.store }); srv.outage = false; await advance(3000); assert.equal(A2.D.sync.pending(), 0);
  assert.equal(new Set(srv.rows.map(r => r.id)).size, srv.rows.length); assert.equal(garantRows().length, 3);
  assert.equal(srv.outside.length, 0, 'žádný požadavek mimo adresu úložiště');
});
test('Bez sítě a bez přihlášení se nic neposílá; jádro app/ síť nevolá', async () => {
  for (const f of scripts.filter(s => s.startsWith('app/'))) assert.equal(/fetch\(|XMLHttpRequest|sendBeacon/.test(SRC[f]), false, f);
  makeServer(); const A = device({ fetch: false, session: srv.session(srv.user('u-g', 'garant@example.test', 'garant', 'pw')) }); scene(A); A.act('garantDecide', 'K-KRITERIA:approved'); await advance(5000);
  assert.equal(dq(A).length, 1); assert.equal(srv.calls.length, 0);
});

/* ---------- 31: závěrečné ověření 1. 11. 2026 (01-zaznam-garanta) ---------- */
const VECTORS = { core: 'fp-369fd99c923cdd13', coreNull: 'fp-868eb1cb58ba14b9', emoji: 'fp-823559b0623a9309', u8: '24616b68', u8emoji: 'a0d90531', empty: '811c9dc5', a: 'e40c292c' }; /* testovací vektory otisku (předávka odst. 5) */
const cardOf = (html, id) => { const i = html.indexOf('data-gitem="' + id + '"'); if (i < 0) return ''; const j = html.indexOf('data-gitem="', i + 12); return html.slice(i, j > 0 ? j : undefined); };
test('31 A1: karta garanta v souhrnu ukazuje znění z kódu i po scéně 18 (modelová v2 jen v příběhu); rozhodnutí nese ver.shown; rozhodnutí nad modelovou verzí výsledky i export označí', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'), Ad = srv.user('u-admin', 'admin@example.test', 'admin', 'pw');
  const A = device({ session: srv.session(G) }), NF = A.NF, D = A.D;
  A.act('goSummary'); await advance(100);
  assert.ok(D.summaryActive(A.S()), 'jsme v souhrnu'); assert.equal(NF.item(A.S(), 'R-PORADI').version, 'v2', 'příběh (scénář 5) založil ve stavu modelovou v2');
  const code = NF.data.registry().find(r => r.id === 'R-PORADI');
  assert.equal(D.garantView(A.S(), 'R-PORADI').text, code.text); assert.equal(D.garantView(A.S(), 'R-PORADI').version, code.version || 'v1');
  assert.equal(/Když budete mít dost dřív/.test(NF.screens.itemGuide(A.S(), D.garantView(A.S(), 'R-PORADI'))), false, 'průvodce karty bez textu v2');
  A.S().gOpen = 'R-PORADI'; NF.render(); const card = cardOf(A.page(), 'R-PORADI');
  assert.ok(card, 'karta R-PORADI v souhrnu'); assert.equal(/Když budete mít dost dřív/.test(card), false, 'karta neukazuje modelovou v2');
  A.act('garantDecide', 'R-PORADI:approved'); await advance(3000);
  const row = srv.rows.filter(r => r.kind === 'decision' && r.item === 'R-PORADI').pop();
  assert.equal(row.params.where, 'souhrn'); const v = row.params.ver;
  assert.ok(v.shown, 'ver.shown'); assert.equal(v.shown.fp, v.fp, 'garant viděl znění z kódu'); assert.equal(v.shown.version, v.version); assert.equal(D.sync.sameVer(v, 'R-PORADI'), true);
  /* obrazovka registru ve scéně 19: otisk zobrazeného znění = to, co registr opravdu ukazuje (NF.screens.shownItem, jinak stav příběhu) */
  A.act('goScene', '18'); A.act('closeDrawer'); A.act('role', 'doctor'); A.act('page', 'registry'); A.act('regOpen', 'R-PORADI');
  A.D.noteDraft('R-PORADI', 'Schvaluji novou verzi s větou o nasycení.'); A.act('garantDecide', 'R-PORADI:approved'); await advance(3000);
  const rr = srv.rows.filter(r => r.kind === 'decision' && r.item === 'R-PORADI').pop(); assert.equal(rr.params.where, 'registr');
  const shownItem = NF.screens.shownItem ? NF.screens.shownItem(A.S(), 'R-PORADI') : NF.item(A.S(), 'R-PORADI');
  assert.equal(rr.params.ver.shown.fp, NF.itemFingerprint(shownItem, D.guide['R-PORADI']), 'shown = otisk znění na obrazovce registru');
  const differs = D.sync.shownDiffers(rr.params.ver);
  const M = device({ session: srv.session(Ad) }); M.D.results.setRows(srv.rows.slice()); M.act('openResults'); M.act('resultsTab', 'registr');
  const j = M.D.results.exportData('json').data, it = j.items.find(x => x.id === 'R-PORADI');
  assert.equal(it.appliesToCurrent, !differs); assert.equal(it.decidedOnModel, differs);
  if (differs) { assert.equal(rr.params.ver.shown.version, 'v2'); assert.match(M.overlay(), /rozhodnuto nad modelovou verzí příběhu/); assert.match(it.appliesToCurrentWhy, /modelovou verzí příběhu/); }
  /* pojistka vždy: řádek s jiným zobrazeným zněním → neplatí pro dnešní znění, varování správci, CSV verze_zobrazena */
  const ver = Object.assign({}, D.sync.ver('R-PORADI'), { shown: { version: 'v2', fp: 'fp-00000000deadbeef' } }), uu = { user_id: 'u-g', user_email: 'garant@example.test' };
  M.D.results.setRows([Object.assign({ id: 'c:1', client: 'c', kind: 'decision', item: 'R-PORADI', status: 'approved', comment: 'v2 ano', at: '2026-11-01T09:00:00Z', received_at: '2026-11-01T09:00:01Z', scene: 19, params: { where: 'registr', ver, seq: 1 } }, uu)]);
  M.act('openResults'); M.act('resultsTab', 'registr'); const ov = M.overlay();
  assert.match(ov, /1× rozhodnuto nad modelovou verzí příběhu/); assert.match(ov, /garant viděl verzi v2/);
  const x = M.D.results.exportData('json').data.items.find(y => y.id === 'R-PORADI'); assert.equal(x.appliesToCurrent, false); assert.equal(x.decidedOnModel, true);
  const csv = M.D.results.exportData('csv').text.slice(1).split('\r\n'), hd = csv[0].split(';'), ln = csv.find(l => l.startsWith('R-PORADI;'));
  assert.ok(hd.includes('verze_zobrazena') && hd.includes('otisk_zobrazeny')); assert.match(ln, /;v2;fp-00000000deadbeef;/);
});
test('31 B1: odchod ze scény nese i položky, o kterých garant ve scéně rozhodl, když je zamítnutí jiné z plánu scény odebralo; „Po scénách“ ukáže, kde se rozhodlo', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'), Ad = srv.user('u-admin', 'admin@example.test', 'admin', 'pw');
  const A = device({ session: srv.session(G) }); A.act('goScene', '12'); A.act('closeDrawer');
  const before = A.D.decisionItems(12); assert.ok(before.includes('I-HYPO') && before.includes('B-HYPO'), 'scéna 13 nabízí I-HYPO a B-HYPO: ' + before);
  A.act('garantDecide', 'I-HYPO:approved'); A.act('garantDecide', 'B-HYPO:rejected:ano'); await advance(100);
  const plan = A.D.decisionItems(12);
  A.act('goScene', '13'); await advance(3000);
  const sc = srv.rows.filter(r => r.kind === 'scene' && r.scene === 13).pop(), its = sc.params.items;
  assert.deepEqual(its.filter(x => x.id === 'I-HYPO').map(x => x.status), ['approved'], 'I-HYPO je v záznamu scény 13 (plán po zamítnutí: ' + plan + ')');
  assert.deepEqual(its.filter(x => x.id === 'B-HYPO').map(x => x.status), ['rejected']);
  assert.ok(its.every(x => x.ver && x.ver.fp), 'i doplněné položky nesou otisk');
  /* starší řádky (snímek bez I-HYPO): „Po scénách“ ji podle řádku decision ukáže ve scéně 13 a ve finále „rozhodnuto ve scéně 13“ */
  const T = s => '2026-11-01T09:' + s + ':00.000Z', u = { user_id: 'u-g', user_email: 'garant@example.test', client: 'c' };
  const rows = [Object.assign({ id: 'c:1', kind: 'decision', item: 'I-HYPO', status: 'approved', comment: '', at: T('00'), scene: 13, params: { where: 'panel', seq: 1 } }, u),
    Object.assign({ id: 'c:2', kind: 'decision', item: 'B-HYPO', status: 'rejected', comment: '', at: T('01'), scene: 13, params: { where: 'panel', seq: 2 } }, u),
    Object.assign({ id: 'c:3', kind: 'scene', item: 'SCENA', at: T('02'), scene: 13, params: { how: 'dal', items: [{ id: 'B-HYPO', status: 'rejected', note: '' }], seq: 3 } }, u),
    Object.assign({ id: 'c:4', kind: 'scene', item: 'SCENA', at: T('03'), scene: 26, params: { how: 'konec', items: [{ id: 'I-HYPO', status: 'approved', note: '' }], seq: 4 } }, u)];
  const M = device({ session: srv.session(Ad) }); M.D.results.setRows(rows); M.act('openResults'); M.act('resultsTab', 'sceny'); const ov = M.overlay();
  const s13 = ov.slice(ov.indexOf('Scéna 13 ·'), ov.indexOf('Scéna 14 ·')), s26 = ov.slice(ov.indexOf('Scéna 26 ·'), ov.indexOf('Scéna 27 ·') > 0 ? ov.indexOf('Scéna 27 ·') : undefined);
  assert.match(s13, /<b>I-HYPO<\/b>[^<]*<span class="tag ok">schváleno<\/span>[^]*?zamítnutí jiné položky ji ze scény odebralo/);
  assert.match(s26, /<b>I-HYPO<\/b>[^]*?\(rozhodnuto ve scéně 13, v panelu\)/);
});
test('31 B2 + C2: řádky téhož prohlížeče jdou podle seq i při změně odhadu posunu hodin; mezi prohlížeči podle času; pořadí nezávisí na vstupu; deník garanta řadí stejně', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'); const A = device({ session: srv.session(G) }); const sy = A.D.sync;
  const base = Date.UTC(2026, 10, 1, 10), iso = t => new RealDate(t).toISOString(), u = { user_id: 'u-g', user_email: 'garant@example.test' };
  const a = Object.assign({ id: 'c:D-a', client: 'c', kind: 'decision', item: 'C-CILE', status: 'rejected', comment: '', at: iso(base), received_at: iso(base + 1200), params: { seq: 10, skewMs: 900 } }, u);
  const b = Object.assign({ id: 'c:D-b', client: 'c', kind: 'decision', item: 'C-CILE', status: 'approved', comment: '', at: iso(base + 400), received_at: iso(base + 1500), params: { seq: 11, skewMs: 100 } }, u);
  assert.ok(sy.effMs(b) < sy.effMs(a), 'samotný účinný čas by pořadí obrátil (nález B2)');
  assert.deepEqual(sy.sortRows([b, a]).map(r => r.status), ['rejected', 'approved']); assert.equal(sy.cmp(a, b) < 0, true);
  assert.equal(A.D.resultsState([b, a], 'C-CILE').status, 'approved', 'platí pozdější zápis garanta');
  /* jiný prohlížeč: x (účinně 700 ms) před a i b, y (950 ms) po obou – klíč b je průběžné maximum řetězce (900 ms) */
  const x = Object.assign({ id: 'd:D-x', client: 'd', kind: 'decision', item: 'C-CILE', status: 'approved', comment: '', at: iso(base + 700), received_at: iso(base + 800), params: { seq: 1, skewMs: 0 } }, u);
  const y = Object.assign({ id: 'd:D-y', client: 'd', kind: 'decision', item: 'C-CILE', status: 'rejected', comment: '', at: iso(base + 950), received_at: iso(base + 1000), params: { seq: 2, skewMs: 0 } }, u);
  const want = ['d:D-x', 'c:D-a', 'c:D-b', 'd:D-y'], perm = l => l.length < 2 ? [l] : l.flatMap((v, i) => perm(l.slice(0, i).concat(l.slice(i + 1))).map(p => [v].concat(p)));
  perm([a, b, x, y]).forEach(p => assert.deepEqual(sy.sortRows(p).map(r => r.id), want, 'nezávisle na pořadí vstupu'));
  /* reset téhož prohlížeče mezi a a b (seq 10.5) platí podle seq, ne podle času */
  const rs = Object.assign({ id: 'c:E-r', client: 'c', kind: 'reset', item: 'RESET', at: iso(base + 200), received_at: iso(base + 1300), params: { seq: 10.5, skewMs: 900 } }, u);
  assert.deepEqual(sy.afterReset([a, b, rs]).map(r => r.id), ['c:D-b']);
  /* deník garanta (presenter): záznamy téhož prohlížeče podle seq */
  const ent = r => ({ item: 'C-CILE', kind: 'decision', status: r.status, comment: '', sid: r.id, rt: new RealDate(sy.effMs(r)).toISOString(), client: r.client, seq: r.params.seq });
  A.D.garantMerge([ent(b), ent(a)]); assert.equal(A.state('C-CILE'), 'approved'); assert.deepEqual(Array.from(A.D.garantLog(), d => d.sid), ['c:D-a', 'c:D-b']);
  assert.deepEqual(Array.from(sy.sortEntries([ent(b), ent(a)]), d => d.sid), ['c:D-a', 'c:D-b']);
});
/* Model pohledu garant_stav (05 odst. 0.5) krok za krokem: eff, okno max(eff) po (user_id, client) podle seq, n-tice (k, client, seq, received_at, id), poslední reset, distinct on. */
function sqlModel(rows) {
  const R = rows.map(r => { const sk = r.params && typeof r.params.skewMs === 'number' ? r.params.skewMs : 0; return { r, eff: Math.min(Date.parse(r.at) + sk, Date.parse(r.received_at)), seq: r.params && r.params.seq != null ? r.params.seq : null }; });
  const parts = {}; R.forEach(x => { if (x.seq == null || x.r.client == null) x.k = x.eff; else (parts[x.r.user_id + '|' + x.r.client] = parts[x.r.user_id + '|' + x.r.client] || []).push(x); });
  Object.values(parts).forEach(l => { l.sort((a, b) => a.seq - b.seq); let m = -Infinity; l.forEach(x => { m = Math.max(m, x.eff); x.k = m; }); });
  R.forEach(x => { x.t = [x.k, x.r.client || '', x.seq == null ? -1 : x.seq, Date.parse(x.r.received_at), x.r.id]; });
  const cmpT = (a, b) => { for (let i = 0; i < 5; i++) { if (a.t[i] < b.t[i]) return -1; if (a.t[i] > b.t[i]) return 1; } return 0; };
  const last = R.filter(x => x.r.kind === 'reset').sort(cmpT).pop();
  const live = R.filter(x => (x.r.kind === 'decision' || x.r.kind === 'note') && (!last || cmpT(x, last) > 0)).sort(cmpT), out = {};
  live.forEach(x => { const o = out[x.r.item] = out[x.r.item] || { status: null, note: '' }; if (x.r.kind === 'decision') o.status = x.r.status; o.note = x.r.comment || ''; });
  return out;
}
test('31 B2: pohled garant_stav (model SQL) a klient (D.sync.sortRows + výsledky) dají u náhodných řádků tří prohlížečů s měnícím se posunem hodin a resety stejný stav', async () => {
  makeServer(); const A = device({ session: srv.session(srv.user('u-g', 'garant@example.test', 'garant', 'pw')) }); const sy = A.D.sync;
  let seed = 7; const rnd = n => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  for (let run = 0; run < 200; run++) {
    const off = { a: rnd(7200e3) - 3600e3, b: rnd(600e3) - 300e3, c: 0 }, seq = { a: 0, b: 0, c: 0 }, rows = []; let T = Date.UTC(2026, 10, 1, 8);
    for (let i = 0; i < 30; i++) {
      const cl = 'abc'[rnd(3)], kind = rnd(25) === 0 ? 'reset' : rnd(3) === 0 ? 'note' : 'decision', item = kind === 'reset' ? 'RESET' : ['C-CILE', 'K-KRITERIA', 'R-PORCE'][rnd(3)];
      T += rnd(3) === 0 ? 0 : rnd(900); const skew = rnd(4) === 0 ? null : -off[cl] + rnd(3000) - 1500;
      rows.push({ id: cl + ':D-' + String(i).padStart(3, '0'), client: cl, user_id: 'u-g', kind, item, status: kind === 'decision' ? (rnd(2) ? 'approved' : 'rejected') : null, comment: kind === 'reset' ? '' : 'p' + rnd(4),
        at: new RealDate(T + off[cl]).toISOString(), received_at: new RealDate(T + 50 + rnd(1500)).toISOString(), params: { seq: ++seq[cl], skewMs: skew } });
    }
    const m = sqlModel(rows), live = sy.afterReset(rows);
    for (const id of ['C-CILE', 'K-KRITERIA', 'R-PORCE']) {
      const c = A.D.resultsState(live, id), x = m[id] || { status: null, note: '' };
      assert.equal(c.status, x.status, 'běh ' + run + ' ' + id + ' stav'); assert.equal(c.note, x.note, 'běh ' + run + ' ' + id + ' poznámka');
    }
    /* v řetězci jednoho prohlížeče vždy podle seq */
    const order = sy.sortRows(rows); ['a', 'b', 'c'].forEach(cl => { const sq = order.filter(r => r.client === cl).map(r => r.params.seq); assert.deepEqual(sq, sq.slice().sort((p, q) => p - q)); });
  }
});
test('31 B3: poznámka nejvýš 4000 znaků (maxlength, počitadlo, i presenter); řádek odmítnutý kvůli délce řekne proč a „Zkusit znovu“ rozhodnutí odešle; snímek souhrnu bez celých poznámek', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'); const A = device({ session: srv.session(G) }); scene(A);
  await advance(3000); A.act('openDecisions'); A.S().gOpen = 'K-KRITERIA'; A.NF.render(); assert.equal(/data-gnote="K-KRITERIA"/.test(A.overlay()), false, 'SCHEMA 83: pole až po rozhodnutí');
  A.act('garantDecide', 'K-KRITERIA:approved'); await advance(3000); assert.match(A.overlay(), /<textarea rows="2" maxlength="4000" data-gnote="K-KRITERIA"/);
  A.D.noteDraft('K-KRITERIA', 'x'.repeat(3700)); A.NF.render(); assert.match(A.overlay(), /data-gcount="K-KRITERIA"[^>]*>3700 z 4000 znaků</);
  A.D.noteDraft('K-KRITERIA', 'x'.repeat(4100)); A.NF.render(); assert.match(A.overlay(), /Neuloženo: poznámka je delší než 4000 znaků; zkraťte ji\./);
  A.act('garantDecide', 'K-KRITERIA:rejected'); await advance(3000);
  assert.equal(A.state('K-KRITERIA'), 'approved', 'dlouhá poznámka: změna rozhodnutí se nezapsala'); assert.equal(A.queue().length, 0); assert.match(A.page() + A.overlay(), /má 4100 znaků; uložit jde nejvýš 4000/);
  A.act('closeDrawer');
  assert.equal(A.D.saveNote('K-KRITERIA'), false, 'ani samotná poznámka'); assert.equal(A.D.noteField('K-KRITERIA').length, 4100, 'koncept zůstal');
  /* řádek s dlouhou poznámkou, který už je ve frontě (starší verze, jiná cesta): server ho odmítne, garant se dozví proč, rozhodnutí odejde zkrácené */
  A.NF.decideItem(A.S(), 'C-CILE', 'approved', 'y'.repeat(4100), { garant: true, rt: new Date().toISOString(), where: 'panel' }); await advance(3000);
  assert.equal(A.dead().length, 1); assert.equal(A.dead()[0].deadStatus, 400); assert.match(A.D.sync.deadReason(A.dead()[0]), /C-CILE je delší než 4000 znaků \(4100\)/);
  assert.match(A.NF.slots.syncBadge(A.S()), /poznámka u C-CILE je delší než 4000 znaků/); assert.match(String(A.NF.slots.syncEnd()), /delší než 4000 znaků/);
  A.act('syncRetryDead'); await advance(3000); assert.equal(A.dead().length, 0);
  const c = srv.rows.find(r => r.item === 'C-CILE' && r.kind === 'decision'); assert.equal(c.status, 'approved'); assert.equal(c.comment.length, 4000); assert.equal(c.params.commentCut, 4100);
  /* snímek souhrnu: poznámka zkrácená na 200 znaků + délka (28 × 4000 by přesáhlo params_len) */
  A.D.noteDraft('R-NAVYKY', 'z'.repeat(3999)); A.act('garantDecide', 'R-NAVYKY:approved'); await advance(3000);
  A.D.sync.event('summary', 'SOUHRN', 'Souhrn', { approved: 1 }); await advance(3000);
  const sm = srv.rows.find(r => r.kind === 'summary'), nv = sm.params.items.find(x => x.id === 'R-NAVYKY'); assert.equal(nv.noteLen, 3999); assert.ok(nv.note.length <= 201);
  assert.equal(srv.rows.find(r => r.item === 'R-NAVYKY' && r.kind === 'decision').comment.length, 3999, 'celá poznámka je v řádku decision');
});
/* Nezávislý přepočet otisků jen z exportu podle předávky odst. 5 (bez funkcí makety); C1, C8, B4. */
const X = (() => {
  const canon = v => v === undefined || typeof v === 'function' ? 'null' : v === null || typeof v !== 'object' ? JSON.stringify(v) : Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' :
    '{' + Object.keys(v).sort().filter(k => v[k] !== undefined && typeof v[k] !== 'function').map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  const fnv8 = s => { let h = 0x811c9dc5; for (const by of Buffer.from(s, 'utf8')) { h ^= by; h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
  const core = (item, co) => {
    const body = {}; ['id', 'scope', 'cat', 'title', 'summary', 'detail', 'text', 'texts', 'lists', 'postup', 'sestra', 'params', 'labels'].forEach(k => { if (item[k] !== undefined && item[k] !== null) body[k] = item[k]; });
    const s = canon({ item: body, co: co == null ? null : String(co) }); let h1 = 0x811c9dc5, h2 = (0x01000193 ^ 0x5bd1e995) >>> 0;
    for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul((h1 ^ c) >>> 0, 0x01000193) >>> 0; h2 = Math.imul((h2 ^ ((c * 31 + i) & 0xffff)) >>> 0, 0x01000193) >>> 0; }
    return 'fp-' + h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
  };
  const fromExport = it => { const c = it.current; return {
    fp: core(Object.assign({}, c, { id: it.id, cat: it.cat }), c.guide ? c.guide.co : null),
    fpGuide: c.guideRaw ? fnv8(canon(c.guideRaw)) : null,
    fpCat: fnv8(canon({ bounds: c.bounds == null ? null : c.bounds, instruction: c.instruction == null ? null : c.instruction, habits: c.habits || [] })),
    fpExtra: fnv8(canon({ usedBy: c.usedBy == null ? null : c.usedBy, steps: c.steps == null ? null : c.steps, safety: c.safety == null ? null : c.safety })) }; };
  return { canon, fnv8, core, fromExport };
})();
test('31 B4 + C1 + C8 + C9: otisky jdou přepočítat podle předávky jen z exportu (28 z 28 u fp, fpGuide, fpCat, fpExtra); testovací vektory; popis v exportu podle alg; fpCat a fpExtra v exportu i CSV', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'), Ad = srv.user('u-admin', 'admin@example.test', 'admin', 'pw');
  const A = device({ session: srv.session(G) }); scene(A); A.act('garantDecide', 'K-KRITERIA:approved'); await advance(3000);
  const M = device({ session: srv.session(Ad) }); M.act('openResults'); await advance(100);
  const j = M.D.results.exportData('json').data; assert.equal(j.items.length, 28);
  let n = 0; for (const it of j.items) { const r = X.fromExport(it), c = it.current; for (const k of ['fp', 'fpGuide', 'fpCat', 'fpExtra']) assert.equal(r[k], c[k], it.id + ' ' + k); n++; }
  assert.equal(n, 28);
  const k = j.items.find(x => x.id === 'K-KRITERIA'); assert.deepEqual(X.fromExport(k).fp, k.decision.ver.fp, 'i otisk v řádku rozhodnutí');
  assert.equal(j.fingerprint.alg, 'core'); assert.match(j.fingerprint.description, /^fp \(alg core\) = NF\.itemFingerprint/); assert.match(j.fingerprint.other, /fpGuide = FNV-1a 32 nad bajty UTF-8/);
  assert.match(j.rules, /fpCat, fpExtra/); assert.equal(j.build.tag, 'schema-' + M.NF.SCHEMA);
  assert.equal(j.build.registryFp, X.fnv8(X.canon(j.items.map(x => [x.id, x.current.version, x.current.fp, x.current.fpGuide, x.current.fpCat, x.current.fpExtra]))), 'registryFp podle popisu');
  const csv = M.D.results.exportData('csv').text.slice(1).split('\r\n')[0].split(';');
  ['otisk_katalogu_rozhodnuti', 'otisk_katalogu_dnes', 'otisk_dalsich_textu_rozhodnuti', 'otisk_dalsich_textu_dnes', 'poznamka_vznikla', 'zapsal'].forEach(h => assert.ok(csv.includes(h), h));
  /* testovací vektory (stejné v předávce odst. 5) */
  const NF = A.NF, sy = A.D.sync;
  const VI = { id: 'X-TEST', cat: 'rady', title: 'Žluťoučký kůň „úpěl“', summary: null, params: { a: 1.5, b: [1, 'ř'] }, labels: { a: 'hodnota (mmol/l)' } };
  const vec = { core: NF.itemFingerprint(VI, { co: 'Schvalujete 1,5 mmol/l.' }), coreNull: NF.itemFingerprint({ id: 'X-0' }, null), emoji: NF.itemFingerprint({ id: 'X-1', title: 'a😀' }, null),
    u8: sy.fnv1a(sy.canon({ proc: 'Proč – ž', ucinek: { druh: 'vypne', bezMista: [] } })), u8emoji: sy.fnv1a('a😀'), empty: sy.fnv1a(''), a: sy.fnv1a('a') };
  if (process.env.PRINTVEC) console.log(JSON.stringify(vec));
  assert.deepEqual(vec, VECTORS);
  assert.equal(X.core(VI, 'Schvalujete 1,5 mmol/l.'), vec.core); assert.equal(X.fnv8(X.canon({ proc: 'Proč – ž', ucinek: { druh: 'vypne', bezMista: [] } })), vec.u8); assert.equal(X.fnv8('a😀'), vec.u8emoji);
  /* C9: fp z parametrů v kódu, ne ze stavu příběhu; C8: fpExtra (usedBy, kroky, věta bezpečnostní položky) mění platnost, chybějící ve starším řádku ne */
  const before = sy.ver('C-CILE'); A.S().registry.items.find(r => r.id === 'C-CILE').params = Object.assign({}, A.S().registry.items.find(r => r.id === 'C-CILE').params, { low: 3.3 });
  assert.equal(sy.ver('C-CILE').fp, before.fp, 'změna parametru ve stavu příběhu otisk z kódu nemění');
  assert.equal(sy.sameVer(Object.assign({}, before, { fpExtra: '00000000' }), 'C-CILE'), false); const old = Object.assign({}, before); delete old.fpExtra; assert.equal(sy.sameVer(old, 'C-CILE'), true);
  assert.notEqual(sy.extraFingerprint('B-HYPO'), X.fnv8(X.canon({ usedBy: sy.codeItem('B-HYPO').usedBy || null, steps: sy.codeItem('B-HYPO').steps || null, safety: null })), 'věta bezpečnostní položky je v otisku');
});
test('31 C9: otisk jádra z kódu = otisk se stavem příběhu na začátku (stará rozhodnutí neztratí platnost); karty bez modelové verze mají shown = fp u všech 28', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'); const A = device({ session: srv.session(G) }); scene(A);
  const NF = A.NF, D = A.D;
  for (const r of NF.garantItems(A.S())) {
    assert.equal(D.sync.coreFingerprint(r.id), NF.itemFingerprint(D.sync.codeItem(r.id), D.guide[r.id]), r.id + ': dosazení z kódu = dosazení ze stavu');
    assert.equal(D.sync.shownVer(A.S(), r.id, 'panel').fp, D.sync.ver(r.id).fp, r.id + ': karta = kód');
    assert.equal(D.sync.shownVer(A.S(), r.id, 'registr').fp, D.sync.ver(r.id).fp, r.id + ': registr před scénou 18 = kód');
  }
});
test('31 C3 + C5 + C7: decided_by podle role; nejdál = maximum scén; potvrzení souhrnu před resetem označené; u poznámky čas vzniku', async () => {
  makeServer(); const Ad = srv.user('u-admin', 'admin@example.test', 'admin', 'pw'); const M = device({ session: srv.session(Ad) }); scene(M);
  M.act('garantDecide', 'K-KRITERIA:approved'); await advance(3000);
  const d = srv.rows.find(r => r.item === 'K-KRITERIA'); assert.equal(d.decided_by, 'spravce'); assert.equal(M.D.garantLog().slice(-1)[0].by, 'garant', 'deník: rozhodnutí v roli garanta');
  M.D.results.setRows(srv.rows.slice()); M.act('openResults'); M.act('resultsTab', 'registr'); M.act('resultsWho', 'admin@example.test'); assert.match(M.overlay(), /zapsal správce/);
  const T = m => '2026-11-01T09:' + m + ':00.000Z', u = { user_id: 'u-g', user_email: 'garant@example.test', client: 'c' };
  const rows = [Object.assign({ id: 'c:1', kind: 'progress', item: 'PRUBEH', at: T('00'), params: { scene: 20, title: 'Dvacet', seq: 1 } }, u),
    Object.assign({ id: 'c:2', kind: 'summary', item: 'SOUHRN', at: T('01'), params: { approved: 1, seq: 2 } }, u),
    Object.assign({ id: 'c:3', kind: 'reset', item: 'RESET', at: T('02'), params: { seq: 3 } }, u),
    Object.assign({ id: 'c:4', kind: 'progress', item: 'PRUBEH', at: T('03'), params: { scene: 3, title: 'Tři', seq: 4 } }, u),
    Object.assign({ id: 'c:5', kind: 'note', item: 'R-PROCHAZKA', status: null, comment: 'Jen poznámka', at: T('04'), scene: 11, params: { where: 'panel', seq: 5 } }, u),
    Object.assign({ id: 'c:6', kind: 'decision', item: 'R-PROCHAZKA', status: 'approved', comment: 'Jen poznámka', at: T('30'), scene: 19, params: { where: 'registr', seq: 6 } }, u),
    Object.assign({ id: 'c:7', kind: 'summary', item: 'SOUHRN', at: T('31'), params: { approved: 1, seq: 7 } }, u)];
  M.D.results.setRows(rows); M.act('resultsWho', 'garant@example.test'); const j = M.D.results.exportData('json').data;
  assert.equal(j.progress.furthestScene, 20); assert.equal(j.progress.lastScene, 3); assert.match(M.overlay(), /nejdál: [^<]*Dvacet|nejdál: [^<]*scéna 20/);
  assert.deepEqual(j.progress.summaryConfirmations.map(x => x.beforeReset), [true, false]);
  const p = j.items.find(x => x.id === 'R-PROCHAZKA'); assert.equal(p.note.text, 'Jen poznámka'); assert.equal(p.note.firstAt, T('04')); assert.equal(p.note.at, T('30'));
});
test('31 C6: rozepsaná poznámka v poli s kurzorem se při zavírání stránky uloží a odejde; neuložený koncept vyvolá dotaz prohlížeče', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'); const A = device({ session: srv.session(G) }); scene(A);
  A.act('garantDecide', 'C-CILE:approved'); A.act('garantDecide', 'R-NAVYKY:approved'); await advance(3000); A.D.noteDraft('C-CILE', 'koncept bez opuštění pole'); const doc = A.ctx.document;
  const ev0 = { preventDefault() { this.prevented = true; } }; A.fire('beforeunload', ev0); assert.ok(ev0.prevented, 'koncept bez kurzoru: dotaz'); assert.match(ev0.returnValue, /Poznámka ještě není uložená/);
  doc.activeElement = { getAttribute: k => k === 'data-gnote' ? 'R-NAVYKY' : null, value: 'píšu a zavírám' };
  srv.outage = true; const ev = { preventDefault() { this.prevented = true; } }; A.fire('beforeunload', ev); assert.ok(ev.prevented);
  assert.equal(A.note('R-NAVYKY'), 'píšu a zavírám', 'poznámka uložená jako při opuštění pole'); assert.ok(A.queue().some(x => x.item === 'R-NAVYKY' && x.kind === 'note'));
  srv.outage = false; srv.calls = []; A.fire('pagehide'); assert.ok(srv.calls.some(c => /keepalive/.test(c)), 'odejde s keepalive');
});

test('SCHEMA 83 (vlastník 2. 11. 2026): poznámka po rozhodnutí se ukládá sama po 1 s bez psaní, bez opuštění pole; „Ukládá se…“ → „Uloženo … na serveru“; opuštění pole uloží hned bez dvojího řádku; změna rozhodnutí poznámku zachová; správce vidí úpravy jako jednu řádku', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'), Ad = srv.user('u-admin', 'admin@example.test', 'admin', 'pw'); const A = device({ session: srv.session(G) }); scene(A);
  await advance(3000);
  const ta = (id, v) => ({ target: { getAttribute: k => k === 'data-gnote' ? id : null, value: v } });
  const notes = () => A.D.garantLog().filter(d => d.item === 'R-NAVYKY' && d.kind === 'note');
  const srvNotes = () => srv.rows.filter(r => r.item === 'R-NAVYKY' && r.kind === 'note');
  A.act('garantDecide', 'R-NAVYKY:rejected'); await advance(3000);
  A.docFire('input', ta('R-NAVYKY', 'Proč')); assert.equal(A.D.savedLine('R-NAVYKY'), 'Ukládá se…', 'během psaní');
  await advance(600); A.docFire('input', ta('R-NAVYKY', 'Proč ne')); await advance(600); A.docFire('input', ta('R-NAVYKY', 'Proč ne: hodnota')); await advance(600);
  assert.equal(notes().length, 0, 'při psaní s pauzami pod 1 s se neukládá');
  await advance(500); assert.equal(notes().length, 1, 'po 1 s bez psaní uloženo, pole nikdo neopustil'); assert.equal(notes()[0].comment, 'Proč ne: hodnota'); assert.equal(notes()[0].status, 'rejected');
  assert.match(A.D.savedLine('R-NAVYKY'), /^Uloženo \d{1,2}:\d\d v tomto prohlížeči; čeká na odeslání na server\.$/, 'pravdivě: zatím jen v prohlížeči');
  await advance(3000); assert.equal(srvNotes().length, 1); assert.equal(srvNotes()[0].comment, 'Proč ne: hodnota'); assert.match(A.D.savedLine('R-NAVYKY'), /^Uloženo \d{1,2}:\d\d na serveru\.$/);
  /* další pauza = další řádek (tabulka jen pro přidávání) */
  A.docFire('input', ta('R-NAVYKY', 'Proč ne: hodnota 4,5')); await advance(1100); await advance(3000); assert.equal(srvNotes().length, 2);
  /* opuštění pole před pauzou uloží hned; časovač se zruší, takže druhý řádek nevznikne */
  A.docFire('input', ta('R-NAVYKY', 'Hodnota 4,5 je lepší')); A.docFire('focusout', ta('R-NAVYKY', 'Hodnota 4,5 je lepší')); assert.equal(notes().length, 3); await advance(1500); assert.equal(notes().length, 3, 'bez dvojího uložení');
  /* změna rozhodnutí zachová poznámku (poznámka čekající ve frontě se sloučí do rozhodnutí, M8) */
  A.act('garantDecide', 'R-NAVYKY:approved'); await advance(3000);
  const ds = srv.rows.filter(r => r.item === 'R-NAVYKY' && r.kind === 'decision'); assert.equal(ds.slice(-1)[0].status, 'approved'); assert.equal(ds.slice(-1)[0].comment, 'Hodnota 4,5 je lepší');
  assert.equal(A.D.garantNote('R-NAVYKY'), 'Hodnota 4,5 je lepší'); assert.equal(A.D.noteField('R-NAVYKY'), 'Hodnota 4,5 je lepší', 'pole se nevyprázdní');
  /* správce: po sobě jdoucí úpravy téže poznámky jako jedna řádka historie, data celá */
  const M = device({ session: srv.session(Ad) }); M.act('openResults'); await advance(200);
  assert.ok(M.D.results.rows().filter(r => r.item === 'R-NAVYKY' && r.kind === 'note').length >= 2, 'všechny řádky načtené');
  M.act('resultsTab', 'registr'); const ov = M.overlay(); assert.match(ov, /poznámka \(2 úpravy\) · „Proč ne: hodnota 4,5“/); assert.equal(/· poznámka · „Proč ne: hodnota“/.test(ov), false, 'mezikrok psaní není zvlášť');
  assert.equal(srv.outside.length, 0, 'nic mimo falešný server');
});

test('31/03 B6: smazání rozhodnutí v jedné kartě druhá karta nevrátí – značka resetu nahradí její deník (storage) a starší záznamy se nezapíšou ani bez události', async () => {
  makeServer(); const G = srv.user('u-g', 'garant@example.test', 'garant', 'pw'), Ad = srv.user('u-admin', 'admin@example.test', 'admin', 'pw');
  const store = new Map(); store.set('nutrifee-auth', srv.session(Ad)); /* „Smazat rozhodnutí garanta“ má jen správce */
  const A = device({ store }); scene(A); const B = device({ store }); scene(B);
  ['K-KRITERIA', 'C-CILE', 'R-NAVYKY'].forEach(id => A.act('garantDecide', id + ':approved')); await advance(3000);
  B.fire('storage', { key: 'nutrifee-garant' }); assert.equal(B.state('C-CILE'), 'approved', 'B převzala rozhodnutí z A');
  A.act('garantReset'); await advance(3000);
  assert.equal(A.D.garantLog().length, 0); assert.ok(JSON.parse(store.get('nutrifee-garant-reset')).at, 'značka resetu');
  /* B dostane událost storage se značkou → deník nahradí, scéna se přehraje */
  B.fire('storage', { key: 'nutrifee-garant-reset' }); B.fire('storage', { key: 'nutrifee-garant' });
  assert.equal(B.D.garantLog().length, 0); assert.equal(B.state('C-CILE'), 'pending', 'B zapomněla smazaná rozhodnutí');
  B.act('garantDecide', 'S-SILNA:approved'); await advance(3000);
  assert.deepEqual(JSON.parse(store.get('nutrifee-garant')).map(d => d.item), ['S-SILNA'], 'v úložišti jen nové rozhodnutí');
  /* karta C, která událost nedostala (otevřená před resetem): její rozhodnutí smazané záznamy do úložiště nevrátí */
  const C0 = new Map(store); const C = device({ store }); scene(C); /* C načte stav po resetu */
  A.act('garantDecide', 'K-KRITERIA:approved'); await advance(3000); A.act('garantReset'); await advance(3000);
  const stale = device({ store: (() => { const m = new Map(store); m.set('nutrifee-garant', C0.get('nutrifee-garant')); return m; })() });
  assert.equal(stale.D.garantLog().length, 0, 'deník starší než značka se při načtení neuplatní');
  /* B bez události: rozhodne, saveGlog starší záznamy z paměti nezapíše */
  B.act('garantDecide', 'I-HYPO:approved'); await advance(3000);
  const items = JSON.parse(store.get('nutrifee-garant')).map(d => d.item); assert.deepEqual(items, ['I-HYPO'], 'po druhém resetu jen nové: ' + items);
  const F = device({ store }); assert.equal(F.state('K-KRITERIA'), 'pending'); assert.equal(F.state('S-SILNA'), 'pending'); assert.equal(F.state('I-HYPO'), 'approved');
  /* server: platný stav po posledním resetu odpovídá deníku */
  const live = A.D.sync.afterReset(srv.rows.filter(r => r.user_id === 'u-admin'));
  assert.equal(A.D.resultsState(live, 'K-KRITERIA').status, null); assert.equal(A.D.resultsState(live, 'I-HYPO').status, 'approved');
});

(async () => {
  for (const [name, fn] of tests) {
    if (process.env.ONLY && !name.includes(process.env.ONLY)) continue;
    timers = []; NOW = Date.UTC(2026, 9, 30, 8, 0, 0);
    try { await fn(); console.log('OK  ', name); passed++; } catch (err) { console.error('FAIL', name, '—', String(err && err.message || err).split('\n')[0]); if (process.env.DEBUG) console.error(String(err && err.stack || err).slice(0, 1500)); failed++; fails.push(name); }
  }
  console.log('\nProšlo: ' + passed + ', selhalo: ' + failed + (fails.length ? '\nSelhaly: ' + fails.join(' | ') : ''));
  process.exit(failed ? 1 : 0);
})();
