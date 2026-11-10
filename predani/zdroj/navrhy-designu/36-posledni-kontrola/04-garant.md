# 36 / 04 – Poslední kontrola: garant a ovládání makety

Datum: 10. 11. 2026. Stav: SCHEMA 89 (kopie Disku `maketa-rozhodovaci/`, nic se neměnilo).
Úhel: garant (lékař, odborník) prochází maketu sám, bez autora, tlačítkem Dál a u 28 klinických položek rozhoduje Schválit / Zamítnout.

Kde to běželo: kopie ve scratchpadu `k36-garant/maketa-rozhodovaci` (vedle ní `15-…md` a `navrhy-designu/04` a `32`), server `python3 -m http.server 8903`, Playwright s falešným přihlášením garanta a zablokovaným Supabase (POST na úložiště dostal 201, čtení vracelo jen řádky z paměti skriptu). Skutečné Supabase se nevolalo.

Závažnost: **Vysoká** = garant dostane nepravdivou informaci o tom, co schvaluje, nebo zamítnutí nedělá, co slibuje; **Střední** = garant se může splést, ztratit nebo text neodpovídá obrazovce; **Nízká** = kosmetika, sloh, drobná nekonzistence.

---

## Výsledky v číslech

| Kontrola | Výsledek |
|---|---|
| Celá sada `node nutrifee-rozhodovaci-maketa.test.cjs` (kopie) | **144 prošlo, 0 selhalo**, 31 min 44 s; dílčí sady všechny 0 selhalo (mj. `ukladani` 29/0, `pravdivost` 4/0, `obsah-pacienta` 9/0, `kontrola4-panel` 18/0, `robustnost` OK) |
| `panel-shoda.cjs` 1440×900 | **0 nálezů** (`findings: []`), 368 kroků, 152× Zpět, 32 skoků na scénu, 0 selhaných klepnutí, 0 chyb konzole, 0 požadavků mimo 127.0.0.1; 82 kroků s nabídkou, 566 citací (298 přímo v rámečku); bez štítku jen P-LEKAR (záměr); případ vlastníka (scéna 3 krok 4, R-POKYNY) před i po Zpět stejný |
| `panel-shoda.cjs` 390×844 (telefon) | **0 nálezů**, 368 kroků, 152× Zpět, 32 skoků, 0 selhaných klepnutí, 0 chyb konzole, 0 požadavků ven; statistiky stejné jako 1440 |
| Průchod garanta klepáním (Dál + Schválit v panelu), 1440×900 | 183× Dál, 28 rozhodnutí, 0 selhaných klepnutí, 0 chyb konzole, 0 vodorovného posunu |
| Totéž 390×844 | 183× Dál, 28 rozhodnutí, 0 selhaných klepnutí, 0 chyb konzole, 0 vodorovného posunu |
| Zamítnutí každé z 28 položek klepnutím v kroku nabídky (1440×900) | všech 28 se zapsalo jako zamítnuté; B-HYPO, R-POKYNY a P-NEMOC se ptají na potvrzení; u 25 je na obrazovce oznámení „Tahle část nefunguje“ s tlačítkem Změnit rozhodnutí, z toho u 23 ve výřezu; bez oznámení P-LEKAR a R-REAKCE (záměr) a I-HYPO (chyba, V2); mimo výřez D-CISTA a D-POSTUP (S2) |
| F5 hned po napsání poznámky (do 1 s) | poznámka uložena (`beforeunload` → `commitFocusedDraft`), pozice v příběhu zachována |
| „Druhé zařízení“ (nový kontext se stejnými řádky serveru) | rozhodnutí se načtou; pozice ne (viz S5) |

---

## Nálezy podle závažnosti

### Vysoká

**V1. Vyprávění ve scéně 2 tvrdí, že tablety a GLP-1 navíc nevadí – o krok později garant schvaluje opak.**
- Reprodukce: Začít ukázku → Dál (scéna 2, krok 1 „Karta pacienta“). „Čeho si všímat“: „„Inzulin v pevných dávkách“: na tom celý návrh stojí. Tablety nebo GLP-1 navíc nevadí, premixované inzuliny ne.“ V kroku 2 se nabízí K-KRITERIA s „Co schvalujete: … a žádný jiný lék na diabetes, ani tablety, ani GLP-1“. Obrazovka (karta pacienta i podmínky) říká totéž co K-KRITERIA.
- Soubor: `maketa-rozhodovaci/demo/tour-content.js:96` (pole `vsimni`). Zbytek z doby před SCHEMA 84 (kohorta jen inzulin, vlastník 4. 11. 2026).
- Proč vysoká: garant čte první klinické tvrzení makety a je v přímém rozporu s pravidlem kohorty, které hned potom schvaluje; kontroly T4 (citace) ho nechytí, protože není v uvozovkách.

