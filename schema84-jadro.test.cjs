/* SCHEMA 84 – jádro kontroly podle rozhodnutí vlastníka 4. 11. 2026 (navrhy-designu/32-overeni-cile-2026-11-04/05-rozhodnuti.md, předávka 07-schema84-jadro.md).
   Hlídá rozhodnutí 1–6 (volič „jiná dávka“ u každé dávky, rady první bez zámku, blok „zvýšit“ jen z čistých poklesů, vývoj v čase, kohorta jen inzulin,
   hmotnost · návyky · cíle na kontrole) a opravy bez dotazu ze zprávy 02 (A4, B2, B5, B6, B9, B10, B12, C1, C2, C6–C9).
   Spuštění: node schema84-jadro.test.cjs   (ONLY=část názvu spustí jen vybrané testy) */
'use strict';
const fs = require('node:fs'), path = require('node:path');
const assert = require('node:assert/strict');
const P = require('./pravdivost.test.cjs');

let passed = 0, failed = 0; const fails = [];
function test(name, fn) {
  if (process.env.ONLY && name.indexOf(process.env.ONLY) < 0) return;
  try { fn(P.boot()); console.log('OK  ', name); passed++; } catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); }
}
const html = (NF, s) => String(P.screenHtml(NF, s)).replace(/ /g, ' ');
const text = (NF, s) => P.norm(P.screenText(P.parse(P.screenHtml(NF, s))));
const at = (D, id, B) => D.play(D.indexOf(id), B);
const review = (D, id, B) => { const s = at(D, id || 'reviewProposals', B); s.role = 'doctor'; s.page = 'review'; return s; };
const decideAll = (NF, D, s) => { D.reviewStory(s, s.branches || D.defaults); };

/* ---------- rozhodnutí 1: volič „jiná dávka“ u každé dávky ---------- */
test('1: u karty s větví „ponechat“ má lékař volič „jiná dávka“; změna se zapíše jako rozhodnuto jinak než postup', ({ NF, D }) => {
  const s = review(D), r = s.review, bz = r.proposals.find(p => p.id === 'PR-BAZAL');
  assert.ok(bz && !bz.row, 'karta k bazálu existuje');
  bz.verify.forEach((_, i) => { if (!NF.nurseKey(bz, i)) r.verify[bz.id] = Object.assign(r.verify[bz.id] || {}, { [i]: true }); });
  const br = NF.screens.proposalBranch(s, bz); assert.equal(br.action, 'keep', 'bod 2 podle sestry nesedí → ponechat');
  r.proposals.forEach(p => { if (p !== bz && !p.row && r.proposals.indexOf(p) < r.proposals.indexOf(bz)) NF.decideProposal(s, p.id, { choice: 'keep', branch: 'keep' }); });
  r.other = bz.id; const h = html(NF, s);
  assert.match(h, /Jiná dávka:/); /* SCHEMA 84 (rozhodnutí 9, agent P+D): posuvník hodnoty místo mřížky a stepperu */ assert.match(h, /data-action="propDoseSet" data-value="PR-BAZAL:17"/); assert.match(h, /id="vs-other-PR-BAZAL" min="1" max="60"[^>]*data-vs-action="propDoseSet" data-vs-prefix="PR-BAZAL:"/);
  assert.ok(NF.setReviewDose(s, 'basal', 16).ok); assert.match(html(NF, s), /data-action="propDecide" data-value="PR-BAZAL:other"/);
  assert.equal(NF.decideOtherDose(s, 'PR-BAZAL', 18, 'keep').ok, false, 'jiná dávka musí být jiná než dnes');
  const res = NF.decideOtherDose(s, 'PR-BAZAL', 16, 'keep'); assert.ok(res.ok);
  const dec = r.decisions['PR-BAZAL']; assert.equal(dec.choice, 'other'); assert.equal(dec.units, 16); assert.equal(dec.againstBranch, true); assert.equal(dec.againstData, false);
  assert.equal(r.newDoses.basal.units, 16);
  const d = NF.planFromReview(s); assert.equal(d.doses.basal.units, 16); assert.ok(d.decisions.some(x => /Bazál na noc/.test(x.title) && /lékař nastavil 16 j\. \(dřív 18 j\.\)/.test(x.text)));
  /* výši nikdy nenavrhuje aplikace: v registru ani v kartě není číslo jednotek */
  assert.equal(/\d+\s*j\./.test(bz.title + bz.why + bz.branches.map(b => b.text).join()), false);
});

