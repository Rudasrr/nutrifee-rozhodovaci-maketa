/* Prezentační vrstva: lišta, role, rámeček telefonu, panel vyprávění a průchod tlačítkem Další (vpřed i zpět),
   lineární řada scén včetně odboček, blok „K potvrzení“ pro lékaře-garanta, panel prezentujícího.
   Jádro o ní nic neví — kroky volají tytéž akce, které by spustil člověk. Rozhodnutí garanta přežívají skoky mezi scénami. */
(function (global) {
'use strict';
var NF = global.NutriFee, e = NF.esc;
var D = global.NutriFeeDemo, T = D.tour;
var doc = global.document;
var btn = function (l, a, v, c, x) { return NF.screens.btn(l, a, v, c, x); };

NF.demoActions = NF.demoActions || {};
function S() { return NF.getState(); }
function chapter(s) { return D.chapters[s.chapterIndex || 0]; }
function branches() { return S().branches || D.defaults; }
function steps() { return T.stepsFor(chapter(S()).id, branches()); }
function val(v) { return typeof v === 'function' ? v(branches(), S()) : v; }
function sceneIdx(s) { return s.sceneIndex != null ? s.sceneIndex : D.sceneFor(s.chapterIndex || 0, s.branches); }
function lastIndex() { return D.scenes.length - 1; }
function sceneTitle(s) { var sc = D.scenes[sceneIdx(s)]; return (sc && sc.title) || chapter(s).title; }

/* ---------- rozhodnutí garanta: přežijí přehrání scény ---------- */
var GKEY = 'nutrifee-garant', glog = [];
try { glog = JSON.parse(global.localStorage && global.localStorage.getItem(GKEY) || '[]') || []; } catch (err) { glog = []; }
function saveGlog() { try { global.localStorage && global.localStorage.setItem(GKEY, JSON.stringify(glog)); } catch (err) { } }
/* Rozhodnutí garanta se uplatní hned po základních kulisách, dřív než kapitoly spočítají report a návrhy (6. 10. 2026). */
function applyGarant(n) { glog.forEach(function (d) { NF.applyDecision(n, d, true); }); return n; }
D.beforePlay = applyGarant;
/* Každé nové rozhodnutí i komentář — z panelu vyprávění i přímo z registru — jde do deníku garanta; přehrání scény (quiet) háček nevolá (oprava 7. 10. 2026: dřív se rozhodnutí z registru po skoku na scénu ztrácela). */
NF.onDecision(function (S0, d) { glog.push(d); saveGlog(); });
/* Zápisy ze serveru po přihlášení (demo/sync.js restore): přidá jen ty, které tu podle sid nejsou, seřadí podle skutečného času a přehraje scénu. */
D.garantMerge = function (list) {
  var have = {}; glog.forEach(function (d) { if (d.sid) have[d.sid] = 1; });
  var add = (list || []).filter(function (d) { return d && d.sid && !have[d.sid] && NF.item(S(), d.item); });
  if (!add.length) return 0;
  glog = glog.concat(add).sort(function (a, b) { var x = String(a.rt || ''), y = String(b.rt || ''); return x < y ? -1 : x > y ? 1 : 0; });
  saveGlog(); land(D.playScene(sceneIdx(S()))); S().toast = 'Načteno ' + add.length + ' dřívějších zápisů z vašeho přihlášení.'; NF.render(); return add.length;
};
/* Odhlášení: deník garanta zmizí z tohoto prohlížeče (na serveru zůstává) a příběh začne od začátku. */
D.garantClear = function () { glog = []; saveGlog(); if (D.progressClear) D.progressClear(); land(D.playScene(0)); };
function land(n) { runId++; busy = false; var s = S(); n.notes = s.notes || ''; n.tourRole = n.role; n.tourPage = n.page; focusSel = null; watchSel = null; running = null; NF.migrated = null; NF.setState(n); try { global.scrollTo(0, 0); } catch (err) { } try { if (n.sceneIndex != null) noteProgress(n.sceneIndex); } catch (err2) { } }
/* Kde v příběhu právě jsme vs. kam uživatel sám odešel (registr, jiná záložka). */
function markTour() { var s = S(); s.tourRole = s.role; s.tourPage = s.page; }
function away(s) { return !!(s.tourRole && (s.role !== s.tourRole || s.page !== s.tourPage)); }
NF.demoActions.tourReturn = function () { var s = S(); if (s.tourRole) { s.role = s.tourRole; s.page = s.tourPage; } s.error = ''; NF.closeDrawer(); };

/* ---------- rozhodovací kroky garanta (7. 10. 2026) ----------
   Každá scéna hlavní linie končí krokem „Co jste viděli a co schvalujete“ s položkami registru, které se v ní poprvé použily.
   Automaticky z demo/scene-items.js (štítky na obrazovce); položky bez štítku, nebo ty, které patří jinam, mapuje D.itemScene. Zbytek jde do finále. */
D.itemScene = { 'R-NAVYKY': 'doses', 'R-POKYNY': 'doses', 'C-CILE': 'doses', 'Z-BODY': 'training', 'R-DIKY': 'firstMeal', 'S-TYDEN': 'lateMeal', 'J-DATABAZE': 'custom', 'J-STITKY': 'custom', 'R-PODOBNOST': 'custom', 'P-NEMOC': 'illness', 'R-ZMIZELA': 'impact', 'D-BAZAL': 'reviewProposals', 'P-LEKAR': 'issue' };
var decisionPlanCache = null;
function mainSceneOf(chId) { for (var i = 0; i < D.scenes.length; i++) if (!D.scenes[i].appendix && D.chapters[D.scenes[i].ch].id === chId) return i; return -1; }
function decisionPlan() {
  var ids = S().registry.items.map(function (r) { return r.id; }), offered = {}, plan = D.scenes.map(function () { return []; });
  if (decisionPlanCache && decisionPlanCache.n === ids.length) return decisionPlanCache.plan;
  if (!ids.length) return plan; /* před načtením registru (první vykreslení) se nic neukládá */
  ids.forEach(function (id) { var ch = D.itemScene[id]; if (!ch) return; var i = mainSceneOf(ch); if (i >= 0) { plan[i].push(id); offered[id] = 1; } });
  (D.sceneItems || []).forEach(function (sc, i) { if (!D.scenes[i] || D.scenes[i].appendix) return; (sc.items || []).forEach(function (id) { if (!offered[id] && ids.indexOf(id) >= 0) { plan[i].push(id); offered[id] = 1; } }); });
  var fin = mainSceneOf('trace'); if (fin >= 0) ids.forEach(function (id) { if (!offered[id]) plan[fin].push(id); });
  decisionPlanCache = { n: ids.length, plan: plan }; return plan;
}
D.decisionItems = function (idx) { return (decisionPlan()[idx] || []).slice(); };
D.resetDecisionPlan = function () { decisionPlanCache = null; };
NF.demoActions.garantDecide = function (v) {
  var i = String(v).indexOf(':'), id = v.slice(0, i), status = v.slice(i + 1), s = S();
  var comment = (s.form && s.form['gc_' + id]) || '';
  var r = NF.decideItem(s, id, status, comment, null, { garant: true }); if (!r.ok) { s.error = r.error; return; }
  if (s.form) s.form['gc_' + id] = '';
  s.toast = status === 'rejected' ? 'Zamítnuto. Příběh pokračuje; na místě položky uvidíte, že tahle část nefunguje.' : status === 'edited' ? 'Úprava uložena a hned platí.' : 'Schváleno a zapsáno do historie.';
};
NF.demoActions.garantComment = function (id) {
  var s = S(), r = NF.item(s, id), comment = (s.form && s.form['gc_' + id]) || '';
  if (!r || !comment.trim()) { s.error = 'Napište komentář.'; return; }
  var res = NF.decideItem(s, id, r.status, comment, null, { garant: true, comment: true }); if (!res.ok) { s.error = res.error; return; }
  s.form['gc_' + id] = ''; s.toast = 'Komentář je v historii položky. Stav položky se nemění.';
};
NF.demoActions.garantReset = function () { glog = []; saveGlog(); land(D.playScene(sceneIdx(S()))); S().toast = 'Rozhodnutí garanta byla smazána; položky jsou zase ke schválení.'; };
D.garantLog = function () { return glog.slice(); };

/* ---------- lišta ---------- */
NF.registerSlot('banner', function (s) {
  var ch = chapter(s), a = D.acts[ch.act], i = sceneIdx(s), sum = NF.registrySummary(s);
  var roles = [['patient', 'Pacient'], ['doctor', 'Lékař'], ['nurse', 'Sestra']];
  return '<div class="pres-bar"><span class="flag">DEMO · syntetická data · není určeno pro léčbu</span>' +
    '<span class="where">' + e(a.title) + ' · scéna ' + (i + 1) + ' z ' + D.scenes.length + ': <b>' + e(sceneTitle(s)) + '</b> · ' + e(NF.fmtShort(s.clock)) + ' ' + e(NF.fmtTime(s.clock)) + '</span>' +
    '<span class="roles">' + roles.map(function (r) { return '<button type="button" class="' + (s.role === r[0] ? 'on' : '') + '" data-action="role" data-value="' + r[0] + '">' + r[1] + '</button>'; }).join('') + '</span>' +
    btn('← Zpět', 'tourBack', null, '', (i === 0 && !(s.tourStep || 0) ? ' disabled' : '') + ' aria-label="Krok zpět"') +
    btn('Další ▶', 'tourNext', null, 'primary') +
    (i < lastIndex() ? btn('Přeskočit scénu ⏭', 'storyStep', '1') : '') +
    btn(sum.remaining ? 'Ke schválení · zbývá ' + sum.remaining : 'Vše rozhodnuto', 'openAside', 'registry', sum.remaining ? '' : 'ok') + (NF.slots.syncBadge ? NF.slots.syncBadge(s) : '') +
    (D.auth && D.auth.role() === 'admin' ? btn('Výsledky garanta', 'openResults') : '') +
    btn('Panel prezentujícího', 'openPresenter') + btn('Vrátit na začátek', 'resetDemo') +
    (D.auth && D.auth.session() ? btn('Odhlásit · ' + D.auth.label(), 'authLogout') + (D.auth.forceOffered() && D.sync && D.sync.pending() ? btn('Odhlásit a zahodit neuložené (' + D.sync.pending() + ')', 'authLogoutForce', null, 'danger') : '') : '') +
    '</div>' + panel(s);
});

/* ---------- průchod tlačítkem Další ---------- */
var busy = false, running = null, runId = 0, focusSel = null, watchSel = null, pressSel = null;
function animated() { return !!(doc && typeof doc.querySelector === 'function' && global.requestAnimationFrame); }
function reduced() { try { return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (err) { return false; } }
function wait(ms, fn) { global.setTimeout(fn, reduced() ? Math.min(ms, 120) : ms); }
function find(sel) { try { return sel ? doc.querySelector(val(sel)) : null; } catch (err) { return null; } }
function reveal(el) {
  if (!el) return;
  for (var p = el.parentNode; p && p !== doc; p = p.parentNode) if (p.tagName === 'DETAILS') p.open = true;
  try { el.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); } catch (err) { }
}
function perform(op) {
  var s = S(), ch = chapter(s);
  if (ch && ch.role && s.role !== ch.role) { s.role = ch.role; } /* krok vyprávění jedná vždy za roli kapitoly */
  NF.muteHooks(function () { /* kroky příběhu nejsou rozhodnutí garanta: neukládají se na server ani do jeho deníku */
    if (op.fn) { op.fn(s); NF.save(s); NF.render(); return; }
    if (op.bind) { NF.bindValue(op.bind, val(op.val)); NF.render(); return; }
    if (op.act) NF.act(op.act, val(op.val));
  });
  var s2 = S(), rej = s2.error ? sceneRejected(s2) : [];
  if (rej.length) { /* krok míří na část, kterou garant zamítl: není to chyba ukázky, jen se přeskočí */
    s2.error = ''; s2.toast = 'Krok přeskočen: závisí na zamítnuté položce (' + rej.map(function (id) { var r = NF.item(s2, id); return r ? r.title : id; }).join(', ') + '). Příběh pokračuje.';
  }
}
/* Každý krok animace ověří, že běh stále platí (skok na scénu ho zruší); chyba krok ukončí a odemkne tlačítka (P1, 6. 10. 2026). */
function runAnimated(step, done) {
  var ops = (step.do || []).slice(), my = ++runId;
  function alive() { return my === runId; }
  function safe(fn) { try { fn(); return true; } catch (err) { var s = S(); s.error = 'Krok ukázky selhal a byl přeskočen: ' + err.message; NF.save(s); done(true); return false; } }
  (function next() {
    if (!alive()) return;
    if (!ops.length) { done(); return; }
    var op = ops.shift();
    focusSel = op.sel ? val(op.sel) : null; pressSel = null; decorate();
    var el = find(op.sel); reveal(el);
    if (!op.act && !op.bind && !op.fn) { wait(600, next); return; }
    wait(650, function () {
      if (!alive()) return;
      if (op.bind && op.type && el && 'value' in el) {
        var text = String(val(op.val)), i = 0; el.value = '';
        (function typeOne() {
          if (!alive()) return;
          if (i < text.length) { el.value += text.charAt(i++); if (op.live) NF.bindValue(op.bind, el.value); wait(90, typeOne); return; }
          if (safe(function () { perform(op); })) wait(350, next);
        })();
        return;
      }
      pressSel = focusSel; decorate();
      wait(240, function () { if (!alive()) return; pressSel = null; if (safe(function () { perform(op); })) wait(op.quick ? 320 : 600, next); });
    });
  })();
}
NF.demoActions.tourNext = function () {
  if (busy) return;
  if (away(S())) { NF.demoActions.tourReturn(); return; } /* mimo příběh: Další nejdřív vrátí do scény */
  var st = steps(), s = S(), i = s.tourStep || 0;
  if (i >= st.length) {
    var idx = sceneIdx(s);
    if (idx >= lastIndex()) return;
    land(D.playScene(idx + 1));
    return;
  }
  var step = st[i]; running = i;
  if (!animated()) {
    try { (step.do || []).forEach(perform); } catch (err) { S().error = 'Krok ukázky selhal a byl přeskočen: ' + err.message; }
    S().tourStep = i + 1; running = null; watchSel = step.watch || null; markTour(); NF.save(S()); NF.render(); return;
  }
  busy = true; NF.render();
  runAnimated(step, function (failed) {
    S().tourStep = i + 1; /* i selhaný krok se přeskočí, hláška zůstane; prezentace se nezasekne */
    markTour(); NF.save(S()); busy = false; running = null; focusSel = null;
    watchSel = failed ? null : (step.watch || null); NF.render();
    var w = find(watchSel); if (w) reveal(w);
  });
};
/* Krok zpět: scéna se přehraje znovu a provedou se všechny kroky kromě posledního. Na začátku scény = předchozí scéna. */
NF.demoActions.tourBack = function () {
  if (busy) return;
  if (away(S())) { NF.demoActions.tourReturn(); return; }
  var s = S(), i = s.tourStep || 0, idx = sceneIdx(s);
  if (i === 0) { if (idx > 0) land(D.playScene(idx - 1)); return; }
  land(D.playScene(idx));
  var st = steps();
  try { for (var k = 0; k < i - 1; k++) (st[k].do || []).forEach(perform); } catch (err) { S().error = 'Krok ukázky selhal: ' + err.message; }
  S().tourStep = i - 1; watchSel = i - 1 > 0 ? (st[i - 2].watch || null) : null; markTour(); NF.save(S()); NF.render();
};
NF.demoActions.tourRestart = function () { if (busy) return; land(D.playScene(sceneIdx(S()))); };
var hidden = false;
try { hidden = global.localStorage && global.localStorage.getItem('nutrifee-vypraveni') === '0'; } catch (err) { }
NF.demoActions.tourToggle = function () { hidden = !hidden; try { global.localStorage && global.localStorage.setItem('nutrifee-vypraveni', hidden ? '0' : '1'); } catch (err) { } };

function rows(x) {
  return [['Co se děje', x.co], ['Čeho si všímat', x.vsimni], ['Proč', x.proc], ['Co z toho plyne', x.dusledek]].filter(function (r) { return r[1]; })
    .map(function (r) { return '<div><dt>' + e(r[0]) + '</dt><dd>' + r[1] + '</dd></div>'; }).join('');
}
/* Položky registru, které jsou právě na obrazovce (štítky „✓ …“). Garant je může potvrdit, zamítnout nebo okomentovat přímo odtud. */
function itemsOnScreen(s) {
  var html = '';
  try { html = s.role === 'doctor' ? NF.screens.doctor(s) : s.role === 'nurse' ? NF.screens.nurse(s) : NF.screens.patient(s); } catch (err) { return []; }
  var ids = [], re = /data-action="openItem" data-value="([^"]+)"/g, m;
  while ((m = re.exec(html))) if (ids.indexOf(m[1]) < 0) ids.push(m[1]);
  return ids.map(function (id) { return NF.item(s, id); }).filter(Boolean);
}
D.itemsOnScreen = function (s) { return itemsOnScreen(s).map(function (r) { return r.id; }); };
/* ---------- zamítnutá položka: „tahle část nefunguje“ na místě, kde působí (7. 10. 2026 večer) ----------
   Jádro vloží oznámení přes NF.slots.offNotice tam, kde zamítnutá položka chybí; v jednom vykreslení se stejná položka hlásí jen jednou. */
