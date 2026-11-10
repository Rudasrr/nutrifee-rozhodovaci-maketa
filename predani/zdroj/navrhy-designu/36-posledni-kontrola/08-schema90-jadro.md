# 36 / 08 – SCHEMA 90, fáze 1: jádro a akce

*11. 11. 2026 · podklady: `05-rozhodnuti.md` (body 1–8, 11, 12), `00-souhrn.md` oddíl A, zprávy `01-klinika.md`, `02-pacient.md`, `03-ordinace.md`, `05-kod.md` · nic necommitováno ani nepublikováno, `~/Documents/Nutrifee` ani Supabase se nevolaly; `demo/` beze změny kromě řádku `D.build` v `demo/sync-config.js`.*

Změněné soubory: `app/core.js`, `app/ui.js`, `app/screens.js`, `app/screens-clinic.js`, `app/data/registry.js`, `app/data/catalogs.js`, `nutrifee-rozhodovaci-maketa.html` (jen `?v=90`), `design-system/index.html` (jen `?v=90` a `data-version="90"`), `demo/sync-config.js` (jen `D.build = 'schema-90'`), testy (`rychle`, `zlate-vystupy`, nový `schema90-jadro`, počty v `schema84-jadro`, `faze2-jadro`, `kontrola2-obsah`, `kontrola4-obsah`, `zaverecne80`, `nutrifee-rozhodovaci-maketa`), `zlate-vystupy/*.json` a `README.md`, `15-ZDROJ-PRAVDY-MAKETA.md`.

---

## 1. Rozhodnutí vlastníka

