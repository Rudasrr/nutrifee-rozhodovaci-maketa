# NutriFee – předání programátorovi: přílohy

*Stav makety SCHEMA 87 (6. 11. 2026). Patří k `00-postup.md`. Tabulky v přílohách 2, 3 a 5 jsou vygenerované skriptem z kódu makety; když se maketa změní, vygenerujte je znovu, nepřepisujte je ručně. Cesty k souborům jsou vůči složce makety.*

1. Slovník pojmů
2. Registr položek
3. Katalogy
4. Co se nesmí vracet
5. Testy jako specifikace

---

## 1. Slovník pojmů

Závazný slovník s rozlišením slov pro pacienta, pro lékaře a v kódu je v `15` odst. 19. Tady je každý pojem jednou větou; v závorce je název v kódu nebo položka registru.

### Glukóza, jídlo a učení

- **Glukóza** – hodnota ze senzoru v mmol/l; všude se píše „glukóza“, nikdy „glykémie“, protože senzor měří glukózu v tkáňovém moku.
- **Opsaná hodnota** – celé číslo, které pacient přepíše z aplikace senzoru posuvníkem (pod 4 · 4 … 15 · nad 15 · nemám), hodnota před jídlem a nejvyšší hodnota do 2 hodin po předchozím jídle (Z-GLUKOZA, `NF.chip`).
- **„Pod 4“ a „nad 15“** – krajní volby posuvníku uložené jako hranice se značkou, ne jako vymyšlené číslo; „pod 4“ hned ukáže pravidlo k nízké a „nad 15“ pravidlo k vysoké glukóze.
- **Zápis** – jedno zapsané jídlo s časem, porcí, odpovědí o inzulinu, odpověďmi na rady a hodnotami glukózy (`episode`).
- **Zpětný zápis** – zápis jídla, které už proběhlo („Už jsem jedl“, „Byla dnes snídaně?“); radí jen procházku, a to do 60 minut od jídla.
- **Slot dne (hlavní jídlo)** – snídaně, oběd nebo večeře; aplikace se řídí tím, který slot je prázdný, ne časovými okny (`NF.MEALS`, `NF.daySlots`).
- **Hrubá denní doba slotu** – hodina dne, od které je prázdný slot „minulý“ a Dnes se ptá „Byla dnes snídaně?“ místo „Chystám se jíst“: snídaně od 10:00, oběd od 15:30, večeře od 21:00; od SCHEMA 87 parametry `snidane_do`, `obed_do`, `vecere_do` provozní položky S-PRIPOMINKY s mezemi (`NF.daypartEnd`, pořadí snídaně < oběd < večeře se hlídá).
- **Svačina** – čtvrtý a další zápis dne, bez inzulinu, mimo sloty a mimo návrhy k dávce; učí se zvlášť.
- **Obvyklá porce** – množství, na které lékař nastavil dávku, „tak, jak to jíte obvykle“; pacient nic nepočítá (`portion: 'usual'`, dále `smaller` a `bigger`).
- **Vrchol** – nejvyšší glukóza 0–120 minut po jídle; pacient ho zná jako „nejvyšší hodnotu po jídle“ (`NF.peakOf`).
- **Vzestup** – vrchol minus hodnota před jídlem; slouží jen ke shodě zápisů při učení a lékař ho vidí v podkladech (`NF.riseOf`).
- **V cíli / nad cílem** – zápis je v cíli, když vrchol nepřekročil horní cíl pacienta (10,0 mmol/l); je to jediná míra pro pacienta všude (R-REAKCE `kriterium: 'vrchol'`).
- **Započítaný zápis (u pacienta) = čistý zápis (u lékaře)** – zápis s úplnými daty, inzulinem potvrzeným podle plánu a včas, obvyklou porcí, stejnou dávkou jako dnes, mimo nemoc a bez svačiny do 120 minut (D-CISTA, `NF.usableEp`).
- **Čistá data pro návrh k dávce** – přísnější podmnožina čistých zápisů s inzulinem nejvýš 30 min před jídlem a 15 min po něm, bez zpětných zápisů s odhadnutým časem, pozdního podání a opraveného inzulinu (`NF.usableForDose`); učení bere širší okno 45/30 min.
- **Učení jídel** – aplikace se z opakovaných zápisů téhož jídla učí, kam se po něm pacientovi dostává glukóza; po změně dávky začíná učení k radám znovu.
- **Známé jídlo** – aspoň 4 započítané zápisy z posledních 6 se shodují (rozdíl vzestupů do 2,5 mmol/l); jednou známé zůstává známé, dokud shoda neselže ve dvou oknech po sobě (R-REAKCE `minKnown`, `shoda_mmol`, `maxUceni`).
- **Učíme se** – jídlo s 1–3 započítanými zápisy (první dojem · zatím to vypadá · zápisy se liší); pruh učení má 4 segmenty.
- **Podobné jídlo** – jídlo, které pacient přirovnal „Je to jako X“, nebo databázové jídlo se stejnými znaky; ukazuje jen směr slovem a ikonou, nikdy číslo (R-PODOBNOST).
- **Neznámé jídlo** – jídlo bez zápisů; nezobrazuje se nic, jen nabídka zapsat.
- **Nestálé jídlo** – po 6 započítaných zápisech bez shody; pacient vidí štítek a vysvětlení, lékař seznam v podkladech.
- **Rozchod zápisů** – nový zápis se liší od dřívějších o 3,5 mmol/l a víc; aplikace ho nejdřív vysvětlí radou a pak se jednou zeptá (stejné jídlo · jiná příloha · jiné množství · jinak připravené · neobvyklý den).
- **Rozmezí vrcholů** – do 7 započítaných zápisů nejnižší–nejvyšší, od 8 zápisů 10.–90. percentil; s daty se „upřesňuje“, nikdy „zužuje“.
- **Stupeň reakce (reakce těla)** – dva stupně, „většinou v cíli“ (podíl v cíli aspoň 50 %) a „častěji nad cílem“, od 4 započítaných zápisů z posledních 8; relativní k pacientovi, nikdy známka (R-SKORE).
- **Silné reakce** – nejvýš 3 jídla s nejvíc zápisy nad cílem, o kterých lékař dostane jednu větu v podkladech (S-SILNA).

### Inzulin a rady

- **Dávka** – počet jednotek předepsaný lékařem; aplikace ji zobrazuje, připomíná a ptá se na podání, nikdy ji nepočítá ani nepředvyplňuje.
- **Bazál** – inzulin na noc, jednou večer v pevný čas.
- **Inzulin k jídlu (prandiální)** – inzulin ke třem hlavním jídlům.
- **Potvrzení inzulinu** – odpověď podle plánu · jinak · ještě ne · nevím; do 60 minut opravitelné, opravený zápis nejde do návrhu k dávce. Čas podání: právě teď · před 5 · před 15 · před 30 min · jiný čas (posuvník „před kolika minutami“ 0–120 min po 5 min, `NF.INS_AGO_MAX`, SCHEMA 87).
- **Rozsah dávky** – 1–60 j., jedna konstanta jádra `NF.DOSE_RANGE` (pomocníci `NF.validDose`, `NF.clampDose`) pro zařazení, kontrolu, „jinou dávku“ i zápisy pacienta; je to mez vstupu, ne klinická hodnota (SCHEMA 87).
- **Jiná dávka než v plánu** – když pacient u téhož jídla dne dvakrát po sobě zapíše jinou dávku, Dnes ho požádá, ať to řekne sestře na kontrole; aplikace se neptá proč a nic nemění (S-DAVKA).
- **Rada (páka)** – jedna ze čtyř nepovinných rad před jídlem: obvyklá porce, doplněk k jídlu, pořadí jídla, procházka (`NF.LEVERS`; R-PORCE, R-DOPLNEK, R-PORADI, R-PROCHAZKA).
- **Zásada porcí** – před píchnutím rada k obvyklé porci oběma směry, po píchnutí a při „nevím“ jen z větší porce zpět, nikdy „snězte víc“ (`NF.talksAmount` hlídá i nové verze rad).
- **Šablona rady** – věty rad „pořadí“ a „doplněk“ se skládají jen ze strukturovaných údajů jídla a ze seznamů schválené položky, nikdy ručně u jídla.
- **Stažení doplňku** – po 3 přijatých pokusech s doplňkem bez jediného výsledku v cíli se doplněk u jídla přestane nabízet (R-DOPLNEK `stahnout_po`).
- **Návyk** – opakovaná položka plánu (zapisovat, obvyklá porce, potvrzovat inzulin, bazál ve stejný čas; v katalogu i snídaně ve stejný čas a procházka po večeři).
- **Rady svázané s plánem** – plán nese seznam rad vypnutých nebo nahrazených pro pacienta; je to jediná personalizace rad a dělá ji lékař na kontrole.

### Bezpečnost

- **Bezpečnostní pravidlo** – obecné pravidlo NutriFee schválené garantem, stejné pro všechny pacienty, bez uvozovek a bez podpisu lékaře (I-HYPO, I-MENE, I-NEVIM, I-NEMOC-BAZAL, I-NEMOC-JIDLO, I-VYSOKA, I-KONTAKT).
- **Krátká podoba pravidla** – první krok, „Co dál“ a jedna věta, vše doslova věty schváleného znění; celé znění je pod „Celé pravidlo“.
- **Kontakty** – informace v Bezpečí, kam se obrátit se zdravotním a s technickým problémem; aplikace na ně nikoho neposílá.
- **Větev nízké glukózy** – po menší porci nebo vynechaném jídle s inzulinem pravidlo hned, za 60 minut otázka „Klesla glukóza pod 4?“ (po večeři ráno) a po 2 poklesech za klouzavých 7 dní karta s obecnou radou (B-HYPO).
- **Noční pokles** – nepovinný čip „V noci klesla glukóza pod 4“ u snídaně; počítá se do poklesů za 7 dní a k návrhu k bazálu.
- **Čistý pokles** – pokles pod 4 při obvyklé porci a dávce podle plánu; jen ten blokuje v návrhu větev „zvýšit“, ostatní poklesy jsou varování (`NF.lowEvents`, D-POSTUP `poklesy_jen_ciste`).
- **Režim nemoci** – zapíná a ukončuje pacient („Není mi dobře“); zápisy se štítkují a nejdou do učení, rady k jídlu se nedávají, nahoře jsou pravidla pro nemoc (P-NEMOC).

### Plán, ordinace a kontrola

- **Plán (P1, P2…)** – dávky, návyky, bezpečnostní pravidla s případnými výjimkami, cíle glukózy, vypnuté rady a platnost; vydává ho lékař.
- **Zařazení** – karta pacienta, čtyři podmínky a zaškrtnutí bez vylučovacích kritérií, dávky, cíle a startovní plán (K-KRITERIA).
- **Cíle glukózy** – dolní cíl 3,9, horní cíl po jídle 10,0, ráno nalačno do 7,2 mmol/l, čas v cíli aspoň 70 %, čas pod cílem méně než 4 %, HbA1c do 53 mmol/mol; mírnější sada pro starší a křehké (C-CILE).
- **Čas v cíli (TIR) a čas pod dolním cílem** – podíl času ze senzoru v rozmezí cílů a pod dolním cílem; pacient je nevidí, lékař v souhrnu za období exportu.
- **Vydání · předání · převzetí** – lékař plán vydá, předá sestře, ta pacienta zaučí a pacient plán převezme po šesti stránkách průvodce.
- **Zaučení a bod zaučení** – sestra odškrtává body složené z návyků plánu, tří pevných bodů a bodu o exportu, s náhledem telefonu pacienta (Z-BODY).
- **Export ze senzoru** – soubor s průběhem glukózy, který pacient před kontrolou pošle do ordinace a sestra nahraje; nahradí opsané hodnoty a doplní noci (Z-IMPORT).
- **Shoda opsaných hodnot** – u kolika jídel se opsaný vrchol shoduje s vrcholem z exportu do 1 mmol/l; doklad, že učení stojí na správných číslech.
- **Kontrola** – návštěva v ordinaci na konci platnosti plánu a čtyřkrokový tok lékaře: souhrn → návrhy → potvrzení plánu → předání.
- **Report · souhrn · shrnutí** – report je celý výstup pro lékaře, souhrn je jeho první krok s dlaždicemi a větou „co se dělo“, shrnutí je závěr před nevratným krokem; pacient nikdy neslyší „report“.
- **Dříve · teď · rozdíl** – každá sledovaná hodnota v souhrnu ukazuje minulé období, současné a rozdíl se slovem stavu a směru.
- **Návrh (návrhová karta)** – jednotná karta pro každý návrh v plánu: návrh · proč vznikl · co ho oslabuje · jak ověřit · rozhodnutí.
- **Posoudit dávku** – návrh k prandiální dávce nebo k bazálu bez směru a bez výše; směr ukáže větev postupu, číslo volí lékař (D-PRAND, D-BAZAL).
- **Postup posouzení dávky** – lékařem schválené větvení s ověřovacími body a větvemi zvýšit / snížit / ponechat pro každý bod, nikdy s velikostí kroku (D-POSTUP).
- **Větev postupu** – doporučení plynoucí z ověřovacích bodů; není to zámek, lékař má u každé dávky volič „jiná dávka“.
- **Sedí / nesedí** – tři stavy ověřovacího bodu (neověřeno · sedí · nesedí); „Vše sedí“ nepřepne body sestry ani body, kterým data odporují.
- **Data říkají jinak** – štítek bodu, kterému odporují data; lékař ho nepřepíná.
- **Rozhodnuto jinak než postup / proti datům / jiná dávka bez návrhu** – záznamy ve stopě, když lékař zvolí dávku proti větvi, proti blokujícímu poklesu nebo u jídla dne bez karty.
- **Nejdřív rady** – karta před návrhem k dávce, když pacient rady k jídlu dne přijal méně než 3× nebo je většinou odmítal; neplatí při méně než 5 nabídkách.
- **Beze změny** – sloučená karta návrhů, které nic nemění, s tlačítkem „Potvrdit vše“.
- **Sestra s pacientem před lékařem** – část kontroly, kde sestra vybere jiný lék na diabetes, zdravotní stav, hmotnost, HbA1c z karty a body, které z dat ověřit nejde.

### Obrazovky pacienta

- **Dnes** – první záložka: co teď, jak si vedu, aktuální bezpečnost a výsledek posledního jídla.
- **Co teď** – jediná hlavní karta Dnes s jednou větou a jedním tlačítkem („Chystám se jíst“) a řádkem „Potom“.
- **Pás dne** – seznam uzlů dne (snídaně, oběd, večeře, bazál) se stavem a zkratkami; dávka je druhý řádek uzlu „teď“.
- **Jak si vedu** – jedna věta slovem a ikonou ze započítaných zápisů posledních 7 dní po jídlech dne, čísla až v Podrobnostech (`NF.howAmI`).
- **Jak to dopadlo** – karta po příchodu dat k zápisu s věcným výsledkem a poděkováním za čin (S-VYSLEDEK).
- **Milník** – jednorázová karta za čin, nikdy za hodnotu glukózy (R-MILNIKY).
- **Cesta ke kontrole a tkanina** – pruh dní do kontroly, „Známe už N vašich jídel“ a tečky zápisů posledních 7 dní bez glukózy a bez sérií (S-CESTA).
- **Váš týden** – týdenní shrnutí každých 7 dní od vydání plánu, chválí čin (S-TYDEN).
- **Můj plán** – druhá „moje“ záložka: jak si vedu, cesta ke kontrole, dávky, návyky, rady, připomínky, cíle a co lékař změnil.
- **Bezpečí** – kontakty a seznam bezpečnostních pravidel s celým zněním na klepnutí.
- **Přehled před kontrolou** – co uvidí lékař, tři navržené otázky z dat a čísla pod „Podrobnosti v číslech“.
- **Posuvník hodnoty** – jediný ovládací prvek pro volbu čísla u pacienta i v ordinaci (`V.slider`); jednotky inzulinu u pacienta volí `V.unitsSlider` se značkou „předepsáno N j.“ (od SCHEMA 87 místo −/+).