test('1: jídlo dne bez karty má řádek „N z M nad cílem · bez návrhu (práh)“ se stejným voličem; změna = jiná dávka bez návrhu; vydání plánu projde', ({ NF, D }) => {
  const s = review(D), r = s.review, row = r.proposals.find(p => p.id === 'PR-DINNER');
  assert.ok(row && row.row, 'večeře bez karty je řádek'); assert.match(row.why, /^\d+ z \d+ nad cílem · medián vrcholu \d+,\d mmol\/l · bez návrhu \(práh 2\/3 nad cílem\)$/);
  assert.equal(NF.nextProposal(s).row, undefined, 'řádek se nerozhoduje jako karta'); assert.ok(!NF.reviewRows(s).some(p => !p.row));
  r.step = 2; const h2 = html(NF, s); assert.match(h2, /Dávky bez návrhu \(\d+\)/); /* SCHEMA 84 (rozhodnutí 9, agent P+D): posuvník hodnoty místo mřížky a stepperu */ assert.match(h2, /data-action="propDoseSet" data-value="PR-DINNER:9"/); assert.match(h2, /id="vs-row-PR-DINNER"/);
  decideAll(NF, D, s); assert.equal(NF.reviewComplete(s), true, 'řádky nevyžadují rozhodnutí');
  /* krok 3: volič u každé dávky */
  r.step = 3; const h3 = html(NF, s); assert.match(h3, /data-action="revDoseSet" data-value="dinner:9"/); /* SCHEMA 84 (rozhodnutí 9): posuvník */ assert.match(h3, /data-action="revDoseSet" data-value="basal:17"/); assert.match(h3, /id="vs-rev-basal"[^>]*aria-label="Bazál: jednotky"/); assert.match(h3, /Dávku určujete vy/);
  assert.ok(NF.setPlanDose(s, 'dinner', 9).ok);
  const dec = r.decisions['PR-DINNER']; assert.equal(dec.choice, 'other'); assert.equal(dec.units, 9); assert.equal(dec.noProposal, true); assert.equal(dec.viaPlan, true);
  assert.match(html(NF, s), /jiná dávka bez návrhu/);
  assert.ok(NF.setPlanDose(s, 'dinner', 8).ok, 'zpět na dávku plánu'); assert.equal(r.decisions['PR-DINNER'].choice, 'keep'); assert.equal(r.decisions['PR-DINNER'].units, null); assert.equal(r.newDoses.dinner.units, 8);
  assert.ok(NF.stepPlanDose(s, 'dinner', 1).ok); assert.equal(r.newDoses.dinner.units, 9);
  const res = NF.issueFromReview(s, D.habitCatalog); assert.ok(res.ok, res.error); assert.equal(res.plan.doses.dinner.units, 9); assert.equal(res.plan.doses.breakfast.units, 10);
  assert.ok(res.plan.decisions.some(x => /Inzulin k večeři/.test(x.title) && /lékař nastavil 9 j\. \(dřív 8 j\.\)/.test(x.text)), 'pacient se dozví i o dávce bez návrhu');
  s.role = 'patient'; s.page = 'newplan'; assert.match(text(NF, s), /Inzulin k večeři – lékař nastavil 9 j\./);
});

test('1 + 3: zvýšení u jídla s poklesem při obvyklé porci je rozhodnutí proti datům; poklesy po menší porci jen varování', ({ NF, D }) => {
  const s = review(D), r = s.review, lunch = r.proposals.find(p => p.id === 'PR-LUNCH');
  assert.equal(lunch.lowBlock, false); const lows = NF.lowEvents(s).filter(x => x.meal === 'lunch');
  assert.equal(lows.length, 2); assert.ok(lows.every(x => x.clean === false && x.why === 'menší porce'), 'poklesy po menší porci nejsou čisté');
  assert.ok(lunch.weak.some(w => /po menší porci.*poučit pacienta/.test(w)));
  s.episodes.forEach(e => { if (e.meal === 'lunch' && e.manual && e.manual.low === true) e.portion = 'usual'; }); NF.refreshReview(s);
  const l2 = r.proposals.find(p => p.id === 'PR-LUNCH'); assert.equal(l2.lowBlock, true); assert.ok(NF.lowEvents(s).filter(x => x.meal === 'lunch').every(x => x.clean));
  const res = NF.decideOtherDose(s, 'PR-LUNCH', 12, 'keep'); assert.ok(res.ok);
  assert.equal(r.decisions['PR-LUNCH'].choice, 'other'); assert.equal(r.decisions['PR-LUNCH'].againstData, true);
  r.step = 2; assert.match(html(NF, s), /proti datům \(pokles pod 4\)/);
});

