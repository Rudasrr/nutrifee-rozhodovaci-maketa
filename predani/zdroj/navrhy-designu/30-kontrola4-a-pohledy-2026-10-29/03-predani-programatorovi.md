# Kontrola 4 · pohled 03: záznam rozhodnutí garanta a předání programátorovi (29. 10. 2026, SCHEMA 77)

Požadavek vlastníka: *„Maketa musí dokonale zaznamenávat rozhodnutí garanta tak, ať si je může převzít programátor a na jejich základě dostavět ostrou aplikaci.“*

Pohled vývojáře, který má podle makety a rozhodnutí garanta postavit ostrou aplikaci. V maketě se nic neměnilo. Čteno: `CLAUDE.md`, `15` (odst. 2, 6, 6a, 12–14, 16–18), `navrhy-designu/05-supabase-rozhodnuti-garanta.md`, `app/core.js` (registr, `decideItem`, `applyDecision`, `newVersion`, `PARAM_BOUNDS`), `app/data/registry.js`, `app/data/catalogs.js`, `app/ui.js` (registr), `demo/sync.js`, `demo/sync-config.js`, `demo/auth.js`, `demo/results.js`, `demo/presenter.js` (deník garanta, scény, průchod, souhrn), `demo/guide.js`. Pro srovnání verzí: publikační kopie `~/Documents/Nutrifee/nutrifee-rozhodovaci-maketa` (bez `git fetch`, jen místní stav).

**Souhrn: A 1 · B 5 · C 7.** Zápis rozhodnutí je odolný (fronta, F5, výpadek, opakované odeslání bez duplicit, obnova na jiném zařízení) a konečný stav položek jde z řádků zrekonstruovat. **Z řádků ale nejde poznat, jaké znění a jaké parametry položky garant schválil** (A1). Mezi publikovanou verzí a zdrojem pravdy se přitom liší 27 z 28 klinických položek. Pro předání chybí export, který by spojil rozhodnutí s plným zněním položek (B1). Pořadí řádků stojí jen na hodinách prohlížeče (B2).

---

## 1. Metoda: simulace v Node

Skript `03-simulace-zaznamu.cjs` (v této složce) načte všechny `<script>` z `nutrifee-rozhodovaci-maketa.html` do `vm` a místo `fetch` dosadí falešný server Supabase. Server dělá to, co skutečný: primární klíč `id` (duplicita → 409 pro celou dávku), RLS `user_id = auth.uid()` (403), `user_email` doplní z tokenu, `received_at` je čas serveru. Pro sloupec `item` volitelně vynucuje `not null` jako DDL v `05`. Výpadek sítě se simuluje jako `TypeError('Failed to fetch')`, ztracená odpověď tak, že server řádek uloží a klient dostane chybu. `Date` je řízený, každé kliknutí posune hodiny o 7 s. Žádná síť se nevolá.

```
cd navrhy-designu/30-kontrola4-a-pohledy-2026-10-29
node 03-simulace-zaznamu.cjs ../../maketa-rozhodovaci            # item NOT NULL (podle DDL v 05)
NOTNULL=0 node 03-simulace-zaznamu.cjs ../../maketa-rozhodovaci  # item smí být null
```

Průchod: zařízení A (garant) → scéna 3: K-KRITERIA schválit s poznámkou · C-CILE zamítnout s poznámkou · C-CILE změnit na schválit · R-NAVYKY jen poznámka · C-CILE smazat poznámku → výpadek: R-REAKCE zamítnout, R-SKORE schválit s poznámkou → **F5 během výpadku** → síť zpět, ale **ztracená odpověď** (server uložil, klient neví) → opakované odeslání → registr mimo příběh (lékař → Schvalovací registr: D-POSTUP schválit, S-SILNA jen poznámka) → 40× Dál s rozhodnutím nabídnutých položek → souhrn „Potvrdit přesto“ → dvě rozhodnutí v téže milisekundě → **čisté zařízení B, přihlášení, `restore`** → porovnání stavu A, B a rekonstrukce z řádků (`D.resultsState` = logika správce) → reset → nové rozhodnutí → zařízení C s hodinami o 2 h pozadu.

### Výsledky

