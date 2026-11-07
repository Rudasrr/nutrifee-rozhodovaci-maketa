# Předávka: ukládání rozhodnutí garanta, přihlášení, výsledky správce (30. 10. 2026, kontrola 4)

Rozsah: `demo/sync.js`, `demo/auth.js`, `demo/results.js` (`demo/sync-config.js` beze změny), nový test `maketa-rozhodovaci/ukladani.test.cjs`, SQL pro vlastníka v `navrhy-designu/05-supabase-rozhodnuti-garanta.md` (odst. 0), předávací dokument `10-predani-programatorovi.md`. Nic nepublikováno, nic necommitováno, proti skutečnému Supabase nic nespuštěno (test i simulace mají vlastní falešný server; požadavek mimo adresu z `sync-config.js` test shodí).

## 1. Co je hotové

| Nález | Řešení |
|---|---|
| **Rozhodnutí 1 (otisk)** | `params.ver = { version, fp, fpGuide, fpCat, alg }` u `decision`, `note`, u položek v `scene` a ve snímku `summary`. `fp` = `NF.itemFingerprint(položka z NF.data.registry(), D.guide[id])` z jádra (`alg: 'core'`); bez jádra dočasná FNV-1a v sync.js (`alg: 'sync1'`). `fpGuide` = surové texty průvodce, `fpCat` = meze, znění pokynu I-*, návyky (jádro je do otisku nebere). Výsledky správce: „rozhodnuto k předchozímu znění“ / „bez otisku znění“, počet nahoře. |
| **Rozhodnutí 2 (export)** | „Stáhnout JSON“ / „Stáhnout CSV“ jen pro správce, z načtených řádků, bez sítě (`D.results.exportData`); formát v `10-predani…` odst. 6. |
| 05 A1 | vypršení přihlášení (`auth.js` `signOut(…, keep)`) nemaže deník, koncepty ani frontu; po přihlášení `D.sync.afterLogin()` = odeslat, pak obnovit; `lastErr` vynulován. Jiný účet: deník a koncepty předchozího smazány, jeho fronta čeká a odejde po jeho přihlášení (C5: hláška s počtem). |
| 05 A2 | fronta a odložené řádky se čtou a zapisují vždy čerstvě z localStorage; posluchač `storage`; deník druhé karty se doplní obnovou (server + vlastní fronta). |
| 05 A3 | obnova při startu, po přihlášení, při `visibilitychange` (nejdřív po 15 s) a po odeslání fronty (nejdřív po 10 s). |
| 05 A4 | čtení po stránkách (`order=id.asc&id=gt.…&limit=1000`) v obnově i ve výsledcích. |
| 05 B1 | opakování 2, 5, 15, 30, 60 s, pak minutu; `online`, `visibilitychange`; `pagehide` → `fetch keepalive`; `beforeunload` s neodeslanými se ptá. |
| 05 B2 + 03 B4 | 400/403/413/422 → dávka po řádcích, odmítnutý řádek do `nutrifee-sync-dead`, fronta pokračuje; „server odmítl: N · Zkusit znovu“; reset má `item: 'RESET'`. |
| 05 B3 | `D.sync.state(sid)` / `isPending(sid)` / `stateText(sid, rt)` / `allSaved()` / `status()` / `onChange(fn)`; `NF.slots.syncEnd()`. |
| 05 B4 + 03 B2 | `params.seq`, `params.skewMs` (z hlavičky Date, jinak odhad z `received_at`); řazení všude `D.sync.cmp` (účinný čas = `at + skewMs`, nejvýš `received_at`); odznak „hodiny počítače se liší o N min“ nad 2 min. |
| 05 B5, B6 | výsledky seskupují podle `user_id`, e-mail jen escapovaný popisek; spouštěč v SQL. |
| 05 C2 | na přihlašovací stránce po vypršení „Smazat data makety z tohoto prohlížeče“ (`authWipe`). |
| 05 C6 | časový limit 15 s (`AbortController`). |
| 03 B3 | rozhodnutí a poznámka z obrazovky registru: `where: 'registr'`, `decided_by: 'garant'`, poznámka nese stav z deníku garanta (`null` u nerozhodnuté); upraví se i záznam v deníku. |
| 03 C1, C5 | snímek položek se stavem, poznámkou a otiskem v `summary`; stránkování. |
| 01 M7 | výchozí účet ve výsledcích = naposledy aktivní garant; vlastní účet správce na konci s „(vy)“. |
| 01 M8 | poznámka čeká ve frontě 2,5 s; přijde-li do 10 s rozhodnutí se stejným textem, odejde jen rozhodnutí (sid poznámky ukazuje na něj); u starších dvojic je výsledky sloučí a samotnou poznámku jmenují „poznámka“. |
| SQL (05 odst. 0) | DDL, spouštěč `private.garant_rozhodnuti_stamp` (user_id, user_email, received_at), CHECK `not valid`, politiky bez anon a bez user_metadata, pohled `garant_stav` (security_invoker), ověřovací dotazy, nastavení v administraci. |

