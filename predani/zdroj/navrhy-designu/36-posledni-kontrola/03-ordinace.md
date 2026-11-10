# 36 · Poslední kontrola · 03 Ordinace (lékař a sestra)

*10. 11. 2026 · SCHEMA 89 · kopie makety ve scratchpadu `k36-ordinace/maketa-rozhodovaci`, podávaná přes `http://127.0.0.1:8902` · nic v maketě se neměnilo, Supabase je zablokované (lib.js).*

Úhel pohledu: diabetoložka má na pacienta 10–15 minut a sestra před ní 5 minut. Prošla jsem zařazení (scény 1–3), zaučení (4), kontrolu ve čtyřech krocích (21–24) a stopu (26 + „Verze a stopa“) na 1440×900 i 1280×800. Výpočty souhrnu jsem nezávisle přepočítala skriptem nad jádrem (vzor `boot()` z `pravdivost.test.cjs`). Okrajové případy jsem sestavila v jádře a vykreslila v prohlížeči přes `NutriFeeApp.setState`.

Skripty (scratchpad, mimo projekt): `k36-ordinace/skripty/v2.cjs` (přepočet), `v3.cjs`, `v4.cjs`, `v5.cjs` (okrajové případy), `atlas87/br/k36-walk.cjs`, `k36-edge.cjs` a `k36-late.cjs` (prohlížeč). Snímky jsou ve složce `snimky-ordinace/`.

## Shrnutí

Kontrola je ve všech krocích výběrová. Psát se nikde nemusí (kromě výběru souboru) a lékař může u každé dávky rozhodnout jinak. Hlavní čísla souhlasí s ručním přepočtem: jídla, porce, inzulin, bazál 88 z 92, shoda 36 z 37, tabulka „Jídla dne“, mediány a dostupnost. Žádná obrazovka na 1440 ani 1280 nepřetéká vodorovně a v konzoli nejsou chyby.

Slabá místa jsou ve **spolehlivosti dat ze senzoru**: semafor, zaokrouhlení, export za jiné období nebo z jednoho řádku a export nahraný po zahájení. Další slabé místo je **druhá kontrola po sobě**: v novém období zůstávají údaje z minulého. Největší praktický problém je **délka kontroly**: reálně 25–35 minut lékaře, ne 10–15.

## Nálezy seřazené podle závažnosti

### V1 · Vysoká · Semafor času v cíli je zelený i při času pod 3,0 mmol/l ≥ 1 %
- **Reprodukce:** `v4.cjs` S1. Export s časem v cíli 75 %, pod 3,9 3 % a pod 3,0 2 % → `tirState = 'ok'`, tedy zelená.
- **Rozpor:** `15` odst. 10 (tabulka, řádek Semafor TIR) říká, že červená platí i tehdy, když je „pod 3,0 ≥ 1 %“. Stav „ok“ podmínku na čas pod 3,0 vůbec nečte, čte ji jen větev „warn“.
- **Kód:** `app/core.js:2108` (`NF.summary`, `tirState`).
- **Návrh:** zelená jen při `ss.veryLow < tbr3`. Čas pod 3,0 ≥ mez musí dát vždy červenou, bez ohledu na čas v cíli. Přidat test.

### V2 · Vysoká · Export za jiné období nebo s jediným měřením se přijme a vydává se za souhrn období
- **Reprodukce 1** (`v3.cjs` E3, snímek `edge-1440-e3_jineobdobi.png`): export posunutý o rok zpět se přijme. Zobrazí se „Export nahrán a převeden · doplněno 0 jídel a 14 nocí“. Dlaždice pak ukáže „Čas v cíli 68 % · zlepšuje se · za 22. 12. 2025 – 4. 1. 2026“ bez jakéhokoli varování. Stejné číslo vstupuje do bodu „Vyrovnání celkově nedosahuje cíle“ v návrhu k dávce.
- **Reprodukce 2** (`v4.cjs` S3, snímek `edge-1440-e3_jedenradek.png`): soubor s jedním řádkem dá „Čas v cíli 100 % ✓ v cíli · zlepšuje se“ při dostupnosti 0 %. Text „jen 1 den dat, pro spolehlivý čas v cíli aspoň 14“ se sice ukáže, ale semafor zůstává zelený. Podle `15` odst. 9 má semafor platit až „od 14 dní dat (`min_dni`)“.
- **Kód:** `app/core.js:1799–1830` (`NF.importReadings`, souhrn se nahradí bez kontroly období), `app/core.js:1698` (`sensorSummaryFrom`), `app/core.js:2108` (stav bez `min_dni`), `app/screens-clinic.js:346`.
- **Návrh:** export, který nezasahuje do období aktivního plánu, odmítnout obecnou hláškou, nebo přijmout jen jeho část v období plánu. Pod `min_dni` dní (nebo při dostupnosti pod rozumnou mez) dát semaforu stav „bez hodnocení“. Taková data nesmí vstupovat do bodu o vyrovnání. Hláška sestře má uvést období exportu, když neodpovídá posledním 14 dnům.

