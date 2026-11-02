/* Katalog designového systému NutriFee: tokeny ze souboru tokens.css za běhu, inspektor komponent, kopírování CSS a zadání.
   Bez závislostí, bez sítě. Čte jen stylesheety, které stránka načetla (../app/tokens.css, ../app/design.css, ../demo/demo.css). */
(function () {
'use strict';
var $ = function (s, r) { return (r || document).querySelector(s); };
var root = document.documentElement, cs = getComputedStyle(root);

/* ---------- tokeny: název → hodnota (jen --nf-*) ---------- */
var tokens = [], groups = [];
function readTokens() {
  var sheet = null;
  for (var i = 0; i < document.styleSheets.length; i++) { var h = document.styleSheets[i].href || ''; if (/tokens\.css/.test(h)) sheet = document.styleSheets[i]; }
  if (!sheet) return;
  var rules; try { rules = sheet.cssRules; } catch (e) { return; }
  for (var r = 0; r < rules.length; r++) {
    var rule = rules[r]; if (!rule.selectorText || rule.selectorText !== ':root') continue;
    var text = rule.cssText;
    /* skupiny podle komentářů v původním souboru nejsou v CSSOM; odvodíme je z předpon názvů */
    for (var k = 0; k < rule.style.length; k++) {
      var name = rule.style[k]; if (name.indexOf('--nf-') !== 0) continue;
      var raw = rule.style.getPropertyValue(name).trim(), val = cs.getPropertyValue(name).trim();
      tokens.push({ name: name, raw: raw, value: val });
    }
  }
}
function hexOf(rgb) {
  var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(rgb); if (!m) return null;
  if (m[4] !== undefined && Number(m[4]) === 0) return null;
  return '#' + [m[1], m[2], m[3]].map(function (v) { return ('0' + Number(v).toString(16)).slice(-2).toUpperCase(); }).join('');
}
function norm(v) { var h = hexOf(v); if (h) return h; if (/^#[0-9a-f]{3}$/i.test(v)) return ('#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3]).toUpperCase(); return String(v).trim().toUpperCase(); }
function tokenFor(value) {
  /* jen tokeny, které jsou celé jednou hodnotou (ne stín s barvou uvnitř), a barvy včetně průhlednosti */
  var alpha = function (v) { var m = /rgba\([^)]*,\s*([\d.]+)\)/.exec(v); return m ? Number(m[1]) : 1; };
  var n = norm(value), a = alpha(value), out = [];
  tokens.forEach(function (t) { if (/\s/.test(t.value.replace(/,\s*/g, ',')) || alpha(t.value) !== a) return; if (norm(t.value) === n) out.push(t.name); });
  return out;
}
function lum(hex) {
  var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.slice(i, i + 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a, b) { var la = lum(a), lb = lum(b); return ((Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)).toFixed(1); }

/* ---------- vykreslení tokenů ---------- */
var GROUPS = [['Plocha', /^--nf-(bg|surface|line)/], ['Text', /^--nf-(ink|text|muted|on-primary|focus)/], ['Akce', /^--nf-primary/], ['Stavy', /^--nf-(ok|over|low|info|basal)/], ['Vysoký kontrast (prefers-contrast:more)', /^--nf-hc-/], ['Prezentační vrstva', /^--nf-demo/]];
var shownColors = {};
function renderColors() {
  var box = $('#tok-colors'); if (!box) return; var html = '';
  GROUPS.forEach(function (g) {
    var list = tokens.filter(function (t) { return g[1].test(t.name) && /^#/.test(norm(t.value)); });
    if (!list.length) return;
    html += '<p class="ds-group">' + g[0] + '</p>';
    list.forEach(function (t) {
      shownColors[t.name] = 1;
      var hex = norm(t.value), onWhite = contrast(hex, '#FFFFFF'), onBg = contrast(hex, norm(cs.getPropertyValue('--nf-bg')));
      html += '<button type="button" class="ds-swatch" data-copy="var(' + t.name + ')" title="Kopírovat var(' + t.name + ')"><i style="background:' + hex + '"></i><span><b>' + t.name.replace('--nf-', '') + '</b><small>' + hex + '</small><br><span class="ratio">na bílé ' + onWhite + ' : 1 · na podkladu ' + onBg + ' : 1</span></span></button>';
    });
  });
  box.innerHTML = html;
}
function renderSpace() {
  var box = $('#tok-space'); if (!box) return;
  box.innerHTML = tokens.filter(function (t) { return /^--nf-s\d+$/.test(t.name); }).map(function (t) { return '<div><span>' + t.name.replace('--nf-', '') + ' · ' + t.value + '</span><i style="width:' + (parseInt(t.value, 10) * 4) + 'px"></i></div>'; }).join('') +
    tokens.filter(function (t) { return /^--nf-tap/.test(t.name); }).map(function (t) { return '<div><span>' + t.name.replace('--nf-', '') + ' · ' + t.value + '</span><i style="width:' + parseInt(t.value, 10) + 'px;height:' + parseInt(t.value, 10) / 2 + 'px"></i></div>'; }).join('');
}

/* všechny ostatní tokeny (B8, 1. 11. 2026): čáry, ikony, rozměry komponent, pohyb, písmo – co design.css skládá */
var SIZE_GROUPS = [['Písmo', /^--nf-(font|fs-|lh|w-|track-(tight|caps|snug|num|tag|label)$|underline|frac|quote)/], ['Odstupy a cíle dotyku', /^--nf-(s\d+|tap)/], ['Čáry a fokus', /^--nf-(bw|halo|focus-w|focus-offset)/], ['Zaoblení', /^--nf-r-/],
  ['Ikony', /^--nf-(icon|ico-|check-)/], ['Stíny', /^--nf-(sh-|scrim|shadow)/], ['Pohyb', /^--nf-(t-|t$|ease|anim-)/], ['Prezentační vrstva', /^--nf-demo/], ['Rozměry komponent', /./]];
function renderSizes() {
  var box = $('#tok-sizes'); if (!box) return; var used = {}, html = '';
  SIZE_GROUPS.forEach(function (g) {
    var list = tokens.filter(function (t) { return !shownColors[t.name] && !used[t.name] && g[1].test(t.name); });
    if (!list.length) return;
    html += '<p class="ds-group">' + g[0] + ' <small>(' + list.length + ')</small></p>';
    list.forEach(function (t) {
      used[t.name] = 1;
      var raw = /^url\(/.test(t.raw) ? 'obrázek (data URI)' : t.raw;
      html += '<button type="button" class="ds-tok" data-copy="var(' + t.name + ')" title="Kopírovat var(' + t.name + ')"><b>' + t.name.replace('--nf-', '') + '</b><span>' + raw.replace(/</g, '&lt;') + '</span></button>';
    });
  });
  box.innerHTML = html;
}

/* ---------- inspektor ---------- */
var PROPS = [['background-color', 'pozadí', 'color'], ['color', 'text', 'color'], ['border-color', 'okraj', 'color'], ['border-width', 'tloušťka okraje'], ['border-radius', 'zaoblení'], ['font-family', 'písmo'], ['font-size', 'velikost'], ['font-weight', 'řez'], ['line-height', 'řádkování'], ['letter-spacing', 'prostrkání'],
  ['padding', 'odsazení'], ['margin', 'vnější okraj'], ['gap', 'mezera'], ['width', 'šířka'], ['height', 'výška'], ['min-width', 'šířka min.'], ['min-height', 'výška min.'], ['max-width', 'šířka max.'], ['max-height', 'výška max.'],
  ['outline-width', 'fokus'], ['outline-offset', 'odsazení fokusu'], ['box-shadow', 'stín'], ['animation-duration', 'animace'], ['transition-duration', 'přechod']];
/* které deklarace (i zkratky) nastavují danou vlastnost: inspektor z nich čte názvy tokenů přímo z pravidel */
var FAMILY = { 'background-color': /^background(-color)?$/, 'color': /^color$/, 'border-color': /^border(-(top|right|bottom|left|block|inline))?(-color)?$/, 'border-width': /^border(-(top|right|bottom|left|block|inline))?(-width)?$/,
  'border-radius': /^border(-[a-z-]+)?-radius$/, 'font-family': /^font(-family)?$/, 'font-size': /^font(-size)?$/, 'font-weight': /^font(-weight)?$/, 'line-height': /^(font|line-height)$/, 'letter-spacing': /^letter-spacing$/,
  'padding': /^padding(-[a-z-]+)?$/, 'margin': /^margin(-[a-z-]+)?$/, 'gap': /^((row|column)-)?gap$/, 'width': /^(width|inline-size)$/, 'height': /^(height|block-size)$/, 'min-width': /^min-width$/, 'min-height': /^min-height$/,
  'max-width': /^max-width$/, 'max-height': /^max-height$/, 'outline-width': /^outline(-width)?$/, 'outline-offset': /^outline-offset$/, 'box-shadow': /^box-shadow$/, 'animation-duration': /^animation(-duration|-delay)?$/, 'transition-duration': /^transition(-duration|-delay)?$/ };
var selected = null;
function shortFont(v) { return v.split(',')[0].replace(/"/g, '').trim(); }
function tokenLabel(prop, value) {
  var names = [];
  if (prop[2] === 'color') names = tokenFor(value);
  else if (prop[0] === 'border-radius') names = tokenFor(value.split(' ')[0]).filter(function (n) { return /--nf-r-/.test(n); });
  else if (prop[0] === 'font-family') names = tokens.filter(function (t) { return /--nf-font/.test(t.name) && shortFont(t.value) === shortFont(value); }).map(function (t) { return t.name; });
  else if (prop[0] === 'font-size' || prop[0] === 'min-height') names = tokenFor(value).filter(function (n) { return /--nf-(fs|tap|icon)/.test(n); });
  else if (prop[0] === 'box-shadow') names = tokens.filter(function (t) { return /--nf-sh/.test(t.name) && t.value.replace(/\s/g, '') === value.replace(/\s/g, ''); }).map(function (t) { return t.name; });
  return names;
}
function matchedRules(el) {
  /* jen pravidla, jejichž selektor na prvek skutečně dopadá — i ve stavech hover / fokus / stisk / neaktivní (pseudotřídy se pro shodu odstraní) */
  var out = [], seen = {};
  var strip = function (sel) { return sel.replace(/:(hover|active|focus-visible|focus|disabled)\b/g, '').replace(/::?(before|after)\b/g, ''); };
  var test = function (sel) { return sel.split(',').some(function (part) { var x = strip(part).trim(); if (!x) return false; try { return el.matches(x); } catch (e) { return false; } }); };
  var walk = function (rules, wrap) {
    for (var r = 0; r < rules.length; r++) {
      var rule = rules[r];
      if (rule.cssRules && rule.conditionText) { walk(rule.cssRules, '@media ' + rule.conditionText); continue; }
      if (!rule.selectorText || !test(rule.selectorText)) continue;
      var txt = wrap ? wrap + ' { ' + rule.cssText + ' }' : rule.cssText;
      if (!seen[txt]) { seen[txt] = 1; out.push({ text: txt, rule: rule }); }
    }
  };
  for (var i = 0; i < document.styleSheets.length; i++) {
    var ss = document.styleSheets[i], h = ss.href || ''; if (!/design\.css|demo\.css/.test(h)) continue; /* komponenty jádra i prezentační vrstvy */
    var rules; try { rules = ss.cssRules; } catch (e) { continue; }
    walk(rules, '');
  }
  return out;
}
function rulesFor(el) { return matchedRules(el).map(function (r) { return r.text; }); }
function varsFor(el, prop) {
  /* názvy --nf-* z deklarací pravidel, která na prvek dopadají a nastavují vlastnost prop (i zkratkou: border, font, animation …) */
  var fam = FAMILY[prop], names = [];
  if (!fam) return names;
  matchedRules(el).forEach(function (r) {
    r.rule.style.cssText.split(/;(?![^(]*\))/).forEach(function (d) {
      var i = d.indexOf(':'); if (i < 0) return;
      var name = d.slice(0, i).trim(); if (!fam.test(name)) return;
      var m, re = /var\((--nf-[a-z0-9-]+)/g, val = d.slice(i + 1);
      while ((m = re.exec(val))) if (names.indexOf(m[1]) < 0) names.push(m[1]);
    });
  });
  /* zkratka nese barvu i rozměr (border: var(--nf-bw) solid var(--nf-line)): k barevné vlastnosti jen barevné tokeny, k ostatním jen nebarevné */
  var wantColor = /color$/.test(prop);
  return names.filter(function (n) { return /^#/.test(norm(cs.getPropertyValue(n).trim())) === wantColor; });
}
function describe(el) {
  var st = getComputedStyle(el), rows = '';
  PROPS.forEach(function (p) {
    var v = st.getPropertyValue(p[0]); if (!v || v === 'none' || v === 'normal' || v === '0px' || v === '0s' || v === 'rgba(0, 0, 0, 0)' || (p[0] === 'border-color' && st.borderStyle === 'none')) return;
    var names = varsFor(el, p[0]); if (!names.length) names = tokenLabel(p, v); /* token z pravidla má přednost; shoda hodnoty jen jako nápověda */
    var shown = p[2] === 'color' ? (hexOf(v) || v) : p[0] === 'font-family' ? shortFont(v) : v;
    rows += '<tr><td>' + p[1] + '</td><td>' + (p[2] === 'color' && hexOf(v) ? '<i class="sw" style="background:' + hexOf(v) + '"></i>' : '') + shown + (names.length ? '<br>' + names.map(function (n) { return '<code>' + n + '</code>'; }).join(' ') : '') + '</td></tr>';
  });
  return rows;
}
function select(el) {
  if (selected) selected.removeAttribute('data-insp');
  selected = el; el.setAttribute('data-insp', '1');
  $('#insp-empty').hidden = true; $('#insp').hidden = false;
  $('#insp-tag').textContent = el.tagName.toLowerCase() + (el.getAttribute('role') ? ' · role=' + el.getAttribute('role') : '');
  $('#insp-cls').textContent = el.className ? '.' + String(el.className).trim().split(/\s+/).join(' .') : '(bez třídy)';
  $('#insp-props').innerHTML = describe(el);
  var css = rulesFor(el); $('#insp-css').textContent = css.join('\n');
}
function toast(msg) { var t = $('#toast'); if (!t) return; t.innerHTML = '<div class="toast">' + msg + '</div>'; clearTimeout(toast.h); toast.h = setTimeout(function () { t.innerHTML = ''; }, 2200); }
function copy(text, msg) {
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { toast(msg); }, function () { toast('Kopírování se nezdařilo – vyberte text ručně.'); });
  else toast('Kopírování není k dispozici – vyberte text ručně.');
}
function promptFor(el) {
  var st = getComputedStyle(el), lines = ['Komponenta NutriFee: <' + el.tagName.toLowerCase() + '> s třídami ' + ($('#insp-cls').textContent) + '.'];
  PROPS.forEach(function (p) { var v = st.getPropertyValue(p[0]); if (!v || v === 'none' || v === 'normal' || v === 'rgba(0, 0, 0, 0)' || v === '0px' || v === '0s') return; var names = varsFor(el, p[0]); if (!names.length) names = tokenLabel(p, v); /* token z pravidla má přednost; shoda hodnoty jen jako nápověda */ lines.push('- ' + p[1] + ': ' + (names.length ? names.map(function (n) { return 'var(' + n + ')'; }).join(' / ') : (p[2] === 'color' ? (hexOf(v) || v) : p[0] === 'font-family' ? shortFont(v) : v))); });
  lines.push('Pravidla: barvy, rozměry, pohyb a písmo jen z app/tokens.css (var(--nf-*)); cíl dotyku ≥ 48 px; stav vždy slovem a ikonou, ne jen barvou; fokus outline 3 px var(--nf-focus); respektovat prefers-reduced-motion.');
  lines.push('CSS z makety:'); lines.push(rulesFor(el).join('\n'));
  return lines.join('\n');
}

/* ---------- události ---------- */
document.addEventListener('click', function (ev) {
  var sw = ev.target.closest('[data-copy]'); if (sw) { copy(sw.getAttribute('data-copy'), 'Zkopírováno: ' + sw.getAttribute('data-copy')); return; }
  if (ev.target.closest('#insp-copy-css')) { if (selected) copy(rulesFor(selected).join('\n'), 'CSS zkopírováno.'); return; }
  if (ev.target.closest('#insp-copy-prompt')) { if (selected) copy(promptFor(selected), 'Zadání zkopírováno.'); return; }
  var inPreview = ev.target.closest('.comp .preview'); if (!inPreview) return;
  ev.preventDefault();
  var el = ev.target;
  if (el.nodeType !== 1) el = el.parentElement;
  /* vyber nejbližší prvek, který něco znamená (má třídu nebo je ovládací) */
  while (el && el !== inPreview && !(el.className && String(el.className).trim()) && !/^(BUTTON|A|INPUT|LABEL)$/.test(el.tagName)) el = el.parentElement;
  if (!el || el === inPreview) return;
  if (el.tagName === 'svg' || el.tagName === 'path' || el.tagName === 'circle') el = el.closest('[class]:not(svg)') || el;
  select(el);
});
document.addEventListener('keydown', function (ev) {
  if (ev.key !== 'Enter' && ev.key !== ' ') return;
  var el = document.activeElement; if (!el || !el.closest || !el.closest('.comp .preview')) return;
  ev.preventDefault(); select(el);
});
/* zvýraznění aktivní sekce v navigaci */
var navLinks = Array.prototype.slice.call(document.querySelectorAll('.ds-nav a'));
if ('IntersectionObserver' in window) {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (!en.isIntersecting) return; navLinks.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id); }); });
  }, { rootMargin: '-30% 0px -60% 0px' });
  document.querySelectorAll('.ds-sec').forEach(function (s) { io.observe(s); });
}
/* verze podle makety: načteme jádro jen kvůli NF.SCHEMA? Ne — katalog nenačítá skripty makety. Verzi dopíše publikace do data-version. */
var ver = document.body.getAttribute('data-version'); if (ver) $('#ds-version').textContent = 'verze ' + ver; /* data-version = NF.SCHEMA makety, hlídá test */

readTokens(); renderColors(); renderSpace(); renderSizes();
if (!tokens.length) { var b = $('#tok-colors'); if (b) b.innerHTML = '<p class="muted">Tokeny se nepodařilo načíst (stránka musí běžet ze serveru nebo ze stejné složky jako app/tokens.css).</p>'; }
})();