/* ---------- rozhodnutí 2: rady první, dávka vždy k posouzení ---------- */
test('2: karta k dávce vzniká i při „nejdřív rady“; bod 10 „Pacient rady k jídlu zkoušel“ podle dat nesedí → ponechat dávku, posílit radu; text nabídnuto N×, přijato M×', ({ NF, D }) => {
  const s = review(D, 'reviewProposals', { response: 'declines' }), r = s.review;
  const rady = r.proposals.find(p => p.id === 'PR-BREAKFAST-RADY'), dose = r.proposals.find(p => p.id === 'PR-BREAKFAST');
  assert.ok(rady && dose && !dose.row, 'obě karty'); assert.ok(r.proposals.indexOf(rady) < r.proposals.indexOf(dose), '„Nejdřív rady“ je první');
  assert.match(rady.why, /rada k jídlu: nabídnuto \d+×, přijato \d+×/); assert.doesNotMatch(rady.why, /přijata jen u/);
  const i = dose.verify.findIndex(t => /Pacient rady k jídlu zkoušel/.test(t)); assert.equal(i, dose.verify.length - 1, 'bod 10');
  assert.match(dose.verify[i], /aspoň 3× z nejméně 5 nabídek/, 'parametry D-PRAND dosazené');
  assert.ok(dose.facts[i].against && !dose.facts[i].block); assert.match(dose.facts[i].text, /^nabídnuto \d+×, přijato \d+×/);
  assert.ok(dose.branches.some(b => b.when === 'bod 10 nesedí' && b.text === 'ponechat dávku, posílit radu'));
  NF.verifyAll(s, dose.id); assert.equal(r.verify[dose.id][i], undefined, '„Vše sedí“ bod s daty jinak nepřepne');
  r.verify[dose.id][i] = false; assert.equal(NF.screens.proposalBranch(s, dose).text, 'ponechat dávku, posílit radu');
  assert.ok(dose.weak.some(w => /karta „Nejdřív rady“ je výš/.test(w)));
  /* modelový lékař bod označí „nesedí“ a dávku ponechá; v kroku 3 má přesto volič */
  const c = at(D, 'reviewConfirm', { response: 'declines' }); assert.equal(c.review.decisions['PR-BREAKFAST'].choice, 'keep');
  assert.match(dose.why, /Rada k jídlu: nabídnuto \d+×, přijato \d+×/);
});

test('2: brána rad neplatí pod odmitnutiMin nabídek – žádná karta „Nejdřív rady“, bod 10 říká „brána rad se neuplatní“', ({ NF, D }) => {
  const s = review(D, 'reviewProposals', { response: 'declines' });
  /* pestrá strava: u snídaní aplikace rady skoro nenabízela – necháme nabídky jen u tří zápisů (méně než odmitnutiMin = 5) */
  let kept = 0; s.episodes.forEach(e => { if (e.meal !== 'breakfast' || !e.advice) return; if (e.advice.some(a => a.lever !== 'portion') && kept < 3) { kept++; return; } e.advice = e.advice.filter(a => a.lever === 'portion'); }); NF.refreshReview(s);
  const r = s.review; assert.equal(r.proposals.some(p => p.id === 'PR-BREAKFAST-RADY'), false, 'bez brány'); assert.ok(r.proposals.some(p => p.id === 'PR-LUNCH-RADY'), 'u oběda brána dál platí');
  const dose = r.proposals.find(p => p.id === 'PR-BREAKFAST'); assert.ok(dose && !dose.row);
  const i = dose.verify.length - 1; assert.equal(!!dose.facts[i].against, false); assert.match(dose.facts[i].text, /brána rad se neuplatní/);
  assert.equal(dose.priority, 2, 'bez brány je karta k dávce na obvyklém místě');
});

