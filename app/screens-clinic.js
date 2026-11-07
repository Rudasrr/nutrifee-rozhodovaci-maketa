/* Obrazovky lékaře (= garanta) a sestry – desktop. Podle 15-ZDROJ-PRAVDY-MAKETA.md.
   Kontrola je vedené flow o čtyřech krocích; každý krok má jedno primární tlačítko. */
(function (global) {
'use strict';
var NF = global.NutriFee, V = NF.screens, e = NF.esc;
var btn = V.btn, choice = V.choice, off = V.off, hint = V.hint, kv = V.kv, card = V.card, tag = V.tag, appr = V.appr;
/* Sazba v ordinaci (21. 10. 2026): prázdná hodnota česká pomlčka, čas bez úvodní nuly („9:35“). */
var EMPTY = '–';
function dateTime(iso) { return iso ? NF.fmtShort(iso) + ' ' + NF.fmtClock(iso) : EMPTY; }

function rail(S, items, who) {
  return '<nav class="rail" aria-label="Nabídka"><div class="brand"><span class="brandmark">N</span>NutriFee</div>' + items.map(function (it) {
    return '<button type="button" class="nav ' + (S.page === it[0] ? 'active' : '') + '" data-action="page" data-value="' + it[0] + '"' + (S.page === it[0] ? ' aria-current="page"' : '') + '><span class="ic" aria-hidden="true">' + NF.icon(it[2]) + '</span>' + e(it[1]) + '</button>';
  }).join('') + (NF.slots.demoBar ? '' : '<div class="who"><span class="demo-flag">DEMO · syntetická data · není určeno pro léčbu</span></div>') + '</nav>'; /* vlastník 26. 10. 2026: štítek DEMO jednou, v liště ukázky; bez jména modelové role */
}
function pagehead(eyebrow, h1, sub, right) {
  return '<div class="pagehead"><div><p class="eyebrow">' + e(eyebrow) + '</p><h1>' + e(h1) + '</h1>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>' + (right || '') + '</div>';
}
function nextbar(text, small, button) {
  return '<div class="nextbar"><div class="txt"><b>' + text + '</b>' + (small ? '<small>' + small + '</small>' : '') + '</div>' + button + '</div>';
}

/* ---------- lékař ---------- */
V.doctor = function (S) {
  var items = [['enroll', 'Zařazení a plán', 'clipboard'], ['review', 'Kontrola', 'stethoscope'], ['registry', 'Schvalovací registr', 'check'], ['trace', 'Verze a stopa', 'list']];
  var body;
  switch (S.page) {
    case 'review': body = V.review(S); break;
    case 'registry': body = V.registry(S); break;
    case 'trace': body = V.trace(S); break;
    default: body = V.enroll(S);
  }
  var aside = S.page === 'review' || S.page === 'enroll' ? ctxAside(S) : '';
  return '<div class="app' + (aside ? ' wide' : '') + '">' + rail(S, items, S.doctor.label) + '<div class="desk">' + body + '</div>' + aside + '</div>';
};
/* Kontextový sloupec od 1600 px (rozhodnutí vlastníka 19. 10. 2026): jen ke čtení – pacient, plán, dávky, cíle a během kontroly souhrn.
   Vedené flow a jeden aktuální návrh zůstávají ve sloupci práce; lékař jen nepřepíná mezi kroky. Pod 1600 px se nezobrazuje. */
function ctxAside(S) {
  var p = NF.activePlan(S); if (!p) return '';
  var t = p.targets, d = p.doses, r = S.review, s = r && r.summary;
  var out = '<p class="eyebrow">Pacient</p><h2>' + e(S.patient && S.patient.label || 'Pacient') + '</h2><p class="small muted">Plán ' + e(p.id) + ' · od ' + e(NF.fmtShort(p.issuedAt)) + '</p>' +
    '<div class="ctx-sec"><h3>Dávky</h3>' + kv('Snídaně', d.breakfast.units + ' j.') + kv('Oběd', d.lunch.units + ' j.') + kv('Večeře', d.dinner.units + ' j.') + kv('Bazál', d.basal.units + ' j. ve ' + e(d.basal.time)) + '</div>' +
    '<div class="ctx-sec"><h3>Cíle' + (t.preset === 'mirnejsi' ? ' (mírnější)' : '') + '</h3>' + kv('Rozmezí', e(NF.mmol1(t.low)) + '–' + e(NF.mmol1(t.high)) + ' mmol/l') + kv('Ráno nalačno do', e(NF.mmol1(t.fastingHigh)) + ' mmol/l') + kv('Čas v cíli alespoň', t.tirGoal + ' %') + kv('Čas pod cílem méně než', (t.tbrGoal != null ? t.tbrGoal : NF.DEFAULT_TARGETS.tbrGoal) + ' %') + kv('HbA1c do', (t.hba1cGoal != null ? t.hba1cGoal : NF.DEFAULT_TARGETS.hba1cGoal) + ' mmol/mol') + '</div>';
  if (s && r.step > 1) out += '<div class="ctx-sec"><h3>Souhrn období · plán ' + e(r.planId) + '</h3>' + (s.sensor ? kv('Čas v cíli', s.sensor.tir + ' %') : '') + (s.usualPct != null ? kv('Obvyklá porce', s.usualPct + ' %') : '') + (s.asPct != null ? kv('Inzulin podle plánu', s.asPct + ' %') : '') + '<p class="small muted mt-2 mb-0">' + e(leadSentence(S, s, NF.planById(S, r.planId))) + '</p></div>'; /* srovnání s plánem před kontrolovaným, ne s právě vydaným (02 #3) */
  if (S.page === 'review') out += '<div class="actions mt-3">' + btn(NF.icon('shield') + ' Pravidla a kontakty', 'acuteOpen', null, 'quiet sm acute') + '</div>'; /* C2 (32/02): tlačítko říká, co otevře */
  return '<aside class="ctx" aria-label="Kontext pacienta">' + out + '</aside>';
}

/* --- zařazení a startovní plán (3 kroky) --- */
V.enroll = function (S) {
  var D = global.NutriFeeDemo, p = NF.activePlan(S), d = S.draft;
  if (!d && p) {
    return pagehead('Pacient je zařazený', 'Plán ' + p.id + ' platí', 'Vydán ' + e(NF.fmtShort(p.issuedAt)) + ' · platnost do ' + e(NF.fmtShort(p.validUntil))) +
      card('<div class="grid2"><div><h2>Dávky inzulinu</h2>' + V.dosesTable(p) + '</div><div><h2>Návyky</h2><ul class="plain">' + S.habits.filter(function (h) { return h.planId === p.id; }).map(function (h) { return '<li><b>' + e(h.title) + '</b> ' + tag(NF.HABIT_STATE[h.state] || h.state, h.state === 'active' ? 'ok' : '') + '</li>'; }).join('') + '</ul>' + (function () { var ts = NF.trainingSummary(S); return '<p class="small mt-2">' + tag(ts.state === 'done' ? 'zaučení hotovo' : ts.state === 'failed' ? 'zaučení se nezdařilo' : 'zaučení čeká', ts.state === 'done' ? 'ok' : ts.state === 'failed' ? 'bad' : '') + ' ' + e(ts.text) + '</p>'; })() + '</div></div>' +
        '<div class="actions">' + btn('Zahájit kontrolu →', 'page', 'review', 'primary') + '</div>') +
      hint('<b>Aplikace vám mezi kontrolami nic neposílá a nic po vás nežádá.</b> Pacient zapisuje jídla a aplikace se z nich učí a radí mu. Všechno uvidíte v reportu při příští kontrole.', 'neutral'); /* kontrola 4 (06 C7): povinnost péče lékaře trvá, aplikace jen nic nepřidává */
  }
  if (!d) {
    return pagehead('V ordinaci · ' + NF.fmtDate(S.clock), 'Nový pacient', 'Zařazení a startovní plán ve třech krocích.') +
      card('<div class="actions m-0">' + btn('Připravit zařazení →', 'startDraft', null, 'primary') + '</div>');
  }
  var step = S.wizardStep || 0;
  var steps = ['Zařazení', 'Dávky, návyky a pravidla', 'Vydání plánu'];
  var out = pagehead('V ordinaci · ' + NF.fmtDate(S.clock), 'Zařazení a startovní plán') +
    '<div class="wsteps">' + steps.map(function (t, i) { return '<button type="button" class="' + (i === step ? 'now' : i < step ? 'done' : '') + '" data-action="wizardGo" data-value="' + i + '"' + (i === step ? ' aria-current="step"' : '') + '><span class="n">' + (i < step ? NF.icon('check') : i + 1) + '</span>' + e(t) + '</button>'; }).join('') + '</div>';
  if (step === 0) {
    var en = S.enrollment, ctx = (D && D.patientContext) || [];
    var eligRow = function (c) { var fromCard = D && D.cardEligibility && D.cardEligibility.indexOf(c[0]) >= 0; return '<label class="check"><input type="checkbox" data-action="eligibility" data-value="' + c[0] + '"' + (en.criteria[c[0]] ? ' checked' : '') + '><span>' + e(c[1]) + (fromCard ? ' ' + tag('z karty: splněno', 'info') : '') + '</span></label>'; };
    out += card('<h2>1 · Karta pacienta</h2>' + (ctx.length ? '<p class="muted">Načteno z karty pacienta.</p>' + ctx.map(function (r) { return kv(r[0], e(r[1])); }).join('') : '<p class="muted">Karta pacienta s NutriFee propojená není. Diagnózu, léčbu, senzor a HbA1c si ověřte v kartě pacienta; podmínky zařazení potvrdíte níže.</p>')) + /* B2 (31/03): produkce bez napojení na kartu */
      card('<h2>2 · Podmínky zařazení</h2><p class="muted">Aplikace stojí na pevné dávce inzulinu. Bez všech podmínek nedává smysl.</p>' +
        NF.ELIGIBILITY.map(eligRow).join('') +
        /* Kontrola 4 (06 B4, B1): vylučovací kritéria jedním zaškrtnutím; bez něj plán nejde vydat. Akce „exclusion“ doplní prezentační vrstva v ui.js. */
        '<label class="check"><input type="checkbox" data-action="exclusion" data-value="' + NF.EXCLUSION[0] + '"' + (en.criteria[NF.EXCLUSION[0]] ? ' checked' : '') + '><span>' + e(NF.EXCLUSION[1]) + '.</span></label>' +
        '<p class="small muted">Pacient s jiným lékem na diabetes (tablety, GLP-1) do NutriFee nepatří: takový lék mění riziko nízké glukózy a aplikace by o něm nevěděla. Na kontrole se sestra zeptá, zda pacient jiný lék nezačal brát.</p>' + /* SCHEMA 84 (rozhodnutí 5): kohorta jen inzulin; záznam „bere i tablety“ zrušen */
        /* SCHEMA 74 (vlastník 27. 10. 2026): povinné zaškrtnutí sdílení dat ze senzoru zrušeno; export pacient pošle před kontrolou do ordinace */
        (NF.usable(S, 'K-KRITERIA') ? '' : V.off(S, 'K-KRITERIA')) + (en.eligible ? hint('Všechny podmínky potvrzené. ' + appr(S, 'K-KRITERIA'), 'ok') : '<p class="small muted mt-2 mb-0">Karta pacienta podmínky dokládá, potvrdit je ale musíte vy. ' + appr(S, 'K-KRITERIA') + '</p>'));
    /* Výchozí hodnoty ze senzoru před zařazením (vlastník 23. 10. 2026): z reportu senzoru, voličem; na kontrole „dříve · teď · rozdíl“ */
    var bl0 = en.baseline || {}, t0 = NF.targets(S);
    /* Kontrola 4 (07 A2): hodnota mřížkou (čas v cíli po 5 %, čas pod cílem po 1 %) a jemně ±1; v ordinaci se nepíše. Akce „baselineSet“ doplní prezentační vrstva v ui.js. */
    /* SCHEMA 84 (rozhodnutí 9): posuvník po 1 % se značkou cíle pacienta (C-CILE) místo mřížky; v ordinaci se nepíše */
    var blField = function (key, label, val) { return '<div class="dose-field"><div class="k">' + e(label) + '</div>' + V.slider({ id: 'bl-' + key, action: 'baselineSet', prefix: key + ':', kind: 'goal', min: 0, max: key === 'tir' ? 100 : 40, step: 1, unit: '%', label: label + ' v procentech', value: val, goal: key === 'tir' ? t0.tirGoal : t0.tbrGoal, better: key === 'tir' ? 'max' : 'min', goalText: key === 'tir' ? 'cíl alespoň ' + t0.tirGoal + ' %' : 'cíl pod ' + t0.tbrGoal + ' %', prompt: 'Nastavte podle souhrnu senzoru' }) + '</div>'; };
    out += card('<h2>3 · Výchozí hodnoty ze senzoru</h2><p class="muted">Hodnoty převezměte posuvníkem ze souhrnu v aplikaci senzoru za poslední měsíc před zařazením. Aplikace je při příští kontrole porovná s novými a uvidíte, jestli se zlepšily. ' + (bl0.tir != null ? tag('z karty', 'info') : '') + '</p>' +
      '<div class="dose-row">' + blField('tir', 'Čas v cíli (TIR)', bl0.tir) + blField('below', 'Čas pod ' + NF.mmol1(t0.low) + ' mmol/l', bl0.below) + '</div>' +
      (function () { var he = NF.hba1cLog(S).filter(function (x) { return x.src === 'karta'; })[0] || null; return '<div class="k mt-3">HbA1c při zařazení ' + (he && he.date ? tag('z karty', 'info') : '') + '</div>' + hbaField(S, 'karta', he, null, false); })() + /* B3 (31/02): hodnota a datum odběru výběrem */
      '<p class="small muted mt-2 mb-0">Obvyklou porci a potvrzování inzulinu začne aplikace sledovat až teď, proto je první kontrola ukáže bez srovnání.</p>');
    /* S01/S02 (21. 10. 2026): žádné varování před první akcí; lišta říká, co zbývá, ne co udělá tlačítko */
    var critLeft = NF.ELIGIBILITY.filter(function (c) { return !en.criteria[c[0]]; }).length, exc = NF.excluded(S);
    out += nextbar('Další krok: dávky, návyky a pravidla', en.eligible && !exc ? '' : 'Zbývá potvrdit ' + (critLeft ? NF.plural(critLeft, 'podmínku', 'podmínky', 'podmínek') + ' zařazení' : '') + (critLeft && exc ? ' a ' : '') + (exc ? 'že pacient nemá vylučovací kritérium' : '') + '.', btn('Pokračovat →', 'wizardGo', '1', 'primary', en.eligible && !exc ? '' : ' disabled'));
    return out;
  }
  if (step === 1) {
    var hc = NF.habitCatalog(), ic = NF.instructionCatalog();
    out += card('<h2>1 · Dávky inzulinu</h2><p class="muted">Nastavte jednotky posuvníkem podle svého předpisu a případně dolaďte − a + – aplikace žádnou výši nenabízí ani nepředvyplňuje. Pacientovi je bude připomínat a ptát se na podání. Nikdy je nepočítá ani nemění.</p>' +
      '<div class="dose-grid"><div class="dose-group"><div class="gk">Prandiální inzulin · k jídlu</div><div class="dose-row">' + [['breakfast', 'Snídaně'], ['lunch', 'Oběd'], ['dinner', 'Večeře']].map(function (x) {
        return '<div class="dose-field"><div class="k">' + e(x[1]) + '</div>' + doseSlider('dose-' + x[0], x[1], d.doses[x[0]].units, 'doseSet', x[0] + ':') + '</div>';
      }).join('') + '</div></div>' +
      '<div class="dose-group basal"><div class="gk">' + NF.icon('moon') + ' Bazální inzulin · na noc</div><div class="dose-row basal-row"><div class="dose-field"><div class="k">Bazál · jednotky</div>' + doseSlider('dose-basal', 'Bazál', d.doses.basal.units, 'doseSet', 'basal:') + '</div>' +
        '<div class="dose-field"><div class="k" id="basal-time-k">Čas podání</div><div class="timechips basal" role="group" aria-labelledby="basal-time-k">' + ['20:00', '21:00', '22:00'].map(function (t) { return choice(t, 'basalTime', t, d.doses.basal.time === t, 'sm'); }).join('') + '</div></div></div></div></div>' +
      '<label class="check mt-3"><input type="checkbox" data-bind="draft.medicationChecked"' + (d.medicationChecked ? ' checked' : '') + '><span>Dávky jsou s pacientem ověřené podle předpisu (bazál a tři dávky k jídlu, bez premixu).</span></label>');
    out += card('<h2>2 · Startovní návyky</h2><p class="muted">Startovní sada návyků je pro všechny pacienty stejná. Návyk, který se k pacientovi nehodí, vyřaďte, nebo přidejte další. ' + appr(S, 'R-NAVYKY') + '</p>' +
      '<div class="stack">' + hc.filter(function (h) { return NF.usable(S, h.item); }).map(function (h) {
        var on = d.habits.indexOf(h.id) >= 0;
        return '<button type="button" class="habit-opt ' + (on ? 'on' : '') + '" data-action="toggleHabit" data-value="' + h.id + '" aria-pressed="' + on + '"><span class="dot">' + (on ? NF.icon('check') : '') + '</span><span><b>' + e(h.title) + '</b>' + (h.default ? ' ' + tag('startovní sada', 'info') : '') + '<small>Pacient uvidí: „' + e(h.why) + '“</small></span></button>'; /* text návyku oslovuje pacienta; lékaři je uveden jako citace (21. 10. 2026) */
      }).join('') + '</div>');
    /* Pokyny jsou v plánu automaticky ze schváleného registru (21. 10. 2026): lékař podepisuje plán jako celek, hodnotu mění jen výjimečně. */
    var active = ic.filter(function (c) { return d.instructions.some(function (x) { return x.id === c.id; }); }), exc = NF.instructionExceptions(S, d.instructions);
    var pokynyOff = NF.item(S, 'R-POKYNY') && !NF.usable(S, 'R-POKYNY'); /* zamítnutá R-POKYNY: místo pokynů oznámení (A05) */
    /* B1 (nezávislá kontrola 27. 10. 2026): pravidla jsou vlastní blok karty (div.part), cíle glukózy pod nimi; krok vyprávění o pravidlech tak nenabízí cíle */
    out += card('<h2>3 · Pravidla pro pacienta a cíle glukózy</h2><div class="part rules-part">' + (pokynyOff ? appr(S, 'R-POKYNY') : '<p class="muted">' + NF.plural(active.length, 'bezpečnostní pravidlo', 'bezpečnostní pravidla', 'bezpečnostních pravidel') + ' ze schváleného registru s výchozími hodnotami' + instrShortList(active) + '. Jsou to obecná pravidla NutriFee schválená garantem; pacient je uvidí v Bezpečí a ve chvíli, kdy je potřebuje, bez vašeho podpisu. Vydáním plánu je potvrzujete; hodnotu měňte jen výjimečně. ' + appr(S, 'R-POKYNY') + '</p>' +
      (exc.length ? '<p class="small">Výjimky u tohoto pacienta: ' + e(exc.join(', ')) + '.</p>' : '') +
      '<details class="more instr-card"><summary>Zobrazit pravidla nebo změnit hodnotu</summary>') +
      ic.map(function (c) {
        var ex = d.instructions.filter(function (x) { return x.id === c.id; })[0], usable = !NF.item(S, c.id) || NF.usable(S, c.id);
        if (!usable) return '<div class="instr">' + off(S, c.id) + '</div>';
        return '<div class="instr"><label class="check p-0"><input type="checkbox" data-action="instrToggle" data-value="' + c.id + '"' + (ex ? ' checked' : '') + '><span><b>' + e(c.title) + '</b> ' + appr(S, c.id) + '<br><span class="small muted">' + NF.instrHtml(c, ex ? ex.value : NF.instructionValue(S, c)) + '</span></span></label>' +
          (ex && c.fixed ? '<span class="small muted">pevně ' + e(String(c.value).replace('.', ',')) + ' ' + e(c.unit || '') + '</span>' : ex && typeof c.value === 'number' ? instrSlider('instr-', c, ex.value, 'instrSet') : '<span></span>') + '</div>';
      }).filter(function () { return !pokynyOff; }).join('') + (pokynyOff ? '' : '</details>') + '</div>' +
      '<div class="targets-part"><h3 class="mt-4">Cíle glukózy</h3><p class="muted small">Výchozí hodnoty pocházejí z registru a u tohoto pacienta je můžete upravit. Vychází z nich semafor v reportu i návrhy k dávce. ' + appr(S, 'C-CILE') + '</p>' +
      /* Kontrola 4 (bod 8, rozhodnutí vlastníka 30. 10. 2026): běžné, nebo mírnější cíle pro starší a křehké – obě sady v C-CILE. Akce „targetPreset“ doplní prezentační vrstva v ui.js. */
      '<div class="choice-row" role="group" aria-label="Sada cílů">' + choice(e('Běžné cíle'), 'targetPreset', 'bezne', d.targets.preset === 'bezne' || d.targets.preset == null && d.targets.tirGoal === NF.targetPreset(S, 'bezne').tirGoal, 'sm') + choice(e('Mírnější cíle pro starší a křehké'), 'targetPreset', 'mirnejsi', d.targets.preset === 'mirnejsi', 'sm') + '</div>' +
      '<p class="small muted mt-1">U starších nebo křehkých pacientů a při riziku nízké glukózy zvažte mírnější cíle: čas v cíli alespoň ' + NF.targetPreset(S, 'mirnejsi').tirGoal + ' % a čas pod cílem méně než ' + NF.targetPreset(S, 'mirnejsi').tbrGoal + ' %.</p>' + targetsGrid(d.targets, 'target') + '</div>'); /* SCHEMA 84: .targets-part = rámeček kroku „Cíle glukózy“ i se štítkem C-CILE */
    var bl = NF.planBlockers(S);
    out += nextbar('Další krok: vydání plánu', bl.length ? 'Chybí: ' + e(bl.join(', ')) + '.' : 'Vše je připravené.', btn('Pokračovat →', 'wizardGo', '2', 'primary', bl.length ? ' disabled' : ''));
    return out;
  }
  var hc2 = NF.habitCatalog(), bl2 = NF.planBlockers(S), uOr = function (u) { return u >= 1 ? u + ' j.' : 'nastavte'; }; /* bez dávky nikdy „0 j.“ (02 #5) */
  out += card('<h2>Shrnutí před vydáním</h2><div class="grid2"><div>' + kv('Plán', e(d.planId)) + kv('Platnost do', e(NF.fmtShort(d.validUntil))) +
    kv('Snídaně', uOr(d.doses.breakfast.units)) + kv('Oběd', uOr(d.doses.lunch.units)) + kv('Večeře', uOr(d.doses.dinner.units)) + kv('Bazál na noc', uOr(d.doses.basal.units) + ' ve ' + e(d.doses.basal.time)) + /* každá dávka na vlastním řádku (19. 10. 2026) */
    targetsKv(d.targets) + '<h3 class="mt-4">Návyky</h3><ul class="plain small">' + d.habits.map(function (id) { var h = hc2.filter(function (x) { return x.id === id; })[0]; return '<li>' + e(h ? h.title : id) + '</li>'; }).join('') + '</ul></div>' +
    '<div><h3 class="mt-0">Pravidla pro pacienta</h3>' + V.instructionsList(S, d, true) + '<p class="small muted">Pravidla pocházejí ze schváleného registru. Vydáním plánu je potvrzujete.</p></div></div>') + /* N04/N05: dávky, cíle a návyky vlevo, pokyny vpravo; nadpisy skupin s odstupem */
    hint('<b>Co se stane po vydání:</b> plán se předá sestře k zaučení. Návyky začnou pacientovi platit až po zaučení a jedné závěrečné otázce. Aplikace vám mezi kontrolami nic neposílá a nic po vás nežádá.', 'neutral'); /* kontrola 4 (06 C7) */
  /* potvrzení jednou větou, co se stane (15a; rozhodnutí vlastníka 19. 10. 2026) */
  out += bl2.length ? nextbar('Plán zatím nelze vydat', 'Chybí: ' + e(bl2.join(', ')) + '.', btn('Vydat plán a předat sestře', 'issuePlan', null, 'primary', ' disabled'))
    : nextbar('Vydáte plán ' + e(d.planId) + ': snídaně ' + d.doses.breakfast.units + ' j. · oběd ' + d.doses.lunch.units + ' j. · večeře ' + d.doses.dinner.units + ' j. · bazál ' + d.doses.basal.units + ' j. ve ' + e(d.doses.basal.time), 'Vydání nejde vzít zpět. Plán uvidí sestra i pacient a pacient dávky při převzetí potvrdí.', btn('Vydat plán a předat sestře', 'issuePlan', null, 'primary'));
  return out;
};

/* Cíle glukózy ve shrnutí: hodnoty s jednotkou a čas v cíli (N04, 21. 10. 2026). */
/* Volič dávky (SCHEMA 84, rozhodnutí vlastníka 5. 11. 2026, bod 9): posuvník s −/+ místo mřížky a stepperu; rozsah NF.DOSE_RANGE (1–60 j. všude, SCHEMA 87). Bez dávky jezdec jen naznačený na začátku
   dráhy (aplikace výši nenabízí ani nepředvyplňuje, zásada 1); u změny dávky značka „dnes N j.“. */
function doseSlider(id, label, units, action, prefix, max, ref, size) {
  return V.slider({ id: id, action: action, prefix: prefix, kind: 'plain', min: NF.DOSE_RANGE[0], max: max || NF.DOSE_RANGE[1], step: 1, unit: 'j.', label: label + ': jednotky', value: units >= 1 ? units : null, ref: ref, refText: ref != null ? 'dnes ' + ref + ' j.' : null, size: size, prompt: 'Dávku nastavte posuvníkem' });
}
function targetsKv(t) {
  return kv('Cíle glukózy' + (t.preset === 'mirnejsi' ? ' (mírnější)' : ''), e(NF.mmol1(t.low)) + '–' + e(NF.mmol1(t.high)) + ' mmol/l · ráno nalačno do ' + e(NF.mmol1(t.fastingHigh)) + ' mmol/l') + kv('Čas v cíli alespoň', t.tirGoal + ' %') + kv('Čas pod cílem méně než', (t.tbrGoal != null ? t.tbrGoal : NF.DEFAULT_TARGETS.tbrGoal) + ' %') + kv('HbA1c do', (t.hba1cGoal != null ? t.hba1cGoal : NF.DEFAULT_TARGETS.hba1cGoal) + ' mmol/mol');
}
/* Cíle glukózy voličem (15, odst. 4.6): rozmezí, ráno, cíl času v cíli. Glukóza vždy s jedním desetinným místem (S07). */
function targetsGrid(t, action) {
  var rows = [['low', 'Dolní cíl', 'mmol/l'], ['high', 'Horní cíl (po jídle)', 'mmol/l'], ['fastingHigh', 'Ráno nalačno do', 'mmol/l'], ['tirGoal', 'Čas v cíli alespoň', '%'], ['tbrGoal', 'Čas pod cílem méně než', '%'], ['hba1cGoal', 'HbA1c do', 'mmol/mol']]; /* čas pod cílem (kontrola 4, bod 8) */ /* cíl HbA1c (25. 10. 2026) */
  /* SCHEMA 84 (rozhodnutí 9): každý cíl posuvníkem s krokem a mezemi z NF.TARGET_STEPS (glukóza po 0,1 nebo 0,5 mmol/l) */
  return '<div class="dose-row targets-row">' + rows.map(function (r) {
    var st = NF.TARGET_STEPS[r[0]], v = t[r[0]] != null ? t[r[0]] : NF.DEFAULT_TARGETS[r[0]];
    return '<div class="dose-field"><div class="k">' + e(r[1]) + '</div>' + V.slider({ id: (action === 'revTarget' ? 'rtgt-' : 'tgt-') + r[0], action: action + 'Set', prefix: r[0] + ':', kind: 'plain', min: st[1], max: st[2], step: st[0], dec: r[2] === 'mmol/l' ? 1 : 0, unit: r[2], label: r[1], value: v, size: 'sm' }) + '</div>';
  }).join('') + '</div>';
}
/* Hodnota pravidla (minuty, hodiny, mmol/l) posuvníkem s krokem a mezemi z katalogu pravidel (SCHEMA 84, rozhodnutí 9). */
function instrSlider(pre, c, value, action) {
  return V.slider({ id: pre + c.id, action: action, prefix: c.id + ':', kind: 'plain', min: c.min != null ? c.min : 0, max: c.max != null ? c.max : 100, step: c.step || 1, dec: (c.step || 1) % 1 ? 1 : 0, unit: c.unit || '', label: c.title, value: value, size: 'sm' });
}
/* Úprava pokynů při kontrole: stejný katalog jako při zařazení, vázaný na r.newInstructions. */
function reviewInstructions(S, r) {
  var ic = NF.instructionCatalog();
  if (NF.item(S, 'R-POKYNY') && !NF.usable(S, 'R-POKYNY')) return '<div class="box mt-3"><div class="k">Pravidla pro příští období</div>' + off(S, 'R-POKYNY') + '<div class="k mt-3">Cíle glukózy ' + appr(S, 'C-CILE') + '</div>' + targetsGrid(r.newTargets, 'revTarget') + '</div>'; /* A05 */
  return '<div class="box mt-3"><div class="k">Pravidla pro příští období</div><p class="small muted">Hodnoty pocházejí ze schváleného registru. Měňte je jen jako výjimku u tohoto pacienta.</p>' + ic.map(function (c) {
    var ex = r.newInstructions.filter(function (x) { return x.id === c.id; })[0];
    return '<div class="instr"><label class="check p-0"><input type="checkbox" data-action="revInstrToggle" data-value="' + c.id + '"' + (ex ? ' checked' : '') + '><span><b>' + e(c.title) + '</b></span></label>' +
      (ex && c.fixed ? '<span class="small muted">pevně ' + e(String(c.value).replace('.', ',')) + ' ' + e(c.unit || '') + '</span>' : ex && typeof c.value === 'number' ? instrSlider('rinstr-', c, ex.value, 'revInstrSet') : '<span></span>') + '</div>';
  }).join('') + '<div class="k mt-3">Cíle glukózy ' + appr(S, 'C-CILE') + '</div>' + targetsGrid(r.newTargets, 'revTarget') + '</div>';
}

/* --- kontrola: 4 kroky --- */
/* Semafor dlaždice: barva + znak + slovo (E7), aby stav nebyl jen barvou. */
var TILE_WORD = { 'c-ok': '✓ v cíli', 'c-warn': '! blízko cíle', 'c-bad': '✕ mimo cíl', 'c-none': '– bez dat' };
var TILE_WORD_ADV = {}; /* stav rad podle s.advice.works, viz advWord */
/* slovo stavu podle dlaždice (19. 10. 2026: „blízko cíle“ u HbA1c nebo dnů nemoci nedávalo smysl).
   21. 10. 2026: „v cíli“ jen u glukózy (S03); porce a inzulin „80 % a víc“, mimo učení „v normě“ (N10). */
var TILE_WORD_BY = { hba: { 'c-ok': '✓ klesá', 'c-warn': '– beze změny', 'c-bad': '! stoupá' } }; /* porce, inzulin a mimo učení nesou slovo z prahů S-SEMAFOR (A14) */
/* Jeden nosič stavu (řemeslo 9, 19. 10. 2026): popisek → číslo → jeden řádek „✓ v cíli“ ve barvě stavu; bez tečky. Dlaždice bez cíle (Mimo učení) je neutrální. */
/* Dlaždice se srovnáním (23. 10. 2026): velké číslo = teď; řádek „dříve X → teď Y · rozdíl“; slovo stavu = cíl + směr (zlepšuje se / zhoršuje se / beze změny).
   goalState ok/warn/bad/none; goal = slova stavu proti cíli (null = bez cíle, jen směr). higherBetter: u času pod cílem a HbA1c je lepší nižší hodnota. */
function trend(prev, now, higherBetter) {
  if (prev == null || now == null) return null;
  var d = Math.round((now - prev) * 10) / 10; if (d === 0) return 'same';
  return (d > 0) === higherBetter ? 'better' : 'worse';
}
/* B3 (31/02): HbA1c vždy s datem odběru a původem. */
function hbaWhen(x) { return x && x.date ? NF.fmtShort(x.date + 'T12:00:00') : ''; }
function hbaLine(h) { return h ? [h.before, h.now].filter(Boolean).map(function (x) { return x.v + (x.date ? ' (' + hbaWhen(x) + ')' : ''); }).join(' → ') + ' mmol/mol' : ''; }
function hbaSrc(x) { return !x ? '' : x.src === 'sestra' ? 'vybrala sestra z karty pacienta' : 'z karty pacienta'; }
/* Volič HbA1c (v ordinaci se nepíše, zásada 8): hodnota mřížkou a ±1, datum odběru výběrem ze dnů. src = 'karta' (při zařazení) nebo 'sestra' (pro kontrolu). */
function hbaField(S, src, entry, from, locked) {
  var v = entry ? entry.v : null, dates = NF.hbaDates(S, from, 200), sel = entry && entry.date;
  var g = NF.targets(S).hba1cGoal; /* SCHEMA 84 (rozhodnutí 9): posuvník po 1 mmol/mol se značkou cíle pacienta (C-CILE) místo mřížky */
  return '<div class="dose-field hba-field">' + V.slider({ id: 'hba-' + src, action: 'hbaSet', prefix: src + ':', kind: 'goal', min: 30, max: 120, step: 1, unit: 'mmol/mol', label: 'HbA1c v mmol/mol', value: v, goal: g, better: 'min', goalText: 'cíl do ' + g, disabled: locked, prompt: 'Nastavte podle karty pacienta' }) +
    '<label class="field mt-2"><span>Datum odběru</span><select data-bind="form.hba_date_' + src + '" data-change="hbaDate" data-value="' + src + '"' + (locked || v == null ? ' disabled' : '') + '><option value="">vyberte den</option>' + dates.map(function (d) { return '<option value="' + d + '"' + (sel === d ? ' selected' : '') + '>' + e(NF.fmtDayDate(d + 'T12:00:00') + ' ' + d.slice(0, 4)) + '</option>'; }).join('') + '</select></label></div>';
}
function cmpTile(S, key, k, now, prev, unit, higherBetter, goalState, goal, open, extra, note) {
  var fmt = function (v) { return String(v).replace('.', ','); }, dir = trend(prev, now, higherBetter), diff = dir ? Math.round((now - prev) * 10) / 10 : 0;
  if (unit === '%' && dir && dir !== 'same' && !semOff(S) && Math.abs(diff) < NF.param(S, 'S-SEMAFOR', 'smer_pb', 2)) dir = 'same'; /* SCHEMA 82 (31/16 C2): se zamítnutou S-SEMAFOR se práh z kódu nepoužije – slovo směru podle znaménka */ /* rozhodnutí vlastníka 2. 11. 2026 (bod 11, SCHEMA 81): slovo směru až od 2 procentních bodů */
  var line = now == null ? note : prev == null ? (note ? note + ' · ' : '') + 'první období · bez srovnání' : 'dříve ' + fmt(prev) + ' → teď ' + fmt(now) + ' · ' + (diff > 0 ? '+' : diff < 0 ? '−' : '±') + fmt(Math.abs(diff)) + ' ' + (unit === '%' ? 'p. b.' : unit) + (note ? ' · ' + note : ''); /* rozdíl dvou procent = procentní body (02 #14) */
  var dirWord = { better: 'zlepšuje se', worse: 'zhoršuje se', same: 'beze změny' }[dir] || '';
  var goalWord = goal && goalState !== 'none' ? goal[goalState] || '' : '';
  var cls = goalState === 'none' ? (dir === 'better' ? 'c-ok' : dir === 'worse' ? 'c-bad' : 'c-none') : goalState === 'ok' && dir === 'worse' ? 'c-warn' : 'c-' + goalState;
  var icon = cls === 'c-ok' ? '✓ ' : cls === 'c-warn' ? '! ' : cls === 'c-bad' ? '✕ ' : '– ';
  var word = now == null ? '– bez dat' : icon + (goalWord ? goalWord + (dirWord ? (goalState === 'ok' && dir === 'worse' ? ', ale ' : ' · ') + dirWord : '') : dirWord || 'bez srovnání');
  /* B19 (nezávislá kontrola 27. 10. 2026): zamítnutý S-SEMAFOR má skutečný účinek – dlaždice nesou jen hodnotu a srovnání, bez barvy a bez hodnocení proti hranicím */
  if (key !== 'hba' && semOff(S)) { cls = 'c-none'; word = now == null ? '– bez dat' : '– semafor vypnutý' + (dirWord ? ' · ' + dirWord : ''); }
  return tileBtn(S, key, k, now == null ? EMPTY : fmt(now) + ' <small>' + unit + '</small>', line, cls, open, extra, word);
}
function semOff(S) { return !!NF.item(S, 'S-SEMAFOR') && !NF.usable(S, 'S-SEMAFOR'); }
function advWord(S) { var r = S.review, w = r && r.summary && r.summary.advice ? r.summary.advice.works : null; return { yes: '– s radou bývalo níž', same: '– s radou podobně', few: '– zatím nelze říct' }[w] || (w ? '– s radou nebylo níž' : ''); } /* C4 (32/02): stav slovem se značkou jako ostatní dlaždice; neutrální */ /* B11 (27. 10. 2026): srovnání je neutrální (S-SOUHRN) – bez fajfky a bez zelené */
function tileBtn(S, key, k, v, d, cls, open, extra, word) {
  var w = word != null ? word : key === 'adv' ? advWord(S) : (TILE_WORD_BY[key] && TILE_WORD_BY[key][cls.split(' ')[0]]) || TILE_WORD[cls.split(' ')[0]] || '';
  return '<button type="button" class="tile ' + cls + (open ? ' open' : '') + '" data-action="reviewTile" data-value="' + key + '" aria-expanded="' + (open ? 'true' : 'false') + '"><div class="k">' + e(k) + '</div><div class="v">' + v + '</div>' + (w ? '<div class="st">' + e(w) + '</div>' : '') + (extra || '') + '<div class="d">' + e(d) + '</div></button>';
}
function leadSentence(S, s, plan) {
  var parts = [];
  if (!s.meals) return 'Pacient zatím nezapsal žádné jídlo.';
  /* N12 (21. 10. 2026): bezrodé tvary; V10: „podobně“ není „nebylo níž“. 26. 10. 2026: celé věty místo výčtu (vlastník: „stručné, ale všeříkající“) */
  var sem = NF.semafor(S); /* prahy z S-SEMAFOR (A14) */
  parts.push(s.usualPct >= sem.porceOk ? 'Porce byly stálé: obvyklou porci mělo ' + s.usualPct + ' % jídel.' : 'Porce kolísaly: obvyklou porci mělo jen ' + s.usualPct + ' % jídel.');
  parts.push((s.asPct >= sem.insOk ? 'Inzulin byl potvrzen podle plánu u ' : 'Inzulin byl potvrzen podle plánu jen u ') + s.asPct + ' % jídel.');
  /* 32/02 B5 (SCHEMA 84): dávky, které si pacient sám snížil, jsou téma rozhovoru, ne jen číslo */
  var sl = s.selfLower || {}, slParts = NF.MEALS.filter(function (m) { return sl[m[0]]; }).map(function (m) { return sl[m[0]] + '× nižší dávku ' + NF.mealLabel(m[0], 'ke') + ' (' + s.selfLowerUnits[m[0]] + ' j.)'; });
  if (s.basalLower) slParts.push(s.basalLower + '× nižší bazál (' + s.basalLowerUnits + ' j.)');
  if (slParts.length) parts.push('Pacient si sám dal ' + slParts.join(' a ') + '; zeptejte se proč.');
  if (s.smallerPlanned) parts.push('Menší porci ohlásil pacient předem, ještě před píchnutím, ' + s.smallerPlanned + '×; zeptejte se na chuť k jídlu – dávka se nastavuje na porci, kterou opravdu jí.'); /* B1 (32/01, SCHEMA 84) */
  /* A25: jednotka „jídel“ (v návrzích „nabídek rad“) */
  parts.push('Jídel s přijatou radou bylo ' + s.advice.accepted.n + ', bez přijaté rady ' + s.advice.declined.n + '; ' + (s.advice.works === 'yes' ? 's radou bývalo níž.' : s.advice.works === 'few' ? 'jestli s radou bývalo níž, zatím nelze říct.' : s.advice.works === 'same' ? 's radou bývalo podobně.' : 's radou nebylo níž.'));
  var b1 = S.enrollment.baseline || {}, pv = NF.prevSummary(S, plan || NF.activePlan(S)), tirPrev = pv && pv.sensor ? pv.sensor.tir : b1.tir;
  if (s.sensor) parts.push('Čas v cíli byl ' + s.sensor.tir + ' %' + (tirPrev != null ? ' (dříve ' + tirPrev + ' %)' : '') + (s.tirState === 'ok' ? ', cíl je splněn.' : s.tirState === 'bad' ? (s.sensor.tir < NF.targets(S).tirGoal ? ', pod cílem.' : ', ale příliš mnoho času bylo pod dolním cílem.') : ', blízko cíle.'));
  return parts.join(' ');
}
/* Období kontroly: od vydání plánu do posledního dne se zápisy (den před kontrolou); počet dní stejným výpočtem jako report pacienta (NF.periodInfo, A30). */
function periodText(from, until) {
  var pi = NF.periodInfo({ episodes: [] }, { id: null, issuedAt: from }, until);
  return 'Období ' + e(NF.fmtShort(pi.from)) + ' – ' + e(NF.fmtShort(pi.last)) + ' · ' + NF.plural(pi.days, 'den', 'dny', 'dní');
}
V.review = function (S) {
  var p = NF.activePlan(S), r = S.review, D = global.NutriFeeDemo;
  if (!p) return pagehead('Kontrola', 'Pacient zatím nemá plán') + card('<p>Nejdřív ho zařaďte.</p><div class="actions">' + btn('Zařazení →', 'page', 'enroll', 'primary') + '</div>');
  if (!r || NF.reviewClosed(S)) {
    return pagehead('Kontrola · ' + NF.fmtDate(S.clock), 'Pacient · plán ' + p.id, NF.day(p.issuedAt) >= NF.day(S.clock) ? 'Období plánu ' + e(p.id) + ' začíná dnes · zatím bez zápisů' /* B5 (31/03): nové období nemá „konec před začátkem“ */ : periodText(p.issuedAt, S.clock) + ' · ' + NF.periodEntriesText(NF.periodInfo(S, p, S.clock))) + /* A28 bez jména modelové role; A30 jídla a svačiny zvlášť */
      /* Integrace SCHEMA 73 (C10): sestra nahraje export ještě před zahájením – souhrn i návrhy se počítají při zahájení, export jim musí předcházet. */
      card('<h2>Kontrola ve čtyřech krocích</h2><p class="muted">Nejdřív sestra nahraje export ze senzoru a s pacientem projde léky a body, které z dat ověřit nejde (části níže). Po zahájení aplikace sestaví souhrn období a návrhy na příští plán. Projdete je ve čtyřech krocích: souhrn, návrhy, potvrzení plánu a předání pacientovi.</p><div class="actions m-0">' + btn('Zahájit kontrolu →', 'startReview', null, 'primary') + '</div>') +
      nurseCheckPart(S) + sensorImportPart(S);
  }
  var rp = NF.planById(S, r.planId) || p;
  var s = r.summary, steps = [['Souhrn', s ? 'přečteno' : ''], ['Návrhy', Object.keys(r.decisions).length + ' ' + NF.z(r.proposals.length) + ' ' + r.proposals.length], ['Potvrdit plán', r.planIssued ? 'vydán' : ''], ['Předat pacientovi', '']];
  var out = '<div class="flow">' + steps.map(function (x, i) { var n = i + 1; return '<button type="button" class="step ' + (n === r.step ? 'now' : n < r.step ? 'done' : '') + '" data-action="reviewStep" data-value="' + n + '"' + (n === r.step ? ' aria-current="step"' : '') + '><span class="n">' + (n < r.step ? '✓' : n) + '</span>' + e(x[0]) + (x[1] ? '<small>' + e(x[1]) + '</small>' : '') + '</button>'; }).join('') + '</div>' +
    /* V07: po vydání nového plánu hlavička dál ukazuje kontrolované období (plán, z něhož kontrola vzešla) */
    pagehead('Kontrola · ' + NF.fmtDate(S.clock), 'Pacient · plán ' + rp.id + (r.planIssued ? ' → ' + r.planIssued : ''), periodText(rp.issuedAt, r.startedAt) + (s && s.hba1c ? ' · glykovaný hemoglobin (HbA1c) ' + e(hbaLine(s.hba1cInfo)) : ''),
      btn(NF.icon('shield') + ' Pravidla a kontakty', 'acuteOpen', null, 'quiet sm acute')); /* C2 (32/02) */
  if (r.step === 1) out += reviewSummary(S, rp, r);
  else if (r.step === 2) out += reviewProposals(S, rp, r);
  else if (r.step === 3) out += reviewConfirm(S, rp, r);
  else out += reviewHandover(S, rp, r);
  return out;
};
/* Kontrola 4 (bod 7, rozhodnutí vlastníka 30. 10. 2026): sestra před lékařem výběrem projde s pacientem léky mimo inzulin a body postupu D-POSTUP,
   které nejdou ověřit z dat. Lékař vidí její odpovědi u návrhu a rozhoduje; „Vše sedí“ je nepřepíná. Akce „nurseCheck“ a „nurseMeds“ doplní prezentační vrstva v ui.js. */
function nurseCheckPart(S) {
  var r = NF.item(S, 'D-POSTUP'), keys = NF.nurseKeys(S), p0 = NF.activePlan(S), n = NF.nurseCheckFor(S), pts = n.points || {}, locked = !!(S.review && S.review.planIssued && p0 && S.review.planId === p0.id); /* B5 (31/03): zámek jen u kontroly období, které ještě platí */
  /* B3 (31/02): HbA1c pro kontrolu – výsledek od začátku plánu, který sestra vybere voličem s datem odběru; „nový výsledek není“ je také odpověď. */
  var hbaE = NF.hba1cLog(S).filter(function (x) { return x.src === 'sestra' && p0 && x.date && x.date > NF.day(p0.issuedAt); })[0] || NF.hba1cLog(S).filter(function (x) { return x.src === 'sestra' && !x.date; })[0] || null;
  var hbaDone = !!(hbaE && hbaE.date) || !!n.hbaNone;
  var done = keys.filter(function (k) { return pts[k] === true || pts[k] === false; }).length + (n.meds ? 1 : 0) + (hbaDone ? 1 : 0), total = keys.length + 2;
  var row = function (k) { var v = pts[k]; return '<div class="verify' + (v === false ? ' off' : '') + '"><span class="v-text">' + e(r.sestra[k]) + '</span><span class="choice-row">' + choice((v === true ? NF.icon('check') + ' ' : '') + 'Sedí', 'nurseCheck', k + ':yes', v === true, 'sm yes') + choice((v === false ? NF.icon('x') + ' ' : '') + 'Nesedí', 'nurseCheck', k + ':no', v === false, 'sm no') + '</span></div>'; };
  return '<details class="part nurse-part" open><summary>Sestra · S pacientem před lékařem<span class="mini">' + done + ' ' + NF.z(total) + ' ' + total + ' zodpovězeno</span></summary><div class="body">' +
    '<p class="small">Sestra se pacienta zeptá a vybere odpověď. Lékař odpovědi uvidí u návrhů k dávce a rozhodne; nic se tím nemění samo.</p>' +
    '<div class="k">' + e(NF.MEDS_QUESTION) + '</div><div class="timechips" role="group" aria-label="' + e(NF.MEDS_QUESTION) + '">' + NF.NURSE_MEDS.map(function (x) { return choice(e(x[1]), 'nurseMeds', x[0], NF.medsValue(n.meds) === x[0], 'sm'); }).join('') + '</div>' + /* SCHEMA 84 (rozhodnutí 5) */
    (NF.medsValue(n.meds) === 'yes' ? '<p class="small muted mt-1 mb-0">' + e(NF.medsText('yes')) + '</p>' : '') +
    '<div class="k mt-3">' + e(NF.healthQuestion(S)) + '</div><div class="timechips" role="group" aria-label="' + e(NF.healthQuestion(S)) + '">' + NF.NURSE_HEALTH.map(function (x) { return choice(e(x[1]), 'nurseHealth', x[0], NF.healthValue(n) === x[0], 'sm'); }).join('') + '</div>' + /* C8 (32/02): volby podle pohlaví */
    (NF.healthValue(n) === 'yes' ? '<p class="small muted mt-1 mb-0">' + e(NF.healthText('yes')) + '</p>' : '') +
    weightPart(S, p0, locked) +
    '<div class="k mt-3">HbA1c pro kontrolu: výsledek od začátku plánu (karta pacienta)</div>' +
    '<div class="timechips" role="group" aria-label="Nový výsledek HbA1c">' + choice(e('Nový výsledek zatím není'), 'hbaNone', 'toggle', !!n.hbaNone, 'sm') + '</div>' +
    (n.hbaNone ? '' : hbaField(S, 'sestra', hbaE, p0 ? NF.day(NF.addDays(p0.issuedAt, 1)) : null, locked) + (hbaE && hbaE.date ? '<p class="small muted mt-1 mb-0">Lékař uvidí ' + hbaE.v + ' mmol/mol, odběr ' + e(hbaWhen(hbaE)) + '.</p>' : '')) +
    (keys.length ? '<div class="k mt-3">Body postupu, které z dat ověřit nejde</div>' + keys.map(row).join('') + '<div class="small mt-2">' + appr(S, 'D-POSTUP') + '</div>' : (r && !NF.usable(S, 'D-POSTUP') ? V.off(S, 'D-POSTUP') : '')) +
    (locked ? '<p class="small muted mt-2 mb-0">Plán je vydaný; odpovědi zůstávají ve stopě.</p>' : '') + '</div></details>';
}
V.nurseCheckPart = nurseCheckPart;
/* Hmotnost (rozhodnutí vlastníka 4. 11. 2026, bod 6; 32/02 B7): sestra vybere posuvníkem po 1 kg s −/+ (v ordinaci se nepíše; do SCHEMA 84 mřížka po 5 kg). Akce „nurseWeightSet“ a „nurseWeightStep“ doplní prezentační vrstva v ui.js. */
function weightPart(S, p0, locked) {
  var w = NF.weightFor(S, p0, S.clock), cur = w.now, prev = w.before, v = cur ? cur.kg : null;
  return '<div class="k mt-3">Hmotnost pro kontrolu' + (prev ? ' <span class="muted">(při zařazení ' + prev.kg + ' kg' + (prev.date ? ', ' + e(NF.fmtShort(prev.date + 'T12:00:00')) : '') + ')</span>' : '') + '</div>' +
    '<div class="dose-field weight-field">' + V.slider({ id: 'weight', action: 'nurseWeightSet', prefix: '', kind: 'plain', min: 40, max: 160, step: 1, unit: 'kg', label: 'Hmotnost v kg', value: v, ref: prev ? prev.kg : null, refText: prev ? 'při zařazení ' + prev.kg : null, base: prev ? prev.kg : null, disabled: locked, prompt: 'Nastavte podle váhy v ordinaci' }) + '</div>' +
    (cur ? '<p class="small muted mt-1 mb-0">Lékař uvidí dlaždici „Hmotnost dříve · teď“: ' + (prev ? prev.kg + ' → ' : '') + cur.kg + ' kg.</p>' : '');
}
function sensorImportPart(S) {
  var si = S.sensorImport, d = NF.importDue(S);
  return '<details class="part" open><summary>Sestra · Data ze senzoru<span class="mini">' + (si ? 'nahráno ' + e(NF.fmtShort(si.at)) : d.missing ? NF.plural(d.missing, 'zápis bez průběhu z exportu', 'zápisy bez průběhu z exportu', 'zápisů bez průběhu z exportu') : 'kompletní') + '</span></summary><div class="body">' +
    '<p class="small">Sestra nahraje export ze senzoru, který pacient poslal do ordinace před kontrolou. Aplikace ho převede a doplní průběh glukózy k zápisům, noční hodnoty pro posouzení bazálu a čas v cíli. Soubor se čte jen v tomto počítači.</p>' + /* SCHEMA 74 (vlastník 27. 10. 2026): o podobě exportu a cestě k němu se v maketě nemluví */
    /* S06 (21. 10. 2026): po nahrání výsledek nahoře a výběr souboru až pod „Nahrát jiný soubor“, aby nestálo „Soubor nevybrán“ */
    (si ? hint('<b>' + e(NF.importText(si)) + '</b> ' + (NF.day(si.from) === NF.day(si.to) ? '(' + e(NF.fmtShort(si.from)) + ')' : '(' + (si.days ? 'za ' + NF.plural(si.days, 'den', 'dny', 'dní') + ', ' : '') + e(NF.fmtShort(si.from)) + ' – ' + e(NF.fmtShort(si.to)) + ')') + /* 02 #1: stejné období a počet dní jako dlaždice */
      (NF.importAgreeText(si) ? '<br><span class="small muted">' + e(NF.importAgreeText(si)) + '</span>' : '') + (si.again ? '<br><span class="small">Tentýž export byl nahrán znovu (' + e(dateTime(si.again)) + '); nic nového nepřibylo.</span>' : ''), 'ok') : '') + /* C6 (31/03) */ /* SCHEMA 74: jen „Export nahrán a převeden · doplněno N jídel a N nocí“; shoda opsaných hodnot (doklad pro studii) zvlášť */
    (si ? '<details class="more"><summary>Nahrát jiný soubor</summary>' : '') +
    '<label class="field"><span>Soubor s exportem</span><input type="file" accept=".csv,text/csv,.txt" data-action="importFile"></label>' + (NF.slots.importDemo ? NF.slots.importDemo(S) : '') +
    (si ? '</details>' : '') +
    '<div class="small mt-2">' + appr(S, 'Z-IMPORT') + '</div></div></details>';
}
function safetyPart(S) {
  var all = NF.lowEvents(S, 92), ev = all.filter(function (x) { return !x.night; }), evN = all.filter(function (x) { return x.night; }), w = (S.hypoWatch || []), ss = S.sensorSummary; /* noční poklesy zapsané u snídaně zvlášť (bod 7, 1. 11. 2026) */
  /* B10 (nezávislá kontrola 27. 10. 2026): „sám zapsal“ jen poklesy zapsané mimo otázku po menší porci (u zápisu jídla), jinak se tytéž poklesy počítaly dvakrát */
  var asked = {}; w.forEach(function (x) { if (x.epId) asked[x.epId] = 1; });
  var self = ev.filter(function (x) { return x.source === 'pacient' && !(x.epId && asked[x.epId]); }).length;
  /* C7: noci pod dolním cílem z exportu (na nich stojí návrh k bazálu) */
  var t = NF.targets(S), lowNights = (S.nights || []).filter(function (n) { return n.source === 'import' && n.min < t.low; });
  /* Rozhodnutí vlastníka 30. 10. 2026 (bod 5): bez nahraného exportu report výslovně řekne, že noční hodnoty chybí (Z-IMPORT texts.nociChybi). */
  var pl0 = NF.planById(S, (S.review && S.review.planId) || S.activePlanId), from0 = pl0 ? NF.day(pl0.effectiveFrom || pl0.issuedAt) : '0000';
  var nightsIn = (S.nights || []).filter(function (n) { return n.source === 'import' && n.date >= from0; }).length, TZ = NF.texts(S, 'Z-IMPORT') || {};
  var nightsMissing = !nightsIn ? '<p class="small nights-missing"><b>' + e(TZ.nociChybi || 'Noční hodnoty nejsou k dispozici – bez exportu nelze posoudit noční poklesy.') + '</b></p>' : '';
  /* S04 (21. 10. 2026): souhrn přesně – poklesy po jídle a zvlášť čas pod cílem ze senzoru, aby neodporoval dlaždici času v cíli */
  var mini = (ev.length ? NF.plural(ev.length, 'pokles', 'poklesy', 'poklesů') + ' po jídle' : 'bez poklesu po jídle') + (evN.length ? ' · ' + NF.plural(evN.length, 'noční pokles', 'noční poklesy', 'nočních poklesů') + ' hlášené pacientem' : '') + (ss ? ' · čas pod cílem ' + ss.below + ' %' : '') + (nightsIn ? '' : ' · noční hodnoty chybí');
  return '<details class="part"' + (nightsIn ? '' : ' open') + '><summary>Bezpečnost<span class="mini">' + e(mini) + '</span></summary><div class="body">' + nightsMissing +
    (ev.length ? '<ul class="plain small">' + ev.slice(-10).map(function (x) { return '<li>' + e(dateTime(x.at)) + ' · ' + e(NF.mealLabel(x.meal, true)) + ' · ' + (x.source === 'senzor' ? 'ze senzoru' : 'hlášeno pacientem') + '</li>'; }).join('') + '</ul>' : '<p class="small muted">Žádný pokles pod dolní cíl do 4 h po jídle ani hlášený pacientem.</p>') +
    /* nezodpovězené sledování nezaniká: lékař vidí „bez odpovědi“ zvlášť od „ne“ a od otázek, které ještě běží (nález 4, 23. 10. 2026) */
    '<p class="small">Po menší porci nebo vynechaném jídle s inzulinem se aplikace ' + w.length + '× zeptala na pokles. Odpovědi „pod 4 mmol/l“: ' + w.filter(function (x) { return x.answer === 'yes'; }).length + '×, „ne“: ' + w.filter(function (x) { return x.answer === 'no'; }).length + '×, „nevím“: ' + w.filter(function (x) { return x.answer === 'unknown'; }).length + '×, bez odpovědi: ' + w.filter(function (x) { return NF.hypoWatchState(S, x) === 'unanswered'; }).length + '×.' + (w.some(function (x) { var st = NF.hypoWatchState(S, x); return st === 'due' || st === 'waiting'; }) ? ' Některá otázka ještě čeká na odpověď.' : '') + (self ? ' Mimo tuto otázku pacient sám zapsal ' + NF.plural(self, 'pokles', 'poklesy', 'poklesů') + '.' : '') + '</p>' +
    (evN.length ? (function () { /* SCHEMA 82 (31/16 B2, C1): „u návrhu k bazálu“ jen když návrh opravdu je; noc, kterou export nepotvrdil, se řekne */
      var bz = S.review && S.review.proposals.filter(function (p) { return p.id === 'PR-BAZAL'; })[0], lowT = NF.targets(S).low;
      var nc = evN.filter(function (x) { var n = (S.nights || []).filter(function (m) { return m.date === NF.day(x.at); })[0]; return n && !(n.min < lowT); });
      var list = evN.map(function (x) { return 'v noci na ' + NF.fmtDM(x.at); }).join(', ').replace(/\.$/, '');
      return '<p class="small">Noční pokles pod 4, který pacient sám zapsal u snídaně: ' + e(list) + '. Počítá se do poklesů za ' + NF.param(S, 'B-HYPO', 'dny', 7) + ' dní' + (bz && (bz.nightsSelf || []).length ? ' a je i u návrhu k bazálu' : '') + '.' + (nc.length ? ' Export ' + (nc.length > 1 ? 'tyto noci' : 'tuto noc') + ' nepotvrdil (' + e(nc.map(function (x) { return 'v noci na ' + NF.fmtDM(x.at); }).join(', ')) + '); pro návrh k bazálu rozhoduje export.' : '') + '</p>';
    })() : '') +
    (lowNights.length ? '<p class="small">Noci pod ' + e(NF.mmol1(t.low)) + ' mmol/l z exportu: ' + lowNights.length + ' (' + e(lowNights.map(function (n) { return 'v noci na ' + NF.fmtDM(n.date + 'T12:00:00') + (n.lowFrom ? ' mezi ' + NF.fmtClock(n.lowFrom) + ' a ' + NF.fmtClock(n.lowTo) : '') + ' nejnižší ' + NF.mmol1(n.min); }).join(' · ')) + ' mmol/l).</p>' : '') +
    '<div class="small mt-2">' + appr(S, 'B-HYPO') + '</div></div></details>';
}
function reviewSummary(S, p, r) {
  var s = r.summary, ss = s.sensor, D = global.NutriFeeDemo, t = NF.targets(S);
  /* pruh rozmezí glukózy: pod 4 · v cíli · nad cílem, každý úsek se slovem (rozhodnutí vlastníka 19. 10. 2026) */
  /* S24: legenda ve třech stejných sloupcích s barevným klíčem; cíl na vlastním řádku (.d) */
  var tirBar = ss ? '<div class="tir" role="img" aria-label="' + e('Pod cílem ' + ss.below + ' %, v cíli ' + ss.tir + ' %, nad cílem ' + ss.above + ' %') + '"><span class="lo" style="--pct:' + ss.below + '%"></span><span class="in" style="--pct:' + ss.tir + '%"></span><span class="hi" style="--pct:' + ss.above + '%"></span></div>' +
    '<div class="tir-legend" aria-hidden="true"><span><i class="sw lo"></i>pod <b>' + ss.below + ' %</b></span><span><i class="sw in"></i>v cíli <b>' + ss.tir + ' %</b></span><span><i class="sw hi"></i>nad <b>' + ss.above + ' %</b></span></div>' : '';
  var advN = s.advice.accepted.n + s.advice.declined.n + s.advice.noAnswer.n;
  /* 23. 10. 2026 (vlastník): u sledovaných hodnot vždy dříve · teď · rozdíl a slovo zlepšuje se / zhoršuje se / beze změny vedle stavu proti cíli.
     „Dříve“ = minulé období (předchozí plán), při první kontrole výchozí hodnoty ze senzoru před zařazením (S.enrollment.baseline) a HbA1c z karty. */
  var prev = NF.prevSummary(S, p), bl = S.enrollment.baseline || {}; /* p = kontrolovaný plán */
  var prevTir = prev && prev.sensor ? prev.sensor.tir : bl.tir, prevBelow = prev && prev.sensor ? prev.sensor.below : bl.below;
  var tbrMax = t.tbrGoal != null ? t.tbrGoal : NF.DEFAULT_TARGETS.tbrGoal, belowState = ss ? (ss.below < tbrMax ? 'ok' : 'bad') : 'none'; /* mez času pod cílem je cíl pacienta (C-CILE; kontrola 4, C15, bod 8) */
  var sem = NF.semafor(S), pct = function (x) { return Math.round(x) + ' %'; }; /* prahy dlaždic z S-SEMAFOR (A14) */
  /* 02 #6: mez času pod cílem „pod 4 %“ / „4 % a víc“ – stejně jako podmínka a S-SEMAFOR. Cíl HbA1c z C-CILE (25. 10. 2026). */
  var hbaGoal = t.hba1cGoal != null ? t.hba1cGoal : NF.DEFAULT_TARGETS.hba1cGoal, hi = s.hba1cInfo || {}, hbaState = hi.now ? (hi.now.v <= hbaGoal ? 'ok' : 'warn') : 'none'; /* B3: jen nový výsledek s datem */ /* nad cílem = oranžová (barevné role 15a: červená jen pod 4 a chyby) */
  var GOAL = { tir: { ok: 'v cíli', warn: 'blízko cíle', bad: 'mimo cíl' }, below: { ok: 'méně než ' + tbrMax + ' % času', bad: tbrMax + ' % času a víc' } /* C8 (kontrola 2): „pod 4 %“ vedle „pod 4 mmol/l“ mátlo */, usual: { ok: pct(sem.porceOk) + ' a víc', warn: 'pod ' + pct(sem.porceOk), bad: 'pod ' + pct(sem.porceVar) }, ins: { ok: pct(sem.insOk) + ' a víc', warn: 'pod ' + pct(sem.insOk), bad: 'pod ' + pct(sem.insVar) }, hba: { ok: 'v cíli', warn: 'nad cílem' } };
  /* 02 #1: období souhrnu ze senzoru je přímo v řádku dlaždice; kratší pokrytí než S-SEMAFOR.min_dni je řečeno (02 #15). */
  var lowMeals = NF.lowEvents(S, 92).filter(function (x) { return !x.night; }).length; /* noční poklesy nejsou „po jídle“ */
  var minDni = sem.minDni, ssNote = ss ? 'za ' + (ss.period || 'období exportu') + (ss.days != null && ss.days < minDni ? ' (jen ' + NF.plural(ss.days, 'den', 'dny', 'dní') + ' dat, pro spolehlivý čas v cíli aspoň ' + minDni + ')' : ss.days != null ? ' (' + NF.plural(ss.days, 'den', 'dny', 'dní') + ')' : '') : 'souhrn ze senzoru chybí';
  var tiles = cmpTile(S, 'tir', 'Čas v cíli', ss ? ss.tir : null, prevTir, '%', true, s.tirState, GOAL.tir, r.tile === 'tir', tirBar, ssNote) +
    cmpTile(S, 'below', 'Čas pod ' + NF.mmol1(t.low) + ' mmol/l', ss ? ss.below : null, prevBelow, '%', false, belowState, GOAL.below, r.tile === 'below', '', ssNote + (lowMeals ? ' · hlášené poklesy po jídle: ' + lowMeals + ' (pod 4 mmol/l podle pacienta; v procentech času nejsou, v návrhu k dávce se počítají jako pod dolním cílem)' : '')) + /* B8 (27. 10. 2026) */
    (hi.before || hi.now ? cmpTile(S, 'hba', 'HbA1c', hi.now ? hi.now.v : null, hi.now && hi.before ? hi.before.v : null, 'mmol/mol', false, hbaState, GOAL.hba, r.tile === 'hba', '', hi.now ? 'odběr ' + hbaWhen(hi.now) + (hi.before && hi.before.date ? ' (dříve ' + hbaWhen(hi.before) + ')' : '') + ' · cíl do ' + hbaGoal : 'nový výsledek od začátku plánu chybí' + (hi.before ? ' (poslední ' + hi.before.v + ' mmol/mol' + (hi.before.date ? ' z ' + hbaWhen(hi.before) : '') + ')' : '') + ' · cíl do ' + hbaGoal) : '') +
    cmpTile(S, 'usual', 'Obvyklá porce', s.usualPct, prev ? prev.usualPct : null, '%', true, NF.pctState(s.usualPct, sem.porceOk, sem.porceVar), GOAL.usual, r.tile === 'usual', '', s.usual + ' ' + NF.z(s.meals) + ' ' + s.meals + ' jídel · ' + (s.meals - s.usual) + '× jinak' + (s.snacks ? ' · ' + NF.plural(s.snacks, 'svačina', 'svačiny', 'svačin') : '')) +
    cmpTile(S, 'ins', 'Inzulin podle plánu', s.asPct, prev ? prev.asPct : null, '%', true, NF.pctState(s.asPct, sem.insOk, sem.insVar), GOAL.ins, r.tile === 'ins', '', s.other + '× jinak · ' + s.none + '× bez inzulinu · ' + s.unknown + '× neví') +
    tileBtn(S, 'adv', 'Přijaté rady', advN ? s.advice.accepted.n + ' <small>' + NF.z(advN) + ' ' + advN + '</small>' : EMPTY, 'jídel s přijatou radou · ' + s.advice.declined.n + ' jídel bez přijaté rady · ' + s.advice.noAnswer.n + ' jídel bez odpovědi', /* jednotka „jídel“, ne nabídek (02 #7, A25) */ 'c-none', r.tile === 'adv') +
    tileBtn(S, 'ill', 'Mimo učení', s.illDays + ' <small>' + (s.illDays === 1 ? 'den' : s.illDays >= 2 && s.illDays <= 4 ? 'dny' : 'dní') + ' nemoci</small>', (s.incomplete ? 'a ' + NF.plural(s.incomplete, 'zápis bez dat ze senzoru', 'zápisy bez dat ze senzoru', 'zápisů bez dat ze senzoru') : 'žádný zápis bez dat ze senzoru') + (s.slotsAll ? ' · zapsáno ' + s.meals + ' ' + NF.z(s.slotsAll) + ' ' + s.slotsAll + ' hlavních jídel · nejvyšší hodnota u ' + s.withPeak + ' ' + NF.z(s.meals) + ' ' + s.meals : ''), /* kontrola 4 (07 B8): spolehlivost dat bez hodnocení */ /* C6: „3 dny nemoci · 2 zápisy bez dat“ místo „3+2“ */ (s.illDays >= sem.mimoDni && !semOff(S) ? 'c-warn' : 'c-none') + ' wide', r.tile === 'ill', '', semOff(S) ? '– semafor vypnutý' : s.illDays >= sem.mimoDni ? '! ' + NF.plural(sem.mimoDni, 'den', 'dny', 'dní') + ' a víc' : '– v normě (pod ' + NF.plural(sem.mimoDni, 'dnem', 'dny', 'dny') + ')'); /* prah S-SEMAFOR.mimo_dni (A14) */
  /* Hmotnost dříve · teď (rozhodnutí vlastníka 4. 11. 2026, bod 6): bez cíle, jen srovnání; sestra ji vybrala před lékařem. */
  var wg = s.weight || NF.weightFor(S, p, r.startedAt), wNow = wg.now ? wg.now.kg : null, wPrev = wg.before ? wg.before.kg : null, wDiff = wNow != null && wPrev != null ? wNow - wPrev : null;
  tiles += tileBtn(S, 'weight', 'Hmotnost', wNow != null ? wNow + ' <small>kg</small>' : EMPTY, wNow == null ? 'sestra hmotnost zatím nevybrala' + (wPrev != null ? ' · při zařazení ' + wPrev + ' kg' : '') : wPrev != null ? 'dříve ' + wPrev + ' → teď ' + wNow + ' · ' + (wDiff > 0 ? '+' : wDiff < 0 ? '−' : '±') + Math.abs(wDiff) + ' kg' + (wg.now.date ? ' · ' + e(NF.fmtShort(wg.now.date + 'T12:00:00')) : '') : 'první údaj · bez srovnání', 'c-none', r.tile === 'weight', '', wNow == null ? '– bez dat' : wDiff == null ? '– bez srovnání' : wDiff === 0 ? '– beze změny' : '– ' + (wDiff < 0 ? 'o ' + Math.abs(wDiff) + ' kg méně' : 'o ' + wDiff + ' kg více'));
  /* Kontrola 4 (prohlížeč M3): oznámení k zamítnutým cílům (jen záznam nesouhlasu) je pod řádkem štítků, ne v něm – štítek semaforu zůstává na místě. */
  var noOff = function (id) { var h = appr(S, id), o = V.off(S, id); return o && h.slice(-o.length) === o ? h.slice(0, h.length - o.length) : h; };
  var out = '<div class="tiles-block"><div class="tiles report">' + tiles + '</div><p class="small muted mt-1 mb-2">Dlaždice vycházejí z: ' + noOff('C-CILE') + ' ' + appr(S, 'S-SEMAFOR') + ' ' + appr(S, 'D-CISTA') + ' ' + appr(S, 'S-SOUHRN') + '</p></div>' + /* SCHEMA 84: dlaždice a řádek štítků v jednom bloku (rámeček kroku) */ (NF.itemState(S, 'C-CILE') === 'rejected' ? V.off(S, 'C-CILE') : '');
  if (r.tile) out += card(tileDetail(S, p, r, r.tile), 'tint');
  /* tkanina zápisů celého období (Podpis C, 20. 10. 2026): za dvě sekundy obraz, jak pacient zapisoval – jen činy, žádná glukóza */
  var wv = NF.weave(S, p.effectiveFrom || p.issuedAt, NF.addDays(r.startedAt, -1));
  if (wv.days.length) out += card('<div class="card-head"><h2 class="card-title">Zápisy za období</h2><span class="muted">' + e(NF.fmtShort(wv.days[0].date + 'T12:00:00')) + ' – ' + e(NF.fmtShort(wv.days[wv.days.length - 1].date + 'T12:00:00')) + ' · ' + NF.plural(wv.days.length, 'den', 'dny', 'dní') + '</span></div>' + V.weave(wv, false) +
    '<p class="small muted mt-2 mb-0">Pruh ukazuje jen činy pacienta: zápisy jídel, vynechání se zápisem a potvrzení bazálu, hodnoty glukózy ne. Dny nemoci jsou tlumené.</p>', 'weave-card');
  out += card('<p><b>Co se dělo:</b> ' + e(leadSentence(S, s, p)) + ' <span class="small muted">' + appr(S, 'S-SOUHRN') + '</span></p>', 'tint');
  /* 21. 10. 2026: léky mimo inzulin od minulé kontroly – jen záznam do stopy, aby šla analýza studie očistit (15 odst. 1) */
  /* Kontrola 4 (bod 7): léky zjistí sestra před lékařem; lékař vidí její odpověď a může ji změnit. Třetí volba „změnil se zdravotní stav“ (06 B4). */
  /* SCHEMA 84 (rozhodnutí vlastníka 4. 11. 2026, bod 5): kohorta jen inzulin – otázka „Začal pacient brát jiný lék na diabetes?“; zdravotní stav zvlášť (C8). */
  var medsV = NF.medsValue(r.meds), healthV = r.health, byNurse = S.nurseCheck && NF.medsValue(S.nurseCheck.meds) === medsV && medsV;
  out += card('<div class="card-head"><h2 class="card-title">' + e(NF.MEDS_QUESTION) + '</h2><span class="muted">' + (byNurse ? 'zjistila sestra' : 'tablety, GLP-1, jiné') + '</span></div>' +
    '<div class="timechips" role="group" aria-label="' + e(NF.MEDS_QUESTION) + '">' + NF.NURSE_MEDS.map(function (x) { return choice(e(x[1]), 'reviewMeds', x[0], medsV === x[0], 'sm'); }).join('') + '</div>' +
    '<p class="small muted mt-2 mb-0">' + e(NF.medsText(medsV)) + ' ' + appr(S, 'K-KRITERIA') + '</p>' +
    '<div class="k mt-3">' + e(NF.healthQuestion(S)) + '</div><div class="timechips" role="group" aria-label="' + e(NF.healthQuestion(S)) + '">' + NF.NURSE_HEALTH.map(function (x) { return choice(e(x[1]), 'reviewHealth', x[0], healthV === x[0], 'sm'); }).join('') + '</div>' +
    '<p class="small muted mt-2 mb-0">' + e(NF.healthText(healthV)) + '</p>', 'meds');
  out += mealOverview(S, p, r);
  out += '<h2 class="eyebrow mt-6">Podklady pro podrobnější pohled</h2>' + podklady(S, p, r);
  out += nextbar('Další krok: návrhy na příští plán (' + r.proposals.length + ')', 'Ke každému návrhu je uvedený důvod a postup ověření. Rozhodujete o nich jeden po druhém.', btn('Pokračovat k návrhům →', 'reviewStep', '2', 'primary'));
  return out;
}
/* Tabulka jídel dne (SCHEMA 84; 32/02 B1, B3, rozhodnutí 4): čistá jídla · nad cílem · medián vrcholu · vývoj v čase (první polovina · poslední 4 týdny) · co z toho vzešlo. Ranní hodnoty před snídaní zvlášť (B9). */
function mealOverview(S, p, r) {
  var t = NF.targets(S), weeks = NF.param(S, 'S-SEMAFOR', 'vyvoj_tydny', 4);
  var rowOf = function (meal) {
    var pr = r.proposals.filter(function (x) { return x.kind === 'dose' && x.dose === meal; })[0], st = pr && pr.stats; if (!pr) return '';
    var tr = st && st.trend, what = pr.row ? 'bez návrhu' : /pod cílem/.test(pr.title) ? 'karta: hodnoty pod cílem' : 'karta: hodnoty nad cílem';
    return '<tr><th scope="row">' + e(NF.mealLabel(meal, true)) + '</th><td>' + (st ? st.n : EMPTY) + '</td><td>' + (st && st.n ? st.above + ' (' + Math.round(st.above / st.n * 100) + ' %)' : EMPTY) + '</td><td>' + (st && st.med != null ? e(NF.mmol1(st.med)) : EMPTY) + '</td><td>' + (tr ? e(NF.mmol1(tr.first)) + ' → ' + e(NF.mmol1(tr.last)) + ' · ' + e(tr.word) : EMPTY) + '</td><td>' + e(what) + '</td></tr>';
  };
  var bz = r.proposals.filter(function (x) { return x.kind === 'dose' && x.dose === 'basal'; })[0], mo = bz && bz.stats && bz.stats.mornings, mt = bz && bz.stats && bz.stats.trend;
  var mornRow = mo ? '<tr><th scope="row">Ráno před snídaní</th><td>' + mo.n + '</td><td>' + (mo.n ? mo.above + ' nad ' + e(NF.mmol1(t.fastingHigh)) : EMPTY) + '</td><td>' + (mo.med != null ? e(NF.mmol1(mo.med)) : EMPTY) + '</td><td>' + (mt ? e(NF.mmol1(mt.first)) + ' → ' + e(NF.mmol1(mt.last)) + ' · ' + e(mt.word) : EMPTY) + '</td><td>' + e(bz.row ? 'bez návrhu' : 'karta: bazál') + '</td></tr>' : '';
  return card('<div class="card-head"><h2 class="card-title">Jídla dne za období</h2><span class="muted">čistá jídla · vývoj v čase</span></div><div class="tablewrap"><table><caption class="sr-only">Jídla dne za období</caption><thead><tr><th scope="col">Jídlo dne</th><th scope="col">Čistých jídel</th><th scope="col">Nad cílem</th><th scope="col">Medián vrcholu (mmol/l)</th><th scope="col">První polovina → poslední ' + NF.plural(weeks, 'týden', 'týdny', 'týdnů') + '</th><th scope="col">Výsledek</th></tr></thead><tbody>' +
    NF.MEALS.map(function (m) { return rowOf(m[0]); }).join('') + mornRow + '</tbody></table></div>' +
    '<p class="small muted mt-2 mb-0">Čistá jídla: obvyklá porce, dávka podle plánu a včas, mimo nemoc, s úplnými daty. Vývoj v čase: medián vrcholu v první polovině období a v posledních ' + NF.plural(weeks, 'týdnu', 'týdnech', 'týdnech') + '; slovo směru až od rozdílu ' + e(NF.mmol1(NF.param(S, 'S-SEMAFOR', 'smer_mmol', 1.0))) + ' mmol/l. U jídla dne bez návrhu máte volič dávky v kroku 2 i v kroku 3. ' + appr(S, 'D-PRAND') + ' ' + appr(S, 'S-SEMAFOR') + '</p>', 'meals-overview');
}
function tileDetail(S, p, r, key) {
  var s = r.summary, ss = s.sensor, t = NF.targets(S);
  if (key === 'tir') { var zel = t.tirGoal, zlu = Math.min(NF.param(S, 'S-SEMAFOR', 'tir_zluta', 50), zel), tbr = t.tbrGoal != null ? t.tbrGoal : NF.DEFAULT_TARGETS.tbrGoal, tbr3 = NF.param(S, 'S-SEMAFOR', 'tbr3_max', 1); /* zelená a mez pod cílem = cíle pacienta (C-CILE), kontrola 4 */ return ss ? '<h3>Čas v cíli (TIR) ' + ss.tir + ' %</h3><p>Období ' + e(ss.period) + '. Pod ' + e(NF.mmol1(t.low)) + ' mmol/l: ' + ss.below + ' % (mez pod ' + tbr + ' %), pod 3,0 mmol/l: ' + ss.veryLow + ' % (mez pod ' + tbr3 + ' %), nad ' + e(NF.mmol1(t.high)) + ' mmol/l: ' + ss.above + ' %. Dostupnost dat ' + ss.availability + ' %.</p><p class="small muted">Semafor je zelený, když je čas v cíli aspoň ' + Math.max(zel, t.tirGoal) + ' % a pod ' + e(NF.mmol1(t.low)) + ' méně než ' + tbr + ' % času. Oranžový je při čase v cíli ' + zlu + '–' + Math.max(zel, t.tirGoal) + ' %. Červený je při čase v cíli pod ' + zlu + ' %, nebo když je pod ' + e(NF.mmol1(t.low)) + ' aspoň ' + tbr + ' % času nebo pod 3,0 aspoň ' + tbr3 + ' % času. ' + appr(S, 'S-SEMAFOR') + ' ' + appr(S, 'C-CILE') + '</p>' : '<p>Souhrn ze senzoru není k dispozici.</p>'; }
  if (key === 'below') { var tbrM = t.tbrGoal != null ? t.tbrGoal : NF.DEFAULT_TARGETS.tbrGoal, b0 = S.enrollment.baseline || {}; return ss ? '<h3>Čas pod ' + NF.mmol1(t.low) + ' mmol/l: ' + ss.below + ' % (mez pod ' + tbrM + ' %)</h3><p>Podíl času senzoru pod dolním cílem za období ' + e(ss.period) + '; z toho pod 3,0 mmol/l ' + ss.veryLow + ' %. ' + (b0.below != null ? 'Před zařazením ' + b0.below + ' % (z karty). ' : '') + 'Mez je cíl pacienta z cílů glukózy. ' + appr(S, 'C-CILE') + ' ' + appr(S, 'S-SEMAFOR') + '</p>' : '<p>Souhrn ze senzoru chybí.</p>'; }
  if (key === 'ill') return '<h3>Mimo učení: ' + NF.plural(s.illDays, 'den', 'dny', 'dní') + ' nemoci, ' + NF.plural(s.incomplete, 'zápis bez dat ze senzoru', 'zápisy bez dat ze senzoru', 'zápisů bez dat ze senzoru') + '</h3><p>Zápisy z nemoci a bez dat ze senzoru se nepočítají do učení ani do návrhů k dávce.</p>' + (s.illLong ? hint('<b>Bezpečnost:</b> ' + NF.plural(s.illLong, 'období nemoci bylo delší', 'období nemoci byla delší', 'období nemoci bylo delších') + ' než ' + NF.param(S, 'P-NEMOC', 'dny', 3) + ' dny; pacient dostal kartu s pravidlem k nemoci. ' + appr(S, 'P-NEMOC'), 'warn') : '<p class="small muted">Žádné období nemoci nepřesáhlo ' + NF.param(S, 'P-NEMOC', 'dny', 3) + ' dny. ' + appr(S, 'P-NEMOC') + '</p>');
  if (key === 'usual') return '<h3>Obvyklá porce u ' + s.usual + ' ' + NF.z(s.meals) + ' ' + s.meals + ' jídel</h3><p>Obvyklá porce je množství, na které je nastavená pevná dávka. Jídla s jinou porcí se nepočítají do učení ani do návrhů k dávce – jinak by signál ukazoval na dávku, přestože příčina je v porci.</p>' + (s.snacks ? '<p class="small muted">Mimo hlavní jídla pacient zapsal ' + NF.plural(s.snacks, 'svačinu', 'svačiny', 'svačin') + ' (bez inzulinu k jídlu; do návrhů k dávce nevstupují).</p>' : '');
  if (key === 'hba') { var hb = s.hba1cInfo || {}; return '<h3>HbA1c ' + e(hbaLine(hb)) + '</h3><p>' + (hb.before ? 'Dříve: ' + hb.before.v + ' mmol/mol' + (hb.before.date ? ', odběr ' + e(hbaWhen(hb.before)) : '') + ', ' + e(hbaSrc(hb.before)) + '. ' : '') + (hb.now ? 'Teď: ' + hb.now.v + ' mmol/mol, odběr ' + e(hbaWhen(hb.now)) + ', ' + e(hbaSrc(hb.now)) + '. ' : 'Nový výsledek od začátku plánu není; vyrovnání se posoudí jen z času v cíli. ') + 'Cíl HbA1c u tohoto pacienta: do ' + (t.hba1cGoal != null ? t.hba1cGoal : NF.DEFAULT_TARGETS.hba1cGoal) + ' mmol/mol ' + appr(S, 'C-CILE') + ' (měníte ho v cílech glukózy).</p>'; }
  if (key === 'ins') return '<h3>Potvrzení inzulinu</h3><p>Podle plánu ' + s.asPlan + '×, z toho včas (nejvýš ' + NF.tolerance(S).before + ' min před jídlem nebo ' + NF.tolerance(S).after + ' min po něm) ' + s.onTime + '×; jinak ' + s.other + '×, bez inzulinu ' + s.none + '×, neví ' + s.unknown + '×. Bazál potvrzen ' + s.basalAs + ' z ' + s.basalDays + ' dnů plánu.</p><p class="small muted">Do návrhů k dávce vstupují jen jídla s dávkou potvrzenou podle plánu a včas.</p>';
  if (key === 'adv') { var a = s.advice; return '<h3>S radou bývalo níž?</h3><div class="bars">' + bar('přijato (' + a.accepted.n + ', n = ' + a.accepted.c + ')', a.accepted.med, p) + bar('nepřijato (' + a.declined.n + ', n = ' + a.declined.c + ')', a.declined.med, p) + bar('bez odpovědi (' + a.noAnswer.n + ', n = ' + a.noAnswer.c + ')', a.noAnswer.med, p) + '</div><p class="small muted mt-2">Počty jsou jídla s radou; medián vrcholu glukózy po jídle z n jídel s úplnými daty mimo nemoc. ' + (a.topReason === 'nowant' ? 'Důvod odmítnutí pacient většinou neuvedl.' : a.topReason ? 'Nejčastější důvod odmítnutí: „' + e(NF.reasonLabel(a.topReason)) + '“.' : '') + ' Srovnání z malého počtu zápisů jednoho pacienta ukazuje směr, nedokazuje účinek.</p>'; }
  return '';
}
/* Barva sloupce podle hodnoty (v cíli / nad cílem), ne podle kategorie – barevné role 15a. */
function bar(label, med, p) {
  var w = med == null ? 0 : Math.max(8, Math.min(100, (med - 4) / 12 * 100));
  var tone = med == null ? 'none' : p && p.targets && med > p.targets.high ? 'over' : 'ok';
  return '<span>' + e(label) + '</span><div class="b ' + tone + '" style="--pct:' + w + '%">' + (med == null ? EMPTY : e(NF.mmol1(med)) + ' mmol/l') + '</div>';
}
/* Jídla opakovaně nad cílem (S-SILNA): jedna věta pro lékaře, pacientovi žádný zákaz. */
function unstableLine(S) {
  var un = S.foods.filter(function (f) { return NF.confidence(S, f.id).level === 'unstable'; });
  return un.length ? '<p class="small"><b>Nestálá jídla</b> (zápisy se neshodly ani po ' + NF.param(S, 'R-REAKCE', 'maxUceni', 6) + ' zápisech): ' + e(un.map(function (f) { return f.name; }).join(', ')) + '. Aplikace se pacienta zeptá, jestli jde o totéž jídlo; vy nic neřešíte.</p>' : '';
}
/* A01 (27. 10. 2026): vrací jen vlastní blok, nebo oznámení o zamítnuté S-SILNA; „Data ze senzoru“ a „Bezpečnost“ skládá podklady() vždy. */
function strongFoods(S) {
  if (!NF.usable(S, 'S-SILNA')) return V.off(S, 'S-SILNA');
  var list = NF.strongFoods(S), max = NF.param(S, 'S-SILNA', 'maxJidel', 3), top = list.slice(0, max), rest = list.slice(max), total = list.reduce(function (a, x) { return a + x.overN; }, 0);
  var sentence = list.length ? NF.plural(list.length, 'jídlo', 'jídla', 'jídel') + ' opakovaně nad cílem, celkem ' + NF.plural(total, 'zápis', 'zápisy', 'zápisů') + ' nad cílem; nejvíc ' + top.map(function (x) { return e(x.food.name) + ' (' + x.overN + '× nad cílem)'; }).join(', ') + '.' : 'Žádné jídlo opakovaně nad cílem.';
  return '<details class="part"><summary>Jídla opakovaně nad cílem<span class="mini">' + list.length + '</span></summary><div class="body"><p><b>' + sentence + '</b></p>' + unstableLine(S) + '' +
    (top.length ? '<ul class="plain small">' + top.map(function (x) { return '<li><b>' + e(x.food.name) + '</b> – jí ' + x.st.eaten + '×, ' + x.overN + ' ' + NF.z(x.st.n) + ' ' + x.st.n + ' nad cílem, medián vzestupu ' + e(NF.mmol1(x.med)) + ' mmol/l</li>'; }).join('') + '</ul>' : '') +
    (rest.length ? '<details class="more"><summary>Další (' + rest.length + ')</summary><ul class="plain small">' + rest.map(function (x) { return '<li>' + e(x.food.name) + ' – ' + x.overN + ' ' + NF.z(x.st.n) + ' ' + x.st.n + '</li>'; }).join('') + '</ul></details>' : '') +
    '<p class="small muted">Aplikace u těchto jídel nabízí pacientovi rady k porci, pořadí, doplňku a procházce. Nic nezakazuje, jen tato jídla pacientovi sama nenabízí. ' + appr(S, 'S-SILNA') + '</p></div></details>';
}
function podklady(S, p, r) {
  var s = r.summary, a = s.advice, t = NF.targets(S);
  var foods = S.foods.filter(function (f) { return NF.foodStats(S, f.id).eaten > 0; });
  /* SCHEMA 84 (32/02 B2, C6, C7): tabulka podle jídla dne (stejné jídlo u snídaně a u večeře je vlastní řádek, i když se při stejné dávce učí dohromady – R-REAKCE),
     řazení podle počtu zápisů nad cílem, svačiny na konec; 5 řádků a zbytek pod „Další (N)“. */
  var rowsF = [];
  var inSlot = function (meal) { return function (e) { return e.meal === meal; }; };
  foods.forEach(function (f) { NF.MEALS.map(function (m) { return m[0]; }).concat(['snack']).forEach(function (meal) { var st = NF.foodStats(S, f.id, inSlot(meal), meal, 'slot:' + meal); if (!st || !st.eaten) return; rowsF.push({ f: f, meal: meal, st: st, over: st.n - st.inTarget }); }); });
  rowsF.sort(function (a, b) { return (NF.isSnack(a.meal) ? 1 : 0) - (NF.isSnack(b.meal) ? 1 : 0) || b.over - a.over || b.st.eaten - a.st.eaten; });
  var MAXF = 5, okno = NF.param(S, 'R-SKORE', 'oknoZapisu', 8);
  var foodRow = function (x) {
    var f = x.f, st = x.st, c = NF.confidence(S, f.id, x.meal), lev = [];
    if (c.level === 'known') Object.keys(NF.LEVERS).forEach(function (l) { if (l === 'portion') return; var wl = NF.foodStats(S, f.id, function (e) { return e.meal === x.meal && NF.acceptedLever(S, e, l); }, x.meal, 'slotlever:' + x.meal + ':' + l); if (wl.n) lev.push({ lever: l, st: wl, multi: wl.usable.filter(function (e) { return NF.multiAdvice(S, e); }).length }); });
    var base = NF.foodStats(S, f.id, function (e) { return e.meal === x.meal && !NF.countedAdvice(S, e).some(function (a) { return a.accepted === true && a.lever !== 'portion'; }); }, x.meal, 'slotbase:' + x.meal), minN = NF.param(S, 'S-SOUHRN', 'min_n', 8), dMin = NF.param(S, 'S-SOUHRN', 'rozdil_mmol', 1.0);
    var lower = function (y) { return y.st.n >= minN && base.n >= minN && y.st.med != null && base.med != null && base.med - y.st.med >= dMin; };
    /* A09: sloupec „V cíli“ ukazuje základ štítku reakce (posledních R-SKORE.oknoZapisu zápisů); A10: hodnocení „s radou bývalo níž“ jen podle R10; A16: značka dvou rad. */
    var rb = st.recent && st.recent.n ? st.recent : { n: st.n, inTarget: st.inTarget };
    var vCili = st.n ? rb.inTarget + ' ' + NF.z(rb.n) + (st.n > okno ? ' posledních ' : ' ') + rb.n : EMPTY;
    return '<tr><td><b>' + e(f.name) + '</b>' + (f.custom ? ' <span class="tag">vlastní</span>' : '') + '</td><td>' + e(NF.mealLabel(x.meal)) + '</td><td>' + V.levelTag(c.level) + '</td><td>' + st.eaten + '× · ' + st.n + ' započítáno</td><td>' + V.reactionTag(c.reaction) + '</td><td>' + (st.n ? x.over + ' ' + NF.z(st.n) + ' ' + st.n : EMPTY) + '</td><td>' + vCili + '</td><td>' + (st.n ? e(NF.mmol1(st.lo)) + '–' + e(NF.mmol1(st.hi)) : EMPTY) + '</td><td>' + (lev.length ? lev.map(function (y) { return e(NF.LEVERS[y.lever].label) + ' (' + y.st.inTarget + ' ' + NF.z(y.st.n) + ' ' + y.st.n + ')' + (y.multi ? ' · ' + y.multi + '× ' + NF.WITH_OTHER : '') + (lower(y) ? ' · s radou bývalo níž' : ''); }).join('<br>') : EMPTY) + '</td></tr>';
  };
  var fHead = '<thead><tr><th scope="col">Jídlo</th><th scope="col">Jídlo dne</th><th scope="col">Úroveň</th><th scope="col">Zapsáno</th><th scope="col">Reakce</th><th scope="col">Nad cílem</th><th scope="col">V cíli</th><th scope="col">Vrchol (mmol/l)</th><th scope="col">Zkoušené rady (v cíli)</th></tr></thead>';
  var out = sensorImportPart(S) + safetyPart(S) + strongFoods(S) + '<details class="part"><summary>Reakce na jednotlivá jídla<span class="mini">' + foods.filter(function (f) { return NF.confidence(S, f.id).level === 'known'; }).length + ' známých · ' + foods.length + ' celkem</span></summary><div class="body"><div class="tablewrap"><table><caption class="sr-only">Reakce na jednotlivá jídla podle jídla dne</caption>' + fHead + '<tbody>' +
    rowsF.slice(0, MAXF).map(foodRow).join('') + '</tbody></table></div>' +
    (rowsF.length > MAXF ? '<details class="more"><summary>Další (' + (rowsF.length - MAXF) + ')</summary><div class="tablewrap"><table><caption class="sr-only">Další jídla</caption>' + fHead + '<tbody>' + rowsF.slice(MAXF).map(foodRow).join('') + '</tbody></table></div></details>' : '') +
    '<p class="small muted">Řádek je jídlo u jednoho jídla dne, seřazeno podle počtu zápisů nad cílem; svačiny na konci. Reakce je podíl zápisů s vrcholem nejvýš ' + e(NF.mmol1(t.high)) + ' mmol/l. Od ' + Math.round(NF.param(S, 'R-SKORE', 'mirna', 0.5) * 100) + ' % v cíli z posledních ' + NF.param(S, 'R-SKORE', 'oknoZapisu', 8) + ' zápisů je jídlo „většinou v cíli“. „S radou bývalo níž“ jen od ' + NF.param(S, 'S-SOUHRN', 'min_n', 8) + ' zápisů s radou i bez ní a rozdílu mediánů aspoň ' + e(NF.mmol1(NF.param(S, 'S-SOUHRN', 'rozdil_mmol', 1.0))) + ' mmol/l. ' + appr(S, 'R-SKORE') + ' ' + appr(S, 'R-REAKCE') + ' ' + appr(S, 'S-SOUHRN') + '</p></div></details>';
  out += '<details class="part"><summary>S radou bývalo níž?<span class="mini">jídel: ' + a.accepted.n + ' s přijatou radou · ' + a.declined.n + ' bez · ' + a.noAnswer.n + ' bez odpovědi</span></summary><div class="body">' + tileDetail(S, p, r, 'adv') +
    '<div class="tablewrap mt-3"><table><caption class="sr-only">Nabídky rad podle rady</caption><thead><tr><th scope="col">Rada</th><th scope="col">Nabídek</th><th scope="col">Přijato (nabídek)</th><th scope="col">Odmítnuto (nabídek)</th><th scope="col">Bez odpovědi (nabídek)</th><th scope="col">Důvody</th></tr></thead><tbody>' + Object.keys(a.byLever).map(function (l) { var b = a.byLever[l]; return '<tr><th scope="row">' + e(NF.LEVERS[l].label) + '</th><td>' + b.offered + '</td><td>' + b.accepted + '</td><td>' + b.declined + '</td><td>' + (b.offered - b.accepted - b.declined) + '</td><td>' + Object.keys(b.reasons).map(function (k) { return e(NF.reasonLabel(k)) + ' ' + b.reasons[k] + '×'; }).join(', ') + '</td></tr>'; }).join('') + '</tbody></table></div></div></details>';
  out += '<details class="part"><summary>Plán, dávky a jejich potvrzení<span class="mini">' + (s.asPct == null ? 'zatím bez zápisů' : s.asPct + ' % podle plánu') + '</span></summary><div class="body">' + tileDetail(S, p, r, 'ins') + V.dosesTable(p) + '</div></details>';
  out += '<details class="part"><summary>Senzor<span class="mini">' + (s.sensor ? 'čas v cíli ' + s.sensor.tir + ' % · dostupnost ' + s.sensor.availability + ' %' : 'chybí') + '</span></summary><div class="body">' + tileDetail(S, p, r, 'tir') + '</div></details>';
  out += '<details class="part"><summary>Pravidla pro pacienta<span class="mini">' + (p.instructions || []).length + '</span></summary><div class="body">' + V.instructionsList(S, p, false) + '</div></details>';
  var ts = NF.trainingSummary(S);
  out += '<details class="part"' + (ts.state === 'failed' ? ' open' : '') + '><summary>Zaučení u sestry<span class="mini">' + e(ts.state === 'done' ? 'hotovo' : ts.state === 'failed' ? 'nezdařilo se' : 'čeká') + '</span></summary><div class="body"><p>' + e(ts.text) + '</p>' + (ts.state === 'failed' ? hint('Návyky pacientovi zatím neplatí a jeho zápisy slouží jen jako záznam. Domluvte nové zaučení.', 'warn') : '') + '</div></details>';
  out += '<details class="part"><summary>Otázky pacienta<span class="mini">' + S.questions.length + '</span></summary><div class="body">' + (S.questions.length ? '<ul class="plain">' + S.questions.map(function (q) { return '<li>„' + e(q.text) + '“</li>'; }).join('') + '</ul>' : '<p class="muted">Pacient si žádnou otázku neuložil.</p>') + '</div></details>';
  return out;
}

/* Značka hotového oddílu návrhové karty: fajfka místo čísla (řemeslo 16, 19. 10. 2026). */
function secMark(ok) { return ok ? '<span class="mk">' + NF.icon('check') + '</span>' : ''; }
/* Kontrola 3, C1: výčet v závorce ze stejného seznamu jako počet (zamítnuté pravidlo v něm není). */
var INSTR_SHORT = { 'I-HYPO': 'nízká glukóza', 'I-MENE': 'méně jídla', 'I-NEMOC-BAZAL': 'nemoc', 'I-NEMOC-JIDLO': 'nemoc', 'I-NEVIM': 'nevím u inzulinu', 'I-VYSOKA': 'vysoká glukóza', 'I-KONTAKT': 'kontakty' };
function instrShortList(active) { var seen = {}, out = []; active.forEach(function (c) { var t = INSTR_SHORT[c.id]; if (t && !seen[t]) { seen[t] = 1; out.push(t); } }); return out.length ? ' (' + out.join(', ') + ')' : ''; }
/* Větev postupu podle toho, co lékař ověřil. */
V.proposalBranch = function (S, pr) {
  /* Tři stavy u každého bodu: neověřeno (undefined) → čeká; sedí (true); nesedí (false) → větev podle bodu. */
  var states = pr.verify.map(function (_, i) { return NF.verifyState(S, pr, i); }); /* bod blokovaný daty (pokles pod 4) je vždy „nesedí“ (A1) */
  if (states.some(function (x) { return x === undefined; })) return { action: 'wait', text: 'dokončete ověření' };
  /* Bez schváleného postupu rozhoduje lékař sám (zásada 1); pokles pod 4 u jídla v období platí i tak (kontrola 3, A1): zvýšení se zapíše jako rozhodnutí proti datům. */
  if (!pr.branches.length) return pr.lowBlock ? { action: 'free', block: true, text: 'postup není schválen – rozhodněte sami; u jídla byl v období pokles pod 4, zvýšení dávky by šlo proti datům' } : { action: 'free', text: 'postup není schválen – rozhodněte sami' };
  var no = [], i;
  for (i = 0; i < states.length; i++) if (states[i] === false) no.push(i);
  if (!no.length) {
    var all = pr.branches.filter(function (b) { return !/nesedí/.test(b.when); })[0];
    return all || { when: 'všechny body sedí', action: 'keep', text: 'ponechat dávku – schválený postup pro tento výsledek nemá větev', missing: true };
  }
  /* Kontrola 3, A1: bod, který podle dat nesedí (pokles pod 4), má přednost před pořadím bodů – jeho větev „ponechat“ platí, ať nesedí cokoli dalšího. */
  var order = no.filter(function (k) { return NF.verifyBlocked(pr, k); }).concat(no.filter(function (k) { return !NF.verifyBlocked(pr, k); }));
  for (i = 0; i < order.length; i++) {
    var n = order[i] + 1, m = pr.branches.filter(function (b) { return new RegExp('bod ' + n + '\\b.*nesedí').test(b.when); })[0];
    if (m) return m;
  }
  /* Pro bod, který postup nezná (např. garant větev vyřadil), aplikace větev nevymýšlí a nikdy nenabídne zvýšení: „ponechat dávku“ (kontrola 3, A1). */
  return { when: 'bod ' + (order[0] + 1) + ' nesedí', action: 'keep', text: 'ponechat dávku – schválený postup pro tento bod nemá větev', missing: true };
};
function reviewProposals(S, p, r) {
  var singles = r.proposals.filter(function (pr) { return !pr.row && NF.proposalIsSingle(S, pr); }), group = r.proposals.filter(function (pr) { return !pr.row && !NF.proposalIsSingle(S, pr); }), rows = NF.reviewRows(S);
  var next = NF.nextProposal(S), decided = singles.filter(function (pr) { return r.decisions[pr.id]; }).length;
  var out = '<h2 class="mt-2">Rozhodněte ' + NF.plural(singles.length, 'návrh', 'návrhy', 'návrhů') + (group.length ? ' a potvrďte ' + NF.plural(group.length, 'položku beze změny', 'položky beze změny', 'položek beze změny') : '') + '</h2><p class="muted">Návrhy procházíte jeden po druhém a u každého najdete důvod a postup ověření. Tlačítko „Souhlasím“ přijme větev vašeho schváleného postupu; když chcete jinak, zvolte „Jiné rozhodnutí“. Položky, které nic nemění, potvrdíte na konci najednou.</p>';
  out += ['D-PRAND', 'D-BAZAL', 'D-POSTUP', 'D-CISTA'].map(function (id) { return NF.usable(S, id) ? '' : V.off(S, id); }).join('');
  singles.forEach(function (pr, i) {
    var dec = r.decisions[pr.id], now = !dec && next && pr.id === next.id;
    var cls = dec ? 'done' : now ? 'current' : 'locked'; /* 'current', ne 'now' – kolize s pacientskou kartou .now (18. 10. 2026) */
    var barIn = '<span class="n">' + (dec ? NF.icon('check') : i + 1) + '</span>', st = '<span class="state">' + (dec ? e(decisionLabel(dec, pr, p)) + (r.planIssued ? '' : ' · změnit') : now ? 'rozhodujete teď' : 'čeká') + '</span>';
    /* A12: záhlaví, které nic nedělá, není tlačítko; znovuotevření rozhodnutého je nadpis s tlačítkem uvnitř */
    out += '<section class="prop ' + cls + '">' + (dec && !r.planIssued ? '<h3 class="bar-h"><button type="button" class="bar" data-action="propReopen" data-value="' + pr.id + '" aria-expanded="false">' + barIn + '<span class="t">' + e(pr.title) + '</span>' + st + '</button></h3>' : '<div class="bar">' + barIn + '<h3>' + e(pr.title) + '</h3>' + st + '</div>');
    if (now) out += proposalBody(S, p, r, pr);
    out += '</section>';
  });
  if (group.length) {
    var allDone = group.every(function (pr) { return r.decisions[pr.id]; });
    out += '<section class="prop group ' + (allDone ? 'done' : '') + '"><div class="bar"><span class="n">' + (allDone ? NF.icon('check') : singles.length + 1) + '</span><h3>Beze změny (' + group.length + ')</h3><span class="state">' + (allDone ? 'potvrzeno' : 'jedno potvrzení') + '</span></div>' +
      '<div class="body"><p class="muted small mt-0">Tyto návrhy nic nemění; aplikace je jen připomíná. Potvrďte je najednou, nebo si kterýkoli rozhodněte zvlášť.</p><ul class="plain small keep-list">' +
      group.map(function (pr) { return '<li><span><b>' + e(pr.title) + '</b> – ' + e(pr.why) + '</span><span class="keep-act">' + (r.decisions[pr.id] ? tag('potvrzeno', 'ok') : btn('Rozhodnout zvlášť', 'propSingle', pr.id, 'quiet sm')) + '</span></li>'; }).join('') + '</ul>' +
      (allDone ? '' : '<div class="actions">' + btn('Potvrdit vše beze změny', 'propKeepAll', null, singles.every(function (pr) { return r.decisions[pr.id]; }) ? 'primary' : '') + '<span class="rule">každá položka se zapíše do stopy zvlášť</span></div>') + '</div></section>';
  }
  if (rows.length) out += doseRowsSection(S, p, r, rows);
  var complete = NF.reviewComplete(S);
  /* S02: lišta popisuje, co zbývá, ne co udělá tlačítko */
  var leftSingles = singles.map(function (pr, i) { return r.decisions[pr.id] ? null : 'návrh ' + (i + 1) + (pr.dose ? ' (' + (pr.dose === 'basal' ? 'bazál' : NF.mealLabel(pr.dose)) + ')' : ''); }).filter(Boolean);
  var groupLeft = group.filter(function (pr) { return !r.decisions[pr.id]; }).length;
  var leftText = leftSingles.concat(groupLeft ? [NF.plural(groupLeft, 'položku beze změny', 'položky beze změny', 'položek beze změny')] : []);
  out += nextbar(complete ? 'Všechny návrhy rozhodnuté' : next ? 'Další krok: návrh ' + (decided + 1) + ' ' + NF.z(singles.length) + ' ' + singles.length : 'Další krok: potvrdit položky beze změny', complete ? 'Pokračujte k potvrzení plánu.' : 'Zbývá rozhodnout ' + leftText.join(', ') + '.', btn('Pokračovat k potvrzení plánu →', 'reviewStep', '3', 'primary', complete ? '' : ' disabled'));
  return out;
}
/* SCHEMA 84 (rozhodnutí vlastníka 4. 11. 2026, bod 1): dávky bez návrhu – řádek s čísly, prahem a stejným voličem; změna se zapíše jako „jiná dávka bez návrhu“ (+ proti datům při blokujícím poklesu).
   Akce „propUnits“ (±1 i u řádku a u větve „ponechat“), „propDoseSet“ a „propDecide …:other“ s jednotkami doplní prezentační vrstva v ui.js. */
function doseRowsSection(S, p, r, rows) {
  var locked = !!r.planIssued;
  return '<section class="prop rows done"><div class="bar"><span class="n">' + NF.icon('list') + '</span><h3>Dávky bez návrhu (' + rows.length + ')</h3><span class="state">volič podle vašeho uvážení</span></div>' +
    '<div class="body"><p class="muted small mt-0">Aplikace u těchto dávek návrh nevytvořila; čísla a práh jsou tu, abyste věděli proč. Dávku určujete vy: můžete ji přesto změnit posuvníkem, zapíše se jako jiná dávka bez návrhu.</p><ul class="plain small keep-list dose-rows">' +
    rows.map(function (pr) {
      var dec = r.decisions[pr.id], units = r.newDoses[pr.dose].units, cur = p.doses[pr.dose].units, changed = dec && dec.units != null;
      var text = '<b>' + e(pr.title.replace(/ – bez návrhu$/, '')) + '</b> · dnes ' + cur + ' j. – ' + e(pr.why) + (pr.rows && pr.rows.length ? pr.rows.map(function (x) { return '<br><span class="muted">' + e(x.label) + ': ' + e(x.text) + '</span>'; }).join('') : '') + (pr.lows && pr.lows.length ? '<br><span class="muted">' + e(pr.lowsTitle || 'Poklesy pod 4') + ': ' + e(pr.lows.join('; ')) + '</span>' : '') + (pr.weak && pr.weak.length ? '<br><span class="muted">' + e(pr.weak.map(NF.cap).join('. ')) + '.</span>' : '') + (pr.item ? ' ' + appr(S, pr.item) : '');
      var act = locked ? (changed ? tag(decisionLabel(dec, pr, p), 'info') : '') : doseSlider('row-' + pr.id, pr.title.replace(/ – bez návrhu$/, ''), units, 'propDoseSet', pr.id + ':', NF.DOSE_RANGE[1], cur, 'sm') +
        (units !== cur ? btn('Jiná dávka · ' + cur + ' → ' + units + ' j.', 'propDecide', pr.id + ':other', 'sm') : '') + (changed ? tag(decisionLabel(dec, pr, p), 'info') + btn('Ponechat ' + cur + ' j.', 'propDecide', pr.id + ':keep', 'quiet sm') : '') + (pr.lowBlock && units > cur ? '<span class="small muted">zvýšení u jídla s poklesem pod 4 se zapíše jako rozhodnutí proti datům</span>' : '');
      return '<li><span>' + text + '</span><span class="keep-act">' + act + '</span></li>';
    }).join('') + '</ul></div></section>';
}
/* S25 (21. 10. 2026): u dávky rozdíl „8 → 10 j. (+2 j.)“; položky skupiny Beze změny „potvrzeno“. pr a p (kontrolovaný plán) jsou nepovinné. */
function decisionLabel(dec, pr, p) {
  var was = pr && p && pr.kind === 'dose' && p.doses[pr.dose] ? p.doses[pr.dose].units : null;
  var u = dec.units == null ? '' : was != null && was !== dec.units ? ' · ' + was + ' → ' + dec.units + ' j. (' + (dec.units > was ? '+' : '−') + Math.abs(dec.units - was) + ' j.)' : ' · ' + dec.units + ' j.';
  var data = dec.againstData ? ' · proti datům (pokles pod 4)' : '';
  if (dec.choice === 'agree') return 'souhlas' + u;
  if (dec.choice === 'other') return (dec.noProposal ? 'jiná dávka bez návrhu' : 'rozhodnuto jinak než postup') + u + data;
  if (dec.choice === 'keep') return pr && pr.group ? (dec.bulk ? 'potvrzeno beze změny' : 'potvrzeno') : 'ponechat';
  return 'zamítnuto';
}
function proposalBody(S, p, r, pr) {
  var v = {}, br = V.proposalBranch(S, pr), wait = !br || br.action === 'wait';
  pr.verify.forEach(function (_, i) { v[i] = NF.verifyState(S, pr, i); }); /* A1: bod „U jídla nebyl v období pokles pod 4“ při poklesech nesedí podle dat */
  var units = pr.kind === 'dose' ? r.newDoses[pr.dose].units : null, cur = pr.kind === 'dose' ? p.doses[pr.dose].units : null;
  var free = !wait && br.action === 'free';
  var swapOpts = pr.lever ? NF.swapOptions(S, pr) : [], swapTo = (r.swapTo && r.swapTo[pr.id]) || swapOpts[0] || null;
  var against = !wait && pr.kind === 'dose' && ((br.action === 'up' && units < cur) || (br.action === 'down' && units > cur) || (br.block && units > cur)); /* kontrola 3, A1: zvýšení při poklesu pod 4 bez postupu */
  var primary = wait ? 'Souhlasím (dokončete ověření)' : against ? 'Rozhodnout jinak než postup · ' + cur + ' → ' + units + ' j.' : br.action === 'up' || br.action === 'down' ? (units === cur ? 'Souhlasím · nastavte novou dávku' : 'Souhlasím · ' + NF.z(cur) + ' ' + cur + ' na ' + units + ' j.') : (free && pr.kind === 'dose') ? (units === cur ? 'Rozhodnout · nastavte novou dávku' : 'Rozhodnout · ' + NF.z(cur) + ' ' + cur + ' na ' + units + ' j.') : br.action === 'swap' ? 'Souhlasím · vyměnit' + (swapTo ? ' za „' + NF.LEVERS[swapTo].label + '“' : ' (vypnout)') : free ? 'Rozhodnout' : 'Souhlasím · ' + (br.text || 'ponechat');
  var choiceVal = wait ? null : (br.action === 'up' || br.action === 'down' || br.action === 'swap' || br.action === 'edit' || free) ? 'agree' : 'keep';
  var showStepper = !wait && (br.action === 'up' || br.action === 'down' || (free && pr.kind === 'dose'));
  var allYes = pr.verify.every(function (_, i) { return v[i] === true; });
  var done = pr.verify.filter(function (_, i) { return v[i] === true || v[i] === false; }).length;
  var other = r.other === pr.id;
  /* body ověření bez čísel; „Sedí“ zeleně jen u řádku, kde ho lékař vybral (řemeslo 16) */
  /* LF-06 (20. 10. 2026): u bodu číslo z dat; bod, kterému data odporují, má štítek a „Vše sedí“ ho nepřepne */
  var fact = function (i) { var f = pr.facts && pr.facts[i]; return f ? '<span class="v-fact">' + e(f.text) + '</span>' + (f.against ? tag('data říkají jinak', 'warn') : '') : ''; };
  var againstOpen = pr.verify.some(function (_, i) { return NF.verifyAgainst(pr, i) && v[i] === undefined; });
  var allOthersYes = pr.verify.every(function (_, i) { return NF.verifyAgainst(pr, i) || NF.nurseKey(pr, i) || v[i] === true; }); /* body sestry „Vše sedí“ nepřepíná (kontrola 4, bod 7) */
  var nurseTag = function (i) { var k = NF.nurseKey(pr, i); if (!k) return ''; var a = NF.nurseAnswer(S, k); return a === true ? tag('sestra s pacientem: sedí', 'ok') : a === false ? tag('sestra s pacientem: nesedí', 'warn') : tag('sestra zatím neověřila'); };
  var verifyRows = pr.verify.map(function (t, i) {
    if (NF.verifyBlocked(pr, i)) return '<div class="verify off against"><span class="v-text">' + e(t) + '<span class="v-fact">' + e(pr.facts[i].text) + '</span>' + tag('nesedí podle dat', 'bad') + '</span><span class="small muted">Nepřepíná se: větev „zvýšit“ je zablokovaná.</span></div>'; /* A1 */
    return '<div class="verify' + (v[i] === false ? ' off' : '') + (NF.verifyAgainst(pr, i) ? ' against' : '') + (NF.nurseKey(pr, i) ? ' nurse' : '') + '"><span class="v-text">' + e(t) + fact(i) + nurseTag(i) + '</span><span class="choice-row">' + choice((v[i] === true ? NF.icon('check') + ' ' : '') + 'Sedí', 'propVerify', pr.id + ':' + i + ':yes', v[i] === true, 'sm yes') + choice((v[i] === false ? NF.icon('x') + ' ' : '') + 'Nesedí', 'propVerify', pr.id + ':' + i + ':no', v[i] === false, 'sm no') + '</span></div>'; }).join('');
  var actLabel = function (b) { return b.action === 'up' ? 'zvýšit' : b.action === 'down' ? 'snížit' : b.action === 'swap' ? 'vyměnit' : b.action === 'edit' ? 'upravit' : 'ponechat'; };
  var actCls = function (b) { return b.action === 'up' || b.action === 'down' ? 'act' : b.action === 'swap' ? 'info' : ''; };
  var others = pr.branches.filter(function (b) { return !(br && !wait && b === br); });
  /* 19. 10. 2026: čísla jako dlaždice, oddíly 1–3 jako nadpisy, jen aktivní větev postupu, rozhodnutí v podbarveném pruhu */
  /* B13 (nezávislá kontrola 27. 10. 2026): „co aplikace pozorovala“ je vlastní blok se štítkem položky, ze které návrh vzniká (D-PRAND, D-BAZAL, R-POKYNY);
     štítek postupu D-POSTUP je u ověření a větve. Krok vyprávění, který ukazuje jen důvod, tak nenabízí ke schválení větve, které ještě nejsou vidět. */
  return '<div class="body"><div class="part why-part">' +
    '<p class="why mb-1"><b>Proč návrh vznikl:</b> ' + e(pr.why) + '</p>' +
    (pr.breakdown && pr.breakdown.length ? '<div class="why-tiles">' + pr.breakdown.filter(function (b) { return b.above > 0; }).slice(0, 3).map(function (b) { return '<div class="why-tile"><b>' + b.above + ' ' + NF.z(b.n) + ' ' + b.n + ' <small>nad cílem</small></b><span>' + e(b.food) + '</span></div>'; }).join('') + '</div>' : '') + /* S28: číslo a význam k sobě, jídla bez zápisu nad cílem vynechána */
    (pr.lows && pr.lows.length ? '<div class="why-row lows"><b>' + e(pr.lowsTitle || 'Poklesy pod 4') + ':</b> ' + e(pr.lows.join('; ')) + '</div>' : '') + /* A1: poklesy přímo v kartě, co aplikace pozorovala */
    (pr.rows || []).map(function (x) { return '<div class="why-row"><b>' + e(x.label) + ':</b> ' + e(x.text) + '</div>'; }).join('') + /* SCHEMA 84: vývoj v čase, ranní hodnoty, okolnosti nocí */
    (pr.context ? '<div class="why-row"><b>Celkové vyrovnání:</b> ' + e(pr.context) + '</div>' : '') +
    (pr.weak.length ? '<details class="more"><summary>Co návrh oslabuje (' + pr.weak.length + ')</summary><ul class="plain small muted mt-2 mb-0">' + pr.weak.map(function (w) { return '<li>' + e(NF.cap(w)) + (/[.!?]$/.test(w) ? '' : '.') + '</li>'; }).join('') + '</ul>' + (pr.excluded && pr.excluded.length ? '<ul class="plain small">' + pr.excluded.map(function (x) { return '<li>' + e(dateTime(x.at)) + ' · ' + e(x.why || 'bez důvodu') + '</li>'; }).join('') + '</ul><p class="small mb-0">Vyřazuje se podle pravidla ' + appr(S, 'D-CISTA') + '</p>' : '') + '</details>' : '') + /* B9: čistá data u seznamu vyřazených zápisů */
    '<p class="small mt-1 mb-0">' + appr(S, pr.item) + '</p></div>' +
    '<div class="grid2 mt-3"><div class="box verify-box"><h4 class="sec-h">' + secMark(done === pr.verify.length) + 'Ověřit s pacientem<span class="prog">' + done + ' ' + NF.z(pr.verify.length) + ' ' + pr.verify.length + '</span></h4>' + (pr.verify.length > 1 && !allOthersYes ? '<div class="actions mb-2">' + btn('Vše sedí', 'propVerifyAll', pr.id, 'sm') + '<span class="small muted">' + (pr.nurse && pr.nurse.some(Boolean) ? 'Body, které s pacientem ověřuje sestra, tím nepřepnete; vidíte její odpověď a můžete ji změnit. ' : '') + (pr.facts && pr.facts.some(function (f) { return f && f.against && !f.block; }) ? 'Bod se štítkem „data říkají jinak“ tím nepřepnete, ten posuďte sami.' : pr.facts && pr.facts.some(function (f) { return f && f.block; }) ? 'Bod, který podle dat nesedí, tím nepřepnete.' : 'Body, které nesedí, přepněte níže jednotlivě.') + '</span></div>' : againstOpen ? '<p class="small muted mb-2">Zbývá bod se štítkem „data říkají jinak“, ten posuďte sami.</p>' : '') +
    (allYes && pr.verify.length > 1 ? '<details class="more verify-sum"><summary>' + NF.icon('check', 'ok') + ' ' + pr.verify.length + ' ' + NF.z(pr.verify.length) + ' ' + pr.verify.length + ' sedí · upravit</summary>' + verifyRows + '</details>' : verifyRows) + '</div>' +
    '<div class="box"><h4 class="sec-h">' + secMark(!wait) + 'Postup říká</h4>' + (pr.postup ? '<p class="small mt-0 mb-2">' + appr(S, pr.postup) + '</p>' : '') + '<div class="branch">' + /* SCHEMA 84 (panel = rámeček): štítek postupu u větví, které z něj plynou (dřív v řádku pod tlačítky Rozhodnout) */
    (wait ? '<div class="hi">' + tag('čeká') + '<span>Ověřeno ' + done + ' ' + NF.z(pr.verify.length) + ' ' + pr.verify.length + ' bodů. Větev postupu se ukáže, až ověříte všechny.</span></div>' : free ? '<div class="active-branch">' + tag('bez postupu', 'warn') + '<span>' + e(br.text) + '</span></div>' + (br.block && units > cur ? hint('Zvýšení dávky u jídla s poklesem pod 4 se zapíše jako rozhodnutí proti datům.', 'warn') : '') : '<div class="active-branch">' + tag(actLabel(br), actCls(br)) + '<span>' + e(NF.cap(br.when)) + ': ' + e(br.text) + '</span></div>') +
    (others.length ? '<details class="more mt-2"><summary>' + (wait ? 'Větve postupu' : 'Ostatní větve postupu') + ' (' + others.length + ')</summary>' + others.map(function (b) { return '<div>' + tag(actLabel(b), actCls(b)) + '<span>' + e(NF.cap(b.when)) + ': ' + e(b.text) + '</span></div>'; }).join('') + '</details>' : '') +
    (!wait && br.action === 'edit' ? reviewInstructions(S, r) : '') +
    (!wait && br.action === 'swap' && swapOpts.length ? '<div class="mt-3"><div class="k">Místo ní nabízet</div><div class="choice-row">' + swapOpts.map(function (l) { return choice(e(NF.LEVERS[l].label), 'propSwapTo', pr.id + ':' + l, swapTo === l, 'sm'); }).join('') + choice('Jen vypnout', 'propSwapTo', pr.id + ':none', swapTo === null && r.swapTo && r.swapTo[pr.id] === 'none', 'sm') + '</div>' + (swapTo && NF.HABIT_OF[swapTo] ? '<p class="small muted mt-2 mb-0">S touto radou přibude do plánu návyk „' + e(NF.LEVERS[swapTo].label) + '“.</p>' : '') + '</div>' : '') + '</div></div></div>' +
    '<div class="decide"><h4 class="sec-h w-full mb-1">Rozhodnout' + (pr.kind === 'dose' ? '<span class="prog">dnes ' + cur + ' j., novou dávku volíte vy</span>' : '') + '</h4>' +
    (showStepper ? doseSlider('prop-' + pr.id, 'Nová dávka', units, 'propDoseSet', pr.id + ':', NF.DOSE_RANGE[1], cur) : '') + /* SCHEMA 84 (rozhodnutí 9): posuvník se značkou „dnes“; aplikace výši nenavrhuje */
    (showStepper && units !== cur ? '<span class="diff" aria-live="polite">' + (units > cur ? '+' : '−') + Math.abs(units - cur) + ' j. <small>(' + cur + ' → ' + units + ')</small></span>' : '') + /* rozdíl velkým písmem; aplikace ho nenavrhuje, jen ukazuje lékařovu volbu (19. 10. 2026) */
    btn(e(primary), 'propDecide', pr.id + ':' + (choiceVal || 'agree'), against ? '' : 'primary', wait || (showStepper && units === cur) ? ' disabled' : '') +
    btn('Jiné rozhodnutí', 'propOther', pr.id, 'quiet') +
    (against ? '<p class="hint warn full mt-2 mb-0">Změna jde proti větvi vašeho postupu; zapíše se jako „rozhodnuto jinak než postup“.</p>' : '') +
    (showStepper && units === cur && !wait ? '<p class="small muted full mt-1 mb-0">Nastavte novou dávku posuvníkem; aplikace ji nenavrhuje.</p>' : '') +
    '<span class="rule">rozhodnutí se zapíše do stopy</span></div>' +
    (other ? '<div class="box mt-3"><div class="k">Jiné rozhodnutí</div>' + (wait ? '<p class="small muted mt-1 mb-2">Ponechat nebo zamítnout můžete i bez dokončeného ověření.</p>' : '') + '<div class="choice-row">' + btn('Ponechat beze změny', 'propDecide', pr.id + ':keep', 'sm') + '</div>' +
      /* SCHEMA 84 (rozhodnutí vlastníka 4. 11. 2026, bod 1): volič „jiná dávka“ i u větve „ponechat“ – větev je doporučení, ne zámek; zapíše se jako rozhodnuto jinak než postup, při blokujícím poklesu proti datům */
      (pr.kind === 'dose' && !showStepper ? '<div class="small mt-3 mb-1"><b>Jiná dávka:</b> ' + (wait ? 'nejdřív dokončete ověření, ať víte, co postup říká.' : 'dávku určujete vy; změna proti větvi postupu se zapíše jako „rozhodnuto jinak než postup“' + (pr.lowBlock ? ' a zvýšení u jídla s poklesem pod 4 jako rozhodnutí proti datům' : '') + '.') + '</div>' +
        (wait ? '' : '<div class="decide other-dose">' + doseSlider('other-' + pr.id, 'Jiná dávka', units, 'propDoseSet', pr.id + ':', NF.DOSE_RANGE[1], cur) + (units !== cur ? '<span class="diff" aria-live="polite">' + (units > cur ? '+' : '−') + Math.abs(units - cur) + ' j. <small>(' + cur + ' → ' + units + ')</small></span>' : '') + btn(units === cur ? 'Jiná dávka · nastavte posuvníkem' : 'Jiná dávka · ' + cur + ' → ' + units + ' j.', 'propDecide', pr.id + ':other', '', units === cur ? ' disabled' : '') + '</div>') : '') +
      '<div class="small mt-3 mb-1"><b>Zamítnout s důvodem:</b></div><div class="choice-row">' + ['jiná příčina', 'pacient si nepřeje', 'počkat na další data', 'klinický důvod'].map(function (x) { return btn(e(x), 'propDecide', pr.id + ':reject:' + x, 'sm'); }).join('') + '</div></div>' : '') + /* A4 (31/03): v ordinaci se nepíše (zásada 8) – volné pole „Komentář“ zrušeno, důvod je volbou */
    '</div>';
}
function reviewConfirm(S, p, r) {
  var hc = NF.habitCatalog();
  var nxt = r.planIssued ? NF.planById(S, r.planIssued) : NF.planFromReview(S);
  var prevPlan = r.planIssued ? NF.planById(S, nxt.previousId) : p;
  var habTitle = function (id) { var h = hc.filter(function (x) { return x.id === id; })[0]; return h ? h.title : id; };
  var habitsHtml = nxt.habits.map(function (id) { return '<li>' + e(habTitle(id)) + (prevPlan.habits.indexOf(id) < 0 ? ' ' + tag('nový', 'info') : '') + '</li>'; }).join('') + prevPlan.habits.filter(function (id) { return nxt.habits.indexOf(id) < 0; }).map(function (id) { return '<li class="muted struck">' + e(habTitle(id)) + '</li>'; }).join('');
  /* SCHEMA 84 (rozhodnutí vlastníka 4. 11. 2026, bod 6; 32/02 B8): návyky s přepínači z katalogu (jako při zařazení) a cíle voličem; „Beze změny“ je výchozí. Akce „revHabit“ doplní prezentační vrstva v ui.js. */
  if (!r.planIssued) habitsHtml = '<div class="stack">' + hc.filter(function (h) { return NF.usable(S, h.item); }).map(function (h) { var on = nxt.habits.indexOf(h.id) >= 0, was = prevPlan.habits.indexOf(h.id) >= 0; return '<button type="button" class="habit-opt ' + (on ? 'on' : '') + '" data-action="revHabit" data-value="' + h.id + '" aria-pressed="' + on + '"><span class="dot">' + (on ? NF.icon('check') : '') + '</span><span><b>' + e(h.title) + '</b>' + (on && !was ? ' ' + tag('nový', 'info') : !on && was ? ' ' + tag('vyřazen', 'warn') : on ? ' ' + tag('beze změny') : '') + '<small>Pacient uvidí: „' + e(h.why) + '“</small></span></button>'; }).join('') + '</div>';
  var locked3 = !!r.planIssued;
  /* Volič dávky v kroku 3 (rozhodnutí 1): každá dávka má posuvník s −/+ (rozhodnutí 9); změna se zapíše k návrhu nebo řádku dané dávky jako „rozhodnuto jinak než postup“ / „jiná dávka bez návrhu“. Akce „revDose“, „revDoseSet“ doplní ui.js. */
  var doseLine = function (k) {
    var ch = nxt.doses[k].units !== prevPlan.doses[k].units, dec = (function () { var pr = r.proposals.filter(function (x) { return x.kind === 'dose' && x.dose === k; })[0]; return pr && r.decisions[pr.id]; })();
    var v = (ch ? '<span class="muted struck">' + prevPlan.doses[k].units + '</span> → <b>' + nxt.doses[k].units + ' j.</b> ' + tag('nová dávka', 'info') : nxt.doses[k].units + ' j.') + (dec && dec.choice === 'other' ? ' ' + tag(dec.noProposal ? 'jiná dávka bez návrhu' : 'jinak než postup', 'warn') : '');
    if (locked3) return kv(k === 'basal' ? 'Bazál na noc · ' + prevPlan.doses.basal.time : NF.mealLabel(k, true), v);
    return '<div class="dose-field"><div class="k">' + e(k === 'basal' ? 'Bazál na noc · ' + prevPlan.doses.basal.time : NF.mealLabel(k, true)) + ' <span class="muted">dnes ' + prevPlan.doses[k].units + ' j.</span></div>' + doseSlider('rev-' + k, k === 'basal' ? 'Bazál' : NF.mealLabel(k, true), nxt.doses[k].units, 'revDoseSet', k + ':', NF.DOSE_RANGE[1], prevPlan.doses[k].units, 'sm') + (ch ? '<span class="small">' + v + '</span>' : '') + '</div>';
  };
  var validityHtml = locked3 ? (nxt.validUntil ? kv('Platnost do', e(NF.fmtShort(nxt.validUntil)) + ' (příští kontrola)') : '') : '<div class="k mt-3">Platnost plánu (příští kontrola)</div><div class="timechips" role="group" aria-label="Platnost plánu">' + NF.VALIDITY_OPTIONS.map(function (o) { return choice(e(o[1]), 'revValidity', String(o[0]), (r.validDays || NF.VALIDITY_DEFAULT) === o[0], 'sm'); }).join('') + '</div><p class="small muted mt-1">Do ' + e(NF.fmtShort(nxt.validUntil)) + '.</p>'; /* C9 (32/02) */
  var adv = nxt.advice || { off: [], prefer: [] };
  var adviceHtml = Object.keys(NF.LEVERS).filter(function (l) { return l !== 'portion'; }).map(function (l) { return '<li>' + e(NF.LEVERS[l].label) + ' ' + (!NF.usable(S, NF.LEVERS[l].item) ? tag('nepoužívá se (položka registru zamítnuta)', 'bad') : adv.off.indexOf(l) >= 0 ? tag('vypnuto', 'bad') : adv.prefer.indexOf(l) >= 0 ? tag('nabízet přednostně', 'info') : tag('nabízí se podle reakce')) + '</li>'; }).join('');
  var changes = ['basal', 'breakfast', 'lunch', 'dinner'].filter(function (k) { return nxt.doses[k].units !== prevPlan.doses[k].units; });
  var out = card('<h2>Shrnutí rozhodnutí</h2><ul class="plain">' + r.proposals.filter(function (pr) { return !pr.row || (r.decisions[pr.id] && r.decisions[pr.id].units != null); }).map(function (pr) { var d = r.decisions[pr.id]; return '<li><b>' + e(pr.title) + '</b> – ' + (d ? e(decisionLabel(d, pr, prevPlan)) + (d.reason ? ' (' + e(d.reason) + ')' : '') + (d.comment ? ' · „' + e(d.comment) + '“' : '') : tag('nerozhodnuto', 'warn')) + '</li>'; }).join('') + '</ul>') + /* SCHEMA 84: řádek bez návrhu jen s jinou dávkou */
    /* S13: nová dávka schválená lékařem informačně, ne oranžovým upozorněním. N04/N05: platnost a cíle jako u P1, nadpisy skupin s odstupem. */
    card('<h2>Nový plán ' + (r.planIssued || 'P' + (S.plans.length + 1)) + '</h2><div class="grid2"><div><h3 class="mt-0">Dávky</h3>' + (locked3 ? '' : '<p class="small muted">Dávku určujete vy. Volič je u každé dávky; aplikace žádnou výši nenavrhuje.</p>') + ['breakfast', 'lunch', 'dinner', 'basal'].map(doseLine).join('') +
      (changes.length ? hint('Po změně dávky začne učení k radám u jídel znovu. Staré zápisy zůstanou označené původní dávkou.', 'neutral') : '') +
      validityHtml + (locked3 ? targetsKv(nxt.targets || prevPlan.targets) : '<h3 class="mt-4">Cíle glukózy ' + appr(S, 'C-CILE') + '</h3>' + targetsGrid(r.newTargets, 'revTarget')) + '</div>' +
      '<div><h3 class="mt-0">Návyky</h3>' + (locked3 ? '<ul class="plain small">' + habitsHtml + '</ul>' : habitsHtml) + '<h3 class="mt-4">Rady</h3><ul class="plain small">' + adviceHtml + '</ul><h3 class="mt-4">Bezpečnostní pravidla</h3>' +
      /* B12 (32/02): lékař podepisuje, že u pacienta nic nezměnil, ne že pravidla schválil – obecná pravidla NutriFee se štítkem verze */
      '<p class="small muted">' + e('Platí obecná pravidla NutriFee ' + ((NF.item(S, 'R-POKYNY') || {}).version || 'v1') + ' · ' + (NF.instructionExceptions(S, nxt.instructions || []).length ? 'u pacienta s výjimkou: ' + NF.instructionExceptions(S, nxt.instructions || []).join(', ') : 'beze změny u pacienta')) + (r.decisions['PR-POKYNY'] ? ' ' + tag(decisionLabel(r.decisions['PR-POKYNY'], r.proposals.filter(function (x) { return x.id === 'PR-POKYNY'; })[0], prevPlan), 'ok') : '') + ' ' + appr(S, 'R-POKYNY') + '</p>' + V.instructionsList(S, nxt, true) + '</div></div>');
  var chText = changes.map(function (k) { return (k === 'basal' ? 'bazál' : NF.mealLabel(k)) + ' ' + prevPlan.doses[k].units + ' → ' + nxt.doses[k].units + ' j.'; }).join(' · ');
  /* Rozhodnutí vlastníka 25. 10. 2026: při dvou a více změnách dávek neutrální věta z D-POSTUP (texts.postupne); žádný zámek, žádný směr. */
  var many = !r.planIssued && changes.length >= 2 ? NF.manyDosesText(S, changes.length) : '';
  if (many) out += hint(e(many) + ' <span class="small muted">Věta pochází z vašeho schváleného postupu posouzení dávky.</span>', 'neutral');
  out += nextbar(r.planIssued ? 'Plán ' + r.planIssued + ' je vydaný' : 'Vydáte plán P' + (S.plans.length + 1) + ': ' + (chText || 'dávky beze změny'), r.planIssued ? 'Pokračujte k předání.' : (many ? many + ' ' : '') + 'Vydání nejde vzít zpět. Pacient změny uvidí, až aplikaci příště otevře.', r.planIssued ? btn('Ukázat pacientovi →', 'reviewStep', '4', 'primary') : btn('Vydat plán', 'issueP2', null, 'primary'));
  return out;
}
function reviewHandover(S, p, r) {
  return '<div class="split-wrap"><div class="split"><div>' + card('<h2>Předání pacientovi</h2><p>Pacient vidí na telefonu, co se změnilo a proč, a potvrdí převzetí. Tím kontrola končí. Do příští kontroly vám aplikace nic neposílá a nic po vás nežádá.</p>' + kv('Příští kontrola', e(NF.fmtDate(S.nextVisit))) + '<div class="actions">' + btn('Zobrazit zařazení a plán', 'page', 'enroll', '') + '</div>') + '</div>' +
    '<div class="phone-preview"><div class="island"></div>' + V.patient(S, 'newplan') + '</div></div></div>';
}

/* --- schvalovací registr --- */
/* Dva stavy rozhodnutí (vlastník 27. 10. 2026): ke schválení · schváleno · zamítnuto. Poznámka je vlastnost položky (první věta v řádku, celá v detailu). */
function noteLine(t) { var x = String(t || '').replace(/\s+/g, ' ').trim(), m = x.match(/^[\s\S]*?[.!?…](?=\s|$)/), f = m ? m[0] : x; return f.length > 90 ? f.slice(0, 88) + '…' : f; }
V.noteLine = noteLine;
/* Stav pro obrazovku registru. Prezentační vrstva může registr ukázat jako ostrou aplikaci s modelovými rozhodnutími (NF.slots.registryModel):
   pak platí stav z historie položky (poslední rozhodnutí po poslední verzi), ne rozhodnutí garanta v ukázce. */
function regState(S, r) {
  if (!(NF.slots.registryModel && NF.slots.registryModel(S))) return NF.itemState(S, r.id);
  if (r.status === 'rejected' || r.status === 'pending') return r.status;
  var hs = S.registry.history.filter(function (h) { return h.item === r.id && (h.kind === 'decision' || h.kind === 'version'); });
  return hs.length && hs[hs.length - 1].kind === 'decision' ? r.status : 'pending';
}
V.registry = function (S) {
  var f = S.reg || {}, q = (f.q || '').toLowerCase();
  var sum = NF.registrySummary(S);
  var items = NF.garantItems(S).filter(function (r) {
    var st = NF.itemState(S, r.id), note = NF.itemNote(S, r.id);
    var text = (r.title + ' ' + r.id + ' ' + r.summary + ' ' + (r.detail || '') + ' ' + (r.text || '') + ' ' + note).toLowerCase();
    if (f.keep && r.id === f.keep) return true; /* právě rozhodnutá položka nezmizí ze seznamu, dokud se nezmění filtr (02 #20) */
    return (!f.cat || r.cat === f.cat) && (!f.status || st === f.status) && (!f.touch || (f.touch === 'noted' ? !!note : f.touch === 'todo' ? st === 'pending' : st !== 'pending')) && (!q || text.indexOf(q) >= 0);
  });
  var open = f.open ? NF.item(S, f.open) : null;
  var cur = f.touch ? 'touch:' + f.touch : f.status ? 'status:' + f.status : '';
  var sumTile = function (k, v, d, cls, key) { return '<button type="button" class="tile ' + cls + (cur === key ? ' open' : '') + '" data-action="regFilter" data-value="' + key + '"><div class="k">' + e(k) + '</div><div class="v">' + v + '</div><div class="d">' + e(d) + '</div></button>'; };
  var out = pagehead('Garant', 'Schvalovací registr · Rozhodnuto ' + sum.touched + ' ' + NF.z(sum.total) + ' ' + sum.total, 'Vše, co aplikace počítá, radí a navrhuje, stojí na těchto ' + NF.garantItems(S).length + ' položkách. ' + V.demoText('registr') + 'Po rozhodnutí můžete připsat nepovinnou poznámku, proč jste tak rozhodli; ukládá se sama už při psaní. Rozhodnutí i poznámku lze kdykoli změnit; historie se uchovává. Oprava pravidla je nová verze položky, která čeká na schválení.' + V.demoText('registr2'), /* B3 (31/03): věty o maketě a příběhu dodává ukázka */
    (NF.slots.syncStatus ? NF.slots.syncStatus(S) : '')) +
    impulseCard(S) +
    '<div class="tiles dense">' + sumTile('Ke schválení', String(sum.remaining), 'čeká na vaše rozhodnutí', sum.remaining ? 'c-warn' : 'c-ok', 'touch:todo') + sumTile('Schváleno', String(sum.approved), 'platí v aplikaci', 'c-ok', 'status:approved') + sumTile('Zamítnuto', String(sum.rejected), 'aplikace položku nepoužívá', 'c-bad', 'status:rejected') + '</div>' +
    '<div class="filters" role="group" aria-label="Hledání a kategorie registru"><label class="sr-only" for="reg-q">Hledat v registru</label><input id="reg-q" data-bind="reg.q" aria-label="Hledat v registru" placeholder="Hledat v názvu a textu" value="' + e(f.q || '') + '">' + NF.CATS.map(function (c) { return choice(e(c[1]), 'regFilter', 'cat:' + c[0], f.cat === c[0], 'sm'); }).join('') + '</div>' +
    '<div class="filters" role="group" aria-label="Filtr stavu položek">' + choice(e('ke schválení ' + sum.remaining), 'regFilter', 'touch:todo', f.touch === 'todo', 'sm') + [['approved', 'schválené ' + sum.approved], ['rejected', 'zamítnuté ' + sum.rejected]].map(function (x) { return choice(e(x[1]), 'regFilter', 'status:' + x[0], f.status === x[0], 'sm'); }).join('') + choice(e('s poznámkou ' + sum.noted), 'regFilter', 'touch:noted', f.touch === 'noted', 'sm') + '</div>' +
    '<div class="reg"><div class="card flat flush">' + (items.length ? items.map(function (r) {
      var st = regState(S, r), note = NF.itemNote(S, r.id);
      return '<button type="button" class="reg-row ' + (open && open.id === r.id ? 'on' : '') + '" data-action="regOpen" data-value="' + r.id + '"' + (open && open.id === r.id ? ' aria-current="true"' : '') + '><span><span class="t">' + e(r.title) + '</span><br><span class="s">' + e(r.id) + ' · ' + e(NF.catLabel(r.cat)) + '</span>' + (note ? '<br><span class="s note">„' + e(noteLine(note)) + '“</span>' : '') + '</span>' + stateTag(st) + '<span class="s date">' + (st !== 'pending' ? e(NF.fmtShort(r.decidedRt || r.decidedAt)) : EMPTY) + '</span></button>'; /* N15: datum jen u rozhodnutých; u garanta skutečný čas zápisu (M9) */
    }).join('') : '<p class="muted p-4">Nic neodpovídá filtru.</p>') + '</div>' +
    '<div class="reg-side">' + (open ? itemPanel(S, open) : card('<p class="muted">Vyberte položku. Uvidíte, co přesně dělá, jaké má parametry, a můžete ji schválit nebo zamítnout, s poznámkou nebo bez ní.</p>')) + '</div></div>' + rulesList(S);
  return out;
};
/* Podnět z provozu (A33, O6, 27. 10. 2026): v ostré aplikaci garant z podnětu položku hned vypne a založí novou verzi ke schválení.
   S.impulse je text, nebo { text, at, item, newText }; položka bez údaje = otevřená položka registru. */
function impulseOf(S) {
  var x = S.impulse; if (!x) return null;
  var o = typeof x === 'string' ? { text: x } : x, id = o.item || (S.reg && S.reg.open), r = id && NF.item(S, id);
  return r && o.text ? { text: o.text, at: o.at || S.clock, item: r, newText: o.newText || null } : null;
}
function impulseCard(S) {
  var im = impulseOf(S); if (!im) return '';
  var r = im.item, hs = S.registry.history.filter(function (h) { return h.item === r.id && h.at >= im.at; });
  var offDone = hs.some(function (h) { return h.kind === 'decision' && h.to && h.to.status === 'rejected'; }), verDone = hs.some(function (h) { return h.kind === 'version'; });
  return card('<p class="eyebrow">Podnět z provozu · ' + e(NF.fmtShort(im.at)) + '</p><h2>' + e(r.title) + ' <span class="small muted">(' + e(r.id) + ')</span></h2><blockquote class="doc-q">„' + e(im.text) + '“</blockquote>' +
    /* Rozhodnutí vlastníka 30. 10. 2026 (bod 11; 06 B12): garant navrhuje, výrobce provádí – vypnutí i nová verze jdou řízením změn výrobce; garant je v ostrém provozu role na straně výrobce. */
    '<p class="small muted">Ve studii a v ostrém provozu se pravidla mění jen postupem výrobce pro změny. Vypnutí položky je bezpečnostní opatření výrobce: zapíše se, oznámí se a nová verze platí až po ověření a uvolnění. Garant vypnutí i novou verzi navrhuje, provádí je výrobce. Ve studii platí jen vypnutí; opravu schválíte až jako novou verzi položky.</p>' +
    '<div class="actions mt-2" role="group" aria-label="Co s podnětem">' +
    (offDone ? tag('položka vypnuta', 'bad') : btn('Navrhnout vypnutí položky', 'impulseOff', r.id, 'sm')) +
    (verDone ? tag('nová verze ' + (r.version || 'v2') + ' ke schválení', 'info') : btn('Navrhnout novou verzi ke schválení', 'impulseVersion', r.id, 'sm' + (offDone ? ' primary' : ''))) + '</div>', 'tint impulse');
}
V.impulseCard = impulseCard; V.impulseOf = impulseOf;
function stateTag(st) { return st === 'approved' ? tag('schváleno', 'ok') : st === 'rejected' ? tag('zamítnuto', 'bad') : tag('ke schválení', ''); }
V.stateTag = stateTag;
/* Pětidílný průvodce položkou pro garanta (7. 10. 2026): proč existuje · jak funguje · kde je použita · co schvalujete · co se stane při zamítnutí.
   Stejná osnova v registru i v rozhodovacím kroku prezentace. Bez průvodce (produkce bez demo/) se ukáže souhrn a detail. */
V.itemGuide = function (S, r, opts) {
  var g = r.guide, params = r.params || {}, keys = Object.keys(params), o = opts || {};
  var sec = function (h, body) { return body ? '<div class="gsec"><h3>' + h + '</h3>' + body + '</div>' : ''; };
  var p = function (t) { return t ? '<p>' + e(t) + '</p>' : ''; };
  var paramsHtml = keys.length ? '<ul class="plain small gparams">' + keys.map(function (k) { return '<li>' + e(paramLabel(r, k)) + ': <b>' + e(String(params[k]).replace('.', ',')) + '</b></li>'; }).join('') + '</ul>' : '';
  var where = (r.usedBy ? '<p class="small">V aplikaci: ' + e(r.usedBy) + '.</p>' : '') + (NF.slots.itemWhere ? NF.slots.itemWhere(S, r.id) : '');
  if (!g) return '<div class="guide">' + p(r.summary) + (r.detail ? '<p class="small muted">' + e(r.detail) + '</p>' : '') + itemTexts(r, S) + paramsHtml + itemListsBox(S, r) + itemPostup(S, r) + sec('Kde je použita', where) + '</div>';
  return '<div class="guide">' + sec('Proč existuje', p(g.proc)) + sec('Jak funguje', p(g.jak) + paramsHtml + itemTexts(r, S) + itemListsBox(S, r) + itemPostup(S, r)) + sec('Kde je použita', p(g.kde) + where) + sec('Co schvalujete', p(g.co)) + sec('Co se stane při zamítnutí', p(g.dopad)) + '</div>';
};
/* Historie položky: kdo, kdy a co. Modelové kroky příběhu nesou „model (příběh)“, rozhodnutí garanta skutečný čas zápisu a výchozí stav „ke schválení“ (M9, 27. 10. 2026). */
function histLine(S, r, h) {
  var when = h.rt ? NF.fmtShort(h.rt) + ' ' + NF.fmtClock(h.rt) : dateTime(h.at), who = h.model ? 'model (příběh)' : whoLabel(S, h.by);
  var fromSt = h.from && h.from.status;
  var what = h.kind === 'note' ? (h.comment ? 'poznámka' : 'poznámka smazána') + V.editsText(h.edits) : h.kind === 'version' ? 'nová verze ' + e(h.to.version) + ' ke schválení' + (h.to.text && h.from.text !== h.to.text ? ' · nové znění: „' + e(sampleText(r, h.to.text, S)) + '“' : '') : /* M7: zástupné hodnoty s ukázkou */
    e(NF.STATUS[fromSt] || fromSt || '') + ' → <b>' + e(NF.STATUS[h.to.status] || h.to.status) + '</b>' + (h.to.version && h.to.version !== 'v1' ? ' (' + e(h.to.version) + ')' : '');
  return '<li>' + e(when) + ' · ' + e(who) + ': ' + what + (h.comment ? (h.kind === 'version' ? ' · ' + e(h.comment) : ' · „' + e(h.comment) + '“') : '') + '</li>';
}
V.histLine = histLine;
/* SCHEMA 83: poznámka se ukládá při psaní (každá pauza = záznam). Po sobě jdoucí úpravy téže poznámky do 2 min od předchozí ukáže historie
   jako jednu řádku s posledním zněním a počtem úprav; v historii stavu zůstávají všechny. Seznam je od nejnovějšího. */
V.EDIT_GAP_MS = 120000;
V.editsText = function (n) { return n > 1 ? ' (' + n + ' ' + (n < 5 ? 'úpravy' : 'úprav') + ')' : ''; };
V.mergeNoteEdits = function (hs) {
  var out = [], t = function (h) { return Date.parse(h.rt || h.at || 0); };
  hs.forEach(function (h) {
    var p = out[out.length - 1];
    if (p && p.kind === 'note' && h.kind === 'note' && p.item === h.item && !!p.model === !!h.model && Math.abs(t(p) - t(h)) <= V.EDIT_GAP_MS) { out[out.length - 1] = Object.assign({}, p, { edits: (p.edits || 1) + 1 }); return; }
    out.push(h);
  });
  return out;
};
/* Rozhodnutí v detailu položky: v ukázce tutéž kartu jako v panelu dodá prezentační vrstva (NF.slots.itemDecide); bez ní dvě rovnocenná tlačítka a poznámka.
   SCHEMA 83 (vlastník 2. 11. 2026): pole poznámky až po rozhodnutí, s otázkou podle rozhodnutí; ukládá se samo při psaní (po 1 s bez psaní a při opuštění pole). */
V.NOTE_LABEL = { approved: 'Proč jste schválili? (nepovinné)', rejected: 'Proč jste zamítli? (nepovinné)' };
V.NOTE_HINT = { approved: 'Např. s čím souhlasíte nebo co doplnit', rejected: 'Např. co je špatně a jaké znění nebo hodnotu chcete' };
V.regSavedLine = function (S, r) {
  var key = 'note_' + r.id, c = S.form && S.form[key] != null ? String(S.form[key]) : null, n = NF.itemNote(S, r.id);
  if (c !== null && c !== n) return 'Ukládá se…';
  if (r.noteAt && n) return 'Uloženo ' + NF.fmtClock(r.noteAt) + '.';
  return 'Poznámka se ukládá sama už při psaní.';
};
function decideBlock(S, r) {
  if (NF.slots.itemDecide) { var x = NF.slots.itemDecide(S, r); if (x) return x; }
  var st = regState(S, r), key = 'note_' + r.id, val = S.form && S.form[key] != null ? S.form[key] : NF.itemNote(S, r.id), decided = st === 'approved' || st === 'rejected';
  var ch = function (label, v) { return '<button type="button" class="btn sm' + (st === v ? ' selected' : '') + '" data-action="regDecide" data-value="' + v + '" aria-pressed="' + (st === v ? 'true' : 'false') + '">' + (st === v ? NF.icon('check') : '') + e(label) + '</button>'; };
  return '<div class="actions mt-2" role="group" aria-label="Rozhodnutí">' + ch('Schválit', 'approved') + ch('Zamítnout', 'rejected') + '</div>' +
    (S.reg && S.reg.confirmReject === r.id ? hint('<b>Zamítnutím přestane fungovat ochrana pacientů:</b> ' + e(V.SAFETY_ITEMS[r.id]) + ' Opravdu zamítnout?<div class="actions mt-2">' + btn('Ano, zamítnout', 'regDecide', 'rejected', 'danger sm') + btn('Zpět', 'regConfirmCancel', null, 'sm') + '</div>', 'low') : '') +
    (decided ? '<label class="field mt-2"><span>' + e(V.NOTE_LABEL[st]) + '</span><textarea rows="3" maxlength="4000" data-bind="form.' + key + '" data-change="regNote" data-autosave="regNote" data-value="' + e(r.id) + '" placeholder="' + e(V.NOTE_HINT[st]) + '">' + e(val) + '</textarea></label>' +
    '<p class="small muted mt-1" data-regsaved="' + e(r.id) + '" aria-live="polite">' + e(V.regSavedLine(S, r)) + '</p>' : '');
}
/* Provozní pravidla (Q1, 27. 10. 2026): neschvaluje je nikdo; v registru jen jako popis pravidla aplikace, bez stavu a bez rozhodnutí. */
function rulesList(S) {
  var rs = S.registry.items.filter(function (r) { return r.scope === 'provozni'; });
  return rs.length ? '<details class="more mt-3 reg-rules"><summary>Pravidla aplikace bez schvalování (' + rs.length + ')</summary><p class="small muted">Provozní pravidla (export ze senzoru, texty obrazovek, zaučení, milníky). Nemají stav a nikdo je neschvaluje.</p><div class="card flat flush">' +
    rs.map(function (r) { return '<button type="button" class="reg-row" data-action="regOpen" data-value="' + r.id + '"><span><span class="t">' + e(r.title) + '</span><br><span class="s">' + e(r.id) + ' · ' + e(NF.catLabel(r.cat)) + '</span></span><span class="s">pravidlo aplikace</span><span class="s date">' + EMPTY + '</span></button>'; }).join('') + '</div></details>' : '';
}
/* 31/01 A1 (předávka Z, J1): znění, které registr garantovi ukazuje – mimo modelový registr (dějství 5) položka z kódu (NF.slots.garantView z ukázky),
   jinak stav příběhu. Otisk tohoto znění ukládá demo/sync.js do ver.shown. Bez prezentační vrstvy položka ze stavu. Poznámka má nejvýš 4000 znaků jako na serveru (B3, J2). */
V.shownItem = function (S, id) {
  var r = NF.item(S, id); if (!r) return null;
  var model = !!(NF.slots.registryModel && NF.slots.registryModel(S));
  return !model && NF.slots.garantView ? (NF.slots.garantView(S, r) || r) : r;
};
function itemPanel(S, r0) {
  var r = r0.scope === 'provozni' ? r0 : (V.shownItem(S, r0.id) || r0), live = NF.item(S, r0.id) || r0;
  if (r.scope === 'provozni') return card('<p class="eyebrow">' + e(NF.catLabel(r.cat)) + ' · ' + e(r.id) + '</p><h2>' + e(r.title) + '</h2><p class="small muted">Pravidlo aplikace bez schvalování.</p><p>' + e(r.summary) + '</p>' + (r.detail ? '<p class="small muted">' + e(r.detail) + '</p>' : '') + itemTexts(r, S));
  /* M7 (27. 10. 2026): historie podle času, nejnovější nahoře (skutečné rozhodnutí garanta má čas rt, modelové kroky příběhu čas scény) */
  var hk = function (h) { return String(h.rt || h.at || ''); };
  var hist = S.registry.history.filter(function (h) { return h.item === r.id; }).map(function (h, i) { return { h: h, i: i }; }).sort(function (a, b) { return hk(b.h) < hk(a.h) ? -1 : hk(b.h) > hk(a.h) ? 1 : b.i - a.i; }).map(function (x) { return x.h; }), model = !!(NF.slots.registryModel && NF.slots.registryModel(S));
  return card('<p class="eyebrow">' + e(NF.catLabel(r.cat)) + ' · ' + e(r.id) + ', verze ' + e(r.version || 'v1') + '</p><h2>' + e(r.title) + '</h2>' + stateTag(regState(S, r)) +
    (live.version && r.version && live.version !== r.version ? '<p class="small mt-2 mb-0">Ukazujeme znění, o kterém rozhodujete (v kódu). Modelová verze ' + e(live.version) + ' je jen v příběhu, viz Historie.</p>' : '') +
    '<p class="small muted mt-2 mb-0">' + e(r.summary) + '</p>' +
    /* Integrace SCHEMA 73: v ukázce ostré aplikace (dějství 5) jsou rozhodnutí modelová – karta to říká a nepíše „Rozhodnutí můžete kdykoli změnit“. */
    /* B3 (31/03): věty o modelových krocích a o oznámení „Tahle část nefunguje“ dodává ukázka; jádro neslibuje oznámení, které produkce nemá. */
    (model ? '<div class="divider"></div><h3>Rozhodnutí garanta ve studii' + V.demoText('modelHead') + '</h3>' + decideBlock(S, r) +
      (regState(S, r) === 'rejected' && V.demoText('modelOff') ? hint(V.demoText('modelOff'), 'neutral') : '')
    : '<div class="divider"></div><h3>Rozhodnutí garanta</h3>' + decideBlock(S, r) +
      (r.status === 'rejected' ? hint('Položka je zamítnutá a aplikace ji nepoužívá. ' + V.demoText('zamitnuto') + 'Rozhodnutí můžete kdykoli změnit.', 'bad') : '')) +
    V.itemGuide(S, r) +
    histBlock(S, r, hist));
}
/* Kontrola 3, C8: rozhodnutí garanta dnes a modelové kroky příběhu (během studie, odst. 13) jsou dvě roviny – v historii zvlášť, modelové kroky v pořadí příběhu. */
function histBlock(S, r, hist) {
  var mine = hist.filter(function (h) { return !h.model; }), model = hist.filter(function (h) { return h.model; }).slice().sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });
  var list = function (hs) { return '<ul class="plain hist">' + V.mergeNoteEdits(hs).map(function (h) { return histLine(S, r, h); }).join('') + '</ul>'; };
  return '<details class="more mt-3"><summary>Historie (' + (V.mergeNoteEdits(mine).length + V.mergeNoteEdits(model).length) + ')</summary>' + (!hist.length ? '<ul class="plain hist"><li class="muted">Zatím bez rozhodnutí garanta.</li></ul>' : !model.length ? list(mine) :
    '<div class="k mt-2">Vaše rozhodnutí dnes</div>' + (mine.length ? list(mine) : '<p class="small muted">Zatím bez vašeho rozhodnutí.</p>') + '<div class="k mt-2">' + (V.demoText('modelHist') || 'Kroky během studie') + '</div>' + list(model)) + '</details>';
}
/* Položky, které chrání pacienta: zamítnutí v registru chce potvrzení jednou větou, co přestane fungovat (rozhodnutí vlastníka 19. 10. 2026). */
V.SAFETY_ITEMS = { 'B-HYPO': 'pacient po menší porci nedostane otázku na pokles pod 4 mmol/l a při opakovaných poklesech kartu s radou, co dělat. Poklesy po menší porci se nezapíšou, takže chybí v reportu i v návrhu k dávce a u jídla s poklesy pak nic nezablokuje větev „zvýšit“.' /* B13 (kontrola 2) */, 'R-POKYNY': 'bezpečnostní pravidla přestanou být součástí plánu a pacient je neuvidí (nízká glukóza, méně jídla, nemoc, kontakty).', 'P-NEMOC': 'pacient nebude moci označit nemoc a rady k jídlu se během nemoci nezastaví.' };
/* Český název parametru s jednotkou (F4): z položky, jinak klíč. */
function paramLabel(r, k) { return (r.labels && r.labels[k]) || k; }
/* Texty položky: jedna věta (text) nebo pojmenované šablony (texts). Zástupné hodnoty {…} zůstávají vidět. */
/* Zástupné hodnoty se v registru a v průvodci ukážou s ukázkovou hodnotou (jako je dosadí aplikace), ne jako „{first}“ nebo „{meal}“ (M8, 27. 10. 2026). */
var SAMPLE = { first: 'zeleninu a maso', addon: 'bílý jogurt nebo hrst ořechů', meal: 'ke snídani', meals: 'K obědu a k večeři', n: '3', z: 'ze', min: '4', lever: 'Doplněk k jídlu', food: 'Ovesná kaše', k: '3' };
function sampleText(r, t, S) {
  var x = String(t).replace(/\{minut\}/g, String((r.params && r.params.minut) || 15));
  if (r.id === 'D-POSTUP') x = x.replace(/\{n\}/g, '2 dávky');
  x = x.replace(/\{tirGoal\}/g, String(S ? NF.targets(S).tirGoal : NF.DEFAULT_TARGETS.tirGoal));
  return x.replace(/\{(\w+)\}/g, function (m, k) { return SAMPLE[k] != null ? SAMPLE[k] : m; });
}
function itemTexts(r, S) {
  var T = r.texts && Object.keys(r.texts).length ? r.texts : null;
  if (!r.text && !T) return '';
  var who = r.cat === 'davka' ? 'lékaře' : 'pacienta'; /* text postupu posouzení dávky čte lékař (25. 10. 2026) */
  return '<div class="box mt-3"><div class="k">' + (T && Object.keys(T).length > 1 ? 'Texty pro ' + who : 'Text pro ' + who) + '</div>' + (r.text ? '<p class="m-0">' + e(sampleText(r, r.text, S)) + '</p>' : '') + (T ? Object.keys(T).map(function (k) { return '<p class="small mt-1 mb-1">' + e(sampleText(r, String(T[k]).replace(/<\/?strong>/g, ''), S)) + '</p>'; }).join('') : '') + '</div>';
}
/* Kontrola 3, A2 (vlastník 29. 10. 2026): seznamy rad, ze kterých šablona skládá větu (složky R-PORADI, povolené doplňky R-DOPLNEK), a úplný přehled vět,
   které pacient u jídel ze seznamu uvidí – garant schvaluje skutečná znění, ne jen šablonu. */