| Zkouška | Výsledek |
|---|---|
| Úplnost řádku `decision` | `id, kind, item, title, status, params:{where}, comment, decided_by, model_at, at, scene, scene_title, schema:77, client, note, user_id, user_email` (+ `received_at` ze serveru). **`text: null`, `off: null`, žádná verze ani otisk položky.** |
| Poznámka bez rozhodnutí (panel) | `kind note`, `status null` u nerozhodnuté položky ✓; smazání poznámky = `note` s `comment ''` ✓ |
| Změna rozhodnutí | každý klik = nový řádek, historie úplná ✓ |
| Výpadek | 2 řádky ve frontě, `lastErr = Failed to fetch`, lišta „neuloženo: 2“ ✓ |
| F5 během výpadku | fronta (2) i deník garanta (7) přežijí, stav položek beze změny ✓ |
| Ztracená odpověď → opakované odeslání | 409 → dávka po řádcích → oba 409 → fronta 0; **0 duplicit** (server 1× R-REAKCE) ✓ |
| Rozhodnutí z obrazovky Registr | `decided_by: 'DEMO-L01'` místo `garant`, `params: null` (chybí `where: registr`), **`note` u nerozhodnuté S-SILNA nese `status: 'approved'`**, maketa přitom ukazuje „ke schválení“ (B3) |
| Kroky příběhu (Dál) | žádný řádek `decision` ani `note` za příběh ✓; řádky `scene` (7) a `progress` (8) vznikají ✓ |
| Souhrn | `summary` s počty a `rejectedIds`, `pendingIds`; bez snímku poznámek a otisků (C1) |
| Dvě rozhodnutí v téže ms | stejné `at`, pořadí rozhodne jen `received_at`, které klient ani správce nečte (B2) |
| Rekonstrukce A ↔ B ↔ řádky | 28 položek: stav i poznámka shodné na A, B i z řádků ✓ (jediný rozdíl: `NF.itemNote` na A ukazuje modelovou poznámku příběhu u R-PORADI, C7) |
| Reset (DDL `item not null`) | řádek `reset` s `item: null` → **HTTP 400, fronta zablokovaná**; další rozhodnutí se už neodešle (B4) |
| Reset (`item` smí být null) | projde; stav po resetu správně ✓ |
| Hodiny zařízení o 2 h pozadu | poslední klik („schválit“ C-CILE) dostal `at` před resetem → **na novém zařízení je položka „zamítnuto“** a poslední rozhodnutí se při rekonstrukci zahodí (B2) |

**Odpovědi na otázky úkolu:** Duplicity ne. Ztráty ne, s výjimkou B4 (zablokovaná fronta) a vědomého „Odhlásit a zahodit neuložené“. Pořadí je správné, dokud mají zařízení přesné hodiny (B2). Konečný stav každé položky jde z řádků zrekonstruovat jednoznačně (poslední `decision` po posledním `reset`, poznámka z posledního `decision`/`note`). **Co přesně garant schválil, z řádků zrekonstruovat nejde** (A1).

---

## 2. Nálezy

### A1: Rozhodnutí není svázané se zněním, parametry ani verzí položky

**Důkaz.**
- `demo/sync.js:23` (`record`): řádek nese `title` a `schema: NF.SCHEMA`, ale `params: d.where ? { where } : null, text: null, off: null`. Parametry, texty, větve postupu ani verze položky se nezapíšou. Sloupce `text` a `off` jsou v tabulce, ale vždy prázdné.
- `app/data/registry.js` nemá u žádné položky pole `version` (0 výskytů). Jádro proto všem dává `'v1'` (`core.js:283`, `316`), i když se znění od první verze mnohokrát změnilo.
- **Číslo SCHEMA verzi neurčuje jednoznačně.** V publikační kopii nesou SCHEMA 57 dva commity (`89852c5`, `bebb639`). Pro SCHEMA 72–77 tam není žádný commit: místní kopie je na `c68b075` (SCHEMA 71, 27. 10.), Disk je na 77. Test hlídá jen shodu `NF.SCHEMA` a `?v=`, ne to, že se při změně znění položky zvýší SCHEMA.
- **Mezi SCHEMA 71 (publikovaná podle místní kopie) a 77 (zdroj pravdy) se liší 27 z 28 klinických položek.** U 16 z nich jde o věcnou změnu: parametry, texty pro pacienta, větve postupu nebo znění pokynu v `catalogs.js` (R-REAKCE, R-SKORE, R-PORCE, R-DOPLNEK, R-PORADI, R-PROCHAZKA, D-PRAND, D-POSTUP, B-HYPO, I-HYPO, I-MENE, I-NEVIM, I-NEMOC-JIDLO, I-VYSOKA, I-KONTAKT, S-SEMAFOR). Zbytek jsou souhrny a popisy, tedy přesně to, co garant čte. Rozhodnutí „D-POSTUP schváleno, schema 71“ tedy schvaluje jiné větve postupu, než má zdroj pravdy.
- Co garant k položce četl, není jen v registru. Texty pokynů I-* a jejich meze jsou v `app/data/catalogs.js`, meze parametrů v `NF.PARAM_BOUNDS` (`core.js:459`), oddíly průvodce „Co schvalujete“ a „Co se stane při zamítnutí“ v `demo/guide.js`. Nic z toho se neverzuje ani neotiskuje.
- Výsledky správce (`results.js:204` `itemTitle`) k řádku dosadí **dnešní** název z dnešního registru. Starší rozhodnutí tak vypadá, jako by se týkalo dnešního znění.

**Proč A.** Programátor dostane „schváleno“, ale neví čeho. Zásada 4 (každý výpočet a text nese schválenou položku) se pak v ostré aplikaci nedá doložit.

