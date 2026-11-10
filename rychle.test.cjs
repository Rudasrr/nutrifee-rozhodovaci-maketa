/* Rychlá sada testů (SCHEMA 89, rozhodnutí vlastníka 9. 11. 2026, bod 4): zábradlí pro každý krok, pod 1 minutu, bez prohlížeče a bez průchodu
   tlačítkem Další. Celá sada makety (node nutrifee-rozhodovaci-maketa.test.cjs, asi 12–15 minut) zůstává povinná před publikací.
   Obsah:  jádro jako knihovna (NF.configure, úložiště, háček změny, NF.proposalBranch, NF.OFF_TEXT, bez sítě a DOM) · registr · zásady
           (nepočítá dávku, nikdy „sněz víc“, nízká glukóza, bez výzvy volat) · zlaté výstupy (zlate-vystupy.test.cjs) · P1–P11 (obsah-pacienta.test.cjs)
           · tokeny (tokeny.test.cjs). Tři sady se spouštějí souběžně jako samostatné procesy.
   Spuštění: node rychle.test.cjs   (ONLY=část názvu spustí jen vybrané testy) */
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const G = require('./zlate-vystupy/generuj.cjs');

const T0 = Date.now();
const html = fs.readFileSync(path.join(__dirname, 'nutrifee-rozhodovaci-maketa.html'), 'utf8');
const CORE = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1].split('?')[0]).filter(s => s.startsWith('app/'));
const src = f => fs.readFileSync(path.join(__dirname, f), 'utf8');

/* Souběžné sady: spustí se hned, výsledky se sbírají na konci. */
const SUBS = [['zlate-vystupy.test.cjs', 'zlaté výstupy jádra'], ['obsah-pacienta.test.cjs', 'obsah obrazovek pacienta P1–P11'], ['tokeny.test.cjs', 'tokeny vzhledu a katalog']];
const running = process.env.ONLY ? [] : SUBS.map(([f, what]) => new Promise(resolve => {
  const p = spawn(process.execPath, [path.join(__dirname, f)], { cwd: __dirname }); let out = '';
  p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { out += d; });
  p.on('close', code => resolve({ f, what, code, out, ms: Date.now() - T0 }));
}));

let passed = 0, failed = 0; const fails = [];
function test(name, fn) {
  if (process.env.ONLY && name.indexOf(process.env.ONLY) < 0) return;
  try { fn(); console.log('OK  ', name); passed++; } catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); }
}
/* Jen jádro (app/core.js + app/data/), holé prostředí bez window, document a localStorage. */
function coreOnly(extra) {
  const ctx = vm.createContext(Object.assign({ console }, extra || {}));
  for (const f of G.CORE) vm.runInContext(src(f), ctx, { filename: f });
  return ctx.NutriFee;
}
const story = G.load(); /* jádro + přípravek modelového pacienta (demo/fixtures.js jen jako testovací data) */
const at = (id, B) => story.D.play(story.D.indexOf(id), B);