### V3 · Vysoká · Kontrola reálně nevejde do 10–15 minut
- **Měření:** souhrn v kroku 1 má viditelně přes 600 slov. Každá karta k dávce má 500–750 slov a 10 ověřovacích bodů (snídaně, oběd), bazál 3 body. V příběhu jsou 3 karty k dávce, 1 karta k radě a 3 položky beze změny, tedy kolem 25 klepnutí a 23 bodů k probrání s pacientem. Modelové hodiny příběhu samy počítají s 9:00 → 9:35 (`demo/fixtures.js:610–622`), tedy 35 minut lékaře po práci sestry.
- **Sestra:** 6 odpovědí, hmotnost posuvníkem, HbA1c s datem (výběr ze 92 dnů), 4 body D-POSTUP a nahrání exportu. Reálně 5–8 minut, pokud HbA1c a export leží připravené.
- **Odhad lékaře:** 2–3 minuty souhrn, 5–7 minut na každou kartu k dávce, 2 minuty krok 3 a 4. Celkem **25–35 min**.
- **Návrh (k rozhodnutí vlastníka):** u bodů, které data plně podloží (shoda s exportem, poklesy, „nad cílem opakovaně“), ukázat výsledek jako „sedí podle dat“ bez ručního přepínání. U lékaře nechat jen body, které musí probrat s pacientem. Kartu „Co návrh oslabuje“ shrnout do jedné věty nahoře. V `15` odst. 9 je cíl „≈ 10 kliknutí“; odhad minut na kontrolu tam chybí a stojí za doplnění.

### S1 · Střední · Export nahraný až po zahájení kontroly se do souhrnu ani návrhů nepromítne
- **Reprodukce:** `k36-late.cjs`, snímek `edge-1440-e2_pozdni_export.png`. Kontrolu zahájím bez exportu a pak klepnu na „Použít ukázkový export“. Část sestry ukáže „nahráno“ a Bezpečnost „čas pod cílem 2 %“, ale dlaždice dál hlásí „souhrn ze senzoru chybí“ a podklad „Senzor“ ukazuje „chybí“. Návrh k bazálu stojí dál jen na nocích hlášených pacientem a bod o shodě s exportem se nepřepočítá. Na jedné obrazovce jsou tak dvě různé pravdy.
- **Kód:** `app/ui.js:466` (`importText` nevolá přepočet), `app/core.js:2627` (souhrn se zmrazí při `startReview`). Výběr souboru zůstává dostupný i po zahájení (`app/screens-clinic.js:297`).
- **Návrh:** po zahájení buď nahrání zamknout s větou „Export patří před zahájení kontroly“, nebo po nahrání přepočítat souhrn i návrhy (`NF.refreshReview` + `NF.summary`) a zapsat to do stopy. Tlačítko „Zahájit kontrolu →“ by mělo bez exportu a bez odpovědí sestry říct, co chybí (nezamykat, jen upozornit). Dnes stojí nad částmi sestry a nic neřekne.

### S2 · Střední · Druhá kontrola po sobě: v novém období zůstávají údaje z minulého
- **Reprodukce:** `v5.cjs` E8 a snímky `edge-1440-e8_p2_pred.png` a `edge-1440-e8_p2_po.png`. Po vydání P2 a posunu na 7. 4. 2027:
  1. Část „Sestra · Data ze senzoru“ ukazuje „nahráno 5. 1. 2027 · Export nahrán a převeden · doplněno 37 jídel a 14 nocí (22. 12. 2026 – 4. 1. 2027)“ a výběr souboru je schovaný pod „Nahrát jiný soubor“. Sestra snadno usoudí, že export už je nahraný. Kód: `app/screens-clinic.js:290–300`; `S.sensorImport` se při vydání plánu nemaže (`app/core.js:728`).
  2. Dlaždice „Mimo učení“ ukazuje „3 dny nemoci“ z období P1. `NF.illnessDays` nefiltruje období plánu (`app/core.js:2030`).
  3. Bezpečnost hlásí „aplikace se 3× zeptala na pokles, pod 4: 2×“ z P1, a hned vedle stojí „Žádný pokles pod dolní cíl“. `S.hypoWatch` se nefiltruje podle období (`app/screens-clinic.js:303–318`). Stejně `lowNights` (`:308`) bere všechny noci z exportu.
  4. Popisek „Hmotnost pro kontrolu (při zařazení 90 kg, 5. 1. 2027)“: 90 kg je z minulé kontroly, ne ze zařazení (`app/screens-clinic.js:286`).
