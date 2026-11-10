# SCHEMA 89 – jádro jako knihovna pro první demo

*9. 11. 2026. Podle rozhodnutí vlastníka `05-rozhodnuti.md` (body 1–4) a zprávy `02-forma.md` (odd. 3 a 4). Změny jsou jen na Disku v `maketa-rozhodovaci/` a v `15` odst. 16; nic není commitnuté ani publikované, `~/Documents/Nutrifee` beze změny, předávky (`maketa-rozhodovaci/predani/`, `navrhy-designu/34-predani-programatorovi/predani/`) beze změny.*

## Názvy pro předávku (dodrženy přesně)

| Co | Název |
|---|---|
| volba větve postupu v jádře | `NF.proposalBranch(S, návrh)` |
| vyměnitelné hodiny a úložiště | `NF.configure({ now, storage: { get, set } })` |
| složka zlatých výstupů | `maketa-rozhodovaci/zlate-vystupy/` s `generuj.cjs` a `README.md` |
| test zlatých výstupů | `maketa-rozhodovaci/zlate-vystupy.test.cjs` |
| rychlá sada | `maketa-rozhodovaci/rychle.test.cjs` |

Žádný z domluvených názvů se neměnil. **Navíc přibyly** (předávka je může zmínit): `NF.onChange(fn)` (háček změny), `NF.emitChange`, `NF.storage()` (právě používané úložiště), `NF.config`, `NF.previewQuestions(S, souhrn?, best?)`, `NF.previewBest(S, plán?)`, `NF.OFF_RECORD_ONLY` v jádře, pole `fpTrace` v exportu garanta. **Zrušen** slot `NF.slots.itemGuide` (předávka ho v `30-prilohy.md` / `00-postup.md` může zmiňovat u stopy SCHEMA 87 – tam je potřeba opravit, viz bod 2).

## 1. Volba větve návrhu v jádře

- `NF.proposalBranch` je v `app/core.js` hned za `NF.verifyState` (beze změny logiky, přesunutý kód). Vrací `{ action, text, when?, block?, missing? }`, `action` je `wait | free | keep | up | down | swap | edit`.
- `V.proposalBranch` (= `NF.screens.proposalBranch`) v `app/screens-clinic.js` je tenký alias `function (S, pr) { return NF.proposalBranch(S, pr); }`.
- Volající přepnuti na jádro: `app/screens-clinic.js` (`proposalBody`), `app/ui.js` (3×, akce `propUnits`, `propDoseSet`, `propDecide`), `demo/fixtures.js` (4×), `demo/tour-content.js` (2×). Testy dál volají `NF.screens.proposalBranch` přes alias.
- **Zvoleno bez dotazu:** příběh se jen nad jádrem zastavil ještě na jednom místě – `D.firstQuestion` (kapitola „den před kontrolou“) četl první navrženou otázku z vykreslené obrazovky `V.preview`. Bez obrazovek tak pacient otázku neuložil a lékař ji v reportu neviděl (rozdíl v `S.questions`). Výběr tří otázek a „nejlepší rady“ jsem proto přesunul do jádra jako `NF.previewQuestions` a `NF.previewBest`; obrazovka i příběh je jen volají. Texty i pořadí otázek jsou beze změny (ověřeno zlatými výstupy s prezentační vrstvou i bez ní).
- Ověřeno: přehrání všech 32 scén jen nad `app/core.js` + `app/data/*` + `demo/fixtures.js` v holém `node:vm` (bez `window`, `document`, `localStorage`) projde až po vydání plánu P2 (scéna 26 „nový plán“: plán `P2`, předchozí `P1`). Hlídá to `zlate-vystupy.test.cjs`, první test.

## 2. Otisk položky nezávislý na prezentační vrstvě

