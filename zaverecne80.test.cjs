/* Závěrečné ověření 1. 11. 2026 → SCHEMA 80 (navrhy-designu/31-zaverecne-overeni-2026-11-01/, předávka 13-schema80-jadro.md).
   Hlídá opravy zpráv 02 (tok pacient–ordinace), 03 (produkce a hrany) a rozhodnutí vlastníka 1. 11. 2026 bod 7 (čip nočního poklesu u snídaně).
   Spuštění: node zaverecne80.test.cjs   (ONLY=část názvu spustí jen vybrané testy) */
'use strict';
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const assert = require('node:assert/strict');
const P = require('./pravdivost.test.cjs');

const html = fs.readFileSync(path.join(__dirname, 'nutrifee-rozhodovaci-maketa.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1].split('?')[0]);
/* Produkční sestavení (bez demo/) i ukázka; `store` přežije „obnovení stránky“, `search` = adresa zařízení (?role=). */
function bootRaw({ withDemo = false, store = new Map(), search = '' } = {}) {
  const elements = new Map(), el = id => { if (!elements.has(id)) elements.set(id, { innerHTML: '', focus() { }, querySelector() { return null; }, querySelectorAll() { return []; }, childNodes: [] }); return elements.get(id); };
  if (withDemo && !store.has('nutrifee-auth')) store.set('nutrifee-auth', JSON.stringify({ access_token: 't', refresh_token: 'r', expires_at: 4102444800000, user: { id: 'u', email: 'g@example.test', app_metadata: { role: 'garant' } } }));
  const sb = { console: { log() { }, warn() { }, error() { }, info() { } }, location: { search },
    document: { getElementById: el, addEventListener() { }, querySelectorAll() { return []; }, createElement() { return { click() { }, set innerHTML(v) { }, querySelectorAll() { return []; } }; }, activeElement: null, body: null },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) }, setTimeout() { return 1; }, Blob: class { }, URL: { createObjectURL() { return 'x'; }, revokeObjectURL() { } } };
  sb.window = sb; sb.globalThis = sb; const ctx = vm.createContext(sb);
  for (const f of scripts.filter(f => withDemo || f.startsWith('app/'))) vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f });
  const app = ctx.NutriFeeApp, NF = ctx.NutriFee;
  return { NF, D: ctx.NutriFeeDemo, app, S: () => app.getState(), act: (a, v) => app.act(a, v), store, html: () => elements.get('app').innerHTML.replace(/ /g, ' ') };
}
const plain = h => P.norm(String(h).replace(/<[^>]+>/g, ' ').replace(/&nbsp;| /g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
const text = (env, s) => P.norm(P.screenText(P.parse(P.screenHtml(env.NF, s))));
const at = (env, id, B) => env.D.play(env.D.indexOf(id), B);
let passed = 0, failed = 0; const fails = [];
function test(name, fn) { if (process.env.ONLY && name.indexOf(process.env.ONLY) < 0) return; try { fn(P.boot()); console.log('OK  ', name); passed++; } catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); } }
/* Produkce: plán vydaný lékařem, zaučení, převzetí (bez prezentační vrstvy, skutečný čas zastavený na zadaném okamžiku). */
function prodWithPlan(env, clock) {
  const { NF, S, act } = env; NF.clockModel = true; const s = S(); s.clock = clock || '2026-11-02T09:00:00';
  act('role', 'doctor'); act('startDraft'); NF.ELIGIBILITY.forEach(c => act('eligibility', c[0])); /* SCHEMA 90: pět podmínek */ act('exclusion');
  act('wizardGo', '1'); ['basal:18', 'breakfast:8', 'lunch:10', 'dinner:8'].forEach(v => act('doseSet', v)); NF.bindValue('draft.medicationChecked', true); act('wizardGo', '2'); act('issuePlan');
  act('role', 'nurse'); NF.trainingItems(S()).forEach(t => { S().training.steps[t.id] = true; }); NF.finishTraining(S(), 'done');
  act('role', 'patient'); S().onboarding.readback = 'yes'; NF.confirmUnderstanding(S());
  return S();
}

