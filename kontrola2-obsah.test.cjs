/* Kontrola 2 (SCHEMA 75, 29. 10. 2026) – obsah, pravidla, jádro a účinky zamítnutí (navrhy-designu/27-kontrola2-2026-10-29/02-obsah.md, 01-prohlizec.md B1, M2).
   Hlídá zásadu 3 u rad (A1), nezávislost bezpečnostní větve na bráně rad (A2), strojový popis účinku zamítnutí u všech 28 položek (A3–A5, B4; pole `ucinek`
   v demo/guide.js) a vybrané nálezy B a C.
   Spuštění: node kontrola2-obsah.test.cjs   (ONLY=část názvu spustí jen vybrané testy; UCINEK=R-PORCE,B-HYPO jen vybrané položky v testu účinku) */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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
/* Stav zamítnutí platí od začátku přehrání (jako rozhodnutí garanta, které přehrání scény použije dřív, než kapitoly spočítají report a návrhy). */
function playRejected(NF, D, ch, ids, B) {
  const prev = D.beforePlay;
  D.beforePlay = function (s) { if (prev) prev(s); ids.forEach(id => { const r = s.role; s.role = 'doctor'; NF.decideItem(s, id, 'rejected', ''); s.role = r; }); };
  try { return D.play(D.indexOf(ch), B); } finally { D.beforePlay = prev; }
}
function stepMeal(s, food, portion, bolus, before) { const f = s.foods.find(x => x.name === food); const p = s.plan || null; s.meal = { step: 3, meal: 'lunch', bolus, units: 10, offset: '0', q: f.name, foodId: f.id, portion, decisions: {}, reasons: {}, newFood: null, before: before == null ? 7 : before, beforeBound: before === 4 ? 'under' : null, beforeAsked: true }; s.page = 'meal'; s.role = 'patient'; return f; }

/* ---------- A1 ---------- */
test('A1: rada k pořadí v2 neradí jíst víc; rada mluvící o množství se po píchnutí / „nevím“ s menší porcí nenabídne', ({ NF, D }) => {
  assert.equal(NF.talksAmount(D.PORADI_V2), false, 'v2 nemluví o množství');
  assert.doesNotMatch(D.PORADI_V2, /nevynechávejte|jako obvykle|snězte ji|víc/i);
  assert.equal(NF.talksAmount('Snězte nejdřív maso, potom zbytek obvyklého jídla. Přílohu nevynechávejte – snězte ji jako obvykle.'), true, 'staré znění v2 se pozná');
  for (const bolus of ['as', 'unknown']) {
    const s = at(D, 'impact'), f = stepMeal(s, 'Smažený řízek s bramborovou kaší', 'smaller', bolus);
    const res = NF.advise(s, f.id, 'smaller', bolus, 'lunch');
    assert.equal(res.lowRisk, true);
    res.items.forEach(it => assert.equal(NF.talksAmount(it.text), false, bolus + ': ' + it.text));
    /* staré znění jako nová verze: v riziku nízké glukózy se nenabídne, obrazovka nemá „snězte ji jako obvykle“ */
    const r = s.role; s.role = 'doctor'; NF.newVersion(s, 'R-PORADI', { text: 'Snězte nejdřív {first}, potom zbytek obvyklého jídla. Přílohu nevynechávejte – snězte ji jako obvykle.' }, 'test'); NF.decideItem(s, 'R-PORADI', 'approved', ''); s.role = r;
    const res2 = NF.advise(s, f.id, 'smaller', bolus, 'lunch');
    assert.equal(res2.items.some(it => it.lever === 'order'), false, 'staré v2 se v riziku nenabízí');
    assert.ok(res2.blocked.some(b => b.lever === 'order' && b.reason === 'amount'));
    const t = text(NF, s);
    assert.doesNotMatch(t, /snězte ji jako obvykle/i); assert.match(t, /Méně jídla než obvykle/);
    /* před píchnutím nebo s obvyklou porcí se rada nabízí dál */
    assert.ok(NF.advise(s, f.id, 'usual', bolus, 'lunch').items.some(it => it.lever === 'order'), 'obvyklá porce: pořadí se nabízí');
  }
});