| Bod | Výsledek | Jak |
|---|---|---|
| 1 Den končí ve 4:00 | **hotovo** | `S-PRIPOMINKY.den_konec` 4 (provozní, meze 2–6); `NF.appDay`, `NF.appHour`; řídí se jím sloty dne, vynechání, bazál po půlnoci, zpětný zápis (`NF.retroAt`: 0:30 = den aplikace + 1 kalendářně), „Včera chybí“, ranní otázka po večeři, tkanina, karty na Dnes. Pozdní večeře ve 0:20 je večeře; ráno je na řadě snídaně. |
| 2 „Zapsat svačinu“ do 3 h po hlavním jídle | **hotovo** | `NF.snackFirst`; v „Co teď“ hlavní tlačítko „Zapsat svačinu“, vedlejší „Chystám se na večeři“ a „Večeře už byla“. Hranice B-HYPO `dalsi_slot_h`. Když je na Dnes otevřená bezpečnostní karta s „Rozumím“, hlavní je ona (P1). |
| 3 „Pod 4“ v kroku 1 je pokles | **hotovo** | `NF.epLowBefore`, `NF.lowBeforeOwner`; pokles se připíše k předchozímu hlavnímu jídlu téhož dne aplikace (oběd → snídaně, večeře → oběd), u snídaně k noci a bazálu (`basalNights` `via: 'pred'`). Čistý jen při obvyklé porci a dávce podle plánu u toho jídla. Počítá se do karty po opakovaných poklesech, do Bezpečnosti a do blokace „zvýšit“. **Zvoleno jako nejopatrnější:** k předchozímu jídlu (klinicky správné), a i se zamítnutou B-HYPO (bezpečnostní větev). B-HYPO v3. |
| 4 Čas pod cílem blokuje „zvýšit“ | **hotovo** | D-POSTUP v2: bod 11 `prandHigh` a bod 5 `bazalHigh` „Čas pod cílem je pod mezí…“, fakt `podCilem` (blok jako bod 8, nepřepíná se), větev „ponechat – čas pod cílem nad mezí, nejdřív řešit nízkou glukózu“; `lowBlock` i u řádků bez návrhu a bez schváleného postupu; první položka „Co návrh oslabuje“. Mez = `C-CILE.tbrGoal` a `S-SEMAFOR.tbr3_max`. |
| 5 Výrazně vyšší dávka | **hotovo** | Nová položka **I-VYSSI** (klinická, ke schválení) a pravidlo v katalogu (8. pravidlo plánu); `NF.higherDose` (≥ plán + `I-VYSSI.nad_j` 2 j.); v kroku 3 karta pravidla a „Co dál: za 60 min…“, procházka se nenabízí (`advise`, `adviseAfter`: `higherDose`, `lowRisk`), sledování `kind: 'higher'` při uložení, opravě inzulinu i zpětném zápisu (`NF.watchEpisode`), karta na Dnes, otázka v hypoWatchCard. Platí i se zamítnutou I-VYSSI (zamítnutí vypne jen text pravidla). Bez rady o dávce, bez výzvy volat. |
| 6 Poklesy z exportu do 4 h | **hotovo** | `Z-IMPORT.pokles_min` 240; import uloží `ep.lowAfter` (nejnižší hodnota 180–240 min), průběh dál do 180 min, vrchol do 2 h; `NF.epLowAfter` (měření v čase jídla není pokles po jídle). Z-IMPORT v2 (provozní, bez stavu). |
| 7 Oprava a smazání do 24 h | **hotovo** | `NF.EDIT_WINDOW_H` 24 (mez vstupu, ne klinický práh), `NF.canEditEpisode`, `NF.editEpisode` (jídlo, porce, hodnota před jídlem, nejvyšší), `NF.deleteEpisode`; stopa `jidlo.zapis.opraven` (z čeho na co), `jidlo.zapis.smazan` (celý zápis); `ep.edited` → zápis do návrhu k dávce nejde, do učení ano (jako opravený inzulin). Na Dnes „Opravit zápis“ (porce) a „Smazat zápis“ s potvrzením. Oprava porce na menší s inzulinem v těle založí sledování. **UI má jen porci a smazání;** oprava jídla a hodnot je v jádře, obrazovka pro ni chybí (fáze 2). |
| 8 Předvyplnění „sedí podle dat“ | **hotovo** | `pr.dataOk`, `NF.verifyByData`, `NF.DATA_FACTS` (jen fakta měřená z dat); `NF.verifyState` bere: lékař → sestra → data; štítek „sedí podle dat“ a vybrané „Sedí“ u lékaře; změna lékařem jde do stopy s `protiDatum`. Bez schválené D-POSTUP se nepředvyplňuje. Bod „Pacient radu může běžně plnit“ (rozhovor) se nepředvyplňuje – zvoleno opatrně. |
| 11 Český čas | **hotovo** | `NF.TZ`, `NF.zoneIso` (Intl), výchozí `NF.now` v Europe/Prague; `NF.tzMismatch` (porovnává místní čas, ne název pásma) a věta S-PRIPOMINKY `pasmo` nahoře na Dnes; `NF.configure({ zone })` pro testy. Podzimní změna času jen v dokumentaci (K15). |
| 12 K-KRITERIA v2 | **hotovo** | `NF.ELIGIBILITY` + `noCorrection` „Bez korekčního schématu: žádné dávky navíc podle aktuální glukózy“, režim „Bazál 1× denně večer…“; souhrn položky. Bez všech pěti nejde dál. |

Body 9 (štítek dema) a 10 (písmo pacienta) do této fáze nepatří.

## 2. Nálezy z poslední kontroly

### Kód (`05-kod.md`)

