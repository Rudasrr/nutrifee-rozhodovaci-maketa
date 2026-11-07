# SCHEMA 84 – prezentační vrstva (agent G, 4.–5. 11. 2026)

Postaveno podle `05-rozhodnuti.md` (bod 7 a odstavec „bez dotazu – garant“) a zprávy `03-garant-pochopeni-ovladani.md` (A1–A3, B1–B7, C1–C9, tabulka pochopení, průřezové otázky). Vlastněné soubory: `demo/` kromě `fixtures.js` a `sync-config.js`, generátor `navrhy-designu/04-pohledy-2026-10-05/scene-items.cjs` (beze změny kódu, jen spuštěn), testy `kontrola3-panel`, `kontrola4-panel`, `kontrola74-panel`, `pravdivost`. Verzi (`NF.SCHEMA`, `?v=`) nezvyšuji – agent J. Do `app/`, `fixtures.js`, hlavního testu ani `15` jsem nesahal; co tam patří, je v `08-predavka-G.md`.

Pracoval jsem proti stavu `app/`, jaký agent J měl na Disku 4. 11. ~13:00 (rozhodnutí 1–6 už v jádru: nové pořadí karet, varování místo blokace, otázky sestry, hmotnost, krok 3 s návyky a cíli). Jeho `06-predavka-J.md` (13:06) jsem přečetl na konci a převzal (odd. 3).

## 1. Co je postaveno

