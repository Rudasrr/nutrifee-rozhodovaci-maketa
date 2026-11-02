/* Kontroly pravdivosti (B25, 27. 10. 2026; kontrola 2, 29. 10. 2026): maketa má říkat pravdu – vyprávění, registr a průvodce popisují to, co obrazovka v tu chvíli opravdu dělá.
   T1  položka se ke schválení nabízí jen v kroku, kde je její štítek ve výřezu cíle kroku (sel / watch) a nejvýš na výšku okna od cíle (M6);
       položky bez štítku podle D.itemScene na místě s jejich větou – ve schváleném běhu i při zamítnutí každé garantové položky zvlášť (B2)
   T2  „V příběhu“ a „Kde je použita“ odpovídají mapě scén (demo/scene-items.js) a mapa odpovídá příběhu
   T3  zamítnutí každé garantové položky změní obrazovku právě ve scénách z průvodce a obsahem ze strojového popisu `ucinek` (co zmizí, co zůstane, oznámení)
   T4  vyprávění, které panel opravdu ukazuje (název, „Co se děje“, „Čeho si všímat“), necituje v uvozovkách „…“ text, který na obrazovce v tom kroku není,
       a netvrdí děj, který neproběhl – ve schváleném běhu i při zamítnutí každé garantové položky zvlášť (výjimky výslovně v CITACE_VYJIMKY)
   Průchody se zamítnutím běží souběžně v pracovních vláknech (PRAVDIVOST_WORKERS=n omezí jejich počet).
   Spuštění: node pravdivost.test.cjs   (ONLY=T3 jen jedna kontrola; T3_ITEMS=R-PORCE,B-HYPO jen vybrané položky (T1, T3, T4); VERBOSE=1 všechny nálezy;
             PRAVDIVOST_SCENE_ITEMS=soubor.js zkušební mapa místo demo/scene-items.js)
   Modul zároveň exportuje mini-DOM, výpočet mapy scén a průchod se zamítnutím pro generátor navrhy-designu/04-pohledy-2026-10-05/scene-items.cjs
   (jedna implementace „co je ve výřezu cíle“ a „na čem krok závisí“). */
'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const ROOT = __dirname;

/* ---------- načtení makety v Node (stejně jako hlavní test) ---------- */
function scriptsOf() {
  const html = fs.readFileSync(path.join(ROOT, 'nutrifee-rozhodovaci-maketa.html'), 'utf8');
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1].split('?')[0]);
}
function boot({ skip = [], quiet = true } = {}) {
  const elements = new Map(), store = new Map();
  store.set('nutrifee-auth', JSON.stringify({ access_token: 't', refresh_token: 'r', expires_at: 4102444800000, user: { id: 'u-garant', email: 'garant@example.test', app_metadata: { role: 'garant' } } })); /* maketa se bez přihlášení nezobrazí */
  const el = id => { if (!elements.has(id)) elements.set(id, { innerHTML: '', focus() { }, querySelector() { return null; }, querySelectorAll() { return []; }, childNodes: [] }); return elements.get(id); };
  const sb = {
    console: quiet ? { log() { }, warn() { }, error() { }, info() { } } : console,
    document: { getElementById: el, addEventListener() { }, querySelectorAll() { return []; }, createElement() { return { click() { }, set innerHTML(v) { }, querySelectorAll() { return []; } }; }, activeElement: null, body: null },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
    setTimeout() { return 1; }, Blob: class { }, URL: { createObjectURL() { return 'x'; }, revokeObjectURL() { } }
  };
  sb.window = sb; sb.globalThis = sb;
  const ctx = vm.createContext(sb);
  /* PRAVDIVOST_SCENE_ITEMS=cesta: místo demo/scene-items.js načte zkušební mapu (generátor s --out), soubor v maketě se nemění */
  const src = f => (f === 'demo/scene-items.js' && process.env.PRAVDIVOST_SCENE_ITEMS ? path.resolve(process.env.PRAVDIVOST_SCENE_ITEMS) : path.join(ROOT, f));
  for (const f of scriptsOf().filter(f => skip.indexOf(f) < 0)) vm.runInContext(fs.readFileSync(src(f), 'utf8'), ctx, { filename: f });
  const app = ctx.NutriFeeApp, NF = ctx.NutriFee, D = ctx.NutriFeeDemo;
  return { ctx, app, NF, D, S: () => app.getState(), store };
}

