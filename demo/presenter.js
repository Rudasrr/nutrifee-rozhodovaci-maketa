/* Prezentační vrstva: lišta, role, rámeček telefonu, panel vyprávění a průchod tlačítkem Další (vpřed i zpět),
   lineární řada scén včetně odboček, blok „K potvrzení“ pro lékaře-garanta, panel prezentujícího.
   Jádro o ní nic neví – kroky volají tytéž akce, které by spustil člověk. Rozhodnutí garanta přežívají skoky mezi scénami. */
(function (global) {
'use strict';
var NF = global.NutriFee, e = NF.esc;
NF.slots.demoBar = true; /* lišta ukázky nese štítek DEMO; jádro ho pak neopakuje (vlastník 26. 10. 2026) */
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
function applyGarant(n) {
  if (n.doctor) n.doctor.label = 'Modelový lékař 01'; /* N1 (19. 10. 2026): garant si nemá myslet, že modelový lékař je on */
  glog.forEach(function (d) { NF.applyDecision(n, d, true); }); return n;
}
D.beforePlay = applyGarant;
/* Každé nové rozhodnutí i komentář – z panelu vyprávění i přímo z registru – jde do deníku garanta; přehrání scény (quiet) háček nevolá (oprava 7. 10. 2026: dřív se rozhodnutí z registru po skoku na scénu ztrácela). */
NF.onDecision(function (S0, d) { glog.push(d); saveGlog(); });
/* Zápisy ze serveru po přihlášení (demo/sync.js restore): přidá jen ty, které tu podle sid nejsou, seřadí podle skutečného času a přehraje scénu. */
D.garantMerge = function (list) {
  var have = {}; glog.forEach(function (d) { if (d.sid) have[d.sid] = 1; });
  var add = (list || []).filter(function (d) { return d && d.sid && !have[d.sid] && NF.item(S(), d.item); });
  if (!add.length) return 0;
  glog = glog.concat(add).sort(function (a, b) { var x = String(a.rt || ''), y = String(b.rt || ''); return x < y ? -1 : x > y ? 1 : 0; });
  saveGlog(); land(D.playScene(sceneIdx(S()))); say('Načteno ' + add.length + ' dřívějších rozhodnutí z vašeho přihlášení.'); NF.render(); return add.length;
};
/* Odhlášení: deník garanta zmizí z tohoto prohlížeče (na serveru zůstává) a příběh začne od začátku. */
D.garantClear = function () { glog = []; saveGlog(); if (D.progressClear) D.progressClear(); land(D.playScene(0)); };
function land(n) { runId++; busy = false; showTrace = false; panelMsg = ''; ended = false; moreOpen = false; var s = S(); n.notes = s.notes || ''; n.tourRole = n.role; n.tourPage = n.page; focusSel = null; watchSel = null; running = null; NF.migrated = null; NF.setState(n); try { global.scrollTo(0, 0); } catch (err) { } try { if (n.sceneIndex != null) noteProgress(n.sceneIndex); } catch (err2) { } }
/* Kde v příběhu právě jsme vs. kam uživatel sám odešel (registr, jiná záložka). */
function markTour() { var s = S(); s.tourRole = s.role; s.tourPage = s.page; }
function away(s) { return !busy && running == null && !!(s.tourRole && (s.role !== s.tourRole || s.page !== s.tourPage)); } /* běžící krok, který přepne roli, není „mimo příběh“ (19. 10. 2026: panel na okamžik ukazoval „Mimo příběh“) */
NF.demoActions.tourReturn = function () { var s = S(); if (s.tourRole) { s.role = s.tourRole; s.page = s.tourPage; } s.error = ''; NF.closeDrawer(); };

/* ---------- rozhodovací kroky garanta (7. 10. 2026) ----------
   Každá scéna hlavní linie končí krokem „Co jste viděli a co schvalujete“ s položkami registru, které se v ní poprvé použily.
   Automaticky z demo/scene-items.js (štítky na obrazovce); položky bez štítku, nebo ty, které patří jinam, mapuje D.itemScene. Zbytek jde do finále. */
D.itemScene = { 'K-KRITERIA': 'enroll', 'Z-GLUKOZA': 'firstMeal', 'Z-IMPORT': 'reviewSummary', 'B-HYPO': 'firstResult', 'S-SILNA': 'reviewSummary', 'R-NAVYKY': 'doses', 'R-POKYNY': 'doses', 'I-VYSOKA': 'doses', 'I-KONTAKT': 'doses', 'I-HYPO': 'firstResult', 'I-NEVIM': 'afterBolus', 'I-MENE': 'afterBolus', 'I-NEMOC-BAZAL': 'illness', 'I-NEMOC-JIDLO': 'illness', 'C-CILE': 'doses', 'Z-BODY': 'training', 'R-DIKY': 'firstMeal', 'S-TYDEN': 'lateMeal', 'J-DATABAZE': 'custom', 'J-STITKY': 'custom', 'R-PODOBNOST': 'custom', 'P-NEMOC': 'illness', 'R-ZMIZELA': 'impact', 'D-BAZAL': 'reviewProposals', 'P-LEKAR': 'issue' };
var decisionPlanCache = null;
function mainSceneOf(chId) { for (var i = 0; i < D.scenes.length; i++) if (!D.scenes[i].appendix && D.chapters[D.scenes[i].ch].id === chId) return i; return -1; }
function decisionPlan() {
  var ids = NF.garantItems(S()).map(function (r) { return r.id; }), offered = {}, plan = D.scenes.map(function () { return []; });
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
  if (status === 'edited' && !comment.trim()) { s.error = ''; say('Napište do komentáře, co upravit, a klepněte znovu na Upravit.'); s.gOpen = id; return; }
  /* Schválení položky, kterou předtím modelově upravil příběh: jádro by ho vedlo jako „upraveno“ (potvrzení zachová úpravu).
     Prázdné off {} tuhle záměnu vypne, takže garantovo „Schválit“ zůstane schválením i na serveru. */
  var opts = { garant: true }; if (status === 'approved' && storyTouched(s, id)) opts.off = {};
  var r = NF.decideItem(s, id, status, comment, null, opts); if (!r.ok) { s.error = r.error; return; }
  if (r.decision) { r.decision.chosen = status; saveGlog(); }
  if (s.form) s.form['gc_' + id] = '';
  if (summaryActive(s)) s.gOpen = null; /* stránka souhrnu: po rozhodnutí se řádek zavře a nový stav je vidět v tabulce */
  confirmAsk = false;
  say(status === 'rejected' ? rejectedMsg(s, id) : status === 'edited' ? 'Upraveno: váš komentář je v historii položky.' : 'Schváleno a zapsáno do historie.');
};
/* V09 (23. 10. 2026): hláška po zamítnutí říká rovnou, co se stane (text „Co se stane při zamítnutí“ z průvodce), ne slib místa na obrazovce,
   které položky jako P-LEKAR nebo I-HYPO v příběhu nemají. Kde místo je, přidá se, že je to vidět na obrazovce. */
function rejectedMsg(s, id) {
  var r = NF.item(s, id), g = (D.guide && D.guide[id]) || (r && r.guide) || {};
  var what = g.dopad ? String(g.dopad).trim() : 'Tahle část aplikace přestane fungovat.';
  return 'Zamítnuto. ' + what + (offOnScreen(s, id) ? ' Na obrazovce to vidíte jako „Tahle část nefunguje“.' : '') + ' Příběh pokračuje; změnit to lze kdykoli.';
}
D.rejectedMsg = function (id) { return rejectedMsg(S(), id); };
function offOnScreen(s, id) {
  var html = '';
  try { html = s.role === 'doctor' ? NF.screens.doctor(s) : s.role === 'nurse' ? NF.screens.nurse(s) : NF.screens.patient(s); } catch (err) { return false; }
  return html.indexOf('data-off="' + id + '"') >= 0;
}
/* Upravit (S6): s komentářem = schválit s výhradou (stav „upraveno“); bez komentáře u položky s parametry otevře úpravu v registru. */
NF.demoActions.garantEdit = function (id) {
  var s = S(), r = NF.item(s, id), comment = (s.form && s.form['gc_' + id]) || '';
  if (!r) return;
  if (comment.trim()) { NF.demoActions.garantDecide(id + ':edited'); return; }
  if (editable(r)) { NF.demoActions.openAsideItem(id); return; }
  s.gOpen = id; say('Napište do komentáře, co upravit, a klepněte znovu na Upravit.');
};
function editable(r) { return !!((r.params && Object.keys(r.params).length) || r.postup || r.text || r.texts); }
NF.demoActions.garantComment = function (id) {
  var s = S(), r = NF.item(s, id), comment = (s.form && s.form['gc_' + id]) || '';
  if (!r || !comment.trim()) { s.error = 'Napište komentář.'; return; }
  var res = NF.decideItem(s, id, r.status, comment, null, { garant: true, comment: true }); if (!res.ok) { s.error = res.error; return; }
  s.form['gc_' + id] = ''; say('Komentář je v historii položky. Stav položky se nemění.');
};
var resetAsk = false;
NF.demoActions.garantResetAsk = function (v) { resetAsk = v !== 'no'; };
NF.demoActions.garantReset = function () { resetAsk = false; glog = []; saveGlog(); if (D.sync && D.sync.event) D.sync.event('reset', null, 'Smazání rozhodnutí garanta', null); land(D.playScene(sceneIdx(S()))); say('Rozhodnutí garanta byla smazána; položky jsou zase ke schválení.'); };
D.garantLog = function () { return glog.slice(); };

/* ---------- co rozhodl garant (K2, 19. 10. 2026) ----------
   „Rozhodnuto“ a souhrn se počítají jen z deníku garanta. Úprava, kterou odehraje příběh (scénář 5 upraví R-PORADI pod NF.muteHooks),
   je modelová: v historii položky zůstává, ale garantovi se nepřipisuje a položku mu nabídneme normálně. */
function gDecs(id) { return glog.filter(function (d) { return d.item === id && d.kind !== 'comment'; }); }
function gTouched(id) { return gDecs(id).length > 0; }
/* Co garant zvolil (ne co z toho udělalo jádro: potvrzení položky s modelovou úpravou jádro vede jako „upraveno“). */
function gStatus(id) { var ds = gDecs(id); if (!ds.length) return null; var d = ds[ds.length - 1]; return d.chosen || d.status; }
function storyTouched(s, id) { var n = s.registry.history.filter(function (h) { return h.item === id && h.kind !== 'comment'; }).length; return n > gDecs(id).length; }
NF.itemTouched = function (S0, id) { return gTouched(id); }; /* jen v prezentační vrstvě; jádro bez demo/ počítá z historie */
function gSummary(s) {
  var items = NF.garantItems(s), out = { total: items.length, approved: 0, edited: 0, rejected: 0, remaining: 0, touched: 0 };
  items.forEach(function (r) { var st = gStatus(r.id); if (!st) { out.remaining++; return; } out.touched++; out[st] = (out[st] || 0) + 1; });
  return out;
}
D.garantSummary = function (s) { return gSummary(s || S()); };
/* Hlášky vrstvy se ukazují v panelu nad tlačítky, ne jako bublina přes aplikaci (S8). */
var panelMsg = '';
function say(msg) { panelMsg = msg || ''; }

/* ---------- lišta ---------- */
/* Kde v ukázce jsme (V2, 19. 10. 2026): hlavní linie po scénářích a scénách hlavní linie, dodatek zvlášť po variantách. */
function mainScenes() { return D.scenes.map(function (x, i) { return i; }).filter(function (i) { return !D.scenes[i].appendix; }); }
function appendixScenes() { return D.scenes.map(function (x, i) { return i; }).filter(function (i) { return D.scenes[i].appendix; }); }
function position(s) {
  var i = sceneIdx(s), sc = D.scenes[i], act = sc ? D.chapters[sc.ch].act : 0, nActs = D.acts.length - 1;
  if (sc && sc.appendix) { var ap = appendixScenes(); return { appendix: true, label: 'Dodatek · varianta ' + (ap.indexOf(i) + 1) + ' z ' + ap.length }; }
  var ms = mainScenes(), n = ms.indexOf(i) + 1;
  if (act === 0) return { appendix: false, intro: true, label: 'Úvod' }; /* S12: úvod bez počítadla scén */
  return { appendix: false, label: 'Scénář ' + act + ' ze ' + nActs + ' · scéna ' + n + ' z ' + ms.length };
}
function bar(s) {
  var i = sceneIdx(s), sum = gSummary(s), pos = position(s), signed = !!(D.auth && D.auth.session());
  /* N19: jedno znění počítadla (odst. 15), na telefonu zkrácené */
  var todo = btn(sum.remaining ? '<span><span class="t-long">Ke schválení · zbývá</span><span class="t-short">Zbývá</span> ' + sum.remaining + '</span>' : 'Vše rozhodnuto', 'openAside', 'registry', 'bar-todo' + (sum.remaining ? '' : ' ok'));
  var where = pos.intro ? sceneTitle(s) : pos.label + ': ' + sceneTitle(s);
  return '<div class="pres-bar" role="banner" aria-label="Lišta ukázky"><span class="flag">DEMO · syntetická data · není určeno pro léčbu</span>' +
    '<span class="where" title="' + e(where) + '">' + (pos.intro ? '<b>' + e(sceneTitle(s)) + '</b>' : e(pos.label) + ': <b>' + e(sceneTitle(s)) + '</b>') + '</span>' + todo +
    (glog.length && NF.slots.syncBadge ? '<span class="bar-wide">' + NF.slots.syncBadge(s) + '</span>' : '') + /* S2: stav ukládání až po prvním rozhodnutí */
    (D.auth && D.auth.role() === 'admin' ? btn('Výsledky garanta', 'openResults', null, 'bar-wide') : '') +
    btn('Přehled scén', 'openPresenter', null, 'bar-wide') +
    (signed ? btn('Odhlásit · ' + D.auth.label(), 'authLogout', null, 'bar-wide') + (D.auth.forceOffered() && D.sync && D.sync.pending() ? btn('Odhlásit a zahodit neuložené (' + D.sync.pending() + ')', 'authLogoutForce', null, 'danger bar-wide') : '') : '') +
    '<button type="button" class="btn bar-more" data-action="openPresenter" aria-label="Další volby: přehled scén, odhlášení">⋯</button>' +
    '</div>'; /* panel vyprávění se vykresluje až za #app (přístupnost 23. 10. 2026, nález 10: pořadí fokusu), viz renderPanel */
}
/* S8: hlášky v příběhu patří do panelu, ne přes aplikaci. Zachytí se dřív, než jádro ukáže toast (jádro ho ukazuje hned po vykreslení obrazovky);
   i mimo příběh (registr: „Rozhodnutí je uložené…“, garant V03) – sbalený panel na telefonu toast nechá, jinak by hláška nebyla vidět. */
function captureToast(s) {
  if (!s.toast) return;
  if (!isHidden(s)) { panelMsg = s.toast; s.toast = ''; return; }
  if (away(s)) panelMsg = s.toast; /* telefon, jednořádkový list: toast zůstane, ale hláška čeká i v panelu po návratu do příběhu */
}
NF.registerSlot('banner', function (s) { captureToast(s); return bar(s); });

/* ---------- průchod tlačítkem Další ---------- */
var busy = false, running = null, runId = 0, focusSel = null, watchSel = null, pressSel = null;
function animated() { return !!(doc && typeof doc.querySelector === 'function' && global.requestAnimationFrame); }
function reduced() { try { return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (err) { return false; } }
function wait(ms, fn) { global.setTimeout(fn, reduced() ? Math.min(ms, 120) : ms); }
function find(sel) { try { return sel ? doc.querySelector(val(sel)) : null; } catch (err) { return null; } }
/* Viditelná oblast okna bez lišty ukázky nahoře a bez panelu dole (pod 1100 px je panel dole). */
function viewBox() {
  var vh = global.innerHeight || 0, top = 0, bottom = vh;
  try { var b = doc.querySelector('.pres-bar'); if (b) top = b.getBoundingClientRect().bottom; } catch (err) { }
  try { var p = doc.querySelector('.tour-panel'); if (p && D.narrow()) bottom = Math.min(vh, p.getBoundingClientRect().top); } catch (err2) { }
  return { top: top, bottom: bottom };
}
/* V04–V06 (23. 10. 2026): cíl vyšší než viditelná oblast se roluje na začátek (pod lištu), jinak na střed; soft = jen když není celý vidět.
   Pod 1100 px roluje okno ručně, aby střed neskončil pod spodním panelem. */
function reveal(el, soft) {
  if (!el) return;
  for (var p = el.parentNode; p && p !== doc; p = p.parentNode) if (p.tagName === 'DETAILS') p.open = true;
  var r = null, vb = viewBox(); try { r = el.getBoundingClientRect(); } catch (err) { r = null; }
  var beh = reduced() ? 'auto' : 'smooth';
  if (r && soft && r.top >= vb.top && r.bottom <= vb.bottom) return;
  var tall = r && r.height > (vb.bottom - vb.top) * 0.85;
  if (r && D.narrow() && global.scrollBy) {
    var pad = 12, want = tall ? vb.top + pad : vb.top + Math.max(pad, (vb.bottom - vb.top - r.height) / 2);
    var y = (global.pageYOffset || 0) + r.top - want; /* absolutně: dvě plynulá rolování za sebou se nesčítají špatně */
    try { global.scrollTo({ top: y, behavior: beh }); } catch (err2) { try { global.scrollTo(0, y); } catch (err3) { } }
    return;
  }
  try { el.scrollIntoView({ block: tall ? 'start' : 'center', behavior: beh }); } catch (err4) { }
}
/* Rámeček telefonu roluje uvnitř: po kroku zpět nebo přehrání scény se vrátí nahoru (V08). */
function shellTop() { try { var sh = doc.querySelector('.patient-shell .patient'); if (sh) sh.scrollTop = 0; } catch (err) { } }
/* Přístupnost 23. 10. 2026, nález 1: po kroku z panelu nesmí fokus spadnout na body – jde na nadpis kroku v panelu (jádro samo dává h1 jen při změně obrazovky). */
function focusPanel() {
  try {
    var a = doc.activeElement; if (a && a !== doc.body && a !== doc.documentElement) return;
    var h = doc.querySelector('.tour-panel h2') || doc.querySelector('.tour-panel .tour-min-t'); if (!h || !h.focus) return;
    h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true });
  } catch (err) { }
}
function perform(op) {
  var s = S(), ch = chapter(s);
  if (ch && ch.role && s.role !== ch.role) { s.role = ch.role; } /* krok vyprávění jedná vždy za roli kapitoly */
  NF.muteHooks(function () { /* kroky příběhu nejsou rozhodnutí garanta: neukládají se na server ani do jeho deníku */
    if (op.fn) { op.fn(s); NF.save(s); NF.render(); return; }
    if (op.bind) { NF.bindValue(val(op.bind), val(op.val)); NF.render(); return; } /* klíč vazby může být funkce (např. form.peak_<id>) */
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
          if (i < text.length) { el.value += text.charAt(i++); if (op.live) NF.bindValue(val(op.bind), el.value); wait(90, typeOne); return; }
          if (safe(function () { perform(op); })) wait(350, next);
        })();
        return;
      }
      pressSel = focusSel; decorate();
      wait(240, function () { if (!alive()) return; pressSel = null; if (safe(function () { perform(op); })) wait(op.quick ? 320 : 600, next); });
    });
  })();
}
function lastFocus(step) { var ops = (step.do || []).filter(function (o) { return o.sel; }); return step.watch || (ops.length ? ops[ops.length - 1].sel : null); }
NF.demoActions.tourNext = function () {
  if (busy) return;
  if (away(S())) { NF.demoActions.tourReturn(); return; } /* mimo příběh: Další nejdřív vrátí do scény */
  returnTo = null;
  var pn = pendingNow(S());
  if (pn.ids.length) { NF.demoActions.tourJumpPending(); return; } /* místo bubliny odroluje k první nerozhodnuté položce (rozhodnutí 12) */
  if (pn.summary) { say('Nejdřív potvrďte souhrn rozhodnutí.'); return; }
  panelMsg = ''; moreOpen = false;
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
    S().tourStep = i + 1; running = null; watchSel = step.watch || null; focusSel = lastFocus(step); markTour(); NF.save(S()); NF.render(); focusPanel(); return;
  }
  busy = true; NF.render();
  runAnimated(step, function (failed) {
    S().tourStep = i + 1; /* i selhaný krok se přeskočí, hláška zůstane; prezentace se nezasekne */
    markTour(); NF.save(S()); busy = false; running = null; focusSel = failed ? null : lastFocus(step); /* zvýraznění zůstane, dokud garant nepokračuje (8. 10. 2026) */
    watchSel = failed ? null : (step.watch || null); NF.render();
    var w = find(watchSel); if (w) reveal(w); else reveal(find(focusSel), true); /* V04: cíl kroku, který překreslení odsunulo pod okraj, se doroluje */
    focusPanel();
  });
};
/* Krok zpět: scéna se přehraje znovu a provedou se všechny kroky kromě posledního. Na začátku scény = předchozí scéna. */
NF.demoActions.tourBack = function () {
  if (busy) return;
  if (away(S())) { NF.demoActions.tourReturn(); return; }
  var s = S(), i = s.tourStep || 0, idx = sceneIdx(s); panelMsg = '';
  if (i === 0) { if (idx > 0) land(D.playScene(idx - 1)); return; }
  land(D.playScene(idx));
  var st = steps();
  try { for (var k = 0; k < i - 1; k++) (st[k].do || []).forEach(perform); } catch (err) { S().error = 'Krok ukázky selhal: ' + err.message; }
  S().tourStep = i - 1; watchSel = i - 1 > 0 ? (st[i - 2].watch || null) : null; focusSel = i - 1 > 0 ? lastFocus(st[i - 2]) : null; /* V08: zpět vrátí i zvýraznění */
  markTour(); NF.save(S()); NF.render(); shellTop(); reveal(find(watchSel) || find(focusSel), true); focusPanel();
};
NF.demoActions.tourRestart = function () { if (busy) return; land(D.playScene(sceneIdx(S()))); };
/* Sbalení panelu (V2/V3, 21. 10. 2026): výslovná volba garanta platí vždy; bez ní se panel na telefonu (do 600 px) otevírá sbalený
   a na 601–1279 px se na scénách lékaře a sestry sbalí na začátku každé scény, aby nepřekrýval data, o kterých scéna mluví. */
