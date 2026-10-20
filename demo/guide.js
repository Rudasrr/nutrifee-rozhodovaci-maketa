/* Průvodce položkami registru pro lékaře-garanta (7. 10. 2026). Součást prezentační vrstvy.
   Každá položka má pět oddílů ve stejném pořadí: proč existuje · jak funguje · kde je použita · co schvalujete · co se stane při zamítnutí.
   Texty jsou podklad k rozhodnutí. Čísla a prahy se do textu dosazují z parametrů položky, které čte kód: {klic} = parametr téže položky,
   {ID:klic} = parametr jiné položky, {klic%} = podíl 0–1 jako procenta, {klic|1} = s jedním desetinným místem (19. 10. 2026, K1 z prověrky:
   průvodce se rozcházel s registrem). Zástupné znaky bez parametru ({addon}, {first}, {lever}) zůstávají, jsou to místa v textu pro pacienta. Žádná skutečná jména. */
(function (global) {
'use strict';
var D = global.NutriFeeDemo = global.NutriFeeDemo || {};

D.guide = {
  'K-KRITERIA': {
    proc: 'Celá aplikace stojí na jednom předpokladu: pacient má pevné dávky inzulinu ke třem hlavním jídlům a bazál večer. Jen tak dává smysl učit se, jak jeho tělo reaguje na stejné jídlo, a radit mu, aby jedl ke své dávce pokaždé podobně.',
    jak: 'Lékař při zařazení potvrdí čtyři podmínky: dospělý s diabetem 2. typu · inzulin v pevných dávkách · bazál 1× večer a prandiální inzulin ke třem jídlům · senzor glukózy. Tablety nebo GLP-1 navíc nevadí: zaznamenají se a na kontrole se ověří, že se neměnily. Premixované inzuliny ne, protože dávku nelze přiřadit k jednomu jídlu. Karta pacienta ukazuje, co z toho dokládá („z karty: splněno“), potvrzení je přesto lékařovo. Dokud některá podmínka chybí, nelze pokračovat.',
    kde: 'Zařazení a plán, krok 1 (lékař). Zelený štítek u potvrzených podmínek odkazuje na tuto položku.',
    co: 'Že tyto čtyři podmínky jsou správné a úplné pro první studii, včetně toho, že tablety nebo GLP-1 navíc nevadí a premixované inzuliny ne. Vylučovací kritéria (těhotenství, těžké ledvinové nebo jaterní onemocnění, opakované těžké hypoglykemie, zrak, kognice) položka zatím neobsahuje. Chcete-li je doplnit, napište je do komentáře a zvolte Upravit.',
    dopad: 'Při zamítnutí aplikace podmínky nekontroluje a zařazení projde bez nich. Pacient na premixu nebo s dávkou měněnou podle jídla by pak dostával rady, které u něj neplatí.'
  },
  'C-CILE': {
    proc: 'Všechno hodnocení v aplikaci („v cíli / nad cílem“, semafor, návrhy k dávce) potřebuje cílové hodnoty glukózy. Musí být na jednom místě, viditelné a měnitelné, ne roztroušené v kódu.',
    jak: 'Výchozí cíle pro každého pacienta: dolní cíl {low|1} mmol/l, horní cíl po jídle {high|1}, ráno nalačno do {fastingHigh|1}, čas v cíli alespoň {tirGoal} %. Lékař je u konkrétního pacienta upraví voličem při zařazení i na kontrole; garant tady mění výchozí hodnoty pro všechny.',
    kde: 'Zařazení (cíle glukózy u pokynů), kontrola (úprava cílů), karty jídel pacienta (hranice cíle na stupnici), report (semafor a návrhy).',
    co: 'Čtyři výchozí čísla a to, že lékař je smí u pacienta měnit. Vycházejí z běžných konsenzuálních cílů; jsou to návrh autora makety, ne klinická pravda.',
    dopad: 'Při zamítnutí aplikace použije záložní hodnoty zapsané v kódu (3,9 / 10,0 / 7,2 / 70 %) a štítek „schváleno“ u cílů zmizí. Hodnocení nepřestane fungovat, jen přestane být kryté registrem.'
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
    jak: 'Míra reakce je vzestup: nejvyšší hodnota 0–{okno_min} minut po jídle minus hodnota před jídlem. V cíli = vzestup nejvýš {vzestup_max|1} mmol/l. Jídlo je „známé“, až když se aspoň {minKnown} započítané zápisy z posledních {maxUceni} shodují (rozdíl vzestupů do {shoda_mmol|1} mmol/l); 1. zápis je „první dojem“, 2. „zatím to vypadá“, jen když se shoduje. Když se nový zápis rozchází s dřívějšími o {rozchod_mmol|1} mmol/l a víc, aplikace se jednou zeptá, zda šlo o stejné jídlo; po {maxUceni} zápisech bez shody je jídlo „nestálé“ a lékař ho vidí v podkladech. Započítaný zápis má úplná data ze senzoru, inzulin potvrzený podle plánu, je mimo nemoc a mimo „neobvyklý den“, s obvyklou porcí a při stejné dávce. Rozmezí vrcholů: do {minQuantile} zápisů nejnižší–nejvyšší hodnota, potom 10.–90. percentil. Popisuje minulost, nepředpovídá.',
    kde: 'Karty jídel (stupnice s rozmezím), krok 3 před jídlem, report lékaře (tabulka jídel).',
    co: 'Míru „vzestup“ s oknem {okno_min} minut, hranici {vzestup_max|1} mmol/l pro „v cíli“, „známé“ až při {minKnown} shodných zápisech z {maxUceni} a způsob výpočtu rozmezí.',
    dopad: 'Při zamítnutí aplikace reakci na jídlo nevyhodnocuje vůbec: karty jídel neukážou rozmezí ani stupeň a před jídlem se neradí.'
  },
  'Z-GLUKOZA': {
    proc: 'Napojení na výrobce senzoru by vyžadovalo jeho svolení a certifikaci rozhraní. Pacient hodnoty ze senzoru vidí sám; opsat dvě čísla stačí, aby se aplikace učila a radila.',
    jak: 'V kroku 1 čipy po celých mmol/l (4–15, pod 4, nad 15, nemám) pro hodnotu teď; na nejvyšší hodnotu po minulém jídle se aplikace zeptá až v kroku 1 dalšího jídla a večer u bazálu, u zpětného zápisu rovnou na obě. Jeden pohled do senzoru na jídlo; samostatná karta po dvou hodinách není. Vzestup = nejvyšší − před jídlem. „Nemám“ zápis uloží, ale nepočítá do učení, dokud ho nedoplní export.',
    kde: 'Krok 1 před jídlem (hodnota teď a nejvyšší po minulém jídle), večer u bazálu, karta „Jak to dopadlo“ s poznámkou „podle opsaných hodnot“.',
    co: 'Že dvě opsané hodnoty jsou dostatečná míra (nejvyšší hodnota do {pripominka_min} minut, ne hodnota přesně ve 2. hodině) a že se na ni aplikace ptá až při dalším jídle.',
    dopad: 'Při zamítnutí by pacient hodnoty nezapisoval a učení i rady by čekaly na týdenní export.'
  },
  'B-HYPO': {
    proc: 'Menší porce po podaném inzulinu a vynechané jídlo s inzulinem jsou nejčastější cesta k hypoglykemii u pevných dávek. Aplikace nesmí radit „sněz víc“ ani měnit dávku, ale nesmí ani mlčet.',
    jak: 'Po menší porci s podaným inzulinem nebo po vynechaném jídle s inzulinem pokyn lékaře hned a za {pripominka_min} min otázka „klesla pod 4?“ (po večeři až ráno v kroku 1 další snídaně: „klesla v noci pod 4?“, protože pokles po večeři bývá mezi 22. a 24. hodinou); u každého jídla vedle nejvyšší hodnoty i „pod 4 do 4 h?“ (ano/ne/nevím); {poklesy} poklesy za {dny} dní → „zavolejte do ordinace“ s odkazem na Bezpečí. Hranice 4 mmol/l je pevná. Opsané „pod 4“ vstupuje do návrhu „pod cílem“; report má část Bezpečnost.',
    kde: 'Dnes (karta sledování, výstraha), krok 1 (otázka k minulému jídlu), report lékaře (Bezpečnost), návrh k dávce.',
    co: 'Prahy {poklesy} poklesy / {dny} dní / {pripominka_min} min a znění pokynu, kdy má pacient volat.',
    dopad: 'Při zamítnutí aplikace po menší porci mlčí a poklesy zná lékař až z exportu na kontrole.'
  },
  'Z-IMPORT': {
    proc: 'Opsané hodnoty stačí k učení, ale lékař potřebuje přesný průběh (vrcholy, noci pro bazál) a pacientovy hodnoty se mohou mýlit. Export z aplikace senzoru jsou pacientova data.',
    jak: 'Na kontrole nahraje sestra export z portálu výrobce senzoru (csv; xlsx uložený jako csv) v části Podklady › Data ze senzoru; pacient může nahrát sám z Plánu, nic mu to nepřipomíná. Měření 0–{po_jidle_min} min po jídle se přiřadí k zápisu, noční hodnoty k noci, spočítá se čas v cíli; opsané hodnoty se nahradí.',
    kde: 'Kontrola (sestra nahraje export v podkladech), stránka „Nahrát export“ v Plánu pacienta.',
    co: 'Okno přiřazení ({po_jidle_min} min) a to, že export nahrává sestra na kontrole; pacientovi se nic nepřipomíná.',
    dopad: 'Při zamítnutí by lékař viděl jen opsané hodnoty a bazál by neměl noční data.'
  },
  'R-PODOBNOST': {
    proc: 'U jídla, které pacient ještě nejedl, by číslo vypadalo jako předpověď bez opory. Jediný, kdo ví, čemu se nové jídlo podobá, je pacient.',
    jak: 'Nepovinné „Je to jako X“ při zápisu nového jídla. Do třetího vlastního zápisu se ukáže široké rozmezí z jídla X s váhou {vaha} virtuálních zápisů (s 1 vlastním 67 %, se 2 zápisy 50 %, od 3 zápisů 0 %). Bez potvrzení se nic neodhaduje. Jídla z databáze se k sobě přirovnávají podle předvyplněných údajů při aspoň {minJidel} podobných jídlech, {minZapisu} zápisech (nejvýš {maxNaJidlo} z každého) a shodě aspoň {shoda%}.',
    kde: 'Nové jídlo (řádek „Je to jako…“), karta jídla a krok 3 před jídlem (čárkované okno „podobná jídla“).',
    co: 'Že podobnost určuje jen pacient a jaká je váha odhadu.',
    dopad: 'Při zamítnutí je nové jídlo „neznámé“, dokud ho aplikace nepozná z vlastních zápisů: žádné rozmezí, jen obecné rady.'
  },
  'R-SKORE': {
    proc: 'Pacient má vědět, jak často po jídle zůstane v cíli — relativně ke svým vlastním jídlům, ne jako známku „dobré / špatné jídlo“.',
    jak: 'Dva stupně: „většinou v cíli“, když je v cíli aspoň {mirna%} započítaných zápisů, jinak „častěji nad cílem“. Tři stupně ze šesti zápisů rozlišit nešlo. Stupeň se ukáže od {odKolika} započítaných zápisů; dál se počítá z posledních {oknoZapisu} a změní se, jen když by platil, i kdyby jeden zápis dopadl jinak. „Ustálené“ od {ustaleneOd} zápisů. „V cíli“ u jídla znamená vzestup nejvýš {R-REAKCE:vzestup_max|1} mmol/l (nejvyšší hodnota minus hodnota před jídlem).',
    kde: 'Karty jídel (štítek), krok 3 před jídlem, report lékaře (sloupec Reakce).',
    co: 'Hranici {mirna%} v cíli, stupeň od {odKolika} zápisů a slova „většinou v cíli / častěji nad cílem“.',
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
    proc: 'Bílkovina nebo tuk přidané k jídlu zpomalí vzestup glukózy, aniž by se z jídla cokoli ubralo. Je to jediná rada, která jídlo mění, a proto musí být výslovně schválená.',
    jak: 'Text „Přidejte k jídlu {addon}. Z jídla nic neubírejte.“ (u databázových jídel konkrétní doplněk, u nových obecný). Jen před píchnutím a mimo nemoc. U jídla, kde pacient odpoví „Tentokrát ne · V jídle to není“, se už nenabízí; po {stahnout_po} pokusech bez účinku u téhož jídla se stáhne. Účinek se hodnotí stejným oknem jako jídlo (R-REAKCE).',
    kde: 'Krok 3 před jídlem (pacient), karta jídla „co u vás pomohlo“, report lékaři.',
    co: 'Že doplněk jen přidává a nic nenahrazuje, kdy se smí nabízet a po kolika neúspěších se stáhne.',
    dopad: 'Při zamítnutí rada zmizí ze všech jídel; pacient, který ji dřív přijímal, dostane jednu neutrální větu (R-ZMIZELA).'
  },
  'R-PORADI': {
    proc: 'Pořadí soust mění křivku glukózy bez změny množství: zelenina a bílkovina před přílohou zpomalí vzestup.',
    jak: 'Rada „Snězte nejdřív {first}, potom zbytek jídla.“ (u databázových jídel konkrétní, u nových „zeleninu nebo maso“). Nabízí se před píchnutím i po něm, ne při nemoci. Složení se nezadává: když pacient odpoví „Tentokrát ne · V jídle to není“, rada se u toho jídla už neukáže.',
    kde: 'Krok 3 před jídlem (pacient), karta jídla, report lékaři; položka má historii úprav textu (scénář 5).',
    co: 'Text rady a to, že se u jídla vypíná odpovědí pacienta, ne zadáním složení.',
    dopad: 'Při zamítnutí rada zmizí ze všech jídel (R-ZMIZELA).'
  },
  'R-PROCHAZKA': {
    proc: 'Krátký pohyb po jídle zmírní vzestup glukózy. Po jídle, které už je snědené, je to jediná rada, která ještě dává smysl.',
    jak: 'Rada „Po jídle se asi {minut} minut svižně projděte.“ Před jídlem se nabízí jako jedna z rad; po zpětném zápisu podle času od jídla: do hodiny zmírní vzestup, do 3 hodin sníží zvýšenou glukózu, potom se nenabízí. Nenabízí se při nemoci ani v riziku nízké glukózy: glukóza teď pod 4, menší porce po píchnutí nebo při „nevím, jestli byl inzulin“, vynechané jídlo s inzulinem. Délka procházky je parametr.',
    kde: 'Krok 3 před jídlem, zpětný zápis („Co pomůže teď“), návyk „Procházka po večeři“ v plánu, report lékaře.',
    co: 'Znění rady, délku {minut} minut, okno 3 hodin po jídle a to, že se v riziku nízké glukózy nenabízí. Rada neříká „změřte se před procházkou“; chcete-li to doplnit, napište to do komentáře a zvolte Upravit.',
    dopad: 'Při zamítnutí rada zmizí před jídlem, po zpětném zápisu i z návrhů na kontrole; návyk „Procházka po večeři“ nelze přidat.'
  },
  'D-CISTA': {
    proc: 'Návrh k dávce smí stát jen na zápisech, u kterých je příčina vysoké nebo nízké glukózy opravdu dávka — ne porce, chybějící inzulin, svačina nebo nemoc. Přesně to lékař při posuzování dávky vylučuje ručně.',
    jak: 'Čistý zápis pro návrh k dávce: obvyklá porce · inzulin potvrzen podle plánu a včas (nejvýš {pred_min} min před jídlem, {po_min} min po něm) · mimo nemoc a mimo „neobvyklý den“ · úplná data ze senzoru · bez svačiny do {svacina_min} min po jídle. Navíc nevstupuje zpětný zápis s odhadnutým časem, podání až po jídle ani dodatečně opravený inzulin (ty jdou jen do učení jídla). Inzulin lze opravit do {oprava_min} minut po zápisu.',
    kde: 'Report lékaře (návrhy k dávce, „Co návrh oslabuje“ se seznamem vyřazených zápisů), karty jídel (co se počítá), Dnes (karta „Zapsáno · Opravit inzulin“).',
    co: 'Toleranci {pred_min}/{po_min} minut, okno svačiny {svacina_min} minut, {oprava_min} minut na opravu inzulinu a pravidlo, že zpětný a pozdní zápis jdou jen do učení.',
    dopad: 'Při zamítnutí aplikace nerozlišuje čisté a nečisté zápisy: do návrhů k dávce by vstupovaly i jídla s jinou porcí nebo bez inzulinu.'
  },
  'D-PRAND': {
    proc: 'Lékař na kontrole potřebuje vědět, u kterého jídla dne data naznačují, že dávka nesedí — s čísly, ne s pocitem. Aplikace přitom nesmí navrhnout směr ani výši.',
    jak: 'Jednotka je jídlo dne (snídaně / oběd / večeře) s rozpadem po jídlech. Okno od poslední změny dávky, nejméně {dny} dní. „Nad cílem“: nejméně {minJidel} čistých jídel, aspoň {podil%} s vrcholem nad horním cílem a medián vrcholu víc než {medianNad|1} mmol/l nad cílem, a to až poté, co pacient aspoň {radyPrve}× přijal radu k jídlu (rady jdou první; při převaze odmítnutí se navrhne nejdřív rada). „Pod cílem“: nejméně {hypo} poklesy pod dolní cíl do 4 h po jídle a zároveň aspoň {hypoPodil%} jídel (z nejméně {hypoMin}), nebo jediný pokles pod 3,0; nízké hodnoty se berou ze všech zápisů. Karta vždy ukazuje čas v cíli, podíl pod cílem a HbA1c. Nízké hodnoty mají přednost před vysokými.',
    kde: 'Kontrola, krok 2 (návrhové karty „Posoudit prandiální dávku“ a „Nejdřív rady“).',
    co: 'Všechny prahy ({dny} dní, {minJidel} jídel, {podil%}, +{medianNad|1} mmol/l, {radyPrve} přijaté rady, {hypo} poklesy / {hypoPodil%} / {hypoMin} jídel, pokles pod 3,0) a pravidlo „rady první“. Prahy jsou návrh autora makety podle běžných titračních postupů.',
    dopad: 'Při zamítnutí aplikace návrhy k prandiální dávce nevytváří; lékař posuzuje dávku jen z tabulky jídel.'
  },
  'D-BAZAL': {
    proc: 'Ranní glukóza je zrcadlo bazálu. Noční pokles je nejdůležitější bezpečnostní signál a musí mít přednost před vším ostatním.',
    jak: 'Z nejméně {minNoci} nocí za {dny} dní: medián ranních hodnot nad cílem nalačno a žádná noc pod dolním cílem → návrh „posoudit bazál — ranní hodnoty nad cílem“. Nejméně {nociPod} noci pod 3,9 nebo 1 noc pod 3,0 → návrh „pod cílem“ s předností; u jediného bodu pod 3,0 karta upozorní, že může jít o artefakt senzoru (tlak na senzor ve spánku).',
    kde: 'Kontrola, krok 2 (návrhová karta „Posoudit bazální dávku“). V modelovém příběhu se návrh bazálu nevytvoří — noci jsou v cíli.',
    co: 'Prahy {minNoci} nocí, {dny} dní, {nociPod} noci pod 3,9, 1 noc pod 3,0 a přednost nízkých hodnot.',
    dopad: 'Při zamítnutí aplikace bazál neposuzuje; lékař má jen řádek „bazál potvrzen X z N dnů“.'
  },
  'D-POSTUP': {
    proc: 'Aplikace nesmí říct „zvyšte“. Když ale lékař-garant schválí svůj vlastní postup posouzení (co ověřit a co z toho plyne), aplikace ho jen aplikuje na data a ukáže větev. Věta „zvýšit“ je pak lékařova, ne aplikace.',
    jak: 'Pět postupů: bazál pod cílem, bazál nad cílem, prandiální pod cílem, prandiální nad cílem, „nejdřív rady“. Každý má ověřovací body – věty v jednom smyslu, které musí platit, aby šlo pokračovat; lékař u nich označí sedí / nesedí. U bodu, ke kterému aplikace má data, je číslo z dat (např. čas v cíli a HbA1c); bod, kterému data odporují, má štítek „data říkají jinak“ a hromadné „Vše sedí“ ho nepřepne – lékař ho posoudí sám. Dál větve: „vše sedí → zvýšit / snížit“, „bod N nesedí → ponechat, řešit …“. Pro bod bez větve aplikace větev nevymýšlí a řekne „rozhodněte sami“. Rozhodnutí proti směru větve se zapíše jako „rozhodnuto jinak než postup“. Postup nikdy neobsahuje velikost kroku v jednotkách — tu volí lékař voličem.',
    kde: 'Kontrola, krok 2 (oddíly „Ověřit s pacientem“ a „Postup říká“ u každé návrhové karty).',
    co: 'Znění ověřovacích bodů a větví všech pěti postupů (body přepsané 20. 10. 2026 do jednoho smyslu – posuďte je znovu). Jednotlivou větev můžete v registru vyřadit („Upravit větve“); vyřazená větev se na kartě neukáže.',
    dopad: 'Při zamítnutí celé položky návrhové karty nemají větve: lékař vidí důvod a ověření, ale postup mu neřekne nic a rozhoduje sám.'
  },
  'R-POKYNY': {
    proc: 'Co dělat při nízké glukóze, při menší porci po píchnutí, při nemoci nebo při nejistotě s inzulinem, nesmí říkat aplikace. Říká to lékař — připravenou větou, do které dosadí hodnotu.',
    jak: 'Katalog vět: nízká glukóza (hranice pevně 4 mmol/l, bez voliče) · nevím, jestli byl inzulin píchnutý (změřit za 60 min, znovu nepíchat) · méně jídla než obvykle (změřit za 60 min) · nemoc zvlášť pro bazál (píchat dál, měřit každé 3 h) a pro inzulin k jídlu (jen když pacient jí; při zvracení nebo nad 15 volat) · vysoká glukóza (nad 15 déle než 3 h volat) · kdy a kam volat. Lékař při zařazení pokyny zapne a ostatní hodnoty nastaví voličem; na kontrole je může upravit. Pacient je má v Bezpečí, při nemoci nahoře na Dnes a přímo v kartách, kde aplikace neradí.',
    kde: 'Zařazení (krok 2), Bezpečí (pacient), Dnes při nemoci, krok 1 a 3 před jídlem (pod „Nevím“ a u menší porce), kontrola (návrh „Osobní pokyny stále platí?“).',
    co: 'Znění vět, výchozí hodnoty a pevnou hranici nízké glukózy 4 mmol/l. Věty jsou návrh autora makety; garant je může přepsat v registru.',
    dopad: 'Při zamítnutí pacient nemá v Bezpečí žádné pokyny a aplikace v situacích, kdy neradí, nemá na co odkázat.'
  },
  'Z-BODY': {
    proc: 'Zaučení bez pohledu na to, co pacient skutečně umí, je jen odškrtávání. Body zaučení se skládají z návyků v plánu, protože s návykem souvisí to, co má pacient umět.',
    jak: 'Tři pevné body (našel Dnes, našel Bezpečí, ví kam volat), bod sestry (umí stáhnout export z portálu výrobce senzoru a nahrát ho při kontrole) a body podle návyků plánu (zapsal zkušební jídlo, ví o radě k porci, ví o otázce na inzulin, našel připomínku bazálu). Sestra zaškrtává, co pacient udělal sám; „Ukázat“ přepne náhled telefonu na příslušnou obrazovku. Dokončit lze až po všech bodech; „nezdařilo se“ s důvodem vidí lékař v zařazení a na kontrole.',
    kde: 'Zaučení (sestra); stav zaučení v zařazení a v podkladech kontroly (lékař).',
    co: 'Seznam bodů a pravidlo, že návyky začnou platit až po dokončeném zaučení a jedné kontrolní otázce.',
    dopad: 'Při zamítnutí má sestra jen tři pevné body; body podle návyků se neskládají.'
  },
  'J-DATABAZE': {
    proc: 'Pacient vybírá jídlo jménem, ne složením. Bez seznamu běžných jídel by musel všechno zakládat ručně.',
    jak: 'Asi 200 běžných českých jídel a hotovek s textem doplňku a „co sníst nejdřív“; vnitřní údaje pro podobnost pacient nevidí a u vlastního jídla je nezadává. Hledání od začátku slova, „naposledy“, vlastní jídlo jen názvem. V maketě je seznam syntetický; skutečný zdroj a licence se vyberou pro studii.',
    kde: 'Krok 2 před jídlem (výběr jídla), Jídla (karty).',
    co: 'Že seznam tohoto typu a rozsahu je pro studii vhodný a že texty doplňku a pořadí u jídel jsou součástí schválení rad.',
    dopad: 'Při zamítnutí pacient nemá nabídku jídel a každé jídlo zakládá sám.'
  },
  'J-STITKY': {
    proc: 'Pacient hotová a domácí jídla nezná složením, ale jménem a rutinou. Aplikace se učí z reakce těla, k tomu složení nepotřebuje; složky s množstvím („hrst, pěst“) mají chybu 30–50 % a působí jako počítání.',
    jak: 'Nové jídlo = název (našeptávač od pár písmen, „Zase to samé“ u posledních jídel) a nepovinné jedno klepnutí „Je to jako X“ ze svých známých jídel. Nic dalšího: žádný zdroj sacharidů, úprava, talíř, velikost. Porce (obvyklá/větší/menší) se ptáme až při jídle; první zápis ukotví obvyklou. Když se název podobá jídlu v seznamu, přijde dotaz „Není to totéž jídlo?“ (Ano, to je ono / Ne, je jiné). Co v jídle je, se aplikace dozví z odpovědí na rady: „Tentokrát ne · V jídle to není“ radu u jídla vypne.',
    kde: 'Před jídlem, krok 2 (pacient), když jídlo v seznamu není.',
    co: 'Že název stačí a že složení se nikde nezadává ani nevyptává.',
    dopad: 'Při zamítnutí nejde přidat nové jídlo; pacient vybírá jen ze seznamu a domácí jídlo nezapíše vůbec.'
  },
  'S-SOUHRN': {
    proc: 'Lékař potřebuje jednu větu „co se dělo“ hned nahoře reportu — ze šablony podle pravidel, ne z generativní AI. A srovnání „s radou vs. bez rady“ nesmí tvrdit víc, než data unesou.',
    jak: 'Věta se skládá z podílu obvyklé porce, potvrzení inzulinu, přijatých rad a času v cíli. Srovnání mediánu vrcholu s radou a bez ní se počítá per rada a říká se jen od {min_n} zápisů s radou a {min_n} bez ní u téže rady a při rozdílu nejméně {rozdil_mmol|1} mmol/l; jinak „zatím nelze říct“. Pacient si volí, kdy radu přijme, takže srovnání není důkaz účinku — proto neutrální „s radou bývalo níž“ bez fajfky.',
    kde: 'Kontrola, krok 1 (věta „Co se dělo“, dlaždice „S radou bývalo níž?“); návrhy „zachovat radu“ v kroku 2; report před kontrolou u pacienta (přehled).',
    co: 'Prahy {min_n} + {min_n} zápisů a {rozdil_mmol|1} mmol/l a neutrální znění.',
    dopad: 'Při zamítnutí report větu neukáže a dlaždice srovnání rad zmizí.'
  },
  'S-VYSLEDEK': {
    proc: 'Pacient má vidět, jak dopadlo to, co udělal, ve chvíli, kdy je to známé. Jinak se smyčka učení neuzavře. Hodnota ale není jeho zásluha ani vina, proto se říká věcně a díky patří činu.',
    jak: 'Po příchodu dat ze senzoru jedna karta na Dnes: „nejvyšší hodnota X, v cíli / nad cílem“ a poděkování podle činu. U zápisu, který se do učení nepočítá (jiná porce, nepotvrzený inzulin, nemoc), karta neukáže číslo ani verdikt — jen důvod a u menší porce pokyn lékaře. Věta „bez toho u vás bývá …“ až od {min_n} zápisů s radou a {min_n} bez ní.',
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
    jak: 'Jednorázové karty na Dnes: jídlo poznáno (až ho aplikace zná: {R-REAKCE:minKnown} shodné zápisy) · rada zdomácněla (3× po sobě přijata) · týden bez mezery · obvyklá porce 10× po sobě · všechna častá jídla známe · zpětně doplněno 5×. U svačin se milník „známe“ neukáže (není k nim rada). Milníky nejdou do reportu lékaře.',
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
    jak: 'Zelená: čas v cíli nad {tir_zelena} % a pod dolním cílem méně než {tbr_max} %. Žlutá: čas v cíli {tir_zluta}–{tir_zelena} %. Červená: pod {tir_zluta} %, nebo pod dolním cílem {tbr_max} % a víc, nebo pod 3,0 aspoň {tbr3_max} %. Všechny čtyři hranice jsou parametry.',
    kde: 'Kontrola, krok 1 (dlaždice Čas v cíli); návrhové karty (kontext „celkové vyrovnání“).',
    co: 'Čtyři hranice semaforu ({tir_zelena} %, {tir_zluta} %, {tbr_max} %, {tbr3_max} %) a to, že červená má přednost při jakémkoli překročení dolních hranic.',
    dopad: 'Při zamítnutí aplikace použije záložní hranice z kódu (70 / 50 / 4 / 1 %) a štítek „schváleno“ u semaforu zmizí.'
  },
  'P-NEMOC': {
    proc: 'Při nemoci glukóza stoupá bez ohledu na jídlo. Zápisy z nemoci by zkreslily učení i návrhy k dávce a rady k jídlu by byly zavádějící. Nemoc ale musí hlásit a ukončit pacient — lékař mezi kontrolami nic nedělá.',
    jak: 'Přepínač „Není mi dobře“ nahoře na Dnes. V nemoci: zápisy se štítkují a nepočítají, žádné rady k jídlu, nahoře pokyny lékaře pro nemoc, denní dotaz „už je vám lépe?“. Po {dny} dnech nemoci karta s pokynem lékaře k trvání nemoci; období delší než {dny} dny jsou v reportu v části Bezpečnost. Ukončuje pacient.',
    kde: 'Dnes (přepínač, pokyny, karta po 3 dnech), krok 3 před jídlem (bez rad), kontrola (dlaždice „Mimo učení“, Bezpečnost).',
    co: 'Pravidlo „žádné rady k jídlu při nemoci“, práh {dny} dnů a to, že nemoc ukončuje pacient.',
    dopad: 'Při zamítnutí přepínač nemoci není; zápisy z nemoci vstupují do učení i do návrhů k dávce.'
  },
  'P-LEKAR': {
    proc: 'Zásada „nikdo pacienta průběžně nesleduje“ platí i pro lékaře. Práce mezi kontrolami by ho odradila a vytvořila falešný dojem dohledu.',
    jak: 'Všechny akce lékaře probíhají jen s pacientem v ordinaci: zařazení, kontrola, vydání plánu. Mezi kontrolami lékař nic nevidí ani nedostává upozornění; nemoc ukončuje pacient, výpadek dat končí sám. Jediná akce mimo kontrolu je registr garanta. (V ostrém provozu se data ukládají na zabezpečený server studie; to na zásadě nic nemění — lékař je čte až na kontrole.)',
    kde: 'Celá aplikace; výslovně obrazovka „Pacient je zařazený“ (lékař) a věta „Zápisy nikdo průběžně nečte“ na Dnes (pacient).',
    co: 'Zásadu samu a její důsledky: žádné upozornění lékaři mezi kontrolami, žádné průběžné čtení dat.',
    dopad: 'Položka je zásada, ne výpočet: zamítnutí v maketě nic nevypne, jen zapíše nesouhlas do historie — to je podnět k debatě, ne změna chování.'
  },
  'S-SILNA': {
    proc: 'Jídlo, po kterém pacient opakovaně skončí nad cílem, je informace pro lékaře — ale lékař nesmí na kontrole probírat dvacet jídel a jejich složení.',
    jak: 'Jedna věta v podkladech kontroly: kolik jídel má opakovanou silnou reakci, kolik zápisů celkem a nejvýš {maxJidel} nejčastěji jedená (ostatní jen rozbalením). Práh: aspoň {silnych} zápisy nad cílem, nebo 2 zápisy s vzestupem aspoň o {dvaNad_mmol} mmol/l nad hranici. Silné reakce řeší aplikace s pacientem: páky (porce, pořadí, doplněk, procházka), jídlo se pasivně nenabízí. Pacientovi žádný zákaz ani „jezte méně“.',
    kde: 'Kontrola, krok 1, podklady: „Silné reakce“.',
    co: 'Práh, počet jídel ve větě a to, že lékař o jídlech nerozhoduje — rozhoduje o dávce a plánu.',
    dopad: 'Při zamítnutí lékař větu nedostane; silnou reakci najde jen v tabulce reakcí na jídla.'
  }
};

/* Dosazení parametrů do textu průvodce. Texty se čtou přes vlastnosti (getter), takže po úpravě parametru v registru
   ukáže průvodce hned nové číslo; jádro (V.itemGuide) i panel vyprávění čtou r.guide jako obyčejné řetězce. */
function fmt(v, mod) {
  if (typeof v !== 'number') return String(v);
  if (mod === '%') return String(Math.round(v * 100)) + ' %';
  if (mod && mod.charAt(0) === '|') return v.toFixed(Number(mod.slice(1)) || 0).replace('.', ',');
  return String(v).replace('.', ',');
}
function paramsOf(id) {
  var NF = global.NutriFee, s = null;
  try { s = NF && NF.getState ? NF.getState() : null; } catch (err) { s = null; }
  var r = s && s.registry && NF.item ? NF.item(s, id) : null;
  if (r && r.params) return r.params;
  var all = NF && NF.data && NF.data.registry ? NF.data.registry() : [];
  for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i].params || {};
  return {};
}
D.guideFill = function (id, text) {
  return String(text || '').replace(/\{(?:([A-Z]-[A-Z0-9-]+):)?([A-Za-z_][A-Za-z0-9_]*)(%|\|\d)?\}/g, function (m, other, key, mod) {
    var p = paramsOf(other || id);
    return p[key] != null ? fmt(p[key], mod) : m;
  });
};
var RAW = D.guideRaw = {};
Object.keys(D.guide).forEach(function (id) {
  var src = D.guide[id], out = {}; RAW[id] = src;
  Object.keys(src).forEach(function (k) {
    Object.defineProperty(out, k, { enumerable: true, get: function () { return D.guideFill(id, src[k]); } });
  });
  D.guide[id] = out;
});

})(typeof window !== 'undefined' ? window : globalThis);
