#!/usr/bin/env node
/* Zlaté výstupy jádra NutriFee (SCHEMA 89, rozhodnutí vlastníka 9. 11. 2026, bod 4).
   Načte jen jádro (app/core.js, app/data/*.js) v holém prostředí JavaScriptu – bez window, document a localStorage – a jako testovací data
   přípravek modelového pacienta (demo/fixtures.js: kapitoly a scény příběhu, nic víc z prezentační vrstvy). Přehraje všech 32 scén
   (27 kapitol hlavní linie + 5 odboček) a do zlate-vystupy/*.json uloží klíčové výstupy jádra. Formát je čistý JSON, nezávislý na jazyce:
   stejné porovnání jde pustit proti jakékoli jiné implementaci jádra (viz README.md).

   Spuštění:  node zlate-vystupy/generuj.cjs          přepíše *.json (jen po vědomé změně chování jádra)
              node zlate-vystupy/generuj.cjs --check  nic nepíše, jen porovná a vypíše první rozdíl (kód 1 při neshodě)
   Test:      node zlate-vystupy.test.cjs (z maketa-rozhodovaci/) */
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CORE = ['app/core.js', 'app/data/registry.js', 'app/data/catalogs.js', 'app/data/foods.js'];
const FIXTURES = 'demo/fixtures.js';
const FILES = ['otisky.json', 'pribeh.json', 'kontrola.json', 'rady.json', 'stopa.json'];
/* Jídla a situace pro rady (NF.advise): čtyři jídla modelového pacienta × porce × stav inzulinu. */
const ADVICE_FOODS = ['Ovesná kaše s mlékem a banánem', 'Chléb se sýrem a zeleninou', 'Smažený řízek s bramborovou kaší', 'Kuřecí maso na kari s rýží'];
const PORTIONS = ['bigger', 'usual', 'smaller'];
const BOLUS = ['before', 'as', 'unknown'];

/* Holé prostředí: jen console. Jádro nesmí potřebovat DOM ani úložiště prohlížeče. */
function load(root) {
  root = root || ROOT;
  const ctx = vm.createContext({ console });
  for (const f of CORE.concat([FIXTURES])) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  return { NF: ctx.NutriFee, D: ctx.NutriFeeDemo, ctx };
}

const pick = (o, keys) => { const r = {}; if (!o) return null; keys.forEach(k => { if (o[k] !== undefined) r[k] = o[k]; }); return r; };
const plain = x => (x === undefined ? null : JSON.parse(JSON.stringify(x)));
const sceneKey = (D, i) => { const sc = D.scenes[i]; return { scena: i + 1, kapitola: D.chapters[sc.ch].id, vetve: plain(sc.B) }; };

