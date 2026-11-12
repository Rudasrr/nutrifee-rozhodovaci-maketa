/* Zlaté výstupy jádra (SCHEMA 89, rozhodnutí vlastníka 9. 11. 2026, bod 4): přepočítá výstupy jádra z celého příběhu a porovná je
   se zlate-vystupy/*.json. Jádro se načítá v holém prostředí (bez window, document, localStorage); demo/fixtures.js je jen testovací data.
   Spuštění: node zlate-vystupy.test.cjs   (ONLY=část názvu spustí jen vybrané testy)
   Po vědomé změně chování jádra: node zlate-vystupy/generuj.cjs a změnu výstupů zkontrolovat v diffu. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const G = require('./zlate-vystupy/generuj.cjs');

let passed = 0, failed = 0; const fails = [];
function test(name, fn) {
  if (process.env.ONLY && name.indexOf(process.env.ONLY) < 0) return;
  try { fn(); console.log('OK  ', name); passed++; } catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); }
}

const core = G.load();
const got = G.generate(core);
const stored = G.readStored();
const diffs = G.compare(got, stored);

test('Jádro se načte bez DOM a bez úložiště prohlížeče; přehraje celý příběh až po vydání nového plánu (32 scén)', () => {
  const keys = Object.keys(core.ctx).filter(k => !['console', 'NutriFee', 'NutriFeeDemo'].includes(k));
  assert.deepEqual(keys, [], 'jádro nezakládá další globální objekty: ' + keys.join(', '));
  assert.equal(typeof core.NF.proposalBranch, 'function', 'větev postupu je v jádře');
  assert.equal(got['pribeh.json'].length, 32, '32 scén (SCHEMA 91, kód K16: dřív tautologie – generátor iteruje D.scenes)'); assert.equal(stored['pribeh.json'].length, 32, 'uložené zlaté výstupy mají 32 scén');
  const last = got['pribeh.json'].find(x => x.kapitola === 'newplan' && !Object.keys(x.vetve).length);
  assert.equal(last.plan.id, 'P2', 'nový plán vydaný jen jádrem'); assert.equal(last.plan.predchozi, 'P1');
});

for (const f of G.FILES) test('Zlatý výstup ' + f + ' se shoduje s přepočtem jádra', () => { assert.equal(diffs[f] || null, null, diffs[f]); });

test('Soubory zlatých výstupů jsou čistý JSON se seřazenými klíči (stejné porovnání jde pustit z jiného jazyka)', () => {
  for (const f of G.FILES) { const raw = fs.readFileSync(path.join(__dirname, 'zlate-vystupy', f), 'utf8'); assert.equal(raw, G.serialize(JSON.parse(raw)), f + ' není v kanonickém tvaru'); }
});

test('Otisky položek: otisk jádra je NF.itemFingerprint(položka) bez průvodce, „fp-“ + 16 hex, 43 položek, 29 garantových', () => {
  const o = stored['otisky.json']; assert.equal(o.polozek, 43); assert.equal(o.garantovych, 29); assert.equal(o.jidel, 171); /* SCHEMA 90: nové pravidlo I-VYSSI (bod 5) */
  assert.ok(o.polozky.every(p => /^fp-[0-9a-f]{16}$/.test(p.fp)));
  const r = core.NF.registryItems('2026-09-28T10:00:00', 'g').find(x => x.id === 'D-POSTUP');
  assert.equal(core.NF.itemFingerprint(r), o.polozky.find(p => p.id === 'D-POSTUP').fp);
  assert.notEqual(core.NF.itemFingerprint(r, { co: 'text průvodce' }), core.NF.itemFingerprint(r), 'otisk s průvodcem (rozhodnutí garanta) je jiný a počítá ho prezentační vrstva');
});

/* SCHEMA 90 (kód K5): v repozitáři dema (tabulka „Co převzít“ v predani/01-cesta-k-demu.md) HTML makety ani pravdivost.test.cjs nejsou – test se přeskočí s hláškou. */
const hasFull = fs.existsSync(path.join(__dirname, 'pravdivost.test.cjs')) && fs.existsSync(path.join(__dirname, 'nutrifee-rozhodovaci-maketa.html'));
if (!hasFull) console.log('SKIP S prezentační vrstvou (celé HTML) – pravdivost.test.cjs nebo HTML makety v tomto repozitáři není');
if (hasFull) test('S prezentační vrstvou (celé HTML) vyjdou stejné výstupy jádra i otisky ve stopě', () => {
  const P = require('./pravdivost.test.cjs'), full = P.boot();
  const pick = ['handover', 'reviewConfirm', 'trace'].map(id => core.D.scenes.findIndex(sc => core.D.chapters[sc.ch].id === id && !Object.keys(sc.B).length));
  const a = G.generate({ NF: full.NF, D: full.D }, { scenes: pick }), b = G.generate(core, { scenes: pick });
  for (const f of G.FILES) { const d = G.firstDiff(G.canon(JSON.parse(JSON.stringify(a[f]))), G.canon(JSON.parse(JSON.stringify(b[f]))), f); assert.equal(d, null, d); }
  /* otisky ve stopě (polozky[].fp) jsou s demo/ i bez něj totožné (dřív se lišily textem průvodce) */
  const t = core.D.indexOf('trace'), s1 = full.D.play(t), s2 = core.D.play(t);
  const refs = s => s.events.filter(e => e.data && e.data.polozky).map(e => e.data.polozky.map(p => p.id + '@' + p.version + '=' + p.fp).join(','));
  const r1 = refs(s1), r2 = refs(s2); assert.equal(r1.length, r2.length); r1.forEach((x, i) => assert.equal(x, r2[i], 'událost ' + i));
  const fpById = {}; stored['otisky.json'].polozky.forEach(p => { fpById[p.id + '@' + p.version] = p.fp; });
  let n = 0; s2.events.forEach(e => (e.data && e.data.polozky || []).forEach(p => { if (fpById[p.id + '@' + p.version]) { assert.equal(p.fp, fpById[p.id + '@' + p.version], p.id); n++; } }));
  assert.ok(n > 100, 'stopa nese otisky položek (' + n + ')');
});

console.log('\n' + passed + ' prošlo, ' + failed + ' selhalo' + (fails.length ? ':\n  ' + fails.join('\n  ') : ''));
process.exitCode = failed ? 1 : 0;