function offHtml(s, id, compact) {
  var r = NF.item(s, id); if (!r) return '';
  var g = (D.guide && D.guide[id]) || r.guide || {};
  return '<div class="off-notice' + (compact ? ' compact' : '') + '" role="status" data-off="' + e(id) + '"><span class="x" aria-hidden="true">✕</span><div><b>Tahle část nefunguje.</b> Položku „' + e(r.title) + '“ (' + e(id) + ') jste v registru zamítli. ' + (g.dopad ? e(g.dopad) + ' ' : '') +
    '<button type="button" class="btn sm" data-action="openAsideItem" data-value="' + e(id) + '">Změnit rozhodnutí</button></div></div>';
}
var offSeen = {}, offSeq = -1;
NF.slots.offNotice = function (s, id) {
  if (NF.renderSeq !== offSeq) { offSeq = NF.renderSeq; offSeen = {}; }
  if (offSeen[id]) return '<span class="off-mark" data-off="' + e(id) + '"></span>';
  offSeen[id] = 1; return offHtml(s, id, false);
};
/* Totéž na úrovni scény (panel vyprávění): zamítnuté položky, které v této scéně působí — i ty bez vlastního místa na obrazovce. */
function sceneOff(s, ids) {
  var rej = (ids || []).filter(function (id) { var r = NF.item(s, id); return r && r.status === 'rejected'; });
  return rej.length ? '<div class="off-scene"><p class="small"><b>V této scéně nefunguje</b> (zamítnuto v registru):</p>' + rej.map(function (id) { return offHtml(s, id, true); }).join('') + '</div>' : '';
}
function sceneRejected(s) { return D.decisionItems(sceneIdx(s)).filter(function (id) { var r = NF.item(s, id); return r && r.status === 'rejected'; }); }
function itemStatus(s, r) {
  var touched = NF.itemTouched(s, r.id);
  return r.status === 'rejected' ? ['zamítnuto', 'bad'] : r.status === 'edited' ? ['schváleno s úpravou', 'warn'] : touched ? ['schváleno', 'ok'] : NF.itemCommented(s, r.id) ? ['okomentováno · ke schválení', ''] : ['ke schválení', ''];
}
/* Jedna položka v rozhodovacím kroku: celý pětidílný průvodce + rozhodnutí. */
function gitem(s, r, isOpen) {
  var st = itemStatus(s, r), editable = (r.params && Object.keys(r.params).length) || r.postup || r.text || r.texts;
  return '<div class="gitem"><button type="button" class="gh" data-action="garantOpen" data-value="' + e(r.id) + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '"><span class="t">' + e(r.title) + '</span>' + NF.screens.tag(st[0], st[1]) + '<span class="chev">' + (isOpen ? '⌃' : '⌄') + '</span></button>' +
    (isOpen ? '<div class="gb">' + NF.screens.itemGuide(s, r) +
      '<label class="field"><span>Komentář (nepovinný)</span><input data-bind="form.gc_' + e(r.id) + '" value="' + e((s.form && s.form['gc_' + r.id]) || '') + '" placeholder="co změnit, proč, nebo jen poznámka"></label>' +
      '<div class="actions" style="margin-top:8px">' + btn('Schválit', 'garantDecide', r.id + ':approved', 'sm primary') + (editable ? btn('Upravit v registru', 'openAsideItem', r.id, 'sm') : '') + btn('Zamítnout', 'garantDecide', r.id + ':rejected', 'sm danger') + btn('Jen komentář', 'garantComment', r.id, 'sm quiet') + '</div></div>' : '') + '</div>';
}
/* Schvalování přímo v kroku (8. 10. 2026): položky scény, které právě působí na obrazovce, se nabídnou hned s celým průvodcem;
   na posledním kroku scény i zbývající nerozhodnuté položky scény. Rozhodnutí nikdy nebrání pokračování. */