| Nález | Výsledek |
|---|---|
| K1 minutový tik ukládá | **opraveno** – tik jen posune hodiny a překreslí; psaní do pole, změna role, `setState`, `reset` ukládají jen v zařízení bez háčku; háček jen po akci s `domainChanged` a `rev`. |
| K2 pohled ve sdíleném stavu | **opraveno** – `NF.VIEW_KEYS`/`NF.VIEW_PATHS`, `NF.domainOf`, `NF.mergeRemote` (odd. 4). Repro `check.cjs` 7a/7b sdílí celý stav bez API, proto hlásí dál „ANO“; s `domainOf` + `mergeRemote` role, stránka i rozpracovaný zápis zůstanou (test K2). |
| K3 pád vykreslení | **opraveno** – `safeRender`: nejdřív návrat na výchozí obrazovku (lokálně), pak záloha `…zaloha-vykresleni-<čas>` a nouzová obrazovka; čistý stav se nikdy neuloží ani nenahlásí; `NF.boot` i první vykreslení obalené; `NF.stateShapeOK` hlídá položky `basalLog`, `nights`, `hypoWatch`, `illnessLog`, `episodes[].points`, `manual`, `advice`. (`check4b.cjs`: háček `[]`; poškozený záznam jde do zálohy `zaloha-poskozeno` a pod hlavní klíč se po akci zapisuje jen v zařízení.) |
| K4 starší verze přepíše novější | **opraveno** – `NF.readOnly` (nic nezapíše ani nenahlásí, lišta „obnovte aplikaci“); po migraci ze starší verze se čistý stav nehlásí, dokud uživatel nezvolí „Začít znovu“ (`info.reset`). |
| K5 sady v repozitáři dema | **opraveno** – `rychle.test.cjs` bere skripty z `app/`, podsady bez souborů přeskočí s „SKIP“; `zlate-vystupy.test.cjs` přeskočí test s prezentační vrstvou. Ověřeno v repozitáři složeném podle tabulky „Co převzít“: zlaté výstupy 8 prošlo + 1 přeskočen, rychlá sada 12 prošlo, 3 sady přeskočeny. |
| K6 hodiny a pásmo | **opraveno** – český čas (bod 11); `mergeRemote` nepřebírá cizí hodiny; čistý stav převezme skutečný čas, i když je dřív než výchozí (`check.cjs` blok 11). |
| K7 „jinak (null j.)“ | **opraveno** – „pacient neví, zda podán“. |
| K8 den převzetí | **opraveno** – `NF.slotBeforePlan`, stav `before`; Dnes, tkanina, notifikace a jmenovatel souhrnu. |
| K9 výchozí role | **opraveno** – bez `?role=` pacient. |
| K10 velikost a výkon | **částečně** – import binárním vyhledáním (92 dní: 4,2 s → 43 ms); posílá se jen po akci s `domainChanged`. **Zbývá:** velikost stavu (0,5–1 MB; `points[].at`, komprese a rozdíly jsou věc vrstvy). |
| K11 předformátované texty | **částečně** – souhrn ze senzoru nese `from`/`to` ISO a formátuje se při vykreslení (`NF.sensorPeriod`). **Zbývá:** texty v rozpracované kontrole a ve stopě (doporučení: připravit pacienta z kapitoly bez zahájené kontroly – vrstva dema). |
| K12 `gone` z milisekund | **opraveno** |
| K13 vykreslení mění stav | **opraveno** – `weekSummary` nic nezapisuje, týden se označí v `settleFeedback`. |
| K14 kontrola vstupu | **opraveno** – `mealFinish` jen z kroku 3 s porcí, hodnotou a platnou odpovědí; `startReview` nad otevřenou kontrolou ji jen přepočítá (rozhodnutí zůstanou, `opts.force` založí novou); 13× `String(v)`; `revInstrToggle`/`instrToggle` jen z katalogu; `weekClose` jen ukázaný týden; `toggleQuestion` jen navržená nebo vybraná otázka. |
| K15 podzimní změna času | **jen dokumentace** (15 odst. 7a, komentář `NF.now`). |
| K16 testy, které nemohou selhat | **zbývá** (mimo zadání K6–K14). |

### Klinika (`01-klinika.md`)

