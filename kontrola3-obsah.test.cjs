/* Kontrola 3 (SCHEMA 76, 29. 10. 2026) – obsah, jádro a data (navrhy-designu/28-kontrola3-2026-10-29/02-obsah.md, 00-plan.md).
   Hlídá rozhodnutí vlastníka A2 (rady „pořadí“ a „doplněk“ jen šablonou ze schválených položek nad strukturovanými údaji jídla),
   A1 (každý postup D-POSTUP má větev pro každý bod; pokles pod 4 blokuje „zvýšit“ vždy) a vybrané nálezy B a C.
   Spuštění: node kontrola3-obsah.test.cjs   (ONLY=část názvu spustí jen vybrané testy) */
'use strict';
const assert = require('node:assert/strict');
const P = require('./pravdivost.test.cjs');

let passed = 0, failed = 0; const fails = [];
function test(name, fn) {
  if (process.env.ONLY && name.indexOf(process.env.ONLY) < 0) return;
  const t0 = Date.now();
  try { fn(P.boot()); console.log('OK  ', name, '(' + Math.round((Date.now() - t0) / 1000) + ' s)'); passed++; } catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); }
}
const text = (NF, s) => P.norm(P.screenText(P.parse(P.screenHtml(NF, s))));
const at = (D, id, B) => D.play(D.indexOf(id), B);
const decide = (NF, s, id, st) => { const r = s.role; s.role = 'doctor'; const res = NF.decideItem(s, id, st || 'rejected', ''); s.role = r; assert.ok(res.ok, id + ' rozhodnuto'); };
function playRejected(NF, D, ch, ids, B) {
  const prev = D.beforePlay;
  D.beforePlay = function (s) { if (prev) prev(s); ids.forEach(id => { const r = s.role; s.role = 'doctor'; NF.decideItem(s, id, 'rejected', ''); s.role = r; }); };
  try { return D.play(D.indexOf(ch), B); } finally { D.beforePlay = prev; }
}
function stepMeal(s, food, portion, bolus, before) { const f = s.foods.find(x => x.name === food); s.meal = { step: 3, meal: 'lunch', bolus, units: 10, offset: '0', q: f.name, foodId: f.id, portion, decisions: {}, reasons: {}, newFood: null, before: before == null ? 7 : before, beforeBound: before === 4 ? 'under' : null, beforeAsked: true }; s.page = 'meal'; s.role = 'patient'; return f; }
const MORE = /sněz(te)? víc|snězte více|víc jídla|přidejte si (přílohu|víc)|dojezte|nevynechávejte|jako obvykle/i;

/* ---------- A2: rady „pořadí“ a „doplněk“ šablonou ze schválených položek ---------- */
test('A2: každé jídlo ze seznamu má strukturované údaje a žádný ručně psaný text rady', ({ NF, S }) => {
  const foods = S().foods, LP = NF.item(S(), 'R-PORADI').lists, LD = NF.item(S(), 'R-DOPLNEK').lists;
  assert.ok(foods.length >= 170, 'seznam jídel');
  assert.ok(LP && LP.slozky && LD && LD.povolene && LD.skupiny, 'seznamy jsou součástí položek R-PORADI a R-DOPLNEK');
  for (const f of foods) {
    assert.ok(NF.dbFood(f), f.name + ': strukturované údaje');
    assert.equal('addon' in f || 'first' in f, false, f.name + ': ručně psaný text rady u jídla nesmí být');
    f.slozky.forEach(k => assert.ok(LP.slozky[k], f.name + ': složka „' + k + '“ není v seznamu R-PORADI'));
    assert.ok(LD.skupiny[f.doplnek], f.name + ': skupina doplňku „' + f.doplnek + '“ není v R-DOPLNEK');
    if (f.jednolite) assert.equal(f.slozky.length, 0, f.name + ': jednolité jídlo nemá co sníst napřed');
    assert.equal(typeof f.bilkovina, 'boolean', f.name);
  }
  /* povolené doplňky jsou bílkoviny a tuky; každá skupina jen z povoleného seznamu */
  Object.keys(LD.skupiny).forEach(g => LD.skupiny[g].forEach(x => assert.ok(LD.povolene.indexOf(x) >= 0, g + ': ' + x)));
  LD.povolene.forEach(x => assert.match(x, /jogurt|ořech|sýr|vejce|mas[oa]|tvaroh/, 'doplněk jen bílkovina nebo tuk: ' + x));
});