/* ---------- 03: produkce a hrany ---------- */
test('03 A1: startovní návyky v konceptu jen jednou; klepnutí návyk opravdu odebere; plán bez duplicit', () => {
  const env = bootRaw(); env.act('role', 'doctor'); env.act('startDraft');
  const h = env.S().draft.habits; assert.equal(new Set(h).size, h.length, 'bez duplicit: ' + h.join());
  const first = h[0]; env.act('toggleHabit', first); assert.equal(env.S().draft.habits.indexOf(first), -1, 'odebrán');
  env.S().draft.habits.push('H-ZAPIS', 'H-ZAPIS'); env.act('toggleHabit', 'H-ZAPIS'); assert.equal(env.S().draft.habits.indexOf('H-ZAPIS'), -1, 'odebrán i ze staršího konceptu s duplicitou');
});
test('03 A2: po obnovení stránky nová ID navazují za uložená (zápis jídla, sledování, otázky)', () => {
  const env = bootRaw(); const s = prodWithPlan(env);
  const r1 = env.NF.saveEpisode(s, { meal: 'breakfast', foodId: s.foods[0].id, portion: 'usual', bolusState: 'as', advice: [], insulin: { confirmed: 'as', units: 8, time: '08:55' }, at: s.clock });
  env.NF.save(s);
  const env2 = bootRaw({ store: env.store }); env2.NF.STORAGE = env.NF.STORAGE; const s2 = env2.NF.load(); env2.app.setState(s2);
  const r2 = env2.NF.saveEpisode(env2.S(), { meal: 'lunch', foodId: s.foods[1].id, portion: 'usual', bolusState: 'as', advice: [], insulin: { confirmed: 'as', units: 10, time: '12:00' }, at: '2026-11-02T12:00:00' });
  assert.notEqual(r2.episode.id, r1.episode.id); const ids = env2.S().episodes.map(e => e.id); assert.equal(new Set(ids).size, ids.length, 'ID jedinečná: ' + ids.join());
  const n1 = Number(r1.episode.id.split('-')[1]), n2 = Number(r2.episode.id.split('-')[1]); assert.ok(n2 > n1, 'počítadlo pokračuje');
});
test('03 A3, C8, B1: produkce bere skutečný čas, má vlastní úložiště a roli podle adresy (?role=lekar); ukázka hodiny řídí sama', () => {
  const env = bootRaw({ search: '?role=lekar' }); assert.equal(env.NF.clockModel, false);
  assert.equal(env.NF.STORAGE, 'nutrifee-maketa', 'před načtením všech skriptů'); env.NF.boot();
  assert.equal(env.NF.STORAGE, 'nutrifee', 'C8: vlastní klíč'); assert.equal(env.S().role, 'doctor', 'B1: ordinace bez prezentační vrstvy');
  const now = env.NF.now(); assert.ok(env.S().clock >= now.slice(0, 13), 'A3: skutečný čas ' + env.S().clock);
  env.S().clock = '2026-10-05T09:00:00'; env.act('noop'); assert.ok(env.S().clock > '2026-10-05T09:00:00', 'A3: čas se obnoví před akcí');
  const env2 = bootRaw({ search: '?role=sestra' }); env2.NF.boot(); assert.equal(env2.S().role, 'nurse');
  const demo = bootRaw({ withDemo: true }); assert.equal(demo.NF.clockModel, true); const c = demo.S().clock; demo.NF.boot(); demo.act('noop'); assert.equal(demo.S().clock, c, 'ukázka: čas řídí příběh'); assert.equal(demo.NF.STORAGE, 'nutrifee-maketa');
});
test('03 A4: v ordinaci není volné textové pole (Jiné rozhodnutí u návrhu jen volbou)', ({ NF, D }) => {
  const s = at({ NF, D }, 'reviewProposals'); s.review.step = 2; s.review.other = s.review.proposals[0].id; s.role = 'doctor'; s.page = 'review';
  const h = NF.screens.doctor(s); assert.doesNotMatch(h, /comment_|Komentář \(nepovinný\)/); assert.match(h, /Zamítnout s důvodem/);
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, 'app/ui.js'), 'utf8'), /form\['comment_'/);
});
test('03 A5: dostupnost dat podle skutečného intervalu měření (5 i 15 min)', ({ NF, S }) => {
  const mk = step => { const r = []; for (let m = 0; m < 3 * 1440; m += step) { const d = new Date(2026, 11, 22, 0, m); r.push({ at: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':00', mmol: 7 }); } return r; };
  assert.equal(NF.sensorSummaryFrom(S(), mk(5)).availability, 100); const q = NF.sensorSummaryFrom(S(), mk(15)); assert.equal(q.availability, 100); assert.equal(q.interval, 15);
});
test('03 B2, B3, B4: produkce – karta pacienta bez napojení řekne proč; jádro nemluví o maketě; DEMO u sestry jednou', () => {
  const env = bootRaw(); env.act('role', 'doctor'); env.act('startDraft');
  assert.match(plain(env.html()), /Karta pacienta s NutriFee propojená není/); assert.doesNotMatch(plain(env.html()), /Načteno z karty pacienta/);
  env.act('page', 'registry'); env.act('regOpen', 'R-PORCE'); env.act('regDecide', 'rejected');
  const reg = plain(env.html()); assert.doesNotMatch(reg, /[Mm]aketa|[Pp]říběh|ukázk/, 'registr v produkci'); assert.match(reg, /Položka je zamítnutá a aplikace ji nepoužívá/);
  env.act('role', 'patient'); env.act('supportOpen'); env.act('supportIssue', 'other'); env.act('supportSend'); assert.doesNotMatch(plain(env.html()), /V ukázce/);
  const s = prodWithPlan(bootRaw()); /* sestra s náhledem telefonu */
  const e2 = bootRaw(); prodWithPlan(e2); e2.act('role', 'nurse'); assert.equal((plain(e2.html()).match(/DEMO · syntetická data/g) || []).length, 1, 'B4');
  const demo = P.boot(); demo.app.act('goScene', String(demo.D.scenes.findIndex(x => demo.D.chapters[x.ch].id === 'registry'))); demo.app.act('closeDrawer');
  assert.ok(demo.NF.screens.demoText('registr').length > 0, 'ukázka věty dodá');
});
test('03 B5: po vydání P2 hlavička kontroly „začíná dnes“, sestra bez odpovědí minulého období', ({ NF, D }) => {
  const s = at({ NF, D }, 'newplan'); NF.confirmUnderstanding(s); s.role = 'doctor'; s.page = 'review';
  const t = plain(NF.screens.doctor(s)); assert.match(t, /Období plánu P2 začíná dnes · zatím bez zápisů/); assert.doesNotMatch(t, /Plán je vydaný; odpovědi zůstávají ve stopě/);
  assert.equal(Object.keys(NF.nurseCheckFor(s)).length, 0, 'sestra začíná s prázdnou částí');
});
test('03 C3, C4, C5, C6, C7, C9: hrany', ({ NF, D, app, S }) => {
  const s = at({ NF, D }, 'firstMeal'); s.clock = '2026-10-06T07:00:00'; const g = NF.yesterdayGaps(s).map(x => x.meal);
  assert.equal(g.indexOf('breakfast'), -1, 'C3: snídaně před převzetím plánu se nedoptává'); assert.equal(g.length, 0, 'SCHEMA 84 (32/01 C1, agent P+D): den převzetí plánu se nedoptává celý');
  assert.match(NF.screens.frac(0, 1), /0 <span class="of">z<\/span> 1/, 'C4');
  app.act('goScene', String(D.scenes.findIndex(x => D.chapters[x.ch].id === 'handover'))); S().toast = 'x'; app.act('role', 'patient'); assert.equal(S().toast, '', 'C5');
  const r = at({ NF, D }, 'reviewProposals'), csv = D.demoCsv(r), again = NF.importReadings(r, NF.parseSensorCsv(csv));
  assert.equal(again.same, true); assert.equal(again.text, 'Export je stejný jako minule; nic nového nepřibylo.'); assert.ok(r.sensorImport.filled > 30, 'C6: údaje z prvního nahrání zůstaly');
  r.role = 'doctor'; r.page = 'trace'; r.traceLimit = 4000; assert.doesNotMatch(plain(NF.screens.doctor(r)), /\bE-\d+\b/, 'C7: stopa bez vnitřních ID');
  const h = at({ NF, D }, 'handover'); h.onboarding.page = 5; h.role = 'patient'; h.page = 'takeover'; assert.equal((plain(NF.screens.patient(h)).match(/Co neděláme/g) || []).length, 1, 'C9');
});

