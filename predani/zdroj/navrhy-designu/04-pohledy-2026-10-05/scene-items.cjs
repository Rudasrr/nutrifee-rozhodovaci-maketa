/* Vygeneruje demo/scene-items.js: pro každou scénu
   items   = položky registru, jejichž štítek se během scény objeví kdekoli na obrazovce (sjednocení přes všechny kroky; „V příběhu“ v průvodci),
   targets = položka → po kolika krocích scény je její štítek poprvé ve výřezu cíle kroku (sel / watch: karta, návrh, dlaždice, rada nebo část podkladů,
             ve které cíl leží) a nejvýš na výšku okna od cíle (M6); tam ji panel nabídne ke schválení (B01, 27. 10. 2026). Položky bez štítku (D.itemScene)
             podle své věty na obrazovce.
   deps    = (kontrola 2, 29. 10. 2026) krok → zamítnutá položka → „skip“ | „note“: odvozeno průchodem příběhu se zamítnutím každé garantové položky zvlášť
             proti schválenému průchodu. Krok závisí na položce, když se po jejím zamítnutí změní obsah výřezu cíle (nebo cíl zmizí), z obrazovky zmizí text,
             který vyprávění cituje, nebo děj kroku neproběhne. „skip“ = panel krok přeskočí (bez akce, jen prohlídka, nebo akce nejde provést);
             „note“ = děj proběhne a panel řekne, co na obrazovce místo zamítnuté části je. Opakuje se, dokud přeskočené kroky nemění další (pevný bod).
   alt     = zamítnutá položka → targets, jak vypadají při jejím zamítnutí (B2: položka se nabídne jen tam, kde je opravdu vidět).
   drop    = (kontrola 4, 30. 10. 2026, M2) krok → zamítnutá položka → klíče vět vyprávění, které v režimu „note“ panel vynechá: citují, co na obrazovce není,
             nebo popisují obsah, který po zamítnutí zmizel. Ostatní vyprávění kroku zůstává a věta o zamítnuté části se k němu připojí.
   Výpočet „co je ve výřezu cíle“ a „na čem krok závisí“ je jeden, sdílený s testem maketa-rozhodovaci/pravdivost.test.cjs (T1–T4).
   Použití: node scene-items.cjs            (z této složky; zapíše maketa-rozhodovaci/demo/scene-items.js; průchody běží souběžně, asi 2–4 minuty)
            node scene-items.cjs --out x.js (zapíše jinam, např. na zkoušku) */
const fs = require('fs'), path = require('path');
const P = require(path.join(__dirname, '..', '..', 'maketa-rozhodovaci', 'pravdivost.test.cjs'));
const oi = process.argv.indexOf('--out');
const out = oi > 0 ? path.resolve(process.argv[oi + 1]) : path.join(P.ROOT, 'demo', 'scene-items.js');

