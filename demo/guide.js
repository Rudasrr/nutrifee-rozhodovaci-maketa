/* Průvodce položkami registru pro lékaře-garanta (7. 10. 2026). Součást prezentační vrstvy.
   Každá položka má pět oddílů ve stejném pořadí: proč existuje · jak funguje · kde je použita · co schvalujete · co se stane při zamítnutí.
   Texty jsou podklad k rozhodnutí; čísla a prahy v nich jsou tytéž, které čte kód (parametry položky). Žádná skutečná jména. */
(function (global) {
'use strict';
var D = global.NutriFeeDemo = global.NutriFeeDemo || {};

D.guide = {
  'K-KRITERIA': {
    proc: 'Celá aplikace stojí na jednom předpokladu: pacient má pevné dávky inzulinu ke třem hlavním jídlům a bazál večer. Jen tak dává smysl učit se, jak jeho tělo reaguje na stejné jídlo, a radit mu, aby jedl ke své dávce pokaždé podobně.',
    jak: 'Lékař při zařazení potvrdí čtyři podmínky: dospělý s diabetem 2. typu · léčba jen inzulinem bez tablet na diabetes · bazál 1× večer a prandiální inzulin ke třem jídlům v pevných dávkách · senzor glukózy. Karta pacienta ukazuje, co z toho dokládá („z karty: splněno“), potvrzení je přesto lékařovo. Dokud některá podmínka chybí, nelze pokračovat.',
    kde: 'Zařazení a plán, krok 1 (lékař). Zelený štítek u potvrzených podmínek odkazuje na tuto položku.',
    co: 'Že tyto čtyři podmínky jsou správné a úplné pro první studii. Vylučovací kritéria (těhotenství, těžké ledvinové nebo jaterní onemocnění, opakované těžké hypoglykemie, zrak, kognice) položka zatím neobsahuje — doplní je garant.',
    dopad: 'Při zamítnutí aplikace podmínky nekontroluje a zařazení projde bez nich. Pacient s tabletami nebo flexibilním dávkováním by pak dostával rady, které u něj neplatí.'
  },
  'C-CILE': {
    proc: 'Všechno hodnocení v aplikaci („v cíli / nad cílem“, semafor, návrhy k dávce) potřebuje cílové hodnoty glukózy. Musí být na jednom místě, viditelné a měnitelné, ne roztroušené v kódu.',
    jak: 'Výchozí cíle pro každého pacienta: dolní cíl 3,9 mmol/l, horní cíl po jídle 10,0, ráno nalačno do 7,2, čas v cíli alespoň 70 %. Lékař je u konkrétního pacienta upraví voličem při zařazení i na kontrole; garant tady mění výchozí hodnoty pro všechny.',
    kde: 'Zařazení (cíle glukózy u pokynů), kontrola (úprava cílů), karty jídel pacienta (hranice cíle na stupnici), report (semafor a návrhy).',
    co: 'Čtyři výchozí čísla a to, že lékař je smí u pacienta měnit. Vycházejí z běžných konsenzuálních cílů; jsou to návrh autora makety, ne klinická pravda.',
    dopad: 'Při zamítnutí aplikace použije záložní hodnoty zapsané v kódu (tytéž, 3,9 / 10,0 / 7,2 / 70 %) a štítek „schváleno“ u cílů zmizí. Hodnocení nepřestane fungovat, jen přestane být kryté registrem.'
  },
  'R-NAVYKY': {
    proc: 'Studie potřebuje srovnatelný start: každý pacient začíná se stejnou sadou návyků. Personalizace přichází až z dat na první kontrole, ne z dojmu při zařazení.',
    jak: 'Startovní sada je předvyplněná: zapisovat hlavní jídla · držet obvyklou porci ke každé dávce · potvrzovat inzulin k jídlu · bazál každý večer ve stejný čas. Lékař může položku škrtnout nebo přidat další z katalogu (snídaně ve stejném čase, procházka po večeři). Návyky začnou platit až po zaučení u sestry a jedné kontrolní otázce.',
    kde: 'Zařazení, krok 2 (lékař); návyky dne na obrazovce Dnes (pacient); návrhy „zachovat / vyměnit radu“ na kontrole.',
    co: 'Složení startovní sady a pravidlo, že je pro všechny stejná.',
    dopad: 'Při zamítnutí nebude při zařazení nic předvybráno a lékař skládá plán od nuly; pacientovy návyky na Dnes zmizí.'
  },
  'R-REAKCE': {
    proc: 'Pacient potřebuje vidět, kam se po jeho jídle glukóza dostane — z jeho vlastních dat, ne z tabulek. Bez poctivé definice „co se počítá“ by učení stálo na špatných zápisech.',
    jak: 'Míra reakce je nejvyšší hodnota glukózy 0–120 minut po jídle (okno vrcholu). Jídlo je „známé“ od 3 započítaných zápisů. Započítaný zápis má úplná data ze senzoru, inzulin potvrzený podle plánu a včas, je mimo nemoc, s obvyklou porcí, při stejné dávce a bez svačiny do 2 hodin. Rozmezí vrcholů: do 8 zápisů nejnižší–nejvyšší hodnota, od 8 zápisů 10.–90. percentil. Popisuje minulost, nepředpovídá.',
    kde: 'Karty jídel (stupnice s rozmezím), krok 3 před jídlem, report lékaře (tabulka jídel).',
    co: 'Okno 120 minut, práh 3 zápisů pro „známé“ a způsob výpočtu rozmezí.',
    dopad: 'Při zamítnutí aplikace reakci na jídlo nevyhodnocuje vůbec: karty jídel neukážou rozmezí ani stupeň a před jídlem se neradí.'
  },
  'R-PODOBNOST': {
    proc: 'U jídla, které pacient nikdy nejedl, by číslo vypadalo jako předpověď bez opory. Druhá úroveň jistoty říká jen směr: „podobá se jídlům, po kterých…“.',
    jak: 'Neznámé jídlo se přirovná ke známým jídlům se stejnou přílohou a přípravou (ze štítků, nikdy z názvu). Ukáže se široké rozmezí z jejich zápisů a štítek „Podobné jídlo“, bez čísla „přesně“. S vlastními zápisy se jídlo stane známým a odhad z podobných zmizí.',
    kde: 'Karty jídel a krok 3 před jídlem u jídel se štítkem „Podobné jídlo“ (např. vlastní jídlo „Řízek s kaší od maminky“).',
    co: 'Že podobnost se smí odvozovat ze štítků příloha + příprava a že se u ní neukazuje přesné číslo.',
    dopad: 'Při zamítnutí je každé nové jídlo „Neznámé“ bez odhadu, dokud ho pacient 3× nezapíše.'
  },
  'R-SKORE': {
    proc: 'Pacient má vědět, jak často po jídle zůstane v cíli — relativně ke svým vlastním jídlům, ne jako známku „dobré / špatné jídlo“.',
    jak: 'Stupeň reakce = podíl započítaných zápisů s vrcholem pod horním cílem: mírná ≥ 80 %, střední ≥ 50 %, častěji nad cílem < 50 %. Barevný stupeň se ukáže až od 6 započítaných zápisů; do té doby pacient vidí jen „X z N v cíli“. Stupeň se mění s hysterezí: jen když by platil i s jedním zápisem jinak.',
    kde: 'Karty jídel (štítek), krok 3 před jídlem, report lékaře (sloupec Reakce).',
    co: 'Prahy 80 % a 50 %, minimum 6 zápisů pro barevný stupeň a slova „mírná / střední / častěji nad cílem“.',
    dopad: 'Při zamítnutí stupeň zmizí z karet i reportu; pacient vidí jen rozmezí a „X z N v cíli“. Rady před jídlem se dál řídí podílem v cíli.'
  },
  'R-PORCE': {
    proc: 'Pevná dávka je nastavená na obvyklé množství jídla. Jiná porce při stejné dávce vede k vysoké nebo nízké glukóze — a zároveň znehodnotí učení i návrhy k dávce.',
    jak: 'Před píchnutím radí oběma směry zpět k obvyklé porci (větší i menší). Po píchnutí a při „nevím, jestli byl inzulin píchnutý“ jen z větší porce zpět k obvyklé; u menší porce aplikace neradí a ukáže pokyn lékaře „méně jídla než obvykle“. Nikdy neřekne „snězte víc“. Texty rady jsou součástí položky.',
    kde: 'Krok 3 před jídlem (pacient) — karta „Obvyklá porce“ nebo hláška „teď neradíme“ s pokynem lékaře.',
    co: 'Směry rady podle stavu inzulinu, zákaz „snězte víc“ a přesná znění čtyř vět pro pacienta.',
    dopad: 'Při zamítnutí aplikace k porci neradí vůbec, ani před píchnutím. Pacient s větší porcí nedostane nic.'
  },
  'R-DOPLNEK': {
    proc: 'Bílkovina nebo tuk přidané k jídlu zpomalí vzestup glukózy, aniž by se měnilo množství sacharidů, na které je dávka. Je to levnější páka než inzulin.',
    jak: 'Rada „Přidejte k jídlu {doplněk}. Z jídla nic neubírejte.“ Doplněk je u každého jídla v seznamu (jogurt, sýr, vejce, ořechy, zelenina). Nabízí se jen před píchnutím a mimo nemoc; po 3 pokusech bez účinku u téhož jídla se už nenabízí. U jídla, ke kterému není co přidat, se rada neukáže.',
    kde: 'Krok 3 před jídlem (pacient); report lékaře (přijato / odmítnuto, srovnání s radou a bez ní); návrhy „zachovat / vyměnit radu“.',
    co: 'Že doplněk jen přidává a nic nenahrazuje, kdy se smí nabízet (jen před píchnutím, mimo nemoc) a po kolika neúspěších se stáhne. Texty doplňků u jednotlivých jídel jsou součástí schválení.',
    dopad: 'Při zamítnutí rada zmizí před jídlem i z návrhů na kontrole. Pacient, který ji dřív přijímal, dostane jednou neutrální větu (R-ZMIZELA).'
  },
  'R-PORADI': {
    proc: 'Pořadí soust mění křivku glukózy bez změny množství: zelenina a bílkovina před přílohou zpomalí vzestup.',
    jak: 'Rada „Snězte nejdřív {co}, potom zbytek jídla.“ „Co“ je u každého jídla v seznamu zelenina, maso nebo sýr — nikdy příloha nebo sladké. Nabízí se před píchnutím i po něm, ne při nemoci.',
    kde: 'Krok 3 před jídlem (pacient); report lékaře; návrhy „zachovat / vyměnit radu“.',
    co: 'Znění rady a to, co se u jídel dosazuje za „nejdřív“. Při zkoušce pacient větu „snězte nejdřív jogurt“ pochopil jako „jogurt místo kaše“ — proto garant text upravil na „potom zbytek jídla“.',
    dopad: 'Při zamítnutí rada zmizí před jídlem i z návrhů; dřív přijímaná rada dostane neutrální větu.'
  },
  'R-PROCHAZKA': {
    proc: 'Krátký pohyb po jídle zmírní vzestup glukózy. Po jídle, které už je snědené, je to jediná rada, která ještě dává smysl.',
    jak: 'Rada „Po jídle se asi 15 minut svižně projděte.“ Před jídlem se nabízí jako jedna z rad; po zpětném zápisu podle času od jídla: do hodiny zmírní vzestup, do 3 hodin sníží zvýšenou glukózu, poté se nenabízí. Při nemoci se nenabízí. Délka procházky je parametr.',
    kde: 'Krok 3 před jídlem, zpětný zápis („Co pomůže teď“), návyk „Procházka po večeři“ v plánu, report lékaře.',
    co: 'Znění rady, délku 15 minut a okno 3 hodin po jídle. Rada neříká „změřte se před procházkou“ — doplnění je na garantovi.',
    dopad: 'Při zamítnutí rada zmizí před jídlem, po zpětném zápisu i z návrhů na kontrole; návyk „Procházka po večeři“ nelze přidat.'
  },
  'D-CISTA': {
    proc: 'Návrh k dávce smí stát jen na zápisech, u kterých je příčina vysoké nebo nízké glukózy opravdu dávka — ne porce, chybějící inzulin, svačina nebo nemoc. Přesně to lékař při posuzování dávky vylučuje ručně.',
    jak: 'Čistý zápis pro návrh k dávce: obvyklá porce · inzulin potvrzen podle plánu a včas (nejvýš 30 min před jídlem, 15 min po něm) · mimo nemoc · úplná data ze senzoru · bez svačiny do 120 min po jídle. Navíc nevstupuje zpětný zápis s odhadnutým časem, podání až po jídle ani dodatečně opravený inzulin (ty jdou jen do učení jídla). Inzulin lze opravit do 60 minut po zápisu.',
    kde: 'Report lékaře (návrhy k dávce, „Co návrh oslabuje“ se seznamem vyřazených zápisů), karty jídel (co se počítá), Dnes (karta „Zapsáno · Opravit inzulin“).',
    co: 'Tolerance 30/15 minut, okno svačiny 120 minut, 60 minut na opravu inzulinu a pravidlo, že zpětný a pozdní zápis jdou jen do učení.',
    dopad: 'Při zamítnutí aplikace nerozlišuje čisté a nečisté zápisy: do návrhů k dávce by vstupovaly i jídla s jinou porcí nebo bez inzulinu.'
  },
  'D-PRAND': {
    proc: 'Lékař na kontrole potřebuje vědět, u kterého jídla dne data naznačují, že dávka nesedí — s čísly, ne s pocitem. Aplikace přitom nesmí navrhnout směr ani výši.',
    jak: 'Jednotka je jídlo dne (snídaně / oběd / večeře) s rozpadem po jídlech. Okno od poslední změny dávky, nejméně 28 dní. „Nad cílem“: nejméně 8 čistých jídel, aspoň 2/3 s vrcholem nad horním cílem a medián vrcholu víc než 0,5 mmol/l nad cílem — a to až poté, co pacient aspoň 3× přijal radu k jídlu (rady jdou první; při převaze odmítnutí se navrhne nejdřív rada). „Pod cílem“: nejméně 2 poklesy pod dolní cíl do 4 h po jídle a zároveň aspoň 15 % jídel (z nejméně 6), nebo jediný pokles pod 3,0; nízké hodnoty se berou ze všech zápisů. Karta vždy ukazuje čas v cíli, podíl pod cílem a HbA1c. Nízké hodnoty mají přednost před vysokými.',
    kde: 'Kontrola, krok 2 (návrhové karty „Posoudit prandiální dávku“ a „Nejdřív rady“).',
    co: 'Všechny prahy (28 dní, 8 jídel, 2/3, +0,5 mmol/l, 3 přijaté rady, 2 poklesy / 15 % / 6 jídel, pokles pod 3,0) a pravidlo „rady první“. Prahy jsou návrh autora makety podle běžných titračních postupů.',
    dopad: 'Při zamítnutí aplikace návrhy k prandiální dávce nevytváří; lékař posuzuje dávku jen z tabulky jídel.'
  },
  'D-BAZAL': {
    proc: 'Ranní glukóza je zrcadlo bazálu. Noční pokles je nejdůležitější bezpečnostní signál a musí mít přednost před vším ostatním.',
    jak: 'Z nejméně 10 nocí za 14 dní: medián ranních hodnot nad cílem nalačno a žádná noc pod dolním cílem → návrh „posoudit bazál — ranní hodnoty nad cílem“. Nejméně 2 noci pod 3,9 nebo 1 noc pod 3,0 → návrh „pod cílem“ s předností; u jediného bodu pod 3,0 karta upozorní, že může jít o artefakt senzoru (tlak na senzor ve spánku).',
    kde: 'Kontrola, krok 2 (návrhová karta „Posoudit bazální dávku“). V modelovém příběhu se návrh bazálu nevytvoří — noci jsou v cíli.',
    co: 'Prahy 10 nocí, 14 dní, 2 noci pod 3,9, 1 noc pod 3,0 a přednost nízkých hodnot.',
    dopad: 'Při zamítnutí aplikace bazál neposuzuje; lékař má jen řádek „bazál potvrzen X z N dnů“.'
  },
  'D-POSTUP': {
    proc: 'Aplikace nesmí říct „zvyšte“. Když ale lékař-garant schválí svůj vlastní postup posouzení (co ověřit a co z toho plyne), aplikace ho jen aplikuje na data a ukáže větev. Věta „zvýšit“ je pak lékařova, ne aplikace.',
    jak: 'Pět postupů: bazál pod cílem, bazál nad cílem, prandiální pod cílem, prandiální nad cílem, „nejdřív rady“. Každý má ověřovací body (tvrzení, u kterých lékař označí sedí / nesedí) a větve: „vše sedí → zvýšit / snížit“, „bod N nesedí → ponechat, řešit …“. Pro bod bez větve aplikace větev nevymýšlí a řekne „rozhodněte sami“. Rozhodnutí proti směru větve se zapíše jako „rozhodnuto jinak než postup“. Postup nikdy neobsahuje velikost kroku v jednotkách — tu volí lékař voličem.',
    kde: 'Kontrola, krok 2 (box „Váš schválený postup říká“ u každé návrhové karty).',
    co: 'Znění ověřovacích bodů a větví všech pěti postupů. Jednotlivou větev můžete v registru vyřadit („Upravit větve“); vyřazená větev se na kartě neukáže.',
    dopad: 'Při zamítnutí celé položky návrhové karty nemají větve: lékař vidí důvod a ověření, ale postup mu neřekne nic a rozhoduje sám.'
  },
  'R-POKYNY': {
    proc: 'Co dělat při nízké glukóze, při menší porci po píchnutí, při nemoci nebo při nejistotě s inzulinem, nesmí říkat aplikace. Říká to lékař — připravenou větou, do které dosadí hodnotu.',
    jak: 'Katalog vět: nízká glukóza (práh 3,9) · nevím, jestli byl inzulin píchnutý (změřit za 60 min, znovu nepíchat) · méně jídla než obvykle (změřit za 60 min) · nemoc (měřit každé 3 h, inzulin nevysazovat) · vysoká glukóza (nad 15 déle než 3 h volat) · kdy a kam volat. Lékař při zařazení pokyny zapne a hodnoty nastaví voličem; na kontrole je může upravit. Pacient je má v Bezpečí, při nemoci nahoře na Dnes a přímo v kartách, kde aplikace neradí.',
    kde: 'Zařazení (krok 2), Bezpečí (pacient), Dnes při nemoci, krok 1 a 3 před jídlem (pod „Nevím“ a u menší porce), kontrola (návrh „Osobní pokyny stále platí?“).',
    co: 'Znění vět a výchozí hodnoty. Věty jsou návrh autora makety; garant je může přepsat v registru.',
    dopad: 'Při zamítnutí pacient nemá v Bezpečí žádné pokyny a aplikace v situacích, kdy neradí, nemá na co odkázat.'
  },
  'Z-BODY': {
    proc: 'Zaučení bez pohledu na to, co pacient skutečně umí, je jen odškrtávání. Body zaučení se skládají z návyků v plánu, protože s návykem souvisí to, co má pacient umět.',
    jak: 'Tři pevné body (našel Dnes, našel Bezpečí, ví kam volat) a body podle návyků plánu (zapsal zkušební jídlo, ví o radě k porci, ví o otázce na inzulin, našel připomínku bazálu). Sestra zaškrtává, co pacient udělal sám; „Ukázat“ přepne náhled telefonu na příslušnou obrazovku. Dokončit lze až po všech bodech; „nezdařilo se“ s důvodem vidí lékař v zařazení a na kontrole.',
    kde: 'Zaučení (sestra); stav zaučení v zařazení a v podkladech kontroly (lékař).',
    co: 'Seznam bodů a pravidlo, že návyky začnou platit až po dokončeném zaučení a jedné kontrolní otázce.',
    dopad: 'Při zamítnutí má sestra jen tři pevné body; body podle návyků se neskládají.'
  },
  'J-DATABAZE': {
    proc: 'Pacient vybírá jídlo jménem, ne složením. Bez seznamu běžných jídel by musel všechno zakládat ručně.',
    jak: 'Asi 200 běžných českých jídel a hotovek, každé se třemi hrubými štítky, textem doplňku a „co sníst nejdřív“. Hledání od začátku slova, „naposledy“, vlastní jídlo jen názvem a třemi štítky. V maketě je seznam syntetický; skutečný zdroj a licence se vyberou pro studii.',
    kde: 'Krok 2 před jídlem (výběr jídla), Jídla (karty).',
    co: 'Že seznam tohoto typu a rozsahu je pro studii vhodný a že texty doplňku a pořadí u jídel jsou součástí schválení rad.',
    dopad: 'Při zamítnutí pacient nemá nabídku jídel a každé jídlo zakládá sám.'
  },
  'J-STITKY': {
    proc: 'Pacient hotová a domácí jídla nezná složením, ale jménem a rutinou. Přesné složení aplikace nepotřebuje — učí se z opakování. Makra by navíc sváděla k počítání sacharidů k inzulinu.',
    jak: 'Tři hrubé štítky: příloha (6 možností) · příprava (3) · velikost (3). U jídel ze seznamu jsou předvyplněné, u vlastního jídla pacient klepne třikrát. Štítky slouží jen k „podobné jídlo“, ne k výpočtům.',
    kde: 'Vlastní jídlo (krok 2 před jídlem), podobnost na kartách jídel.',
    co: 'Sadu štítků a to, že aplikace nepracuje s gramy ani makry.',
    dopad: 'Při zamítnutí nelze založit vlastní jídlo a podobnost se nepočítá.'
  },
  'S-SOUHRN': {
    proc: 'Lékař potřebuje jednu větu „co se dělo“ hned nahoře reportu — ze šablony podle pravidel, ne z generativní AI. A srovnání „s radou vs. bez rady“ nesmí tvrdit víc, než data unesou.',
    jak: 'Věta se skládá z podílu obvyklé porce, potvrzení inzulinu, přijatých rad a času v cíli. Srovnání mediánu vrcholu s radou a bez ní se počítá per rada a říká se jen od 8 zápisů s radou a 8 bez ní u téže rady a při rozdílu nejméně 1,0 mmol/l; jinak „zatím nelze říct“. Pacient si volí, kdy radu přijme, takže srovnání není důkaz účinku — proto neutrální „s radou bývalo níž“ bez fajfky.',
    kde: 'Kontrola, krok 1 (věta „Co se dělo“, dlaždice „S radou bývalo níž?“); návrhy „zachovat radu“ v kroku 2; report před kontrolou u pacienta (přehled).',
    co: 'Prahy 8 + 8 zápisů a 1,0 mmol/l a neutrální znění.',
    dopad: 'Při zamítnutí report větu neukáže a dlaždice srovnání rad zmizí.'
  },
  'S-VYSLEDEK': {
    proc: 'Pacient má vidět, jak dopadlo to, co udělal, ve chvíli, kdy je to známé. Jinak se smyčka učení neuzavře. Hodnota ale není jeho zásluha ani vina, proto se říká věcně a díky patří činu.',
    jak: 'Po příchodu dat ze senzoru jedna karta na Dnes: „nejvyšší hodnota X, v cíli / nad cílem“ a poděkování podle činu. U zápisu, který se do učení nepočítá (jiná porce, nepotvrzený inzulin, nemoc), karta neukáže číslo ani verdikt — jen důvod a u menší porce pokyn lékaře. Věta „bez toho u vás bývá …“ až od 4 zápisů s radou a 4 bez ní.',
    kde: 'Dnes (pacient) po každém jídle s daty.',
    co: 'Přesná znění všech variant karty (jsou vypsaná v registru) a pravidlo „u nezapočítaného zápisu bez čísla“.',
    dopad: 'Při zamítnutí karta „Jak to dopadlo“ z Dnes zmizí; pacient vidí výsledky jen na kartách jídel.'
  },
  'R-DIKY': {
    proc: 'Pochvala za číslo by učila honit čísla a jíst méně, „abych byl v cíli“. Poděkování patří tomu, co pacient udělal.',
    jak: 'Po uložení jídla jedna věta podle činu: přijal radu · vrátil se z větší porce k obvyklé · doplnil zpětně · obyčejný zápis. Nikdy podle hodnoty glukózy. Znění jsou součástí položky.',
    kde: 'Hláška po uložení jídla (pacient).',
    co: 'Čtyři věty a zásadu „za čin, ne za hodnotu“.',
    dopad: 'Při zamítnutí se po uložení neukáže žádné poděkování.'
  },
  'R-MILNIKY': {
    proc: 'Mezi kontrolami (3 měsíce) pacient potřebuje vidět, že má smysl pokračovat. Milníky chválí vytrvalost a návyk, nikdy číslo. Body, série s trestem a známky byly zavrženy.',
    jak: 'Jednorázové karty na Dnes: jídlo poznáno (3 zápisy se všemi údaji) · rada zdomácněla (3× po sobě přijata) · týden bez mezery · obvyklá porce 10× po sobě · všechna častá jídla známe · zpětně doplněno 5×. U svačin se milník „známe“ neukáže (není k nim rada). Milníky nejdou do reportu lékaře.',
    kde: 'Dnes (karta) a Plán (přehled milníků) — pacient.',
    co: 'Seznam milníků, jejich prahy a znění.',
    dopad: 'Při zamítnutí se žádný milník neukáže; týdenní shrnutí zůstává.'
  },
  'S-CESTA': {
    proc: 'Dlouhodobý cíl musí být vidět: aplikace se učí pacientova jídla a na kontrole z toho lékař rozhodne. Pacient nic nepočítá.',
    jak: 'Karta na Dnes a v Plánu: pruh dní do kontroly · známá jídla X z N (z jídel jedených aspoň 2×) · tento týden X z N jídel zapsáno a inzulin potvrzen · věta, co se na kontrole stane. Čísla jako „X z N“, nikdy procenta jako hodnocení.',
    kde: 'Dnes, Plán, převzetí plánu (pacient).',
    co: 'Obsah karty a dvě věty o cíli a o kontrole.',
    dopad: 'Při zamítnutí karta zmizí z Dnes i z Plánu.'
  },
  'S-TYDEN': {
    proc: 'Mezi kontrolami není žádný rytmus, kde by pacient viděl postup. Týdenní shrnutí je jediné místo pro „co zkusit příští týden“ z vlastních dat.',
    jak: 'Každých 7 dní od vydání plánu karta „Váš N. týden“: zapsáno X z 21 jídel · kolik v obvyklé porci · co pomohlo (rada: k z n v cíli) · případný milník · jedna nabídka na příští týden z vlastních dat. Jen u pacienta, nejde do reportu.',
    kde: 'Dnes (pacient), jednou týdně od vydání plánu, dokud ji nezavře.',
    co: 'Obsah shrnutí a to, že nabídka přenáší zkušenost z jednoho jídla na jiné.',
    dopad: 'Při zamítnutí se týdenní shrnutí neukazuje.'
  },
  'R-ZMIZELA': {
    proc: 'Když garant radu zamítne, nesmí pacientovi prostě zmizet beze slova, pokud ji dřív u jídla přijímal — ale o garantovi se nemluví.',
    jak: 'U jídla, kde pacient zamítnutou radu dřív přijal, se jednou ukáže věta „Radu „X“ teď nenabízíme. Vaše dávky se tím nemění.“ U ostatních jídel rada jen zmizí.',
    kde: 'Krok 3 před jídlem (pacient) po zamítnutí rady v registru.',
    co: 'Znění věty a zásadu „o garantovi se nemluví“.',
    dopad: 'Při zamítnutí zmizí zamítnutá rada beze slova i u jídel, kde ji pacient přijímal.'
  },
  'S-SEMAFOR': {
    proc: 'Lékař potřebuje na první pohled vědět, jak na tom pacient celkově je. Semafor času v cíli je běžný konsenzuální ukazatel.',
    jak: 'Zelená: čas v cíli nad 70 % a pod dolním cílem méně než 4 %. Žlutá: čas v cíli 50–70 %. Červená: pod 50 %, nebo pod dolním cílem 4 % a víc, nebo pod 3,0 aspoň 1 %. Všechny čtyři hranice jsou parametry.',
    kde: 'Kontrola, krok 1 (dlaždice Čas v cíli); návrhové karty (kontext „celkové vyrovnání“).',
    co: 'Čtyři hranice semaforu (70 %, 50 %, 4 %, 1 %) a to, že červená má přednost při jakémkoli překročení dolních hranic.',
    dopad: 'Při zamítnutí aplikace použije záložní hranice z kódu (tytéž) a štítek „schváleno“ u semaforu zmizí.'
  },
  'P-NEMOC': {
    proc: 'Při nemoci glukóza stoupá bez ohledu na jídlo. Zápisy z nemoci by zkreslily učení i návrhy k dávce a rady k jídlu by byly zavádějící. Nemoc ale musí hlásit a ukončit pacient — lékař mezi kontrolami nic nedělá.',
    jak: 'Přepínač „Není mi dobře“ nahoře na Dnes. V nemoci: zápisy se štítkují a nepočítají, žádné rady k jídlu, nahoře pokyny lékaře pro nemoc, denní dotaz „už je vám lépe?“. Po 3 dnech nemoci karta s pokynem lékaře k trvání nemoci; období delší než 3 dny jsou v reportu v části Bezpečnost. Ukončuje pacient.',
    kde: 'Dnes (přepínač, pokyny, karta po 3 dnech), krok 3 před jídlem (bez rad), kontrola (dlaždice „Mimo učení“, Bezpečnost).',
    co: 'Pravidlo „žádné rady k jídlu při nemoci“, práh 3 dnů a to, že nemoc ukončuje pacient.',
    dopad: 'Při zamítnutí přepínač nemoci není; zápisy z nemoci vstupují do učení i do návrhů k dávce.'
  },
  'P-LEKAR': {
    proc: 'Zásada „nikdo pacienta průběžně nesleduje“ platí i pro lékaře. Práce mezi kontrolami by ho odradila a vytvořila falešný dojem dohledu.',
    jak: 'Všechny akce lékaře probíhají jen s pacientem v ordinaci: zařazení, kontrola, vydání plánu. Mezi kontrolami lékař nic nevidí ani nedostává upozornění; nemoc ukončuje pacient, výpadek dat končí sám. Jediná akce mimo kontrolu je registr garanta. (V ostrém provozu se data ukládají na zabezpečený server studie; to na zásadě nic nemění — lékař je čte až na kontrole.)',
    kde: 'Celá aplikace; výslovně obrazovka „Pacient je zařazený“ (lékař) a věta „Zápisy nikdo průběžně nečte“ na Dnes (pacient).',
    co: 'Zásadu samu a její důsledky: žádné upozornění lékaři mezi kontrolami, žádné průběžné čtení dat.',
    dopad: 'Položka je zásada, ne výpočet: zamítnutí v maketě nic nevypne, jen zapíše nesouhlas do historie — to je podnět k debatě, ne změna chování.'
  }
};

})(typeof window !== 'undefined' ? window : globalThis);
