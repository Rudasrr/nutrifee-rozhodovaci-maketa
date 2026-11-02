/* Fáze 2, balík C (27. 10. 2026): příběh a vyprávění říkají pravdu.
   Spuštění: node faze2-pribeh.test.cjs   (ONLY=část názvu spustí jen vybrané testy)
   – C01: stav po „Dál“ přes celou scénu = stav, který z téže scény udělá apply (D.play další scény);
   – citace v uvozovkách „…“ ve vyprávění (co, vsimni) jsou doslova na obrazovce toho kroku;
   – jednotlivé opravy C02–C26 (data příběhu a texty). */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, 'nutrifee-rozhodovaci-maketa.html'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1].split('?')[0]).filter(s => s.startsWith('app/') || s.startsWith('demo/'));
let app, NF, D, elements, store;
const sessionFor = role => JSON.stringify({ access_token: 't', refresh_token: 'r', expires_at: 4102444800000, user: { id: 'u-' + role, email: role + '@example.test', app_metadata: { role } } });
function boot() {
  elements = new Map(); store = new Map(); store.set('nutrifee-auth', sessionFor('garant'));
  const el = id => { if (!elements.has(id)) elements.set(id, { innerHTML: '', focus() { }, querySelector() { return null; }, querySelectorAll() { return []; }, childNodes: [] }); return elements.get(id); };
  const sb = {
    console, document: { getElementById: el, addEventListener() { }, querySelectorAll() { return []; }, createElement() { return { click() { }, set innerHTML(v) { }, querySelectorAll() { return []; } }; }, activeElement: null, body: null },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
    setTimeout() { return 1; }, Blob: class { }, URL: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() { } }
  };
  sb.window = sb; sb.globalThis = sb;
  const ctx = vm.createContext(sb);
  for (const f of scripts) vm.runInContext(fs.readFileSync(path.join(__dirname, f), 'utf8'), ctx, { filename: f });
  app = ctx.NutriFeeApp; NF = ctx.NutriFee; D = ctx.NutriFeeDemo;
}
const S = () => app.getState();
const next = () => { const pn = D.pendingNow(S()); pn.ids.forEach(id => app.act('garantDecide', id + ':approved')); if (pn.summary) app.act('garantConfirmSummary', 'force'); app.act('tourNext'); };
const norm = t => String(t).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[ \s]+/g, ' ').trim();
const screen = () => norm(elements.get('app').innerHTML.replace(/[\s\S]*?(<main)/, '$1'));
const val = (x, B) => typeof x === 'function' ? x(B, S()) : x;
const steps = s => D.tour.stepsFor(D.chapters[s.chapterIndex].id, s.branches);
const sceneOf = (id, appendix) => D.scenes.findIndex(sc => D.chapters[sc.ch].id === id && !!sc.appendix === !!appendix);

let passed = 0, failed = 0; const fails = [];
function test(name, fn) { if (process.env.ONLY && name.indexOf(process.env.ONLY) < 0) return; try { boot(); fn(); console.log('OK  ', name); passed++; } catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); } }

/* Otisk stavu, který kapitola mění (zápisy, sledování poklesu, nemoc, otázky, kontrola, zaučení, registr, zpětná vazba). */
function snap(s) {
  const adv = a => (a || []).filter(x => x.accepted === true || x.accepted === false).map(x => x.lever + ':' + x.accepted + ':' + (x.reason || '')).sort().join(',');
  const fid = id => { const f = NF.foodById(s, id); return f && f.custom ? 'vlastní:' + f.name : id; }; /* id vlastního jídla je z globálního počítadla (NF.uid) a liší se podle počtu rozhodnutí garanta při přehrání – porovnává se jménem */
  const eps = s.episodes.map(e => [e.meal, fid(e.foodId), e.portion, e.insulin && e.insulin.confirmed, adv(e.advice), e.context || ''].join('|')).sort();
  const hw = (s.hypoWatch || []).map(w => [w.kind, w.meal, w.answer || ''].join('|')).sort();
  const r = s.review, dec = r ? Object.keys(r.decisions).sort().map(k => k + '=' + r.decisions[k].choice + '/' + (r.decisions[k].units == null ? '' : r.decisions[k].units) + '/' + (r.decisions[k].swapTo || '')) : [];
  const ms = NF.pendingMilestone && NF.activePlan(s) ? NF.pendingMilestone(s) : null, wk = NF.activePlan(s) ? NF.weekSummary(s) : null;
  const rp = NF.item(s, 'R-PORADI');
  return { eps, hw, ill: !!(s.illness && s.illness.active), q: (s.questions || []).map(q => q.text).sort(), dec, issued: r ? r.planIssued || null : null,
    train: s.training ? [s.training.result || '', s.training.reason || ''].join('|') : '', reg: rp ? rp.status + '|' + (rp.version || 'v1') : '', ms: ms ? ms.id : '', wk: wk ? wk.id : '',
    plans: s.plans.map(p => p.id + ':' + Object.keys(p.doses).map(k => k + p.doses[k].units).join(',')).join(';'), nights: (s.nights || []).length };
}

