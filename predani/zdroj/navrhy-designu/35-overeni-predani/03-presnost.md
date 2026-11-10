# Ověření předání: přesnost dokumentů proti kódu makety

*Prověrka 9. 11. 2026. Ověřovala se předávka v `predani/` (README, `00-postup.md`, `10-atlas-pacient.md`, `20-atlas-ordinace.md`, `30-prilohy.md`, snímky `obrazovky/`) proti publikační kopii makety `~/Documents/Nutrifee/nutrifee-rozhodovaci-maketa/` (HEAD `0478226`, SCHEMA 88) a proti `predani/zdroj/15-ZDROJ-PRAVDY-MAKETA.md`. Nic se neměnilo. Skripty jsou ve scratchpadu `proverka-presnost/` (`ids.cjs`, `bare.cjs`, `tests.cjs`, `tests2.cjs`, `tests3.cjs`, `list30.cjs`, `events.cjs`, `registr.cjs`). Maketa se pro skripty načítala stejně jako v testech (`pravdivost.test.cjs` → `boot()`), takže se kontroloval skutečný běhový stav `NF.*` a `NF.screens`, ne jen text.*

## 1. Míra přesnosti

| Oblast | Ověřeno | Chybných | Jak |
|---|---|---|---|
| Jména `NF.*` a `V.*` ve všech čtyřech dokumentech | 605 výskytů (00: 307, 10: 132, 20: 127, 30: 39) | 0 | skript proti běhovému `NF` a `NF.screens`, zbytek proti textu `app/` |
| Názvy akcí (`akce …`) | 100 výskytů (154 akcí v `app/ui.js`) | 0 | skript proti klíčům objektu `A` v `ui.js` |
| Ostatní identifikátory v `` ` ` `` (lokální funkce obrazovek, pole) | všechny | 0 | skript; neznámé jen `ucinek`, `fpCat`, kapitoly příběhu – všechny existují v `demo/` |
| Jména událostí stopy | 125 výskytů, 32 + 24 + 9 unikátních | 0 | skript proti `NF.log(S, '…')`, `NF.RULE_EVENTS` a dynamickým jménům (`zauceni.*`, `pripominka.*`, `ucast.*`) |
| Citace názvů testů v řádcích „Testy“ (00, 10, 20) | 423 | 4 | skript (části mezi „…“ musí být v názvu testu v uvedeném souboru) |
| Seznam testů v příloze 5.1 | 390 položek, 17 souborů, 376 testů | 2 | skript proti `test('…')` ve všech `*.test.cjs` |
| Tabulka registru v příloze 2 | 42 řádků, 481 kontrol (id, klinická/provozní, název, verze, každý parametr: výchozí hodnota a meze, popis = první věta `summary`, úplnost `PARAM_BOUNDS`) | 0 | skript `registr.cjs` |
| Katalogy v příloze 3 (7 pravidel I-*, 6 návyků, statistiky 171 jídel) | 7 + 6 + 9 čísel | 0 | skript |
| Počty a souhrnná tvrzení v `00` (42/28/14 položek, 171 jídel, 7 pravidel, ~400 `NF.*` (410), ~150 akcí (154), 17 souborů/376 testů, meze pěti parametrů, meze S-PRIPOMINKY, `NF.DOSE_RANGE` 1–60, `NF.INS_AGO_MAX` 120, `TRACE_MAX`/`TRACE_FULL`) | 16 | 0 | skript a čtení kódu |
| Čísla modelového pacienta v `00` etapa 3 (37 jídel, 14 nocí, shoda 36 z 37, TIR 68 %, karta bazálu „noční hodnoty pod cílem“, větev „zvýšit“ u snídaně i oběda) | 6 | 0 | přehrání příběhu do `reviewProposals` |
| Vzorek obrazovek pacienta – věcná tvrzení (prahy, parametry, texty, akce, stav, stopa) | 18 obrazovek (P08, P16, P17, P18, P26, P27, P28, P29, P30, P31, P43, P44, P45, P46, P50, P51, P54, P55), cca 150 tvrzení; snímky P16, P18, P26, P30, P45, P46, P51, P54 | 3 | čtení kódu `screens.js`, `ui.js`, `core.js`, snímky |
| Vzorek obrazovek ordinace | 11 obrazovek (O02, O03, O04, O10, O14, O15, O16, O17, O21, O25, O30), cca 110 tvrzení; snímky O15, O30 | 1 | čtení `screens-clinic.js`, `core.js`, registru D-POSTUP, snímky |
| Vzájemná konzistence dokumentů a soulad s `15` | – | 6 | ruční porovnání |