**V2. Zamítnutí „Pravidlo: nízká glukóza“ (I-HYPO) neukáže na místě oznámení, které slibuje průvodce i vyprávění.**
- Reprodukce: scéna 13 „Pacient – menší porce a pokles pod 4“, krok 4 „Ano, pod 4: pravidlo k nízké glukóze“ (krok nabídky I-HYPO) → Zamítnout. Karta „Pokles pod 4 je zapsaný“ ukáže jen „Pokles jsme zapsali. Lékař ho uvidí na kontrole.“ a Rozumím – bez pravidla a **bez** oznámení „Tahle část nefunguje“ (na obrazovce není žádný prvek `data-off`). Panel přitom píše: „Pravidlo k nízké glukóze jste zamítli, a tak je na jeho místě oznámení „Tahle část nefunguje“.“ a hláška po zamítnutí cituje průvodce „pacient po klepnutí na „pod 4“ … nevidí žádné pravidlo, jen toto oznámení“. Totéž po skoku na scénu 13 se zamítnutou I-HYPO (krok 4) a ve scéně 20, krok 4 (noční pokles, karta s pravidlem krátce).
- Příčina: `maketa-rozhodovaci/app/screens.js:811–812` předává do `ruleCard` tělo `note + ruleEventBody(…)` / `note + ruleShortBody(…)`. Při zamítnutí je `ruleEventBody` prázdné, ale `note` ne, takže `ruleCard` (`app/screens.js:447–451`, `body || (pokynyOff ? off(…) : itemOff ? off(…) : '')`) oznámení nevloží. Při zamítnuté R-POKYNY je karta stejná, bez pravidla i bez oznámení (ověřeno; vyprávění tam oznámení netvrdí, ale `15` odst. 12 ho žádá i pro R-POKYNY).
- Rozpor s `15` odst. 12: „zamítnuté pravidlo I-* ukáže oznámení přímo v kartě pravidla (krok 3, Dnes)“. Kontrola T3 to nechytí, protože v kapitole `hypo` najde oznámení I-HYPO v kroku 3 (otázka na pokles), ne v kroku 4.
- Proč vysoká: jde o bezpečnostní pravidlo, garant zamítá přesně v tomto kroku a maketa mu o obrazovce říká nepravdu.

### Střední

**S1. Odbočka „nemám to doma“, krok „Ostatní návrhy“: vyprávění odporuje postupu i předchozím krokům.**
- Reprodukce: dodatek, scéna 31, krok 6. „Lékař rozhodl i ostatní návrhy podle postupu: dávka k obědu zůstává kvůli dvěma poklesům pod 4 a rada „Pořadí jídla“, která pacientovi nechutná, se vymění.“ Krok 1 téže scény ale říká „Poklesy po menší porci jen varují v každé variantě příběhu“ a postup ukázal „zvýšit“; krok 2 „Lékař přes „Jiné rozhodnutí“ dávku k obědu ponechal“; krok 4, že náhradní rada není (doplněk, pořadí i procházka se už nabízely). Kód (`demo/fixtures.js:356–368`, `D.decideSingles`) oběd ponechá volbou lékaře, ne kvůli poklesům.
- Soubor: `maketa-rozhodovaci/demo/tour-content.js:535` (druhá větev `co`). Starý text z doby, kdy pokles blokoval „zvýšit“ (před SCHEMA 84). Garant tu čte opak toho, co schválil u D-POSTUP („poklesy po menší porci jsou jen varování“).