/* ---------- A2 ---------- */
test('A2: zamítnutá R-REAKCE ani nepřevzatý plán neskryjí I-MENE, pravidlo k nízké glukóze ani větu o nemoci', ({ NF, D }) => {
  const s = playRejected(NF, D, 'hypo', ['R-REAKCE']);
  assert.equal(s.meal.portion, 'smaller'); assert.equal(s.meal.bolus, 'as');
  let t = text(NF, s);
  assert.match(t, /Méně jídla než obvykle/); assert.match(t, /Když sníte méně než obvykle a inzulin už je píchnutý/);
  s.meal.before = 4; s.meal.beforeBound = 'under'; t = text(NF, s);
  assert.match(t, /Glukóza je teď pod 4/); assert.match(t, /Když glukóza klesne pod 4 mmol\/l/);
  /* před převzetím plánu */
  const h = at(D, 'handover'); NF.activePlan(h).understood = false; stepMeal(h, 'Kuřecí maso na kari s rýží', 'smaller', 'as');
  assert.equal(NF.adviceGate(h).ok, false); assert.equal(NF.advise(h, h.meal.foodId, 'smaller', 'as', 'lunch').smallerInBody, true); assert.match(P.norm(P.screenText(P.parse(NF.screens.meal(h)))), /Méně jídla než obvykle/);
  /* nemoc */
  const ill = playRejected(NF, D, 'illnessMeal', ['R-REAKCE']); assert.match(text(NF, ill), /K jídlu neradíme, platí pravidla pro nemoc\./);
  /* zpětný zápis: pod 4 při jídle i bez brány rad */
  const r = playRejected(NF, D, 'lateMeal', ['R-REAKCE']); r.meal = { retro: true, step: 3, meal: 'breakfast', at: 7.5, bolus: 'as', units: 8, foodId: r.foods.find(x => x.name === 'Chléb se sýrem a zeleninou').id, portion: 'usual', before: 4, beforeBound: 'under', decisions: {} }; r.page = 'meal'; r.role = 'patient';
  assert.match(text(NF, r), /Glukóza je teď pod 4/);
});

/* ---------- A3–A5, B4: strojový popis účinku zamítnutí u všech 28 položek ---------- */
const DRUHY = ['vypne', 'nesouhlas'], UKAZE = ['off', 'nesouhlas', null];
test('A3–A5, B4: každá garantová položka má v průvodci popis účinku zamítnutí (ucinek) a text „Co se stane“ mu odpovídá', ({ NF, D, S }) => {
  const ids = NF.garantItems(S()).map(r => r.id); assert.equal(ids.length, 29); /* SCHEMA 90: I-VYSSI */
  for (const id of ids) {
    const g = D.guideRaw[id], u = g && g.ucinek;
    assert.ok(u, id + ': chybí ucinek');
    assert.ok(DRUHY.indexOf(u.druh) >= 0, id + ': druh'); assert.ok(UKAZE.indexOf(u.ukaze === undefined ? null : u.ukaze) >= 0, id + ': ukaze');
    assert.ok(u.sceny && typeof u.sceny === 'object', id + ': sceny');
    Object.keys(u.sceny).forEach(ch => { assert.ok(D.indexOf(ch) >= 0, id + ': neznámá kapitola ' + ch); const x = u.sceny[ch]; ['zmizi', 'zustane'].forEach(k => { if (x[k] != null) assert.ok(Array.isArray(x[k]), id + '/' + ch + '.' + k + ' je pole'); }); if (x.oznameni != null) assert.equal(typeof x.oznameni, 'boolean', id + '/' + ch + '.oznameni'); });
    if (u.druh === 'vypne') assert.ok(Object.keys(u.sceny).length, id + ': účinek „vypne“ potřebuje aspoň jednu kapitolu');
    (u.bezMista || []).forEach(x => assert.ok(ids.indexOf(x) >= 0, id + ': bezMista ' + x));
    const dopad = String(g.dopad || '');
    if (u.druh === 'nesouhlas') { assert.match(dopad, /záznam nesouhlasu/, id + ': nesouhlas musí „Co se stane“ říct'); assert.equal(u.ukaze === 'off', false, id); }
    else assert.doesNotMatch(dopad, /záznam nesouhlasu/, id);
    /* scény s obsahem jsou podmnožinou dopadSceny (T3) */
    Object.keys(u.sceny).forEach(ch => { if ((u.sceny[ch].zmizi || []).length || u.sceny[ch].oznameni) assert.ok((g.dopadSceny || []).indexOf(ch) >= 0, id + ': ' + ch + ' není v dopadSceny'); });
  }
  /* A3–A5: konkrétní dřívější nepravdy */
  assert.doesNotMatch(D.guideRaw['Z-GLUKOZA'].dopad, /by pacient hodnoty nezapisoval/);
  assert.doesNotMatch(D.guideRaw['K-KRITERIA'].dopad, /zařazení projde bez nich/);
  assert.doesNotMatch(D.guideRaw['D-CISTA'].dopad, /vstupovaly i jídla s jinou porcí/);
  assert.doesNotMatch(D.guideRaw['R-REAKCE'].dopad, /nevyhodnocuje vůbec/);
  assert.doesNotMatch(D.guideRaw['C-CILE'].dopad, /„Váš nesouhlas je zapsaný“/, 'K4: oznámení necituje samo sebe');
});