**Oprava (tabulka beze změny, vše do `params` jsonb).**
1. **Otisk položky v jádře:** `NF.itemFingerprint(id)` = krátký deterministický hash (např. FNV-1a 32 bitů, hex) kanonického JSON (seřazené klíče) z `{ id, title, summary, detail, params, labels, steps, texts, lists, postup, scope, bounds: NF.PARAM_BOUNDS[id], instruction: záznam z NF.data.instructions, habits: návyky s item === id }`, bez `status`, `decided*` a `guide`. Patří do `app/core.js`, protože ostrá aplikace potřebuje tentýž otisk.
2. **Otisk průvodce v `demo/sync.js`:** `guideHash` z `D.guide[id]`, tedy z toho, co garant četl jako „Co schvalujete“.
3. **`record` zapíše** `params: { where, ver: { schema, version: r.version || 'v1', hash, guideHash, build } }`. `build` je značka publikace (viz bod 5). Totéž dostanou položky v řádcích `scene` a snímek v `summary` (C1).
4. **Pole `version` v registru** (`'v1'` u všech) a soubor `app/data/registry.lock.json` { id: { version, hash } }. Nový test: když se hash položky liší od zámku a `version` se nezvýšila, test selže. Tím se změna znění nedá provést potichu.
5. **Každou publikaci označit gitovou značkou** `schema-77` (a `D.build = 'schema-77+<krátký commit>'` v `sync-config.js` při publikaci). Do `15` odst. 16 zapsat tabulku SCHEMA → commit.
6. Export (B1) porovná `ver.hash` z rozhodnutí s otiskem dnešní položky. Výsledek je „platí pro dnešní znění“, nebo „rozhodnuto nad jiným zněním (build …), znovu ke schválení“.

---

### B1: Chybí export rozhodnutí spojený s plným zněním položek

**Důkaz.** `demo/results.js` jen zobrazuje (záložky „Po scénách“ a „Registr“); nic se nedá stáhnout. Programátor bez účtu správce rozhodnutí neuvidí. Kdo je chce předat, musí stáhnout CSV ze Supabase (Table Editor), vytáhnout `registry.js`, `catalogs.js` a `guide.js` z gitu správné verze a spojit je ručně. Jakou verzi vzít, nejde poznat (A1).

**Rozpor v `15`.** Odst. 12 říká „lze kdykoli změnit, export není“ a o dvě věty dál „Historie jen přibývá …; export JSON“. Odst. 14 říká „export JSON zrušen 7. 10. 2026“ a v seznamu zavrženého (odst. 18) stojí „Export souborů (stopa, registr) zrušen jako zbytečný“.

**Pozor na zavržení.** Export zavrhl vlastník 7. 10. 2026 jako zbytečný. Šlo o export pro uživatele makety, protože data se od té doby ukládají do Supabase. Předání programátorovi je nový důvod: spojit rozhodnutí se zněním na serveru nejde, protože registr žije v kódu, ne v databázi. **Vlastník musí rozhodnout, zda zavržení přebije** (odst. 5 níže). Návrh: export jen pro správce v „Výsledcích garanta“, viz odst. 3.

---

### B2: Pořadí řádků stojí jen na hodinách prohlížeče

**Důkaz.** `at` = `new Date().toISOString()` na klientovi (`sync.js:24`, `79`). Řadí se podle něj restore (`sync.js:69` `order=at.asc`, `presenter.js:48`), výsledky správce (`results.js:154` `byAt`) i `afterReset` (`sync.js:84–86`). Sloupec `received_at` (čas serveru, v DDL v `05`) nikdo nečte a není jisté, že v živé tabulce je.
- V simulaci mají dvě rozhodnutí v téže milisekundě shodné `at` a o „posledním“ pak rozhoduje náhodné pořadí z Postgresu.
- Zařízení s hodinami o 2 h pozadu: garantův poslední klik dostal `at` dřív než starší kliky z jiného zařízení i dřív než reset. Na novém zařízení je proto C-CILE „zamítnuto“, ačkoli poslední rozhodnutí bylo „schválit“.

**Oprava.** (a) `params.seq` = rostoucí pořadové číslo záznamu v rámci `client` (uložené v localStorage vedle fronty). (b) `params.skewMs` = posun hodin klienta proti hlavičce `Date` odpovědi serveru, změřený při každém úspěšném odeslání. (c) Řadit podle `at + skewMs`, pak `seq`, pak `received_at`, a to všude stejně (restore, výsledky, export, SQL v předávce). (d) Při posunu nad 2 min ukáže lišta garantovi „hodiny počítače nejdou přesně“. Klinicky nejde o nic, ale garant si pak rozhodnutí ověří.

---

### B3: Řádky z obrazovky „Schvalovací registr“ porušují popsaný kontrakt

**Důkaz.** `app/ui.js` `regDecide` a `regNote` volají `NF.decideItem` bez `opts.garant`, `where` a `status`. Výsledek:
- `decided_by: 'DEMO-L01'` (modelový lékař) místo `garant`. Programátor uvidí dva autory.
- `params: null`. Mapa `WHERE` v `results.js:151` přitom zná `registr`, jen ji nikdo nevyplní.
- **`note` u nerozhodnuté položky nese `status: 'approved'`.** Stav se bere z výchozího `r.status` registru (`core.js:263`, výchozí stav ze seed je „approved“), ne z deníku garanta. `15` zásada 6 přitom říká: „`status` = stav v tu chvíli, `null` u nerozhodnuté“. Výsledky správce to nezkreslí (stav berou jen z `decision`), ale kdo čte surové řádky nebo dotaz z `05` odst. 3, uvidí „approved“ u položky, o které garant nerozhodl.

