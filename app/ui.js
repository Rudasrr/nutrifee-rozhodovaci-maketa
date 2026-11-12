/* Vykreslení (morph bez blikání), akce a veřejné rozhraní.
   Sloty (lišta prezentace, zásuvka, po vykreslení) plní volitelná prezentační vrstva. */
(function (global) {
'use strict';
var NF = global.NutriFee, V = NF.screens, e = NF.esc;
var S = NF.load();
var drawer = null;

NF.slots = NF.slots || {}; /* SCHEMA 89: jmenný prostor slotů zakládá jádro */
NF.registerSlot = function (name, fn) { NF.slots[name] = fn; NF.render && NF.render(); };
function slot(name) { try { return NF.slots[name] ? NF.slots[name](S) : ''; } catch (err) { return ''; } }
function toast(msg) { S.toast = msg; }
function fail(msg) { S.error = msg; }

/* ---------- morph: přepíše jen to, co se změnilo ---------- */
function morph(from, to) {
  if (from.nodeType === 3 && to.nodeType === 3) { if (from.nodeValue !== to.nodeValue) from.nodeValue = to.nodeValue; return; }
  if (from.nodeType !== to.nodeType || from.nodeName !== to.nodeName) { from.parentNode.replaceChild(to.cloneNode(true), from); return; }
  if (from.nodeType !== 1) return;
  /* Prostor, který plní jiná vrstva (panel vyprávění ukázky, data-nf-keep): jádro ho nepřepisuje, jen drží jeho místo v DOM (přístupnost, kontrola 4 B1). */
  if (from.hasAttribute && from.hasAttribute('data-nf-keep') && to.hasAttribute && to.hasAttribute('data-nf-keep') && from.id === to.id) return;
  var i, a = from.attributes, b = to.attributes;
  for (i = a.length - 1; i >= 0; i--) if (!to.hasAttribute(a[i].name)) from.removeAttribute(a[i].name);
  for (i = 0; i < b.length; i++) if (from.getAttribute(b[i].name) !== b[i].value) from.setAttribute(b[i].name, b[i].value);
  if (from.nodeName === 'INPUT' || from.nodeName === 'TEXTAREA') {
    if (from.type === 'checkbox') { if (from.checked !== to.checked) from.checked = to.checked; }
    else if (global.document.activeElement !== from && from.value !== to.value) from.value = to.value;
    from.disabled = to.disabled;
  }
  if (from.nodeName === 'BUTTON') from.disabled = to.disabled;
  morphChildren(from, to);
}
/* Potomky procházíme z pevného seznamu — šablona se nesmí měnit během průchodu. */
function morphChildren(from, to) {
  var tcs = Array.prototype.slice.call(to.childNodes), fcs = Array.prototype.slice.call(from.childNodes);
  for (var i = 0; i < tcs.length; i++) {
    if (!fcs[i]) { from.appendChild(tcs[i].cloneNode(true)); continue; }
    morph(fcs[i], tcs[i]);
  }
  for (var j = fcs.length - 1; j >= tcs.length; j--) from.removeChild(fcs[j]);
}
/* SCHEMA 83: pole, do kterého se právě píše (poznámka se ukládá při psaní a ukládání překresluje), musí po překreslení zůstat s fokusem i kurzorem.
   Když morph prvek nahradí (posun struktury nad ním), fokus a výběr se vrátí na nový prvek se stejným klíčem (data-gnote / data-bind). */
NF.keepCaret = function (root, fn) {
  var doc = global.document, a = doc && doc.activeElement, key = null, s0 = null, s1 = null, top = 0;
  try {
    if (a && root && root.contains && root.contains(a) && (a.nodeName === 'TEXTAREA' || a.nodeName === 'INPUT') && a.getAttribute) {
      var g = a.getAttribute('data-gnote'), bd = a.getAttribute('data-bind');
      key = g ? '[data-gnote="' + g + '"]' : bd ? '[data-bind="' + bd + '"]' : null;
      if (key && a.selectionStart != null) { s0 = a.selectionStart; s1 = a.selectionEnd; top = a.scrollTop || 0; }
    }
  } catch (err) { key = null; }
  fn();
  if (!key) return;
  try {
    if (doc.activeElement === a && a.isConnected !== false) return;
    var n = root.querySelector(key); if (!n || !n.focus) return;
    if (n.value !== a.value && a.value != null) n.value = a.value;
    n.focus({ preventScroll: true }); if (s0 != null && n.setSelectionRange) n.setSelectionRange(s0, s1); if (top) n.scrollTop = top;
  } catch (err2) { }
};
function keepOpenDetails(root) {
  /* stav <details> se drží podle textu summary a pořadí mezi stejnými texty (P7) */
  var open = {}, count = {};
  try { root.querySelectorAll('details').forEach(function (d) { var s = d.querySelector('summary'), k = s ? s.textContent : ''; count[k] = (count[k] || 0) + 1; if (d.open) open[k + '#' + count[k]] = 1; }); } catch (err) { }
  return open;
}

/* ---------- vykreslení ---------- */
/* B7 (31/03): dvě okna aplikace se stejným úložištěm by si navzájem přepsala zápisy. Okno, ve kterém se mezitím uložilo jiné okno, se zamkne
   a nabídne „Pokračovat v tomto okně“ (načte uložený stav). Jen bez prezentační vrstvy – ukázka si příběh a rozhodnutí garanta hlídá sama. */
var locked = false;
function lockScreen() {
  return '<div class="patient-shell"><div class="patient">' + V.card('<h2>NutriFee je otevřené v jiném okně</h2><p>Aby se zápisy nepřepsaly, pokračujte tam. Když chcete pokračovat tady, načteme to, co se v druhém okně uložilo.</p><div class="actions">' + V.btn('Pokračovat v tomto okně', 'useHere', null, 'primary') + '</div>') + '</div></div>';
}
function content() {
  if (locked) return lockScreen();
  if (NF.slots.pageOverride) { try { var o = NF.slots.pageOverride(S); if (o) return o; } catch (err) { } } /* vrstva nad jádrem může dodat vlastní stránku (úvod ukázky) */
  if (S.role === 'doctor') return V.doctor(S);
  if (S.role === 'nurse') return V.nurse(S);
  return V.patient(S);
}
NF.render = function () {
  var doc = global.document, root = doc && doc.getElementById('app');
  if (!root) return;
  var banner = slot('banner'); NF.renderSeq = (NF.renderSeq || 0) + 1; /* obsah obrazovky: oznámení o zamítnuté položce se v jednom vykreslení neopakuje */
  var html, page;
  NF.memo = { S: S }; /* paměť výpočtů na jedno vykreslení (robustnost #16) */
  try { page = content(); } finally { NF.memo = null; }
  /* Kontrola 4 (přístupnost B1): vrstva nad jádrem si může vyhradit místo hned za lištou (NF.slots.afterBanner = id prvku); Tab pak jde lišta → panel → obrazovka. */
  var host = NF.slots.afterBanner ? '<div id="' + e(NF.slots.afterBanner) + '" data-nf-keep=""></div>' : '';
  html = '<a class="skip" href="#main">Přeskočit na obsah</a>' + banner + host +
    (NF.storageOK ? '' : '<div class="error" role="alert">Zařízení nemá místo pro uložení, nebo je ukládání zakázané. Zápisy se po zavření ztratí.</div>') +
    (NF.readOnly ? '<div class="error" role="alert">V zařízení jsou data z novější verze NutriFee. Tahle verze je starší a nic neukládá. Zavřete a znovu otevřete aplikaci, aby se načetla nová verze.</div>' : '') + /* SCHEMA 90 (K4) */
    (NF.migrated ? '<div class="hint neutral mb-3" role="status">Uložený stav byl ze starší verze (' + e(NF.migrated) + '); začínáme znovu. Záloha zůstala v zařízení.' + (NF.clockModel ? '' : ' <button type="button" class="btn sm" data-action="startOver">Začít znovu</button>') + '</div>' : '') + /* K4: dokud uživatel nezvolí „Začít znovu“, synchronizace nic neposílá */
    '<main id="main" class="role-' + e(S.role) + '">' +
    (S.error ? '<div id="error" class="error" role="alert">' + e(S.error) + '</div>' : '') + page + '</main>';
  html = String(html).split(/(<textarea[\s\S]*?<\/textarea>)/).map(function (part, k) { return k % 2 ? part : NF.nbsp(part); }).join(''); /* SCHEMA 83: obsah textového pole (poznámka garanta) se sazbou nemění, jinak by se nezlomitelné mezery uložily do poznámky */
  var open = keepOpenDetails(root);
  if (typeof doc.createElement === 'function' && root.firstChild && root.innerHTML !== undefined && root.querySelectorAll) {
    var tmp = doc.createElement('div'); tmp.innerHTML = html;
    try {
      var seen = {};
      tmp.querySelectorAll('details').forEach(function (d) { var s = d.querySelector('summary'), k = s ? s.textContent : ''; seen[k] = (seen[k] || 0) + 1; if (open[k + '#' + seen[k]]) d.setAttribute('open', ''); });
      NF.keepCaret(root, function () { morphChildren(root, tmp); });
    } catch (err) { root.innerHTML = html; }
  } else root.innerHTML = html;
  renderDrawer();
  focusAfterRender(root);
  /* Po otevření položky registru je vidět začátek detailu pod lištou (B3, 27. 10. 2026): detail s vlastním rolováním se vynuluje,
     okno se posune tak, aby horní okraj detailu nebyl pod pevnou lištou ukázky (--barh) ani mimo zorné pole. */
  if (NF.scrollTarget) { try { NF.scrollTo(root.querySelector && root.querySelector(NF.scrollTarget)); } catch (err4) { } NF.scrollTarget = null; }
  if (S.toast) { showToast(S.toast); S.toast = ''; }
  if (NF.slots.afterRender) { try { NF.slots.afterRender(S); } catch (e3) { } }
};
NF.scrollTo = function (st) {
  if (!st || !st.getBoundingClientRect || !global.innerHeight) return;
  if (st.scrollTop) st.scrollTop = 0;
  var bar = 0; try { bar = parseFloat(global.getComputedStyle(global.document.documentElement).getPropertyValue('--barh')) || 0; } catch (err) { bar = 0; }
  var top = st.getBoundingClientRect().top, want = bar + 12;
  if ((top < want || top > global.innerHeight * 0.6) && global.scrollTo) global.scrollTo({ top: Math.max(0, (global.pageYOffset || 0) + top - want), behavior: 'auto' });
};
/* Po přepnutí obrazovky nebo role dostane fokus nadpis h1 (E5, 6. 10. 2026); první vykreslení fokus nemění.
   Krok jídla a stránka převzetí plánu jsou samostatné obrazovky: i po „Další“ dostane fokus nový h1 (A2, 19. 10. 2026). */
/* Ordinace (04 #1, 23. 10. 2026): krok kontroly, zahájení kontroly, vydání plánu, krok zařazení a výsledek zaučení jsou nová obrazovka → fokus na h1.
   Akce, po které obrazovka zůstane, ale tlačítko zmizí („Vše sedí“, rozhodnutí návrhu), nastaví NF.focusSel – fokus dostane nadpis aktuálního návrhu. */
var lastScreen = null;
NF.focusSel = null;
function focusAfterRender(root) {
  var r = S.review, t = S.training;
  var key = S.role + '/' + S.page + (S.meal ? '/k' + S.meal.step : '') + (S.onboarding && S.onboarding.page ? '/o' + S.onboarding.page : '') +
    (S.role === 'doctor' ? '/r' + (r ? r.step + ':' + (r.planIssued || '') : '-') + '/w' + (S.draft ? S.wizardStep : '-') : '') + (S.role === 'nurse' && t ? '/t' + (t.result || '') : '');
  /* SCHEMA 90 (přístupnost V3): v kroku jídla se po odpovědi mění otevřená otázka – nový nadpis = nová obrazovka, fokus na něj, ne na začátek stránky */
  if (S.meal && S.page === 'meal' && root && typeof root.querySelector === 'function') { try { var qh = root.querySelector('main h1'); key += '/h:' + (qh ? qh.textContent : ''); } catch (errq) { } }
  if (NF.focusSel && root && typeof root.querySelector === 'function') {
    var sel = NF.focusSel; NF.focusSel = null;
    try { var fe = root.querySelector(sel); if (fe && fe.focus) { fe.setAttribute('tabindex', '-1'); fe.focus(); lastScreen = key; return; } } catch (err0) { }
  }
  if (lastScreen !== null && lastScreen !== key && root && typeof root.querySelector === 'function') {
    try { var h = root.querySelector('main h1'); if (h && h.focus) { h.setAttribute('tabindex', '-1'); h.focus(); } } catch (err) { }
  }
  lastScreen = key;
}
/* Oznámení zůstane tak dlouho, aby ho senior dočetl: nejméně 6 s, u delšího textu 60 ms na znak; při najetí myší nebo fokusu nezmizí (A14, 19. 10. 2026). */
var toastTimer = null;
NF.toastMs = function (msg) { return Math.max(6000, String(msg || '').length * 60); };
/* B9 (31/03): oznámení nikdy nezakrývá tlačítko pod sebou (CSS pointer-events: none) a zavře ho klepnutí kamkoli; přepnutí role ho smaže (C5). */
function clearToast() { var el = global.document && global.document.getElementById && global.document.getElementById('toast'); if (el) el.innerHTML = ''; if (toastTimer && global.clearTimeout) global.clearTimeout(toastTimer); toastTimer = null; }
NF.clearToast = clearToast;
function showToast(msg) {
  var el = global.document && global.document.getElementById('toast'); if (!el) return;
  el.innerHTML = '<div class="toast">' + e(msg) + '</div>'; /* #toast je trvalá živá oblast (aria-live v HTML) */
  var hide = function () { el.innerHTML = ''; toastTimer = null; };
  var arm = function (ms) { if (toastTimer && global.clearTimeout) global.clearTimeout(toastTimer); toastTimer = global.setTimeout ? global.setTimeout(hide, ms) : null; };
  arm(NF.toastMs(msg));
  el.onmouseenter = el.onfocusin = function () { if (toastTimer && global.clearTimeout) global.clearTimeout(toastTimer); toastTimer = null; };
  el.onmouseleave = el.onfocusout = function () { if (el.innerHTML) arm(3000); };
}
/* Zásuvka je modální: obsah pod ní je inert, takže Tab ani čtečka z ní neodejdou (A3, 19. 10. 2026). */
function setInert(on) { var app = global.document && global.document.getElementById('app'); if (!app) return; app.inert = !!on; if (app.setAttribute) { if (on) app.setAttribute('inert', ''); else if (app.removeAttribute) app.removeAttribute('inert'); } }
/* Kontrola 4 (prohlížeč M1, přístupnost B2): otevřená zásuvka se překresluje morphem – drží polohu rolování i fokus (dřív po každém úkonu skočila
   na začátek a fokus spadl na „×“). Fokus na „×“ jen při otevření; když prvek s fokusem po překreslení nese jinou akci, fokus se vrátí na prvek se stejnou
   akcí a hodnotou (nebo se stejným polem poznámky). Název dialogu podle obsahu (C1): NF.slots.drawerLabel. */
var drawerShown = null;
function focusKey(a) {
  if (!a || !a.getAttribute) return null;
  var g = a.getAttribute('data-gnote'); if (g) return '[data-gnote="' + g + '"]';
  var act = a.getAttribute('data-action'); if (!act) return null;
  var v = a.getAttribute('data-value'); return '[data-action="' + act + '"]' + (v != null ? '[data-value="' + v.replace(/"/g, '\\"') + '"]' : ':not([data-value])');
}
function drawerLabel(name) {
  var l = ''; try { l = NF.slots.drawerLabel ? NF.slots.drawerLabel(name) : ''; } catch (err) { l = ''; }
  return l || (name === 'safety' ? 'Bezpečí' : name === 'acute' ? 'Pravidla a kontakty' : name.indexOf('item:') === 0 ? 'Položka registru' : 'Podrobnosti');
}
function renderDrawer() {
  var el = global.document && global.document.getElementById('overlay'); if (!el) return;
  setInert(!!drawer);
  if (!drawer) { el.innerHTML = ''; drawerShown = null; if (drawerOpener && typeof drawerOpener.focus === 'function') { try { drawerOpener.focus(); } catch (err) { } } drawerOpener = null; return; }
  var body = '';
  if (drawer.indexOf('item:') === 0) body = V.itemDetail ? V.itemDetail(S, drawer.slice(5)) : '';
  else if (drawer === 'acute') body = V.acute ? V.acute(S) : '';
  else if (drawer === 'safety') body = V.safetySheet ? V.safetySheet(S) : '';
  else if (NF.slots.drawer) body = NF.slots.drawer(S, drawer) || '';
  if (!body) { el.innerHTML = ''; drawer = null; drawerShown = null; setInert(false); return; }
  var html = '<div class="drawer' + (drawer === 'safety' ? ' sheet' : '') + '"><section class="drawerpanel" role="dialog" aria-modal="true" aria-label="' + e(drawerLabel(drawer)) + '">' +
    '<button type="button" class="btn sm close" data-action="closeDrawer" aria-label="Zavřít">×</button>' + body + '</section></div>';
  var doc = global.document, same = drawerShown === drawer && el.firstChild && typeof doc.createElement === 'function' && el.querySelector;
  drawerShown = drawer;
  if (!same) { el.innerHTML = html; try { var c = el.querySelector && el.querySelector('.close'); if (c && c.focus) c.focus(); } catch (err2) { } return; }
  var a = doc.activeElement, had = a && el.contains && el.contains(a) ? focusKey(a) : null, pnl = el.querySelector('.drawerpanel'), top = pnl ? pnl.scrollTop : 0;
  var open = keepOpenDetails(el);
  try {
    var tmp = doc.createElement('div'); tmp.innerHTML = html; var seen = {};
    tmp.querySelectorAll('details').forEach(function (d) { var sm = d.querySelector('summary'), k = sm ? sm.textContent : ''; seen[k] = (seen[k] || 0) + 1; if (open[k + '#' + seen[k]]) d.setAttribute('open', ''); });
    NF.keepCaret(el, function () { morphChildren(el, tmp); });
  } catch (err3) { el.innerHTML = html; }
  pnl = el.querySelector('.drawerpanel'); if (pnl && pnl.scrollTop !== top) pnl.scrollTop = top;
  if (had) { var now = doc.activeElement; if (!now || !el.contains(now) || focusKey(now) !== had) { try { var f = el.querySelector(had); if (f && f.focus) f.focus({ preventScroll: true }); else { var c2 = el.querySelector('.close'); if (c2) c2.focus({ preventScroll: true }); } } catch (err4) { } } }
}
var drawerOpener = null;
NF.openDrawer = function (n) { if (!drawer) drawerOpener = global.document && global.document.activeElement; drawer = n; renderDrawer(); };
NF.closeDrawer = function () { drawer = null; renderDrawer(); };
NF.currentDrawer = function () { return drawer; };

/* ---------- vazba polí ---------- */
/* Z formuláře smí jít jen vyjmenované klíče (robustnost #2, 23. 10. 2026); strukturu stavu (dávky, rozhodnutí, krok) vazba nepřepíše. */
NF.NAME_MAX = 80;
function bind(key, value) {
  var parts = String(key).split('.');
  if (parts.length !== 2 && key !== 'notes') return;
  var str = function (n) { return value == null ? '' : typeof value === 'object' ? '' : String(value).slice(0, n); };
  if (parts[0] === 'form') { if (/^(__proto__|constructor|prototype)$/.test(parts[1])) return; S.form = S.form || {}; S.form[parts[1]] = str(/^note_/.test(parts[1]) ? 4000 : 500); return; } /* poznámka garanta nejvýš 4000 znaků jako na serveru (31 B3) */
  if (parts[0] === 'meal' && S.meal && parts[1] === 'q') { S.meal.q = str(NF.NAME_MAX); S.meal.foodId = null; S.meal.newFood = null; return; }
  if (parts[0] === 'draft' && S.draft && parts[1] === 'medicationChecked') { NF.setMedicationChecked(S, value === true || value === 'true'); return; } /* SCHEMA 87: do stopy */
  if (parts[0] === 'draft' && S.draft && parts[1] === 'notes') { S.draft.notes = str(500); return; }
  if (parts[0] === 'reg' && parts[1] === 'q') { S.reg = S.reg || {}; S.reg.q = str(200); return; }
  if (parts[0] === 'support' && parts[1] === 'text') { S.support.text = String(value).slice(0, 500); S.support.sent = false; return; }
  if (key === 'notes') S.notes = str(2000); /* jiné kořeny ani klíče stavu z formuláře měnit nelze (P9, robustnost #2) */
}

/* ---------- akce ---------- */
function catalog() { return NF.habitCatalog(); }
/* Po vydání plánu z kontroly se návrhy už nemění (P6); bez zahájené kontroly akce nad návrhy nic nedělají. */
function reviewLocked() {
  if (!S.review) { fail('Kontrola není zahájená.'); return true; }
  if (S.review.planIssued) { fail('Plán ' + S.review.planIssued + ' už je vydaný. Změny patří do příští kontroly.'); return true; }
  return false;
}
/* Registr ukázaný jako ostrá aplikace s modelovými rozhodnutími (prezentační vrstva, NF.slots.registryModel): krok z podnětu je modelový,
   garantovi se nepřipisuje a neukládá se mimo zařízení. V produkci (bez slotu) jde o běžné rozhodnutí. */
function modelStep(fn) { var model = false; try { model = !!(NF.slots.registryModel && NF.slots.registryModel(S)); } catch (err) { model = false; } return model ? NF.muteHooks(fn) : fn(); }
/* HbA1c (B3): záznam zdroje pro aktuální období; po vydání plánu z kontroly se výsledek sestry nemění. */
function hbaEntry(src) { var p = NF.activePlan(S), st = p ? NF.day(p.issuedAt) : null; return NF.hba1cLog(S).filter(function (x) { return x.src === src && (src !== 'sestra' || !st || !x.date || x.date > st); })[0] || null; }
function hbaLocked(src) { var p = NF.activePlan(S); return src === 'karta' ? !S.draft : !!(S.review && S.review.planIssued && p && S.review.planId === p.id); }
/* Akce nad zápisem jídla potřebují rozpracovaný zápis (C4). */
function needMeal() { if (!S.meal) { fail('Zápis jídla není otevřený. Začněte na Dnes.'); return false; } return true; }
/* Náhled telefonu u sestry podle bodu zaučení: stránka a případné ukázkové jídlo. Vrací false, když hodnota není bod. */
function previewFor(id) {
  var it = NF.trainingItems(S).filter(function (x) { return x.id === id; })[0]; if (!it) return false;
  S.training.previewPage = it.page; S.training.preview = it.preview || null; return true;
}
function validMeal(meal) { return NF.isSnack(meal) || NF.MEALS.some(function (m) { return m[0] === meal; }); }
function newMeal(meal) {
  var p = NF.activePlan(S);
  var snack = NF.isSnack(meal);
  return { step: snack ? 2 : 1, meal: meal, bolus: snack ? 'snack' : null, units: p && p.doses[meal] ? p.doses[meal].units : 0, offset: '0', q: '', foodId: null, portion: snack ? 'usual' : null, decisions: {}, reasons: {}, newFood: null };
}
var A = {
  noop: function () { },
  useHere: function () { S = NF.load(); locked = false; }, /* B7: pokračovat v tomto okně se stavem, který uložilo jiné okno */
  animReplay: function (v) { /* restart CSS animace: odebrat a vrátit třídu play; stav se nemění, stopa nic nezapisuje */
    var d = global.document; if (!d || !d.querySelector) return;
    try { var el = d.querySelector('[data-anim="' + v + '"]'); if (!el) return; el.classList.remove('play'); void el.offsetWidth; el.classList.add('user'); el.classList.add('play'); } catch (err) { } /* „user“: přehrát i při omezení pohybu, když o to člověk sám požádá (04 #13) */
  },
  startOver: function () { S = NF.createState(); NF.seed(S); NF.migrated = null; drawer = null; toast('Začínáme znovu.'); }, /* „Začít znovu“ po nezobrazitelném stavu (robustnost #1) */
  page: function (v) { if (S.role === 'nurse' || NF.PAGES.indexOf(v) < 0) return; S.page = v; S.error = ''; S.foodOpen = null; if (v === 'understand' && S.onboarding) S.onboarding.page = 6; }, /* sestra má jen zaučení; náhled telefonu neovládá; „understand“ = 6. stránka převzetí */
  role: function (v) {
    if (['patient', 'doctor', 'nurse'].indexOf(v) < 0) return;
    S.role = v; S.error = ''; S.meal = null; S.ask = null; S.toast = ''; clearToast(); /* rozpracovaný zápis nepatří jiné roli (P5); oznámení předchozí role zmizí (C5, 31/03) */
    S.page = v === 'doctor' ? (S.draft ? 'enroll' : S.review ? 'review' : NF.activePlan(S) ? 'review' : 'enroll') : v === 'nurse' ? 'training' : 'today';
  },
  closeDrawer: function () { drawer = null; },
  openItem: function (v) { if (!NF.item(S, v)) return; if (!drawer) drawerOpener = global.document && global.document.activeElement; drawer = 'item:' + v; },

  /* ordinace */
  wizardGo: function (v) {
    var n = NF.int(v, 0, 2, null); if (n == null) return;
    /* Krok dál jen bez blokátorů (02 #5): krok 3 s prázdnými dávkami by ukázal „0 j.“ a aktivní vydání. */
    if (S.draft && n >= 1 && (!S.enrollment.eligible || NF.excluded(S))) return fail(!S.enrollment.eligible ? 'Nejdřív potvrďte podmínky zařazení.' : 'Nejdřív potvrďte, že pacient nemá žádné vylučovací kritérium.');
    if (S.draft && n === 2) { var bl = NF.planBlockers(S); if (bl.length) return fail('Ke shrnutí zatím nelze. Chybí: ' + bl.join(', ') + '.'); }
    S.wizardStep = n;
  },
  /* Kontrola 4 (předávka jádra): volič dávky a výchozích hodnot mřížkou, vylučovací kritéria, sada cílů, body sestry, připomínky, zpětný zápis včerejška */
  doseSet: function (v) { var p = String(v).split(':'); if (S.draft) NF.setDoseValue(S, p[0], NF.int(p[1], NF.DOSE_RANGE[0], NF.DOSE_RANGE[1], null)); }, /* SCHEMA 87: jeden rozsah 1–60 */
  baselineSet: function (v) { var p = String(v).split(':'); NF.setBaselineValue(S, p[0], NF.int(p[1], 0, 100, null)); },
  exclusion: function () { NF.setEligibility(S, NF.EXCLUSION[0], NF.excluded(S)); },
  targetPreset: function (v) { if (S.draft) NF.setTargetPreset(S, S.draft.targets, v); },
  nurseCheck: function (v) { var p = String(v).split(':'), cur = NF.nurseAnswer(S, p[0]), val = p[1] === 'yes' ? true : p[1] === 'no' ? false : null; NF.setNurseCheck(S, p[0], cur === val ? null : val); },
  nurseMeds: function (v) { if (!NF.setNurseMeds(S, v).ok) return fail('Vyberte, zda pacient začal brát jiný lék na diabetes.'); },
  /* SCHEMA 84 (bod 5, C8): zdravotní stav je druhá otázka sestry a kroku 1 */
  nurseHealth: function (v) { if (!NF.setNurseHealth(S, v).ok) return fail('Vyberte, zda se změnil zdravotní stav.'); },
  /* SCHEMA 84 (bod 6): hmotnost pro kontrolu vybere sestra (posuvník po 1 kg a ±1); zámek jako u HbA1c sestry */
  nurseWeightSet: function (v) { if (hbaLocked('sestra')) return; var r = NF.setWeight(S, 'sestra', NF.int(v, 30, 250, null)); if (!r.ok) return fail(r.error); },
  nurseWeightStep: function (v) { if (hbaLocked('sestra')) return; var w = NF.weightFor(S, NF.activePlan(S), S.clock).now, d = NF.int(v, -10, 10, null); if (!w || d == null) return; var r = NF.setWeight(S, 'sestra', w.kg + d, w.date); if (!r.ok) return fail(r.error); },
  /* B3 (31/02): HbA1c voličem – hodnota mřížkou nebo ±1, datum odběru výběrem; src „karta“ (zařazení) nebo „sestra“ (pro kontrolu) */
  hbaSet: function (v) { var p = String(v).split(':'); if (['karta', 'sestra'].indexOf(p[0]) < 0 || hbaLocked(p[0])) return; var cur = hbaEntry(p[0]); var r = NF.setHba1c(S, p[0], NF.int(p[1], 20, 150, null), cur ? cur.date : null); if (!r.ok) return fail(r.error); if (p[0] === 'sestra' && S.nurseCheck) S.nurseCheck.hbaNone = false; },
  hbaStep: function (v) { var p = String(v).split(':'), cur = hbaEntry(p[0]), d = NF.int(p[1], -10, 10, null); if (!cur || d == null || hbaLocked(p[0])) return; var r = NF.setHba1c(S, p[0], cur.v + d, cur.date); if (!r.ok) return fail(r.error); },
  hbaDate: function (v) { if (['karta', 'sestra'].indexOf(v) < 0 || hbaLocked(v)) return; var d = (S.form && S.form['hba_date_' + v]) || ''; if (!d) return; var r = NF.setHba1cDate(S, v, d); if (!r.ok) return fail(r.error); delete S.form['hba_date_' + v]; },
  hbaNone: function () { if (hbaLocked('sestra')) return; NF.setNurseHbaNone(S); },
  reminderTime: function (v) { var i = String(v).indexOf(':'); NF.setReminderTime(S, String(v).slice(0, i), String(v).slice(i + 1)); },
  reminderToggle: function (v) { NF.toggleReminder(S, v); },
  mealRetroYesterday: function (v) { if (!validMeal(v) || NF.isSnack(v)) return fail('Neznámé jídlo dne.'); S.meal = newMeal(v); S.meal.retro = true; S.meal.at = null; S.meal.day = NF.day(NF.addDays(NF.appDay(S, S.clock) + 'T12:00:00', -1)); S.ask = null; S.page = 'meal'; S.error = ''; },
  eligibility: function (v) { if (!NF.ELIGIBILITY.some(function (c) { return c[0] === v; })) return; NF.setEligibility(S, v, !S.enrollment.criteria[v]); },
  baseline: function (v) { var p = String(v).split(':'), d = NF.int(p[1], -100, 100, null); if (d == null) return; NF.setBaseline(S, p[0], d); }, /* výchozí hodnoty ze senzoru při zařazení */
  startDraft: function () {
    if (S.draft) return;
    S.draft = NF.newDraft(S); /* startovní sadu (stejnou pro všechny, 15 odst. 4) předvyplní už NF.newDraft; dřívější druhé přidání ji zdvojovalo (A1, 31/03). Dávky nepředvyplňujeme. */
  },
  dose: function (v) { var p = String(v).split(':'), d = NF.int(p[1], -60, 60, null); if (!S.draft || d == null || ['basal', 'breakfast', 'lunch', 'dinner'].indexOf(p[0]) < 0) return; NF.setDose(S, p[0], d); },
  basalTime: function (v) { if (S.draft && /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v))) S.draft.doses.basal.time = v; }, /* čas bazálu voličem (15, odst. 4.3) */
  target: function (v) { var p = String(v).split(':'), d = NF.int(p[1], -10, 10, null); if (S.draft && d != null) NF.setTarget(S.draft.targets, p[0], d); },
  /* Posuvník hodnoty (rozhodnutí 9): cíle a hodnoty pravidel se nastavují přímo hodnotou; meze a krok drží jádro (NF.TARGET_STEPS, katalog pravidel) */
  targetSet: function (v) { var p = String(v).split(':'); if (S.draft) NF.setTargetValue(S.draft.targets, p[0], Number(p[1])); },
  revTargetSet: function (v) { var p = String(v).split(':'); if (S.review && !S.review.planIssued) NF.setTargetValue(S.review.newTargets, p[0], Number(p[1])); },
  instrSet: function (v) { var p = String(v).split(':'), c = NF.instructionCatalog().filter(function (x) { return x.id === p[0]; })[0], ex = S.draft && S.draft.instructions.filter(function (x) { return x.id === p[0]; })[0]; if (!ex || !c || c.fixed || !Number.isFinite(Number(p[1]))) return; ex.value = NF.instrClamp(c, Number(p[1])); },
  revInstrSet: function (v) { var p = String(v).split(':'), c = NF.instructionCatalog().filter(function (x) { return x.id === p[0]; })[0], r = S.review, ex = r && !r.planIssued && r.newInstructions.filter(function (x) { return x.id === p[0]; })[0]; if (!ex || !c || c.fixed || !Number.isFinite(Number(p[1]))) return; ex.value = NF.instrClamp(c, Number(p[1])); },
  revTarget: function (v) { var p = String(v).split(':'), d = NF.int(p[1], -10, 10, null); if (S.review && !S.review.planIssued && d != null) NF.setTarget(S.review.newTargets, p[0], d); },
  revInstrToggle: function (v) {
    var c = NF.instructionCatalog().filter(function (x) { return x.id === v; })[0], r = S.review; if (!r || !c || r.planIssued) return; /* K14: jen pravidlo z katalogu */
    var has = r.newInstructions.some(function (x) { return x.id === v; });
    r.newInstructions = has ? r.newInstructions.filter(function (x) { return x.id !== v; }) : r.newInstructions.concat([{ id: v, value: c ? NF.instructionValue(S, c) : true }]);
  },
  revInstrValue: function (v) {
    var p = String(v == null ? '' : v).split(':'), c = NF.instructionCatalog().filter(function (x) { return x.id === p[0]; })[0], r = S.review; if (!r) return;
    var ex = r.newInstructions.filter(function (x) { return x.id === p[0]; })[0], d = NF.int(p[1], -10, 10, null); if (!ex || !c || c.fixed || d == null) return;
    ex.value = NF.instrClamp(c, ex.value + d * (c.step || 1));
  },
  toggleHabit: function (v) { NF.toggleHabit(S, v); },
  instrToggle: function (v) {
    var c = NF.instructionCatalog().filter(function (x) { return x.id === v; })[0]; if (!c || !S.draft) return; /* K14 */
    var has = S.draft && S.draft.instructions.some(function (x) { return x.id === v; });
    NF.setInstruction(S, v, has ? null : (c ? NF.instructionValue(S, c) : true));
  },
  instrValue: function (v) {
    var p = String(v == null ? '' : v).split(':'), c = NF.instructionCatalog().filter(function (x) { return x.id === p[0]; })[0];
    var ex = S.draft && S.draft.instructions.filter(function (x) { return x.id === p[0]; })[0], d = NF.int(p[1], -10, 10, null); if (!ex || !c || c.fixed || d == null) return;
    ex.value = NF.instrClamp(c, ex.value + d * (c.step || 1)); /* meze z katalogu pokynů (robustnost #10) */
  },
  issuePlan: function () {
    var r = NF.issuePlan(S, catalog()); if (!r.ok) return fail(r.error);
    NF.handover(S);
    S.role = 'nurse'; S.page = 'training'; S.training = { result: null, steps: {}, previewPage: 'today' };
    toast('Plán ' + r.plan.id + ' je vydaný. Pacienta teď zaučí sestra.');
  },
  trainingCheck: function (v) { if (S.role !== 'nurse') return fail('Zaučení potvrzuje sestra.'); S.training.steps[v] = true; previewFor(v); }, /* nastaví, nepřepíná — pro kroky vyprávění (CH-4) */
  trainingStep: function (v) {
    if (S.role !== 'nurse') return fail('Zaučení vede sestra.');
    S.training.steps[v] = !S.training.steps[v];
    if (S.training.steps[v]) previewFor(v);
    if (S.training.result === 'done' && !NF.trainingItems(S).every(function (x) { return S.training.steps[x.id]; })) { S.training.result = null; S.training.reason = null; }
  },
  /* „Ukázat“: hodnota je bod zaučení (náhled i s ukázkovým jídlem), nebo přímo stránka (plan, today, safety). */
  trainingPreview: function (v) { if (!previewFor(v)) { if (NF.PAGES.indexOf(v) < 0) return; S.training.previewPage = v; S.training.preview = null; } }, /* hodnota mimo stránky se ignoruje (robustnost #9) */
  trainingReason: function (v) { if (S.role !== 'nurse') return fail('Zaučení vede sestra.'); S.training.reason = S.training.reason === v ? null : v; if (S.training.result === 'failed') NF.finishTraining(S, 'failed', S.training.reason); },
  finishTraining: function (v) {
    if (v === 'reset') { var r0 = NF.finishTraining(S, null); if (!r0.ok) return fail(r0.error); toast('Výsledek zaučení je zrušený; můžete pokračovat.'); return; }
    var r = NF.finishTraining(S, v, S.training.reason || null); if (!r.ok) return fail(r.error);
    toast(v === 'done' ? 'Zaučení je dokončené a zapsané. Předejte telefon pacientovi.' : 'Zapsáno: zaučení se nezdařilo. Návyky pacientovi nezačnou platit; lékař to uvidí na kontrole.');
  },
  answerCheck: function (v) { NF.setCheckAnswer(S, v); }, /* SCHEMA 87: odpověď do stopy */
  confirmUnderstanding: function () {
    if (S.onboarding && S.onboarding.readback === 'no') return fail('Dávky nesouhlasí. Ukažte telefon sestře.');
    var p = NF.activePlan(S); if (p && !p.handedOver) NF.handover(S);
    var r = NF.confirmUnderstanding(S); if (!r.ok) return fail(r.error);
    S.page = 'today'; toast('Hotovo. Plán platí.');
  },

  /* pacient: dnes */
  illness: function (v) { NF.setIllness(S, v === 'on'); toast(v === 'on' ? 'Nemoc je označená. Pomáháme dál, jen jinak.' : 'Nemoc je ukončená. Rady zase platí naplno.'); },
  illnessCheck: function (v) { NF.illnessCheckin(S, v === 'better'); toast(v === 'better' ? 'Rádi to slyšíme. Rady zase platí naplno.' : 'Zeptáme se zítra. Pravidla pro nemoc máte nahoře.'); },
  basalOther: function () { var p = NF.activePlan(S); if (!p) return; S.basalOther = !S.basalOther; S.basalUnits = Number.isInteger(S.basalUnits) ? S.basalUnits : p.doses.basal.units; },
  basalUnits: function (v) { var p = NF.activePlan(S), d = NF.int(v, -60, 60, null); if (!p || d == null) return; var cur = Number.isInteger(S.basalUnits) ? S.basalUnits : p.doses.basal.units; S.basalUnits = NF.clampDose(cur + d); },
  /* SCHEMA 87 (bod 3; 15 odst. 15a): čísla pacienta posuvníkem – hodnota přímo, meze NF.DOSE_RANGE */
  basalUnitsSet: function (v) { var p = NF.activePlan(S), u = NF.int(v, NF.DOSE_RANGE[0], NF.DOSE_RANGE[1], null); if (!p || u == null) return; S.basalOther = true; S.basalUnits = u; },
  basalYesterday: function (v) { var p = NF.activePlan(S); if (!p || ['as', 'none', 'unknown'].indexOf(v) < 0) return; var r = NF.confirmBasal(S, v, undefined, p.doses.basal.time, NF.day(NF.addDays(S.clock, -1))); if (!r.ok) return fail(r.error); toast('Díky za doplnění. Včerejší bazál je zapsaný.'); },
  basalConfirm: function (v) { if (['as', 'other', 'none', 'unknown'].indexOf(v) < 0) return; if (v === 'other' && !Number.isInteger(S.basalUnits)) return fail('Nastavte počet jednotek.'); var r = NF.confirmBasal(S, v, v === 'other' ? S.basalUnits : v === 'none' ? null : undefined); if (!r.ok) return fail(r.error); S.basalOther = false; toast('Bazál je zapsaný.'); },
  startMeal: function (v) { if (S.role !== 'patient') return fail('Jídlo zapisuje pacient.'); var meal = v || V.mealNow(S); if (!validMeal(meal)) return fail('Neznámé jídlo dne.'); S.meal = newMeal(meal); S.page = 'meal'; S.error = ''; },
  mealRetro: function (v) { if (!validMeal(v) || NF.isSnack(v)) return fail('Neznámé jídlo dne.'); S.meal = newMeal(v); S.meal.retro = true; S.meal.at = null; S.ask = null; S.page = 'meal'; S.error = ''; },
  mealAt: function (v) { if (!needMeal()) return; var h = v == null || String(v).trim() === '' ? NaN : Number(v); if (!Number.isFinite(h) || h < 0 || h >= 24) return fail('Vyberte čas jídla.'); S.meal.at = h; }, /* jen hodina dne 0–23,99 (robustnost #4) */
  mealSkipAsk: function (v) { if (!NF.MEALS.some(function (m) { return m[0] === v; })) return; S.ask = S.ask && S.ask.meal === v ? null : { day: NF.appDay(S, S.clock), meal: v }; },
  mealSkip: function (v) { var p = String(v).split(':'); if (!NF.MEALS.some(function (m) { return m[0] === p[0]; }) || ['as', 'other', 'none', 'unknown'].indexOf(p[1]) < 0) return; var r = NF.skipMeal(S, p[0], p[1]); S.ask = null; if (r.warn) NF.noteRule(S, 'I-MENE', 'vynechano'); /* SCHEMA 87 */ toast(r.warn ? 'Zapsáno. Inzulin bez jídla – pravidlo máte na Dnes.' : 'Zapsáno: dnes ' + NF.mealText(p[0], 'without') + '.'); },
  mealBolus: function (v) { if (!needMeal()) return; if (['as', 'other', 'before', 'unknown', 'none', 'snack'].indexOf(v) < 0) return; if (S.meal.usual) { S.meal.usual = false; S.meal.foodId = null; S.meal.portion = null; } /* SCHEMA 91: jiná odpověď ruší „Jako obvykle“ i s předvyplněným jídlem */ S.meal.bolus = v; S.meal.decisions = {}; S.meal.reasons = {};
    if (S.meal.qOpen !== 'ins') S.meal.q1done = v === 'as' || v === 'before' || (!!S.meal.retro && v === 'none'); if (v === 'unknown') NF.noteRule(S, 'I-NEVIM', 'krok1'); }, /* SCHEMA 87: pravidlo I-NEVIM do stopy */ /* SCHEMA 86: jednoznačná odpověď otázku sbalí, „jinak“ a „nevím“ čekají na Pokračovat */
  /* SCHEMA 86 (rozhodnutí vlastníka 5. 11. 2026, bod 3): otázky kroku 1 jedna po druhé – „Změnit“ otevře zodpovězenou otázku, „Pokračovat“ ji sbalí. Do stopy nic nejde (odpovědi zapisují jejich vlastní akce). */
  /* SCHEMA 91 (rozhodnutí vlastníka 11. 11. 2026, bod 13; pacient V5): „Jako obvykle“ – inzulin podle plánu právě teď, totéž známé jídlo a obvyklá porce (NF.usualMeal);
     glukózu pacient vybírá dál posuvníkem, krok 2 se přeskočí, rady a pravidla v kroku 3 jsou stejné. Do stopy jde volba. */
  mealUsual: function (v) { if (!needMeal()) return; var m = S.meal, u = m.retro ? null : NF.usualMeal(S, m.meal); if (!u || u.foodId !== v) return fail('Volba „Jako obvykle“ tu není.');
    m.usual = true; m.bolus = 'as'; m.offset = '0'; m.timeOther = false; m.q1done = true; m.qOpen = null; m.foodId = u.foodId; m.portion = 'usual'; m.q = ''; m.newFood = null; m.decisions = {}; m.reasons = {};
    NF.log(S, 'jidlo.jako_obvykle', u.food.name + ' · ' + u.units + ' j.', { meal: m.meal, foodId: u.foodId, units: u.units, item: 'S-DAVKA' }); },
  mealQ: function (v) { if (!needMeal()) return; var m = S.meal;
    if (v === 'ins' || v === 'when' || v === 'atmeal') { m.qOpen = v; return; }
    if (v === 'next:ins') { if (!m.bolus) return; m.q1done = true; m.qOpen = null; return; }
    if (v === 'next:when') { if (m.at == null) return; m.whenOk = true; m.qOpen = null; return; }
    if (v === 'next:atmeal') { if (!m.beforeAsked) return; m.atMealOk = true; m.qOpen = null; } },
  mealUnits: function (v) { if (!needMeal()) return; var d = NF.int(v, -60, 60, null); if (d == null) return; S.meal.units = NF.clampDose((Number.isInteger(S.meal.units) && S.meal.units >= 1 ? S.meal.units : 1) + d); },
  mealUnitsSet: function (v) { if (!needMeal()) return; var u = NF.int(v, NF.DOSE_RANGE[0], NF.DOSE_RANGE[1], null); if (u == null) return; S.meal.units = u; }, /* SCHEMA 87: posuvník jednotek */
  /* SCHEMA 87 (bod 7; 15 odst. 7.1 „Čas: právě teď / před 5 / před 15 min / jiný“): „jiný čas“ otevře posuvník „před kolika minutami“ (0–120 po 5 min) */
  mealTime: function (v) { if (!needMeal()) return; v = String(v); if (v === 'other') { S.meal.timeOther = true; if (['0', '-5', '-15', '-30'].indexOf(String(S.meal.offset)) >= 0 || S.meal.offset == null) S.meal.offset = '-45'; return; } if (['0', '-5', '-15', '-30', '15'].indexOf(v) < 0) return; S.meal.offset = v; S.meal.timeOther = false; }, /* jen hodnoty z voliče (robustnost #5) */
  mealTimeAgo: function (v) { if (!needMeal()) return; var n = NF.int(v, 0, NF.INS_AGO_MAX, null); if (n == null || n % 5) return; S.meal.offset = String(-n); S.meal.timeOther = true; },
  mealCancelAsk: function () { if (!S.meal) return; S.meal.cancelAsk = true; },
  mealCancelKeep: function () { if (!S.meal) return; S.meal.cancelAsk = false; },
  /* SCHEMA 90 (pacient K3): „Zahodit“ po potvrzeném inzulinu (Ano / jinak / nevím) nezahodí inzulin – zapíše jídlo jako vynechané s inzulinem,
     takže platí pravidlo k vynechanému jídlu s inzulinem (I-MENE) a za B-HYPO.pripominka_min otázka „pod 4?“. Bez potvrzeného inzulinu se zápis jen zahodí. */
  mealCancel: function () {
    var m = S.meal;
    if (m && !m.retro && !NF.isSnack(m.meal) && NF.insulinInBody(m.bolus) && NF.MEALS.some(function (x) { return x[0] === m.meal; }) && NF.mealState(S, m.meal).state !== 'done') {
      var r = NF.skipMeal(S, m.meal, m.bolus); NF.noteRule(S, 'I-MENE', 'zahozeno');
      S.meal = null; S.page = 'today'; S.error = ''; toast(r.warn ? 'Zapsáno: jídlo vynechané, inzulin píchnutý. Pravidlo máte na Dnes.' : 'Zapsáno.'); return;
    }
    S.meal = null; S.page = 'today'; S.error = ''; toast('Zápis zahozen. Až se budete chystat jíst, klepněte znovu.');
  },
  mealStep: function (v) {
    if (!needMeal()) return; var prevStep = S.meal.step;
    var m = S.meal, n = Number(v);
    if (n === 2 && !m.bolus) return fail('Vyberte, jak to je s inzulinem.');
    if (n === 2 && m.step === 1 && !m.beforeAsked) return fail('Vyberte hodnotu ze senzoru, nebo „nemám“.');
    if (n === 3 && m.step === 1 && (!m.usual || !m.bolus || !m.beforeAsked || m.retro)) return fail('Vyberte hodnotu ze senzoru, nebo „nemám“.'); /* SCHEMA 91: z kroku 1 rovnou do kroku 3 jen s „Jako obvykle“ */
    if ([1, 2, 3].indexOf(n) < 0 || (NF.isSnack(m.meal) && n === 1)) return;
    if (n === 2 && m.retro && (m.at == null || NF.retroAt(S, m.at) == null)) return fail('Vyberte čas jídla.');
    if (n === 3 && (!m.foodId || !NF.foodById(S, m.foodId) || !m.portion)) return fail(!m.foodId || !NF.foodById(S, m.foodId) ? 'Vyberte jídlo.' : 'Vyberte porci.');
    m.step = n; S.error = '';
    if (n === 3 && m.retro) { var f2 = NF.foodById(S, m.foodId), ra = NF.adviseAfter(S, f2.id, m.meal, NF.retroAt(S, m.at), m.portion, m.bolus); NF.log(S, 'rada.zobrazena', f2.name + ' (zpětně)', { level: ra.conf.level, items: ra.items.map(function (i) { return { lever: i.lever, item: i.item }; }), blocked: ra.blocked.map(function (b) { return { lever: b.lever, reason: b.reason }; }), portion: m.portion, bolus: m.bolus, retro: true });
      if (prevStep !== 3) { if (ra.lowNow) NF.noteRule(S, 'I-HYPO', 'krok3'); else if (ra.lowRisk) NF.noteRule(S, 'I-MENE', 'krok3'); } return; } /* SCHEMA 87: bezpečnostní pravidlo v kroku 3 do stopy (jako pravidlo.vysoka) */
    if (n === 3) { var f0 = NF.foodById(S, m.foodId), res0 = NF.advise(S, f0.id, m.portion, m.bolus, m.meal); m.compact = {}; res0.items.forEach(function (it) { var last = NF.lastAnswers(S, f0.id, it.lever, 3); if (last) { m.compact[it.lever] = true; m.decisions[it.lever] = last.accepted; if (last.reason) m.reasons[it.lever] = last.reason; } }); } /* rutinní rada po 3 odpovědích sbalená, odpověď jako minule */
    if (n === 3) { var f = NF.foodById(S, m.foodId), res = NF.advise(S, f.id, m.portion, m.bolus, m.meal); NF.log(S, 'rada.zobrazena', f.name, { level: res.conf.level, items: res.items.map(function (i) { return { lever: i.lever, item: i.item }; }), blocked: res.blocked.map(function (b) { return { lever: b.lever, reason: b.reason }; }), bolus: m.bolus, portion: m.portion, gate: res.gate });
      if (prevStep !== 3) { if (res.lowNow) NF.noteRule(S, 'I-HYPO', 'krok3'); else if (m.portion === 'smaller' && !NF.isSnack(m.meal) && NF.insulinInBody(m.bolus)) NF.noteRule(S, 'I-MENE', 'krok3'); } } /* SCHEMA 87 */
  },
  mealFood: function (v) { if (!needMeal()) return; S.meal.usual = false; if (!NF.foodById(S, v)) { if (S.meal.step === 3) S.meal.step = 2; return fail('Vyberte jídlo.'); } S.meal.foodId = v; S.meal.newFood = null; S.meal.decisions = {}; S.meal.reasons = {}; },
  mealNewFood: function () { if (!needMeal()) return; S.meal.newFood = S.meal.newFood || {}; },
  mealTag: function (v) { if (!needMeal()) return; var p = String(v == null ? '' : v).split(':'); var nf = S.meal.newFood = S.meal.newFood || {}; nf[p[0]] = p[1]; if (p[0] === 'source' && !nf.prepTouched) nf.prep = NF.defaultPrep(p[1]); if (p[0] === 'prep') nf.prepTouched = true; nf.suggest = null; },
  mealLike: function (v) { if (!needMeal()) return; var nf = S.meal.newFood = S.meal.newFood || {}; nf.like = v; }, /* „Podobné jídlo: X?“ Ano = id, Ne = 'none' */
  mealUseExisting: function (v) { if (!needMeal()) return; S.meal.foodId = v; S.meal.newFood = null; var f = NF.foodById(S, v); if (f) S.meal.q = f.name; toast('Použijeme jídlo, které už máte v seznamu.'); },
  mealNotSame: function () { if (!needMeal()) return; var nf = S.meal.newFood = S.meal.newFood || {}; nf.force = true; nf.suggest = null; }, /* „Ne, je jiné“ → karta nového jídla */
  mealUnusual: function () { if (!needMeal()) return; S.meal.unusual = !S.meal.unusual; },
  mealBefore: function (v) { if (!needMeal()) return; var c = NF.chip(v), was = S.meal.beforeBound; S.meal.before = c.mmol; S.meal.beforeBound = c.bound; S.meal.beforeAsked = true; if (c.bound === 'over') NF.noteHigh(S, 'now'); if (c.bound === 'under' && was !== 'under') NF.noteRule(S, 'I-HYPO', 'now'); }, /* SCHEMA 87: „pod 4“ → pravidlo I-HYPO hned a zápis do stopy */ /* „nad 15“ → pravidlo I-VYSOKA hned a zápis do stopy (SCHEMA 74) */ /* čip po celých mmol/l: 'low' pod 4, 'high' nad 15 (hranice se značkou), 'none' nemám */
  mealPeak: function (v) { if (!needMeal()) return; var c = NF.chip(v); S.meal.peak = c.mmol; S.meal.peakBound = c.bound; S.meal.peakAsked = true; if (c.bound === 'under') { S.meal.low = true; S.meal.lowAsked = true; } if (c.bound === 'over') NF.noteHigh(S, 'peak'); }, /* u zpětného zápisu: nejvyšší po jídle; „pod 4“ = pokles */
  mealLow: function (v) { if (!needMeal()) return; S.meal.low = v === 'yes' ? true : v === 'no' ? false : null; S.meal.lowAsked = true; },
  mealExpand: function (v) { if (!needMeal()) return; S.meal.compact = S.meal.compact || {}; delete S.meal.compact[v]; },
  peakChip: function (v) { var p = String(v == null ? '' : v).split(':'); var c = NF.chip(p[1]); var r = NF.setManualPeak(S, p[0], c.mmol == null ? null : c.mmol, c.bound); if (!r.ok) return fail(r.error); if (S.vsPick) delete S.vsPick['peak-' + p[0]]; if (r.low) { S.lowNotice = { at: S.clock }; NF.noteRule(S, 'I-HYPO', 'nejvyssi', p[0]); } else if (!r.skipped) { if (c.bound === 'over') NF.noteHigh(S, 'peak', p[0]); toast('Díky. Výsledek je na Dnes.'); } },
  lowChip: function (v) { var p = String(v == null ? '' : v).split(':'); var r = NF.setManualLow(S, p[0], p[1]); if (!r.ok) return fail(r.error); if (p[1] === 'yes') { S.lowNotice = { at: S.clock }; NF.noteRule(S, 'I-HYPO', 'odpoved', p[0]); } if (S.meal) { S.meal.prevDone = S.meal.prevDone || []; if (S.meal.prevDone.indexOf(p[0]) < 0) S.meal.prevDone.push(p[0]); } },
  /* Posuvník v režimu potvrzení (SCHEMA 84, rozhodnutí 9): volba se jen podrží, uloží ji „Uložit“ (nejvyšší hodnota po minulém jídle). Hodnota jako čip: 4–15, low, high. */
  vsPick: function (v) {
    var i = String(v).lastIndexOf('|'); if (i < 1) return; var id = String(v).slice(0, i), t = String(v).slice(i + 1), c = NF.chip(t);
    if (!/^(peak|edit-[bp])-[\w-]+$/.test(id) || /* SCHEMA 91: posuvník opravy zápisu */ (t !== 'low' && t !== 'high' && (c.mmol == null || c.mmol < 4 || c.mmol > 15))) return;
    S.vsPick = S.vsPick || {}; S.vsPick[id] = t === 'low' ? 3 : t === 'high' ? 16 : Math.round(c.mmol);
  },
  /* „Změnit“ u sbaleného řádku minulého jídla: otázky se znovu otevřou (jen během rozpracovaného zápisu) */
  prevReopen: function (v) { if (!needMeal()) return; var ep = S.episodes.filter(function (x) { return x.id === v; })[0]; if (!ep || !ep.manual) return; ep.manual.peak = null; ep.manual.peakBound = null; ep.manual.lowAsked = false; ep.manual.low = null; ep.peak = NF.epPeak(S, ep); ep.rise = NF.epRise(S, ep); S.meal.prevDone = (S.meal.prevDone || []).filter(function (x) { return x !== v; }); if (S.vsPick) delete S.vsPick['peak-' + v]; },
  /* odpověď „ano, pod 4“ nezmizí v toastu: na Dnes zůstane karta s pravidlem, dokud ji pacient nepotvrdí (19. 10. 2026) */
  hypoAnswer: function (v) { var p = String(v == null ? '' : v).split(':'); var r = NF.answerHypoWatch(S, p[0], p[1]); if (!r.ok) return fail(r.error); if (r.low) { S.lowNotice = { at: S.clock }; NF.noteRule(S, 'I-HYPO', 'odpoved'); } else toast('Zapsáno.'); },
  lowNoticeSeen: function () { S.lowNotice = null; S.hypoRuleSeen = S.clock; }, /* C4 (32/01): pravidlo I-HYPO pacient viděl */
  hypoAlertSeen: function () { NF.hypoAlertSeen(S); }, /* karta po opakovaných poklesech se zavírá „Rozumím“ (SCHEMA 74) */
  pendingInsulin: function (v) { var p = String(v == null ? '' : v).split(':'); var r = NF.confirmPendingInsulin(S, p[0], p[1], p[1] === 'other' ? S.pendUnits : undefined); if (!r.ok) return fail(r.error); S.pendOther = null; S.pendUnits = null; toast(p[1] === 'as' || p[1] === 'other' ? 'Inzulin je zapsaný.' : 'Zapsáno.'); },
  /* SCHEMA 91 (pacient S3): „Píchnuto jinak“ u čekajícího inzulinu – posuvník jednotek jako v kroku 3 */
  pendingOther: function (v) { var ep = S.episodes.filter(function (x) { return x.id === v; })[0]; if (!ep || !ep.insulin || ep.insulin.confirmed !== 'pending') return; S.pendOther = S.pendOther === v ? null : v; S.pendUnits = ep.insulin.prescribed; },
  pendingUnitsSet: function (v) { var u = NF.int(v, NF.DOSE_RANGE[0], NF.DOSE_RANGE[1], null); if (u == null || !S.pendOther) return; S.pendUnits = u; },
  takeoverPage: function (v) { var trained = !!(S.training && S.training.result === 'done'); S.onboarding.page = trained ? NF.int(v, 1, 6, 1) : 1; }, /* bez zaučení dál než na první stránku nepustí (A26) */
  doseReadback: function (v) { NF.setReadback(S, v); }, /* SCHEMA 87: zpětné přečtení dávky do stopy */
  mealSaveFood: function () {
    if (!needMeal()) return; var nf = S.meal.newFood || {};
    var r = NF.addFood(S, S.meal.q, { like: nf.like || null }, { force: !!nf.force });
    if (!r.ok) return fail(r.error);
    if (r.suggest) { nf.suggest = r.suggest.id; return; } /* „Myslíte X?“ — rozhodne pacient */
    S.meal.foodId = r.food.id; S.meal.newFood = null; S.meal.q = r.food.name; toast('Jídlo je ve vašem seznamu. Příště ho najdete pod „naposledy“.');
  },
  mealPortion: function (v) { if (!needMeal()) return; if (!NF.PORTIONS.some(function (x) { return x[0] === v; })) return; if (v !== S.meal.portion) S.meal.usual = false; S.meal.portion = v; S.meal.decisions = {}; S.meal.reasons = {}; },
  mealDecide: function (v) { if (!needMeal()) return; var p = String(v == null ? '' : v).split(':'), m = S.meal, was = m.decisions[p[0]]; m.decisions[p[0]] = p[1] === 'yes'; if (p[1] === 'yes') delete m.reasons[p[0]];
    if (p[0] === 'portion' && p[1] !== 'yes' && was !== false && m.portion === 'smaller' && m.bolus === 'before' && !NF.isSnack(m.meal)) NF.noteRule(S, 'I-MENE', 'odmitnuta'); }, /* SCHEMA 87: pravidlo „Méně jídla“ se ukáže po odmítnuté radě k porci */
  mealReason: function (v) { if (!needMeal()) return; var p = String(v == null ? '' : v).split(':'); S.meal.reasons[p[0]] = p[1]; },
  mealNightLow: function () { if (!needMeal() || S.meal.meal !== 'breakfast') return; S.meal.nightLow = !S.meal.nightLow; }, /* noční pokles čipem u snídaně (bod 7, 1. 11. 2026) */
  mealFinishOther: function () { if (!needMeal()) return; S.meal.finishOther = !S.meal.finishOther; },
  mealFinish: function (v) {
    if (!needMeal()) return;
    var m = S.meal, p = NF.activePlan(S), f = NF.foodById(S, m.foodId);
    if (!p) return fail('Není plán.'); if (!f) return fail('Vyberte jídlo.');
    /* SCHEMA 90 (kód K14): uložit jde jen z kroku 3, s vybranou porcí, hodnotou ze senzoru (kromě svačiny a zpětného zápisu) a platnou odpovědí o inzulinu – dřív se neznámá hodnota uložila jako „podle plánu“ */
    if (m.step !== 3) return fail('Nejdřív projděte kroky zápisu.');
    if (!m.portion || !NF.PORTIONS.some(function (x) { return x[0] === m.portion; })) return fail('Vyberte porci.');
    if (!NF.isSnack(m.meal) && !m.beforeAsked && !m.retro) return fail('Vyberte hodnotu ze senzoru, nebo „nemám“.');
    if (['as', 'other', 'none', 'unknown', 'pending', 'snack'].indexOf(String(v)) < 0) return fail('Vyberte, jak to bylo s inzulinem.');
    if (m.retro && NF.retroAt(S, m.at) == null) return fail('Vyberte čas jídla.');
    if (v === 'other' && !NF.validDose(m.units)) return fail('Nastavte počet jednotek.');
    var res = m.retro ? NF.adviseAfter(S, f.id, m.meal, NF.retroAt(S, m.at), m.portion, m.bolus) : NF.advise(S, f.id, m.portion, m.bolus, m.meal);
    var advice = res.items.map(function (it) { var d = m.decisions[it.lever]; return { lever: it.lever, item: it.item, accepted: d === true ? true : d === false ? false : null, reason: m.reasons[it.lever] || null }; });
    var confirmed = String(v);
    var units = confirmed === 'as' ? p.doses[m.meal].units : confirmed === 'other' ? m.units : null;
    var at = m.retro ? NF.retroAt(S, m.at) : S.clock;
    var off0 = NF.int(m.offset, -NF.INS_AGO_MAX, 15, 0), time = confirmed === 'none' || confirmed === 'unknown' || confirmed === 'snack' || confirmed === 'pending' ? null : NF.fmtTime(NF.addMin(at, off0));
    var draft = { meal: m.meal, foodId: f.id, portion: m.portion, bolusState: m.retro ? 'retro' : m.bolus, advice: advice, insulin: { confirmed: confirmed, units: units, time: time }, at: at, retro: !!m.retro, unusual: !!m.unusual, nightLow: m.meal === 'breakfast' && m.nightLow === true };
    draft.before = m.before; draft.beforeBound = m.beforeBound || null; draft.peak = m.retro ? m.peak : null; draft.peakBound = m.retro ? (m.peakBound || null) : null; draft.low = m.retro ? m.low : null; /* opsané hodnoty ze senzoru (Z-GLUKOZA); u zpětného zápisu i nejvyšší a „pod 4“; čipy „pod 4“ / „nad 15“ jako hranice se značkou; průběh přijde až z exportu */
    draft.points = []; draft.importedAt = null;
    var r = NF.saveEpisode(S, draft); if (!r.ok) return fail(r.error);
    S.meal = null; S.page = 'today'; NF.flash = { food: f.id };
    var th = confirmed === 'pending' ? 'Jídlo je zapsané. Až si píchnete, potvrďte to na Dnes.' : NF.thanks(S, r.episode);
    toast(th || (m.retro ? f.name + ' je zapsané k ' + NF.fmtTime(at) + '.' : f.name + ' je zapsané.'));
  },
  resultSeen: function (v) { NF.markResultSeen(S, v); },
  /* ruční nejvyšší hodnota do 2 h, otázka při rozchodu zápisů, nahrání exportu ze senzoru */
  peakSave: function (v) { var r = NF.setManualPeak(S, v, (S.form || {})['peak_' + v]); if (!r.ok) return fail(r.error); if (S.form) delete S.form['peak_' + v]; toast('Díky. Hned ukážeme, jak to dopadlo.'); },
  peakSkip: function (v) { var r = NF.setManualPeak(S, v, null); if (!r.ok) return fail(r.error); toast('V pořádku. Hodnoty doplní export ze senzoru; do té doby se zápis do učení nepočítá.'); },
  foodDiverge: function (v) { var p = String(v == null ? '' : v).split(':'); var r = NF.answerDivergence(S, p[0], p[1]); if (!r.ok) return fail(r.error); toast(r.text); },
  importText: function (v) {
    var rows = NF.parseSensorCsv(v); var r = NF.importReadings(S, rows); if (!r.ok) return fail(r.error);
    toast(r.text); /* jedna věta: „Export nahrán a převeden · doplněno N jídel a N nocí“ (SCHEMA 74) */
  },
  fixInsulinOpen: function (v) { S.fixInsulin = S.fixInsulin === v ? null : v; S.fixInsulinOther = false; S.fixInsulinUnits = null; S.fixInsulinPick = null; },
  /* volba opravy se jen vybere; uloží ji samostatné „Uložit opravu“ (LF-23, 19. 10. 2026) */
  fixInsulinPick: function (v) { var p = String(v == null ? '' : v).split(':'); if (['as', 'other', 'none', 'unknown'].indexOf(p[1]) < 0) return; S.fixInsulinPick = p[1]; S.fixInsulinOther = p[1] === 'other'; if (p[1] === 'other' && S.fixInsulinUnits == null) { var ep = S.episodes.filter(function (x) { return x.id === p[0]; })[0]; S.fixInsulinUnits = ep ? ep.insulin.prescribed : 1; } },
  fixInsulinOther: function (v) { S.fixInsulinOther = !S.fixInsulinOther; S.fixInsulinPick = S.fixInsulinOther ? 'other' : null; var ep = S.episodes.filter(function (x) { return x.id === v; })[0]; S.fixInsulinUnits = ep ? ep.insulin.prescribed : 1; },
  fixInsulinUnits: function (v) { var d = NF.int(v, -60, 60, null); if (d == null || !S.fixInsulin) return; S.fixInsulinUnits = NF.clampDose((Number.isInteger(S.fixInsulinUnits) ? S.fixInsulinUnits : 1) + d); },
  fixInsulinUnitsSet: function (v) { var u = NF.int(v, NF.DOSE_RANGE[0], NF.DOSE_RANGE[1], null); if (u == null || !S.fixInsulin) return; S.fixInsulinUnits = u; S.fixInsulinPick = 'other'; S.fixInsulinOther = true; }, /* SCHEMA 87: posuvník */
  fixInsulin: function (v) {
    var p = String(v == null ? '' : v).split(':'); var r = NF.correctInsulin(S, p[0], p[1], p[1] === 'other' ? S.fixInsulinUnits : undefined); if (!r.ok) return fail(r.error);
    S.fixInsulin = null; S.fixInsulinOther = false; S.fixInsulinPick = null; toast('Inzulin je opravený. Zápis se učí dál, do návrhu k dávce už nejde.');
  },
  /* SCHEMA 90 (rozhodnutí vlastníka 11. 11. 2026, bod 7): oprava a smazání uloženého zápisu do NF.EDIT_WINDOW_H (24) h; jádro zapíše do stopy, zápis pak není čistý. */
  mealEditOpen: function (v) { var ep = S.episodes.filter(function (x) { return x.id === v; })[0]; if (!ep || !NF.canEditEpisode(S, ep)) return fail('Zápis lze opravit jen do ' + NF.EDIT_WINDOW_H + ' hodin po uložení.'); S.editEp = S.editEp && S.editEp.id === v ? null : { id: v, del: false }; S.fixInsulin = null; },
  mealEditPortion: function (v) { var p = String(v == null ? '' : v).split(':'); var r = NF.editEpisode(S, p[0], { portion: p[1] }); if (!r.ok) return fail(r.error); if (!r.unchanged) { S.editEp = null; toast('Zápis je opravený. Do hodnocení jídla se počítá dál, do návrhu k dávce už ne.'); } },
  /* SCHEMA 91 (bod 7; 36/10 „Zbývá“ 2): oprava jídla a hodnot v uloženém zápisu – jádro NF.editEpisode zapíše do stopy a zápis pak není čistý */
  mealEditSub: function (v) { var p = String(v == null ? '' : v).split(':'); if (!S.editEp || S.editEp.id !== p[0] || ['food', 'before', 'peak'].indexOf(p[1]) < 0) return; S.editEp.sub = S.editEp.sub === p[1] ? null : p[1]; S.editEp.del = false; if (S.form) delete S.form.editq; },
  mealEditFood: function (v) { var i = String(v == null ? '' : v).indexOf(':'); if (i < 1) return; var id = String(v).slice(0, i), fid = String(v).slice(i + 1); var r = NF.editEpisode(S, id, { foodId: fid }); if (!r.ok) return fail(r.error); if (S.form) delete S.form.editq; if (!r.unchanged) { S.editEp = null; toast('Zápis je opravený. Do hodnocení jídla se počítá dál, do návrhu k dávce už ne.'); } },
  mealEditValue: function (v) { var p = String(v == null ? '' : v).split(':'); if (p.length < 3 || ['before', 'peak'].indexOf(p[1]) < 0) return; var ch = {}; ch[p[1]] = p[2] === 'none' ? 'none' : p[2]; var r = NF.editEpisode(S, p[0], ch); if (!r.ok) return fail(r.error); if (S.vsPick) { delete S.vsPick['edit-b-' + p[0]]; delete S.vsPick['edit-p-' + p[0]]; } if (!r.unchanged) { S.editEp = null; toast('Zápis je opravený. Do hodnocení jídla se počítá dál, do návrhu k dávce už ne.'); } },
  mealEditDeleteAsk: function (v) { if (!S.editEp || S.editEp.id !== v) return; S.editEp.del = !S.editEp.del; },
  mealEditDelete: function (v) { if (!S.editEp || S.editEp.id !== v || !S.editEp.del) return; var r = NF.deleteEpisode(S, v); if (!r.ok) return fail(r.error); S.editEp = null; toast('Zápis je smazaný.'); },
  openFood: function (v) { S.page = 'food'; S.foodsSeg = 'all'; S.foodOpen = v; },
  milestoneClose: function (v) { NF.closeMilestone(S, v); },
  weekClose: function (v) { if (typeof v !== 'string' || !/^[A-Z][A-Za-z0-9-]*:\d+$/.test(v)) return; NF.closeWeek(S, v); }, /* K14 (SCHEMA 90): jen platné id týdne („P1:3“) */
  foodsSeg: function (v) { S.foodsSeg = v; S.foodOpen = null; },
  foodOpen: function (v) { S.page = 'food'; S.foodOpen = v; }, /* detail jídla je samostatná obrazovka (20. 10. 2026) */
  foodBack: function () { S.page = 'foods'; S.foodOpen = null; },
  previewTile: function (v) { S.previewTile = S.previewTile === v ? null : v; },
  toggleQuestion: function (v) { if (typeof v !== 'string' || !v.trim() || v.length > 300) return; NF.toggleQuestion(S, v); }, /* SCHEMA 87: otázky na lékaře do stopy; K14 (SCHEMA 90): jen neprázdný text rozumné délky (navržené otázky skládá obrazovka) */
  saveQuestion: function () {
    var r = NF.saveQuestion(S, (S.form && S.form.question) || ''); if (!r.ok) return fail(r.error);
    S.form.question = ''; toast('Otázka je uložená. Lékař ji uvidí na kontrole.');
  },

  /* lékař: kontrola */
  startReview: function () { var r = NF.startReview(S, catalog()); if (!r.ok) return fail(r.error); S.page = 'review'; },
  reviewStep: function (v) {
    var r = S.review, n = NF.int(v, 1, 4, null); if (!r || n == null) return;
    if (n === 3 && !NF.reviewComplete(S)) return fail('Nejdřív rozhodněte všechny návrhy.');
    if (n === 4 && !S.review.planIssued) return fail('Nejdřív vydejte plán.');
    r.step = n; S.error = '';
  },
  reviewTile: function (v) { if (!S.review) return; S.review.tile = S.review.tile === v ? null : v; },
  reviewMeds: function (v) { if (reviewLocked()) return; var r = NF.setReviewMeds(S, v); if (!r.ok) return fail('Vyberte, zda pacient začal brát jiný lék na diabetes.'); },
  reviewHealth: function (v) { if (reviewLocked()) return; if (!NF.setReviewHealth(S, v).ok) return fail('Vyberte, zda se změnil zdravotní stav.'); },
  /* SCHEMA 84 (bod 1): volič u každé dávky v kroku 3 – změna vytvoří nebo přepíše rozhodnutí u karty / řádku dané dávky */
  revDose: function (v) { if (reviewLocked()) return; var p = String(v).split(':'), d = NF.int(p[1], -60, 60, null); if (d == null || !S.review.newDoses[p[0]]) return; var r = NF.stepPlanDose(S, p[0], d); if (!r.ok) return fail(r.error || 'Dávku nejde nastavit.'); },
  revDoseSet: function (v) { if (reviewLocked()) return; var p = String(v).split(':'); var r = NF.setPlanDose(S, p[0], NF.int(p[1], NF.DOSE_RANGE[0], NF.DOSE_RANGE[1], null)); if (!r.ok) return fail(r.error || 'Vyberte dávku.'); },
  /* SCHEMA 84 (bod 6): návyky přepínačem a platnost plánu voličem v kroku 3 */
  revHabit: function (v) { if (reviewLocked()) return; NF.toggleReviewHabit(S, v); },
  revValidity: function (v) { if (reviewLocked()) return; if (!NF.setReviewValidity(S, NF.int(v, 1, 365, null)).ok) return fail('Vyberte platnost plánu.'); },
  propVerify: function (v) { if (reviewLocked()) return; var p = String(v).split(':'); if (!S.review.proposals.some(function (x) { return x.id === p[0]; }) || NF.int(p[1], 0, 20, null) == null || ['yes', 'no'].indexOf(p[2]) < 0) return; NF.setVerify(S, p[0], Number(p[1]), p[2] === 'yes'); }, /* SCHEMA 87: ověřovací bod do stopy */
  propVerifyAll: function (v) { if (reviewLocked()) return; NF.verifyAll(S, v); NF.focusSel = '.prop.current h3'; },
  propKeepAll: function () { if (reviewLocked()) return; if (S.role !== 'doctor') return fail('Rozhoduje lékař.'); NF.keepAll(S); },
  propSingle: function (v) { if (!S.review || !S.review.proposals.some(function (x) { return x.id === v; })) return; S.review.single = S.review.single || {}; S.review.single[v] = true; },
  propSwapTo: function (v) { if (!S.review) return; var p = String(v).split(':'), pr = S.review.proposals.filter(function (x) { return x.id === p[0]; })[0]; if (!pr || (p[1] !== 'none' && NF.swapOptions(S, pr).indexOf(p[1]) < 0)) return; S.review.swapTo = S.review.swapTo || {}; S.review.swapTo[p[0]] = p[1]; }, /* náhradou jen rada, která pacientovi nechodila (A27) */
  acuteOpen: function () { if (!drawer) drawerOpener = global.document && global.document.activeElement; drawer = 'acute'; }, /* Esc vrátí fokus na otvírající tlačítko (04 #6) */
  /* Bezpečí z kroků jídla jedním klepnutím: list přes obrazovku, rozpracovaný zápis zůstává (LF-11, 19. 10. 2026). */
  supportOpen: function () { if (S.role !== 'patient') return; drawer = null; S.page = 'support'; S.error = ''; S.support.sent = false; },
  supportIssue: function (v) { if (!NF.SUPPORT_ISSUES.some(function (x) { return x[0] === v; })) return; S.support.issue = v; S.support.sent = false; },
  supportSend: function () { var rs = NF.supportSent(S); if (!rs.ok) return fail(rs.error); /* SCHEMA 87: odeslání do stopy */ toast('Zpráva je odeslaná technické podpoře.' + (V.demoText('podpora') ? ' ' + V.demoText('podpora') : '')); }, /* B3 (31/03): věta o ukázce ze slotu */
  safetyOpen: function () { if (!drawer) drawerOpener = global.document && global.document.activeElement; drawer = 'safety'; },
  /* SCHEMA 84 (rozhodnutí vlastníka 4. 11. 2026, bod 1): volič „jiná dávka“ u každé dávky – i u větve „ponechat“ a u řádků „Dávky bez návrhu“ (pr.row) */
  propUnits: function (v) {
    if (reviewLocked()) return; var p = String(v).split(':'); var pr = S.review.proposals.filter(function (x) { return x.id === p[0]; })[0]; if (!pr || !pr.dose) return;
    if (!pr.row) { var br = NF.proposalBranch(S, pr); if (!br || br.action === 'wait') return fail('Nejdřív dokončete ověření; dávku jde nastavit, až postup ukáže větev.'); }
    var d = NF.int(p[1], -60, 60, null); if (d == null) return;
    NF.setReviewDose(S, pr.dose, NF.clampDose(S.review.newDoses[pr.dose].units + d));
  },
  propDoseSet: function (v) {
    if (reviewLocked()) return; var p = String(v).split(':'), pr = S.review.proposals.filter(function (x) { return x.id === p[0]; })[0]; if (!pr || !pr.dose) return;
    if (!pr.row) { var br = NF.proposalBranch(S, pr); if (!br || br.action === 'wait') return fail('Nejdřív dokončete ověření.'); }
    if (!NF.setReviewDose(S, pr.dose, NF.int(p[1], NF.DOSE_RANGE[0], NF.DOSE_RANGE[1], null)).ok) return fail('Vyberte dávku.');
  },
  propOther: function (v) { if (!S.review) return; S.review.other = S.review.other === v ? null : v; },
  propDecide: function (v) {
    if (reviewLocked()) return;
    var p = String(v == null ? '' : v).split(':'), pr = S.review.proposals.filter(function (x) { return x.id === p[0]; })[0]; if (!pr) return fail('Návrh nenalezen.');
    if (['agree', 'keep', 'reject', 'other'].indexOf(p[1]) < 0) return;
    var branch = NF.proposalBranch(S, pr), waiting = !branch || branch.action === 'wait';
    /* „Ponechat beze změny“ a „Zamítnout s důvodem“ nepotřebují dokončené ověření (02 #2, 23. 10. 2026); větev pak není (null). Ověření chce jen „Souhlasím“. */
    if (waiting && p[1] !== 'keep' && p[1] !== 'reject') return fail('Nejdřív u každého bodu označte, zda sedí, nebo nesedí.');
    if (waiting) branch = { action: null };
    /* SCHEMA 84 (bod 1): „Jiná dávka“ – jednotky z voliče; zapíše se jako rozhodnuto jinak než postup (+ proti datům při blokujícím poklesu, jádro) */
    if (p[1] === 'other') {
      if (pr.kind !== 'dose') return;
      var ro = NF.decideOtherDose(S, pr.id, S.review.newDoses[pr.dose].units, pr.row ? null : (branch.action || null)); if (!ro.ok) return fail(ro.error);
      S.review.other = null; S.error = ''; NF.focusSel = pr.row ? '.prop.rows h3' : '.prop.current h3'; return;
    }
    var dec = { choice: p[1], branch: branch.action }; /* A4 (31/03): bez volného komentáře; důvod zamítnutí je volbou */
    if (branch.action === 'swap' && p[1] === 'agree') { var st = S.review.swapTo && S.review.swapTo[pr.id], opts = NF.swapOptions(S, pr); dec.swapTo = st === 'none' ? null : (st && opts.indexOf(st) >= 0 ? st : opts[0] || null); }
    if (p[1] === 'agree' && pr.kind === 'dose' && (branch.action === 'up' || branch.action === 'down' || branch.action === 'free') && S.review.newDoses[pr.dose].units === NF.activePlan(S).doses[pr.dose].units) return fail('Nastavte novou dávku voličem.');
    if (p[1] === 'agree' && pr.kind === 'dose') {
      dec.units = S.review.newDoses[pr.dose].units;
      var cur = NF.activePlan(S).doses[pr.dose].units;
      /* Změna proti směru větve není souhlas s postupem; zapíše se jako „rozhodnuto jinak“ (6. 10. 2026). */
      if ((branch.action === 'up' && dec.units < cur) || (branch.action === 'down' && dec.units > cur)) { dec.choice = 'other'; dec.againstBranch = true; }
    }
    if (p[1] === 'reject' && !p[2]) return fail('Vyberte důvod zamítnutí.');
    if (p[2]) dec.reason = p[2];
    var r = NF.decideProposal(S, pr.id, dec); if (!r.ok) return fail(r.error);
    S.review.other = null; S.error = ''; NF.focusSel = '.prop.current h3';
  },
  propReopen: function (v) {
    if (reviewLocked()) return; delete S.review.decisions[v]; S.review.index = S.review.proposals.findIndex(function (x) { return x.id === v; });
    var pr = S.review.proposals[S.review.index], p0 = NF.activePlan(S); if (pr && pr.dose && p0 && p0.doses[pr.dose]) S.review.newDoses[pr.dose].units = p0.doses[pr.dose].units; /* znovu otevřený návrh: volič zpět na dávku plánu (nález 1) */
  },
  issueP2: function () {
    if (S.role !== 'doctor') return fail('Plán vydává lékař.');
    var res = NF.issueFromReview(S, catalog()); if (!res.ok) return fail(res.error);
    toast('Plán ' + res.plan.id + ' je vydaný. Předejte ho pacientovi.');
  },

  /* registr */
  regFilter: function (v) { var p = String(v).split(':'); if (['cat', 'status', 'touch'].indexOf(p[0]) < 0) return; S.reg = S.reg || {}; S.reg.keep = null; S.reg[p[0]] = S.reg[p[0]] === p[1] ? null : p[1]; },
  /* Poznámka se ukládá sama (SCHEMA 83): po 1 s bez psaní (data-autosave) a při opuštění pole (data-change); stav položky se nemění a nepočítá se jako rozhodnutí (R14).
     Pole se ukazuje až po rozhodnutí, takže poznámka bez rozhodnutí nevzniká. */
  regNote: function (v) {
    var id = v || (S.reg && S.reg.open), r = id && NF.item(S, id); if (!r) return;
    if (noteTimer) { if (global.clearTimeout) global.clearTimeout(noteTimer); noteTimer = null; }
    var key = 'note_' + id, c = S.form && S.form[key] != null ? String(S.form[key]) : null;
    if (c === null || c === NF.itemNote(S, id)) return;
    var res = NF.decideItem(S, id, null, c, { note: true }); if (!res.ok) return fail(res.error);
    delete S.form[key];
  },
  regOpen: function (v) { if (!NF.item(S, v)) return; S.reg = S.reg || {}; S.reg.open = v; S.reg.confirmReject = null; NF.scrollTarget = '.reg-side'; },
  /* Dvě rozhodnutí (27. 10. 2026): Schválit / Zamítnout s platnou poznámkou z pole; bezpečnostní položka se před zamítnutím ptá. */
  regDecide: function (v) {
    var id = S.reg && S.reg.open; if (!id) return;
    if (v !== 'approved' && v !== 'rejected') return;
    if (v === 'rejected' && V.SAFETY_ITEMS && V.SAFETY_ITEMS[id] && S.reg.confirmReject !== id) { S.reg.confirmReject = id; return; } /* bezpečnostní položka: nejdřív věta, co přestane fungovat */
    S.reg.confirmReject = null;
    var key = 'note_' + id, note = S.form && S.form[key] != null ? String(S.form[key]) : NF.itemNote(S, id);
    var r = NF.decideItem(S, id, v, note);
    if (!r.ok) return fail(r.error);
    if (S.form) delete S.form[key];
    S.reg.keep = id;
    toast('Rozhodnutí je uložené a hned platí v aplikaci.');
  },
  regConfirmCancel: function () { if (S.reg) S.reg.confirmReject = null; },
  /* Podnět z provozu (A33, O6): vypnout položku hned, pak nová verze ke schválení. */
  impulseOff: function (v) {
    var im = V.impulseOf && V.impulseOf(S); if (!im || im.item.id !== v) return;
    var r = modelStep(function () { return NF.decideItem(S, v, 'rejected', 'Vypnuto po podnětu z provozu.'); }); if (!r.ok) return fail(r.error);
    toast('Návrh vypnutí je zapsaný a výrobce položku vypnul. Pacientům se teď nepoužívá.'); /* SCHEMA 87: garant navrhuje, výrobce provádí – v ukázce výrobce provede vypnutí hned (modelový krok), 15 odst. 13 */
  },
  impulseVersion: function (v) {
    var im = V.impulseOf && V.impulseOf(S); if (!im || im.item.id !== v) return;
    var r = modelStep(function () { return NF.newVersion(S, v, im.newText ? { text: im.newText } : {}, 'Podnět z provozu: ' + im.text); }); if (!r.ok) return fail(r.error);
    S.reg = S.reg || {}; S.reg.open = v; toast('Výrobce založil podle návrhu novou verzi ' + r.item.version + '. Čeká na vaše schválení.');
  },
  traceOpen: function (v) { S.traceOpen = S.traceOpen === v ? null : v; },
  traceWho: function (v) { if (!NF.TRACE_WHO || !NF.TRACE_WHO.some(function (x) { return x[0] === v; })) return; S.traceWho = v; S.traceLimit = 80; }, /* filtr stopy podle toho, kdo jednal (02 #9) */
  traceMore: function () { S.traceLimit = (S.traceLimit || 80) + 80; }
};
NF.actions = A;

function act(name, value) {
  var fn = A[name] || (NF.demoActions && NF.demoActions[name]);
  if (!fn) return;
  if (locked && name !== 'useHere') return; /* B7: zamčené okno nic neukládá */
  S.error = ''; NF.flash = null; /* jednorázový příznak pro animaci (není součást stavu ani stopy) */
  NF.tick(S); /* A3: skutečný čas před akcí (v ukázce řídí hodiny příběh) */
  try { fn(value); NF.tick(S); }
  catch (err) {
    /* Výjimka v akci nesmí shodit aplikaci: zapíše se do stopy a zobrazí jako hláška (C4, 6. 10. 2026). */
    S.error = 'Tohle se nepovedlo. Zkuste to znovu, nebo se vraťte na Dnes.';
    try { NF.log(S, 'chyba.akce', name); } catch (e2) { } /* do stopy jen název akce, ne interní text výjimky (robustnost #13) */
  }
  /* SCHEMA 90 (K1): ukládá a synchronizační vrstvě hlásí jen akce; „Začít znovu“ nese příznak reset (čistý stav se posílá jen na výslovnou žádost). */
  NF.save(S, { action: name, reset: name === 'startOver' });
  safeRender(name);
}
/* SCHEMA 90 (K3): pád vykreslení nikdy neuloží čistý stav přes data pacienta. Nejdřív návrat na výchozí obrazovku (mění se jen pohled, ukládá se jen v zařízení);
   když nejde ani ta, uloží se záloha pod vlastním klíčem a ukáže nouzová obrazovka s „Začít znovu“ – data zůstávají v úložišti beze změny. */
function safeRender(name) {
  try { NF.render(); return true; }
  catch (err) {
    try { NF.log(S, 'chyba.vykresleni', name || 'vykresleni'); } catch (e3) { }
    try {
      S.meal = null; S.ask = null; S.page = S.role === 'doctor' ? 'enroll' : S.role === 'nurse' ? 'training' : 'today'; S.error = 'Obrazovku se nepodařilo zobrazit; vrátili jsme vás na začátek.';
      NF.save(S, { local: true }); NF.render(); return true;
    } catch (err2) {
      try { NF.backup(S, 'vykresleni'); } catch (e4) { }
      renderFatal(); return false;
    }
  }
}
/* Nouzová obrazovka: aplikace se nezobrazila; jediná akce je čistý start. SCHEMA 90 (K3): data i záloha zůstávají v zařízení, nic se nesmazalo. */
function renderFatal() {
  var root = global.document && global.document.getElementById('app'); if (!root) return;
  root.innerHTML = '<main id="main"><div class="error" role="alert">NutriFee se nepodařilo zobrazit. Uložená data zůstávají v zařízení a máme jejich zálohu.</div><div class="actions"><button type="button" class="btn primary" data-action="startOver">Začít znovu</button></div></main>';
}

/* ---------- posuvník hodnoty (rozhodnutí vlastníka 5. 11. 2026, bod 9) ----------
   Nativní input type=range nese tažení, klepnutí na dráhu, šipky a přístupnost; vykreslený jezdec a hodnota se při tažení jen přesouvají (náhled),
   uloží se až při puštění (change) nebo klávesou – jedna akce jádra se stejnou hodnotou jako dřív klepnutí do mřížky. */
function vsIsInput(el) { return !!(el && el.classList && el.classList.contains('vs-input')); }
function vsCfg(w) {
  var d = w.dataset, n = function (x) { return x == null || x === '' ? null : Number(x); };
  return { kind: d.vsKind || 'plain', min: n(d.vsMin), max: n(d.vsMax), step: n(d.vsStep) || 1, dec: n(d.vsDec) || 0, lo: n(d.vsLo), hi: n(d.vsHi), goal: n(d.vsGoal), better: d.vsBetter || 'min' };
}
function vsPreview(inp) {
  var w = inp.closest && inp.closest('.vslider'); if (!w || !V.vsState) return;
  try {
    var c = vsCfg(w), v = Number(inp.value), lo = c.kind === 'glu' ? c.min - c.step : c.min, hi = c.kind === 'glu' ? c.max + c.step : c.max, st = V.vsState(c, v);
    var tr = w.querySelector('.vs-track'); if (tr) tr.style.setProperty('--vs-f', String(Math.max(0, Math.min(1, (v - lo) / (hi - lo)))));
    w.setAttribute('data-zone', st.zone); w.classList.remove('unset');
    var b = w.querySelector('.vs-val b'); if (b) b.textContent = st.text;
    var sw = w.querySelector('.vs-state'); if (sw) sw.innerHTML = st.word ? NF.icon(st.icon || { ok: 'check', warn: 'arrow-up', low: 'alert' }[st.zone] || 'check') + '<span>' + e(st.word) + '</span>' : '';
  } catch (err) { }
}
function vsCommit(inp) {
  var w = inp.closest && inp.closest('.vslider'); if (!w || !V.vsState) return;
  var st = V.vsState(vsCfg(w), Number(inp.value)); if (st.token == null) return;
  act(inp.getAttribute('data-vs-action'), (inp.getAttribute('data-vs-prefix') || '') + st.token);
}

/* ---------- události ---------- */
var noteTimer = null; NF.NOTE_IDLE_MS = 1000;
if (global.document && global.document.addEventListener) {
  global.document.addEventListener('click', function (ev) {
    clearToast(); /* B9: klepnutí kamkoli zavře oznámení (nové oznámení akce se ukáže po vykreslení) */
    if (vsIsInput(ev.target)) { if (ev.target.hasAttribute('data-vs-unset') && !ev.target.disabled) vsCommit(ev.target); return; } /* klepnutí přímo na naznačenou polohu nezmění hodnotu, a tak nevyvolá change */
    var b = ev.target.closest && ev.target.closest('[data-action]');
    if (!b || b.disabled) return;
    /* Okamžik potvrzení po uložení jídla (19. 10. 2026): tlačítko se na chvíli promění ve fajfku „Uloženo“, pak návrat na Dnes.
       Jen v prohlížeči při klepnutí; průchod a testy volají akci přímo. */
    if (b.dataset.action === 'mealFinish' && b.classList && b.classList.contains('primary') && global.setTimeout && !b.classList.contains('done')) {
      var val = b.dataset.value; b.classList.add('done'); b.disabled = true; b.innerHTML = NF.icon('check') + ' Uloženo';
      var ms = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches ? 350 : 600;
      global.setTimeout(function () { act('mealFinish', val); }, ms); return;
    }
    act(b.dataset.action, b.dataset.value);
  });
  global.document.addEventListener('input', function (ev) {
    if (vsIsInput(ev.target)) { vsPreview(ev.target); return; }
    var k = ev.target.dataset && ev.target.dataset.bind; if (!k || ev.target.type === 'checkbox') return;
    bind(k, ev.target.value); NF.save(S, { local: true }); /* SCHEMA 90 (K1): psaní do pole je pohled – ukládá se jen v zařízení, háček se nevolá */
    if (k === 'meal.q') NF.render();
    /* SCHEMA 83: poznámka k položce registru se uloží po 1 s bez psaní; vykreslí se morphem, pole s kurzorem zůstane, jak je */
    var au = ev.target.dataset.autosave; if (au && global.setTimeout) {
      var val = ev.target.dataset.value, line = global.document.querySelector && global.document.querySelector('[data-regsaved="' + val + '"]'); if (line) line.textContent = 'Ukládá se…';
      if (noteTimer && global.clearTimeout) global.clearTimeout(noteTimer);
      noteTimer = global.setTimeout(function () { noteTimer = null; act(au, val); }, NF.NOTE_IDLE_MS);
    }
  });
  global.document.addEventListener('change', function (ev) {
    if (vsIsInput(ev.target)) { vsCommit(ev.target); return; }
    if (ev.target.type === 'file' && ev.target.dataset && ev.target.dataset.action === 'importFile') { /* export z aplikace senzoru: čte se jen v telefonu, nikam se neposílá */
      var f = ev.target.files && ev.target.files[0]; if (!f || !global.FileReader) return;
      var rd = new global.FileReader(); rd.onload = function () { act('importText', String(rd.result || '')); }; rd.readAsText(f); return;
    }
    var k = ev.target.dataset && ev.target.dataset.bind, c = ev.target.dataset && ev.target.dataset.change; if (!k && !c) return;
    if (k) { bind(k, ev.target.type === 'checkbox' ? ev.target.checked : ev.target.value); NF.save(S, { local: true }); }
    if (c) act(c, ev.target.dataset.value); else NF.render(); /* data-change: akce při opuštění pole (poznámka k položce registru se uloží sama) */
  });
  global.document.addEventListener('keydown', function (ev) {
    if (vsIsInput(ev.target) && (ev.key === 'Enter' || ev.key === ' ') && ev.target.hasAttribute('data-vs-unset') && !ev.target.disabled) { ev.preventDefault(); vsCommit(ev.target); return; } /* bez volby: Enter vybere naznačenou hodnotu */
    if (ev.key === 'Escape' && drawer) { drawer = null; renderDrawer(); return; }
    /* Tab v dialogu krouží mezi jeho prvky, nejde „nikam“ na body (04 #6). */
    if (ev.key === 'Tab' && drawer) {
      try {
        var panel = global.document.querySelector('#overlay .drawerpanel'); if (!panel) return;
        var f = Array.prototype.filter.call(panel.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'), function (x) { return !x.disabled && x.offsetParent !== null; });
        if (!f.length) return; var first = f[0], last = f[f.length - 1], a = global.document.activeElement;
        if (ev.shiftKey && (a === first || !panel.contains(a))) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && (a === last || !panel.contains(a))) { ev.preventDefault(); first.focus(); }
      } catch (err) { }
    }
  });
}

/* A3, B1, B7, C8 (31/03): po načtení všech skriptů. Bez prezentační vrstvy (produkční sestavení) má aplikace vlastní klíč úložiště, skutečný čas
   (obnovuje se před každou akcí a jednou za minutu) a roli podle adresy zařízení: ?role=lekar, ?role=sestra; bez parametru (i ?role=pacient) pacient.
   S prezentační vrstvou (NF.clockModel) řídí hodiny, role i úložiště ukázka a boot nic nemění.
   SCHEMA 90 (K1, K3, K9): boot ani minutový tik synchronizaci nic nehlásí – role je pohled zařízení (uloží se jen v zařízení), tik jen překreslí;
   vykreslení je obalené jako u akcí (pád neuloží čistý stav přes data). Výchozí role bez parametru je pacient. */
NF.boot = function () {
  if (NF.clockModel || NF.booted) return; NF.booted = true;
  if (NF.STORAGE !== NF.STORAGE_APP) { NF.STORAGE = NF.STORAGE_APP; NF.migrated = null; S = NF.load(); }
  var q = ''; try { q = String((global.location && global.location.search) || ''); } catch (err) { q = ''; }
  var m = q.match(/[?&]role=(pacient|lekar|sestra)(?:&|$)/), map = { pacient: 'patient', lekar: 'doctor', sestra: 'nurse' }, want = m ? map[m[1]] : 'patient';
  if (want !== S.role) { A.role(want); NF.save(S, { local: true }); }
  NF.tick(S); safeRender('boot');
  if (global.setInterval) global.setInterval(function () { if (locked) return; var c = S.clock; NF.tick(S); if (String(c).slice(0, 16) !== String(S.clock).slice(0, 16)) safeRender('tik'); }, 60000);
  if (global.addEventListener) global.addEventListener('storage', function (ev) { if (NF.clockModel || !ev || ev.key !== NF.STORAGE || locked) return; locked = true; NF.render(); });
};
if (global.document && global.document.addEventListener) global.document.addEventListener('DOMContentLoaded', function () { NF.boot(); });
NF.getState = function () { return S; };
/* setState: stav zvenku (přehrání kapitoly ukázky, sloučená vzdálená verze NF.mergeRemote) – uloží se jen v zařízení, háček se nevolá (žádná ozvěna zpět na server). */
NF.setState = function (next) { S = next; NF.save(S, { local: true }); safeRender('setState'); };
NF.act = act;
NF.bindValue = function (k, v) { bind(k, v); NF.save(S, { local: true }); };
NF.reset = function () { S = NF.createState(); NF.save(S, { local: true }); NF.render(); };
global.NutriFeeApp = { getState: NF.getState, setState: NF.setState, act: act, bind: NF.bindValue, reset: NF.reset, render: function () { NF.render(); } };
/* První vykreslení nesmí skončit bílou obrazovkou (robustnost #1). SCHEMA 90 (K3): bez čistého startu přes data – záloha a nouzová obrazovka s „Začít znovu“. */
safeRender('start');

})(typeof window !== 'undefined' ? window : globalThis);