/* Obsahová zkouška účinku: příběh hlavní linie ve scénách z `ucinek.sceny`, jednou se vším schváleným, jednou se zamítnutou položkou. */
function chapterTexts(env, decideFn, chapters) {
  const { D, NF, app } = env, out = {};
  NF.garantItems(env.S()).forEach(r => app.act('garantDecide', r.id + ':' + decideFn(r.id) + ':ano'));
  const scenes = D.scenes.map((sc, i) => (!sc.appendix && chapters.indexOf(D.chapters[sc.ch].id) >= 0 ? i : -1)).filter(i => i >= 0);
  P.walkStory(env, (i, k, s) => { const ch = D.chapters[D.scenes[i].ch].id; out[ch] = (out[ch] || '') + ' ¶ ' + P.effectText(P.screenHtml(NF, s)); }, { decide: decideFn, scenes });
  return out;
}
test('A3–A5, B4: účinek zamítnutí každé položky na obrazovce odpovídá `ucinek` (co zmizí, co zůstane, jaké oznámení)', ({ D, NF, S }) => {
  const only = process.env.UCINEK ? process.env.UCINEK.split(',') : null;
  const ids = NF.garantItems(S()).map(r => r.id).filter(id => !only || only.indexOf(id) >= 0), problems = [];
  const allCh = [...new Set([].concat(...ids.map(id => Object.keys(D.guideRaw[id].ucinek.sceny))))];
  const base = chapterTexts(P.boot(), () => 'approved', allCh);
  for (const id of ids) {
    const u = D.guideRaw[id].ucinek, chs = Object.keys(u.sceny); if (!chs.length) continue;
    const rej = chapterTexts(P.boot(), x => (x === id ? 'rejected' : 'approved'), chs);
    chs.forEach(ch => {
      const x = u.sceny[ch], a = base[ch] || '', b = rej[ch] || '';
      (x.zmizi || []).forEach(t => { if (a.indexOf(t) < 0) problems.push(id + '/' + ch + ': „' + t + '“ není ani ve schváleném běhu'); else if (b.indexOf(t) >= 0) problems.push(id + '/' + ch + ': „' + t + '“ po zamítnutí nezmizel'); });
      (x.zustane || []).forEach(t => { if (b.indexOf(t) < 0) problems.push(id + '/' + ch + ': „' + t + '“ má po zamítnutí zůstat'); });
      if (x.oznameni && b.indexOf('[OFF ' + id + ']') < 0) problems.push(id + '/' + ch + ': chybí oznámení na místě');
    });
  }
  assert.equal(problems.length, 0, problems.join('\n      '));
});

