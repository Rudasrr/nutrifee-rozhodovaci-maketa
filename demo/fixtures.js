/* Modelová data a příběh. Součást prezentační vrstvy — produkce tento soubor nezahrnuje.
   Registr (položky ke schválení; maketa se chová, jako by byly schválené), katalogy, ~200 českých jídel, simulovaný senzor, kapitoly. */
(function (global) {
'use strict';
var NF = global.NutriFee;
var D = global.NutriFeeDemo = global.NutriFeeDemo || {};

var T0 = '2026-09-28T10:00:00'; /* modelové schválení registru garantem */
D.hba1c = [62, 55];

/* ---------- schvalovací registr ---------- */
function reg() {
  var A = function (o) { o.status = 'approved'; o.decidedAt = T0; o.decidedBy = 'DEMO-L01'; o.params = o.params || {}; o.guide = (D.guide && D.guide[o.id]) || null; return o; }; /* pětidílný průvodce položkou (demo/guide.js) */
  return [
    A({ id: 'K-KRITERIA', cat: 'kohorta', title: 'Podmínky zařazení', summary: 'Dospělý s DM2, jen inzulin, bazál + 3 prandiální pevné dávky, senzor CGM.', detail: 'Celý návrh stojí na pevné dávce inzulinu k jídlu. Pacient s flexibilním dávkováním nebo s tabletami na diabetes by dostával rady postavené na předpokladu, který u něj neplatí.', usedBy: 'zařazení' }),
    A({ id: 'C-CILE', cat: 'plan', title: 'Cíle glukózy', summary: 'Výchozí cíle pro každého pacienta: v cíli 3,9–10,0 mmol/l, ráno nalačno do 7,2, čas v cíli alespoň 70 %. Lékař je u pacienta může při zařazení i kontrole upravit.', detail: 'Z cílů vychází „v cíli / nad cílem“ u jídel, semafor v reportu i návrhy k dávce. Hodnoty jsou návrh autora makety; garant je mění tady, lékař u konkrétního pacienta v plánu.', params: { low: 3.9, high: 10.0, fastingHigh: 7.2, tirGoal: 70 }, labels: { low: 'dolní cíl (mmol/l)', high: 'horní cíl po jídle (mmol/l)', fastingHigh: 'ráno nalačno do (mmol/l)', tirGoal: 'čas v cíli alespoň (%)' }, steps: { low: 0.1, high: 0.5, fastingHigh: 0.1, tirGoal: 5 }, usedBy: 'zařazení, kontrola, karty jídel, report' }),
    A({ id: 'R-NAVYKY', cat: 'plan', title: 'Startovní sada návyků', summary: 'Stejná pro všechny: zapisujte hlavní jídla · obvyklá porce · potvrzujte inzulin · bazál každý večer. Lékař může škrtnout nebo přidat.', detail: 'Stejný start umožní porovnat pacienty napříč studií. Personalizace přichází až z dat na první kontrole.', usedBy: 'zařazení, kontrola' }),
    A({ id: 'R-REAKCE', cat: 'vypocty', title: 'Vyhodnocení reakce na jídlo', summary: 'Vzestup glukózy po jídle (vrchol minus hodnota před jídlem) v okně 0–120 min; v cíli = vzestup nejvýš 3,0 mmol/l. Jídlo je známé, až když se aspoň 3 započítané zápisy z posledních 6 shodují (rozdíl vzestupů do 3,0 mmol/l); 1. zápis „první dojem“, 2. „zatím to vypadá“ jen při shodě. Rozmezí do 8 zápisů nejnižší–nejvyšší, od 8 zápisů 10.–90. percentil. Když se nový zápis rozchází s dřívějšími o 3,0 mmol/l a víc, aplikace se jednou zeptá: stejné jídlo · jiná příloha nebo množství · jinak připravené · jiný den (jiná příloha nebo příprava = samostatné jídlo, jiný den = zápis se nepočítá). Po 6 zápisech bez shody je jídlo „nestálé“ a lékař ho vidí v podkladech.', detail: 'Započítaný zápis = úplná data ze senzoru, inzulin potvrzen podle plánu, mimo nemoc a mimo neobvyklý den, obvyklá porce, stejná dávka jako dnes. Vzestup místo absolutního vrcholu, aby se vysoký start dne nepřipisoval jídlu (R30). Delší okno u tučných jídel je připravené, ale vypnuté (bez údaje o úpravě ho nelze zapnout automaticky). Popisuje minulost, nepředpovídá.', params: { minKnown: 3, okno_min: 120, okno_tucne_min: 0, kriterium: 'vzestup', vzestup_max: 3, nestale_mmol: 3, minQuantile: 8, shoda_mmol: 3, maxUceni: 6 }, labels: { shoda_mmol: 'shoda zápisů: rozdíl vzestupů do (mmol/l)', maxUceni: 'nejvýš zápisů na poznání', minKnown: 'známé od (počet započítaných zápisů)', okno_min: 'okno vrcholu po jídle (min)', okno_tucne_min: 'okno u smažených jídel z databáze (min; 0 = vypnuto)', kriterium: 'kritérium v cíli (vzestup / vrchol)', vzestup_max: 'v cíli = vzestup nejvýš (mmol/l)', nestale_mmol: 'nestálé jídlo od rozdílu zápisů (mmol/l)', minQuantile: 'percentily od (počet zápisů)' }, usedBy: 'karty jídel, rady, report' }),
    A({ id: 'Z-GLUKOZA', cat: 'vypocty', title: 'Hodnoty glukózy opsané z aplikace senzoru', summary: 'Bez napojení na výrobce senzoru. V kroku 1 pacient opíše hodnotu, kterou právě ukazuje aplikace senzoru; 120 min po jídle se aplikace zeptá na nejvyšší hodnotu od jídla (z grafu senzoru). Vzestup = nejvyšší − před jídlem. „Nevím“ zápis uloží, ale do učení se nepočítá, dokud ho nedoplní export. Opsané hodnoty později nahradí přesný průběh z exportu.', detail: 'Rozhodnutí vlastníka 15. 10. 2026: napojení na senzor by vyžadovalo souhlas výrobce a certifikaci rozhraní; dvě opsané hodnoty stačí k učení i k radě. Míra zůstává vrchol 0–120 min (ne hodnota ve 2. hodině), aby pacient i lékař viděli totéž číslo.', params: { pripominka_min: 120 }, labels: { pripominka_min: 'připomínka nejvyšší hodnoty po (min)' }, usedBy: 'krok 1, karta na Dnes po 2 hodinách, učení' }),
    A({ id: 'Z-IMPORT', cat: 'vypocty', title: 'Export z aplikace senzoru', summary: 'Jednou týdně (připomínka) a vždy před kontrolou pacient nahraje export z aplikace senzoru (soubor csv; xlsx uložený jako csv). Aplikace ho čte jen v telefonu, přiřadí měření k zápisům (0–180 min po jídle) a k nocím (bazál) a přepočítá vrcholy; opsané hodnoty tím nahradí. Bez exportu před kontrolou lékař vidí jen opsané hodnoty.', detail: 'Export je pacientova data; nepotřebuje svolení výrobce. Formáty běžných aplikací senzorů (čas + hodnota) i obecný „čas;hodnota“.', params: { dny: 7, po_jidle_min: 180 }, labels: { dny: 'připomínka každých (dní)', po_jidle_min: 'měření po jídle do (min)' }, usedBy: 'týdenní shrnutí, Dnes, před kontrolou, bazál' }),
    A({ id: 'R-PODOBNOST', cat: 'vypocty', title: 'Podobné jídlo podle pacienta', summary: 'U nového jídla může pacient nepovinně klepnout „Je to jako X“ (jedno ze svých známých jídel). Do třetího vlastního zápisu se ukáže široké rozmezí z toho jídla, bez čísla „přesně“; váha 2 virtuální zápisy, od 3 vlastních 0 %. Bez potvrzení se nic neodhaduje. Jídla z databáze se k sobě přirovnávají podle předvyplněných údajů (zdroj, úprava, forma) při aspoň 3 podobných jídlech, 6 zápisech a shodě 2 ze 3.', detail: 'Složení jídla pacient nezadává (rozhodnutí 15. 10. 2026). Podobnost tedy určuje jen on sám; aplikace nehádá z názvu.', params: { minJidel: 3, minZapisu: 6, shoda: 0.67, vaha: 2, maxNaJidlo: 3 }, labels: { minJidel: 'databázová jídla: nejméně podobných', minZapisu: 'databázová jídla: nejméně zápisů', shoda: 'databázová jídla: shoda (0–1)', vaha: 'váha odhadu (virtuální zápisy)', maxNaJidlo: 'nejvýš zápisů z jednoho jídla' }, usedBy: 'karty jídel, nové jídlo' }),
    A({ id: 'R-SKORE', cat: 'skore', title: 'Stupeň reakce: mírná / střední / častěji nad cílem', summary: 'Od 3 zápisů: mírná = všechny v cíli, častěji nad cílem = aspoň 2 ze 3 nad cílem, jinak střední. Od 4. zápisu podíl v cíli z posledních 6 zápisů: mírná ≥ 80 %, střední ≥ 50 %, jinak častěji nad cílem; stupeň se mění, jen když by platil i s jedním zápisem jinak. „Ustálené“ od 5 zápisů. Vztaženo k pacientovým vlastním jídlům.', detail: 'Žádné známky ani „dobré/špatné jídlo“. Štítek říká, jak často po jídle zůstane v cíli. Při silné reakci nikdy zákaz ani „jezte méně“ — jen zapisovat dál, porce ne větší než obvyklá; jídlo se pasivně nenabízí mezi návrhy.', params: { mirna: 0.8, stredni: 0.5, odKolika: 3, silnaZeTri: 2, oknoZapisu: 6, ustaleneOd: 5 }, labels: { mirna: 'mírná od podílu v cíli (0–1)', stredni: 'střední od podílu v cíli (0–1)', odKolika: 'stupeň od (počet zápisů)', silnaZeTri: 'silná při 3 zápisech od (počet nad cílem)', oknoZapisu: 'podíl z posledních (počet zápisů)', ustaleneOd: 'ustálené od (počet zápisů)' }, usedBy: 'karty jídel, report' }),
    A({ id: 'R-PORCE', cat: 'rady', title: 'Rada: obvyklá porce', summary: 'Před píchnutím oběma směry k obvyklé; po píchnutí a při „nevím“ jen z větší zpět k obvyklé. Nikdy „snězte víc“.', detail: 'Dávka je klíč vyrobený na obvyklou porci. Po píchnutí inzulin působí 3–5 h; návrat z větší porce k obvyklé je bezpečný, „snězte víc“ by učilo jíst podle inzulinu.', texts: { biggerBefore: 'Dejte si obvyklou porci. Vaše dávka inzulinu je nastavená na obvyklé množství — větší porce ho přesáhne.', biggerAfter: 'Dejte si obvyklou porci. Inzulin, který už máte v těle, je nastavený na obvyklé množství; větší porce ho přesáhne.', smaller: 'Dejte si obvyklou porci. Menší porce při stejné dávce inzulinu může vést k nízké glukóze.', certainty: 'Obvyklá porce je množství, na které lékař nastavil vaši dávku.' }, usedBy: 'před jídlem' }),
    A({ id: 'R-DOPLNEK', cat: 'rady', title: 'Rada: doplněk k jídlu', summary: 'Přidat bílkovinu nebo tuk (jogurt, sýr, vejce, ořechy) k jídlu, nic z jídla neubírat. Jen před píchnutím a mimo nemoc; u jídla, kde pacient odpoví „v jídle to není“ nebo kde třikrát nepomohla, se už nenabízí.', detail: 'Doplněk se k jídlu přidává, nikdy nic nenahrazuje — množství sacharidů zůstává. Tuk a bílkovina posouvají vrchol později, proto se rada hodnotí stejným oknem jako jídlo samo (R-REAKCE).', text: 'Přidejte k jídlu {addon}. Z jídla nic neubírejte.', params: { stahnout_po: 3 }, labels: { stahnout_po: 'stáhnout po (počet pokusů bez účinku)' }, usedBy: 'před jídlem' }),
    A({ id: 'R-PORADI', cat: 'rady', title: 'Rada: pořadí jídla', summary: 'Sníst nejdřív zeleninu nebo maso, pak přílohu. Množství se nemění. Když pacient odpoví „v jídle to není“, u toho jídla se už nenabízí.', text: 'Snězte nejdřív {first}, potom zbytek jídla.', usedBy: 'před jídlem' }),
    A({ id: 'R-PROCHAZKA', cat: 'rady', title: 'Rada: procházka po jídle', summary: 'Asi 15 minut svižné chůze po jídle. Ne během nemoci.', text: 'Po jídle se asi {minut} minut svižně projděte.', params: { minut: 15 }, labels: { minut: 'délka procházky (min)' }, usedBy: 'před jídlem' }),
    A({ id: 'D-CISTA', cat: 'davka', title: 'Čistá data pro návrhy k dávce', summary: 'Jen jídla s obvyklou porcí, dávkou potvrzenou podle plánu a včas (nejvýš 30 min před jídlem, 15 min po něm), mimo nemoc a mimo „neobvyklý den“ (stres, špatný spánek, alkohol — pacient označí jedním klepnutím), s úplnými daty, bez svačiny do 120 min po jídle. Do návrhu k dávce navíc ne zpětný zápis s odhadnutým časem, ne podání až po jídle, ne dodatečně opravený inzulin (ty jdou jen do učení). Inzulin lze opravit do 60 min po zápisu.', detail: 'Přesně to, co lékař při posuzování dávky vylučuje ručně. Bez toho by návrh ukazoval na dávku, přestože příčina je v porci nebo podání. Podání 15–30 min před jídlem je u prandiálního inzulinu běžný postup, proto se počítá.', params: { pred_min: 30, po_min: 15, svacina_min: 120, oprava_min: 60 }, labels: { pred_min: 'inzulin nejvýš před jídlem (min)', po_min: 'inzulin nejvýš po jídle (min)', svacina_min: 'svačina vyřazuje do (min po jídle)', oprava_min: 'oprava inzulinu možná do (min)' }, usedBy: 'návrhy k dávce, učení' }),
    A({ id: 'D-PRAND', cat: 'davka', title: 'Návrh: posoudit prandiální dávku', summary: 'Jednotka = jídlo dne (snídaně / oběd / večeře) s rozpadem po jídlech. Okno od poslední změny dávky, nejméně 28 dní. Nad cílem: ≥ 8 čistých jídel, ≥ 2/3 s vrcholem 0–120 min nad cílem a medián vrcholu víc než 0,5 nad cílem, a to až po ≥ 3 přijatých radách k jídlu. Pod cílem: ≥ 2 poklesy pod 3,9 do 4 h a zároveň ≥ 15 % jídel (z ≥ 6), nebo jediný pokles pod 3,0; nízké hodnoty se berou ze všech zápisů. Karta vždy ukazuje čas v cíli, podíl pod cílem a HbA1c.', detail: 'Rady k jídlu jdou vždy první; dávka je poslední páka. Aplikace nevymýšlí směr — ukáže větev postupu D-POSTUP.', params: { dny: 28, minJidel: 8, podil: 0.67, radyPrve: 3, hypo: 2, hypoPodil: 0.15, hypoMin: 6, medianNad: 0.5 }, labels: { dny: 'okno nejméně (dní)', minJidel: 'nejméně čistých jídel (počet)', podil: 'podíl nad cílem nejméně (0–1)', radyPrve: 'přijatých rad nejdřív (počet)', hypo: 'poklesů pod dolní cíl nejméně (počet)', hypoPodil: 'podíl jídel s poklesem nejméně (0–1)', hypoMin: 'jídel pro posouzení poklesů nejméně (počet)', medianNad: 'medián vrcholu nad cílem o (mmol/l)' }, usedBy: 'report' }),
    A({ id: 'D-BAZAL', cat: 'davka', title: 'Návrh: posoudit bazální dávku', summary: 'Z nejméně 10 nocí za 14 dní: medián ranních hodnot nad cílem bez nočních poklesů → posoudit. ≥ 2 noci pod 3,9 nebo 1 pod 3,0 → posoudit, s předností (jediný bod pod 3,0 může být artefakt senzoru — uvedeno u návrhu).', params: { dny: 14, nociPod: 2, minNoci: 10 }, labels: { dny: 'okno (dní)', nociPod: 'nocí pod dolním cílem nejméně (počet)', minNoci: 'nocí s daty nejméně (počet)' }, usedBy: 'report' }),
    A({ id: 'D-POSTUP', cat: 'davka', title: 'Postup posouzení dávky (větve)', summary: 'Co ověřit s pacientem a co z výsledku plyne: vše sedí a hodnoty nad cílem → zvýšit; podání nesedí → ponechat a řešit podání; dojídání → ponechat. Velikost kroku vždy volí lékař.', detail: 'Ověřovací body i věty „zvýšit / snížit / ponechat“ jsou texty této položky, kterou schválil lékař-garant; garant může jednotlivou větev vyřadit. Aplikace postup jen aplikuje na data a ukáže větev. Krok v jednotkách postup nikdy neobsahuje.',
      postup: {
        bazalLow: { title: 'Bazál — noční hodnoty pod cílem', verify: ['Bazál si pacient píchá ve stejnou hodinu (potvrzeno {as} z {n})', 'Večeře v těch nocích byly obvyklé, bez alkoholu a nočního jídla', 'Pohyb v těch dnech byl běžný, bez mimořádné zátěže'], branches: [{ when: 'body 1–3 sedí', action: 'down', text: 'snížit bazál' }, { when: 'bod 1 nesedí', action: 'keep', text: 'ponechat, řešit čas podání' }, { when: 'bod 2 nesedí', action: 'keep', text: 'ponechat, řešit večeře' }] },
        bazalHigh: { title: 'Bazál — ranní hodnoty nad cílem', verify: ['Bazál potvrzen ve stejnou hodinu ({as} z {n})', 'Bez pozdní večeře a nočního jídla', 'Technika a místo aplikace v pořádku', 'Celkové vyrovnání je mimo cíl (čas v cíli pod {tirGoal} %, nebo HbA1c nad cílem)'], branches: [{ when: 'body 1–4 sedí', action: 'up', text: 'zvýšit bazál' }, { when: 'bod 1 nesedí', action: 'keep', text: 'ponechat, řešit podání' }, { when: 'bod 2 nesedí', action: 'keep', text: 'ponechat, řešit večeře' }, { when: 'bod 4 nesedí', action: 'keep', text: 'ponechat — celkově v cíli, zvažte riziko nízké glukózy' }] },
        prandLow: { title: 'Inzulin k jídlu — hodnoty pod cílem', verify: ['Porce byla obvyklá (ne menší)', 'Dávka potvrzena podle plánu a včas', 'Pohyb po jídle byl běžný'], branches: [{ when: 'body 1–3 sedí', action: 'down', text: 'snížit dávku {meal}' }, { when: 'bod 1 nesedí', action: 'keep', text: 'ponechat, řešit porce' }] },
        prandAdviceFirst: { title: 'Inzulin k jídlu — nejdřív rady', verify: ['Rady jsou pro pacienta proveditelné (doplněk má doma, pořadí zvládne)', 'Pacient je ochotný rady zkusit'], branches: [{ when: 'oba body sedí', action: 'keep', text: 'ponechat dávku, posílit radu' }, { when: 'bod 1 nesedí', action: 'swap', text: 'vyměnit radu „{lever}“ za jinou' }, { when: 'bod 2 nesedí', action: 'keep', text: 'ponechat dávku, probrat důvody' }] },
        prandHigh: { title: 'Inzulin k jídlu — hodnoty nad cílem', verify: ['Potvrzení dávek a jejich čas sedí', 'Technika a místo aplikace v pořádku', 'Průběhy po jídle odpovídají', 'Mezi jídlem a měřením pacient nejedl nic dalšího', 'V těch dnech pacient nebyl nemocný ani ve větším stresu (nemoc neoznačená?)', 'Celkové vyrovnání je mimo cíl (čas v cíli pod {tirGoal} %, nebo HbA1c nad cílem)'], branches: [{ when: 'všechny body sedí a hodnoty jsou nad cílem', action: 'up', text: 'zvýšit dávku {meal}' }, { when: 'bod 1 nesedí', action: 'keep', text: 'ponechat, řešit podání' }, { when: 'bod 4 nesedí', action: 'keep', text: 'ponechat, řešit dojídání' }, { when: 'bod 5 nesedí', action: 'keep', text: 'ponechat, vyřadit dny nemoci a posoudit příště' }, { when: 'bod 6 nesedí', action: 'keep', text: 'ponechat — celkově v cíli, zvažte riziko nízké glukózy' }] }
      }, usedBy: 'návrhové karty' }),
    A({ id: 'R-POKYNY', cat: 'pokyny', title: 'Katalog osobních pokynů', summary: 'Připravené věty (nízká glukóza, méně jídla než obvykle, nemoc, vysoká glukóza, kdy volat) s hodnotami, které volí lékař.', usedBy: 'zařazení, Bezpečí, nemoc' }),
    A({ id: 'Z-BODY', cat: 'zauceni', title: 'Body zaučení', summary: 'Tři pevné body (aplikace, Bezpečí, kontakty) + body podle návyků ve startovním plánu. Sestra zaškrtává, co pacient udělal sám.', usedBy: 'zaučení' }),
    A({ id: 'J-DATABAZE', cat: 'jidla', title: 'Seznam jídel', summary: 'Syntetický seznam ~200 běžných českých jídel a hotovek. Skutečný zdroj a licence se vyberou pro studii.', usedBy: 'před jídlem' }),
    A({ id: 'J-STITKY', cat: 'jidla', title: 'Nové jídlo jen názvem', summary: 'Pacient napíše název (našeptávač, „Zase to samé“), případně klepne „Je to jako X“, a hotovo. Žádné složení, úprava, velikost ani makra — učíme se z reakce těla; složení si aplikace dovodí z chování (rada, která v jídle nejde, se vypne odpovědí „v jídle to není“). U podobného názvu se aplikace ujistí „Není to totéž jídlo?“; nové jídlo zůstává samostatné, nic se neslučuje.', detail: 'Rozhodnutí vlastníka 15. 10. 2026: pro učení z reakce těla není složení třeba; předchozí builder (zdroj · úprava · talíř) zrušen jako zbytečná zátěž. Jídla z databáze mají údaje předvyplněné, pacient je nevidí.', usedBy: 'nové jídlo' }),
    A({ id: 'S-SILNA', cat: 'report', title: 'Silné reakce: jedna věta pro lékaře', summary: 'Lékař dostane na kontrole jednu větu: kolik jídel má opakovanou silnou reakci, kolik zápisů celkem a nejvýš 3 nejčastěji jedená; ostatní jen rozbalením. Práh: aspoň 3 zápisy nad cílem, nebo 2 s vzestupem aspoň o 3,0 mmol/l nad hranici. Silné reakce řeší aplikace s pacientem (porce, pořadí, doplněk, procházka, jídlo se nenabízí); lékař neprobírá jídla ani jejich složení.', detail: 'Rozhodnutí vlastníka 15. 10. 2026: lékař nesmí dostat seznam dvaceti jídel k probrání. Pacientovi žádný zákaz ani „jezte méně“ (zásada 3).', params: { silnych: 3, dvaNad_mmol: 3, maxJidel: 3 }, labels: { silnych: 'práh (počet zápisů nad cílem)', dvaNad_mmol: 'nebo 2 zápisy s vzestupem nad hranici aspoň (mmol/l)', maxJidel: 'nejvýš jídel ve větě pro lékaře' }, usedBy: 'report lékaři' }),
    A({ id: 'S-SOUHRN', cat: 'report', title: 'Věta „co se dělo“ a srovnání rad', summary: 'Šablona z pravidel (porce, potvrzení inzulinu, rady, TIR). Srovnání „s radou bývalo níž“ se říká jen od 8 zápisů s radou a 8 bez ní u téže rady a při rozdílu mediánu vrcholu ≥ 1,0 mmol/l; jinak „zatím nelze říct“. Žádná generativní AI.', detail: 'Pacient si sám volí, kdy radu přijme, takže srovnání skupin není důkaz účinku. Proto neutrální znění bez slova „fungovaly“ a bez fajfky (6. 10. 2026).', params: { min_n: 8, rozdil_mmol: 1.0 }, labels: { min_n: 'zápisů s radou i bez ní nejméně (počet)', rozdil_mmol: 'rozdíl mediánů nejméně (mmol/l)' }, usedBy: 'report' }),
    A({ id: 'S-VYSLEDEK', cat: 'report', title: 'Karta „Jak to dopadlo“', summary: 'Po příchodu dat ze senzoru jedna karta na Dnes: vrchol věcně, poděkování za čin (zkusil radu, zapsal). Žádná pochvala za hodnotu glukózy.', detail: 'Uzavírá smyčku učení: pacient vidí výsledek toho, co udělal, ve chvíli, kdy je známý. Hodnota není jeho zásluha ani vina, proto se říká věcně; díky patří činu.',
      params: { min_n: 4 }, labels: { min_n: 'věta „bez toho u vás bývá“ od (počet zápisů s radou i bez ní)' },
      texts: { okAdvice: '{meal} · {food} {lever}: nejvyšší hodnota <strong>{peak} mmol/l</strong>, v cíli. Díky za pokus.{base}', excluded: '{meal} · {food}: zápis se do učení nepočítá ({why}), výsledek proto nehodnotíme. Díky za zápis.', highAdvice: '{meal} · {food} {lever}: nejvyšší hodnota <strong>{peak} mmol/l</strong>, nad cílem. I tak díky — každý zápis zpřesňuje, co vám pomáhá. Zkoušíme dál.', okPlain: '{meal} · {food}: nejvyšší hodnota <strong>{peak} mmol/l</strong>, v cíli. Díky za zápis.', highPlain: '{meal} · {food}: nejvyšší hodnota <strong>{peak} mmol/l</strong>, nad cílem. {sugg}', suggestData: 'Příště můžete zkusit {lever} — u vás to vyšlo {k} z {n} v cíli.', suggestGeneric: 'Příště můžete zkusit doplněk k jídlu nebo jiné pořadí; nabídneme vám to před jídlem.', baseNote: 'Bez toho u vás bývá {lo}–{hi}. ', unusable: ' Zápis máme, do učení ale nejde ({why}).', nodata: '{meal} · {food}: data ze senzoru k tomuto zápisu chybí. Zápis máme, do učení nejde.' }, usedBy: 'Dnes' }),
    A({ id: 'R-DIKY', cat: 'rady', title: 'Poděkování po uložení', summary: 'Věta podle činu: přijal radu · vrátil se k obvyklé porci · doplnil zpětně · zapsal. Nikdy podle hodnoty glukózy.', detail: 'Pochvala za číslo by učila honit čísla a jíst méně, „abych byl v cíli“. Poděkování patří tomu, co pacient udělal.',
      texts: { advice: 'Díky za pokus. Za dvě hodiny vám na Dnes ukážeme, jak to dopadlo.', portion: 'Návrat k obvyklé porci — na tu je nastavená vaše dávka. Díky.', retro: 'Díky za doplnění. I zpětný zápis se počítá do učení.', plain: 'Zapsáno. Za dvě hodiny uvidíte, kam se glukóza dostala.' }, usedBy: 'po uložení jídla' }),
    A({ id: 'R-MILNIKY', cat: 'rady', title: 'Milníky za snahu a návyk', summary: 'Jednorázové: jídlo poznáno · rada zdomácněla · týden bez mezery · obvyklá porce 10× po sobě · všechna častá jídla známe · zpětně doplněno 5×. Žádný milník za hodnotu glukózy. Nejde do reportu lékaře.', detail: 'Chválíme čin a vytrvalost, ne číslo. Milník se ukáže jednou jako karta na Dnes, přehled je v Plánu. Žádné body ani série s trestem.',
      texts: { known: '<strong>{food}</strong> už známe ({n} zápisy se všemi údaji). Od teď vám k němu umíme poradit.', habit: '<strong>{food}</strong> {lever} 3× po sobě. Rada zdomácněla — už je to váš návyk. Díky.', week1: '7 dní, 21 jídel, všechno zapsané. Díky — z tohohle se učíme nejvíc.', usual10: '10 jídel po sobě v obvyklé porci. Na tu je nastavená vaše dávka, jindy jinak je v pořádku. Díky, že ji držíte.', allknown: 'Jídla, která jíte nejčastěji ({n}), už všechna známe. Teď už hlavně doplňujeme.', retro5: 'Už 5 zápisů doplněných zpětně místo vynechání. Díky — i tak se učíme; nejvíc ale pomůže zápis před jídlem.' }, usedBy: 'Dnes, Plán' }),
    A({ id: 'S-CESTA', cat: 'report', title: 'Cesta ke kontrole', summary: 'Pruh dní do kontroly · známá jídla X z N (jedených ≥ 2×) · tento týden X z N jídel zapsáno a inzulin potvrzen · věta, co se na kontrole stane. Čísla „X z N“, ne procenta jako hodnocení.', detail: 'Dlouhodobý cíl musí být vidět: aplikace se učí pacientova jídla a na kontrole z toho lékař rozhodne. Pacient nic nepočítá.',
      texts: { goal: 'Aby aplikace poznala vaše běžná jídla a bylo jasné, co vám u nich pomáhá. Dávky řeší lékař — vy jen jíte jako obvykle a zapisujete.', visit: 'Na kontrole lékař uvidí, jak reagujete na svá jídla a co vám pomáhá, a rozhodne, jestli něco změnit. Vy nic počítat nemusíte.' }, usedBy: 'Dnes, Plán, převzetí plánu' }),
    A({ id: 'S-TYDEN', cat: 'report', title: 'Týdenní shrnutí „Váš týden“', summary: 'Každých 7 dní od vydání plánu: zapsáno · obvyklá porce · co pomohlo · případný milník · jedna nabídka na příští týden z vlastních dat. Jen u pacienta.', detail: 'Jediný pravidelný rytmus mezi kontrolami. Nabídka vychází z toho, co pacientovi u jiného jídla pomohlo.',
      texts: { head: 'Váš {week}. týden', meals: 'Zapsáno {meals} z 21 jídel, {usual} z nich v obvyklé porci.', helped: '{lever}: {k} z {n} v cíli, když byla rada přijata.', milestone: 'Milník týdne:', suggest: 'Příští týden zkuste u jídla {food} {lever} — jinde vám to vyšlo {k} z {n}.', thanks: 'Díky za týden zapisování — z toho se učíme nejvíc.' }, usedBy: 'Dnes' }),
    A({ id: 'R-ZMIZELA', cat: 'rady', title: 'Věta o zmizelé radě', summary: 'Když garant radu zamítne a pacient ji dřív u jídla přijímal, dostane jednu neutrální větu. O garantovi se nemluví.', texts: { text: 'Radu „{lever}“ teď nenabízíme. Vaše dávky se tím nemění.' }, usedBy: 'před jídlem' }),
    A({ id: 'S-SEMAFOR', cat: 'report', title: 'Semafor TIR', summary: 'Zelená TIR > 70 % a pod cílem < 4 %; žlutá TIR 50–70 %; červená TIR < 50 % nebo pod cílem ≥ 4 % nebo pod 3,0 ≥ 1 %.', params: { tir_zelena: 70, tir_zluta: 50, tbr_max: 4, tbr3_max: 1 }, labels: { tir_zelena: 'zelená od času v cíli (%)', tir_zluta: 'žlutá od času v cíli (%)', tbr_max: 'pod dolním cílem nejvýš (%)', tbr3_max: 'pod 3,0 nejvýš (%)' }, usedBy: 'report' }),
    A({ id: 'P-NEMOC', cat: 'provoz', title: 'Režim nemoci', summary: 'Pacient označí nemoc sám; zápisy se štítkují a nepočítají; žádné rady k jídlu, jen pokyny lékaře; denní dotaz „už je vám lépe?“; ukončuje pacient. Po 3 dnech nemoci karta s pokynem lékaře k trvání nemoci; delší období nemoci jsou v reportu zvlášť.', params: { dny: 3 }, labels: { dny: 'karta s pokynem po (dnech nemoci)' }, usedBy: 'Dnes, rady, report' }),
    A({ id: 'P-LEKAR', cat: 'provoz', title: 'Lékař mezi kontrolami nic nedělá', summary: 'Všechny akce lékaře probíhají jen s pacientem v ordinaci. Mezi kontrolami pacienta nikdo nesleduje.', usedBy: 'celá aplikace' })
  ];
}

/* ---------- katalog návyků ---------- */
D.habitCatalog = [
  { id: 'H-ZAPIS', item: 'R-NAVYKY', default: true, title: 'Zapisovat hlavní jídla', short: 'Zapsat hlavní jídla', why: 'Z každého zápisu se aplikace učí, jak vaše tělo reaguje. Po třech zápisech stejného jídla umí poradit.', training: [{ id: 't-zapis', text: 'Pacient sám prošel tři kroky „Chystám se jíst“ a zapsal zkušební jídlo', page: 'meal', preview: { step: 3, bolus: 'before', portion: 'usual' } }] },
  { id: 'H-PORCE', item: 'R-NAVYKY', default: true, title: 'Držet obvyklou porci ke každé dávce', short: 'Obvyklá porce', why: 'Dávka inzulinu je nastavená na obvyklé množství. Když ho držíte, dávka sedí a rady jsou přesnější.', training: [{ id: 't-porce', text: 'Pacient ví, že rada k porci přijde jen před píchnutím a proč', page: 'meal', preview: { step: 3, bolus: 'before', portion: 'bigger' } }] },
  { id: 'H-INZULIN', item: 'R-NAVYKY', default: true, title: 'Potvrzovat inzulin k jídlu', short: 'Potvrdit inzulin', why: 'Bez potvrzení nevíme, jestli glukóza reaguje na jídlo, nebo na chybějící inzulin. Lékař pak nemůže posoudit dávku.', training: [{ id: 't-inzulin', text: 'Pacient ví, že se ho aplikace před každým jídlem zeptá, jestli si už píchl a kolik', page: 'meal', preview: { step: 1 } }] },
  { id: 'H-BAZAL', item: 'R-NAVYKY', default: true, title: 'Dávat inzulin na noc (bazál) každý večer ve stejný čas', short: 'Bazál večer', why: 'Ranní glukóza je zrcadlo bazálu. Stejný čas podání umožní lékaři bazál posoudit.', training: [{ id: 't-bazal', text: 'Pacient našel večerní připomínku bazálu a ví, jak ji potvrdit', page: 'today' }] },
  { id: 'H-CAS', item: 'R-NAVYKY', default: false, title: 'Snídaně ve stejném čase', short: 'Snídaně 7–8 h', why: 'Pravidelný čas snídaně dělá ranní hodnoty srovnatelné.', training: [] },
  { id: 'H-PROCHAZKA', item: 'R-PROCHAZKA', default: false, title: 'Procházka po večeři', short: 'Procházka po večeři', why: 'Krátký pohyb po jídle zmírní vzestup glukózy bez změny jídla.', training: [{ id: 't-prochazka', text: 'Pacient ví, kdy je pohyb po píchnutí v pořádku (podle pokynů lékaře)', page: 'safety' }] }
];
D.instructionCatalog = [
  { id: 'I-NEVIM', title: 'Nevím, jestli byl inzulin píchnutý', text: 'Když nevíte, jestli jste si inzulin už píchli, znovu ho nepíchejte. Změřte glukózu za {v} a řiďte se pokynem pro vysokou, nebo nízkou glukózu.', value: 60, unit: 'min', step: 15, default: true },
  { id: 'I-HYPO', title: 'Nízká glukóza', text: 'Když glukóza klesne pod {v}, snězte 15 g rychlých sacharidů (asi 1,5 dl džusu) a změřte za 15 minut.', value: 3.9, unit: 'mmol/l', step: 0.1, default: true },
  { id: 'I-MENE', title: 'Méně jídla než obvykle', text: 'Když sníte méně, než na kolik máte inzulin, změřte glukózu za {v} a při poklesu postupujte jako u nízké glukózy. Je to pokyn lékaře, ne rada aplikace.', value: 60, unit: 'min', step: 15, default: true },
  { id: 'I-NEMOC', title: 'Nemoc', text: 'Inzulin nevysazujte. Pijte, měřte glukózu každé {v} a při zvracení nebo hodnotách nad 15 volejte ordinaci.', value: 3, unit: 'h', step: 1, default: true },
  { id: 'I-VYSOKA', title: 'Vysoká glukóza', text: 'Když je glukóza nad {v} déle než 3 hodiny, volejte ordinaci.', value: 15, unit: 'mmol/l', step: 0.5, default: false },
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
  /* Štítky R27 odvozené z původního zápisu databáze (příloha/příprava) a z názvu: zdroj sacharidů · úprava · obrázek talíře. Velikost se neeviduje. */
  function tagsFor(name, side, prep, extra) {
    var source = side;
    if (side === 'bez' && /kaše|müsli|cereál|granola|ovesn/i.test(name)) source = 'ovesne';
    else if (/polévk|vývar|guláš\s*polévk/i.test(name)) source = 'tekute';
    else if (/čočk|fazol|cizrn|hrách|quinoa/i.test(name) && side === 'bez') source = 'lusteniny';
    else if (/jablko|banán|hruška|ovoce|ovocný|pomeranč|jahod|borůvk/i.test(name) && side === 'bez') source = 'ovoce';
    else if (/dort|koláč|buchta|zákusek|zmrzlin|sušenk|čokolád|bábovk|palačink|lívanc/i.test(name) && side === 'bez') source = 'sladke';
    var prepN = prep === 'studene' ? 'varene' : prep; if (/kaše/i.test(name) && source !== 'brambory') prepN = 'kase';
    var protein = /maso|řízek|kuře|kuřec|ryb|los|treska|vejc|vajíč|sýr|šunk|tvaroh|jogurt|guláš|karban|sekan|klobás|párek|hovězí|vepř|krůt|tuň|kebab|gyros|burger|hot dog|tofu|salám|játr|kachn|hus|králí|mleté|roštěn|špíz|smažen|vajec/i.test(name);
    var veg = /zelenin|salát|rajč|okurk|špenát|brokol|květák|kapust|zelí|paprik|mrkv|lečo|ratatouille|houb|fazolk/i.test(name) || /zelenin/i.test((extra && extra.first) || '');
    var plate = source === 'tekute' ? 'polevka' : protein && veg ? 'priloha_maso_zelenina' : protein ? 'priloha_maso' : veg ? (side === 'bez' ? 'zelenina' : 'priloha_maso_zelenina') : 'priloha';
    if (veg && !protein && side !== 'bez') plate = 'priloha'; /* příloha se zeleninou bez bílkoviny: zelenina je navíc, hlavní je příloha */
    return { source: source, prep: prepN, plate: plate, veg: veg };
  }
  function add(names, side, prep, size, meal, extra) {
    names.split('|').forEach(function (name) {
      n++; var f = { id: 'F' + n, name: name.trim(), tags: tagsFor(name.trim(), side, prep, extra), meal: meal };
      if (extra) Object.keys(extra).forEach(function (k) { f[k] = extra[k]; });
      out.push(f);
    });
  }
  /* snídaně */
  add('Ovesná kaše s mlékem a banánem|Ovesná kaše s jablkem|Rýžová kaše se skořicí|Jáhlová kaše s ovocem|Krupicová kaše', 'bez', 'varene', 'bezne', 'breakfast', { addon: 'bílý jogurt nebo hrst ořechů', first: 'jogurt', react: 5.4 });
  add('Chléb se sýrem a zeleninou|Chléb s máslem a šunkou|Chléb s tvarohovou pomazánkou|Rohlík se sýrem|Celozrnný chléb s vajíčkem', 'pecivo', 'studene', 'bezne', 'breakfast', { addon: 'plátek sýra nebo vejce navíc', first: 'zeleninu a sýr', react: 2.5 });
  add('Müsli s jogurtem a medem|Cereálie s mlékem|Granola s jogurtem', 'bez', 'studene', 'bezne', 'breakfast', { addon: 'hrst ořechů', first: 'jogurt', react: 5.1 });
  add('Míchaná vejce se zeleninou|Omeleta se šunkou|Vejce natvrdo s chlebem|Šunka s vejci (hemenex)', 'bez', 'varene', 'bezne', 'breakfast', { addon: '', first: 'zeleninu', react: 1.1 });
  add('Koblihy|Croissant s džemem|Loupák s máslem|Buchty s povidly|Vánočka s máslem|Makovec|Bábovka|Palačinky s džemem|Lívance s marmeládou', 'pecivo', 'varene', 'bezne', 'breakfast', { addon: 'tvaroh nebo bílý jogurt', first: 'tvaroh', react: 5.8 });
  add('Jogurt s ovocem|Tvaroh s ovocem|Skyr s ořechy|Cottage s rajčaty', 'bez', 'studene', 'male', 'breakfast', { addon: 'hrst ořechů', first: 'ořechy', react: 1.8 });
  /* obědy, večeře — česká klasika */
  add('Smažený řízek s bramborovou kaší|Smažený řízek s bramborovým salátem|Smažený sýr s hranolkami|Smažené rybí filé s bramborem|Smažené žampiony s bramborem|Smažený květák s bramborem|Kuřecí řízek s bramborem|Smažené kuřecí nugety s hranolkami', 'brambory', 'smazene', 'bezne', 'lunch', { addon: 'salát z čerstvé zeleniny', first: 'salát nebo maso', react: 5.2 });
  add('Svíčková na smetaně s knedlíkem|Hovězí guláš s knedlíkem|Vepřo knedlo zelo|Rajská omáčka s knedlíkem|Koprová omáčka s knedlíkem|Znojemská pečeně s knedlíkem|Segedínský guláš s knedlíkem|Kuře na paprice s knedlíkem|Ovocné knedlíky s tvarohem|Bramborové knedlíky se zelím a uzeným', 'knedlik', 'varene', 'bezne', 'lunch', { addon: 'maso nebo zeleninu navíc', first: 'maso', react: 6.0 });
  add('Kuřecí maso na kari s rýží|Rizoto se zeleninou a kuřecím|Kuřecí čína s rýží|Vepřové nudličky s rýží|Losos s rýží a zeleninou|Rýže s fazolemi|Plněné papriky s rýží|Zapečená rýže se zeleninou', 'ryze', 'varene', 'bezne', 'lunch', { addon: 'zeleninu nebo maso navíc', first: 'maso a zeleninu', react: 4.4 });
  add('Špagety boloňské|Špagety carbonara|Těstoviny s kuřecím a smetanovou omáčkou|Těstovinový salát|Lasagne|Zapečené těstoviny se sýrem|Penne s rajčatovou omáčkou|Gnocchi se špenátem', 'testoviny', 'varene', 'bezne', 'lunch', { addon: 'kuřecí maso nebo sýr navíc', first: 'maso nebo sýr', react: 4.8 });
  add('Pečené kuře s bramborem|Vepřová pečeně s bramborem|Sekaná s bramborovou kaší|Kuřecí stehno s bramborem|Bramborák|Bramboráky s kysaným zelím|Zapečené brambory se zeleninou|Brambory na loupačku s tvarohem|Šunkafleky|Halušky se zelím', 'brambory', 'varene', 'bezne', 'lunch', { addon: 'zeleninový salát', first: 'maso a zeleninu', react: 4.0 });
  add('Bramboračka|Kulajda|Gulášová polévka|Čočková polévka|Hrachová polévka|Zelňačka|Dršťková polévka|Kuřecí vývar s nudlemi|Rajská polévka s rýží|Fazolová polévka|Květáková polévka|Hovězí vývar s knedlíčky', 'bez', 'varene', 'male', 'lunch', { addon: 'plátek sýra nebo šunky navíc', first: 'zavářku', react: 2.6 });
  add('Čočka na kyselo s vejcem|Čočka s uzeným|Fazole na kyselo|Hrachová kaše s cibulkou|Zapečený květák se sýrem|Zeleninové lečo s vejci|Špenát s vejcem a bramborem', 'bez', 'varene', 'bezne', 'lunch', { addon: 'vejce navíc', first: 'vejce', react: 3.2 });
  add('Grilovaný losos se zeleninou|Kuřecí prsa se zeleninou|Krůtí steak se salátem|Hovězí steak se zeleninou|Pečená treska se zeleninou|Tofu se zeleninou', 'bez', 'varene', 'bezne', 'dinner', { addon: '', first: 'zeleninu', react: 1.4 });
  add('Zeleninový salát s kuřecím|Salát s tuňákem|Řecký salát|Caesar salát|Salát s kozím sýrem|Šopský salát', 'bez', 'studene', 'bezne', 'dinner', { addon: 'vejce nebo sýr', first: 'zeleninu', react: 1.6 });
  /* hotovky a rychlé jídlo */
  add('Pizza Margherita|Pizza šunková|Pizza salámová|Pizza Quattro formaggi', 'pecivo', 'varene', 'velke', 'dinner', { addon: 'salát před pizzou', first: 'salát', react: 5.9 });
  add('Kebab v pitě|Gyros v pitě|Burger s hranolkami|Cheeseburger|Hot dog|Párek v rohlíku|Langoš se sýrem|Smažený sýr v housce|Bageta se šunkou a sýrem|Bageta s kuřecím|Sendvič s tuňákem|Tortilla s kuřecím', 'pecivo', 'smazene', 'velke', 'dinner', { addon: 'zeleninu navíc', first: 'maso a zeleninu', react: 6.2 });
  add('Sushi set|Pad thai|Kuře kung pao s rýží|Smažené nudle se zeleninou|Kuřecí s bambusem a rýží|Bún bò Nam Bộ|Pho bo|Kari s rýží', 'ryze', 'varene', 'bezne', 'dinner', { addon: 'maso nebo zeleninu navíc', first: 'maso a zeleninu', react: 4.9 });
  add('Lasagne z chlazeného pultu|Hotové rizoto z krabičky|Instantní nudlová polévka|Mražená pizza|Hotová svíčková v sáčku|Hotový guláš v konzervě|Kuřecí nugety mražené|Bramborové krokety mražené|Zapečené těstoviny hotové|Segedín hotový', 'testoviny', 'varene', 'bezne', 'dinner', { addon: 'salát nebo vejce', first: 'zeleninu', react: 5.4 });
  add('Chlebíčky s vlašským salátem|Obložené chlebíčky|Utopenec s chlebem|Nakládaný hermelín s chlebem|Tlačenka s cibulí a chlebem|Sekaná s chlebem a hořčicí|Párky s chlebem a hořčicí|Klobása s chlebem|Bramborový salát', 'pecivo', 'studene', 'bezne', 'dinner', { addon: 'zeleninu', first: 'maso', react: 4.2 });
  /* svačiny */
  add('Jablko|Banán|Hroznové víno|Hruška|Mandarinky|Ovocný salát', 'bez', 'studene', 'male', 'snack', { addon: 'hrst ořechů', first: 'ořechy', react: 2.9 });
  add('Sušenky|Čokoládová tyčinka|Oplatky|Perník|Zákusek|Dort|Zmrzlina|Chipsy|Slané tyčinky|Popcorn', 'pecivo', 'studene', 'male', 'snack', { addon: 'bílý jogurt k tomu', first: 'jogurt', react: 5.5 });
  add('Ořechy|Sýr|Vařené vejce|Hummus se zeleninou|Zeleninové tyčinky', 'bez', 'studene', 'male', 'snack', { addon: '', first: 'zeleninu', react: 0.9 });
  add('Knedlíky s vejci|Houskový knedlík s vajíčkem', 'knedlik', 'varene', 'bezne', 'dinner', { addon: 'vejce navíc', first: 'vejce', react: 5.6 });
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
/* „Aplikace senzoru“ v ukázce: co by pacient viděl v grafu (nejvyšší hodnota) a ukázkový export csv pro zápisy bez průběhu + noci. Jádro žádný senzor nevolá. */
D.sensorPeak = function (S, ep) { var src = NF.sensorSource(S, { foodId: ep.foodId, advice: ep.advice, portion: ep.portionPlanned, insulin: ep.insulin, meal: ep.meal, at: ep.at }); return Math.max.apply(null, src.points.map(function (p) { return p.mmol; })); };
D.demoCsv = function (S) {
  var rows = [], days = {};
  function ts(iso) { return iso.slice(8, 10) + '-' + iso.slice(5, 7) + '-' + iso.slice(0, 4) + ' ' + iso.slice(11, 16); }
  S.episodes.forEach(function (ep) {
    if (NF.hasImport(ep)) return;
    var v = NF.sensorSource(S, { foodId: ep.foodId, advice: ep.advice, portion: ep.portionPlanned, insulin: ep.insulin, meal: ep.meal, at: ep.at }).points.map(function (p) { return p.mmol; });
    var seq = v.concat([NF.r1(v[4] - 0.4), NF.r1(v[4] - 0.7)]);
    [0, 30, 60, 90, 120, 150, 180].forEach(function (m, i) { rows.push([NF.addMin(ep.at, m), seq[i]]); });
    days[String(ep.at).slice(0, 10)] = 1;
  });
  Object.keys(days).forEach(function (d) { if (S.nights.some(function (n) { return n.date === d; })) return; for (var h = 0; h <= 6; h++) rows.push([d + 'T0' + h + ':00:00', NF.r1(5.4 + 0.12 * h)]); });
  if (!rows.length) return null;
  rows.sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
  return 'Device Timestamp,Historic Glucose mmol/L\n' + rows.map(function (r) { return ts(r[0]) + ',' + String(r[1]).replace('.', ','); }).join('\n');
};
D.importDemoApply = function (S) { var csv = D.demoCsv(S); if (csv) NF.importReadings(S, NF.parseSensorCsv(csv)); };
NF.demoActions = NF.demoActions || {};
NF.demoActions.importDemo = function () { var S = NF.getState(), csv = D.demoCsv(S); if (!csv) return; NF.actions.importText(csv); };
NF.slots.importDemo = function () { return '<div class="actions" style="margin-top:8px"><button type="button" class="btn sm" data-action="importDemo">Použít ukázkový export ze senzoru</button><span class="small muted">DEMO: soubor vytvoří ukázka místo aplikace senzoru</span></div>'; };

/* ---------- pomocníci příběhu ---------- */
function foodByName(S, name) { return S.foods.filter(function (f) { return f.name === name; })[0]; }
function ep(S, spec) {
  var f = spec.food.id ? spec.food : foodByName(S, spec.food);
  var p = NF.activePlan(S), meal = spec.meal || 'breakfast';
  var advice = (spec.advice || []).map(function (a) { return { lever: a.lever, item: NF.LEVERS[a.lever].item, accepted: a.accepted === undefined ? null : a.accepted, reason: a.reason || null }; });
  var taken = advice.filter(function (a) { return a.accepted === true && a.lever !== 'portion'; })[0];
  var portionTaken = advice.some(function (a) { return a.lever === 'portion' && a.accepted === true; });
  var portion = portionTaken ? 'usual' : (spec.portion || 'usual');
  var dose = p.doses[meal], snack = NF.isSnack(meal);
  var confirmed = snack ? 'snack' : (spec.insulin || 'as'), units = snack ? null : confirmed === 'as' ? dose.units : confirmed === 'other' ? (spec.units || dose.units - 2) : null;
  var k = hash(spec.at + f.id);
  var ctx = spec.context || (confirmed === 'none' ? 'nodose' : confirmed === 'other' && units < dose.units ? 'lowdose' : null);
  var v = curve(S, f, portion, taken && taken.lever, k, ctx === 'illness' ? 'illness' : ctx);
  if (spec.gap) v = [v[0], v[1], null, null, null];
  if (spec.low) v = [5.2, 4.4, 3.6, 3.4, 4.1];
  var e = { id: spec.id || NF.uid('E'), planId: p.id, meal: meal, foodId: f.id, at: spec.at, recordedAt: spec.at, portionPlanned: spec.portion || 'usual', portion: portion, bolusAtAdvice: spec.bolus || 'as',
    insulin: { prescribed: dose ? dose.units : null, confirmed: confirmed, units: units, time: confirmed === 'none' || confirmed === 'unknown' || snack ? null : NF.fmtTime(NF.addMin(spec.at, -(spec.offset || 5))) },
    doseKey: NF.doseKey(S, meal), advice: advice, context: spec.context || null, points: pts(v, spec.at), importedAt: NF.addMin(spec.at, 130) };
  if (spec.manual) { e.points = []; e.importedAt = null; e.manual = { before: spec.manual.before, peak: spec.manual.peak != null ? spec.manual.peak : null, peakAt: spec.manual.peak != null ? NF.addMin(spec.at, 125) : null }; } /* opsané hodnoty místo importu */
  e.peak = NF.epPeak(S, e); e.rise = NF.epRise(S, e); e.at2h = NF.at2h(e.points);
  if (S.episodes.some(function (x) { return x.id === e.id; })) return e;
  if (advice.length) NF.log(S, 'rada.zobrazena', f.name, { level: NF.confidence(S, f.id).level, items: advice.map(function (a) { return { lever: a.lever, item: a.item }; }), bolus: e.bolusAtAdvice, portion: e.portionPlanned });
  S.episodes.push(e);
  NF.log(S, 'jidlo.zapsano', e.id + ' ' + f.id, { meal: meal, portion: e.portion, insulin: e.insulin, advice: advice, context: e.context });
  var saveClock = S.clock; S.clock = spec.at; NF.checkMilestones(S); S.clock = saveClock;
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

/* Rozhodne návrhy, které se rozhodují jednotlivě, podle větve postupu (v odbočce „nemám to doma“ ověření nesedí → výměna rady). */
D.decideSingles = function (S, B) {
  var r = S.review;
  r.proposals.forEach(function (pr) {
    if (r.decisions[pr.id] || !NF.proposalIsSingle(S, pr)) return;
    NF.verifyAll(S, pr.id);
    if (B.response === 'impractical' && pr.lever && (/^Vyměnit/.test(pr.title) || /-RADY$/.test(pr.id))) r.verify[pr.id][0] = false;
    var br = NF.screens.proposalBranch(S, pr), dec = { choice: br && (br.action === 'up' || br.action === 'down' || br.action === 'swap') ? 'agree' : 'keep', branch: br && br.action };
    if (pr.kind === 'dose' && dec.choice === 'agree') { r.newDoses[pr.dose].units += br.action === 'up' ? 2 : -2; dec.units = r.newDoses[pr.dose].units; }
    if (br && br.action === 'swap') dec.swapTo = NF.swapOptions(S, pr)[0] || null;
    NF.decideProposal(S, pr.id, dec);
  });
};

/* ---------- odbočky ---------- */
D.branches = {
  training: { label: 'Zaučení u sestry', from: 'training', options: [{ id: 'done', label: 'Zaučení proběhlo' }, { id: 'failed', label: 'Zaučení se nezdařilo — návyky nezačnou platit' }] },
  bolus: { label: 'Scéna „po píchnutí“: co si pacient chystá', from: 'afterBolus', options: [{ id: 'bigger', label: 'Větší porci → rada zpět k obvyklé' }, { id: 'smaller', label: 'Menší porci → žádná rada k množství, jen pokyn lékaře' }, { id: 'unknown', label: 'Neví, jestli si píchl → jako po píchnutí' }] },
  response: { label: 'Jak pacient s radami naložil (listopad–prosinec)', from: 'preview', options: [{ id: 'accepts', label: 'Většinou přijal' }, { id: 'declines', label: 'Většinou nepřijal — „nechci“, „nebyl čas“' }, { id: 'impractical', label: 'Většinou nepřijal — „nemám to doma“' }] }
};
D.defaults = { training: 'done', bolus: 'bigger', response: 'accepts' };

/* ---------- společný start ---------- */
function setup(S) {
  S.clock = '2026-10-05T09:00:00';
  S.registry = { items: reg(), history: [] };
  S.foods = foods();
  S.patient.hba1c = D.hba1c.slice();
}
function enrolled(S) { NF.ELIGIBILITY.forEach(function (c) { NF.setEligibility(S, c[0], true); }); }
D.cardDoses = { basal: 18, breakfast: 8, lunch: 10, dinner: 8 }; /* dávky z karty modelového pacienta; v aplikaci je zadává lékař voličem */
D.cardEligibility = ['adult', 'insulinOnly', 'regimen', 'cgm']; /* co karta pacienta dokládá; lékař přesto každou podmínku potvrdí */
function draftReady(S) {
  if (!S.draft) S.draft = NF.newDraft(S);
  var d = S.draft;
  Object.keys(D.cardDoses).forEach(function (k) { if (!d.doses[k].units) d.doses[k].units = D.cardDoses[k]; });
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
  { id: 'prolog', act: 0, title: 'Úvod — k čemu NutriFee je a jak ukázku ovládat', role: 'doctor', page: 'intro', wizardStep: 0, at: '2026-10-05T09:00:00' }, /* 12. 10. 2026: úvodní obrazovka v obsahu (demo/intro.js); karta pacienta začíná až scénou 2 */
  /* Scénář 1 — V ordinaci */
  { id: 'enroll', act: 1, title: 'Lékař — karta a podmínky zařazení', role: 'doctor', page: 'enroll', wizardStep: 0, at: '2026-10-05T09:00:00',
    setup: function (S) { S.draft = S.draft || NF.newDraft(S); }, apply: function (S) { enrolled(S); } },
  { id: 'doses', act: 1, title: 'Lékař — dávky, startovní návyky a pokyny', role: 'doctor', page: 'enroll', wizardStep: 1, at: '2026-10-05T09:10:00',
    setup: function (S) { draftReady(S); }, apply: function (S) { S.draft.medicationChecked = true; S.draft.instructionsChecked = true; } },
  { id: 'issue', act: 1, title: 'Lékař — vydání plánu', role: 'doctor', page: 'enroll', wizardStep: 2, at: '2026-10-05T09:20:00',
    apply: function (S) { issued(S); } },
  { id: 'training', act: 1, title: 'Sestra — zaučení s náhledem telefonu', role: 'nurse', page: 'training', at: '2026-10-05T09:35:00',
    apply: function (S, B) { trained(S, B); } },
  { id: 'handover', act: 1, title: 'Pacient — převzetí plánu a jedna otázka', role: 'patient', page: 'takeover', at: '2026-10-05T09:55:00',
    apply: function (S, B) { if (B.training !== 'failed') understood(S); } },

  /* Scénář 2 — Doma: aplikace se učí */
  { id: 'firstMeal', act: 2, title: 'Pacient — první snídaně ve třech krocích', role: 'patient', page: 'meal', at: '2026-10-06T07:00:00',
    setup: function (S) { freshMeal(S, 'breakfast'); },
    apply: function (S) { ep(S, { id: 'E1', food: 'Ovesná kaše s mlékem a banánem', at: '2026-10-06T07:05:00', bolus: 'before', manual: { before: 6.8 } }); basal(S, '2026-10-05'); basal(S, '2026-10-06'); S.meal = null; } },
  { id: 'firstResult', act: 2, title: 'Pacient — dvě hodiny po snídani: nejvyšší hodnota ze senzoru', role: 'patient', page: 'today', at: '2026-10-06T09:10:00',
    apply: function (S) { NF.setManualPeak(S, 'E1', 9.6); } },
  { id: 'week', act: 2, title: 'Pacient — po týdnu: co už aplikace ví', role: 'patient', page: 'foods', at: '2026-10-12T19:00:00',
    setup: function (S) {
      [['E2', 'Chléb se sýrem a zeleninou', '2026-10-07T07:05:00', 'as'], ['E3', 'Ovesná kaše s mlékem a banánem', '2026-10-08T07:10:00', 'unknown'], ['E4', 'Ovesná kaše s mlékem a banánem', '2026-10-09T07:00:00', 'as'], ['E5', 'Chléb se sýrem a zeleninou', '2026-10-10T07:05:00', 'as'], ['E6', 'Ovesná kaše s mlékem a banánem', '2026-10-11T07:00:00', 'as'], ['E7', 'Chléb se sýrem a zeleninou', '2026-10-12T07:05:00', 'as']]
        .forEach(function (x) { ep(S, { id: x[0], food: x[1], at: x[2], insulin: x[3] }); });
      [['E2b', 'Kuřecí maso na kari s rýží', '2026-10-07T12:30:00'], ['E3b', 'Svíčková na smetaně s knedlíkem', '2026-10-08T12:30:00'], ['E4b', 'Smažený řízek s bramborovou kaší', '2026-10-09T12:30:00'], ['E5b', 'Špagety boloňské', '2026-10-10T12:30:00'], ['E6b', 'Smažený řízek s bramborovou kaší', '2026-10-11T12:30:00'], ['E7b', 'Smažený řízek s bramborovou kaší', '2026-10-12T12:30:00']]
        .forEach(function (x) { ep(S, { id: x[0], food: x[1], meal: 'lunch', at: x[2] }); });
      ep(S, { id: 'E4s', food: 'Jablko', meal: 'snack', at: '2026-10-09T15:30:00' }); ep(S, { id: 'E6s', food: 'Jablko', meal: 'snack', at: '2026-10-11T15:40:00' });
      for (var d = 7; d <= 12; d++) basal(S, '2026-10-' + (d < 10 ? '0' + d : d));
      S.foodsSeg = 'known'; S.foodOpen = foodByName(S, 'Ovesná kaše s mlékem a banánem').id;
    } },

  { id: 'lateMeal', act: 2, title: 'Pacient — otevřel aplikaci až v 10:00', role: 'patient', page: 'today', at: '2026-10-13T10:15:00',
    setup: function (S) { basal(S, '2026-10-12'); },
    apply: function (S) { D.importDemoApply(S); ep(S, { id: 'E7c', food: 'Chléb se sýrem a zeleninou', at: '2026-10-13T07:30:00', bolus: 'retro', advice: [{ lever: 'walk', accepted: true }] }); S.meal = null; } },

  /* Scénář 3 — Rada před jídlem */
  { id: 'advice', act: 3, title: 'Pacient — před píchnutím: porce zpět k obvyklé a doplněk', role: 'patient', page: 'meal', at: '2026-10-14T07:00:00',
    setup: function (S) { freshMeal(S, 'breakfast', 'Ovesná kaše s mlékem a banánem', 'bigger', 'before'); },
    apply: function (S) { ep(S, { id: 'E8', food: 'Ovesná kaše s mlékem a banánem', at: '2026-10-14T07:05:00', portion: 'bigger', bolus: 'before', advice: [{ lever: 'portion', accepted: true }, { lever: 'addon', accepted: true }, { lever: 'order' }] }); basal(S, '2026-10-13'); basal(S, '2026-10-14'); S.meal = null; } },
  { id: 'afterBolus', act: 3, title: 'Pacient — po píchnutí: co aplikace smí a nesmí', role: 'patient', page: 'meal', at: '2026-10-16T07:30:00',
    setup: function (S, B) { freshMeal(S, 'breakfast', 'Ovesná kaše s mlékem a banánem', B.bolus === 'smaller' ? 'smaller' : 'bigger', B.bolus === 'unknown' ? 'unknown' : 'as'); },
    apply: function (S, B) { ep(S, { id: 'E9', food: 'Ovesná kaše s mlékem a banánem', at: '2026-10-16T07:30:00', portion: B.bolus === 'smaller' ? 'smaller' : 'bigger', bolus: B.bolus === 'unknown' ? 'unknown' : 'as', insulin: B.bolus === 'unknown' ? 'unknown' : 'as', advice: B.bolus === 'smaller' ? [{ lever: 'order', accepted: false, reason: 'nowant' }] : [{ lever: 'portion', accepted: true }, { lever: 'order', accepted: false, reason: 'nowant' }] }); basal(S, '2026-10-15'); basal(S, '2026-10-16'); S.meal = null; } },
  { id: 'custom', act: 3, title: 'Pacient — nové jídlo jen názvem', role: 'patient', page: 'meal', at: '2026-10-18T12:20:00',
    setup: function (S) { freshMeal(S, 'lunch', null, null, 'before'); S.meal.step = 2; S.meal.q = 'Řízek s kaší od maminky'; },
    apply: function (S) {
      var like = S.foods.filter(function (f) { return f.name === 'Smažený řízek s bramborovou kaší'; })[0];
      var r = NF.addFood(S, 'Řízek s kaší od maminky', { like: like ? like.id : null }, { force: true }); /* „Myslíte Smažený řízek…?“ → Ne, je jiné; „Je to jako…“ → Smažený řízek s bramborovou kaší */
      ep(S, { id: 'E10', food: r.food, meal: 'lunch', at: '2026-10-18T12:30:00', bolus: 'before', advice: [{ lever: 'order', accepted: true }] });
      basal(S, '2026-10-17'); basal(S, '2026-10-18'); S.meal = null;
    } },

  /* Scénář 4 — Nemoc */
  { id: 'illness', act: 4, title: 'Pacient — není mi dobře', role: 'patient', page: 'today', at: '2026-10-20T08:00:00',
    setup: function (S) { for (var d = 19; d <= 20; d++) basal(S, '2026-10-' + d); NF.settleFeedback(S); },
    apply: function (S) { NF.setIllness(S, true); ep(S, { id: 'E11', food: 'Chléb se sýrem a zeleninou', at: '2026-10-20T08:30:00', context: 'illness', advice: [{ lever: 'addon', accepted: true }] }); } },
  { id: 'illnessMeal', act: 4, title: 'Pacient — jídlo během nemoci', role: 'patient', page: 'meal', at: '2026-10-21T08:00:00',
    setup: function (S) { freshMeal(S, 'breakfast', 'Ovesná kaše s mlékem a banánem', 'smaller', 'as'); },
    apply: function (S) { ep(S, { id: 'E12', food: 'Ovesná kaše s mlékem a banánem', at: '2026-10-21T08:05:00', portion: 'smaller', context: 'illness', advice: [{ lever: 'addon' }] }); basal(S, '2026-10-21'); S.meal = null; } },
  { id: 'recovery', act: 4, title: 'Pacient — už je mi lépe', role: 'patient', page: 'today', at: '2026-10-22T07:30:00',
    setup: function (S) { NF.settleFeedback(S); },
    apply: function (S) { NF.illnessCheckin(S, true); basal(S, '2026-10-22'); } },

  /* Scénář 5 — Během studie: garant upraví pravidlo (funkce ostré aplikace; chronologicky uprostřed období, proto před kontrolou) */
  { id: 'registry', act: 5, title: 'Během studie — garant upraví pravidlo po podnětu', role: 'doctor', page: 'registry', at: '2026-10-23T09:00:00',
    setup: function (S) { S.reg = { open: 'R-PORADI', q: '' }; S.impulse = 'Při testu pacient pochopil radu „snězte nejdřív jogurt“ tak, že jogurt nahradí část kaše, a kaši nedojedl — snědl méně sacharidů, než má.'; },
    apply: function (S) {
      S.role = 'doctor';
      var it = NF.item(S, 'R-PORADI'); it.text = 'Snězte nejdřív {first}, potom zbytek obvyklého jídla. Přílohu nevynechávejte — množství sacharidů má zůstat stejné.'; it.version = 'v2';
      NF.decideItem(S, 'R-PORADI', 'edited', 'Upřesněn text: příloha se nevynechává.');
      S.reg = null;
    } },
  { id: 'impact', act: 5, title: 'Pacient — rada s novým textem', role: 'patient', page: 'meal', at: '2026-10-24T12:20:00',
    setup: function (S) { freshMeal(S, 'lunch', 'Smažený řízek s bramborovou kaší', 'usual', 'before'); basal(S, '2026-10-23'); },
    apply: function (S) { ep(S, { id: 'E13', food: 'Smažený řízek s bramborovou kaší', meal: 'lunch', at: '2026-10-24T12:30:00', bolus: 'before', advice: [{ lever: 'order', accepted: true }] }); S.meal = null; } },

  /* Scénář 6 — Kontrola */
  { id: 'preview', act: 6, title: 'Pacient — den před kontrolou', role: 'patient', page: 'preview', at: '2027-01-04T18:00:00',
    setup: function (S, B) { series(S, B); if (!S.questions.length) S.questions.push({ id: 'Q1', at: '2027-01-04T18:10:00', text: 'Je v pořádku, že si ke kaši dávám jogurt skoro pokaždé?', suggested: true }); } },
  { id: 'reviewSummary', act: 6, title: 'Lékař — kontrola, krok 1: souhrn', role: 'doctor', page: 'review', at: '2027-01-05T09:00:00',
    apply: function (S) { S.role = 'doctor'; NF.startReview(S, D.habitCatalog); } },
  { id: 'reviewProposals', act: 6, title: 'Lékař — krok 2: návrhy s důvodem a postupem', role: 'doctor', page: 'review', at: '2027-01-05T09:10:00',
    setup: function (S) { if (S.review) S.review.step = 2; },
    apply: function (S, B) {
      S.role = 'doctor';
      D.decideSingles(S, B);
      NF.keepAll(S);
      D.decideSingles(S, B); /* po změně dávky se pokyny potvrzují zvlášť (6. 10. 2026) */
    } },
  { id: 'reviewConfirm', act: 6, title: 'Lékař — krok 3: potvrzení a vydání plánu P2', role: 'doctor', page: 'review', at: '2027-01-05T09:25:00',
    setup: function (S) { if (S.review) S.review.step = 3; },
    apply: function (S) { S.role = 'doctor'; NF.issueFromReview(S, D.habitCatalog); } },
  { id: 'reviewHandover', act: 6, title: 'Lékař — krok 4: předání pacientovi', role: 'doctor', page: 'review', at: '2027-01-05T09:35:00',
    setup: function (S) { if (S.review) S.review.step = 4; } },
  { id: 'newplan', act: 6, title: 'Pacient — nový plán a co se změnilo', role: 'patient', page: 'newplan', at: '2027-01-05T09:40:00',
    apply: function (S) { S.role = 'patient'; NF.confirmUnderstanding(S); } },
  { id: 'trace', act: 6, title: 'Lékař — verze a stopa: důkaz, jak to počítá', role: 'doctor', page: 'trace', at: '2027-01-05T09:50:00' }
];
D.acts = [
  { title: 'Úvod', note: 'K čemu NutriFee je a jak ukázku ovládat.' },
  { title: 'Scénář 1 — V ordinaci', note: 'Karta, podmínky, dávky voličem, startovní sada návyků, osobní pokyny. Sestra zaučí s náhledem telefonu.' },
  { title: 'Scénář 2 — Doma: aplikace se učí', note: 'Tři kroky před jídlem s inzulinem první. Po týdnu první známá jídla s rozmezím a reakcí.' },
  { title: 'Scénář 3 — Rada před jídlem', note: 'Před píchnutím porce zpět k obvyklé; po píchnutí jen z větší; nové jídlo jen názvem.' },
  { title: 'Scénář 4 — Nemoc', note: 'Pacient označí nemoc, aplikace pomáhá dál, ale jinak. Ukončuje pacient.' },
  { title: 'Scénář 5 — Během studie: garant upraví pravidlo', note: 'Funkce ostré aplikace, ne vaše dnešní schvalování: během studie jako garant (a lékař studie) upravíte text rady po podnětu z provozu; změna platí okamžitě, bez čekání na kontrolu.' },
  { title: 'Scénář 6 — Kontrola', note: 'Pacient: report před kontrolou. Lékař: souhrn → návrhy → potvrzení → předání. Stopa.' }
];
D.chapters = CH;

D.play = function (index, branches) {
  var idx = Math.max(0, Math.min(CH.length - 1, Number(index) || 0));
  var B = {}; Object.keys(D.defaults).forEach(function (k) { B[k] = D.defaults[k]; });
  if (branches) Object.keys(branches).forEach(function (k) { if (branches[k]) B[k] = branches[k]; });
  var S = NF.createState(); NF.resetUid(); S.branches = B; setup(S);
  if (D.beforePlay) D.beforePlay(S); /* rozhodnutí garanta platí dřív, než kapitoly spočítají report a návrhy */
  var stop = B.training === 'failed' ? Math.min(idx, D.indexOf('handover')) : idx; /* bez zaučení příběh končí u převzetí; scéna sestry se ale přehraje jako sestra (7. 10. 2026) */
  var ch = CH[stop];
  NF.muteHooks(function () { /* rozhodnutí odehraná příběhem nejsou rozhodnutí garanta (neukládají se) */
    for (var i = 0; i < stop; i++) { S.clock = CH[i].at; if (CH[i].setup) CH[i].setup(S, B); if (CH[i].apply) CH[i].apply(S, B); }
    S.clock = ch.at; if (ch.setup) ch.setup(S, B);
  });
  S.role = ch.role; S.page = ch.page; S.wizardStep = ch.wizardStep != null ? ch.wizardStep : 0;
  S.chapter = ch.id; S.chapterIndex = stop; S.error = '';
  NF.log(S, 'prezentace.kapitola', ch.id + ' · ' + JSON.stringify(B));
  return S;
};
D.indexOf = function (id) { for (var i = 0; i < CH.length; i++) if (CH[i].id === id) return i; return -1; };

/* ---------- scény: lineární řada pro tlačítko Další, odbočky vložené mezi hlavní linii ----------
   Lékař-garant nemusí nic volit: Další projde všechny kapitoly i všechny varianty odboček. */
/* R25 (6. 10. 2026): hlavní linie = prolog → … → finále (stopa a shrnutí); odbočky jsou v dodatku za finále.
   Případy „menší porce“ a „nevím“ po píchnutí jsou kroky scény „po píchnutí“, ne samostatné scény. */
function scene(id, B, title, appendix) { return { ch: D.indexOf(id), B: B || {}, title: title || null, detour: !!B, appendix: !!appendix }; }
D.scenes = [
  scene('prolog'), scene('enroll'), scene('doses'), scene('issue'), scene('training'), scene('handover'),
  scene('firstMeal'), scene('firstResult'), scene('week'), scene('lateMeal'), scene('advice'), scene('afterBolus'),
  scene('custom'), scene('illness'), scene('illnessMeal'), scene('recovery'), scene('registry'), scene('impact'),
  scene('preview'), scene('reviewSummary'), scene('reviewProposals'), scene('reviewConfirm'), scene('reviewHandover'), scene('newplan'),
  scene('trace'),
  scene('training', { training: 'failed' }, 'Dodatek · zaučení se nezdařilo', true),
  scene('handover', { training: 'failed' }, 'Dodatek · bez zaučení plán nezačne platit', true),
  scene('reviewProposals', { response: 'declines' }, 'Dodatek · pacient rady většinou nepřijal: jiné návrhy', true),
  scene('reviewProposals', { response: 'impractical' }, 'Dodatek · „nemám to doma“: výměna rady', true),
  scene('newplan', { response: 'impractical' }, 'Dodatek · „nemám to doma“: co uvidí pacient', true)
];
D.mainSceneCount = function () { return D.scenes.filter(function (s) { return !s.appendix; }).length; };
D.playScene = function (i) {
  var idx = Math.max(0, Math.min(D.scenes.length - 1, Number(i) || 0)), sc = D.scenes[idx];
  var S = D.play(sc.ch, sc.B);
  S.sceneIndex = idx; S.sceneTitle = sc.title || CH[sc.ch].title;
  return S;
};
/* Nejbližší scéna ke kapitole a větvím (pro skoky z panelu prezentujícího). */
D.sceneFor = function (chapterIndex, B) {
  B = B || D.defaults;
  var exact = -1, first = -1;
  D.scenes.forEach(function (sc, i) {
    if (sc.ch !== chapterIndex) return;
    if (first < 0) first = i;
    var all = Object.keys(sc.B).every(function (k) { return B[k] === sc.B[k]; }) && Object.keys(D.branches).every(function (k) { return sc.B[k] ? true : B[k] === D.defaults[k]; });
    if (all && exact < 0) exact = i;
  });
  return exact >= 0 ? exact : first >= 0 ? first : 0;
};

/* Otázky pro garanta podle scénáře (panel prezentujícího). */
D.garantQuestions = [
  [], /* úvod */
  ['Stačí čtyři podmínky zařazení?', 'Je startovní sada návyků správná pro všechny?', 'Jsou připravené věty pokynů úplné?', 'Stačí hrubá denní doba (10:00 / 15:30 / 21:00) k rozlišení, že jídlo už minulo?'],
  ['Je vrchol 0–120 min správná míra reakce?', 'Stačí dvě opsané hodnoty ze senzoru (teď a nejvyšší do 2 h) místo napojení na senzor?', 'Stačí 3 shodné zápisy pro „známé jídlo“ a otázka při rozchodu?', 'Je správně, že pochvala je jen za snahu a návyk, nikdy za hodnotu glukózy?', 'Jsou milníky (jídlo poznáno, rada = návyk, týden bez mezery) ty správné?'],
  ['Je pravidlo „z větší porce zpět k obvyklé i po píchnutí“ bezpečné?', 'Stačí podobnost určená pacientem („podobá se jídlu X“) bez složení?'],
  ['Má aplikace při nemoci radit doplněk a pořadí?'],
  ['Kdo smí pravidla měnit mezi kontrolami a jak rychle to pacient uvidí?'],
  ['Jsou prahy návrhů k dávce (okno ≥ 28 dní, ≥ 8 čistých jídel, 2/3 nad cílem, medián > cíl + 0,5) správné?', 'Je postup posouzení D-POSTUP úplný?']
];

})(typeof window !== 'undefined' ? window : globalThis);
