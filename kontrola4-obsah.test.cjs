/* Kontrola 4 (30. 10. 2026) – jádro, obrazovky pacienta a ordinace, registr, data a průvodce
   (navrhy-designu/30-kontrola4-a-pohledy-2026-10-29/00-rozhodnuti.md, 02-obsah.md, 06-regulace-bezpecnost.md, 07-realny-provoz.md; předávka 08-predavka-jadro.md).
   Hlídá rozhodnutí vlastníka 1 (verze a otisk v jádře), 3, 4, 5, 6, 7, 8, 10, 11 a vybrané nálezy.
   Spuštění: node kontrola4-obsah.test.cjs   (ONLY=část názvu spustí jen vybrané testy) */
'use strict';
const assert = require('node:assert/strict');
const P = require('./pravdivost.test.cjs');

let passed = 0, failed = 0; const fails = [];
function test(name, fn) {
  if (process.env.ONLY && name.indexOf(process.env.ONLY) < 0) return;
  const t0 = Date.now();
  try { fn(P.boot()); console.log('OK  ', name, '(' + Math.round((Date.now() - t0) / 1000) + ' s)'); passed++; } catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); }
}
const html = (NF, s) => P.screenHtml(NF, s);
const text = (NF, s) => P.norm(P.screenText(P.parse(html(NF, s))));
const at = (D, id, B) => D.play(D.indexOf(id), B);
const asDoctor = (s, fn) => { const r = s.role; s.role = 'doctor'; try { return fn(); } finally { s.role = r; } };
const reject = (NF, s, id) => asDoctor(s, () => assert.ok(NF.decideItem(s, id, 'rejected', '').ok, id));
const CALL_RE = /zavolejte|zavoláte|zavolat do ordinace|volejte (do )?ordinac|volat ordinaci/i;
const REPEAT = 'Když glukóza klesá pod 4 opakovaně, nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal.';

test('Bod 1: každá položka má verzi; otisk je deterministický a mění se se zněním, parametrem i textem „Co schvalujete“', ({ NF, S, D }) => {
  const s = S();
  s.registry.items.forEach(r => assert.match(String(r.version), /^v\d+$/, r.id));
  const r = NF.item(s, 'B-HYPO'), g = D.guide['B-HYPO'];
  const a = NF.itemFingerprint(r, g), b = NF.itemFingerprint(JSON.parse(JSON.stringify(r)), { co: g.co });
  assert.match(a, /^fp-[0-9a-f]{16}$/); assert.equal(a, b, 'stejný vstup, stejný otisk (bez stavu, getter průvodce = řetězec)');
  const r2 = JSON.parse(JSON.stringify(r)); r2.status = 'rejected'; r2.note = 'x'; r2.version = 'v9'; assert.equal(NF.itemFingerprint(r2, g), a, 'stav, poznámka ani verze do otisku nepatří');
  const r3 = JSON.parse(JSON.stringify(r)); r3.params.poklesy = 3; assert.notEqual(NF.itemFingerprint(r3, g), a, 'parametr');
  const r4 = JSON.parse(JSON.stringify(r)); r4.texts.opakovane += ' X'; assert.notEqual(NF.itemFingerprint(r4, g), a, 'znění');
  assert.notEqual(NF.itemFingerprint(r, { co: g.co + ' X' }), a, 'text Co schvalujete');
  assert.ok(NF.newVersion(s, 'C-CILE', { params: { high: 11 } }).ok); assert.equal(NF.item(s, 'C-CILE').version, 'v2');
});

test('Bod 3: karta po opakovaných poklesech a I-HYPO končí větou o poradě s lékařem; bez výzvy aplikace volat', ({ NF, D }) => {
  const s = at(D, 'custom'); s.role = 'patient'; s.meal = null; s.hypoAlertSeen = null; s.page = 'today';
  const t = text(NF, s);
  assert.ok(t.indexOf(REPEAT) >= 0, 'karta po opakovaných poklesech');
  assert.ok(NF.item(s, 'B-HYPO').texts.opakovane.endsWith(REPEAT));
  assert.ok(NF.instructionCatalog().find(c => c.id === 'I-HYPO').text.endsWith(REPEAT));
  NF.instructionCatalog().forEach(c => assert.doesNotMatch(c.text, CALL_RE, c.id));
  assert.doesNotMatch(NF.item(s, 'B-HYPO').texts.opakovane, CALL_RE);
  assert.doesNotMatch(t, /snězte víc|sněz víc/);
});

