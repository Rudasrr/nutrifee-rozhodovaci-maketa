# Předávka: prezentační vrstva – panel, vyprávění, rozvržení, přístupnost (30. 10. 2026, kontrola 4)

Rozsah: `demo/presenter.js`, `demo/tour-content.js`, `demo/explain.js`, `demo/intro.js`, `demo/demo.css`, `app/ui.js`, `app/design.css`, `app/tokens.css`, `design-system/index.html`, generátor `navrhy-designu/04-pohledy-2026-10-05/scene-items.cjs`, `pravdivost.test.cjs`, nový test `kontrola4-panel.test.cjs`. Nic nepublikováno, nic necommitováno.

## 1. Co je hotové

### Prohlížeč (01)
| Nález | Řešení |
|---|---|
| **B1** pravdivý stav uložení | `syncInfo` / `entryState` / `allSaved` čtou `D.sync.status()` (`pending`, `rejected`, `saved`, `lastErr`) a `D.sync.state(sid)`. Odznak v liště je při neuložených na **každé šířce** (na telefonu bez tlačítka, to je v panelu a v ⋯); řádek `.sync-line` v panelu, sbaleném panelu, zásuvce „Vaše rozhodnutí“ a v ⋯ (Přehled scén). Poděkování „Děkujeme, máme vaše rozhodnutí“ a „Vaše rozhodnutí jsou uložená na serveru; můžete okno zavřít“ jen při prázdné frontě; jinak „Děkujeme. Rozhodnutí zatím nejsou odeslaná“ / „nechte prosím okno otevřené a zůstaňte online“ + Zkusit znovu (`syncRetry`, u odmítnutých `syncRetryDead`). Řádek pod poznámkou: „Uloženo na serveru HH:MM.“ / „Uloženo v tomto prohlížeči HH:MM; čeká na odeslání…“ / „…server zápis odmítl“. `D.sync.onChange` překreslí (po 150 ms, ne během kroku). Ověřeno 503 na 360 a 1440. |
| **M1** zásuvka skáče nahoru | `app/ui.js` `renderDrawer`: otevřená zásuvka se překresluje **morphem**, drží `scrollTop` i fokus (fokus na „×“ jen při otevření). Po rozbalení a rozhodnutí odroluje ke kartě, jen když není vidět (`drawerAfterRender`). |
| **M2** note nahradil vyprávění | Režim „note“: věta o zamítnuté části (`.tour-note`) **nad** vyprávěním kroku; vyprávění zůstává bez vět, které zamítnutou část popisují. Které věty vynechat, počítá generátor (`drop` v `scene-items.js`) stejnými funkcemi, jimiž T4 hlídá pravdivost (`P.narrDrops`); T4 nově kontroluje i ponechané vyprávění v režimu note. Vlastní `jinak` dál nahrazuje celé vyprávění. |
| **M4** | Všechna jídla bez R-REAKCE/R-SKORE, Návyky a „s aktivními návyky“ bez R-NAVYKY, pořadí návrhů z dat (`ordinal`), „Druhá rada“ jen s R-PORCE, po „Nevím“ se obrazovka vrátí na krok 3. |
| **M5** | `movedHere`: položka, která po zamítnutí jiné z kroku zmizí, má v panelu větu „O položce … rozhodnete v souhrnu na konci, protože…“; „Vše rozhodnuto“ jen když opravdu. |
| **M6** | cíl kroku = volba řízku (`data-value`). |
| Kosmetické | 1 rámeček na otázce (`.choice-row:has(…)`, `.chips:has(…)`); 2 „Hodnota při jídle: 7“ a „Nejvyšší hodnota nad 15“ jako dva kroky; 3 hláška v souhrnu/zásuvce bez „Příběh pokračuje“; 4 souhrn netvrdí „prošli celou“; 5 zásuvka během přehrávání kroku se otevře až po jeho dohrání; 6 karta v zásuvce po rozhodnutí zůstane otevřená; 8 „u jeho rozhodnutí“, když změna není; 10 lišta „Další krok“ nad sbaleným panelem na telefonu; 11 kontakty po zamítnutí I-KONTAKT; 12 scéna za „tady“ = „už jste viděli“. **Neopraveno:** 7 (texty registru – jádro), 9 (360×740, list vs. cíl kroku – návrh v odst. 3). |

