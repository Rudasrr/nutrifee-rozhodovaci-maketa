/* Nezávislá kontrola SCHEMA 74 – obsah a logika (27. 10. 2026, navrhy-designu/26-nezavisla-kontrola-2026-10-27/02-obsah.md).
   Hlídá opravy A1–A3 a vybrané B/C nálezy, které ostatní testy nepokrývají.
   Spuštění: node kontrola74-obsah.test.cjs   (ONLY=část názvu spustí jen vybrané testy) */
'use strict';
const assert = require('node:assert/strict');
const P = require('./pravdivost.test.cjs');

let passed = 0, failed = 0; const fails = [];
function test(name, fn) {
  if (process.env.ONLY && name.indexOf(process.env.ONLY) < 0) return;
  try { fn(P.boot()); console.log('OK  ', name); passed++; } catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); }
}
const text = (env, s) => P.norm(P.screenText(P.parse(P.screenHtml(env.NF, s))));
const at = (env, id, B) => env.D.play(env.D.indexOf(id), B);
const reject = (NF, s, id) => { const r = s.role; s.role = 'doctor'; const res = NF.decideItem(s, id, 'rejected', ''); s.role = r; assert.ok(res.ok, id + ' zamítnuto'); };

/* ---------- A1 ---------- */
test('A1 (upraveno SCHEMA 84, rozhodnutí 3): poklesy pod 4 po menší porci u oběda jsou varování, větev „zvýšit“ neblokují; poklesy přímo v kartě; oběd ponechán (jedna změna najednou)', ({ NF, D }) => {
  const env = { NF, D };
  const s = at(env, 'reviewProposals'), pr = s.review.proposals.find(p => p.id === 'PR-LUNCH');
  assert.ok(pr, 'návrh k obědu existuje');
  const i = pr.verify.findIndex(t => /U jídla nebyl v období pokles pod 4/.test(t));
  assert.ok(i >= 0, 'bod o poklesu v D-POSTUP'); assert.equal(NF.verifyBlocked(pr, i), false, 'poklesy po menší porci bod neblokují (D-POSTUP poklesy_jen_ciste)'); assert.equal(pr.lowBlock, false);
  assert.match(pr.facts[i].text, /žádný pokles při obvyklé porci a dávce podle plánu; 2 poklesy po menší porci nebo s jinou dávkou \(16\. 10\., 17\. 10\.\) je varování/);
  assert.match(pr.weak[0], /2 poklesy pod 4 po obědě po menší porci \(16\. 10\., 17\. 10\.\) – poučit pacienta; větev „zvýšit“ neblokují/, 'poklesy první v „Co návrh oslabuje“, jako varování');
  assert.match(pr.lows.join('; '), /16\. 10\. 12:20 · hlásil pacient · menší porce/);
  assert.ok(pr.excluded.filter(x => /^pokles pod 4 · menší porce/.test(x.why)).length === 2, 'vyřazené zápisy s důvodem poklesu, ne „chybí hodnoty“');
  NF.verifyAll(s, pr.id);
  assert.equal(NF.screens.proposalBranch(s, pr).action, 'up', 'Vše sedí → postup ukáže zvýšit (poklesy po menší porci nezamykají)');
  const b = s.review.proposals.find(p => p.id === 'PR-BREAKFAST'); assert.equal(NF.verifyBlocked(b, i), false, 'snídaně bez poklesu');
  const c = at(env, 'reviewConfirm'); assert.equal(c.review.decisions['PR-LUNCH'].choice, 'keep'); assert.equal(c.review.decisions['PR-LUNCH'].units, null, 'modelový lékař mění v jedné kontrole jen snídani');
  ['E9h', 'E9i'].forEach(id => { const e = c.episodes.find(x => x.id === id); assert.ok(NF.hasManual(e), id + ' má úplné opsané hodnoty'); assert.equal(e.manual.low, true); });
  /* při poklesy_jen_ciste = 0 (garant chce blokovat každý pokles) se blok vrátí */
  const s2 = at(env, 'reviewProposals'); s2.role = 'doctor'; NF.newVersion(s2, 'D-POSTUP', { params: { poklesy_jen_ciste: 0 } }); NF.refreshReview(s2);
  const pr2 = s2.review.proposals.find(p => p.id === 'PR-LUNCH'); assert.equal(pr2.lowBlock, true); assert.equal(NF.verifyBlocked(pr2, i), true); NF.verifyAll(s2, pr2.id); assert.equal(NF.screens.proposalBranch(s2, pr2).action, 'keep');
  const st = D.tour.stepsFor('reviewProposals', D.defaults);
  assert.ok(st.some(k => /obědu/.test(k.t) && /pokles/i.test(k.t)), 'vyprávění ukazuje oběd s poklesy');
});

