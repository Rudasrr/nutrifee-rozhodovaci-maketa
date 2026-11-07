# 02 · SCHEMA 87 – opravy zásad z předávky (6. 11. 2026)

*Podle rozhodnutí vlastníka 1 v `01-rozhodnuti.md`. Rozpory: `predani/00-postup.md` odd. 5, `predani/10-atlas-pacient.md` R1–R10, `predani/20-atlas-ordinace.md` odd. 7 R1–R9 (u každého je teď poznámka „→ SCHEMA 87: …“). Necommitováno, nepublikováno, `~/Documents/Nutrifee` netknuto. Práce na Disku, testy a panel na kopii ve scratchpadu.*

## 1 Co je změněno (body 1–9)

### Bod 1 · Stopa (zásady 4 a 6)

- **Položky u událostí výpočtu.** `NF.log` přidá k události pole `polozky = [{ id, version, fp, stav }]`. Seznam položek je pevný podle druhu události (`NF.TRACE_ITEMS`: rada, zápis jídla, zahájení kontroly, rozhodnutí a ověření návrhu, nahrání exportu, vydání plánu, poklesy, zařazení…). K tomu se přidají položky, které událost sama jmenuje (`item`, `items[].item`, `proposals[].item`). Otisk je `NF.itemFingerprint` s textem „Co schvalujete“. Ten jádru dodá prezentační vrstva novým slotem `NF.slots.itemGuide` (v `demo/guide.js`), takže otisk ve stopě je stejný jako u rozhodnutí garanta. Bez prezentační vrstvy se otisk počítá bez průvodce. Data události jsou kopie a stav aplikace se jimi nemění.
- **Bezpečnostní pravidla** se zapisují stejně jako `pravidlo.vysoka` (`NF.noteRule`):
  - `pravidlo.nizka` (I-HYPO): glukóza teď „pod 4“ v kroku 1, krok 3 při glukóze pod 4 (živě i zpětně), nejvyšší hodnota po jídle „pod 4“ a odpověď „ano, pod 4“ na Dnes i v kroku 1;
  - `pravidlo.mene` (I-MENE): krok 3 s menší porcí po píchnutí nebo při „nevím“, odmítnutá rada k porci před píchnutím, vynechané jídlo s inzulinem;
  - `pravidlo.nevim` (I-NEVIM): „Nevím“ v kroku 1.

  Pole `shown` říká, zda pravidlo bylo v plánu (jinak bylo na místě oznámení).
- **Odpovědi, které byly jen ve stavu:** `plan.davky.overeni` (zpětné přečtení dávky i s dávkami plánu), `plan.kontrolni.otazka`, `nemoc.dotaz` („Ještě ne“ i „Už je mi lépe“), `otazka.lekari` (vybraná, odebraná i vlastní), `podpora.odeslano` (jen druh potíže).
- **Ordinace:** `zarazeni.podminka`, `zarazeni.vylouceni`, `zarazeni.vychozi` (výchozí hodnoty ze senzoru), `zarazeni.davky.overeny` (ověření dávek s pacientem, `NF.setMedicationChecked`), `navrh.overeni` (bod, text bodu, sedí/nesedí; `NF.setVerify`) a `navrh.overeni.vse`. Obrazovka „Verze a stopa“ má pro všechny události české názvy.
- **Délka stopy:** limit 4000 událostí, data jen u posledních 1000 (`NF.TRACE_MAX`, `NF.TRACE_FULL`). V kódu i v `15` odst. 14 je označený jako **omezení makety**. U zkrácené události zůstávají položky registru. Ostrá aplikace má stopu úplnou: zapsáno v `15` odst. 14, v `predani/00-postup.md` (zásada stopy a etapa 1) i v README.

### Bod 2 · Krok 3 při glukóze pod 4 s „Ještě ne“

Hlavní tlačítko je teď **„Uložit, inzulin zatím ne“**. Uloží jídlo podle skutečnosti a inzulin nechá čekat na potvrzení jako u „píchnu za chvíli“. Pod ním je řádek „Co dál: na Dnes se zeptáme, jestli byl inzulin.“ Obrysové vedlejší volby „Už píchnuto 8 j.“ a „Píchnuto jinak“ zůstávají pro toho, kdo už píchnuto má. Nad tlačítky zůstává pravidlo I-HYPO beze změny. Žádná nová klinická rada nepřibyla. Zapsáno v `15` odst. 7.3.

### Bod 3 · Posuvník místo −/+ a jeden rozsah dávky