function planOut(NF, S) {
  const p = NF.activePlan(S); if (!p) return null;
  const doses = {}; Object.keys(p.doses).sort().forEach(k => { doses[k] = p.doses[k].units; });
  return { id: p.id, predchozi: p.previousId || null, davky: doses, navyky: (p.habits || []).map(h => (typeof h === 'string' ? h : h.id)), pravidla: plain(p.instructions || []), cile: plain(p.targets || null), rady: plain(NF.planAdvice(S, p)) };
}
function adviceOut(a) {
  return {
    ucinna: a.effective, brana: plain(a.gate), nemoc: !!a.illness, nizkaTed: !!a.lowNow, mensiPoPichnuti: !!a.smallerInBody, rizikoNizke: !!a.lowRisk,
    rady: (a.items || []).map(i => pick(i, ['lever', 'item', 'label', 'text', 'certainty', 'carbs'])),
    zablokovano: (a.blocked || []).map(b => pick(b, ['lever', 'item', 'reason', 'text'])),
    zmizelo: plain(a.gone || [])
  };
}
function eventsOut(S) {
  return S.events.map(e => e.what + ((e.data && e.data.polozky && e.data.polozky.length) ? ' ' + e.data.polozky.map(p => p.id).join(',') : ''));
}
/* Tabulka větví D-POSTUP: pro každý návrh (karta, ne řádek) větev, když všechny body sedí, a když nesedí právě bod k. Na kopii stavu. */
function branchTable(NF, S) {
  const out = {};
  for (const pr of S.review.proposals.filter(p => !p.row)) {
    const row = {}, n = (pr.verify || []).length;
    const run = fill => { const s = NF.clone(S); s.review.verify[pr.id] = fill; const p2 = s.review.proposals.find(x => x.id === pr.id); const b = NF.proposalBranch(s, p2); return pick(b, ['action', 'text', 'when', 'block', 'missing']); };
    const all = {}; for (let i = 0; i < n; i++) all[i] = true;
    row.vseSedi = run(all);
    for (let k = 0; k < n; k++) { const f = Object.assign({}, all); f[k] = false; row['bod' + (k + 1) + 'Nesedi'] = run(f); }
    out[pr.id] = row;
  }
  return out;
}
function reviewOut(NF, S, withTable) {
  const r = S.review;
  return {
    krok: r.step, planId: r.planId, souhrn: plain(r.summary),
    navrhy: r.proposals.map(pr => Object.assign(pick(pr, ['id', 'kind', 'dose', 'cat', 'priority', 'title', 'why', 'item', 'lever', 'row', 'group', 'postup', 'lowBlock', 'needs']), {
      overeni: plain(pr.verify), fakta: plain(pr.facts || null), vetve: plain(pr.branches || []),
      stavBodu: (pr.verify || []).map((_, i) => { const v = NF.verifyState(S, pr, i); return v === undefined ? null : v; }),
      vetev: pr.row ? null : pick(NF.proposalBranch(S, pr), ['action', 'text', 'when', 'block', 'missing'])
    })),
    rozhodnuti: plain(r.decisions), noveDavky: plain(r.newDoses), noveCile: plain(r.newTargets || null),
    tabulkaVetvi: withTable ? branchTable(NF, S) : undefined
  };
}

/* env = { NF, D } z load() nebo z jiného načtení; opt.scenes = jen vybrané scény (indexy od 0) – pro porovnání s prezentační vrstvou. */
function generate(env, opt) {
  const { NF, D } = env || load(), only = opt && opt.scenes ? new Set(opt.scenes) : null;
  /* Otisky položek registru (otisk jádra = NF.itemFingerprint(položka), bez textu průvodce; stejný s prezentační vrstvou i bez ní). */
  const s0 = NF.createState(); NF.seed(s0, '2026-09-28T10:00:00', 'garant');
  const otisky = { polozek: s0.registry.items.length, garantovych: NF.garantItems(s0).length, jidel: s0.foods.length,
    polozky: s0.registry.items.map(r => ({ id: r.id, version: r.version || 'v1', scope: r.scope || null, cat: r.cat || null, fp: NF.itemFingerprint(r) })) };
  const pribeh = [], kontrola = [], rady = [], stopa = [];
  for (let i = 0; i < D.scenes.length; i++) {
    if (only && !only.has(i)) continue;
    const S = D.playScene(i), key = sceneKey(D, i), ch = key.kapitola;
    const focus = NF.focusMeal(S);
    pribeh.push(Object.assign({}, key, {
      hodiny: S.clock, role: S.role,
      pocty: { zapisy: S.episodes.length, noci: S.nights.length, udalosti: S.events.length, plany: S.plans.length, jidla: S.foods.length, otazky: S.questions.length, bazal: S.basalLog.length },
      plan: planOut(NF, S),
      slotyDne: plain(NF.daySlots(S)), naRade: plain(focus),
      jakSiVedu: plain(NF.activePlan(S) ? NF.howAmI(S) : null),
      hypo: { sledovani: plain((S.hypoWatch || []).map(w => pick(w, ['kind', 'meal', 'epId', 'answer']))), karta: plain(NF.hypoAlert(S) && pick(NF.hypoAlert(S), ['count', 'days', 'last', 'seen'])) },
      nemoc: !!(S.illness && S.illness.active),
      import: plain(S.sensorImport), senzor: plain(S.sensorSummary),
      registr: S.registry.items.filter(r => r.status !== 'approved' || (r.version && r.version !== 'v1')).map(r => ({ id: r.id, status: r.status, version: r.version || 'v1' }))
    }));
    if (S.review) kontrola.push(Object.assign({}, key, reviewOut(NF, S, ch === 'reviewProposals')));
    if (NF.activePlan(S) && D.chapters.indexOf(D.chapters[D.scenes[i].ch]) >= D.indexOf('firstMeal')) {
      const r = {};
      for (const name of ADVICE_FOODS) {
        const f = S.foods.find(x => x.name === name); if (!f) continue;
        for (const p of PORTIONS) for (const b of BOLUS) r[name + ' · ' + p + ' · ' + b] = adviceOut(NF.advise(S, f.id, p, b));
      }
      rady.push(Object.assign({}, key, { rady: r }));
    }
    stopa.push(Object.assign({}, key, { udalosti: eventsOut(S) }));
  }
  return { 'otisky.json': otisky, 'pribeh.json': pribeh, 'kontrola.json': plain(kontrola), 'rady.json': rady, 'stopa.json': stopa };
}

