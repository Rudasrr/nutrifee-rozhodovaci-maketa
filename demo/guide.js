/* Vrstva „Průvodce maketou“. Pouze pro prezentaci a diskusi.
   Není součástí budoucí produkční aplikace. Odstraněním tohoto souboru
   zmizí značky i vysvětlení a rozložení běžných obrazovek se nemění:
   jádro vkládá atribut data-guide jen tehdy, když je tato vrstva načtená. */
(function (global) {
'use strict';
var NF = global.NutriFee;
var C = global.NutriFeeGuideContent;
var Guide = global.NutriFeeGuide = { enabled: false };

var KEY = 'nutrifee-maketa-pruvodce';
try { Guide.enabled = global.localStorage && global.localStorage.getItem(KEY) === '1'; } catch (e) { }

Guide.set = function (on) {
  Guide.enabled = !!on;
  try { global.localStorage && global.localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { }
  NF.render && NF.render();
};
Guide.toggle = function () { Guide.set(!Guide.enabled); };

function topic(key) {
  if (!C) return null;
  if (C.topics[key]) return C.topics[key];
  return null;
}
Guide.has = function (key) { return !!topic(key); };

/* Značky se vkládají po vykreslení. Jádro o nich nic neví. */
function decorate() {
  var doc = global.document;
  if (!doc || !doc.querySelectorAll) return;
  var old = doc.querySelectorAll('.guide-marker');
  for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]);
  if (!Guide.enabled) return;
  var nodes = doc.querySelectorAll('[data-guide]');
  for (var j = 0; j < nodes.length; j++) {
    var el = nodes[j];
    var key = el.getAttribute('data-guide');
    var t = topic(key);
    if (!t) continue;
    var b = doc.createElement('button');
    b.type = 'button';
    b.className = 'guide-marker';
    b.setAttribute('data-action', 'guideOpen');
    b.setAttribute('data-value', key);
    b.setAttribute('aria-label', 'Průvodce maketou: ' + t.title);
    b.setAttribute('title', 'Průvodce maketou: ' + t.title);
    b.innerHTML = '<span aria-hidden="true">?</span>';
    /* Značka patří k nadpisu prvku; jinak na jeho konec, aby nerozbíjela větu. */
    var head = el.querySelector && el.querySelector('h1,h2,h3,legend');
    if (head && head.parentNode) head.appendChild(b);
    else el.appendChild(b);
  }
}

function panel(key) {
  var t = topic(key);
  if (!t) return '';
  var lvl = C.levels[t.level];
  var rows = [
    ['Co zde uživatel dělá nebo vidí', t.what],
    ['Proč je to navrženo právě takto', t.why],
    ['Jaké omezení či riziko návrh řeší', t.risk],
    ['Co je v maketě simulované', t.sim],
    ['Co má rozhodnout garant', t.decide]
  ].filter(function (r) { return r[1]; });
  return '<p class="eyebrow">Průvodce maketou · jen pro prezentaci</p>' +
    '<h2>' + NF.esc(t.title) + '</h2>' +
    '<p><span class="guide-level ' + lvl.cls + '">' + NF.esc(lvl.label) + '</span></p>' +
    rows.map(function (r) {
      return '<div class="guide-row"><dt>' + NF.esc(r[0]) + '</dt><dd>' + NF.esc(r[1]) + '</dd></div>';
    }).join('') +
    '<p class="small muted">Tento text je součástí prezentační vrstvy, ne aplikace pro pacienta ani lékaře. ' +
    'Návrh není klinicky ověřený fakt. Kde chybí opora, je uvedeno „k ověření“.</p>' +
    '<div class="actions">' + NF.screens.btn('Zavřít', 'closeDrawer', null, 'secondary') +
    NF.screens.btn('Seznam všech vysvětlení', 'guideIndex', null, 'secondary') + '</div>';
}

function index() {
  var keys = Object.keys(C.topics);
  return '<p class="eyebrow">Průvodce maketou</p><h2>Všechna vysvětlení (' + keys.length + ')</h2>' +
    '<p class="small muted">Vysvětlení se otevírají i mimo obrazovku, na které leží.</p>' +
    '<div class="buttonlist">' + keys.map(function (k) {
      var t = C.topics[k];
      return '<button type="button" class="btn secondary" data-action="guideOpen" data-value="' + NF.esc(k) + '">' +
        NF.esc(t.title) + ' <span class="guide-level ' + C.levels[t.level].cls + '">' + NF.esc(C.levels[t.level].label) + '</span></button>';
    }).join('') + '</div>';
}

NF.demoActions = NF.demoActions || {};
NF.demoActions.guideOpen = function (v) { NF.openDrawer('guide:' + v); };
NF.demoActions.guideIndex = function () { NF.openDrawer('guide-index'); };
NF.demoActions.toggleGuide = function () { Guide.toggle(); };

/* Slot pro obsah zásuvky. */
var prevDrawer = NF.slots.drawer;
NF.slots.drawer = function (S, name) {
  if (name === 'guide-index') return index();
  if (name && name.indexOf('guide:') === 0) return panel(name.slice(6));
  return prevDrawer ? prevDrawer(S, name) : '';
};

var prevAfter = NF.slots.afterRender;
NF.slots.afterRender = function (S) {
  if (prevAfter) prevAfter(S);
  decorate();
};

Guide.panelHtml = panel;
Guide.indexHtml = index;

/* Vrstva je načtená — přerenderovat, aby jádro vložilo kotvy data-guide. */
if (NF.render) NF.render();

})(typeof window !== 'undefined' ? window : globalThis);
