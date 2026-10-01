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
function applyGarant(n) { glog.forEach(function (d) { NF.applyDecision(n, d); }); return n; }
function land(n) { var s = S(); applyGarant(n); n.notes = s.notes || ''; focusSel = null; watchSel = null; running = null; NF.setState(n); try { global.scrollTo(0, 0); } catch (err) { } }
NF.demoActions.garantDecide = function (v) {
  var i = String(v).indexOf(':'), id = v.slice(0, i), status = v.slice(i + 1), s = S();
  var comment = (s.form && s.form['gc_' + id]) || '';
  var r = NF.decideItem(s, id, status, comment, null, { garant: true }); if (!r.ok) { s.error = r.error; return; }
  glog.push(r.decision); saveGlog(); if (s.form) s.form['gc_' + id] = '';
  s.toast = status === 'rejected' ? 'Zamítnuto. Aplikace položku přestala používat; zapsáno do historie.' : status === 'edited' ? 'Úprava uložena a hned platí.' : 'Potvrzeno garantem a zapsáno do historie.';
};
NF.demoActions.garantComment = function (id) {
  var s = S(), r = NF.item(s, id), comment = (s.form && s.form['gc_' + id]) || '';
  if (!r || !comment.trim()) { s.error = 'Napište komentář.'; return; }
  var res = NF.decideItem(s, id, r.status, comment, null, { garant: true }); if (!res.ok) { s.error = res.error; return; }
  glog.push(res.decision); saveGlog(); s.form['gc_' + id] = ''; s.toast = 'Komentář je v historii položky.';
};
NF.demoActions.garantReset = function () { glog = []; saveGlog(); land(D.playScene(sceneIdx(S()))); S().toast = 'Rozhodnutí garanta smazána; vše je zase schválené předem.'; };
D.garantLog = function () { return glog.slice(); };

/* ---------- lišta ---------- */
NF.registerSlot('banner', function (s) {
  var ch = chapter(s), a = D.acts[ch.act], i = sceneIdx(s), sum = NF.registrySummary(s);
  var roles = [['patient', 'Pacient'], ['doctor', 'Lékař'], ['nurse', 'Sestra']];
  return '<div class="pres-bar"><span class="flag">DEMO · syntetická data · není určeno pro léčbu</span>' +
    '<span class="where">' + e(a.title) + ' · scéna ' + (i + 1) + ' z ' + D.scenes.length + ': <b>' + e(sceneTitle(s)) + '</b> · ' + e(NF.fmtShort(s.clock)) + ' ' + e(NF.fmtTime(s.clock)) + '</span>' +
    '<span class="roles">' + roles.map(function (r) { return '<button type="button" class="' + (s.role === r[0] ? 'on' : '') + '" data-action="role" data-value="' + r[0] + '">' + r[1] + '</button>'; }).join('') + '</span>' +
    btn('◀ Zpět', 'tourBack', null, '', (i === 0 && !(s.tourStep || 0) ? ' disabled' : '') + ' aria-label="Krok zpět"') +
    btn('Další ▶', 'tourNext', null, 'primary') +
    (i < lastIndex() ? btn('Přeskočit scénu ⏭', 'storyStep', '1') : '') +
    btn('Ke schválení · zbývá ' + sum.remaining, 'openAside', 'registry', sum.remaining ? '' : 'ok') +
    btn('Panel prezentujícího', 'openPresenter') + btn('Reset', 'resetDemo') + '</div>' + panel(s);
});