/* ---------- 02: tok pacient – ordinace ---------- */
test('02 A1: rady modelové historie skládá jádro – žádná odpověď k radě, kterou jádro nenabídlo; řada a export jedním výpočtem', ({ NF, D }) => {
  ['accepts', 'declines', 'impractical'].forEach(resp => { D.adviceMismatch.length = 0; at({ NF, D }, 'reviewProposals', { response: resp }); assert.equal(JSON.stringify(D.adviceMismatch), '[]', resp); });
  const s = at({ NF, D }, 'preview'), wk = s.episodes.filter(e => e.at < '2026-10-13' && e.meal === 'breakfast' && /kaše/.test(NF.foodById(s, e.foodId).name));
  assert.ok(wk.some(e => (e.advice || []).some(a => a.lever === 'walk')), 'týden: jádro u kaše nabídlo procházku (bez odpovědi)');
  const bf = s.episodes.filter(e => e.meal === 'breakfast' && e.at >= '2026-11-01');
  assert.ok(bf.filter(e => (e.advice || []).some(a => a.lever === 'walk' && a.accepted === true)).length >= 10, 'procházku u snídaní pacient opravdu zkoušel');
  assert.equal(s.episodes.filter(e => e.meal === 'lunch' && NF.day(e.at) === '2026-10-24').length, 1, 'B5: jeden oběd 24. 10.');
});
test('02 A1: návrh zvýšit dávku ke snídani stojí na snídaních obecně, ne na jednom nebo dvou sladkých jídlech; rady první opravdu splněné', ({ NF, D }) => {
  const s = at({ NF, D }, 'reviewProposals'), pr = s.review.proposals.find(p => p.id === 'PR-BREAKFAST');
  assert.ok(pr && /nad cílem/.test(pr.title));
  const chleb = pr.breakdown.find(b => /Chléb/.test(b.food)); assert.ok(chleb && chleb.above >= 3, 'i chléb se sýrem bývá nad cílem');
  assert.equal(pr.weak.some(w => /zůstalo pokaždé v cíli|zůstala pokaždé v cíli/.test(w)), false);
  const j = pr.facts[pr.verify.findIndex(v => /jen jedno nebo dvě/.test(v))]; assert.equal(j.against, false);
  const v = pr.facts[pr.verify.findIndex(v => /Vyrovnání/.test(v))]; assert.match(v.text, /čas v cíli 68 % \(cíl 70 %\) · HbA1c 55 mmol\/mol z 3\. 1\. 2027/);
  const add = s.review.proposals.find(p => p.id === 'PR-KEEP-addon'); assert.ok(add && !add.group && add.pulled.length >= 3, 'B4: stažený doplněk = samostatný návrh');
  assert.match(add.title, /^Probrat radu „Doplněk k jídlu“/); assert.match(add.why, /stáhla po 3 pokusech/);
  const c = at({ NF, D }, 'reviewConfirm'); assert.equal(c.review.decisions['PR-BREAKFAST'].choice, 'agree'); assert.equal(c.review.decisions['PR-BREAKFAST'].branch, 'up');
});
test('02 B1, B3: sestra potvrzuje jen to, co data neukážou; HbA1c s datem odběru výběrem', ({ NF, D }) => {
  const s = at({ NF, D }, 'reviewProposals'), r = NF.item(s, 'D-POSTUP');
  assert.match(r.sestra.stres, /^Kromě dnů, které pacient v aplikaci označil jako nemoc nebo neobvyklý den/); assert.equal(NF.nurseAnswer(s, 'vecer'), false);
  const h = s.review.summary.hba1cInfo; assert.equal(h.before.v, 62); assert.equal(h.before.date, '2026-09-23'); assert.equal(h.now.v, 55); assert.equal(h.now.date, '2027-01-03'); assert.equal(h.now.src, 'sestra');
  s.role = 'doctor'; s.page = 'review'; s.review.step = 1; const t = plain(NF.screens.doctor(s)); assert.match(t, /odběr 3\. 1\. 2027 \(dříve 23\. 9\. 2026\)/);
  const n = at({ NF, D }, 'reviewSummary'); n.role = 'nurse'; n.role = 'doctor'; n.page = 'review'; assert.match(NF.screens.doctor(n), /data-action="hbaSet"/); assert.match(NF.screens.doctor(n), /data-change="hbaDate"/);
  const x = at({ NF, D }, 'reviewSummary'); x.patient.hba1cLog = x.patient.hba1cLog.filter(e => e.src !== 'sestra'); NF.startReview(x, NF.habitCatalog());
  const vb = x.review.proposals.find(p => p.id === 'PR-BREAKFAST'); assert.match(vb.facts[vb.verify.findIndex(v => /Vyrovnání/.test(v))].text, /nový výsledek HbA1c chybí/, 'stará hodnota se nevydává za novou');
});
test('02 B7, C2, C3, C4, C7: bazál „v noci na“, večeře 16. a 17. 10., jmenovatel bazálu, dávky u snídaně, nezdařené zaučení', ({ NF, D }) => {
  const s = at({ NF, D }, 'reviewProposals'), b = s.review.proposals.find(p => p.id === 'PR-BAZAL');
  assert.match(b.why, /v noci na 25\. 12\. mezi 2:00 a 5:00 nejnižší 3,6/); assert.doesNotMatch(b.why, /ráno 25/); assert.match(b.why, /nejnižší 3,6 mmol\/l · z exportu, zapsal i pacient/, 'SCHEMA 81: zdroj u každé noci');
  assert.match(b.facts[0].text, /^potvrzeno \d+ z 92 dnů plánu( · \d+× nižší dávka \(\d+ j\.\))?$/); assert.ok(b.facts[0].text.indexOf('potvrzeno ' + s.review.summary.basalAs + ' z ' + s.review.summary.basalDays + ' dnů plánu') === 0); /* SCHEMA 84 (B5): i nižší bazál, který si pacient dal sám */
  const p = s.review.proposals.find(x => x.id === 'PR-BREAKFAST'); assert.match(p.facts[0].text, /6× nižší dávka \(6 j\.\) · 3× nevím/);
  ['2026-10-16', '2026-10-17'].forEach(d => assert.ok(s.episodes.some(e => e.meal === 'dinner' && NF.day(e.at) === d), 'večeře ' + d));
  const np = at({ NF, D }, 'newplan'), dl = NF.activePlan(np).decisions.find(x => /obědu/.test(x.title)); assert.match(dl.text, /^beze změny\. Po obědě glukóza klesla pod 4; lékař dávku ponechal a probral to s vámi\.$/);
  const f = at({ NF, D }, 'handover', { training: 'failed' }); f.role = 'patient'; f.page = 'takeover'; assert.match(plain(NF.screens.patient(f)), /Domluvte si se sestrou nový termín\./);
});