/* Stabilní zápis: klíče objektů seřazené, odsazení 1 mezerou, na konci nový řádek. */
function canon(x) {
  if (Array.isArray(x)) return x.map(canon);
  if (x && typeof x === 'object') { const o = {}; Object.keys(x).sort().forEach(k => { if (x[k] !== undefined) o[k] = canon(x[k]); }); return o; }
  return x;
}
const serialize = obj => JSON.stringify(canon(obj), null, 1) + '\n';

/* První rozdíl dvou hodnot JSON jako cesta „pribeh.json[21].kontrola.navrhy[0].vetev.action: 'up' ≠ 'keep'“; null = shodné. */
function firstDiff(a, b, at) {
  at = at || '';
  if (a === b) return null;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return at + ': ' + JSON.stringify(a) + ' ≠ ' + JSON.stringify(b);
  if (Array.isArray(a) !== Array.isArray(b)) return at + ': pole ≠ objekt';
  if (Array.isArray(a)) { if (a.length !== b.length) return at + ': délka ' + a.length + ' ≠ ' + b.length; for (let i = 0; i < a.length; i++) { const d = firstDiff(a[i], b[i], at + '[' + i + ']'); if (d) return d; } return null; }
  const keys = Array.from(new Set(Object.keys(a).concat(Object.keys(b)))).sort();
  for (const k of keys) { const d = firstDiff(a[k], b[k], at + '.' + k); if (d) return d; }
  return null;
}
function readStored(dir) { const out = {}; for (const f of FILES) { const p = path.join(dir || __dirname, f); out[f] = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null; } return out; }
function compare(got, stored) {
  const diffs = {};
  for (const f of FILES) { const d = stored[f] == null ? 'soubor chybí' : firstDiff(canon(stored[f]), canon(JSON.parse(JSON.stringify(got[f]))), f); if (d) diffs[f] = d; }
  return diffs;
}

module.exports = { ROOT, CORE, FIXTURES, FILES, load, generate, serialize, canon, firstDiff, readStored, compare };

if (require.main === module) {
  const t0 = Date.now(), out = generate();
  if (process.argv.includes('--check')) {
    const diffs = compare(out, readStored());
    for (const f of FILES) console.log((diffs[f] ? 'ROZDÍL ' + diffs[f] : 'shoda  ' + f));
    console.log((Date.now() - t0) + ' ms'); process.exitCode = Object.keys(diffs).length ? 1 : 0;
  } else {
    for (const f of FILES) { fs.writeFileSync(path.join(__dirname, f), serialize(out[f])); console.log('zapsáno ' + f + ' (' + fs.statSync(path.join(__dirname, f)).size + ' B)'); }
    console.log((Date.now() - t0) + ' ms');
  }
}