test('02 B6: na chybějící pravidlo se jiné texty neodkazují (I-MENE, I-HYPO, I-VYSOKA)', ({ NF, D }) => {
  const cat = id => NF.instructionCatalog().find(c => c.id === id);
  let s = at(D, 'custom');
  assert.equal(NF.instrTextOf(s, cat('I-NEVIM')).text, cat('I-NEVIM').text, 'se schválenými pravidly beze změny');
  s.role = 'patient'; s.meal = null; s.hypoAlertSeen = null; s.page = 'today';
  reject(NF, s, 'I-MENE'); /* rozhodnutí garanta přežívají přehrání kapitoly (deník garanta) – proto pořadí od schváleného */
  assert.doesNotMatch(text(NF, s).split('Glukóza vám za posledních')[1] || 'chybí karta', /„Méně jídla než obvykle“/, 'karta po poklesech bez odkazu na I-MENE');
  assert.doesNotMatch(NF.dropRuleRefs(s, 'Snězte nejdřív maso, potom zbytek jídla. Když budete mít dost dřív, než jídlo dojíte, řiďte se pravidlem „Méně jídla než obvykle“.'), /Méně jídla/, 'rada k pořadí v2');
  s = at(D, 'custom'); reject(NF, s, 'I-HYPO');
  assert.doesNotMatch(NF.instrTextOf(s, cat('I-MENE')).text, /nízké glukóze/, 'I-MENE bez odkazu');
  assert.match(NF.instrTextOf(s, cat('I-MENE')).text, /alkoholu/);
  assert.match(NF.instrTextOf(s, cat('I-NEVIM')).text, /pravidlem k vysoké glukóze\.$/);
  assert.match(NF.instrTextOf(s, cat('I-NEMOC-BAZAL')).text, /klesá pod 4 mmol\/l opakovaně, vyhledejte/);
  assert.doesNotMatch(NF.instrTextOf(s, cat('I-NEMOC-BAZAL')).text, /pravidlem k nízké/);
  reject(NF, s, 'I-VYSOKA');
  assert.match(NF.instrTextOf(s, cat('I-NEVIM')).text, /Změřte glukózu za \{v\}\.$/, 'bez obou pravidel jen měřit');
});

test('Bod 4: připomínky v telefonu – nejvýš 4 denně, časy ze zaučení, k zapsanému jídlu nepřijdou, komponenta oznámení', ({ NF, D }) => {
  const s = at(D, 'lateMeal'); s.role = 'patient';
  const st = NF.reminderSettings(s);
  assert.equal(JSON.stringify(st.times), JSON.stringify({ breakfast: '7:00', lunch: '12:00', dinner: '18:00', basal: '21:00' }), 'časy vybrané se sestrou');
  assert.equal(st.max, 4);
  assert.equal(NF.setReminderTime(s, 'lunch', '3:00').ok, false, 'jen čas z nabídky');
  const w = at(D, 'week'); /* 12. 10. v 19:00: snídaně i oběd zapsané, večeře ne */
  const n = NF.notifications(w), keys = n.map(x => x.key);
  assert.ok(keys.indexOf('breakfast') < 0 && keys.indexOf('lunch') < 0, 'zapsané jídlo – připomínka nepřijde');
  assert.ok(keys.indexOf('dinner') >= 0 && keys.indexOf('basal') < 0, 'večeře ano, bazál ve 21:00 ještě ne');
  assert.ok(n.length <= 4);
  n.forEach(x => assert.doesNotMatch(x.text, /\d+ j\.|píchněte|zvyšte/, 'otázka, ne pokyn k dávce'));
  assert.match(NF.screens.phoneNotice(w), /class="phone-notice"[\s\S]*Chystáte se k večeři\? Otevřete NutriFee/);
  NF.toggleReminder(w, 'dinner'); assert.ok(NF.notifications(w).every(x => x.key !== 'dinner'), 'pacient připomínku vypne');
  s.page = 'plan'; assert.match(html(NF, s), /Připomínky v telefonu[\s\S]*data-action="reminderToggle"/);
  const t = at(D, 'training'); assert.match(html(NF, t), /data-action="reminderTime" data-value="breakfast:7:00"/, 'sestra vybere časy');
  assert.ok(NF.trainingItems(t).some(x => x.id === 'reminders' && x.oral));
});

