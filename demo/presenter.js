/* Panel prezentujícího a demo lišta. Pouze pro prezentaci.
   Není součástí běžné navigace pacienta ani lékaře a nepatří do produkčního sestavení. */
(function (global) {
'use strict';
var NF = global.NutriFee, e = NF.esc;
var D = global.NutriFeeDemo;
var btn = function (l, a, v, c) { return NF.screens.btn(l, a, v, c); };

NF.demoActions = NF.demoActions || {};

/* ---------- demo lišta ---------- */
NF.registerSlot('rolebar', function (S) {
  var roles = [['patient', 'Pacient'], ['doctor', 'Lékař'], ['garant', 'Garant']];
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
  var sc = S.scenario ? D.byId(S.scenario) : null;
  return '<div class="banner demo-banner">' +
    '<p><strong class="demo-flag">DEMO · syntetická data · není určeno pro léčbu</strong> ' +
    (sc ? '· ' + e(sc.id) + ' · varianta: ' + e((sc.variants.filter(function (v) { return v.id === S.variant; })[0] || {}).label || S.variant) : '· žádný scénář') +
    ' · modelové datum: ' + e(NF.fmtShort(S.clock)) + ' ' + e(NF.fmtTime(S.clock)) +
    (NF.storageOK ? '' : ' · <strong>úložiště prohlížeče není dostupné — po obnovení stránky průchod začne znovu</strong>') +
    '</p>' +
    '<button type="button" class="btn demo" data-action="resetDemo">Reset demonstrace</button>' +
    '</div>';
});

/* ---------- panel prezentujícího ---------- */
function presenterPanel(S) {
  var sc = S.scenario ? D.byId(S.scenario) : null;
  var out = '<p class="eyebrow">Jen pro prezentujícího</p><h2>Panel prezentujícího</h2>' +
    '<p class="small muted">Tento panel není součástí aplikace pro pacienta ani lékaře. Slouží k vedení ukázky.</p>';

  out += '<h3>Spustit scénář od začátku</h3><div class="buttonlist">' +
    D.scenarios.map(function (x) {
      return '<button type="button" class="btn ' + (S.scenario === x.id ? 'selected' : 'secondary') + '" data-action="runScenario" data-value="' + x.id + '">' +
        e(x.title) + '</button>';
    }).join('') + '</div>';

  if (sc) {
    out += '<hr><h3>Cíl scénáře</h3><p>' + e(sc.goal) + '</p>';
    out += '<h3>Povinné varianty</h3><div class="buttonlist">' +
      sc.variants.map(function (v) {
        return '<button type="button" class="btn ' + (S.variant === v.id ? 'selected' : 'secondary') + '" data-action="setVariant" data-value="' + e(v.id) + '">' +
          e(v.label) + '</button>';
      }).join('') + '</div>' +
      '<p class="small muted">Přepnutí varianty načte scénář znovu od vstupního stavu.</p>';

    out += '<h3>Kroky průchodu</h3><div class="buttonlist">' +
      sc.steps.map(function (st, i) {
        return '<button type="button" class="btn secondary" data-action="gotoStep" data-value="' + e(sc.id + ':' + st[0]) + '">' +
          (i + 1) + '. ' + e(st[1]) + '</button>';
      }).join('') + '</div>';

    if (sc.situations && sc.situations.length) {
      out += '<h3>Připravené situace a posun času</h3><div class="buttonlist">' +
        sc.situations.map(function (si) {
          return '<button type="button" class="btn demo" data-action="applySituation" data-value="' + e(si.id) + '">' + e(si.label) + '</button>';
        }).join('') + '</div>';
    }
    out += '<h3>Otázky pro garanta</h3><ul class="plain-list">' +
      sc.garantQuestions.map(function (q) { return '<li>' + e(q) + '</li>'; }).join('') + '</ul>';
  }

  out += '<hr><h3>Posun modelového času</h3><div class="actions">' +
    btn('+ 1 den', 'shiftTime', '1', 'demo') + btn('+ 7 dní', 'shiftTime', '7', 'demo') + btn('+ 30 dní', 'shiftTime', '30', 'demo') +
    '</div><p class="small muted">Čas scénáře je pevný, ne systémové „dnes“. Posun je určený jen pro ukázku.</p>';

  out += '<hr><h3>Okrajové situace</h3><div class="buttonlist">' +
    D.edgeCases.map(function (x) {
      return '<button type="button" class="btn ' + (S.edge === x.id ? 'selected' : 'secondary') + '" data-action="setEdge" data-value="' + e(x.id) + '">' + e(x.title) + '</button>';
    }).join('') + '</div>' +
    (S.edge ? '<div class="actions">' + btn('Zrušit okrajovou situaci', 'setEdge', '', 'secondary') + '</div>' : '') +
    '<p class="small muted">Nejde o pátý hlavní scénář. Každá situace jen přepne stav a odpovídající obrazovku.</p>';

  out += '<hr><h3>Ukončení účasti</h3><div class="actions">' +
    btn('Ukončit účast', 'endParticipation', 'ended', 'demo') +
    btn('Odvolání souhlasu', 'setEdge', 'consent', 'demo') + '</div>';

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
    '<div class="actions">' + btn('Exportovat poznámky', 'exportNotes', null, 'secondary') +
    btn('Rozhodovací list garanta', 'openDecisions', null, 'secondary') + '</div>';

  out += '<hr><div class="actions">' + btn('Reset demonstrace', 'resetDemo', null, 'danger') +
    btn('Zavřít panel', 'closeDrawer', null, 'secondary') + '</div>' +
    '<p class="small muted">Reset obnoví přesně vstupní data scénáře a odstraní poznámky i změny tohoto běhu.</p>';
  return out;
}

var prevDrawer = NF.slots.drawer;
NF.slots.drawer = function (S, name) {
  if (name === 'presenter') return presenterPanel(S);
  return prevDrawer ? prevDrawer(S, name) : '';
};

/* ---------- akce prezentujícího ---------- */
NF.demoActions.openPresenter = function () { NF.openDrawer('presenter'); };
NF.demoActions.runScenario = function (v) {
  var next = D.load(null, v, null);
  if (!next) return;
  NF.setState(next);
  NF.openDrawer('presenter');
};
NF.demoActions.setVariant = function (v) {
  var S = NF.getState();
  if (!S.scenario) return;
  var next = D.load(null, S.scenario, v);
  NF.setState(next);
  NF.openDrawer('presenter');
};
NF.demoActions.gotoStep = function (v) {
  var S = NF.getState();
  var parts = String(v).split(':');
  var map = {
    S1: { prep: ['patient', 'prep'], understand: ['patient', 'understand'], issue: ['doctor', 'issue'], takeover: ['patient', 'takeover'], episode: ['patient', 'episode'], more: ['patient', 'compare'], compare: ['patient', 'compare'], conclude: ['patient', 'conclude'] },
    S2: { today: ['patient', 'today'], unclear: ['patient', 'unclear'], safety: ['patient', 'safety'], datastate: ['patient', 'datastate'], restore: ['patient', 'today'], resume: ['doctor', 'resume'] },
    S3: { preview: ['patient', 'preview'], onepage: ['doctor', 'onepage'], evidence: ['doctor', 'evidence'], decide: ['doctor', 'decide'], newplan: ['patient', 'newplan'], result: ['doctor', 'result'] },
    S4: { catalog: ['garant', 'catalog'], impulse: ['garant', 'incidents'], impact: ['garant', 'catalog'], 'patient-online': ['patient', 'today'], 'patient-offline': ['patient', 'today'], incident: ['garant', 'incidents'], fix: ['garant', 'catalog'], protocol: ['garant', 'protocol'] }
  };
  var t = (map[parts[0]] || {})[parts[1]];
  if (!t) return;
  S.role = t[0]; S.page = t[1];
  if (parts[0] === 'S1' && parts[1] === 'more') NF.demoActions.applySituation('addE2E3');
  if (parts[0] === 'S4' && parts[1] === 'patient-offline') NF.setOffline(S, true);
  if (parts[0] === 'S4' && parts[1] === 'patient-online') NF.setOffline(S, false);
};
NF.demoActions.applySituation = function (v) {
  var S = NF.getState();
  var sc = S.scenario ? D.byId(S.scenario) : null;
  if (!sc) return;
  var si = (sc.situations || []).filter(function (x) { return x.id === v; })[0];
  if (!si) return;
  var msg = si.apply(S);
  if (msg) S.toast = msg;
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
NF.demoActions.openDecisions = function () {
  var S = NF.getState();
  S.role = 'garant'; S.page = 'decisions';
  NF.closeDrawer();
};
NF.demoActions.resetDemo = function () {
  var S = NF.getState();
  if (S.scenario) {
    var next = D.load(null, S.scenario, S.variant);
    next.toast = 'Demonstrace je resetovaná na vstupní data scénáře.';
    NF.setState(next);
  } else {
    NF.reset();
  }
  NF.closeDrawer();
};

})(typeof window !== 'undefined' ? window : globalThis);