/* ---------- rozhodnutí vlastníka 1. 11. 2026, bod 7: noční pokles čipem u snídaně ---------- */
test('Bod 7: čip „V noci klesla glukóza pod 4“ jen u snídaně, bez rodu, se štítkem B-HYPO; počítá se do poklesů za 7 dní; ne na noc, na kterou se ptá otázka po večeři', ({ NF, D }) => {
  const s = at({ NF, D }, 'firstMeal'); s.meal.bolus = 'before'; /* SCHEMA 86: čip je u otázky „glukóza teď“ (třetí otázka kroku 1) */ const h = NF.screens.patient(s);
  assert.match(h, /data-action="mealNightLow"/); assert.match(plain(h), /V noci klesla glukóza pod 4/); assert.match(h, /data-item="B-HYPO"|data-value="B-HYPO"/);
  assert.doesNotMatch(NF.item(s, 'B-HYPO').texts.nocCip + NF.item(s, 'B-HYPO').texts.nocCipPomoc, /jsem|měl\(a\)|byl\(a\)/);
  s.meal.meal = 'lunch'; assert.doesNotMatch(NF.screens.patient(s), /mealNightLow/, 'jen u snídaně');
  const r = at({ NF, D }, 'firstMeal'); r.meal.nightLow = true; const ep = NF.saveEpisode(r, { meal: 'breakfast', foodId: r.foods[0].id, portion: 'usual', bolusState: 'before', advice: [], insulin: { confirmed: 'as', units: 8, time: '07:00' }, nightLow: true, before: 7 }).episode;
  assert.equal(ep.manual.nightLow, true); const ev = NF.lowEvents(r, 7).filter(x => x.night); assert.equal(ev.length, 1); assert.equal(ev[0].at, '2026-10-06T00:00:00'); assert.ok(r.lowNotice);
  const w = at({ NF, D }, 'firstMeal'); NF.addHypoWatch(w, 'smaller', 'dinner', '2026-10-05T18:30:00', null); assert.equal(NF.nightAsked(w, '2026-10-06'), true); assert.doesNotMatch(NF.screens.patient(w), /mealNightLow/, 'na tu noc se ptá otázka po večeři');
  const x = at({ NF, D }, 'firstMeal'); x.role = 'doctor'; NF.decideItem(x, 'B-HYPO', 'rejected', ''); x.role = 'patient'; assert.doesNotMatch(NF.screens.patient(x), /mealNightLow/); assert.equal(NF.nightLows(x).length, 0);
});
test('Bod 7: v příběhu pacient zapíše noční poklesy 25. 12. a 1. 1.; karta po opakovaných poklesech nevznikne (7 dní); lékař je vidí u bazálu a v Bezpečnosti', ({ NF, D, app, S }) => {
  const s = at({ NF, D }, 'preview'), nl = NF.nightLows(s).map(x => NF.day(x.at)); assert.equal(nl.join(), '2026-12-25,2027-01-01');
  const ni = D.scenes.findIndex(x => D.chapters[x.ch].id === 'nightLow'); assert.ok(ni > 0 && !D.scenes[ni].appendix);
  app.act('goScene', String(ni)); app.act('closeDrawer'); for (let i = 0; i < 12 && S().page === 'meal'; i++) { const pn = D.pendingNow(S()); pn.ids.forEach(id => app.act('garantDecide', id + ':approved')); app.act('tourNext'); }
  const t = text({ NF, D }, S()); assert.match(t, /Pokles pod 4 je zapsaný/); assert.match(t, /Pokles jsme zapsali\. Lékař ho uvidí na kontrole\./); assert.doesNotMatch(t, /1 ze 2/); /* SCHEMA 86 (oprava 05): bez odpočtu */ assert.equal(NF.hypoAlert(S()), null);
  const r = at({ NF, D }, 'reviewProposals'); r.role = 'doctor'; r.page = 'review'; r.review.step = 1;
  assert.match(plain(NF.screens.doctor(r)), /Noční pokles pod 4, který pacient sám zapsal u snídaně: v noci na 25\. 12\., v noci na 1\. 1\./);
  assert.match(plain(NF.screens.doctor(r)), /hlášené poklesy po jídle: 2 /, 'noční poklesy nejsou „po jídle“');
  ['declines', 'impractical'].forEach(b => assert.equal(NF.nightLows(at({ NF, D }, 'preview', { response: b })).length, 0, b + ': v dodatku noci bez poklesu'));
});