**S2. Zamítnutí D-CISTA a D-POSTUP: oznámení je mimo výřez, panel ho ale ukazuje „na obrazovce“; u D-CISTA se obrazovka přepne na jiný návrh.**
- Reprodukce A: scéna 23, krok 2 „Vyřazené zápisy: co do návrhu nejde“ → Zamítnout D-CISTA. Návrhy k dávce zmizí, otevřená karta se přepne na bazál („Ověřit s pacientem · Bazál je potvrzený…“), oznámení „Tahle část nefunguje“ je nad horním okrajem okna (top −321 px). Panel: „Na obrazovce to vidíte jako „Tahle část nefunguje“; co zamítnutí znamená, říká oznámení.“ Garant oznámení nevidí a rámeček kroku mluví o seznamu vyřazených zápisů, který už na obrazovce není.
- Reprodukce B: scéna 23, krok 8 → Zamítnout D-POSTUP: oznámení je 872 px nad výřezem, panel říká totéž.
- Soubor: `maketa-rozhodovaci/demo/presenter.js:307` a `:311–315` (`offOnScreen` zjišťuje jen, zda je `data-off` v HTML, ne zda je vidět; po zamítnutí se k oznámení neroluje). Snímek: scratchpad `k36-garant/br/reject-1440/D-CISTA-nabidka.png`.

**S3. Interní odkazy vývoje v textech, které garant čte a schvaluje.**
- „Co schvalujete“ u I-KONTAKT, I-NEVIM, I-MENE, I-NEMOC-BAZAL, I-NEMOC-JIDLO, I-VYSOKA, I-HYPO, B-HYPO a R-SKORE začíná „Nově (SCHEMA 86, verze v2)…“ – garant předchozí verzi nikdy neviděl, „SCHEMA“ nezná. Další: „(kontrola 4, B8)“ u R-PODOBNOST, „(kontrola 4, B6)“ v „Co se stane při zamítnutí“ u I-HYPO (vidí ho i v hlášce po zamítnutí), „kontrola 4 | C15“ u S-SEMAFOR, „rozhodnutí vlastníka …“ u K-KRITERIA, C-CILE, B-HYPO, D-PRAND, D-BAZAL, D-POSTUP, R-POKYNY, I-HYPO, „Na Dnes návyky od SCHEMA 86 nejsou“ u R-NAVYKY.
- Vyprávění: „(rozhodnutí vlastníka 4. 11. 2026)“ ve scéně 2 krok 2, scéně 13 krok 5 a scéně 23 krok 7.
- Soubory: `maketa-rozhodovaci/demo/guide.js` ř. 18, 20, 35, 60, 71, 81, 161, 169, 177, 185, 193, 201, 209 a další (seznam výše); `demo/tour-content.js:98`, `:315`, `:503`.
- Pozor při opravě: text „Co schvalujete“ vstupuje do otisku (`fp`, `fpGuide` v `demo/sync.js`); u položek, o kterých už garant rozhodl, uvidí správce „rozhodnuto k předchozímu znění“.

**S4. Délka: slib „asi 60 minut“ je pro pečlivého garanta příliš optimistický.**
- Úvod: „Celá ukázka trvá asi 60 minut: čtení vyprávění hlavní linie asi 40 minut a rozhodnutí 28 pravidel dalších asi 20“ (`demo/intro.js:21`, pevné číslo); patička panelu na začátku počítá „zbývá asi 65 minut“ (`demo/presenter.js:1316–1340`).
- Změřeno: hlavní linie 162 kroků, **8 961 slov vyprávění** (≈ 45 min při 200 slovech/min), dodatek 22 kroků a 1 004 slov; čekání na animace ≈ 4,5 min (průchod s pohybem 413 s proti 141 s bez pohybu). Úplný průvodce 28 položek má **9 652 slov** (≈ 48 min); karta v panelu ukazuje jen „Co schvalujete“ (do 60 slov, celkem 2 474 slov), ale u I-HYPO, B-HYPO, D-POSTUP, D-PRAND nebo K-KRITERIA se bez otevření průvodce zodpovědně rozhodnout nedá. K tomu čtení obrazovky vlevo („Čtěte vlevo“), které odhad nezahrnuje.
- Realisticky: 70 min pro rychlého čtenáře, 90–120 min pro garanta, který otevírá průvodce. Riziko: garant v polovině usoudí, že je pomalý, a začne schvalovat naslepo. Úvod a patička se navíc rozcházejí (60 × 65).

**S5. Návrat na jiném zařízení nebo po odhlášení: rozhodnutí ano, místo v příběhu ne.**
- Reprodukce: zařízení 1 projde scény 2–7 a rozhodne 7 položek; nový prohlížeč se stejným účtem (stejné řádky serveru) → po načtení je garant na Úvodu, panel řekne jen „Načteno z vašeho přihlášení: rozhodnutí u 7 položek.“ a „zbývá asi 61 minut“; kde skončil, se nedozví. Po odhlášení totéž i na stejném počítači: `D.garantClear` maže „nejdál“ a přehraje scénu 1 (`demo/presenter.js:110`, `:1131`).
- Úvod slibuje „Dá se přerušit a vrátit“. Na stejném prohlížeči bez odhlášení (F5, zavření okna) pozice zůstává – to funguje. Řádky `progress`/`scene` na serveru informaci „nejdál“ mají, při obnově se ale nečtou (`demo/sync.js:374` bere jen `decision` a `note`).