/* ---------- mini-DOM: rozbor HTML a výběr podle selektoru (třídy, atributy, značka, potomek/dítě, :first-of-type, :last-child, :first-child) ---------- */
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const ENT = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const decode = t => String(t).replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, m => ENT[m]).replace(/&#(\d+);/g, (m, n) => String.fromCharCode(Number(n)));
function parse(html) {
  const root = { tag: '#root', attrs: {}, kids: [], parent: null };
  let cur = root;
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>\/"']+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>"']+))?)*)\s*(\/?)>|([^<]+)|</g;
  let m;
  while ((m = re.exec(html))) {
    if (m[0].startsWith('<!--')) continue;
    if (m[5] != null || m[0] === '<') { cur.kids.push({ text: decode(m[5] != null ? m[5] : '<'), parent: cur }); continue; }
    const tag = m[2].toLowerCase();
    if (m[1]) { /* zavírací značka: vystoupit k nejbližšímu otevřenému stejného jména */
      let p = cur; while (p && p.tag !== tag) p = p.parent;
      if (p && p.parent) cur = p.parent;
      continue;
    }
    const attrs = {}, ar = /([^\s=>\/"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g;
    let a; while ((a = ar.exec(m[3] || ''))) attrs[a[1].toLowerCase()] = decode(a[2] != null ? a[2] : a[3] != null ? a[3] : a[4] != null ? a[4] : '');
    const node = { tag, attrs, kids: [], parent: cur };
    cur.kids.push(node);
    if (!VOID.has(tag) && !m[4]) cur = node;
  }
  return root;
}
const isEl = n => n && n.tag && n.tag !== '#root';
function splitTop(sel, ch) { const out = []; let depth = 0, q = null, buf = ''; for (const c of sel) { if (q) { if (c === q) q = null; buf += c; continue; } if (c === '"' || c === "'") { q = c; buf += c; continue; } if (c === '[' || c === '(') depth++; if (c === ']' || c === ')') depth--; if (c === ch && !depth) { out.push(buf); buf = ''; continue; } buf += c; } out.push(buf); return out.map(s => s.trim()).filter(Boolean); }
function compound(src) {
  const c = { tag: null, cls: [], attrs: [], pseudo: [] };
  let i = 0;
  const word = () => { const m = /^[\w-]+/.exec(src.slice(i)); if (!m) throw new Error('mini-DOM: nepodporovaný selektor „' + src + '“'); i += m[0].length; return m[0]; };
  const until = (open, close) => { let depth = 0, q = null, j = i; for (; j < src.length; j++) { const ch = src[j]; if (q) { if (ch === q) q = null; continue; } if (ch === '"' || ch === "'") { q = ch; continue; } if (ch === open) depth++; else if (ch === close) { depth--; if (!depth) break; } } const inner = src.slice(i + 1, j); i = j + 1; return inner; };
  if (src[0] === '*') i = 1; else if (/^[a-zA-Z]/.test(src)) c.tag = word().toLowerCase();
  while (i < src.length) {
    const ch = src[i];
    if (ch === '.') { i++; c.cls.push(word()); }
    else if (ch === '[') { const inner = until('[', ']'), m = /^([\w-]+)(?:([\^$*~|]?)=(?:"([^"]*)"|'([^']*)'|(.*)))?$/.exec(inner); if (!m) throw new Error('mini-DOM: atribut „' + inner + '“'); c.attrs.push([m[1].toLowerCase(), m[3] != null ? m[3] : m[4] != null ? m[4] : m[5], m[2] || '']); }
    else if (ch === ':') { i++; const name = word(); let arg = null; if (src[i] === '(') arg = until('(', ')'); c.pseudo.push([name, arg]); }
    else throw new Error('mini-DOM: nepodporovaný selektor „' + src + '“');
  }
  return c;
}
function parseSel(sel) {
  return splitTop(sel, ',').map(part => {
    /* rozdělit na složené selektory podle mezer a „>“ mimo závorky a uvozovky */
    const toks = []; let buf = '', depth = 0, q = null;
    for (const ch of part) {
      if (q) { buf += ch; if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; buf += ch; continue; }
      if (ch === '(' || ch === '[') depth++; if (ch === ')' || ch === ']') depth--;
      if (!depth && (ch === ' ' || ch === '>')) { if (buf) toks.push(buf); buf = ''; if (ch === '>') toks.push('>'); continue; }
      buf += ch;
    }
    if (buf) toks.push(buf);
    const out = []; let comb = ' '; for (const t of toks) { if (t === '>') { comb = '>'; continue; } out.push({ comb, c: compound(t) }); comb = ' '; } return out;
  });
}
const elKids = n => (n.kids || []).filter(isEl);
function matchC(n, c) {
  if (!isEl(n)) return false;
  if (c.tag && n.tag !== c.tag) return false;
  const cl = (n.attrs.class || '').split(/\s+/);
  for (const k of c.cls) if (cl.indexOf(k) < 0) return false;
  for (const [k, v, op] of c.attrs) {
    if (!(k in n.attrs)) return false; if (v == null) continue; const a = n.attrs[k];
    if (!(op === '^' ? a.startsWith(v) : op === '$' ? a.endsWith(v) : op === '*' ? a.indexOf(v) >= 0 : op === '~' ? a.split(/\s+/).indexOf(v) >= 0 : op === '|' ? (a === v || a.startsWith(v + '-')) : a === v)) return false;
  }
  for (const [p, arg] of c.pseudo) {
    const sib = elKids(n.parent);
    if (p === 'has') { if (!queryAll(n, arg).length) return false; }
    else if (p === 'not') { if (parseSel(arg).some(ps => matchComplex(n, ps))) return false; }
    else if (p === 'first-of-type') { if (sib.filter(x => x.tag === n.tag)[0] !== n) return false; }
    else if (p === 'last-of-type') { const t = sib.filter(x => x.tag === n.tag); if (t[t.length - 1] !== n) return false; }
    else if (p === 'first-child') { if (sib[0] !== n) return false; }
    else if (p === 'last-child') { if (sib[sib.length - 1] !== n) return false; }
    else if (p === 'nth-of-type' || p === 'nth-child') { const list = p === 'nth-child' ? sib : sib.filter(x => x.tag === n.tag), k = Number(arg); if (!(k >= 1) || list[k - 1] !== n) { if (!(k >= 1)) throw new Error('mini-DOM: :' + p + '(' + arg + ') jen s číslem'); return false; } }
    else throw new Error('mini-DOM: nepodporovaná pseudotřída :' + p);
  }
  return true;
}
function matchComplex(n, parts) {
  let i = parts.length - 1;
  if (!matchC(n, parts[i].c)) return false;
  let cur = n;
  while (i > 0) {
    const comb = parts[i].comb; i--;
    if (comb === '>') { cur = cur.parent; if (!matchC(cur, parts[i].c)) return false; continue; }
    let p = cur.parent; while (p && !matchC(p, parts[i].c)) p = p.parent;
    if (!p) return false; cur = p;
  }
  return true;
}
function walkEls(n, fn) { for (const k of n.kids || []) if (isEl(k)) { fn(k); walkEls(k, fn); } }
function queryAll(root, sel) { const ps = parseSel(sel), out = []; walkEls(root, n => { if (ps.some(p => matchComplex(n, p))) out.push(n); }); return out; }
function query(root, sel) { return queryAll(root, sel)[0] || null; }
function textOf(n) { if (!n) return ''; if (n.text != null) return n.text; if (n.tag === 'svg' || n.tag === 'script' || n.tag === 'style') return ''; return (n.kids || []).map(textOf).join(n.tag === '#root' ? ' ' : ''); }
const norm = t => String(t).replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim();
/* Text obrazovky po blocích: blokové značky oddělí mezerou, aby se slova nespojila. */
function screenText(n) {
  if (!n) return '';
  if (n.text != null) return n.text;
  if (n.tag === 'svg' || n.tag === 'script' || n.tag === 'style') return '';
  const inner = (n.kids || []).map(screenText).join('');
  return /^(div|p|li|ul|ol|section|h[1-6]|tr|td|th|table|dl|dt|dd|header|footer|main|aside|nav|details|summary|label|br|article|figure|figcaption)$/.test(n.tag) ? ' ' + inner + ' ' : inner;
}
/* Výřez cíle kroku: blok, ve kterém cíl leží – nejbližší předek (nebo cíl sám) s třídou card, prop, tile, advice nebo part (karta, návrh, dlaždice,
   rada, část podkladů) – a řádek štítků hned pod ním (např. značky pod dlaždicemi kontroly). Prohlížeč cíl odroluje do středu okna; štítek ve stejném
   bloku je vidět spolu s ním. Štítek kdekoli jinde na stránce se nepočítá (B01, 27. 10. 2026).
   M6 (kontrola 2, 29. 10. 2026): blok může být vyšší než okno (seznam pravidel: štítek „Kontakty“ 1300 px pod cílem). Štítek se počítá, jen když je
   od cíle nejvýš na výšku okna – odhad sazby v Node (WIN), ověřený v prohlížeči proti skutečným polohám. */
const REGION = ['card', 'prop', 'tile', 'advice', 'part'];
const hasCls = (n, list) => { const cl = (n.attrs.class || '').split(/\s+/); return list.some(r => cl.indexOf(r) >= 0); };
/* Řádek štítků: obsahuje štítky položek a kromě nich nejvýš krátký popisek („Dlaždice vycházejí z:“). */
function tagLine(n) {
  let tags = 0, other = '';
  (function w(x) { for (const k of x.kids || []) { if (k.text != null) { other += k.text; continue; } if (k.attrs['data-action'] === 'openItem') { tags++; continue; } w(k); } })(n);
  return tags > 0 && norm(other.replace(/[·,]/g, ' ')).length <= 40;
}
function region(n) {
  if (!n) return [];
  let r = n; for (let p = n; p && isEl(p); p = p.parent) if (hasCls(p, REGION)) { r = p; break; }
  const out = [r], sib = r.parent ? elKids(r.parent) : [], nx = sib[sib.indexOf(r) + 1];
  if (nx && tagLine(nx)) out.push(nx);
  return out;
}
/* Náhled telefonu u sestry (.phone-preview) je celá obrazovka pacienta: když cílem kroku je náhled sám (nebo blok kolem něj), jeho štítky se nepočítají –
   krok ukazuje náhled jako celek, ne pravidlo. Počítají se jen, když cíl leží uvnitř náhledu. */
function insidePreviewOutside(tag, target) {
  for (let p = tag.parent; p && isEl(p); p = p.parent) if (hasCls(p, ['phone-preview'])) { for (let q = target.parent; q; q = q.parent) if (q === p) return false; return true; }
  return false;
}
/* Odhad svislé polohy uzlů v sazbě (M6): blokové značky začínají nový řádek s okrajem, text se láme po `cpl` znacích (pacient: telefon, lékař a sestra: široký sloupec).
   Zavřené <details> se počítá jen nadpisem, pokud neobsahuje cíl nebo štítek (ty panel rozbalí). Kalibrace: navrhy-designu/27-kontrola2-2026-10-29/03-predavka-pribeh.md. */
const WIN = { gap: 560, scale: 1.7, lh: 22, pad: 7, cpl: { patient: 40, doctor: 100, nurse: 100 }, cols: { patient: 2, doctor: 3, nurse: 3 } };
const BLOCKS = /^(div|p|li|ul|ol|section|h[1-6]|tr|table|dl|dt|dd|header|footer|main|aside|nav|details|summary|label|article|figure|figcaption|fieldset|form|blockquote|hr|textarea)$/;
/* Mřížky (dlaždice, čipy, karty vedle sebe): děti stojí v řádcích po `cols`, výška řádku = nejvyšší dítě. */
const GRIDS = /\b(tiles|grid|dose-grid|food-grid|chips|gcounts|targets-grid|tgrid|cols|row2|two)\b/;
const contains = (a, b) => { for (let p = b; p; p = p.parent) if (p === a) return true; return false; };
function estimateYs(nodes, role, keep) {
  const cpl = WIN.cpl[role] || 60, cols = WIN.cols[role] || 2, start = new Map(), end = new Map();
  /* vrací výšku sazby uzlů od y; zapisuje začátky a konce */
  function lay(list, y0) {
    let y = y0, line = 0;
    const flush = () => { if (line > 0) { y += Math.ceil(line / cpl) * WIN.lh; line = 0; } };
    for (const n of list) {
      if (n.text != null) { const t = n.text.replace(/\s+/g, ' '); if (t.trim()) line += t.length; continue; }
      if (!isEl(n)) continue;
      const block = BLOCKS.test(n.tag);
      if (block) { flush(); y += WIN.pad; }
      start.set(n, y + Math.floor(line / cpl) * WIN.lh);
      if (n.tag === 'svg' || n.tag === 'script' || n.tag === 'style') { end.set(n, start.get(n) + WIN.lh); continue; }
      const closed = n.tag === 'details' && !('open' in n.attrs) && !keep(n);
      const kids = (n.kids || []).filter(k => !closed || !isEl(k) || k.tag === 'summary');
      if (block && GRIDS.test(n.attrs.class || '')) {
        const els = kids.filter(isEl); let yy = y;
        for (let r = 0; r < els.length; r += cols) { let h = 0; els.slice(r, r + cols).forEach(c => { h = Math.max(h, lay([c], yy) - yy); }); yy += h; }
        y = yy;
      } else if (block) { flush(); y = lay(kids, y); }
      else { flush(); const yy = lay(kids, y); if (yy > y + WIN.lh) y = yy; }
      end.set(n, Math.max(y, start.get(n) + WIN.lh));
      if (block) y += WIN.pad;
    }
    flush();
    return y;
  }
  lay(nodes, 0);
  return { start, end };
}
/* Mezera mezi cílem a štítkem (štítek uvnitř cíle = 0): přes výšku okna se cíl a štítek spolu neukážou. Odhad × scale (kalibrace v prohlížeči: skutečná sazba je asi 1,4–2× vyšší). */
function gapEst(L, n, t) { if (contains(n, t)) return 0; const a = L.start.get(n), b = L.end.get(n), c = L.start.get(t); if (a == null || c == null) return 0; const g = c >= b ? c - b : c + WIN.lh <= a ? a - (c + WIN.lh) : 0; return g * WIN.scale; }
function regionTags(n) { const reg = region(n), tags = []; reg.forEach(x => { const f = t => { if (t.attrs['data-action'] === 'openItem' && !insidePreviewOutside(t, n)) tags.push(t); }; if (isEl(x)) f(x); walkEls(x, f); }); return { reg, tags }; }
const itemsInRegion = (n, role) => {
  const ids = []; if (!n) return ids;
  const { reg, tags } = regionTags(n);
  const L = role && tags.length ? estimateYs(reg, role, d => contains(d, n) || tags.some(t => contains(d, t))) : null;
  tags.forEach(t => {
    const id = t.attrs['data-value']; if (ids.indexOf(id) >= 0) return;
    if (L && gapEst(L, n, t) > WIN.gap) return; /* M6: štítek je od cíle dál, než se s ním vejde do okna */
    ids.push(id);
  });
  return ids;
};
/* Odhad mezery mezi cílem a štítkem v px (pro kalibraci v prohlížeči). */
function tagDistances(n, role) {
  const out = {}; if (!n) return out;
  const { reg, tags } = regionTags(n), L = estimateYs(reg, role, d => contains(d, n) || tags.some(t => contains(d, t)));
  tags.forEach(t => { const id = t.attrs['data-value'], u = Math.round(gapEst(L, n, t)); if (out[id] == null || u < out[id]) out[id] = u; });
  return out;
}
function itemsIn(n) { const ids = []; if (!n) return ids; const f = x => { if (x.attrs['data-action'] === 'openItem' && ids.indexOf(x.attrs['data-value']) < 0) ids.push(x.attrs['data-value']); }; if (isEl(n)) f(n); walkEls(n, f); return ids; }

/* ---------- příběh ---------- */
function screenHtml(NF, s) {
  NF.renderSeq = (NF.renderSeq || 0) + 1; /* samostatné vykreslení jako v prohlížeči: oznámení „Tahle část nefunguje“ se ukáže celé, ne jen značka off-mark */
  try {
    if (NF.slots.pageOverride) { const o = NF.slots.pageOverride(s); if (o) return o; }
    return s.role === 'doctor' ? NF.screens.doctor(s) : s.role === 'nurse' ? NF.screens.nurse(s) : NF.screens.patient(s);
  } catch (err) { return '<p>RENDER-ERR ' + err.message + '</p>'; }
}
const valOf = (v, B, s) => (typeof v === 'function' ? v(B, s) : v);
/* Selektory výřezu cíle kroku: všechna sel z do[] a watch (vyhodnocená po provedení kroku). */
function stepSels(step, B, s) { const out = []; (step.do || []).forEach(op => { if (op.sel) out.push(valOf(op.sel, B, s)); }); if (step.watch) out.push(valOf(step.watch, B, s)); return out.filter(Boolean); }
function stepsOf(env) { const s = env.S(); return env.D.tour.stepsFor(env.D.chapters[s.chapterIndex].id, s.branches); }
const isActOp = op => !!(op && (op.act || op.bind || op.fn));
/* Průchod celým příběhem tlačítkem Dál. cb(i, k, s, ctx) po každém stavu (k = počet provedených kroků; 0 = začátek scény; ctx.from = kde Dál začalo –
   úsek přeskočených kroků panel slije do jednoho Dál, M3). decide(id) → 'approved' | 'rejected' pro nabídnuté položky (výchozí schválit). */
function walkStory(env, cb, { decide, scenes } = {}) {
  const { app, D, S } = env;
  const list = scenes || D.scenes.map((x, i) => i);
  for (const i of list) {
    app.act('goScene', String(i)); app.act('closeDrawer');
    const st = stepsOf(env);
    cb(i, 0, S(), { step: null, steps: st, from: 0 });
    for (let guard = 0; (S().tourStep || 0) < st.length && guard < 400; guard++) {
      const pn = D.pendingNow(S());
      pn.ids.forEach(id => app.act('garantDecide', id + ':' + (decide ? decide(id) : 'approved') + ':ano'));
      if (pn.summary) app.act('garantConfirmSummary', 'force');
      const from = S().tourStep || 0;
      app.act('tourNext');
      const k = S().tourStep || 0;
      if (k <= from) throw new Error('walkStory: Dál se nepohnulo (scéna ' + (i + 1) + ', krok ' + from + ')');
      cb(i, k, S(), { step: st[k - 1], steps: st, from });
    }
  }
}
/* Mapa scén pro demo/scene-items.js: items = štítky kdekoli na obrazovce během scény (jako dřív), targets = položka → po kolika krocích je poprvé ve výřezu cíle
   (a nejvýš na výšku okna od cíle, M6); u položek bez štítku (D.itemScene s textem) krok, v němž je jejich věta na obrazovce. */
function targetHits(env, i, k, s, step, root, txt, o) {
  const { D, NF } = env, manual = D.itemScene || {}, chId = D.chapters[D.scenes[i].ch].id;
  for (const sel of stepSels(step, s.branches, s)) itemsInRegion(query(root, sel), s.role).forEach(id => { if (o.targets[id] == null && NF.item(s, id) && NF.item(s, id).scope !== 'provozni') { o.targets[id] = k; if (o.pages) o.pages[id] = s.page; } });
  Object.keys(manual).forEach(id => { const m = manual[id]; if (m && typeof m === 'object' && [].concat(m.ch).indexOf(chId) >= 0 && m.text && o.targets[id] == null && txt.indexOf(m.text) >= 0) { o.targets[id] = k; if (o.pages) o.pages[id] = s.page; } });
}
function computeSceneMap(env) {
  const { D, NF } = env;
  D.sceneItems = null; /* při výpočtu žádné rozhodovací kroky z mapy */
  if (D.resetDecisionPlan) D.resetDecisionPlan();
  const out = D.scenes.map((sc, i) => ({ title: sc.title || D.chapters[sc.ch].title, items: [], targets: {}, pages: {} })); /* pages: obrazovka, na které je položka ve výřezu cíle (jen pro test T2, do souboru se nepíše) */
  walkStory(env, (i, k, s, c) => {
    const html = screenHtml(NF, s), root = parse(html), o = out[i];
    itemsIn(root).forEach(id => { if (o.items.indexOf(id) < 0) o.items.push(id); });
    if (!k) return;
    targetHits(env, i, k, s, c.step, root, norm(screenText(root)), o);
  });
  return out;
}
function sceneItemsJs(map) {
  const row = o => { const x = { title: o.title, items: o.items, targets: o.targets }; if (o.deps && Object.keys(o.deps).length) x.deps = o.deps; if (o.alt && Object.keys(o.alt).length) x.alt = o.alt; if (o.drop && Object.keys(o.drop).length) x.drop = o.drop; return JSON.stringify(x); };
  return '/* Generováno skriptem navrhy-designu/04-pohledy-2026-10-05/scene-items.cjs – needitovat ručně. Pro každou scénu: items = položky registru, jejichž štítek se během ní objeví na obrazovce;\n' +
    '   targets = položka → po kolika krocích scény je poprvé ve výřezu cíle kroku (sel / watch), tam ji panel nabídne ke schválení (B01, 27. 10. 2026);\n' +
    '   deps = krok (po kolika krocích) → položka → „skip“ (zamítnutí obsah kroku odstraní nebo jeho děj neproběhne: panel krok přeskočí) | „note“ (děj proběhne,\n' +
    '   ale část obrazovky chybí: panel řekne, co se místo toho stalo); alt = zamítnutá položka → mapa targets, jak vypadá při jejím zamítnutí (kontrola 2, 29. 10. 2026);\n' +
    '   drop = krok → položka → klíče vět vyprávění, které v režimu „note“ panel vynechá, protože popisují zamítnutou část (kontrola 4, M2). */\n' +
    '(function (global) { var D = global.NutriFeeDemo = global.NutriFeeDemo || {};\nD.sceneItems = [\n ' + map.map(row).join(',\n ') + '\n];\n})(typeof window !== \'undefined\' ? window : globalThis);\n';
}

/* Text obrazovky bez štítků položek (štítek „zamítnuto“ sám účinek není); oznámení „Tahle část nefunguje“ zůstává jako [OFF id]. */
function effectText(html) {
  const root = parse(html);
  const strip = n => { if (!n.kids) return; n.kids = n.kids.filter(k => !(isEl(k) && (k.attrs['data-action'] === 'openItem' || /\boff-mark\b/.test(k.attrs.class || '')))); n.kids.forEach(k => { if (isEl(k) && /\boff-notice\b/.test(k.attrs.class || '')) { k.kids = [{ text: ' [OFF ' + k.attrs['data-off'] + '] ', parent: k }]; } else strip(k); }); };
  strip(root);
  return norm(screenText(root));
}
/* Obsah výřezu bez štítků a bez oznámení o zamítnutí: mění se jen tehdy, když zamítnutí obsah odstraní nebo změní (oznámení samo obsah neubírá). */
function contentText(nodes) {
  const skip = k => isEl(k) && (k.attrs['data-action'] === 'openItem' || /\boff-(mark|notice)\b/.test(k.attrs.class || ''));
  const txt = n => { if (n.text != null) return n.text; if (!isEl(n) || n.tag === 'svg' || n.tag === 'script' || n.tag === 'style') return ''; const inner = (n.kids || []).filter(k => !skip(k)).map(txt).join(''); return BLOCKS.test(n.tag) || /^(td|th|br)$/.test(n.tag) ? ' ' + inner + ' ' : inner; };
  return norm(nodes.map(txt).join(' '));
}

/* ---------- co vyprávění popisuje (kontrola 3, B1) ----------
   Vyprávění nemusí obsah obrazovky citovat v uvozovkách – může ho popsat („karta s pravidlem k vysoké glukóze“). Proto se porovnávají věty obrazovky:
   segment = text jednoho bloku (odstavec, položka seznamu, nadpis, tlačítko…) rozdělený na věty, bez štítků položek a bez oznámení o zamítnutí.
   Segment „zmizel“, když je na obrazovce ve schváleném běhu a po zamítnutí ne. Vyprávění ho popisuje, když s ním sdílí dost významových slov
   (kmen = první 4 písmena bez diakritiky; bez spojek a bez nejčastějších slov celé makety). */
const SEG_BLOCKS = /^(div|p|li|ul|ol|section|h[1-6]|tr|td|th|table|dl|dt|dd|header|footer|main|aside|nav|details|summary|label|br|article|figure|figcaption|button|fieldset|legend|caption)$/;
function segments(root) {
  const out = []; let buf = '';
  const flush = () => { const t = norm(buf); if (t) out.push(t); buf = ''; };
  (function w(n) {
    for (const k of n.kids || []) {
      if (k.text != null) { buf += k.text; continue; }
      if (!isEl(k) || k.tag === 'svg' || k.tag === 'script' || k.tag === 'style') continue;
      if (k.attrs['data-action'] === 'openItem' || /\boff-(mark|notice)\b/.test(k.attrs.class || '')) continue;
      const b = SEG_BLOCKS.test(k.tag); if (b) flush(); w(k); if (b) flush();
    }
  })(root);
  flush();
  const set = new Set();
  out.forEach(t => t.split(/(?<=[.!?])\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ„])/).forEach(x => { x = x.trim(); if (x.length >= 6) set.add(x); }));
  return [...set];
}
const STOP = new Set(('jako nebo jsou neni nejs kdyz kter jeho jeji take jest tady tent teto tohl toho tomu tyto tech pouz pres podl prot poku bude budo byla bylo byli mezi pred poto svou svuj mame mate muze musi jine jina jiny jeste jeno tedy proc takz nikd vzdy dnes zatim zase ktery ktera ktere tim tam kde jak aby ale pak jen jiz ani pri pod nad bez pro nemu vsem vsec vase vasi')
  .split(' ').filter(w => w.length >= 4));
/* Nejčastější kmeny makety (glukóza, inzulin, jídlo, pacient, aplikace, obrazovka, krok…): samy shodu netvoří, počítá se jen s nimi v páru s jiným slovem. */
const COMMON = new Set('gluk inzu jidl paci apli obra krok porc davk mmol hodn leka plan sest pacn obvy nemo navr rada rady radu radi ukaz zapi karta kart polo scen prav stej mnoz pora maji muze umim cili dobr'.split(' ').map(w => w.slice(0, 4)));
function stems(t) {
  const ws = String(t || '').replace(/<[^>]+>/g, ' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]+/g) || [];
  const out = new Set(); ws.forEach(w => { if (/^\d+$/.test(w)) { if (w.length >= 2) out.add(w); return; } if (w.length < 4) return; const s = w.slice(0, 4); if (!STOP.has(s)) out.add(s); }); return out;
}
/* Popisuje vyprávění (text) některý zmizelý segment? Shoda = dost společných kmenů se segmentem (aspoň 60 % u krátkého, aspoň 4 u dlouhého, z toho
   aspoň jeden, u dlouhého dva, mimo nejčastější slova) a aspoň jeden společný kmen, který po zamítnutí na obrazovce není nikde (rest = zbylé segmenty).
   Vrací segment, nebo null. */
function describes(narr, segs, rest) {
  const N = stems(narr); if (!N.size) return null;
  const R = new Set(); (rest || []).forEach(t => stems(t).forEach(x => R.add(x)));
  for (const g of segs) {
    const G = stems(g); if (G.size < 3) continue;
    const hit = [...G].filter(x => N.has(x)), rare = hit.filter(x => !COMMON.has(x)), lost = hit.filter(x => !R.has(x));
    if (hit.length >= Math.max(3, Math.min(4, Math.ceil(G.size * 0.6))) && rare.length >= 2 && lost.length >= 1) return g;
  }
  return null;
}
/* Volnější shoda jen uvnitř výřezu cíle, jehož obsah se po zamítnutí změnil (méně náhodných shod): aspoň dva společné kmeny, jeden mimo nejčastější slova. */
function describesLoose(narr, segs, rest) {
  const N = stems(narr); if (!N.size) return null;
  const R = new Set(); (rest || []).forEach(t => stems(t).forEach(x => R.add(x)));
  for (const g of segs) { const G = stems(g), hit = [...G].filter(x => N.has(x)); if (G.size >= 2 && hit.length >= 2 && hit.some(x => !COMMON.has(x)) && hit.some(x => !R.has(x))) return g; }
  return null;
}
/* Zmizelé segmenty: ve schváleném běhu a po zamítnutí ne; čísla se neporovnávají (změněný počet není zmizelý obsah) a odkazy „V příběhu“ registru taky ne. */
const segKey = t => String(t).replace(/\d+([,.]\d+)?/g, '#');
function goneSegs(bSegs, rSegs) { const have = new Set((rSegs || []).map(segKey)); return (bSegs || []).filter(x => !have.has(segKey(x)) && !/\(rozhodujete zde/.test(x)); }
/* Text obrazovky bez oznámení o zamítnutí (kontrola 3, B1: oznámení cituje průvodce „Co se stane při zamítnutí“, a tím i větu, která na obrazovce chybí). */
function textNoOff(root) {
  const cut = n => ({ tag: n.tag, attrs: n.attrs, parent: null, text: n.text, kids: (n.kids || []).filter(k => !(isEl(k) && /\boff-notice\b/.test(k.attrs.class || ''))).map(cut) });
  return norm(screenText(cut(root)));
}
const NARR_FIELDS = ['t', 'co', 'vsimni', 'proc', 'dusledek'];
function authoredText(x, B, s) { if (!x) return ''; return NARR_FIELDS.map(f => { let v = ''; try { v = valOf(x[f], B, s); } catch (err) { v = ''; } return String(v || ''); }).join(' '); }

/* ---------- citace „…“ ---------- */
/* Výjimky: citace, které úmyslně nejsou na obrazovce aplikace (tlačítka panelu, slova pacienta, vysvětlení pojmu). Klíč = text citace.
   Názvy položek registru a názvy kroků (věty o přeskočení a o zamítnuté části) jsou výjimkou vždy. */
const CITACE_VYJIMKY = {
  'Začít ukázku': 'tlačítko panelu',
  'Dál': 'tlačítko panelu',
  'Další': 'tlačítko panelu / obecné slovo',
  'Tahle část nefunguje': 'oznámení se ukáže jen po zamítnutí; text oznámení se v T4 nepočítá jako obrazovka (kontrola 3, B1)',
  'Váš nesouhlas je zapsaný': 'oznámení záznamu nesouhlasu (C-CILE, K-KRITERIA, Z-GLUKOZA) se ukáže jen po zamítnutí; text oznámení se v T4 nepočítá jako obrazovka (kontrola 3)',
  'co budete jíst': 'zápor: vyprávění říká, že se aplikace takhle neptá',
  'Ukažte telefon sestře': 'popis odpovědi „Ne“, kterou příběh nevolí',
  'radu X vám už nenabízíme – lékař ji vypnul': 'šablona věty s X, konkrétní znění je v dodatku'
};
/* Citace „…“ v textu; vnořené „…„X“…“ se berou jako jedna (vnější). */
function quotes(t) {
  const txt = String(t || '').replace(/<[^>]+>/g, ''), out = []; let depth = 0, start = -1;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (c === '„') { if (!depth) start = i + 1; depth++; }
    else if (c === '“' && depth) { depth--; if (!depth) out.push(txt.slice(start, i)); }
  }
  return out;
}
function quoteOnScreen(q, txt) {
  const low = txt.toLowerCase();
  const parts = q.split(/…|\.\.\./).map(x => norm(x).replace(/[.,:;!?]+$/, '')).filter(x => x.length > 1);
  return parts.every(p => low.indexOf(p.toLowerCase()) >= 0);
}
/* Text, který garant v kroku viděl: obrazovka před krokem (cíl, na který ukázka klepla) i po něm a hláška v panelu (poděkování, oznámení). */
function panelStatus(D, s) { try { const r = parse(D.panelHtml(s)); return queryAll(r, '.tour-status').map(n => norm(screenText(n))).join(' '); } catch (err) { return ''; } }
function authoredQuotes(x, B, s) { const out = []; ['t', 'co', 'vsimni'].forEach(f => { let v = ''; try { v = valOf(x[f], B, s); } catch (err) { v = ''; } quotes(v).forEach(q => out.push(q)); }); return out; }

/* ---------- průchod s rozhodnutími (kontrola 2): záznam každého kroku pro mapu závislostí, T1, T3 a T4 ----------
   rejected = položky zamítnuté předem (ostatní schválené), deps / alt = zkušební mapa závislostí místo souboru (generátor). */
function variantWalk({ rejected = [], deps, alt, full = true } = {}) {
  const env = boot(), { D, NF, app, S } = env;
  if (deps !== undefined) (D.sceneItems || []).forEach((sc, i) => { sc.deps = (deps && deps[i]) || {}; });
  if (alt !== undefined) (D.sceneItems || []).forEach((sc, i) => { sc.alt = (alt && alt[i]) || {}; });
  if (D.resetDecisionPlan) D.resetDecisionPlan();
  const R = new Set(rejected), names = new Set();
  NF.garantItems(S()).forEach(r => app.act('garantDecide', r.id + ':' + (R.has(r.id) ? 'rejected' : 'approved') + ':ano'));
  S().registry.items.forEach(r => names.add(r.title));
  Object.keys(D.tour.chapters).forEach(id => (D.tour.chapters[id].steps || []).forEach(x => { if (typeof x.t === 'string') names.add(x.t); }));
  const recs = [], manual = D.itemScene || {};
  let prevSeen = '', prevEff = '', prevRoot = null;
  walkStory(env, (i, k, s, c) => {
    const html = screenHtml(NF, s), root = parse(html), eff = effectText(html), txt = norm(screenText(root));
    const status = panelStatus(D, s), seen = textNoOff(root) + ' ' + status, ch = D.chapters[D.scenes[i].ch].id; /* B1 (kontrola 3): citace v oznámení o zamítnutí se nepočítá */
    const sh = D.shownNarration ? D.shownNarration(s) : { mode: k ? 'run' : 'intro' };
    /* kontrola 4: hláška panelu (poděkování, „Zapsáno“) je to, co garant vidí – počítá se mezi věty obrazovky, které vyprávění smí popisovat */
    const r = { i, k, from: c.from, ch, page: s.page, role: s.role, mode: sh.mode, miss: sh.miss || [], eff, status, appendix: !!D.scenes[i].appendix, segs: segments(root).concat(status ? segments(parse('<p>' + status.replace(/[<&]/g, ' ') + '</p>')) : []) };
    r.narr = k ? authoredText(c.step, s.branches, s) : authoredText((D.tour.chapters[ch] || {}).intro, s.branches, s); /* co by vyprávění řeklo v režimu run (B1) */
    r.shown = [sh.t, sh.note, sh.co, sh.vsimni, sh.proc, sh.dusledek].map(v => String(v || '')).join(' ');
    r.kept = sh.mode === 'note' && sh.note ? [sh.co, sh.vsimni, sh.proc, sh.dusledek].map(v => String(v || '')).join(' ').trim() : ''; /* kontrola 4 (M2): vyprávění, které v režimu „note“ zůstává */
    if (full) r.txt = txt;
    /* T4: co panel opravdu ukazuje (název, „Co se děje“, „Čeho si všímat“) cituje jen to, co je na obrazovce */
    const shownQ = [sh.t, sh.note, sh.co, sh.vsimni].map(v => quotes(v)).reduce((a, b) => a.concat(b), []);
    const look = (k ? prevSeen + ' ' : '') + seen;
    r.badQ = ch === 'prolog' ? [] : shownQ.filter(q => !CITACE_VYJIMKY[q] && !names.has(q) && !quoteOnScreen(q, look));
    if (k) {
      const step = c.step, B = s.branches, sels = stepSels(step, B, s);
      r.regions = sels.map(sel => { const n = query(root, sel); return n ? { sel, txt: contentText(region(n)), segs: segments({ tag: '#root', attrs: {}, kids: region(n) }), ids: itemsInRegion(n, s.role), all: regionTags(n).tags.map(t => t.attrs['data-value']) } : { sel, txt: null, segs: [], ids: [], all: [] }; });
      r.inTarget = [].concat(...r.regions.map(x => x.ids));
      r.manualHits = Object.keys(manual).filter(id => { const m = manual[id]; return m && typeof m === 'object' && [].concat(m.ch).indexOf(ch) >= 0 && m.text && txt.indexOf(m.text) >= 0; });
      r.acts = (step.do || []).some(isActOp);
      const first = (step.do || []).filter(isActOp)[0];
      let fsel = null; try { fsel = first && first.sel ? valOf(first.sel, B, s) : null; } catch (err) { fsel = null; }
      r.actFound = !first || !first.sel || (prevRoot ? !!query(prevRoot, fsel) || !!query(root, fsel) : true);
      r.changed = c.from === k - 1 ? eff !== prevEff : true;
      r.failed = /Krok přeskočen|Krok ukázky selhal/.test(status);
      r.missQ = r.mode === 'skip' ? [] : authoredQuotes(step, B, s).filter(q => !CITACE_VYJIMKY[q] && !quoteOnScreen(q, look));
      /* kontrola 4 (M2): věty vyprávění kroku (pro generátor: které věty v režimu „note“ vynechat) a ty, které citují, co na obrazovce není */
      r.sents = [];
      if (D.sentencesOf && r.mode !== 'skip') ['co', 'vsimni', 'proc', 'dusledek'].forEach(f => { let v = ''; try { v = valOf(step[f], B, s); } catch (err) { v = ''; } D.sentencesOf(v).forEach(t => r.sents.push({ f, key: D.sentKey(t), text: t, bad: quotes(t).some(q => !CITACE_VYJIMKY[q] && !names.has(q) && !quoteOnScreen(q, look)) })); });
    }
    r.offered = D.offeredNow ? D.offeredNow(s) : [];
    r.finale = ch === 'trace' && k >= c.steps.length;
    recs.push(r);
    prevSeen = seen; prevEff = eff; prevRoot = root;
  });
  return recs;
}
/* Cíle nabídky z jednoho průchodu (stejné pravidlo jako computeSceneMap): scéna → položka → po kolika krocích. */
function targetsFromRecs(env, recs) {
  const { D, NF } = env, S = env.S(), out = D.scenes.map(() => ({}));
  const ok = id => { const r = NF.item(S, id); return r && r.scope !== 'provozni'; };
  recs.forEach(r => {
    if (!r.k || r.mode === 'skip') return; const t = out[r.i];
    r.inTarget.forEach(id => { if (t[id] == null && ok(id)) t[id] = r.k; });
    r.manualHits.forEach(id => { if (t[id] == null) t[id] = r.k; });
  });
  return out;
}
/* Závislost kroku na zamítnuté položce X proti schválenému průchodu: cíl kroku zmizel; obsah výřezu cíle se změnil a výřez nesl štítek X (změny čísel
   jinde vyprávění nevyvrací – to hlídají citace); zmizel text, který vyprávění cituje; nebo děj kroku neproběhl (obrazovka se nezměnila, akce selhala).
   Režim „skip“: cíl zmizel, akce nejde provést nebo nic nezměnila; jinak „note“ (krok proběhne, panel řekne, co chybí). */
/* Kontrola 3 (B1): krok závisí na X i tehdy, když vyprávění kroku popisuje (bez uvozovek) obsah, který po zamítnutí X z obrazovky zmizel – obrazovka
   po kroku i před ním (garant vidí obojí). implied = položky, které zamítnutí X vypne (průvodce ucinek.bezMista: R-POKYNY → pravidla I-*). */
function describesGone(b, r) {
  if (!b || !r || !r.narr || r.page === 'registry' || r.page === 'trace') return null; /* registr a stopa: vyprávění popisuje položky, ne obrazovku pacienta */
  for (let j = 0; j < (b.regions || []).length; j++) {
    const bt = b.regions[j], rt = (r.regions || [])[j]; if (!bt || bt.txt == null || !rt || rt.txt == null || bt.txt === rt.txt) continue;
    const g = describesLoose(r.narr, goneSegs(bt.segs, rt.segs), rt.segs); if (g) return g;
  }
  const gone = goneSegs(b.segs, r.segs);
  return gone.length ? describes(r.narr, gone, r.segs) : null;
}
function stepDependency(b, r, X, implied) {
  if (!b || !r || !r.k || r.mode === 'skip') return null;
  const quiet = p => p === 'registry' || p === 'trace', I = [X].concat(implied || []);
  let dep = false, gone = false;
  (b.regions || []).forEach((bt, j) => {
    const rt = (r.regions || [])[j]; if (bt.txt == null) return;
    if (!rt || rt.txt == null) { gone = true; dep = true; return; }
    if (bt.txt !== rt.txt && I.some(y => (bt.all || bt.ids).indexOf(y) >= 0) && (!quiet(b.page) || I.some(y => bt.ids.indexOf(y) >= 0))) dep = true;
  });
  if ((r.missQ || []).some(q => (b.missQ || []).indexOf(q) < 0)) dep = true;
  if (!dep && describesGone(b, r)) dep = true;
  const notDone = (b.acts && b.changed && !r.changed) || (r.failed && !b.failed);
  if (notDone) dep = true;
  if (!dep) return null;
  return gone || notDone || (b.acts && !r.actFound) ? 'skip' : 'note';
}

/* Kontrola 4 (M2): které věty vyprávění kroku v režimu „note“ vynechat – citují, co na obrazovce není, nebo popisují obsah, který po zamítnutí zmizel
   (celá obrazovka i výřez cíle). Zbytek jako celek musí projít stejnou kontrolou jako vyprávění v režimu „run“ (describesGone), jinak se vynechá všechno. */
function narrDrops(b, r) {
  if (!b || !r || !r.sents || !r.sents.length) return [];
  const drop = new Set(r.sents.filter(x => x.bad).map(x => x.key));
  const goneAll = goneSegs(b.segs, r.segs);
  const regs = (b.regions || []).map((bt, j) => { const rt = (r.regions || [])[j]; return bt && rt && bt.txt != null && rt.txt != null && bt.txt !== rt.txt ? { gone: goneSegs(bt.segs, rt.segs), rest: rt.segs } : null; }).filter(Boolean);
  r.sents.forEach(x => {
    if (drop.has(x.key)) return;
    if (goneAll.length && describes(x.text, goneAll, r.segs)) drop.add(x.key);
    else if (regs.some(g => g.gone.length && describesLoose(x.text, g.gone, g.rest))) drop.add(x.key);
  });
  /* zbytek jako celek: dokud popisuje zmizelý obsah, vynechá se věta, která s ním sdílí nejvíc významových slov */
  for (let guard = 0; guard < 30; guard++) {
    const left = r.sents.filter(x => !drop.has(x.key)); if (!left.length) break;
    const g = describesGone(b, Object.assign({}, r, { narr: left.map(x => x.text).join(' ') })); if (!g) break;
    const G = stems(g); let best = left[0], bn = -1;
    left.forEach(x => { const n = [...stems(x.text)].filter(w => G.has(w)).length; if (n > bn) { bn = n; best = x; } });
    drop.add(best.key);
  }
  return [...drop];
}
/* ---------- souběh: průchody v pracovních vláknech (kontrola 2) ---------- */
const WT = require('node:worker_threads');
function pool(tasks) {
  const n = Math.max(1, Math.min(tasks.length, Number(process.env.PRAVDIVOST_WORKERS) || Math.max(1, (require('node:os').availableParallelism ? require('node:os').availableParallelism() : require('node:os').cpus().length) - 1)));
  const results = new Array(tasks.length); let next = 0, done = 0;
  if (!tasks.length) return Promise.resolve(results);
  return new Promise((resolve, reject) => {
    const spawn = () => {
      if (next >= tasks.length) return;
      const idx = next++, w = new WT.Worker(__filename, { workerData: { nfTask: tasks[idx] } });
      w.once('message', m => { results[idx] = m; });
      w.once('error', reject);
      w.once('exit', code => { if (code !== 0 && results[idx] === undefined) { reject(new Error('pracovní vlákno skončilo kódem ' + code)); return; } done++; if (done === tasks.length) resolve(results); else spawn(); });
    };
    for (let k = 0; k < n; k++) spawn();
  });
}

/* Úvod scény (k = 0) závisí na X, když cituje text, který po zamítnutí na začátku scény chybí, nebo popisuje obsah, který po zamítnutí v celé scéně
   zmizel (kontrola 3, B1: úvody se zamítnutí přizpůsobují stejně jako kroky). bScene / rScene = záznamy scény ve schváleném a zamítnutém běhu. */
/* Úvod závisí jen tehdy, když zamítnutí scénu opravdu mění: některý krok scény je po zamítnutí „skip“ nebo „note“ (mapa závislostí v běhu),
   nebo celá scéna proběhne bez kroků. Pak úvod nesmí popisovat obsah, který ve scéně po zamítnutí není. */
function introDependency(bScene, rScene) {
  const b0 = bScene.filter(x => !x.k)[0], r0 = rScene.filter(x => !x.k)[0]; if (!b0 || !r0 || r0.mode !== 'intro') return null;
  if ((r0.badQ || []).some(q => (b0.badQ || []).indexOf(q) < 0)) return 'citace: ' + r0.badQ.join(' | ');
  const steps = rScene.filter(x => x.k), changed = steps.filter(x => x.mode === 'skip' || x.mode === 'note');
  if (!changed.length) return null;
  if (steps.length && steps.every(x => x.mode === 'skip')) return 'celá scéna přeskočena';
  const all = rs => { const s = new Set(); rs.forEach(x => (x.segs || []).forEach(t => s.add(t))); return [...s]; };
  const rAll = all(rScene), gone = goneSegs(all(bScene), rAll);
  return (gone.length && describes(r0.narr, gone, rAll)) || null; /* vrací důvod (zmizelý segment) */
}
module.exports = { ROOT, WIN, narrDrops, segments, stems, describes, describesLoose, goneSegs, describesGone, introDependency, regionTags, boot, effectText, contentText, parse, query, queryAll, region, itemsInRegion, tagDistances, textOf, screenText, norm, itemsIn, screenHtml, stepSels, stepsOf, walkStory, computeSceneMap, sceneItemsJs, variantWalk, targetsFromRecs, stepDependency, pool, quotes, quoteOnScreen };
if (!WT.isMainThread && WT.workerData && WT.workerData.nfTask) { WT.parentPort.postMessage(variantWalk(WT.workerData.nfTask)); return; }
if (require.main !== module) return;

/* ====================================================================================================================== */
/* ---------- testy ---------- */
const VERBOSE = !!process.env.VERBOSE;
let passed = 0, failed = 0; const fails = [], queue = [];
function test(name, fn) { if (process.env.ONLY && name.indexOf(process.env.ONLY) < 0) return; queue.push([name, fn]); }
const sceneName = (D, i) => (i + 1) + '. ' + (D.scenes[i].title || D.chapters[D.scenes[i].ch].title);
const keyOf = r => r.i + '.' + r.k;

/* Průchody se zamítnutím každé garantové položky zvlášť (a jeden schválený) – sdílené pro T1, T3 a T4; spočítají se jednou v pracovních vláknech. */
let runsP = null;
function runs() {
  if (runsP) return runsP;
  const env = boot(), only = process.env.T3_ITEMS ? process.env.T3_ITEMS.split(',') : null;
  const garant = env.NF.garantItems(env.S()).map(r => r.id).filter(id => !only || only.indexOf(id) >= 0);
  const t0 = Date.now();
  runsP = pool([{ rejected: [] }].concat(garant.map(id => ({ rejected: [id] })))).then(res => {
    if (VERBOSE) console.log('    průchody: ' + res.length + ' za ' + Math.round((Date.now() - t0) / 1000) + ' s');
    const out = { env, base: res[0], byItem: {} }; garant.forEach((id, k) => { out.byItem[id] = res[k + 1]; }); return out;
  });
  return runsP;
}

/* T1 – nabídka položky jen tam, kde je vidět (i ve stavu po zamítnutí každé položky zvlášť) */
function t1Problems(env, recs, label, self) {
  const { D, NF } = env, problems = [], manual = D.itemScene || {}, firstOffer = {};
  recs.forEach(r => {
    if (r.appendix) return;
    const chId = r.ch;
    r.offered.forEach(id => {
      if (firstOffer[id] || id === self) return; firstOffer[id] = sceneName(D, r.i) + ' krok ' + r.k; /* zamítnutá položka sama se nabízí jako ve schváleném běhu (garant ji zamítl až tam) */
      const m = manual[id];
      if (m && typeof m === 'object' && m.step && [].concat(m.ch).indexOf(chId) >= 0 && r.k < m.step) problems.push(label + id + ': D.itemScene { step: ' + m.step + ' }, ale nabídnuta už ve scéně ' + sceneName(D, r.i) + ', krok ' + r.k);
      if (r.finale) return; /* souhrn na konci: položky, které příběh neukazuje */
      if (r.k && r.mode !== 'skip' && (r.inTarget.indexOf(id) >= 0 || r.manualHits.indexOf(id) >= 0)) return;
      problems.push(label + id + ': nabídnuta ve scéně ' + sceneName(D, r.i) + ', krok ' + r.k + (r.mode === 'skip' ? ' (přeskočený úsek)' : '') + ', ale štítek není ve výřezu cíle ani na výšku okna od cíle' + (m ? ' [D.itemScene]' : ''));
    });
  });
  return { problems, firstOffer };
}
test('T1 položka se ke schválení nabízí jen v kroku, kde je její štítek ve výřezu cíle a na výšku okna od cíle – ve schváleném běhu i při zamítnutí každé položky', async () => {
  const { env, base, byItem } = await runs(), { D, NF } = env, problems = [];
  const manual = D.itemScene || {}, garant = NF.garantItems(env.S()).map(r => r.id);
  if (!(D.sceneItems || []).some(x => x.targets)) problems.push('demo/scene-items.js nemá „targets“ – spusťte navrhy-designu/04-pohledy-2026-10-05/scene-items.cjs');
  const b = t1Problems(env, base, '');
  problems.push(...b.problems);
  garant.forEach(id => { if (!b.firstOffer[id]) problems.push(id + ': v hlavní linii se nikde nenabídne'); });
  Object.keys(byItem).forEach(X => problems.push(...t1Problems(env, byItem[X], '[zamítnuto ' + X + '] ', X).problems));
  Object.keys(manual).forEach(id => { const m = manual[id]; if (!m || typeof m !== 'object' || !m.ch) problems.push('D.itemScene[' + id + ']: čekám { ch }, { ch, text } nebo { ch, step }'); else if (m.step != null && !(Number.isInteger(m.step) && m.step > 0)) problems.push('D.itemScene[' + id + ']: step musí být kladné celé číslo'); else if ([].concat(m.ch).some(c => D.indexOf(c) < 0)) problems.push('D.itemScene[' + id + ']: neznámá kapitola ' + m.ch); });
  if (VERBOSE) console.log('    první nabídka:', JSON.stringify(b.firstOffer, null, 1));
  return problems;
});

/* T2 – „V příběhu“ a „Kde je použita“ podle mapy scén */
const PAGE_WORDS = { enroll: /zařazení/i, review: /kontrol/i, training: /zaučení/i, today: /\bDnes\b/, meal: /před jídlem|krok [123]|zpětn/i, foods: /jídel|Jídla|karta jídla|karty jídel/, food: /karta jídla|karty jídel|detail jídla|karta jídla/i, plan: /Plán|plánu/, safety: /Bezpečí/, preview: /report před kontrolou|přehled před kontrolou|před kontrolou/i, takeover: /převzetí/i, understand: /převzetí/i, newplan: /nový plán|převzetí|nového plánu/i, registry: /registr/i, trace: /stop/i, importPage: /Nahrát export|export/i };
test('T2 „V příběhu“ a „Kde je použita“ odpovídají mapě scén; mapa odpovídá příběhu; mapa závislostí ukazuje na existující kroky a položky', () => {
  const env = boot(), { D, NF, S } = env, problems = [];
  const fresh = computeSceneMap(boot());
  const have = D.sceneItems || [];
  if (have.length !== fresh.length) problems.push('demo/scene-items.js má ' + have.length + ' scén, příběh ' + fresh.length + ' – spusťte generátor');
  fresh.forEach((o, i) => {
    const h = have[i] || { items: [], targets: {} }, a = [...o.items].sort().join(','), b = [...(h.items || [])].sort().join(',');
    if (a !== b) problems.push('mapa, scéna ' + (i + 1) + ': items v souboru [' + b + '] ≠ příběh [' + a + '] – spusťte generátor');
    if (JSON.stringify(Object.entries(o.targets).sort()) !== JSON.stringify(Object.entries(h.targets || {}).sort())) problems.push('mapa, scéna ' + (i + 1) + ': targets v souboru ' + JSON.stringify(h.targets || {}) + ' ≠ příběh ' + JSON.stringify(o.targets) + ' – spusťte generátor');
    /* deps a alt: kroky a položky existují */
    const n = D.tour.stepsFor(D.chapters[D.scenes[i].ch].id, Object.assign({}, D.defaults, D.scenes[i].B)).length;
    Object.keys(h.deps || {}).forEach(k => { if (!(Number(k) >= 0 && Number(k) <= n)) problems.push('mapa, scéna ' + (i + 1) + ': deps pro krok ' + k + ', scéna má ' + n + ' kroků – spusťte generátor'); Object.keys(h.deps[k]).forEach(id => { if (!NF.item(S(), id)) problems.push('mapa, scéna ' + (i + 1) + ': deps s neznámou položkou ' + id); if (['skip', 'note'].indexOf(h.deps[k][id]) < 0) problems.push('mapa, scéna ' + (i + 1) + ': deps ' + id + ' = ' + h.deps[k][id]); }); });
    Object.keys(h.alt || {}).forEach(id => { if (!NF.item(S(), id)) problems.push('mapa, scéna ' + (i + 1) + ': alt s neznámou položkou ' + id); });
  });
  /* „V příběhu“ (NF.slots.itemWhere) = scény z mapy (vzestupně) a scéna rozhodnutí označená „(rozhodujete zde)“ */
  const s = S(), garant = NF.garantItems(s).map(r => r.id);
  for (const id of garant) {
    const where = String(NF.slots.itemWhere ? NF.slots.itemWhere(s, id) : '');
    const listed = [...where.matchAll(/data-action="goSceneFrom" data-value="(\d+):/g)].map(m => Number(m[1]));
    const expect = have.map((x, i) => ((x.items || []).indexOf(id) >= 0 || (x.targets || {})[id] != null) ? i : -1).filter(i => i >= 0);
    const dec = D.scenes.map((x, i) => i).filter(i => D.decisionItems(i).indexOf(id) >= 0)[0];
    if (dec != null && expect.indexOf(dec) < 0) expect.push(dec);
    expect.sort((x, y) => x - y);
    if (listed.join(',') !== expect.join(',')) problems.push(id + ': „V příběhu“ ukazuje scény [' + listed.map(x => x + 1) + '], mapa říká [' + expect.map(x => x + 1) + ']');
    if (listed.slice().sort((x, y) => x - y).join(',') !== listed.join(',')) problems.push(id + ': „V příběhu“ není seřazené vzestupně');
    if (dec != null && !new RegExp('data-value="' + dec + ':' + id + '"[^>]*>[^<]*\\(rozhodujete zde').test(where)) problems.push(id + ': „V příběhu“ neoznačuje scénu rozhodnutí ' + (dec + 1) + ' „(rozhodujete zde)“');
    /* „Kde je použita“ (průvodce + „V aplikaci“) jmenuje každou obrazovku, kde je položka ve výřezu cíle */
    const r = NF.item(s, id), kde = ((r.guide && r.guide.kde) || '') + ' ' + (r.usedBy || '');
    fresh.forEach((x, i) => {
      if (D.scenes[i].appendix || x.targets[id] == null) return;
      const page = x.pages[id], words = PAGE_WORDS[page];
      if (words && !words.test(kde)) problems.push(id + ': ve scéně ' + sceneName(D, i) + ' je ve výřezu cíle (obrazovka „' + (D.pageNames[page] || page) + '“), „Kde je použita“ ji nejmenuje');
    });
  }
  return problems;
});

/* T3 – zamítnutí má na obrazovce účinek popsaný v průvodci: ve kterých scénách (dopadSceny) a jakým obsahem (strojový popis `ucinek` v demo/guide.js, kontrola 2):
     ucinek: { druh: 'vypne' | 'nesouhlas', ukaze: 'off' | 'nesouhlas' | null,
               sceny: { idKapitoly: { zmizi: [text], zustane: [text], oznameni: true } }, bezMista: [ID] }
   zmizi = ve schváleném běhu kapitoly na obrazovce a po zamítnutí v žádném jejím kroku; zustane = po zamítnutí v kapitole být musí (bezpečnost, nesouhlas);
   oznameni = v kapitole je oznámení o zamítnutí; kapitoly s obsahem patří do dopadSceny. */
function ucinekOf(env, id) { const { D } = env; if (D.ucinek) return D.ucinek(id); const g = (D.guide && D.guide[id]) || (D.guideRaw && D.guideRaw[id]) || {}; return g.ucinek || null; }
test('T3 zamítnutí každé garantové položky změní obrazovku právě ve scénách z průvodce a obsahem, který popisuje strojový „ucinek“', async () => {
  const { env, base, byItem } = await runs(), { D } = env, problems = [], pending = [];
  const bmap = new Map(base.map(r => [keyOf(r), r]));
  const main = rs => rs.filter(r => !r.appendix && r.page !== 'registry' && r.page !== 'trace');
  for (const id of Object.keys(byItem)) {
    const g = (D.guideRaw && D.guideRaw[id]) || {}, declared = g.dopadSceny, u = ucinekOf(env, id);
    if (!Array.isArray(declared)) { problems.push(id + ': průvodce nemá pole dopadSceny'); continue; }
    const rej = main(byItem[id]), seenKeys = new Set(), actual = new Set(), where = {};
    rej.forEach(v => { seenKeys.add(keyOf(v)); const b = bmap.get(keyOf(v)); if (!b || b.eff !== v.eff) { actual.add(v.ch); if (!where[v.ch]) where[v.ch] = keyOf(v); } });
    main(base).forEach(b => { if (!seenKeys.has(keyOf(b))) { actual.add(b.ch); if (!where[b.ch]) where[b.ch] = keyOf(b) + ' přeskočen'; } }); /* krok, který se po zamítnutí přeskočí, je také změna */
    const want = new Set(declared), miss = [...want].filter(x => !actual.has(x)), extra = [...actual].filter(x => !want.has(x));
    if (miss.length) problems.push(id + ': průvodce slibuje účinek ve scénách [' + miss + '], obrazovka se tam nezmění');
    if (extra.length) problems.push(id + ': zamítnutí změní i scény [' + extra.map(x => x + ' (' + where[x] + ')') + '], které průvodce neuvádí');
    const dopad = String(g.dopad || '');
    if (!declared.length && !/nic nevypne|nic se nezmění|nic nezmění/.test(dopad)) problems.push(id + ': zamítnutí obrazovku nezmění, „Co se stane“ to musí říct („nic nevypne“)');
    if (declared.length && /nic nevypne|nic se nezmění/.test(dopad)) problems.push(id + ': „Co se stane“ tvrdí, že se nic nezmění, ale dopadSceny jsou [' + declared + ']');
    if (declared.length && dopad.length < 40) problems.push(id + ': „Co se stane při zamítnutí“ je příliš krátké');
    if (!u) { pending.push(id); continue; }
    if (u.druh === 'nesouhlas' && !/záznam nesouhlasu/.test(dopad)) problems.push(id + ': ucinek.druh „nesouhlas“, ale „Co se stane“ to neříká („záznam nesouhlasu“)');
    /* obsahem po kapitolách */
    const low = t => norm(t).toLowerCase();
    Object.keys(u.sceny || {}).forEach(ch => {
      const c = u.sceny[ch] || {}, bTxt = low(main(base).filter(r => r.ch === ch).map(r => r.eff).join(' ')), rS = rej.filter(r => r.ch === ch), rTxt = low(rS.map(r => r.eff).join(' '));
      if (declared.indexOf(ch) < 0) problems.push(id + ': ucinek.sceny.' + ch + ' není v dopadSceny');
      (c.zmizi || []).forEach(t => { if (bTxt.indexOf(low(t)) < 0) problems.push(id + ' / ' + ch + ': zmizi „' + t + '“ ve schváleném běhu na obrazovce není'); else if (rS.some(r => low(r.eff).indexOf(low(t)) >= 0)) problems.push(id + ' / ' + ch + ': zmizi „' + t + '“ po zamítnutí na obrazovce zůstává'); });
      (c.zustane || []).forEach(t => { if (rTxt.indexOf(low(t)) < 0) problems.push(id + ' / ' + ch + ': zustane „' + t + '“ zamítnutí odstraní'); });
      if (c.oznameni && rTxt.indexOf(low('[OFF ' + id + ']')) < 0) problems.push(id + ' / ' + ch + ': po zamítnutí chybí oznámení na místě');
    });
  }
  if (pending.length) console.log('    T3: strojový popis „ucinek“ chybí u ' + pending.length + ' položek (kontroluje se jen seznam scén): ' + pending.join(', '));
  return problems;
});

/* T4 – vyprávění cituje jen to, co je na obrazovce, a netvrdí děj, který neproběhl – ve schváleném běhu i při zamítnutí každé položky zvlášť */
function t4Problems(env, base, recs, label) {
  const { D } = env, problems = [], bmap = base ? new Map(base.map(r => [keyOf(r), r])) : null;
  recs.forEach(r => {
    const where = label + sceneName(D, r.i) + ', ' + (r.k ? 'krok ' + r.k : 'úvod');
    r.badQ.forEach(q => problems.push(where + ': „' + q + '“ na obrazovce není' + (r.mode && r.mode !== 'run' && r.mode !== 'intro' ? ' (' + r.mode + ')' : '')));
    if (!bmap || !r.k) return;
    const b = bmap.get(keyOf(r)); if (!b) return;
    /* kontrola 4 (M2): v režimu „note“ zůstává vyprávění kroku – nesmí popisovat, co po zamítnutí na obrazovce není */
    if (r.mode === 'note' && r.kept) { const g = describesGone(b, Object.assign({}, r, { narr: r.kept })); if (g) problems.push(where + ': vyprávění v režimu „note“ popisuje „' + g.slice(0, 90) + '“, co po zamítnutí na obrazovce není (spusťte generátor)'); }
    if (r.mode !== 'run') return;
    { const g = describesGone(b, r); if (g) problems.push(where + ': vyprávění popisuje „' + g.slice(0, 90) + '“, co po zamítnutí na obrazovce není (spusťte generátor)'); } /* B1 (kontrola 3) */
    if (b.acts && b.changed && !r.changed) problems.push(where + ': vyprávění popisuje děj, ale obrazovka se nezměnila (krok měl být přeskočen – spusťte generátor)');
    if (r.failed && !b.failed) problems.push(where + ': akce kroku selhala („' + r.status + '“), vyprávění přesto běží');
    (b.regions || []).forEach((bt, j) => { const rt = (r.regions || [])[j]; if (bt.txt != null && (!rt || rt.txt == null)) problems.push(where + ': cíl kroku „' + bt.sel + '“ na obrazovce není'); });
  });
  return problems;
}
test('T4 vyprávění necituje text, který na obrazovce není, a netvrdí děj, který neproběhl – i při zamítnutí každé položky zvlášť', async () => {
  const { env, base, byItem } = await runs(), problems = [], { D } = env;
  problems.push(...t4Problems(env, null, base, ''));
  Object.keys(byItem).forEach(X => {
    problems.push(...t4Problems(env, base, byItem[X], '[zamítnuto ' + X + '] '));
    /* B1 (kontrola 3): úvod scény se zamítnutí přizpůsobí – nepopisuje obsah, který po zamítnutí ve scéně není */
    D.scenes.forEach((sc, i) => { const bs = base.filter(r => r.i === i), rs = byItem[X].filter(r => r.i === i); if (introDependency(bs, rs)) problems.push('[zamítnuto ' + X + '] ' + sceneName(D, i) + ', úvod: popisuje obsah, který po zamítnutí ve scéně není (spusťte generátor)'); });
  });
  return problems;
});

(async () => {
  for (const [name, fn] of queue) {
    const t0 = Date.now();
    try { const problems = (await fn()) || []; if (problems.length) throw new Error(problems.length + ' nálezů:\n      ' + (VERBOSE ? problems : problems.slice(0, 40)).join('\n      ') + (!VERBOSE && problems.length > 40 ? '\n      … a dalších ' + (problems.length - 40) + ' (VERBOSE=1)' : '')); console.log('OK  ', name, '(' + Math.round((Date.now() - t0) / 1000) + ' s)'); passed++; }
    catch (err) { console.error('FAIL', name, '—', err.message); failed++; fails.push(name); }
  }
  console.log('\n' + passed + ' prošlo, ' + failed + ' selhalo' + (fails.length ? ': ' + fails.join(' | ') : ''));
  process.exitCode = failed ? 1 : 0;
})();