### Registr a schvalování

- **Registr** – seznam všeho, co aplikace počítá, radí, navrhuje a říká; každá položka má kód, verzi, parametry s mezemi a texty.
- **Položka klinická** – položka, za kterou lékařsky odpovídá garant a kterou schvaluje (28 položek, `NF.garantItems`).
- **Položka provozní** – pravidlo aplikace bez klinického obsahu (export, body zaučení, seznam jídel, poděkování…); neschvaluje ji nikdo a nemá stav (`scope: 'provozni'`, 14 položek).
- **Parametr a meze** – číselná hodnota položky s výchozí hodnotou a povoleným rozsahem (`params`, `NF.PARAM_BOUNDS`).
- **Garant** – lékař v roli schvalovatele klinických položek; v první studii lékař studie; pacient slovo „garant“ nikdy nevidí.
- **Správce** – role, která vidí rozhodnutí garantů a export; v maketě „Výsledky garanta“.
- **Ke schválení · schváleno · zamítnuto** – jediné tři stavy klinické položky; rozhodnutí jsou jen Schválit a Zamítnout.
- **Poznámka** – nepovinný text garanta po rozhodnutí; není to rozhodnutí ani schválená změna.
- **Záznam nesouhlasu** – zamítnutí, které položku nevypne, jen zapíše nesouhlas (C-CILE, K-KRITERIA, Z-GLUKOZA, P-LEKAR).
- **Oznámení zamítnuté části** – na místě zamítnuté položky; jádro bez prezentační vrstvy ukáže neutrální „Tato část teď není k dispozici.“ (`NF.OFF_TEXT`, třídy `hint neutral off-default`, atribut `data-off`, jednou za vykreslení, bez zmínky o garantovi a bez výzvy k volání); u záznamů nesouhlasu (C-CILE, K-KRITERIA, Z-GLUKOZA) a P-LEKAR se neukazuje. Maketa ho slotem `NF.slots.offNotice` přepisuje na „Tahle část nefunguje“ s vysvětlením pro garanta (SCHEMA 87).
- **Nová verze** – oprava pravidla jako nová verze položky ke schválení; každá verze má zase jen dva výsledky.
- **Otisk znění** – deterministický otisk znění, parametrů a textu „Co schvalujete“ položky, kterým se dokládá, co garant schválil (`NF.itemFingerprint`).
- **Podnět z provozu** – karta v detailu položky s návrhem vypnutí nebo nové verze; provádí výrobce v řízení změn.
- **Stopa** – záznam každého výpočtu, rady, návrhu a rozhodnutí se vstupy, položkou, verzí, parametry, výstupem a aktérem (`NF.log`, `S.events`). Od SCHEMA 87 nese událost výpočtu pole `polozky = [{ id, version, fp, stav }]` (`NF.TRACE_ITEMS`, `NF.itemRefs`) a zobrazení bezpečnostních pravidel se zapisuje (`pravidlo.nizka`, `pravidlo.mene`, `pravidlo.nevim`, `pravidlo.vysoka`). Krácení stopy v maketě (4000 událostí, data u posledních 1000; `NF.TRACE_MAX`, `NF.TRACE_FULL`) je omezení makety; ostrá aplikace má stopu úplnou.

### Maketa

- **Jádro** – složka `app/` (doména, obrazovky, vykreslení, data); přenáší se jako specifikace.
- **Prezentační vrstva** – složka `demo/` (modelový pacient, příběh, vyprávění, panel, ukládání rozhodnutí garanta makety); nepřenáší se.
- **Produkční sestavení** – maketa bez `demo/`: skutečný čas, vlastní úložiště, role podle adresy, start bez plánu.
- **SCHEMA** – číslo verze makety a tvaru uloženého stavu (`NF.SCHEMA`, `?v=` v HTML); předání odpovídá SCHEMA 87.

---

## 2. Registr položek

Vygenerováno skriptem předávky z `app/data/registry.js`, `app/data/catalogs.js` a `NF.PARAM_BOUNDS` v `app/core.js` (SCHEMA 87). Celkem **42 položek: 28 klinických** (schvaluje garant, `NF.garantItems`) **a 14 provozních** (`scope: 'provozni'`, neschvaluje nikdo, nemají stav).

Sloupec „Parametry“: `klíč = výchozí hodnota [min–max]`; meze jsou z `NF.PARAM_BOUNDS`, u bezpečnostních pravidel I-* z katalogu pravidel (`min`, `max`, `step` u hodnoty `v`). „bez mezí“ = parametr v kódu meze nemá (`NF.clampParam` pak jen nedovolí zápornou hodnotu). Popis je první věta pole `summary` položky; plné znění, texty pro pacienta (`texts`, `lists`) a postupy (`postup`) jsou v souboru.

### Klinické položky (28)

