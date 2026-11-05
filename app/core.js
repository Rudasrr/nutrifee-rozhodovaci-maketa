/* NutriFee – jádro aplikace (doména). Podle 15-ZDROJ-PRAVDY-MAKETA.md.
   Žádná modelová data, žádné texty prezentace; ty jsou ve složce demo/ a jsou odstranitelné.

   Aplikace se učí z pacientových zápisů, jak jeho tělo reaguje na jídla, před jídlem radí
   (porce k obvyklé, doplněk, pořadí, pohyb), připomíná předepsaný inzulin a ptá se na podání.
   Dávku nikdy nepočítá ani nemění. Lékaři na kontrole předkládá návrhy s důvodem a postupem.
   Každý výpočet a rada pochází z položky schvalovacího registru. */
(function (global) {
'use strict';

var NF = global.NutriFee = global.NutriFee || {};

/* Číslo verze uloženého stavu. Po každé změně struktury se zvýší; musí souhlasit s ?v= v HTML. */
NF.SCHEMA = 84;
NF.PAGES = ['today', 'foods', 'food', 'plan', 'safety', 'support', 'preview', 'meal', 'takeover', 'understand', 'newplan', 'enroll', 'review', 'registry', 'trace', 'training'];
NF.STORAGE = 'nutrifee-maketa';
/* C8 (31/03): produkční sestavení (bez prezentační vrstvy) má vlastní klíč úložiště, aby na stejném původu neotevřelo rozehraný příběh ukázky.
   Přepne ho NF.boot po načtení všech skriptů, když prezentační vrstva chybí. */
NF.STORAGE_APP = 'nutrifee';
var MONTHS = ['ledna','února','března','dubna','května','června','července','srpna','září','října','listopadu','prosince'];
var DAYS = ['neděle','pondělí','úterý','středa','čtvrtek','pátek','sobota'];

/* ---------- pomůcky ---------- */
NF.clone = function (x) { return JSON.parse(JSON.stringify(x)); };
NF.esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};
var seq = 0;
NF.uid = function (p) { seq += 1; return (p || 'id') + '-' + seq; };
NF.resetUid = function () { seq = 0; };
/* A2 (31/03): počítadlo ID je jen v paměti; po načtení uloženého stavu (F5) pokračuje za nejvyšším číslem, které ve stavu už je
   (zápisy E-n, návyky H-n, sledování W-n, otázky Q-n, jídla F-n). Starší uložený stav bez počítadla tím zůstává použitelný a nová ID se neopakují. */
NF.syncUid = function (state) {
  var max = 0;
  try { String(JSON.stringify(state)).replace(/"[A-Z][A-Za-z]?-(\d+)"/g, function (m, n) { n = Number(n); if (n > max && n < 1e9) max = n; return m; }); } catch (err) { max = 0; }
  if (max > seq) seq = max;
  return seq;
};
/* A3 (31/03): zdroj času. Jádro bere skutečný čas zařízení; prezentační vrstva (příběh s modelovými dny) nastaví NF.clockModel = true a hodiny řídí sama.
   Čas se obnoví před každou akcí a po ní (ui.js) a jednou za minutu; nikdy se nevrací zpět. */
NF.clockModel = false;
NF.now = function () { return localIso(new Date()); };
NF.tick = function (S) { if (NF.clockModel || !S) return S && S.clock; var n = NF.now(); if (!NF.validIso(S.clock) || n > S.clock) S.clock = n; return S.clock; };
NF.parse = function (iso) { return new Date(iso); };
NF.day = function (iso) { return String(iso).slice(0, 10); };
NF.fmtDate = function (iso) { if (!iso) return '–'; var d = NF.parse(iso); return d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); };
NF.fmtDayDate = function (iso) { if (!iso) return '–'; var d = NF.parse(iso); return DAYS[d.getDay()] + ' ' + d.getDate() + '. ' + MONTHS[d.getMonth()]; };
NF.fmtDM = function (iso) { if (!iso) return '–'; var d = NF.parse(iso); return d.getDate() + '. ' + (d.getMonth() + 1) + '.'; }; /* „16. 10.“ (A1, 27. 10. 2026) */
NF.fmtShort = function (iso) { if (!iso) return '–'; var d = NF.parse(iso); return d.getDate() + '. ' + (d.getMonth() + 1) + '. ' + d.getFullYear(); };
NF.fmtTime = function (iso) { if (!iso) return '–'; var d = NF.parse(iso); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }; /* datový formát HH:MM (zápis inzulinu) */
NF.fmtClock = function (iso) { if (!iso) return '–'; var d = NF.parse(iso); return d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2); }; /* zobrazení času podle sazby: „7:05“, ne „07:05“ (21. 10. 2026) */
NF.fmtDateTime = function (iso) { return iso ? NF.fmtShort(iso) + ' ' + NF.fmtClock(iso) : '–'; };
function localIso(d) {
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}
/* Neplatný výsledek (nesmyslný posun, poškozené datum) nevrací „NaN-NaN“: zůstane původní hodnota (robustnost 23. 10. 2026, #11). */
NF.addDays = function (iso, n) { var d = NF.parse(iso); d.setDate(d.getDate() + n); return isNaN(d.getTime()) || Math.abs(d.getFullYear()) > 9999 ? iso : localIso(d); };
NF.addMin = function (iso, n) { var d = NF.parse(iso); d.setMinutes(d.getMinutes() + n); return isNaN(d.getTime()) || Math.abs(d.getFullYear()) > 9999 ? iso : localIso(d); };
/* Celé číslo z hodnoty akce (robustnost #3): nečíselná nebo necelá hodnota vrací fallback; výsledek v mezích lo–hi. */
NF.int = function (v, lo, hi, fallback) { var n = typeof v === 'number' ? v : (v == null || String(v).trim() === '' ? NaN : Number(v)); if (!Number.isFinite(n) || Math.round(n) !== n) return fallback; return Math.max(lo, Math.min(hi, n)); };
NF.validIso = function (s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s) && !isNaN(NF.parse(s).getTime()); };
/* Rozdíl kalendářních dnů (b − a) podle místního data; nezávisí na hodině ani na změně času (P2, 6. 10. 2026). */
NF.daysBetween = function (a, b) {
  var da = NF.parse(a), db = NF.parse(b);
  var ua = Date.UTC(da.getFullYear(), da.getMonth(), da.getDate()), ub = Date.UTC(db.getFullYear(), db.getMonth(), db.getDate());
  return Math.round((ub - ua) / 86400000);
};
NF.mmol = function (v) { return v == null ? '–' : String(Math.round(v * 10) / 10).replace('.', ','); };
NF.pct = function (a, b) { return b ? Math.round(a / b * 100) : null; };
NF.median = function (list) {
  var a = list.filter(function (x) { return x != null; }).slice().sort(function (x, y) { return x - y; });
  if (!a.length) return null;
  var m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
};
NF.quantile = function (list, q) {
  var a = list.filter(function (x) { return x != null; }).slice().sort(function (x, y) { return x - y; });
  if (!a.length) return null;
  var pos = (a.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return a[lo] + (a[hi] - a[lo]) * (pos - lo);
};
/* Typografie při vykreslení (D11, 6. 10. 2026): nezlomitelná mezera mezi číslem a jednotkou („8 j.“, „10,0 mmol/l“, „70 %“, „15 min“),
   v datech („5. 10. 2026“, „5. října“) a za jednopísmennou předložkou. Mění jen text mezi značkami, ne atributy. */
NF.nbspText = function (t) {
  var N = ' ';
  return String(t)
    /* 1) číslo + jednotka nebo značka */
    .replace(/(\d)[ ](?=(?:j\.|j\b|mmol\/l|mmol\/mol|%|‰|min\b|h\b|g\b|dl\b|ml\b|l\b|kg\b|×))/g, '$1' + N)
    /* 1b) číslo + počítané podstatné jméno, které se na telefonu láme nejčastěji (\b nezná česká písmena, konec slova hlídá lookahead) */
    .replace(/(\d)[ ](?=(?:dn[iíy]|den|minut[ay]?|hodin[ay]?|zápis[a-zů]*|jídl[a-zů]*|nocí?|týdn[a-zů]*|bod[a-zů]*)(?![a-záčďéěíňóřšťúůýž]))/g, '$1' + N)
    /* 2) datum: všechny mezery v „5. 10. 2026“ a „13. října“ */
    .replace(/(\b\d{1,2}\.)[ ](?=\d{1,2}\.|\d{4}\b|[a-záčďéěíňóřšťúůýž]{3,})/g, '$1' + N)
    /* 3) „3 z 4“, „11× ze 21“ drží pohromadě */
    .replace(/(\d×?)[ ](ze?)[ ](?=\d)/g, '$1' + N + '$2' + N)
    /* 4) jednopísmenné předložky a spojky včetně a, i (i v řetězci „a v cíli“ a na konci uzlu) */
    .replace(/(?<=^|[\s(„–·\/ ])([aikosuvzAIKOSUVZ])[ ](?=\S|$)/g, '$1' + N)
    /* 5) česká pomlčka s mezerami, před ní nezlomitelná mezera (rozsahy bez mezer se nemění) */
    .replace(/[  ][—–][ ]/g, N + '– ')
    /* 6) oddělovač „·“ a šipka „→“ nikdy na začátku řádku */
    .replace(/ (?=[·→])/g, N)
    /* 7) dvoupísmenné předložky před číslem: „ze 3“, „ve 21:00“, „do 10,0“, „pod 4“ */
    .replace(/(?<=^|[\s(„])(ze|ve|ke|do|od|po|za|na|pod|nad|Ze|Ve|Ke|Do|Od|Po|Za|Na|Pod|Nad)[ ](?=\d)/g, '$1' + N)
    /* 8) zkratky a rovnítko */
    .replace(/\b(např|tj|tzn|vs)\.[ ]/g, '$1.' + N)
    .replace(/(\b[nN])[ ]=[ ](?=\d)/g, '$1' + N + '=' + N);
};
/* „z“, nebo „ze“ před číslem podle výslovnosti (ze 2, 3, 4, 7, 17, 100–199). */
NF.z = function (n) { return /^(2|3|4|7|14|17|4\d|1\d\d|[2347]\d\d)$/.test(String(n)) ? 'ze' : 'z'; }; /* 23. 10. 2026: + 14, 40–49 (ze čtrnácti, ze čtyřiceti) */
NF.ve = function (hhmm) { var h = Number(String(hhmm).split(':')[0]); return [2, 3, 4, 12, 20, 21, 22, 23, 24].indexOf(h) >= 0 ? 've' : 'v'; }; /* „v 18:00“ / „ve 20:00“ podle výslovnosti */
NF.cap = function (s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); };
NF.nbsp = function (html) { return String(html).replace(/(\d<\/(?:b|strong)>)[ ](mmol\/l|j\.|%)/g, '$1 $2').replace(/>([^<]+)</g, function (_, t) { return '>' + NF.nbspText(t) + '<'; }); };
NF.r1 = function (v) { return v == null ? null : Math.round(v * 10) / 10; };
NF.plural = function (n, one, few, many) { return n + ' ' + (n === 1 ? one : n >= 2 && n <= 4 ? few : many); };

/* ---------- výchozí prázdný stav ----------
   Bez demonstrační vrstvy startuje aplikace prázdná: žádný registr, žádná jídla, žádný plán.
   Bez schválené položky registru nic nevyhodnocuje ani neradí. */
NF.createState = function () {
  return {
    schema: NF.SCHEMA,
    role: 'patient', page: 'today',
    clock: '2026-10-05T09:00:00',
    patient: { id: 'DEMO-P01', label: 'Pacient' }, /* modelové role bez jména (A28, 27. 10. 2026) */
    doctor: { id: 'DEMO-L01', label: 'Modelový lékař 01 (garant)' },
    nurse: { id: 'DEMO-S01', label: 'Modelová sestra 01' },
    registry: { items: [], history: [] },
    foods: [],
    plans: [], activePlanId: null,
    habits: [],
    episodes: [],
    basalLog: [],
    nights: [],
    sensorSummary: null, hypoWatch: [],
    enrollment: { eligible: false, criteria: {}, baseline: { tir: null, below: null } }, /* výchozí hodnoty ze senzoru před plánem (23. 10. 2026) */
    training: { result: null, steps: {}, previewPage: null },
    reminders: null, /* připomínky v telefonu: časy vybrané se sestrou při zaučení, vypnuté klíče (kontrola 4, bod 4); null = výchozí z S-PRIPOMINKY */
    nurseCheck: null, /* sestra před lékařem na kontrole: body, které nejdou ověřit z dat, a léky mimo inzulin (kontrola 4, bod 7) */
    onboarding: { checkAnswer: null },
    support: { issue: null, text: '', sent: false }, /* kontaktní formulář technické podpory (23. 10. 2026) */
    draft: null,
    meal: null,
    illness: null, illnessLog: [],
    review: null,
    questions: [],
    participation: 'active',
    fb: { resultSeen: {}, milestones: [], weeksSeen: {} },
    events: [],
    wizardStep: 0,
    toast: '', error: ''
  };
};

/* ---------- katalogy jádra (app/data/, 18. 10. 2026) ----------
   Registr, jídla, návyky a pokyny jsou součást jádra; produkční sestavení bez demo/ je dostane také. Stav „schváleno“ u položek je výchozí
   podoba registru pro ukázku a pro předání; ostrý provoz ho nahradí skutečným rozhodnutím garanta (historie zůstává stejná). */
NF.registryItems = function (at, by) {
  if (!NF.data || !NF.data.registry) return [];
  return NF.data.registry().map(function (o) { o.status = 'approved'; o.decidedAt = o.scope === 'provozni' ? null : at; o.decidedBy = o.scope === 'provozni' ? null : by; o.params = o.params || {}; if (o.guide === undefined) o.guide = null; return o; });
};
NF.seedRegistry = function (S, at, by) { S.registry = { items: NF.registryItems(at || S.clock, by || S.doctor.id), history: [] }; };
NF.seed = function (S, at, by) { NF.seedRegistry(S, at, by); S.foods = NF.data && NF.data.foods ? NF.data.foods() : []; };
/* Otisk znění položky (kontrola 4, bod 1, rozhodnutí vlastníka 30. 10. 2026): čistá deterministická funkce nad zněním (název, souhrn, detail, text, texty, seznamy, postupy),
   parametry (hodnoty i jejich české názvy) a textem průvodce „Co schvalujete“. Stav, poznámka, čas a verze do otisku nepatří – verze se ukládá zvlášť.
   Stejný vstup dá vždy stejný řetězec „fp-“ + 16 šestnáctkových znaků (dvě 32bitové funkce FNV-1a nad kanonickým JSON se seřazenými klíči). Bez sítě a bez stavu aplikace. */
NF.canonJson = function (x) {
  if (x === undefined || typeof x === 'function') return 'null';
  if (x === null || typeof x !== 'object') return JSON.stringify(x);
  if (Array.isArray(x)) return '[' + x.map(NF.canonJson).join(',') + ']';
  return '{' + Object.keys(x).sort().filter(function (k) { return x[k] !== undefined && typeof x[k] !== 'function'; }).map(function (k) { return JSON.stringify(k) + ':' + NF.canonJson(x[k]); }).join(',') + '}';
};
NF.FINGERPRINT_KEYS = ['id', 'scope', 'cat', 'title', 'summary', 'detail', 'text', 'texts', 'lists', 'postup', 'sestra', 'params', 'labels'];
NF.itemFingerprint = function (item, guideEntry) {
  var r = item || {}, body = {};
  NF.FINGERPRINT_KEYS.forEach(function (k) { if (r[k] !== undefined && r[k] !== null) body[k] = r[k]; });
  var co = guideEntry && guideEntry.co != null ? String(guideEntry.co) : null; /* průvodce dosazuje parametry přes getter, čte se jako řetězec */
  var s = NF.canonJson({ item: body, co: co });
  var h1 = 0x811c9dc5, h2 = 0x01000193 ^ 0x5bd1e995;
  for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); h1 ^= c; h1 = Math.imul(h1, 0x01000193) >>> 0; h2 ^= (c * 31 + i) & 0xffff; h2 = Math.imul(h2, 0x01000193) >>> 0; }
  var hex = function (n) { return ('0000000' + (n >>> 0).toString(16)).slice(-8); };
  return 'fp-' + hex(h1) + hex(h2);
};
/* Položky, o kterých rozhoduje lékař-garant. Provozní položky (scope 'provozni') neschvaluje nikdo (rozhodnutí vlastníka 27. 10. 2026, Q1): nemají stav ani štítek,
   nepočítají se do „zbývá“, souhrnu ani výsledků; v registru jsou jen jako popis pravidla aplikace. */
NF.garantItems = function (S) { return S.registry.items.filter(function (r) { return r.scope !== 'provozni'; }); };
NF.habitCatalog = function () { return (NF.data && NF.data.habits) || []; };
NF.instructionCatalog = function () { return (NF.data && NF.data.instructions) || []; };
/* Pokyny jsou součást plánu automaticky (rozhodnutí vlastníka 21. 10. 2026): každý pokyn je položka registru schválená garantem při vývoji,
   výchozí hodnota je parametr položky (`v`), lékař podepisuje plán jako celek a hodnotu mění jen výjimečně. Zamítnutý pokyn do plánu nejde. */
NF.instructionDefaults = function (S) {
  return { 'I-MENE': NF.param(S, 'I-MENE', 'v', 60), 'I-NEVIM': NF.param(S, 'I-NEVIM', 'v', 60), 'I-NEMOC-BAZAL': NF.param(S, 'I-NEMOC-BAZAL', 'v', 3), 'I-NEMOC-JIDLO': NF.param(S, 'I-NEMOC-JIDLO', 'v', 15), 'I-VYSOKA': NF.param(S, 'I-VYSOKA', 'v', 15) };
};
/* Hodnota pokynu v mezích katalogu (min, max; robustnost #10): tlačítkem ani poškozenou hodnotou nejde mimo. */
NF.instrClamp = function (c, v) { v = Number(v); var lo = c.min != null ? c.min : 0, hi = c.max != null ? c.max : 1000; if (!Number.isFinite(v)) v = typeof c.value === 'number' ? c.value : lo; return Math.round(Math.max(lo, Math.min(hi, v)) * 10) / 10; };
NF.instructionValue = function (S, c) { var d = NF.instructionDefaults(S); return c.fixed || typeof c.value !== 'number' ? c.value : (d[c.id] != null ? d[c.id] : c.value); };
/* Text pravidla s dosazenou hodnotou (tučně, s jednotkou) na každém místě {v} – I-HYPO má hranici ve větě víckrát (kontrola 2, A6, 29. 10. 2026). */
NF.instrHtml = function (c, value) { var v = '<b>' + NF.esc(String(value).replace('.', ',')) + (c && c.unit ? ' ' + NF.esc(c.unit) : '') + '</b>'; return String((c && c.text) || '').replace(/\{v\}/g, v); };
/* Kontrola 4 (02 B6, 30. 10. 2026): text, který odkazuje na jiné bezpečnostní pravidlo, se na chybějící pravidlo neodkazuje. Věta, která jmenuje pravidlo
   k nízké glukóze nebo „Méně jídla než obvykle“, se vynechá, když pravidlo v plánu není (zamítnutá R-POKYNY nebo dané pravidlo); u I-NEVIM se z odkazu
   „k vysoké nebo nízké glukóze“ vynechá jen chybějící část (katalog: odkazy). Nic se nepřidává ani nepřepisuje – jen se vynechá odkaz. */
NF.RULE_SENTENCE = { 'I-HYPO': /\s*[^.;]*(?:podle pravidla|pravidlem) k nízké glukóze\./g, 'I-MENE': /\s*[^.;]*„Méně jídla než obvykle“[^.;]*\./g };
NF.dropRuleRefs = function (S, text, skip) {
  var t = String(text || '');
  if (!S || !NF.activePlan(S)) return t; /* bez plánu (registr, průvodce) se znění ukazuje celé */
  Object.keys(NF.RULE_SENTENCE).forEach(function (id) { if (id === skip || NF.hasInstruction(S, id)) return; t = t.replace(NF.RULE_SENTENCE[id], ''); });
  return t.replace(/^\s+/, '');
};
NF.instrTextOf = function (S, c) {
  if (!c) return c;
  var t = String(c.text || '');
  /* Znění bez odkazu na chybějící pravidlo, kde nejde jen vynechat celou větu (katalog: bez { 'I-HYPO': … }). */
  if (S && NF.activePlan(S) && c.bez) Object.keys(c.bez).forEach(function (id) { if (!NF.hasInstruction(S, id)) t = c.bez[id]; });
  if (S && NF.activePlan(S) && c.odkazy) {
    var have = Object.keys(c.odkazy).filter(function (id) { return NF.hasInstruction(S, id); }).map(function (id) { return c.odkazy[id]; });
    if (have.length < Object.keys(c.odkazy).length) t = t.replace(/ a řiďte se pravidlem k [^.]*glukóze\./, have.length ? ' a řiďte se pravidlem k ' + have.join(' nebo ') + ' glukóze.' : '.');
  }
  var out = {}; Object.keys(c).forEach(function (k) { out[k] = c[k]; }); out.text = NF.dropRuleRefs(S, t, c.id); return out;
};
NF.defaultInstructions = function (S) {
  if (S && NF.item(S, 'R-POKYNY') && !NF.usable(S, 'R-POKYNY')) return []; /* zamítnutá R-POKYNY: pokyny nejsou součástí plánu (A05, Q1) */
  return NF.instructionCatalog().filter(function (c) { var r = NF.item(S, c.id); return !r || r.status !== 'rejected'; }).map(function (c) { return { id: c.id, value: NF.instructionValue(S, c) }; });
};
NF.instructionExceptions = function (S, list) {
  var cat = NF.instructionCatalog(), out = [];
  cat.forEach(function (c) { var ex = (list || []).filter(function (x) { return x.id === c.id; })[0]; if (!ex) { if (!NF.item(S, c.id) || NF.usable(S, c.id)) out.push(c.title + ': vypnuto'); return; } if (typeof c.value === 'number' && ex.value !== NF.instructionValue(S, c)) out.push(c.title + ': ' + String(ex.value).replace('.', ',') + ' ' + (c.unit || '')); });
  return out;
};

/* ---------- úložiště ---------- */
NF.storageOK = true;
NF.migrated = null;
NF.load = function () {
  var s = null, raw = null;
  try { raw = global.localStorage && global.localStorage.getItem(NF.STORAGE); s = raw ? JSON.parse(raw) : null; }
  catch (e) { if (raw == null) NF.storageOK = false; s = null; }
  if (raw && (!s || s.schema !== NF.SCHEMA || !Array.isArray(s.plans))) {
    /* Jiné schéma nebo poškozený záznam: nic se tiše nezahazuje – záloha zůstane v zařízení a lišta to řekne (P3, 6. 10. 2026). */
    try { global.localStorage.setItem(NF.STORAGE + '.zaloha-' + (s && s.schema != null ? s.schema : 'poskozeno'), raw); } catch (e2) { }
    NF.migrated = s && s.schema != null ? String(s.schema) : 'poškozený záznam';
    s = null;
  }
  var base = NF.createState();
  if (!s) { NF.seed(base); return base; }
  Object.keys(base).forEach(function (k) { if (s[k] === undefined || s[k] === null) s[k] = base[k]; }); /* osekaný stav doplní výchozí klíče */
  if (!NF.stateShapeOK(s)) {
    /* Záznam stejného schématu se špatným tvarem (robustnost #1, 23. 10. 2026): postupujeme jako u poškozeného záznamu – záloha a čistý start. */
    try { global.localStorage.setItem(NF.STORAGE + '.zaloha-poskozeno', raw); } catch (e3) { }
    NF.migrated = 'poškozený záznam'; base = NF.createState(); NF.seed(base); return base;
  }
  NF.syncUid(s); /* A2: nová ID pokračují za uloženými */
  return s;
};
/* Tvar uloženého stavu: pole, objekty dávek, platné hodiny, rozpracované zápisy. Při neshodě se stav nepoužije. */
NF.stateShapeOK = function (s) {
  try {
    var arr = function (x) { return Array.isArray(x); }, obj = function (x) { return !!x && typeof x === 'object' && !Array.isArray(x); };
    if (!obj(s.registry) || !arr(s.registry.items) || !arr(s.registry.history) || !arr(s.foods) || !arr(s.plans) || !arr(s.habits) || !arr(s.episodes) || !arr(s.basalLog) || !arr(s.nights) || !arr(s.events) || !arr(s.questions) || !arr(s.hypoWatch) || !arr(s.illnessLog)) return false;
    if (!NF.validIso(s.clock) || ['patient', 'doctor', 'nurse'].indexOf(s.role) < 0 || typeof s.page !== 'string') return false;
    if (!obj(s.enrollment) || !obj(s.training) || !obj(s.onboarding) || !obj(s.support) || !obj(s.fb)) return false;
    var doseOK = function (d) { return obj(d) && ['basal', 'breakfast', 'lunch', 'dinner'].every(function (k) { return obj(d[k]) && Number.isFinite(d[k].units); }); };
    if (!s.registry.items.every(function (r) { return obj(r) && typeof r.id === 'string'; }) || !s.foods.every(function (f) { return obj(f) && typeof f.id === 'string' && typeof f.name === 'string'; })) return false;
    if (!s.plans.every(function (p) { return obj(p) && typeof p.id === 'string' && doseOK(p.doses) && arr(p.habits) && arr(p.instructions || []); })) return false;
    if (s.activePlanId != null && !s.plans.some(function (p) { return p.id === s.activePlanId; })) return false;
    if (!s.episodes.every(function (e) { return obj(e) && typeof e.id === 'string' && NF.validIso(e.at) && obj(e.insulin) && typeof e.meal === 'string'; })) return false;
    if (s.draft != null && (!obj(s.draft) || !doseOK(s.draft.doses) || !arr(s.draft.habits) || !arr(s.draft.instructions) || !obj(s.draft.targets))) return false;
    if (s.meal != null && (!obj(s.meal) || [1, 2, 3].indexOf(s.meal.step) < 0 || !obj(s.meal.decisions) || !obj(s.meal.reasons))) return false;
    if (s.review != null && (!obj(s.review) || !arr(s.review.proposals) || !obj(s.review.decisions) || !obj(s.review.verify) || !doseOK(s.review.newDoses))) return false;
    return true;
  } catch (err) { return false; }
};
NF.save = function (S) {
  try { global.localStorage && global.localStorage.setItem(NF.STORAGE, JSON.stringify(S)); } catch (e) { NF.storageOK = false; }
};

/* ---------- stopa ----------
   Každý výpočet, rada a rozhodnutí se zapíše se vstupy, položkou registru a výstupem.
   Nikdy nevolá síť ani generativní AI; vše je deterministické. */
NF.log = function (S, what, detail, data) {
  S.events.push({ at: S.clock, who: S.actor || S.role, what: what, detail: detail || '', data: data || null });
  if (S.events.length > 4000) S.events.shift();
  if (S.events.length > 1000) { var old = S.events[S.events.length - 1001]; if (old && old.data && !old.data.zkraceno) old.data = { zkraceno: true }; } /* stará data stopy se krátí, událost zůstává */
};
/* Háčky pro vrstvy nad jádrem (např. ukládání rozhodnutí garanta mimo zařízení). Jádro samo síť nevolá. */
NF.hooks = { decision: [], muted: 0 };
NF.onDecision = function (fn) { NF.hooks.decision.push(fn); };
/* Během fn se háčky nevolají: rozhodnutí odehraná příběhem (přehrání kapitol, kroky prezentace) nejsou rozhodnutí garanta. */
NF.muteHooks = function (fn) { NF.hooks.muted++; try { return fn(); } finally { NF.hooks.muted--; } };

/* ---------- schvalovací registr ----------
   Položka: { id, version, cat, title, summary, detail, params, text, lever, kind, status, history }
   status: approved | rejected | pending (nová verze čeká na schválení). Použitelná je každá kromě rejected.
   Dvě rozhodnutí (vlastník 27. 10. 2026): Schválit / Zamítnout; poznámka je vlastnost položky, ne stav. Oprava pravidla = nová verze ke schválení (NF.newVersion). */
NF.CATS = [
  ['kohorta', 'Kohorta a zařazení'], ['plan', 'Startovní plán a návyky'], ['vypocty', 'Výpočty a prahy'],
  ['rady', 'Rady a texty'], ['skore', 'Reakce těla'], ['davka', 'Signály k dávce'], ['pokyny', 'Bezpečnostní pravidla'],
  ['zauceni', 'Zaučení'], ['jidla', 'Jídla'], ['report', 'Report a souhrny'], ['rezim', 'Bezpečnost a režim']
];
NF.catLabel = function (c) { var x = NF.CATS.filter(function (k) { return k[0] === c; })[0]; return x ? x[1] : c; };
NF.STATUS = { pending: 'ke schválení', approved: 'schváleno', rejected: 'zamítnuto' }; /* stav „upraveno“ zrušen 27. 10. 2026 */
/* Stav položky pro garanta (7. 10. 2026 večer): dokud nerozhodl, je položka „ke schválení“ – maketa se přitom chová, jako by byla schválená. */
NF.STATE = { pending: 'ke schválení', approved: 'schváleno', rejected: 'zamítnuto' };
NF.itemState = function (S, id) { var r = NF.item(S, id); if (!r || r.scope === 'provozni') return null; /* provozní pravidlo nemá stav (Q1) */ if (r.status === 'rejected') return 'rejected'; if (r.status === 'pending') return 'pending'; return NF.itemTouched(S, id) ? 'approved' : 'pending'; };
NF.stateLabel = function (S, id) { return NF.STATE[NF.itemState(S, id)] || ''; };
/* Paměť na jedno vykreslení (robustnost #16, 23. 10. 2026): vykreslení stav nemění, takže stejné výpočty (foodStats, položky registru) se v něm počítají jednou.
   NF.memo je objekt jen během NF.render; mimo něj se vše počítá znovu. */
NF.memo = null;
NF.item = function (S, id) {
  var m = NF.memo;
  if (m && m.S === S) { if (!m.items) { m.items = {}; S.registry.items.forEach(function (r) { if (!m.items[r.id]) m.items[r.id] = r; }); } return m.items[id] || null; }
  return S.registry.items.filter(function (r) { return r.id === id; })[0] || null;
};
NF.usable = function (S, id) { var r = NF.item(S, id); return !!r && r.status !== 'rejected'; };
/* Parametr zamítnuté položky nepůsobí (zásada 4; klinická bezpečnost 23. 10. 2026): vrací se jen výchozí hodnota z kódu. */
NF.param = function (S, id, key, fallback) {
  var r = NF.item(S, id);
  return r && r.status !== 'rejected' && r.params && r.params[key] != null ? r.params[key] : fallback;
};
/* Rozhodnutí o položce: jen Schválit (approved) nebo Zamítnout (rejected) s nepovinnou poznámkou (27. 10. 2026).
   opts.garant: rozhodnutí lékaře-garanta mimo roli na obrazovce (panel ukázky). opts.note: uloží jen poznámku – stav se nemění a nepočítá se jako rozhodnutí (R14);
   prázdná poznámka je také změna (smazání). opts.status: stav, který se k poznámce zapíše (prezentační vrstva: stav podle garanta, null = nerozhodnuto).
   opts.rt: skutečný čas zápisu (ISO), opts.where: kde garant rozhodl (panel, zásuvka, souhrn, registr). Vrací i přenositelný záznam `decision`. */
NF.DECISIONS = ['approved', 'rejected'];
NF.decideItem = function (S, id, status, comment, opts) {
  var o = opts || {}, r = NF.item(S, id), garant = !!o.garant, isNote = !!o.note;
  if (!r) return { ok: false, error: 'Položka nenalezena.' };
  if (S.role !== 'doctor' && !garant) return { ok: false, error: 'Registr spravuje lékař-garant.' };
  if (!isNote && NF.DECISIONS.indexOf(status) < 0) return { ok: false, error: 'Rozhodnutí je Schválit, nebo Zamítnout.' };
  var by = garant ? 'garant' : S.doctor.id;
  var st = isNote ? (Object.prototype.hasOwnProperty.call(o, 'status') ? o.status : r.status) : status;
  var d = { item: id, kind: isNote ? 'note' : 'decision', status: st, comment: String(comment || ''), at: S.clock, by: by };
  if (o.rt) d.rt = o.rt; if (o.where) d.where = o.where;
  var h = NF.applyDecision(S, d);
  return { ok: true, item: r, decision: d, history: h };
};
/* Aplikuje záznam na stav (použije se i při přehrání scény, aby rozhodnutí garanta přežila; quiet = přehrání, háčky se nevolají).
   Záznam odehraný příběhem (pod NF.muteHooks) je modelový: v historii nese model = true a garantovi se nepřipisuje (M9, 27. 10. 2026). */
NF.applyDecision = function (S, d, quiet) {
  var r = NF.item(S, d.item); if (!r) return null;
  if (d.kind !== 'note' && NF.DECISIONS.indexOf(d.status) < 0) return null; /* starší druhy záznamů („upraveno“, „komentář“) se už neuplatní */
  var prior = S.registry.history.filter(function (x) { return x.item === d.item && (x.kind === 'decision' || x.kind === 'version'); }), last = prior[prior.length - 1];
  var from = { status: (last && last.kind === 'decision') || r.status === 'rejected' ? r.status : 'pending', version: r.version || 'v1' }; /* dokud nikdo nerozhodl, je výchozí stav „ke schválení“ (M9) */
  var h = { id: NF.uid('H'), at: d.at, by: d.by, item: d.item, kind: d.kind === 'note' ? 'note' : 'decision', from: from, to: from, comment: d.comment || '' };
  if (d.rt) h.rt = d.rt; if (d.where) h.where = d.where; if (NF.hooks.muted) h.model = true;
  r.note = d.comment || ''; r.noteAt = d.rt || d.at;
  if (h.kind === 'decision') {
    r.status = d.status; r.decidedAt = d.at; r.decidedRt = d.rt || null; r.decidedBy = d.by; r.touched = true;
    h.to = { status: d.status, version: r.version || 'v1' };
  }
  S.registry.history.push(h);
  if (h.kind === 'note') NF.log(S, 'registr.poznamka', d.item + (d.comment ? ' · „' + d.comment + '“' : ' · poznámka smazána'), h);
  else NF.log(S, 'registr.rozhodnuti', d.item + ' → ' + d.status + (d.comment ? ' · „' + d.comment + '“' : ''), h);
  if (h.kind === 'decision') NF.refreshReview(S);
  if (!quiet && !NF.hooks.muted) NF.hooks.decision.forEach(function (fn) { try { fn(S, d, h, r); } catch (err) { } });
  return h;
};
/* Kontrola 2 (B1, 29. 10. 2026): rozhodnutí garanta během otevřené kontroly přepočítá návrhy. Návrh, jehož položka (nebo čistá data) je zamítnutá,
   z kontroly zmizí – karta zamítnutého návrhu nesmí přijímat akce; po novém schválení se vrátí. Rozhodnutí a ověření u návrhů, které zůstaly, se drží. */
NF.refreshReview = function (S) {
  var r = S.review; if (!r || r.planIssued) return;
  var p = NF.planById(S, r.planId); if (!p) return;
  var fresh = NF.proposals(S, r.planId), ids = fresh.map(function (x) { return x.id; }), p0 = NF.activePlan(S);
  r.proposals.forEach(function (pr) {
    if (ids.indexOf(pr.id) >= 0) return;
    delete r.decisions[pr.id]; delete r.verify[pr.id];
    if (pr.kind === 'dose' && p0 && p0.doses[pr.dose] && r.newDoses[pr.dose]) r.newDoses[pr.dose].units = p0.doses[pr.dose].units; /* zmizelý návrh nemění dávku */
  });
  r.proposals = fresh; r.index = 0;
};
NF.proposalLive = function (S, pr) { return !!pr && (!pr.item || !NF.item(S, pr.item) || NF.usable(S, pr.item)) && (pr.needs || []).every(function (id) { return NF.usable(S, id); }); };
/* Oprava pravidla v ostré aplikaci (O6, 27. 10. 2026): nová verze položky ke schválení. Každá verze má zase jen dva výsledky.
   changes: { text, params, off } – parametry v mezích položky, off = vyřazené větve postupu ({ 'klic:index': true }). */
NF.newVersion = function (S, id, changes, comment) {
  var r = NF.item(S, id); if (!r) return { ok: false, error: 'Položka nenalezena.' };
  var c = changes || {}, n = Number(String(r.version || 'v1').replace(/\D/g, '')) || 1;
  var from = { status: r.status, version: r.version || 'v1', text: r.text || null, params: NF.clone(r.params || {}) };
  if (c.text) r.text = c.text;
  if (c.params) { r.params = r.params || {}; Object.keys(c.params).forEach(function (k) { r.params[k] = typeof c.params[k] === 'number' ? NF.clampParam(r.id, k, c.params[k]) : c.params[k]; }); } /* meze platí i mimo volič (23. 10. 2026) */
  if (c.off && r.postup) Object.keys(c.off).forEach(function (k) { var kk = k.split(':'), b = r.postup[kk[0]] && r.postup[kk[0]].branches && r.postup[kk[0]].branches[Number(kk[1])]; if (b) { if (c.off[k]) b.off = true; else delete b.off; } });
  r.version = 'v' + (n + 1); r.status = 'pending'; r.touched = false; r.note = '';
  var h = { id: NF.uid('H'), at: S.clock, by: S.doctor.id, item: id, kind: 'version', from: from, to: { status: 'pending', version: r.version, text: r.text || null, params: NF.clone(r.params || {}) }, comment: String(comment || '') };
  if (NF.hooks.muted) h.model = true;
  S.registry.history.push(h);
  NF.log(S, 'registr.verze', id + ' → ' + r.version + (comment ? ' · „' + comment + '“' : ''), h);
  return { ok: true, item: r, history: h };
};
/* Souhrn pro hlavičku registru: rozhodnuto, schváleno, zamítnuto, ke schválení, s poznámkou. */
NF.itemTouched = function (S, id) {
  var hs = S.registry.history.filter(function (h) { return h.item === id && (h.kind === 'decision' || h.kind === 'version'); });
  return hs.length > 0 && hs[hs.length - 1].kind === 'decision'; /* po nové verzi je položka zase ke schválení */
};
NF.itemNote = function (S, id) { var r = NF.item(S, id); return r && r.note ? r.note : ''; };
NF.registrySummary = function (S) {
  var items = NF.garantItems(S), out = { total: items.length, touched: 0, approved: 0, rejected: 0, remaining: 0, noted: 0 };
  items.forEach(function (r) {
    var st = NF.itemState(S, r.id);
    if (st === 'pending') out.remaining++; else { out.touched++; out[st]++; }
    if (NF.itemNote(S, r.id)) out.noted++;
  });
  return out;
};

