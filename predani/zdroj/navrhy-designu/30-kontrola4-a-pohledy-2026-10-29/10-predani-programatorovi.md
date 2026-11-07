# Předání programátorovi: maketa NutriFee a rozhodnutí garanta (30. 10. 2026, kontrola 4; aktualizováno 1. 11. 2026)

> **1. 11. 2026 (závěrečné ověření záznamu garanta, `navrhy-designu/31-zaverecne-overeni-2026-11-01/01-zaznam-garanta.md`):** odst. 5 přepsán jako přesný algoritmus otisků s testovacími vektory (B4) a doplněn o `fpExtra` (C8) a `shown` (A1); odst. 6 o nová pole exportu (C1, C4, C5, C7); odst. 7 o rozhodnutí nad modelovou verzí příběhu; odst. 8 o pořadí podle `seq` v rámci prohlížeče (B2, C2), `decided_by` podle role (C3) a úplný slovník sloupců (C10).

Dokument pro vývojáře, který podle makety a rozhodnutí garanta staví ostrou aplikaci. Osnova podle `03-predani-programatorovi.md` (odst. 4), doplněná o to, co se 30. 10. 2026 postavilo: otisk znění v každém rozhodnutí (rozhodnutí vlastníka, bod 1), export pro správce (bod 2) a odolné ukládání (nálezy `05-robustnost-bezpecnost.md`). Skutečná jména osob, institucí, výrobců ani produktů tu nejsou.

## 1. Co je zdrojem pravdy (v tomto pořadí)

1. **`15-ZDROJ-PRAVDY-MAKETA.md`**; při rozporu platí **chování makety** `maketa-rozhodovaci/` na gitové značce předávky (`schema-NN`, rozhodnutí vlastníka 30. 10. 2026, bod 1). Dokumenty `00`–`14`, `INSTRUKCE-PROJEKTU-CLAUDE.md`, `CHANGELOG-MIGRACE.md` jsou historie. `navrhy-designu/05-supabase-rozhodnuti-garanta.md` platí jen v odst. 0 (SQL); zbytek je historie.
2. **Testy jako spustitelná specifikace:** `nutrifee-rozhodovaci-maketa.test.cjs` (hlavní, spouští ostatní), `pravdivost.test.cjs` (co obrazovka říká a co dělá zamítnutí), `robustnost.test.cjs`, `kontrola2/3/74-*.test.cjs`, `faze2-*.test.cjs` a **`ukladani.test.cjs`** (záznam rozhodnutí, přihlášení, výsledky, export; simulace serveru bez sítě). Ostrá aplikace má projít stejnými scénáři nad svou doménou.
3. **Rozhodnutí garanta:** export ze „Výsledků garanta“ (odst. 6), nebo pohled `public.garant_stav` (odst. 0.5 v `05-supabase…`). Rozhodnutí jsou **neformální**; pro ostrý provoz se pravidla podepisují znovu (`15` zásada 6).
4. Vzhled: `app/tokens.css` (jediný zdroj hodnot) a katalog `design-system/index.html`.

## 2. Co je jádro a co prezentace

- **`app/` = jádro, přenáší se 1:1 jako specifikace chování.** `core.js` (doména: registr, učení jídel, rady, B-HYPO, návrhy k dávce, plán, stopa, `PARAM_BOUNDS`, **`NF.itemFingerprint`**), `screens.js` (pacient), `screens-clinic.js` (lékař, sestra), `ui.js` (akce), `data/registry.js` (40 položek: 28 klinických, 12 provozních; každá s `version`), `data/catalogs.js` (návyky, 7 pokynů I-*), `data/foods.js`. Jádro síť nevolá (test).
- **`demo/` = prezentace, nepřenáší se:** modelový pacient a příběh, panel a vyprávění, a infrastruktura makety (`auth.js`, `sync.js`, `sync-config.js`, `results.js`) postavená na Supabase s veřejným klíčem. **Není vzorem pro server NutriFee**, ale jeho chování (fronta, pořadí, pravdivý stav) je vzorem pro klienta (odst. 9).
- **Výjimka: `demo/guide.js` je obsahová specifikace.** „Co schvalujete“ a „Co se stane při zamítnutí“ je to, co garant schválil; `ucinek` strojově popisuje, co má aplikace udělat se zamítnutou položkou. Proto je průvodce v otisku (`fpGuide`) a v exportu (`current.guide`).