## 2. Pro agenta „prezentace“ (`demo/presenter.js`, `app/ui.js`)

API v `D.sync` (vše bez sítě, okamžité):
- `D.sync.isPending(sid)` – už používáte; vrací true i pro řádek, který server **odmítl** (dřív neexistoval).
- `D.sync.state(sid)` → `'server' | 'local' | 'rejected'`; `D.sync.stateText(sid, rt)` → „Uloženo HH:MM.“ / „Uloženo v tomto prohlížeči · čeká na odeslání“ / „Server zápis odmítl · zůstává v tomto prohlížeči“ – pro řádek pod poznámkou (`savedLine`) a hlášku po Schválit/Zamítnout (místo „Schváleno a zapsáno do historie.“ i offline, 05 B3).
- `D.sync.status()` → `{ pending, rejected, saved, lastErr, lastOk, sending, nextRetryAt, skewMs, foreign, restoreErr, configured }`. **`syncInfo`/`syncWord` v presenteru dnes `rejected` ani `skewMs` nečtou** – při `pending 0` a `rejected > 0` lišta ukáže „Uloženo“, což není pravda. Prosím: `saved = st.saved` a při `rejected` text „Server odmítl N zápis(y); zůstávají v tomto prohlížeči“ s tlačítkem `syncRetryDead`.
- `D.sync.onChange(fn)` – zavolá se po každé změně fronty (i z jiné karty); pro překreslení odznaku a konce ukázky.
- `NF.slots.syncEnd()` – hotový blok pro poděkování a „Ukázka skončila“ (01 B1): prázdný, když je vše na serveru; jinak věta a „Zkusit znovu“. Pokud máte vlastní `syncLine`, stačí podmínit „můžete okno zavřít“ `D.sync.allSaved()`.
- Akce `syncRetry` (vše hned, i zadržené poznámky) a `syncRetryDead` (vrátí odmítnuté do fronty).
- `D.garantMerge` volá sync.js teď častěji (start, návrat na kartu). Při `add > 0` presenter přehrává scénu (`land` → mimo jiné `setEnded(false)`) a hlásí „Načteno N dřívějších rozhodnutí z vašeho přihlášení“. Doporučení: při obnově mimo přihlášení neměnit „Ukázka skončila“ a text „Načtena rozhodnutí z jiného okna nebo zařízení (N)“.
- Reset z jiného zařízení: `garantMerge` jen přidává, takže deník, který má záznamy před cizím resetem, je neodebere. Návrh: `D.garantMerge(list, { replace: true })` (nahradit deník seznamem, který sync.js posílá už po posledním resetu a včetně vlastní fronty).
- Deník `nutrifee-garant` a koncepty `nutrifee-garant-drafts` zapisuje presenter celým polem → dvě karty se mohou přepsat (05 A2). Obnova to opraví při návratu na kartu, ale čisté řešení je sloučení podle `sid` při `saveGlog` + posluchač `storage` na `GKEY`/`DKEY`.
- M8 v historii položky v panelu/zásuvce: poznámka hned následovaná rozhodnutím se stejným textem by se neměla vypisovat zvlášť (`D.sync.state(noteSid)` vrací stav rozhodnutí, do kterého byla sloučena).

## 3. Pro agenta „jádro“ (`app/core.js`)

- `NF.itemFingerprint(item, guideEntry)` sync.js volá nad položkou z `NF.data.registry()` (ne nad stavem příběhu) a s `D.guide[id]`. Do otisku nejde `PARAM_BOUNDS[id]`, znění pokynu I-* z `catalogs.js` ani návyky – proto sync.js přidává `fpCat`. Doporučení: zahrnout je do jádra (pak `fpCat` jen zdvojí kontrolu, nevadí).
- Otisk jádra iteruje `charCodeAt` (UTF-16 jednotky), ne bajty UTF-8; pro server v jiném jazyce to popsat ve specifikaci (dnes je to v `10-predani…` odst. 5 jen obecně).

