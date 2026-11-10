/* Úvodní obrazovka ukázky (12. 10. 2026, prezentační vrstva): první scéna vysvětlí v obsahu vlevo, k čemu NutriFee je a jak se ukázka ovládá,
   aby panel vpravo mohl být na začátku krátký a vše bylo vidět bez rolování. Jádro o ní neví – vykreslí se přes NF.slots.pageOverride pro stránku „intro“. */
(function (global) {
'use strict';
var NF = global.NutriFee, D = global.NutriFeeDemo, e = NF.esc;
/* SCHEMA 90 (36/04 S4): délka ukázky se počítá, ne píše napevno. Dolní hranice = odhad panelu od začátku bez ohledu na rozhodnutí (D.remainingSeconds(…, true): vyprávění, animace,
   karta „Co schvalujete“ a klepnutí); horní = navíc četba celého průvodce (pět oddílů) u každého klinického pravidla, READ_WPM 200 slov za minutu.
   Zaokrouhleno nahoru na 10 minut; bez panelu (produkční sestavení) záložní 70 až 110. */
function words(t) { return String(t || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length; }
function up10(m) { return Math.max(10, Math.ceil(m / 10) * 10); }
function minWord(n) { return n === 1 ? 'minuta' : n > 1 && n < 5 ? 'minuty' : 'minut'; }
function timeParts(s) {
  var lo = 70, hi = 110, ap = 4;
  try {
    if (D.remainingSeconds && s && s.registry) {
      var base = D.remainingSeconds(Object.assign({}, s, { sceneIndex: 0, tourStep: 0 }), true) / 60, gw = 0;
      (NF.garantItems ? NF.garantItems(s) : []).forEach(function (r) { var g = D.guide && D.guide[r.id]; if (g) ['proc', 'jak', 'kde', 'co', 'dopad'].forEach(function (k) { gw += words(g[k]); }); });
      if (base > 0) { lo = up10(base); hi = Math.max(lo + 10, up10(base + gw / 200)); }
      var a0 = -1; D.scenes.forEach(function (x, i) { if (x.appendix && a0 < 0) a0 = i; });
      if (a0 >= 0) { var am = Math.ceil(D.remainingSeconds(Object.assign({}, s, { sceneIndex: a0, tourStep: 0 }), true) / 60); if (am > 0) ap = am; }
    }
  } catch (err) { }
  return { lo: lo, hi: hi, ap: ap };
}
function timeText(s, nRules) {
  var t = timeParts(s);
  return 'Celá ukázka trvá asi ' + t.lo + ' minut, když u ' + nRules + ' pravidel čtete jen kartu v panelu, a asi ' + t.hi + ' minut, když u nich otevíráte celého průvodce. ' +
    'Můžete ji kdykoli přerušit a pokračovat: rozhodnutí se průběžně ukládají, po přihlášení se načtou zpět i na jiném počítači a panel vám nabídne pokračovat ve scéně, kde jste skončili. ' +
    'V panelu vidíte, kolik času asi zbývá. Dodatek s variantami zabere dalších asi ' + t.ap + ' ' + minWord(t.ap) + '.';
}
D.introTime = timeParts;
function intro(s) {
  var main = D.mainSceneCount ? D.mainSceneCount() : D.scenes.filter(function (x) { return !x.appendix; }).length;
  var ap = D.scenes.filter(function (x) { return x.appendix; }).length;
  var nRules = NF.garantItems && s && s.registry ? NF.garantItems(s).length : 28; /* B02: počet pravidel ke schválení z registru */
  var nar = D.narrow ? D.narrow() : false, app = nar ? 'nahoře' : 'vlevo', pan = nar ? 'dole' : 'vpravo'; /* V3: pod 1100 px je panel dole */
  return '<div class="intro"><div class="intro-head">' +
    '<h1>NutriFee: interaktivní ukázka ke schválení</h1>' +
    '<p class="lead">Pacient s diabetem 2. typu a pevnými dávkami inzulinu má jíst ke své dávce pokaždé podobně. NutriFee se učí z jeho jídel, před jídlem radí a připomíná inzulin předepsaný lékařem. Lékař dostane na kontrole souhrn a návrhy, ověří je s pacientem a rozhodne.</p>' +
    '<p class="intro-device hint neutral">Ukázka je navržená pro počítač. Na telefonu ji projdete, ale obrazovky lékaře jsou široké.</p></div>' +
    /* S1 (19. 10. 2026): tři kroky nahoře, legenda barev hned v nich */
    '<ol class="intro-strip" aria-label="Jak ukázka probíhá">' +
    '<li><span class="n" aria-hidden="true">1</span><span><b>Čtěte ' + app + '.</b> Aplikace běží sama; <span class="btn primary sm intro-sample" aria-hidden="true">petrolejová</span> tlačítka klepe ukázka za vás.</span></li>' +
    '<li><span class="n" aria-hidden="true">2</span><span><b>Rozhodujte ' + (nar ? 'v panelu dole' : 'vpravo') + '.</b> Ve <span class="pill">fialovém</span> panelu ' + nRules + ' klinických pravidel aplikace schválíte, nebo zamítnete; potom můžete připsat poznámku, proč. Jde o neformální podklad pro autora, ne o podpis. Provozní pravidla – formáty, texty obrazovek, milníky – neschvalujete; v registru jsou jen popsaná.</span></li>' + /* SCHEMA 84 (32/03 B5) */
    '<li><span class="n" aria-hidden="true">3</span><span><b>Na konci potvrďte souhrn</b> všech rozhodnutí.</span></li></ol>' +
    /* SCHEMA 84 (rozhodnutí vlastníka 7, 4. 11. 2026): poctivý čas; v panelu je po celou dobu „zbývá asi N minut“.
       SCHEMA 90 (36/04 S4): rozpětí spočítané stejně jako „zbývá“ v panelu, horní hranice navíc s četbou celého průvodce u každého pravidla */
    '<p class="intro-time">' + timeText(s, nRules) + '</p>' +
    '<div class="intro-grid">' +
    '<section class="card"><h2>Jak ukázku ovládat</h2><ol class="intro-steps">' +
    '<li><b>' + (nar ? 'Dole' : 'Vpravo') + ' je fialový panel „Ovládání ukázky“.</b> Je to jediné, co ovládáte: <span class="pill">Dál ▶</span> odehraje další krok, <span class="pill">← Zpět</span> vrátí o krok.</li>' +
    '<li><b>' + (nar ? 'Nahoře' : 'Vlevo') + ' běží aplikace sama.</b> Vy do obrazovky neklikáte, jen sledujete, co se děje a proč.</li>' +
    '<li><b>Fialově <span class="xb-sample">podtečkované</span> věci vysvětlí bublina po klepnutí.</b> Hodí se, když si nejste jistí, co číslo nebo prvek znamená.</li>' + /* vysvětlivky (demo/explain.js, 26. 10. 2026) */
    '<li><b>Panel položku nabídne v kroku, kde pravidlo na obrazovce působí</b> (štítek <span class="appr pend" aria-hidden="true">◌ ke schválení</span> u místa, kam se právě díváte), s vysvětlením. Rozhodnete tlačítkem <b>Schválit</b>, nebo <b>Zamítnout</b>. Po rozhodnutí se pod tlačítky ukáže pole pro nepovinnou poznámku, proč jste tak rozhodli; chcete-li jinou hodnotu nebo znění, napište to tam. Poznámka se ukládá sama už při psaní a kdykoli ji změníte. Pokračovat lze až po rozhodnutí.</li>' +
    '<li><b>Obrazovky aplikace mluví o „schváleném registru“ a pravidlech „schválených garantem“.</b> Tak budou znít v ostrém provozu; maketa se chová, jako by schválení už proběhlo. Skutečně rozhodujete až vy, tady v ukázce.</li>' + /* kosm. 9 (27. 10. 2026) */
    '<li><b>Zamítnutí ukázku nezastaví.</b> Na místě uvidíte „Tahle část nefunguje“ s tlačítkem, které otevře rozhodnutí v panelu.</li>' +
    '<li><b>Rozhodnutí můžete kdykoli změnit</b> v zásuvce „Vaše rozhodnutí“, kterou otevře tlačítko „Ke schválení“ v liště nahoře. Příběh přitom stojí.</li>' +
    '<li><b>Na konci je souhrn</b> všech rozhodnutí: zkontrolujete, případně změníte a potvrdíte. Rozhodnutí i poznámky se ukládají průběžně; potvrzením souhrnu jen dáte vědět, že jste hotovi.</li></ol>' + /* SCHEMA 90 (36/04 N9): dřív „Nic neposíláte.“ */
    '<details class="more"><summary>Dvě roviny: dnes a během studie</summary><p class="small">Dnes schvalujete funkce pro první verzi aplikace, na jejímž základě poběží studie. V příběhu uvidíte i to, co budete jako garant a lékař studie dělat až během ní (scénář 5: úprava pravidla po podnětu z provozu).</p></details></section>' +
    '<section class="card"><h2>Co uvidíte</h2><p class="small">' + main + ' scén hlavní linie v ' + (D.acts.length - 1) + ' scénářích a za nimi dodatek ' + (NF.z(ap) === 'ze' ? 'se ' : 's ') + ap + ' variantami. Modelový pacient i všechna data jsou syntetická, nejde o léčbu.</p>' +
    '<details class="more"><summary>Scénáře</summary><ol class="intro-acts">' + D.acts.filter(function (a, i) { return i > 0; }).map(function (a) { return '<li><b>' + e(a.title) + '</b><br><span class="small muted">' + e(a.note) + '</span></li>'; }).join('') + '</ol></details></section>' +
    '</div></div>';
}
var prev = NF.slots.pageOverride;
NF.slots.pageOverride = function (s) { if (s.page === 'intro') return intro(s); return prev ? prev(s) : ''; };
D.introPage = intro;
if (global.document && NF.render) { try { NF.render(); } catch (err) { } } /* první vykreslení proběhlo dřív, než se úvod přihlásil */
})(typeof window !== 'undefined' ? window : globalThis);