function itemListsBox(S, r) {
  var L = r.lists; if (!L || !S || !S.foods) return '';
  var foods = S.foods.filter(function (f) { return NF.dbFood(f); }), out = '', groups = {};
  if (r.id === 'R-PORADI') {
    out += '<div class="box mt-3"><div class="k">Složky, které rada smí jmenovat (parametr položky)</div><p class="m-0">' + e(Object.keys(L.slozky || {}).map(function (k) { return L.slozky[k]; }).join(', ')) + '</p>' +
      '<p class="small muted mt-1 mb-0">Rada jmenuje jen složky, které jídlo podle seznamu jídel má, nejvýš ' + e(String(L.nejvys || 2)) + '. U jídla bez nich a u jednolitých jídel se nenabízí. Nové jídlo: „' + e(L.nove || '') + '“.</p></div>';
    foods.forEach(function (f) { var k = NF.leverFits(f, 'order') ? NF.fillLever(S, r.text, f) : 'Pořadí se nenabízí (' + (f.jednolite ? 'jednolité jídlo' : 'není co sníst napřed') + ').'; (groups[k] = groups[k] || []).push(f.name); });
  } else if (r.id === 'R-DOPLNEK') {
    var names = L.skupinyNazvy || {};
    out += '<div class="box mt-3"><div class="k">Povolené doplňky – bílkoviny a tuky (parametr položky)</div><p class="m-0">' + e((L.povolene || []).join(', ')) + '</p><ul class="plain small mt-1 mb-0">' +
      Object.keys(L.skupiny || {}).map(function (g) { return '<li>' + e(NF.cap(names[g] || g)) + ': ' + e(NF.joinOr(L.skupiny[g])) + '</li>'; }).join('') + '</ul></div>';
    foods.forEach(function (f) { var k = NF.leverFits(f, 'addon') ? NF.fillLever(S, r.text, f) : 'Doplněk se nenabízí (jídlo bílkovinu nebo tuk už má).'; (groups[k] = groups[k] || []).push(f.name); });
  } else return '';
  var keys = Object.keys(groups);
  return out + '<details class="more mt-2"><summary>Věty u jídel ze seznamu (' + keys.length + ' znění, ' + foods.length + ' jídel)</summary><ul class="plain small mt-2 mb-0">' +
    keys.map(function (k) { return '<li><b>' + e(k) + '</b> <span class="muted">' + e(groups[k].join(', ')) + '</span></li>'; }).join('') + '</ul></details>';
}
/* Větve a ověřovací body postupu (D-POSTUP): garant je vidí celé. Vyřazená větev (nová verze položky) je přeškrtnutá. */
function itemPostup(S, r) {
  var all = NF.postupAll(r); if (!all) return '';
  return Object.keys(all).map(function (key) {
    var p = all[key];
    return '<div class="box mt-3"><div class="k">' + e(p.title || key) + '</div><ol class="plain small bullets">' + (p.verify || []).map(function (v, i) { return '<li>' + e(sampleText(r, v, S)) + (p.fakta && p.fakta[i] ? ' <span class="muted">(u bodu se ukáže číslo z dat)</span>' : '') + '</li>'; }).join('') + '</ol><div class="branch">' + (p.branches || []).map(function (b) {
      var off = !!b.off;
      return '<div class="' + (off ? 'off' : '') + '">' + tag(b.action === 'up' ? 'zvýšit' : b.action === 'down' ? 'snížit' : b.action === 'swap' ? 'vyměnit' : b.action === 'edit' ? 'upravit' : 'ponechat', off ? 'bad' : b.action === 'up' || b.action === 'down' ? 'act' : b.action === 'swap' ? 'info' : '') /* S11: větev postupu není upozornění */ + '<span' + (off ? ' class="struck"' : '') + '>' + e(NF.cap(b.when)) + ': ' + e(sampleText(r, b.text, S)) + '</span>' + (off ? tag('vyřazeno', 'bad') : '') + '</div>';
    }).join('') + '</div></div>';
  }).join('');
}
/* Zásuvka pro lékaře: co položka znamená, s parametry a texty. */
V.itemDetail = function (S, id) {
  var r = NF.item(S, id); if (!r) return '';
  var st = NF.itemState(S, id);
  if (r.scope === 'provozni') return '<p class="eyebrow">Pravidlo aplikace</p><h2>' + e(r.title) + '</h2><p>' + e(r.summary) + '</p>' + itemTexts(r, S); /* bez stavu (Q1) */
  /* Kontrola 4 (02 B9, rozhodnutí vlastníka bod 10): u pacienta hlas „my“, bez „aplikace“ a bez osobního ručení – pravidla připravil NutriFee a posoudil je lékař. */
  if (S.role === 'patient') return '<p class="eyebrow">Pravidlo NutriFee</p><h2>' + e(r.title) + '</h2><p>' + tag(st === 'rejected' ? 'teď se nepoužívá' : st === 'pending' ? 'čeká na posouzení' : 'posouzeno', st === 'rejected' ? 'bad' : st === 'pending' ? '' : 'ok') + '</p><p>' + e(r.summary) + '</p>' +
    '<p class="small muted mt-3">Tato pravidla připravil NutriFee a posoudil je lékař. Každá rada vychází ze schváleného pravidla. Nic si nevymýšlíme.</p>';
  var keys = Object.keys(r.params || {});
  return '<p class="eyebrow">Položka registru</p><h2>' + e(r.title) + '</h2><p>' + tag(NF.stateLabel(S, id), st === 'rejected' ? 'bad' : st === 'pending' ? '' : 'ok') + ' · ' + e(r.id) + '</p><p>' + e(r.summary) + '</p>' + (r.detail ? '<p class="small muted">' + e(r.detail) + '</p>' : '') +
    itemTexts(r, S) + (keys.length ? '<div class="box mt-3"><div class="k">Parametry</div>' + keys.map(function (k) { return '<div class="instr"><span>' + e(paramLabel(r, k)) + '</span><b>' + e(String(r.params[k]).replace('.', ',')) + '</b></div>'; }).join('') + '</div>' : '') + itemListsBox(S, r) + itemPostup(S, r) +
    '<p class="small muted mt-3">' + (NF.itemTouched(S, id) ? 'Rozhodnutí lékaře-garanta z ' + e(NF.fmtShort(r.decidedRt || r.decidedAt)) + '.' : 'Čeká na rozhodnutí lékaře-garanta.') + ' Každý výpočet a rada v aplikaci pochází z položky registru.</p>';
};