test('Bod 5: bez exportu report v části Bezpečnost řekne, že noční hodnoty chybí', ({ NF, D }) => {
  const s = at(D, 'reviewSummary'); s.role = 'doctor'; s.page = 'review';
  NF.startReview(s, D.habitCatalog);
  assert.ok(text(NF, s).indexOf('Noční hodnoty nejsou k dispozici – bez exportu nelze posoudit noční poklesy.') >= 0);
  const s2 = at(D, 'reviewProposals'); s2.role = 'doctor'; s2.page = 'review'; s2.review.step = 1;
  assert.ok(text(NF, s2).indexOf('Noční hodnoty nejsou k dispozici') < 0, 's nahraným exportem se věta neukáže');
});

test('Jeden lékař a jiná dávka než v plánu (vlastník 1. 11. 2026, body 1 a 5): původ dávky, karta po dvou jiných dávkách, bez jiného lékaře; v kroku 1 „Ano, jinak“', ({ NF, D }) => {
  const s = at(D, 'firstMeal');
  assert.equal(NF.doseElsewhere, undefined);
  assert.ok(!NF.FIXED_TRAINING.some(x => x[0] === 'doseElsewhere'), 'bod zaučení o jiném lékaři zrušen');
  const t = text(NF, s);
  assert.ok(t.indexOf('Podle plánu z 5. 10.: 8 j.') >= 0, t.slice(0, 300));
  assert.ok(!/mezitím změnil|jiný lékař|hospitaliz/.test(t), 'o jiném lékaři se nemluví');
  assert.match(html(NF, s), /data-action="mealBolus" data-value="other"[^>]*>.*Ano, jinak/);
  const s2 = at(D, 'lateMeal'), p = NF.activePlan(s2);
  ['2026-10-12T13:00:00', '2026-10-13T09:30:00'].forEach((at2, i) => s2.episodes.push({ id: 'X' + i, planId: p.id, meal: 'lunch', foodId: s2.foods[0].id, at: at2, insulin: { prescribed: 10, confirmed: 'other', units: 8 - i, at: at2 } }));
  s2.episodes.sort((a, b) => a.at < b.at ? -1 : 1);
  const de = NF.doseOffPlan(s2); assert.equal(de.length, 1); assert.equal(de[0].meal, 'lunch');
  s2.role = 'patient'; s2.page = 'today';
  const t2 = text(NF, s2);
  assert.ok(t2.indexOf('Jiná dávka než v plánu') >= 0 && t2.indexOf('Dvakrát jste zapsali jinou dávku než v plánu. Řekněte to prosím na kontrole sestře.') >= 0, t2.slice(0, 400));
  assert.ok(!/mezitím změnil|jiný lékař|hospitaliz/.test(t2));
  assert.equal(NF.activePlan(s2).doses.lunch.units, 10, 'plán se nemění');
});