test('A2: rada k pořadí nikdy nejmenuje složku, která v jídle není; jednolitá jídla pořadí nedostanou', ({ NF, S }) => {
  const s = S(), LP = NF.item(s, 'R-PORADI').lists, words = Object.keys(LP.slozky).map(k => [k, LP.slozky[k]]);
  let offered = 0;
  for (const f of s.foods) {
    const fits = NF.leverFits(f, 'order'), t = NF.leverText(s, 'order', f);
    if (f.jednolite || !f.slozky.length) { assert.equal(fits, false, f.name + ': pořadí se nenabízí'); continue; }
    offered++;
    const first = t.replace(/^Snězte nejdřív /, '').split(', potom')[0];
    words.forEach(([k, w]) => { if (new RegExp('(^| )' + w + '( |$)').test(first)) assert.ok(f.slozky.indexOf(k) >= 0, f.name + ': rada jmenuje „' + w + '“, které v jídle není: ' + t); });
    assert.equal(first, NF.orderParts(s, f).join(' a '), f.name);
  }
  assert.ok(offered >= 40, 'pořadí se nabízí u jídel se složkou (' + offered + ')');
  /* nové jídlo: obecné znění podmíněné tím, co v jídle je */
  const custom = { id: 'X', name: 'Domácí jídlo', tags: {}, custom: true };
  assert.match(NF.leverText(s, 'order', custom), /pokud jsou v jídle/);
  /* jednolité jídlo s nízkým podílem v cíli: krok 3 pořadí nenabídne */
  const k = s.foods.find(f => f.name === 'Ovesná kaše s mlékem a banánem');
  assert.equal(NF.advise(s, k.id, 'usual', 'before', 'breakfast').items.some(i => i.lever === 'order'), false);
});

test('A2: doplněk je vždy ze seznamu povolených doplňků; u jídla s bílkovinou nebo tukem se nenabízí', ({ NF, S }) => {
  const s = S(), LD = NF.item(s, 'R-DOPLNEK').lists;
  for (const f of s.foods) {
    const t = NF.leverText(s, 'addon', f), list = NF.addonList(s, f);
    assert.ok(list.length >= 1, f.name);
    list.forEach(x => assert.ok(LD.povolene.indexOf(x) >= 0, f.name + ': ' + x));
    assert.equal(t, 'Přidejte k jídlu ' + NF.joinOr(list) + ', pokud vám nevadí. Z jídla nic neubírejte.', f.name);
    if (f.bilkovina) assert.equal(NF.leverFits(f, 'addon'), false, f.name + ': jídlo bílkovinu nebo tuk má');
  }
  assert.match(NF.leverText(s, 'addon', s.foods.find(f => f.name === 'Ovesná kaše s mlékem a banánem')), /bílý jogurt nebo hrst ořechů/);
  assert.equal(NF.leverFits(s.foods.find(f => f.name === 'Pizza Margherita'), 'addon'), false, 'pizza: žádné „salát před pizzou“');
  assert.equal(NF.leverFits(s.foods.find(f => f.name === 'Pizza Margherita'), 'order'), false, 'pizza: salát v ní není');
  assert.equal(NF.leverFits(s.foods.find(f => f.name === 'Ovocné knedlíky s tvarohem'), 'order'), false, 'knedlíky s tvarohem: žádné „nejdřív maso“');
});