/* Akutní problém: bezpečnostní pravidla a kontakty, mimo flow kontroly. */
V.acute = function (S) {
  var p = NF.activePlan(S);
  return '<p class="eyebrow">Mimo kroky kontroly</p><h2>Pravidla a kontakty</h2><p class="muted">Aplikace do léčby nezasahuje. Pro rychlou orientaci tu máte bezpečnostní pravidla, která pacient vidí v Bezpečí, a kontakty.</p>' +
    '<h3>Bezpečnostní pravidla pacienta</h3>' + V.instructionsList(S, p, false) +
    '<h3 class="mt-4">Kam se obrátit</h3>' + kv('Zdravotní potíže', 'ordinace, mimo ordinační dobu pohotovost') + kv('Ohrožení života', 'záchranná služba') + kv('Nefunguje senzor', 'podpora výrobce senzoru') + kv('Nefunguje NutriFee', 'kontaktní formulář v aplikaci (Bezpečí)') +
    V.demoNote('cisla', 'mt-3');
};

/* --- verze a stopa --- */
/* V04 (21. 10. 2026): stopa česky a bez technických kódů. Role, události a stavy návyků slovy; podrobnost skládaná lidsky;
   technická data jen v rozbalení. Záznamy prezentační vrstvy (prezentace.*) do stopy aplikace nepatří a nezobrazují se. */
