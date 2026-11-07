# Kolo 4 a nové pohledy – rozhodnutí vlastníka 30. 10. 2026

Nálezy: 01 prohlížeč (1/8/12), 02 obsah (0/12/16), 03 předání programátorovi (1/5/7), 04 přístupnost (1/6/14), 05 robustnost a bezpečnost (4/7/9), 06 regulace a klinická bezpečnost (3/15/14), 07 reálný provoz (3/9/5).

1. **Otisk verze:** každé rozhodnutí ukládá otisk znění, parametrů a textu „Co schvalujete“ a číslo verze položky (`version` v registru); každá publikace dostane v gitu značku `schema-NN`. Správce vidí „rozhodnuto k předchozímu znění“.
2. **Export pro správce:** ve „Výsledcích garanta“ JSON + CSV se zněním položek, jen pro správce (dřívější zavržení 7. 10. přebito – nový důvod: předání programátorovi).
3. **Opakované poklesy:** na konec karty B-HYPO `opakovane` a do I-HYPO věta „Když glukóza klesá pod 4 opakovaně, nečekejte na kontrolu: poraďte se s lékařem, který vám inzulin předepsal.“ (Aplikace nikam nevolá, nic neposílá, lékař nic nesleduje.) Upřesňuje rozhodnutí z 27. 10.
4. **Připomínky v telefonu:** nejvýš 4 denně, časy vybere pacient se sestrou při zaučení (jídla, bazál) + otázka „pod 4?“ za 60 min; pacient je může vypnout; lékař nic nenastavuje. V maketě ukázat jako oznámení telefonu.
5. **Export ze senzoru:** beze změny – pacient ho před kontrolou udělá ve webovém rozhraní výrobce senzoru a pošle do ordinace (vlastník). Report musí výslovně říct, když noční hodnoty chybí.
6. **Dávka změněná jinde:** „Podle plánu z 3. 10.: 8 j. Když vám lékař dávku mezitím změnil, řiďte se jím a klepněte na „Píchnuto jinak“.“ Po dvou stejných „jinak“ u téhož jídla karta „Ukažte prosím na kontrole sestře, že máte jinou dávku“; bod zaučení.
7. **Sestra ověří 3 body předem:** body D-POSTUP, které nejdou ověřit z dat, projde sestra s pacientem výběrem před lékařem a převezme krok 1 kontroly; lékař vidí její odpovědi a rozhoduje; zrušit hromadné „Vše sedí“ u těchto bodů. Mění 15a.
8. **Mírnější cíle:** při zařazení volba „běžné cíle“ / „mírnější cíle pro starší a křehké“ (návrh autora: čas v cíli ≥ 50 %, pod cílem < 1 %), obě sady v C-CILE.
9. **Karta k dávce:** tlačítka zůstávají Souhlasím / Upravit / Zamítnout (vlastník odmítl změnu).
10. **Kdo ručí:** „lékař návrh ověří s pacientem a rozhodne“ (místo „jen schvaluje“); u pacienta „Tato pravidla připravil NutriFee a posoudil je lékař.“
11. **Scénář 5:** garant navrhuje, výrobce provádí – tlačítko „Navrhnout vypnutí položky“, vypnutí a nová verze v řízení změn výrobce, garant je v ostrém provozu role na straně výrobce.

Bez dotazu (opravy podle nálezů): vše ostatní z 01–07 (robustnost ukládání, XSS, identita z triggeru jako SQL text pro vlastníka, přístupnost, volič dávek mřížkou, upozornění senzoru text A2, B-HYPO nepravdivé „uloženo“, zásuvka posun, vyprávění po zamítnutí, Hermelín → obecný název, atd.).

## Doplňující rozhodnutí vlastníka 1. 11. 2026 (po SCHEMA 78)

1. **Lékař je vždy jen jeden.** „Nechci do makety ani aplikace dalšího lékaře tahat. Počítej s tím, že lékař bude vždy jen jeden.“ Ruší se bod 6 z 30. 10. (dávka změněná jiným lékařem): provozní položka S-DAVKA, karta „Máte jinou dávku než v plánu?“, bod zaučení `doseElsewhere`, věty „když vám lékař dávku mezitím změnil / jiný lékař / při hospitalizaci“. Nikde v maketě se nemluví o jiném lékaři.
2. **R-DOPLNEK** dostane podmínku: „Přidejte k jídlu {doplněk}, pokud vám nevadí. Z jídla nic neubírejte.“
3. **Procházka bez podmínky; kohorta.** „Aplikace bude pro DM2, kteří nemají potíže se hýbat.“ R-PROCHAZKA zůstává beze změny; omezení pohybu patří ke kohortě (vylučovací kritérium při zařazení).
4. **Podklad účelu určení a DPIA** (`navrhy-designu/14-ucel-urceni-a-dpia-2026-10-18.md`) se aktualizuje podle stavu SCHEMA 78/79.
5. **Jiná dávka než v plánu (riziko 06 A3) — karta bez jiného lékaře.** O jiném lékaři ani nemocnici se nemluví. Když pacient dvakrát po sobě zapíše u stejného jídla jinou dávku než v plánu, na Dnes se objeví karta „Dvakrát jste zapsali jinou dávku než v plánu. Řekněte to prosím na kontrole sestře.“
6. **„Hospitalizace“** zůstává jako příklad u volby sestry „změnil se zdravotní stav“.
7. **Noční pokles (31/02 B2): čip u snídaně.** V kroku 1 u snídaně (pacient stejně opisuje hodnotu) přibude nepovinný čip „V noci jsem měl(a) pod 4“. Žádná nová otázka ani připomínka. Noční pokles se počítá do B-HYPO (2 za 7 dní → karta s obecnou radou) a v reportu je u bazálu.

## Rozhodnutí vlastníka 1.–2. 11. 2026 k otázkám SCHEMA 80 (31/13-schema80-jadro.md Q1–Q7)
8. **Q1:** noční poklesy zapsané čipem se počítají do návrhu k bazálu (D-BAZAL) i bez exportu, jako noc pod cílem; karta ukáže, že zdrojem je zápis pacienta.
9. **Q2:** tolerance 90 % – „jídlo zůstalo v cíli“ a bod „nad cílem nejsou jen jedno nebo dvě jídla“ počítají „v cíli aspoň u 90 % zápisů“; práh je parametr D-POSTUP.
10. **Q3:** když bod o vyrovnání sedí jen díky HbA1c o méně než 5 mmol/mol nad cílem, „Co návrh oslabuje“ to uvede; práh 5 je parametr D-POSTUP.
11. **Q4:** slovo směru (zlepšuje se / zhoršuje se) až od rozdílu 2 procentních bodů, jinak „beze změny“; parametr S-SEMAFOR.
12. **Q5:** nová modelová data snídaní (vyšší glukóza po všech snídaních od listopadu, čas v cíli 68 %) přijata.
Q6 (oznámení se při najetí nepozastaví) a Q7 (B6 opravil agent Z) bez dotazu.