/* ---------- zařazení ---------- */
NF.ELIGIBILITY = [
  ['adult', 'Dospělý s diabetem 2. typu'],
  ['insulinOnly', 'Inzulin v pevných dávkách a žádný jiný lék na diabetes (ani tablety, ani GLP-1; premixy ne)'], /* SCHEMA 84 (rozhodnutí vlastníka 4. 11. 2026, bod 5): kohorta jen inzulin; nahrazuje 18. 10. 2026 */
  ['regimen', 'Bazál 1× večer + prandiální inzulin ke třem hlavním jídlům, pevné dávky'],
  ['cgm', 'Senzor glukózy (CGM)']
]; /* SCHEMA 74 (vlastník 27. 10. 2026): povinné zaškrtnutí sdílení dat ze senzoru zrušeno; export pošle pacient před kontrolou do ordinace a nahraje ho sestra */
/* Výchozí hodnoty ze senzoru před zařazením (čas v cíli, čas pod dolním cílem, v %): lékař je zadá voličem z reportu senzoru; na kontrole dávají „dříve · teď · rozdíl“ (vlastník 23. 10. 2026). */
NF.setBaseline = function (S, key, delta) {
  var b = S.enrollment.baseline = S.enrollment.baseline || { tir: null, below: null };
  if (key !== 'tir' && key !== 'below') return;
  var v = (b[key] == null ? (key === 'tir' ? 50 : 0) : b[key]) + Number(delta);
  b[key] = Math.max(0, Math.min(100, v));
};
/* Souhrn minulého období (předchozí plán), pro srovnání na kontrole; při první kontrole null. */
NF.prevSummary = function (S, plan) { return plan && plan.previousId ? NF.summary(S, plan.previousId) : null; };
/* Technická podpora: jen stav formuláře; jádro nic neposílá (síť nevolá, test to hlídá). */
NF.SUPPORT_ISSUES = [['meal', 'Nejde zapsat jídlo'], ['reminder', 'Nechodí připomínka inzulinu'], ['import', 'Nejde zapsat hodnotu ze senzoru'], ['open', 'NutriFee nejde otevřít nebo padá'], ['other', 'Něco jiného']];
/* Vylučovací kritéria (kontrola 4, 06 B4 a B1): jedno zaškrtnutí vedle čtyř podmínek; bez něj plán nejde vydat. Podmínky zařazení (ELIGIBILITY) zůstávají čtyři. */
NF.EXCLUSION = ['noExclusion', 'Pacient nemá žádné vylučovací kritérium: těhotenství nebo jeho plánování, opakované těžké poklesy glukózy nebo jejich nepoznávání, těžké onemocnění ledvin nebo jater, léčbu akarbózou, potíže s chůzí nebo pohybem, kvůli kterým nezvládne procházku po jídle, potíže se zrakem nebo pamětí, které znemožní ovládat telefon'];
NF.excluded = function (S) { return !(S.enrollment && S.enrollment.criteria && S.enrollment.criteria[NF.EXCLUSION[0]]); };
NF.setEligibility = function (S, key, value) {
  S.enrollment.criteria[key] = !!value;
  S.enrollment.eligible = NF.ELIGIBILITY.every(function (c) { return !!S.enrollment.criteria[c[0]]; });
  return S.enrollment.eligible;
};

/* ---------- plán, dávky, návyky, pokyny ---------- */
NF.MEALS = [['breakfast', 'snídaně', 'Snídaně', 'snídani'], ['lunch', 'oběd', 'Oběd', 'obědu'], ['dinner', 'večeře', 'Večeře', 'večeři']];
NF.MEAL_GPL = { breakfast: 'snídaní', lunch: 'obědů', dinner: 'večeří' };
NF.MEAL_PO = { breakfast: 'po snídani', lunch: 'po obědě', dinner: 'po večeři', snack: 'po svačině' }; /* poklesy po jídle v návrhu (A1, 27. 10. 2026) */ /* 2. pád množného čísla: „54 ze 73 snídaní“ (19. 10. 2026) */
/* Svačina (15, odst. 7a): čtvrtý a další zápis dne, bez inzulinu k jídlu; není slot. */
NF.SNACK = ['snack', 'svačina', 'Svačina', 'svačině'];
/* Věty bez rodu k jednotlivým jídlům dne (vykáme a nepředpokládáme rod). */
NF.MEAL_TEXT = {
  breakfast: { was: 'Byla dnes snídaně?', yes: 'Ano, byla', already: 'Snídaně už byla', without: 'bez snídaně', when: 'V kolik byla snídaně?' },
  lunch: { was: 'Byl dnes oběd?', yes: 'Ano, byl', already: 'Oběd už byl', without: 'bez oběda', when: 'V kolik byl oběd?' },
  dinner: { was: 'Byla dnes večeře?', yes: 'Ano, byla', already: 'Večeře už byla', without: 'bez večeře', when: 'V kolik byla večeře?' }
};
NF.mealText = function (m, key) { var t = NF.MEAL_TEXT[m]; return t ? t[key] : ''; };
/* cap: true = velké písmeno, 'dat' = 3. pád („snídani“), 'ke' / 'Ke' = s předložkou („ke snídani“, „k obědu“), 'acc' = 4. pád („snídani“, „oběd“) */
NF.MEAL_ACC = { breakfast: 'snídani', lunch: 'oběd', dinner: 'večeři', snack: 'svačinu' };
NF.mealLabel = function (m, cap) {
  var x = NF.MEALS.concat([NF.SNACK]).filter(function (k) { return k[0] === m; })[0]; if (!x) return m;
  if (cap === 'ke' || cap === 'Ke') { var pre = /^[sz]/.test(x[3]) ? 'ke' : 'k'; return (cap === 'Ke' ? pre.charAt(0).toUpperCase() + pre.slice(1) : pre) + ' ' + x[3]; }
  if (cap === 'acc') return NF.MEAL_ACC[m] || x[1];
  return cap === 'dat' ? x[3] : cap ? x[2] : x[1];
};
NF.isSnack = function (m) { return m === 'snack'; };
NF.DEFAULT_TARGETS = { low: 3.9, high: 10.0, fastingHigh: 7.2, tirGoal: 70, tbrGoal: 4, hba1cGoal: 53 }; /* tbrGoal: čas pod dolním cílem méně než (%), kontrola 4 (bod 8, C15) */ /* cíl HbA1c (mmol/mol) od 25. 10. 2026, rozhodnutí vlastníka */
/* Výchozí cíle glukózy jsou položka registru C-CILE (R13, 6. 10. 2026); bez ní (nebo zamítnutá) platí pevný fallback. */
NF.defaultTargets = function (S) {
  var d = NF.DEFAULT_TARGETS;
  if (!S || !NF.usable(S, 'C-CILE')) return NF.clone(d);
  return { low: NF.param(S, 'C-CILE', 'low', d.low), high: NF.param(S, 'C-CILE', 'high', d.high), fastingHigh: NF.param(S, 'C-CILE', 'fastingHigh', d.fastingHigh), tirGoal: NF.param(S, 'C-CILE', 'tirGoal', d.tirGoal), tbrGoal: NF.param(S, 'C-CILE', 'tbrGoal', d.tbrGoal), hba1cGoal: NF.param(S, 'C-CILE', 'hba1cGoal', d.hba1cGoal) };
};
/* Mírnější cíle pro starší a křehké (kontrola 4, bod 8, rozhodnutí vlastníka 30. 10. 2026): druhá sada v C-CILE – čas v cíli a čas pod cílem; ostatní hodnoty jako běžné.
   Lékař volí sadu při zařazení jedním klepnutím; jednotlivé hodnoty pak může dál upravit voličem. */
NF.TARGET_PRESETS = ['bezne', 'mirnejsi'];
NF.targetPreset = function (S, kind) {
  var t = NF.defaultTargets(S);
  if (kind === 'mirnejsi') { t.tirGoal = NF.param(S, 'C-CILE', 'tirGoalMirnejsi', 50); t.tbrGoal = NF.param(S, 'C-CILE', 'tbrGoalMirnejsi', 1); t.preset = 'mirnejsi'; }
  return t;
};
NF.setTargetPreset = function (S, t, kind) {
  if (!t || NF.TARGET_PRESETS.indexOf(kind) < 0) return { ok: false };
  var p = NF.targetPreset(S, kind); t.tirGoal = p.tirGoal; t.tbrGoal = p.tbrGoal; t.preset = kind;
  return { ok: true };
};
/* Den má tři pojmenované sloty: snídaně, oběd, večeře. Žádná okna nastavovaná lékařem.
   Čas se používá jen hrubě (denní doba), aby aplikace věděla, že prázdný slot už minul:
   snídaně po 10:00, oběd po 15:30, večeře po 21:00. Pacient se může vždy opravit sám. */
NF.DAYPART_END = { breakfast: 10, lunch: 15.5, dinner: 21 };
NF.fmtHour = function (h) { var hh = Math.floor(h), mm = Math.round((h - hh) * 60); return hh + ':' + (mm < 10 ? '0' : '') + mm; }; /* vždy „6:00“, „6:30“ (19. 10. 2026) */
/* Stav slotu: done | skipped | missed (prázdný a denní doba minula) | now (prázdný, na řadě) | later (prázdný, přijde po jiném) */
NF.mealState = function (S, meal) {
  var d = NF.parse(S.clock), h = d.getHours() + d.getMinutes() / 60, day = NF.day(S.clock);
  var eaten = S.episodes.some(function (x) { return x.meal === meal && NF.day(x.at) === day; });
  var skipped = !!(S.skipped && S.skipped[day] && S.skipped[day][meal]);
  var state = eaten ? 'done' : skipped ? 'skipped' : h >= NF.DAYPART_END[meal] ? 'missed' : 'now';
  return { meal: meal, state: state };
};
NF.daySlots = function (S) { return NF.MEALS.map(function (m) { return NF.mealState(S, m[0]); }); };
/* Slot, na který se Dnes ptá: nejdřív minulý prázdný (doptat se), pak první prázdný na řadě. */
NF.focusMeal = function (S) {
  var slots = NF.daySlots(S);
  var missed = slots.filter(function (x) { return x.state === 'missed'; })[0];
  if (missed) return missed;
  var open = slots.filter(function (x) { return x.state === 'now'; });
  if (!open.length) return null;
  /* Do N hodin po hlavním jídle je další slot „další“, ne „teď“ (rozhodnutí vlastníka 19. 10. 2026): „na řadě + dávka“ by senior četl jako pokyn píchnout si hned. */
  var last = S.episodes.filter(function (x) { return !NF.isSnack(x.meal) && NF.day(x.at) === NF.day(S.clock); }).map(function (x) { return x.at; }).sort().pop();
  open[0].state = last && NF.minutesDiff(last, S.clock) < NF.param(S, 'B-HYPO', 'dalsi_slot_h', 3) * 60 ? 'next' : 'now'; return open[0];
};
NF.skipMeal = function (S, meal, insulin) {
  var day = NF.day(S.clock);
  S.skipped = S.skipped || {}; S.skipped[day] = S.skipped[day] || {};
  S.skipped[day][meal] = { at: S.clock, insulin: insulin || 'unknown' };
  NF.log(S, 'jidlo.vynechano', meal + ' · inzulin ' + (insulin || 'nevím'), { meal: meal, insulin: insulin });
  /* „Nevím“ = pro jistotu počítáme, že inzulin byl (15 odst. 18): stejné sledování jako po podaném inzulinu (23. 10. 2026). */
  var risk = NF.insulinInBody(insulin);
  if (risk) NF.addHypoWatch(S, 'skipped', meal, S.clock, null);
  return { ok: true, warn: risk };
};
/* Inzulin v těle pro větev nízké glukózy: podle plánu, jinak, nebo nevím (nejistota na stranu bezpečí). */
NF.insulinInBody = function (insulin) { return insulin === 'as' || insulin === 'other' || insulin === 'unknown'; };
/* Vynechané jídlo dne s inzulinem v těle (karta na Dnes s pravidlem, dokud sledování nemá odpověď). */
NF.skippedWithInsulin = function (S, day) {
  var sk = (S.skipped && S.skipped[day || NF.day(S.clock)]) || {};
  return NF.MEALS.map(function (m) { return m[0]; }).filter(function (meal) { return sk[meal] && NF.insulinInBody(sk[meal].insulin); }).map(function (meal) { return { meal: meal, insulin: sk[meal].insulin }; });
};

NF.newDraft = function (S) {
  return {
    planId: 'P' + (S.plans.length + 1), version: 'v1',
    doses: { basal: { units: 0, time: '21:00' }, breakfast: { units: 0 }, lunch: { units: 0 }, dinner: { units: 0 } }, /* 0 = „nastavte“; výši dávky aplikace nikdy nepředvyplňuje (6. 10. 2026) */
    habits: NF.usableHabitIds(S, NF.habitCatalog().filter(function (h) { return h.default; }).map(function (h) { return h.id; })), /* startovní sada předvyplněná i v návrhu z jádra (kontrola 4, 07 C5) */
    instructions: NF.defaultInstructions(S), targets: NF.defaultTargets(S), advice: { off: [], prefer: [] }, /* pokyny v plánu automaticky (21. 10. 2026) */
    medicationChecked: false, instructionsChecked: true, validUntil: NF.addDays(S.clock, 92), decisions: []
  };
};
NF.TARGET_STEPS = { low: [0.1, 3.0, 5.0], high: [0.5, 7.0, 14.0], fastingHigh: [0.1, 5.0, 10.0], tirGoal: [5, 30, 90], tbrGoal: [1, 1, 10], hba1cGoal: [1, 42, 75] };
NF.setTarget = function (t, key, delta) {
  var st = NF.TARGET_STEPS[key]; if (!st || !t) return;
  if (typeof t[key] !== 'number') t[key] = NF.DEFAULT_TARGETS[key]; /* plán vydaný před zavedením cíle HbA1c */
  var v = Math.round(Math.max(st[1], Math.min(st[2], t[key] + delta * st[0])) * 10) / 10;
  if (key === 'low' && v >= (t.high || 99) - 1) return; /* dolní cíl vždy aspoň 1 mmol/l pod horním */
  if (key === 'high' && v <= (t.low || 0) + 1) return;
  if (key === 'fastingHigh' && v <= (t.low || 0)) return;
  t[key] = v;
  if (key === 'tirGoal' || key === 'tbrGoal') t.preset = null; /* ručně upravené cíle už nejsou jedna ze sad */
};
/* Posuvník hodnoty (rozhodnutí vlastníka 5. 11. 2026, bod 9): cíl se nastaví přímo hodnotou; krok, meze a vztahy cílů hlídá NF.setTarget. */
NF.setTargetValue = function (t, key, value) {
  var st = NF.TARGET_STEPS[key], v = Number(value); if (!st || !t || !Number.isFinite(v)) return;
  var cur = typeof t[key] === 'number' ? t[key] : NF.DEFAULT_TARGETS[key];
  var d = Math.round((v - cur) / st[0]); if (d) NF.setTarget(t, key, d);
};
/* Meze parametrů registru (min, max): garant krokuje jen uvnitř nich (C6, 6. 10. 2026). */
NF.PARAM_BOUNDS = {
  'C-CILE': { low: [3.0, 5.0], high: [7.0, 14.0], fastingHigh: [5.0, 10.0], tirGoal: [30, 90], tbrGoal: [1, 10], hba1cGoal: [42, 75], tirGoalMirnejsi: [30, 90], tbrGoalMirnejsi: [0.5, 10] },
  'R-REAKCE': { minKnown: [1, 10], okno_min: [60, 240], okno_tucne_min: [0, 300], vzestup_max: [1, 6], shoda_mmol: [1, 8], rozchod_mmol: [1, 8], maxUceni: [3, 12] }, 'Z-IMPORT': { po_jidle_min: [120, 300], shoda_mmol: [0.5, 3] }, 'S-TYDEN': { nabidka: [0, 1] }, 'Z-GLUKOZA': { pripominka_min: [60, 240] }, 'B-HYPO': { poklesy: [1, 5], dny: [3, 14], pripominka_min: [30, 120], dalsi_slot_h: [2, 5] }, 'R-SKORE': { mirna: [0.5, 1], odKolika: [2, 6], oknoZapisu: [3, 12], ustaleneOd: [3, 12] } /* bez `stredni`: dva stupně (A32) */,
  'R-PODOBNOST': { minJidel: [1, 6], minZapisu: [2, 20], shoda: [0.5, 1], vaha: [0, 5], maxNaJidlo: [1, 10] }, 'S-SILNA': { silnych: [2, 6], dvaNad_mmol: [1, 6], maxJidel: [1, 10] },
  'D-PRAND': { dny: [7, 120], minJidel: [3, 30], podil: [0.5, 1], radyPrve: [0, 10], hypo: [1, 10], medianNad: [0, 3], hypoPodil: [0, 0.5], odmitnutiMin: [1, 20], odmitnutiPodil: [0.3, 1], podilDvouJidel: [0.5, 1] },
  'D-BAZAL': { dny: [7, 120], nociPod: [1, 10], minNoci: [3, 30] }, 'D-POSTUP': { poklesy_od: [1, 5], poklesy_jen_ciste: [0, 1], shoda_podil: [0.5, 1], shoda_min: [1, 20], v_cili_podil: [0.5, 1], hba_rezerva: [0, 15] }, 'S-DAVKA': { po_sobe: [2, 5] }, 'S-PRIPOMINKY': { max_denne: [1, 4] }, 'D-CISTA': { pred_min: [0, 60], po_min: [0, 60] },
  'S-SEMAFOR': { smer_pb: [0, 10], smer_mmol: [0.3, 3], vyvoj_tydny: [2, 8], tir_zluta: [30, 70], tbr3_max: [0.5, 5], min_dni: [7, 30], porce_ok: [0.5, 1], porce_varovani: [0.3, 0.9], inzulin_ok: [0.5, 1], inzulin_varovani: [0.3, 0.9], mimo_dni: [1, 30] }, 'R-PROCHAZKA': { minut: [5, 60], okno_min: [15, 180] }, 'R-DOPLNEK': { stahnout_po: [1, 10] },
  'S-SOUHRN': { min_n: [3, 30], rozdil_mmol: [0.3, 3] }, 'P-NEMOC': { dny: [1, 14] }
};
NF.clampParam = function (id, key, v) { var b = NF.PARAM_BOUNDS[id] && NF.PARAM_BOUNDS[id][key]; if (!b) return Math.max(0, v); return Math.max(b[0], Math.min(b[1], v)); };
NF.setDose = function (S, key, delta) {
  var d = S.draft; if (!d) return;
  var x = d.doses[key]; x.units = Math.max(0, Math.min(60, x.units + delta));
};
/* Volič dávky mřížkou (kontrola 4, 07 A2): lékař klepne na číslo 1–40 j. a jemně doladí ±1 (NF.setDose); dávka se nepředvyplňuje (6. 10. 2026). */
NF.DOSE_GRID = [1, 40];
NF.setDoseValue = function (S, key, units) {
  var d = S.draft, u = Number(units); if (!d || !d.doses[key] || !Number.isFinite(u) || Math.round(u) !== u || u < NF.DOSE_GRID[0] || u > NF.DOSE_GRID[1]) return { ok: false };
  d.doses[key].units = u; return { ok: true };
};
/* Výchozí hodnoty ze senzoru mřížkou po 5 % (07 A2), jemně ±1 přes NF.setBaseline. */
NF.setBaselineValue = function (S, key, v) {
  var b = S.enrollment.baseline = S.enrollment.baseline || { tir: null, below: null }, n = Number(v);
  if ((key !== 'tir' && key !== 'below') || !Number.isFinite(n) || n < 0 || n > 100) return { ok: false };
  b[key] = Math.round(n); return { ok: true };
};
/* A1 (31/03): návyk je v konceptu nejvýš jednou; klepnutí na zapnutý návyk ho odebere úplně (i ze staršího konceptu s duplicitou). */
NF.uniq = function (list) { var seen = {}; return (list || []).filter(function (x) { if (seen[x]) return false; seen[x] = 1; return true; }); };
NF.toggleHabit = function (S, catalogId) {
  var d = S.draft; if (!d) return;
  if (d.habits.indexOf(catalogId) >= 0) d.habits = d.habits.filter(function (x) { return x !== catalogId; }); else d.habits = NF.uniq(d.habits.concat([catalogId]));
};
NF.setInstruction = function (S, id, value) {
  var d = S.draft; if (!d) return;
  var ex = d.instructions.filter(function (x) { return x.id === id; })[0];
  if (value === null) { d.instructions = d.instructions.filter(function (x) { return x.id !== id; }); return; }
  if (ex) ex.value = value; else d.instructions.push({ id: id, value: value });
};
NF.planBlockers = function (S) {
  var d = S.draft, chybi = [];
  if (!d) return ['návrh plánu'];
  if (!S.enrollment.eligible) chybi.push('potvrzení podmínek zařazení');
  if (NF.excluded(S)) chybi.push('potvrzení, že pacient nemá vylučovací kritérium');
  if (['breakfast', 'lunch', 'dinner', 'basal'].some(function (k) { return !d.doses[k] || !(d.doses[k].units >= 1); })) chybi.push('všechny čtyři dávky (nejméně 1 j.)');
  if (!d.medicationChecked) chybi.push('ověření dávek s pacientem');
  if (!NF.usableHabitIds(S, d.habits).length && NF.usable(S, 'R-NAVYKY')) chybi.push('aspoň jeden návyk'); /* zamítnutá R-NAVYKY: plán vyjde bez startovních návyků (A05, Q1) */
  return chybi;
};
NF.activePlan = function (S) { return S.plans.filter(function (p) { return p.id === S.activePlanId; })[0] || null; };
NF.planById = function (S, id) { return S.plans.filter(function (p) { return p.id === id; })[0] || null; };
/* Plán platný v daném čase (zpětný zápis v den kontroly dostane dávku plánu, který platil při jídle; 23. 10. 2026). */
NF.planAt = function (S, at) {
  var list = S.plans.filter(function (p) { return p.effectiveFrom && p.effectiveFrom <= at; }).sort(function (a, b) { return a.effectiveFrom < b.effectiveFrom ? -1 : 1; });
  return list.length ? list[list.length - 1] : NF.activePlan(S);
};
/* Od kdy platí současná dávka k jídlu: zpět přes plány, dokud má předchozí plán stejnou dávku. Učení je per dávka od data změny,
   ne per hodnota – návrat dávky na starou hodnotu stará data znovu nezapočítá (23. 10. 2026). */
NF.doseSince = function (S, meal) {
  var p = NF.activePlan(S); if (!p || !p.doses[meal]) return null;
  var since = p.effectiveFrom, u = p.doses[meal].units, prev = p.previousId ? NF.planById(S, p.previousId) : null;
  while (prev && prev.doses[meal] && prev.doses[meal].units === u) { since = prev.effectiveFrom; prev = prev.previousId ? NF.planById(S, prev.previousId) : null; }
  return since;
};
NF.targets = function (S) { var p = NF.activePlan(S), t = (p && p.targets) || NF.defaultTargets(S); if (t.hba1cGoal == null || t.tbrGoal == null) { var d0 = NF.defaultTargets(S); t = NF.clone(t); if (t.hba1cGoal == null) t.hba1cGoal = d0.hba1cGoal; if (t.tbrGoal == null) t.tbrGoal = d0.tbrGoal; } return t; }; /* plán vydaný před zavedením cíle HbA1c nebo času pod cílem */
NF.instructions = function (S) { if (NF.item(S, 'R-POKYNY') && !NF.usable(S, 'R-POKYNY')) return []; var p = NF.activePlan(S); return (p && p.instructions) || []; }; /* zamítnutá R-POKYNY: pokyny nepůsobí (A05) */
/* Návyky, jejichž položka registru (R-NAVYKY, R-PROCHAZKA) platí. Zamítnutá položka vyřadí své návyky z plánu i z Dnes (A05, Q1). */
NF.habitUsable = function (S, h) { return !h || !h.item || NF.usable(S, h.item); };
NF.usableHabitIds = function (S, ids) { var cat = NF.habitCatalog(); return (ids || []).filter(function (id) { var c = cat.filter(function (x) { return x.id === id; })[0]; return NF.habitUsable(S, c); }); };
NF.planHabits = function (S, planId) { return S.habits.filter(function (h) { return h.planId === planId && NF.habitUsable(S, h); }); };
/* Rady svázané s plánem (15, odst. 9): lékař může radu pro pacienta vypnout nebo nahradit. */
NF.planAdvice = function (S, p) { p = p || NF.activePlan(S); return (p && p.advice) || { off: [], prefer: [] }; };

NF.issuePlan = function (S, catalog) {
  if (S.role !== 'doctor') return { ok: false, error: 'Plán vydává lékař.' };
  if (!S.draft && NF.activePlan(S)) return { ok: false, error: 'Plán už je vydaný.' };
  var chybi = NF.planBlockers(S);
  if (chybi.length) return { ok: false, error: 'Plán zatím nelze vydat. Chybí: ' + chybi.join(', ') + '.' };
  var d = S.draft, prev = NF.activePlan(S);
  d.habits = NF.uniq(NF.usableHabitIds(S, d.habits)); /* návyk zamítnuté položky do plánu nejde (A05); každý návyk jednou (A1, 31/03) */
  var plan = {
    id: d.planId, version: d.version, author: S.doctor.id, issuedAt: S.clock, effectiveFrom: S.clock, validUntil: d.validUntil,
    doses: NF.clone(d.doses), instructions: NF.clone(d.instructions), targets: NF.clone(d.targets), habits: d.habits.slice(), advice: NF.clone(d.advice || { off: [], prefer: [] }),
    decisions: d.decisions || [], previousId: prev ? prev.id : null, handedOver: false, understood: false, state: 'issued'
  };
  if (prev) { prev.state = 'superseded'; prev.validUntil = S.clock; prev.sensorSummary = S.sensorSummary ? NF.clone(S.sensorSummary) : null; S.sensorSummary = null; } /* souhrn ze senzoru zůstane u plánu, ke kterému patří; nové období začíná bez něj (02 #3) */
  S.plans.push(plan); S.activePlanId = plan.id; S.nextVisit = plan.validUntil;
  S.habits.forEach(function (h) { if (h.state === 'active') { h.state = 'done'; h.endedAt = S.clock; } });
  d.habits.forEach(function (cid) {
    var c = (catalog || []).filter(function (x) { return x.id === cid; })[0] || { id: cid, title: cid };
    S.habits.push({ id: NF.uid('H'), catalogId: cid, title: c.title, short: c.short || c.title, why: c.why || '', how: c.how || '', item: c.item, planId: plan.id, state: 'prepared', training: c.training || [] });
  });
  S.draft = null;
  if (prev && S.onboarding) S.onboarding.readback = null; /* kontrola 4 (06 B6): u nového plánu se změněnou dávkou se pacient znovu zeptá „Souhlasí s tím, co vám řekl lékař?“ */
  NF.log(S, 'plan.vydan', plan.id, { doses: plan.doses, habits: plan.habits, instructions: plan.instructions, targets: plan.targets });
  return { ok: true, plan: plan };
};
NF.handover = function (S) { var p = NF.activePlan(S); if (!p) return { ok: false, error: 'Není co předat.' }; p.handedOver = true; NF.log(S, 'plan.predan', p.id); return { ok: true }; };
NF.confirmUnderstanding = function (S) {
  var p = NF.activePlan(S);
  if (!p || !p.handedOver) return { ok: false, error: 'Plán zatím nebyl předán.' };
  if (p.understood) return { ok: true };
  if (!S.training || S.training.result !== 'done') return { ok: false, error: 'Zaučení u sestry nebylo dokončeno. Návyky nezačnou platit.' };
  p.understood = true; p.understoodAt = S.clock; /* C3 (31/03): od kdy pacient plán převzal – sloty, které začaly dřív, se ve „Včera chybí“ nepočítají */
  S.habits.forEach(function (h) { if (h.planId === p.id && h.state === 'prepared') { h.state = 'active'; h.activatedAt = S.clock; } });
  /* Nový plán: milníky za minulý plán se nevystavují, zapíšou se jako viděné (A29, 27. 10. 2026). */
  if (p.previousId) { NF.checkMilestones(S); fbState(S).milestones.forEach(function (m) { m.seen = true; }); }
  NF.log(S, 'plan.prevzat', p.id);
  return { ok: true };
};
NF.activeHabits = function (S) { return S.habits.filter(function (h) { return h.state === 'active' && NF.habitUsable(S, h); }); };
NF.hasHabit = function (S, catalogId) { return NF.activeHabits(S).some(function (h) { return h.catalogId === catalogId; }); };

/* Zaučení: body z návyků + tři pevné. */
NF.FIXED_TRAINING = [
  ['app', 'Pacient si otevřel aplikaci a našel obrazovku Dnes', 'today'],
  ['safety', 'Pacient našel bezpečnostní pravidla v části Bezpečí', 'safety'],
  ['contacts', 'Pacient ví, kam se obrátit s technickým problémem a kam se zdravotním', 'safety'],
  ['export', 'Pacient ví, že před kontrolou pošle do ordinace export ze senzoru', null, 'oral'], /* export nahrává sestra na kontrole (18. 10. 2026); pacient ho před kontrolou pošle do ordinace (vlastník 27. 10. 2026, SCHEMA 74) */
  ['alerts', 'Pacient má v aplikaci senzoru zapnuté upozornění na nízkou glukózu', null, 'oral'], /* kontrola 4 (06 A2): NutriFee nízkou glukózu nehlídá */
  ['reminders', 'Pacient si se sestrou vybral časy připomínek v telefonu a ví, že připomínka nemusí přijít a inzulin si píchá podle plánu i bez ní', null, 'oral'] /* kontrola 4 (bod 4; 06 B13) */
];
NF.trainingItems = function (S) {
  var list = NF.FIXED_TRAINING.map(function (x) { return { id: x[0], text: x[1], page: x[2], oral: x[3] === 'oral' }; }); /* oral = sestra ověří ústně */
  var p = NF.activePlan(S);
  (p ? NF.planHabits(S, p.id) : []).forEach(function (h) {
    (h.training || []).forEach(function (t) { if (!list.some(function (l) { return l.id === t.id; })) list.push(t); });
  });
  return list;
};
NF.TRAINING_REASONS = [['app', 'nerozumí ovládání aplikace'], ['sight', 'špatně vidí na displej'], ['helper', 'potřebuje pomoc blízké osoby'], ['refuse', 'nechce aplikaci používat'], ['time', 'nebyl čas, nový termín']];
NF.trainingReasonLabel = function (k) { var x = NF.TRAINING_REASONS.filter(function (r) { return r[0] === k; })[0]; return x ? x[1] : k; };
NF.finishTraining = function (S, result, reason) {
  if (S.role !== 'nurse') return { ok: false, error: 'Zaučení potvrzuje sestra.' };
  if (result === 'done' && !NF.trainingItems(S).every(function (t) { return S.training.steps[t.id]; })) return { ok: false, error: 'Dokud některý bod chybí, zaučení nelze dokončit.' };
  if (result === null) { S.training.result = null; S.training.reason = null; NF.log(S, 'zauceni.zmena', 'výsledek zrušen'); return { ok: true }; }
  if (S.training.result === result && (reason || null) === (S.training.reason || null)) return { ok: true };
  S.training.result = result; S.training.at = S.clock; S.training.by = S.nurse.id; S.training.reason = result === 'failed' ? (reason || null) : null;
  NF.log(S, 'zauceni.' + result, S.training.reason ? NF.trainingReasonLabel(S.training.reason) : '');
  return { ok: true };
};
/* Shrnutí zaučení pro lékaře (zařazení, kontrola): sestra ho zapsala, lékař ho vidí až v ordinaci. */
NF.trainingSummary = function (S) {
  var t = S.training || {};
  if (!t.result) return { state: 'pending', text: 'zaučení zatím neproběhlo' };
  if (t.result === 'done') return { state: 'done', text: 'zaučení dokončeno ' + NF.fmtDateTime(t.at) };
  var missing = NF.trainingItems(S).filter(function (x) { return !t.steps[x.id]; }).length;
  return { state: 'failed', text: 'zaučení se nezdařilo ' + NF.fmtDateTime(t.at) + (t.reason ? ' · ' + NF.trainingReasonLabel(t.reason) : '') + (missing ? ' · nezvládnuto ' + NF.plural(missing, 'bod', 'body', 'bodů') : '') + ' · návyky neplatí' };
};

/* ---------- jídla ----------
   Jídlo má název a tři hrubé štítky (příloha, příprava, velikost). Žádná makra. */
NF.TAGS = {
  source: [['brambory', 'brambory'], ['ryze', 'rýže'], ['testoviny', 'těstoviny'], ['knedlik', 'knedlík'], ['pecivo', 'pečivo'], ['ovesne', 'kaše, müsli, cereálie'], ['lusteniny', 'luštěniny, quinoa'], ['ovoce', 'ovoce'], ['sladke', 'sladké, dezert'], ['tekute', 'tekuté (nápoj, polévka)'], ['bez', 'bez přílohy']],
  prep: [['varene', 'vařené / pečené'], ['smazene', 'smažené / tučné'], ['kase', 'kaše / rozmixované']],
  plate: [['priloha', 'jen příloha'], ['priloha_maso', 'příloha + maso'], ['priloha_maso_zelenina', 'příloha + maso + zelenina'], ['zelenina', 'hlavně zelenina, trochu přílohy'], ['polevka', 'polévka nebo nápoj']]
};
/* Obrázek talíře říká, co v jídle je (R27): bílkovina → má smysl doplněk?; zelenina/maso → je co sníst napřed? */
NF.PLATE = { priloha: { protein: false, veg: false }, priloha_maso: { protein: true, veg: false }, priloha_maso_zelenina: { protein: true, veg: true }, zelenina: { protein: false, veg: true }, polevka: { protein: false, veg: false } };
NF.plateHas = function (food) { var t = (food && food.tags) || {}; return NF.PLATE[t.plate] || { protein: false, veg: false }; };
NF.foodForm = function (food) { var t = (food && food.tags) || {}; return t.source === 'tekute' || t.plate === 'polevka' ? 'tekute' : 'pevne'; };
NF.defaultPrep = function (source) { return source === 'ovesne' ? 'kase' : 'varene'; };
NF.tagLabel = function (group, key) { var x = NF.TAGS[group].filter(function (k) { return k[0] === key; })[0]; return x ? x[1] : key; };
/* Název složený ze složek, když pacient nic nenapíše (R27). */
NF.autoName = function (tags) {
  var base = NF.tagLabel('source', tags.source).split(',')[0].split(' (')[0];
  if (tags.source === 'bez') base = tags.plate === 'zelenina' ? 'zelenina' : tags.plate === 'priloha_maso' || tags.plate === 'priloha_maso_zelenina' ? 'maso' : 'jídlo';
  if (tags.source === 'tekute') base = tags.plate === 'polevka' ? 'polévka' : 'nápoj';
  var suf = { priloha: '', priloha_maso: ' s masem', priloha_maso_zelenina: ' s masem a zeleninou', zelenina: ' se zeleninou', polevka: '' }[tags.plate] || '';
  if (tags.source === 'bez' && tags.plate === 'zelenina') suf = '';
  if (tags.plate === 'polevka' && tags.source !== 'tekute') suf = ' (polévka)';
  var n = base + suf + (tags.prep === 'smazene' ? ', smažené' : tags.prep === 'kase' ? ', kaše' : '');
  return n.charAt(0).toUpperCase() + n.slice(1);
};
NF.normName = function (s) {
  var STOP = ['s', 'se', 'a', 'v', 've', 'na', 'od', 'z', 'ze', 'k', 'ke', 'u', 'po', 'do', 'i'];
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(function (w) { return w && STOP.indexOf(w) < 0; });
};
/* Existující jídlo s překryvem slov ≥ 50 % → „Myslíte X?“ (duplicity se spojují dotazem, ne tichým sloučením).
   Závěrečná kontrola 23. 10. 2026 (01 #1): shoda jediného slova nestačí – u dvouslovných názvů to byla často jen příloha
   („Kuskus se zeleninou“ ≠ „Tofu se zeleninou“, „Polévka“ ≠ „Gulášová polévka“). Shodovat se musí první obsahové slovo obou názvů,
   nebo aspoň dvě obsahová slova („Řízek s kaší od maminky“ ~ „Smažený řízek s bramborovou kaší“). Překlepy a chybějící háčky zachytí shoda od začátku slova. */
NF.likeName = function (S, name) {
  var w = NF.normName(name); if (!w.length) return null;
  var same = function (x, y) { return y.indexOf(x) === 0 || x.indexOf(y) === 0; };
  var best = null, bestScore = 0;
  S.foods.forEach(function (f) {
    var fw = NF.normName(f.name); if (!fw.length) return;
    var common = w.filter(function (x) { return fw.some(function (y) { return same(x, y); }); }).length, score = common / Math.max(w.length, fw.length);
    if (score >= 0.5 && score > bestScore && (same(w[0], fw[0]) || common >= 2)) { best = f; bestScore = score; }
  });
  return best;
};
NF.foodById = function (S, id) { return S.foods.filter(function (f) { return f.id === id; })[0] || null; };
/* Nové jídlo = jen název (rozhodnutí vlastníka 15. 10. 2026): žádné složení. Nepovinné „Je to jako X“ (tags.like = id) nebo 'none'. */
NF.addFood = function (S, name, tags, opts) {
  tags = tags || {}; opts = opts || {};
  if (!name || !name.trim()) return { ok: false, error: 'Napište, co bylo k jídlu.' };
  var same = S.foods.filter(function (x) { return x.name.trim().toLowerCase() === name.trim().toLowerCase(); })[0];
  if (same) return { ok: true, food: same, existing: true }; /* stejný název = totéž jídlo (CH-8) */
  if (!opts.force) { var like = NF.likeName(S, name); if (like) return { ok: true, suggest: like }; }
  var f = { id: NF.uid('F'), name: name.trim(), tags: { like: tags.like || null }, custom: true, addedAt: S.clock };
  /* Kontrola 4 (02 B8): „Je to jako X“ – nové jídlo převezme údaje X pro šablonu rad (bez složek; pořadí zůstává obecné). */
  var likeF = tags.like && tags.like !== 'none' ? NF.foodById(S, tags.like) : null;
  if (likeF && (Array.isArray(likeF.slozky) || likeF.likeFrom)) { f.likeFrom = likeF.id; f.bilkovina = !!likeF.bilkovina; f.jednolite = !!likeF.jednolite; f.doplnek = likeF.doplnek || null; }
  if (tags.source) { f.tags.source = tags.source; f.tags.prep = tags.prep; f.tags.plate = tags.plate; } /* jen pro jídla s předvyplněnými údaji (databáze) */
  S.foods.push(f);
  NF.log(S, 'jidlo.pridano', f.name, f);
  return { ok: true, food: f };
};
NF.fold = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
NF.searchFoods = function (S, q, meal) {
  var n = NF.fold(q).trim();
  /* Shoda od začátku slova, ne podřetězec („ka“ najde kaši, ne bábovku) – D9, 6. 10. 2026; bez ohledu na diakritiku („rizek“ najde řízek, 23. 10. 2026). */
  var hit = function (name) { return (' ' + NF.fold(name)).indexOf(' ' + n) >= 0; };
  return S.foods.filter(function (f) { return !n || hit(f.name); })
    .sort(function (a, b) { return (b.custom ? 1 : 0) - (a.custom ? 1 : 0) || a.name.localeCompare(b.name, 'cs'); }).slice(0, 12);
};
NF.recentFoods = function (S, meal) {
  var seen = {}, out = [];
  S.episodes.slice().reverse().forEach(function (e) {
    if (meal && e.meal !== meal) return;
    if (!seen[e.foodId]) { seen[e.foodId] = 1; var f = NF.foodById(S, e.foodId); if (f) out.push(f); }
  });
  return out.slice(0, 6);
};
/* Podobné = stejný zdroj sacharidů + úprava + forma (tekuté/pevné), R28; jídlo, které pacient sám označil za podobné, se přidá; „Ne, je jiné“ podobnost vypne. */
NF.similarFoods = function (S, food) {
  if (!food || !food.tags) return [];
  if (food.tags.like === 'none') return [];
  var form = NF.foodForm(food);
  var out = food.tags.source ? S.foods.filter(function (f) { return f.id !== food.id && f.tags && f.tags.source && f.tags.source === food.tags.source && f.tags.prep === food.tags.prep && NF.foodForm(f) === form; }) : []; /* bez předvyplněných údajů jen „Je to jako“ */
  if (food.tags.like) { var l = NF.foodById(S, food.tags.like); if (l && out.indexOf(l) < 0) out.push(l); }
  return out;
};
/* Nabídka „Je to jako …“: známá jídla pacienta podle četnosti (nejvýš 5). */
NF.likeCandidates = function (S) {
  var min = NF.param(S, 'R-REAKCE', 'minKnown', 3);
  return S.foods.map(function (f) { var st = NF.foodStats(S, f.id); return { f: f, n: st.n, eaten: st.eaten }; }).filter(function (x) { return x.n >= min; }).sort(function (a, b) { return b.eaten - a.eaten; }).slice(0, 5).map(function (x) { return x.f; });
};