**Celkem zhruba 1 960 ověřených tvrzení, 16 nepřesností.** Přesnost je kolem **99 %**. Žádná nepřesnost se netýká zásad 1–3 (dávka, „nikdy sněz víc“, nízká glukóza) ani čísla, prahu nebo meze v registru. Programátor by podle dokumentů postavil kód, který dělá totéž co maketa. Výjimkou jsou tři místa, kde by se snadno spletl: vzhled vedlejších tlačítek v P46, text první volby v kroku 1 podle `00` a odkaz na neexistující test „P2“. Tabulka registru, katalogy, jména funkcí, akcí a událostí stopy jsou bez chyby.

## 2. Chyby, seřazené podle dopadu

### Vyšší dopad: programátor by postavil něco jinak

1. **`00-postup.md` odd. 6 („Vyřešeno v SCHEMA 87 a 88“) bod 1 a etapa 2 „Pozor“ tvrdí, že otázka „mají být denní doby slotů klinické?“ je otevřená a odkazují na odd. 5 bod 1.**
   - Skutečný stav: tentýž oddíl 6 hned nahoře, `15` odst. 7a (ř. 80) i `15` odst. 16 (SCHEMA 88) říkají, že vlastník 7. 11. 2026 rozhodl: zůstávají provozní parametry S-PRIPOMINKY a garant je neschvaluje. Odd. 5 bod 1 navíc mluví o něčem jiném (otisk katalogu `fpCat` po přidání mezí).
   - Dopad: programátor může zbytečně čekat na rozhodnutí, nebo z denních dob udělat klinickou položku ke schválení.
   - Oprava: v etapě 2 a v odd. 6 bod 1 napsat „rozhodnuto 7. 11. 2026: provozní“. Odkaz „(oddíl 5)“ v etapě 2 nechat jen u otázky, zda meze patří do otisku.

2. **P46 (`10-atlas-pacient.md`) popisuje „vedlejší obrysové volby „Už píchnuto 8 j.“ a „Píchnuto jinak““.**
   - Skutečný stav: `app/screens.js` ř. 1327 je kreslí třídou `quiet`, tedy jako podtržené textové odkazy bez rámečku. Tak je to vidět i na snímku P46. Obrysová tlačítka (výchozí `btn` bez třídy) mají tytéž volby v P43 (běžná větev „Ještě ne“).
   - Dopad: rozdíl je záměrný, protože hlavní tlačítko nemá navádět k potvrzení píchnutí. Programátor by ho podle textu smazal.
   - Oprava: „vedlejší textové odkazy (třída `quiet`)“.

3. **`00-postup.md` etapa 8 („Co postavit“) uvádí první volbu kroku 1 jako „Ano, 8 j. · píchnuto“.** Stejně to stojí v `15` odst. 7 bod 1 (ř. 71).
   - Skutečný stav: obrazovka i atlas P26 mají „Ano, 8 j.“ s podřádkem „podle plánu z 5. 10.“ (`NF.doseOrigin`).
   - Dopad: podle zásady „co maketa dělá, platí“ je text v `00` i v `15` zastaralý. Programátor, který čte jen `00`, postaví jiný text.
   - Oprava: sjednotit `00` s P26. `15` odst. 7 dopsat za maketou.

### Střední dopad: chybný nebo matoucí odkaz na test či soubor