| Nález | Výsledek |
|---|---|
| K1 pokles z exportu 3–4 h po jídle | **opraveno** (bod 6) – `d-export-pokles.cjs`: večeře teď má pokles „ze senzoru“. |
| K2 „pod 4“ teď | **opraveno** (bod 3) |
| K3 oprava „nepíchnuto → podáno“ | **opraveno** – `correctInsulin` → `NF.watchEpisode`. |
| K4 dolní cíl pod 3,9 | **opraveno** – `c4-dolni-cil.cjs`: karta „pod cílem“ při 3,9, 3,5 i 3,0. |
| K5 čas pod cílem | **opraveno** (bod 4) – `g-tbr.cjs`: větev „ponechat – čas pod cílem nad mezí“, bod 11 proti datům. |
| K6 vyšší dávka | **opraveno** (bod 5) – `f-vyssi-davka.cjs`: procházka se nenabízí. |
| K7 „nad 15“ vs parametr | **opraveno** – I-VYSOKA pevně 15 (`fixed`, meze 15–15); zvoleno jako nejopatrnější a stejné jako I-HYPO. |
| K8 jádro nehlídá „jinak než postup“ | **opraveno** – `NF.decideProposal` porovná směr dávky s větví v okamžiku rozhodnutí; větev se zapisuje (`postup`). Řeší i ordinace S5. |
| K9 `minNoci` u noci pod 3,0 | **zbývá** – otázka pro vlastníka (15 to dnes výslovně tak říká). |
| K10 pokles před jídlem připsaný dalšímu jídlu | **opraveno** – měření v čase jídla je hodnota před jídlem; pokles patří předchozímu jídlu (bod 3). |
| K11 meze registru | **opraveno** – `D-POSTUP.poklesy_od` 1–2, `D-PRAND.hypoPodil` 0,05–0,5, `B-HYPO.poklesy` 1–3 a `dny` 7–14, meze I-*; okno pro dávku nikdy širší než pro učení (`NF.tolerance`). |
| K12 „podáno → nepíchnuto“ | **opraveno** – nezodpovězená otázka `void`, stopa `hypo.sledovani.zruseno`. |
| K13 I-MENE {v} vs `pripominka_min` | **zbývá** (mimo zadání); I-VYSSI má {v} pevně 60 kvůli témuž. |
| K14 pevná čísla v kódu | **opraveno** – `D-PRAND.velmiNizka`, `D-BAZAL.velmiNizka` (3,0), `Z-IMPORT.noc_od`/`noc_do`/`spani_od`, `B-HYPO.ranni_otazka_h`/`zpetne_h`, text „svačina do {D-CISTA.svacina_min} min“, procházka zpětně `NF.walkWindow`. „Pod 3,0“ v souhrnu senzoru zůstává (standardní hranice času pod 3,0 a semaforu). |
| K15 `advise` s `none` | **zbývá** (z obrazovek nedosažitelné). |

### Ordinace (`03-ordinace.md`)

| Nález | Výsledek |
|---|---|
| V1 zelená i s pod 3,0 | **opraveno** – `v4.cjs` S1: `bad`. |
| V2 jiné období, 1 řádek, `min_dni` | **opraveno** – export mimo období plánu odmítnut, částečný oříznut (hláška); pod `min_dni` stav `few` (bez hodnocení), bod o vyrovnání bez vyhodnocení. |
| V3 délka kontroly | **částečně** přes bod 8 (předvyplnění). |
| S1 pozdní export | **opraveno** – `NF.recomputeReview` po nahrání. |
| S2 druhá kontrola | **opraveno** – `NF.sensorImportFor`, `NF.illnessDays(S, plán, do)`, `NF.periodHypoWatch`, `NF.periodNights`, „minule“ u hmotnosti; část sestry „export nenahrán“ (i S8). |
| S3 zaokrouhlení času v cíli | **zbývá** (mimo zadání; změnilo by modelová čísla 68 %). |
| S4 kdo jednal | **opraveno** – `NF.whoOf` (sestra), řádek stopy „… · postup: zvýšit · jinak než postup“. |
| S5 „jinak než postup“ ve směru větve | **opraveno** (s klinikou K8). |
| S6 jiný lék u karet k dávce | **zbývá** (mimo zadání). |
| S7 93 dní nemoci | **opraveno** |
| S8 nepoužívání aplikace | **částečně** – štítek „export nenahrán“; návrh „pacient aplikaci skoro nepoužíval“ zbývá. |
| S9 „lékař náš návrh zamítl“ | **opraveno** – pacient čte „beze změny“. |
| N3 důvod řádku bazálu | **opraveno** |