/* ---------- zápisy jídel ----------
   ep = { id, planId, meal, foodId, at, portion, portionPlanned, insulin:{prescribed, confirmed, units, time}, doseKey,
          advice:[{lever,item,accepted,reason}], context, points:[{min,mmol}], peak, at2h } */
NF.PORTIONS = [['smaller', 'Menší než obvykle'], ['usual', 'Obvyklá'], ['bigger', 'Větší než obvykle']]; /* pořadí zleva menší · obvyklá · větší (vlastník 23. 10. 2026) */
NF.INSULIN = { as: 'podle plánu', other: 'jinak', none: 'bez inzulinu', unknown: 'nevím', pending: 'čeká na potvrzení', snack: 'svačina bez inzulinu' };
NF.peakOf = function (points, win) {
  win = win || 120;
  var pts = (points || []).filter(function (p) { return p.mmol != null && p.min <= win; });
  return pts.length ? Math.max.apply(null, pts.map(function (p) { return p.mmol; })) : null;
};
/* Vzestup = vrchol minus hodnota před jídlem (R30: vysoký start dne se nepřipisuje jídlu). */
NF.riseOf = function (points, win) { var pk = NF.peakOf(points, win), p0 = (points || []).filter(function (p) { return p.mmol != null; })[0]; return pk == null || !p0 ? null : NF.r1(pk - p0.mmol); };
/* Okno vrcholu: u smažených/tučných jídel delší (R30), vrchol přichází později. */
NF.windowFor = function (S, food) { var t = NF.param(S, 'R-REAKCE', 'okno_tucne_min', 0); return t > 0 && food && food.tags && food.tags.prep === 'smazene' ? t : NF.param(S, 'R-REAKCE', 'okno_min', 120); };
/* V cíli pro učení: podle R-REAKCE.kriterium buď vrchol ≤ horní cíl (výchozí od 21. 10. 2026 – jedna míra pro pacienta všude), nebo vzestup ≤ vzestup_max (připraveno). Shoda zápisů se měří dál vzestupem. */
NF.epInTarget = function (S, ep, food) {
  food = food || NF.foodById(S, ep.foodId); var win = NF.windowFor(S, food);
  if (NF.glucoseOf(S, ep, food).peakBound === 'under') return false; /* nejvyšší hodnota „pod 4“ = pokles, nikdy „v cíli“ (23. 10. 2026) */
  if (NF.param(S, 'R-REAKCE', 'kriterium', 'vzestup') === 'vzestup') { var r = NF.epRise(S, ep, food); return r != null && r <= NF.param(S, 'R-REAKCE', 'vzestup_max', 3); }
  var pk = NF.epPeak(S, ep, food); return pk != null && pk <= NF.targets(S).high;
};
NF.peakOfS = function (S, points, food) { return NF.peakOf(points, NF.windowFor(S, food)); };
NF.minutesDiff = function (a, b) { return Math.round((NF.parse(b) - NF.parse(a)) / 60000); };
NF.at2h = function (points) { var p = (points || []).filter(function (x) { return x.mmol != null && x.min === 120; })[0]; return p ? p.mmol : null; };
/* Data ze senzoru bez napojení na výrobce (rozhodnutí vlastníka 15. 10. 2026): pacient opíše hodnotu před jídlem a nejvyšší hodnotu do 2 h z aplikace senzoru;
   export ze senzoru nahraný později hodnoty nahradí přesným průběhem. */
NF.hasImport = function (ep) {
  var pts = (ep.points || []).filter(function (p) { return p.mmol != null; });
  return !!ep.importedAt && pts.length >= 4 && pts.some(function (p) { return p.min === 0; }) && pts.some(function (p) { return p.min >= 120; });
};
NF.hasManual = function (ep) { return !!(ep.manual && ep.manual.before != null && ep.manual.peak != null); };
NF.glucoseOf = function (S, ep, food) {
  var ip = ep.importedAt ? (ep.points || []).filter(function (p) { return p.mmol != null; }) : [];
  if (ip.length) return { before: ip[0].mmol, peak: NF.peakOf(ep.points, NF.windowFor(S, food || NF.foodById(S, ep.foodId))), source: 'import' };
  if (NF.hasManual(ep)) return { before: ep.manual.before, peak: ep.manual.peak, source: 'manual', beforeBound: ep.manual.beforeBound || null, peakBound: ep.manual.peakBound || null };
  return { before: null, peak: null, source: null };
};
/* Čip „pod 4“ / „nad 15“ je hranice se značkou, ne vymyšlené číslo (23. 10. 2026): uloží se { mmol: 4, bound: 'under' } / { mmol: 15, bound: 'over' };
   pacient vidí „pod 4“ / „nad 15“, výpočty berou hranici (nad cílem, resp. pokles), nikdy „v cíli“. */
NF.chip = function (v) {
  if (v === 'low') return { mmol: 4, bound: 'under' };
  if (v === 'high') return { mmol: 15, bound: 'over' };
  if (v === 'none' || v == null || v === '') return { mmol: null, bound: null };
  var n = Number(String(v).replace(',', '.')); return { mmol: n >= 1 && n <= 30 ? NF.r1(n) : null, bound: null };
};
NF.mmolB = function (v, bound) { return v == null ? '–' : bound === 'under' ? 'pod ' + NF.mmol(v) : bound === 'over' ? 'nad ' + NF.mmol(v) : NF.mmol(v); };
/* Glukóza pod 4 podle čipu: hranice se značkou „pod“, nebo opsané číslo pod 4. */
NF.isLowValue = function (v, bound) { return v != null && (bound === 'under' || v < 4); };
NF.epPeak = function (S, ep, food) { return NF.glucoseOf(S, ep, food).peak; };
NF.epRise = function (S, ep, food) { var g = NF.glucoseOf(S, ep, food); return g.peak == null || g.before == null ? null : NF.r1(g.peak - g.before); };
/* Kdy je výsledek zápisu k dispozici: po importu, nebo po zapsání nejvyšší hodnoty. */
NF.readyAt = function (ep) { return ep.importedAt || (ep.manual && ep.manual.peakAt) || null; };
NF.complete = function (ep) {
  if (NF.hasManual(ep)) return true;
  var pts = (ep.points || []).filter(function (p) { return p.mmol != null; });
  return pts.length >= 4 && pts.some(function (p) { return p.min === 0; }) && pts.some(function (p) { return p.min >= 120; });
};
NF.doseKey = function (S, meal) { var p = NF.activePlan(S); return p && p.doses[meal] ? meal + ':' + p.doses[meal].units : meal + ':0'; };
/* Započítaný zápis: úplná data, inzulin potvrzen podle plánu, mimo nemoc, obvyklá porce, stejná dávka jako teď. */
/* Včas = inzulin nejvýš `pred_min` před jídlem a nejvýš `po_min` po něm (D-CISTA; 30 / 15 min, rozhodnuto 1. 10. 2026). */
NF.minutesOf = function (iso) { var d = NF.parse(iso); return d.getHours() * 60 + d.getMinutes(); };
NF.tolerance = function (S) { return { before: NF.param(S, 'D-CISTA', 'pred_min', 30), after: NF.param(S, 'D-CISTA', 'po_min', 15) }; };
NF.onTime = function (S, ep) {
  if (!ep.insulin || !ep.insulin.time) return false;
  var t = NF.tolerance(S), hm = String(ep.insulin.time).split(':');
  var diff = (Number(hm[0]) * 60 + Number(hm[1])) - NF.minutesOf(ep.at); /* záporné = před jídlem */
  if (diff > 720) diff -= 1440; else if (diff < -720) diff += 1440; /* přes půlnoc (P9) */
  return diff < 0 ? -diff <= t.before : diff <= t.after;
};
/* Svačina do N minut po hlavním jídle (D-CISTA.svacina_min, výchozí 120) zkreslí vrchol → jídlo není započítané (R4, 6. 10. 2026). */
NF.snackAfter = function (S, ep) {
  if (NF.isSnack(ep.meal)) return false;
  var w = NF.param(S, 'D-CISTA', 'svacina_min', 120), end = NF.addMin(ep.at, w);
  return S.episodes.some(function (x) { return NF.isSnack(x.meal) && x.at > ep.at && x.at <= end; });
};
/* Pozdní podání = inzulin až po jídle (v toleranci pro učení, ale ne pro návrh k dávce; R11). */
NF.latePodani = function (S, ep) {
  if (!ep.insulin || !ep.insulin.time) return false;
  var hm = String(ep.insulin.time).split(':'), diff = (Number(hm[0]) * 60 + Number(hm[1])) - NF.minutesOf(ep.at);
  if (diff > 720) diff -= 1440; else if (diff < -720) diff += 1440;
  return diff > 0;
};
/* Zápis z doby nemoci: štítek zápisu, nebo kalendářní den nemoci (stejná období jako tkanina a počet dnů nemoci). Zapnutí přepínače odpoledne
   tak vyřadí i ranní jídlo téhož dne – nemoc začala dřív, než ji pacient označil (15 odst. 8; klinická bezpečnost 23. 10. 2026). */
NF.illnessPeriods = function (S) {
  if (!NF.nemocOn(S)) return []; /* zamítnutá P-NEMOC: nemoc se neoznačuje, zápisy vstupují do učení (A05, Q1) */
  var periods = (S.illnessLog || []).map(function (q) { return NF.day(q.to) > NF.day(q.from) && NF.parse(q.to).getHours() < 12 ? { from: q.from, to: NF.addDays(q.to, -1) } : q; }); /* nemoc ukončená dopoledne už svůj den neznačí */
  if (NF.ill(S)) periods.push({ from: S.illness.from, to: S.clock });
  return periods;
};
NF.inIllness = function (S, ep) {
  if (!NF.nemocOn(S)) return false;
  if (ep.context === 'illness') return true;
  var d = NF.day(ep.at);
  return NF.illnessPeriods(S).some(function (q) { return d >= NF.day(q.from) && d <= NF.day(q.to); });
};
/* Stejná dávka jako teď: stejný klíč a jídlo od data, od kterého současná dávka platí (učení per dávka od změny, 23. 10. 2026). */
NF.sameDoseNow = function (S, ep) { var since = NF.doseSince(S, ep.meal); return ep.doseKey === NF.doseKey(S, ep.meal) && (!since || ep.at >= since); };
/* Jedno znění „neobvyklého dne“ všude: volba v kroku 3, otázka při rozchodu, důvod vyřazení, položky R-REAKCE a D-CISTA (kontrola 2, C1). */
NF.UNUSUAL = 'stres, málo spánku, alkohol';
NF.usableEp = function (S, ep) {
  if (!NF.complete(ep) || NF.inIllness(S, ep) || ep.context === 'unusual') return false;
  if (NF.isSnack(ep.meal)) return !!(ep.insulin && ep.insulin.confirmed === 'snack');
  return ep.insulin && ep.insulin.confirmed === 'as' && NF.onTime(S, ep) && ep.portion === 'usual' && NF.sameDoseNow(S, ep) && !NF.snackAfter(S, ep);
};
/* Pořadí důvodů podle klinické váhy (A1, nezávislá kontrola 27. 10. 2026): porce a inzulin před chybějícími daty – zápis s menší porcí a poklesem
   se nesmí v návrhu schovat pod „chybí hodnoty“. */
NF.whyNotUsable = function (S, ep) {
  if (NF.inIllness(S, ep)) return 'z doby nemoci';
  if (ep.context === 'unusual') return 'neobvyklý den (' + NF.UNUSUAL + ')';
  var snack = NF.isSnack(ep.meal);
  if (!snack && ep.portion !== 'usual') return ep.portion === 'smaller' ? 'menší porce než obvykle' : ep.portion === 'bigger' ? 'větší porce než obvykle' : 'jiná než obvyklá porce';
  if (!snack && (!ep.insulin || ep.insulin.confirmed !== 'as')) return 'inzulin nepotvrzen podle plánu';
  if (!NF.complete(ep)) return 'chybí hodnoty glukózy (před jídlem a nejvyšší do 2 h, nebo export ze senzoru)';
  if (snack) return null;
  if (!NF.onTime(S, ep)) return 'inzulin mimo čas (víc než ' + NF.tolerance(S).before + ' min před jídlem nebo ' + NF.tolerance(S).after + ' min po něm)';
  if (ep.doseKey !== NF.doseKey(S, ep.meal)) return 'při jiné dávce';
  if (!NF.sameDoseNow(S, ep)) return 'z doby před změnou dávky';
  if (NF.snackAfter(S, ep)) return 'svačina do ' + NF.param(S, 'D-CISTA', 'svacina_min', 120) + ' min po jídle';
  return null;
};
/* Do návrhu k dávce vstupuje přísnější podmnožina: bez zpětných zápisů s odhadnutým časem, bez pozdního podání, bez dodatečně opraveného inzulinu (R4, R11, R6).
   Bez schválené položky D-CISTA nelze čistá data určit → žádný zápis do návrhu k dávce (zásada 4, 23. 10. 2026). */
NF.usableForDose = function (S, ep) { return NF.usable(S, 'D-CISTA') && NF.usableEp(S, ep) && !ep.retro && !NF.latePodani(S, ep) && !ep.insulinCorrected; };
NF.whyNotForDose = function (S, ep) {
  if (!NF.usable(S, 'D-CISTA')) return 'pravidlo čistých dat je v registru zamítnuté';
  var w = NF.whyNotUsable(S, ep); if (w) return w;
  if (ep.retro) return 'zpětný zápis s odhadnutým časem (jen do učení)';
  if (NF.latePodani(S, ep)) return 'pozdní podání – inzulin až po jídle (jen do učení)';
  if (ep.insulinCorrected) return 'inzulin dodatečně opraven (jen do učení)';
  return null;
};

/* ---------- učení: reakce na jídlo ----------
   Pravidlo R-REAKCE: známé jídlo od minKnown započítaných zápisů; rozmezí = p10–p90 vrcholu 0–120 min;
   „v cíli“ = vrchol ≤ horní cíl. Pravidlo R-PODOBNOST: podobné = shoda štítků příloha + příprava. */
/* Stejné jídlo u dvou jídel dne se slévá jen při stejné dávce; kontext = slot, ve kterém se o jídle rozhoduje (jinak nejčastější). */
NF.dominantMeal = function (S, foodId) { var c = {}; S.episodes.forEach(function (e) { if (e.foodId === foodId) c[e.meal] = (c[e.meal] || 0) + 1; }); return Object.keys(c).sort(function (a, b) { return c[b] - c[a]; })[0] || null; };
NF.sameDose = function (S, ep, meal) {
  if (!meal || ep.meal === meal) return true;
  var p = NF.activePlan(S), a = p && p.doses[ep.meal], b = p && p.doses[meal];
  return a && b ? a.units === b.units : !a && !b;
};
NF.foodStats = function (S, foodId, filter, meal, memoKey) {
  var mm = NF.memo && NF.memo.S === S && (!filter || memoKey) ? NF.memo : null, mk = mm ? 'fs|' + foodId + '|' + (meal || '') + '|' + (memoKey || '') : null;
  if (mm && mm[mk]) return mm[mk];
  var out = foodStatsRaw(S, foodId, filter, meal); if (mm) mm[mk] = out; return out;
};
function foodStatsRaw(S, foodId, filter, meal) {
  meal = meal || NF.dominantMeal(S, foodId);
  var food = NF.foodById(S, foodId);
  var eps = S.episodes.filter(function (e) { return e.foodId === foodId && (!filter || filter(e)); });
  var usable = eps.filter(function (e) { return NF.usableEp(S, e) && NF.sameDose(S, e, meal); });
  var peaks = usable.map(function (e) { return NF.epPeak(S, e, food); });
  var rises = usable.map(function (e) { return NF.epRise(S, e, food); });
  var flags = usable.map(function (e) { return NF.epInTarget(S, e, food); });
  /* Shoda zápisů (vlastník 15. 10. 2026): jídlo je známé, až když se aspoň minKnown zápisů z posledních maxUceni shoduje (rozdíl vzestupů ≤ shoda_mmol). */
  var minK = NF.param(S, 'R-REAKCE', 'minKnown', 3), maxU = NF.param(S, 'R-REAKCE', 'maxUceni', 6), shoda = NF.param(S, 'R-REAKCE', 'shoda_mmol', 3);
  var winOk = function (win) { var rr = win.filter(function (x) { return x != null; }).sort(function (a, b) { return a - b; }); for (var ci = 0; ci + minK <= rr.length; ci++) if (rr[ci + minK - 1] - rr[ci] <= shoda) return true; return false; };
  /* B3 (32/01, SCHEMA 84): hystereze – jednou známé jídlo zůstane známé, dokud shoda neselže ve dvou po sobě jdoucích oknech (okno = posledních maxUceni zápisů
     po každém novém zápisu). Jedno sváteční nebo stresové jídlo tak štítek „Známe ho“ neshodí; pacient nic nezměnil, štítek se nemá měnit. */
  var consistent = false, misses = 0, nowOk = false;
  for (var wi = 1; wi <= rises.length; wi++) {
    nowOk = winOk(rises.slice(Math.max(0, wi - maxU), wi));
    if (nowOk) { consistent = true; misses = 0; } else if (consistent && ++misses >= 2) { consistent = false; misses = 0; }
  }
  var unstableFinal = !consistent && usable.length >= maxU;
  var inT = flags.filter(Boolean).length;
  /* Do R-REAKCE.minQuantile (8) zápisů je rozmezí nejnižší–nejvyšší (percentily z mála hodnot kryjí jen část rozptylu); od té doby 10.–90. percentil (R9, 6. 10. 2026). */
  var q = usable.length >= NF.param(S, 'R-REAKCE', 'minQuantile', 8);
  var k = NF.param(S, 'R-SKORE', 'oknoZapisu', 6), rf = flags.slice(-k);
  return { eaten: eps.length, n: usable.length, peaks: peaks, flags: flags, lo: NF.r1(q ? NF.quantile(peaks, 0.1) : (peaks.length ? Math.min.apply(null, peaks) : null)), hi: NF.r1(q ? NF.quantile(peaks, 0.9) : (peaks.length ? Math.max.apply(null, peaks) : null)), quantile: q,
    med: NF.r1(NF.median(peaks)), inTarget: inT, recent: { n: rf.length, inTarget: rf.filter(Boolean).length }, list: eps, usable: usable, rises: rises, consistent: consistent, held: consistent && !nowOk, unstableFinal: unstableFinal };
}
/* Stupeň reakce (R29, A32 27. 10. 2026): dva stupně – „většinou v cíli“ (podíl v cíli ≥ R-SKORE.mirna) / „častěji nad cílem“; od R-SKORE.odKolika zápisů,
   podíl z posledních R-SKORE.oknoZapisu s hysterezí (mění se, jen když by platil i s jedním zápisem jinak); „ustálené“ od R-SKORE.ustaleneOd. Třetí stupeň zrušen. */
NF.reactionLabel = function (S, st, foodId) {
  if (!st.n || !NF.usable(S, 'R-SKORE')) return null;
  if (st.n < NF.param(S, 'R-SKORE', 'odKolika', 3)) return null;
  var mild = NF.param(S, 'R-SKORE', 'mirna', 0.5), key;
  /* Dva stupně (simulace 15. 10. 2026: tři stupně nejsou ze 6 zápisů rozlišitelné; záměna „většinou v cíli“ ↔ „častěji nad cílem“ ≤ 2 %). */
  var r = st.recent && st.recent.n ? st.recent : st;
  var lab = function (k) { return k / r.n >= mild ? 'mild' : 'strong'; };
  if (st.n < 4) { key = lab(st.inTarget); r = st; } else {
    key = lab(r.inTarget);
    var stable = lab(Math.min(r.n, r.inTarget + 1)) === key && lab(Math.max(0, r.inTarget - 1)) === key;
    if (foodId) { var store = (S.fb && S.fb.labels) || {}; if (!stable && store[foodId]) key = store[foodId]; else if (NF.labelWrite) { fbState(S).labels = store; store[foodId] = key; } } /* hystereze se ukládá jen po zápisu (NF.settleLabels), ne při vykreslení (robustnost #15) */
  }
  if (key !== 'mild' && key !== 'strong') key = 'strong'; /* uložený třetí stupeň z dřívější verze */
  var L = { mild: { key: 'mild', label: 'většinou v cíli', cls: 'ok' }, strong: { key: 'strong', label: 'častěji nad cílem', cls: 'over' } }; /* oranžová = nad cílem; červenohnědá jen pro pokles pod 4 (18. 10. 2026) */
  return { key: L[key].key, label: L[key].label, cls: L[key].cls, settled: st.n >= NF.param(S, 'R-SKORE', 'ustaleneOd', 5) };
};
/* Hystereze štítku reakce se uloží po změně dat jídla (zápis, nejvyšší hodnota, export, rozchod), ne při vykreslení. */
NF.labelWrite = false;
NF.settleLabels = function (S, foodIds) {
  var ids = foodIds || S.foods.filter(function (f) { return S.episodes.some(function (e) { return e.foodId === f.id; }); }).map(function (f) { return f.id; });
  NF.labelWrite = true;
  try { ids.forEach(function (id) { if (id && NF.foodById(S, id)) NF.confidence(S, id); }); } finally { NF.labelWrite = false; }
};
/* Odhad z podobných jídel (R28): buď jídlo, které pacient sám označil za podobné (stačí samo), nebo aspoň R-PODOBNOST.minJidel podobných jídel
   s aspoň minZapisu započítanými zápisy (nejvýš maxNaJidlo z každého) a shodou ≥ shoda; jinak se nic neodhaduje.
   Podobné jídlo jen směrem (A15, rozhodnutí vlastníka 27. 10. 2026; 15 odst. 6): pacientovi `dir` – 'in' (podíl v cíli ≥ R-SKORE.mirna, „spíš v cíli“) nebo 'over' („spíš nad cílem“).
   Žádné rozmezí ani číslo; podíl `share` zůstává jen pro výběr rad (váha R-PODOBNOST.vaha) a pacient ho nevidí. */
NF.similarPool = function (S, food, meal) {
  var mirna = NF.param(S, 'R-SKORE', 'mirna', 0.5), min = NF.param(S, 'R-REAKCE', 'minKnown', 3), cap = NF.param(S, 'R-PODOBNOST', 'maxNaJidlo', 3), minJidel = NF.param(S, 'R-PODOBNOST', 'minJidel', 3), minZapisu = NF.param(S, 'R-PODOBNOST', 'minZapisu', 6), shoda = NF.param(S, 'R-PODOBNOST', 'shoda', 0.67);
  var collect = function (foods, capN) {
    var inT = 0, n = 0, classes = [];
    foods.forEach(function (f) {
      var fs = NF.foodStats(S, f.id, null, meal); if (!fs.n) return;
      var take = capN ? fs.usable.slice(-capN) : fs.usable;
      var it = take.filter(function (e) { return NF.epInTarget(S, e, f); }).length;
      inT += it; n += take.length; classes.push(it / take.length >= 0.5 ? 'in' : 'over');
    });
    return { inT: inT, n: n, classes: classes };
  };
  var explicit = food.tags && food.tags.like && food.tags.like !== 'none' ? NF.foodById(S, food.tags.like) : null;
  if (explicit && NF.foodStats(S, explicit.id, null, meal).n >= min) {
    var c1 = collect([explicit], 0);
    return { foods: [explicit], n: c1.n, inTarget: c1.inT, share: c1.inT / c1.n, dir: c1.inT / c1.n >= mirna ? 'in' : 'over', why: 'podle jídla, které jste označili za podobné', explicit: true };
  }
  var like = NF.similarFoods(S, food).filter(function (f) { return NF.foodStats(S, f.id, null, meal).n >= 1; });
  if (like.length < minJidel) return null;
  var c = collect(like, cap); if (c.n < minZapisu) return null;
  var ins = c.classes.filter(function (x) { return x === 'in'; }).length, agree = Math.max(ins, c.classes.length - ins) / c.classes.length;
  if (agree < shoda) return null;
  return { foods: like, n: c.n, inTarget: c.inT, share: c.inT / c.n, dir: c.inT / c.n >= mirna ? 'in' : 'over', why: NF.plural(like.length, 'podobné jídlo', 'podobná jídla', 'podobných jídel') + ' ve shodě', explicit: false };
};
NF.similarWhy = function (S, food, meal) {
  var like = NF.similarFoods(S, food).filter(function (f) { return NF.foodStats(S, f.id, null, meal).n >= 1; });
  return like.length < NF.param(S, 'R-PODOBNOST', 'minJidel', 3) ? 'málo podobných jídel' : 'podobná jídla se liší';
};
/* První dojem (1 zápis) / zatím to vypadá (2 zápisy ve shodě) / zápisy se liší (R29). */
NF.impression = function (S, st) {
  var f = st.flags || [];
  if (f.length === 1) return f[0] ? 'in' : 'over';
  return f.every(Boolean) ? 'in' : f.every(function (x) { return !x; }) ? 'over' : 'mixed';
};
/* Podíl v cíli pro rady: známé = vlastní; učíme se = odhad z podobných váhou R-PODOBNOST.vaha (2) virtuálních zápisů + vlastní; od 3 vlastních jen vlastní. */
NF.blendedShare = function (S, conf) {
  var w = NF.param(S, 'R-PODOBNOST', 'vaha', 2), n = conf.st.n;
  if (conf.level === 'known') return n ? conf.st.inTarget / n : null;
  if (conf.pool) return (w * conf.pool.share + conf.st.inTarget) / (w + n);
  return n >= 2 ? conf.st.inTarget / n : null;
};
NF.confidence = function (S, foodId, meal) {
  var food = NF.foodById(S, foodId);
  meal = meal || NF.dominantMeal(S, foodId);
  var st = NF.foodStats(S, foodId, null, meal);
  if (!food) return { level: 'unknown', st: st, items: [], meal: meal };
  if (!NF.usable(S, 'R-REAKCE')) return { level: 'none', st: st, items: [], meal: meal, why: 'Pravidlo pro vyhodnocení reakce je zamítnuté; nic nevyhodnocujeme.' };
  var min = NF.param(S, 'R-REAKCE', 'minKnown', 3);
  var res = { st: st, min: min, items: ['R-REAKCE'], reaction: null, meal: meal, stage: Math.min(st.n, min) };
  if (st.n >= min && st.consistent) { res.level = 'known'; res.reaction = NF.reactionLabel(S, st, foodId); return res; }
  if (st.unstableFinal) { res.level = 'unstable'; res.impression = 'mixed'; return res; } /* zápisy se shodnout nedokázaly ani po maxUceni – lékař to vidí v podkladech */
  if (NF.usable(S, 'R-PODOBNOST')) {
    var pool = NF.similarPool(S, food, meal);
    if (pool) { res.pool = pool; res.items.push('R-PODOBNOST'); res.like = pool.foods; }
    else if (!(food.tags && food.tags.like === 'none')) res.similarWhy = NF.similarWhy(S, food, meal);
  }
  if (st.n >= 1) { res.level = 'learning'; res.impression = st.n >= min ? 'mixed' : NF.impression(S, st); res.stage = Math.min(st.n, min); return res; }
  res.level = res.pool ? 'similar' : 'unknown';
  return res;
};
/* Učení podle jídla dne říct pacientovi (rozhodnutí vlastníka 25. 10. 2026): chování beze změny (slévá se jen při stejné dávce),
   ale když má jídlo zápisy u víc jídel dne s rozdílnou dávkou, pacient vidí stav ke každému zvlášť. extraMeal = jídlo dne, které se právě zapisuje.
   Vrací skupiny jídel dne se stejnou dávkou (každá s vlastním stavem učení), nebo null, když se nic neliší. Svačina (bez inzulinu) se nepočítá. */
NF.slotGroups = function (S, foodId, extraMeal) {
  var has = {}; S.episodes.forEach(function (e) { if (e.foodId === foodId && !NF.isSnack(e.meal)) has[e.meal] = true; });
  if (extraMeal && !NF.isSnack(extraMeal)) has[extraMeal] = true;
  var meals = NF.MEALS.map(function (x) { return x[0]; }).filter(function (m) { return has[m]; });
  if (meals.length < 2) return null;
  var groups = [];
  meals.forEach(function (m) { var g = groups.filter(function (x) { return NF.sameDose(S, { meal: m }, x[0]); })[0]; if (g) g.push(m); else groups.push([m]); });
  if (groups.length < 2) return null;
  return groups.map(function (g) { return { meals: g, conf: NF.confidence(S, foodId, g[0]) }; });
};
NF.mealsKe = function (meals, cap) {
  var l = meals.map(function (m, i) { return NF.mealLabel(m, cap && i === 0 ? 'Ke' : 'ke'); });
  return l.length > 1 ? l.slice(0, -1).join(', ') + ' a ' + l[l.length - 1] : l[0];
};
/* Stav jednoho jídla dne slovy (texty položky R-REAKCE, klíče slot*): „k obědu učíme se 1 ze 4“, „k večeři zatím neznáme“. */
NF.slotStateText = function (S, group) {
  var T = NF.texts(S, 'R-REAKCE'); if (!T || !group) return '';
  var c = group.conf, min = c.min || NF.param(S, 'R-REAKCE', 'minKnown', 4), n = Math.min(c.st.n, min);
  var key = c.level === 'known' ? 'slotKnown' : c.level === 'learning' ? 'slotLearning' : c.level === 'similar' ? 'slotSimilar' : c.level === 'unstable' ? 'slotUnstable' : 'slotUnknown';
  return NF.fillText(T[key], { meal: NF.mealsKe(group.meals), n: n, z: NF.z(min), min: min });
};
/* Všechny stavy jídla po jídlech dne („k obědu … · k večeři …“), nebo prázdné, když se dávky neliší. */
NF.slotStates = function (S, foodId) {
  var g = NF.slotGroups(S, foodId); if (!g || !NF.texts(S, 'R-REAKCE')) return [];
  return g.map(function (x) { return NF.slotStateText(S, x); });
};
/* Jedna věta do detailu jídla: „K obědu a k večeři máte jinou dávku, proto se učíme zvlášť.“ */
NF.slotWhyText = function (S, foodId) {
  var g = NF.slotGroups(S, foodId), T = NF.texts(S, 'R-REAKCE'); if (!g || !T || !T.slotWhy) return '';
  return NF.fillText(T.slotWhy, { meals: NF.mealsKe(g.map(function (x) { return x.meals[0]; }), true) });
};
/* Jídla opakovaně nad cílem – jedna věta pro lékaře (S-SILNA): aspoň `silnych` zápisů nad cílem, nebo 2 zápisy se vzestupem aspoň o `dvaNad_mmol` nad hranici. Pacientovi žádný zákaz. */
NF.strongFoods = function (S) {
  if (!NF.usable(S, 'S-SILNA')) return [];
  var minStrong = NF.param(S, 'S-SILNA', 'silnych', 3), over = NF.param(S, 'S-SILNA', 'dvaNad_mmol', 3), vmax = NF.param(S, 'R-REAKCE', 'vzestup_max', 3);
  return S.foods.map(function (f) {
    if (NF.dominantMeal(S, f.id) === 'snack') return null; /* svačina bez inzulinu se do jídel opakovaně nad cílem nepočítá (není k posouzení dávky) */
    var st = NF.foodStats(S, f.id), overN = st.n - st.inTarget, rises = st.rises.filter(function (x) { return x != null; });
    /* Kontrola 2 (B9, 29. 10. 2026): jídlo, které je většinou v cíli (3 z 25 nad cílem), mezi „opakovaně nad cílem“ nepatří – navíc musí být častěji nad cílem
       (v cíli pod hranicí R-SKORE.mirna); řazení podle počtu zápisů nad cílem, ne podle toho, jak často se jídlo jí. */
    /* Kontrola 3, B6: „častěji nad cílem“ ze stejného okna jako stupeň reakce v tabulce (R-SKORE oknoZapisu, posledních 8 zápisů) – jídlo v tabulce „většinou v cíli“ do věty nepatří */
    var rb = st.recent && st.recent.n ? st.recent : st, mostlyOver = rb.n > 0 && rb.inTarget / rb.n < NF.param(S, 'R-SKORE', 'mirna', 0.5);
    var hit = (overN >= minStrong && mostlyOver) || (st.n === 2 && overN === 2 && rises.length === 2 && rises.every(function (x) { return x >= vmax + over; }));
    return hit ? { food: f, st: st, conf: NF.confidence(S, f.id), overN: overN, med: NF.r1(NF.median(rises)) } : null;
  }).filter(Boolean).sort(function (a, b) { return b.overN - a.overN || b.st.eaten - a.st.eaten; });
};
/* Rozdíl zápisů jídla: nejdřív vysvětlit ze známého (rada, s ní bývá níž). Otázka „co bylo jinak“ je jen jedna – při rozchodu nového zápisu
   (NF.divergence, R-REAKCE.rozchod_mmol); druhá otázka „Děláte ho pokaždé stejně?“ s vlastním prahem zrušena (B4, nezávislá kontrola 27. 10. 2026; 15 odst. 6). */
NF.unstable = function (S, foodId) {
  var f = NF.foodById(S, foodId); if (!f) return null;
  var st = NF.foodStats(S, foodId); if (st.n < NF.param(S, 'R-REAKCE', 'minKnown', 3)) return null;
  var rises = st.rises.filter(function (x) { return x != null; });
  if (rises.length < 3 || Math.max.apply(null, rises) - Math.min.apply(null, rises) < NF.param(S, 'R-REAKCE', 'rozchod_mmol', 3.5)) return null;
  var base = NF.baseStats(S, foodId), lev = NF.leverStats(S, foodId)[0];
  if (base.n && lev && lev.st.n && Math.abs((lev.st.med || 0) - (base.med || 0)) >= 1.5) return { kind: 'lever', lever: lev.lever };
  return null;
};
/* Rady zápisu, které se počítají do srovnání rad, „Zkoušené rady“, výsledku i milníků (A06, Q3, 27. 10. 2026):
   procházka ve zpětném zápisu zapsaném později než R-PROCHAZKA.okno_min po jídle vrchol neovlivnila – nepočítá se (u starších dat, nové se po okně nenabízí). */
NF.walkWindow = function (S) { return NF.param(S, 'R-PROCHAZKA', 'okno_min', 60); };
NF.countedAdvice = function (S, ep) {
  var late = ep && ep.retro && ep.recordedAt && NF.minutesDiff(ep.at, ep.recordedAt) > NF.walkWindow(S);
  return ((ep && ep.advice) || []).filter(function (a) { return !(late && a.lever === 'walk'); });
};
NF.acceptedLever = function (S, ep, l) { return NF.countedAdvice(S, ep).some(function (a) { return a.lever === l && a.accepted === true; }); };
/* Zápis se dvěma a více přijatými radami (porce se počítá): výsledek se připíše každé z nich se značkou „spolu s další radou“ (A16, Q7). */
NF.multiAdvice = function (S, ep) { return NF.countedAdvice(S, ep).filter(function (a) { return a.accepted === true; }).length >= 2; };
NF.WITH_OTHER = 'spolu s další radou';
/* Zkoušené rady: zápisy s přijatou radou (páka) vs. bez ní; `multi` = kolik z nich mělo přijatou i další radu. */
NF.leverStats = function (S, foodId, meal) {
  var out = [];
  Object.keys(NF.LEVERS).forEach(function (l) {
    if (l === 'portion') return;
    var withL = NF.foodStats(S, foodId, function (e) { return NF.acceptedLever(S, e, l); }, meal, 'lever:' + l);
    if (withL.n) out.push({ lever: l, st: withL, multi: withL.usable.filter(function (e) { return NF.multiAdvice(S, e); }).length });
  });
  return out.sort(function (a, b) { return (b.st.inTarget / b.st.n) - (a.st.inTarget / a.st.n); });
};
NF.baseStats = function (S, foodId, meal) {
  return NF.foodStats(S, foodId, function (e) { return !NF.countedAdvice(S, e).some(function (a) { return a.accepted === true && a.lever !== 'portion'; }); }, meal, 'base');
};
/* „S radou bývalo níž“ u jednoho jídla jen podle pravidla R10 (S-SOUHRN: ≥ min_n zápisů s radou i bez ní a rozdíl mediánů ≥ rozdil_mmol; A10). */
NF.leverLower = function (S, foodId, ls, meal) {
  var base = NF.baseStats(S, foodId, meal), min = NF.param(S, 'S-SOUHRN', 'min_n', 8), d = NF.param(S, 'S-SOUHRN', 'rozdil_mmol', 1.0);
  return !!(ls && ls.st.n >= min && base.n >= min && ls.st.med != null && base.med != null && base.med - ls.st.med >= d);
};

/* ---------- rady ----------
   Zásada 3: před píchnutím porce k obvyklé oběma směry; po píchnutí a při „nevím“ jen z větší zpět k obvyklé;
   nikdy „snězte víc“. Rady bez změny množství kdykoli (mimo nemoc jen ty bezpečné). */
