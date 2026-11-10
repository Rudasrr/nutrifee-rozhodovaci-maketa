# Poslední kontrola · pohled 05: kód, chyby a robustnost

*10. 11. 2026 · maketa SCHEMA 89 · nic v maketě neměněno. Prošlo `app/core.js` (2853 ř.) a `app/ui.js` (753 ř.) funkci po funkci, fuzz nad produkčním sestavením, cílené reprodukce, posun stavu v čase, dva klienti nad jedním stavem, produkční sestavení v Chromiu (lékař → sestra → pacient) a kvalita `rychle.test.cjs` a `zlate-vystupy.test.cjs`. Všechny skripty leží v pracovní složce `…/scratchpad/k36-kod/` (cesty níže), pracovaly nad kopií makety; síť ani Supabase se nevolaly.*

Skripty (absolutní cesty, předpona `S = /private/tmp/claude-501/-Users-ngmacminim4pro-Library-CloudStorage-GoogleDrive-rehor-rudolf-gmail-com-M-j-disk-NutriFee-NutriFee-new-look/91a20ff2-da8d-4e57-8d3a-d33240768b1a/scratchpad/k36-kod`):

| Skript | Co dělá |
|---|---|
| `S/harness.cjs` | načte produkční sestavení (`app/` bez `demo/`) v Node s `NF.configure({ now, storage })`, zachytí `setInterval` |
| `S/fuzz.cjs` | fuzz akcí `ui.js` (viz odd. 2) |
| `S/check.cjs` | cílené reprodukce 1–13 (výstup `ANO` = chyba se projevila) |
| `S/check4b.cjs` | pád vykreslení → ztráta dat |
| `S/check-takeover.cjs`, `S/check-render.cjs`, `S/check-dst.cjs` | den převzetí, vykreslení mění stav, podzimní změna času |
| `S/shift.cjs` | posun stavu z `D.play` do dneška a porovnání se zlatými výstupy |
| `S/browser.cjs`, `S/perf.cjs` | produkční sestavení v Chromiu (port 8904), výkon |
| `S/demo-repo/` | repozitář dema složený přesně podle tabulky „Co převzít beze změny“ |

Spouštět s `TZ=Europe/Prague`.

---

## 0. Shrnutí

- **Jádro samo je robustní.** Fuzz (54 600 kroků, 39 156 akcí, 3 semínka × 130 běhů) nenašel NaN ve stavu, dávku mimo 1–60, neserializovatelný stav, zkrácenou stopu, pád vykreslení ani neescapovaný vstup uživatele (XSS). Výpočty jsou deterministické a posun stavu v čase dává **přesně stejná čísla** jako zlaté výstupy.
- **Rizika jsou na švu jádra a synchronizace, kterou demo staví.** Stav `S` míchá data pacienta se stavem pohledu jednoho zařízení (role, stránka, rozpracovaný zápis, chyba, oznámení). Jádro navíc ukládá **každou minutu bez akce** a při chybě vykreslení **uloží čistý stav přes data pacienta**. S háčkem `NF.onChange` a pravidlem „poslední zápis vyhrává“ to znamená ztrátu zápisů pacienta. Na serveru, tedy na všech zařízeních.
- **První den podle `01-cesta-k-demu.md` nejde splnit:** v repozitáři složeném podle tabulky „Co převzít“ rychlá sada ani zlaté výstupy neprojdou.
- Ostatní nálezy jsou střední a nízké: text „jinak (null j.)“ v kartě bazálu, den převzetí plánu, výchozí role bez `?role=`, posun „uběhlo dní“ po jarní změně času a vykreslení, které mění stav.