- Pacient má posuvník (`V.unitsSlider`, komponenta `V.slider` ze SCHEMA 84) se značkou „předepsáno N j.“ na čtyřech místech: „Ano, jinak“ v kroku 1, „Píchnuto jinak“ v kroku 3, bazál „Jinak“ a oprava inzulinu. Nové akce jsou `mealUnitsSet`, `basalUnitsSet` a `fixInsulinUnitsSet`. Akce po krocích zůstaly kvůli kompatibilitě. `class="stepper"` v `app/screens.js` už není.
- **Rozsah 1–60 j. z jednoho místa:** konstanta jádra `NF.DOSE_RANGE` s mezí, pomocníky `NF.validDose` a `NF.clampDose`. `NF.DOSE_GRID` je jen alias. Rozsah platí při zařazení (dřív 1–40), na kontrole, v kroku 3 kontroly, u „jiné dávky“, u pacienta i v kontrolách jádra.

### Bod 4 · Meze pěti parametrů (`NF.PARAM_BOUNDS`)

| Parametr | Mez |
|---|---|
| `R-REAKCE.minQuantile` | 4–20 |
| `D-CISTA.svacina_min` | 60–240 |
| `D-CISTA.oprava_min` | 15–120 |
| `D-PRAND.hypoMin` | 3–30 |
| `S-VYSLEDEK.min_n` | 2–20 |

Výchozí hodnoty leží uvnitř mezí, žádná hodnota se neposune.

### Bod 5 · Denní doby slotů v registru

Parametry `snidane_do` 10, `obed_do` 15,5 a `vecere_do` 21 jsou v **provozní položce S-PRIPOMINKY**. Meze jsou 8–12, 13–17 a 19–23,5. Čte je `NF.daypartEnd`, který hlídá pořadí. `NF.DAYPART_END` zůstal jen jako výchozí hodnota. Souhrn položky, „Kde“ i „Jak“ v průvodci popisují nové parametry. Registr má dál 42 položek a 14 provozních.

### Bod 6 · Zamítnutá položka bez prezentační vrstvy

Výchozí oznámení jádra zní „Tato část teď není k dispozici.“ (`NF.OFF_TEXT`, `hint neutral off-default`, `data-off`). Hlásí se jednou za vykreslení. Nemluví o garantovi a nevyzývá k volání. Položky, jejichž zamítnutí je jen záznam nesouhlasu (C-CILE, K-KRITERIA, Z-GLUKOZA), a P-LEKAR oznámení nemají. Prezentační vrstva oznámení dál přepisuje slotem `offNotice`.

### Bod 7 · Čas inzulinu „jiný“

`15` odst. 7.1 ho výslovně uvádí, proto je v maketě doplněný. Pátá volba „jiný čas“ otevře posuvník „před kolika minutami“ 0–120 min po 5 min (`mealTimeAgo`, `NF.INS_AGO_MAX`). Souhrnný řádek ukazuje „před 50 min“. Uložení počítá čas inzulinu z posunu (dřív bylo oříznuté na −30). Text v `15` je doplněný o „před 30 min“, které kód měl.

### Bod 8 · Dokumenty dopsané za maketou

- **Karta k dávce:** „Souhlasím“ a „Jiné rozhodnutí“ (ponechat · jiná dávka voličem · zamítnout s důvodem) v `CLAUDE.md` zásadě 1 a v `15` odst. 9 a 18.
- **Počty:** 14 provozních položek (`15` odst. 12) a 171 jídel (`15` odst. 6, souhrn J-DATABAZE, `foods.js`, `fixtures.js`, průvodce, vyprávění, README).
- **Sestra:** `15` odst. 3 popisuje její části na obrazovce Kontrola. Ostrá aplikace oddělí oprávnění rolí.
- **Podnět z provozu:** oznámení v `ui.js` teď říká „Návrh vypnutí je zapsaný a výrobce položku vypnul…“ a „Výrobce založil podle návrhu novou verzi…“. `15` odst. 13 má skutečné popisky tlačítek a větu, že tlačítko v ukázce znázorňuje krok výrobce.
- **Hmotnost a HbA1c:** posuvník v `15` odst. 4.1, 4.3, 9 a 10. Zmínky o „mřížce“ a „stepperu 1–40“ jsou nahrazené.
- **README:** jinak popsané rozhodnutí lékaře, štítek DEMO jednou, jen Schválit/Zamítnout, stopa a její omezení v maketě, scénáře 1, 4 a 5.
- **Přejmenované testy** (u každého komentář „SCHEMA 87“):
  - „známé od 4 započítaných“;
  - „rozmezí se s daty upřesňuje“;
  - „pohyb jen do 60 min“;
  - „Bezpečí „Tato pravidla připravil NutriFee a posoudil je lékař.““.
