# SCHEMA 84 – akce z předávky J, posuvník hodnoty (rozhodnutí 9) a pacient z 32/01 (agent P+D, 5. 11. 2026)

Verze zůstává SCHEMA 84. Zapsáno v `15` (odst. 6a, 7b, 8, 15a, 16, 18, 19). Předávka pro prezentační vrstvu: `10-predavka-PD.md` (G skončil; cíle kroků v `demo/`, které moje změna rozbila, jsem podle pokynu koordinátora opravil sám a `demo/scene-items.js` přegeneroval).

## 1. Úkol 1 – akce a CSS z předávky J

| Co | Kde |
|---|---|
| `propUnits` (i větev „ponechat“ a řádky `pr.row`), `propDoseSet`, větev `propDecide …:other` hned za `if (waiting)` – kód přesně podle 06 | `app/ui.js` |
| `revDose`, `revDoseSet`, `revHabit`, `revValidity`, `nurseHealth`, `reviewHealth`, `nurseWeightSet`, `nurseWeightStep` | `app/ui.js` |
| `enrollPad` zrušen; hlášky `nurseMeds` / `reviewMeds` „Vyberte, zda pacient začal brát jiný lék na diabetes.“; štítek zásuvky `acute` „Pravidla a kontakty“ | `app/ui.js` |
| CSS: `.keep-list.dose-rows` (dva sloupce, akce flex s posuvníkem; na úzkém okně jeden), `.decide.other-dose` bez horního okraje, `.weight-field` / `.hba-field select`, `.card.meals-overview th[scope=row]` tučně, `.targets-row`, `.decide .vslider` | `app/design.css` |
| `--nf-demo-sheet-h-decide: 50vh` (G, 08 odd. 1) | `app/tokens.css` |

Ověřeno v Node: `nurseHealth yes` → `S.nurseCheck.health = "yes"`; `nurseWeightSet 88`, `nurseWeightStep 1` → 88 a 89 kg; test J „volič u větve ponechat“ teď prochází se zápisem jinak než postup.

## 2. Úkol 2 – posuvník hodnoty (rozhodnutí 9)

**Prvek.** `V.slider(cfg)` a `V.gluSlider(S, o)` v `app/screens.js`, stav `V.vsState` (sdílí vykreslení i živý náhled), styl `.vslider` v `app/design.css`, tokeny `--nf-vs-rail` 8 px, `--nf-vs-thumb` 32 px, `--nf-vs-mark` 24 px, `--nf-vs-min` 14rem v `app/tokens.css`. Rozložení: −/+ po stranách velké hodnoty (44 px, u glukózy 48 px), pod nimi dráha na celou šířku, pod ní popisky. Ovládání: neviditelný nativní `input type=range` přes dráhu – tažení myší i prstem, klepnutí na dráhu, šipky, čtečka (`aria-label`, `aria-valuetext` se slovem stavu, např. „12 mmol/l, nad cílem“); fokus je rámeček kolem jezdce (`:has(.vs-input:focus-visible)`); při tažení se jen posouvá náhled (`input`), uloží se při puštění (`change`). Pohyb jezdce 0,15 s, při `prefers-reduced-motion` žádný.

**Glukóza.** Hodnoty 4–15 + konce „pod 4“ (poloha 3) a „nad 15“ (poloha 16); pásma podle rolí (červená do půli mezi „pod 4“ a 4, zelená do horního cíle pacienta z C-CILE, oranžová nad ním, mezi pásmy bílá mezera `--nf-tir-gap`), hodnota se zbarví podle pásma a vedle je štítek se slovem a ikonou: „v cíli“ ✓, „nad cílem“ ↑, „nízká glukóza“ (!). Konce „pod 4“ a „nad 15“ jsou zároveň tlačítka pod dráhou, „nemám hodnotu“ vedle. **Akce a hodnoty zůstaly stejné jako u čipů** (`mealBefore 7|low|high|none`, `mealPeak …`, `peakChip E1:12|low|high|none`), takže I-HYPO (pod 4), I-VYSOKA a zápis `pravidlo.vysoka` (nad 15), otázka na pokles, „počítáme to jako pokles“ i stopa se chovají jako dřív (ověřeno v prohlížeči: „nad 15“ hned ukáže pravidlo).

**Nic se nepředvyplňuje.** Bez volby je jezdec čárkovaný, hodnota „–“ a věta „Posuňte na hodnotu ze senzoru“; „Další“ zůstává zamčené (`mealStep` dál chce `beforeAsked`). Naznačená poloha je u glukózy poslední opsaná hodnota (`V.lastManual`, u nejvyšší nejdřív u téhož jídla; jinak 7, resp. 10), v ordinaci začátek dráhy (u dávek nic nenavrhujeme, zásada 1). Klepnutí přímo na naznačenou polohu nebo Enter ji vybere. **Nejvyšší hodnota po minulém jídle** se volbou jen podrží (`vsPick`, `S.vsPick`) a uloží ji tlačítko „Uložit · 12 mmol/l“ – zvoleno bez dotazu: uložení hned mění blok na otázku o poklesu, posuvník by se jinak uložil při první šipce nebo nepřesném puštění (stojí o jedno klepnutí víc než čip). Nad blokem nová věta B7.