test('Bod 7: body, které nejdou ověřit z dat, ověří sestra; „Vše sedí“ je nepřepíná; léky se třetí volbou', ({ NF, D }) => {
  const s = at(D, 'reviewProposals'), keys = NF.nurseKeys(s);
  assert.equal(keys.join(), 'technika,jidlo,vecer,stres'); /* 31/02 B1 (SCHEMA 80): jídlo po jídle a jídlo pozdě večer a v noci jsou dva body sestry */
  assert.equal(NF.nurseAnswer(s, 'vecer'), false, '31/02 B1: o svátcích pacient jedl pozdě večer – sestra „Nesedí“, stejně jako lékař u bazálu');
  assert.equal(s.review.meds, 'no', 'jiný lék na diabetes zjistila sestra před lékařem (SCHEMA 84: Ne / Ano)'); assert.equal(s.review.health, 'no');
  const pr = s.review.proposals.find(x => x.id === 'PR-BREAKFAST');
  assert.ok(pr && pr.nurse.filter(Boolean).length === 3, 'prandHigh má tři body sestry');
  s.review.verify[pr.id] = {}; s.role = 'doctor';
  NF.verifyAll(s, pr.id);
  pr.nurse.forEach((k, i) => { if (k) assert.equal(s.review.verify[pr.id][i], undefined, 'Vše sedí bod sestry nepřepne'); });
  pr.nurse.forEach((k, i) => { if (k) assert.equal(NF.verifyState(s, pr, i), true, 'stav bodu = odpověď sestry'); });
  s.nurseCheck.points.technika = false; assert.equal(NF.verifyState(s, pr, pr.nurse.indexOf('technika')), false);
  s.page = 'review'; s.review.step = 2; s.review.proposals.forEach(x => { if (x.id !== pr.id && s.review.proposals.indexOf(x) < s.review.proposals.indexOf(pr)) NF.decideProposal(s, x.id, { choice: 'keep', branch: 'keep' }); });
  assert.match(html(NF, s), /sestra s pacientem: (sedí|nesedí)/);
  assert.ok(NF.setReviewMeds(s, 'health').ok, 'změnil se zdravotní stav'); assert.equal(s.review.health, 'yes', 'SCHEMA 84: zdravotní stav je druhá otázka');
  const s0 = at(D, 'reviewSummary'); s0.role = 'doctor'; s0.page = 'review';
  assert.match(html(NF, s0), /Sestra · S pacientem před lékařem[\s\S]*data-action="nurseMeds"[\s\S]*data-action="nurseCheck"/);
});

test('Bod 8 a C15: mírnější cíle jako druhá sada C-CILE; semafor čte cíle pacienta', ({ NF, D }) => {
  const s = at(D, 'doses'), m = NF.targetPreset(s, 'mirnejsi');
  assert.equal(m.tirGoal, 50); assert.equal(m.tbrGoal, 1); assert.equal(NF.targetPreset(s, 'bezne').tirGoal, 70);
  assert.match(html(NF, s), /data-action="targetPreset" data-value="mirnejsi"/);
  assert.equal(NF.item(s, 'S-SEMAFOR').params.tir_zelena, undefined, 'zelená hranice není druhá hodnota v S-SEMAFOR');
  const r = at(D, 'reviewProposals'), p = NF.activePlan(r);
  r.sensorSummary = { tir: 55, below: 0, veryLow: 0, above: 45, days: 14, period: 'x', availability: 95 };
  assert.equal(NF.summary(r, p.id).tirState, 'warn', 'běžné cíle: 55 % je oranžová');
  NF.setTargetPreset(r, p.targets, 'mirnejsi'); assert.equal(NF.summary(r, p.id).tirState, 'ok', 'u mírnějších cílů je 55 % v cíli');
});

test('Bod 10 a 02 B9: pacient čte „Tato pravidla připravil NutriFee a posoudil je lékař.“, bez osobního ručení', ({ NF, D }) => {
  const s = at(D, 'firstMeal'); s.role = 'patient'; s.meal = null; s.page = 'safety';
  const t = text(NF, s);
  assert.ok(t.indexOf('Tato pravidla připravil NutriFee a posoudil je lékař.') >= 0);
  assert.doesNotMatch(t, /odborně ručí/);
  assert.ok(t.indexOf('NutriFee pro vás přestává platit') >= 0, '06 B4');
  const d = NF.screens.itemDetail(s, 'R-PORCE'); assert.doesNotMatch(d, /schvaluje lékař|Aplikace si nic/); assert.match(d, /Nic si nevymýšlíme/);
});

test('Bod 11: scénář 5 – garant navrhuje vypnutí, výrobce provádí', ({ NF, D }) => {
  const s = at(D, 'registry'); s.role = 'doctor'; s.page = 'registry';
  const t = text(NF, s);
  assert.ok(t.indexOf('Navrhnout vypnutí položky') >= 0); assert.ok(t.indexOf('Vypnout položku hned') < 0);
  assert.ok(t.indexOf('postupem výrobce pro změny') >= 0);
});