test('A1: karta oběda na obrazovce vypíše poklesy; registr nese parametr poklesy_od', ({ NF, D, app, S }) => {
  app.act('goScene', String(D.scenes.findIndex(x => D.chapters[x.ch].id === 'reviewProposals' && !x.appendix)));
  const s = S(); D.reviewStory(s, s.branches); /* nic: jen ověřit, že funkce běží nad scénou */
  const r = NF.item(S(), 'D-POSTUP'); assert.equal(r.params.poklesy_od, 1); assert.ok(r.labels.poklesy_od);
  assert.doesNotMatch(r.detail, /garant může jednotlivou větev vyřadit/, 'B15');
  const p2 = at({ NF, D }, 'reviewProposals'); p2.review.decisions['PR-BAZAL'] = { choice: 'keep' }; p2.review.decisions['PR-BREAKFAST'] = { choice: 'keep' }; p2.page = 'review'; p2.role = 'doctor';
  assert.match(text({ NF, D }, p2), /Poklesy pod 4 po obědě v období: 16\. 10\. 12:20 · hlásil pacient · menší porce; 17\. 10\. 12:30 · hlásil pacient · menší porce/);
  assert.match(text({ NF, D }, p2), /je varování/); assert.ok(r.labels.poklesy_jen_ciste && r.params.poklesy_jen_ciste === 1, 'SCHEMA 84: parametr poklesy_jen_ciste');
});

/* ---------- A2 ---------- */
test('A2: rada po opakovaných poklesech neradí porci, dávku podle porce ani volat', ({ NF, S }) => {
  const t = NF.item(S(), 'B-HYPO').texts.opakovane;
  assert.doesNotMatch(t, /obvyklou porci|nepíchejte|zavolejte|volejte|ordinac|snězte víc/i);
  assert.match(t, /Dávku inzulinu si sami neměňte/); assert.match(t, /cukr nebo džus/);
});

/* ---------- A3 ---------- */
test('A3: zápisy mezi kontrolami jen opsaná celá čísla; průběh jen z exportu v jeho okně', ({ NF, D }) => {
  const pre = at({ NF, D }, 'reviewSummary');
  assert.equal(pre.nights.length, 0, 'noci jen z exportu');
  pre.episodes.forEach(e => {
    assert.equal((e.points || []).length, 0, e.id + ' bez průběhu před nahráním exportu'); assert.equal(e.importedAt, null);
    if (e.manual && e.manual.before != null) assert.equal(e.manual.before % 1, 0, e.id + ' hodnota při jídle celé číslo');
    if (e.manual && e.manual.peak != null) assert.equal(e.manual.peak % 1, 0, e.id + ' nejvyšší celé číslo');
  });
  const s = at({ NF, D }, 'reviewProposals'), si = s.sensorImport;
  assert.ok(si.filled >= 30 && si.nights === 14, 'export doplní desítky jídel a 14 nocí');
  assert.equal(si.agree.ok, si.agree.n - 1, 'shoda opsaných hodnot až na jedno jídlo');
  s.episodes.forEach(e => { if (NF.hasImport(e)) assert.ok(e.at >= D.EXPORT_FROM, e.id + ': průběh jen v okně exportu'); });
  assert.equal(s.sensorSummary.tir, 68); assert.equal(s.sensorSummary.below, 2); /* 31/02 A1 (SCHEMA 80): snídaně od listopadu nad cílem u všech jídel → čas v cíli 68 % (dřív 72 %) */
  assert.ok(s.review.proposals.find(p => p.id === 'PR-BREAKFAST' && /nad cílem/.test(p.title)), 'snídaně dál „nad cílem“');
  assert.equal(s.review.proposals[0].id, 'PR-BREAKFAST'); /* SCHEMA 84 (B10): bazál bez přednosti, až za kartami k jídlům */ const bz0 = s.review.proposals.find(p => p.id === 'PR-BAZAL'); assert.match(bz0.why, /v noci na 25\. 12\. mezi 2:00 a 5:00 nejnižší 3,6/, 'B12: data nocí v důvodu; 31/02 B7: noc a čas, ne „ráno“');
});

