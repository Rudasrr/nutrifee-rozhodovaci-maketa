/* Automatický průchod maketou — engine. Součást demonstrační vrstvy.
   Tlačítko „Další“ odehraje za lékaře, sestru nebo pacienta další krok kapitoly:
   zvýrazní prvek, „klikne“ na něj nebo do pole postupně napíše text, a v panelu
   vyprávění popíše, co se děje, čeho si všimnout, proč a co z toho plyne.
   Po posledním kroku přejde na další kapitolu. Jádro aplikace o průchodu nic neví:
   kroky volají tytéž akce, které by spustil člověk. */
(function (global) {
'use strict';
var NF = global.NutriFee, e = NF.esc;
var D = global.NutriFeeDemo;
var T = D.tour;
var doc = global.document;

var KEY = 'nutrifee-maketa-vypraveni';
var hidden = false;
try { hidden = global.localStorage && global.localStorage.getItem(KEY) === '0'; } catch (err) { }

var busy = false, running = null, focusSel = null, watchSel = null, pressSel = null;

/* Animace jen ve skutečném prohlížeči; jinde (testy) proběhnou kroky hned. */
function animated() {
  if (!doc || typeof doc.querySelector !== 'function' || !global.requestAnimationFrame) return false;
  return true;
}
function reduced() {
  try { return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (err) { return false; }
}
function wait(ms, fn) { global.setTimeout(fn, reduced() ? Math.min(ms, 120) : ms); }

function S() { return NF.getState(); }
function branches() { return S().branches || D.defaults; }
function chapter() { return D.chapters[S().chapterIndex || 0]; }
function steps() { return T.stepsFor(chapter().id, branches()); }
function val(v) { return typeof v === 'function' ? v(branches()) : v; }
/* Poslední kapitola průchodu. Nezdařené zaučení je slepá ulička — průchod končí u sestry. */
function lastIndex() {
  if (branches().training === 'failed') return D.indexOf('training');
  return D.chapters.length - 1;
}
T.lastIndex = lastIndex;

/* ---------- provedení jedné operace ---------- */
function perform(op) {
  if (op.fn) { op.fn(S()); NF.save(S()); NF.render(); return; }
  if (op.bind) { NF.bindValue(op.bind, val(op.val)); NF.render(); return; }
  if (op.act) { NF.act(op.act, val(op.val)); }
}

function runSync(step) {
  (step.do || []).forEach(perform);
}

function find(sel) {
  try { return sel ? doc.querySelector(val(sel)) : null; } catch (err) { return null; }
}
function reveal(el) {
  if (!el) return;
  for (var p = el.parentNode; p && p !== doc; p = p.parentNode) if (p.tagName === 'DETAILS') p.open = true;
  /* Na úzkém displeji je dole panel vyprávění, proto cíl posouváme k hornímu okraji. */
  var narrow = global.innerWidth && global.innerWidth <= 1100;
  try { el.scrollIntoView({ block: narrow ? 'start' : 'center', behavior: reduced() ? 'auto' : 'smooth' }); } catch (err) { el.scrollIntoView(); }
}

function runAnimated(step, done) {
  var ops = (step.do || []).slice();
  (function next() {
    if (!ops.length) { done(); return; }
    var op = ops.shift();
    focusSel = op.sel ? val(op.sel) : null;
    pressSel = null;
    decorate();
    var el = find(op.sel);
    reveal(el);
    if (!op.act && !op.bind && !op.fn) { wait(500, next); return; }
    wait(750, function () {
      if (op.bind && op.type && el && 'value' in el) {
        var text = String(val(op.val)), i = 0;
        el.value = '';
        (function typeOne() {
          if (i < text.length) { el.value += text.charAt(i++); wait(110, typeOne); return; }
          perform(op);
          wait(350, next);
        })();
        return;
      }
      pressSel = focusSel; decorate();
      wait(260, function () {
        pressSel = null;
        perform(op);
        wait(op.act === 'mealDecide' || op.act === 'eligibility' || op.act === 'trainingStep' ? 350 : 600, next);
      });
    });
  })();
}

/* ---------- krok vpřed ---------- */
NF.demoActions = NF.demoActions || {};
NF.demoActions.tourNext = function () {
  if (busy) return;
  var st = steps();
  var i = S().tourStep || 0;
  if (i >= st.length) {
    var idx = S().chapterIndex || 0;
    if (idx >= lastIndex()) return;
    var nextState = D.play(idx + 1, S().branches);
    nextState.notes = S().notes || '';
    running = null; focusSel = null; watchSel = null;
    NF.setState(nextState);
    try { global.scrollTo(0, 0); } catch (err) { }
    return;
  }
  var step = st[i];
  running = i;
  if (!animated()) {
    runSync(step);
    S().tourStep = i + 1;
    running = null; watchSel = step.watch || null;
    NF.save(S());
    NF.render();
    return;
  }
  busy = true;
  NF.render();
  runAnimated(step, function () {
    S().tourStep = i + 1;
    NF.save(S());
    busy = false; running = null;
    focusSel = null;
    watchSel = step.watch || (step.do && step.do.length && !step.do[step.do.length - 1].act ? step.do[step.do.length - 1].sel : null);
    NF.render();
    var w = find(watchSel);
    if (w) reveal(w);
  });
};
NF.demoActions.tourToggle = function () {
  hidden = !hidden;
  try { global.localStorage && global.localStorage.setItem(KEY, hidden ? '0' : '1'); } catch (err) { }
};
NF.demoActions.tourRestart = function () {
  if (busy) return;
  var next = D.play(S().chapterIndex || 0, S().branches);
  next.notes = S().notes || '';
  focusSel = null; watchSel = null;
  NF.setState(next);
};

/* ---------- panel vyprávění ---------- */
function rows(x) {
  return [['Co se děje', x.co], ['Čeho si všimni', x.vsimni], ['Proč', x.proc], ['Co z toho plyne', x.dusledek]]
    .filter(function (r) { return r[1]; })
    .map(function (r) { return '<div><dt>' + e(r[0]) + '</dt><dd>' + e(r[1]) + '</dd></div>'; }).join('');
}

function nextLabel(st, i) {
  if (busy) return 'Probíhá…';
  if (i < st.length) return i === 0 ? 'Začít ▶' : 'Další krok ▶';
  var idx = S().chapterIndex || 0;
  if (idx >= lastIndex()) return 'Konec ukázky';
  return 'Další kapitola ▶';
}

function panel(state) {
  if (state.garantStep != null) return '';
  var ch = chapter(), st = steps(), i = state.tourStep || 0;
  var intro = (T.chapters[ch.id] || {}).intro || { t: ch.title };
  var shown = running != null ? st[running] : (i > 0 ? st[i - 1] : intro);
  var idx = state.chapterIndex || 0;
  var last = idx >= lastIndex() && i >= st.length;
  var upcoming = i >= st.length && !last ? D.chapters[idx + 1] : null;
  if (hidden) {
    return '<div class="tour-panel tour-min"><button type="button" class="btn demo" data-action="tourToggle">Zobrazit vyprávění</button>' +
      '<button type="button" class="btn primary" data-action="tourNext"' + (busy || last ? ' disabled' : '') + '>' + e(nextLabel(st, i)) + '</button></div>';
  }
  return '<aside class="tour-panel" aria-live="polite" aria-label="Vyprávění k ukázce">' +
    '<p class="tour-kicker">Kapitola ' + (idx + 1) + ' z ' + D.chapters.length + ' · ' +
    (running != null ? 'krok ' + (running + 1) + ' z ' + st.length : i === 0 ? 'úvod' : 'krok ' + i + ' z ' + st.length) + '</p>' +
    '<h2>' + e(shown.t || ch.title) + '</h2>' +
    '<dl class="tour-rows">' + rows(shown) + '</dl>' +
    (upcoming ? '<p class="tour-next small">Dál: ' + e(upcoming.title) + '</p>' : '') +
    (last ? '<p class="tour-next small">' + (branches().training === 'failed' ? 'V této odbočce příběh končí: bez zaučení úkol nezačne platit. ' : 'Konec ukázky. ') + 'Další odbočky a průchod na úrovni garanta najdete v panelu prezentujícího.</p>' : '') +
    '<div class="tour-actions">' +
    '<button type="button" class="btn primary" data-action="tourNext"' + (busy || last ? ' disabled' : '') + '>' + e(nextLabel(st, i)) + '</button>' +
    (i > 0 && !busy ? '<button type="button" class="btn secondary" data-action="tourRestart">Kapitolu znovu</button>' : '') +
    '<button type="button" class="btn secondary" data-action="tourToggle">Skrýt</button>' +
    '</div>' +
    '<div class="tour-progress" aria-hidden="true"><span style="width:' + Math.round(((idx + (st.length ? Math.min(i, st.length) / st.length : 1)) / D.chapters.length) * 100) + '%"></span></div>' +
    '</aside>';
}

var prevBanner = NF.slots.banner;
NF.registerSlot('banner', function (state) {
  var b = prevBanner ? prevBanner(state) : '';
  /* „Další ▶“ v demo liště odehrává kroky; skok o celou kapitolu zůstává zvlášť. */
  b = b.replace('data-action="storyStep" data-value="1">Další ▶', 'data-action="tourNext">Další ▶</button>' +
    '<button type="button" class="btn demo" data-action="storyStep" data-value="1">Přeskočit kapitolu ⏭');
  return b + panel(state);
});

/* ---------- zvýraznění po vykreslení ---------- */
function decorate() {
  if (!animated()) return;
  var old = doc.querySelectorAll('.tour-focus,.tour-watch,.tour-press');
  for (var k = 0; k < old.length; k++) old[k].classList.remove('tour-focus', 'tour-watch', 'tour-press');
  var f = find(focusSel); if (f) f.classList.add('tour-focus');
  var w = !busy ? find(watchSel) : null; if (w) w.classList.add('tour-watch');
  var p = find(pressSel); if (p) p.classList.add('tour-press');
}
var prevAfter = NF.slots.afterRender;
NF.slots.afterRender = function (state) {
  if (prevAfter) prevAfter(state);
  decorate();
};

/* Šipka vpravo = Další, mimo pole pro psaní. */
if (doc && doc.addEventListener) {
  doc.addEventListener('keydown', function (ev) {
    var t = ev.target && ev.target.tagName;
    if (t === 'INPUT' || t === 'TEXTAREA' || NF.currentDrawer()) return;
    if (ev.key === 'ArrowRight') { ev.preventDefault(); NF.act('tourNext'); }
  });
}

T.isBusy = function () { return busy; };
if (NF.render) NF.render();

})(typeof window !== 'undefined' ? window : globalThis);
