/* Úvodní obrazovka ukázky (12. 10. 2026, prezentační vrstva): první scéna vysvětlí v obsahu vlevo, k čemu NutriFee je a jak se ukázka ovládá,
   aby panel vpravo mohl být na začátku krátký a vše bylo vidět bez rolování. Jádro o ní neví – vykreslí se přes NF.slots.pageOverride pro stránku „intro“. */
(function (global) {
'use strict';
var NF = global.NutriFee, D = global.NutriFeeDemo, e = NF.esc;
function intro(s) {
  var main = D.mainSceneCount ? D.mainSceneCount() : D.scenes.filter(function (x) { return !x.appendix; }).length;
  var ap = D.scenes.filter(function (x) { return x.appendix; }).length;
  var nar = D.narrow ? D.narrow() : false, app = nar ? 'nahoře' : 'vlevo', pan = nar ? 'dole' : 'vpravo'; /* V3: pod 1100 px je panel dole */
  return '<div class="intro"><div class="intro-head">' +
    '<h1>NutriFee: interaktivní ukázka ke schválení</h1>' +
    '<p class="lead">Pacient s diabetem 2. typu a pevnými dávkami inzulinu má jíst ke své dávce pokaždé podobně. NutriFee se učí z jeho jídel, před jídlem radí a připomíná inzulin předepsaný lékařem. Lékař dostane na kontrole souhrn a návrhy a jen je schvaluje.</p>' +
    '<p class="intro-device hint neutral">Ukázka je navržená pro počítač. Na telefonu ji projdete, ale obrazovky lékaře jsou široké.</p></div>' +
    /* S1 (19. 10. 2026): tři kroky nahoře, legenda barev hned v nich */
    '<ol class="intro-strip" aria-label="Jak ukázka probíhá">' +
    '<li><span class="n" aria-hidden="true">1</span><span><b>Čtěte ' + app + '.</b> Aplikace běží sama; <span class="btn primary sm intro-sample" aria-hidden="true">tyrkysová</span> tlačítka klepe ukázka za vás.</span></li>' +
    '<li><span class="n" aria-hidden="true">2</span><span><b>Rozhodujte ' + (nar ? 'v panelu dole' : 'vpravo') + '.</b> Ve <span class="pill">fialovém</span> panelu schválíte, upravíte nebo zamítnete pravidla aplikace.</span></li>' +
    '<li><span class="n" aria-hidden="true">3</span><span><b>Na konci potvrďte souhrn</b> všech rozhodnutí.</span></li></ol>' +
    '<p class="intro-time">Hlavní část zabere asi 15 minut, dodatek s variantami další 4. Ukázku můžete kdykoli přerušit; rozhodnutí se průběžně ukládají a po přihlášení se načtou zpět.</p>' +
    '<div class="intro-grid">' +
    '<section class="card"><h2>Jak ukázku ovládat</h2><ol class="intro-steps">' +
    '<li><b>' + (nar ? 'Dole' : 'Vpravo') + ' je fialový panel „Ovládání ukázky“.</b> Je to jediné, co ovládáte: <span class="pill">Dál ▶</span> odehraje další krok, <span class="pill">← Zpět</span> vrátí o krok.</li>' +
    '<li><b>' + (nar ? 'Nahoře' : 'Vlevo') + ' běží aplikace sama.</b> Vy do obrazovky neklikáte, jen sledujete, co se děje a proč.</li>' +
    '<li><b>Když se poprvé objeví pravidlo aplikace</b> (štítek <span class="appr pend" aria-hidden="true">◌ ke schválení</span>), panel ho nabídne s vysvětlením. Rozhodnete <b>Schválit · Upravit · Zamítnout</b>; pokračovat lze až po rozhodnutí.</li>' +
    '<li><b>Zamítnutí ukázku nezastaví.</b> Na místě uvidíte „Tahle část nefunguje“. Rozhodnutí můžete kdykoli změnit.</li>' +
    '<li><b>Na konci je souhrn</b> všech rozhodnutí: zkontrolujete, případně změníte a potvrdíte. Nic neposíláte.</li></ol>' +
    '<details class="more"><summary>Dvě roviny: dnes a během studie</summary><p class="small">Dnes schvalujete funkce pro první verzi aplikace, na jejímž základě poběží studie. V příběhu uvidíte i to, co budete jako garant a lékař studie dělat až během ní (scénář 5: úprava pravidla po podnětu z provozu).</p></details></section>' +
    '<section class="card"><h2>Co uvidíte</h2><p class="small">' + main + ' scén hlavní linie v ' + (D.acts.length - 1) + ' scénářích, za nimi dodatek s ' + ap + ' variantami. Modelový pacient i všechna data jsou syntetická, nejde o léčbu.</p>' +
    '<details class="more"><summary>Scénáře</summary><ol class="intro-acts">' + D.acts.filter(function (a, i) { return i > 0; }).map(function (a) { return '<li><b>' + e(a.title) + '</b><br><span class="small muted">' + e(a.note) + '</span></li>'; }).join('') + '</ol></details></section>' +
    '</div></div>';
}
var prev = NF.slots.pageOverride;
NF.slots.pageOverride = function (s) { if (s.page === 'intro') return intro(s); return prev ? prev(s) : ''; };
D.introPage = intro;
if (global.document && NF.render) { try { NF.render(); } catch (err) { } } /* první vykreslení proběhlo dřív, než se úvod přihlásil */
})(typeof window !== 'undefined' ? window : globalThis);