**S6. Průvodce Z-GLUKOZA popisuje ovládání, které maketa už nemá.**
- „Jak funguje“: „V kroku 1 pacient klepne na čip s hodnotou, kterou senzor ukazuje teď (celá čísla 4–15, pod 4, nad 15, nemám)…“ – od SCHEMA 84 je to posuvník (vyprávění scény 7 krok 3 i obrazovka). Text dál pokračuje „bez volby je jezdec posuvníku jen naznačený“, takže si sám odporuje.
- Soubor: `maketa-rozhodovaci/demo/guide.js:50`.

**S7. Scéna 22, krok 3 „Sestra: hmotnost pro kontrolu“: „Proč“ popisuje mřížku, obrazovka i „Co se děje“ posuvník.**
- „Proč: V ordinaci se nepíše: hmotnost se vybírá mřížkou po 5 kg a doladí o 1 kg.“ × „Sestra nastavila posuvníkem hmotnost…“; na obrazovce posuvník s −/+.
- Soubor: `maketa-rozhodovaci/demo/tour-content.js:432`.

### Nízká

**N1. Telefon 390×844: panel zabírá spodní polovinu (422 px), rámce kroků jsou často vyšší než zbylý výřez** (R-POKYNY 3 114 px, D-POSTUP 2 513 px, S-SEMAFOR 1 124 px). Štítek nabízené položky je vidět (panel-shoda), ale obsah, o kterém garant rozhoduje, často ne: u D-POSTUP (scéna 23 krok 8) je nad panelem jen hlavička „Postup říká“ se štítkem, ne větev. Úvod na to upozorňuje („navržená pro počítač“). Snímky `k36-garant/br/walk-390/`.

**N2. Přehled scén po skoku dopředu značí přeskočené scény „✓ hotové“, i když mají nerozhodnuté položky** („hotové · 4 nerozhodnuté“); zásuvka „Vaše rozhodnutí“ u položek aktuální scény píše „uvidíte ve scéně 9“, když garant ve scéně 9 právě je (na úvodu scény). Reprodukce: Přehled scén → scéna 9 → otevřít Přehled scén a Ke schválení.

**N3. Pacientský text při zamítnuté R-REAKCE si odporuje.** Detail jídla: „Bez vyhodnocení · Učíme se: 4 ze 4 zápisů · Zapsáno 4×. Zatím nic neodhadujeme; po 4 zápisech se všemi údaji budeme vědět víc.“ – slibuje vyhodnocení, které nepřijde (položka je zamítnutá), a „4 ze 4“ odporuje „po 4 zápisech“. Garant to vidí hned po zamítnutí ve scéně 9 krok 1; oznámení „Tahle část nefunguje“ tu podle `ucinek` není. `maketa-rozhodovaci/app/screens.js:1400` (větev `else` pro úroveň `none`).

**N4. Počítadlo sestry „1 z 6 zodpovězeno“** nepočítá otázku na zdravotní stav ani hmotnost (vstupů je 8); ve scéně 22 krok 3 jsou zodpovězené tři a hlavička ukazuje 1. `maketa-rozhodovaci/app/screens-clinic.js:268`.

**N5. Scéna 23 krok 3: chybí uvozovky a závorky jsou vnořené.** „Štítek data říkají jinak dostane jen bod…“ (má být „data říkají jinak“); „(nad cílem 6 různých jídel, dvě s nejvíc zápisy nad cílem („Ovesná kaše…“ 25×, „Müsli…“ 9×) tvoří 52 %)“. `demo/tour-content.js:490–491`.

**N6. Dodatek: „Proč“ úvodů variant zkopírované z hlavní linie.** Scéna 28 „Zaučení se nezdařilo“: „Zaučení bez pohledu na telefon by bylo jen odškrtávání.“; scéna 29 „Bez zaučení plán nezačne platit“: „Cíl je jíst ke své dávce pokaždé podobně…“. S variantou nesouvisí. `demo/tour-content.js:133`, `:160` (pole `proc` není funkcí větve).

