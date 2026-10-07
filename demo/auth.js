/* Přihlášení k maketě (7. 10. 2026, prezentační vrstva). Supabase Auth, e-mail + heslo.
   Bez přihlášení se maketa nezobrazí — jen přihlašovací stránka. Role podle app_metadata.role účtu v Supabase:
   „admin“ = správce (vidí výsledky všech, demo/results.js), „garant“ = garant (rozhoduje a komentuje, vidí jen své zápisy).
   Účet bez jedné z těchto rolí k maketě přístup nemá (projekt Supabase může mít i jiné uživatele) — po přihlášení je hned odhlášen s vysvětlením.
   Hesla ověřuje server Supabase; v kódu není nic tajného (veřejný klíč + pravidla RLS). Jádro app/ o přihlášení neví.
   Přihlášení drží localStorage (nutrifee-auth); token se obnovuje sám, po neúspěchu se uživatel odhlásí. */
(function (global) {
'use strict';
var NF = global.NutriFee, D = global.NutriFeeDemo, e = NF.esc;
var AKEY = 'nutrifee-auth';
var form = { email: '', pass: '', error: '', info: '', busy: false, forceOffered: false };
function cfg() { return D.syncConfig || {}; }
function base() { return String(cfg().url || '').replace(/\/$/, '') + '/auth/v1/'; }
function readRaw() { try { var s = JSON.parse(global.localStorage && global.localStorage.getItem(AKEY) || 'null'); return s && s.access_token && s.user ? s : null; } catch (err) { return null; } }
function read() { var s = readRaw(); return s && allowed(s) ? s : null; }
function write(s) { try { if (s) global.localStorage.setItem(AKEY, JSON.stringify(s)); else global.localStorage.removeItem(AKEY); } catch (err) { } }
function role(s) { s = s || read(); if (!s) return null; var m = s.user && s.user.app_metadata, r = m && m.role; return r === 'admin' || r === 'garant' ? r : null; }
function allowed(s) { return !!role(s); }
function label(s) { return role(s) === 'admin' ? 'Správce' : 'Garant'; }
function headers(token) { var h = { 'Content-Type': 'application/json', 'apikey': cfg().key }; if (token) h['Authorization'] = 'Bearer ' + token; return h; }
function authPost(path, body, token) { return global.fetch(base() + path, { method: 'POST', mode: 'cors', headers: headers(token), body: JSON.stringify(body || {}) }); }
function fromResponse(j) {
  return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at ? j.expires_at * 1000 : Date.now() + (Number(j.expires_in) || 3600) * 1000,
    user: { id: j.user && j.user.id, email: j.user && j.user.email, app_metadata: (j.user && j.user.app_metadata) || {} } };
}
var refreshing = null;
/* Platný token; když vyprší do minuty (nebo force), obnoví se přes refresh_token. Při neúspěchu odhlásí. */
function ensure(force) {
  var s = read(); if (!s) return Promise.reject(new Error('nepřihlášen'));
  if (!force && s.expires_at - Date.now() > 60000) return Promise.resolve(s.access_token);
  if (refreshing) return refreshing;
  if (typeof global.fetch !== 'function') return Promise.reject(new Error('bez připojení'));
  refreshing = authPost('token?grant_type=refresh_token', { refresh_token: s.refresh_token })
    .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(function (j) { var n = fromResponse(j); write(n); refreshing = null; return n.access_token; })
    .catch(function (err) { refreshing = null; signOut('Přihlášení vypršelo, přihlaste se prosím znovu.'); throw err; });
  return refreshing;
}
/* Odhlášení: smaže přihlášení i místní deník garanta (jeho rozhodnutí jsou na serveru a po přihlášení se načtou zpět). */
function signOut(info) {
  write(null); form.pass = ''; form.error = ''; form.info = info || ''; form.forceOffered = false;
  if (D.garantClear) D.garantClear();
  NF.closeDrawer(); NF.render();
}
function friendly(m) {
  if (/invalid|credentials|grant/i.test(m)) return 'E-mail nebo heslo nesedí.';
  if (/not confirmed/i.test(m)) return 'Účet ještě není potvrzený. Ozvěte se autorovi makety.';
  if (/Failed to fetch|NetworkError|network|Load failed/i.test(m)) return 'Server není dostupný. Zkontrolujte připojení a zkuste to znovu.';
  return 'Přihlášení se nepovedlo: ' + m;
}
function login() {
  if (form.busy) return;
  var email = (form.email || '').trim(), pass = form.pass || '';
  if (!email || !pass) { form.error = 'Vyplňte e-mail i heslo.'; return; }
  if (!cfg().url || !cfg().key) { form.error = 'Úložiště není nastavené (demo/sync-config.js).'; return; }
  if (typeof global.fetch !== 'function') { form.error = 'Prohlížeč neumožňuje připojení k serveru.'; return; }
  form.busy = true; form.error = ''; form.info = '';
  authPost('token?grant_type=password', { email: email, password: pass })
    .then(function (res) { return res.json().then(function (j) { if (!res.ok) throw new Error(j.error_description || j.msg || j.error || ('HTTP ' + res.status)); return j; }); })
    .then(function (j) {
      var s = fromResponse(j); form.busy = false; form.pass = '';
      if (!allowed(s)) { /* účet existuje, ale nemá roli garant/admin → k maketě nepatří */
        if (typeof global.fetch === 'function') { try { authPost('logout', null, s.access_token).catch(function () { }); } catch (err) { } }
        form.error = 'Tento účet nemá k maketě přístup. Roli garanta nebo správce přiděluje autor makety.'; NF.render(); return;
      }
      write(s); form.email = '';
      var st = NF.getState(); st.toast = 'Přihlášení: ' + label(s) + (s.user.email ? ' · ' + s.user.email : '') + '.';
      NF.render();
      if (D.sync && D.sync.restore) D.sync.restore();
    })
    .catch(function (err) { form.busy = false; form.error = friendly(String(err && err.message || err)); NF.render(); });
}
/* ---------- přihlašovací stránka místo aplikace ---------- */
function gate() {
  var dis = form.busy ? ' disabled' : '';
  return '<div class="gate"><div class="gate-card card">' +
    '<div class="gate-brand"><span class="brandmark">N</span>NutriFee</div>' +
    '<span class="demo-flag">DEMO · syntetická data · není určeno pro léčbu</span>' +
    '<h1>Maketa ke schválení</h1>' +
    '<p class="muted">Přihlaste se e-mailem a heslem, které jste dostali od autora makety. Vaše rozhodnutí a komentáře k položkám registru se ukládají pod tímto přihlášením; nic jiného se neposílá. Jde o neformální rozhodnutí k maketě, ne o podpis pro ostrý provoz.</p>' +
    (form.info ? '<div class="error soft" role="status">' + e(form.info) + '</div>' : '') +
    '<label class="field"><span>E-mail</span><input id="auth-email" type="email" autocomplete="username" data-auth="email" value="' + e(form.email) + '"' + dis + '></label>' +
    '<label class="field"><span>Heslo</span><input id="auth-pass" type="password" autocomplete="current-password" data-auth="pass" value="' + e(form.pass) + '"' + dis + '></label>' +
    (form.error ? '<div class="error" role="alert">' + e(form.error) + '</div>' : '') +
    '<div class="actions">' + NF.screens.btn(form.busy ? 'Přihlašuji…' : 'Přihlásit', 'authLogin', null, 'primary', dis) + '</div>' +
    '<p class="small muted">Nemáte přihlašovací údaje? Napište autorovi makety.</p>' +
    '</div></div>';
}
var coreRender = NF.render;
NF.render = function () {
  if (read()) { coreRender(); return; }
  var doc = global.document, root = doc && doc.getElementById('app'); if (!root) return;
  root.innerHTML = gate();
  var ov = doc.getElementById('overlay'); if (ov) ov.innerHTML = '';
  try { var f = root.querySelector && root.querySelector(form.email ? '#auth-pass' : '#auth-email'); if (f && f.focus && doc.activeElement !== f) f.focus(); } catch (err) { }
};
if (global.document && global.document.addEventListener) {
  global.document.addEventListener('input', function (ev) { var t = ev.target; if (t && t.dataset && t.dataset.auth) form[t.dataset.auth] = t.value; });
  global.document.addEventListener('keydown', function (ev) { var t = ev.target; if (ev.key === 'Enter' && t && t.dataset && t.dataset.auth) { ev.preventDefault(); login(); NF.render(); } });
}
NF.demoActions = NF.demoActions || {};
NF.demoActions.authLogin = function () { login(); };
NF.demoActions.authLogout = function () {
  var s = readRaw(); if (!s) return;
  var pend = D.sync && D.sync.pending ? D.sync.pending() : 0;
  if (pend) {
    if (D.sync.retry) D.sync.retry(); form.forceOffered = true;
    NF.getState().error = 'Ještě se ukládá ' + pend + ' rozhodnutí. Počkejte chvíli a zkuste odhlásit znovu; tlačítkem „Odhlásit a zahodit neuložené“ o ně přijdete.';
    return;
  }
  if (typeof global.fetch === 'function') { try { authPost('logout', null, s.access_token).catch(function () { }); } catch (err) { } }
  signOut('Jste odhlášeni.');
};
NF.demoActions.authLogoutForce = function () { if (D.sync && D.sync.clear) D.sync.clear(); NF.demoActions.authLogout(); };
D.auth = { session: read, role: function () { return role(); }, label: function () { return label(); }, ensure: ensure, forceOffered: function () { return form.forceOffered; }, form: function () { return form; } };
})(typeof window !== 'undefined' ? window : globalThis);
