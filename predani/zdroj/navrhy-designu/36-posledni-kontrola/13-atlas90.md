# 36 / 13 – Předávka programátorovi podle SCHEMA 90

*11. 11. 2026 · zdroj: kód SCHEMA 90 ve veřejné kopii (`~/Documents/Nutrifee/nutrifee-rozhodovaci-maketa`, jádro shodné s Diskem v době práce), snímky `predani/obrazovky/` ze SCHEMA 90 a zprávy `05-rozhodnuti.md`, `08`–`11`. Na `app/`, `demo/` ani testy jsem nesahal, nic necommitováno ani nepublikováno.*

Změněné soubory v `maketa-rozhodovaci/predani/`: `00-postup.md`, `10-atlas-pacient.md`, `20-atlas-ordinace.md`, `30-prilohy.md`, `40-design-system.md`, `AGENTS.md`. Pracovní kopie `navrhy-designu/34-predani-programatorovi/predani/` je srovnaná pomocí `rsync -a` (bez `README.md` a `zdroj/`).

## Jak jsem ověřoval

- **Snímky:** u pacienta jsem porovnal texty snímků SCHEMA 90 (`atlas87/atlas-meta.json` ze snímání 10. 11.) se staršími. Změna se ukázala u 26 obrazovek, a ty jsem prošel proti kódu. U ordinace jsem si prohlédl snímky O02, O10, O12, O14 a O15.
- **Kapitoly:** řádky „Kapitola“ (scéna a počet klepnutí) u všech 57 obrazovek pacienta sedí na data snímání SCHEMA 90.
- **Funkce:** skript `scratchpad/a90/check-ids.cjs` ověřil, že každé `NF.*` a `V.*` v dokumentech existuje v kódu SCHEMA 90. Jediný nález je zástupný `NF.xxx`/`V.xxx` v úvodu atlasu ordinace, a to je záměr.
- **Testy:** skript `scratchpad/a90/check-tests.cjs` ověřil citované názvy testů. Ve 20 souborech je 432 názvů. Každá citace v řádcích o testech je začátkem některého názvu; zbylé nálezy jsou texty obrazovek, ne testy.
- **Odkazy:** skript `scratchpad/a90/check-links.cjs` prošel 118 relativních odkazů. Chybný není žádný, všech 87 snímků je použitých a žádný soubor není prázdný.

## Atlas pacienta (`10-atlas-pacient.md`)

Poznámku nahoře jsem nahradil větou, že atlas odpovídá SCHEMA 90. Opravil jsem stav makety, poznámku ke snímkům a datum ověření kapitol.

Do společných pravidel přibyly dva oddíly:
- **Písmo pacienta:** 17 a 15 px, skládání tokenů v `.patient-shell`, test `tokeny`.
- **Český čas a den aplikace do 4:00:** `NF.TZ`, `NF.appDay` a věta o cestování.

Doplnil jsem také stopu `pravidlo.vyssi`, stav slotu „před plánem“, svačinu jako `meal: 'snack'` (dřív chybně „čtvrtý a další zápis“) a mapu přechodů („Doplnit snídani“, „Opravit zápis“, „Nebudete jíst?“).