**Nahrazené mřížky a steppery (všechny):**

| Místo | Dřív | Nyní (id) |
|---|---|---|
| Zařazení – čas v cíli, čas pod 3,9 | mřížka 20–95 / 0–20 + ±1 | `bl-tir` 0–100 %, `bl-below` 0–40 %, značka cíle (`cíl alespoň 70 %`, `cíl pod 4 %`), slovo „splňuje cíl / pod cílem / v cíli / nad cílem“ |
| HbA1c při zařazení a sestra pro kontrolu | mřížka 40–95 + ±1 | `hba-karta`, `hba-sestra` 30–120 mmol/mol, značka „cíl do 53“, vypnuto po vydání |
| Sestra – hmotnost | mřížka 50–150 po 5 + ±1 | `weight` 40–160 kg po 1, značka „při zařazení 92“ |
| Zařazení – čtyři dávky | stepper + mřížka 1–40 | `dose-*` 1–40 j. (`doseSet`) |
| Kontrola – blok Rozhodnout | stepper ±1 | `prop-<PR>` 1–60 j., značka „dnes 8 j.“ (`propDoseSet`) |
| Kontrola – Jiná dávka | stepper + mřížka 1–40 | `other-<PR>` 1–60 j. se značkou „dnes“ |
| Kontrola – Dávky bez návrhu | stepper | `row-<PR>` (malý) |
| Kontrola krok 3 – dávky nového plánu | stepper + mřížka | `rev-*` (malý, značka „dnes“) |
| Cíle glukózy (zařazení i krok 3) | 6 stepperů | `tgt-*` / `rtgt-*` s krokem a mezemi z `NF.TARGET_STEPS` (0,1 / 0,5 mmol/l, 5 %, 1 %, 1 mmol/mol); nové akce `targetSet`, `revTargetSet`, `NF.setTargetValue` |
| Hodnoty pravidel (minuty, hodiny, mmol/l) | stepper | `instr-*` / `rinstr-*` s krokem a mezemi z katalogu; akce `instrSet`, `revInstrSet` |
| Pacient – glukóza teď / při jídle | mřížka čipů + sbalený řádek „Vybráno teď“ | `before` |
| Pacient – nejvyšší po minulém jídle | mřížka čipů | `peak-<epId>` s „Uložit“ |
| Pacient – zpětný zápis, nejvyšší do 2 h | mřížka čipů | `peak` |

Ponecháno (zvoleno bez dotazu): platnost plánu (2 volby), čas bazálu (3), připomínky – segmentované volby; čip nočního poklesu u snídaně (je to přepínač, ne číslo); stepper pacienta „Kolik jednotek?“ (není mřížka, řídký úkon); karta „Jak to dopadlo“ volbu čísla nemá. Zrušené CSS: `.chips.glu`, `.chips.num-grid`, `details.chips-done`; `NF.HBA_GRID`, `NF.WEIGHT_GRID`, `NF.DOSE_GRID` v jádře zůstávají (meze, test jádra).

**Katalog** `design-system/index.html`: nová komponenta „Posuvník hodnoty“ (`#c-posuvnik`, odkaz v obsahu): glukóza v cíli / nad cílem / pod 4, bez hodnoty, režim potvrzení, fokus (třída `.ds-focus` v `catalog.css`), procenta se značkou cíle (pod cílem, splňuje cíl), HbA1c bez hodnoty, dávka se značkou „dnes“, malý, vypnuto. Mřížka čipů z „Volby a čipy“ odebrána, „Ordinace: dávky voličem“ ukazuje posuvníky.

**Ověření v prohlížeči** (Playwright, 1440×900 a 390×844 s dotykem, obrazovka odemčená mimo příběh): klepnutí na dráhu na 12 → 12; tažení na 8 → 8; šipka → 9; + → 10; „pod 4“ → `4/under`; „nad 15“ → `15/over` a pravidlo k vysoké glukóze; Enter bez volby → 7 (naznačená); nejvyšší: klepnutí → podrženo 11, „Uložit · 11 mmol/l“ → uloženo a objeví se otázka na pokles. Žádná chyba v konzoli.

## 3. Úkol 3 – pacient (z 32/01, bez dotazu)