var pref = null, expandedScene = null;
try { pref = global.localStorage && global.localStorage.getItem('nutrifee-vypraveni'); } catch (err) { pref = null; }
function mq(q) { try { return !!(global.matchMedia && global.matchMedia(q).matches); } catch (err) { return false; } }
D.narrow = function () { return mq('(max-width:1100px)'); }; /* panel je dole: texty říkají „nahoře / dole“ místo „vlevo / vpravo“ */
function phone() { return mq('(max-width:600px)'); }
function isHidden(s) {
  s = s || S();
  if (pref === '0') return true;
  if (phone() && away(s)) return true; /* V13 (23. 10. 2026): mimo příběh na telefonu vždy jen řádek „Zpět do příběhu“ */
  if (phone()) return pref !== '1';
  if (mq('(max-width:1279px)') && (s.role === 'doctor' || s.role === 'nurse') && s.page !== 'intro' && !away(s)) return expandedScene !== sceneIdx(s);
  return false;
}
NF.demoActions.tourToggle = function () {
  if (isHidden()) { pref = '1'; expandedScene = sceneIdx(S()); } else { pref = '0'; expandedScene = null; }
  try { global.localStorage && global.localStorage.setItem('nutrifee-vypraveni', pref); } catch (err) { }
};

function rows(x) {
  return [['Co se děje', val(x.co)], ['Čeho si všímat', val(x.vsimni)], ['Proč', val(x.proc)], ['Co z toho plyne', val(x.dusledek)]].filter(function (r) { return r[1]; })
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
/* Totéž na úrovni scény (panel vyprávění): zamítnuté položky, které v této scéně působí – i ty bez vlastního místa na obrazovce. */
function sceneOff(s, ids, label) {
  var rej = (ids || []).filter(function (id) { var r = NF.item(s, id); return r && r.status === 'rejected'; });
  return rej.length ? '<div class="off-scene"><p class="small"><b>' + e(label || 'V této scéně nefunguje') + '</b> (zamítnuto v registru):</p>' + rej.map(function (id) { return offHtml(s, id, true); }).join('') + '</div>' : '';
}
/* V09: zamítnutí z minulé scény je vidět i na začátku další scény – položky bez místa na obrazovce (P-LEKAR, I-HYPO) by jinak zmizely bez stopy. */
function prevSceneOff(s, idx, ids) {
  if (!idx || !D.scenes[idx - 1] || D.scenes[idx].appendix) return '';
  var prev = D.decisionItems(idx - 1).filter(function (id) { return (ids || []).indexOf(id) < 0; });
  return sceneOff(s, prev, 'Od minulé scény nefunguje');
}
D.prevSceneOff = function (s) { s = s || S(); return prevSceneOff(s, sceneIdx(s), D.decisionItems(sceneIdx(s))); };
function sceneRejected(s) { return D.decisionItems(sceneIdx(s)).filter(function (id) { var r = NF.item(s, id); return r && r.status === 'rejected'; }); }
function itemStatus(s, r) {
  var st = gStatus(r.id);
  return st === 'rejected' ? ['zamítnuto', 'bad'] : st === 'edited' ? ['upraveno', 'info'] : st === 'approved' ? ['schváleno', 'ok'] : NF.itemCommented(s, r.id) ? ['okomentováno · ke schválení', ''] : ['ke schválení', ''];
}
/* Jedna položka v rozhodovacím kroku: celý pětidílný průvodce + rozhodnutí.
   Schválit · Upravit · Zamítnout jsou tři rovnocenná tlačítka; plné je jen to, které garant zvolil (rozhodnutí 12, 19. 10. 2026). */
var inPanel = false;
/* Tělo rozbalené položky: průvodce, komentář a tři rovnocenná rozhodnutí. Sdílí ho panel (gitem) i stránka souhrnu (V4). */
function gbody(s, r) {
  var cur = gStatus(r.id), canEdit = editable(r);
  var choice = function (label, action, value, key, cls) { return '<button type="button" class="btn sm gchoice' + (cls ? ' ' + cls : '') + (cur === key ? ' on' : '') + '" data-action="' + action + '" data-value="' + e(value) + '" aria-pressed="' + (cur === key ? 'true' : 'false') + '">' + (cur === key ? '✓ ' : '') + e(label) + '</button>'; };
  var guide = '', g = (D.guide && D.guide[r.id]) || r.guide || {}; inPanel = true; try { guide = NF.screens.itemGuide(s, r); } finally { inPanel = false; }
  /* V13/V15 (23. 10. 2026): rozhodnutí hned pod názvem položky, „co schvalujete“ jednou větou, celý průvodce pod tím rozbalitelný – bez rolování u každé z 28 položek */
  return '<div class="gb">' + (storyTouched(s, r.id) ? '<p class="gnote">Ve scéně jste viděli modelovou úpravu této položky; vaše rozhodnutí je samostatné.</p>' : '') +
    (g.co ? '<p class="gco"><b>Co schvalujete:</b> ' + e(firstSentence(g.co)) + '</p>' : '') +
    '<div class="gchoices">' + choice('Schválit', 'garantDecide', r.id + ':approved', 'approved') + choice('Upravit', 'garantEdit', r.id, 'edited') + choice('Zamítnout', 'garantDecide', r.id + ':rejected', 'rejected', 'gno') + '</div>' +
    '<label class="field"><span>Komentář ' + (canEdit ? '(nepovinný)' : '(povinný jen u Upravit)') + '</span><input data-bind="form.gc_' + e(r.id) + '" value="' + e((s.form && s.form['gc_' + r.id]) || '') + '" placeholder="co změnit, proč, nebo jen poznámka"></label>' +
    (canEdit ? '' : '<p class="small muted">Položka nemá parametry: Upravit znamená schválit s výhradou, kterou napíšete do komentáře.</p>') +
    '<button type="button" class="tour-link" data-action="garantComment" data-value="' + e(r.id) + '">Uložit komentář</button>' +
    '<details class="more gguide"><summary>Průvodce položkou: proč existuje, jak funguje, kde je použita a co se stane při zamítnutí</summary>' + guide + '</details></div>';
}
function gitem(s, r, isOpen) {
  var st = itemStatus(s, r);
  return '<div class="gitem' + (flashId === r.id ? ' gflash' : '') + '" data-gitem="' + e(r.id) + '"><button type="button" class="gh" data-action="garantOpen" data-value="' + e(r.id) + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '"><span class="t">' + e(r.title) + '</span>' + NF.screens.tag(st[0], st[1]) + '<span class="chev" aria-hidden="true">' + (isOpen ? '⌃' : '⌄') + '</span></button>' +
    (isOpen ? gbody(s, r) : '') + '</div>';
}
/* Schvalování přímo v kroku (8. 10. 2026): položky scény, které právě působí na obrazovce, se nabídnou hned s celým průvodcem;
   na posledním kroku scény i zbývající nerozhodnuté položky scény. Rozhodnutí nikdy nebrání pokračování. */
function approvalsList(s, idx, i, st) {
  var ids = D.decisionItems(idx); if (!ids.length || (i === 0 && st.length)) return { now: [], rest: [], list: [] }; /* před prvním krokem jen výhled: garant nejdřív vidí, o čem rozhoduje */
  var onScreen = D.itemsOnScreen(s), lastStep = i >= st.length;
  var now = ids.filter(function (id) { return onScreen.indexOf(id) >= 0; });
  var rest = lastStep ? ids.filter(function (id) { return now.indexOf(id) < 0; }) : [];
  return { now: now, rest: rest, list: now.concat(rest) };
}
/* Co brání pokračování (8. 10. 2026, pokyn vlastníka: garant jde krok za krokem a schvaluje): nerozhodnuté nabídnuté položky, ve finále nepotvrzený souhrn. */
function pendingNow(s) {
  if (away(s)) return { ids: [], summary: false };
  var st = steps(), i = s.tourStep || 0, idx = sceneIdx(s), sc = D.scenes[idx];
  var finale = sc && !sc.appendix && D.chapters[sc.ch].id === 'trace' && i >= st.length;
  var ids = approvalsList(s, idx, i, st).list.filter(function (id) { return !NF.itemTouched(s, id); });
  return { ids: ids, summary: !!(finale && !prog.done) };
}
D.pendingNow = function (s) { return pendingNow(s || S()); };
function approvalsBlock(s, idx, i, st) {
  var al = approvalsList(s, idx, i, st), now = al.now, list = al.list, items = list.map(function (id) { return NF.item(s, id); }).filter(Boolean);
  if (!items.length) return '';
  var firstOpen = items.filter(function (r) { return !gTouched(r.id); })[0];
  var open = s.gOpen && list.indexOf(s.gOpen) >= 0 ? s.gOpen : (firstOpen ? firstOpen.id : null);
  var undecided = items.filter(function (r) { return !gTouched(r.id); }).length;
  return '<div class="garant decide" id="tour-decide">' + sceneOff(s, list) + '<p class="gtitle"><b>' + (now.length ? 'Ke schválení teď' : 'Z této scény ještě ke schválení') + (undecided ? ' (' + undecided + ')' : '') + '</b></p>' +
    '<p class="small">' + (undecided ? 'Rozhodněte, než budete pokračovat. Změnit lze kdykoli.' : 'Vše rozhodnuto; změnit lze kdykoli.') + '</p>' +
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
function counts(sum) {
  return '<div class="gcounts">' + [[sum.approved, 'schváleno'], [sum.edited, 'upraveno'], [sum.rejected, 'zamítnuto'], [sum.remaining, 'nerozhodnuto']].map(function (x) { return '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>';
}
/* ---------- souhrn na celou šířku (V4, rozhodnutí vlastníka 21. 10. 2026) ----------
   Závěrečná kontrola se neodehrává v úzkém panelu: ve finále hlavní linie (scéna „Verze a stopa“ po posledním kroku) nahradí obrazovku aplikace
   stránka „Vaše rozhodnutí“ – čtyři čísla, tabulka položka · stav · komentář · Změnit, nerozhodnuté první. Jen klinické položky (NF.garantItems).
   Stránka není zamčená (garant v ní rozhoduje); panel nese jen potvrzení souhrnu. Odkaz vrátí obrazovku stopy a panel zpět na souhrn. */
var showTrace = false;
function finaleNow(s) { var sc = D.scenes[sceneIdx(s)]; return !!(sc && !sc.appendix && D.chapters[sc.ch].id === 'trace' && (s.tourStep || 0) >= steps().length); }
function summaryActive(s) { return !!(s && s.registry && s.role === 'doctor' && s.page === 'trace' && !showTrace && !away(s) && finaleNow(s)); }
D.summaryActive = function (s) { return summaryActive(s || S()); };
NF.demoActions.gsumTrace = function () { showTrace = !showTrace; S().gOpen = null; };
function gComment(id) { for (var k = glog.length - 1; k >= 0; k--) if (glog[k].item === id && glog[k].comment) return glog[k].comment; return ''; }
function summaryRow(s, r, open) {
  var st = gStatus(r.id), tg = st ? itemStatus(s, r) : ['nerozhodnuto', ''], c = gComment(r.id), did = 'gsum-d-' + r.id;
  return '<tr class="gsum-row' + (open ? ' open' : '') + '" data-gsum-row="' + e(r.id) + '"><th scope="row"><span class="t">' + e(r.title) + '</span><span class="s">' + e(r.id + ' · ' + NF.catLabel(r.cat)) + '</span></th>' +
    '<td class="gsum-st"><span class="gsum-l">Stav</span>' + NF.screens.tag(tg[0], tg[1]) + '</td>' +
    '<td class="gsum-c"><span class="gsum-l">Komentář</span>' + (c ? '„' + e(c) + '“' : '<span class="muted">bez komentáře</span>') + '</td>' +
    '<td class="gsum-act"><button type="button" class="btn sm" data-action="garantOpen" data-value="' + e(r.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '"' + (open ? ' aria-controls="' + e(did) + '"' : '') + '>' + (open ? 'Zavřít' : st ? 'Změnit' : 'Rozhodnout') + '</button></td></tr>' +
    (open ? '<tr class="gsum-detail" id="' + e(did) + '"><td colspan="4"><div class="garant decide"><div class="gitem gsum-item" data-gitem="' + e(r.id) + '">' + gbody(s, r) + '</div></div></td></tr>' : '');
}
function summaryPage(s) {
  var items = NF.garantItems(s), sum = gSummary(s), open = s.gOpen, pan = D.narrow() ? 'v panelu dole' : 'v panelu vpravo';
  var todo = items.filter(function (r) { return !gTouched(r.id); }), done = items.filter(function (r) { return gTouched(r.id); });
  var cats = []; done.forEach(function (r) { if (cats.indexOf(r.cat) < 0) cats.push(r.cat); });
  done = cats.reduce(function (a, c) { return a.concat(done.filter(function (r) { return r.cat === c; })); }, []);
  var group = function (label, list) { return list.length ? '<tbody><tr class="gsum-group"><th colspan="4" scope="colgroup">' + e(label) + ' (' + list.length + ')</th></tr>' + list.map(function (r) { return summaryRow(s, r, open === r.id); }).join('') + '</tbody>' : ''; };
  var changedSince = prog.done && s.registry.history.some(function (h) { return h.kind !== 'comment' && h.rt && h.rt > prog.done; });
  return '<div class="gsum-page" id="gsum"><p class="gsum-kicker">Závěr hlavní linie · souhrn rozhodnutí</p><h1>Vaše rozhodnutí</h1>' +
    '<p class="gsum-lead">Všech ' + sum.total + ' pravidel aplikace, o kterých jste v ukázce rozhodovali. Zkontrolujte je, případně změňte a souhrn potvrďte ' + pan + '. Jde o neformální podklad, ne podpis.</p>' +
    '<div class="gsum-counts">' + counts(sum) + '</div>' +
    (prog.done ? '<p class="gsum-state' + (changedSince ? ' again' : '') + '">' + (changedSince ? 'Od potvrzení ' + e(prog.doneAt || '') + ' jste rozhodnutí změnili; potvrďte souhrn znovu.' : '✓ Souhrn potvrzen ' + e(prog.doneAt || '') + '. Rozhodnutí můžete dál měnit.') + '</p>' : '') +
    (panelMsg && isHidden(s) ? '<p class="gsum-msg" role="status">' + e(panelMsg) + '</p>' : '') + /* hláška je v panelu; při sbaleném panelu ji ukážeme tady */
    '<table class="gsum-table"><caption class="sr-only">Vaše rozhodnutí k pravidlům aplikace, nerozhodnutá první</caption><thead><tr><th scope="col">Položka</th><th scope="col">Stav</th><th scope="col">Komentář</th><th scope="col"><span class="sr-only">Změnit</span></th></tr></thead>' +
    group('Nerozhodnuto', todo) + group('Rozhodnuto', done) + '</table>' +
    '<p class="gsum-foot small"><button type="button" class="tour-link" data-action="gsumTrace">Zobrazit obrazovku Verze a stopa</button> – záznam každého výpočtu, rady a rozhodnutí, o kterém mluvil poslední krok.</p></div>';
}
var prevPage = NF.slots.pageOverride;
NF.slots.pageOverride = function (s) { if (summaryActive(s)) return summaryPage(s); return prevPage ? prevPage(s) : ''; };
/* Panel ve finále: jen potvrzení souhrnu (stránka je vlevo, na užší obrazovce nahoře). */
function summarySide(s, changedSince) {
  var sum = gSummary(s), where = D.narrow() ? 'nahoře' : 'vlevo';
  return '<div class="garant decide gsum-side">' + (changedSince ? '<p class="tour-status tour-block">Od potvrzení jste rozhodnutí změnili; potvrďte souhrn znovu.</p>' : '') +
    '<p class="gtitle"><b>Souhrn vašich rozhodnutí</b> · rozhodnuto ' + sum.touched + ' z ' + sum.total + '</p>' +
    (showTrace ? '<p class="small">Teď vidíte obrazovku Verze a stopa.</p><div class="actions">' + btn('Zpět na souhrn', 'gsumTrace') + '</div>' :
      '<p class="small">Tabulka ' + where + ' ukazuje všechna pravidla, nerozhodnutá první; tam je můžete změnit. Potvrzení říká autorovi makety, že jste ukázku prošli celou.</p>') +
    (changedSince ? '<div class="actions">' + btn('Potvrdit souhrn znovu', 'garantConfirmSummary') + '</div>' : '') + '</div>';
}
/* Závěrečná obrazovka (rozhodnutí 12): po potvrzení souhrnu poděkování, počty, co bude dál a dvě volby. */
function thanksBlock(s, changedSince) {
  var sum = gSummary(s), ap = appendixScenes().length;
  return '<div class="tour-thanks"><h3>Děkujeme, máme vaše rozhodnutí</h3>' + counts(sum) +
    '<p class="small">Souhrn potvrzen ' + e(prog.doneAt || '') + (changedSince ? '. Od té doby jste rozhodnutí změnili, potvrďte ho prosím znovu.' : '.') + '</p>' +
    '<p class="small"><b>Co bude dál:</b> autor makety vaše rozhodnutí a komentáře zapracuje a ozve se vám. Jde o neformální podklad; pro ostrý provoz se pravidla podepisují znovu.</p>' +
    '<p class="small">Můžete skončit, nebo projít dodatek s ' + ap + ' variantami, asi 4 minuty. Souhrn zůstává ' + (D.narrow() ? 'nahoře' : 'vlevo') + ' a rozhodnutí v něm můžete dál měnit.</p></div>';
}
/* V16 (23. 10. 2026): souhrn s nerozhodnutými položkami se nepotvrdí mlčky – panel se zeptá „Zbývá N nerozhodnutých – potvrdit přesto?“ */
var confirmAsk = false;
NF.demoActions.garantConfirmCancel = function () { confirmAsk = false; say(''); };
D.confirmAsk = function () { return confirmAsk; };
function confirmButtons() {
  return btn('Ještě rozhodnout', 'garantConfirmCancel') + btn('Potvrdit přesto', 'garantConfirmSummary', 'force', 'primary');
}
NF.demoActions.garantConfirmSummary = function (v) {
  var s = S(), sum = gSummary(s), now = new Date();
  if (sum.remaining && v !== 'force') {
    confirmAsk = true; s.gOpen = null;
    say('Zbývá ' + sum.remaining + ' ' + plural(sum.remaining, 'nerozhodnutá položka', 'nerozhodnuté položky', 'nerozhodnutých položek') + ' – potvrdit přesto? Nerozhodnuté zůstanou „ke schválení“; rozhodnout je můžete v tabulce.');
    return;
  }
  confirmAsk = false;
  prog.done = now.toISOString(); prog.doneAt = NF.fmtShort(prog.done) + ' ' + NF.fmtTime(prog.done); prog.max = Math.max(prog.max || 0, sceneIdx(s)); saveProg();
  var rej = NF.garantItems(s).filter(function (r) { return gStatus(r.id) === 'rejected'; }).map(function (r) { return r.id; });
  var pend = NF.garantItems(s).filter(function (r) { return !gTouched(r.id); }).map(function (r) { return r.id; });
  if (D.sync && D.sync.event) D.sync.event('summary', 'SOUHRN', 'Souhrn rozhodnutí potvrzen', { approved: sum.approved + sum.edited, edited: sum.edited, rejected: sum.rejected, pending: sum.remaining, total: sum.total, rejectedIds: rej, pendingIds: pend, scene: sceneIdx(s) + 1, total_scenes: D.scenes.length });
  s.gOpen = null; say(''); panelTop = true; /* V12: poděkování je první – panel se odroluje nahoru, jinak by na telefonu zůstalo nad viditelnou částí listu */
};
var ended = false, panelTop = false;
NF.demoActions.tourFinish = function () { ended = true; NF.closeDrawer(); };
NF.demoActions.tourUnfinish = function () { ended = false; };
/* Přehled scénáře na jeho první scéně: co uvidíte a co budete schvalovat. */
function actOverview(s, idx) {
  var sc = D.scenes[idx]; if (!sc || sc.appendix) return '';
  var act = D.chapters[sc.ch].act, first = -1;
  if (act === 0) return ''; /* N3: úvod nemá přehled „V tomto scénáři“ */
  for (var i = 0; i < D.scenes.length; i++) if (!D.scenes[i].appendix && D.chapters[D.scenes[i].ch].act === act) { first = i; break; }
  if (first !== idx) return '';
  var list = D.scenes.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return !o.x.appendix && D.chapters[o.x.ch].act === act; });
  return '<details class="more tour-act"><summary>V tomto scénáři (' + list.length + ' ' + (list.length === 1 ? 'scéna' : list.length < 5 ? 'scény' : 'scén') + ')</summary><ol class="small">' + list.map(function (o) {
    var ids = D.decisionItems(o.i); return '<li>' + e(o.x.title || D.chapters[o.x.ch].title) + (ids.length ? ' <span class="muted">· schvalujete: ' + e(ids.map(function (id) { var r = NF.item(s, id); return r ? r.title : id; }).join(', ')) + '</span>' : '') + '</li>';
  }).join('') + '</ol></details>';
}
/* Co je právě vlevo na obrazovce – panel to říká vždy, aby vyprávění nikdy nebylo „pozadu“ (8. 10. 2026). */
/* V8 (21. 10. 2026): každá obrazovka má název; syrový klíč se nikdy neukáže. */
var PAGE_NOM = { intro: 'Úvod', registry: 'Schvalovací registr', trace: 'Verze a stopa', review: 'Kontrola', enroll: 'Zařazení a plán', training: 'Zaučení', today: 'Dnes', foods: 'Jídla', food: 'Detail jídla', plan: 'Plán', safety: 'Bezpečí', preview: 'Přehled před kontrolou', meal: 'Zápis jídla', understand: 'Převzetí plánu', takeover: 'Převzetí plánu', newplan: 'Nový plán', import: 'Nahrát export', importPage: 'Nahrát export' };
D.pageNames = PAGE_NOM;
function whereNow(s) {
  if (s.page === 'intro') return ''; /* S12: úvod není obrazovka lékaře */
  if (summaryActive(s)) return 'Na obrazovce: souhrn vašich rozhodnutí';
  var role = { patient: 'Pacient', doctor: 'Lékař', nurse: 'Sestra' }[s.role] || s.role, page = PAGE_NOM[s.page] || 'obrazovka aplikace', sub = '';
  if (s.page === 'enroll') sub = ', krok ' + ((s.wizardStep || 0) + 1) + ' ze 3';
  else if (s.page === 'review' && s.review && s.review.step) sub = ', krok ' + s.review.step + ' ze 4';
  else if (s.page === 'meal' && s.meal && s.meal.step) sub = ', krok ' + s.meal.step + ' ze 3';
  return 'Na obrazovce: ' + role + ' · ' + page + sub;
}
function pageName(s) {
  var map = { intro: 'úvod', registry: 'schvalovací registr', trace: 'verzi a stopu', review: 'kontrolu', enroll: 'zařazení a plán', training: 'zaučení', today: 'obrazovku Dnes', foods: 'jídla', food: 'detail jídla', plan: 'plán', safety: 'Bezpečí', preview: 'přehled před kontrolou', meal: 'zápis jídla', understand: 'převzetí plánu', takeover: 'převzetí plánu', newplan: 'nový plán', import: 'nahrání exportu', importPage: 'nahrání exportu' };
  return map[s.page] || 'obrazovku aplikace';
}
/* ---------- panel vyprávění (rozhodnutí 12, 19. 10. 2026) ----------
   Akce jsou vždy dole přilepené; nad nimi řádek stavu. Když čeká položka, vyprávění se sbalí na nadpis a jednu větu.
   Jediné tlačítko vpřed „Dál ▶“ (na úvodu „Začít ukázku ▶“); kam se jde, říká řádek nad ním. */
var moreOpen = false, flashId = null, jumpTo = null;
NF.demoActions.tourMore = function () { moreOpen = !moreOpen; };
NF.demoActions.tourJumpPending = function () {
  var s = S(), pn = pendingNow(s); if (!pn.ids.length) return;
  var id = pn.ids[0]; s.gOpen = id; flashId = id; jumpTo = id;
  if (isHidden(s)) NF.demoActions.tourToggle();
};
function firstSentence(t) {
  var txt = String(t || '').replace(/<[^>]+>/g, ''), m = txt.match(/^[\s\S]*?[.!?…](?:“)?(?=\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ„]|\s*$)/);
  return m ? m[0] : txt;
}
function plural(n, one, few, many) { return n === 1 ? one : n > 1 && n < 5 ? few : many; }
function progressBar(s, i, st) {
  var idx = sceneIdx(s), frac = st.length ? Math.min(i, st.length) / st.length : 1, ms = mainScenes(), groups = [];
  D.acts.forEach(function (a, ai) { groups.push({ label: a.title, scenes: ms.filter(function (x) { return D.chapters[D.scenes[x].ch].act === ai; }) }); });
  groups.push({ label: 'Dodatek', scenes: appendixScenes() });
  return '<p class="tour-progress-l" aria-hidden="true">Průběh: ' + e(position(s).label) + '</p><div class="tour-progress" role="img" aria-label="Průběh: ' + e(position(s).label) + '">' + groups.filter(function (g) { return g.scenes.length; }).map(function (g) {
    var done = 0; g.scenes.forEach(function (x) { if (x < idx) done += 1; else if (x === idx) done += frac; });
    return '<span class="' + (g.label === 'Dodatek' ? 'appx' : '') + '" style="--n:' + g.scenes.length + ';--pct:' + Math.round(done / g.scenes.length * 100) + '%" title="' + e(g.label + ' · ' + g.scenes.length + ' ' + plural(g.scenes.length, 'scéna', 'scény', 'scén')) + '"></span>';
  }).join('') + '</div>';
}
function head(collapsible) {
  return '<div class="tour-head"><span class="tour-head-t">Ovládání ukázky</span><span class="tour-info" tabindex="0" role="note" title="Fialová tlačítka ovládají ukázku. Petrolejová jsou tlačítka budoucí aplikace; ukázka je klepe za vás. Fialově podtečkované věci vysvětlí bublina po klepnutí." aria-label="Fialová tlačítka ovládají ukázku, petrolejová jsou tlačítka budoucí aplikace. Fialově podtečkované věci vysvětlí bublina po klepnutí.">i</span>' +
    (collapsible ? '<button type="button" class="tour-icon" data-action="tourToggle" aria-label="Sbalit panel" title="Sbalit panel">▾</button>' : '') + '</div>';
}
function panel(s) {
  var ch = chapter(s), st = steps(), i = s.tourStep || 0;
  var idx = sceneIdx(s), sc = D.scenes[idx], pos = position(s);
  if (away(s)) {
    /* V13 (23. 10. 2026): na telefonu list mimo příběh vždy jen jeden řádek, aby nezakrýval registr, ve kterém garant právě upravuje */
    if (isHidden(s)) return '<div class="tour-panel tour-min tour-away-min" role="region" aria-label="Ovládání ukázky"><span class="tour-min-t">Mimo příběh · ' + e(pageName(s)) + '</span>' + (phone() ? '' : btn('Zobrazit vyprávění', 'tourToggle')) + btn('Zpět do příběhu ▶', 'tourReturn', null, 'primary') + '</div>';
    return '<aside class="tour-panel tour-away" aria-live="polite" aria-label="Vyprávění k ukázce">' + head(true) + '<div class="tour-body"><p class="tour-kicker">Mimo příběh</p><h2>Prohlížíte ' + e(pageName(s)) + '</h2>' +
      '<p class="small">' + e(pos.label) + ' „' + e(sceneTitle(s)) + '“ na vás počká. Rozhodnutí, která tu uděláte, platí i v příběhu.</p></div>' +
      '<div class="tour-foot">' + (panelMsg ? '<p class="tour-status" role="status">' + e(panelMsg) + '</p>' : '') + '<div class="tour-actions">' + btn('Zpět do příběhu ▶', 'tourReturn', null, 'primary') + '</div></div></aside>';
  }
  var hidden = isHidden(s); captureToast(s); /* S8: hlášky v příběhu patří do panelu (zachyceno už v liště; tady pro vykreslení mimo jádro) */
  if (ended) {
    return '<aside class="tour-panel tour-end" aria-live="polite" aria-label="Ovládání ukázky">' + head(false) + '<div class="tour-body"><h2>Ukázka skončila</h2><p>Děkujeme za váš čas. Vaše rozhodnutí jsou uložená; můžete okno zavřít.</p><p class="small">Rozhodnutí lze kdykoli změnit v registru (tlačítko „Ke schválení · zbývá …“, po dokončení „Vše rozhodnuto“, nahoře).</p></div>' +
      '<div class="tour-foot"><div class="tour-actions">' + btn('← Zpět do ukázky', 'tourUnfinish') + btn('Otevřít registr', 'openAside', 'registry', 'primary') + '</div></div></aside>';
  }
  var intro = (T.chapters[ch.id] || {}).intro || { t: ch.title, co: '' };
  var shown = running != null ? st[running] : (i > 0 ? st[i - 1] : intro);
  var last = idx >= lastIndex() && i >= st.length;
  var upcoming = i >= st.length && !last ? D.scenes[idx + 1] : null;
  var toAppendix = upcoming && upcoming.appendix && !(sc && sc.appendix);
  var nextStep = i < st.length ? st[i] : null, ids = D.decisionItems(idx);
  var finale = sc && !sc.appendix && ch.id === 'trace' && i >= st.length;
  var changedSince = prog.done && s.registry.history.some(function (h) { return h.kind !== 'comment' && h.rt && h.rt > prog.done; });
  var thanks = finale && prog.done && !changedSince;
  var pn = pendingNow(s), nPend = pn.ids.length;
  var label = busy ? 'Probíhá…' : idx === 0 && !nextStep ? 'Začít ukázku ▶' : 'Dál ▶';
  var nextOff = busy || last;
  var nextAttr = nextOff ? ' disabled' : (nPend || pn.summary) ? ' aria-disabled="true"' : '';
  var nextBtn = thanks ? btn('Skončit', 'tourFinish') + btn('Projít varianty v dodatku ▶', 'tourNext', null, 'primary', busy ? ' disabled' : '') :
    finale && pn.summary ? (confirmAsk ? confirmButtons() : btn('Potvrdit souhrn', 'garantConfirmSummary', null, 'primary', busy ? ' disabled' : '')) : /* V4: ve finále je jedinou akcí panelu potvrzení souhrnu; V16: s nerozhodnutými položkami nejdřív otázka */
    last ? btn('Skončit', 'tourFinish', null, 'primary') : btn(e(label), 'tourNext', null, 'primary' + (nPend || pn.summary ? ' is-blocked' : ''), nextAttr);
  var jump = nPend && !busy ? '<button type="button" class="tour-status-link" data-action="tourJumpPending">Rozhodněte ' + nPend + ' ' + plural(nPend, 'položku', 'položky', 'položek') + (isHidden(s) ? ' v panelu' : ' výše ↑') + '</button>' : '';
  /* V14 (23. 10. 2026): název scény nad tlačítky, řádek ← · Rozbalit · Dál ▶ s Dál vpravo */
  if (hidden) return '<div class="tour-panel tour-min" role="region" aria-label="Ovládání ukázky"><span class="tour-min-t">' + e(thanks ? 'Děkujeme, máme vaše rozhodnutí' : finale ? 'Souhrn vašich rozhodnutí' : (shown.t || sceneTitle(s))) + '</span><div class="tour-min-row">' + btn('←', 'tourBack', null, '', busy ? ' disabled' : ' aria-label="Zpět"') + btn('Rozbalit', 'tourToggle') + (jump || nextBtn) + '</div></div>';
  var collapse = (nPend > 0 && i > 0 || finale) && !busy && !moreOpen; /* když čeká rozhodnutí (nebo je hotovo), vyprávění jen nadpisem a jednou větou */
  var narration = collapse ? '<p class="tour-lead">' + e(firstSentence(val(shown.co) || val(shown.vsimni) || '')) + '</p><button type="button" class="tour-link" data-action="tourMore" aria-expanded="false">Více k tomuto kroku</button>' :
    '<dl class="tour-rows">' + rows(shown) + '</dl>' + ((nPend > 0 || finale) && moreOpen ? '<button type="button" class="tour-link" data-action="tourMore" aria-expanded="true">Méně</button>' : '');
  /* V12: po potvrzení je poděkování první, vyprávění až pod ním (na telefonu by jinak bylo pod listem) */
  var body = (finale && thanks ? thanksBlock(s, false) : '') + narration + (i === 0 ? actOverview(s, idx) + sceneIntroHint(s, ids) + prevSceneOff(s, idx, ids) : '') + (finale ? (thanks ? '' : summarySide(s, changedSince)) : approvalsBlock(s, idx, i, st));
  var sub = busy ? '' : nextStep ? 'Dál: ' + nextStep.t : upcoming ? (toAppendix ? (finale && pn.summary ? 'Po potvrzení: dodatek s ' : 'Dál: dodatek s ') + appendixScenes().length + ' variantami, asi 4 minuty' : 'Dál: scéna „' + (upcoming.title || D.chapters[upcoming.ch].title) + '“') : last ? 'Konec dodatku. Rozhodnutí můžete dál měnit v registru.' : '';
  var kicker = finale ? 'Souhrn rozhodnutí' : running != null ? 'Krok ' + (running + 1) + ' z ' + st.length : i === 0 ? (idx === 0 ? 'Začátek ukázky' : 'Začátek scény') : 'Krok ' + i + ' z ' + st.length;
  return '<aside class="tour-panel' + (finale ? ' tour-decide' : '') + (nPend ? ' tour-pending' : '') + '" aria-label="Ovládání ukázky">' + head(true) +
    '<div class="tour-body" aria-live="polite"><p class="tour-kicker">' + e(kicker) + '</p>' + (whereNow(s) ? '<p class="tour-where">' + e(whereNow(s)) + '</p>' : '') + '<h2>' + e(shown.t || sceneTitle(s)) + '</h2>' + body +
    (idx === 1 ? '<p class="tour-hint">Ovládejte ukázku jen fialovými tlačítky v tomto panelu. Petrolejová tlačítka ' + (D.narrow() ? 'nahoře' : 'vlevo') + ' jsou skutečná tlačítka budoucí aplikace; ukázka je klepe za vás.</p>' : '') + /* S12: od scény 2; úvod to říká sám */
    (returnTo && !busy ? '<p class="tour-next">Přišli jste sem z registru (položka ' + e(returnTo.item) + ').</p>' : '') + '</div>' +
    '<div class="tour-foot">' + (panelMsg ? '<p class="tour-status" role="status">' + e(panelMsg) + '</p>' : '') + jump +
    (sub ? '<p class="tour-next">' + e(sub) + '</p>' : '') +
    '<div class="tour-actions">' + (returnTo && !busy ? btn('← Zpět do registru', 'regReturn') : '') + btn('← Zpět', 'tourBack', null, '', busy || (idx === 0 && i === 0) ? ' disabled' : '') + nextBtn + '</div>' +
    progressBar(s, i, st) + '</div></aside>';
}
/* „Kde je použita“: v registru odkazy na scény příběhu; v panelu vyprávění jen text, aby garanta nevytrhly z průchodu (S5). */
NF.slots.itemWhere = function (s, id) {
  var where = [];
  (D.sceneItems || []).forEach(function (sc, i) { if ((sc.items || []).indexOf(id) >= 0) where.push(i); });
  var manual = D.itemScene[id] ? mainSceneOf(D.itemScene[id]) : -1; if (manual >= 0 && where.indexOf(manual) < 0) where.unshift(manual);
  if (!where.length) return '<p class="small muted">V příběhu bez vlastního štítku; rozhoduje se ve finále.</p>';
  var name = function (i) { return (D.scenes[i].title || D.chapters[D.scenes[i].ch].title); };
  if (inPanel) return '<p class="small">V příběhu: ' + e(where.map(function (i) { return name(i); }).join(' · ')) + '.</p>';
  return '<p class="small">V příběhu:</p><div class="buttonlist">' + where.map(function (i) { return btn((i + 1) + '. ' + name(i), 'goSceneFrom', i + ':' + id, 'sm'); }).join('') + '</div><p class="small muted">Ze scény se vrátíte tlačítkem „Zpět do registru“ v panelu.</p>';
};
/* Z registru na místo v příběhu a zpět (12. 10. 2026): panel nabídne návrat k položce, odkud garant přišel. */
var returnTo = null;
NF.demoActions.goSceneFrom = function (v) { var p = String(v).split(':'); returnTo = { item: p[1] }; land(D.playScene(Number(p[0]))); NF.closeDrawer(); };
NF.demoActions.regReturn = function () { var id = returnTo && returnTo.item; returnTo = null; NF.demoActions.openAsideItem(id); };
D.returnTo = function () { return returnTo; };
/* Průvodce položkou pro vysvětlující bublinu (demo/explain.js): „Kde je použita“ jen textem, aby odkaz garanta nevytrhl ze scény. */
D.itemGuideHtml = function (s, r) { inPanel = true; try { return NF.screens.itemGuide(s, r); } finally { inPanel = false; } };
NF.demoActions.garantOpen = function (v) { var s = S(); s.gOpen = s.gOpen === v ? null : v; };
NF.demoActions.openAsideItem = function (v) { var s = S(); panelMsg = ''; s.role = 'doctor'; s.page = 'registry'; s.reg = s.reg || {}; s.reg.open = v; s.reg.editing = false; s.reg.params = null; NF.closeDrawer(); };
function decorate() {
  var s0 = S(), gsum = summaryActive(s0);
  if (doc.body) { var hidden = isHidden(s0), locked = !away(s0) && !hidden && !gsum; lastLayout = layoutKey(); doc.body.className = doc.body.className.replace(/\bpres-\w+/g, '').trim() + ' pres-' + s0.role + (locked ? ' pres-locked' : '') + (hidden ? '' : ' pres-panel') + (gsum ? ' pres-summary' : ''); } /* stránka souhrnu není zamčená: garant v ní rozhoduje (V4) */ /* pres-panel = panel vyprávění je rozbalený (demo.css mu dělá místo) */
  if (!animated()) return;
  var old = doc.querySelectorAll('.tour-focus,.tour-watch,.tour-press');
  for (var k = 0; k < old.length; k++) old[k].classList.remove('tour-focus', 'tour-watch', 'tour-press');
  var f = gsum ? null : find(focusSel); if (f) f.classList.add('tour-focus'); /* cíl posledního kroku („table“ stopy) na stránce souhrnu neplatí */
  var w = !busy && !gsum ? find(watchSel) : null; if (w) w.classList.add('tour-watch');
  var p = find(pressSel); if (p) p.classList.add('tour-press');
}
var prevAfter = NF.slots.afterRender;
function measureBar() {
  try { var bar = doc && doc.querySelector && doc.querySelector('.pres-bar'); if (bar && doc.documentElement && doc.documentElement.style) doc.documentElement.style.setProperty('--barh', (bar.offsetHeight || 64) + 'px'); } catch (err) { }
}
/* Odkaz „Rozhodněte N položek výše ↑“: odroluje panel k první nerozhodnuté položce a krátce ji zvýrazní. */
function jumpAfterRender() {
  if (!jumpTo || !doc || typeof doc.querySelector !== 'function') { jumpTo = null; return; }
  var id = jumpTo; jumpTo = null;
  var el = null; try { el = doc.querySelector('.tour-panel [data-gitem="' + id + '"]'); } catch (err) { el = null; }
  if (!el) return;
  try { el.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); } catch (err) { }
  var h = el.querySelector && el.querySelector('.gh'); if (h && h.focus) { try { h.focus({ preventScroll: true }); } catch (err) { } }
  global.setTimeout(function () { flashId = null; if (el.classList) el.classList.remove('gflash'); }, 1800);
}
/* ---------- panel vyprávění v DOM až za #app (přístupnost 23. 10. 2026, nález 10) ----------
   Vizuálně je panel přilepený (position:fixed), ale Tab z lišty DEMO jde nejdřív obrazovkou aplikace a pak do panelu, jak je to vidět.
   Překresluje se stejným morphem jako jádro (jen co se změnilo: fokus v komentáři a rolování panelu zůstávají); stav <details> podle textu summary. */
function tourRoot() {
  var el = doc && doc.getElementById ? doc.getElementById('tour') : null;
  if (!el && doc && doc.createElement) {
    var app = doc.getElementById('app'); if (!app || !app.parentNode) return null;
    el = doc.createElement('div'); el.id = 'tour'; app.parentNode.insertBefore(el, app.nextSibling);
  }
  return el;
}
function morphNode(from, to) {
  if (from.nodeType === 3 && to.nodeType === 3) { if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue; return; }
  if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) { from.parentNode.replaceChild(to.cloneNode(true), from); return; }
  if (from.nodeType !== 1) return;
  var i, a = from.attributes, b = to.attributes;
  for (i = a.length - 1; i >= 0; i--) if (!to.hasAttribute(a[i].name)) from.removeAttribute(a[i].name);
  for (i = 0; i < b.length; i++) if (from.getAttribute(b[i].name) !== b[i].value) from.setAttribute(b[i].name, b[i].value);
  if (from.nodeName === 'INPUT' || from.nodeName === 'TEXTAREA') { if (doc.activeElement !== from && from.value !== to.value) from.value = to.value; from.disabled = to.disabled; }
  if (from.nodeName === 'BUTTON') from.disabled = to.disabled;
  morphKids(from, to);
}
function morphKids(from, to) {
  var tcs = Array.prototype.slice.call(to.childNodes), fcs = Array.prototype.slice.call(from.childNodes);
  for (var i = 0; i < tcs.length; i++) { if (!fcs[i]) { from.appendChild(tcs[i].cloneNode(true)); continue; } morphNode(fcs[i], tcs[i]); }
  for (var j = fcs.length - 1; j >= tcs.length; j--) from.removeChild(fcs[j]);
}
function renderPanel(s) {
  var el = tourRoot(); if (!el) return;
  var html = (D.auth && !D.auth.session()) ? '' : D.nbspHtml(panel(s));
  if (!html) { el.innerHTML = ''; return; }
  if (typeof doc.createElement === 'function' && el.firstChild && el.querySelectorAll) {
    var tmp = doc.createElement('div'); tmp.innerHTML = html;
    try {
      var open = {}, count = {}, seen = {};
      el.querySelectorAll('details').forEach(function (d) { var sm = d.querySelector('summary'), k = sm ? sm.textContent : ''; count[k] = (count[k] || 0) + 1; if (d.open) open[k + '#' + count[k]] = 1; });
      tmp.querySelectorAll('details').forEach(function (d) { var sm = d.querySelector('summary'), k = sm ? sm.textContent : ''; seen[k] = (seen[k] || 0) + 1; if (open[k + '#' + seen[k]]) d.setAttribute('open', ''); });
      morphKids(el, tmp);
    } catch (err) { el.innerHTML = html; }
  } else el.innerHTML = html;
}
D.panelHtml = function (s) { return panel(s || S()); };
function panelToTop() { if (!panelTop) return; panelTop = false; try { var b = doc.querySelector('.tour-panel .tour-body'), pn = doc.querySelector('.tour-panel'); if (b) b.scrollTop = 0; if (pn) pn.scrollTop = 0; } catch (err) { } }
NF.slots.afterRender = function (s) { if (prevAfter) prevAfter(s); renderPanel(s); decorate(); measureBar(); jumpAfterRender(); panelToTop(); };
/* Přihlašovací brána kreslí #app sama a háček afterRender nevolá: panel za #app se musí vyprázdnit. */
var gateRender = NF.render;
NF.render = function () { gateRender(); if (D.auth && !D.auth.session()) { var t = tourRoot(); if (t) t.innerHTML = ''; } };
var lastLayout = '';
function layoutKey() { return (D.narrow() ? 'n' : 'w') + (isHidden() ? 'h' : 's'); }
if (global.addEventListener) global.addEventListener('resize', function () { measureBar(); if (layoutKey() !== lastLayout) NF.render(); }); /* texty a sbalení panelu podle šířky */