**Oprava v `demo/sync.js:record`, bez zásahu do jádra.** U `kind === 'note'` vzít stav z deníku garanta (presenter vystaví `D.gStatus(id)`), chybějící `where` doplnit z presenteru (`whereCtx`, vystavit jako `D.whereCtx`) a `decided_by` u přihlášeného garanta sjednotit na `garant`. Test: rozhodnutí a poznámka z registru dají řádek se `status null` a `where: registr`.

---

### B4: Jeden trvale odmítnutý řádek zablokuje celou frontu (konkrétně: řádek `reset`)

**Důkaz.** `flush` (`sync.js:56–64`) posílá vždy prvních 20 řádků fronty. Při jiné chybě než 401 nebo 409 (`sync.js:51`) dávka zůstane na začátku fronty a všechno za ní čeká. Jedinou cestou ven je „Odhlásit a zahodit neuložené“, které smaže i platná rozhodnutí. Konkrétní spouštěč: `garantReset` zapíše `D.sync.event('reset', null, …)`, tedy `item: null` (`presenter.js:225`), kdežto DDL v `05` má `item text not null`. V simulaci s `not null` vrátí server 400 a následující rozhodnutí se už neodešle. Tlačítko „Smazat rozhodnutí garanta“ má jen správce (`presenter.js:1360`), takže dnes to postihne účet správce, ne garanta. Mechanismus ale platí pro každý řádek, který server trvale odmítne (403 po změně role, 400 po změně tabulky).

**Ověřit v Supabase (SQL Editor):** `select column_name, is_nullable from information_schema.columns where table_name = 'garant_rozhodnuti';`

**Oprava.** (a) `item: 'RESET'` podobně jako `SCENA`, `SOUHRN`, `PRUBEH`. (b) Řádek, který server odmítne trvale (4xx kromě 401 a 409), přesunout do odložené fronty `nutrifee-sync-rejected`, poslat zbytek a v liště ukázat „N záznamů server odmítl“ s důvodem. Nic se nezahazuje.

---

### B5: Popis tabulky a pravidel pro programátora je zastaralý nebo roztroušený

**Důkaz.** DDL v `05` odst. 1 má `kind decision | comment`, `status approved | edited | rejected`, politiku `insert to anon with check (true)` a chybí v něm `user_id` a `user_email`. Skutečná pravidla RLS jsou jen jako věta v `05` odst. 4 a v `15` zásadě 6. Druhy řádků `note`, `scene` a `reset` popisuje jen `15` zásada 6 a hlavička `sync.js`. Dotaz na poslední stav v `05` odst. 3 nepočítá s resetem ani s poznámkami.

**Oprava.** Do předávky dát skutečné DDL a politiky vytažené ze Supabase (`pg_dump --schema-only -t public.garant_rozhodnuti` nebo `select * from pg_policies where tablename = 'garant_rozhodnuti'`), slovník druhů řádků (odst. 4 níže) a dotaz SQL z odst. 3.3. `05` označit jako historii.

---

### C (méně závažné)

- **C1 · Potvrzení souhrnu nenese snímek.** `summary.params` má jen počty a `rejectedIds` a `pendingIds` (`presenter.js:959`), bez poznámek a otisků. Co garant potvrzoval, jde odvodit z řádků před `summary.at`, ale jen se spolehlivým pořadím (B2). Návrh: `params.items: [{ id, status, note, ver }]`.
- **C2 · Rozpor v `15` o exportu** (odst. 12 a 14, viz B1). Při rozhodnutí o B1 sjednotit.
- **C3 · Restore potichu zahodí řádky položek, které v registru nejsou** (`presenter.js:47` `NF.item(S(), d.item)`). Po přejmenování id položky by se rozhodnutí na jiném zařízení neobnovilo; na serveru zůstane. Pravidlo pro programátora: id položky se nikdy nemění, změna = nová verze.
- **C4 · Rozepsaná poznámka (koncept) se neposílá**, dokud garant neopustí pole nebo nerozhodne (`presenter.js:162–170`). Na jiném zařízení chybí. Záměr podle `15` odst. 12, jen ho uvést v předávce.
- **C5 · Čtení bez stránkování:** `limit=5000` v `restore` i ve výsledcích (`sync.js:69`, `results.js:141`). Na maketu stačí, export by měl stránkovat přes `Range`.
- **C6 · Obsah, který garant schvaluje, je zčásti v `demo/`.** Oddíly „Co schvalujete“ a „Co se stane při zamítnutí“ a strojový popis účinku zamítnutí `ucinek` jsou v `demo/guide.js`, tedy v prezentační vrstvě. Produkční sestavení je nemá. Pro programátora jsou ale specifikace: `ucinek` říká, co má ostrá aplikace udělat se zamítnutou položkou. Předávka je musí uvést jako zdroj požadavků, ne jako prezentaci.
- **C7 · Stav registru v maketě míchá modelové kroky příběhu.** Na zařízení A ve finále ukazuje `NF.itemNote('R-PORADI')` modelovou poznámku scénáře 5 („Upřesněn text…“), kterou garant nenapsal. Je to záměr („model (příběh)“, `15` odst. 13). Pro programátora platí: **pravdou o rozhodnutí garanta jsou řádky na serveru (nebo deník `nutrifee-garant`), nikdy `S.registry` makety.**

