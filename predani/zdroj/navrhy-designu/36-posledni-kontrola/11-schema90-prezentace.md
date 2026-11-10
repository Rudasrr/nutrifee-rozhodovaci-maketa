# 36 / 11 – SCHEMA 90, fáze 3: prezentační vrstva

*10. 11. 2026 · zadání: `08-schema90-jadro.md` odd. 7 · nic necommitováno ani nepublikováno, Supabase se nevolalo · `app/`, `app/data/`, CSS ani HTML beze změny; `NF.SCHEMA` a `?v=` nezvyšovány (patří koordinátorovi).*

Změněné soubory: `demo/guide.js`, `demo/tour-content.js`, `demo/explain.js`, `demo/scene-items.js` (jen generátorem), testy `nutrifee-rozhodovaci-maketa.test.cjs`, `ukladani.test.cjs`, `kontrola4-panel.test.cjs` (jen záměrné změny s komentářem SCHEMA 90).

## 1. Průvodce (`demo/guide.js`)

| Položka | Co se změnilo |
|---|---|
| **I-VYSSI** (nová) | Všech pět oddílů (Proč · Jak · Kde · Co schvalujete · Co se stane při zamítnutí), `dopadSceny` (jako ostatní pravidla v plánu: enroll, doses, issue, training, handover, illness, illnessMeal, recovery, reviewSummary, reviewConfirm) a `ucinek` (`vypne`, `off`, scéna `doses`: zmizí „Mějte u sebe cukr a jídlo nevynechávejte.“, oznámení). Znění pravidla a krátká podoba doslova z katalogu jádra (stav Disku 17:30: „…dívejte se během několika hodin častěji na senzor.“). Říká, že sledování a vynechaná procházka platí i při zamítnutí. |
| B-HYPO v3 | Jak + Co schvalujete: „pod 4“ před jídlem je pokles a patří k předchozímu hlavnímu jídlu dne (u snídaně k noci a bazálu), sledování po vyšší dávce, „Zapsat svačinu“ do `{dalsi_slot_h}` h, nové parametry `{ranni_otazka_h}`, `{zpetne_h}`. |
| D-POSTUP v2 | Jak + Co schvalujete: bod „Čas pod cílem je pod mezí“ (inzulin k jídlu i bazál ráno nad cílem; blokuje „zvýšit“, nepřepíná se, větev „ponechat – čas pod cílem nad mezí…“), předvyplnění „sedí podle dat“ jen u bodů měřených z dat. |
| K-KRITERIA v2 | Jak + Co schvalujete: pět podmínek (bazál 1× denně večer, bez korekčních dávek); karta v panelu dál do 60 slov včetně výčtu vylučovacích kritérií. |
| D-PRAND v2, D-BAZAL v2 | Hranice velmi nízké hodnoty jako parametr `{velmiNizka|1}` (dřív pevně 3,0 v kódu), v Jak i Co schvalujete; u D-BAZAL navíc „pod 4“ před snídaní jako noční pokles. |
| Z-IMPORT (provozní) | `pokles_min`, `noc_od`, `noc_do`, `spani_od`, odmítnutí/oříznutí exportu mimo období. |
| S-PRIPOMINKY (provozní) | `den_konec` (den aplikace končí ve 4:00, pozdní večeře po půlnoci), český čas a věta `pasmo`. |
| R-POKYNY | „Osm bezpečnostních pravidel“ (přidána vyšší dávka), `ucinek.bezMista` + I-VYSSI. |
| I-VYSOKA | Hranice 15 je pevná (dřív „výchozí hranice“). |

Texty bez SCHEMA, kódů nálezů a „rozhodnutí vlastníka“ (komentáře v kódu je mají).

## 2. Vyprávění (`demo/tour-content.js`, `demo/explain.js`)

- **Pátá podmínka zařazení:** krok klepne i `noCorrection`, titulek „Pět podmínek zařazení“, věta o korekčním schématu; bublina `eligibility` „všech pět podmínek“. Karta pacienta (`D.cardEligibility` ve `fixtures.js`) pátou podmínku nedokládá – lékař ji potvrzuje sám; `fixtures.js` mimo zadání, nesahal jsem.
- **Vedlejší volba jídla (scéna 10):** krok „Shrnutí přečteno“ popisuje vedlejší tlačítko k obědu pod „Byla dnes snídaně?“ (bez citace, aby text nezávisel na popisku). Scény 14, 19, 21 otázku „Byla dnes …?“ nevyprávějí (začínají v jídle nebo v přehledu) – změna tam nebyla potřeba; T4 nic nenašla.
- **„Zapsat svačinu“ ve stavu „další“:** žádný krok hlavní linie ani odboček neklepá na „Chystám se jíst“ do 3 h po hlavním jídle; průchod tlačítkem Další prochází. Beze změny.
- **Body předvyplněné z dat:** krok „Vše sedí – body ověřené s daty“ (snídaně) říká, že body potvrzené daty jsou předvyplněné „Sedí“ a hromadné potvrzení doplnilo zbylé; změna proti datům jde do stopy.
- **Bod 11:** stejný krok jmenuje bod „Čas pod cílem je pod mezí“ s číslem z dat (`factOf(S,'podCilem',…)`) a co by znamenal nad mezí.
- **Řádek stopy:** krok „Dávka k obědu ponechána proti větvi „zvýšit““ říká, že řádek stopy nese větev v okamžiku rozhodnutí (· postup: zvýšit · jinak než postup) a kdo jednal.
- Scéna 7 krok 8: věta o neznámé kaši podle nového textu jádra („Zatím ho neznáme. Poznáme ho, až ho zapíšete čtyřikrát.“).
- Souhrn: záložní počet 28 → 29.