function approvalsBlock(s, idx, i, st) {
  var ids = D.decisionItems(idx); if (!ids.length) return '';
  var onScreen = D.itemsOnScreen(s), lastStep = i >= st.length;
  var now = ids.filter(function (id) { return onScreen.indexOf(id) >= 0; });
  var rest = lastStep ? ids.filter(function (id) { return now.indexOf(id) < 0; }) : [];
  var list = now.concat(rest), items = list.map(function (id) { return NF.item(s, id); }).filter(Boolean);
  if (!items.length) return '';
  var firstOpen = items.filter(function (r) { return !NF.itemTouched(s, r.id); })[0];
  var open = s.gOpen && list.indexOf(s.gOpen) >= 0 ? s.gOpen : (firstOpen ? firstOpen.id : null);
  var undecided = items.filter(function (r) { return !NF.itemTouched(s, r.id); }).length;
  return '<div class="garant decide">' + sceneOff(s, list) + '<p class="small"><b>' + (now.length ? 'Ke schválení teď' : 'Z této scény ještě ke schválení') + (undecided ? ' (' + undecided + ')' : '') + '</b> · ' +
    (undecided ? (now.length ? 'položky, které právě působí na obrazovce vlevo. ' : '') + 'U každé: proč existuje, jak funguje, kde ji uvidíte, co schvalujete a co se stane při zamítnutí. Rozhodnutí nebrání pokračování; rozhodnout i změnit můžete kdykoli, i v souhrnu na konci.' : 'vše rozhodnuto; změnit lze kdykoli.') + '</p>' +
    items.map(function (r) { return gitem(s, r, open === r.id); }).join('') + '</div>';
}
/* Úvod scény: co se v ní bude schvalovat. */
function sceneIntroHint(s, ids) {
  if (!ids.length) return '';
  var titles = ids.map(function (id) { var r = NF.item(s, id); return r ? r.title : id; });
  return sceneOff(s, ids) + '<p class="tour-next">V této scéně schvalujete: ' + e(titles.join(' · ')) + '.</p>';
}
/* ---------- průchod a souhrn (8. 10. 2026) ----------
   Kam se garant dostal (nejvyšší scéna) a zda potvrdil závěrečný souhrn; obojí se ukládá i na server (správce to vidí ve Výsledcích). */
