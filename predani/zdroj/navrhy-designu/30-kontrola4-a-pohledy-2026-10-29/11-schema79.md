# SCHEMA 79 (1. 11. 2026) – jeden lékař, jiná dávka bez jiného lékaře, doplněk „pokud vám nevadí“, kohorta bez potíží s pohybem

Podle doplňujících rozhodnutí vlastníka 1. 11. 2026 v `00-rozhodnuti.md` (body 1, 2, 3, 5, 6; bod 4 – dokument 14 – dělá jiný agent). Nic nepublikováno, nic necommitováno, `~/Documents/Nutrifee/`, `CLAUDE.md` ani `navrhy-designu/14-…` nedotčeny. Úpravy proběhly na místní kopii (`scratchpad/k79`) a byly přeneseny na Disk; `diff -rq` kopie s Diskem: shoda. Testy běžely ve stromu `scratchpad/t79` (maketa + aktuální `15` + generátor `scene-items.cjs`, tj. stejné relativní cesty jako na Disku).

## 1. Co změněno

### Bod 1 – lékař je vždy jen jeden (a bod 5 – ochrana proti jiné dávce zůstává)
- **Zrušeno:** věty „Když vám lékař dávku mezitím změnil, řiďte se jím a klepněte na „Píchnuto jinak“.“ / „… na „Jinak“.“ (S-DAVKA `jinde`, `jindeBazal`); bod zaučení `doseElsewhere` („Pacient ví, že když mu dávku změní jiný lékař (třeba při hospitalizaci)…“) v `NF.FIXED_TRAINING` (`app/core.js`), ve fixtures dodatku (`demo/fixtures.js`) a v kroku příběhu zaučení (`demo/tour-content.js`); `NF.doseElsewhere`; karta „Máte jinou dávku než v plánu?“ se zněním „Inzulin {meal} jste dvakrát po sobě zapsali jako {other} j. místo {units} j. … Ukažte prosím na kontrole sestře, že máte jinou dávku.“; styl `.card.dose-else`; zmínky „ví, že při změně dávky jinde to řekne v ordinaci“ v R-NAVYKY (registr, souhrn bodů zaučení) a v průvodci.
- **Ponecháno / přepsáno (bod 5):** provozní položka **S-DAVKA** „Dávka podle plánu a jiná dávka než v plánu“ (`po_sobe` 2, meze 2–5), texty:
  - `puvod`: „Podle plánu z {date}: {units} j.“ (u dávky v kroku 1 a u bazálu; jen plán a datum, o lékaři nic – `NF.doseOrigin`, `V.doseOrigin`, styl `.dose-origin`);
  - `nadpis`: „Jiná dávka než v plánu“;
  - `karta`: „Dvakrát jste zapsali jinou dávku než v plánu. Řekněte to prosím na kontrole sestře.“
- `NF.doseOffPlan(S)` (dřív `NF.doseElsewhere`): u téhož jídla dne posledních `po_sobe` potvrzených zápisů je „jinak“ a dávka se liší od plánu (nemusí být pokaždé stejná, vlastník to nepožaduje). Na Dnes **jedna** karta `V.doseOffPlanCard` (styl `.card.dose-off`, barva role „nad cílem/upozornění“), i když se to týká víc jídel – text je bez jídla. Aplikace dávku nemění, nenavrhuje, neptá se proč.
- V příběhu se karta neukáže v žádné scéně (ověřeno průchodem všech scén v jádře), krok příběhu proto nebyl potřeba.
- **Volba v živém kroku 1:** „Píchnuto jinak“ → zpět **„Ano, jinak“** (podnadpis „jiné množství nebo čas“) – stejně jako ve zpětném zápisu (`Ano, jinak` / „jiné množství“). Tlačítko „Píchnuto jinak“ v kroku 3 (uložení) a v katalogu designu existovalo už před SCHEMA 78 a zůstává.
- **Krok příběhu zaučení:** „Upozornění v senzoru a připomínky“ – „Sestra s pacientem ústně prošla dva body: upozornění na nízkou glukózu má zapnuté v aplikaci senzoru a ví, že připomínka nemusí přijít a inzulin si píchá i bez ní.“
- **Bod 6:** „hospitalizace“ zůstává jako příklad u volby sestry „Změnil se zdravotní stav (těhotenství, ledviny, hospitalizace)“ (`NF.NURSE_MEDS`, věta v `screens-clinic.js`, průvodce K-KRITERIA). Jinde se slovo nevyskytuje.
- Grep `app/`, `demo/`, `design-system/` na „jiný lékař“, „jiného lékaře“, „mezitím změnil“, „doseElsewhere“, „dose-else“: bez nálezu; „hospitaliz“ jen u volby sestry (bod 6); „S-DAVKA“ a „doseOrigin“ jen v nové podobě bez jiného lékaře.