/* ---------- rozhodnutí 4: vývoj v čase ---------- */
test('4: dva mediány „první polovina období · poslední 4 týdny“ a slovo směru od 1,0 mmol/l – u karet k dávce i v tabulce jídel dne', ({ NF, D }) => {
  const s = review(D), r = s.review, b = r.proposals.find(p => p.id === 'PR-BREAKFAST');
  assert.equal(NF.param(s, 'S-SEMAFOR', 'smer_mmol', 0), 1); assert.equal(NF.param(s, 'S-SEMAFOR', 'vyvoj_tydny', 0), 4);
  const row = (b.rows || []).find(x => x.label === 'Vývoj vrcholů v čase'); assert.ok(row);
  assert.match(row.text, /^první polovina období medián \d+,\d mmol\/l \(n = \d+\) · poslední 4 týdny \d+,\d mmol\/l \(n = \d+\) · (zhoršuje se|zlepšuje se|beze změny)/);
  assert.equal(b.stats.trend.dir, 'worse', 'modelové snídaně se od listopadu zhoršují (F56)');
  r.step = 1; const t = text(NF, s); assert.match(t, /Jídla dne za období/); assert.match(t, /Snídaně \d+ \d+ \(\d+ %\) \d+,\d \d+,\d → \d+,\d · zhoršuje se karta: hodnoty nad cílem/); assert.match(t, /Ráno před snídaní \d+ \d+ nad 7,2 7,0/); assert.match(t, /Večeře .* bez návrhu/);
  r.step = 2; r.verify['PR-BREAKFAST'] = {}; assert.match(html(NF, s), /Vývoj vrcholů v čase/);
  const bz = r.proposals.find(p => p.id === 'PR-BAZAL'); assert.ok((bz.rows || []).some(x => x.label === 'Vývoj ranních hodnot v čase'));
  /* práh slova směru */
  const mk = (a, b2) => NF.trendOf(s, [{ at: '2026-10-10T07:00:00', v: a }, { at: '2026-10-11T07:00:00', v: a }, { at: '2027-01-01T07:00:00', v: b2 }, { at: '2027-01-02T07:00:00', v: b2 }], '2026-10-05T09:00:00', '2027-01-05T09:00:00');
  assert.equal(mk(10, 10.5).dir, 'same'); assert.equal(mk(10, 11.2).dir, 'worse'); assert.equal(mk(11.5, 10).dir, 'better');
  assert.equal(NF.trendOf(s, [{ at: '2026-10-10T07:00:00', v: 10 }], '2026-10-05T09:00:00', '2027-01-05T09:00:00'), null, 'z jedné hodnoty nic');
});