NF.LEVERS = {
  portion: { label: 'Obvyklá porce', item: 'R-PORCE', carbs: true },
  addon: { label: 'Doplněk k jídlu', item: 'R-DOPLNEK', carbs: false, illnessSafe: false, beforeOnly: true },
  order: { label: 'Pořadí jídla', item: 'R-PORADI', carbs: false, illnessSafe: false }, /* při nemoci k jídlu neradíme vůbec (R8, 15 odst. 8) */
  walk: { label: 'Procházka po jídle', item: 'R-PROCHAZKA', carbs: false, illnessSafe: false }
};
NF.effectiveBolus = function (state) { return state === 'before' ? 'before' : 'after'; };
NF.adviceGate = function (S) {
  var p = NF.activePlan(S);
  if (S.participation !== 'active') return { ok: false, why: 'Účast je ukončená.' };
  if (!p || !p.understood) return { ok: false, why: 'Poradíme vám, až převezmete plán od lékaře.' };
  if (!NF.usable(S, 'R-REAKCE')) return { ok: false, why: 'Vyhodnocení reakce je v registru zamítnuté; neradíme.' };
  return { ok: true };
};
/* Hodí se rada k jídlu (bez ohledu na data a čas)? Stejné pravidlo pro krok 3 i detail jídla (A07, 27. 10. 2026).
   Kontrola 3, A2 (rozhodnutí vlastníka 29. 10. 2026): jídlo ze seznamu nese jen strukturované údaje (slozky, bilkovina, jednolite, doplnek; app/data/foods.js)
   a text rady skládá šablona schválené položky R-PORADI / R-DOPLNEK; nové jídlo (jen název) údaje nemá a dostane obecné znění z téže položky. */
NF.dbFood = function (food) { return !!(food && Array.isArray(food.slozky)); };
NF.leverFits = function (food, l) {
  if (!food) return false;
  if (food.leverOff && food.leverOff[l]) return false; /* pacient řekl „v jídle to není“ – rada se u tohoto jídla už nenabízí */
  if (l === 'addon' && NF.dbFood(food) && (food.bilkovina || !food.doplnek)) return false; /* jídlo ze seznamu bílkovinu nebo tuk už má */
  if (l === 'order' && NF.dbFood(food) && (food.jednolite || !food.slozky.length)) return false; /* jednolité jídlo nebo jídlo bez části, kterou jde sníst napřed (Q2) */
  /* Kontrola 4 (02 B8): nové jídlo „jako X“ nese údaje X (bílkovina, jednolité, skupina doplňku); složky nezná, pořadí zůstává obecné „pokud jsou v jídle“. */
  if (l === 'addon' && !NF.dbFood(food) && food.bilkovina) return false;
  if (l === 'order' && !NF.dbFood(food) && food.jednolite) return false;
  return true;
};
/* Seznamy položky (aktuální verze; u staršího uloženého stavu bez seznamů z katalogu registru). */
NF.itemLists = function (S, id) {
  var r = NF.item(S, id); if (r && r.lists) return r.lists;
  var d = NF.data && NF.data.registry ? NF.data.registry().filter(function (x) { return x.id === id; })[0] : null;
  return (d && d.lists) || {};
};
/* Složky, které rada k pořadí jmenuje: jen ze seznamu R-PORADI a jen ty, které jídlo má (nejvýš „nejvys“). */
NF.orderParts = function (S, food) {
  var L = NF.itemLists(S, 'R-PORADI'), map = L.slozky || {};
  return ((food && food.slozky) || []).filter(function (k) { return !!map[k]; }).slice(0, L.nejvys || 2).map(function (k) { return map[k]; });
};
NF.orderFirst = function (S, food) {
  var L = NF.itemLists(S, 'R-PORADI');
  if (!NF.dbFood(food)) return L.nove || '';
  return NF.orderParts(S, food).join(' a ');
};
/* Doplněk: jen ze seznamu povolených doplňků R-DOPLNEK, podle skupiny jídla (nové jídlo: skupina „nove“). */
NF.addonList = function (S, food) {
  var L = NF.itemLists(S, 'R-DOPLNEK'), ok = L.povolene || [], g = (L.skupiny || {})[NF.dbFood(food) ? food.doplnek : (food && food.doplnek) || 'nove'] || []; /* nové jídlo „jako X“: skupina X (kontrola 4, B8) */
  return g.filter(function (x) { return ok.indexOf(x) >= 0; });
};
NF.joinOr = function (list) { return list.length < 2 ? (list[0] || '') : list.slice(0, -1).join(', ') + ' nebo ' + list[list.length - 1]; };
NF.addonFor = function (S, food) { return NF.joinOr(NF.addonList(S, food)); };
/* Stažení doplňku (kontrola 3, B7; R-DOPLNEK stahnout_po): u jídla (k témuž jídlu dne), kde pacient doplněk přijal aspoň N× v započítaných zápisech
   a ani jednou nebyl v cíli, se doplněk už nenabízí – bez ohledu na to, jestli je jídlo už známé. Report počítá z týchž zápisů (NF.leverStats). */
/* Kontrola 4 (02 B7, 30. 10. 2026): jako text registru a 15 odst. 6 – počítají se všechny zápisy jídla (k témuž jídlu dne), u kterých pacient doplněk přijal
   a nejvyšší hodnota je známá, i ty, které do učení nejdou (jiná dávka, „nevím“, neobvyklý den). */
NF.addonTries = function (S, foodId, meal) {
  var f = NF.foodById(S, foodId), out = { n: 0, inTarget: 0 };
  S.episodes.forEach(function (e) { if (e.foodId !== foodId || (meal && e.meal !== meal) || !NF.acceptedLever(S, e, 'addon')) return; var g = NF.glucoseOf(S, e, f); if (g.peak == null) return; out.n++; if (g.peakBound !== 'under' && g.peakBound !== 'over' && g.peak <= NF.targets(S).high) out.inTarget++; });
  return out;
};
NF.addonWithdrawn = function (S, foodId, meal) {
  var t = NF.addonTries(S, foodId, meal);
  return t.n >= NF.param(S, 'R-DOPLNEK', 'stahnout_po', 3) && t.inTarget === 0;
};
/* Text rady k jídlu z položky registru s dosazením za jídlo; prázdný, když položka chybí nebo je zamítnutá. */
NF.leverText = function (S, l, food) { var meta = NF.LEVERS[l], it = meta && NF.item(S, meta.item); return it && NF.usable(S, meta.item) && it.text ? fill(S, it.text, food || {}) : ''; };
function fill(S, text, food) {
  return NF.dropRuleRefs(S, String(text || '')).replace('{addon}', NF.addonFor(S, food)).replace('{first}', NF.orderFirst(S, food)).replace('{minut}', String(NF.param(S, 'R-PROCHAZKA', 'minut', 15)));
}
NF.fillLever = fill;
/* Zásada 3 (kontrola 2, A1, 29. 10. 2026): po píchnutí a při „nevím“ s menší porcí žádná rada jíst víc. Rada k pořadí, doplňku nebo procházce smí mít
   nové znění (nová verze položky); když text mluví o množství jídla („nevynechávejte“, „snězte jako obvykle“, „dojezte“…), v riziku nízké glukózy se nenabídne. */
NF.AMOUNT_RX = /nevynechávejte|nevynechejte|dojezte|dojíst|snězte (?:ji |je |ho |to |vše |všechno )?(?:celou|celé|celý|všechno|vše|víc|více|jako obvykle)|zbytek obvyklého|přidejte si (?:přílohu|víc)|větší porci|obvyklou porci|jako obvykle/i;
NF.talksAmount = function (text) { return NF.AMOUNT_RX.test(String(text || '')); };
NF.advise = function (S, foodId, portion, bolusState, meal) {
  var food = NF.foodById(S, foodId);
  var res = { gate: NF.adviceGate(S), conf: null, items: [], blocked: [], gone: [], effective: bolusState ? NF.effectiveBolus(bolusState) : null, illness: NF.ill(S) };
  if (!food) return res;
  res.conf = NF.confidence(S, foodId, meal); meal = res.conf.meal;
  if (!bolusState) return res;
  var before = res.effective === 'before';
  /* Riziko nízké glukózy (rozhodnutí vlastníka 19. 10. 2026): glukóza teď pod 4, nebo menší porce s inzulinem v těle (podaný nebo „nevím“).
     V takovém zápisu se nenabízí procházka (pohyb glukózu dál snižuje) a obrazovka ukáže pravidlo k nízké glukóze.
     Kontrola 2 (A2, 29. 10. 2026): bezpečnostní větev se počítá PŘED bránou rad – zamítnutá R-REAKCE ani nepřevzatý plán nesmí skrýt
     pravidlo k nízké glukóze, pravidlo „Méně jídla než obvykle“ ani větu o nemoci; brána zastaví jen rady. */
  var gNow = S.meal && S.meal.foodId === foodId ? S.meal.before : null;
  res.lowNow = NF.isLowValue(gNow, S.meal && S.meal.foodId === foodId ? S.meal.beforeBound : null);
  res.smallerInBody = portion === 'smaller' && !before && bolusState !== 'none' && !NF.isSnack(meal);
  res.lowRisk = res.lowNow || res.smallerInBody;
  /* Rozhodnutí vlastníka 25. 10. 2026: při glukóze pod 4 před jídlem žádná rada (pořadí, doplněk, porce ani procházka) –
     krok 3 ukáže jen pravidlo k nízké glukóze a zápis jídla podle skutečnosti. Pořadí „nejdřív maso“ by šlo proti pravidlu „rychlé sacharidy hned“. */
  if (res.lowNow) { res.gate = { ok: false, low: true, why: NF.lowNowText(S) }; return res; }
  if (!res.gate.ok) return res;
  var meneOn = NF.hasInstruction(S, 'I-MENE'); /* odkaz jen na pravidlo, které v plánu je (23. 10. 2026); bez něj žádný odkaz do Bezpečí – na místě pravidla je oznámení (B18, 27. 10. 2026) */
  /* porce (u svačiny není dávka, ke které by se porce vztahovala) */
  if (portion !== 'usual' && !NF.isSnack(meal)) {
    var it = NF.item(S, 'R-PORCE');
    if (!NF.usable(S, 'R-PORCE')) res.blocked.push({ lever: 'portion', reason: 'item', why: 'Pravidlo k porci je zamítnuté.' });
    else if (res.illness) res.blocked.push({ lever: 'portion', reason: 'illness', why: NF.ILL_TEXT });
    else if (before || portion === 'bigger') {
      /* Věty rady jsou texty položky R-PORCE (R13); kód je nevymýšlí. */
      var TP = NF.texts(S, 'R-PORCE') || {};
      res.items.push({ lever: 'portion', item: 'R-PORCE', label: NF.LEVERS.portion.label, carbs: true,
        text: portion === 'bigger' ? (before ? TP.biggerBefore : bolusState === 'unknown' && TP.biggerUnknown ? TP.biggerUnknown : TP.biggerAfter) : TP.smaller, /* kontrola 3, C2: při „nevím“ věta netvrdí, že inzulin v těle je */
        certainty: TP.certainty || '' });
    } else {
      res.blocked.push({ lever: 'portion', reason: 'bolus', why: bolusState === 'unknown'
        ? 'Nevíte, jestli už máte inzulin píchnutý – bereme to, jako by byl. Radu k množství jídla proto nedáváme.' + (meneOn ? ' Když sníte méně než obvykle, řiďte se pravidlem „Méně jídla než obvykle“.' : '')
        : 'Inzulin už máte v těle.' + (meneOn ? ' Když sníte méně než obvykle, řiďte se pravidlem „Méně jídla než obvykle“.' : ' Radu k množství jídla proto nedáváme.') });
    }
  }
  /* rady bez změny množství */
  var lv = res.conf.level;
  var cands = [], pa = NF.planAdvice(S), reason = false;
  if (lv === 'known' || lv === 'similar' || lv === 'learning') {
    /* Rady podle podílu v cíli (prahy R-SKORE): známé z vlastních zápisů, učíme se z odhadu z podobných + vlastních (R28/R29). */
    var share = NF.blendedShare(S, res.conf);
    var needs = NF.usable(S, 'R-SKORE') && share != null && share < NF.param(S, 'R-SKORE', 'mirna', 0.5);
    if (needs) { cands = ['addon', 'order', 'walk']; reason = true; }
    else if (lv === 'known') { NF.leverStats(S, foodId, meal).forEach(function (x) { if (cands.indexOf(x.lever) < 0) cands.push(x.lever); }); }
  }
  if (reason) (pa.prefer || []).forEach(function (l) { if (cands.indexOf(l) < 0) cands.push(l); });
  cands = cands.filter(function (l) { return (pa.off || []).indexOf(l) < 0; });
  var base = lv === 'known' ? NF.baseStats(S, foodId, meal) : null;
  cands.forEach(function (l) {
    var meta = NF.LEVERS[l], it = NF.item(S, meta.item);
    if (!NF.usable(S, meta.item)) return; /* zamítnuté pravidlo → rada prostě není */
    if (res.illness && !meta.illnessSafe) return;
    if (l === 'walk' && res.lowRisk) { res.blocked.push({ lever: 'walk', reason: 'low', why: NF.walkLowWhy(S, res.lowNow) }); return; }
    if (meta.beforeOnly && !before) return; /* doplněk jen před píchnutím (6. 10. 2026) */
    if (!NF.leverFits(food, l)) return; /* „v jídle to není“, není co přidat nebo co sníst napřed */
    var ls = lv === 'known' ? NF.leverStats(S, foodId, meal).filter(function (x) { return x.lever === l; })[0] : null;
    if (l === 'addon' && NF.addonWithdrawn(S, foodId, meal)) return; /* rada stažena po N pokusech bez účinku (kontrola 3, B7: i u jídla, které ještě není známé) */
    var item = { lever: l, item: meta.item, label: meta.label, carbs: false, text: fill(S, it.text, food) };
    if (res.lowRisk && NF.talksAmount(item.text)) { res.blocked.push({ lever: l, reason: 'amount', why: 'Po píchnutí s menší porcí radu, která mluví o množství jídla, nedáváme. Řiďte se pravidlem „Méně jídla než obvykle“.' }); return; } /* zásada 3 (kontrola 2, A1) */
    if (ls) item.certainty = 'Vyzkoušeno ' + ls.st.n + '×: ' + ls.st.inTarget + ' ' + NF.z(ls.st.n) + ' ' + ls.st.n + ' v cíli' + (base && base.n ? ' (bez toho ' + base.inTarget + ' ' + NF.z(base.n) + ' ' + base.n + ')' : '') + '.';
    else if (lv === 'known') item.certainty = 'U tohoto jídla to zatím nemáme vyzkoušené. Po prvním pokusu uvidíte, jak to dopadlo.';
    else item.certainty = 'Obecná rada ze schváleného pravidla. Jak zabere právě u vás, zatím nevíme.';
    if (ls) item.with = ls.st;
    res.items.push(item);
  });
  /* 15, odst. 13: zamítnutá rada, kterou pacient u tohoto jídla dřív přijímal, dostane jednu neutrální větu. */
  var TZ = NF.texts(S, 'R-ZMIZELA');
  if (TZ) Object.keys(NF.LEVERS).forEach(function (l) {
    if (l === 'portion' || NF.usable(S, NF.LEVERS[l].item)) return;
    var tried = S.episodes.some(function (e) { return e.foodId === foodId && (e.advice || []).some(function (a) { return a.lever === l && a.accepted === true; }); });
    if (tried) res.gone.push({ lever: l, text: NF.fillText(TZ.text, { lever: NF.LEVERS[l].label }) });
  });
  return res;
};

/* Čas zpětného zápisu: hodina dne (např. 7,5) → ISO dnešního dne. */
NF.retroAt = function (S, h) {
  if (h == null) return S.clock;
  h = Number(h); if (!Number.isFinite(h) || h < 0 || h >= 24) return null; /* neplatná hodina dne: žádný čas (robustnost #4) */
  var hh = Math.floor(h), mm = Math.round((h - hh) * 60); if (mm === 60) { hh += 1; mm = 0; } if (hh > 23) { hh = 23; mm = 59; } /* 7,999 → 8:00, ne 7:60 */
  var yday = S.meal && S.meal.retro && S.meal.day && S.meal.day < NF.day(S.clock) ? S.meal.day : null; /* zpětný zápis včerejšího jídla (kontrola 4, 07 B3) */
  var at = (yday || NF.day(S.clock)) + 'T' + (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm + ':00';
  if (at > S.clock) at = NF.addDays(at, -1); /* zápis po půlnoci o včerejším jídle: čas nesmí být v budoucnosti */
  return at;
};
/* Při nemoci všude jedna věta (A19, 27. 10. 2026). */
NF.ILL_TEXT = 'K jídlu neradíme, platí pravidla pro nemoc.';
/* Věta při glukóze pod 4 před jídlem (text položky B-HYPO, rozhodnutí vlastníka 25. 10. 2026). */
/* Kontrola 3, B2: bez pravidla k nízké glukóze v plánu (zamítnutá I-HYPO nebo R-POKYNY) věta na pravidlo neodkazuje (15 odst. 12) – druhé znění téže položky. */
NF.lowNowText = function (S) { var T = NF.texts(S, 'B-HYPO') || {}, rule = NF.hasInstruction(S, 'I-HYPO'); return rule ? (T.lowNow || 'Teď neradíme – řiďte se pravidlem k nízké glukóze. Zápis jídla uložte podle skutečnosti.') : (T.lowNowBez || 'Teď neradíme. Zápis jídla uložte podle skutečnosti.'); };
/* Rada po jídle, které už je snědené: k jídlu se radit nedá; procházka se nabízí jen do R-PROCHAZKA.okno_min (60) min od jídla,
   kdy ještě zmírní vzestup. Později by se připsala vrcholu, který nemohla ovlivnit (A06, Q3, 27. 10. 2026). */
/* Bezpečnostní pravidlo v plánu (zamítnuté pravidlo v plánu není – texty se na něj neodkazují). */
NF.hasInstruction = function (S, id) { return NF.usable(S, id) && NF.instructions(S).some(function (x) { return x.id === id; }); };
NF.walkLowWhy = function (S, lowNow) {
  var hypoRef = NF.hasInstruction(S, 'I-HYPO') ? ' Řiďte se pravidlem k nízké glukóze.' : ''; /* kontrola 3, B2: na chybějící pravidlo neodkazovat */
  return lowNow ? 'Glukóza je teď pod 4 – pohyb by ji snížil ještě víc.' + hypoRef : 'Po menší porci s inzulinem v těle pohyb neradíme, glukóza by mohla klesnout pod 4.';
};
/* Zpětný zápis („Už jsem jedl“) má stejnou bezpečnostní větev jako živý zápis (23. 10. 2026): menší porce s inzulinem v těle (podle plánu, jinak, nevím)
   = riziko nízké glukózy → procházka se nenabízí, obrazovka ukáže pravidlo a po uložení se založí sledování. */
NF.adviseAfter = function (S, foodId, meal, at, portion, bolus) {
  var res = { gate: NF.adviceGate(S), items: [], blocked: [], conf: NF.confidence(S, foodId, meal), late: false, minutes: at ? Math.round((NF.parse(S.clock) - NF.parse(at)) / 60000) : null };
  var lowBefore = !!(S.meal && NF.isLowValue(S.meal.before, S.meal.beforeBound)), lowRetro = lowBefore || !!(S.meal && S.meal.low === true); /* po poklesu pod 4 se procházka nenabízí (19. 10. 2026) */
  res.lowRisk = portion === 'smaller' && NF.insulinInBody(bolus) && !NF.isSnack(meal);
  if (lowBefore) { res.lowNow = true; res.gate = { ok: false, low: true, why: NF.lowNowText(S) }; return res; } /* pod 4 při jídle: žádná rada ani zpětně (rozhodnutí vlastníka 25. 10. 2026); před bránou rad (kontrola 2, A2) */
  if (!res.gate.ok) return res;
  res.window = NF.walkWindow(S);
  if (res.minutes != null && res.minutes > res.window) { res.late = true; return res; }
  var meta = NF.LEVERS.walk, it = NF.item(S, meta.item);
  if (NF.usable(S, meta.item) && !NF.ill(S)) {
    if (lowRetro || res.lowRisk) { res.blocked.push({ lever: 'walk', reason: 'low', why: NF.walkLowWhy(S, lowRetro) }); return res; }
    var soon = res.minutes == null || res.minutes <= 60;
    res.items.push({ lever: 'walk', item: meta.item, label: meta.label, carbs: false, text: fill(S, it.text, NF.foodById(S, foodId) || {}), /* dosazení {minut} i u zpětného zápisu (27. 10. 2026) */ certainty: soon ? 'Jídlo už máte za sebou; pohyb do hodiny po jídle zmírní vzestup glukózy. Doplněk ani pořadí už teď nezměníte.' : 'Od jídla uplynulo ' + res.minutes + ' min. Vzestup už nezměníte, ale glukóza po jídle bývá zvýšená ještě 2–3 hodiny a procházka ji sníží.' });
  }
  return res;
};
/* Uložení jídla se zápisem inzulinu i rozhodnutí o radách. */
NF.saveEpisode = function (S, data) {
  var p = NF.activePlan(S);
  if (!p || !p.understood) return { ok: false, error: 'Zapisovat jde až po převzetí plánu od lékaře.' };
  if (!data.foodId) return { ok: false, error: 'Vyberte jídlo.' };
  if (NF.isSnack(data.meal)) data.insulin = { confirmed: 'snack', units: null, time: null };
  if (!data.insulin || !data.insulin.confirmed) return { ok: false, error: 'Řekněte, jak to bylo s inzulinem.' };
  var advice = (data.advice || []).map(function (a) { return { lever: a.lever, item: a.item, accepted: a.accepted === true ? true : a.accepted === false ? false : null, reason: a.reason || null }; });
  var portionTaken = advice.some(function (a) { return a.lever === 'portion' && a.accepted === true; });
  var at = data.at || S.clock, pa = NF.planAt(S, at) || p; /* dávka a plán platné v čase jídla, ne v čase zápisu (23. 10. 2026) */
  var ep = {
    id: data.id || NF.uid('E'), planId: pa.id, meal: data.meal, foodId: data.foodId, at: at, recordedAt: S.clock,
    portionPlanned: data.portion || 'usual', portion: portionTaken ? 'usual' : (data.portion || 'usual'),
    bolusAtAdvice: data.bolusState || null, retro: !!data.retro,
    insulin: { prescribed: pa.doses[data.meal] ? pa.doses[data.meal].units : null, confirmed: data.insulin.confirmed, units: data.insulin.units != null ? data.insulin.units : null, time: data.insulin.time || null },
    doseKey: pa.doses[data.meal] ? data.meal + ':' + pa.doses[data.meal].units : data.meal + ':0',
    advice: advice, context: NF.ill(S) ? 'illness' : (data.unusual ? 'unusual' : null),
    points: data.points || [], importedAt: data.importedAt || null,
    manual: { before: NF.mmolOrNull(data.before), beforeBound: data.beforeBound || null, peak: NF.mmolOrNull(data.peak), peakBound: data.peakBound || null, peakAt: NF.mmolOrNull(data.peak) != null ? S.clock : null, low: data.low === true ? true : data.low === false ? false : null }
  };
  /* Noční pokles čipem u snídaně (bod 7, 1. 11. 2026): jen u snídaně, jen se schválenou B-HYPO a jen když se na tu noc neptala otázka po večeři. */
  if (data.nightLow === true && data.meal === 'breakfast' && NF.usable(S, 'B-HYPO') && !NF.nightAsked(S, NF.day(at))) ep.manual.nightLow = true;
  if (ep.insulin.confirmed === 'as' && ep.insulin.units != null && ep.insulin.units !== ep.insulin.prescribed) ep.insulin.units = ep.insulin.prescribed; /* „podle plánu“ = dávka plánu platného při jídle */
  if (ep.insulin.confirmed === 'other' && ep.insulin.units === ep.insulin.prescribed) ep.insulin.confirmed = 'as';
  if (ep.manual.peakBound === 'under') { ep.manual.low = true; ep.manual.lowAsked = true; } /* nejvyšší hodnota „pod 4“ = pokles, otázka se už neptá */
  /* Důvod „v jídle to není“ vypne radu u tohoto jídla natrvalo (složení se nezadává, aplikace se ho dozví z odpovědi). */
  var fo = NF.foodById(S, data.foodId); if (fo) advice.forEach(function (a) { if (a.accepted === false && a.reason === 'absent') { fo.leverOff = fo.leverOff || {}; fo.leverOff[a.lever] = true; NF.log(S, 'rada.vypnuta', fo.name + ' · ' + a.lever); } });
  ep.peak = NF.epPeak(S, ep); ep.rise = NF.epRise(S, ep); ep.at2h = NF.at2h(ep.points);
  S.episodes.push(ep);
  /* Slot dříve označený „vynechaný“: zápis ho ruší a sledování po vynechání se přiřadí k zápisu, aby se jeden pokles nepočítal dvakrát (23. 10. 2026). */
  if (!NF.isSnack(ep.meal)) NF.unskipMeal(S, ep);
  /* Sledování B-HYPO i u zpětného zápisu (23. 10. 2026): menší porce s inzulinem v těle, jídlo mladší než 4 h a pokles ještě nezapsaný. */
  var fresh = !ep.retro || (NF.minutesDiff(ep.at, S.clock) < 240 && ep.manual.low !== true);
  if (!NF.isSnack(ep.meal) && ep.portion === 'smaller' && NF.insulinInBody(ep.insulin.confirmed) && fresh && !(S.hypoWatch || []).some(function (w) { return w.epId === ep.id; })) NF.addHypoWatch(S, 'smaller', ep.meal, ep.at, ep.id);
  NF.log(S, 'jidlo.zapsano', ep.id + ' ' + ep.foodId, { meal: ep.meal, portion: ep.portion, insulin: ep.insulin, advice: ep.advice, context: ep.context, usable: NF.usableEp(S, ep), whyNot: NF.whyNotUsable(S, ep) });
  if (ep.manual.nightLow) { NF.log(S, 'hypo.noc', 'v noci na ' + NF.fmtDM(ep.at) + ' pod 4 mmol/l (zapsal pacient u snídaně)', { epId: ep.id, item: 'B-HYPO' }); S.lowNotice = { at: S.clock }; } /* karta „Pokles pod 4 je zapsaný“ (nebo po opakovaných poklesech karta s obecnou radou) */
  NF.settleLabels(S, [ep.foodId]);
  NF.checkMilestones(S);
  return { ok: true, episode: ep };
};
/* Zpětný zápis do slotu označeného jako vynechaný: označení se zruší; sledování „vynecháno“ bez odpovědi se přiřadí k zápisu,
   zodpovězené „ano, pod 4“ se přenese do zápisu – pokles se počítá jednou (nález 8, 23. 10. 2026). */
NF.unskipMeal = function (S, ep) {
  var day = NF.day(ep.at), sk = S.skipped && S.skipped[day];
  if (sk && sk[ep.meal]) { delete sk[ep.meal]; NF.log(S, 'jidlo.vynechani.zruseno', ep.meal + ' · zapsáno zpětně', { meal: ep.meal, epId: ep.id }); }
  (S.hypoWatch || []).forEach(function (w) {
    if (w.kind !== 'skipped' || w.meal !== ep.meal || NF.day(w.at) !== day || w.epId) return;
    w.epId = ep.id; if (w.answer === 'yes' && ep.manual.low !== true) { ep.manual.low = true; ep.manual.lowAsked = true; }
    if (w.answer == null) { if (ep.portion === 'smaller' && NF.insulinInBody(ep.insulin.confirmed)) w.kind = 'smaller'; else w.answer = 'void'; } /* jídlo nakonec bylo v obvyklé porci: sledování ztrácí důvod */
  });
};
NF.confirmBasal = function (S, confirmed, units, time, date) {
  var p = NF.activePlan(S); if (!p) return { ok: false, error: 'Není plán.' };
  var h = NF.parse(S.clock).getHours();
  var autoDate = !date && h < 4 ? NF.day(NF.addDays(S.clock, -1)) : NF.day(S.clock); /* večerní bazál potvrzený po půlnoci (do 4:00) patří k předchozímu dni */
  var rec = { at: S.clock, date: date || autoDate, prescribed: p.doses.basal.units, confirmed: confirmed, units: units != null ? units : (confirmed === 'as' ? p.doses.basal.units : null), time: time || NF.fmtTime(S.clock) };
  if (rec.confirmed === 'other' && rec.units === rec.prescribed) rec.confirmed = 'as';
  S.basalLog = S.basalLog.filter(function (b) { return b.date !== rec.date; }).concat([rec]);
  NF.log(S, 'bazal.potvrzen', rec.confirmed + ' ' + (rec.units == null ? '' : rec.units + ' j.'), rec);
  return { ok: true };
};
/* Oprava potvrzení inzulinu do D-CISTA.oprava_min (60) minut po zápisu; opravený zápis jde do učení, ne do návrhu k dávce (R6, 6. 10. 2026). */
/* Okno opravy běží od potvrzení inzulinu (01 #2, 23. 10. 2026): u „píchnu za chvíli“ od pozdějšího potvrzení; čekající inzulin se neopravuje, odpovídá se v kartě „čeká na potvrzení“. */
NF.insulinConfirmedAt = function (ep) { return (ep.insulin && ep.insulin.confirmedAt) || ep.recordedAt || ep.at; };
NF.canCorrectInsulin = function (S, ep) { if (!ep || NF.isSnack(ep.meal) || !ep.insulin || ep.insulin.confirmed === 'pending') return false; var d = NF.minutesDiff(NF.insulinConfirmedAt(ep), S.clock); return d <= NF.param(S, 'D-CISTA', 'oprava_min', 60) && d >= 0; };
NF.correctInsulin = function (S, id, confirmed, units) {
  var ep = S.episodes.filter(function (e) { return e.id === id; })[0]; if (!ep) return { ok: false, error: 'Zápis nenalezen.' };
  if (!NF.canCorrectInsulin(S, ep)) return { ok: false, error: 'Inzulin lze opravit jen do ' + NF.param(S, 'D-CISTA', 'oprava_min', 60) + ' minut po jeho potvrzení.' };
  if (['as', 'other', 'none', 'unknown'].indexOf(confirmed) < 0) return { ok: false, error: 'Vyberte, jak to bylo s inzulinem.' };
  var from = NF.clone(ep.insulin);
  ep.insulin.confirmed = confirmed; ep.insulin.units = confirmed === 'as' ? ep.insulin.prescribed : confirmed === 'other' ? (units != null ? units : ep.insulin.units) : null;
  if (confirmed === 'other' && ep.insulin.units === ep.insulin.prescribed) ep.insulin.confirmed = 'as';
  if (confirmed === 'none' || confirmed === 'unknown') ep.insulin.time = null;
  ep.insulinCorrected = true; ep.history = ep.history || []; ep.history.push({ at: S.clock, insulinFrom: from, insulinTo: NF.clone(ep.insulin) });
  NF.log(S, 'jidlo.inzulin.opraven', id + ' ' + from.confirmed + ' → ' + ep.insulin.confirmed, { from: from, to: ep.insulin });
  return { ok: true, episode: ep };
};
/* „Uložit, píchnu za chvíli“ (rozhodnutí vlastníka 19. 10. 2026): zápis s inzulinem „čeká“; na Dnes zůstane karta, po 30 min otázka „Byl inzulin?“. Nic nehlídá, ptá se jen při otevření. */
NF.pendingInsulin = function (S) { return S.episodes.filter(function (x) { return x.insulin && x.insulin.confirmed === 'pending' && NF.minutesDiff(x.recordedAt || x.at, S.clock) <= 24 * 60; }); };
NF.confirmPendingInsulin = function (S, id, confirmed) {
  var ep = S.episodes.filter(function (e) { return e.id === id; })[0]; if (!ep || !ep.insulin || ep.insulin.confirmed !== 'pending') return { ok: false, error: 'Zápis nenalezen.' };
  if (['as', 'none', 'unknown'].indexOf(confirmed) < 0) return { ok: false, error: 'Vyberte, jak to bylo s inzulinem.' };
  ep.insulin.confirmed = confirmed; ep.insulin.units = confirmed === 'as' ? ep.insulin.prescribed : null; ep.insulin.time = confirmed === 'as' ? NF.fmtTime(S.clock) : null; ep.insulin.confirmedAt = S.clock;
  if (ep.portion === 'smaller' && confirmed !== 'none' && !(S.hypoWatch || []).some(function (w) { return w.epId === ep.id; })) NF.addHypoWatch(S, 'smaller', ep.meal, S.clock, ep.id);
  NF.log(S, 'jidlo.inzulin.potvrzen', id + ' ' + confirmed, { insulin: ep.insulin }); return { ok: true, episode: ep };
};
NF.correctEpisode = function (S, id, name) {
  var ep = S.episodes.filter(function (e) { return e.id === id; })[0]; if (!ep) return { ok: false, error: 'Zápis nenalezen.' };
  ep.history = ep.history || []; ep.history.push({ at: S.clock, from: ep.note || '', to: name }); ep.note = name;
  NF.log(S, 'jidlo.opraveno', id); return { ok: true };
};

/* ---------- zpětná vazba pacientovi (15, odst. 7b) ----------
   Chválíme snahu a návyk, ne hodnotu glukózy. Výsledek se říká věcně, poděkování patří k činu.
   Všechny texty jsou položky registru (S-VYSLEDEK, R-DIKY, R-MILNIKY, S-CESTA, S-TYDEN);
   bez schválené položky se nic neukáže. Nic z toho nejde do reportu lékaře. */
NF.fillText = function (tpl, map) { return String(tpl || '').replace(/\{(\w+)\}/g, function (_, k) { return map && map[k] != null ? NF.esc(map[k]) : ''; }); };
function fbState(S) { S.fb = S.fb || { resultSeen: {}, milestones: [], weeksSeen: {} }; return S.fb; }
NF.texts = function (S, id) { var r = NF.item(S, id); return NF.usable(S, id) && r && r.texts ? r.texts : null; };
NF.nextVisit = function (S) { var p = NF.activePlan(S); return S.nextVisit || (p && p.validUntil) || null; };
NF.LEVER_WITH = { addon: 's doplňkem', order: 's pořadím jídla', walk: 's procházkou' };
NF.leverNoun = function (l) { return { addon: 'doplněk k jídlu', order: 'jiné pořadí jídla', walk: 'procházku po jídle' }[l] || l; };

/* Poslední dnešní zápis, ke kterému už dorazila data a pacient výsledek ještě neviděl. */
NF.lastResult = function (S) {
  var T = NF.texts(S, 'S-VYSLEDEK'); if (!T) return null;
  var fb = fbState(S), day = NF.day(S.clock), high = NF.targets(S).high;
  var eps = S.episodes.filter(function (e) { var r = NF.readyAt(e); return NF.day(e.at) === day && r && r <= S.clock && !fb.resultSeen[e.id]; });
  if (!eps.length) return null;
  var ep = eps[eps.length - 1], food = NF.foodById(S, ep.foodId); if (!food) return null;
  var acc = NF.countedAdvice(S, ep).filter(function (a) { return a.accepted === true && a.lever !== 'portion'; }).map(function (a) { return a.lever; });
  var portionAcc = (ep.advice || []).some(function (a) { return a.lever === 'portion' && a.accepted === true; }); /* C4 (27. 10. 2026): návrat k obvyklé porci je přijatá rada – poděkovat, ne radit jinou */
  var peak = NF.epPeak(S, ep, food), usable = NF.usableEp(S, ep), why = NF.whyNotUsable(S, ep);
  var g = NF.glucoseOf(S, ep, food);
  var map = { food: food.name, peak: NF.mmolB(peak, g.peakBound), meal: NF.mealLabel(ep.meal, true), lever: acc.length ? NF.LEVER_WITH[acc[0]] + (NF.multiAdvice(S, ep) ? ' (' + NF.WITH_OTHER + ')' : '') : portionAcc ? 's obvyklou porcí' : '', why: why || '', base: '', sugg: '' }; /* dvě přijaté rady: značka (A16, Q7) */
  var key, minN = NF.param(S, 'S-VYSLEDEK', 'min_n', 4);
  if (peak == null) key = 'nodata';
  else if (!NF.usable(S, 'R-REAKCE')) key = 'noEval'; /* vyhodnocení reakce zamítnuté: hodnota bez verdiktu a bez rady (zásada 4, 23. 10. 2026) */
  else if (!usable && !NF.isSnack(ep.meal)) key = 'excluded'; /* nezapočítaný zápis: bez čísla a verdiktu (R7, 6. 10. 2026) */
  else if ((acc.length || portionAcc) && ep.retro && peak <= high) { key = 'okPlain'; map.food = food.name + ', ' + map.lever; } /* zpětný zápis už poděkování dostal při uložení – „Díky za pokus“ se nepřidává (A17) */
  else if (acc.length || portionAcc) {
    key = peak <= high ? 'okAdvice' : 'highAdvice';
    var base = NF.baseStats(S, food.id, ep.meal), withL = NF.leverStats(S, food.id, ep.meal).filter(function (x) { return x.lever === acc[0]; })[0];
    /* srovnání „bez toho u vás bývá“ až od min_n zápisů s radou i bez ní */
    if (key === 'okAdvice' && acc.length && base.n >= minN && withL && withL.st.n >= minN && base.lo != null) map.base = NF.fillText(T.baseNote, { lo: NF.mmol(base.lo), hi: NF.mmol(base.hi), k: withL.st.inTarget, n: withL.st.n });
  } else if (peak <= high) key = 'okPlain';
  else {
    key = 'highPlain';
    /* Rada do příště jen z rad, které pacientovi skutečně běží: schválené v registru, nevypnuté lékařem, mimo nemoc (zásada 4, 15 odst. 8; 23. 10. 2026). */
    var ill = NF.ill(S), pa = NF.planAdvice(S);
    var live = function (l) { return NF.usable(S, NF.LEVERS[l].item) && (pa.off || []).indexOf(l) < 0 && NF.leverFits(food, l) && !(l === 'addon' && NF.addonWithdrawn(S, food.id, ep.meal)); }; /* integrace SCHEMA 73: u kaše (jednolité jídlo) se pořadí nenabízí ani tady; stažený doplněk (kontrola 3, B7) taky ne */
    var best = NF.leverStats(S, food.id, ep.meal).filter(function (x) { return live(x.lever) && x.st.n >= 2 && x.st.inTarget / x.st.n >= 0.5; })[0];
    var generic = ['addon', 'order'].filter(live);
    /* Kontrola 3, C5: když se karta ptá, co bylo jinak (rozchod zápisů), radu do příště neukazuje – po odpovědi „neobvyklý den“ by si odporovaly. */
    map.sugg = ill || NF.divergence(S, ep) ? '' : best ? NF.fillText(T.suggestData, { lever: NF.leverNoun(best.lever), k: best.st.inTarget, n: best.st.n }) : generic.length === 2 ? (T.suggestGeneric || '') : generic.length === 1 ? NF.fillText(T.suggestOne || '', { lever: NF.leverNoun(generic[0]) }) : '';
  }
  var text = NF.fillText(T[key] || T.okPlain, map) + (!usable && key !== 'nodata' && key !== 'excluded' && key !== 'noEval' && why ? NF.fillText(T.unusable, { why: why }) : '');
  return { ep: ep, food: food, key: key, text: text, usable: usable, why: why, peak: key === 'excluded' ? null : peak, peakBound: g.peakBound, smaller: ep.portion === 'smaller' };
};
/* Ruční nejvyšší hodnota do 2 h (Z-GLUKOZA): připomínka po okno_min od jídla; „nevím“ zápis vyřadí z učení, ale uloží. */
/* Rutina: když pacient odpověděl na tutéž radu u téhož jídla aspoň `min`×, vrátí poslední odpověď (rada se sbalí na „jako minule“). */
NF.lastAnswers = function (S, foodId, lever, min) {
  var ans = S.episodes.filter(function (e) { return e.foodId === foodId; }).map(function (e) { return (e.advice || []).filter(function (a) { return a.lever === lever && a.accepted !== null && a.accepted !== undefined; })[0]; }).filter(Boolean);
  return ans.length >= (min || 3) ? ans[ans.length - 1] : null;
};
NF.mmolOrNull = function (v) { var n = v != null && v !== '' ? NF.r1(Number(String(v).replace(',', '.'))) : null; return n >= 1 && n <= 30 ? n : null; };
/* Čipy po celých mmol/l (vlastník 18. 10. 2026): 'low' = pod 4, 'high' = nad 15, 'none' = nemám – hodnota je hranice se značkou (NF.chip, 23. 10. 2026). */
NF.chipValue = function (v) { return NF.chip(v).mmol; };
NF.setManualLow = function (S, epId, v) {
  var ep = S.episodes.filter(function (x) { return x.id === epId; })[0]; if (!ep) return { ok: false, error: 'Zápis nenalezen.' };
  ep.manual = ep.manual || { before: null, peak: null, peakAt: null }; ep.manual.low = v === 'yes' ? true : v === 'no' ? false : null; ep.manual.lowAsked = true;
  NF.log(S, 'glukoza.nejnizsi', epId, { low: ep.manual.low, item: 'B-HYPO' }); return { ok: true };
};
/* Sledování po menší porci s podaným inzulinem nebo po vynechaném jídle s inzulinem (B-HYPO): připomínka za pripominka_min, otázka „bylo pod 4?“. */
NF.addHypoWatch = function (S, kind, meal, at, epId) {
  if (!NF.usable(S, 'B-HYPO')) return null; /* zamítnutá položka: sledování se nezakládá a otázka se neptá (zásada 4, 23. 10. 2026) */
  S.hypoWatch = S.hypoWatch || [];
  var when = at || S.clock, night = meal === 'dinner'; /* po večeři se ptáme až ráno: pokles bývá mezi 22. a 24. h a otázka ve 22 h by budila (18. 10. 2026) */
  var w = { id: NF.uid('W'), kind: kind, meal: meal, at: when, epId: epId || null, answer: null, night: night, askAt: night ? NF.day(NF.addDays(when, 1)) + 'T05:00:00' : null };
  S.hypoWatch.push(w); NF.log(S, 'hypo.sledovani', kind + ' ' + meal, { item: 'B-HYPO' }); return w;
};
/* Do kdy otázka platí: po jídle 24 h; noční otázka celý den, kdy se ptá (do další večeře). Po uplynutí sledování nezaniká – zůstane „bez odpovědi“ pro lékaře (23. 10. 2026). */
NF.hypoWatchUntil = function (w) { return w.askAt ? NF.day(w.askAt) + 'T23:59:59' : NF.addMin(w.at, 24 * 60); };
NF.hypoWatchState = function (S, w) {
  if (w.answer != null) return w.answer === 'void' ? 'void' : 'answered';
  var m = NF.param(S, 'B-HYPO', 'pripominka_min', 60);
  if (S.clock > NF.hypoWatchUntil(w)) return 'unanswered';
  var due = w.askAt ? NF.parse(S.clock) >= NF.parse(w.askAt) : NF.minutesDiff(w.at, S.clock) >= m;
  return due ? 'due' : 'waiting';
};
NF.pendingHypoWatch = function (S) {
  if (!NF.usable(S, 'B-HYPO')) return [];
  return (S.hypoWatch || []).filter(function (w) { return NF.hypoWatchState(S, w) === 'due'; });
};
/* Sledování dnes založené a dosud bez odpovědi (čeká, nebo je na řadě): na Dnes nese pravidlo hned, ne až s otázkou. */
NF.openHypoWatch = function (S) {
  if (!NF.usable(S, 'B-HYPO')) return [];
  return (S.hypoWatch || []).filter(function (w) { var st = NF.hypoWatchState(S, w); return st === 'due' || st === 'waiting'; });
};
NF.answerHypoWatch = function (S, id, v) {
  var w = (S.hypoWatch || []).filter(function (x) { return x.id === id; })[0]; if (!w) return { ok: false, error: 'Záznam nenalezen.' };
  w.answer = v === 'yes' ? 'yes' : v === 'no' ? 'no' : 'unknown'; w.answeredAt = S.clock;
  if (w.epId && w.answer !== 'unknown') { var ep = S.episodes.filter(function (x) { return x.id === w.epId; })[0]; if (ep) { ep.manual = ep.manual || { before: null, peak: null, peakAt: null }; ep.manual.low = w.answer === 'yes'; ep.manual.lowAsked = true; } }
  NF.log(S, 'hypo.odpoved', id, { answer: w.answer, item: 'B-HYPO' }); return { ok: true, low: w.answer === 'yes' };
};
/* Nízké hodnoty: z průběhu (pod dolní cíl do 4 h po jídle), z opsaného „pod 4“ a z odpovědí sledování; za posledních `days` dní. */
NF.lowEvents = function (S, days) {
  var t = NF.targets(S), from = days ? NF.addDays(S.clock, -days) : null, out = [];
  S.episodes.forEach(function (e) {
    if (from && NF.parse(e.at) < NF.parse(from)) return;
    var pts = (e.points || []).some(function (x) { return x.mmol != null && x.min <= 240 && x.mmol < t.low; });
    /* SCHEMA 84 (rozhodnutí vlastníka 4. 11. 2026, bod 3): „čistý“ pokles = při obvyklé porci a dávce potvrzené podle plánu a včas; jen takový blokuje větev „zvýšit“ (D-POSTUP poklesy_jen_ciste). */
    var clean = e.portion === 'usual' && !!(e.insulin && e.insulin.confirmed === 'as') && NF.onTime(S, e), why = e.portion === 'smaller' ? 'menší porce' : e.portion === 'bigger' ? 'větší porce' : !(e.insulin && e.insulin.confirmed === 'as') ? 'jiná nebo nepotvrzená dávka' : !NF.onTime(S, e) ? 'dávka mimo čas' : null;
    if (pts) out.push({ at: e.at, source: 'senzor', meal: e.meal, epId: e.id, clean: clean, why: why });
    else if (e.manual && e.manual.low === true) out.push({ at: e.at, source: 'pacient', meal: e.meal, epId: e.id, clean: clean, why: why });
  });
  (S.hypoWatch || []).forEach(function (w) { if (w.answer === 'yes' && !w.epId && (!from || NF.parse(w.at) >= NF.parse(from))) out.push({ at: w.at, source: 'pacient', meal: w.meal, clean: false, why: 'vynechané jídlo s inzulinem' }); });
  /* Noční pokles (rozhodnutí vlastníka 1. 11. 2026, bod 7): nepovinný čip u snídaně „V noci klesla glukóza pod 4“. Pokles patří k noci před snídaní
     (datum dne snídaně, 0:00), počítá se do B-HYPO a v reportu je u bazálu. Noc, na kterou se už ptala otázka po menší nebo vynechané večeři, se nepočítá podruhé. */
  NF.nightLows(S).forEach(function (x) { if (!from || NF.parse(x.at) >= NF.parse(from)) out.push(x); });
  /* Jeden pokles k témuž jídlu dne se počítá jednou, ať přišel ze zápisu, ze sledování nebo z obojího (nález 8, 23. 10. 2026). */
  var seen = {};
  out = out.filter(function (x) { var k = NF.day(x.at) + ':' + x.meal; if (seen[k]) return false; seen[k] = 1; return true; });
  return out.sort(function (a, b) { return a.at < b.at ? -1 : 1; });
};
/* Noční poklesy, které pacient zapsal čipem u snídaně (bod 7, 1. 11. 2026). Bez B-HYPO se nepočítají (čip se nenabízí). */
NF.nightAsked = function (S, day) { return (S.hypoWatch || []).some(function (w) { return w.night && w.askAt && NF.day(w.askAt) === day; }); };
NF.nightLows = function (S) {
  if (!NF.usable(S, 'B-HYPO')) return [];
  return S.episodes.filter(function (e) { return e.meal === 'breakfast' && e.manual && e.manual.nightLow === true && !NF.nightAsked(S, NF.day(e.at)); })
    .map(function (e) { return { at: NF.day(e.at) + 'T00:00:00', source: 'pacient', meal: 'night', night: true, epId: e.id }; });
};
/* Opakované poklesy (B-HYPO poklesy/dny): karta na Dnes s obecnou radou (texts.opakovane), bez výzvy volat (vlastník 27. 10. 2026, SCHEMA 74).
   Pacient ji zavře „Rozumím“; znovu se ukáže až s dalším poklesem (S.hypoAlertSeen = čas posledního poklesu v okamžiku zavření). */
NF.hypoAlert = function (S) {
  if (!NF.usable(S, 'B-HYPO')) return null;
  var n = NF.param(S, 'B-HYPO', 'poklesy', 2), d = NF.param(S, 'B-HYPO', 'dny', 7), ev = NF.lowEvents(S, d);
  return ev.length >= n ? { count: ev.length, days: d, events: ev, last: ev[ev.length - 1].at, seen: !!(S.hypoAlertSeen && NF.parse(S.hypoAlertSeen) >= NF.parse(ev[ev.length - 1].at)) } : null;
};
NF.hypoAlertSeen = function (S) { var a = NF.hypoAlert(S); if (!a) return; S.hypoAlertSeen = a.last; S.hypoRuleSeen = S.clock; S.lowNotice = null; /* C4 (32/01): pravidlo I-HYPO pacient viděl – příště v kartě sbalené */ NF.log(S, 'hypo.opakovane', a.count + ' za ' + a.days + ' dní', { count: a.count, days: a.days, item: 'B-HYPO' }); };
/* Čip „nad 15“ (glukóza teď před jídlem nebo nejvyšší po jídle): obrazovka hned ukáže pravidlo k vysoké glukóze (I-VYSOKA) a zápis jde do stopy
   (vlastník 27. 10. 2026, SCHEMA 74). Aplikace živou glukózu nevidí, „déle než 3 hodiny“ nepozná – spouštěčem je čip. */
NF.noteHigh = function (S, where, epId) {
  NF.log(S, 'pravidlo.vysoka', where === 'peak' ? 'nejvyšší po jídle nad 15 mmol/l' : 'glukóza teď nad 15 mmol/l', { where: where, epId: epId || null, shown: NF.hasInstruction(S, 'I-VYSOKA'), item: 'I-VYSOKA' });
};
/* Souhrn ze senzoru z importu (čas v cíli, pod, velmi nízko, nad; dostupnost); přepíše dřívější jen při stejném nebo delším pokrytí. */
NF.sensorSummaryFrom = function (S, readings) {
  if (!readings || !readings.length) return null;
  var t = NF.targets(S), days = {}; readings.forEach(function (r) { days[r.at.slice(0, 10)] = 1; });
  var nDays = Object.keys(days).length, n = readings.length, below = 0, very = 0, above = 0;
  readings.forEach(function (r) { if (r.mmol < 3.0) very++; if (r.mmol < t.low) below++; else if (r.mmol > t.high) above++; });
  var pct = function (k) { return Math.round(k / n * 100); };
  /* A5 (31/03): dostupnost podle skutečného intervalu měření v exportu (medián rozestupů po sobě jdoucích měření: 5 min, 15 min…), ne pevně po 5 min. */
  var gaps = []; for (var i = 1; i < n; i++) { var g = NF.minutesDiff(readings[i - 1].at, readings[i].at); if (g > 0) gaps.push(g); }
  var step = Math.max(1, Math.round(NF.median(gaps) || 5)), perDay = 1440 / step;
  return { period: NF.fmtShort(readings[0].at) + ' – ' + NF.fmtShort(readings[n - 1].at), availability: Math.min(100, Math.round(n / (nDays * perDay) * 100)), interval: step, tir: 100 - pct(below) - pct(above), below: pct(below), veryLow: pct(very), above: pct(above), days: nDays, source: 'import' };
};
NF.pendingPeakAsk = function (S) {
  var win = NF.param(S, 'Z-GLUKOZA', 'pripominka_min', NF.param(S, 'R-REAKCE', 'okno_min', 120));
  return S.episodes.filter(function (e) { return !NF.hasImport(e) && e.manual && e.manual.peak == null && !e.manual.skipped && NF.minutesDiff(e.at, S.clock) >= win && NF.minutesDiff(e.at, S.clock) <= 24 * 60; });
};
NF.setManualPeak = function (S, epId, value, bound) {
  var ep = S.episodes.filter(function (x) { return x.id === epId; })[0]; if (!ep) return { ok: false, error: 'Zápis nenalezen.' };
  ep.manual = ep.manual || { before: null, peak: null, peakAt: null };
  if (value == null || value === '') { ep.manual.skipped = true; NF.log(S, 'glukoza.nejvyssi.neznama', epId); return { ok: true, skipped: true }; }
  var v = NF.r1(Number(String(value).replace(',', '.'))); if (!(v >= 1 && v <= 30)) return { ok: false, error: 'Zadejte hodnotu v mmol/l (1–30).' };
  ep.manual.peak = v; ep.manual.peakBound = bound === 'under' || bound === 'over' ? bound : null; ep.manual.peakAt = S.clock; ep.peak = NF.epPeak(S, ep); ep.rise = NF.epRise(S, ep);
  var low = ep.manual.peakBound === 'under';
  if (low) { ep.manual.low = true; ep.manual.lowAsked = true; } /* nejvyšší hodnota „pod 4“ = pokles; otázka „byla pod 4?“ se neptá (nález 10, 23. 10. 2026) */
  NF.log(S, 'glukoza.nejvyssi', epId, { before: ep.manual.before, peak: v, bound: ep.manual.peakBound, rise: ep.rise, low: low, item: 'Z-GLUKOZA' });
  NF.settleLabels(S, [ep.foodId]);
  return { ok: true, ep: ep, low: low };
};
/* Rozchod zápisů (vlastník 15. 10. 2026): když se nový zápis liší od dřívějších o ≥ shoda_mmol, jedna otázka – stejné · jiná příloha nebo množství · jinak připravené · jiný den. */
NF.divergence = function (S, ep) {
  if (!ep || ep.divergeAsked || !NF.usableEp(S, ep)) return null;
  if (!NF.usable(S, 'R-REAKCE')) return null; /* kontrola 3, B3: práh rozchod_mmol je parametr zamítnuté položky – otázka se neptá */
  var f = NF.foodById(S, ep.foodId); if (!f) return null;
  var st = NF.foodStats(S, ep.foodId), shoda = NF.param(S, 'R-REAKCE', 'rozchod_mmol', 3.5);
  var others = st.usable.filter(function (e) { return e.id !== ep.id && NF.parse(e.at) < NF.parse(ep.at); }).map(function (e) { return NF.epRise(S, e, f); }).filter(function (x) { return x != null; });
  var mine = NF.epRise(S, ep, f); if (mine == null || !others.length) return null;
  var med = NF.median(others); if (Math.abs(mine - med) < shoda) return null;
  /* B14 (kontrola 2): pacientovi nejvyšší hodnota (jeho slovo), ne „vzestup“; „nad 15“ je hranice, ne číslo */
  var g = NF.glucoseOf(S, ep, f), peaksBefore = st.usable.filter(function (e) { return e.id !== ep.id && NF.parse(e.at) < NF.parse(ep.at); }).map(function (e) { return NF.epPeak(S, e, f); }).filter(function (x) { return x != null; });
  return { ep: ep, food: f, mine: mine, med: NF.r1(med), higher: mine > med, peak: g.peak, peakBound: g.peakBound, peakMed: peaksBefore.length ? Math.round(NF.median(peaksBefore)) : null };
};
NF.answerDivergence = function (S, epId, answer) {
  var ep = S.episodes.filter(function (x) { return x.id === epId; })[0]; if (!ep) return { ok: false, error: 'Zápis nenalezen.' };
  var f = NF.foodById(S, ep.foodId); ep.divergeAsked = answer; var out = { ok: true, answer: answer };
  if (answer === 'day') { ep.context = 'unusual'; out.text = 'Dobře, tenhle zápis do učení nepočítáme.'; }
  else if (answer === 'amount') { ep.portion = 'other'; out.text = 'Dobře, zápis zůstává u tohoto jídla jako jiné množství; do učení ho nepočítáme.'; } /* C11: jiné množství je porce, ne jiné jídlo */
  else if (answer === 'side' || answer === 'prep') {
    var r = NF.addFood(S, f.name + (answer === 'side' ? ' (jiná příloha)' : ' (jinak připravené)'), { like: f.id }, { force: true });
    if (r.ok) { ep.foodId = r.food.id; out.text = 'Založili jsme „' + r.food.name + '“ jako samostatné jídlo a tenhle zápis patří k němu. Příště vyberte to, které zrovna jíte.'; out.food = r.food; }
  } else out.text = 'Dobře. Měříme dál; jídlo bude známé, až se zápisy shodnou.';
  NF.log(S, 'jidlo.rozchod', epId, { answer: answer, item: 'R-REAKCE' });
  NF.settleLabels(S, [f && f.id, ep.foodId]);
  return out;
};
/* Export ze senzoru (Z-IMPORT): převod souboru s časem a hodnotou na měření NutriFee (čas + mmol/l). Implementace makety; o podobě exportu se na obrazovkách nemluví
   (vlastník 27. 10. 2026: jak bude export vypadat a jak ho převést, je otevřený úkol ostré aplikace). Bez knihoven. */
NF.parseSensorCsv = function (text) {
  var lines = String(text || '').replace(/\r/g, '').split('\n').filter(function (l) { return l.trim(); }); if (!lines.length) return [];
  /* hlavička může být až na 2.–3. řádku (první řádek bývá metadata exportu) */
  var hi = -1; for (var h = 0; h < Math.min(4, lines.length); h++) if (/timestamp|čas|cas\b|time|datum|date/i.test(lines[h]) && /glucose|glukóza|glukoza|hodnota|mmol|mg\/dl/i.test(lines[h])) { hi = h; break; }
  var headLine = hi >= 0 ? lines[hi] : lines[0];
  var cnt = function (s, ch) { return (s.match(new RegExp('\\' + ch, 'g')) || []).length; };
  var sep = cnt(headLine, ';') >= cnt(headLine, ',') && cnt(headLine, ';') >= cnt(headLine, '\t') ? ';' : cnt(headLine, '\t') > cnt(headLine, ',') ? '\t' : ',';
  var unq = function (x) { return String(x).trim().replace(/^"|"$/g, '').trim(); }; /* pole v uvozovkách (uložení z tabulkového programu, robustnost #7) */
  var head = headLine.split(sep).map(function (x) { return unq(x).toLowerCase(); }), ti = -1, gi = -1, mgdl = false;
  head.forEach(function (x, i) { if (ti < 0 && /timestamp|čas|cas\b|time|datum|date/.test(x)) ti = i; });
  head.forEach(function (x, i) { if (gi < 0 && /historic glucose|glucose value|glukóza|glukoza|glucose|hodnota|mmol|mg\/dl/.test(x) && !/scan|strip|ketone/.test(x)) { gi = i; mgdl = /mg\/dl/.test(x); } });
  /* Integrace SCHEMA 73 (15 odst. 6a): bez rozpoznané hlavičky (sloupec času a glukózy) soubor převést nejde → odmítnout, nehádat sloupce. */
  var start = hi >= 0 ? hi + 1 : 0; if (ti < 0 || gi < 0) { var none = []; none.skipped = 0; none.format = null; return none; }
  var out = [], skipped = 0; /* řádky s neplatným časem nebo hodnotou se zahodí a spočítají (robustnost #6) */
  for (var i = start; i < lines.length; i++) {
    var c = lines[i].split(sep).map(unq); if (c.length <= Math.max(ti, gi)) continue;
    var g = String(c[gi]).trim();
    if (sep === ',' && c.length === head.length + 1 && /^\d{1,2}$/.test(g) && /^\d{1,2}$/.test(String(c[gi + 1] || '').trim())) g = g + '.' + String(c[gi + 1]).trim(); /* desetinná čárka uvnitř čárkou odděleného souboru */
    var at = NF.parseSensorTime(String(c[ti]).trim()), v = parseFloat(g.replace(',', '.'));
    if (mgdl && v > 0) v = v / 18;
    if (!at || !(v > 0.5 && v < 40)) { skipped++; continue; }
    out.push({ at: at, mmol: NF.r1(v) });
  }
  out.sort(function (a, b) { return a.at < b.at ? -1 : 1; }); out.skipped = skipped;
  return out; /* soubor bez měření se odmítne (NF.IMPORT_REJECT) */
};
/* Obecná hláška bez řeči o formátech (vlastník 27. 10. 2026, SCHEMA 74). */
NF.IMPORT_REJECT = 'Tento soubor neumíme načíst. Zkontrolujte, že jde o export ze senzoru, a zkuste to znovu. Ze souboru jsme nic nenačetli.';
NF.parseSensorTime = function (s) {
  var y, mo, d, h, mi, m = String(s).match(/^(\d{1,2})[-.\/](\d{1,2})[-.\/](\d{4})[ T](\d{1,2}):(\d{2})/);
  if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; h = +m[4]; mi = +m[5]; }
  else { m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/); if (!m) return null; y = +m[1]; mo = +m[2]; d = +m[3]; h = +m[4]; mi = +m[5]; }
  /* Neexistující datum nebo čas (32. 13., 31. 4., 25:99) se zahodí, netiše neposune (robustnost #6). */
  var dt = new Date(y, mo - 1, d, h, mi);
  if (y < 2000 || y > 2100 || h > 23 || mi > 59 || dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  var p2 = function (n) { return ('0' + n).slice(-2); };
  return y + '-' + p2(mo) + '-' + p2(d) + 'T' + p2(h) + ':' + p2(mi) + ':00';
};
/* Shoda opsané nejvyšší hodnoty s exportem (31/02, oprava při A1): čip „nad 15“ znamená víc než 15 a „pod 4“ méně než 4 – shoduje se, když export leží
   za hranicí (s tolerancí); jinak rozdíl čísel do Z-IMPORT.shoda_mmol. Dřív se „nad 15“ porovnávalo jako 15 a export 17 vyšel jako neshoda. */