---

## 3. Návrh exportu „pro programátora“

### 3.1 Kde

`demo/results.js`, `panelInner`, hned pod dlaždicemi (rozhodnuto, schváleno, zamítnuto, s poznámkou), jen když jsou řádky načtené a vybraný garant:

```js
'<div class="actions">' + btn('Stáhnout pro programátora · JSON', 'resultsExport', 'json', 'sm') + btn('CSV', 'resultsExport', 'csv', 'sm quiet') + '</div>'
```

Akce `NF.demoActions.resultsExport` (jen `D.auth.role() === 'admin'`) složí soubor z `forAccount(rows, who)`, `NF.garantItems(s)`, `NF.data.instructions`, `NF.data.habits`, `NF.PARAM_BOUNDS`, `D.guide` a stáhne ho přes `Blob` a `a[download]`. CSP stahování z `blob:` nebrání, síť se nevolá. Jádro `app/` se nemění, kromě `NF.itemFingerprint` z A1. Test: export z řádků simulace má 28 položek, stav každé se rovná `D.resultsState` a otisk se shoduje s otiskem dnešní položky.

### 3.2 Formát JSON `nutrifee-rozhodnuti-garanta_<účet>_<RRRR-MM-DD>.json`

```json
{
  "format": "nutrifee-garant-export", "formatVersion": 1,
  "exportedAt": "2026-10-29T14:02:11Z", "exportedBy": "<e-mail správce>",
  "build": { "schema": 77, "build": "schema-77+abc1234", "registryHash": "…" },
  "account": { "user_id": "…", "user_email": "…" },
  "rules": "Platný stav = poslední decision po posledním reset (řazeno at+skewMs, seq, received_at); poznámka = poslední decision/note. Neformální rozhodnutí k maketě; pro ostrý provoz se pravidla podepisují znovu.",
  "progress": { "furthestScene": 26, "mainEnd": 26, "summaryConfirmations": [ { "at": "…", "approved": 9, "rejected": 1, "pending": 18 } ] },
  "items": [
    {
      "id": "D-POSTUP", "cat": "davka", "catLabel": "Signály k dávce", "title": "…",
      "state": "approved",
      "decision": { "status": "approved", "at": "…", "scene": 22, "sceneTitle": "…", "where": "panel", "rowId": "g-…:D-…", "ver": { "schema": 71, "version": "v1", "hash": "9f1c…", "guideHash": "…" } },
      "note": { "text": "…", "at": "…", "rowId": "…" },
      "appliesToCurrent": false,
      "appliesToCurrentWhy": "rozhodnuto nad buildem schema-71; dnešní otisk 3b70…; znovu ke schválení",
      "history": [ { "at": "…", "kind": "decision", "status": "rejected", "comment": "…", "scene": 22, "where": "panel", "ver": { } } ],
      "current": {
        "version": "v1", "hash": "3b70…",
        "summary": "…", "detail": "…", "usedBy": "…",
        "params": { }, "labels": { }, "steps": { }, "bounds": { },
        "texts": { }, "lists": { }, "postup": { },
        "instruction": { "text": "…{v}…", "unit": "min", "min": 15, "max": 240 },
        "habits": [ ],
        "guide": { "proc": "…", "jak": "…", "kde": "…", "co": "…", "dopad": "…", "dopadSceny": [ ], "ucinek": { } }
      }
    }
  ],
  "scenes": [ { "scene": 3, "title": "…", "at": "…", "how": "dal", "items": [ { "id": "K-KRITERIA", "status": "approved", "note": "n1" } ] } ],
  "rows": [ "…všechny surové řádky účtu včetně reset, progress, summary…" ]
}
```

`appliesToCurrent` je `true` jen tehdy, když se `decision.ver.hash` rovná `current.hash`. U dnešních řádků bez `ver`, tedy před opravou A1, je `null` s vysvětlením „rozhodnutí nenese otisk; build podle schema N, ověřte ručně“.

### 3.3 CSV (jeden řádek na položku; UTF-8 s BOM, oddělovač `;` pro české Excely)

`id;kategorie;nazev;stav;rozhodnuto_kdy;scena;kde;poznamka;pocet_zmen;schema_rozhodnuti;otisk_rozhodnuti;otisk_dnes;plati_pro_dnesni_zneni;parametry_json;text_pro_pacienta`

Do doby, než bude tlačítko, poslouží vlastníkovi dotaz SQL (Supabase SQL Editor), bez úpravy kódu:

