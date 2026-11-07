# SCHEMA 84 – integrace před publikací (5. 11. 2026)

Navazuje na `07-schema84-jadro.md` (J), `09-schema84-prezentace.md` (G) a `11-schema84-pacient-posuvnik.md` (P+D). Výchozí stav: celé testy 132 prošlo, 2 selhala (ověřeno vlastním během na kopii před změnami). Nepublikováno, necommitováno, `~/Documents/...` ani git beze změny.

## 1. Co je opraveno

| Úkol | Co | Kde |
|---|---|---|
| 1a – test „Průchod pro garanta (8. 10. 2026)“ | Očekávání testuje pravidlo „panel = rámeček“: v kroku nabídky je „Ke schválení teď“ s R-NAVYKY (`D.offerStep(2, 'R-NAVYKY')` = krok); v dalším kroku R-NAVYKY není v „teď“, její karta není rozbalená a je jen v řádku „Dříve v této scéně: rozhodnuto N · zobrazit“; po Zpět je R-NAVYKY znovu v „teď“; na konci scény bez nabídky žádná rozbalená karta; C-CILE se rozbalí až po klepnutí na „Dříve v této scéně“ a na kartu. | `nutrifee-rozhodovaci-maketa.test.cjs` |
| 1b – `faze2-pribeh` C01, odbočka „nemám to doma“ | `D.reviewStory` zvyšovala „první prandiální návrh k dávce“; v odbočce je první oběd, a tak `apply` oběd zvýšila na 12 j., zatímco kroky ho ponechaly přes „Jiné rozhodnutí“. Teď se zvyšuje jen první prandiální dávka mimo oběd; oběd rozhodne `D.decideSingles` jako ponechaný – v hlavní linii i v odbočce stejně jako kroky a vyprávění („Dávka k obědu zůstává“, závěr dodatku „dávky zůstávají“). | `demo/fixtures.js` |
| 2 – šipka posuvníku | „pod cílem“ (čas v cíli 58 %) měl ↑. `vsState` u druhu `goal` vrací `icon`: splněno ✓, `better: 'max'` a pod cílem ↓ (`arrow-down`), `better: 'min'` a nad cílem ↑. Platí pro vykreslení i živý náhled při tažení. Ikona `arrow-down` doplněna z Lucide; ukázka „Procenta · pod cílem“ v katalogu opravena. Glukóza beze změny (nad cílem ↑, pod 4 „!“). | `app/screens.js`, `app/ui.js`, `app/icons.js`, `design-system/index.html` |
| 3 – panel = rámeček | Viz odd. 2. Nálezy prohlížečové kontroly opraveny v cílech kroků a v označení bloků; nové `D.approvalsNow` (jen „teď“) a `D.panelOpenId` (karta, kterou panel ukazuje rozbalenou) pro testy. | `demo/tour-content.js`, `demo/presenter.js`, `app/screens.js`, `app/screens-clinic.js` |
| 4 – verze a mapa | `D.build = 'schema-84'`; `NF.SCHEMA = 84`, `?v=84` (HTML 22×, katalog 5×), `data-version="84"` (katalog) beze změny. `demo/scene-items.js` přegenerován (378 s); změna jen D-BAZAL 23:11 → 23:10 (a s tím deps scény 23). | `demo/sync-config.js`, `demo/scene-items.js` |
| `15` | Odst. 15 nový odstavec „Panel = rámeček (rozhodnutí vlastníka 5. 11. 2026, stav SCHEMA 84)“ – pět bodů pravidla a jak se ověřuje (Node test + `panel-shoda.cjs`). Odst. 16 stavový odstavec „5. 11. 2026, SCHEMA 84 – integrace před publikací“. | `15-ZDROJ-PRAVDY-MAKETA.md` |

## 2. Panel = rámeček – nálezy a opravy

Prohlížečová kontrola `panel-shoda.cjs` (popis níže) v prvním běhu našla **12 kroků, ve kterých štítek nabízené položky ležel vedle rámečku** (stejně na 1440×900 i 390×844, v průchodu Dál, po Zpět i po skoku – 36 nálezů na velikost). Body b) až f) (rozbalená karta jen z „teď“, panel po Zpět a po skoku totožný s první návštěvou, citace na obrazovce) byly čisté už v prvním běhu – pravidlo G v `approvalsList` a `resetCards` drží. Všechny nálezy byly typu a): rámeček na jednom prvku, štítek o řádek vedle.

