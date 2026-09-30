/* Prezentační vrstva: lišta, role, rámeček telefonu, panel vyprávění a průchod tlačítkem Další,
   panel prezentujícího. Jádro o ní nic neví — kroky volají tytéž akce, které by spustil člověk. */
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
function lastIndex() { return branches().training === 'failed' ? D.indexOf('handover') : D.chapters.length - 1; }

/* ---------- lišta ---------- */
NF.registerSlot('banner', function (s) {
  var ch = chapter(s), a = D.acts[ch.act], i = s.chapterIndex || 0;
  var roles = [['patient', 'Pacient'], ['doctor', 'Lékař'], ['nurse', 'Sestra']];
  return '<div class="pres-bar"><span class="flag">DEMO · syntetická data · není určeno pro léčbu</span>' +
    '<span class="where">' + e(a.title) + ' · kapitola ' + (i + 1) + ' z ' + D.chapters.length + ': <b>' + e(ch.title) + '</b> · ' + e(NF.fmtShort(s.clock)) + ' ' + e(NF.fmtTime(s.clock)) + '</span>' +
    '<span class="roles">' + roles.map(function (r) { return '<button type="button" class="' + (s.role === r[0] ? 'on' : '') + '" data-action="role" data-value="' + r[0] + '">' + r[1] + '</button>'; }).join('') + '</span>' +
    (i > 0 ? btn('◀', 'storyStep', '-1', '', ' aria-label="Předchozí kapitola"') : '') +
    btn('Další ▶', 'tourNext', null, 'primary') +
    (i < D.chapters.length - 1 ? btn('Přeskočit kapitolu ⏭', 'storyStep', '1') : '') +
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
    var idx = s.chapterIndex || 0;
    if (idx >= lastIndex()) return;
    var next = D.play(idx + 1, s.branches); next.notes = s.notes || '';
    running = null; focusSel = null; watchSel = null;
    NF.setState(next); try { global.scrollTo(0, 0); } catch (err) { }
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
NF.demoActions.tourRestart = function () { if (busy) return; var n = D.play(S().chapterIndex || 0, S().branches); focusSel = null; watchSel = null; NF.setState(n); };
var hidden = false;
try { hidden = global.localStorage && global.localStorage.getItem('nutrifee-vypraveni') === '0'; } catch (err) { }
NF.demoActions.tourToggle = function () { hidden = !hidden; try { global.localStorage && global.localStorage.setItem('nutrifee-vypraveni', hidden ? '0' : '1'); } catch (err) { } };

function rows(x) {
  return [['Co se děje', x.co], ['Čeho si všimni', x.vsimni], ['Proč', x.proc], ['Co z toho plyne', x.dusledek]].filter(function (r) { return r[1]; })
    .map(function (r) { return '<div><dt>' + e(r[0]) + '</dt><dd>' + r[1] + '</dd></div>'; }).join('');
}
function panel(s) {
  var ch = chapter(s), st = steps(), i = s.tourStep || 0;
  var intro = (T.chapters[ch.id] || {}).intro || { t: ch.title, co: '' };
  var shown = running != null ? st[running] : (i > 0 ? st[i - 1] : intro);
  var idx = s.chapterIndex || 0, last = idx >= lastIndex() && i >= st.length;
  var upcoming = i >= st.length && !last ? D.chapters[idx + 1] : null;
  var label = busy ? 'Probíhá…' : i < st.length ? (i === 0 ? 'Začít ▶' : 'Další krok ▶') : last ? 'Konec ukázky' : 'Další kapitola ▶';
  if (hidden) return '<div class="tour-panel tour-min">' + btn('Zobrazit vyprávění', 'tourToggle') + btn(e(label), 'tourNext', null, 'primary', busy || last ? ' disabled' : '') + '</div>';
  return '<aside class="tour-panel" aria-live="polite" aria-label="Vyprávění k ukázce"><p class="tour-kicker">Kapitola ' + (idx + 1) + ' z ' + D.chapters.length + ' · ' + (running != null ? 'krok ' + (running + 1) + ' z ' + st.length : i === 0 ? 'úvod' : 'krok ' + i + ' z ' + st.length) + '</p>' +
    '<h2>' + e(shown.t || ch.title) + '</h2><dl class="tour-rows">' + rows(shown) + '</dl>' +
    (upcoming ? '<p class="tour-next">Dál: ' + e(upcoming.title) + '</p>' : '') +
    (last ? '<p class="tour-next">' + (branches().training === 'failed' ? 'V této odbočce příběh končí: bez zaučení návyky nezačnou platit. ' : 'Konec ukázky. ') + 'Odbočky najdete v panelu prezentujícího.</p>' : '') +
    '<div class="tour-actions">' + btn(e(label), 'tourNext', null, 'primary', busy || last ? ' disabled' : '') + (i > 0 && !busy ? btn('Kapitolu znovu', 'tourRestart') : '') + btn('Skrýt', 'tourToggle') + '</div>' +
    '<div class="tour-progress" aria-hidden="true"><span style="width:' + Math.round(((idx + (st.length ? Math.min(i, st.length) / st.length : 1)) / D.chapters.length) * 100) + '%"></span></div></aside>';
}
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
  var here = s.chapterIndex || 0;
  var out = '<p class="eyebrow">Jen pro prezentujícího</p><h2>Panel prezentujícího</h2><p class="small muted">Menu kapitol a odboček. Skok na kapitolu přehraje příběh od začátku, takže stav je vždy stejný, jako kdybyste ukázku prošli ručně.</p>';
  D.acts.forEach(function (a, ai) {
    out += '<hr><h3>' + e(a.title) + '</h3><p class="small muted">' + e(a.note) + '</p><div class="buttonlist">' +
      D.chapters.map(function (c, ci) { return { c: c, ci: ci }; }).filter(function (x) { return x.c.act === ai; }).map(function (x) { return '<button type="button" class="btn ' + (x.ci === here ? 'selected' : '') + '" data-action="goChapter" data-value="' + x.ci + '">' + (x.ci + 1) + '. ' + e(x.c.title) + '</button>'; }).join('') + '</div>';
    Object.keys(D.branches).forEach(function (k) { var from = D.indexOf(D.branches[k].from); if (from >= 0 && D.chapters[from].act === ai) out += branchPicker(s, k); });
    if (D.garantQuestions[ai]) out += '<details class="more"><summary>Otázky pro garanta k tomuto dějství</summary><ul class="plain small">' + D.garantQuestions[ai].map(function (q) { return '<li>' + e(q) + '</li>'; }).join('') + '</ul></details>';
  });
  out += '<hr><h3>Rychlé odkazy</h3><div class="buttonlist">' + btn('Schvalovací registr', 'openAside', 'registry') + btn('Verze a stopa', 'openAside', 'trace') + '</div>' +
    '<h3>Modelový čas</h3><div class="actions">' + btn('+ 1 den', 'shiftTime', '1') + btn('+ 7 dní', 'shiftTime', '7') + '</div>' +
    '<hr><label class="field"><span>Poznámky z ukázky</span><textarea data-bind="notes">' + e(s.notes || '') + '</textarea></label>' +
    '<div class="actions">' + btn('Reset na začátek', 'resetDemo', null, 'danger') + btn('Zavřít', 'closeDrawer') + '</div>';
  return out;
}
var prevDrawer = NF.slots.drawer;
NF.slots.drawer = function (s, name) { if (name === 'presenter') return presenterPanel(s); return prevDrawer ? prevDrawer(s, name) : ''; };

function go(index, br) { var s = S(); var n = D.play(index, br || s.branches); n.notes = s.notes || ''; focusSel = null; watchSel = null; NF.setState(n); }
NF.demoActions.openPresenter = function () { NF.openDrawer('presenter'); };
NF.demoActions.goChapter = function (v) { go(Number(v)); NF.closeDrawer(); };
NF.demoActions.storyStep = function (v) { var s = S(); go(Math.max(0, Math.min(D.chapters.length - 1, (s.chapterIndex || 0) + Number(v)))); };
NF.demoActions.setBranch = function (v) {
  var s = S(), i = String(v).indexOf(':'), b = {}; Object.keys(s.branches || D.defaults).forEach(function (k) { b[k] = s.branches[k]; });
  b[v.slice(0, i)] = v.slice(i + 1);
  var target = D.indexOf(D.branches[v.slice(0, i)].from), here = s.chapterIndex || 0;
  go(here >= target ? here : target, b); NF.openDrawer('presenter');
};
NF.demoActions.openAside = function (v) { var s = S(); s.role = 'doctor'; s.page = v; NF.closeDrawer(); };
NF.demoActions.shiftTime = function (v) { var s = S(); s.clock = NF.addDays(s.clock, Number(v)); s.toast = 'Modelový čas: ' + NF.fmtShort(s.clock); };
NF.demoActions.resetDemo = function () { var n = D.play(0, null); n.toast = 'Ukázka začíná znovu v ordinaci.'; focusSel = null; watchSel = null; NF.setState(n); NF.closeDrawer(); };

if (doc && doc.addEventListener) doc.addEventListener('keydown', function (ev) {
  var t = ev.target && ev.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || NF.currentDrawer()) return;
  if (ev.key === 'ArrowRight') { ev.preventDefault(); NF.act('tourNext'); }
});
T.isBusy = function () { return busy; };
T.lastIndex = lastIndex;

if (!S().chapter) NF.setState(D.play(0, null)); else NF.render();

})(typeof window !== 'undefined' ? window : globalThis);