/* ---------- bublina při klepnutí do zamčené obrazovky (S4, 21. 10. 2026; upraveno 26. 10. 2026) ----------
   Zamčení zůstává, jak bylo: main má v příběhu pointer-events:none, klepnutí do něj žádnou akci aplikace nespustí (cílem je #app nebo body).
   Co leží pod prstem, zjistíme na okamžik zapnutou třídou pres-probe (demo.css vrátí main zásah jen pro elementFromPoint, akce se nespustí).
   Bublina se ukáže jen u ovládacího prvku aplikace (D.CONTROL_SEL); klepnutí do prázdna nic neukáže (vlastník 26. 10. 2026).
   Vysvětlený prvek (demo/explain.js) má přednost: ukáže se vysvětlení, u ovládacího prvku s větou, že ho klepne ukázka.
   Hláška o klepání zmizí po 3 s; trvalá živá oblast mimo #app (morph ji nepřepíše). */
var bubbleTimer = null, BUBBLE_MS = 3000;
D.CONTROL_SEL = D.CONTROL_SEL || 'button,a,input,select,textarea,label,summary,[data-action],[data-bind],[role=button],[role=switch],[role=tab]';
D.lockBubbleText = function () { return 'Tohle za vás klepne ukázka. Pokračujte v panelu ' + (D.narrow() ? 'dole' : 'vpravo') + '.'; };
function bubbleEl() {
  var el = doc && doc.getElementById ? doc.getElementById('lock-bubble') : null;
  if (!el && doc && doc.createElement && doc.body && doc.body.appendChild) {
    el = doc.createElement('div'); el.id = 'lock-bubble'; el.className = 'lock-bubble';
    el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); el.setAttribute('aria-atomic', 'true'); doc.body.appendChild(el);
  }
  return el;
}
function hideBubble() { var el = bubbleEl(); bubbleTimer = null; if (!el) return; el.innerHTML = ''; if (el.classList) el.classList.remove('on', 'above'); }
D.hideLockBubble = function () { if (bubbleTimer && global.clearTimeout) global.clearTimeout(bubbleTimer); hideBubble(); };
/* Prvek pod souřadnicemi i v zamčeném main: třída pres-probe platí jen po dobu jednoho volání elementFromPoint. */
function probe(x, y) {
  var b = doc.body; if (!doc.elementFromPoint) return null;
  var c0 = b.className || ''; b.className = c0 + ' pres-probe';
  try { return doc.elementFromPoint(x, y); } finally { b.className = c0; }
}
function closestSel(el, sel) { try { return el && el.closest ? el.closest(sel) : null; } catch (err) { return null; } }
D.lockedTap = function (ev) {
  var b = doc && doc.body; if (!ev || !b || !/(^|\s)pres-locked(\s|$)/.test(b.className || '')) return false;
  var OUT = '.tour-panel,.tour-min,.pres-bar,#overlay,.drawer,.pres-drawer,.lock-bubble,.gsum-page,#lock-bubble,#explain-bubble';
  var t = ev.target; if (closestSel(t, OUT)) return false;
  var m = doc.querySelector ? doc.querySelector('main') : null; if (!m || !m.getBoundingClientRect) return false;
  var rc = m.getBoundingClientRect(), x = ev.clientX, y = ev.clientY;
  if (!(x >= rc.left && x <= rc.right && y >= rc.top && y <= rc.bottom)) return false;
  var under = probe(x, y); if (!under || closestSel(under, OUT)) return false;
  if (m.contains && !m.contains(under)) return false; /* prázdné místo kolem obrazovky (#app, body) */
  var ctl = closestSel(under, D.CONTROL_SEL); if (ctl && m.contains && !m.contains(ctl)) ctl = null;
  var ex = closestSel(under, '[data-nf-explain]');
  if (ex && D.explainShow && D.explainShow(ex, x, y, !!ctl)) { D.hideLockBubble(); return true; }
  if (!ctl) return false; /* karta, text, pozadí: nic */
  var el = bubbleEl(); if (!el) return false;
  if (D.explainHide) D.explainHide(false);
  var vh = global.innerHeight || 0;
  el.innerHTML = e(NF.nbspText(D.lockBubbleText()));
  if (el.style && el.style.setProperty) { el.style.setProperty('--x', Math.round(x) + 'px'); el.style.setProperty('--y', Math.round(y) + 'px'); }
  if (el.classList) { el.classList.add('on'); el.classList.toggle('above', !!(vh && y > vh * 0.6)); }
  if (bubbleTimer && global.clearTimeout) global.clearTimeout(bubbleTimer);
  bubbleTimer = global.setTimeout(hideBubble, BUBBLE_MS);
  return true;
};
bubbleEl(); /* živá oblast musí existovat dřív, než do ní něco napíšeme */
if (doc && doc.addEventListener) doc.addEventListener('click', function (ev) {
  if (D.explainClick && D.explainClick(ev)) return; /* klepnutí do vysvětlující bubliny; klepnutí jinam ji zavře */
  if (ev.detail === 0) return; /* klávesnicí vyvolaný klik bublinu neukazuje */
  if (!D.lockedTap(ev) && D.explainTap) D.explainTap(ev); /* mimo zamčení vysvětlí neovládací prvek */
}, true); /* zachytávací fáze: cíl je ještě v DOM, než ho akce překreslí */