/* ---------- C01 ---------- */
test('C01: kroky scény a apply kapitoly vedou ke stejnému stavu (všechny scény včetně dodatku)', () => {
  const bad = [];
  for (let i = 1; i < D.scenes.length; i++) {
    const sc = D.scenes[i], ch = D.chapters[sc.ch];
    if (!ch.apply) continue;
    app.act('goScene', String(i));
    const st = steps(S()); for (let k = 0; k < st.length; k++) next();
    const byStep = snap(S());
    /* apply nad týmž výchozím stavem scény */
    const B = Object.assign({}, D.defaults, sc.B), s2 = D.play(sc.ch, sc.B);
    NF.muteHooks(() => ch.apply(s2, B));
    const byApply = snap(s2);
    for (const k of Object.keys(byStep)) if (JSON.stringify(byStep[k]) !== JSON.stringify(byApply[k])) bad.push('scéna ' + (i + 1) + ' ' + ch.id + ' · ' + k + '\n    kroky: ' + JSON.stringify(byStep[k]).slice(0, 400) + '\n    apply: ' + JSON.stringify(byApply[k]).slice(0, 400));
  }
  assert.equal(bad.length, 0, '\n  ' + bad.join('\n  '));
});

/* ---------- pravdivost vyprávění ---------- */
test('Citace „…“ ve vyprávění (co, vsimni) jsou v tu chvíli na obrazovce; průchod bez chyby', () => {
  const bad = [], errs = [];
  app.act('goScene', '0');
  for (let g = 0; g < 600; g++) {
    const s = S(), ch = D.chapters[s.chapterIndex], st = steps(s), i = s.tourStep || 0;
    if (s.error) errs.push('scéna ' + (s.sceneIndex + 1) + ' ' + ch.id + ' krok ' + i + ': ' + s.error);
    const k = i > 0 ? st[i - 1] : (ch.id === 'prolog' ? null : (D.tour.chapters[ch.id] || {}).intro); /* úvod cituje tlačítko panelu, ne obrazovku */
    if (k) {
      const scr = screen();
      for (const f of ['co', 'vsimni']) for (const m of norm(val(k[f], s.branches) || '').matchAll(/„([^“„]+)“/g)) {
        const q = m[1].replace(/[.!?]$/, '').trim(); if (!scr.includes(q)) bad.push('scéna ' + (s.sceneIndex + 1) + ' ' + ch.id + ' ' + (i ? 'krok ' + i : 'úvod') + ' [' + f + ']: „' + m[1] + '“');
      }
    }
    if (s.sceneIndex >= D.scenes.length - 1 && i >= st.length) break;
    next();
  }
  assert.equal(errs.length, 0, 'chyby kroků:\n  ' + errs.join('\n  '));
  assert.equal(bad.length, 0, 'citace mimo obrazovku:\n  ' + bad.join('\n  '));
});