| Nález / rozhodnutí | Co | Kde |
|---|---|---|
| **A3 / rozhodnutí 7** – čas garanta | Úvod: „Celá ukázka trvá asi 60 minut: čtení vyprávění hlavní linie asi 40 minut a rozhodnutí 28 pravidel dalších asi 20. Dá se přerušit a vrátit …“ (dřív „asi 15 minut … 45–60“). V patičce panelu u Průběhu „zbývá asi N minut“: slova vyprávění zbylých kroků a úvodů scén (200 slov/min) + animace podle `PACE` (dojezd, nalezení cíle, stisk, pauza po akci; prohlídka bez akce) + nerozhodnuté položky (25 s + karta 45 slov). Hlavní linie se počítá po souhrn, v dodatku zbytek dodatku; přeskočené kroky se nepočítají. Na začátku 63 min, ve scéně 22 „asi 18 minut“. Vyprávění se nezkracuje (R25 b zavrženo). | `intro.js`, `presenter.js` (`remainingSeconds`, `remainingText`, `progressBar`) |
| **A2** – I-MENE bez vyhodnocení | Krok 12:2 „Druhý případ: menší porce“ míří na pravidlo, ne na blok rad: cíl je `.advice`, a bez vyhodnocení reakce oznámení `[data-off="R-REAKCE"]`; `watch` zůstává `.card.doc`. Vlastní věta `jinak` říká pravdu („Rady k jídlu tu nejsou žádné: vyhodnocení reakce jste zamítli … Bezpečnostní pravidlo na radách nezávisí, proto se ukáže i tak.“). Se zamítnutou R-REAKCE krok proběhne v režimu note a **I-MENE se nabídne ve scéně 12**, I-HYPO a B-HYPO ve scéně 13. | `tour-content.js` afterBolus |
| **A1** – D-PRAND / D-CISTA bez vyhodnocení | Krok „Proč návrh vznikl“ míří na blok `.why-part` karty ke snídani, ať je to návrh k dávce, nebo karta „Nejdřív rady“ (`brkId`); vyprávění říká, která karta to je (`jinak` pro variantu „Nejdřív rady“). D-PRAND se nabízí tam; se zamítnutou R-REAKCE proběhne v režimu note (v J-ově jádru je bez nabídek rad brána vypnutá, karta k dávce vzniká). D-CISTA má `{ ch: 'reviewProposals', step: 2, also: 'reviewSummary' }`: nové `also` v `D.itemScene` – když zamítnutí jiné položky odstraní její místo v kapitole (mapa `alt`), nabídne se tam, kde je vidět (značka čistých dat pod dlaždicemi v kroku 1 kontroly), ne v souhrnu naslepo. Průchod se zamítnutou R-REAKCE: do souhrnu spadly jen R-SKORE, R-PORCE, R-DOPLNEK, R-PORADI, R-PROCHAZKA (rady, jejichž místo bez vyhodnocení opravdu zmizí – `ucinek.bezMista`), žádná bezpečnostní ani dávková položka; test to hlídá. | `presenter.js` (`alsoHere`, `decisionPlan`), `tour-content.js`, `kontrola4-panel` |
| **B3** – karta položky | `shortCo`: karta ukazuje z „Co schvalujete“ celé věty, dokud se vejdou do `CO_WORDS` = 70 slov (první vždy); delší oddíl končí „Celé znění je v průvodci níže.“ (zvoleno bez dotazu: 70 místo 60, aby se dvě věty s prahy u K-KRITERIA a D-PRAND vešly celé). | `presenter.js` `gbody` |
| **B3 / tabulka 03 odd. 2** – znění „Co schvalujete“ | Přepsáno u K-KRITERIA (čtyři podmínky + vylučovací kritéria jmenovitě; kohorta jen inzulin), R-REAKCE („Co znamená „v cíli“ … Kdy je jídlo „známé“ … Kdy se aplikace zeptá …“ + dopad), R-DOPLNEK (seznam doplňků a přiřazení k druhům jídel v jedné větě), D-CISTA („Co je čistý zápis …“), D-PRAND („Kdy vznikne návrh k dávce „nad cílem“ … Rady jdou před dávkou … Kdy vznikne návrh „pod cílem“ …“), D-POSTUP (větve, blokace jen čistým poklesem, volič, „v příběhu jste viděli dva ze sedmi“), S-SEMAFOR (zelená / oranžová / červená slovy, vývoj v čase). Všechny prahy přes `{param}`, dosazené. | `guide.js` |
| **B4, C4, C5** – kde se co nabízí | D-PRAND u „Proč návrh vznikl“ (23:1); D-CISTA ve vlastním kroku „Vyřazené zápisy: co do návrhu nejde“ (23:2, cíl `details` v `.why-part`, citace „Vyřazuje se podle pravidla“ část rozbalí); D-POSTUP až u ověření návrhu k obědu „Vše sedí – poklesy po menší porci jen varují“ (23:8) s „Čeho si všímat“: „Právě o postupu … teď rozhodujete; viděli jste dva ze sedmi postupů, zbylé jsou v průvodci.“ R-REAKCE 9:1 a R-SKORE 9:2 (`{ ch: 'week', step: 2 }`); I-NEMOC-BAZAL 15:2 a I-NEMOC-JIDLO 15:3 (nový krok „Druhé pravidlo: inzulin k jídlu“). Žádný krok nenabízí dvě položky najednou. | `presenter.js` `D.itemScene`, `tour-content.js` |
| **B2** – zásuvka | Položky z dosud neprošlých scén jsou v „Nerozhodnuto“ jen řádkem „uvidíte ve scéně N“ (`.gitem.gfuture`, bez karty a tlačítek) a nahoře věta „Z toho N přijde v dalších scénách; rozhodnete je tam, kde je obrazovka ukáže.“ Nabídnuté (aktuální scéna od kroku nabídky) a dřívější mají kartu jako dřív; ve finále, po skončení a mimo příběh všechny. Lišta dál počítá všechny nerozhodnuté (jedno číslo se souhrnem). | `presenter.js` (`offeredYet`, `futureRow`, `decisionsDrawer`), `demo.css` |
| **B5** – úvod | Bod 2 pruhu: „… 28 klinických pravidel … Jde o neformální podklad pro autora, ne o podpis. Provozní pravidla – formáty, texty obrazovek, milníky – neschvalujete; v registru jsou jen popsaná.“ | `intro.js` |
| **B7** – souhrn | U položky, jejíž krok nabídky se přeskočil kvůli zamítnuté položce, řádek „V příběhu jsme ji nenabídli: krok ve scéně N, ve kterém se ukazuje, se přeskočil, protože jste zamítli „X“.“ (`skippedBy`); počítá se i do věty v úvodu souhrnu. | `presenter.js` |
| **B1** – telefon | Hláška po zamítnutí v panelu na telefonu jednořádková („Zamítnuto: „X“. Co to znamená, říká oznámení na obrazovce. Změnit lze kdykoli.“). Výška panelu při nabídce je token `--nf-demo-sheet-h-decide` (60vh) v `app/tokens.css` – změna na 50vh je v `08` odd. 1 (nevlastním). Měření 390×844: panel při nabídce 504 px = 60 %; po změně tokenu 422 px. | `presenter.js` `rejectedMsg`; `08` |
| **C1** | Dodatek 31:5 „Ostatní návrhy“ má `jinak` (v režimu note dřív prázdné). | `tour-content.js` |
| **C2** | Neřešeno: řádek registru ve scéně 18 (`regOpen`) je v `D.CONTROL_SEL` (`[data-action]`), bublina zámku by se ukázat měla; v Node nejde ověřit a v prohlížeči jsem to při tomto průchodu nezkoušel. Zůstává. | – |
| **C3** | Oznámení „Tahle část nefunguje“ u pacienta (a na úzkém okně) ukazuje první větu dopadu a zbytek pod `<details>` „Zobrazit, co chybí“; u lékaře a sestry na širokém okně celý text; `summary` má v zamčené obrazovce `pointer-events:auto`. | `presenter.js` `offHtml`, `demo.css` |
| **C6** | Nápověda „i“: barvy tlačítek + jak rozhodnout, že se poznámka ukládá sama, jak se vrátit k rozhodnutí (zásuvka z lišty), kde je souhrn, že jde o neformální podklad a provozní pravidla se neschvalují; tlačítka „Zpět k úvodu“ (otevře úvod jako zásuvku `intro` nad příběhem, příběh stojí) a „Zavřít nápovědu“. | `presenter.js` (`INFO_MORE`, `introDrawer`), `demo.css` |
| **C7** | Tlačítka lišty a odkazy panelu („Více k tomuto kroku“, „Rozhodněte N položek výše ↑“) i tlačítko v oznámení mají `min-height: var(--nf-tap-sm)` (44 px) – žádná pevná hodnota v `demo.css`. | `demo.css` |
| **C8** | „Načteno z vašeho přihlášení: rozhodnutí u N položek a M poznámek.“ (počítá položky a poznámky, ne řádky). | `presenter.js` `garantMerge` |
| **C9** | `.tour-panel h2:focus-visible` (a `.tour-min-t`) má rámeček `--nf-demo-focus`; myš rámeček neukazuje, klávesnice ano. | `demo.css` |
| **Vysvětlivky v panelu** | `explainDecorate` a `explainTap` hledají prvky i v `#tour` (panel) a `#overlay` (zásuvky, průvodce položkou); klepnutí do panelu už vysvětlivku nezahazuje. | `explain.js` |
| **Scéna 23 podle J-ova jádra** | Nové pořadí kroků snídaně (1–6) → oběd (7–9) → bazál (10–12) → „Probrat radu“ (13–14) → „Beze změny“ + řádek „Dávky bez návrhu“ (15). Oběd: poklesy po menší porci jako varování („poučit pacienta; větev „zvýšit“ neblokují“), „Vše sedí“ → „zvýšit“, lékař zvolí „Jiné rozhodnutí“ → ponechat (`propOther`, `propDecide PR-LUNCH:keep`, zápis `keep`); věty `jinak` pro zamítnutou B-HYPO. Bazál třetí s větou, proč nemá přednost, řádky nocí, „Ranní hodnoty za období“. Úvod scény bez „bazál je první“. Dodatek „nemám to doma“: oběd ponechán přes „Jiné rozhodnutí“ (dřív „pokles blokuje“). | `tour-content.js` |
| **Scéna 22 podle J** | Kroky „Sestra: jiný lék na diabetes“ („Začal pacient brát jiný lék na diabetes?“ → „Ne“), „Sestra: zdravotní stav“ (`nurseHealth` → „Ne“), „Sestra: hmotnost pro kontrolu“ (90 kg, při zařazení 92; přes `fn: NF.setWeight`), „Jídla dne za období“ (karta `.card.meals-overview`, vývoj v čase = dvě čísla a slovo, rozhodnutí 4). | `tour-content.js` |
| **Scéna 24 podle J** | Krok „Návyky a cíle: beze změny“ (`.habit-opt`; přepínače z katalogu, cíle voličem, dávky s voličem; nic se neklepe). | `tour-content.js` |
| **Scéna 2 / zařazení** | Věta o zaškrtávátku „Bere i tablety nebo GLP-1“ nahrazena podmínkou „Inzulin v pevných dávkách a žádný jiný lék na diabetes“. | `tour-content.js` |
| **Průvodce podle rozhodnutí 1–6** | K-KRITERIA `jak`/`co` (jen inzulin, otázka sestry, bez „navíc nevadí“); D-PRAND `jak`/`co` (karta k dávce vždy, bod „Pacient rady k jídlu zkoušel“, brána od `odmitnutiMin` nabídek, „nabídnuto N×, přijato M×“); D-POSTUP `jak`/`co` (`poklesy_jen_ciste` slovy, volič „jiná dávka“ u každé dávky, bod 2 bazálu od sestry); D-BAZAL `jak`/`co` (okolnosti nocí, ranní hodnoty, přednost jen bez jídla pozdě večer nebo pod 3,0); S-SEMAFOR `jak`/`co` (`smer_mmol`, `vyvoj_tydny`); B-HYPO `jak`/`co`/`dopad` (pokles po menší porci = varování); I-NEMOC-JIDLO bez věty o tabletách; `SAFE_MORE['B-HYPO']` („neuvidí ani jako varování v kartě k obědu, ani v části Bezpečnost“); hypo scéna 13:5 důsledek. `dopadSceny` doplněné o scény, které J-ovy obrazovky nově mění (K-KRITERIA, R-NAVYKY + reviewSummary; C-CILE + reviewConfirm; S-SEMAFOR + reviewProposals); B-HYPO beze změny (T3 prošel). | `guide.js`, `presenter.js`, `tour-content.js` |
| **Mapa scén** | `demo/scene-items.js` přegenerovaný (3 kola, 413 s). Rozhodnutí: K-KRITERIA 2:2 · R-NAVYKY 3:3 · R-POKYNY 3:4 · C-CILE 3:5 · I-KONTAKT 3:6 · P-LEKAR 4:1 · Z-GLUKOZA 7:2 · R-REAKCE 9:1 · R-SKORE 9:2 · I-VYSOKA 10:9 · R-PORCE 11:1 · R-DOPLNEK 11:2 · R-PROCHAZKA 11:3 · I-MENE 12:2 · I-NEVIM 12:3 · I-HYPO 13:4 · B-HYPO 13:5 · R-PODOBNOST 14:2 · R-PORADI 14:5 · P-NEMOC 15:1 · I-NEMOC-BAZAL 15:2 · I-NEMOC-JIDLO 15:3 · S-SEMAFOR 22:7 · S-SILNA 22:12 · D-PRAND 23:1 · D-CISTA 23:2 · D-POSTUP 23:8 · D-BAZAL 23:11. | `demo/scene-items.js` |

