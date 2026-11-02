/* Průvodce položkami registru pro lékaře-garanta (7. 10. 2026). Součást prezentační vrstvy.
   Každá položka má pět oddílů ve stejném pořadí: proč existuje · jak funguje · kde je použita · co schvalujete · co se stane při zamítnutí.
   dopadSceny (B25, 27. 10. 2026): kapitoly hlavní linie, kde zamítnutí položky změní obrazovku aplikace (oznámení „Tahle část nefunguje“ nebo chování);
   hlídá pravdivost.test.cjs (T3) zkouškou zamítnutím. Prázdné pole = zamítnutí nic nevypne a „Co se stane“ to musí říct.
   Texty jsou podklad k rozhodnutí. Čísla a prahy se do textu dosazují z parametrů položky, které čte kód: {klic} = parametr téže položky,
   {ID:klic} = parametr jiné položky, {klic%} = podíl 0–1 jako procenta, {klic|1} = s jedním desetinným místem (19. 10. 2026, K1 z prověrky:
   průvodce se rozcházel s registrem). Místa v textu pro pacienta (doplněk, první složka jídla) se v průvodci píší příkladem, ne zástupným znakem (V03, 21. 10. 2026). Žádná skutečná jména. */
(function (global) {
'use strict';
var D = global.NutriFeeDemo = global.NutriFeeDemo || {};

D.guide = {
  'K-KRITERIA': {
    proc: 'Celá aplikace stojí na jednom předpokladu: pacient má pevné dávky inzulinu ke třem hlavním jídlům a bazál večer. Jen tak dává smysl učit se, jak jeho tělo reaguje na stejné jídlo, a radit mu, aby jedl ke své dávce pokaždé podobně.',
    jak: 'Lékař při zařazení potvrdí čtyři podmínky: dospělý s diabetem 2. typu, inzulin v pevných dávkách, bazál 1× večer s prandiálním inzulinem ke třem jídlům a senzor glukózy. Tablety nebo GLP-1 navíc nevadí: zaznamenají se a na kontrole se ověří, že se neměnily. Premixované inzuliny ne, protože dávku nelze přiřadit k jednomu jídlu. Karta pacienta ukazuje, co z toho dokládá („z karty: splněno“), potvrzení je přesto lékařovo. Dokud některá podmínka chybí, nelze pokračovat. Jedním dalším zaškrtnutím lékař potvrdí, že pacient nemá vylučovací kritérium (těhotenství nebo jeho plánování, opakované těžké poklesy glukózy nebo jejich nepoznávání, těžké onemocnění ledvin nebo jater, léčba akarbózou, potíže s chůzí nebo pohybem, kvůli kterým nezvládne procházku po jídle, potíže se zrakem nebo pamětí); bez něj plán nejde vydat. Pacient v Bezpečí čte, že když otěhotní nebo mu lékař změní druh léčby, NutriFee pro něj přestává platit. Na kontrole sestra zjistí i „Změnil se zdravotní stav (těhotenství, ledviny, hospitalizace)“.',
    kde: 'Zařazení a plán › krok 1 Zařazení (lékař): podmínky zařazení. Štítek u potvrzených podmínek odkazuje na tuto položku.',
    co: 'Že tyto čtyři podmínky jsou správné a úplné pro první studii, včetně toho, že tablety nebo GLP-1 navíc nevadí a premixované inzuliny ne. Návrh autora: vylučovací kritéria (těhotenství nebo jeho plánování, opakované těžké poklesy glukózy nebo jejich nepoznávání, těžké onemocnění ledvin nebo jater, léčba akarbózou – nízká glukóza se u ní léčí jen hroznovým cukrem –, potíže s chůzí nebo pohybem, kvůli kterým nezvládne procházku po jídle, potíže se zrakem nebo pamětí, které znemožní ovládat telefon) lékař potvrdí jedním zaškrtnutím, protože v ostré aplikaci protokol studie nebude. Zamítnutí je jen záznam nesouhlasu (viz Co se stane při zamítnutí); co změnit, můžete napsat do poznámky (nepovinné).',
    dopad: 'Zamítnutí podmínek zařazení je jen záznam nesouhlasu: aplikace podmínky dál vyžaduje a bez jejich potvrzení zařazení nepustí dál, protože bez nich by pacient nepatřil do kohorty, pro kterou jsou rady a návrhy postavené (pevné dávky, ne premixy). U podmínek v zařazení to připomene oznámení. Co změnit, můžete napsat do poznámky (nepovinné).',
    dopadSceny: ['enroll']
  },
  'C-CILE': {
    proc: 'Všechno hodnocení v aplikaci („v cíli / nad cílem“, semafor, návrhy k dávce) potřebuje cílové hodnoty glukózy. Musí být na jednom místě, viditelné a měnitelné, ne roztroušené v kódu.',
    jak: 'Výchozí (běžné) cíle: dolní {low|1}, horní po jídle {high|1}, ráno nalačno do {fastingHigh|1} mmol/l, čas v cíli alespoň {tirGoal} %, čas pod dolním cílem méně než {tbrGoal} %, HbA1c do {hba1cGoal} mmol/mol. Při zařazení lékař jedním klepnutím volí „běžné cíle“, nebo „mírnější cíle pro starší a křehké“: čas v cíli alespoň {tirGoalMirnejsi} % a čas pod cílem méně než {tbrGoalMirnejsi} %, ostatní hodnoty stejné; jednotlivé hodnoty pak může upravit voličem i na kontrole. Ze zvolených cílů pacienta vychází i semafor času v cíli (zelená hranice a mez času pod cílem). Garant tady mění výchozí hodnoty pro všechny.',
    kde: 'Zařazení (krok 2, oddíl 3), kontrola (dlaždice, úprava cílů v kroku 3), report před kontrolou (pacient); hranice cíle na stupnici jídel bez štítku. Dolní cíl {low|1} mmol/l platí pro lékaře (report, semafor, návrhy); pacient vidí všude pevnou hranici 4 mmol/l z čipů a pravidla k nízké glukóze. Hlášené „pod 4“ se v návrhu k dávce počítá jako pod dolním cílem.',
    co: 'Šest výchozích hodnot ({low|1} / {high|1} / {fastingHigh|1} mmol/l, čas v cíli {tirGoal} %, čas pod cílem méně než {tbrGoal} %, HbA1c {hba1cGoal} mmol/mol), mírnější sadu pro starší a křehké ({tirGoalMirnejsi} % a méně než {tbrGoalMirnejsi} %; návrh autora podle běžného konsenzu, rozhodnutí vlastníka 30. 10. 2026) a to, že lékař je smí u pacienta měnit. Vycházejí z běžných konsenzuálních cílů; jsou to návrh autora makety, ne klinická pravda. Zamítnutí je jen záznam nesouhlasu s hodnotami: hodnocení poběží dál se stejnými čísly (viz Co se stane při zamítnutí).',
    dopad: 'Zamítnutí cílů je jen záznam nesouhlasu s hodnotami: aplikace dál počítá s navrženými výchozími hodnotami (3,9 / 10,0 / 7,2 / 70 % / méně než 4 % / 53, mírnější sada 50 % / méně než 1 %), protože bez cílů nejde hodnotit žádné jídlo ani návrh. U cílů v zařazení, na kontrole a v přehledu před kontrolou to připomene oznámení. Hodnoty, které chcete, můžete napsat do poznámky (nepovinné).',
    dopadSceny: ['enroll', 'doses', 'preview', 'reviewSummary']
  },
  'R-NAVYKY': {
    proc: 'Studie potřebuje srovnatelný start: každý pacient začíná se stejnou sadou návyků. Personalizace přichází až z dat na první kontrole, ne z dojmu při zařazení.',
    jak: 'Startovní sada je předvyplněná: zapisovat hlavní jídla, držet obvyklou porci ke každé dávce, potvrzovat inzulin k jídlu a dávat bazál každý večer ve stejný čas. Lékař může položku škrtnout nebo přidat další z katalogu (snídaně ve stejném čase, procházka po večeři). Návyky začnou platit až po zaučení u sestry a jedné kontrolní otázce.',
    kde: 'Zařazení a plán › krok 2 Dávky, návyky a pravidla, oddíl 2 · Startovní návyky (lékař); souhrn Návyky v kroku 3 Vydání plánu; Návyky dnes na obrazovce Dnes (pacient).',
    co: 'Složení startovní sady a pravidlo, že je pro všechny stejná.',
    dopad: 'Při zamítnutí lékař startovní sadu nevybere a plán vyjde bez startovních návyků: v zařazení je na jejich místě „Tahle část nefunguje“, sestra v zaučení odškrtá jen pevné body (body k návykům odpadnou), při převzetí plánu, na Dnes v části Návyky dnes a v Plánu je na místě návyků oznámení, přehled před kontrolou návyky nevypíše a nový plán z kontroly je bez nich.',
    dopadSceny: ['enroll', 'doses', 'issue', 'training', 'handover', 'firstMeal', 'lateMeal', 'advice', 'afterBolus', 'hypo', 'custom', 'illness', 'illnessMeal', 'recovery', 'impact', 'preview', 'reviewConfirm', 'newplan', 'nightLow']
  },
  'R-REAKCE': {
    proc: 'Pacient potřebuje vidět, kam se po jeho jídle glukóza dostane – z jeho vlastních dat, ne z tabulek. Bez poctivé definice „co se počítá“ by učení stálo na špatných zápisech.',
    jak: 'Míra „v cíli“ je nejvyšší hodnota (vrchol) 0–{okno_min} minut po jídle proti hornímu cíli pacienta – stejné číslo, jaké vidí na Dnes a jaké vstupuje do návrhu k dávce. Vzestup (vrchol minus hodnota před jídlem) slouží jen ke shodě zápisů při učení a lékař ho vidí v podkladech; kritérium „vzestup nejvýš {vzestup_max|1} mmol/l“ je připravené, ale vypnuté. Jídlo je „známé“, až když se aspoň {minKnown} započítané zápisy z posledních {maxUceni} shodují (rozdíl vzestupů do {shoda_mmol|1} mmol/l); 1. zápis je „první dojem“, 2. „zatím to vypadá“, jen když se shoduje. Když se nový zápis rozchází s dřívějšími o {rozchod_mmol|1} mmol/l a víc, aplikace se v kartě „Jak to dopadlo“ jednou zeptá, co bylo jinak (stejné jídlo · jiná příloha · jiné množství · jinak připravené · neobvyklý den); jiná příloha nebo příprava založí samostatné jídlo, jiné množství i neobvyklý den zápis z učení vyřadí. Kde rozdíl vysvětluje rada (s radou bývá níž), karta jídla to řekne místo otázky. Po {maxUceni} zápisech bez shody je jídlo „nestálé“ a lékař ho vidí v podkladech. V příběhu se otázka ukáže u zpětně zapsané snídaně 13. října. Započítaný zápis má úplná data ze senzoru, inzulin potvrzený podle plánu, je mimo nemoc a mimo „neobvyklý den“, s obvyklou porcí a při stejné dávce. Rozmezí vrcholů: pod {minQuantile} zápisů nejnižší–nejvyšší hodnota, od {minQuantile} zápisů 10.–90. percentil. Popisuje minulost, nepředpovídá.',
    kde: 'Karta jídla a krok 3 před jídlem (stupnice „Kam se po něm glukóza dostávala“, štítek u ní), Dnes (karta „Jak to dopadlo“ s otázkou při rozchodu), report lékaře (Reakce na jednotlivá jídla).',
    co: 'Že „v cíli“ je vrchol proti hornímu cíli pacienta s oknem {okno_min} minut, že shoda zápisů se měří vzestupem, „známé“ až při {minKnown} shodných zápisech z {maxUceni}, jedna otázka, když se vzestup liší o {rozchod_mmol|1} mmol/l a víc, a způsob výpočtu rozmezí.',
    dopad: 'Při zamítnutí aplikace reakci na jídlo u pacienta nevyhodnocuje: karty jídel a krok 3 neukážou rozmezí, stupeň ani to, že je jídlo známé, před jídlem se neradí (rady k jídlu stojí na vyhodnocení), karta „Jak to dopadlo“ ukáže jen nejvyšší hodnotu bez verdiktu v cíli nebo nad cílem a neptá se, co bylo jinak, když se zápis liší od dřívějších (práh je parametr této položky) a v přehledu před kontrolou chybí věta i otázka o tom, s jakou radou bylo jídlo v cíli. Bezpečnostní pravidla (nízká glukóza, méně jídla než obvykle, nemoc) se ukazují dál. Report pro lékaře dál počítá zápisy nad cílem a návrhy k dávce podle vlastních položek „Návrhy k prandiální dávce a radám“ a „Jídla opakovaně nad cílem“, které míru vrcholu do 120 minut proti hornímu cíli samy opakují; tabulka reakcí na jídla v podkladech je bez stupně.',
    dopadSceny: ['training', 'firstMeal', 'week', 'lateMeal', 'advice', 'afterBolus', 'hypo', 'custom', 'illnessMeal', 'impact', 'reviewSummary', 'preview', 'nightLow', 'reviewProposals', 'reviewConfirm', 'reviewHandover', 'newplan']
  },
  'Z-GLUKOZA': {
    proc: 'Napojení na výrobce senzoru by vyžadovalo jeho svolení a certifikaci rozhraní. Pacient hodnoty ze senzoru vidí sám; opsat dvě čísla stačí, aby se aplikace učila a radila.',
    jak: 'V kroku 1 pacient klepne na čip s hodnotou, kterou senzor ukazuje teď (celá čísla 4–15, pod 4, nad 15, nemám); na nejvyšší hodnotu po minulém jídle se aplikace zeptá až v kroku 1 dalšího jídla a večer u bazálu, u zpětného zápisu rovnou na obě. Jeden pohled do senzoru na jídlo; samostatná karta po dvou hodinách není. Vzestup je nejvyšší hodnota minus hodnota před jídlem. „Nemám hodnotu“ zápis uloží, ale nepočítá do učení, dokud ho nedoplní export. Po výběru se mřížka „teď“ sbalí na řádek se „Změnit“ a blok k předchozímu jídlu stojí nad ní, aby se dvě mřížky nepletly (kontrola 4).',
    kde: 'Krok 1 před jídlem (hodnota teď a nejvyšší po minulém jídle), večer u bazálu, karta „Jak to dopadlo“ s poznámkou „Podle hodnot, které jste opsali; na kontrole je upřesníme.“',
    co: 'Že dvě opsané hodnoty jsou dostatečná míra (nejvyšší hodnota do {pripominka_min} minut, ne hodnota přesně ve 2. hodině) a že se na ni aplikace ptá až při dalším jídle. Otázku na nejvyšší hodnotu uvidíte ještě ve scéně „Pacient – před obědem: nejvyšší hodnota po snídani“. Zamítnutí je jen záznam nesouhlasu (viz Co se stane při zamítnutí).',
    dopad: 'Zamítnutí je jen záznam nesouhlasu s mírou: aplikace se na opsané hodnoty ptá dál a u místa, kde je pacient opisuje, to připomene oznámení. Bez opsaných hodnot by aplikace nevěděla o „pod 4“ a „nad 15“ a neukázala by pravidla k nízké a vysoké glukóze; učení i rady by čekaly na export až na kontrole, tedy až tři měsíce. Jinou míru můžete napsat do poznámky (nepovinné).',
    dopadSceny: ['firstMeal', 'firstResult', 'lateMeal', 'afterBolus', 'nightLow']
  },
  'B-HYPO': {
    proc: 'Menší porce po podaném inzulinu a vynechané jídlo s inzulinem jsou nejčastější cesta k nízké glukóze u pevných dávek. Aplikace nesmí radit „sněz víc“ ani měnit dávku, ale nesmí ani mlčet.',
    jak: 'Po menší porci s podaným inzulinem nebo po vynechaném jídle s inzulinem aplikace hned ukáže pravidlo k menší porci a za {pripominka_min} min se zeptá „Klesla glukóza pod 4?“. Po večeři se ptá až ráno v kroku 1 další snídaně („Klesla v noci pod 4?“), protože pokles po večeři bývá mezi 22. a 24. hodinou. U každého jídla se vedle nejvyšší hodnoty ptá i na pokles: „Klesla glukóza do 4 hodin po jídle pod 4 mmol/l?“ (ano, ne, nevím); u zápisu, od kterého ještě neuplynuly 4 hodiny, „Klesla glukóza od jídla zatím pod 4 mmol/l?“. Další jídlo je „na řadě“ nejdřív {dalsi_slot_h} h po posledním, aby se inzulin nehromadil. U snídaně je v kroku 1 pod hodnotou ze senzoru nepovinný čip „V noci klesla glukóza pod 4“ (rozhodnutí vlastníka 1. 11. 2026): žádná nová otázka ani připomínka, pacient se na senzor u snídaně stejně dívá. Noční pokles se počítá do poklesů za {dny} dní a lékař ho na kontrole vidí u návrhu k bazálu a v části Bezpečnost; na noc, na kterou se ráno ptá otázka po menší nebo vynechané večeři, se čip nenabízí. Při {poklesy} poklesech za {dny} dní ukáže na Dnes kartu „Glukóza vám za posledních {dny} dní klesla pod 4 dvakrát“ s obecnou radou: „Při každém poklesu postupujte podle pravidla k nízké glukóze. Mějte u sebe vždy cukr nebo džus. Když sníte méně než obvykle, řiďte se pravidlem „Méně jídla než obvykle“. Dávku inzulinu si sami neměňte, rozhoduje o ní lékař. Když glukóza klesá pod 4 opakovaně, nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal.“ Rada neříká jíst víc ani jíst obvyklou porci a neradí podle porce měnit ani vynechat dávku. Poslední věta (rozhodnutí vlastníka 30. 10. 2026) říká, ať pacient s opakovanými poklesy nečeká tři měsíce; aplikace sama nikam nevolá, nic neposílá a lékař mezi kontrolami nic nesleduje. Věty, které jmenují pravidlo k nízké glukóze nebo „Méně jídla než obvykle“, aplikace vynechá, když dané pravidlo v plánu není. Karta se ukáže znovu s každým dalším poklesem v okně {dny} dní. Hranice 4 mmol/l je pevná. Poklesy vidí lékař na kontrole v části Bezpečnost a v návrhu k dávce: hlášené „pod 4“ se počítá do návrhu „pod cílem“ jako pokles pod dolní cíl 3,9 mmol/l (celé číslo z čipu hodnotu pod 3,9 nevyloučí; v dlaždici času pod 3,9 je jako samostatný údaj, ne v procentech) a pokles u jídla zablokuje u návrhu „nad cílem“ větev „zvýšit“.',
    kde: 'Dnes (otázka „Klesla glukóza pod 4?“ za {pripominka_min} min, karta „Glukóza vám za posledních {dny} dní klesla pod 4 dvakrát“), krok 1 (otázka k minulému jídlu, čip pod 4, u snídaně čip „V noci klesla glukóza pod 4“), zpětný zápis (otázka na pokles), kontrola (podklady, část Bezpečnost; návrh k dávce „pod cílem“; návrh k bazálu s nočními poklesy, které pacient zapsal). V příběhu čip ukazuje scéna „Pacient – 1. ledna ráno: noční pokles pod 4“.',
    co: 'Prahy {poklesy} poklesy / {dny} dní / {pripominka_min} min, otázky na pokles a znění obecné rady po opakovaných poklesech, čip nočního poklesu u snídaně a jeho započítání do poklesů za {dny} dní. Že pokles u jídla zablokuje na kontrole větev „zvýšit“, uvidíte ještě ve scéně „Lékař – krok 2: návrhy s důvodem a postupem“ (návrh k obědu). Návrh autora: rada nevede pacienta k tomu, aby podle porce měnil nebo vynechával dávku, a neradí jíst víc ani jíst obvyklou porci. Větu „Když glukóza klesá pod 4 opakovaně, nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal.“ určil vlastník 30. 10. 2026; schvalujete ji s celým zněním.',
    dopad: 'Při zamítnutí se aplikace na pokles neptá: na Dnes chybí otázka za {pripominka_min} min, v kroku 1 dalšího jídla a ve zpětném zápisu chybí otázka na pokles pod 4 po jídle, u snídaně chybí čip nočního poklesu, noci hlášené pacientem nevstupují do návrhu k bazálu (bez exportu návrh k bazálu z nich nevznikne, s exportem rozhodují jen noci z exportu) a karta s radou po opakovaných poklesech nevznikne; na těchto místech je toto oznámení. Pravidlo k menší porci se ukáže dál. Poklesy po menší porci se nezapíšou, a tak chybí i v přehledu před kontrolou, v části Bezpečnost a v návrhu k dávce (u oběda pak nic nezablokuje větev zvýšit). Pokles pacient zapíše jen čipem „pod 4“; poklesy starší než export ze senzoru lékař na kontrole neuvidí. Karta po odpovědi ano, pod 4 ukáže jen pravidlo k nízké glukóze, počet poklesů ne.',
    dopadSceny: ['firstResult', 'lateMeal', 'hypo', 'illnessMeal', 'reviewSummary', 'preview', 'reviewProposals', 'firstMeal', 'afterBolus', 'nightLow', 'reviewConfirm', 'reviewHandover', 'newplan'] /* C12 (kontrola 3): oběd se i bez B-HYPO ponechá bez poznámky, potvrzení plánu se nezmění. SCHEMA 74: kartu po opakovaných poklesech pacient ve scéně hypo zavřel, další scény ji nenesou */
  },
  'Z-IMPORT': {
    proc: 'Opsané hodnoty stačí k učení, ale lékař potřebuje přesný průběh (vrcholy, noci pro bazál) a pacientovy hodnoty se mohou mýlit. Export ze senzoru jsou pacientova data.',
    jak: 'Během plánu pacient hodnoty opisuje. Od týdne před kontrolou mu Dnes a přehled Před kontrolou připomenou, ať pošle do ordinace export ze senzoru; na kontrole ho sestra nahraje v části „Sestra · Data ze senzoru“. Aplikace export převede a řekne jen „Export nahrán a převeden · doplněno N jídel a N nocí“; soubor, který převést nejde, odmítne obecnou hláškou. Export nahrává jen sestra; pacient v aplikaci nic nenahrává. Měření 0–{po_jidle_min} min po jídle se přiřadí k zápisu, noční hodnoty k noci, spočítá se čas v cíli; opsané hodnoty se nahradí. Bez nahraného exportu report v části Bezpečnost výslovně řekne „Noční hodnoty nejsou k dispozici – bez exportu nelze posoudit noční poklesy.“',
    kde: 'Před kontrolou (připomínka poslat export do ordinace, pacient), kontrola (sestra nahraje export v podkladech).'
  },
  'R-PODOBNOST': {
    proc: 'U jídla, které pacient ještě nejedl, by číslo vypadalo jako předpověď bez opory. Jediný, kdo ví, čemu se nové jídlo podobá, je pacient.',
    jak: 'Při zápisu nového jídla může pacient nepovinně odpovědět na „Podobá se některému jídlu, které už známe?“ (jedno ze známých jídel, nebo „Nic podobného“). Do třetího vlastního zápisu aplikace ukáže jen směr podle podobného jídla, slovem a ikonou (spíš v cíli / spíš nad cílem), bez čísla: „Podobné jídlo bývalo spíš v cíli. Jak je to u tohoto jídla, ukážou vaše zápisy.“ (nebo „spíš nad cílem“). Bez odpovědi se nic neodhaduje. Nové jídlo „jako X“ převezme ze seznamu jídel údaje X pro rady: má-li X bílkovinu nebo tuk, doplněk se nenabízí; je-li X jednolité, nenabízí se pořadí (kontrola 4, B8). Jídla z databáze se k sobě přirovnávají podle předvyplněných údajů při aspoň {minJidel} podobných jídlech, {minZapisu} zápisech (nejvýš {maxNaJidlo} z každého) a shodě aspoň {shoda%}.',
    kde: 'Nové jídlo v kroku 2 před jídlem (otázka „Podobá se některému jídlu, které už známe?“), karta jídla a krok 3 před jídlem (směr „Podle podobného jídla: …“).',
    co: 'Že podobnost určuje jen pacient a že z podobného jídla se ukáže jen směr, bez čísla.',
    dopad: 'Při zamítnutí se na podobné jídlo aplikace neptá (na místě otázky je „Tahle část nefunguje“) a nové jídlo je „neznámé“, dokud ho nepozná z vlastních zápisů: žádný odhad směru a do té doby ani rada k jídlu, protože rady k novému jídlu stojí na odhadu z podobného jídla.',
    dopadSceny: ['custom', 'preview', 'reviewSummary', 'reviewProposals', 'reviewConfirm', 'reviewHandover']
  },
  'R-SKORE': {
    proc: 'Pacient má vědět, jak často po jídle zůstane v cíli – relativně ke svým vlastním jídlům, ne jako známku „dobré / špatné jídlo“.',
    jak: 'Dva stupně: „většinou v cíli“, když je v cíli aspoň {mirna%} započítaných zápisů, jinak „častěji nad cílem“. Tři stupně ze šesti zápisů rozlišit nešlo. Stupeň se ukáže od {odKolika} započítaných zápisů a počítá se z posledních {oknoZapisu}; změní se, jen když by platil, i kdyby jeden zápis dopadl jinak. „Ustálené“ od {ustaleneOd} zápisů. „V cíli“ u jídla znamená totéž co u položky „Vyhodnocení reakce na jídlo“: nejvyšší hodnota 0–{R-REAKCE:okno_min} minut po jídle nejvýš na horním cíli pacienta.',
    kde: 'Karta jídla a krok 3 před jídlem (stupeň reakce se štítkem), report lékaře (Reakce na jednotlivá jídla, sloupec Reakce).',
    co: 'Hranici {mirna%} v cíli, stupeň od {odKolika} zápisů a slova „většinou v cíli / častěji nad cílem“.',
    dopad: 'Při zamítnutí stupeň zmizí z karet i reportu a rady k jídlu se u jídel, která aplikace teprve poznává, nenabízejí; u známých jídel jen ty, které už pacient vyzkoušel.',
    dopadSceny: ['week', 'lateMeal', 'advice', 'afterBolus', 'custom', 'illnessMeal', 'impact', 'reviewSummary', 'nightLow', 'preview', 'reviewProposals', 'reviewConfirm', 'reviewHandover', 'newplan']
  },
  'R-PORCE': {
    proc: 'Pevná dávka je nastavená na obvyklé množství jídla. Jiná porce při stejné dávce vede k vysoké nebo nízké glukóze – a zároveň znehodnotí učení i návrhy k dávce.',
    jak: 'Před píchnutím radí oběma směry zpět k obvyklé porci (větší i menší). Po píchnutí a při „nevím, jestli byl inzulin píchnutý“ jen z větší porce zpět k obvyklé; u menší porce aplikace neradí a ukáže pravidlo „méně jídla než obvykle“. Nikdy neřekne „snězte víc“. Texty rady jsou součástí položky.',
    kde: 'Krok 3 před jídlem (pacient) – karta „Obvyklá porce“ nebo hláška „teď neradíme“ s pravidlem.',
    co: 'Směry rady podle stavu inzulinu, zákaz „snězte víc“ a přesná znění čtyř vět pro pacienta. Chování po píchnutí uvidíte ještě ve scéně „Pacient – po píchnutí: co aplikace smí a nesmí“.',
    dopad: 'Při zamítnutí aplikace k porci neradí vůbec, ani před píchnutím: v kroku 3 je na místě rady „Tahle část nefunguje“ a pacient s větší porcí nedostane nic. Pravidlo „Méně jídla než obvykle“ po menší porci s inzulinem se ukáže dál.',
    dopadSceny: ['advice', 'afterBolus', 'hypo', 'illnessMeal', 'nightLow', 'preview', 'reviewSummary', 'reviewProposals', 'reviewConfirm', 'reviewHandover']
  },
  'R-DOPLNEK': {
    proc: 'Bílkovina nebo tuk přidané k jídlu zpomalí vzestup glukózy, aniž by se z jídla cokoli ubralo. Je to jediná rada, která jídlo mění, a proto musí být výslovně schválená.',
    jak: 'Pacient uvidí např. u kaše: „Přidejte k jídlu bílý jogurt nebo hrst ořechů, pokud vám nevadí. Z jídla nic neubírejte.“ Věty se u jídel nepíšou ručně: doplněk je vždy ze seznamu povolených doplňků této položky (bílkoviny a tuky) a který se nabídne, určuje druh jídla v seznamu jídel: ke sladkému jídlu bílý jogurt nebo hrst ořechů, ke slanému jídlu bez přílohy plátek sýra nebo vejce, k teplému hlavnímu jídlu kousek masa nebo vejce, k novému jídlu bílý jogurt, plátek sýra nebo vejce. Úplný přehled vět u všech jídel je pod parametry. U jídel ze seznamu, která bílkovinu nebo tuk už mají, se nenabízí. Nabízí se u jídla, po kterém je pacient častěji nad cílem (pod {R-SKORE:mirna%} v cíli), nebo kde ji už zkoušel; jen před píchnutím a mimo nemoc. U jídla, kde pacient odpoví „Tentokrát ne · V jídle to není“, se už nenabízí; u jídla, kde ji pacient přijal aspoň {stahnout_po}× se známou nejvyšší hodnotou a ani jednou nebyl v cíli, se stáhne (i u jídla, které aplikace ještě nezná; počítají se i zápisy, které do učení nejdou). Na stupnici jídla se řádek „s doplňkem“ u stažené rady už neukazuje. Účinek se hodnotí stejným oknem jako jídlo samo.',
    kde: 'Krok 3 před jídlem (pacient), karta jídla („Co můžete zkusit“), report lékaři (sloupec „Zkoušené rady (v cíli)“).',
    co: 'Seznam povolených doplňků a jejich přiřazení k druhům jídel (tím schvalujete všechny věty, které pacient uvidí), že doplněk jen přidává a nic nenahrazuje, kdy se smí nabízet a po kolika neúspěších se stáhne.',
    dopad: 'Při zamítnutí rada zmizí ze všech jídel; pacient, který ji dřív přijímal, dostane jednu neutrální větu, že ji teď nenabízíme.',
    dopadSceny: ['firstMeal', 'week', 'lateMeal', 'advice', 'afterBolus', 'hypo', 'custom', 'illnessMeal', 'impact', 'reviewSummary', 'reviewProposals', 'reviewConfirm', 'reviewHandover', 'newplan', 'preview']
  },
  'R-PORADI': {
    proc: 'Pořadí soust mění křivku glukózy bez změny množství: zelenina a bílkovina před přílohou zpomalí vzestup.',
    jak: 'Rada „Snězte nejdřív …, potom zbytek jídla.“ doporučí nejdřív část jídla, která zpomalí vzestup. Věty se u jídel nepíšou ručně: rada jmenuje jen složky ze seznamu této položky (zelenina, maso, ryba, šunka, vejce, sýr, tvaroh) a jen ty, které jídlo podle seznamu jídel opravdu má, nejvýš dvě – u řízku „Snězte nejdřív maso, potom zbytek jídla.“, u lososa se zeleninou „zeleninu a rybu“. U jídla bez takové složky a u jednolitých jídel (kaše, polévky, smíchaná, zapečená nebo zabalená jídla) se nenabízí; u nového jídla zní „zeleninu nebo maso, pokud jsou v jídle“. Úplný přehled vět u všech jídel je pod textem rady. Nabízí se u jídla, po kterém je pacient častěji nad cílem (pod {R-SKORE:mirna%} v cíli), nebo kde ji už zkoušel; před píchnutím i po něm, ne při nemoci; po píchnutí nebo při „nevím“ s menší porcí se nenabídne žádná rada, jejíž text mluví o množství jídla (zásada 3). Složení se nezadává: když pacient odpoví „Tentokrát ne · V jídle to není“, rada se u toho jídla už neukáže.',
    kde: 'Krok 3 před jídlem (pacient), karta jídla, report lékaři; položka má historii úprav textu (scénář 5).',
    co: 'Text rady, seznam složek, které smí jmenovat (tím schvalujete všechny věty, které pacient uvidí), a to, že u nového jídla se vypíná odpovědí pacienta, ne zadáním složení.',
    dopad: 'Při zamítnutí rada zmizí ze všech jídel; pacient, který ji dřív přijímal, dostane jednu neutrální větu, že ji teď nenabízíme.',
    dopadSceny: ['firstMeal', 'lateMeal', 'advice', 'afterBolus', 'hypo', 'custom', 'illnessMeal', 'impact', 'reviewSummary', 'reviewProposals', 'reviewConfirm', 'reviewHandover', 'newplan', 'nightLow', 'preview']
  },
  'R-PROCHAZKA': {
    proc: 'Krátký pohyb po jídle zmírní vzestup glukózy. Po jídle, které už je snědené, je to jediná rada, která ještě dává smysl.',
    jak: 'Rada „Po jídle se asi {minut} minut svižně projděte.“ Před jídlem se nabízí jako jedna z rad, u jídla, po kterém je pacient častěji nad cílem (pod {R-SKORE:mirna%} v cíli), nebo kde ji už zkoušel. Ve zpětném zápisu jen do {okno_min} minut po jídle; později už vrchol neovlivní, nenabízí se a nic se nepočítá do srovnání rad. Nenabízí se při nemoci ani v riziku nízké glukózy: při glukóze pod 4 před jídlem, po menší porci s inzulinem v těle (podaným nebo „nevím“) a ve zpětném zápisu po poklesu pod 4 u toho jídla; ani později než {okno_min} min po jídle.',
    kde: 'Krok 3 před jídlem, zpětný zápis („Co pomůže teď“), návyk „Procházka po večeři“ v plánu, report lékaře.',
    co: 'Znění rady, délku {minut} minut, okno {okno_min} minut ve zpětném zápisu a to, že se v riziku nízké glukózy nenabízí. Návrh autora: rada měření před procházkou nežádá, protože se v riziku nízké glukózy vůbec nenabízí. Nesouhlasíte-li, zamítněte; do poznámky můžete napsat, co změnit (nepovinné).',
    dopad: 'Při zamítnutí rada zmizí před jídlem, po zpětném zápisu i z návrhů na kontrole; návyk procházky po večeři nelze přidat.',
    dopadSceny: ['enroll', 'doses', 'firstMeal', 'week', 'lateMeal', 'advice', 'afterBolus', 'hypo', 'custom', 'illnessMeal', 'impact', 'reviewSummary', 'reviewProposals', 'reviewConfirm', 'reviewHandover', 'newplan', 'nightLow', 'preview']
  },
  'D-CISTA': {
    proc: 'Návrh k dávce smí stát jen na zápisech, u kterých je příčina vysoké nebo nízké glukózy opravdu dávka – ne porce, chybějící inzulin, svačina nebo nemoc. Přesně to lékař při posuzování dávky vylučuje ručně.',
    jak: 'Do návrhu k dávce vstupuje jen čistý zápis: s obvyklou porcí, s inzulinem potvrzeným podle plánu a včas (nejvýš {pred_min} min před jídlem, {po_min} min po něm), mimo nemoc a mimo „neobvyklý den“, s úplnými daty ze senzoru a bez svačiny do {svacina_min} min po jídle. Navíc nevstupuje zpětný zápis s odhadnutým časem, podání až po jídle ani dodatečně opravený inzulin (ty jdou jen do učení jídla). Inzulin lze opravit do {oprava_min} minut po jeho potvrzení.',
    kde: 'Kontrola: značka pod dlaždicemi v kroku 1, návrhy k dávce v kroku 2 („Co návrh oslabuje“ se seznamem vyřazených zápisů); karty jídel (co se počítá), Dnes (karta „Zapsáno · Opravit inzulin“).',
    co: 'Toleranci {pred_min}/{po_min} minut, okno svačiny {svacina_min} minut, {oprava_min} minut na opravu inzulinu a pravidlo, že zpětný a pozdní zápis jdou jen do učení.',
    dopad: 'Při zamítnutí aplikace neumí oddělit čisté zápisy, a proto návrhy k prandiální dávce, které na nich stojí (hodnoty nad cílem a nejdřív rady), nevzniknou; lékař dávku k jídlu posoudí sám z podkladů. Návrh k bazálu, návrhy k radám a „Beze změny“ zůstávají a poklesy po jídle se dál berou ze všech zápisů. Učení jídel u pacienta se nemění.',
    dopadSceny: ['reviewSummary', 'reviewProposals', 'reviewConfirm', 'reviewHandover', 'newplan']
  },
  'D-PRAND': {
    proc: 'Lékař na kontrole potřebuje vědět, u kterého jídla dne data naznačují, že dávka nesedí – s čísly, ne s pocitem. Aplikace přitom nesmí navrhnout směr ani výši.',
    jak: 'Jednotka je jídlo dne (snídaně / oběd / večeře) s rozpadem po jídlech. Okno od poslední změny dávky, nejméně {dny} dní. „Nad cílem“: nejméně {minJidel} čistých jídel, aspoň {podil%} s vrcholem nad horním cílem a medián vrcholu víc než {medianNad|1} mmol/l nad cílem, a to až poté, co pacient aspoň {radyPrve}× přijal radu k jídlu (rady jdou první). Dokud pacient rady většinou odmítá (aspoň {odmitnutiPodil%} odmítnutých z nejméně {odmitnutiMin} nabídek), vznikne místo návrhu k dávce karta „Nejdřív rady“. Když jsou nad cílem hlavně jedno nebo dvě jídla (dvě jídla s nejvíc zápisy nad cílem tvoří aspoň {podilDvouJidel%} zápisů nad cílem a pacient jí ke stejnému jídlu dne i jiné jídlo aspoň 2×, které je v cíli aspoň u 90 % zápisů), bod postupu má štítek „data říkají jinak“ a větev zní „ponechat dávku, řešit jídlo“. „Pod cílem“: nejméně {hypo} poklesy pod dolní cíl do 4 h po jídle a zároveň aspoň {hypoPodil%} jídel (z nejméně {hypoMin}), nebo jediný pokles pod 3,0; nízké hodnoty se berou ze všech zápisů a hlášené „pod 4“ se počítá jako pod dolním cílem. Podíl {hypoPodil%} je podmínka navíc proti dvěma poklesům za tři měsíce; jednotlivé poklesy u jídla přitom zablokují větev „zvýšit“ (postup posouzení dávky). Karta vždy ukazuje čas v cíli, podíl pod cílem a HbA1c. Nízké hodnoty mají přednost před vysokými.',
    kde: 'Kontrola, krok 2 (návrhové karty „Posoudit prandiální dávku“, „Nejdřív rady“ a „Probrat / Vyměnit / Zachovat radu“). Rozpad po jídlech je seřazený podle počtu zápisů nad cílem a bod „Nad cílem nejsou jen jedno nebo dvě jídla“ jmenuje obě jídla, aby šel ověřit.',
    co: 'Všechny prahy ({dny} dní, {minJidel} jídel, {podil%}, +{medianNad|1} mmol/l, {radyPrve} přijaté rady, {odmitnutiPodil%} odmítnutých z {odmitnutiMin} nabídek, {podilDvouJidel%} u jednoho či dvou jídel, {hypo} poklesy / {hypoPodil%} / {hypoMin} jídel, pokles pod 3,0) a pravidlo „rady první“. Prahy jsou návrh autora makety podle běžných titračních postupů.',
    dopad: 'Při zamítnutí aplikace nevytváří návrhy k prandiální dávce ani k radám (posoudit prandiální dávku, nejdřív rady, probrat, vyměnit nebo zachovat radu); na kontrole zůstane návrh k bazálu a „Bezpečnostní pravidla beze změny?“. Lékař posuzuje dávky k jídlu a rady sám z podkladů.',
    dopadSceny: ['reviewSummary', 'reviewProposals', 'reviewConfirm', 'reviewHandover', 'newplan']
  },
  'D-BAZAL': {
    proc: 'Ranní glukóza je zrcadlo bazálu. Noční pokles je nejdůležitější bezpečnostní signál a musí mít přednost před vším ostatním.',
    jak: 'Posuzuje se nejméně {minNoci} nocí za {dny} dní. Když je medián ranních hodnot nalačno nad cílem a žádná noc neklesla pod dolní cíl, vznikne návrh „posoudit bazál – ranní hodnoty nad cílem“. Když aspoň {nociPod} noci klesly pod 3,9 nebo jedna pod 3,0, vznikne návrh „pod cílem“, který má přednost; u jediné hodnoty pod 3,0 karta upozorní, že může jít o artefakt senzoru (tlak na senzor ve spánku). Noc, ve které pacient sám hlásil noční pokles pod 4 (čip u snídaně, nebo odpověď „ano“ na ranní otázku po menší či vynechané večeři), se počítá jako noc pod cílem i bez exportu (rozhodnutí vlastníka 2. 11. 2026); karta u každé noci uvede zdroj. V okně exportu rozhoduje export: noc, kterou export má bez poklesu, se nepočítá a karta řekne, že ji export nepotvrdil. Noc ze zápisu mimo okno exportu se počítá navíc a je i ve jmenovateli posouzených nocí; s exportem musí být posouzených nocí aspoň {minNoci}, bez exportu stačí noci ze zápisu.',
    kde: 'Kontrola, krok 2 (návrhová karta „Posoudit bazální dávku“). V příběhu vznikne z nocí v exportu ze senzoru (pacient je zapsal i sám) návrh „Posoudit bazální dávku – noční hodnoty pod cílem“ s předností.',
    co: 'Prahy {minNoci} nocí, {dny} dní, {nociPod} noci pod 3,9, 1 noc pod 3,0, přednost nízkých hodnot a to, že noční pokles zapsaný pacientem se počítá jako noc pod cílem i bez exportu.',
    dopad: 'Při zamítnutí aplikace bazál neposuzuje: návrh k bazální dávce nevznikne, a když ho zamítnete během kontroly, z kontroly hned zmizí a nepřijímá žádnou akci; další návrh se posune na jeho místo. Lékař má v podkladech jen řádek, kolik dní byl bazál potvrzen.',
    dopadSceny: ['reviewSummary', 'reviewProposals', 'reviewConfirm', 'reviewHandover', 'newplan']
  },
  'D-POSTUP': {
    proc: 'Aplikace nesmí říct „zvyšte“. Když ale lékař-garant schválí svůj vlastní postup posouzení (co ověřit a co z toho plyne), aplikace ho jen aplikuje na data a ukáže větev. Věta „zvýšit“ je pak lékařova, ne aplikace.',
    jak: 'Sedm postupů: bazál pod cílem, bazál nad cílem, prandiální pod cílem, prandiální nad cílem (s body „Nad cílem nejsou jen jedno nebo dvě jídla“, „U jídla nebyl v období pokles pod 4“ a „Opsané nejvyšší hodnoty se shodují s exportem“ – data mu odporují, když se shodují u méně než {shoda_podil%} jídel nebo jich je ke srovnání méně než {shoda_min}; větev „ponechat, posoudit příště z exportu“), „nejdřív rady“, „probrat / vyměnit / zachovat radu“ a „bezpečnostní pravidla beze změny“; všechny body a větve jsou celé níže. Pokles pod 4 u jídla v období (aspoň {poklesy_od}) bod „U jídla nebyl v období pokles pod 4“ podle dat vyvrátí, lékař ho nepřepíná a větev „zvýšit“ je zablokovaná – postup vede na „ponechat dávku, řešit jídlo“. Každý má ověřovací body – věty v jednom smyslu, které musí platit, aby šlo pokračovat; lékař u nich označí sedí / nesedí. U bodu, ke kterému aplikace má data, je číslo z dat (např. čas v cíli a HbA1c); bod, kterému data odporují, má štítek „data říkají jinak“ a hromadné „Vše sedí“ ho nepřepne – lékař ho posoudí sám. Z ověření plyne větev, například „Všechny body sedí: zvýšit dávku“ nebo „Bod 1 nesedí: ponechat, řešit podání“. Každý postup má větev pro každý bod; když nesedí víc bodů, rozhoduje bod s poklesem pod 4, jinak první nesedící bod. Kdyby větev chyběla (např. by ji garant vyřadil novou verzí), aplikace větev nevymýšlí a ukáže „ponechat dávku“ – nikdy zvýšení. Rozhodnutí proti směru větve se zapíše jako „rozhodnuto jinak než postup“. Postup nikdy neobsahuje velikost kroku v jednotkách – tu volí lékař voličem. Body, které z dat ověřit nejde (technika a místo píchání, jídlo mezi jídlem a měřením a pozdě večer, nemoc a stres), projde s pacientem výběrem sestra ještě před lékařem; lékař vidí u bodu „sestra s pacientem: sedí / nesedí“, může odpověď změnit a hromadné „Vše sedí“ tyto body nepřepíná (rozhodnutí vlastníka 30. 10. 2026). Jídlo je „v cíli“, když je v cíli aspoň u {v_cili_podil%} svých zápisů; když bod o vyrovnání sedí jen díky HbA1c o méně než {hba_rezerva} mmol/mol nad cílem, „Co návrh oslabuje“ to řekne.',
    kde: 'Kontrola, krok 2 (oddíly „Ověřit s pacientem“ a „Postup říká“ u každé návrhové karty). V hlavní linii jsou vidět postupy „bazál pod cílem“ (ponechat, řešit večeře), „prandiální nad cílem“ u snídaně (zvýšit) a u oběda (pokles pod 4 → ponechat dávku, řešit jídlo) a „bezpečnostní pravidla beze změny“; „nejdřív rady“ a „probrat / vyměnit radu“ ukazuje dodatek. Ostatní postupy jsou jen v registru (níže).',
    co: 'Znění ověřovacích bodů a větví všech sedmi postupů a to, že pokles pod 4 u jídla v období větev „zvýšit“ zablokuje (práh {poklesy_od}). Jídlo je „v cíli“ (varování v „Co návrh oslabuje“ a bod „nad cílem nejsou jen jedno nebo dvě jídla“), když je v cíli aspoň u {v_cili_podil%} zápisů; „Co návrh oslabuje“ upozorní, když bod o vyrovnání sedí jen díky HbA1c o méně než {hba_rezerva} mmol/mol nad cílem (obojí rozhodnutí vlastníka 2. 11. 2026). Dva postupy (bazál nad cílem, prandiální pod cílem) příběh neukazuje a „nejdřív rady“ a „probrat / vyměnit radu“ jsou až v dodatku; všechny jsou celé v oddílu Jak funguje. Blokaci větve „zvýšit“ poklesem pod 4 uvidíte ještě u návrhu k obědu v této scéně. Schvalujete i znění bodů, které s pacientem projde sestra, a bod o shodě opsaných hodnot s exportem. Nesouhlasíte-li s některou větví, zamítněte; do poznámky můžete napsat, kterou vyřadit nebo jak ji změnit (nepovinné).',
    dopad: 'Při zamítnutí celé položky návrhové karty nemají ověřovací body ani větve postupu: lékař vidí důvod návrhu, co ho oslabuje a čísla z dat, ale postup mu nic neřekne a rozhoduje sám. U jídla, kde byl v období pokles pod 4, se zvýšení dávky i tak zapíše jako rozhodnutí proti datům. Zamítnutí během kontroly karty hned přepočítá. Sestra před kontrolou zjistí jen léky; body postupu se jí nenabízejí.',
    dopadSceny: ['reviewSummary', 'reviewProposals', 'reviewConfirm', 'reviewHandover', 'newplan']
  },
  'R-POKYNY': {
    proc: 'Co dělat při nízké glukóze, při menší porci po píchnutí, při nemoci nebo při nejistotě s inzulinem, si aplikace nevymýšlí. Říkají to obecná pravidla NutriFee, která schvaluje garant. Aby lékař při každém zařazení nic nevybíral ani nepsal, jsou pravidla součástí plánu automaticky.',
    jak: 'Sedm bezpečnostních pravidel je v plánu od začátku, každé jako vlastní položka registru s výchozí hodnotou: nízká glukóza (hranice pevně 4 mmol/l, bez voliče), nevím, jestli byl inzulin píchnutý, méně jídla než obvykle, nemoc zvlášť pro bazál a pro inzulin k jídlu, vysoká glukóza a kontakty. Jsou stejná pro všechny pacienty. Lékař při vydání plánu pravidla vidí sbalená, podepisuje plán jako celek a hodnotu mění jen výjimečně u konkrétního pacienta (výjimky jsou vidět v plánu i na kontrole). Pacient pravidlo vidí ve chvíli, kdy ho potřebuje, bez uvozovek a bez podpisu lékaře, a všechna v Bezpečí s větou „Tato pravidla připravil NutriFee a posoudil je lékař.“ (rozhodnutí vlastníka 30. 10. 2026).',
    kde: 'Zařazení (krok 2, sbalená karta), vydání plánu, kontrola (návrh „Bezpečnostní pravidla beze změny?“), Bezpečí (pacient).',
    co: 'Že bezpečnostní pravidla jsou součást plánu automaticky a lékař podepisuje plán jako celek; znění a hodnoty jednotlivých pravidel schvalujete u každého zvlášť.',
    dopad: 'Bezpečnostní pravidla v plánu, v Bezpečí ani při převzetí nebudou; na jejich místě je toto oznámení. Obrazovky pak na pravidla neodkazují: kde by pacienta poslaly k pravidlu (glukóza pod 4 nebo nad 15, nevím u inzulinu, otázka na pokles), je jen toto oznámení. V Bezpečí chybí i zdravotní cesty v části Kam se obrátit (patří k pravidlu Kontakty); technické cesty (senzor, NutriFee) zůstávají.',
    dopadSceny: ['enroll', 'doses', 'issue', 'training', 'handover', 'afterBolus', 'lateMeal', 'hypo', 'illness', 'illnessMeal', 'recovery', 'impact', 'reviewSummary', 'reviewConfirm', 'nightLow']
  },
  'I-HYPO': {
    proc: 'Nízká glukóza je u pevných dávek nejnebezpečnější situace a aplikace si nesmí vymýšlet, co jíst. Říká to pravidlo schválené garantem.',
    jak: 'Pacient uvidí: „Když glukóza klesne pod 4 mmol/l, hned vypijte asi 1,5 dl džusu nebo snězte 3–4 kostky cukru. To je léčba nízké glukózy, ne rada k jídlu. Platí to i tehdy, když se cítíte jako při nízké glukóze (třes, pocení, hlad, zmatenost) a senzor ukazuje víc. Za 15 min glukózu změřte znovu; když se cítíte jinak, než ukazuje senzor, změřte ji glukometrem z prstu. Když je pořád pod 4 mmol/l, dejte si džus nebo cukr ještě jednou a za 15 min změřte znovu; když je pod 4 mmol/l i potom, volejte záchrannou službu. Když je glukóza zase nad 4 mmol/l a další jídlo máte až za víc než hodinu, snězte krajíc chleba nebo jinou malou svačinu. Kdo je zmatený, nemůže polknout nebo je v bezvědomí, nesmí nic dostat do úst: okolí volá záchrannou službu. Řekněte to i svým blízkým. Když glukóza klesá pod 4 opakovaně, nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal.“ Hranice je pevně 4 mmol/l, stejné číslo jako u čipů, otázek a karty po opakovaných poklesech; volič nemá. Lékař v reportu pracuje s dolním cílem 3,9 mmol/l (položka Cíle glukózy); hlášené „pod 4“ se tam počítá jako pod dolním cílem. Cukr a svačina po poklesu jsou léčba nízké glukózy, ne rada k porci (zásada 3).',
    kde: 'Krok 1 před jídlem (hned pod čipem „pod 4“), Dnes (karta po odpovědi „ano, pod 4“ na otázku „Klesla glukóza pod 4?“), Bezpečí; plán v zařazení (lékař).',
    co: 'Úplné znění pravidla (návrh autora): množství džusu nebo cukru, že platí i podle příznaků, když senzor ukazuje víc (senzor se za krví zpožďuje), glukometr z prstu při nesouladu, opakování po 15 minutách, malou svačinu po úpravě, když je další jídlo daleko, kdy volat záchrannou službu a poslední větu o opakovaných poklesech (rozhodnutí vlastníka 30. 10. 2026); k volání do ordinace pravidlo nevyzývá. Akarbóza je vylučovací kritérium (Podmínky zařazení), protože při ní cukr ani džus nepůsobí spolehlivě. Hranici 4 mmol/l neměníte, je společná pro celou aplikaci. Nesouhlasíte-li, zamítněte; do poznámky můžete napsat, čím znění nahradit (nepovinné).',
    dopad: 'Při zamítnutí pacient po klepnutí na „pod 4“ ani u otázky na pokles nevidí žádné pravidlo, jen toto oznámení, a v Bezpečí chybí; obrazovka na pravidlo neodkazuje. Věty jiných textů, které na pravidlo k nízké glukóze odkazují, aplikace vynechá: v pravidlech Méně jídla než obvykle, Nevím, jestli byl inzulin píchnutý, Nemoc: inzulin na noc (bazál) a v kartě po opakovaných poklesech (kontrola 4, B6).',
    dopadSceny: ['enroll', 'doses', 'issue', 'training', 'handover', 'afterBolus', 'hypo', 'illness', 'illnessMeal', 'recovery', 'reviewSummary', 'reviewConfirm', 'nightLow']
  },
  'I-MENE': {
    proc: 'Menší porce po už píchnutém inzulinu je jediná situace, kterou aplikace sama vyvolá a která může vést k nízké glukóze. Aplikace nesmí říct „snězte víc“; místo toho ukáže toto pravidlo.',
    jak: 'Pacient uvidí: „Když sníte méně než obvykle a inzulin už je píchnutý, změřte glukózu za {v} min. Když je pod 4 mmol/l, postupujte podle pravidla k nízké glukóze. Po alkoholu a po větší námaze než obvykle (sport, práce na zahradě) může glukóza klesnout i za několik hodin, i v noci. Mějte u sebe cukr a před spaním se podívejte na senzor.“ Věta o alkoholu a námaze (kontrola 4) neříká jíst víc. Pravidlo se ukáže vždy, i když je vyhodnocení reakce nebo rada k jídlu zamítnutá nebo pacient ještě nepřevzal plán: bezpečnostní větev na radách nezávisí. Za {v} minut se aplikace na Dnes zeptá „Klesla glukóza pod 4?“ (položka „Nízká glukóza: sledování a opakované poklesy“).',
    kde: 'Krok 3 před jídlem (menší porce po píchnutí), Dnes (karta „Méně jídla než obvykle“ po menší porci nebo vynechaném jídle s inzulinem), Bezpečí; plán v zařazení (lékař).',
    co: 'Znění pravidla včetně věty o alkoholu a větší námaze a výchozí interval {v} minut.',
    dopad: 'Při zamítnutí pacient po menší porci nevidí žádné pravidlo: v kroku 3 i na Dnes je na jeho místě „Tahle část nefunguje“ a obrazovka na pravidlo neodkazuje; větu „řiďte se pravidlem „Méně jídla než obvykle““ aplikace vynechá i z karty po opakovaných poklesech a z nové verze rady k pořadí. Otázka na pokles zůstává.',
    dopadSceny: ['enroll', 'doses', 'issue', 'training', 'handover', 'afterBolus', 'hypo', 'illness', 'illnessMeal', 'recovery', 'impact', 'reviewSummary', 'reviewConfirm']
  },
  'I-NEVIM': {
    proc: 'Dvojí dávka je nebezpečnější než vynechaná. Když pacient neví, jestli si píchl, musí dostat jasné pravidlo: nepíchat znovu a měřit.',
    jak: 'Pacient uvidí: „Když nevíte, jestli byl inzulin už píchnutý, znovu ho nepíchejte. Změřte glukózu za {v} min a řiďte se pravidlem k vysoké nebo nízké glukóze.“ Zápis s „nevím“ se do učení nepočítá.',
    kde: 'Krok 1 před jídlem (hned pod odpovědí „Nevím“), Bezpečí (pacient); plán v zařazení (lékař).',
    co: 'Znění pravidla a výchozí interval {v} minut.',
    dopad: 'Při zamítnutí pacient po odpovědi Nevím nevidí žádné pravidlo, jen toto oznámení; obrazovka na pravidla v Bezpečí neodkazuje. (Když chybí pravidlo k nízké nebo k vysoké glukóze, aplikace z tohoto pravidla vynechá odkaz na to, které chybí.)',
    dopadSceny: ['enroll', 'doses', 'issue', 'training', 'handover', 'afterBolus', 'illness', 'illnessMeal', 'recovery', 'reviewSummary', 'reviewConfirm']
  },
  'I-NEMOC-BAZAL': {
    proc: 'Při nemoci se bazál píchá dál, i když pacient nejí. Jeden společný text pro nemoc sváděl bazál vynechat, proto je pravidlo pro bazál zvlášť.',
    jak: 'Pacient uvidí: „Bazál si píchejte dál ve stejný čas, i když nejíte. Pijte a měřte glukózu každé {v} h. Když je pod 4 mmol/l, řiďte se pravidlem k nízké glukóze; když klesá opakovaně, vyhledejte ještě ten den lékařskou pomoc.“ Bez pravidla k nízké glukóze v plánu zní konec „Když glukóza klesá pod 4 mmol/l opakovaně, vyhledejte ještě ten den lékařskou pomoc.“ Po zapnutí „Není mi dobře“ je nahoře na Dnes vedle pravidla k inzulinu k jídlu.',
    kde: 'Dnes při nemoci (nahoře vedle druhého pravidla pro nemoc), Bezpečí; plán v zařazení (lékař).',
    co: 'Znění pravidla (návrh autora, kontrola 4: nemocný bez jídla s plným bazálem může klesat) a výchozí interval měření {v} hodin.',
    dopad: 'Při zamítnutí pacient při nemoci nevidí pravidlo k bazálu.',
    dopadSceny: ['enroll', 'doses', 'issue', 'training', 'handover', 'illness', 'illnessMeal', 'recovery', 'reviewSummary', 'reviewConfirm']
  },
  'I-NEMOC-JIDLO': {
    proc: 'Inzulin k jídlu se při nemoci řídí opačně než bazál: jen když pacient jí. Pacient má znát i hranici vysoké glukózy při nemoci.',
    jak: 'Pacient uvidí: „Když jídlo vynecháte, inzulin k němu nepíchejte. Když jíte, píchněte podle plánu. Pijte často po malých doušcích. Když zvracíte a nemůžete pít, nebo je glukóza déle než 3 hodiny nad {v} mmol/l, vyhledejte ještě ten den lékařskou pomoc. Berete-li i tablety na cukrovku, při zvracení, průjmu nebo když nemůžete pít, se ještě ten den poraďte s lékařem, které z nich vynechat. Když jste zmatení nebo se vám těžce dýchá, volejte záchrannou službu.“ K volání do ordinace aplikace nevyzývá; záchranná služba při ohrožení života je informace z kontaktů.',
    kde: 'Dnes při nemoci (nahoře vedle druhého pravidla pro nemoc), Bezpečí; plán v zařazení (lékař).',
    co: 'Znění pravidla (návrh autora: pití, kdy vyhledat lékařskou pomoc a kdy záchrannou službu, a že při zvracení nebo průjmu se některé tablety na cukrovku přerušují) a výchozí hranici {v} mmol/l. Nesouhlasíte-li, zamítněte; do poznámky můžete napsat, čím znění nahradit (nepovinné).',
    dopad: 'Při zamítnutí pacient při nemoci nevidí pravidlo k inzulinu k jídlu.',
    dopadSceny: ['enroll', 'doses', 'issue', 'training', 'handover', 'illness', 'illnessMeal', 'recovery', 'reviewSummary', 'reviewConfirm']
  },
  'I-VYSOKA': {
    proc: 'Aplikace živou glukózu nesleduje a nikoho neupozorňuje; upozornění na nízkou a vysokou glukózu si pacient nastaví se sestrou v aplikaci senzoru. Když ale pacient klepne na čip „nad 15“, aplikace o vysoké hodnotě ví a pravidlo mu hned ukáže.',
    jak: 'Pacient uvidí: „Když je glukóza nad {v} mmol/l, vypijte sklenici vody a pijte dál po malých doušcích. Za 2 hodiny glukózu změřte znovu. Inzulin navíc si nepíchejte a dávky neměňte. Když je glukóza i potom nad {v} mmol/l a vydrží tam déle než 3 hodiny, vyhledejte ještě ten den lékařskou pomoc. Když zvracíte, jste zmatení nebo se vám těžce dýchá, volejte záchrannou službu.“ Další krok je stejný jako v pravidle pro nemoc. U hodnoty z minulosti (nejvyšší po jídle, zpětný zápis) aplikace současnou hodnotu nezná, proto nad pravidlem stojí „Podívejte se, kolik ukazuje senzor teď. Když je glukóza pořád nad {v} mmol/l, řiďte se tímto pravidlem:“. Pohyb při vysoké glukóze neradíme. Pravidlo se ukáže hned po klepnutí na čip „nad 15“ (glukóza teď před jídlem nebo nejvyšší po jídle) a zobrazení se zapíše do stopy; v Bezpečí je vždy. K volání do ordinace aplikace nevyzývá.',
    kde: 'Krok 1 před jídlem a zpětný zápis (hned pod čipem „nad 15“; v příběhu u zpětně zapsané snídaně 13. října), Bezpečí (pacient), seznam pravidel v plánu při zařazení (lékař).',
    co: 'Znění pravidla (návrh autora: pít, za 2 hodiny změřit znovu, inzulin navíc nepíchat, když je glukóza i potom nad hranicí a vydrží tam déle než 3 hodiny, ještě ten den lékařská pomoc, při zvracení, zmatenosti nebo dušnosti záchranná služba), úvodní větu u hodnoty z minulosti a výchozí hranici {v} mmol/l. Nesouhlasíte-li, zamítněte; do poznámky můžete napsat, čím znění nahradit (nepovinné).',
    dopad: 'Při zamítnutí pacient po klepnutí na „nad 15“ nevidí žádné pravidlo, jen toto oznámení, a v Bezpečí chybí; obrazovka na pravidla v Bezpečí neodkazuje. Z pravidla Nevím, jestli byl inzulin píchnutý, aplikace vynechá odkaz na pravidlo k vysoké glukóze.',
    dopadSceny: ['enroll', 'doses', 'issue', 'training', 'handover', 'lateMeal', 'afterBolus', 'illness', 'illnessMeal', 'recovery', 'reviewSummary', 'reviewConfirm']
  },
  'I-KONTAKT': {
    proc: 'Aplikace nikam nevolá, nic neposílá a k volání sama nevyzývá. Pacient ale má mít po ruce, kam se se zdravotními potížemi obrátit, když to sám potřebuje.',
    jak: 'Pacient uvidí: „Zdravotní potíže: v ordinační době ordinace, mimo ni pohotovost. Bezvědomí, křeče nebo dušnost: záchranná služba.“ Je to jen přehled kontaktů; žádná karta ani rada na něj pacienta neposílá.',
    kde: 'Bezpečí, zaučení (bod „ví, kam se obrátit s technickým problémem a kam se zdravotním“); plán v zařazení (lékař).',
    co: 'Přehled kontaktů: ordinace, pohotovost a záchranná služba.',
    dopad: 'Při zamítnutí chybí v Bezpečí karta Kontakty i zdravotní cesty v části Kam se obrátit (ordinace, pohotovost, záchranná služba); na jejich místě je toto oznámení. Technické cesty (senzor, NutriFee) zůstávají, nejsou klinické.',
    dopadSceny: ['enroll', 'doses', 'issue', 'training', 'handover', 'illness', 'illnessMeal', 'recovery', 'reviewSummary', 'reviewConfirm']
  },
  'Z-BODY': {
    proc: 'Zaučení bez pohledu na to, co pacient skutečně umí, je jen odškrtávání. Body zaučení se skládají z návyků v plánu, protože s návykem souvisí to, co má pacient umět.',
    jak: 'Tři pevné body (našel Dnes, našel bezpečnostní pravidla v Bezpečí, ví, kam se obrátit s technickým problémem a kam se zdravotním), body, které sestra ověří ústně (pacient ví, že před kontrolou pošle do ordinace export ze senzoru; má v aplikaci senzoru zapnuté upozornění na nízkou glukózu; vybral se sestrou časy připomínek v telefonu a ví, že připomínka nemusí přijít), body podle návyků plánu (zapsal zkušební jídlo, ví o radě k porci, ví o otázce na inzulin, našel připomínku bazálu). Sestra zaškrtává, co pacient udělal sám; „Náhled“ přepne náhled telefonu na příslušnou obrazovku. Dokončit lze až po všech bodech; „nezdařilo se“ s důvodem vidí lékař v zařazení a na kontrole.',
    kde: 'Zaučení (sestra); stav zaučení v zařazení a v podkladech kontroly (lékař).'
  },
  'J-DATABAZE': {
    proc: 'Pacient vybírá jídlo jménem, ne složením. Bez seznamu běžných jídel by musel všechno zakládat ručně.',
    jak: 'Asi 200 běžných českých jídel a hotovek. U každého jídla jsou jen strukturované údaje: které části jde sníst napřed, jestli už má bílkovinu nebo tuk, jestli je jednolité a druh jídla pro doplněk. Věty rad z nich skládají schválené položky „Rada: pořadí jídla“ a „Rada: doplněk k jídlu“; ručně psané texty rad u jídel nejsou. Vnitřní údaje pacient nevidí a u vlastního jídla je nezadává. Hledání od začátku slova, „naposledy“, vlastní jídlo jen názvem. V maketě je seznam syntetický; skutečný zdroj a licence se vyberou pro studii.',
    kde: 'Krok 2 před jídlem (výběr jídla), Jídla (karty).'
  },
  'J-STITKY': {
    proc: 'Pacient hotová a domácí jídla nezná složením, ale jménem a rutinou. Aplikace se učí z reakce těla, k tomu složení nepotřebuje; složky s množstvím („hrst, pěst“) mají chybu 30–50 % a působí jako počítání.',
    jak: 'Nové jídlo pacient zadá jen názvem (našeptávač od pár písmen) a nepovinně odpoví na „Podobá se některému jídlu, které už známe?“ (jedno ze známých jídel, nebo „Nic podobného“). Nic dalšího: žádný zdroj sacharidů, úprava, talíř, velikost. Na porci (obvyklá, větší, menší) se ptáme až při jídle; první zápis ukotví obvyklou. Když se název podobá jídlu v seznamu, přijde dotaz „Je to stejné jídlo jako „X“ ve vašem seznamu?“ (Ano, je to ono / Ne, přidat jako nové jídlo). Co v jídle je, se aplikace dozví z odpovědí na rady: „Tentokrát ne · V jídle to není“ radu u jídla vypne.',
    kde: 'Před jídlem, krok 2 (pacient), když jídlo v seznamu není.'
  },
  'S-SOUHRN': {
    proc: 'Lékař potřebuje jednu větu „co se dělo“ hned nahoře reportu – ze šablony podle pravidel, ne z generativní AI. A srovnání „s radou vs. bez rady“ nesmí tvrdit víc, než data unesou.',
    jak: 'Věta se skládá z podílu obvyklé porce, potvrzení inzulinu, přijatých rad a času v cíli. Srovnání mediánu vrcholu s radou a bez ní se počítá per rada a říká se jen od {min_n} zápisů s radou a {min_n} bez ní u téže rady a při rozdílu nejméně {rozdil_mmol|1} mmol/l; jinak „zatím nelze říct“. Pacient si volí, kdy radu přijme, takže srovnání není důkaz účinku – proto neutrální „s radou bývalo níž“ bez fajfky.',
    kde: 'Kontrola, krok 1 (věta „Co se dělo“, dlaždice „S radou bývalo níž?“); návrhy „zachovat radu“ v kroku 2; report před kontrolou u pacienta (přehled).'
  },
  'S-VYSLEDEK': {
    proc: 'Pacient má vidět, jak dopadlo to, co udělal, ve chvíli, kdy je to známé. Jinak se smyčka učení neuzavře. Hodnota ale není jeho zásluha ani vina, proto se říká věcně a díky patří činu.',
    jak: 'Po příchodu dat ze senzoru jedna karta na Dnes: „nejvyšší hodnota X, v cíli / nad cílem“ a poděkování podle činu. U zápisu, který se do učení nepočítá (jiná porce, nepotvrzený inzulin, nemoc), karta neukáže číslo ani verdikt – jen důvod a u menší porce pravidlo. Věta „bez toho u vás bývá …“ až od {min_n} zápisů s radou a {min_n} bez ní.',
    kde: 'Dnes (pacient) po každém jídle s daty.'
  },
  'R-DIKY': {
    proc: 'Pochvala za číslo by učila honit čísla a jíst méně, „abych byl v cíli“. Poděkování patří tomu, co pacient udělal.',
    jak: 'Po uložení jídla se ukáže jedna věta podle činu: za přijatou radu, za návrat z větší porce k obvyklé, za zpětné doplnění, nebo jen „Zapsáno“ u běžného zápisu. Nikdy podle hodnoty glukózy. Znění jsou součástí položky.',
    kde: 'Hláška po uložení jídla (pacient).'
  },
  'R-MILNIKY': {
    proc: 'Mezi kontrolami (3 měsíce) pacient potřebuje vidět, že má smysl pokračovat. Milníky chválí vytrvalost a návyk, nikdy číslo. Body, série s trestem a známky byly zavrženy.',
    jak: 'Na Dnes se jednou ukáže karta, když nastane některý z milníků: jídlo poznáno (aplikace ho zná po {R-REAKCE:minKnown} shodných zápisech), rada zdomácněla (3× po sobě přijata), týden bez mezery, obvyklá porce 10× po sobě, všechna častá jídla známe, nebo zpětně doplněno 5×. U svačin se milník „známe“ neukáže (není k nim rada). Milníky nejdou do reportu lékaře.',
    kde: 'Dnes (karta) a Plán (přehled milníků) – pacient.'
  },
  'S-CESTA': {
    proc: 'Dlouhodobý cíl musí být vidět: aplikace se učí pacientova jídla a na kontrole z toho lékař rozhodne. Pacient nic nepočítá.',
    jak: 'Karta na Dnes a v Plánu ukazuje pruh dní do kontroly, větu „Vašich častých jídel známe X z N“ (jídla jedená aspoň 2×), tkaninu posledních 7 dní (zapsáno, vynecháno se zápisem, bez zápisu) a větu o tom, co se na kontrole stane. Čísla jsou ve tvaru „X z N“, nikdy jako procenta, aby nepůsobila jako hodnocení.',
    kde: 'Dnes, Plán, převzetí plánu (pacient).'
  },
  'S-TYDEN': {
    proc: 'Mezi kontrolami není žádný rytmus, kde by pacient viděl postup. Týdenní shrnutí je jediné místo pro „co zkusit příští týden“ z vlastních dat.',
    jak: 'Každých 7 dní od vydání plánu karta „Váš N. týden“: kolik z 21 jídel je zapsáno, kolik z nich v obvyklé porci, co pomohlo (rada a kolikrát s ní bylo jídlo v cíli) a případný milník. Nabídka na příští týden je připravená, ale pro studii vypnutá: rada má přicházet jen před jídlem, aby šel změřit její účinek. Jen u pacienta, nejde do reportu.',
    kde: 'Dnes (pacient), jednou týdně od vydání plánu, dokud ji nezavře.'
  },
  'R-ZMIZELA': {
    proc: 'Když garant radu zamítne, nesmí pacientovi prostě zmizet beze slova, pokud ji dřív u jídla přijímal – ale o garantovi se nemluví.',
    jak: 'U jídla, kde pacient zamítnutou radu dřív přijal, se jednou ukáže věta „Radu „X“ teď nenabízíme. Vaše dávky se tím nemění.“ U ostatních jídel rada jen zmizí.',
    kde: 'Krok 3 před jídlem (pacient) po zamítnutí rady v registru.'
  },
  'S-SEMAFOR': {
    proc: 'Lékař potřebuje na první pohled vědět, jak na tom pacient celkově je. Semafor času v cíli je běžný konsenzuální ukazatel.',
    jak: 'Semafor je zelený, když čas v cíli dosahuje cíle pacienta a čas pod dolním cílem je pod mezí pacienta – obojí z položky Cíle glukózy (běžné cíle: aspoň {C-CILE:tirGoal} % a méně než {C-CILE:tbrGoal} % času; mírnější cíle pro starší a křehké: aspoň {C-CILE:tirGoalMirnejsi} % a méně než {C-CILE:tbrGoalMirnejsi} %). Oranžový je při čase v cíli od {tir_zluta} % do cíle pacienta. Červený je při čase v cíli pod {tir_zluta} %, nebo když je pod dolním cílem aspoň tolik času, kolik připouští cíl pacienta, nebo pod 3,0 aspoň {tbr3_max} % času. Zelená hranice je tak jedna hodnota pro pacienta, ne dvě (kontrola 4, C15). Semafor potřebuje aspoň {min_dni} dní dat. Stejná položka nese prahy dalších dlaždic kontroly: „Obvyklá porce“ je v pořádku od {porce_ok%}, oranžová pod {porce_ok%} a výrazná pod {porce_varovani%}; „Inzulin podle plánu“ stejně ({inzulin_ok%} / {inzulin_varovani%}); „Mimo učení“ je oranžová od {mimo_dni} dní. Všechny hranice jsou parametry.',
    kde: 'Kontrola, krok 1 (dlaždice Čas v cíli, Obvyklá porce, Inzulin podle plánu, Mimo učení; značky pod dlaždicemi); návrhové karty (kontext „celkové vyrovnání“).',
    co: 'Že zelená hranice a mez času pod cílem jsou cíle pacienta (položka Cíle glukózy), oranžovou hranici {tir_zluta} % a mez pod 3,0 ({tbr3_max} %), že červená má přednost při jakémkoli překročení dolních hranic, nejméně {min_dni} dní dat a prahy dlaždic Obvyklá porce, Inzulin podle plánu a Mimo učení a že slovo „zlepšuje se / zhoršuje se“ u procent platí až od rozdílu {smer_pb} procentních bodů (rozhodnutí vlastníka 2. 11. 2026), jinak „beze změny“. V příběhu je čas v cíli 68 % – oranžová „blízko cíle“, zlepšuje se proti 58 %; čas pod 3,9 se změnil o 1 bod, a tak „beze změny“.',
    dopad: 'Při zamítnutí dlaždice souhrnu kontroly (čas v cíli, čas pod 3,9, obvyklá porce, inzulin podle plánu, mimo učení) nemají semafor ani barvu: ukazují jen hodnotu a srovnání dříve a teď, s oznámením „Tahle část nefunguje“. Hranice zapsané v kódu se pro hodnocení nepoužijí.',
    dopadSceny: ['reviewSummary']
  },
  'P-NEMOC': {
    proc: 'Při nemoci glukóza stoupá bez ohledu na jídlo. Zápisy z nemoci by zkreslily učení i návrhy k dávce a rady k jídlu by byly zavádějící. Nemoc ale musí hlásit a ukončit pacient – lékař mezi kontrolami nic nedělá.',
    jak: 'Nahoře na Dnes je přepínač „Není mi dobře“. Během nemoci se zápisy označí a nepočítají, rady k jídlu se nedávají, nahoře jsou pravidla pro nemoc a každý den přijde dotaz s tlačítkem „Už je mi lépe“. Když nemoc trvá déle než {dny} dny (při výchozí hodnotě od 4. dne), ukáže se karta „Nemoc trvá už …“ s pravidlem k nemoci; období delší než {dny} dny jsou v reportu v části Bezpečnost. Ukončuje pacient.',
    kde: 'Dnes (přepínač „Není mi dobře“ se štítkem, pravidla, karta nemoci), krok 3 před jídlem (bez rad), kontrola (dlaždice „Mimo učení“, Bezpečnost).',
    co: 'Pravidlo „žádné rady k jídlu při nemoci“, práh {dny} dnů a to, že nemoc ukončuje pacient. Jídlo při nemoci a ukončení nemoci uvidíte ještě ve scénách „Pacient – jídlo během nemoci“ a „Pacient – už je mi lépe“.',
    dopad: 'Při zamítnutí je místo přepínače „Není mi dobře“ oznámení „Tahle část nefunguje“; zápisy z nemoci vstupují do učení i do návrhů k dávce.',
    dopadSceny: ['issue', 'training', 'handover', 'firstMeal', 'lateMeal', 'advice', 'afterBolus', 'hypo', 'custom', 'illness', 'illnessMeal', 'recovery', 'impact', 'reviewSummary', 'reviewProposals', 'newplan', 'nightLow']
  },
  'P-LEKAR': {
    proc: 'Zásada „nikdo pacienta průběžně nesleduje“ platí i pro lékaře. Práce mezi kontrolami by ho odradila a vytvořila falešný dojem dohledu.',
    jak: 'Všechny akce lékaře probíhají jen s pacientem v ordinaci: zařazení, kontrola, vydání plánu. Mezi kontrolami lékař nic nevidí ani nedostává upozornění; nemoc ukončuje pacient, výpadek dat končí sám. Jediná akce mimo kontrolu je registr garanta. (V ostrém provozu se data ukládají na zabezpečený server studie; to na zásadě nic nemění – lékař je čte až na kontrole.)',
    kde: 'Celá aplikace; výslovně věta „Aplikace vám mezi kontrolami nic neposílá a nic po vás nežádá.“ při vydání plánu (lékař, obrazovka Zařazení a plán, krok 3), věta „Vaše zápisy uvidí lékař až s vámi na kontrole“ na Dnes (pacient) a odpověď na kontrolní otázku při převzetí plánu; obrazovka lékaře „Pacient je zařazený“ (v příběhu se neukazuje).',
    co: 'Zásadu samu a její důsledky: žádné upozornění lékaři mezi kontrolami, žádné průběžné čtení dat.',
    dopad: 'Položka je zásada, ne výpočet: zamítnutí v maketě nic nevypne, je to jen záznam nesouhlasu v historii. Je to podnět k debatě, ne změna chování.',
    dopadSceny: []
  },
  'S-PODPORA': {
    proc: 'Pacient musí vědět, kam se obrátit, když nefunguje senzor, aplikace, nebo když mu není dobře. Aplikace sama nikam nevolá ani nic neposílá; lékař mezi kontrolami nic nesleduje.',
    jak: 'Bezpečí rozlišuje čtyři cesty: se zdravotními potížemi ordinace (mimo ordinační dobu pohotovost), při ohrožení života záchranná služba, při potížích se senzorem podpora výrobce (kontakt je na balení nebo v aplikaci senzoru), při potížích s NutriFee kontaktní formulář v aplikaci (výběr potíže a nepovinný popis). Formulář čte technická podpora, ne lékař, a obrazovka to říká. V ukázce se nic neposílá.',
    kde: 'Bezpečí a formulář podpory (pacient), zaučení (bod „ví, kam se obrátit s technickým problémem a kam se zdravotním“).'
  },
  'S-PRIPOMINKY': {
    proc: 'Pacient, který občas zapomíná, otevře aplikaci jednou nebo dvakrát denně. Bez připomínky chybí zápisy i odpověď na otázku po menší porci a učení i report stojí na mezerách.',
    jak: 'Nejvýš {max_denne} připomínky denně jako oznámení telefonu, bez sítě: k snídani, obědu, večeři a k bazálu, v časech, které pacient vybere se sestrou při zaučení. Navíc jednorázová otázka „Klesla glukóza pod 4?“ za {B-HYPO:pripominka_min} min po menší porci nebo vynechaném jídle s podaným inzulinem. Připomínka je otázka („Chystáte se k obědu? Otevřete NutriFee a oběd zaznamenejte.“), ne pokyn k dávce, a jen otevře Dnes; k jídlu, které je už zapsané nebo vynechané, nepřijde. Pacient ji v Plánu vypne nebo zapne; lékař nic nenastavuje. Připomínka nemusí přijít (vypnutý nebo ztlumený telefon); pacient ze zaučení ví, že inzulin si píchá podle plánu i bez ní.',
    kde: 'Zaučení (sestra s pacientem vybere časy), Plán (pacient připomínky vypne nebo zapne), oznámení telefonu (v ukázce nad obrazovkou pacienta).'
  },
  'S-DAVKA': {
    proc: 'Pacient se v okamžiku píchání řídí číslem na displeji. Když opakovaně píchá jinou dávku, než je v plánu, plán a skutečnost se rozcházejí; lékař to má vědět na kontrole. Lékař je vždy jen jeden.',
    jak: 'U dávky v kroku 1 a u bazálu stojí „Podle plánu z 5. 10.: 8 j.“ Když pacient u téhož jídla dne {po_sobe}× po sobě zapíše jinou dávku než v plánu, ukáže se na Dnes karta „Jiná dávka než v plánu“ s větou „Dvakrát jste zapsali jinou dávku než v plánu. Řekněte to prosím na kontrole sestře.“ Aplikace dávku nemění ani nenavrhuje a neptá se proč.',
    kde: 'Krok 1 před jídlem, karta bazálu na Dnes, karta po dvou zápisech jiné dávky na Dnes (pacient).'
  },
  'S-SILNA': {
    proc: 'Jídlo, po kterém pacient opakovaně skončí nad cílem, je informace pro lékaře – ale lékař nesmí na kontrole probírat dvacet jídel a jejich složení.',
    jak: 'Jedna věta v podkladech kontroly: kolik jídel je opakovaně nad cílem a kolik zápisů nad cílem celkem. Věta jmenuje nejvýš {maxJidel} jídla s nejvíc zápisy nad cílem; úplný seznam je v podkladech pod „Další“. Práh: aspoň {silnych} zápisy s nejvyšší hodnotou nad cílem a zároveň jídlo častěji nad cílem (v cíli méně než {R-SKORE:mirna%} zápisů), takže jídlo většinou v cíli se mezi ně nedostane; u jídla, které má zatím jen dva zápisy, stačí oba nad cílem, když je u obou i vzestup (nejvyšší hodnota minus hodnota před jídlem) aspoň {R-REAKCE:vzestup_max|1} + {dvaNad_mmol|1} mmol/l. Řádky jídel ukazují medián vzestupu. Aplikace u těchto jídel nabízí pacientovi rady (porce, pořadí, doplněk, procházka) a jídlo sama nenabízí. Pacientovi žádný zákaz ani „jezte méně“.',
    kde: 'Kontrola, krok 1, podklady: „Jídla opakovaně nad cílem“.',
    co: 'Práh, počet jídel ve větě a to, že lékař o jídlech nerozhoduje – rozhoduje o dávce a plánu.',
    dopad: 'Při zamítnutí lékař větu nedostane; jídlo opakovaně nad cílem najde jen v tabulce reakcí na jídla.',
    dopadSceny: ['reviewSummary']
  }
};

/* ---------- Účinek zamítnutí strojově (kontrola 2, A3–A5, B4; 29. 10. 2026) ----------
   ucinek: {
     druh:     'vypne'      – zamítnutí má na obrazovce skutečný účinek (část zmizí nebo přestane počítat)
               'nesouhlas'  – jen záznam nesouhlasu, chování se nemění (C-CILE, K-KRITERIA, Z-GLUKOZA, P-LEKAR); „Co se stane“ to musí říct
     ukaze:    'off'        – na místě, kde položka působí, je oznámení „Tahle část nefunguje“ (NF.slots.offNotice, v textu obrazovky data-off=ID)
               'nesouhlas'  – oznámení s hlavičkou „Váš nesouhlas je zapsaný“ (prezentační vrstva: RECORD_ONLY v demo/presenter.js má číst právě tyto položky)
               null         – bez oznámení
     sceny:    { idKapitoly: { zmizi: [texty], zustane: [texty], oznameni: true } } – kapitoly hlavní linie; texty jsou úseky textu obrazovky (pravdivost.effectText,
               spojení všech kroků kapitoly): „zmizi“ je ve schváleném běhu a po zamítnutí v žádném kroku kapitoly není; „zustane“ tam po zamítnutí být musí
               (bezpečnostní větev, záznam nesouhlasu); oznameni = v kapitole se ukáže oznámení této položky. Ověřuje kontrola2-obsah.test.cjs.
     bezMista: [ID]          – garantové položky, jejichž výstup (štítek, karta, text) zamítnutím této položky na obrazovce zmizí, aspoň v jedné kapitole:
               kroky, které je ukazují, závisí i na této položce (automatické `needs`), a položka bez místa se nemá nabízet (souhrn řekne proč, M12).
   } */
var UCINEK = {
  'K-KRITERIA': { druh: 'nesouhlas', ukaze: 'nesouhlas', sceny: { enroll: { zustane: ['Karta pacienta podmínky dokládá, potvrdit je ale musíte vy'], oznameni: true } }, bezMista: [] },
  'C-CILE': { druh: 'nesouhlas', ukaze: 'nesouhlas', sceny: { enroll: { zustane: ['Dolní cíl 3,9'], oznameni: true }, reviewSummary: { zustane: ['S radou bývalo níž?'], oznameni: true } }, bezMista: [] },
  'R-NAVYKY': { druh: 'vypne', ukaze: 'off', sceny: { enroll: { zmizi: ['Držet obvyklou porci ke každé dávce'], oznameni: true }, training: { zmizi: ['Pacient ví, že rada k porci přijde před jídlem'], oznameni: true }, firstMeal: { zmizi: ['ze 4 splněno'], oznameni: true }, preview: { zmizi: ['Vaše návyky v tomto plánu Zapisovat hlavní jídla'] } }, bezMista: [] },
  'R-REAKCE': { druh: 'vypne', ukaze: 'off', sceny: { week: { zmizi: ['Kam se po něm glukóza dostávala'] }, advice: { zmizi: ['Co můžete zkusit (odpovědět nemusíte)'], oznameni: true }, hypo: { zmizi: ['Inzulin už máte v těle.'], zustane: ['Méně jídla než obvykle', 'Když sníte méně než obvykle a inzulin už je píchnutý'], oznameni: true }, illnessMeal: { zustane: ['K jídlu neradíme, platí pravidla pro nemoc.'], oznameni: true }, preview: { zmizi: ['bylo s radou „'] } }, bezMista: ['R-SKORE', 'R-PORCE', 'R-DOPLNEK', 'R-PORADI', 'R-PROCHAZKA'] },
  'Z-GLUKOZA': { druh: 'nesouhlas', ukaze: 'nesouhlas', sceny: { firstMeal: { zustane: ['nemám hodnotu'], oznameni: true }, firstResult: { zustane: ['Nejvyšší hodnota za první dvě hodiny'], oznameni: true } }, bezMista: [] },
  'B-HYPO': { druh: 'vypne', ukaze: 'off', sceny: { firstResult: { zmizi: ['Klesla glukóza do 4 hodin po jídle pod 4 mmol/l?'], oznameni: true }, hypo: { zmizi: ['Klesla glukóza pod 4?', 'Za 60 min od jídla se zeptáme'], zustane: ['Méně jídla než obvykle'], oznameni: true }, reviewSummary: { zmizi: ['hlášené poklesy po jídle: 2'] } }, bezMista: ['I-HYPO'] },
  'R-PODOBNOST': { druh: 'vypne', ukaze: 'off', sceny: { custom: { zmizi: ['podobá se některému jídlu, které už známe?', 'Jak je to u tohoto jídla, ukážou vaše zápisy.'], oznameni: true } }, bezMista: ['R-DOPLNEK', 'R-PORADI', 'R-PROCHAZKA'] },
  'R-SKORE': { druh: 'vypne', ukaze: 'off', sceny: { week: { zmizi: ['častěji nad cílem'], oznameni: true }, advice: { zmizi: ['Přidejte k jídlu bílý jogurt nebo hrst ořechů'] } }, bezMista: ['R-DOPLNEK', 'R-PORADI', 'R-PROCHAZKA'] },
  'R-PORCE': { druh: 'vypne', ukaze: 'off', sceny: { advice: { zmizi: ['Vaše dávka inzulinu je nastavená na obvyklé množství – větší porce ho přesáhne.'], oznameni: true }, hypo: { zmizi: ['Inzulin už máte v těle.'], zustane: ['Méně jídla než obvykle'], oznameni: true } }, bezMista: [] },
  'R-DOPLNEK': { druh: 'vypne', ukaze: 'off', sceny: { advice: { zmizi: ['Přidejte k jídlu bílý jogurt nebo hrst ořechů'], oznameni: true }, afterBolus: { oznameni: true }, reviewProposals: { zmizi: ['Probrat radu „Doplněk k jídlu“'] } } /* 31/02 A1: rady skládá jádro – se zamítnutou položkou se doplněk nikdy nenabídl, a tak není ani věta o zmizelé radě; B4: stažený doplněk je návrh „Probrat radu“ */, bezMista: [] },
  'R-PORADI': { druh: 'vypne', ukaze: 'off', sceny: { custom: { zmizi: ['Snězte nejdřív zeleninu nebo maso, pokud jsou v jídle, potom zbytek jídla.'], oznameni: true }, impact: { zmizi: ['Snězte nejdřív maso, potom zbytek jídla.'], oznameni: true }, reviewProposals: { zmizi: ['Zachovat radu „Pořadí jídla“'] } }, bezMista: [] },
  'R-PROCHAZKA': { druh: 'vypne', ukaze: 'off', sceny: { enroll: { zmizi: ['Krátký pohyb po jídle zmírní vzestup glukózy bez změny jídla.'] }, advice: { zmizi: ['Po jídle se asi 15 minut svižně projděte.'], oznameni: true }, reviewProposals: { zmizi: ['Zachovat radu „Procházka po jídle“'] } }, bezMista: [] },
  'D-CISTA': { druh: 'vypne', ukaze: 'off', sceny: { reviewProposals: { zmizi: ['Posoudit prandiální dávku ke snídani – hodnoty nad cílem'], zustane: ['Posoudit bazální dávku – noční hodnoty pod cílem', 'Probrat radu „Doplněk k jídlu“'], oznameni: true } }, bezMista: ['D-PRAND'] },
  'D-PRAND': { druh: 'vypne', ukaze: 'off', sceny: { reviewProposals: { zmizi: ['Posoudit prandiální dávku ke snídani – hodnoty nad cílem', 'Probrat radu „Doplněk k jídlu“'], zustane: ['Posoudit bazální dávku – noční hodnoty pod cílem', 'Bezpečnostní pravidla beze změny?'], oznameni: true } }, bezMista: [] },
  'D-BAZAL': { druh: 'vypne', ukaze: 'off', sceny: { reviewProposals: { zmizi: ['Posoudit bazální dávku – noční hodnoty pod cílem'], zustane: ['Posoudit prandiální dávku ke snídani – hodnoty nad cílem'], oznameni: true } }, bezMista: [] },
  'D-POSTUP': { druh: 'vypne', ukaze: 'off', sceny: { reviewProposals: { zmizi: ['Bazál je potvrzený ve stejnou hodinu', 'Větve postupu (4)'], zustane: ['Posoudit bazální dávku – noční hodnoty pod cílem'], oznameni: true } }, bezMista: [] },
  'R-POKYNY': { druh: 'vypne', ukaze: 'off', sceny: { hypo: { zmizi: ['Když sníte méně než obvykle a inzulin už je píchnutý'], oznameni: true }, illness: { zmizi: ['Bazál si píchejte dál ve stejný čas'], oznameni: true } }, bezMista: ['I-HYPO', 'I-MENE', 'I-NEVIM', 'I-NEMOC-BAZAL', 'I-NEMOC-JIDLO', 'I-VYSOKA', 'I-KONTAKT'] },
  'I-HYPO': { druh: 'vypne', ukaze: 'off', sceny: { hypo: { zmizi: ['To je léčba nízké glukózy, ne rada k jídlu.'], oznameni: true } }, bezMista: [] },
  'I-MENE': { druh: 'vypne', ukaze: 'off', sceny: { hypo: { zmizi: ['Když sníte méně než obvykle a inzulin už je píchnutý'], oznameni: true } }, bezMista: [] },
  'I-NEVIM': { druh: 'vypne', ukaze: 'off', sceny: { afterBolus: { zmizi: ['Když nevíte, jestli byl inzulin už píchnutý, znovu ho nepíchejte.'] } }, bezMista: [] },
  'I-NEMOC-BAZAL': { druh: 'vypne', ukaze: 'off', sceny: { illness: { zmizi: ['Bazál si píchejte dál ve stejný čas'] } }, bezMista: [] },
  'I-NEMOC-JIDLO': { druh: 'vypne', ukaze: 'off', sceny: { illness: { zmizi: ['Když jídlo vynecháte, inzulin k němu nepíchejte.'] } }, bezMista: [] },
  'I-VYSOKA': { druh: 'vypne', ukaze: 'off', sceny: { lateMeal: { zmizi: ['Inzulin navíc si nepíchejte a dávky neměňte.'], oznameni: true } }, bezMista: [] },
  'I-KONTAKT': { druh: 'vypne', ukaze: 'off', sceny: { enroll: { zmizi: ['Zdravotní potíže: v ordinační době ordinace'], oznameni: true } }, bezMista: [] },
  'S-SILNA': { druh: 'vypne', ukaze: 'off', sceny: { reviewSummary: { zmizi: ['jídel opakovaně nad cílem, celkem'], oznameni: true } }, bezMista: [] },
  'S-SEMAFOR': { druh: 'vypne', ukaze: 'off', sceny: { reviewSummary: { oznameni: true } }, bezMista: [] },
  'P-NEMOC': { druh: 'vypne', ukaze: 'off', sceny: { illness: { zmizi: ['Bazál si píchejte dál ve stejný čas'], oznameni: true } }, bezMista: ['I-NEMOC-BAZAL', 'I-NEMOC-JIDLO'] },
  'P-LEKAR': { druh: 'nesouhlas', ukaze: null, sceny: {}, bezMista: [] }
};
Object.keys(UCINEK).forEach(function (id) { if (D.guide[id]) D.guide[id].ucinek = UCINEK[id]; });
D.ucinek = function (id) { var g = D.guide[id] || D.guideRaw[id]; return (g && g.ucinek) || null; };

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
    if (typeof src[k] !== 'string') { out[k] = src[k]; return; } /* dopadSceny (pole) zůstává, jak je */
    Object.defineProperty(out, k, { enumerable: true, get: function () { return D.guideFill(id, src[k]); } });
  });
  D.guide[id] = out;
});

})(typeof window !== 'undefined' ? window : globalThis);