**N7. Sloh.** Scéna 10 krok 13: „Hodnota je věcně, bez výčitky“ (chybí „uvedená“), `demo/tour-content.js:247`; scéna 5 krok 3: dvakrát za sebou „Pacient také ví…“, `demo/tour-content.js:141–142`.

**N8. K-KRITERIA „Co schvalujete“ opakuje výčet vylučovacích kritérií dvakrát** a obsahuje nejasnou větu „…lékař potvrdí jedním zaškrtnutím, protože v ostré aplikaci protokol studie nebude“. `demo/guide.js:20`.

**N9. Úvod: „Na konci je souhrn … Nic neposíláte.“** Rozhodnutí se přitom průběžně ukládají na server (lišta „Uloženo“). Garant může větu číst tak, že se nic neukládá. `demo/intro.js:31`.

---

## Položky: pochopení, místo nabídky, účinek zamítnutí

Projdeno všech 28 (`NF.garantItems`). Místo nabídky = scéna.krok z mapy (`D.decisionItems`, `D.offerStep`), ověřeno v průchodu i v panel-shoda (štítek v rámečku a ve výřezu nad panelem).

| Položka | Nabídka | Oznámení po zamítnutí v kroku nabídky | Poznámka |
|---|---|---|---|
| K-KRITERIA | 2.2 | ano, viditelné | záznam nesouhlasu; V1 (vyprávění), N8, S3 |
| R-NAVYKY | 3.3 | ano | S3 („od SCHEMA 86“) |
| R-POKYNY | 3.4 | ano (s potvrzením) | karta „Pokles pod 4 je zapsaný“ (13.4) je pak bez oznámení – stejná příčina jako V2 |
| C-CILE | 3.5 | ano | záznam nesouhlasu; S3 |
| I-KONTAKT | 3.6 | ano | S3 |
| P-LEKAR | 4.1 | ne – záměr (jen záznam nesouhlasu), průvodce to říká | |
| Z-GLUKOZA | 7.3 | ano | záznam nesouhlasu; S6 |
| R-REAKCE | 9.1 | ne – podle `ucinek` jen zmizí rozmezí | N3 |
| R-SKORE | 9.2 | ano | S3 |
| I-VYSOKA | 10.9 | ano | S3 |
| R-PORCE | 11.1 | ano | |
| R-DOPLNEK | 11.2 | ano | |
| R-PROCHAZKA | 11.3 | ano | |
| I-MENE | 12.2 | ano | S3 |
| I-NEVIM | 12.3 | ano | S3 |
| I-HYPO | 13.4 | **ne, ač slíbeno** | **V2** |
| B-HYPO | 13.5 | ano (s potvrzením) | S3 |
| R-PODOBNOST | 14.2 | ano | S3 |
| R-PORADI | 14.5 | ano | |
| P-NEMOC | 15.1 | ano (s potvrzením) | |
| I-NEMOC-BAZAL | 15.2 | ano | S3 |
| I-NEMOC-JIDLO | 15.3 | ano | S3 |
| S-SEMAFOR | 22.7 | ano | S3 |
| S-SILNA | 22.12 | ano | |
| D-PRAND | 23.1 | ano | S3 |
| D-CISTA | 23.2 | **mimo výřez**, obrazovka přeskočí na bazál | **S2** |
| D-POSTUP | 23.8 | **mimo výřez** | **S2**, S3 |
| D-BAZAL | 23.10 | ano | S3 |

Pochopení: každá karta má „Co schvalujete“ a pětidílného průvodce (Proč · Jak · Kde · Co schvalujete · Co se stane při zamítnutí). Kromě S3, S6 a N8 jsou texty srozumitelné; nejtěžší jsou D-POSTUP (813 slov), B-HYPO (881) a I-HYPO (564) – bez otevření průvodce je karta příliš stručná, s ním dlouhá (viz S4). Ve scénách, které `dopadSceny` jmenuje, se po zamítnutí oznámení nebo změna chování objevuje (průchod kapitolami po zamítnutí; podrobně skript `k36-garant/br/reject.cjs`, výsledek `reject-1440/res.json`); obsahovou shodu s `ucinek` hlídá T3 a prošla.

---

## Rozhodnutí, poznámky, Zpět, skoky, obnovení – ukládání