/* ---------- rozhodnutí 5: kohorta jen inzulin ---------- */
test('5: kohorta jen inzulin – podmínka zařazení, K-KRITERIA, pravidla bez vět o tabletách, otázka na kontrole Ne / Ano', ({ NF, D }) => {
  assert.equal(NF.ELIGIBILITY.find(c => c[0] === 'insulinOnly')[1], 'Inzulin v pevných dávkách a žádný jiný lék na diabetes (ani tablety, ani GLP-1; premixy ne)');
  const s = review(D, 'reviewSummary'), k = NF.item(s, 'K-KRITERIA');
  assert.match(k.summary, /nebere žádný jiný lék na diabetes: ani tablety, ani GLP-1/); assert.doesNotMatch(k.summary, /navíc nevadí/); assert.match(k.texts.bezpeci, /jiný lék na diabetes/);
  ['I-NEMOC-JIDLO', 'I-MENE', 'I-HYPO', 'I-NEMOC-BAZAL', 'I-VYSOKA'].forEach(id => { assert.doesNotMatch(NF.item(s, id).summary, /tablet/i, id + ' bez vět o tabletách'); });
  NF.instructionCatalog().forEach(c => assert.doesNotMatch(c.text, /tablet/i, c.id + ' katalog bez tablet'));
  assert.equal(JSON.stringify(NF.NURSE_MEDS), JSON.stringify([['no', 'Ne'], ['yes', 'Ano']])); assert.equal(NF.MEDS_QUESTION, 'Začal pacient brát jiný lék na diabetes?');
  const h0 = html(NF, s); assert.match(h0, /Začal pacient brát jiný lék na diabetes\?/); assert.match(h0, /data-action="nurseMeds" data-value="yes"/); assert.doesNotMatch(h0, /Léky mimo inzulin/);
  assert.ok(NF.setNurseMeds(s, 'yes').ok); assert.ok(s.events.some(t => t.what === 'kontrola.leky' && t.detail === 'začal jiný lék na diabetes (zapsala sestra)' && t.data.value === 'yes'));
  assert.match(text(NF, s), /zápisy z období po změně se ve studii hodnotí zvlášť/);
  NF.startReview(s, D.habitCatalog); assert.equal(s.review.meds, 'yes'); s.review.step = 1; assert.match(text(NF, s), /Zapsáno do stopy\. Pacient začal brát jiný lék na diabetes/);
  assert.ok(NF.setReviewMeds(s, 'same').ok, 'starší hodnota se čte'); assert.equal(s.review.meds, 'no');
  /* zařazení bez záznamu „bere i tablety“ */
  const e = at(D, 'enroll'); e.role = 'doctor'; e.page = 'enroll'; const he = html(NF, e); assert.doesNotMatch(he, /enrollPad/); assert.doesNotMatch(he, /navíc nevadí/); assert.match(he, /do NutriFee nepatří/);
  const src = fs.readFileSync(path.join(__dirname, 'app/data/catalogs.js'), 'utf8'); assert.doesNotMatch(src, /tablety na cukrovku/);
});

test('C8: otázka na zdravotní stav zvlášť a podle pohlaví; modelový pacient je muž', ({ NF, D }) => {
  const s = review(D, 'reviewSummary'); assert.equal(s.patient.sex, 'm');
  assert.equal(NF.healthQuestion(s), 'Změnil se zdravotní stav (ledviny, játra, hospitalizace)?'); s.patient.sex = 'f'; assert.match(NF.healthQuestion(s), /těhotenství/); s.patient.sex = 'm';
  assert.match(html(NF, s), /data-action="nurseHealth" data-value="no"/);
  assert.ok(NF.setNurseHealth(s, 'yes').ok); NF.startReview(s, D.habitCatalog); assert.equal(s.review.health, 'yes'); s.review.step = 1; assert.match(text(NF, s), /vylučovací kritéria/);
  assert.ok(NF.setReviewHealth(s, 'no').ok); assert.ok(s.events.some(t => t.what === 'kontrola.stav'));
  const p = at(D, 'reviewProposals'); assert.equal(p.review.meds, 'no'); assert.equal(p.review.health, 'no');
});

/* ---------- rozhodnutí 6: hmotnost, návyky, cíle ---------- */
test('6: hmotnost voličem u sestry (mřížka a ±1), dlaždice „Hmotnost dříve · teď“', ({ NF, D }) => {
  const s = review(D, 'reviewSummary'); const w0 = NF.weightFor(s, NF.activePlan(s), s.clock);
  assert.equal(w0.before.kg, 92); assert.equal(w0.now, null, 'před sestrou jen hodnota z karty');
  const h = html(NF, s); assert.match(h, /Hmotnost pro kontrolu/); /* SCHEMA 84 (rozhodnutí 9, agent P+D): posuvník hodnoty místo mřížky a stepperu */ assert.match(h, /id="vs-weight" min="40" max="160"[^>]*data-vs-action="nurseWeightSet"/); assert.match(h, /data-action="nurseWeightSet" data-value="\d+"/); assert.match(h, /při zařazení 92 kg/);
  assert.equal(NF.setWeight(s, 'sestra', 500).ok, false); assert.ok(NF.setWeight(s, 'sestra', 90).ok); assert.ok(s.events.some(t => t.what === 'hmotnost' && t.data.kg === 90));
  NF.startReview(s, D.habitCatalog); assert.equal(s.review.summary.weight.now.kg, 90); assert.equal(s.review.summary.weight.before.kg, 92);
  s.review.step = 1; const t = text(NF, s); assert.match(t, /Hmotnost 90 kg – o 2 kg méně dříve 92 → teď 90 · −2 kg/);
  const p = at(D, 'reviewProposals'); assert.equal(p.review.summary.weight.now.kg, D.WEIGHT_REVIEW.kg, 'v příběhu sestra vybrala 90 kg');
  assert.equal(NF.WEIGHT_GRID[0], 50); assert.equal(NF.WEIGHT_GRID[NF.WEIGHT_GRID.length - 1], 150);
});