| Bod | Co | Kde |
|---|---|---|
| B1 | R-PORCE `texts.smaller` + věta „Když vám chuť k jídlu chybí často, řekněte to na kontrole – dávka se nastavuje na porci, kterou opravdu jíte.“ (nové znění ke schválení; summary doplněno). Lékař v „Co se dělo“: „Menší porci ohlásil pacient předem, ještě před píchnutím, N×; zeptejte se na chuť k jídlu …“ (`NF.summary.smallerPlanned` = menší porce s `bolusAtAdvice === 'before'`, bez svačin). V modelovém příběhu je N = 0, věta se tam neukáže. | `app/data/registry.js`, `app/core.js`, `app/screens-clinic.js` |
| B2 | Při nemoci `NF.yesterdayGaps` vrací nic – karta „Včera chybí … – doplnit?“ se nenabízí. | `app/core.js` |
| B3 | Hystereze „známé“: po každém zápisu se vyhodnotí okno posledních `maxUceni` zápisů; jednou známé jídlo zůstane známé, dokud shoda neselže ve dvou po sobě jdoucích oknech (`foodStatsRaw`, nový příznak `held`). Modelový příběh beze změny (20 z 20 známých). | `app/core.js` |
| B6 | Cesta ke kontrole: „Známe už N vašich jídel.“ / „Vaše jídla se zatím učíme.“ – bez jmenovatele. | `app/screens.js` |
| B7 | Věta „V grafu senzoru najděte úsek 7:05–9:05 a vyberte nejvyšší hodnotu, které tam křivka dosáhla.“ (`V.peakHow`) nad blokem nejvyšší hodnoty, obdobná věta ve zpětném zápisu; bod zaučení `t-zapis` doplněn o „v grafu senzoru ukázal, kde najde nejvyšší hodnotu za dvě hodiny po jídle“ (zvoleno bez dotazu: doplněn stávající bod, ne nový – nový bod by zablokoval dokončení zaučení v příběhu). | `app/screens.js`, `app/data/catalogs.js` |
| B9 | Týdenní shrnutí: „Do učení šlo N z M zápisů; ostatní lékař uvidí i tak.“ a „Nejblíž k „známému“ je X: chybí ještě N zápisů.“ (`weekSummary.learned`, `.near`; texty S-TYDEN). V příběhu: 16 z 16, „Svíčková … chybí ještě 2 zápisy“. | `app/core.js`, `app/screens.js`, `app/data/registry.js` |
| C1 | Den převzetí plánu se nedoptává celý. | `app/core.js` |
| C2 | U neznámého jídla věta o „Je to jako…“ při zakládání (krok 3 i karta jídla). | `app/screens.js` |
| C4 | Karta po opakovaných poklesech: když pacient pravidlo už viděl (`S.hypoRuleSeen`, nastaví „Rozumím“ u poklesu nebo předchozí karty), je I-HYPO řádek „Pravidlo k nízké glukóze“ k rozbalení. | `app/screens.js`, `app/core.js`, `app/ui.js` |
| C5 | Po ≥ 7 dnech bez zápisu na Dnes věta „Vítejte zpět, pokračujeme tam, kde jste skončili.“ (`NF.returnAfterGap`), zmizí s prvním zápisem. | `app/core.js`, `app/screens.js` |
| Registr | Texty Z-GLUKOZA, B-HYPO, D-PRAND, I-HYPO, I-VYSOKA: „čip“ → „posuvník / volba „pod 4“, „nad 15““. | `app/data/registry.js` |

**B4 (nestavěno, doporučení):** zavést pro učení tolerantnější mez času inzulinu (45 min před / 30 min po jídle) jako nový parametr D-CISTA, návrh k dávce dál se stávající mezí. Důvod: „inzulin mimo čas“ je jedna z nejčastějších příčin „do učení nejde“ a pro reakci na jídlo je rozdíl 15 min malý; D-CISTA učení a dávku už rozlišuje. Je to klinická změna definice čistého zápisu – rozhodnutí vlastníka a schválení garantem, nejlépe s odhadem z `br/sim12.cjs`, kolik zápisů přibude.

## 4. Snímky a designová kritika

`navrhy-designu/32-overeni-cile-2026-11-04/snimky-posuvnik/` (34 PNG, `desk-*` 1440×900, `phone-*` 390×844): pacient před jídlem (nevybráno, 7, 12, pod 4, nemám), celý krok 1 na telefonu, nejvyšší po snídani (nevybráno, 12 + Uložit, fokus), ordinace (výchozí hodnoty nevybráno a 58 % / 6 %, HbA1c, dávky při zařazení, sestra s hmotností, blok Rozhodnout, dávky bez návrhu, nový plán), `katalog-posuvnik.png`.