(async () => {
  const t0 = Date.now();
  const env = P.boot({ skip: ['demo/scene-items.js'] });
  const map = P.computeSceneMap(env);
  const D = env.D, NF = env.NF, garant = NF.garantItems(env.S()).map(r => r.id);
  const nScenes = D.scenes.length, keyOf = r => r.i + '.' + r.k;
  const implied = id => { const u = D.ucinek ? D.ucinek(id) : null; return (u && u.bezMista) || []; }; /* kontrola 3 (B1): R-POKYNY vypne pravidla I-* */

  /* 1. schválený průchod (všechny položky schválené) */
  const [base] = await P.pool([{ rejected: [], deps: null, alt: null }]);
  const bmap = new Map(base.map(r => [keyOf(r), r]));
  const baseTargets = P.targetsFromRecs(env, base);

  /* 2. závislosti: pro každou položku průchod se zamítnutím, dokud nevzniknou nové (přeskočený krok mění stav dalších) */
  const deps = {}, last = {}; garant.forEach(id => { deps[id] = D.scenes.map(() => ({})); });
  let todo = garant.slice();
  for (let round = 1; todo.length && round <= 6; round++) {
    const res = await P.pool(todo.map(X => ({ rejected: [X], deps: deps[X].map(d => { const o = {}; Object.keys(d).forEach(k => { o[k] = {}; o[k][X] = d[k]; }); return o; }), alt: null, full: false })));
    const next = [];
    todo.forEach((X, j) => {
      const recs = res[j]; let added = 0; last[X] = recs;
      recs.forEach(r => {
        const mode = P.stepDependency(bmap.get(keyOf(r)), r, X, implied(X)); if (!mode) return;
        const cur = deps[X][r.i][r.k];
        if (!cur || (cur === 'note' && mode === 'skip')) { deps[X][r.i][r.k] = mode; added++; }
      });
      /* úvody scén (krok 0): popisují obsah, který po zamítnutí ve scéně není → „note“ (kontrola 3, B1) */
      for (let i = 0; i < nScenes; i++) if (!deps[X][i][0] && P.introDependency(base.filter(r => r.i === i), recs.filter(r => r.i === i))) { deps[X][i][0] = 'note'; added++; }
      if (added) next.push(X);
    });
    console.log('kolo ' + round + ': ' + todo.length + ' průchodů, nové závislosti u ' + next.length + (next.length ? ' (' + next.join(', ') + ')' : ''));
    todo = next;
  }
  if (todo.length) console.log('POZOR: závislosti se neustálily u ' + todo.join(', '));

  /* 3. alt: cíle nabídky při zamítnutí každé položky (z posledního průchodu, kde už závislosti platily) */
  const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
  map.forEach((o, i) => {
    o.deps = {}; o.alt = {};
    garant.forEach(X => { Object.keys(deps[X][i]).sort((a, b) => a - b).forEach(k => { (o.deps[k] = o.deps[k] || {})[X] = deps[X][i][k]; }); });
    const sortedDeps = {}; Object.keys(o.deps).sort((a, b) => a - b).forEach(k => { sortedDeps[k] = o.deps[k]; }); o.deps = sortedDeps;
  });
  /* alt potřebuje průchod s finální mapou závislostí (u položek, které se v posledním kole měnily, by byl starý) */
  const fin = await P.pool(garant.map(X => ({ rejected: [X], deps: deps[X].map(d => { const o = {}; Object.keys(d).forEach(k => { o[k] = {}; o[k][X] = d[k]; }); return o; }), alt: null, full: false })));
  garant.forEach((X, j) => {
    const t = P.targetsFromRecs(env, fin[j]);
    for (let i = 0; i < nScenes; i++) if (!same(t[i], baseTargets[i])) map[i].alt[X] = t[i];
    /* drop: věty vyprávění kroků v režimu „note“ (kontrola 4, M2) */
    fin[j].forEach(r => { if (!r.k || r.mode !== 'note' || deps[X][r.i][r.k] !== 'note') return; const d = P.narrDrops(bmap.get(keyOf(r)), r); if (!d.length) return; const o = map[r.i]; o.drop = o.drop || {}; (o.drop[r.k] = o.drop[r.k] || {})[X] = d; });
  });
  if (map.some((o, i) => !same(o.targets, baseTargets[i]))) console.log('POZOR: targets z mapy scén a ze schváleného průchodu se liší ve scénách ' + map.map((o, i) => same(o.targets, baseTargets[i]) ? '' : i + 1).filter(Boolean).join(', '));

  fs.writeFileSync(out, P.sceneItemsJs(map));
  map.forEach((o, i) => console.log((i + 1) + '. ' + o.title + '\n   na obrazovce: ' + (o.items.join(', ') || '–') + '\n   nabídka: ' + (Object.keys(o.targets).map(id => id + ' (krok ' + o.targets[id] + ')').join(', ') || '–') +
    (Object.keys(o.deps).length ? '\n   závislosti: ' + Object.keys(o.deps).map(k => k + ': ' + Object.keys(o.deps[k]).map(id => id + (o.deps[k][id] === 'note' ? '·note' : '')).join(' ')).join(' | ') : '') +
    (Object.keys(o.alt).length ? '\n   jinak při zamítnutí: ' + Object.keys(o.alt).join(', ') : '') +
    (o.drop && Object.keys(o.drop).length ? '\n   vynechané věty (note): ' + Object.keys(o.drop).map(k => k + ': ' + Object.keys(o.drop[k]).map(id => id + '×' + o.drop[k][id].length).join(' ')).join(' | ') : '')));
  /* Kde se která garantová položka rozhodne (stejné pravidlo jako demo/presenter.js decisionPlan): první scéna hlavní linie se štítkem ve výřezu cíle,
     u položek v D.itemScene jen v jejich kapitole. Co místo nenajde, jde do souhrnu ve finále – vypíše se jako úkol pro příběh nebo obrazovky. */
  const manual = D.itemScene || {}, where = {};
  map.forEach((o, i) => { if (D.scenes[i].appendix) return; const ch = D.chapters[D.scenes[i].ch].id; Object.keys(o.targets).forEach(id => { const m = manual[id]; if (where[id] || (m && m.ch && [].concat(m.ch).indexOf(ch) < 0)) return; where[id] = (i + 1) + ' krok ' + (m && m.step ? Math.max(m.step, o.targets[id]) : o.targets[id]); }); }); /* { ch, step } jako v presenter.js offerStep (SCHEMA 75) */
  console.log('\nRozhodnutí: ' + garant.map(id => id + ' → ' + (where[id] || (manual[id] ? 'konec kapitoly ' + [].concat(manual[id].ch)[0] + ' (bez místa ve výřezu cíle!)' : 'souhrn ve finále (bez místa ve výřezu cíle!)'))).join('\n            '));
  console.log('Zapsáno: ' + out + ' (' + Math.round((Date.now() - t0) / 1000) + ' s)');
})().catch(err => { console.error(err); process.exitCode = 1; });