/* ---------- A6, B1, B3: úplná znění pravidel ---------- */
test('A6, B1, B3: I-HYPO, I-VYSOKA a I-MENE mají úplné znění bez výzvy volat do ordinace a bez rady jíst víc mimo léčbu poklesu', ({ NF }) => {
  const c = id => NF.instructionCatalog().find(x => x.id === id);
  const hypo = NF.instrHtml(c('I-HYPO'), 4);
  assert.doesNotMatch(hypo, /\{v\}/); assert.equal((hypo.match(/<b>4 mmol\/l<\/b>/g) || []).length >= 3, true, 'všechna {v} dosazená');
  assert.match(hypo, /pořád pod/); assert.match(hypo, /léčba nízké glukózy, ne rada k jídlu/); assert.match(hypo, /záchrannou službu/); assert.match(hypo, /malou svačinu/);
  const vys = c('I-VYSOKA').text, nem = c('I-NEMOC-JIDLO').text;
  [vys, nem].forEach(x => { assert.match(x, /déle než 3 hodiny/); assert.match(x, /vyhledejte ještě ten den lékařskou pomoc/); }); assert.match(vys, /Když je glukóza i potom nad \{v\}/);
  assert.match(c('I-MENE').text, /Když je pod 4 mmol\/l, postupujte podle pravidla k nízké glukóze\./); assert.doesNotMatch(c('I-MENE').text, /při poklesu/);
  NF.instructionCatalog().forEach(x => { if (x.id !== 'I-KONTAKT') assert.doesNotMatch(x.text || '', /ordinac/i, x.id); assert.doesNotMatch(x.text || '', /snězte víc|jezte víc/i, x.id); });
});
test('B2: nejvyšší hodnota „nad 15“ z minulosti začíná „Podívejte se, kolik ukazuje senzor teď“', ({ NF, D }) => {
  const s = at(D, 'lateMeal'); s.meal = { retro: true, step: 1, meal: 'breakfast', at: 7.5, bolus: 'as', units: 8, before: 7, beforeAsked: true, peak: 15, peakBound: 'over', peakAsked: true, decisions: {} }; s.page = 'meal'; s.role = 'patient';
  const h = NF.screens.highNow(s, s.meal); assert.match(h, /Podívejte se, kolik ukazuje senzor teď\. Když je glukóza pořád nad <b>15 mmol\/l<\/b>/);
  s.meal.retro = false; s.meal.peakAsked = false; s.meal.beforeBound = 'over'; assert.doesNotMatch(NF.screens.highNow(s, s.meal), /Podívejte se, kolik/, 'hodnota teď: bez úvodu');
});

/* ---------- prohlížeč B1, M2 ---------- */
test('Prohlížeč B1: zamítnutí D-BAZAL během kontroly odebere návrh k bazálu; další návrh je snídaně; po schválení se vrátí', ({ NF, D }) => {
  const s = at(D, 'reviewProposals'); s.role = 'doctor';
  assert.equal(NF.nextProposal(s).id, 'PR-BREAKFAST'); assert.ok(s.review.proposals.some(p => p.id === 'PR-BAZAL' && !p.row), 'karta bazálu je (SCHEMA 84: bez přednosti, za jídly)');
  decide(NF, s, 'D-BAZAL', 'rejected');
  assert.equal(s.review.proposals.some(p => p.id === 'PR-BAZAL' && !p.row), false); assert.equal(NF.nextProposal(s).id, 'PR-BREAKFAST'); /* SCHEMA 84: řádek bazálu bez návrhu není karta */
  assert.equal(s.review.newDoses.basal.units, NF.activePlan(s).doses.basal.units);
  assert.doesNotMatch(text(NF, s), /Posoudit bazální dávku/);
  decide(NF, s, 'D-BAZAL', 'approved'); assert.ok(s.review.proposals.some(p => p.id === 'PR-BAZAL' && !p.row), 'po schválení se karta vrátí'); assert.equal(NF.nextProposal(s).id, 'PR-BREAKFAST');
  /* D-POSTUP zamítnutý během kontroly: karty ztratí body a větve */
  decide(NF, s, 'D-POSTUP', 'rejected'); assert.equal(s.review.proposals.every(p => !p.branches.length), true);
});
test('Prohlížeč M2: karta po poklesu se zamítnutou B-HYPO neukazuje počet poklesů', ({ NF, D }) => {
  const s = D.play(D.indexOf('custom')); s.clock = D.HYPO_ASK; s.lowNotice = { at: s.clock }; s.page = 'today'; s.role = 'patient';
  s.hypoAlertSeen = '2099-01-01T00:00:00';
  decide(NF, s, 'B-HYPO', 'rejected');
  const t = text(NF, s); assert.doesNotMatch(t, /Počítá se do poklesů/);
});