test('6 + C9 + B12: v kroku 3 návyky přepínačem z katalogu, cíle voličem, platnost plánu voličem (92 dní výchozí, 6 týdnů); pravidla „platí obecná pravidla NutriFee v1 · beze změny u pacienta“', ({ NF, D }) => {
  const s = review(D), r = s.review; decideAll(NF, D, s); r.step = 3;
  let h = html(NF, s); assert.match(h, /data-action="revHabit" data-value="H-CAS"/); /* SCHEMA 84 (rozhodnutí 9, agent P+D): posuvník hodnoty místo mřížky a stepperu */ assert.match(h, /data-action="revTargetSet" data-value="tirGoal:75"/); assert.match(h, /data-action="revValidity" data-value="92"/); assert.match(h, /data-action="revValidity" data-value="42"/);
  assert.match(h, /Platí obecná pravidla NutriFee v1 · beze změny u pacienta/); assert.doesNotMatch(h, /potvrzeno beze změny<\/span><\/h3>/);
  assert.equal(NF.reviewHabits(s).join(), NF.planById(s, r.planId).habits.join(), 'výchozí beze změny');
  assert.ok(NF.toggleReviewHabit(s, 'H-CAS').ok); assert.ok(NF.reviewHabits(s).includes('H-CAS')); assert.equal(NF.toggleReviewHabit(s, 'H-NEEXISTUJE').ok, false);
  assert.ok(NF.toggleReviewHabit(s, 'H-ZAPIS').ok); assert.ok(!NF.reviewHabits(s).includes('H-ZAPIS'));
  h = html(NF, s); assert.match(h, /Snídaně ve stejném čase<\/b> <span class="tag info">nový<\/span>/); assert.match(h, /Zapisovat hlavní jídla<\/b> <span class="tag warn">(<svg[^>]*>[\s\S]*?<\/svg>)?vyřazen<\/span>/);
  assert.ok(NF.setReviewValidity(s, 42).ok); assert.equal(NF.setReviewValidity(s, 30).ok, false);
  const d = NF.planFromReview(s); assert.equal(NF.day(d.validUntil), NF.day(NF.addDays(s.clock, 42))); assert.ok(d.habits.includes('H-CAS') && !d.habits.includes('H-ZAPIS'));
  NF.setTarget(r.newTargets, 'tirGoal', 1); assert.equal(NF.planFromReview(s).targets.tirGoal, 75);
  const res = NF.issueFromReview(s, D.habitCatalog); assert.ok(res.ok, res.error); assert.equal(NF.day(res.plan.validUntil), NF.day(NF.addDays(s.clock, 42)));
  assert.ok(s.habits.some(x => x.planId === res.plan.id && x.catalogId === 'H-CAS'), 'nový návyk v plánu P2');
  r.step = 3; h = html(NF, s); assert.doesNotMatch(h, /data-action="revHabit"/, 'po vydání bez přepínačů');
});