4. **P16 („Testy“) odkazuje na `obsah-pacienta.test.cjs` „P2“.** Takový test neexistuje: soubor má P1, P4 a P8, P6 a P7, P8, P9, P10, P11 a dva souhrnné testy. Pravidlo P2 („Co teď“ v prvních 780 px) se v tomto souboru netestuje pod vlastním názvem.

5. **`00-postup.md` etapa 2 a příloha 5.1 (`schema84-jadro.test.cjs`) uvádějí test „Verze: NF.SCHEMA 87, ?v=87 v HTML, data-version="87"…“.** Skutečný název je „Verze: NF.SCHEMA 88, ?v=88 v HTML, data-version="88" v katalogu; …“. Hledání `ONLY=` podle dokumentu test nenajde.

6. **P22 a P40 (`10-atlas-pacient.md` ř. 425 a 693) přiřazují k `robustnost.test.cjs` testy „Robustnost: kalendářní dny…“ a „Robustnost: osekaný stav…“.** Oba jsou jen v hlavní sadě `nutrifee-rozhodovaci-maketa.test.cjs`; v `robustnost.test.cjs` není nic o půlnoci ani o duplicitním jídle. Text sice v závorce dodává „v hlavní sadě“, ale jako první jmenuje špatný soubor.

7. **`00-postup.md` etapa 7 („Vstupy“) řadí `NF.OFF_TEXT` mezi funkce v `app/core.js`.** Konstanta je definovaná v `app/screens.js` ř. 53, jak správně říká atlas pacienta. Pro převod vrstev to má význam: výchozí text oznámení je dnes ve vrstvě obrazovek, ne v doméně.

### Nižší dopad: nesoulad mezi dokumenty a drobné nepřesnosti

8. **`00-postup.md` odd. 1.5, poslední věta: „`15` a podklady ve složce `navrhy-designu/` nejsou ve veřejném repozitáři makety; programátor je dostane od vlastníka.“** Odporuje to `predani/README.md` (odkazy vedou do `predani/zdroj/`), `00` odd. 6 bod 7 (vlastník rozhodl dát je do repozitáře) i skutečnosti: `predani/zdroj/15-…md` a `predani/zdroj/navrhy-designu/…` jsou v gitu (124 sledovaných souborů v `predani/`).

9. **Hlavička `10-atlas-pacient.md` uvádí „(SCHEMA 87)“ a „`NF.SCHEMA = 87`“.** README, `00` a `20` uvádějí SCHEMA 88 a kód má `NF.SCHEMA = 88`. Obsah atlasu SCHEMA 88 neodporuje, protože SCHEMA 88 obrazovky pacienta neměnila.

10. **Příloha 5.1 má u `nutrifee-rozhodovaci-maketa.test.cjs` v nadpisu „(128)“, ale vyjmenovává 142 testů.** Rozdíl dělá 14 testů „Sada X projde“, které vznikají ve smyčce (ř. 2266) a ve zdroji nejsou jako `test('…')`. Obě čísla jsou správná. Chybí ale vysvětlení, které spojí 128 v nadpisu, 376 v `00` odd. 1.3 a „142 prošlo“ referenčního běhu.

11. **Příloha 5.1 uvádí název testu „Jádro bez sítě … (rozhodnutí garanta do úložiště makety)“.** Skutečný název končí „(rozhodnutí garanta do Supabase)“. Úprava je pochopitelná kvůli zásadě 9 (žádná jména produktů), jenže `ONLY=` podle dokumentu test nenajde. Navíc jméno produktu zůstává v názvu testu v kódu.

12. **O15 („Stav na snímku“) popisuje body jako „sbaleno „10 z 10 sedí · upravit““.** Na snímku jsou rozbalené: šipka nahoru a všech 10 bodů s tlačítky Sedí/Nesedí. Stejně je rozbalené „Co návrh oslabuje (3)“. Jde jen o neshodu popisu snímku, chování popsané v textu odpovídá kódu.