/* ---------- panel prezentujícího ---------- */
function branchPicker(s, key) {
  var b = D.branches[key], cur = (s.branches || D.defaults)[key];
  return '<h4>' + e(b.label) + '</h4><div class="buttonlist">' + b.options.map(function (o) { return '<button type="button" class="btn ' + (cur === o.id ? 'selected' : '') + '" data-action="setBranch" data-value="' + e(key + ':' + o.id) + '">' + e(o.label) + '</button>'; }).join('') + '</div>';
}
/* Přehled scén (V7, 19. 10. 2026): garant tu nemá jinou navigaci po scénách, proto nahoře seznam se stavem
   hotové / tady / zbývá a počtem položek ke schválení, dodatek jako vlastní oddíl na konci, nástroje prezentujícího sbalené. */
function sceneRow(s, si, here) {
  var sc = D.scenes[si], ids = D.decisionItems(si), open = ids.filter(function (id) { return !gTouched(id); }).length;
  var state = si === here ? 'here' : si <= (prog.max || 0) ? 'done' : 'todo', word = { here: 'tady', done: 'hotové', todo: 'zbývá' }[state];
  var mark = { here: '▶', done: '✓', todo: '○' }[state];
  return '<button type="button" class="btn scene-row ' + state + '" data-action="goScene" data-value="' + si + '"' + (state === 'here' ? ' aria-current="step"' : '') + '><span class="sr-mark" aria-hidden="true">' + mark + '</span><span class="sr-t">' + e(sc.title || D.chapters[sc.ch].title) + '</span><span class="sr-s">' + word + (open ? ' · ke schválení ' + open : '') + '</span></button>';
}
function presenterPanel(s) {
  var here = sceneIdx(s);
  var out = '<div class="pres-drawer"><h2>Přehled scén</h2><p class="small muted">Skok na scénu přehraje příběh od začátku, takže stav je vždy stejný, jako kdybyste ukázku prošli tlačítkem Dál. Vaše rozhodnutí zůstávají.</p>';
  D.acts.forEach(function (a, ai) {
    var list = D.scenes.map(function (sc, si) { return si; }).filter(function (si) { return !D.scenes[si].appendix && D.chapters[D.scenes[si].ch].act === ai; });
    if (!list.length) return;
    out += '<h3>' + e(a.title) + '</h3>' + (ai ? '<p class="small muted">' + e(a.note) + '</p>' : '') + '<div class="buttonlist">' + list.map(function (si) { return sceneRow(s, si, here); }).join('') + '</div>';
    if (D.garantQuestions[ai] && D.garantQuestions[ai].length) out += '<details class="more"><summary>Otázky k tomuto scénáři</summary><ul class="plain small">' + D.garantQuestions[ai].map(function (q) { return '<li>' + e(q) + '</li>'; }).join('') + '</ul></details>';
  });
  var ap = appendixScenes();
  if (ap.length) out += '<h3>Dodatek: varianty</h3><p class="small muted">Po potvrzení souhrnu. Co se stane, když zaučení nevyjde nebo pacient rady nepřijme.</p><div class="buttonlist">' + ap.map(function (si) { return sceneRow(s, si, here); }).join('') + '</div>';
  out += '<h3>Schvalování</h3><div class="buttonlist">' + btn('Ke schválení (registr)', 'openAside', 'registry') + btn('Verze a stopa', 'openAside', 'trace') + '</div>';
  out += '<details class="more pres-tools"><summary>Pro prezentujícího</summary>';
  Object.keys(D.branches).forEach(function (k) { out += branchPicker(s, k); });
  out += '<h4>Přepnout roli (mimo příběh)</h4><div class="buttonlist">' + [['patient', 'Pacient'], ['doctor', 'Lékař'], ['nurse', 'Sestra']].map(function (r) { return btn(r[1] + (s.role === r[0] ? ' · teď' : ''), 'role', r[0]); }).join('') + '</div>' +
    '<h4>Modelový čas</h4><div class="actions">' + btn('+ 1 den', 'shiftTime', '1') + btn('+ 7 dní', 'shiftTime', '7') + btn('Scénu znovu', 'tourRestart') + '</div>' +
    '<label class="field"><span>Poznámky z ukázky</span><textarea data-bind="notes">' + e(s.notes || '') + '</textarea></label>' +
    '<div class="actions">' + btn('Vrátit na začátek', 'resetDemo') + (glog.length ? btn('Smazat rozhodnutí garanta (' + glog.length + ')', 'garantResetAsk', 'yes', 'danger') : '') + '</div>' +
    (resetAsk && glog.length ? '<div class="pres-confirm" role="alert"><p class="small">Smaže ' + glog.length + ' ' + plural(glog.length, 'vaše rozhodnutí', 'vaše rozhodnutí', 'vašich rozhodnutí') + ' v tomto prohlížeči; na serveru zůstanou.</p><div class="actions">' + btn('Ano, smazat', 'garantReset', null, 'danger') + btn('Ne', 'garantResetAsk', 'no') + '</div></div>' : '') +
    '</details>';
  out += '<div class="actions mt-3">' + (D.auth && D.auth.session() ? btn('Odhlásit · ' + D.auth.label(), 'authLogout') : '') + btn('Zavřít', 'closeDrawer', null, 'primary') + '</div></div>';
  return out;
}
/* S2: stav ukládání v hlavičce registru až po prvním rozhodnutí garanta (sync.js ho jinak ukazuje hned, i se záznamy průchodu). */
var coreSyncStatus = NF.slots.syncStatus;
if (coreSyncStatus) NF.slots.syncStatus = function (s) { return glog.length ? coreSyncStatus(s) : ''; };
var prevDrawer = NF.slots.drawer;
/* N18: zásuvka jde mimo vykreslení jádra, sazbu (NF.nbsp) jí dodáme sami; obsah textového pole se nemění. */
D.nbspHtml = function (html) { return String(html).split(/(<textarea[\s\S]*?<\/textarea>)/).map(function (part, k) { return k % 2 ? part : NF.nbsp(part); }).join(''); };
NF.slots.drawer = function (s, name) { if (name === 'presenter') return D.nbspHtml(presenterPanel(s)); return prevDrawer ? prevDrawer(s, name) : ''; };

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
NF.demoActions.openAside = function (v) { var s = S(); panelMsg = ''; s.role = 'doctor'; s.page = v; NF.closeDrawer(); };
NF.demoActions.shiftTime = function (v) { var n = Number(v); if (!isFinite(n)) return; var s = S(); s.clock = NF.addDays(s.clock, Math.round(n)); s.toast = 'Modelový čas: ' + NF.fmtShort(s.clock); };
NF.demoActions.resetDemo = function () { land(D.playScene(0)); say('Ukázka začíná znovu od úvodu.'); NF.closeDrawer(); };