| # | Závažnost | Nález |
|---|---|---|
| K1 | **vysoká** | Minutový tik ukládá celý stav i bez akce: nečinné okno přepíše zápis pacienta |
| K2 | **vysoká** | Stav pohledu (role, stránka, rozpracovaný zápis, chyba, oznámení) je ve sdíleném stavu pacienta |
| K3 | **vysoká** | Pád vykreslení uloží čistý stav přes data pacienta bez zálohy a háček ho pošle dál |
| K4 | **vysoká** | Klient se starší verzí jádra (nebo poškozený záznam) při startu přepíše stav novější verze čistým stavem |
| K5 | **vysoká** (plán prvního dne) | Repozitář podle tabulky „Co převzít“: rychlá sada ani zlaté výstupy neprojdou |
| K6 | střední | Hodiny „nikdy zpět“ a časové pásmo zařízení: jeden klient s předběhnutým časem posune `S.clock` všem |
| K7 | střední | Karta bazálu: odpověď „Nevím“ se lékaři ukáže jako „jinak (null j.)“ |
| K8 | střední | Den převzetí plánu odpoledne: Dnes se ptá na snídani před plánem a tkanina ji počítá jako chybějící |
| K9 | střední | Adresa bez `?role=` nenastaví pacienta (dokumentace tvrdí opak) |
| K10 | střední | Velikost stavu 0,5–1 MB, ukládá se po každé akci i při psaní; import exportu za 92 dní trvá 4 s |
| K11 | střední | Posun stavu v čase: předformátované texty se starým datem (`sensorSummary.period`, rozpracovaná kontrola) |
| K12 | nízká | `pathStats.gone` z milisekund: po jarní změně času 0:00–0:59 o den méně |
| K13 | nízká | Vykreslení mění stav (`NF.weekSummary` zapisuje `fb.weeksSeen`) |
| K14 | nízká | Akce bez kontroly vstupu: `mealFinish` bez kroku a porce uloží „obvyklá“ a „podle plánu“; `startReview` přepíše rozpracovanou kontrolu; `v.split` na `null` ve 13 akcích |
| K15 | nízká | Podzimní změna času: hodiny jádra zamrznou na hodinu na 2:59 |
| K16 | nízká | Testy, které nemohou selhat nebo netestují, co tvrdí název |

---

## 1. Nálezy

### K1 · vysoká · Minutový tik ukládá celý stav i bez akce

**Kde:** `app/ui.js:737` (`setInterval … NF.tick(S); … NF.save(S); NF.render()`), spolu s `NF.save` → `NF.emitChange` (`app/core.js:314–320`).

**Co se stane:** každé otevřené okno jednou za minutu uloží svůj stav v paměti a háček `NF.onChange` ho podle `01-cesta-k-demu.md` odešle na server. Nečinné okno lékaře, které pacientův zápis ještě nenačetlo, tak do minuty přepíše server starší verzí. Totéž dělá `NF.boot` (`ui.js:736`, `NF.save` při každém otevření) a `bind` při každém stisku klávesy (`ui.js:692`).

**Reprodukce:** `S/check.cjs`, blok 6. Lékař i pacient načtou stejný stav, pacient uloží večeři (server: 257 zápisů), v okně lékaře uběhne minuta a server má zase **256 zápisů**.

**Návrh opravy:** v jádře oddělit „uložit, protože se změnila data“ od „posunout hodiny“. Minutový tik smí jen překreslit (`NF.render`) a zapsat jen lokálně, bez `emitChange`. Do dema dát do `NF.onChange` informaci, zda šlo o akci (`info.action`). Synchronizační vrstva má posílat jen po akci, s verzí záznamu (`rev`) a podmíněným zápisem (`if rev == serverRev`). Při konfliktu stav znovu načíst a akci zopakovat, místo aby poslední zápis vyhrál.

### K2 · vysoká · Stav pohledu je ve sdíleném stavu pacienta

**Kde:** `NF.createState` (`core.js:145–177`: `role`, `page`, `draft`, `meal`, `wizardStep`, `toast`, `error`, dál za běhu `form`, `reg`, `foodOpen`, `fixInsulin*`, `vsPick`, `basalOther`, `ask`, `review.step/tile/other`, `training.previewPage`). Akce, které stav pohledu mění: `A.issuePlan` přepne `S.role = 'nurse'` (`ui.js:329`), `A.role` maže `S.meal` (`ui.js:256`), `act` zapisuje `S.error`.

