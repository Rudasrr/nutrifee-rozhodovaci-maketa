# NutriFee demo – pokyny pro AI asistenta

Tento soubor patří do kořene repozitáře dema. Programátor ho zkopíroval z předávky makety (`predani/AGENTS.md`). Čti ho celý před první změnou. Cesty `predani/…` vedou do složky předávky; zkopíruj ji do repozitáře dema celou, aby odkazy platily.

## Co je tento repozitář

První demo NutriFee: aplikace pacienta na telefonu (PWA) a ordinace (lékař, sestra) v prohlížeči. Obojí běží nad **převzatým jádrem makety** (`app/`) a sdílí stav pacienta přes server. Data jsou jen syntetická. Cestu k demu popisuje `predani/01-cesta-k-demu.md`, obrazovky `predani/10-atlas-pacient.md` (P01–P57) a `predani/20-atlas-ordinace.md` (O01–O30).

Zdroj pravdy je `predani/zdroj/15-ZDROJ-PRAVDY-MAKETA.md`. Při rozporu platí chování makety (jádra `app/`), ne text. Při rozporu nebo mezeře se zeptej, nevybírej potichu.

## Neporušitelné zásady (plné znění v `15` odst. 2)

1. **Dávku inzulinu určuje jen lékař.** Aplikace ji zobrazuje, připomíná a ptá se na podání. Nikdy ji nepočítá, nemění a nedoporučuje směr ani výši. O dávce mluví jen návrhová karta „posoudit dávku“ v ordinaci; lékař má u každé dávky volič „jiná dávka“.
2. **Cílem je konzistence jídla k pevné dávce.** Pacient nepočítá sacharidy a aplikace ho k tomu nevede.
3. **Rada k množství jídla:** před píchnutím oběma směry k obvyklé porci, po píchnutí a při „nevím“ jen z větší porce zpět k obvyklé, **nikdy „snězte víc“**. Po menší porci s inzulinem hned pravidlo, za 60 minut otázka „Klesla glukóza pod 4?“. **Aplikace pacienta nikdy sama nevyzve, aby volal do ordinace.**
4. **Každý výpočet, rada, práh i text nese položku registru ve stopě.** Pacient štítky schvalování nevidí.
5. **Lékař mezi kontrolami nic nedělá a nic nesleduje.** Kohorta: jen inzulin v pevných dávkách a senzor, žádný jiný lék na diabetes.
6. **Žádná generativní AI ve výpočtech.** Vše je deterministické a dohledatelné ve stopě. Žádné napojení na aplikaci výrobce senzoru: pacient hodnoty opisuje, export nahrává sestra.
7. Štítek „DEMO · syntetická data · není určeno pro léčbu“ jednou a trvale viditelný.
8. **V ordinaci se nepíše.** Vše je výběr, zaškrtnutí nebo posuvník.
9. **Žádná skutečná jména** osob, institucí, výrobců ani produktů v kódu, textech, datech ani v názvech souborů.

## Jádro `app/` neměň, stav nad ním

- `app/` (`core.js`, `screens.js`, `screens-clinic.js`, `ui.js`, `icons.js`, `tokens.css`, `design.css`, `fonts/`, `data/`) je převzaté z makety **beze změny**. Nový kód patří vedle: PWA obal, synchronizační vrstva, výběr role a pacienta, ovládání prezentujícího.
- Jádro **nevolá síť**. Síť smí volat jen synchronizační vrstva mimo `app/`. Hodiny a úložiště se do jádra předávají přes `NF.configure({ now, storage: { get, set } })`; změnu stavu hlásí `NF.onChange(fn)` (`fn(S, { saved, key })` po každém `NF.save`, během `NF.muteHooks` mlčí). `NF.save` vrací `false`, když se neuložilo.
- Když se zdá, že je změna jádra nutná: zastav se, popiš ji a zeptej se. Před jakoukoli změnou v `app/` ji nejdřív ověř v repozitáři makety proti **celé** sadě testů makety a teprve pak ji přenes sem. Změna, kterou maketa nemá, se nepřenáší.
- `demo/fixtures.js` je jen data příběhu (modelový pacient, kapitoly, `D.play`). Do produkčního kódu nepatří a neupravuje se.
- Vzhled: hodnoty jen z `app/tokens.css` (`--nf-*`). Žádné pevné barvy, rozměry ani písma v novém CSS. Barevné role: zelená = v cíli a hotovo, oranžová = nad cílem a upozornění, červená = chyby, pod 4 a mimo rozsah, petrolejová = jen akce. Stav vždy slovem a ikonou. Přehled je v `predani/40-design-system.md`.

## Příkazy

```
node rychle.test.cjs                          # rychlá sada, asi 40 s: po každé změně
node zlate-vystupy.test.cjs                   # zlaté výstupy jádra z přehrání příběhu (data v zlate-vystupy/)
node nutrifee-rozhodovaci-maketa.test.cjs     # celá sada makety, asi 15–30 minut podle stroje
```