test('06 A2, B4, B6: Co neděláme, vylučovací kritéria, otázka na novou dávku', ({ NF, D }) => {
  const h = at(D, 'handover'); h.onboarding.page = 5; const t = text(NF, h);
  assert.ok(t.indexOf('Nízkou ani vysokou glukózu nehlídáme.') >= 0); assert.ok(t.indexOf('upozorňuje aplikace vašeho senzoru') < 0);
  assert.ok(NF.trainingItems(h).some(x => x.id === 'alerts'));
  assert.equal(NF.ELIGIBILITY.length, 4, 'podmínky zůstávají čtyři');
  const e = at(D, 'enroll'); e.enrollment.criteria = {}; NF.ELIGIBILITY.forEach(c => NF.setEligibility(e, c[0], true));
  assert.ok(NF.planBlockers(e).some(x => /vylučovací/.test(x)));
  NF.setEligibility(e, NF.EXCLUSION[0], true); assert.ok(!NF.planBlockers(e).some(x => /vylučovací/.test(x)));
  const n = at(D, 'newplan'); n.role = 'patient'; n.page = 'newplan';
  assert.equal(n.onboarding.readback, null, 'u nového plánu se ptáme znovu');
  assert.match(html(NF, n), /Souhlasí s tím, co vám řekl lékař\?[\s\S]*data-action="confirmUnderstanding"[^>]*disabled/);
  n.onboarding.readback = 'yes'; assert.doesNotMatch(html(NF, n), /data-action="confirmUnderstanding"[^>]*disabled/);
});

test('06 B5: bod „Opsané nejvyšší hodnoty se shodují s exportem“ s větví a údajem z dat', ({ NF, D }) => {
  const s = at(D, 'reviewProposals'), pr = s.review.proposals.find(x => x.id === 'PR-BREAKFAST');
  const i = pr.verify.indexOf('Opsané nejvyšší hodnoty se shodují s exportem');
  assert.ok(i >= 0); assert.match(pr.facts[i].text, /shoda u \d+ z/); assert.equal(pr.facts[i].against, false, 'v příběhu shoda sedí');
  assert.ok(pr.branches.some(b => /bod 9 nesedí/.test(b.when) && b.action === 'keep'));
  assert.ok(pr.weak.some(w => /jen opsaných/.test(w)));
});

test('02 B7, B8: doplněk se stáhne i po nezapočítaných pokusech; nové jídlo „jako X“ převezme údaje X', ({ NF, D }) => {
  const s = at(D, 'custom'), f = s.foods.find(x => x.name === 'Loupák s máslem'), p = NF.activePlan(s);
  ['as', 'other', 'unknown'].forEach((c, i) => s.episodes.push({ id: 'L' + i, planId: p.id, meal: 'breakfast', foodId: f.id, at: '2026-10-1' + (i + 1) + 'T07:00:00', insulin: { prescribed: 8, confirmed: c, units: 8 }, advice: [{ lever: 'addon', accepted: true }], manual: { before: 7, peak: 13, lowAsked: true } }));
  assert.equal(JSON.stringify(NF.addonTries(s, f.id, 'breakfast')), JSON.stringify({ n: 3, inTarget: 0 })); assert.ok(NF.addonWithdrawn(s, f.id, 'breakfast'));
  const like = s.foods.find(x => x.name === 'Smažený řízek s bramborovou kaší'), r = NF.addFood(s, 'Řízek jako od babičky', { like: like.id }, { force: true });
  assert.equal(NF.leverFits(r.food, 'addon'), false, 'řízek bílkovinu má – doplněk ne');
  assert.equal(NF.leverFits(r.food, 'order'), true); assert.match(NF.leverText(s, 'order', r.food), /pokud jsou v jídle/);
  const kase = NF.addFood(s, 'Kaše od babičky', { like: s.foods.find(x => x.name === 'Ovesná kaše s mlékem a banánem').id }, { force: true });
  assert.equal(NF.leverFits(kase.food, 'order'), false, 'jako jednolité jídlo');
  assert.match(NF.leverText(s, 'addon', kase.food), /bílý jogurt nebo hrst ořechů/, 'skupina doplňku X');
});