NF.peakAgrees = function (man, mp, tol) {
  if (!man || man.peak == null || mp == null) return false;
  if (man.peakBound === 'over') return mp >= man.peak - tol;
  if (man.peakBound === 'under') return mp <= man.peak + tol;
  return Math.abs(mp - man.peak) <= tol;
};
NF.importReadings = function (S, readings) {
  var win = NF.param(S, 'R-REAKCE', 'okno_min', 120), after = NF.param(S, 'Z-IMPORT', 'po_jidle_min', 180), filled = 0, nights = 0;
  var tol = NF.param(S, 'Z-IMPORT', 'shoda_mmol', 1), agree = { n: 0, ok: 0 }, manualOnly = 0; /* 21. 10. 2026: shoda opsané nejvyšší hodnoty s exportem – doklad pro studii */
  if (!readings || !readings.length) return { ok: false, error: NF.IMPORT_REJECT };
  /* C6 (31/03): tentýž export podruhé nic nového nepřidá; hláška to řekne a údaje z prvního nahrání zůstanou. */
  var prevI = S.sensorImport;
  if (prevI && prevI.readings === readings.length && prevI.from === readings[0].at && prevI.to === readings[readings.length - 1].at && !S.episodes.some(function (ep) { return !NF.hasImport(ep) && ep.at >= prevI.from && ep.at <= prevI.to && (ep.recordedAt || ep.at) > (prevI.at || ''); })) { /* mezitím zapsané jídlo z období exportu by se doplnilo – pak se načítá znovu */
    prevI.again = S.clock; NF.log(S, 'senzor.import', 'tentýž export znovu – nic nového', { item: 'Z-IMPORT', again: true });
    return { ok: true, same: true, readings: readings.length, filled: 0, nights: 0, agree: prevI.agree, text: 'Export je stejný jako minule; nic nového nepřibylo.' };
  }
  S.episodes.forEach(function (ep) {
    if (NF.hasImport(ep)) return;
    var pts = readings.filter(function (r) { var d = NF.minutesDiff(ep.at, r.at); return d >= -5 && d <= after; }).map(function (r) { return { min: Math.max(0, NF.minutesDiff(ep.at, r.at)), at: r.at, mmol: r.mmol }; });
    if (pts.length < 4 || !pts.some(function (p) { return p.min <= 10; }) || !pts.some(function (p) { return p.min >= win; })) return;
    if (!pts.some(function (p) { return p.min === 0; })) pts[0].min = 0;
    if (ep.manual && ep.manual.peak != null) { var mp = NF.peakOf(pts, win); if (mp != null) { agree.n++; if (NF.peakAgrees(ep.manual, mp, tol)) agree.ok++; } }
    if (NF.hasManual(ep)) manualOnly++; /* zápis měl dosud jen opsané hodnoty (A08) */
    ep.points = pts; ep.importedAt = S.clock; ep.peak = NF.epPeak(S, ep); ep.rise = NF.epRise(S, ep); ep.at2h = NF.at2h(ep.points); filled++;
  });
  var lowT = NF.targets(S).low;
  var byDay = {}, bed = {}; readings.forEach(function (r) { var d = r.at.slice(0, 10), h = Number(r.at.slice(11, 13)); if (h >= 21) bed[NF.day(NF.addDays(r.at, 1))] = r.mmol; /* poslední hodnota večera = „před spaním“ následující noci (32/02 B6) */ if (h < 6) { byDay[d] = byDay[d] || { min: r.mmol, fasting: null, lowFrom: null, lowTo: null }; byDay[d].min = Math.min(byDay[d].min, r.mmol); if (r.mmol < lowT) { if (!byDay[d].lowFrom) byDay[d].lowFrom = r.at; byDay[d].lowTo = r.at; } } if (h === 6 && byDay[d] && byDay[d].fasting == null) byDay[d].fasting = r.mmol; });
  /* Noci z exportu přepíší dosavadní (export je přesnější, 15 odst. 6a; A08, Q6): noční poklesy se dostanou do návrhu k bazálu.
     B7 (31/02): u noci i čas, kdy byla glukóza pod dolním cílem (první a poslední měření), aby lékař nečetl „ráno“ jako hodnotu nalačno. */
  Object.keys(byDay).forEach(function (d) { if (byDay[d].fasting == null) return; S.nights = S.nights.filter(function (n) { return n.date !== d; }).concat([{ date: d, fasting: byDay[d].fasting, min: byDay[d].min, lowFrom: byDay[d].lowFrom, lowTo: byDay[d].lowTo, bed: bed[d] != null ? bed[d] : null, source: 'import' }]); nights++; });
  S.nights.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  var rdays = {}; readings.forEach(function (r) { rdays[r.at.slice(0, 10)] = 1; }); /* počet dní exportu: karta „Data ze senzoru“ uvádí stejné období a dny jako dlaždice (02 #1, 25. 10. 2026) */
  S.sensorImport = { at: S.clock, readings: readings.length, from: readings[0].at, to: readings[readings.length - 1].at, days: Object.keys(rdays).length, filled: filled, manualOnly: manualOnly, nights: nights, agree: agree, tol: tol, skipped: readings.skipped || 0 };
  var sum = NF.sensorSummaryFrom(S, readings); if (sum && (!S.sensorSummary || sum.days >= (S.sensorSummary.days || 14))) S.sensorSummary = sum;
  NF.settleLabels(S);
  NF.log(S, 'senzor.import', readings.length + ' měření', { filled: filled, nights: nights, agree: agree, tol: tol, skipped: readings.skipped || 0, from: readings[0].at, to: readings[readings.length - 1].at, item: 'Z-IMPORT' });
  return { ok: true, readings: readings.length, filled: filled, manualOnly: manualOnly, nights: nights, agree: agree, text: NF.importText(S.sensorImport) };
};
/* Výsledek nahrání jednou větou pro sestru i pacienta (vlastník 27. 10. 2026, SCHEMA 74): jen „Export nahrán a převeden · doplněno N jídel a N nocí“ – bez řeči o formátu.
   Shodu opsaných vrcholů s exportem (doklad pro studii, 21. 10. 2026) ukazuje sestře zvlášť NF.importAgreeText; počty měření a přeskočených řádků jsou ve stopě. */
NF.importText = function (si) {
  if (!si) return '';
  return 'Export nahrán a převeden · doplněno ' + NF.plural(si.filled, 'jídlo', 'jídla', 'jídel') + ' a ' + NF.plural(si.nights, 'noc', 'noci', 'nocí') + '.';
};
NF.importAgreeText = function (si) {
  if (!si || !si.agree || !si.agree.n) return '';
  return 'Opsaná nejvyšší hodnota se s exportem shoduje u ' + si.agree.ok + ' ' + NF.z(si.agree.n) + ' ' + NF.plural(si.agree.n, 'jídla', 'jídel', 'jídel') + ' (do ' + NF.mmol1(si.tol) + ' mmol/l).';
};
/* Kolik zápisů čeká na průběh z exportu (souhrn pro sestru). Pacient export v aplikaci nenahrává ani k tomu nedostává výzvu – nahrává ho jen sestra na kontrole
   (vlastník 27. 10. 2026, SCHEMA 74); `due` zůstává kvůli kompatibilitě vždy false. */
NF.importDue = function (S) {
  var last = S.sensorImport && S.sensorImport.at;
  var ap = NF.activePlan(S), missing = S.episodes.filter(function (e) { return (!ap || e.planId === ap.id) && !NF.hasImport(e) && NF.minutesDiff(e.at, S.clock) > 180; }).length; /* B5 (31/03): jen zápisy období aktivního plánu */
  return { due: false, missing: missing, last: last };
};
NF.markResultSeen = function (S, id) { fbState(S).resultSeen[id] = S.clock; NF.log(S, 'vysledek.zobrazen', id); };

/* Poděkování po uložení: podle činu, ne podle hodnoty. */
NF.thanks = function (S, ep) {
  var T = NF.texts(S, 'R-DIKY'); if (!T) return null;
  var f = NF.foodById(S, ep.foodId);
  var acc = (ep.advice || []).some(function (a) { return a.accepted === true && a.lever !== 'portion'; });
  var back = ep.portionPlanned === 'bigger' && ep.portion === 'usual';
  var key = ep.retro ? 'retro' : back ? 'portion' : acc ? 'advice' : 'plain';
  return NF.fillText(T[key], { food: f ? f.name : '' });
};

/* Milníky: jednorázové, za snahu a návyk. Žádný milník za hodnotu glukózy. */
NF.checkMilestones = function (S) {
  var T = NF.texts(S, 'R-MILNIKY'); if (!T) return [];
  var fb = fbState(S), high = NF.targets(S).high, out = [];
  function add(id, key, map) {
    if (fb.milestones.some(function (m) { return m.id === id; })) return;
    var m = { id: id, key: key, text: NF.fillText(T[key], map || {}), at: S.clock, seen: false };
    fb.milestones.push(m); out.push(m); NF.log(S, 'milnik', id, { key: key, item: 'R-MILNIKY' });
  }
  var min = NF.param(S, 'R-REAKCE', 'minKnown', 3), eaten = {}, reakce = NF.usable(S, 'R-REAKCE'); /* zamítnutá R-REAKCE: „jídlo už známe“ se nevydává (A03) */
  S.episodes.forEach(function (e) { eaten[e.foodId] = (eaten[e.foodId] || 0) + 1; });
  var repeated = Object.keys(eaten).filter(function (k) { return eaten[k] >= 2; }), knownCount = 0;
  repeated.forEach(function (fid) {
    var f = NF.foodById(S, fid); if (!f) return;
    var st = NF.foodStats(S, fid);
    if (reakce && st.n >= min && st.consistent) { knownCount++; if (!NF.isSnack(NF.dominantMeal(S, fid))) add('known:' + fid, 'known', { food: f.name, n: min }); } /* známé = shoda zápisů, ne jen počet (nález 12, 23. 10. 2026) */
    var last = st.list.slice(-3);
    if (last.length === 3) Object.keys(NF.LEVERS).forEach(function (l) {
      if (l === 'portion') return;
      var all = last.every(function (e) { return NF.usableEp(S, e) && NF.acceptedLever(S, e, l); }); /* milník za návyk, ne za hodnotu (D7) */
      if (all) add('habit:' + fid + ':' + l, 'habit', { food: f.name, lever: NF.LEVER_WITH[l] });
    });
  });
  if (reakce && repeated.length >= 5 && knownCount === repeated.length) add('allknown', 'allknown', { n: repeated.length });
  var days = {};
  S.episodes.forEach(function (e) { var d = NF.day(e.at); days[d] = days[d] || {}; days[d][e.meal] = 1; });
  var full = Object.keys(days).filter(function (d) { return days[d].breakfast && days[d].lunch && days[d].dinner; }).sort();
  for (var i = 6; i < full.length; i++) if (NF.daysBetween(full[i - 6], full[i]) === 6) { add('week1', 'week1', { slots: NF.MEALS.length * 7 }); break; }
  var recent = S.episodes.filter(function (e) { return !NF.inIllness(S, e) && !NF.isSnack(e.meal); }).slice(-10); /* svačina se do obvyklé porce nepočítá (kontrola 4, C10) */
  if (recent.length === 10 && recent.every(function (e) { return e.portion === 'usual'; })) add('usual10', 'usual10', {});
  if (S.episodes.filter(function (e) { return e.retro; }).length >= 5) add('retro5', 'retro5', {});
  return out;
};
NF.pendingMilestone = function (S) { var un = fbState(S).milestones.filter(function (m) { return !m.seen; }); return un.length ? un[un.length - 1] : null; };
/* Zavření zavře i starší neviděné: na Dnes je vždy nejvýš jedna karta (nejnovější), přehled je v Plánu. */
NF.closeMilestone = function (S, id) { var ms = fbState(S).milestones, i = ms.map(function (m) { return m.id; }).indexOf(id); ms.forEach(function (m, j) { if (j <= i) m.seen = true; }); };
NF.settleFeedback = function (S) { var fb = fbState(S); fb.milestones.forEach(function (m) { m.seen = true; }); S.episodes.forEach(function (e) { fb.resultSeen[e.id] = S.clock; }); var w = NF.weekSummary(S); while (w) { fb.weeksSeen[w.id] = S.clock; w = NF.weekSummary(S); } };

/* Cesta ke kontrole: dny, známá jídla X z N, tento týden X z N. Čísla, ne hodnocení. */
NF.pathStats = function (S) {
  /* dny se počítají kalendářně (NF.daysBetween), nikdy z milisekund */
  var p = NF.activePlan(S); if (!p || !NF.usable(S, 'S-CESTA')) return null;
  var from = NF.day(p.effectiveFrom) + 'T00:00:00', to = NF.nextVisit(S);
  var total = Math.max(1, NF.daysBetween(from, to)), gone = Math.max(0, Math.min(total, Math.floor((NF.parse(S.clock) - NF.parse(from)) / 86400000)));
  var min = NF.param(S, 'R-REAKCE', 'minKnown', 3), eaten = {};
  S.episodes.forEach(function (e) { eaten[e.foodId] = (eaten[e.foodId] || 0) + 1; });
  var rep = Object.keys(eaten).filter(function (k) { return eaten[k] >= 2; });
  var known = rep.filter(function (k) { var st = NF.foodStats(S, k); return st.n >= min && st.consistent; }).length; /* známé = shoda zápisů (nález 12) */
  var wk = Math.floor(gone / 7), wstart = NF.addDays(from, wk * 7), dayIn = Math.max(0, Math.min(6, NF.daysBetween(wstart, S.clock)));
  var weps = S.episodes.filter(function (e) { return NF.day(e.at) >= NF.day(wstart) && NF.day(e.at) <= NF.day(S.clock); });
  var conf = weps.filter(function (e) { return e.insulin && e.insulin.confirmed !== 'unknown'; }).length;
  var wFrom = NF.day(NF.addDays(S.clock, -6)); if (wFrom < NF.day(from)) wFrom = NF.day(from);
  return { weave: NF.weave(S, wFrom, S.clock), total: total, gone: gone, left: Math.max(0, total - gone), known: known, repeated: rep.length, week: wk + 1, weekMeals: weps.length, weekSlots: (dayIn + 1) * 3, weekConfirmed: conf, milestones: fbState(S).milestones.length, visit: to };
};

/* Tkanina zápisů (Podpis C, rozhodnutí vlastníka 20. 10. 2026): den = sloupec, čtyři buňky snídaně · oběd · večeře · bazál.
   Jen činy: done = zapsáno, skipped = vynecháno se zápisem („dnes bez…“, bazál „nepíchnuto“), missing = chybí zápis, future = ještě nenastalo.
   Žádná glukóza, žádné hodnocení, žádné série ani „X dní v řadě“. Dny nemoci nesou ill (vykreslí se tlumeně). Lékař 92 dní, pacient posledních 7. */
NF.weave = function (S, from, to) {
  var p = NF.activePlan(S), start = NF.day(from), end = NF.day(to), today = NF.day(S.clock), h = NF.parse(S.clock).getHours() + NF.parse(S.clock).getMinutes() / 60;
  var periods = NF.illnessPeriods(S); /* stejná období jako učení; nemoc ukončená dopoledne už svůj den neznačí */
  var eaten = {}; S.episodes.forEach(function (x) { if (!NF.isSnack(x.meal)) eaten[NF.day(x.at) + ':' + x.meal] = 1; });
  var basal = {}; (S.basalLog || []).forEach(function (b) { basal[b.date] = b.confirmed; });
  var bt = p && p.doses.basal.time ? String(p.doses.basal.time).split(':') : ['21', '00'], basalH = Number(bt[0]) + Number(bt[1] || 0) / 60;
  var days = [], tot = { done: 0, skipped: 0, missing: 0, ill: 0 };
  for (var d = start, guard = 0; d <= end && guard < 400; d = NF.day(NF.addDays(d + 'T12:00:00', 1)), guard++) {
    var ill = periods.some(function (q) { return d >= NF.day(q.from) && d <= NF.day(q.to); });
    var cells = NF.MEALS.map(function (m) {
      var k = d + ':' + m[0], sk = S.skipped && S.skipped[d] && S.skipped[d][m[0]];
      return eaten[k] ? 'done' : sk ? 'skipped' : d > today || (d === today && h < NF.DAYPART_END[m[0]]) ? 'future' : 'missing';
    });
    var b = basal[d];
    cells.push(b ? (b === 'none' ? 'skipped' : 'done') : d > today || (d === today && h < basalH + 3) ? 'future' : 'missing');
    cells.forEach(function (c) { if (tot[c] != null) tot[c]++; }); if (ill) tot.ill++;
    days.push({ date: d, ill: ill, today: d === today, cells: cells });
  }
  return { days: days, totals: tot };
};

