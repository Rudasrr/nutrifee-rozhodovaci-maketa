/* Modelová data a příběh. Součást prezentační vrstvy — produkce tento soubor nezahrnuje.
   Registr (vše schválené předem), katalogy, ~200 českých jídel, simulovaný senzor, kapitoly. */
(function (global) {
'use strict';
var NF = global.NutriFee;
var D = global.NutriFeeDemo = global.NutriFeeDemo || {};

var T0 = '2026-09-28T10:00:00'; /* modelové schválení registru garantem */
D.hba1c = [62, 55];

/* ---------- schvalovací registr ---------- */
function reg() {
  var A = function (o) { o.status = 'approved'; o.decidedAt = T0; o.decidedBy = 'DEMO-L01'; o.params = o.params || {}; return o; };
  return [
    A({ id: 'K-KRITERIA', cat: 'kohorta', title: 'Podmínky zařazení', summary: 'Dospělý s DM2, jen inzulin, bazál + 3 prandiální pevné dávky, senzor CGM.', detail: 'Celý návrh stojí na pevné dávce inzulinu k jídlu. Pacient s flexibilním dávkováním nebo s tabletami na diabetes by dostával rady postavené na předpokladu, který u něj neplatí.', usedBy: 'zařazení' }),
    A({ id: 'R-NAVYKY', cat: 'plan', title: 'Startovní sada návyků', summary: 'Stejná pro všechny: zapisuj hlavní jídla · obvyklá porce · potvrzuj inzulin · bazál každý večer. Lékař může škrtnout nebo přidat.', detail: 'Stejný start umožní porovnat pacienty napříč studií. Personalizace přichází až z dat na první kontrole.', usedBy: 'zařazení, kontrola' }),
    A({ id: 'R-REAKCE', cat: 'vypocty', title: 'Vyhodnocení reakce na jídlo', summary: 'Vrchol glukózy 0–120 min po jídle; jídlo je známé od 3 započítaných zápisů; rozmezí = 10.–90. percentil vrcholů.', detail: 'Započítaný zápis = úplná data ze senzoru, inzulin potvrzen podle plánu, mimo nemoc, obvyklá porce, stejná dávka jako dnes. Popisuje minulost, nepředpovídá.', params: { minKnown: 3, 'okno_min': 120 }, usedBy: 'karty jídel, rady, report' }),
    A({ id: 'R-PODOBNOST', cat: 'vypocty', title: 'Podobnost jídel ze štítků', summary: 'Neznámé jídlo se přirovná ke známým se stejnou přílohou a přípravou; ukáže se jen široké rozmezí, bez čísla „přesně“.', detail: 'Podobnost se počítá ze štítků (příloha, příprava), nikdy z názvu. S každým vlastním zápisem se rozmezí zúží.', usedBy: 'karty jídel' }),
    A({ id: 'R-SKORE', cat: 'skore', title: 'Reakce těla: mírná / střední / silná', summary: 'Podíl zápisů s vrcholem pod horním cílem: mírná ≥ 80 %, střední ≥ 50 %, silná < 50 %. Vztaženo k pacientovým vlastním jídlům.', detail: 'Žádné známky ani „dobré/špatné jídlo“. Štítek říká, jak často po jídle zůstane v cíli.', params: { mirna: 0.8, stredni: 0.5 }, usedBy: 'karty jídel, report' }),
    A({ id: 'R-PORCE', cat: 'rady', title: 'Rada: obvyklá porce', summary: 'Před píchnutím oběma směry k obvyklé; po píchnutí a při „nevím“ jen z větší zpět k obvyklé. Nikdy „sněz víc“.', detail: 'Dávka je klíč vyrobený na obvyklou porci. Po píchnutí inzulin působí 3–5 h; návrat z větší porce k obvyklé je bezpečný, „sněz víc“ by učil jíst podle inzulinu.', text: 'Dej si obvyklou porci. Tvoje dávka inzulinu je nastavená na obvyklé množství.', usedBy: 'před jídlem' }),
    A({ id: 'R-DOPLNEK', cat: 'rady', title: 'Rada: doplněk k jídlu', summary: 'Přidat bílkovinu nebo tuk (jogurt, sýr, vejce, ořechy) bez změny množství sacharidů. Kdykoli, i při nemoci.', text: 'Přidej k jídlu {addon}. Množství sacharidů se tím nemění.', usedBy: 'před jídlem' }),
    A({ id: 'R-PORADI', cat: 'rady', title: 'Rada: pořadí jídla', summary: 'Sníst nejdřív zeleninu nebo maso, pak přílohu. Množství se nemění.', text: 'Sněz nejdřív {first}, potom zbytek jídla.', usedBy: 'před jídlem' }),
    A({ id: 'R-PROCHAZKA', cat: 'rady', title: 'Rada: procházka po jídle', summary: '10–15 minut svižné chůze po jídle. Ne během nemoci.', text: 'Po jídle se 10–15 minut svižně projdi.', params: { minut: 15 }, usedBy: 'před jídlem' }),
    A({ id: 'D-CISTA', cat: 'davka', title: 'Čistá data pro návrhy k dávce', summary: 'Jen jídla s obvyklou porcí, dávkou potvrzenou podle plánu a v čase ±15 min, mimo nemoc, s úplnými daty.', detail: 'Přesně to, co lékař při posuzování dávky vylučuje ručně. Bez toho by návrh ukazoval na dávku, přestože příčina je v porci nebo podání.', params: { tolerance_min: 15 }, usedBy: 'návrhy k dávce' }),
    A({ id: 'D-PRAND', cat: 'davka', title: 'Návrh: posoudit prandiální dávku', summary: 'Za 14 dní ≥ 6 čistých jídel daného typu a ≥ 2/3 z nich s 2h hodnotou nad cílem, a to až po ≥ 3 přijatých radách k jídlu. Pod cílem: ≥ 2 poklesy pod 3,9 do 4 h.', detail: 'Rady k jídlu jdou vždy první; dávka je poslední páka. Aplikace nevymýšlí směr — ukáže větev postupu D-POSTUP.', params: { dny: 14, minJidel: 6, podil: 0.67, radyPrve: 3, hypo: 2 }, usedBy: 'report' }),
    A({ id: 'D-BAZAL', cat: 'davka', title: 'Návrh: posoudit bazální dávku', summary: 'Medián ranních hodnot za 14 dní nad cílem bez nočních poklesů → posoudit. ≥ 2 noci pod 3,9 nebo 1 pod 3,0 → posoudit, s předností.', params: { dny: 14, nociPod: 2 }, usedBy: 'report' }),
    A({ id: 'D-POSTUP', cat: 'davka', title: 'Postup posouzení dávky (větve)', summary: 'Co ověřit s pacientem a co z výsledku plyne: vše sedí a hodnoty nad cílem → zvýšit; podání nesedí → ponechat a řešit podání; dojídání → ponechat. Velikost kroku vždy volí lékař.', detail: 'Věty „zvýšit / snížit“ jsou z tohoto postupu, který schválil lékař-garant. Aplikace postup jen aplikuje na data a ukáže větev. Krok v jednotkách postup nikdy neobsahuje.', usedBy: 'návrhové karty' }),
    A({ id: 'R-POKYNY', cat: 'pokyny', title: 'Katalog osobních pokynů', summary: 'Připravené věty (nízká glukóza, snědl jsem méně, nemoc, vysoká glukóza, kdy volat) s hodnotami, které volí lékař.', usedBy: 'zařazení, Bezpečí, nemoc' }),
    A({ id: 'Z-BODY', cat: 'zauceni', title: 'Body zaučení', summary: 'Tři pevné body (aplikace, Bezpečí, kontakty) + body podle návyků ve startovním plánu. Sestra zaškrtává, co pacient udělal sám.', usedBy: 'zaučení' }),
    A({ id: 'J-DATABAZE', cat: 'jidla', title: 'Seznam jídel', summary: 'Syntetický seznam ~200 běžných českých jídel a hotovek. Skutečný zdroj a licence se vyberou pro studii.', usedBy: 'před jídlem' }),
    A({ id: 'J-STITKY', cat: 'jidla', title: 'Hrubé štítky místo maker', summary: 'Příloha (6) · příprava (3) · velikost (3). Pacient klepne třikrát, žádná čísla.', detail: 'Pacient hotová jídla nezná složením, ale jménem a rutinou. Učíme se z opakování; štítky slouží jen k „podobné jídlo“.', usedBy: 'vlastní jídlo, podobnost' }),
    A({ id: 'S-SOUHRN', cat: 'report', title: 'Věta „co se dělo“', summary: 'Šablona z pravidel (porce, potvrzení inzulinu, rady, TIR). Žádná generativní AI.', usedBy: 'report' }),
    A({ id: 'S-SEMAFOR', cat: 'report', title: 'Semafor TIR', summary: 'Zelená TIR > 70 % a pod cílem < 4 %; žlutá TIR 50–70 %; červená TIR < 50 % nebo pod cílem ≥ 4 % nebo pod 3,0 ≥ 1 %.', params: { tir_zelena: 70, tir_zluta: 50, tbr_max: 4 }, usedBy: 'report' }),
    A({ id: 'P-NEMOC', cat: 'provoz', title: 'Režim nemoci', summary: 'Pacient označí nemoc sám; zápisy se štítkují a nepočítají; rady k množství jídla se nedávají; denní dotaz „už je ti lépe?“; ukončuje pacient.', usedBy: 'Dnes, rady, report' }),
    A({ id: 'P-LEKAR', cat: 'provoz', title: 'Lékař mezi kontrolami nic nedělá', summary: 'Všechny akce lékaře probíhají jen s pacientem v ordinaci. Nic se neodesílá, nikdo nesleduje.', usedBy: 'celá aplikace' })
  ];
}

/* ---------- katalog návyků ---------- */
D.habitCatalog = [
  { id: 'H-ZAPIS', item: 'R-NAVYKY', default: true, title: 'Zapisuj hlavní jídla', short: 'Zapsat hlavní jídla', why: 'Z každého zápisu se aplikace učí, jak tvoje tělo reaguje. Po třech zápisech stejného jídla umí poradit.', training: [{ id: 't-zapis', text: 'Pacient sám prošel tři kroky „Chystám se jíst“ a zapsal zkušební jídlo', page: 'meal' }] },
  { id: 'H-PORCE', item: 'R-NAVYKY', default: true, title: 'Obvyklá porce ke každé dávce', short: 'Obvyklá porce', why: 'Dávka inzulinu je nastavená na obvyklé množství. Když ho držíš, dávka sedí a rady jsou přesnější.', training: [{ id: 't-porce', text: 'Pacient ví, že rada k porci přijde jen před píchnutím a proč', page: 'meal' }] },
  { id: 'H-INZULIN', item: 'R-NAVYKY', default: true, title: 'Potvrzuj inzulin k jídlu', short: 'Potvrdit inzulin', why: 'Bez potvrzení nevíme, jestli glukóza reaguje na jídlo, nebo na chybějící inzulin. Lékař pak nemůže posoudit dávku.', training: [{ id: 't-inzulin', text: 'Pacient ví, že se ho aplikace před každým jídlem zeptá, jestli si už píchl a kolik', page: 'meal' }] },
  { id: 'H-BAZAL', item: 'R-NAVYKY', default: true, title: 'Bazál každý večer ve stejný čas', short: 'Bazál večer', why: 'Ranní glukóza je zrcadlo bazálu. Stejný čas podání umožní lékaři bazál posoudit.', training: [{ id: 't-bazal', text: 'Pacient našel večerní připomínku bazálu a ví, jak ji potvrdit', page: 'today' }] },
  { id: 'H-CAS', item: 'R-NAVYKY', default: false, title: 'Snídaně ve stejném čase', short: 'Snídaně 7–8 h', why: 'Pravidelný čas snídaně dělá ranní hodnoty srovnatelné.', training: [] },
  { id: 'H-PROCHAZKA', item: 'R-PROCHAZKA', default: false, title: 'Procházka po večeři', short: 'Procházka po večeři', why: 'Krátký pohyb po jídle zmírní vzestup glukózy bez změny jídla.', training: [{ id: 't-prochazka', text: 'Pacient ví, kdy je pohyb po píchnutí v pořádku (podle pokynů lékaře)', page: 'safety' }] }
];
D.instructionCatalog = [
  { id: 'I-HYPO', title: 'Nízká glukóza', text: 'Když glukóza klesne pod {v}, sněz 15 g rychlých sacharidů (sklenice džusu) a změř za 15 minut.', value: 3.9, unit: 'mmol/l', step: 0.1, default: true },
  { id: 'I-MENE', title: 'Snědl jsem méně než obvykle', text: 'Když sníš méně, než na kolik máš inzulin, změř glukózu za {v} a při poklesu postupuj jako u nízké glukózy. Tohle je pokyn ode mě, ne od aplikace.', value: 60, unit: 'min', step: 15, default: true },
  { id: 'I-NEMOC', title: 'Nemoc', text: 'Inzulin nevysazuj. Pij, měř glukózu každé {v} a při zvracení nebo hodnotách nad 15 volej ordinaci.', value: 3, unit: 'h', step: 1, default: true },
  { id: 'I-VYSOKA', title: 'Vysoká glukóza', text: 'Když je glukóza nad {v} déle než 3 hodiny, volej ordinaci.', value: 15, unit: 'mmol/l', step: 0.5, default: false },
  { id: 'I-KONTAKT', title: 'Kdy a kam volat', text: 'V ordinačních hodinách ordinace, jinak pohotovost. Při bezvědomí, křečích nebo dušnosti záchranná služba.', value: true, default: true }
];
D.patientContext = [
  ['Diagnóza', 'Diabetes 2. typu, 9 let'],
  ['Léčba', 'Jen inzulin — bazál 1× večer, prandiální ke třem jídlům, pevné dávky'],
  ['Perorální antidiabetika', 'žádná'],
  ['Senzor', 'CGM zaveden 28. 9. 2026'],
  ['Poslední HbA1c', '62 mmol/mol (23. 9. 2026)'],
  ['Věk, hmotnost', '58 let · 92 kg']
];

/* ---------- jídla ----------
   ~200 českých jídel a hotovek se štítky. Syntetické; skutečný zdroj vybere studie. */
function foods() {
  var out = [], n = 0;
  function add(names, side, prep, size, meal, extra) {
    names.split('|').forEach(function (name) {
      n++; var f = { id: 'F' + n, name: name.trim(), tags: { side: side, prep: prep, size: size }, meal: meal };
      if (extra) Object.keys(extra).forEach(function (k) { f[k] = extra[k]; });
      out.push(f);
    });
  }
  /* snídaně */
  add('Ovesná kaše s mlékem a banánem|Ovesná kaše s jablkem|Rýžová kaše se skořicí|Jáhlová kaše s ovocem|Krupicová kaše', 'bez', 'varene', 'bezne', 'breakfast', { emoji: '🥣', addon: 'bílý jogurt nebo hrst ořechů', first: 'jogurt', react: 5.4 });
  add('Chléb se sýrem a zeleninou|Chléb s máslem a šunkou|Chléb s tvarohovou pomazánkou|Rohlík se sýrem|Celozrnný chléb s vajíčkem', 'pecivo', 'studene', 'bezne', 'breakfast', { emoji: '🥪', addon: 'plátek sýra nebo vejce navíc', first: 'zeleninu a sýr', react: 2.5 });
  add('Müsli s jogurtem a medem|Cereálie s mlékem|Granola s jogurtem', 'bez', 'studene', 'bezne', 'breakfast', { emoji: '🥣', addon: 'bílý jogurt navíc nebo ořechy', first: 'jogurt', react: 5.1 });
  add('Míchaná vejce se zeleninou|Omeleta se šunkou|Vejce natvrdo s chlebem|Šunka s vejci (hemenex)', 'bez', 'varene', 'bezne', 'breakfast', { emoji: '🍳', addon: 'nic navíc', first: 'zeleninu', react: 1.1 });
  add('Koblihy|Croissant s džemem|Loupák s máslem|Buchty s povidly|Vánočka s máslem|Makovec|Bábovka|Palačinky s džemem|Lívance s marmeládou', 'pecivo', 'varene', 'bezne', 'breakfast', { emoji: '🥐', addon: 'tvaroh nebo bílý jogurt', first: 'tvaroh', react: 5.8 });
  add('Jogurt s ovocem|Tvaroh s ovocem|Skyr s ořechy|Cottage s rajčaty', 'bez', 'studene', 'male', 'breakfast', { emoji: '🥛', addon: 'hrst ořechů', first: 'ořechy', react: 1.8 });
  /* obědy, večeře — česká klasika */
  add('Smažený řízek s bramborovou kaší|Smažený řízek s bramborovým salátem|Smažený sýr s hranolkami|Smažené rybí filé s bramborem|Smažené žampiony s bramborem|Smažený květák s bramborem|Kuřecí řízek s bramborem|Smažené kuřecí nugety s hranolkami', 'brambory', 'smazene', 'bezne', 'lunch', { emoji: '🍗', addon: 'salát z čerstvé zeleniny', first: 'salát nebo maso', react: 5.2 });
  add('Svíčková na smetaně s knedlíkem|Hovězí guláš s knedlíkem|Vepřo knedlo zelo|Rajská omáčka s knedlíkem|Koprová omáčka s knedlíkem|Znojemská pečeně s knedlíkem|Segedínský guláš s knedlíkem|Kuře na paprice s knedlíkem|Ovocné knedlíky s tvarohem|Bramborové knedlíky se zelím a uzeným', 'knedlik', 'varene', 'bezne', 'lunch', { emoji: '🥟', addon: 'maso navíc místo části knedlíku', first: 'maso', react: 6.0 });
  add('Kuřecí maso na kari s rýží|Rizoto se zeleninou a kuřecím|Kuřecí čína s rýží|Vepřové nudličky s rýží|Losos s rýží a zeleninou|Rýže s fazolemi|Plněné papriky s rýží|Zapečená rýže se zeleninou', 'ryze', 'varene', 'bezne', 'lunch', { emoji: '🍚', addon: 'zeleninu nebo maso navíc', first: 'maso a zeleninu', react: 4.4 });
  add('Špagety boloňské|Špagety carbonara|Těstoviny s kuřecím a smetanovou omáčkou|Těstovinový salát|Lasagne|Zapečené těstoviny se sýrem|Penne s rajčatovou omáčkou|Gnocchi se špenátem', 'testoviny', 'varene', 'bezne', 'lunch', { emoji: '🍝', addon: 'kuřecí maso nebo sýr navíc', first: 'maso nebo sýr', react: 4.8 });
  add('Pečené kuře s bramborem|Vepřová pečeně s bramborem|Sekaná s bramborovou kaší|Kuřecí stehno s bramborem|Bramborák|Bramboráky s kysaným zelím|Zapečené brambory se zeleninou|Brambory na loupačku s tvarohem|Šunkafleky|Halušky se zelím', 'brambory', 'varene', 'bezne', 'lunch', { emoji: '🍽', addon: 'zeleninový salát', first: 'maso a zeleninu', react: 4.0 });
  add('Bramboračka|Kulajda|Gulášová polévka|Čočková polévka|Hrachová polévka|Zelňačka|Dršťková polévka|Kuřecí vývar s nudlemi|Rajská polévka s rýží|Fazolová polévka|Květáková polévka|Hovězí vývar s knedlíčky', 'bez', 'varene', 'male', 'lunch', { emoji: '🍲', addon: 'plátek chleba vyměň za maso', first: 'zavářku', react: 2.6 });
  add('Čočka na kyselo s vejcem|Čočka s uzeným|Fazole na kyselo|Hrachová kaše s cibulkou|Zapečený květák se sýrem|Zeleninové lečo s vejci|Špenát s vejcem a bramborem', 'bez', 'varene', 'bezne', 'lunch', { emoji: '🥘', addon: 'vejce navíc', first: 'vejce', react: 3.2 });
  add('Grilovaný losos se zeleninou|Kuřecí prsa se zeleninou|Krůtí steak se salátem|Hovězí steak se zeleninou|Pečená treska se zeleninou|Tofu se zeleninou', 'bez', 'varene', 'bezne', 'dinner', { emoji: '🥗', addon: 'nic navíc', first: 'zeleninu', react: 1.4 });
  add('Zeleninový salát s kuřecím|Salát s tuňákem|Řecký salát|Caesar salát|Salát s kozím sýrem|Šopský salát', 'bez', 'studene', 'bezne', 'dinner', { emoji: '🥗', addon: 'vejce nebo sýr', first: 'zeleninu', react: 1.6 });
  /* hotovky a rychlé jídlo */
  add('Pizza Margherita|Pizza šunková|Pizza salámová|Pizza Quattro formaggi', 'pecivo', 'varene', 'velke', 'dinner', { emoji: '🍕', addon: 'salát před pizzou', first: 'salát', react: 5.9 });
  add('Kebab v pitě|Gyros v pitě|Burger s hranolkami|Cheeseburger|Hot dog|Párek v rohlíku|Langoš se sýrem|Smažený sýr v housce|Bageta se šunkou a sýrem|Bageta s kuřecím|Sendvič s tuňákem|Tortilla s kuřecím', 'pecivo', 'smazene', 'velke', 'dinner', { emoji: '🌯', addon: 'zeleninu navíc, bez omáčky', first: 'maso a zeleninu', react: 6.2 });
  add('Sushi set|Pad thai|Kuře kung pao s rýží|Smažené nudle se zeleninou|Kuřecí s bambusem a rýží|Bún bò Nam Bộ|Pho bo|Kari s rýží', 'ryze', 'varene', 'bezne', 'dinner', { emoji: '🍜', addon: 'maso navíc místo části rýže', first: 'maso a zeleninu', react: 4.9 });
  add('Lasagne z chlazeného pultu|Hotové rizoto z krabičky|Instantní nudlová polévka|Mražená pizza|Hotová svíčková v sáčku|Hotový guláš v konzervě|Kuřecí nugety mražené|Bramborové krokety mražené|Zapečené těstoviny hotové|Segedín hotový', 'testoviny', 'varene', 'bezne', 'dinner', { emoji: '📦', addon: 'salát nebo vejce', first: 'zeleninu', react: 5.4 });
  add('Chlebíčky s vlašským salátem|Obložené chlebíčky|Utopenec s chlebem|Nakládaný hermelín s chlebem|Tlačenka s cibulí a chlebem|Sekaná s chlebem a hořčicí|Párky s chlebem a hořčicí|Klobása s chlebem|Bramborový salát', 'pecivo', 'studene', 'bezne', 'dinner', { emoji: '🥪', addon: 'zeleninu', first: 'maso', react: 4.2 });
  /* svačiny */
  add('Jablko|Banán|Hroznové víno|Hruška|Mandarinky|Ovocný salát', 'bez', 'studene', 'male', 'snack', { emoji: '🍎', addon: 'hrst ořechů', first: 'ořechy', react: 2.9 });
  add('Sušenky|Čokoládová tyčinka|Oplatky|Perník|Zákusek|Dort|Zmrzlina|Chipsy|Slané tyčinky|Popcorn', 'pecivo', 'studene', 'male', 'snack', { emoji: '🍪', addon: 'jogurt místo části sladkého', first: 'jogurt', react: 5.5 });
  add('Ořechy|Sýr|Vařené vejce|Hummus se zeleninou|Zeleninové tyčinky', 'bez', 'studene', 'male', 'snack', { emoji: '🥜', addon: 'nic navíc', first: 'zeleninu', react: 0.9 });
  add('Knedlíky s vejci|Houskový knedlík s vajíčkem', 'knedlik', 'varene', 'bezne', 'dinner', { emoji: '🥟', addon: 'vejce navíc', first: 'vejce', react: 5.6 });
  return out;
}
D.foods = foods;

/* ---------- simulovaný senzor ----------
   Deterministický: vrchol podle reaktivity jídla, porce, přijaté rady, nemoci, potvrzení dávky. */
var REACT = { smazene: 1.1, varene: 1.0, studene: 0.9, knedlik: 1.2, pecivo: 1.1, brambory: 1.0, ryze: 1.05, testoviny: 1.0, bez: 0.75, velke: 1.15, bezne: 1, male: 0.8 };
var LEVER_EFF = { addon: -1.4, order: -0.9, walk: -1.1 };
function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h; }
D.reactivity = function (food) {
  if (food.react != null) return food.react;
  var t = food.tags || {};
  return 3.4 * (REACT[t.prep] || 1) * (REACT[t.side] || 1) * (REACT[t.size] || 1);
};
function curve(S, food, portion, lever, k, ctx) {
  var rise = D.reactivity(food) + (portion === 'bigger' ? 1.4 : portion === 'smaller' ? -1.1 : 0) + (lever ? LEVER_EFF[lever] || 0 : 0) + (((k * 37) % 7) - 3) * 0.12;
  if (ctx === 'illness') rise += 1.6;
  if (ctx === 'lowdose') rise += 1.2;
  if (ctx === 'nodose') rise += 3.0;
  var base = 6.4 + ((k * 13) % 5) * 0.15 + (ctx === 'illness' ? 1.2 : 0);
  var v = [base, base + 0.55 * rise, base + rise, base + 0.8 * rise, base + 0.5 * rise].map(function (x) { return Math.round(x * 10) / 10; });
  return v;
}
function pts(values, at) { return [0, 30, 60, 90, 120].map(function (m, i) { return { min: m, at: NF.addMin(at, m), mmol: values[i] }; }); }
NF.sensorSource = function (S, draft) {
  var food = NF.foodById(S, draft.foodId), k = S.episodes.length + 1;
  var taken = (draft.advice || []).filter(function (a) { return a.accepted === true && a.lever !== 'portion'; })[0];
  var portionTaken = (draft.advice || []).some(function (a) { return a.lever === 'portion' && a.accepted === true; });
  var ctx = S.illness && S.illness.active ? 'illness' : draft.insulin.confirmed === 'none' ? 'nodose' : (draft.insulin.confirmed === 'other' && draft.insulin.units < (NF.activePlan(S).doses[draft.meal].units)) ? 'lowdose' : null;
  return { points: pts(curve(S, food, portionTaken ? 'usual' : draft.portion, taken && taken.lever, k, ctx), draft.at), importedAt: NF.addMin(draft.at, 130) };
};
NF.sensorNow = function (S) {
  var last = S.episodes[S.episodes.length - 1];
  var h = NF.parse(S.clock).getHours();
  var v = last && NF.day(last.at) === NF.day(S.clock) && NF.parse(S.clock) - NF.parse(last.at) < 3 * 3600000 ? (last.peak || 8) - 1.2 : 6.8 + ((h * 7) % 5) * 0.2;
  if (S.illness && S.illness.active) v += 2.1;
  v = Math.round(v * 10) / 10;
  var spark = 'M0 30 C40 28,60 20,100 22 S160 34,200 26 S280 14,340 18';
  return { value: v, trend: v > 9 ? '↗ stoupá' : v < 5 ? '↘ klesá' : '→ stabilní', spark: spark };
};

/* ---------- pomocníci příběhu ---------- */
function foodByName(S, name) { return S.foods.filter(function (f) { return f.name === name; })[0]; }
function ep(S, spec) {
  var f = spec.food.id ? spec.food : foodByName(S, spec.food);
  var p = NF.activePlan(S), meal = spec.meal || 'breakfast';
  var advice = (spec.advice || []).map(function (a) { return { lever: a.lever, item: NF.LEVERS[a.lever].item, accepted: a.accepted === undefined ? null : a.accepted, reason: a.reason || null }; });
  var taken = advice.filter(function (a) { return a.accepted === true && a.lever !== 'portion'; })[0];
  var portionTaken = advice.some(function (a) { return a.lever === 'portion' && a.accepted === true; });
  var portion = portionTaken ? 'usual' : (spec.portion || 'usual');
  var confirmed = spec.insulin || 'as', units = confirmed === 'as' ? p.doses[meal].units : confirmed === 'other' ? (spec.units || p.doses[meal].units - 2) : null;
  var k = hash(spec.at + f.id);
  var ctx = spec.context || (confirmed === 'none' ? 'nodose' : confirmed === 'other' && units < p.doses[meal].units ? 'lowdose' : null);
  var v = curve(S, f, portion, taken && taken.lever, k, ctx === 'illness' ? 'illness' : ctx);
  if (spec.gap) v = [v[0], v[1], null, null, null];
  if (spec.low) v = [5.2, 4.4, 3.6, 3.4, 4.1];
  var e = { id: spec.id || NF.uid('E'), planId: p.id, meal: meal, foodId: f.id, at: spec.at, recordedAt: spec.at, portionPlanned: spec.portion || 'usual', portion: portion, bolusAtAdvice: spec.bolus || 'as',
    insulin: { prescribed: p.doses[meal].units, confirmed: confirmed, units: units, time: confirmed === 'none' || confirmed === 'unknown' ? null : NF.fmtTime(NF.addMin(spec.at, -(spec.offset || 5))) },
    doseKey: NF.doseKey(S, meal), advice: advice, context: spec.context || null, points: pts(v, spec.at), importedAt: NF.addMin(spec.at, 130) };
  e.peak = NF.peakOf(e.points); e.at2h = NF.at2h(e.points);
  if (S.episodes.some(function (x) { return x.id === e.id; })) return e;
  if (advice.length) NF.log(S, 'rada.zobrazena', f.name, { level: NF.confidence(S, f.id).level, items: advice.map(function (a) { return { lever: a.lever, item: a.item }; }), bolus: e.bolusAtAdvice, portion: e.portionPlanned });
  S.episodes.push(e);
  NF.log(S, 'jidlo.zapsano', e.id + ' ' + f.id, { meal: meal, portion: e.portion, insulin: e.insulin, advice: advice, context: e.context });
  return e;
}
function basal(S, date, confirmed, units) {
  var p = NF.activePlan(S);
  if (S.basalLog.some(function (b) { return b.date === date; })) return;
  S.basalLog.push({ at: date + 'T21:05:00', date: date, prescribed: p.doses.basal.units, confirmed: confirmed || 'as', units: units != null ? units : (confirmed === 'none' ? null : p.doses.basal.units), time: '21:05' });
}
function night(S, date, fasting, min) {
  if (S.nights.some(function (n) { return n.date === date; })) return;
  S.nights.push({ date: date, fasting: fasting, min: min });
}
/* Dlouhá řada listopad–prosinec podle odbočky „jak pacient s radami naložil“. */
function series(S, B) {
  if (S.episodes.some(function (x) { return x.id === 'E60'; })) return;
  var start = '2026-10-24', bf = ['Ovesná kaše s mlékem a banánem', 'Chléb se sýrem a zeleninou', 'Ovesná kaše s mlékem a banánem', 'Müsli s jogurtem a medem', 'Ovesná kaše s mlékem a banánem', 'Müsli s jogurtem a medem', 'Ovesná kaše s mlékem a banánem'];
  var lu = ['Smažený řízek s bramborovou kaší', 'Kuřecí maso na kari s rýží', 'Svíčková na smetaně s knedlíkem', 'Špagety boloňské', 'Pečené kuře s bramborem', 'Čočka na kyselo s vejcem', 'Bramboračka'];
  var di = ['Grilovaný losos se zeleninou', 'Chléb se sýrem a zeleninou', 'Pizza šunková', 'Zeleninový salát s kuřecím', 'Kebab v pitě', 'Těstovinový salát', 'Chlebíčky s vlašským salátem'];
  var reasons = B.response === 'impractical' ? ['nothome', 'nothome', 'taste'] : ['nowant', 'time', 'nowant'];
  for (var d = 0; d < 72; d++) {
    var date = NF.day(NF.addDays(start + 'T07:00:00', d)), r = (d * 7 + 3) % 10;
    var accept = B.response === 'accepts' ? r < 7 : r < 2, reason = reasons[d % 3];
    var portion = d % 9 === 4 ? 'bigger' : 'usual', ins = d % 13 === 6 ? 'other' : d % 23 === 11 ? 'unknown' : 'as';
    var b = bf[d % 7], strong = b.indexOf('kaše') >= 0 || b.indexOf('Müsli') >= 0;
    var adv = [];
    if (portion === 'bigger') adv.push({ lever: 'portion', accepted: true });
    if (strong) { adv.push({ lever: 'addon', accepted: accept, reason: accept ? null : reason }); adv.push({ lever: 'order', accepted: accept ? null : false, reason: accept ? null : reason }); }
    ep(S, { id: 'E' + (60 + d * 3), food: b, meal: 'breakfast', at: date + 'T07:' + (d % 2 ? '10' : '05') + ':00', portion: portion, insulin: ins, advice: adv, bolus: 'before' });
    var l = lu[d % 7];
    ep(S, { id: 'E' + (61 + d * 3), food: l, meal: 'lunch', at: date + 'T12:30:00', insulin: 'as', advice: l.indexOf('knedl') >= 0 || l.indexOf('řízek') >= 0 ? [{ lever: 'order', accepted: accept, reason: accept ? null : reason }] : [] });
    var dn = di[d % 7];
    ep(S, { id: 'E' + (62 + d * 3), food: dn, meal: 'dinner', at: date + 'T18:30:00', insulin: 'as', advice: dn.indexOf('Pizza') >= 0 || dn.indexOf('Kebab') >= 0 ? [{ lever: 'walk', accepted: B.response === 'accepts' ? d % 2 === 0 : false, reason: 'time' }] : [] });
    basal(S, date, d % 17 === 9 ? 'other' : 'as', d % 17 === 9 ? 16 : undefined);
    night(S, date, Math.round((6.1 + ((d * 11) % 7) * 0.25) * 10) / 10, Math.round((4.6 + ((d * 5) % 6) * 0.2) * 10) / 10);
  }
  ep(S, { id: 'E900', food: 'Smažený řízek s bramborovou kaší', meal: 'lunch', at: '2026-12-20T12:30:00', insulin: 'as', advice: [{ lever: 'order', accepted: true }] });
  S.sensorSummary = { period: '22. 12. 2026 – 4. 1. 2027', availability: 91, tir: B.response === 'accepts' ? 72 : 61, below: 2, veryLow: 0, above: B.response === 'accepts' ? 26 : 37 };
}

/* ---------- odbočky ---------- */
D.branches = {
  training: { label: 'Zaučení u sestry', from: 'training', options: [{ id: 'done', label: 'Zaučení proběhlo' }, { id: 'failed', label: 'Zaučení se nezdařilo — návyky nezačnou platit' }] },
  bolus: { label: 'Kapitola „po píchnutí“: co si pacient chystá', from: 'afterBolus', options: [{ id: 'bigger', label: 'Větší porci → rada zpět k obvyklé' }, { id: 'smaller', label: 'Menší porci → žádná rada k množství, jen pokyn lékaře' }, { id: 'unknown', label: 'Neví, jestli si píchl → jako po píchnutí' }] },
  response: { label: 'Jak pacient s radami naložil (listopad–prosinec)', from: 'preview', options: [{ id: 'accepts', label: 'Většinou přijal' }, { id: 'declines', label: 'Většinou nepřijal — „nechci“, „nestihl jsem“' }, { id: 'impractical', label: 'Většinou nepřijal — „nemám to doma“' }] }
};
D.defaults = { training: 'done', bolus: 'bigger', response: 'accepts' };

/* ---------- společný start ---------- */
function setup(S) {
  S.clock = '2026-10-05T09:00:00';
  S.registry = { items: reg(), history: [] };
  S.foods = foods();
  S.nextVisit = '2027-01-05T09:00:00';
}
function enrolled(S) { NF.ELIGIBILITY.forEach(function (c) { NF.setEligibility(S, c[0], true); }); }
function draftReady(S) {
  if (!S.draft) S.draft = NF.newDraft(S);
  var d = S.draft;
  if (!d.habits.length) d.habits = D.habitCatalog.filter(function (h) { return h.default; }).map(function (h) { return h.id; });
  if (!d.instructions.length) D.instructionCatalog.filter(function (i) { return i.default; }).forEach(function (i) { d.instructions.push({ id: i.id, value: i.value }); });
}
function issued(S) {
  draftReady(S); S.draft.medicationChecked = true; S.draft.instructionsChecked = true;
  S.role = 'doctor'; NF.issuePlan(S, D.habitCatalog); NF.handover(S);
  S.training = { result: null, steps: {}, previewPage: 'today' };
}
function trained(S, B) {
  S.role = 'nurse';
  NF.trainingItems(S).forEach(function (t) { S.training.steps[t.id] = true; });
  if (B.training === 'failed') { S.training.steps.contacts = false; NF.finishTraining(S, 'failed'); }
  else NF.finishTraining(S, 'done');
}
function understood(S) { S.role = 'patient'; S.onboarding.checkAnswer = 'no'; NF.confirmUnderstanding(S); }
function freshMeal(S, meal, food, portion, bolus) {
  var p = NF.activePlan(S); var f = food ? foodByName(S, food) : null;
  S.meal = { step: bolus ? (f ? 3 : 2) : 1, meal: meal, bolus: bolus || null, units: p.doses[meal].units, offset: '0', q: f ? f.name : '', foodId: f ? f.id : null, portion: portion || null, decisions: {}, reasons: {}, newFood: null };
}

/* ---------- kapitoly ----------
   setup = kulisy scény (platí při příchodu), apply = akce, která se ve scéně odehraje. */
var CH = [
  /* Dějství 1 — V ordinaci */
  { id: 'enroll', act: 0, title: 'Lékař — karta a podmínky zařazení', role: 'doctor', page: 'enroll', wizardStep: 0, at: '2026-10-05T09:00:00',
    setup: function (S) { S.draft = S.draft || NF.newDraft(S); }, apply: function (S) { enrolled(S); } },
  { id: 'doses', act: 0, title: 'Lékař — dávky, startovní návyky a pokyny', role: 'doctor', page: 'enroll', wizardStep: 1, at: '2026-10-05T09:10:00',
    setup: function (S) { draftReady(S); }, apply: function (S) { S.draft.medicationChecked = true; S.draft.instructionsChecked = true; } },
  { id: 'issue', act: 0, title: 'Lékař — vydání plánu', role: 'doctor', page: 'enroll', wizardStep: 2, at: '2026-10-05T09:20:00',
    apply: function (S) { issued(S); } },
  { id: 'training', act: 0, title: 'Sestra — zaučení s náhledem telefonu', role: 'nurse', page: 'training', at: '2026-10-05T09:35:00',
    apply: function (S, B) { trained(S, B); } },
  { id: 'handover', act: 0, title: 'Pacient — převzetí plánu a jedna otázka', role: 'patient', page: 'takeover', at: '2026-10-05T09:55:00',
    apply: function (S, B) { if (B.training !== 'failed') understood(S); } },

  /* Dějství 2 — Doma: aplikace se učí */
  { id: 'firstMeal', act: 1, title: 'Pacient — první snídaně ve třech krocích', role: 'patient', page: 'meal', at: '2026-10-06T07:00:00',
    setup: function (S) { freshMeal(S, 'breakfast'); },
    apply: function (S) { ep(S, { id: 'E1', food: 'Ovesná kaše s mlékem a banánem', at: '2026-10-06T07:05:00', bolus: 'before' }); basal(S, '2026-10-05'); basal(S, '2026-10-06'); S.meal = null; } },
  { id: 'week', act: 1, title: 'Pacient — po týdnu: co už aplikace ví', role: 'patient', page: 'foods', at: '2026-10-12T19:00:00',
    setup: function (S) {
      [['E2', 'Chléb se sýrem a zeleninou', '2026-10-07T07:05:00', 'as'], ['E3', 'Ovesná kaše s mlékem a banánem', '2026-10-08T07:10:00', 'unknown'], ['E4', 'Ovesná kaše s mlékem a banánem', '2026-10-09T07:00:00', 'as'], ['E5', 'Chléb se sýrem a zeleninou', '2026-10-10T07:05:00', 'as'], ['E6', 'Ovesná kaše s mlékem a banánem', '2026-10-11T07:00:00', 'as'], ['E7', 'Chléb se sýrem a zeleninou', '2026-10-12T07:05:00', 'as']]
        .forEach(function (x) { ep(S, { id: x[0], food: x[1], at: x[2], insulin: x[3] }); });
      [['E2b', 'Kuřecí maso na kari s rýží', '2026-10-07T12:30:00'], ['E3b', 'Svíčková na smetaně s knedlíkem', '2026-10-08T12:30:00'], ['E4b', 'Smažený řízek s bramborovou kaší', '2026-10-09T12:30:00'], ['E5b', 'Špagety boloňské', '2026-10-10T12:30:00'], ['E6b', 'Smažený řízek s bramborovou kaší', '2026-10-11T12:30:00'], ['E7b', 'Smažený řízek s bramborovou kaší', '2026-10-12T12:30:00']]
        .forEach(function (x) { ep(S, { id: x[0], food: x[1], meal: 'lunch', at: x[2] }); });
      for (var d = 7; d <= 12; d++) basal(S, '2026-10-' + (d < 10 ? '0' + d : d));
      S.foodsSeg = 'known'; S.foodOpen = foodByName(S, 'Ovesná kaše s mlékem a banánem').id;
    } },

  { id: 'lateMeal', act: 1, title: 'Pacient — otevřel aplikaci až v 10 h', role: 'patient', page: 'today', at: '2026-10-13T10:15:00',
    setup: function (S) { basal(S, '2026-10-12'); },
    apply: function (S) { ep(S, { id: 'E7c', food: 'Chléb se sýrem a zeleninou', at: '2026-10-13T07:30:00', bolus: 'retro', advice: [{ lever: 'walk', accepted: true }] }); S.meal = null; } },

  /* Dějství 3 — Rada před jídlem */
  { id: 'advice', act: 2, title: 'Pacient — před píchnutím: porce zpět k obvyklé a doplněk', role: 'patient', page: 'meal', at: '2026-10-14T07:00:00',
    setup: function (S) { freshMeal(S, 'breakfast', 'Ovesná kaše s mlékem a banánem', 'bigger', 'before'); },
    apply: function (S) { ep(S, { id: 'E8', food: 'Ovesná kaše s mlékem a banánem', at: '2026-10-14T07:05:00', portion: 'bigger', bolus: 'before', advice: [{ lever: 'portion', accepted: true }, { lever: 'addon', accepted: true }, { lever: 'order' }] }); basal(S, '2026-10-13'); basal(S, '2026-10-14'); S.meal = null; } },
  { id: 'afterBolus', act: 2, title: 'Pacient — po píchnutí: co aplikace smí a nesmí', role: 'patient', page: 'meal', at: '2026-10-16T07:30:00',
    setup: function (S, B) { freshMeal(S, 'breakfast', 'Ovesná kaše s mlékem a banánem', B.bolus === 'smaller' ? 'smaller' : 'bigger', B.bolus === 'unknown' ? 'unknown' : 'as'); },
    apply: function (S, B) { ep(S, { id: 'E9', food: 'Ovesná kaše s mlékem a banánem', at: '2026-10-16T07:30:00', portion: B.bolus === 'smaller' ? 'smaller' : 'bigger', bolus: B.bolus === 'unknown' ? 'unknown' : 'as', insulin: B.bolus === 'unknown' ? 'unknown' : 'as', advice: B.bolus === 'smaller' ? [{ lever: 'addon', accepted: false, reason: 'nothome' }] : [{ lever: 'portion', accepted: true }, { lever: 'addon', accepted: false, reason: 'nothome' }] }); basal(S, '2026-10-15'); basal(S, '2026-10-16'); S.meal = null; } },
  { id: 'custom', act: 2, title: 'Pacient — vlastní jídlo třemi klepnutími', role: 'patient', page: 'meal', at: '2026-10-18T12:20:00',
    setup: function (S) { freshMeal(S, 'lunch', null, null, 'before'); S.meal.step = 2; S.meal.q = 'Řízek s kaší od maminky'; S.meal.newFood = {}; },
    apply: function (S) {
      var r = NF.addFood(S, 'Řízek s kaší od maminky', { side: 'brambory', prep: 'smazene', size: 'velke' });
      ep(S, { id: 'E10', food: r.food, meal: 'lunch', at: '2026-10-18T12:30:00', bolus: 'before', advice: [{ lever: 'order', accepted: true }] });
      basal(S, '2026-10-17'); basal(S, '2026-10-18'); S.meal = null;
    } },

  /* Dějství 4 — Nemoc */
  { id: 'illness', act: 3, title: 'Pacient — jsem nemocný', role: 'patient', page: 'today', at: '2026-10-20T08:00:00',
    setup: function (S) { for (var d = 19; d <= 20; d++) basal(S, '2026-10-' + d); },
    apply: function (S) { NF.setIllness(S, true); ep(S, { id: 'E11', food: 'Chléb se sýrem a zeleninou', at: '2026-10-20T08:30:00', context: 'illness', advice: [{ lever: 'addon', accepted: true }] }); } },
  { id: 'illnessMeal', act: 3, title: 'Pacient — jídlo během nemoci', role: 'patient', page: 'meal', at: '2026-10-21T08:00:00',
    setup: function (S) { freshMeal(S, 'breakfast', 'Ovesná kaše s mlékem a banánem', 'smaller', 'as'); },
    apply: function (S) { ep(S, { id: 'E12', food: 'Ovesná kaše s mlékem a banánem', at: '2026-10-21T08:05:00', portion: 'smaller', context: 'illness', advice: [{ lever: 'addon' }] }); basal(S, '2026-10-21'); S.meal = null; } },
  { id: 'recovery', act: 3, title: 'Pacient — už je mi lépe', role: 'patient', page: 'today', at: '2026-10-22T07:30:00',
    apply: function (S) { NF.illnessCheckin(S, true); basal(S, '2026-10-22'); } },

  /* Dějství 5 — Registr */
  { id: 'registry', act: 4, title: 'Lékař-garant — podnět a úprava pravidla', role: 'doctor', page: 'registry', at: '2026-10-23T09:00:00',
    setup: function (S) { S.reg = { open: 'R-PORADI', q: '' }; S.impulse = 'Při testu pacient pochopil radu „sněz nejdřív jogurt“ tak, že jogurt nahradí část kaše, a kaši nedojedl — snědl méně sacharidů, než má.'; },
    apply: function (S) {
      S.role = 'doctor';
      var it = NF.item(S, 'R-PORADI'); it.text = 'Sněz nejdřív {first}, potom zbytek obvyklého jídla. Přílohu nevynechávej — množství sacharidů má zůstat stejné.'; it.version = 'v2';
      NF.decideItem(S, 'R-PORADI', 'edited', 'Upřesněn text: příloha se nevynechává.');
      S.reg = null;
    } },
  { id: 'impact', act: 4, title: 'Pacient — rada s novým textem', role: 'patient', page: 'meal', at: '2026-10-24T12:20:00',
    setup: function (S) { freshMeal(S, 'lunch', 'Smažený řízek s bramborovou kaší', 'usual', 'before'); basal(S, '2026-10-23'); },
    apply: function (S) { ep(S, { id: 'E13', food: 'Smažený řízek s bramborovou kaší', meal: 'lunch', at: '2026-10-24T12:30:00', bolus: 'before', advice: [{ lever: 'order', accepted: true }] }); S.meal = null; } },

  /* Dějství 6 — Kontrola */
  { id: 'preview', act: 5, title: 'Pacient — den před kontrolou', role: 'patient', page: 'preview', at: '2027-01-04T18:00:00',
    setup: function (S, B) { series(S, B); if (!S.questions.length) S.questions.push({ id: 'Q1', at: '2027-01-04T18:10:00', text: 'Je v pořádku, že si ke kaši dávám jogurt skoro pokaždé?', suggested: true }); } },
  { id: 'reviewSummary', act: 5, title: 'Lékař — kontrola, krok 1: souhrn', role: 'doctor', page: 'review', at: '2027-01-05T09:00:00',
    apply: function (S) { S.role = 'doctor'; NF.startReview(S, D.habitCatalog); } },
  { id: 'reviewProposals', act: 5, title: 'Lékař — krok 2: návrhy s důvodem a postupem', role: 'doctor', page: 'review', at: '2027-01-05T09:10:00',
    setup: function (S) { if (S.review) S.review.step = 2; },
    apply: function (S) {
      S.role = 'doctor'; var r = S.review;
      r.proposals.forEach(function (pr) {
        r.verify[pr.id] = {}; pr.verify.forEach(function (_, i) { r.verify[pr.id][i] = true; });
        var br = NF.screens.proposalBranch(S, pr), dec = { choice: br && (br.action === 'up' || br.action === 'down' || br.action === 'swap') ? 'agree' : 'keep', branch: br && br.action };
        if (pr.kind === 'dose' && dec.choice === 'agree') { r.newDoses[pr.dose].units += br.action === 'up' ? 2 : -2; dec.units = r.newDoses[pr.dose].units; }
        NF.decideProposal(S, pr.id, dec);
      });
    } },
  { id: 'reviewConfirm', act: 5, title: 'Lékař — krok 3: potvrzení a vydání plánu P2', role: 'doctor', page: 'review', at: '2027-01-05T09:25:00',
    setup: function (S) { if (S.review) S.review.step = 3; },
    apply: function (S) { S.role = 'doctor'; NF.issueFromReview(S, D.habitCatalog); } },
  { id: 'reviewHandover', act: 5, title: 'Lékař — krok 4: předání pacientovi', role: 'doctor', page: 'review', at: '2027-01-05T09:35:00',
    setup: function (S) { if (S.review) S.review.step = 4; } },
  { id: 'newplan', act: 5, title: 'Pacient — nový plán a co se změnilo', role: 'patient', page: 'newplan', at: '2027-01-05T09:40:00',
    apply: function (S) { S.role = 'patient'; NF.confirmUnderstanding(S); } },
  { id: 'trace', act: 5, title: 'Lékař — verze a stopa: důkaz, jak to počítá', role: 'doctor', page: 'trace', at: '2027-01-05T09:50:00' }
];
D.acts = [
  { title: 'Dějství 1 — V ordinaci', note: 'Karta, podmínky, dávky voličem, startovní sada návyků, osobní pokyny. Sestra zaučí s náhledem telefonu.' },
  { title: 'Dějství 2 — Doma: aplikace se učí', note: 'Tři kroky před jídlem s inzulinem první. Po týdnu první známá jídla s rozmezím a reakcí.' },
  { title: 'Dějství 3 — Rada před jídlem', note: 'Před píchnutím porce zpět k obvyklé; po píchnutí jen z větší; vlastní jídlo třemi klepnutími.' },
  { title: 'Dějství 4 — Nemoc', note: 'Pacient označí nemoc, aplikace pomáhá dál, ale jinak. Ukončuje pacient.' },
  { title: 'Dějství 5 — Registr', note: 'Lékař-garant upraví text rady; změna platí okamžitě a je v historii.' },
  { title: 'Dějství 6 — Kontrola', note: 'Pacient: report před kontrolou. Lékař: souhrn → návrhy → potvrzení → předání. Stopa.' }
];
D.chapters = CH;

D.play = function (index, branches) {
  var idx = Math.max(0, Math.min(CH.length - 1, Number(index) || 0));
  var B = {}; Object.keys(D.defaults).forEach(function (k) { B[k] = D.defaults[k]; });
  if (branches) Object.keys(branches).forEach(function (k) { if (branches[k]) B[k] = branches[k]; });
  var S = NF.createState(); NF.resetUid(); S.branches = B; setup(S);
  var stop = B.training === 'failed' ? D.indexOf('handover') : idx;
  for (var i = 0; i < stop; i++) { S.clock = CH[i].at; if (CH[i].setup) CH[i].setup(S, B); if (CH[i].apply) CH[i].apply(S, B); }
  var ch = CH[stop];
  S.clock = ch.at; if (ch.setup) ch.setup(S, B);
  S.role = ch.role; S.page = ch.page; S.wizardStep = ch.wizardStep != null ? ch.wizardStep : 0;
  S.chapter = ch.id; S.chapterIndex = stop; S.error = '';
  NF.log(S, 'prezentace.kapitola', ch.id + ' · ' + JSON.stringify(B));
  return S;
};
D.indexOf = function (id) { for (var i = 0; i < CH.length; i++) if (CH[i].id === id) return i; return -1; };

/* Otázky pro garanta podle dějství (panel prezentujícího). */
D.garantQuestions = [
  ['Stačí čtyři podmínky zařazení?', 'Je startovní sada návyků správná pro všechny?', 'Jsou připravené věty pokynů úplné?', 'Stačí hrubá denní doba (10:00 / 15:30 / 21:00) k rozlišení, že jídlo už minulo?'],
  ['Je vrchol 0–120 min správná míra reakce?', 'Stačí 3 zápisy pro „známé jídlo“?'],
  ['Je pravidlo „z větší porce zpět k obvyklé i po píchnutí“ bezpečné?', 'Jsou hrubé štítky dostatečné pro podobnost?'],
  ['Má aplikace při nemoci radit doplněk a pořadí?'],
  ['Kdo smí pravidla měnit mezi kontrolami a jak rychle to pacient uvidí?'],
  ['Jsou prahy návrhů k dávce (6 jídel, 2/3, 14 dní) správné?', 'Je postup posouzení D-POSTUP úplný?']
];

})(typeof window !== 'undefined' ? window : globalThis);