**Reprodukce:** `S/check.cjs`, bloky 7a a 7b.
- 7a: lékař vydá plán P2. Sdílený stav pak nese `role=doctor`, `page=review` a `toast` „Plán P2 je vydaný…“. Telefon pacienta po načtení nové verze kreslí **obrazovku lékaře**.
- 7b: pacient má rozpracovaný zápis jídla (`S.meal`). Okno lékaře ho při otevření (`A.role` v `NF.boot`) smaže a uloží.

**Návrh opravy:** jádro se kvůli tomu nemusí přepisovat. Stačí rozhodnout a zdokumentovat, že synchronizační vrstva:
- posílá jen doménová pole a pole pohledu drží per zařízení;
- po načtení nové verze vždy znovu nastaví roli z účtu a vrátí lokální `meal`, `page` a `form`.

Lepší je přidat do jádra `NF.domainKeys` a `NF.viewKeys` a funkci `NF.mergeRemote(local, remote)`, která převezme doménu a ponechá pohled. Bez toho dva lidé nad jedním pacientem nefungují.

### K3 · vysoká · Pád vykreslení uloží čistý stav přes data pacienta

**Kde:**
- `app/ui.js:633–639`: záchrana v `act` při druhé chybě vykreslení udělá `S = NF.createState(); NF.seed(S); NF.save(S)`;
- `ui.js:748–751`: totéž při prvním vykreslení;
- `NF.boot` (`ui.js:736`) volá `NF.render()` bez `try`, takže výjimka vyletí z bootu a minutový tik ani posluchač `storage` se nenastaví.

Žádná z těchto cest neuloží zálohu, kterou `NF.load` jinak dělá. `NF.stateShapeOK` (`core.js:295–311`) kontroluje pole jen na úrovni seznamů, ne položky (`basalLog[i]`, `episodes[i].points[i]`, `nights[i]`, `hypoWatch[i]`).

**Reprodukce:** `S/check4b.cjs`. Stav před kontrolou (256 zápisů) s jedním poškozeným prvkem (`basalLog[0] = null`, nebo `points: [null]`) projde kontrolou tvaru. Boot vyhodí výjimku (intervalů 0) a po dvou klepnutích je v úložišti **0 zápisů**. Háček dostal `[256, 256, 256, 0, 0]`, zálohy žádné.

Spouštěčem nemusí být poškozený záznam: stačí jakákoli budoucí chyba v obrazovce nad neobvyklými daty a čistý stav se rozešle na všechna zařízení.

**Návrh opravy:**
1. Před resetem uložit zálohu (`NF.STORAGE + '.zaloha-vykresleni-' + čas`).
2. Reset dělat jen v paměti (`NF.muteHooks(() => NF.save(S))`, tj. bez háčku) a ukázat „Začít znovu“, místo aby se tiše uložil.
3. `NF.render()` v `NF.boot` obalit stejně jako první vykreslení.
4. `NF.stateShapeOK` rozšířit na položky polí, které obrazovky čtou bez ochrany (`basalLog`, `nights`, `hypoWatch`, `episodes[].points`).

### K4 · vysoká · Starší klient přepíše stav novější verze čistým stavem

**Kde:** `NF.load` (`core.js:277–284`): jiné `schema` → záloha pod `nutrifee.zaloha-<schema>` a čistý stav. `NF.boot` (`ui.js:736`) ho hned uloží pod hlavní klíč a háček ho pošle. Stejně dopadne záznam, který neprojde `NF.stateShapeOK` (`core.js:286–290`).

**Reprodukce:** `S/check.cjs`, blok 5. Stav s `schema: 90` (256 zápisů) po bootu klienta SCHEMA 89 dopadne takto: klíč `nutrifee` má schema 89 a **0 zápisů**, háček dostal `[0]`. S PWA a mezipamětí service workeru bude starší klient běžný: telefon s nevyprázdněnou mezipamětí po nasazení nové verze.