/* Týdenní shrnutí za poslední uzavřený týden od vydání plánu; ukáže se jednou. */
NF.weekSummary = function (S) {
  var p = NF.activePlan(S); if (!p || !NF.usable(S, 'S-TYDEN')) return null;
  var from = NF.day(p.effectiveFrom) + 'T00:00:00';
  var fb = fbState(S), gone = NF.daysBetween(from, S.clock), wk = Math.floor(gone / 7);
  if (wk < 1) return null;
  var id = p.id + ':' + wk; if (fb.weeksSeen[id]) return null;
  var start = NF.addDays(from, (wk - 1) * 7), end = NF.addDays(from, wk * 7), high = NF.targets(S).high;
  var eps = S.episodes.filter(function (e) { return e.at >= start && e.at < end; });
  if (!eps.length) { fb.weeksSeen[id] = S.clock; return null; }
  var usual = eps.filter(function (e) { return e.portion === 'usual'; }).length, lv = {};
  eps.forEach(function (e) { NF.countedAdvice(S, e).forEach(function (a) {
    if (a.lever === 'portion' || a.accepted !== true) return;
    lv[a.lever] = lv[a.lever] || { n: 0, inT: 0 }; lv[a.lever].n++;
    var pk = NF.peakOf(e.points); if (pk != null && pk <= high) lv[a.lever].inT++;
  }); });
  var best = Object.keys(lv).sort(function (a, b) { return (lv[b].inT / lv[b].n - lv[a].inT / lv[a].n) || (lv[b].n - lv[a].n); })[0];
  var sugg = null;
  if (best && lv[best].inT >= 2 && NF.param(S, 'S-TYDEN', 'nabidka', 0) > 0) { /* 21. 10. 2026: pro studii vypnuto, rada jen před jídlem */
    var seen = {};
    eps.forEach(function (e) {
      if (seen[e.foodId] || sugg) return; seen[e.foodId] = 1;
      var c = NF.confidence(S, e.foodId);
      if (c.level === 'known' && c.reaction && c.reaction.key !== 'mild' && !NF.leverStats(S, e.foodId).some(function (x) { return x.lever === best; })) sugg = { food: NF.foodById(S, e.foodId).name, lever: best, k: lv[best].inT, n: lv[best].n };
    });
  }
  /* B9 (32/01, SCHEMA 84): obsah i bez rad – kolik zápisů týdne šlo do učení a které jídlo je nejblíž k „známému“ (kolik zápisů mu chybí) */
  var learned = eps.filter(function (e) { return NF.usableEp(S, e); }).length, minK = NF.param(S, 'R-REAKCE', 'minKnown', 3), near = null, seenN = {};
  eps.forEach(function (e) { if (seenN[e.foodId] || NF.isSnack(e.meal)) return; seenN[e.foodId] = 1; var st = NF.foodStats(S, e.foodId), f = NF.foodById(S, e.foodId); if (!f || st.consistent || !st.n || st.n >= minK) return; var left = minK - st.n; if (!near || left < near.left || (left === near.left && st.n > near.n)) near = { food: f.name, left: left, n: st.n }; });
  return { id: id, week: wk, start: start, end: end, meals: eps.length, slots: NF.MEALS.length * 7, usual: usual, learned: learned, near: near, best: best ? { lever: best, k: lv[best].inT, n: lv[best].n } : null,
    milestones: fb.milestones.filter(function (m) { return m.at >= start && m.at < end; }), suggest: sugg };
};
NF.closeWeek = function (S, id) { fbState(S).weeksSeen[id] = S.clock; NF.log(S, 'tyden.zobrazen', id); };

/* ---------- nemoc ---------- */
/* Režim nemoci působí jen se schválenou (nezamítnutou) položkou P-NEMOC (A05, Q1, 27. 10. 2026): bez ní přepínač není, nemoc se neoznačuje a zápisy vstupují do učení. */
NF.nemocOn = function (S) { return !NF.item(S, 'P-NEMOC') || NF.usable(S, 'P-NEMOC'); };
NF.ill = function (S) { return !!(S.illness && S.illness.active) && NF.nemocOn(S); };
NF.setIllness = function (S, on) {
  if (on && !NF.nemocOn(S)) return { ok: false, error: 'Režim nemoci teď nefunguje.' };
  if (on) {
    if (S.illness && S.illness.active) return { ok: true }; S.illness = { active: true, from: S.clock, checkins: [] }; NF.log(S, 'nemoc.zacatek', '');
    /* Zápisy téhož dne před zapnutím dostanou štítek nemoci (od půlnoci): nemoc začala dřív, než ji pacient označil (15 odst. 8; 23. 10. 2026). */
    var day = NF.day(S.clock), n = 0; S.episodes.forEach(function (e) { if (NF.day(e.at) === day && !e.context) { e.context = 'illness'; n++; } });
    if (n) NF.log(S, 'nemoc.stitek', NF.plural(n, 'dnešní zápis', 'dnešní zápisy', 'dnešních zápisů') + ' označeno jako z nemoci', { day: day, n: n });
  }
  else if (S.illness && S.illness.active) { S.illness.active = false; S.illness.to = S.clock; S.illnessLog = (S.illnessLog || []).concat([{ from: S.illness.from, to: S.clock }]); NF.log(S, 'nemoc.konec', ''); }
  return { ok: true };
};
/* Nemoc delší než P-NEMOC.dny (3): karta s pravidlem k nemoci (R12). */
NF.illnessLong = function (S) { var n = NF.param(S, 'P-NEMOC', 'dny', 3); return NF.ill(S) && NF.daysBetween(S.illness.from, S.clock) >= n ? n : 0; };
NF.illnessLongPeriods = function (S) {
  if (!NF.nemocOn(S)) return 0;
  var n = NF.param(S, 'P-NEMOC', 'dny', 3), periods = (S.illnessLog || []).slice();
  if (S.illness && S.illness.active) periods.push({ from: S.illness.from, to: S.clock });
  return periods.filter(function (p) { return NF.daysBetween(p.from, p.to) >= n; }).length;
};
NF.illnessCheckin = function (S, better) {
  if (!S.illness || !S.illness.active) return { ok: false };
  S.illness.checkins.push({ at: S.clock, better: !!better });
  if (better) NF.setIllness(S, false);
  return { ok: true };
};
/* Dny nemoci = počet kalendářních dnů ve všech obdobích nemoci (včetně prvního i posledního). */
NF.illnessDays = function (S) {
  if (!NF.nemocOn(S)) return 0;
  var periods = (S.illnessLog || []).slice();
  if (S.illness && S.illness.active) periods.push({ from: S.illness.from, to: S.clock });
  var days = {};
  periods.forEach(function (p) { for (var d = NF.day(p.from); d <= NF.day(p.to); d = NF.day(NF.addDays(d + 'T12:00:00', 1))) days[d] = 1; });
  return Object.keys(days).length;
};

/* ---------- HbA1c s původem a datem (B3, závěrečné ověření 1. 11. 2026) ----------
   Hodnota při zařazení (z karty pacienta, lékař ji převezme voličem) a výsledek pro kontrolu, který sestra před lékařem vybere voličem: hodnota a datum odběru.
   V ordinaci se nepíše (zásada 8). Report ukazuje „dříve (datum) → teď (datum)“; bez nového výsledku od začátku plánu „teď“ chybí, stará hodnota se za novou nevydává. */
NF.HBA_GRID = [40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95];
NF.hba1cLog = function (S) {
  var p = S.patient || {};
  if (Array.isArray(p.hba1cLog)) return p.hba1cLog;
  return Array.isArray(p.hba1c) ? p.hba1c.map(function (v, i) { return { v: v, date: null, src: i ? 'kontrola' : 'karta' }; }) : []; /* starší uložený stav: hodnoty bez data */
};
NF.hba1cFor = function (S, plan, until) {
  var log = NF.hba1cLog(S).filter(function (x) { return Number.isFinite(x.v); }), start = plan ? NF.day(plan.issuedAt || plan.effectiveFrom) : null, end = until ? NF.day(until) : NF.day(S.clock);
  var before = null, now = null;
  log.forEach(function (x, i) {
    var d = x.date || (i === 0 ? '0000-00-00' : end); /* starší stav bez data: první = při zařazení, další = teď */
    if (!start || d <= start) { if (!before || d >= (before.date || '0000-00-00')) before = x; }
    else if (d <= end) { if (!now || d >= (now.date || '')) now = x; }
  });
  return { before: before, now: now };
};
NF.setHba1c = function (S, src, value, date) {
  var v = Number(value);
  if (!Number.isFinite(v) || Math.round(v) !== v || v < 20 || v > 150) return { ok: false, error: 'Vyberte hodnotu HbA1c.' };
  if (date != null && !(NF.validIso(date + 'T12:00:00') && date <= NF.day(S.clock))) return { ok: false, error: 'Vyberte datum odběru.' };
  S.patient = S.patient || {}; var log = S.patient.hba1cLog = NF.hba1cLog(S).slice();
  var p = NF.activePlan(S), start = p ? NF.day(p.issuedAt) : null;
  var mine = log.filter(function (x) { return x.src === src && (src !== 'sestra' || !start || !x.date || x.date > start); })[0]; /* sestra mění svůj výsledek pro tuto kontrolu */
  if (!mine) { mine = { src: src }; log.push(mine); }
  mine.v = v; if (date !== undefined) mine.date = date; mine.at = S.clock;
  NF.log(S, 'hba1c', v + ' mmol/mol' + (mine.date ? ' · odběr ' + NF.fmtShort(mine.date + 'T12:00:00') : '') + ' · ' + (src === 'sestra' ? 'zapsala sestra' : 'karta pacienta'), { v: v, date: mine.date || null, src: src });
  return { ok: true, entry: mine };
};
NF.setHba1cDate = function (S, src, date) {
  var log = NF.hba1cLog(S), p = NF.activePlan(S), start = p ? NF.day(p.issuedAt) : null;
  var mine = log.filter(function (x) { return x.src === src && (src !== 'sestra' || !start || !x.date || x.date > start); })[0];
  if (!mine) return { ok: false, error: 'Nejdřív vyberte hodnotu.' };
  return NF.setHba1c(S, src, mine.v, date);
};
/* Data odběru k výběru: od `from` do dneška, nejnovější první (výběr, ne psaní). */
NF.hbaDates = function (S, from, max) {
  var out = [], d = NF.day(S.clock), lim = max || 120;
  for (var i = 0; i < lim && (!from || d >= from); i++) { out.push(d); d = NF.day(NF.addDays(d + 'T12:00:00', -1)); }
  return out;
};

/* ---------- souhrny pro report ---------- */
NF.periodEpisodes = function (S, planId) { return S.episodes.filter(function (e) { return e.planId === planId; }); };
NF.summary = function (S, planId) {
  var allEps = NF.periodEpisodes(S, planId), snacks = allEps.filter(function (e) { return NF.isSnack(e.meal); }).length;
  var eps = allEps.filter(function (e) { return !NF.isSnack(e.meal); });
  var meals = eps.length;
  var usual = eps.filter(function (e) { return e.portion === 'usual'; }).length;
  var asPlan = eps.filter(function (e) { return e.insulin && e.insulin.confirmed === 'as'; }).length;
  var other = eps.filter(function (e) { return e.insulin && e.insulin.confirmed === 'other'; }).length;
  var none = eps.filter(function (e) { return e.insulin && e.insulin.confirmed === 'none'; }).length;
  var unknown = eps.filter(function (e) { return !e.insulin || e.insulin.confirmed === 'unknown'; }).length;
  var pl = NF.planById(S, planId), since = pl ? NF.day(pl.issuedAt) : '0000';
  var basalDays = pl ? Math.max(1, NF.daysBetween(since + 'T00:00:00', NF.day(S.clock) + 'T00:00:00')) : S.basalLog.length;
  var today = NF.day(S.clock), basalAs = S.basalLog.filter(function (b) { return b.confirmed === 'as' && b.date >= since && b.date < today; }).length; /* C1 (32/02): jen dny před dneškem – stejný jmenovatel i čitatel v celé kontrole */
  var basalLowerL = S.basalLog.filter(function (b) { return b.confirmed === 'other' && b.date >= since && b.date < today && b.units != null && b.units < b.prescribed; }), uniqU = function (l, f) { return l.map(f).filter(function (x, i, a) { return x != null && a.indexOf(x) === i; }).sort(function (a, b) { return a - b; }).join(', '); };
  /* 32/02 B5: dávky, které si pacient sám snížil – téma rozhovoru, ne jen číslo */
  var selfLower = {}, selfLowerUnits = {}; NF.MEALS.forEach(function (m) { var l = eps.filter(function (e) { return e.meal === m[0] && e.insulin && e.insulin.confirmed === 'other' && e.insulin.units != null && e.insulin.units < e.insulin.prescribed; }); if (l.length) { selfLower[m[0]] = l.length; selfLowerUnits[m[0]] = uniqU(l, function (e) { return e.insulin.units; }); } });
  /* B1 (32/01, SCHEMA 84): menší porce ohlášená před píchnutím (pacient věděl dopředu, že sní méně) – samostatný signál pro lékaře: dávka se nastavuje na porci, kterou pacient opravdu jí */
  var smallerPlanned = eps.filter(function (e) { return e.portion === 'smaller' && e.bolusAtAdvice === 'before' && !NF.isSnack(e.meal); }).length;
  var onTime = eps.filter(function (e) { return e.insulin && e.insulin.confirmed === 'as' && NF.onTime(S, e); }).length;
  var ill = eps.filter(function (e) { return NF.inIllness(S, e); }).length;
  var incomplete = eps.filter(function (e) { return !NF.complete(e); }).length;
  var ss = pl && pl.id !== S.activePlanId ? (pl.sensorSummary || null) : S.sensorSummary, t = NF.targets(S); /* souhrn ze senzoru patří k plánu (02 #3, 23. 10. 2026) */
  /* Kontrola 4 (C15, bod 8): zelená hranice a mez času pod cílem jsou cíle pacienta z C-CILE (běžné, nebo mírnější); S-SEMAFOR nese oranžovou hranici a mez pod 3,0. */
  var zel = t.tirGoal, zlu = Math.min(NF.param(S, 'S-SEMAFOR', 'tir_zluta', 50), zel), tbr = t.tbrGoal, tbr3 = NF.param(S, 'S-SEMAFOR', 'tbr3_max', 1);
  var tirState = !ss ? 'none' : (ss.tir >= zel && ss.below < tbr ? 'ok' : (ss.tir >= zlu && ss.below < tbr && ss.veryLow < tbr3) ? 'warn' : 'bad');
  var adv = NF.adviceOutcome(S, planId);
  var pctDown = function (a, b) { return b ? (a === b ? 100 : Math.min(99, Math.floor(a / b * 100))) : null; }; /* 239 z 240 není „100 %“ (N11, 21. 10. 2026) */
  /* Kontrola 4 (07 B8): spolehlivost dat bez hodnocení – kolik hlavních jídel z období je zapsaných a u kolika zápisů je nejvyšší hodnota (opsaná nebo z exportu). */
  var pi0 = pl ? NF.periodInfo(S, pl, pl.id === S.activePlanId ? S.clock : (pl.validUntil || S.clock)) : null, slotsAll = pi0 ? pi0.days * NF.MEALS.length : null;
  var withPeak = eps.filter(function (e) { return NF.epPeak(S, e) != null; }).length;
  return { slotsAll: slotsAll, withPeak: withPeak, meals: meals, snacks: snacks, usual: usual, usualPct: pctDown(usual, meals), asPlan: asPlan, asPct: pctDown(asPlan, meals), other: other, none: none, unknown: unknown,
    basalAs: basalAs, basalDays: basalDays, onTime: onTime, ill: ill, illDays: NF.illnessDays(S), illLong: NF.illnessLongPeriods(S), incomplete: incomplete, sensor: ss, tirState: tirState, advice: adv,
    hba1c: (function () { var h = NF.hba1cFor(S, pl, pl && pl.id !== S.activePlanId ? pl.validUntil : S.clock); return h.before && h.now ? [h.before.v, h.now.v] : h.before ? [h.before.v] : h.now ? [h.now.v] : null; })(),
    hba1cInfo: NF.hba1cFor(S, pl, pl && pl.id !== S.activePlanId ? pl.validUntil : S.clock), habitsDone: NF.activeHabits(S).length,
    selfLower: selfLower, selfLowerUnits: selfLowerUnits, smallerPlanned: smallerPlanned, basalLower: basalLowerL.length, basalLowerUnits: uniqU(basalLowerL, function (b) { return b.units; }), weight: NF.weightFor(S, pl, pl && pl.id !== S.activePlanId ? pl.validUntil : S.clock) };
};
/* Prahy dlaždic kontroly z položky S-SEMAFOR (A14, 27. 10. 2026): obvyklá porce a inzulin podle plánu (podíl jídel), dny „mimo učení“. Výchozí = návrh autora. */
NF.semafor = function (S) {
  return { porceOk: NF.param(S, 'S-SEMAFOR', 'porce_ok', 0.8) * 100, porceVar: NF.param(S, 'S-SEMAFOR', 'porce_varovani', 0.6) * 100,
    insOk: NF.param(S, 'S-SEMAFOR', 'inzulin_ok', 0.8) * 100, insVar: NF.param(S, 'S-SEMAFOR', 'inzulin_varovani', 0.6) * 100, mimoDni: NF.param(S, 'S-SEMAFOR', 'mimo_dni', 7), minDni: NF.param(S, 'S-SEMAFOR', 'min_dni', 14) };
};
NF.pctState = function (v, ok, warn) { return v == null ? 'none' : v >= ok ? 'ok' : v >= warn ? 'warn' : 'bad'; };
/* Období plánu jedním výpočtem (A30, 27. 10. 2026): od dne vydání do posledního dne se zápisy včetně. Report na kontrole končí dnem před kontrolou,
   pacient před kontrolou počítá i dnešek – den před kontrolou tak oba ukážou stejný počet dní. Jídla a svačiny zvlášť. */
NF.periodInfo = function (S, plan, until, includeUntil) {
  if (!plan) return null;
  var from = plan.issuedAt || plan.effectiveFrom, last = includeUntil ? until : NF.addDays(until, -1);
  var eps = NF.periodEpisodes(S, plan.id), snacks = eps.filter(function (e) { return NF.isSnack(e.meal); }).length;
  return { from: from, last: last, days: Math.max(1, NF.daysBetween(from, last) + 1), meals: eps.length - snacks, snacks: snacks, entries: eps.length };
};
NF.periodEntriesText = function (pi) { return NF.plural(pi.meals, 'jídlo', 'jídla', 'jídel') + (pi.snacks ? ' a ' + NF.plural(pi.snacks, 'svačina', 'svačiny', 'svačin') : ''); };
NF.adviceOutcome = function (S, planId) {
  /* Rady počítané podle NF.countedAdvice (A06): procházka zapsaná zpětně po okně se do srovnání nepočítá. */
  var adv = function (e) { return NF.countedAdvice(S, e); };
  var eps = NF.periodEpisodes(S, planId).filter(function (e) { return adv(e).some(function (a) { return a.lever !== 'portion'; }); });
  var high = NF.targets(S).high;
  var grp = function (pred) {
    var l = eps.filter(pred), c = l.filter(function (e) { return NF.complete(e) && !NF.inIllness(S, e); });
    var peaks = c.map(function (e) { return NF.epPeak(S, e); });
    return { n: l.length, c: c.length, med: NF.r1(NF.median(peaks)), inTarget: peaks.filter(function (p) { return p <= high; }).length };
  };
  var acc = grp(function (e) { return adv(e).some(function (a) { return a.lever !== 'portion' && a.accepted === true; }); });
  var dec = grp(function (e) { return !adv(e).some(function (a) { return a.lever !== 'portion' && a.accepted === true; }) && adv(e).some(function (a) { return a.lever !== 'portion' && a.accepted === false; }); });
  var noans = grp(function (e) { return adv(e).filter(function (a) { return a.lever !== 'portion'; }).every(function (a) { return a.accepted === null; }); });
  var byLever = {}, reasons = {};
  eps.forEach(function (e) { adv(e).forEach(function (a) {
    if (a.lever === 'portion') return;
    byLever[a.lever] = byLever[a.lever] || { offered: 0, accepted: 0, declined: 0, reasons: {}, peaksAcc: [], peaksDec: [], multi: 0 };
    if (a.accepted === true && NF.multiAdvice(S, e)) byLever[a.lever].multi++; /* přijata spolu s další radou (A16) */
    byLever[a.lever].offered++;
    var ok = NF.complete(e) && !NF.inIllness(S, e), pk = ok ? NF.epPeak(S, e) : null;
    if (a.accepted === true) { byLever[a.lever].accepted++; if (pk != null) byLever[a.lever].peaksAcc.push(pk); }
    if (a.accepted === false) { byLever[a.lever].declined++; if (pk != null) byLever[a.lever].peaksDec.push(pk); if (a.reason) { byLever[a.lever].reasons[a.reason] = (byLever[a.lever].reasons[a.reason] || 0) + 1; reasons[a.reason] = (reasons[a.reason] || 0) + 1; } }
  }); });
  /* Srovnání „s radou vs. bez“ je srovnání skupin, které si pacient vybral sám; říká se proto jen od 8 + 8 zápisů u téže rady a rozdílu ≥ 1,0 mmol/l, neutrálně (6. 10. 2026). */
  var MIN_N = NF.param(S, 'S-SOUHRN', 'min_n', 8), MIN_D = NF.param(S, 'S-SOUHRN', 'rozdil_mmol', 1.0);
  Object.keys(byLever).forEach(function (l) {
    var b = byLever[l]; b.nAcc = b.peaksAcc.length; b.nDec = b.peaksDec.length; b.medAcc = NF.r1(NF.median(b.peaksAcc)); b.medDec = NF.r1(NF.median(b.peaksDec));
    b.lower = b.nAcc >= MIN_N && b.nDec >= MIN_N && b.medAcc != null && b.medDec != null ? (b.medAcc <= b.medDec - MIN_D ? 'yes' : b.medAcc >= b.medDec + MIN_D ? 'no' : 'same') : 'few';
    delete b.peaksAcc; delete b.peaksDec;
  });
  var top = Object.keys(reasons).sort(function (a, b) { return reasons[b] - reasons[a]; })[0] || null;
  var any = Object.keys(byLever).map(function (l) { return byLever[l].lower; });
  return { offered: eps.length, accepted: acc, declined: dec, noAnswer: noans, byLever: byLever, reasons: reasons, topReason: top,
    works: any.indexOf('yes') >= 0 ? 'yes' : any.indexOf('no') >= 0 ? 'no' : any.indexOf('same') >= 0 ? 'same' : 'few' };
};
NF.DECLINE_REASONS = [['absent', 'V jídle to není'], ['nothome', 'Nemám to doma'], ['taste', 'Nechutná mi to'], ['time', 'Nebyl čas'], ['hungry', 'Mám větší hlad'], ['plated', 'Už je to na talíři'], ['apart', 'Nejde to oddělit'], ['cantgo', 'Nemůžu ven'], ['nowant', 'Bez udání důvodu']];
/* Důvody „Tentokrát ne“ podle rady (01 #4, 23. 10. 2026). U pořadí zůstává „V jídle to není“ – vypíná radu u jídla (15 odst. 6). */
NF.LEVER_REASONS = { portion: ['hungry', 'plated', 'nowant'], addon: ['absent', 'nothome', 'taste', 'time', 'nowant'], order: ['absent', 'apart', 'taste', 'nowant'], walk: ['time', 'cantgo', 'nowant'] };
NF.reasonsFor = function (lever) { var ks = NF.LEVER_REASONS[lever] || NF.DECLINE_REASONS.map(function (r) { return r[0]; }); return NF.DECLINE_REASONS.filter(function (r) { return ks.indexOf(r[0]) >= 0; }).sort(function (a, b) { return ks.indexOf(a[0]) - ks.indexOf(b[0]); }); };
NF.reasonLabel = function (k) { var x = NF.DECLINE_REASONS.filter(function (r) { return r[0] === k; })[0]; return x ? x[1] : k; };

/* ---------- návrhy lékaři ----------
   Každý návrh: { id, kind, cat, title, why, weak[], verify[], branches[], item, decision }
   Aplikace nevymýšlí směr dávky: větve jsou z položky D-POSTUP, kterou schválil lékař-garant. */
/* Glukóza v ordinaci vždy s jedním desetinným místem („10,0“, „12,0“), aby hranice a mediány vedle sebe měly stejný tvar (S07, 21. 10. 2026). */
NF.mmol1 = function (v) { return v == null ? '–' : (Math.round(v * 10) / 10).toFixed(1).replace('.', ','); };
/* „n = 18 / 25“ drží pohromadě (S10). */
NF.nPair = function (a, b) { return 'n = ' + a + ' / ' + b; };
function cleanEps(S, planId, meal, since) {
  return NF.periodEpisodes(S, planId).filter(function (e) { return e.meal === meal && e.at >= since && NF.usableForDose(S, e); });
}
/* Větve a ověřovací body postupu posouzení dávky jsou texty položky D-POSTUP (R13, 6. 10. 2026):
   garant je vidí v registru, může jednotlivou větev vyřadit nebo celou položku zamítnout. Kód je nevymýšlí.
   Vrací { verify: [], branches: [] } s doplněnými hodnotami; bez položky nebo bez klíče prázdné pole. */
/* Všechny postupy položky D-POSTUP (pro zobrazení v registru, aby garant viděl tytéž body a větve jako karta). Postupy fáze 2 (adviceReview, pokynyBezeZmeny,
   bod „jidla“ v prandHigh; A11, A12, B10) jsou od integrace SCHEMA 73 jen v registru. */
NF.postupAll = function (r) { return r && r.postup ? r.postup : null; };
NF.postup = function (S, key, vars) {
  var r = NF.usable(S, 'D-POSTUP') ? NF.item(S, 'D-POSTUP') : null, p = r && r.postup && r.postup[key];
  if (!p) return { verify: [], fakta: [], branches: [], missing: !!r };
  var f = function (x) { return NF.fillText(x, vars || {}); };
  var verify = (p.verify || []).slice(), fakta = verify.map(function (_, i) { return (p.fakta && p.fakta[i]) || null; }), branches = (p.branches || []).filter(function (b) { return !b.off; }).slice();
  var sestra = verify.map(function (_, i) { var k = p.sestraBody && p.sestraBody[i]; return k && r.sestra && r.sestra[k] ? k : null; }); /* bod, který ověřuje sestra před lékařem (kontrola 4, bod 7) */
  return { verify: verify.map(f), fakta: fakta, sestra: sestra, branches: branches.map(function (b) { return { when: f(b.when), action: b.action, text: f(b.text) }; }) };
};
/* Noci pro návrh k bazálu (D-BAZAL). Rozhodnutí vlastníka 2. 11. 2026 (bod 8) a SCHEMA 82 (31/16 B3, C3, C7):
   – noční pokles, který pacient hlásil (čip u snídaně, nebo odpověď „ano“ na ranní otázku po menší či vynechané večeři – tatáž informace, jednou), se počítá jako noc pod cílem;
   – v okně exportu rozhoduje export (objektivní): noc, kterou export má bez poklesu, se nepočítá a karta to řekne („export nepotvrdil“);
   – noc ze zápisu mimo okno exportu se počítá navíc a přidá se i do jmenovatele (posouzené noci);
   – okno je pro export i zápis stejné: den noci ≥ den (dnes − dny). */
NF.basalNights = function (S, days) {
  var from = NF.day(NF.addDays(S.clock, -(days || NF.param(S, 'D-BAZAL', 'dny', 14)))), low = NF.targets(S).low;
  var nights = S.nights.filter(function (n) { return n.date >= from; }), byDate = {};
  nights.forEach(function (n) { byDate[n.date] = n; });
  var self = {};
  NF.nightLows(S).forEach(function (x) { var d = NF.day(x.at); if (d >= from) self[d] = self[d] || 'cip'; });
  if (NF.usable(S, 'B-HYPO')) (S.hypoWatch || []).forEach(function (w) { if (w.night && w.answer === 'yes' && w.askAt) { var d = NF.day(w.askAt); if (d >= from && !self[d]) self[d] = 'otazka'; } });
  var selfAll = Object.keys(self).sort().map(function (d) { return { date: d, via: self[d] }; });
  var selfOnly = selfAll.filter(function (x) { return !byDate[x.date]; }).map(function (x) { return { date: x.date, min: null, source: 'pacient', via: x.via }; });
  var notConfirmed = selfAll.filter(function (x) { return byDate[x.date] && !(byDate[x.date].min < low); }).map(function (x) { return byDate[x.date]; });
  var lowExp = nights.filter(function (n) { return n.min < low; }).map(function (n) { var c = NF.clone(n); c.alsoSelf = self[n.date] || null; return c; });
  return { exportN: nights.length, selfAll: selfAll, selfOnly: selfOnly, notConfirmed: notConfirmed, low: lowExp.concat(selfOnly).sort(function (a, b) { return a.date < b.date ? -1 : 1; }), assessed: nights.length + selfOnly.length, from: from };
};