## 3. Jak číst registr

- Položka: `id` (**nikdy se nemění**; změna = nová verze), `version` (`v1`…; `NF.newVersion` zvyšuje), `cat`, `scope` (`provozni` = neschvaluje nikdo, nemá stav), `title`, `summary`, `detail`, `params`, `labels`, `steps`, `texts`, `lists`, `postup` (větve zvýšit/snížit/ponechat podle bodů, nikdy velikost kroku), `usedBy`. Meze parametrů `NF.PARAM_BOUNDS`. Znění pokynů I-* je v `catalogs.js` (`{v}` = `params.v`).
- Stav a historie: `NF.decideItem` → `NF.applyDecision` → `S.registry.history` (jen přibývá). Zamítnutá položka nepůsobí (`NF.usable` false, `NF.param` vrací výchozí hodnotu z kódu).
- **Výjimky „zamítnutí = záznam nesouhlasu, ne vypnutí“:** C-CILE, K-KRITERIA, Z-GLUKOZA, P-LEKAR (`15` odst. 12).

## 4. Mapa položka → chování v jádře

Tabulka je v `03-predani-programatorovi.md`, odst. 4.4 (vygenerováno z kódu 29. 10. 2026). Před předávkou ji vygenerovat znovu skriptem (zdroj: `NF.usable`, `NF.param`, výskyty `'<ID>'` v `app/`), ne psát ručně.

## 5. Otisk znění (rozhodnutí vlastníka 30. 10. 2026, bod 1; přesný algoritmus 1. 11. 2026, `31-…/01` B4)

Každý řádek `decision` a `note` (a každá položka v řádcích `scene` a ve snímku `summary`) nese `params.ver`:

| pole | význam |
|---|---|
| `version` | `version` položky v `app/data/registry.js` (výchozí `v1`) |
| `fp` | otisk obsahu položky z kódu, `alg: 'core'` (5.2); u řádků z doby před otiskem jádra `alg: 'sync1'` (5.7) |
| `fpGuide` | otisk surových textů průvodce (5.3) |
| `fpCat` | otisk mezí parametrů, znění pokynu a návyků (5.4) |
| `fpExtra` | otisk dalších textů, které garant čte: „V aplikaci: …“, kroky a věta k zamítnutí bezpečnostní položky (5.5; od 1. 11. 2026, starší řádky ho nemají) |
| `alg` | `core` / `sync1`; porovnává se jen otisk stejného algoritmu |
| `shown` | `{ version, fp }` položky, **jak ji garant na kartě viděl** (od 1. 11. 2026, 5.8) |

Otisk se počítá nad položkou **z kódu** (`NF.data.registry()`), ne nad stavem příběhu (scénář 5 zakládá ve stavu modelovou verzi v2 položky R-PORADI). Karty garanta v panelu, zásuvce i souhrnu ukazují znění z kódu (`D.garantView`); co garant opravdu viděl, nese `shown`. Řádky z doby před 30. 10. 2026 otisk nemají → „bez otisku znění“ (ověřit ručně podle `schema` a gitu).

Vše potřebné k přepočtu je v exportu (odst. 6): `items[].id`, `items[].cat` a `items[].current` (pole položky, `guide.co` s dosazenými parametry, `guideRaw`, `bounds`, `instruction`, `habits`, `usedBy`, `steps`, `safety`). Kód makety k tomu není potřeba. **Ověřeno 1. 11. 2026:** samostatný přepočet v Pythonu napsaný jen podle tohoto odstavce a exportu dal 28 z 28 u `fp`, `fpGuide`, `fpCat` i `fpExtra`; v JavaScriptu totéž hlídá `ukladani.test.cjs` (test „31 B4“).