var PKEY = 'nutrifee-progress', prog = { max: 0, done: null, doneAt: null };
try { prog = JSON.parse(global.localStorage && global.localStorage.getItem(PKEY) || 'null') || prog; } catch (err) { }
function saveProg() { try { global.localStorage && global.localStorage.setItem(PKEY, JSON.stringify(prog)); } catch (err) { } }
function noteProgress(idx) {
  if (idx <= (prog.max || 0) && prog.max !== 0) return;
  if (idx === 0 && prog.max === 0 && prog.seen) return;
  prog.max = Math.max(prog.max || 0, idx); prog.seen = true; saveProg();
  var sc = D.scenes[idx];
  if (D.sync && D.sync.event) D.sync.event('progress', 'PRUBEH', 'Průchod maketou', { scene: idx + 1, total: D.scenes.length, mainEnd: mainSceneOf('trace') + 1, title: sc ? (sc.title || D.chapters[sc.ch].title) : '', summaryConfirmed: !!prog.done });
}
D.progress = function () { return { max: prog.max || 0, done: prog.done || null, total: D.scenes.length, mainEnd: mainSceneOf('trace') + 1 }; };
D.progressClear = function () { prog = { max: 0, done: null, doneAt: null }; saveProg(); };
function summaryBlock(s) {
  var items = s.registry.items, sum = NF.registrySummary(s);
  var open = s.gOpen && items.some(function (r) { return r.id === s.gOpen; }) ? s.gOpen : null;
  var changedSince = prog.done && s.registry.history.some(function (h) { return h.kind !== 'comment' && h.rt && h.rt > prog.done; });
  var byCat = {}; items.forEach(function (r) { (byCat[r.cat] = byCat[r.cat] || []).push(r); });
  return '<div class="garant decide summary"><p class="small"><b>Souhrn vašich rozhodnutí</b> · schváleno ' + sum.approved + ' · s úpravou ' + sum.edited + ' · zamítnuto ' + sum.rejected + ' · ke schválení ' + sum.remaining + ' z ' + sum.total + '. Zkontrolujte, případně změňte (rozbalením položky) a potvrďte. Vše je průběžně uložené; potvrzení souhrnu říká správci, že jste maketu prošli celou.</p>' +
    (sum.remaining ? '<p class="small muted">Položky „ke schválení“ můžete nechat tak — i to je informace pro autora makety.</p>' : '') +
    Object.keys(byCat).map(function (c) { return '<p class="small" style="margin:10px 0 2px"><b>' + e(NF.catLabel(c)) + '</b></p>' + byCat[c].map(function (r) { return gitem(s, r, open === r.id); }).join(''); }).join('') +
    '<div class="actions" style="margin-top:12px">' + btn(prog.done ? 'Potvrdit souhrn znovu' : 'Potvrdit souhrn', 'garantConfirmSummary', null, 'primary') + '</div>' +
    (prog.done ? '<p class="small ' + (changedSince ? '' : 'muted') + '">Souhrn potvrzen ' + e(prog.doneAt || '') + (changedSince ? ' — od té doby jste rozhodnutí změnili, potvrďte znovu.' : '.') + '</p>' : '') + '</div>';
}
NF.demoActions.garantConfirmSummary = function () {
  var s = S(), sum = NF.registrySummary(s), now = new Date();
  prog.done = now.toISOString(); prog.doneAt = NF.fmtShort(prog.done) + ' ' + NF.fmtTime(prog.done); prog.max = Math.max(prog.max || 0, sceneIdx(s)); saveProg();
  var rej = s.registry.items.filter(function (r) { return r.status === 'rejected'; }).map(function (r) { return r.id; });
  var pend = s.registry.items.filter(function (r) { return !NF.itemTouched(s, r.id); }).map(function (r) { return r.id; });
  if (D.sync && D.sync.event) D.sync.event('summary', 'SOUHRN', 'Souhrn rozhodnutí potvrzen', { approved: sum.confirmed, edited: sum.edited, rejected: sum.rejected, pending: sum.remaining, total: sum.total, rejectedIds: rej, pendingIds: pend, scene: sceneIdx(s) + 1, total_scenes: D.scenes.length });
  s.toast = 'Souhrn potvrzen a uložen. Rozhodnutí můžete i tak dál měnit.';
};
/* Přehled dějství na jeho první scéně: co uvidíte a co budete schvalovat. */
function actOverview(s, idx) {
  var sc = D.scenes[idx]; if (!sc || sc.appendix) return '';
  var act = D.chapters[sc.ch].act, first = -1;
  for (var i = 0; i < D.scenes.length; i++) if (!D.scenes[i].appendix && D.chapters[D.scenes[i].ch].act === act) { first = i; break; }
  if (first !== idx) return '';
  var list = D.scenes.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return !o.x.appendix && D.chapters[o.x.ch].act === act; });
  return '<details class="more tour-act"><summary>V tomto dějství (' + list.length + ' ' + (list.length === 1 ? 'scéna' : list.length < 5 ? 'scény' : 'scén') + ')</summary><ol class="small">' + list.map(function (o) {
    var ids = D.decisionItems(o.i); return '<li>' + e(o.x.title || D.chapters[o.x.ch].title) + (ids.length ? ' <span class="muted">· schvalujete: ' + e(ids.map(function (id) { var r = NF.item(s, id); return r ? r.title : id; }).join(', ')) + '</span>' : '') + '</li>';
  }).join('') + '</ol></details>';
}
/* Co je právě vlevo na obrazovce — panel to říká vždy, aby vyprávění nikdy nebylo „pozadu“ (8. 10. 2026). */
var PAGE_NOM = { registry: 'Schvalovací registr', trace: 'Verze a stopa', review: 'Kontrola', enroll: 'Zařazení a plán', training: 'Zaučení', today: 'Dnes', foods: 'Jídla', plan: 'Plán', safety: 'Bezpečí', preview: 'Přehled před kontrolou', meal: 'Zápis jídla', understand: 'Převzetí plánu', takeover: 'Převzetí plánu', newplan: 'Nový plán' };
function whereNow(s) {
  var role = { patient: 'Pacient', doctor: 'Lékař', nurse: 'Sestra' }[s.role] || s.role, page = PAGE_NOM[s.page] || s.page, sub = '';
  if (s.page === 'enroll') sub = ', krok ' + ((s.wizardStep || 0) + 1) + ' ze 3';
  else if (s.page === 'review' && s.review && s.review.step) sub = ', krok ' + s.review.step + ' ze 4';
  else if (s.page === 'meal' && s.meal && s.meal.step) sub = ', krok ' + s.meal.step + ' ze 3';
  return 'Na obrazovce: ' + role + ' · ' + page + sub;
}
function pageName(s) {
  var map = { registry: 'schvalovací registr', trace: 'verzi a stopu', review: 'kontrolu', enroll: 'zařazení a plán', training: 'zaučení', today: 'obrazovku Dnes', foods: 'jídla', plan: 'plán', safety: 'Bezpečí', preview: 'přehled před kontrolou', meal: 'zápis jídla' };
  return map[s.page] || ('obrazovku „' + s.page + '“');
}
function panel(s) {
  var ch = chapter(s), st = steps(), i = s.tourStep || 0;
  var idx = sceneIdx(s), sc = D.scenes[idx];
  if (away(s)) {
    if (hidden) return '<div class="tour-panel tour-min">' + btn('Zobrazit vyprávění', 'tourToggle') + btn('Zpět do příběhu ▶', 'tourReturn', null, 'primary') + '</div>';
    return '<aside class="tour-panel tour-away" aria-live="polite" aria-label="Vyprávění k ukázce"><p class="tour-kicker">Mimo příběh</p><h2>Prohlížíte ' + e(pageName(s)) + ' mimo příběh</h2>' +
      '<p class="small">Scéna ' + (idx + 1) + ' z ' + D.scenes.length + ' „' + e(sceneTitle(s)) + '“ na vás počká. Rozhodnutí, která tu uděláte, platí i v příběhu.</p>' +
      '<div class="tour-actions">' + btn('Zpět do příběhu ▶', 'tourReturn', null, 'primary') + btn('Skrýt', 'tourToggle') + '</div></aside>';
  }
  var intro = (T.chapters[ch.id] || {}).intro || { t: ch.title, co: '' };
  var shown = running != null ? st[running] : (i > 0 ? st[i - 1] : intro);
  var last = idx >= lastIndex() && i >= st.length;
  var upcoming = i >= st.length && !last ? D.scenes[idx + 1] : null;
  var toAppendix = upcoming && upcoming.appendix && !(sc && sc.appendix);
  var nextStep = i < st.length ? st[i] : null, ids = D.decisionItems(idx), undecided = ids.filter(function (id) { return !NF.itemTouched(s, id); }).length;
  var finale = sc && !sc.appendix && ch.id === 'trace' && i >= st.length;
  var label = busy ? 'Probíhá…' : nextStep ? (i === 0 ? 'Začít ▶' : 'Pokračovat ▶') : last ? 'Konec ukázky' : toAppendix ? 'Dodatek: varianty ▶' : 'Další scéna ▶';
  if (hidden) return '<div class="tour-panel tour-min">' + btn('Zobrazit vyprávění', 'tourToggle') + btn('←', 'tourBack', null, '', busy ? ' disabled' : '') + btn(e(label), 'tourNext', null, 'primary', busy || last ? ' disabled' : '') + '</div>';
  var body = '<dl class="tour-rows">' + rows(shown) + '</dl>' + (i === 0 ? actOverview(s, idx) + sceneIntroHint(s, ids) : '') + (finale ? summaryBlock(s) : approvalsBlock(s, idx, i, st));
  return '<aside class="tour-panel' + (finale ? ' tour-decide' : '') + '" aria-live="polite" aria-label="Vyprávění k ukázce"><p class="tour-kicker">' + (sc && sc.appendix ? 'Dodatek · ' : sc && sc.detour ? 'Odbočka · ' : '') + 'Scéna ' + (idx + 1) + ' z ' + D.scenes.length + ' · ' + (finale ? 'souhrn rozhodnutí' : running != null ? 'krok ' + (running + 1) + ' z ' + st.length : i === 0 ? 'úvod' : 'krok ' + i + ' z ' + st.length) + '</p>' +
    '<p class="tour-where">' + e(whereNow(s)) + '</p><h2>' + e(shown.t || sceneTitle(s)) + '</h2>' + body +
    '<p class="tour-hint">Ovládejte ukázku jen tlačítky v tomto panelu; obrazovku vlevo odehrává ukázka sama.</p>' +
    (nextStep && !busy ? '<p class="tour-next">Dál: ' + e(nextStep.t) + '</p>' : '') +
    (upcoming ? '<p class="tour-next">' + (toAppendix ? 'Hlavní linie končí. Dál je dodatek s variantami: ' : 'Další scéna: ') + e(upcoming.title || D.chapters[upcoming.ch].title) + '</p>' : '') +
    (last ? '<p class="tour-next">Konec ukázky i dodatku.</p>' : '') +
    '<div class="tour-actions">' + btn('← Zpět', 'tourBack', null, '', busy || (idx === 0 && i === 0) ? ' disabled' : '') + btn(e(label), 'tourNext', null, 'primary', busy || last ? ' disabled' : '') + (i > 0 && !busy ? btn('Scénu znovu', 'tourRestart') : '') + btn('Skrýt', 'tourToggle') + '</div>' +
    '<div class="tour-progress" aria-hidden="true"><span style="width:' + Math.round(((idx + (st.length ? Math.min(i, st.length) / st.length : 1)) / D.scenes.length) * 100) + '%"></span></div></aside>';
}
/* „Kde je použita“ v registru: scény příběhu, kde položka působí (z demo/scene-items.js a mapy D.itemScene). */
NF.slots.itemWhere = function (s, id) {
  var where = [];
  (D.sceneItems || []).forEach(function (sc, i) { if ((sc.items || []).indexOf(id) >= 0) where.push(i); });
  var manual = D.itemScene[id] ? mainSceneOf(D.itemScene[id]) : -1; if (manual >= 0 && where.indexOf(manual) < 0) where.unshift(manual);
  if (!where.length) return '<p class="small muted">V příběhu bez vlastního štítku; rozhoduje se ve finále.</p>';
  return '<p class="small">V příběhu:</p><div class="buttonlist">' + where.map(function (i) { return btn((i + 1) + '. ' + (D.scenes[i].title || D.chapters[D.scenes[i].ch].title), 'goScene', String(i), 'sm'); }).join('') + '</div>';
};
NF.demoActions.garantOpen = function (v) { var s = S(); s.gOpen = s.gOpen === v ? null : v; };
NF.demoActions.openAsideItem = function (v) { var s = S(); s.role = 'doctor'; s.page = 'registry'; s.reg = s.reg || {}; s.reg.open = v; s.reg.editing = false; s.reg.params = null; NF.closeDrawer(); };
function decorate() {
  if (!animated()) return;
  var old = doc.querySelectorAll('.tour-focus,.tour-watch,.tour-press');
  for (var k = 0; k < old.length; k++) old[k].classList.remove('tour-focus', 'tour-watch', 'tour-press');
  var f = find(focusSel); if (f) f.classList.add('tour-focus');
  var w = !busy ? find(watchSel) : null; if (w) w.classList.add('tour-watch');
  var p = find(pressSel); if (p) p.classList.add('tour-press');
  if (doc.body) { doc.body.className = doc.body.className.replace(/\bpres-\w+/g, '').trim() + ' pres-' + S().role; }
}
var prevAfter = NF.slots.afterRender;
function measureBar() {
  try { var bar = doc && doc.querySelector && doc.querySelector('.pres-bar'); if (bar && doc.documentElement && doc.documentElement.style) doc.documentElement.style.setProperty('--barh', (bar.offsetHeight || 64) + 'px'); } catch (err) { }
}
NF.slots.afterRender = function (s) { if (prevAfter) prevAfter(s); decorate(); measureBar(); };
if (global.addEventListener) global.addEventListener('resize', measureBar);