13. **`00-postup.md` odd. 1.3 uvádí „`design-system/` … přenáší se 1:1“.** Katalog ale načítá i `demo/demo.css` a má sekci „Prezentační vrstva“ (test „Katalog: sekce Prezentační vrstva“, „Katalog načítá tokens.css, design.css, demo.css…“). Při přenosu „1:1“ je potřeba tuto sekci vynechat, což dokument neříká.

### Vlastní rozpory se `15` (shrnutí)

- Bod 1 výše: `00` tvrdí „otevřené“, `15` odst. 7a a 16 „rozhodnuto“.
- Bod 3 výše: `15` odst. 7 a `00` uvádějí „Ano, 8 j. · píchnuto“, maketa a atlas „Ano, 8 j. / podle plánu z 5. 10.“. Platí maketa.
- Bod 8 výše: `00` odd. 1.5 o umístění `15` odporuje rozhodnutí vlastníka 6. 11. 2026, které cituje sám `00` odd. 6 bod 7.

Jiný rozpor se `15` ve vzorku není. Kohorta (jen inzulin, žádný jiný lék na diabetes), rozsah 1–60 j., práh nízké glukózy pevně 4, nejvýš 4 připomínky denně, 42/28/14 položek, 171 jídel, sedm pravidel I-*, dvě okna včasného inzulinu (30/15 a 45/30), blokování větve „zvýšit“ jen čistými poklesy a „Souhlasím“ / „Jiné rozhodnutí“ jsou v `15`, v předání i v kódu stejně.

## 3. Co se ve vzorku ověřilo bez nálezu

Krok 1 (P26–P31):
- akce `mealBolus` přijímá `as · other · before · unknown`;
- `mealTimeAgo` bere 0–120 min a jen násobky 5;
- `mealBefore` při „pod 4“ volá `NF.noteRule(S,'I-HYPO','now')` a při „nad 15“ volá `NF.noteHigh(S,'now')`;
- při „Nevím“ se zapíše `pravidlo.nevim` s `where: 'krok1'`;
- pásma posuvníku glukózy jsou 4–15 s konci „pod 4“ a „nad 15“, zelené pásmo končí na horním cíli;
- věta „Teď neradíme – řiďte se pravidlem k nízké glukóze…“ sedí se snímkem.

Krok 3 (P43–P46):
- větev „pod 4 a Ještě ne“ má hlavní tlačítko „Uložit, inzulin zatím ne“ s akcí `mealFinish:pending` a řádek „Co dál: na Dnes se zeptáme, jestli byl inzulin.“;
- `pravidlo.nizka` a `pravidlo.mene` se zapisují s `where: 'krok3'` a `'odmitnuta'`;
- `NF.addHypoWatch(S,'smaller',…)` se volá při uložení;
- texty karty I-MENE sedí se snímkem P45.

Dnes a nízká glukóza (P16–P18):
- B-HYPO `pripominka_min` 60, `poklesy` 2, `dny` 7;
- noční otázka přijde v 5:00 další den;
- platnost otázky je 24 h, noční otázka platí celý den;
- stavy jsou waiting / due / answered / unanswered;
- `LOW_NOTICE_H` = 3;
- věta „nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal“ a tři body karty sedí se snímkem P18.

Můj plán a Bezpečí (P51, P54, P55):
- obsah a pořadí bloků sedí se snímky;
- jsou tam čtyři cesty „Kam se obrátit“, šest názvů pravidel, věta z K-KRITERIA a přepínač „Není mi dobře“.

Ordinace:
- `NF.ELIGIBILITY` má 4 položky a `NF.EXCLUSION` 2;
- posuvníky výchozích hodnot mají rozsah 0–100 / 0–40, HbA1c 30–120 a jádro přijme 20–150;
- čas bazálu se volí z 20/21/22;
- parser exportu hledá hlavičku v prvních 4 řádcích;
- import páruje měření v okně −5 až +180 min, s ≥ 4 body, bodem do 10 min a bodem po 120 min; noci ze záznamů po 21. hodině;
- postupy D-POSTUP: `prandHigh` 10 bodů, body sestry 2, 4, 5 a všech 11 větví, `bazalLow` 3 body a `bazalHigh` 4 body přesně podle O14 a O17;
- priority návrhů jsou 0 / 2,5 (bazál), 1, 2 / 3,5, 3, 4–7;
- důvody zamítnutí jsou čtyři;
- text `D-POSTUP.texts.postupne`, „Zobrazit dalších 80“, „Schvalovací registr · Rozhodnuto X z 28“ a filtr událostí `prezentace.*` ve stopě sedí.