### Obsah (02)
B1 závěrečné kroky podle skutečného zápisu (`savedText`, poslední zápis, přijaté rady, zamítnuté položky); B2 = M2; B3 zaučení bez návyků proběhne (body podle návyků → pevné body), převzetí to řekne; B4 **čeká na jádro** (scéna kontroly se mění rozhodnutím 7); B5 karta po poklesech jen s B-HYPO; B12 „Nejistý inzulin“ nestojí na I-NEVIM, „Menší porce“ proběhne i bez I-MENE (cíl na „teď neradíme“); C1 „v cíli ani jednou ze 4“ z dat; C2 „kuře na kari“; C3 citace rady k pořadí z obrazovky + doplněk; C13 nemoc: pravidla zůstávají v Bezpečí, `tJinak`; C14 jídla nad cílem bez R-REAKCE. Generátor bere i hlášku panelu (poděkování / „Zapsáno“) jako větu obrazovky.

### Přístupnost (04)
A1 hranice panelu po boku `--nf-demo-side-min: 640px` (JS `SIDE_MIN`), panel `clamp(280px,34vw,380px)`, do 1100 px kompaktní lišta (DEMO · stav ukládání · Ke schválení · ⋯), mezi 641–1100 px panel nesbalený s vyhrazeným sloupcem, `scroll-padding` podle `--barh`/`--panelh`. Při 200 % (720×450): lišta 57 px, panel po boku 280×361 px (dřív list 225 px a obrazovka 120 px). B1 zámek i pro klávesnici (`D.lockedKey`: Enter/mezerník/psaní v obrazovce → bublina), `main[aria-describedby]`, panel v DOM hned za lištou (`NF.slots.afterBanner`, jádro drží `#tour[data-nf-keep]`). B2 fokus v zásuvce (morph, „Ano, zamítnout“). B3 fokus po startu, sbalení a rozhodnutí v souhrnu. B4 `aria-live` jen na `.tour-status` (stále v DOM), hláška „Schváleno: „…“.“. B5 `--nf-demo-pulse-iter: 3`. B6 toast nad listem panelu / vedle panelu. C kontrasty: `--nf-ok #268F61` (4,05 / 3,78), `--nf-over #D2632B` (3,78 / 3,52), `--nf-tir-gap` mezi úseky pruhu a stupnice. C1 názvy dialogů, C2 `aria-label="Rozhodnout: …"`, C3 „i“ 40 px, C6 nápověda `aria-hidden`, C7 bublina `hidden`, C12 `aria-expanded`/`aria-haspopup`, C14 titulek podle scény, `inert` i na panel (je v `#app`). **Mimo mě:** C4, C5, C8, C11 (jádro), C13 (auth).

### Rozhodnutí vlastníka
10: intro „každý návrh ověří s pacientem a rozhodne“, finále totéž. 4, 7, 11 a vyprávění k nim: **v integraci po předávce jádra.**

## 2. Pro jádro
- `app/ui.js`: nový slot `NF.slots.afterBanner` (id prvku) a `data-nf-keep` v morphu; `NF.slots.drawerLabel(name)`. V produkci beze změny.
- Registr: kosm. 7 (historie v textu R-REAKCE, R-SKORE) je v `registry.js`.
- Scéna kontroly (rozhodnutí 7) a scénář 5 (rozhodnutí 11): kroky v `tour-content.js` upravím podle nových obrazovek.

## 3. Ověření
`kontrola4-panel.test.cjs` 9/9, `pravdivost.test.cjs` T1–T4 na kopii SCHEMA 77 s mými soubory a přegenerovanou mapou. Prohlížeč (Playwright, kopie): 1440×900, 390×844, 360×740, 720×450 (200 %), 853×480 / 960×600 (150 %), výpadek 503; 0 chyb konzole.

## 4. Doplněno při integraci SCHEMA 78
Stav ukládání podle `D.sync.state`/`status` (odmítnuté zápisy, `syncRetryDead`), deník mezi kartami sloučený podle `sid` + posluchač `storage`, `garantMerge(list, { replace, other })` nemění „Ukázka skončila“, M8 v historii karty. Příběh podle předávky jádra (vylučovací kritéria, připomínky a ústní body v zaučení, oznámení telefonu, sestra před lékařem, souhlas s novou dávkou, scénář 5). Podrobnosti a ověření: `09-integrace78.md`.