**Návrh opravy:**
- V jádře: při `NF.migrated` neukládat pod hlavní klíč (nebo uložit bez `emitChange`) a nabídnout „Začít znovu“.
- Ve vrstvě dema: server odmítne zápis, jehož `schema` je nižší než uložené, a klient s nižší verzí se má obnovit (`skipWaiting`, `clients.claim`, kontrola verze při startu).

### K5 · vysoká (pro první den) · Rychlá sada a zlaté výstupy v novém repozitáři neprojdou

**Kde:**
- `rychle.test.cjs:16` čte `nutrifee-rozhodovaci-maketa.html` (demo má `index.html`);
- `rychle.test.cjs:21` spouští `obsah-pacienta.test.cjs` a `tokeny.test.cjs`, které nejsou v tabulce „Co převzít“;
- `zlate-vystupy.test.cjs:46` dělá `require('./pravdivost.test.cjs')` a přes něj načítá celé HTML s `demo/`.

`predani/01-cesta-k-demu.md:28` přitom uvádí jen `rychle.test.cjs`, `zlate-vystupy.test.cjs` a `zlate-vystupy/`. První úkol prvního dne (bod 4) říká „projde rychlá sada i zlaté výstupy“ a bod 1 „pokud neprojdou, zastavte se“.

**Reprodukce:** `S/demo-repo/` (složeno přesně podle tabulky):
- `node zlate-vystupy.test.cjs`: 8 prošlo, 1 selhal (`Cannot find module './pravdivost.test.cjs'`);
- `node rychle.test.cjs`: `ENOENT nutrifee-rozhodovaci-maketa.html`. Po přejmenování HTML 11 prošlo, 3 selhaly (zlaté výstupy, `obsah-pacienta`, `tokeny`).

**Návrh opravy:**
- `rychle.test.cjs` brát seznam skriptů z `zlate-vystupy/generuj.cjs` (`G.CORE`, už existuje), ne z HTML.
- Podsady spouštět jen tehdy, když soubor existuje, nebo je doplnit do tabulky „Co převzít“ i se závislostmi (`obsah-pacienta.test.cjs` potřebuje `15` a fixtures, `tokeny.test.cjs` potřebuje `design-system/`).
- Test „S prezentační vrstvou“ v `zlate-vystupy.test.cjs` přeskočit, když `pravdivost.test.cjs` chybí.
- Do `01-cesta-k-demu.md` doplnit přesný seznam.

### K6 · střední · Hodiny „nikdy zpět“ a časové pásmo zařízení

**Kde:** `NF.tick` (`core.js:69`: `if (n > S.clock) S.clock = n`), `NF.now` a `localIso` (`core.js:63–68, 79–82`: místní čas **zařízení**).

**Reprodukce:** `S/check.cjs`, blok 8. Klient s hodinami o 2 dny napřed uloží stav. Pacient se správným časem pak zapíše jídlo s časem **o 2 dny v budoucnosti** (`2027-01-06T18:00` místo `2027-01-04T18:00`). Notebook v jiném pásmu (UTC, cesta) zapisuje svůj místní čas, a protože se hodiny nevracejí, časy se míchají.

**Návrh opravy:** demo má předávat `now` jako místní ISO řetězec v Europe/Prague bez ohledu na pásmo zařízení, například:

```js
new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Prague', dateStyle: 'short', timeStyle: 'medium' }).format(new Date()).replace(' ', 'T')
```

Ideálně ho brát ze serverového času. Ve sdíleném stavu nepoužívat `S.clock` jako „teď“: po načtení vzdálené verze nastavit `S.clock = NF.now()`, i když je dřív než uložené. Server by měl odmítnout `S.clock` víc než pár minut v budoucnosti.

### K7 · střední · Karta bazálu ukáže „jinak (null j.)“ místo „nevím“