/* ---------- průchod tlačítkem Další ---------- */
var busy = false, running = null, focusSel = null, watchSel = null, pressSel = null;
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
  var s = S();
  if (op.fn) { op.fn(s); NF.save(s); NF.render(); return; }
  if (op.bind) { NF.bindValue(op.bind, val(op.val)); NF.render(); return; }
  if (op.act) NF.act(op.act, val(op.val));
}
function runAnimated(step, done) {
  var ops = (step.do || []).slice();
  (function next() {
    if (!ops.length) { done(); return; }
    var op = ops.shift();
    focusSel = op.sel ? val(op.sel) : null; pressSel = null; decorate();
    var el = find(op.sel); reveal(el);
    if (!op.act && !op.bind && !op.fn) { wait(600, next); return; }
    wait(650, function () {
      if (op.bind && op.type && el && 'value' in el) {
        var text = String(val(op.val)), i = 0; el.value = '';
        (function typeOne() {
          if (i < text.length) { el.value += text.charAt(i++); if (op.live) NF.bindValue(op.bind, el.value); wait(90, typeOne); return; }
          perform(op); wait(350, next);
        })();
        return;
      }
      pressSel = focusSel; decorate();
      wait(240, function () { pressSel = null; perform(op); wait(op.quick ? 320 : 600, next); });
    });
  })();
}
NF.demoActions.tourNext = function () {
  if (busy) return;
  var st = steps(), s = S(), i = s.tourStep || 0;
  if (i >= st.length) {
    var idx = sceneIdx(s);
    if (idx >= lastIndex()) return;
    land(D.playScene(idx + 1));
    return;
  }
  var step = st[i]; running = i;
  if (!animated()) {
    (step.do || []).forEach(perform);
    S().tourStep = i + 1; running = null; watchSel = step.watch || null; NF.save(S()); NF.render(); return;
  }
  busy = true; NF.render();
  runAnimated(step, function () {
    S().tourStep = i + 1; NF.save(S()); busy = false; running = null; focusSel = null;
    watchSel = step.watch || null; NF.render();
    var w = find(watchSel); if (w) reveal(w);
  });
};
/* Krok zpět: scéna se přehraje znovu a provedou se všechny kroky kromě posledního. Na začátku scény = předchozí scéna. */
NF.demoActions.tourBack = function () {
  if (busy) return;
  var s = S(), i = s.tourStep || 0, idx = sceneIdx(s);
  if (i === 0) { if (idx > 0) land(D.playScene(idx - 1)); return; }
  land(D.playScene(idx));
  var st = steps();
  for (var k = 0; k < i - 1; k++) (st[k].do || []).forEach(perform);
  S().tourStep = i - 1; watchSel = i - 1 > 0 ? (st[i - 2].watch || null) : null; NF.save(S()); NF.render();
};
NF.demoActions.tourRestart = function () { if (busy) return; land(D.playScene(sceneIdx(S()))); };
var hidden = false;
try { hidden = global.localStorage && global.localStorage.getItem('nutrifee-vypraveni') === '0'; } catch (err) { }
NF.demoActions.tourToggle = function () { hidden = !hidden; try { global.localStorage && global.localStorage.setItem('nutrifee-vypraveni', hidden ? '0' : '1'); } catch (err) { } };