```sql
with r as (select * from public.garant_rozhodnuti where user_email = 'EMAIL-GARANTA'),
     rs as (select max(at) t from r where kind = 'reset'),
     live as (select r.* from r, rs where r.kind in ('decision','note') and (rs.t is null or r.at > rs.t)),
     d as (select distinct on (item) item, status, at, scene, scene_title, params->>'where' kde, schema
           from live where kind = 'decision' order by item, at desc, received_at desc),
     n as (select distinct on (item) item, comment, at from live order by item, at desc, received_at desc)
select coalesce(d.item, n.item) item, coalesce(d.status, 'ke schválení') stav, d.at rozhodnuto, d.scene, d.scene_title, d.kde, n.comment poznamka, d.schema
from d full join n on n.item = d.item order by 1;
```

Znění položek k tomu dodá jen git (registr podle `schema`), a to jen tehdy, když SCHEMA určuje commit jednoznačně (A1, bod 5).

---

## 4. Návrh dokumentu „Předání programátorovi“ (osnova s obsahem)

### 4.1 Co je zdrojem pravdy (v tomto pořadí)
1. **`15-ZDROJ-PRAVDY-MAKETA.md`**. Při rozporu platí **chování makety** `maketa-rozhodovaci/` na značce předávky (rozhodnutí vlastníka 15. 10. 2026). Dokumenty `00`–`14`, `INSTRUKCE-PROJEKTU-CLAUDE.md`, `CHANGELOG-MIGRACE.md` a `05` jsou jen historie.
2. **Testy jako spustitelná specifikace:** `nutrifee-rozhodovaci-maketa.test.cjs` (hlavní, spouští i ostatní), `pravdivost.test.cjs` (T1–T4: co obrazovka říká a co dělá zamítnutí), `robustnost.test.cjs`, `kontrola2/3/74-*.test.cjs`, `faze2-*.test.cjs`. Ostrá aplikace má projít stejnými scénáři nad svou doménou.
3. **Rozhodnutí garanta:** export z odst. 3 (nebo tabulka `garant_rozhodnuti`). Jsou **neformální**; pro ostrý provoz se pravidla podepisují znovu (`15` zásada 6) a obojí se nemíchá.
4. Vzhled: `app/tokens.css` (jediný zdroj hodnot) a katalog `design-system/index.html`.

### 4.2 Co je jádro a co prezentace
- **`app/` = jádro, přenáší se 1:1 jako specifikace chování.** `core.js` obsahuje doménu: registr, učení jídel, rady, bezpečnostní větev B-HYPO, návrhy k dávce, plán, stopu (`NF.log`) a `PARAM_BOUNDS`. `screens.js` je pacient, `screens-clinic.js` lékař a sestra, `ui.js` akce. V `data/` je `registry.js` (40 položek: 28 klinických, 12 provozních), `catalogs.js` (návyky, 7 pokynů I-*) a `foods.js`. Jádro nevolá síť (test). Bez `demo/` startuje prázdné a `NF.seed` naplní katalogy.
- **`demo/` = prezentace, nepřenáší se:** modelový pacient a příběh (`fixtures.js`, `tour-content.js`, `scene-items.js`), panel a vyprávění (`presenter.js`, `explain.js`, `intro.js`) a infrastruktura makety (`auth.js`, `sync.js`, `sync-config.js`, `results.js`). Ta je postavená na Supabase s veřejným klíčem a **není vzorem pro ostrý server NutriFee**.
- **Výjimka: `demo/guide.js` je obsahová specifikace** (C6). Oddíly „Co schvalujete“ a „Co se stane při zamítnutí“ jsou to, co garant schválil. `ucinek` strojově popisuje, co má aplikace udělat se zamítnutou položkou (vypne / nesouhlas, oznámení na místě, co zmizí a co musí zůstat). Hlídá to `kontrola2-obsah.test.cjs`.

### 4.3 Jak číst registr
- Položka: `id` (nikdy se nemění), `cat`, `scope` (`provozni` = neschvaluje nikdo, nemá stav), `title`, `summary`, `detail`, `params` (strojové hodnoty), `labels` (česky s jednotkou), `steps`, `texts` a `lists` (texty pro pacienta se zástupnými místy `{…}`), `postup` (D-POSTUP: větve zvýšit/snížit/ponechat podle bodů, nikdy velikost kroku), `usedBy`. Meze parametrů jsou v `NF.PARAM_BOUNDS`. Znění pokynů I-* je v `catalogs.js` a hodnota `{v}` je `params.v` položky.
- Stav a verze: `NF.decideItem` → `NF.applyDecision` → `S.registry.history` (jen přibývá: `from`, `to`, `by`, `at`, `rt`, `where`, `model`). Oprava pravidla = `NF.newVersion` (nová verze ke schválení, jen dva výsledky). **Zamítnutá položka nepůsobí:** `NF.usable(S, id)` vrací false a `NF.param` vrací výchozí hodnotu z kódu.
- **Výjimky „zamítnutí = záznam nesouhlasu, ne vypnutí“:** C-CILE, K-KRITERIA, Z-GLUKOZA, P-LEKAR (`15` odst. 12).

### 4.4 Mapa položka → chování v jádře (vygenerováno z kódu 29. 10. 2026; funkce, kde se id položky čte)