## 4. Pro integraci (hlavní test, HTML, 15)

- **Přidat `ukladani.test.cjs` do seznamu sad** v `nutrifee-rozhodovaci-maketa.test.cjs` (cyklus u řádku ~2104).
- **Jeden starý test je potřeba upravit (záměrná změna chování):** `nutrifee-rozhodovaci-maketa.test.cjs`, test „Přihlášení (7. 10. 2026)…“, řádek ~170: přepne relaci na správce bez přihlášení, zatímco ve frontě jsou řádky garanta, a čeká, že odhlášení správce zdrží. Nově jsou to řádky jiného účtu: neposílají se pod ním, nepočítají se mu a odhlášení nebrání (C5 – nic se neztratí, odejdou po přihlášení garanta). Návrh: před `act('authLogout')` přepnout relaci zpět na garanta (`store.set('nutrifee-auth', sessionFor('garant'))`), nebo kontrolu otočit (`assert.equal(D.sync.pending(), 0)` u správce a `D.sync.foreign() > 0`).
- **Souhra s presenterem v hlavní sadě (živý strom 30. 10. odpoledne, 25 selhání, většina z rozpracované práce ostatních):** tři testy se týkají ukládání a vyžadují úpravu testu, ne kódu: (a) „Jádro bez sítě…“ čeká v liště text `neuloženo: N` – lištu teď kreslí presenter („Ukládáme…“ / „Neuloženo: N“); (b) „Přihlášení…“ – stav ukládání až po prvním rozhodnutí (presenter); (c) „SCHEMA 72: … poznámka zůstane v poli“ čeká „Uloženo HH:MM“ – v testu není síť, takže záznam je pravdivě jen v prohlížeči a `D.sync.isPending(sid)` vrací true (05 B3); test má buď čekat „Uloženo v tomto prohlížeči · čeká na odeslání“, nebo nastavit falešný `fetch`.
- Zvýšit `NF.SCHEMA` a `?v=` (sync.js, auth.js, results.js se změnily). V `15` odst. 12 sjednotit rozpor o exportu (export pro správce je zpět, bod 2) a do odst. 16 zapsat stav.
- CSP se nemění (`connect-src` jen na projekt; stažení přes `blob:` a `a[download]`).

## 5. Ověření

- `node ukladani.test.cjs`: **18/18** na živém stromu (po úpravě presenteru 30. 10. odpoledne znovu ověřeno) (otisk jádra, `alg: 'core'`) i na čisté kopii SCHEMA 77 s mými soubory (`alg: 'sync1'`). Scénáře: otisk a „předchozí znění“, export JSON/CSV (28 položek, stav = logika správce, BOM, `;`, vzorec neutralizován, garant export nemá), výpadek a 500 s automatickým opakováním, zaseknutí 15 s, trvale odmítnutý řádek + reset, vypršení přihlášení a jiný účet, dvě karty offline, dvě zařízení, 2 500 řádků při Max rows 1000, posun hodin ±3 h a „reset v budoucnosti“, pravdivý stav, XSS e-mailem, M7, M8, registr (03 B3), ztracená odpověď a F5 bez duplicit, bez sítě nic neodejde. Nic se neztratilo ani nezdvojilo.
- Celá sada na čisté kopii SCHEMA 77 (`scratchpad/k4-ukl/b1`) s mými soubory: proti stejné kopii bez nich přibylo jediné selhání – starý test ř. ~170 (odst. 4). Celá sada na živém disku selhává ve ~100 testech kvůli rozpracované práci ostatních agentů (core.js, presenter.js…); se starými verzemi mých souborů je výsledek na témže snímku stejný, takže tato selhání nejsou z mé části.
- Playwright v prohlížeči neběžel: instalace `playwright-core` v pracovní složce je poškozená (chybí `package.json` a část `lib/`) a stahovat jsem nic nechtěl. Prohlížečové části (`storage`, `beforeunload`, `pagehide keepalive`, `AbortController`, hlavička Date přes CORS) jsou ověřené jen v simulaci Node. Supabase pravděpodobně hlavičku `Date` přes CORS nezpřístupní – pak se posun hodin odhaduje z `received_at` při obnově (otestováno).
