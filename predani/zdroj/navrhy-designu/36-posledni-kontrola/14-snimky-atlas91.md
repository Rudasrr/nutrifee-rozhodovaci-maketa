# 36 / 14 – Snímky a atlas předávky podle SCHEMA 91

*12. 11. 2026 · zdroj: kopie SCHEMA 91 na 127.0.0.1:8992 (`app/` shodné s Diskem), pro srovnání kopie SCHEMA 90 na 127.0.0.1:8993 · podklady `12-schema91.md`, `05-rozhodnuti.md` (body 13–15) · na `app/`, `demo/` ani testy jsem nesahal, nic necommitováno ani nepublikováno, skutečné úložiště se nevolalo.*

Změněné soubory v `maketa-rozhodovaci/predani/`: všech 87 snímků v `obrazovky/`, `10-atlas-pacient.md`, `20-atlas-ordinace.md`, `30-prilohy.md`, `01-cesta-k-demu.md` a `README.md`. Pracovní kopie `navrhy-designu/34-predani-programatorovi/predani/` je srovnaná (snímky a tytéž čtyři dokumenty; `README.md` a `zdroj/` v ní nejsou, jako dřív). `00-postup.md`, `AGENTS.md`, `40-design-system.md` a `index.html` jsem neměnil.

## 1. Skripty snímání (natrvalo na Disku)

Složka `navrhy-designu/34-predani-programatorovi/snimkovani/` s `README.md` (postup spuštění):

- **Pacient** `atlas-shoot-pacient.cjs` + `atlas-shots-pacient.js` + `lib.js`: převzato z `scratchpad/k36-pacient/br/`, jen výstup `meta-pacient.json` jde do výstupní složky (dřív pevná cesta ve scratchpadu), výchozí adresa 8992 a kontrola nadpisu, prázdné obrazovky a zástupných textů.
- **Ordinace** `atlas-shoot-ordinace.cjs` + `atlas-shots-ordinace.js`: napsáno znovu podle `atlas87/br/atlas-walk.cjs`, `k90-ord/skripty/` a řádků „Kapitola“. Ověřeno zpětně: týmž skriptem na kopii SCHEMA 90 vzniklo 30 snímků shodných se snímky ze 10. 11. 2026 až na čas rozhodnutí garanta (O24–O29), pár řádků s časem (O03, O10, O16) a posun lišty o 3 px u O08. Co jsem musel dohledat, aby snímky seděly:
  - okno se před snímkem **jednou** roztáhne na výšku stránky (lišta „Další krok“ leží na konci, náhled telefonu u O05–O07 a O22 vyroste podle okna);
  - štítky položek `.appr` v ordinaci **zůstávají** (skryté jen v náhledu telefonu) – snímky ze SCHEMA 90 je měly a lékař s garantem je v aplikaci vidí (zásada 4); zadání vyjmenovávalo `.appr` mezi skrývanými, u pacienta se skrývá celé;
  - `NF.slots.importDemo = null` (bez tlačítka „Použít ukázkový export“, jak říká atlas);
  - u O29 rozbalený oddíl „Pravidla aplikace bez schvalování“ jako na snímku ze SCHEMA 90.
- **Kontroly a přílohy** `porovnej.cjs` (nové: porovnání snímků bez závislostí), `check-ids.cjs`, `check-tests.cjs`, `check-links.cjs`, `generuj.cjs`, `sestav.cjs`, `popisy-old.tsv` (ze `scratchpad/a90` a `scratchpad/predani-skripty`, kořen makety výchozí na Disku, výstup proměnnou `OUT`; text úvodu přílohy 2 a popis `schema90-jadro` upravené na SCHEMA 91).

## 2. Přefoceno

Všech **87 snímků** (P01–P57, O01–O30), názvy beze změny, zkopírované do `maketa-rozhodovaci/predani/obrazovky/` i `navrhy-designu/34-predani-programatorovi/predani/obrazovky/`. Každý snímek prošel kontrolou: u pacienta stránka, čas a nadpis vyšly u všech 57 stejně jako ve SCHEMA 90; u ordinace role, stránka, krok kontroly, nadpis a kontrolní text (např. O11 „neumíme načíst“, O14 „Posoudit prandiální dávku ke snídani“, O28 „Z-IMPORT“) – 0 problémů, žádná prázdná ani chybová stránka, žádné `undefined`/`NaN`, konzole bez chyb. Prohlédl jsem P11, P24, P39, P43, O12, O26 a O27 ze SCHEMA 91 a O02, O04, O08, O11, O22 a O29 při ověřování skriptu proti snímkům ze SCHEMA 90 (tyto obrazovky se mezi SCHEMA 90 a 91 pixelově nezměnily).