| Položka | core.js | obrazovky |
|---|---|---|
| K-KRITERIA | setReviewMeds | clinic: enroll |
| C-CILE | defaultTargets | planScreenBody, preview; clinic: enroll, reviewInstructions, reviewSummary, tileDetail |
| R-NAVYKY | planBlockers | planScreenBody, takeover, today; clinic: enroll |
| R-REAKCE | adviceGate, answerDivergence, checkMilestones, confidence, divergence, epInTarget, foodStatsRaw, importReadings, lastResult, likeCandidates, pathStats, pendingP | foods, meal, peakBlock; clinic: podklady, unstableLine |
| Z-GLUKOZA | pendingPeakAsk, setManualPeak | glucoseCard, peakAskCard, prevAskBlock |
| B-HYPO | addHypoWatch, answerHypoWatch, focusMeal, hypoAlert, hypoAlertSeen, hypoWatchState, lowNowText, openHypoWatch, pendingHypoWatch, setManualLow | glucoseCard, hypoAlertCard, hypoWatchCard, lessFoodCards, lowNoticeCard, prevAskBlock; clinic: histBlock, safetyPart |
| R-PODOBNOST | blendedShare, confidence, similarPool, similarWhy | customBuilder, foodCard, peakBlock |
| R-SKORE | advise, foodStatsRaw, reactionLabel, similarPool, strongFoods | foodCard, meal; clinic: podklady |
| R-PORCE | advise, leverLower | – |
| R-DOPLNEK | addonList, addonWithdrawn, leverLower | clinic: itemListsBox |
| R-PORADI | leverLower, orderFirst, orderParts | clinic: itemListsBox |
| R-PROCHAZKA | fill, leverLower, walkWindow | – |
| D-CISTA | canCorrectInsulin, correctInsulin, proposals, snackAfter, tolerance, usableForDose, whyNotForDose, whyNotUsable | fixInsulinCard, meal; clinic: proposalBody, reviewProposals, reviewSummary |
| D-PRAND | proposals | clinic: reviewProposals |
| D-BAZAL | proposals | clinic: reviewProposals |
| D-POSTUP | manyDosesText, postup, proposals | clinic: reviewProposals, sampleText |
| R-POKYNY | defaultInstructions, instructions, proposals | doctorCard, illnessInstructions, instructionsList, ruleOff; clinic: enroll, histBlock, reviewInstructions |
| I-HYPO | lowNowText, walkLowWhy | hypoAlertCard, hypoWatchCard, lowNoticeCard, lowNowCard, meal, safetySheet |
| I-MENE | advise, instructionDefaults | lessFoodCards, meal, resultCard, safetySheet, today |
| I-NEVIM, I-NEMOC-BAZAL, I-NEMOC-JIDLO | instructionDefaults | meal / illnessInstructions, safetySheet, today |
| I-VYSOKA | instructionDefaults, noteHigh | highCard, safetySheet |
| I-KONTAKT | – | safetyContacts, safetySheet |
| S-SILNA | strongFoods | clinic: strongFoods |
| S-SEMAFOR | proposals, semafor, summary | clinic: reviewSummary, semOff, tileDetail |
| P-NEMOC | illnessLong, illnessLongPeriods, nemocOn | meal, safety, today; clinic: histBlock, tileDetail |
| P-LEKAR | – (zásada bez kódu: lékař mezi kontrolami nic nedělá) | – |

Doporučení: tuto tabulku generovat skriptem při každé předávce (zdroj: `NF.usable`, `NF.param`, `item:` v kódu), ne psát ručně.

### 4.5 Jak naložit s rozhodnutím garanta
- **Schváleno a `appliesToCurrent = true`:** implementovat přesně v tomto znění a s těmito parametry. V ostré aplikaci nese položka štítek „✓ schváleno“, verzi a otisk a každý výpočet ji zapíše do stopy.
- **Schváleno, ale nad jiným zněním** (`appliesToCurrent = false` nebo `null`): **neimplementovat jako schválené.** Položka jde garantovi znovu ke schválení v dnešním znění.
- **Zamítnuto:** implementovat chování podle `guide.ucinek`, tedy vypnutí s oznámením na místě, nebo u výjimek C-CILE, K-KRITERIA, Z-GLUKOZA a P-LEKAR záznam nesouhlasu. Položka se nemaže; oprava = nová verze ke schválení (`15` odst. 13).
- **Poznámka** (u schválené i zamítnuté): je to **požadavek na změnu, ne schválená změna.** Programátor ji nikdy nezapracuje potichu. Vlastník z ní udělá novou verzi položky a garant ji schválí. Požadované hodnoty píše garant jen do poznámky (O1).
- **Nerozhodnuto:** do ostrého provozu nesmí. Položka se v ostré aplikaci nepoužije, dokud nemá rozhodnutí.
- **Řádky `scene`, `progress`, `summary`** jsou kontext (kde a kdy garant rozhodoval, zda prošel celou maketu a potvrdil souhrn), ne rozhodnutí.

### 4.6 Slovník řádků tabulky `garant_rozhodnuti` (stav SCHEMA 77)

