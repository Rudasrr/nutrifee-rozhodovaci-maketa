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
function sceneTitleAt(i) { var sc = D.scenes[i]; return sc ? (sc.title || D.chapters[sc.ch].title) : ''; }

/* ---------- rozhodnutí garanta: přežijí přehrání scény ---------- */
var GKEY = 'nutrifee-garant', glog = [];
try { glog = JSON.parse(global.localStorage && global.localStorage.getItem(GKEY) || '[]') || []; } catch (err) { glog = []; }
/* SCHEMA 72 (27. 10. 2026): platí jen rozhodnutí Schválit/Zamítnout a poznámky; starší „upraveno“ a „komentář“ z testování se neuplatní (vlastník testovací data maže). */
function validEntry(d) { return !!(d && d.item && (d.kind === 'note' || (d.kind === 'decision' && (d.status === 'approved' || d.status === 'rejected')))); }
glog = glog.filter(validEntry);
/* 31/03 B6 (1. 11. 2026): „Smazat rozhodnutí garanta“ zapíše značku resetu { at, seq, client }. Záznam deníku starší než značka se nikde nevrátí:
   druhá karta při události storage s novou značkou deník nahradí, saveGlog ani sloučení (i obnova ze serveru) ho do deníku nepřidají.
   Starší = týž prohlížeč a oba se seq → seq menší než seq resetu; jinak čas záznamu (rt) nejvýš čas resetu. */
var RKEY = 'nutrifee-garant-reset';
function resetMark() { try { var m = JSON.parse(global.localStorage && global.localStorage.getItem(RKEY) || 'null'); return m && typeof m.at === 'string' ? m : null; } catch (err) { return null; } }
function beforeMark(d, m) {
  if (!m || !d) return false;
  if (m.client && d.client === m.client && typeof d.seq === 'number' && typeof m.seq === 'number') return d.seq < m.seq;
  return !d.rt || String(d.rt) <= m.at;
}
function afterMark(list) { var m = resetMark(); return m ? list.filter(function (d) { return !beforeMark(d, m); }) : list; }
glog = afterMark(glog);
/* Rozepsané poznámky (koncept podle položky) přežijí Zpět, skok na scénu i F5; neodesílají se. */
var DKEY = 'nutrifee-garant-drafts', drafts = {};
try { drafts = JSON.parse(global.localStorage && global.localStorage.getItem(DKEY) || '{}') || {}; } catch (err) { drafts = {}; }
if (!drafts || typeof drafts !== 'object' || Array.isArray(drafts)) drafts = {};
function saveDrafts() { try { global.localStorage && global.localStorage.setItem(DKEY, JSON.stringify(drafts)); } catch (err) { } }
/* Druhá karta změnila deník nebo koncepty (událost storage): deník se sloučí podle sid, koncepty mimo pole, ve kterém se právě píše. */
if (global.addEventListener) global.addEventListener('storage', function (ev) {
  try {
    if (ev.key === RKEY) { var rl = readStored(GKEY, []); if (Array.isArray(rl) && D.garantMerge) D.garantMerge(afterMark(rl.filter(validEntry)), { other: true, replace: true }); } /* 31/03 B6 */
    else if (ev.key === GKEY) { var list = readStored(GKEY, []); if (Array.isArray(list) && D.garantMerge) D.garantMerge(list.filter(validEntry), { other: true }); }
    else if (ev.key === DKEY) { var dd = readStored(DKEY, {}), a = doc && doc.activeElement, typing = a && a.getAttribute && a.getAttribute('data-gnote'); if (dd && typeof dd === 'object') { drafts = {}; Object.keys(dd).forEach(function (k) { drafts[k] = dd[k]; }); if (typing && hasDraft(typing) === false) { } NF.render(); } }
  } catch (err) { }
});
function hasDraft(id) { return Object.prototype.hasOwnProperty.call(drafts, id); }
/* Kontrola 4 (předávka ukládání, 05 A2): dvě karty se nepřepíšou – před zápisem se deník sloučí podle sid se stavem v úložišti. */
function readStored(key, fb) { try { var v = JSON.parse(global.localStorage && global.localStorage.getItem(key) || 'null'); return v == null ? fb : v; } catch (err) { return fb; } }
function bySid(list) { var seen = {}, out = []; list.forEach(function (d) { if (d && d.sid) { if (seen[d.sid]) return; seen[d.sid] = 1; } out.push(d); }); return out; }
/* Pořadí deníku jako na serveru (31 B2): záznamy téhož prohlížeče podle seq, jinak účinný čas (D.sync.sortEntries). */
function byRt(a, b) { var x = String(a.rt || ''), y = String(b.rt || ''); return x < y ? -1 : x > y ? 1 : 0; }
function sortLog(list) { if (D.sync && D.sync.sortEntries) { try { return D.sync.sortEntries(list); } catch (err) { } } return list.slice().sort(byRt); }
function saveGlog() {
  try {
    if (!global.localStorage) return;
    var stored = readStored(GKEY, []); if (!Array.isArray(stored)) stored = [];
    if (!resetting) { glog = afterMark(glog); stored = afterMark(stored); } /* 31/03 B6: smazaná rozhodnutí z jiné karty se nevrátí */
    var mine = {}; glog.forEach(function (d) { if (d.sid) mine[d.sid] = 1; });
    var extra = stored.filter(function (d) { return validEntry(d) && d.sid && !mine[d.sid]; });
    /* v úložišti sjednocení; deník v paměti doplní až D.garantMerge (událost storage, obnova) – ten scénu přehraje, aby registr odpovídal */
    global.localStorage.setItem(GKEY, JSON.stringify(extra.length && !resetting ? sortLog(bySid(glog.concat(extra))) : glog));
  } catch (err) { }
}
var resetting = false;
/* Rozhodnutí garanta se uplatní hned po základních kulisách, dřív než kapitoly spočítají report a návrhy (6. 10. 2026). */
function applyGarant(n) {
  if (n.doctor) n.doctor.label = 'Modelový lékař 01'; /* N1 (19. 10. 2026): garant si nemá myslet, že modelový lékař je on */
  glog.forEach(function (d) { NF.applyDecision(n, d, true); }); return n;
}
D.beforePlay = applyGarant;
/* Každé nové rozhodnutí i komentář – z panelu vyprávění i přímo z registru – jde do deníku garanta; přehrání scény (quiet) háček nevolá (oprava 7. 10. 2026: dřív se rozhodnutí z registru po skoku na scénu ztrácela). */
NF.onDecision(function (S0, d) { if (d.scene == null && S0 && S0.sceneIndex != null) d.scene = S0.sceneIndex + 1; /* 31 B1: ve které scéně garant rozhodl */ glog.push(d); saveGlog(); });
/* Zápisy ze serveru po přihlášení (demo/sync.js restore): přidá jen ty, které tu podle sid nejsou, seřadí podle skutečného času a přehraje scénu. */
/* Kontrola 4 (předávka ukládání): { replace: true } nahradí deník seznamem (reset z jiného zařízení); „Ukázka skončila“ se obnovou nemění;
   hláška podle toho, zda jde o přihlášení, nebo o rozhodnutí z jiného okna či zařízení. */
var mergedOnce = false;
D.garantMerge = function (list, opts) {
  opts = opts || {};
  var have = {}; glog.forEach(function (d) { if (d.sid) have[d.sid] = 1; });
  var valid = afterMark((list || []).filter(function (d) { return validEntry(d) && d.sid && NF.item(S(), d.item); }));
  var add = valid.filter(function (d) { return !have[d.sid]; });
  var drop = opts.replace ? glog.filter(function (d) { return d.sid && !valid.some(function (v) { return v.sid === d.sid; }); }).length : 0;
  if (!add.length && !drop) { mergedOnce = true; return 0; }
  glog = sortLog(opts.replace ? valid.slice() : glog.concat(add));
  saveGlog();
  var wasEnded = ended; if (!busy) { land(D.playScene(sceneIdx(S()))); if (wasEnded) setEnded(true); }
  say(!opts.other && (!mergedOnce || opts.login) ? 'Načteno ' + add.length + ' dřívějších rozhodnutí z vašeho přihlášení.' : 'Načtena rozhodnutí z jiného okna nebo zařízení (' + (add.length + drop) + ').');
  mergedOnce = true; NF.render(); return add.length;
};
/* Stav fronty se změnil (odeslání, výpadek, jiná karta): překreslit lištu, panel a konec ukázky; jen jednou za chvíli. */
var syncRerender = null;
if (D.sync && typeof D.sync.onChange === 'function') D.sync.onChange(function () { if (syncRerender || !global.setTimeout) return; syncRerender = global.setTimeout(function () { syncRerender = null; try { if (!busy) NF.render(); } catch (err) { } }, 150); });
/* Odhlášení: deník garanta zmizí z tohoto prohlížeče (na serveru zůstává) a příběh začne od začátku. */
D.garantClear = function () { glog = []; resetting = true; saveGlog(); resetting = false; drafts = {}; saveDrafts(); if (D.progressClear) D.progressClear(); land(D.playScene(0)); };
/* Kosm. 11 (27. 10. 2026): „Ukázka skončila“ přežije F5 (dřív se panel vrátil na poslední krok). */
var EKEY = 'nutrifee-ended', ended = false;
try { ended = !!(global.localStorage && global.localStorage.getItem(EKEY) === '1'); } catch (err) { ended = false; }
function setEnded(v) { ended = !!v; try { if (global.localStorage) { if (ended) global.localStorage.setItem(EKEY, '1'); else global.localStorage.removeItem(EKEY); } } catch (err) { } }
function land(n) { kept = null; cardHold = null; runId++; busy = false; openAfterRun = null; infoOpen = false; pinned = null; rejectAsk = null; if (returnTo && n.sceneIndex !== returnTo.scene) returnTo = null; showTrace = false; panelMsg = ''; setEnded(false); moreOpen = false; sumKeep = {}; sumRowTo = null; var s = S(); n.notes = s.notes || ''; n.tourRole = n.role; n.tourPage = n.page; focusSel = null; watchSel = null; running = null; NF.migrated = null; NF.setState(n); try { global.scrollTo(0, 0); } catch (err) { } try { if (n.sceneIndex != null) noteProgress(n.sceneIndex); } catch (err2) { } }
/* Kde v příběhu právě jsme vs. kam uživatel sám odešel (registr, jiná záložka). */
function markTour() { var s = S(); s.tourRole = s.role; s.tourPage = s.page; }
function away(s) { return !busy && running == null && !!(s.tourRole && (s.role !== s.tourRole || s.page !== s.tourPage)); } /* běžící krok, který přepne roli, není „mimo příběh“ (19. 10. 2026: panel na okamžik ukazoval „Mimo příběh“) */
/* B1 (27. 10. 2026): návrat do příběhu přehraje scénu po aktuální krok, takže obnoví i to, co se mimo příběh změnilo (zápis jídla, větev). */
/* M6 (kontrola 3): když garant z registru (mimo příběh) skočil odkazem „V příběhu: …“ do jiné scény a vrátil se „← Zpět do registru“,
   „Zpět do příběhu“ ho vrátí tam, kde v příběhu byl předtím (storyHome), jak slibuje panel „Mimo příběh“. Dál nebo Zpět ve scéně odkazu = garant
   pokračuje tam a storyHome zanikne. */
var storyHome = null;
NF.demoActions.tourReturn = function () {
  var s = S(); NF.closeDrawer(); if (!s.tourRole) return;
  if (storyHome && D.scenes[storyHome.scene]) { var h = storyHome; storyHome = null; returnTo = null; if (h.scene !== sceneIdx(s)) sceneLeave('skok', h.scene); replayTo(h.scene, h.step); return; }
  replayTo(sceneIdx(s), s.tourStep || 0);
};
function homeScene(s) { return storyHome && D.scenes[storyHome.scene] ? storyHome.scene : sceneIdx(s); }

/* ---------- rozhodovací kroky garanta (7. 10. 2026; B01 27. 10. 2026) ----------
   Položka se nabízí v kroku, v němž je po jeho provedení její štítek ve výřezu cíle kroku (sel / watch: karta, návrh, dlaždice, rada nebo část podkladů,
   ve které cíl leží). Mapu počítá generátor navrhy-designu/04-pohledy-2026-10-05/scene-items.cjs do demo/scene-items.js (targets: položka → po kolika krocích);
   hlídá ji pravdivost.test.cjs (T1, T2). D.itemScene: { ch, text } = položka bez štítku, nabídne se v kroku kapitoly ch, kde je věta text na obrazovce;
   { ch } bez textu = položka se štítkem, která se rozhoduje až v kapitole ch (první krok tam, kde je štítek ve výřezu cíle), ne při prvním výskytu
   (pokyny se štítkem v seznamu pokynů ve scéně 3 se rozhodují tam, kde působí: B01). { ch, step } = jako { ch }, ale nabídne se nejdřív po `step` krocích
   kapitoly (štítek tam musí být ve výřezu cíle; SCHEMA 75, B6: B-HYPO u karty po druhém poklesu, ne už u otázky). Zbytek jde do souhrnu ve finále. */
D.itemScene = {
  'I-MENE': { ch: 'afterBolus' }, 'I-NEVIM': { ch: 'afterBolus' }, /* pokyn na obrazovce po menší porci a po „Nevím“ (C07) */
  'B-HYPO': { ch: 'hypo', step: 5 }, 'I-HYPO': { ch: 'hypo' }, /* scéna „menší porce a pokles pod 4“ (C24, Q5); B-HYPO u karty „Druhý pokles za 7 dní“ (B6, SCHEMA 75) */
  'I-VYSOKA': { ch: 'lateMeal' }, /* karta „Nejvyšší hodnota po jídle nad 15“ ve zpětném zápisu (B2, SCHEMA 75) */
  'I-KONTAKT': { ch: 'doses', step: 6 }, /* M6 (kontrola 2): vlastní krok s řádkem kontaktů; v seznamu pravidel je 1300 px pod jeho začátkem */
  'D-CISTA': { ch: 'reviewProposals' }, /* seznam vyřazených zápisů v návrhu (B9, SCHEMA 75) */
  'D-POSTUP': { ch: 'reviewProposals', step: 7 }, /* C11 (kontrola 3): postupy se rozhodují, až garant viděl obě hlavní větve (bazál ponechat, snídaně zvýšit); v kroku 7 je štítek u voliče dávky, ve kterém leží cíl */
  'I-NEMOC-BAZAL': { ch: 'illness' }, 'I-NEMOC-JIDLO': { ch: 'illness' }, /* pokyny nahoře na Dnes po zapnutí „Není mi dobře“ */
  'P-LEKAR': { ch: 'issue', text: 'Aplikace vám mezi kontrolami nic neposílá' }, /* zásada bez štítku; věta je v hintu „Co se stane po vydání“ (N15). Nabídne se v kroku scény Vydání plánu, který hint ukazuje; jinak na konci scény */
  /* provozní položky (štítek nemají, garant je neschvaluje): jen pro „V příběhu“ v registru */
  'S-TYDEN': { ch: ['lateMeal', 'advice'], text: 'Váš 1. týden' },
  'Z-BODY': { ch: 'training', text: 'Náhled' },
  'J-STITKY': { ch: 'custom', text: 'Je to stejné jídlo jako' },
  'Z-IMPORT': { ch: 'reviewSummary', text: 'Export nahrán a převeden' } /* SCHEMA 74: hláška bez řeči o formátu */
};
var decisionPlanCache = {};
function mainSceneOf(chId) { for (var i = 0; i < D.scenes.length; i++) if (!D.scenes[i].appendix && D.chapters[D.scenes[i].ch].id === chId) return i; return -1; }
/* Kontrola 2 (29. 10. 2026, B2): zamítnutá položka odstraní z obrazovky i místa jiných položek (např. bez vyhodnocení reakce nejsou rady). Generátor mapy
   proto u každé scény ukládá i `alt`: mapu targets, jak vypadá při zamítnutí té položky. Při víc zamítnutích platí průnik (položka se nabídne jen tam,
   kde je vidět při každém z nich), krok nejpozdější. Zamítnutí = rozhodnutí garanta (deník), ne modelové vypnutí v příběhu. */
function rejectedIds() { var out = []; NF.garantItems(S()).forEach(function (r) { if (gStatus(r.id) === 'rejected') out.push(r.id); }); return out; }
function targetsWith(idx, R) {
  var sc = (D.sceneItems || [])[idx], base = (sc && sc.targets) || {}, alt = (sc && sc.alt) || {}, out = {};
  Object.keys(base).forEach(function (y) { out[y] = base[y]; });
  if (!(R || []).length) return out;
  var cand = {}; R.forEach(function (r) { Object.keys(alt[r] || base).forEach(function (y) { cand[y] = 1; }); }); Object.keys(out).forEach(function (y) { cand[y] = 1; });
  var res = {}; Object.keys(cand).forEach(function (y) {
    var maps = R.filter(function (r) { return r !== y; }).map(function (r) { return alt[r] || base; }); /* zamítnutá položka sama zůstává tam, kde se o ní rozhodlo */
    if (!maps.length) maps = [base];
    if (!maps.every(function (t) { return t[y] != null; })) return;
    res[y] = Math.max.apply(null, maps.map(function (t) { return t[y]; }));
  });
  return res;
}
function targetsOf(idx) { return targetsWith(idx, rejectedIds()); }
function decisionPlan(R) {
  var ids = NF.garantItems(S()).map(function (r) { return r.id; }), offered = {}, plan = D.scenes.map(function () { return []; });
  R = R || rejectedIds(); var key = ids.length + '|' + R.join(',');
  if (decisionPlanCache[key]) return decisionPlanCache[key];
  if (!ids.length) return plan; /* před načtením registru (první vykreslení) se nic neukládá */
  /* 1. první scéna hlavní linie, kde je štítek ve výřezu cíle (v pořadí kroků) */
  (D.sceneItems || []).forEach(function (sc, i) {
    if (!D.scenes[i] || D.scenes[i].appendix) return;
    var tg = targetsWith(i, R), chId = D.chapters[D.scenes[i].ch].id;
    Object.keys(tg).sort(function (x, y) { return tg[x] - tg[y]; }).forEach(function (id) {
      var m = D.itemScene[id]; if (m && m.ch && [].concat(m.ch).indexOf(chId) < 0) return; /* rozhoduje se až ve své kapitole */
      if (!offered[id] && ids.indexOf(id) >= 0) { plan[i].push(id); offered[id] = 1; }
    });
  });
  /* 2. položky bez štítku: scéna z D.itemScene (věta se nenašla → na konci scény) */
  ids.forEach(function (id) { var m = D.itemScene[id]; if (offered[id] || !m || !m.text) return; var i = mainSceneOf([].concat(m.ch || m)[0]); if (i >= 0) { plan[i].push(id); offered[id] = 1; } }); /* položka se štítkem, který zamítnutí jiné položky z obrazovky odstranilo, jde do souhrnu (B2) */
  /* 3. zbytek: souhrn ve finále */
  var fin = mainSceneOf('trace'); if (fin >= 0) ids.forEach(function (id) { if (!offered[id]) plan[fin].push(id); });
  decisionPlanCache[key] = plan; return plan;
}
/* M12: proč se položka v příběhu nenabídla a rozhoduje se až v souhrnu – zamítnutím které položky její místo zmizelo (null = příběh ji neukazuje vůbec). */
function movedBy(id) {
  var fin = mainSceneOf('trace'), R = rejectedIds(), base = decisionPlan([]), now = decisionPlan(R), was = -1, is = -1;
  base.forEach(function (l, i) { if (l.indexOf(id) >= 0) was = i; }); now.forEach(function (l, i) { if (l.indexOf(id) >= 0) is = i; });
  if (is !== fin || was === fin || was < 0) return null;
  return R.filter(function (r) { var t = targetsWith(was, [r]); return t[id] == null && r !== id; });
}
D.movedBy = movedBy;
/* Po kolika krocích scény se položka nabídne (Infinity = až na konci scény). */
function offerStep(idx, id) {
  var k = targetsOf(idx)[id]; if (k == null) return Infinity;
  var m = D.itemScene[id], sc = D.scenes[idx]; /* { ch, step }: ne dřív než po `step` krocích své kapitoly */
  if (m && m.step && sc && [].concat(m.ch).indexOf(D.chapters[sc.ch].id) >= 0) k = Math.max(k, m.step);
  return k;
}
D.offerStep = offerStep;
D.decisionItems = function (idx) { return (decisionPlan()[idx] || []).slice(); };
D.resetDecisionPlan = function () { decisionPlanCache = {}; };
/* ---------- karta položky (27. 10. 2026): dvě rozhodnutí, poznámka na místě ----------
   SCHEMA 83 (vlastník 2. 11. 2026): nejdřív Schválit / Zamítnout, pak se pod tlačítky ukáže pole „Proč jste schválili/zamítli? (nepovinné)“.
   Poznámka se ukládá sama už při psaní (po 1 s bez psaní, při opuštění pole a při zavření stránky); změna rozhodnutí poznámku zachová.
   Poznámka bez rozhodnutí v novém toku nevzniká (R14; starší záznamy note bez rozhodnutí se dál zobrazí). Bezpečnostní položky (V.SAFETY_ITEMS)
   se před zamítnutím ptají všude stejně; pole se ukáže po potvrzení. */
