/* Úvodní obrazovka ukázky (12. 10. 2026, prezentační vrstva): první scéna vysvětlí v obsahu vlevo, k čemu NutriFee je a jak se ukázka ovládá,
   aby panel vpravo mohl být na začátku krátký a vše bylo vidět bez rolování. Jádro o ní neví — vykreslí se přes NF.slots.pageOverride pro stránku „intro“. */
(function (global) {
'use strict';
var NF = global.NutriFee, D = global.NutriFeeDemo, e = NF.esc;
function intro(s) {
  var main = D.mainSceneCount ? D.mainSceneCount() : D.scenes.filter(function (x) { return !x.appendix; }).length;
  return '<div class="intro"><div class="intro-head">' +
    '<h1>NutriFee — interaktivní ukázka ke schválení</h1>' +
    '<p class="lead">Pacient s diabetem 2. typu a pevnými dávkami inzulinu má jíst ke své dávce pokaždé podobně. NutriFee se učí z jeho jídel, před jídlem radí a připomíná inzulin předepsaný lékařem. Lékař dostane na kontrole souhrn a návrhy a jen je schvaluje.</p>' +
    '<p class="small"><b>Tři věty k odnesení:</b> dávku určuje jen lékař · pacient drží obvyklou porci · lékař jen schvaluje.</p>' +
    '<p class="small"><b>Dvě roviny:</b> dnes schvalujete funkce pro první verzi aplikace, na jejímž základě poběží studie. V příběhu uvidíte i to, co budete jako garant a lékař studie dělat až během ní (scénář 5: úprava pravidla po podnětu z provozu).</p></div>' +
    '<div class="intro-grid">' +
    '<section class="card"><h2>Jak ukázku ovládat</h2><ol class="intro-steps">' +
    '<li><b>Vpravo je fialový panel „Ovládání ukázky“.</b> Je to jediné, co ovládáte: <span class="pill">Pokračovat ▶</span> odehraje další krok, <span class="pill">← Zpět</span> vrátí o krok.</li>' +
    '<li><b>Vlevo běží aplikace sama.</b> Tyrkysová tlačítka jsou skutečná tlačítka budoucí aplikace; ukázka je klepe za vás. Vy do obrazovky neklikáte, jen sledujete, co se děje a proč.</li>' +
    '<li><b>Když se poprvé objeví pravidlo aplikace</b> (štítek <span class="appr pend" aria-hidden="true">◌ ke schválení</span>), panel ho nabídne s vysvětlením: proč existuje, jak funguje, kde ho uvidíte, co schvalujete a co se stane při zamítnutí. Rozhodnete <b>Schválit · Upravit · Zamítnout</b>, komentář je nepovinný. Pokračovat lze až po rozhodnutí.</li>' +
    '<li><b>Zamítnutí ukázku nezastaví.</b> Na místě uvidíte „Tahle část nefunguje“ a co to ovlivní. Rozhodnutí můžete kdykoli změnit, i přes „Ke schválení“ v horní liště.</li>' +
    '<li><b>Na konci je souhrn</b> všech rozhodnutí: zkontrolujete, případně změníte a potvrdíte. Vše se průběžně ukládá, nic neposíláte.</li></ol></section>' +
    '<section class="card"><h2>Co uvidíte</h2><ol class="intro-acts">' + D.acts.filter(function (a, i) { return i > 0; }).map(function (a) { return '<li><b>' + e(a.title) + '</b><br><span class="small muted">' + e(a.note) + '</span></li>'; }).join('') + '</ol>' +
    '<p class="small muted">' + main + ' scén hlavní linie v šesti scénářích, asi čtvrt hodiny; za nimi dodatek s variantami. Modelový pacient i všechna data jsou syntetická, nejde o léčbu.</p>' +
    '<div class="intro-legend"><span class="pill">fialové = ovládání ukázky</span><span class="btn primary sm intro-sample" aria-hidden="true">tyrkysové = budoucí aplikace</span></div></section>' +
    '</div></div>';
}
var prev = NF.slots.pageOverride;
NF.slots.pageOverride = function (s) { if (s.page === 'intro') return intro(s); return prev ? prev(s) : ''; };
D.introPage = intro;
if (global.document && NF.render) { try { NF.render(); } catch (err) { } } /* první vykreslení proběhlo dřív, než se úvod přihlásil */
})(typeof window !== 'undefined' ? window : globalThis);