### Pacient (`02-pacient.md`)

| Nález | Výsledek |
|---|---|
| K1 půlnoc | **opraveno** (bod 1) |
| K2 druhé jídlo | **opraveno** (bod 2) |
| K3 „Zahodit“ po inzulinu | **opraveno** – „Nebudete jíst?“ → vynechané jídlo s inzulinem (`skipMeal`), pravidlo, otázka, stopa `pravidlo.mene` `zahozeno`. |
| K4 časové pásmo | **opraveno** (bod 11) |
| V1 zapomenutá snídaně | **opraveno** – `focusMeal` `then`/`missed`; „Doplnit snídani“, „Na řadě je … · Chystám se jíst“; bez „až zítra ráno“, když jídlo dne chybí. |
| V2 oprava zápisu | **opraveno** (bod 7) |
| V3 nesmyslné názvy | **opraveno** – `NF.validFoodName` („Napište název jídla slovy.“). „Odebrat / přejmenovat jídlo“ zbývá. |
| S2 otázka po vynechaném jídle | **opraveno** – „Včera jste vynechali snídani…“ bez hodiny; po 24 h „bez odpovědi“ (beze změny). |
| S5 texty | **opraveno** – bez „upřesní se“, „do učení“, „v podkladech“, „rozdělte na dvě“; „kolem 9 mmol/l“, „kolem 13 mmol/l“; „v Mém plánu“ (i v jádře). |
| S6 „zapište ho ještě 4×“ | **opraveno** – „Zatím ho neznáme. Poznáme ho, až ho zapíšete čtyřikrát.“ |
| N1 „ještě 0 minut“ | **opraveno** |
| ostatní (V4–V6, S1, S3, S4, S7–S9, N2–N8) | **zbývá** – mimo zadání této fáze (V4 písmo = bod 10, fáze 2). |

## 3. Nové položky a parametry (vše „ke schválení“, provozní bez stavu)

| Položka | Verze | Co je nového |
|---|---|---|
| **I-VYSSI** Vyšší dávka než v plánu (klinická, nová) | v2* | znění pravidla (odd. 4.5 v `15`), `v` 60 (pevně, meze 60–60), `nad_j` 2 (meze 1–10) |
| B-HYPO | v3 | „pod 4“ před jídlem = pokles, sledování po vyšší dávce, „Zapsat svačinu“; `ranni_otazka_h` 5 (4–9), `zpetne_h` 4 (2–6) |
| D-POSTUP | v2 | bod 11 `prandHigh` a bod 5 `bazalHigh` (čas pod cílem), větve; předvyplnění „sedí podle dat“ |
| K-KRITERIA | v2 | bazál 1× denně večer, bez korekčního schématu |
| D-PRAND | v2 | `velmiNizka` 3,0 (2,5–3,5) |
| D-BAZAL | v2 | `velmiNizka` 3,0 (2,5–3,5) |
| Z-IMPORT (provozní) | v2 | `pokles_min` 240 (180–360), `noc_od` 0 (0–3), `noc_do` 6 (5–8), `spani_od` 21 (20–23); texty `jineObdobi`, `castObdobi` |
| S-PRIPOMINKY (provozní) | v2 | `den_konec` 4 (2–6); text `pasmo` |
| I-VYSOKA | beze změny znění | v katalogu `fixed: true`, hodnota 15 (meze 15–15) |