if (doc && doc.addEventListener) doc.addEventListener('keydown', function (ev) {
  var t = ev.target && ev.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || NF.currentDrawer()) return;
  if (ev.key === 'ArrowRight') { ev.preventDefault(); NF.act('tourNext'); }
  if (ev.key === 'ArrowLeft') { ev.preventDefault(); NF.act('tourBack'); }
});
T.isBusy = function () { return busy; };
T.lastIndex = lastIndex;

/* Nová verze makety zahodí rozehraný průchod (stav se nepřevádí); garantovi to řekneme jednou větou – rozhodnutí k položkám jsou na serveru a načtou se zpět (18. 10. 2026). */
var migratedFrom = NF.migrated;
if (S().registry) S().registry.items.forEach(function (r) { if (D.guide && D.guide[r.id]) r.guide = D.guide[r.id]; }); /* po načtení ze zařízení zase průvodce s čísly z parametrů */
if (S().doctor) S().doctor.label = 'Modelový lékař 01';
if (!S().chapter) land(D.playScene(0)); else {
  /* V10 (23. 10. 2026): po obnovení stránky se dopočítá zvýraznění cíle posledního kroku, stav i rozhodnutí už v úložišti jsou */
  try { var st0 = steps(), i0 = S().tourStep || 0; if (i0 > 0 && st0[i0 - 1]) { focusSel = lastFocus(st0[i0 - 1]); watchSel = st0[i0 - 1].watch || null; } } catch (err0) { focusSel = null; watchSel = null; }
  NF.render(); reveal(find(watchSel) || find(focusSel), true);
}
if (migratedFrom) { say('Maketa byla aktualizována, příběh začíná od začátku. Vaše rozhodnutí k položkám zůstala uložena.'); NF.render(); }

})(typeof window !== 'undefined' ? window : globalThis);