test('A2 + zásada 3: žádný výsledný text rady (všechna jídla, verze v2, nové jídlo) neříká jíst víc', ({ NF, D, S }) => {
  const s = S(), custom = { id: 'X', name: 'Domácí jídlo', tags: {}, custom: true };
  const texts = [];
  for (const f of s.foods.concat([custom])) ['order', 'addon', 'walk'].forEach(l => texts.push(NF.leverText(s, l, f)));
  const v2 = s.foods.concat([custom]).map(f => NF.fillLever(s, D.PORADI_V2, f));
  texts.concat(v2).forEach(t => { assert.doesNotMatch(t, MORE, t); assert.equal(NF.talksAmount(t), false, t); });
  /* registr ukazuje garantovi úplný přehled vět, které pacient uvidí */
  const r = s.role; s.role = 'doctor'; const det = P.norm(NF.screens.itemDetail(s, 'R-PORADI')) + P.norm(NF.screens.itemDetail(s, 'R-DOPLNEK')); s.role = r;
  assert.match(det, /Věty u jídel ze seznamu/); assert.match(det, /Snězte nejdřív maso, potom zbytek jídla\./); assert.match(det, /Povolené doplňky/);
});

/* ---------- A1: D-POSTUP ---------- */
test('A1: každý postup D-POSTUP má větev pro každý bod; žádná větev nevede na volné „rozhodněte sami“', ({ NF, S }) => {
  const all = NF.postupAll(NF.item(S(), 'D-POSTUP'));
  Object.keys(all).forEach(key => {
    const p = all[key];
    assert.ok(p.branches.some(b => !/nesedí/.test(b.when)), key + ': větev, když vše sedí');
    p.verify.forEach((_, i) => assert.ok(p.branches.some(b => new RegExp('bod ' + (i + 1) + '\\b.*nesedí').test(b.when)), key + ': bod ' + (i + 1) + ' nemá větev'));
    p.branches.filter(b => /nesedí/.test(b.when)).forEach(b => assert.notEqual(b.action, 'up', key + ': větev při nesedícím bodu nezvyšuje'));
  });
});

test('A1: bod s poklesem pod 4 má přednost před pořadím; bez větve „ponechat“; bez postupu zvýšení jde proti datům', ({ NF, D, S }) => {
  const s = at(D, 'reviewProposals'); s.role = 'doctor';
  const r = s.review, pr = r.proposals.find(p => p.kind === 'dose' && p.dose === 'lunch');
  assert.ok(pr, 'návrh k obědu'); assert.ok(pr.lowBlock, 'oběd má poklesy pod 4');
  const blockIdx = pr.verify.findIndex((_, i) => NF.verifyBlocked(pr, i)); assert.ok(blockIdx >= 0);
  /* bod 2 (technika) nesedí a bod s poklesem nesedí podle dat → větev bodu s poklesem */
  r.verify[pr.id] = {}; pr.verify.forEach((_, i) => { r.verify[pr.id][i] = i !== 1; });
  let br = NF.screens.proposalBranch(s, pr);
  assert.equal(br.action, 'keep'); assert.match(br.when, new RegExp('bod ' + (blockIdx + 1) + '\\b'));
  /* větev bodu chybí (např. vyřazená) → „ponechat dávku“, nikdy volné rozhodnutí */
  const saved = pr.branches; pr.branches = saved.filter(b => !/nesedí/.test(b.when));
  br = NF.screens.proposalBranch(s, pr); assert.equal(br.action, 'keep'); assert.match(br.text, /ponechat dávku/); pr.branches = saved;
  /* „Souhlasím“ se zvýšením se nezapíše jako souhlas ani bez postupu (D-POSTUP zamítnutá) */
  const cur = NF.activePlan(s).doses.lunch.units;
  pr.branches = []; br = NF.screens.proposalBranch(s, pr); assert.equal(br.action, 'free'); assert.equal(br.block, true); assert.match(br.text, /pokles pod 4/);
  NF.decideProposal(s, pr.id, { choice: 'agree', branch: 'free', units: cur + 2 });
  assert.equal(r.decisions[pr.id].choice, 'other'); assert.equal(r.decisions[pr.id].againstBranch, true); assert.equal(r.decisions[pr.id].againstData, true);
  pr.branches = saved;
});