| Scéna:krok | Položka | Dřív rámeček | Nyní rámeček (obsahuje štítek a to, o čem vyprávění mluví) |
|---|---|---|---|
| 2:2 Čtyři podmínky zařazení | K-KRITERIA | poslední zaškrtávátko | karta podmínek (`.card:has([data-action="eligibility"])`) s hláškou „Všechny podmínky potvrzené“ a štítkem |
| 3:3 Startovní sada návyků | R-NAVYKY | první návyk | karta startovních návyků (`.card:has(.habit-opt)`) |
| **3:4 Pravidla pro pacienta jsou v plánu (případ vlastníka)** | R-POKYNY | první pravidlo (`details.instr-card`) | blok pravidel `.rules-part` se štítkem; seznam pravidel v něm se rozbalí (`reveal`); panel ukazuje rozbalenou kartu R-POKYNY, „Startovní sadu návyků“ ne – ani po Zpět |
| 3:5 Cíle glukózy | C-CILE | řada posuvníků | nový blok `.targets-part` (nadpis, věta se štítkem, volba sady, posuvníky) |
| 7:2 Hodnota ze senzoru: 7 | Z-GLUKOZA | posuvník | nový blok `.glu-pick` (štítek nad posuvníkem + posuvník); test `zaverecne80` upraven |
| 9:2 Reakce: častěji nad cílem | R-SKORE | štítek reakce | hlavička karty jídla `.food .h` (štítek reakce + řádek „Stupeň reakce“) |
| 12:3 Třetí případ: „Nevím“ | I-NEVIM | text pravidla | nový blok `.unknown-rule` (otázka, pravidlo, štítek) |
| 14:2 Podobá se smaženému řízku | R-PODOBNOST | zvolené jídlo | karta podobného jídla (`.card:has([data-action="mealLike"])`) |
| 15:1 Přepínač „Není mi dobře“ | P-NEMOC | přepínač | karta přepínače (`.card:has(.sick .toggle)`) s „Co se stane“ a štítkem |
| 22:7 Kontrola zahájena: dlaždice souhrnu | S-SEMAFOR | dlaždice | nový blok `.tiles-block` (dlaždice + řádek „Dlaždice vycházejí z“) |
| 23:8 Vše sedí – poklesy jen varují | D-POSTUP | box ověření (1 884 px) | `.prop.current .grid2` (body ověření + „Postup říká“); štítek D-POSTUP přesunut z řádku pod tlačítky „Rozhodnout“ do boxu „Postup říká“ |
| 23:11 Body ověřené s pacientem | D-BAZAL | větev postupu | D-BAZAL se nabízí o krok dřív, ve 23:10 „Návrh k bazálu: noci pod cílem“, kde je rámeček na celém důvodu návrhu `.why-part` (důvod, noci, ranní hodnoty, štítek) |

Žádné vyprávění se neměnilo – rámečky teď leží na bloku, o kterém krok mluví. Nové třídy (`.glu-pick`, `.unknown-rule`, `.targets-part`, `.tiles-block`) jsou jen obaly bez stylu (žádné nové tokeny ani pevné hodnoty).

### Výsledky `panel-shoda.cjs` po opravách (kopie `scratchpad/tI`, server 127.0.0.1:8798, bez animací)

| Měření | 1440×900 | 390×844 (telefon, dotyk) |
|---|---|---|
| Kroků průchodu Dál (hlavní linie + dodatek, 32 scén) | 182 | 182 |
| Kontrol po Zpět (k+1 → k) / Dál po Zpět | 150 / 150 | 150 / 150 |
| Skoků na scénu (goScene = přehled dějství) a kroků po skoku | 32 / 182 | 32 / 182 |
| Kroků s „Ke schválení teď“ / karet „teď“ | 28 / 28 | 28 / 28 |
| a) štítek karty „teď“ mimo rámeček nebo mimo výřez nad panelem | 0 (první běh 12 kroků × 3 průchody = 36) | 0 (první běh 36) |
| b) rozbalená karta mimo „teď“ | 0 | 0 |
| c) citace ve vyprávění mimo obrazovku (citací v průchodu Dál 171, z toho přímo v rámečku 94) | 0 | 0 |
| d) panel po Zpět jiný než při první návštěvě (seznam „teď“, otevřená karta, titulek) | 0 | 0 |
| e) panel po skoku na scénu jiný než při první návštěvě | 0 | 0 |
| f) po rozhodnutí, Dál a Zpět se rozhodnutá karta otevřela mimo svůj krok | 0 | 0 |
| Chyby a varování konzole / selhaná klepnutí / požadavky mimo server | 0 / 0 / 0 | 0 / 0 / 0 |
| Položka bez štítku (zásada) | P-LEKAR | P-LEKAR |

Případ vlastníka (scéna 3, krok 4 „Pravidla pro pacienta jsou v plánu“): při první návštěvě i po Zpět z kroku 5 je „teď“ = R-POKYNY, rozbalená karta R-POKYNY, rámeček `.rules-part`, štítek v rámečku a ve výřezu; „Startovní sada návyků“ rozbalená není. Snímky: `snimky-panel/1440x900-scena3-pravidla-pred.png`, `1440x900-scena3-pravidla-po-zpet.png` (a totéž `390x844-*`).

Úvodní krok scény (krok 0) se Zpět nekontroluje: „← Zpět“ tam vede na poslední krok předchozí scény (B22), to je jiný děj; ten pokrývá kontrola po skoku (e).