## 2. Testy (na kopii `scratchpad/tG`, stav Disku 5. 11. ráno)

- `pravdivost.test.cjs`: **T1, T2, T3, T4 prošly** (29 průchodů se zamítnutím každé položky; T3 po doplnění `dopadSceny`).
- `kontrola3-panel`: 9/0 (M1 upraven: bazál je třetí návrh). `kontrola4-panel`: **17/0** – 8 nových testů SCHEMA 84 (A1/A2 průchod se zamítnutou R-REAKCE: I-MENE 12, I-HYPO 13, D-PRAND a D-CISTA v příběhu, do souhrnu jen rady bez místa; B4/C4/C5 místa nabídek a kroky; B3 karta do 70 slov a znění prahů; rozhodnutí 7 úvod a odhad, který klesá; B2 zásuvka bez budoucích položek; C6/C8 nápověda, úvod jako zásuvka, hláška o načtení; B7/C1/C3/C7/C9; vysvětlivky v panelu). `kontrola74-panel`: 7/0.
- Hlavní sadu jsem nespouštěl (mění ji J); očekávání, která se mění, jsou v `08` odd. 3.

## 3. Průchod v prohlížeči (Playwright, kopie tG, falešný server; `br/ga-walk.cjs` kontrolora)

| Měření | 1440×900 (animace) | 390×844 dotyk (animace) | 1440×900, R-REAKCE zamítnuto |
|---|---|---|---|
| Kroků (hlavní linie + dodatek) | 180 (159 + 21) | 180 (159 + 21) | 171 (150 + 21); 11 úseků skip, 17 note |
| Slov vyprávění hlavní linie | 8 564 (43 min při 200 slov/min) | 8 564 | 7 831 |
| Animace hlavní linie | 304 s | 324 s | bez animací |
| Nejdelší krok | 5,2 s (18:5) | 5,9 s (5:3) | – |
| Chyby a varování konzole | 0 | 0 | 0 |
| Selhaná klepnutí / nerozhodnutelné položky | 0 | 0 | 0 |
| Citace ve vyprávění mimo obrazovku | 0 | 0 | 0 |
| `{…}` / undefined / NaN, vodorovné přetečení | 0 / 0 | 0 / 0 | 0 / 0 |
| Požadavky mimo falešný server | 0 | 0 | 0 |
| Souhrn | 28 schváleno | 28 schváleno | 22 schváleno, 1 zamítnuto, 5 nerozhodnuto (R-SKORE, R-PORCE, R-DOPLNEK, R-PORADI, R-PROCHAZKA – rady bez místa, v souhrnu s větou proč) |
| Štítek rozhodované položky při nabídce (měřeno hned po Dál, před dojezdem plynulého rolování) | 3 pod okrajem (B-HYPO 13:5 y 911, D-CISTA 23:2 y 947, D-POSTUP 23:8 y 2265) + P-LEKAR bez štítku (zásada) | 13 pod panelem (panel 504 px = 60 %; po tokenu 50vh 422 px) | P-LEKAR |
| I-MENE / D-PRAND / D-CISTA se zamítnutou R-REAKCE | – | – | nabídnuty v 12:2 (note), 23:1 (note), 23:2 |