/* ---------- B ---------- */
test('B1: pravidla v zařazení jsou vlastní blok, cíle se nabízejí až v kroku cílů', ({ D }) => {
  const sc = D.sceneItems[D.scenes.findIndex(x => D.chapters[x.ch].id === 'doses')];
  assert.equal(sc.targets['C-CILE'], 5); assert.equal(sc.targets['R-POKYNY'], 4);
});
test('B2, B4: zpětná snídaně s čipem „nad 15“ ukáže pravidlo I-VYSOKA a otázku při rozchodu', ({ NF, D }) => {
  const st = D.tour.stepsFor('lateMeal', D.defaults);
  assert.ok(st.some(k => (k.do || []).some(o => o.act === 'mealPeak' && o.val === 'high') && k.watch === '.card.doc.high-now'));
  assert.ok(st.some(k => (k.do || []).some(o => o.act === 'foodDiverge')));
  const sc = D.sceneItems[D.scenes.findIndex(x => D.chapters[x.ch].id === 'lateMeal')]; assert.ok(sc.targets['I-VYSOKA'] > 0);
  const s = at({ NF, D }, 'advice'), e = s.episodes.find(x => x.id === 'E7c');
  assert.equal(e.manual.peakBound, 'over'); assert.equal(e.context, 'unusual');
  assert.equal(NF.item(s, 'R-REAKCE').params.nestale_mmol, undefined, 'druhá otázka „Děláte ho pokaždé stejně?“ zrušena');
});
test('B3, B5, B13: vyprávění scény 8 nepopisuje neexistující text; doplněk má krok; D-POSTUP až s větví', ({ D }) => {
  assert.doesNotMatch(D.tour.stepsFor('firstResult', D.defaults)[0].co, /bez výčitky; výsledek snídaně čeká/);
  assert.ok(D.tour.stepsFor('advice', D.defaults).some(k => (k.needs || []).join() === 'R-DOPLNEK' && k.t === 'Rada „Doplněk k jídlu“'));
  const sc = D.sceneItems[D.scenes.findIndex(x => D.chapters[x.ch].id === 'reviewProposals' && !x.appendix)];
  assert.ok(sc.targets['D-POSTUP'] >= 1 && sc.targets['D-BAZAL'] >= 1 && sc.targets['D-POSTUP'] < sc.targets['D-BAZAL'], 'SCHEMA 84: D-POSTUP se nabízí u ověření dřív než D-BAZAL (bazál je až za jídly); přesné kroky určuje mapa scén (G)');
});
test('B8, B10, C6, C7: report – poklesy u dlaždice, bez zdvojení, noci z exportu, „dny nemoci“', ({ NF, D }) => {
  const s = at({ NF, D }, 'reviewProposals'); s.review.step = 1; s.page = 'review'; s.role = 'doctor';
  const t = text({ NF, D }, s);
  assert.match(t, /hlášené poklesy po jídle: 2/); assert.doesNotMatch(t, /Pacient sám zapsal 2/);
  assert.match(t, /Noci pod 3,9 mmol\/l z exportu: 2/); assert.match(t, /3 dny nemoci/); assert.doesNotMatch(t, /3\+2/);
  assert.match(D.firstQuestion(at({ NF, D }, 'preview')), /4× klesla pod 4 \(2× po obědě, 2× v noci\)/, 'B8: otázka na poklesy první; SCHEMA 80: noční poklesy zapsané u snídaně zvlášť');
});
test('B11: dlaždice „Přijaté rady“ bez fajfky a bez zelené', ({ NF, D }) => {
  const s = at({ NF, D }, 'reviewProposals'); s.review.step = 1; s.page = 'review'; s.role = 'doctor';
  const html = NF.screens.doctor(s), m = html.match(/<button type="button" class="tile ([^"]*)"[^>]*data-value="adv"[\s\S]*?<\/button>/);
  assert.ok(m); assert.match(m[1], /c-none/); assert.doesNotMatch(m[0], /✓/);
  assert.doesNotMatch(D.explainById['tile-adv'].text(s), /Zelená/);
});
test('B14, B16: nový plán říká proč; Bezpečí „schválil je odborný garant“', ({ NF, D }) => {
  const s = at({ NF, D }, 'newplan'), p = NF.activePlan(s), d = (p.decisions || []).find(x => /snídani/.test(x.title));
  assert.match(d.text, /Po snídani bývala glukóza nad cílem i s radami/);
  const b = at({ NF, D }, 'newplan'); b.page = 'safety'; b.role = 'patient'; NF.confirmUnderstanding(b);
  assert.match(text({ NF, D }, b), /Tato pravidla připravil NutriFee a posoudil je lékař\./); /* SCHEMA 78 (rozhodnutí 10) */ /* slovo „garant“ pacient nevidí (hlavní test) */ assert.doesNotMatch(text({ NF, D }, b), /schválil je lékař/);
});
test('B17, B18: zamítnutá B-HYPO skryje otázku na pokles; zamítnutá I-MENE ukáže oznámení na místě pravidla', ({ NF, D }) => {
  const s = at({ NF, D }, 'firstResult'); NF.setManualPeak(s, 'E1', 12); reject(NF, s, 'B-HYPO');
  assert.doesNotMatch(P.screenHtml(NF, s), /data-action="lowChip"/, 'otázka na pokles se neptá'); assert.match(P.screenHtml(NF, s), /data-off="B-HYPO"/);
  const h = at({ NF, D }, 'hypo'); reject(NF, h, 'I-MENE'); h.meal.step = 3;
  const html = P.screenHtml(NF, h); assert.match(html, /data-off="I-MENE"/); assert.doesNotMatch(P.norm(P.screenText(P.parse(html))), /řiďte se bezpečnostními pravidly v Bezpečí/);
});
test('B19: zamítnutá S-SEMAFOR vypne semafor dlaždic', ({ NF, D }) => {
  const s = at({ NF, D }, 'reviewProposals'); s.review.step = 1; s.page = 'review'; s.role = 'doctor'; NF.decideItem(s, 'S-SEMAFOR', 'rejected', '');
  assert.match(text({ NF, D }, s), /semafor vypnutý/); assert.doesNotMatch(NF.screens.doctor(s), /class="tile c-ok[^"]*" data-action="reviewTile" data-value="tir"/);
});