test('Každý krok má název jako text a vyprávění „co“; žádné „vpravo“ ani „klíč“', () => {
  for (const id of Object.keys(D.tour.chapters)) for (const B of [D.defaults, { training: 'failed', bolus: 'bigger', response: 'declines' }, { training: 'done', bolus: 'smaller', response: 'impractical' }]) {
    for (const k of D.tour.stepsFor(id, B)) {
      assert.equal(typeof k.t, 'string', id + ': název kroku'); assert.ok(k.co, id + '/' + k.t + ': co');
      const txt = [k.t, val(k.co, B), val(k.vsimni, B), val(k.proc, B), val(k.dusledek, B)].join(' ');
      assert.equal(/[Vv]pravo (je|vidíte|ukazuje)|[Pp]anel vpravo|klíč/.test(txt), false, id + '/' + k.t); /* „vpravo od čáry cíle“ na stupnici je v pořádku */
    }
  }
  assert.equal(/klíč/i.test(D.explainById.dose.text), false, 'C22: bublina dávky bez slova klíč');
  assert.equal(D.explainById.dose.item, null, 'C10 (nezávislá kontrola 27. 10. 2026): dávku žádná položka neřídí – bez odkazu');
});

/* ---------- jednotlivé opravy ---------- */
test('C03 (obráceno SCHEMA 74): zařazení bez kroku sdílení dat ze senzoru; dávky „zadal voličem“; ověření dávek je překážka vydání', () => {
  const st = D.tour.stepsFor('enroll', D.defaults);
  assert.ok(!st.some(k => (k.do || []).some(o => o.val === 'shared')), 'krok „Data ze senzoru nasdílená ordinaci“ zrušen (vlastník 27. 10. 2026)');
  const pv = D.tour.stepsFor('preview', D.defaults); assert.ok(pv.some(k => (k.do || []).some(o => o.sel === '.hint.export-remind')), 'den před kontrolou: připomínka poslat export do ordinace');
  const ds = D.tour.stepsFor('doses', D.defaults);
  assert.ok(/zadal dávky voličem: 8 \/ 10 \/ 8 j\. k jídlům, bazál 18 j\./.test(ds[0].co));
  assert.ok(/bez toho plán vydat nejde/.test(ds[1].co) && !/tablety/.test(ds[1].co));
  assert.equal(/prázdné/.test(D.tour.chapters.doses.intro.co), false);
});

test('C04: cíle glukózy mají vlastní krok s cílem na mřížce cílů', () => {
  const st = D.tour.stepsFor('doses', D.defaults);
  assert.ok(st.some(k => (k.do || []).some(o => /data-action="target"/.test(String(o.sel)))));
});

test('C02, C17, C18: dodatek zaučení a převzetí jen v krocích, kterými se liší', () => {
  const tf = D.tour.stepsFor('training', { training: 'failed' }), hf = D.tour.stepsFor('handover', { training: 'failed' });
  assert.ok(tf.length <= 3, 'zaučení: ' + tf.length + ' kroků'); assert.ok(hf.length <= 2, 'převzetí: ' + hf.length + ' kroků');
  assert.ok(tf.some(k => (k.do || []).some(o => o.act === 'trainingReason' && o.val === 'helper')), 'důvod „potřebuje pomoc blízké osoby“');
  const s = D.play(D.indexOf('handover'), { training: 'failed' });
  assert.equal(s.training.result, 'failed'); assert.equal(s.training.reason, 'helper'); assert.equal(s.training.steps.contacts, false);
  const dec = D.tour.stepsFor('reviewProposals', { response: 'declines' });
  assert.ok(dec.length <= 6 && dec.every(k => !/HbA1c 55|72 %/.test(String(val(k.co, { response: 'declines' })))), 'dodatek „rady nepřijal“ nepopisuje kartu k dávce');
});

test('C05, C06: scéna 11 bez pořadí u kaše, dvě rady, „spolu s další radou“; podnět ve scénáři 5 na řízku', () => {
  const st = D.tour.stepsFor('advice', D.defaults);
  assert.equal(st.some(k => (k.do || []).some(o => /order/.test(String(o.val)))), false);
  assert.ok(/spolu s další radou/.test(st[st.length - 1].dusledek)); assert.ok(st.some(k => /Obě rady jsou vybrané/.test(String(k.co)))); /* integrace SCHEMA 73: před přijetím krok s radou procházky (B01) */
  assert.ok(/oběma směry/.test(D.tour.chapters.advice.intro.vsimni));
  assert.ok(/řízk/.test(D.IMPULSE) && /přílohu/.test(D.IMPULSE) && !/kaše\b.*jogurt|jogurt/.test(D.IMPULSE));
  const s = D.play(D.indexOf('registry')); assert.equal(typeof s.impulse, 'object'); assert.equal(s.impulse.item, 'R-PORADI');
});