Ověřeno v prohlížeči: rozhodnutí a poznámka v panelu; poznámka a F5 do 1 s (uloží se, `beforeunload`); Zpět a Dál po rozhodnutí (panel-shoda: panel po Zpět i po skoku totožný s první návštěvou); skok přes Přehled scén; souhrn a potvrzení; odhlášení s nevyřízenou frontou (nepustí, nabídne „zahodit neuložené“).

Kód `demo/sync.js` a `demo/presenter.js` (deník garanta) a `ukladani.test.cjs` (29/0): prošel jsem situace, kdy by rozhodnutí mohlo zmizet nebo se zdvojit:
- **opakované odeslání** (keepalive při `pagehide`, pak znovu z fronty po F5): id řádku je pevné (`klient:D-čas-náhoda`), server odpoví 409 a klient ho bere jako uložený (`sync.js:273–277`) – bez duplicity;
- **poznámka těsně před změnou rozhodnutí se stejným textem**: sloučí se do rozhodnutí (`sync.js:324–337`, M8), deník mapuje `sid`;
- **dvě karty / dvě zařízení**: deník se slučuje podle `sid`, pořadí podle `seq` v rámci prohlížeče a opraveného času mezi prohlížeči; reset jiné karty se respektuje značkou (`presenter.js:37–45`);
- **vypršení přihlášení**: fronta, deník i koncepty zůstávají, po přihlášení se nejdřív odešle fronta, pak obnoví deník;
- **odhlášení**: s neodeslanou frontou nepustí; po odhlášení deník v prohlížeči zmizí a vrátí se ze serveru (pozice ne – S5);
- **rozepsaná poznámka**: koncept je v `localStorage` po každém znaku, uloží se po 1 s, při opuštění pole, `pagehide` i `beforeunload`.

Nová cesta ke ztrátě ani zdvojení se nenašla. Jediná ztráta je pozice v příběhu (S5). Okrajově: koncepty a deník jsou v prohlížeči pod jedním klíčem pro všechny účty; přihlášení jiného účtu po vypršení smaže neuložené koncepty prvního (`auth.js:75`) – záměr, zapsaný v komentáři.

---

## Délka a srozumitelnost

- Hlavní linie: 27 scén, 162 kroků, 28 rozhodnutí; dodatek 5 scén, 22 kroků. Odhad času viz S4.
- **Kdy je hotovo**: jasné. Lišta „Vše rozhodnuto“, souhrn „rozhodnuto 28 z 28“, po potvrzení „Děkujeme, máme vaše rozhodnutí“, volba Skončit nebo dodatek, na konci dodatku „Zpět na souhrn / Skončit“.
- **Kde se garant může ztratit**: (1) po návratu z jiného zařízení nebo po odhlášení začíná od Úvodu (S5); (2) po zamítnutí D-CISTA se obrazovka přepne na jiný návrh, než o kterém je krok (S2); (3) v krocích s nabídkou je „Co se děje“ sbalené pod „Více k tomuto kroku“, takže garant rozhoduje bez kontextu kroku, pokud ho sám nerozbalí; (4) na telefonu vidí z obrazovky jen horní polovinu (N1); (5) Přehled scén po skoku dopředu ukazuje přeskočené scény jako „hotové“ (N2).
- **Vyprávění, které neodpovídá obrazovce**: V1, V2, S1, S2, S7; průvodce: S6. Strojová kontrola panelu (citace v uvozovkách) je čistá, chyby jsou v textu mimo uvozovky a ve větvích se zamítnutím.
- **Překlepy a sloh**: N5, N7, N8; mechanická kontrola (zdvojená slova, mezery, párové uvozovky a závorky) celého vyprávění 1440 bez nálezu.

---

## Skripty a podklady (scratchpad, dočasné)

`/private/tmp/claude-501/-Users-ngmacminim4pro-Library-CloudStorage-GoogleDrive-rehor-rudolf-gmail-com-M-j-disk-NutriFee-NutriFee-new-look/91a20ff2-da8d-4e57-8d3a-d33240768b1a/scratchpad/k36-garant/`
- `tests.log` – výstup celé sady;
- `br/walk.cjs`, `br/walk-1440/`, `br/walk-390/`, `br/walk-1440-mot/` – průchod garanta (snímek každého kroku, `log.json`), `br/narrace1440.txt` – celý text panelu po krocích;
- `br/reject.cjs`, `br/reject-1440/` – zamítnutí každé položky;
- `br/panel-shoda-out/` – výsledky panel-shoda;
- `br/probe2.cjs` (F5), `br/probe3.cjs` (druhé zařízení), `br/probe7.cjs` (V2).