function rows(x) {
  return [['Co se děje', x.co], ['Čeho si všimni', x.vsimni], ['Proč', x.proc], ['Co z toho plyne', x.dusledek]].filter(function (r) { return r[1]; })
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
function garantBlock(s) {
  var items = itemsOnScreen(s); if (!items.length) return '';
  var open = s.gOpen || null;
  return '<div class="garant"><p class="tour-kicker">K potvrzení na této obrazovce · ' + items.length + '</p>' + items.map(function (r) {
    var touched = NF.itemTouched(s, r.id), st = r.status === 'rejected' ? ['zamítnuto', 'bad'] : r.status === 'edited' ? ['upraveno', 'warn'] : touched ? ['potvrzeno', 'ok'] : ['schváleno předem', ''];
    var isOpen = open === r.id;
    return '<div class="gitem"><button type="button" class="gh" data-action="garantOpen" data-value="' + e(r.id) + '"><span class="t">' + e(r.title) + '</span>' + NF.screens.tag(st[0], st[1]) + '<span class="chev">' + (isOpen ? '⌃' : '⌄') + '</span></button>' +
      (isOpen ? '<div class="gb"><p class="small">' + e(r.summary) + '</p>' + (r.detail ? '<p class="small muted">' + e(r.detail) + '</p>' : '') + (r.text ? '<p class="small"><b>Text pro pacienta:</b> ' + e(r.text) + '</p>' : '') +
        (r.params && Object.keys(r.params).length ? '<p class="small muted">Parametry: ' + e(Object.keys(r.params).map(function (k) { return k + ' = ' + String(r.params[k]).replace('.', ','); }).join(' · ')) + '</p>' : '') +
        '<label class="field"><span>Komentář (nepovinný)</span><input data-bind="form.gc_' + e(r.id) + '" value="' + e((s.form && s.form['gc_' + r.id]) || '') + '" placeholder="co změnit, proč, nebo jen poznámka"></label>' +
        '<div class="actions" style="margin-top:8px">' + btn('Potvrdit', 'garantDecide', r.id + ':approved', 'sm primary') + btn('Zamítnout', 'garantDecide', r.id + ':rejected', 'sm danger') + btn('Jen komentář', 'garantComment', r.id, 'sm') + btn('Podrobnosti a parametry', 'openAsideItem', r.id, 'sm quiet') + '</div></div>' : '') + '</div>';
  }).join('') + '</div>';
}
function panel(s) {
  var ch = chapter(s), st = steps(), i = s.tourStep || 0;
  var intro = (T.chapters[ch.id] || {}).intro || { t: ch.title, co: '' };
  var shown = running != null ? st[running] : (i > 0 ? st[i - 1] : intro);
  var idx = sceneIdx(s), last = idx >= lastIndex() && i >= st.length, sc = D.scenes[idx];
  var upcoming = i >= st.length && !last ? D.scenes[idx + 1] : null;
  var label = busy ? 'Probíhá…' : i < st.length ? (i === 0 ? 'Začít ▶' : 'Další krok ▶') : last ? 'Konec ukázky' : 'Další scéna ▶';
  if (hidden) return '<div class="tour-panel tour-min">' + btn('Zobrazit vyprávění', 'tourToggle') + btn('◀', 'tourBack', null, '', busy ? ' disabled' : '') + btn(e(label), 'tourNext', null, 'primary', busy || last ? ' disabled' : '') + '</div>';
  return '<aside class="tour-panel" aria-live="polite" aria-label="Vyprávění k ukázce"><p class="tour-kicker">' + (sc && sc.detour ? 'Odbočka · ' : '') + 'Scéna ' + (idx + 1) + ' z ' + D.scenes.length + ' · ' + (running != null ? 'krok ' + (running + 1) + ' z ' + st.length : i === 0 ? 'úvod' : 'krok ' + i + ' z ' + st.length) + '</p>' +
    '<h2>' + e(shown.t || sceneTitle(s)) + '</h2><dl class="tour-rows">' + rows(shown) + '</dl>' +
    (upcoming ? '<p class="tour-next">Dál: ' + e(upcoming.title || D.chapters[upcoming.ch].title) + '</p>' : '') +
    (last ? '<p class="tour-next">Konec ukázky. Co zbývá potvrdit, najdete pod „Ke schválení“ v liště.</p>' : '') +
    '<div class="tour-actions">' + btn('◀ Zpět', 'tourBack', null, '', busy || (idx === 0 && i === 0) ? ' disabled' : '') + btn(e(label), 'tourNext', null, 'primary', busy || last ? ' disabled' : '') + (i > 0 && !busy ? btn('Scénu znovu', 'tourRestart') : '') + btn('Skrýt', 'tourToggle') + '</div>' +
    '<div class="tour-progress" aria-hidden="true"><span style="width:' + Math.round(((idx + (st.length ? Math.min(i, st.length) / st.length : 1)) / D.scenes.length) * 100) + '%"></span></div>' +
    garantBlock(s) + '</aside>';
}
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
NF.slots.afterRender = function (s) { if (prevAfter) prevAfter(s); decorate(); };

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
    '<div class="actions">' + btn('Reset na začátek', 'resetDemo', null, 'danger') + btn('Smazat rozhodnutí garanta (' + glog.length + ')', 'garantReset', null, 'danger') + btn('Zavřít', 'closeDrawer') + '</div>';
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
NF.demoActions.shiftTime = function (v) { var s = S(); s.clock = NF.addDays(s.clock, Number(v)); s.toast = 'Modelový čas: ' + NF.fmtShort(s.clock); };
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