**Řešení:** otisk ve stopě (`polozky[].fp` u událostí výpočtu) je od SCHEMA 89 **otisk jádra** `NF.itemFingerprint(položka)` – bez druhého argumentu, tedy `co = null`, jen z dat jádra (`id, scope, cat, title, summary, detail, text, texts, lists, postup, sestra, params, labels`). `NF.itemRefs` už nečte slot `NF.slots.itemGuide`; slot je zrušený a `demo/guide.js` ho nenastavuje. Otisk ve stopě tak vychází stejně s `demo/` i bez něj (D-POSTUP `fp-bf49017463463d0c` v obou případech).

- Funkce `NF.itemFingerprint(item, guideEntry)` je beze změny: s `{ co }` dál počítá otisk pro rozhodnutí garanta. Ten zůstává v prezentační vrstvě (`demo/sync.js`, `fp`, alg `core`) i s `fpGuide`, `fpCat`, `fpExtra`, `shown` – **export rozhodnutí garanta je beze změny formátu i hodnot**, testovací vektory v `ukladani.test.cjs` platí.
- Export garanta (`demo/results.js`) nese u každé položky navíc `current.fpTrace` = otisk jádra jako ve stopě a jeho popis v `fingerprint.other`. Most mezi stopou a rozhodnutím garanta: stopa → `id@version` + `fpTrace`; rozhodnutí → `fp` (s průvodcem). Starší otisky ve stopě nebylo potřeba zachovat (garant zatím nic nerozhodl).
- Testy: hlavní sada (SCHEMA 87, stopa) teď čeká `ref.fp === NF.itemFingerprint(položka)` a že se liší od otisku s průvodcem; `zlate-vystupy.test.cjs` porovnává otisky ve stopě s `demo/` i bez něj událost po události.

## 3. `NF.OFF_TEXT`

`NF.OFF_TEXT` i `NF.OFF_RECORD_ONLY` jsou v `app/core.js` (za `NF.garantItems`). V `app/screens.js` zůstaly aliasy `V.OFF_TEXT`, `V.OFF_RECORD_ONLY`; `off()` čte `NF.OFF_TEXT` jako dřív.

## 4. Jádro jako modul s vyměnitelnými hodinami a úložištěm

- `NF.configure({ now, storage })` – oba klíče nepovinné, vrací `NF.config`. `now()` smí vrátit `Date`, milisekundy nebo místní ISO řetězec; `now: null` = zpět na čas zařízení. `storage: { get(key) → řetězec | null, set(key, value) }` (chyba zápisu = výjimka); `storage: null` = úložiště není; `storage: undefined` = výchozí `localStorage`. Bez volání se chová jako dřív.
- `NF.storage()` vrátí právě používaný adaptér (nastavený, jinak obal `localStorage`, jinak `null`). `NF.load` i zálohy jiného schématu jdou přes adaptér.
- `NF.save(S)` vrací `true` jen po skutečném zápisu. Bez úložiště nebo při chybě vrátí `false` a nastaví `NF.storageOK = false` (lišta pak ukáže stávající hlášku „Zařízení nemá místo pro uložení…“). `NF.load` bez úložiště nastaví `storageOK = false` také.
- Háček změny: `NF.hooks.change` + `NF.onChange(fn)` (vrací funkci k odhlášení); `fn(S, { saved, key })` se volá po každém `NF.save`, tedy po každé akci UI. Chyba v háčku jádro nezastaví; během `NF.muteHooks` (přehrání příběhu) mlčí – stejně jako `NF.hooks.decision`.
- `NF.slots` zakládá jádro (`NF.slots = NF.slots || {}`), `app/ui.js` ho už nepřepisuje prázdným objektem – `demo/fixtures.js` jde tak načíst i bez `ui.js`.
- Jádro síť nevolá: hlídá hlavní sada (beze změny) a nově `rychle.test.cjs` (žádné `fetch(`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `EventSource` v `app/*`; `app/core.js` a `app/data/*` nesahají na `document.`, `window.` ani `localStorage.getItem/setItem`; nezakládají jiný globální objekt než `NutriFee`).