Odhad v panelu: „zbývá asi 63 minut“ na začátku (změřeno: 43 min čtení + 5 min animací + 28 rozhodnutí ≈ 60–70), „asi 18 minut“ ve scéně 22. Výška panelu při nabídce na telefonu zůstává 60 %, dokud J (nebo P) nezmění token (`08` odd. 1); štítky, které měření ukázalo pod panelem, reveal roluje nad panel až po dojezdu – měřeno dřív, stejně jako u kontrolora.

## 4. Co jsem převzal z `06-predavka-J.md` a co ne

Převzato (odd. 3 předávky): scéna 22 (otázky sestry, hmotnost, „Jídla dne za období“), scéna 23 (pořadí, varování u oběda, `propOther` → `keep`, bazál třetí, řádek „Dávky bez návrhu“), odbočka „nemám to doma“ (oběd ponechán přes jiné rozhodnutí), scéna 24 (krok 3), zařazení (věta o podmínce), průvodce (K-KRITERIA, D-PRAND, D-POSTUP, D-BAZAL, S-SEMAFOR, B-HYPO, I-NEMOC-JIDLO), `SAFE_MORE`.

Nepřevzato / nevyřízené:
- Krok, který by jen ukázal volič „jiná dávka“ (`.decide.other-dose`) u karty s větví „ponechat“ – v hlavní linii ho lékař nepoužije; nepřidal jsem ho (jedno Dál = jeden děj, tempo). Pokud ho vlastník chce, je to jeden krok u bazálu po větvi „ponechat, řešit večeře“.
- Hmotnost klepnutím do mřížky (`nurseWeightSet`) – akce v `ui.js` zatím není (agent P); krok ji nastavuje přes `fn`.
- Odbočka `declines` (karta k dávce hned za „Nejdřív rady“ s bodem 10 „nesedí“): vyprávění kroků dodatku jsem neměnil nad rámec `jinak`; T4 prošel, ale slovní popis nové karty k dávce v dodatku 30 tam není (krok „Ostatní návrhy“ ji shrne jednou větou). Doplnit, až J uzavře jádro.
- C2 (řádek registru ve scéně 18 bez bubliny) neověřeno.
- `15` odst. 15 (věty v `08` odd. 4), hlavní test, `tokens.css` – mimo mé soubory.

## 5. Zvoleno bez dotazu

- `CO_WORDS` 70 místo 60 (dvě věty s prahy u K-KRITERIA a D-PRAND).
- D-CISTA `also: 'reviewSummary'` jako náhradní místo (ne souhrn), když bez návrhu k dávce není seznam vyřazených zápisů.
- D-PRAND `{ ch: 'reviewProposals' }`: štítek má i tabulka jídel dne v kroku 1, ale rozhoduje se u karty ke snídani (B4).
- Lišta „Ke schválení · zbývá N“ počítá dál všechny nerozhodnuté (jedno číslo se souhrnem); zásuvka říká, kolik z nich přijde.
- Oznámení sbalené jen u pacienta a na úzkém okně; u lékaře celý text (03 C3 mluví o telefonu).
- Scéna 23 přepsána podle J-ova jádra (pořadí, varování, „Jiné rozhodnutí“) bez čekání na jeho předávku; po jeho uzavření stačí spustit `pravdivost` a generátor.