/* ---------- SCHEMA 81: rozhodnutí vlastníka 2. 11. 2026, body 8–11 ---------- */
test('81 bod 8: noční poklesy zapsané pacientem se počítají do návrhu k bazálu i bez exportu; karta řekne zdroj', ({ NF, D }) => {
  const s = at({ NF, D }, 'reviewSummary'); assert.equal(s.nights.length, 0, 'bez exportu'); s.role = 'doctor'; NF.startReview(s, NF.habitCatalog());
  const b = s.review.proposals.find(p => p.id === 'PR-BAZAL'); assert.ok(b && /pod cílem/.test(b.title), 'návrh k bazálu z nocí zapsaných pacientem');
  assert.match(b.why, /^2 noci za posledních 14 dní klesly pod 3,9 mmol\/l \(v noci na 25\. 12\. pod 4 · zapsal pacient u snídaně · v noci na 1\. 1\. pod 4 · zapsal pacient u snídaně\)/); assert.match(b.why, /zápis pacienta/);
  const r = at({ NF, D }, 'reviewProposals'); assert.match(r.review.proposals.find(p => p.id === 'PR-BAZAL').why, /^2 ze 14 nocí/, 's exportem se noc počítá jednou');
});
test('81 bod 9: jídlo „v cíli“ = aspoň 90 % zápisů (varování i bod „nad cílem nejsou jen jedno nebo dvě jídla“)', ({ NF, D }) => {
  const s = at({ NF, D }, 'reviewProposals'); assert.equal(NF.item(s, 'D-POSTUP').params.v_cili_podil, 0.9);
  const f = s.foods.find(x => /Chléb se sýrem/.test(x.name)); let k = 0;
  s.episodes.forEach(e => { if (e.foodId === f.id && e.meal === 'breakfast') { k++; e.points = []; e.importedAt = null; e.manual.peak = k === 1 ? 11 : 8; e.manual.peakBound = null; e.peak = NF.epPeak(s, e); } });
  NF.startReview(s, NF.habitCatalog()); const p = s.review.proposals.find(x => x.id === 'PR-BREAKFAST');
  assert.ok(p.weak.some(w => /„Chléb se sýrem a zeleninou“ \(v cíli \d+ ze? \d+\) zůstalo v cíli aspoň u 90 % zápisů/.test(w)), p.weak.join(' | '));
});
test('81 bod 10: bod o vyrovnání jen díky HbA1c méně než 5 nad cílem → „Co návrh oslabuje“', ({ NF, D }) => {
  const s = at({ NF, D }, 'reviewProposals'); assert.equal(NF.item(s, 'D-POSTUP').params.hba_rezerva, 5);
  assert.equal(s.review.proposals.find(x => x.id === 'PR-BREAKFAST').weak.some(w => /sedí jen díky HbA1c/.test(w)), false, 'v příběhu čas v cíli cíl nesplňuje');
  NF.activePlan(s).targets.tirGoal = 65; NF.startReview(s, NF.habitCatalog());
  assert.ok(s.review.proposals.find(x => x.id === 'PR-BREAKFAST').weak.some(w => /bod o vyrovnání sedí jen díky HbA1c 55 mmol\/mol, méně než 5 mmol\/mol nad cílem 53/.test(w)));
});
test('81 bod 11: slovo směru u procent až od 2 procentních bodů', ({ NF, D }) => {
  const s = at({ NF, D }, 'reviewProposals'); assert.equal(NF.item(s, 'S-SEMAFOR').params.smer_pb, 2); s.role = 'doctor'; s.page = 'review'; s.review.step = 1;
  const t = plain(NF.screens.doctor(s)); assert.match(t, /Čas pod 3,9 mmol\/l[\s\S]*?beze změny[\s\S]*?dříve 3 → teď 2 · −1 p\. b\./); assert.match(t, /Čas v cíli[\s\S]*?zlepšuje se[\s\S]*?dříve 58 → teď 68/);
});