**Kde:** `NF.nightCircumstances` (`core.js:2247`): `bz.confirmed === 'as' ? … : bz.confirmed === 'none' ? 'nepodán' : (bz.time || '') + ' jinak (' + bz.units + ' j.)'`. Odpověď `unknown` (`A.basalConfirm('unknown')`, `A.basalYesterday('unknown')`) má `units: null`.

**Reprodukce:** `S/check.cjs`, blok 1: v kartě „Posoudit bazální dávku“ (řádky „Noc na …“) stojí `bazál 21:05 jinak (null j.)`. Lékař tak čte, že pacient si dal jinou dávku, a ne že nevěděl.

**Návrh opravy:** doplnit větev `bz.confirmed === 'unknown' ? 'nevím, zda podán'`. Zlaté výstupy se tím nezmění, protože příběh odpověď „nevím“ u bazálu nemá. Vhodné je přidat test.

### K8 · střední · Den převzetí plánu odpoledne

**Kde:** `NF.mealState` a `NF.focusMeal` (`core.js:573–591`) a `NF.weave` (`core.js:1918–1938`) neberou v úvahu `plan.understoodAt`. `NF.yesterdayGaps` ho bere (`core.js:2832–2839`).

**Reprodukce:** `S/check-takeover.cjs`. Zařazení a převzetí ve 13:00:
- `focusMeal` vrátí `{"meal":"breakfast","state":"missed"}`, takže Dnes se ptá „Byla dnes snídaně?“ na jídlo před plánem;
- tkanina dne převzetí má `["missing", …]`;
- `summary.slotsAll` počítá den převzetí celý.

V příběhu se to neukáže, protože převzetí je v 9:55. V demu se skutečným časem se to stane u každého pacienta zařazeného po 10:00.

**Návrh opravy:** slot, který skončil před `understoodAt`, považovat za „před plánem“: v `mealState` stav `before`, v tkanině `future`/tlumeně, v souhrnu nepočítat. Stejné pravidlo jako C3 (31/03) u `yesterdayGaps`.

### K9 · střední · Adresa bez `?role=` nenastaví pacienta

**Kde:** `NF.boot` (`ui.js:733–735`) mění roli jen při parametru. Komentář `ui.js:728` i `01-cesta-k-demu.md` („adresu bez parametru (pacient)“) tvrdí, že výchozí je pacient.

**Reprodukce:** `S/browser.cjs`: po zaučení sestrou otevře `prod.html` bez parametru roli `nurse`. Hotovo prvního dne („převzetí plánu (`index.html`, pacient)“) tak v témže prohlížeči nejde.

**Návrh opravy:** bez parametru nastavit `patient`, nebo opravit dokumentaci na `?role=pacient`. V demu roli určuje účet, ale den 1 počítá s adresou.

### K10 · střední · Velikost stavu a výkon synchronizace

**Měření:**
- `S/check.cjs`, blok 9: stav před kontrolou má 518 kB, po kontrole 633 kB, po nahrání exportu za 92 dní (5min interval, 26 496 měření) 1 000 kB.
- `NF.importReadings` trvá **4,2 s** (`core.js:1809–1817`: pro každý zápis filtruje všechna měření a dvakrát parsuje Date, O(zápisy × měření)).
- Vykreslení je rychlé, viz `S/perf.cjs`:

| Prostředí | Vykreslení pacienta | Krok 1 kontroly |
|---|---|---|
| Chromium | 4–9 ms | 21 ms |
| Telefon se 4× zpomaleným CPU | 13–36 ms | 91 ms |

S K1 se ale **po každé akci, při každém stisku klávesy a každou minutu** posílá 0,5–1 MB JSON.

**Návrh opravy:**
- Posílat jen po doménové akci (K1), komprimovat (gzip zmenší JSON zhruba 10×) a posílat jen změnu proti verzi.
- V `importReadings` jednou seřadit měření a pro každý zápis najít okno binárním vyhledáním. Okno ±3 h stačí převést na milisekundy jednou.
- Body exportu (`points[].at`) neukládat jako řetězec u každého bodu.