- **Návrh:** všechny podklady Bezpečnosti, dnů nemoci a nahraného exportu filtrovat oknem kontrolovaného plánu, stejně jako to už dělá `NF.nurseCheckFor`. Popisek změnit na „minule …“, když existuje předchozí plán.

### S3 · Střední · Zaokrouhlení času v cíli převrací semafor i bod o vyrovnání
- **Reprodukce:** `v2.cjs` na modelovém exportu: skutečný čas v cíli je 68,60 % a aplikace ukazuje 68 % (správně zaokrouhleno 69 %). `v4.cjs` S2: skutečných 69,1 % se ukáže jako **70 %**, se stavem „v cíli“ (zelená) a bodem „čas v cíli dosahuje cíle“.
- **Příčina:** `tir = 100 − round(pod) − round(nad)` (`app/core.js:1707`). Stav se pak počítá ze zaokrouhlených čísel (`:2108`); totéž platí pro „pod 3,9 < 4 %“.
- **Návrh:** čas v cíli počítat přímo jako `round(v cíli / n)` a všechny stavy (semafor, bod D-POSTUP) z nezaokrouhlených podílů. Zaokrouhlovat jen pro zobrazení.

### S4 · Střední · Stopa: kdo jednal, není pravda; odchylku od postupu nelze přečíst
- **Reprodukce:** snímek `edge-1440-stopa.png`. Řádky „Sestra ověřila bod s pacientem“, „HbA1c zapsán … zapsala sestra“, „Export ze senzoru nahrán“ mají ve sloupci **Kdo** „lékař“, protože `who` bere `S.role` (`app/core.js:353`). Filtr „sestra“ je tak nenajde.
- Rozhodnutí „Posoudit prandiální dávku k obědu – ponechat“ neříká, že postup ukázal „zvýšit“. Model příběhu navíc zapisuje `branch: null` (`demo/fixtures.js:363`), takže informace se ztratí úplně. Auditor nepozná, kde lékař rozhodl proti postupu, pokud nešlo o „jinou dávku“.
- **Kód:** `app/screens-clinic.js:859` (`CHOICE_LABEL`), `:519`.
- **Návrh:** v maketě zapisovat `by: 'sestra'` u funkcí sestry a sloupec Kdo číst z něj (`15` odst. 3 to pro ostrou aplikaci vyžaduje). V řádku rozhodnutí vždy uvést větev v okamžiku rozhodnutí: „ponechat (postup: zvýšit)“. Příběh má zapisovat skutečnou větev.

### S5 · Střední · „Rozhodnuto jinak než postup“ se zapíše i u změny ve směru postupu
- **Reprodukce:** `v4.cjs` E7. Lékař souhlasí se zvýšením 8 → 9 j. a v kroku 3 posune dávku na 10 j. Rozhodnutí se změní na `choice: 'other', againstBranch: true`. Totéž platí pro „Jiné rozhodnutí → jiná dávka“ 11 j. u větve „zvýšit“.
- **Kód:** `app/core.js:2680` a `:2688`.
- **Návrh:** `againstBranch` nastavit jen tehdy, když nová dávka jde proti směru větve (stejné pravidlo jako v `propDecide`, `app/ui.js:556`). Stopa jinak tvrdí odchylku, která nenastala.

### S6 · Střední · Jiný lék na diabetes a změna zdravotního stavu nejsou u karet k dávce
- **Reprodukce:** snímek `edge-1440-e4_jinylek.png`. Sestra zadá „Ano“ u obou otázek. V kroku 2 není u žádné karty k dávce zmínka, věta je jen v kroku 1. Lékař tak může schválit zvýšení dávky u pacienta, který právě začal brát lék zvyšující riziko poklesu.
- **Spec:** `15` odst. 9 výslovně říká „nic neblokuje“, takže jde o mezeru v kontextu, ne o porušení.
- **Návrh:** při „Ano“ dát do „Co návrh oslabuje“ každé karty k dávce první položku „Sestra zapsala: pacient začal jiný lék na diabetes / změnil se zdravotní stav – posuďte, zda NutriFee dál platí.“