### Bod 2 – R-DOPLNEK
Šablona (placeholder v kódu `{addon}`): „Přidejte k jídlu {addon}, pokud vám nevadí. Z jídla nic neubírejte.“ Citace v průvodci a vyprávění: „Přidejte k jídlu bílý jogurt nebo hrst ořechů, pokud vám nevadí. Z jídla nic neubírejte.“

### Bod 3 – kohorta bez potíží s pohybem
`NF.EXCLUSION`: „Pacient nemá žádné vylučovací kritérium: těhotenství nebo jeho plánování, opakované těžké poklesy glukózy nebo jejich nepoznávání, těžké onemocnění ledvin nebo jater, léčbu akarbózou, potíže s chůzí nebo pohybem, kvůli kterým nezvládne procházku po jídle, potíže se zrakem nebo pamětí, které znemožní ovládat telefon“. Totéž v K-KRITERIA (registr), v průvodci (dvě místa) a ve vyprávění kroku „Vylučovací kritéria“ („…léčbu akarbózou, potíže s chůzí nebo pohybem, kvůli kterým by nezvládl procházku po jídle, ani potíže se zrakem nebo pamětí…“). R-PROCHAZKA beze změny.

### Verze
`NF.SCHEMA = 79`, `?v=79` v HTML (22×), `data-version="79"` v `design-system/index.html`. `demo/scene-items.js` přegenerována generátorem (52 min); jediný rozdíl proti 78: věta R-NAVYKY ve scéně zaučení („…prošla dva body…“). Generátor běžel před vrácením karty jiné dávky; mapa na S-DAVKA nezávisí (provozní položka, karta v příběhu nikde; mapa 78 se S-DAVKA a mapa bez ní se lišily jen větou R-NAVYKY) a test pravdivosti T1–T4 v celé sadě prošel.

### Dokument 15
- odst. 1 (kohorta): pacient bez potíží s pohybem jako vylučovací kritérium; „Lékař je vždy jen jeden“.
- odst. 4 krok 2: páté zaškrtnutí s úplným zněním vylučovacích kritérií.
- odst. 5: bod zaučení o jiném lékaři odstraněn.
- odst. 7 krok 1: „Ano, jinak“; odstavec „Jiná dávka než v plánu“ místo věty o změně dávky jinde; R-DOPLNEK nové znění.
- odst. 16: stavový odstavec SCHEMA 79; u SCHEMA 78 poznámka k bodu 6.
- odst. 18: rozhodnutí „Lékař je vždy jen jeden“ (s tím, že ochrana proti jiné dávce zůstává bez jiného lékaře) a „Procházka bez podmínky, omezení pohybu patří ke kohortě“; u rozhodnutí 30. 10. poznámka k bodu 6; v Zavrženo „Jiný lékař v aplikaci“ a „Podmínka „pokud vám to zdravotní stav dovolí“ v radě k procházce“.