var rejectAsk = null, pinned = null;
function nowIso() { return new Date().toISOString(); }
function whereCtx(s) { return NF.currentDrawer && NF.currentDrawer() === 'decisions' ? 'zasuvka' : summaryActive(s) ? 'souhrn' : away(s) ? 'registr' : 'panel'; }
function fieldText(id) { return hasDraft(id) ? String(drafts[id]) : gNote(id); }
D.noteDraft = function (id, text) { drafts[id] = String(text == null ? '' : text); saveDrafts(); };
D.noteField = function (id) { return fieldText(id); };
/* Uloží koncept poznámky, pokud se liší od platné poznámky. Vrací true, když vznikl záznam. */
function saveNote(id) {
  var s = S(); if (!NF.item(s, id) || !hasDraft(id)) return false;
  var text = String(drafts[id]), had = gLast(id);
  if (!gStatus(id)) return false; /* SCHEMA 83: poznámka jen k rozhodnutí (pole se bez rozhodnutí neukazuje); koncept zůstane a odejde s rozhodnutím */
  if (text.length > NOTE_MAX) { say('Poznámka u „' + NF.item(s, id).title + '“ má ' + text.length + ' znaků; uložit jde nejvýš ' + NOTE_MAX + '. Zkraťte ji a uloží se sama.'); return false; } /* 31 B3 */
  delete drafts[id]; saveDrafts();
  if (text === gNote(id) && (had || !text)) return false;
  var res = NF.decideItem(s, id, null, text, { garant: true, note: true, status: gStatus(id), rt: nowIso(), where: whereCtx(s) });
  return !!res.ok;
}
D.saveNote = saveNote;
/* SCHEMA 83: uložení po krátké pauze v psaní (NOTE_IDLE_MS bez stisku klávesy); jedno uložení = jeden řádek na serveru, proto ne při každém znaku */
var NOTE_IDLE_MS = 1000, noteTimers = {};
function cancelNoteTimer(id) { if (noteTimers[id] && global.clearTimeout) global.clearTimeout(noteTimers[id]); delete noteTimers[id]; }
function armNoteTimer(id) {
  cancelNoteTimer(id); if (!global.setTimeout) return;
  noteTimers[id] = global.setTimeout(function () { delete noteTimers[id]; if (hasDraft(id)) { saveNote(id); setSavedLines(id); } }, NOTE_IDLE_MS);
}
D.NOTE_IDLE_MS = NOTE_IDLE_MS;
/* 31 C6: neuložené koncepty (liší se od platné poznámky) a uložení pole s kurzorem při zavírání stránky (sync.js beforeunload / pagehide) */
D.unsavedDrafts = function () { var s = S(); return Object.keys(drafts).filter(function (id) { return NF.item(s, id) && gStatus(id) && String(drafts[id]) !== gNote(id); }); }; /* SCHEMA 83: koncept k nerozhodnuté položce se neukládá, a tak se na něj prohlížeč neptá */
D.commitFocusedDraft = function () {
  var a = doc && doc.activeElement, id = a && a.getAttribute && a.getAttribute('data-gnote'); if (!id || a.value == null) return false;
  cancelNoteTimer(id); drafts[id] = String(a.value); saveDrafts(); return saveNote(id);
};
NF.demoActions.garantNote = function (id) { saveNote(id); };
NF.demoActions.garantDecide = function (v) {
  var p = String(v).split(':'), id = p[0], status = p[1], s = S();
  if (!NF.item(s, id) || (status !== 'approved' && status !== 'rejected')) return;
  var SAFE = (NF.screens && NF.screens.SAFETY_ITEMS) || {};
  if (status === 'rejected' && SAFE[id] && p[2] !== 'ano' && gStatus(id) !== 'rejected') { rejectAsk = id; s.gOpen = id; askFocus = id; if (whereCtx(s) === 'zasuvka') drawerFocus = id; return; } /* M7: potvrzení i v panelu, zásuvce a souhrnu; kontrola 4 (B2): fokus na „Ano, zamítnout“ */
  rejectAsk = null;
  if (String(fieldText(id)).length > NOTE_MAX) { say('Poznámka u „' + NF.item(s, id).title + '“ má ' + String(fieldText(id)).length + ' znaků; uložit jde nejvýš ' + NOTE_MAX + '. Zkraťte ji a rozhodněte znovu.'); return; } /* 31 B3: dlouhou poznámku by server odmítl i s rozhodnutím */
  var was = gStatus(id), r = NF.decideItem(s, id, status, fieldText(id), { garant: true, rt: nowIso(), where: whereCtx(s) });
  if (!r.ok) { s.error = r.error; return; }
  cancelNoteTimer(id); delete drafts[id]; saveDrafts();
  saveGlog();
  var ctx = whereCtx(s);
  /* SCHEMA 83 (vlastník 2. 11. 2026): karta zůstane otevřená a hned pod tlačítky je pole poznámky; fokus zůstane na zvoleném tlačítku */
  focusAfter = '[data-action="garantDecide"][data-value="' + id + ':' + status + '"]';
  if (ctx === 'zasuvka') { s.gOpen = id; drawerFocus = id; } /* M1: zásuvka odroluje ke kartě, která se po rozhodnutí přesunula do své skupiny */
  if (ctx === 'panel') { var nx = pendingNow(s).ids[0]; if (s.gOpen === id) s.gOpen = null; kept = { id: id, scene: sceneIdx(s), step: s.tourStep || 0 }; jumpTo = id; settleId = id; tagTo = nx || null; } /* v panelu zůstane rozhodnutá karta otevřená s polem poznámky a rozbalí se i další nerozhodnutá; obrazovka odroluje k jejímu štítku (M10) */
  if (ctx === 'souhrn') { s.gOpen = id; if (!was) sumKeep[id] = 1; sumRowTo = id; flashId = id; } /* M6: řádek zůstane na místě, otevřený s polem poznámky */
  if (ctx === 'registr') s.gOpen = id;
  confirmAsk = false;
  var r0 = NF.item(s, id), nm = r0 ? '„' + r0.title + '“' : id;
  /* SCHEMA 83 (koordinátor 2. 11. 2026): hláška po rozhodnutí stav uložení neříká – zastarala by (zůstává v patičce, i když řádek mezitím došel na server).
     Pravdivý stav ukládání je jen pod polem poznámky (setSavedLines, překreslení při D.sync.onChange) a v liště. */
  say((status === 'rejected' ? rejectedMsg(s, id) : was === 'rejected' ? 'Schváleno: ' + nm + '. Část zase funguje.' : 'Schváleno: ' + nm + '. Zapsáno do historie.'));
};
var askFocus = null, focusAfter = null;
NF.demoActions.garantRejectCancel = function () { rejectAsk = null; };
/* B13 (kontrola 2): potvrzení zamítnutí bezpečnostní položky říká i to, co se odblokuje. Doplněk k větě z jádra (V.SAFETY_ITEMS), dokud ji jádro samo nemá. */
var SAFE_MORE = { 'B-HYPO': 'Poklesy po menší porci se navíc nezapíšou, a tak na kontrole v návrhu k dávce u oběda nic nezablokuje větev „zvýšit“.' };
function safeText(id) { var SAFE = (NF.screens && NF.screens.SAFETY_ITEMS) || {}, t = SAFE[id] ? String(SAFE[id]) : ''; if (t && SAFE_MORE[id] && t.indexOf('zvýšit') < 0) t += ' ' + SAFE_MORE[id]; return t; }
D.safeText = safeText;
/* „Změnit rozhodnutí“ z oznámení na obrazovce nebo z vysvětlivky: karta položky v panelu (rozbalí ho a odroluje k ní), nic se nepřehrává ani nepřepíná.
   Mimo příběh, ve finále a v zásuvce otevře kartu v zásuvce „Vaše rozhodnutí“. */
NF.demoActions.garantChange = function (id) {
  var s = S(); if (!NF.item(s, id)) return;
  var dr = NF.currentDrawer && NF.currentDrawer();
  if (dr && dr !== 'decisions') NF.closeDrawer();
  if (dr === 'decisions' || away(s) || summaryActive(s) || ended) { s.gOpen = id; drawerFocus = id; NF.openDrawer('decisions'); return; }
  pinned = id; s.gOpen = id; flashId = id; jumpTo = id; tagTo = id;
  if (isHidden(s)) NF.demoActions.tourToggle();
};
/* V09 (23. 10. 2026): hláška po zamítnutí říká rovnou, co se stane (text „Co se stane při zamítnutí“ z průvodce), ne slib místa na obrazovce,
   které položky jako P-LEKAR nebo I-HYPO v příběhu nemají. Kde místo je, přidá se, že je to vidět na obrazovce. */
function rejectedMsg(s, id) {
  var r = NF.item(s, id), g = (D.guide && D.guide[id]) || (r && r.guide) || {};
  var what = typeof g.dopad === 'string' && g.dopad ? String(g.dopad).trim() : 'Tahle část aplikace přestane fungovat.';
  /* K4 (kontrola 2): když je oznámení na obrazovce, nese celý text samo – panel ho neopakuje */
  var r = NF.item(s, id), nm = r ? '„' + r.title + '“' : id, ctx = whereCtx(s); /* kontrola 4 (kosm. 3): v souhrnu žádný příběh nepokračuje */
  var tail = ctx === 'souhrn' ? ' Rozhodnutí změníte kdykoli tady v tabulce.' : ctx === 'zasuvka' ? ' Rozhodnutí změníte kdykoli tady v zásuvce.' : ' Příběh pokračuje; rozhodnutí změníte kdykoli tady v panelu nebo v zásuvce „Vaše rozhodnutí“.';
  if (ctx !== 'souhrn' && offOnScreen(s, id)) return 'Zamítnuto: ' + nm + '. Na obrazovce to vidíte jako „' + offHead(id).replace(/\.$/, '') + '“; co zamítnutí znamená, říká oznámení.' + tail;
  return 'Zamítnuto: ' + nm + '. ' + what + tail;
}
D.rejectedMsg = function (id) { return rejectedMsg(S(), id); };
function offOnScreen(s, id) {
  var html = '';
  try { html = s.role === 'doctor' ? NF.screens.doctor(s) : s.role === 'nurse' ? NF.screens.nurse(s) : NF.screens.patient(s); } catch (err) { return false; }
  return html.indexOf('data-off="' + id + '"') >= 0;
}
var resetAsk = false;
NF.demoActions.garantResetAsk = function (v) { resetAsk = v !== 'no'; demoAsk = false; if (resetAsk) drawerFocus = 'confirm'; };
var demoAsk = false;
NF.demoActions.resetDemoAsk = function (v) { demoAsk = v !== 'no'; resetAsk = false; if (demoAsk) drawerFocus = 'confirm'; };
NF.demoActions.garantReset = function () {
  resetAsk = false;
  var x = D.sync && D.sync.event ? D.sync.event('reset', null, 'Smazání rozhodnutí garanta', null) : null, at = new Date().toISOString();
  try { if (x && D.sync.effMs) { var t = D.sync.effMs(x); if (!isNaN(t)) at = new Date(t).toISOString(); } } catch (err) { }
  try { if (global.localStorage) global.localStorage.setItem(RKEY, JSON.stringify({ at: at, seq: x && x.params ? x.params.seq : null, client: x ? x.client : null })); } catch (err) { } /* 31/03 B6: značka dřív než prázdný deník */
  glog = []; resetting = true; saveGlog(); resetting = false; drafts = {}; saveDrafts(); land(D.playScene(sceneIdx(S()))); say('Rozhodnutí garanta byla smazána; položky jsou zase ke schválení.'); };
D.garantLog = function () { return glog.slice(); };

/* ---------- co rozhodl garant (K2, 19. 10. 2026; dva stavy 27. 10. 2026) ----------
   „Rozhodnuto“ a souhrn se počítají jen z deníku garanta. Nová verze, kterou odehraje příběh (scénář 5, pod NF.muteHooks), je modelová:
   v historii položky zůstává s označením „model (příběh)“, ale garantovi se nepřipisuje a položku mu nabídneme normálně. */
function gEntries(id) { return glog.filter(function (d) { return d.item === id; }); }
function gDecs(id) { return glog.filter(function (d) { return d.item === id && d.kind === 'decision'; }); }
function gTouched(id) { return gDecs(id).length > 0; }
function gStatus(id) { var ds = gDecs(id); return ds.length ? ds[ds.length - 1].status : null; }
/* Platná poznámka = text posledního záznamu položky (rozhodnutí nebo poznámka). */
function gLast(id) { var es = gEntries(id); return es.length ? es[es.length - 1] : null; }
function gNote(id) { var x = gLast(id); return x ? String(x.comment || '') : ''; }
D.garantNote = gNote; D.garantStatus = gStatus;
NF.itemTouched = function (S0, id) { return gTouched(id); }; /* jen v prezentační vrstvě; jádro bez demo/ počítá z historie */
function gSummary(s) {
  var items = NF.garantItems(s), out = { total: items.length, approved: 0, rejected: 0, remaining: 0, touched: 0, noted: 0 };
  items.forEach(function (r) { var st = gStatus(r.id); if (gNote(r.id)) out.noted++; if (!st) { out.remaining++; return; } out.touched++; out[st]++; });
  return out;
}
D.garantSummary = function (s) { return gSummary(s || S()); };
/* Hlášky vrstvy se ukazují v panelu nad tlačítky, ne jako bublina přes aplikaci (S8). */
var panelMsg = '';
function say(msg) { panelMsg = msg || ''; }
/* Kontrola 4 (přístupnost B1): panel vyprávění má v DOM místo hned za lištou (jádro ho drží a nepřepisuje: data-nf-keep), Tab jde lišta → panel → obrazovka. */
NF.slots.afterBanner = 'tour';

/* ---------- pravdivý stav ukládání (kontrola 4, prohlížeč B1) ----------
   Co je opravdu na serveru, ví jen demo/sync.js. Panel, lišta, poznámka, poděkování i „Ukázka skončila“ říkají „uloženo“ jen tehdy, když fronta
   na odeslání je prázdná (nebo když sync.js o záznamu řekne, že už odešel). Při výpadku: „Rozhodnutí zatím nejsou odeslaná“ a Zkusit znovu. */
function syncInfo() {
  var sy = D.sync, signed = !!(D.auth && D.auth.session && D.auth.session()), st = null;
  try { st = sy && sy.status ? sy.status() : null; } catch (err) { st = null; }
  if (!st || !signed) return { on: false, pending: 0, err: null };
  var rej = Number(st.rejected) || 0, pend = Number(st.pending) || 0;
  return { on: true, configured: st.configured !== false, pending: pend, rejected: rej, saved: st.saved != null ? !!st.saved : !pend && !rej, err: st.lastErr || st.error || null, lastOk: st.lastOk || null, sending: !!st.sending, skewMs: st.skewMs };
}
D.syncInfo = syncInfo;
/* Je záznam deníku garanta na serveru? true / false / null (bez přihlášení – nic se neposílá). */
function entrySaved(d) {
  var info = syncInfo(); if (!info.on) return null;
  if (d && d.sid && D.sync && typeof D.sync.isPending === 'function') { try { return !D.sync.isPending(d.sid); } catch (err) { } }
  return info.saved;
}
/* 'server' | 'local' | 'rejected' | null (demo/sync.js: D.sync.state) */
function entryState(d) { var ok = entrySaved(d); if (ok === null) return null; if (ok) return 'server'; try { return D.sync && D.sync.state && d && d.sid ? D.sync.state(d.sid) : 'local'; } catch (err) { return 'local'; } }
function allSaved() { var info = syncInfo(); return !info.on || info.saved; }
D.allSaved = allSaved;
function syncWord(info) {
  if (!info.configured) return { cls: 'warn', ic: 'alert', t: 'Ukládání na server není nastavené; rozhodnutí čekají v tomto prohlížeči' + (info.pending ? ' (' + info.pending + ')' : '') + '.' };
  if (info.rejected && !info.pending) return { cls: 'warn', ic: 'alert', t: 'Server odmítl ' + info.rejected + ' ' + plural(info.rejected, 'zápis', 'zápisy', 'zápisů') + '; ' + (info.rejected > 1 ? 'zůstávají' : 'zůstává') + ' v tomto prohlížeči, nic se nezahodilo.', dead: true };
  if (info.pending && info.err) return { cls: 'warn', ic: 'alert', t: 'Neuloženo na serveru: ' + info.pending + '. Rozhodnutí zatím nejsou odeslaná – zůstaňte prosím online.' };
  if (info.pending) return { cls: 'wait', ic: 'clock', t: 'Ukládáme na server (' + info.pending + '). Rozhodnutí zatím nejsou odeslaná – zůstaňte prosím online.' };
  return { cls: 'ok', ic: 'check', t: 'Rozhodnutí jsou uložená na serveru.' };
}
/* Krátký odznak do lišty (na každé šířce, když něco čeká; uloženo jen na širokém okně) a řádek do panelu, zásuvky a konce ukázky. */
function syncBarBadge(s) {
  var info = syncInfo(); if (!info.on || !glog.length) return ''; /* S2: až po prvním rozhodnutí garanta */
  var w = syncWord(info), bad = !info.saved, short = !info.configured ? 'Neukládá se' : w.dead ? 'Server odmítl: ' + info.rejected : info.pending && info.err ? 'Neuloženo: ' + info.pending : info.pending ? 'Ukládáme…' : 'Uloženo';
  return '<span class="sync-badge bar-sync ' + w.cls + (bad ? '' : ' bar-wide') + '" role="status" title="' + e(w.t) + '"><span aria-hidden="true">' + NF.icon(w.ic) + '</span><span class="sync-t">' + e(short) + '</span><span class="sr-only"> ' + e(w.t) + '</span>' +
    (w.dead ? btn('Zkusit znovu', 'syncRetryDead', null, 'sm') : info.pending && info.err ? btn('Zkusit znovu', 'syncRetry', null, 'sm') : '') + '</span>';
}
/* SCHEMA 83: poznámka se ukládá při psaní, a tak fronta krátce čeká často. Patička panelu a zásuvka ukážou řádek „Ukládáme…“ až po FRESH_MS
   nepřetržitého čekání (nebo hned při chybě či odmítnutí); stav říká i lišta a řádek pod polem. Na telefonu by jinak řádek zakryl pole poznámky. */