### S7 · Střední · Nemocný celé období: návrh k bazálu z nocí v nemoci bez varování; 93 dní nemoci v 92denním období
- **Reprodukce:** `v3.cjs` E5, snímky `edge-1440-e5_nemoc*.png`. Karty k jídlu zmizí, což je správně. Karta „Posoudit bazál – noční hodnoty pod cílem“ ale zůstává a „Co návrh oslabuje“ nemoc nezmiňuje. Dlaždice ukazuje „93 dní nemoci“, přestože období má 92 dní, protože počítá i den kontroly. Sestra navíc mohla odpovědět „nebyl nemocný“ a rozpor s 93 dny nemoci se nikde neukáže.
- **Kód:** `app/core.js:2030` (`illnessDays` do `S.clock`), výpočet návrhu k bazálu (`NF.basalNights`, `app/core.js:2205`).
- **Návrh:** dny nemoci počítat ve stejném okně jako období (do dne před kontrolou). Noci v období nemoci uvádět u bazálu v „Co návrh oslabuje“. Když se odpověď sestry „stres · sedí“ neshoduje s dny nemoci v aplikaci, dát u bodu štítek „data říkají jinak“.

### S8 · Střední · Pacient bez zápisů: kontrola nemá žádný signál k nepoužívání
- **Reprodukce:** `v3.cjs` E1, snímky `edge-1440-e1_nic*.png`. Krok 2 nabídne jen „Bezpečnostní pravidla beze změny?“ a 4 řádky bez návrhu. Věta „Co se dělo“ zní „Pacient **zatím** nezapsal žádné jídlo.“ (na konci 92denního období). Část „Sestra · Data ze senzoru“ má štítek **„kompletní“**, přestože export nahraný není, protože `importDue` počítá jen chybějící zápisy (`app/screens-clinic.js:292`).
- **Návrh:** při zapsání pod nějakou mez hlavních jídel (např. pod 30 %) přidat návrh „Pacient aplikaci skoro nepoužíval – probrat důvod a zda pokračovat“ (karta, ne zámek). Štítek části senzoru má říkat „export nenahrán“, kdykoli `S.sensorImport` k tomuto období chybí. Z věty vypustit „zatím“.

### S9 · Střední · Pacient v novém plánu čte „lékař náš návrh zamítl“
- **Reprodukce:** `v4.cjs` E6. Lékař zamítne všechny návrhy a pacient pak čte sedm řádků typu „Inzulin ke snídani – lékař náš návrh zamítl, nic se nemění“, i u „Pravidla a cíle“.
- **Rozpor:** zásada 1 v `15` odst. 2 říká, že o dávce se mluví jen v reportu lékaře. Pacient se tak dozví, že aplikace navrhovala změnit jeho inzulin a lékař ji „přehlasoval“.
- **Kód:** `app/core.js:2733`.
- **Návrh:** u zamítnutí psát pacientovi totéž jako u ponechání („beze změny“), případně řádek vůbec nevypisovat. Zamítnutí patří jen do stopy.

### N1 · Nízká · Před jídlem se ve výpočtu bere hodnota 5 min před ním
- Import přiřadí měření od −5 min a první bod přepíše na `min: 0`. U zápisu E237 jsou tak dva body s `min 0` (6,7 a 6,9) a „před jídlem“ i vzestup se počítají z hodnoty 6,7 v 7:05. Kód: `app/core.js:1813–1815`. Návrh: vzít měření nejblíž času jídla.

### N2 · Nízká · Obvyklá porce a inzulin zaokrouhlují dolů, čas v cíli matematicky
- 238 z 241 je 98,76 %, aplikace ukazuje 98 %; čas v cíli se zaokrouhluje jinak. Jde o záměr (N11, `app/core.js` `pctDown`), ale v jedné dlaždicové řadě se míchají dvě pravidla. Návrh: jedno pravidlo a jedna věta v nápovědě.

### N3 · Nízká · Důvod u řádku „Bazál bez návrhu“ je výčet tří možností
- Text „bez návrhu (noci bez poklesu, ranní hodnoty v cíli nebo málo nocí z exportu)“ neříká, který důvod platí (`edge-1440-e1_nic_krok2.png`). Návrh: uvést jen důvod, který skutečně platí.