/* ---------- panel prezentujícího ---------- */
function branchPicker(s, key) {
  var b = D.branches[key], cur = (s.branches || D.defaults)[key];
  return '<h4>' + e(b.label) + '</h4><div class="buttonlist">' + b.options.map(function (o) { return '<button type="button" class="btn ' + (cur === o.id ? 'selected' : '') + '" data-action="setBranch" data-value="' + e(key + ':' + o.id) + '">' + e(o.label) + '</button>'; }).join('') + '</div>';
}
function presenterPanel(s) {
  var here = sceneIdx(s);
  var out = '<p class="eyebrow">Jen pro prezentujícího</p><h2>Panel prezentujícího</h2><p class="small muted">Scény v řadě, jak je prochází tlačítko Další — odbočky jsou vložené mezi hlavní linii. Skok na scénu přehraje příběh od začátku, takže stav je vždy stejný, jako kdybyste ukázku prošli ručně. Rozhodnutí garanta zůstávají.</p>';
  D.acts.forEach(function (a, ai) {
    out += '<hr><h3>' + e(a.title) + '</h3><p class="small muted">' + e(a.note) + '</p><div class="buttonlist">' +
      D.scenes.map(function (sc, si) { return { sc: sc, si: si }; }).filter(function (x) { return D.chapters[x.sc.ch].act === ai; }).map(function (x) { return '<button type="button" class="btn ' + (x.si === here ? 'selected' : '') + '" data-action="goScene" data-value="' + x.si + '">' + (x.si + 1) + '. ' + e(x.sc.title || D.chapters[x.sc.ch].title) + '</button>'; }).join('') + '</div>';
    Object.keys(D.branches).forEach(function (k) { var from = D.indexOf(D.branches[k].from); if (from >= 0 && D.chapters[from].act === ai) out += branchPicker(s, k); });
    if (D.garantQuestions[ai]) out += '<details class="more"><summary>Otázky pro garanta k tomuto dějství</summary><ul class="plain small">' + D.garantQuestions[ai].map(function (q) { return '<li>' + e(q) + '</li>'; }).join('') + '</ul></details>';
  });
  out += '<hr><h3>Rychlé odkazy</h3><div class="buttonlist">' + btn('Ke schválení (registr)', 'openAside', 'registry') + btn('Verze a stopa', 'openAside', 'trace') + '</div>' +
    '<h3>Modelový čas</h3><div class="actions">' + btn('+ 1 den', 'shiftTime', '1') + btn('+ 7 dní', 'shiftTime', '7') + '</div>' +
    '<hr><label class="field"><span>Poznámky z ukázky</span><textarea data-bind="notes">' + e(s.notes || '') + '</textarea></label>' +
    '<div class="actions">' + btn('Vrátit na začátek', 'resetDemo', null, 'danger') + btn('Smazat rozhodnutí garanta (' + glog.length + ')', 'garantReset', null, 'danger') + btn('Zavřít', 'closeDrawer') + '</div>';
  return out;
}
var prevDrawer = NF.slots.drawer;
NF.slots.drawer = function (s, name) { if (name === 'presenter') return presenterPanel(s); return prevDrawer ? prevDrawer(s, name) : ''; };