- Po každé změně pusť rychlou sadu a zlaté výstupy. Celou sadu pusť před předvedením a vždy, když se něco dotkne `app/`.
- Kontroluj **celý výstup** (řádky `FAIL`), ne jen poslední řádek.
- Zlaté výstupy se **nepřegenerovávají**, aby test prošel. Rozdíl ve výstupu je změna klinického chování; přegenerovat (`node zlate-vystupy/generuj.cjs`; `--check` jen porovná) smíš jen po výslovném souhlasu vlastníka.
- Před commitem ověř, že žádný zdrojový soubor není prázdný.

## Obrazovky pacienta: pravidla P1–P11 (`15` odst. 15b)

- **P1** Jedna obrazovka = jeden úkol: jeden `h1`, nejvýš jedno aktivní hlavní tlačítko; v kroku 1 jídla je otevřená jen jedna otázka.
- **P2** Na Dnes je karta „Co teď“ celá v prvních 780 px; otázka „Klesla glukóza pod 4?“ je nad ní.
- **P3** Krok jídla nejvýš 1,5 výšky obrazovky, Dnes nejvýš 2 výšky.
- **P4** Slova: Dnes ≤ 150, „Co teď“ ≤ 20, krok jídla 1–2 ≤ 90, krok 3 s radami ≤ 110, karta ≤ 40, bezpečnostní karta mimo okamžik události ≤ 60.
- **P5** „Proč“ jednou větou, delší vysvětlení pod „Proč se ptáme“.
- **P6** „Co bude dál“ jedním řádkem u hlavního tlačítka („Potom: …“, „Co dál: …“).
- **P7** „Jak si vedu“ slovem a ikonou, čísla až v „Podrobnostech“.
- **P8** Bezpečnostní pravidla krátce: v okamžiku události první krok velkým písmem, „Co dál“ a „Celé pravidlo“; jinde název, jedna věta a „Celé pravidlo“.
- **P9** U pacienta žádné texty pro lékaře, garanta ani provoz (štítky schvalování, „registr“, kódy plánu P1/P2, „započítaných“).
- **P10** Žádná viditelná věta dvakrát na obrazovce.
- **P11** Jedna úroveň rozbalení; v kartě nejvýš dva rozbalovací řádky.

Pacientovi se vyká bez rodu, hlas je „my“, vždy „glukóza“, desetinná čárka, „j.“ a „mmol/l“ s nezlomitelnou mezerou. Pacient nikdy nevidí slova „report“, „medián“, „skóre“, „čistá data“, „garant“, „studie“.

## Co se nesmí vracet (výtah z `predani/30-prilohy.md` odd. 4)

- Aplikace sama navrhuje směr nebo jednotky dávky; dávkové podklady; samotitrace bazálu.
- Rada „snězte víc“; plošný zákaz rady k porci po píchnutí.
- Výzva „zavolejte do ordinace“; pravidla jako citace lékaře s podpisem nebo nadpisem „Pokyn lékaře“.
- Napojení na aplikaci nebo rozhraní výrobce senzoru; desetinné hodnoty glukózy psané pacientem; živá glukóza se semaforem na Dnes.
- Gramy sacharidů, makra, složení jídla; jídla přidávaná sestrou nebo lékařem; ikony konkrétních jídel (jídlo je neutrální talíř).
- Mřížky čísel, otočný válec a velká klávesnice pro volbu hodnot (platí posuvník); volné textové pole v ordinaci.
- Pochvala za hodnotu glukózy, body, série, známky, absolutní skóre jídel; tři stupně reakce.
- Třetí rozhodnutí garanta „Upravit“; schvalování provozních položek; samostatná role Garant.
- Lékař nastavuje časová okna jídel nebo obnovuje návyk mezi kontrolami; jiný lékař v aplikaci.
- Sklo, rozostření, přechodové podklady, barevný levý okraj karet, žlutá, červená pro běžné „nad cílem“, písma načítaná z cizích serverů.

Než něco z toho navrhneš, přečti `15` odst. 18 („Proč je to takhle“). Když vlastník chce zavrženou věc, připomeň důvod a zeptej se.

## Data a bezpečnost

- **Jen syntetická data.** Modelový pacient je z `demo/fixtures.js`. Žádná skutečná data pacientů, žádné skutečné exporty ze senzoru, žádné skutečné účty.
- Žádná generativní AI ani síťové volání ve výpočtech, radách ani textech. Všechny texty pacienta pocházejí z položek registru a katalogů jádra.
- Tajné klíče serveru nepatří do repozitáře.

## Jak pracovat: malé úkoly po obrazovkách

- Jeden úkol = jedna obrazovka nebo jedna vrstva. U obrazovky začni jejím záznamem v atlasu: snímek `predani/obrazovky/…png`, řádek „Kapitola“ (kde ji v příběhu najdeš), co se počítá, pravidla, stavy, co jde do stopy a které testy ji hlídají.
- Pro živý stav obrazovky přeskoč na její kapitolu (`D.play(index)`) a porovnej se snímkem a se zlatými výstupy.
- Hotovo je, když: obrazovka odpovídá snímku a atlasu, rychlá sada a zlaté výstupy projdou, P1–P11 platí i při písmu 160 % a na telefonu široké 360 px.
- Na konci úkolu napiš, co se změnilo, co jsi ověřil a co ne.