| Obrazovka | Oprava |
|---|---|
| P05, P54 | I-VYSSI v pravidlech, osm názvů, pořadí v Bezpečí (I-VYSSI na konci) |
| úvod B (Dnes) | nový výběr slotu `NF.focusMeal` (`then`, `missed`), „Zapsat svačinu“ do 3 h, přednost bezpečnostní karty, „Potom: doplňte chybějící jídlo dne“, věta o čase, „Opravit zápis“ v pásu dne |
| P08 | „před plánem“ v den převzetí odpoledne, věta o čase, testy `schema90-jadro` |
| P09 | přepsáno: hlavní „Zapsat svačinu“, „Chystám se na oběd“, bez „Dnes bez oběda“; oprava a smazání zápisu do 24 h (`NF.canEditEpisode`, `NF.editEpisode`, `NF.deleteEpisode`, akce `mealEdit*`, stopa `jidlo.zapis.opraven`/`smazan`, ne do návrhu k dávce) |
| P10 | vedle „Opravit zápis“; oprava inzulinu zakládá a ruší sledování (`hypo.sledovani.zruseno`) |
| P11, P12, P13 | vedlejší „Na řadě je oběd · Chystám se jíst“, včerejší zápis s „Opravit zápis“; P12 i „Nebudete jíst?“ z kroku 1 (`where: 'zahozeno'`) |
| P14 | stav „další“ na snímku, „kolem 9 mmol/l“ |
| P15, P16 | karta a otázka po vyšší dávce (I-VYSSI), nadpis po vynechaném jídle bez hodiny, `ranni_otazka_h`, `zpetne_h` |
| P17, P18 | „pod 4“ před jídlem jako pokles (`NF.epLowBefore`, `NF.lowBeforeOwner`), pokles z exportu do 4 h, oznámení u zamítnuté I-HYPO, eyebrow „Bezpečí“ |
| P20–P25 | stav „Co teď“ na snímcích, P22 „Doplnit snídani/večeři“ a „Potom“, P23 podmínka stavu, P24 bez opravy inzulinu, P25 vztah k I-VYSSI |
| krok 1 (úvod), P27, P30, P31, P36, P38 | „Nebudete jíst?“, vyšší dávka a I-VYSSI, „pod 4“ jako pokles se všemi důsledky, I-VYSOKA pevně 15, den aplikace u zpětného zápisu, `zpetne_h` |
| P41, P42, P45, P46, P47 | svačina jako hlavní tlačítko, nový text „Zatím ho neznáme. Poznáme ho, až ho zapíšete čtyřikrát.“, „pod 4“ jako pokles, procházka ani po vyšší dávce |
| krok 3 (úvod) | karta I-VYSSI, `res.lowRisk`, uložení jen z kroku 3 |
| stavy bez snímku | věta o čase, I-VYSSI, „Smazat zápis?“, „Nebudete jíst?“, „před plánem“, `NF.readOnly`, migrace a „Začít znovu“, nouzová obrazovka |
| rozpory | nový oddíl „Vyřešeno v SCHEMA 90“ a seznam nedodělků (oprava jídla a hodnot jen v jádře, fokus V3, dva přesahy při 320 px, „sedm“ v souhrnu R-POKYNY) |

## Atlas ordinace (`20-atlas-ordinace.md`)

Poznámku nahoře jsem nahradil větou o SCHEMA 90 a opravil jsem stav, ověření kapitol a poznámku ke snímkům. V odd. 4.1 jsou teď 43 položek a 29 klinických (I-VYSSI), v tabulce položek nové verze a parametry (B-HYPO v3, D-POSTUP v2 s 11 a 5 body, K-KRITERIA v2, D-PRAND a D-BAZAL `velmiNizka`, Z-IMPORT v2, S-PRIPOMINKY v2). V odd. 4.3 přibyl aktér „sestra“ (`NF.whoOf`), `kontrola.prepocet`, `dataOk`/`protiDatum` u `navrh.overeni` a `postup` u `navrh.rozhodnut`. Do odd. 5 přibyly náhledy telefonu jen ke čtení (`previewBody`, `inert`, `.preview-scroll`) a lišta novější verze.

| Obrazovka | Oprava |
|---|---|
| 2.1, 2.3 | pět podmínek, pozdní export přepočítá kontrolu, body „sedí podle dat“ |
| O02 | pět podmínek (`noCorrection` bez štítku z karty), K-KRITERIA v2, test „Bod 12“ |
| O03, O23 | osm pravidel, pevné hodnoty I-VYSOKA a I-VYSSI |
| O05, O22 | náhled `inert` s posuvným rámečkem |
| O09–O11 | „export nenahrán“, export jen za období plánu (`jineObdobi`, `castObdobi`), `ep.lowAfter` do 240 min, noci z parametrů, `NF.recomputeReview`, druhá kontrola bez dat minulého období |
| O12 | „Návrhy 0 z 8“, semafor: `few` „bez hodnocení · málo dní dat“ a červená při pod 3,0 ≥ 1 %, text dlaždice pod 3,9 |
| O13 | skutečný seznam podkladů ze snímku, Bezpečnost s poklesy „pod 4“ před jídlem a z exportu |
| O14 | stav snímku (10 z 11 předvyplněno, čeká bod 1), předvyplnění `NF.verifyByData`, `NF.DATA_FACTS`, pořadí lékař → sestra → data, bod 11 „Čas pod cílem je pod mezí“ |
| O15 | 11 z 11, „Ostatní větve postupu (11)“, směr proti větvi určuje jádro, `postup` ve stopě |
| O16–O18 | „jinak než postup“ v jádře, `bazalHigh` 5 bodů, noc pod `velmiNizka`, „pod 4“ před snídaní jako noční pokles, „pacient neví, zda podán“, `lowBlock` i z času pod cílem |
| O25, O28, O30 | 29 položek, Z-IMPORT v2, nové události stopy a řádek „· postup: …“ |
| rozpory | nový oddíl „Vyřešeno v SCHEMA 87 a 90“; R9 zůstává otevřený |