### Kde kontrola žije

- **Prohlížeč:** `navrhy-designu/32-overeni-cile-2026-11-04/panel-shoda.cjs` (potřebuje Playwright, proto není v běžné sadě). Návod je v hlavičce souboru: kopie makety rsyncem, `python3 -m http.server 8798 --bind 127.0.0.1` v kopii, `NODE_PATH=<node_modules s playwright-core> node panel-shoda.cjs 1440 900 0` a `… 390 844 1`; výsledek v `OUT/<velikost>.json`, snímky případu vlastníka v `OUT/snimky/`, návratový kód 1 při jakémkoli nálezu.
- **Node (běžná sada):** test „SCHEMA 84 (vlastník 5. 11. 2026): panel = rámeček …“ v hlavní sadě projde celý příběh i dodatek s Dál a v každém kroku uvnitř scény Zpět a znovu Dál; hlídá, že „teď“ obsahuje jen položky s `D.offerStep` rovným kroku, rozbalená karta (`D.panelOpenId`) je z „teď“, `s.gOpen` je po každé změně kroku prázdné a po Zpět i po Zpět a Dál je `{ teď, otevřená karta, titulek }` stejné jako při první návštěvě; navíc případ vlastníka. Test „šipka posuvníku“ hlídá ↓ u „pod cílem“ a ↑ u „nad cílem“.

## 3. Celé testy

Kopie podle zadání (`rsync -a --delete … maketa-rozhodovaci 15-ZDROJ-PRAVDY-MAKETA.md $S/tI/` + `04-pohledy-2026-10-05`), `node nutrifee-rozhodovaci-maketa.test.cjs > tI-final.log`, celý log přečten: **136 prošlo, 0 selhalo** (výchozí 132/2; +2 opravené, +2 nové testy). Podsady: tokeny 7/0, schema84-jadro 14/0, zaverecne80 22/0, faze2-jadro 32/0, faze2-pribeh 15/0, pravdivost 4/0 (T1–T4 s novou mapou scén), kontrola74-obsah 19/0, kontrola2-obsah 18/0, kontrola74-panel 7/0, kontrola3-obsah 14/0, kontrola3-panel 9/0, kontrola4-obsah 16/0, kontrola4-panel 18/0, ukladani 29/0.

## 4. Průchod v prohlížeči s animacemi (`br/ga-walk.cjs`, schválení všech položek)

| | 1440×900 | 390×844 dotyk |
|---|---|---|
| Kroků | 181 | 181 |
| Chyby konzole / selhaná klepnutí / nerozhodnutelné položky / zaseknutí | 0 / 0 / 0 / 0 | 0 / 0 / 0 / 0 |
| Citace mimo obrazovku / `{…}`, undefined, NaN / vodorovné přetečení | 0 / 0 / 0 | 0 / 0 / 0 |
| Požadavky mimo server | 0 | 0 |
| Souhrn | 28 schváleno | 28 schváleno |
| Nejdelší krok | 5,3 s | 5,9 s (na telefonu jako v běhu G, odd. 3 zprávy 09; Node test tempa prochází) |

## 5. Kontrola souborů a jmen

- Žádný soubor v `app/`, `demo/`, `design-system/` ani HTML není prázdný; `node --check` prošel u všech `app/*.js`, `app/data/*.js`, `demo/*.js` a testů.
- `NF.SCHEMA = 84`; `?v=84` v `nutrifee-rozhodovaci-maketa.html` (22×) a `design-system/index.html` (5×); `data-version="84"` (katalog); `D.build = 'schema-84'`.
- Prohledání `maketa-rozhodovaci/` na výrobce senzorů a inzulinů, obchodní názvy léků (včetně GLP-1 a tablet), firmy, osoby, tituly, nemocnice a e-maily: žádný nález. Výskyty „apple“ jsou jméno ikony a systémové písmo (`-apple-system`), e-maily jen `@example.test` v testech.

## 6. Zvoleno bez dotazu

- Rámeček je na bloku kolem prvku a štítku, ne štítek přesunutý do prvku – mění se jen obaly a jeden štítek (D-POSTUP do „Postup říká“, kde postup opravdu je).
- D-BAZAL se nabízí ve 23:10 (důvod návrhu), ne ve 23:11 (body ověření): štítek D-BAZAL je v důvodu návrhu a krok 23:10 o něm mluví.
- Úprava `reveal` v `presenter.js`: když je cíl blok s přímým `details.instr-card`, seznam se rozbalí (vyprávění kroku 3:4 říká „Ukázka seznam rozbalila“).
- `D.reviewStory`: oběd se nikdy nezvyšuje (dřív „první prandiální návrh“); modelový lékař mění v jedné kontrole jen jednu dávku a oběd s poklesy po menší porci ponechává (07 bod 3, 09 odd. 4).