## 2. Změněné testy (jen záměrné změny)
- `kontrola3-obsah.test.cjs` ř. 70: znění R-DOPLNEK s „, pokud vám nevadí“ (bod 2).
- `kontrola4-obsah.test.cjs`: test „Bod 6: dávka s původem a datem…“ nahrazen testem „Jeden lékař a jiná dávka než v plánu (vlastník 1. 11. 2026, body 1 a 5)…“ – `NF.doseElsewhere` neexistuje, bod zaučení `doseElsewhere` neexistuje, „Podle plánu z 5. 10.: 8 j.“ zůstává, žádné „mezitím změnil / jiný lékař / hospitaliz“ na obrazovce pacienta, v kroku 1 „Ano, jinak“, po dvou různých jiných dávkách (8 a 7 j. místo 10) `NF.doseOffPlan` hlásí oběd a Dnes ukáže „Jiná dávka než v plánu“ + „Dvakrát jste zapsali jinou dávku než v plánu. Řekněte to prosím na kontrole sestře.“, plán se nemění.
- Hlavní test: počty registru (42 / 14 provozních, „Pravidla aplikace bez schvalování (14)“) zůstávají jako v SCHEMA 78 – S-DAVKA se nakonec neruší, jen přepisuje; upraveny jen komentáře.

## 3. Ověření
- **Celá sada** (`node nutrifee-rozhodovaci-maketa.test.cjs` ve stromu `t79`, celý výstup přečten): **129 prošlo, 0 selhalo** (podsady: faze2-jadro 32/0, faze2-pribeh 15/0, pravdivost T1–T4 4/0, kontrola74-obsah 19/0, kontrola2-obsah 18/0, kontrola74-panel 7/0, kontrola3-obsah 14/0, kontrola3-panel 9/0, kontrola4-obsah 16/0, kontrola4-panel 9/0, ukladani 18/0). Konečný stav včetně karty jiné dávky (bod 5). Po spuštění sady se změnily jen dva komentáře v kódu (registry.js, core.js – bez „jiného lékaře“), chování ne. Pozor: sada čte `../15-ZDROJ-PRAVDY-MAKETA.md` a `../navrhy-designu/04-…/scene-items.cjs` relativně; v holé kopii ve scratchpadu (bez nich) dvě podsady selžou na ENOENT / starém 15 – proto strom `t79`..
- **Prohlížeč** (Chrome for Testing 1243, Playwright, port 8775, Supabase vždy falešný přes `route`), celý příběh tlačítkem Dál včetně rozhodnutí v panelu: 
  - 1440×900 bez animací, vše schváleno: 164 kroků, scéna 31/31, 0 chyb konzole, 0 problémů (vodorovný posun, zástupky, chybějící citace, zaseknutí);
  - 360×740 dotyk, zamítnuto R-DOPLNEK a R-NAVYKY: 160 kroků, scéna 31/31, 0 chyb konzole, 0 problémů;
  - v obou průchodech text obrazovky ani vyprávění neobsahuje „jiný lékař / jiného lékaře / mezitím změnil“; „hospitalizace“ jen ve scéně 21 u volby sestry „Změnil se zdravotní stav (těhotenství, ledviny, hospitalizace)“ (bod 6); „Podle plánu z …“ v 7 krocích, „Ano, jinak“ ve 13; karta „Jiná dávka než v plánu“ se v příběhu neukáže (jako v jádře).
- Žádný prázdný soubor v `app/`, `demo/`, `design-system/` ani HTML (HTML 2,4 kB, `core.js` 214 kB+). Grep na skutečná jména výrobců a produktů (senzory, inzuliny, glukometry, „hermelín“) v `app/`, `demo/`, `design-system/`, HTML: bez nálezu.

## 4. Pro koordinátora / vlastníka
- Karta jiné dávky je jedna i pro víc jídel (text jídlo neuvádí). Kdyby vlastník chtěl jídlo v textu, stačí doplnit `{meal}` do `karta`.
- Původní podmínka „se stejnou jinou dávkou“ zrušena – karta přijde po dvou jiných dávkách po sobě, i když se liší (vlastník: „jinou dávku než v plánu“).