/* ---------- B ---------- */
test('B2: po zamítnutí R-POKYNY nebo I-HYPO obrazovka na chybějící pravidlo neodkazuje', ({ NF, D }) => {
  for (const id of ['R-POKYNY', 'I-HYPO']) {
    const s = playRejected(NF, D, 'hypo', [id]);
    assert.doesNotMatch(NF.lowNowText(s), /pravidl/, id + ': věta při pod 4');
    assert.doesNotMatch(NF.walkLowWhy(s, true), /pravidl/, id);
    s.meal.before = 4; s.meal.beforeBound = 'under'; s.meal.step = 1;
    let t = text(NF, s); assert.doesNotMatch(t, /bezpečnostními pravidly v Bezpečí|řiďte se pravidlem k nízké glukóze/i, id + ': krok 1');
    s.meal = null; s.page = 'safety'; s.role = 'patient'; t = text(NF, s);
    if (id === 'R-POKYNY') { assert.doesNotMatch(t, /Nic k nim nepřidáváme/); assert.doesNotMatch(t, /Ohrožení života/, 'zdravotní cesty patří k I-KONTAKT'); assert.match(t, /Nefunguje senzor/); }
  }
});

test('B3: zamítnutá R-REAKCE – karta „Jak to dopadlo“ se neptá na rozchod a neslibuje „známé“', ({ NF, D }) => {
  const s = playRejected(NF, D, 'lateMeal', ['R-REAKCE']);
  s.episodes.forEach(ep => assert.equal(NF.divergence(s, ep), null, ep.id));
  s.page = 'today'; s.role = 'patient'; assert.doesNotMatch(text(NF, s), /až se zápisy shodnou|Bylo to stejné jídlo/);
});

test('B4: zamítnutá I-KONTAKT – zdravotní cesty v Bezpečí nahradí oznámení, technické zůstanou', ({ NF, D }) => {
  const s = playRejected(NF, D, 'illness', ['I-KONTAKT']); s.page = 'safety'; s.role = 'patient'; s.meal = null;
  const h = P.screenHtml(NF, s), t = text(NF, s);
  assert.doesNotMatch(t, /Ohrožení života/); assert.match(t, /Nefunguje NutriFee/); assert.match(h, /data-off="I-KONTAKT"/);
});

test('B6: jídla opakovaně nad cílem mají stupeň ze stejného okna jako tabulka reakcí', ({ NF, D }) => {
  const s = at(D, 'reviewSummary'), mirna = NF.param(s, 'R-SKORE', 'mirna', 0.5);
  const list = NF.strongFoods(s); assert.ok(list.length >= 1);
  list.forEach(x => { const rb = x.st.recent && x.st.recent.n ? x.st.recent : x.st; if (x.st.n !== 2) assert.ok(rb.inTarget / rb.n < mirna, x.food.name + ' ' + rb.inTarget + '/' + rb.n); });
});

test('B7: doplněk se po stažení (R-DOPLNEK stahnout_po, ani jednou v cíli) už nenabízí – ani v modelových datech', ({ NF, D }) => {
  for (const response of ['accepts', 'declines', 'impractical']) {
    const s = at(D, 'preview', Object.assign({}, D.defaults, { response }));
    const all = s.episodes.slice().sort((a, b) => (a.at < b.at ? -1 : 1)), keep = s.episodes, bad = [];
    all.forEach(e => { if (!(e.advice || []).some(a => a.lever === 'addon')) return; s.episodes = all.filter(x => x.at < e.at); if (NF.addonWithdrawn(s, e.foodId, e.meal)) bad.push(e.id + ' ' + NF.foodById(s, e.foodId).name); s.episodes = keep; });
    assert.deepEqual(bad, [], response + ': doplněk nabídnutý po stažení');
    const c = s.foods.find(f => f.name === 'Croissant s džemem');
    if (NF.addonWithdrawn(s, c.id, 'breakfast')) assert.equal(NF.advise(s, c.id, 'usual', 'before', 'breakfast').items.some(i => i.lever === 'addon'), false, response + ': krok 3 stažený doplněk nenabízí');
  }
});