## 5. Zlaté výstupy

- `zlate-vystupy/generuj.cjs` načte jen `app/core.js`, `app/data/registry.js`, `catalogs.js`, `foods.js` a `demo/fixtures.js` (jen jako testovací data), přehraje všech 32 scén (`D.playScene`) a zapíše pět souborů JSON (kanonicky, klíče seřazené): `otisky.json` (5 kB), `pribeh.json` (93 kB), `kontrola.json` (158 kB), `rady.json` (562 kB), `stopa.json` (303 kB). Obsah souborů je popsaný v `zlate-vystupy/README.md`. Generování trvá asi 20 s; `--check` jen porovná a vypíše první rozdíl.
- `zlate-vystupy.test.cjs` (9 testů): načtení bez DOM a přehrání po P2; shoda každého z 5 souborů; kanonický tvar souborů; otisky (42 položek, 28 garantových, 171 jídel, formát); shoda výstupů a otisků ve stopě **s prezentační vrstvou** (celé HTML, scény převzetí, krok 3 kontroly, souhrn). Zapojený do hlavní sady (`nutrifee-rozhodovaci-maketa.test.cjs`, seznam podsad) i do rychlé sady.
- **Zvoleno bez dotazu:** do výstupů nejde číslo SCHEMA ani časy běhu, takže zvýšení verze zlaté výstupy nemění. Rady jsou od první snídaně pro 4 jídla × 3 porce × 3 stavy inzulinu (proto je `rady.json` největší). `kontrola.json` má ve scénách kroku 2 navíc tabulku větví „všechny body sedí“ / „nesedí bod k“ pro každou kartu – čitelná specifikace `NF.proposalBranch`.

## 6. Rychlá sada `rychle.test.cjs`

Obsah: 6 testů jádra (hodiny, úložiště bez adaptéru a s chybou, adaptér a záloha jiného schématu, háček změny, `NF.proposalBranch` a `NF.OFF_TEXT` v jádře, bez sítě a DOM), 1 test registru (42/28/171, provozní bez stavu, parametry v mezích `NF.PARAM_BOUNDS`, otisky = zlaté), 4 testy zásad (nepočítá dávku; porce a nikdy „sněz víc“ – i přes všechny zlaté rady; nízká glukóza včetně bloku „zvýšit“; bez výzvy volat) a souběžně tři podsady jako samostatné procesy: `zlate-vystupy.test.cjs`, `obsah-pacienta.test.cjs` (P1–P11), `tokeny.test.cjs`. Bez prohlížeče a bez průchodu tlačítkem Další.

**Doba běhu: 36,8 s** (14 prošlo, 0 selhalo) (měřeno `time node rychle.test.cjs` na tomto počítači; nejdelší je P1–P11, asi 34–37 s, zlaté výstupy asi 30 s, běží souběžně). Rychlá sada je zapojená i do hlavní sady.

## 7. Testy, které čtou soubory o úroveň výš

- `kontrola2-obsah.test.cjs` čte `15-ZDROJ-PRAVDY-MAKETA.md` z `../`, jinak z `predani/zdroj/`.
- `kontrola3-panel.test.cjs` čte generátor `scene-items.cjs` z `../navrhy-designu/04-pohledy-2026-10-05/`, jinak z `predani/zdroj/navrhy-designu/04-pohledy-2026-10-05/`.
- Jiné čtení mimo složku makety v testech není. Ověřeno v kopii, kde je složka makety sama a jmenuje se jinak (`/private/tmp/claude-501/-Users-ngmacminim4pro-Library-CloudStorage-GoogleDrive-rehor-rudolf-gmail-com-M-j-disk-NutriFee-NutriFee-new-look/91a20ff2-da8d-4e57-8d3a-d33240768b1a/scratchpad/solo89/repo/`, nad ní nic): celá hlavní sada **144 prošlo, 0 selhalo** (29 min 12 s), `kontrola2-obsah` 18/0, `kontrola3-panel` 9/0.

