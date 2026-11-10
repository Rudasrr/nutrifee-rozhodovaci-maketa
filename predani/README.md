# NutriFee – předání programátorovi

Tyto podklady popisují stav makety **SCHEMA 89** k 9. 11. 2026. Vedou ke dvěma cílům. Začněte první cestou.

## Cesta 1: první demo (teď)

Vlastník 9. 11. 2026 rozhodl, že první demo se staví **nad převzatým jádrem makety**: aplikace pacienta na telefonu (PWA na iPhonu i Androidu), ordinace v prohlížeči, sdílený stav přes server, jen syntetická data. 10. 11. 2026 doplnil, že demo má vypadat jako ostrá aplikace pro lékaře a garanta k vyzkoušení (přihlášení, seznam pacientů, skutečný čas, schválená pravidla).

1. [`01-cesta-k-demu.md`](01-cesta-k-demu.md) – co je první demo, co převzít, co postavit, co vynechat, plán po dnech a první úkol. **Čtěte jako první.**
2. [`AGENTS.md`](AGENTS.md) – pokyny pro AI asistenta. Zkopírujte ho do kořene repozitáře dema.
3. Atlasy obrazovek použijte jako příručku k úkolu, ne jako povinné čtení předem:
   - [`10-atlas-pacient.md`](10-atlas-pacient.md) – 57 obrazovek aplikace pacienta (P01–P57),
   - [`20-atlas-ordinace.md`](20-atlas-ordinace.md) – 30 obrazovek ordinace: lékař, sestra a registr (O01–O30).
   - Každá obrazovka má snímek z `obrazovky/`, řádek „Kapitola“ (kde ji v příběhu najdete živě) a popis: co to je, k čemu je, co se na ní počítá, pravidla, stavy, stopa, na co si dát pozor a které testy ji hlídají.
4. [`40-design-system.md`](40-design-system.md) – tokeny, typografie, barevné role s kontrasty, komponenty a jak číst katalog `design-system/`.

## Cesta 2: ostrá aplikace (později)

[`00-postup.md`](00-postup.md) popisuje ostrou aplikaci v **17 etapách** (0–16): architekturu, server, schvalování garantem, regulaci a kontrolní seznam před ostrým provozem. U každé etapy je, co postavit, které testy převzít jako specifikaci a kdy je etapa hotová. Pro demo z něj potřebujete jen zásady (odd. 1.2). O tom, zda se jádro pro ostrý provoz přepíše, rozhodne vlastník po demu.

[`30-prilohy.md`](30-prilohy.md) patří k oběma cestám: slovník, registr položek s parametry a mezemi, katalogy, co se nesmí vracet a testy jako specifikace.

## Zdroj pravdy

- [`zdroj/15-ZDROJ-PRAVDY-MAKETA.md`](zdroj/15-ZDROJ-PRAVDY-MAKETA.md) je jediný zdroj pravdy. Při rozporu platí chování makety v tomto repozitáři (`app/` je jádro, které se přenáší; `demo/` je prezentační vrstva, z níž se pro demo bere jen `fixtures.js`).
- Odkazy `navrhy-designu/…` v textech vedou do [`zdroj/navrhy-designu/`](zdroj/navrhy-designu/). Odkazy na `15-ZDROJ-PRAVDY-MAKETA.md` vedou do `zdroj/`. Některé odkazy uvnitř `15` míří na podklady, které v `zdroj/` nejsou; jsou to historické podklady a k programování nejsou potřeba.
- Otevřené rozpory jsou na konci každé části a otevřené otázky k demu v `01-cesta-k-demu.md`. Rozhoduje je vlastník; do té doby platí maketa.

## Maketa a testy

- Živá ukázka: <https://rudasrr.github.io/nutrifee-rozhodovaci-maketa/> (vyžaduje přihlášení). Jak ukázku spustit lokálně bez přihlášení, popisuje `01-cesta-k-demu.md`.
- Testy se spouštějí v kořeni repozitáře:
  - `node rychle.test.cjs` – rychlá sada, asi 40 s (14 testů);
  - `node zlate-vystupy.test.cjs` – zlaté výstupy jádra (9 testů; soubory JSON a generátor jsou ve složce `zlate-vystupy/`, test leží v kořeni);
  - `node nutrifee-rozhodovaci-maketa.test.cjs` – celá sada, asi 15–30 minut podle stroje (144 řádků OK). Kontrolujte celý výstup (řádky `FAIL`).
- Od SCHEMA 89 testy najdou `15` i generátor `scene-items.cjs` v `predani/zdroj/`, takže samostatný klon s libovolným názvem složky projde bez kopírování souborů o úroveň výš (ověřeno: 144 prošlo, 0 selhalo).