function go(index, br) { var s = S(); var n = D.play(index, br || s.branches); n.sceneIndex = D.sceneFor(index, n.branches); land(n); }
NF.demoActions.openPresenter = function () { NF.openDrawer('presenter'); };
NF.demoActions.goChapter = function (v) { go(Number(v), null); NF.closeDrawer(); };
NF.demoActions.goScene = function (v) { land(D.playScene(Number(v))); NF.closeDrawer(); };
NF.demoActions.storyStep = function (v) { land(D.playScene(Math.max(0, Math.min(lastIndex(), sceneIdx(S()) + Number(v))))); };
NF.demoActions.setBranch = function (v) {
  var s = S(), i = String(v).indexOf(':'), b = {}; Object.keys(s.branches || D.defaults).forEach(function (k) { b[k] = s.branches[k]; });
  b[v.slice(0, i)] = v.slice(i + 1);
  var target = D.indexOf(D.branches[v.slice(0, i)].from), here = s.chapterIndex || 0;
  go(here >= target ? here : target, b); NF.openDrawer('presenter');
};
NF.demoActions.openAside = function (v) { var s = S(); s.role = 'doctor'; s.page = v; NF.closeDrawer(); };
NF.demoActions.shiftTime = function (v) { var n = Number(v); if (!isFinite(n)) return; var s = S(); s.clock = NF.addDays(s.clock, Math.round(n)); s.toast = 'Modelový čas: ' + NF.fmtShort(s.clock); };
NF.demoActions.resetDemo = function () { land(D.playScene(0)); S().toast = 'Ukázka začíná znovu v ordinaci.'; NF.closeDrawer(); };

if (doc && doc.addEventListener) doc.addEventListener('keydown', function (ev) {
  var t = ev.target && ev.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || NF.currentDrawer()) return;
  if (ev.key === 'ArrowRight') { ev.preventDefault(); NF.act('tourNext'); }
  if (ev.key === 'ArrowLeft') { ev.preventDefault(); NF.act('tourBack'); }
});
T.isBusy = function () { return busy; };
T.lastIndex = lastIndex;

if (!S().chapter) land(D.playScene(0)); else NF.render();

})(typeof window !== 'undefined' ? window : globalThis);