### 5.1 Kanonický JSON `canon(x)` (společný pro všechny otisky)

- `undefined` nebo funkce → `null`.
- `null`, řetězec, číslo, logická hodnota → `JSON.stringify` podle ECMAScriptu: řetězec v uvozovkách; escapují se jen `"` a `\` a řídicí znaky U+0000–U+001F (`\b \f \n \r \t`, ostatní `\u00xx` malými písmeny). Diakritika, „“, pomlčky a emoji zůstávají jako znaky. Číslo nejkratším zápisem `Number.prototype.toString` (`5`, `1.5`, `0.8`; celé číslo bez `.0`).
- Pole → `[` + `canon` prvků oddělené `,` + `]`.
- Objekt → `{` + klíče seřazené vzestupně podle kódových jednotek UTF-16 (u klíčů v datech totéž co podle znaků), vynechané klíče s hodnotou `undefined` nebo funkcí, každý `JSON.stringify(klíč) + ':' + canon(hodnota)`, oddělené `,` + `}`.
- Žádné mezery ani zalomení. `null` uvnitř objektů a polí zůstává.

`hex8(h)` = 8 šestnáctkových číslic malými písmeny, zleva doplněné nulami. Násobení je vždy modulo 2^32 (v JavaScriptu `Math.imul(…) >>> 0`, v jiném jazyce `(h * 0x01000193) & 0xffffffff` nad 64bitovým celým číslem).

### 5.2 `fp`, alg `core` (`NF.itemFingerprint` v `app/core.js`)

```
vstup: položka P (registry.js; v exportu id a cat z items[], ostatní z current)
       C = text „Co schvalujete“ s dosazenými parametry z kódu (5.6), nebo null (export: current.guide.co)
body = {}
pro k v [id, scope, cat, title, summary, detail, text, texts, lists, postup, sestra, params, labels]:
    když P[k] existuje a není null: body[k] = P[k]
s  = canon({ item: body, co: C })
h1 = 0x811c9dc5
h2 = 0x5ad1e806                         # 0x01000193 XOR 0x5bd1e995
pro i = 0 … délka(s) − 1:
    c  = kódová jednotka UTF-16 řetězce s na pozici i (0…65535; ne bajt UTF-8, emoji = dvě jednotky)
    h1 = ((h1 XOR c) × 0x01000193) mod 2^32                     # FNV-1a nad jednotkami UTF-16
    h2 = ((h2 XOR ((c × 31 + i) AND 0xffff)) × 0x01000193) mod 2^32   # NENÍ FNV-1a: jiný základ a míchá pozici i
fp = 'fp-' + hex8(h1) + hex8(h2)
```
Do `fp` nevstupují `usedBy`, `steps`, meze, pokyny ani návyky (ty nesou `fpCat` a `fpExtra`), ani stav, rozhodnutí, poznámka a verze.

### 5.3 `fpGuide`

```
fnv1a_utf8(t): b = bajty UTF-8 řetězce t (dvojice surrogátů = jeden znak, 4 bajty)
               h = 0x811c9dc5; pro každý bajt x: h = ((h XOR x) × 0x01000193) mod 2^32
               výsledek hex8(h)