/* ---------- C, M ---------- */
test('C3: na Dnes je nejnovější milník (řízek, poznaný 12. 10.)', ({ NF, D }) => {
  const s = at({ NF, D }, 'lateMeal'), m = NF.pendingMilestone(s); assert.ok(m && /known:/.test(m.id));
  assert.equal(NF.foodById(s, m.id.slice(6)).name, 'Smažený řízek s bramborovou kaší');
});
test('C5: při nemoci jedna věta „K jídlu neradíme“ a bez řádku s radou', ({ NF, D }) => {
  const s = at({ NF, D }, 'illnessMeal'); const t = text({ NF, D }, s);
  assert.equal(t.split(NF.ILL_TEXT).length - 1, 1); assert.doesNotMatch(t, /s doplňkem \d/);
});
test('C8, C14: texty bez historie pro první posouzení; I-MENE bez párování jídla s inzulinem', ({ NF, S }) => {
  ['B-HYPO', 'I-HYPO', 'I-NEMOC-JIDLO', 'I-VYSOKA', 'R-POKYNY', 'C-CILE', 'D-POSTUP'].forEach(id => { const r = NF.item(S(), id); assert.doesNotMatch(r.summary + r.detail, /posuzuje znovu|posuzuje položku znovu|Do 27\. 10\. 2026|vlastník (ji|výzvu|to) zrušil/, id); });
  const i = NF.instructionCatalog().find(x => x.id === 'I-MENE'); assert.doesNotMatch(i.text, /na kolik/); assert.doesNotMatch(NF.item(S(), 'I-MENE').summary, /na kolik/);
});
test('C10: vysvětlivky odkazují jen na položky, které prvek řídí', ({ D }) => {
  ['dose', 'dose-grid', 'weave', 'path', 'trace'].forEach(id => assert.equal(D.explainById[id].item, null, id));
  assert.equal(D.explainById['tile-usual'].item, 'S-SEMAFOR');
});
test('C9, M8: průvodce bez překlepu a bez surových zástupků {meal} / {tirGoal}', ({ NF, S, D }) => {
  assert.doesNotMatch(D.guide['K-KRITERIA'].co, /úplných/);
  ['R-REAKCE', 'D-POSTUP', 'R-PORADI'].forEach(id => assert.doesNotMatch(NF.screens.itemDetail(S(), id), /\{(meal|meals|n|z|min|tirGoal|first|lever)\}/, id));
});
test('M1: dodatek „Nejdřív rady“ stojí na radě Doplněk k jídlu', ({ D }) => {
  const st = D.tour.stepsFor('reviewProposals', { response: 'impractical' }).filter(k => /nejdřív rady|Body ověřené|Rozhodnutí podle postupu/i.test(k.t));
  assert.ok(st.length >= 3); st.forEach(k => assert.ok((k.needs || []).indexOf('R-DOPLNEK') >= 0, k.t));
});
test('M7: historie položky podle času, nové znění s ukázkovou hodnotou', ({ NF, D }) => {
  const s = at({ NF, D }, 'impact'); s.reg = { open: 'R-PORADI', q: '' }; s.page = 'registry'; s.role = 'doctor';
  const html = NF.screens.doctor(s); assert.doesNotMatch(html, /\{first\}/);
});

console.log('\n' + passed + ' prošlo, ' + failed + ' selhalo' + (fails.length ? ':\n  ' + fails.join('\n  ') : ''));
process.exitCode = failed ? 1 : 0;