test('C07, C14: scéna 12 ukáže „Nevím“ s pokynem I-NEVIM; menší porce cituje jen vykreslené', () => {
  const st = D.tour.stepsFor('afterBolus', D.defaults);
  assert.ok(st.some(k => (k.needs || []).includes('I-NEVIM')));
  const smaller = st.find(k => /menší porce/.test(k.t));
  assert.ok(/„Méně jídla než obvykle“/.test(smaller.co) && /„Procházka po jídle: teď neradíme“/.test(smaller.co));
  assert.equal(/Vyzkoušeno 1×/.test(st.map(k => k.co).join(' ')), false);
});

test('C24: scéna „menší porce a pokles pod 4“ v hlavní linii za scénou po píchnutí; dva poklesy → karta s obecnou radou bez výzvy volat (SCHEMA 74)', () => {
  const i = sceneOf('hypo'), j = sceneOf('afterBolus');
  assert.equal(i, j + 1); assert.equal(D.scenes[i].appendix, false);
  const st = D.tour.stepsFor('hypo', D.defaults); assert.ok(st.length >= 4 && st.length <= 5);
  const s = D.play(D.indexOf('custom'));
  assert.equal(s.hypoWatch.filter(w => w.kind === 'smaller' && w.answer === 'yes').length, 2);
  assert.ok(NF.hypoAlert(s), 'dva poklesy za 7 dní'); assert.ok(NF.hypoAlert(s).seen, 'pacient kartu s radou ve scéně hypo přečetl a zavřel');
  const last = D.tour.stepsFor('hypo', D.defaults).slice(-1)[0]; assert.equal(last.do[0].sel, '.card.repeat'); assert.doesNotMatch(last.t + last.co, /zavolej|volat/i);
  const r = D.play(D.indexOf('reviewProposals')); assert.ok(NF.lowEvents(r, 92).length >= 2, 'Bezpečnost v reportu ukáže oba poklesy');
});

test('C10, Q6: export nahraje sestra před kontrolou; noci jen z exportu; návrh k bazálu s předností; shoda opsaných hodnot', () => {
  const pre = D.play(D.indexOf('reviewSummary'));
  assert.equal(pre.sensorSummary, null, 'souhrn ze senzoru vzniká až z exportu');
  assert.equal(pre.nights.filter(n => n.date >= D.EXPORT_FROM).length, 0, 'noci v období exportu nejsou předvyplněné');
  const st = D.tour.stepsFor('reviewSummary', D.defaults);
  /* SCHEMA 78 (rozhodnutí 7): před exportem projde sestra s pacientem léky a body, které z dat ověřit nejde */
  const iImp = st.findIndex(k => k.do[0].act === 'importDemo'); assert.ok(iImp >= 0); assert.equal(st[iImp + 1].do[0].act, 'startReview');
  assert.ok(st.slice(0, iImp).some(k => k.do[0].act === 'nurseMeds') && st.slice(0, iImp).some(k => k.do[0].act === 'nurseCheck'), 'kroky sestry před zahájením kontroly');
  const s = D.play(D.indexOf('reviewProposals'));
  assert.ok(s.sensorImport.filled >= 3 && s.sensorImport.agree.n >= 3 && s.sensorImport.agree.ok < s.sensorImport.agree.n, 'doplněná jídla a shoda X z Y');
  assert.equal(s.review.proposals[0].id, 'PR-BAZAL'); assert.ok(/pod cílem/.test(s.review.proposals[0].title));
  const d = D.play(D.indexOf('reviewProposals'), { response: 'declines' });
  assert.equal(d.review.proposals.some(p => p.id === 'PR-BAZAL'), false, 'v dodatku jiná historie bez nočních poklesů');
});