## Přílohy (`30-prilohy.md`)

Skripty `generuj.cjs` a `sestav.cjs` ve scratchpadu chyběly, ve složce zbyla jen šablona ze SCHEMA 87. Proto jsem je napsal znovu a uložil do `scratchpad/predani-skripty/`:
- `generuj.cjs` načte jádro a `app/data/` z veřejné kopie a vygeneruje `out/registr.md`, `out/katalogy.md` a `out/testy.md`.
- `sestav.cjs` vloží tabulky do dnešního `30-prilohy.md`, ne do šablony, protože šablona je starší než dnešní slovník a odd. 4.

Výsledek generátoru:

| Co | Počet |
|---|---|
| položky registru | 43 (29 klinických, 14 provozních) |
| pravidla I-* | 8 |
| návyky | 6 |
| jídla | 171 |
| testové soubory | 20 |
| zapsané testy | 432 |
| řádky hlavní sady | 144 |
| řádky rychlé sady | 15 |
| řádky zlatých výstupů | 9 |
| řádky v seznamu testů | 455 |

V seznamu testů je nová sada `schema90-jadro.test.cjs` (37 testů) a popisy souborů `tokeny`, `rychle` a `zlate-vystupy` jsou opravené. Generátor nepustí do tabulky jméno služby úložiště.

Ve slovníku přibyly tyto pojmy:
- den aplikace,
- český čas,
- před plánem,
- oprava a smazání zápisu,
- výrazně vyšší dávka,
- pokles před jídlem,
- pokles z exportu,
- čas pod cílem nad mezí,
- export za jiné období,
- sedí podle dat,
- bez hodnocení,
- doména a pohled.

Opravil jsem i svačinu, „Co teď“, pravidla I-*, zařazení, stopu, 29 položek a SCHEMA 90 v úvodu i ve slovníku.

## Postup (`00-postup.md`), `AGENTS.md`, `40-design-system.md`

- **00:** opravil jsem stav, zásady (pokles „pod 4“, I-VYSSI, štítek dema), počty v tabulce 1.3, příkazy, oddíl o čase, přístupnost 17/15 px a API synchronizace v 2.3 (`NF.domainOf`, `NF.mergeRemote`, `NF.onChange` s `domainChanged`/`rev`, `NF.readOnly`) i v etapě 11. V etapách 0–3, 5, 7–9 a 11–13 jsou nové funkce, položky, parametry a testy `schema90-jadro`. Do odd. 5 přibyly body 3 (rozhodnutí 13–15, v kódu až SCHEMA 91) a 4 (nedodělky SCHEMA 90). Do odd. 6 přibyl oddíl „Vyřešeno v SCHEMA 90“ s body 1–12.
- **AGENTS:** opravil jsem stav SCHEMA 90, zásadu 3, štítek dema podle rozhodnutí 9, háček `NF.onChange` a `NF.mergeRemote`, český čas a den do 4:00, písmo pacienta, příkaz `schema90-jadro` a kontrolní počty (43/29/14, 8, 171, 20 souborů, 432, 15/9/144) a P2 se „Zapsat svačinu“.
- **40:** tabulky jsem znovu vygeneroval skriptem `predani89/gen-ds.cjs` nad SCHEMA 90. Přibyly 2 tokeny (297) a karta `#c-schema90`; zásady písma jsou doplněné.

## Co zbývá (mimo zadání)

- **`01-cesta-k-demu.md`:** v řádku 174 zůstalo „Čísla 144 a 393“. Dnes je zapsaných testů 432; soubor nebyl v mém zadání.
- **`predani/index.html`:** soukromá stránka předávky je sestavená ze starších textů a po této úpravě je potřeba ji znovu sestavit (`34-predani-programatorovi/stranka/build.cjs`). Pracovní kopie po rsyncu obsahuje i ji.
- **Souhrn R-POKYNY v `app/data/registry.js`:** říká „Sedm bezpečnostních pravidel“, ale plán jich nese osm. V příloze 2 je to vidět, protože tabulka bere text z kódu.
- **Referenční běh celé sady:** běh nad SCHEMA 90 jsem neměl k dispozici; dokumenty proto uvádějí „144 řádků OK, když vše projde“.
- **Šablona `30-prilohy.sablona.md`:** zůstala ze SCHEMA 87. `sestav.cjs` ji nepotřebuje.
