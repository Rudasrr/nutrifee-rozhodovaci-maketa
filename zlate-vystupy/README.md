# Zlaté výstupy jádra

Spustitelná specifikace chování jádra NutriFee (od SCHEMA 89). Skript `generuj.cjs` načte **jen jádro**
(`app/core.js`, `app/data/registry.js`, `app/data/catalogs.js`, `app/data/foods.js`) v holém prostředí
JavaScriptu bez `window`, `document` a `localStorage`. Jako testovací data přidá přípravek modelového
pacienta `demo/fixtures.js` (kapitoly a scény příběhu); nic jiného z prezentační vrstvy nepoužije.
Přehraje všech **32 scén** příběhu (27 kapitol hlavní linie a 5 odboček v dodatku) až po vydání nového
plánu P2 a klíčové výstupy jádra uloží jako JSON.

Co maketa dělá, platí (rozhodnutí vlastníka 15. 10. 2026). Zlaté výstupy proto záměrně „zmrazí“ i
případné chyby makety. Když jádro chování změní, výstupy se přegenerují vědomě a změna se zkontroluje
v diffu.

## Soubory

| Soubor | Co obsahuje |
|---|---|
| `otisky.json` | 43 položek registru (`id`, `version`, `scope`, `cat`) s **otiskem jádra** `fp` = `NF.itemFingerprint(položka)`; počet garantových položek (29) a jídel (171); SCHEMA 90 přidala pravidlo I-VYSSI |
| `pribeh.json` | pro každou scénu: hodiny, role, počty (zápisy, noci, události, plány, jídla, otázky, bazál), aktivní plán (dávky, návyky, pravidla, cíle, rady), sloty dne `NF.daySlots`, slot na řadě `NF.focusMeal`, věta „jak si vedu“ `NF.howAmI`, sledování nízké glukózy a karta `NF.hypoAlert`, nemoc, výsledek importu `S.sensorImport`, souhrn ze senzoru, položky registru mimo výchozí stav |
| `kontrola.json` | pro každou scénu s kontrolou: souhrn kontroly `NF.summary`, návrhy (`NF.proposals`) s ověřovacími body, fakty, větvemi postupu, stavem bodů `NF.verifyState` a vybranou větví `NF.proposalBranch`; rozhodnutí lékaře, nové dávky a cíle. Ve scénách „krok 2: návrhy“ navíc `tabulkaVetvi`: větev pro „všechny body sedí“ a pro „nesedí právě bod k“ u každé návrhové karty |
| `rady.json` | od první snídaně: `NF.advise` pro 4 jídla × porce (`bigger`, `usual`, `smaller`) × stav inzulinu (`before`, `as`, `unknown`) – účinný stav, nabídnuté rady s textem, zablokované rady s důvodem, zmizelé rady, příznaky nemoci a nízké glukózy |
| `stopa.json` | pro každou scénu všechny události stopy jako řetězec „jméno události“ + ID položek registru z `polozky` (bez časů a dat) |

Každá scéna nese klíč `scena` (pořadí od 1, jako v panelu prezentujícího), `kapitola` (`D.chapters[].id`)
a `vetve` (odbočka příběhu, např. `{"response":"declines"}`; prázdný objekt = hlavní linie).

## Formát

Čistý JSON v UTF-8: klíče objektů seřazené podle kódových jednotek, odsazení jednou mezerou, na konci
nový řádek. Pole jsou v pořadí, v jakém je vrací jádro (pořadí je součást chování). Žádné časy běhu ani
náhodná čísla – stejný kód dá vždy stejné soubory.

## Jak výstupy použít

V maketě:

```bash
cd maketa-rozhodovaci
node zlate-vystupy.test.cjs            # přepočítá a porovná (součást rychlé i hlavní sady)
node zlate-vystupy/generuj.cjs --check # totéž, vypíše první rozdíl u každého souboru
node zlate-vystupy/generuj.cjs         # přepíše *.json – jen po vědomé změně chování jádra
```

V demu, které převzalo `app/` jako knihovnu: zkopírujte složku `zlate-vystupy/` i s testem a pusťte
`node zlate-vystupy.test.cjs` po každé změně. Test navíc ověřuje, že s načtenou prezentační vrstvou
(celé HTML makety) vyjdou výstupy jádra i otisky ve stopě stejně.

Proti vlastní implementaci (jiný jazyk, server):

1. Načtěte stejná data (`app/data/`) a přehrajte stejné scény. Kroky každé kapitoly jsou v
   `demo/fixtures.js` (`setup` = kulisy, `apply` = akce, `D.play(index, větve)` přehraje příběh od
   začátku až po kulisy zvolené kapitoly; po kapitole „převzetí“ se doplní bazál za minulé večery).
2. Pro každou scénu sestavte objekty se stejnými klíči jako v tabulce výše (výběr klíčů je v
   `generuj.cjs`, funkce `planOut`, `adviceOut`, `reviewOut`, `branchTable`, `eventsOut`).
3. Serializujte kanonicky (seřazené klíče) a porovnejte soubor po souboru. Rozdíl hlásí `firstDiff`
   v `generuj.cjs` jako cestu, např. `kontrola.json[2].navrhy[0].vetev.action: "up" ≠ "keep"`.

Otisk položky (`otisky.json`, `polozky[].fp` ve stopě) je **otisk jádra**: kanonický JSON
`{ item: { id, scope, cat, title, summary, detail, text, texts, lists, postup, sestra, params, labels }, co: null }`
(jen klíče, které nejsou `null` ani `undefined`) a nad jeho kódovými jednotkami UTF-16 dvě 32bitové
funkce, výsledek `fp-` + 16 šestnáctkových znaků (přesně `NF.itemFingerprint` v `app/core.js`). Text
průvodce „Co schvalujete“ v něm od SCHEMA 89 není, takže otisk vyjde stejně s prezentační vrstvou i bez
ní. Otisk s textem průvodce pro rozhodnutí garanta počítá jen prezentační vrstva (`demo/sync.js`, `fp`);
export garanta nese oba (`fp` a `fpTrace`).

## Doba běhu

Přehrání 32 scén trvá asi 20 s (nejdelší jsou kapitoly kontroly, protože modelová řada má 256 zápisů);
celý test i se srovnáním s prezentační vrstvou asi 30 s.

## Přegenerováno záměrně

- **SCHEMA 91 (11. 11. 2026):** `otisky.json` – nové verze B-HYPO v4, D-BAZAL v3, I-MENE v3, I-VYSSI v3, I-HYPO v3, I-NEVIM v3, I-NEMOC-JIDLO v3, I-VYSOKA v3, R-POKYNY v2 a provozní S-DAVKA v2, S-SOUHRN v2, S-PRIPOMINKY v3 (otisky a verze, počty 43/29 beze změny); `pribeh.json` – tytéž verze v registru scén a čas v cíli 69 % místo 68 % se souhrnem `raw` (ordinace S3: zaokrouhlení přímo, 68,6 %); `kontrola.json` – čas v cíli 69 % v souhrnu a v textu bodu o vyrovnání. `rady.json` a `stopa.json` beze změny; žádná změna rad, větví ani dávek.