/* ---------- jádro jako knihovna ---------- */
test('Jádro: NF.configure({ now }) vymění hodiny; výchozí je čas zařízení', () => {
  const NF = coreOnly(); const S = NF.createState(); S.clock = '2026-01-01T00:00:00';
  NF.configure({ now: () => '2030-02-03T04:05:06' }); assert.equal(NF.now(), '2030-02-03T04:05:06'); assert.equal(NF.tick(S), '2030-02-03T04:05:06');
  NF.configure({ now: () => new Date(2031, 0, 2, 3, 4, 5) }); assert.equal(NF.now(), '2031-01-02T03:04:05');
  NF.configure({ now: null }); assert.match(NF.now(), /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/);
});
test('Jádro: NF.save bez úložiště vrátí false a NF.storageOK = false (žádný tichý „úspěch“)', () => {
  const NF = coreOnly(); const S = NF.createState();
  assert.equal(NF.storage(), null, 'v holém prostředí úložiště není'); assert.equal(NF.save(S), false); assert.equal(NF.storageOK, false);
  const NF2 = coreOnly(); NF2.configure({ storage: { get() { return null; }, set() { throw new Error('plno'); } } }); assert.equal(NF2.save(NF2.createState()), false); assert.equal(NF2.storageOK, false, 'chyba zápisu');
});
test('Jádro: NF.configure({ storage: { get, set } }) – uložení a načtení přes adaptér; jiné schéma se zálohuje', () => {
  const NF = coreOnly(), mem = new Map(); NF.configure({ storage: { get: k => (mem.has(k) ? mem.get(k) : null), set: (k, v) => mem.set(k, String(v)) } });
  const S = NF.load(); assert.equal(NF.storageOK, true); assert.equal(S.registry.items.length, 42, 'čistý start naplní registr');
  S.clock = '2026-10-06T07:00:00'; assert.equal(NF.save(S), true); assert.ok(mem.has(NF.STORAGE));
  const back = NF.load(); assert.equal(back.clock, '2026-10-06T07:00:00');
  const old = JSON.parse(mem.get(NF.STORAGE)); old.schema = 1; mem.set(NF.STORAGE, JSON.stringify(old)); NF.load(); assert.equal(NF.migrated, '1'); assert.ok(mem.has(NF.STORAGE + '.zaloha-1'));
});
test('Jádro: háček změny NF.onChange pro synchronizační vrstvu – po každém NF.save, odhlásit jde, při NF.muteHooks mlčí', () => {
  const NF = coreOnly(), mem = new Map(); NF.configure({ storage: { get: k => mem.get(k) || null, set: (k, v) => mem.set(k, v) } });
  const seen = []; const off = NF.onChange((s, info) => seen.push(info.saved));
  const S = NF.createState(); NF.save(S); NF.muteHooks(() => NF.save(S)); assert.deepEqual(seen.slice(), [true]);
  NF.configure({ storage: null }); NF.save(S); assert.deepEqual(seen.slice(), [true, false], 'neúspěšné uložení háček také dostane');
  off(); NF.save(S); assert.equal(seen.length, 2);
  NF.onChange(() => { throw new Error('x'); }); assert.doesNotThrow(() => NF.save(S), 'chyba v háčku jádro nezastaví');
});
test('Jádro: NF.proposalBranch a NF.OFF_TEXT jsou v jádře; obrazovky mají jen aliasy', () => {
  const NF = coreOnly(); assert.equal(typeof NF.proposalBranch, 'function'); assert.equal(NF.OFF_TEXT, 'Tato část teď není k dispozici.'); assert.ok(NF.OFF_RECORD_ONLY.includes('C-CILE'));
  assert.match(src('app/screens-clinic.js'), /V\.proposalBranch = function \(S, pr\) \{ return NF\.proposalBranch\(S, pr\); \};/);
  assert.doesNotMatch(src('app/screens.js'), /NF\.OFF_TEXT = '/, 'text je jen v jádře');
  assert.doesNotMatch(src('app/core.js'), /NF\.screens\.|NF\.slots\.itemGuide/, 'jádro nečte obrazovky ani průvodce');
});
test('Jádro: síť nevolá, DOM ani generativní AI nepoužívá (app/*); nové globální objekty nezakládá', () => {
  for (const f of CORE) { const s = src(f); assert.equal(/fetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource/.test(s), false, f + ' volá síť'); assert.equal(/openai|anthropic|claude|gpt/i.test(s), false, f); }
  for (const f of G.CORE) assert.equal(/\bdocument\.|\bwindow\.|localStorage\.(get|set)Item/.test(src(f).replace(/typeof window !== 'undefined' \? window : globalThis/g, '')), false, f + ' sahá na prohlížeč');
  const ctx = vm.createContext({ console }); for (const f of G.CORE) vm.runInContext(src(f), ctx, { filename: f });
  assert.deepEqual(Object.keys(ctx).filter(k => k !== 'console'), ['NutriFee']);
});

/* ---------- registr ---------- */
test('Registr: 42 položek, 28 garantových; provozní bez stavu; parametry v mezích; otisk „fp-“ + 16 hex shodný se zlatými výstupy', () => {
  const NF = coreOnly(), S = NF.createState(); NF.seed(S, '2026-09-28T10:00:00', 'g');
  assert.equal(S.registry.items.length, 42); assert.equal(NF.garantItems(S).length, 28); assert.equal(S.foods.length, 171);
  S.registry.items.filter(r => r.scope === 'provozni').forEach(r => assert.equal(NF.itemState(S, r.id), null, r.id));
  for (const [id, b] of Object.entries(NF.PARAM_BOUNDS)) { const r = NF.item(S, id); if (!r) continue; for (const [k, [lo, hi]] of Object.entries(b)) if (typeof r.params[k] === 'number') assert.ok(r.params[k] >= lo && r.params[k] <= hi, id + '.' + k); }
  const gold = G.readStored()['otisky.json']; const fp = {}; gold.polozky.forEach(p => { fp[p.id] = p.fp; });
  S.registry.items.forEach(r => assert.equal(NF.itemFingerprint(r), fp[r.id], r.id));
});

/* ---------- zásady ---------- */
test('Zásada 1: aplikace nepočítá ani nenavrhuje dávku – návrhy bez jednotek, větve jen z postupu D-POSTUP, jádro jednotky samo nemění', () => {
  const NF = story.NF, s = at('reviewProposals');
  for (const pr of s.review.proposals.filter(p => p.kind === 'dose' && !p.row)) {
    assert.equal(/\d+\s*j\./.test(pr.title + pr.why + pr.branches.map(b => b.text).join()), false, pr.id);
    assert.equal(pr.postup, 'D-POSTUP'); assert.ok(pr.branches.every(b => ['up', 'down', 'keep', 'swap', 'edit'].includes(b.action)), pr.id);
    assert.ok(['wait', 'free', 'keep', 'up', 'down', 'swap', 'edit'].includes(NF.proposalBranch(s, pr).action));
  }
  assert.equal(/units\s*[+\-]=\s*\d/.test(src('app/core.js')), false);
  const p1 = at('reviewConfirm'), p2 = at('newplan'); const P = x => NF.activePlan(x).doses;
  for (const k of ['basal', 'breakfast', 'lunch', 'dinner']) { const d = p1.review.decisions['PR-' + (k === 'basal' ? 'BAZAL' : k.toUpperCase())]; if (P(p2)[k].units !== P(p1)[k].units) assert.ok(d && d.units === P(p2)[k].units, k + ': změnu dávky zapsal lékař'); }
});
test('Zásada 3: porce před píchnutím oběma směry, po píchnutí a při „nevím“ jen z větší; nikdy „sněz víc“', () => {
  const NF = story.NF, s = at('advice'), k = s.foods.find(f => f.name === 'Ovesná kaše s mlékem a banánem').id, has = a => a.items.some(i => i.lever === 'portion');
  assert.ok(has(NF.advise(s, k, 'bigger', 'before'))); assert.ok(has(NF.advise(s, k, 'smaller', 'before'))); assert.ok(has(NF.advise(s, k, 'bigger', 'as')));
  const sm = NF.advise(s, k, 'smaller', 'as'); assert.equal(has(sm), false); assert.ok(sm.blocked.some(b => b.lever === 'portion' && b.reason === 'bolus'));
  assert.equal(NF.advise(s, k, 'bigger', 'unknown').effective, 'after'); assert.equal(has(NF.advise(s, k, 'smaller', 'unknown')), false);
  const bad = /(?<![„‚])(sněz víc|snězte víc|dej si víc|dejte si víc|jez víc|jezte víc|sněz více|snězte více|víc jídla)/i;
  const rady = G.readStored()['rady.json']; for (const sc of rady) for (const [key, a] of Object.entries(sc.rady)) { assert.equal(bad.test(JSON.stringify(a)), false, sc.kapitola + ' ' + key); if (/smaller · (as|unknown)$/.test(key)) assert.equal(a.rady.some(r => r.lever === 'portion'), false, 'z menší porce po píchnutí žádná rada k množství: ' + key); }
  const NF0 = coreOnly(); for (const c of NF0.instructionCatalog()) assert.equal(bad.test(c.text), false, c.id);
});
test('Zásada 3: nízká glukóza – po menší porci s inzulinem otázka za 60 min, 2 poklesy za 7 dní → karta s obecnou radou; pokles blokuje „zvýšit“', () => {
  const NF = story.NF, s = at('custom');
  const w = s.hypoWatch.filter(x => x.kind === 'smaller' && x.meal === 'lunch'); assert.ok(w.length >= 2 && w.every(x => x.answer === 'yes'), 'dvakrát „ano, pod 4“');
  const a = NF.hypoAlert(s); assert.ok(a && a.count >= 2 && a.days === 7, 'karta B-HYPO');
  assert.match(NF.item(s, 'B-HYPO').texts ? JSON.stringify(NF.item(s, 'B-HYPO').texts) : JSON.stringify(NF.item(s, 'B-HYPO')), /nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal/);
  const r = at('reviewConfirm'), pr = NF.clone(r.review.proposals.find(p => p.kind === 'dose' && !p.row && p.branches.some(b => b.action === 'up')));
  const i = pr.verify.findIndex(v => /pokles pod 4/.test(typeof v === 'string' ? v : (v && (v.text || v.t)) || '')); assert.ok(i >= 0, 'bod „pokles pod 4“ v postupu');
  pr.facts[i] = Object.assign({}, pr.facts[i], { block: true }); r.review.verify[pr.id] = Object.fromEntries(pr.verify.map((_, k) => [k, true]));
  assert.notEqual(NF.proposalBranch(r, pr).action, 'up', 'pokles pod 4 u jídla v období: větev „zvýšit“ nikdy');
});
test('Zásada 3: aplikace pacienta k volání do ordinace sama nevyzve (pravidla I-* a znění registru)', () => {
  const CALL_RE = /zavolejte|zavoláte|zavolat do ordinace|volejte (do )?ordinac|volat ordinaci|volejte podle pokyn/i, NF = coreOnly();
  for (const c of NF.instructionCatalog()) assert.equal(CALL_RE.test(c.text + ' ' + (c.prvniKrok || '') + ' ' + JSON.stringify(c.coDal || '')), false, c.id);
  const S = NF.createState(); NF.seed(S); for (const r of S.registry.items) assert.equal(CALL_RE.test(JSON.stringify(r.texts || '') + (r.text || '')), false, r.id);
});

/* ---------- souběžné sady ---------- */
(async () => {
  for (const r of await Promise.all(running)) {
    const tally = r.out.split('\n').filter(l => /prošl[oa],? \d|^\d+ prošlo|Prošlo:/.test(l)).slice(-1)[0] || '';
    test('Sada ' + r.f + ' – ' + r.what + ' projde (' + tally.trim() + '; ' + (r.ms / 1000).toFixed(1) + ' s)', () => assert.equal(r.code, 0, r.out.split('\n').filter(l => /^FAIL/.test(l)).join(' | ') || r.f + ' skončil chybou'));
  }
  console.log('\n' + passed + ' prošlo, ' + failed + ' selhalo' + (fails.length ? ':\n  ' + fails.join('\n  ') : '') + ' · ' + ((Date.now() - T0) / 1000).toFixed(1) + ' s');
  process.exitCode = failed ? 1 : 0;
})();