/* ---------- SCHEMA 84 (rozhodnutí vlastníka 4. 11. 2026): vývoj v čase, ranní hodnoty, okolnosti nocí ---------- */
/* Vývoj v čase (bod 4; S-SEMAFOR smer_mmol, vyvoj_tydny): medián v první polovině období a v posledních N týdnech, slovo směru až od rozdílu smer_mmol. Dvě čísla, ne graf (odst. 18). */
NF.trendOf = function (S, items, from, to) {
  var vals = (items || []).filter(function (x) { return x && x.v != null && x.at; }); if (!from || !to || vals.length < 2) return null;
  var weeks = NF.param(S, 'S-SEMAFOR', 'vyvoj_tydny', 4), lim = NF.param(S, 'S-SEMAFOR', 'smer_mmol', 1.0), semOff = !!NF.item(S, 'S-SEMAFOR') && !NF.usable(S, 'S-SEMAFOR');
  var mid = new Date((NF.parse(from).getTime() + NF.parse(to).getTime()) / 2), lastFrom = NF.parse(NF.addDays(to, -7 * weeks));
  var first = vals.filter(function (x) { return NF.parse(x.at) < mid; }).map(function (x) { return x.v; }), last = vals.filter(function (x) { return NF.parse(x.at) >= lastFrom; }).map(function (x) { return x.v; });
  if (!first.length || !last.length) return null;
  var mf = NF.r1(NF.median(first)), ml = NF.r1(NF.median(last)), d = NF.r1(ml - mf);
  var dir = semOff ? (d > 0 ? 'worse' : d < 0 ? 'better' : 'same') : (Math.abs(d) >= lim ? (d > 0 ? 'worse' : 'better') : 'same'); /* vyšší glukóza = zhoršuje se; se zamítnutou S-SEMAFOR jen znaménko (jako u procent, 31/16 C2) */
  var word = { worse: 'zhoršuje se', better: 'zlepšuje se', same: 'beze změny' }[dir];
  return { first: mf, last: ml, nFirst: first.length, nLast: last.length, diff: d, dir: dir, word: word, weeks: weeks,
    text: 'první polovina období medián ' + NF.mmol1(mf) + ' mmol/l (n = ' + first.length + ') · poslední ' + NF.plural(weeks, 'týden', 'týdny', 'týdnů') + ' ' + NF.mmol1(ml) + ' mmol/l (n = ' + last.length + ') · ' + word + (dir === 'same' && !semOff ? ' (rozdíl pod ' + NF.mmol1(lim) + ' mmol/l)' : '') };
};
/* Ranní hodnoty před snídaní, které pacient za období opsal (nebo je doplnil export) – 32/02 B9: bez exportu jediný údaj o bazálu. */
NF.morningValues = function (S, planId) {
  var t = NF.targets(S), vals = [];
  NF.periodEpisodes(S, planId).forEach(function (e) { if (e.meal !== 'breakfast') return; var g = NF.glucoseOf(S, e, NF.foodById(S, e.foodId)); if (g.before != null) vals.push({ at: e.at, v: g.before }); });
  var nums = vals.map(function (x) { return x.v; });
  return { n: vals.length, med: NF.r1(NF.median(nums)), above: nums.filter(function (v) { return v > t.fastingHigh; }).length, vals: vals };
};
/* Okolnosti nocí pod cílem (32/02 B6): večeře předchozího dne (čas, jídlo, porce), bazál (čas, dávka), hodnota před spaním z exportu, ranní hodnota. */
NF.nightCircumstances = function (S, nights) {
  return (nights || []).map(function (n) {
    var prev = NF.day(NF.addDays(n.date + 'T12:00:00', -1)), din = S.episodes.filter(function (e) { return e.meal === 'dinner' && NF.day(e.at) === prev; })[0], bz = S.basalLog.filter(function (b) { return b.date === prev; })[0];
    var morn = n.fasting != null ? n.fasting : (function () { var b = S.episodes.filter(function (e) { return e.meal === 'breakfast' && NF.day(e.at) === n.date; })[0]; return b ? NF.glucoseOf(S, b, NF.foodById(S, b.foodId)).before : null; })();
    var PL = { usual: 'obvyklá porce', bigger: 'větší porce', smaller: 'menší porce' };
    var parts = ['večeře ' + (din ? NF.fmtTime(din.at) + ' ' + ((NF.foodById(S, din.foodId) || {}).name || '') + (PL[din.portion] ? ' (' + PL[din.portion] + ')' : '') + (din.context === 'unusual' ? ', neobvyklý den' : '') : 'bez zápisu'),
      'bazál ' + (bz ? (bz.confirmed === 'as' ? (bz.time || '') + ' podle plánu' : bz.confirmed === 'none' ? 'nepodán' : (bz.time || '') + ' jinak (' + bz.units + ' j.)') : 'bez potvrzení'),
      'před spaním ' + (n.bed != null ? NF.mmol1(n.bed) + ' mmol/l' : '–'), 'ráno ' + (morn != null ? NF.mmol1(morn) + ' mmol/l' : '–')];
    return { date: n.date, morning: morn, text: parts.join(' · ') };
  });
};
/* Platnost plánu voličem (32/02 C9): výchozí 92 dní, po změně dávky lze 6 týdnů. */
NF.VALIDITY_DEFAULT = 92; NF.VALIDITY_OPTIONS = [[92, '92 dní (příští kontrola)'], [42, '6 týdnů (kontrola po změně dávky)']];
NF.setReviewValidity = function (S, days) { var r = S.review, d = Number(days); if (!r || r.planIssued || !NF.VALIDITY_OPTIONS.some(function (o) { return o[0] === d; })) return { ok: false }; r.validDays = d; return { ok: true }; };
/* Návyky a cíle na kontrole (rozhodnutí 6, 32/02 B8): krok 3 má přepínače návyků z katalogu; výchozí „beze změny“ = návyky kontrolovaného plánu. */
NF.reviewHabits = function (S) { var r = S.review, p = r && NF.planById(S, r.planId); if (!r || !p) return []; return r.newHabits || p.habits.slice(); };
NF.toggleReviewHabit = function (S, catalogId) {
  var r = S.review; if (!r || r.planIssued || !NF.habitCatalog().some(function (h) { return h.id === catalogId; })) return { ok: false };
  var h = NF.reviewHabits(S); r.newHabits = h.indexOf(catalogId) >= 0 ? h.filter(function (x) { return x !== catalogId; }) : NF.uniq(h.concat([catalogId])); return { ok: true };
};
NF.proposals = function (S, planId, catalog) {
  var out = [], t = NF.targets(S), p = NF.planById(S, planId);
  if (!p) return out;
  /* LF-06 (20. 10. 2026): u bodu, ke kterému máme data, číslo z dat; „against“ = data bodu odporují a „Vše sedí“ ho nepřepne. */
  var withPostup = function (pr, key, vars, fakta) {
    var ps = NF.postup(S, key, vars);
    pr.verify = ps.verify; pr.branches = ps.branches; pr.postup = 'D-POSTUP';
    pr.facts = ps.fakta.map(function (k) { return (k && fakta && fakta[k]) || null; });
    pr.nurse = ps.sestra || [];
    if (ps.missing || !ps.branches.length) pr.weak.push('váš schválený postup pro tento případ nemá větev, rozhodněte sami');
    return pr;
  };
  /* Okno návrhu: od poslední změny dávky (= od vydání plánu), nejméně D-PRAND.dny (28) dní (R2, 6. 10. 2026). */
  var days = NF.param(S, 'D-PRAND', 'dny', 28), since = NF.addDays(S.clock, -days);
  if (p.effectiveFrom && p.effectiveFrom < since) since = p.effectiveFrom;
  var winDays = Math.max(1, NF.daysBetween(since, S.clock));
  var sm = NF.summary(S, planId);
  /* Bod „vyrovnání celkově nedosahuje cíle: čas v cíli pod … nebo HbA1c nad cílem“ se vyhodnotí z obou částí (rozhodnutí vlastníka 25. 10. 2026, cíl HbA1c v C-CILE).
     „Data říkají jinak“ jen když data odporují celé disjunkci: čas v cíli ≥ cíl a zároveň HbA1c ≤ cíl. */
  var hbaE = sm.hba1cInfo && sm.hba1cInfo.now, hbaNow = hbaE ? hbaE.v : null, hbaWhen = hbaE && hbaE.date ? ' z ' + NF.fmtShort(hbaE.date + 'T12:00:00') : '', tirOk = sm.sensor ? sm.sensor.tir >= t.tirGoal : null, hbaOk = hbaNow != null ? hbaNow <= t.hba1cGoal : null;
  /* Rozhodnutí vlastníka 2. 11. 2026 (bod 10, SCHEMA 81): bod o vyrovnání, který sedí jen díky HbA1c méně než D-POSTUP.hba_rezerva (5 mmol/mol) nad cílem, „Co návrh oslabuje“ uvede. */
  var hbaRez = NF.param(S, 'D-POSTUP', 'hba_rezerva', 5), hbaWeak = tirOk === true && hbaNow != null && hbaNow > t.hba1cGoal && hbaNow - t.hba1cGoal < hbaRez ? ['bod o vyrovnání sedí jen díky HbA1c ' + hbaNow + ' mmol/mol, méně než ' + hbaRez + ' mmol/mol nad cílem ' + t.hba1cGoal + ' (rozdíl je v mezích laboratorní variability); čas v cíli ' + sm.sensor.tir + ' % cíl splňuje'] : [];
  var vyrovnani = sm.sensor || hbaNow != null ? { text: (sm.sensor ? 'čas v cíli ' + sm.sensor.tir + ' % (cíl ' + t.tirGoal + ' %)' : 'souhrn ze senzoru chybí') + (hbaNow != null ? ' · HbA1c ' + hbaNow + ' mmol/mol' + hbaWhen + ' (cíl do ' + t.hba1cGoal + ')' : ' · nový výsledek HbA1c chybí'), against: tirOk === true && hbaOk === true } : { text: 'souhrn ze senzoru i nový výsledek HbA1c chybí' };
  /* N14: mez pro čas pod dolním cílem (S-SEMAFOR tbr_max), proto s jednotkou a vysvětlením */
  var bal = (sm.sensor ? 'čas v cíli ' + sm.sensor.tir + ' % (cíl ' + t.tirGoal + ' %) · pod ' + NF.mmol1(t.low) + ' mmol/l: ' + sm.sensor.below + ' % času (mez: méně než ' + t.tbrGoal + ' % času)' : 'souhrn ze senzoru chybí') + (sm.hba1cInfo && (sm.hba1cInfo.before || sm.hba1cInfo.now) ? ' · HbA1c ' + [sm.hba1cInfo.before, sm.hba1cInfo.now].filter(Boolean).map(function (x) { return x.v + (x.date ? ' (' + NF.fmtShort(x.date + 'T12:00:00') + ')' : ''); }).join(' → ') + ' mmol/mol (cíl do ' + t.hba1cGoal + ')' : '');
  /* --- bazál --- */
  /* SCHEMA 84 (rozhodnutí vlastníka 4. 11. 2026; 32/02 A4, B6, B9, B10): odpověď sestry „pozdě večer a v noci“ na kartě, okolnosti nocí, ranní opsané hodnoty za období, přednost jen bez takového vysvětlení nebo pod 3,0. */
  var mornings = NF.morningValues(S, planId), morningsTxt = mornings.n ? 'ranní hodnoty před snídaní opsané za období: medián ' + NF.mmol1(mornings.med) + ' mmol/l · nad ' + NF.mmol1(t.fastingHigh) + ': ' + mornings.above + ' ' + NF.z(mornings.n) + ' ' + mornings.n : 'ranní hodnoty před snídaní pacient za období neopsal';
  var fastTrend = NF.trendOf(S, mornings.vals, p.effectiveFrom || p.issuedAt, S.clock), fastTrendRow = fastTrend ? { label: 'Vývoj ranních hodnot v čase', text: fastTrend.text } : null;
  var nurseVecer = NF.nurseAnswer(S, 'vecer');
  if (NF.usable(S, 'D-BAZAL')) {
    var bdays = NF.param(S, 'D-BAZAL', 'dny', 14), minNoci = NF.param(S, 'D-BAZAL', 'minNoci', 10);
    var nights = S.nights.filter(function (n) { return n.date >= NF.day(NF.addDays(S.clock, -bdays)); });
    /* Noci pro návrh k bazálu (rozhodnutí vlastníka 2. 11. 2026, bod 8; SCHEMA 82 podle 31/16 B3, C3, C7): NF.basalNights. */
    var bn = NF.basalNights(S, bdays), lowNights = bn.low, lowN = lowNights.length, veryLow = nights.filter(function (n) { return n.min < 3.0; }).length;
    var fastMed = NF.r1(NF.median(nights.map(function (n) { return n.fasting; })));
    /* C3 (31/02): bazál potvrzený „X z Y dnů plánu“ – stejný jmenovatel jako podklady (NF.summary), ne počet záznamů bazálu */
    var basalAs = sm.basalAs, basalN = sm.basalDays, bazalFakt = { text: 'potvrzeno ' + basalAs + ' ' + NF.z(basalN) + ' ' + NF.plural(basalN, 'dne', 'dnů', 'dnů') + ' plánu' + (sm.basalLower ? ' · ' + sm.basalLower + '× nižší dávka (' + sm.basalLowerUnits + ' j.)' : '') };
    var dm = function (d) { return NF.fmtDM(d + 'T12:00:00'); }, via = function (n) { return n.via === 'otazka' ? 'hlásil pacient ráno na otázku' : 'zapsal pacient u snídaně'; };
    var nightTxt = function (n) { return n.source === 'pacient' ? 'v noci na ' + dm(n.date) + ' pod 4 · ' + via(n) : 'v noci na ' + dm(n.date) + (n.lowFrom ? ' mezi ' + NF.fmtClock(n.lowFrom) + ' a ' + NF.fmtClock(n.lowTo) : '') + ' nejnižší ' + NF.mmol1(n.min) + ' mmol/l · z exportu' + (n.alsoSelf ? ', ' + (n.alsoSelf === 'otazka' ? 'hlásil i pacient' : 'zapsal i pacient') : ''); };
    var notConfTxt = bn.notConfirmed.length ? NF.plural(bn.notConfirmed.length, 'noc zapsanou pacientem', 'noci zapsané pacientem', 'nocí zapsaných pacientem') + ' export nepotvrdil (' + bn.notConfirmed.map(function (n) { return 'v noci na ' + dm(n.date) + ' nejnižší ' + NF.mmol1(n.min) + ' mmol/l'; }).join(', ') + '); v okně exportu rozhoduje export' : '';
    var assessed = bn.assessed, enough = bn.exportN ? assessed >= minNoci : bn.selfOnly.length > 0; /* bez exportu stačí noci ze zápisu (bod 8); s exportem práh minNoci nad všemi posouzenými nocmi */
    var mornRow = { label: 'Ranní hodnoty za období', text: morningsTxt };
    if (enough && (lowN >= NF.param(S, 'D-BAZAL', 'nociPod', 2) || veryLow >= 1)) {
      /* B10: přednost jen bez vysvětlení „jídlo pozdě večer a v noci“ od sestry, nebo při noci pod 3,0 */
      var prio = veryLow >= 1 || nurseVecer !== false ? 0 : 2.5;
      var circ = NF.nightCircumstances(S, lowNights), circRows = circ.map(function (c) { return { label: 'Noc na ' + dm(c.date), text: c.text }; });
      var afterLate = nurseVecer === false ? [NF.plural(lowN, 'noc následuje', 'noci následují', 'nocí následuje') + ' po dnech, u kterých sestra s pacientem uvedla jídlo pozdě večer a v noci (bod 2 podle sestry nesedí); ranní hodnoty po těch nocích ' + (circ.every(function (c) { return c.morning != null; }) ? circ.map(function (c) { return NF.mmol1(c.morning); }).join(' a ') + ' mmol/l' : 'viz okolnosti nocí') + ' – snížení bazálu by zhoršilo hodnoty po jídle'] : [];
      var nociFakt = { text: 'ráno po těch nocích ' + (circ.some(function (c) { return c.morning != null; }) ? circ.filter(function (c) { return c.morning != null; }).map(function (c) { return NF.mmol1(c.morning); }).join(', ') + ' mmol/l' : 'bez opsané hodnoty') + ' · ' + morningsTxt };
      out.push(withPostup({ id: 'PR-BAZAL', kind: 'dose', dose: 'basal', cat: 'davka', priority: prio, title: 'Posoudit bazální dávku – noční hodnoty pod cílem',
        why: (bn.exportN ? lowN + ' ' + NF.z(assessed) + ' ' + assessed + ' nocí' + (bn.selfOnly.length ? ' (' + bn.exportN + ' z exportu, ' + bn.selfOnly.length + ' jen ze zápisu pacienta mimo okno exportu)' : '') + ' za posledních ' + bdays + ' dní kleslo' : NF.plural(lowN, 'noc', 'noci', 'nocí') + ' za posledních ' + bdays + ' dní ' + (lowN === 1 ? 'klesla' : lowN < 5 ? 'klesly' : 'kleslo')) + ' pod ' + NF.mmol1(t.low) + ' mmol/l' + (veryLow ? ', z toho ' + veryLow + '× pod 3,0' : '') + ' (' + lowNights.map(nightTxt).join(' · ') + ').' + (bn.selfOnly.length ? ' Noci, které má jen zápis pacienta, se počítají jako noc pod cílem; číslo z nich není k dispozici.' : '') + (prio === 0 ? ' Noční pokles je nejdůležitější signál a má přednost před ostatními.' : ' Sestra s pacientem uvedla jídlo pozdě večer a v noci, proto karta nemá přednost před ostatními.'), /* B12: data nocí, aby šel ověřit bod o večeřích */
        context: bal, rows: circRows.concat([mornRow], fastTrendRow ? [fastTrendRow] : []), weak: afterLate.concat(veryLow ? ['hodnota pod 3,0 z jednoho bodu může být i artefakt senzoru (tlak na senzor ve spánku)'] : []).concat(notConfTxt ? [notConfTxt] : []), nightsSelf: bn.selfAll.map(function (n) { return n.date; }), item: 'D-BAZAL', stats: { mornings: mornings, trend: fastTrend } } /* integrace SCHEMA 73: věta o artefaktu jen při hodnotě pod 3,0 */, 'bazalLow', { as: basalAs, n: basalN }, { bazal: bazalFakt, noci: nociFakt }));
    } else if (nights.length >= minNoci && fastMed != null && fastMed > t.fastingHigh && lowN === 0) {
      out.push(withPostup({ id: 'PR-BAZAL', kind: 'dose', dose: 'basal', cat: 'davka', priority: 2, title: 'Posoudit bazální dávku – ranní hodnoty nad cílem',
        why: 'Medián ranních hodnot za ' + bdays + ' dní je ' + NF.mmol1(fastMed) + ' mmol/l (cíl do ' + NF.mmol1(t.fastingHigh) + ' mmol/l) a žádná noc neklesla pod ' + NF.mmol1(t.low) + ' mmol/l.',
        context: bal, rows: [mornRow].concat(fastTrendRow ? [fastTrendRow] : []), weak: hbaWeak.concat(notConfTxt ? [notConfTxt] : []), nightsSelf: bn.selfAll.map(function (n) { return n.date; }), item: 'D-BAZAL', stats: { mornings: mornings, trend: fastTrend } }, 'bazalHigh', { as: basalAs, n: basalN, tirGoal: t.tirGoal }, { bazal: bazalFakt, vyrovnani: vyrovnani }));
    }
  }
  /* --- prandiální podle jídla --- */
  var radyLevers = [], odmMinAll = NF.param(S, 'D-PRAND', 'odmitnutiMin', 5), odmPodilAll = NF.param(S, 'D-PRAND', 'odmitnutiPodil', 0.6); /* prahy návrhů k radám (A13) */
  var jenCiste = NF.param(S, 'D-POSTUP', 'poklesy_jen_ciste', 1) >= 1, lowOd = NF.param(S, 'D-POSTUP', 'poklesy_od', 1);
  /* SCHEMA 84 (rozhodnutí 3): blokující poklesy = při obvyklé porci a dávce podle plánu (D-POSTUP poklesy_jen_ciste); ostatní jsou varování. */
  var lowsFor = function (meal) {
    var lowEv = NF.lowEvents(S).filter(function (x) { return x.meal === meal && x.at >= since; }), blocking = jenCiste ? lowEv.filter(function (x) { return x.clean; }) : lowEv, warn = lowEv.filter(function (x) { return blocking.indexOf(x) < 0; });
    var line = function (x) { return NF.fmtDM(x.at) + ' ' + NF.fmtTime(x.at) + ' · ' + (x.source === 'senzor' ? 'ze senzoru' : 'hlásil pacient') + (x.why ? ' · ' + x.why : ''); };
    var days = function (l) { return l.map(function (x) { return NF.fmtDM(x.at); }).join(', '); };
    var block = blocking.length >= lowOd;
    var fakt = { text: blocking.length ? NF.plural(blocking.length, 'pokles', 'poklesy', 'poklesů') + ' pod 4 ' + NF.MEAL_PO[meal] + ' při obvyklé porci a dávce podle plánu (' + days(blocking) + ')' + (warn.length ? '; ' + NF.plural(warn.length, 'další pokles', 'další poklesy', 'dalších poklesů') + ' po menší porci nebo s jinou dávkou' : '') : (warn.length ? 'žádný pokles při obvyklé porci a dávce podle plánu; ' + NF.plural(warn.length, 'pokles', 'poklesy', 'poklesů') + ' po menší porci nebo s jinou dávkou (' + days(warn) + ') je varování' : 'žádný pokles pod 4 ' + NF.MEAL_PO[meal]), against: block, block: block };
    var weak = (blocking.length ? [NF.plural(blocking.length, 'pokles', 'poklesy', 'poklesů') + ' pod 4 ' + NF.MEAL_PO[meal] + ' při obvyklé porci a dávce podle plánu (' + days(blocking) + ')' + (block ? '; podle postupu blokují větev „zvýšit“' : '')] : []).concat(warn.length ? [NF.plural(warn.length, 'pokles', 'poklesy', 'poklesů') + ' pod 4 ' + NF.MEAL_PO[meal] + ' ' + (warn.every(function (x) { return x.why === 'menší porce'; }) ? 'po menší porci' : 'po menší porci, vynechaném jídle nebo s jinou dávkou') + ' (' + days(warn) + ') – poučit pacienta; větev „zvýšit“ neblokují, o dávce k obvyklé porci nic neříkají'] : []);
    return { all: lowEv, blocking: blocking, warn: warn, block: block, fakt: fakt, weak: weak, list: lowEv.map(line) };
  };
  var selfLowerWeak = function (meal) { var n = sm.selfLower && sm.selfLower[meal]; return n ? ['pacient si ' + n + '× sám dal nižší dávku ' + NF.mealLabel(meal, 'ke') + ' (' + sm.selfLowerUnits[meal] + ' j.): zvýšení dávky u pacienta, který ji sám snižuje, je k ověření s ním (proč – strach z nízké glukózy, zapomínání)'] : []; }; /* 32/02 B5 */
  var slotRow = function (meal, stats, reason) { /* SCHEMA 84 (rozhodnutí 1): jídlo dne bez karty má řádek s čísly a stejným voličem dávky */
    var lw = lowsFor(meal);
    out.push({ id: 'PR-' + meal.toUpperCase(), kind: 'dose', dose: meal, cat: 'davka', priority: 7, row: true, title: NF.mealLabel(meal, true) + ' – bez návrhu', why: stats.text + ' · bez návrhu (' + reason + ')', weak: lw.weak, verify: [], branches: [], facts: [], nurse: [], lowBlock: lw.block, lows: lw.list, lowsTitle: 'Poklesy pod 4 ' + NF.MEAL_PO[meal] + ' v období', item: NF.usable(S, 'D-PRAND') ? 'D-PRAND' : null, stats: stats });
  };
  var slotStats = function (meal, eps, above, medPeak) { var tr = NF.trendOf(S, eps.map(function (e) { return { at: e.at, v: NF.epPeak(S, e) }; }), p.effectiveFrom || p.issuedAt, S.clock); return { n: eps.length, above: above, med: medPeak, trend: tr, text: eps.length ? above + ' ' + NF.z(eps.length) + ' ' + eps.length + ' nad cílem' + (medPeak != null ? ' · medián vrcholu ' + NF.mmol1(medPeak) + ' mmol/l' : '') : 'žádné čisté jídlo' }; };
  var minNAll = NF.param(S, 'D-PRAND', 'minJidel', 8), shareAll = NF.param(S, 'D-PRAND', 'podil', 2 / 3), medNadAll = NF.param(S, 'D-PRAND', 'medianNad', 0.5);
  NF.MEALS.forEach(function (m) {
    var meal = m[0], eps = cleanEps(S, planId, meal, since);
    var minN = minNAll, share = shareAll, medNad = medNadAll;
    var all = NF.periodEpisodes(S, planId).filter(function (e) { return e.meal === meal && e.at >= since; });
    var aboveAll = eps.filter(function (e) { return NF.epPeak(S, e) > t.high; }), medAll = NF.r1(NF.median(eps.map(function (e) { return NF.epPeak(S, e); }))), stats = slotStats(meal, eps, aboveAll.length, medAll);
    if (!NF.usable(S, 'D-PRAND')) { slotRow(meal, stats, 'návrhy k prandiální dávce nejsou v registru schválené'); return; }
    var lowEpIds = {}; NF.lowEvents(S).forEach(function (x) { if (x.epId) lowEpIds[x.epId] = 1; });
    var excludedList = all.filter(function (e) { return !NF.usableForDose(S, e); }).map(function (e) { return { at: e.at, why: (lowEpIds[e.id] ? 'pokles pod 4 · ' : '') + NF.whyNotForDose(S, e) }; }); /* A1: pokles pod 4 jako první důvod */
    var excluded = excludedList.length, excludedText = NF.plural(excluded, 'zápis vyřazen', 'zápisy vyřazeny', 'zápisů vyřazeno') + ' z návrhu (jiná porce, nepotvrzený nebo pozdní inzulin, svačina do 2 h, zpětný zápis, nemoc, chybějící data)';
    /* Nízké hodnoty se berou ze všech zápisů jídla, ne jen z čistých; co není čisté, se vypíše (R4). Jediný pokles pod 3,0 stačí (R3). */
    var lowOf = function (e, lim) { return (e.points || []).some(function (x) { return x.mmol != null && x.mmol < lim; }) || (lim >= 3.9 && !!(e.manual && e.manual.low === true)); }; /* opsané „pod 4“ se počítá jako pokles (18. 10. 2026) */
    var lowsAll = all.filter(function (e) { return lowOf(e, t.low); }), veryLowAll = all.filter(function (e) { return lowOf(e, 3.0); });
    var hypoN = NF.param(S, 'D-PRAND', 'hypo', 2), hypoShare = NF.param(S, 'D-PRAND', 'hypoPodil', 0.15), hypoMin = NF.param(S, 'D-PRAND', 'hypoMin', 6);
    if (all.length && (veryLowAll.length >= 1 || (all.length >= hypoMin && lowsAll.length >= hypoN && lowsAll.length / all.length >= hypoShare))) {
      var unclean = lowsAll.filter(function (e) { return !NF.usableForDose(S, e); });
      var lowUsual = lowsAll.filter(function (e) { return e.portion === 'usual'; }).length, lowAs = lowsAll.filter(function (e) { return e.insulin && e.insulin.confirmed === 'as' && NF.onTime(S, e); }).length;
      out.push(withPostup({ id: 'PR-' + meal.toUpperCase(), kind: 'dose', dose: meal, cat: 'davka', priority: 1, title: 'Posoudit prandiální dávku ' + NF.mealLabel(meal, 'ke') + ' – hodnoty pod cílem',
        why: lowsAll.length + ' ' + NF.z(all.length) + ' ' + all.length + ' ' + NF.MEAL_GPL[meal] + ' za ' + winDays + ' dní: glukóza do 4 h po jídle klesla pod ' + NF.mmol1(t.low) + ' mmol/l' + (veryLowAll.length ? ', z toho ' + veryLowAll.length + '× pod 3,0' : '') + '.',
        context: bal, rows: stats.trend ? [{ label: 'Vývoj vrcholů v čase', text: stats.trend.text }] : [], weak: (unclean.length ? ['z toho ' + unclean.length + ' mimo čistá data: ' + unclean.map(function (e) { return NF.whyNotForDose(S, e); }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(', ')] : []).concat(excluded ? [excludedText] : []), excluded: excludedList, stats: stats,
        item: 'D-PRAND' }, 'prandLow', { meal: NF.mealLabel(meal, 'ke') }, {
          porcePoklesy: { text: 'obvyklá u ' + lowUsual + ' ' + NF.z(lowsAll.length) + ' ' + lowsAll.length + ' poklesů', against: lowUsual < lowsAll.length },
          davkaPoklesy: { text: 'potvrzená včas u ' + lowAs + ' ' + NF.z(lowsAll.length) + ' ' + lowsAll.length + ' poklesů', against: lowAs < lowsAll.length } }));
      return;
    }
    if (eps.length < minN) { slotRow(meal, stats, 'méně než ' + minN + ' čistých jídel'); return; }
    var above = aboveAll;
    if (above.length / eps.length < share) { slotRow(meal, stats, 'práh ' + (share === 2 / 3 || Math.abs(share - 0.67) < 0.01 ? '2/3' : Math.round(share * 100) + ' %') + ' nad cílem'); return; }
    var medPeak = medAll;
    if (medPeak != null && medPeak <= t.high + medNad) { slotRow(meal, stats, 'medián vrcholu do ' + NF.mmol1(t.high + medNad) + ' mmol/l'); return; } /* hraniční jídla návrh nespouštějí (R2) */
    /* Rozpad po jídlech (R1): jednotka návrhu je slot dne, ale lékař vidí, které jídlo za tím stojí. */
    var byFood = {};
    eps.forEach(function (e) { var f = NF.foodById(S, e.foodId), nm = f ? f.name : e.foodId; byFood[nm] = byFood[nm] || { n: 0, above: 0 }; byFood[nm].n++; if (NF.epPeak(S, e) > t.high) byFood[nm].above++; });
    var breakdown = Object.keys(byFood).map(function (k) { return { food: k, n: byFood[k].n, above: byFood[k].above }; }).sort(function (a, b) { return b.above - a.above || b.n - a.n; }); /* kontrola 2 (B10): rozpad podle počtu zápisů nad cílem, aby šel ověřit bod „nejen jedno nebo dvě jídla“ */
    /* Rozhodnutí vlastníka 2. 11. 2026 (bod 9, SCHEMA 81): „v cíli“ = aspoň u D-POSTUP.v_cili_podil (90 %) zápisů jídla, aby jeden sváteční zápis varování nevypnul. */
    var vCili = NF.param(S, 'D-POSTUP', 'v_cili_podil', 0.9), inTgt = function (b) { return b.n >= 2 && (b.n - b.above) / b.n >= vCili; };
    var inTargetFoods = breakdown.filter(inTgt);
    var heteroWeak = inTargetFoods.length ? [(inTargetFoods.length > 1 ? 'jídla ' : 'jídlo ') + inTargetFoods.map(function (b) { return '„' + b.food + '“ (v cíli ' + (b.n - b.above) + ' ' + NF.z(b.n) + ' ' + b.n + ')'; }).join(', ') + (inTargetFoods.length > 1 ? ' zůstala v cíli' : ' zůstalo v cíli') + ' aspoň u ' + Math.round(vCili * 100) + ' % zápisů, takže příčina může být v konkrétních jídlech, ne v dávce. Změna dávky by dopadla i na ' + (inTargetFoods.length > 1 ? 'dny s těmito jídly' : 'dny s tímto jídlem')] : [];
    var acceptedAdvice = eps.filter(function (e) { return NF.countedAdvice(S, e).some(function (a) { return a.accepted === true && a.lever !== 'portion'; }); });
    /* Rady první (SCHEMA 84, rozhodnutí vlastníka 4. 11. 2026, bod 2): karta k dávce vzniká vždy; když pacient rady přijal méně než radyPrve× nebo je většinou odmítal
       (podíl ≥ D-PRAND.odmitnutiPodil), vznikne před ní karta „Nejdřív rady“ a bod 10 postupu podle dat nesedí (větev „ponechat dávku, posílit radu“).
       Brána platí jen od D-PRAND.odmitnutiMin nabídek – u jídla, kde aplikace rady skoro nenabízela, pacienta netrestá (01 A1, 02 A2). */
    var offered = 0, declinedN = 0, acceptedN = 0;
    all.forEach(function (e) { NF.countedAdvice(S, e).forEach(function (a) { if (a.lever === 'portion') return; offered++; if (a.accepted === false) declinedN++; if (a.accepted === true) acceptedN++; }); });
    var odmMin = NF.param(S, 'D-PRAND', 'odmitnutiMin', 5), odmPodil = NF.param(S, 'D-PRAND', 'odmitnutiPodil', 0.6), radyPrve = NF.param(S, 'D-PRAND', 'radyPrve', 3);
    var radyNabidka = 'nabídnuto ' + offered + '×, přijato ' + acceptedN + '×' + (declinedN ? ', odmítnuto ' + declinedN + '×' : '');
    var radyFakt = { text: 'nabídek rad ' + offered + ': přijato ' + acceptedN + ', odmítnuto ' + declinedN }; /* jednotka „nabídek rad“ (A25) */
    var gate = offered >= odmMin && (acceptedAdvice.length < radyPrve || declinedN / offered >= odmPodil);
    /* C3 (32/02): srovnání s radou a bez ní u tohoto jídla dne, jen když je v obou skupinách dost zápisů */
    var MIN_C = NF.param(S, 'S-SOUHRN', 'min_n', 8), pkAcc = acceptedAdvice.map(function (e) { return NF.epPeak(S, e); }), pkNo = eps.filter(function (e) { return acceptedAdvice.indexOf(e) < 0; }).map(function (e) { return NF.epPeak(S, e); });
    var cmpTxt = pkAcc.length >= MIN_C && pkNo.length >= MIN_C ? ' S přijatou radou byl medián vrcholu ' + NF.mmol1(NF.median(pkAcc)) + ' mmol/l, bez ní ' + NF.mmol1(NF.median(pkNo)) + ' mmol/l' + (Math.abs(NF.median(pkAcc) - NF.median(pkNo)) < NF.param(S, 'S-SOUHRN', 'rozdil_mmol', 1.0) ? ' (bez rozdílu).' : '.') : '';
    if (gate) {
      var declined = {};
      all.forEach(function (e) { NF.countedAdvice(S, e).forEach(function (a) { if (a.lever !== 'portion' && a.accepted === false) declined[a.lever] = (declined[a.lever] || 0) + 1; }); });
      var usableLevers = Object.keys(NF.LEVERS).filter(function (l) { return l !== 'portion' && NF.usable(S, NF.LEVERS[l].item); });
      var worst = Object.keys(declined).filter(function (l) { return usableLevers.indexOf(l) >= 0; }).sort(function (a, b) { return declined[b] - declined[a]; })[0] || usableLevers[0];
      if (worst) {
        radyLevers.push(worst); /* o téže radě nevznikne zvláštní návrh „vyměnit“ – obě větve (posílit / vyměnit) nese tento návrh (02 #21) */
        /* A12 (27. 10. 2026): návrh stojí na prazích D-PRAND a větvích D-POSTUP (postup „nejdřív rady“) – nese jejich štítky, ne R-NAVYKY. */
        out.push(withPostup({ id: 'PR-' + meal.toUpperCase() + '-RADY', kind: 'habit', cat: 'plan', priority: 3, lever: worst, title: 'Nejdřív rady ' + NF.mealLabel(meal, 'ke') + ' – dávka až po radách',
          why: above.length + ' ' + NF.z(eps.length) + ' ' + eps.length + ' ' + NF.MEAL_GPL[meal] + ' skončilo nad cílem; rada k jídlu: ' + radyNabidka + (declined[worst] ? ' (nejčastěji odmítnutá rada „' + NF.LEVERS[worst].label + '“)' : '') + '. Podle schváleného postupu jde jídlo před dávkou; návrh k dávce je další karta a lékař o ní rozhodne.',
          weak: [], item: 'D-PRAND', needs: ['D-CISTA'] }, 'prandAdviceFirst', { lever: NF.LEVERS[worst].label }, { rady: radyFakt }));
      }
    }
    /* Ověřovací bod „Nad cílem nejsou jen jedno nebo dvě jídla“ (A11, Q4, 27. 10. 2026): z rozpadu po jídlech. Když dvě jídla s nejvíc zápisy nad cílem tvoří
       aspoň D-PRAND.podilDvouJidel všech zápisů nad cílem a pacient jí i jiné jídlo (aspoň 2×), data bodu odporují – větev „ponechat dávku, řešit jídlo“. */
    var byAbove = breakdown.filter(function (b) { return b.above > 0; }).sort(function (a, b) { return b.above - a.above; }), aboveN = above.length;
    var top2 = byAbove.slice(0, 2), top2N = top2.reduce(function (x, b) { return x + b.above; }, 0), others = breakdown.filter(function (b) { return top2.indexOf(b) < 0 && inTgt(b); }); /* SCHEMA 81 (bod 9): jiné jídlo, které je v cíli aspoň u 90 % zápisů */
    var dvaPodil = NF.param(S, 'D-PRAND', 'podilDvouJidel', 0.67), soustredeno = aboveN > 0 && others.length > 0 && top2N / aboveN >= dvaPodil;
    /* A1 (nezávislá kontrola 27. 10. 2026) + SCHEMA 84 (rozhodnutí 3): poklesy pod 4 u tohoto jídla dne v období; blokuje jen pokles při obvyklé porci a dávce podle plánu,
       ostatní poklesy jsou varování v „Co návrh oslabuje“. Bod „U jídla nebyl v období pokles pod 4 …“ podle dat nesedí (block: lékař ho nepřepne). */
    var lw = lowsFor(meal);
    var jidlaFakt = { text: soustredeno ? 'nad cílem hlavně ' + top2.map(function (b) { return '„' + b.food + '“'; }).join(' a ') + ': ' + top2N + ' ' + NF.z(aboveN) + ' ' + aboveN + ' zápisů nad cílem' : 'nad cílem ' + NF.plural(byAbove.length, 'jídlo', 'různá jídla', 'různých jídel') + (byAbove.length > 2 ? ', dvě s nejvíc zápisy nad cílem (' + top2.map(function (b) { return '„' + b.food + '“ ' + b.above + '×'; }).join(', ') + ') tvoří ' + Math.round(top2N / aboveN * 100) + ' %' : ''), against: soustredeno };
    /* Kontrola 4 (06 B5): vrcholy v návrhu stojí hlavně na opsaných hodnotách – bod 9 „Opsané nejvyšší hodnoty se shodují s exportem“ (D-POSTUP shoda_podil, shoda_min)
       a v „Co návrh oslabuje“ kolik vrcholů je jen opsaných. Shoda do Z-IMPORT.shoda_mmol jako u nahrání exportu. */
    var tolS = NF.param(S, 'Z-IMPORT', 'shoda_mmol', 1), cmp = all.filter(function (e) { return NF.hasImport(e) && e.manual && e.manual.peak != null; });
    var agreeN = cmp.filter(function (e) { var mp = NF.peakOf(e.points, NF.windowFor(S, NF.foodById(S, e.foodId))); return mp != null && NF.peakAgrees(e.manual, mp, tolS); }).length;
    var shodaMin = NF.param(S, 'D-POSTUP', 'shoda_min', 5), shodaPodil = NF.param(S, 'D-POSTUP', 'shoda_podil', 0.8);
    var shodaFakt = cmp.length ? { text: 'shoda u ' + agreeN + ' ' + NF.z(cmp.length) + ' ' + cmp.length + ' ' + NF.MEAL_GPL[meal] + ' s exportem (do ' + NF.mmol1(tolS) + ' mmol/l)', against: cmp.length < shodaMin || agreeN / cmp.length < shodaPodil } : { text: 'export k těmto jídlům zatím není – vrcholy jsou jen opsané', against: true };
    var radyBod = { text: radyNabidka + (offered < odmMin ? ' (méně než ' + odmMin + ' nabídek, brána rad se neuplatní)' : ''), against: gate }; /* SCHEMA 84: bod 10 */
    var onlyCopied = eps.filter(function (e) { return !NF.hasImport(e); }).length;
    var copiedWeak = onlyCopied ? [onlyCopied + ' ' + NF.z(eps.length) + ' ' + eps.length + ' vrcholů v návrhu je jen opsaných, bez průběhu z exportu'] : [];
    var gateWeak = gate ? ['pacient rady k tomuto jídlu dne zkoušel jen ' + acceptedAdvice.length + '× (' + radyNabidka + '); podle postupu jde jídlo před dávkou, karta „Nejdřív rady“ je výš'] : [];
    out.push(withPostup({ id: 'PR-' + meal.toUpperCase(), kind: 'dose', dose: meal, cat: 'davka', priority: gate ? 3.5 : 2, title: 'Posoudit prandiální dávku ' + NF.mealLabel(meal, 'ke') + ' – hodnoty nad cílem',
      why: above.length + ' ' + NF.z(eps.length) + ' ' + eps.length + ' ' + NF.MEAL_GPL[meal] + ' za ' + winDays + ' dní s obvyklou porcí a potvrzenou dávkou mělo vrchol glukózy po jídle nad ' + NF.mmol1(t.high) + ' mmol/l (medián vrcholu ' + NF.mmol1(medPeak) + ' mmol/l). Rada k jídlu: ' + radyNabidka + '.' + cmpTxt,
      breakdown: breakdown, context: bal, rows: stats.trend ? [{ label: 'Vývoj vrcholů v čase', text: stats.trend.text }] : [], weak: lw.weak.concat(gateWeak, selfLowerWeak(meal), hbaWeak, heteroWeak, copiedWeak, excluded ? [excludedText] : []), excluded: excludedList, lows: lw.list, lowsTitle: 'Poklesy pod 4 ' + NF.MEAL_PO[meal] + ' v období',
      lowBlock: lw.block, /* kontrola 3, A1: blok „zvýšit“ platí i bez schváleného postupu */ stats: stats,
      item: 'D-PRAND', needs: ['D-CISTA'] }, 'prandHigh', { meal: NF.mealLabel(meal, 'ke'), tirGoal: t.tirGoal, radyPrve: radyPrve, odmitnutiMin: odmMin }, {
        davky: (function () { /* C4 (31/02): u návrhu ke zvýšení lékař vidí i to, kolikrát si pacient dal jinou dávku a kolikrát nevěděl */
          var lower = all.filter(function (e) { return e.insulin && e.insulin.confirmed === 'other' && e.insulin.units != null && e.insulin.units < e.insulin.prescribed; }), higher = all.filter(function (e) { return e.insulin && e.insulin.confirmed === 'other' && e.insulin.units != null && e.insulin.units > e.insulin.prescribed; }), unk = all.filter(function (e) { return e.insulin && e.insulin.confirmed === 'unknown'; }).length;
          var u = function (l) { return l.map(function (e) { return e.insulin.units; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).sort(function (a, b) { return a - b; }).join(', ') + ' j.'; };
          return { text: 'včas ' + all.filter(function (e) { return e.insulin && e.insulin.confirmed === 'as' && NF.onTime(S, e); }).length + ' ' + NF.z(all.length) + ' ' + all.length + ' zápisů' + (lower.length ? ' · ' + lower.length + '× nižší dávka (' + u(lower) + ')' : '') + (higher.length ? ' · ' + higher.length + '× vyšší dávka (' + u(higher) + ')' : '') + (unk ? ' · ' + unk + '× nevím' : '') };
        })(),
        vrcholy: { text: above.length + ' ' + NF.z(eps.length) + ' ' + eps.length + ' nad cílem · medián ' + NF.mmol1(medPeak) + ' mmol/l' },
        svacina: (function (n) { return { text: n ? 'svačina do 2 h u ' + NF.plural(n, 'zápisu', 'zápisů', 'zápisů') + ' – vyřazeno' : 'svačina do 2 h ani jednou' }; })(all.filter(function (e) { return NF.snackAfter(S, e); }).length),
        nemoc: (function (n) { return { text: n ? NF.plural(n, 'zápis', 'zápisy', 'zápisů') + ' z nemoci – vyřazeno' : 'žádný zápis z nemoci' }; })(all.filter(function (e) { return NF.inIllness(S, e); }).length),
        vyrovnani: vyrovnani, jidla: jidlaFakt, poklesy: lw.fakt, shoda: shodaFakt, rady: radyBod }));
  });
  /* Bazál bez karty (rozhodnutí 1): řádek s ranními hodnotami a stejným voličem. */
  if (!out.some(function (x) { return x.id === 'PR-BAZAL'; })) out.push({ id: 'PR-BAZAL', kind: 'dose', dose: 'basal', cat: 'davka', priority: 7, row: true, title: 'Bazál – bez návrhu', why: morningsTxt + ' · bez návrhu' + (NF.usable(S, 'D-BAZAL') ? ' (noci bez poklesu, ranní hodnoty v cíli nebo málo nocí z exportu)' : ' (návrh k bazálu není v registru schválený)'), weak: [], verify: [], branches: [], facts: [], nurse: [], rows: fastTrendRow ? [fastTrendRow] : [], item: NF.usable(S, 'D-BAZAL') ? 'D-BAZAL' : null, stats: { mornings: mornings, trend: fastTrend } });
  /* --- návyky ---
     A12 (27. 10. 2026): karty „Probrat / Vyměnit / Zachovat radu“ stojí na prazích D-PRAND a postupu D-POSTUP „adviceReview“ (bod a větve z registru). */
  var adv = NF.adviceOutcome(S, planId);
  if (NF.usable(S, 'D-PRAND')) Object.keys(adv.byLever).forEach(function (l) { /* kontrola 2: návrhy k radám stojí na prazích D-PRAND – se zamítnutou D-PRAND nevzniknou (karta by nesla zamítnutý štítek) */
    var b = adv.byLever[l], meta = NF.LEVERS[l];
    if (!NF.usable(S, meta.item)) return; /* zamítnutá položka registru se v reportu nenavrhuje (6. 10. 2026) */
    if (b.offered < odmMinAll) return;
    var topR = Object.keys(b.reasons).sort(function (x, y) { return b.reasons[y] - b.reasons[x]; })[0];
    if (b.declined / b.offered >= odmPodilAll) {
      if (radyLevers.indexOf(l) >= 0) return; /* sloučeno s návrhem „Nejdřív rady“, který má větev „vyměnit radu“ (02 #21) */
      var impractical = topR === 'nothome' || topR === 'taste';
      out.push(withPostup({ id: 'PR-SWAP-' + l, kind: 'habit', cat: 'plan', priority: 4, lever: l, swapWanted: impractical, title: (impractical ? 'Vyměnit radu „' : 'Probrat radu „') + meta.label + '“',
        why: 'Odmítnuta ' + b.declined + '× ' + NF.z(b.offered) + ' ' + b.offered + ' nabídek' + (topR ? ', nejčastěji „' + NF.reasonLabel(topR) + '“' : '') + '. ' + (impractical ? 'To ukazuje na nepraktickou radu, ne na neochotu.' : 'Stojí za to zjistit proč.'),
        weak: [], item: 'D-PRAND' }, 'adviceReview', { lever: meta.label }, { rada: { text: 'nabídek ' + b.offered + ': odmítnuto ' + b.declined + (topR ? ', nejčastěji „' + NF.reasonLabel(topR) + '“' : ''), against: impractical } }));
    } else if (b.accepted >= odmMinAll) {
      /* B4 (31/02): rada, kterou aplikace u některých jídel sama stáhla (doplněk po R-DOPLNEK.stahnout_po pokusech bez jediného v cíli), není „beze změny“:
         lékař ji dostane jako samostatný návrh „Probrat radu“ s výčtem jídel, u kterých se už nenabízí. */
      var pulled = [];
      if (l === 'addon') { var seenF = {}; NF.periodEpisodes(S, planId).forEach(function (e) { var k = e.foodId + ':' + e.meal; if (seenF[k] || !NF.acceptedLever(S, e, 'addon')) return; seenF[k] = 1; if (NF.addonWithdrawn(S, e.foodId, e.meal)) { var fo = NF.foodById(S, e.foodId); pulled.push(fo ? fo.name : e.foodId); } }); pulled = pulled.filter(function (x, i, a) { return a.indexOf(x) === i; }); }
      var pulledTxt = pulled.length ? ' U ' + NF.plural(pulled.length, 'jídla', 'jídel', 'jídel') + ' ji aplikace stáhla po ' + NF.param(S, 'R-DOPLNEK', 'stahnout_po', 3) + ' pokusech, po kterých glukóza ani jednou nebyla v cíli: ' + pulled.map(function (x) { return '„' + x + '“'; }).join(', ') + '; tam se už nenabízí.' : '';
      out.push(withPostup({ id: 'PR-KEEP-' + l, kind: 'habit', cat: 'plan', priority: pulled.length ? 4 : 5, lever: l, group: pulled.length ? undefined : 'keep', pulled: pulled, title: (pulled.length ? 'Probrat radu „' : 'Zachovat radu „') + meta.label + '“',
        why: 'Přijata ' + b.accepted + '× ' + NF.z(b.offered) + ' ' + b.offered + ' nabídek' + (b.multi ? ' (' + b.multi + '× ' + NF.WITH_OTHER + ')' : '') + '.' + pulledTxt + ' ' + (function () {
          /* V10 (21. 10. 2026): „podobně“ (rozdíl pod prahem) má vlastní větu; „nebylo níž“ jen když s radou bylo výš */
          var nums = NF.mmol1(b.medAcc) + ' vs. ' + NF.mmol1(b.medDec) + ' mmol/l (' + NF.nPair(b.nAcc, b.nDec) + ').';
          if (b.lower === 'yes') return 'S radou bývalo níž: medián vrcholu ' + nums;
          if (b.lower === 'few') return 'Jestli s radou bývalo níž, zatím nelze říct (málo zápisů v jedné ze skupin).';
          if (b.lower === 'same') return 'S radou bývalo podobně (rozdíl pod ' + NF.mmol1(NF.param(S, 'S-SOUHRN', 'rozdil_mmol', 1.0)) + ' mmol/l): ' + nums;
          return 'S radou nebylo níž: medián vrcholu ' + nums;
        })(),
        weak: [], item: 'D-PRAND' }, 'adviceReview', { lever: meta.label }, { rada: { text: 'nabídek ' + b.offered + ': přijato ' + b.accepted + (pulled.length ? ' · staženo u ' + NF.plural(pulled.length, 'jídla', 'jídel', 'jídel') : '') } }));
    }
  });
  var exc = NF.instructionExceptions(S, p.instructions);
  out.push(withPostup({ id: 'PR-POKYNY', kind: 'instructions', cat: 'pokyny', priority: 6, group: 'keep', title: 'Bezpečnostní pravidla beze změny?',
    why: 'Pravidla jsou v plánu ze schváleného registru s výchozími hodnotami' + (exc.length ? '; výjimky u tohoto pacienta: ' + exc.join(', ') + '.' : ', bez výjimek.'), /* 21. 10. 2026: pokyny automaticky v plánu, lékař podepisuje plán jako celek */
    weak: [], item: 'R-POKYNY' }, 'pokynyBezeZmeny', {}, {})); /* A12: štítky R-POKYNY + D-POSTUP */
  if (!NF.usable(S, 'D-POSTUP')) out.forEach(function (pr) { if (pr.postup) { pr.branches = []; pr.postup = null; pr.weak = pr.weak.filter(function (w) { return w.indexOf('schválený postup') < 0; }); pr.weak.push('postup posouzení dávky není v registru schválený, takže větev nelze ukázat; rozhodněte sami'); } });
  out.sort(function (a, b) { return a.priority - b.priority; });
  return out;
};
/* Návrhy „beze změny“ tvoří jednu kartu; ostatní se rozhodují jeden po druhém. */
NF.proposalIsSingle = function (S, pr) { return !pr.group || !!(S.review && S.review.single && S.review.single[pr.id]); };
NF.nextProposal = function (S) { var r = S.review; if (!r) return null; return r.proposals.filter(function (pr) { return !pr.row && !r.decisions[pr.id] && NF.proposalIsSingle(S, pr); })[0] || null; };
/* Řádky „bez návrhu“ (SCHEMA 84, rozhodnutí 1) nejsou karty: nevyžadují rozhodnutí, lékař u nich může zvolit jinou dávku. */
NF.reviewRows = function (S) { var r = S.review; return r ? r.proposals.filter(function (pr) { return pr.row; }) : []; };
NF.reviewCards = function (S) { var r = S.review; return r ? r.proposals.filter(function (pr) { return !pr.row; }) : []; };
NF.HABIT_OF = { walk: 'H-PROCHAZKA' }; /* rada svázaná s návykem plánu */
NF.swapOptions = function (S, pr) {
  var r = S.review, off = (NF.planAdvice(S).off || []).slice();
  if (r) r.proposals.forEach(function (x) { var d = r.decisions[x.id]; if (d && d.choice === 'agree' && d.branch === 'swap' && x.lever) off.push(x.lever); if (x.swapWanted && x.lever) off.push(x.lever); /* rada sama navržená k výměně (nepraktická) není náhradou */ });
  /* Náhradou je jen rada, která pacientovi dosud nechodila (A27, 27. 10. 2026): ne rada nabízená v kontrolovaném období ani rada, kterou lékař už doporučil. */
  var pa = NF.planAdvice(S), had = r ? NF.adviceOutcome(S, r.planId).byLever : {};
  return Object.keys(NF.LEVERS).filter(function (l) { return l !== 'portion' && l !== pr.lever && off.indexOf(l) < 0 && NF.usable(S, NF.LEVERS[l].item) && !(had[l] && had[l].offered > 0) && (pa.prefer || []).indexOf(l) < 0; });
};
/* „Vše sedí“ označí body, kterým data neodporují; bod se štítkem „data říkají jinak“ nechá, jak je (LF-06, 20. 10. 2026). Ostatní volby lékaře zůstanou. */
NF.verifyAgainst = function (pr, i) { return !!(pr.facts && pr.facts[i] && pr.facts[i].against); };
/* Bod, který podle dat nesedí a lékař ho nepřepíná (A1: pokles pod 4 u jídla v období blokuje větev „zvýšit“). */
NF.verifyBlocked = function (pr, i) { return !!(pr.facts && pr.facts[i] && pr.facts[i].block); };
/* Kontrola 4 (bod 7, rozhodnutí vlastníka 30. 10. 2026): body, které nejdou ověřit z dat (technika a místo píchání, jídlo mezi jídlem a měřením, nemoc a stres),
   projde s pacientem sestra před lékařem (S.nurseCheck). Lékař vidí její odpověď jako výchozí stav bodu a může ji změnit; „Vše sedí“ tyto body nepřepíná. */
NF.nurseKey = function (pr, i) { return (pr && pr.nurse && pr.nurse[i]) || null; };
NF.nurseAnswer = function (S, key) { var n = S.nurseCheck && S.nurseCheck.points; return key && n && (n[key] === true || n[key] === false) ? n[key] : undefined; };
NF.verifyByNurse = function (S, pr, i) { var v = (S.review && S.review.verify[pr.id]) || {}; return v[i] === undefined && NF.nurseAnswer(S, NF.nurseKey(pr, i)) !== undefined; };
NF.verifyState = function (S, pr, i) { if (NF.verifyBlocked(pr, i)) return false; var v = (S.review && S.review.verify[pr.id]) || {}; return v[i] !== undefined ? v[i] : NF.nurseAnswer(S, NF.nurseKey(pr, i)); };
NF.verifyAll = function (S, id) { var r = S.review, pr = r && r.proposals.filter(function (x) { return x.id === id; })[0]; if (!pr) return; var v = r.verify[id] = r.verify[id] || {}; pr.verify.forEach(function (_, i) { if (!NF.verifyAgainst(pr, i) && !NF.nurseKey(pr, i)) v[i] = true; }); };
/* SCHEMA 84 (rozhodnutí vlastníka 4. 11. 2026, bod 5): kohorta jen inzulin – na kontrole otázka „Začal pacient brát jiný lék na diabetes?“ Ne / Ano (K-KRITERIA).
   Zdravotní stav je druhá otázka (32/02 C8): volby podle pohlaví pacienta (S.patient.sex 'm' | 'f'; bez údaje se těhotenství uvádí). Starší hodnoty same / changed / health se čtou dál. */
NF.NURSE_MEDS = [['no', 'Ne'], ['yes', 'Ano']];
NF.NURSE_HEALTH = [['no', 'Ne'], ['yes', 'Ano']];
NF.MEDS_QUESTION = 'Začal pacient brát jiný lék na diabetes?';
NF.healthQuestion = function (S) { var sex = S.patient && S.patient.sex; return 'Změnil se zdravotní stav (' + (sex === 'm' ? 'ledviny, játra, hospitalizace' : 'těhotenství, ledviny, játra, hospitalizace') + ')?'; };
NF.medsValue = function (v) { return v === 'same' ? 'no' : v === 'changed' ? 'yes' : v === 'health' ? 'no' : v; }; /* starší uložený stav */
NF.healthValue = function (n) { return !n ? undefined : n.health ? n.health : n.meds === 'health' ? 'yes' : undefined; };
NF.MEDS_LOG = { no: 'žádný jiný lék na diabetes', yes: 'začal jiný lék na diabetes' };
NF.medsText = function (v) { v = NF.medsValue(v); return v === 'yes' ? 'Zapsáno do stopy. Pacient začal brát jiný lék na diabetes: zápisy z období po změně se ve studii hodnotí zvlášť a posuďte, zda NutriFee pro pacienta dál platí (podmínky zařazení: jen inzulin).' : v === 'no' ? 'Zapsáno do stopy.' : 'Odpověď se jen zapíše do stopy; na dávky inzulinu nemá vliv.'; };
NF.healthText = function (v) { return v === 'yes' ? 'Zapsáno do stopy. Posuďte, zda NutriFee pro pacienta dál platí (těhotenství, ledviny, játra a hospitalizace jsou vylučovací kritéria).' : v === 'no' ? 'Zapsáno do stopy.' : 'Odpověď se jen zapíše do stopy.'; };
/* Hmotnost (rozhodnutí vlastníka 4. 11. 2026, bod 6; 32/02 B7): při zařazení z karty pacienta, na kontrole ji vybere sestra voličem (mřížka po 5 kg a ±1); dlaždice „Hmotnost dříve · teď“. */
NF.WEIGHT_GRID = (function () { var g = []; for (var k = 50; k <= 150; k += 5) g.push(k); return g; })();
NF.weightLog = function (S) { var p = S.patient || {}; return Array.isArray(p.weightLog) ? p.weightLog : []; };
NF.weightFor = function (S, plan, until) {
  var log = NF.weightLog(S).filter(function (x) { return Number.isFinite(x.kg); }), start = plan ? NF.day(plan.issuedAt || plan.effectiveFrom) : null, end = until ? NF.day(until) : NF.day(S.clock);
  var before = null, now = null;
  log.forEach(function (x) { var d = x.date || '0000-00-00'; if (!start || d <= start) { if (!before || d >= (before.date || '0000-00-00')) before = x; } else if (d <= end) { if (!now || d >= (now.date || '')) now = x; } });
  return { before: before, now: now };
};
NF.setWeight = function (S, src, kg, date) {
  var v = Number(kg);
  if (!Number.isFinite(v) || Math.round(v) !== v || v < 30 || v > 250) return { ok: false, error: 'Vyberte hmotnost.' };
  S.patient = S.patient || {}; var log = S.patient.weightLog = NF.weightLog(S).slice();
  var p = NF.activePlan(S), start = p ? NF.day(p.issuedAt) : null;
  var mine = log.filter(function (x) { return x.src === src && (src !== 'sestra' || !start || !x.date || x.date > start); })[0];
  if (!mine) { mine = { src: src }; log.push(mine); }
  mine.kg = v; mine.date = date !== undefined ? date : (mine.date || NF.day(S.clock)); mine.at = S.clock;
  NF.log(S, 'hmotnost', v + ' kg · ' + (src === 'sestra' ? 'vybrala sestra' : 'karta pacienta'), { kg: v, date: mine.date, src: src });
  return { ok: true, entry: mine };
};
NF.nurseKeys = function (S) { var r = NF.item(S, 'D-POSTUP'); return r && NF.usable(S, 'D-POSTUP') && r.sestra ? Object.keys(r.sestra) : []; };
/* B5 (31/03): odpovědi sestry patří k období aktivního plánu; po vydání dalšího plánu začíná sestra s prázdnou částí. */
NF.nurseCheckFor = function (S) { var p = NF.activePlan(S), n = S.nurseCheck; return n && (!n.planId || (p && n.planId === p.id)) ? n : {}; };
function nurseBox(S) { var p = NF.activePlan(S), n = S.nurseCheck; if (!n || (n.planId && p && n.planId !== p.id)) n = S.nurseCheck = { points: {}, meds: null, at: null }; n.planId = p ? p.id : null; n.points = n.points || {}; return n; }
NF.setNurseHbaNone = function (S) { var n = nurseBox(S); n.hbaNone = !n.hbaNone; n.at = S.clock; NF.log(S, 'hba1c', n.hbaNone ? 'nový výsledek zatím není (zapsala sestra)' : 'zrušeno', { none: n.hbaNone }); return { ok: true }; };
NF.setNurseCheck = function (S, key, value) {
  if (NF.nurseKeys(S).indexOf(key) < 0 || (value !== true && value !== false && value !== null)) return { ok: false };
  var n = nurseBox(S);
  if (value === null) delete n.points[key]; else n.points[key] = value; n.at = S.clock;
  NF.log(S, 'kontrola.sestra', key + ' · ' + (value === true ? 'sedí' : value === false ? 'nesedí' : 'zrušeno'), { key: key, value: value, item: 'D-POSTUP' });
  return { ok: true };
};
NF.setNurseMeds = function (S, v) {
  v = NF.medsValue(v); if (!NF.NURSE_MEDS.some(function (x) { return x[0] === v; })) return { ok: false };
  var n = nurseBox(S); n.meds = v; n.at = S.clock;
  if (S.review && !S.review.planIssued) S.review.meds = v;
  NF.log(S, 'kontrola.leky', NF.MEDS_LOG[v] + ' (zapsala sestra)', { item: 'K-KRITERIA', by: 'sestra', value: v });
  return { ok: true };
};
NF.setNurseHealth = function (S, v) {
  if (!NF.NURSE_HEALTH.some(function (x) { return x[0] === v; })) return { ok: false };
  var n = nurseBox(S); n.health = v; n.at = S.clock;
  if (S.review && !S.review.planIssued) S.review.health = v;
  NF.log(S, 'kontrola.stav', (v === 'yes' ? 'změnil se zdravotní stav' : 'zdravotní stav beze změny') + ' (zapsala sestra)', { item: 'K-KRITERIA', by: 'sestra', value: v });
  return { ok: true };
};
NF.keepAll = function (S) {
  var r = S.review; if (!r) return { ok: false };
  /* „Potvrdit vše beze změny“ je rozhodnutí bez ověřovacích bodů: body se potichu neoznačují jako „sedí“ (02 #24, 23. 10. 2026). */
  r.proposals.forEach(function (pr) { if (pr.group && !r.decisions[pr.id] && !NF.proposalIsSingle(S, pr)) NF.decideProposal(S, pr.id, { choice: 'keep', branch: 'keep', bulk: true }); });
  return { ok: true };
};

/* Report = souhrn + návrhy, sestavený jednou na začátku kontroly a zapsaný do stopy. */
NF.startReview = function (S, catalog) {
  var p = NF.activePlan(S); if (!p) return { ok: false, error: 'Není plán.' };
  var props = NF.proposals(S, p.id, catalog);
  S.review = { planId: p.id, startedAt: S.clock, step: 1, index: 0, summary: NF.summary(S, p.id), proposals: props, decisions: {}, verify: {}, newDoses: NF.clone(p.doses), newInstructions: NF.clone(p.instructions || []), newTargets: NF.clone(p.targets || NF.defaultTargets(S)), meds: NF.medsValue((S.nurseCheck && S.nurseCheck.meds) || undefined), health: NF.healthValue(S.nurseCheck), validDays: NF.VALIDITY_DEFAULT };
  NF.log(S, 'kontrola.zahajena', p.id, { summary: S.review.summary, proposals: props.map(function (x) { return { id: x.id, title: x.title, item: x.item }; }) });
  return { ok: true };
};
/* Léky mimo inzulin (tablety, GLP-1, jiné) od minulé kontroly: beze změny / měnily se. Jen záznam do stopy pro očištění analýzy (21. 10. 2026). */
NF.setReviewMeds = function (S, v) {
  var r = S.review; if (!r) return { ok: false };
  if (v === 'health') return NF.setReviewHealth(S, 'yes'); /* starší volání: třetí volba „změnil se zdravotní stav“ (kontrola 4, 06 B4) je od SCHEMA 84 druhá otázka */
  v = NF.medsValue(v); if (!NF.NURSE_MEDS.some(function (x) { return x[0] === v; })) return { ok: false };
  r.meds = v; NF.log(S, 'kontrola.leky', NF.MEDS_LOG[v], { planId: r.planId, item: 'K-KRITERIA', value: v });
  return { ok: true };
};
NF.setReviewHealth = function (S, v) {
  var r = S.review; if (!r || !NF.NURSE_HEALTH.some(function (x) { return x[0] === v; })) return { ok: false };
  r.health = v; NF.log(S, 'kontrola.stav', v === 'yes' ? 'změnil se zdravotní stav' : 'zdravotní stav beze změny', { planId: r.planId, item: 'K-KRITERIA', value: v });
  return { ok: true };
};
NF.decideProposal = function (S, id, decision) {
  var r = S.review; if (!r) return { ok: false, error: 'Kontrola není zahájená.' };
  var pr = r.proposals.filter(function (x) { return x.id === id; })[0]; if (!pr) return { ok: false, error: 'Návrh nenalezen.' };
  if (S.role !== 'doctor') return { ok: false, error: 'Rozhoduje lékař.' };
  /* Kontrola 3, A1: pokles pod 4 u jídla v období – zvýšení dávky není nikdy souhlas s postupem (ani bez schváleného postupu); zapíše se jako „rozhodnuto jinak“ proti datům. */
  if (pr.kind === 'dose' && pr.lowBlock && decision.units != null && (decision.choice === 'agree' || decision.choice === 'other')) {
    var pl = NF.activePlan(S), cu = pl && pl.doses[pr.dose] ? pl.doses[pr.dose].units : null;
    if (cu != null && decision.units > cu) { decision = NF.clone(decision); decision.choice = 'other'; decision.againstBranch = true; decision.againstData = true; }
  }
  if (pr.row && decision.choice !== 'other' && decision.choice !== 'keep') return { ok: false, error: 'U jídla bez návrhu lze jen zvolit jinou dávku, nebo ji ponechat.' }; /* SCHEMA 84: řádek bez karty */
  r.decisions[id] = { choice: decision.choice, reason: decision.reason || null, comment: decision.comment || '', at: S.clock, branch: decision.branch || null, units: decision.units != null ? decision.units : null, swapTo: decision.swapTo || null, againstBranch: !!decision.againstBranch, againstData: !!decision.againstData, bulk: !!decision.bulk, noProposal: !!pr.row, viaPlan: !!decision.viaPlan };
  if (pr.kind === 'dose') {
    /* Vydávanou dávku mění jen „Souhlasím“ (větev zvýšit/snížit) nebo výslovné „jiná dávka“ s jednotkami; „ponechat“ a „zamítnout“ vrátí volič na dávku plánu (nález 1, 23. 10. 2026). */
    var p0 = NF.activePlan(S);
    if ((decision.choice === 'agree' || decision.choice === 'other') && decision.units != null) r.newDoses[pr.dose].units = decision.units;
    else { r.decisions[id].units = null; if (p0 && p0.doses[pr.dose]) r.newDoses[pr.dose].units = p0.doses[pr.dose].units; }
  }
  NF.log(S, 'navrh.rozhodnut', id + ' → ' + decision.choice, r.decisions[id]);
  var i = r.proposals.indexOf(pr);
  if (i === r.index && r.index < r.proposals.length - 1) r.index++;
  return { ok: true };
};
/* SCHEMA 84 (rozhodnutí vlastníka 4. 11. 2026, bod 1): volič „jiná dávka“ u každé dávky – u karty s větví „ponechat“, u řádku bez karty i v kroku potvrzení plánu.
   Změna proti větvi se zapíše jako „rozhodnuto jinak než postup“; zvýšení u jídla s blokujícím poklesem navíc jako rozhodnutí proti datům (decideProposal). Výši nikdy nenavrhuje aplikace. */
NF.setReviewDose = function (S, key, units) {
  var r = S.review, u = Number(units); if (!r || r.planIssued || !r.newDoses[key] || !Number.isFinite(u) || Math.round(u) !== u || u < 1 || u > 60) return { ok: false };
  r.newDoses[key].units = u; return { ok: true };
};
NF.decideOtherDose = function (S, id, units, branchAction) {
  var r = S.review, pr = r && r.proposals.filter(function (x) { return x.id === id; })[0]; if (!pr || pr.kind !== 'dose') return { ok: false, error: 'Návrh nenalezen.' };
  var p = NF.activePlan(S), cu = p && p.doses[pr.dose] ? p.doses[pr.dose].units : null, u = Number(units);
  if (!Number.isFinite(u) || Math.round(u) !== u || u < 1 || u > 60) return { ok: false, error: 'Vyberte dávku.' };
  if (u === cu) return { ok: false, error: 'Jiná dávka musí být jiná než dnes (' + cu + ' j.). Ponechat dávku můžete tlačítkem „Ponechat beze změny“.' };
  return NF.decideProposal(S, id, { choice: 'other', units: u, branch: branchAction || null, againstBranch: !!branchAction && branchAction !== 'free' });
};
NF.setPlanDose = function (S, key, units) {
  var r = S.review; if (!r || r.planIssued) return { ok: false };
  var pr = r.proposals.filter(function (x) { return x.kind === 'dose' && x.dose === key; })[0]; if (!pr) return { ok: false, error: 'Dávka nenalezena.' };
  var p = NF.activePlan(S), cu = p && p.doses[key] ? p.doses[key].units : null, u = Number(units), dec = r.decisions[pr.id];
  if (!Number.isFinite(u) || Math.round(u) !== u || u < 1 || u > 60) return { ok: false };
  if (u === cu) { if (dec && dec.units != null) return NF.decideProposal(S, pr.id, { choice: 'keep', branch: dec.branch || null, viaPlan: true }); r.newDoses[key].units = cu; return { ok: true }; }
  return NF.decideProposal(S, pr.id, { choice: 'other', units: u, branch: dec ? dec.branch : null, againstBranch: !!(dec && dec.branch && dec.branch !== 'free'), viaPlan: true });
};
NF.stepPlanDose = function (S, key, delta) { var r = S.review, d = Number(delta); if (!r || !r.newDoses[key] || !Number.isFinite(d)) return { ok: false }; return NF.setPlanDose(S, key, Math.max(1, Math.min(60, r.newDoses[key].units + d))); };
/* Kontrola je uzavřená, když pacient převzal plán, který z ní vzešel; další kontrola pak začíná znovu. */
NF.reviewClosed = function (S) { var r = S.review, p = NF.activePlan(S); return !!(r && r.planIssued && p && p.id === r.planIssued && p.understood); };
/* Dvě a více změn dávek v jedné kontrole (rozhodnutí vlastníka 25. 10. 2026): neutrální věta z položky D-POSTUP (texts.postupne), žádný zámek ani směr. */
NF.manyDosesText = function (S, n) {
  if (n < 2) return ''; var T = NF.texts(S, 'D-POSTUP'), tpl = (T && T.postupne) || 'Měníte {n} najednou; posuďte, zda je změnit postupně.';
  return NF.fillText(tpl, { n: NF.plural(n, 'dávku', 'dávky', 'dávek') });
};
NF.reviewComplete = function (S) { var r = S.review; return !!r && r.proposals.every(function (p) { return p.row || r.decisions[p.id]; }); };
/* Nový plán z rozhodnutí kontroly (dávky, návyky, rady, pokyny) – stejný výpočet pro náhled i vydání. */
NF.planFromReview = function (S) {
  var r = S.review, prev = NF.activePlan(S); if (!r || !prev) return null;
  var d = NF.newDraft(S); d.validUntil = NF.addDays(S.clock, r.validDays || NF.VALIDITY_DEFAULT); /* platnost voličem (32/02 C9) */
  /* Dávky nového plánu se skládají z dávek plánu a rozhodnutí s jednotkami – ne z pracovní kopie voliče (nález 1, 23. 10. 2026). */
  d.doses = NF.clone(prev.doses);
  r.proposals.forEach(function (pr) { var dec = r.decisions[pr.id]; if (pr.kind === 'dose' && dec && (dec.choice === 'agree' || dec.choice === 'other') && dec.units != null && d.doses[pr.dose]) d.doses[pr.dose].units = dec.units; });
  d.instructions = NF.clone(r.newInstructions || prev.instructions); d.targets = NF.clone(r.newTargets || prev.targets);
  d.habits = NF.reviewHabits(S).slice(); d.advice = NF.clone(NF.planAdvice(S, prev)); d.medicationChecked = true; d.instructionsChecked = true; /* návyky z kroku 3 kontroly (rozhodnutí 6) */
  var habitOf = NF.HABIT_OF;
  r.proposals.forEach(function (pr) {
    var dec = r.decisions[pr.id]; if (!dec) return;
    var swapped = null;
    if (pr.lever && (dec.choice === 'agree' || dec.choice === 'other') && dec.branch === 'swap') {
      swapped = dec.swapTo || null;
      if (d.advice.off.indexOf(pr.lever) < 0) d.advice.off.push(pr.lever);
      d.advice.prefer = d.advice.prefer.filter(function (x) { return x !== pr.lever; });
      if (habitOf[pr.lever]) d.habits = d.habits.filter(function (h) { return h !== habitOf[pr.lever]; });
      if (swapped) {
        d.advice.off = d.advice.off.filter(function (x) { return x !== swapped; });
        if (d.advice.prefer.indexOf(swapped) < 0) d.advice.prefer.push(swapped);
        if (habitOf[swapped] && d.habits.indexOf(habitOf[swapped]) < 0) d.habits.push(habitOf[swapped]);
      }
    }
    /* Věty pro pacienta se skládají z výsledku, ne z názvů návrhů (6. 10. 2026). */
    var subj = pr.kind === 'dose' ? (pr.dose === 'basal' ? 'Bazál na noc' : 'Inzulin ' + NF.mealLabel(pr.dose, 'ke')) : pr.lever ? 'Rada „' + NF.LEVERS[pr.lever].label + '“' : pr.kind === 'instructions' ? 'Pravidla a cíle' : 'Plán';
    var txt;
    /* B14 (nezávislá kontrola 27. 10. 2026): u změny jedna věta proč – z toho, co návrh pozoroval, bez čísel dávky */
    var upDose = dec.units != null && prev.doses[pr.dose] && dec.units > prev.doses[pr.dose].units;
    var doseWhy = pr.kind === 'dose' ? (pr.dose === 'basal' ? (upDose ? ' Ráno bývala glukóza nad cílem.' : ' V noci glukóza klesala pod cíl.') : ' ' + NF.cap(NF.MEAL_PO[pr.dose] || 'po jídle') + (upDose ? ' bývala glukóza nad cílem i s radami.' : ' glukóza klesala pod cíl.')) : '';
    if ((dec.choice === 'agree' || dec.choice === 'other') && dec.units != null) txt = 'lékař nastavil ' + dec.units + ' j. (dřív ' + prev.doses[pr.dose].units + ' j.).' + (pr.row ? (upDose ? ' ' + NF.cap(NF.MEAL_PO[pr.dose] || 'po jídle') + ' bývala glukóza častěji nad cílem.' : '') : doseWhy);
    else if (swapped) txt = 'lékař ji nahradil radou „' + NF.LEVERS[swapped].label + '“. Původní rada vám v běžném dni nešla použít.';
    else if (dec.branch === 'swap' && dec.choice === 'agree') txt = 'lékař ji vypnul. V běžném dni vám nešla použít.';
    else if (dec.branch === 'edit' && dec.choice === 'agree') txt = 'lékař je upravil; najdete je v Bezpečí a v Plánu';
    else if (dec.choice === 'reject') txt = 'lékař náš návrh zamítl, nic se nemění';
    else if (pr.row) return; /* řádek bez návrhu a beze změny: pacientovi není co říkat (SCHEMA 84) */
    /* B7 (31/02): ponechaná dávka kvůli poklesům pod 4 – pacient se dozví proč, bez čísel dávky a bez rady k jídlu (rada je dohoda z ordinace) */
    else if (pr.kind === 'dose' && (/pod cílem/.test(pr.title) || pr.lowBlock || (pr.lows && pr.lows.length))) txt = 'beze změny. ' + (pr.dose === 'basal' ? 'V noci glukóza klesala pod 4' : NF.cap(NF.MEAL_PO[pr.dose] || 'po jídle') + ' glukóza klesla pod 4') + '; lékař dávku ponechal a probral to s vámi.';
    else txt = 'beze změny';
    if (!d.decisions.some(function (x) { return x.title === subj && x.text === txt; })) d.decisions.push({ id: pr.id, title: subj, text: txt }); /* žádný řádek „Proč lékař rozhodl takto“ dvakrát (A27) */
  });
  return d;
};
NF.issueFromReview = function (S, catalog) {
  var r = S.review; if (!r) return { ok: false, error: 'Kontrola není zahájená.' };
  if (!NF.reviewComplete(S)) return { ok: false, error: 'Nejdřív rozhodněte všechny návrhy.' };
  if (r.planIssued) return { ok: false, error: 'Plán už je vydaný.' };
  var d = NF.planFromReview(S), prev = NF.activePlan(S);
  /* Zámek vydání: dávka v novém plánu se liší od plánu právě tehdy, když k ní existuje rozhodnutí s jednotkami (nález 1). */
  var bad = Object.keys(d.doses).filter(function (k) { var dec = r.proposals.filter(function (pr) { return pr.kind === 'dose' && pr.dose === k; }).map(function (pr) { return r.decisions[pr.id]; })[0]; var decided = !!(dec && (dec.choice === 'agree' || dec.choice === 'other') && dec.units != null); return (d.doses[k].units !== prev.doses[k].units) !== decided; });
  if (bad.length) return { ok: false, error: 'Dávka (' + bad.join(', ') + ') se mění bez rozhodnutí lékaře; plán nelze vydat.' };
  S.draft = d;
  var res = NF.issuePlan(S, catalog); if (!res.ok) return res;
  NF.handover(S);
  r.planIssued = res.plan.id; r.step = 4;
  return { ok: true, plan: res.plan };
};

/* ---------- připomínky v telefonu (kontrola 4, bod 4, rozhodnutí vlastníka 30. 10. 2026; S-PRIPOMINKY) ----------
   Nejvýš 4 denně (tři jídla a bazál) v časech, které pacient vybere se sestrou při zaučení; pacient je může vypnout, lékař nic nenastavuje.
   Navíc otázka „Klesla glukóza pod 4?“ v čase sledování B-HYPO. Připomínka je oznámení telefonu: jen otevře Dnes, bez sítě; k zapsanému nebo vynechanému jídlu nepřijde. */
NF.REMINDER_KEYS = ['breakfast', 'lunch', 'dinner', 'basal'];
NF.reminderOptions = function (S, key) { var L = NF.itemLists(S, 'S-PRIPOMINKY'); return ((L.casy || {})[key]) || []; };
NF.reminderSettings = function (S) {
  var p = NF.activePlan(S), r = S.reminders || {}, times = {}, off = r.off || {};
  NF.REMINDER_KEYS.forEach(function (k) {
    var opts = NF.reminderOptions(S, k), t = r.times && r.times[k];
    if (!t) t = k === 'basal' && p && p.doses.basal.time ? String(p.doses.basal.time).replace(/^0/, '') : opts[Math.min(1, opts.length - 1)] || null; /* výchozí: druhá volba; bazál v čase z plánu */
    times[k] = t;
  });
  return { times: times, off: off, chosen: !!(r.times && Object.keys(r.times).length), max: NF.param(S, 'S-PRIPOMINKY', 'max_denne', 4) };
};
NF.setReminderTime = function (S, key, time) {
  if (NF.REMINDER_KEYS.indexOf(key) < 0 || NF.reminderOptions(S, key).indexOf(time) < 0) return { ok: false };
  S.reminders = S.reminders || { times: {}, off: {} }; S.reminders.times = S.reminders.times || {}; S.reminders.off = S.reminders.off || {};
  S.reminders.times[key] = time; NF.log(S, 'pripominka.cas', key + ' ' + time, { key: key, time: time }); return { ok: true };
};
NF.toggleReminder = function (S, key) {
  if (NF.REMINDER_KEYS.indexOf(key) < 0) return { ok: false };
  S.reminders = S.reminders || { times: {}, off: {} }; S.reminders.off = S.reminders.off || {};
  if (S.reminders.off[key]) delete S.reminders.off[key]; else S.reminders.off[key] = true;
  NF.log(S, 'pripominka.' + (S.reminders.off[key] ? 'vypnuta' : 'zapnuta'), key, { key: key }); return { ok: true, off: !!S.reminders.off[key] };
};
/* Oznámení, která telefon dnes už ukázal (do teď), nejnovější poslední. Komponenta V.phoneNotice je vykreslí jako oznámení telefonu. */
NF.notifications = function (S) {
  var p = NF.activePlan(S), T = NF.texts(S, 'S-PRIPOMINKY'); if (!p || !p.understood || !T || S.participation !== 'active') return [];
  var st = NF.reminderSettings(S), day = NF.day(S.clock), out = [];
  NF.REMINDER_KEYS.forEach(function (k) {
    var t = st.times[k]; if (!t || st.off[k]) return;
    var hm = String(t).split(':'), at = day + 'T' + ('0' + hm[0]).slice(-2) + ':' + ('0' + (hm[1] || '0')).slice(-2) + ':00';
    if (at > S.clock) return;
    var done = k === 'basal' ? S.basalLog.some(function (b) { return b.date === day; }) : NF.mealState(S, k).state === 'done' || NF.mealState(S, k).state === 'skipped';
    if (!done) out.push({ id: 'rem:' + day + ':' + k, key: k, at: at, text: T[k] || '' });
  });
  out = out.slice(0, st.max);
  NF.pendingHypoWatch(S).forEach(function (w) { var at = w.askAt || NF.addMin(w.at, NF.param(S, 'B-HYPO', 'pripominka_min', 60)); if (NF.day(at) === day) out.push({ id: 'rem:' + w.id, key: 'hypo', at: at, text: T.hypo || '' }); });
  return out.sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });
};