var FRESH_MS = 5000, pendSince = null;
function freshPending(info) {
  if (!info.on || !info.pending || info.err || info.rejected || info.configured === false) { pendSince = null; return false; }
  if (pendSince == null) { pendSince = Date.now(); if (global.setTimeout) global.setTimeout(function () { try { if (!busy) NF.render(); } catch (err) { } }, FRESH_MS + 50); }
  return Date.now() - pendSince < FRESH_MS;
}
function syncLine(s, force) {
  var info = syncInfo(), fresh = freshPending(info); if (!info.on || (!force && (info.saved || fresh))) return '';
  var w = syncWord(info);
  return '<div class="sync-line ' + w.cls + '"><p class="small"><span aria-hidden="true">' + NF.icon(w.ic) + '</span> ' + e(w.t) + '</p>' + (w.dead ? '<div class="actions">' + btn('Zkusit znovu', 'syncRetryDead', null, 'sm') + '</div>' : !info.saved && (info.err || !info.configured || info.pending) ? '<div class="actions">' + btn('Zkusit znovu', 'syncRetry', null, 'sm') + '</div>' : '') + '</div>';
}
D.syncLine = function (s) { return syncLine(s || S(), true); };

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
/* B24: jak se tlačítko rozhodnutí v liště na této šířce opravdu jmenuje (t-short platí do 600 px, demo.css). */
function barTodoLabel(s) { var n = gSummary(s).remaining; return n ? (phone() ? 'Zbývá ' : 'Ke schválení · zbývá ') + n : 'Vše rozhodnuto'; }
D.barTodoLabel = function (s) { return barTodoLabel(s || S()); };
/* B21: v dodatku název varianty bez druhého „Dodatek · “ (pozice už říká „Dodatek · varianta X z Y“). */
function barTitle(s, pos) { var t = sceneTitle(s); return pos.appendix ? t.replace(/^Dodatek\s*·\s*/, '') : t; }
function bar(s) {
  var i = sceneIdx(s), sum = gSummary(s), pos = position(s), signed = !!(D.auth && D.auth.session()), bt = barTitle(s, pos);
  /* N19: jedno znění počítadla (odst. 15), na telefonu zkrácené */
  var admin = !!(D.auth && D.auth.role && D.auth.role() === 'admin');
  var todo = admin ? '' : btn(sum.remaining ? '<span><span class="t-long">Ke schválení · zbývá</span><span class="t-short">Zbývá</span> ' + sum.remaining + '</span>' : '<span aria-hidden="true">' + NF.icon('check') + '</span>Vše rozhodnuto', 'openDecisions', null, 'bar-todo' + (sum.remaining ? '' : ' ok'), ' aria-haspopup="dialog"' + (sum.remaining ? ' aria-label="Ke schválení · zbývá ' + sum.remaining + '"' : ''));
  var where = pos.intro ? sceneTitle(s) : pos.label + ': ' + bt;
  return '<div class="pres-bar" role="banner" aria-label="Lišta ukázky"><span class="flag">DEMO · syntetická data · není určeno pro léčbu</span>' +
    '<span class="where" title="' + e(where) + '">' + (pos.intro ? '<b>' + e(sceneTitle(s)) + '</b>' : e(pos.label) + ': <b>' + e(bt) + '</b>') + '</span>' + todo +
    syncBarBadge(s) + /* S2: stav ukládání až po prvním rozhodnutí; kontrola 4 B1: neuloženo vidět na každé šířce */
    (D.auth && D.auth.role() === 'admin' ? btn('Výsledky garanta', 'openResults', null, 'bar-wide') : '') +
    btn('Přehled scén', 'openPresenter', null, 'bar-wide') +
    (signed ? btn('Odhlásit · ' + D.auth.label(), 'authLogout', null, 'bar-wide') + (D.auth.forceOffered() && D.sync && D.sync.pending() ? btn('Odhlásit a zahodit neuložené (' + D.sync.pending() + ')', 'authLogoutForce', null, 'danger bar-wide') : '') : '') +
    '<button type="button" class="btn bar-more" data-action="openPresenter" aria-haspopup="dialog" aria-label="' + (admin ? 'Další volby: výsledky garanta, přehled scén, stav ukládání, odhlášení' : 'Další volby: přehled scén, stav ukládání, odhlášení') + '">⋯</button>' +
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
/* Tempo ukázky (27. 10. 2026): všechny časy na jednom místě. Jedno Dál = jeden děj, který panel popisuje.
   Každá akce: dojezd rolování k cíli → pauza na nalezení cíle → zvýraznění stisku → akce → jednotná pauza. */
var PACE = {
  poll: 50,          /* ms mezi dvěma měřeními polohy cíle */
  settleMax: 1200,   /* nejdéle čekáme, než rolování k cíli dojede */
  look: 450,         /* po dojezdu: oko cíl najde */
  press: 250,        /* zvýraznění stisku */
  after: 700,        /* pauza po akci */
  view: 850,         /* cíl bez akce: jak dlouho se jen ukazuje */
  listLook: 100, listPress: 200, listAfter: 300, /* další položka téhož seznamu (podmínky, body zaučení, volič): s dojezdem zhruba 0,7 s */
  typeChar: 60, typeMax: 1500, /* psaní: 60 ms na znak, celkem nejvýš 1,5 s */
  reducedCap: 120    /* omezení pohybu: každá pauza nejvýš 120 ms a na rolování se nečeká (jako dřív) */
};
D.PACE = PACE;
function wait(ms, fn) { global.setTimeout(fn, reduced() ? Math.min(ms, PACE.reducedCap) : ms); }
/* Počká, až cíl přestane jezdit (plynulé rolování): poloha se dvakrát po sobě nezmění, nejdéle settleMax. */
function settle(el, alive, fn) {
  if (!el || reduced() || typeof el.getBoundingClientRect !== 'function') { fn(); return; }
  var t0 = Date.now(), last = null, same = 0;
  (function poll() {
    if (!alive()) return;
    var r = null; try { r = el.getBoundingClientRect(); } catch (err) { r = null; }
    var k = r ? Math.round(r.top) + ':' + Math.round(r.left) : '';
    if (k === last) same++; else { same = 0; last = k; }
    if (same >= 2 || Date.now() - t0 >= PACE.settleMax) { fn(); return; }
    global.setTimeout(poll, PACE.poll);
  })();
}
function find(sel) { try { return sel ? doc.querySelector(val(sel)) : null; } catch (err) { return null; } }
/* Viditelná oblast pro prvek: bez lišty ukázky nahoře a bez všeho, co je přilepené dole a prvek vodorovně překrývá
   (panel vyprávění pod 1100 px, spodní lišta ordinace „Další krok“, lišta záložek pacienta). M5 (27. 10. 2026): dřív se nepočítalo s .nextbar. */
var BOTTOM_OVERLAYS = '.tour-panel,.nextbar,.tabbar';
function cs(el) { try { return global.getComputedStyle(el); } catch (err) { return null; } }
function stuck(el) { var c = cs(el); return !!(c && (c.position === 'fixed' || c.position === 'sticky' || c.position === 'absolute')); }
function viewBox(el, r) {
  var vh = global.innerHeight || 0, top = 0, bottom = vh;
  try { var b = doc.querySelector('.pres-bar'); if (b) top = b.getBoundingClientRect().bottom; } catch (err) { }
  try {
    var os = doc.querySelectorAll(BOTTOM_OVERLAYS);
    for (var k = 0; k < os.length; k++) {
      var o = os[k]; if (el && (o === el || o.contains(el) || (el.contains && el.contains(o)))) continue;
      if (!stuck(o)) continue;
      var c = cs(o); if (c && (c.display === 'none' || c.visibility === 'hidden')) continue;
      var q = o.getBoundingClientRect(); if (!q.width || !q.height || q.top < vh * 0.3 || q.top >= vh) continue; /* jen to, co je dole a v okně */
      if (r && (q.right <= r.left + 1 || q.left >= r.right - 1)) continue; /* panel vpravo na širokém okně cíl vlevo nepřekrývá */
      if (o.matches && o.matches('.tour-panel') && !D.narrow()) continue;
      bottom = Math.min(bottom, q.top);
    }
  } catch (err2) { }
  return { top: top, bottom: bottom };
}
/* Prvek přilepený k oknu (spodní lišta ordinace) se nikam neroluje: M11 – dřív okno odjelo na konec stránky a obrazovka zůstala prázdná. */
function fixedEl(el) { for (var p = el; p && p.nodeType === 1 && p !== doc.body; p = p.parentNode) { var c = cs(p); if (c && c.position === 'fixed') return true; } return false; }
/* Nejbližší rolovací rodič (rámeček telefonu na počítači roluje uvnitř); null = okno. */
function scroller(el) {
  for (var p = el.parentNode; p && p.nodeType === 1 && p !== doc.body && p !== doc.documentElement; p = p.parentNode) {
    if (!(p.scrollHeight > p.clientHeight + 1)) continue;
    var c = cs(p); if (c && (c.overflowY === 'auto' || c.overflowY === 'scroll')) return p;
  }
  return null;
}
function rectOf(els) {
  var r = null; els.forEach(function (el) {
    if (!el) return; var q = null; try { q = el.getBoundingClientRect(); } catch (err) { q = null; } if (!q || (!q.width && !q.height)) return;
    r = r ? { top: Math.min(r.top, q.top), bottom: Math.max(r.bottom, q.bottom), left: Math.min(r.left, q.left), right: Math.max(r.right, q.right) } : { top: q.top, bottom: q.bottom, left: q.left, right: q.right };
  });
  if (r) r.height = r.bottom - r.top;
  return r;
}
function openDetails(el) { for (var p = el && el.parentNode; p && p !== doc; p = p.parentNode) if (p.tagName === 'DETAILS' && !p.open) p.open = true; }
/* V04–V06 (23. 10. 2026): cíl vyšší než viditelná oblast se roluje na začátek (pod lištu), jinak na střed; soft = jen když není celý vidět.
   27. 10. 2026 (M5, M10, M11): roluje se ručně okno nebo rolovací rodič tak, aby cíl skončil v oblasti bez lišt a panelů; s `also` (štítek nabízené položky)
   se ukáže cíl i štítek, když se vejdou spolu, jinak štítek (o něm se právě rozhoduje). */
function reveal(el, soft, also) {
  if (also && (!el || fixedEl(el))) { el = also; also = null; }
  if (!el) return;
  openDetails(el); if (also) openDetails(also);
  if (fixedEl(el)) return;
  var box = scroller(el), r = rectOf([el]), vb = viewBox(el, r);
  if (!r) return;
  if (box) { var q = box.getBoundingClientRect(); vb = { top: Math.max(vb.top, q.top), bottom: Math.min(vb.bottom, q.bottom) }; } /* lišta záložek v rámečku je mezi spodními pruhy (viewBox) */
  var span = vb.bottom - vb.top, pad = 12, edge = null;
  /* M7 (kontrola 2): cíl a štítek se spolu nevejdou – štítek přijde k okraji okna na straně cíle, takže je vidět i ta část cíle, která k němu přiléhá
     (na telefonu dřív zůstal vidět jen štítek a obsah, o kterém se rozhoduje, byl nad výřezem nebo pod panelem). */
  if (also) { var u = rectOf([el, also]); if (u && u.height <= span - 2 * pad) r = u; else { var tr = r, ar = rectOf([also]) || r; r = ar; edge = ar.top >= tr.top ? 'bottom' : 'top'; el = also; } }
  if (soft && !edge && r.top >= vb.top && r.bottom <= vb.bottom && (also || fullyVisible(el, r, vb))) return;
  var tall = r.height > span * 0.85;
  var want = edge === 'bottom' ? vb.bottom - pad - r.height : edge === 'top' ? vb.top + pad : tall ? vb.top + pad : vb.top + Math.max(pad, (span - r.height) / 2), dy = r.top - want;
  if (Math.abs(dy) < 2) return;
  var beh = reduced() ? 'auto' : 'smooth';
  if (box) { try { box.scrollTo({ top: box.scrollTop + dy, behavior: beh }); } catch (err) { box.scrollTop += dy; } return; }
  var y = (global.pageYOffset || 0) + dy; /* absolutně: dvě plynulá rolování za sebou se nesčítají špatně */
  try { global.scrollTo({ top: y, behavior: beh }); } catch (err2) { try { global.scrollTo(0, y); } catch (err3) { } }
}
/* Celý vidět: v okně (bez lišty a spodních pruhů) i v rolovacím rodiči (rámeček telefonu roluje uvnitř). */
function fullyVisible(el, r, vb) {
  if (r.top < vb.top || r.bottom > vb.bottom) return false;
  for (var p = el.parentNode; p && p.nodeType === 1 && p !== doc.body && p !== doc.documentElement; p = p.parentNode) {
    if (!(p.scrollHeight > p.clientHeight + 1)) continue;
    var ov = ''; try { ov = global.getComputedStyle(p).overflowY; } catch (err) { ov = ''; }
    if (ov !== 'auto' && ov !== 'scroll') continue;
    var q = p.getBoundingClientRect(); if (r.top < q.top - 1 || r.bottom > q.bottom + 1) return false;
  }
  return true;
}
/* Štítek nabízené položky na obrazovce (M3, M4, M10): přednostně uvnitř cíle kroku, jinak první v obrazovce; sbalené části kolem něj se rozbalí. */
function offerTag(id, target) {
  if (!id || !doc || typeof doc.querySelectorAll !== 'function') return null;
  var all = []; try { all = Array.prototype.slice.call(doc.querySelectorAll('#app .appr[data-value="' + id + '"]')); } catch (err) { all = []; }
  if (!all.length) return null;
  var inT = target ? all.filter(function (t) { return target.contains(t); }) : [];
  if (inT[0]) return inT[0];
  /* M2 (kontrola 3): jinak štítek nejblíž cíli kroku (dřív první v dokumentu – na kontrole třeba v jiném návrhu daleko nad cílem); skrytý štítek (sbalená část bez rozměru) až nakonec */
  if (!target || typeof target.getBoundingClientRect !== 'function') return all[0];
  var tr = target.getBoundingClientRect(), best = null, bd = Infinity;
  all.forEach(function (t) { var r = t.getBoundingClientRect(), hid = !r.width && !r.height, d = hid ? 1e9 : r.top > tr.bottom ? r.top - tr.bottom : r.bottom < tr.top ? tr.top - r.bottom : 0; if (d < bd) { bd = d; best = t; } });
  return best || all[0];
}
/* SCHEMA 75: vyprávění cituje „…“ text, který je v cíli kroku ve sbalené části (body ověření „8 z 8 sedí“, karta Jak to dopadlo) – ta se rozbalí, ať citace na obrazovce opravdu je. */
function openQuoted(target) {
  if (!target || !target.querySelectorAll) return;
  var s = S(), st = steps(), i = s.tourStep || 0, step = i > 0 ? st[i - 1] : null; if (!step || stepMode(s, sceneIdx(s), i - 1, step).mode !== 'run') return;
  var txt = ''; try { txt = String(val(step.co) || '') + ' ' + String(val(step.vsimni) || ''); } catch (err) { return; }
  var qs = (txt.replace(/<[^>]+>/g, '').match(/„([^“]+)“/g) || []).map(function (q) { return q.slice(1, -1).replace(/\s+/g, ' '); }); if (!qs.length) return;
  var ds = Array.prototype.slice.call(target.querySelectorAll('details')); if (target.tagName === 'DETAILS') ds.unshift(target);
  ds.forEach(function (d) {
    if (d.open) return; var sm = d.querySelector('summary'), all = (d.textContent || '').replace(/\s+/g, ' '), head = sm ? (sm.textContent || '').replace(/\s+/g, ' ') : '';
    if (qs.some(function (q) { return all.indexOf(q) >= 0 && head.indexOf(q) < 0; })) { d.open = true; openDetails(d); }
  });
}
/* Po kroku: rozbalí sbalené části se štítky všech nerozhodnutých nabízených položek a ukáže cíl kroku spolu se štítkem rozbalené karty. */
function revealStep() {
  var s = S(), target = find(watchSel) || find(focusSel);
  if (summaryActive(s)) { try { global.scrollTo(0, 0); } catch (err) { } return; } /* kosm. 1: souhrn se otevře od nadpisu, ne u tabulky */
  var pn = pendingNow(s), tag = null;
  openQuoted(target);
  pn.ids.forEach(function (id) { var t = offerTag(id, target); if (t) openDetails(t); });
  var cur = s.gOpen && s.gOpen !== '-' ? s.gOpen : pn.ids[0];
  if (cur && pn.ids.indexOf(cur) >= 0) tag = offerTag(cur, target);
  reveal(target, true, tag);
}
/* Po rozhodnutí nebo rozbalení karty v panelu: obrazovka ukáže štítek položky, o které se teď rozhoduje (M10). */
var tagTo = null;
function tagAfterRender() {
  if (!tagTo) return; var id = tagTo; tagTo = null;
  var s = S(); if (summaryActive(s) || away(s)) return;
  var tag = offerTag(id, find(watchSel) || find(focusSel)); if (tag) reveal(tag, true);
}
/* Rámeček telefonu roluje uvnitř: po kroku zpět nebo přehrání scény se vrátí nahoru (V08). */
function shellTop() { try { var sh = doc.querySelector('.patient-shell .patient'); if (sh) sh.scrollTop = 0; } catch (err) { } }
/* Přístupnost 23. 10. 2026, nález 1: po kroku z panelu nesmí fokus spadnout na body – jde na nadpis kroku v panelu (jádro samo dává h1 jen při změně obrazovky). */
function focusPanel(force) {
  try {
    var a = doc.activeElement; if (!force && a && a !== doc.body && a !== doc.documentElement) return;
    if (force && a && a.closest && !a.closest('.tour-panel') && a !== doc.body && a !== doc.documentElement) return; /* fokus jinde než v panelu (např. zásuvka) nebereme */
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
function isAct(op) { return !!(op && (op.act || op.bind || op.fn)); }
/* Další položka téhož seznamu: stejná akce za sebou (podmínky, body zaučení, volič), nebo krok výslovně označený list. */
function listNext(step, prev, op) { return isAct(prev) && isAct(op) && (!!step.list || (!!op.act && op.act === prev.act)); }
function pressable(el) { try { return !!(el && el.matches && el.matches('button,[data-action],input,select,textarea,label,summary,.toggle')); } catch (err) { return false; } }
function runAnimated(step, done) {
  var ops = (step.do || []).slice(), my = ++runId, prev = null, lastSel = null;
  function alive() { return my === runId; }
  function safe(fn) { try { fn(); return true; } catch (err) { var s = S(); s.error = 'Krok ukázky selhal a byl přeskočen: ' + err.message; NF.save(s); done(true); return false; } }
  /* Konec kroku: jedno rolování, jen když je „watch“ jiný cíl než poslední a není celý vidět. */
  function finish() {
    var ws = step.watch ? val(step.watch) : null, w = ws && ws !== lastSel ? find(ws) : null;
    if (!w) { done(); return; }
    focusSel = ws; pressSel = null; decorate(); reveal(w, true); settle(w, alive, function () { if (alive()) done(); });
  }
  (function next() {
    if (!alive()) return;
    if (!ops.length) { finish(); return; }
    var op = ops.shift(), inList = listNext(step, prev, op), more = listNext(step, op, ops[0]); prev = op;
    focusSel = op.sel ? val(op.sel) : null; pressSel = null; decorate(); if (focusSel) lastSel = focusSel;
    var el = find(op.sel); reveal(el, true);
    settle(el, alive, function () {
      if (!alive()) return;
      if (!isAct(op)) { wait(PACE.view, next); return; }
      wait(inList ? PACE.listLook : PACE.look, function () {
        if (!alive()) return;
        if (op.bind && op.type && el && 'value' in el) {
          var text = String(val(op.val)), i = 0, per = Math.max(15, Math.min(PACE.typeChar, Math.floor(PACE.typeMax / Math.max(1, text.length)))); el.value = '';
          (function typeOne() {
            if (!alive()) return;
            if (i < text.length) { el.value += text.charAt(i++); if (op.live) NF.bindValue(val(op.bind), el.value); wait(per, typeOne); return; }
            if (safe(function () { perform(op); })) wait(PACE.after, next);
          })();
          return;
        }
        var press = pressable(el); if (press) { pressSel = focusSel; decorate(); }
        wait(press ? (inList ? PACE.listPress : PACE.press) : 0, function () { if (!alive()) return; pressSel = null; if (safe(function () { perform(op); })) wait(more ? PACE.listAfter : PACE.after, next); });
      });
    });
  })();
}
/* B03 (27. 10. 2026): krok, jehož děj stojí na zamítnuté položce, se přeskočí a panel řekne proč.
   Kontrola 2 (29. 10. 2026): na čem krok závisí, neurčuje jen ruční `needs`, ale hlavně mapa závislostí z generátoru (demo/scene-items.js, deps):
   krok → položka → „skip“ (zamítnutí obsah kroku odstraní nebo jeho děj neproběhne) | „note“ (děj proběhne, část obrazovky ale chybí – panel to řekne).
   Ruční needs zůstávají jako „skip“. Režim kroku: run | note | skip. */
function needsManual(step, s) { return ((step && step.needs) || []).filter(function (id) { return NF.item(s, id) && !NF.usable(s, id); }); }
/* Kontrola 3 (B1): `zavisi` = ruční „note“ – vyprávění kroku nebo úvodu popisuje obsah položky; po jejím zamítnutí řekne větu `jinak`. Doplňuje mapu z generátoru. */
function zavisiManual(step, s) { return ((step && step.zavisi) || []).filter(function (id) { return NF.item(s, id) && gStatus(id) === 'rejected'; }); }
function stepDeps(idx, k) { var sc = (D.sceneItems || [])[idx]; return (sc && sc.deps && sc.deps[k]) || {}; }
function stepMode(s, idx, i, step) {
  step = step || steps()[i]; if (!step) return { mode: 'run', miss: [] };
  var skip = needsManual(step, s), note = zavisiManual(step, s), d = stepDeps(idx, i + 1);
  Object.keys(d).forEach(function (id) { if (!NF.item(s, id) || gStatus(id) !== 'rejected') return; if (d[id] === 'skip') { if (skip.indexOf(id) < 0) skip.push(id); } else note.push(id); });
  return skip.length ? { mode: 'skip', miss: skip, note: note } : note.length ? { mode: 'note', miss: note } : { mode: 'run', miss: [] };
}
/* Kontrola 4 (prohlížeč M2, obsah B2): v režimu „note“ vyprávění kroku zůstává a věta o zamítnuté části se k němu připojí. Vynechají se jen věty,
   které popisují zamítnutou část – určuje je generátor mapy (demo/scene-items.js, drop: krok → položka → klíče vět), stejným výpočtem, jakým T4
   hlídá, že vyprávění necituje ani nepopisuje, co na obrazovce není. Krok, jehož obsah zamítnutí odstranilo celý (skip, který už proběhl), vyprávění nemá. */
function sentencesOf(t) {
  var txt = String(t || '').replace(/<[^>]+>/g, ''), out = [], re = /[.!?…]“?(?=\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ„]|\s*$)/g, m, from = 0;
  while ((m = re.exec(txt))) {
    var cut = txt.slice(from, m.index + m[0].length), all = txt.slice(0, m.index + m[0].length);
    if ((all.match(/„/g) || []).length > (all.match(/“/g) || []).length) continue; /* konec věty uvnitř citace */
    if (cut.trim()) out.push(cut.trim()); from = m.index + m[0].length;
  }
  if (txt.slice(from).trim()) out.push(txt.slice(from).trim());
  return out;
}
function sentKey(x) { return String(x).replace(/<[^>]+>/g, '').replace(/\d+([,.]\d+)?/g, '#').replace(/\s+/g, ' ').trim().slice(0, 60); }
D.sentencesOf = sentencesOf; D.sentKey = sentKey;
function stepDrops(idx, k, miss) {
  var sc = (D.sceneItems || [])[idx], d = (sc && sc.drop && sc.drop[k]) || {}, out = {};
  (miss || []).forEach(function (id) { (d[id] || []).forEach(function (key) { out[key] = 1; }); });
  return out;
}
function keepText(t, drops) { return sentencesOf(t).filter(function (x) { return !drops[sentKey(x)]; }).join(' '); }
function needsMissing(step, s) { var st = steps(), i = st.indexOf(step); if (i < 0) return []; var m = stepMode(s, sceneIdx(s), i, step); return m.mode === 'skip' ? m.miss : []; } /* jen krok právě přehrávané scény */
/* M3: úsek přeskočených kroků za sebou = jedno Dál a jedna věta.
   Kontrola 3 (M1): přeskočené úseky se pamatují ve stavu scény (s.tourSkips = [[od, do], …], indexy kroků); úsek je jen to, co Dál opravdu přeskočilo,
   a jen kroky, které teprve přišly. Krok, který už proběhl a jehož položku garant zamítl až potom, se nepřeskakuje zpětně: panel u něj řekne
   větu režimu „note“ (ukázka krok provedla, část obrazovky chybí). Úsek končící krokem i (0 = žádný): { from, to, miss }. */
function skipRanges(s) { return Array.isArray(s.tourSkips) ? s.tourSkips : []; }
function skippedAt(s, j) { return skipRanges(s).some(function (r) { return j >= r[0] && j < r[1]; }); }
function skipBlock(s, i) {
  var idx = sceneIdx(s), st = steps(); if (i <= 0 || !st[i - 1]) return null;
  var r = skipRanges(s).filter(function (x) { return x[1] === i; })[0]; if (!r) return null;
  var miss = [];
  for (var j = r[0]; j < r[1]; j++) if (st[j]) stepMode(s, idx, j, st[j]).miss.forEach(function (id) { if (miss.indexOf(id) < 0) miss.push(id); });
  return { from: r[0], to: r[1], miss: miss };
}
function skipEnd(s, i) { var idx = sceneIdx(s), st = steps(), j = i; while (j < st.length && stepMode(s, idx, j, st[j]).mode === 'skip') j++; return j; }
function skipStart(s, i) { var idx = sceneIdx(s), st = steps(), j = i; while (j > 0 && st[j - 1] && stepMode(s, idx, j - 1, st[j - 1]).mode === 'skip') j--; return j; }
function titles(s, ids) { return ids.map(function (id) { var r = NF.item(s, id); return '„' + (r ? r.title : id) + '“'; }).join(', '); }
/* Položky, které se měly nabídnout v přeskočeném úseku (ve schváleném běhu tam byl jejich štítek) a teď se ve scéně nenabídnou – rozhodnou se v souhrnu (M8). */
function movedFromBlock(s, blk) {
  var idx = sceneIdx(s), base = (decisionPlan([])[idx] || []), now = (decisionPlan()[idx] || []), tg = targetsWith(idx, []);
  return base.filter(function (id) { var k = tg[id], m = D.itemScene[id]; if (k == null) return false; if (m && m.step) k = Math.max(k, m.step); return k > blk.from && k <= blk.to && now.indexOf(id) < 0 && !gTouched(id); });
}
/* M8 (kontrola 3): věta o přeskočení říká, co úsek ukazoval (názvy kroků), proč to bez zamítnuté položky nejde a kde se rozhodnou položky, které se v něm měly nabídnout. */
function skipText(s, blk) {
  var st = steps(), n = blk.to - blk.from, names = [], miss = blk.miss, moved = movedFromBlock(s, blk);
  for (var j = blk.from; j < blk.to; j++) if (st[j] && typeof st[j].t === 'string') names.push('„' + st[j].t + '“');
  var what = n > 1 ? 'Přeskočili jsme ' + n + ' ' + plural(n, 'krok', 'kroky', 'kroků') + (names.length ? ': ' + names.join(', ') : '') + '.' : 'Přeskočili jsme krok' + (names.length ? ' ' + names[0] : '') + '.';
  if (!miss.length) return what + ' Položku, na které ' + (n > 1 ? 'stály' : 'stál') + ', máte teď schválenou; tlačítko Zpět ' + (n > 1 ? 'je' : 'ho') + ' přehraje.';
  var why = ' Bez ' + (miss.length > 1 ? 'položek ' : 'položky ') + titles(s, miss) + ', ' + (miss.length > 1 ? 'které' : 'kterou') + ' jste zamítli, ' + (n > 1 ? 'je' : 'ho') + ' obrazovka ukázat nemůže.';
  return what + why + (moved.length ? ' ' + (moved.length > 1 ? 'Položky ' : 'Položku ') + titles(s, moved) + ', ' + (moved.length > 1 ? 'o kterých' : 'o které') + ' se v ' + (n > 1 ? 'nich' : 'něm') + ' mělo rozhodovat, rozhodnete v souhrnu na konci.' : '');
}
D.skipRanges = function (s) { return skipRanges(s || S()).slice(); };
/* Krok v režimu „note“: děj proběhl, zamítnutá část chybí. Krok může mít vlastní větu `jinak(B, S, miss)`; jinak obecná věta podle toho, co je na obrazovce. */
function noteText(s, step, miss) {
  if (step && typeof step.jinak === 'function') { try { var t = step.jinak(branches(), s, miss); if (t) return t; } catch (err) { } }
  var rec = miss.filter(function (id) { return RECORD_ONLY[id]; }), off = miss.filter(function (id) { return !RECORD_ONLY[id]; });
  var on = off.filter(function (id) { return offOnScreen(s, id); }), acts = ((step && step.do) || []).some(isAct), more = off.length > 1;
  /* kontrola 3: záznam nesouhlasu (C-CILE, K-KRITERIA, Z-GLUKOZA) obrazovku nevypíná – věta to tak říká */
  var recText = rec.length ? (rec.length > 1 ? 'Položky ' : 'Položku ') + titles(s, rec) + ' jste zamítli; maketa s ' + (rec.length > 1 ? 'nimi' : 'ní') + ' dál počítá a u ' + (rec.length > 1 ? 'nich' : 'ní') + ' je oznámení „Váš nesouhlas je zapsaný“.' : '';
  if (!off.length) return 'Krok proběhl jako v hlavní linii. ' + recText;
  return (acts ? 'Ukázka krok provedla, ale ' : 'Krok ukazuje obrazovku jen zčásti: ') + (more ? 'položky ' : 'položku ') + titles(s, off) + ' jste zamítli, a tak ' + (more ? 'je' : 'ji') + ' obrazovka neukazuje' +
    (on.length ? '; na ' + (more ? 'jejich' : 'jejím') + ' místě je oznámení „' + offHead(on[0]).replace(/\.$/, '') + '“.' : '.') + (recText ? ' ' + recText : '');
}
/* Kontrola 3 (B1): úvod scény (deps kroku 0 z generátoru) popisuje obsah, který po zamítnutí položky ve scéně není. Úvod pak řekne svou větu `jinak`
   (tour-content.js), jinak obecnou: co scéna ukáže bez zamítnuté části. */
function introMiss(s, idx) {
  var d = stepDeps(idx, 0), sc = D.scenes[idx], it = sc ? (T.chapters[D.chapters[sc.ch].id] || {}).intro : null, out = zavisiManual(it, s);
  Object.keys(d).forEach(function (id) { if (out.indexOf(id) < 0 && NF.item(s, id) && gStatus(id) === 'rejected') out.push(id); });
  return out;
}
function introNote(s, it, miss) {
  if (it && typeof it.jinak === 'function') { try { var t = it.jinak(branches(), s, miss); if (t) return t; } catch (err) { } }
  var more = miss.length > 1;
  return 'Tato scéna by ukazovala i to, co po vašem zamítnutí ' + (more ? 'položek ' : 'položky ') + titles(s, miss) + ' obrazovka neukáže. Proběhne bez ' + (more ? 'nich' : 'ní') +
    ': kroky, které na ' + (more ? 'nich' : 'ní') + ' stojí, přeskočíme, a kde chybí jen část obrazovky, panel řekne, co tam je místo ní.';
}
D.needsMissing = function (step, s) { return needsMissing(step, s || S()); };
D.stepMode = function (s, i) { s = s || S(); return stepMode(s, sceneIdx(s), i == null ? (s.tourStep || 1) - 1 : i); };
/* Co panel v tuhle chvíli vypráví (pro panel i pro pravdivost.test.cjs, T4): režim, název, „Co se děje“, „Čeho si všímat“ a zamítnuté položky. */
function shownNarration(s) {
  var ch = chapter(s), st = steps(), i = s.tourStep || 0;
  if (running != null) { var x = st[running]; return { mode: 'run', t: x.t, co: val(x.co), vsimni: val(x.vsimni), miss: [] }; }
  if (i === 0) {
    var it = (T.chapters[ch.id] || {}).intro || { t: ch.title }, im = introMiss(s, sceneIdx(s));
    if (im.length) return { mode: 'note', t: val(it.t), co: introNote(s, it, im), vsimni: '', miss: im }; /* B1 (kontrola 3): úvod se zamítnutí přizpůsobí */
    return { mode: 'intro', t: val(it.t), co: val(it.co), vsimni: val(it.vsimni), miss: [] };
  }
  var step = st[i - 1]; if (!step) return { mode: 'run', t: '', co: '', vsimni: '', miss: [] };
  var blk = skipBlock(s, i); if (blk) return { mode: 'skip', t: blk.to - blk.from > 1 ? 'Kroky přeskočeny' : 'Krok přeskočen', co: skipText(s, blk), vsimni: '', miss: blk.miss, from: blk.from };
  var m = stepMode(s, sceneIdx(s), i - 1, step);
  /* M1: krok proběhl a garant jeho položku zamítl až potom – „note“, ne „přeskakujeme“ */
  if (m.mode === 'note' || m.mode === 'skip') {
    var miss = m.mode === 'skip' ? m.miss.concat(m.note || []) : m.miss, own = null;
    if (typeof step.jinak === 'function') { try { own = step.jinak(branches(), s, miss) || null; } catch (err) { own = null; } }
    if (own || m.mode === 'skip') return { mode: 'note', t: step.tJinak || step.t, co: own || noteText(s, step, miss), vsimni: '', miss: miss }; /* tJinak: nadpis kroku, když zamítnutí mění jeho smysl (C12); vlastní věta jinak nahrazuje celé vyprávění */
    var dr = stepDrops(sceneIdx(s), i, miss), kp = function (v) { return keepText(val(v), dr); };
    return { mode: 'note', t: step.tJinak || step.t, note: noteText(s, step, miss), co: kp(step.co), vsimni: kp(step.vsimni), proc: kp(step.proc), dusledek: kp(step.dusledek), miss: miss };
  }
  return { mode: 'run', t: step.t, co: val(step.co), vsimni: val(step.vsimni), proc: val(step.proc), dusledek: val(step.dusledek), miss: [] };
}
D.shownNarration = function (s) { return shownNarration(s || S()); };
function lastFocus(step) { var ops = (step.do || []).filter(function (o) { return o.sel; }); return step.watch || (ops.length ? ops[ops.length - 1].sel : null); }
NF.demoActions.tourNext = function () {
  cardHold = null; /* SCHEMA 83: další krok už polohu rozhodnuté karty nesrovnává */
  if (busy) return;
  if (away(S())) { NF.demoActions.tourReturn(); return; } /* mimo příběh: Další nejdřív vrátí do scény */
  storyHome = null; /* M6: garant pokračuje ve scéně, kam ho poslal registr */
  var pn = pendingNow(S());
  if (pn.ids.length) { NF.demoActions.tourJumpPending(); return; } /* místo bubliny odroluje k první nerozhodnuté položce (rozhodnutí 12) */
  if (pn.summary) { say('Nejdřív potvrďte souhrn rozhodnutí.'); return; }
  panelMsg = ''; moreOpen = false; pinned = null; rejectAsk = null;
  var st = steps(), s = S(), i = s.tourStep || 0;
  s.toast = ''; /* kosm. 10: hláška minulého kroku nepřetrvá do dalšího */
  if (i >= st.length) {
    var idx = sceneIdx(s);
    if (idx >= lastIndex()) return;
    sceneLeave('dal', idx + 1);
    land(D.playScene(idx + 1));
    focusPanel(true); /* kontrola 4 (B3): po „Začít ukázku“ a na začátku scény fokus na nadpis kroku, ne na body */
    return;
  }
  var step = st[i], mode = stepMode(s, sceneIdx(s), i, step);
  if (mode.mode === 'skip') { var to = skipEnd(s, i); s.tourSkips = skipRanges(s).concat([[i, to]]); s.tourStep = to; focusSel = null; watchSel = null; markTour(); NF.save(s); NF.render(); cardAfterStep(); focusPanel(); return; } /* M2: věta o přeskočení je jen v těle panelu; M3: celý úsek přeskočených kroků jedním Dál */
  running = i;
  if (!animated()) {
    try { (step.do || []).forEach(perform); } catch (err) { S().error = 'Krok ukázky selhal a byl přeskočen: ' + err.message; }
    S().tourStep = i + 1; running = null; watchSel = step.watch || null; focusSel = lastFocus(step); markTour(); NF.save(S()); NF.render(); focusPanel(); return;
  }
  busy = true; NF.render();
  runAnimated(step, function (failed) {
    S().tourStep = i + 1; /* i selhaný krok se přeskočí, hláška zůstane; prezentace se nezasekne */
    markTour(); NF.save(S()); busy = false; running = null; focusSel = failed ? null : lastFocus(step); /* zvýraznění zůstane, dokud garant nepokračuje (8. 10. 2026) */
    watchSel = failed ? null : (step.watch || null); NF.render();
    revealStep(); cardAfterStep(); /* V04: jen když překreslení (panel s položkami ke schválení) cíl odsunulo pod okraj; M3/M10: i štítek nabízené položky; M9: karta v panelu */
    focusPanel(); openPendingDrawer();
  });
};
/* Scéna se přehraje znovu a provede se prvních k kroků (krok zpět, návrat do příběhu, skok z registru na místo položky). */
/* back = krok zpět: uvnitř přeskočeného úseku se jde na jeho začátek (M1, kontrola 3: zpět nikdy nejde dopředu); jinak na jeho konec (M3). */
function replayTo(idx, k, back) {
  land(D.playScene(idx));
  var st = steps(), n = Math.max(0, Math.min(k, st.length));
  var sk = n > 0 && stepMode(S(), idx, n - 1, st[n - 1]).mode === 'skip';
  if (sk && back) { n = skipStart(S(), n - 1); sk = false; } else if (sk && n < st.length) n = skipEnd(S(), n); /* uvnitř přeskočeného úseku: na jeho konec (M3) */
  var ranges = [], open = -1;
  try {
    for (var j = 0; j < n; j++) {
      S().toast = '';
      var skip = stepMode(S(), idx, j, st[j]).mode === 'skip';
      if (skip && open < 0) open = j; if (!skip && open >= 0) { ranges.push([open, j]); open = -1; }
      if (!skip) (st[j].do || []).forEach(perform);
    }
  } catch (err) { S().error = 'Krok ukázky selhal: ' + err.message; } /* kosm. 10: hláška jen z posledního kroku */
  if (open >= 0) ranges.push([open, n]);
  S().tourSkips = ranges; /* replay neprovede kroky zamítnuté položky: jsou přeskočené */
  S().tourStep = n; watchSel = n > 0 && !sk ? (st[n - 1].watch || null) : null; focusSel = n > 0 && !sk ? lastFocus(st[n - 1]) : null; /* V08: zpět vrátí i zvýraznění */
  markTour(); NF.save(S()); NF.render(); shellTop(); revealStep(); cardAfterStep(); focusPanel();
}
D.replayTo = replayTo;
/* Krok zpět: scéna se přehraje znovu a provedou se všechny kroky kromě posledního. Na začátku scény = předchozí scéna. */
NF.demoActions.tourBack = function () {
  if (busy) return;
  if (away(S())) { NF.demoActions.tourReturn(); return; }
  storyHome = null;
  var s = S(), i = s.tourStep || 0, idx = sceneIdx(s); panelMsg = '';
  if (i === 0) { if (idx > 0) { sceneLeave('zpet', idx - 1); replayTo(idx - 1, Infinity); } return; } /* B22: na poslední krok předchozí scény, jak slibuje úvod („vrátí o krok“) */
  var blk = skipBlock(s, i); if (blk) { if (blk.from === 0) { if (idx > 0) { sceneLeave('zpet', idx - 1); replayTo(idx - 1, Infinity); } else replayTo(idx, 0); return; } replayTo(idx, blk.from, true); return; } /* M3: přeskočený úsek zpět jedním krokem */
  replayTo(idx, i - 1, true);
};
/* Záznam o opuštění scény (27. 10. 2026): stav a poznámka každé položky scény v okamžiku odchodu; správce z něj skládá pohled „Po scénách“. */
function sceneLeave(how, to) {
  var s = S(), idx = sceneIdx(s), ids = D.decisionItems(idx);
  /* 31 B1: zamítnutí jiné položky může položku z plánu scény odebrat (targetsWith); snímek proto nese i položky, o kterých garant v této scéně rozhodl nebo k nim napsal poznámku */
  glog.forEach(function (d) { if (d && d.item && Number(d.scene) === idx + 1 && ids.indexOf(d.item) < 0 && NF.item(s, d.item)) ids.push(d.item); });
  if (!D.sync || !D.sync.event) return null;
  return D.sync.event('scene', 'SCENA', sceneTitle(s), { how: how, to: to != null ? to + 1 : null, items: ids.map(function (id) { return { id: id, status: gStatus(id), note: gNote(id) }; }), pending: ids.filter(function (id) { return !gTouched(id); }) });
}
D.sceneLeave = sceneLeave;
NF.demoActions.tourRestart = function () { if (busy) return; land(D.playScene(sceneIdx(S()))); };
/* Sbalení panelu (V2/V3, 21. 10. 2026): výslovná volba garanta platí vždy; bez ní se panel na telefonu (do 600 px) otevírá sbalený
   a na 601–1279 px se na scénách lékaře a sestry sbalí na začátku každé scény, aby nepřekrýval data, o kterých scéna mluví. */
var pref = null, expandedScene = null;
try { pref = global.localStorage && global.localStorage.getItem('nutrifee-vypraveni'); } catch (err) { pref = null; }
function mq(q) { try { return !!(global.matchMedia && global.matchMedia(q).matches); } catch (err) { return false; } }
/* Kontrola 4 (přístupnost A1): panel je po boku až do šířky --nf-demo-side-min (640 px; dřív 1100 px) – při zvětšení prohlížeče 150–200 % na notebooku
   zůstane vyprávění vpravo v plné výšce místo listu dole. Hodnota je jednou v app/tokens.css; media query v demo.css i tady ji opisují. */
var SIDE_MIN = 640; /* = --nf-demo-side-min */
D.SIDE_MIN = SIDE_MIN;
D.narrow = function () { return mq('(max-width:' + SIDE_MIN + 'px)'); }; /* panel je dole: texty říkají „nahoře / dole“ místo „vlevo / vpravo“ */
function phone() { return mq('(max-width:600px)'); }
function isHidden(s) {
  s = s || S();
  if (pref === '0') return true;
  if (phone() && away(s)) return true; /* V13 (23. 10. 2026): mimo příběh na telefonu vždy jen řádek „Zpět do příběhu“ */
  if (phone()) return pref !== '1';
  /* kontrola 4 (A1): do 1100 px (i zvětšení prohlížeče 150–200 %) má rozbalený panel vyhrazený sloupec a obsah nepřekrývá – na začátku scény se nesbaluje */
  if (mq('(min-width:1101px) and (max-width:1279px)') && (s.role === 'doctor' || s.role === 'nurse') && s.page !== 'intro' && !away(s)) return expandedScene !== sceneIdx(s);
  return false;
}
var toggleFocus = false;
/* Kontrola 4 (přístupnost B3): po sbalení / rozbalení panelu fokus na nové přepínací tlačítko (panel se překreslí jako jiný prvek). */
function toggleFocusAfter() {
  if (!toggleFocus) return; toggleFocus = false;
  try { var b = doc.querySelector('.tour-panel [data-action="tourToggle"]'); if (b && b.focus) b.focus({ preventScroll: true }); } catch (err) { }
}
NF.demoActions.tourToggle = function () {
  var a = doc && doc.activeElement; toggleFocus = !!(a && a.getAttribute && a.getAttribute('data-action') === 'tourToggle');
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
/* C-CILE (rozhodnutí vlastníka 29. 10. 2026): zamítnutí je záznam nesouhlasu – maketa dál počítá s navrženými cíli, protože bez cílů nejde nic hodnotit
   (výjimka jako u P-LEKAR). Oznámení proto neříká „nefunguje“, ale že nesouhlas je zapsaný; co to znamená, říká text z průvodce. */
var RECORD_ONLY = { 'C-CILE': 1 };
/* Kontrola 2 (29. 10. 2026): záznam nesouhlasu podle průvodce (ucinek.ukaze === 'nesouhlas': C-CILE, K-KRITERIA, Z-GLUKOZA). */
(function () { var g = D.guide || {}; Object.keys(g).forEach(function (id) { if (g[id] && g[id].ucinek && g[id].ucinek.ukaze === 'nesouhlas') RECORD_ONLY[id] = 1; }); })();
function offHead(id) { return RECORD_ONLY[id] ? 'Váš nesouhlas je zapsaný.' : 'Tahle část nefunguje.'; }
D.recordOnly = function (id) { return !!RECORD_ONLY[id]; };
function offHtml(s, id, compact) {
  var r = NF.item(s, id); if (!r) return '';
  var g = (D.guide && D.guide[id]) || r.guide || {}, note = gNote(id);
  var why = typeof g.dopad === 'string' ? g.dopad : ''; /* K4: text průvodce už sám sebe necituje; v panelu se neopakuje (rejectedMsg) */
  return '<div class="off-notice' + (compact ? ' compact' : '') + '" role="status" data-off="' + e(id) + '"><span class="x" aria-hidden="true">✕</span><div><b>' + offHead(id) + '</b> Zamítli jste „' + e(r.title) + '“. ' + (why ? e(why) + ' ' : '') +
    (note ? '<span class="off-note">Vaše poznámka: „' + e(note) + '“</span> ' : '') +
    '<button type="button" class="btn sm" data-action="garantChange" data-value="' + e(id) + '">Změnit rozhodnutí</button></div></div>';
}
var offSeen = {}, offSeq = -1;
NF.slots.offNotice = function (s, id) {
  if (NF.renderSeq !== offSeq) { offSeq = NF.renderSeq; offSeen = {}; }
  if (offSeen[id]) return '<span class="off-mark" data-off="' + e(id) + '"></span>';
  offSeen[id] = 1; return offHtml(s, id, false);
};
/* Totéž na úrovni scény (panel vyprávění): zamítnuté položky jako sbalené karty, které jde rozbalit a rozhodnutí změnit na místě (27. 10. 2026). */
function offCards(s, ids, label, shown) {
  var rej = (ids || []).filter(function (id) { return !shown[id] && NF.item(s, id) && gStatus(id) === 'rejected'; });
  if (!rej.length) return '';
  rej.forEach(function (id) { shown[id] = 1; });
  return '<div class="garant off-scene"><p class="gtitle"><b>' + e(label) + '</b></p>' + rej.map(function (id) { return gitem(s, NF.item(s, id), openId(s, null) === id); }).join('') + '</div>';
}
/* V09: zamítnutí z minulé scény je vidět i na začátku další scény – položky bez místa na obrazovce (P-LEKAR, I-HYPO) by jinak zmizely bez stopy. */
function prevSceneOff(s, idx, ids, shown) {
  if (!idx || !D.scenes[idx - 1] || D.scenes[idx].appendix) return '';
  var prev = D.decisionItems(idx - 1).filter(function (id) { return (ids || []).indexOf(id) < 0; });
  return offCards(s, prev, 'Od minulé scény nefunguje', shown || {});
}
D.prevSceneOff = function (s) { s = s || S(); return prevSceneOff(s, sceneIdx(s), D.decisionItems(sceneIdx(s)), {}); };
function sceneRejected(s) { return D.decisionItems(sceneIdx(s)).filter(function (id) { var r = NF.item(s, id); return r && r.status === 'rejected'; }); }
function itemStatus(s, r) {
  var st = gStatus(r.id);
  return st === 'rejected' ? ['zamítnuto', 'bad'] : st === 'approved' ? ['schváleno', 'ok'] : ['nerozhodnuto', '']; /* K2 (kontrola 3): u garanta jedno slovo jako v tabulce a zásuvce; „ke schválení“ je štítek položky v aplikaci */
}
/* Jedna karta položky všude (panel, zásuvka, souhrn, registr v ukázce; 27. 10. 2026): „co schvalujete“, Schválit · Zamítnout jako dvě rovnocenné volby
   (rozhodnutí 12 platí dál; plná je jen zvolená), poznámka předvyplněná platným textem se stavem uložení, kdo a kdy rozhodl, průvodce a historie. */
var inPanel = false, autoOpen = null;
/* SCHEMA 83: v panelu zůstane právě rozhodnutá karta otevřená (pole poznámky pod tlačítky) vedle další nerozhodnuté; platí do dalšího kroku */
var kept = null;
function keptId(s) { return kept && s && kept.scene === sceneIdx(s) && kept.step === (s.tourStep || 0) && whereCtx(s) === 'panel' ? kept.id : null; }
function rtLabel(iso) { return iso ? NF.fmtShort(iso).replace(/ \d{4}$/, '') + ' ' + NF.fmtClock(iso) : ''; }
function savedLine(id) {
  var last = gLast(id);
  if (hasDraft(id) && String(drafts[id]) !== gNote(id)) return String(drafts[id]).length > NOTE_MAX ? 'Neuloženo: poznámka je delší než ' + NOTE_MAX + ' znaků; zkraťte ji.' : 'Ukládá se…'; /* SCHEMA 83: ukládá se samo po krátké pauze v psaní */
  /* kontrola 4 (B1): „Uloženo“ jen to, co je na serveru; jinak pravdivě v prohlížeči a čeká */
  var at = last && last.rt ? NF.fmtClock(last.rt) : '', stt = last ? entryState(last) : null, info = syncInfo();
  var where = stt === 'rejected' ? ' jen v tomto prohlížeči; server zápis odmítl' : stt === 'local' ? (info.err || !info.configured ? ' jen v tomto prohlížeči; na server se zatím nepodařilo odeslat' : ' v tomto prohlížeči; čeká na odeslání na server') : stt === 'server' ? ' na serveru' : '', ok = stt == null ? null : stt === 'server';
  if (last && last.comment) return 'Uloženo' + (at ? ' ' + at : '') + where + '.';
  if (last && last.kind === 'note') return 'Poznámka smazána' + (at ? ' ' + at : '') + (ok === false ? '; změna se zatím neodeslala na server' : '') + '.';
  return 'Poznámka se ukládá sama už při psaní.';
}
D.savedLine = savedLine;
/* 31 A1: karta garanta (panel, zásuvka, souhrn) ukazuje znění položky z kódu, ne modelovou verzi příběhu (scénář 5 zakládá ve stavu v2).
   Rozhoduje se o tom, co jde do aplikace; modelová verze patří jen na obrazovky příběhu. Otisk zobrazeného znění ukládá sync.js (ver.shown). */
var VIEW_KEYS = ['version', 'title', 'summary', 'detail', 'usedBy', 'params', 'labels', 'steps', 'text', 'texts', 'lists', 'postup', 'sestra', 'lever', 'kind'];
function garantView(s, r) {
  if (typeof r === 'string') r = NF.item(s, r);
  var c = r && D.sync && D.sync.codeItem ? D.sync.codeItem(r.id) : null; if (!c) return r;
  var o = Object.assign({}, r); VIEW_KEYS.forEach(function (k) { if (c[k] !== undefined) o[k] = c[k]; else delete o[k]; });
  if (!o.version) o.version = 'v1'; return o;
}
D.garantView = function (s, id) { return garantView(s || S(), id); };
NF.slots.garantView = garantView; /* pro obrazovku registru v jádře (V.shownItem, požadavek na jádro v 31-…/12-predavka-zaznam.md) */
/* 31 B3: poznámka nejvýš NOTE_MAX znaků (CHECK comment_len na serveru); počítadlo se ukáže od 90 % limitu */
var NOTE_MAX = (D.sync && D.sync.NOTE_MAX) || 4000;
/* SCHEMA 83 (vlastník 2. 11. 2026): popisek a nápověda pole podle rozhodnutí */
var NOTE_LABEL = { approved: 'Proč jste schválili? (nepovinné)', rejected: 'Proč jste zamítli? (nepovinné)' };
var NOTE_HINT = { approved: 'Např. s čím souhlasíte nebo co doplnit', rejected: 'Např. co je špatně a jaké znění nebo hodnotu chcete' };
D.NOTE_LABEL = NOTE_LABEL; D.NOTE_HINT = NOTE_HINT;
/* SCHEMA 83: po sobě jdoucí úpravy téže poznámky (každá pauza v psaní je řádek) se v historii ukážou jako jedna řádka s posledním zněním;
   v deníku i na serveru zůstávají všechny. Hranice: další úprava do EDIT_GAP_MS od předchozí. */
var EDIT_GAP_MS = 120000;
function mergeEdits(list, ms) {
  var out = [];
  list.forEach(function (d) {
    var p = out[out.length - 1];
    if (p && p.kind === 'note' && d.kind === 'note' && p.item === d.item && Math.abs(ms(d) - ms(p)) <= EDIT_GAP_MS) { out[out.length - 1] = Object.assign({}, d, { edits: (p.edits || 1) + 1 }); return; }
    out.push(d);
  });
  return out;
}
function editsText(n) { return n > 1 ? ' (' + n + ' ' + (n < 5 ? 'úpravy' : 'úprav') + ')' : ''; }
D.mergeEdits = mergeEdits; D.EDIT_GAP_MS = EDIT_GAP_MS;
function countText(id) { var n = String(fieldText(id)).length; return n >= NOTE_MAX * 0.9 ? n + ' z ' + NOTE_MAX + ' znaků' : ''; }
function gbody(s, r, o) {
  o = o || {};
  var cur = gStatus(r.id), g = (D.guide && D.guide[r.id]) || r.guide || {}, SAFE = (NF.screens && NF.screens.SAFETY_ITEMS) || {};
  var choice = function (label, key, cls) { return '<button type="button" class="btn sm gchoice' + (cls ? ' ' + cls : '') + (cur === key ? ' on' : '') + '" data-action="garantDecide" data-value="' + e(r.id + ':' + key) + '" aria-pressed="' + (cur === key ? 'true' : 'false') + '">' + (cur === key ? '✓ ' : '') + e(label) + '</button>'; };
  var guide = ''; if (!o.noGuide) { inPanel = true; try { guide = NF.screens.itemGuide(s, garantView(s, r)); } finally { inPanel = false; } }
  var ds = gDecs(r.id), lastD = ds[ds.length - 1], all = gEntries(r.id);
  /* M8 (kontrola 4): poznámka, po které do 10 s přišlo rozhodnutí se stejným textem, je jeden záznam (ukládání ji sloučí) */
  var hist = mergeEdits(all.filter(function (d, k) { var nx = all[k + 1]; return !(d.kind === 'note' && nx && nx.kind === 'decision' && String(nx.comment || '') === String(d.comment || '') && Math.abs(Date.parse(nx.rt || 0) - Date.parse(d.rt || 0)) <= 10000); }), function (d) { return Date.parse(d.rt || 0); }).reverse();
  return '<div class="gb">' +
    (g.co ? '<p class="gco"><b>Co schvalujete:</b> ' + e(firstSentence(g.co)) + '</p>' : '') + laterLine(s, r.id) +
    '<div class="gchoices" role="group" aria-label="Rozhodnutí o položce">' + choice('Schválit', 'approved') + choice('Zamítnout', 'rejected', 'gno') + '</div>' +
    (rejectAsk === r.id && SAFE[r.id] ? '<div class="gask" role="alert"><p class="small"><b>Zamítnutím přestane fungovat ochrana pacientů:</b> ' + e(safeText(r.id)) + ' Opravdu zamítnout?</p><div class="actions">' + btn('Ano, zamítnout', 'garantDecide', r.id + ':rejected:ano', 'danger sm') + btn('Ne, zpět', 'garantRejectCancel', null, 'sm') + '</div></div>' : '') +
    (cur ? '<label class="field gnote-field"><span>' + e(NOTE_LABEL[cur]) + '</span><textarea rows="2" maxlength="' + NOTE_MAX + '" data-gnote="' + e(r.id) + '" placeholder="' + e(NOTE_HINT[cur]) + '">' + e(fieldText(r.id)) + '</textarea><span class="small muted" data-gcount="' + e(r.id) + '" aria-live="polite">' + e(countText(r.id)) + '</span></label>' +
    '<p class="gsaved small muted" data-gsaved="' + e(r.id) + '" aria-live="polite">' + e(savedLine(r.id)) + '</p>' : '') + /* SCHEMA 83: pole až po rozhodnutí, hned pod tlačítky */
    (cur === 'rejected' ? '<p class="goff" data-off="' + e(r.id) + '"><b>' + offHead(r.id) + '</b> Změnit rozhodnutí můžete kdykoli tlačítky výše.</p>' : '') + /* SCHEMA 83: rozhodnutá karta zůstává otevřená, a tak co zamítnutí znamená, řekne i otevřená karta (dřív jen sbalený řádek) */
    (lastD ? '<p class="gwho small">Rozhodli jste: <b>' + e(NF.STATUS[lastD.status] || lastD.status) + '</b>' + (lastD.rt ? ' · ' + e(rtLabel(lastD.rt)) : '') + '</p>' : '') +
    (o.noGuide ? '' : '<details class="more gguide"><summary>Průvodce položkou: proč existuje, jak funguje, kde je použita a co se stane při zamítnutí</summary>' + guide + '</details>') +
    (hist.length ? '<details class="more ghist"><summary>Historie (' + hist.length + ')</summary><ul class="plain small">' + hist.map(function (d) {
      return '<li>' + e(d.rt ? rtLabel(d.rt) : '') + ' · ' + (d.kind === 'note' ? (d.comment ? 'poznámka' : 'poznámka smazána') + editsText(d.edits) : '<b>' + e(NF.STATUS[d.status] || d.status) + '</b>') + (d.comment ? ' · „' + e(d.comment) + '“' : '') + '</li>';
    }).join('') + '</ul></details>' : '') + '</div>';
}
/* C9 (kontrola 2): položka se rozhoduje dřív, než garant viděl celé její chování – karta řekne, ve kterých dalších scénách ji uvidí. */
function laterLine(s, id) {
  var here = sceneIdx(s), fin = mainSceneOf('trace'), later = storyScenesOf(id).filter(function (i) { return i > here && i < fin && !D.scenes[i].appendix; });
  if (!later.length || summaryActive(s)) return '';
  return '<p class="small muted glater">Uvidíte ji ještě ' + (later.length > 1 ? 've scénách ' : 've scéně ') + later.slice(0, 4).map(function (i) { return i + 1; }).join(', ') + (later.length > 4 ? ' a dalších' : '') + '.</p>';
}
function notePreview(id) { var n = gNote(id); return n ? '<p class="gprev">„' + e(NF.screens.noteLine ? NF.screens.noteLine(n) : n) + '“</p>' : ''; }
function gitem(s, r, isOpen, o) {
  var st = itemStatus(s, r), note = gNote(r.id), title = (garantView(s, r) || r).title;
  return '<div class="gitem' + (flashId === r.id ? ' gflash' : '') + (isOpen ? ' open' : '') + '" data-gitem="' + e(r.id) + '"><button type="button" class="gh" data-action="garantOpen" data-value="' + e(r.id) + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '"><span class="t">' + e(title) + '</span>' + NF.screens.tag(st[0], st[1]) + (note ? '<span class="gnote-ic" title="má poznámku"><span aria-hidden="true">' + NF.icon('message') + '</span><span class="sr-only">má poznámku</span></span>' : '') + '<span class="chev" aria-hidden="true">' + (isOpen ? '⌃' : '⌄') + '</span></button>' +
    (isOpen ? gbody(s, r, o) : notePreview(r.id) + (st[1] === 'bad' ? '<p class="goff" data-off="' + e(r.id) + '"><b>' + offHead(r.id) + '</b> <button type="button" class="tour-link" data-action="garantOpen" data-value="' + e(r.id) + '">Změnit rozhodnutí</button></p>' : '')) + '</div>';
}
/* Která karta je rozbalená: výslovná volba (s.gOpen; '-' = žádná), jinak první nerozhodnutá z nabídnutých. */
function openId(s, list) {
  if (s.gOpen === '-') return null;
  if (s.gOpen) return s.gOpen;
  var first = (list || []).filter(function (id) { return !gTouched(id); })[0];
  return first || null;
}
/* Schvalování přímo v kroku (8. 10. 2026): položky scény, které právě působí na obrazovce, se nabídnou hned s celým průvodcem;
   na posledním kroku scény i zbývající nerozhodnuté položky scény. Rozhodnutí nikdy nebrání pokračování. */
/* M2 (27. 10. 2026): položka, jejíž krok nabídky se přeskočil (stojí na zamítnuté položce), na obrazovce vidět nebyla – v této scéně se nenabízí
   a garant ji rozhodne v souhrnu na konci (tam je ve skupině „Nerozhodnuto“). */
function offerSkipped(s, idx, id, st) {
  var k = offerStep(idx, id); if (!(k !== Infinity && k >= 1 && !!st[k - 1] && stepMode(s, idx, k - 1, st[k - 1]).mode === 'skip')) return false; /* pojistka: mapa alt má takovou položku přesunout jinam */
  if (idx === sceneIdx(s) && k <= (s.tourStep || 0) && !skippedAt(s, k - 1)) return false; /* M1 (kontrola 3): krok garant viděl, položku zamítl až potom – nabídka zůstává */
  return true;
}
D.offerSkipped = function (id, s) { s = s || S(); return offerSkipped(s, sceneIdx(s), id, steps()); };
function approvalsList(s, idx, i, st) {
  var ids = D.decisionItems(idx).filter(function (id) { return !offerSkipped(s, idx, id, st); }); if (!ids.length || (i === 0 && st.length)) return { now: [], rest: [], list: [] }; /* před prvním krokem jen výhled: garant nejdřív vidí, o čem rozhoduje */
  var lastStep = i >= st.length;
  var now = ids.filter(function (id) { return offerStep(idx, id) <= i; }); /* B01: od kroku, v němž je štítek ve výřezu cíle; nabídnutá zůstává do konce scény */
  var rest = lastStep ? ids.filter(function (id) { return now.indexOf(id) < 0; }) : [];
  return { now: now, rest: rest, list: now.concat(rest) };
}
/* Co brání pokračování (8. 10. 2026, pokyn vlastníka: garant jde krok za krokem a schvaluje): nerozhodnuté nabídnuté položky, ve finále nepotvrzený souhrn. */
function pendingNow(s) {
  if (away(s)) return { ids: [], summary: false };
  var st = steps(), i = s.tourStep || 0, idx = sceneIdx(s), sc = D.scenes[idx];
  var finale = sc && !sc.appendix && D.chapters[sc.ch].id === 'trace' && i >= st.length;
  /* Kontrola 3 (B1, M4): ve finále rozhoduje garant v tabulce souhrnu; panel blokuje jen potvrzení souhrnu. Nerozhodnuté položky po potvrzení
     („Potvrdit přesto“) dodatek neblokují a panel je nepočítá zvlášť – počet říká jedno místo, tabulka a lišta. */
  var ids = finale ? [] : approvalsList(s, idx, i, st).list.filter(function (id) { return !NF.itemTouched(s, id); });
  return { ids: ids, summary: !!(finale && (!prog.done || changedSinceConfirm())) }; /* B1 (27. 10. 2026): po změně se souhrn potvrzuje znovu stejně jako poprvé */
}
D.pendingNow = function (s) { return pendingNow(s || S()); };
/* Co panel právě nabízí ke schválení (pro pravdivost.test.cjs, T1). */
D.offeredNow = function (s) { s = s || S(); if (away(s)) return []; var st = steps(), i = s.tourStep || 0; return approvalsList(s, sceneIdx(s), i, st).list; };
function approvalsBlock(s, idx, i, st, shown) {
  shown = shown || {};
  var al = approvalsList(s, idx, i, st), now = al.now, list = al.list.filter(function (id) { return NF.item(s, id); });
  var pin = pinned && list.indexOf(pinned) < 0 && !shown[pinned] && NF.item(s, pinned) ? pinned : null;
  list.forEach(function (id) { shown[id] = 1; }); if (pin) shown[pin] = 1;
  var open = openId(s, list); autoOpen = s.gOpen ? null : open;
  var undecided = list.filter(function (id) { return !gTouched(id); }).length;
  var all = D.decisionItems(idx), decided = all.filter(function (id) { return gTouched(id); }).length;
  var offs = i > 0 ? offCards(s, all, 'V této scéně nefunguje', shown) : '';
  var moved = movedHere(s, idx, i, st, list);
  var movedP = moved.length ? '<p class="small gmoved">' + moved.map(function (id) { var r = NF.item(s, id), by = movedBy(id); return 'O položce „' + e(r ? r.title : id) + '“ rozhodnete v souhrnu na konci, protože ' + (by && by.length ? 'jste zamítli ' + e(titles(s, by)) + ' a její místo na obrazovce zmizelo.' : 'její místo na obrazovce po vašem zamítnutí zmizelo.'); }).join(' ') + '</p>' : '';
  var kp = keptId(s);
  var out = (pin ? '<p class="gtitle"><b>Změnit rozhodnutí</b></p>' + gitem(s, NF.item(s, pin), open === pin || kp === pin) : '') +
    (list.length ? '<p class="gtitle"><b>' + (now.length ? 'Ke schválení teď' : 'Z této scény ještě ke schválení') + (undecided ? ' (' + undecided + ')' : '') + '</b></p>' +
      '<p class="small">' + (undecided ? 'Rozhodněte, než budete pokračovat: Schválit, nebo Zamítnout. Poznámku můžete připsat po rozhodnutí; je nepovinná.' : moved.length ? 'Nabídnuté položky jsou rozhodnuté; změnit lze kdykoli.' : 'Vše rozhodnuto; změnit lze kdykoli.') + '</p>' +
      list.map(function (id) { return gitem(s, NF.item(s, id), open === id || kp === id); }).join('') : '') + movedP + offs;
  if (!out && i > 0 && all.length) out = '<p class="small muted gscene-count">V této scéně rozhodnuto ' + decided + ' z ' + all.length + '.</p>';
  return out ? '<div class="garant decide" id="tour-decide">' + out + '</div>' : '';
}
/* Kontrola 4 (M5): položky, které se v tomto kroku měly nabídnout (schválený běh), ale po zamítnutí jiné položky se nenabízejí a jdou do souhrnu – panel to řekne. */
function movedHere(s, idx, i, st, list) {
  if (!i) return [];
  var base = decisionPlan([])[idx] || [], tg = targetsWith(idx, []), last = i >= st.length;
  return base.filter(function (id) {
    if ((list || []).indexOf(id) >= 0 || gTouched(id) || !NF.item(s, id)) return false;
    var k = tg[id], m = D.itemScene[id]; if (k == null) k = Infinity; if (m && m.step && k !== Infinity) k = Math.max(k, m.step);
    if (!(k <= i || last)) return false;
    return !!movedBy(id) || (decisionPlan()[idx] || []).indexOf(id) < 0 || offerSkipped(s, idx, id, st);
  });
}
D.movedHere = function (s) { s = s || S(); var st = steps(); return movedHere(s, sceneIdx(s), s.tourStep || 0, st, approvalsList(s, sceneIdx(s), s.tourStep || 0, st).list); };
/* Úvod scény: co se v ní bude schvalovat, jako sbalené řádky se stavem a poznámkou (už rozhodnuté jdou změnit na místě). */
function sceneIntroHint(s, ids, shown) {
  ids = (ids || []).filter(function (id) { return NF.item(s, id); });
  if (!ids.length) return '';
  ids.forEach(function (id) { shown[id] = 1; });
  var open = s.gOpen && s.gOpen !== '-' ? s.gOpen : null;
  return '<div class="garant gintro"><p class="tour-next">V této scéně schvalujete: ' + ids.length + ' ' + plural(ids.length, 'položku', 'položky', 'položek') + '.</p>' + ids.map(function (id) { return gitem(s, NF.item(s, id), open === id || keptId(s) === id); }).join('') + '</div>';
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
  return '<div class="gcounts">' + [[sum.approved, 'schváleno'], [sum.rejected, 'zamítnuto'], [sum.remaining, 'nerozhodnuto'], [sum.noted, 's poznámkou']].map(function (x) { return '<div><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>';
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
/* Skupiny po scénách v pořadí, v jakém garant položky potkal (mapa D.decisionItems); položky bez scény jsou ve finále. */
function sceneGroups(s) {
  var ids = NF.garantItems(s).map(function (r) { return r.id; }), seen = {}, out = [];
  D.scenes.forEach(function (sc, i) {
    if (sc.appendix) return;
    var list = D.decisionItems(i).filter(function (id) { return ids.indexOf(id) >= 0 && !seen[id]; });
    if (!list.length) return; list.forEach(function (id) { seen[id] = 1; });
    out.push({ idx: i, label: i === mainSceneOf('trace') ? 'Jen v souhrnu (příběh je neukázal)' : 'Scéna ' + (i + 1) + ' · ' + (sc.title || D.chapters[sc.ch].title), ids: list });
  });
  var rest = ids.filter(function (id) { return !seen[id]; });
  if (rest.length) out.push({ idx: -1, label: 'Bez vlastní scény', ids: rest });
  return out;
}
D.sceneGroups = function (s) { return sceneGroups(s || S()); };
function sceneOfItem(s, id) { var g = sceneGroups(s).filter(function (x) { return x.ids.indexOf(id) >= 0; })[0]; return g ? g.label : ''; }
/* M6 (27. 10. 2026): řádek rozhodnutý v souhrnu zůstane na místě (ve skupině „Nerozhodnuto“ se svým novým stavem a poznámkou), dokud garant souhrn neopustí;
   přeřadí se až při dalším otevření. Obrazovka ho po zavření detailu podrží v okně a krátce zvýrazní. */
var sumKeep = {}, sumRowTo = null;
/* M12 (kontrola 2): proč se položka v příběhu nenabídla (zamítnutím jiné položky zmizelo její místo na obrazovce). */
function notOfferedWhy(s, id) {
  var by = movedBy(id); if (!by) return '';
  return by.length ? 'V příběhu jsme ji nenabídli: zamítli jste ' + titles(s, by) + ', a tak její místo na obrazovce zmizelo.' : 'V příběhu jsme ji nenabídli: její místo na obrazovce zmizelo po vašem zamítnutí jiné položky.';
}
D.notOfferedWhy = function (id, s) { return notOfferedWhy(s || S(), id); };
function summaryRow(s, r, open) {
  var st = gStatus(r.id), tg = st ? itemStatus(s, r) : ['nerozhodnuto', ''], c = gNote(r.id), did = 'gsum-d-' + r.id, why = st ? '' : notOfferedWhy(s, r.id);
  return '<tr class="gsum-row' + (open ? ' open' : '') + (flashId === r.id ? ' gflash' : '') + '" data-gsum-row="' + e(r.id) + '"><th scope="row"><span class="t">' + e(r.title) + '</span><span class="s">' + e(r.id + ' · ' + NF.catLabel(r.cat)) + '</span>' + (why ? '<span class="s gsum-why">' + e(why) + '</span>' : '') + '</th>' +
    '<td class="gsum-st"><span class="gsum-l">Stav</span>' + NF.screens.tag(tg[0], tg[1]) + '</td>' +
    '<td class="gsum-c"><span class="gsum-l">Poznámka</span>' + (c ? '„' + e(c) + '“' : '<span class="muted">bez poznámky</span>') + '</td>' +
    '<td class="gsum-act"><button type="button" class="btn sm" data-action="garantOpen" data-value="' + e(r.id) + '" aria-expanded="' + (open ? 'true' : 'false') + '"' + (open ? ' aria-controls="' + e(did) + '"' : '') + ' aria-label="' + e((open ? 'Zavřít' : st ? 'Změnit' : 'Rozhodnout') + ': ' + r.title) + '">' + (open ? 'Zavřít' : st ? 'Změnit' : 'Rozhodnout') + '</button></td></tr>' +
    (open ? '<tr class="gsum-detail" id="' + e(did) + '"><td colspan="4"><div class="garant decide"><div class="gitem gsum-item open" data-gitem="' + e(r.id) + '">' + gbody(s, r) + '</div></div></td></tr>' : '');
}
function summaryPage(s) {
  var items = NF.garantItems(s), sum = gSummary(s), open = s.gOpen, pan = D.narrow() ? 'v panelu dole' : 'v panelu vpravo';
  var byId = {}; items.forEach(function (r) { byId[r.id] = r; });
  var todo = items.filter(function (r) { return !gTouched(r.id) || sumKeep[r.id]; });
  var group = function (label, list, n) { return list.length ? '<tbody><tr class="gsum-group"><th colspan="4" scope="colgroup">' + e(label) + ' (' + (n != null ? n : list.length) + ')</th></tr>' + list.map(function (r) { return summaryRow(s, r, open === r.id); }).join('') + '</tbody>' : ''; };
  var changedSince = changedSinceConfirm(), moved = todo.filter(function (r) { return !gTouched(r.id) && movedBy(r.id); }).length;
  return '<div class="gsum-page" id="gsum"><p class="gsum-kicker">Závěr hlavní linie · souhrn rozhodnutí</p><h1>Vaše rozhodnutí</h1>' +
    '<p class="gsum-lead">Všech ' + sum.total + ' položek registru, seskupených podle scén, ve kterých se v ukázce nabídly. Zkontrolujte je, případně změňte a souhrn potvrďte ' + pan + '. Jde o neformální podklad, ne podpis.' + (moved ? ' ' + (moved === 1 ? 'Jedna položka se v příběhu nenabídla' : moved + (moved < 5 ? ' položky se v příběhu nenabídly' : ' položek se v příběhu nenabídlo')) + ', protože jste zamítli jinou; u každé je napsáno proč.' : '') + '</p>' + /* M12, K5 (kontrola 2) */
    '<div class="gsum-counts">' + counts(sum) + '</div>' +
    (prog.done ? '<p class="gsum-state' + (changedSince ? ' again' : '') + '">' + (changedSince ? 'Od potvrzení ' + e(prog.doneAt || '') + ' jste rozhodnutí změnili; potvrďte souhrn znovu.' : '✓ Souhrn potvrzen ' + e(prog.doneAt || '') + '. Rozhodnutí můžete dál měnit.') + '</p>' : '') +
    (panelMsg && isHidden(s) ? '<p class="gsum-msg" role="status">' + e(panelMsg) + '</p>' : '') + /* hláška je v panelu; při sbaleném panelu ji ukážeme tady */
    '<table class="gsum-table"><caption class="sr-only">Vaše rozhodnutí k pravidlům aplikace po scénách, nerozhodnutá první</caption><thead><tr><th scope="col">Položka</th><th scope="col">Stav</th><th scope="col">Poznámka</th><th scope="col"><span class="sr-only">Změnit</span></th></tr></thead>' +
    group('Nerozhodnuto', todo, sum.remaining) + sceneGroups(s).map(function (g) { return group(g.label, g.ids.filter(function (id) { return gTouched(id) && !sumKeep[id] && byId[id]; }).map(function (id) { return byId[id]; })); }).join('') + '</table>' +
    '<p class="gsum-foot small"><button type="button" class="tour-link" data-action="gsumTrace">Zobrazit obrazovku Verze a stopa</button> – záznam každého výpočtu, rady a rozhodnutí, o kterém mluvil poslední krok.</p></div>';
}
function changedSinceConfirm() { return !!(prog.done && glog.some(function (d) { return d.kind === 'decision' && d.rt && d.rt > prog.done; })); }
var prevPage = NF.slots.pageOverride;
NF.slots.pageOverride = function (s) {
  if (summaryActive(s)) return summaryPage(s);
  /* Rozhodnutí 4 (30. 10. 2026): v příběhu ukážeme oznámení telefonu (komponenta jádra V.phoneNotice) nad obrazovkou pacienta; v produkci ho kreslí systém telefonu */
  if (s && s.demoNotice && s.role === 'patient' && NF.screens.phoneNotice) { var pn = NF.screens.phoneNotice(s); if (pn) return String(NF.screens.patient(s)).replace('<div class="patient-shell">', '<div class="patient-shell has-notice">' + pn); }
  return prevPage ? prevPage(s) : '';
};
/* Panel ve finále: jen potvrzení souhrnu (stránka je vlevo, na užší obrazovce nahoře). */
function summarySide(s, changedSince) {
  var sum = gSummary(s), where = D.narrow() ? 'nahoře' : 'vlevo';
  return '<div class="garant decide gsum-side">' + (changedSince ? '<p class="tour-status tour-block">Od potvrzení jste rozhodnutí změnili; potvrďte souhrn znovu.</p>' : '') +
    '<p class="gtitle"><b>Souhrn vašich rozhodnutí</b> · rozhodnuto ' + sum.touched + ' z ' + sum.total + '</p>' +
    (showTrace ? '<p class="small">Teď vidíte obrazovku Verze a stopa.</p><div class="actions">' + btn('Zpět na souhrn', 'gsumTrace') + '</div>' :
      '<p class="small">Tabulka ' + where + ' ukazuje všechna pravidla, nerozhodnutá první; tam je můžete změnit. Potvrzení říká autorovi makety, že jste souhrn zkontrolovali; které scény jste prošli, vidí zvlášť.</p>' +
      (sum.remaining ? '<p class="small gsum-left"><b>Nerozhodnuto ' + sum.remaining + '.</b> ' + (sum.remaining === 1 ? 'Je' : 'Jsou') + ' v tabulce ' + where + ' na jejím začátku, ve skupině „Nerozhodnuto“. Souhrn můžete potvrdit i bez nich; rozhodnout je půjde i potom.</p>' : '')) +
    '</div>'; /* B1: tlačítko potvrzení (i opakovaného) je jen jedno, dole v patičce panelu, i s otázkou „potvrdit přesto?“ */
}
/* Závěrečná obrazovka (rozhodnutí 12): po potvrzení souhrnu poděkování, počty, co bude dál a dvě volby. */
function thanksBlock(s, changedSince) {
  var sum = gSummary(s), ap = appendixScenes().length, saved = allSaved();
  return '<div class="tour-thanks"><h3>' + (saved ? 'Děkujeme, máme vaše rozhodnutí' : 'Děkujeme. Rozhodnutí zatím nejsou odeslaná') + '</h3>' + (saved ? '' : syncLine(s, true)) + counts(sum) +
    '<p class="small">Souhrn potvrzen ' + e(prog.doneAt || '') + (changedSince ? '. Od té doby jste rozhodnutí změnili, potvrďte ho prosím znovu.' : '.') + '</p>' +
    '<p class="small"><b>Co bude dál:</b> autor makety vaše rozhodnutí a poznámky zapracuje a ozve se vám. Jde o neformální podklad; pro ostrý provoz se pravidla podepisují znovu.</p>' +
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
    say('Zbývá ' + sum.remaining + ' ' + plural(sum.remaining, 'nerozhodnutá položka', 'nerozhodnuté položky', 'nerozhodnutých položek') + ' – potvrdit přesto? Rozhodnout je můžete i potom, v tabulce souhrnu nebo v zásuvce „Vaše rozhodnutí“. Dodatek je otevřený i s nimi.');
    return;
  }
  confirmAsk = false;
  prog.done = now.toISOString(); prog.doneAt = NF.fmtShort(prog.done) + ' ' + NF.fmtTime(prog.done); prog.max = Math.max(prog.max || 0, sceneIdx(s)); saveProg();
  var rej = NF.garantItems(s).filter(function (r) { return gStatus(r.id) === 'rejected'; }).map(function (r) { return r.id; });
  var pend = NF.garantItems(s).filter(function (r) { return !gTouched(r.id); }).map(function (r) { return r.id; });
  if (D.sync && D.sync.event) D.sync.event('summary', 'SOUHRN', 'Souhrn rozhodnutí potvrzen', { approved: sum.approved, rejected: sum.rejected, pending: sum.remaining, noted: sum.noted, total: sum.total, rejectedIds: rej, pendingIds: pend, scene: sceneIdx(s) + 1, total_scenes: D.scenes.length });
  s.gOpen = null; say(''); panelTop = true; /* V12: poděkování je první – panel se odroluje nahoru, jinak by na telefonu zůstalo nad viditelnou částí listu */
};
var panelTop = false;
NF.demoActions.tourFinish = function () { sceneLeave('konec', null); setEnded(true); NF.closeDrawer(); };
/* Konec ukázky a konec dodatku: zpět na stránku „Vaše rozhodnutí“ (finále hlavní linie po posledním kroku). */
NF.demoActions.goSummary = function () { var fin = mainSceneOf('trace'); if (fin < 0) return; setEnded(false); NF.closeDrawer(); if (sceneIdx(S()) !== fin) sceneLeave('skok', fin); var n = T.stepsFor('trace', branches()).length; replayTo(fin, n); };
NF.demoActions.tourUnfinish = function () { setEnded(false); };
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
var PAGE_NOM = { intro: 'Úvod', registry: 'Schvalovací registr', trace: 'Verze a stopa', review: 'Kontrola', enroll: 'Zařazení a plán', training: 'Zaučení', today: 'Dnes', foods: 'Jídla', food: 'Detail jídla', plan: 'Plán', safety: 'Bezpečí', preview: 'Přehled před kontrolou', meal: 'Zápis jídla', understand: 'Převzetí plánu', takeover: 'Převzetí plánu', newplan: 'Nový plán', import: 'Dnes', importPage: 'Nahrát export' };
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
  var map = { intro: 'úvod', registry: 'schvalovací registr', trace: 'verzi a stopu', review: 'kontrolu', enroll: 'zařazení a plán', training: 'zaučení', today: 'obrazovku Dnes', foods: 'jídla', food: 'detail jídla', plan: 'plán', safety: 'Bezpečí', preview: 'přehled před kontrolou', meal: 'zápis jídla', understand: 'převzetí plánu', takeover: 'převzetí plánu', newplan: 'nový plán', import: 'obrazovku Dnes', importPage: 'nahrání exportu' };
  return map[s.page] || 'obrazovku aplikace';
}
/* ---------- panel vyprávění (rozhodnutí 12, 19. 10. 2026) ----------
   Akce jsou vždy dole přilepené; nad nimi řádek stavu. Když čeká položka, vyprávění se sbalí na nadpis a jednu větu.
   Jediné tlačítko vpřed „Dál ▶“ (na úvodu „Začít ukázku ▶“); kam se jde, říká řádek nad ním. */
var moreOpen = false, flashId = null, jumpTo = null;
NF.demoActions.tourMore = function () { moreOpen = !moreOpen; };
NF.demoActions.tourJumpPending = function () {
  var s = S(), pn = pendingNow(s); if (!pn.ids.length) return;
  var id = pn.ids[0]; s.gOpen = id; flashId = id; jumpTo = id; tagTo = id;
  if (isHidden(s)) NF.demoActions.tourToggle();
};
/* Kosm. 2 (27. 10. 2026): konec věty uvnitř citace „…“ není konec první věty – citace se nikdy neusekne bez uzavírací uvozovky. */
function firstSentence(t) {
  var txt = String(t || '').replace(/<[^>]+>/g, ''), re = /[.!?…]“?(?=\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ„]|\s*$)/g, m;
  while ((m = re.exec(txt))) {
    var cut = txt.slice(0, m.index + m[0].length), open = (cut.match(/„/g) || []).length, close = (cut.match(/“/g) || []).length;
    if (open <= close) return cut;
  }
  return txt;
}
D.firstSentence = firstSentence;
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
/* K5 (kontrola 3): „i“ je tlačítko, které vysvětlení ukáže pod hlavičkou (title na dotykovém zařízení nic neukáže). */
var infoOpen = false, INFO_TEXT = 'Fialová tlačítka ovládají ukázku. Petrolejová jsou tlačítka budoucí aplikace; ukázka je klepe za vás. Fialově podtečkované věci vysvětlí bublina po klepnutí.';
NF.demoActions.tourInfo = function () { infoOpen = !infoOpen; };
function head(collapsible) {
  return '<div class="tour-head"><span class="tour-head-t">Ovládání ukázky</span><button type="button" class="tour-info" data-action="tourInfo" aria-expanded="' + (infoOpen ? 'true' : 'false') + '" aria-label="Jak ukázku ovládat" title="' + e(INFO_TEXT) + '">i</button>' +
    (collapsible ? '<button type="button" class="tour-icon" data-action="tourToggle" aria-expanded="true" aria-label="Sbalit panel" title="Sbalit panel">▾</button>' : '') + '</div>' +
    (infoOpen ? '<p class="tour-info-text small" role="note">' + e(INFO_TEXT) + '</p>' : '');
}
function panel(s) {
  var ch = chapter(s), st = steps(), i = s.tourStep || 0;
  var idx = sceneIdx(s), sc = D.scenes[idx], pos = position(s);
  if (away(s)) {
    /* V13 (23. 10. 2026): na telefonu list mimo příběh vždy jen jeden řádek, aby nezakrýval registr, ve kterém garant právě upravuje */
    if (isHidden(s)) return '<div class="tour-panel tour-min tour-away-min" role="region" aria-label="Ovládání ukázky"><span class="tour-min-t">Mimo příběh · ' + e(pageName(s)) + '</span>' + (phone() ? '' : btn('Zobrazit vyprávění', 'tourToggle')) + btn('Zpět do příběhu ▶', 'tourReturn', null, 'primary') + '</div>';
    return '<aside class="tour-panel tour-away" aria-label="Vyprávění k ukázce">' + head(true) + '<div class="tour-body"><p class="tour-kicker">Mimo příběh</p><h2>Prohlížíte ' + e(pageName(s)) + '</h2>' +
      '<p class="small">Scéna „' + e(sceneTitleAt(homeScene(s))) + '“ na vás počká; návrat ji obnoví přesně v kroku, kde jste byli. Rozhodnutí, která tu uděláte, platí i v příběhu.</p></div>' +
      '<div class="tour-foot"><p class="tour-status" role="status">' + e(panelMsg) + '</p><div class="tour-actions">' + btn('Vaše rozhodnutí', 'openDecisions') + btn('Zpět do příběhu ▶', 'tourReturn', null, 'primary') + '</div></div></aside>';
  }
  var hidden = isHidden(s); captureToast(s); /* S8: hlášky v příběhu patří do panelu (zachyceno už v liště; tady pro vykreslení mimo jádro) */
  if (ended) {
    var saved = allSaved(), signed = syncInfo().on;
    return '<aside class="tour-panel tour-end" aria-label="Ovládání ukázky">' + head(false) + '<div class="tour-body"><h2>Ukázka skončila</h2>' +
      (saved ? '<p>Děkujeme za váš čas. ' + (signed ? 'Vaše rozhodnutí jsou uložená na serveru; můžete okno zavřít.' : 'Můžete okno zavřít.') + '</p>' : '<p>Děkujeme za váš čas. Rozhodnutí zatím nejsou odeslaná na server – nechte prosím okno otevřené a zůstaňte online, dokud se neuloží.</p>' + syncLine(s, true)) + '<p class="small">Rozhodnutí můžete dál měnit: tlačítkem „Zpět na souhrn“ níže, nebo v liště nahoře tlačítkem „' + e(barTodoLabel(s)) + '“, které otevře zásuvku „Vaše rozhodnutí“.</p></div>' +
      '<div class="tour-foot"><p class="tour-status" role="status">' + e(panelMsg) + '</p><div class="tour-actions">' + btn('← Zpět do ukázky', 'tourUnfinish') + btn('Zpět na souhrn', 'goSummary', null, 'primary') + '</div></div></aside>';
  }
  var intro = (T.chapters[ch.id] || {}).intro || { t: ch.title, co: '' };
  var shown = running != null ? st[running] : (i > 0 ? st[i - 1] : intro);
  var last = idx >= lastIndex() && i >= st.length;
  var upcoming = i >= st.length && !last ? D.scenes[idx + 1] : null;
  var toAppendix = upcoming && upcoming.appendix && !(sc && sc.appendix);
  var nextStep = i < st.length ? st[i] : null, ids = D.decisionItems(idx);
  var finale = sc && !sc.appendix && ch.id === 'trace' && i >= st.length;
  var changedSince = changedSinceConfirm();
  var thanks = finale && prog.done && !changedSince;
  var pn = pendingNow(s), nPend = pn.ids.length;
  var label = busy ? 'Probíhá…' : idx === 0 && !nextStep ? 'Začít ukázku ▶' : 'Dál ▶';
  var nextOff = busy || last;
  var nextAttr = nextOff ? ' disabled' : (nPend || pn.summary) ? ' aria-disabled="true"' : '';
  var nextBtn = thanks ? btn('Skončit', 'tourFinish') + btn('<span class="t-long">Projít varianty v dodatku ▶</span><span class="t-short">Dodatek ▶</span>', 'tourNext', null, 'primary', busy ? ' disabled' : '') : /* K2: na telefonu krátce */
    finale && pn.summary ? (confirmAsk ? confirmButtons() : btn(changedSince ? 'Potvrdit souhrn znovu' : 'Potvrdit souhrn', 'garantConfirmSummary', null, 'primary', busy ? ' disabled' : '')) : /* V4: ve finále je jedinou akcí panelu potvrzení souhrnu; V16: s nerozhodnutými položkami nejdřív otázka */
    last ? btn('Zpět na souhrn', 'goSummary') + btn('Skončit', 'tourFinish', null, 'primary') : btn(e(label), 'tourNext', null, 'primary' + (nPend || pn.summary ? ' is-blocked' : ''), nextAttr);
  var jump = nPend && !busy ? '<button type="button" class="tour-status-link" data-action="tourJumpPending">Rozhodněte ' + nPend + ' ' + plural(nPend, 'položku', 'položky', 'položek') + (isHidden(s) ? ' v panelu' : ' výše ↑') + '</button>' : '';
  /* V14 (23. 10. 2026): název scény nad tlačítky, řádek ← · Rozbalit · Dál ▶ s Dál vpravo */
  var sn = shownNarration(s);
  if (hidden) return '<div class="tour-panel tour-min" role="region" aria-label="Ovládání ukázky"><span class="tour-min-t">' + e(thanks ? (allSaved() ? 'Děkujeme, máme vaše rozhodnutí' : 'Rozhodnutí zatím nejsou odeslaná') : finale ? 'Souhrn vašich rozhodnutí' : (sn.t || sceneTitle(s))) + '</span>' + syncLine(s, false) + '<p class="tour-status sr-only" role="status">' + e(panelMsg) + '</p><div class="tour-min-row">' + btn('←', 'tourBack', null, '', busy ? ' disabled' : ' aria-label="Zpět"') + btn('Rozbalit', 'tourToggle', null, '', ' aria-expanded="false" aria-label="Rozbalit panel vyprávění"') + (jump || nextBtn) + '</div></div>';
  var collapse = (nPend > 0 && i > 0 || finale) && !busy && !moreOpen; /* když čeká rozhodnutí (nebo je hotovo), vyprávění jen nadpisem a jednou větou */
  /* kontrola 2: přeskočený úsek (M3) i krok se zamítnutou částí (note) mají jednu větu místo vyprávění, které by popisovalo, co na obrazovce není */
  /* kontrola 4 (M2): v režimu „note“ věta o zamítnuté části nad vyprávěním, vyprávění kroku zůstává (bez vět, které popisují zamítnutou část) */
  var src = sn.mode === 'note' && sn.note ? sn : shown, hasRows = !!(val(src.co) || val(src.vsimni) || val(src.proc) || val(src.dusledek));
  var notePara = sn.mode === 'note' && sn.note ? '<p class="tour-lead tour-note"><span class="sr-only">Po vašem zamítnutí: </span>' + e(sn.note) + '</p>' : '';
  var narration = sn.mode === 'skip' || (sn.mode === 'note' && !sn.note) ? '<p class="tour-lead tour-' + sn.mode + '">' + e(sn.co) + '</p>' :
    notePara + (!hasRows ? '' : collapse ? '<p class="tour-lead">' + e(firstSentence(val(src.co) || val(src.vsimni) || '')) + '</p><button type="button" class="tour-link" data-action="tourMore" aria-expanded="false">Více k tomuto kroku</button>' :
    '<dl class="tour-rows">' + rows(src) + '</dl>' + ((nPend > 0 || finale) && moreOpen ? '<button type="button" class="tour-link" data-action="tourMore" aria-expanded="true">Méně</button>' : ''));
  /* V12: po potvrzení je poděkování první, vyprávění až pod ním (na telefonu by jinak bylo pod listem) */
  var seen = {}; /* každá karta položky je v panelu jen jednou */
  var body = (finale && thanks ? thanksBlock(s, false) : '') + narration + (i === 0 ? actOverview(s, idx) + sceneIntroHint(s, ids, seen) + prevSceneOff(s, idx, ids, seen) : '') + (finale ? (thanks ? '' : summarySide(s, changedSince)) : approvalsBlock(s, idx, i, st, seen));
  var sub = busy ? '' : nextStep ? 'Dál: ' + nextStep.t : upcoming ? (toAppendix ? (finale && pn.summary ? 'Po potvrzení: dodatek s ' : 'Dál: dodatek s ') + appendixScenes().length + ' variantami, asi 4 minuty' : 'Dál: scéna „' + (upcoming.title || D.chapters[upcoming.ch].title) + '“') : last ? 'Konec dodatku. Rozhodnutí můžete dál měnit v souhrnu.' : '';
  var kicker = finale ? 'Souhrn rozhodnutí' : running != null ? 'Krok ' + (running + 1) + ' z ' + st.length : i === 0 ? (idx === 0 ? 'Začátek ukázky' : 'Začátek scény') : 'Krok ' + i + ' z ' + st.length;
  return '<aside class="tour-panel' + (finale ? ' tour-decide' : '') + (nPend ? ' tour-pending' : '') + '" aria-label="Ovládání ukázky">' + head(true) +
    '<div class="tour-body"><p class="tour-kicker">' + e(kicker) + '</p>' + (whereNow(s) ? '<p class="tour-where">' + e(whereNow(s)) + '</p>' : '') + '<h2>' + e(sn.t || shown.t || sceneTitle(s)) + '</h2>' + body +
    (idx === 1 ? '<p class="tour-hint">Ovládejte ukázku jen fialovými tlačítky v tomto panelu. Petrolejová tlačítka ' + (D.narrow() ? 'nahoře' : 'vlevo') + ' jsou skutečná tlačítka budoucí aplikace; ukázka je klepe za vás.</p>' : '') + /* S12: od scény 2; úvod to říká sám */
    (returnTo && !busy ? '<p class="tour-next">Přišli jste sem z registru (položka ' + e(returnTo.item) + ').</p>' : '') + '</div>' +
    '<div class="tour-foot">' + syncLine(s, false) + '<p class="tour-status" role="status">' + e(panelMsg) + '</p>' + jump + /* B4 (přístupnost): živá je jen krátká hláška, ne celé vyprávění */
    (busy ? '<p class="tour-next tour-running">' + e(running != null && (st[running].do || []).some(isAct) ? 'Ukázka klepe…' : 'Ukázka ukazuje…') + '</p>' : sub ? '<p class="tour-next">' + e(sub) + '</p>' : '') +
    '<div class="tour-actions">' + (returnTo && !busy ? btn('← Zpět do registru', 'regReturn') : '') + btn('← Zpět', 'tourBack', null, '', busy || (idx === 0 && i === 0) ? ' disabled' : '') + nextBtn + '</div>' +
    progressBar(s, i, st) + '</div></aside>';
}
/* „Kde je použita“: v registru odkazy na scény příběhu; v panelu vyprávění jen text, aby garanta nevytrhly z průchodu (S5).
   B04/B05 (27. 10. 2026): scény z mapy demo/scene-items.js (štítek na obrazovce nebo ve výřezu cíle), vzestupně; scéna rozhodnutí je označená. */
function decisionSceneOf(id) { var plan = decisionPlan(); for (var i = 0; i < plan.length; i++) if (plan[i].indexOf(id) >= 0) return i; return -1; }
D.decisionSceneOf = decisionSceneOf;
function storyScenesOf(id) {
  var where = [];
  (D.sceneItems || []).forEach(function (sc, i) { if (D.scenes[i] && ((sc.items || []).indexOf(id) >= 0 || (sc.targets || {})[id] != null)) where.push(i); });
  var dec = decisionSceneOf(id); if (dec >= 0 && where.indexOf(dec) < 0) where.push(dec);
  return where.sort(function (x, y) { return x - y; });
}
D.storyScenesOf = storyScenesOf;
NF.slots.itemWhere = function (s, id) {
  var where = storyScenesOf(id), dec = decisionSceneOf(id), fin = mainSceneOf('trace');
  if (!where.length) return '<p class="small muted">V příběhu se neukazuje.</p>';
  var name = function (i) { return (D.scenes[i].title || D.chapters[D.scenes[i].ch].title) + (i === dec ? (i === fin ? ' (rozhodujete zde, v souhrnu)' : ' (rozhodujete zde)') : ''); };
  if (inPanel) return '<p class="small">V příběhu: ' + e(where.map(function (i) { return (i + 1) + '. ' + name(i); }).join(' · ')) + '.</p>';
  return '<p class="small">V příběhu:</p><div class="buttonlist">' + where.map(function (i) { return btn((i + 1) + '. ' + name(i), 'goSceneFrom', i + ':' + id, 'sm'); }).join('') + '</div>' + (modelRegistry(s) ? '' : '<p class="small muted">Ze scény se vrátíte tlačítkem „Zpět do registru“ v panelu.</p>'); /* M7: ve scéně 18 je registr součást příběhu, návrat do registru tam neplatí */
};
/* Z registru na místo v příběhu a zpět (12. 10. 2026; M6 27. 10. 2026): skok vede na krok, kde je položka vidět,
   a „← Zpět do registru“ platí, dokud garant ze scény neodejde (dřív ho zrušilo první Dál). */
var returnTo = null;
NF.demoActions.goSceneFrom = function (v) {
  var p = String(v).split(':'), idx = Number(p[0]), id = p[1]; if (!D.scenes[idx]) return;
  var s0 = S(); if (!storyHome && away(s0) && s0.tourRole) storyHome = { scene: sceneIdx(s0), step: s0.tourStep || 0 }; /* M6: odkud garant do registru odešel */
  NF.closeDrawer(); if (sceneIdx(S()) !== idx) sceneLeave('skok', idx);
  returnTo = { item: id, scene: idx };
  var tk = offerStep(idx, id); if (tk !== Infinity) { replayTo(idx, tk); return; } /* B01: krok, v němž je štítek ve výřezu cíle */
  land(D.playScene(idx));
  var st = steps(), k = 0;
  try { while (k < st.length && D.itemsOnScreen(S()).indexOf(id) < 0) { (st[k].do || []).forEach(perform); k++; } } catch (err) { k = 0; }
  replayTo(idx, D.itemsOnScreen(S()).indexOf(id) >= 0 ? k : 0);
};
NF.demoActions.regReturn = function () { var id = returnTo && returnTo.item; returnTo = null; NF.demoActions.openAsideItem(id); };
D.returnTo = function () { return returnTo; };
/* Průvodce položkou pro vysvětlující bublinu (demo/explain.js): „Kde je použita“ jen textem, aby odkaz garanta nevytrhl ze scény. */
D.itemGuideHtml = function (s, r) { inPanel = true; try { return NF.screens.itemGuide(s, r); } finally { inPanel = false; } };
/* Rozbalit / sbalit kartu; i automaticky rozbalenou první nerozhodnutou jde sbalit ('-' = žádná). */
NF.demoActions.garantOpen = function (v) { var s = S(); rejectAsk = null; if (keptId(s) === v) { kept = null; return; } kept = null; s.gOpen = s.gOpen === v || (!s.gOpen && autoOpen === v) ? '-' : v; if (s.gOpen === v && whereCtx(s) === 'panel') tagTo = v; if (whereCtx(s) === 'souhrn') sumRowTo = v; if (whereCtx(s) === 'zasuvka') drawerFocus = v; }; /* M1 (kontrola 4): zásuvka drží polohu a ukáže otevřenou kartu */
/* Návrat do registru (jen „← Zpět do registru“, kam garanta poslal registr sám): detail položky se ukáže od začátku pod lištou (B3). */
NF.demoActions.openAsideItem = function (v) { var s = S(); panelMsg = ''; s.role = 'doctor'; s.page = 'registry'; s.reg = s.reg || {}; s.reg.open = v; NF.scrollTarget = '.reg-side'; NF.closeDrawer(); };
function decorate() {
  var s0 = S(), gsum = summaryActive(s0);
  if (doc.body) { var hidden = isHidden(s0), locked = !away(s0) && !gsum; /* B1 (27. 10. 2026): zamčeno i se sbaleným panelem a na telefonu */ lastLayout = layoutKey(); doc.body.className = doc.body.className.replace(/\bpres-\w+/g, '').trim() + ' pres-' + s0.role + (locked ? ' pres-locked' : '') + (hidden ? '' : ' pres-panel') + (gsum ? ' pres-summary' : ''); } /* stránka souhrnu není zamčená: garant v ní rozhoduje (V4) */ /* pres-panel = panel vyprávění je rozbalený (demo.css mu dělá místo) */
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
  /* M8 (27. 10. 2026): pod 1100 px je panel dole; obsah dostane dole místo rovné jeho výšce, aby cíl kroku mohl vyjet nad panel */
  /* 27. 10. 2026 (M11): od horní hrany panelu po spodek okna (sbalený list pacienta sedí nad lištou záložek); demo.css podle toho zvedne i lištu „Další krok“ */
  try { var pn = doc.querySelector('.tour-panel'), vh = global.innerHeight || 0, h = pn && D.narrow() ? Math.max(0, Math.round(vh - pn.getBoundingClientRect().top)) : 0; if (doc.documentElement && doc.documentElement.style) doc.documentElement.style.setProperty('--panelh', h + 'px'); } catch (err2) { }
}
/* Odkaz „Rozhodněte N položek výše ↑“: odroluje panel k první nerozhodnuté položce a krátce ji zvýrazní. */
function jumpAfterRender() {
  if (!jumpTo || !doc || typeof doc.querySelector !== 'function') { jumpTo = null; return; }
  var id = jumpTo; jumpTo = null;
  var el = null; try { el = doc.querySelector('.tour-panel [data-gitem="' + id + '"]'); } catch (err) { el = null; }
  if (!el) return;
  panelToCard(el);
  /* SCHEMA 83: patička panelu po rozhodnutí ještě mění výšku (hláška); poloha karty s polem poznámky se po ustálení ověří znovu,
     jen pokud garant mezitím panelem sám neroloval a nepíše */
  if (settleId === id) { var pn0 = doc.querySelector('.tour-panel'); cardHold = { id: id, until: Date.now() + 5000, st: pn0 ? pn0.scrollTop : 0 }; if (global.setTimeout) [350, 1000].forEach(function (ms) { global.setTimeout(resettle, ms); }); }
  settleId = null;
  var h = el.querySelector && el.querySelector('.gh'); if (h && h.focus) { try { h.focus({ preventScroll: true }); } catch (err) { } }
  global.setTimeout(function () { flashId = null; if (el.classList) el.classList.remove('gflash'); }, 1800);
}
/* M9 (27. 10. 2026): karta položky se v panelu odroluje tak, aby její hlavička byla hned pod záhlavím panelu (Schválit/Zamítnout pak nad patičkou);
   ručně, aby se nerolovalo okno. */
function panelToCard(el) {
  try {
    var pn = doc.querySelector('.tour-panel'); if (!pn || !pn.contains(el)) return;
    var hd = pn.querySelector('.tour-head'), ft = pn.querySelector('.tour-foot'), top = (hd ? hd.getBoundingClientRect().bottom : pn.getBoundingClientRect().top) + 8;
    var bot = ft ? ft.getBoundingClientRect().top : pn.getBoundingClientRect().bottom, ch = el.querySelector('.gnote-field') || el.querySelector('.gchoices'), r = el.getBoundingClientRect(), c = ch ? ch.getBoundingClientRect() : r;
    if (r.top >= top - 8 && c.bottom <= bot) return; /* hlavička karty i Schválit/Zamítnout jsou vidět: panel se nehýbe (na počítači zůstane vidět i nadpis kroku) */
    var dy = r.top - top; if (c.bottom - dy > bot - 4) dy = c.bottom - (bot - 4); /* nízké okno: karta se celá nevejde – Schválit/Zamítnout mají přednost před hlavičkou */
    if (Math.abs(dy) > 1) pn.scrollTop += dy;
  } catch (err) { }
}
/* SCHEMA 83: po rozhodnutí v panelu se poloha karty s polem poznámky srovná ještě několik sekund při každém překreslení (hláška a stav uložení
   v patičce mění její výšku), dokud garant panelem sám nehne ani nezačne psát. */
var cardHold = null, settleId = null;
function resettle() {
  try {
    if (!cardHold || Date.now() > cardHold.until) { cardHold = null; return; }
    var pn = doc.querySelector('.tour-panel'), a = doc.activeElement, el = pn && pn.querySelector('[data-gitem="' + cardHold.id + '"]');
    if (!pn || !el || Math.abs(pn.scrollTop - cardHold.st) > 1 || (a && a.getAttribute && a.getAttribute('data-gnote'))) { cardHold = null; return; }
    panelToCard(el); cardHold.st = pn.scrollTop;
  } catch (err) { cardHold = null; }
}
/* SCHEMA 83: pole poznámky, do kterého se v panelu píše, nesmí zajet pod patičku (její výška se mění s hláškou o uložení) ani pod záhlaví. */
function fieldInView() {
  try {
    var a = doc.activeElement, pn = doc.querySelector('.tour-panel'); if (!a || !pn || !pn.contains(a) || !a.getAttribute || !a.getAttribute('data-gnote')) return;
    var hd = pn.querySelector('.tour-head'), ft = pn.querySelector('.tour-foot'), top = (hd ? hd.getBoundingClientRect().bottom : pn.getBoundingClientRect().top) + 4, bot = (ft ? ft.getBoundingClientRect().top : pn.getBoundingClientRect().bottom) - 4, r = a.getBoundingClientRect();
    if (r.bottom > bot) pn.scrollTop += Math.min(r.bottom - bot, r.top - top); else if (r.top < top) pn.scrollTop -= top - r.top; /* nevejde-li se celé, je vidět jeho začátek */
  } catch (err) { }
}
D.fieldInView = fieldInView;
function cardAfterStep() { var s = S(), pn = pendingNow(s); if (!pn.ids.length) { try { var pl = doc.querySelector('.tour-panel'); if (pl) pl.scrollTop = 0; } catch (err0) { } return; } /* nový krok bez rozhodnutí: panel od začátku */ var id = s.gOpen && s.gOpen !== '-' ? s.gOpen : pn.ids[0]; var el = null; try { el = doc.querySelector('.tour-panel [data-gitem="' + id + '"]'); } catch (err) { el = null; } if (el) panelToCard(el); }
/* ---------- panel vyprávění v DOM až za #app (přístupnost 23. 10. 2026, nález 10) ----------
   Vizuálně je panel přilepený (position:fixed), ale Tab z lišty DEMO jde nejdřív obrazovkou aplikace a pak do panelu, jak je to vidět.
   Překresluje se stejným morphem jako jádro (jen co se změnilo: fokus v komentáři a rolování panelu zůstávají); stav <details> podle textu summary. */
function tourRoot() {
  var el = doc && doc.getElementById ? doc.getElementById('tour') : null;
  /* kontrola 4 (B1): místo v DOM hned za lištou drží jádro (NF.slots.afterBanner); dřívější prvek za #app (přihlašovací brána) se uklidí */
  try { var app0 = doc.getElementById('app'), inApp = app0 && app0.querySelector ? app0.querySelector('#tour') : null; if (inApp) { Array.prototype.slice.call(doc.querySelectorAll('[id="tour"]')).forEach(function (x) { if (x !== inApp && x.parentNode) x.parentNode.removeChild(x); }); el = inApp; } } catch (err0) { }
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
      if (NF.keepCaret) NF.keepCaret(el, function () { morphKids(el, tmp); }); else morphKids(el, tmp); /* SCHEMA 83: fokus a kurzor v poli poznámky přežijí i posun struktury */
    } catch (err) { el.innerHTML = html; }
  } else el.innerHTML = html;
}
D.panelHtml = function (s) { return panel(s || S()); };
function panelToTop() { if (!panelTop) return; panelTop = false; try { var b = doc.querySelector('.tour-panel .tour-body'), pn = doc.querySelector('.tour-panel'); if (b) b.scrollTop = 0; if (pn) pn.scrollTop = 0; } catch (err) { } }
/* M6: řádek souhrnu, o kterém se právě rozhodlo (nebo který se rozbalil), zůstane v okně; po rozhodnutí krátce zvýrazněný. */
function sumRowAfterRender() {
  if (!sumRowTo || !doc || typeof doc.querySelector !== 'function') { sumRowTo = null; return; }
  var id = sumRowTo; sumRowTo = null; if (!summaryActive(S())) return;
  var el = null; try { el = doc.querySelector('#app [data-gsum-row="' + id + '"]'); } catch (err) { el = null; }
  if (!el) return;
  reveal(el, true);
  try { var a = doc.activeElement; if (!a || a === doc.body || !doc.contains(a)) { var b = el.querySelector('[data-action="garantOpen"]'); if (b && b.focus) b.focus({ preventScroll: true }); } } catch (err2) { } /* kontrola 4 (B3): fokus na řádek položky, ne na body */
  if (flashId === id) global.setTimeout(function () { if (flashId === id) flashId = null; if (el.classList) el.classList.remove('gflash'); }, 1800);
}
NF.slots.afterRender = function (s) { if (prevAfter) prevAfter(s); renderPanel(s); decorate(); measureBar(); jumpAfterRender(); drawerAfterRender(); panelToTop(); sumRowAfterRender(); tagAfterRender(); focusAfterRender(); fieldInView(); resettle(); toggleFocusAfter(); lockDescribe(); docTitle(s); };
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
  var OUT = '.tour-panel,.tour-min,.pres-bar,#overlay,.drawer,.pres-drawer,.lock-bubble,.gsum-page,#lock-bubble,#explain-bubble,.off-notice,.intro summary';
  var t = ev.target; if (closestSel(t, OUT)) return false; /* V7 (27. 10. 2026): „Změnit rozhodnutí“ v oznámení funguje i v zamčené obrazovce (demo.css mu vrací pointer-events) */
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

/* ---------- zámek obrazovky i pro klávesnici (kontrola 4, přístupnost B1) ----------
   Myš a dotyk zámek drží přes pointer-events; klávesnice by tlačítko v obrazovce stiskla. V zamčeném příběhu se proto Enter, mezerník a klávesový „klik“
   na ovládacím prvku obrazovky zruší a ukáže se tatáž bublina jako při klepnutí (je v živé oblasti, čtečka ji přečte). Main nese popis zámku. */
function lockedNow() { var b = doc && doc.body; return !!(b && /(^|\s)pres-locked(\s|$)/.test(b.className || '')); }
var LOCK_OUT = '.tour-panel,.tour-min,.pres-bar,#overlay,.drawer,.pres-drawer,.lock-bubble,.gsum-page,#lock-bubble,#explain-bubble,.off-notice,.intro summary';
function lockedKeyTarget(t) {
  if (!lockedNow() || !t || !t.closest) return null;
  var m = doc.querySelector ? doc.querySelector('main') : null; if (!m || !m.contains(t) || closestSel(t, LOCK_OUT)) return null;
  if (t.hasAttribute && t.hasAttribute('data-nf-explain')) return null; /* vysvětlivka se otevírá Enterem (demo/explain.js) */
  return closestSel(t, D.CONTROL_SEL);
}
function lockBubbleAt(el) {
  var b = bubbleEl(); if (!b || !el || !el.getBoundingClientRect) return;
  var r = el.getBoundingClientRect(), vh = global.innerHeight || 0, x = r.left + r.width / 2, y = r.bottom;
  if (D.explainHide) D.explainHide(false);
  b.innerHTML = e(NF.nbspText(D.lockBubbleText()));
  if (b.style && b.style.setProperty) { b.style.setProperty('--x', Math.round(x) + 'px'); b.style.setProperty('--y', Math.round(y) + 'px'); }
  if (b.classList) { b.classList.add('on'); b.classList.toggle('above', !!(vh && y > vh * 0.6)); }
  if (bubbleTimer && global.clearTimeout) global.clearTimeout(bubbleTimer);
  bubbleTimer = global.setTimeout(hideBubble, BUBBLE_MS);
}
D.lockedKey = function (ev) {
  var ctl = lockedKeyTarget(ev && ev.target); if (!ctl) return false;
  if (ev.type === 'keydown') {
    var k = ev.key, typing = /^(INPUT|TEXTAREA|SELECT)$/.test(ctl.tagName || '') && ctl.type !== 'checkbox' && ctl.type !== 'radio';
    if (!(k === 'Enter' || k === ' ' || k === 'Spacebar' || (typing && k && k.length === 1) || (typing && /^(Backspace|Delete|ArrowUp|ArrowDown)$/.test(k)))) return false;
  }
  if (ev.preventDefault) ev.preventDefault(); if (ev.stopImmediatePropagation) ev.stopImmediatePropagation(); else if (ev.stopPropagation) ev.stopPropagation();
  lockBubbleAt(ctl); return true;
};
if (doc && doc.addEventListener) {
  doc.addEventListener('keydown', function (ev) { D.lockedKey(ev); }, true);
  doc.addEventListener('click', function (ev) { if (ev.detail === 0) D.lockedKey(ev); }, true); /* klávesový „klik“ (Enter na tlačítku, mezerník na zaškrtávátku) */
}
var LOCK_DESC = 'nf-lock-desc';
function lockDescribe() {
  try {
    var m = doc.getElementById('main'); if (!m) return;
    var d = doc.getElementById(LOCK_DESC);
    if (!d && doc.createElement && doc.body) { d = doc.createElement('span'); d.id = LOCK_DESC; d.className = 'sr-only'; d.setAttribute('aria-hidden', 'true'); doc.body.appendChild(d); } /* jen jako popis (aria-describedby), mimo orientační body ho čtečka nečte zvlášť */
    if (d) d.textContent = 'Ukázka: obrazovku ovládá panel ' + (D.narrow() ? 'dole' : 'vpravo') + '; ovládací prvky obrazovky klepe ukázka.';
    var cur = (m.getAttribute('aria-describedby') || '').split(/\s+/).filter(function (x) { return x && x !== LOCK_DESC; });
    if (lockedNow()) cur.push(LOCK_DESC);
    if (cur.length) m.setAttribute('aria-describedby', cur.join(' ')); else m.removeAttribute('aria-describedby');
  } catch (err) { }
}
/* Kontrola 4 (přístupnost C14): titulek okna podle scény (čtečka i záložky prohlížeče). */
function docTitle(s) { try { if (!doc || doc.title == null) return; var t = summaryActive(s) ? 'Souhrn rozhodnutí' : ended ? 'Ukázka skončila' : sceneTitle(s); doc.title = (t ? t + ' · ' : '') + 'NutriFee · maketa'; } catch (err) { } }

/* ---------- poznámka garanta: ukládá se sama (O2, 27. 10. 2026; SCHEMA 83, vlastník 2. 11. 2026) ----------
   Psaní nepřekresluje (fokus i kurzor zůstanou); řádek pod polem říká „Ukládá se…“. Po 1 s bez psaní, při opuštění pole a při zavření stránky
   se poznámka uloží bez překreslení a řádek řekne „Uloženo HH:MM“ (na serveru / v tomto prohlížeči). Žádné tlačítko „Uložit“. */
function setSavedLines(id) {
  try { var els = doc.querySelectorAll('[data-gsaved="' + id + '"]'); for (var k = 0; k < els.length; k++) els[k].textContent = NF.nbspText ? NF.nbspText(savedLine(id)) : savedLine(id); } catch (err) { }
}
if (doc && doc.addEventListener) {
  doc.addEventListener('input', function (ev) {
    var t = ev.target, id = t && t.getAttribute && t.getAttribute('data-gnote'); if (!id) return;
    drafts[id] = String(t.value); saveDrafts(); setSavedLines(id); armNoteTimer(id); fieldInView();
    try { var cs = doc.querySelectorAll('[data-gcount="' + id + '"]'); for (var k = 0; k < cs.length; k++) cs[k].textContent = countText(id); } catch (err) { } /* 31 B3 */
  });
  doc.addEventListener('change', function (ev) {
    var t = ev.target, id = t && t.getAttribute && t.getAttribute('data-gnote'); if (!id) return;
    cancelNoteTimer(id); drafts[id] = String(t.value); saveDrafts(); saveNote(id); setSavedLines(id);
  });
  /* M9 (kontrola 2): koncept obnovený po F5 se uloží i opuštěním pole bez úpravy (change u nezměněné hodnoty nevznikne) */
  doc.addEventListener('focusout', function (ev) {
    var t = ev.target, id = t && t.getAttribute && t.getAttribute('data-gnote'); if (!id || !hasDraft(id)) return;
    cancelNoteTimer(id); drafts[id] = String(t.value); saveDrafts(); saveNote(id); setSavedLines(id);
  });
}

/* ---------- panel prezentujícího ---------- */
function branchPicker(s, key) {
  var b = D.branches[key], cur = (s.branches || D.defaults)[key];
  return '<h4>' + e(b.label) + '</h4><div class="buttonlist">' + b.options.map(function (o) { return '<button type="button" class="btn ' + (cur === o.id ? 'selected' : '') + '" data-action="setBranch" data-value="' + e(key + ':' + o.id) + '">' + e(o.label) + '</button>'; }).join('') + '</div>';
}
/* Přehled scén (V7, 19. 10. 2026): garant tu nemá jinou navigaci po scénách, proto nahoře seznam se stavem
   hotové / tady / zbývá a počtem položek ke schválení, dodatek jako vlastní oddíl na konci, nástroje prezentujícího sbalené. */
function sceneRow(s, si, here) {
  var sc = D.scenes[si], ids = D.decisionItems(si), open = ids.filter(function (id) { return !gTouched(id); }).length;
  var state = si === here ? 'here' : si <= (prog.max || 0) ? 'done' : 'todo', word = { here: 'tady', done: si > here ? 'už jste viděli' : 'hotové', todo: 'zbývá' }[state]; /* kontrola 4 (kosm. 12): scéna za „tady“ po kroku Zpět */
  var mark = { here: '▶', done: '✓', todo: '○' }[state];
  return '<div class="scene-line"><button type="button" class="btn scene-row ' + state + '" data-action="goScene" data-value="' + si + '"' + (state === 'here' ? ' aria-current="step"' : '') + '><span class="sr-mark" aria-hidden="true">' + mark + '</span><span class="sr-t">' + e(sc.title || D.chapters[sc.ch].title) + '</span><span class="sr-s">' + word + '</span></button>' +
    (open ? '<button type="button" class="tour-link sr-open" data-action="openDecisions" data-value="' + si + '">' + open + ' ' + plural(open, 'nerozhodnutá', 'nerozhodnuté', 'nerozhodnutých') + '</button>' : '') + '</div>';
}
/* Zásuvka „Vaše rozhodnutí“ (O3, 27. 10. 2026): nad příběhem, příběh stojí a nic se nepřehrává. Nerozhodnuté nahoře, pak po scénách; tytéž karty jako v panelu. */
var drawerFocus = null;
function decisionsDrawer(s) {
  var sum = gSummary(s), groups = sceneGroups(s), open = s.gOpen && s.gOpen !== '-' ? s.gOpen : null;
  var todo = 0; groups.forEach(function (g) { todo += g.ids.filter(function (id) { return !gTouched(id); }).length; });
  var out = '<div class="pres-drawer gdrawer"><h2>Vaše rozhodnutí</h2><p class="small muted">Příběh stojí; po zavření pokračujete tam, kde jste byli. Rozhodnuto ' + sum.touched + ' z ' + sum.total + '.</p>' + counts(sum) + '<div class="gsync">' + syncLine(s, false) + '</div>' + /* SCHEMA 83: stálý obal; řádek stavu ukládání se při psaní objevuje a mizí a struktura pod ním se nesmí posunout */
    '<div class="garant decide">' +
    (todo ? '<h3 data-dscene="todo">Nerozhodnuto (' + todo + ')</h3>' + groups.map(function (g) { var ids = g.ids.filter(function (id) { return !gTouched(id); }); return ids.length ? '<p class="gscene small muted">' + e(g.label) + '</p>' + ids.map(function (id) { return gitem(s, NF.item(s, id), open === id); }).join('') : ''; }).join('') : '<p class="small">Vše rozhodnuto. Změnit můžete kterékoli rozhodnutí níže.</p>') +
    groups.map(function (g) {
      var done = g.ids.filter(function (id) { return gTouched(id); });
      return '<h3 data-dscene="' + g.idx + '">' + e(g.label) + '</h3>' + (done.length ? done.map(function (id) { return gitem(s, NF.item(s, id), open === id); }).join('') : '<p class="small muted">Zatím nic rozhodnuto.</p>');
    }).join('') + '</div>' +
    '<div class="actions mt-3">' + btn('Zavřít a pokračovat v příběhu', 'closeDrawer', null, 'primary') + '</div></div>';
  return out;
}
/* Kontrola 4 (kosm. 5): během přehrávání kroku se zásuvka otevře až po jeho dohrání (jinak by se krok dohrál za ní a garant by ho neviděl). */
var openAfterRun = null;
NF.demoActions.openDecisions = function (v) {
  var s = S(); if (busy) { openAfterRun = { v: v }; say('Zásuvka „Vaše rozhodnutí“ se otevře, jakmile ukázka dohraje tento krok.'); return; }
  if (v != null && v !== '' && NF.item(s, v)) s.gOpen = v; drawerFocus = v != null && v !== '' ? String(v) : null; NF.openDrawer('decisions');
};
function openPendingDrawer() { if (!openAfterRun) return; var o = openAfterRun; openAfterRun = null; if (panelMsg && /^Zásuvka „Vaše rozhodnutí“ se otevře/.test(panelMsg)) panelMsg = ''; NF.demoActions.openDecisions(o.v); NF.render(); }
function drawerAfterRender() {
  if (!drawerFocus || !doc || typeof doc.querySelector !== 'function') { drawerFocus = null; return; }
  var f = drawerFocus, el = null; drawerFocus = null;
  try { el = f === 'confirm' ? doc.querySelector('#overlay .pres-confirm') : doc.querySelector('#overlay [data-gitem="' + f + '"]') || doc.querySelector('#overlay [data-dscene="' + f + '"]'); } catch (err) { el = null; }
  if (!el) return;
  /* M1 (kontrola 4): karta se ukáže, jen když není celá vidět (zásuvka jinak drží polohu); M10: potvrzení zůstane vidět */
  try {
    var pnl = doc.querySelector('#overlay .drawerpanel'), r = el.getBoundingClientRect(), q = pnl ? pnl.getBoundingClientRect() : { top: 0, bottom: global.innerHeight || 0 };
    var head = el.querySelector && el.querySelector('.gh'), hr = head ? head.getBoundingClientRect() : r;
    if (f === 'confirm') el.scrollIntoView({ block: 'center' });
    else if (hr.top < q.top || hr.bottom > q.bottom - 8 || (r.height < q.bottom - q.top && r.bottom > q.bottom)) el.scrollIntoView({ block: r.height < (q.bottom - q.top) * 0.8 ? 'nearest' : 'start' });
  } catch (err2) { }
}
/* Kontrola 4 (přístupnost B2): po dotazu na zamítnutí bezpečnostní položky fokus na „Ano, zamítnout“; po rozhodnutí na zvolené tlačítko. */
function focusAfterRender() {
  var sel = askFocus ? '[data-action="garantDecide"][data-value="' + askFocus + ':rejected:ano"]' : focusAfter; askFocus = null; focusAfter = null;
  if (!sel || !doc || typeof doc.querySelector !== 'function') return;
  try { var el = doc.querySelector('#overlay ' + sel) || doc.querySelector('.tour-panel ' + sel) || doc.querySelector('#app ' + sel); if (el && el.focus) el.focus({ preventScroll: !!(el.closest && el.closest('.tour-panel') && !doc.querySelector('#overlay ' + sel)) }); } catch (err) { } /* SCHEMA 83: v panelu polohu určí panelToCard (pole poznámky pod tlačítky musí zůstat vidět i na telefonu) */
}
function presenterPanel(s) {
  var here = sceneIdx(s), admin = !!(D.auth && D.auth.role && D.auth.role() === 'admin'), nTouched = NF.garantItems(s).filter(function (r) { return gEntries(r.id).length > 0; }).length;
  var out = '<div class="pres-drawer"><h2>Přehled scén</h2>' + (admin ? '<div class="actions mt-0">' + btn('Výsledky garanta', 'openResults', null, 'primary') + '</div>' : '') + /* B2 (kontrola 3): na telefonu je lišta bez tlačítka */
    (glog.length || syncInfo().pending ? syncLine(s, true) : '') + /* kontrola 4 (B1): stav ukládání i na telefonu, kde lišta nemá místo */
    '<p class="small muted">Skok na scénu přehraje příběh od začátku, takže stav je vždy stejný, jako kdybyste ukázku prošli tlačítkem Dál. Vaše rozhodnutí zůstávají.</p>';
  D.acts.forEach(function (a, ai) {
    var list = D.scenes.map(function (sc, si) { return si; }).filter(function (si) { return !D.scenes[si].appendix && D.chapters[D.scenes[si].ch].act === ai; });
    if (!list.length) return;
    out += '<h3>' + e(a.title) + '</h3>' + (ai ? '<p class="small muted">' + e(a.note) + '</p>' : '') + '<div class="buttonlist">' + list.map(function (si) { return sceneRow(s, si, here); }).join('') + '</div>';
    if (D.garantQuestions[ai] && D.garantQuestions[ai].length) out += '<details class="more"><summary>Otázky k tomuto scénáři</summary><p class="small muted">Otázky k zamyšlení při procházení; odpovídat na ně nemusíte. Co chcete autorovi vzkázat, napište do poznámky u položky, které se to týká.</p><ul class="plain small">' + D.garantQuestions[ai].map(function (q) { return '<li>' + e(q) + '</li>'; }).join('') + '</ul></details>';
  });
  var ap = appendixScenes();
  if (ap.length) out += '<h3>Dodatek: varianty</h3><p class="small muted">Po potvrzení souhrnu. Co se stane, když zaučení nevyjde nebo pacient rady nepřijme.</p><div class="buttonlist">' + ap.map(function (si) { return sceneRow(s, si, here); }).join('') + '</div>';
  out += '<h3>Schvalování</h3><div class="buttonlist">' + btn('Vaše rozhodnutí', 'openDecisions') + '</div>';
  out += '<details class="more pres-tools"' + (demoAsk || resetAsk ? ' open' : '') + '><summary>Pro prezentujícího</summary>'; /* M10: potvrzení uvnitř nesmí zůstat ve sbalené části */
  out += '<h4>Obrazovky lékaře (mimo příběh)</h4><div class="buttonlist">' + btn('Schvalovací registr', 'openAside', 'registry') + btn('Verze a stopa', 'openAside', 'trace') + '</div>';
  Object.keys(D.branches).forEach(function (k) { out += branchPicker(s, k); });
  out += '<h4>Přepnout roli (mimo příběh)</h4><div class="buttonlist">' + [['patient', 'Pacient'], ['doctor', 'Lékař'], ['nurse', 'Sestra']].map(function (r) { return btn(r[1] + (s.role === r[0] ? ' · teď' : ''), 'role', r[0]); }).join('') + '</div>' +
    '<h4>Modelový čas</h4><div class="actions">' + btn('+ 1 den', 'shiftTime', '1') + btn('+ 7 dní', 'shiftTime', '7') + btn('Scénu znovu', 'tourRestart') + '</div>' +
    '<label class="field"><span>Poznámky z ukázky</span><textarea data-bind="notes">' + e(s.notes || '') + '</textarea></label>' +
    /* M10 (kontrola 2): „Vrátit na začátek“ s potvrzením; mazání rozhodnutí jen pro správce, počet = položky s rozhodnutím nebo poznámkou; potvrzení hned u tlačítka */
    '<div class="actions">' + btn('Vrátit na začátek', 'resetDemoAsk', 'yes') + (admin && nTouched ? btn('Smazat rozhodnutí garanta (' + nTouched + ')', 'garantResetAsk', 'yes', 'danger') : '') + '</div>' +
    (demoAsk ? '<div class="pres-confirm" role="alert"><p class="small">Příběh začne znovu od úvodu. Vaše rozhodnutí a poznámky zůstanou.</p><div class="actions">' + btn('Ano, od začátku', 'resetDemo', null, 'primary') + btn('Ne', 'resetDemoAsk', 'no') + '</div></div>' : '') +
    (resetAsk && admin && nTouched ? '<div class="pres-confirm" role="alert"><p class="small">Smaže rozhodnutí a poznámky u ' + nTouched + ' ' + plural(nTouched, 'položky', 'položek', 'položek') + ' v tomto prohlížeči; na serveru zůstanou.</p><div class="actions">' + btn('Ano, smazat', 'garantReset', null, 'danger') + btn('Ne', 'garantResetAsk', 'no') + '</div></div>' : '') +
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
/* Kontrola 4 (přístupnost C1): dialog zásuvky se jmenuje podle obsahu. */
NF.slots.drawerLabel = function (name) { name = String(name || ''); return { decisions: 'Vaše rozhodnutí', presenter: 'Přehled scén', results: 'Výsledky garanta' }[name] || (/^(explain-)?item:/.test(name) ? 'Položka registru' : ''); };
NF.slots.drawer = function (s, name) { if (name === 'presenter') return D.nbspHtml(presenterPanel(s)); if (name === 'decisions') return D.nbspHtml(decisionsDrawer(s)); return prevDrawer ? prevDrawer(s, name) : ''; };
/* Registr v ukázce: v detailu položky tatáž karta jako v panelu (bez průvodce, ten je v detailu celý). Ve scéně „Během studie“ je registr ostrá aplikace
   s modelovými rozhodnutími příběhu – tam jádro ukáže svůj stav a svá tlačítka, aby se nepletla s vaším rozhodnutím (M9). */
function modelRegistry(s) { return !!(s && s.page === 'registry' && s.chapter === 'registry' && !away(s)); }
NF.slots.registryModel = modelRegistry;
NF.slots.itemDecide = function (s, r) { if (modelRegistry(s) || !r || r.scope === 'provozni') return ''; return '<div class="garant decide reg-decide"><div class="gitem open" data-gitem="' + e(r.id) + '">' + gbody(s, r, { noGuide: true }) + '</div></div>'; };

function go(index, br) { var s = S(); var n = D.play(index, br || s.branches); n.sceneIndex = D.sceneFor(index, n.branches); land(n); }
NF.demoActions.openPresenter = function () { NF.openDrawer('presenter'); };
NF.demoActions.goChapter = function (v) { go(Number(v), null); NF.closeDrawer(); };
NF.demoActions.goScene = function (v) { var n = Number(v); if (!D.scenes[n]) return; if (n !== sceneIdx(S())) sceneLeave('skok', n); land(D.playScene(n)); NF.closeDrawer(); };
NF.demoActions.storyStep = function (v) { land(D.playScene(Math.max(0, Math.min(lastIndex(), sceneIdx(S()) + Number(v))))); };
NF.demoActions.setBranch = function (v) {
  var s = S(), i = String(v).indexOf(':'), b = {}; Object.keys(s.branches || D.defaults).forEach(function (k) { b[k] = s.branches[k]; });
  b[v.slice(0, i)] = v.slice(i + 1);
  var target = D.indexOf(D.branches[v.slice(0, i)].from), here = s.chapterIndex || 0;
  go(here >= target ? here : target, b); NF.openDrawer('presenter');
};
NF.demoActions.openAside = function (v) { var s = S(); panelMsg = ''; s.role = 'doctor'; s.page = v; NF.closeDrawer(); };
NF.demoActions.shiftTime = function (v) { var n = Number(v); if (!isFinite(n)) return; var s = S(); s.clock = NF.addDays(s.clock, Math.round(n)); s.toast = 'Modelový čas: ' + NF.fmtShort(s.clock); };
NF.demoActions.resetDemo = function () { demoAsk = false; land(D.playScene(0)); say('Ukázka začíná znovu od úvodu.'); NF.closeDrawer(); };

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
  NF.render(); revealStep();
}
if (migratedFrom) { say('Maketa byla aktualizována, příběh začíná od začátku. Vaše rozhodnutí k položkám zůstala uložena.'); NF.render(); }

})(typeof window !== 'undefined' ? window : globalThis);
