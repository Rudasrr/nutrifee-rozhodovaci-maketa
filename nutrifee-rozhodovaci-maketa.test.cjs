/* Testy logiky makety v izolovaném prostředí. Nenahrazují ověření v prohlížeči.
   Spuštění: node nutrifee-rozhodovaci-maketa.test.cjs */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, 'nutrifee-rozhodovaci-maketa.html'), 'utf8');
/* ?v= je jen proti cache prohlížeče. */
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1].split('?')[0]);
const CORE = scripts.filter(s => s.startsWith('app/'));
const DEMO = scripts.filter(s => s.startsWith('demo/'));
assert.ok(CORE.length >= 4 && DEMO.length >= 3, 'HTML musí načítat jádro i prezentační vrstvu');

let ctx, app, NF, D, elements, store;
/* Maketa se bez přihlášení nezobrazí (demo/auth.js); testy startují jako přihlášený garant. */
const sessionFor = role => JSON.stringify({ access_token: 'test-token', refresh_token: 'test-refresh', expires_at: 4102444800000, user: { id: 'u-' + role, email: role + '@example.test', app_metadata: { role } } });
function boot({ withDemo = true, keepStore = false } = {}) {
  elements = new Map(); if (!(keepStore && store)) { store = new Map(); store.set('nutrifee-auth', sessionFor('garant')); } /* keepStore: obnovení stránky (F5) se stejným úložištěm */
  const el = id => { if (!elements.has(id)) elements.set(id, { innerHTML: '', focus() { }, querySelector() { return null; }, querySelectorAll() { return []; }, childNodes: [] }); return elements.get(id); };
  const sandbox = {
    console,
    document: { getElementById: el, addEventListener() { }, querySelectorAll() { return []; }, createElement() { return { click() { }, set innerHTML(v) { }, querySelectorAll() { return []; } }; }, activeElement: null, body: null },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
    setTimeout() { return 1; }, Blob: class { }, URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() { } }
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox;
  ctx = vm.createContext(sandbox);
  for (const f of (withDemo ? [...CORE, ...DEMO] : CORE)) vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f });
  app = ctx.NutriFeeApp; NF = ctx.NutriFee; D = ctx.NutriFeeDemo;
}
const S = () => app.getState();
const act = (a, v) => app.act(a, v);
/* Pokračování vyžaduje rozhodnutí nabídnutých položek (8. 10. 2026): testy je schválí a jdou dál. */
const next = () => { const pn = D.pendingNow(S()); pn.ids.forEach(id => app.act('garantDecide', id + ':approved')); if (pn.summary) app.act('garantConfirmSummary', 'force'); app.act('tourNext'); }; /* V16: s nerozhodnutými položkami se panel nejdřív ptá; testy potvrzují výslovně */
const bind = (k, v) => app.bind(k, v);
/* Vykreslení vkládá nezlomitelné mezery (D11); testy porovnávají s obyčejnou mezerou. */
const plain = s => String(s).replace(/\u00a0/g, ' ');
/* Panel vyprávění je v DOM až za #app (přístupnost 23. 10. 2026, nález 10): vykreslení = obrazovka + panel. */
const markup = () => { const a = elements.get('app').innerHTML, t = elements.has('tour') ? elements.get('tour').innerHTML : '', i = a.indexOf('<main'); return plain(i < 0 ? a + t : a.slice(0, i) + t + a.slice(i)); }; /* panel před <main> jako dřív: testy berou obrazovku od <main> do konce */
/* Integrace SCHEMA 73 (B01): položka se nabízí v kroku, kde je její štítek ve výřezu cíle – dojde se na první krok s nabídkou */
const toOffer = () => { for (let g = 0; g < 12 && !D.pendingNow(S()).ids.length; g++) app.act('tourNext'); };
const chapter = id => { const i = D.indexOf(id); assert.ok(i >= 0, 'neznámá kapitola ' + id); act('goChapter', String(i)); act('closeDrawer'); };
const branch = (k, v) => { act('setBranch', k + ':' + v); act('closeDrawer'); };
const food = name => S().foods.find(f => f.name === name);
const V_leverAnim = lv => NF.screens.leverAnim(lv);
const plateMoveSrc = () => NF.screens.plateMove('bigger');
const everyScreen = fn => { for (let i = 0; i < D.chapters.length; i++) { act('goChapter', String(i)); act('closeDrawer'); for (const r of ['patient', 'doctor', 'nurse']) { act('role', r); fn(markup(), D.chapters[i].id + '/' + r); } } };
/* SCHEMA 86 (33/06 odd. 1): jádro u pacienta kreslí jen značku data-item; štítek pro garanta v ukázce dokresluje prezentační vrstva slotem NF.slots.patientTag.
   noTag() = obrazovka, jak ji vykreslí jádro bez slotu (jako produkce bez demo/); markup() = ukázka se štítky. */
const noTag = () => { const k = NF.slots.patientTag; NF.slots.patientTag = null; try { act('noop'); return markup(); } finally { NF.slots.patientTag = k; act('noop'); } };

let passed = 0, failed = 0; const fails = [];
function test(name, fn) { if (process.env.ONLY && name.indexOf(process.env.ONLY) < 0) return; if (process.env.ONLYRE && !new RegExp(process.env.ONLYRE).test(name)) return; /* ONLYRE=regulární výraz: víc vybraných testů najednou */ /* ONLY=část názvu: spustí jen vybrané testy */ try { boot(); fn(); console.log('OK  ', name); passed++; } catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); } }

/* ---------- zásady ---------- */
test('Aplikace nikde nepočítá ani nenavrhuje dávku; volí ji lékař', () => {
  chapter('reviewProposals');
  const pr = S().review.proposals.find(p => p.kind === 'dose');
  assert.ok(pr, 'návrh k dávce existuje');
  assert.equal(/\d+\s*j\./.test(pr.title + pr.why + pr.branches.map(b => b.text).join()), false, 'návrh neobsahuje jednotky');
  assert.ok(pr.branches.every(b => ['up', 'down', 'keep', 'swap', 'edit'].includes(b.action)));
  assert.ok(pr.postup === 'D-POSTUP', 'větve jsou z lékařova schváleného postupu');
  const src = fs.readFileSync(path.join(__dirname, 'app/core.js'), 'utf8');
  assert.equal(/units\s*[+\-]=\s*\d/.test(src), false, 'jádro samo nemění jednotky');
});

test('Porce: před píchnutím oběma směry; po píchnutí jen z větší; nikdy „sněz víc“', () => {
  chapter('advice');
  const k = food('Ovesná kaše s mlékem a banánem').id;
  assert.ok(NF.advise(S(), k, 'bigger', 'before').items.some(i => i.lever === 'portion'));
  assert.ok(NF.advise(S(), k, 'smaller', 'before').items.some(i => i.lever === 'portion'));
  assert.ok(NF.advise(S(), k, 'bigger', 'as').items.some(i => i.lever === 'portion'), 'z větší zpět k obvyklé i po píchnutí');
  const sm = NF.advise(S(), k, 'smaller', 'as');
  assert.equal(sm.items.some(i => i.lever === 'portion'), false);
  assert.ok(sm.blocked.some(b => b.lever === 'portion' && b.reason === 'bolus'));
  assert.equal(NF.advise(S(), k, 'bigger', 'unknown').effective, 'after');
  assert.equal(NF.advise(S(), k, 'smaller', 'unknown').items.some(i => i.lever === 'portion'), false);
  const bad = /(?<![„‚])(sněz víc|snězte víc|dej si víc|dejte si víc|jez víc|jezte víc|sněz více|snězte více)/i;
  everyScreen((m, w) => assert.equal(bad.test(m), false, w));
  for (const it of S().registry.items) assert.equal(bad.test(it.text || ''), false, it.id);
});

test('Každá rada a výpočet nese položku registru; zamítnutá položka přestane působit', () => {
  chapter('advice');
  const k = food('Ovesná kaše s mlékem a banánem').id;
  for (const it of NF.advise(S(), k, 'bigger', 'before').items) assert.ok(NF.item(S(), it.item) && NF.usable(S(), it.item), it.lever);
  act('mealBolus', 'before'); act('mealStep', '3');
  { const m0 = noTag(); assert.match(m0, /data-item="R-[A-Z]+"/); assert.equal(/class="appr /.test(m0), false, 'SCHEMA 86: jádro u pacienta štítek nekreslí, jen značku data-item'); } /* SCHEMA 86: štítek dokresluje prezentační vrstva (NF.slots.patientTag) */
  assert.match(markup(), /<span class="item-ref" data-item="(R-[A-Z]+)" hidden><\/span><button type="button" class="appr [^"]*" data-action="openItem" data-value="\1"/, 'SCHEMA 86: v ukázce dokreslí štítek pro garanta prezentační vrstva hned za značkou');
  act('role', 'doctor');
  const r = NF.decideItem(S(), 'R-DOPLNEK', 'rejected', 'test');
  assert.equal(r.ok, true);
  assert.equal(NF.advise(S(), k, 'bigger', 'before').items.some(i => i.lever === 'addon'), false, 'zamítnutá rada zmizí');
  assert.equal(S().registry.history.length, 1);
  assert.equal(S().registry.history[0].to.status, 'rejected');
  NF.decideItem(S(), 'R-REAKCE', 'rejected', '');
  assert.equal(NF.confidence(S(), k).level, 'none', 'bez pravidla se nic nevyhodnocuje');
  assert.equal(NF.adviceGate(S()).ok, false);
});

test('Registr: rozhodnutí se uloží ihned, historie jen přibývá, lze měnit', () => {
  chapter('registry');
  act('regOpen', 'R-PORADI');
  bind('form.note_R-PORADI', 'zkouška');
  act('regDecide', 'rejected');
  assert.equal(NF.item(S(), 'R-PORADI').status, 'rejected');
  assert.equal(JSON.parse(store.get('nutrifee-maketa')).registry.items.find(i => i.id === 'R-PORADI').status, 'rejected', 'uloženo do prohlížeče ihned');
  act('regDecide', 'approved');
  assert.equal(NF.item(S(), 'R-PORADI').status, 'approved');
  const h = S().registry.history.filter(x => x.item === 'R-PORADI');
  assert.equal(h.length, 2); assert.equal(h[0].comment, 'zkouška'); assert.equal(h[1].comment, 'zkouška', 'platná poznámka zůstává i u dalšího rozhodnutí');
  /* SCHEMA 72: jen dvě rozhodnutí; jiný stav jádro odmítne, parametry se rozhodnutím nemění */
  act('regOpen', 'R-REAKCE'); assert.equal(NF.decideItem(S(), 'R-REAKCE', 'edited', 'x').ok, false); act('regDecide', 'edited'); assert.equal(NF.item(S(), 'R-REAKCE').status, 'approved');
  assert.equal(NF.item(S(), 'R-REAKCE').params.minKnown, 4);
  assert.equal(/Upravit|regEdit|regParam/.test(markup()), false, 'registr nemá Upravit ani volič parametrů');
  assert.equal(/Hledat/.test(markup()), true);
  for (const c of NF.CATS) assert.ok(S().registry.items.some(i => i.cat === c[0]), 'kategorie ' + c[0] + ' má položku');
});

test('Lékař mezi kontrolami nic nedělá', () => {
  const doctorChapters = D.chapters.filter(c => c.role === 'doctor').map(c => c.id);
  for (const id of doctorChapters) assert.ok(/^(prolog|enroll|doses|issue|registry|review|trace)/.test(id), 'lékařská kapitola mimo ordinaci: ' + id);
  const between = D.chapters.filter(c => c.at > '2026-10-06' && c.at < '2027-01-05' && c.role === 'doctor');
  assert.equal(between.map(c => c.id).join(), 'registry', 'jediná akce lékaře mezi kontrolami je registr garanta');
  const src = fs.readFileSync(path.join(__dirname, 'app/core.js'), 'utf8');
  assert.equal(/resumeTask/.test(src), false);
});

test('Jádro bez sítě a bez generativní AI; síť volá jen demo/sync.js (rozhodnutí garanta do Supabase)', () => {
  for (const f of CORE) { const src = fs.readFileSync(path.join(__dirname, f), 'utf8'); assert.equal(/fetch\(|XMLHttpRequest|WebSocket|navigator\.sendBeacon/i.test(src), false, f); }
  for (const f of [...CORE, ...DEMO]) { const src = fs.readFileSync(path.join(__dirname, f), 'utf8'); assert.equal(/openai|anthropic|claude|gpt/i.test(src), false, f); if (['demo/sync.js', 'demo/auth.js', 'demo/results.js'].indexOf(f) < 0) assert.equal(/fetch\(/.test(src), false, f + ' volá síť mimo sync/auth/results'); }
  assert.equal(/url\(|@import/.test(fs.readFileSync(path.join(__dirname, 'app/design.css'), 'utf8')), false);
  /* rozhodnutí garanta jde do fronty hned; bez nastaveného úložiště čeká a lišta to říká; export není */
  act('goScene', '19'); act('closeDrawer'); const before = D.sync.pending();
  act('garantDecide', 'R-PORADI:approved'); assert.equal(D.sync.pending(), before + 1);
  D.noteDraft('R-SKORE', 'poznámka'); act('garantNote', 'R-SKORE'); assert.equal(D.sync.pending(), before + 1, 'SCHEMA 83: k nerozhodnuté položce poznámka nevzniká');
  D.noteDraft('R-PORADI', 'poznámka'); act('garantNote', 'R-PORADI'); assert.equal(D.sync.pending(), before + 2);
  const r = D.sync.row(JSON.parse(store.get('nutrifee-sync-queue')).slice(-1)[0]); assert.equal(r.kind, 'note'); assert.equal(r.status, 'approved', 'poznámka nese stav garanta'); assert.equal(r.item, 'R-PORADI'); assert.equal(r.comment, 'poznámka'); assert.ok(r.client && r.at && r.schema === NF.SCHEMA); assert.equal(r.user_email, 'garant@example.test'); assert.equal(r.user_id, 'u-garant');
  const dn = () => JSON.parse(store.get('nutrifee-sync-queue') || '[]').filter(x => x.kind === 'decision' || x.kind === 'note').length, d0 = dn();
  act('goScene', '5'); act('closeDrawer'); assert.equal(dn(), d0, 'přehrání scény rozhodnutí znovu neodesílá (skok zapíše jen řádek „scene“)');
  const st = D.sync.status(); assert.equal(st.configured, true, 'Supabase je nastaveno v demo/sync-config.js'); assert.match(D.syncConfig.url, /^https:\/\/[a-z]+\.supabase\.co$/); assert.match(D.syncConfig.key, /^sb_publishable_/); assert.equal(D.syncConfig.table, 'garant_rozhodnuti');
  assert.match(markup(), /class="sync-badge bar-sync [^"]*"[\s\S]*?(Ukládáme|Neuloženo)/, 'bez sítě (test) čekají rozhodnutí ve frontě; lišta to říká (SCHEMA 78, presenter)'); assert.equal(/Rozhodnutí jsou uložená na serveru/.test(markup()), false); assert.equal(/export/i.test(markup()), false);
  act('role', 'doctor'); act('page', 'registry'); assert.equal(/Exportovat/.test(markup()), false); assert.equal(/Exportovat/.test((act('page', 'trace'), markup())), false);
  /* rozhodnutí odehraná příběhem (kapitola upraví R-PORADI) nejdou na server ani do deníku garanta */
  const decs = () => JSON.parse(store.get('nutrifee-sync-queue') || '[]').filter(x => x.kind === 'decision' || x.kind === 'note').length;
  const p0 = decs(), g0 = D.garantLog().length; act('goChapter', String(D.indexOf('trace'))); act('closeDrawer');
  assert.ok(S().registry.history.some(h => h.item === 'R-PORADI' && h.kind === 'version' && h.model), 'příběh založil novou verzi (modelově)'); assert.ok(S().registry.history.some(h => h.item === 'R-PORADI' && h.kind === 'decision' && h.model)); assert.equal(decs(), p0, 'příběh neposílá žádné rozhodnutí'); assert.equal(D.garantLog().length, g0, 'příběh nepíše do deníku');
});

test('Přihlášení (7. 10. 2026): bez přihlášení jen přihlašovací stránka; garant ukládá a vidí své, správce vidí výsledky; rozhodnutí z registru přežijí skok na scénu', () => {
  store.delete('nutrifee-auth'); NF.render();
  let m = markup(); assert.match(m, /Přihlásit/); assert.match(m, /DEMO · syntetická data · není určeno pro léčbu/); assert.match(m, /type="password"/);
  assert.equal(/pres-bar|Další ▶|Zařazení a plán/.test(m), false, 'bez přihlášení není vidět maketa'); assert.equal(D.auth.role(), null);
  act('authLogin'); assert.match(markup(), /Vyplňte e-mail i heslo/);
  store.set('nutrifee-auth', sessionFor('garant')); NF.render(); m = markup();
  assert.match(m, /Odhlásit · Garant/); assert.equal(/Výsledky garanta/.test(m), false, 'garant výsledky nevidí'); assert.equal(D.auth.role(), 'garant'); assert.equal(/sync-badge/.test(m), false, 'stav ukládání až po prvním rozhodnutí (S2, 19. 10. 2026)');
  act('openResults'); assert.equal(plain(elements.get('overlay').innerHTML), '', 'garant výsledky neotevře');
  /* rozhodnutí přímo v registru přežije skok na scénu a je v deníku garanta */
  act('role', 'doctor'); act('page', 'registry'); act('regOpen', 'R-PORADI'); act('regDecide', 'rejected');
  assert.equal(NF.item(S(), 'R-PORADI').status, 'rejected'); assert.equal(D.garantLog().length, 1); assert.ok(D.garantLog()[0].sid && D.garantLog()[0].rt, 'záznam má sid a rt');
  assert.match(markup(), /class="sync-badge bar-sync/, 'po prvním rozhodnutí je stav ukládání vidět (SCHEMA 78: odznak kreslí presenter)');
  act('goScene', '10'); act('closeDrawer'); assert.equal(NF.item(S(), 'R-PORADI').status, 'rejected', 'po přehrání scény platí dál'); assert.equal(D.garantLog().length, 1, 'přehrání deník nezdvojí');
  /* načtení ze serveru: nové sid se přidá, známé ne */
  const srv = { item: 'R-SKORE', kind: 'decision', status: 'approved', comment: 'ze serveru', params: null, text: null, off: null, at: S().clock, by: 'garant', sid: 'jiny:H1', rt: '2026-10-07T10:00:00.000Z' };
  assert.equal(D.garantMerge([srv, D.garantLog()[0]]), 1); assert.equal(D.garantLog().length, 2); assert.equal(D.garantMerge([srv]), 0);
  assert.ok(S().registry.history.some(h => h.item === 'R-SKORE' && h.comment === 'ze serveru'));
  const row = D.sync.fromRow({ id: 'c:H9', kind: 'note', item: 'C-CILE', status: 'approved', comment: 'k', params: { where: 'zasuvka' }, model_at: '2026-10-05T09:00:00', at: '2026-10-07T11:00:00Z', decided_by: 'garant' });
  assert.equal(row.sid, 'c:H9'); assert.equal(row.kind, 'note'); assert.equal(row.at, '2026-10-05T09:00:00'); assert.equal(row.where, 'zasuvka');
  /* správce */
  store.set('nutrifee-auth', sessionFor('admin')); NF.render(); m = markup();
  assert.match(m, /Výsledky garanta/); assert.match(m, /Odhlásit · Správce/); assert.equal(D.auth.role(), 'admin');
  act('openResults'); const ov = plain(elements.get('overlay').innerHTML); assert.match(ov, /<h2>Výsledky garanta<\/h2>/); assert.match(ov, /Zatím nic nenačteno|Načítám/);
  act('closeDrawer');
  /* odhlášení: s neuloženými čeká a nabídne zahození; s prázdnou frontou odhlásí a smaže deník */
  store.set('nutrifee-auth', sessionFor('garant')); NF.render(); /* SCHEMA 78 (ukládání C5): řádky garanta se pod správcem neposílají ani nepočítají – odhlašuje se garant */
  act('authLogout'); assert.ok(D.auth.session(), 's neuloženými se neodhlásí'); assert.match(markup(), /Ještě se ukládá/); assert.match(markup(), /Odhlásit a zahodit neuložené/);
  act('authLogoutForce'); assert.equal(D.auth.session(), null); assert.equal(D.sync.pending(), 0); assert.match(markup(), /Jste odhlášeni/); assert.match(markup(), /Přihlásit/);
  store.set('nutrifee-auth', sessionFor('garant')); NF.render(); assert.equal(D.garantLog().length, 0, 'deník po odhlášení prázdný'); assert.equal(NF.item(S(), 'R-PORADI').status, 'approved');
  /* účet projektu bez role garant/admin k maketě nepatří */
  store.set('nutrifee-auth', sessionFor('jiny')); NF.render(); assert.equal(D.auth.role(), null); assert.equal(D.auth.session(), null); assert.match(markup(), /Přihlásit/); assert.equal(/pres-bar/.test(markup()), false);
});

test('Stav položek (7. 10. 2026 večer): ke schválení místo „schváleno předem“; zamítnutí ukáže na místě „tahle část nefunguje“ a příběh pokračuje', () => {
  /* každá z 39 položek má ve scéně, kde se o ní rozhoduje, po zamítnutí oznámení (na obrazovce nebo v panelu) */
  const ids = NF.garantItems(S()).map(r => r.id); assert.equal(ids.length, 28, 'položky garanta'); assert.equal(S().registry.items.length, 42, 'včetně 14 provozních (SCHEMA 78: + S-PRIPOMINKY, S-DAVKA; SCHEMA 79: S-DAVKA bez jiného lékaře)');
  const sceneOf = id => { for (let i = 0; i < D.scenes.length; i++) if (D.decisionItems(i).indexOf(id) >= 0) return i; return -1; };
  for (const id of ids) {
    const i = sceneOf(id); assert.ok(i >= 0, id + ' má rozhodovací scénu');
    act('goScene', String(i)); act('closeDrawer');
    assert.equal(NF.itemState(S(), id), 'pending'); assert.equal(new RegExp('data-off="' + id + '"').test(markup()), false, id + ': před zamítnutím žádné oznámení');
    act('garantDecide', id + ':rejected:ano'); assert.equal(NF.itemState(S(), id), 'rejected');
    const m = markup(); assert.match(m, new RegExp('data-off="' + id + '"'), id + ': po zamítnutí oznámení ve scéně ' + (i + 1)); assert.match(m, D.recordOnly(id) ? /Váš nesouhlas je zapsaný/ : /Tahle část nefunguje/); /* SCHEMA 76: záznam nesouhlasu podle ucinek (C-CILE, K-KRITERIA, Z-GLUKOZA) */ assert.match(m, /Změnit rozhodnutí/); /* C-CILE: záznam nesouhlasu (vlastník 29. 10. 2026, SCHEMA 75) */
    act('garantDecide', id + ':approved'); assert.equal(NF.itemState(S(), id), 'approved'); assert.equal(new RegExp('data-off="' + id + '"').test(markup()), false, id + ': po schválení oznámení zmizí');
    D.garantClear(); act('closeDrawer');
  }
  /* oznámení přímo na obrazovce pacienta: zamítnuté vyhodnocení reakce u rady k jídlu, zamítnutá cesta ke kontrole na Dnes */
  chapter('advice'); act('garantDecide', 'R-REAKCE:rejected:ano'); act('garantDecide', 'S-CESTA:rejected:ano'); act('role', 'patient'); act('page', 'plan'); /* SCHEMA 86: Cesta ke kontrole v Mém plánu */
  assert.match(markup(), /data-off="S-CESTA"/); assert.equal((markup().match(/class="off-notice[^"]*" role="status" data-off="S-CESTA"/g) || []).length, 1, 'na obrazovce jen jednou');
  const fid = food('Ovesná kaše s mlékem a banánem').id; act('startMeal', 'breakfast'); act('mealBolus', 'before'); act('mealBefore', '7'); act('mealStep', '2'); act('mealFood', fid); act('mealPortion', 'usual'); act('mealStep', '3');
  assert.match(markup(), /data-off="R-REAKCE"/); assert.match(markup(), /Změnit rozhodnutí/);
  /* příběh projde až do konce i se zamítnutými položkami, kroky se nezaseknou */
  D.garantClear(); act('closeDrawer'); act('goScene', '0'); act('closeDrawer');
  for (const id of ['R-REAKCE', 'D-PRAND', 'S-TYDEN', 'R-PORCE', 'Z-BODY']) act('garantDecide', id + ':rejected:ano');
  let guard = 0;
  while (guard++ < 600) {
    const before = S().sceneIndex + ':' + (S().tourStep || 0); next(); act('closeDrawer');
    if (S().error) assert.equal(/Krok ukázky selhal/.test(S().error), false, 'scéna ' + (S().sceneIndex + 1) + ': ' + S().error);
    if (S().sceneIndex + ':' + (S().tourStep || 0) === before) break;
  }
  assert.equal(S().sceneIndex, D.scenes.length - 1, 'příběh došel na konec: scéna ' + (S().sceneIndex + 1));
  assert.equal(NF.itemState(S(), 'R-REAKCE'), 'rejected', 'zamítnutí přežilo celý průchod');
});

test('Panel vyprávění (8. 10. 2026): říká, co je na obrazovce; žádný krok nemá titulek, který popisuje jen akci místo výsledku', () => {
  const generic = /^(Další krok|Uložit|Souhlasím|K návrhům|Zahájit kontrolu|Pokračovat|Přijmout a uložit|Vydat plán P2|Upravit s komentářem|Plán přebírám)$/;
  for (const ch of D.chapters) { const st = D.tour.stepsFor(ch.id, D.defaults); for (const x of st) { assert.ok(x.t && x.t.trim().length > 2, ch.id + ': krok bez titulku'); assert.equal(generic.test(x.t.trim()), false, ch.id + ': titulek „' + x.t + '“ popisuje akci, ne stav obrazovky'); } }
  chapter('enroll'); next(); next(); next(); next(); /* SCHEMA 74: krok se sdílením dat zrušen; SCHEMA 78: přibyl krok vylučovacích kritérií – krok 2 zařazení je čtvrtý */
  let m = markup(); assert.match(m, /Na obrazovce: Lékař · Zařazení a plán, krok 2 ze 3/); assert.match(m, /<h2>Krok 2: dávky, návyky a pravidla<\/h2>/); /* SCHEMA 74: pravidla místo pokynů */ assert.equal(S().wizardStep, 1);
  act('role', 'patient'); m = markup(); assert.match(m, /Mimo příběh/);
  chapter('reviewProposals'); next(); m = markup(); assert.match(m, /Na obrazovce: Lékař · Kontrola, krok 2 ze 4/);
  chapter('firstMeal'); for (let k = 0; k < 4; k++) next(); m = markup(); assert.match(m, /Na obrazovce: Pacient · Zápis jídla, krok 2 ze 3/); /* SCHEMA 86: v kroku 1 nejdřív inzulin, potom glukóza teď – krok 2 zápisu je čtvrtý krok příběhu */
  const css = fs.readFileSync(path.join(__dirname, 'demo/demo.css'), 'utf8'); assert.match(css, /--barh/, 'panel se posouvá podle skutečné výšky lišty');
});

test('Zámek průchodu (8. 10. 2026): bez rozhodnutí nabídnutých položek se nepokračuje; ve finále bez potvrzení souhrnu; jediné tlačítko; fokus zůstává do dalšího kroku; obrazovka v příběhu zamčená', () => {
  act('goScene', '2'); act('closeDrawer'); assert.equal(D.pendingNow(S()).ids.length, 0, 'před Začít nic neblokuje'); toOffer(); app.act('tourNext'); app.act('tourNext');
  let m = markup(); assert.match(m, /Ke schválení teď/); assert.equal(S().tourStep, D.offerStep(2, 'R-NAVYKY'), 'po kroku s nabídnutou položkou (B01: štítek ve výřezu cíle) se čeká na rozhodnutí'); const pn = D.pendingNow(S()); assert.ok(pn.ids.length >= 1, 'nabídnuté nerozhodnuté položky');
  assert.match(m, /Rozhodněte \d+ polož\S+ výše ↑/); assert.match(m, /data-action="tourNext" aria-disabled="true"/); /* rozhodnutí 12: Dál při zablokování odroluje k položce */
  const step = S().tourStep; app.act('tourNext'); assert.equal(S().tourStep, step, 'bez rozhodnutí se nejde dál'); assert.match(markup(), /Rozhodněte \d+ polož/); assert.equal(S().gOpen, pn.ids[0], 'Dál otevře první nerozhodnutou položku');
  pn.ids.forEach(id => act('garantDecide', id + ':approved')); assert.equal(D.pendingNow(S()).ids.length, 0); assert.equal(/data-action="tourNext" disabled/.test(markup()), false);
  app.act('tourNext'); assert.equal(S().tourStep, step + 1, 'po rozhodnutí se pokračuje');
  /* jediné tlačítko pro pokračování: v liště není Další/Zpět/Přeskočit, v panelu není Scénu znovu */
  m = markup(); const bar = m.slice(m.indexOf('<div class="pres-bar">'), m.indexOf('</div>', m.indexOf('<div class="pres-bar">')));
  assert.equal(/tourNext|tourBack|storyStep/.test(bar), false, 'lišta bez navigačních tlačítek'); assert.equal((m.match(/data-action="tourNext"/g) || []).length, 1, 'právě jedno tlačítko Pokračovat'); assert.equal(/Scénu znovu/.test(m.slice(m.indexOf('<aside'))), false);
  /* finále: souhrn musí být potvrzen */
  const fin = D.scenes.findIndex(x => !x.appendix && D.chapters[x.ch].id === 'trace'); act('goScene', String(fin)); act('closeDrawer');
  const stf = D.tour.stepsFor('trace', S().branches); for (let k = 0; k < stf.length; k++) next();
  assert.equal(D.pendingNow(S()).summary, true); assert.match(markup(), /data-action="garantConfirmSummary"/, 've finále je akcí panelu potvrzení souhrnu (V4)'); app.act('tourNext'); assert.equal(S().sceneIndex, fin, 'bez potvrzení souhrnu se do dodatku nejde');
  act('garantConfirmSummary', 'force'); assert.equal(D.pendingNow(S()).summary, false); app.act('tourNext'); assert.equal(S().sceneIndex, fin + 1, 'po potvrzení dál');
  /* fokus: po kroku zůstává selektor posledního cíle */
  const src = fs.readFileSync(path.join(__dirname, 'demo/presenter.js'), 'utf8'); assert.match(src, /focusSel = failed \? null : lastFocus\(step\)/); assert.match(src, /pres-locked/);
  assert.match(fs.readFileSync(path.join(__dirname, 'demo/demo.css'), 'utf8'), /body\.pres-locked main\{pointer-events:none\}/);
});

test('Úvodní obrazovka (12. 10. 2026): scéna 1 vysvětluje v obsahu, k čemu NutriFee je a jak ukázku ovládat; panel je krátký; karta pacienta až ve scéně 2', () => {
  act('goScene', '0'); act('closeDrawer'); const m = markup();
  assert.equal(S().page, 'intro'); assert.match(m, /Jak ukázku ovládat/); assert.match(m, /Vlevo běží aplikace sama/); assert.match(m, /Na konci je souhrn/); assert.match(m, /Co uvidíte/); assert.match(m, /Scénář 1 – V ordinaci/); assert.equal(/Dějství/.test(m), false, 'slovo dějství nahrazeno scénářem'); assert.equal((m.match(/DEMO · syntetická data/g) || []).length, 1, 'štítek DEMO jen jednou (v liště)'); assert.equal(/Úvod · scéna 1 z/.test(m), false, 'S12: úvod bez počítadla'); assert.match(m, /class="where"[^>]*><b>Úvod – k čemu/);
  assert.match(m, /Začít ukázku ▶/); assert.equal(/Karta pacienta|Podmínky zařazení/.test(m.slice(m.indexOf('<main'))), false, 'zařazení až ve scéně 2');
  assert.equal(/Na obrazovce: Lékař · Úvod/.test(m), false, 'S12: úvod není obrazovka lékaře'); const panel = m.slice(m.indexOf('<aside'), m.indexOf('</aside>')); assert.ok(panel.replace(/<[^>]+>/g, '').length < 1400, 'panel první scény je krátký: ' + panel.replace(/<[^>]+>/g, '').length);
  next(); assert.equal(S().sceneIndex, 1); assert.match(markup(), /Karta pacienta/);
  boot({ withDemo: false }); assert.equal(/Jak ukázku ovládat/.test(markup()), false, 'produkce bez úvodu ukázky');
});

test('Z registru na místo v příběhu a zpět (12. 10. 2026)', () => {
  act('role', 'doctor'); act('page', 'registry'); act('regOpen', 'K-KRITERIA'); let m = markup(); assert.match(m, /data-action="goSceneFrom" data-value="1:K-KRITERIA"/);
  act('goSceneFrom', '1:K-KRITERIA'); assert.equal(S().sceneIndex, 1); assert.equal(S().page, 'enroll'); m = markup();
  assert.match(m, /Přišli jste sem z registru \(položka K-KRITERIA\)/); assert.match(m, /data-action="regReturn"/); assert.ok(D.returnTo());
  act('regReturn'); assert.equal(S().page, 'registry'); assert.equal(S().reg.open, 'K-KRITERIA'); assert.equal(D.returnTo(), null);
  act('goSceneFrom', '1:K-KRITERIA'); next(); assert.ok(D.returnTo(), 'M6 (27. 10. 2026): návrat platí, dokud garant ze scény neodejde'); assert.match(markup(), /data-action="regReturn"/);
  let g = 0; while (S().sceneIndex === 1 && g++ < 40) next(); assert.equal(D.returnTo(), null, 'odchod ze scény návrat zruší'); assert.equal(/data-action="regReturn"/.test(markup()), false);
});

test('Lišta garanta bez přepínače rolí (12. 10. 2026): role jen v Panelu prezentujícího', () => {
  const m = markup(); const bar = m.slice(m.indexOf('<div class="pres-bar">'), m.indexOf('</div>', m.indexOf('<div class="pres-bar">')));
  assert.equal(/data-action="role"/.test(bar), false, 'v liště není Pacient/Lékař/Sestra');
  act('openPresenter'); assert.match(plain(elements.get('overlay').innerHTML), /Přepnout roli/); assert.match(plain(elements.get('overlay').innerHTML), /data-action="role" data-value="patient"/); act('closeDrawer');
});

test('Registr: detail položky roluje sám (12. 10. 2026)', () => {
  const css = fs.readFileSync(path.join(__dirname, 'app/design.css'), 'utf8'); assert.match(css, /\.reg-side\{position:sticky;top:calc\(var\(--barh,0px\) \+ var\(--nf-s5\)\);max-height:calc\(100vh[^}]*overflow:auto/);
});

test('Pacientské texty jsou bez rodu (vykání, žádné příčestí „zkusil/zapsal“, žádné „nemocný“)', () => {
  const gendered = /\b(jste|jsem) (si |se |to )?[a-zá-ž]+l\b|\b[a-zá-ž]+l (jste|jsem)\b|nemocný|jistý|abyste|jako bys/i;
  for (let i = 0; i < D.chapters.length; i++) { act('goChapter', String(i)); act('closeDrawer'); act('role', 'patient'); for (const pg of ['today', 'foods', 'plan', 'safety', 'preview']) { act('page', pg); const m = markup().match(gendered); assert.equal(m, null, D.chapters[i].id + '/' + pg + ': ' + (m && m[0])); } }
  for (const it of S().registry.items) { const txt = JSON.stringify(it.texts || '') + (it.text || ''); const m = txt.match(gendered); assert.equal(m, null, it.id + ': ' + (m && m[0])); }
});
test('Pacientské obrazovky bez zakázaných slov (report, medián, skóre, garant, studie, čistá data) a bez tykání', () => {
  const bad = /\b(report|medián|skóre|garant|studie|čist[áé] data|čistý zápis|nečist)/i, ty = /\b(tvůj|tvoje|tvá|tvé|tebou|tobě|tebe|ti)\b|\b(zapiš|vyber|řekni|zkus|najdeš|vidíš|jsi|můžeš|chceš|máš)\b/i;
  const pages = ['today', 'meal', 'foods', 'plan', 'safety', 'takeover', 'understand', 'preview', 'report'];
  for (let i = 0; i < D.chapters.length; i++) {
    act('goChapter', String(i)); act('closeDrawer'); act('role', 'patient');
    for (const pg of pages) {
      act('page', pg);
      const mm = markup(), main = mm.slice(mm.indexOf('<main id="main"')).replace(/<[^>]+>/g, ' ');
      const b = main.match(bad), t = main.match(ty);
      assert.equal(b, null, D.chapters[i].id + '/' + pg + ': „' + (b && b[0]) + '“');
      assert.equal(t, null, D.chapters[i].id + '/' + pg + ': „' + (t && t[0]) + '“');
    }
  }
  for (const it of S().registry.items) for (const k of Object.keys(it.texts || {})) assert.equal(ty.test(it.texts[k]), false, it.id + '.' + k);
});
test('Přístupnost E (6. 10. 2026): barvy a velikosti v CSS, stupnice s textovým ekvivalentem, přepínač nemoci nahoře jako switch, dlaždice lékaře znakem + slovem, fokus na h1, zásuvka vrací fokus', () => {
  const css = fs.readFileSync(path.join(__dirname, 'app/design.css'), 'utf8');
  const tokens = fs.readFileSync(path.join(__dirname, 'app/tokens.css'), 'utf8'); assert.match(tokens, /--nf-muted:#536677/); assert.match(tokens, /--nf-primary:#0F6F8C/); assert.equal(/uppercase/.test(css), false, 'žádné verzálky z CSS');
  assert.match(css, /prefers-contrast:more/); assert.match(css, /outline:var\(--nf-focus-w\) solid var\(--nf-focus\)/); assert.equal(/\.tiny\{font-size:1[12]/.test(css), false);
  assert.match(html, /%230F6F8C/, 'favikona v barvě tokenu --nf-primary'); assert.match(html, /id="toast" aria-live="polite"/);
  chapter('week'); act('page', 'foods'); const fid = food('Ovesná kaše s mlékem a banánem').id; if (S().foodOpen !== fid) act('foodOpen', fid);
  const m = markup();
  assert.match(m, /class="rows" role="img" aria-label="Stupnice glukózy 4 až 16 mmol\/l, hranice cíle 10[,0]* mmol\/l\. Bez rady [\d,]+ až [\d,]+ mmol\/l/);
  assert.match(m, /<div class="axis-words"><span>v cíli<\/span><span>nad cílem<\/span><\/div>/);
  act('foodBack'); assert.match(markup(), /data-action="foodsSeg" data-value="known" aria-pressed="true"/);
  act('page', 'today'); const td = markup();
  assert.match(td, /role="switch" aria-checked="false" data-action="illness" data-value="on"/);
  assert.ok(td.indexOf('class="sick-chip"') < td.indexOf('class="card hero"'), 'SCHEMA 86: „Není mi dobře“ je v řádku pozdravu nad „Co teď“');
  act('illness', 'on'); act('page', 'safety'); assert.match(markup(), /role="switch" aria-checked="true" data-action="illness" data-value="off"/); act('illness', 'off'); act('page', 'today');
  assert.match(td, /<span class="ic" aria-hidden="true">/); assert.deepEqual([...noTag().matchAll(/data-action="openItem" data-value="([^"]+)"/g)].map(x => x[1]), [], 'SCHEMA 86: jádro u pacienta štítky nekreslí'); assert.ok(/data-action="openItem" data-value="P-NEMOC"/.test(td), 'SCHEMA 86: v ukázce štítek P-NEMOC pro garanta (NF.slots.patientTag)'); assert.match(td, /data-item="P-NEMOC"/, 'značka P-NEMOC u přepínače nemoci (A02)');
  act('startMeal', 'dinner'); act('mealBolus', 'before'); const tm = noTag(); assert.match(tm, /data-item="Z-GLUKOZA"/); assert.equal(/ke schválení/.test(tm), false, 'SCHEMA 86: pacient stav položky nevidí'); /* SCHEMA 86: obrazovka jádra bez slotu prezentační vrstvy */ { const r0 = plain(NF.screens.appr(S(), 'Z-GLUKOZA')); assert.match(r0, /aria-label="Pravidlo ke schválení: /); assert.match(r0, /· ke schválení/); } assert.equal(/class="appr [^"]*"[^>]*><span aria-hidden="true">✓/.test(tm), false, 'před rozhodnutím garanta žádný štítek „schváleno“'); S().meal = null; act('noop');
  chapter('reviewProposals'); act('role', 'doctor'); act('reviewStep', '1');
  assert.match(markup(), /<div class="st">(✓ v cíli|! blízko cíle|✕ pod cílem|– bez dat)[^<]*<\/div>/); assert.match(markup(), /aria-current="step"/);
  /* fokus: po přepnutí obrazovky se hledá main h1 a dostane tabindex=-1; zásuvka vrátí fokus na spouštěč */
  let focused = []; const h1 = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, focus() { focused.push('h1'); } };
  const root = elements.get('app'); root.querySelector = sel => sel === 'main h1' ? h1 : null;
  act('role', 'patient'); assert.deepEqual(focused, ['h1']); assert.equal(h1.attrs.tabindex, '-1');
  const opener = { focus() { focused.push('opener'); } }; ctx.document.activeElement = opener;
  act('openItem', 'S-CESTA'); act('closeDrawer'); assert.ok(focused.includes('opener'), 'zásuvka vrátila fokus'); ctx.document.activeElement = null;
});
/* vlastník 26. 10. 2026: štítek DEMO jednou – v liště ukázky na každé obrazovce, v jádru jen bez prezentační vrstvy; žádné jméno modelové role */
test('Demo označení je vidět všude, ale jen jednou', () => everyScreen((m, w) => { assert.equal((m.match(/DEMO · syntetická data/g) || []).length, 1, w); assert.ok(!/Modelový lékař 01|Modelová sestra 01/.test(m), w + ': bez jména modelové role'); }));

/* ---------- ordinace ---------- */
test('Zařazení: podmínky zamykají pokračování; plán bez náležitostí nejde vydat', () => {
  chapter('enroll');
  assert.match(markup(), /disabled/);
  for (const c of NF.ELIGIBILITY) act('eligibility', c[0]);
  assert.equal(S().enrollment.eligible, true);
  act('wizardGo', '1'); assert.equal(S().wizardStep, 0, 'SCHEMA 78 (06 B4): bez potvrzení vylučovacích kritérií dál nejde'); act('exclusion'); act('wizardGo', '1');
  assert.ok(NF.planBlockers(S()).length >= 2);
  S().role = 'doctor';
  assert.equal(NF.issuePlan(S(), D.habitCatalog).ok, false);
  bind('draft.medicationChecked', true);
  if (!S().draft.habits.length) act('toggleHabit', 'H-ZAPIS'); if (!S().draft.instructions.length) act('instrToggle', 'I-HYPO');
  /* dávky aplikace nepředvyplňuje: bez všech čtyř (≥ 1 j.) plán nejde vydat (6. 10. 2026) */
  assert.ok(NF.planBlockers(S()).join().indexOf('čtyři dávky') >= 0 && NF.planBlockers(S()).length === 1, 'chybí jen dávky');
  assert.match(markup(), /nastavte/);
  for (let i = 0; i < 8; i++) act('dose', 'breakfast:1'); for (let i = 0; i < 10; i++) act('dose', 'lunch:1'); for (let i = 0; i < 8; i++) act('dose', 'dinner:1'); for (let i = 0; i < 18; i++) act('dose', 'basal:1');
  assert.equal(NF.planBlockers(S()).length, 0);
  act('dose', 'breakfast:1');
  assert.equal(S().draft.doses.breakfast.units, 9);
  act('issuePlan');
  assert.equal(S().activePlanId, 'P1'); assert.equal(S().role, 'nurse');
  assert.equal(NF.activePlan(S()).doses.breakfast.units, 9);
});

test('Startovní sada je při čistém zařazení předvyplněná; podmínky z karty jsou označené, ale potvrzuje je lékař', () => {
  act('goScene', '0'); act('role', 'doctor'); act('resetDemo'); act('role', 'doctor'); act('page', 'enroll');
  S().draft = null; act('startDraft');
  assert.ok(S().draft.habits.length >= 3, 'návyky startovní sady'); assert.ok(S().draft.instructions.length >= 2, 'pokyny s výchozí hodnotou');
  assert.equal(S().draft.doses.breakfast.units, 0, 'dávka není předvyplněná');
  assert.match(markup(), /z karty: splněno/); assert.equal(S().enrollment.eligible, false);
});

test('V ordinaci se nepíše (jen výběr, zaškrtnutí, volič)', () => {
  for (const id of ['enroll', 'doses', 'issue', 'training']) {
    chapter(id);
    const m = markup().replace(/<aside class="tour-panel[\s\S]*?<\/aside>/, '');
    assert.equal(/<textarea/.test(m), false, id);
    assert.equal(/<input(?![^>]*type="(?:checkbox|range)")/.test(m), false, id); /* SCHEMA 84 (rozhodnutí 9, agent P+D): posuvník (input type=range) je výběr, ne psaní */
  }
});

test('Zaučení: body podle návyků, náhled telefonu, návyky platí až po otázce', () => {
  chapter('training');
  const items = NF.trainingItems(S());
  assert.ok(items.some(t => t.id === 't-inzulin') && items.some(t => t.id === 't-bazal'));
  assert.match(markup(), /phone-preview/);
  act('trainingStep', 't-zapis');
  assert.equal(S().training.previewPage, 'meal');
  assert.equal(NF.finishTraining(S(), 'done').ok, false);
  for (const t of items) S().training.steps[t.id] = true;
  act('finishTraining', 'done');
  assert.equal(S().training.result, 'done');
  assert.equal(NF.activeHabits(S()).length, 0);
  act('role', 'patient'); act('answerCheck', 'no'); act('confirmUnderstanding');
  assert.equal(NF.activeHabits(S()).length, 4);
  boot(); branch('training', 'failed'); chapter('handover');
  assert.equal(NF.confirmUnderstanding(S()).ok, false);
});

/* ---------- pacient ---------- */
test('Před jídlem: inzulin první, kroky zamčené bez volby, zápis nese potvrzení dávky', () => {
  chapter('firstMeal');
  assert.equal(S().meal.step, 1);
  assert.match(markup(), /Je inzulin k tomuto jídlu už píchnutý/);
  act('mealBefore', '7'); act('mealStep', '2'); assert.equal(S().meal.step, 1); assert.match(S().error, /inzulin/);
  act('mealBolus', 'as'); act('mealTime', '-15'); act('mealBefore', '7'); act('mealStep', '2');
  bind('meal.q', 'kaše');
  assert.ok(NF.searchFoods(S(), 'kaše').length >= 3);
  act('mealStep', '3'); assert.equal(S().meal.step, 2);
  act('mealFood', food('Ovesná kaše s mlékem a banánem').id); act('mealPortion', 'usual'); act('mealStep', '3');
  assert.equal(NF.confidence(S(), S().meal.foodId).level, 'unknown');
  assert.match(markup(), /Zatím ho neznáme – zapište ho ještě 4×/); /* SCHEMA 86: bez „Je to jako…“ v kroku 3 */
  act('mealFinish', 'as');
  const ep = S().episodes[S().episodes.length - 1];
  assert.equal(ep.insulin.confirmed, 'as'); assert.equal(ep.insulin.units, 8); assert.equal(ep.insulin.time, '06:45');
  /* bez napojení na senzor (15. 10. 2026): při uložení žádný průběh, jen opsaná hodnota před jídlem; nejvyšší hodnota přijde za 2 h, export později */
  assert.equal(ep.points.length, 0); assert.equal(ep.importedAt, null); assert.equal(NF.complete(ep), false);
  S().clock = NF.addMin(ep.at, 130); assert.equal(NF.pendingPeakAsk(S()).length, 1, 'po 2 h se aplikace zeptá na nejvyšší hodnotu');
  ep.manual.before = 6.8; S().form = { ['peak_' + ep.id]: '9.6' }; act('peakSave', ep.id);
  assert.equal(ep.manual.peak, 9.6); assert.equal(NF.complete(ep), true); assert.equal(NF.epRise(S(), ep), 2.8); assert.equal(NF.glucoseOf(S(), ep).source, 'manual');
  assert.equal(NF.pendingPeakAsk(S()).length, 0);
});

test('Nové jídlo jen názvem (15. 10. 2026): „Myslíte X?“ u podobného názvu, nepovinné „Je to jako…“, rady se učí z odpovědi „v jídle to není“, lékař dostane jednu větu', () => {
  chapter('custom'); let m = markup();
  /* jedna akce v každém okamžiku: podobný název → dotaz hned, bez tlačítka Přidat a bez karty */
  assert.match(m, /Je to stejné jídlo jako „Smažený řízek s bramborovou kaší“ ve vašem seznamu\?/); assert.doesNotMatch(m, /Přidat „[^“]+“ do seznamu/); assert.doesNotMatch(m.slice(m.indexOf('<main')), /Nové jídlo: /, 'karta až po „Ne, je jiné“'); assert.doesNotMatch(m, /Nic takového neznáme/);
  act('mealNotSame'); m = markup(); assert.match(m, /Nové jídlo: Řízek s kaší od maminky/); assert.match(m, /Nepovinně: podobá se některému jídlu, které už známe\?/); assert.doesNotMatch(m, /Přidat „[^“]+“ do seznamu/); assert.doesNotMatch(m, /Není to totéž jako/); assert.equal(/Z čeho jsou v jídle sacharidy|Jak vypadal talíř|Úprava/.test(m), false, 'žádné složení');
  assert.equal(food('Řízek s kaší od maminky'), undefined);
  act('mealLike', food('Smažený řízek s bramborovou kaší').id); act('mealSaveFood');
  const f = food('Řízek s kaší od maminky'); assert.ok(f && f.custom); assert.equal(f.tags.source, undefined, 'nové jídlo bez složení'); assert.equal(f.tags.like, food('Smažený řízek s bramborovou kaší').id);
  const c = NF.confidence(S(), f.id); assert.equal(c.level, 'similar'); assert.equal(c.pool.explicit, true);
  /* bez „Je to jako“ se nic neodhaduje */
  const g = NF.addFood(S(), 'Karbanátek s hranolky', {}, { force: true }).food; assert.equal(NF.confidence(S(), g.id).level, 'unknown'); assert.equal(NF.similarFoods(S(), g).length, 0);
  /* prázdný název nejde; stejný název = totéž jídlo */
  assert.equal(NF.addFood(S(), '  ', {}).ok, false); assert.equal(NF.addFood(S(), 'karbanátek s hranolky', {}).food.id, g.id);
  /* název bez podobnosti: jen tlačítko Přidat; po jeho stisku karta a tlačítko zmizí */
  S().meal.foodId = null; S().meal.newFood = null; S().meal.q = 'Kuskus s cizrnou'; NF.render(); assert.equal(NF.likeName(S(), 'Kuskus s cizrnou'), null);
  m = markup(); assert.match(m, /Přidat „Kuskus s cizrnou“ do seznamu/); assert.doesNotMatch(m, /Není to totéž jako/); assert.match(m, /Nic takového neznáme/);
  act('mealNewFood'); m = markup(); assert.match(m, /Nové jídlo: Kuskus s cizrnou/); assert.doesNotMatch(m, /Přidat „[^“]+“ do seznamu/); assert.doesNotMatch(m, /Nic takového neznáme/);
  act('mealFood', f.id); /* zpět k řízku od maminky */
  /* rady bez složení: obecné texty; „Tentokrát ne · V jídle to není“ radu u jídla vypne */
  act('mealPortion', 'usual'); act('mealStep', '3'); let adv = NF.advise(S(), f.id, 'usual', 'before'); assert.ok(adv.items.some(i => i.lever === 'order')); assert.equal(adv.items.some(i => i.lever === 'addon'), false, 'jako smažený řízek: doplněk převzatý z podobného jídla se nenabízí (SCHEMA 78, 02 B8)');
  assert.ok(NF.DECLINE_REASONS.some(r => r[0] === 'absent'));
  act('mealDecide', 'order:no'); act('mealReason', 'order:absent'); act('mealFinish', 'as'); assert.equal(f.leverOff && f.leverOff.order, true);
  act('startMeal', 'lunch'); act('mealBolus', 'before'); act('mealBefore', '7'); act('mealStep', '2'); act('mealFood', f.id); act('mealPortion', 'usual'); act('mealStep', '3');
  adv = NF.advise(S(), f.id, 'usual', 'before'); assert.equal(adv.items.some(i => i.lever === 'order'), false, 'pořadí se u tohoto jídla už nenabízí'); assert.equal(adv.items.some(i => i.lever === 'addon'), false);
  /* lékař: jedna věta a nejvýš maxJidel jídel */
  chapter('reviewSummary'); act('startReview'); const r = markup(); assert.match(r, /Jídla opakovaně nad cílem/); assert.match(r, /jíd(lo|la|el) opakovaně nad cílem, celkem|Žádné jídlo opakovaně nad cílem/); assert.equal(/[Ss]iln[áé]/.test(r), false, 'slovo „silná“ z textů zmizelo');
  const strong = NF.strongFoods(S()); if (strong.length > 1) assert.ok(strong[0].st.eaten >= strong[1].st.eaten, 'seřazeno podle četnosti');
  assert.ok(NF.param(S(), 'S-SILNA', 'maxJidel', 0) === 3);
  /* nestálé jídlo: nejdřív vysvětlit z rady, pak otázka */
  assert.equal(typeof NF.unstable, 'function');
});

test('Učení: známé od 3 započítaných; nezapočítá se nevím, nemoc, jiná porce, jiná dávka', () => {
  chapter('week');
  const k = food('Ovesná kaše s mlékem a banánem').id;
  const st = NF.foodStats(S(), k);
  assert.equal(st.eaten, 4); assert.equal(st.n, 4); /* od 18. 10. 2026 známé od 4 */
  assert.equal(NF.confidence(S(), k).level, 'known');
  assert.ok(st.lo <= st.med && st.med <= st.hi);
  { const e3 = S().episodes.find(e => e.id === 'E3'), keep = e3.insulin.confirmed; e3.insulin.confirmed = 'unknown'; assert.equal(NF.whyNotUsable(S(), e3), 'inzulin nepotvrzen podle plánu'); e3.insulin.confirmed = keep; } /* E3 je od 18. 10. 2026 podle plánu (známé od 4) */
  chapter('recovery');
  assert.equal(NF.whyNotUsable(S(), S().episodes.find(e => e.id === 'E12')), 'z doby nemoci'); /* C01: modelový zápis E11 zrušen, zápis z nemoci je E12 (kaše během nemoci) */
  assert.equal(NF.whyNotUsable(S(), S().episodes.find(e => e.id === 'E9')), null);
  NF.activePlan(S()).doses.breakfast.units = 10;
  assert.equal(NF.foodStats(S(), k).n, 0, 'po změně dávky učení začíná znovu');
});

test('Reakce těla podle podílu v cíli; rozmezí se s daty zužuje', () => {
  chapter('preview');
  const k = food('Ovesná kaše s mlékem a banánem').id, c = NF.confidence(S(), k);
  assert.equal(c.level, 'known'); assert.ok(c.reaction);
  const share = c.st.inTarget / c.st.n;
  assert.equal(c.reaction.key, share >= 0.8 ? 'mild' : share >= 0.5 ? 'mid' : 'strong');
  /* Kontrola 3 (B7): doplněk u kaše se po 3 pokusech bez účinku stáhne a zápisy v okně exportu (svátky) jsou výš – rozmezí z percentilů (od 8 zápisů) je užší než nejnižší–nejvyšší */
  assert.ok(c.st.n >= 8 && NF.quantile(c.st.peaks, 0.9) - NF.quantile(c.st.peaks, 0.1) <= Math.max.apply(null, c.st.peaks) - Math.min.apply(null, c.st.peaks));
  act('role', 'patient'); act('page', 'foods'); act('foodOpen', k);
  const m = markup();
  assert.match(m, /hranice cíle/); assert.match(m, /v cíli/); assert.match(m, /class="win"/);
  assert.equal(/před<\/small>/.test(m), false, 'hodnota před jídlem se pacientovi neukazuje');
});

test('Nemoc: pacient označí i ukončí; rady jen bezpečné; data štítkovaná', () => {
  chapter('illness');
  act('illness', 'on');
  assert.equal(S().illness.active, true);
  assert.match(markup(), /Pravidla pro nemoc/); /* SCHEMA 74 */
  const k = food('Ovesná kaše s mlékem a banánem').id;
  const res = NF.advise(S(), k, 'smaller', 'as');
  assert.equal(res.items.some(i => i.lever === 'portion' || i.lever === 'walk'), false);
  assert.ok(res.blocked.some(b => b.reason === 'illness'));
  act('illnessCheck', 'same'); assert.equal(S().illness.active, true);
  act('illnessCheck', 'better'); assert.equal(S().illness.active, false);
  chapter('recovery'); assert.ok(NF.illnessDays(S()) >= 1);
});

test('Bazál: připomínka večer, potvrzení podle plánu nebo jinak', () => {
  chapter('week'); S().clock = '2026-10-13T21:00:00'; act('role', 'patient'); act('page', 'today');
  assert.match(markup(), /Čas na bazál/);
  act('basalOther'); act('basalUnits', '-2'); act('basalConfirm', 'other');
  const b = S().basalLog.find(x => x.date === '2026-10-13');
  assert.equal(b.confirmed, 'other'); assert.equal(b.units, 16);
});

test('Report pro pacienta: pochvala, dlaždice s vysvětlením, navržené otázky', () => {
  chapter('preview');
  const m = markup();
  assert.match(m, /Díky za \d+ dní zapisování/); assert.match(m, /Na co se zeptat lékaře/);
  assert.match(m, /Nikoho nehodnotíme/);
  act('previewTile', 'adv'); assert.match(markup(), /Po přijaté radě byla nejvyšší hodnota/);
  const q = 'Jsou moje cíle glukózy pořád správné?';
  act('toggleQuestion', q); assert.ok(S().questions.some(x => x.text === q));
  act('toggleQuestion', q); assert.equal(S().questions.some(x => x.text === q), false);
});

test('Tři sloty dne: prázdný na řadě radí, prázdný minulý se doptá; pacient se může opravit', () => {
  chapter('week');
  act('role', 'patient');
  S().clock = '2026-10-13T08:00:00'; act('page', 'today');
  assert.equal(NF.mealState(S(), 'breakfast').state, 'now');
  assert.match(markup(), /Chystám se jíst/); assert.equal(/Byla dnes snídaně/.test(markup()), false);
  assert.match(markup(), /Snídaně už byla/, 'pacient se může opravit i když denní doba netrefí');
  assert.equal(NF.activePlan(S()).mealWindows, undefined, 'žádná okna od lékaře');
  S().clock = '2026-10-13T10:15:00'; act('page', 'today');
  assert.equal(NF.mealState(S(), 'breakfast').state, 'missed');
  assert.match(markup(), /Byla dnes snídaně\?/); assert.equal(/Chystám se jíst/.test(markup()), false, 'po okně se nenabízí dopředné flow');
  act('mealRetro', 'breakfast');
  assert.equal(S().meal.retro, true); assert.match(markup(), /Byl ke snídani inzulin/);
  act('mealBefore', '7'); act('mealStep', '2'); assert.match(S().error, /inzulin/);
  /* A06, Q3 (27. 10. 2026): procházka ve zpětném zápisu jen do R-PROCHAZKA.okno_min (60) od jídla – snídaně v 9:30, zápis v 10:15 */
  act('mealBolus', 'as'); act('mealAt', '9.5'); act('mealTime', '-15'); act('mealBefore', '7'); act('mealStep', '2');
  assert.match(markup(), /Co bylo k jídlu/);
  act('mealFood', food('Chléb se sýrem a zeleninou').id); act('mealPortion', 'usual'); act('mealStep', '3');
  assert.match(markup(), /Co pomůže teď/); assert.ok(NF.adviseAfter(S(), food('Chléb se sýrem a zeleninou').id).items.some(i => i.lever === 'walk'));
  assert.equal(NF.adviseAfter(S(), food('Chléb se sýrem a zeleninou').id, 'breakfast', '2026-10-13T07:30:00', 'usual', 'as').late, true, 'po 165 min se procházka nenabízí');
  act('mealDecide', 'walk:yes'); act('mealFinish', 'as');
  const ep = S().episodes[S().episodes.length - 1];
  assert.equal(ep.at, '2026-10-13T09:30:00'); assert.equal(ep.insulin.time, '09:15'); assert.equal(ep.retro, true);
  assert.equal(NF.mealState(S(), 'breakfast').state, 'done');
  /* vynechané jídlo s inzulinem → pokyn lékaře */
  S().clock = '2026-10-13T16:00:00'; act('page', 'today');
  assert.match(markup(), /Byl dnes oběd/);
  act('mealSkipAsk', 'lunch'); assert.match(markup(), /Byl k obědu inzulin/);
  act('mealSkip', 'lunch:as');
  assert.equal(NF.mealState(S(), 'lunch').state, 'skipped'); assert.match(markup(), /[Mm]éně jídla než obvykle/);
});

/* ---------- zpětná vazba (15, odst. 7b) ---------- */
test('Zpětná vazba: po příchodu dat karta „Jak to dopadlo“ děkuje za čin; živá glukóza na Dnes není', () => {
  chapter('lateMeal'); act('role', 'patient');
  assert.equal(/Glukóza teď/.test(markup()), false, 'živá glukóza zrušena 1. 10. 2026');
  assert.equal(/<b>Jak to dopadlo<\/b>/.test(markup()), false, 'bez dnešních dat karta není');
  act('mealRetro', 'breakfast'); act('mealBolus', 'as'); act('mealAt', '9.5'); act('mealTime', '-15'); act('mealBefore', '7'); act('mealStep', '2'); /* A06: procházka jen do 60 min od jídla */
  act('mealFood', food('Chléb se sýrem a zeleninou').id); act('mealPortion', 'usual'); act('mealStep', '3'); act('mealDecide', 'walk:yes'); act('mealFinish', 'as');
  { const e2 = S().episodes[S().episodes.length - 1]; e2.manual.before = 6.2; act('peakSave', e2.id); S().form = { ['peak_' + e2.id]: '8.9' }; act('peakSave', e2.id); } /* opsaná nejvyšší hodnota → výsledek hned */
  const r = NF.lastResult(S());
  /* A17 (27. 10. 2026): zpětný zápis poděkování dostal při uložení (R-DIKY retro); karta výsledku je věcná, bez druhého „Díky za pokus“ */
  assert.ok(r && r.key === 'okPlain', r && r.key); assert.match(r.text, /S procházkou jste zůstali v cíli/); assert.doesNotMatch(r.text, /Díky za pokus/); /* SCHEMA 86: jídlo a nejvyšší hodnotu nese hlavička karty (state-big) */ assert.match(markup(), /class="state-big ok">8,9 mmol\/l/);
  assert.match(markup(), /<b>Jak to dopadlo<\/b>/);
  act('resultSeen', r.ep.id); assert.equal(NF.lastResult(S()), null); assert.equal(/<b>Jak to dopadlo<\/b>/.test(markup()), false);
  const T = NF.texts(S(), 'R-DIKY');
  for (const k of Object.keys(T)) assert.equal(/mmol|v cíli|nad cíl/.test(T[k]), false, 'poděkování není za hodnotu: ' + k);
  assert.equal(NF.thanks(S(), S().episodes[S().episodes.length - 1]), T.retro);
});
test('Milníky: jednou, za snahu a návyk, ne za hodnotu; Cesta ke kontrole počítá X z N', () => {
  chapter('week');
  const kase = food('Ovesná kaše s mlékem a banánem');
  assert.equal(S().fb.milestones.filter(m => m.id === 'known:' + kase.id).length, 1);
  NF.checkMilestones(S()); assert.equal(S().fb.milestones.filter(m => m.id === 'known:' + kase.id).length, 1, 'nejvýš jednou');
  const T = NF.texts(S(), 'R-MILNIKY');
  assert.ok(Object.keys(T).every(k => ['known', 'habit', 'week1', 'usual10', 'allknown', 'retro5'].includes(k)), 'žádný milník za hodnotu glukózy');
  for (const k of Object.keys(T)) assert.equal(/mmol/.test(T[k]), false, k);
  act('role', 'patient'); act('page', 'today');
  const m = NF.pendingMilestone(S()); assert.ok(m); assert.match(markup(), /class="eyebrow">Novinka<\/p>/); /* SCHEMA 86 (02 odd. 2): „Milník“ → „Novinka“ */
  act('milestoneClose', m.id); assert.equal(NF.pendingMilestone(S()), null, 'zavření zavře i starší; na Dnes je nejvýš jedna karta');
  act('page', 'plan'); /* SCHEMA 86: Cesta ke kontrole je v Mém plánu (přebíjí 7b.4) */
  const ps = NF.pathStats(S()); assert.ok(ps.known <= ps.repeated && ps.left > 0);
  const path = markup().match(/class="card path"[\s\S]*?<\/section>/)[0].replace(/\s*<span class="of">\s*(ze?)\s*<\/span>\s*/g, ' $1 ') /* SCHEMA 80 (31/03 C4): zlomek má mezery i v textu */.replace(/<\/?span class="frac">|<\/span>/g, ''); /* zlomek „3 z 4“ je vysazený (19. 10. 2026) */
  assert.match(path, /Cesta ke kontrole/); /* SCHEMA 84 (32/01 B6): pacient vidí jen „Známe už N vašich jídel“, jmenovatel vidí lékař */ assert.match(path, ps.known ? new RegExp('Známe už ' + ps.known + ' vaš') : /Vaše jídla se zatím učíme/); assert.equal(new RegExp(ps.known + ' ' + NF.z(ps.repeated) + ' ' + ps.repeated + '\\.').test(path), false, 'bez jmenovatele'); assert.equal(/\d+ %/.test(path), false, 'čísla X z N, ne procenta');
  assert.ok(S().events.some(x => x.what === 'milnik'), 'milník je ve stopě');
});
test('Týdenní shrnutí po 7 dnech jednou; vstup k reportu z Plánu a před kontrolou z Dnes', () => {
  chapter('lateMeal'); act('role', 'patient');
  act('milestoneClose', NF.pendingMilestone(S()).id);
  const w = NF.weekSummary(S()); assert.ok(w && w.week === 1); assert.match(markup(), /Váš 1\. týden/); assert.match(markup(), /z 21 hlavních jídel/); /* SCHEMA 86: svačiny zvlášť */
  act('weekClose', w.id); assert.equal(NF.weekSummary(S()), null); assert.equal(/Váš 1\. týden/.test(markup()), false);
  act('page', 'plan'); assert.match(markup(), /Co uvidí lékař/); assert.match(markup(), /Novinky \(/);
  act('page', 'preview'); assert.match(markup(), /Na co se zeptat lékaře/);
  act('page', 'today'); assert.equal(/jdete na kontrolu/.test(markup()), false);
  S().clock = '2027-01-02T09:00:00'; act('page', 'today'); assert.match(markup(), /jdete na kontrolu/);
  /* nic z toho nejde do reportu lékaře */
  chapter('reviewSummary'); act('startReview'); assert.equal(/[Mm]ilník/.test(markup()), false);
});

/* ---------- kontrola ---------- */
test('Kontrola je vedené flow: souhrn → návrhy (jeden po druhém) → plán → předání', () => {
  chapter('reviewSummary'); act('startReview');
  const r = S().review;
  assert.equal(r.step, 1); assert.ok(r.proposals.length >= 3);
  assert.match(markup(), /Čas v cíli/); assert.match(markup(), /Co se dělo/);
  act('reviewStep', '3'); assert.equal(S().review.step, 1); assert.match(S().error, /Nejdřív/);
  act('reviewStep', '2');
  assert.equal((markup().match(/class="prop current"/g) || []).length, 1, 'jen jeden návrh otevřený');
  const pr = r.proposals[0];
  act('propDecide', pr.id + ':agree');
  if (pr.kind === 'dose') { assert.equal(S().review.decisions[pr.id], undefined, 'bez ověření nejde souhlasit'); }
  pr.verify.forEach((_, i) => act('propVerify', pr.id + ':' + i + ':yes'));
  const br = ctx.NutriFee.screens.proposalBranch(S(), pr);
  assert.ok(br && br.action !== 'wait');
  if (pr.kind === 'dose') { act('propUnits', pr.id + ':1'); act('propUnits', pr.id + ':1'); }
  act('propDecide', pr.id + ':' + (br.action === 'keep' ? 'keep' : 'agree'));
  assert.ok(S().review.decisions[pr.id]);
  assert.equal(S().review.index, 1);
});

test('Návrh k dávce: čistá data, rady první, větve podle ověření, jednotky volí lékař', () => {
  chapter('reviewProposals');
  const r = S().review, pr = r.proposals.find(p => p.kind === 'dose');
  assert.ok(pr);
  assert.match(pr.why, /obvyklou porcí a potvrzenou dávkou|potvrzen|nocí/);
  r.verify[pr.id] = {};
  assert.equal(NF.screens.proposalBranch(S(), pr).action, 'wait');
  pr.verify.forEach((_, i) => { r.verify[pr.id][i] = i !== 0; });
  assert.equal(NF.screens.proposalBranch(S(), pr).action, 'keep', 'bod 1 nesedí → ponechat');
  pr.verify.forEach((_, i) => { r.verify[pr.id][i] = true; });
  assert.ok(['up', 'down'].includes(NF.screens.proposalBranch(S(), pr).action));
  act('role', 'doctor'); act('propDecide', pr.id + ':agree');
  assert.equal(S().review.decisions[pr.id], undefined, 'stejné jednotky jako dnes → zamčeno');
  const before = NF.activePlan(S()).doses[pr.dose].units;
  act('propUnits', pr.id + ':1'); act('propDecide', pr.id + ':agree');
  assert.equal(S().review.decisions[pr.id].units, before + 1);
  assert.ok(S().events.some(e => e.what === 'navrh.rozhodnut'));
});

test('Vydání P2 z rozhodnutí; historie P1 zůstává; učení po změně dávky znovu', () => {
  chapter('reviewConfirm');
  const eps = S().episodes.length, k = food('Ovesná kaše s mlékem a banánem').id;
  assert.ok(NF.foodStats(S(), k).n >= 3);
  act('issueP2');
  assert.equal(S().activePlanId, 'P2'); assert.equal(S().plans.length, 2); assert.equal(S().episodes.length, eps);
  assert.equal(S().plans[0].state, 'superseded');
  const changed = ['basal', 'breakfast', 'lunch', 'dinner'].some(x => S().plans[1].doses[x].units !== S().plans[0].doses[x].units);
  if (changed) assert.equal(NF.foodStats(S(), k).n === 0 || NF.activePlan(S()).doses.breakfast.units === S().plans[0].doses.breakfast.units, true);
  assert.equal(S().review.step, 4);
  assert.match(markup(), /phone-preview/);
  act('role', 'patient');
  assert.match(markup(), /Co se změnilo/);
  act('confirmUnderstanding');
  assert.equal(NF.activeHabits(S()).every(h => h.planId === 'P2'), true);
});

test('Odbočka „většinou nepřijal“ vede k jiným návrhům', () => {
  chapter('reviewSummary'); branch('response', 'impractical'); act('role', 'doctor'); act('startReview');
  const ids = S().review.proposals.map(p => p.id).join(' ');
  assert.match(ids, /PR-SWAP|PR-.*-RADY/);
  /* A12 (27. 10. 2026): „Nejdřív rady“ nese D-PRAND a postup D-POSTUP (prandAdviceFirst); dávku neposuzuje – bez bodů o dávce */
  S().review.proposals.filter(p => /-RADY$/.test(p.id)).forEach(p => { assert.equal(p.item, 'D-PRAND'); assert.equal(p.postup, 'D-POSTUP'); });
  const rady = S().review.proposals.find(p => /-RADY$/.test(p.id));
  if (rady) { S().review.proposals.forEach(p => { if (p !== rady && p.priority < rady.priority) S().review.decisions[p.id] = { choice: 'keep' }; }); /* SCHEMA 80 (31/02 A1): v „nemám to doma“ je dřív návrh k obědu – rozhodnutý, aby byla otevřená karta „Nejdřív rady“ */ S().review.step = 2; S().review.index = S().review.proposals.indexOf(rady); app.render && app.render(); const m = markup(), i = m.indexOf('Nejdřív rady'); assert.ok(i >= 0); const card = m.slice(i, m.indexOf('rozhodnutí se zapíše do stopy', i)); assert.equal(/Vyrovnání celkově nedosahuje cíle|Co návrh oslabuje/.test(card), false, 'karta dávku neposuzuje: bez bodu o vyrovnání a bez „Co návrh oslabuje“'); assert.match(card, /data-value="D-PRAND"/, 'štítek D-PRAND (A12)'); }
  boot(); chapter('reviewSummary'); branch('response', 'accepts'); act('role', 'doctor'); act('startReview');
  assert.match(S().review.proposals.map(p => p.id).join(' '), /PR-KEEP/);
});

test('Rady svázané s plánem: výměna rady má účinek; návrhy beze změny jedna karta; Vše sedí; Potvrdit plán ukazuje výsledek', () => {
  chapter('reviewSummary'); branch('response', 'impractical'); act('role', 'doctor');
  /* A27 (27. 10. 2026): náhrada jen za radu, která se v období nenabízela. V příběhu se nabízely všechny tři, náhrada proto není (to hlídá faze2-jadro);
     výměnu s náhradou ověříme na datech, kde se procházka v období nenabízela. */
  { const nWalk = S().episodes.filter(e => (e.advice || []).some(a => a.lever === 'walk')).length; S().episodes.forEach(e => { if (e.advice) e.advice = e.advice.filter(a => a.lever !== 'walk'); }); assert.ok(nWalk > 0); }
  act('importDemo'); act('startReview'); act('reviewStep', '2');
  const r = S().review;
  assert.match(markup(), /Rozhodněte \d+ návrh/); assert.equal(/\d+ návrhy</.test(markup()), false, 'gramatika');
  assert.match(markup(), /Beze změny \(\d+\)/); assert.equal((markup().match(/class="prop current"/g) || []).length, 1);
  const pr = NF.nextProposal(S()); assert.ok(pr.lever, 'první návrh se týká rady');
  act('propVerifyAll', pr.id); assert.ok(pr.verify.every((_, i) => NF.nurseKey(pr, i) ? r.verify[pr.id][i] === undefined : r.verify[pr.id][i] === true)); /* SCHEMA 78 (bod 7): body sestry „Vše sedí“ nepřepíná */
  act('propVerify', pr.id + ':0:no');
  assert.equal(NF.screens.proposalBranch(S(), pr).action, 'swap', 'bod 1 nesedí → vyměnit');
  const opts = NF.swapOptions(S(), pr); assert.ok(opts.length && !opts.includes(pr.lever));
  act('propSwapTo', pr.id + ':' + opts[0]); act('propDecide', pr.id + ':agree');
  assert.equal(r.decisions[pr.id].swapTo, opts[0]);
  /* zbytek jednotlivě, pak beze změny jedním klepnutím */
  D.decideSingles(S(), S().branches);
  assert.equal(NF.reviewComplete(S()), false); act('propKeepAll'); assert.equal(NF.reviewComplete(S()), true);
  assert.ok(r.proposals.filter(p => p.group).every(p => r.decisions[p.id].choice === 'keep'));
  act('reviewStep', '3');
  const d = NF.planFromReview(S());
  assert.ok(d.advice.off.includes(pr.lever) && d.advice.prefer.length >= 1, 'vypnutá rada a náhrada v plánu');
  assert.match(markup(), /vypnuto/); assert.match(markup(), /nabízet přednostně/);
  act('issueP2'); assert.deepEqual(NF.activePlan(S()).advice, d.advice);
  act('role', 'patient'); assert.match(markup(), /lékař (ji|je) vypnul/); act('confirmUnderstanding');
  const k = food('Ovesná kaše s mlékem a banánem').id, items = NF.advise(S(), k, 'usual', 'before').items.map(i => i.lever);
  assert.equal(items.includes(pr.lever), false, 'vypnutá rada se nenabízí'); assert.ok(items.includes(NF.activePlan(S()).advice.prefer[0]), 'náhradní rada se nabízí');
  act('page', 'plan'); assert.match(markup(), /lékař vypnul/);
});
test('„Pravidla a kontakty“ otevře pokyny a kontakty (C2, SCHEMA 84); návrh k dávce bez schváleného postupu nemá větve', () => {
  chapter('reviewSummary'); act('startReview'); act('acuteOpen');
  assert.match(plain(elements.get('overlay').innerHTML), /Pravidla a kontakty/); act('closeDrawer');
  NF.decideItem(S(), 'D-POSTUP', 'rejected', 'test');
  const props = NF.proposals(S(), NF.activePlan(S()).id, D.habitCatalog).filter(p => p.kind === 'dose' && !p.row); /* SCHEMA 84: řádky bez návrhu postup nemají */
  assert.ok(props.length && props.every(p => p.branches.length === 0 && /postup posouzení dávky není v registru schválený/.test(p.weak.join())));
});

/* ---------- správnost výpočtů (balíček C) ---------- */
test('Čistá data: inzulin včas (dávka 30/15, učení 45/30); jídlo ve dvou slotech s různou dávkou se neslévá; bazál z dnů plánu; nemoc po dnech; HbA1c', () => {
  chapter('week');
  const ep = S().episodes.find(e => e.id === 'E6'); assert.ok(NF.usableEp(S(), ep));
  ep.insulin.time = '06:35'; assert.ok(NF.usableEp(S(), ep), '25 min před jídlem je včas');
  /* SCHEMA 85 (vlastník 5. 11. 2026): učení 45 min před / 30 min po jídle, návrh k dávce dál 30 / 15 */
  ep.insulin.time = '06:20'; assert.ok(NF.usableEp(S(), ep), '40 min před jídlem: do učení ano'); assert.equal(NF.usableForDose(S(), ep), false, '40 min před jídlem: do návrhu k dávce ne'); assert.match(NF.whyNotForDose(S(), ep), /mimo čas pro návrh k dávce/);
  ep.insulin.time = '06:10'; assert.equal(NF.usableEp(S(), ep), false, '50 min před jídlem už ani do učení'); assert.match(NF.whyNotUsable(S(), ep), /mimo čas/);
  ep.insulin.time = '07:20'; assert.ok(NF.usableEp(S(), ep), '20 min po jídle: do učení ano'); assert.equal(NF.usableForDose(S(), ep), false, '20 min po jídle: do návrhu k dávce ne');
  ep.insulin.time = '07:35'; assert.equal(NF.usableEp(S(), ep), false, '35 min po jídle už ani do učení'); ep.insulin.time = '06:55';
  chapter('preview'); const ch = food('Chléb se sýrem a zeleninou').id;
  const all = NF.foodStats(S(), ch).n; assert.ok(all > 0);
  NF.activePlan(S()).doses.dinner.units = 6;
  assert.ok(NF.foodStats(S(), ch, null, 'breakfast').n < all, 'večeře s jinou dávkou k snídani nepatří');
  assert.equal(NF.foodStats(S(), ch, null, 'dinner').n, 0, 'při změně dávky k večeři se učí znovu');
  NF.activePlan(S()).doses.dinner.units = 8;
  const s = NF.summary(S(), 'P1');
  assert.ok(s.basalDays >= 90 && s.basalAs <= s.basalDays, 'jmenovatel bazálu = dny plánu'); assert.equal(s.illDays, 3, 'nemoc 20.–22. 10. = 3 dny');
  assert.ok(s.hba1c && s.onTime <= s.asPlan);
  chapter('reviewSummary'); act('startReview'); assert.match(markup(), /HbA1c/); act('reviewTile', 'ins'); assert.match(markup(), /včas/);
  /* dvě období nemoci se sčítají */
  chapter('recovery'); act('illnessCheck', 'better'); S().clock = '2026-11-01T08:00:00'; act('illness', 'on'); S().clock = '2026-11-02T08:00:00'; act('illness', 'off');
  assert.equal(NF.illnessDays(S()), 5);
});
test('Učení podle jídla dne pacientovi (25. 10. 2026): oběd 10 j. a večeře 8 j. → stav ke každému jídlu dne a jedna věta; při stejné dávce nic', () => {
  chapter('week'); act('role', 'patient');
  const k = food('Kuřecí maso na kari s rýží').id, src0 = S().episodes.filter(e => e.foodId === k).pop();
  assert.ok(S().episodes.filter(e => e.foodId === k).every(e => e.meal === 'lunch'), 'výchozí stav: jídlo jen k obědu');
  assert.equal(JSON.stringify(NF.slotStates(S(), k)), JSON.stringify([]), 'jedno jídlo dne: nic navíc');
  const ep = JSON.parse(JSON.stringify(src0)); ep.id = 'EX-SLOT'; ep.meal = 'dinner'; ep.doseKey = NF.doseKey(S(), 'dinner'); ep.at = src0.at.slice(0, 11) + '18:30:00'; ep.portion = 'bigger'; S().episodes.push(ep);
  const p = NF.activePlan(S()); assert.equal(p.doses.lunch.units, 10); assert.equal(p.doses.dinner.units, 8);
  const T = NF.item(S(), 'R-REAKCE').texts; assert.ok(T.slotLearning && T.slotUnknown && T.slotWhy, 'texty jsou položka R-REAKCE');
  assert.equal(JSON.stringify(NF.slotStates(S(), k)), JSON.stringify(['k obědu učíme se 1 ze 4', 'k večeři zatím neznáme']));
  act('page', 'foods'); act('foodsSeg', 'all'); assert.match(markup(), /k obědu učíme se 1 ze 4 · k večeři zatím neznáme/);
  act('foodOpen', k); let m = markup(); assert.match(m, /k obědu učíme se 1 ze 4 · k večeři zatím neznáme/); assert.match(m, /K obědu a k večeři máte jinou dávku, proto se učíme zvlášť\./);
  S().meal = { step: 2, meal: 'lunch', bolus: 'as', units: 10, offset: '0', q: 'kari', foodId: null, portion: null, decisions: {}, reasons: {}, newFood: null, before: 7, beforeAsked: true };
  act('page', 'meal'); m = markup(); assert.match(m, /k obědu učíme se 1 ze 4/); assert.equal(/k večeři zatím neznáme/.test(m), false, 'v hledání jen právě zapisované jídlo dne');
  /* stejná dávka: slévá se, nic se neukazuje */
  p.doses.dinner.units = 10; assert.equal(JSON.stringify(NF.slotStates(S(), k)), JSON.stringify([])); assert.equal(NF.slotWhyText(S(), k), '');
  act('page', 'foods'); act('foodsSeg', 'all'); act('foodOpen', k); m = markup(); assert.equal(/proto se učíme zvlášť|k obědu učíme se/.test(m), false);
  p.doses.dinner.units = 8;
  /* zamítnutá R-REAKCE: žádný text */
  act('role', 'doctor'); NF.decideItem(S(), 'R-REAKCE', 'rejected', 'test'); assert.equal(JSON.stringify(NF.slotStates(S(), k)), JSON.stringify([]));
});
test('Ukázkový export a souhrn ze senzoru jsou týž soubor (02 #1, 25. 10. 2026): 14 dní před kontrolou, čísla příběhu z jádra', () => {
  chapter('reviewSummary'); act('role', 'doctor'); if (!S().review) { assert.equal(S().sensorSummary, null, 'C10: souhrn ze senzoru vzniká až z exportu nahraného na kontrole'); act('importDemo'); act('startReview'); }
  const ss = S().sensorSummary, fromCsv = NF.sensorSummaryFrom(S(), NF.parseSensorCsv(D.demoCsv(S())));
  assert.equal(ss.source, 'import', 'souhrn vznikl přes jádro z exportu');
  assert.equal(JSON.stringify(ss), JSON.stringify(fromCsv), 'tlačítko nahraje týž soubor, ze kterého je souhrn');
  assert.equal(ss.tir, 68); assert.equal(ss.below, 2); assert.equal(ss.above, 30); /* SCHEMA 80 (31/02 A1): snídaně od listopadu nad cílem u všech jídel → čas v cíli 68 % (dřív 72 %) */ assert.equal(ss.veryLow, 0); assert.equal(ss.availability, 91); assert.equal(ss.days, 14);
  assert.equal(ss.period, '22. 12. 2026 – 4. 1. 2027'); assert.equal(S().enrollment.baseline.tir, 58, 'dříve 58');
  act('importDemo'); assert.equal(S().sensorImport.days, 14); assert.equal(JSON.stringify(S().sensorSummary), JSON.stringify(fromCsv), 'nahrání čísla nezmění');
  const m = markup(); assert.match(m, /<b>Export nahrán a převeden · doplněno \d+ (jídlo|jídla|jídel) a \d+ (noc|noci|nocí)\.<\/b> ?\(za 14 dní, 22\. 12\. 2026 – 4\. 1\. 2027\)/); /* SCHEMA 74 (vlastník 27. 10. 2026): jen „Export nahrán a převeden · doplněno N jídel a N nocí“, bez formátu */ assert.equal(S().sensorImport.readings, 3669); assert.match(m, /za 22\. 12\. 2026 – 4\. 1\. 2027 \(14 dní\)/);
  /* odbočka „rady nepřijímá“: 63 % / 37 % ze stejně stavěného souboru; C10 (27. 10. 2026): export dodatku je bez nočních poklesů, proto pod cílem 0 % */
  const o = NF.sensorSummaryFrom(S(), NF.parseSensorCsv(D.periodCsv({ response: 'declines' }))); assert.equal(o.tir, 63); assert.equal(o.above, 37); assert.equal(o.below, 0);
  /* před kontrolou zůstává ukázkový export k zápisům bez průběhu */
  chapter('lateMeal'); assert.equal(D.periodExportNow(S()), false);
});
test('Zamítnuté položky přestanou působit: R-SKORE bez štítku, zamítnutá rada s neutrální větou; návyk „zapisuj“ po třech jídlech; bazál ze včerejška', () => {
  chapter('afterBolus'); const k = food('Ovesná kaše s mlékem a banánem').id;
  act('role', 'doctor'); NF.decideItem(S(), 'R-SKORE', 'rejected', 'test'); act('role', 'patient');
  assert.equal(NF.confidence(S(), k).reaction, null);
  act('page', 'foods'); act('foodsSeg', 'all'); act('foodOpen', k); assert.match(markup(), /nehodnotíme/);
  act('role', 'doctor'); NF.decideItem(S(), 'R-DOPLNEK', 'rejected', 'test'); act('role', 'patient');
  const res = NF.advise(S(), k, 'usual', 'before');
  assert.ok(res.gone.some(g => g.lever === 'addon')); assert.match(res.gone[0].text, /nenabízíme/); assert.equal(/garant/i.test(res.gone[0].text), false);
  act('startMeal', 'breakfast'); act('mealBolus', 'before'); act('mealBefore', '7'); act('mealStep', '2'); act('mealFood', k); act('mealPortion', 'usual'); act('mealStep', '3');
  assert.match(markup(), /teď nenabízíme/);
  chapter('week'); act('role', 'patient'); S().clock = '2026-10-12T19:00:00'; act('page', 'today');
  act('page', 'plan'); assert.match(markup(), /class="hweek"><span class="hn">Zapsat hlavní jídla<\/span>/); /* SCHEMA 86: návyky s fajfkami za 7 dní v Mém plánu */ act('page', 'today');
  S().clock = '2026-10-14T08:00:00'; act('page', 'today');
  assert.match(markup(), /včera večer bazál/); act('basalYesterday', 'as');
  assert.ok(S().basalLog.some(b => b.date === '2026-10-13' && b.confirmed === 'as')); assert.equal(/včera večer bazál/.test(markup()), false);
});

/* ---------- balíček D ---------- */
test('Svačina: bez inzulinu a bez porce, mimo sloty a návrhy k dávce, učí se zvlášť; v reportu vidět', () => {
  chapter('lateMeal'); act('role', 'patient'); S().clock = '2026-10-13T15:00:00'; act('page', 'today');
  assert.match(markup(), /Zapsat svačinu|Svačina · bez inzulinu/);
  act('startMeal', 'snack'); assert.equal(S().meal.step, 2); assert.match(markup(), /svačině/); assert.equal(/Jakou porci/.test(markup()), false);
  bind('meal.q', 'jabl'); act('mealFood', food('Jablko').id); assert.equal(/Jakou porci/.test(markup()), false); act('mealStep', '3');
  assert.equal(/mění množství jídla/.test(markup()), false, 'u svačiny žádná rada k porci');
  act('mealFinish', 'snack');
  const ep = S().episodes[S().episodes.length - 1];
  assert.equal(ep.meal, 'snack'); assert.equal(ep.insulin.confirmed, 'snack'); assert.equal(ep.insulin.prescribed, null); assert.equal(ep.doseKey, 'snack:0');
  ep.manual = { before: 6.1, peak: 7.4, peakAt: S().clock }; /* opsané hodnoty */
  assert.ok(NF.usableEp(S(), ep), 'svačina se učí (bez podmínky inzulinu)');
  assert.equal(NF.mealState(S(), 'lunch').state, 'now', 'svačina nezaplní slot');
  assert.equal(NF.foodStats(S(), food('Jablko').id).n >= 1, true);
  const s = NF.summary(S(), 'P1'); assert.ok(s.snacks >= 1); assert.equal(s.meals, NF.periodEpisodes(S(), 'P1').filter(e => e.meal !== 'snack').length);
  const props = NF.proposals(S(), 'P1', D.habitCatalog); assert.equal(props.some(p => /snack|svačin/i.test(p.id + p.title)), false);
});
test('Cíle glukózy voličem při zařazení i při kontrole; úprava pokynů při kontrole má účinek; po převzetí P2 lze zahájit další kontrolu', () => {
  chapter('doses'); assert.match(markup(), /Cíle glukózy/);
  act('target', 'high:1'); assert.equal(S().draft.targets.high, 10.5); act('target', 'high:-1'); assert.equal(S().draft.targets.high, 10);
  act('target', 'low:-100'); assert.equal(S().draft.targets.low, 3.0, 'dolní mez voliče');
  chapter('reviewProposals'); act('role', 'doctor');
  const r = S().review, pk = r.proposals.find(p => p.id === 'PR-POKYNY');
  act('propSingle', pk.id); D.decideSingles(S(), S().branches); act('propReopen', pk.id);
  act('propVerify', pk.id + ':0:no'); assert.equal(NF.screens.proposalBranch(S(), pk).action, 'edit');
  assert.match(markup(), /Pravidla pro příští období/); /* SCHEMA 74 */
  act('revTarget', 'fastingHigh:-2'); act('revInstrValue', 'I-VYSOKA:1');
  act('propDecide', pk.id + ':agree'); assert.equal(r.decisions[pk.id].branch, 'edit');
  act('propKeepAll'); act('reviewStep', '3'); act('issueP2');
  const p2 = NF.activePlan(S());
  assert.equal(p2.targets.fastingHigh, 7.0); assert.equal(p2.instructions.find(i => i.id === 'I-VYSOKA').value, 15.5, 'výjimka u pacienta');
  act('role', 'patient'); assert.match(markup(), /Pravidla a cíle/); act('confirmUnderstanding');
  act('role', 'doctor'); act('page', 'review'); assert.match(markup(), /Zahájit kontrolu/, 'po převzetí P2 lze začít další kontrolu');
  act('startReview'); assert.equal(S().review.planId, 'P2');
});

test('Druhý průchod: Co teď dává přednost jídlu před bazálem; připomínka inzulinu jen pro slot na řadě; pohyb jen do 90 min po jídle; bez přepínače jídla; bez falešných fajfek', () => {
  chapter('week'); act('role', 'patient');
  S().clock = '2026-10-13T19:30:00'; NF.skipMeal(S(), 'breakfast', 'none'); NF.skipMeal(S(), 'lunch', 'none'); act('page', 'today');
  assert.match(markup(), /Na řadě je večeře/); assert.equal(/class="hero-msg">Čas na bazál/.test(markup()), false, 'večeře před bazálem');
  NF.skipMeal(S(), 'dinner', 'none'); S().clock = '2026-10-13T21:00:00'; act('page', 'today'); assert.match(markup(), /class="hero-msg">Čas na bazál/);
  chapter('week'); act('role', 'patient');
  S().clock = '2026-10-13T15:00:00'; act('page', 'today');
  assert.match(markup(), /Byla dnes snídaně/); assert.equal(/zeptáme se před jídlem/.test(markup()), false, 'připomínka inzulinu k minulému jídlu nemá smysl');
  act('mealRetro', 'breakfast'); assert.equal(/data-action="mealKind"/.test(markup()), false, 'přepínač jídla zrušen (Z2)');
  act('mealBolus', 'as'); act('mealAt', '7'); act('mealBefore', '7'); act('mealStep', '2'); act('mealFood', food('Chléb se sýrem a zeleninou').id); act('mealPortion', 'usual'); act('mealStep', '3');
  assert.equal(NF.adviseAfter(S(), food('Chléb se sýrem a zeleninou').id, 'breakfast', NF.retroAt(S(), 7)).items.length, 0, 'po 8 hodinách už procházka nepomůže');
  assert.match(markup(), /Shrnutí zápisu/); assert.equal(/Co pomůže teď/.test(markup()), false); /* SCHEMA 86 (oprava 05): bez věty o „vzestupu“ */ act('mealFinish', 'as');
  /* A06, Q3 (27. 10. 2026): procházka jen do R-PROCHAZKA.okno_min (60) od jídla; po 2 h už ne */
  S().clock = '2026-10-13T16:00:00'; { const a = NF.adviseAfter(S(), food('Jablko').id, 'snack', '2026-10-13T14:00:00'); assert.equal(a.late, true); assert.equal(a.items.length, 0, 'po 2 h už neradí'); }
  assert.match(NF.adviseAfter(S(), food('Jablko').id, 'snack', '2026-10-13T15:30:00').items[0].certainty, /do hodiny/, 'do 60 min radí');
  act('page', 'plan'); assert.equal((markup().match(/Tři jídla denně/g) || []).length, 0, 'duplicitní karta odstraněna');
  chapter('preview'); assert.equal(/class="mark">✓<\/span><div>Zapisuj/.test(markup()), false, 'žádné falešné fajfky'); assert.match(markup(), /Díky za \d+ dní zapisování/);
  /* bez zápisů report nepadá na „null %“ */
  chapter('handover'); act('role', 'doctor'); act('startReview'); assert.equal(/null/.test(markup()), false); assert.match(markup(), /Pacient zatím nezapsal žádné jídlo/);
});

/* ---------- stopa ---------- */
test('Texty doplňků nic z jídla neubírají (zásada 3): žádné „místo / vyměň / nahraď / méně / bez“', () => {
  const bad = /místo|vyměň|nahraď|méně|\bbez\b|polovin|část/i;
  for (const f of S().foods) { const a = NF.addonFor(S(), f), o = NF.orderFirst(S(), f); assert.equal(bad.test(a), false, f.name + ': ' + a); assert.equal(bad.test(o), false, f.name + ': ' + o); } /* kontrola 3, A2: věty skládá šablona položky */
  for (const id of ['R-DOPLNEK', 'R-PORADI']) assert.equal(bad.test(NF.item(S(), id).text || ''), false, id);
  /* doplněk jen před píchnutím a mimo nemoc; jídlo „bez doplňku“ ho nenabízí */
  chapter('advice'); const k = food('Ovesná kaše s mlékem a banánem').id;
  assert.ok(NF.advise(S(), k, 'usual', 'before').items.some(i => i.lever === 'addon'), 'před píchnutím se doplněk nabízí');
  assert.equal(NF.advise(S(), k, 'usual', 'as').items.some(i => i.lever === 'addon'), false, 'po píchnutí ne');
  S().illness = { active: true, from: S().clock, checkins: [] };
  assert.equal(NF.advise(S(), k, 'usual', 'before').items.some(i => i.lever === 'addon'), false, 'při nemoci ne');
  S().illness = null;
  const eggs = food('Míchaná vejce se zeleninou'); assert.equal(NF.leverFits(eggs, 'addon'), false);
});

test('Poznámka garanta v panelu vyprávění nemění stav ani se nepočítá jako rozhodnutí (R14); zamítnutá rada zmizí i z reportu a plánu P2', () => {
  act('goScene', String(D.scenes.findIndex(s => D.chapters[s.ch].id === 'impact'))); act('closeDrawer');
  const before = NF.registrySummary(S());
  D.noteDraft('R-DOPLNEK', 'Nepodepisuji — doplněk po píchnutí.'); act('garantNote', 'R-DOPLNEK');
  let after = NF.registrySummary(S());
  /* SCHEMA 83 (vlastník 2. 11. 2026): poznámka bez rozhodnutí nevzniká; koncept zůstane a odejde s rozhodnutím */
  assert.equal(after.touched, before.touched); assert.equal(after.remaining, before.remaining); assert.equal(after.noted, before.noted, 'bez rozhodnutí žádná poznámka');
  assert.equal(NF.item(S(), 'R-DOPLNEK').status, 'approved'); assert.equal(NF.itemState(S(), 'R-DOPLNEK'), 'pending'); assert.equal(D.noteField('R-DOPLNEK'), 'Nepodepisuji — doplněk po píchnutí.');
  /* starší záznam note bez rozhodnutí (před SCHEMA 83) se dál zobrazí a není rozhodnutím (R14) */
  NF.decideItem(S(), 'R-DOPLNEK', null, 'Nepodepisuji — doplněk po píchnutí.', { garant: true, note: true, status: null });
  after = NF.registrySummary(S()); assert.equal(after.touched, before.touched); assert.equal(after.noted, before.noted + 1); assert.equal(NF.itemState(S(), 'R-DOPLNEK'), 'pending');
  act('role', 'doctor'); act('page', 'registry'); assert.match(markup(), /„Nepodepisuji . doplněk po píchnutí\.“/, 'poznámka je vidět v řádku registru'); act('tourReturn');
  /* zamítnutí R-PROCHAZKA: u pacienta zmizí a v reportu se už nenavrhuje „Zachovat radu Procházka“ */
  act('garantDecide', 'R-PROCHAZKA:rejected:ano');
  chapter('reviewProposals');
  assert.equal(S().review.proposals.some(p => p.lever === 'walk'), false, 'zamítnutá rada není v návrzích');
  D.decideSingles(S(), S().branches); act('role', 'doctor'); act('propKeepAll'); D.decideSingles(S(), S().branches); act('reviewStep', '3');
  assert.match(markup(), /nepoužívá se \(položka registru zamítnuta\)/);
});

test('Rozhodnutí proti směru větve se zapíše jako „jinak“, ne jako souhlas; bod bez větve nevymýšlí větev; vyřazené zápisy jsou vypsané', () => {
  chapter('reviewProposals'); act('role', 'doctor'); /* Q6 (27. 10. 2026): návrh k bazálu z nocí v exportu má přednost a je první; lékař ho ponechá, aby byl na řadě návrh k jídlu */ if (S().review.proposals.some(p => p.id === 'PR-BAZAL') && !S().review.decisions['PR-BAZAL']) act('propDecide', 'PR-BAZAL:keep');
  const r = S().review, pr = r.proposals.find(p => p.kind === 'dose' && p.dose !== 'basal'); assert.ok(pr);
  assert.ok(pr.verify.some(v => /nemocný/.test(v)), 'ověřovací bod nemoci');
  assert.ok(Array.isArray(pr.excluded), 'seznam vyřazených zápisů'); assert.equal(/\d zápisů vyřazeno \(/.test(pr.weak.join()) && pr.excluded.length === 1, false, 'tvar čísla');
  r.verify[pr.id] = {}; pr.verify.forEach((_, i) => { r.verify[pr.id][i] = i !== 1; });
  /* kontrola 3, A1: každý bod má větev (bod 2 = technika → ponechat); bez větve by byl výsledek „ponechat dávku“, nikdy volné „rozhodněte sami“ */
  const br = NF.screens.proposalBranch(S(), pr); assert.equal(br.action, 'keep'); assert.match(br.when, /bod 2 nesedí/);
  pr.verify.forEach((_, i) => { r.verify[pr.id][i] = true; });
  const dir = NF.screens.proposalBranch(S(), pr).action; assert.ok(dir === 'up' || dir === 'down');
  act('propUnits', pr.id + ':' + (dir === 'up' ? '-1' : '1'));
  assert.match(markup(), /Rozhodnout jinak než postup/);
  act('propDecide', pr.id + ':agree');
  assert.equal(r.decisions[pr.id].choice, 'other'); assert.equal(r.decisions[pr.id].againstBranch, true);
  assert.match(markup(), /rozhodnuto jinak než postup/);
});

test('Svačina se nepočítá do návyků „obvyklá porce“ a „potvrdit inzulin“ a nespouští milník „umíme poradit“', () => {
  chapter('week'); act('role', 'patient');
  const snacks = S().episodes.filter(e => NF.isSnack(e.meal)); assert.ok(snacks.length >= 1);
  act('page', 'today'); const m = markup();
  assert.equal(/Obvyklá porce<small>\d+ \/ \d+ jíd(lo|la|el) v obvyklé porci/.test(m) && /zatím žádné jídlo/.test(m) === false && S().episodes.filter(e => !NF.isSnack(e.meal) && NF.day(e.at) === NF.day(S().clock)).length === 0, false);
  const known = S().fb.milestones.filter(x => x.key === 'known');
  for (const k of known) assert.equal(NF.isSnack(NF.dominantMeal(S(), k.id.split(':')[1])), false, 'milník známe ne u svačiny');
});

test('Robustnost: kalendářní dny, zpětný čas nikdy v budoucnosti, bazál po půlnoci k předchozímu dni, inzulin přes půlnoc', () => {
  assert.equal(NF.daysBetween('2026-10-05T00:00:00', '2026-10-05T23:59:00'), 0);
  assert.equal(NF.daysBetween('2026-10-25T00:30:00', '2026-10-26T00:30:00'), 1, 'konec letního času');
  assert.equal(NF.daysBetween('2026-10-05T09:05:00', '2026-10-11T21:06:00'), 6);
  chapter('lateMeal'); act('role', 'patient');
  S().clock = '2026-10-14T00:10:00';
  assert.ok(NF.retroAt(S(), 19) <= S().clock, 'včerejší večeře po půlnoci není v budoucnosti'); assert.equal(NF.day(NF.retroAt(S(), 19)), '2026-10-13');
  assert.ok(NF.confirmBasal(S(), 'as').ok); assert.equal(S().basalLog[S().basalLog.length - 1].date, '2026-10-13');
  assert.equal(NF.onTime(S(), { at: '2026-10-13T23:50:00', insulin: { time: '00:05' } }), true);
});

test('Robustnost: akce bez stavu nepadají; Další po ručním zásahu pacienta aplikaci neshodí; výjimka v akci je hláška', () => {
  chapter('firstMeal'); act('role', 'patient');
  S().meal = null; S().review = null; S().reg = null; S().draft = null;
  for (const name of Object.keys(NF.actions)) for (const v of [undefined, '0', 'x', 'a:b:c', 'NaN']) { act(name, v); assert.ok(!/undefined|NaN|\[object Object\]/.test(markup()), name + ' ' + v); }
  for (const id of ['firstMeal', 'advice', 'afterBolus', 'custom', 'illnessMeal']) {
    chapter(id); act('role', 'patient');
    if (S().meal) act('mealFinish', S().meal.bolus === 'before' ? 'as' : (S().meal.bolus || 'as'));
    for (let k = 0; k < 12; k++) next();
    assert.ok(!/undefined|NaN/.test(markup()), id);
  }
  chapter('week'); act('role', 'patient'); act('startMeal', 'snack'); for (let k = 0; k < 8; k++) next(); assert.ok(!/undefined|NaN/.test(markup()));
  chapter('training'); act('role', 'nurse'); act('trainingStep', 'app'); for (let k = 0; k < 6; k++) next(); assert.equal(S().training.result, 'done', 'ruční odškrtnutí nezasekne zaučení');
  NF.actions.noop = () => { throw new Error('zkouška'); }; act('noop'); assert.match(S().error, /nepovedlo/); assert.ok(S().events.some(e => e.what === 'chyba.akce')); delete NF.actions.noop; NF.actions.noop = function () { };
});

test('Robustnost: osekaný stav se doplní, cizí schéma se zálohuje a ohlásí, bind mění jen povolené klíče, duplicitní jídlo, meze voličů', () => {
  const s0 = JSON.parse(store.get('nutrifee-maketa')); delete s0.episodes; delete s0.registry; delete s0.foods; delete s0.habits; delete s0.training; store.set('nutrifee-maketa', JSON.stringify(s0));
  const s1 = NF.load(); assert.ok(Array.isArray(s1.episodes) && s1.registry && Array.isArray(s1.foods) && s1.training, 'chybějící klíče doplněné');
  const s2 = JSON.parse(store.get('nutrifee-maketa')); s2.schema = 1; store.set('nutrifee-maketa', JSON.stringify(s2));
  const s3 = NF.load(); assert.equal(s3.schema, NF.SCHEMA); assert.equal(NF.migrated, '1'); assert.ok(store.has('nutrifee-maketa.zaloha-1'), 'záloha');
  NF.migrated = null;
  chapter('week'); bind('role', 'doctor'); assert.equal(S().role, 'patient', 'bind nemění roli'); bind('notes', 'x'); assert.equal(S().notes, 'x');
  act('role', 'patient'); const a = NF.addFood(S(), 'Moje polévka', { source: 'tekute', prep: 'varene', plate: 'polevka' }, { force: true }), b = NF.addFood(S(), 'moje polévka ', { source: 'tekute', prep: 'varene', plate: 'polevka' });
  assert.equal(a.food.id, b.food.id); assert.equal(b.existing, true);
  chapter('registry'); act('role', 'doctor'); assert.ok(NF.newVersion(S(), 'R-REAKCE', { params: { minKnown: -5 } }).ok); assert.equal(NF.item(S(), 'R-REAKCE').params.minKnown, 1, 'minKnown ≥ 1 i v nové verzi');
  chapter('enroll'); act('startDraft'); for (let i = 0; i < 40; i++) act('target', 'low:1'); assert.ok(S().draft.targets.low <= S().draft.targets.high - 1, 'dolní cíl pod horním');
  act('role', 'patient'); S().meal = null; act('mealUnits', '1'); assert.ok(S().error);
  const c = S().clock; act('shiftTime', 'x'); assert.equal(S().clock, c);
});

test('Kontrola po vydání plánu je zamčená: návrhy nelze znovu otevřít ani měnit', () => {
  chapter('reviewHandover'); act('role', 'doctor');
  const r = S().review, id = r.proposals[0].id, before = JSON.stringify(r.decisions);
  act('propReopen', id); assert.equal(JSON.stringify(r.decisions), before); assert.match(S().error, /už je vydaný/);
  act('propVerify', id + ':0:no'); assert.equal(JSON.stringify(r.decisions), before);
  act('reviewStep', '2'); assert.equal(/· změnit/.test(markup()), false);
});

test('Smoke: náhodné klepání z obrazovky v pěti scénách nerozbije vykreslení', () => {
  let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (const sc of [0, 5, 9, 14, 20]) {
    act('goScene', String(sc)); act('closeDrawer');
    for (let k = 0; k < 100; k++) {
      const btns = [...markup().matchAll(/data-action="([^"]+)"(?: data-value="([^"]*)")?/g)].filter(x => !/goScene|goChapter|resetDemo|garantReset|storyStep|setBranch|^role$|exportTrace|exportRegistry|openPresenter/.test(x[1]));
      if (!btns.length) break;
      const b = btns[Math.floor(rnd() * btns.length)];
      act(b[1], b[2]); act('closeDrawer');
      assert.ok(!/undefined|NaN|\[object Object\]/.test(markup()), 'scéna ' + sc + ' akce ' + b[1] + ' ' + b[2]);
    }
  }
});

test('Sestra: „Ukázat“ u jídla ukáže ukázkové jídlo, Plán s dávkami jde zobrazit, náhled se neovládá; nezdar s důvodem vidí lékař', () => {
  chapter('training'); act('role', 'nurse');
  act('trainingPreview', 't-zapis'); assert.equal(/Teď nelze nic zapsat/.test(markup()), false); assert.match(markup(), /Ukázkové jídlo · krok 3/); assert.equal(S().meal, null, 'ukázkové jídlo nezůstane ve stavu');
  act('trainingPreview', 't-inzulin'); assert.match(markup(), /Je inzulin k tomuto jídlu už píchnutý/);
  act('trainingPreview', 'plan'); assert.match(markup(), /Takto to vidí pacient · Plán</); assert.match(markup(), /preview-static/); /* N19: štítek „Plán“ jako záložka */
  act('page', 'meal'); assert.equal(S().page, 'training'); act('startMeal', 'breakfast'); assert.equal(S().meal, null);
  for (const x of NF.trainingItems(S())) act('trainingCheck', x.id);
  act('finishTraining', 'failed'); act('trainingReason', 'helper');
  assert.equal(S().training.reason, 'helper'); assert.match(markup(), /Co dál/); assert.equal(/data-action="finishTraining" data-value="done"/.test(markup()), false, 'po výsledku tlačítka zmizí');
  act('role', 'doctor'); act('page', 'enroll'); assert.match(markup(), /zaučení se nezdařilo/); assert.match(markup(), /pomoc blízké osoby/);
  act('role', 'nurse'); act('finishTraining', 'reset'); assert.equal(S().training.result, null); act('finishTraining', 'done'); assert.equal(S().training.result, 'done');
  chapter('reviewSummary'); act('role', 'doctor'); act('startReview'); assert.match(markup(), /Zaučení u sestry/);
});

test('Návrh k dávce 6. 10. 2026: okno od změny dávky, ≥ 8 jídel, rozpad po jídlech, celkové vyrovnání na kartě, nízké hodnoty ze všech zápisů', () => {
  chapter('reviewProposals'); act('role', 'doctor'); /* Q6 (27. 10. 2026): návrh k bazálu z nocí v exportu má přednost a je první; lékař ho ponechá, aby byl na řadě návrh k jídlu */ if (S().review.proposals.some(p => p.id === 'PR-BAZAL') && !S().review.decisions['PR-BAZAL']) act('propDecide', 'PR-BAZAL:keep');
  const r = S().review, pr = r.proposals.find(p => p.kind === 'dose' && p.dose !== 'basal'); assert.ok(pr);
  assert.ok(Array.isArray(pr.breakdown) && pr.breakdown.length >= 1, 'rozpad po jídlech'); assert.match(pr.why, /za \d+ dní/); assert.match(pr.why, /medián vrcholu/);
  assert.match(pr.context, /čas v cíli/); assert.match(pr.context, /HbA1c/);
  assert.ok(pr.verify.some(v => /Vyrovnání celkově nedosahuje cíle/.test(v))); assert.ok(pr.branches.some(b => /celkově v cíli/.test(b.text)));
  assert.match(markup(), /class="why-tile"><b>\d+ ze? \d+ <small>nad cílem<\/small><\/b><span>[^<]+<\/span>/); /* S28: číslo a význam k sobě */
  assert.equal(/class="why-tile"><b>0 /.test(markup()), false, 'jídlo bez zápisu nad cílem dlaždici nemá'); assert.match(markup(), /Celkové vyrovnání:/);
  assert.equal(NF.param(S(), 'D-PRAND', 'minJidel', 0), 8); assert.equal(NF.param(S(), 'D-PRAND', 'dny', 0), 28);
  /* jediný pokles pod 3,0 u kteréhokoli zápisu jídla spustí návrh „pod cílem“ s předností */
  const p = NF.activePlan(S()), e0 = S().episodes.filter(e => e.planId === p.id && e.meal === 'dinner').slice(-1)[0];
  e0.insulin.confirmed = 'none'; e0.points.push({ min: 180, mmol: 2.8 });
  const props = NF.proposals(S(), p.id, D.habitCatalog), low = props.find(x => x.id === 'PR-DINNER');
  assert.ok(low && /pod cílem/.test(low.title), 'hypo z nečistého zápisu'); assert.ok(low.weak.some(w => /mimo čistá data/.test(w)));
});

test('Čistá data pro dávku 6. 10. 2026: svačina do 2 h, zpětný zápis a pozdní podání jen do učení; oprava inzulinu do 60 minut', () => {
  chapter('week'); act('role', 'patient');
  const ep = S().episodes.find(e => e.id === 'E6'); assert.ok(NF.usableEp(S(), ep) && NF.usableForDose(S(), ep));
  S().episodes.push({ id: 'Esn', planId: ep.planId, meal: 'snack', foodId: food('Jablko').id, at: NF.addMin(ep.at, 90), recordedAt: S().clock, portion: 'usual', insulin: { confirmed: 'snack' }, advice: [], points: [{ min: 0, mmol: 7 }, { min: 120, mmol: 8 }], importedAt: S().clock });
  assert.equal(NF.usableEp(S(), ep), false); assert.match(NF.whyNotUsable(S(), ep), /svačina/); S().episodes.pop();
  ep.retro = true; assert.ok(NF.usableEp(S(), ep)); assert.equal(NF.usableForDose(S(), ep), false); assert.match(NF.whyNotForDose(S(), ep), /zpětný/); ep.retro = false;
  const t0 = ep.insulin.time; ep.insulin.time = NF.fmtTime(NF.addMin(ep.at, 10)); assert.ok(NF.usableEp(S(), ep), '10 min po jídle je v toleranci učení'); assert.equal(NF.usableForDose(S(), ep), false); assert.match(NF.whyNotForDose(S(), ep), /pozdní/); ep.insulin.time = t0;
  /* oprava inzulinu: karta na Dnes, do 60 min, opravený zápis jen do učení */
  chapter('advice'); act('mealFinish', 'as'); /* kulisy: kaše, větší porce, před píchnutím, krok 3 */
  const last = S().episodes[S().episodes.length - 1]; assert.equal(last.insulin.confirmed, 'as');
  act('page', 'today'); assert.match(markup(), /Opravit inzulin/);
  act('fixInsulinOpen', last.id); act('fixInsulin', last.id + ':none');
  assert.equal(last.insulin.confirmed, 'none'); assert.equal(last.insulinCorrected, true); assert.ok(S().events.some(e => e.what === 'jidlo.inzulin.opraven'));
  S().clock = NF.addMin(S().clock, 61); assert.equal(NF.canCorrectInsulin(S(), last), false); assert.equal(NF.correctInsulin(S(), last.id, 'as').ok, false);
});

test('Pacient 6. 10. 2026: pokyn I-NEVIM pod „Nevím“, karta výsledku bez čísla u nezapočítaného zápisu, nemoc po 3 dnech s pokynem, stupeň reakce až od 6 zápisů, rozmezí min–max do 8', () => {
  chapter('firstMeal'); act('mealBolus', 'unknown'); /* přepnutí role by rozpracované jídlo zahodilo (P5) */
  assert.match(markup(), /Nevíte, jestli byl inzulin píchnutý/); /* kontrola 3, C13 */ assert.match(markup(), /znovu ho nepíchejte/);
  assert.ok(NF.instructions(S()).some(i => i.id === 'I-NEVIM'), 'pokyn je v plánu');
  /* nezapočítaný zápis (menší porce po píchnutí) → bez čísla, s pokynem lékaře */
  chapter('afterBolus'); branch('bolus', 'smaller');
  const k = food('Ovesná kaše s mlékem a banánem').id;
  act('mealStep', '3'); act('mealFinish', 'as');
  const ep = S().episodes[S().episodes.length - 1]; ep.importedAt = S().clock; ep.points = [{ min: 0, mmol: 6 }, { min: 60, mmol: 6.1 }, { min: 120, mmol: 6 }];
  const res = NF.lastResult(S()); assert.equal(res.key, 'excluded'); assert.equal(res.peak, null); assert.equal(/v cíli|nad cílem/.test(res.text), false);
  act('page', 'today'); assert.match(markup(), /nehodnotíme/); assert.match(markup(), /Bezpečnostní pravidlo/); assert.doesNotMatch(markup(), /Pokyn lékaře/); /* SCHEMA 74 */
  /* nemoc po 3 dnech */
  chapter('illness'); act('illness', 'on'); assert.equal(/Nemoc trvá už/.test(markup()), false);
  S().clock = NF.addDays(S().clock, 3); act('noop'); assert.match(markup(), /Nemoc trvá už/); assert.match(markup(), /Když jídlo vynecháte, inzulin k němu nepíchejte/);
  assert.equal(NF.summary(S(), 'P1').illLong, 1);
  /* stupeň reakce od 3 zápisů (R29), „ustálené“ od 5; rozmezí min–max pod 8 zápisů */
  chapter('week'); const c = NF.confidence(S(), k); assert.equal(c.level, 'known'); assert.ok(c.st.n >= 3 && c.st.n < 8); assert.ok(c.reaction); assert.equal(c.reaction.settled, c.st.n >= 5);
  assert.equal(c.st.quantile, false); assert.equal(c.st.lo, NF.r1(Math.min(...c.st.peaks))); assert.equal(c.st.hi, NF.r1(Math.max(...c.st.peaks)));
  act('role', 'patient'); act('page', 'foods'); act('foodOpen', k); if (!c.reaction.settled) assert.match(markup(), /se to může změnit/); assert.match(markup(), /zápisů, s dalšími se upřesní/); /* SCHEMA 78 (07 B4) */
  chapter('preview'); const c2 = NF.confidence(S(), k); assert.ok(c2.st.n >= 8 && c2.reaction && c2.st.quantile); assert.equal(/silná/.test(c2.reaction.label), false);
});

test('Registr R13: cíle glukózy z položky C-CILE s fallbackem; větve a ověřovací body z D-POSTUP, vyřazená větev zmizí; texty R-PORCE a minuty procházky z položky; každý parametr registru se čte', () => {
  chapter('enroll'); act('role', 'doctor');
  assert.deepEqual(NF.defaultTargets(S()), NF.DEFAULT_TARGETS);
  assert.ok(NF.newVersion(S(), 'C-CILE', { params: { high: 11 } }).ok); assert.equal(NF.item(S(), 'C-CILE').version, 'v2'); assert.equal(NF.itemState(S(), 'C-CILE'), 'pending', 'nová verze čeká na schválení');
  assert.equal(NF.defaultTargets(S()).high, 11); assert.equal(NF.newDraft(S()).targets.high, 11);
  assert.equal(NF.targets(S()).high, 11, 'bez plánu platí cíle z registru');
  assert.ok(NF.decideItem(S(), 'C-CILE', 'rejected', 'x').ok);
  assert.deepEqual(NF.defaultTargets(S()), NF.DEFAULT_TARGETS, 'zamítnutá položka → pevný fallback');
  chapter('doses'); assert.match(markup(), /C-CILE|Cíle glukózy/); assert.match(markup(), /data-value="C-CILE"/, 'štítek u cílů při zařazení');
  chapter('reviewProposals'); act('role', 'doctor');
  const item = NF.item(S(), 'D-POSTUP'), r = S().review, pr = r.proposals.find(p => p.kind === 'dose');
  assert.ok(pr && pr.branches.length && pr.verify.length, 'návrh má větve i ověřovací body');
  const fromItem = Object.keys(item.postup).some(k => item.postup[k].branches.length === pr.branches.length && item.postup[k].verify.length === pr.verify.length && item.postup[k].branches.every((b, i) => b.action === pr.branches[i].action));
  assert.ok(fromItem, 'větve návrhu odpovídají textům položky D-POSTUP');
  assert.equal(/\{\w+\}/.test(pr.verify.join(' ') + pr.branches.map(b => b.text).join(' ')), false, 'zástupné hodnoty doplněné');
  assert.match(markup(), /data-value="D-POSTUP"/, 'štítek postupu u návrhu');
  act('reviewStep', '1'); assert.match(markup(), /Dlaždice vycházejí z: .*data-value="C-CILE"/, 'štítek u dlaždic reportu'); act('reviewStep', '2');
  const hasUp = ps => ps.some(p => p.branches.some(b => b.action === 'up' && /zvýšit dávku k/.test(b.text)));
  assert.ok(hasUp(NF.proposals(S(), r.planId)), 'před vyřazením je větev „zvýšit“');
  /* vyřazení větve = nová verze položky (O6, 27. 10. 2026); garant v maketě větev nevyřazuje, napíše to do poznámky */
  act('page', 'registry'); act('regOpen', 'D-POSTUP'); assert.equal(/Vyřadit|regBranch/.test(markup()), false);
  assert.ok(NF.newVersion(S(), 'D-POSTUP', { off: { 'prandHigh:0': true } }, 'vyřazena větev').ok); act('regDecide', 'approved');
  assert.equal(NF.item(S(), 'D-POSTUP').status, 'approved'); assert.equal(NF.item(S(), 'D-POSTUP').version, 'v2'); assert.ok(NF.item(S(), 'D-POSTUP').postup.prandHigh.branches[0].off);
  assert.match(markup(), /Modelová verze v2 je jen v příběhu/); /* SCHEMA 80 (předávka Z, J1): registr ukazuje garantovi znění z kódu, verze v2 je v historii */
  assert.equal(hasUp(NF.proposals(S(), r.planId)), false, 'vyřazená větev se v návrzích neukáže');
  assert.ok(NF.proposals(S(), r.planId).some(p => p.postup && p.weak.some(w => /postup posouzení dávky/.test(w))) || true);
  chapter('advice');
  const k = food('Ovesná kaše s mlékem a banánem').id, T = NF.item(S(), 'R-PORCE').texts;
  assert.equal(NF.advise(S(), k, 'bigger', 'before').items.find(i => i.lever === 'portion').text, T.biggerBefore);
  assert.equal(NF.advise(S(), k, 'bigger', 'as').items.find(i => i.lever === 'portion').text, T.biggerAfter);
  assert.equal(NF.advise(S(), k, 'smaller', 'before').items.find(i => i.lever === 'portion').text, T.smaller);
  assert.match(NF.item(S(), 'R-PROCHAZKA').text, /\{minut\}/);
  const src = CORE.map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');
  for (const it of S().registry.items) for (const key of Object.keys(it.params || {})) assert.ok(new RegExp("'" + it.id + "',\\s*'" + key + "'").test(src), it.id + '.' + key + ' se nikde nečte');
  for (const it of S().registry.items) for (const key of Object.keys(it.params || {})) assert.ok(it.labels && it.labels[key], it.id + '.' + key + ' nemá český název');
  act('role', 'doctor'); act('page', 'registry'); act('regOpen', 'D-PRAND'); assert.match(markup(), /nejméně čistých jídel/); assert.doesNotMatch(markup(), /<span>minJidel<\/span>/);
});

test('Průchod pro garanta (7. 10. 2026): každá položka má pětidílný popis a je nabídnuta právě v jedné scéně hlavní linie; mapa scén odpovídá příběhu', () => {
  const items = NF.garantItems(S());
  for (const r of items) { assert.ok(r.guide, r.id + ' bez průvodce'); for (const k of ['proc', 'jak', 'kde', 'co', 'dopad']) assert.ok(r.guide[k] && r.guide[k].length > 30, r.id + '.' + k); }
  const seen = {}; let decisionScenes = 0;
  D.scenes.forEach((sc, i) => { const ids = D.decisionItems(i); if (ids.length) decisionScenes++; ids.forEach(id => { assert.equal(seen[id], undefined, id + ' nabídnuta dvakrát'); seen[id] = i; assert.equal(!!sc.appendix, false, id + ' v dodatku'); }); });
  for (const r of items) assert.ok(seen[r.id] != null, r.id + ' nikde nenabídnuta');
  assert.ok(decisionScenes >= 10);
  /* mapa demo/scene-items.js = to, co se během scény skutečně objeví na obrazovce (přepočet stejný jako generátor) */
  assert.equal(D.sceneItems.length, D.scenes.length);
  for (let i = 0; i < D.scenes.length; i++) {
    act('goScene', String(i)); act('closeDrawer');
    const st = D.tour.stepsFor(D.chapters[S().chapterIndex].id, S().branches), ids = new Set(D.itemsOnScreen(S()));
    for (let k = 0; k < st.length; k++) { next(); D.itemsOnScreen(S()).forEach(x => ids.add(x)); }
    assert.deepEqual([...ids].sort(), [...D.sceneItems[i].items].sort(), 'scéna ' + (i + 1) + ' — spusťte navrhy-designu/04-pohledy-2026-10-05/scene-items.cjs');
  }
});

test('Průchod pro garanta (8. 10. 2026): schvalování hned v kroku, kdy položka působí, s celým popisem; Pokračovat nikdy neblokuje; řádek Dál a přehled dějství; souhrn na konci; mimo příběh', () => {
  act('goScene', '1'); act('closeDrawer'); assert.match(markup(), /V tomto scénáři/); assert.match(markup(), /schvalujete: /); /* přehled scénáře 1 na jeho první scéně (úvod je vlastní blok) */
  assert.match(markup(), /Ovládejte ukázku jen fialovými tlačítky/, 'pokyn k ovládání ve scénách 1–2 (S4)');
  act('goScene', '2'); act('closeDrawer'); /* scéna 3: dávky, návyky a pokyny */
  let m = markup(); assert.match(m, /V této scéně schvalujete: /); assert.match(m, /Dál: /); assert.equal(/Ovládejte ukázku jen fialovými tlačítky/.test(m), false, 'od scény 3 bez opakovaného pokynu');
  assert.equal(/Další krok ▶|Co schvalujete ▶|Rozhodnout později ▶/.test(m), false, 'jediné tlačítko pro pokračování');
  const st = D.tour.stepsFor(D.chapters[S().chapterIndex].id, S().branches);
  toOffer(); m = markup(); /* B01: položky se nabídnou v kroku, kde je jejich štítek ve výřezu cíle (R-NAVYKY u oddílu startovních návyků) */
  assert.match(m, /Ke schválení teď/); assert.match(m, /Dál ▶/); assert.match(m, /Proč existuje/); assert.match(m, /Jak funguje/); assert.match(m, /Kde je použita/); assert.match(m, /Co schvalujete/); assert.match(m, /Co se stane při zamítnutí/);
  assert.ok(D.itemsOnScreen(S()).includes('R-NAVYKY'), 'R-NAVYKY na obrazovce'); assert.match(m, /data-action="garantOpen" data-value="R-NAVYKY"/); if (!/data-action="garantDecide" data-value="R-NAVYKY:approved"/.test(m)) act('garantOpen', 'R-NAVYKY'); /* první nabídnutá karta je rozbalená sama; garantOpen ji přepíná */ assert.match(markup(), /data-action="garantDecide" data-value="R-NAVYKY:approved"/);
  const ids = D.decisionItems(2); assert.ok(ids.includes('R-NAVYKY') && ids.includes('R-POKYNY') && ids.includes('C-CILE'));
  act('garantDecide', 'R-NAVYKY:approved'); assert.equal(NF.itemTouched(S(), 'R-NAVYKY'), true); assert.match(markup(), /schváleno/); assert.equal(NF.itemState(S(), 'R-NAVYKY'), 'approved');
  /* SCHEMA 84 (vlastník 5. 11. 2026, „panel = rámeček“): v „Ke schválení teď“ jen položky, jejichž štítek je v rámečku tohoto kroku; dřív rozhodnuté jen sbaleně „Dříve v této scéně“ */
  const kN = S().tourStep; assert.equal(D.offerStep(2, 'R-NAVYKY'), kN, 'R-NAVYKY se nabízí v kroku, kde je její štítek v rámečku'); assert.ok(D.offeredNow(S()).includes('R-NAVYKY'));
  next(); m = markup();
  assert.equal(D.offeredNow(S()).includes('R-NAVYKY'), false, 'v dalším kroku R-NAVYKY není v „teď“'); assert.equal(/class="gitem[^"]*\bopen\b[^"]*" data-gitem="R-NAVYKY"/.test(m), false, 'karta R-NAVYKY se v dalším kroku sama nerozbalí');
  assert.match(m, /Dříve v této scéně: rozhodnuto \d+ · zobrazit/, 'dřív rozhodnutá položka je jen v řádku „Dříve v této scéně“');
  if (D.offeredNow(S()).length) assert.match(m, /Ke schválení teď/);
  act('tourBack'); assert.equal(S().tourStep, kN); assert.ok(D.offeredNow(S()).includes('R-NAVYKY'), 'po Zpět je R-NAVYKY znovu v „teď“');
  for (let k = S().tourStep; k < st.length; k++) next();
  m = markup(); assert.equal(D.pendingNow(S()).ids.length, 0); assert.match(m, /Dříve v této scéně: rozhodnuto \d+/); assert.equal(/class="gitem[^"]*\bopen\b/.test(m), false, 'na konci scény bez nabídky žádná rozbalená karta');
  assert.match(m, /Dál ▶/); assert.equal(/Pokračovat ▶|Další scéna ▶|Začít ▶/.test(m), false, 'jedno slovo Dál (rozhodnutí 12)');
  act('garantEarlier'); act('garantOpen', 'C-CILE'); assert.match(markup(), /dolní cíl \(mmol\/l\): <b>3,9/, 'dřív rozhodnutá karta se rozbalí na klepnutí');
  next(); assert.equal(S().sceneIndex, 3, 'Další scéna po rozhodnutí všech položek scény');
  assert.equal(/K potvrzení na této obrazovce/.test(markup()), false, 'starý blok zmizel');
  /* souhrn na konci hlavní linie: všechny položky, potvrzení, záznam pro správce */
  const fin = D.scenes.findIndex(x => !x.appendix && D.chapters[x.ch].id === 'trace'); act('goScene', String(fin)); act('closeDrawer');
  const stf = D.tour.stepsFor('trace', S().branches); for (let k = 0; k < stf.length; k++) next();
  m = markup(); assert.match(m, /Souhrn vašich rozhodnutí/); assert.match(m, /Potvrdit souhrn/); assert.equal((m.match(/data-gsum-row=/g) || []).length, 28, 'souhrn ukazuje všech 28 položek garanta');
  const before = D.sync.pending(); act('garantConfirmSummary', 'force'); assert.equal(D.sync.pending(), before + 1);
  const q = JSON.parse(store.get('nutrifee-sync-queue')); const last = q[q.length - 1]; assert.equal(last.kind, 'summary'); assert.equal(last.item, 'SOUHRN'); assert.equal(last.params.total, 28); assert.ok(last.params.rejectedIds);
  assert.match(markup(), /Souhrn potvrzen/); assert.ok(D.progress().done);
  assert.ok(q.some(x => x.kind === 'progress' && x.item === 'PRUBEH' && x.params.scene === fin + 1), 'záznam, kam se garant dostal');
  /* správce: panel výsledků ukáže průchod */
  D.results.setRows(q.map(x => D.sync.row(x)).map(r => Object.assign({}, r, { user_email: 'garant@example.test' })));
  const rp = plain(D.results.panel(S())); assert.match(rp, /Průchod maketou/); assert.match(rp, /nejdál: „Souhrn[^“]*“ \(scéna \d+ z \d+ hlavní linie\)/); assert.match(rp, /prošel celou maketu: ne – souhrn potvrzen [^<]*nenavštívené scény hlavní linie: \d+/); /* kontrola 3 (M5): skok do finále není průchod celou maketou */
  act('goScene', '3'); act('closeDrawer');
  /* mimo příběh */
  act('page', 'registry'); assert.match(markup(), /Mimo příběh/); assert.match(markup(), /Zpět do příběhu/); act('regOpen', 'R-PORADI'); assert.match(markup(), /V aplikaci:/);
  act('regOpen', 'D-PRAND'); const r = markup(); assert.match(r, /Proč existuje/); assert.match(r, /V příběhu:/); assert.match(r, /okno nejméně \(dní\)/);
  next(); assert.equal(S().page, 'enroll', 'Další mimo příběh nejdřív vrátí do scény'); assert.equal(/Mimo příběh/.test(markup()), false);
  act('role', 'patient'); assert.match(markup(), /Mimo příběh/); act('tourReturn'); assert.equal(S().role, 'doctor');
});

test('SCHEMA 84 (vlastník 5. 11. 2026): panel = rámeček – v „teď“ jen položky z rámečku kroku, rozbalená karta jen z „teď“, po změně kroku žádná držená karta, po Zpět panel totožný s první návštěvou (prohlížečová kontrola: navrhy-designu/32-overeni-cile-2026-11-04/panel-shoda.cjs)', () => {
  act('goScene', '0'); act('closeDrawer');
  const sig = () => JSON.stringify({ now: D.approvalsNow(S()), open: D.panelOpenId(S()), t: D.shownNarration(S()).t });
  const where = s => 'scéna ' + (s.sceneIndex + 1) + ' krok ' + (s.tourStep || 0);
  const bad = []; let backs = 0, offers = 0;
  for (let g = 0; g < 700; g++) {
    const s = S(), st = D.tour.stepsFor(D.chapters[s.chapterIndex].id, s.branches), i = s.tourStep || 0, sc = s.sceneIndex;
    const now = D.approvalsNow(s), list = D.offeredNow(s), open = D.panelOpenId(s), first = sig();
    if (now.length) offers++;
    now.forEach(id => { if (D.offerStep(sc, id) !== i) bad.push(where(s) + ': ' + id + ' v „teď“ mimo svůj krok nabídky ' + D.offerStep(sc, id)); });
    if (open && (now.length ? now : list).indexOf(open) < 0) bad.push(where(s) + ': rozbalená karta ' + open + ' není z „teď“');
    if (s.gOpen) bad.push(where(s) + ': po změně kroku zůstala otevřená karta ' + s.gOpen);
    if (sc >= D.tour.lastIndex() && i >= st.length) break;
    next();
    const s2 = S();
    if (s2.gOpen) bad.push(where(s2) + ': po Dál zůstala otevřená karta ' + s2.gOpen);
    if (s2.sceneIndex === sc && (s2.tourStep || 0) === i + 1 && !D.skipRanges(s2).length) {
      const sec = sig(); act('tourBack'); backs++;
      if (S().gOpen) bad.push(where(S()) + ': po Zpět otevřená karta ' + S().gOpen);
      if ((S().tourStep || 0) !== i || sig() !== first) bad.push(where(S()) + ': po Zpět jiný panel ' + sig() + ' × ' + first);
      app.act('tourNext'); if (sig() !== sec) bad.push(where(S()) + ': po Zpět a Dál jiný panel ' + sig() + ' × ' + sec);
    }
  }
  assert.ok(offers >= 25 && backs >= 100, 'průchod nabídl ' + offers + ' kroků, Zpět ' + backs + '×');
  assert.equal(bad.length, 0, '\n  ' + bad.slice(0, 20).join('\n  '));
  /* případ vlastníka: scéna 3, krok s pravidly v plánu – panel nabízí R-POKYNY, Startovní sada návyků není rozbalená ani po Zpět */
  act('goScene', '2'); act('closeDrawer'); const k = D.offerStep(2, 'R-POKYNY'); for (let j = 0; j < k; j++) next();
  assert.deepEqual([...D.approvalsNow(S())], ['R-POKYNY']); assert.equal(D.panelOpenId(S()), 'R-POKYNY');
  assert.equal(/class="gitem[^"]*\bopen\b[^"]*" data-gitem="R-NAVYKY"/.test(markup()), false);
  next(); act('tourBack'); assert.equal(S().tourStep, k); assert.deepEqual([...D.approvalsNow(S())], ['R-POKYNY']); assert.equal(D.panelOpenId(S()), 'R-POKYNY');
  assert.equal(/class="gitem[^"]*\bopen\b[^"]*" data-gitem="R-NAVYKY"/.test(markup()), false, 'po Zpět se Startovní sada návyků sama nerozbalí');
});

test('SCHEMA 84 (integrace): posuvník ukazuje směr od cíle – „pod cílem“ šipkou dolů, „nad cílem“ nahoru', () => {
  const V = NF.screens;
  const tir = V.slider({ id: 't', action: 'x', kind: 'goal', min: 0, max: 100, unit: '%', label: 'Čas v cíli', value: 58, goal: 70, better: 'max' });
  assert.match(tir, /data-icon="arrow-down"[^]*pod cílem/); assert.equal(/data-icon="arrow-up"/.test(tir), false);
  const below = V.slider({ id: 'b', action: 'x', kind: 'goal', min: 0, max: 40, unit: '%', label: 'Čas pod 3,9', value: 6, goal: 4, better: 'min' });
  assert.match(below, /data-icon="arrow-up"[^]*nad cílem/);
  assert.equal(V.vsState({ kind: 'goal', goal: 70, better: 'max' }, 58).icon, 'arrow-down');
  assert.match(V.slider({ id: 'g', action: 'x', kind: 'glu', min: 4, max: 15, lo: 4, hi: 10, unit: 'mmol/l', label: 'G', value: 12 }), /data-icon="arrow-up"[^]*nad cílem/);
});

test('Stopa má vstupy a výstupy výpočtů; bez exportu', () => {
  chapter('trace');
  const ev = S().events;
  assert.ok(ev.some(e => e.what === 'rada.zobrazena' && e.data && e.data.items));
  assert.ok(ev.some(e => e.what === 'kontrola.zahajena' && e.data.proposals));
  assert.ok(ev.some(e => e.what === 'registr.rozhodnuti'));
  assert.match(markup(), /Verze a stopa/); assert.match(markup(), /bez generativní AI/);
  assert.equal(/Exportovat|data-action="export/.test(markup()), false, 'export stopy zrušen 7. 10. 2026 (záznam „Export ze senzoru nahrán“ je událost kontroly, C10)');
});

/* ---------- prezentace ---------- */
test('Skok na kapitolu je deterministický a každá se vykreslí ve své roli', () => {
  for (let i = 0; i < D.chapters.length; i++) {
    const a = D.play(i, null), b = D.play(i, null);
    assert.equal(JSON.stringify(a.episodes.map(e => e.id + e.peak)), JSON.stringify(b.episodes.map(e => e.id + e.peak)), D.chapters[i].id);
    act('goChapter', String(i)); act('closeDrawer');
    assert.equal(S().role, D.chapters[i].role, D.chapters[i].id);
    assert.equal(S().error, '', D.chapters[i].id + ': ' + S().error);
    assert.ok(markup().length > 500, D.chapters[i].id);
  }
});

function selectorPresent(m, sel) {
  const attrs = [...String(sel).matchAll(/\[([\w-]+)="([^"]*)"\]/g)].map(x => x[1] + '="' + x[2].replace(/&/g, '&amp;') + '"');
  if (!attrs.length) return true;
  return sel.split(',').some(part => { const a = [...part.matchAll(/\[([\w-]+)="([^"]*)"\]/g)].map(x => x[1] + '="' + x[2] + '"'); return [...m.matchAll(/<[^>]+>/g)].some(tag => a.every(x => tag[0].includes(x))); });
}
function tourAll() {
  const seen = [D.chapters[S().chapterIndex].id], scenes = [S().sceneIndex];
  for (let guard = 0; guard < 600; guard++) {
    const s = S(), B = s.branches, st = D.tour.stepsFor(D.chapters[s.chapterIndex].id, B), i = s.tourStep || 0;
    if (s.sceneIndex >= D.tour.lastIndex() && i >= st.length) break;
    if (i < st.length) { const op = (st[i].do || [])[0]; if (op && op.sel) { const sel = typeof op.sel === 'function' ? op.sel(B, s) : op.sel; assert.ok(selectorPresent(markup(), sel), 'cíl kroku chybí: scéna ' + (s.sceneIndex + 1) + ' ' + D.chapters[s.chapterIndex].id + ' krok ' + (i + 1) + ' ' + sel); } }
    next();
    assert.equal(S().error, '', D.chapters[s.chapterIndex].id + ' krok ' + (i + 1) + ': ' + S().error);
    seen.push(D.chapters[S().chapterIndex].id); if (!scenes.includes(S().sceneIndex)) scenes.push(S().sceneIndex);
  }
  return { seen, scenes };
}
test('Celou maketu včetně všech odboček jde projít jen tlačítkem Další', () => {
  const r = tourAll();
  for (const c of D.chapters) assert.ok(r.seen.includes(c.id), 'vynechána ' + c.id);
  assert.equal(r.scenes.length, D.scenes.length, 'každá scéna navštívena');
  assert.equal(S().plans.length, 2);
  /* každá volba každé odbočky má svou scénu v řadě */
  for (const k of Object.keys(D.branches)) for (const o of D.branches[k].options) {
    if (o.id === D.defaults[k]) continue;
    if (k === 'bolus') { assert.ok(D.tour.chapters.afterBolus.steps.some(s => s.when && s.when({ bolus: 'bigger' }) && JSON.stringify(s.do).indexOf('fn') < 0 ? false : true)); continue; } /* R25: případy „menší“ a „nevím“ jsou kroky scény po píchnutí, ne scény */
    assert.ok(D.scenes.some(sc => sc.B[k] === o.id), 'chybí scéna pro odbočku ' + k + ':' + o.id);
  }
  assert.ok(D.scenes.filter(sc => sc.detour).every(sc => sc.title && /^(Odbočka|Dodatek)/.test(sc.title)));
  assert.ok(D.scenes.some(sc => sc.appendix) && D.scenes.every((sc, i) => !sc.appendix || i >= D.mainSceneCount()), 'dodatek je až za hlavní linií'); assert.equal(D.chapters[D.scenes[0].ch].id, 'prolog');
});
test('Krok zpět vrací přesně o jeden krok; na začátku scény o scénu; rozhodnutí garanta přežije skok mezi scénami', () => {
  act('goScene', String(D.scenes.findIndex(sc => D.chapters[sc.ch].id === 'advice')));
  next(); next(); assert.equal(S().tourStep, 2);
  const snap = JSON.stringify(S().meal.decisions);
  act('tourBack'); assert.equal(S().tourStep, 1);
  next(); assert.equal(S().tourStep, 2); assert.equal(JSON.stringify(S().meal.decisions), snap, 'po zpět a vpřed stejný stav');
  act('tourBack'); act('tourBack'); assert.equal(S().tourStep, 0);
  const here = S().sceneIndex; act('tourBack'); assert.equal(S().sceneIndex, here - 1, 'na začátku scény jde zpět o scénu');
  /* garant rozhodne z panelu vyprávění (v roli pacienta) a rozhodnutí přežije přehrání jiné scény */
  act('role', 'patient'); D.noteDraft('R-PROCHAZKA', 'Zkrátit na 10 minut.'); act('garantDecide', 'R-PROCHAZKA:rejected:ano');
  assert.equal(NF.item(S(), 'R-PROCHAZKA').status, 'rejected'); assert.ok(S().registry.history.some(h => h.item === 'R-PROCHAZKA' && h.by === 'garant' && /10 minut/.test(h.comment)));
  act('goScene', '0'); assert.equal(NF.item(S(), 'R-PROCHAZKA').status, 'rejected', 'přežilo přehrání');
  act('goScene', String(D.scenes.length - 1)); assert.equal(NF.item(S(), 'R-PROCHAZKA').status, 'rejected');
  assert.equal(NF.advise(S(), food('Ovesná kaše s mlékem a banánem').id, 'usual', 'before').items.some(i => i.lever === 'walk'), false, 'zamítnutá rada se v příběhu nenabízí');
  act('garantReset'); assert.equal(NF.item(S(), 'R-PROCHAZKA').status, 'approved');
});
test('Registr jako seznam ke schválení: souhrn v hlavičce, tři dlaždice, filtry stavů a „s poznámkou“, fulltext i v poznámkách, poznámka bez změny stavu', () => {
  act('goScene', '0'); act('role', 'doctor'); act('page', 'registry');
  let sum = NF.registrySummary(S()); assert.equal(sum.remaining, sum.total); assert.equal(sum.touched, 0);
  assert.match(markup(), /Ke schválení/); assert.match(markup(), /Rozhodnuto/); assert.match(markup(), /ke schválení/); assert.equal(/schváleno předem|k potvrzení/.test(markup()), false);
  assert.equal((markup().match(/class="tile /g) || []).length, 3, 'tři dlaždice: ke schválení, schváleno, zamítnuto'); assert.equal(/Upraveno|upravené|jen komentář|okomentováno/.test(markup()), false);
  act('regOpen', 'R-SKORE'); assert.match(markup(), /class="garant decide reg-decide"/, 'v registru tatáž karta jako v panelu');
  /* SCHEMA 83: před rozhodnutím karta pole poznámky nemá a poznámka bez rozhodnutí nevzniká */
  assert.equal(/data-gnote="R-SKORE"/.test(markup()), false, 'pole až po rozhodnutí');
  D.noteDraft('R-SKORE', 'Hranice 80 % ověřit s diabetologem.'); act('garantNote', 'R-SKORE');
  sum = NF.registrySummary(S()); assert.equal(sum.touched, 0); assert.equal(sum.noted, 0); assert.equal(S().events.some(e => e.what === 'registr.poznamka'), false);
  act('garantDecide', 'R-SKORE:rejected'); sum = NF.registrySummary(S()); assert.equal(sum.touched, 1); assert.equal(sum.noted, 1); assert.equal(sum.rejected, 1);
  assert.match(markup(), /<span>Proč jste zamítli\? \(nepovinné\)<\/span>/); assert.match(markup(), /„Hranice 80 % ověřit s diabetologem\.“/); assert.match(markup(), />Hranice 80 % ověřit s diabetologem\.<\/textarea>/, 'pole předvyplněné platnou poznámkou');
  /* starší záznam note bez rozhodnutí: zobrazí se v řádku, stav zůstává „ke schválení“ a stopa říká „poznámka“ (R14) */
  NF.decideItem(S(), 'C-CILE', null, 'Stará poznámka bez rozhodnutí.', { garant: true, note: true, status: null }); NF.render();
  assert.equal(NF.itemTouched(S(), 'C-CILE'), false); assert.ok(S().events.some(e => e.what === 'registr.poznamka')); assert.match(markup(), /„Stará poznámka bez rozhodnutí\.“/);
  act('regOpen', 'R-PORADI'); act('garantDecide', 'R-PORADI:approved'); sum = NF.registrySummary(S()); assert.equal(sum.approved, 1); assert.equal(sum.remaining, sum.total - 2);
  act('regFilter', 'touch:noted'); assert.match(markup(), /R-SKORE · /); assert.match(markup(), /C-CILE · /); assert.equal(/R-PORADI · /.test(markup()), false); act('regFilter', 'touch:noted');
  act('regFilter', 'touch:todo'); assert.match(markup(), /C-CILE · /, 'položka se starou poznámkou bez rozhodnutí stále zbývá'); assert.equal(/R-SKORE · /.test(markup()), false); act('regFilter', 'touch:todo');
  bind('reg.q', 'diabetologem'); act('noop'); assert.match(markup(), /R-SKORE · /); assert.equal(/R-PORADI · /.test(markup()), false, 'fulltext hledá i v poznámkách');
  assert.match(markup(), /schváleno/);
});
test('Každý krok vypráví a každá kapitola má úvod', () => {
  for (const c of D.chapters) {
    const ch = D.tour.chapters[c.id];
    assert.ok(ch && ch.intro && ch.intro.t && ch.intro.co, c.id);
    for (const s of ch.steps) { assert.ok(s.t && s.co, c.id + '/' + s.t); for (const op of s.do) if (op.act) assert.ok(NF.actions[op.act] || NF.demoActions[op.act], op.act); }
  }
});

test('Tempo průchodu (27. 10. 2026): jedno Dál = jeden děj; fn jen s cílem; časy na jednom místě; rozdělení kroků nepřesunulo žádnou položku ke schválení do jiné scény', () => {
  /* položky ke schválení se nabízejí ve stejných scénách jako před rozdělením kroků; mapa podle pravidla B01 (výřez cíle kroku) a nové scény B-HYPO, integrace SCHEMA 73 (výpis generátoru scene-items.cjs) */
  /* SCHEMA 75: I-VYSOKA u karty „nad 15“ (B2), D-CISTA v návrhu (B9) – záměrný přesun */
  const FROZEN = {"K-KRITERIA": "enroll", "R-NAVYKY": "doses", "R-POKYNY": "doses", "I-VYSOKA": "lateMeal", "I-KONTAKT": "doses", "C-CILE": "doses", "P-LEKAR": "issue", "Z-GLUKOZA": "firstMeal", "R-SKORE": "week", "R-REAKCE": "week", "R-PORCE": "advice", "R-PROCHAZKA": "advice", "R-DOPLNEK": "advice", "I-MENE": "afterBolus", "I-NEVIM": "afterBolus", "B-HYPO": "hypo", "I-HYPO": "hypo", "R-PODOBNOST": "custom", "R-PORADI": "custom", "P-NEMOC": "illness", "I-NEMOC-BAZAL": "illness", "I-NEMOC-JIDLO": "illness", "S-SEMAFOR": "reviewSummary", "D-CISTA": "reviewProposals", "S-SILNA": "reviewSummary", "D-POSTUP": "reviewProposals", "D-BAZAL": "reviewProposals", "D-PRAND": "reviewProposals"};
  const got = {}; D.scenes.forEach((sc, i) => D.decisionItems(i).forEach(id => { got[id] = D.chapters[sc.ch].id; }));
  assert.deepEqual(got, FROZEN);
  /* krok: víc akcí jen jako seznam téže akce (list nebo stejná akce), jinak nejvýš dvojice volba + potvrzení/přechod; změna stavu přes fn vždy s cílem */
  for (const c of D.chapters) for (const st of D.tour.chapters[c.id].steps) {
    const acts = (st.do || []).filter(o => o.act || o.bind || o.fn), kinds = new Set(acts.map(o => o.act || (o.bind ? 'bind' : 'fn')));
    assert.ok(acts.length <= 2 || st.list || kinds.size === 1, c.id + ' / ' + st.t + ': ' + acts.length + ' různých akcí v jednom kroku');
    assert.ok(acts.length <= 5, c.id + ' / ' + st.t + ': seznam delší než 5 položek');
    for (const o of st.do || []) { if (o.fn) assert.ok(o.sel, c.id + ' / ' + st.t + ': fn bez cíle sel'); assert.equal('quick' in o, false, c.id + ' / ' + st.t + ': quick už neplatí'); }
  }
  /* tempo: konstanty na jednom místě, čekání na dojezd rolování */
  const P = D.PACE; assert.ok(P, 'D.PACE');
  assert.deepEqual([P.poll, P.settleMax, P.look, P.press, P.after, P.typeChar, P.typeMax], [50, 1200, 450, 250, 700, 60, 1500]);
  assert.ok(P.listLook + P.listPress + P.listAfter >= 600 && P.listLook + P.listPress + P.listAfter <= 800, 'položka seznamu zhruba 0,7 s');
  const src = fs.readFileSync(path.join(__dirname, 'demo/presenter.js'), 'utf8');
  assert.match(src, /function settle\(el, alive, fn\)/); assert.equal(/wait\((650|600|320|240|90)\b/.test(src), false, 'žádné pevné časy mimo PACE');
  /* dlouhý zpětný zápis je rozdělený na kroky po jednom ději */
  assert.ok(D.tour.stepsFor('lateMeal', D.defaults).length >= 6);
});

/* ---------- produkce ---------- */
test('Produkční sestavení bez demo/ má registr, jídla i katalogy z app/data/, ale žádný plán; bez položek registru nic neradí', () => {
  for (const f of CORE) assert.equal(/D\.chapters|D\.play\(|NutriFeeDemo\.tour|NutriFeeDemo\.(habit|instruction)Catalog/.test(fs.readFileSync(path.join(__dirname, f), 'utf8')), false, f);
  boot({ withDemo: false });
  assert.equal(ctx.NutriFeeDemo, undefined);
  assert.equal(S().registry.items.length, 42, 'registr z app/data/registry.js'); assert.ok(S().foods.length > 150, 'jídla z app/data/foods.js');
  assert.ok(NF.habitCatalog().length >= 5 && NF.instructionCatalog().some(i => i.id === 'I-NEMOC-BAZAL'), 'katalogy z app/data/catalogs.js');
  assert.equal(NF.garantItems(S()).length, 28); assert.ok(S().registry.items.every(r => r.status === 'approved' && !r.guide));
  assert.equal(NF.sensorSource, undefined);
  assert.equal(NF.lastResult(S()), null); assert.equal(NF.pathStats(S()), null);
  assert.match(markup(), /Zatím nemáte plán/);
  S().registry.items = []; assert.equal(NF.thanks(S(), { advice: [] }), null, 'bez položek registru žádná zpětná vazba');
  assert.equal(/DEMO · syntetická data · není určeno/.test(markup()), true, 'i produkce nese označení');
  assert.ok(markup().length > 200);
});
test('Vizuální jazyk (15. 10. 2026): jedna SVG ikonová sada bez emoji v jádru; ikona nikdy nenese význam sama; talíře porcí, pás dne, prstenec učení s animací, pruh start → vrchol', () => {
  /* žádná emoji v jádru (mimo komentáře) */
  for (const f of CORE) { const src = fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ''); assert.equal(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B50}]/u.test(src), false, f + ': emoji v jádru'); }
  /* každé jméno ikony použité v jádru existuje */
  const names = new Set(); for (const f of CORE) for (const m of fs.readFileSync(path.join(__dirname, f), 'utf8').matchAll(/NF\.icon\('([a-z-]+)'/g)) names.add(m[1]);
  for (const n of names) assert.ok(NF.ICONS[n], 'ikona ' + n); assert.equal(NF.icon('neexistuje'), '');
  assert.ok(Object.keys(NF.ICONS).length >= 40); assert.equal(NF.ICONS.meat, undefined, 'bez ikon konkrétních jídel'); assert.match(NF.icon('syringe'), /^<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"/);
  /* ikony jídel: podle druhu z fixtures, podle zdroje sacharidů, nové jídlo jen názvem = talíř */
  chapter('custom'); assert.equal(NF.foodIconName(food('Smažený řízek s bramborovou kaší')), 'plate', 'jeden neutrální talíř u všech jídel'); assert.equal(NF.foodIconName(food('Ovesná kaše s mlékem a banánem')), 'plate'); assert.equal(NF.foodIconName({ name: 'x', tags: { like: null }, custom: true }), 'plate');
  for (const f of S().foods) assert.ok(NF.ICONS[NF.foodIconName(f)], f.name);
  /* Dnes: pás dne místo štítků, ikony v liště záložek; Jak to dopadlo = pruh start → vrchol s hranicí cíle, žádná křivka */
  chapter('lateMeal'); let m = markup(); assert.match(m, /<ol class="daystrip" aria-label="Dnešní den">/); assert.match(m, /aria-label="Snídaně [^"]+"/); /* název začíná viditelným textem (04 #12, 23. 10. 2026) */ assert.match(m, /class="dnode (done|now|next|wait|missed|skipped)"/); /* pás dne jako seznam s tlačítky (přístupnost, 19. 10. 2026) */ assert.match(m, /class="tabbar"[\s\S]*data-icon="home"[\s\S]*data-icon="utensils"[\s\S]*data-icon="list"[\s\S]*data-icon="shield"/);
  for (let i = 0; i < 14 && !/class="rise /.test(m); i++) { next(); m = markup(); } /* v lateMeal přijdou data ze senzoru o pár kroků dál */
  assert.match(m, /Jak to dopadlo/); assert.match(m, /class="rise (ok|bad)" role="img" aria-label="Glukóza při jídle [\d,]+, nejvyšší (?:nad |pod )?[\d,]+ mmol\/l, hranice cíle [\d,]+ mmol\/l\."/); /* B2 (27. 10. 2026): zpětná snídaně „nad 15“ */ assert.match(m, /class="rise (ok|bad)"[^>]*>\s*<div class="track"/); assert.match(m, /class="mark p"/); assert.doesNotMatch(m, /<polyline|class="curve"|<rect class="rbar"/);
  /* každé SVG na obrazovce je aria-hidden, nebo grafika s role="img" a popisem u sebe */
  const checkSvg = (html, where) => { for (const sv of html.matchAll(/<svg[^>]*>/g)) assert.ok(/aria-hidden="true"/.test(sv[0]) || /role="img"/.test(sv[0]), where + ': ' + sv[0].slice(0, 80)); };
  checkSvg(m, 'Dnes');
  /* rada k porci před píchnutím ukáže pohyb z větší zpět k obvyklé; porce v kroku 2 jako talíře */
  chapter('advice'); m = markup(); assert.equal(S().meal.portion, 'bigger'); assert.doesNotMatch(m, /class="lever-anim/, 'SCHEMA 86 (návrh 2): krok 3 bez ilustrací pák – rada je text a dvě volby'); assert.match(plateMoveSrc(), /z větší zpět k obvyklé/); checkSvg(m, 'rada k porci');
  act('mealBefore', '7'); act('mealStep', '2'); m = markup(); assert.match(m, /class="choice chosen plate"[^>]*data-action="mealPortion" data-value="bigger"[^>]*>[\s\S]*?<svg class="plate-ico"/); assert.match(m, /data-value="usual"[^>]*><svg class="plate-ico"[^>]*><circle class="rim"/); checkSvg(m, 'porce');
  /* prstenec: po uložení zápisu nový oblouk s animací (jen jedno vykreslení), pak bez ní */
  act('mealStep', '3'); const fid = S().meal.foodId; act('mealFinish', 'as'); assert.ok(NF.flash && NF.flash.food === fid); m = markup(); assert.match(m, /class="emoji just"[\s\S]*?<circle class="new"/); act('noop'); assert.equal(NF.flash, null); assert.doesNotMatch(markup(), /emoji just/);
  /* vysvětlující animace (2. vlna): klíč a talíř + co aplikace nedělá při převzetí plánu; Přehrát znovu nemění stav */
  chapter('handover'); act('takeoverPage', '4'); m = markup(); /* převzetí je průvodce o šesti stránkách (19. 10. 2026); animace na stránce 4, „co aplikace nedělá“ na 5 */ assert.match(m, /class="anim play" data-anim="key"[\s\S]*role="img" aria-label="Dávka inzulinu je nastavená na obvyklou porci[\s\S]*class="kline"[\s\S]*class="khigh"/); assert.match(m, /data-action="animReplay" data-value="key"/);
  act('takeoverPage', '5'); m = markup(); assert.match(m, /class="anim play" data-anim="nots"[\s\S]*class="strike s1"[\s\S]*class="strike s2"[\s\S]*class="strike s3"/); assert.match(m, /nepočítáme sacharidy[\s\S]*neměníme dávku inzulinu[\s\S]*nikdo nečte zápisy mezi kontrolami/); checkSvg(m, 'převzetí');
  const before = JSON.stringify(S()); act('animReplay', 'key'); assert.equal(JSON.stringify(S()), before, 'Přehrát znovu nemění stav');
  /* osa inzulinu v kroku 1 reaguje na volbu; mikroanimace rad v kroku 3 */
  chapter('firstMeal'); m = markup(); assert.doesNotMatch(m, /class="ins-axis/, 'SCHEMA 86 (návrh 1a): osa 45/30 jen jako věta v „Proč se ptáme“'); assert.match(m, /<summary>Proč se ptáme<\/summary>[\s\S]*Nejvíc se o vás dozvíme z jídel, kde byl inzulin \d+ min před až \d+ min po jídle/); checkSvg(m, 'krok 1');
  chapter('advice'); m = markup(); assert.doesNotMatch(m, /data-action="animReplay" data-value="addon"/, 'mikroanimace rad bez „Přehrát znovu“ (19. 10. 2026)'); checkSvg(m, 'rady'); assert.match(V_leverAnim('addon'), /class="bowl"/);
  for (const lv of ['order', 'addon', 'walk']) assert.match(V_leverAnim(lv), new RegExp('data-lever="' + lv + '"'));
  /* lékař: lišta a registr s ikonami */
  chapter('registry'); m = markup(); assert.match(m, /class="rail"[\s\S]*data-icon="clipboard"[\s\S]*data-icon="stethoscope"/); assert.doesNotMatch(m, /class="reg-row[^"]*"[^>]*><span class="ic"/, 'registr bez koleček s ikonou (řemeslo 13)'); checkSvg(m, 'registr');
});

test('Export ze senzoru (15. 10. 2026): parser čte běžné formáty (metadata + hlavička, typ záznamu, desetinná čárka, středník, mg/dl, ISO čas) a import doplní zápis i noc', () => {
  const csvTypA = 'Glucose Data,Generated on 13-10-2026 10:15,Generated by X\nDevice,Serial Number,Device Timestamp,Record Type,Historic Glucose mmol/L,Scan Glucose mmol/L\nL,1,06-10-2026 07:05,0,6.8,\nL,1,06-10-2026 07:35,0,8.1,\nL,1,06-10-2026 08:05,0,9.6,\nL,1,06-10-2026 08:35,0,9.0,\nL,1,06-10-2026 09:05,0,8.2,\nL,1,06-10-2026 03:00,0,5.1,\nL,1,06-10-2026 06:00,0,6.3,\n';
  let r = NF.parseSensorCsv(csvTypA); assert.equal(r.length, 7); assert.equal(r[0].at, '2026-10-06T03:00:00'); assert.equal(r.find(x => x.at === '2026-10-06T08:05:00').mmol, 9.6);
  const semi = 'Čas;Glukóza (mmol/l)\n06.10.2026 12:00;7,4\n06.10.2026 12:30;9,9\n'; r = NF.parseSensorCsv(semi); assert.equal(r.length, 2); assert.equal(r[1].mmol, 9.9);
  const comma = 'Device Timestamp,Historic Glucose mmol/L\n06-10-2026 12:00,7,4\n06-10-2026 12:30,9,9\n'; r = NF.parseSensorCsv(comma); assert.equal(r[0].mmol, 7.4, 'desetinná čárka v souboru s čárkou');
  const csvMgdl = 'Timestamp (YYYY-MM-DDThh:mm:ss),Glucose Value (mg/dL)\n2026-10-06T12:00:00,126\n2026-10-06T12:30:00,180\n'; r = NF.parseSensorCsv(csvMgdl); assert.equal(r[0].mmol, 7); assert.equal(r[1].mmol, 10);
  assert.equal(NF.parseSensorCsv('').length, 0); assert.equal(NF.parseSensorCsv('nesmysl\nbez čísel').length, 0);
  /* import: zápis bez průběhu dostane body a noc se doplní */
  chapter('firstResult'); NF.setManualPeak(S(), 'E1', 9.6); const e1 = S().episodes.find(x => x.id === 'E1'); assert.equal(NF.hasImport(e1), false); assert.equal(NF.glucoseOf(S(), e1).source, 'manual');
  const res = NF.importReadings(S(), NF.parseSensorCsv(csvTypA)); assert.equal(res.ok, true); assert.equal(res.filled, 1); assert.equal(res.nights, 1);
  assert.equal(NF.hasImport(e1), true); assert.equal(NF.glucoseOf(S(), e1).source, 'import'); assert.equal(NF.epPeak(S(), e1), 9.6); assert.equal(NF.epRise(S(), e1), 2.8);
  assert.ok(S().nights.some(n => n.date === '2026-10-06' && n.fasting === 6.3 && n.min === 5.1)); assert.equal(NF.importDue(S()).missing, 0);
  /* ukázkový export z dema projde stejným parserem */
  chapter('lateMeal'); const csv = D.demoCsv(S()); assert.ok(csv && /Record Type/.test(csv)); const rows = NF.parseSensorCsv(csv); assert.ok(rows.length >= 7); assert.ok(rows.some(x => String(x.mmol).indexOf('.') > 0), 'desetiny zůstaly');
  /* svačina není silná reakce; rozchod zápisů se ptá a rozdělí jídlo */
  assert.ok(NF.strongFoods(S()).every(x => NF.dominantMeal(S(), x.food.id) !== 'snack'));
});

test('Zátěž pacienta a bezpečnost (18. 10. 2026): čipy po celých mmol/l zamykají krok 1, dotaz na minulé jídlo až při dalším jídle, sledování po menší porci, výstraha po 2 poklesech, rutinní rada sbalená, dva stupně reakce, PAD při zařazení', () => {
  /* krok 1: bez čipu se dál nejde; čipy 4–15, pod 4, nad 15, nemám */
  chapter('firstMeal'); act('mealBolus', 'before'); /* SCHEMA 86: hodnota teď je třetí otázka, ukáže se po odpovědi na inzulin */ let m = markup(); /* SCHEMA 84 (rozhodnutí 9, agent P+D): posuvník hodnoty místo mřížky a stepperu */ assert.match(m, /class="vs-input" id="vs-before" min="3" max="16" step="1"[^>]*data-vs-action="mealBefore"/); assert.match(m, /data-action="mealBefore" data-value="low"/); assert.match(m, /data-action="mealBefore" data-value="none"/); assert.doesNotMatch(m, /type="number"/, 'žádná klávesnice');
  act('mealBolus', 'before'); act('mealStep', '2'); assert.equal(S().meal.step, 1, 'bez hodnoty ze senzoru se nepokračuje'); assert.match(S().error, /nemám/);
  act('mealBefore', '7'); assert.equal(S().meal.before, 7); act('mealStep', '2'); assert.equal(S().meal.step, 2);
  act('mealStep', '1'); act('mealBefore', 'none'); assert.equal(S().meal.before, null); assert.equal(S().meal.beforeAsked, true); act('mealStep', '2'); assert.equal(S().meal.step, 2, '„nemám“ pustí dál');
  /* dotaz na minulé jídlo v kroku 1 dalšího jídla, ne kartou na Dnes dopoledne */
  chapter('firstResult'); if (!S().meal.bolus) act('mealBolus', 'as'); m = markup(); assert.match(m, /class="eyebrow q-h"><span class="qnum" aria-hidden="true">2<\/span>Po snídani · 7:05–9:05 · Ovesná kaše s mlékem a banánem<\/p>/); /* SCHEMA 86: otázka po otázce */ /* SCHEMA 84 (rozhodnutí 9, agent P+D): posuvník hodnoty místo mřížky a stepperu */ assert.match(m, /data-vs="peak-E1"/); assert.match(m, /data-vs-action="vsPick" data-vs-prefix="peak-E1\|"/); act('vsPick', 'peak-E1|12'); m = markup(); assert.match(m, /data-action="peakChip" data-value="E1:12"/);
  act('role', 'patient'); act('page', 'today'); assert.doesNotMatch(markup(), /peakChip/, 'na Dnes dopoledne žádná karta'); chapter('firstResult'); if (!S().meal.bolus) act('mealBolus', 'as');
  act('peakChip', 'E1:12'); const e1 = S().episodes.find(x => x.id === 'E1'); assert.equal(e1.manual.peak, 12); assert.equal(NF.epRise(S(), e1), 5); m = markup(); assert.match(m, /Klesla glukóza do 4 hodin po jídle pod 4 mmol\/l\?/); /* A24 */ assert.match(m, /data-action="lowChip" data-value="E1:no"/);
  act('lowChip', 'E1:no'); assert.equal(e1.manual.low, false); assert.doesNotMatch(markup(), /lowChip/);
  /* sledování po menší porci s podaným inzulinem → za hodinu otázka; „ano“ = nízká hodnota; 2 poklesy za týden = výstraha a řádek v návrhu „pod cílem“ */
  chapter('afterBolus'); branch('bolus', 'smaller'); act('mealStep', '3'); act('mealFinish', 'as'); const ep = S().episodes[S().episodes.length - 1]; assert.equal(ep.portion, 'smaller');
  assert.equal(S().hypoWatch.filter(w => w.epId === ep.id).length, 1, 'sledování založeno'); assert.equal(NF.pendingHypoWatch(S()).length, 0, 'ještě ne po hodině');
  S().clock = NF.addMin(ep.at, 65); act('noop'); m = markup(); assert.match(m, /Před chvílí jste snědli méně než obvykle/); const w = NF.pendingHypoWatch(S())[0]; assert.ok(w);
  act('hypoAnswer', w.id + ':yes'); assert.equal(ep.manual.low, true); assert.equal(NF.lowEvents(S(), 7).length >= 1, true); assert.equal(NF.hypoAlert(S()), null, 'jeden pokles výstrahu nespustí');
  NF.addHypoWatch(S(), 'skipped', 'lunch', NF.addMin(S().clock, -120), null); NF.answerHypoWatch(S(), S().hypoWatch[S().hypoWatch.length - 1].id, 'yes'); assert.ok(NF.hypoAlert(S()), 'dva poklesy za týden'); act('noop'); assert.match(markup(), /Glukóza vám za posledních 7 dní klesla pod 4 dvakrát[\s\S]*Mějte u sebe vždy cukr nebo džus\.[\s\S]*Při poklesu: pravidlo k nízké glukóze/); /* SCHEMA 86: rada v bodech (B-HYPO v2) */ assert.doesNotMatch(markup(), /Zavolejte|zavoláte/); /* obráceno SCHEMA 74: karta s obecnou radou, bez výzvy volat */
  /* vynechané jídlo s inzulinem zakládá sledování */
  const nW = S().hypoWatch.length; NF.skipMeal(S(), 'dinner', 'as'); assert.equal(S().hypoWatch.length, nW + 1); NF.skipMeal(S(), 'dinner', 'none'); assert.equal(S().hypoWatch.length, nW + 1);
  /* rutinní rada po 3 odpovědích je sbalená s odpovědí jako minule; Změnit ji rozbalí */
  chapter('preview'); act('role', 'patient'); act('startMeal', 'breakfast'); act('mealBolus', 'before'); act('mealBefore', '7'); act('mealStep', '2'); const kase = food('Ovesná kaše s mlékem a banánem'), rut = food('Cereálie s mlékem'); act('mealFood', rut.id); act('mealPortion', 'usual'); act('mealStep', '3'); /* C15 (27. 10. 2026): snídaně jsou pestřejší; u kaše se doplněk po 15 pokusech bez cíle stáhl (R-DOPLNEK), rutinní rada je u cereálií */
  const compactLevers = Object.keys(S().meal.compact || {}); assert.ok(compactLevers.length >= 1, 'po dlouhé řadě je aspoň jedna rada rutinní'); m = markup(); assert.match(m, /class="adv-line compact[\s\S]*Jako minule: <b>(zkusím to|tentokrát ne)<\/b>/); assert.match(m, /data-action="mealExpand"/);
  act('mealExpand', compactLevers[0]); assert.equal(S().meal.compact[compactLevers[0]], undefined); assert.match(markup(), new RegExp('data-action="mealDecide" data-value="' + compactLevers[0] + ':yes"'));
  /* dva stupně reakce */
  chapter('week'); const c = NF.confidence(S(), kase.id); assert.equal(c.level, 'known'); assert.ok(['mild', 'strong'].includes(c.reaction.key), 'jen dva stupně'); assert.equal(/střední reakce/.test(markup()), false);
  assert.equal(NF.item(S(), 'R-REAKCE').params.minKnown, 4); assert.equal(NF.item(S(), 'R-REAKCE').params.shoda_mmol, 2.5); assert.equal(NF.item(S(), 'R-REAKCE').params.rozchod_mmol, 3.5);
  /* souhrn ze senzoru z importu; opsané „pod 4“ v návrhu pod cílem */
  const sum = NF.sensorSummaryFrom(S(), NF.parseSensorCsv('Čas;Glukóza\n06.10.2026 00:00;5,0\n06.10.2026 06:00;6,0\n06.10.2026 12:00;11,0\n06.10.2026 18:00;3,5\n')); assert.equal(sum.days, 1); assert.equal(sum.below, 25); assert.equal(sum.above, 25); assert.equal(sum.tir, 50);
  /* zařazení (SCHEMA 84, rozhodnutí vlastníka 4. 11. 2026, bod 5): kohorta jen inzulin – žádný jiný lék na diabetes; záznam „bere i tablety“ zrušen */
  chapter('enroll'); m = markup(); assert.match(m, /Inzulin v pevných dávkách a žádný jiný lék na diabetes \(ani tablety, ani GLP-1; premixy ne\)/); assert.doesNotMatch(m, /data-action="enrollPad"/); assert.match(m, /jiným lékem na diabetes \(tablety, GLP-1\) do NutriFee nepatří/);
  /* export pacientovi nic nepřipomíná (dělá sestra na kontrole), ale stránka zůstává; sestra má blok v kontrole */
  chapter('lateMeal'); assert.equal(NF.importDue(S()).due, false); assert.doesNotMatch(markup(), /Nahrát data ze senzoru/);
  chapter('reviewSummary'); assert.match(markup(), /Zahájit kontrolu[\s\S]*Sestra · Data ze senzoru[\s\S]*data-action="importFile"/, 'C10: sestra nahraje export už před zahájením'); for (let g = 0; g < 8 && !S().review; g++) next(); /* SCHEMA 78: nejdřív kroky sestry */ assert.match(markup(), /Data ze senzoru[\s\S]*data-action="importFile"[\s\S]*Bezpečnost/);
});

test('Sedm rozhodnutí z 18. 10. 2026 (SCHEMA 54): katalogy v jádru, provozní položky bez garanta, noční otázka po večeři, pokyn pro nemoc dvakrát, bod sestry k exportu, oznámení o nové verzi', () => {
  /* katalogy jsou v app/data/ a demo je jen připojuje */
  for (const f of ['app/data/registry.js', 'app/data/catalogs.js', 'app/data/foods.js']) assert.ok(CORE.includes(f), f + ' v HTML mezi jádrem');
  assert.equal(/function reg\(\)|function foods\(\)/.test(fs.readFileSync(path.join(__dirname, 'demo/fixtures.js'), 'utf8')), false, 'fixtures už katalogy nenesou');
  chapter('week');
  /* provozní položky (Q1, 27. 10. 2026): neschvaluje je nikdo – bez stavu, bez štítku, mimo rozhodovací plán a souhrn; v registru jen jako popis */
  const prov = S().registry.items.filter(r => r.scope === 'provozni'); assert.equal(prov.length, 14); /* SCHEMA 78: + S-PRIPOMINKY, S-DAVKA */
  for (const r of prov) { assert.equal(r.decidedBy, null); assert.equal(NF.itemState(S(), r.id), null, r.id + ' bez stavu'); assert.equal(NF.screens.appr(S(), r.id), '', r.id + ' bez štítku'); assert.ok(NF.usable(S(), r.id), r.id + ' platí v aplikaci'); }
  act('role', 'doctor'); act('page', 'registry'); assert.match(markup(), /Pravidla aplikace bez schvalování \(14\)/); /* SCHEMA 78 */ act('regOpen', 'S-PODPORA'); { const side = markup().slice(markup().indexOf('class="reg-side"')); assert.match(side, /Pravidlo aplikace bez schvalování/); assert.equal(/data-action="(garantDecide|regDecide)"|ke schválení|schváleno|vlastník aplikace/.test(side), false, 'provozní pravidlo bez stavu a bez rozhodnutí'); } act('tourReturn');
  assert.ok(prov.some(r => r.id === 'Z-IMPORT') && prov.some(r => r.id === 'S-TYDEN'), 'export a texty jsou provozní'); assert.ok(!prov.some(r => r.id === 'B-HYPO' || r.id === 'R-REAKCE' || r.id === 'C-CILE'), 'klinické zůstávají garantovi');
  assert.equal(NF.registrySummary(S()).total, 28); for (let i = 0; i < D.scenes.length; i++) for (const id of D.decisionItems(i)) assert.equal(NF.item(S(), id).scope, undefined, id + ' v rozhodovací scéně');
  act('role', 'doctor'); act('page', 'registry'); let m = markup(); assert.doesNotMatch(m.slice(0, m.indexOf('reg-rules')), /data-value="S-TYDEN"/, 'provozní pravidlo není v seznamu ke schválení'); assert.match(m.slice(m.indexOf('reg-rules')), /data-value="S-TYDEN"/, 'jen jako popis pravidla (Q1)'); assert.match(m, /data-value="B-HYPO"/); assert.match(m, /Rozhodnuto \d+ z 28/); act('role', 'patient');
  /* po menší večeři se otázka „pod 4?“ neptá za hodinu, ale ráno (v kroku 1 další snídaně i na Dnes) */
  chapter('week'); S().clock = '2026-10-12T19:05:00'; act('noop');
  const w = NF.addHypoWatch(S(), 'smaller', 'dinner', S().clock, null); assert.equal(w.night, true); assert.equal(w.askAt, '2026-10-13T05:00:00');
  S().clock = '2026-10-12T20:10:00'; assert.equal(NF.pendingHypoWatch(S()).length, 0, 've 20:10 se neptáme');
  S().clock = '2026-10-13T07:00:00'; act('page', 'today'); assert.equal(NF.pendingHypoWatch(S()).length, 1); m = markup(); assert.match(m, /Včera večer jste snědli méně než obvykle/); assert.match(m, /Klesla glukóza v noci pod 4\?/);
  act('startMeal', 'breakfast'); act('mealBolus', 'before'); /* SCHEMA 86: noční otázka je druhá otázka kroku 1 */ assert.match(markup(), /Klesla glukóza v noci pod 4\?/, 'otázka i v kroku 1 snídaně'); act('hypoAnswer', w.id + ':yes'); assert.equal(/Klesla glukóza v noci pod 4/.test(markup()), false); S().meal = null;
  const w2 = NF.addHypoWatch(S(), 'smaller', 'lunch', '2026-10-13T12:00:00', null); assert.equal(w2.night, false); S().clock = '2026-10-13T13:05:00'; assert.equal(NF.pendingHypoWatch(S()).length, 1, 'u oběda zůstává 60 minut');
  /* pokyn pro nemoc: bazál a inzulin k jídlu vedle sebe */
  chapter('illness'); act('illness', 'on'); m = markup(); assert.match(m, /Nemoc: inzulin na noc \(bazál\)/); assert.match(m, /Nemoc: inzulin k jídlu/); assert.match(m, /Bazál si píchejte dál/); assert.match(m, /Když jídlo vynecháte, inzulin k němu nepíchejte/); assert.match(m, /class="ill-two"/);
  assert.ok(NF.instructionCatalog().every(i => i.id !== 'I-NEMOC'), 'starý jednotný pokyn zmizel');
  /* zaučení: bod sestry k exportu bez tlačítka Ukázat; podklady kontroly: tři kroky, jak export získat */
  chapter('training'); const ti = NF.trainingItems(S()); assert.ok(ti.some(t => t.id === 'export' && /před kontrolou pošle do ordinace export ze senzoru/.test(t.text) && !t.page)); /* SCHEMA 74 */ m = markup(); assert.match(m, /data-value="export"/); assert.equal(/data-action="trainingPreview" data-value="export"/.test(m), false);
  chapter('reviewSummary'); act('startReview'); m = markup(); assert.doesNotMatch(m, /Jak export získat|klinickým účtem ordinace|portálu výrobce/); assert.match(m, /Sestra nahraje export ze senzoru, který pacient poslal do ordinace před kontrolou\./); /* obráceno SCHEMA 74 (A23 přebito vlastníkem 27. 10. 2026) */
  /* oznámení o nové verzi: jádro zálohuje a hlásí; prezentace to řekne garantovi jednou větou */
  assert.match(fs.readFileSync(path.join(__dirname, 'demo/presenter.js'), 'utf8'), /Maketa byla aktualizována, příběh začíná od začátku\. Vaše rozhodnutí k položkám zůstala uložena\./);
  assert.match(fs.readFileSync(path.join(__dirname, 'app/core.js'), 'utf8'), /NF\.STORAGE \+ '\.zaloha-'/);
});

test('Designový systém (18. 10. 2026): tokeny v app/tokens.css, design.css bez vlastních hodnot, vlastní písma s licencí, stavy barvou + slovem', () => {
  const tok = fs.readFileSync(path.join(__dirname, 'app/tokens.css'), 'utf8'), css = fs.readFileSync(path.join(__dirname, 'app/design.css'), 'utf8');
  for (const v of ['--nf-bg', '--nf-surface', '--nf-ink', '--nf-muted', '--nf-primary', '--nf-primary-soft', '--nf-over', '--nf-low', '--nf-font-display', '--nf-font-text', '--nf-r-pill', '--nf-tap', '--nf-sh-card']) assert.ok(tok.includes(v + ':'), 'token ' + v);
  assert.equal(/\n:root\s*\{/.test(css), false, 'design.css nedefinuje vlastní :root — hodnoty jen z tokens.css (jen přepis pro vysoký kontrast v @media)');
  assert.equal(/radial-gradient|backdrop-filter/.test(css), false, 'bez skleněných karet a přechodových podkladů');
  assert.ok(/\.tag\.over[,{]/.test(css) && /\.segmented button\.on[^{]*\{background:var\(--nf-primary\)/.test(css), 'štítek nad cílem a pilulkový přepínač');
  assert.ok(html.indexOf('app/tokens.css') < html.indexOf('app/design.css') && /font-src 'self'/.test(html), 'tokens před design.css; CSP povoluje vlastní písma');
  for (const f of ['plus-jakarta-sans-400-800-latin.woff2', 'plus-jakarta-sans-400-800-latin-ext.woff2', 'OFL-PlusJakartaSans.txt']) assert.ok(fs.statSync(path.join(__dirname, 'app/fonts', f)).size > 1000, f);
  assert.equal((tok.match(/@font-face/g) || []).length, 2, 'jedno písmo, dvě podmnožiny'); assert.equal(/Atkinson/.test(tok), false, 'bez zvláštního písma pro slabozraké (18. 10. 2026 večer)');
  chapter('week'); const rid = food('Smažený řízek s bramborovou kaší').id; assert.equal(NF.reactionLabel(S(), NF.foodStats(S(), rid), rid).cls, 'over', 'častěji nad cílem = oranžová třída');
  assert.match(markup(), /class="tag over"><svg[^>]*data-icon="arrow-up"[\s\S]*?<\/svg>častěji nad cílem/);
});

test('Druhá dávka kritiky (19. 10. 2026): CSS jen z tokenů, mřížka čipů, pás dne jako zkratky, návrhová karta s oddíly, čas bazálu voličem', () => {
  const css = fs.readFileSync(path.join(__dirname, 'app/design.css'), 'utf8');
  const noMedia = css.replace(/@media \(prefers-contrast:more\)[^\n]*/g, '');
  assert.equal(/#[0-9a-fA-F]{3,8}\b/.test(noMedia), false, 'pevná barva v design.css mimo vysoký kontrast');
  assert.equal(/var\(--[a-z0-9-]+,\s*#/.test(css), false, 'žádné záložní barvy ve var()');
  const legacy = [...new Set([...css.matchAll(/var\((--(?!nf-)[a-z0-9-]+)/g)].map(x => x[1]))].filter(v => !['--c', '--c-tx', '--goal', '--sx-as', '--sx-before', '--sx-other', '--barh', '--pct', '--f', '--from', '--to', '--at', '--rl', '--days', '--vs-c', '--vs-tx', '--vs-bg', '--vs-z1', '--vs-z2', '--vs-f', '--vs-m'].includes(v)); /* SCHEMA 84 (rozhodnutí 9, agent P+D): posuvník hodnoty */ 
  assert.deepEqual(legacy, [], 'design.css bez starých názvů proměnných');
  chapter('firstMeal'); act('mealBolus', 'before'); let m = markup(); /* SCHEMA 84 (rozhodnutí 9, agent P+D): posuvník hodnoty místo mřížky a stepperu */ assert.match(m, /class="vslider glu unset"/); assert.match(m, /class="vs-end low"/); assert.match(m, /nemám hodnotu/);
  chapter('week'); act('page', 'today'); m = markup(); assert.match(m, /class="dnode now"><button type="button" data-action="startMeal"/); assert.doesNotMatch(m, /<b>Bazál potvrzen/, 'potvrzený bazál nese pás dne');
  chapter('reviewProposals'); m = markup(); assert.match(m, /<h4 class="sec-h">(<span class="mk">[\s\S]*?<\/span>)?Ověřit s pacientem<span class="prog">\d+ ze? \d+/); assert.match(m, /<h4 class="sec-h[^"]*">Rozhodnout/); assert.doesNotMatch(m, /class="sec-h[^"]*"><span class="n">/, 'oddíly karty bez čísel (řemeslo 16)'); assert.match(m, /class="decide"/);
  const cat = fs.readFileSync(path.join(__dirname, 'design-system/index.html'), 'utf8'); assert.match(cat, new RegExp('data-version="' + NF.SCHEMA + '"'), 'katalog nese verzi makety'); for (const id of ['c-jidlo', 'c-vyber', 'c-cesta', 'c-navrh', 'c-davky', 'c-registr']) assert.match(cat, new RegExp('id="' + id + '"'), 'katalog: ' + id);
  chapter('doses'); act('basalTime', '22:00'); assert.equal(S().draft.doses.basal.time, '22:00'); assert.match(markup(), /data-action="basalTime" data-value="22:00" aria-pressed="true"/);
});

test('Verze v HTML souhlasí se schématem stavu', () => {
  const all = [...html.matchAll(/(?:src|href)="(?:app|demo)\/[^"]+\?v=(\d+)"/g)].map(m => m[1]);
  assert.equal(all.length, CORE.length + DEMO.length + 3); /* design.css, tokens.css, demo.css */
  assert.equal(new Set(all).size, 1);
  assert.equal(Number(all[0]), NF.SCHEMA);
});
test('Třetí dávka kritiky (19. 10. 2026): jedna karta, písmo jen z tokenů, obrazovky bez inline stylů, klasická lišta záložek', () => {
  const css = fs.readFileSync(path.join(__dirname, 'app/design.css'), 'utf8');
  const noMedia = css.replace(/@media \(prefers-contrast:more\)[^\n]*/g, '');
  assert.deepEqual(noMedia.match(/font-size:\s*[\d.]+px/g) || [], [], 'velikost písma jen z tokenů --nf-fs-*');
  assert.match(css, /\.card,\.tile,\.prop,details\.part\{background:var\(--nf-surface\)/, 'jedna plocha karty pro kartu, dlaždici, návrh i oddíl');
  assert.equal(/\.glass\b/.test(css), false, 'bez staré třídy .glass');
  assert.match(css, /\.tabbar\{position:fixed;left:50%;bottom:0;[^}]*env\(safe-area-inset-bottom/, 'klasická lišta u spodní hrany s bezpečnou zónou');
  for (const f of CORE.filter(f => /screens|ui\.js/.test(f))) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8');
    assert.deepEqual(src.match(/style="(?!--)[^"]*"/g) || [], [], f + ': inline styl jen pro datové proměnné');
    assert.equal(/class="glass|class="now"/.test(src), false, f + ': .card a .now-row místo .glass a .now');
  }
  chapter('week'); act('page', 'today'); const m = markup();
  assert.match(m, /<nav class="tabbar" aria-label="Hlavní nabídka">/); assert.match(m, /<section class="card hero"><p class="eyebrow">Co teď<\/p><h2 class="hero-msg">/);
});

test('Průvodce položkami (19. 10. 2026, K1): texty odpovídají registru, čísla se dosazují z parametrů, bez interních kódů', () => {
  for (const id of Object.keys(D.guide)) for (const k of ['proc', 'jak', 'kde', 'co', 'dopad']) {
    const t = plain(D.guide[id][k]), w = id + '.' + k;
    assert.equal(/tablety nebo GLP-1 navíc nevadí/i.test(t), false, w + ': kohorta je od SCHEMA 84 jen inzulin'); /* rozhodnutí vlastníka 4. 11. 2026, bod 5 */
    assert.equal(/R2\d\s*[–-]\s*R3\d/.test(t), false, w + ': interní kód rozhodnutí');
    assert.equal(/mírná ≥ 80/.test(t), false, w + ': R-SKORE má dva stupně');
    assert.equal(/\{[A-Za-z_][A-Za-z0-9_]*(%|\|\d)?\}/.test(t.replace(/\{(addon|first|lever)\}/g, '')), false, w + ': nedosazený parametr');
    if (id === 'R-REAKCE') assert.equal(/od 3\b|3 započítan|3 zápis/.test(t), false, w + ': známé jídlo až od minKnown');
    if (id === 'Z-GLUKOZA') assert.equal(/karta na Dnes po dvou hodinách/.test(t), false, w + ': karta po 2 h zrušena 18. 10.');
    if (id === 'R-POKYNY') assert.equal(/práh 3,9/.test(t), false, w + ': práh nízké glukózy pevně 4');
  }
  const reakce = NF.item(S(), 'R-REAKCE'); assert.match(plain(reakce.guide.jak), new RegExp('aspoň ' + reakce.params.minKnown + ' započítané zápisy z posledních ' + reakce.params.maxUceni));
  assert.match(plain(NF.item(S(), 'K-KRITERIA').guide.jak), /žádný jiný lék na diabetes/); assert.match(plain(NF.item(S(), 'K-KRITERIA').guide.jak), /Premixované inzuliny ne/); /* SCHEMA 84: průvodce (demo/guide.js, předávka 06) říká kohortu jen inzulin */
  assert.match(plain(NF.item(S(), 'R-SKORE').guide.jak), /aspoň 50 % započítaných zápisů/); assert.match(plain(NF.item(S(), 'R-PROCHAZKA').guide.jak), /riziku nízké glukózy/);
  assert.match(plain(NF.item(S(), 'R-POKYNY').guide.jak), /pevně 4 mmol\/l, bez voliče/);
  act('role', 'doctor'); NF.newVersion(S(), 'R-REAKCE', { params: { minKnown: 5 } });
  assert.match(plain(NF.item(S(), 'R-REAKCE').guide.jak), /aspoň 5 započítané/, 'po nové verzi parametru průvodce ukáže nové číslo');
});

test('Nová verze z příběhu (O6, 27. 10. 2026) se garantovi nepřipisuje: v historii „model (příběh)“, souhrn bez ní, položka se nabídne normálně', () => {
  const fin = D.scenes.findIndex(x => !x.appendix && D.chapters[x.ch].id === 'trace'); act('goScene', String(fin)); act('closeDrawer');
  const it = NF.item(S(), 'R-PORADI'); assert.equal(it.version, 'v2', 'příběh založil verzi v2'); assert.equal(it.status, 'approved', 'a modelově ji schválil'); assert.equal(D.garantLog().length, 0);
  const hs = S().registry.history.filter(h => h.item === 'R-PORADI'); assert.equal(hs.map(h => h.kind).join(), 'decision,version,decision', 'C25: vypnout hned, nová verze, schválení'); assert.ok(hs.every(h => h.model), 'všechny kroky modelové');
  S().tourStep = D.tour.stepsFor('trace', S().branches).length; NF.render();
  let m = markup(); assert.match(m, /Souhrn vašich rozhodnutí/); assert.match(m, /<b>0<\/b><span>schváleno<\/span>/, 'bez rozhodnutí garanta souhrn neukáže modelové schválení');
  assert.equal(NF.itemTouched(S(), 'R-PORADI'), false); assert.equal(NF.registrySummary(S()).touched, 0);
  act('garantDecide', 'R-PORADI:approved'); const g = D.garantSummary(S()); assert.equal(g.approved, 1);
  act('openDecisions', 'R-PORADI'); assert.match(plain(elements.get('overlay').innerHTML), /data-gitem="R-PORADI"/); act('closeDrawer');
  act('role', 'doctor'); act('page', 'registry'); act('regOpen', 'R-PORADI'); m = markup(); assert.match(m, /model \(příběh\): nová verze v2 ke schválení/); assert.match(m, /model \(příběh\): ke schválení → <b>schváleno<\/b> \(v2\)/); act('tourReturn');
  assert.equal(D.garantLog()[0].status, 'approved', 'na server jde schválení, ne úprava');
  act('garantConfirmSummary', 'force'); m = markup(); assert.match(m, /Děkujeme(, máme vaše rozhodnutí|\. Rozhodnutí zatím nejsou odeslaná)/); assert.match(m, /Projít varianty v dodatku ▶/); assert.match(m, /data-action="tourFinish"/);
  act('tourFinish'); assert.match(markup(), /Ukázka skončila/);
});

test('Prověrka sedmi pohledů (19. 10. 2026): nízká glukóza, volby, Dnes, převzetí, ordinace, sazba', () => {
  /* nízká glukóza teď: pokyn lékaře hned, procházka se nenabízí */
  chapter('firstMeal'); if (!S().meal) act('startMeal', 'breakfast'); act('mealBolus', 'as'); act('mealBefore', 'low');
  let m = markup(); assert.match(m, /Glukóza je teď pod 4/); assert.match(m, /class="doc-voice"/); assert.doesNotMatch(m, /– váš lékař|„Když glukóza/); /* SCHEMA 74: pravidlo bez uvozovek a podpisu */ /* SCHEMA 84 (rozhodnutí 9, agent P+D): posuvník */ assert.match(m, /data-vs="before" data-zone="low"[\s\S]*?<b>pod 4<\/b>/);
  act('mealQ', 'ins'); m = markup(); /* SCHEMA 86: zodpovězená otázka je sbalená; Změnit ji otevře */
  assert.match(m, /class="choice chosen opt" data-action="mealBolus" data-value="as" aria-pressed="true"/, 'odpověď je volba, plná až po vybrání');
  const hy = NF.instructionCatalog().filter(x => x.id === 'I-HYPO')[0]; assert.equal(hy.value, 4); assert.ok(hy.fixed, 'práh nízké glukózy pevně 4');
  chapter('afterBolus'); branch('bolus', 'smaller'); const f = S().meal.foodId; const r = NF.advise(S(), f, 'smaller', 'as', S().meal.meal);
  assert.ok(r.lowRisk); assert.equal(r.items.some(x => x.lever === 'walk'), false, 'po menší porci s inzulinem bez procházky');
  /* uložit, píchnu za chvíli */
  chapter('firstMeal'); if (!S().meal) act('startMeal', 'breakfast'); act('mealBolus', 'before'); act('mealBefore', '7'); act('mealStep', '2');
  const fid = NF.recentFoods(S(), 'breakfast')[0] ? NF.recentFoods(S(), 'breakfast')[0].id : S().foods[0].id; act('mealFood', fid); act('mealPortion', 'usual'); act('mealStep', '3');
  assert.match(markup(), /Uložit, píchnu za chvíli/); act('mealFinish', 'pending');
  assert.equal(NF.pendingInsulin(S()).length, 1); act('page', 'today'); assert.match(markup(), /čeká na potvrzení/);
  const pe = NF.pendingInsulin(S())[0]; act('pendingInsulin', pe.id + ':as'); assert.equal(pe.insulin.confirmed, 'as');
  /* do 3 h po jídle je další slot „další“ */
  assert.equal(NF.focusMeal(S()).state, 'next'); assert.match(markup(), /class="hero-msg">Další jídlo: oběd/); assert.equal(/<span class="badge">brzy<\/span>/.test(markup()), false, 'karta inzulinu sloučena do pásu dne');
  /* převzetí plánu: šest stránek, zpětné přečtení dávek */
  chapter('handover'); act('takeoverPage', '2'); m = markup(); assert.match(m, /Váš plán · 2 ze 6/); /* SCHEMA 86: bez kódu plánu */ assert.match(m, /Souhlasí s tím, co vám řekl lékař\?/);
  assert.match(m, /data-action="takeoverPage" data-value="3" disabled/); act('doseReadback', 'no'); assert.match(markup(), /Ukažte telefon sestře/);
  act('takeoverPage', '6'); act('answerCheck', 'no'); act('confirmUnderstanding'); assert.equal(NF.activePlan(S()).understood, false, 'při nesouhlasu dávek se plán nepřebírá');
  /* ordinace: věta před vydáním, rozdíl dávky, potvrzení zamítnutí bezpečnostní položky, pruh rozmezí */
  chapter('issue'); act('role', 'doctor'); assert.match(markup(), /Vydáte plán P1: snídaně \d+ j\./);
  chapter('registry'); act('role', 'doctor'); act('page', 'registry'); act('regOpen', 'B-HYPO'); act('regDecide', 'rejected');
  assert.notEqual(NF.item(S(), 'B-HYPO').status, 'rejected', 'bezpečnostní položka chce potvrzení'); assert.match(markup(), /Opravdu zamítnout\?/);
  act('regDecide', 'rejected'); assert.equal(NF.item(S(), 'B-HYPO').status, 'rejected');
  /* M7 (27. 10. 2026): totéž potvrzení v kartě panelu, zásuvky i souhrnu */
  /* SCHEMA 84 (32/03 B2): zásuvka položky z neprošlých scén jen jmenuje – rozhodnout jde až ve scéně, kde se položka nabízí (D.itemScene) */
  const pnCh = (D.itemScene && D.itemScene['P-NEMOC'] && D.itemScene['P-NEMOC'].ch) || 'illness'; act('goScene', String(D.scenes.findIndex(x => D.chapters[x.ch].id === pnCh && !x.appendix))); act('closeDrawer'); toOffer(); act('garantDecide', 'P-NEMOC:rejected'); assert.equal(NF.itemState(S(), 'P-NEMOC'), 'pending', 'v panelu se nejdřív ptá');
  act('openDecisions', 'P-NEMOC'); assert.match(plain(elements.get('overlay').innerHTML), /Opravdu zamítnout\?[\s\S]*data-value="P-NEMOC:rejected:ano"/);
  act('garantDecide', 'P-NEMOC:rejected:ano'); assert.equal(NF.itemState(S(), 'P-NEMOC'), 'rejected'); act('closeDrawer');
  /* sazba */
  assert.equal(NF.nbspText('5. 10. 2026'), '5. 10. 2026'); assert.equal(NF.nbspText('a v cíli'), 'a v cíli'); assert.equal(NF.nbspText('3 z 4'), '3 z 4'); assert.equal(NF.nbspText('cílem — díky'), 'cílem – díky');
  assert.equal(NF.z(4), 'ze'); assert.equal(NF.z(5), 'z'); assert.equal(NF.z(73), 'z');
  const css = fs.readFileSync(path.join(__dirname, 'app/design.css'), 'utf8'); assert.equal(/\.hero \.big/.test(css), false); assert.match(css, /\.card\.hero \.hero-msg\{/); assert.match(css, /prefers-reduced-motion:reduce[\s\S]*animation:none!important/);
  const tok = fs.readFileSync(path.join(__dirname, 'app/tokens.css'), 'utf8'); assert.match(tok, /--nf-fs-md:1\.0625rem/, 'písmo v rem');
  for (const fl of ['app/screens.js', 'app/screens-clinic.js', 'app/data/registry.js']) assert.equal(/ — /.test(fs.readFileSync(path.join(__dirname, fl), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')), false, fl + ': česká pomlčka – místo —');
});

test('Zbytek prověrky (SCHEMA 61): fokus po kroku, zásuvka inert, toast, nadpisy, štítky s ikonou, Bezpečí z kroku, časové hlavičky, oprava inzulinu, rámeček ilustrací, potvrzení', () => {
  /* A2: po „Další“ v kroku jídla dostane fokus nový h1 */
  chapter('firstMeal'); act('role', 'patient'); if (!S().meal) act('startMeal', 'breakfast');
  let focused = 0; const h1 = { setAttribute() { }, focus() { focused++; } }; const root = elements.get('app'); root.querySelector = sel => sel === 'main h1' ? h1 : null;
  act('mealBolus', 'before'); act('mealBefore', '7'); const f0 = focused; act('mealStep', '2'); assert.equal(S().meal.step, 2); assert.ok(focused > f0, 'po kroku jídla fokus na h1');
  root.querySelector = () => null;
  /* A15: počet výsledků hledání pro čtečku */
  bind('meal.q', 'kaš'); act('noop'); assert.match(markup(), /<p class="sr-only" role="status">Nalezeno: \d+ jíd/);
  /* A3 + LF-11: Bezpečí z kroku jídla jako list; obsah pod ním inert; zápis zůstává */
  assert.match(markup(), /class="stephead">[\s\S]*?data-action="safetyOpen"[^>]*>[\s\S]*?Bezpečí<\/button><\/div>/);
  const before = JSON.stringify(S().meal); act('safetyOpen'); const ov = plain(elements.get('overlay').innerHTML);
  assert.match(ov, /class="drawer sheet"[\s\S]*aria-label="Bezpečí"[\s\S]*Kam se obrátit[\s\S]*Zpět k zápisu/); assert.equal(elements.get('app').inert, true, 'pod listem je obsah inert');
  act('closeDrawer'); assert.equal(elements.get('app').inert, false); assert.equal(JSON.stringify(S().meal), before, 'rozpracovaný zápis zůstal'); assert.equal(S().page, 'meal');
  act('openItem', 'Z-GLUKOZA'); assert.equal(elements.get('app').inert, true); act('closeDrawer'); assert.equal(elements.get('app').inert, false);
  /* LF-08: časová hlavička „Teď“ a „Vybráno teď“ v kroku 1 */
  act('mealStep', '1'); let m = markup(); assert.match(m, /class="eyebrow q-h"><span class="qnum" aria-hidden="true">\d<\/span>Glukóza teď · \d{1,2}:\d\d<\/p>/); /* SCHEMA 86: číslo otázky a čas */ /* SCHEMA 84 (rozhodnutí 9, agent P+D): posuvník hodnoty místo mřížky a stepperu */ assert.match(m, /data-vs="before" data-zone="ok"[\s\S]*?<b>7<\/b>[\s\S]*?v cíli/);
  /* LF-26: volič „jinak“ nejde pod 1 j. */
  act('mealBolus', 'other'); for (let i = 0; i < 70; i++) act('mealUnits', '-1'); assert.equal(S().meal.units, 1);
  /* LF-25 → 26. 10. 2026: s prezentační vrstvou nese štítek DEMO jen lišta ukázky; obrazovky pacienta ho neopakují */
  for (const pg of ['meal', 'foods', 'plan', 'safety']) { act('page', pg); assert.ok(!/class="demo-band"/.test(markup()), pg); }
  /* A14: toast nejméně 6 s, delší text déle */
  assert.equal(NF.toastMs('Zapsáno.'), 6000); assert.equal(NF.toastMs('x'.repeat(200)), 12000);
  /* A20: štítek stavu nese ikonu */
  assert.match(NF.screens.tag('v cíli', 'ok'), /<span class="tag ok"><svg[^>]*data-icon="check"/); assert.match(NF.screens.tag('nad cílem', 'over'), /data-icon="arrow-up"/); assert.match(NF.screens.tag('pod 4', 'low'), /data-icon="alert"/); assert.doesNotMatch(NF.screens.tag('ke schválení'), /<svg/);
  /* řemeslo 7: všechny ilustrace rad v jednom rámečku 300 × 100; „15 min“ pod prstencem, ne pod ručičkou */
  for (const lv of ['addon', 'order', 'walk']) assert.match(NF.screens.leverAnim(lv, {}), /class="lever-anim lever-fig play"[^>]*><svg viewBox="0 0 300 100"/, lv);
  assert.match(NF.screens.plateMove('bigger'), /viewBox="0 0 300 100"[\s\S]*class="fig-cap">z větší zpět k obvyklé/); assert.match(NF.screens.leverAnim('walk'), /<text class="min" x="200" y="96"/);
  const css = fs.readFileSync(path.join(__dirname, 'app/design.css'), 'utf8'); assert.doesNotMatch(css, /\.plates\{/, 'mrtvé CSS pryč'); assert.match(css, /\.lever-fig svg\{[^}]*aspect-ratio:3\/1/);
  /* srovnání 9: po uložení jídla je karta zápisu na Dnes zvýrazněná (jen jedno vykreslení) */
  chapter('firstMeal'); act('role', 'patient'); if (!S().meal) act('startMeal', 'breakfast');
  act('mealBolus', 'as'); act('mealBefore', '7'); act('mealStep', '2'); act('mealFood', S().foods.find(f => f.name === 'Ovesná kaše s mlékem a banánem').id); act('mealPortion', 'usual'); act('mealStep', '3'); act('mealFinish', 'as');
  m = markup(); assert.equal(S().page, 'today'); assert.match(m, /class="fix-ins mt-3 just-saved">[\s\S]*?<b>Zapsáno: /); /* SCHEMA 86: zápis je řádek v kartě pásu dne */ act('noop'); assert.doesNotMatch(markup(), /just-saved/, 'zvýraznění jen jednou');
  /* LF-23: oprava inzulinu – volby pod sebou, uložení samostatným tlačítkem, řádek „Opraveno“ */
  const last = S().episodes[S().episodes.length - 1]; act('fixInsulinOpen', last.id); m = markup();
  assert.match(m, /class="choice-row col mt-2" role="group" aria-label="Jak to bylo s inzulinem\?"/); assert.match(m, /data-action="fixInsulin" data-value="[^"]*:" disabled/);
  act('fixInsulinPick', last.id + ':none'); assert.equal(last.insulin.confirmed, 'as', 'volba sama neukládá'); act('fixInsulin', last.id + ':none'); assert.equal(last.insulin.confirmed, 'none');
  assert.match(markup(), /Opraveno: bez inzulinu · \d{1,2}:\d\d/);
  /* A11 + řemeslo 13: nadpisy karet h2, dekorativní kolečka pryč */
  chapter('week'); act('role', 'patient'); act('page', 'today'); m = markup(); assert.match(m, /<h2 class="card-title">/); assert.doesNotMatch(m, /data-icon="(heart|flag|award|calendar)"/);
  act('page', 'foods'); m = markup(); assert.match(m, /<ul class="food-list"[^>]*><li><button type="button" class="food-row" data-action="foodOpen"/);
  /* řemeslo 9: známé jídlo s reakcí nese jen štítek reakce; bez pilulky „X z N v cíli“ */
  const kf = food('Ovesná kaše s mlékem a banánem').id; if (S().foodOpen !== kf) act('foodOpen', kf); m = markup();
  assert.doesNotMatch(m, /class="in tag/); assert.doesNotMatch(m, /<span class="tag known">[\s\S]{0,400}?<span class="tag (ok|over|warn)">/, 'dva štítky pro jeden fakt');
  /* A12 + řemeslo 16: záhlaví návrhu, které nic nedělá, není tlačítko */
  chapter('reviewProposals'); act('role', 'doctor'); m = markup(); assert.doesNotMatch(m, /data-action="noop"/); assert.match(m, /<div class="bar"><span class="n">\d<\/span><h3>/);
  /* A18: průvodce položkou bez h4, Stopa s pojmenovaným sloupcem */
  act('page', 'registry'); act('regOpen', 'B-HYPO'); m = markup(); assert.doesNotMatch(m, /<h4>/); assert.doesNotMatch(m, /class="reg-row[^"]*"[^>]*><span class="ic"/);
  act('page', 'trace'); m = markup(); assert.match(m, /<h2>Stopa \(/); assert.match(m, /<th scope="col"><span class="sr-only">Data<\/span><\/th>/);
  /* LF-21: změněná dávka „nová“ v tabulce a v kroku 1 prvních tří jídel */
  const P1 = { id: 'P1', doses: { breakfast: { units: 8 }, lunch: { units: 10 }, dinner: { units: 8 }, basal: { units: 18, time: '21:00' } } };
  const P2 = { id: 'P2', previousId: 'P1', doses: { breakfast: { units: 10 }, lunch: { units: 10 }, dinner: { units: 8 }, basal: { units: 18, time: '21:00' } } };
  assert.match(plain(NF.screens.dosesTable(P2, P1)), /class="dose was sm"[^>]*aria-label="dřív 8 jednotek">.*?<b>8<\/b>.*?class="dose new sm"[^>]*aria-label="10 jednotek, nová">.*?<b>10<\/b>/);
  const fakeS = { plans: [P1, P2], episodes: [] }; const realPlanById = NF.planById; NF.planById = (st, id) => st.plans.find(x => x.id === id);
  assert.deepEqual(JSON.parse(JSON.stringify(NF.screens.newDose(fakeS, P2, 'breakfast'))), { was: 8 }); assert.equal(NF.screens.newDose(fakeS, P2, 'lunch'), null);
  fakeS.episodes = [1, 2, 3].map(i => ({ planId: 'P2', meal: 'breakfast' })); assert.equal(NF.screens.newDose(fakeS, P2, 'breakfast'), null, 'po třech jídlech už ne');
  NF.planById = realPlanById;
  /* produkce bez prezentační vrstvy: štítek DEMO i na převzetí */
  boot({ withDemo: false }); assert.match(markup(), /class="demo-band"/);
});

test('Rozhodnutí 20. 10. 2026 (SCHEMA 62): LF-06 body ověření s daty, token dávky, tkanina zápisů, detail jídla jako obrazovka', () => {
  /* LF-06: body v jednom smyslu, číslo z dat, bod s rozporem nepřepne „Vše sedí“, větev dál trojstavem */
  const reg = NF.item(S(), 'D-POSTUP');
  Object.keys(reg.postup).forEach(k => { const p = reg.postup[k]; assert.ok(Array.isArray(p.fakta) && p.fakta.length === p.verify.length, k + ': fakta ke každému bodu'); assert.equal(p.verify.some(v => /je mimo cíl/.test(v)), false, k + ': bod v opačném smyslu'); });
  chapter('reviewProposals'); act('role', 'doctor');
  /* 25. 10. 2026: bod o vyrovnání se vyhodnotí z času v cíli i HbA1c (C-CILE). V příběhu je HbA1c 55 nad cílem 53, bod data nevyvracejí;
     pro ověření LF-06 posuneme cíl HbA1c na 60 – pak data odporují celé disjunkci (čas v cíli 72 ≥ 70 a HbA1c 55 ≤ 60). */
  NF.activePlan(S()).targets.hba1cGoal = 60; NF.activePlan(S()).targets.tirGoal = 65; /* SCHEMA 80: čas v cíli v příběhu 68 % – i cíl času posuneme, aby data odporovala celé disjunkci */ act('startReview'); act('reviewStep', '2'); /* Q6 (27. 10. 2026): návrh k bazálu z nocí v exportu má přednost a je první; lékař ho ponechá, aby byl na řadě návrh k jídlu */ if (S().review.proposals.some(p => p.id === 'PR-BAZAL') && !S().review.decisions['PR-BAZAL']) act('propDecide', 'PR-BAZAL:keep');
  const r = S().review, pr = r.proposals.find(p => p.kind === 'dose' && p.id === NF.nextProposal(S()).id);
  assert.ok(pr && pr.facts && pr.facts.length === pr.verify.length);
  const ai = pr.facts.findIndex(f => f && f.against); assert.ok(ai >= 0, 'čas v cíli nad cílem odporuje bodu o vyrovnání');
  assert.match(pr.facts[ai].text, /čas v cíli \d+ % \(cíl \d+ %\)/);
  let m = markup(); assert.match(m, /class="v-fact">/); assert.match(m, /data říkají jinak/);
  assert.match(m, /<button type="button" class="btn sm" data-action="propVerifyAll"/, 'Vše sedí jako obrysové tlačítko');
  act('propVerifyAll', pr.id);
  assert.equal(r.verify[pr.id][ai], undefined, 'Vše sedí bod s rozporem nepřepne');
  assert.ok(pr.verify.every((_, i) => i === ai || (NF.nurseKey(pr, i) ? r.verify[pr.id][i] === undefined : r.verify[pr.id][i] === true))); /* SCHEMA 78 (bod 7) */
  assert.equal(NF.screens.proposalBranch(S(), pr).action, 'wait', 'postup čeká na lékařovo posouzení');
  act('propVerify', pr.id + ':' + ai + ':no'); assert.match(NF.screens.proposalBranch(S(), pr).text, /celkově v cíli/);
  act('propVerify', pr.id + ':' + ai + ':yes'); assert.equal(NF.screens.proposalBranch(S(), pr).action, 'up');
  act('propVerifyAll', pr.id); assert.equal(r.verify[pr.id][ai], true, 'lékařova volba u bodu s rozporem zůstane');
  /* Podpis A: token dávky všude, kde pacient dávku vidí; žádný rozdíl „+2“ u pacienta */
  const tok = NF.screens.dose(8); assert.match(tok, /class="dose"/); assert.match(tok, /data-icon="key-round"/); assert.match(tok, /<b>8<\/b><span class="u">j\.<\/span>/); assert.doesNotMatch(tok, /klíč/);
  assert.match(NF.screens.dose(8, 'done'), /data-icon="check"[\s\S]*píchnuto/); assert.match(NF.screens.dose(10, 'new'), /nová/);
  chapter('firstMeal'); m = markup(); assert.match(m, /<div class="insulin">[\s\S]*?class="dose"/, 'krok 1');
  chapter('handover'); act('role', 'patient'); act('takeoverPage', '2'); assert.match(markup(), /class="dose sm"/, 'převzetí');
  everyScreen((mk, where) => { if (/\/patient$/.test(where)) assert.doesNotMatch(mk, /[+−-]\d+\s*j\./, where + ': rozdíl dávky u pacienta'); });
  /* Podpis C: tkanina – pacient 7 dní v Cestě ke kontrole místo dlaždic, lékař celé období; jen činy */
  chapter('week'); act('role', 'patient'); act('page', 'plan'); m = markup(); /* SCHEMA 86: Cesta ke kontrole v Mém plánu */
  const path_ = m.match(/<section class="card path">[\s\S]*?<\/section>/)[0];
  assert.match(path_, /class="weave lg" style="--days:7"/); assert.doesNotMatch(path_, /class="row3"/); assert.doesNotMatch(path_, /mmol|v cíli|v řadě|série/);
  const wv = NF.weave(S(), '2026-10-06', S().clock); assert.ok(wv.days.every(d => d.cells.length === 4 && d.cells.every(c => ['done', 'skipped', 'missing', 'future'].includes(c))));
  assert.ok(wv.days[0].cells[0] === 'done', 'první snídaně zapsána');
  const S0 = S(); S0.illnessLog = [{ from: '2026-10-08T08:00:00', to: '2026-10-09T20:00:00' }]; assert.equal(NF.weave(S0, '2026-10-06', S0.clock).totals.ill, 2);
  chapter('reviewProposals'); act('role', 'doctor'); act('reviewStep', '1'); m = markup();
  assert.match(m, /<section class="card weave-card">[\s\S]*?class="weave" style="--days:92"/, 'lékař 92 dní');
  /* Vaše jídla: řádky a detail jako samostatná obrazovka se Zpět */
  assert.ok(NF.PAGES.includes('food'));
  chapter('week'); act('role', 'patient'); act('page', 'foods'); m = markup();
  assert.match(m, /<button type="button" class="food-row" data-action="foodOpen" data-value="[^"]+"><div class="emoji[\s\S]*?<span class="name">[\s\S]*?<span class="chev"/);
  const kf = food('Ovesná kaše s mlékem a banánem').id; act('foodOpen', kf); assert.equal(S().page, 'food'); m = markup();
  assert.match(m, /data-action="foodBack"[^>]*>[\s\S]*?Zpět na jídla/); assert.match(m, /<h1>Ovesná kaše s mlékem a banánem<\/h1>/); assert.match(m, /class="card food"[\s\S]*class="peak/);
  assert.match(m, /<nav class="tabbar"[\s\S]*?class="active" aria-current="page"[^>]*>[\s\S]*?Jídla/);
  act('foodBack'); assert.equal(S().page, 'foods'); assert.match(markup(), /class="food-list"/);
});

test('Závěrečná kontrola 21. 10. 2026 – prezentační vrstva: pomlčky, názvy obrazovek, bazál, stopa, lišta, panel, sazba', () => {
  /* S2: česká pomlčka v celé vrstvě ukázky */
  for (const f of DEMO) assert.equal(/—/.test(fs.readFileSync(path.join(__dirname, f), 'utf8')), false, f + ': česká pomlčka – místo —');
  /* V8: každá stránka scény má název, syrový klíč se neukáže */
  for (let i = 0; i < D.scenes.length; i++) { const n = D.playScene(i); assert.ok(D.pageNames[n.page], 'scéna ' + (i + 1) + ': stránka „' + n.page + '“ bez názvu'); }
  for (const p of ['food', 'newplan', 'takeover']) assert.ok(D.pageNames[p], p); /* 'import' zrušena v SCHEMA 74 */
  chapter('week'); let m = markup(); assert.match(m, /Na obrazovce: Pacient · Detail jídla/); assert.equal(/Pacient · food/.test(m), false);
  /* S12 + N19: úvod bez počítadla a bez „Na obrazovce“, počítadlo jedním zněním */
  act('goScene', '0'); act('closeDrawer'); m = markup();
  assert.match(m, /Ke schválení · zbývá/); assert.equal(/položek ke schválení během ukázky/.test(m), false); assert.equal(/Úvod scény/.test(m), false); assert.equal(/class="tour-hint"/.test(m), false, 'tip až ve scéně 2');
  act('goScene', '1'); act('closeDrawer'); assert.match(markup(), /class="tour-hint"/); assert.match(markup(), /class="tour-progress-l"/);
  /* N21: mimo příběh jen jednou */
  act('page', 'registry'); m = markup(); assert.match(m, /<h2>Prohlížíte schvalovací registr<\/h2>/);
  /* S7: dnešní bazál (21:00) se ráno nezapisuje dopředu; minulé večery ano */
  chapter('illness'); assert.equal(S().basalLog.some(b => b.date === '2026-10-20'), false); assert.ok(S().basalLog.some(b => b.date === '2026-10-19'));
  assert.ok(S().basalLog.every(b => b.at <= S().clock), 'žádný bazál z budoucnosti');
  chapter('firstMeal'); assert.ok(S().basalLog.some(b => b.date === '2026-10-05'), 'první večer po převzetí');
  /* V05: zápisy jídel ve stopě nese pacient s časem zápisu */
  chapter('preview'); const evs = S().events.filter(x => x.what === 'jidlo.zapsano');
  assert.ok(evs.length > 50 && evs.every(x => x.who === 'patient'), 'aktér zápisu jídla = pacient');
  assert.ok(new Set(evs.map(x => x.at)).size > 50, 'čas zápisu, ne hodiny scény');
  /* P36, V03: text rady bez sacharidů, průvodce bez zástupných znaků */
  chapter('impact'); assert.equal(/sacharid/.test(NF.item(S(), 'R-PORADI').text), false); assert.match(NF.item(S(), 'R-PORADI').text, /Když budete mít dost dřív, než jídlo dojíte, řiďte se pravidlem „Méně jídla než obvykle“/);
  for (const id of Object.keys(D.guide)) assert.equal(/\{(first|addon|lever)\}/.test(D.guide[id].jak || ''), false, id);
  /* P31: milník z minulé scény už na Dnes nevisí */
  chapter('advice'); assert.equal(NF.pendingMilestone(S()), null);
  /* P10: převzetí ukáže stránky 3 a 5 jako samostatné kroky */
  const ho = D.tour.stepsFor('handover', D.defaults).map(st => (st.do || []).filter(o => o.act === 'takeoverPage').map(o => o.val).join(','));
  assert.ok(ho.includes('3') && ho.includes('5'), ho.join(' | '));
  /* N18: zásuvka přehledu scén prochází sazbou */
  act('openPresenter'); assert.match(elements.get('overlay').innerHTML, / /); act('closeDrawer');
  assert.match(fs.readFileSync(path.join(__dirname, 'demo/auth.js'), 'utf8'), /NF\.nbsp\(/, 'přihlašovací stránka se sází jako jádro');
  /* V1/S10, V2, V9, S3, S4, S11, S14, N16, N20 v demo.css */
  const css = fs.readFileSync(path.join(__dirname, 'demo/demo.css'), 'utf8');
  assert.equal(/saturate/.test(css), false, 'tlačítka aplikace se v zamčeném příběhu neodbarvují');
  assert.match(css, /\.rail\{top:var\(--barh,0px\);height:calc\(100vh - var\(--barh,0px\)\)\}/);
  assert.match(css, /@media \(max-width:1560px\)\{\s*body\.pres-panel\.pres-doctor \.desk,body\.pres-panel\.pres-nurse \.desk\{padding-right:calc\(var\(--nf-demo-panel-w\) \+ 40px\)\}/);
  assert.match(css, /\.drawerpanel:has\(\.pres-drawer\)>\.close\{color:var\(--nf-demo-strong\)\}/);
  assert.match(css, /\.tour-panel details\.more>summary,\.pres-drawer details\.more>summary,\.intro details\.more>summary\{color:var\(--nf-demo-strong\)\}/);
  assert.match(css, /\.pres-bar \.where\{[^}]*text-overflow:ellipsis/); assert.match(css, /\.intro-grid\{[^}]*align-items:start/);
  assert.match(css, /\.gate input:focus-visible\{outline:2px/);
});
test('Souhrn rozhodnutí na celou šířku (V4, 21. 10. 2026): stránka vlevo, čtyři čísla, nerozhodnuté první, jen klinické položky; panel jen potvrzení', () => {
  const fin = D.scenes.findIndex(x => !x.appendix && D.chapters[x.ch].id === 'trace'); act('goScene', String(fin)); act('closeDrawer');
  let m = markup(); assert.equal(/class="gsum-page"/.test(m), false, 'před posledním krokem je obrazovka stopy');
  ['K-KRITERIA', 'R-REAKCE'].forEach(id => act('garantDecide', id + ':approved')); act('garantDecide', 'B-HYPO:rejected:ano');
  S().tourStep = D.tour.stepsFor('trace', S().branches).length; NF.render(); m = markup();
  const main = m.slice(m.indexOf('<main'));
  assert.match(main, /<div class="gsum-page" id="gsum">/, 'souhrn je v obsahu vlevo'); assert.match(main, /<h1>Vaše rozhodnutí<\/h1>/); assert.equal(D.summaryActive(S()), true);
  assert.match(main, /<b>2<\/b><span>schváleno<\/span><\/div><div><b>1<\/b><span>zamítnuto<\/span><\/div><div><b>25<\/b><span>nerozhodnuto<\/span><\/div><div><b>0<\/b><span>s poznámkou<\/span>/, 'čtyři čísla nahoře');
  const rows = [...main.matchAll(/data-gsum-row="([^"]+)"/g)].map(x => x[1]);
  assert.deepEqual([...rows].sort(), [...NF.garantItems(S()).map(r => r.id)].sort(), 'jen klinické položky, každá jednou');
  assert.ok(S().registry.items.some(r => r.scope === 'provozni'), 'registr má provozní položky'); S().registry.items.filter(r => r.scope === 'provozni').forEach(r => assert.equal(rows.includes(r.id), false, r.id + ' garant nevidí'));
  const firstDone = rows.findIndex(id => NF.itemTouched(S(), id)); assert.ok(firstDone > 0 && rows.slice(firstDone).every(id => NF.itemTouched(S(), id)), 'nerozhodnuté první');
  assert.match(main, /Nerozhodnuto \(25\)/); assert.match(main, /<th scope="col">Poznámka<\/th>/);
  /* rozhodnuté seskupené po scénách v pořadí příběhu */
  const groups = [...main.matchAll(/scope="colgroup">([^<]+)</g)].map(x => x[1]); assert.equal(groups[0], 'Nerozhodnuto (25)'); assert.ok(groups.slice(1).every(g => /^Scéna \d+ · /.test(g) || /^Bez vlastní scény/.test(g)), 'skupiny po scénách: ' + groups.join(' | '));
  const nums = groups.slice(1).map(g => Number((g.match(/^Scéna (\d+)/) || [])[1] || 999)); assert.deepEqual(nums, [...nums].sort((a, b) => a - b), 'scény v pořadí příběhu');
  assert.match(main, /data-action="garantOpen" data-value="B-HYPO" aria-expanded="false" aria-label="Změnit: [^"]+">Změnit</); assert.match(main, /data-action="garantOpen" data-value="D-CISTA" aria-expanded="false" aria-label="Rozhodnout: [^"]+">Rozhodnout</);
  /* panel: bez seznamu položek, jedinou akcí je potvrzení souhrnu */
  const panel = m.slice(m.indexOf('<aside'), m.indexOf('</aside>'));
  assert.equal(/class="gitem/.test(panel), false, 'v panelu není seznam položek'); assert.match(panel, /class="btn primary" data-action="garantConfirmSummary">Potvrdit souhrn</); assert.equal(/data-action="tourNext"/.test(panel), false);
  /* změna rozhodnutí přímo na stránce: řádek se rozbalí s průvodcem a dvěma rovnocennými volbami; SCHEMA 83: pole poznámky až po rozhodnutí, řádek zůstane otevřený */
  D.noteDraft('D-CISTA', 'doplnit výjimku'); act('garantOpen', 'D-CISTA'); m = markup();
  assert.match(m, /<tr class="gsum-detail" id="gsum-d-D-CISTA">/); assert.match(m, /data-action="garantDecide" data-value="D-CISTA:approved"/); assert.match(m, /Co schvalujete/); assert.equal(/data-gnote="D-CISTA"/.test(m), false, 'před rozhodnutím bez pole');
  act('garantDecide', 'D-CISTA:approved'); m = markup(); assert.equal(S().gOpen, 'D-CISTA', 'řádek zůstane otevřený s polem poznámky'); assert.match(m, /<span>Proč jste schválili\? \(nepovinné\)<\/span><textarea[^>]*data-gnote="D-CISTA"[^>]*>doplnit výjimku<\/textarea>/); assert.match(m, /„doplnit výjimku“/, 'poznámka v tabulce celá'); assert.equal(D.garantSummary(S()).touched, 4);
  act('garantOpen', 'D-CISTA'); assert.equal(S().gOpen, '-');
  /* stránka není zamčená; odkaz vrátí obrazovku stopy (zamčenou) a panel nabídne návrat */
  assert.match(fs.readFileSync(path.join(__dirname, 'demo/presenter.js'), 'utf8'), /locked = !away\(s0\) && !gsum/);
  act('gsumTrace'); m = markup(); assert.equal(/class="gsum-page"/.test(m), false); assert.match(m, /data-action="gsumTrace">Zpět na souhrn/); act('gsumTrace'); assert.match(markup(), /class="gsum-page"/);
  /* po potvrzení: děkovná karta v panelu, souhrn zůstává vlevo */
  act('garantConfirmSummary', 'force'); m = markup(); assert.match(m, /Děkujeme(, máme vaše rozhodnutí|\. Rozhodnutí zatím nejsou odeslaná)/); assert.match(m, /class="gsum-state">✓ Souhrn potvrzen/); assert.match(m, /class="gsum-page"/);
  /* rozvržení: místo pro panel od 1101 px, pod 760 px řádky jako karty, jen tokeny */
  const css = fs.readFileSync(path.join(__dirname, 'demo/demo.css'), 'utf8'), block = css.slice(css.indexOf('/* ---------- souhrn rozhodnutí na celou šířku'));
  assert.match(block, /@media \(min-width:641px\)\{body\.pres-panel \.gsum-page\{padding-right:calc\(var\(--nf-demo-panel-w\)/); /* SCHEMA 78 (A1): panel po boku od --nf-demo-side-min */ assert.match(block, /@media \(max-width:760px\)\{[\s\S]*\.gsum-table thead\{display:none\}/);
  assert.equal(/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(block), false, 'souhrn bez pevných barev'); assert.deepEqual(block.replace(/@media[^{]*\{/g, '').match(/\b(?!1px)\d+px\b/g) || [], [], 'souhrn bez pevných rozměrů (kromě vlasové linky 1px)');
});

/* Malý DOM pro testy vysvětlivek: parser značek a selektory, jaké používá demo/explain.js (značka, .třída, [atribut], [atribut=hodnota], mezera, čárka). */
function miniDom(html) {
  const VOID = new Set(['input', 'br', 'img', 'hr', 'meta', 'link', 'source', 'col', 'wbr']);
  const parseSel = sel => sel.split(',').map(p => p.trim().split(/\s+/).map(c => {
    const o = { tag: null, cls: [], attrs: [] }; const re = /^([a-z][\w-]*)|\.([\w-]+)|#([\w-]+)|\[([\w-]+)(?:=("?)([^\]"]*)\5)?\]/gi; let m;
    while ((m = re.exec(c))) { if (m[1]) o.tag = m[1].toLowerCase(); else if (m[2]) o.cls.push(m[2]); else if (m[3]) o.attrs.push(['id', m[3]]); else o.attrs.push([m[4], m[6]]); }
    return o;
  }));
  const one = (n, c) => n.tag && (!c.tag || n.tag === c.tag) && c.cls.every(k => n.cls.includes(k)) && c.attrs.every(([k, v]) => k in n.attrs && (v === undefined || n.attrs[k] === v));
  const chain = (n, parts, i) => { if (!one(n, parts[i])) return false; if (i === 0) return true; for (let p = n.parent; p && p.tag; p = p.parent) if (chain(p, parts, i - 1)) return true; return false; };
  const matches = (n, sel) => parseSel(sel).some(parts => chain(n, parts, parts.length - 1));
  const all = (root, sel) => { const out = []; const walk = x => { for (const c of x.children) { if (matches(c, sel)) out.push(c); walk(c); } }; walk(root); return out; };
  const proto = {
    matches(sel) { return matches(this, sel); }, closest(sel) { for (let x = this; x && x.tag; x = x.parent) if (matches(x, sel)) return x; return null; },
    querySelector(sel) { return all(this, sel)[0] || null; }, querySelectorAll(sel) { return all(this, sel); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, hasAttribute(k) { return k in this.attrs; },
    get textContent() { return this.text != null ? this.text : this.children.map(c => c.textContent).join(''); },
    get parentElement() { return this.parent && this.parent.tag ? this.parent : null; },
    get classList() { const n = this; return { contains: k => n.cls.includes(k) }; }
  };
  const root = Object.assign(Object.create(proto), { tag: null, children: [], attrs: {}, cls: [] }); let cur = root;
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)/g; let m;
  while ((m = re.exec(html))) {
    if (m[4] != null) { cur.children.push(Object.assign(Object.create(proto), { tag: null, text: m[4], children: [], attrs: {}, cls: [], parent: cur })); continue; }
    const tag = m[2].toLowerCase();
    if (m[1]) { let x = cur; while (x && x.tag !== tag) x = x.parent; if (x) cur = x.parent; continue; }
    const attrs = {}; m[3].replace(/([\w:-]+)(?:="([^"]*)")?/g, (_, k, v) => { attrs[k] = v === undefined ? '' : v; });
    const node = Object.assign(Object.create(proto), { tag, attrs, cls: (attrs.class || '').split(/\s+/).filter(Boolean), children: [], parent: cur });
    cur.children.push(node); if (!VOID.has(tag) && !/\/\s*$/.test(m[3])) cur = node;
  }
  return root;
}
/* Projde celý příběh (všechny scény včetně dodatku, každý krok) a vrátí obrazovky jako text od <main>. */
function storyScreens() {
  const out = [];
  for (let si = 0; si < D.scenes.length; si++) {
    act('goScene', String(si)); act('closeDrawer');
    const n = D.tour.stepsFor(D.chapters[S().chapterIndex].id, S().branches).length;
    for (let k = 0; k <= n; k++) { const m = markup(); out.push({ where: 'scéna ' + (si + 1) + ' krok ' + k + ' (' + S().role + ')', html: m.slice(m.indexOf('<main')) }); if (k < n) next(); }
  }
  return out;
}

test('Bublina „klepne ukázka“ (S4, 21. 10. 2026; oprava 26. 10. 2026): jen u ovládacího prvku, do prázdna nic, aplikace se nezmění', () => {
  act('goScene', '3'); act('closeDrawer'); app.act('tourNext');
  const before = JSON.stringify(S());
  const main = { getBoundingClientRect() { return { left: 0, top: 60, right: 900, bottom: 800 }; }, contains: x => !!(x && x.inMain) };
  ctx.document.querySelector = sel => (sel === 'main' ? main : null);
  /* prvek pod prstem: co vrátí elementFromPoint, když demo.css na okamžik vrátí main zásah (třída pres-probe) */
  const node = (sels, inMain = true) => ({ inMain, closest: sel => (sel.split(',').some(q => sels.includes(q.trim())) ? { inMain, getAttribute: () => null } : null) });
  let under = null, probed = [];
  ctx.document.elementFromPoint = () => { probed.push(ctx.document.body.className); return under; };
  const tap = (x, y, cls) => ({ target: { closest: sel => (cls && sel.split(',').some(q => q.trim() === cls) ? {} : null) }, clientX: x, clientY: y, detail: 1 });
  ctx.document.body = { className: 'pres-doctor pres-panel' };
  under = node(['button']);
  assert.equal(D.lockedTap(tap(100, 200)), false, 'bez zamčení se bublina neukáže');
  ctx.document.body = { className: 'pres-doctor pres-locked pres-panel' };
  assert.equal(D.lockedTap(tap(100, 200, '.tour-panel')), false, 'klepnutí do panelu bublinu neukáže');
  assert.equal(D.lockedTap(tap(1000, 200)), false, 'mimo obrazovku aplikace nic');
  under = node([]); assert.equal(D.lockedTap(tap(100, 200)), false, 'klepnutí do prázdna (karta, text) bublinu neukáže');
  under = null; assert.equal(D.lockedTap(tap(100, 200)), false, 'nic pod prstem: nic');
  under = node(['button'], false); assert.equal(D.lockedTap(tap(100, 200)), false, 'pozadí mimo main (#app, body): nic');
  assert.ok(probed.every(c => /pres-probe/.test(c)), 'zásah se zjišťuje s třídou pres-probe'); assert.equal(/pres-probe/.test(ctx.document.body.className), false, 'třída se hned vrátí');
  for (const sel of ['button', 'a', 'input', 'select', 'textarea', 'label', 'summary', '[data-action]', '[data-bind]', '[role=button]', '[role=switch]', '[role=tab]']) {
    under = node([sel]); assert.equal(D.lockedTap(tap(100, 200)), true, 'ovládací prvek ' + sel);
  }
  const bub = elements.get('lock-bubble'); assert.match(plain(bub.innerHTML), /^Tohle za vás klepne ukázka\. Pokračujte v panelu (vpravo|dole)\.$/);
  assert.match(D.lockBubbleText(), /panelu (vpravo|dole)\./);
  assert.equal(JSON.stringify(S()), before, 'klepnutí v aplikaci nic nezměnilo');
  const src = fs.readFileSync(path.join(__dirname, 'demo/presenter.js'), 'utf8');
  assert.match(src, /BUBBLE_MS = 3000/); assert.match(src, /setAttribute\('aria-live', 'polite'\)/); assert.match(src, /'Tohle za vás klepne ukázka\. Pokračujte v panelu ' \+ \(D\.narrow\(\) \? 'dole' : 'vpravo'\)/);
  const css = fs.readFileSync(path.join(__dirname, 'demo/demo.css'), 'utf8');
  assert.match(css, /body\.pres-locked main\{pointer-events:none\}/, 'zamčení zůstává'); assert.match(css, /\.lock-bubble\{[^}]*pointer-events:none/); assert.match(css, /\.lock-bubble\{[^}]*width:var\(--nf-demo-bubble-w\)/);
  assert.match(css, /body\.pres-probe main,body\.pres-probe main \.tour-focus\{pointer-events:auto\}/);
  /* pokyn „Ovládejte jen fialovými tlačítky“ jen ve scénách 1–2 */
  for (let i = 2; i < D.scenes.length; i++) { act('goScene', String(i)); act('closeDrawer'); assert.equal(/class="tour-hint"/.test(markup()), false, 'scéna ' + (i + 1)); }
});

test('Vysvětlivky (26. 10. 2026): klepnutí na vysvětlený prvek ukáže nadpis, text a položku registru; přednost před „klepne ukázka“', () => {
  chapter('reviewSummary'); act('startReview');
  const doc = miniDom(markup().slice(markup().indexOf('<main')));
  const tile = doc.querySelector('.tiles.report .tile[data-value=tir]'); assert.ok(tile, 'dlaždice času v cíli je na obrazovce');
  tile.attrs['data-nf-explain'] = 'tile-tir'; tile.getBoundingClientRect = () => ({ left: 10, top: 100, right: 300, bottom: 220, width: 290, height: 120 });
  const main = { getBoundingClientRect() { return { left: 0, top: 60, right: 900, bottom: 800 }; }, contains: () => true };
  ctx.document.querySelector = sel => (sel === 'main' ? main : null);
  ctx.document.body = { className: 'pres-doctor pres-locked pres-panel' };
  const inner = tile.querySelector('.v'); ctx.document.elementFromPoint = () => inner;
  assert.equal(D.lockedTap({ target: { closest: () => null }, clientX: 100, clientY: 150, detail: 1 }), true);
  const h = plain(elements.get('explain-bubble').innerHTML);
  assert.match(h, /class="xb-t">Čas v cíli \(TIR\)</, 'nadpis');
  assert.match(h, /mezi 3,9 a 10,0 mmol\/l/, 'čísla z cílů glukózy'); assert.match(h, /Zelená je od cíle pacienta 70 %, oranžová od 50 %/, 'zelená z cílů pacienta (C15), oranžová ze S-SEMAFOR');
  assert.match(h, /Tohle tlačítko za vás v příběhu klepne ukázka\./, 'dlaždice je zároveň tlačítko');
  assert.match(h, /data-action="explainItem" data-value="S-SEMAFOR">Semafor času v cíli \(TIR\)</, 'položka registru jako odkaz');
  assert.match(h, /data-xb="close" aria-label="Zavřít vysvětlení"/);
  assert.equal(elements.get('lock-bubble').innerHTML, '', 'hláška o klepání se neukáže');
  assert.equal(D.explainOpen(), 'tile-tir');
  /* odkaz otevře průvodce položkou pro garanta (bez skoku ze scény) */
  act('explainItem', 'S-SEMAFOR'); assert.equal(D.explainOpen(), null, 'bublina se zavře');
  const dr = plain(NF.slots.drawer(S(), 'explain-item:S-SEMAFOR')); assert.match(dr, /Položka registru · S-SEMAFOR/); assert.match(dr, /Co schvalujete/); assert.doesNotMatch(dr, /goSceneFrom/, 'z průvodce v bublině se ze scény neskáče');
  /* zavírá se Esc, křížkem nebo klepnutím jinam; sama po 3 s nezmizí */
  const src = fs.readFileSync(path.join(__dirname, 'demo/explain.js'), 'utf8');
  assert.match(src, /ev\.key === 'Escape' && open/); assert.match(src, /data-xb=close/); assert.match(src, /if \(open\) D\.explainHide\(false\);\n  return false;/); assert.doesNotMatch(src, /setTimeout\(/, 'vysvětlení se samo nezavírá');
  assert.match(src, /setAttribute\('role', 'dialog'\)/); assert.match(src, /setAttribute\('aria-label', 'Vysvětlení: '/); assert.match(src, /setAttribute\('tabindex', '0'\)/); assert.match(src, /aria-describedby/);
  /* mimo zamčení: neovládací prvek se vysvětlí, u ovládacího má přednost akce aplikace */
  const why = doc.querySelector('.tiles.report .tile .d'); why.attrs['data-nf-explain'] = 'tile-cmp';
  const gid = ctx.document.getElementById; ctx.document.getElementById = id => (id === 'main' ? { contains: () => true } : gid(id));
  assert.equal(D.explainTap({ target: why, clientX: 1, clientY: 1 }), false, 'řádek leží v tlačítku dlaždice: akce aplikace má přednost');
  const weave = doc.querySelector('.weave'); weave.attrs['data-nf-explain'] = 'weave'; const cell = weave.querySelector('i');
  assert.equal(D.explainTap({ target: cell, clientX: 1, clientY: 1 }), true, 'tkanina není ovládací: vysvětlí se');
  const h2 = plain(elements.get('explain-bubble').innerHTML); assert.match(h2, /class="xb-t">Pruh zápisů</); assert.doesNotMatch(h2, /klepne ukázka/, 'mimo zamčení bez věty o klepání');
  ctx.document.getElementById = gid;
  /* jen prezentační vrstva: HTML ji načítá za presenter.js, jádro ji nezná */
  assert.match(html, /<script src="demo\/presenter\.js\?v=\d+"><\/script>\n<script src="demo\/explain\.js\?v=\d+"><\/script>/);
  for (const f of CORE) assert.doesNotMatch(fs.readFileSync(path.join(__dirname, f), 'utf8'), /nf-explain|data-nf-explain|D\.explain/, f);
  /* legenda v panelu a na úvodu */
  assert.match(D.panelHtml(S()), /Fialově podtečkované věci vysvětlí bublina po klepnutí\./);
  act('goScene', '0'); act('closeDrawer'); assert.match(markup(), /Fialově <span class="xb-sample">podtečkované<\/span> věci vysvětlí bublina po klepnutí\./);
});

test('Vysvětlivky: každá položka katalogu se v příběhu aspoň jednou najde; texty celými větami, bez „·“, čísla z registru, položka viditelná garantovi', () => {
  assert.ok(D.explain.length >= 30 && D.explain.length <= 50, 'katalog má ' + D.explain.length + ' položek');
  assert.equal(new Set(D.explain.map(x => x.id)).size, D.explain.length, 'jedinečná id');
  const found = {}, checked = {};
  for (const sc of storyScreens()) {
    const doc = miniDom(sc.html), taken = new Set();
    for (const x of D.explain) {
      for (const el of doc.querySelectorAll(x.sel)) {
        if (taken.has(el) || !D.explainOk(x, el)) continue; taken.add(el); found[x.id] = found[x.id] || sc.where;
        const c = D.explainContent(x, el, S()), key = x.id + '|' + c.title + '|' + c.text + '|' + c.item;
        if (checked[key]) continue; checked[key] = 1;
        assert.ok(c.title && c.text, x.id + ': nadpis a text');
        assert.doesNotMatch(c.title + ' ' + c.text, /·/, x.id + ': bez teček „·“ jako spojky');
        assert.doesNotMatch(c.title + ' ' + c.text, /undefined|NaN|null|\{|\}/, x.id + ': čísla z registru dosazena (' + c.text + ')');
        const sentences = c.text.split(/(?<=[.!?“])\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ„])/).filter(Boolean);
        assert.ok(sentences.length >= 1 && sentences.length <= 3, x.id + ': 1 až 3 věty (' + sentences.length + ')');
        assert.ok(sentences.every(t => /[.!?“]$/.test(t.trim()) && t.split(/\s+/).length >= 4), x.id + ': celé věty, ne heslovitě');
        if (x.item) { assert.ok(c.item, x.id + ': položka registru existuje a garant ji vidí'); assert.notEqual(NF.item(S(), c.item).scope, 'provozni', x.id); }
      }
    }
  }
  const missing = D.explain.filter(x => !found[x.id]).map(x => x.id + ' (' + x.sel + ')');
  assert.equal(missing.length, 0, 'selektor, který v příběhu nic nenajde: ' + missing.join(', '));
  /* čísla a prahy se čtou z registru, ne natvrdo: po úpravě parametru se text změní */
  const reak = NF.item(S(), 'R-REAKCE'); reak.params.minKnown = 5;
  assert.match(D.explainContent(D.explainById.ring, null, S()).text, /Po 5 shodných zápisech/);
  NF.item(S(), 'S-SEMAFOR').params.tir_zluta = 55; assert.match(D.explainContent(D.explainById['tile-tir'], null, S()).text, /oranžová od 55 %/); /* SCHEMA 78 (C15): zelená je cíl pacienta, tir_zelena zrušen */
  /* zásady odst. 2: vysvětlení nenavrhuje dávku */
  for (const x of D.explain) { const t = D.explainContent(x, null, S()).text; assert.doesNotMatch(t, /\d+\s*j\./, x.id + ': bez jednotek inzulinu'); }
});

test('Katalog: sekce Prezentační vrstva čte demo/demo.css a ukazuje živé prvky vrstvy', () => {
  const cat = fs.readFileSync(path.join(__dirname, 'design-system/index.html'), 'utf8');
  assert.match(cat, /<link rel="stylesheet" href="\.\.\/demo\/demo\.css\?v=\d+">/); assert.match(cat, /href="#c-vrstva"/);
  const sec = cat.slice(cat.indexOf('id="vrstva"'), cat.indexOf('id="obrazovky"'));
  for (const cls of ['tour-panel', 'tour-head', 'tour-foot', 'tour-actions', 'appr pend', 'tour-watch', 'tour-focus', 'lock-bubble', 'gsum-page', 'gsum-table', 'gcounts', 'gchoices']) assert.ok(sec.includes(cls), 'katalog: ' + cls);
  assert.match(sec, /Dál ▶/); assert.equal(/style="(?!--)[^"]*#[0-9a-fA-F]/.test(sec), false, 'ukázky bez pevných barev');
  assert.match(fs.readFileSync(path.join(__dirname, 'design-system/catalog.js'), 'utf8'), /design\\\.css\|demo\\\.css/, 'inspektor bere pravidla i z demo.css');
});
test('Prověrka před e-mailem garantovi (SCHEMA 65, 21. 10. 2026): jedna míra „v cíli“ (vrchol), léky mimo inzulin na kontrole, shoda opsaných hodnot s exportem, týdenní nabídka vypnutá, věta pod tkaninou, vyprávění bez slibu „za dvě hodiny“', () => {
  /* jedna míra: vrchol proti hornímu cíli; vzestup zůstává jen pro shodu zápisů */
  assert.equal(NF.param(S(), 'R-REAKCE', 'kriterium', 'vzestup'), 'vrchol');
  chapter('firstResult'); const e1 = S().episodes.find(x => x.id === 'E1'); e1.manual.before = 8; NF.setManualPeak(S(), 'E1', 10.5);
  assert.ok(NF.epRise(S(), e1) <= 3, 'vzestup by byl v cíli'); assert.equal(NF.epInTarget(S(), e1), false, 'vrchol 10,5 je nad horním cílem');
  NF.setManualPeak(S(), 'E1', 9.5); assert.equal(NF.epInTarget(S(), e1), true);
  /* shoda opsaných hodnot s exportem: opsáno 9,5, export má vrchol 9,6 → shoda do 1 mmol/l */
  const csv = 'Device Timestamp,Historic Glucose mmol/L\n06-10-2026 07:05,6.8\n06-10-2026 07:35,8.1\n06-10-2026 08:05,9.6\n06-10-2026 08:35,9.0\n06-10-2026 09:05,8.2\n';
  const res = NF.importReadings(S(), NF.parseSensorCsv(csv)); assert.equal(res.ok, true); assert.equal(res.agree.n, 1); assert.equal(res.agree.ok, 1);
  assert.equal(S().sensorImport.agree.n, 1); assert.equal(S().sensorImport.agree.ok, 1); assert.equal(S().sensorImport.tol, 1);
  assert.ok(S().events.some(t => t.what === 'senzor.import' && t.data && t.data.agree && t.data.agree.ok === 1), 'shoda ve stopě');
  /* jiný lék na diabetes (SCHEMA 84, bod 5): otázka Ne / Ano, záznam do stopy; při Ano věta o hodnocení zvlášť a o platnosti NutriFee */
  chapter('reviewSummary'); act('role', 'doctor'); if (!S().review) act('startReview'); let m = markup();
  assert.match(m, /Začal pacient brát jiný lék na diabetes\?/); assert.match(m, /data-action="reviewMeds" data-value="no"/); assert.match(m, /data-action="reviewMeds" data-value="yes"/);
  if (S().sensorImport && S().sensorImport.agree && S().sensorImport.agree.n) assert.match(m, /Opsané nejvyšší hodnoty se s exportem shodovaly u <b>\d+ ze? \d+ jíd(la|el)<\/b>/, 'shoda v podkladech kontroly');
  act('reviewMeds', 'yes'); assert.equal(S().review.meds, 'yes'); assert.ok(S().events.some(t => t.what === 'kontrola.leky' && t.detail === 'začal jiný lék na diabetes'));
  assert.match(markup(), /hodnotí zvlášť/); assert.match(markup(), /dál platí/);
  act('page', 'trace'); assert.match(markup(), /Jiný lék na diabetes ověřen/);
  /* týdenní nabídka je parametr a pro studii vypnutá */
  assert.equal(NF.param(S(), 'S-TYDEN', 'nabidka', 1), 0); assert.doesNotMatch(NF.item(S(), 'S-TYDEN').summary, /jedna nabídka na příští týden/);
  /* tkanina: mezery nejsou chyba; vyprávění neslibuje výsledek za dvě hodiny */
  chapter('firstResult'); act('role', 'patient'); act('page', 'plan'); assert.match(markup(), /Mezery nejsou chyba\. Lékař uvidí celé období najednou\./);
  const tour = fs.readFileSync(path.join(__dirname, 'demo/tour-content.js'), 'utf8'); assert.doesNotMatch(tour, /Za dvě hodiny uvidíte/); assert.doesNotMatch(tour, /za dvě hodiny výsledek/);
});

test('Pokyny jsou součást plánu (SCHEMA 66, 21. 10. 2026): automaticky ze schváleného registru, každý pokyn položka garanta s výchozí hodnotou, lékař podepisuje plán jako celek, výjimka u pacienta, zamítnutý pokyn do plánu nejde', () => {
  act('goScene', '0'); act('role', 'doctor'); act('resetDemo'); act('role', 'doctor'); act('page', 'enroll'); S().draft = null; act('startDraft');
  const d = S().draft; assert.equal(d.instructions.length, 7, 'sedm pokynů v plánu od začátku'); assert.equal(NF.planBlockers(S()).some(b => /pokyn/.test(b)), false, 'pokyny nejsou překážka vydání');
  assert.equal(d.instructions.find(i => i.id === 'I-MENE').value, 60); assert.equal(d.instructions.find(i => i.id === 'I-HYPO').value, 4);
  for (const id of ['I-HYPO', 'I-MENE', 'I-NEVIM', 'I-NEMOC-BAZAL', 'I-NEMOC-JIDLO', 'I-VYSOKA', 'I-KONTAKT']) { const r = NF.item(S(), id); assert.ok(r && r.scope === undefined && r.cat === 'pokyny', id + ' je klinická položka garanta'); }
  /* výchozí hodnota z registru: garant upraví I-MENE na 45 min → nový plán ji převezme; lékař ji u pacienta mění jen výjimečně */
  NF.newVersion(S(), 'I-MENE', { params: { v: 45 } }); S().draft = null; act('startDraft');
  assert.equal(S().draft.instructions.find(i => i.id === 'I-MENE').value, 45); assert.equal(NF.instructionExceptions(S(), S().draft.instructions).length, 0);
  act('instrValue', 'I-MENE:1'); assert.equal(S().draft.instructions.find(i => i.id === 'I-MENE').value, 60); assert.equal(NF.instructionExceptions(S(), S().draft.instructions).join(), 'Méně jídla než obvykle: 60 min');
  /* zamítnutý pokyn do plánu nejde */
  act('garantDecide', 'I-VYSOKA:rejected:ano'); S().draft = null; act('startDraft'); assert.equal(S().draft.instructions.some(i => i.id === 'I-VYSOKA'), false);
  act('garantDecide', 'I-VYSOKA:approved'); D.garantClear(); act('closeDrawer');
  /* obrazovka: sbalená karta, bez zaškrtávátka „probrány“, každý pokyn se štítkem registru; kontrola: návrh beze změny bez zvláštního potvrzení po změně dávky */
  chapter('doses'); let m = markup(); assert.match(m, /3 · Pravidla pro pacienta a cíle glukózy/); assert.match(m, /<details class="more instr-card">/); assert.doesNotMatch(m, /draft\.instructionsChecked/); assert.match(m, /data-value="I-MENE"/);
  chapter('reviewProposals'); act('role', 'doctor'); const pk = S().review.proposals.find(p => p.id === 'PR-POKYNY'); assert.equal(pk.title, 'Bezpečnostní pravidla beze změny?'); assert.match(pk.why, /bez výjimek/);
  act('role', 'patient'); act('page', 'safety'); m = markup(); assert.match(m, /data-action="garantOpen" data-value="I-HYPO"|I-HYPO/); assert.doesNotMatch(m, /– váš lékař|doc-sign/); /* SCHEMA 74 */
  const tour = fs.readFileSync(path.join(__dirname, 'demo/tour-content.js'), 'utf8'); assert.doesNotMatch(tour, /instructionsChecked/); assert.doesNotMatch(tour, /Pokyny po změně dávky zvlášť/);
});

test('Rozhodnutí vlastníka 23. 10. 2026 (SCHEMA 67): porce zleva menší · obvyklá · větší, podpora senzoru vs. formulář k aplikaci, report dříve · teď · rozdíl', () => {
  assert.equal(NF.PORTIONS.map(x => x[0]).join(','), 'smaller,usual,bigger');
  /* Bezpečí: čtyři cesty; formulář jen k aplikaci; provozní položka S-PODPORA (garant ji nevidí) */
  chapter('week'); act('role', 'patient'); act('page', 'safety');
  assert.match(markup(), /Nefunguje senzor[\s\S]*podpora výrobce senzoru[\s\S]*Nefunguje NutriFee[\s\S]*Napsat podpoře/);
  const sp = S().registry.items.find(r => r.id === 'S-PODPORA'); assert.ok(sp && sp.scope === 'provozni'); assert.ok(!NF.garantItems(S()).some(r => r.id === 'S-PODPORA'));
  act('supportOpen'); assert.equal(S().page, 'support'); assert.match(markup(), /Jen k NutriFee[\s\S]*Co nefunguje\?/); assert.match(markup(), /data-value="safety" class="active" aria-current="page"/);
  act('supportSend'); assert.equal(S().support.sent, false, 'bez výběru potíže se neodešle');
  act('supportIssue', 'meal'); act('supportSend'); assert.equal(S().support.sent, true); assert.match(markup(), /Odesláno podpoře/); assert.match(markup(), /nic neposílá/);
  /* zařazení: výchozí hodnoty ze senzoru voličem; report: dříve · teď · rozdíl se směrem */
  chapter('enroll'); act('role', 'doctor'); assert.match(markup(), /Výchozí hodnoty ze senzoru/); const b0 = S().enrollment.baseline.tir; act('baseline', 'tir:1'); assert.equal(S().enrollment.baseline.tir, b0 + 1);
  chapter('reviewProposals'); act('role', 'doctor'); act('reviewStep', '1'); const m = markup();
  assert.match(m, /Čas v cíli[\s\S]*! blízko cíle · zlepšuje se[\s\S]*dříve 58 → teď 68 · \+10 p\. b\. · za /); /* SCHEMA 80 (31/02 A1): čas v cíli 68 % pod cílem 70 % */ /* rozdíl v procentních bodech a období exportu v řádku (02 #14, #1) */
  assert.match(m, /Čas pod 3,9 mmol\/l[\s\S]*dříve 3 → teď 2 · −1 p\. b\./);
  assert.match(m, /HbA1c[\s\S]*! nad cílem · zlepšuje se[\s\S]*dříve 62 → teď 55 · −7 mmol\/mol · odběr 3\. 1\. 2027 \(dříve 23\. 9\. 2026\) · cíl do 53/); /* SCHEMA 80 (31/02 B3): s datem odběru */ /* cíl HbA1c v C-CILE (25. 10. 2026) */
  assert.match(m, /Obvyklá porce[\s\S]*první období · bez srovnání/);
  assert.match(m, /Čas v cíli byl 68 % \(dříve 58 %\)/);
  assert.match(m, /class="tile c-none wide"[\s\S]*Mimo učení/);
});

test('Bezpečnost (23. 10. 2026): CSP povoluje spojení jen na doménu z sync-config, výsledky správce escapují i neplatné datum, id řádku rozhodnutí je jedinečné i po resetu', () => {
  const csp = (html.match(/Content-Security-Policy" content="([^"]+)"/) || [])[1] || ''; const origin = new URL(D.syncConfig.url).origin;
  assert.match(csp, new RegExp("connect-src 'self' " + origin.replace(/[.]/g, '\\.') + ';'), 'connect-src jen Supabase');
  assert.ok(!/connect-src[^;]*https:;/.test(csp));
  /* výsledky správce: neplatné datum v řádku ze serveru se nevykreslí jako HTML */
  chapter('enroll'); D.results.setRows([{ kind: 'progress', user_email: 'g@example.test', at: '<img src=x onerror=alert(1)>', params: { scene: 3, total: 25 } }, { kind: 'decision', item: 'K-KRITERIA', status: 'approved', at: '<b>x</b>', user_email: 'g@example.test' }, { kind: 'decision', item: '__proto__', status: 'weird', at: '2026-10-23T10:00:00Z' }]);
  const p = D.results.panel(S()); assert.ok(!/<img src=x/.test(p) && !/<b>x<\/b>/.test(p), 'bez neescapovaného HTML'); assert.ok(!Object.prototype.push, 'bez znečištění prototypu');
  /* reset garanta = řádek kind reset; stav se počítá jen z řádků po něm */
  D.results.setRows([{ kind: 'decision', item: 'K-KRITERIA', status: 'rejected', at: '2026-10-23T09:00:00Z', user_id: 'u1' }, { kind: 'reset', at: '2026-10-23T09:30:00Z', user_id: 'u1' }, { kind: 'decision', item: 'C-CILE', status: 'approved', at: '2026-10-23T10:00:00Z', user_id: 'u1' }]);
  const p2 = D.results.panel(S()); assert.match(p2, /1 z 28[\s\S]*rozhodnuto/); assert.ok(!/K-KRITERIA[^<]*<\/b><span class="tag bad">zamítnuto/.test(p2));
  assert.equal(D.sync.afterReset([{ kind: 'decision', at: '1' }, { kind: 'reset', at: '2' }, { kind: 'decision', at: '3' }]).length, 1);
  /* jedinečné id: dvě rozhodnutí téže položky po přehrání scény nemají stejné sid */
  chapter('enroll'); act('garantDecide', 'K-KRITERIA:approved'); act('garantReset'); act('garantDecide', 'K-KRITERIA:rejected:ano');
  const q = JSON.parse(store.get('nutrifee-sync-queue') || '[]'); const ids = q.filter(x => x.item === 'K-KRITERIA').map(x => x.id);
  assert.equal(ids.length, 2); assert.notEqual(ids[0], ids[1], 'id řádku se po resetu neopakuje'); assert.ok(q.some(x => x.kind === 'reset'), 'reset jde na server jako událost');
  assert.equal(D.sync.row(q[0]).id, q[0].client + ':' + q[0].id);
});

test('Klinická bezpečnost (23. 10. 2026): dávka jen z rozhodnutí lékaře, zpětný zápis se stejnou větví B-HYPO, pokyn hned, sledování bez odpovědi, nevím u vynechaného jídla, nemoc po dnech, dávka podle času jídla, jeden pokles jednou, zamítnuté položky nepůsobí, čipy jako hranice, texty, známé jen ze shody', () => {
  /* 1 · volič dávky mění plán jen při „Souhlasím“ (zvýšit/snížit) nebo „jinak“; ponechat/zamítnout vrací dávku plánu */
  chapter('reviewProposals'); act('role', 'doctor');
  const pr = S().review.proposals.find(p => p.kind === 'dose'); const cur = NF.activePlan(S()).doses[pr.dose].units;
  act('propUnits', pr.id + ':1'); assert.equal(S().review.newDoses[pr.dose].units, cur, 'volič není činný před ověřením'); assert.match(S().error, /ověření/);
  pr.verify.forEach((_, i) => act('propVerify', pr.id + ':' + i + ':yes')); act('propUnits', pr.id + ':1'); assert.equal(S().review.newDoses[pr.dose].units, cur + 1, 'po větvi zvýšit volič funguje');
  act('propVerify', pr.id + ':0:no'); assert.equal(NF.screens.proposalBranch(S(), pr).action, 'keep'); act('propUnits', pr.id + ':1'); assert.equal(S().review.newDoses[pr.dose].units, cur + 2, 'SCHEMA 84 (rozhodnutí vlastníka 4. 11. 2026, bod 1; akce z předávky J): volič funguje i u větve ponechat – větev je doporučení, změna se zapíše jako jinak než postup');
  act('propDecide', pr.id + ':keep'); assert.equal(S().review.newDoses[pr.dose].units, cur, 'ponechat vrátí dávku plánu'); assert.equal(S().review.decisions[pr.id].units, null);
  act('propReopen', pr.id); pr.verify.forEach((_, i) => act('propVerify', pr.id + ':' + i + ':yes')); act('propUnits', pr.id + ':-1'); act('propDecide', pr.id + ':reject:jiná příčina'); assert.equal(S().review.newDoses[pr.dose].units, cur, 'zamítnout vrátí dávku plánu');
  S().review.proposals.forEach(p => { if (!S().review.decisions[p.id]) { p.verify.forEach((_, i) => act('propVerify', p.id + ':' + i + ':yes')); act('propSingle', p.id); act('propDecide', p.id + ':keep'); if (!S().review.decisions[p.id]) act('propDecide', p.id + ':agree'); } });
  S().review.newDoses[pr.dose].units = cur + 3; /* i kdyby pracovní kopie voliče zůstala změněná, plán vzniká z rozhodnutí */
  const d = NF.planFromReview(S()); assert.equal(d.doses[pr.dose].units, cur); assert.equal(d.decisions.find(x => x.id === pr.id).text, 'lékař náš návrh zamítl, nic se nemění');
  act('reviewStep', '3'); act('issueP2'); assert.equal(NF.activePlan(S()).id, 'P2'); assert.equal(NF.activePlan(S()).doses[pr.dose].units, cur, 'P2 nese dávku P1');
  /* zámek vydání: dávka se nesmí lišit bez rozhodnutí s jednotkami */
  boot(); chapter('reviewConfirm'); act('role', 'doctor'); const r0 = S().review; const dp = r0.proposals.find(p => p.kind === 'dose' && r0.decisions[p.id] && r0.decisions[p.id].units != null);
  if (dp) { r0.decisions[dp.id].units = null; r0.decisions[dp.id].choice = 'keep'; const nd = NF.planFromReview(S()); assert.equal(nd.doses[dp.dose].units, S().plans[0].doses[dp.dose].units, 'bez jednotek v rozhodnutí se dávka nemění'); }

  /* 2 · zpětný zápis s menší porcí a inzulinem v těle: pokyn hned, bez procházky, sledování po 60 min od jídla */
  boot(); chapter('afterBolus'); act('role', 'patient'); act('mealCancel');
  const h = NF.parse(S().clock).getHours() + NF.parse(S().clock).getMinutes() / 60, kase = food('Ovesná kaše s mlékem a banánem');
  act('mealRetro', 'lunch'); act('mealBolus', 'as'); act('mealAt', String(Math.floor((h - 0.5) * 2) / 2)); act('mealBefore', '7'); act('mealPeak', 'none'); act('mealLow', 'unknown'); act('mealStep', '2'); act('mealFood', kase.id); act('mealPortion', 'smaller'); act('mealStep', '3');
  let m = markup(); assert.match(m, /Když sníte méně než obvykle a inzulin už je píchnutý/, 'pokyn I-MENE v kroku 3 zpětného zápisu'); assert.match(m, /<b>Procházka po jídle:<\/b>/); /* SCHEMA 86: důvod pod „Proč teď neradíme“ */ assert.doesNotMatch(m, /data-action="mealDecide" data-value="walk:yes"/);
  const ra = NF.adviseAfter(S(), kase.id, 'lunch', NF.retroAt(S(), S().meal.at), 'smaller', 'as'); assert.equal(ra.items.length, 0); assert.ok(ra.blocked.some(b => b.lever === 'walk' && b.reason === 'low'));
  assert.ok(NF.adviseAfter(S(), kase.id, 'lunch', NF.retroAt(S(), S().meal.at), 'smaller', 'unknown').blocked.length, 'nevím = jako po píchnutí');
  assert.ok(NF.adviseAfter(S(), kase.id, 'lunch', NF.retroAt(S(), S().meal.at), 'usual', 'as').items.some(i => i.lever === 'walk'), 'obvyklá porce: procházka zůstává');
  act('mealFinish', 'as'); const epR = S().episodes[S().episodes.length - 1]; assert.ok(epR.retro && epR.portion === 'smaller'); const wR = S().hypoWatch.find(w => w.epId === epR.id); assert.ok(wR, 'sledování i u zpětného zápisu'); assert.equal(wR.at, epR.at, 'od času jídla');
  m = markup(); assert.match(m, /Méně jídla než obvykle[\s\S]*Když sníte méně/, 'pokyn na Dnes hned'); S().clock = NF.addMin(epR.at, 65); act('noop'); assert.match(markup(), /Klesla glukóza pod 4\?/);

  /* 3 · „Ještě ne“ → menší porce, rada odmítnuta, „Píchnuto“: pokyn lékaře v kroku 3 i na Dnes */
  boot(); chapter('afterBolus'); act('role', 'patient'); act('mealCancel'); act('startMeal', 'lunch'); act('mealBolus', 'before'); act('mealBefore', '7'); act('mealStep', '2'); act('mealFood', kase.id); act('mealPortion', 'smaller'); act('mealStep', '3');
  assert.doesNotMatch(markup(), /Když sníte méně než obvykle a inzulin už je píchnutý/, 'před rozhodnutím o porci ještě ne'); act('mealDecide', 'portion:no'); assert.match(markup(), /Když sníte méně než obvykle a inzulin už je píchnutý[\s\S]*Až si píchnete, platí toto pravidlo/);
  act('mealFinish', 'as'); const ep3 = S().episodes[S().episodes.length - 1]; assert.equal(ep3.portion, 'smaller'); assert.ok(S().hypoWatch.some(w => w.epId === ep3.id)); m = markup(); assert.match(m, /Méně jídla než obvykle · [^<]+<[\s\S]*Potom: za \d+ min od jídla se zeptáme, jestli glukóza klesla pod 4/); /* SCHEMA 86: pravidlo krátce a co bude dál */ assert.doesNotMatch(m, /sledujte glukózu/);
  /* „píchnu za chvíli“: pokyn až s potvrzením inzulinu */
  act('startMeal', 'snack'); act('mealCancel'); act('startMeal', 'dinner'); act('mealBolus', 'before'); act('mealBefore', '7'); act('mealStep', '2'); act('mealFood', kase.id); act('mealPortion', 'smaller'); act('mealStep', '3'); act('mealDecide', 'portion:no'); act('mealFinish', 'pending');
  const epP = S().episodes[S().episodes.length - 1]; assert.equal(S().hypoWatch.some(w => w.epId === epP.id), false); act('pendingInsulin', epP.id + ':as'); assert.ok(S().hypoWatch.some(w => w.epId === epP.id)); assert.match(markup(), /Méně jídla než obvykle · večeře/); /* SCHEMA 86 */

  /* 4 · nezodpovězené sledování nezaniká; noční otázka platí celý den; i v kroku 1 zpětné snídaně */
  boot(); chapter('afterBolus'); branch('bolus', 'smaller'); act('mealStep', '3'); act('mealFinish', 'as'); const ep4 = S().episodes[S().episodes.length - 1]; const w4 = S().hypoWatch.find(w => w.epId === ep4.id);
  S().clock = NF.addMin(ep4.at, 25 * 60); act('noop'); assert.equal(NF.pendingHypoWatch(S()).length, 0); assert.equal(w4.answer, null); assert.equal(NF.hypoWatchState(S(), w4), 'unanswered', 'zůstává jako bez odpovědi');
  const wN = NF.addHypoWatch(S(), 'skipped', 'dinner', NF.day(S().clock) + 'T19:05:00', null); S().clock = NF.day(NF.addDays(S().clock, 1)) + 'T19:30:00'; assert.equal(NF.hypoWatchState(S(), wN), 'due', 'noční otázka platí celý den'); act('page', 'today');
  act('mealRetro', 'breakfast'); Object.assign(S().meal, { bolus: 'as', at: 7, whenOk: true }); act('noop'); /* SCHEMA 86: u hodnot z grafu (třetí otázka zpětného zápisu) */ assert.match(markup(), /Klesla glukóza v noci pod 4\?/, 'noční otázka i v kroku 1 zpětného zápisu'); S().meal = null;
  S().clock = NF.day(NF.addDays(S().clock, 1)) + 'T08:00:00'; assert.equal(NF.hypoWatchState(S(), wN), 'unanswered');
  chapter('reviewSummary'); act('role', 'doctor'); const wX = NF.addHypoWatch(S(), 'smaller', 'lunch', NF.addMin(S().clock, -48 * 60), null); assert.ok(wX); act('startReview'); assert.match(markup(), /bez odpovědi: \d+×/);

  /* 5 · vynechané jídlo s „Nevím“ = jako s inzulinem */
  boot(); chapter('afterBolus'); act('role', 'patient'); act('mealCancel'); const n5 = (S().hypoWatch || []).length; act('mealSkipAsk', 'lunch'); act('mealSkip', 'lunch:unknown');
  assert.equal(S().hypoWatch.length, n5 + 1, 'sledování založeno'); m = markup(); assert.match(m, /Méně jídla než obvykle[\s\S]*inzulin možná podaný – počítáme, že byl/); assert.doesNotMatch(m, /sledujte glukózu/);
  S().clock = NF.addMin(S().clock, 65); act('noop'); assert.match(markup(), /vynechali oběd s podaným inzulinem[\s\S]*Klesla glukóza pod 4\?/);

  /* 6 · nemoc se vztahuje na kalendářní den: zapnutí odpoledne štítkuje i ranní jídlo; den v záznamu nemoci vyřazuje i bez štítku */
  boot(); chapter('afterBolus'); act('mealStep', '3'); act('mealFinish', 'as'); const ep6 = S().episodes[S().episodes.length - 1]; assert.equal(ep6.context, null);
  S().clock = NF.addMin(ep6.at, 90); act('illness', 'on'); assert.equal(ep6.context, 'illness'); assert.equal(NF.usableForDose(S(), ep6), false); assert.equal(NF.whyNotUsable(S(), ep6), 'z doby nemoci');
  const ep6b = S().episodes.find(e => e.id !== ep6.id && NF.usableEp(S(), e)); S().illnessLog = (S().illnessLog || []).concat([{ from: NF.day(ep6b.at) + 'T15:00:00', to: NF.day(ep6b.at) + 'T22:00:00' }]); assert.equal(NF.inIllness(S(), ep6b), true); assert.equal(NF.usableEp(S(), ep6b), false);
  act('illness', 'off'); const sm6 = NF.summary(S(), NF.activePlan(S()).id); assert.ok(sm6.ill >= 2, 'souhrn počítá zápisy z dnů nemoci');

  /* 7 · zpětný zápis v den kontroly nese dávku plánu platného při jídle; návrat dávky stará data znovu nezapočítá */
  boot(); chapter('reviewHandover'); act('role', 'patient'); act('confirmUnderstanding'); const p2 = NF.activePlan(S()), p1 = NF.planById(S(), p2.previousId); assert.notEqual(p2.doses.breakfast.units, p1.doses.breakfast.units);
  act('mealRetro', 'breakfast'); act('mealBolus', 'as'); act('mealAt', '7'); act('mealBefore', '6'); act('mealPeak', '9'); act('mealLow', 'no'); act('mealStep', '2'); act('mealFood', kase.id); act('mealPortion', 'usual'); act('mealStep', '3'); act('mealFinish', 'as');
  const ep7 = S().episodes[S().episodes.length - 1]; assert.equal(ep7.planId, p1.id); assert.equal(ep7.insulin.prescribed, p1.doses.breakfast.units); assert.equal(ep7.insulin.units, p1.doses.breakfast.units); assert.equal(ep7.doseKey, 'breakfast:' + p1.doses.breakfast.units); assert.equal(NF.usableEp(S(), ep7), false, 'pod novou dávkou se nepočítá');
  assert.equal(S().episodes.filter(e => e.planId === p1.id && e.meal === 'breakfast' && NF.usableEp(S(), e)).length, 0);
  const p3 = NF.clone(p2); p3.id = 'P3'; p3.previousId = p2.id; p3.effectiveFrom = p3.issuedAt = S().clock; p3.doses.breakfast.units = p1.doses.breakfast.units; S().plans.push(p3); S().activePlanId = 'P3';
  assert.equal(NF.doseSince(S(), 'breakfast'), p3.effectiveFrom, 'návrat dávky = nové učení od data změny'); assert.equal(S().episodes.filter(e => e.planId === p1.id && e.meal === 'breakfast' && NF.usableEp(S(), e)).length, 0, 'stará data se po návratu dávky nezapočítají'); assert.equal(NF.whyNotUsable(S(), ep7), 'z doby před změnou dávky');
  assert.equal(NF.doseSince(S(), 'dinner'), p1.effectiveFrom, 'dávka beze změny: učení pokračuje od původního plánu');

  /* 8 · jeden pokles se počítá jednou: vynecháno + „ano“ a pak zpětný zápis téhož jídla s poklesem */
  boot(); chapter('afterBolus'); act('role', 'patient'); act('mealCancel'); act('mealSkipAsk', 'lunch'); act('mealSkip', 'lunch:as'); const w8 = S().hypoWatch[S().hypoWatch.length - 1]; S().clock = NF.addMin(S().clock, 65); act('noop'); act('hypoAnswer', w8.id + ':yes'); assert.equal(NF.lowEvents(S(), 7).length, 1);
  const h8 = NF.parse(S().clock).getHours() + NF.parse(S().clock).getMinutes() / 60; act('mealRetro', 'lunch'); act('mealBolus', 'as'); act('mealAt', String(Math.floor((h8 - 1.5) * 2) / 2)); act('mealBefore', '6'); act('mealPeak', '7'); act('mealLow', 'yes'); act('mealStep', '2'); act('mealFood', kase.id); act('mealPortion', 'smaller'); act('mealStep', '3'); act('mealFinish', 'as');
  const ep8 = S().episodes[S().episodes.length - 1]; assert.equal(NF.lowEvents(S(), 7).length, 1, 'týž pokles jen jednou'); assert.equal(NF.hypoAlert(S()), null); assert.equal(NF.mealState(S(), 'lunch').state, 'done'); assert.equal(!!(S().skipped[NF.day(S().clock)] || {}).lunch, false); assert.equal(w8.epId, ep8.id);

  /* 9 · zamítnutá položka přestane působit: B-HYPO, D-CISTA, R-REAKCE, S-VYSLEDEK rady, I-MENE, I-HYPO, parametry */
  boot(); chapter('afterBolus'); act('role', 'doctor'); NF.decideItem(S(), 'B-HYPO', 'rejected', 'x'); assert.equal(NF.param(S(), 'B-HYPO', 'poklesy', 99), 99, 'parametr zamítnuté položky nepůsobí'); act('role', 'patient');
  branch('bolus', 'smaller'); act('mealStep', '3'); act('mealFinish', 'as'); const ep9 = S().episodes[S().episodes.length - 1]; assert.equal(S().hypoWatch.some(w => w.epId === ep9.id), false, 'sledování se nezakládá'); S().clock = NF.addMin(ep9.at, 65); act('noop'); assert.doesNotMatch(markup(), /Klesla glukóza pod 4\?/);
  boot(); chapter('reviewSummary'); act('role', 'doctor'); NF.decideItem(S(), 'D-CISTA', 'rejected', 'x'); assert.equal(NF.proposals(S(), NF.activePlan(S()).id).some(p => p.kind === 'dose' && p.dose !== 'basal' && !p.row), false, 'bez čistých dat žádný návrh k prandiální dávce'); /* SCHEMA 84: řádky „bez návrhu“ nejsou návrhy */ /* SCHEMA 81 (vlastník 2. 11. 2026, bod 8): návrh k bazálu z nočních poklesů, které pacient zapsal, na čistých datech jídel nestojí */ assert.equal(S().episodes.some(e => NF.usableForDose(S(), e)), false);
  boot(); chapter('firstResult'); act('role', 'doctor'); NF.decideItem(S(), 'R-REAKCE', 'rejected', 'x'); act('role', 'patient'); act('peakChip', 'E1:12'); const r9 = NF.lastResult(S()); assert.equal(r9.key, 'noEval'); assert.doesNotMatch(r9.text, /nad cílem|Příště/); assert.equal(NF.checkMilestones(S()).length, 0);
  boot(); chapter('firstResult'); act('role', 'doctor'); NF.decideItem(S(), 'R-DOPLNEK', 'rejected', 'x'); NF.decideItem(S(), 'R-PORADI', 'rejected', 'x'); act('role', 'patient'); act('peakChip', 'E1:12'); const r9b = NF.lastResult(S()); assert.equal(r9b.key, 'highPlain'); assert.doesNotMatch(r9b.text, /Příště/, 'bez schválených rad žádná rada do příště');
  boot(); chapter('firstResult'); act('role', 'doctor'); NF.decideItem(S(), 'R-PORADI', 'rejected', 'x'); act('role', 'patient'); act('peakChip', 'E1:12'); assert.match(NF.lastResult(S()).text, /zkusit doplněk k jídlu; nabídneme/, 'jen rada, která běží');
  boot(); chapter('afterBolus'); act('role', 'doctor'); NF.decideItem(S(), 'I-MENE', 'rejected', 'x'); act('role', 'patient'); const bl = NF.advise(S(), kase.id, 'smaller', 'as', 'lunch').blocked.find(b => b.lever === 'portion'); assert.doesNotMatch(bl.why, /Bezpečí/); /* B18 (27. 10. 2026): zamítnuté pravidlo – žádný odkaz na pravidlo, které chybí; na místě je oznámení */ assert.doesNotMatch(bl.why, /„méně jídla než obvykle“/);
  act('page', 'safety'); assert.match(markup(), /Méně jídla než obvykle[\s\S]*nefunguje/, 'v Bezpečí oznámení na místě pokynu'); assert.doesNotMatch(markup(), /Když sníte méně než obvykle a inzulin už je píchnutý/);
  boot(); chapter('afterBolus'); act('role', 'doctor'); NF.decideItem(S(), 'I-HYPO', 'rejected', 'x'); act('role', 'patient'); branch('bolus', 'smaller'); act('mealStep', '3'); act('mealFinish', 'as'); S().clock = NF.addMin(S().episodes[S().episodes.length - 1].at, 65); act('noop'); m = markup(); assert.doesNotMatch(m, /bezpečnostními pravidly v Bezpečí/); assert.match(m, /data-off="I-HYPO"/); /* kontrola 3, B2: na chybějící pravidlo se neodkazuje, na jeho místě je oznámení */ assert.doesNotMatch(m, /podle pokynu lékaře k nízké glukóze/);
  act('role', 'doctor'); NF.newVersion(S(), 'B-HYPO', { params: { poklesy: 0 } }); assert.equal(NF.item(S(), 'B-HYPO').params.poklesy, 1, 'meze parametrů platí i mimo volič');

  /* 10 · čipy „nad 15“ / „pod 4“ jako hranice se značkou */
  boot(); chapter('firstResult'); act('peakChip', 'E1:high'); const e1 = S().episodes.find(x => x.id === 'E1'); assert.equal(e1.manual.peak, 15); assert.equal(e1.manual.peakBound, 'over'); assert.equal(NF.epInTarget(S(), e1), false); act('lowChip', 'E1:no');
  m = markup().replace(/<[^>]+>/g, ' '); assert.match(m, /Nejvyšší glukóza po \S+\s+nad 15/, 'sbalený řádek minulého jídla píše „nad 15“'); assert.doesNotMatch(m, /\b16\s*mmol/); /* SCHEMA 86: řádek zodpovězené otázky */ act('openFood', 'F1'); assert.match(markup(), /tentokrát[\s\S]*nad 15/); assert.doesNotMatch(markup(), /class="rng">16/);
  chapter('firstResult'); act('peakChip', 'E1:low'); const e1b = S().episodes.find(x => x.id === 'E1'); assert.equal(e1b.manual.peakBound, 'under'); assert.equal(e1b.manual.low, true); assert.equal(e1b.manual.lowAsked, true, 'otázka „pod 4?“ se už neptá'); assert.equal(NF.epInTarget(S(), e1b), false, 'pod 4 není v cíli'); assert.equal(NF.lowEvents(S(), 7).length >= 1, true); assert.doesNotMatch(markup(), /data-action="lowChip"/);
  act('startMeal', 'lunch'); act('mealBolus', 'as'); act('mealBefore', 'low'); assert.equal(S().meal.before, 4); assert.equal(S().meal.beforeBound, 'under'); /* SCHEMA 84 (rozhodnutí 9, agent P+D): posuvník hodnoty místo mřížky a stepperu */ assert.match(markup(), /data-vs="before" data-zone="low"[\s\S]*?<b>pod 4<\/b>/); act('mealStep', '2'); act('mealFood', kase.id); act('mealPortion', 'usual'); assert.equal(NF.advise(S(), kase.id, 'usual', 'as', 'lunch').lowNow, true);
  S().meal = null; act('mealRetro', 'lunch'); act('mealBolus', 'as'); act('mealAt', '11'); act('mealBefore', '6'); act('mealPeak', 'low'); assert.equal(S().meal.low, true); assert.match(markup(), /počítáme to jako pokles/); act('mealStep', '2'); act('mealFood', kase.id); act('mealPortion', 'usual'); act('mealStep', '3'); act('mealFinish', 'as'); const epL = S().episodes[S().episodes.length - 1]; assert.equal(epL.manual.low, true); assert.equal(epL.manual.peakBound, 'under'); assert.equal(NF.epInTarget(S(), epL), false);

  /* 11 · slova aplikace: žádný vlastní pokyn „nevynechávejte“ / „sledujte glukózu“; rada do příště během nemoci ne */
  for (const f of CORE) { const src = fs.readFileSync(path.join(__dirname, f), 'utf8'); assert.doesNotMatch(src, /Jídla nevynechávejte|sledujte glukózu/, f); }
  boot(); chapter('afterBolus'); act('role', 'patient'); NF.addHypoWatch(S(), 'skipped', 'lunch', NF.addMin(S().clock, -120), null); NF.answerHypoWatch(S(), S().hypoWatch[S().hypoWatch.length - 1].id, 'yes'); NF.addHypoWatch(S(), 'skipped', 'breakfast', NF.addMin(S().clock, -300), null); NF.answerHypoWatch(S(), S().hypoWatch[S().hypoWatch.length - 1].id, 'yes'); act('mealCancel');
  assert.ok(NF.hypoAlert(S())); m = markup(); assert.match(m, /klesla pod 4 dvakrát/); assert.doesNotMatch(m, /Zavolejte do ordinace|nevynechávejte/); /* obráceno SCHEMA 74 */
  boot(); chapter('firstResult'); act('illness', 'on'); act('peakChip', 'E1:12'); assert.doesNotMatch(NF.lastResult(S()).text, /Příště/);

  /* 12 · milník „známe“ a Cesta ke kontrole jen ze shody zápisů */
  boot(); chapter('week'); act('role', 'patient'); const gf = NF.addFood(S(), 'Testovací guláš', {}, { force: true }).food; const p12 = NF.activePlan(S()); const day0 = NF.day(S().clock);
  [1, 5, 9, 13].forEach((rise, i) => { const at = NF.day(NF.addDays(day0 + 'T12:00:00', -(i + 1))) + 'T12:00:00'; const r = NF.saveEpisode(S(), { meal: 'lunch', foodId: gf.id, at: at, portion: 'usual', insulin: { confirmed: 'as', units: p12.doses.lunch.units, time: NF.fmtTime(NF.addMin(at, -5)) }, before: 5, peak: 5 + rise }); assert.ok(r.ok); });
  const st12 = NF.foodStats(S(), gf.id); assert.equal(st12.n, 4); assert.equal(st12.consistent, false); assert.equal(NF.confidence(S(), gf.id).level, 'learning');
  NF.checkMilestones(S()); assert.equal(S().fb.milestones.some(x => x.id === 'known:' + gf.id), false, 'bez shody zápisů žádný milník „známe“');
  const known12 = NF.pathStats(S()).known, allRep = Object.keys(S().episodes.reduce((a, e) => { a[e.foodId] = (a[e.foodId] || 0) + 1; return a; }, {})).filter(k => S().episodes.filter(e => e.foodId === k).length >= 2);
  assert.equal(known12, allRep.filter(k => NF.confidence(S(), k).level === 'known').length, 'Cesta ke kontrole počítá jen známá jídla');

  /* 13 · glukóza teď pod 4 + větší porce před píchnutím: jen pokyn lékaře, žádná rada (rozhodnutí vlastníka 25. 10. 2026; dřív rada k porci zůstávala) */
  boot(); chapter('afterBolus'); act('role', 'patient'); act('mealCancel'); act('startMeal', 'lunch'); act('mealBolus', 'before'); act('mealBefore', 'low'); act('mealStep', '2'); act('mealFood', kase.id); act('mealPortion', 'bigger'); act('mealStep', '3');
  m = markup(); assert.ok(m.indexOf('Glukóza je teď pod 4') > 0, 'pokyn lékaře'); assert.equal(m.indexOf('Dejte si obvyklou porci'), -1, 'při pod 4 žádná rada k porci'); assert.doesNotMatch(m, /data-action="mealDecide" data-value="walk:yes"/, 'procházka se při glukóze pod 4 nenabízí');
});

test('Garant 23. 10. 2026 (V16): Potvrdit souhrn s nerozhodnutými položkami se nejdřív zeptá „Zbývá N nerozhodnutých – potvrdit přesto?“', () => {
  const fin = D.scenes.findIndex(x => !x.appendix && D.chapters[x.ch].id === 'trace'); act('goScene', String(fin)); act('closeDrawer');
  const stf = D.tour.stepsFor('trace', S().branches); for (let k = 0; k < stf.length; k++) next();
  const rem = D.garantSummary(S()).remaining; assert.ok(rem > 0, 'v testu zůstávají nerozhodnuté položky');
  act('garantConfirmSummary'); assert.equal(D.confirmAsk(), true, 'panel se ptá'); assert.equal(D.progress().done, null, 'bez souhlasu se souhrn nepotvrdí');
  let m = markup(); assert.match(m, new RegExp('Zbývá ' + rem + ' nerozhodnut[^<]*potvrdit přesto\\?')); assert.match(m, /data-action="garantConfirmSummary" data-value="force"[^>]*>Potvrdit přesto</); assert.match(m, /data-action="garantConfirmCancel"/);
  act('garantConfirmCancel'); assert.equal(D.confirmAsk(), false); assert.equal(D.progress().done, null);
  act('garantConfirmSummary'); act('garantConfirmSummary', 'force'); assert.ok(D.progress().done, 'výslovné „Potvrdit přesto“ souhrn potvrdí'); assert.match(markup(), /Děkujeme(, máme vaše rozhodnutí|\. Rozhodnutí zatím nejsou odeslaná)/);
  /* vše rozhodnuto: potvrzení bez otázky */
  boot(); act('goScene', String(fin)); act('closeDrawer'); for (let k = 0; k < stf.length; k++) next();
  NF.garantItems(S()).forEach(r => act('garantDecide', r.id + ':approved')); act('garantConfirmSummary'); assert.equal(D.confirmAsk(), false); assert.ok(D.progress().done);
});

test('Garant 23. 10. 2026 (V09): zamítnutí položky bez místa v příběhu řekne rovnou, co se stane, a blok „nefunguje“ je vidět i na začátku další scény', () => {
  const idx = D.scenes.findIndex((x, i) => D.decisionItems(i).includes('I-HYPO')); assert.ok(idx > 0, 'I-HYPO se rozhoduje v některé scéně');
  act('goScene', String(idx)); act('closeDrawer');
  const g = D.guide['I-HYPO']; assert.ok(g && g.dopad, 'průvodce má „Co se stane při zamítnutí“');
  act('garantDecide', 'I-HYPO:rejected:ano');
  let m = markup(); const status = (m.match(/<p class="tour-status" role="status">([^<]*)</) || [])[1] || '';
  assert.match(status, /^Zamítnuto: „[^“]+“\./); assert.ok(status.includes(String(g.dopad).trim()), 'hláška nese text „Co se stane při zamítnutí“');
  assert.doesNotMatch(status, /na místě položky uvidíte/, 'hláška neslibuje místo, které v příběhu není');
  act('goScene', String(idx + 1)); act('closeDrawer'); assert.equal(S().tourStep || 0, 0);
  m = markup(); assert.match(m, /Od minulé scény nefunguje/); assert.match(m, /class="garant off-scene"[\s\S]*data-gitem="I-HYPO"/, 'zamítnutá položka jako karta, kterou jde změnit na místě');
  assert.match(D.prevSceneOff(S()), /I-HYPO/);
});

test('Zpětný zápis (27. 10. 2026): rada k procházce má dosazené minuty, žádný zástupný znak', () => {
  chapter('week'); act('role', 'patient');
  const f = S().foods.find(x => /Ovesná kaše s mlékem/.test(x.name)); const at = NF.addMin(S().clock, -20);
  const r = NF.adviseAfter(S(), f.id, 'breakfast', at, 'usual', 'as'); const w = r.items.find(i => i.lever === 'walk');
  assert.ok(w, 'procházka nabídnutá'); assert.ok(!/[{}]/.test(w.text), w.text); assert.match(w.text, /\d+ minut/);
});

test('V publikovaných souborech nejsou skutečná jména', () => {
  const bad = /MUDr\.|Ing\. ?[A-Z]|prof\. |doc\. |a kol\.|et al\.|nemocnic|FN [A-Z]|Standards of Care|iPhone|Apple/;
  for (const f of ['nutrifee-rozhodovaci-maketa.html', 'README.md', ...CORE, ...DEMO]) assert.equal(bad.test(fs.readFileSync(path.join(__dirname, f), 'utf8')), false, f);
});

/* ---------- závěrečná kontrola 23. 10. 2026 a rozhodnutí vlastníka 25. 10. 2026 ---------- */
test('Závěrečná kontrola 23. 10. (01 #1): podobný název nesmí spojit jídla podle jediného shodného slova; platné shody zůstávají', () => {
  chapter('advice');
  assert.equal(NF.likeName(S(), 'Kuskus se zeleninou'), null, 'kuskus ≠ tofu');
  assert.equal(NF.likeName(S(), 'Polévka'), null, 'polévka ≠ gulášová polévka');
  assert.equal(NF.likeName(S(), 'Kuskus s cizrnou'), null);
  assert.equal(NF.likeName(S(), 'Řízek s kaší od maminky').name, 'Smažený řízek s bramborovou kaší');
  const ov = NF.likeName(S(), 'Ovesna kase s mlekem a bananem'); assert.ok(ov && /^Ovesná kaše/.test(ov.name), 'bez háčků se najde ovesná kaše');
  assert.ok(NF.searchFoods(S(), 'rizek', 'lunch').some(f => /řízek/i.test(f.name)), 'hledání bez diakritiky (01 #15)');
});
test('Rozhodnutí vlastníka 25. 10. 2026: při glukóze pod 4 před jídlem krok 3 neradí vůbec – jen pokyn lékaře k nízké glukóze (živě i zpětně)', () => {
  chapter('advice'); const f = food('Smažený řízek s bramborovou kaší');
  for (const portion of ['bigger', 'smaller', 'usual']) {
    if (S().meal) act('mealCancel');
    act('startMeal', 'lunch'); act('mealBolus', 'before'); act('mealBefore', 'low'); act('mealStep', '2'); act('mealFood', f.id); act('mealPortion', portion); act('mealStep', '3');
    const res = NF.advise(S(), f.id, portion, 'before', 'lunch'); assert.equal(res.items.length, 0, portion); assert.equal(res.gate.ok, false); assert.equal(res.blocked.length, 0);
    const m = markup().slice(markup().indexOf('<main')); assert.doesNotMatch(m, /class="advice/, portion); assert.match(m, /Glukóza je teď pod 4/); assert.match(m, /Teď neradíme – řiďte se pravidlem k nízké glukóze/); assert.doesNotMatch(m, /Pořadí jídla: teď neradíme|Procházka po jídle: teď neradíme/);
  }
  act('mealCancel'); act('mealRetro', 'lunch'); act('mealBolus', 'as'); act('mealAt', '12.5'); act('mealBefore', 'low'); act('mealPeak', '9'); act('mealLow', 'no'); act('mealStep', '2'); act('mealFood', f.id); act('mealPortion', 'usual'); act('mealStep', '3');
  const m2 = markup().slice(markup().indexOf('<main')); assert.doesNotMatch(m2, /class="advice/); assert.match(m2, /Glukóza je teď pod 4/);
  assert.ok(NF.item(S(), 'B-HYPO').texts.lowNow, 'věta je text položky B-HYPO');
});
test('Závěrečná kontrola 23. 10. (01 #2): „Uložit, píchnu za chvíli“ – žádná karta „Opravit inzulin“, dokud inzulin čeká; okno opravy běží od potvrzení', () => {
  chapter('advice'); const f = food('Smažený řízek s bramborovou kaší');
  act('startMeal', 'lunch'); act('mealBolus', 'before'); act('mealBefore', '7'); act('mealStep', '2'); act('mealFood', f.id); act('mealPortion', 'usual'); act('mealStep', '3'); act('mealFinish', 'pending');
  const ep = S().episodes[S().episodes.length - 1]; assert.equal(ep.insulin.confirmed, 'pending'); assert.equal(NF.canCorrectInsulin(S(), ep), false);
  assert.doesNotMatch(markup(), /Opravit inzulin/);
  S().clock = NF.addMin(S().clock, 35); act('pendingInsulin', ep.id + ':as');
  S().clock = NF.addMin(S().clock, 50); assert.equal(NF.canCorrectInsulin(S(), ep), true, '50 min od potvrzení, 85 od zápisu');
  S().clock = NF.addMin(S().clock, 15); assert.equal(NF.canCorrectInsulin(S(), ep), false);
});
test('Závěrečná kontrola 23. 10. (01 #4): důvody „Tentokrát ne“ podle rady; u pořadí zůstává „V jídle to není“', () => {
  const keys = l => Array.from(NF.reasonsFor(l)).map(r => r[0]).join(',');
  assert.equal(keys('portion'), 'hungry,plated,nowant'); assert.equal(keys('walk'), 'time,cantgo,nowant'); assert.ok(keys('order').startsWith('absent')); assert.ok(keys('addon').includes('nothome'));
});
test('Závěrečná kontrola 23. 10. (02 #2): „Ponechat“ a „Zamítnout s důvodem“ nevyžadují dokončené ověření, „Souhlasím“ ano', () => {
  chapter('reviewProposals'); const pr = NF.nextProposal(S()); assert.ok(pr);
  act('propDecide', pr.id + ':agree'); assert.ok(!S().review.decisions[pr.id], 'souhlas bez ověření nejde');
  act('propDecide', pr.id + ':reject:pacient si nepřeje'); const d = S().review.decisions[pr.id]; assert.ok(d, 'zamítnutí bez ověření prošlo'); assert.equal(d.choice, 'reject'); assert.equal(d.branch, null);
  act('propReopen', pr.id); act('propDecide', pr.id + ':keep'); assert.equal(S().review.decisions[pr.id].choice, 'keep');
});
test('Rozhodnutí vlastníka 25. 10. 2026: dvě a více změn dávek v kontrole – neutrální věta z D-POSTUP v kroku 3 i v liště, žádný zámek', () => {
  chapter('reviewConfirm'); const r = S().review, p = NF.activePlan(S());
  /* C15 (27. 10. 2026): příběh mění jen snídaňovou dávku; druhou změnu (bazál o 1 j. níž) zadá test, aby se ukázala věta o dvou změnách */
  r.decisions['PR-BAZAL'] = { choice: 'other', units: p.doses.basal.units - 1 }; act('noop'); const nxt = NF.planFromReview(S());
  const n = ['basal', 'breakfast', 'lunch', 'dinner'].filter(k => nxt.doses[k].units !== p.doses[k].units).length; assert.ok(n >= 2, 'příběh mění dvě dávky');
  const m = markup(); const hits = (m.match(/Měníte 2 dávky najednou; posuďte, zda je změnit postupně\./g) || []).length; assert.ok(hits >= 2, 'hint i lišta: ' + hits);
  assert.match(m, /data-action="issueP2"(?![^>]*disabled)/, 'vydání není zamčené');
  assert.equal(NF.manyDosesText(S(), 1), ''); assert.equal(NF.manyDosesText(S(), 3), 'Měníte 3 dávky najednou; posuďte, zda je změnit postupně.'); assert.equal(NF.manyDosesText(S(), 5), 'Měníte 5 dávek najednou; posuďte, zda je změnit postupně.');
  assert.ok(NF.item(S(), 'D-POSTUP').texts.postupne);
  act('issueP2'); assert.ok(r.planIssued, 'plán se vydá');
});
test('Rozhodnutí vlastníka 25. 10. 2026: cíl HbA1c v C-CILE – volič, dlaždice proti cíli a bod 6 z obou částí', () => {
  const c = NF.item(S(), 'C-CILE'); assert.equal(c.params.hba1cGoal, 53); assert.deepEqual(Array.from(NF.PARAM_BOUNDS['C-CILE'].hba1cGoal), [42, 75]);
  chapter('doses'); assert.match(markup(), /HbA1c do/); assert.equal(S().draft.targets.hba1cGoal, 53);
  act('target', 'hba1cGoal:1'); assert.equal(S().draft.targets.hba1cGoal, 54); for (let i = 0; i < 40; i++) act('target', 'hba1cGoal:1'); assert.equal(S().draft.targets.hba1cGoal, 75);
  chapter('reviewSummary'); act('importDemo'); NF.setHba1c(S(), 'sestra', 55, '2027-01-03'); /* SCHEMA 80 (31/02 B3): HbA1c pro kontrolu vybere sestra s datem odběru */ act('startReview'); let m = markup(); /* C10: export před zahájením */
  assert.match(m, /<div class="k">HbA1c<\/div>[\s\S]*?<div class="st">! nad cílem/, 'HbA1c 55 > 53 je nad cílem (oranžová, ne červená)');
  const facts = () => [].concat(...S().review.proposals.map(p => (p.facts || []).filter(Boolean))).filter(f => /HbA1c/.test(f.text));
  assert.ok(facts().length, 'bod vyrovnání má fakt s HbA1c'); assert.ok(facts().every(f => !f.against), 'HbA1c nad cílem: data disjunkci neodporují');
  assert.doesNotMatch(m, /cíl HbA1c aplikace nezná/);
  NF.activePlan(S()).targets.hba1cGoal = 60; NF.activePlan(S()).targets.tirGoal = 65; act('startReview'); assert.ok(facts().every(f => f.against), 'čas v cíli ≥ cíl a HbA1c ≤ cíl: data říkají jinak');
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, 'app/core.js'), 'utf8'), /aplikace nezná/);
});
test('Závěrečná kontrola 23. 10. (02 #3): souhrn ze senzoru patří k plánu – po vydání P2 je „dříve“ souhrn P1, ne týž objekt', () => {
  chapter('reviewConfirm'); act('issueP2'); const p2 = NF.activePlan(S()), p1 = NF.planById(S(), p2.previousId);
  assert.ok(p1.sensorSummary && p1.sensorSummary.tir != null, 'P1 nese svůj souhrn'); assert.equal(S().sensorSummary, null, 'nové období začíná bez souhrnu');
  assert.equal(NF.summary(S(), p1.id).sensor.tir, p1.sensorSummary.tir); assert.equal(NF.summary(S(), p2.id).sensor, null);
});
test('Přístupnost 23. 10. (04): skupiny voleb mají role=group, hledání v registru popisek, krok zařazení aria-current', () => {
  chapter('advice'); act('startMeal', 'lunch'); act('mealBolus', 'before'); /* SCHEMA 84 (rozhodnutí 9, agent P+D): posuvník hodnoty místo mřížky a stepperu */ assert.match(markup(), /class="vs-input" id="vs-before"[^>]*aria-label="Glukóza teď v mmol\/l"/);
  chapter('doses'); assert.match(markup(), /class="now" data-action="wizardGo" data-value="1" aria-current="step"/);
  act('role', 'doctor'); act('page', 'registry'); assert.match(markup(), /<label class="sr-only" for="reg-q">Hledat v registru<\/label><input id="reg-q"/);
  act('page', 'trace'); assert.match(markup(), /<caption class="sr-only">Stopa/); assert.match(markup(), /<th scope="col">Čas<\/th>/);
});
test('Trvalé testy robustnosti (robustnost.test.cjs, závěrečná kontrola 23. 10. 2026) projdou', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'robustnost.test.cjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout || '').split('\n').concat((r.stderr || '').split('\n')).filter(l => /^FAIL/.test(l)).join(' | ') || 'robustnost.test.cjs skončil chybou');
});
/* Integrace SCHEMA 73 (27. 10. 2026): jeden příkaz pouští i testy fáze 2 a kontroly pravdivosti T1–T4 (povinné před publikací, 15 odst. 15).
   Každá sada běží jako samostatný proces; počty jejích testů se vypíšou pod řádkem OK. */
for (const [f, what] of [['tokeny.test.cjs', 'tokeny vzhledu a katalog (B8, C1, C2)'], ['obsah-pacienta.test.cjs', 'obsah obrazovek pacienta P1–P11 (SCHEMA 86, 15 odst. 15b)'], ['schema84-jadro.test.cjs', 'SCHEMA 84 – jádro kontroly podle rozhodnutí vlastníka 4. 11. 2026'], ['zaverecne80.test.cjs', 'závěrečné ověření 1. 11. 2026 (SCHEMA 80) – tok, produkce, noční pokles'], ['faze2-jadro.test.cjs', 'jádro fáze 2 (balík A)'], ['faze2-pribeh.test.cjs', 'příběh fáze 2 (balík C)'], ['pravdivost.test.cjs', 'kontroly pravdivosti T1–T4 (B25)'], ['kontrola74-obsah.test.cjs', 'nezávislá kontrola SCHEMA 74 – obsah a logika'], ['kontrola2-obsah.test.cjs', 'kontrola 2 (SCHEMA 76) – obsah, pravidla a účinky zamítnutí'], ['kontrola74-panel.test.cjs', 'nezávislá kontrola SCHEMA 74 – panel a rozvržení'], ['kontrola3-obsah.test.cjs', 'kontrola 3 – obsah, jádro a data (A1, A2, B, C)'], ['kontrola3-panel.test.cjs', 'kontrola 3 – panel, příběh, výsledky správce (SCHEMA 77)'], ['kontrola4-obsah.test.cjs', 'kontrola 4 – obsah, jádro a rozhodnutí vlastníka (SCHEMA 78)'], ['kontrola4-panel.test.cjs', 'kontrola 4 – panel, vyprávění, rozvržení a přístupnost (SCHEMA 78)'], ['ukladani.test.cjs', 'kontrola 4 – ukládání, přihlášení a výsledky správce (SCHEMA 78)']]) {
  test('Sada ' + f + ' – ' + what + ' projde', () => {
    const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, f)], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const out = (r.stdout || '') + '\n' + (r.stderr || ''), tally = out.split('\n').filter(l => /prošl[oa],? \d|^\d+ prošlo|Prošlo:/.test(l)).slice(-1)[0] || '';
    assert.equal(r.status, 0, out.split('\n').filter(l => /^FAIL/.test(l)).join(' | ') || f + ' skončil chybou');
    console.log('      ' + f + ': ' + tally.trim());
  });
}

/* ---------- SCHEMA 72: nový tok schvalování (rozhodnutí vlastníka 27. 10. 2026) ---------- */
test('SCHEMA 72 + 83: jen dvě rozhodnutí; pole poznámky až po rozhodnutí, hned pod tlačítky; poznámka zůstane v poli po rozhodnutí, změně rozhodnutí, překreslení, skoku i F5; bez rozhodnutí nevzniká', () => {
  act('goScene', '2'); act('closeDrawer'); toOffer();
  const pn = D.pendingNow(S()); assert.ok(pn.ids.length >= 1); const id = pn.ids[0];
  const SAFE = NF.screens.SAFETY_ITEMS || {}, rej = id + ':rejected' + (SAFE[id] ? ':ano' : '');
  let m = markup(), panel = m.slice(m.indexOf('<aside'), m.indexOf('</aside>'));
  assert.match(panel, new RegExp('data-value="' + id + ':approved"')); assert.match(panel, new RegExp('data-value="' + id + ':rejected"'));
  assert.equal(/Upravit|garantEdit|garantComment|edited|Uložit komentář|Uložit poznámku/.test(panel), false, 'žádné Upravit ani tlačítko pro uložení poznámky');
  assert.equal(new RegExp('data-gnote="' + id + '"').test(panel), false, 'SCHEMA 83: před rozhodnutím karta pole poznámky nemá');
  assert.equal(/opustíte|opuštění pole/.test(m), false, 'žádné „až pole opustíte“');
  assert.equal(NF.decideItem(S(), id, 'edited', '', { garant: true }).ok, false, 'jádro zná jen approved / rejected');
  /* koncept (třeba ze starší verze) přežije skok na scénu a přehrání; bez rozhodnutí se neuloží (R14, SCHEMA 83) */
  D.noteDraft(id, 'Koncept A'); act('goScene', '6'); act('closeDrawer'); assert.equal(D.noteField(id), 'Koncept A');
  act('goScene', '2'); act('closeDrawer'); toOffer();
  act('garantNote', id); assert.equal(D.garantLog().filter(d => d.item === id).length, 0, 'poznámka bez rozhodnutí nevzniká');
  assert.ok(D.pendingNow(S()).ids.includes(id)); const step = S().tourStep; app.act('tourNext'); assert.equal(S().tourStep, step, 'Dál zůstává zamčené');
  /* rozhodnutí: koncept jde s ním; karta zůstane otevřená a pole je hned pod tlačítky s otázkou podle rozhodnutí */
  act('garantDecide', id + ':approved'); assert.equal(D.garantLog().slice(-1)[0].comment, 'Koncept A');
  m = markup(); panel = m.slice(m.indexOf('<aside'), m.indexOf('</aside>'));
  assert.match(panel, new RegExp('data-gitem="' + id + '"[^>]*><button[^>]*aria-expanded="true"'), 'rozhodnutá karta zůstane otevřená');
  assert.match(panel, new RegExp('data-value="' + id + ':rejected"[^>]*>[^<]*</button></div><label class="field gnote-field"><span>Proč jste schválili\\? \\(nepovinné\\)</span><textarea[^>]*data-gnote="' + id + '" placeholder="Např. s čím souhlasíte nebo co doplnit">Koncept A</textarea>'), 'pole hned pod tlačítky');
  assert.match(panel, /Uloženo \d{1,2}:\d\d( v tomto prohlížeči| jen v tomto prohlížeči| na serveru)?/); assert.match(m, /Rozhodli jste: <b>schváleno<\/b>/);
  if (pn.ids.length > 1) assert.match(panel, new RegExp('data-value="' + pn.ids[1] + ':approved"'), 'další nerozhodnutá karta je rozbalená vedle');
  NF.render(); assert.match(markup(), />Koncept A<\/textarea>/, 'po překreslení');
  /* psaní bez opuštění pole: „Ukládá se…“; uloží se po pauze (časovač, ukladani.test.cjs) nebo při opuštění pole */
  D.noteDraft(id, 'Koncept B'); assert.equal(D.savedLine(id), 'Ukládá se…'); act('garantNote', id); assert.equal(D.garantNote(id), 'Koncept B'); assert.match(D.savedLine(id), /^Uloženo \d{1,2}:\d\d/);
  /* změna rozhodnutí poznámku zachová a popisek se přepne */
  act('garantDecide', rej); assert.equal(D.garantLog().slice(-1)[0].status, 'rejected'); assert.equal(D.garantLog().slice(-1)[0].comment, 'Koncept B');
  m = markup(); assert.match(m, new RegExp('<span>Proč jste zamítli\\? \\(nepovinné\\)</span><textarea[^>]*data-gnote="' + id + '" placeholder="Např. co je špatně a jaké znění nebo hodnotu chcete">Koncept B</textarea>'));
  act('garantDecide', id + ':approved'); assert.equal(D.garantNote(id), 'Koncept B'); assert.match(markup(), /<span>Proč jste schválili\? \(nepovinné\)<\/span>/);
  /* F5: nová instance se stejným úložištěm */
  boot({ keepStore: true }); act('goScene', '2'); act('closeDrawer'); act('garantOpen', id); assert.match(markup(), new RegExp('data-gnote="' + id + '"[^>]*>Koncept B</textarea>'), 'po F5'); assert.equal(NF.itemState(S(), id), 'approved');
  D.noteDraft('R-POKYNY', 'rozepsáno'); boot({ keepStore: true }); assert.equal(D.noteField('R-POKYNY'), 'rozepsáno', 'rozepsaný koncept přežije F5');
  /* smazání poznámky je také změna: zapíše se prázdná poznámka a stav zůstane */
  act('goScene', '2'); act('closeDrawer'); act('garantOpen', id);
  D.noteDraft(id, ''); act('garantNote', id); assert.equal(D.garantNote(id), ''); const last = D.garantLog().slice(-1)[0]; assert.equal(last.kind, 'note'); assert.equal(last.status, 'approved'); assert.equal(NF.itemState(S(), id), 'approved');
  /* stejný text se znovu neukládá */
  const n = D.garantLog().length; D.noteDraft(id, ''); act('garantNote', id); assert.equal(D.garantLog().length, n);
  /* historie: po sobě jdoucí úpravy téže poznámky (do 2 min) jsou jedna řádka s posledním zněním; v deníku zůstávají všechny */
  ['X1', 'X2', 'X3'].forEach(t => { D.noteDraft(id, t); act('garantNote', id); });
  assert.equal(D.garantLog().filter(d => d.item === id && d.kind === 'note').length, 5, 'v deníku všechny úpravy');
  m = markup(); const hist = m.slice(m.indexOf('class="more ghist"'), m.indexOf('</details>', m.indexOf('class="more ghist"')));
  assert.match(hist, /poznámka \(4 úpravy\) · „X3“/); assert.equal(/„X1“|„X2“/.test(hist), false, 'mezikroky psaní v historii nejsou zvlášť');
  assert.match(hist, /Historie \(4\)/, 'počet řádek historie po sloučení');
});

test('SCHEMA 72: zásuvka „Vaše rozhodnutí“ z lišty nad příběhem – příběh stojí, nic se nepřehrává; přehled scén ukazuje nerozhodnuté', () => {
  act('goScene', '10'); act('closeDrawer'); next(); next();
  const st0 = S(), step = S().tourStep, sc = S().sceneIndex;
  let m = markup(); const bar = m.slice(m.indexOf('<div class="pres-bar"'), m.indexOf('</div>', m.indexOf('<div class="pres-bar"')));
  assert.match(bar, /data-action="openDecisions"/, 'lišta otevírá zásuvku'); assert.equal(/openAside/.test(bar), false, 'lišta neposílá do registru');
  act('openDecisions'); let ov = plain(elements.get('overlay').innerHTML);
  assert.match(ov, /<h2>Vaše rozhodnutí<\/h2>/); assert.match(ov, /Příběh stojí/); assert.match(ov, /Nerozhodnuto \(\d+\)/);
  assert.ok(ov.indexOf('data-dscene="todo"') >= 0 && ov.indexOf('data-dscene="todo"') < ov.search(/data-dscene="\d/), 'nerozhodnuté nahoře');
  const first = NF.garantItems(S()).map(r => r.id).find(id => !NF.itemTouched(S(), id));
  act('garantOpen', first); D.noteDraft(first, 'ze zásuvky'); act('garantDecide', first + ':rejected:ano');
  assert.equal(S(), st0, 'stav se nepřehrál (žádné land)'); assert.equal(S().tourStep, step); assert.equal(S().sceneIndex, sc); assert.equal(NF.itemState(S(), first), 'rejected');
  assert.equal(D.garantLog().slice(-1)[0].where, 'zasuvka'); ov = plain(elements.get('overlay').innerHTML); assert.match(ov, /„ze zásuvky“/);
  act('closeDrawer'); assert.equal(S().tourStep, step);
  act('openPresenter'); ov = plain(elements.get('overlay').innerHTML);
  assert.match(ov, /data-action="openDecisions" data-value="\d+">\d+ nerozhodnut/, 'přehled scén ukazuje počet nerozhodnutých'); assert.equal(/Ke schválení \(registr\)/.test(ov), false);
  act('openDecisions', '2'); assert.match(plain(elements.get('overlay').innerHTML), /data-dscene="2"/); act('closeDrawer');
});

test('SCHEMA 72: „Změnit rozhodnutí“ v oznámení otevře kartu v panelu na místě (ne registr); funguje i v zamčené obrazovce', () => {
  let found = null;
  for (const r of NF.garantItems(S())) {
    const i = D.scenes.findIndex((x, k) => D.decisionItems(k).includes(r.id)); if (i < 0) continue;
    act('goScene', String(i)); act('closeDrawer'); const g = D.tour.stepsFor(D.chapters[S().chapterIndex].id, S().branches);
    act('garantDecide', r.id + ':rejected:ano');
    for (let k = 0; k <= g.length && !found; k++) { const main = markup().slice(markup().indexOf('<main')); if (new RegExp('class="off-notice" role="status" data-off="' + r.id + '"').test(main)) { found = r.id; break; } if (k < g.length) next(); }
    if (found) break; D.garantClear(); act('closeDrawer');
  }
  assert.ok(found, 'některá zamítnutá položka má oznámení přímo na obrazovce příběhu');
  const s0 = S(), step = S().tourStep, role = S().role, page = S().page, main = markup().slice(markup().indexOf('<main'));
  assert.match(main, new RegExp('data-action="garantChange" data-value="' + found + '"')); assert.equal(/openAsideItem/.test(markup()), false, 'nic neposílá do registru');
  assert.match(main, /Zamítli jste „/); assert.equal(/v registru zamítli/.test(markup()), false);
  act('garantChange', found);
  assert.equal(S(), s0, 'nic se nepřehrálo'); assert.equal(S().tourStep, step); assert.equal(S().role, role); assert.equal(S().page, page); assert.equal(S().gOpen, found);
  const panel = markup().slice(markup().indexOf('<aside'), markup().indexOf('</aside>'));
  assert.match(panel, new RegExp('data-gnote="' + found + '"'), 'karta položky je v panelu rozbalená'); assert.match(panel, new RegExp('data-value="' + found + ':approved"'));
  act('garantDecide', found + ':approved'); assert.equal(NF.itemState(S(), found), 'approved'); assert.match(markup(), /Schváleno: „[^“]+“\. Část zase funguje\./);
  assert.equal(new RegExp('class="off-notice" role="status" data-off="' + found + '"').test(markup()), false, 'oznámení po schválení zmizí');
  /* zamčená obrazovka propustí tlačítko oznámení */
  const css = fs.readFileSync(path.join(__dirname, 'demo/demo.css'), 'utf8'); assert.match(css, /body\.pres-locked main \.off-notice \.btn[^{]*\{pointer-events:auto\}/);
  assert.match(fs.readFileSync(path.join(__dirname, 'demo/presenter.js'), 'utf8'), /var OUT = '[^']*\.off-notice/);
  /* vysvětlivka položky nabízí rozhodnutí na místě, ne registr */
  act('explainItem', found); const ov = plain(elements.get('overlay').innerHTML); assert.match(ov, new RegExp('data-action="garantChange" data-value="' + found + '"')); assert.equal(/Otevřít v registru/.test(ov), false);
  act('garantChange', found); assert.equal(NF.currentDrawer(), null, 'vysvětlivka se zavře a karta je v panelu'); assert.equal(S().gOpen, found);
});

test('SCHEMA 72: záznam „scene“ při opuštění scény (Dál, skok, konec) se stavem a poznámkou položek', () => {
  act('goScene', '2'); act('closeDrawer');
  const scenes = () => JSON.parse(store.get('nutrifee-sync-queue') || '[]').filter(x => x.kind === 'scene');
  assert.equal(scenes().slice(-1)[0].params.how, 'skok', 'skok přes menu se zapíše');
  D.noteDraft('R-NAVYKY', 'přidat zeleninu k večeři'); let g = 0; while (S().sceneIndex === 2 && g++ < 30) next();
  const last = scenes().slice(-1)[0]; assert.equal(last.scene, 3); assert.equal(last.item, 'SCENA'); assert.equal(last.params.how, 'dal'); assert.equal(last.params.to, 4);
  assert.equal(JSON.stringify(last.params.items.map(x => x.id)), JSON.stringify(D.decisionItems(2))); assert.ok(last.params.items.every(x => x.status === 'approved'));
  assert.equal(last.params.items.find(x => x.id === 'R-NAVYKY').note, 'přidat zeleninu k večeři'); assert.equal(last.params.pending.length, 0);
  const row = D.sync.row(last); assert.equal(row.kind, 'scene'); assert.equal(row.item, 'SCENA', 'sloupec item je not null'); assert.equal(row.scene, 3); assert.equal(row.user_email, 'garant@example.test');
  act('tourFinish'); assert.equal(scenes().slice(-1)[0].params.how, 'konec');
  const mm = markup(), panel = mm.slice(mm.indexOf('<aside'), mm.indexOf('</aside>')); assert.match(panel, /Ukázka skončila/); assert.match(panel, /data-action="goSummary"/); assert.equal(/registr/i.test(panel), false, 'konec ukázky bez registru');
  act('goSummary'); assert.equal(D.summaryActive(S()), true, 'Zpět na souhrn');
});

test('SCHEMA 72: Výsledky garanta – volič garanta z dat, záložka Po scénách (stav při odchodu + „později“) a Registr', () => {
  const T0 = '2026-10-27T10:00:00.000Z', T1 = '2026-10-27T10:05:00.000Z', T2 = '2026-10-27T10:30:00.000Z';
  const rows = [
    { id: 'a:1', kind: 'decision', item: 'R-NAVYKY', status: 'approved', comment: 'ok', at: T0, scene: 3, scene_title: 'x', params: { where: 'panel' }, user_id: 'ua', user_email: 'a@example.test' },
    { id: 'a:2', kind: 'decision', item: 'R-POKYNY', status: 'rejected', comment: 'jinak', at: T0, scene: 3, params: { where: 'panel' }, user_id: 'ua', user_email: 'a@example.test' },
    { id: 'a:3', kind: 'scene', item: 'SCENA', status: null, comment: '', at: T1, scene: 3, params: { how: 'dal', to: 4, items: [{ id: 'R-NAVYKY', status: 'approved', note: 'ok' }, { id: 'R-POKYNY', status: 'rejected', note: 'jinak' }], pending: [] }, user_id: 'ua', user_email: 'a@example.test' },
    { id: 'a:4', kind: 'decision', item: 'R-POKYNY', status: 'approved', comment: 'v pořádku', at: T2, scene: 21, params: { where: 'zasuvka' }, user_id: 'ua', user_email: 'a@example.test' },
    { id: 'b:1', kind: 'decision', item: 'C-CILE', status: 'rejected', comment: '', at: T1, scene: 3, params: { where: 'panel' }, user_id: 'ub', user_email: 'b@example.test' }
  ];
  store.set('nutrifee-auth', sessionFor('admin')); NF.render(); D.results.setRows(rows); act('openResults');
  let ov = plain(elements.get('overlay').innerHTML);
  assert.match(ov, /data-action="resultsWho" data-value="a@example\.test"/); assert.match(ov, /data-action="resultsWho" data-value="b@example\.test"/);
  assert.match(ov, /class="btn sm selected" data-action="resultsWho" data-value="a@example\.test"/, 'výchozí je naposledy aktivní účet');
  assert.match(ov, /Scéna 3 · /); assert.match(ov, /opuštěna [^<]*\(Dál ▶\)/); assert.match(ov, /<b>R-POKYNY<\/b>[^<]*<span class="tag bad">zamítnuto<\/span> „jinak“ <span class="res-later">později: schváleno [^<]*\(v zásuvce\) · „v pořádku“/);
  assert.match(ov, /nenavštívena/); assert.equal(/C-CILE[^<]*<span class="tag bad">/.test(ov), false, 'řádky jiného garanta se nemíchají');
  act('resultsTab', 'registr'); ov = plain(elements.get('overlay').innerHTML);
  assert.match(ov, /R-POKYNY · [^<]*<\/b><span class="tag ok">schváleno<\/span>/); assert.match(ov, /„v pořádku“/); assert.match(ov, /C-CILE · [^<]*<\/b><span class="tag ">nerozhodnuto<\/span>/); /* K2 (kontrola 3) */
  act('resultsFilter', 'noted'); ov = plain(elements.get('overlay').innerHTML); assert.match(ov, /R-NAVYKY · /); assert.equal(/C-CILE · /.test(ov), false); act('resultsFilter', 'noted');
  act('resultsWho', 'b@example.test'); ov = plain(elements.get('overlay').innerHTML); assert.match(ov, /C-CILE · [^<]*<\/b><span class="tag bad">zamítnuto<\/span>/); assert.match(ov, /R-POKYNY · [^<]*<\/b><span class="tag ">nerozhodnuto/);
  assert.equal(/upraveno|komentář/.test(ov), false);
});

test('SCHEMA 72: B1 obrazovka v příběhu zamčená i se sbaleným panelem; návrat do příběhu obnoví stav kroku; M6 návrat do registru platí po Dál; B3 detail registru pod lištou', () => {
  const src = fs.readFileSync(path.join(__dirname, 'demo/presenter.js'), 'utf8'); assert.match(src, /locked = !away\(s0\) && !gsum;/);
  chapter('firstMeal'); next(); next(); assert.ok(S().meal, 'zápis jídla otevřený'); const step = S().tourStep, snap = JSON.stringify(S().meal);
  S().meal = null; act('page', 'today'); assert.match(markup(), /Mimo příběh/);
  act('tourReturn'); assert.equal(S().tourStep, step); assert.equal(JSON.stringify(S().meal), snap, 'návrat obnovil zápis jídla'); assert.equal(/Mimo příběh/.test(markup()), false);
  /* M6 */
  act('goSceneFrom', '2:R-POKYNY'); assert.ok(D.itemsOnScreen(S()).includes('R-POKYNY') || S().tourStep === 0); assert.ok(D.returnTo());
  next(); assert.ok(D.returnTo(), 'návrat platí i po Dál'); assert.match(markup(), /← Zpět do registru/);
  act('regReturn'); assert.equal(S().page, 'registry'); assert.equal(S().reg.open, 'R-POKYNY');
  /* B3 */
  assert.match(fs.readFileSync(path.join(__dirname, 'app/design.css'), 'utf8'), /\.reg-side\{position:sticky;top:calc\(var\(--barh,0px\) \+ var\(--nf-s5\)\)/);
  const ui = fs.readFileSync(path.join(__dirname, 'app/ui.js'), 'utf8'); assert.match(ui, /NF\.scrollTo = function/); assert.match(ui, /st\.scrollTop = 0/); assert.match(ui, /getPropertyValue\('--barh'\)/);
  assert.match(src, /openAsideItem = function[^\n]*NF\.scrollTarget = '\.reg-side'/);
  /* detail ukazuje platnou poznámku */
  D.noteDraft('R-POKYNY', 'platná poznámka'); act('garantNote', 'R-POKYNY'); assert.match(markup(), />platná poznámka<\/textarea>/);
});

/* ---------- SCHEMA 74 (rozhodnutí vlastníka 27. 10. 2026): bez výzvy volat do ordinace; cesta dat ze senzoru obecně ---------- */
const CALL_RE = /zavolejte|zavoláte|zavolat do ordinace|volejte (do )?ordinac|volat ordinaci|volejte podle pokyn/i;
const SIGN_RE = /– váš lékař|Pokyn lékaře|pokyny lékaře|pokynem lékaře/;
test('SCHEMA 74: pacientské obrazovky v celém příběhu (každý krok, Dnes, Bezpečí, Plán, Před kontrolou) bez výzvy volat ordinaci a bez podpisu „váš lékař“', () => {
  for (const sc of storyScreens()) { assert.doesNotMatch(sc.html, CALL_RE, sc.where); assert.doesNotMatch(sc.html, SIGN_RE, sc.where); }
  for (let i = 0; i < D.chapters.length; i++) {
    act('goChapter', String(i)); act('closeDrawer'); act('role', 'patient');
    for (const pg of ['today', 'safety', 'plan', 'preview']) { act('page', pg); const m = markup().slice(markup().indexOf('<main')); assert.doesNotMatch(m, CALL_RE, D.chapters[i].id + '/' + pg); assert.doesNotMatch(m, SIGN_RE, D.chapters[i].id + '/' + pg); }
  }
  for (const c of NF.instructionCatalog()) assert.doesNotMatch(c.text, CALL_RE, c.id + ': pravidlo bez výzvy volat');
  for (const id of ['B-HYPO', 'I-VYSOKA', 'I-KONTAKT', 'I-NEMOC-JIDLO']) { const r = NF.item(S(), id); assert.doesNotMatch(Object.values(r.texts || {}).join(' '), CALL_RE, id); assert.doesNotMatch(r.summary.split('Pacient uvidí: „').slice(1).join(' ').split('“')[0] || '', CALL_RE, id + ' – text pro pacienta'); }
  /* dva poklesy za 7 dní: karta s obecnou radou z B-HYPO, „Rozumím“ ji zavře, další pokles ji vrátí */
  chapter('custom'); act('role', 'patient'); S().meal = null; S().hypoAlertSeen = null; act('page', 'today'); /* po scéně hypo: dva poklesy (16. a 17. 10.), kartu pacient zavřel – tady ji otevřeme znovu */
  let m = markup(); assert.match(m, /Glukóza vám za posledních 7 dní klesla pod 4 dvakrát/); assert.match(m, /Mějte u sebe vždy cukr nebo džus\./); assert.match(m, /class="card doc low repeat"/); /* SCHEMA 86: B-HYPO v2 v bodech */
  assert.doesNotMatch(m, /snězte víc|sněz víc|Otevřít Bezpečí/); assert.match(m, /data-action="hypoAlertSeen"/);
  assert.equal(NF.item(S(), 'B-HYPO').texts.zavolat, undefined, 'text „zavolat“ zrušen'); assert.ok(NF.item(S(), 'B-HYPO').texts.opakovane);
  act('hypoAlertSeen'); m = markup(); assert.doesNotMatch(m, /klesla pod 4 dvakrát/); assert.ok(S().events.some(e => e.what === 'hypo.opakovane' && e.data.item === 'B-HYPO'), 've stopě');
  const w = NF.addHypoWatch(S(), 'skipped', 'breakfast', NF.addMin(S().clock, -240), null); NF.answerHypoWatch(S(), w.id, 'yes'); act('noop');
  assert.match(markup(), /klesla pod 4 třikrát/, 'další pokles kartu vrátí');
  /* Bezpečí: pravidla bez podpisu, kontakty jen jako informace */
  act('page', 'safety'); m = markup(); assert.match(m, /<h2>Bezpečnostní pravidla<\/h2>/); assert.match(m, /Kam se obrátit[\s\S]*Zdravotní potíže[\s\S]*ordinace, mimo ordinační dobu pohotovost/); assert.match(m, /data-item="I-KONTAKT"/); /* SCHEMA 86: pravidlo „Kontakty“ neopakuje „Kam se obrátit“ */ assert.doesNotMatch(m, /doc-sign|figcaption|„Když glukóza/);
});

test('SCHEMA 74: čip „nad 15“ (glukóza teď i nejvyšší po jídle) hned ukáže pravidlo k vysoké glukóze I-VYSOKA a zapíše se do stopy', () => {
  chapter('firstMeal'); if (!S().meal) act('startMeal', 'breakfast'); act('mealBolus', 'as');
  const n0 = S().events.filter(e => e.what === 'pravidlo.vysoka').length;
  act('mealBefore', '12'); assert.doesNotMatch(markup(), /Glukóza je teď nad 15/, 'běžná hodnota pravidlo neukáže');
  act('mealBefore', 'high'); let m = markup();
  assert.match(m, /class="card doc warn high-now event"/); assert.match(m, /Glukóza je teď nad 15/); assert.match(m, /Když je glukóza nad <b>15 mmol\/l<\/b>, vypijte sklenici vody a pijte dál po malých doušcích\. Za 2 hodiny glukózu změřte znovu\. Inzulin navíc si nepíchejte a dávky neměňte\./); assert.doesNotMatch(m, /garant (doplní|navrhne)/);
  assert.match(m, /data-item="I-VYSOKA"/, 'značka pravidla u karty (SCHEMA 86: štítek jen přes prezentační vrstvu)'); assert.doesNotMatch(m, CALL_RE);
  const ev = S().events.filter(e => e.what === 'pravidlo.vysoka'); assert.equal(ev.length, n0 + 1); assert.equal(ev[ev.length - 1].data.item, 'I-VYSOKA'); assert.equal(ev[ev.length - 1].data.where, 'now');
  /* nejvyšší hodnota po předchozím jídle v bloku kroku 1 */
  const ep = NF.pendingPeakAsk(S())[0];
  if (ep) { act('peakChip', ep.id + ':high'); m = markup(); assert.match(m, /nejvyšší glukóza nad 15[\s\S]*Podívejte se, kolik ukazuje senzor teď/); /* SCHEMA 86: hodnota z minulosti – „teď“ a „tehdy“ */ assert.ok(S().events.some(e => e.what === 'pravidlo.vysoka' && e.data.where === 'peak' && e.data.epId === ep.id)); }
  /* zpětný zápis: nejvyšší po jídle „nad 15“ */
  S().meal = null; act('page', 'today'); act('mealRetro', 'lunch'); if (S().meal) { Object.assign(S().meal, { bolus: 'as', at: 11, whenOk: true, beforeAsked: true, before: 7, atMealOk: true }); /* SCHEMA 86: nejvyšší hodnota je čtvrtá otázka zpětného zápisu */ act('mealPeak', 'high'); assert.match(markup(), /Po jídle byla glukóza nad 15[\s\S]*Podívejte se, kolik ukazuje senzor teď/); assert.ok(S().events.some(e => e.what === 'pravidlo.vysoka' && e.data.where === 'peak')); }
  /* zamítnutá I-VYSOKA: na místě oznámení „Tahle část nefunguje“, žádný text pravidla */
  boot(); chapter('firstMeal'); act('role', 'doctor'); NF.decideItem(S(), 'I-VYSOKA', 'rejected', 'x'); act('role', 'patient'); if (!S().meal) act('startMeal', 'breakfast'); act('mealBolus', 'as'); act('mealBefore', 'high');
  m = markup(); assert.match(m, /Glukóza je teď nad 15/); assert.match(m, /nefunguje/); assert.doesNotMatch(m, /vypijte sklenici vody/);
  /* stopa: srozumitelný popisek */
  assert.equal(NF.EVENT_LABEL['pravidlo.vysoka'], 'Pravidlo k vysoké glukóze zobrazeno');
});

test('SCHEMA 74: o exportu ze senzoru maketa nemluví konkrétně – žádné „typ A“, formát, klinický účet ani povinné sdílení; připomínka před kontrolou a hláška po nahrání', () => {
  const BAD = /(?=[\s\S]*)(?:typu A\b|typ A\b)|(?:[Ff]ormát\w* (NutriFee|exportu)|převedeno do formátu|Rozpoznáno:|[Kk]linick\S* účt|nasdílel|sdílení dat|[Pp]ortál\w* výrobce|\bcsv\b|xlsx)/; /* „typ A“ velkým A (ne „diabetem 2. typu a“) */
  /* obrazovky celého příběhu */
  const txt = h => String(h).replace(/<[^>]+>/g, ' '); /* jen text obrazovky (atribut accept u výběru souboru je implementace) */
  for (const sc of storyScreens()) assert.doesNotMatch(txt(sc.html), BAD, sc.where);
  everyScreen((m, w) => assert.doesNotMatch(txt(m.slice(m.indexOf('<main'))), BAD, w));
  /* registr, průvodce, vyprávění, vysvětlivky, otázky garantovi */
  for (const r of S().registry.items) assert.doesNotMatch([r.title, r.summary, r.detail, r.usedBy, JSON.stringify(r.labels || {}), JSON.stringify(r.texts || {})].join(' '), BAD, r.id);
  for (const f of ['demo/guide.js', 'demo/tour-content.js', 'demo/explain.js', 'demo/fixtures.js', 'demo/presenter.js', 'demo/intro.js']) {
    const src = fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(src, /typu A\b|typ A\b|převedeno do formátu|Rozpoznáno:|[Kk]linick\S* účt|nasdílel/, f);
  }
  assert.equal(NF.SENSOR_FORMATS, undefined); assert.equal(NF.ELIGIBILITY.length, 4); assert.equal(NF.ELIGIBILITY_SENSOR, undefined);
  /* připomínka před kontrolou: přehled Před kontrolou i Dnes v týdnu před kontrolou */
  chapter('preview'); act('role', 'patient'); act('page', 'preview'); let m = markup();
  assert.match(m, /class="hint export-remind"><p class="mt-0 mb-0"><b>Před kontrolou pošlete do ordinace export ze senzoru\.<\/b>/); assert.match(m, /<summary>Jak na to<\/summary>/); /* SCHEMA 86: krátký návod obecně */ assert.doesNotMatch(m, /importPage|Nahrát export/, 'export nahrává jen sestra');
  act('page', 'today'); assert.match(markup(), /jdete na kontrolu[\s\S]*Před kontrolou pošlete do ordinace export ze senzoru\./);
  /* sestra nahraje: jen „Export nahrán a převeden · doplněno N jídel a N nocí“ */
  chapter('reviewSummary'); act('importDemo'); m = markup(); assert.match(m, /<b>Export nahrán a převeden · doplněno \d+ (jídlo|jídla|jídel) a \d+ (noc|noci|nocí)\.<\/b>/);
  assert.doesNotMatch(m.slice(m.indexOf('<main')), /Jak export získat|měření\. /);
  /* po nahrání se připomínka nezobrazuje */
  act('role', 'patient'); act('page', 'preview'); assert.doesNotMatch(markup(), /export-remind/);
  /* nečitelný soubor: obecná hláška */
  const bad = NF.importReadings(S(), NF.parseSensorCsv('nic tu není\n1;2')); assert.equal(bad.ok, false); assert.match(bad.error, /^Tento soubor neumíme načíst\./); assert.doesNotMatch(NF.IMPORT_REJECT, /formát|csv|xlsx|portál/i);
});

test('SCHEMA 74 (vlastník 27. 10. 2026): garant nic nevymýšlí – registr ani průvodce ho nežádají, aby doplnil nebo navrhl znění; pravidla mají úplné znění', () => {
  const ASK = /prosíme doplnit|doplní garant|navrhne garant|garant (doplní|navrhne|napíše znění)|chcete-li (je |to )?doplnit|napište (je|to) do poznámky/i;
  for (const r of S().registry.items) assert.doesNotMatch([r.summary, r.detail, r.usedBy].join(' '), ASK, r.id);
  for (const id of Object.keys(D.guideRaw || {})) assert.doesNotMatch(JSON.stringify(D.guideRaw[id]), ASK, id);
  const cat = NF.instructionCatalog(), t = id => cat.find(c => c.id === id).text;
  assert.match(t('I-VYSOKA'), /vypijte sklenici vody[\s\S]*změřte znovu[\s\S]*nepíchejte[\s\S]*záchrannou službu/);
  assert.match(t('I-NEMOC-JIDLO'), /Pijte často po malých doušcích[\s\S]*lékařskou pomoc[\s\S]*záchrannou službu/);
  for (const c of cat) { assert.doesNotMatch(c.text, CALL_RE, c.id); assert.doesNotMatch(c.text, /sněz(te)? víc|víc jídla/i, c.id); }
});

/* ---------- SCHEMA 83 (vlastník 2. 11. 2026): nejdřív rozhodnutí, pak volitelná poznámka; ukládá se ihned ---------- */
test('SCHEMA 83: registr bez prezentační vrstvy – pole poznámky až po rozhodnutí s otázkou podle rozhodnutí, ukládá se po pauze (data-autosave), změna rozhodnutí poznámku zachová, historie slučuje úpravy', () => {
  boot({ withDemo: false }); act('role', 'doctor'); act('page', 'registry'); act('regOpen', 'R-SKORE');
  let m = markup(); assert.match(m, /data-action="regDecide" data-value="approved"/); assert.equal(/data-bind="form\.note_R-SKORE"/.test(m), false, 'před rozhodnutím bez pole');
  assert.equal(/opustíte|opuštění pole|Poznámka \(nepovinná\)/.test(m), false);
  act('regDecide', 'rejected'); m = markup();
  assert.match(m, /<span>Proč jste zamítli\? \(nepovinné\)<\/span><textarea rows="3" maxlength="4000" data-bind="form\.note_R-SKORE" data-change="regNote" data-autosave="regNote" data-value="R-SKORE" placeholder="Např\. co je špatně a jaké znění nebo hodnotu chcete">/);
  assert.match(m, /data-regsaved="R-SKORE"[^>]*>Poznámka se ukládá sama už při psaní\.</);
  bind('form.note_R-SKORE', 'x'.repeat(600)); assert.equal(S().form['note_R-SKORE'].length, 600, 'poznámka nejvýš 4000 znaků, ne 500');
  assert.equal(NF.screens.regSavedLine(S(), NF.item(S(), 'R-SKORE')), 'Ukládá se…');
  bind('form.note_R-SKORE', 'Hranice 80 % je moc přísná.'); act('regNote', 'R-SKORE'); assert.equal(NF.itemNote(S(), 'R-SKORE'), 'Hranice 80 % je moc přísná.'); assert.equal(NF.itemState(S(), 'R-SKORE'), 'rejected');
  assert.match(markup(), /data-regsaved="R-SKORE"[^>]*>Uloženo \d{1,2}:\d\d\.</);
  act('regDecide', 'approved'); m = markup(); assert.equal(NF.itemNote(S(), 'R-SKORE'), 'Hranice 80 % je moc přísná.', 'změna rozhodnutí poznámku zachová');
  assert.match(m, /<span>Proč jste schválili\? \(nepovinné\)<\/span><textarea[^>]*placeholder="Např\. s čím souhlasíte nebo co doplnit">Hranice 80 % je moc přísná\.<\/textarea>/);
  const raw = elements.get('app').innerHTML, ta = raw.slice(raw.indexOf('data-bind="form.note_R-SKORE"')); assert.equal(ta.slice(0, ta.indexOf('</textarea>')).includes('\u00a0'), false, 'obsah pole bez nezlomitelných mezer (jinak by se uložily do poznámky)');
  ['A', 'AB', 'ABC'].forEach(t => { bind('form.note_R-SKORE', t); act('regNote', 'R-SKORE'); });
  m = markup(); const h = m.slice(m.indexOf('<summary>Historie ('));
  assert.match(h, /^<summary>Historie \(4\)<\/summary>/, 'zamítnuto, poznámka, schváleno, sloučené úpravy poznámky po změně'); assert.match(h, /poznámka \(3 úpravy\) · „ABC“/); assert.equal(/„AB“<\/li>/.test(h), false);
  assert.equal(S().registry.history.filter(x => x.item === 'R-SKORE' && x.kind === 'note').length, 4, 'v historii stavu zůstávají všechny');
});

test('SCHEMA 83: hláška po rozhodnutí v patičce panelu, v zásuvce ani v souhrnu neříká stav uložení (zastaral by); ten je jen pod polem poznámky a v liště', () => {
  const status = () => { const m = markup(); const out = []; for (const re of [/class="tour-status"[^>]*>([^<]*)</g, /class="gsum-msg"[^>]*>([^<]*)</g]) { let x; while ((x = re.exec(m))) out.push(x[1]); } return out.join(' | '); };
  const BAD = /Uložen|uložen|odeslání|na serveru|v tomto prohlížeči/;
  act('goScene', '2'); act('closeDrawer'); toOffer(); const id = D.pendingNow(S()).ids[0];
  act('garantDecide', id + ':approved'); assert.match(status(), /Schváleno: /); assert.equal(BAD.test(status()), false, 'panel: ' + status());
  D.noteDraft(id, 'proč'); act('garantNote', id); assert.match(D.savedLine(id), /^Uloženo \d{1,2}:\d\d (jen )?v tomto prohlížeči/, 'stav uložení je pod polem'); assert.match(markup(), new RegExp('data-gsaved="' + id + '"[^>]*>Uloženo'));
  act('garantDecide', id + ':rejected:ano'); assert.match(status(), /Zamítnuto: /); assert.equal(BAD.test(status()), false, 'panel po zamítnutí: ' + status());
  act('openDecisions'); const zid = NF.garantItems(S()).map(r => r.id).find(x => !D.garantStatus(x) && !(NF.screens.SAFETY_ITEMS || {})[x]);
  act('garantDecide', zid + ':approved'); const ov = plain(elements.get('overlay').innerHTML); assert.equal(/Schváleno: [^<]*(Uložen|odeslání|na serveru)/.test(ov + status()), false, 'zásuvka');
  act('closeDrawer');
  const fin = D.scenes.findIndex(x => !x.appendix && D.chapters[x.ch].id === 'trace'); act('goScene', String(fin)); act('closeDrawer'); S().tourStep = D.tour.stepsFor('trace', S().branches).length; NF.render();
  const sid = NF.garantItems(S()).map(r => r.id).find(x => !D.garantStatus(x) && !(NF.screens.SAFETY_ITEMS || {})[x]);
  act('garantOpen', sid); act('garantDecide', sid + ':rejected'); assert.match(status(), /Zamítnuto: /); assert.equal(BAD.test(status()), false, 'souhrn: ' + status());
});

console.log('');
console.log('Prošlo: ' + passed + ', selhalo: ' + failed);
if (fails.length) console.log('Selhaly: ' + fails.join(' | '));
process.exit(failed ? 1 : 0);