NF.WHO_LABEL = { doctor: 'lékař', patient: 'pacient', nurse: 'sestra', garant: 'lékař-garant', system: 'aplikace' };
NF.EVENT_LABEL = {
  'jidlo.zapsano': 'Zápis jídla', 'jidlo.vynechano': 'Jídlo vynecháno', 'jidlo.pridano': 'Nové jídlo', 'jidlo.opraveno': 'Zápis opraven', 'jidlo.rozchod': 'Zápis se rozchází s dřívějšími zápisy jídla',
  'jidlo.inzulin.potvrzen': 'Inzulin k jídlu potvrzen', 'jidlo.inzulin.opraven': 'Inzulin k jídlu opraven', 'rada.zobrazena': 'Rada zobrazena', 'rada.vypnuta': 'Rada u jídla vypnuta',
  'glukoza.nejvyssi': 'Nejvyšší glukóza po jídle', 'glukoza.nejvyssi.neznama': 'Nejvyšší glukóza neznámá', 'glukoza.nejnizsi': 'Otázka na pokles pod 4 mmol/l',
  'bazal.potvrzen': 'Bazál potvrzen', 'hypo.sledovani': 'Sledování poklesu zahájeno', 'hypo.odpoved': 'Odpověď na pokles pod 4 mmol/l',
  'nemoc.zacatek': 'Nemoc zapnuta', 'nemoc.konec': 'Nemoc ukončena', 'senzor.import': 'Export ze senzoru nahrán', 'pravidlo.vysoka': 'Pravidlo k vysoké glukóze zobrazeno', 'pravidlo.nizka': 'Pravidlo k nízké glukóze zobrazeno', 'pravidlo.mene': 'Pravidlo „Méně jídla než obvykle“ zobrazeno', 'pravidlo.nevim': 'Pravidlo „Nevím u inzulinu“ zobrazeno',
  'plan.davky.overeni': 'Pacient ověřil dávky v plánu', 'plan.kontrolni.otazka': 'Kontrolní otázka při převzetí', 'nemoc.dotaz': 'Odpověď „Už je lépe?“', 'otazka.lekari': 'Otázka na lékaře', 'podpora.odeslano': 'Zpráva technické podpoře odeslána',
  'zarazeni.podminka': 'Podmínka zařazení', 'zarazeni.vylouceni': 'Vylučovací kritéria', 'zarazeni.vychozi': 'Výchozí hodnota ze senzoru', 'zarazeni.davky.overeny': 'Dávky ověřené s pacientem', 'navrh.overeni': 'Ověřovací bod návrhu', 'navrh.overeni.vse': 'Ověřovací body: Vše sedí', 'hypo.opakovane': 'Karta po opakovaných poklesech přečtena', 'hypo.noc': 'Noční pokles pod 4 zapsán u snídaně', 'hba1c': 'HbA1c zapsán',
  'plan.vydan': 'Plán vydán', 'plan.predan': 'Plán předán', 'plan.prevzat': 'Plán převzat', 'zauceni.done': 'Zaučení dokončeno', 'zauceni.failed': 'Zaučení se nezdařilo', 'zauceni.zmena': 'Výsledek zaučení změněn',
  'kontrola.zahajena': 'Kontrola zahájena', 'kontrola.leky': 'Jiný lék na diabetes ověřen', 'kontrola.stav': 'Zdravotní stav ověřen', 'hmotnost': 'Hmotnost zapsána', 'kontrola.sestra': 'Sestra ověřila bod s pacientem', 'pripominka.cas': 'Čas připomínky vybrán', 'pripominka.vypnuta': 'Připomínka vypnuta', 'pripominka.zapnuta': 'Připomínka zapnuta', 'navrh.rozhodnut': 'Návrh rozhodnut', 'registr.rozhodnuti': 'Rozhodnutí o položce registru', 'registr.poznamka': 'Poznámka k položce registru', 'registr.verze': 'Nová verze položky registru',
  'vysledek.zobrazen': 'Výsledek zobrazen pacientovi', 'tyden.zobrazen': 'Týdenní shrnutí zobrazeno', 'milnik': 'Milník', 'chyba.vykresleni': 'Chyba zobrazení', 'chyba.akce': 'Chyba akce'
};
NF.HABIT_STATE = { active: 'platí', done: 'skončil s plánem', prepared: 'čeká na zaučení' };
var PORTION_LABEL = { usual: 'obvyklá porce', bigger: 'větší porce', smaller: 'menší porce', other: 'jiné množství' };
var CHOICE_LABEL = { agree: 'souhlas', other: 'rozhodnuto jinak než postup', keep: 'ponechat', reject: 'zamítnuto' };
function whoLabel(S, who) {
  if (NF.WHO_LABEL[who]) return NF.WHO_LABEL[who];
  if (S.doctor && who === S.doctor.id) return 'lékař-garant'; if (S.nurse && who === S.nurse.id) return 'sestra'; if (S.patient && who === S.patient.id) return 'pacient';
  return who || EMPTY;
}
function eventLabel(what) {
  if (NF.EVENT_LABEL[what]) return NF.EVENT_LABEL[what];
  if (/^ucast\./.test(what)) return 'Účast ukončena';
  if (/^zauceni\./.test(what)) return 'Zaučení';
  return 'Jiná událost';
}
function propTitle(S, id) { var pr = S.review && S.review.proposals.filter(function (x) { return x.id === id; })[0]; return pr ? pr.title : 'návrh'; }
function traceDetail(S, x) {
  var d = x.data || {}, m = String(x.detail || '');
  var food = function (fid) { var f = NF.foodById(S, fid); return f ? f.name : ''; };
  /* C7 (31/03): místo vnitřního ID zápisu jídlo, jídlo dne a čas */
  var epl = function (id) { var ep = S.episodes.filter(function (y) { return y.id === id; })[0]; return ep ? [food(ep.foodId), NF.mealLabel(ep.meal, true), dateTime(ep.at)].filter(Boolean).join(' · ') : ''; };
  switch (x.what) {
    case 'glukoza.nejvyssi': return [epl(m), d.peak != null ? 'nejvyšší ' + (d.bound === 'over' ? 'nad 15' : d.bound === 'under' ? 'pod 4' : NF.mmol(d.peak)) + ' mmol/l' : ''].filter(Boolean).join(' · ');
    case 'glukoza.nejvyssi.neznama': return epl(m) + (epl(m) ? ' · ' : '') + 'bez hodnoty';
    case 'jidlo.rozchod': return epl(m);
    case 'hypo.noc': case 'hba1c': return m;
    case 'jidlo.zapsano': return [d.meal ? NF.mealLabel(d.meal, true) : '', food(m.split(' ')[1]), PORTION_LABEL[d.portion] || ''].filter(Boolean).join(' · ');
    case 'rada.zobrazena': return m + ((d.items || []).length ? ' · ' + d.items.map(function (i) { return NF.LEVERS[i.lever] ? NF.LEVERS[i.lever].label : 'rada'; }).join(', ') : '');
    case 'navrh.rozhodnut': { var p = m.split(' → '); return propTitle(S, p[0]) + ' – ' + (CHOICE_LABEL[p[1]] || p[1] || '') + (d.units != null ? ' · ' + d.units + ' j.' : '') + (d.reason ? ' (' + d.reason + ')' : ''); }
    case 'registr.rozhodnuti': { var q = m.split(' → '), it = NF.item(S, q[0]), st = (q[1] || '').split(' · ')[0]; return (it ? it.title : 'položka') + ' – ' + (NF.STATUS[st] || st) + (q[1] && q[1].indexOf(' · ') >= 0 ? ' · ' + q[1].slice(q[1].indexOf(' · ') + 3) : ''); }
    case 'registr.verze': case 'registr.poznamka': { var it2 = NF.item(S, m.split(' · ')[0]); return (it2 ? it2.title : 'položka') + (m.indexOf(' · ') >= 0 ? ' · ' + m.slice(m.indexOf(' · ') + 3) : ''); }
    case 'kontrola.leky': return m;
    case 'kontrola.zahajena': return 'plán ' + m + (d.proposals ? ' · ' + NF.plural(d.proposals.length, 'návrh', 'návrhy', 'návrhů') : '');
    case 'plan.vydan': case 'plan.predan': case 'plan.prevzat': return 'plán ' + m;
    case 'bazal.potvrzen': return (d.confirmed === 'as' ? 'podle plánu' : d.confirmed === 'other' ? 'jinak' : d.confirmed === 'none' ? 'bez bazálu' : 'neví') + (d.units != null ? ' · ' + d.units + ' j.' : '');
    case 'jidlo.vynechano': return d.meal ? NF.mealLabel(d.meal, true) : '';
    case 'hypo.sledovani': case 'hypo.odpoved': return d.answer ? (d.answer === 'yes' ? 'ano, pod 4 mmol/l' : d.answer === 'no' ? 'ne' : 'nevím') : '';
    case 'senzor.import': return m;
    case 'pravidlo.vysoka': case 'pravidlo.nizka': case 'pravidlo.mene': case 'pravidlo.nevim': return m + (d.shown === false ? ' · pravidlo v plánu chybí, na místě oznámení' : '');
    case 'plan.davky.overeni': case 'plan.kontrolni.otazka': case 'nemoc.dotaz': case 'podpora.odeslano': case 'zarazeni.podminka': case 'zarazeni.vylouceni': case 'zarazeni.vychozi': case 'zarazeni.davky.overeny': case 'navrh.overeni': case 'navrh.overeni.vse': return m;
    case 'otazka.lekari': return m + (d.text ? ': „' + d.text + '“' : '');
    case 'hypo.opakovane': return 'poklesů pod 4 mmol/l: ' + m;
    case 'glukoza.nejnizsi': return d.low === true ? 'ano, pod 4 mmol/l' : d.low === false ? 'ne' : 'nevím'; /* odpověď, ne „nízká glukóza“ (02 #8) */
  }
  return /[A-Z]{1,2}-[A-Z]|[{}]|\b[EF]\d+\b/.test(m) ? '' : m; /* kódy a syrová data se nevypisují; zůstanou v rozbalení */
}
/* Stopa (02 #9, 23. 10. 2026): řazená podle času události (ne podle pořadí zápisu), filtr podle toho, kdo jednal, a „Zobrazit dalších 80“. */
NF.TRACE_WHO = [['all', 'všichni'], ['patient', 'pacient'], ['doctor', 'lékař'], ['nurse', 'sestra'], ['system', 'aplikace']];
function whoGroup(S, who) { var w = whoLabel(S, who); return w === 'pacient' ? 'patient' : w === 'lékař' || w === 'lékař-garant' ? 'doctor' : w === 'sestra' ? 'nurse' : 'system'; }
V.trace = function (S) {
  var fw = S.traceWho || 'all', lim = S.traceLimit || 80;
  var base = S.events.map(function (x, i) { return { x: x, i: i }; }).filter(function (o) { return !/^prezentace\./.test(o.x.what); });
  var all = base.filter(function (o) { return fw === 'all' || whoGroup(S, o.x.who) === fw; }).sort(function (a, b) { return a.x.at < b.x.at ? 1 : a.x.at > b.x.at ? -1 : b.i - a.i; });
  var ev = all.slice(0, lim);
  var doseLine = function (d) { return 'snídaně ' + d.breakfast.units + ' · oběd ' + d.lunch.units + ' · večeře ' + d.dinner.units + ' j. · bazál ' + d.basal.units + ' j.'; };
  return pagehead('Verze a stopa', 'Co aplikace udělala a proč', 'Stopa zaznamenává každý výpočet, radu, návrh a rozhodnutí i s jejich vstupy a výstupy. Všechno je deterministické, bez generativní AI.',
    '') +
    card('<div class="grid2"><div><h2>Plány</h2><ul class="plain small">' + (S.plans.length ? S.plans.map(function (p) { return '<li><b>' + e(p.id) + '</b> ' + tag(p.state === 'issued' ? 'platí' : 'starší', p.state === 'issued' ? 'ok' : '') + ' · ' + e(NF.fmtShort(p.issuedAt)) + ' · ' + doseLine(p.doses) + '</li>'; }).join('') : '<li class="muted">Žádný plán.</li>') + '</ul></div>' +
      '<div><h2>Návyky</h2><ul class="plain small">' + (S.habits.length ? S.habits.map(function (h) { return '<li>' + e(h.title) + ' ' + tag(NF.HABIT_STATE[h.state] || h.state, h.state === 'active' ? 'ok' : '') + ' · plán ' + e(h.planId) + '</li>'; }).join('') : '<li class="muted">Žádné.</li>') + '</ul></div></div>') +
    card('<h2>Stopa (' + NF.plural(all.length, 'záznam', 'záznamy', 'záznamů') + ', ' + (ev.length < all.length ? 'zobrazeno nejnovějších ' + ev.length : 'zobrazeno vše') + ')</h2>' +
      '<div class="filters" role="group" aria-label="Kdo jednal">' + NF.TRACE_WHO.map(function (x) { return choice(e(x[1]), 'traceWho', x[0], fw === x[0], 'sm'); }).join('') + '</div>' +
      '<div class="tablewrap trace-tbl" tabindex="0" role="region" aria-label="Stopa"><table><caption class="sr-only">Stopa – záznamy od nejnovějšího</caption><thead><tr><th scope="col">Čas</th><th scope="col">Kdo</th><th scope="col">Událost</th><th scope="col">Podrobnost</th><th scope="col"><span class="sr-only">Data</span></th></tr></thead><tbody>' +
      ev.map(function (o) { var x = o.x, k = String(o.i); return '<tr><th scope="row" class="nowrap">' + e(dateTime(x.at)) + '</th><td class="nowrap">' + e(whoLabel(S, x.who)) + '</td><td><b>' + e(eventLabel(x.what)) + '</b></td><td>' + e(traceDetail(S, x)) + '</td><td class="nowrap">' + (x.data ? btn(S.traceOpen === k ? 'Skrýt data' : 'Data', 'traceOpen', k, 'sm quiet link') : '') + '</td></tr>' + (S.traceOpen === k && x.data ? '<tr><td colspan="5"><p class="small muted mb-1">Technický záznam pro dohledání (kód události ' + e(x.what) + ')</p><pre class="small trace-pre">' + e(JSON.stringify(x.data, null, 2)) + '</pre></td></tr>' : ''); }).join('') + '</tbody></table></div>' +
      (ev.length < all.length ? '<div class="actions mt-2">' + btn('Zobrazit dalších ' + Math.min(80, all.length - ev.length), 'traceMore', null, 'sm') + '</div>' : ''));
};