test('C15, Q4: zvýšit jen snídani (8 → 10 j.), oběd ponechán; nad cílem víc než dvě jídla', () => {
  const s = D.play(D.indexOf('reviewConfirm')), dec = s.review.decisions;
  assert.equal(dec['PR-BREAKFAST'].choice, 'agree'); assert.equal(dec['PR-BREAKFAST'].units, 10);
  assert.equal(dec['PR-LUNCH'].choice, 'keep'); assert.equal(dec['PR-LUNCH'].units, null);
  assert.equal(dec['PR-BAZAL'].choice, 'keep');
  assert.equal(s.review.newDoses.lunch.units, 10); assert.equal(s.review.newDoses.basal.units, 18);
  const pr = s.review.proposals.find(p => p.id === 'PR-BREAKFAST'), k = pr.verify.findIndex(t => /jedno nebo dvě jídla/.test(t));
  if (k >= 0) assert.equal(NF.verifyAgainst(pr, k), false, 'bod „nad cílem nejsou jen 1–2 jídla“ platí');
});

test('C16, C21, C23: bez „data říkají jinak“ ve větvi, bez „vpravo“, finále o souhrnu a pěti variantách dodatku', () => {
  const st = D.tour.stepsFor('reviewProposals', D.defaults);
  assert.equal(/aplikace jen ukázala/.test(st.map(k => k.vsimni || '').join(' ')), false);
  assert.ok(/nabízí se podle reakce/.test(D.tour.chapters.reviewConfirm.intro.vsimni));
  assert.ok(/Zobrazit zařazení a plán/.test(D.tour.chapters.reviewHandover.intro.vsimni));
  const fin = D.tour.stepsFor('trace', D.defaults)[0];
  assert.ok(/Vaše rozhodnutí/.test(val(fin.co, D.defaults))); assert.ok(/pět variant/.test(fin.dusledek));
  assert.equal(/značka „✓“/.test(D.tour.chapters.issue.intro.vsimni), false);
});

test('C19: lékař v reportu vidí otázku, kterou pacient vybral; žádná podstrčená', () => {
  const s = D.play(D.indexOf('reviewSummary'));
  assert.equal(s.questions.length, 1); assert.equal(/jogurt/.test(s.questions[0].text), false);
  const p = D.play(D.indexOf('preview')); assert.equal(D.firstQuestion(p), s.questions[0].text);
});

test('C20, A27: hrubá denní doba ve scénáři 2; E900 v den bez jiného oběda; „nemám to doma“ jen u doplňku', () => {
  assert.ok(D.garantQuestions[2].some(q => /hrubá denní doba/.test(q))); assert.equal(D.garantQuestions[1].some(q => /hrubá denní doba/.test(q)), false);
  const s = D.play(D.indexOf('preview'), { response: 'impractical' });
  assert.equal(s.episodes.filter(e => e.meal === 'lunch' && e.at.slice(0, 10) === '2026-12-20').length, 1);
  assert.equal(s.episodes.some(e => (e.advice || []).some(a => a.lever !== 'addon' && a.reason === 'nothome')), false);
});

test('C09, C12, C26: nemoc, zpětný zápis, převzetí a dopad zamítnutí rady', () => {
  const ill = D.tour.stepsFor('illness', D.defaults).filter(k => (k.do || []).some(o => o.act === 'illness'))[0]; /* integrace SCHEMA 73: před zapnutím krok s přepínačem (P-NEMOC, B01) */
  assert.ok(/Bazál píchá dál i bez jídla; inzulin k jídlu jen k jídlu, které sní/.test(val(ill.co, D.defaults)));
  assert.ok(/od 4\. dne/.test(val(D.tour.chapters.recovery.intro.vsimni, D.defaults)));
  assert.ok(/za 60 minut zeptáme na pokles pod 4/.test(val(D.tour.chapters.illnessMeal.steps[1].co, D.defaults)));
  const late = D.tour.stepsFor('lateMeal', D.defaults);
  assert.ok(late.some(k => /bez něj nelze říct, zda zápis smí do učení/.test(k.proc || '')));
  assert.equal(late.some(k => (k.do || []).some(o => o.val === 'walk:yes')), false, 'A06: procházka po 165 min se nenabízí');
  assert.ok(/v ostré aplikaci rada pacientovi zmizí/.test(D.tour.chapters.impact.intro.proc));
  assert.ok(/Odpověď na inzulin rozhoduje, které rady k množství jídla smíme dát/.test(D.tour.chapters.firstMeal.intro.proc));
});

console.log('\n' + passed + ' prošlo, ' + failed + ' selhalo' + (fails.length ? ':\n  ' + fails.join('\n  ') : ''));
process.exit(failed ? 1 : 0);