## 4. Stačí snímky k věrnému převzetí vzhledu?

**Ne. Snímky stačí jako referenční obrázek obsahu a pořadí, ne jako specifikace vzhledu.**

Co snímky dávají:
- 57 obrazovek pacienta v šířce 390 px a 30 obrazovek ordinace v šířce 1440 px, celou výšku stránky;
- texty, pořadí bloků, barevné role a výchozí stav každé obrazovky.

Co ze snímků vyčíst nejde:
- **Hodnoty:** odstupy, velikosti písma, zaoblení, stíny a přesné barvy. Ordinace v 1440 px se navíc na snímku zmenšuje.
- **Stavy prvků:** fokus, najetí myší, stisknuté a zamčené tlačítko, chyba, načítání, animace (prstenec, pás dne, vysvětlující animace, `prefers-reduced-motion`).
- **Cílové rozvržení ordinace od 1600 px** se třemi sloupci (pruh · pracovní sloupec · kontextový sloupec). Žádný snímek ho neukazuje, protože všechny jsou v 1440 px, kde kontextový sloupec chybí. Atlas to sám uvádí jako otevřený rozpor R9. Programátor tak nemá jediný obrázek rozvržení, které `15` odst. 15a předepisuje.
- **Přístupnost:** písmo 160 %, nejužší telefon (`@media (max-width:359px)`), telefon na šířku (`max-height:500px`) a ovládání posuvníku klávesnicí.

**Designový systém popsaný je jen odkazem, ne obsahem.**

Kde se zmiňuje:
- `00` odd. 1.3 a 1.4 a etapa 4 jmenují `app/tokens.css` jako jediný zdroj hodnot a `app/design.css`;
- dále jmenují `app/fonts/` (s licencí OFL), `app/icons.js` a katalog `design-system/index.html` s inspektorem;
- etapa 4 vyjmenuje komponenty, barevné role a testy (`tokeny.test.cjs` a pět testů hlavní sady);
- příloha 5 popisuje, co hlídá `tokeny.test.cjs`.

Co v předání chybí:
- přehled tokenů: v `tokens.css` je 295 tokenů `--nf-*`, ale kategorie, typografická stupnice, mřížka odstupů ani paleta s kontrasty nikde vypsané nejsou;
- seznam komponent s jejich variantami a stavy;
- popis, jak číst katalog a jeho inspektor;
- upozornění, že katalog obsahuje i sekci prezentační vrstvy (bod 13).

Věrné převzetí vzhledu je proto možné jen tehdy, když programátor převezme přímo soubory `tokens.css`, `design.css`, `fonts/`, `icons.js` a `design-system/`. `00` to říká („přenáší se 1:1“), takže cesta existuje. Snímky samy nestačí.

Doporučení do předání:
- krátká příloha „Designový systém“: kategorie tokenů, typografie, odstupy, barevné role s tokeny, seznam komponent a jejich stavů, jak otevřít katalog a co z něj nepřenášet;
- aspoň dva snímky ordinace v 1600 px nebo širší (krok 2 kontroly a zaučení u sestry);
- jeden snímek pacienta s písmem 160 %;
- jeden list stavů tlačítek a posuvníku z katalogu.

## 5. Poznámka k testům

Celá sada (`node nutrifee-rozhodovaci-maketa.test.cjs`) se spustila v publikační kopii bez souborů o úroveň výš (`../15-…md`, `../navrhy-designu/…`), přesně podle `predani/README.md`. Výsledek je v odstavci níže.