\* I-VYSSI dostala „v2“ stejným mechanismem jako ostatní pravidla s krátkou podobou (SCHEMA 86, `registry.js`); je to její první znění.

Registr: **43 položek, 29 klinických, 14 provozních**; pravidel v plánu 8. Meze nově i u `I-MENE.v` 15–240, `I-NEVIM.v` 15–240, `I-NEMOC-BAZAL.v` 1–12, `I-NEMOC-JIDLO.v` 10–25.

## 4. API pro synchronizaci (v `app/core.js`, komentář u `NF.VIEW_KEYS`)

- **Doména a pohled.** `NF.VIEW_KEYS` = `clock, role, page, draft, meal, wizardStep, toast, error, form, reg, foodOpen, foodsSeg, fixInsulin*, vsPick, basalOther, basalUnits, ask, traceOpen, traceWho, traceLimit, previewTile, editEp, rev, actor` (+ klíče `tour*`); `NF.VIEW_PATHS` = `review.step/index/tile/other`, `training.previewPage/preview`, `onboarding.page`. `NF.isViewKey(k)`.
- `NF.domainOf(S)` → kopie domény (to, co se posílá); `NF.domainJson(S)` → řetězec.
- `NF.mergeRemote(místní, vzdálený)` → `{ ok, state, reason }`; `reason`: `newer` (vzdálený má vyšší schema – klient se musí obnovit), `older`, `stale` (vzdálený `rev` < místní), `shape`. Převezme doménu, ponechá místní pohled (i vnořený), `rev` ze vzdáleného, hodiny `NF.now()` (v ukázce max). Po úspěchu zavolat `NF.setState(state)` – ukládá jen v zařízení, háček nevolá.
- `NF.save(S, { action, local, reset })`; háček `NF.onChange(fn)` → `fn(S, { saved, key, action, domainChanged, rev, schema, reset })` jen po akci (`act`), ne při tiku, psaní, `setState`, bootu ani migraci. Vrstva posílá jen při `domainChanged`; `reset: true` jen po „Začít znovu“.
- `S.rev` = pořadí doménové verze (zvýší ho uložení s akcí, když se doména změnila); doporučený podmíněný zápis na serveru (`rev` serveru = `rev`, ze kterého klient vyšel), při konfliktu načíst, `mergeRemote`, akci zopakovat. Server má odmítnout nižší `schema` a `clock` v budoucnosti. ID zápisů (`E-n`, `W-n`, `Q-n`) dál počítá každé zařízení – pro souběh dvou zápisů potřebuje vrstva předponu zařízení.
- `NF.readOnly` (novější stav v úložišti), `NF.backup(S, proč)`, `NF.recomputeReview(S, proč)`, `NF.configure({ now, storage, zone })`, `NF.tzMismatch()`.

## 5. Testy

| Sada | Výsledek |
|---|---|
| `schema90-jadro.test.cjs` (nová, jádro + produkční sestavení bez `demo/`) | **37 prošlo, 0 selhalo** |
| `rychle.test.cjs` (na kopii makety) | **15 prošlo, 0 selhalo**, 33 s (vč. podsad zlaté výstupy, schema90, P1–P11, tokeny) |
| `zlate-vystupy.test.cjs` | 9 prošlo |
| repozitář dema podle „Co převzít“ | zlaté výstupy 8 + 1 přeskočen; rychlá sada 12 prošlo, 3 sady přeskočeny s hláškou |
| celá sada `nutrifee-rozhodovaci-maketa.test.cjs` (kopie makety) | **130 prošlo, 14 selhalo**; poté opraven test „Registr R13“ (čtení `I-VYSSI.v`, ověřeno samostatně) → **131 / 13**. Všech 13 zbývajících selhání patří prezentační vrstvě (odd. 7). Před změnami 144 / 0. |