/* ---------- sestra ---------- */
/* Náhled telefonu u sestry. U bodů jídlo / porce / inzulin se ukáže ukázkové jídlo (ne prázdná obrazovka); sestra v náhledu neklepe. */
function nursePreview(S, p, t) {
  var page = t.previewPage || 'today', pv = t.preview, html;
  if (page === 'meal' && pv && !S.meal) {
    var meal = 'breakfast', f = S.foods.filter(function (x) { return (x.meals || []).indexOf(meal) >= 0 || x.meal === meal; })[0] || S.foods[0];
    var sample = { step: pv.step || 1, meal: meal, bolus: pv.step > 1 ? (pv.bolus || 'before') : null, units: p.doses[meal] ? p.doses[meal].units : 0, offset: '0', q: f ? f.name : '', foodId: pv.step > 2 && f ? f.id : null, portion: pv.step > 2 ? (pv.portion || 'usual') : null, decisions: {}, reasons: {}, newFood: null, sample: true };
    S.meal = sample; try { html = V.patient(S, 'meal'); } finally { S.meal = null; }
  } else html = V.patient(S, page);
  var label = page === 'meal' ? (pv && pv.step > 1 ? 'Ukázkové jídlo · krok ' + pv.step : 'Před jídlem · krok 1') : page === 'plan' ? 'Plán' : page === 'safety' ? 'Bezpečí' : 'Dnes';
  /* V08 (21. 10. 2026): štítek nad rámečkem telefonu, ne v něm – rámeček s overflow:hidden ho ořezával */
  return '<div class="preview-wrap"><span class="preview-label">Takto to vidí pacient · ' + e(label) + '</span><div class="phone-preview preview-static"><div class="island"></div>' + html + '</div></div>';
}
/* Kontrola 4 (bod 4, rozhodnutí vlastníka 30. 10. 2026): sestra s pacientem vybere časy připomínek v telefonu (nejvýš 4 denně: jídla a bazál); lékař nic nenastavuje.
   Akce „reminderTime“ (hodnota „klíč:čas“) a „reminderToggle“ doplní prezentační vrstva v ui.js. */