/* ---------- bez dotazu: bazál (A4, B6, B9, B10), tabulka jídel (B2, C6, C7), B5, C1, C2 ---------- */
test('A4 + B6 + B9 + B10: karta bazálu – odpověď sestry u bodu 2, okolnosti nocí, ranní opsané hodnoty, přednost jen bez „jídla pozdě večer“ nebo pod 3,0', ({ NF, D }) => {
  const s = review(D), r = s.review, bz = r.proposals.find(p => p.id === 'PR-BAZAL');
  assert.equal(bz.nurse[1], 'vecer'); assert.equal(NF.verifyState(s, bz, 1), false, 'sestra: pacient jedl pozdě večer');
  assert.match(bz.facts[1].text, /^ráno po těch nocích 6,3, 6,3 mmol\/l · ranní hodnoty před snídaní opsané za období: medián 7,0 mmol\/l · nad 7,2: 1 z 83$/);
  const rows = bz.rows || [];
  assert.ok(rows.some(x => x.label === 'Noc na 25. 12.' && /^večeře \d+:\d\d .+ \(obvyklá porce\) · bazál 21:05 podle plánu · před spaním \d+,\d mmol\/l · ráno 6,3 mmol\/l$/.test(x.text)), JSON.stringify(rows));
  assert.ok(rows.some(x => x.label === 'Noc na 1. 1.')); assert.ok(rows.some(x => x.label === 'Ranní hodnoty za období' && /medián 7,0 mmol\/l · nad 7,2: 1 z 83/.test(x.text)));
  assert.ok(bz.weak.some(w => /2 noci následují po dnech, u kterých sestra s pacientem uvedla jídlo pozdě večer a v noci/.test(w)));
  assert.equal(bz.priority, 2.5); assert.match(bz.why, /proto karta nemá přednost/); assert.doesNotMatch(bz.why, /signál a má přednost/);
  assert.ok(r.proposals.indexOf(bz) > r.proposals.findIndex(p => p.id === 'PR-LUNCH'), 'až za kartami k jídlům');
  /* bez odpovědi sestry „nesedí“ má noční pokles přednost */
  s.nurseCheck.points.vecer = true; NF.refreshReview(s); const b2 = r.proposals.find(p => p.id === 'PR-BAZAL');
  assert.equal(b2.priority, 0); assert.equal(r.proposals[0].id, 'PR-BAZAL'); assert.match(b2.why, /má přednost před ostatními/); assert.ok(!b2.weak.some(w => /pozdě večer/.test(w)));
  /* noc z exportu nese hodnotu před spaním */
  assert.ok(s.nights.filter(n => n.source === 'import').every(n => 'bed' in n));
  const fact0 = bz.facts[0].text; assert.match(fact0, /^potvrzeno 88 z 92 dnů plánu · 4× nižší dávka \(16 j\.\)$/, 'C1: 88 všude; B5: nižší bazál');
});

test('B2 + C6 + C7: tabulka jídel podle jídla dne, řazení podle „nad cílem“, svačiny na konci, 5 řádků a „Další (N)“', ({ NF, D }) => {
  const s = review(D), r = s.review; r.step = 1; const h = html(NF, s);
  const i = h.indexOf('Reakce na jednotlivá jídla'), part = h.slice(i, h.indexOf('S radou bývalo níž?', i));
  assert.match(part, /<th scope="col">Jídlo dne<\/th>/); assert.match(part, /Další \(\d+\)/);
  const bodies = [...part.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)].map(m => m[1]), first = (bodies[0].match(/<tr>/g) || []).length; assert.equal(first, 5);
  const overs = [...bodies[0].matchAll(/<td>(\d+) ze? (\d+)<\/td><td>/g)].map(m => Number(m[1])); assert.ok(overs.length >= 2); for (let k = 1; k < overs.length; k++) assert.ok(overs[k] <= overs[k - 1], 'řazení podle nad cílem');
  const all = bodies.join(''), snackIdx = all.indexOf('<td>svačina</td>'), lastMain = Math.max(all.lastIndexOf('<td>snídaně</td>'), all.lastIndexOf('<td>oběd</td>'), all.lastIndexOf('<td>večeře</td>'));
  if (snackIdx >= 0) assert.ok(snackIdx > lastMain, 'svačiny na konci');
  /* totéž jídlo u dvou jídel dne = dva řádky, každý jen se svými zápisy */
  const chleb = s.foods.find(f => /^Chléb se sýrem/.test(f.name)); const rowsChleb = [...all.matchAll(new RegExp('<td><b>' + chleb.name + '</b>[^<]*</td><td>([a-zěščřžýáíéůú]+)</td>', 'g'))].map(m => m[1]);
  assert.ok(rowsChleb.length >= 2 && new Set(rowsChleb).size === rowsChleb.length, 'chléb u snídaně i u večeře zvlášť: ' + rowsChleb.join(','));
});