/* ---------- SCHEMA 82: nezávislé ověření SCHEMA 81 (31/16) ---------- */
test('82 B3: v okně exportu rozhoduje export; noc ze zápisu mimo okno navíc i ve jmenovateli; práh minNoci nad posouzenými nocmi', ({ NF, D }) => {
  const mk = () => { const s = at({ NF, D }, 'reviewSummary'); s.role = 'doctor'; const rd = NF.parseSensorCsv(D.demoCsv(s)).filter(r => r.at >= '2026-12-28T00:00:00'); NF.importReadings(s, rd); NF.setHba1c(s, 'sestra', 55, '2027-01-03'); return s; };
  let s = mk(), bn = NF.basalNights(s, 14); assert.equal(bn.selfOnly.map(x => x.date).join(), '2026-12-25'); assert.equal(bn.assessed, bn.exportN + 1);
  NF.startReview(s, NF.habitCatalog()); assert.equal(s.review.proposals.some(p => p.id === 'PR-BAZAL' && !p.row), bn.assessed >= 10, 'práh minNoci nad posouzenými nocmi'); /* SCHEMA 84: řádek bazálu bez návrhu není karta */
  s = mk(); NF.item(s, 'D-BAZAL').params.minNoci = 5; NF.startReview(s, NF.habitCatalog());
  const b = s.review.proposals.find(p => p.id === 'PR-BAZAL' && !p.row); assert.ok(b);
  assert.ok(b.why.indexOf('2 z ' + (bn.exportN + 1) + ' nocí (' + bn.exportN + ' z exportu, 1 jen ze zápisu pacienta mimo okno exportu)') >= 0, b.why);
  const r = at({ NF, D }, 'reviewProposals'); r.nights.forEach(n => { if (n.date === '2026-12-25' || n.date === '2027-01-01') n.min = 4.6; }); NF.startReview(r, NF.habitCatalog());
  assert.equal(r.review.proposals.some(p => p.id === 'PR-BAZAL' && !p.row && /pod cílem/.test(p.title)), false, 'export noci nepotvrdil → noc se nepočítá');
  assert.equal(NF.basalNights(r, 14).notConfirmed.length, 2);
  r.review.step = 1; r.page = 'review'; assert.match(plain(NF.screens.doctor(r)), /Export tyto noci nepotvrdil \(v noci na 25\. 12\., v noci na 1\. 1\.\); pro návrh k bazálu rozhoduje export\./);
});
test('82 B2, C1, C2, C7: Bezpečnost jen s návrhem k bazálu, bez dvojité tečky; bez S-SEMAFOR slovo podle znaménka; ranní odpověď jako čip', ({ NF, D }) => {
  const s = at({ NF, D }, 'reviewProposals'); s.role = 'doctor'; s.page = 'review'; s.review.step = 1;
  let t = plain(NF.screens.doctor(s)); assert.match(t, /v noci na 1\. 1\. Počítá se do poklesů za 7 dní a je i u návrhu k bazálu\./); assert.doesNotMatch(t, /1\. 1\.\./);
  NF.decideItem(s, 'D-BAZAL', 'rejected', ''); NF.startReview(s, NF.habitCatalog()); s.review.step = 1;
  t = plain(NF.screens.doctor(s)); assert.match(t, /Počítá se do poklesů za 7 dní\./); assert.doesNotMatch(t, /u návrhu k bazálu/);
  const x = at({ NF, D }, 'reviewProposals'); x.role = 'doctor'; NF.decideItem(x, 'S-SEMAFOR', 'rejected', ''); x.page = 'review'; x.review.step = 1;
  assert.match(plain(NF.screens.doctor(x)), /Čas pod 3,9 mmol\/l[\s\S]*?semafor vypnutý · zlepšuje se/);
  const w = at({ NF, D }, 'preview'); w.hypoWatch.push({ id: 'W-X', kind: 'smaller', meal: 'dinner', at: '2026-12-29T18:30:00', night: true, askAt: '2026-12-30T05:00:00', answer: 'yes' });
  const sa = NF.basalNights(w, 14).selfAll; assert.ok(sa.some(n => n.date === '2026-12-30' && n.via === 'otazka'), 'ranní odpověď se počítá');
});
test('82 B1, C4, C5: vyprávění podle R-PROCHAZKA; rozklik času v cíli; krok s hodnotou míří na sbalený řádek', ({ D }) => {
  const c = D.tour.stepsFor('custom', D.defaults).find(k => k.t === 'Rada „Pořadí jídla“'); assert.equal(typeof c.co, 'function');
  assert.ok(D.tour.stepsFor('reviewSummary', D.defaults).some(k => k.t === 'Rozklik: čas v cíli'));
  assert.equal(D.tour.stepsFor('firstMeal', D.defaults).find(k => k.t === 'Hodnota ze senzoru: 7').watch, '.glu-pick'); /* integrace SCHEMA 84 (panel = rámeček): posuvník i se štítkem Z-GLUKOZA */ /* SCHEMA 84 (rozhodnutí 9): posuvník ukazuje vybranou hodnotu sám, sbalený řádek zrušen */
});

/* ---------- předávka Z (12-predavka-zaznam.md) ---------- */
test('Předávka Z J1, J2: registr ukazuje znění podle V.shownItem; poznámka v rozhodovacím bloku nejvýš 4000 znaků', () => {
  const src = fs.readFileSync(path.join(__dirname, 'app/screens-clinic.js'), 'utf8');
  assert.match(src, /V\.shownItem = function/); assert.match(src, /<textarea rows="3" maxlength="4000" data-bind="form\.' \+ key/);
});

console.log('\n' + passed + ' prošlo, ' + failed + ' selhalo' + (fails.length ? ':\n  ' + fails.join('\n  ') : ''));
process.exitCode = failed ? 1 : 0;