- **Nové testy** v hlavní sadě (pět testů „SCHEMA 87 …“):
  - zápisy pravidel do stopy, verze a otisk, krácení;
  - odpovědi pacienta a zápisy z ordinace;
  - S-DAVKA a S-PODPORA;
  - posuvníky, rozsah 1–60 a „jiný čas“;
  - meze, denní doby a výchozí oznámení.

### Bod 9 · Svačina

Odpověď dává smysl a chování se nemění. Svačina nemá hodnotu před jídlem, takže do učení jde až z exportu (`NF.complete`). Opsaná nejvyšší hodnota ale slouží dvakrát:

- ukáže kartu „Jak to dopadlo“ ke svačině (`NF.lastResult` / `NF.readyAt`);
- vstupuje do shody opsaných hodnot s exportem (Z-IMPORT). Ta je dokladem pro studii.

Zapsáno v `15` odst. 7a a v atlasu pacienta u R4.

**Prezentační vrstva:** cíle kroků se nezměnily (příběh neklepe na stepper ani na krok 3 s glukózou pod 4). Mapa scén je přegenerovaná a shodná s dosavadní. Průvodce (S-PRIPOMINKY, J-DATABAZE) a vyprávění (171 jídel) jsou upravené. Slot `itemGuide` je v `demo/guide.js`. Verze je 87 na všech místech: `NF.SCHEMA`, 22× `?v=` v HTML, 5× v katalogu, `data-version`, `D.build = 'schema-87'`. Stavový odstavec SCHEMA 87 je v `15` odst. 16.

## 2 Zvoleno bez dotazu

1. **Krok 3 při glukóze pod 4 s „Ještě ne“:** hlavní „Uložit, inzulin zatím ne“, píchnutí jen vedlejší volbou. Je to nejopatrnější varianta: nenavádí k potvrzení píchnutí a nepřidává radu.
2. **Denní doby slotů jako provozní položka:** parametry jsou v existující S-PRIPOMINKY, žádná nová položka nevznikla. Nic nepočítají ani neradí a pacient se vždy opraví sám.
3. **Rozsah dávky 1–60 j.** jako konstanta jádra s mezí (ne parametr registru). Je to mez vstupu, ne klinická hodnota.
4. **Meze pěti parametrů** podle sousedních parametrů téže povahy, s výchozí hodnotou uvnitř.
5. **„Jiný čas“ 0–120 min po 5 min.** Mez vstupu. Co jde do učení a do návrhu, dál určuje D-CISTA.
6. **Text výchozího oznámení** „Tato část teď není k dispozici.“ a jeho vynechání u záznamů nesouhlasu (C-CILE, K-KRITERIA, Z-GLUKOZA) a u P-LEKAR.
7. **Otisk ve stopě s textem průvodce** přes slot, aby se dal porovnat s otiskem u rozhodnutí garanta.

## 3 Otevřené otázky

1. **Denní doby slotů jako klinická položka?** `15` je dřív nazýval „otázkou pro garanta“. Kdyby je vlastník chtěl schvalovat, patří do klinické položky (změní se počet 28 klinických a scéna nabídky).
2. **Otisk katalogu:** `fpCat` v `demo/sync.js` obsahuje meze. Správce proto může u dřívějších rozhodnutí garanta k R-REAKCE, D-CISTA a D-PRAND vidět „rozhodnuto k předchozímu znění“, i když se jejich znění nezměnilo. Otisk jádra se nezměnil.
3. **R10 (pacient) a R9 (ordinace) zůstávají otevřené**, nebyly v zadání: přepínač nemoci na dvou místech a kontextový sloupec pod 1600 px.
4. **Název testu v `kontrola4-obsah`** „volič dávky mřížkou“ mluví o mřížce, tělo testuje posuvník. Nebyl v seznamu k přejmenování, nechal jsem ho.
5. **Zápis rozhodnutí sestry o přístupu:** maketa role dál nekontroluje (atlas ordinace R1). V ostré aplikaci je to úkol pro etapu oprávnění.

## 4 Testy

Spuštěno na kopii `$S/t87` (maketa, `15`, `CLAUDE.md`, `navrhy-designu/04-pohledy-2026-10-05`), celý výstup přečten.