### N4 · Nízká · Krok 3, cíle glukózy: hodnota zasahuje do tlačítek −/+
- Na 1440 s panelem je „−3,9 mmol/“, „10 mmol/l“ a „−53 mmol/m“ oříznuté nebo překryté (`edge-1440-krok3.png`). Návrh: u úzkých posuvníků cílů schovat jednotku pod hodnotu.

### N5 · Nízká · Ukázka: náhled telefonu u sestry je pod seznamem
- S otevřeným panelem prezentujícího je pracovní sloupec pod 900 px, takže se telefon na 1440 i 1280 vykreslí pod body zaučení (`1280-s04-k00.png`). V produkci bez panelu se vejde vedle. `app/design.css:659`. Jen poznámka k ukázce.

### N6 · Nízká · Neshoda popisu s daty
- `15` odst. 6a říká, že pacient „jednou opsal o 2 víc“. Přepočet ukazuje E244 (oběd 24. 12.): opsáno 15, export 12,5, tedy o 2,5 víc. Text stačí upravit.

## Odpovědi na otázky

- **Chybějící kontext lékaře:** většina kontextu je k dispozici (okolnosti nocí, vyřazené zápisy, vývoj v čase, odpovědi sestry). Chybí kontext u karet k dávce při jiném léku nebo změně stavu (S6), v nemoci (S7) a při nepoužívání aplikace (S8). Kontext je naopak příliš dlouhý (V3).
- **Odkud jsou čísla:** dlaždice senzoru nesou období exportu a karty uvádějí „z exportu / zapsal pacient“; to je dobré. Spolehlivost ale není hlídaná: export za jiné období nebo z jednoho řádku dá zelený semafor (V2) a pozdní nahrání vytvoří dvě pravdy (S1).
- **Podloženost a ověřitelnost návrhů:** ano. Ruční přepočet „65 z 72“, „54 z 79“, „37 z 75“, medián 12,0 / 11,0 / 10,0 a „2 ze 14 nocí“ souhlasí s aplikací.
- **Může lékař vždy rozhodnout jinak:** ano. Volič je u každé karty, u řádků bez návrhu i v kroku 3. Rozsah 1–60 jádro hlídá: 0, 61, −3 i 8,5 odmítne, 1 a 60 přijme, „9“ jako text přijme. Plán jde vydat i po zamítnutí všech návrhů. Stopa ale u změny ve směru větve chybně zapíše „jinak než postup“ (S5).
- **Nic se nepíše:** potvrzeno. Jediné vstupy jsou výběr souboru a v registru nepovinná poznámka.
- **Minuty:** sestra 5–8 minut, lékař 25–35 minut (V3).
- **Stopa pro audit:** úplná a čitelná, ale sloupec Kdo uvádí lékaře i u činností sestry a rozhodnutí neukazuje větev postupu (S4).

## Ověřeno bez nálezu

- Ruční přepočet (`v2.cjs`): jídla 241, svačiny 15, obvyklá porce 238, inzulin podle plánu 232, včas 232, bazál 88 z 92 (92 záznamů: 88 podle plánu, 4 jinak), pod 3,9 2 %, pod 3,0 0 %, nad 30 %, dostupnost 91 % (3669 měření ze 14 × 288), shoda 36 z 37, s nejvyšší hodnotou 239 z 241, HbA1c 62 (23. 9.) → 55 (3. 1.), hmotnost 92 → 90.
- Dělení nulou: při 0 jídlech dlaždice ukážou „–“ a „bez dat“, nikde se neobjeví NaN ani `undefined`.
- Nečitelné soubory (prázdný soubor, bez hlavičky, s nečíselnými hodnotami) se odmítnou obecnou hláškou. Hodnoty v mg/dl se převedou. Tentýž export podruhé ohlásí „nic nového“.
- První kontrola ukazuje „první období · bez srovnání“. „Dříve“ u času v cíli je výchozí hodnota z karty (58 / 3).
- Bez exportu Bezpečnost výslovně uvede „Noční hodnoty nejsou k dispozici…“ a návrh k bazálu stojí jen na nocích hlášených pacientem; to odpovídá `15` odst. 10.
- Žádná obrazovka ordinace nepřetéká vodorovně na 1440 ani 1280 a v konzoli nejsou chyby.