fpGuide = fnv1a_utf8(canon(G))
```
`G` = **surové** texty průvodce `D.guideRaw[id]` z `demo/guide.js` **před** dosazením parametrů (`{low}` zůstává jako `{low}`), se všemi klíči, které položka má: `proc, jak, kde, co, dopad`, případně `dopadSceny` a `ucinek`. V exportu `current.guideRaw`. (Pozor: `fpGuide` jde přes bajty UTF-8, `fp` přes jednotky UTF-16.)

### 5.4 `fpCat`

```
fpCat = fnv1a_utf8(canon({ bounds: B, instruction: I, habits: H }))
```
- `B` = `NF.PARAM_BOUNDS[id]` z `app/core.js`, nebo `null`. **Bez `PARAM_BOUNDS` otisk nesedí** (sedí jen u položek bez mezí). Export: `current.bounds`.
- `I` = celý záznam z `NF.data.instructions` (`catalogs.js`) s `id` položky, nebo `null`. Export: `current.instruction`.
- `H` = pole záznamů z `NF.data.habits` s `item` = id položky, v pořadí katalogu (může být prázdné `[]`). Export: `current.habits`.

### 5.5 `fpExtra`

```
fpExtra = fnv1a_utf8(canon({ usedBy: P.usedBy nebo null, steps: P.steps nebo null, safety: S nebo null }))
```
`S` = věta k potvrzení zamítnutí bezpečnostní položky `V.SAFETY_ITEMS[id]` z `app/screens-clinic.js` (B-HYPO, R-POKYNY, P-NEMOC). Export: `current.usedBy`, `current.steps`, `current.safety`.

### 5.6 Dosazení parametrů do „Co schvalujete“ (vstup `co` do `fp`)

Zástupné hodnoty podle vzoru `\{(?:([A-Z]-[A-Z0-9-]+):)?([A-Za-z_][A-Za-z0-9_]*)(%|\|\d)?\}`: `{klic}` = `params.klic` téže položky, `{C-CILE:low}` = parametr jiné položky, vždy **z kódu**. Chybí-li parametr, zástupná hodnota zůstane beze změny. Hodnota, která není číslo, se vloží jako text. Číslo: modifikátor `%` → `Math.round(v × 100)` + `' %'`; `|n` → `v.toFixed(n)` s desetinnou čárkou; bez modifikátoru `String(v)` s první tečkou nahrazenou čárkou (`3.9` → `3,9`). Stejně dosazuje `D.guideFill` v `demo/guide.js`; v exportu je výsledek v `current.guide.co`.

### 5.7 `fp`, alg `sync1` (jen starší řádky)

`fp = fnv1a_utf8(canon(O))`, kde `O` má z položky klíče `id, cat, scope, title, summary, detail, usedBy, params, labels, steps, texts, lists, postup, text, lever, kind` (jen existující, `null` zůstává) a navíc `bounds`, `instruction`, `habits` jako v 5.4. Nové řádky ho nemají.

### 5.8 Platnost rozhodnutí pro dnešní znění (`appliesToCurrent`)

- `null`: rozhodnutí nemá `ver.fp`, nebo dnešní otisk nejde spočítat stejným `alg`.
- `false` a `decidedOnModel: true`: `alg = 'core'` a `shown` je, ale `shown.fp ≠ fp` nebo `shown.version ≠ version` – **garant viděl jiné znění, než je v kódu** (modelová verze příběhu). Znění v kódu neschvaloval.
- `true`: dnešní `fp` = `ver.fp` a u `fpGuide`, `fpCat`, `fpExtra` platí „chybí v řádku, nebo se rovná dnešnímu“.
- jinak `false`: „rozhodnuto k předchozímu znění“.

### 5.9 Testovací vektory (hlídá `ukladani.test.cjs`, test „31 B4“)

| vstup | výsledek |
|---|---|
| `fp`: P = `{ id: 'X-TEST', cat: 'rady', title: 'Žluťoučký kůň „úpěl“', summary: null, params: { a: 1.5, b: [1, 'ř'] }, labels: { a: 'hodnota (mmol/l)' } }`, C = `'Schvalujete 1,5 mmol/l.'` | `fp-369fd99c923cdd13` |
| `fp`: P = `{ id: 'X-0' }`, C = null | `fp-868eb1cb58ba14b9` |
| `fp`: P = `{ id: 'X-1', title: 'a😀' }`, C = null | `fp-823559b0623a9309` |
| `fnv1a_utf8(canon({ proc: 'Proč – ž', ucinek: { druh: 'vypne', bezMista: [] } }))` | `24616b68` |
| `fnv1a_utf8('a😀')` | `a0d90531` |
| `fnv1a_utf8('')` / `fnv1a_utf8('a')` | `811c9dc5` / `e40c292c` |

Kanonický řetězec prvního vektoru: `{"co":"Schvalujete 1,5 mmol/l.","item":{"cat":"rady","id":"X-TEST","labels":{"a":"hodnota (mmol/l)"},"params":{"a":1.5,"b":[1,"ř"]},"title":"Žluťoučký kůň „úpěl“"}}`.

Každá publikace dostane gitovou značku `schema-NN` (bod 1). Při publikaci se v `demo/sync-config.js` nastaví `D.build = 'schema-NN+<commit>'` a export ho zapíše do `build.build`; když chybí, export uvede `build.tag = 'schema-NN'` a `build.buildNote` (`31-…/01` C4).

## 6. Export „Výsledky garanta“ (rozhodnutí vlastníka 30. 10. 2026, bod 2)

Jen pro správce, tlačítka **Stáhnout JSON** a **Stáhnout CSV** pod dlaždicemi; z už načtených řádků vybraného účtu, bez sítě (`D.results.exportData(fmt)`).

**JSON** `nutrifee-rozhodnuti-garanta_<účet>_<RRRR-MM-DD>.json`:
- `format: 'nutrifee-garant-export'`, `formatVersion: 1`, `exportedAt`, `exportedBy`, `account { user_id, user_email }`, `rules` (pravidla výkladu: platný stav, pořadí, platnost otisku);
- `build { schema, build, tag, buildNote, registryFp, registryFpInput }`: `build` = `D.build` ze `sync-config.js` (`schema-NN+<commit>`, nastaví se při publikaci), jinak `null` a `buildNote` říká, že sestavení dohledat podle gitové značky `tag` = `schema-NN`; `registryFp` = `fnv1a_utf8(canon([[id, version, fp, fpGuide, fpCat, fpExtra], …]))` přes 28 položek v pořadí `items` (`null` za chybějící otisk);
- `fingerprint { alg, description, other }`: `description` popisuje algoritmus `fp` podle `alg` (`core`, u starších `sync1`), `other` algoritmy `fpGuide`, `fpCat`, `fpExtra` a význam `shown` (shodně s odst. 5);
- `progress { furthestScene, furthestTitle, mainEnd, at, lastScene, lastAt, lastResetAt, summaryConfirmations[] }`: `furthestScene` = **nejvyšší** scéna ze všech řádků `progress` (ne poslední; po odhlášení začíná průchod znovu od 1), `lastScene` = scéna posledního řádku; `summaryConfirmations[]` = `{ at, beforeReset, approved, rejected, pending, noted, total, rejectedIds, pendingIds, items }`, `beforeReset: true` = potvrzení z doby před posledním „Smazat rozhodnutí garanta“; `items` je snímek `{ id, status, note, noteLen, ver }`, kde `note` je jen prvních 200 znaků (celá poznámka je v řádcích decision/note);
- `items[28]`: `id, cat, catLabel, title, state` (approved | rejected | pending), `decision { status, at (účinný čas), clientAt, receivedAt, scene, sceneTitle, where, rowId, schema, decidedBy, ver }`, `note { text, at, firstAt, rowId, kind }` (`at` = poslední řádek s platným textem – u převzaté poznámky čas rozhodnutí; `firstAt` = kdy tento text poprvé vznikl), `appliesToCurrent` (true / false / null) + `appliesToCurrentWhy` + `decidedOnModel` (true = garant rozhodl nad modelovou verzí příběhu, odst. 5.8), `history[]` (všechny řádky decision/note po posledním resetu; `partOfNextDecision` = poznámka spojená s rozhodnutím, M8), `current { version, fp, fpGuide, fpCat, fpExtra, alg, title, scope, summary, detail, usedBy, params, labels, steps, texts, lists, postup, text, sestra, bounds, instruction, habits, safety, guide { proc, jak, kde, co, dopad, dopadSceny, ucinek }, guideRaw }` – `guide` má parametry dosazené z kódu (`guide.co` je vstup `fp`), `guideRaw` jsou surové texty (vstup `fpGuide`), `safety` věta k zamítnutí bezpečnostní položky (vstup `fpExtra`); z `items[].id`, `items[].cat` a `current` jdou všechny otisky přepočítat (odst. 5);
- `scenes[]` (opuštění scén s položkami a jejich otisky), `rows[]` (všechny surové řádky účtu včetně reset, progress, summary).

**CSV** (UTF-8 s BOM, oddělovač `;`, řádek na položku): `id;kategorie;nazev;stav;rozhodnuto_kdy;scena;kde;poznamka;pocet_zmen;schema_rozhodnuti;otisk_rozhodnuti;otisk_dnes;plati_pro_dnesni_zneni;parametry_json;text_pro_pacienta;verze_rozhodnuti;verze_dnes;otisk_pruvodce_rozhodnuti;otisk_pruvodce_dnes;duvod;otisk_katalogu_rozhodnuti;otisk_katalogu_dnes;otisk_dalsich_textu_rozhodnuti;otisk_dalsich_textu_dnes;verze_zobrazena;otisk_zobrazeny;poznamka_vznikla;zapsal` (`otisk_katalogu_*` = `fpCat`, `otisk_dalsich_textu_*` = `fpExtra`, `*_zobrazen*` = `ver.shown`, `zapsal` = `decided_by`). Hodnota začínající `= + - @` dostane úvodní apostrof (tabulkový editor ji nespustí jako vzorec).

## 7. Jak naložit s rozhodnutím garanta

- **Schváleno a `appliesToCurrent = true`:** implementovat přesně v tomto znění a s těmito parametry; v ostré aplikaci nese položka štítek „✓ schváleno“, verzi a otisk a každý výpočet ji zapíše do stopy.
- **Schváleno nad jiným zněním** (`false`) **nebo bez otisku** (`null`): **neimplementovat jako schválené**; položka jde garantovi znovu ke schválení v dnešním znění. Totéž u `decidedOnModel: true` (garant viděl modelovou verzi příběhu, ne znění v kódu; výsledky správce to hlásí štítkem „rozhodnuto nad modelovou verzí příběhu“).
- **Zamítnuto:** chování podle `guide.ucinek` (vypnutí s oznámením na místě, u výjimek záznam nesouhlasu). Položka se nemaže; oprava = nová verze ke schválení.
- **Poznámka:** požadavek na změnu, ne schválená změna; nikdy ji nezapracovat potichu (vlastník z ní udělá novou verzi a garant ji schválí).
- **Nerozhodnuto:** do ostrého provozu nesmí.
- **`scene`, `progress`, `summary`** jsou kontext (kde a kdy garant rozhodoval, zda prošel celou maketu, co potvrdil), ne rozhodnutí.

## 8. Slovník řádků tabulky `garant_rozhodnuti`

| kind | item | status | comment | params |
|---|---|---|---|---|
| decision | id položky | approved / rejected | platná poznámka (nejvýš 4000 znaků) | `{ where, ver, seq, skewMs }`; `commentCut` = původní délka, když se odmítnutá dlouhá poznámka odeslala zkrácená |
| note | id položky | stav garanta v tu chvíli, `null` u nerozhodnuté (i z obrazovky registru; od SCHEMA 83 nové řádky `note` vznikají jen po rozhodnutí, starší s `null` zůstávají platné) | text, `''` = smazání | `{ where, ver, seq, skewMs }`; od SCHEMA 83 (2. 11. 2026) se poznámka ukládá při psaní: řádek po 1 s bez psaní, při opuštění pole a zavření stránky, takže jedna poznámka může mít řadu řádků `note` za sebou |
| scene | `SCENA` | – | – | `{ how: dal/skok/zpet/konec, to, items:[{id,status,note,ver}], pending, seq, skewMs }`; `items` = položky nabídnuté ve scéně **a** položky, o kterých garant ve scéně rozhodl nebo k nim napsal poznámku (i když je zamítnutí jiné položky z nabídky scény odebralo); u příliš velkého řádku `note` zkrácená na 500 znaků + `noteLen` |
| progress | `PRUBEH` | – | – | `{ scene, total, mainEnd, title, summaryConfirmed, seq, skewMs }` |
| summary | `SOUHRN` | – | – | `{ approved, rejected, pending, noted, total, rejectedIds, pendingIds, scene, total_scenes, items:[{id,status,note,noteLen,ver}], seq, skewMs }`; `note` jen prvních 200 znaků |
| reset | `RESET` | – | – | `{ seq, skewMs }` |

`where`: panel | zasuvka | souhrn | registr. Společné sloupce (posílá je klient u všech druhů):

| sloupec | význam |
|---|---|
| `id` | `<klient>:<D|E>-<čas>-<náhoda>`, PK; opakované odeslání → 409 = už uloženo |
| `kind`, `item`, `status`, `comment`, `params` | viz tabulka výše |
| `title` | název položky v době zápisu (u událostí popis: „Průchod maketou“, název scény, „Souhrn rozhodnutí potvrzen“, „Smazání rozhodnutí garanta“) |
| `text`, `off` | nepoužívají se, vždy `null` |
| `decided_by` | role přihlášeného: `garant`, nebo `spravce`, když zapisuje účet s rolí admin (u rozhodnutí i událostí) |
| `model_at` | čas v příběhu makety (ne skutečný) |
| `at` | hodiny prohlížeče (informace; řadí se podle odst. níže) |
| `scene`, `scene_title` | scéna (číslo od 1 a název), ve které garant byl. U rozhodnutí z obrazovky registru (`where: registr`) je to scéna, **ze které do registru odešel**, ne místo rozhodnutí – to říká `params.where` |
| `schema` | `NF.SCHEMA` sestavení, ve kterém zápis vznikl |
| `client` | identifikátor prohlížeče (localStorage; dvě karty téhož prohlížeče sdílejí `client` i řadu `seq`) |
| `note` | popisek sestavení (`D.syncLabel`), obvykle `''` |
| `user_id`, `user_email`, `received_at` | plní spouštěč na serveru (klient posílá, platí hodnota spouštěče) |

DDL, spouštěč, CHECK, RLS a pohled: `05-supabase-rozhodnuti-garanta.md`, odst. 0.

**Pořadí řádků (všude stejně: klient `D.sync.sortRows`, výsledky správce, export, pohled `garant_stav`; `31-…/01` B2, C2):**
1. Účinný čas řádku `eff = min(at + params.skewMs, received_at)` (`skewMs` chybí = 0).
2. Řetězec = řádky téhož účtu a prohlížeče (`user_id` + `client`) s `params.seq`. Uvnitř řetězce rozhoduje **jen `seq`** (monotónní v localStorage prohlížeče); odhad posunu hodin se mezi zápisy mění a účinný čas by pořadí mohl obrátit.
3. Klíč řádku `k`: v řetězci průběžné maximum `eff` podle `seq` (nikdy neklesne), mimo řetězec (bez `seq` nebo `client`) `eff`.
4. Řazení podle `k`, při shodě `client` (podle kódových jednotek), `seq` (chybějící = −1), `received_at`, `id`.

**Platný stav:** vzít řádky po posledním `reset` v tomto pořadí; stav = poslední `decision`, poznámka = text posledního `decision`/`note`. Poznámka, po které do 10 s přišlo rozhodnutí téže položky se stejným textem, je jeho součást (v maketě se nová taková dvojice ani neodešle – jde jen rozhodnutí). **Zobrazení historie (SCHEMA 83):** po sobě jdoucí řádky `note` téže položky, každý do 2 min od předchozího, ukáže historie (karta garanta, registr, výsledky správce) jako jednu řádku s posledním zněním a počtem úprav; platný stav, export ani `firstAt` se tím nemění, žádný řádek se nemaže.

## 9. Ukládání v maketě (vzor pro klienta ostré aplikace)

Fronta v `localStorage` (`nutrifee-sync-queue`) čtená a zapisovaná vždy čerstvě (dvě karty se nepřepíší); opakování 2, 5, 15, 30, 60 s a pak každou minutu, při návratu na kartu a po `online`; časový limit 15 s; při zavření karty `keepalive` a dotaz prohlížeče; trvale odmítnutý řádek (400/403/413/422) stranou v `nutrifee-sync-dead` a fronta jde dál; obnova deníku ze serveru při startu, po přihlášení, při návratu na kartu a po odeslání fronty, čtení po stránkách; vypršení přihlášení nic nesmaže, po novém přihlášení nejdřív odeslat, pak obnovit; jiný účet na stejném prohlížeči cizí frontu neposílá ani nezahazuje. Pravdivý stav každého záznamu: `D.sync.state(sid)` = `server` | `local` | `rejected`. Doporučení pro ostrou aplikaci (úložiště s transakcemi, dva časy, identita ze serveru, MFA, testy RLS v CI…) jsou v `05-robustnost-bezpecnost.md`, odst. 3.

## 10. Co se v ostré aplikaci mění oproti maketě

- Server NutriFee místo Supabase a prohlížeče; registr je na serveru jako data s verzemi a otisky (tentýž `NF.itemFingerprint`), ne v kódu.
- Schválení je **podpis garanta** nad konkrétní verzí a otiskem; historie jen přibývá.
- Hlavičky CSP (včetně `frame-ancestors`), `Referrer-Policy`, `Permissions-Policy` posílá server.
- Modelové role a syntetická data (`demo/fixtures.js`) odpadají.

## 11. Otevřené úkoly ostré aplikace zapsané v `15`

1. Export ze senzoru: pacient ho před kontrolou udělá ve webovém rozhraní výrobce senzoru a pošle do ordinace (rozhodnutí 30. 10. 2026, bod 5); převodníky exportů do jednotného tvaru; report výslovně řekne, když noční hodnoty chybí.
2. Server NutriFee a DPIA (`navrhy-designu/14-ucel-urceni-a-dpia-2026-10-18.md`).
3. Bezpečnostní hlavičky posílané serverem.
4. Nové podepsání pravidel pro ostrý provoz.
5. Protokol studie: během studie jen vypnutí položky (garant navrhuje, výrobce provádí v řízení změn; rozhodnutí 30. 10. 2026, bod 11), opravy až po období.

## 12. Kontrolní seznam předávky

- [ ] Gitová značka `schema-NN` na publikované verzi, kterou garant viděl; tabulka SCHEMA → commit v `15` odst. 16; v `demo/sync-config.js` `D.build = 'schema-NN+<commit>'`.
- [ ] Otisky z exportu přepočítané podle odst. 5 (testovací vektory 5.9 sedí); žádná položka s `decidedOnModel: true` se neimplementuje jako schválená.
- [ ] SQL z `05-supabase…` odst. 0 spuštěné vlastníkem; ověřovací dotazy (0.6) bez nálezu; registrace vypnutá; Security Advisor bez chyb.
- [ ] Export JSON a CSV ze „Výsledků garanta“; každá položka buď „platí pro dnešní znění“, nebo vrácená garantovi.
- [ ] Testy prošly (celý výstup, ne `tail`), včetně `ukladani.test.cjs`; žádný soubor `app/`, `demo/` ani HTML není prázdný.
- [ ] Bez skutečných jmen osob, institucí, výrobců a produktů v předávaných souborech.