### K11 · střední · Posun stavu v čase: zastaralé předformátované texty

**Ověření předpokladu dema (`S/shift.cjs`):** posun všech ISO časů, dat a datových klíčů (`S.skipped`) o celé dny. Kapitoly `reviewProposals` (−56 dní, do 10. 11. 2026), `preview`, `week` a `handover` porovnávají `NF.summary`, `NF.proposals`, `pathStats`, `weave`, `howAmI`, `previewQuestions`, `daySlots`, `focusMeal`, `hypoAlert`, `weekSummary`, `lowEvents`, `notifications` a `yesterdayGaps`. Výsledek je **úplná shoda, i se zlatým `kontrola.json`** (souhrn i návrhy, data v textech nahrazená značkou), a to i při posunu přes jarní změnu času (cíl 2. 4. 2027).

**Nález:** ve stavu zůstávají předformátované texty se starým datem:
- `S.sensorSummary.period` („22. 12. 2026 – 4. 1. 2027“);
- u rozpracované kontroly `S.review.summary.sensor.period`, `S.review.proposals[].context/why/facts` („HbA1c … z 3. 1. 2027“);
- texty ve stopě („v noci na 25. 12.“).

**Návrh opravy:**
- Pacienta před kontrolou připravit z kapitoly **bez zahájené kontroly** (`preview`). Kontrolu zahájí lékař v demu.
- Po posunu přepočítat `sensorSummary` z posunutých měření, nebo z `period` udělat dvě ISO pole a formátovat až při vykreslení.
- Posun napsat jako jednu funkci s testem podle `S/shift.cjs`.

### K12 · nízká · `pathStats.gone` po jarní změně času

**Kde:** `core.js:1903`: `Math.floor((NF.parse(S.clock) - NF.parse(from)) / 86400000)` (milisekundy, přestože komentář o řádek výš říká „nikdy z milisekund“).

**Reprodukce:** `S/check.cjs`, blok 3. Plán od 20. 3. 2027: ve 3. 4. 0:30 vyjde `gone = 13`, v 1:30 vyjde 14 (kalendářně 14). Od toho se odvozuje číslo týdne a „X dní do kontroly“.

**Návrh opravy:** `NF.daysBetween(from, S.clock)`.

### K13 · nízká · Vykreslení mění stav

**Kde:** `NF.weekSummary` (`core.js:1949`): u týdne bez zápisů zapíše `fb.weeksSeen[id] = S.clock`. Volá se z obrazovek Dnes a Můj plán.

**Reprodukce:** `S/check-render.cjs`: samotné `NF.screens.patient(S)` změní `S.fb.weeksSeen` z `{}` na `{"P1:1": …}`. Test `robustnost.test.cjs:80` („Vykreslení je bez vedlejšího účinku na stav“) to nezachytí, protože běží jen nad kapitolou `advice`.

**Návrh opravy:** zápis přesunout do akce (`weekClose`) nebo do `NF.settleFeedback`. Ve vykreslení jen vracet `null`.

### K14 · nízká · Akce bez kontroly vstupu

Nic z toho nejde vyvolat tlačítkem obrazovky. Jde o akce volané programem, což se v demu stane snadno (nová vrstva, testy, konzole).