**I-VYSSI v hlavní linii:** místo má – po přegenerování mapy se nabízí ve scéně 3 (lékař – dávky, startovní návyky a pravidla), krok 4, se sbalenými pravidly plánu, stejně jako ostatní I-* bez vlastní scény. Nový krok s vyšší dávkou jsem nepřidával: příběh by musel zapsat vyšší dávku a změnil by zlaté výstupy a data pro návrhy k dávce (nebezpečné 3 h před předáním). Průvodce v „Kde“ říká, že pacient v hlavní linii vyšší dávku nezapíše.

## 3. Mapa scén

`demo/scene-items.js` přegenerováno `navrhy-designu/04-pohledy-2026-10-05/scene-items.cjs` na kopii s jádrem z Disku ze 17:30. Rozhodovací scény všech dřívějších položek beze změny (test Tempo/FROZEN prošel po doplnění `I-VYSSI: doses`).

## 4. Testy (kopie `scratchpad/t90d`, jádro z Disku 17:30)

| Sada | Výsledek |
|---|---|
| `pravdivost.test.cjs` (T1–T4, i při zamítnutí každé položky) | **4 prošlo, 0 selhalo** |
| `kontrola2-obsah.test.cjs` | 17 prošlo, **1 selhalo**: B14 „Dřív bývala nejvyšší kolem N mmol/l.“ – text obrazovky z `app/screens.js` (jádro, druhý agent); test už má komentář SCHEMA 90, regulární výraz obrazovce nesedí. Ne z prezentační vrstvy. |
| `kontrola4-panel.test.cjs` | **18 prošlo, 0 selhalo** |
| `kontrola3-panel.test.cjs` | **9 prošlo, 0 selhalo** |
| `faze2-pribeh.test.cjs` | **15 prošlo, 0 selhalo** |
| `ukladani.test.cjs` | **30 prošlo, 0 selhalo** |
| hlavní sada, `ONLYRE` = průchod tlačítkem Další, Průchod pro garanta (7. i 8. 10.), Tempo/FROZEN, Každý krok vypráví, Krok zpět | **6 prošlo, 0 selhalo** |

Celá sada nespuštěna (spustí koordinátor). Stav jádra a obrazovek: Disk k 17:30 (I-VYSSI s textem „dívejte se během několika hodin častěji na senzor“). Kdyby se po 17:30 změnily texty obrazovek, štítky nebo katalog I-*, je potřeba znovu spustit generátor mapy a `pravdivost`.

Záměrné změny testů (komentář SCHEMA 90): souhrn a export 28 → 29 položek, CSV 29 → 30 řádků, `last.params.total` 29, FROZEN + `I-VYSSI: 'doses'`, verze K-KRITERIA v2 u řádku rozhodnutí (`ukladani`), karta K-KRITERIA začíná „Pět podmínek zařazení“ (`kontrola4-panel`).

## 5. Co zbývá

- **Opravit B14 v `kontrola2-obsah`** (jádro nebo test, ne prezentace).
- **Když se po 17:30 změní obrazovky nebo katalog:** znovu `node scene-items.cjs` (z `navrhy-designu/04-pohledy-2026-10-05` na kopii, asi 8 min) a `pravdivost.test.cjs`; při změně textu I-VYSSI v katalogu upravit doslovné věty v `guide.js` (Jak, Co schvalujete).
- `NF.SCHEMA` a `?v=` (koordinátor).
- Mimo mé soubory zůstává pevné „28“: `demo/intro.js` (záloha bez registru) a komentář v `demo/results.js` (popis `registryFpInput`); `D.cardEligibility` ve `fixtures.js` pátou podmínku nedokládá (záměrně – lékař ji potvrzuje sám).
- Nepostaveno: vlastní krok s vyšší dávkou v příběhu (I-VYSSI má místo v plánu ve scéně 3); N7 („Pacient také ví“ dvakrát ve scéně 5) z `09`.
- Předání (`predani/01-cesta-k-demu.md`) z odd. 7 dokumentu `08` nebylo v mém zadání.