- Výchozí stav (SCHEMA 86): **137 prošlo, 0 selhalo**.
- Konečný stav: **142 prošlo, 0 selhalo**. Přibylo pět testů „SCHEMA 87 …“ v hlavní sadě.
- Dílčí sady: tokeny 7/0, obsah-pacienta 9/0 (140 stavů), schema84-jadro 15/0, zaverecne80 22/0, faze2-jadro 32/0, faze2-pribeh 15/0, pravdivost T1–T4 4/0, kontrola74-obsah 19/0, kontrola2-obsah 18/0, kontrola74-panel 7/0, kontrola3-obsah 14/0, kontrola3-panel 9/0, kontrola4-obsah 16/0, kontrola4-panel 18/0, ukladani 29/0.
- Záměrné změny testů (komentář „SCHEMA 87“):
  - `schema84-jadro`: verze 87;
  - `kontrola4-obsah`: volič dávky při zařazení do 60 j. a 41 j. už projde;
  - přejmenování čtyř testů.
- Mezivýsledek před opravami byl 134/3: test „každý parametr registru se čte“ (parametry S-PRIPOMINKY se čtou doslovným `NF.param`), verze v `schema84-jadro` a rozsah 1–40 v `kontrola4-obsah`. Testy nikde nejsou oslabené.
- Mapa scén je přegenerovaná skriptem `scene-items.cjs` na kopii. Výsledek je totožný se stávajícím `demo/scene-items.js`.
- Žádný soubor v `app/`, `demo/`, HTML ani v katalogu není prázdný. Disk a testovaná kopie jsou shodné.

## 5 Panel

`panel-shoda.cjs` ze `32/` spouštěný z `$S/t84/br/`. Server `python3 -m http.server 8830` podával kopii stejného obsahu jako `$S/t87/maketa-rozhodovaci`. Přihlášení bylo falešné a Supabase blokované.

- **1440 × 900:** 368 kroků, 152 Zpět, 32 skoků, **0 nálezů**, bez chyb konzole a bez selhaných klepnutí.
- **390 × 844 (telefon s dotykem):** 368 kroků, 152 Zpět, 32 skoků, **0 nálezů**, bez chyb a bez selhaných klepnutí.
- První běh na 1440 souběžně s celou sadou testů skončil 3 nálezy (Zpět a Dál ve scénách 24 a 31). U všech byl klepací timeout 2,5 s, šlo o přetížení stroje. Samostatné opakování dalo 0 nálezů.
- `playwright-core` ve scratchpadu byl poškozený (smazané soubory). Znovu nainstalovaný z místní mezipaměti npm (1.64.1, bez sítě) do `$S/pw87`. Prohlížeč chromium-1243 je ten, který skript používá.

## 6 Obrazovky atlasu, jejichž snímek nebo popis se změnil

- **Snímek:**
  - P10 (oprava inzulinu „Jinak“: posuvník);
  - P22 (bazál „Jinak“: posuvník);
  - P27 (Ano, jinak: posuvník jednotek a volba „jiný čas“);
  - P46 (krok 3, glukóza pod 4 a „Ještě ne“: hlavní „Uložit, inzulin zatím ne“);
  - O03 (dávky při zařazení do 60 j.; obraz posuvníku jinak stejný);
  - O30 (Verze a stopa: nové události).
- **Popis (stopa nebo text):**
  - P02 (zpětné přečtení dávky do stopy), P06 (kontrolní otázka do stopy), P12 (vynechané jídlo s inzulinem: `pravidlo.mene`), P16 a P17 (odpověď „ano, pod 4“: `pravidlo.nizka`), P20 („Ještě ne“ do stopy);
  - P24 (inzulin čeká i po „Uložit, inzulin zatím ne“), P28 (`pravidlo.nevim`), P30 (`pravidlo.nizka`), P32 (nejvyšší „pod 4“: `pravidlo.nizka`), P41 (svačina: k čemu slouží opsaná hodnota), P45 (`pravidlo.mene`), P52 (otázky na lékaře do stopy), P57 (odeslání podpoře do stopy);
  - O02 (podmínky, vylučovací kritérium a výchozí hodnoty do stopy), O03 (ověření dávek do stopy), O14 až O16 a O21 (posuvník dávky 1–60, ověřovací body do stopy), O29 (oznámení podnětu z provozu), P11 a P09 (denní doby slotů z registru, chování beze změny).