test('B5 + C2: věta o dávkách, které si pacient sám snížil; tlačítko „Pravidla a kontakty“', ({ NF, D }) => {
  const s = review(D), r = s.review; r.step = 1; const t = text(NF, s);
  assert.match(t, /Pacient si sám dal 6× nižší dávku ke snídani \(6 j\.\) a 4× nižší bazál \(16 j\.\); zeptejte se proč\./);
  assert.equal(r.summary.selfLower.breakfast, 6); assert.equal(r.summary.basalLower, 4);
  const b = r.proposals.find(p => p.id === 'PR-BREAKFAST'); assert.ok(b.weak.some(w => /pacient si 6× sám dal nižší dávku ke snídani \(6 j\.\)/.test(w)));
  assert.match(t, /Pravidla a kontakty/); assert.doesNotMatch(t, /Pacient má akutní problém/);
  assert.equal(r.summary.basalAs, 88, 'C1: včerejší bazál je v zápisech před zahájením kontroly');
});

test('Verze: NF.SCHEMA 85, ?v=85 v HTML, data-version="85" v katalogu; D-POSTUP a S-SEMAFOR nesou nové parametry s mezemi', ({ NF, D }) => {
  assert.equal(NF.SCHEMA, 85);
  const html0 = fs.readFileSync(path.join(__dirname, 'nutrifee-rozhodovaci-maketa.html'), 'utf8'); assert.ok([...html0.matchAll(/\?v=(\d+)/g)].every(m => m[1] === '85'));
  const ds = fs.readFileSync(path.join(__dirname, 'design-system/index.html'), 'utf8'); assert.match(ds, /data-version="85"/);
  const s = review(D); ['poklesy_jen_ciste'].forEach(k => assert.ok(NF.PARAM_BOUNDS['D-POSTUP'][k] && NF.item(s, 'D-POSTUP').labels[k], k));
  ['smer_mmol', 'vyvoj_tydny'].forEach(k => assert.ok(NF.PARAM_BOUNDS['S-SEMAFOR'][k] && NF.item(s, 'S-SEMAFOR').labels[k], k));
  const reg = NF.item(s, 'D-POSTUP'); assert.equal(reg.postup.prandHigh.verify.length, 10); assert.equal(reg.postup.prandHigh.fakta[9], 'rady'); assert.equal(JSON.stringify(reg.postup.bazalLow.sestraBody), JSON.stringify([null, 'vecer', null])); assert.equal(reg.postup.bazalLow.fakta[1], 'noci');
  assert.equal(reg.postup.prandHigh.verify[7], 'U jídla nebyl v období pokles pod 4 při obvyklé porci a dávce podle plánu');
});

test('SCHEMA 85: učení jídel bere inzulin 45 min před / 30 min po jídle, návrh k dávce dál 30 / 15 (D-CISTA pred_uceni_min, po_uceni_min)', ({ NF, D }) => {
  const s = review(D);
  assert.equal(JSON.stringify(NF.tolerance(s)), '{"before":30,"after":15}'); assert.equal(JSON.stringify(NF.tolerance(s, 'learn')), '{"before":45,"after":30}');
  ['pred_uceni_min', 'po_uceni_min'].forEach(k => assert.ok(NF.PARAM_BOUNDS['D-CISTA'][k] && NF.item(s, 'D-CISTA').labels[k], k));
  const base = s.episodes.find(e => NF.usableForDose(s, e)); assert.ok(base, 'čistý zápis v příběhu');
  const at = n => { const m = NF.minutesOf(base.at) + n, h = Math.floor(((m % 1440) + 1440) % 1440 / 60), mi = ((m % 60) + 60) % 60; return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0'); };
  const ep40 = Object.assign({}, base, { insulin: Object.assign({}, base.insulin, { time: at(-40) }) });
  assert.ok(NF.usableEp(s, ep40), '40 min před jídlem: do učení'); assert.ok(!NF.usableForDose(s, ep40), 'ne do návrhu k dávce');
  assert.match(NF.whyNotForDose(s, ep40), /inzulin mimo čas pro návrh k dávce .*jen do učení/);
  const ep50 = Object.assign({}, base, { insulin: Object.assign({}, base.insulin, { time: at(-50) }) });
  assert.ok(!NF.usableEp(s, ep50), '50 min před jídlem: ani do učení'); assert.match(NF.whyNotUsable(s, ep50), /víc než 45 min před jídlem nebo 30 min po něm/);
});

console.log('\n' + passed + ' prošlo, ' + failed + ' selhalo' + (fails.length ? ':\n  ' + fails.join('\n  ') : ''));
process.exitCode = failed ? 1 : 0;