function remindersPart(S) {
  if (!NF.texts(S, 'S-PRIPOMINKY')) return '';
  var st = NF.reminderSettings(S), lbl = { breakfast: 'Snídaně', lunch: 'Oběd', dinner: 'Večeře', basal: 'Inzulin na noc (bazál)' };
  return card('<h2>Připomínky v telefonu</h2><p class="muted">Vyberte s pacientem, kdy obvykle jí a kdy si píchá bazál. Telefon se v ten čas zeptá, jestli se chystá k jídlu; k jídlu, které už je zapsané, připomínka nepřijde. Pacient je může v Plánu vypnout.</p>' +
    NF.REMINDER_KEYS.map(function (k) { var on = !st.off[k]; return '<div class="dose-field mt-2"><div class="k">' + e(lbl[k]) + (on ? '' : ' · vypnuto') + '</div><div class="timechips" role="group" aria-label="' + e('Připomínka: ' + lbl[k]) + '">' + NF.reminderOptions(S, k).map(function (x) { return choice(e(x), 'reminderTime', k + ':' + x, st.times[k] === x, 'sm'); }).join('') + choice(on ? 'Vypnout' : 'Zapnout', 'reminderToggle', k, !on, 'sm quiet') + '</div></div>'; }).join('') +
    '<p class="small muted mt-2 mb-0">Nejvýš ' + st.max + ' připomínky denně. Po menší porci s inzulinem se telefon navíc jednou zeptá, jestli glukóza klesla pod 4.</p>', 'reminders');
}
V.nurse = function (S) {
  var p = NF.activePlan(S), t = S.training, items = NF.trainingItems(S);
  var all = items.every(function (x) { return t.steps[x.id]; }), done = t.result === 'done', failed = t.result === 'failed';
  var left = pagehead('V ordinaci · sestra · ' + NF.fmtDate(S.clock), 'Zaučení a předání telefonu', p ? 'Plán ' + e(p.id) + ' vydal lékař.'+ ' Návyky začnou platit až po zaučení a jedné závěrečné otázce.' : 'Lékař zatím plán nevydal.') +
    (p ? card('<h2>Co pacient zvládl</h2><p class="muted">Bod zaškrtněte, až ho pacient zvládne sám. Náhled telefonu ukazuje, co má pacient na telefonu, a tlačítko „Náhled“ ukáže obrazovku k danému bodu.</p>' +
      /* N19: přepínač s popiskem; při náhledu bodu zůstane vybraná obrazovka, ke které bod patří */
      (function () { var curPage = t.previewPage || 'today'; return '<div class="preview-switch mb-3"><span class="small muted" id="nurse-pv-k">Náhled telefonu:</span><div class="segmented measure" role="group" aria-labelledby="nurse-pv-k">' + [['today', 'Dnes'], ['plan', 'Plán'], ['safety', 'Bezpečí']].map(function (x) { var on = curPage === x[0] || (curPage === 'meal' && x[0] === 'today'); return '<button type="button" class="' + (on ? 'on' : '') + '" data-action="trainingPreview" data-value="' + x[0] + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + e(x[1]) + '</button>'; }).join('') + '</div></div>'; })() +
      (function () { var rowOf = function (x) { return '<div class="train-row"><label class="check"><input type="checkbox" data-action="trainingStep" data-value="' + x.id + '"' + (t.steps[x.id] ? ' checked' : '') + (done || failed ? ' disabled' : '') + '><span>' + e(x.text) + (x.item ? ' ' + appr(S, x.item) : '') + '</span></label>' + (x.page ? btn('Náhled', 'trainingPreview', x.id, 'quiet sm') : '') + '</div>'; }; var pat = items.filter(function (x) { return !x.oral; }), nur = items.filter(function (x) { return x.oral; }); /* body „sestra ověří ústně“ nesou příznak oral (kontrola 4) */ return '<div class="train-group">Pacient umí (' + pat.filter(function (x) { return t.steps[x.id]; }).length + ' ' + NF.z(pat.length) + ' ' + pat.length + ')</div>' + pat.map(rowOf).join('') + (nur.length ? '<div class="train-group">Sestra ověří ústně (' + nur.filter(function (x) { return t.steps[x.id]; }).length + ' ' + NF.z(nur.length) + ' ' + nur.length + ')</div>' + nur.map(rowOf).join('') : ''); })() +
      (done ? hint('<b>Zaučení dokončeno</b> ' + e(dateTime(t.at)) + '.<br><b>Co dál:</b> předejte telefon pacientovi. Na obrazovce „Váš plán“ si projde dávky a návyky a klepne na „Plán přebírám“; až pak návyky začnou platit. Vy už nic nezapisujete.', 'ok') : '') +
      /* S21: důvod nezdaru je vidět přímo v oznámení; dokud chybí, oznámení to řekne (rozpor „7 z 7, a přesto nezdar“ bez důvodu) */
      (failed ? hint('<b>Zaučení se nezdařilo</b> ' + e(dateTime(t.at)) + '. ' + (t.reason ? 'Důvod: ' + e(NF.trainingReasonLabel(t.reason)) + '. ' : 'Důvod zatím není vybraný. ') + 'Plán je vydaný, návyky pacientovi nezačnou platit.<br><b>Co dál:</b> domluvte nový termín, nebo pomoc blízké osoby. Lékař to uvidí na kontrole a v zařazení.', 'warn') +
        '<div class="box mt-3"><div class="k">Důvod (vyberte)</div><div class="choice-row">' + NF.TRAINING_REASONS.map(function (r) { return choice(e(r[1]), 'trainingReason', r[0], t.reason === r[0], 'sm'); }).join('') + '</div></div>' : '') +
      (done || failed ? '<div class="actions">' + btn('Změnit výsledek', 'finishTraining', 'reset', 'quiet sm') + '</div>'
        : '<div class="actions">' + btn('Dokončit zaučení', 'finishTraining', 'done', 'primary', all ? '' : ' disabled') + btn('Zaučení se nezdařilo', 'finishTraining', 'failed', 'quiet') + '</div>' + (all ? '' : (function () { var left = items.filter(function (x) { return !t.steps[x.id]; }).length; return '<p class="small muted">Zbývá ' + NF.plural(left, 'bod', 'body', 'bodů') + ' zaučení.</p>'; })()))) : '');
  if (p) left += remindersPart(S);
  var right = p ? nursePreview(S, p, t) : '<div class="phone-preview"><div class="island"></div><div class="patient-shell"><div class="patient"><p class="muted">Zatím není co ukázat.</p></div></div></div>';
  return '<div class="app">' + rail(S, [['training', 'Zaučení', 'graduation']], S.nurse.label) + '<div class="desk"><div class="split-wrap"><div class="split"><div>' + left + '</div>' + right + '</div></div></div></div>';
};

})(typeof window !== 'undefined' ? window : globalThis);