/* ---------- jiná dávka než v plánu (rozhodnutí vlastníka 1. 11. 2026, bod 5; 06 A3; S-DAVKA) ----------
   Původ a datum dávky u kroku 1 a u bazálu; když pacient u téhož jídla dne {po_sobe}× po sobě zapíše jinou dávku než v plánu, karta na Dnes
   „Dvakrát jste zapsali jinou dávku než v plánu. Řekněte to prosím na kontrole sestře.“ Lékař je vždy jen jeden.
   Aplikace dávku nemění ani nenavrhuje. */
NF.doseOrigin = function (S, key) {
  var p = NF.activePlan(S), T = NF.texts(S, 'S-DAVKA'); if (!p || !p.doses[key] || !T || !T.puvod) return null;
  return { text: NF.fillText(T.puvod, { date: NF.fmtDM(p.issuedAt), units: p.doses[key].units }), date: p.issuedAt, units: p.doses[key].units };
};
NF.doseOffPlan = function (S) {
  var p = NF.activePlan(S), T = NF.texts(S, 'S-DAVKA'); if (!p || !T) return [];
  var n = NF.param(S, 'S-DAVKA', 'po_sobe', 2), out = [];
  NF.MEALS.forEach(function (m) {
    if (!p.doses[m[0]]) return;
    var plan = p.doses[m[0]].units;
    var eps = S.episodes.filter(function (e) { return e.planId === p.id && e.meal === m[0] && e.insulin && e.insulin.confirmed !== 'pending'; }).slice(-n);
    if (eps.length < n || !eps.every(function (e) { return e.insulin.confirmed === 'other' && e.insulin.units != null && e.insulin.units !== plan; })) return;
    out.push({ meal: m[0], units: plan, others: eps.map(function (e) { return e.insulin.units; }) });
  });
  return out;
};

/* ---------- zapomenutý zápis ze včerejška (kontrola 4, 07 B3) ----------
   Ráno a během dne karta „Včera chybí … – doplnit?“ se stejným zpětným zápisem, do 24 h od konce slotu (stejné okno jako otázka na nejvyšší hodnotu). */
/* C5 (32/01, SCHEMA 84): návrat po ≥ 7 dnech bez zápisu – jedna věta na Dnes, žádná výčitka; zmizí s prvním novým zápisem. */
NF.returnAfterGap = function (S) {
  var p = NF.activePlan(S); if (!p || !p.understood || S.participation !== 'active') return null;
  var last = null; (S.episodes || []).forEach(function (e) { if (e.at <= S.clock && (!last || e.at > last)) last = e.at; }); (S.basalLog || []).forEach(function (b) { var d = b.date + 'T21:00:00'; if (d <= S.clock && (!last || d > last)) last = d; });
  if (!last) return null; var days = NF.daysBetween(NF.day(last) + 'T00:00:00', NF.day(S.clock) + 'T00:00:00');
  return days >= 7 ? { days: days, last: last } : null;
};
NF.yesterdayGaps = function (S) {
  var p = NF.activePlan(S); if (!p || !p.understood || S.participation !== 'active') return [];
  if (NF.ill(S)) return []; /* B2 (32/01, SCHEMA 84): při nemoci nic nedoplňovat – zápisy z nemoci do učení nejdou a nemocného člověka práce navíc jen zatíží */
  var yday = NF.day(NF.addDays(S.clock, -1)); if (NF.day(p.effectiveFrom) > yday) return [];
  var sk = (S.skipped && S.skipped[yday]) || {}, took = p.understoodAt || p.effectiveFrom;
  if (took && NF.day(took) === yday) return []; /* C1 (32/01): den převzetí plánu se nedoptává celý – první ráno nezačíná dluhem */
  /* C3 (31/03): slot, který začal dřív, než pacient plán převzal (snídaně v den převzetí v 9:55), se nedoptává. Začátek slotu = konec předchozího. */
  var startOf = function (meal) { var i = NF.MEALS.map(function (m) { return m[0]; }).indexOf(meal); return yday + 'T' + (i > 0 ? NF.fmtHour(NF.DAYPART_END[NF.MEALS[i - 1][0]]).replace(/^(\d):/, '0$1:') : '00:00') + ':00'; };
  return NF.MEALS.map(function (m) { return m[0]; }).filter(function (meal) {
    if (sk[meal] || S.episodes.some(function (e) { return e.meal === meal && NF.day(e.at) === yday; })) return false;
    if (took && startOf(meal) < took) return false;
    var end = yday + 'T' + NF.fmtHour(NF.DAYPART_END[meal]).replace(/^(\d):/, '0$1:') + ':00';
    return NF.validIso(end) && NF.minutesDiff(end, S.clock) <= 24 * 60;
  }).map(function (meal) { return { meal: meal, day: yday, until: NF.addDays(yday + 'T' + NF.fmtHour(NF.DAYPART_END[meal]).replace(/^(\d):/, '0$1:') + ':00', 1) }; });
};

/* ---------- ukončení ---------- */
NF.endParticipation = function (S, mode) {
  S.participation = mode;
  S.habits.forEach(function (h) { if (h.state === 'active') { h.state = 'cancelled'; } });
  NF.log(S, 'ucast.' + mode, '');
  return { ok: true };
};

})(typeof window !== 'undefined' ? window : globalThis);
