/* Panel prezentujícího a demo lišta. Pouze pro prezentaci.
   Není součástí běžné navigace pacienta ani lékaře a nepatří do produkčního sestavení. */
(function (global) {
'use strict';
var NF = global.NutriFee, e = NF.esc;
var D = global.NutriFeeDemo;
var btn = function (l, a, v, c) { return NF.screens.btn(l, a, v, c); };

NF.demoActions = NF.demoActions || {};

function chapter(S) { return D.chapters[S.chapterIndex || 0]; }
function act(S) { return D.acts[chapter(S).act]; }

/* ---------- demo lišta ---------- */
NF.registerSlot('rolebar', function (S) {
  var roles = [['patient', 'Pacient'], ['doctor', 'Lékař'], ['nurse', 'Sestra'], ['garant', 'Garant']];
  return '<nav class="rolebar" aria-label="Demonstrační role">' + roles.map(function (r) {
    return '<button type="button" data-action="role" data-value="' + r[0] + '" class="' + (S.role === r[0] ? 'active' : '') + '"' +
      (S.role === r[0] ? ' aria-current="true"' : '') + '>' + e(r[1]) + '</button>';
  }).join('') + '</nav>';
});

NF.registerSlot('headerTools', function (S) {
  var g = global.NutriFeeGuide;
  return '<div class="demo-tools">' +
    (g ? '<button type="button" class="btn demo" data-action="toggleGuide" aria-pressed="' + (g.enabled ? 'true' : 'false') + '">' +
      (g.enabled ? 'Průvodce zapnutý' : 'Průvodce vypnutý') + '</button>' : '') +
    '<button type="button" class="btn demo" data-action="openPresenter">Panel prezentujícího</button>' +
    '</div>';
});

NF.registerSlot('banner', function (S) {
  var ch = chapter(S), a = act(S);
  var i = S.chapterIndex || 0;
  var route = S.garantStep != null ? D.garantRoute[S.garantStep] : null;
  return '<div class="banner demo-banner">' +
    '<p><strong class="demo-flag">DEMO · syntetická data · není určeno pro léčbu</strong> ' +
    '· ' + e(a.title) + ' · kapitola ' + (i + 1) + ' z ' + D.chapters.length + ': ' + e(ch.title) +
    ' · modelové datum: ' + e(NF.fmtShort(S.clock)) + ' ' + e(NF.fmtTime(S.clock)) +
    (NF.storageOK ? '' : ' · <strong>úložiště prohlížeče není dostupné — po obnovení stránky příběh začne znovu</strong>') +
    '</p>' +
    (route ? '<div class="garant-route"><p><strong>Průchod garanta · bod ' + (S.garantStep + 1) + ' z ' + D.garantRoute.length + ': ' + e(route.title) + '</strong><br>' +
      'Co podepisuješ: ' + e(route.sign) + '</p>' +
      (route.rules.length ? '<p class="small">' + route.rules.map(function (id) {
        var r = NF.ruleById(S, id);
        return r ? NF.screens.ruleChip(S, NF.ruleKey(r)) : '';
      }).join(' ') + '</p>' : '') +
      '<div class="demo-steps">' +
      (S.garantStep > 0 ? btn('◀ Předchozí bod', 'garantGo', String(S.garantStep - 1), 'demo') : '') +
      (S.garantStep < D.garantRoute.length - 1 ? btn('Další bod ▶', 'garantGo', String(S.garantStep + 1), 'demo')
        : btn('Rozhodovací list', 'garantEnd', null, 'demo')) +
      btn('Ukončit průchod', 'garantExit', null, 'demo') + '</div></div>'
    : '<div class="demo-steps">' +
      (i > 0 ? btn('◀ Předchozí', 'storyStep', '-1', 'demo') : '') +
      (i < D.chapters.length - 1 ? btn('Další ▶', 'storyStep', '1', 'demo') : '') +
      btn('Reset', 'resetDemo', null, 'demo') +
      '</div>') + '</div>';
});

/* ---------- panel prezentujícího ---------- */
function branchPicker(S, key) {
  var b = D.branches[key];
  var cur = (S.branches || D.defaults)[key];
  return '<h4>' + e(b.label) + '</h4><div class="buttonlist">' +
    b.options.map(function (o) {
      return '<button type="button" class="btn ' + (cur === o.id ? 'selected' : 'secondary') + '" data-action="setBranch" data-value="' +
        e(key + ':' + o.id) + '">' + e(o.label) + '</button>';
    }).join('') + '</div>';
}

function presenterPanel(S) {
  var here = S.chapterIndex || 0;
  var out = '<p class="eyebrow">Jen pro prezentujícího</p><h2>Panel prezentujícího</h2>' +
    '<p class="small muted">Tento panel není součástí aplikace pro pacienta ani lékaře. Slouží k vedení ukázky.</p>';

  out += '<div class="next-step"><strong>Jeden příběh</strong>' +
    '<p>Modelový pacient 01 od zařazení v ordinaci po další kontrolu: aplikace se z jeho dat učí, před jídlem radí ' +
    'a lékař na kontrole vidí, jestli rady fungovaly. Skok na kapitolu přehraje příběh od začátku, takže stav vždy odpovídá ručnímu průchodu.</p></div>';

  out += '<h3>Průchod na úrovni garanta</h3>' +
    '<p class="small muted">Jen schvalovací body — co by garant musel podepsat. ' + D.garantRoute.length + ' zastávek, u každé pravidla a jejich stav.</p>' +
    '<div class="actions">' + btn('Začít průchod garanta', 'garantGo', '0', 'primary') + '</div>';

  D.acts.forEach(function (a, ai) {
    out += '<hr><h3>' + e(a.title) + '</h3>' +
      '<p class="small muted">' + e(a.note) + '</p>' +
      '<div class="buttonlist">' +
      D.chapters.map(function (c, ci) { return { c: c, ci: ci }; })
        .filter(function (x) { return x.c.act === ai; })
        .map(function (x) {
          return '<button type="button" class="btn ' + (x.ci === here ? 'selected' : 'secondary') + '" data-action="goChapter" data-value="' + x.ci + '">' +
            (x.ci + 1) + '. ' + e(x.c.title) + '</button>';
        }).join('') + '</div>';
    Object.keys(D.branches).forEach(function (k) {
      var from = D.indexOf(D.branches[k].from);
      if (from >= 0 && D.chapters[from].act === ai) out += branchPicker(S, k);
    });
    if (D.garantQuestions[ai]) {
      out += '<details><summary>Otázky pro garanta k tomuto dějství</summary><div><ul class="plain-list">' +
        D.garantQuestions[ai].map(function (q) { return '<li>' + e(q) + '</li>'; }).join('') + '</ul></div></details>';
    }
  });

  out += '<hr><h3>Odbočky mimo hlavní linku</h3><div class="buttonlist">' +
    btn('Rozhodovací list garanta', 'openAside', 'decisions', 'demo') +
    btn('Verze a stopa demonstrace', 'openAside', 'versions', 'demo') +
    '</div>' +
    '<p class="small muted">Nejsou součástí příběhu ani pacientského průchodu. Otevřou se v příslušné roli a do příběhu nezasáhnou.</p>';

  out += '<h4>Okrajové situace</h4><div class="buttonlist">' +
    D.edgeCases.map(function (x) {
      return '<button type="button" class="btn ' + (S.edge === x.id ? 'selected' : 'secondary') + '" data-action="setEdge" data-value="' + e(x.id) + '">' + e(x.title) + '</button>';
    }).join('') + '</div>' +
    (S.edge ? '<div class="actions">' + btn('Zpět do příběhu', 'setEdge', '', 'secondary') + '</div>' : '') +
    '<div class="actions">' + btn('Ukončení účasti', 'endParticipation', 'ended', 'demo') + '</div>';

  out += '<hr><h3>Modelový čas</h3>' +
    '<p class="small muted">Čas příběhu je pevný, ne systémové „dnes“. Kapitoly jej nastavují samy; tohle je ruční posun navíc.</p>' +
    '<div class="actions">' + btn('+ 1 den', 'shiftTime', '1', 'demo') + btn('+ 7 dní', 'shiftTime', '7', 'demo') + btn('+ 30 dní', 'shiftTime', '30', 'demo') + '</div>';

  var g = global.NutriFeeGuide;
  if (g) {
    out += '<hr><h3>Průvodce maketou</h3><div class="actions">' +
      '<button type="button" class="btn ' + (g.enabled ? 'primary' : 'secondary') + '" data-action="toggleGuide" aria-pressed="' + (g.enabled ? 'true' : 'false') + '">' +
      (g.enabled ? 'Vypnout průvodce' : 'Zapnout průvodce') + '</button>' +
      btn('Seznam všech vysvětlení', 'guideIndex', null, 'secondary') + '</div>' +
      '<p class="small muted">Vypnutí odstraní značky i vysvětlení. Rozložení běžných obrazovek se nemění.</p>';
  }

  out += '<hr><h3>Poznámky z demonstrace</h3>' +
    '<label class="field">Co zaznělo<textarea class="note-copy" data-bind="notes">' + e(S.notes || '') + '</textarea></label>' +
    '<div class="actions">' + btn('Exportovat poznámky', 'exportNotes', null, 'secondary') + '</div>';

  out += '<hr><div class="actions">' + btn('Reset na začátek příběhu', 'resetDemo', null, 'danger') +
    btn('Zavřít panel', 'closeDrawer', null, 'secondary') + '</div>' +
    '<p class="small muted">Reset vrátí kapitolu 1 a výchozí odbočky a odstraní poznámky i změny tohoto běhu.</p>';
  return out;
}

var prevDrawer = NF.slots.drawer;
NF.slots.drawer = function (S, name) {
  if (name === 'presenter') return presenterPanel(S);
  return prevDrawer ? prevDrawer(S, name) : '';
};

/* ---------- akce prezentujícího ---------- */
function go(index, branches) {
  var S = NF.getState();
  var next = D.play(index, branches || S.branches);
  next.notes = '';
  NF.setState(next);
}

NF.demoActions.openPresenter = function () { NF.openDrawer('presenter'); };
NF.demoActions.goChapter = function (v) { go(Number(v)); NF.openDrawer('presenter'); };
NF.demoActions.storyStep = function (v) {
  var S = NF.getState();
  go((S.chapterIndex || 0) + Number(v));
};
NF.demoActions.setBranch = function (v) {
  var S = NF.getState();
  var i = String(v).indexOf(':');
  var b = {};
  Object.keys(S.branches || D.defaults).forEach(function (k) { b[k] = S.branches[k]; });
  b[v.slice(0, i)] = v.slice(i + 1);
  var target = D.indexOf(D.branches[v.slice(0, i)].from);
  var here = S.chapterIndex || 0;
  go(here >= target ? here : target, b);
  NF.openDrawer('presenter');
};
NF.demoActions.openAside = function (v) {
  var S = NF.getState();
  if (v === 'decisions') { S.role = 'garant'; S.page = 'decisions'; }
  else if (v === 'versions') { S.role = 'doctor'; S.page = 'versions'; }
  NF.closeDrawer();
};
NF.demoActions.shiftTime = function (v) {
  var S = NF.getState();
  S.clock = NF.addDays(S.clock, Number(v)).slice(0, 19);
  S.toast = 'Modelový čas posunut na ' + NF.fmtShort(S.clock) + '.';
};
NF.demoActions.setEdge = function (v) {
  var S = NF.getState();
  S.edge = v || null;
  if (v) { S.role = 'patient'; S.page = 'edge'; NF.closeDrawer(); }
};
NF.demoActions.endParticipation = function (v) {
  var S = NF.getState();
  NF.endParticipation(S, v);
  S.role = 'patient'; S.page = 'today';
  NF.closeDrawer();
};
/* Průchod garanta: přehraje příběh do kapitoly bodu (s jeho odbočkou)
   a v demo liště ukáže, co se v tomto bodě podepisuje. */
NF.demoActions.garantGo = function (v) {
  var k = Number(v);
  var step = D.garantRoute[k];
  if (!step) return;
  var b = {};
  Object.keys(D.defaults).forEach(function (x) { b[x] = D.defaults[x]; });
  Object.keys(step.branch || {}).forEach(function (x) { b[x] = step.branch[x]; });
  var next = D.play(D.indexOf(step.chapter), b);
  next.garantStep = k;
  NF.setState(next);
  NF.closeDrawer();
};
NF.demoActions.garantExit = function () { var S = NF.getState(); S.garantStep = null; };
NF.demoActions.garantEnd = function () { var S = NF.getState(); S.garantStep = null; S.role = 'garant'; S.page = 'decisions'; };
NF.demoActions.resetDemo = function () {
  var next = D.play(0, null);
  next.toast = 'Příběh je resetovaný na začátek v ordinaci.';
  NF.setState(next);
  NF.closeDrawer();
};

/* Bez uloženého průběhu začne příběh na začátku, v ordinaci. */
if (!NF.getState().chapter) NF.setState(D.play(0, null));

})(typeof window !== 'undefined' ? window : globalThis);