**Zlaté výstupy přegenerované záměrně** (`node zlate-vystupy/generuj.cjs`; `rady.json` beze změny): `otisky.json` 43/29 a nové verze; `pribeh.json` – 8 pravidel v plánu, pátá podmínka zařazení (+1 událost), `naRade.then`/`missed` ve scénách 10, 14, 19 a 21 (V1), období senzoru ISO, `sensorImport.planId`; `kontrola.json` – bod 11 (ověření, fakta, větve, stav bodu), větev v okamžiku rozhodnutí (`postup`), přesný důvod řádku „Bazál – bez návrhu“, `lowBlock` u řádků; `stopa.json` – +1 `zarazeni.podminka`. Žádná změna rad, větví příběhu ani dávek.

Repro skripty z kontroly (na kopii): `k36-kod/check.cjs` bloky 1, 3–6, 9a, 11–13 „ne“ (7a/7b/8 simulují sdílení celého stavu bez nového API, viz K2); `check-takeover.cjs`, `check-render.cjs` opraveno; `k36-klinika/g-tbr`, `d-export-pokles`, `f-vyssi-davka`, `c4-dolni-cil` opraveno; `k36-ordinace/skripty/v4` S1, S3, E6 a `v5` E8 opraveno.

## 6. Pro fázi 2 (vzhled, obrazovky, přístupnost)

Nové prvky používají jen existující třídy; chybí tyto styly (žádné pevné barvy nepřidány):
- `.hint.neutral.tz-note` – věta o českém čase nahoře na Dnes.
- Uzel pásu dne ve stavu „před plánem“ (dnes `dnode wait` s textem „před plánem“) – vlastní tlumený styl `.dnode.before`.
- Řádek vedlejších tlačítek „Doplnit snídani“ (`actions split mt-2` + `btn quiet sm`) a „Na řadě je … · Chystám se jíst“ (`btn quiet`) v „Co teď“.
- Hero ve stavu „další“: hlavní „Zapsat svačinu“ a dvě vedlejší tlačítka – ověřit rozložení na 320 px.
- Panel opravy zápisu v `.fix-ins` (porce `choice-row`, „Smazat zápis“ `btn quiet sm`, potvrzení `hint warn`, `btn danger sm`).
- Štítek „sedí podle dat“ (`tag ok`) a vybrané „Sedí“ u předvyplněného bodu; dlaždice času v cíli ve stavu `few` (dnes `c-none`) – zvážit vlastní vzhled „bez hodnocení“.
- Lišta „data z novější verze“ (`.error`) a tlačítko „Začít znovu“ v hlášce o migraci.
- Obrazovky: oprava zápisu umí v jádře i jídlo a hodnoty (`NF.editEpisode`), UI zatím jen porci a smazání; karta I-VYSSI na Dnes a v kroku 3 (`eventCard`/`doctorCard`, `low`); otázka „pod 4?“ po vyšší dávce.
- Přístupnost: fokus po „Opravit zápis“, „Smazat“ a po „Nebudu jíst“; nová tlačítka v „Co teď“ v pořadí Tab; čtečka u stavu „před plánem“. Písmo pacienta (bod 10) a nálezy `07-pristupnost.md`.

## 7. Pro fázi 3 (prezentační vrstva a předání)