## 8. Verze 89

`NF.SCHEMA = 89`; `?v=89` v HTML 22× a v katalogu 5×; `data-version="89"`; `D.build = 'schema-89'`; test verze v `schema84-jadro.test.cjs` (název i tři kontroly). Stavový odstavec SCHEMA 89 je první v `15` odst. 16.

## Testy

Na kopii podle zadání (`/private/tmp/claude-501/-Users-ngmacminim4pro-Library-CloudStorage-GoogleDrive-rehor-rudolf-gmail-com-M-j-disk-NutriFee-NutriFee-new-look/91a20ff2-da8d-4e57-8d3a-d33240768b1a/scratchpad/t89/`, s `15`, `CLAUDE.md` a `navrhy-designu/04-pohledy-2026-10-05` vedle): `node nutrifee-rozhodovaci-maketa.test.cjs` → **144 prošlo, 0 selhalo** (výchozí stav 142/0; +2 nové podsady `zlate-vystupy.test.cjs` a `rychle.test.cjs`). Výstup čten celý, žádný řádek `FAIL`. Běh trval 29 min 21 s (na tomto počítači souběžně s jinou prací; čistá rychlá sada uvnitř běhu 36,8 s).

| Podsada | Výsledek |
|---|---|
| zlate-vystupy.test.cjs (nová) | 9 / 0 |
| rychle.test.cjs (nová) | 14 / 0 |
| tokeny | 7 / 0 |
| obsah-pacienta (P1–P11) | 9 / 0 (140 stavů pacienta) |
| schema84-jadro | 15 / 0 |
| zaverecne80 | 22 / 0 |
| faze2-jadro / faze2-pribeh | 32 / 0, 15 / 0 |
| pravdivost | 4 / 0 |
| kontrola74-obsah / -panel | 19 / 0, 7 / 0 |
| kontrola2-obsah | 18 / 0 |
| kontrola3-obsah / -panel | 14 / 0, 9 / 0 |
| kontrola4-obsah / -panel | 16 / 0, 18 / 0 |
| ukladani | 29 / 0 |
| robustnost | prošlo |

Další kontroly: `node --check` všech skriptů `app/`, `demo/`, testů a generátoru bez chyby; žádný soubor v `app/`, `demo/` ani HTML není prázdný; `zlate-vystupy/generuj.cjs --check` shoda u všech pěti souborů; produkční sestavení bez `demo/` hlídají stávající testy hlavní sady (prošly).

## Kontrola panelu (Playwright, `panel-shoda.cjs`)

Kopie `/private/tmp/claude-501/-Users-ngmacminim4pro-Library-CloudStorage-GoogleDrive-rehor-rudolf-gmail-com-M-j-disk-NutriFee-NutriFee-new-look/91a20ff2-da8d-4e57-8d3a-d33240768b1a/scratchpad/t89/maketa-rozhodovaci` na `http://127.0.0.1:8860/`, Playwright z `/private/tmp/claude-501/-Users-ngmacminim4pro-Library-CloudStorage-GoogleDrive-rehor-rudolf-gmail-com-M-j-disk-NutriFee-NutriFee-new-look/91a20ff2-da8d-4e57-8d3a-d33240768b1a/scratchpad/atlas87/br/node_modules`, spuštěno samostatně po doběhnutí testů (ne souběžně).

| Velikost | Kroky | Zpět | Skoky | `findings` | Selhaná klepnutí | Chyby konzole |
|---|---|---|---|---|---|---|
| 1440 × 900 | 368 | 152 | 32 | **0** | 0 | 0 |
| 390 × 844 (telefon, dotyk) | 368 | 152 | 32 | **0** | 0 | 0 |