- `A.mealFinish` (`ui.js:441–460`) nekontroluje krok, odpověď o inzulinu, porci ani hodnotu před jídlem. Neznámá hodnota se uloží jako „podle plánu“ (`ui.js:449`, poslední `: 'as'`) a chybějící porce jako „obvyklá“ (`core.js:1476`). `S/check.cjs`, blok 12: z kroku 1 se uloží zápis `portion=usual, insulin=as`. **Návrh:** vyžadovat `m.step === 3`, platné `v` a `m.portion`; neznámé `v` → `fail`.
- `NF.startReview` (`core.js:2627`) přepíše rozpracovanou kontrolu. `S/check.cjs`, blok 13: 7 rozhodnutí lékaře → 0. Nebezpečné hlavně se dvěma zařízeními. **Návrh:** při `S.review && !S.review.planIssued` vrátit `{ ok: false }`.
- `v.split` bez `String(v)` ve 13 akcích (`revInstrValue`, `instrValue`, `foodDiverge`, `propDecide`, `fixInsulin`, `fixInsulinPick`, `peakChip`, `lowChip`, `hypoAnswer`, `pendingInsulin`, `mealTag`, `mealDecide`, `mealReason`). Při `null` nebo `undefined` vyhodí výjimku, kterou `act` zachytí jako „Tohle se nepovedlo“ a zapíše do stopy `chyba.akce`. **Návrh:** `String(v == null ? '' : v).split(':')` a kontrola hodnoty.
- `A.revInstrToggle` a `A.instrToggle` přijmou id mimo katalog pravidel (hodnota `true`); `A.weekClose` a `A.toggleQuestion` zapíšou do stopy a do otázek libovolný řetězec.

### K15 · nízká · Podzimní změna času

**Kde:** `NF.tick` (`core.js:69`).

**Reprodukce:** `S/check-dst.cjs`. 25. 10. 2026: po 2:59 CEST přijde 2:30 CET, `S.clock` zůstane hodinu na `02:59:00` a zápisy z té hodiny dostanou tentýž čas. Okna v minutách (`NF.minutesDiff`) přes změnu času měří nástěnné hodiny, ne uplynulý čas (±60 min), což u nočních oken (pokles po večeři) nevadí.

**Návrh opravy:** stačí K6 (čas z jednoho zdroje). V dokumentaci uvést, že se počítá v nástěnném čase Europe/Prague.

### K16 · nízká · Testy, které nemohou selhat nebo netestují, co tvrdí

- `rychle.test.cjs:100` („Zásada 1 … jádro jednotky samo nemění“): `/units\s*[+\-]=\s*\d/` na zdrojáku `core.js` nezachytí `units = units + 2` ani výpočet přes proměnnou. Část „jádro nemění“ skutečně hlídá až porovnání plánů P1 a P2 v témže testu.
- `rychle.test.cjs`, test „nízká glukóza … pokles blokuje zvýšit“: příznak `block` si test nastaví sám na klonu návrhu, takže ověřuje jen `NF.proposalBranch`, ne to, že jádro blok z dat skutečně nastaví. To hlídají až zlaté výstupy (`kontrola.json`, `lowBlock`, `fakta`).
- `zlate-vystupy.test.cjs:26`: `got['pribeh.json'].length === core.D.scenes.length` je tautologie (`generate` iteruje `D.scenes`). Číslo 32 z názvu testu se nekontroluje.
- `nutrifee-rozhodovaci-maketa.test.cjs:1037`: `assert.ok(… || true)` nemůže selhat.
- `robustnost.test.cjs:80` („Vykreslení je bez vedlejšího účinku“) běží jen nad jednou kapitolou, viz K13.

Ověřené výsledky:

| Sada | Výsledek |
|---|---|
| `rychle.test.cjs` | 14 prošlo, 0 selhalo (38,5 s) |
| `zlate-vystupy.test.cjs`, TZ Europe/Prague | 9 prošlo |
| `zlate-vystupy.test.cjs`, TZ UTC | 9 prošlo |
| `zlate-vystupy.test.cjs`, TZ America/New_York | 9 prošlo |

Zlaté výstupy tedy nezávisí na pásmu stroje (CI v UTC je v pořádku).

---

## 2. Fuzz (`S/fuzz.cjs`)

**Průběh:** 3 semínka × 130 běhů × 120–150 kroků, celkem 54 600 kroků a 39 156 akcí. Výchozí stavy:
- čistý start produkčního sestavení;
- 12 kapitol příběhu z `D.play`, převzatých do produkce přes `setState` se skutečnými hodinami z `NF.configure`.