- **Průvodce** (`demo/guide.js`): nová položka I-VYSSI (pět oddílů a `ucinek`), „Co schvalujete“ u nových verzí B-HYPO v3, D-POSTUP v2, K-KRITERIA v2, D-PRAND v2, D-BAZAL v2; provozní Z-IMPORT a S-PRIPOMINKY (popis `den_konec`, `pasmo`, `pokles_min`).
- **Mapa scén** (`demo/scene-items.js`): přegenerovat (I-VYSSI, nové body D-POSTUP); otisky `fp`/`fpGuide` u rozhodnutí garanta se u nových verzí změní („rozhodnuto k předchozímu znění“).
- **Cíle kroků a vyprávění** (`demo/tour-content.js`): krok podmínek zařazení má pátou podmínku; ve scénách 10, 14, 19, 21 je u otázky „Byla dnes …?“ vedlejší volba jídla na řadě; ve stavu „další“ je hlavní „Zapsat svačinu“ (krok, který klepal „Chystám se jíst“ do 3 h po jídle, ověřit); u lékaře body předvyplněné z dat (kroky „Sedí“ u nich už nic nemění, vyprávění o „Vše sedí“ ověřit); bod 11; řádek stopy „· postup: …“; počty 28 → 29 položek.
- **Předání** (`predani/01-cesta-k-demu.md`): popsat API z odd. 4 místo „poslední zápis vyhrává“ nad celým `S`; doplnit `schema90-jadro.test.cjs` do tabulky „Co převzít“; „42 položek, 7 pravidel“ → 43 a 8; štítek dema (bod 9).
- **Selhávající testy prezentační vrstvy (13):** v celé sadě „Panel vyprávění (8. 10.)“, „Celou maketu … jen tlačítkem Další“ (enroll krok 4: tour klepe jen čtyři podmínky – `demo/tour-content.js` ř. 97 doplnit `noCorrection`; `D.cardEligibility` ve `fixtures.js`), „Tempo průchodu“, „Průchod pro garanta (7. 10.)“ (I-VYSSI bez průvodce), „Průchod pro garanta (8. 10.)“ a „Souhrn rozhodnutí na celou šířku“ (28 → 29 položek), „Sedm rozhodnutí z 18. 10.“ („Rozhodnuto N z 28“), „Bezpečnost (23. 10.)“ (výsledky správce „1 z 28“); sady `faze2-pribeh` (citace ve vyprávění, průchod), `pravdivost` T1–T4 (mapa scén, průvodce, `ucinek`), `kontrola2-obsah` (`ucinek` u I-VYSSI, 2 testy), `kontrola4-panel` (nabídka položek v příběhu), `ukladani` (3 testy: 28 položek, `fpGuide` u I-VYSSI). Testy jádra a obsahu pacienta procházejí.

## 8. Co `15` ani rozhodnutí neurčovaly (zvoleno nejopatrněji, zapsáno v `15`)

- Pokles před jídlem patří k předchozímu jídlu dne, u snídaně k noci; počítá se i se zamítnutou B-HYPO.
- Vyšší dávka = o 2 j. a víc (`I-VYSSI.nad_j`); sledování a zákaz procházky platí i se zamítnutou I-VYSSI.
- I-VYSOKA pevně 15; I-VYSSI {v} pevně 60 (shodně s otázkou B-HYPO).
- Opravený zápis do učení jde, do návrhu k dávce ne (jako opravený inzulin); okno 24 h je konstanta jádra (mez vstupu).
- Předvyplňují se jen fakta měřená z dat, ne body o rozhovoru; bez D-POSTUP nic.
- Z-IMPORT a S-PRIPOMINKY zůstávají provozní (nová verze bez stavu).
- Export mimo období plánu se odmítne celý / ořízne; měření „z budoucnosti“ se nezahazují (posun pásma exportu).
- Druhé „Zahájit kontrolu“ kontrolu jen přepočítá (rozhodnutí zůstanou).

## Shrnutí

SCHEMA 90 fáze 1 je v jádře hotová: deset rozhodnutí vlastníka (1–8, 11, 12) a opravy jádra a akcí z poslední kontroly. Synchronizace má oddělenou doménu a pohled s `NF.mergeRemote`, háček hlásí jen akce a pád vykreslení ani starší klient už data nepřepíšou. Přibyla položka I-VYSSI a sedm nových verzí ke schválení. Testy jádra a rychlá sada procházejí, i v repozitáři dema. Zbývá prezentační vrstva (průvodce, mapa scén, vyprávění – fáze 3) a vzhled nových prvků a písmo pacienta (fáze 2).
