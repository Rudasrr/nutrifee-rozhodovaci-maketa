/* SCHEMA 90 – jádro a akce (rozhodnutí vlastníka 11. 11. 2026, body 1–8, 11, 12; poslední kontrola navrhy-designu/36-posledni-kontrola: kód K1–K14,
   klinika K3, K4, K7, K8, K10–K12, K14, ordinace V1, V2, S1, S2, S4, S7, S9, pacient K3, V1, V3, S2, S5, S6).
   Běží bez prohlížeče: jádro (app/core.js + app/data/) s přípravkem modelového pacienta (demo/fixtures.js jen jako testovací data)
   a produkční sestavení (app/ bez demo/) v holém prostředí s falešným DOM. Projde i v repozitáři dema (tabulka „Co převzít“).
   Spuštění: node schema90-jadro.test.cjs   (ONLY=část názvu spustí jen vybrané testy) */
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const G = require('./zlate-vystupy/generuj.cjs');

let passed = 0, failed = 0; const fails = [];
function test(name, fn) {
  if (process.env.ONLY && name.indexOf(process.env.ONLY) < 0) return;
  try { fn(); console.log('OK  ', name); passed++; } catch (err) { console.error('FAIL', name, '—', err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err); failed++; fails.push(name); }
}
const src = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const APP = ['app/core.js', 'app/data/registry.js', 'app/data/catalogs.js', 'app/data/foods.js', 'app/icons.js', 'app/screens.js', 'app/screens-clinic.js', 'app/ui.js'];
/* Produkční sestavení (bez demo/) s falešným DOM; úložiště a hodiny přes NF.configure před načtením ui.js. */
function bootApp(opt) {
  opt = opt || {};
  const store = opt.store || new Map();
  const root = { innerHTML: '', focus() { }, querySelector() { return null; }, querySelectorAll() { return []; }, childNodes: [] };
  const els = new Map([['app', root]]);
  const el = id => { if (!els.has(id)) els.set(id, { innerHTML: '', focus() { }, querySelector() { return null; }, querySelectorAll() { return []; }, childNodes: [] }); return els.get(id); };
  const intervals = [];
  const sb = { console: { log() { }, warn() { }, info() { }, error() { } }, document: { getElementById: el, addEventListener() { }, querySelectorAll() { return []; }, activeElement: null, body: null }, location: { search: opt.url || '' }, setTimeout() { return 1; }, clearTimeout() { }, setInterval(fn) { intervals.push(fn); return 1; } };
  sb.window = sb; sb.globalThis = sb;
  const ctx = vm.createContext(sb);
  vm.runInContext(src(APP[0]), ctx, { filename: APP[0] });
  const NF = ctx.NutriFee; let now = opt.now || '2026-11-10T08:00:00';
  NF.configure({ now: () => now, storage: { get: k => (store.has(k) ? store.get(k) : null), set: (k, v) => store.set(k, String(v)) } });
  const hooks = []; NF.onChange((S, info) => hooks.push(Object.assign({ episodes: S.episodes.length }, info)));
  for (const f of APP.slice(1)) vm.runInContext(src(f), ctx, { filename: f });
  if (!opt.noBoot) NF.boot();
  return { ctx, NF, app: ctx.NutriFeeApp, root, store, hooks, intervals, setNow: v => { now = v; }, html: () => root.innerHTML, S: () => ctx.NutriFeeApp.getState() };
}
const story = G.load();
const NF = story.NF, D = story.D;
const at = (id, B) => D.play(D.indexOf(id), B);
const clone = x => JSON.parse(JSON.stringify(x));
/* Stav s převzatým plánem bez zápisů v libovolném čase (hodiny ručně). */
function fresh(clock) { const s = at('handover'); const p = NF.activePlan(s); p.handedOver = true; p.understood = true; p.understoodAt = p.understoodAt || s.clock; s.training.result = 'done'; s.episodes = []; s.hypoWatch = []; s.skipped = {}; s.page = 'today'; s.role = 'patient'; if (clock) s.clock = clock; return s; }
/* Vykreslená obrazovka Dnes produkčního sestavení pro daný stav (hodiny = hodiny stavu). */
function todayHtml(s) { const x = clone(s); x.role = 'patient'; x.page = 'today'; const A = bootApp({ store: new Map([['nutrifee', JSON.stringify(x)]]), now: x.clock }); return A.html(); }
function food(s, name) { return s.foods.find(f => f.name === name).id; }
function save(s, o) { const p = NF.activePlan(s); const d = Object.assign({ meal: 'lunch', foodId: food(s, 'Smažený řízek s bramborovou kaší'), portion: 'usual', bolusState: 'as', insulin: { confirmed: 'as', units: p.doses[o.meal || 'lunch'].units, time: NF.fmtTime(o.at || s.clock) }, before: 7, peak: 9 }, o); const r = NF.saveEpisode(s, d); assert.ok(r.ok, r.error); return r.episode; }