**Kroky:**
- 70 % klepnutí na tlačítka, posuvníky a změny polí, které obrazovka v tu chvíli nabízí;
- 12 % náhodná akce s nesmyslnou hodnotou;
- střídání rolí, posun času o 1 min až 8 dní, `bind` s HTML a uvozovkami v názvu jídla, otázce i podpoře;
- znovunačtení z úložiště.

**Hlídané invarianty:** stav jde serializovat a projde `NF.stateShapeOK`, žádné NaN nebo Infinity, stopa neklesá, dávky v plánech a kontrole 1–60, v konceptu 0–60, u zápisů a bazálu null nebo 1–60, `S.clock` platný a neklesá, `NF.load` po vlastním uložení nehlásí migraci. V textu obrazovky ani v oznámení nesmí být „undefined“, „NaN“, „null“ ani „[object Object]“. Vstup uživatele nesmí projít neescapovaný a nesmí se escapovat dvakrát.

**Výsledek:** jediné výjimky byly `v.split` u nesmyslných hodnot (K14). Texty „NaN“ a „lunch:NaN“ se objevily jen tam, kde nesmyslnou hodnotu vložila sama náhodná akce (otázka na lékaře, `weekClose`). Ve stopách proběhlo mimo jiné 136 vydání plánu, 94 zahájení kontroly, 222 rozhodnutí návrhu, 30 importů a 73 nových jídel. **XSS ani dvojí escapování nenalezeno**, a to ani v prohlížeči: nové jídlo `<img src=x onerror=…>` se vykreslilo jako text.

---

## 3. Předpoklady dema

| Předpoklad | Výsledek |
|---|---|
| Jádro běží s `NF.configure({ now: () => new Date(), storage })` a skutečným časem | **ano**. `S/check.cjs`, blok 10: zařazení, zaučení, převzetí a zápis jídla 10. 11. 2026 ve 13:08, 13 událostí, bez chyby. Výhrady K6, K8, K15 |
| Stav z `D.play(index)` jde posunout v čase a souhrny sedí | **ano**, shoda se zlatým `kontrola.json`. Výhrada K11 |
| Dva klienti, poslední zápis vyhrává | **rozbije se**: K1 (minutový tik), K2 (role, stránka, rozpracovaný zápis), K3, K4 (reset nebo starší verze přepíše server), K6 (hodiny), K14 (`startReview`). Zámek „otevřené v jiném okně“ (`ui.js:738`) funguje jen přes událost `storage` localStorage; s vlastním úložištěm se neuplatní. ID zápisů (`E-n`, `W-n`, `Q-n`) počítá každé zařízení samo, takže dvě zařízení vytvoří stejné ID. Pro slučování je potřeba prefix zařízení |
| Velikost stavu po 92 dnech a rychlost vykreslení | 518–633 kB, po importu 1 MB; vykreslení 4–21 ms (desktop), 13–91 ms (4× pomalejší CPU); import 92 dní 4,2 s (K10) |

## 4. Produkční sestavení v prohlížeči (`S/browser.cjs`)

**Postup:** `prod.html` je HTML makety bez řádků `<link>` a `<script>` s `demo/`, komentář zůstal uzavřený. Server běžel na `127.0.0.1:8904`, Chromium v pásmu Europe/Prague.

**Průchod klikáním na skutečná tlačítka a posuvníky:**
- lékař (`?role=lekar`): podmínky, vylučovací kritérium, dávky posuvníkem, ověření dávek, vydání P1;
- sestra (`?role=sestra`): všech 9 bodů, „Zaučení dokončeno“;
- pacient (`?role=pacient`): šest stránek převzetí, zpětné přečtení dávek, kontrolní otázka, „Rozumím“, zápis oběda s novým jídlem a uložení.

**Výsledek:** **0 chyb konzole, 0 výjimek stránky, 0 požadavků mimo 127.0.0.1**, žádné „undefined“ ani „NaN“ v textu. Zámek druhé karty funguje.

**Výhrady:** K9 (adresa bez `?role`) a K8 (Dnes se ve 13:13 v den převzetí ptá na snídani).