| kind | item | status | comment | params |
|---|---|---|---|---|
| decision | id položky | approved / rejected | platná poznámka | `{ where }` (+ `ver` po A1) |
| note | id položky | stav v tu chvíli, `null` u nerozhodnuté (B3) | text, `''` = smazání | `{ where }` |
| scene | `SCENA` | – | – | `{ how: dal/skok/zpet/konec, to, items:[{id,status,note}], pending }` |
| progress | `PRUBEH` | – | – | `{ scene, total, mainEnd, title, summaryConfirmed }` |
| summary | `SOUHRN` | – | – | `{ approved, rejected, pending, noted, total, rejectedIds, pendingIds, scene, total_scenes }` |
| reset | `null` (návrh `RESET`, B4) | – | – | – |

Společné sloupce: `id` (`klient:D-čas-náhoda`, jedinečné), `decided_by`, `model_at` (čas v příběhu, ne skutečný), `at` (skutečný čas klienta), `scene` a `scene_title`, `schema`, `client`, `note` (štítek „neformální“), `user_id` a `user_email` (plní server z JWT), `received_at`. RLS: vkládat jen pod vlastním `user_id`, číst garant jen své a správce vše, bez `update` a `delete`.

### 4.7 Co se v ostré aplikaci mění oproti maketě
- Server NutriFee místo Supabase a prohlížeče (připravuje vývojář serveru; `15` zásada 6). Registr je na serveru jako data s verzemi a otisky, ne v kódu.
- Schválení je **podpis garanta** nad konkrétní verzí a otiskem položky, ne neformální řádek. Historie jen přibývá.
- Hlavičky CSP, `frame-ancestors`, `Referrer-Policy` a `Permissions-Policy` posílá server (`15` zásada 6).
- Modelové role a syntetická data (`demo/fixtures.js`) odpadají.

### 4.8 Otevřené úkoly ostré aplikace zapsané v `15`
1. **Export ze senzoru:** jak ho pacient získá a pošle do ordinace a převodníky exportů senzorů v kohortě do jednotného tvaru (čas + mmol/l) s testem na ukázkových exportech (`15` odst. 6a, odst. 18 „Rozpoznaný formát…“ přebito 27. 10.). Zda přijímat jen jeden přesný tvar csv, rozhodne ostrá aplikace (odst. 6a).
2. **Bod zaučení** „Pacient ví, že před kontrolou pošle do ordinace export“: jak export získá, je otevřené (odst. 5).
3. **Server NutriFee a DPIA:** šifrované úložiště dat pacientů; osnovu DPIA doplní vývojář serveru (`navrhy-designu/14-ucel-urceni-a-dpia-2026-10-18.md`; `15` odst. 18).
4. **Bezpečnostní hlavičky** posílané serverem (`15` zásada 6).
5. **Nové podepsání pravidel pro ostrý provoz:** rozhodnutí z makety se nepřebírají jako podpis (`15` zásada 6).
6. **Protokol studie:** během studie jen vypnutí položky, opravy až po období; vylučovací kritéria stanoví protokol, aplikace je nekontroluje (`15` odst. 13, 18).
7. Otevřené z dřívějška: `file://` s CSP (`15` odst. 16, SCHEMA 26). Ostrou aplikaci se netýká, jen makety.

### 4.9 Kontrolní seznam předávky
- [ ] Značka gitu `schema-NN` a tabulka SCHEMA → commit; maketa publikovaná ve verzi, kterou garant viděl (dnes místní publikační kopie SCHEMA 71, Disk 77).
- [ ] Export rozhodnutí (JSON a CSV) s otisky; každá položka buď „platí pro dnešní znění“, nebo vrácená garantovi.
- [ ] Skutečné DDL a politiky tabulky ze Supabase (B5).
- [ ] Testy prošly (výstup celý, ne `tail`); žádný soubor `app/`, `demo/` ani HTML není prázdný.
- [ ] Bez skutečných jmen osob, institucí, výrobců a produktů v předávaných souborech.

---

## 5. Rozhodnutí pro vlastníka (předložit tlačítky; doporučení první)

1. **Otisk a verze položky v každém rozhodnutí (A1).** *Doporučeno: ano.* Bez toho nejde doložit, co garant schválil, a 27 z 28 položek se od publikované verze změnilo. Tabulka se nemění, data jdou do `params`.
2. **Export pro programátora v „Výsledcích garanta“ (B1).** *Doporučeno: ano, jen pro správce, JSON + CSV.* Export byl 7. 10. 2026 zavržen jako zbytečný pro uživatele makety. Předání je nový důvod: spojit rozhodnutí se zněním na serveru nejde. Alternativa bez kódu: dotaz SQL z odst. 3.3 + ruční spojení s gitem, ovšem jen se spolehlivou vazbou SCHEMA → commit.
3. **Pořadí podle `at` + `seq` + posunu hodin (B2) a odložená fronta odmítnutých řádků s `item: 'RESET'` (B4).** *Doporučeno: ano, jedním balíčkem v `demo/sync.js`.*
4. **Publikovat SCHEMA 77 a označit ji značkou, než garant rozhoduje dál.** *Doporučeno: ano.* Podle místní kopie garant dnes schvaluje SCHEMA 71, ne zdroj pravdy. Před publikací zkontrolovat `git log origin/main`, zda tam nejsou neznámé commity.