## 3. Které obrazovky se viditelně změnily (porovnání snímků a textů)

**Pacient (17):** P02 (věta o klíči u dávek), P12, P15, P17, P28, P30, P45, P46, P48, P55 („minut“ celým slovem; P15 a P45 „Potom/Co dál: za 60 minut…“), P19 („Zapnuto omylem, vypnout“), P24 („Píchnuto jinak · jiné množství“), P31 (věta o lékařské pomoci v „Co dál“), P40 („ze seznamu“ a tři jídla podle slova názvu), P50 (hlavička bez „V cíli 0 ze 4“, ten je samostatný řádek; zalomený popisek hranice), P51 (dnešek ve tkanině „út“), P54 a P55 („Není mi dobře · vypnuto“).

**Proti seznamu v zadání:** P09, P26 a P38 se **nezměnily** – stav atlasu nové prvky neukazuje (P09 má panel „Opravit zápis“ zavřený, P26 je první snídaně bez tří stejných zápisů, P38 ukazuje z pravidla jen první větu). Naopak se změnily P12 a P48 („minut“). P11, P13, P22, P25, P39 a P43 mají jen subpixelové rozdíly ikon (0,00–0,02 % pixelů, 11–13 řádků), obsah je stejný.

**Ordinace (11):** O03 a O23 („minut“, I-MENE a I-VYSSI „pevně 60 minut“), O12–O17 (čas v cíli 69 % místo 68 %; O13 navíc věta „Procenta jsou zaokrouhlená, semafor se řídí přesným podílem.“), O21 („Platí obecná pravidla NutriFee v2“), O24 (jen karta pod zásuvkou, 69 %), O27 (B-HYPO v4 a nový souhrn). O26 se liší jen časem rozhodnutí garanta.

**Proti seznamu v zadání:** O18, O25, O28 a O30 se **nezměnily** (O18: upozornění na jiný lék se v příběhu neukáže, sestra odpověděla „Ne“; O25: seznam verze neukazuje; O28: Z-IMPORT beze změny; O30: v příběhu do kapitoly 27 není `jidlo.jako_obvykle`). Navíc se změnily O16, O21 a O27.

## 4. Které popisy se změnily

**Hlavičky:** oba atlasy „SCHEMA 91“ (12. 11. 2026, commit `2077ed3`), stav makety, ověření kapitol na SCHEMA 91, poznámka ke snímkům se seznamem viditelných změn; v atlasu ordinace i věta o štítcích lékaře a o roztažení okna.

**Atlas pacienta:** P02, P09 (oprava jídla a hodnot `mealEditSub`, `mealEditFood`, `mealEditValue`), P11 („zápis chybí“, „Zápis ze včerejška chybí“), P12, P15, P16 (otázka po večeři za 60 minut i ráno, dvojice `pair`, pokles jednou), P17, P19, P24 (`pendingOther`, `pendingUnitsSet`), P26 („Jako obvykle“, `NF.usualMeal`, `mealUsual`, `jidlo.jako_obvykle`, S-DAVKA v2), P28, P30, P31, P38, P40 (`NF.likeCandidates`), P45, P46, P48, P50, P51, P54, P55, úvod kroku 3 (I-VYSSI „Co dál“), „Stavy bez snímku“ (otázka k minulému jídlu S9, „Po obědě“, oznámení po večeři, nové stavy: oprava jídla a hodnot, „Jako obvykle“, „Píchnuto jinak“, „K tomuto jídlu plán nemá dávku“, „bez inzulinu“ bez rady k porci). Nedodělky: vyřešené tři ze SCHEMA 90 odstraněné, zůstává fokus V3 a 1 px u tokenu „10 j.“; nový odstavec „Vyřešeno v SCHEMA 91“. Verze pravidel I-* v3, B-HYPO v4.