| ID | Název | Kategorie | Verze | Parametry | Popis |
|---|---|---|---|---|---|
| `K-KRITERIA` | Podmínky zařazení | Kohorta a zařazení | v1 | – | Zařadit lze dospělého s diabetem 2. typu (DM2), který má inzulin v pevných dávkách (bazál a tři dávky k jídlu), nosí senzor glukózy (CGM) a nebere žádný jiný lék na diabetes: ani tablety, ani GLP-1. |
| `C-CILE` | Cíle glukózy | Startovní plán a návyky | v1 | `low` = 3,9 [3–5] – dolní cíl (mmol/l)<br>`high` = 10 [7–14] – horní cíl po jídle (mmol/l)<br>`fastingHigh` = 7,2 [5–10] – ráno nalačno do (mmol/l)<br>`tirGoal` = 70 [30–90] – čas v cíli alespoň (%)<br>`tbrGoal` = 4 [1–10] – čas pod dolním cílem méně než (%)<br>`hba1cGoal` = 53 [42–75] – HbA1c do (mmol/mol)<br>`tirGoalMirnejsi` = 50 [30–90] – mírnější cíle: čas v cíli alespoň (%)<br>`tbrGoalMirnejsi` = 1 [0,5–10] – mírnější cíle: čas pod dolním cílem méně než (%) | Výchozí (běžné) cíle pro každého pacienta: v cíli 3,9–10,0 mmol/l, ráno nalačno do 7,2, čas v cíli alespoň 70 %, čas pod cílem méně než 4 %, HbA1c do 53 mmol/mol. |
| `R-NAVYKY` | Startovní sada návyků | Startovní plán a návyky | v1 | – | Všichni pacienti začínají se stejnými čtyřmi návyky: zapisovat hlavní jídla, držet obvyklou porci, potvrzovat inzulin a dávat bazál každý večer. |
| `R-REAKCE` | Vyhodnocení reakce na jídlo | Výpočty a prahy | v1 | `minKnown` = 4 [1–10] – známé od (počet započítaných zápisů)<br>`okno_min` = 120 [60–240] – okno vrcholu po jídle (min)<br>`okno_tucne_min` = 0 [0–300] – okno u tučných (smažených) jídel z databáze (min; 0 = vypnuto)<br>`kriterium` = „vrchol“ – kritérium v cíli (vrchol = horní cíl pacienta; vzestup = připraveno, vypnuto)<br>`vzestup_max` = 3 [1–6] – při kritériu vzestup: v cíli = vzestup nejvýš (mmol/l)<br>`minQuantile` = 8 [4–20] – percentily od (počet zápisů)<br>`shoda_mmol` = 2,5 [1–8] – shoda zápisů: rozdíl vzestupů do (mmol/l)<br>`rozchod_mmol` = 3,5 [1–8] – otázka při rozchodu od (mmol/l)<br>`maxUceni` = 6 [3–12] – nejvýš zápisů na poznání | Reakci na jídlo měříme nejvyšší hodnotou glukózy (vrcholem) v prvních 120 minutách po jídle. |
| `Z-GLUKOZA` | Hodnoty glukózy opsané z aplikace senzoru | Výpočty a prahy | v1 | `pripominka_min` = 120 [60–240] – okno nejvyšší hodnoty po jídle (min) | Aplikace není napojená na výrobce senzoru. V kroku 1 pacient klepne na celé číslo, které právě ukazuje aplikace senzoru (posuvník po celých mmol/l 4–15 s konci „pod 4“ a „nad 15“ a volba „nemám hodnotu“; do SCHEMA 84 čipy); na nejvyšší hodnotu po minulém … |
| `B-HYPO` | Nízká glukóza: sledování a opakované poklesy | Bezpečnostní pravidla | v2 | `poklesy` = 2 [1–5] – poklesů pod 4 pro kartu s radou<br>`dny` = 7 [3–14] – za posledních (dní)<br>`pripominka_min` = 60 [30–120] – otázka po menší porci za (min)<br>`dalsi_slot_h` = 3 [2–5] – další jídlo je „na řadě“ nejdřív (h po posledním) | Po menší porci s podaným inzulinem nebo po vynechaném jídle s inzulinem se ukáže pravidlo k menší porci a za 60 min otázka „Klesla glukóza pod 4?“; po večeři se ptáme až ráno při další snídani, protože pokles po večeři bývá mezi 22. a 24. hodinou. |
| `R-PODOBNOST` | Podobné jídlo podle pacienta | Výpočty a prahy | v1 | `minJidel` = 3 [1–6] – databázová jídla: nejméně podobných<br>`minZapisu` = 6 [2–20] – databázová jídla: nejméně zápisů<br>`shoda` = 0,67 [0,5–1] – databázová jídla: shoda (0–1)<br>`vaha` = 2 [0–5] – váha odhadu (virtuální zápisy)<br>`maxNaJidlo` = 3 [1–10] – nejvýš zápisů z jednoho jídla | Při zápisu nového jídla může pacient nepovinně odpovědět na „Podobá se některému jídlu, které už známe?“ (jedno ze známých jídel, nebo „Nic podobného“). |
| `R-SKORE` | Stupeň reakce: většinou v cíli / častěji nad cílem | Reakce těla | v2 | `mirna` = 0,5 [0,5–1] – většinou v cíli od podílu v cíli (0–1)<br>`odKolika` = 4 [2–6] – stupeň od (počet zápisů)<br>`oknoZapisu` = 8 [3–12] – podíl z posledních (počet zápisů)<br>`ustaleneOd` = 8 [3–12] – ustálené od (počet zápisů)<br>`vedu_min` = 3 [1–7] – věta „jak si vedu“: jídlo dne hodnotit od (zápisů za 7 dní) | Stupně jsou dva: „většinou v cíli“, když je v cíli aspoň polovina započítaných zápisů, jinak „častěji nad cílem“ (tři stupně ze 6 zápisů rozlišit nešlo, proto od 18. 10. 2026 dva). |
| `R-PORCE` | Rada: obvyklá porce | Rady a texty | v1 | – | Před píchnutím aplikace radí vrátit se k obvyklé porci z větší i z menší. |
| `R-DOPLNEK` | Rada: doplněk k jídlu | Rady a texty | v1 | `stahnout_po` = 3 [1–10] – stáhnout, když ani jeden z aspoň tolika pokusů nebyl v cíli (počet) | Rada doporučí přidat k jídlu bílkovinu nebo tuk a nic z jídla neubírat. |
| `R-PORADI` | Rada: pořadí jídla | Rady a texty | v1 | – | Rada doporučí sníst nejdřív část jídla, která zpomalí vzestup, a potom zbytek jídla; množství se nemění. |
| `R-PROCHAZKA` | Rada: procházka po jídle | Rady a texty | v1 | `minut` = 15 [5–60] – délka procházky (min)<br>`okno_min` = 60 [15–180] – ve zpětném zápisu nabízet nejdéle (min po jídle) | Rada doporučí asi 15 minut svižné chůze po jídle. Nabízí se u jídla, po kterém je pacient častěji nad cílem (pod 50 % v cíli), nebo kde ji už zkoušel. |
| `D-CISTA` | Čistá data pro návrhy k dávce | Signály k dávce | v1 | `pred_min` = 30 [0–60] – inzulin nejvýš před jídlem (min)<br>`po_min` = 15 [0–60] – inzulin nejvýš po jídle (min)<br>`pred_uceni_min` = 45 [0–90] – pro učení: inzulin nejvýš před jídlem (min)<br>`po_uceni_min` = 30 [0–60] – pro učení: inzulin nejvýš po jídle (min)<br>`svacina_min` = 120 [60–240] – svačina vyřazuje do (min po jídle)<br>`oprava_min` = 60 [15–120] – oprava inzulinu možná do (min od potvrzení) | Jen jídla s obvyklou porcí, dávkou potvrzenou podle plánu a včas (pro návrh k dávce nejvýš 30 min před jídlem a 15 min po něm; pro učení jídel širší okno 45 min před a 30 min po), mimo nemoc a mimo „neobvyklý den“ (stres, málo spánku, alkohol – pacient … |
| `D-PRAND` | Návrhy k prandiální dávce a radám | Signály k dávce | v1 | `dny` = 28 [7–120] – okno nejméně (dní)<br>`minJidel` = 8 [3–30] – nejméně čistých jídel (počet)<br>`podil` = 0,67 [0,5–1] – podíl nad cílem nejméně (0–1)<br>`radyPrve` = 3 [0–10] – bod „Pacient rady k jídlu zkoušel“: přijatých rad nejméně (počet)<br>`hypo` = 2 [1–10] – poklesů pod dolní cíl nejméně (počet)<br>`hypoPodil` = 0,15 [0–0,5] – podíl jídel s poklesem nejméně (0–1)<br>`hypoMin` = 6 [3–30] – jídel pro posouzení poklesů nejméně (počet)<br>`medianNad` = 0,5 [0–3] – medián vrcholu nad cílem o (mmol/l)<br>`odmitnutiMin` = 5 [1–20] – nejméně nabídek rad pro bránu „nejdřív rady“ (počet)<br>`odmitnutiPodil` = 0,6 [0,3–1] – podíl odmítnutých nabídek (0–1)<br>`podilDvouJidel` = 0,67 [0,5–1] – nad cílem jen jedno nebo dvě jídla: od podílu zápisů nad cílem (0–1) | Návrh se týká jednoho jídla dne (snídaně, oběd nebo večeře) a ukazuje rozpad po jednotlivých jídlech, seřazený podle počtu zápisů nad cílem. |
| `D-BAZAL` | Návrh: posoudit bazální dávku | Signály k dávce | v1 | `dny` = 14 [7–120] – okno (dní)<br>`nociPod` = 2 [1–10] – nocí pod dolním cílem nejméně (počet)<br>`minNoci` = 10 [3–30] – nocí s daty nejméně (počet) | Posuzuje se nejméně 10 nocí za 14 dní. Když je medián ranních hodnot nad cílem a žádná noc neklesla pod cíl, vznikne návrh posoudit bazál. |
| `D-POSTUP` | Postup posouzení dávky (větve) | Signály k dávce | v1 | `poklesy_od` = 1 [1–5] – bod „U jídla nebyl v období pokles pod 4“ nesedí od (počet poklesů)<br>`poklesy_jen_ciste` = 1 [0–1] – větev „zvýšit“ blokují jen poklesy při obvyklé porci a dávce podle plánu (1 = ano, 0 = každý pokles); ostatní poklesy jsou varování<br>`shoda_podil` = 0,8 [0,5–1] – bod „Opsané nejvyšší hodnoty se shodují s exportem“: shoda aspoň u podílu jídel (0–1)<br>`shoda_min` = 5 [1–20] – bod „Opsané nejvyšší hodnoty se shodují s exportem“: jídel ke srovnání nejméně (počet)<br>`v_cili_podil` = 0,9 [0,5–1] – jídlo „v cíli“ pro varování a bod „nad cílem nejsou jen jedno nebo dvě jídla“: aspoň u podílu zápisů (0–1)<br>`hba_rezerva` = 5 [0–15] – „Co návrh oslabuje“ upozorní, když bod o vyrovnání sedí jen díky HbA1c méně než (mmol/mol) nad cílem | Postup říká, co s pacientem ověřit a co z výsledku plyne. Když všechny body sedí a hodnoty jsou nad cílem, větev zní „zvýšit“; když nesedí podání, pacient po jídle dojídá, jsou nad cílem jen jedno či dvě jídla, pacient rady k jídlu nezkoušel nebo byl u … |
| `R-POKYNY` | Bezpečnostní pravidla jsou součást plánu | Bezpečnostní pravidla | v1 | – | Sedm bezpečnostních pravidel pro pacienta (nízká glukóza, méně jídla než obvykle, nevím u inzulinu, nemoc zvlášť pro inzulin na noc a pro inzulin k jídlu, vysoká glukóza, kontakty) je v plánu automaticky, každé jako vlastní položka registru s výchozí hodnotou. |
| `I-HYPO` | Pravidlo: nízká glukóza | Bezpečnostní pravidla | v2 | – | Pacient uvidí: „Když glukóza klesne pod 4 mmol/l, hned vypijte asi 1,5 dl džusu nebo snězte 3–4 kostky cukru. …“ |
| `I-MENE` | Pravidlo: méně jídla než obvykle | Bezpečnostní pravidla | v2 | `v` = 60 [15–240 min, krok 15] – změřit glukózu za (min) | Pacient uvidí: „Když sníte méně než obvykle a inzulin už je píchnutý, změřte glukózu za 60 min. …“ |
| `I-NEVIM` | Pravidlo: nevím, jestli byl inzulin píchnutý | Bezpečnostní pravidla | v2 | `v` = 60 [15–240 min, krok 15] – změřit glukózu za (min) | Pacient uvidí: „Když nevíte, jestli byl inzulin už píchnutý, znovu ho nepíchejte. …“ |
| `I-NEMOC-BAZAL` | Pravidlo: nemoc, inzulin na noc (bazál) | Bezpečnostní pravidla | v2 | `v` = 3 [1–12 h, krok 1] – měřit glukózu každé (h) | Pacient uvidí: „Bazál si píchejte dál ve stejný čas, i když nejíte. Pijte a měřte glukózu každé 3 h. …“ |
| `I-NEMOC-JIDLO` | Pravidlo: nemoc, inzulin k jídlu | Bezpečnostní pravidla | v2 | `v` = 15 [10–25 mmol/l, krok 0,5] – hranice vysoké glukózy při nemoci (mmol/l) | Pacient uvidí: „Když jídlo vynecháte, inzulin k němu nepíchejte. Když jíte, píchněte podle plánu. …“ |
| `I-VYSOKA` | Pravidlo: vysoká glukóza | Bezpečnostní pravidla | v2 | `v` = 15 [10–25 mmol/l, krok 0,5] – hranice vysoké glukózy (mmol/l) | Pacient uvidí: „Když je glukóza nad 15 mmol/l, vypijte sklenici vody a pijte dál po malých doušcích. …“ |
| `I-KONTAKT` | Kontakty (jen informace) | Bezpečnostní pravidla | v2 | – | Pacient uvidí: „Zdravotní potíže: v ordinační době ordinace, mimo ni pohotovost. …“ |
| `S-SILNA` | Jídla opakovaně nad cílem: jedna věta pro lékaře | Report a souhrny | v1 | `silnych` = 3 [2–6] – práh (počet zápisů nad cílem; jídlo navíc častěji nad cílem)<br>`dvaNad_mmol` = 3 [1–6] – nebo 2 zápisy se vzestupem nad hranici aspoň (mmol/l)<br>`maxJidel` = 3 [1–10] – nejvýš jídel ve větě pro lékaře | Lékař dostane na kontrole jednu větu: kolik jídel je opakovaně nad cílem, kolik zápisů nad cílem celkem a nejvýš 3 jídla s nejvíc zápisy nad cílem; ostatní jen rozbalením. |
| `S-SEMAFOR` | Semafor času v cíli (TIR) | Report a souhrny | v1 | `smer_pb` = 2 [0–10] – slovo „zlepšuje se / zhoršuje se“ u procent až od rozdílu (procentní body)<br>`smer_mmol` = 1 [0,3–3] – vývoj v čase: slovo „zhoršuje se / zlepšuje se“ u mediánu glukózy až od rozdílu (mmol/l)<br>`vyvoj_tydny` = 4 [2–8] – vývoj v čase: druhé číslo je medián za posledních (týdnů)<br>`tir_zluta` = 50 [30–70] – oranžová od času v cíli (%)<br>`tbr3_max` = 1 [0,5–5] – pod 3,0 nejvýš (%)<br>`min_dni` = 14 [7–30] – nejméně dní dat ze senzoru<br>`porce_ok` = 0,8 [0,5–1] – dlaždice Obvyklá porce: v pořádku od podílu (0–1)<br>`porce_varovani` = 0,6 [0,3–0,9] – dlaždice Obvyklá porce: oranžová od podílu (0–1)<br>`inzulin_ok` = 0,8 [0,5–1] – dlaždice Inzulin podle plánu: v pořádku od podílu (0–1)<br>`inzulin_varovani` = 0,6 [0,3–0,9] – dlaždice Inzulin podle plánu: oranžová od podílu (0–1)<br>`mimo_dni` = 7 [1–30] – dlaždice Mimo učení: oranžová od (dní) | Zelená, když čas v cíli (TIR) dosahuje cíle pacienta a čas pod dolním cílem je pod mezí pacienta – obojí z položky Cíle glukózy (běžné cíle: aspoň 70 % a méně než 4 %; mírnější cíle: aspoň 50 % a méně než 1 %). |
| `P-NEMOC` | Režim nemoci | Bezpečnost a režim | v1 | `dny` = 3 [1–14] – karta „Nemoc trvá už …“ po (dnech nemoci; ukáže se od dalšího dne) | Nemoc označí pacient sám a sám ji také ukončí. Zápisy z nemoci se označí a do učení se nepočítají, rady k jídlu se nedávají, platí jen bezpečnostní pravidla a aplikace se každý den zeptá „Už je vám lépe?“. |
| `P-LEKAR` | Lékař mezi kontrolami nic nedělá | Bezpečnost a režim | v1 | – | Všechny akce lékaře probíhají jen s pacientem v ordinaci. Mezi kontrolami pacienta nikdo nesleduje. |

### Provozní položky (14)

| ID | Název | Kategorie | Verze | Parametry | Popis |
|---|---|---|---|---|---|
| `Z-IMPORT` | Export z aplikace senzoru | Výpočty a prahy | v1 | `po_jidle_min` = 180 [120–300] – měření po jídle do (min)<br>`shoda_mmol` = 1 [0,5–3] – opsaná nejvyšší hodnota se shoduje s exportem do (mmol/l) | Během plánu pacient hodnoty ze senzoru opisuje (Z-GLUKOZA). Před kontrolou mu aplikace připomene, ať pošle do ordinace export ze senzoru; sestra ho na kontrole nahraje. |
| `Z-BODY` | Body zaučení | Zaučení | v1 | – | Tři pevné body (aplikace, Bezpečí, kontakty), body, které sestra ověří ústně – „pacient ví, že před kontrolou pošle do ordinace export ze senzoru“ (nahrává ho sestra na kontrole), „pacient má v aplikaci senzoru zapnuté upozornění na nízkou glukózu“ a … |
| `J-DATABAZE` | Seznam jídel | Jídla | v1 | – | Syntetický seznam 171 běžných českých jídel a hotovek. Skutečný zdroj a licence se vyberou pro studii. |
| `J-STITKY` | Nové jídlo jen názvem | Jídla | v1 | – | Pacient napíše název (našeptávač), případně nepovinně odpoví na „Podobá se některému jídlu, které už známe?“, a hotovo. |
| `S-SOUHRN` | Věta „co se dělo“ a srovnání rad | Report a souhrny | v1 | `min_n` = 8 [3–30] – zápisů s radou i bez ní nejméně (počet)<br>`rozdil_mmol` = 1 [0,3–3] – rozdíl mediánů nejméně (mmol/l) | Šablona z pravidel (porce, potvrzení inzulinu, rady, TIR). Srovnání „s radou bývalo níž“ se říká jen od 8 zápisů s radou a 8 bez ní u téže rady a při rozdílu mediánu vrcholu ≥ 1,0 mmol/l; jinak „zatím nelze říct“. |
| `S-VYSLEDEK` | Karta „Jak to dopadlo“ | Report a souhrny | v1 | `min_n` = 4 [2–20] – věta „bez toho u vás bývá“ od (počet zápisů s radou i bez ní) | Když přijdou data ze senzoru, ukáže se na Dnes jedna karta: věcně nejvyšší hodnota a poděkování za čin (vyzkoušená rada, zápis). |
| `R-DIKY` | Poděkování po uložení | Rady a texty | v1 | – | Poděkování se řídí tím, co pacient udělal: přijatá rada, návrat k obvyklé porci, zpětné doplnění, nebo běžný zápis. |
| `R-MILNIKY` | Milníky za snahu a návyk | Rady a texty | v1 | – | Jednorázové milníky: jídlo poznáno, rada zdomácněla, týden bez mezery, obvyklá porce 10× po sobě, všechna častá jídla známe a zpětně doplněno 5×. |
| `S-CESTA` | Cesta ke kontrole | Report a souhrny | v1 | – | Karta ukazuje pruh dní do kontroly, kolik častých jídel (jedených aspoň 2×) už známe, kolik jídel je tento týden zapsáno s potvrzeným inzulinem a jednu větu o tom, co se na kontrole stane. |
| `S-TYDEN` | Týdenní shrnutí „Váš týden“ | Report a souhrny | v1 | `nabidka` = 0 [0–1] – nabídka na příští týden (0 = vypnuto, 1 = zapnuto) | Každých 7 dní od vydání plánu karta shrne, kolik jídel je zapsáno, kolik z nich v obvyklé porci, kolik zápisů šlo do učení, kterému jídlu chybí nejméně zápisů do „známe ho“, co pomohlo a případný milník. |
| `S-PODPORA` | Kam se obrátit a kontaktní formulář | Bezpečnost a režim | v1 | – | Bezpečí rozlišuje čtyři cesty. Zdravotní cesty (ordinace, mimo ordinační dobu pohotovost, při ohrožení života záchranná služba) jsou klinický obsah a jejich znění je pravidlo Kontakty (I-KONTAKT), které schvaluje garant; tato položka jen určuje, že jsou v … |
| `R-ZMIZELA` | Věta o zmizelé radě | Rady a texty | v1 | – | Když garant radu zamítne a pacient ji dřív u jídla přijímal, dostane jednu neutrální větu. |
| `S-PRIPOMINKY` | Připomínky v telefonu | Bezpečnost a režim | v1 | `max_denne` = 4 [1–4] – nejvýš připomínek denně k jídlům a bazálu<br>`snidane_do` = 10 [8–12] – snídaně je minulá od (hodina dne; 10 = 10:00)<br>`obed_do` = 15,5 [13–17] – oběd je minulý od (hodina dne; 15,5 = 15:30)<br>`vecere_do` = 21 [19–23,5] – večeře je minulá od (hodina dne; 21 = 21:00) | Nejvýš 4 připomínky denně jako oznámení telefonu, bez sítě: tři k hlavním jídlům a jedna k bazálu, v časech, které pacient vybere se sestrou při zaučení. |
| `S-DAVKA` | Dávka podle plánu a jiná dávka než v plánu | Startovní plán a návyky | v1 | `po_sobe` = 2 [2–5] – karta po tolika zápisech jiné dávky po sobě u téhož jídla dne (počet) | U dávky v kroku 1 a u bazálu je původ a datum plánu. Když pacient u téhož jídla dne dvakrát po sobě zapíše jinou dávku než v plánu, ukáže se na Dnes karta „Jiná dávka než v plánu“: „Dvakrát jste zapsali jinou dávku než v plánu. …“ |

Kde se položky v jádře používají, najdete hledáním jejich kódu v `app/` (`NF.usable(S, 'ID')`, `NF.param(S, 'ID', …)`, `NF.item(S, 'ID')`). Účinek zamítnutí každé klinické položky popisuje pole `ucinek` v `demo/guide.js` a ověřuje ho `kontrola2-obsah.test.cjs` a `pravdivost.test.cjs` (T3).

---

## 3. Katalogy

Katalogy jsou součást jádra v `app/data/`; produkční sestavení bez `demo/` je dostane přes `NF.seed`.

- **Bezpečnostní pravidla I-*** – `app/data/catalogs.js`, `NF.data.instructions`. Každé pravidlo má celé znění `text`, krátkou podobu (`prvniKrok`, `coDal`, `kratce`), hodnotu `{v}` s jednotkou, krokem a mezemi, u některých `odkazy` (které věty jmenují jiné pravidlo) a `bez` (znění, když odkazované pravidlo chybí). Všechna místa `{v}` dosazuje `NF.instrHtml`. Každé pravidlo je zároveň klinická položka registru stejného kódu.
- **Návyky** – `app/data/catalogs.js`, `NF.data.habits`. Každý návyk patří k položce registru (R-NAVYKY nebo R-PROCHAZKA), má krátký název, vysvětlení „proč“ a body zaučení.
- **Jídla** – `app/data/foods.js`, `NF.data.foods()`. Syntetický seznam běžných českých jídel a hotovek (provozní položka J-DATABAZE; skutečný zdroj a licence se vyberou pro studii). U jídla jsou jen vnitřní údaje pro rady: `slozky` (co jde sníst napřed), `bilkovina`, `jednolite`, `doplnek` (skupina doplňku) a znaky `tags`; pacient je nevidí ani nezadává.

#### Bezpečnostní pravidla I-* (`NF.data.instructions`, 7)

| ID | Název | Hodnota `{v}` | Krátká podoba (`kratce`) |
|---|---|---|---|
| `I-NEVIM` | Nevím, jestli byl inzulin píchnutý | 60 min [15–240, krok 15] | Když nevíte, jestli byl inzulin už píchnutý, znovu ho nepíchejte. |
| `I-HYPO` | Nízká glukóza | 4 mmol/l, pevná | Když glukóza klesne pod {v}, hned vypijte asi 1,5 dl džusu nebo snězte 3–4 kostky cukru. |
| `I-MENE` | Méně jídla než obvykle | 60 min [15–240, krok 15] | Když sníte méně než obvykle a inzulin už je píchnutý, změřte glukózu za {v}. |
| `I-NEMOC-BAZAL` | Nemoc: inzulin na noc (bazál) | 3 h [1–12, krok 1] | Bazál si píchejte dál ve stejný čas, i když nejíte. |
| `I-NEMOC-JIDLO` | Nemoc: inzulin k jídlu | 15 mmol/l [10–25, krok 0,5] | Když jídlo vynecháte, inzulin k němu nepíchejte. |
| `I-VYSOKA` | Vysoká glukóza | 15 mmol/l [10–25, krok 0,5] | Když je glukóza nad {v}, vypijte sklenici vody a pijte dál po malých doušcích. |
| `I-KONTAKT` | Kontakty | – (jen text) | Zdravotní potíže: v ordinační době ordinace, mimo ni pohotovost. |

#### Návyky (`NF.data.habits`, 6)

| ID | Návyk | Položka registru | Ve startovní sadě | Body zaučení |
|---|---|---|---|---|
| `H-ZAPIS` | Zapisovat hlavní jídla | `R-NAVYKY` | ano | `t-zapis` |
| `H-PORCE` | Držet obvyklou porci ke každé dávce | `R-NAVYKY` | ano | `t-porce` |
| `H-INZULIN` | Potvrzovat inzulin k jídlu | `R-NAVYKY` | ano | `t-inzulin` |
| `H-BAZAL` | Dávat inzulin na noc (bazál) každý večer ve stejný čas | `R-NAVYKY` | ano | `t-bazal` |
| `H-CAS` | Snídaně ve stejném čase | `R-NAVYKY` | ne (katalog) | – |
| `H-PROCHAZKA` | Procházka po večeři | `R-PROCHAZKA` | ne (katalog) | `t-prochazka` |

#### Jídla (`NF.data.foods()`, 171 jídel)

- Skupina doplňku (`doplnek`): teple 81, slane 56, sladke 34.
- Jednolitá jídla (`jednolite`, pořadí se nenabízí): 74; jídla s bílkovinou nebo tukem (`bilkovina`, doplněk se nenabízí): 118; jídla se složkami pro radu k pořadí (`slozky` neprázdné): 52.
- Typické jídlo dne (`meal`): lunch 63, dinner 57, breakfast 30, snack 21.
- Pole `react` je modelová reaktivita pro simulovaný senzor ukázky; produkce ho nečte (komentář v `foods.js`).

---

## 4. Co se nesmí vracet

### 4.1 Zavržené varianty a proč (výtah z `15` odst. 18)

Varianty níže byly vědomě zavržené. Když je někdo navrhne znovu, připomeňte důvod a nechte rozhodnout vlastníka; plné argumenty jsou v `15` odst. 18.

**Dávka a návrhy lékaři**

| Zavrženo | Proč |
|---|---|
| Aplikace sama doporučuje směr dávky („zvyšte“) nebo navrhuje jednotky; dávkové podklady a samotitrace bazálu | Aplikace, která řekne „zvyšte“, dávkuje. Směr smí ukázat jen větev lékařova schváleného postupu a číslo volí lékař. |
| Vypuštění karty „posoudit dávku“ kvůli nižší regulatorní třídě | Karta je hlavní hodnotou pro lékaře; vlastník ji ponechal i za cenu vyšší třídy (18. 10. 2026). |
| Výlučný blok „bez 3 přijatých rad karta k dávce nevznikne“ | Trestal pacienta za rady, které aplikace nenabídla; dnes karta k dávce vznikne vždy, před ní případně karta „Nejdřív rady“ a v postupu bod „Pacient rady k jídlu zkoušel“ – doporučení, ne zámek (4. 11. 2026). |
| Blok větve „zvýšit“ každým poklesem pod 4 | Pokles po menší porci nic neříká o dávce k obvyklé porci; blokují jen čisté poklesy, ostatní jsou varování (4. 11. 2026). |
| Dvouhodinová hodnota jako míra pro návrh k dávce | Lékař má vidět totéž číslo jako pacient na kartě jídla: vrchol 0–120 min. |
| Zaškrtávátka ověření se dvěma stavy | Nezaškrtnuté nejde odlišit od „neověřeno“; platí tři stavy sedí / nesedí / neověřeno. |
| Volné pole „Komentář“ u rozhodnutí lékaře | V ordinaci se nepíše; důvod je volba z nabídky. |
| Mřížky „pilulek“ s čísly, otočný válec, klávesnice s velkými klávesami | Mřížka je záplava čísel bez významu, válec skrývá okolní hodnoty, klávesnice je psaní; platí posuvník hodnoty. |
| Návrhy k radám bez účinku na rady pacienta | Rozhodnutí naprázdno; plán nese vypnuté a nahrazené rady. |
| Jiný lékař v aplikaci (věty o dávce od jiného lékaře, bod zaučení o hospitalizaci, volba „Píchnuto jinak“) | Lékař je vždy jen jeden, ten, který vydal plán (1. 11. 2026). |

**Pacient, jídlo a rady**

| Zavrženo | Proč |
|---|---|
| Plošný zákaz jakékoli rady k porci po píchnutí; rada „sněz víc“ | Návrat z větší porce k obvyklé je návrat k tomu, na co je dávka; „sněz víc“ by vedlo k jídlu kvůli inzulinu. |
| Pozorovací deník bez rad a předpovědí (původní zadání) | Pacientovi nic nepřinášel. |
| Makra a gramy sacharidů v zápisu; jídla přidává sestra nebo lékař | Pacient nepočítá sacharidy; učí se z opakování jídel pod vlastním názvem. |
| Builder nového jídla se složením; doptávání na složení při rozcházejících se zápisech; ikony konkrétních jídel | Složení pro učení z reakce těla není třeba; nové jídlo jen názvem a „Je to jako X“. |
| Absolutní skóre a známky jídel; tři stupně reakce; „známé“ ze 3 shodných zápisů | Známka je klinické tvrzení bez opory; simulace ukázala, že tři stupně a 3 zápisy jsou šum. |
| Zobrazování hodnoty „před jídlem“; graf tří křivek s textovým souhrnem | Pacienta zajímá, kam se glukóza dostane; okno rozmezí na stupnici. |
| Rozmezí převzaté z podobného jídla | Úzké číslo vypadá přesněji než vlastní data; podobné jídlo jen směrem. |
| Dvě míry „v cíli“ (vzestup u jídla, vrchol na Dnes) | Týž zápis byl jednou v cíli a jednou nad cílem; platí jen vrchol proti hornímu cíli. |
| Rada „pořadí“ u jednolitých jídel; ručně psané věty rad u jídel | Radila složku, která v jídle není; rady jen šablonou ze schválených seznamů. |
| Procházka ve zpětném zápisu 1–3 h po jídle | Platí jen do 60 minut od jídla. |
| Podmínka „pokud vám to zdravotní stav dovolí“ v radě k procházce | Potíže s pohybem jsou vylučovací kritérium kohorty. |
| Živá hodnota glukózy se semaforem na Dnes; pochvala za hodnotu; body, série s trestem, známky; milníky v reportu lékaře | Svádí honit čísla a jíst méně; chválí se čin, ne hodnota. |
| Samostatná karta „Nejvyšší hodnota od jídla?“ 120 minut po jídle; psaní glukózy s desetinami | Šest přechodů do aplikace senzoru denně bylo největší zátěží; jeden pohled na jídlo a celá čísla. |
| Časová okna jídel nastavovaná lékařem | Aplikace se řídí prázdným slotem a hrubou denní dobou. |
| Svačiny vyřazené ze seznamu; čtvrté jídlo dne s prandiální dávkou | Vzestup po svačině by se přičítal dalšímu jídlu; kohorta má inzulin jen ke třem jídlům. |
| Týdenní nabídka „zkuste to i u jiného jídla“ zapnutá ve studii | Rada má přicházet jen před jídlem, aby šel změřit její účinek; parametr `nabidka` je 0. |
| Samostatná obrazovka „Nerozumím“; výběr příčiny výpadku dat; Průvodce se značkami `?`; čtyři vrstvy nápovědy | Nápověda je u obrazovek; výpadek je jen štítek zápisu. |
| Plovoucí lišta záložek; pátá záložka „Pokrok“ | Klasická lišta se čtyřmi záložkami je pro seniora přehlednější. |

**Bezpečnost a pravidla**

| Zavrženo | Proč |
|---|---|
| Karta „Zavolejte do ordinace“ a jakákoli jiná výzva aplikace volat (i „volejte ordinaci“ v pravidlech) | Aplikace k volání nevyzývá; lékař se o poklesech dozví na kontrole a pacient dostane obecnou radu. Věta „nečekejte na kontrolu: poraďte se s lékařem…“ výzvou volat není. |
| Bezpečnostní pravidla jako citace lékaře s podpisem „– váš lékař · plán P1“ a nadpis „Pokyn lékaře“ | Lékař pravidla nepíše ani nevybírá; podpis neodpovídal skutečnosti. |
| Lékař při zařazení vybírá pravidla z katalogu a nastavuje hodnoty; zaškrtávátko „pokyny probrány“; zvláštní potvrzení pravidel po změně dávky | Pravidla jsou součást plánu automaticky; lékař podepisuje plán jako celek. |
| Jeden společný pokyn pro nemoc | Bazál se při nemoci píchá dál, inzulin k jídlu jen když pacient jí; jeden text sváděl k chybě. |
| Otázka na pokles po večeři za 60 minut nebo ve 22 hodin | Pokles po večeři bývá mezi 22. a 24. hodinou; ptá se až ráno. |
| Pokyn „Aplikace vám nikdy neřekne sněz víc“ v textu pravidla | Pravidlo má říkat, co dělat. |
| Hláška pacientovi, že radu zakázal garant | Pacient garanta nezná; rada zmizí, případně s jednou neutrální větou. |
| Kohorta s tabletami nebo jinými léky na diabetes navíc | Jiný lék mění riziko nízké glukózy, o kterém aplikace neví (4. 11. 2026). |

**Senzor a export**

| Zavrženo | Proč |
|---|---|
| Napojení na aplikaci nebo rozhraní výrobce senzoru | Vyžadovalo by svolení výrobce a certifikaci rozhraní; opsání dvou čísel ne. |
| Týdenní export csv pacientem jako povinnost; stránka „Nahrát export“ u pacienta | Pro pacienta 65+ nejtěžší úkon; export nahrává jen sestra na kontrole. |
| Povinné sdílení dat při zařazení přes klinický účet ordinace, postup „Jak export získat“, hláška „Rozpoznáno: export senzoru typu A“ | O podobě exportu a cestě k němu se v aplikaci nemluví; je to otevřený úkol ostré aplikace. |
| Přihlášení personálu do portálu výrobce účtem pacienta | Personál nikdy nepoužívá účet pacienta. |
| Hlášky „senzor je simulovaný“ v aplikaci | Patří jen do vyprávění makety. |

**Ordinace, role a registr**

| Zavrženo | Proč |
|---|---|
| Samostatná role Garant | Registr je záložka lékaře. |
| Kliknutí na kompenzaci při zařazení | Klik bez důsledku; report porovná HbA1c sám. |
| Lékař obnovující úkol nebo návyk mezi kontrolami | Lékař mezi kontrolami nic nedělá. |
| „Upravit“ jako třetí rozhodnutí garanta, stav „upraveno“, komentář jako polostav, voliče parametrů a vyřazování větví garantem | Matoucí; rozhodnutí jsou jen Schválit a Zamítnout, požadovanou hodnotu garant napíše do poznámky. |
| Schvalování provozních položek kýmkoli; provozní položky v registru garanta | Lékař podepisuje jen to, za co lékařsky odpovídá; provozní položky nikdo neschvaluje. |
| Vypnutí položky „hned jedním klikem“ garantem | Garant navrhuje, výrobce provádí v řízení změn. |
| Zjednodušování ostré aplikace „jen pro studii“ (vypnutí milníků, tkaniny, otázky při rozchodu) | Maketa odpovídá ostré aplikaci 1:1; omezení patří do protokolu studie. |
| Katalogy v `demo/` s odkladem „až v ostré aplikaci“ | Produkční sestavení musí mít registr, jídla i katalogy. |

**Vzhled**

| Zavrženo | Proč |
|---|---|
| Skleněné karty s rozostřením, přechodové podklady, barevný levý okraj karet | Generický vzhled; platí směr „teplý a lidský“ z tokenů. |
| Žlutá barva; červená pro běžný stav „nad cílem“; semafor bez slova | Červená jen pro chyby, pokles pod 4 a mimo rozsah; stav vždy slovem a ikonou. |
| Písma načítaná za běhu z cizích serverů; zvláštní písmo pro slabozraké | Jedno vlastní hostované písmo z `app/fonts/`. |

### 4.2 Co neplatí (z `CLAUDE.md`)

- Dokumenty `00` až `14`, `INSTRUKCE-PROJEKTU-CLAUDE.md` a `CHANGELOG-MIGRACE.md` jsou historie, ne zadání; čtěte je jen kvůli důvodům starých rozhodnutí. Zejména dokument `14` (nový směr z 25. 9. 2026) byl závazný do 30. 9. 2026 a už není.
- Publikovaná maketa ve verzi commitu `52268f1` a starší je stará verze. Neopisujte z ní chování, které `15` ruší: role Garant, kompenzace při zařazení, lékař obnovující úkol mezi kontrolami, obrazovka „Nerozumím“, výběr příčiny výpadku, Průvodce se značkami `?`, graf tří křivek a zákaz jakékoli rady k porci po píchnutí.
- `NutriFee-zadani-makety-pro-Claude-Code.md` je překonané úplně.
- `maketa/nutrifee-maketa-pece.html` je starší samostatná větev; nepoužívá se.

---

## 5. Testy jako specifikace

### 5.1 Přehled souborů a seznam testů

Vygenerováno skriptem předávky z `*.test.cjs` (názvy jsou první argument funkce `test`; SCHEMA 87). Celkem **17 souborů a 376 zapsaných testů**; jeden z nich je v hlavní sadě smyčka, která vytvoří 15 testů spouštějících ostatní sady (v seznamu jsou rozepsané).

| Soubor | Testů | Vrstva | Co hlídá |
|---|---|---|---|
| `nutrifee-rozhodovaci-maketa.test.cjs` | 128 | hlavní sada; pouští i ostatní sady jako samostatné procesy | Hlídá neporušitelné zásady (dávku volí lékař, zásada porcí, registr ve stopě, bez sítě a bez generativní AI), celý tok pacienta, sestry a lékaře nad modelovým příběhem, vzhled a sazbu a k tomu prezentační vrstvu (průchod garanta, panel vyprávění, zásuvka, výsledky správce); poslední testy spouštějí ostatní sady. |
| `faze2-jadro.test.cjs` | 32 | jádro a obrazovky | Hlídá opravy A01–A33 fáze 2: účinek zamítnutí klinických položek na obrazovce, štítky položek tam, kde působí, a pravidla rad, exportu, reportu a převzetí plánu. |
| `faze2-pribeh.test.cjs` | 15 | prezentační vrstva | Hlídá, že příběh ukázky a vyprávění říkají pravdu (kroky scény vedou ke stejnému stavu jako skok na kapitolu, citace jsou na obrazovce) a modelová data příběhu. |
| `kontrola2-obsah.test.cjs` | 18 | jádro + průvodce | Hlídá zásadu 3 u rad, nezávislost bezpečnostní větve na bráně rad, úplná znění pravidel I-* a strojový popis účinku zamítnutí (`ucinek` v `demo/guide.js`) u všech 28 klinických položek. |
| `kontrola3-obsah.test.cjs` | 14 | jádro a data | Hlídá rady „pořadí“ a „doplněk“ jen šablonou nad údaji jídel (žádná složka, která v jídle není, doplněk jen ze schváleného seznamu, nikdy „jíst víc“) a to, že každý postup D-POSTUP má větev pro každý bod. |
| `kontrola3-panel.test.cjs` | 9 | prezentační vrstva | Hlídá panel vyprávění, přeskakování kroků po zamítnutí, souhrn a výsledky správce v ukázce. |
| `kontrola4-obsah.test.cjs` | 16 | jádro a obrazovky | Hlídá rozhodnutí vlastníka z kontroly 4: verzi a otisk položky, větu o poradě s lékařem, připomínky v telefonu, chybějící noční hodnoty, jednoho lékaře a jinou dávku, body ověřované sestrou, mírnější cíle a seznam jídel. |
| `kontrola4-panel.test.cjs` | 18 | prezentační vrstva | Hlídá pravdivý stav uložení v ukázce, vyprávění podle skutečného děje, rozvržení panelu a přístupnost prezentační vrstvy. |
| `kontrola74-obsah.test.cjs` | 19 | jádro + příběh | Hlídá opravy nezávislé kontroly SCHEMA 74: poklesy pod 4 jako varování nebo blok větve „zvýšit“, radu po opakovaných poklesech, jen opsaná celá čísla mezi kontrolami, report a účinky zamítnutí B-HYPO, I-MENE a S-SEMAFOR. |
| `kontrola74-panel.test.cjs` | 7 | prezentační vrstva | Hlídá souhrn rozhodnutí garanta, přeskočené kroky a drobnosti panelu ukázky. |
| `obsah-pacienta.test.cjs` | 9 | obrazovky pacienta (jádro bez slotů ukázky) | Hlídá pravidla P1–P11 z `15` odst. 15b nad všemi stavy pacienta: jeden nadpis a jedno hlavní tlačítko, limity slov, krátká bezpečnostní pravidla s „Celé pravidlo“, žádné texty pro lékaře a garanta, žádné opakované věty a jednu úroveň rozbalení. |
| `pravdivost.test.cjs` | 4 | prezentační vrstva + účinek zamítnutí | Kontroly pravdivosti T1–T4: položka se nabízí jen tam, kde je vidět, mapa scén odpovídá příběhu, zamítnutí každé položky mění obrazovku přesně podle `ucinek` a vyprávění necituje nic, co na obrazovce není. |
| `robustnost.test.cjs` | 14 | jádro | Hlídá odolnost jádra: poškozený stav, neplatné vstupy akcí, escapování do HTML, vykreslení bez vedlejších účinků, determinismus, nulová síťová volání bez `demo/` a výkon při 300 zápisech. |
| `schema84-jadro.test.cjs` | 15 | jádro kontroly | Hlídá rozhodnutí vlastníka ze SCHEMA 84–85: volič „jiná dávka“ u každé dávky, rady první bez zámku, blok „zvýšit“ jen z čistých poklesů, vývoj v čase, kohortu jen s inzulinem, hmotnost a dvě okna včasného inzulinu. |
| `tokeny.test.cjs` | 7 | vzhled | Hlídá, že `app/design.css` nemá pevné hodnoty, každý token je v `app/tokens.css` a katalog `design-system/` ukazuje všechny tokeny. |
| `ukladani.test.cjs` | 29 | prezentační vrstva (vzor klienta) | Hlídá ukládání rozhodnutí garanta na server makety (fronta, opakování, pořadí řádků, pravdivý stav uložení, přihlášení, export pro správce, otisky a testovací vektory) v simulaci bez sítě. |
| `zaverecne80.test.cjs` | 22 | jádro a produkční sestavení | Hlídá opravy závěrečného ověření SCHEMA 80–82: produkční sestavení se skutečným časem, vlastním úložištěm a rolí podle adresy, žádné volné textové pole v ordinaci, noční poklesy (čip u snídaně, export, zápis pacienta) a rady modelové historie skládané jádrem. |

#### `nutrifee-rozhodovaci-maketa.test.cjs` (128)

- Aplikace nikde nepočítá ani nenavrhuje dávku; volí ji lékař
- Porce: před píchnutím oběma směry; po píchnutí jen z větší; nikdy „sněz víc“
- Každá rada a výpočet nese položku registru; zamítnutá položka přestane působit
- Registr: rozhodnutí se uloží ihned, historie jen přibývá, lze měnit
- Lékař mezi kontrolami nic nedělá
- Jádro bez sítě a bez generativní AI; síť volá jen demo/sync.js (rozhodnutí garanta do úložiště makety)
- Přihlášení (7. 10. 2026): bez přihlášení jen přihlašovací stránka; garant ukládá a vidí své, správce vidí výsledky; rozhodnutí z registru přežijí skok na scénu
- Stav položek (7. 10. 2026 večer): ke schválení místo „schváleno předem“; zamítnutí ukáže na místě „tahle část nefunguje“ a příběh pokračuje
- Panel vyprávění (8. 10. 2026): říká, co je na obrazovce; žádný krok nemá titulek, který popisuje jen akci místo výsledku
- Zámek průchodu (8. 10. 2026): bez rozhodnutí nabídnutých položek se nepokračuje; ve finále bez potvrzení souhrnu; jediné tlačítko; fokus zůstává do dalšího kroku; obrazovka v příběhu zamčená
- Úvodní obrazovka (12. 10. 2026): scéna 1 vysvětluje v obsahu, k čemu NutriFee je a jak ukázku ovládat; panel je krátký; karta pacienta až ve scéně 2
- Z registru na místo v příběhu a zpět (12. 10. 2026)
- Lišta garanta bez přepínače rolí (12. 10. 2026): role jen v Panelu prezentujícího
- Registr: detail položky roluje sám (12. 10. 2026)
- Pacientské texty jsou bez rodu (vykání, žádné příčestí „zkusil/zapsal“, žádné „nemocný“)
- Pacientské obrazovky bez zakázaných slov (report, medián, skóre, garant, studie, čistá data) a bez tykání
- Přístupnost E (6. 10. 2026): barvy a velikosti v CSS, stupnice s textovým ekvivalentem, přepínač nemoci nahoře jako switch, dlaždice lékaře znakem + slovem, fokus na h1, zásuvka vrací fokus
- Demo označení je vidět všude, ale jen jednou
- Zařazení: podmínky zamykají pokračování; plán bez náležitostí nejde vydat
- Startovní sada je při čistém zařazení předvyplněná; podmínky z karty jsou označené, ale potvrzuje je lékař
- V ordinaci se nepíše (jen výběr, zaškrtnutí, volič)
- Zaučení: body podle návyků, náhled telefonu, návyky platí až po otázce
- Před jídlem: inzulin první, kroky zamčené bez volby, zápis nese potvrzení dávky
- Nové jídlo jen názvem (15. 10. 2026): „Myslíte X?“ u podobného názvu, nepovinné „Je to jako…“, rady se učí z odpovědi „v jídle to není“, lékař dostane jednu větu
- Učení: známé od 4 započítaných (R-REAKCE minKnown); nezapočítá se nevím, nemoc, jiná porce, jiná dávka
- Reakce těla podle podílu v cíli; rozmezí se s daty upřesňuje (od 8 zápisů percentily)
- Nemoc: pacient označí i ukončí; rady jen bezpečné; data štítkovaná
- Bazál: připomínka večer, potvrzení podle plánu nebo jinak
- Report pro pacienta: pochvala, dlaždice s vysvětlením, navržené otázky
- Tři sloty dne: prázdný na řadě radí, prázdný minulý se doptá; pacient se může opravit
- Zpětná vazba: po příchodu dat karta „Jak to dopadlo“ děkuje za čin; živá glukóza na Dnes není
- Milníky: jednou, za snahu a návyk, ne za hodnotu; Cesta ke kontrole počítá X z N
- Týdenní shrnutí po 7 dnech jednou; vstup k reportu z Plánu a před kontrolou z Dnes
- Kontrola je vedené flow: souhrn → návrhy (jeden po druhém) → plán → předání
- Návrh k dávce: čistá data, rady první, větve podle ověření, jednotky volí lékař
- Vydání P2 z rozhodnutí; historie P1 zůstává; učení po změně dávky znovu
- Odbočka „většinou nepřijal“ vede k jiným návrhům
- Rady svázané s plánem: výměna rady má účinek; návrhy beze změny jedna karta; Vše sedí; Potvrdit plán ukazuje výsledek
- „Pravidla a kontakty“ otevře pokyny a kontakty (C2, SCHEMA 84); návrh k dávce bez schváleného postupu nemá větve
- Čistá data: inzulin včas (dávka 30/15, učení 45/30); jídlo ve dvou slotech s různou dávkou se neslévá; bazál z dnů plánu; nemoc po dnech; HbA1c
- Učení podle jídla dne pacientovi (25. 10. 2026): oběd 10 j. a večeře 8 j. → stav ke každému jídlu dne a jedna věta; při stejné dávce nic
- Ukázkový export a souhrn ze senzoru jsou týž soubor (02 #1, 25. 10. 2026): 14 dní před kontrolou, čísla příběhu z jádra
- Zamítnuté položky přestanou působit: R-SKORE bez štítku, zamítnutá rada s neutrální větou; návyk „zapisuj“ po třech jídlech; bazál ze včerejška
- Svačina: bez inzulinu a bez porce, mimo sloty a návrhy k dávce, učí se zvlášť; v reportu vidět
- Cíle glukózy voličem při zařazení i při kontrole; úprava pokynů při kontrole má účinek; po převzetí P2 lze zahájit další kontrolu
- Druhý průchod: Co teď dává přednost jídlu před bazálem; připomínka inzulinu jen pro slot na řadě; pohyb jen do 60 min po jídle (R-PROCHAZKA okno_min); bez přepínače jídla; bez falešných fajfek
- Texty doplňků nic z jídla neubírají (zásada 3): žádné „místo / vyměň / nahraď / méně / bez“
- Poznámka garanta v panelu vyprávění nemění stav ani se nepočítá jako rozhodnutí (R14); zamítnutá rada zmizí i z reportu a plánu P2
- Rozhodnutí proti směru větve se zapíše jako „jinak“, ne jako souhlas; bod bez větve nevymýšlí větev; vyřazené zápisy jsou vypsané
- Svačina se nepočítá do návyků „obvyklá porce“ a „potvrdit inzulin“ a nespouští milník „umíme poradit“
- Robustnost: kalendářní dny, zpětný čas nikdy v budoucnosti, bazál po půlnoci k předchozímu dni, inzulin přes půlnoc
- Robustnost: akce bez stavu nepadají; Další po ručním zásahu pacienta aplikaci neshodí; výjimka v akci je hláška
- Robustnost: osekaný stav se doplní, cizí schéma se zálohuje a ohlásí, bind mění jen povolené klíče, duplicitní jídlo, meze voličů
- Kontrola po vydání plánu je zamčená: návrhy nelze znovu otevřít ani měnit
- Smoke: náhodné klepání z obrazovky v pěti scénách nerozbije vykreslení
- Sestra: „Ukázat“ u jídla ukáže ukázkové jídlo, Plán s dávkami jde zobrazit, náhled se neovládá; nezdar s důvodem vidí lékař
- Návrh k dávce 6. 10. 2026: okno od změny dávky, ≥ 8 jídel, rozpad po jídlech, celkové vyrovnání na kartě, nízké hodnoty ze všech zápisů
- Čistá data pro dávku 6. 10. 2026: svačina do 2 h, zpětný zápis a pozdní podání jen do učení; oprava inzulinu do 60 minut
- Pacient 6. 10. 2026: pokyn I-NEVIM pod „Nevím“, karta výsledku bez čísla u nezapočítaného zápisu, nemoc po 3 dnech s pokynem, stupeň reakce až od 6 zápisů, rozmezí min–max do 8
- Registr R13: cíle glukózy z položky C-CILE s fallbackem; větve a ověřovací body z D-POSTUP, vyřazená větev zmizí; texty R-PORCE a minuty procházky z položky; každý parametr registru se čte
- Průchod pro garanta (7. 10. 2026): každá položka má pětidílný popis a je nabídnuta právě v jedné scéně hlavní linie; mapa scén odpovídá příběhu
- Průchod pro garanta (8. 10. 2026): schvalování hned v kroku, kdy položka působí, s celým popisem; Pokračovat nikdy neblokuje; řádek Dál a přehled dějství; souhrn na konci; mimo příběh
- SCHEMA 84 (vlastník 5. 11. 2026): panel = rámeček – v „teď“ jen položky z rámečku kroku, rozbalená karta jen z „teď“, po změně kroku žádná držená karta, po Zpět panel totožný s první návštěvou (prohlížečová kontrola: navrhy-designu/32-overeni-cile-2026-11-04/panel-shoda.cjs)
- SCHEMA 84 (integrace): posuvník ukazuje směr od cíle – „pod cílem“ šipkou dolů, „nad cílem“ nahoru
- Stopa má vstupy a výstupy výpočtů; bez exportu
- Skok na kapitolu je deterministický a každá se vykreslí ve své roli
- Celou maketu včetně všech odboček jde projít jen tlačítkem Další
- Krok zpět vrací přesně o jeden krok; na začátku scény o scénu; rozhodnutí garanta přežije skok mezi scénami
- Registr jako seznam ke schválení: souhrn v hlavičce, tři dlaždice, filtry stavů a „s poznámkou“, fulltext i v poznámkách, poznámka bez změny stavu
- Každý krok vypráví a každá kapitola má úvod
- Tempo průchodu (27. 10. 2026): jedno Dál = jeden děj; fn jen s cílem; časy na jednom místě; rozdělení kroků nepřesunulo žádnou položku ke schválení do jiné scény
- Produkční sestavení bez demo/ má registr, jídla i katalogy z app/data/, ale žádný plán; bez položek registru nic neradí
- Vizuální jazyk (15. 10. 2026): jedna SVG ikonová sada bez emoji v jádru; ikona nikdy nenese význam sama; talíře porcí, pás dne, prstenec učení s animací, pruh start → vrchol
- Export ze senzoru (15. 10. 2026): parser čte běžné formáty (metadata + hlavička, typ záznamu, desetinná čárka, středník, mg/dl, ISO čas) a import doplní zápis i noc
- Zátěž pacienta a bezpečnost (18. 10. 2026): čipy po celých mmol/l zamykají krok 1, dotaz na minulé jídlo až při dalším jídle, sledování po menší porci, výstraha po 2 poklesech, rutinní rada sbalená, dva stupně reakce, PAD při zařazení
- Sedm rozhodnutí z 18. 10. 2026 (SCHEMA 54): katalogy v jádru, provozní položky bez garanta, noční otázka po večeři, pokyn pro nemoc dvakrát, bod sestry k exportu, oznámení o nové verzi
- Designový systém (18. 10. 2026): tokeny v app/tokens.css, design.css bez vlastních hodnot, vlastní písma s licencí, stavy barvou + slovem
- Druhá dávka kritiky (19. 10. 2026): CSS jen z tokenů, mřížka čipů, pás dne jako zkratky, návrhová karta s oddíly, čas bazálu voličem
- Verze v HTML souhlasí se schématem stavu
- Třetí dávka kritiky (19. 10. 2026): jedna karta, písmo jen z tokenů, obrazovky bez inline stylů, klasická lišta záložek
- Průvodce položkami (19. 10. 2026, K1): texty odpovídají registru, čísla se dosazují z parametrů, bez interních kódů
- Nová verze z příběhu (O6, 27. 10. 2026) se garantovi nepřipisuje: v historii „model (příběh)“, souhrn bez ní, položka se nabídne normálně
- Prověrka sedmi pohledů (19. 10. 2026): nízká glukóza, volby, Dnes, převzetí, ordinace, sazba
- Zbytek prověrky (SCHEMA 61): fokus po kroku, zásuvka inert, toast, nadpisy, štítky s ikonou, Bezpečí z kroku, časové hlavičky, oprava inzulinu, rámeček ilustrací, potvrzení
- Rozhodnutí 20. 10. 2026 (SCHEMA 62): LF-06 body ověření s daty, token dávky, tkanina zápisů, detail jídla jako obrazovka
- Závěrečná kontrola 21. 10. 2026 – prezentační vrstva: pomlčky, názvy obrazovek, bazál, stopa, lišta, panel, sazba
- Souhrn rozhodnutí na celou šířku (V4, 21. 10. 2026): stránka vlevo, čtyři čísla, nerozhodnuté první, jen klinické položky; panel jen potvrzení
- Bublina „klepne ukázka“ (S4, 21. 10. 2026; oprava 26. 10. 2026): jen u ovládacího prvku, do prázdna nic, aplikace se nezmění
- Vysvětlivky (26. 10. 2026): klepnutí na vysvětlený prvek ukáže nadpis, text a položku registru; přednost před „klepne ukázka“
- Vysvětlivky: každá položka katalogu se v příběhu aspoň jednou najde; texty celými větami, bez „·“, čísla z registru, položka viditelná garantovi
- Katalog: sekce Prezentační vrstva čte demo/demo.css a ukazuje živé prvky vrstvy
- Prověrka před e-mailem garantovi (SCHEMA 65, 21. 10. 2026): jedna míra „v cíli“ (vrchol), léky mimo inzulin na kontrole, shoda opsaných hodnot s exportem, týdenní nabídka vypnutá, věta pod tkaninou, vyprávění bez slibu „za dvě hodiny“
- Pokyny jsou součást plánu (SCHEMA 66, 21. 10. 2026): automaticky ze schváleného registru, každý pokyn položka garanta s výchozí hodnotou, lékař podepisuje plán jako celek, výjimka u pacienta, zamítnutý pokyn do plánu nejde
- Rozhodnutí vlastníka 23. 10. 2026 (SCHEMA 67): porce zleva menší · obvyklá · větší, podpora senzoru vs. formulář k aplikaci, report dříve · teď · rozdíl
- Bezpečnost (23. 10. 2026): CSP povoluje spojení jen na doménu z sync-config, výsledky správce escapují i neplatné datum, id řádku rozhodnutí je jedinečné i po resetu
- Klinická bezpečnost (23. 10. 2026): dávka jen z rozhodnutí lékaře, zpětný zápis se stejnou větví B-HYPO, pokyn hned, sledování bez odpovědi, nevím u vynechaného jídla, nemoc po dnech, dávka podle času jídla, jeden pokles jednou, zamítnuté položky nepůsobí, čipy jako hranice, texty, známé jen ze shody
- Garant 23. 10. 2026 (V16): Potvrdit souhrn s nerozhodnutými položkami se nejdřív zeptá „Zbývá N nerozhodnutých – potvrdit přesto?“
- Garant 23. 10. 2026 (V09): zamítnutí položky bez místa v příběhu řekne rovnou, co se stane, a blok „nefunguje“ je vidět i na začátku další scény
- Zpětný zápis (27. 10. 2026): rada k procházce má dosazené minuty, žádný zástupný znak
- V publikovaných souborech nejsou skutečná jména
- Závěrečná kontrola 23. 10. (01 #1): podobný název nesmí spojit jídla podle jediného shodného slova; platné shody zůstávají
- Rozhodnutí vlastníka 25. 10. 2026: při glukóze pod 4 před jídlem krok 3 neradí vůbec – jen pokyn lékaře k nízké glukóze (živě i zpětně)
- Závěrečná kontrola 23. 10. (01 #2): „Uložit, píchnu za chvíli“ – žádná karta „Opravit inzulin“, dokud inzulin čeká; okno opravy běží od potvrzení
- Závěrečná kontrola 23. 10. (01 #4): důvody „Tentokrát ne“ podle rady; u pořadí zůstává „V jídle to není“
- Závěrečná kontrola 23. 10. (02 #2): „Ponechat“ a „Zamítnout s důvodem“ nevyžadují dokončené ověření, „Souhlasím“ ano
- Rozhodnutí vlastníka 25. 10. 2026: dvě a více změn dávek v kontrole – neutrální věta z D-POSTUP v kroku 3 i v liště, žádný zámek
- Rozhodnutí vlastníka 25. 10. 2026: cíl HbA1c v C-CILE – volič, dlaždice proti cíli a bod 6 z obou částí
- Závěrečná kontrola 23. 10. (02 #3): souhrn ze senzoru patří k plánu – po vydání P2 je „dříve“ souhrn P1, ne týž objekt
- Přístupnost 23. 10. (04): skupiny voleb mají role=group, hledání v registru popisek, krok zařazení aria-current
- SCHEMA 87 (bod 1): pravidla pod 4, nevím a menší porce jdou do stopy jako pravidlo.vysoka; události výpočtu nesou verzi a otisk položek; krácení stopy je omezení makety
- SCHEMA 87 (bod 1): odpovědi pacienta, podmínky zařazení, výchozí hodnoty, ověření dávek a ověřovací body lékaře jdou do stopy
- SCHEMA 87 (bod 1, R7): karta „Jiná dávka než v plánu“ (S-DAVKA) a formulář podpory (S-PODPORA)
- SCHEMA 87 (body 3, 7): čísla pacienta posuvníkem 1–60 j. z jednoho místa; čas inzulinu „jiný čas“ posuvníkem; ordinace má týž rozsah
- SCHEMA 87 (body 4, 5, 6): meze pěti parametrů; denní doby slotů z registru (S-PRIPOMINKY, provozní); výchozí oznámení jádra bez prezentační vrstvy
- Trvalé testy robustnosti (robustnost.test.cjs, závěrečná kontrola 23. 10. 2026) projdou
- Sada `tokeny.test.cjs` – tokeny vzhledu a katalog (B8, C1, C2) projde
- Sada `obsah-pacienta.test.cjs` – obsah obrazovek pacienta P1–P11 (SCHEMA 86, 15 odst. 15b) projde
- Sada `schema84-jadro.test.cjs` – SCHEMA 84 – jádro kontroly podle rozhodnutí vlastníka 4. 11. 2026 projde
- Sada `zaverecne80.test.cjs` – závěrečné ověření 1. 11. 2026 (SCHEMA 80) – tok, produkce, noční pokles projde
- Sada `faze2-jadro.test.cjs` – jádro fáze 2 (balík A) projde
- Sada `faze2-pribeh.test.cjs` – příběh fáze 2 (balík C) projde
- Sada `pravdivost.test.cjs` – kontroly pravdivosti T1–T4 (B25) projde
- Sada `kontrola74-obsah.test.cjs` – nezávislá kontrola SCHEMA 74 – obsah a logika projde
- Sada `kontrola2-obsah.test.cjs` – kontrola 2 (SCHEMA 76) – obsah, pravidla a účinky zamítnutí projde
- Sada `kontrola74-panel.test.cjs` – nezávislá kontrola SCHEMA 74 – panel a rozvržení projde
- Sada `kontrola3-obsah.test.cjs` – kontrola 3 – obsah, jádro a data (A1, A2, B, C) projde
- Sada `kontrola3-panel.test.cjs` – kontrola 3 – panel, příběh, výsledky správce (SCHEMA 77) projde
- Sada `kontrola4-obsah.test.cjs` – kontrola 4 – obsah, jádro a rozhodnutí vlastníka (SCHEMA 78) projde
- Sada `kontrola4-panel.test.cjs` – kontrola 4 – panel, vyprávění, rozvržení a přístupnost (SCHEMA 78) projde
- Sada `ukladani.test.cjs` – kontrola 4 – ukládání, přihlášení a výsledky správce (SCHEMA 78) projde
- SCHEMA 72 + 83: jen dvě rozhodnutí; pole poznámky až po rozhodnutí, hned pod tlačítky; poznámka zůstane v poli po rozhodnutí, změně rozhodnutí, překreslení, skoku i F5; bez rozhodnutí nevzniká
- SCHEMA 72: zásuvka „Vaše rozhodnutí“ z lišty nad příběhem – příběh stojí, nic se nepřehrává; přehled scén ukazuje nerozhodnuté
- SCHEMA 72: „Změnit rozhodnutí“ v oznámení otevře kartu v panelu na místě (ne registr); funguje i v zamčené obrazovce
- SCHEMA 72: záznam „scene“ při opuštění scény (Dál, skok, konec) se stavem a poznámkou položek
- SCHEMA 72: Výsledky garanta – volič garanta z dat, záložka Po scénách (stav při odchodu + „později“) a Registr
- SCHEMA 72: B1 obrazovka v příběhu zamčená i se sbaleným panelem; návrat do příběhu obnoví stav kroku; M6 návrat do registru platí po Dál; B3 detail registru pod lištou
- SCHEMA 74: pacientské obrazovky v celém příběhu (každý krok, Dnes, Bezpečí, Plán, Před kontrolou) bez výzvy volat ordinaci a bez podpisu „váš lékař“
- SCHEMA 74: čip „nad 15“ (glukóza teď i nejvyšší po jídle) hned ukáže pravidlo k vysoké glukóze I-VYSOKA a zapíše se do stopy
- SCHEMA 74: o exportu ze senzoru maketa nemluví konkrétně – žádné „typ A“, formát, klinický účet ani povinné sdílení; připomínka před kontrolou a hláška po nahrání
- SCHEMA 74 (vlastník 27. 10. 2026): garant nic nevymýšlí – registr ani průvodce ho nežádají, aby doplnil nebo navrhl znění; pravidla mají úplné znění
- SCHEMA 83: registr bez prezentační vrstvy – pole poznámky až po rozhodnutí s otázkou podle rozhodnutí, ukládá se po pauze (data-autosave), změna rozhodnutí poznámku zachová, historie slučuje úpravy
- SCHEMA 83: hláška po rozhodnutí v patičce panelu, v zásuvce ani v souhrnu neříká stav uložení (zastaral by); ten je jen pod polem poznámky a v liště

#### `faze2-jadro.test.cjs` (32)

- A01 zamítnutá S-SILNA neskryje „Data ze senzoru“ ani „Bezpečnost“
- A02 štítky položek tam, kde působí (R-REAKCE, R-SKORE, R-PODOBNOST, pokyny, B-HYPO, P-NEMOC)
- A03 zamítnutá R-REAKCE: milník „jídlo už známe“ se nevydává
- A04 pokyn I-MENE po menší porci i při zamítnuté B-HYPO; místo otázky oznámení
- A05 zamítnutí R-NAVYKY, R-POKYNY a P-NEMOC má účinek
- A06 procházka ve zpětném zápisu jen do R-PROCHAZKA.okno_min; pozdější se nepočítá
- A07 pořadí u jednolitých jídel nenabízet; detail bere text ze stejné funkce jako krok 3
- A08 export přepíše noci; hláška jen „Export nahrán a převeden · doplněno N jídel a N nocí“, shoda zvlášť (SCHEMA 74)
- A09 A10 report: V cíli ze základu štítku, sloupec „Zkoušené rady (v cíli)“, věta z registru
- A11 bod „Nad cílem nejsou jen jedno nebo dvě jídla“ s číslem z dat a větví
- A12 A13 návrh „Nejdřív rady“: štítky D-PRAND + D-POSTUP, prahy odmítnutí z registru
- A14 prahy dlaždic kontroly ze S-SEMAFOR
- A15 podobné jídlo jen směrem, bez čísla
- A16 zápis se dvěma přijatými radami se počítá ke každé se značkou
- A17 zpětný zápis: jedno poděkování, karta výsledku bez „Díky za pokus“
- A18 nabídnutá shoda: „Žádné jídlo neodpovídá“ se neříká
- A19 při nemoci všude jedna věta
- A20 (SCHEMA 74): pacient export v aplikaci nenahrává – žádná karta, stránka ani odkaz „Nahrát export“; Z-IMPORT bez pacient_tydne
- A21 A22 texty zaučení a výchozích hodnot; A23 obráceně (SCHEMA 74): bez sdílení dat a klinického účtu
- A24 otázka na pokles všude stejně
- A25 jednotky u počtů rad
- A26 převzetí bez zaučení se zastaví na první stránce
- A27 výměna rady jen za radu, která pacientovi nechodila; „Proč lékař rozhodl“ bez opakování
- A28 bez „Modelový pacient 01“
- A29 po převzetí nového plánu se milníky za minulý plán nevystavují
- A30 počet dní a zápisů z jednoho výpočtu období
- A31 hledání v registru a telefon (CSS)
- A32 R-SKORE jen dva stupně
- A33 karta „Podnět z provozu“: vypnout a nová verze ke schválení
- C21 náhled telefonu u sestry bez „vpravo“
- Jádro bez demo/ běží a nevolá síť
- Celý příběh se vykreslí bez chyby ve všech rolích

#### `faze2-pribeh.test.cjs` (15)

- C01: kroky scény a apply kapitoly vedou ke stejnému stavu (všechny scény včetně dodatku)
- Citace „…“ ve vyprávění (co, vsimni) jsou v tu chvíli na obrazovce; průchod bez chyby
- Každý krok má název jako text a vyprávění „co“; žádné „vpravo“ ani „klíč“
- C03 (obráceno SCHEMA 74): zařazení bez kroku sdílení dat ze senzoru; dávky „zadal voličem“; ověření dávek je překážka vydání
- C04: cíle glukózy mají vlastní krok s cílem na mřížce cílů
- C02, C17, C18: dodatek zaučení a převzetí jen v krocích, kterými se liší
- C05, C06: scéna 11 bez pořadí u kaše, dvě rady, „spolu s další radou“; podnět ve scénáři 5 na řízku
- C07, C14: scéna 12 ukáže „Nevím“ s pokynem I-NEVIM; menší porce cituje jen vykreslené
- C24: scéna „menší porce a pokles pod 4“ v hlavní linii za scénou po píchnutí; dva poklesy → karta s obecnou radou bez výzvy volat (SCHEMA 74)
- C10, Q6: export nahraje sestra před kontrolou; noci jen z exportu; návrh k bazálu s předností; shoda opsaných hodnot
- C15, Q4: zvýšit jen snídani (8 → 10 j.), oběd ponechán; nad cílem víc než dvě jídla
- C16, C21, C23: bez „data říkají jinak“ ve větvi, bez „vpravo“, finále o souhrnu a pěti variantách dodatku
- C19: lékař v reportu vidí otázku, kterou pacient vybral; žádná podstrčená
- C20, A27: hrubá denní doba ve scénáři 2; E900 v den bez jiného oběda; „nemám to doma“ jen u doplňku
- C09, C12, C26: nemoc, zpětný zápis, převzetí a dopad zamítnutí rady

#### `kontrola2-obsah.test.cjs` (18)

- A1: rada k pořadí v2 neradí jíst víc; rada mluvící o množství se po píchnutí / „nevím“ s menší porcí nenabídne
- A2: zamítnutá R-REAKCE ani nepřevzatý plán neskryjí I-MENE, pravidlo k nízké glukóze ani větu o nemoci
- A3–A5, B4: každá garantová položka má v průvodci popis účinku zamítnutí (ucinek) a text „Co se stane“ mu odpovídá
- A3–A5, B4: účinek zamítnutí každé položky na obrazovce odpovídá `ucinek` (co zmizí, co zůstane, jaké oznámení)
- A6, B1, B3: I-HYPO, I-VYSOKA a I-MENE mají úplné znění bez výzvy volat do ordinace a bez rady jíst víc mimo léčbu poklesu
- B2: nejvyšší hodnota „nad 15“ z minulosti začíná „Podívejte se, kolik ukazuje senzor teď“
- Prohlížeč B1: zamítnutí D-BAZAL během kontroly odebere návrh k bazálu; další návrh je snídaně; po schválení se vrátí
- Prohlížeč M2: karta po poklesu se zamítnutou B-HYPO neukazuje počet poklesů
- B7: doplněk k jídlu jen u jídel bez bílkoviny (modelová data)
- B8: podnět z provozu je od jiného pacienta; úvod scénáře 5 neodporuje reportu
- B9: „Jídla opakovaně nad cílem“ jen častěji nad cílem, řazeno podle zápisů nad cílem
- B10: rozpad návrhu ke snídani podle zápisů nad cílem a bod „nejen jedno nebo dvě jídla“ jmenuje obě jídla
- B11, C8: dlaždice času pod 3,9 – hlášené poklesy jako samostatný údaj, mez „méně než 4 % času“
- B12, C12, C15: D-PRAND = 15 odst. 10; druhá podmínka bodu 7; název pro štítek
- B13: potvrzení před zamítnutím B-HYPO říká, že nic nezablokuje větev „zvýšit“
- B14, C1, C11: otázka při rozchodu – nejvyšší hodnota slovem pacienta, jiné množství zvlášť, jedno znění neobvyklého dne
- B15: otázka na pokles u zápisu mladšího než 4 h zní „zatím“
- C2, C4, C13, C14, C16: drobné texty

#### `kontrola3-obsah.test.cjs` (14)

- A2: každé jídlo ze seznamu má strukturované údaje a žádný ručně psaný text rady
- A2: rada k pořadí nikdy nejmenuje složku, která v jídle není; jednolitá jídla pořadí nedostanou
- A2: doplněk je vždy ze seznamu povolených doplňků; u jídla s bílkovinou nebo tukem se nenabízí
- A2 + zásada 3: žádný výsledný text rady (všechna jídla, verze v2, nové jídlo) neříká jíst víc
- A1: každý postup D-POSTUP má větev pro každý bod; žádná větev nevede na volné „rozhodněte sami“
- A1: bod s poklesem pod 4 má přednost před pořadím; bez větve „ponechat“; bez postupu zvýšení jde proti datům
- B2: po zamítnutí R-POKYNY nebo I-HYPO obrazovka na chybějící pravidlo neodkazuje
- B3: zamítnutá R-REAKCE – karta „Jak to dopadlo“ se neptá na rozchod a neslibuje „známé“
- B4: zamítnutá I-KONTAKT – zdravotní cesty v Bezpečí nahradí oznámení, technické zůstanou
- B6: jídla opakovaně nad cílem mají stupeň ze stejného okna jako tabulka reakcí
- B7: doplněk se po stažení (R-DOPLNEK stahnout_po, ani jednou v cíli) už nenabízí – ani v modelových datech
- C1, C2, C3, C13: výčet pravidel podle seznamu, „nevím“ bez tvrzení o inzulinu, jméno pravidla, otázka na věc
- C9, C10: průvodce nežádá poznámku povinně; provozní položky nemají „Co schvalujete“ ani „Co se stane při zamítnutí“
- B1 (podklad pro vyprávění): oznámení o zamítnutí necituje chybějící text obrazovky v uvozovkách

#### `kontrola3-panel.test.cjs` (9)

- B1, M4: po „Potvrdit přesto“ nerozhodnuté položky dodatek neblokují; panel ve finále nepočítá položky zvlášť a říká, kde v tabulce jsou
- M1: zamítnutí v kroku, který položku ukazuje – krok je „note“, ne „přeskakujeme“; úsek počítá jen kroky, které přijdou; Zpět nejde dopředu
- M8: věta o přeskočení jmenuje kroky, zamítnutou položku a položky, které se rozhodnou v souhrnu
- B2, K6: správce má „Výsledky garanta“ i v Přehledu scén (telefon) a v liště nemá počítadlo garanta
- M5: „prošel celou maketu“ jen po všech scénách hlavní linie; nejdál název scény, ne „scéna 31 z 31“
- M6: návrat z odbočky do registru vede tam, kde garant v příběhu byl
- K1, K2, K5: tvar slovesa v souhrnu; „nerozhodnuto“ v kartách garanta; „i“ v panelu je tlačítko s textem
- 02-obsah B1, M7, K3: úvody scén se zamítnutí přizpůsobí; úvody variant dodatku říkají, čím se liší; nadpisy bez citace, která na obrazovce není
- Kontrola pravdivosti: citace v oznámení se nepočítá jako obrazovka; generátor hlídá i popsaný (necitovaný) obsah a úvody; M3 kontejner telefonu

#### `kontrola4-obsah.test.cjs` (16)

- Bod 1: každá položka má verzi; otisk je deterministický a mění se se zněním, parametrem i textem „Co schvalujete“
- Bod 3: karta po opakovaných poklesech a I-HYPO končí větou o poradě s lékařem; bez výzvy aplikace volat
- 02 B6: na chybějící pravidlo se jiné texty neodkazují (I-MENE, I-HYPO, I-VYSOKA)
- Bod 4: připomínky v telefonu – nejvýš 4 denně, časy ze zaučení, k zapsanému jídlu nepřijdou, komponenta oznámení
- Bod 5: bez exportu report v části Bezpečnost řekne, že noční hodnoty chybí
- Jeden lékař a jiná dávka než v plánu (vlastník 1. 11. 2026, body 1 a 5): původ dávky, karta po dvou jiných dávkách, bez jiného lékaře; v kroku 1 „Ano, jinak“
- Bod 7: body, které nejdou ověřit z dat, ověří sestra; „Vše sedí“ je nepřepíná; léky se třetí volbou
- Bod 8 a C15: mírnější cíle jako druhá sada C-CILE; semafor čte cíle pacienta
- Bod 10 a 02 B9: pacient čte „Tato pravidla připravil NutriFee a posoudil je lékař.“, bez osobního ručení
- Bod 11: scénář 5 – garant navrhuje vypnutí, výrobce provádí
- 06 A2, B4, B6: Co neděláme, vylučovací kritéria, otázka na novou dávku
- 06 B5: bod „Opsané nejvyšší hodnoty se shodují s exportem“ s větví a údajem z dat
- 02 B7, B8: doplněk se stáhne i po nezapočítaných pokusech; nové jídlo „jako X“ převezme údaje X
- Seznam jídel a texty (02 C5–C11, zásada 9, 06 B7, B8, 07 B4, B10)
- 07 A2, B3, B8: volič dávky mřížkou, zapomenutý zápis ze včerejška, spolehlivost dat na kontrole
- 01 M3: zamítnuté cíle – štítek semaforu zůstává v řádku „Dlaždice vycházejí z:“

#### `kontrola4-panel.test.cjs` (18)

- Prohlížeč B1: „uloženo“ jen to, co je na serveru – poděkování, konec ukázky, poznámka i lišta podle fronty; stav i na telefonu (⋯)
- Prohlížeč M2, obsah B2: v režimu „note“ zůstává vyprávění kroku a věta o zamítnuté části se připojí
- Prohlížeč M4, M6, kosm. 1–2: pořadí návrhů z dat, volba řízku, rámeček na otázce, jedno Dál = jedna volba
- Prohlížeč M5: položka, která po zamítnutí jiné z kroku zmizí, má v panelu větu, že se rozhodne v souhrnu
- Kosm. 3, 4, 12: hláška v souhrnu bez „Příběh pokračuje“; souhrn nepíše „prošli celou“; scéna za „tady“ není „hotové“
- Obsah B1, B3, B5, B12: vyprávění podle toho, co se opravdu stalo (zamítnuté rady, návyky, sledování poklesů, „Nevím“)
- Přístupnost A1: panel po boku do 640 px (token), užší panel, kompaktní lišta, scroll-padding; B5 pulz 3×; C9 kontrasty tokenem
- Přístupnost B1–B4, C1, C2, C12, C14: panel v DOM hned za lištou, zámek i pro klávesnici, fokus, živé oblasti jen krátké, názvy
- Rozhodnutí 10: lékař návrh ověří s pacientem a rozhodne (ne „jen schvaluje“)
- SCHEMA 84 A1, A2: se zamítnutou R-REAKCE se I-MENE, I-HYPO, D-PRAND i D-CISTA nabídnou v příběhu (ne v souhrnu) a vyprávění kroků říká pravdu
- SCHEMA 84 B4, C4, C5: D-PRAND u „Proč návrh vznikl“, D-CISTA ve vlastním kroku u vyřazených zápisů, D-POSTUP po „Pokles blokuje větev zvýšit“; R-REAKCE/R-SKORE a dvě pravidla pro nemoc ve dvou krocích
- SCHEMA 84 B3: karta ukazuje z „Co schvalujete“ celé věty do 60 slov; u prahových položek první věty říkají slovy, co prahy znamenají
- SCHEMA 84 rozhodnutí 7 (A3): úvod říká asi 60 minut a že se dá přerušit; panel ukazuje „zbývá asi N minut“ a odhad klesá
- SCHEMA 84 B2: zásuvka nenabízí tlačítka položek z budoucích scén; rozhodnuté a nabídnuté kartu mají
- SCHEMA 84 C6, C8: nápověda „i“ říká, jak se vrátit k rozhodnutí, že se poznámka ukládá sama a kde je souhrn; „Zpět k úvodu“ otevře úvod nad příběhem; hláška po načtení počítá položky a poznámky
- SCHEMA 84 B7, C1, C3, C7, C9: souhrn říká, proč se položka nenabídla (přeskočený krok); dodatek 31:5 má vlastní větu; oznámení v telefonu sbalené; velikosti přes token; fokus po Dál vidět
- SCHEMA 84 vysvětlivky i v panelu: dekorace a klepnutí hledají prvky v #main, #tour a #overlay
- SCHEMA 84 „panel = rámeček“ (vlastník 5. 11. 2026): v „teď“ jen položky z cíle kroku, rozbalená karta jen z „teď“, po Zpět a po skoku je panel jako při první návštěvě kroku

#### `kontrola74-obsah.test.cjs` (19)

- A1 (upraveno SCHEMA 84, rozhodnutí 3): poklesy pod 4 po menší porci u oběda jsou varování, větev „zvýšit“ neblokují; poklesy přímo v kartě; oběd ponechán (jedna změna najednou)
- A1: karta oběda na obrazovce vypíše poklesy; registr nese parametr poklesy_od
- A2: rada po opakovaných poklesech neradí porci, dávku podle porce ani volat
- A3: zápisy mezi kontrolami jen opsaná celá čísla; průběh jen z exportu v jeho okně
- B1: pravidla v zařazení jsou vlastní blok, cíle se nabízejí až v kroku cílů
- B2, B4: zpětná snídaně s čipem „nad 15“ ukáže pravidlo I-VYSOKA a otázku při rozchodu
- B3, B5, B13: vyprávění scény 8 nepopisuje neexistující text; doplněk má krok; D-POSTUP až s větví
- B8, B10, C6, C7: report – poklesy u dlaždice, bez zdvojení, noci z exportu, „dny nemoci“
- B11: dlaždice „Přijaté rady“ bez fajfky a bez zelené
- B14, B16: nový plán říká proč; Bezpečí „Tato pravidla připravil NutriFee a posoudil je lékař.“
- B17, B18: zamítnutá B-HYPO skryje otázku na pokles; zamítnutá I-MENE ukáže oznámení na místě pravidla
- B19: zamítnutá S-SEMAFOR vypne semafor dlaždic
- C3: na Dnes je nejnovější milník (řízek, poznaný 12. 10.)
- C5: při nemoci jedna věta „K jídlu neradíme“ a bez řádku s radou
- C8, C14: texty bez historie pro první posouzení; I-MENE bez párování jídla s inzulinem
- C10: vysvětlivky odkazují jen na položky, které prvek řídí
- C9, M8: průvodce bez překlepu a bez surových zástupků {meal} / {tirGoal}
- M1: dodatek „Nejdřív rady“ stojí na radě Doplněk k jídlu
- M7: historie položky podle času, nové znění s ukázkovou hodnotou

#### `kontrola74-panel.test.cjs` (7)

- B1: po změně rozhodnutí jde souhrn potvrdit znovu i s nerozhodnutými položkami (otázka s oběma tlačítky, pak Skončit)
- M2: položka, jejíž krok se přeskočil kvůli zamítnutí, se v té scéně nenabízí, jde do souhrnu; věta o přeskočení je v panelu jednou
- M6: v souhrnu řádek rozhodnutý ze skupiny „Nerozhodnuto“ zůstane na místě s novým stavem a poznámkou; přeřadí se při dalším otevření
- Kosm. 2: první věta vyprávění neusekne citaci před uzavírací uvozovkou
- Kosm. 11: „Ukázka skončila“ přežije obnovení stránky; návrat do ukázky ho zruší
- Kosm. 9, 12: úvod říká, že maketa se chová jako po schválení; otázky ke scénáři říkají, kam s odpovědí
- Rozvržení: tokeny místo pevných rozměrů; list panelu na telefonu při rozhodování vyšší; lišta Další krok nad panelem jen jako cíl kroku

#### `obsah-pacienta.test.cjs` (9)

- Průchod pokryl obrazovky pacienta: Dnes, kroky jídla 1–3, převzetí, Můj plán, Bezpečí, Jídla
- P1: jeden nadpis h1 a nejvýš jedno aktivní hlavní tlačítko; v kroku 1 nejvýš jedna otevřená otázka
- P4 a P8: limity slov – Dnes ≤ 150, „Co teď“ ≤ 20, krok jídla ≤ 90 (krok 3 s radami ≤ 110), karta ≤ 40; pravidlo v okamžiku události se nepočítá
- P8: bezpečnostní pravidlo – v okamžiku události první krok velkým písmem a „Celé pravidlo“; jinde krátce (≤ 60 slov) a „Celé pravidlo“; krátké věty jsou doslova ze schváleného znění
- P9 a zásada 4: pacient nevidí štítky schvalování ani texty pro lékaře, garanta a provoz; místo štítku je značka data-item
- P10: žádná viditelná věta delší než 25 znaků dvakrát na téže obrazovce (celé pravidlo na klepnutí smí opakovat první krok)
- P11: jedna úroveň rozbalení (žádné details v details); v kartě nejvýš dva rozbalovací řádky (výjimka: bezpečnostní karty, pravidla nemoci a seznam pravidel v Bezpečí)
- P6 a P7: „Co teď“ má řádek „Potom“ nebo otázku; věta „jak si vedu“ je slovem a ikonou, čísla až v Podrobnostech
- Povinné věty zůstávají viditelné: „nečekejte na kontrolu…“ u opakovaných poklesů (jednou), připomínka exportu, „odpovědět nemusíte“ u rad

#### `pravdivost.test.cjs` (4)

- T1 položka se ke schválení nabízí jen v kroku, kde je její štítek ve výřezu cíle a na výšku okna od cíle – ve schváleném běhu i při zamítnutí každé položky
- T2 „V příběhu“ a „Kde je použita“ odpovídají mapě scén; mapa odpovídá příběhu; mapa závislostí ukazuje na existující kroky a položky
- T3 zamítnutí každé garantové položky změní obrazovku právě ve scénách z průvodce a obsahem, který popisuje strojový „ucinek“
- T4 vyprávění necituje text, který na obrazovce není, a netvrdí děj, který neproběhl – i při zamítnutí každé položky zvlášť

#### `robustnost.test.cjs` (14)

- Poškozený uložený stav (stejné schéma) nesmí shodit start ani zůstat trvale
- bind() nepřepíše strukturu stavu (draft.doses, meal.decisions, meal.step, reg.open…)
- Dávky a kroky: nečíselná hodnota nic nezmění, žádné NaN ve stavu
- Zpětný zápis: neplatná hodina (−1, 25,5, NaN, 7,999) a nečíselný posun inzulinu nevedou k NaN datu
- csv: neexistující datum/čas se nepřijme, pole v uvozovkách se čtou
- Krok 3 s neznámým jídlem dá hlášku „Vyberte jídlo“ a zápis zůstane otevřený
- shiftTime s nesmyslem nechá hodiny platné
- Žádná hodnota ze stavu nejde do HTML neescapovaná
- Vykreslení je bez vedlejšího účinku na stav: po reloadu je stav stejný jako před ním
- Determinismus akcí a skoku na kapitolu
- Jádro bez demo: 0 síťových volání (fetch, XHR, WebSocket, sendBeacon, Image)
- Výkon: 300 zápisů → Dnes, report pacienta i kontrola lékaře pod 50 ms
- Nemoc: žádná .advice v kroku 3 ani u zpětného zápisu
- Hledání jídla nezávisí na diakritice

#### `schema84-jadro.test.cjs` (15)

- 1: u karty s větví „ponechat“ má lékař volič „jiná dávka“; změna se zapíše jako rozhodnuto jinak než postup
- 1: jídlo dne bez karty má řádek „N z M nad cílem · bez návrhu (práh)“ se stejným voličem; změna = jiná dávka bez návrhu; vydání plánu projde
- 1 + 3: zvýšení u jídla s poklesem při obvyklé porci je rozhodnutí proti datům; poklesy po menší porci jen varování
- 2: karta k dávce vzniká i při „nejdřív rady“; bod 10 „Pacient rady k jídlu zkoušel“ podle dat nesedí → ponechat dávku, posílit radu; text nabídnuto N×, přijato M×
- 2: brána rad neplatí pod odmitnutiMin nabídek – žádná karta „Nejdřív rady“, bod 10 říká „brána rad se neuplatní“
- 4: dva mediány „první polovina období · poslední 4 týdny“ a slovo směru od 1,0 mmol/l – u karet k dávce i v tabulce jídel dne
- 5: kohorta jen inzulin – podmínka zařazení, K-KRITERIA, pravidla bez vět o tabletách, otázka na kontrole Ne / Ano
- C8: otázka na zdravotní stav zvlášť a podle pohlaví; modelový pacient je muž
- 6: hmotnost voličem u sestry (mřížka a ±1), dlaždice „Hmotnost dříve · teď“
- 6 + C9 + B12: v kroku 3 návyky přepínačem z katalogu, cíle voličem, platnost plánu voličem (92 dní výchozí, 6 týdnů); pravidla „platí obecná pravidla NutriFee v1 · beze změny u pacienta“
- A4 + B6 + B9 + B10: karta bazálu – odpověď sestry u bodu 2, okolnosti nocí, ranní opsané hodnoty, přednost jen bez „jídla pozdě večer“ nebo pod 3,0
- B2 + C6 + C7: tabulka jídel podle jídla dne, řazení podle „nad cílem“, svačiny na konci, 5 řádků a „Další (N)“
- B5 + C2: věta o dávkách, které si pacient sám snížil; tlačítko „Pravidla a kontakty“
- Verze: NF.SCHEMA 87, ?v=87 v HTML, data-version="87" v katalogu; D-POSTUP a S-SEMAFOR nesou nové parametry s mezemi
- SCHEMA 85: učení jídel bere inzulin 45 min před / 30 min po jídle, návrh k dávce dál 30 / 15 (D-CISTA pred_uceni_min, po_uceni_min)

#### `tokeny.test.cjs` (7)

- Úvodní komentář design.css nese pravidlo hodnot a jeho výjimky
- design.css: žádné pevné rozměry, délky pohybu, řezy ani rodiny písma mimo výjimky (B8)
- design.css: žádné pevné barvy ani v bloku vysokého kontrastu (C2)
- Každý var(--nf-*) z design.css je definovaný v tokens.css; tokens.css nemá dvojí definici
- Lokální proměnné v design.css (--rl, --c …) nenesou pevné hodnoty
- Katalog načítá tokens.css, design.css, demo.css, catalog.css a catalog.js s ?v= = NF.SCHEMA (C1)
- Katalog ukazuje všechny tokeny a inspektor u vlastnosti uvádí token z pravidla

#### `ukladani.test.cjs` (29)

- Rozhodnutí 1: decision i note nesou params.ver { version, fp, fpGuide, alg }; otisk je deterministický a závisí na znění, parametrech i průvodci
- Rozhodnutí 1: výsledky správce ukážou „rozhodnuto k předchozímu znění“, když otisk nesedí; bez otisku „bez otisku znění“
- Rozhodnutí 2: export JSON a CSV jen pro správce, z načtených řádků bez sítě; 28 položek, stav = logika správce, otisk a platnost, znění, průvodce, surové řádky
- 05 B1: po výpadku i chybě 500 se fronta odešle sama (opakování 2, 5, 15 s…), bez klepnutí; pagehide pošle keepalive, beforeunload varuje
- 05 C6: zaseknutý požadavek po 15 s vyprší a fronta se zkusí znovu
- 05 B2 + 03 B4: trvale odmítnutý řádek jde stranou a neblokuje frontu; reset má item RESET a projde přes item NOT NULL; nic se nezahazuje
- 05 A1: vypršení přihlášení nesmaže koncept ani deník; po novém přihlášení se fronta nejdřív odešle, pak se deník obnoví; jiný účet frontu nepošle ani nezahodí
- 05 A2: dvě karty téhož prohlížeče se nepřepíší – offline fronta drží rozhodnutí obou karet a deník karty A se po návratu doplní
- 05 A3: dvě zařízení – návrat na kartu načte rozhodnutí z druhého zařízení; poslední platí na obou i u správce
- 05 A4: čtení po stránkách – 2500 řádků při Max rows 1000: obnova i správce vidí nejnovější
- 05 B4 + 03 B2: pořadí podle opraveného času (posun hodin z hlavičky Date / z času přijetí); „reset v budoucnosti“ neskryje pozdější rozhodnutí
- 05 B3: pravdivý stav uložení – state(sid) „local“ do odeslání, pak „server“; stateText pro řádek pod poznámkou
- 05 B6 + B5: e-mail ze serveru se ve výsledcích správce escapuje; účty podle user_id
- 01 M7: výchozí účet ve výsledcích je garant, ne vlastní (i když nedávno aktivní) účet správce
- 01 M8: poznámka uložená těsně před Schválit se stejným textem → jeden řádek (rozhodnutí); starší dvojice se u správce nepočítá jako druhé „schváleno“
- 03 B3: rozhodnutí a poznámka z obrazovky registru – where registr, decided_by garant, poznámka u nerozhodnuté má status null
- Regrese: ztracená odpověď a F5 během ukládání – 409 = uloženo, na serveru žádná duplicita; nic nejde mimo úložiště
- Bez sítě a bez přihlášení se nic neposílá; jádro app/ síť nevolá
- 31 A1: karta garanta v souhrnu ukazuje znění z kódu i po scéně 18 (modelová v2 jen v příběhu); rozhodnutí nese ver.shown; rozhodnutí nad modelovou verzí výsledky i export označí
- 31 B1: odchod ze scény nese i položky, o kterých garant ve scéně rozhodl, když je zamítnutí jiné z plánu scény odebralo; „Po scénách“ ukáže, kde se rozhodlo
- 31 B2 + C2: řádky téhož prohlížeče jdou podle seq i při změně odhadu posunu hodin; mezi prohlížeči podle času; pořadí nezávisí na vstupu; deník garanta řadí stejně
- 31 B2: pohled garant_stav (model SQL) a klient (D.sync.sortRows + výsledky) dají u náhodných řádků tří prohlížečů s měnícím se posunem hodin a resety stejný stav
- 31 B3: poznámka nejvýš 4000 znaků (maxlength, počitadlo, i presenter); řádek odmítnutý kvůli délce řekne proč a „Zkusit znovu“ rozhodnutí odešle; snímek souhrnu bez celých poznámek
- 31 B4 + C1 + C8 + C9: otisky jdou přepočítat podle předávky jen z exportu (28 z 28 u fp, fpGuide, fpCat, fpExtra); testovací vektory; popis v exportu podle alg; fpCat a fpExtra v exportu i CSV
- 31 C9: otisk jádra z kódu = otisk se stavem příběhu na začátku (stará rozhodnutí neztratí platnost); karty bez modelové verze mají shown = fp u všech 28
- 31 C3 + C5 + C7: decided_by podle role; nejdál = maximum scén; potvrzení souhrnu před resetem označené; u poznámky čas vzniku
- 31 C6: rozepsaná poznámka v poli s kurzorem se při zavírání stránky uloží a odejde; neuložený koncept vyvolá dotaz prohlížeče
- SCHEMA 83 (vlastník 2. 11. 2026): poznámka po rozhodnutí se ukládá sama po 1 s bez psaní, bez opuštění pole; „Ukládá se…“ → „Uloženo … na serveru“; opuštění pole uloží hned bez dvojího řádku; změna rozhodnutí poznámku zachová; správce vidí úpravy jako jednu řádku
- 31/03 B6: smazání rozhodnutí v jedné kartě druhá karta nevrátí – značka resetu nahradí její deník (storage) a starší záznamy se nezapíšou ani bez události

#### `zaverecne80.test.cjs` (22)

- 03 A1: startovní návyky v konceptu jen jednou; klepnutí návyk opravdu odebere; plán bez duplicit
- 03 A2: po obnovení stránky nová ID navazují za uložená (zápis jídla, sledování, otázky)
- 03 A3, C8, B1: produkce bere skutečný čas, má vlastní úložiště a roli podle adresy (?role=lekar); ukázka hodiny řídí sama
- 03 A4: v ordinaci není volné textové pole (Jiné rozhodnutí u návrhu jen volbou)
- 03 A5: dostupnost dat podle skutečného intervalu měření (5 i 15 min)
- 03 B2, B3, B4: produkce – karta pacienta bez napojení řekne proč; jádro nemluví o maketě; DEMO u sestry jednou
- 03 B5: po vydání P2 hlavička kontroly „začíná dnes“, sestra bez odpovědí minulého období
- 03 C3, C4, C5, C6, C7, C9: hrany
- 02 A1: rady modelové historie skládá jádro – žádná odpověď k radě, kterou jádro nenabídlo; řada a export jedním výpočtem
- 02 A1: návrh zvýšit dávku ke snídani stojí na snídaních obecně, ne na jednom nebo dvou sladkých jídlech; rady první opravdu splněné
- 02 B1, B3: sestra potvrzuje jen to, co data neukážou; HbA1c s datem odběru výběrem
- 02 B7, C2, C3, C4, C7: bazál „v noci na“, večeře 16. a 17. 10., jmenovatel bazálu, dávky u snídaně, nezdařené zaučení
- Bod 7: čip „V noci klesla glukóza pod 4“ jen u snídaně, bez rodu, se štítkem B-HYPO; počítá se do poklesů za 7 dní; ne na noc, na kterou se ptá otázka po večeři
- Bod 7: v příběhu pacient zapíše noční poklesy 25. 12. a 1. 1.; karta po opakovaných poklesech nevznikne (7 dní); lékař je vidí u bazálu a v Bezpečnosti
- 81 bod 8: noční poklesy zapsané pacientem se počítají do návrhu k bazálu i bez exportu; karta řekne zdroj
- 81 bod 9: jídlo „v cíli“ = aspoň 90 % zápisů (varování i bod „nad cílem nejsou jen jedno nebo dvě jídla“)
- 81 bod 10: bod o vyrovnání jen díky HbA1c méně než 5 nad cílem → „Co návrh oslabuje“
- 81 bod 11: slovo směru u procent až od 2 procentních bodů
- 82 B3: v okně exportu rozhoduje export; noc ze zápisu mimo okno navíc i ve jmenovateli; práh minNoci nad posouzenými nocmi
- 82 B2, C1, C2, C7: Bezpečnost jen s návrhem k bazálu, bez dvojité tečky; bez S-SEMAFOR slovo podle znaménka; ranní odpověď jako čip
- 82 B1, C4, C5: vyprávění podle R-PROCHAZKA; rozklik času v cíli; krok s hodnotou míří na sbalený řádek
- Předávka Z J1, J2: registr ukazuje znění podle V.shownItem; poznámka v rozhodovacím bloku nejvýš 4000 znaků

### 5.2 Jak testy převést do cílového jazyka

1. **Pochopte zavádění.** Každý soubor si v izolovaném kontextu načte skripty z `nutrifee-rozhodovaci-maketa.html` (jádro `app/` a obvykle i `demo/`) a pracuje přes `NutriFeeApp.act(akce, hodnota)`, `NutriFeeApp.getState()` a funkce `NF.*`. Pomocník `chapter(id)` skočí na kapitolu modelového příběhu (například `enroll`, `firstMeal`, `week`, `advice`, `afterBolus`, `hypo`, `illness`, `nightLow`, `preview`, `reviewSummary`, `reviewProposals`, `reviewConfirm`, `newplan`) a přehraje stav od začátku. `markup()` vrátí vykreslený HTML obrazovky a aserce porovnávají text, atributy `data-action` a `data-item` nebo stav.
2. **Převezměte modelového pacienta jako testovací přípravek.** Kapitoly a data jsou v `demo/fixtures.js` (`setup` = kulisy, `apply` = akce kapitoly). V cílovém projektu z nich udělejte funkci „stav v kapitole X“. Do produktu nepatří.
3. **Namapujte akce.** Název akce z testu (`startMeal`, `mealBolus`, `propDecide`…) odpovídá akci v `app/ui.js`. Převeďte ji na příkaz vaší vrstvy (doména, nebo test obrazovky); hodnoty akcí jsou řetězce typu `klíč:hodnota`.
4. **Zachovejte aserce doslova.** Prahy, počty, data a věty jsou specifikace. Před porovnáním textu nahraďte nezlomitelné mezery obyčejnými (testy to dělají funkcí `plain`). Aserci neoslabujte; selhání opravte kódem.
5. **Vynechte testy prezentační vrstvy.** Nepřevádějí se soubory `faze2-pribeh.test.cjs`, `kontrola3-panel.test.cjs`, `kontrola4-panel.test.cjs`, `kontrola74-panel.test.cjs` a v `pravdivost.test.cjs` testy T1, T2 a T4. V hlavní sadě se nepřevádějí testy o průchodu ukázkou: názvy začínající „Průchod pro garanta“, „Panel vyprávění“, „Zámek průchodu“, „Úvodní obrazovka“, „Z registru na místo v příběhu“, „Lišta garanta“, „Skok na kapitolu“, „Celou maketu včetně všech odboček“, „Krok zpět“, „Každý krok vypráví“, „Tempo průchodu“, „Bublina“, „Vysvětlivky“, „Souhrn rozhodnutí na celou šířku“, „Garant 23. 10.“, „Katalog: sekce Prezentační vrstva“, „Přihlášení (7. 10. 2026)“, „Poznámka garanta v panelu vyprávění“, „Smoke“, „SCHEMA 84 (vlastník 5. 11. 2026): panel = rámeček“, „SCHEMA 83: hláška po rozhodnutí v patičce panelu“ a testy „SCHEMA 72“ o zásuvce, scénách a výsledcích garanta. Smíšené testy (část o obrazovce aplikace, část o panelu) převeďte jen v části o obrazovce.
6. **Ukládání garanta jako vzor.** `ukladani.test.cjs` testuje server makety pro rozhodnutí garanta. Pro ostrou aplikaci z něj převezměte scénáře klienta (výpadek, opakování, dvě karty, dvě zařízení, ztracená odpověď, pořadí, pravdivý stav uložení) a testovací vektory otisku; server makety nepřevádějte.
7. **Zobecněte T3.** Test T3 z `pravdivost.test.cjs` zamítne každou klinickou položku zvlášť a ověří, že obrazovky se změní přesně podle `ucinek` v `demo/guide.js`. V cílovém projektu napište stejný průchod: pro každou z 28 položek zamítnout, projít obrazovky, ověřit, co zmizí, co zůstane a jaké je oznámení.
8. **Názvy testů nejsou vždy aktuální.** Čtyři zastaralé názvy SCHEMA 87 opravila (komentář „SCHEMA 87“ u každého). Zůstal název „volič dávky mřížkou“ v `kontrola4-obsah.test.cjs`, jehož tělo testuje posuvník. Specifikací je vždy tělo testu.
9. **Po převodu** spouštějte celou sadu při každé změně a kontrolujte celý výstup. Výběr jednotlivých testů v maketě: proměnná `ONLY=část názvu` (v hlavní sadě i `ONLYRE=regulární výraz`).
