# NutriFee – předání programátorovi

Tyto podklady popisují stav makety **SCHEMA 88** k 8. 11. 2026. Podle makety se programuje ostrá aplikace.

## Jak číst

1. [`00-postup.md`](00-postup.md) – co NutriFee je, co aplikace nikdy nedělá, architektura a **17 etap programování v pořadí**. U každé etapy je, co postavit, které testy převzít jako specifikaci a kdy je etapa hotová. Drž se tohoto pořadí.
2. [`10-atlas-pacient.md`](10-atlas-pacient.md) – 57 obrazovek aplikace pacienta (P01–P57).
3. [`20-atlas-ordinace.md`](20-atlas-ordinace.md) – 30 obrazovek ordinace: lékař, sestra a registr (O01–O30).
   - U obou atlasů má každá obrazovka snímek z `obrazovky/` a popis: co to je, k čemu je, souvislosti, co se na ní počítá, pravidla, stavy, stopa, na co si dát pozor a které testy ji hlídají.
4. [`30-prilohy.md`](30-prilohy.md) – slovník, registr položek s parametry a mezemi, katalogy, co se nesmí vracet, testy jako specifikace.

## Zdroj pravdy

- [`zdroj/15-ZDROJ-PRAVDY-MAKETA.md`](zdroj/15-ZDROJ-PRAVDY-MAKETA.md) je jediný zdroj pravdy. Při rozporu platí chování makety v tomto repozitáři (`app/` je jádro, které se přenáší; `demo/` je prezentační vrstva, která se nepřenáší).
- Odkazy `navrhy-designu/…` v textech vedou do [`zdroj/navrhy-designu/`](zdroj/navrhy-designu/). Odkazy na `15-ZDROJ-PRAVDY-MAKETA.md` vedou do `zdroj/`.
- Otevřené rozpory jsou na konci každé části. Rozhoduje je vlastník; do té doby platí maketa.

## Maketa a testy

- Živá ukázka: <https://rudasrr.github.io/nutrifee-rozhodovaci-maketa/>
- Testy spustíš v kořeni repozitáře příkazem `node nutrifee-rozhodovaci-maketa.test.cjs`. Dvě dílčí sady čtou soubory o úroveň výš: `../15-ZDROJ-PRAVDY-MAKETA.md` a `../navrhy-designu/04-pohledy-2026-10-05/scene-items.cjs`. Zkopíruj je z `predani/zdroj/` vedle složky repozitáře, a to se stejnou cestou. Repozitář naklonuj do složky `maketa-rozhodovaci`, protože generátor mapy scén ji hledá pod tímto názvem.