Kritika a co jsem podle ní opravil:
- První verze měla −/+ vedle dráhy: na telefonu dráha 150 px na 14 poloh. → −/+ přesunuty k velké hodnotě, dráha na celou šířku (~300 px, ~21 px na mmol/l).
- Rychlé volby „pod 4“ a „nad 15“ jako obrysové krabice působily jako zbytek mřížky. → konce dráhy jsou podtržené barevné textové volby přímo pod koncem dráhy, krabice zůstala jen „nemám hodnotu“.
- Popisek cíle nad dráhou zakrýval jezdec. → značka je jen čárka na dráze, popisek pod dráhou se přimyká k okraji (nikdy nepřeteče).
- Na širokém poli v ordinaci byly −/+ 700 px od sebe. → posuvník nejvýš `--nf-measure` (440 px).
- U „pod 4“ se opakovalo „pod 4“ ve štítku. → slovo „nízká glukóza“.
- Prázdná hodnota „–“ byla skoro neviditelná. → tlumená barva textu.
- Zbývá: krok 3 kontroly na telefonu je dlouhý (4 dávky + 6 cílů pod sebou) – ordinace je ale desktop; čísla na koncích dráhy v ordinaci (0, 100) jsou jen tam, kde není značka cíle. Kontrast: hodnoty v barvách `--nf-*-text` (≥ 5,2 : 1), dráha a jezdec 3 : 1 jako grafický prvek. Dosah palcem: −/+ a „Uložit“ 48 px, dráha 48 px vysoká.

Výsledek: jedno velké číslo se slovem místo 12–40 čísel; čisté, bez záplavy čísel.

## 5. Změněná očekávání testů (záměrně)

- Hlavní sada: krok 1 glukózy hledá posuvník (`id="vs-before" min="3" max="16"`, `class="vslider glu unset"`, `vs-end low`), „Vybráno teď …“ → velké číslo se zónou (3×); nejvyšší po snídani: posuvník `peak-E1` a po `vsPick` tlačítko `peakChip E1:12`; „V ordinaci se nepíše“ povoluje `input type=range`; seznam lokálních proměnných CSS doplněn o `--vs-*`; Cesta ke kontrole „Známe už N …“ bez jmenovatele; volič u větve „ponechat“ dávku mění (rozhodnutí 1, kód J).
- `schema84-jadro`: `propDoseSet`/`revDoseSet`/`revTargetSet` a id posuvníků místo `propUnits`/`revDose`/`revTarget` ±1 a `nurseWeightSet 90`.
- `kontrola4-obsah`: dávka a výchozí hodnoty jako posuvník (`vs-dose-breakfast` 1–40, `vs-bl-tir` 0–100).
- `zaverecne80`: C3 – den převzetí se nedoptává celý (C1); 82 C5 – `watch` kroku „Hodnota ze senzoru: 7“ je `.vslider.glu[data-vs="before"]`.
- `faze2-jadro`: věta „Hodnoty převezměte posuvníkem …“.
- `faze2-pribeh` C04: krok cílů míří na `.targets-row`.

## 6. Výsledek testů

Celá sada na kopii (`$S/tPD`, stav Disku po všech změnách, celý log přečten): **132 prošlo, 2 selhala** (výchozí běh téhož dne před mou prací: 117 / 17). Podsady: tokeny 7/0, schema84-jadro 14/0, zaverecne80 22/0, faze2-jadro 32/0, pravdivost 4/0, kontrola74-obsah 19/0, kontrola2-obsah 18/0, kontrola74-panel 7/0, kontrola3-obsah 14/0, kontrola3-panel 9/0, kontrola4-obsah 16/0, kontrola4-panel 18/0, ukladani 29/0; faze2-pribeh 14/1.

Obě selhání byla červená už ve výchozím běhu a s posuvníkem nesouvisejí (prezentační vrstva):
1. „Průchod pro garanta (8. 10. 2026)“ – panel scény 3 bez věty „Z této scény ještě ke schválení“ / „Ke schválení teď“ (`demo/presenter.js`).
2. `faze2-pribeh` C01 – odbočka „nemám to doma“ (scéna 31): kroky ponechají oběd, `apply` (`D.reviewStory`) ho zvýší na 12 j.

Žádný soubor v `app/`, `demo/` ani HTML není prázdný; syntaxe všech `app/*.js`, `app/data/*.js` a testů ověřena. `demo/scene-items.js` přegenerován (generátor `navrhy-designu/04-pohledy-2026-10-05/scene-items.cjs`, 389 s).

## 7. Co je v `10-predavka-PD.md`

Stavba posuvníku a id pro budoucí kroky, nové akce (`vsPick`, `targetSet` …), seznam selektorů a textů, které jsem v `demo/` změnil (`tour-content.js`, `explain.js`, `guide.js`, `fixtures.js`, `scene-items.js`), slovník („posuvník“) a dvě zbývající selhání prezentační vrstvy.