test('Seznam jídel a texty (02 C5–C11, zásada 9, 06 B7, B8, 07 B4, B10)', ({ NF, D }) => {
  const s = at(D, 'week'), F = n => s.foods.find(x => x.name === n);
  assert.ok(!s.foods.some(f => /hermel/i.test(f.name)));
  assert.equal(F('Koblihy').bilkovina, true); assert.equal(F('Kuřecí nugety mražené').jednolite, true); assert.equal(F('Smažený sýr s hranolkami').slozky.length, 0);
  assert.match(NF.item(s, 'R-DOPLNEK').lists.skupinyNazvy.slane, /bez přílohy/);
  assert.doesNotMatch(NF.item(s, 'R-MILNIKY').texts.known, /poradit/);
  s.role = 'patient'; s.page = 'food'; const t = text(NF, s);
  assert.ok(t.indexOf('Kam se po něm glukóza dostávala') >= 0); assert.doesNotMatch(t, /Kam se po něm glukóza dostane|Co u vás pomohlo|bez krajních hodnot;/);
  s.page = 'plan'; assert.ok(text(NF, s).indexOf('4–10,0 mmol/l') >= 0, 'pacient vidí hranici 4');
  const pv = at(D, 'preview'); pv.role = 'patient'; pv.page = 'preview'; assert.doesNotMatch(text(NF, pv), /pomohl/);
  assert.equal(NF.screens.peakAskCard, undefined, '06 C1: mrtvý kód s psaním desetinného čísla smazán');
});

test('07 A2, B3, B8: volič dávky mřížkou, zapomenutý zápis ze včerejška, spolehlivost dat na kontrole', ({ NF, D }) => {
  const s = at(D, 'doses');
  /* SCHEMA 84 (rozhodnutí 9, agent P+D): posuvník hodnoty místo mřížky a stepperu */ assert.match(html(NF, s), /id="vs-dose-breakfast" min="1" max="40"[^>]*data-vs-action="doseSet" data-vs-prefix="breakfast:"/);
  assert.ok(NF.setDoseValue(s, 'lunch', 12).ok); assert.equal(s.draft.doses.lunch.units, 12); assert.equal(NF.setDoseValue(s, 'lunch', 41).ok, false);
  const e = at(D, 'enroll'); /* SCHEMA 84 (rozhodnutí 9, agent P+D): posuvník hodnoty místo mřížky a stepperu */ assert.match(html(NF, e), /id="vs-bl-tir" min="0" max="100"[^>]*data-vs-action="baselineSet" data-vs-prefix="tir:"/);
  const y = at(D, 'lateMeal'), gaps = NF.yesterdayGaps(y);
  assert.ok(gaps.some(g => g.meal === 'dinner' && g.day === '2026-10-12'), 'včerejší večeře chybí');
  y.role = 'patient'; y.page = 'today'; assert.match(html(NF, y), /data-action="mealRetroYesterday" data-value="dinner"/);
  y.meal = { retro: true, day: '2026-10-12', meal: 'dinner', step: 1, decisions: {}, reasons: {} };
  assert.equal(NF.retroAt(y, 18.5), '2026-10-12T18:30:00', 'zpětný zápis ke včerejšku');
  const r = at(D, 'reviewProposals'), sm = r.review.summary;
  assert.ok(sm.slotsAll > sm.meals && sm.withPeak <= sm.meals);
  r.page = 'review'; r.review.step = 1; assert.match(text(NF, r), /zapsáno \d+ ze? \d+ hlavních jídel · nejvyšší hodnota u \d+ ze? \d+/);
});

test('01 M3: zamítnuté cíle – štítek semaforu zůstává v řádku „Dlaždice vycházejí z:“', ({ NF, D }) => {
  const s = at(D, 'reviewProposals'); reject(NF, s, 'C-CILE'); s.role = 'doctor'; s.page = 'review'; s.review.step = 1;
  const m = html(NF, s), line = (m.match(/Dlaždice vycházejí z: [\s\S]*?<\/p>/) || [''])[0];
  assert.match(line, /data-value="C-CILE"/); assert.match(line, /data-value="S-SEMAFOR"/);
});

console.log('\n' + passed + ' prošlo, ' + failed + ' selhalo' + (fails.length ? ': ' + fails.join(' | ') : ''));
process.exitCode = failed ? 1 : 0;