/* ---------- B ---------- */
test('B7: doplněk k jídlu jen u jídel bez bílkoviny (modelová data)', ({ NF, D }) => {
  const s = at(D, 'reviewSummary');
  s.episodes.forEach(e => { if ((e.advice || []).some(a => a.lever === 'addon')) assert.ok(NF.leverFits(NF.foodById(s, e.foodId), 'addon'), e.id + ' ' + NF.foodById(s, e.foodId).name); });
  assert.ok(s.foods.find(f => f.name === 'Müsli s mlékem a medem'));
});
test('B8: podnět z provozu je od jiného pacienta; úvod scénáře 5 neodporuje reportu', ({ D }) => {
  assert.match(D.IMPULSE, /^Jiný pacient ve studii/);
  assert.doesNotMatch(D.acts[5].note, /Ve studii platí jen vypnutí; opravu schválíte až po období/); assert.match(D.acts[5].note, /report na kontrole by ji pak ukazoval jako vypnutou/);
});
test('B9: „Jídla opakovaně nad cílem“ jen častěji nad cílem, řazeno podle zápisů nad cílem', ({ NF, D }) => {
  const s = at(D, 'reviewProposals'), list = NF.strongFoods(s); s.review.step = 1;
  assert.ok(list.length > 3);
  list.forEach(x => { if (x.st.n > 2) assert.ok(x.st.inTarget / x.st.n < 0.5, x.food.name); });
  assert.equal(list.some(x => x.food.name === 'Chléb se sýrem a zeleninou'), false);
  for (let i = 1; i < list.length; i++) assert.ok(list[i - 1].overN >= list[i].overN, 'řazení');
  assert.match(text(NF, (s.page = 'review', s.role = 'doctor', s)), /nejvíc Ovesná kaše s mlékem a banánem \(\d+× nad cílem\)/);
});
test('B10: rozpad návrhu ke snídani podle zápisů nad cílem a bod „nejen jedno nebo dvě jídla“ jmenuje obě jídla', ({ NF, D }) => {
  const s = at(D, 'reviewProposals'), pr = s.review.proposals.find(p => p.id === 'PR-BREAKFAST');
  for (let i = 1; i < pr.breakdown.length; i++) assert.ok(pr.breakdown[i - 1].above >= pr.breakdown[i].above);
  const j = pr.facts[pr.verify.findIndex(t => /jen jedno nebo dvě jídla/.test(t))];
  assert.match(j.text, /„Ovesná kaše s mlékem a banánem“ \d+×, „[^“]+“ \d+×\) tvoří \d+ %/);
});
test('B11, C8: dlaždice času pod 3,9 – hlášené poklesy jako samostatný údaj, mez „méně než 4 % času“', ({ NF, D }) => {
  const s = at(D, 'reviewProposals'); s.role = 'doctor'; s.page = 'review'; s.review.step = 1;
  const t = text(NF, s); assert.match(t, /hlášené poklesy po jídle: 2 \(pod 4 mmol\/l podle pacienta/); assert.match(t, /méně než 4 % času/);
  assert.match(NF.item(s, 'B-HYPO').summary, /počítá jako pokles pod dolní cíl/); assert.match(NF.item(s, 'D-PRAND').summary, /Hlášené „pod 4“/);
});
test('B12, C12, C15: D-PRAND = 15 odst. 10; druhá podmínka bodu 7; název pro štítek', ({ NF, S }) => {
  const r = NF.item(S(), 'D-PRAND'), doc = fs.readFileSync([path.join(__dirname, '..', '15-ZDROJ-PRAVDY-MAKETA.md'), path.join(__dirname, 'predani', 'zdroj', '15-ZDROJ-PRAVDY-MAKETA.md')].find(f => fs.existsSync(f)) || path.join(__dirname, '..', '15-ZDROJ-PRAVDY-MAKETA.md'), 'utf8'); /* SCHEMA 89: vedle makety na Disku, nebo v predani/zdroj/ v samostatném klonu repozitáře */
  assert.match(doc, /\| Posoudit prandiální dávku k \[jídlu\] — hodnoty pod cílem \| ≥ 2 poklesy < 3,9 mmol\/l do 4 h po daném jídle, které zároveň tvoří ≥ 15 % jídel/);
  assert.match(r.summary, /pacient jí ke stejnému jídlu dne i jiné jídlo aspoň 2×/); assert.equal(r.title, 'Návrhy k prandiální dávce a radám');
});
test('B13: potvrzení před zamítnutím B-HYPO říká, že nic nezablokuje větev „zvýšit“', ({ NF }) => { assert.match(NF.screens.SAFETY_ITEMS['B-HYPO'], /nezablokuje větev „zvýšit“/); });
test('B14, C1, C11: otázka při rozchodu – nejvyšší hodnota slovem pacienta, jiné množství zvlášť, jedno znění neobvyklého dne', ({ NF, D }) => {
  const s = at(D, 'lateMeal'); D.chapters[D.indexOf('lateMeal')].apply(s, D.defaults);
  const ep = s.episodes.find(e => e.id === 'E7c'); delete ep.divergeAsked; ep.context = null;
  const dv = NF.divergence(s, ep); assert.ok(dv, 'rozchod');
  s.page = 'today'; s.role = 'patient'; const html = NF.screens.patient(s);
  assert.doesNotMatch(html, /vzestup/i); assert.match(html, /class="state-big over">nad 15\u00a0mmol\/l/); assert.match(html, /Dřív bývala nejvyšší kolem \d+\u00a0mmol\/l\./); /* SCHEMA 90 (pacient S5): číslo s jednotkou */ /* SCHEMA 86 (návrh 4): výsledek jednou velkým písmem, rozdíl jednou větou */
  assert.match(html, /data-value="E7c:amount"/); assert.match(html, /Neobvyklý den \(stres, málo spánku, alkohol\)/);
  const r = NF.answerDivergence(s, 'E7c', 'amount'); assert.equal(r.ok, true); assert.equal(ep.portion, 'other'); assert.equal(NF.usableEp(s, ep), false);
  assert.match(NF.whyNotUsable(s, Object.assign({}, ep, { portion: 'usual', context: 'unusual' })), /neobvyklý den \(stres, málo spánku, alkohol\)/);
});
test('B15: otázka na pokles u zápisu mladšího než 4 h zní „zatím“', ({ NF, D }) => {
  const s = at(D, 'lateMeal'); s.meal = { retro: true, step: 1, meal: 'breakfast', at: 7.5, bolus: 'as', units: 8, before: 7, beforeAsked: true, peak: 12, peakAsked: true, decisions: {} }; s.page = 'meal'; s.role = 'patient';
  assert.match(NF.screens.patient(s), /Klesla glukóza od jídla zatím pod 4 mmol\/l\?/);
  assert.equal(NF.screens.lowQ(s, null), 'Klesla glukóza do 4 hodin po jídle pod 4 mmol/l?'); /* SCHEMA 86: bez času jídla se zpětný zápis k hodnotám nedostane (čas je 2. otázka) */
});

/* ---------- C ---------- */
test('C2, C4, C13, C14, C16: drobné texty', ({ NF, D, S }) => {
  assert.equal(NF.item(S(), 'I-KONTAKT').title, 'Kontakty (jen informace)');
  assert.doesNotMatch(JSON.stringify(NF.habitCatalog()), /si už píchl/);
  const s = at(D, 'custom'); s.page = 'today'; s.role = 'patient'; s.hypoAlertSeen = null;
  const a = NF.hypoAlert(s); if (a) assert.match(NF.screens.hypoAlertCard(s), /za posledních 7 dní klesla pod 4/);
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, 'app/screens-clinic.js'), 'utf8'), /Sestra umí/);
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, 'demo/fixtures.js'), 'utf8'), /'Ponecháno na příští kontrolu: jedna změna dávky najednou\.'/);
});

console.log('\n' + passed + ' prošlo, ' + failed + ' selhalo' + (fails.length ? ': ' + fails.join(' | ') : ''));
process.exitCode = failed ? 1 : 0;