**Atlas ordinace:** průběh 2.3 (signál „skoro nepoužíval“, jiný lék v „Co návrh oslabuje“), tabulka 4.1 (R-POKYNY v2 a I-* v3, I-MENE a I-VYSSI bez vlastního času, D-BAZAL v3, B-HYPO v4, S-SOUHRN v2 s `malo_zapisu_pct`, S-PRIPOMINKY v3), O03, O12 (zaokrouhlení S3, `NF.sensorRaw`, 69 %, `NF.lowUsage`, „Pacient za období nezapsal…“), O13, O14 (S6 `NF.proposalWeak`), O17 (bod 15, test), O18, O21, O23, O24, O25 (seznam nových verzí), O27, O28, O30 (`jidlo.jako_obvykle`), nový odstavec „Vyřešeno v SCHEMA 91“.

**`01-cesta-k-demu.md`:** úvod SCHEMA 91, odstavec „Stav 12. 11. 2026“, rozhodnutí 13–15 v seznamu z 11. 11. 2026, počet zapsaných testů 438. **`README.md`:** SCHEMA 91 k 12. 11. 2026 a poznámka o nasazení.

**`30-prilohy.md`:** tabulky přílohy 2, 3 a 5.1 přegenerované (`generuj.cjs`, `sestav.cjs`): 43 položek (29/14), 12 nových verzí, 8 pravidel, 171 jídel, 20 souborů testů, **438** zapsaných testů (dřív 432; `schema90-jadro` 43), hlavní sada dál 144 řádků, seznam 461 řádků. Ručně: úvod, slovník (oprava zápisu, nové pojmy „Jako obvykle“, „Jeden čas otázky“, „Skoro nepoužíval“, větev nízké glukózy, SCHEMA 91) a řádek zavržených variant o otázce po večeři.

## 5. Ověření

- `check-ids.cjs`: všechny `NF.*` a `V.*` v obou atlasech, přílohách a `01` existují v kódu SCHEMA 91 (jediná výjimka je záměrný zástupný `NF.xxx`/`V.xxx` v úvodu atlasu ordinace).
- `check-tests.cjs`: všechny citované názvy testů (včetně šesti nových „SCHEMA 91 …“ v `schema90-jadro.test.cjs`) jsou začátky skutečných názvů; zbylé nálezy skriptu jsou citace textů obrazovek.
- `check-links.cjs`: 118 relativních odkazů, 0 chybných, 87 snímků, žádný nepoužitý; žádný soubor předávky není prázdný; v dokumentech nejsou skutečná jména.

## 6. Co zůstává (mimo zadání)

- **Rozpor v `15`:** odst. 7 (B-HYPO, ř. ~117) a odst. 18 (ř. ~552 „Po večeři se na pokles ptáme ráno, ne za hodinu“ a ř. ~635 mezi zavrženými „otázka na pokles po večeři za 60 minut“) ještě popisují stav před rozhodnutím 14. Maketa SCHEMA 91 se po večeři ptá za 60 minut i ráno. V příloze 4.1 jsem řádek označil jako přebitý rozhodnutím 14; `15` jsem neměnil.
- **`00-postup.md` ř. 289** (etapa Dnes): „za 60 minut otázka (po večeři až ráno)“ – stejná věc, soubor nebyl v zadání.
- **„14 testů“ rychlé sady** v `README.md` a `01-cesta-k-demu.md`: rychlá sada vypisuje 15 řádků (stejně už ve SCHEMA 90); neměnil jsem.
- **`predani/index.html`** (soukromá stránka předávky) je sestavená ze starších textů; po této úpravě ji je potřeba sestavit znovu (`34-predani-programatorovi/stranka/build.cjs`).
- Tento soubor patří i do `predani/zdroj/navrhy-designu/36-posledni-kontrola/` (atlasy na něj odkazují); kopii jsem tam uložil.

## Shrnutí

Skripty snímání jsou natrvalo na Disku a skript ordinace je napsaný znovu; na SCHEMA 90 dává tytéž snímky jako 10. 11. Všech 87 obrazovek je přefocených ze SCHEMA 91 a zkontrolovaných, viditelně se změnilo 17 obrazovek pacienta a 11 ordinace. P09, P26, P38, O18, O25, O28 a O30 se proti očekávání nezměnily, protože jejich stav nové prvky neukazuje; jejich popisy jsou přesto doplněné. Atlasy, `01`, `README` a přílohy odpovídají SCHEMA 91 a odkazy, funkce i názvy testů sedí na kód. Zbývá srovnat `15` a `00-postup.md` s rozhodnutím 14 a sestavit znovu `index.html`.