Výsledky: `/private/tmp/claude-501/-Users-ngmacminim4pro-Library-CloudStorage-GoogleDrive-rehor-rudolf-gmail-com-M-j-disk-NutriFee-NutriFee-new-look/91a20ff2-da8d-4e57-8d3a-d33240768b1a/scratchpad/atlas87/br/panel-shoda-out-89-1440/1440x900.json` a `/private/tmp/claude-501/-Users-ngmacminim4pro-Library-CloudStorage-GoogleDrive-rehor-rudolf-gmail-com-M-j-disk-NutriFee-NutriFee-new-look/91a20ff2-da8d-4e57-8d3a-d33240768b1a/scratchpad/atlas87/br/panel-shoda-out-89-390/390x844.json`.

## Změněné a nové soubory

- Jádro: `app/core.js` (`NF.config`, `NF.configure`, `NF.storage`, `NF.now`, `NF.load`, `NF.save`, `NF.hooks.change`, `NF.onChange`, `NF.emitChange`, `NF.slots`, `NF.OFF_TEXT`, `NF.OFF_RECORD_ONLY`, `NF.itemRefs`, `NF.previewBest`, `NF.previewQuestions`, `NF.proposalBranch`, `NF.SCHEMA`), `app/screens.js` (alias OFF, `V.preview` volá jádro), `app/screens-clinic.js` (alias `V.proposalBranch`), `app/ui.js` (`NF.proposalBranch`, `NF.slots`).
- Prezentační vrstva: `demo/fixtures.js`, `demo/tour-content.js` (`NF.proposalBranch`, `D.firstQuestion` přes jádro), `demo/guide.js` (slot `itemGuide` zrušen), `demo/results.js` (`fpTrace`), `demo/sync-config.js` (`schema-89`).
- HTML a katalog: `nutrifee-rozhodovaci-maketa.html`, `design-system/index.html`.
- Testy: `nutrifee-rozhodovaci-maketa.test.cjs` (otisk ve stopě, dvě nové podsady), `schema84-jadro.test.cjs` (verze), `kontrola2-obsah.test.cjs`, `kontrola3-panel.test.cjs` (cesty); nové `zlate-vystupy.test.cjs`, `rychle.test.cjs`, `zlate-vystupy/generuj.cjs`, `zlate-vystupy/README.md`, `zlate-vystupy/*.json`.
- Dokumenty: `maketa-rozhodovaci/README.md` (rychlá sada, jádro jako knihovna), `15` odst. 16.

## Co je zvoleno bez dotazu

1. `NF.previewQuestions` / `NF.previewBest` přesunuté do jádra (jinak se příběh bez obrazovek liší v uložené otázce pacienta; bod 1).
2. Otisk ve stopě bez textu průvodce; otisk garanta s průvodcem beze změny; v exportu navíc `fpTrace` (bod 2).
3. Háček `NF.onChange` se volá z `NF.save` (= po každé akci) i při neúspěšném uložení (`saved: false`) a respektuje `NF.muteHooks`; `NF.load` bez úložiště také hlásí `storageOK = false`.
4. Zlaté výstupy bez čísla SCHEMA a bez časů běhu; rady pro 4 jídla × 3 × 3; tabulka větví v kroku 2.
5. Rychlá sada spouští tři podsady souběžně a je zapojená i do hlavní sady (hlavní sada se tím prodlouží asi o minutu, zlaté výstupy a P1–P11 tam běží dvakrát).

## Pro předávku (jiný agent)

- `NF.slots.itemGuide` už neexistuje; věta „text Co schvalujete dodá prezentační vrstva slotem…“ u stopy (SCHEMA 87) neplatí – otisk ve stopě je otisk jádra, garant má `fp` s průvodcem, export obojí (`fp`, `fpTrace`).
- Doporučený první příkaz programátora: `node rychle.test.cjs`; pak `node zlate-vystupy.test.cjs` po každé změně jádra.