/* ---------- synchronizace (K1–K5) ---------- */
test('K1: minutový tik ani psaní do pole synchronizaci nic neposílají a tik neukládá; akce ano (info.action, domainChanged, rev)', () => {
  const s0 = fresh('2026-11-10T08:00:00'), store = new Map(); store.set('nutrifee', JSON.stringify(s0));
  const A = bootApp({ store, now: '2026-11-10T08:00:00' }); const n0 = A.hooks.length, saved0 = store.get('nutrifee');
  A.setNow('2026-11-10T08:05:00'); A.intervals.forEach(fn => fn());
  assert.equal(A.hooks.length, n0, 'tik háček nevolá'); assert.equal(store.get('nutrifee'), saved0, 'tik neukládá'); assert.equal(A.S().clock, '2026-11-10T08:05:00', 'tik posune hodiny');
  A.NF.bindValue('meal.q', 'kaše'); assert.equal(A.hooks.length, n0, 'psaní do pole háček nevolá');
  A.app.act('page', 'foods'); const h = A.hooks[A.hooks.length - 1]; assert.equal(h.action, 'page'); assert.equal(h.domainChanged, false, 'změna stránky je pohled');
  A.app.act('illness', 'on'); const h2 = A.hooks[A.hooks.length - 1]; assert.equal(h2.action, 'illness'); assert.equal(h2.domainChanged, true); assert.ok(h2.rev > (h.rev || 0));
});
test('K2: pohled (role, stránka, rozpracovaný zápis, oznámení) není v doméně; NF.mergeRemote převezme doménu a ponechá místní pohled', () => {
  const local = fresh('2026-11-10T12:00:00'); local.role = 'patient'; local.page = 'meal'; local.meal = { step: 2, meal: 'lunch', decisions: {}, reasons: {} }; local.toast = 'x';
  const remote = clone(local); remote.role = 'doctor'; remote.page = 'review'; remote.meal = null; remote.toast = 'Plán P2 je vydaný'; remote.rev = 5; remote.questions.push({ id: 'Q-99', at: remote.clock, text: 'otázka z ordinace' });
  const d = NF.domainOf(remote); ['clock', 'role', 'page', 'meal', 'toast', 'error', 'draft', 'rev'].forEach(k => assert.equal(k in d, false, k + ' je pohled'));
  local.rev = 3; const m = NF.mergeRemote(local, remote); assert.ok(m.ok, m.reason);
  assert.equal(m.state.role, 'patient'); assert.equal(m.state.page, 'meal'); assert.equal(m.state.meal.step, 2); assert.equal(m.state.toast, 'x'); assert.equal(m.state.rev, 5);
  assert.ok(m.state.questions.some(q => q.id === 'Q-99'), 'doména ze vzdálené verze');
  assert.equal(NF.mergeRemote(Object.assign(clone(local), { rev: 9 }), remote).reason, 'stale', 'starší verze domény nepřepíše novější');
  assert.equal(NF.mergeRemote(local, Object.assign(clone(remote), { schema: NF.SCHEMA + 1 })).reason, 'newer');
  assert.equal(NF.mergeRemote(local, Object.assign(clone(remote), { schema: NF.SCHEMA - 1 })).reason, 'older');
  assert.equal(NF.mergeRemote(local, Object.assign(clone(remote), { basalLog: [null] })).reason, 'shape');
  /* K6: předběhnuté hodiny jiného zařízení se nepřebírají – bez modelových hodin je po sloučení S.clock = NF.now() tohoto zařízení */
  const A = bootApp({ now: '2026-11-10T12:00:00' }); const rr = clone(remote); rr.clock = '2026-11-12T12:00:00'; const mm = A.NF.mergeRemote(clone(local), rr); assert.ok(mm.ok); assert.equal(mm.state.clock, '2026-11-10T12:00:00');
  const fr = bootApp({ now: '2026-09-01T08:00:00' }); assert.equal(fr.S().clock, '2026-09-01T08:00:00', 'čistý stav převezme skutečný čas, i když je dřív než výchozí');
});
test('K3: tvar stavu hlídá i položky polí; pád vykreslení neuloží čistý stav přes data (záloha, nouzová obrazovka, háček bez prázdného stavu)', () => {
  const s0 = fresh('2026-11-10T13:00:00'); save(s0, { meal: 'breakfast', at: '2026-11-10T07:30:00' });
  ['basalLog', 'nights', 'hypoWatch', 'illnessLog'].forEach(k => { const x = clone(s0); x[k] = [null]; assert.equal(NF.stateShapeOK(x), false, k); });
  const y = clone(s0); y.episodes[0].points = [null]; assert.equal(NF.stateShapeOK(y), false, 'points');
  const store = new Map(); store.set('nutrifee', JSON.stringify(s0));
  const A = bootApp({ store, now: '2026-11-10T13:00:00' });
  A.NF.screens.patient = () => { throw new Error('obrazovka spadla'); }; A.NF.screens.today = A.NF.screens.patient; if (A.NF.screens.V) A.NF.screens.V.today = A.NF.screens.patient;
  const origRender = A.NF.render; A.NF.render = () => { throw new Error('vykreslení spadlo'); };
  A.app.act('page', 'foods');
  const main = JSON.parse(store.get('nutrifee')); assert.equal(main.episodes.length, 1, 'data v úložišti zůstala');
  assert.ok([...store.keys()].some(k => /zaloha-vykresleni/.test(k)), 'záloha pod vlastním klíčem');
  assert.ok(A.hooks.every(h => h.episodes >= 1), 'háček nikdy nedostal prázdný stav');
  assert.match(A.root.innerHTML, /Začít znovu/); A.NF.render = origRender;
});
test('K4: stav novější verze jádra v úložišti starší klient nepřepíše (NF.readOnly, nic nezapíše ani nenahlásí)', () => {
  const s0 = fresh('2026-11-10T09:00:00'); save(s0, { meal: 'breakfast', at: '2026-11-10T08:30:00' }); s0.schema = NF.SCHEMA + 1;
  const store = new Map(); const raw = JSON.stringify(s0); store.set('nutrifee', raw);
  const A = bootApp({ store, now: '2026-11-10T09:00:00' });
  assert.equal(A.NF.readOnly, NF.SCHEMA + 1); A.app.act('page', 'foods'); A.app.act('illness', 'on');
  assert.equal(store.get('nutrifee'), raw, 'novější stav zůstal beze změny'); assert.equal(A.hooks.length, 0, 'nic se nenahlásilo'); assert.match(A.html(), /novější verze/);
});
test('K4: po migraci ze starší verze se čistý stav synchronizaci nehlásí, dokud uživatel nezvolí „Začít znovu“', () => {
  const store = new Map(); const old = fresh(); old.schema = 12; store.set('nutrifee', JSON.stringify(old));
  const A = bootApp({ store }); assert.ok(A.NF.migrated); A.app.act('page', 'foods'); assert.equal(A.hooks.length, 0);
  A.app.act('startOver'); const h = A.hooks[A.hooks.length - 1]; assert.ok(h && h.reset, 'čistý stav jen s příznakem reset');
});
test('K5: rychlá sada bere skripty jádra ze složky app/ a chybějící podsady přeskočí; zlaté výstupy bez pravdivost.test.cjs přeskočí test s prezentační vrstvou', () => {
  const r = src('rychle.test.cjs'), z = src('zlate-vystupy.test.cjs');
  assert.doesNotMatch(r, /readFileSync\(path\.join\(__dirname, 'nutrifee-rozhodovaci-maketa\.html'\)/); assert.match(r, /SKIP /);
  assert.match(z, /SKIP S prezentační vrstvou/); assert.match(z, /existsSync\(path\.join\(__dirname, 'pravdivost\.test\.cjs'\)\)/);
});
test('K9: adresa bez ?role= otevře pacienta; ?role=lekar lékaře (role je pohled, uloží se jen v zařízení)', () => {
  const s0 = fresh(); s0.role = 'nurse'; s0.page = 'training'; const store = new Map(); store.set('nutrifee', JSON.stringify(s0));
  const A = bootApp({ store }); assert.equal(A.S().role, 'patient'); assert.equal(A.hooks.length, 0);
  const B = bootApp({ store: new Map([['nutrifee', JSON.stringify(s0)]]), url: '?role=lekar' }); assert.equal(B.S().role, 'doctor');
});
test('K6 + bod 11: čas v Europe/Prague bez ohledu na pásmo zařízení; věta „Na cestách…“ jen při jiném místním čase', () => {
  const ctx = vm.createContext({ console }); for (const f of G.CORE) vm.runInContext(src(f), ctx, { filename: f }); const N = ctx.NutriFee;
  N.configure({ now: () => new Date(Date.UTC(2026, 10, 10, 12, 0, 0)) }); assert.equal(N.now(), '2026-11-10T13:00:00', 'UTC 12:00 = 13:00 v Praze (zimní čas)');
  N.configure({ now: () => new Date(Date.UTC(2026, 6, 1, 12, 0, 0)) }); assert.equal(N.now(), '2026-07-01T14:00:00', 'letní čas');
  N.configure({ zone: 'America/New_York' }); assert.equal(N.tzMismatch(), true); N.configure({ zone: 'Europe/Berlin' }); assert.equal(N.tzMismatch(), false, 'stejný čas, jiné jméno pásma'); N.configure({ zone: 'Europe/Prague' }); assert.equal(N.tzMismatch(), false);
  const s = fresh(); assert.match(JSON.stringify(N.data.registry().find(r => r.id === 'S-PRIPOMINKY').texts), /Na cestách se řiďte pokyny svého lékaře; zápisy jsou v českém čase\./);
});

/* ---------- rozhodnutí vlastníka ---------- */
test('Bod 1: den aplikace končí ve 4:00 – pozdní večeře po půlnoci je večeře předchozího dne, ne snídaně', () => {
  const s = fresh('2026-11-10T07:30:00'); save(s, { meal: 'breakfast', at: '2026-11-10T07:30:00' }); s.clock = '2026-11-10T12:30:00'; save(s, { meal: 'lunch', at: '2026-11-10T12:30:00' });
  s.clock = '2026-11-11T00:30:00'; assert.equal(NF.appDay(s, s.clock), '2026-11-10');
  const fm = NF.focusMeal(s); assert.equal(fm.meal, 'dinner', 've 0:30 se Dnes ptá na večeři, ne na snídani');
  save(s, { meal: 'dinner', at: '2026-11-11T00:20:00' }); assert.equal(NF.mealState(s, 'dinner').state, 'done');
  s.clock = '2026-11-11T07:30:00'; assert.equal(NF.focusMeal(s).meal, 'breakfast', 'ráno je na řadě snídaně, ne oběd');
  s.clock = '2026-11-11T01:00:00'; assert.equal(NF.confirmBasal(s, 'as').ok, true); assert.equal(s.basalLog[s.basalLog.length - 1].date, '2026-11-10');
  s.meal = { retro: true }; assert.equal(NF.retroAt(s, 0.5), '2026-11-11T00:30:00', 'zpětný zápis 0:30 = dnes po půlnoci'); assert.equal(NF.retroAt(s, 19), '2026-11-10T19:00:00'); s.meal = null;
  assert.ok(NF.PARAM_BOUNDS['S-PRIPOMINKY'].den_konec && NF.item(s, 'S-PRIPOMINKY').params.den_konec === 4 && NF.item(s, 'S-PRIPOMINKY').version === 'v2');
});
test('Bod 2: do 3 h po hlavním jídle je hlavní tlačítko Dnes „Zapsat svačinu“, další hlavní jídlo jen vedlejší volba', () => {
  const s = fresh('2026-11-10T12:30:00'); save(s, { meal: 'breakfast', at: '2026-11-10T07:30:00' }); save(s, { meal: 'lunch', at: '2026-11-10T12:20:00' }); s.clock = '2026-11-10T13:20:00';
  assert.equal(NF.snackFirst(s), true);
  const h = todayHtml(s); const hero = h.slice(h.indexOf('Co teď'), h.indexOf('Co teď') + 3000); assert.match(hero, /class="btn primary big"[^>]*data-action="startMeal" data-value="snack"|data-action="startMeal" data-value="snack"[^>]*class="btn primary big"/, 'hlavní tlačítko svačina');
  assert.doesNotMatch(hero, /class="btn primary big"[^>]*data-action="startMeal" data-value="dinner"/);
  assert.match(h, /Chystám se na večeři/); s.clock = '2026-11-10T16:00:00'; assert.equal(NF.snackFirst(s), false);
});
test('Bod 3: glukóza „pod 4“ před jídlem je pokles – karta po opakovaných poklesech, Bezpečnost, blokace „zvýšit“ u předchozího jídla', () => {
  const s = fresh('2026-11-10T07:30:00'); const b = save(s, { meal: 'breakfast', at: '2026-11-10T07:30:00' });
  s.clock = '2026-11-10T12:30:00'; save(s, { meal: 'lunch', at: '2026-11-10T12:30:00', before: 4, beforeBound: 'under' });
  let ev = NF.lowEvents(s, 7); assert.equal(ev.length, 1); assert.equal(ev[0].meal, 'breakfast', 'pokles před obědem patří ke snídani'); assert.equal(ev[0].epId, b.id); assert.equal(ev[0].clean, true);
  s.clock = '2026-11-11T07:30:00'; save(s, { meal: 'breakfast', at: '2026-11-11T07:30:00', before: 3.4 });
  ev = NF.lowEvents(s, 7); assert.equal(ev.length, 2); assert.ok(ev.some(x => x.night), 'pokles před snídaní patří k noci'); assert.ok(NF.hypoAlert(s), 'dva poklesy za 7 dní → karta');
  assert.ok(NF.basalNights(s, 14).selfAll.some(x => x.via === 'pred'), 'noc pro návrh k bazálu');
});
test('Bod 4: čas pod cílem nad mezí blokuje větev „zvýšit“ u všech dávek (bod 11 D-POSTUP, bod 5 u bazálu ráno), i u řádků bez návrhu', () => {
  const s = at('reviewProposals'); s.role = 'doctor'; s.sensorSummary.below = 9; s.sensorSummary.veryLow = 3; NF.startReview(s, NF.habitCatalog(), { force: true });
  const b = s.review.proposals.find(p => p.id === 'PR-BREAKFAST' && !p.row); assert.ok(b, 'karta ke snídani');
  const i = b.facts.findIndex(f => f && /pod 3,0/.test(f.text)); assert.equal(i, 10); assert.equal(b.facts[i].block, true); assert.equal(b.lowBlock, true);
  const all = {}; b.verify.forEach((_, k) => { all[k] = true; }); s.review.verify[b.id] = all; assert.notEqual(NF.proposalBranch(s, b).action, 'up');
  assert.ok(s.review.proposals.filter(p => p.kind === 'dose' && (p.row || (p.branches || []).some(b => b.action === 'up'))).every(p => p.lowBlock), 'všechny dávky, u kterých jde zvýšit');
  const reg = NF.item(s, 'D-POSTUP'); assert.equal(reg.version, 'v2'); assert.equal(reg.postup.bazalHigh.verify.length, 5); assert.ok(reg.postup.bazalHigh.branches.some(x => x.when === 'bod 5 nesedí' && x.action === 'keep'));
  const p0 = NF.activePlan(s); const r = NF.decideProposal(s, b.id, { choice: 'agree', branch: 'up', units: p0.doses.breakfast.units + 1 }); assert.ok(r.ok); assert.equal(s.review.decisions[b.id].againstData, true);
});
test('Bod 5: výrazně vyšší dávka – pravidlo I-VYSSI, bez procházky, za 60 min otázka „pod 4?“; nic o dávce, bez výzvy volat', () => {
  const s = fresh('2026-11-10T18:00:00'); const p = NF.activePlan(s), k = food(s, 'Ovesná kaše s mlékem a banánem');
  s.meal = { meal: 'lunch', foodId: k, units: p.doses.lunch.units + 4, bolus: 'other', step: 3, decisions: {}, reasons: {} };
  const a = NF.advise(s, k, 'usual', 'other', 'lunch'); assert.equal(a.higherDose, true); assert.equal(a.items.some(x => x.lever === 'walk'), false);
  s.meal = null; s.clock = '2026-11-10T12:30:00';
  const ep = save(s, { meal: 'lunch', foodId: k, insulin: { confirmed: 'other', units: p.doses.lunch.units + 4, time: '12:30' } });
  const w = s.hypoWatch.find(x => x.epId === ep.id); assert.ok(w && w.kind === 'higher'); assert.ok(s.events.some(e => e.what === 'pravidlo.vyssi'));
  s.clock = '2026-11-10T13:31:00'; assert.ok(NF.pendingHypoWatch(s).some(x => x.id === w.id));
  const c = NF.instructionCatalog().find(x => x.id === 'I-VYSSI'); assert.ok(c && c.fixed); const t = c.text + c.prvniKrok + c.coDal.join(' ');
  assert.doesNotMatch(t, /zavolej|volejte|dávku (si )?(zvyšte|snižte|upravte)|sněz(te)? víc/i); assert.match(t, /cukr/); assert.match(t, /nevynechávejte/);
  assert.ok(NF.item(s, 'I-VYSSI') && NF.item(s, 'I-VYSSI').params.nad_j === 2); assert.equal(NF.higherDose(s, 'lunch', p.doses.lunch.units + 1), false);
});
test('Bod 6: pokles z exportu se k jídlu přiřadí do 4 h (Z-IMPORT pokles_min), nejvyšší hodnota zůstává do 2 h; měření v čase jídla není pokles po jídle (K10)', () => {
  const s = fresh('2026-11-11T08:00:00'); const d = save(s, { meal: 'dinner', at: '2026-11-10T18:30:00' });
  const rows = ['čas;glukóza']; for (let m = -10; m <= 600; m += 5) { const t = NF.addMin('2026-11-10T18:30:00', m); const v = m >= 215 && m <= 235 ? 3.2 : 7; rows.push(t.slice(8, 10) + '.' + t.slice(5, 7) + '.' + t.slice(0, 4) + ' ' + t.slice(11, 16) + ';' + String(v).replace('.', ',')); }
  NF.activePlan(s).issuedAt = '2026-11-01T09:00:00'; const r = NF.importReadings(s, NF.parseSensorCsv(rows.join('\n'))); assert.ok(r.ok, r.error);
  assert.ok(d.lowAfter && d.lowAfter.mmol === 3.2, 'nejnižší hodnota 3–4 h po jídle'); assert.equal(NF.epPeak(s, d), 7, 'vrchol jen do 2 h');
  assert.ok(NF.lowEvents(s, 7).some(x => x.meal === 'dinner' && x.source === 'senzor'));
  const s2 = fresh('2026-11-10T14:00:00'); const l = save(s2, { meal: 'lunch', at: '2026-11-10T12:30:00' }); l.points = [{ min: 0, mmol: 3.4 }, { min: 30, mmol: 8 }, { min: 60, mmol: 9 }, { min: 120, mmol: 7 }]; l.importedAt = s2.clock;
  assert.equal(NF.epLowAfter(s2, l, 3.9), false, 'hodnota v čase jídla není pokles po jídle'); assert.ok(NF.lowEvents(s2, 7).every(x => x.meal !== 'lunch'), 'pokles před obědem patří ke snídani / noci');
});
test('Bod 7: zápis jde opravit nebo smazat do 24 h; oprava jde do stopy a zápis do návrhu k dávce nejde; po 24 h nejde', () => {
  const s = fresh('2026-11-10T12:30:00'); const ep = save(s, { meal: 'lunch', at: '2026-11-10T12:30:00' });
  assert.equal(NF.usableForDose(s, ep), NF.usableForDose(s, ep)); const r = NF.editEpisode(s, ep.id, { portion: 'smaller', before: 6 }); assert.ok(r.ok, r.error);
  assert.equal(ep.portion, 'smaller'); assert.equal(ep.edited, true); assert.equal(NF.usableForDose(s, ep), false); assert.match(NF.whyNotForDose(s, ep), /menší porce|opraven/);
  assert.ok(s.events.some(e => e.what === 'jidlo.zapis.opraven' && e.data.from.portion === 'usual')); assert.ok(s.hypoWatch.some(w => w.epId === ep.id && w.kind === 'smaller'), 'menší porce s inzulinem → sledování');
  const ep2 = save(s, { meal: 'dinner', at: '2026-11-10T12:40:00' }); assert.ok(NF.deleteEpisode(s, ep2.id).ok); assert.equal(s.episodes.some(e => e.id === ep2.id), false); assert.ok(s.events.some(e => e.what === 'jidlo.zapis.smazan' && e.data.episode.id === ep2.id));
  s.clock = '2026-11-11T12:31:00'; assert.equal(NF.editEpisode(s, ep.id, { portion: 'usual' }).ok, false); assert.equal(NF.deleteEpisode(s, ep.id).ok, false);
});
test('Bod 8: body potvrzené daty jsou předvyplněné „sedí podle dat“; lékař je může změnit a stopa to zapíše', () => {
  const s = at('reviewSummary'); s.role = 'doctor'; NF.startReview(s, NF.habitCatalog(), { force: true });
  const b = s.review.proposals.find(p => p.id === 'PR-BREAKFAST' && !p.row); const i = b.facts.findIndex((f, k) => b.dataOk[k]); assert.ok(i >= 0);
  assert.equal(NF.verifyState(s, b, i), true); assert.equal(NF.verifyByData(s, b, i), true); b.nurse.forEach((n, k) => { if (n) assert.equal(b.dataOk[k], false, 'bod sestry se z dat nepředvyplní'); });
  NF.setVerify(s, b.id, i, false); assert.equal(NF.verifyState(s, b, i), false); const e = s.events[s.events.length - 1]; assert.equal(e.what, 'navrh.overeni'); assert.equal(e.data.protiDatum, true);
  NF.decideItem(s, 'D-POSTUP', 'rejected', '', { garant: true }); const b2 = s.review.proposals.find(p => p.id === 'PR-BREAKFAST'); if (b2 && !b2.row) assert.equal(NF.verifyByData(s, b2, i), false, 'bez D-POSTUP se nic nepředvyplňuje');
});
test('Bod 12: K-KRITERIA v2 – podmínky zařazení obsahují bazál 1× denně večer a „bez korekčního schématu“; bez nich plán nejde vydat', () => {
  const s = at('enroll'); assert.ok(NF.ELIGIBILITY.some(c => c[0] === 'noCorrection' && /korekčního schématu/.test(c[1]))); assert.ok(NF.ELIGIBILITY.some(c => /1× denně večer/.test(c[1])));
  NF.ELIGIBILITY.forEach(c => NF.setEligibility(s, c[0], true)); NF.setEligibility(s, 'noCorrection', false); assert.equal(s.enrollment.eligible, false);
  assert.equal(NF.item(s, 'K-KRITERIA').version, 'v2'); assert.match(NF.item(s, 'K-KRITERIA').summary, /bez korekčního schématu/);
});
test('Nové položky a verze jsou „ke schválení“; meze parametrů obsahují výchozí hodnoty', () => {
  const s = NF.createState(); NF.seed(s);
  const V = { 'B-HYPO': 'v3', 'D-POSTUP': 'v2', 'K-KRITERIA': 'v2', 'Z-IMPORT': 'v2', 'S-PRIPOMINKY': 'v2', 'D-PRAND': 'v2', 'D-BAZAL': 'v2', 'I-VYSSI': 'v2' /* první verze s krátkou podobou pravidla (SCHEMA 86) */ };
  for (const [id, v] of Object.entries(V)) { const r = NF.item(s, id); assert.ok(r, id); assert.equal(r.version, v, id); if (r.scope !== 'provozni') assert.equal(NF.itemState(s, id), 'pending', id); }
  for (const [id, b] of Object.entries(NF.PARAM_BOUNDS)) { const r = NF.item(s, id); if (!r) continue; for (const [k, [lo, hi]] of Object.entries(b)) if (typeof r.params[k] === 'number') assert.ok(r.params[k] >= lo && r.params[k] <= hi, id + '.' + k); }
  assert.equal(NF.garantItems(s).length, 29); assert.equal(NF.instructionCatalog().length, 8);
});

/* ---------- opravy z poslední kontroly ---------- */
test('Ordinace V1, V2: semafor zelený jen s časem pod 3,0 pod mezí; pod 14 dní dat „bez hodnocení“ (few) a bod o vyrovnání bez rozhodnutí', () => {
  const s = at('reviewProposals'); const ss = s.sensorSummary; ss.tir = 75; ss.below = 3; ss.veryLow = 2; ss.days = 14;
  assert.equal(NF.summary(s, NF.activePlan(s).id).tirState, 'bad'); ss.veryLow = 0; assert.equal(NF.summary(s, NF.activePlan(s).id).tirState, 'ok');
  ss.days = 1; assert.equal(NF.summary(s, NF.activePlan(s).id).tirState, 'few');
});
test('Ordinace V2: export celý z jiného období se odmítne, částečný se ořízne na období plánu', () => {
  const s = at('reviewSummary'); const rows = ['čas;glukóza']; for (let d = 0; d < 3; d++) for (let h = 0; h < 24; h++) rows.push((10 + d) + '.01.2026 ' + (h < 10 ? '0' : '') + h + ':00;7');
  const before = JSON.stringify(s.sensorSummary); const r = NF.importReadings(s, NF.parseSensorCsv(rows.join('\n'))); assert.equal(r.ok, false); assert.match(r.error, /jiného období/); assert.equal(JSON.stringify(s.sensorSummary), before);
  const rows2 = rows.concat(['04.01.2027 06:00;7', '04.01.2027 07:00;7']); const r2 = NF.importReadings(s, NF.parseSensorCsv(rows2.join('\n'))); assert.ok(r2.ok); assert.equal(r2.trimmed, 72); assert.match(r2.text, /mimo období plánu/);
});
test('Pacient K3: „Zahodit“ po potvrzeném inzulinu zapíše vynechané jídlo s inzulinem (pravidlo, sledování); bez inzulinu jen zahodí', () => {
  const s0 = fresh('2026-11-10T12:00:00'); const store = new Map([['nutrifee', JSON.stringify(s0)]]); const A = bootApp({ store, now: '2026-11-10T12:00:00' });
  A.app.act('startMeal', 'lunch'); A.app.act('mealBolus', 'as'); A.app.act('mealCancelAsk'); assert.match(A.html(), /Nebudete jíst\?/); A.app.act('mealCancel');
  const S = A.S(); assert.equal(S.meal, null); assert.ok(S.skipped['2026-11-10'].lunch); assert.ok(S.hypoWatch.some(w => w.kind === 'skipped' && w.meal === 'lunch')); assert.ok(S.events.some(e => e.what === 'pravidlo.mene' && e.data.where === 'zahozeno'));
  A.app.act('startMeal', 'dinner'); A.app.act('mealBolus', 'before'); A.app.act('mealCancel'); assert.equal(A.S().skipped['2026-11-10'].dinner, undefined);
});
test('Klinika K3, K12: oprava „nepíchnuto → podle plánu“ u menší porce založí sledování; „podáno → nepíchnuto“ otázku zruší', () => {
  const s = fresh('2026-11-10T12:30:00'); const ep = save(s, { meal: 'lunch', portion: 'smaller', insulin: { confirmed: 'none', units: null, time: null } });
  assert.equal(s.hypoWatch.length, 0); s.clock = '2026-11-10T12:40:00'; assert.ok(NF.correctInsulin(s, ep.id, 'as').ok); assert.ok(s.hypoWatch.some(w => w.epId === ep.id && w.kind === 'smaller'));
  s.clock = '2026-11-10T12:50:00'; assert.ok(NF.correctInsulin(s, ep.id, 'none').ok); assert.equal(s.hypoWatch.find(w => w.epId === ep.id).answer, 'void');
});
test('Klinika K7: pravidlo k vysoké glukóze má pevnou hranici 15 jako čip „nad 15“', () => {
  const c = NF.instructionCatalog().find(x => x.id === 'I-VYSOKA'); assert.equal(c.fixed, true); assert.equal(c.value, 15);
  const s = fresh(); NF.activePlan(s).instructions.forEach(x => { if (x.id === 'I-VYSOKA') x.value = 20; }); assert.equal(NF.instructionValue(s, c), 15);
  assert.equal(JSON.stringify(NF.PARAM_BOUNDS['I-VYSOKA'].v), '[15,15]');
});
test('Klinika K4, K14: hlášené „pod 4“ se počítá jako pokles i při dolním cíli 3,5; velmi nízká hodnota a hranice noci jsou parametry registru', () => {
  const s = at('reviewSummary'); const p = NF.activePlan(s); p.targets.low = 3.5; NF.startReview(s, NF.habitCatalog(), { force: true });
  const n = s.episodes.filter(e => e.planId === p.id && e.meal === 'lunch' && e.manual && e.manual.low === true).length; assert.ok(n >= 2);
  assert.ok(s.review.proposals.some(pr => pr.dose === 'lunch' && /pod cílem/.test(pr.title)) || s.review.proposals.find(pr => pr.dose === 'lunch').lowBlock !== undefined);
  ['D-PRAND', 'D-BAZAL'].forEach(id => assert.equal(NF.item(s, id).params.velmiNizka, 3.0)); ['noc_od', 'noc_do', 'spani_od', 'pokles_min'].forEach(k => assert.ok(NF.item(s, 'Z-IMPORT').params[k] != null, k));
  ['ranni_otazka_h', 'zpetne_h'].forEach(k => assert.ok(NF.item(s, 'B-HYPO').params[k] != null, k));
  assert.doesNotMatch(src('app/core.js').match(/svacina: \(function[^\n]*/)[0], /do 2 h/);
});
test('Klinika K8, ordinace S5: jádro samo zapíše „jinak než postup“ podle směru dávky proti větvi; změna ve směru větve odchylka není; větev v okamžiku rozhodnutí jde do rozhodnutí', () => {
  const s = at('reviewProposals'); const pr = s.review.proposals.find(p => p.id === 'PR-BREAKFAST' && !p.row); const all = {}; pr.verify.forEach((_, k) => { all[k] = true; }); s.review.verify[pr.id] = all;
  assert.equal(NF.proposalBranch(s, pr).action, 'up'); const cu = NF.activePlan(s).doses.breakfast.units;
  NF.decideProposal(s, pr.id, { choice: 'agree', branch: 'up', units: cu - 1 }); let d = s.review.decisions[pr.id]; assert.equal(d.againstBranch, true); assert.equal(d.choice, 'other'); assert.equal(d.postup.action, 'up');
  NF.decideProposal(s, pr.id, { choice: 'other', branch: 'up', units: cu + 3, againstBranch: true }); d = s.review.decisions[pr.id]; assert.equal(d.againstBranch, false, 'větší krok ve směru větve není odchylka');
});
test('Klinika K11: okno pro návrh k dávce není širší než okno pro učení; meze B-HYPO a D-POSTUP neoslabí bezpečnost', () => {
  const s = fresh(); NF.item(s, 'D-CISTA').params.pred_min = 60; assert.equal(NF.tolerance(s).before, 45);
  assert.equal(NF.clampParam('D-POSTUP', 'poklesy_od', 5), 2); assert.equal(NF.clampParam('B-HYPO', 'poklesy', 5), 3); assert.equal(NF.clampParam('D-PRAND', 'hypoPodil', 0), 0.05); assert.equal(NF.clampParam('I-MENE', 'v', 999), 240);
});
test('Ordinace S1: export nahraný po zahájení kontroly přepočítá souhrn i návrhy (a ponechá rozhodnutí)', () => {
  const s = at('reviewSummary'); const csv = D.demoCsv(s); s.sensorSummary = null; s.nights = []; s.episodes.forEach(e => { if (e.importedAt) { e.importedAt = null; e.points = []; } }); s.sensorImport = null;
  NF.startReview(s, NF.habitCatalog(), { force: true }); assert.equal(s.review.summary.sensor, null);
  NF.importReadings(s, NF.parseSensorCsv(csv)); assert.ok(s.review.summary.sensor, 'souhrn po nahrání'); assert.ok(s.events.some(e => e.what === 'kontrola.prepocet'));
});
test('Ordinace S2, S7: po vydání dalšího plánu export minulého období, dny nemoci a sledování nepatří k novému období; dny nemoci jen do dne před kontrolou', () => {
  const s = at('newplan'); assert.equal(NF.sensorImportFor(s), null, 'nový plán: export nenahrán'); const p = NF.activePlan(s);
  assert.equal(NF.illnessDays(s, p, s.clock), 0); assert.equal(NF.periodHypoWatch(s, p).length, 0);
  const r = at('reviewSummary'), pl = NF.activePlan(r); r.illnessLog = [{ from: pl.issuedAt, to: r.clock }];
  assert.ok(NF.illnessDays(r, pl, r.clock) <= NF.periodInfo(r, pl, r.clock).days, 'dny nemoci nepřesáhnou období');
});
test('Ordinace S4: činnosti sestry jdou do stopy jako „sestra“', () => {
  const s = at('reviewSummary'); s.role = 'doctor'; NF.setNurseMeds(s, 'no'); NF.setWeight(s, 'sestra', 90); NF.setNurseHbaNone(s);
  const k = NF.nurseKeys(s)[0]; if (k) NF.setNurseCheck(s, k, true);
  s.events.slice(-4).forEach(e => assert.equal(e.who, 'nurse', e.what));
});
test('Ordinace S9: pacient u zamítnutého návrhu čte „beze změny“, ne „lékař náš návrh zamítl“', () => {
  const s = at('reviewProposals'); s.review.proposals.filter(p => !p.row).forEach(p => NF.decideProposal(s, p.id, { choice: 'reject', reason: 'jine' }));
  const d = NF.planFromReview(s); assert.ok(d.decisions.length); assert.ok(d.decisions.every(x => !/zamítl/.test(x.text)));
});
test('Kód K7: „Nevím“ u bazálu se lékaři ukáže jako „pacient neví, zda podán“, ne „jinak (null j.)“', () => {
  const s = fresh('2026-11-10T08:00:00'); s.basalLog = [{ at: s.clock, date: '2026-11-09', prescribed: 12, confirmed: 'unknown', units: null, time: null }];
  const t = NF.nightCircumstances(s, [{ date: '2026-11-10', min: 3.5, fasting: 6 }])[0].text; assert.match(t, /pacient neví, zda podán/); assert.doesNotMatch(t, /null/);
});
test('Kód K8: den převzetí odpoledne – sloty, které skončily před převzetím, jsou „před plánem“ (Dnes se na ně neptá, tkanina je nepočítá)', () => {
  const s = fresh('2026-11-10T13:00:00'); const p = NF.activePlan(s); p.understoodAt = '2026-11-10T13:00:00'; p.effectiveFrom = '2026-11-10T12:50:00'; p.issuedAt = p.effectiveFrom;
  assert.equal(NF.mealState(s, 'breakfast').state, 'before'); assert.equal(NF.focusMeal(s).meal, 'lunch');
  const w = NF.weave(s, '2026-11-10T00:00:00', s.clock); assert.equal(w.days[0].cells[0], 'future');
});
test('Kód K12, K13: dny plánu kalendářně (jarní změna času); vykreslení stav nemění (týdenní shrnutí)', () => {
  const s = fresh('2027-04-03T00:30:00'); const p = NF.activePlan(s); p.effectiveFrom = '2027-03-20T09:00:00'; p.issuedAt = p.effectiveFrom; p.validUntil = '2027-06-20T09:00:00'; s.nextVisit = p.validUntil; assert.equal(NF.pathStats(s).gone, 14);
  const s2 = fresh(); NF.activePlan(s2).effectiveFrom = NF.addDays(s2.clock, -10); const before = JSON.stringify(s2.fb); NF.weekSummary(s2); assert.equal(JSON.stringify(s2.fb), before);
});
test('Kód K14: uložit jde jen z kroku 3 s porcí a platnou odpovědí; druhé „Zahájit kontrolu“ rozhodnutí nezahodí; nesmyslné hodnoty akcí nevyhodí výjimku', () => {
  const s0 = fresh('2026-11-10T12:00:00'); const A = bootApp({ store: new Map([['nutrifee', JSON.stringify(s0)]]), now: '2026-11-10T12:00:00' });
  A.app.act('startMeal', 'lunch'); A.S().meal.foodId = A.S().foods[0].id; A.app.act('mealFinish', 'as'); assert.equal(A.S().episodes.length, 0); assert.match(A.S().error, /kroky/);
  A.S().meal.step = 3; A.S().meal.portion = 'usual'; A.S().meal.beforeAsked = true; A.S().meal.bolus = 'as'; A.app.act('mealFinish', 'nesmysl'); assert.equal(A.S().episodes.length, 0, 'neznámá odpověď o inzulinu se neuloží jako „podle plánu“');
  ['revInstrValue', 'instrValue', 'foodDiverge', 'propDecide', 'fixInsulin', 'fixInsulinPick', 'peakChip', 'lowChip', 'hypoAnswer', 'pendingInsulin', 'mealTag', 'mealDecide', 'mealReason'].forEach(a => { A.app.act(a, null); assert.equal(A.S().events.some(e => e.what === 'chyba.akce'), false, a); });
  const r = at('reviewConfirm'); r.role = 'doctor'; const n = Object.keys(r.review.decisions).length; assert.ok(n > 0); assert.ok(NF.startReview(r, NF.habitCatalog()).refreshed); assert.equal(Object.keys(r.review.decisions).length, n);
});
test('Pacient V1: chybějící snídaně neblokuje večeři; od 19:00 Dnes nepíše „další věc až zítra ráno“, když jídlo dne chybí', () => {
  const s = fresh('2026-11-10T18:00:00'); save(s, { meal: 'lunch', at: '2026-11-10T12:30:00' });
  const fm = NF.focusMeal(s); assert.equal(fm.meal, 'dinner'); assert.deepEqual(Array.from(fm.missed), ['breakfast']);
  let h = todayHtml(s); assert.match(h, /Doplnit snídani/); assert.match(h, /Chystám se jíst/);
  s.clock = '2026-11-10T21:30:00'; h = todayHtml(s); assert.doesNotMatch(h, /další věc až zítra ráno/);
  s.clock = '2026-11-10T10:15:00'; s.episodes = []; const f2 = NF.focusMeal(s); assert.equal(f2.meal, 'breakfast'); assert.equal(f2.then, 'lunch', 'v 10:15 se ptá na snídani a oběd je vedlejší volba');
});
test('Pacient V3: nesmyslné názvy jídel se nepřijmou', () => {
  const s = fresh(); ['xx', '123', 'aaaaaaa', ' a1 ', '!!!'].forEach(n => assert.equal(NF.addFood(s, n).ok, false, n)); assert.ok(NF.addFood(s, 'Guláš z restaurace', {}, { force: true }).ok);
});
test('Pacient S2, S5, S6: otázka po vynechaném jídle bez hodiny; texty pacienta bez „upřesní se“, „do učení“, čísla s jednotkou, „Můj plán“; „Zatím ho neznáme. Poznáme ho, až…“', () => {
  const sc = src('app/screens.js'); assert.doesNotMatch(sc, /s dalšími se upřesní'/); assert.doesNotMatch(sc, /ty se do učení nepočítají/); assert.doesNotMatch(sc, /rozdělte na dvě/); assert.match(sc, /Poznáme ho, až ho zapíšete/); assert.doesNotMatch(sc, /zapište ho ještě/);
  assert.match(sc, /kolem ' \+ e\(String\(dv\.peakMed\)\) \+ '(?: |\\u00a0)mmol\/l/ /* nezlomitelná mezera (integrace SCHEMA 90) */); assert.match(sc, /v Bezpečí a v Mém plánu/);
  const s = fresh('2026-11-10T14:00:00'); s.clock = '2026-11-10T10:00:00'; NF.skipMeal(s, 'breakfast', 'as'); s.clock = '2026-11-11T08:00:00'; s.role = 'patient'; s.page = 'today';
  const w = s.hypoWatch[0]; w.at = '2026-11-10T13:20:00'; const h = todayHtml(s); assert.match(h, /Včera jste vynechali snídani/); assert.doesNotMatch(h, /Včera v 13:20 jste vynechali/);
});

console.log('\n' + passed + ' prošlo, ' + failed + ' selhalo' + (fails.length ? ':\n  ' + fails.join('\n  ') : ''));
process.exitCode = failed ? 1 : 0;