/* ---------- C ---------- */
test('C1, C2, C3, C13: výčet pravidel podle seznamu, „nevím“ bez tvrzení o inzulinu, jméno pravidla, otázka na věc', ({ NF, D, S }) => {
  const s = playRejected(NF, D, 'doses', ['I-MENE']); s.role = 'doctor';
  assert.doesNotMatch(text(NF, s), /\(nízká glukóza, méně jídla/, 'C1: zamítnuté pravidlo není ve výčtu');
  const h = at(D, 'afterBolus'), f = stepMeal(h, 'Smažený řízek s bramborovou kaší', 'bigger', 'unknown');
  const it = NF.advise(h, f.id, 'bigger', 'unknown', 'lunch').items.find(i => i.lever === 'portion');
  assert.ok(it); assert.doesNotMatch(it.text, /který už máte v těle/, 'C2'); assert.match(it.text, /Bereme to, jako by inzulin v těle byl/);
  const sm = NF.advise(h, f.id, 'smaller', 'as', 'lunch').blocked.find(b => b.lever === 'portion');
  if (sm && /pravidlem/.test(sm.why)) assert.match(sm.why, /pravidlem „Méně jídla než obvykle“/, 'C3');
  h.meal.step = 1; assert.match(text(NF, h), /Nevíte, jestli byl inzulin píchnutý\?/, 'C13'); assert.doesNotMatch(text(NF, h), /jste si píchli/);
});

test('C9, C10: průvodce nežádá poznámku povinně; provozní položky nemají „Co schvalujete“ ani „Co se stane při zamítnutí“', ({ NF, D, S }) => {
  const g = D.guideRaw || D.guide;
  Object.keys(g).forEach(id => { const r = NF.item(S(), id); if (r && r.scope === 'provozni') { assert.equal(g[id].co, undefined, id); assert.equal(g[id].dopad, undefined, id); } });
  Object.keys(g).forEach(id => assert.doesNotMatch(JSON.stringify(g[id]), /zamítněte a do poznámky napište/, id));
  S().registry.items.forEach(r => assert.doesNotMatch([r.summary, r.detail].join(' '), /zamítněte a do poznámky napište/, r.id));
});

test('B1 (podklad pro vyprávění): oznámení o zamítnutí necituje chybějící text obrazovky v uvozovkách', ({ NF, D }) => {
  const g = D.guide, s = at(D, 'firstMeal');
  ['B-HYPO', 'R-REAKCE', 'D-PRAND', 'D-CISTA', 'D-POSTUP', 'R-POKYNY', 'I-HYPO', 'I-KONTAKT', 'I-NEVIM'].forEach(id => {
    const q = (g[id].dopad || '').match(/„[^“]*“/g) || [];
    q.forEach(x => assert.ok(/^„(Tahle část nefunguje|pod 4|nad 15|Jak to dopadlo|Bezpečnostní pravidla beze změny\?|Beze změny|Návrhy k prandiální dávce a radám|Jídla opakovaně nad cílem)“$/.test(x), id + ': ' + x));
  });
  assert.doesNotMatch(g['B-HYPO'].dopad, /Klesla glukóza/);
  void s;
});

console.log('\n' + passed + ' prošlo, ' + failed + ' selhalo' + (fails.length ? ': ' + fails.join(' | ') : ''));
process.exitCode = failed ? 1 : 0;
